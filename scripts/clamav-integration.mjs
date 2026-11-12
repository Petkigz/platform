// Explicit opt-in probe: only harmless synthetic bytes are sent to the local daemon.
// This is not evidence of signature freshness or complete malware coverage.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isAbsolute } from 'node:path';
import { scannerTestSamples } from '../web/src/lib/coursework-clamav-self-test.ts';
import { scanCourseworkBytes, COURSEWORK_SCAN_MAX_BYTES } from '../web/src/lib/coursework-clamav.ts';

const socketPath = process.env.COURSEWORK_CLAMAV_SOCKET ?? '';
if (!isAbsolute(socketPath) || socketPath.includes('\0')) {
  console.error('Set COURSEWORK_CLAMAV_SOCKET to the absolute path of a local clamd Unix socket.');
  process.exit(1);
}

const [eicar, eicarZip] = scannerTestSamples();
assert.equal(createHash('md5').update(eicar).digest('hex'), '44d88612fea8a8f36de82e1278abb02f');
const samples = [
  ['plain harmless content', Buffer.from('AyahSpring scanner integration check.\n'), 'clean'],
  ['standard EICAR test', eicar, 'infected'],
  ['EICAR inside a ZIP archive', eicarZip, 'infected'],
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
