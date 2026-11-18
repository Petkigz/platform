/**
 * Where each mobile-money service can take a payment, and how a payer's
 * number is written for it.
 *
 * A mobile-money account belongs to one country's operator. "MTN MoMo" is
 * eleven separate businesses with eleven sets of credentials, each collecting
 * one currency from numbers of one country; "Airtel Money" is the same, per
 * country. So a provider here is never a brand: it is **a brand in a
 * country** (a market), and three things follow from the market and from
 * nothing else:
 *
 *   1. **How a number written without a country code is read.** As a number
 *      of the market's country. It used to be read as Ugandan whoever was
 *      paying and whichever service they chose.
 *   2. **Which currency can be collected.** The market's. An order priced in
 *      another currency cannot be paid through it, and is not offered it.
 *   3. **Which credentials are used.** The market's own
 *      (`MTN_MOMO_<CC>_…`, `AIRTEL_<CC>_…`; see `registry.ts`).
 *
 * **Where the two tables come from.** MTN's is the list MTN publishes for its
 * Open API (the `X-Target-Environment` values and the currency each
 * collects). Airtel's is the list of Airtel Africa's operating companies and
 * their currencies. Neither was checked against a live account: this
 * platform holds no merchant credentials for any of them. A country missing
 * here is one a service cannot be configured for, which is the safe
 * direction to be wrong in.
 *
 * **What is deliberately not here.** MTN in Rwanda, Nigeria and the other
 * countries that are not on MTN's Open API list; Airtel in Nigeria, where the
 * wallet is SmartCash, a different product; and every service with no adapter
 * in this directory (M-Pesa, Orange Money, Wave, telebirr, Tigo/Mixx and the
 * rest). Naming a service the platform cannot take money through would put a
 * button on the checkout page that cannot work.
 */

import { findCountry } from '../phone.ts';

/** A country and the one currency a service collects there. */
export type Market = {
  /** ISO 3166-1 alpha-2. */
  country: string;
  /** ISO 4217. */
  currency: string;
};

/** MTN MoMo Open API: the country, the header value that selects it, its currency. */
export const MTN_MOMO_MARKETS: Readonly<Record<string, { currency: string; targetEnvironment: string }>> = {
  UG: { currency: 'UGX', targetEnvironment: 'mtnuganda' },
  GH: { currency: 'GHS', targetEnvironment: 'mtnghana' },
  CI: { currency: 'XOF', targetEnvironment: 'mtnivorycoast' },
  ZM: { currency: 'ZMW', targetEnvironment: 'mtnzambia' },
  CM: { currency: 'XAF', targetEnvironment: 'mtncameroon' },
  BJ: { currency: 'XOF', targetEnvironment: 'mtnbenin' },
  CG: { currency: 'XAF', targetEnvironment: 'mtncongo' },
  SZ: { currency: 'SZL', targetEnvironment: 'mtnswaziland' },
  GN: { currency: 'GNF', targetEnvironment: 'mtnguineaconakry' },
  ZA: { currency: 'ZAR', targetEnvironment: 'mtnsouthafrica' },
  LR: { currency: 'LRD', targetEnvironment: 'mtnliberia' },
};

/**
 * Airtel Money: the country (sent as `X-Country`) and its currency (sent as
 * `X-Currency`). In the Democratic Republic of the Congo an account may be
 * in francs or in dollars; francs are the default and `AIRTEL_CD_CURRENCY`
 * says otherwise.
 */
export const AIRTEL_MARKETS: Readonly<Record<string, { currency: string }>> = {
  UG: { currency: 'UGX' },
  KE: { currency: 'KES' },
  TZ: { currency: 'TZS' },
  RW: { currency: 'RWF' },
  ZM: { currency: 'ZMW' },
  MW: { currency: 'MWK' },
  CD: { currency: 'CDF' },
  CG: { currency: 'XAF' },
  GA: { currency: 'XAF' },
  TD: { currency: 'XAF' },
  NE: { currency: 'XOF' },
  MG: { currency: 'MGA' },
  SC: { currency: 'SCR' },
};

/** A stored number as the digits that are dialled from abroad: `256772123456`. */
export function internationalDigits(e164: string): string {
  return e164.replace(/\D/gu, '');
}

/**
 * A stored number without its country's code: `772123456`.
 *
 * Null when the number is not one of that country's. A number is never cut to
 * fit: sending the wrong nine digits prompts a stranger's phone.
 */
export function nationalDigits(e164: string, country: string): string | null {
  const dial = findCountry(country)?.dial.slice(1);
  const digits = internationalDigits(e164);
  if (!dial || !e164.startsWith('+') || !digits.startsWith(dial)) return null;
  const national = digits.slice(dial.length);
  return national === '' ? null : national;
}

/** Whether a stored number is a number of this country. */
export function isNumberOf(e164: string, country: string): boolean {
  return nationalDigits(e164, country) !== null;
}
