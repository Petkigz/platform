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
 * **What is deliberately not in the two direct tables.** MTN in Rwanda,
 * Nigeria and the other countries that are not on MTN's Open API list, and
 * Airtel in Nigeria, where the wallet is SmartCash, a different product.
 * Those, and M-Pesa, Orange Money, Moov, telebirr and the rest, are reached
 * through the aggregator instead: see `PAWAPAY_BRANDS` below. Naming a
 * service the platform cannot take money through would put a button on the
 * checkout page that cannot work.
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

/**
 * One mobile-money operator in one country, reached through pawaPay.
 *
 * pawaPay is an aggregator: one account and one API token, and behind it a
 * separate operator in each country. To a payer it is invisible. They choose
 * "M-Pesa" or "Orange Money", in their country, and that is what a provider
 * is here too: **an operator in a country**, with pawaPay as the road to it.
 */
export type PawaPayOperator = {
  /** pawaPay's name for the operator in this country, sent as `provider`. */
  code: string;
  /** ISO 4217. The one currency this platform collects through it. */
  currency: string;
  /**
   * Whether the operator takes an amount with a fraction (`10.50`). Where it
   * does not, an order whose total has one cannot be paid through it, and is
   * not rounded to make it fit.
   */
  decimals: boolean;
  /** The operator's wallet under another name in this country. */
  label?: string;
};

export type PawaPayBrand = {
  /** What a payer calls it. A name, not a sentence: it is not translated. */
  label: string;
  /**
   * The service in this directory that reaches the same operator directly.
   * Where that one has an account of its own in a country, it is the one
   * offered there and this one is not: two buttons for one wallet would be a
   * choice with nothing to choose (the owner's decision of 2026-11-18: one
   * aggregator, and MTN or Airtel direct where an account exists).
   */
  direct?: 'mtn_momo' | 'airtel_money';
  /** By ISO 3166-1 alpha-2. */
  countries: Readonly<Record<string, PawaPayOperator>>;
};

/**
 * Every operator pawaPay documents that asks the payer to approve on their
 * own handset (`PROVIDER_AUTH`), with its code, currency and whether it takes
 * a fraction: copied from https://docs.pawapay.io/v2/docs/providers on
 * 2026-11-19. **Not checked against an account**: this platform has none.
 * Which of these an account may actually use is decided by pawaPay, operator
 * by operator, and is said in `PAWAPAY_PROVIDERS` (`pawapay.ts`); an operator
 * not named there is not offered whatever this table says.
 *
 * **What is deliberately not here.**
 *
 *   - Wave in Côte d'Ivoire and Senegal (`REDIRECT_AUTH`): the payer is sent
 *     to Wave's own page, and nothing in this adapter follows that step.
 *   - Orange in Burkina Faso (`PREAUTH`): the payer first gets a code from
 *     their handset and types it in, and the buy form has no box for it.
 *   - The second currency of the three operators in the Democratic Republic
 *     of the Congo. Each collects francs or dollars; francs are the one here.
 *   - Countries pawaPay's site names and its provider table does not
 *     (Liberia, Mali, South Sudan): there is no code to send.
 *
 * The key is the short name in a provider's id: `pawapay_mpesa_ke`.
 */
export const PAWAPAY_BRANDS: Readonly<Record<string, PawaPayBrand>> = {
  mtn: {
    label: 'MTN MoMo',
    direct: 'mtn_momo',
    countries: {
      BJ: { code: 'MTN_MOMO_BEN', currency: 'XOF', decimals: false },
      CM: { code: 'MTN_MOMO_CMR', currency: 'XAF', decimals: false },
      CI: { code: 'MTN_MOMO_CIV', currency: 'XOF', decimals: false },
      GH: { code: 'MTN_MOMO_GHA', currency: 'GHS', decimals: true },
      NG: { code: 'MTN_MOMO_NGA', currency: 'NGN', decimals: true },
      CG: { code: 'MTN_MOMO_COG', currency: 'XAF', decimals: false },
      RW: { code: 'MTN_MOMO_RWA', currency: 'RWF', decimals: false },
      UG: { code: 'MTN_MOMO_UGA', currency: 'UGX', decimals: true },
      ZM: { code: 'MTN_MOMO_ZMB', currency: 'ZMW', decimals: true },
    },
  },
  airtel: {
    label: 'Airtel Money',
    direct: 'airtel_money',
    countries: {
      CD: { code: 'AIRTEL_COD', currency: 'CDF', decimals: true },
      GA: { code: 'AIRTEL_GAB', currency: 'XAF', decimals: true },
      MW: { code: 'AIRTEL_MWI', currency: 'MWK', decimals: true },
      // In Nigeria Airtel's wallet is SmartCash, a different product from
      // Airtel Money; the name was not checked with anybody who uses it.
      NG: { code: 'AIRTEL_NGA', currency: 'NGN', decimals: false, label: 'Airtel SmartCash' },
      CG: { code: 'AIRTEL_COG', currency: 'XAF', decimals: false },
      RW: { code: 'AIRTEL_RWA', currency: 'RWF', decimals: false },
      TZ: { code: 'AIRTEL_TZA', currency: 'TZS', decimals: true },
      UG: { code: 'AIRTEL_OAPI_UGA', currency: 'UGX', decimals: false },
      ZM: { code: 'AIRTEL_OAPI_ZMB', currency: 'ZMW', decimals: true },
    },
  },
  mpesa: {
    label: 'M-Pesa',
    countries: {
      KE: { code: 'MPESA_KEN', currency: 'KES', decimals: false },
      ET: { code: 'MPESA_ETH', currency: 'ETB', decimals: true },
      LS: { code: 'MPESA_LSO', currency: 'LSL', decimals: true },
      CD: { code: 'VODACOM_MPESA_COD', currency: 'CDF', decimals: false },
      MZ: { code: 'VODACOM_MOZ', currency: 'MZN', decimals: true },
      TZ: { code: 'VODACOM_TZA', currency: 'TZS', decimals: false },
    },
  },
  orange: {
    label: 'Orange Money',
    countries: {
      CM: { code: 'ORANGE_CMR', currency: 'XAF', decimals: false },
      CI: { code: 'ORANGE_CIV', currency: 'XOF', decimals: false },
      CD: { code: 'ORANGE_COD', currency: 'CDF', decimals: true },
      SN: { code: 'ORANGE_SEN', currency: 'XOF', decimals: false },
      SL: { code: 'ORANGE_SLE', currency: 'SLE', decimals: true },
    },
  },
  moov: {
    label: 'Moov Money',
    countries: {
      BJ: { code: 'MOOV_BEN', currency: 'XOF', decimals: false },
      BF: { code: 'MOOV_BFA', currency: 'XOF', decimals: false },
      CI: { code: 'MOOV_CIV', currency: 'XOF', decimals: false },
      GA: { code: 'MOOV_GAB', currency: 'XAF', decimals: true },
    },
  },
  telebirr: { label: 'telebirr', countries: { ET: { code: 'TELEBIRR_ETH', currency: 'ETB', decimals: true } } },
  cbebirr: { label: 'CBE Birr', countries: { ET: { code: 'CBE_BIRR_ETH', currency: 'ETB', decimals: true } } },
  // pawaPay still calls these by the names they had: AirtelTigo is AT, and
  // Vodafone Ghana is Telecel. The labels are the names on the handset today,
  // as far as this file's author could tell without one.
  airteltigo: { label: 'AT Money', countries: { GH: { code: 'AIRTELTIGO_GHA', currency: 'GHS', decimals: true } } },
  telecel: { label: 'Telecel Cash', countries: { GH: { code: 'VODAFONE_GHA', currency: 'GHS', decimals: true } } },
  tnm: { label: 'TNM Mpamba', countries: { MW: { code: 'TNM_MWI', currency: 'MWK', decimals: true } } },
  movitel: { label: 'e-Mola', countries: { MZ: { code: 'MOVITEL_MOZ', currency: 'MZN', decimals: false } } },
  free: { label: 'Free Money', countries: { SN: { code: 'FREE_SEN', currency: 'XOF', decimals: false } } },
  tigo: { label: 'Tigo Pesa', countries: { TZ: { code: 'TIGO_TZA', currency: 'TZS', decimals: false } } },
  halotel: { label: 'HaloPesa', countries: { TZ: { code: 'HALOTEL_TZA', currency: 'TZS', decimals: false } } },
  zamtel: { label: 'Zamtel Money', countries: { ZM: { code: 'ZAMTEL_ZMB', currency: 'ZMW', decimals: true } } },
  ecocash: { label: 'EcoCash', countries: { ZW: { code: 'ECOCASH_ZWE', currency: 'USD', decimals: true } } },
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
