import assert from 'node:assert/strict';
import test from 'node:test';

import { en } from './i18n/messages/en.ts';
import { LOCALES } from './i18n/locales.ts';
import {
  AUDIT_LIMITS,
  auditAll,
  auditHeadline,
  auditLine,
  auditLocale,
  auditProposal,
  placeholdersIn,
  summarise,
} from './translation-audit.ts';

// The audit is the shortlist a volunteer is handed before they spend ten minutes
// on somebody else's words. What matters about it here is not that it finds
// things, but that it finds the right things and never claims to know whether a
// translation is *good* — so most of these tests are about the false alarms it is
// built not to raise.

test('every placeholder in a line is found, and nothing else is', () => {
  assert.deepEqual(placeholdersIn('© {year} AyahSpring'), ['year']);
  assert.deepEqual(placeholdersIn('{count} of {total}'), ['count', 'total']);
  assert.deepEqual(placeholdersIn('no numbers here'), []);
  // Not a placeholder: a brace that is not a name.
  assert.deepEqual(placeholdersIn('a {sentence} and { }'), ['sentence']);
});

test('a dropped placeholder is the first thing found, because the page would break', () => {
  const found = auditLine('ta', 'card.lessonsOne', 'பாடம்', '{count} lesson');
  assert.equal(found[0]?.kind, 'placeholder');
  assert.deepEqual(found[0]?.detail, ['count']);
});

test('a line identical to the English is a finding, and a brand is not', () => {
  // French says "Catalogue" for the catalogue, and it is right — the finding is
  // still raised, because "right" is the owner's call and not the machine's.
  assert.equal(
    auditLine('fr', 'nav.catalogue', 'Catalogue', en['nav.catalogue'])[0]?.kind,
    'same-as-english',
  );

  // `© {year} AyahSpring` is the same string in all fifty-one catalogues and
  // correct in all fifty-one: a copyright line with a brand in it is not
  // translatable.
  assert.deepEqual(
    auditLine('ta', 'footer.rights', '© {year} AyahSpring', en['footer.rights']),
    [],
  );
  // And a line that is only a numeral or a placeholder says nothing to translate.
  assert.deepEqual(auditLine('ta', 'card.minutes', '{count} min', '{count} min'), []);
});

test('a Latin word inside a language that does not use Latin letters is flagged', () => {
  // The real one, in `asia-my.ts`: the Burmese sentence for "a reset link is on
  // its way" contains the English word spam. Either it is deliberate — Burmese
  // does write it that way in some registers — or it was left untranslated, and
  // that is a question for a Burmese speaker, not for this file.
  const found = auditLine('my', 'auth.resetSent', 'စကားဝှက် spam ပို့ပြီး', 'x');
  assert.equal(found[0]?.kind, 'latin-word');
  assert.deepEqual(found[0]?.detail, ['spam']);

  // The brands are deliberately untranslated, and must never be findings:
  // otherwise every catalogue raises the same three alarms and the panel is
  // noise the owner learns to ignore.
  for (const brand of ['AyahSpring', 'Google', 'Supabase', 'SMS', 'WhatsApp']) {
    const line = `စကားဝှက် ${brand} ပို့ပြီး`;
    assert.deepEqual(auditLine('my', 'auth.resetSent', line, 'x'), [], `${brand} was flagged`);
  }
  // A Latin-script language is not asked the question at all: French writing
  // "spam" is French, and flagging it would be flagging the alphabet.
  assert.deepEqual(auditLine('fr', 'auth.resetSent', 'Un mot spam ici', 'x'), []);
});

test('a character from a script the language does not use is named', () => {
  const found = auditLine('ta', 'nav.main', 'Мукьяச்', 'Main');
  assert.ok(found.some((f) => f.kind === 'foreign-script'), 'Cyrillic passed through a Tamil line');
  const detail = found.find((f) => f.kind === 'foreign-script')?.detail.join('') ?? '';
  assert.ok(detail.includes('М'), 'the character itself was not named');

  // A tatweel is typography, not a word, and a zero-width joiner is invisible.
  const arabic = 'إن كان هناك حساب لـ{phone}، فالرمز في طريقه إليك.';
  assert.deepEqual(
    auditLine('ar', 'auth.codeSent', arabic, 'x').filter((f) => f.kind === 'foreign-script'),
    [],
  );
});

test('a blank line is reported as blank and nothing else', () => {
  const found = auditLocale('ta', { 'nav.main': '   ' }).filter((f) => f.key === 'nav.main');
  assert.deepEqual(found, [{ key: 'nav.main', kind: 'blank', detail: [] }]);
});

test('a key with no translation is missing, not silent', () => {
  // `messagesFor()` fills the gap with English at render time, which is right for
  // a reader and useless for an audit: a merged catalogue can never answer
  // "what is missing?".
  const missing = auditLocale('ta', {}).filter((f) => f.kind === 'missing');
  assert.equal(missing.length, Object.keys(en).length);
  assert.deepEqual(auditLocale('ta', {}).slice(0, 1), [
    { key: 'skip.toContent', kind: 'missing', detail: [] },
  ]);
});

test('a proposed correction is asked the same questions as the catalogue', () => {
  // A reviewer who pastes the English back is not correcting anything, and the
  // owner should see that before accepting it.
  const found = auditProposal({
    locale: 'fr',
    key: 'nav.catalogue',
    proposed: 'Catalogue',
    english: en['nav.catalogue'],
  });
  assert.equal(found[0]?.kind, 'same-as-english');

  // And a correction that drops a placeholder is caught before it is stored.
  assert.equal(
    auditProposal({
      locale: 'ta',
      key: 'card.lessonsOne',
      proposed: 'பாடம்',
      english: en['card.lessonsOne'],
    }).find((f) => f.kind === 'placeholder')?.kind,
    'placeholder',
  );
});

test('the panel puts the broken lines before the merely odd ones', () => {
  const summary = summarise('ta', 'Tamil', [
    { key: 'nav.main', kind: 'same-as-english', detail: [] },
    { key: 'card.lessonsOne', kind: 'placeholder', detail: ['count'] },
  ]);
  assert.deepEqual(
    summary.findings.map((f) => f.kind),
    ['placeholder', 'same-as-english'],
  );
  assert.equal(summary.counts.placeholder, 1);
  assert.equal(summary.counts.blank, 0);
});

test('the audit over the real register is small, and says so', () => {
  const names: Record<string, string> = {};
  for (const locale of LOCALES) names[locale.code] = locale.englishName;

  const summaries = auditAll(names);
  const totals: Record<string, number> = {};
  for (const summary of summaries) {
    for (const [kind, count] of Object.entries(summary.counts)) {
      totals[kind] = (totals[kind] ?? 0) + count;
    }
  }

  // Nothing in the shipped catalogues is structurally broken: fifty-one
  // catalogues were written through a test that fails on a dropped placeholder,
  // and this asserts the thing that test was protecting is still true.
  assert.equal(totals['placeholder'] ?? 0, 0, 'a catalogue drops a placeholder');
  assert.equal(totals['blank'] ?? 0, 0, 'a catalogue has a blank line');
  assert.equal(totals['missing'] ?? 0, 0, 'a catalogue is short a key');

  // The residue is small enough for one person to read, which is the entire
  // point of the panel. If it ever grows past this, the shortlist has stopped
  // being a shortlist and the check has become noise.
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);
  assert.ok(total > 0, 'the audit found nothing at all, which means it is not running');
  assert.ok(total < 200, `the audit found ${total} things, which is a wall and not a shortlist`);

  // And it never claims more than it can see.
  assert.equal(AUDIT_LIMITS.length >= 5, true);
  assert.ok(auditHeadline(summaries).includes('speaker'), 'the panel does not hand the question on');
});

test('the audit is quiet about English', () => {
  // English is the yardstick, not a translation of it. Auditing it would raise
  // "identical to English" on every line of every key.
  const summaries = auditAll({});
  assert.ok(!summaries.some((summary) => summary.locale === 'en'), 'English was audited');
  // And a catalogue with nothing in it is reported as missing, never as fine.
  const findings = auditLocale('ta', {});
  assert.equal(findings.every((f) => f.kind === 'missing'), true);
});

// ---------------------------------------------------------------------------
// Where the shortlist appears
// ---------------------------------------------------------------------------
// The audit is worth nothing if it lives in a module nobody opens. These are the
// wiring assertions: the panel exists on the owner's page, the sheet nudges the
// reviewer, and the queue shows what the machine noticed about a proposal.

import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const read = (path: string) => readFileSync(join(here, '..', path), 'utf8');

test('the owner has a panel, and it says what it cannot see', () => {
  const page = read('app/admin/translations/page.tsx');
  assert.match(page, /auditAll\(names\)/u);
  assert.match(page, /<AuditPanel summaries=\{audit\} \/>/u);

  const panel = read('app/admin/translations/audit-panel.tsx');
  // The limits are printed from the module, not retyped: a limitation that lives
  // in two places is a limitation that drifts.
  assert.match(panel, /AUDIT_LIMITS\.map/u);
  assert.match(panel, /does not check/u);
  // And each finding on a real line can be opened on the sheet for that part, in
  // that language — otherwise the shortlist is a list of things to do nothing
  // about.
  assert.match(panel, /\/contribute\?locale=\$\{locale\}&section=\$\{section\.prefix\}/u);
});

test('the queue shows what the machine noticed about a proposed line', () => {
  const page = read('app/admin/translations/page.tsx');
  assert.match(page, /auditProposal\(\{/u);
  assert.match(page, /flags=\{flags\}/u);
  const console_ = read('app/admin/translations/translation-console.tsx');
  assert.match(console_, /A machine noticed:/u);
  // A flag is not a refusal: the buttons are still there, and the owner decides.
  assert.ok(!/disabled=\{[^}]*flags\[/.test(console_), 'the audit is being enforced as a rule');
});

test('the sheet nudges the reviewer about the two kinds they can act on', () => {
  const page = read('app/contribute/page.tsx');
  assert.match(page, /auditLine\(target\.code, key/u);
  assert.match(page, /f\.kind === 'same-as-english' \|\| f\.kind === 'latin-word'/u);
  // Phrased as a question, because that is what it is: "Asia" is Asia in Luganda.
  assert.match(page, /That is often right/u);
  assert.match(page, /Right if that is how you write it/u);
});
