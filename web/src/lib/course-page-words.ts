/**
 * The public course page, said in the reader's language.
 *
 * `/courses/[slug]` is the page a visitor reads before they have an account,
 * and until 2026-11-25 it was English for everybody. What an author wrote —
 * the title, the description, section and lesson titles, subject names, a
 * teacher's name and headline — is theirs and is shown as written. Everything
 * the platform says around it is a key in the `cpage.` part, or one the
 * catalogue already had (`audience.`, `difficulty.`, `price.`).
 *
 * Three things are built here rather than in a sentence, because a sentence
 * glued from English pieces does not survive translation:
 *
 * 1. **A list of ages** is joined by the language's own "and"
 *    (`Intl.ListFormat`), each age band written with the language's digits.
 * 2. **The language a course is taught in** is named in the reader's
 *    language (`Intl.DisplayNames`), with its own name after it when that is
 *    different: "Diajarkan dalam bahasa Arab — العربية".
 * 3. **The note about ages** is made for each learner on the server, so the
 *    button never builds a sentence in the browser.
 *
 * Server only: it reads the catalogues. The button and the teacher card are
 * handed their words (`EnrolWords`, `TeacherWords`).
 */
import { AGE_BANDS, bandFits, isAgeBand, type AgeBand } from './audience.ts';
import type { EnrolLearner, EnrolWords, TeacherWords } from './enrol-outcome.ts';
import { formatNumber, translator, type LocaleCode } from './i18n/index.ts';
import type { Language } from './language.ts';

export function coursePageWords(code: LocaleCode) {
  const t = translator(code);

  /** "Ages 8–10", or "Adults". */
  const band = (value: AgeBand): string => {
    if (value === '18+') return t('audience.adult');
    const [from, to] = value.split('-').map(Number) as [number, number];
    return t('family.ages', { from: formatNumber(code, from), to: formatNumber(code, to) });
  };

  const list = (items: string[]): string => {
    try {
      return new Intl.ListFormat(code, { style: 'long', type: 'conjunction' }).format(items);
    } catch {
      return items.join(', ');
    }
  };

  /** The course's ages in age order, whatever order the author ticked. */
  const ages = (bands: readonly string[] | null | undefined): string | null => {
    const known = (bands ?? []).filter(isAgeBand).sort((a, b) => AGE_BANDS.indexOf(a) - AGE_BANDS.indexOf(b));
    return known.length > 0 ? list(known.map(band)) : null;
  };

  /** "Written for ages 8–10 and 11–13.", or null when the author named no age. */
  const writtenFor = (bands: readonly string[] | null | undefined): string | null => {
    const said = ages(bands);
    return said ? t('cpage.writtenFor', { ages: said }) : null;
  };

  /**
   * A quiet sentence when a learner is outside the course's stated ages, or
   * null. A note and never a gate: see `bandMismatch` in `audience.ts`, which
   * decides the same thing in English.
   */
  const outside = (
    bands: readonly string[] | null | undefined,
    learnerBand: string | null | undefined,
  ): string | null => {
    if (!isAgeBand(learnerBand)) return null;
    if (bandFits(bands, learnerBand)) return null;
    const said = ages(bands);
    return said ? t('cpage.outside', { ages: said, band: band(learnerBand) }) : null;
  };

  /** "Taught in Arabic — العربية.", or null for a course taught in English. */
  const taughtIn = (language: Language | null): string | null => {
    if (!language || language.code === 'en') return null;
    let name = language.englishName;
    if (code !== 'en') {
      try {
        name = new Intl.DisplayNames(code, { type: 'language' }).of(language.code) ?? name;
      } catch {
        // A code the runtime has no name for keeps the register's English one.
      }
      // The runtime answers with the code itself when it knows no name.
      if (name === language.code) name = language.englishName;
    }
    const both = language.nativeName && language.nativeName !== name
      ? `${name} — ${language.nativeName}`
      : name;
    return t('cpage.taughtIn', { language: both });
  };

  /** The people this account may enrol, as the button shows them. */
  const learners = (
    people: readonly { id: string; name: string; isSelf: boolean; ageBand: string | null }[],
    bands: readonly string[] | null | undefined,
  ): EnrolLearner[] =>
    people.map((person) => ({
      id: person.id,
      name: person.name,
      isSelf: person.isSelf,
      label: person.isSelf ? t('cpage.me', { name: person.name }) : person.name,
      outside: outside(bands, person.ageBand),
    }));

  /** The button's words. `price` is the offering's label, already in this language. */
  const enrolWords = (price: string): EnrolWords => ({
    createToEnrol: t('cpage.createToEnrol'),
    haveAccount: t('cpage.haveAccount'),
    notSoldHere: t('cpage.notSoldHere'),
    contact: t('cpage.contact'),
    buy: t('cpage.buy', { price }),
    goLearning: t('account.selfGo'),
    who: t('cpage.who'),
    forChild: t('cpage.forChild'),
    outsideNote: t('cpage.outsideNote'),
    enrolling: t('cpage.enrolling'),
    continueEnrolment: t('cpage.continue'),
    enrolFree: t('cpage.enrolFree'),
    openGuardian: t('cpage.openGuardian'),
    refusals: {
      not_signed_in: t('cpage.errSignedOut'),
      no_learner_profile: t('cpage.errNoProfile'),
      no_published_version: t('cpage.errNotOpen'),
      payment_required: t('cpage.errPaid'),
      not_sold_here: t('cpage.errNotSoldHere'),
      guardian_verification_required: t('cpage.errGuardian'),
      not_available: t('cpage.errNotAvailable'),
      already_enrolled: t('cpage.errAlready'),
      unconfirmed: t('cpage.errUnconfirmed'),
    },
  });

  const teacher: TeacherWords = {
    all: (firstName) => t('cpage.teacherAll', { name: firstName }),
    unnamed: t('cpage.teacherUnnamed'),
    unnamedWhy: t('cpage.teacherUnnamedWhy'),
  };

  return { t, band, ages, writtenFor, outside, taughtIn, learners, enrolWords, teacher };
}
