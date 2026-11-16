// Run all suites in one database, but in a separate process. PGlite/WASM can
// block its own event loop, so an in-process timer cannot diagnose a stuck
// query. A timeout stops the entire run; it never skips a suite or reports pass.
import { spawn } from 'node:child_process';
import { createInterface } from 'node:readline';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

export function runWithWatchdog({ command = process.execPath, args = ['supabase/tests/run.mjs'], timeoutMs = 240_000, output = process.stdout, errors = process.stderr } = {}) {
  return new Promise((done) => {
    const child = spawn(command, args, { detached: true, stdio: ['ignore', 'pipe', 'pipe'] });
    let current = 'harness and migrations'; let query = ''; let timedOut = false; let deadline; let finished = false;
    const finish = (code) => { if (!finished) { finished = true; clearTimeout(deadline); done(code); } };
    const escapeAnnotation = (s) => s.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
    const arm = () => {
      clearTimeout(deadline);
      deadline = setTimeout(() => {
        timedOut = true;
        errors.write(`::error title=Database suite stalled::${escapeAnnotation(current)} exceeded ${timeoutMs}ms; last query: ${escapeAnnotation(query || 'not traced')}; the full run was stopped and did not pass.\n`);
        try { process.kill(-child.pid, 'SIGKILL'); } catch { child.kill('SIGKILL'); }
      }, timeoutMs);
    };
    arm();
    const lines = createInterface({ input: child.stdout, crlfDelay: Infinity });
    lines.on('line', (line) => {
      output.write(`${line}\n`);
      const header = /^--- (.+) ---$/.exec(line);
      if (header) { current = header[1]; query = ''; arm(); }
      else if (line.startsWith('@@db-query ')) { query = line.slice(11); arm(); }
    });
    child.stderr.pipe(errors, { end: false });
    child.on('error', (error) => { errors.write(`${error.message}\n`); finish(1); });
    child.on('close', (code, signal) => {
      if (timedOut) finish(1);
      else if (code !== 0) { errors.write(`Full database suite exited ${code ?? signal}\n`); finish(1); }
      else finish(0);
    });
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === resolve(process.argv[1])) {
  process.exitCode = await runWithWatchdog();
}
