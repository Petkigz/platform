#!/usr/bin/env node
// What this deployment is still missing, said as runbook steps.
//
//   npm run preflight                        # reads web/.env.local
//   npm run preflight -- --env path/to/.env  # reads a file
//   npm run preflight -- --json              # for a script
//
// Why this exists: `docs/deploy/README.md` step 6.3 told an operator to export
// NEXT_PUBLIC_SUPABASE_URL and the transcode worker exited asking for
// SUPABASE_URL — a message about a variable the runbook never named, concerning a
// value that was correct. Nothing could see it: the app builds with no
// environment, the suites inject their own, and `check:repo` compares the example
// file to the runbook rather than either of them to what a process reads.
//
// The rules live in `web/src/lib/preflight.ts` where they are tested. This file
// only finds a file, prints, and chooses an exit code. It never touches the
// network: a checker that needs credentials to tell you about your credentials is
// useless in the moment it is needed.

import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  nextSteps,
  preflightVerdict,
  readEnvFile,
  runPreflight,
  stepLabel,
  type Preflight,
} from '../web/src/lib/preflight.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const ROOT = join(HERE, '..');

const args = process.argv.slice(2);
const flag = (name: string) => args.includes(name);
const value = (name: string) => {
  const index = args.indexOf(name);
  return index >= 0 ? args[index + 1] : undefined;
};

const requested = value('--env');
const candidates = requested
  ? [resolve(requested)]
  : [
      join(ROOT, 'web', '.env.local'),
      join(ROOT, 'web', '.env'),
      join(ROOT, '.env.local'),
      join(ROOT, '.env'),
    ];

const found = candidates.find((path) => existsSync(path));
const isExample = found === undefined;

// No file at all is itself a finding, and the example is the only thing left that
// can be read — so read it and say loudly which one was read.
const path = found ?? join(ROOT, 'web', '.env.example');
const env = readEnvFile(readFileSync(path, 'utf8'));
const result: Preflight = runPreflight(env);

if (flag('--json')) {
  process.stdout.write(
    `${JSON.stringify(
      {
        file: path,
        usingExample: isExample,
        verdict: preflightVerdict(result),
        blocking: result.blockingCount,
        warnings: result.warningCount,
        ready: result.ready,
        dark: result.dark,
        findings: result.findings,
        nextSteps: nextSteps(result),
      },
      null,
      2,
    )}\n`,
  );
  process.exit(result.blockingCount > 0 ? 1 : 0);
}

const rule = (title: string) => {
  process.stdout.write(`\n${title}\n${'-'.repeat(title.length)}\n`);
};

process.stdout.write(
  isExample
    ? '\nReading web/.env.example — no .env.local was found, so nothing below is a real value.\n' +
        'Copy it first:  cp web/.env.example web/.env.local\n'
    : `\nReading ${path.replace(`${ROOT}/`, '')}\n`,
);
if (requested && !existsSync(requested)) {
  process.stdout.write(`There is no file at ${requested}; reading the example instead.\n`);
}

process.stdout.write(`\n${preflightVerdict(result)}\n`);

rule('Ready');
if (result.ready.length === 0) process.stdout.write('  Nothing yet.\n');
for (const name of result.ready) process.stdout.write(`  ✓ ${name}\n`);

if (result.dark.length > 0) {
  rule('Dark');
  for (const subsystem of result.states.filter((s) => !s.ready)) {
    const why = [
      ...subsystem.missing,
      ...subsystem.wrong.map((w) => w.split('.')[0] ?? w),
    ].join(', ');
    process.stdout.write(`  · ${subsystem.subsystem.name} — ${why}\n`);
  }
}

const steps = nextSteps(result);
if (steps.length > 0) {
  rule('Fix, in the runbook’s order');
  for (const step of steps) {
    // The step label is already numbered ("6. The encoder"), so this list is not
    // — a second number reads as a step number that disagrees with the runbook.
    process.stdout.write(`\n  → ${stepLabel(step.step, step.title)}\n`);
    for (const message of step.messages) process.stdout.write(`     ${message}\n`);
  }
}

const notes = result.findings.filter((f) => f.level === 'note');
if (notes.length > 0) {
  rule('Not expected to be configured yet');
  for (const note of notes) process.stdout.write(`  · ${note.message}\n`);
}

process.stdout.write(
  '\nA preflight reads values; it cannot prove they work. The smoke test in step 4.4 is the part\n' +
    'that signs in, and step 5.5 is the part that sends a byte to storage.\n',
);

process.exit(result.blockingCount > 0 ? 1 : 0);
