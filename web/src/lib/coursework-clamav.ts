/**
 * Local ClamAV INSTREAM adapter. This scans only the bytes supplied to it; it
 * does not fetch an object, authorize access, publish a file, or prove that a
 * later read from object storage returns those bytes. Never expose this socket
 * to an untrusted network. The operator must run and update ClamAV separately.
 */
import { createHash } from 'node:crypto';
import { createConnection, type Socket } from 'node:net';
import { isAbsolute } from 'node:path';

export const COURSEWORK_SCAN_MAX_BYTES = 25 * 1024 * 1024;
const CHUNK_BYTES = 64 * 1024;
const MAX_REPLY_BYTES = 4096;
export type CourseworkScanResult =
  | { outcome: 'clean' | 'infected'; bytes: number; sha256: string }
  | { outcome: 'unavailable'; reason: 'invalid_input' | 'timeout' | 'scanner_error' | 'invalid_response' };

/** Send bounded bytes to a local Unix socket, and accept only a complete clamd reply. */
export async function scanCourseworkBytes(input: {
  bytes: Buffer;
  socketPath: string;
  timeoutMs?: number;
}): Promise<CourseworkScanResult> {
  const { bytes, socketPath } = input;
  const timeoutMs = input.timeoutMs ?? 30_000;
  if (!Buffer.isBuffer(bytes) || bytes.length < 1 || bytes.length > COURSEWORK_SCAN_MAX_BYTES ||
      typeof socketPath !== 'string' || !isAbsolute(socketPath) || socketPath.includes('\0') ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 120_000) {
    return { outcome: 'unavailable', reason: 'invalid_input' };
  }
  // Hash exactly the bytes sent, not a digest supplied by the uploader.
  const snapshot = Buffer.from(bytes);
  const sha256 = createHash('sha256').update(snapshot).digest('hex');
  return await new Promise<CourseworkScanResult>((resolve) => {
    let socket: Socket | undefined;
    let finished = false;
    let response = Buffer.alloc(0);
    let sent = false;
    const done = (result: CourseworkScanResult) => {
      if (finished) return;
      finished = true;
      clearTimeout(timer);
      socket?.destroy();
      resolve(result);
    };
    const timer = setTimeout(() => done({ outcome: 'unavailable', reason: 'timeout' }), timeoutMs);
    try { socket = createConnection({ path: socketPath }); }
    catch { done({ outcome: 'unavailable', reason: 'scanner_error' }); return; }
    socket.on('error', () => done({ outcome: 'unavailable', reason: 'scanner_error' }));
    socket.on('end', () => done({ outcome: 'unavailable', reason: 'invalid_response' }));
    socket.on('close', () => done({ outcome: 'unavailable', reason: 'scanner_error' }));
    socket.on('data', (chunk: Buffer) => {
      if (response.length + chunk.length > MAX_REPLY_BYTES) { done({ outcome: 'unavailable', reason: 'invalid_response' }); return; }
      response = Buffer.concat([response, chunk]);
      const zero = response.indexOf(0);
      if (zero < 0) return;
      // No partial response, embedded terminator, trailing message, or daemon
      // errors are allowed to masquerade as a clean result.
      if (zero !== response.length - 1) { done({ outcome: 'unavailable', reason: 'invalid_response' }); return; }
      if (!sent) { done({ outcome: 'unavailable', reason: 'invalid_response' }); return; }
      const reply = response.subarray(0, zero).toString('utf8');
      if (reply === 'stream: OK') done({ outcome: 'clean', bytes: bytes.length, sha256 });
      else if (/^stream: [^\r\n\0]+ FOUND$/.test(reply)) done({ outcome: 'infected', bytes: bytes.length, sha256 });
      else done({ outcome: 'unavailable', reason: 'invalid_response' });
    });
    socket.on('connect', () => {
      if (!socket || finished) return;
      socket.write(Buffer.from('zINSTREAM\0'));
      for (let offset = 0; offset < snapshot.length; offset += CHUNK_BYTES) {
        const part = snapshot.subarray(offset, Math.min(offset + CHUNK_BYTES, snapshot.length));
        const length = Buffer.alloc(4); length.writeUInt32BE(part.length);
        socket.write(length); socket.write(part);
      }
      socket.write(Buffer.alloc(4), () => { sent = true; });
    });
  });
}
