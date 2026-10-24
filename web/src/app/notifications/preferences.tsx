'use client';

import { useState } from 'react';
import {
  availabilityNote,
  describeKind,
  preferenceSummary,
  type Preference,
} from '@/lib/notification-prefs';

/**
 * What the platform is allowed to tell you.
 *
 * A switch per kind, with the two money-failure kinds shown **on and disabled**
 * rather than hidden — a hidden switch is a decision somebody will ask about,
 * and "always on, because it is how you find out your money did not arrive" is
 * the answer. The database refuses them too, so this is the explanation rather
 * than the enforcement.
 *
 * Nothing here claims an email or a text will follow. No delivery provider is
 * configured; these switches decide what appears in this centre.
 */
export function NotificationPreferences({ initial }: { initial: Preference[] }) {
  const [prefs, setPrefs] = useState<Preference[]>(initial);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function toggle(pref: Preference) {
    if (pref.locked || busy) return;
    setBusy(pref.kind);
    setError(null);
    const wanted = !pref.enabled;

    const res = await fetch('/api/notifications/preferences', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ kind: pref.kind, enabled: wanted }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
      value?: { kind?: string; enabled?: boolean };
    };

    if (!res.ok || json.ok !== true) {
      setError(json.message ?? 'That change was not saved.');
      setBusy(null);
      return;
    }

    // The database's answer wins over the optimistic one: if it decided
    // something else, the screen must show what is.
    const saved = typeof json.value?.enabled === 'boolean' ? json.value.enabled : wanted;
    setPrefs((prev) =>
      prev.map((p) => (p.kind === pref.kind ? { ...p, enabled: saved } : p)),
    );
    setBusy(null);
  }

  return (
    <section className="card">
      <h2 style={{ marginTop: 0 }}>What you are told</h2>
      <p className="muted" style={{ marginTop: 0 }}>
        These decide what appears on this page. No email or text delivery is
        configured yet, so nothing is sent to an inbox or a phone either way.
      </p>
      <p className="muted">{preferenceSummary(prefs)}</p>

      <div style={{ display: 'grid', gap: '0.75rem' }}>
        {prefs.map((pref) => {
          const info = describeKind(pref.kind);
          return (
            <label
              key={pref.kind}
              className="row"
              style={{ gap: '0.6rem', alignItems: 'flex-start' }}
            >
              <input
                type="checkbox"
                checked={pref.enabled}
                disabled={pref.locked || busy === pref.kind}
                onChange={() => void toggle(pref)}
                style={{ marginTop: '0.25rem' }}
              />
              <span>
                <strong style={{ display: 'block' }}>
                  {info?.label ?? pref.kind}
                  {pref.locked && (
                    <>
                      {' '}
                      <span className="badge neutral">Always on</span>
                    </>
                  )}
                </strong>
                <span className="muted" style={{ fontSize: '0.9rem' }}>
                  {info?.description ?? ''}
                </span>
                {availabilityNote(pref) && (
                  <span
                    className="muted"
                    style={{ display: 'block', fontSize: '0.8rem', fontStyle: 'italic' }}
                  >
                    {availabilityNote(pref)}
                  </span>
                )}
              </span>
            </label>
          );
        })}
      </div>

      {error && (
        <div className="notice error" role="alert" style={{ marginTop: '0.75rem' }}>
          {error}
        </div>
      )}
    </section>
  );
}
