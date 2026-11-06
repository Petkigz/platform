/**
 * Preflight: what a deployment is still missing, said as runbook steps.
 *
 * This exists because of a specific evening. `docs/deploy/README.md` step 6.3 told
 * an operator to `export NEXT_PUBLIC_SUPABASE_URL` and the transcode worker
 * refused with *"the worker needs SUPABASE_URL"* — a message naming a variable the
 * runbook never mentions, about a value that was correct. Nothing in the
 * repository could see it: the app builds with no environment at all, the test
 * suites inject their own values, and `check:repo` compares *the runbook to the
 * example file*, not either of them to what a process actually reads. The defect
 * lived in the gap between a document and a program, which is exactly where a
 * person is standing alone at eleven at night.
 *
 * So this module is the third side of that triangle. It takes an environment —
 * the keys and values a deployment really has — and answers three questions:
 *
 * 1. **What does each part of the platform need?** Not "which variables exist"
 *    but *which capability is dark*: no anon key means nobody can sign in; no R2
 *    credentials means no byte can be uploaded or played; no worker credentials
 *    means the encoder exits before it reads a flag.
 * 2. **Is what is set the right shape?** A URL that is not a URL, a key that is
 *    not a key, a secret shorter than the thing it seals, a bucket name that
 *    disagrees with what the database derives — each is a value that *looks*
 *    configured and fails at the first use, which is worse than a blank.
 * 3. **Which step of the runbook is not satisfied yet?** Every finding carries
 *    the step that fixes it, because "R2_SECRET_ACCESS_KEY is missing" does not
 *    tell a person where to get one.
 *
 * Two rules the copy follows, both learned from the same evening:
 *
 * - **A finding is a sentence, not a variable name.** `R2_ACCOUNT_ID` alone tells
 *   somebody nothing; "media cannot be uploaded or played until this exists —
 *   step 5" tells them what is broken and where to go.
 * - **Nothing here talks to a network.** It reads a file and reasons. A preflight
 *   that required credentials to answer "do you have credentials" is useless in
 *   the one moment it is needed, and the network checks belong in the smoke test
 *   the runbook already has (step 4.4).
 *
 * Pure: the file reading is the caller's job, so every rule is testable.
 */

/**
 * What a placeholder in `.env.example` looks like, as opposed to a real value.
 *
 * Two shapes, and both matter: `your-r2-account-id` starts with it, while
 * `https://your-project-ref.supabase.co` is a *valid URL* that would otherwise be
 * reported as a configured project — the example file copied verbatim would look
 * ready and the first request would fail.
 */
const PLACEHOLDER = /^(your-|changeme|xxx+|…|\.\.\.|<.*>)/i;
const PLACEHOLDER_ANYWHERE = /your-[a-z-]+|changeme|^…$/i;

export type SubsystemId =
  | 'database'
  | 'worker-supabase'
  | 'email'
  | 'media'
  | 'encoder'
  | 'payments'
  | 'scheduler'
  | 'offline';

export type Subsystem = {
  id: SubsystemId;
  /** What the owner would call it. Printed, so it is not a slug. */
  name: string;
  /** The runbook step number. The number is the contract; the title is copy. */
  step: string;
  /** The runbook's own words for that step, for the printed finding. */
  stepTitle: string;
  /** Variables without which the subsystem cannot work at all. */
  requires: readonly string[];
  /** Variables that change behaviour but do not stop it. */
  optional: readonly string[];
  /** What a person cannot do while this is dark. */
  dark: string;
};

/**
 * The platform, split by what a *deployment* needs rather than by what a feature
 * needs. Deliberately not the 109 flags: a flag is switched on from a screen,
 * these are all the same question — is this machine finished.
 */
export const SUBSYSTEMS: readonly Subsystem[] = [
  {
    id: 'database',
    name: 'The database and sign-in',
    step: '1',
    stepTitle: 'The database',
    requires: ['NEXT_PUBLIC_SUPABASE_URL', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
    optional: ['SUPABASE_SERVICE_ROLE_KEY'],
    dark: 'Nothing works at all: no page can be served with a session and every route answers 503.',
  },
  {
    id: 'worker-supabase',
    name: 'The machines that run on a schedule',
    step: '6',
    stepTitle: 'The encoder',
    requires: [],
    optional: ['SUPABASE_URL', 'SUPABASE_ANON_KEY'],
    dark: 'Nothing here is required — the worker and the cron routes fall back to the two NEXT_PUBLIC_ values above.',
  },
  {
    id: 'email',
    name: 'Email delivery',
    step: '7',
    stepTitle: 'Email',
    requires: ['RESEND_API_KEY', 'EMAIL_FROM'],
    optional: ['EMAIL_REPLY_TO', 'EMAIL_WORKER_EMAIL', 'EMAIL_WORKER_PASSWORD'],
    dark: 'The outbox queues mail and never sends it: no receipt, no invite, no password-recovery message from this platform.',
  },
  {
    id: 'media',
    name: 'Media storage and playback',
    step: '5',
    stepTitle: 'Media storage',
    requires: ['R2_ACCOUNT_ID', 'R2_ACCESS_KEY_ID', 'R2_SECRET_ACCESS_KEY'],
    optional: ['R2_MASTERS_BUCKET', 'R2_RENDITIONS_BUCKET'],
    dark: 'No byte can be uploaded or played. Lessons fall back to external https resources only.',
  },
  {
    id: 'encoder',
    name: 'The encoder',
    step: '6',
    stepTitle: 'The encoder',
    requires: ['MEDIA_WORKER_EMAIL', 'MEDIA_WORKER_PASSWORD'],
    optional: [],
    dark: 'Masters are stored and never encoded, so there is no copy for a browser to play.',
  },
  {
    id: 'payments',
    name: 'Payments',
    step: '9',
    stepTitle: 'What is left, and is not a deployment task',
    requires: [],
    optional: [
      'PAYMENT_PROVIDER',
      'MTN_MOMO_SUBSCRIPTION_KEY',
      'MTN_MOMO_API_USER',
      'MTN_MOMO_API_KEY',
      'AIRTEL_CLIENT_ID',
      'AIRTEL_CLIENT_SECRET',
    ],
    dark: 'Checkout says payments are not configured. That is the honest state until a merchant account exists, and it is not a defect.',
  },
  {
    id: 'scheduler',
    name: 'The unattended jobs',
    step: '7.5',
    stepTitle: 'The unattended run',
    requires: ['CRON_SECRET'],
    optional: ['RETENTION_WORKER_EMAIL', 'RETENTION_WORKER_PASSWORD'],
    dark: 'Nothing runs on its own: mail is not dispatched and no retention clock is wound, so both become something a person must remember.',
  },
  {
    id: 'offline',
    name: 'Offline downloads',
    step: '4',
    stepTitle: 'The web app',
    requires: ['OFFLINE_VAULT_SECRET'],
    optional: [],
    dark: 'Saving a lesson to a device refuses rather than storing it in the clear, which is the correct behaviour and an unfinished deployment.',
  },
];

export type Level = 'blocking' | 'warning' | 'note';

export type Finding = {
  level: Level;
  subsystem: SubsystemId;
  /** The runbook step number, so every finding is actionable without a lookup. */
  step: string;
  /** The runbook's own title for that step. */
  stepTitle: string;
  message: string;
};

/** `6. The encoder`, or `7.5 The unattended run` — the runbook writes subsections without a second dot. */
export function stepLabel(step: string, title: string): string {
  return step.includes('.') ? `${step} ${title}` : `${step}. ${title}`;
}

export type SubsystemState = {
  subsystem: Subsystem;
  /** Missing required variables. */
  missing: string[];
  /** Variables that are set but do not look like what they claim to be. */
  wrong: string[];
  /** True when nothing required is missing and nothing is malformed. */
  ready: boolean;
};

export type Preflight = {
  states: SubsystemState[];
  findings: Finding[];
  /** Held back: `blocking` findings stop the deployment, warnings do not. */
  blockingCount: number;
  warningCount: number;
  /** Ready subsystems, by the name a person reads. */
  ready: string[];
  dark: string[];
};

/**
 * A `.env` file, parsed the way a shell reads one — close enough that the values
 * this reports on are the values the app would see.
 *
 * Handles `export`, `#` comments, quoted values (so a secret containing `#` or a
 * space survives), CRLF, and blank values. It does not interpolate `${…}`: this
 * platform's example file contains none, and a preflight that silently resolved
 * one would report on a value nobody wrote.
 */
export function readEnvFile(text: string): Record<string, string> {
  const out: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (line === '' || line.startsWith('#')) continue;
    const withoutExport = line.startsWith('export ') ? line.slice(7).trim() : line;
    const eq = withoutExport.indexOf('=');
    if (eq <= 0) continue;
    const key = withoutExport.slice(0, eq).trim();
    if (!/^[A-Za-z_][A-Za-z0-9_]*$/.test(key)) continue;
    let value = withoutExport.slice(eq + 1).trim();
    const quoted = /^(['"])([\s\S]*)\1$/.exec(value);
    if (quoted) value = quoted[2] ?? '';
    // An inline comment after an unquoted value is a comment, not part of it.
    if (!quoted) value = value.replace(/\s+#.*$/, '').trim();
    out[key] = value;
  }
  return out;
}

const value = (env: Record<string, string | undefined>, key: string): string =>
  (env[key] ?? '').trim();

/** A value that is present but still says "fill me in". */
function isPlaceholder(v: string): boolean {
  return PLACEHOLDER.test(v) || PLACEHOLDER_ANYWHERE.test(v);
}

function isUrl(v: string): boolean {
  try {
    const url = new URL(v);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * A Supabase key is a JWT: three base64url segments. The format is stable enough
 * to check, and checking it catches the two mistakes people actually make —
 * pasting the project URL into the key field, and pasting a *publishable* key
 * into the service-role field.
 */
function isJwtShape(v: string): boolean {
  const parts = v.split('.');
  if (parts.length !== 3) return false;
  return parts.every((p) => p.length > 0 && /^[A-Za-z0-9_-]+$/.test(p));
}

/**
 * Every rule, in one pass.
 *
 * Ordered so the findings read in the order a person would fix them: the database
 * first, because nothing else can be observed until it works; then the things
 * that silently do nothing (mail, media, the scheduler); then the things that are
 * deliberately off (payments).
 */
export function runPreflight(env: Record<string, string | undefined>): Preflight {
  const findings: Finding[] = [];
  const states: SubsystemState[] = [];

  const has = (key: string) => value(env, key) !== '';
  const looks = (key: string) => {
    const v = value(env, key);
    return v !== '' && !isPlaceholder(v);
  };

  // -------------------------------------------------------------------------
  // 1. The database, and the two values everything else is observed through.
  // -------------------------------------------------------------------------
  for (const subsystem of SUBSYSTEMS) {
    const missing = subsystem.requires.filter((key) => !has(key) || !looks(key));
    const wrong: string[] = [];

    for (const key of subsystem.requires) {
      const v = value(env, key);
      if (v === '' || isPlaceholder(v)) continue;
      if (key.includes('_URL') && !isUrl(v)) wrong.push(`${key} is not a URL (${v.slice(0, 24)}…)`);
      if (key.includes('_KEY') && (key.includes('SUPABASE') || key.includes('_ANON')) && !isJwtShape(v)) {
        wrong.push(`${key} is not a Supabase key: it should be three dot-separated segments`);
      }
      if (key === 'OFFLINE_VAULT_SECRET' && v.length < 32) {
        wrong.push('OFFLINE_VAULT_SECRET is shorter than 32 characters; `openssl rand -base64 32` is the shape the runbook asks for');
      }
      if (key === 'CRON_SECRET' && v.length < 24) {
        wrong.push('CRON_SECRET is shorter than 24 characters; it is the only thing standing between the internet and the cleanup');
      }
      if (key === 'R2_ACCOUNT_ID' && v.length < 16) {
        wrong.push('R2_ACCOUNT_ID is too short to be an account id');
      }
      if (key === 'R2_ACCESS_KEY_ID' && !/^[A-Za-z0-9]{16,}$/.test(v)) {
        wrong.push('R2_ACCESS_KEY_ID does not look like an R2 token id');
      }
      if (key === 'R2_SECRET_ACCESS_KEY' && v.length < 32) {
        wrong.push('R2_SECRET_ACCESS_KEY is too short to be an R2 secret');
      }
      if (key === 'EMAIL_FROM' && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(v)) {
        wrong.push('EMAIL_FROM is not an address');
      }
    }

    const ready = missing.length === 0 && wrong.length === 0;
    states.push({ subsystem, missing, wrong, ready });

    if (missing.length > 0) {
      findings.push({
        level: 'blocking',
        subsystem: subsystem.id,
        step: subsystem.step,
        stepTitle: subsystem.stepTitle,
        message: `${subsystem.name}: ${missing.join(', ')} missing. ${subsystem.dark}`,
      });
    }
    for (const w of wrong) {
      findings.push({
        level: 'blocking',
        subsystem: subsystem.id,
        step: subsystem.step,
        stepTitle: subsystem.stepTitle,
        message: `${w}. A value that looks configured and is not fails at the first use instead of here.`,
      });
    }
  }

  // This is optional for ordinary sign-in, but required by two server workflows.
  // Do not claim that a present key is authorized or that provider tests passed.
  if (!looks('SUPABASE_SERVICE_ROLE_KEY')) {
    findings.push({
      level: 'warning',
      subsystem: 'database',
      step: '1',
      stepTitle: 'The database',
      message: 'SUPABASE_SERVICE_ROLE_KEY is missing or a placeholder. Child-login creation, owner-reviewed identity removal, private safeguarding alerts and the payment webhook cannot use their server-side service client. Keep this key private; a configured value still needs provider testing.',
    });
  }

  // -------------------------------------------------------------------------
  // 2. The pair that is one value with two names.
  // -------------------------------------------------------------------------
  //
  // This is the defect of 2026-11-01 made into a check. The worker reads
  // SUPABASE_URL / SUPABASE_ANON_KEY and falls back to the NEXT_PUBLIC_ pair; if
  // somebody sets the bare names to a *different project*, the encoder encodes
  // into one database while the site serves from another, and no test can see it.
  const publicUrl = value(env, 'NEXT_PUBLIC_SUPABASE_URL');
  const bareUrl = value(env, 'SUPABASE_URL');
  if (publicUrl && bareUrl && publicUrl !== bareUrl) {
    findings.push({
      level: 'blocking',
      subsystem: 'worker-supabase',
      step: '6',
      stepTitle: 'The encoder',
      message:
        `SUPABASE_URL (${bareUrl}) is a different project from NEXT_PUBLIC_SUPABASE_URL (${publicUrl}). ` +
        'The worker would sign in to one database and the site would serve the other. Set one, or set both to the same value.',
    });
  }
  const publicAnon = value(env, 'NEXT_PUBLIC_SUPABASE_ANON_KEY');
  const bareAnon = value(env, 'SUPABASE_ANON_KEY');
  if (publicAnon && bareAnon && publicAnon !== bareAnon) {
    findings.push({
      level: 'blocking',
      subsystem: 'worker-supabase',
      step: '6',
      stepTitle: 'The encoder',
      message: 'SUPABASE_ANON_KEY and NEXT_PUBLIC_SUPABASE_ANON_KEY are different values for one project.',
    });
  }

  // -------------------------------------------------------------------------
  // 3. The leaks. Each of these is worth stopping a deployment over.
  // -------------------------------------------------------------------------
  for (const key of Object.keys(env)) {
    if (!key.startsWith('NEXT_PUBLIC_')) continue;
    if (/SERVICE_ROLE|SECRET|SECRET_KEY|API_KEY|PASSWORD|ACCESS_KEY/.test(key)) {
      findings.push({
        level: 'blocking',
        subsystem: 'database',
        step: '4.1',
        stepTitle: 'The environment',
        message:
          `${key} is prefixed NEXT_PUBLIC_, which ships it to every browser that loads the site. ` +
          'Rename it without the prefix and rotate the value: assume it is already public.',
      });
    }
  }

  const allowMissing = value(env, 'NEXT_PUBLIC_ALLOW_MISSING_SUPABASE');
  if (allowMissing === '1' && value(env, 'NEXT_PUBLIC_SUPABASE_URL') !== '') {
    findings.push({
      level: 'blocking',
      subsystem: 'database',
      step: '4.3',
      stepTitle: 'Supabase side of sign-in',
      message:
        'NEXT_PUBLIC_ALLOW_MISSING_SUPABASE=1 is a build-time escape hatch for CI. With a real project configured it makes the app ' +
        'run while pretending the database is optional, which turns a configuration mistake into a blank page.',
    });
  }

  // -------------------------------------------------------------------------
  // 4. Values that are right but point somewhere unintended.
  // -------------------------------------------------------------------------
  const appUrl = value(env, 'NEXT_PUBLIC_SITE_URL');
  if (appUrl && /localhost|127\.0\.0\.1/.test(appUrl)) {
    findings.push({
      level: 'warning',
      subsystem: 'database',
      step: '4.2',
      stepTitle: 'Deploy',
      message:
        'NEXT_PUBLIC_SITE_URL points at localhost. Every certificate prints it as the place to verify the number, so a printed ' +
        'certificate would send an employer to a machine that is not running.',
    });
  }

  const provider = value(env, 'PAYMENT_PROVIDER');
  if (provider !== '' && !['mtn_momo', 'airtel_money'].includes(provider)) {
    findings.push({
      level: 'blocking',
      subsystem: 'payments',
      step: '9',
      stepTitle: 'What is left, and is not a deployment task',
      message: `PAYMENT_PROVIDER is "${provider}", which is not a registered adapter (mtn_momo, airtel_money).`,
    });
  }

  // A bucket name is derived in SQL. A deployment that overrides it has to override
  // it in both places, and the example file says so — this is the check that makes
  // that sentence true.
  for (const [key, derived] of [
    ['R2_MASTERS_BUCKET', 'ayahspring-masters'],
    ['R2_RENDITIONS_BUCKET', 'ayahspring-renditions'],
  ] as const) {
    const v = value(env, key);
    if (v !== '' && v !== derived) {
      findings.push({
        level: 'warning',
        subsystem: 'media',
        step: '5',
        stepTitle: 'Media storage',
        message:
          `${key} is "${v}" but \`register_media_upload()\` derives "${derived}" for the r2 backend. ` +
          'If the bucket really is named differently, the database has to be changed too, or signed uploads point at a bucket that does not exist.',
      });
    }
  }

  // Email without a reply address is legal and worse: replies bounce.
  if (has('RESEND_API_KEY') && has('EMAIL_FROM') && !has('EMAIL_REPLY_TO')) {
    findings.push({
      level: 'warning',
      subsystem: 'email',
      step: '7',
      stepTitle: 'Email',
      message:
        'EMAIL_REPLY_TO is unset, so a person who replies to a receipt gets a bounce. Set it to an address somebody reads — ' +
        'privacy@ayahspring.com is the one the platform already publishes.',
    });
  }

  // A scheduler with no worker account can authenticate but not act: the database
  // only lets a privileged person claim or settle a message.
  if (has('CRON_SECRET') && !has('EMAIL_WORKER_EMAIL')) {
    findings.push({
      level: 'warning',
      subsystem: 'scheduler',
      step: '7.5',
      stepTitle: 'The unattended run',
      message:
        'CRON_SECRET is set but EMAIL_WORKER_EMAIL is not. The cron route will run and the database will refuse it, because claiming ' +
        'a message requires a staff session. Create the account and grant it a privileged role first.',
    });
  }

  // -------------------------------------------------------------------------
  // 5. The things that are deliberately not configured.
  // -------------------------------------------------------------------------
  //
  // Payments require no variable, because there is no honest way to configure
  // them until a merchant account exists — and a preflight that stayed silent
  // would read as "payments are fine". The other subsystems with no requirement
  // are left alone deliberately: the worker pair falls back to the NEXT_PUBLIC_
  // values, and saying so on every run would be noise.
  const paymentCredentials = [
    'MTN_MOMO_SUBSCRIPTION_KEY',
    'MTN_MOMO_API_KEY',
    'AIRTEL_CLIENT_ID',
    'AIRTEL_CLIENT_SECRET',
  ];
  if (paymentCredentials.every((key) => !has(key))) {
    findings.push({
      level: 'note',
      subsystem: 'payments',
      step: '9',
      stepTitle: 'What is left, and is not a deployment task',
      message:
        'No payment provider is configured, which is the correct state until a merchant account exists. ' +
        'Checkout says so rather than pretending; nothing else on this list is waiting for it.',
    });
  }

  const blockingCount = findings.filter((f) => f.level === 'blocking').length;
  const warningCount = findings.filter((f) => f.level === 'warning').length;

  return {
    states,
    findings,
    blockingCount,
    warningCount,
    // A subsystem with no requirement is not "ready" — it is simply not a thing
    // that can be configured yet, and its note says so. Counting it as ready made
    // the summary say "Payments ✓" beside a note saying payments are not set up.
    ready: states.filter((s) => s.ready && s.subsystem.requires.length > 0).map((s) => s.subsystem.name),
    dark: states.filter((s) => !s.ready).map((s) => s.subsystem.name),
  };
}

/** The one-line verdict, printed above the details. */
export function preflightVerdict(preflight: Preflight): string {
  const blocking = preflight.blockingCount;
  const warnings = preflight.warningCount;
  if (blocking === 0 && warnings === 0) {
    return 'Nothing is missing. Every subsystem this can see is configured, and the remaining work is the smoke test in step 4.4.';
  }
  if (blocking === 0) {
    return `Nothing stops a deployment. ${warnings} thing${warnings === 1 ? '' : 's'} will bite later — each is listed with the step that fixes it.`;
  }
  return `${blocking} thing${blocking === 1 ? '' : 's'} must be fixed before anybody can use this deployment` +
    (warnings > 0 ? `, and ${warnings} more will bite later.` : '.');
}

/**
 * What to do next, in the order the runbook does it.
 *
 * A list of missing variables is a checklist; a list of *steps* is a plan. Two
 * findings in the same step collapse into one line, because the person fixing
 * them is doing one thing.
 */
export function nextSteps(
  preflight: Preflight,
): Array<{ step: string; title: string; label: string; messages: string[] }> {
  const grouped = new Map<string, { title: string; messages: string[] }>();
  for (const finding of preflight.findings) {
    if (finding.level === 'note') continue;
    const entry = grouped.get(finding.step) ?? { title: finding.stepTitle, messages: [] };
    entry.messages.push(finding.message);
    grouped.set(finding.step, entry);
  }
  // Sorted by the number a reader would follow: 1 before 4 before 7.5 before 9.
  const asNumber = (step: string) => Number.parseFloat(step);
  return [...grouped.entries()]
    .map(([step, entry]) => ({
      step,
      title: entry.title,
      label: stepLabel(step, entry.title),
      messages: entry.messages,
    }))
    .sort((a, b) => asNumber(a.step) - asNumber(b.step));
}
