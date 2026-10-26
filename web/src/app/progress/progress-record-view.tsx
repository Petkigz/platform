import Link from 'next/link';

import {
  badgeFraction,
  badgeProgress,
  barWidth,
  calendarWeeks,
  courseSummary,
  earnedCount,
  monthLabels,
  orderBadges,
  prettyDate,
  streakHeadline,
  type ProgressRecord,
} from '@/lib/progress-record';

const WEEKDAY_INITIALS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

/**
 * The record, drawn.
 *
 * Pure presentation: every number comes from `learner_progress_record()` and
 * every sentence from `/lib/progress-record.ts`, so nothing here can disagree
 * with the database about what a streak is or when a badge was earned.
 *
 * The calendar is the one deliberate flourish. A learner who has studied on
 * scattered days sees scattered squares; a learner in the middle of a streak
 * sees a run. That is the mechanic — the days are the reward — and it is the
 * reason this page exists rather than another number.
 */
export function ProgressRecordView({
  record,
  isSelf,
}: {
  record: ProgressRecord;
  /** False when a guardian is looking at a child's record. */
  isSelf: boolean;
}) {
  const weeks = calendarWeeks(record.studyDays, record.today, { weeks: 12 });
  const months = monthLabels(weeks);
  const badges = orderBadges(record.badges);
  const earned = earnedCount(record.badges);
  const who = isSelf ? 'you' : (record.displayName ?? 'they');

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/learn">My learning</Link>
      </p>
      <h1>{isSelf ? 'Your progress' : `${record.displayName ?? 'A learner'}'s progress`}</h1>
      <p className="lede">
        {isSelf
          ? 'Where you have got to, and what is next. Everything here is worked out from the lessons you have finished — nothing is counted twice and nothing is stored separately.'
          : `Where ${record.displayName ?? 'this learner'} has got to. Everything here is worked out from the lessons they have finished.`}
      </p>

      {/* Streak and totals ------------------------------------------------- */}
      <section className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="grid cols-2">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>Streak</p>
            <p style={{ fontSize: '1.35rem', fontWeight: 650, margin: '0.25rem 0' }}>
              {record.streakDays === 1 ? '1 day' : `${record.streakDays} days`}
            </p>
            <p className="muted" style={{ marginTop: 0 }}>
              {streakHeadline(record.streakDays, record.longestStreakDays, isSelf ? 'you' : 'they')}
            </p>
          </div>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>In total</p>
            <ul style={{ margin: '0.35rem 0 0', paddingLeft: 0, listStyle: 'none' }}>
              <li>
                <strong>{record.totals.lessonsCompleted}</strong>{' '}
                {record.totals.lessonsCompleted === 1 ? 'lesson' : 'lessons'} finished
              </li>
              <li>
                <strong>{record.totals.coursesCompleted}</strong>{' '}
                {record.totals.coursesCompleted === 1 ? 'course' : 'courses'} completed
              </li>
              <li>
                <strong>{record.totals.certificates}</strong>{' '}
                {record.totals.certificates === 1 ? 'certificate' : 'certificates'}
              </li>
              <li>
                <strong>{record.totals.studyDays}</strong>{' '}
                {record.totals.studyDays === 1 ? 'day' : 'days'} of study
              </li>
            </ul>
          </div>
        </div>
        {record.lastActiveOn && (
          <p className="muted" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
            Last finished a lesson on {prettyDate(record.lastActiveOn)} · days counted in{' '}
            {record.timezone}
          </p>
        )}
      </section>

      {/* The calendar ------------------------------------------------------ */}
      <section className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ marginTop: 0 }}>The last twelve weeks</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          A filled square is a day {who} finished at least one lesson.
        </p>
        <div className="study-calendar" role="img"
          aria-label={`${record.totals.studyDays} study days recorded; ${record.streakDays} in a row at present`}
        >
          <div className="study-calendar-months">
            <span className="study-calendar-gutter" aria-hidden="true" />
            {months.map((m, i) => (
              <span key={i} className="study-calendar-month">{m ?? ''}</span>
            ))}
          </div>
          <div className="study-calendar-body">
            <div className="study-calendar-weekdays" aria-hidden="true">
              {WEEKDAY_INITIALS.map((d, i) => (
                <span key={i}>{i % 2 === 1 ? d : ''}</span>
              ))}
            </div>
            {weeks.map((week, w) => (
              <div key={w} className="study-calendar-week">
                {week.map((day) => (
                  <span
                    key={day.date}
                    className={day.studied ? 'study-day on' : 'study-day'}
                    title={prettyDate(day.date)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Badges ------------------------------------------------------------ */}
      <section className="section">
        <h2>Badges</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {earned} of {record.badges.length} earned. A badge is a milestone, not a purchase —
          it appears the moment the learning behind it exists, and nothing is taken away.
        </p>
        <div className="grid cols-2">
          {badges.map((badge) => (
            <div
              className={badge.earned ? 'card badge-card earned' : 'card badge-card'}
              key={badge.code}
            >
              <div className="outline-h">
                <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: '1.05rem' }}>
                  {badge.name}
                </h3>
                <span className={badge.earned ? 'badge ok' : 'badge neutral'}>
                  {badge.earned ? 'Earned' : 'Not yet'}
                </span>
              </div>
              <p className="muted" style={{ margin: '0.4rem 0' }}>{badge.description}</p>
              {!badge.earned && badge.need > 1 && (
                <div
                  className="progress"
                  role="progressbar"
                  aria-valuenow={Math.round(badgeFraction(badge) * 100)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${badge.name} progress`}
                >
                  <span style={{ width: barWidth(badgeFraction(badge) * 100) }} />
                </div>
              )}
              <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>
                {badgeProgress(badge)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Courses ----------------------------------------------------------- */}
      <section className="section">
        <h2>Courses</h2>
        <p className="muted" style={{ marginTop: 0 }}>{courseSummary(record.courses)}</p>
        {record.courses.length === 0 ? (
          <p className="empty">
            <Link href="/catalogue">Browse the catalogue</Link>
          </p>
        ) : (
          <div className="grid cols-2">
            {record.courses.map((course) => (
              <div className="card" key={course.enrolmentId}>
                <div className="outline-h">
                  <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: '1.05rem' }}>
                    {course.courseTitle}
                  </h3>
                  {course.status === 'completed' && <span className="badge ok">Finished</span>}
                </div>
                <div
                  className="progress"
                  style={{ marginTop: '0.6rem' }}
                  role="progressbar"
                  aria-valuenow={Math.round(course.percentComplete)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={`${course.courseTitle} progress`}
                >
                  <span style={{ width: barWidth(course.percentComplete) }} />
                </div>
                <p className="muted" style={{ marginTop: '0.4rem', marginBottom: 0 }}>
                  {course.lessonsDone} of {course.lessonsTotal} lessons ·{' '}
                  {Math.round(course.percentComplete)}%
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Certificates ------------------------------------------------------ */}
      {record.certificates.length > 0 && (
        <section className="section">
          <h2>Certificates</h2>
          <ul>
            {record.certificates.map((cert) => (
              <li key={cert.certificateNumber}>
                <strong>{cert.courseTitle}</strong> · {cert.certificateNumber} · issued{' '}
                {prettyDate(cert.issuedOn)}
                {cert.status === 'revoked' && (
                  <span className="badge neutral" style={{ marginLeft: '0.4rem' }}>Revoked</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
        {' · '}
        <Link href="/catalogue">Find something new</Link>
      </p>
    </div>
  );
}
