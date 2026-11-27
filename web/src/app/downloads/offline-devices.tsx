'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isRemovedDevice, parseOfflineDevices, type OfflineDevice } from '@/lib/offline-devices';
import { fill, formatDay, formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';

/** Every sentence the list of devices says, handed over by the page in the reader's language. */
export type DeviceWords = {
  title: string;
  lede: string;
  loading: string;
  unread: string;
  refresh: string;
  none: string;
  unnamed: string;
  /** Has `{count}`. */
  saved: string;
  /** Has `{day}`. */
  seen: string;
  remove: string;
  removing: string;
  /** The question asked before a device is removed; the device is named under it. */
  confirm: string;
  unconfirmed: string;
  removed: string;
  removedUnrefreshed: string;
};

/**
 * The devices that hold saved lessons, and the button that removes one.
 *
 * It has no sentence of its own (2026-11-27): the page hands it `words` and
 * the language to count in. A device's name and a learner's are shown as they
 * were written, each on its own, never inside a sentence: the question before
 * a removal is one sentence, with the device and the learner on the line
 * under it. The day a device was last seen is the day as the server wrote it
 * (UTC), with no clock.
 *
 * A list that could not be read is said as that, and never as "no devices".
 */
export function OfflineDevices({ locale, words }: { locale: LocaleCode; words: DeviceWords }) {
  const [devices, setDevices] = useState<OfflineDevice[] | null | undefined>(undefined);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const load = useCallback(async () => {
    const supabase = createClient();
    const result = await Promise.resolve(supabase.rpc('my_offline_devices')).catch(() => null);
    const rows = result && !result.error ? parseOfflineDevices(result.data) : null;
    setDevices(rows);
    return rows;
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function remove(device: OfflineDevice) {
    if (!window.confirm(`${words.confirm}\n\n${device.label || words.unnamed} · ${device.learner_name}`)) return;
    setBusy(device.device_id);
    setMessage('');
    try {
      const supabase = createClient();
      const result = await Promise.resolve(supabase.rpc('remove_offline_device', { p_device_id: device.device_id })).catch(() => null);
      if (!result || result.error || !isRemovedDevice(result.data, device.device_id)) {
        setMessage(words.unconfirmed);
        return;
      }
      const refreshed = await load();
      setMessage(refreshed ? words.removed : words.removedUnrefreshed);
    } finally { setBusy(null); }
  }

  return <section className="card" style={{ marginTop: '1rem' }}>
    <h2>{words.title}</h2>
    <p>{words.lede}</p>
    {message && <p className="notice warn" role="status">{message}</p>}
    {devices === undefined ? <p className="muted">{words.loading}</p>
      : devices === null ? <p className="notice warn">{words.unread} <button type="button" className="btn ghost tiny" onClick={() => void load()}>{words.refresh}</button></p>
      : devices.length === 0 ? <p>{words.none}</p>
      : <ul className="lessons">{devices.map(device => <li key={device.device_id}>
        <span className="t"><strong><bdi>{device.label || words.unnamed}</bdi></strong> · <bdi>{device.learner_name}</bdi> · {fill(words.saved, { count: formatNumber(locale, device.saved_count) })} · {fill(words.seen, { day: formatDay(locale, device.last_seen_at) })}</span>
        <button type="button" className="btn ghost tiny" disabled={busy !== null} onClick={() => void remove(device)}>{busy === device.device_id ? words.removing : words.remove}</button>
      </li>)}</ul>}
  </section>;
}
