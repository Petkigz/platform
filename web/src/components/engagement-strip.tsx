import { describeStreak, type Engagement } from '@/lib/engagement';

/**
 * The streak and the badges, as one strip.
 *
 * It is deliberately presentational: every number is already decided by
 * `learner_engagement()` and every sentence by `describeStreak`, so this file cannot
 * disagree with the database about what a streak is. It is used twice — on the
 * learner's own dashboard and on each child's card in the family view — and the only
 * difference is the wording of "whose".
 *
 * A child's card passes `subject` so the sentence reads "Muhammad is on a 4-day streak"
 * rather than "you are": a guardian is looking at somebody else, and a strip that says
 * "you" on a child's card would be a lie about who did the work.
 */
export function EngagementStrip({
  engagement,
  subject,
}: {
  engagement: Engagement;
  /** The child's name, when the reader is not that learner. */
  subject?: string;
}) {
  const who = subject ?? 'you';
  const isYou = subject === undefined;

  const lessons =
    engagement.lessonsCompleted === 1
      ? '1 lesson finished'
      : `${engagement.lessonsCompleted} lessons finished`;

  const best =
    engagement.longestStreakDays > engagement.streakDays
      ? ` · ${isYou ? 'your' : 'their'} best is ${engagement.longestStreakDays}`
      : '';

  const prompt =
    engagement.streakDays === 0
      ? isYou
        ? ' · finish one lesson today to start'
        : ' · a lesson today would start one'
      : isYou
        ? ' · come back tomorrow to keep it going'
        : ' · one lesson tomorrow keeps it going';

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
          {isYou ? 'This week' : 'Streak'}
        </p>
        <strong style={{ fontSize: '1.2rem' }}>
          {isYou ? describeStreak(engagement.streakDays) : `${who} — ${describeStreak(engagement.streakDays).toLowerCase()}`}
        </strong>
        <p className="muted" style={{ margin: '0.2rem 0 0' }}>
          {lessons}
          {best}
          {prompt}
        </p>
      </div>
      {engagement.badges.length > 0 && (
        <ul className="chips" style={{ margin: 0, listStyle: 'none', padding: 0 }}>
          {engagement.badges.map((badge) => (
            <li key={badge.code}>
              <span className="badge" title={badge.description}>
                {badge.name}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
