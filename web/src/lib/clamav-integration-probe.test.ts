import test from 'node:test';
import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { createServer } from 'node:net';
import { mkdtemp, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { crc32, inflateRawSync } from 'node:zlib';

async function runProbe(archiveDetection: boolean) {
  const dir=await mkdtemp(join(tmpdir(),'clam-probe-')); const path=join(dir,'clam.sock');
  let streams=0;
  const server=createServer(socket=>{
    let buffer=Buffer.alloc(0); let command=false; const chunks:Buffer[]=[];
    socket.on('data',data=>{
      buffer=Buffer.concat([buffer,data]);
      if (!command) {
        if(buffer.length<10)return;
        assert.equal(buffer.subarray(0,10).toString(),'zINSTREAM\0');
        buffer=buffer.subarray(10);command=true;
      }
      while(buffer.length>=4){
        const length=buffer.readUInt32BE(0);if(buffer.length<4+length)return;
        buffer=buffer.subarray(4);
        if(length===0){
          const sample=Buffer.concat(chunks);streams++;
          let infected=sample.length===68 && sample.toString().includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE');
          if(sample.length>=30 && sample.readUInt32LE(0)===0x04034b50){
            const offset=30+sample.readUInt16LE(26); const compressed=sample.readUInt32LE(18);
            const unzipped=inflateRawSync(sample.subarray(offset,offset+compressed));
            assert.equal(crc32(unzipped),sample.readUInt32LE(14));
            assert.equal(sample.readUInt32LE(offset+compressed),0x02014b50);
            infected=archiveDetection && unzipped.toString().includes('EICAR-STANDARD-ANTIVIRUS-TEST-FILE');
          }
          socket.end(infected?'stream: Test FOUND\0':'stream: OK\0');return;
        }
        chunks.push(buffer.subarray(0,length));buffer=buffer.subarray(length);
      }
    });
  });
  await new Promise<void>((resolve,reject)=>{server.once('error',reject);server.listen(path,resolve);});
  try {
    const result=await new Promise<{code:number|null;output:string}>((resolve,reject)=>{
      const child=spawn(process.execPath,['--experimental-strip-types',fileURLToPath(new URL('../../../scripts/clamav-integration.mjs',import.meta.url))],{env:{...process.env,COURSEWORK_CLAMAV_SOCKET:path}});
      let output='';child.stdout.on('data',chunk=>{output+=chunk;});child.stderr.on('data',chunk=>{output+=chunk;});
      child.on('error',reject);child.on('close',code=>resolve({code,output}));
    });
    return {...result,streams};
  } finally {await new Promise<void>(resolve=>server.close(()=>resolve()));await rm(dir,{recursive:true,force:true});}
}

test('opt-in integration probe exercises framed samples and catches disabled archive detection',async()=>{
  const passing=await runProbe(true);
  assert.equal(passing.code,0,passing.output);assert.equal(passing.streams,4);
  const failing=await runProbe(false);
  assert.equal(failing.code,1,failing.output);assert.equal(failing.streams,3);
  assert.match(failing.output,/EICAR inside a ZIP archive: FAILED/);
});
