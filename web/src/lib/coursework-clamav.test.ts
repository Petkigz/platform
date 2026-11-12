import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash, randomUUID } from 'node:crypto';
import { createServer, type Socket } from 'node:net';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { COURSEWORK_SCAN_MAX_BYTES, scanCourseworkBytes } from './coursework-clamav.ts';

async function withScanner(handler: (socket: Socket) => void, run: (path: string) => Promise<void>) {
  const path=join(tmpdir(),`ayahspring-scan-${randomUUID()}.sock`);
  const server=createServer(handler);
  await new Promise<void>((resolve,reject) => {server.once('error',reject);server.listen(path,resolve);});
  try {await run(path);} finally {await new Promise<void>((resolve,reject)=>server.close(e=>e ? reject(e) : resolve()));}
}

test('sends ClamAV INSTREAM framing and hashes the exact input',async()=>{
  const source=Buffer.alloc(70000,65);let observed=Buffer.alloc(0);
  await withScanner(socket => {socket.on('data',chunk => {
    observed=Buffer.concat([observed,chunk]);
    const expected=10+4+65536+4+(source.length-65536)+4;
    if(observed.length===expected) socket.write(Buffer.from('stream: OK\0'));
  });},async path=>{
    const result=await scanCourseworkBytes({bytes:source,socketPath:path});
    assert.deepEqual(result,{outcome:'clean',bytes:source.length,sha256:createHash('sha256').update(source).digest('hex')});
  });
  assert.equal(observed.subarray(0,10).toString(),'zINSTREAM\0');
  assert.equal(observed.readUInt32BE(10),65536);
  assert.deepEqual(observed.subarray(14,14+65536),source.subarray(0,65536));
  assert.equal(observed.readUInt32BE(14+65536),source.length-65536);
  assert.equal(observed.readUInt32BE(observed.length-4),0);
});

test('infection, errors, malformed replies and timeouts fail closed',async()=>{
  for (const [reply,expected] of [['stream: Eicar-Test-Signature FOUND\0','infected'],['stream: size limit exceeded ERROR\0','unavailable'],['stream: OK\0extra','unavailable'],['stream: OK','unavailable']] as const) {
    await withScanner(socket=>socket.once('data',()=>{socket.write(reply);if (!reply.includes('\0')) socket.end();}), async path=>{
      const result=await scanCourseworkBytes({bytes:Buffer.from('test'),socketPath:path,timeoutMs:1000});
      assert.equal(result.outcome,expected);
    });
  }
  await withScanner(socket=>{socket.resume();}, async path=>{
    const result=await scanCourseworkBytes({bytes:Buffer.from('test'),socketPath:path,timeoutMs:20});
    assert.deepEqual(result,{outcome:'unavailable',reason:'timeout'});
  });
});

test('the caller cannot change bytes after the scan starts',async()=>{
  const bytes=Buffer.from('original content'); let received=Buffer.alloc(0);
  await withScanner(socket=>socket.on('data',chunk=>{
    received=Buffer.concat([received,chunk]);
    if(received.length===10+4+bytes.length+4) socket.write('stream: OK\0');
  }), async path=>{
    const pending=scanCourseworkBytes({bytes,socketPath:path});
    bytes.fill(120);
    const result=await pending;
    assert.equal(result.outcome,'clean');
    if(result.outcome==='clean') assert.equal(result.sha256,createHash('sha256').update('original content').digest('hex'));
  });
  assert.equal(received.subarray(14,14+bytes.length).toString(),'original content');
});

test('rejects invalid, oversize and non-local inputs',async()=>{
  for (const data of [{bytes:Buffer.alloc(0),socketPath:'/tmp/clam.sock'},{bytes:Buffer.alloc(COURSEWORK_SCAN_MAX_BYTES+1),socketPath:'/tmp/clam.sock'},{bytes:Buffer.from('test'),socketPath:'localhost:3310'}])
    assert.deepEqual(await scanCourseworkBytes(data),{outcome:'unavailable',reason:'invalid_input'});
});
