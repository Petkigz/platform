'use client';
import { useEffect, useState } from 'react';
import { calculatedHijriDate } from '@/lib/hijri-date';
import { useT } from '@/lib/i18n/client';

export function HijriDate() {
  const t = useT();
  const [value,setValue]=useState<ReturnType<typeof calculatedHijriDate> | undefined>(undefined);
  useEffect(()=>{ setValue(calculatedHijriDate(new Date())); },[]);
  return <section className="card" aria-labelledby="date-heading">
    <h2 id="date-heading">{t('companion.hijriHeading')}</h2>
    <p>{t('companion.hijriLede')}</p>
    <p>{t('companion.hijriClock')}</p>
    <div aria-live="polite">{value === undefined ? <p>{t('companion.hijriLoading')}</p> : value === null ? <p className="notice">{t('companion.hijriUnsupported')}</p> : <p><strong>{value.hijri}</strong><br />{t('companion.hijriDeviceDate', { date: value.civil })}</p>}</div>
    <button type="button" className="btn secondary" onClick={()=>setValue(calculatedHijriDate(new Date()))}>{t('companion.hijriRefresh')}</button>
  </section>;
}
