import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

/**
 * A page must not hand its database client to a component that runs in the
 * browser.
 *
 * `/admin/tax` did: `<ChargeForm client={supabase} />`, where `supabase` is the
 * server's client and `ChargeForm` begins with 'use client'. A prop crossing
 * from server to browser has to be written out as data, the client is not
 * data, and the page answered 500 ("Maximum call stack size exceeded") for
 * every finance admin and owner. Nobody else can open it, so no check that
 * signed in as a learner ever rendered it. Found on 2026-11-17 by walking the
 * pages as an owner against a real request server.
 *
 * A browser component makes its own client with
 * `createClient()` from `@/lib/supabase/client`.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.tsx$/.test(name) && !/\.test\.tsx$/.test(name) ? [path] : [];
  });
}

const isBrowser = (source: string) => /^\s*(?:\/\/[^\n]*\n|\/\*[\s\S]*?\*\/\s*)*['"]use client['"]/.test(source);

function fileOf(from: string, specifier: string): string | null {
  const base = specifier.startsWith('@/') ? join(root, specifier.slice(2)) : resolve(dirname(from), specifier);
  for (const candidate of [`${base}.tsx`, `${base}.ts`, join(base, 'index.tsx'), join(base, 'index.ts')]) {
    if (existsSync(candidate)) return candidate;
  }
  return null;
}

test('no server component passes a database client to a browser component', () => {
  const failures: string[] = [];
  let serverFiles = 0;
  let passes = 0;
  for (const path of sources(join(root, 'app'))) {
    const source = readFileSync(path, 'utf8');
    if (isBrowser(source)) continue;
    serverFiles += 1;
    // Names that hold a server client in this file.
    const clients = new Set(
      [...source.matchAll(/(?:const|let)\s+(\w+)\s*=\s*await\s+createClient\(\)/g)].map((m) => m[1]!),
    );
    if (clients.size === 0) continue;
    const imports = new Map<string, string>();
    for (const m of source.matchAll(/import\s+(?:type\s+)?(?:(\w+)\s*,?\s*)?(?:\{([^}]*)\})?\s*from\s*['"]([^'"]+)['"]/g)) {
      const names = [m[1], ...(m[2] ?? '').split(',').map((n) => n.trim().split(/\s+as\s+/).pop())].filter(Boolean) as string[];
      for (const name of names) imports.set(name.replace(/^type\s+/, ''), m[3]!);
    }
    for (const m of source.matchAll(/\b(\w+)=\{(\w+)\}/g)) {
      const [, prop, value] = m;
      if (!clients.has(value!)) continue;
      // The element this attribute belongs to: the nearest one opened before it.
      const opened = [...source.slice(0, m.index!).matchAll(/<([A-Z]\w*)\b/g)].pop();
      if (!opened) continue;
      const component = opened[1];
      passes += 1;
      const specifier = imports.get(component!);
      // Defined in this file: a server component, which may take it.
      if (!specifier) continue;
      const target = fileOf(path, specifier);
      if (!target) {
        failures.push(`${relative(root, path)}: cannot find where <${component}> comes from (${specifier})`);
        continue;
      }
      if (isBrowser(readFileSync(target, 'utf8'))) {
        failures.push(`${relative(root, path)}: <${component} ${prop}={${value}}> hands the server's client to a browser component (${relative(root, target)})`);
      }
    }
  }
  assert.ok(serverFiles > 100, `only ${serverFiles} server components were read`);
  // /family passes its client to a server component defined in the same file.
  assert.ok(passes >= 1, 'the pattern this looks for no longer matches anything, so it proves nothing');
  assert.deepEqual(failures, [], `\n${failures.join('\n')}\n`);
});
