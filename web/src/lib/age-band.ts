/**
 * The label of an age band, in the reader's words.
 *
 * A band is stored as its code (`8-10`, `18+`). The label used to be a table
 * of English (`AGE_BAND_LABEL` in `family.ts`, which pages that are still
 * English keep using). A page written in the reader's language builds the
 * label from the code instead: the two ages are numbers and are written in
 * the reader's digits, and the words around them are the page's.
 *
 * Pure, and it knows nothing about the catalogue: the caller hands in how it
 * says "ages a to b" and "adult".
 */
export type AgeBandSay = {
  ages: (from: number, to: number) => string;
  adult: string;
};

export function ageBandLabel(band: string, say: AgeBandSay): string {
  if (band === '18+') return say.adult;
  const range = /^(\d{1,2})-(\d{1,2})$/u.exec(band);
  if (!range) return band;
  return say.ages(Number(range[1]), Number(range[2]));
}
