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
//   7. A table with no scrolling wrapper. A table cannot reflow, so on a phone
//      it pushes the document wider than the screen.
//   8. A form control with no name. A placeholder disappears on the first
//      keystroke and is not a name; three controls had nothing at all.
//   9. Text that is not readable on the surface behind it. `--muted` measured
//      3.98:1 on the page background and it is the whole muted voice of the
//      site; the eye said it was fine.
//  10. Crawl rules that describe a version of the app that no longer exists: a
//      sitemap entry for a dead route, a `Disallow` for a renamed one, or a
//      gated page whose source never reads a flag.
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

/**
 * Every route the App Router serves: `page.tsx` and `route.ts`, with group
 * folders `(auth)` removed and `[param]` standing for one segment.
 *
 * Two checks need this — links must resolve to one, and the crawl rules must
 * describe real ones — so it is read once here rather than twice slightly
 * differently.
 */
function appRoutes() {
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
  collect(join(root, 'web', 'src', 'app'), []);
  return routes;
}

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
  const routes = appRoutes();

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
// 7. A table cannot reflow, so it scrolls inside its own box
// ---------------------------------------------------------------------------
// Everything else in this app is a column of blocks and reflows to 360 pixels.
// A table is the one thing that cannot: it has columns. On a phone, an
// unwrapped table pushes the whole document wider than the screen and every
// page can be dragged sideways — which is what the masthead did before it was
// given a rule for that width.
//
// The check is at file level on purpose: it cannot tell whether this particular
// table is two columns wide and harmless. It asks that the page thought about
// it, by naming the wrapper `.scroll-x`.
{
  const offenders = [];
  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full);
      } else if (entry.endsWith('.tsx')) {
        const text = readFileSync(full, 'utf8');
        if (/<table[\s>]/.test(text) && !/className="scroll-x"/.test(text)) {
          offenders.push(full.slice(root.length + 1));
        }
      }
    }
  };
  walk(join(root, 'web', 'src'));

  for (const file of offenders.sort()) {
    fail('tables', `${file} renders a <table> without a .scroll-x wrapper`);
  }
  process.stdout.write(`tables: ${offenders.length} unwrapped table(s)\n`);
}

// ---------------------------------------------------------------------------
// 8. Every form control has a name
// ---------------------------------------------------------------------------
// A placeholder is not a label: it disappears as soon as somebody types, it is
// not read as the field's name by most screen readers, and it is not what a
// voice-control user has to say to reach the field. Three controls had no name
// at all — the discussion reply box, the question box beside it, and the file
// input in the uploader.
//
// The rule is satisfied by `aria-label`, by `aria-labelledby`, by an `id` with a
// matching `htmlFor` in the same file (including the template-literal form,
// `id={`quality-${x}`}` beside `htmlFor={`quality-${x}`}`), or by being wrapped
// in a `<label>`. Reading a JSX tag is the fiddly part: an arrow function in an
// attribute contains a `>`, so the tag is scanned with brace and quote depth
// rather than with a regex.
{
  const controls = [];
  const files = [];

  const walk = (dir) => {
    for (const entry of readdirSync(dir)) {
      const full = join(dir, entry);
      if (statSync(full).isDirectory()) {
        if (entry === 'node_modules' || entry === '.next') continue;
        walk(full);
      } else if (entry.endsWith('.tsx')) {
        files.push(full);
      }
    }
  };
  walk(join(root, 'web', 'src'));

  // The opening tag, brace-aware.
  const tagAt = (text, start) => {
    let depth = 0;
    let quote = null;
    for (let i = start; i < text.length; i += 1) {
      const c = text[i];
      if (quote) {
        if (c === quote && text[i - 1] !== '\\') quote = null;
        continue;
      }
      if (c === '"' || c === "'" || c === '`') { quote = c; continue; }
      if (c === '{') depth += 1;
      else if (c === '}') depth -= 1;
      else if (c === '>' && depth === 0) return text.slice(start, i + 1);
    }
    return '';
  };

  for (const file of files) {
    const text = readFileSync(file, 'utf8');
    const htmlFor = new Set([...text.matchAll(/htmlFor=["']([^"'{}]+)["']/g)].map((m) => m[1]));
    const htmlForExpr = new Set([...text.matchAll(/htmlFor=\{`([^`]*)`\}/g)].map((m) => m[1]));

    for (const match of text.matchAll(/<(input|select|textarea)\b/g)) {
      const tag = tagAt(text, match.index);
      if (/aria-label=|aria-labelledby=|type="hidden"/.test(tag)) continue;

      const idExpr = tag.match(/\bid=\{`([^`]*)`\}/)?.[1];
      if (idExpr && htmlForExpr.has(idExpr)) continue;

      const id = tag.match(/\bid=["']([^"'{}]+)["']/)?.[1];
      if (id && htmlFor.has(id)) continue;

      const before = text.slice(Math.max(0, match.index - 400), match.index);
      if (before.lastIndexOf('<label') > before.lastIndexOf('</label>')) continue;

      const line = text.slice(0, match.index).split('\n').length;
      controls.push(`${file.slice(root.length + 1)}:${line}`);
    }
  }

  for (const where of controls.sort()) {
    fail('labels', `${where} is a form control with no accessible name`);
  }
  process.stdout.write(`labels: ${files.length} files, ${controls.length} unnamed control(s)\n`);
}

// ---------------------------------------------------------------------------
// 9. The text colours are readable on the surfaces they are used on
// ---------------------------------------------------------------------------
// `--muted` was #6b7f75: 3.98:1 on the page background, 4.27:1 on a card, and
// 4.13:1 on the tinted one. AA asks 4.5:1 of normal text, and this is the
// colour of every secondary sentence in the product — the entire muted voice of
// the site sat between a fifth and a half of a ratio point under the line. It
// looked fine, which is exactly why it has to be measured.
//
// The maths is WCAG's: sRGB channels linearised, weighted .2126/.7152/.0722,
// and (L1 + .05) / (L2 + .05). The pairs below are the combinations the
// stylesheet actually puts together; anything under 4.5 fails. Large text would
// be allowed 3:1, and nothing here is large.
{
  const css = readFileSync(join(root, 'web', 'src', 'app', 'globals.css'), 'utf8');
  const rootBlock = css.match(/:root\s*\{([\s\S]*?)\}/)?.[1] ?? '';
  const tokens = new Map();
  for (const match of rootBlock.matchAll(/--([a-z0-9-]+):\s*(#[0-9a-fA-F]{6})\s*;/g)) {
    tokens.set(match[1], match[2].toLowerCase());
  }

  const channel = (value) => {
    const v = value / 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  };
  const luminance = (hex) => {
    const [r, g, b] = hex.replace('#', '').match(/../g).map((h) => channel(parseInt(h, 16)));
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  };
  const ratio = (a, b) => {
    const [light, dark] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (light + 0.05) / (dark + 0.05);
  };

  // Every pair the stylesheet actually puts behind or in front of text.
  const PAIRS = [
    ['text', 'bg'],
    ['text', 'surface'],
    ['text-soft', 'bg'],
    ['text-soft', 'surface'],
    ['text-soft', 'green-50'],
    ['muted', 'bg'],
    ['muted', 'surface'],
    ['muted', 'surface-2'],
    ['muted', 'green-50'],
    ['green-600', 'surface'],
    ['green-600', 'bg'],
    ['green-700', 'surface'],
    ['green-700', 'bg'],
    ['green-700', 'green-100'],
    ['green-800', 'green-50'],
    ['green-900', 'green-100'],
    ['white', 'green-700'],
    ['white', 'green-600'],
    ['white', 'green-800'],
    ['danger', 'danger-bg'],
  ];

  // White is written as a literal throughout the stylesheet rather than as a
  // token, so it is the one name this map has to supply itself.
  const colour = (name) => (name === 'white' ? '#ffffff' : tokens.get(name));

  let lowest = { ratio: Infinity, pair: '' };
  for (const [fgName, bgName] of PAIRS) {
    const fg = colour(fgName);
    const bg = colour(bgName);
    if (!fg || !bg) {
      fail('contrast', `--${fg ?? '?'} or --${bg ?? '?'} is missing from :root, so the pair cannot be measured`);
      continue;
    }
    const value = ratio(fg, bg);
    if (value < lowest.ratio) lowest = { ratio: value, pair: `${fgName} on ${bgName}` };
    if (value < 4.5) {
      fail('contrast', `${fgName} on ${bgName} is ${value.toFixed(2)}:1, under the 4.5 AA asks of normal text`);
    }
  }
  process.stdout.write(
    `contrast: ${PAIRS.length} pairs, lowest ${lowest.ratio.toFixed(2)}:1 (${lowest.pair})\n`,
  );
}

// ---------------------------------------------------------------------------
// 10. The crawl rules describe the app that exists
// ---------------------------------------------------------------------------
// `robots.txt` and `sitemap.xml` are written from two lists in
// `web/src/lib/crawl.ts`, and a list is a claim about the application. Every
// failure this check looks for has the same shape: the rules keep describing
// yesterday.
//
//   - a sitemap entry for a path that is no longer a route, so a crawler is
//     sent to a 404 and reports the sitemap as broken;
//   - a `Disallow` for a path that no longer exists, so a rename leaves a rule
//     that protects nothing and the new name is crawlable;
//   - a gated route whose page never reads a flag, so the page is either always
//     there or never, and the sitemap's conditional is a fiction;
//   - a public page that is also disallowed, which is a contradiction a crawler
//     resolves by doing whatever it likes.
//
// The lists are read out of the TypeScript source rather than imported, so this
// stays a builtins-only script that runs before `npm ci`.
{
  const crawlPath = join(root, 'web', 'src', 'lib', 'crawl.ts');
  const crawl = readFileSync(crawlPath, 'utf8');
  const routes = appRoutes();

  const block = (name) => {
    const start = crawl.indexOf(`export const ${name}`);
    if (start === -1) return '';
    const end = crawl.indexOf('];', start);
    return end === -1 ? '' : crawl.slice(start, end);
  };

  const publicBlock = block('PUBLIC_ROUTES');
  const gatedBlock = block('GATED_ROUTES');
  const disallowedBlock = block('DISALLOWED_PREFIXES');

  const publicPaths = [...publicBlock.matchAll(/path:\s*'([^']+)'/g)].map((m) => m[1]);
  const gated = [...gatedBlock.matchAll(/path:\s*'([^']+)'[^}]*?flag:\s*'([^']+)'/gs)].map((m) => ({
    path: m[1],
    flag: m[2],
  }));
  const disallowed = [...disallowedBlock.matchAll(/'(\/[^']*)'/g)].map((m) => m[1]);

  // A parse that finds nothing is a check that passes for the wrong reason.
  if (publicPaths.length === 0) fail('crawl', 'no public routes were read out of lib/crawl.ts');
  if (disallowed.length === 0) fail('crawl', 'no disallowed prefixes were read out of lib/crawl.ts');

  const serves = (path) =>
    routes.some((route) => {
      if (route === path) return true;
      const want = route.split('/');
      const have = path.split('/');
      if (want.length !== have.length) return false;
      return want.every((segment, i) => segment === '*' || segment === have[i]);
    });

  for (const path of publicPaths) {
    if (!serves(path)) fail('crawl', `the sitemap lists ${path}, which is not a route`);
    if (disallowed.some((prefix) => path === prefix || path.startsWith(`${prefix}/`))) {
      fail('crawl', `${path} is listed as public and as disallowed`);
    }
  }

  for (const route of gated) {
    if (!serves(route.path)) {
      fail('crawl', `the sitemap gates ${route.path}, which is not a route`);
      continue;
    }

    // The page must actually consult a flag; otherwise the gating is a claim
    // about a switch nobody reads.
    const file = join(root, 'web', 'src', 'app', route.path.replace(/^\//, ''), 'page.tsx');
    let source = '';
    try {
      source = readFileSync(file, 'utf8');
    } catch {
      fail('crawl', `${route.path} has no page.tsx to check its flag against`);
      continue;
    }
    if (!/isFlagEnabled|setting_bool/.test(source)) {
      fail('crawl', `${route.path} is gated in the sitemap but its page never reads a flag`);
    }
    if (!source.includes(route.flag) && !/isFlagEnabled\([^)]*\)/.test(source)) {
      fail('crawl', `${route.path} is gated on ${route.flag}, which its page does not mention`);
    }
  }

  for (const prefix of disallowed) {
    const covers = routes.some((route) =>
      prefix.endsWith('/') ? route.startsWith(prefix) : route === prefix || route.startsWith(`${prefix}/`),
    );
    if (!covers) fail('crawl', `robots.txt disallows ${prefix}, which is not a route any more`);
  }

  process.stdout.write(
    `crawl: ${publicPaths.length} public, ${gated.length} gated, ${disallowed.length} disallowed, all real\n`,
  );
}

// ---------------------------------------------------------------------------
if (problems.length > 0) {
  process.stderr.write(`\n${problems.length} structural problem(s):\n`);
  for (const problem of problems) process.stderr.write(`  - ${problem}\n`);
  process.exit(1);
}
process.stdout.write('\nRepository structure is sound.\n');
