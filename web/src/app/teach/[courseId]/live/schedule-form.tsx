'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

/**
 * Schedule a class.
 *
 * The teacher picks a local time and the zone it is local to; the database stores
 * UTC and keeps the zone beside it. A teacher in Kampala setting "Tuesday 19:00"
 * should never have to think about UTC, and a learner in London should still be
 * told the right hour.
 */
export function ScheduleForm({ courseId, defaultZone }: { courseId: string; defaultZone: string }) {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('');
  const [minutes, setMinutes] = useState('60');
  const [zone, setZone] = useState(defaultZone);
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setBusy(true);
    setError(null);

    const startsAt = wallClockToInstant(date, time, zone);
    const endsAt = new Date(startsAt.getTime() + Number(minutes) * 60_000);

    const { error: rpcError } = await supabase.rpc('schedule_live_session', {
      p_course_id: courseId,
      p_title: title.trim(),
      p_starts_at: startsAt.toISOString(),
      p_ends_at: endsAt.toISOString(),
      p_timezone: zone,
      p_description: description.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setBusy(false);
      return;
    }

    setBusy(false);
    setTitle('');
    setDescription('');
    router.refresh();
  }

  return (
    <div className="stack">
      <label>
        What is the class called?
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Tafsir: Surah Al-Fatiha" />
      </label>
      <div className="grid cols-2">
        <label>
          Date
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </label>
        <label>
          Starts at
          <input type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </label>
        <label>
          How long, in minutes
          <input value={minutes} onChange={(e) => setMinutes(e.target.value)} inputMode="numeric" />
        </label>
        <label>
          Time zone the time is in
          <input value={zone} onChange={(e) => setZone(e.target.value)} placeholder="Africa/Kampala" />
        </label>
      </div>
      <label>
        What will be covered? (optional, learners see this)
        <input value={description} onChange={(e) => setDescription(e.target.value)} />
      </label>
      {error && <p className="notice error">{error}</p>}
      <div>
        <button
          type="button"
          className="btn"
          style={{ width: 'auto' }}
          onClick={submit}
          disabled={busy || !title.trim() || !date || !time}
        >
          {busy ? 'Scheduling…' : 'Schedule this class'}
        </button>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        The room opens 15 minutes before the start and closes 30 minutes after the
        end. Learners who are enrolled in this course, and nobody else, can enter.
      </p>
    </div>
  );
}

/**
 * A wall-clock time in a zone, as the instant it names.
 *
 * `new Date('2026-11-03T19:00')` is interpreted in the *server's* zone, which is
 * exactly the bug this avoids. The offset is looked up for the zone on that
 * date, applied once, then looked up again on the result so a date on the far
 * side of a daylight-saving change lands on the right side of it.
 */
function wallClockToInstant(date: string, time: string, zone: string): Date {
  const [year, month, day] = date.split('-').map(Number);
  const [hour, minute] = time.split(':').map(Number);
  const asUtc = Date.UTC(year ?? 1970, (month ?? 1) - 1, day ?? 1, hour ?? 0, minute ?? 0);

  let instant = asUtc - zoneOffsetMinutes(zone, new Date(asUtc)) * 60_000;
  const second = zoneOffsetMinutes(zone, new Date(instant));
  const corrected = asUtc - second * 60_000;
  if (corrected !== instant) instant = corrected;

  return new Date(instant);
}

/** The offset, in minutes east of UTC, that `zone` was at on `at`. */
function zoneOffsetMinutes(zone: string, at: Date): number {
  try {
    const part = new Intl.DateTimeFormat('en-US', {
      timeZone: zone,
      timeZoneName: 'longOffset',
    })
      .formatToParts(at)
      .find((p) => p.type === 'timeZoneName')?.value;
    const match = /GMT([+-])(\d{2}):(\d{2})/.exec(part ?? '');
    if (!match) return 0;
    const sign = match[1] === '-' ? -1 : 1;
    return sign * (Number(match[2]) * 60 + Number(match[3]));
  } catch {
    return 0;
  }
}
