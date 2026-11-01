import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  nextSteps,
  preflightVerdict,
  readEnvFile,
  runPreflight,
  stepLabel,
  SUBSYSTEMS,
  type Preflight,
  type Subsystem,
} from './preflight.ts';

/** The environment a finished free-tier deployment actually has. */
const COMPLETE = {
  NEXT_PUBLIC_SUPABASE_URL: 'https://abcdefghijkl.supabase.co',
  NEXT_PUBLIC_SUPABASE_ANON_KEY: `eyJhbGciOiJIUzI1NiJ9.${'a'.repeat(40)}.${'b'.repeat(40)}`,
  SUPABASE_SERVICE_ROLE_KEY: `eyJhbGciOiJIUzI1NiJ9.${'c'.repeat(40)}.${'d'.repeat(40)}`,
  NEXT_PUBLIC_SITE_URL: 'https://ayahspring.com',
  RESEND_API_KEY: `re_${'x'.repeat(24)}`,
  EMAIL_FROM: 'no-reply@ayahspring.com',
  EMAIL_REPLY_TO: 'privacy@ayahspring.com',
  R2_ACCOUNT_ID: 'abcdef0123456789abcdef0123456789',
  R2_ACCESS_KEY_ID: 'ABCDEF0123456789ABCDEF',
  R2_SECRET_ACCESS_KEY: 's'.repeat(48),
  MEDIA_WORKER_EMAIL: 'worker@ayahspring.com',
  MEDIA_WORKER_PASSWORD: 'a-real-password',
  EMAIL_WORKER_EMAIL: 'mailer@ayahspring.com',
  EMAIL_WORKER_PASSWORD: 'another-real-password',
  RETENTION_WORKER_EMAIL: 'cleaner@ayahspring.com',
  RETENTION_WORKER_PASSWORD: 'a-third-password',
  CRON_SECRET: 'k'.repeat(40),
  OFFLINE_VAULT_SECRET: 'v'.repeat(44),
} as const;

const blocking = (result: Preflight) =>
  result.findings.filter((f) => f.level === 'blocking');

// ---------------------------------------------------------------------------
// The file reader
// ---------------------------------------------------------------------------

test('a .env file is read the way a shell reads one', () => {
  const env = readEnvFile(
    [
      '# a comment, with an = in it',
      'PLAIN=value',
      'export EXPORTED=value2',
      'BLANK=',
      'SPACED = padded ',
      'QUOTED="has # not a comment"',
      "SINGLE='also fine'",
      'TRAILING=value # this part is a comment',
      'NOT A LINE',
      'notakey',
    ].join('\r\n'),
  );
  assert.equal(env.PLAIN, 'value');
  assert.equal(env.EXPORTED, 'value2');
  assert.equal(env.BLANK, '');
  assert.equal(env.SPACED, 'padded');
  assert.equal(env.QUOTED, 'has # not a comment');
  assert.equal(env.SINGLE, 'also fine');
  assert.equal(env.TRAILING, 'value');
  assert.equal('NOT A LINE' in env, false);
});

test('the example file parses, and every placeholder in it is recognised as one', () => {
  // The file an operator copies. If this check ever fails, the example file has
  // grown a syntax the reader cannot see, and every finding below it is wrong.
  const text = readFileSync(new URL('../../../web/.env.example', import.meta.url), 'utf8');
  const env = readEnvFile(text);
  assert.ok(Object.keys(env).length > 20, `${Object.keys(env).length} keys parsed from the example file`);
  // The placeholders are not one shape: a URL placeholder is a real-looking URL
  // with "your-" inside it, a key placeholder starts with "your-", and
  // NEXT_PUBLIC_ALLOW_MISSING_SUPABASE ships as the literal "1".
  assert.equal(env.NEXT_PUBLIC_SUPABASE_URL, 'https://your-project-ref.supabase.co');
  assert.equal(env.R2_ACCOUNT_ID, 'your-r2-account-id');
  assert.equal(env.R2_ACCESS_KEY_ID, 'your-r2-access-key-id');
  assert.equal(env.NEXT_PUBLIC_ALLOW_MISSING_SUPABASE, '1');

  // Copying the example verbatim must not look like a configured deployment.
  const copied = runPreflight(env);
  assert.ok(copied.blockingCount > 0, 'the example file, copied as shipped, passes preflight');
});

// ---------------------------------------------------------------------------
// What a finished deployment looks like
// ---------------------------------------------------------------------------

test('a complete environment has nothing blocking and nothing dark', () => {
  const result = runPreflight(COMPLETE);
  assert.deepEqual(
    blocking(runPreflight(COMPLETE)).map((f) => f.message),
    [],
    'a complete environment was reported as incomplete',
  );
  assert.equal(result.warningCount, 0);
  assert.equal(result.dark.length, 0, `still dark: ${result.dark.join(', ')}`);
  assert.match(preflightVerdict(result), /Nothing is missing/);
});

test('an empty environment is reported as the thing it is, not as 20 missing variables', () => {
  const result = runPreflight({});
  assert.ok(result.blockingCount > 0);
  const steps = nextSteps(result);
  assert.ok(steps.length >= 3, `only ${steps.length} step(s) to fix`);
  // The first thing to fix is the database: nothing else can be observed first.
  assert.equal(steps[0]?.label, '1. The database');
  assert.match(steps[0]?.messages.join(' ') ?? '', /Nothing works at all/);
});

test('every subsystem points at a step the runbook actually has', () => {
  // The runbook writes its top-level steps as headings (`## 6. The encoder`) and
  // its subsections as bold labels (`**7.5** The unattended run`), so both forms
  // count. Renumbering a step is a change to a document; this is what makes it
  // also a change to the code that sends people there.
  const runbook = readFileSync(
    new URL('../../../docs/deploy/README.md', import.meta.url),
    'utf8',
  );
  const steps = new Set<string>();
  for (const m of runbook.matchAll(/^#{2,3}\s+(\d+(?:\.\d+)?)[.\s]/gm)) steps.add(m[1] ?? '');
  for (const m of runbook.matchAll(/\*\*(\d+(?:\.\d+)?)\*\*/g)) steps.add(m[1] ?? '');

  const missing = SUBSYSTEMS.filter((s) => !steps.has(s.step)).map((s) => `${s.id} -> step ${s.step}`);
  assert.deepEqual(missing, [], `steps the runbook does not have: ${missing.join(', ')}`);
  assert.ok(steps.size > 15, `only ${steps.size} steps were found in the runbook`);
});

test('a step label reads the way the runbook writes it', () => {
  assert.equal(stepLabel('6', 'The encoder'), '6. The encoder');
  assert.equal(stepLabel('7.5', 'The unattended run'), '7.5 The unattended run');
});

// ---------------------------------------------------------------------------
// The defect this was written for
// ---------------------------------------------------------------------------

test('the worker is content with the NEXT_PUBLIC_ pair, because that is what the runbook exports', () => {
  // Found 2026-11-01: step 6.3 exported NEXT_PUBLIC_SUPABASE_URL and the worker
  // asked for SUPABASE_URL. Both are now the same value under two names, and
  // nothing here should call that a missing credential.
  const result = runPreflight({
    ...COMPLETE,
    SUPABASE_URL: undefined,
    SUPABASE_ANON_KEY: undefined,
  });
  const workerFindings = result.findings.filter((f) => f.subsystem === 'worker-supabase');
  assert.deepEqual(workerFindings, []);
});

test('two Supabase projects in one environment is a blocking finding', () => {
  // The failure this prevents: the worker encodes into project A while the site
  // serves project B. Every screen works, every test passes, and the renditions
  // land somewhere nobody looks.
  const split = runPreflight({
    ...COMPLETE,
    SUPABASE_URL: 'https://someotherproject.supabase.co',
  });
  const f = blocking(split).find((x) => /different project/.test(x.message));
  assert.ok(f, 'a split environment passed preflight');
  assert.equal(f?.level, 'blocking');
});

test('a key in a NEXT_PUBLIC_ variable is stopped, whatever it is called', () => {
  for (const key of ['NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY', 'NEXT_PUBLIC_R2_SECRET_ACCESS_KEY', 'NEXT_PUBLIC_API_KEY']) {
    const result = runPreflight({ ...COMPLETE, [key]: 'anything' });
    const leak = blocking(result).find((x) => x.message.includes(key));
    assert.ok(leak, `${key} was not stopped`);
    assert.match(leak?.message ?? '', /ships it to every browser/);
  }
});

// ---------------------------------------------------------------------------
// Values that look set and are not
// ---------------------------------------------------------------------------

test('a URL that is not a URL, and a key that is not a key', () => {
  const broken = runPreflight({
    ...COMPLETE,
    NEXT_PUBLIC_SUPABASE_URL: 'abcdefghijkl.supabase.co',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: 'https://abcdefghijkl.supabase.co',
  });
  const said = blocking(broken).map((f) => f.message).join('\n');
  assert.match(said, /NEXT_PUBLIC_SUPABASE_URL is not a URL/);
  assert.match(said, /NEXT_PUBLIC_SUPABASE_ANON_KEY is not a Supabase key/);
});

test('a secret shorter than the thing it seals is refused', () => {
  const short = runPreflight({ ...COMPLETE, OFFLINE_VAULT_SECRET: 'hunter2' });
  assert.match(blocking(short).map((f) => f.message).join(' '), /OFFLINE_VAULT_SECRET is shorter than 32/);
});

test('a short CRON_SECRET is refused, because it is the only lock on the cleanup', () => {
  const short = runPreflight({ ...COMPLETE, CRON_SECRET: 'abc' });
  assert.match(blocking(short).map((f) => f.message).join(' '), /CRON_SECRET is shorter than 24/);
});

test('the example file\\u2019s own placeholders are never mistaken for credentials', () => {
  const placeholders = runPreflight({
    NEXT_PUBLIC_SUPABASE_URL: 'https://your-project-ref.supabase.co',
    R2_ACCOUNT_ID: 'your-r2-account-id',
    R2_ACCESS_KEY_ID: 'your-r2-access-key-id',
    R2_SECRET_ACCESS_KEY: 'your-r2-secret-access-key',
    EMAIL_FROM: 'no-reply@ayahspring.com',
    CRON_SECRET: '…',
  });
  const ready = placeholders.states.find((s) => s.subsystem.id === 'media');
  assert.equal(ready?.ready, false, 'a placeholder bucket credential counted as configured');
  assert.ok(placeholders.blockingCount > 0);
});

// ---------------------------------------------------------------------------
// The warnings, which are the ones worth reading
// ---------------------------------------------------------------------------

test('an encoder with no worker account, and a scheduler that cannot act', () => {
  const noWorker = runPreflight({
    ...COMPLETE,
    MEDIA_WORKER_EMAIL: '',
    MEDIA_WORKER_PASSWORD: '',
    EMAIL_WORKER_EMAIL: '',
  });
  const warnings = noWorker.findings.filter((f) => f.level === 'warning').map((f) => f.message);
  assert.ok(warnings.some((w) => /CRON_SECRET is set but EMAIL_WORKER_EMAIL is not/.test(w)), warnings.join('\n'));
  assert.ok(blocking(noWorker).some((f) => /The encoder|MEDIA_WORKER_EMAIL/.test(f.message)));
});

test('a certificate domain pointing at localhost is a warning, not a block', () => {
  const local = runPreflight({ ...COMPLETE, NEXT_PUBLIC_SITE_URL: 'http://localhost:3000' });
  const f = local.findings.find((x) => /localhost/.test(x.message));
  assert.equal(f?.level, 'warning');
  assert.equal(local.blockingCount, 0);
});

test('an unread reply address is warned about, because a bounce is worse than nothing', () => {
  const noReply = runPreflight({ ...COMPLETE, EMAIL_REPLY_TO: '' });
  assert.match(
    noReply.findings.map((f) => f.message).join(' '),
    /EMAIL_REPLY_TO is unset/,
  );
});

test('a bucket name that disagrees with what the database derives is warned about', () => {
  const renamed = runPreflight({ ...COMPLETE, R2_MASTERS_BUCKET: 'my-masters' });
  const f = renamed.findings.find((x) => /R2_MASTERS_BUCKET/.test(x.message));
  assert.equal(f?.level, 'warning');
  assert.match(f?.message ?? '', /register_media_upload\(\)`? derives/);
});

test('an unregistered payment adapter is refused rather than ignored', () => {
  const wrong = runPreflight({ ...COMPLETE, PAYMENT_PROVIDER: 'paypal' });
  assert.match(blocking(wrong).map((f) => f.message).join(' '), /not a registered adapter/);
});

test('the CI escape hatch left on is stopped', () => {
  const ci = runPreflight({ ...COMPLETE, NEXT_PUBLIC_ALLOW_MISSING_SUPABASE: '1' });
  assert.match(blocking(ci).map((f) => f.message).join(' '), /build-time escape hatch/);
});

// ---------------------------------------------------------------------------
// The report itself
// ---------------------------------------------------------------------------

test('unconfigured payments are a note, not a block: that is the state until a merchant account exists', () => {
  const result = runPreflight(COMPLETE);
  const notes = result.findings.filter((f) => f.level === 'note');
  assert.equal(notes.length, 1, `expected one note, got ${notes.length}: ${notes.map((n) => n.message).join(' | ')}`);
  assert.equal(notes[0]?.subsystem, 'payments');
  assert.equal(result.blockingCount, 0, 'an unconfigured payment provider blocked the deployment');

  // Configure one provider and the note goes away — it is a statement of fact,
  // not a permanent apology.
  const withMtn = runPreflight({ ...COMPLETE, MTN_MOMO_SUBSCRIPTION_KEY: 'subscription-key', MTN_MOMO_API_KEY: 'api-key' });
  assert.equal(withMtn.findings.filter((f) => f.level === 'note').length, 0);
});

test('the next steps are the runbook order, and one step is one line', () => {
  const empty = runPreflight({});
  const steps = nextSteps(empty);
  const names = steps.map((s) => s.label);
  // The order the runbook does them in, and nothing appears twice.
  assert.equal(new Set(names).size, names.length);
  assert.equal(names[0], '1. The database');
  assert.ok(names.indexOf('5. Media storage') < names.indexOf('6. The encoder'));
  assert.equal(names.filter((n) => n === '6. The encoder').length, 0 + 1);
});

test('a subsystem knows what it costs to leave dark', () => {
  for (const subsystem of SUBSYSTEMS as readonly Subsystem[]) {
    assert.ok(subsystem.dark.length > 20, `${subsystem.id} does not say what breaks`);
    assert.ok(/^\d+(\.\d+)?$/.test(subsystem.step), `${subsystem.id} does not name a runbook step`);
    assert.ok(subsystem.stepTitle.length > 0, `${subsystem.id} does not name the step's title`);
  }
});
