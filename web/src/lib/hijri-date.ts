/**
 * The browser's Umm al-Qura civil calendar, never a sighting announcement.
 *
 * Written in the reader's language. The calendar is asked for as an option and
 * not as a `-u-ca-` tag on the locale: when a browser does not know the
 * language it falls back to its own default locale, and a tag on the locale it
 * discarded goes with it — the date would come back Gregorian under a Hijri
 * heading. The option survives the fallback, and the check below refuses any
 * answer that is not the calendar that was asked for.
 */
export function calculatedHijriDate(date: Date, locale = 'en'): { hijri: string; civil: string } | null {
  if (!Number.isFinite(date.getTime())) return null;
  const build = (tag: string): { hijri: string; civil: string } | null => {
    const hijri = new Intl.DateTimeFormat(tag, { calendar: 'islamic-umalqura', year: 'numeric', month: 'long', day: 'numeric' });
    if (hijri.resolvedOptions().calendar !== 'islamic-umalqura') return null;
    const civil = new Intl.DateTimeFormat(tag, { calendar: 'gregory', year: 'numeric', month: 'long', day: 'numeric' });
    if (civil.resolvedOptions().calendar !== 'gregory') return null;
    // Some languages have no names for the Hijri months in the browser's data
    // and write "4/05/1448". A month name in English is easier to read than a
    // number nobody counts the months by, so that one string falls back.
    const numericMonth = hijri.formatToParts(date).some((p) => p.type === 'month' && /^\p{Nd}+$/u.test(p.value));
    if (numericMonth && tag !== 'en') {
      const english = build('en');
      return english && { hijri: english.hijri, civil: civil.format(date) };
    }
    return { hijri: hijri.format(date), civil: civil.format(date) };
  };
  try { return build(locale); }
  catch {
    // A tag the browser rejects outright (not merely does not know) is a bug in
    // the caller; English is still a true date.
    try { return build('en'); } catch { return null; }
  }
}
