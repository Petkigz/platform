import { cookies, headers } from 'next/headers';

import { LOCALE_COOKIE, chooseLocale, languageShownFor } from '@/lib/i18n';
import type { translator } from '@/lib/i18n';
import type { AuthorKind, Board, BoardOutcome } from '@/lib/boards';
import type { BoardWords } from './board-forms';

/** The language a discussion page is written in for this reader, and whether that is the one they chose. */
export async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'board') };
}

/** What a read answers when the request itself could not be made. */
export const READ_FAILED = { data: null, error: { code: null, message: 'the request could not be made' } };

type T = ReturnType<typeof translator>;

export const boardName = (t: T, board: Board): string => t(board === 'students' ? 'board.students' : 'board.teachers');

export const kindName = (t: T, kind: AuthorKind): string =>
  t(kind === 'student' ? 'board.kindStudent' : kind === 'teacher' ? 'board.kindTeacher' : 'board.kindStaff');

/** A sentence for every name the route can answer with, so no reply is ever shown as it arrived. */
function reasons(t: T): Record<BoardOutcome, string> {
  return {
    not_signed_in: t('buy.signedOut'),
    closed: t('board.closed'),
    not_allowed: t('board.whyOut'),
    not_found: t('board.whyGone'),
    no_handle: t('board.nameLead'),
    blocked: t('board.whyBlocked'),
    handle_shape: t('board.whyShape'),
    handle_taken: t('board.whyTaken'),
    handle_reserved: t('board.whyTaken'),
    handle_fixed: t('board.nameFixed'),
    title_length: t('board.whyEmpty'),
    body_length: t('board.whyEmpty'),
    reason_length: t('board.reportField'),
    // The staff desk's, which is in English and never asks this page.
    reason_required: t('board.reportField'),
    too_many: t('board.whyTooMany'),
    own_post: t('board.whyOwn'),
    already_reported: t('board.whyReported'),
    refused: t('inst.failed'),
    unconfirmed: t('inst.unsure'),
  };
}

/**
 * What the forms say, in the page's language. Handed over as words because
 * the forms run in the browser and the catalogue for these pages stays on
 * the server.
 */
export function boardWords(t: T): BoardWords {
  return {
    nameField: t('board.nameField'),
    nameSave: t('board.nameSave'),
    fieldTitle: t('board.fieldTitle'),
    fieldBody: t('board.fieldBody'),
    send: t('board.send'),
    report: t('board.report'),
    reportField: t('board.reportField'),
    reportSend: t('board.reportSend'),
    reported: t('board.reported'),
    takeBack: t('board.takeBack'),
    working: t('auth.working'),
    unreachable: t('auth.offline'),
    reasons: reasons(t),
  };
}
