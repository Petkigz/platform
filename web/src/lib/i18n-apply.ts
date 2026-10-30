/**
 * Turning an accepted correction into a line of TypeScript, safely.
 *
 * The review flow ends in the worst possible place for a human: a paste block of
 * forty lines, into a file of a hundred and ninety-two, in a language the owner
 * does not read. One unescaped apostrophe is a build failure at best and a
 * silently mangled sentence at worst, and the person doing it has no way to
 * check the result. That is the step where the flow quietly stops working.
 *
 * This module is the replacement: a **plan** — every change, checked, located,
 * and diffed — and a **render**, which is the same text with the value literals
 * swapped. Nothing here writes a file; that is the CLI's job, so the whole thing
 * can be tested against the real catalogues without touching them.
 *
 * Four rules, each learned from a way this goes wrong:
 *
 *   * **The file is the truth.** If the catalogue no longer says what the
 *     reviewer corrected, the correction is not applied — it is reported as
 *     stale and left alone. Two people editing the same line is how a good
 *     translation is silently overwritten by an old one.
 *   * **Nothing is written unless everything is valid.** A half-applied payload
 *     is worse than a refused one: the owner would have to work out which of
 *     eleven corrections landed.
 *   * **Placeholders are checked here too.** The route checks them on the way in,
 *     the database checks the shape, and this checks them again on the way out,
 *     because this is the step that can actually corrupt a sentence.
 *   * **A key that is not in the file is inserted, not silently dropped.** A
 *     language can be missing a key (it falls back to English); a correction for
 *     that key is the first translation of it, and it has to land somewhere.
 */

import { en } from './i18n/messages/en.ts';
import { LOCALES } from './i18n/locales.ts';

export type Correction = {
  key: string;
  /** What the correction should say. */
  to: string;
  /** What the reviewer was looking at, when the payload carries it. */
  from?: string;
};

export type PayloadReview = {
  locale: string;
  reviewer?: string;
  corrections: Correction[];
};

export type SourceFile = { path: string; text: string };

export type Edit = {
  path: string;
  locale: string;
  key: string;
  /** The line in the file now. */
  before: string;
  /** What it becomes. */
  after: string;
  /** True when the key was not in the catalogue at all. */
  inserted: boolean;
};

export type Problem = {
  locale: string;
  key: string;
  code:
    | 'bad-payload'
    | 'unknown-locale'
    | 'english'
    | 'unknown-key'
    | 'empty'
    | 'too-long'
    | 'placeholder'
    | 'unchanged'
    | 'stale'
    | 'ambiguous'
    | 'unreadable';
  message: string;
};

export type Plan = {
  /**
   * What would be written — **empty whenever `problems` is not**.
   *
   * All or nothing is a property of the plan itself and not only of the script
   * that consumes it: a caller that reached for `edits` and ignored `problems`
   * would write half a payload, and half a payload means the owner works out
   * which of eleven corrections landed.
   */
  edits: Edit[];
  /**
   * Every valid edit that was found, whether or not the payload as a whole is
   * clean. For the report: "these two are fine, that one is stale" is what the
   * owner needs to see, and it is still not permission to write.
   */
  proposed: Edit[];
  problems: Problem[];
  /** Corrections that would change nothing because the file already says it. */
  already: Correction[];
};

/** The message keys, exactly as `en.ts` defines them. */
const KEYS = new Set(Object.keys(en));

/** The language codes, including the ones whose block a file may not have. */
const CODES = new Set<string>(LOCALES.map((locale) => locale.code));

/**
 * A message key in a catalogue file: `'nav.main':`, `'home.assure1Title':`.
 *
 * Digits are load-bearing — `assure1Title`, `step2Body` — and a parser that
 * forgets them silently skips fourteen keys per language. That is not a
 * hypothetical: it is what this file's first draft did, and the count looked
 * plausible until it was compared against the register.
 */
const KEY_LINE = /^(\s+)'([a-zA-Z][a-zA-Z0-9]*(?:\.[a-zA-Z][a-zA-Z0-9]*)+)'\s*:\s*(.*)$/;

/** A locale block header: `  ta: {` or `  'fa-af': {`. */
const BLOCK_OPEN = /^(\s{2,6})'?([a-z][a-z0-9-]{1,9})'?\s*:\s*\{\s*$/;

/** The closing line of a locale block, at the same indentation. */
const BLOCK_CLOSE = /^(\s{2,6})\}\s*,?\s*$/;

type Block = {
  code: string;
  /** Index of the header line. */
  header: number;
  /** Index of the closing line. */
  close: number;
};

/** Every locale block in a file, by line number. */
export function blocksIn(text: string): Block[] {
  const lines = text.split('\n');
  const blocks: Block[] = [];
  let open: { code: string; header: number; indent: string } | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index] ?? '';
    if (open) {
      const close = BLOCK_CLOSE.exec(line);
      if (close && close[1] === open.indent) {
        blocks.push({ code: open.code, header: open.header, close: index });
        open = null;
      }
      continue;
    }
    const header = BLOCK_OPEN.exec(line);
    if (header && CODES.has(header[2] ?? '')) {
      open = { code: header[2] ?? '', header: index, indent: header[1] ?? '' };
    }
  }

  return blocks;
}

/**
 * Where a string literal starts and ends.
 *
 * Handles the escapes the catalogue files actually contain — `\'`, `\\`, `\n` —
 * and refuses anything it does not recognise rather than guessing, because a
 * wrong guess here rewrites somebody's sentence.
 */
export function literalAt(
  text: string,
  from: number,
): { start: number; end: number; value: string } | null {
  let index = from;
  while (index < text.length && /\s/.test(text[index] ?? '')) index += 1;
  if (text[index] !== "'") return null;

  const start = index;
  let value = '';
  index += 1;
  while (index < text.length) {
    const character = text[index];
    if (character === '\\') {
      const next = text[index + 1];
      if (next === undefined) return null;
      value += next === 'n' ? '\n' : next === 'r' ? '\r' : next === 't' ? '\t' : next;
      index += 2;
      continue;
    }
    if (character === "'") return { start, end: index + 1, value };
    if (character === '\n') return null; // unterminated: never guess
    value += character;
    index += 1;
  }
  return null;
}

/** One catalogue file, with its locale blocks and the line range of each key. */
type Located = { path: string; line: number; value: string };

function locate(files: SourceFile[], locale: string, key: string): Located[] {
  const found: Located[] = [];
  for (const file of files) {
    const lines = file.text.split('\n');
    for (const block of blocksIn(file.text)) {
      if (block.code !== locale) continue;
      for (let line = block.header + 1; line < block.close; line += 1) {
        const parsed = KEY_LINE.exec(lines[line] ?? '');
        if (!parsed || parsed[2] !== key) continue;
        // The literal may be on this line or the next few; `literalAt` reads
        // through whitespace, so the position just after the colon is enough.
        const lineStart = lines.slice(0, line).join('\n').length + (line > 0 ? 1 : 0);
        const colon = lineStart + (lines[line] ?? '').indexOf(':', parsed[1]?.length ?? 0);
        const literal = literalAt(file.text, colon + 1);
        if (!literal) continue;
        found.push({ path: file.path, line, value: literal.value });
      }
    }
  }
  return found;
}

/** `{count}`, `{year}` — sorted, so two sets can be compared as strings. */
export function placeholderSet(value: string): string {
  return [...value.matchAll(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g)]
    .map((match) => match[1] ?? '')
    .sort()
    .join(',');
}

/**
 * A string as a TypeScript literal, in the style the catalogues use.
 *
 * Single quotes, with the four escapes that matter. `\u2028` and `\u2029` are
 * escaped because they are line terminators in JavaScript that look like spaces
 * in an editor — a paste containing one is a syntax error nobody can see.
 */
export function tsLiteral(value: string): string {
  const escaped = value
    .replace(/\\/g, '\\\\')
    .replace(/'/g, "\\'")
    .replace(/\r/g, '\\r')
    .replace(/\t/g, '\\t')
    .replace(/\n/g, '\\n')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
  return `'${escaped}'`;
}

/** One `'key': 'value',` line, or two lines when it would run long. */
function renderKey(key: string, value: string, indent: string): string[] {
  const inline = `${indent}'${key}': ${tsLiteral(value)},`;
  // The catalogue files wrap at a hundred columns; keeping that keeps every
  // diff to the lines that actually changed.
  if (inline.length <= 100) return [inline];
  return [`${indent}'${key}':`, `${indent}  ${tsLiteral(value)},`];
}

/**
 * The file with one key replaced or inserted, or `null` if the key cannot be
 * found where it should be.
 *
 * Replacing keeps the literal exactly where it was, including a wrapped value,
 * so the diff is one line and not a reformat of the paragraph around it.
 */
export function rewrite(
  text: string,
  locale: string,
  key: string,
  value: string,
): string | null {
  const lines = text.split('\n');
  const blocks = blocksIn(text).filter((block) => block.code === locale);

  for (const block of blocks) {
    for (let line = block.header + 1; line < block.close; line += 1) {
      const parsed = KEY_LINE.exec(lines[line] ?? '');
      if (!parsed || parsed[2] !== key) continue;

      const lineStart = lines.slice(0, line).join('\n').length + (line > 0 ? 1 : 0);
      const colon = lineStart + (lines[line] ?? '').indexOf(':');
      const literal = literalAt(text, colon + 1);
      if (!literal) return null;

      // Replace just the literal, and only re-wrap if the result overflows and
      // the original was already on one line.
      const before = text.slice(0, literal.start);
      const after = text.slice(literal.end);
      const lineHead = text.slice(lineStart, literal.start);
      const overflow = (lineHead + tsLiteral(value)).length > 100 && !lineHead.includes('\n');
      if (!overflow) return before + tsLiteral(value) + after;

      const indent = /^(\s*)/.exec(lines[line] ?? '')?.[1] ?? '';
      const replaced = renderKey(key, value, indent);
      const next = [...lines];
      next.splice(line, 1, ...replaced);
      return next.join('\n');
    }
  }

  // Not there: insert it into the locale's largest block, **in the order the
  // English catalogue keeps** — before the first key of the same prefix that
  // comes after it. Appending at the end of the block would put `nav.family`
  // after `nav.certificates`, and a file whose order is alphabetical in one
  // language and scrambled in another is a file nobody can compare.
  const target = blocks.sort((a, b) => b.close - b.header - (a.close - a.header))[0];
  if (!target) return null;

  const order = Object.keys(en);
  const rank = order.indexOf(key);
  const prefix = `${key.split('.')[0] ?? key}.`;

  let insertAt = target.close;
  let indent = '    ';
  for (let line = target.header + 1; line < target.close; line += 1) {
    const parsed = KEY_LINE.exec(lines[line] ?? '');
    if (!parsed) continue;
    indent = parsed[1] ?? indent;
    const other = parsed[2] ?? '';
    if (!other.startsWith(prefix)) continue;
    if (rank >= 0 && order.indexOf(other) > rank) {
      insertAt = line;
      break;
    }
  }

  const next = [...lines];
  next.splice(insertAt, 0, ...renderKey(key, value, indent));
  return next.join('\n');
}

/**
 * The strings a set of files holds for one language, read back out of the text.
 *
 * Not the same as importing `catalogues.ts`: that module is loaded once, at
 * import time, so it can never answer "what does the file say after this write?".
 * This reads the literals out of the text itself, which is what makes an
 * end-to-end test of the whole loop possible — submission, decision, payload,
 * write, and the value a page would print — without a database or a rebuild.
 */
export function readCatalogue(
  files: SourceFile[],
  locale: string,
): Record<string, string> {
  const out: Record<string, string> = {};
  for (const file of files) {
    const lines = file.text.split('\n');
    for (const block of blocksIn(file.text)) {
      if (block.code !== locale) continue;
      for (let line = block.header + 1; line < block.close; line += 1) {
        const parsed = KEY_LINE.exec(lines[line] ?? '');
        if (!parsed) continue;
        const lineStart = lines.slice(0, line).join('\n').length + (line > 0 ? 1 : 0);
        const colon = lineStart + (lines[line] ?? '').indexOf(':');
        const literal = literalAt(file.text, colon + 1);
        if (literal) out[parsed[2] ?? ''] = literal.value;
      }
    }
  }
  return out;
}

/**
 * What a payload would change, and everything wrong with it.
 *
 * Pure: it takes the files it is given and returns the plan. The CLI reads the
 * catalogue directory, prints the diff, and writes only if the plan is clean.
 */
export function plan(payload: PayloadReview[], files: SourceFile[]): Plan {
  const edits: Edit[] = [];
  const problems: Problem[] = [];
  const already: Correction[] = [];

  const fail = (locale: string, key: string, code: Problem['code'], message: string) =>
    problems.push({ locale, key, code, message });

  const seen = new Set<string>();

  for (const review of payload) {
    const { locale } = review;

    if (!CODES.has(locale)) {
      fail(locale, '*', 'unknown-locale', `${locale} is not a language this interface has`);
      continue;
    }
    if (locale === 'en') {
      fail(locale, '*', 'english', 'English is the source text: there is nothing to correct');
      continue;
    }
    if (review.corrections.length === 0) {
      fail(locale, '*', 'bad-payload', 'the payload has no corrections');
      continue;
    }

    // A key that appears twice in one payload is not two opinions, it is an
    // ambiguous instruction: neither is applied, because picking the first would
    // be picking for the owner without saying so.
    const counts = new Map<string, number>();
    for (const correction of review.corrections) {
      counts.set(correction.key, (counts.get(correction.key) ?? 0) + 1);
    }
    const duplicated = new Set(
      [...counts.entries()].filter(([, count]) => count > 1).map(([key]) => key),
    );
    for (const key of duplicated) {
      fail(locale, key, 'bad-payload', 'the same key appears twice in one payload');
    }

    for (const correction of review.corrections) {
      const { key, to } = correction;
      const id = `${locale}:${key}`;

      if (duplicated.has(key)) continue;

      if (seen.has(id)) {
        fail(locale, key, 'bad-payload', 'the same key appears twice in one payload');
        continue;
      }
      seen.add(id);

      if (!KEYS.has(key)) {
        fail(locale, key, 'unknown-key', `${key} is not a key in the English catalogue`);
        continue;
      }
      if (to.trim().length === 0) {
        fail(locale, key, 'empty', 'the correction is blank');
        continue;
      }
      if (to.length > 600) {
        fail(locale, key, 'too-long', `${to.length} characters, and the limit is 600`);
        continue;
      }

      const english = (en as Record<string, string>)[key] ?? '';
      if (placeholderSet(to) !== placeholderSet(english)) {
        fail(
          locale,
          key,
          'placeholder',
          `placeholders do not match the English: expected {${placeholderSet(english)}}, got {${placeholderSet(to)}}`,
        );
        continue;
      }

      const found = locate(files, locale, key);
      if (found.length > 1) {
        fail(
          locale,
          key,
          'ambiguous',
          `the key is defined in ${found.map((hit) => hit.path).join(' and ')}; the later one wins and this will not guess which`,
        );
        continue;
      }

      const hit = found[0];
      if (!hit) {
        // Not in the file at all: this is the first translation of the key, and
        // it goes into the locale's largest block.
        const path = largestFile(files, locale);
        const source = files.find((file) => file.path === path);
        if (!path || !source || rewrite(source.text, locale, key, to) === null) {
          fail(locale, key, 'unreadable', `no ${locale} block to put the first translation in`);
          continue;
        }
        edits.push({ path, locale, key, before: '', after: to, inserted: true });
        continue;
      }

      // The reviewer corrected a specific line. If the file has moved on, this is
      // not their correction any more and applying it would overwrite a newer one.
      if (correction.from !== undefined && hit.value !== correction.from) {
        fail(
          locale,
          key,
          'stale',
          'the catalogue no longer says what was corrected — the file moved past this one',
        );
        continue;
      }

      if (hit.value === to) {
        already.push(correction);
        continue;
      }

      edits.push({ path: hit.path, locale, key, before: hit.value, after: to, inserted: false });
    }
  }

  return {
    // The gate. A payload with one bad correction writes none of them.
    edits: problems.length === 0 ? edits : [],
    proposed: edits,
    problems,
    already,
  };
}

function largestFile(files: SourceFile[], locale: string): string | undefined {
  let best: { path: string; size: number } | undefined;
  for (const file of files) {
    const block = blocksIn(file.text).find((candidate) => candidate.code === locale);
    if (!block) continue;
    const size = block.close - block.header;
    if (!best || size > best.size) best = { path: file.path, size };
  }
  return best?.path;
}

/**
 * Every edit applied, one file at a time, or `null` if any of them fails.
 *
 * All or nothing. A plan that half-lands leaves the owner comparing eleven
 * corrections against a file to find which one took, and that is a worse outcome
 * than being told to fix the payload and run it again.
 */
export function apply(
  files: SourceFile[],
  edits: Edit[],
): SourceFile[] | null {
  const byPath = new Map(files.map((file) => [file.path, file.text]));

  for (const edit of edits) {
    const original = byPath.get(edit.path);
    if (original === undefined) return null;
    const next = rewrite(original, edit.locale, edit.key, edit.after);
    if (next === null) return null;
    byPath.set(edit.path, next);
  }

  return files.map((file) => ({ path: file.path, text: byPath.get(file.path) ?? file.text }));
}

/**
 * A unified diff of the plan, per file.
 *
 * Hand-written rather than pulled from a library because the shapes are known:
 * each edit replaces one line (or inserts one), and a diff of the surrounding
 * three lines is enough for a person to see that the right sentence changed.
 */
export function diff(files: SourceFile[], edits: Edit[]): string {
  const out: string[] = [];
  const next = apply(files, edits) ?? files;

  for (const file of files) {
    const after = next.find((candidate) => candidate.path === file.path);
    if (!after || after.text === file.text) continue;

    const beforeLines = file.text.split('\n');
    const afterLines = after.text.split('\n');
    const changed = firstDifference(beforeLines, afterLines);
    if (!changed) continue;

    const context = 3;
    const start = Math.max(0, changed.index - context);
    const oldEnd = Math.min(beforeLines.length, changed.index + changed.before + context);
    const oldCount = oldEnd - start;
    const newCount = oldCount - changed.before + changed.after;

    out.push(`--- ${file.path}`);
    out.push(`+++ ${file.path}`);
    out.push(`@@ -${start + 1},${oldCount} +${start + 1},${newCount} @@`);

    for (let line = start; line < changed.index; line += 1) out.push(` ${beforeLines[line] ?? ''}`);
    for (let line = changed.index; line < changed.index + changed.before; line += 1) {
      out.push(`-${beforeLines[line] ?? ''}`);
    }
    for (let line = changed.index; line < changed.index + changed.after; line += 1) {
      out.push(`+${afterLines[line] ?? ''}`);
    }
    for (let line = changed.index + changed.before; line < oldEnd; line += 1) {
      out.push(` ${beforeLines[line] ?? ''}`);
    }
    out.push('');
  }

  return out.join('\n');
}

/** The first place two files diverge, and how many lines each side changed. */
function firstDifference(
  before: string[],
  after: string[],
): { index: number; before: number; after: number } | null {
  let index = 0;
  while (index < before.length && index < after.length && before[index] === after[index]) index += 1;
  if (index === before.length && index === after.length) return null;

  // Walk back from the end to find how much was inserted or removed.
  let tailBefore = before.length - 1;
  let tailAfter = after.length - 1;
  while (tailBefore >= index && tailAfter >= index && before[tailBefore] === after[tailAfter]) {
    tailBefore -= 1;
    tailAfter -= 1;
  }
  return { index, before: tailBefore - index + 1, after: tailAfter - index + 1 };
}

/** A note for the CLI: what the plan comes to, in one line. */
export function summary(plan_: Plan): string {
  const parts: string[] = [];
  if (plan_.edits.length > 0) parts.push(`${plan_.edits.length} to apply`);
  else if (plan_.proposed.length > 0) parts.push(`${plan_.proposed.length} would apply`);
  if (plan_.already.length > 0) parts.push(`${plan_.already.length} already correct`);
  if (plan_.problems.length > 0) parts.push(`${plan_.problems.length} refused`);
  return parts.length === 0 ? 'nothing to do' : parts.join(', ');
}

