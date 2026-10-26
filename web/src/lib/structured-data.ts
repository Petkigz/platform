/**
 * What the platform tells a search engine about itself and its courses.
 *
 * The pages already say most of this to a person. A crawler reads structure, not
 * prose, so the same facts are also emitted as JSON-LD — and the rule that makes
 * this worth doing is the rule that makes it dangerous: **a claim in structured
 * data is a claim the page must actually make.** A `Course` marked up with an
 * `aggregateRating` nobody can see, an `offers` price the page does not show, or
 * an `Organization` with a logo that does not exist is a promise to Google that
 * ends in a penalty and to a learner that ends in disappointment.
 *
 * So every field below is derived from something the page renders:
 *
 *   * `name`, `description`, `url`, `inLanguage` — the course row.
 *   * `provider` — the platform, named once in `ORGANISATION`.
 *   * `offers` — **only when the page shows a price to this reader**, which
 *     depends on their country. A course with no price for somebody is marked
 *     up without an offer rather than with an invented one.
 *   * `aggregateRating` — **only when the reviews flag is on and there are
 *     reviews.** Ratings are real rows; an empty shelf has no rating, and
 *     emitting `0` would be a claim that nobody has rated it, which is not the
 *     same statement as "ratings are not open yet".
 *
 * The escaping in `serialise()` is not decoration. JSON-LD is injected inside a
 * `<script>` element, so a course title containing `</script>` would close the
 * element and turn a description into markup. `JSON.stringify` does not escape
 * `<`, and the characters below are escaped to `\uXXXX` so the payload stays
 * inert whatever a course is called.
 */

import { toMajorString, type Currency } from './money.ts';

export type JsonLd = Record<string, unknown>;

export const ORGANISATION = {
  name: 'AyahSpring',
  /** What the platform is for, in the words the site itself uses. */
  description:
    'Islamic learning for children and adults, worldwide. Qur’an, Arabic, Fiqh, Hadith and more — taught by qualified teachers.',
};

/**
 * The characters that can end a `<script>` element or a JSON line, escaped so a
 * course title cannot become markup.
 *
 * `\u2028` and `\u2029` are line separators: legal inside a JSON string and
 * illegal in a JavaScript string literal, so a parser reading this as JS rather
 * than JSON would break on a title containing one.
 */
export function escapeJsonLd(json: string): string {
  return json
    .replace(/</g, '\\u003c')
    .replace(/>/g, '\\u003e')
    .replace(/&/g, '\\u0026')
    .replace(/\u2028/g, '\\u2028')
    .replace(/\u2029/g, '\\u2029');
}

/** The string that goes inside the script tag. */
export function serialise(value: JsonLd | JsonLd[]): string {
  return escapeJsonLd(JSON.stringify(value));
}

/**
 * The platform as a thing with a name and a home.
 *
 * `logo` is emitted only when the deployment knows its own origin, because a
 * logo is an absolute URL and a relative one is a broken image to every consumer
 * of this graph. The same reasoning as the share card: no origin, no claim.
 */
export function organisationJsonLd(origin: string | null, logoPath = '/icon.svg'): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'EducationalOrganization',
    name: ORGANISATION.name,
    description: ORGANISATION.description,
    ...(origin ? { url: origin, logo: `${origin}${logoPath}` } : {}),
  };
}

/** The site itself, so a search engine can resolve the platform's own name. */
export function websiteJsonLd(origin: string | null): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'WebSite',
    name: ORGANISATION.name,
    ...(origin ? { url: origin } : {}),
  };
}

export type CourseFacts = {
  title: string;
  /** The author's summary, as the page prints it. Empty or null when there is none. */
  description: string | null;
  /** Path on this site, always starting with a slash. */
  path: string;
  language: string;
  /** Topic names the course is filed under, as shown on the page. */
  subjects: string[];
  /** Difficulty, in the word the page uses ("Intermediate"). */
  level: string | null;
  /** The lesson titles the page lists, in order. Real names, never "Lesson 1". */
  lessons: string[];
  /** The price this page showed, or null when it showed none. */
  offer: { amountMinor: string; currency: string } | null;
  /** Ratings, only when the page displays them and somebody has rated. */
  rating: { average: number; count: number } | null;
  /** Who teaches it, when the page names them. */
  teacherName: string | null;
};

/**
 * One course.
 *
 * Deliberately absent: `hasCourseInstance` (a live class is scheduled per cohort
 * and this page does not promise one), `coursePrerequisites` (nothing enforces
 * them), `educationalCredentialAwarded` (a completion certificate is not a
 * recognised credential and should not be marked up as one), and any duration
 * (the platform does not tell a learner how long a course takes, so it does not
 * tell a crawler either).
 */
export function courseJsonLd(facts: CourseFacts, origin: string | null): JsonLd {
  const url = origin ? `${origin}${facts.path}` : facts.path;

  // A decimal string, not a formatted one: schema.org wants a number or a
  // decimal string, and "£49.00" is neither. `toMajorString` is the same
  // conversion the rest of the platform prints with, including the currencies
  // that have no minor unit at all — so a JPY course is not marked up at
  // one hundred times its price.
  const price = facts.offer
    ? formatPrice(facts.offer.amountMinor, facts.offer.currency)
    : null;

  return {
    '@context': 'https://schema.org',
    '@type': 'Course',
    name: facts.title,
    ...(facts.description && facts.description.trim() !== ''
      ? { description: facts.description.trim() }
      : {}),
    url,
    inLanguage: facts.language,
    courseMode: 'online',
    provider: {
      '@type': 'EducationalOrganization',
      name: ORGANISATION.name,
      ...(origin ? { url: origin } : {}),
    },
    ...(facts.level ? { educationalLevel: facts.level } : {}),
    ...(facts.subjects.length > 0
      ? { about: facts.subjects.map((name) => ({ '@type': 'Thing', name })) }
      : {}),
    ...(facts.teacherName
      ? {
          author: { '@type': 'Person', name: facts.teacherName },
          instructor: { '@type': 'Person', name: facts.teacherName },
        }
      : {}),
    ...(facts.lessons.length > 0
      ? {
          hasPart: facts.lessons.map((name, i) => ({
            '@type': 'LearningResource',
            position: i + 1,
            name,
          })),
        }
      : {}),
    // Only what the page showed. A course with no price for this reader carries
    // no offer — an offer of 0 would say "free", which is a different course.
    ...(price !== null && facts.offer
      ? {
          offers: {
            '@type': 'Offer',
            category: 'Paid',
            price,
            priceCurrency: facts.offer.currency,
            availability: 'https://schema.org/InStock',
            url,
          },
        }
      : {}),
    ...(facts.rating && facts.rating.count > 0
      ? {
          aggregateRating: {
            '@type': 'AggregateRating',
            ratingValue: Math.round(facts.rating.average * 10) / 10,
            reviewCount: facts.rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
  };
}

/** The trail from the front door to this course, in the order a reader walked it. */
export function breadcrumbJsonLd(
  trail: Array<{ name: string; path: string }>,
  origin: string | null,
): JsonLd {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: trail.map((step, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: step.name,
      item: origin ? `${origin}${step.path}` : step.path,
    })),
  };
}

/**
 * The price as a decimal string, or null when the amount cannot be read.
 *
 * Delegates to `toMajorString` rather than dividing by 100, because a currency
 * with no minor unit — the shilling, the yen, the CFA franc — would be
 * published at a hundred times its price. An amount that does not parse as an
 * integer is treated as no price at all: marking up a course as free because a
 * string was malformed is worse than not marking it up.
 */
export function formatPrice(amountMinor: string, currency: string): string | null {
  let minor: bigint;
  try {
    minor = BigInt(amountMinor.trim());
  } catch {
    return null;
  }
  try {
    return toMajorString({ amountMinor: minor, currency: currency as Currency });
  } catch {
    return null;
  }
}
