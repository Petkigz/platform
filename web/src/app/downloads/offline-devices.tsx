'use client';

import { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { isRemovedDevice, parseOfflineDevices, type OfflineDevice } from '@/lib/offline-devices';

export function OfflineDevices() {
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
    if (!window.confirm(`Remove ${device.label || 'this device'} for ${device.learner_name}? Its saved lessons will stop opening through the app. This cannot erase device copies or recall keys already retained.`)) return;
    setBusy(device.device_id);
    setMessage('');
    try {
      const supabase = createClient();
      const result = await Promise.resolve(supabase.rpc('remove_offline_device', { p_device_id: device.device_id })).catch(() => null);
      if (!result || result.error || !isRemovedDevice(result.data, device.device_id)) {
        setMessage('The device removal could not be confirmed. Refresh the list and retry; a lost response may still have removed it.');
        return;
      }
      const refreshed = await load();
      setMessage(refreshed ? 'The server recorded the device removal. Copies and retained keys on that device were not remotely erased.' : 'The server recorded the removal, but the device list could not be refreshed.');
    } finally { setBusy(null); }
  }

  return <section className="card" style={{ marginTop: '1rem' }}>
    <h2>Saved-lesson devices</h2>
    <p>Remove a device to free its slot and end its server-side saves. This cannot remotely delete copies or keys already kept on a device.</p>
    {message && <p className="notice warn" role="status">{message}</p>}
    {devices === undefined ? <p className="muted">Loading devices…</p>
      : devices === null ? <p className="notice warn">The device list could not be loaded. Do not assume it is empty. <button type="button" className="btn ghost tiny" onClick={() => void load()}>Refresh</button></p>
      : devices.length === 0 ? <p>No devices are currently listed.</p>
      : <ul className="lessons">{devices.map(device => <li key={device.device_id}>
        <span className="t"><strong>{device.label || 'Unnamed device'}</strong> · {device.learner_name} · {device.saved_count} active saved {device.saved_count === 1 ? 'lesson' : 'lessons'} · last seen {new Date(device.last_seen_at).toLocaleDateString()}</span>
        <button type="button" className="btn ghost tiny" disabled={busy !== null} onClick={() => void remove(device)}>{busy === device.device_id ? 'Removing…' : 'Remove device'}</button>
      </li>)}</ul>}
  </section>;
}
