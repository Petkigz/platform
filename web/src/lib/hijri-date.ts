/** The browser's Umm al-Qura civil calendar, never a sighting announcement. */
export function calculatedHijriDate(date: Date): { hijri: string; civil: string } | null {
  if (!Number.isFinite(date.getTime())) return null;
  try {
    const hijri = new Intl.DateTimeFormat('en-u-ca-islamic-umalqura', { year:'numeric', month:'long', day:'numeric' });
    if (hijri.resolvedOptions().calendar !== 'islamic-umalqura') return null;
    const civil = new Intl.DateTimeFormat('en-u-ca-gregory', { year:'numeric', month:'long', day:'numeric' });
    return { hijri: hijri.format(date), civil: civil.format(date) };
  } catch { return null; }
}
