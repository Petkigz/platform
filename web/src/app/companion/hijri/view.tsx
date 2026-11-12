'use client';
import { useEffect, useState } from 'react';
import { calculatedHijriDate } from '@/lib/hijri-date';

export function HijriDate() {
  const [value,setValue]=useState<ReturnType<typeof calculatedHijriDate> | undefined>(undefined);
  useEffect(()=>{ setValue(calculatedHijriDate(new Date())); },[]);
  return <section className="card" aria-labelledby="date-heading">
    <h2 id="date-heading">Umm al-Qura civil calendar</h2>
    <p>This is a calculated civil date, not a moon-sighting announcement. Local religious dates may differ; check your community’s announcements for Ramadan, Eid and other observances.</p>
    <p>The date uses your device’s clock and time zone and changes at midnight, not sunset. Browser calendar data may vary. Refresh to update the date.</p>
    <div aria-live="polite">{value === undefined ? <p>Loading date…</p> : value === null ? <p className="notice">This browser cannot display this calendar.</p> : <p><strong>{value.hijri}</strong><br />Device civil date: {value.civil}</p>}</div>
    <button type="button" className="btn secondary" onClick={()=>setValue(calculatedHijriDate(new Date()))}>Refresh date</button>
  </section>;
}
