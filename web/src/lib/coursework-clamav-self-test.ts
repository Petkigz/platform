import { deflateRawSync } from 'node:zlib';

/** Harmless EICAR test samples, built in memory and never read from a user file. */
export function scannerTestSamples(): Buffer[] {
  const eicar=Buffer.from(['X5O!P%@AP[4\\PZX54(P^)7CC)7}$','EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'].join(''));
  const name=Buffer.from('sample.txt');
  const compressed=deflateRawSync(eicar);
  // CRC-32 of the fixed EICAR string above, not a checksum supplied by a user.
  const checksum=0x6851cf3c;
  const local=Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50,0);local.writeUInt16LE(20,4);local.writeUInt16LE(8,8);
  local.writeUInt32LE(checksum,14);local.writeUInt32LE(compressed.length,18);
  local.writeUInt32LE(eicar.length,22);local.writeUInt16LE(name.length,26);
  const central=Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50,0);central.writeUInt16LE(20,4);central.writeUInt16LE(20,6);
  central.writeUInt16LE(8,10);central.writeUInt32LE(checksum,16);central.writeUInt32LE(compressed.length,20);
  central.writeUInt32LE(eicar.length,24);central.writeUInt16LE(name.length,28);
  const end=Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50,0);end.writeUInt16LE(1,8);end.writeUInt16LE(1,10);
  end.writeUInt32LE(central.length+name.length,12);
  end.writeUInt32LE(local.length+name.length+compressed.length,16);
  return [eicar,Buffer.concat([local,name,compressed,central,name,end])];
}
