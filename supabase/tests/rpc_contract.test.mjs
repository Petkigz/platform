// The contract between the screens and the database, checked against both.
//
// Every page and route reaches the database through `supabase.rpc('name', {…})`.
// PostgREST turns that object's keys into **named arguments**, so a key that is
// not a parameter of the function is not a warning or a coercion: the call is
// answered with "function not found", the screen shows an error about a database
// function, and the person who gets to see it is a user rather than a developer.
//
// Nothing else in this repository can see that mistake. The database suites call
// SQL directly, so they exercise the function and never the call. TypeScript sees
// `rpc(name: string, args?: any)`, so it checks nothing. `check:repo` reads the
// files as text and has no idea what a function's parameters are. The result is a
// class of defect that is invisible to 2 325 database assertions, 1 853 web tests
// and a green build, and that appears the first time somebody uses the feature.
//
// So this suite asks the running engine, not a parser: `information_schema` says
// what each function is actually called and what its required arguments are, and
// the call sites say what the app passes. Both sides are real.
//
// It was written after an audit that found a different, adjacent defect — the
// transcoder reading `SUPABASE_URL` while the runbook exported
// `NEXT_PUBLIC_SUPABASE_URL` — which is the same shape of bug: two halves of the
// system that agree in a developer's head and nowhere else.
//
// Three deliberate limits, so a later reader does not over-trust it:
//
//   * a call whose object literal contains a spread (`...args`) is checked for
//     the keys it names and not for the ones it must pass, because a spread can
//     supply anything;
//   * positional arguments are not checked, because the two functions called that
//     way take a single argument or none;
//   * this proves the *names* line up. It says nothing about whether the function
//     does what the screen expects — that is what the feature suites are for.

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = fileURLToPath(new URL('.', import.meta.url));
const webSrc = join(here, '..', '..', 'web', 'src');

/** Every `.ts`/`.tsx` file the browser or server actually ships. */
function sourceFiles(dir, out = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) sourceFiles(path, out);
    else if (/\.(ts|tsx)$/.test(path) && !/\.test\./.test(path)) out.push(path);
  }
  return out;
}

/** The balanced `{…}` starting at `i`, aware of strings and comments. */
function objectAt(source, i) {
  let depth = 0;
  let quote = null;
  let out = '';
  for (let j = i; j < source.length; j++) {
    const c = source[j];
    if (quote) {
      out += c;
      if (c === '\\') { out += source[++j]; continue; }
      if (c === quote) quote = null;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; out += c; continue; }
    if (c === '{') depth++;
    if (c === '}') { depth--; out += c; if (depth === 0) return out; continue; }
    out += c;
  }
  return out;
}

/**
 * The top-level keys of an object literal, and whether it spreads.
 *
 * A comment inside the literal carries commas, and a comma is what this splits
 * on — so comments are removed first. That is not fastidiousness: the first
 * version of this scan reported `p_actor_id` as missing from a call that passed
 * `p_actor_id: null` on the line after a two-line comment.
 */
function keysOf(literal) {
  const body = literal.slice(1, -1).replace(/\/\*[\s\S]*?\*\//g, '');
  const keys = [];
  let depth = 0;
  let quote = null;
  let token = '';
  let spread = false;
  const flush = () => {
    const text = token.trim();
    token = '';
    if (text.startsWith('...')) { spread = true; return; }
    const m = /^([a-z_$][\w$]*)\s*:/.exec(text);
    if (m) keys.push(m[1]);
  };
  for (let j = 0; j < body.length; j++) {
    const c = body[j];
    if (quote) {
      if (c === '\\') j++;
      else if (c === quote) quote = null;
      token += c;
      continue;
    }
    if (c === '/' && body[j + 1] === '/') {
      const nl = body.indexOf('\n', j);
      j = nl < 0 ? body.length : nl;
      continue;
    }
    if (c === "'" || c === '"' || c === '`') { quote = c; token += c; continue; }
    if (c === '(' || c === '[' || c === '{') depth++;
    if (c === ')' || c === ']' || c === '}') depth--;
    if (c === ',' && depth === 0) { flush(); continue; }
    token += c;
  }
  flush();
  return { keys, spread };
}

export async function run(ctx) {
  const { q, test, assert } = ctx;

  // -------------------------------------------------------------------------
  // What the database says it has
  // -------------------------------------------------------------------------
  //
  // `information_schema.parameters` rather than `pg_proc.proargnames`: the
  // latter also carries the OUT column names of a `returns table (…)` function,
  // and comparing those against call arguments flags every set-returning
  // function in the schema — a page of false positives, which is how a useful
  // check gets switched off in its second week.
  const catalog = new Map();
  for (const row of (await q(`
    select p.proname as name,
           coalesce(
             (select json_agg(json_build_object('n', ip.parameter_name,
                                                'required', ip.parameter_default is null)
                              order by ip.ordinal_position)
                from information_schema.parameters ip
               where ip.specific_schema = 'public'
                 and ip.specific_name = p.proname || '_' || p.oid
                 and ip.parameter_mode in ('IN', 'INOUT', 'VARIADIC')),
             '[]'::json) as args
      from pg_proc p
      join pg_namespace n on n.oid = p.pronamespace
     where n.nspname = 'public'`)).rows) {
    catalog.set(row.name, row.args);
  }

  // -------------------------------------------------------------------------
  // What the app asks for
  // -------------------------------------------------------------------------
  const calls = [];
  for (const file of sourceFiles(webSrc)) {
    const source = readFileSync(file, 'utf8');
    const re = /\.rpc\(\s*'([a-z0-9_]+)'/g;
    let m;
    while ((m = re.exec(source)) !== null) {
      const after = source.slice(m.index + m[0].length);
      const lead = /^\s*,?\s*/.exec(after)[0].length;
      const rest = after.slice(lead);
      let keys = [];
      let spread = false;
      if (rest.trimStart()[0] === '{') {
        const at = m.index + m[0].length + lead + (rest.length - rest.trimStart().length);
        ({ keys, spread } = keysOf(objectAt(source, at)));
      }
      calls.push({
        name: m[1],
        keys,
        spread,
        where: `${relative(webSrc, file).replace(/\\/g, '/')}:${source.slice(0, m.index).split('\n').length}`,
      });
    }
  }

  const names = new Set(calls.map((c) => c.name));

  await test('the scan looks at the whole app, not at a file that happens to be open', async () => {
    // A sweep that finds nothing because it looks at nothing reads exactly like a
    // sweep that found nothing, and this repository has been bitten by that
    // before. Both numbers are floors that only fall if the walk breaks.
    assert(catalog.size > 500, `only ${catalog.size} functions were read from the database`);
    assert(calls.length > 300, `only ${calls.length} rpc calls were found in web/src`);
    assert(names.size > 200, `the ${calls.length} calls name only ${names.size} functions`);
  });

  await test('every function a screen calls exists, with that name', async () => {
    const missing = calls.filter((c) => !catalog.has(c.name));
    assert(
      missing.length === 0,
      missing.map((c) => `${c.where} calls ${c.name}(), which is not a function in this schema`).join('\n'),
    );
  });

  await test('every argument a screen passes is a parameter the function has', async () => {
    // The one that bites. A renamed parameter is a complete outage of one screen
    // and leaves every other check in this repository green.
    const problems = [];
    for (const call of calls) {
      const declared = (catalog.get(call.name) ?? []).map((a) => a.n);
      if (declared.length === 0) continue;
      for (const key of call.keys) {
        if (!declared.includes(key)) {
          problems.push(
            `${call.where}: ${call.name}() has no parameter '${key}' ` +
            `(it takes ${declared.join(', ')})`,
          );
        }
      }
    }
    assert(problems.length === 0, problems.join('\n'));
  });

  await test('every required argument is actually passed', async () => {
    const problems = [];
    for (const call of calls) {
      if (call.spread) continue; // a spread can supply anything; not statically knowable
      const args = catalog.get(call.name) ?? [];
      const required = args.filter((a) => a.required).map((a) => a.n);
      if (required.length === 0) continue;
      const absent = required.filter((r) => !call.keys.includes(r));
      if (absent.length > 0) {
        problems.push(`${call.where}: ${call.name}() does not pass ${absent.join(', ')}`);
      }
    }
    assert(problems.length === 0, problems.join('\n'));
  });

  await test('a trigger is never called as if it were a function', async () => {
    // Not a rule about naming: a rule about the surface. These fire from a table
    // event and cannot be invoked directly — Postgres refuses — so a call site is
    // either dead code or a screen doing something it thinks is a write and is
    // not. `erase_my_account` is deliberately *not* on this list: closing your own
    // account is a screen action, and `/account/delete` is where it belongs.
    const internalOnly = [
      'handle_new_user',
      'refuse_erased_identity_change',
      'refuse_acknowledgement_change',
      'refuse_takedown_event_change',
      'keep_order_number',
      'apply_guardian_verification_decision',
      'reward_referral',
    ];
    const offenders = calls.filter((c) => internalOnly.includes(c.name));
    assert(
      offenders.length === 0,
      offenders.map((c) => `${c.where} calls ${c.name}() from the app, but it is a trigger and cannot be called directly`).join('\n'),
    );
  });
}
