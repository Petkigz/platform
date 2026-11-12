// Explicit opt-in probe: only harmless synthetic bytes are sent to the local daemon.
// This is not evidence of signature freshness or complete malware coverage.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { crc32, deflateRawSync } from 'node:zlib';
import { scanCourseworkBytes, COURSEWORK_SCAN_MAX_BYTES } from '../web/src/lib/coursework-clamav.ts';

const socketPath = process.env.COURSEWORK_CLAMAV_SOCKET ?? '';
if (!isAbsolute(socketPath) || socketPath.includes('\0')) {
  console.error('Set COURSEWORK_CLAMAV_SOCKET to the absolute path of a local clamd Unix socket.');
  process.exit(1);
}

// Build a ZIP in memory; no sample or private data is written to disk.
function zip(name, data) {
  const filename = Buffer.from(name);
  const compressed = deflateRawSync(data);
  const sum = crc32(data);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0); local.writeUInt16LE(20, 4); local.writeUInt16LE(8, 8);
  local.writeUInt32LE(sum, 14); local.writeUInt32LE(compressed.length, 18);
  local.writeUInt32LE(data.length, 22); local.writeUInt16LE(filename.length, 26);
  const central = Buffer.alloc(46);
  central.writeUInt32LE(0x02014b50, 0); central.writeUInt16LE(20, 4); central.writeUInt16LE(20, 6);
  central.writeUInt16LE(8, 10); central.writeUInt32LE(sum, 16); central.writeUInt32LE(compressed.length, 20);
  central.writeUInt32LE(data.length, 24); central.writeUInt16LE(filename.length, 28);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(1, 8); end.writeUInt16LE(1, 10);
  end.writeUInt32LE(central.length + filename.length, 12);
  end.writeUInt32LE(local.length + filename.length + compressed.length, 16);
  return Buffer.concat([local, filename, compressed, central, filename, end]);
}

const eicar = Buffer.from(['X5O!P%@AP[4\\PZX54(P^)7CC)7}$', 'EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*'].join(''));
assert.equal(createHash('md5').update(eicar).digest('hex'), '44d88612fea8a8f36de82e1278abb02f');
const samples = [
  ['plain harmless content', Buffer.from('AyahSpring scanner integration check.\n'), 'clean'],
  ['standard EICAR test', eicar, 'infected'],
  ['EICAR inside a ZIP archive', zip('sample.txt', eicar), 'infected'],
  // This only checks that clamd accepts a stream of the supported size; a clean
  // reply alone does NOT prove every byte was inspected or that limits are safe.
  ['maximum-size harmless stream', Buffer.alloc(COURSEWORK_SCAN_MAX_BYTES, 65), 'clean'],
];
for (const [label, bytes, expected] of samples) {
  const result = await scanCourseworkBytes({ bytes, socketPath, timeoutMs: 120_000 });
  if (result.outcome !== expected || result.bytes !== bytes.length ||
      result.sha256 !== createHash('sha256').update(bytes).digest('hex')) {
    console.error(`${label}: FAILED (${result.outcome}${result.reason ? `: ${result.reason}` : ''})`);
    process.exitCode = 1;
    break;
  }
  console.log(`${label}: passed`);
}
if (!process.exitCode) console.log('Probe passed. This does not establish freshness, coverage, safe scan limits, or upload/download enforcement.');
