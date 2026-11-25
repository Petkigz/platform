/**
 * Memorisation, said in the reader's language.
 *
 * The card on `/learn` and the list (`/hifz`) were English for everybody
 * until 2026-11-25. The sentences are the `hifz.` part. Two things are
 * written here instead, because they are numbers:
 *
 * - **a length of time** ("3 days"), by `Intl` in the reader's language and
 *   digits, but for three languages it writes badly for these sentences
 *   (`OWN_DAYS`).
 * - **the steps of the schedule**, a list of those lengths with the numbers
 *   the database sent. The list is separated plainly, by a comma: `Intl`'s
 *   own unit list writes "1 gün 3 gün 7 gün" in Turkish and "1天3天7天" in
 *   Chinese, which reads as one length rather than as seven.
 *
 * What stays as it is: **a lapse is not a failure.** The words say what
 * happened to a date and never what it means about the person; no language
 * here was given a word for "failed", "wrong" or "missed".
 *
 * Server only: it reads the catalogues. The board is a client component and
 * is handed its words, whole, counted and dated (`HifzBoardWords` in
 * `hifz-board-words.ts`); a refresh after every press brings new ones.
 */
import {
  countLabel,
  formatNumber,
  translator,
  type LocaleCode,
  type MessageKey,
} from './i18n/index.ts';
import type { HifzPassage, HifzRecord } from './hifz.ts';
import { HIFZ_EXAMPLE, type HifzBoardWords, type HifzRefusal, type PassageWords } from './hifz-board-words.ts';

/** The sentence for each name `/api/hifz` answers by. */
const REFUSAL_KEY: Record<HifzRefusal, MessageKey> = {
  not_enabled: 'hifz.eNotEnabled',
  not_allowed: 'hifz.eNotAllowed',
  label_required: 'hifz.eLabelRequired',
  label_too_long: 'hifz.eLabelTooLong',
  already_exists: 'hifz.eExists',
  bad_status: 'hifz.eBadStatus',
  bad_outcome: 'hifz.eBadOutcome',
  passage_not_found: 'hifz.eGone',
  // Said the same way wherever a session ends under somebody.
  not_signed_in: 'guard.eSignedOut',
  // "That could not be saved. Try again.": the roll of a live class says it too.
  refused: 'live.markFailed',
  unconfirmed: 'hifz.eUnconfirmed',
};

/**
 * Languages whose length of time is written here and not by the runtime.
 *
 * - Tajik has no unit data and would read "3 d".
 * - Arabic is given by the runtime in the case of a subject ("يومان"), and
 *   every sentence here puts the length after a preposition, where two days
 *   is "يومين". The forms below are the ones that follow a preposition, and
 *   the Arabic sentences are written so that the length always does.
 * - Traditional Chinese gets a space before 天 that the sentence around it
 *   does not want.
 */
const OWN_DAYS: Partial<Record<LocaleCode, (count: number, digits: string) => string>> = {
  tg: (_count, digits) => `${digits} рӯз`,
  'zh-hant': (_count, digits) => `${digits}天`,
  ar: (count, digits) => {
    if (count === 1) return 'يوم واحد';
    if (count === 2) return 'يومين';
    const tail = count % 100;
    if (tail >= 3 && tail <= 10) return `${digits} أيام`;
    if (tail >= 11) return `${digits} يومًا`;
    return `${digits} يوم`;
  },
};

/** What goes between two sentences, and between two items of a list. */
function joiners(code: LocaleCode): { sentence: string; item: string } {
  if (code === 'zh-hans' || code === 'zh-hant') return { sentence: '', item: '、' };
  if (code === 'ar' || code === 'ur' || code === 'fa' || code === 'fa-af') {
    return { sentence: ' ', item: '، ' };
  }
  return { sentence: ' ', item: ', ' };
}

export function hifzWords(code: LocaleCode) {
  const t = translator(code);
  const join = joiners(code);

  /** "1 day", "3 days", in the reader's language and digits. */
  const days = (count: number): string => {
    const whole = Math.max(0, Math.trunc(count));
    const own = OWN_DAYS[code];
    try {
      if (own) return own(whole, formatNumber(code, whole));
      return new Intl.NumberFormat(code, { style: 'unit', unit: 'day', unitDisplay: 'long' }).format(whole);
    } catch {
      return String(whole);
    }
  };

  /** When a review is due. Overdue is a fact about a date and nothing more. */
  const due = (daysUntilDue: number): string => {
    if (daysUntilDue === 0) return t('hifz.dueToday');
    if (daysUntilDue === 1) return t('hifz.dueTomorrow');
    if (daysUntilDue < 0) return t('hifz.overdue', { days: days(-daysUntilDue) });
    return t('hifz.dueIn', { days: days(daysUntilDue) });
  };

  /** The small line under a passage: how often, when next, and how often it went back. */
  const line = (passage: Pick<HifzPassage, 'reviewCount' | 'intervalDays' | 'lapses'>): string => {
    const parts = [
      passage.reviewCount <= 0
        ? t('hifz.notReviewed')
        : countLabel(code, passage.reviewCount, { one: 'hifz.reviewedOne', other: 'hifz.reviewedOther' }),
      t('hifz.nextIn', { days: days(Math.max(1, passage.intervalDays)) }),
    ];
    // "Once" is said for one and only one: several languages count nought as singular.
    if (passage.lapses === 1) parts.push(t('hifz.lapsedOne'));
    if (passage.lapses > 1) {
      parts.push(countLabel(code, passage.lapses, { one: 'hifz.lapsedOther', other: 'hifz.lapsedOther' }));
    }
    return parts.join(join.sentence);
  };

  /** The head of the page: counts, with no praise and no scolding. */
  const summary = (record: Pick<HifzRecord, 'counts'>): string => {
    const counts = record.counts;
    if (!counts || counts.passages <= 0) return t('hifz.sumEmpty');
    const parts = [
      countLabel(code, counts.passages, { one: 'hifz.sumPassagesOne', other: 'hifz.sumPassagesOther' }),
    ];
    if (counts.memorised > 0) {
      parts.push(countLabel(code, counts.memorised, { one: 'hifz.sumMemorised', other: 'hifz.sumMemorised' }));
    }
    if (counts.due <= 0) parts.push(t('hifz.sumDueNone'));
    else if (counts.due === 1) parts.push(t('hifz.sumDueOne'));
    else parts.push(countLabel(code, counts.due, { one: 'hifz.sumDueOther', other: 'hifz.sumDueOther' }));
    return parts.join(join.sentence);
  };

  /** The schedule, as a sentence with the real numbers from the database. */
  const ladder = (steps: number[] | undefined): string => {
    const real = (steps ?? []).filter((n) => Number.isFinite(n) && n > 0);
    const first = real[0];
    const last = real[real.length - 1];
    if (first === undefined || last === undefined) return t('hifz.ladderNone');
    return t('hifz.ladder', {
      first: days(first),
      steps: real.map(days).join(join.item),
      last: days(last),
    });
  };

  const refusals = Object.fromEntries(
    Object.entries(REFUSAL_KEY).map(([name, key]) => [name, t(key, { example: HIFZ_EXAMPLE })]),
  ) as Record<HifzRefusal, string>;

  /** Everything the board says about this record, made once on the server. */
  const board = (record: HifzRecord): HifzBoardWords => {
    const passages: Record<string, PassageWords> = {};
    for (const passage of record.passages ?? []) {
      passages[passage.id] = { due: due(passage.daysUntilDue), line: line(passage) };
    }
    return {
      eyebrow: t('nav.learn'),
      title: t('hifz.title'),
      summary: summary(record),
      dueToday: t('hifz.dueToday'),
      forFamily: t('hifz.forFamily'),
      nothingDue: t('hifz.nothingDue'),
      comingUp: t('hifz.comingUp'),
      addTitle: t('hifz.addTitle'),
      addLabel: t('hifz.addLabel'),
      addIt: t('hifz.addIt'),
      addHelp: t('hifz.addHelp'),
      howTitle: t('hifz.howTitle'),
      ladder: ladder(record.ladder),
      back: t('course.back'),
      badge: t('hifz.badge'),
      stillLearning: t('hifz.stillLearning'),
      memorisedIt: t('hifz.memorisedIt'),
      takeOff: t('hifz.takeOff'),
      keep: t('hifz.keep'),
      solid: { label: t('hifz.vSolid'), note: t('hifz.vSolidNote') },
      shaky: { label: t('hifz.vShaky'), note: t('hifz.vShakyNote') },
      added: t('hifz.addedNote'),
      movedOn: t('hifz.movedOn'),
      backTomorrow: t('hifz.backTomorrow'),
      archived: t('hifz.archived'),
      refusals,
      passages,
    };
  };

  return { t, days, due, line, summary, ladder, refusals, board };
}
