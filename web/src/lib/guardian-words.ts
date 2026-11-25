/**
 * Guardian consent, from the parent's side, said in the reader's language.
 *
 * `guardian-consent.ts` holds the same sentences in English. The staff queue
 * still reads those, and so do the tests of the arithmetic. This is what
 * `/family/guardians` draws with since 2026-11-25: every sentence is a key in
 * the `guard.` part, every date is written in the reader's calendar and every
 * count in the form its language wants.
 *
 * Three things differ from the English originals, each because a sentence
 * built by gluing words together does not survive translation:
 *
 * 1. **The method is a line of its own** ("How it is confirmed: a video
 *    call"), not a phrase inside another sentence ("verified by a video
 *    call"), which would need the method in a different case in most of
 *    these languages.
 * 2. **Each permission is a sentence**, not an item in a list joined by
 *    commas.
 * 3. **The line about a policy that is not in force stops before the
 *    instruction to publish one.** That instruction is for staff; a parent
 *    cannot act on it.
 *
 * What a person wrote is never translated: the reviewer's reason and the
 * reason for a withdrawal are shown as written, by the page.
 *
 * Server only: it reads the catalogues. The two forms are handed their
 * words as plain strings (`formWords`, `actionWords`).
 */
import { daysUntil, type MyConsent } from './guardian-consent.ts';
import type {
  ConsentActionWords,
  ConsentFormWords,
  GuardianRefusals,
} from './guardian-outcome.ts';
import {
  countLabel,
  formatDay,
  translator,
  type LocaleCode,
  type MessageKey,
} from './i18n/index.ts';

const METHOD: Record<string, MessageKey> = {
  video_call: 'guard.mVideo',
  id_document: 'guard.mDocument',
  in_person: 'guard.mPerson',
  signed_declaration: 'guard.mSigned',
};

export function guardianWords(code: LocaleCode) {
  const t = translator(code);
  const day = (iso: string | null | undefined): string => formatDay(code, iso);

  /** The parent's state, in one word. A refusal and a withdrawal are told apart by the last decision. */
  const state = (consent: Pick<MyConsent, 'status' | 'lastDecision'>): string => {
    switch (consent.status) {
      case 'active':
        return t('guard.stVerified');
      case 'lapsed':
        return t('guard.stLapsed');
      case 'revoked':
        return consent.lastDecision?.status === 'rejected' ? t('guard.stNotGranted') : t('guard.stWithdrawn');
      default:
        return t('guard.stWaiting');
    }
  };

  const relationship = (type: string | null | undefined): string => {
    if (type === 'parent') return t('guard.relParent');
    if (type === 'guardian') return t('family.roleGuardian');
    return t('guard.relOther');
  };

  const methodLine = (method: string | null | undefined): string | null => {
    const key = method ? METHOD[method] : undefined;
    return key ? t('guard.methodLine', { method: t(key) }) : null;
  };

  /**
   * What a parent needs to know about a consent, as sentences in order.
   *
   * It never says "verified" of something that has lapsed, and never gives a
   * date it does not have. On the last day it gives the date and no count:
   * "in 0 days" is not a sentence, and the warning says "today".
   */
  const sentences = (consent: MyConsent, now: Date = new Date()): string[] => {
    if (consent.status === 'revoked') {
      return [consent.lastDecision?.status === 'rejected' ? t('guard.sNotGranted') : t('guard.sWithdrew')];
    }

    const said: string[] = [];
    const how = methodLine(consent.method);

    if (consent.status === 'pending_verification') {
      said.push(t('guard.sWaiting'));
      if (consent.openCase?.status === 'needs_information') said.push(t('guard.sMoreInfo'));
      if (how) said.push(how);
      return said;
    }

    if (consent.status === 'lapsed') {
      said.push(t('guard.sLapsed'));
      const ranOut = day(consent.expiresAt);
      if (ranOut) said.push(t('guard.sRanOutOn', { date: ranOut }));
      return said;
    }

    const verified = day(consent.verifiedAt);
    said.push(verified ? t('guard.sVerifiedOn', { date: verified }) : t('guard.sVerified'));
    if (how) said.push(how);

    const expires = day(consent.expiresAt);
    const days = daysUntil(consent.expiresAt, now);
    if (!expires) {
      said.push(t('guard.sNoExpiry'));
    } else if (days !== null && days > 0) {
      const counted = countLabel(code, days, { one: 'guard.sLapsesInOne', other: 'guard.sLapsesInOther' });
      said.push(counted.split('{date}').join(expires));
    } else {
      said.push(t('guard.sLapsesOn', { date: expires }));
    }
    return said;
  };

  /** The warning shown when a live consent is within a month of lapsing. */
  const warning = (consent: MyConsent, now: Date = new Date()): string | null => {
    if (consent.status !== 'active') return null;
    const days = daysUntil(consent.expiresAt, now);
    if (days === null) return t('guard.wNoExpiry');
    if (days < 0 || days > 30) return null;
    if (days === 0) return t('guard.wToday');
    return countLabel(code, days, { one: 'guard.wDaysOne', other: 'guard.wDaysOther' });
  };

  /** What a parent may do with the consent they hold, a sentence for each thing. */
  const permissions = (
    consent: Pick<MyConsent, 'canViewProgress' | 'canManageLearning' | 'canManageProfile'>,
  ): string[] => {
    const said: string[] = [];
    if (consent.canViewProgress) said.push(t('guard.pProgress'));
    if (consent.canManageLearning) said.push(t('guard.pLearning'));
    if (consent.canManageProfile) said.push(t('guard.pProfile'));
    return said.length > 0 ? said : [t('guard.pNone')];
  };

  const refusals: GuardianRefusals = {
    signed_out: t('guard.eSignedOut'),
    choose_child: t('guard.eChoose'),
    statement_short: t('guard.eStatement'),
    not_in_family: t('guard.eNotInFamily'),
    not_a_child: t('guard.eNotChild'),
    child_gone: t('guard.eChildGone'),
    method_invalid: t('guard.eMethod'),
    relationship_invalid: t('guard.eRelationship'),
    already_verified: t('guard.eAlreadyVerified'),
    already_waiting: t('guard.eAlreadyWaiting'),
    reason_short: t('guard.eReason'),
    already_revoked: t('guard.eAlreadyRevoked'),
    gone: t('guard.eGone'),
    not_yours: t('guard.eNotYours'),
    refused: t('guard.eRefused'),
    unconfirmed: t('guard.eUnconfirmed'),
  };

  const formWords: ConsentFormWords = {
    child: t('guard.fChild'),
    youAre: t('guard.fYouAre'),
    relationships: {
      parent: t('guard.relParent'),
      guardian: t('family.roleGuardian'),
      other: t('guard.relOther'),
    },
    how: t('guard.fHow'),
    methods: {
      video_call: { label: t('guard.mVideo'), hint: t('guard.mVideoHint') },
      id_document: { label: t('guard.mDocument'), hint: t('guard.mDocumentHint') },
      in_person: { label: t('guard.mPerson'), hint: t('guard.mPersonHint') },
      signed_declaration: { label: t('guard.mSigned'), hint: t('guard.mSignedHint') },
    },
    statement: t('guard.fStatement'),
    statementPlaceholder: t('guard.fStatementPlaceholder'),
    statementHelp: t('guard.fStatementHelp'),
    evidence: t('guard.fEvidence'),
    evidencePlaceholder: t('guard.fEvidencePlaceholder'),
    evidenceHelp: t('guard.fEvidenceHelp'),
    sending: t('guard.fSending'),
    ask: t('guard.ask'),
    recorded: t('guard.fRecorded'),
    foot: t('guard.fFoot'),
    refusals,
  };

  const actionWords: ConsentActionWords = {
    open: t('guard.wOpen'),
    effect: t('guard.wEffect'),
    why: t('guard.wWhy'),
    placeholder: t('guard.wPlaceholder'),
    withdrawing: t('guard.wWithdrawing'),
    withdraw: t('guard.wDo'),
    cancel: t('action.cancel'),
    done: t('guard.wDone'),
    refusals,
  };

  return {
    t,
    state,
    relationship,
    sentences,
    warning,
    permissions,
    /** The children's policy, as one line. Never claims one is in force when none is. */
    policyLine: (inForce: boolean): string => t(inForce ? 'guard.policyYes' : 'guard.policyNo'),
    /** Said only while a lapse does not yet take access away. */
    enforcementNote: (enforced: boolean): string | null => (enforced ? null : t('guard.enforcementOff')),
    formWords,
    actionWords,
  };
}
