import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

// What a browser is sent, followed by its imports.
//
// A `'use client'` file and everything it imports at run time is JavaScript the
// reader downloads. `i18n/messages/catalogues.ts` is every sentence in every
// language (1.4 MB before compression): right on the server, which picks one,
// and never right in a browser, which is handed the one it needs as data.
//
// Found 2026-11-17 by building and searching the output for an Arabic
// sentence. Two ways in:
//
//   * `i18n/client.tsx` — the provider in the root layout, so every page —
//     took `fill` from `i18n/index.ts`. Whether the bundler dropped the
//     catalogues behind it was the bundler's decision; nothing here said so.
//   * the save button on the public course page took two numbers from
//     `wishlist.ts`, which reads enrolments, which translates. That one was
//     measured: the catalogues were in the chunk the course page loads.
//
// The rule is on the imports, not on the build output, because a build takes a
// minute and this takes a moment, and because the import is the thing a person
// writes. `import type` costs nothing and is ignored; `import { type A, b }`
// is a real import and is followed.

const here = dirname(fileURLToPath(import.meta.url));
const src = resolve(here, '..');

function sources(dir: string, out: string[] = []): string[] {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) sources(path, out);
    else if (/\.(ts|tsx)$/u.test(entry.name) && !/\.test\.ts$/u.test(entry.name)) out.push(path);
  }
  return out;
}

function resolveImport(from: string, spec: string): string | null {
  let base: string;
  if (spec.startsWith('@/')) base = join(src, spec.slice(2));
  else if (spec.startsWith('.')) base = resolve(dirname(from), spec);
  else return null; // a package
  for (const candidate of [base, `${base}.ts`, `${base}.tsx`, join(base, 'index.ts'), join(base, 'index.tsx')]) {
    if (existsSync(candidate) && statSync(candidate).isFile()) return candidate;
  }
  return null;
}

const IMPORT = /^\s*(?:import|export)\s+(type\s+)?(?:[^'";]*?\sfrom\s+)?['"]([^'"]+)['"]/gmu;

function runtimeImports(file: string): string[] {
  const found: string[] = [];
  for (const match of readFileSync(file, 'utf8').matchAll(IMPORT)) {
    if (match[1]) continue;
    const target = resolveImport(file, match[2]!);
    if (target) found.push(target);
  }
  return found;
}

const files = sources(src);
const graph = new Map(files.map((file) => [file, runtimeImports(file)]));
const isClient = (file: string) => /^(?:\s|\/\/[^\n]*\n|\/\*[\s\S]*?\*\/)*['"]use client['"]/u.test(readFileSync(file, 'utf8'));
const clients = files.filter(isClient);

/** The chain of imports from `start` to `target`, or null. */
function chainTo(start: string, target: string): string[] | null {
  const from = new Map<string, string | null>([[start, null]]);
  const queue = [start];
  while (queue.length > 0) {
    const file = queue.shift()!;
    if (file === target) {
      const chain: string[] = [];
      for (let at: string | null = target; at; at = from.get(at) ?? null) chain.unshift(relative(src, at));
      return chain;
    }
    for (const next of graph.get(file) ?? []) {
      if (!from.has(next)) {
        from.set(next, file);
        queue.push(next);
      }
    }
  }
  return null;
}

test('the walk sees the client components and the imports between them', () => {
  // A rule that finds nothing because it reads nothing passes for ever.
  assert.ok(clients.length > 150, `only ${clients.length} client components found`);
  assert.ok(clients.some((file) => file.endsWith(join('i18n', 'client.tsx'))));
  // It follows an alias and a relative import, and ignores a type.
  const provider = join(src, 'lib', 'i18n', 'client.tsx');
  assert.ok(graph.get(provider)!.includes(join(src, 'lib', 'i18n', 'format.ts')));
  assert.ok(graph.get(provider)!.includes(join(src, 'lib', 'i18n', 'messages', 'en.ts')));
  assert.ok(!graph.get(provider)!.includes(join(src, 'lib', 'i18n', 'locales.ts')), 'a type-only import was followed');
  // And it can find the thing it is looking for, from somewhere that has it.
  assert.ok(chainTo(join(src, 'lib', 'enrolment.ts'), join(src, 'lib', 'i18n', 'messages', 'catalogues.ts')));
});

test('no client component brings every language to the browser', () => {
  const catalogues = join(src, 'lib', 'i18n', 'messages', 'catalogues.ts');
  assert.ok(existsSync(catalogues));
  const offenders = clients
    .map((file) => chainTo(file, catalogues))
    .filter((chain): chain is string[] => chain !== null)
    .map((chain) => chain.join(' -> '));
  assert.deepEqual(offenders, []);
});

test('no client component imports the server Supabase client or the service key', () => {
  // The same walk, for the two files that must never be in a browser at all.
  // `server.ts` reads cookies through `next/headers` and fails the build if it
  // gets there; `admin.ts` holds the key that bypasses every policy, and would
  // not fail anything.
  for (const name of ['server.ts', 'admin.ts']) {
    const target = join(src, 'lib', 'supabase', name);
    assert.ok(existsSync(target), name);
    const offenders = clients
      .map((file) => chainTo(file, target))
      .filter((chain): chain is string[] => chain !== null)
      .map((chain) => chain.join(' -> '));
    assert.deepEqual(offenders, [], name);
  }
});

test('the functions a client may use to format are in a file with no catalogue behind it', () => {
  const format = readFileSync(join(src, 'lib', 'i18n', 'format.ts'), 'utf8');
  assert.deepEqual(runtimeImports(join(src, 'lib', 'i18n', 'format.ts')), []);
  for (const name of ['fill', 'pluralForm', 'formatNumber', 'formatPercent']) {
    assert.match(format, new RegExp(`export function ${name}\\(`, 'u'));
  }
  // And the server's entry point still offers them, so nothing else had to change.
  assert.match(readFileSync(join(src, 'lib', 'i18n', 'index.ts'), 'utf8'), /export \{ fill, formatNumber, formatPercent, pluralForm \};/u);
});
