export type ChargeRule = {
  id: string;
  kind: 'tax' | 'transfer_fee';
  country_code: string | null;
  currency_code: string | null;
  label: string;
  rate_bps: number;
  fixed_minor: number | string;
  min_minor: number | string | null;
  max_minor: number | string | null;
  effective_from: string;
  effective_to: string | null;
  status: 'active' | 'retired';
  note: string | null;
};

export const KIND_LABEL: Record<string, string> = {
  tax: 'Tax',
  transfer_fee: 'Transfer fee',
};

/** Basis points as a percentage a person reads: 1800 → "18%". */
export function describeRate(rateBps: number, fixedMinor: number | string = 0): string {
  const pct = rateBps / 100;
  // `toFixed(2)` would print 7.5 as "7.50%"; a rate is written the way a
  // government writes it, so trailing zeros go.
  const pctText =
    rateBps === 0 ? '' : `${pct.toFixed(2).replace(/\.?0+$/, '')}%`;
  const fixed = Number(fixedMinor);
  if (fixed === 0) return pctText || '0%';
  const fixedText = fixed.toLocaleString('en-US');
  return pctText ? `${pctText} + ${fixedText}` : fixedText;
}

/** Where a rule applies, in words: "Uganda · any currency" or "Every country". */
export function describeScope(rule: Pick<ChargeRule, 'country_code' | 'currency_code'>): string {
  const country = rule.country_code ? rule.country_code : 'every country';
  const currency = rule.currency_code ? rule.currency_code : 'any currency';
  return `${country} · ${currency}`;
}

/**
 * Why a market shows no tax line.
 *
 * The absence of a rule is the normal, safe state — a platform registered for a
 * tax nowhere must not invent one — and this sentence is what stops an empty
 * list being read as "the screen is broken".
 */
export function describeEmptyRegister(rules: ChargeRule[]): string | null {
  if (rules.some((r) => r.status === 'active')) return null;
  return 'No tax or fee is registered yet, so no order is charged one. Add a rule for a country when this platform is registered there.';
}

/** What a payer would see for a sample amount, so a rate can be checked before it ships. */
export function describeSample(
  rule: Pick<ChargeRule, 'rate_bps' | 'fixed_minor' | 'min_minor' | 'max_minor'>,
  baseMinor: number,
): number {
  let amount = Math.round((baseMinor * rule.rate_bps) / 10000) + Number(rule.fixed_minor);
  if (rule.min_minor !== null && rule.min_minor !== undefined) {
    amount = Math.max(amount, Number(rule.min_minor));
  }
  if (rule.max_minor !== null && rule.max_minor !== undefined) {
    amount = Math.min(amount, Number(rule.max_minor));
  }
  return Math.max(amount, 0);
}
