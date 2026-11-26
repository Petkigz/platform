import Link from 'next/link';

import { Say } from '@/components/say';
import { pluralForm, type LocaleCode, type MessageKey } from '@/lib/i18n';
import {
  badgeFraction,
  barWidth,
  calendarWeeks,
  earnedCount,
  orderBadges,
  type ProgressRecord,
} from '@/lib/progress-record';
import { progressWords } from '@/lib/progress-words';

/**
 * The record, drawn.
 *
 * Pure presentation: every number comes from `learner_progress_record()` and
 * every sentence from `lib/progress-words.ts`, so nothing here can disagree
 * with the database about what a streak is or when a badge was earned.
 *
 * The calendar is the one deliberate flourish. A learner who has studied on
 * scattered days sees scattered squares; a learner in the middle of a streak
 * sees a run. That is the mechanic: the days are the reward, and it is the
 * reason this page exists rather than another number.
 *
 * **In the reader's language** since 2026-11-25: the sentences, the digits,
 * the months and the letters of the weekdays. What stays as it was written:
 * a course's title, a learner's name, a certificate's number, the name of a
 * time zone, and a badge the site has no words for, which keeps the
 * database's English name and is marked as English.
 */
export function ProgressRecordView({
  record,
  isSelf,
  code,
}: {
  record: ProgressRecord;
  /** False when a guardian is looking at a child's record. */
  isSelf: boolean;
  /** The language this page is written in for this reader. */
  code: LocaleCode;
}) {
  const words = progressWords(code);
  const { t, num } = words;
  const weeks = calendarWeeks(record.studyDays, record.today, { weeks: 12 });
  // A month is named over the first week that begins in it. "Begins in it" is
  // asked of the reader's own calendar: Persian is given Persian months, so
  // the name has to change where that calendar's month does.
  let month = '';
  const months = weeks.map((week) => {
    const label = week[0] ? words.month(week[0].date) : '';
    if (!label || label === month) return '';
    month = label;
    return label;
  });
  const badges = orderBadges(record.badges);
  const who = isSelf ? 'you' : 'they';
  // A name inside a sentence keeps its own direction.
  const name = record.displayName ? <bdi>{record.displayName}</bdi> : t('prog.thisLearner');
  const total = (count: number, keys: { one: MessageKey; other: MessageKey }) => (
    <Say text={t(pluralForm(code, count) === 'one' ? keys.one : keys.other)} parts={{ count: <strong>{num(count)}</strong> }} />
  );

  return (
    <>
      <p className="eyebrow">
        <Link href="/learn">{t('nav.learn')}</Link>
      </p>
      <h1>
        {isSelf ? t('prog.yours') : record.displayName ? <Say text={t('prog.theirs')} parts={{ name }} /> : t('prog.someone')}
      </h1>
      <p className="lede">
        {isSelf ? t('prog.ledeYou') : <Say text={t('prog.ledeThem')} parts={{ name }} />}
      </p>

      {/* Streak and totals ------------------------------------------------- */}
      <section className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <div className="grid cols-2">
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>{t('prog.streak')}</p>
            <p style={{ fontSize: '1.35rem', fontWeight: 650, margin: '0.25rem 0' }}>
              {words.days(record.streakDays)}
            </p>
            <p className="muted" style={{ marginTop: 0 }}>
              {words.headline(record.streakDays, record.longestStreakDays, who)}
            </p>
          </div>
          <div>
            <p className="eyebrow" style={{ margin: 0 }}>{t('prog.inTotal')}</p>
            <ul style={{ margin: '0.35rem 0 0', paddingInlineStart: 0, listStyle: 'none' }}>
              <li>{total(record.totals.lessonsCompleted, { one: 'prog.lessonsDoneOne', other: 'prog.lessonsDoneOther' })}</li>
              <li>{total(record.totals.coursesCompleted, { one: 'prog.coursesDoneOne', other: 'prog.coursesDoneOther' })}</li>
              <li>{total(record.totals.certificates, { one: 'prog.certsOne', other: 'prog.certsOther' })}</li>
              <li>{total(record.totals.studyDays, { one: 'prog.studyDaysOne', other: 'prog.studyDaysOther' })}</li>
            </ul>
          </div>
        </div>
        {record.lastActiveOn && (
          <p className="muted" style={{ marginBottom: 0, fontSize: '0.85rem' }}>
            <Say
              text={t('prog.lastActive')}
              parts={{ date: words.day(record.lastActiveOn), zone: <bdi dir="ltr">{record.timezone}</bdi> }}
            />
          </p>
        )}
      </section>

      {/* The calendar ------------------------------------------------------ */}
      <section className="card" style={{ padding: '1.25rem', marginBottom: '1.25rem' }}>
        <h2 style={{ marginTop: 0 }}>{t('prog.weeks')}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {isSelf ? t('prog.squareYou') : <Say text={t('prog.squareThey')} parts={{ name }} />}
        </p>
        <div
          className="study-calendar"
          role="img"
          aria-label={t('prog.calendarLabel', { days: num(record.totals.studyDays), row: num(record.streakDays) })}
        >
          <div className="study-calendar-months">
            <span className="study-calendar-gutter" aria-hidden="true" />
            {months.map((m, i) => (
              <span key={i} className="study-calendar-month">{m}</span>
            ))}
          </div>
          <div className="study-calendar-body">
            <div className="study-calendar-weekdays" aria-hidden="true">
              {[0, 1, 2, 3, 4, 5, 6].map((d) => (
                <span key={d}>{d % 2 === 1 ? words.weekday(d) : ''}</span>
              ))}
            </div>
            {weeks.map((week, w) => (
              <div key={w} className="study-calendar-week">
                {week.map((day) => (
                  <span
                    key={day.date}
                    className={day.studied ? 'study-day on' : 'study-day'}
                    title={words.day(day.date)}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Badges ------------------------------------------------------------ */}
      <section className="section">
        <h2>{t('prog.badges')}</h2>
        <p className="muted" style={{ marginTop: 0 }}>
          {t('prog.badgesLede', { earned: num(earnedCount(record.badges)), total: num(record.badges.length) })}
        </p>
        <div className="grid cols-2">
          {badges.map((badge) => {
            const known = words.badgeName(badge);
            // A badge the site has no words for keeps the database's, as English.
            const english = known ? {} : ({ lang: 'en', dir: 'ltr' } as const);
            const title = known ?? badge.name;
            return (
              <div className={badge.earned ? 'card badge-card earned' : 'card badge-card'} key={badge.code}>
                <div className="outline-h">
                  <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: '1.05rem' }} {...english}>{title}</h3>
                  <span className={badge.earned ? 'badge ok' : 'badge neutral'}>
                    {t(badge.earned ? 'prog.earned' : 'prog.notYet')}
                  </span>
                </div>
                <p className="muted" style={{ margin: '0.4rem 0' }} {...english}>
                  {words.badgeWhy(badge) ?? badge.description}
                </p>
                {!badge.earned && badge.need > 1 && (
                  <div
                    className="progress"
                    role="progressbar"
                    aria-valuenow={Math.round(badgeFraction(badge) * 100)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={t('prog.barLabel', { name: title })}
                  >
                    <span style={{ width: barWidth(badgeFraction(badge) * 100) }} />
                  </div>
                )}
                <p style={{ margin: '0.35rem 0 0', fontSize: '0.9rem' }}>{words.badgeProgress(badge)}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* Courses ----------------------------------------------------------- */}
      <section className="section">
        <h2>{t('share.courses')}</h2>
        <p className="muted" style={{ marginTop: 0 }}>{words.courseSummary(record.courses)}</p>
        {record.courses.length === 0 ? (
          <p className="empty">
            <Link href="/catalogue">{t('home.browse')}</Link>
          </p>
        ) : (
          <div className="grid cols-2">
            {record.courses.map((course) => (
              <div className="card" key={course.enrolmentId}>
                <div className="outline-h">
                  {/* A title with no place to break (one long word, a pasted
                      address) is broken anywhere: in this row it is a flex
                      item, which is otherwise never narrower than its longest
                      word, and it pushed the whole page sideways. */}
                  <h3 style={{ marginTop: 0, marginBottom: 0, fontSize: '1.05rem', minWidth: 0, overflowWrap: 'anywhere' }}>
                    <bdi>{course.courseTitle}</bdi>
                  </h3>
                  {course.status === 'completed' && <span className="badge ok">{t('family.stFinished')}</span>}
                </div>
                <div
                  className="progress"
                  style={{ marginTop: '0.6rem' }}
                  role="progressbar"
                  aria-valuenow={Math.round(course.percentComplete)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label={t('prog.barLabel', { name: course.courseTitle })}
                >
                  <span style={{ width: barWidth(course.percentComplete) }} />
                </div>
                <p className="muted" style={{ marginTop: '0.4rem', marginBottom: 0 }}>
                  {t('learn.lessonsDone', {
                    done: num(course.lessonsDone),
                    total: num(course.lessonsTotal),
                    percent: words.percent(course.percentComplete),
                  })}
                </p>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Certificates ------------------------------------------------------ */}
      {record.certificates.length > 0 && (
        <section className="section">
          <h2>{t('nav.certificates')}</h2>
          <ul>
            {record.certificates.map((cert) => (
              <li key={cert.certificateNumber} style={{ overflowWrap: 'anywhere' }}>
                <strong><bdi>{cert.courseTitle}</bdi></strong>{' · '}
                <Say
                  text={t('prog.certIssued')}
                  parts={{ number: <bdi dir="ltr">{cert.certificateNumber}</bdi>, date: words.day(cert.issuedOn) }}
                />
                {cert.status === 'revoked' && (
                  <span className="badge neutral" style={{ marginInlineStart: '0.4rem' }}>{t('prog.revoked')}</span>
                )}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">{t('course.back')}</Link>
        {' · '}
        <Link href="/catalogue">{t('prog.findNew')}</Link>
      </p>
    </>
  );
}
