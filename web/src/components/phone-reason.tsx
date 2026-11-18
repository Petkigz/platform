import type { ReactNode } from 'react';
import { Say } from '@/components/say';
import { formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
import { findCountry } from '@/lib/phone';
import { phoneSaidAs, type PhoneReason, type PhoneSaid } from '@/lib/phone-outcome';

/** The sentences for why a number cannot be read, in the language of the page that draws them. */
export type PhoneReasonWords = {
  /** The language the words are in: counts are written its way. */
  locale: LocaleCode;
  /**
   * `other_country` holds `{begins}` and `{dial}`; `length_one` holds
   * `{digits}` and `{count}`; `length_range` holds `{min}`, `{max}` and
   * `{count}`.
   */
  why: Record<PhoneSaid, string>;
  /** Said after a length, for a country that writes a digit in front and does not dial it. Holds `{digit}`. */
  whyTrunk: string;
};

/** A number, a dial code, the start of a number: read left to right in any page. */
const dialled = (value: string) => <bdi dir="ltr">{value}</bdi>;

/**
 * Why a number typed for a country cannot be read as one of its numbers, as
 * that page's own sentence.
 *
 * The phone card on the account page says these (`app/account/phone-form.tsx`);
 * the buy form says the same ones about the number a payment is asked of, so
 * a reader meets one wording for one mistake. It has no words of its own, and
 * a reason it has no sentence for is said with `fallback`.
 */
export function PhoneReasonSaid({
  words,
  reason,
  country,
  fallback,
}: {
  words: PhoneReasonWords;
  reason: PhoneReason;
  /** The country the number was read as one of. */
  country: string;
  fallback: string;
}): ReactNode {
  const said = phoneSaidAs(reason);
  if (!said) return fallback;
  const num = (value: number) => formatNumber(words.locale, value);
  const trunk = reason.why === 'length' ? findCountry(country)?.trunk : null;
  return (
    <>
      <Say
        text={words.why[said]}
        parts={{
          ...(reason.begins === undefined ? {} : { begins: dialled(reason.begins) }),
          ...(reason.dial === undefined ? {} : { dial: dialled(reason.dial) }),
          ...(reason.min === undefined ? {} : { min: num(reason.min), digits: num(reason.min) }),
          ...(reason.max === undefined ? {} : { max: num(reason.max) }),
          ...(reason.count === undefined ? {} : { count: num(reason.count) }),
        }}
      />
      {trunk && /^[0-9]$/u.test(trunk) && (
        <>
          {' '}
          <Say text={words.whyTrunk} parts={{ digit: num(Number(trunk)) }} />
        </>
      )}
    </>
  );
}
