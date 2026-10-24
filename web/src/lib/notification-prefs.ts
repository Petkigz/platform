/**
 * You choose what you are told.
 *
 * The vocabulary is closed and lives in the database (`notification_preferences`
 * and the notification table both check it), so this file names the five kinds
 * the platform can send and says what each one is for. The labels are here
 * rather than in SQL because a sentence about a payout belongs next to the code
 * that renders it — but the *list* is not invented here: `parsePreferences()`
 * throws on a kind this file does not know, so adding a sixth kind in a
 * migration without updating this screen is an error rather than a silently
 * unlabelled switch.
 *
 * Two kinds are locked. `payout_failed` and `payout_cancelled` are how a person
 * finds out their money did not arrive; a preference screen that lets somebody
 * switch that off — by accident, or because "off" was the first option in a
 * list — has built a switch whose only effect is to hide a problem. The
 * database refuses it too, so this is not the enforcement, only the explanation.
 */

export type NotificationKind =
  | 'payout_paid'
  | 'payout_failed'
  | 'payout_cancelled'
  | 'class_starting'
  | 'plan_renewing';

export type KindInfo = {
  kind: NotificationKind;
  label: string;
  description: string;
  locked: boolean;
};

export const NOTIFICATION_KINDS: KindInfo[] = [
  {
    kind: 'payout_paid',
    label: 'A payout reaches you',
    description: 'When money owed to you has been sent.',
    locked: false,
  },
  {
    kind: 'payout_failed',
    label: 'A payout fails',
    description:
      'When a transfer did not go through. Always on: it is how you find out, and the fix is usually yours to make.',
    locked: true,
  },
  {
    kind: 'payout_cancelled',
    label: 'A payout is cancelled',
    description:
      'When a payout is withdrawn before it is sent. Always on, for the same reason as a failure.',
    locked: true,
  },
  {
    kind: 'class_starting',
    label: 'A class is about to start',
    description: 'A reminder for a live class in a course you or a child of yours is in.',
    locked: false,
  },
  {
    kind: 'plan_renewing',
    label: 'A plan renews soon',
    description: 'Three days before a subscription renews, so cancelling is possible in time.',
    locked: false,
  },
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

const BY_KIND = new Map(NOTIFICATION_KINDS.map((k) => [k.kind, k]));

export function describeKind(kind: string): KindInfo | null {
  return BY_KIND.get(kind as NotificationKind) ?? null;
}

/**
 * Read `my_notification_preferences()`.
 *
 * Every kind the database knows must have a label here; a kind that arrives
 * without one is a screen that cannot explain itself, so it throws rather than
 * rendering an unlabelled toggle.
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

/** The note beside a switch whose feature this platform does not run yet. */
export function availabilityNote(pref: Preference): string | null {
  if (pref.available) return null;
  return 'Not in use on this platform yet. Your choice is saved and applies if it is switched on.';
}

/** One sentence above the switches. */
export function preferenceSummary(prefs: Preference[]): string {
  const live = prefs.filter((p) => !p.locked);
  const off = live.filter((p) => !p.enabled);
  if (live.length === 0) return 'Everything the platform can tell you is on.';
  if (off.length === 0) return 'Everything you can choose is on.';
  if (off.length === live.length) return 'You have switched off every optional message.';
  return `${off.length} optional ${off.length === 1 ? 'message is' : 'messages are'} switched off.`;
}
