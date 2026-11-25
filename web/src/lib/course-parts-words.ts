/**
 * The switched parts of a course page and the sample lesson, said in the
 * reader's language: the `cparts.` part of the catalogue, with the handful
 * of sentences the catalogue already had ("Leave class", "Saving…",
 * "Cancel", "Version 3", the kinds of material).
 *
 * Two names are filled in here rather than typed into a sentence: "My
 * learning" (`nav.learn`) and "Saved courses" (`learn.saved`). A sentence
 * that points at a page says its name the way the page's own heading does,
 * in every language, because it is the same key.
 *
 * Server only: it reads the catalogues. The three components are handed
 * `ClassWords`, `SaveWords` and `ReviewWords` (`course-parts.ts`).
 *
 * Every number and every day is written out here too (`classLines`,
 * `reviewLines`) and handed over as finished text. The one thing a browser
 * still writes is a moment on the reader's own clock (`LocalTime`), because
 * only the browser knows the zone.
 */
import type { JoinableCohort } from './cohorts.ts';
import type { ClassLines, ClassWords, ReviewLines, ReviewWords, SaveWords } from './course-parts.ts';
import { fill, formatDay, formatNumber, pluralForm, translator, type LocaleCode, type MessageKey } from './i18n/index.ts';
import { RATING_MAX, RATING_MIN, REVIEW_BODY_MAX, type CourseReview, type ReviewSummary } from './reviews.ts';
import { SAVED_MAX } from './wishlist-shared.ts';

const STAR_KEY: Record<number, MessageKey> = {
  1: 'cparts.star1',
  2: 'cparts.star2',
  3: 'cparts.star3',
  4: 'cparts.star4',
  5: 'cparts.star5',
};

/** The kind of a sample's material. A kind this file does not know is "Resource". */
const KIND_KEY: Record<string, MessageKey> = {
  video: 'lesson.typeVideo',
  audio: 'lesson.typeAudio',
  document: 'lesson.typeDocument',
  worksheet: 'lesson.typeWorksheet',
  link: 'lesson.typeLink',
  quiz: 'lesson.typeQuiz',
  other: 'lesson.typeOther',
};

/** "4.3" as the language writes it: its digits, its decimal mark, one place. */
function oneDecimal(code: LocaleCode, value: number): string {
  try {
    return new Intl.NumberFormat(code, { minimumFractionDigits: 1, maximumFractionDigits: 1 }).format(value);
  } catch {
    return value.toFixed(1);
  }
}

/** The sentences with a number in them, for each class, by the class's id. */
export function classLines(
  code: LocaleCode,
  words: ClassWords,
  cohorts: readonly (Pick<JoinableCohort, 'id' | 'versionNumber' | 'capacity'> & {
    places: Pick<JoinableCohort['places'], 'activeMembers'>;
  })[],
): Record<string, ClassLines> {
  const n = (value: number) => formatNumber(code, value);
  const out: Record<string, ClassLines> = {};
  for (const cohort of cohorts) {
    const number = cohort.versionNumber === null ? null : n(cohort.versionNumber);
    out[cohort.id] = {
      version: number === null ? null : fill(words.version, { number }),
      places:
        cohort.capacity === null
          ? words.noLimit
          : cohort.places.activeMembers === null
            ? fill(words.limit, { count: n(cohort.capacity) })
            : fill(words.taken, { taken: n(cohort.places.activeMembers), capacity: n(cohort.capacity) }),
      full: cohort.capacity === null ? words.refusals.full : fill(words.full, { count: n(cohort.capacity) }),
      // The version could not be read, so the sentence that names one is not
      // said with a hole in it.
      needEnrolSelf: number === null ? words.refusals.not_enrolled : fill(words.needEnrolSelf, { number }),
      needEnrolFor:
        number === null ? words.refusals.not_enrolled : words.needEnrolFor.replaceAll('{number}', number),
    };
  }
  return out;
}

/** The average, the count, the bars and the days of the ratings panel. */
export function reviewLines(
  code: LocaleCode,
  words: ReviewWords,
  summary: ReviewSummary,
  reviews: readonly Pick<CourseReview, 'id' | 'createdAt'>[],
): ReviewLines {
  const n = (value: number) => formatNumber(code, value);
  return {
    average: oneDecimal(code, summary.average),
    count: fill(pluralForm(code, summary.count) === 'one' ? words.countOne : words.countOther, {
      count: n(summary.count),
    }),
    rows: Object.fromEntries(words.stars.map((star) => [star.value, n(summary.distribution[star.value] ?? 0)])),
    days: Object.fromEntries(reviews.map((r) => [r.id, formatDay(code, r.createdAt)])),
  };
}

export function coursePartsWords(code: LocaleCode) {
  const t = translator(code);
  const learning = t('nav.learn');

  const classes: ClassWords = {
    title: t('cparts.classesTitle'),
    body: t('cparts.classesBody'),
    paused: t('course.cohortPaused'),
    none: t('cparts.classesNone'),
    version: t('assign.version'),
    starts: t('course.cohortStarts'),
    ends: t('course.cohortEnds'),
    noEnd: t('cparts.classNoEnd'),
    taken: t('cparts.classTaken'),
    limit: t('cparts.classLimit'),
    noLimit: t('cparts.classNoLimit'),
    regClosed: t('cparts.regClosed'),
    regAtStart: t('cparts.regAtStart'),
    regCloses: t('cparts.regCloses'),
    badgeFull: t('cparts.badgeFull'),
    badgeOpen: t('cparts.badgeOpen'),
    who: t('cparts.whoJoining'),
    me: t('cpage.me'),
    needProfile: t('cparts.needProfile'),
    joinedSelf: t('cparts.joinedSelf'),
    joinedFor: t('cparts.joinedFor'),
    full: t('cparts.classFull'),
    joining: t('cparts.joining'),
    joinSelf: t('cparts.joinSelf'),
    joinFor: t('cparts.joinFor'),
    stopped: t('cparts.stopped'),
    stoppedRunning: t('cparts.stoppedRunning'),
    needEnrolSelf: t('cparts.needEnrolSelf'),
    needEnrolFor: t('cparts.needEnrolFor'),
    leave: t('course.cohortLeave'),
    leaving: t('course.cohortLeaving'),
    joinedDone: t('cparts.joinedDone'),
    leftDone: t('cparts.leftDone'),
    unconfirmed: t('cparts.classUnconfirmed'),
    foot: t('cparts.classesFoot'),
    learning: t('cparts.classesLearning', { learning }),
    refusals: {
      full: t('cparts.errClassFull'),
      closed: t('cparts.stopped'),
      not_enrolled: t('cparts.errClassEnrol'),
      already: t('cparts.errClassAlready'),
    },
  };

  const savedCount = formatNumber(code, SAVED_MAX);
  const save: SaveWords = {
    signIn: t('cparts.saveSignIn'),
    save: t('cparts.save'),
    saving: t('course.saving'),
    savedRemove: t('cparts.savedRemove'),
    noteEdit: t('cparts.noteEdit'),
    noteAdd: t('cparts.noteAdd'),
    noteLabel: t('cparts.noteLabel'),
    notePlaceholder: t('cparts.notePlaceholder'),
    noteSave: t('cparts.noteSave'),
    cancel: t('action.cancel'),
    yourNote: t('cparts.yourNote'),
    noNote: t('cparts.noNote'),
    max: t('cparts.savedMax', { count: savedCount }),
    savedDone: t('cparts.savedDone', { saved: t('learn.saved'), learning }),
    removedDone: t('cparts.removedDone'),
    noteSaved: t('cparts.noteSaved'),
    unconfirmed: t('cparts.saveUnconfirmed'),
    refusals: {
      limit: t('cparts.errSaveLimit', { count: savedCount }),
      gone: t('cparts.errSaveGone'),
    },
  };

  const stars: ReviewWords['stars'] = Array.from({ length: RATING_MAX - RATING_MIN + 1 }, (_, i) => {
    const value = i + RATING_MIN;
    const digit = formatNumber(code, value);
    return { value, digit, label: `${digit} — ${t(STAR_KEY[value] ?? 'cparts.star3')}` };
  });

  const reviews: ReviewWords = {
    title: t('cparts.revTitle'),
    body: t('cparts.revBody'),
    none: t('cparts.revNone'),
    outOf: t('cparts.revOutOf', { max: formatNumber(code, RATING_MAX) }),
    countOne: t('cparts.revCountOne'),
    countOther: t('cparts.revCountOther'),
    stars,
    write: t('cparts.revWrite'),
    update: t('cparts.revUpdate'),
    yourRating: t('cparts.revYourRating'),
    sayMore: t('cparts.revSayMore'),
    placeholder: t('cparts.revPlaceholder'),
    submit: t('cparts.revSubmit'),
    saving: t('course.saving'),
    remove: t('cparts.revRemove'),
    rule: t('cparts.revRule'),
    needEnrol: t('cparts.revNeedEnrol'),
    signIn: t('cparts.revSignIn'),
    anon: t('cparts.revAnon'),
    mine: t('cparts.revMine'),
    held: t('cparts.revHeld'),
    withdrawn: t('cparts.revWithdrawn'),
    withdrawnWhy: t('cparts.revWithdrawnWhy'),
    choose: t('cparts.revChoose'),
    thanks: t('cparts.revThanks'),
    removed: t('cparts.revRemoved'),
    unconfirmed: t('cparts.revUnconfirmed'),
    refusals: {
      not_enrolled: t('cparts.errRevEnrol'),
      own_course: t('cparts.errRevOwn'),
      too_long: t('cparts.errRevLong', { max: formatNumber(code, REVIEW_BODY_MAX) }),
    },
  };

  /** The sample lesson a visitor may open before enrolling. */
  const preview = {
    free: t('cparts.prevFree'),
    sample: (version: number) => t('cparts.prevSample', { number: formatNumber(code, version) }),
    content: t('cparts.prevContent'),
    empty: t('cparts.prevEmpty'),
    back: t('lesson.backToCourse'),
    kind: (type: string) => t(KIND_KEY[type] ?? 'lesson.typeOther'),
  };

  return { classes, save, reviews, preview };
}
