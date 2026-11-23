/**
 * You choose what you are told.
 *
 * The vocabulary is closed and lives in the database (`notification_preferences`
 * and the notification table both check it), so this file names the eight kinds
 * the platform can send and points at the sentence that says what each one is
 * for. The sentences are in the catalogue, in the reader's language, rather
 * than in SQL — but the *list* is not invented here: `parsePreferences()`
 * throws on a kind this file does not know, so adding an eighth kind in a
 * migration without updating this screen is an error rather than a silently
 * unlabelled switch.
 *
 * Two kinds are locked. `payout_failed` and `payout_cancelled` are how a person
 * finds out their money did not arrive; a preference screen that lets somebody
 * switch that off — by accident, or because "off" was the first option in a
 * list — has built a switch whose only effect is to hide a problem. The
 * database refuses it too, so this is not the enforcement, only the explanation.
 *
 * Everything else is a choice, including `media_encode_failed`. That one is
 * tempting to lock for the same reason — it says your own work will not play,
 * and silence means finding out from a student instead. But locking it would
 * make "always on" mean "important" rather than "the platform owes you this
 * about its own conduct", and the two money kinds would lose the distinction
 * that makes them worth locking. So the switch stays, and its description says
 * plainly what turning it off costs.
 */

export type NotificationKind =
  | 'payout_paid'
  | 'payout_failed'
  | 'payout_cancelled'
  | 'media_encode_failed'
  | 'class_starting'
  | 'plan_renewing'
  | 'live_cancelled'
  | 'live_recording_ready';

export type KindInfo = {
  kind: NotificationKind;
  /**
   * The kind's name, as a sentence in the catalogue. It is said in two
   * places: beside the switch, and above a message of that kind, so it is
   * written as something that happened.
   */
  labelKey:
    | 'notify.kPayoutPaid' | 'notify.kPayoutFailed' | 'notify.kPayoutCancelled' | 'notify.kMediaFailed'
    | 'notify.kClassStarting' | 'notify.kPlanRenewing' | 'notify.kLiveCancelled' | 'notify.kRecordingReady';
  /** What the kind is for, and what switching it off costs. */
  descriptionKey:
    | 'notify.dPayoutPaid' | 'notify.dPayoutFailed' | 'notify.dPayoutCancelled' | 'notify.dMediaFailed'
    | 'notify.dClassStarting' | 'notify.dPlanRenewing' | 'notify.dLiveCancelled' | 'notify.dRecordingReady';
  locked: boolean;
};

// The words are in the catalogue (`messages/notify.ts`), in the reader's
// language. They used to be here, in English, for every reader.
export const NOTIFICATION_KINDS: KindInfo[] = [
  { kind: 'payout_paid', labelKey: 'notify.kPayoutPaid', descriptionKey: 'notify.dPayoutPaid', locked: false },
  { kind: 'payout_failed', labelKey: 'notify.kPayoutFailed', descriptionKey: 'notify.dPayoutFailed', locked: true },
  { kind: 'payout_cancelled', labelKey: 'notify.kPayoutCancelled', descriptionKey: 'notify.dPayoutCancelled', locked: true },
  { kind: 'media_encode_failed', labelKey: 'notify.kMediaFailed', descriptionKey: 'notify.dMediaFailed', locked: false },
  { kind: 'class_starting', labelKey: 'notify.kClassStarting', descriptionKey: 'notify.dClassStarting', locked: false },
  { kind: 'plan_renewing', labelKey: 'notify.kPlanRenewing', descriptionKey: 'notify.dPlanRenewing', locked: false },
  { kind: 'live_cancelled', labelKey: 'notify.kLiveCancelled', descriptionKey: 'notify.dLiveCancelled', locked: false },
  { kind: 'live_recording_ready', labelKey: 'notify.kRecordingReady', descriptionKey: 'notify.dRecordingReady', locked: false },
];

export type Preference = {
  kind: NotificationKind;
  enabled: boolean;
  /** A rule that cannot be changed: the two kinds that report money not arriving. */
  locked: boolean;
  /**
   * Whether this deployment can currently send the kind at all. The two
   * reminders depend on features that ship off, so on a fresh platform they are
   * choices made in advance rather than switches that change what happens today.
   */
  available: boolean;
};

export class PreferencesError extends Error {}

const BY_KIND = new Map<string, KindInfo>(NOTIFICATION_KINDS.map((k) => [k.kind, k]));

/** What this screen knows about a kind, or null. A `Map`, so a kind named `constructor` is not one. */
export function describeKind(kind: unknown): KindInfo | null {
  return typeof kind === 'string' ? (BY_KIND.get(kind) ?? null) : null;
}

/**
 * Read `my_notification_preferences()`.
 *
 * Every kind the database knows must have a label here; a kind that arrives
 * without one is a screen that cannot explain itself, so it throws rather than
 * rendering an unlabelled toggle. The page catches that and says the choices
 * could not be read; it used to answer with an error page.
 */
export function parsePreferences(value: unknown): Preference[] {
  if (!Array.isArray(value)) {
    throw new PreferencesError('the preference list did not load');
  }

  return value.map((entry): Preference => {
    const raw = (entry ?? {}) as Record<string, unknown>;
    const kind = typeof raw.kind === 'string' ? raw.kind : '';
    const info = describeKind(kind);
    if (!info) {
      throw new PreferencesError(`the platform can send '${kind}', which this screen does not know`);
    }
    return {
      kind: info.kind,
      // Locked means on, whatever the row says — the database agrees.
      enabled: info.locked ? true : raw.enabled === true,
      locked: info.locked,
      // Only an explicit `false` means unavailable: a reply from a database
      // older than this field must not make every switch look dead.
      available: raw.available !== false,
    };
  });
}

/**
 * The sentence above the switches, as the name of one and a count.
 *
 * Only what can be chosen is counted: the two locked kinds are on whatever
 * anybody does. The count is put after a colon by the catalogue, so no
 * language has to agree a noun with it.
 */
export type PreferenceSummary =
  | { key: 'notify.sumAllOn' }
  | { key: 'notify.sumAllOff' }
  | { key: 'notify.sumOff'; count: number };

export function preferenceSummary(prefs: readonly Preference[]): PreferenceSummary {
  const live = prefs.filter((p) => !p.locked);
  const off = live.filter((p) => !p.enabled);
  if (off.length === 0) return { key: 'notify.sumAllOn' };
  if (off.length === live.length) return { key: 'notify.sumAllOff' };
  return { key: 'notify.sumOff', count: off.length };
}

/**
 * Why a switch was not changed, as a name the screen has a sentence for.
 *
 * `/api/notifications/preferences` used to send back the sentence
 * `set_notification_preference()` raised, in English, and the screen printed
 * it. The route now sends one of these and logs the database's sentence.
 *
 * `failed` is "the database said no and nothing was written". `unconfirmed`
 * is different: the request left and no answer that can be read came back,
 * so the change may have been saved. The screen must not say it was not.
 */
export const PREFERENCE_REFUSALS = ['unconfigured', 'malformed', 'signed_out', 'unknown_kind', 'locked', 'failed', 'unconfirmed'] as const;
export type PreferenceRefusal = (typeof PREFERENCE_REFUSALS)[number];

const REFUSAL_STATUS: Record<PreferenceRefusal, number> = {
  unconfigured: 503,
  malformed: 400,
  signed_out: 401,
  unknown_kind: 400,
  locked: 409,
  failed: 500,
  unconfirmed: 502,
};

export function preferenceRefusalStatus(reason: PreferenceRefusal): number {
  return REFUSAL_STATUS[reason];
}

/**
 * What the database said, as a name.
 *
 * `set_notification_preference()` refuses three ways and gives each its own
 * SQLSTATE: signed out (42501), a kind it does not know (22023) and one of
 * the two that cannot be silenced (23514). Anything else is not a refusal
 * this code understands, so it is `failed` and nothing is claimed about it.
 */
export function preferenceRefusalOf(code: unknown): PreferenceRefusal {
  if (code === '42501') return 'signed_out';
  if (code === '22023') return 'unknown_kind';
  if (code === '23514') return 'locked';
  return 'failed';
}

/** What a request to change a switch asked for, or null when it is not one. */
export function preferenceChangeOf(body: unknown): { kind: string; enabled: boolean } | null {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return null;
  const input = body as Record<string, unknown>;
  if (typeof input.kind !== 'string' || typeof input.enabled !== 'boolean') return null;
  return { kind: input.kind, enabled: input.enabled };
}
