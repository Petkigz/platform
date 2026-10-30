/**
 * What a machine can see in a translation, and what it cannot.
 *
 * Fifty-one catalogues, nine thousand six hundred strings, and not one of them
 * has been read by a person who speaks the language. The honest answer to "is
 * this right?" is *ask somebody*, and the correction sheet is how. This module
 * is the other half of that sentence: it narrows the question from
 * **nine thousand six hundred** to the handful of lines where something is
 * mechanically odd, so a volunteer's ten minutes go where they are needed.
 *
 * **It never says a line is correct.** It cannot: correctness is meaning, and a
 * machine that has no idea what a sentence means cannot tell a good translation
 * from a fluent wrong one. What it can do is notice things a person would
 * notice instantly and a script cannot:
 *
 *   `same-as-english`  the "translation" is the English line, byte for byte
 *   `latin-word`       a word in Latin letters inside a language that does not
 *                      use them — an untranslated word, or a brand name, and the
 *                      owner is the one who knows which
 *   `foreign-script`   a character from a script this language does not write in
 *   `placeholder`      `{count}` was dropped or invented, so the page would
 *                      print a sentence missing its number
 *   `blank`            an empty or whitespace-only line
 *   `missing`          a key with no translation at all, silently English
 *
 * Every one of those is a fact about the text, not a judgement about the
 * language. `AUDIT_LIMITS` below is the list of what it does not check, and it
 * is printed on the page beside the findings rather than left to be assumed.
 *
 * Two things this is careful about, because a false alarm in a queue only one
 * person reads is expensive:
 *
 *   * **Brands and loanwords are not findings.** `AyahSpring`, `Google`,
 *     `Supabase` and `SMS` are deliberately untranslated, and a Tamil sentence
 *     that says "Supabase" is correct. The allowlist is short and explicit.
 *   * **A line that is the same as English is not always wrong.** "Asia" is
 *     `Asia` in Luganda, and `{count} min` is how a minute is written in most of
 *     Europe. The finding says *identical*, and the panel says the rest is the
 *     reader's call.
 */

import { en } from './i18n/messages/en.ts';
import { CATALOGUES } from './i18n/messages/catalogues.ts';

export type FindingKind =
  | 'same-as-english'
  | 'latin-word'
  | 'foreign-script'
  | 'placeholder'
  | 'blank'
  | 'missing';

export type Finding = {
  key: string;
  kind: FindingKind;
  /** The words or characters that made it a finding, for the sentence beside it. */
  detail: string[];
};

/**
 * What the audit does not do, in the words the page prints.
 *
 * Kept here rather than in the page so that a test can prove the page says it:
 * a limitation that lives only in a comment is a limitation nobody is told
 * about.
 */
export const AUDIT_LIMITS: readonly string[] = [
  'Whether the words are right. That is meaning, and no script can see meaning.',
  'Whether the register is right — formal, familiar, respectful.',
  'Whether a plural, a gender or a case agrees with its sentence.',
  'Whether the sentence reads naturally, or like something a machine wrote.',
  'Anything at all about a language whose script it can only partly recognise.',
];

/**
 * The script each catalogue is written in.
 *
 * Only the ones that are not Latin are listed: Latin is the default, and the
 * check tolerates Latin inside every other script because a brand name and a
 * loanword are ordinary there. That tolerance is why `latin-word` exists as a
 * separate check with an allowlist — the loose rule and the strict rule are
 * doing two different jobs.
 */
const SCRIPTS: Record<string, string[]> = {
  ar: ['Arabic'],
  ur: ['Arabic'],
  fa: ['Arabic'],
  'fa-af': ['Arabic'],
  ps: ['Arabic'],
  dv: ['Thaana'],
  am: ['Ethiopic'],
  ti: ['Ethiopic'],
  bn: ['Bengali'],
  hi: ['Devanagari'],
  ne: ['Devanagari'],
  kk: ['Cyrillic'],
  ky: ['Cyrillic'],
  tg: ['Cyrillic'],
  ta: ['Tamil'],
  si: ['Sinhala'],
  th: ['Thai'],
  my: ['Myanmar'],
  'zh-hans': ['Han'],
  'zh-hant': ['Han'],
};

/**
 * Deliberately untranslated words.
 *
 * Short on purpose. Every entry is a decision that this word stays as it is in
 * every language — a brand, a product name, a protocol — and adding one to make
 * a finding go away is how an allowlist stops meaning anything.
 */
const BRANDS: readonly string[] = [
  'AyahSpring',
  'Google',
  'Supabase',
  'SMS',
  'WhatsApp',
  'PDF',
  'iOS',
  'Android',
  'Email',
  'email',
  'Auth',
];

const BRAND_SET = new Set(BRANDS.map((word) => word.toLowerCase()));

/** Characters that join or format rather than say something: never findings. */
const INVISIBLE = /[\u0640\u200c\u200d\u00ad\ufeff]/gu;

const scriptOf = (name: string) => new RegExp(`\\p{Script=${name}}`, 'u');
const isLetter = /\p{L}/u;

/** `{count}`, `{year}` — the placeholders the catalogue fills at render time. */
export function placeholdersIn(value: string): string[] {
  return [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)].map((match) => match[1] ?? '');
}

/** The words in a line that are Latin letters and are not on the allowlist. */
function latinWords(value: string): string[] {
  const body = value.replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, ' ');
  const runs = body.match(/\p{Script=Latin}{4,}/gu) ?? [];
  return [...new Set(runs)].filter((word) => !BRAND_SET.has(word.toLowerCase()));
}

/**
 * Characters from a script the language does not use.
 *
 * Latin is tolerated everywhere, and so are the joining characters: the first
 * because `Supabase` in a Sinhala sentence is correct, the second because a
 * tatweel in Arabic is typography rather than a word. What is left is a genuine
 * mixture — Cyrillic in a Tamil line, Arabic in a Han line — which is nearly
 * always a paste from the wrong file.
 */
function foreignCharacters(value: string, scripts: string[]): string[] {
  const expected = scripts.map(scriptOf);
  const latin = scriptOf('Latin');
  const odd = new Set<string>();
  for (const character of value.replace(INVISIBLE, '')) {
    if (!isLetter.test(character)) continue;
    if (latin.test(character)) continue;
    if (expected.some((test) => test.test(character))) continue;
    odd.add(character);
  }
  return [...odd];
}

/**
 * Whether a line says anything at all once placeholders and brands are gone.
 *
 * A word of four letters or more, not a letter count. `{count} min` is the same
 * string in seven catalogues and right in all seven — an abbreviation of a unit
 * is not a sentence left untranslated — where `Asia`, `Pages` and `Beginner` are
 * words somebody could reasonably have translated. Three letters is the line
 * between those two cases, and it is drawn deliberately.
 */
function hasWords(value: string): boolean {
  const body = value
    .replace(/\{[a-zA-Z][a-zA-Z0-9]*\}/g, ' ')
    .replace(/\p{Script=Latin}{2,}/gu, (word) => (BRAND_SET.has(word.toLowerCase()) ? ' ' : word));
  return /\p{L}{4,}/u.test(body);
}

/** The checks that apply to one line of one language, with the English beside it. */
export function auditLine(
  locale: string,
  key: string,
  value: string,
  english: string,
): Finding[] {
  const findings: Finding[] = [];

  if (value.trim().length === 0) {
    findings.push({ key, kind: 'blank', detail: [] });
    return findings;
  }

  // Placeholders, first, because a line that lost one is broken whatever else is
  // wrong with it.
  const wanted = placeholdersIn(english).sort().join(',');
  const got = placeholdersIn(value).sort().join(',');
  if (wanted !== got) {
    findings.push({
      key,
      kind: 'placeholder',
      detail: [...new Set([...wanted.split(','), ...got.split(',')].filter(Boolean))],
    });
  }

  // The same words as the English. Excluded when the line is only a brand, a
  // placeholder or a numeral — `© {year} AyahSpring` is identical in all
  // fifty-one catalogues and correct in all fifty-one.
  if (value.trim() === english.trim() && hasWords(english)) {
    findings.push({ key, kind: 'same-as-english', detail: [] });
  }

  const scripts = SCRIPTS[locale];
  if (scripts) {
    const words = latinWords(value);
    // Only meaningful where Latin is the exception rather than the alphabet.
    if (words.length > 0) findings.push({ key, kind: 'latin-word', detail: words });
    const odd = foreignCharacters(value, scripts);
    if (odd.length > 0) findings.push({ key, kind: 'foreign-script', detail: odd });
  }

  return findings;
}

/**
 * Everything the machine can see in one catalogue.
 *
 * `catalogue` is the language's own entries, *not* merged with English: a key
 * that is absent has to be reported as absent. `messagesFor()` fills the gap at
 * render time, which is the right behaviour for a reader and the wrong one for
 * an audit — a merged catalogue can never answer "what is missing?".
 */
export function auditLocale(
  locale: string,
  catalogue: Partial<Record<string, string>> = {},
): Finding[] {
  const findings: Finding[] = [];
  for (const key of Object.keys(en)) {
    const english = (en as Record<string, string>)[key] ?? '';
    const value = catalogue[key];
    if (typeof value !== 'string') {
      findings.push({ key, kind: 'missing', detail: [] });
      continue;
    }
    findings.push(...auditLine(locale, key, value, english));
  }
  return findings;
}

/** The same checks, run over a correction on its way to the owner's queue. */
export function auditProposal(input: {
  locale: string;
  key: string;
  proposed: string;
  english: string;
}): Finding[] {
  return auditLine(input.locale, input.key, input.proposed, input.english);
}

export type AuditSummary = {
  locale: string;
  englishName: string;
  total: number;
  counts: Record<FindingKind, number>;
  findings: Finding[];
};

const EMPTY_COUNTS: Record<FindingKind, number> = {
  'same-as-english': 0,
  'latin-word': 0,
  'foreign-script': 0,
  placeholder: 0,
  blank: 0,
  missing: 0,
};

/** One language's findings, counted by kind and worst first. */
export function summarise(locale: string, englishName: string, findings: Finding[]): AuditSummary {
  const counts = { ...EMPTY_COUNTS };
  for (const finding of findings) counts[finding.kind] += 1;

  // Broken first, then odd, then the ones that are usually nobody's fault. An
  // owner reading one panel should meet the placeholder problem before the
  // eleventh `Asia`.
  const order: FindingKind[] = [
    'placeholder',
    'blank',
    'missing',
    'foreign-script',
    'latin-word',
    'same-as-english',
  ];
  const sorted = [...findings].sort(
    (a, b) => order.indexOf(a.kind) - order.indexOf(b.kind) || a.key.localeCompare(b.key),
  );

  return { locale, englishName, total: findings.length, counts, findings: sorted };
}

/** Every non-English catalogue with at least one finding, worst first. */
export function auditAll(
  names: Record<string, string>,
): AuditSummary[] {
  const summaries: AuditSummary[] = [];
  for (const [locale, catalogue] of Object.entries(CATALOGUES)) {
    if (locale === 'en') continue;
    const findings = auditLocale(locale, catalogue as Partial<Record<string, string>>);
    if (findings.length === 0) continue;
    summaries.push(summarise(locale, names[locale] ?? locale, findings));
  }
  return summaries.sort(
    (a, b) => b.counts.placeholder - a.counts.placeholder || b.total - a.total,
  );
}

/** One sentence for the top of the panel: how much is odd, out of how much. */
export function auditHeadline(summaries: AuditSummary[]): string {
  const broken = summaries.reduce(
    (total, summary) =>
      total + summary.counts.placeholder + summary.counts.blank + summary.counts.missing,
    0,
  );
  const odd = summaries.reduce((total, summary) => total + summary.total, 0) - broken;
  if (broken === 0 && odd === 0) return 'Nothing mechanical is wrong in any catalogue.';
  const parts: string[] = [];
  if (broken > 0) {
    parts.push(`${broken} line${broken === 1 ? '' : 's'} that cannot be rendered as written`);
  }
  if (odd > 0) {
    parts.push(`${odd} worth a second look`);
  }
  return `${parts.join(' · ')}. Everything else is a question only a speaker can answer.`;
}
