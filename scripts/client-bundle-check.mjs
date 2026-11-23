#!/usr/bin/env node
// What the production build sends to a browser, read after `next build`.
//
// `web/src/lib/client-bundle.test.ts` follows imports and says no client
// component can reach the catalogues. This reads the output and says none did:
// the import rule is a prediction about a bundler, and this is the bundler's
// answer. It takes one sentence from each of several languages out of the
// catalogue source and looks for it in every file under `.next/static`.
//
// Before 2026-11-17 every page loaded a 1.43 MB chunk (375 kB compressed)
// holding all fifty-one languages, because the provider in the root layout
// imported one small function from the file that imports them all.
//
//   node scripts/client-bundle-check.mjs            after a build in web/
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { gzipSync } from 'node:zlib';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const statics = join(root, 'web', '.next', 'static');
const messages = join(root, 'web', 'src', 'lib', 'i18n', 'messages');

function fail(message) {
  console.error(`::error title=Client bundle::${message}`);
  process.exit(1);
}

if (!existsSync(statics)) fail('web/.next/static does not exist; run the production build first.');

// Sentences to look for: every quoted value of a few keys, in every language
// that has one, from the files themselves, so the list cannot go stale.
const needles = new Set();
for (const [file, key] of [
  ['lesson.ts', 'lesson.backToCourse'],
  ['learn.ts', 'learn.title'],
  ['course.ts', 'course.back'],
  ['assign.ts', 'assign.reviseExplain'],
  // The files part of the assignment page is a client component that is
  // handed its words; the sentence a learner reads when an upload's outcome
  // is unknown must not be in any script either.
  ['assign.ts', 'assign.fileErrUncertain'],
  ['assess.ts', 'assess.heading'],
  // The players are client components that ask for their sentences; the
  // lesson page hands those over in the page itself. The notice a learner
  // agrees to must be in the one page that shows it and in no script.
  ['player.ts', 'player.recoveryNotice'],
  // The discussion is a client component handed its words by the lesson
  // page. The sentence for a post nobody can confirm must be in that page
  // and in no script.
  ['lesson.ts', 'lesson.discussionUncertain'],
  // The profile form on the account page is a client component handed its
  // words. What the account page promises about closing an account, and what
  // the form says when a save fails, must be in that page and in no script.
  ['account.ts', 'account.closeBody'],
  ['account.ts', 'account.formFailed'],
  // The three forms on the family page are client components handed their
  // words, with no English of their own. What a reader is told about leaving
  // a family, and about a child nobody can confirm was added, must be in
  // that page and in no script.
  ['family.ts', 'family.leaveNote'],
  ['family.ts', 'family.childUnconfirmed'],
  // The buy form is a client component handed its words: a sentence for each
  // of thirty-one reasons, and it has no English of its own. What a buyer is
  // told when nobody can say whether an order exists, and when checkout is
  // closed, must be in that page and in no script.
  ['buy.ts', 'buy.unconfirmed'],
  ['buy.ts', 'buy.closedBody'],
  // The form that closes an account is a client component handed its words.
  // What a reader is told when nobody can say whether the account closed,
  // and what the page says can remain afterwards, must be in that page and
  // in no script.
  ['close.ts', 'close.unconfirmed'],
  ['close.ts', 'close.goesAnswers'],
  // The link that downloads a copy of your data is a client component handed
  // its words. What a reader is told at the eleventh copy in an hour, and
  // what the page says the copy leaves out, must be in that page and in no
  // script.
  ['export.ts', 'export.limit'],
  ['export.ts', 'export.outTokensNote'],
  // The three reading settings are a client component handed its words; the
  // file it shares with the server used to carry the name of every choice in
  // English. What a reader is told when the browser keeps nothing, and what
  // the page says nobody has tested, must be in that page and in no script.
  ['reading.ts', 'reading.notKept'],
  ['reading.ts', 'reading.noSpeechNote'],
  // The form that puts a copy back is a client component handed its words.
  // What a reader is told when nobody can say whether the file was put back,
  // and what the page says no file ever puts back, must be in that page and
  // in no script.
  ['restore.ts', 'restore.unconfirmed'],
  ['restore.ts', 'restore.cannotCertNote'],
  // The phone number card is a client component handed its words. What a
  // reader is told when a change got no answer, and the sentence about who
  // may read the number, must be in the account page and in no script.
  ['phone.ts', 'phone.unconfirmed'],
  ['phone.ts', 'phone.lede'],
  // The merge panel is a client component handed its words. What a reader
  // is told when a merge got no answer, and what is deleted by one, must be
  // in the merge page and in no script.
  ['merge.ts', 'merge.unconfirmed'],
  ['merge.ts', 'merge.whatGoes'],
  // The sharing panel and the button that accepts an invitation are client
  // components handed their words. What a reader is told about an address
  // being answered the same way, and that an invitation was sent elsewhere,
  // must be in those two pages and in no script.
  ['share.ts', 'share.sameAnswer'],
  ['share.ts', 'share.acErrOther'],
  // The two copy buttons on the invitation page are a client component
  // handed five sentences. What a reader is told about nothing being paid
  // out, and that only a first name is shown, must be in that page and in
  // no script.
  ['refer.ts', 'refer.honesty'],
  ['refer.ts', 'refer.onlyFirstName'],
  // The page of sponsored seats has no script of its own. What it says
  // about zakat, and that it collects no payment, must be in that page and
  // in no script.
  ['sponsor.ts', 'sponsor.zakat'],
  ['sponsor.ts', 'sponsor.nextPledged'],
  // The pay page has a form, which is a script. What the form says is handed
  // to it by the page, in the reader's language; it is in no script.
  ['sponsor.ts', 'sponsor.payApprove'],
  ['sponsor.ts', 'sponsor.payNot'],
  // The pool and the asking page each have a form. Their words are handed to
  // them by the page too.
  ['sponsor.ts', 'sponsor.plWhyGone'],
  ['sponsor.ts', 'sponsor.rqDone'],
  ['sponsor.ts', 'sponsor.plPayBody'],
  // My orders has two forms, both handed their words by the page. That a
  // request is not a refund, that orders could not be read, and why a code
  // cannot be changed must be in that page and in no script.
  ['orders.ts', 'orders.rfSent'],
  ['orders.ts', 'orders.unread'],
  ['orders.ts', 'orders.pmWhyPaid'],
  // What you have paid has no script of its own. That asking is not a
  // refund, that a statement could not be read, and whose record this is
  // must be in that page and in nothing a browser downloads.
  ['billing.ts', 'billing.askNote'],
  ['billing.ts', 'billing.unread'],
  ['billing.ts', 'billing.recBody'],
  // The receipt is a server page with one island, a button that is handed
  // its label. What it says about an order that is not a receipt, one that
  // could not be read, and what the document is must be in that page and in
  // nothing a browser downloads.
  ['receipt.ts', 'receipt.notBody'],
  ['receipt.ts', 'receipt.unread'],
  ['receipt.ts', 'receipt.record'],
  // The notification centre is a server page with two islands, each handed
  // the words it says. What the page says about where a message goes, about
  // a centre it could not read, and what an island says when no answer came
  // back must be in nothing a browser downloads.
  ['notify.ts', 'notify.lead'],
  ['notify.ts', 'notify.unread'],
  ['notify.ts', 'notify.prefUnsure'],
]) {
  const path = join(messages, file);
  if (!existsSync(path)) fail(`${relative(root, path)} is missing; this check reads its sentences from it.`);
  const source = readFileSync(path, 'utf8');
  const pattern = new RegExp(`'${key.replace('.', '\\.')}':\\s*'((?:[^'\\\\]|\\\\.)+)'`, 'gu');
  for (const match of source.matchAll(pattern)) {
    // Only sentences no English page would contain by coincidence.
    if (/[^\u0000-\u007f]/u.test(match[1]) && match[1].length >= 6) needles.add(match[1]);
  }
}
if (needles.size < 20) fail(`only ${needles.size} sentences were found to look for; the check would prove nothing.`);

function files(dir, out = []) {
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    if (statSync(path).isDirectory()) files(path, out);
    else out.push(path);
  }
  return out;
}

const all = files(statics);
const scripts = all.filter((path) => path.endsWith('.js'));
if (scripts.length < 10) fail(`only ${scripts.length} scripts under web/.next/static; is this a production build?`);

// A bundler may write a non-ASCII character as an escape. Look for both.
const escaped = (text) => [...text].map((ch) => (ch.charCodeAt(0) > 127 ? `\\u${ch.charCodeAt(0).toString(16).padStart(4, '0')}` : ch)).join('');

const offenders = [];
let bytes = 0;
let compressed = 0;
let largest = { path: '', bytes: 0 };
for (const path of scripts) {
  const buffer = readFileSync(path);
  bytes += buffer.length;
  compressed += gzipSync(buffer).length;
  if (buffer.length > largest.bytes) largest = { path, bytes: buffer.length };
  const text = buffer.toString('utf8');
  const lower = text.toLowerCase();
  const found = [...needles].filter((needle) => text.includes(needle) || lower.includes(escaped(needle).toLowerCase()));
  if (found.length > 0) offenders.push(`${relative(root, path)} (${buffer.length} bytes) holds ${found.length} of ${needles.size} catalogue sentences`);
}

const kb = (n) => `${Math.round(n / 1024)} kB`;
const summary =
  `${scripts.length} scripts, ${kb(bytes)} (${kb(compressed)} compressed one by one); ` +
  `largest ${relative(statics, largest.path)} at ${kb(largest.bytes)}; looked for ${needles.size} sentences`;

if (offenders.length > 0) {
  fail(`A script the browser downloads contains the translation catalogues. ${offenders.join('; ')}. ${summary}. ` +
    'Find the client component that imports them: node --experimental-strip-types --test web/src/lib/client-bundle.test.ts');
}

// One script that large is the shape the catalogues had. Not a budget for the
// site, a tripwire for the same mistake with different contents.
const LIMIT = 700 * 1024;
if (largest.bytes > LIMIT) {
  fail(`${relative(root, largest.path)} is ${kb(largest.bytes)}, above the ${kb(LIMIT)} tripwire. ${summary}.`);
}

console.log(`::notice title=Client bundle::No catalogue sentence in any script. ${summary}.`);
