import Link from 'next/link';
import {
  AUDIENCE_LABEL,
  DIFFICULTY_LABEL,
  displayVersion,
  languagesFor,
  subjectNames,
  type CatalogueCourse,
} from '@/lib/catalogue';
import { contentLine, isPriced, type CourseCard } from '@/lib/catalogue-cards';
import { offeringLabel } from '@/lib/enrolment';

const offeringLabelFor = (card: CourseCard | null | undefined, code: LocaleCode): string | null =>
  card ? offeringLabel(card.offering, code) : null;
import { textProps } from '@/lib/language';
import { isLocaleCode, translator, type LocaleCode } from '@/lib/i18n';
import { ArabicInline } from '@/app/_shared/arabic-text';

/**
 * One course, as it appears on any shelf.
 *
 * This was three near-identical copies — the catalogue, the children's door and
 * the adults' door — which is three places to change whenever a card gains a
 * field and two places to forget. It is a server component with no client
 * JavaScript: a shelf of forty cards should cost nothing to render.
 *
 * Two questions are answered above the badges: **what is in it** (sections,
 * lessons, a duration where one is known) and **what it costs me** (resolved by
 * the same reader the enrol button uses, per visitor, in that course's own
 * currency). Everything else on the card is what the course says about itself.
 *
 * A `card` of null is a shelf that could not be answered. The card still
 * renders — the course exists and its title is not in doubt — but the price and
 * the content line are silent rather than guessed.
 */
export function CourseShelfCard({
  course,
  card,
  locale = 'en',
}: {
  course: CatalogueCourse;
  card?: CourseCard | null;
  /** The language the shelf is in — the badges, the price words and the
      content line follow it. The course's own title does not: it is the
      author's, and it is rendered as written. */
  locale?: LocaleCode;
}) {
  const code: LocaleCode = isLocaleCode(locale) ? locale : 'en';
  const t = translator(code);
  const version = displayVersion(course);
  const price = offeringLabelFor(card, code);
  const content = contentLine(card, code);

  // Three states, three styles. A figure is a charge; "Included" is access the
  // buyer already holds; "Free" is the platform's own, and anything else —
  // "Not available in your country yet" — is deliberately not dressed up as a
  // price, because a pill that looks like a charge for a course nobody here can
  // buy is a support case waiting to happen.
  const tone =
    card === null || card === undefined
      ? 'card-price unavailable'
      : isPriced(card) || card.offering.kind === 'free'
        ? 'card-price'
        : card.offering.kind === 'entitled'
          ? 'card-price included'
          : 'card-price unavailable';

  return (
    <article className="card">
      <div className="card-head">
        <Link href={`/courses/${course.slug}`} className="course" style={{ display: 'block' }}>
          {/* A shelf is where a course in Arabic is first met, so this is the one
              place the title has to be readable without opening anything. The
              stored language code gives the block its `lang`; the runs inside it
              get the face and the spacing, because a mixed title should not set
              its English half in a Naskh font. */}
          <span className="title" {...textProps(course.language_code)}>
            <ArabicInline text={course.title} />
          </span>
        </Link>
        {price && <span className={tone}>{price}</span>}
      </div>

      {course.description && (
        <p className="muted" style={{ fontSize: '0.92rem', margin: '0.4rem 0 0' }}>
          <ArabicInline
            text={
              course.description.length > 180
                ? `${course.description.slice(0, 180).trimEnd()}\u2026`
                : course.description
            }
          />
        </p>
      )}

      {content && <p className="card-content">{content}</p>}

      <div className="badges" style={{ marginTop: '0.7rem' }}>
        <span className="badge">
          {course.audience === 'child'
            ? t('audience.child')
            : course.audience === 'adult'
              ? t('audience.adult')
              : (AUDIENCE_LABEL[course.audience] ?? course.audience)}
        </span>
        <span className="badge">
          {course.difficulty === 'beginner'
            ? t('difficulty.beginner')
            : course.difficulty === 'intermediate'
              ? t('difficulty.intermediate')
              : course.difficulty === 'advanced'
                ? t('difficulty.advanced')
                : (DIFFICULTY_LABEL[course.difficulty] ?? course.difficulty)}
        </span>
        {languagesFor(course).map((l) => (
          <span key={l} className="badge neutral">{l.toUpperCase()}</span>
        ))}
        {subjectNames(version).slice(0, 3).map((s) => (
          <span key={s} className="badge neutral">{s}</span>
        ))}
      </div>
    </article>
  );
}
