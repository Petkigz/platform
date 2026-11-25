import type { Engagement } from '@/lib/engagement';
import type { LocaleCode } from '@/lib/i18n';
import { progressWords } from '@/lib/progress-words';

/**
 * The streak and the badges, as one strip.
 *
 * It is deliberately presentational: every number is already decided by
 * `learner_engagement()` and every sentence by `progressWords`, so this file
 * cannot disagree with the database about what a streak is. It is used twice,
 * on the learner's own dashboard and on each child's card in the family view,
 * and the only difference is the wording of "whose".
 *
 * A child's card passes `subject` so the strip is about the child: a guardian
 * is looking at somebody else, and a strip that says "you" on a child's card
 * would be a lie about who did the work.
 *
 * **In the reader's language** since 2026-11-25 (`code`, the language the
 * page around it is written in). It was English on every page, and marked.
 * A badge this site has no words for keeps the database's name, in English,
 * and says so to the browser.
 */
export function EngagementStrip({
  engagement,
  subject,
  code,
}: {
  engagement: Engagement;
  /** The child's name, when the reader is not that learner. */
  subject?: string;
  /** The language the page is written in for this reader. */
  code: LocaleCode;
}) {
  const words = progressWords(code);
  const isYou = subject === undefined;
  const streak = words.streak(engagement.streakDays);

  return (
    <div
      className="row"
      style={{
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '0.75rem',
      }}
    >
      <div>
        <p className="eyebrow" style={{ margin: 0 }}>
          {words.t(isYou ? 'prog.thisWeek' : 'prog.streak')}
        </p>
        <strong style={{ fontSize: '1.2rem' }}>
          {isYou ? streak : <><bdi>{subject}</bdi> — {streak.toLocaleLowerCase(code)}</>}
        </strong>
        <p className="muted" style={{ margin: '0.2rem 0 0' }}>
          {words.strip(engagement, isYou ? 'you' : 'they')}
        </p>
      </div>
      {engagement.badges.length > 0 && (
        <ul className="chips" style={{ margin: 0, listStyle: 'none', padding: 0 }}>
          {engagement.badges.map((badge) => {
            const name = words.badgeName(badge);
            return (
              <li key={badge.code}>
                {name ? (
                  <span className="badge" title={words.badgeWhy(badge) ?? undefined}>{name}</span>
                ) : (
                  <span className="badge" title={badge.description} lang="en" dir="ltr">{badge.name}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
