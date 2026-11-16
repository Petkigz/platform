/**
 * Six instants become six rows of a timetable.
 *
 * The heading above the timetable carries the date and the summary beneath it
 * carries the zone, so a row is normally just a clock time. Two cases would
 * make that misleading, and each puts the missing fact back on the row itself
 * rather than dropping it:
 *
 * - a night prayer that falls after midnight is marked with its own date
 *   (London in June: Isha by the middle-of-the-night rule is tomorrow);
 * - on a day when the clocks change, every row carries its own offset.
 *
 * Nothing here calculates a prayer time. It only decides how much of an
 * already calculated instant has to be written out to be read correctly.
 */
export type TimetableLine = {
  name: string;
  /** The clock time in the reader's language and the device's zone. */
  time: string;
  /** A short date, only when the instant is not on the heading's day. */
  otherDay: string;
  /** The zone's short name, only when the rows do not all share one. */
  offset: string;
};

function format(locale: string, options: Intl.DateTimeFormatOptions, value: Date): string {
  try { return new Intl.DateTimeFormat(locale, options).format(value); }
  catch { return new Intl.DateTimeFormat('en', options).format(value); }
}

/** The short name of the zone at one instant, e.g. "GMT+3" or "BST". */
export function offsetName(locale: string, zone: string, value: Date): string {
  const options: Intl.DateTimeFormatOptions = { timeZone: zone, hour: 'numeric', timeZoneName: 'short' };
  const part = (tag: string) =>
    new Intl.DateTimeFormat(tag, options).formatToParts(value).find((p) => p.type === 'timeZoneName')?.value ?? '';
  try { return part(locale); } catch { return part('en'); }
}

/** The civil day of an instant in a zone, for comparing two instants. */
function dayKey(zone: string, value: Date): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: zone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(value);
}

export function timetableRows(
  locale: string,
  zone: string,
  now: Date,
  times: readonly (readonly [string, Date])[],
): { lines: TimetableLine[]; sharedOffset: string } {
  const offsets = times.map(([, time]) => offsetName(locale, zone, time));
  const sharedOffset = offsets.length > 0 && offsets.every((o) => o === offsets[0]) ? offsets[0]! : '';
  const today = dayKey(zone, now);
  return {
    sharedOffset,
    lines: times.map(([name, time], index) => ({
      name,
      time: format(locale, { timeZone: zone, hour: 'numeric', minute: '2-digit' }, time),
      otherDay: dayKey(zone, time) === today ? '' : format(locale, { timeZone: zone, month: 'short', day: 'numeric' }, time),
      offset: sharedOffset ? '' : offsets[index] ?? '',
    })),
  };
}
