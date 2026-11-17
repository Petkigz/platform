import type { LocaleCode } from './locales.ts';

/**
 * The parts of translation that need no catalogue.
 *
 * `index.ts` imports every language's sentences, which is right on the server
 * and wrong in a browser: a client component that imported `fill` from there
 * asked the bundler for fifty-one catalogues to replace one `{name}`. These
 * three functions depend on nothing but the runtime, so a client component can
 * import them from here and bring nothing with it. `index.ts` re-exports them,
 * so server code does not have to know the difference.
 */

/**
 * Fill `{name}` placeholders.
 *
 * A placeholder with no value is left as it is, deliberately: `{year}` appearing
 * on a page is an obvious bug somebody fixes, where a silently empty string is a
 * sentence that reads strangely and is never reported.
 */
export function fill(template: string, vars?: Record<string, string | number>): string {
  if (!vars) return template;
  return template.replace(/\{([a-zA-Z][a-zA-Z0-9]*)\}/g, (whole, name: string) =>
    Object.prototype.hasOwnProperty.call(vars, name) ? String(vars[name]) : whole,
  );
}

/**
 * Which plural form a language wants for a count.
 *
 * `Intl.PluralRules` knows the rules; what this platform ships is **two forms**,
 * singular and plural. For English and most of the register that is the whole
 * system. For a language with a dual — Arabic says a different word for two
 * than for three — the count of two lands on the plural, which is why the shelf
 * also prints the number and never relies on the noun alone to say how many.
 * The limitation is written down in DECISIONS rather than discovered by an
 * Arabic reader counting two courses.
 */
export function pluralForm(code: LocaleCode, count: number): 'one' | 'other' {
  try {
    return new Intl.PluralRules(code).select(count) === 'one' ? 'one' : 'other';
  } catch {
    return count === 1 ? 'one' : 'other';
  }
}

/**
 * A number as this language writes it.
 *
 * Arabic writes ٢٤, Hindi २४, and a page that prints 24 in either is in English
 * with translated words around it. `Intl` is in the runtime, so there is no
 * table to maintain and no font that has to carry the digits.
 */
export function formatNumber(code: LocaleCode, value: number): string {
  try {
    return new Intl.NumberFormat(code).format(value);
  } catch {
    return String(value);
  }
}

/**
 * A percentage as this language writes it: "70%", "٪٧٠", "%70".
 *
 * Where the sign goes, and which sign it is, is part of the language. The
 * catalogue therefore never types a "%"; it has a `{percent}` and this fills it.
 */
export function formatPercent(code: LocaleCode, value: number): string {
  try {
    return new Intl.NumberFormat(code, { style: 'percent', maximumFractionDigits: 2 }).format(value / 100);
  } catch {
    return `${value}%`;
  }
}
