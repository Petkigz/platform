import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, relative } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { one } from './embed.ts';

/**
 * Every `.from(table).select(…)` in the application, checked against the
 * schema the migrations build.
 *
 * The pages cast what the API returns (`as unknown as Row[]`), so the compiler
 * believes whatever the cast says. Until 2026-11-17 nothing here spoke to a
 * real PostgREST either, and four kinds of mistake passed every check:
 *
 *   1. a column that does not exist (`user_profiles.email`,
 *      `course_versions.language_code`): the whole request is refused;
 *   2. a relation two foreign keys could mean (`family_memberships` points at
 *      `user_profiles` twice): refused, PostgREST will not guess;
 *   3. a relation no foreign key joins: refused;
 *   4. `row.courses?.[0]?.title` where an enrolment has ONE course: PostgREST
 *      sends an object, `[0]` of an object is `undefined`, and the name is
 *      silently missing. About twenty reads were written this way, among them
 *      the lesson (its section, and through it the course version the page
 *      compares with the enrolment) and whether a reviewer is active.
 *
 * This reads the source as text and the schema from
 * `postgrest-schema.snapshot.json` (written by
 * `scripts/postgrest-schema-snapshot.mjs`, which CI runs with `--check`).
 *
 * What it does not cover: `insert`/`update` payloads, the keys read from a row
 * afterwards, selects built at run time, and anything a policy or a grant
 * refuses. `scripts/postgrest-contract.mjs` walks pages against a real
 * PostgREST for those.
 */

const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..');

type Relation = { kind: 'table' | 'view'; columns: string[] };
type ForeignKey = { name: string; from: string; columns: string[]; to: string; unique: boolean };
type Snapshot = {
  migrations: number;
  relations: Record<string, Relation>;
  foreignKeys: ForeignKey[];
};

const snapshot = JSON.parse(
  readFileSync(join(here, 'postgrest-schema.snapshot.json'), 'utf8'),
) as Snapshot;

function sources(dir: string): string[] {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) return sources(path);
    return /\.(ts|tsx)$/.test(name) && !/\.test\.tsx?$/.test(name) ? [path] : [];
  });
}

/** Split on commas that are not inside brackets. */
function splitTop(text: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (const ch of text) {
    if (ch === '(') depth += 1;
    if (ch === ')') depth -= 1;
    if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else current += ch;
  }
  parts.push(current);
  return parts.map((p) => p.trim()).filter((p) => p.length > 0);
}

type Embed = { key: string; shape: 'object' | 'array' | 'either' };

/** How PostgREST would join `target` to `table`, or why it would refuse. */
function relationship(table: string, target: string, hints: string[]):
  | { ok: true; shape: Embed['shape']; to: string }
  | { ok: false; reason: string } {
  const named = hints.filter((h) => h !== 'inner' && h !== 'left');
  type Candidate = { fk: ForeignKey; shape: Embed['shape']; to: string };
  let candidates = snapshot.foreignKeys.flatMap((fk): Candidate[] => {
    // The row holds the key: many-to-one, one object.
    if (fk.from === table && (fk.to === target || (fk.columns.length === 1 && fk.columns[0] === target && !snapshot.relations[target]))) {
      return [{ fk, shape: 'object', to: fk.to }];
    }
    // The other table holds the key: a list, unless the key is unique.
    if (fk.to === table && fk.from === target) {
      return [{ fk, shape: fk.unique ? 'either' : 'array', to: fk.from }];
    }
    return [];
  });
  if (named.length > 0) {
    candidates = candidates.filter((c) => named.includes(c.fk.name) || c.fk.columns.some((col) => named.includes(col)));
  }
  if (candidates.length === 0) {
    return { ok: false, reason: `no foreign key joins ${table} and ${target}${named.length ? ` by ${named.join(', ')}` : ''}` };
  }
  if (candidates.length > 1) {
    return {
      ok: false,
      reason: `${candidates.length} foreign keys join ${table} and ${target} (${candidates.map((c) => c.fk.name).join(', ')}); name one: ${target}!${candidates[0]!.fk.name}(…)`,
    };
  }
  return { ok: true, shape: candidates[0]!.shape, to: candidates[0]!.to };
}

function checkSelect(table: string, select: string, problems: string[], embeds: Embed[]): void {
  const relation = snapshot.relations[table];
  if (!relation) {
    problems.push(`no table or view called ${table}`);
    return;
  }
  for (const item of splitTop(select)) {
    const embed = /^(?:([A-Za-z_]\w*)\s*:\s*)?([A-Za-z_]\w*)((?:!\w+)*)\s*\(([\s\S]*)\)$/.exec(item);
    if (embed) {
      const [, alias, target, hintText, inner] = embed;
      const found = relationship(table, target!, hintText!.split('!').filter(Boolean));
      if (!found.ok) {
        problems.push(found.reason);
        continue;
      }
      embeds.push({ key: alias ?? target!, shape: found.shape });
      if (found.to.includes('.')) problems.push(`${target} is outside the public schema`);
      else checkSelect(found.to, inner!, problems, embeds);
      continue;
    }
    let name = item;
    const aliased = /^[A-Za-z_]\w*\s*:(?!:)\s*([\s\S]*)$/.exec(name);
    if (aliased) name = aliased[1]!;
    name = name.split(/::|->/)[0]!.trim();
    if (name === '*' || name === '') continue;
    if (!/^[A-Za-z_]\w*$/.test(name)) {
      problems.push(`cannot read "${item}" in a select on ${table}`);
      continue;
    }
    if (!relation.columns.includes(name)) problems.push(`${table} has no column ${name}`);
  }
}

/** `const NAME = 'a' + 'b';` in the same file, for selects kept in a constant. */
function constantIn(source: string, name: string): string | null {
  const found = new RegExp(`const\\s+${name}\\s*(?::\\s*string\\s*)?=\\s*((?:\\s*(?:'[^']*'|"[^"]*"|\`[^\`$]*\`)\\s*\\+?)+)\\s*;`).exec(source);
  if (!found) return null;
  return [...found[1]!.matchAll(/'([^']*)'|"([^"]*)"|`([^`$]*)`/g)]
    .map((m) => m[1] ?? m[2] ?? m[3] ?? '')
    .join('');
}

type Read = { file: string; line: number; table: string; select: string | null; raw: string; chain: string };

/** The text of one query: from `.from(` to the end of the statement. */
function chainFrom(source: string, start: number): string {
  let depth = 0;
  let quote: string | null = null;
  for (let i = start; i < source.length; i += 1) {
    const ch = source[i]!;
    if (quote) {
      if (ch === '\\') i += 1;
      else if (ch === quote) quote = null;
      continue;
    }
    if (ch === "'" || ch === '"' || ch === '`') quote = ch;
    else if (ch === '(' || ch === '[' || ch === '{') depth += 1;
    else if (ch === ')' || ch === ']' || ch === '}') {
      depth -= 1;
      if (depth < 0) return source.slice(start, i);
    } else if ((ch === ';' || ch === ',') && depth === 0) return source.slice(start, i);
  }
  return source.slice(start);
}

/**
 * The first argument of `.select(`: string literals joined with `+`, a
 * constant, or a template interpolating constants. Null when it is anything
 * else, which the test below refuses.
 */
function selectArgument(source: string, chain: string): { text: string | null; raw: string } | null {
  const at = /\.select\(/.exec(chain);
  if (!at) return null;
  let i = at.index + at[0].length;
  const start = i;
  const skip = () => {
    for (;;) {
      while (i < chain.length && /\s/.test(chain[i]!)) i += 1;
      if (chain.startsWith('//', i)) while (i < chain.length && chain[i] !== '\n') i += 1;
      else return;
    }
  };
  let text = '';
  let readable = true;
  skip();
  if (chain[i] === ')') return { text: '*', raw: '' };
  for (;;) {
    skip();
    const ch = chain[i];
    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1;
      while (j < chain.length && chain[j] !== ch) j += chain[j] === '\\' ? 2 : 1;
      const body = chain.slice(i + 1, j).replace(/\$\{(\w+)\}/g, (whole, name: string) => constantIn(source, name) ?? whole);
      if (body.includes('${')) readable = false;
      text += body;
      i = j + 1;
    } else {
      const name = /^[A-Za-z_]\w*/.exec(chain.slice(i));
      const value = name ? constantIn(source, name[0]) : null;
      if (!name || value === null) {
        readable = false;
        break;
      }
      text += value;
      i += name[0].length;
    }
    skip();
    if (chain[i] === '+') {
      i += 1;
      continue;
    }
    if (chain[i] !== ',' && chain[i] !== ')') readable = false;
    break;
  }
  const raw = chain.slice(start, Math.min(chain.length, Math.max(i, start + 1))).trim();
  return { text: readable ? text : null, raw };
}

function reads(): Read[] {
  const found: Read[] = [];
  for (const path of sources(root)) {
    const source = readFileSync(path, 'utf8');
    for (const from of source.matchAll(/\.from\(\s*'(\w+)'\s*\)/g)) {
      const chain = chainFrom(source, from.index!);
      // The first select of the chain; `.insert(…).select(…)` reads the same table.
      const select = selectArgument(source, chain);
      if (!select) continue;
      found.push({
        file: relative(root, path),
        line: source.slice(0, from.index!).split('\n').length,
        table: from[1]!,
        select: select.text,
        raw: select.raw,
        chain,
      });
    }
  }
  return found;
}

const ALL = reads();

test('one() takes the object PostgREST sends and the array the client library types', () => {
  assert.deepEqual(one({ title: 'A' }), { title: 'A' });
  assert.deepEqual(one([{ title: 'A' }, { title: 'B' }]), { title: 'A' });
  assert.equal(one([]), null);
  assert.equal(one(null), null);
  assert.equal(one(undefined), null);
});

test('the reader finds the reads it is meant to check', () => {
  // A regular expression that silently stops matching would pass everything.
  assert.ok(ALL.length >= 250, `only ${ALL.length} reads were found`);
  const lesson = ALL.find((r) => r.file === 'lib/lessons.ts' && r.table === 'lessons');
  assert.ok(lesson?.select?.includes('course_sections ( title, course_version_id )'), 'the lesson read was not found');
  const dashboard = ALL.find((r) => r.file === 'app/learn/page.tsx' && r.table === 'course_enrolments');
  assert.ok(dashboard?.select?.includes('courses ( title, slug ), course_versions ( version_number, language )'), 'a select joined with + was not read to its end');
  const reviewers = ALL.find((r) => r.file === 'lib/review.ts' && r.raw === 'REVIEWER_COLUMNS');
  assert.ok(reviewers?.select?.includes('user_profiles!reviewer_profiles_user_id_fkey'), 'a select kept in a constant was not resolved');
  const cases = ALL.find((r) => r.file === 'lib/support.ts' && r.raw.includes('${CASE_COLUMNS}'));
  assert.ok(cases?.select?.startsWith('id, case_number'), 'a select interpolating a constant was not resolved');
});

test('a select that cannot be read here is one of the known few', () => {
  const unread = ALL.filter((r) => r.select === null).map((r) => `${r.file}:${r.line} ${r.raw.slice(0, 60)}`);
  assert.deepEqual(unread, [], `selects built at run time are not checked; write them as a literal or a constant:\n${unread.join('\n')}`);
});

test('every select names columns that exist and relations PostgREST can join', () => {
  const failures: string[] = [];
  for (const read of ALL) {
    if (read.select === null) continue;
    const problems: string[] = [];
    checkSelect(read.table, read.select, problems, []);
    for (const p of problems) failures.push(`${read.file}:${read.line} ${p}`);
  }
  assert.deepEqual(failures, [], `\n${failures.join('\n')}\n`);
});

test('a relation that is one object is never indexed like a list', () => {
  const failures: string[] = [];
  const byFile = new Map<string, Set<string>>();
  for (const read of ALL) {
    if (read.select === null) continue;
    const embeds: Embed[] = [];
    checkSelect(read.table, read.select, [], embeds);
    for (const e of embeds) {
      // Where the same name is a list in another read of the same file, the
      // text cannot tell them apart, and the rule is simply: never `[0]`.
      if (e.shape !== 'object') continue;
      if (!byFile.has(read.file)) byFile.set(read.file, new Set());
      byFile.get(read.file)!.add(e.key);
    }
  }
  assert.ok([...byFile.values()].reduce((n, s) => n + s.size, 0) >= 30, 'too few to-one relations were found for this to mean anything');
  for (const [file, keys] of byFile) {
    const source = readFileSync(join(root, file), 'utf8');
    for (const key of keys) {
      // As a property (`row.courses?.[0]`) or destructured (`role?.[0]`).
      const indexed = new RegExp(`\\b${key}\\s*(?:\\?\\.|!)?\\s*\\[\\s*0\\s*\\]`, 'g');
      for (const hit of source.matchAll(indexed)) {
        failures.push(`${file}:${source.slice(0, hit.index!).split('\n').length} ${hit[0]} — ${key} is one object here; read it with one()`);
      }
    }
  }
  assert.deepEqual(failures, [], `\n${failures.join('\n')}\n`);
});

test('filters and orderings name columns that exist', () => {
  const failures: string[] = [];
  const FILTER = /\.(eq|neq|gt|gte|lt|lte|like|ilike|is|in|contains|containedBy|overlaps|order|not)\(\s*'([^']+)'/g;
  let checked = 0;
  for (const read of ALL) {
    const relation = snapshot.relations[read.table];
    if (!relation) continue;
    const embeds: Embed[] = [];
    const targets = new Map<string, string>();
    if (read.select !== null) {
      // Which table each embedded name stands for, so `courses.status` can be checked.
      const collect = (table: string, select: string) => {
        for (const item of splitTop(select)) {
          const embed = /^(?:([A-Za-z_]\w*)\s*:\s*)?([A-Za-z_]\w*)((?:!\w+)*)\s*\(([\s\S]*)\)$/.exec(item);
          if (!embed) continue;
          const found = relationship(table, embed[2]!, embed[3]!.split('!').filter(Boolean));
          if (!found.ok || found.to.includes('.')) continue;
          targets.set(embed[1] ?? embed[2]!, found.to);
          collect(found.to, embed[4]!);
        }
      };
      collect(read.table, read.select);
      checkSelect(read.table, read.select, [], embeds);
    }
    for (const hit of read.chain.matchAll(FILTER)) {
      const column = hit[2]!.split(/->/)[0]!;
      checked += 1;
      if (column.includes('.')) {
        const [name, inner] = column.split('.') as [string, string];
        const target = targets.get(name);
        if (!target) failures.push(`${read.file}:${read.line} .${hit[1]}('${hit[2]}') — ${name} is not embedded in this select`);
        else if (!snapshot.relations[target]!.columns.includes(inner)) failures.push(`${read.file}:${read.line} .${hit[1]}('${hit[2]}') — ${target} has no column ${inner}`);
        continue;
      }
      if (!relation.columns.includes(column)) failures.push(`${read.file}:${read.line} .${hit[1]}('${hit[2]}') — ${read.table} has no column ${column}`);
    }
  }
  assert.ok(checked >= 300, `only ${checked} filters were found`);
  assert.deepEqual(failures, [], `\n${failures.join('\n')}\n`);
});
