/**
 * What inviting somebody, accepting an invitation and ending a share was
 * answered with, as names.
 *
 * `/api/account/sharing` used to answer every refusal with the sentence the
 * database raised, in English, for every reader, and the two screens printed
 * it. They also believed any reply that said `ok`, and took a reply that never
 * arrived for "that could not be sent".
 *
 * So each refusal has a name and one status, and a reply is read for what it
 * says happened. The database's sentences are told apart here by their words
 * and the state they are raised under, and a test reads those words out of the
 * migrations so the two cannot drift.
 *
 * An invitation is a message to somebody else's mailbox, and a share lets
 * another account read a learner's record. A reply that never arrived, or one
 * this file cannot read, is therefore not "nothing changed": it is unknown
 * (`failed`), and the screen says so and asks the reader to reload.
 *
 * Kept apart from `sharing.ts` so the words can be tested on their own.
 */

export type ShareCode =
  | 'signed_out'
  | 'off'
  | 'malformed'
  | 'email'
  | 'own_address'
  | 'no_profile'
  | 'link'
  | 'no_invitation'
  | 'used'
  | 'withdrawn'
  | 'expired'
  | 'other_address'
  | 'have_it'
  | 'no_share'
  | 'not_yours'
  | 'refused'
  | 'failed';

/**
 * The English the route sends beside each code, for a caller with no words of
 * its own. Its own sentences: none repeats the words the database raises, so
 * a check for the database's words in an answer cannot be fooled by these.
 */
export const SHARE_SENTENCE: Record<ShareCode, string> = {
  signed_out: 'You are signed out. Nothing was changed.',
  off: 'Learning cannot be shared at the moment: the switch for it is off. Nothing was changed.',
  malformed: 'The request was not one this address understands.',
  email: 'An email address is needed, and that was not one. Nothing was sent.',
  own_address: 'The address typed belongs to the account asking. Nothing was sent.',
  no_profile: 'This account has no learning record of its own to share. Nothing was sent.',
  link: 'The link is missing a part. Nothing was shared.',
  no_invitation: 'No invitation matches this link. Nothing was shared.',
  used: 'This link was accepted before. Nothing was changed now.',
  withdrawn: 'The sender took this invitation back. Nothing was shared.',
  expired: 'This invitation ran out before it was accepted. Nothing was shared.',
  other_address: 'This invitation is for another address than the one signed in. Nothing was shared.',
  have_it: 'The same thing is shared with this account already. Nothing was changed.',
  no_share: 'The share named is no longer there. Nothing was changed.',
  not_yours: 'This account cannot end the share named. Nothing was changed.',
  refused: 'The platform did not accept this. Nothing was changed.',
  failed: 'What happened could not be confirmed.',
};

const isShareCode = (value: unknown): value is ShareCode =>
  typeof value === 'string' && Object.hasOwn(SHARE_SENTENCE, value);

/** The status the route answers a code with. Only `failed` is not a refusal. */
export function shareStatusOf(code: ShareCode): number {
  switch (code) {
    case 'signed_out':
      return 401;
    case 'other_address':
    case 'not_yours':
      return 403;
    case 'no_invitation':
    case 'no_share':
      return 404;
    case 'off':
    case 'no_profile':
    case 'used':
    case 'withdrawn':
    case 'expired':
    case 'have_it':
    case 'refused':
      return 409;
    case 'failed':
      return 502;
    default:
      return 400;
  }
}

export type ShareRefusal = { ok: false; code: ShareCode; message: string };

/** A refusal as the route sends it. */
export function shareRefusal(code: ShareCode): ShareRefusal {
  return { ok: false, code, message: SHARE_SENTENCE[code] };
}

/**
 * What a screen believes about a reply that did not say `ok`.
 *
 * A refusal is believed only from a 4xx that names a reason this file knows.
 * Everything else, a 5xx, a proxy's page, a name from a newer server, is
 * `failed`: the screen does not know what happened.
 */
export function shareOutcomeOf(status: number, body: unknown): ShareCode {
  const code = body && typeof body === 'object' ? (body as { code?: unknown }).code : undefined;
  return status >= 400 && status <= 499 && isShareCode(code) ? code : 'failed';
}

type DatabaseError = { code?: string | null; message?: string | null };

/**
 * What `invite_learning_share()`, `accept_learning_share()`
 * (`20261239000100_share_invitations.sql`) and `revoke_adult_learning_share()`
 * (`20261222000100_adult_learning_shares.sql`) raise, told apart by their
 * words.
 *
 * Every one is raised before anything is written, or undoes all of it, so
 * each is a refusal. An error under a state none of them uses is not known to
 * be that, and is `failed`.
 */
export function shareCodeOf(error: DatabaseError): ShareCode {
  const state = error.code ?? '';
  const message = error.message ?? '';

  if (state === '42501') {
    if (/^sign in first$|sign in to accept an invitation/iu.test(message)) return 'signed_out';
    if (/sharing an adult's learning is not enabled/iu.test(message)) return 'off';
    if (/that invitation was sent to a different address/iu.test(message)) return 'other_address';
    if (/only the person who granted this share/iu.test(message)) return 'not_yours';
    return 'refused';
  }
  if (state === '23514') {
    if (/that is not an email address/iu.test(message)) return 'email';
    if (/that is your own address/iu.test(message)) return 'own_address';
    return 'refused';
  }
  if (state === '22023') {
    if (/a share covers progress, achievements, or both/iu.test(message)) return 'malformed';
    if (/an invitation lasts between 1 and 90 days/iu.test(message)) return 'malformed';
    if (/that invitation link is not complete/iu.test(message)) return 'link';
    return 'refused';
  }
  if (state === 'P0002') {
    if (/there is no adult learner profile to share from/iu.test(message)) return 'no_profile';
    if (/that invitation does not exist/iu.test(message)) return 'no_invitation';
    if (/^no share /iu.test(message)) return 'no_share';
    return 'refused';
  }
  if (state === '55000') {
    if (/that invitation has already been accepted/iu.test(message)) return 'used';
    if (/that invitation was withdrawn/iu.test(message)) return 'withdrawn';
    if (/that invitation has expired/iu.test(message)) return 'expired';
    return 'refused';
  }
  if (state === '23505') return /you already have that share/iu.test(message) ? 'have_it' : 'refused';
  return 'failed';
}

export type ShareAction = 'invite' | 'accept' | 'revoke';

export type ShareDid = 'invited' | 'accepted' | 'ended';

export type ShareDone = {
  ok: true;
  did: ShareDid;
  /** Until when the invitation can be accepted. Only beside `invited`. */
  expiresAt?: string;
};

const record = (value: unknown): Record<string, unknown> | null =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : null;

/** A moment the database wrote, or nothing. */
const moment = (value: unknown): string | undefined =>
  typeof value === 'string' && value !== '' && !Number.isNaN(new Date(value).getTime()) ? value : undefined;

/**
 * What a reply that was not an error says happened.
 *
 * Each function answers with what it made: an invitation with an id, a share
 * with an id, a share whose status is `revoked`. A reply without that is not
 * known to have done anything, and is `failed`.
 *
 * Ending a share that had already been ended is answered `changed: false`.
 * That is not a refusal: the share is ended, which is what was asked for.
 *
 * Nothing else from the reply is passed on. In particular the invitation's id
 * is not: the reply is the same for every address, and stays that way.
 */
export function shareAnswerOf(action: ShareAction, data: unknown): ShareDone | { ok: false; code: ShareCode } {
  const reply = record(data);
  const no = (code: ShareCode) => ({ ok: false as const, code });
  if (!reply) return no('failed');

  if (action === 'invite') {
    if (typeof reply.invitationId !== 'string' || reply.invitationId === '') return no('failed');
    const expiresAt = moment(reply.expiresAt);
    return { ok: true, did: 'invited', ...(expiresAt === undefined ? {} : { expiresAt }) };
  }

  if (action === 'accept') {
    return typeof reply.shareId === 'string' && reply.shareId !== '' ? { ok: true, did: 'accepted' } : no('failed');
  }

  return reply.status === 'revoked' ? { ok: true, did: 'ended' } : no('failed');
}

/** What a screen takes from a reply that said `ok`. Anything it cannot read is `failed`. */
export function shareDoneOf(body: unknown): ShareDone | null {
  const reply = record(body);
  if (!reply || reply.ok !== true) return null;
  const did = reply.did;
  if (did !== 'invited' && did !== 'accepted' && did !== 'ended') return null;
  const expiresAt = did === 'invited' ? moment(reply.expiresAt) : undefined;
  return { ok: true, did, ...(expiresAt === undefined ? {} : { expiresAt }) };
}
