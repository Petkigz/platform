/**
 * A sentence that ends in what is put into it, with that set apart.
 *
 * Every sentence on the money pages that carries an amount, a date, a code, a
 * name or something a person typed ends with it, after a colon, so no
 * language has to inflect it (`messages/orders.ts`, `billing.ts`,
 * `receipt.ts`). The value is isolated from the words around it. An amount, a
 * code or a number is read left to right whatever the page's direction
 * (`ltr`); anything else finds its own.
 *
 * It was written three times, once in each page, before it was put here.
 */
export function Ending({ words, gap, value, ltr }: { words: string; gap: string; value: string; ltr?: boolean }) {
  const lead = words.split(`{${gap}}`)[0] ?? '';
  return (
    <>
      {lead}
      {ltr ? <bdi dir="ltr">{value}</bdi> : <bdi>{value}</bdi>}
    </>
  );
}
