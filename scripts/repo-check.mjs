#!/usr/bin/env node
// Structural checks on the repository itself.
//
// These are the failures that do not show up in a test run, because they are
// about the shape of the tree rather than the behaviour of the code. Each one
// below has either happened here or would silently cost a whole feature:
//
//   1. Two migrations sharing a filename prefix. Separate work sessions pick
//      dates independently, and `20261130000100_cohorts.sql` beside
//      `20261130000100_marking_feedback.sql` applies in an order that depends
//      on the rest of the name. The database suite would still pass locally,
//      because both files exist either way.
//   2. A test file nobody registered. `supabase/tests/run.mjs` lists its suites
//      by hand, so a new `*.test.mjs` that is not imported does not fail — it
//      simply never runs, and the count goes up in a commit message anyway.
//   3. Conflict markers left in a file. A three-way apply that half-succeeded
//      produces markers that TypeScript, SQL and Markdown all tolerate in
//      different ways, and the build is the last place you want to find them.
//   4. A class a screen asks for that the stylesheet never defines. `.page` and
//      `.crumbs` were used on twenty-five-plus screens and did not exist; every
//      screen laid out by accident and every test passed.
//   5. A page that opens a second `<main>`. The layout provides the landmark the
//      skip link targets, so a page-level one makes two. Nothing looks wrong.
//   6. A link to a route that is not there. `href="/tachers"` is a valid string;
//      TypeScript has no opinion, and the page renders a link to a 404.
//
// Node builtins only, so this runs before `npm ci` and costs nothing.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const problems = [];
const fail = (check, message) => problems.push(`${check}: ${message}`);

const MIGRATION = /^(\d{14})_([a-z0-9][a-z0-9_]*)\.sql$/;

// ---------------------------------------------------------------------------
// 1. Migrations are named so their order is not ambiguous
// ---------------------------------------------------------------------------
{
  const dir = join(root, 'supabase', 'migrations');
  const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
  const byPrefix = new Map();

  for (const file of files) {
    const match = MIGRATION.exec(file);
    if (!match) {
      fail('migrations', `${file} does not match <14-digit timestamp>_<snake_case>.sql`);
      continue;
    }
    const [, prefix] = match;
    const seen = byPrefix.get(prefix);
    if (seen) {
      fail('migrations', `${prefix} is used by both ${seen} and ${file}; `
        + 'two migrations with one prefix apply in an order the filename does not decide');
    } else {
      byPrefix.set(prefix, file);
    }
  }

  const ordered = [...byPrefix.keys()].sort();
  if (ordered.some((prefix, i) => i > 0 && prefix < ordered[i - 1])) {
    fail('migrations', 'timestamps are not in ascending order once sorted');
  }
  process.stdout.write(`migrations: ${files.length} files, ${byPrefix.size} distinct prefixes\n`);
}

// ---------------------------------------------------------------------------
// 2. Every suite is registered with the runner
// ---------------------------------------------------------------------------
{
  const dir = join(root, 'supabase', 'tests');
  const runner = readFileSync(join(dir, 'run.mjs'), 'utf8');
  const suites = readdirSync(dir).filter((f) => f.endsWith('.test.mjs'));

  for (const suite of suites) {
    if (!runner.includes(`'./${suite}'`)) {
      fail('suites', `${suite} is never imported by run.mjs, so it does not run`);
    }
  }

  // The reverse direction: an import of a file that is not there fails loudly
  // anyway, but a suite imported and never called passes silently.
  const imported = [...runner.matchAll(/import \{ run as (\w+) \} from '\.\/([^']+)'/g)]
    .map((m) => ({ binding: m[1], file: m[2] }));
  for (const { binding, file } of imported) {
    if (!new RegExp(`\\[\\s*'[^']+',\\s*${binding}\\s*\\]`).test(runner)) {
      fail('suites', `${file} is imported as ${binding} but never listed in the run order`);
    }
    if (!statSync(join(dir, file)).isFile()) fail('suites', `${file} is imported but missing`);
  }
  process.stdout.write(`suites: ${suites.length} files, ${imported.length} imported, all listed\n`);
}

// ---------------------------------------------------------------------------
// 3. No conflict markers in tracked files
// ---------------------------------------------------------------------------
{
  const markers = [
    /^<{7}(\s|$)/m,
    /^={7}$/m,
    /^>{7}(\s|$)/m,
  ];
  const tracked = execFileSync('git', ['ls-files', '-z'], { cwd: root, maxBuffer: 64 * 1024 * 1024 })
    .toString('utf8')
    .split('\0')
    .filter(Boolean);
  let scanned = 0;

  for (const file of tracked) {
    if (!/\.(sql|mjs|js|ts|tsx|json|md|css|yml|yaml)$/.test(file)) continue;
    const text = readFileSync(join(root, file), 'utf8');
    scanned += 1;
    for (const marker of markers) {
      if (marker.test(text)) {
        fail('markers', `${file} contains a conflict marker`);
        break;
      }
    }
  }
  process.stdout.write(`markers: ${scanned} text files scanned\n`);
}

// ---------------------------------------------------------------------------
// 4. Every class a screen asks for is a class the stylesheet defines
// ---------------------------------------------------------------------------
// `.page`, `.page-head` and `.crumbs` were used on twenty-eight, twenty-seven
// and twenty-five screens and were never written. Nothing failed: the JSX
// compiled, the build passed, the tests passed, and every one of those screens
// was laid out by accident. The lesson page asked for `page narrow` and got a
// 416-pixel column for a video and a discussion thread.
//
// So this check reads the class names out of the JSX and the selectors out of
// `globals.css` and refuses a name that is only in one of them. It is
// deliberately literal: a class built from a variable (`className={kind}`) is
// not checked, because it cannot be — but every class spelled out in a string
// is, and that is where the drift was.
{
  const cssPath = join(root, 'web', 'src', 'app', 'globals.css');
  // Comments are stripped first: this file's prose mentions `brand.ts` and
  // `page.tsx`, and a filename is not a class.
  const css = readFileSync(cssPath, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '');
  const defined = new Set([...css.matchAll(/\.([a-zA-Z][a-zA-Z0-9_-]*)/g)].map((m) => m[1]));

  const used = new Map();
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full);
      } else if (entry.endsWith('.tsx')) {
        const text = readFileSync(full, 'utf8');
        const rel = full.slice(root.length + 1);

        // `className="a b c"` and the static parts of `` className={`a ${x}`} ``.
        for (const match of text.matchAll(/className=(?:"([^"]*)"|\{`([^`]*)`\})/g)) {
          const raw = (match[1] ?? match[2] ?? '').replace(/\$\{[^}]*\}/g, ' ');
          for (const token of raw.split(/\s+/)) {
            // A bare identifier with no hyphen or colon could be a mistake in
            // prose, but in a className string every token is meant to be a
            // class. Only shape-check it so an odd selector cannot crash this.
            if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(token)) continue;
            if (!used.has(token)) used.set(token, rel);
          }
        }
      }
    }
  };
  walk(join(root, 'web', 'src'));

  const unknown = [...used.entries()].filter(([name]) => !defined.has(name)).sort();
  for (const [name, file] of unknown) {
    fail('classes', `.${name} is used in ${file} but never defined in globals.css`);
  }
  process.stdout.write(
    `classes: ${used.size} used, ${defined.size} defined, ${unknown.length} undefined\n`,
  );
}

// ---------------------------------------------------------------------------
// 5. A page does not open a second <main>
// ---------------------------------------------------------------------------
// The root layout already renders `<main id="main">`, and the skip link at the
// top of the page targets it. Twenty-five page components rendered their own
// `<main>` around their content, so every one of those documents had two main
// landmarks — an assistive-technology bug with no visual symptom, which is why
// it survived review. It is the same drift as the missing CSS classes: a
// layout primitive that was assumed to live at the page level when the layout
// already provided it.
//
// `layout.tsx` is the one that owns the landmark. `global-error.tsx` replaces
// the whole document, so it is the only one that must render its own.
{
  const allowed = new Set(['layout.tsx', 'global-error.tsx']);
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full);
      } else if (entry.endsWith('.tsx') && !allowed.has(entry)) {
        if (/<main[\s>]/.test(readFileSync(full, 'utf8'))) {
          offenders.push(full.slice(root.length + 1));
        }
      }
    }
  };
  walk(join(root, 'web', 'src'));

  for (const file of offenders.sort()) {
    fail('landmarks', `${file} renders its own <main>; the layout already provides one`);
  }
  process.stdout.write(`landmarks: ${offenders.length} stray <main> element(s)\n`);
}

// ---------------------------------------------------------------------------
// 6. Every internal link points at a route that exists
// ---------------------------------------------------------------------------
// The About page once promised a door that redirected elsewhere, and a page
// elsewhere linked to a screen that had been renamed. A link to a 404 is not a
// type error: `href="/tachers"` is a perfectly good string, TypeScript has no
// opinion about it, and the page renders a link that goes nowhere.
//
// So the routes are read out of the App Router — every `page.tsx` and
// `route.ts`, with group folders `(auth)` removed and `[param]` matched as one
// segment — and every literal internal link is resolved against them. Template
// literals that build a path from a value (`/courses/${slug}`) are skipped,
// because their target is not knowable here; `redirect()`, `router.push()` and
// `router.replace()` count as links, since they navigate the same way.
{
  const appDir = join(root, 'web', 'src', 'app');
  const routes = [];
  const collect = (dir, segments) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        const isGroup = entry.startsWith('(') && entry.endsWith(')');
        collect(full, isGroup ? segments : [...segments, entry.startsWith('[') ? '*' : entry]);
      } else if (entry === 'page.tsx' || entry === 'route.ts') {
        routes.push('/' + segments.join('/'));
      }
    }
  };
  collect(appDir, []);

  const resolves = (href) => routes.some((route) => {
    if (route === href) return true;
    const want = route.split('/');
    const have = href.split('/');
    if (want.length !== have.length) return false;
    return want.every((segment, i) => segment === '*' || segment.toLowerCase() === have[i].toLowerCase());
  });

  const LINK = [
    /href\s*=\s*["'](\/[^"'`]*)["']/g,
    /redirect\(\s*["'](\/[^"'`]*)["']\s*\)/g,
    /\.(?:push|replace)\(\s*["'](\/[^"'`]*)["']\s*\)/g,
  ];

  const broken = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full);
      } else if (entry.endsWith('.tsx') || entry.endsWith('.ts')) {
        const text = readFileSync(full, 'utf8');
        for (const pattern of LINK) {
          for (const match of text.matchAll(pattern)) {
            const literal = match[1];
            if (literal.includes('${')) continue;
            const path = (literal.split('?')[0].split('#')[0] || '/').replace(/\/+$/, '') || '/';
            if (!resolves(path)) broken.push([full.slice(root.length + 1), literal]);
          }
        }
      }
    }
  };
  walk(join(root, 'web', 'src'));

  for (const [file, href] of broken.sort()) {
    fail('links', `${file} links to ${href}, which is not a route`);
  }
  process.stdout.write(
    `links: ${routes.length} routes, ${broken.length} broken internal link(s)\n`,
  );
}

// ---------------------------------------------------------------------------
if (problems.length > 0) {
  process.stderr.write(`\n${problems.length} structural problem(s):\n`);
  for (const problem of problems) process.stderr.write(`  - ${problem}\n`);
  process.exit(1);
}
process.stdout.write('\nRepository structure is sound.\n');
