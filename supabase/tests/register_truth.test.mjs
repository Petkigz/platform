// The register against the tree.
//
// `flags.test.mjs` holds FLAGS.md and `platform_settings` to each other, and that
// is exactly why two rows can agree and both be wrong: the sentence in the
// database and the sentence in the document were written by the same person on
// the same day, and nothing has ever compared either of them with the software.
//
// Twice on 2026-11-02 a precondition was found naming work that had shipped —
// `platform.cost_controls` said "Nothing exists" about a quota that refuses
// uploads, and `platform.search` blamed an index over lesson bodies on a schema
// where a lesson has no body. Both were fixed by hand, by reading rows against
// code. This suite is the mechanical half of that reading, so the next drift is
// caught by a test instead of by somebody's afternoon.
//
// **What it can check, and what it cannot.** It can check that every thing the
// register *names* exists: a function, a route, a setting, a migration file. It
// cannot tell whether a sentence describes the feature accurately — that is a
// reading, and the tests in the suites that own each feature are where it is
// pinned. What it stops is the specific failure of naming something that is not
// there, which is how a fabricated mechanism (an index over a column that does
// not exist) gets into a document and then into a plan.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const root = join(here, '..', '..');

/** Every page and route file, as the app path a person would type. */
function routes() {
  const appDir = join(root, 'web', 'src', 'app');
  const found = new Set();

  const walk = (dir, prefix) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        // Route groups — `(auth)` — are directories that do not appear in the URL.
        const segment = /^\(.*\)$/.test(entry) ? '' : `/${entry}`;
        walk(full, `${prefix}${segment}`);
        continue;
      }
      if (entry === 'page.tsx') found.add(prefix === '' ? '/' : prefix);
      if (entry === 'route.ts') found.add(`${prefix === '' ? '/' : prefix}`);
    }
  };

  walk(appDir, '');
  return found;
}

/** A route template (`/courses/[slug]`) is matched as a shape, not as a string. */
function routeExists(path, known) {
  const wanted = path.replace(/\/$/, '') || '/';
  for (const route of known) {
    const pattern = route.replace(/\/$/, '') || '/';
    if (pattern === wanted) return true;
    if (!pattern.includes('[')) continue;
    const regex = new RegExp(
      `^${pattern.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\[[^\]]+\\\]/g, '[^/]+')}$`,
    );
    if (regex.test(wanted)) return true;
  }
  return false;
}

const migrationFiles = readdirSync(join(root, 'supabase', 'migrations'))
  .filter((f) => f.endsWith('.sql'));

export async function run(ctx) {
  const { q, test, assert } = ctx;

  const settings = (await q(
    `select key, value_type, gate_type, value_text, preconditions, description
       from public.platform_settings order by key`)).rows;

  const functions = new Set((await q(
    `select distinct p.proname
       from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname in ('public', 'auth', 'storage')`)).rows.map((r) => r.proname));

  const tables = new Set((await q(
    `select c.relname from pg_class c join pg_namespace n on n.oid = c.relnamespace
      where n.nspname = 'public' and c.relkind in ('r', 'v', 'm')`)).rows.map((r) => r.relname));

  const keys = new Set(settings.map((r) => r.key));
  const knownRoutes = routes();

  // A control is not a switch. FLAGS.md keeps one table of things an owner may
  // flip and a second table of *values* an owner may set — a revenue share, a
  // quorum, a quota — and the difference matters here: a flag with a blank
  // precondition is an accident, a control with a blank precondition is just a
  // number whose meaning lives in its description. The document is the
  // classification; this suite holds the rows to it rather than inventing its own.
  const controls = controlKeys();

  /** The register's prose, row by row, so a failure names the row. */
  const rows = settings.map((r) => ({
    key: r.key,
    gate: r.gate_type,
    valueType: r.value_type,
    control: controls.has(r.key),
    text: `${r.preconditions ?? ''}\n${r.description ?? ''}`,
    preconditions: (r.preconditions ?? '').trim(),
  }));

  await test('no switch is waiting on a precondition nobody wrote', async () => {
    // `FLAGS.md` states its own rule: a flag with no written precondition is a bug
    // waiting to be enabled. This is the only place it can be checked.
    //
    // Controls are exempt and must be: a control carries a *value*, and what it
    // decides is its `description` — `teaching.revenue_share_percent` is not
    // waiting for anything, it is a number. Flags are the ones that must say.
    const empty = rows
      .filter((r) => !r.control && r.gate !== null && r.valueType === 'boolean' && r.preconditions === '')
      .map((r) => r.key);
    assert(empty.length === 0,
      `switch(es) with no written precondition: ${empty.join(', ')} — `
      + 'a flag with no written precondition is a bug waiting to be enabled');

    // The register's second rule, and the one that made the first hard to trust:
    // a flag may be unread only while its precondition says what is missing. A
    // row that claims it is ready — "None…", the word FLAGS.md uses — has to be
    // read by code, because that is the row an owner flips first and the one that
    // reads as a broken platform when nothing happens.
    //
    // It is deliberately narrower than "every flag must be read", which would
    // condemn 29 rows at once: this register records intent as well as switches,
    // and a flag whose precondition says a payout provider has to exist is honest
    // while nothing reads it. The lie is a row that claims readiness and does
    // nothing when flipped.
    const claimsReady = (r) => /^none\b/i.test(r.preconditions);
    const idle = rows
      .filter((r) => !r.control && r.valueType === 'boolean' && claimsReady(r))
      .filter((r) => !isRead(r.key))
      .map((r) => r.key);
    assert(idle.length === 0,
      `switch(es) that claim they are ready but nothing reads: ${idle.join(', ')} — `
      + 'either wire the key or stop telling the owner it is ready');
  });

  await test('every function the register names exists', async () => {
    // A fabricated mechanism in a document becomes a plan. `platform.search`
    // named an index over "lesson bodies" — a column that has never existed —
    // and the sentence sent the next reader to build an index over nothing.
    const missing = [];
    for (const row of rows) {
      for (const match of row.text.matchAll(/`([a-z][a-z0-9_]{2,})\(\)`/g)) {
        const name = match[1];
        if (!functions.has(name)) missing.push(`${row.key} → ${name}()`);
      }
    }
    assert(missing.length === 0,
      `the register names function(s) that do not exist: ${missing.join('; ')}`);
  });

  await test('every route the register names exists', async () => {
    const missing = [];
    for (const row of rows) {
      // Only backticked, app-absolute paths. An external address is not ours to
      // check, and prose that mentions a path casually is not a claim.
      for (const match of row.text.matchAll(/`(\/[a-z0-9[\]_-][a-z0-9/_[\]-]*)`/gi)) {
        const path = match[1];
        if (!routeExists(path, knownRoutes)) missing.push(`${row.key} → ${path}`);
      }
    }
    assert(missing.length === 0,
      `the register points at route(s) that do not exist: ${missing.join('; ')}`);
  });

  await test('every setting the register names exists', async () => {
    // A row that tells an owner to change `media.upload_quota_gb_per_teacher`
    // is useless if that key is not in the table — and a renamed key leaves the
    // sentence pointing at nothing.
    const missing = [];
    for (const row of rows) {
      for (const match of row.text.matchAll(/`([a-z][a-z0-9_]*\.[a-z][a-z0-9_.]*)`/g)) {
        const key = match[1];
        // `pg_proc.sp.proname`-shaped things are not settings; a dotted token only
        // counts when it looks like the register's own namespace.
        if (!/^(learning|family|teaching|commerce|delivery|platform|governance|finance|media|auth|institution|companion)\./.test(key)) continue;
        if (!keys.has(key)) missing.push(`${row.key} → ${key}`);
      }
    }
    assert(missing.length === 0,
      `the register refers to setting(s) that do not exist: ${missing.join('; ')}`);
  });

  await test('every table the register names exists', async () => {
    const missing = [];
    for (const row of rows) {
      for (const match of row.text.matchAll(/`([a-z][a-z0-9_]+)`/g)) {
        const name = match[1];
        if (!name.includes('_')) continue;
        // Only names that are asserted to be a table by the sentence around them.
        const at = row.text.indexOf(`\`${name}\``);
        const around = row.text.slice(Math.max(0, at - 90), at + name.length + 20);
        if (!/\btable\b/i.test(around)) continue;
        if (!tables.has(name)) missing.push(`${row.key} → ${name}`);
      }
    }
    assert(missing.length === 0,
      `the register names table(s) that do not exist: ${missing.join('; ')}`);
  });

  await test('every migration a document names is a file in the tree', async () => {
    // The deploy runbook names the last migration, and it has to be edited every
    // time a migration is added. Three times today that edit was made by hand;
    // once it was made wrongly (the report unit's filename was pasted into the
    // promotions unit's slot). This is the check that would have caught it.
    const documents = [
      'NEXT.md',
      'ROADMAP.md',
      'SCREENS.md',
      'FLAGS.md',
      'DECISIONS.md',
      'docs/deploy/README.md',
      'docs/remaining.md',
    ];
    const missing = [];
    for (const name of documents) {
      let text;
      try {
        text = readFileSync(join(root, name), 'utf8');
      } catch {
        continue;
      }
      for (const match of text.matchAll(/\b(\d{14}_[a-z0-9_]+\.sql)\b/g)) {
        if (!migrationFiles.includes(match[1])) missing.push(`${name} → ${match[1]}`);
      }
    }
    assert(missing.length === 0,
      `document(s) name a migration that is not in the tree: ${missing.join('; ')}`);
  });
}

/**
 * The keys in FLAGS.md's "Controls that are not flags" table.
 *
 * Read from the document, not maintained here, so there is one classification and
 * not two. A row that moves between the tables moves here with it.
 */
function controlKeys() {
  const text = readFileSync(join(root, 'FLAGS.md'), 'utf8');
  const start = text.indexOf('Controls that are not flags');
  if (start === -1) return new Set();
  const rest = text.slice(start);
  const end = rest.indexOf('\n## ', 1);
  const section = end === -1 ? rest : rest.slice(0, end);
  const keys = new Set();
  for (const match of section.matchAll(/^\|\s*`([a-z][a-z0-9_.]+)`\s*\|/gm)) keys.add(match[1]);
  return keys;
}

/**
 * Is this switch read anywhere that matters?
 *
 * Two shapes, because a flag can be enforced in either place: a
 * `setting_bool('key'` call in SQL (the database is the boundary for most of
 * these) or a mention in application code. Mentions in tests do not count — a
 * test naming a flag proves nothing about whether anything acts on it, and the
 * register rows themselves are excluded for the same reason.
 */
function isRead(key) {
  const escaped = key.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const sqlCall = new RegExp(`setting_[a-z]+\\(\\s*'${escaped}'`);
  const codeUse = new RegExp(`['"\`]${escaped}['"\`]`);

  const scan = (dir, test) => {
    let hit = false;
    const walk = (current) => {
      if (hit) return;
      let entries;
      try {
        entries = readdirSync(current);
      } catch {
        return;
      }
      for (const entry of entries) {
        const full = join(current, entry);
        let stats;
        try {
          stats = statSync(full);
        } catch {
          continue;
        }
        if (stats.isDirectory()) {
          walk(full);
          continue;
        }
        if (!/\.(sql|ts|tsx)$/.test(entry)) continue;
        if (entry === '20261024000100_flag_register.sql') continue;
        if (/\.test\.tsx?$/.test(entry)) continue;
        let text;
        try {
          text = readFileSync(full, 'utf8');
        } catch {
          continue;
        }
        if (test(text)) {
          hit = true;
          return;
        }
      }
    };
    walk(dir);
    return hit;
  };

  return scan(join(root, 'supabase', 'migrations'), (text) => sqlCall.test(text))
    || scan(join(root, 'web', 'src'), (text) => codeUse.test(text));
}
