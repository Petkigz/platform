'use client';

import { useState } from 'react';

import { formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
import {
  PREFERENCE_REFUSALS,
  preferenceSummary,
  type NotificationKind,
  type Preference,
  type PreferenceRefusal,
} from '@/lib/notification-prefs';

/** The words these switches say. A script sent to a browser holds no catalogue. */
export type PreferenceWords = {
  title: string;
  body: string;
  sumAllOn: string;
  sumAllOff: string;
  /** How many are off, ending in a colon; the count follows it. */
  sumOff: string;
  always: string;
  notInUse: string;
  locked: string;
  failed: string;
  unsure: string;
  /** Each kind's name and what it is for. */
  kinds: Record<NotificationKind, { label: string; description: string }>;
};

type Said = 'locked' | 'failed' | 'unsure';

/**
 * What the request was answered with, as one of three sentences.
 *
 * Signed out, malformed and unknown kind are all "not saved": nothing was
 * written, and the reader can do nothing with the difference. `unconfirmed`,
 * and an answer this code cannot read at all, are "reload to see".
 */
function saidOf(reason: unknown): Said {
  if (reason === 'locked') return 'locked';
  if (reason === 'unconfirmed') return 'unsure';
  return (PREFERENCE_REFUSALS as readonly unknown[]).includes(reason) ? 'failed' : 'unsure';
}

/**
 * What the platform is allowed to tell you.
 *
 * A switch per kind, with the two money-failure kinds shown **on and disabled**
 * rather than hidden — a hidden switch is a decision somebody will ask about,
 * and "always on, because it is how you find out your money did not arrive" is
 * the answer. The database refuses them too, so this is the explanation rather
 * than the enforcement.
 *
 * Nothing here claims an email or a text will follow. These switches decide
 * what appears in this centre.
 *
 * A switch moves only when the database has answered that it did. A press
 * with no answer leaves the switch where it was and says to reload: the
 * change may have been saved, and a switch drawn either way would be a guess.
 */
export function NotificationPreferences({
  initial,
  words,
  locale,
}: {
  initial: Preference[];
  words: PreferenceWords;
  locale: LocaleCode;
}) {
  const [prefs, setPrefs] = useState<Preference[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [said, setSaid] = useState<Said | null>(null);

  async function toggle(pref: Preference) {
    if (pref.locked || busy) return;
    setBusy(pref.kind);
    setSaid(null);
    const wanted = !pref.enabled;

    try {
      const res = await fetch('/api/notifications/preferences', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ kind: pref.kind, enabled: wanted }),
      });
      const json = (await res.json().catch(() => null)) as {
        ok?: unknown;
        reason?: PreferenceRefusal;
        value?: { kind?: unknown; enabled?: unknown };
      } | null;

      if (!res.ok || json?.ok !== true) {
        setSaid(saidOf(json?.reason));
        return;
      }
      // The database's answer, not the one hoped for: if it decided something
      // else, the screen must show what is.
      if (json.value?.kind !== pref.kind || typeof json.value.enabled !== 'boolean') {
        setSaid('unsure');
        return;
      }
      const saved = json.value.enabled;
      setPrefs((prev) => prev.map((p) => (p.kind === pref.kind ? { ...p, enabled: saved } : p)));
    } catch {
      setSaid('unsure');
    } finally {
      setBusy(null);
    }
  }

  const summary = preferenceSummary(prefs);
  const off = prefs.filter((p) => !p.locked && !p.enabled).length;

  return (
    <section className="card told-prefs" data-preferences="read" data-off={off}>
      <h2>{words.title}</h2>
      <p className="muted">{words.body}</p>
      <p className="muted" role="status" data-summary={summary.key.slice('notify.'.length)}>
        {summary.key === 'notify.sumAllOn' && words.sumAllOn}
        {summary.key === 'notify.sumAllOff' && words.sumAllOff}
        {summary.key === 'notify.sumOff' && (
          <>
            {words.sumOff} <bdi>{formatNumber(locale, summary.count)}</bdi>
          </>
        )}
      </p>

      <ul className="told-switches">
        {prefs.map((pref) => {
          const kind = words.kinds[pref.kind];
          return (
            <li key={pref.kind}>
              <label className="told-switch" data-kind={pref.kind} data-on={pref.enabled ? 'yes' : 'no'}>
                <input
                  type="checkbox"
                  checked={pref.enabled}
                  disabled={pref.locked || busy !== null}
                  onChange={() => void toggle(pref)}
                />
                <span>
                  <strong>{kind.label}</strong>
                  {pref.locked && (
                    <>
                      {' '}
                      <span className="badge neutral">{words.always}</span>
                    </>
                  )}
                  <span className="muted told-what">{kind.description}</span>
                  {!pref.available && <span className="muted told-note">{words.notInUse}</span>}
                </span>
              </label>
            </li>
          );
        })}
      </ul>

      {said && (
        <div className={said === 'unsure' ? 'notice warn' : 'notice error'} role="alert" data-pref-said={said}>
          {said === 'locked' ? words.locked : said === 'failed' ? words.failed : words.unsure}
        </div>
      )}
    </section>
  );
}
