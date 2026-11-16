'use client';
import { useEffect, useState } from 'react';
import { calculatedHijriDate } from '@/lib/hijri-date';
import { useLocaleCode, useT } from '@/lib/i18n/client';

export function HijriDate() {
  const t = useT();
  const locale = useLocaleCode();
  const [value,setValue]=useState<ReturnType<typeof calculatedHijriDate> | undefined>(undefined);
  useEffect(()=>{ setValue(calculatedHijriDate(new Date(), locale)); },[locale]);
  return <section className="card companion-tool" aria-labelledby="date-heading">
    <h2 id="date-heading">{t('companion.hijriHeading')}</h2>
    <p>{t('companion.hijriLede')}</p>
    <p>{t('companion.hijriClock')}</p>
    <div aria-live="polite">{value === undefined ? <p>{t('companion.hijriLoading')}</p> : value === null ? <p className="notice">{t('companion.hijriUnsupported')}</p> : <p className="hijri-date"><strong>{value.hijri}</strong><span>{t('companion.hijriDeviceDate', { date: value.civil })}</span></p>}</div>
    <button type="button" className="btn secondary" onClick={()=>setValue(calculatedHijriDate(new Date(), locale))}>{t('companion.hijriRefresh')}</button>
  </section>;
}
