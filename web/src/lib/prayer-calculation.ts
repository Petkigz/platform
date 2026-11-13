import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PolarCircleResolution, PrayerTimes } from 'adhan';

export const methods = {
  MuslimWorldLeague: 'Muslim World League',
  Egyptian: 'Egyptian General Authority of Survey',
  Karachi: 'University of Islamic Sciences, Karachi',
  MoonsightingCommittee: 'Moonsighting Committee',
  NorthAmerica: 'ISNA / North America',
  Singapore: 'Singapore (calculated estimate)',
} as const;
export type Method = keyof typeof methods;
export type Asr = 'standard' | 'hanafi';
export type NightRule = 'middle' | 'seventh' | 'angle';

export function calculatePrayerTimes(latitude:number, longitude:number, date:Date, method:Method, asr:Asr, night:NightRule) {
  if(!Number.isFinite(latitude) || Math.abs(latitude)>90 || !Number.isFinite(longitude) || Math.abs(longitude)>180 || !Number.isFinite(date.getTime()) || !Object.hasOwn(methods,method) || !['standard','hanafi'].includes(asr) || !['middle','seventh','angle'].includes(night)) return null;
  try {
    const params=CalculationMethod[method]();
    params.madhab=asr==='hanafi' ? Madhab.Hanafi : Madhab.Shafi;
    params.highLatitudeRule=night==='middle' ? HighLatitudeRule.MiddleOfTheNight : night==='seventh' ? HighLatitudeRule.SeventhOfTheNight : HighLatitudeRule.TwilightAngle;
    params.polarCircleResolution=PolarCircleResolution.Unresolved;
    const result=new PrayerTimes(new Coordinates(latitude,longitude),date,params);
    const times=[['Fajr',result.fajr],['Sunrise',result.sunrise],['Dhuhr',result.dhuhr],['Asr',result.asr],['Maghrib',result.maghrib],['Isha',result.isha]] as const;
    // Near polar night the library can produce finite but out-of-order times,
    // e.g. Asr after Maghrib. Never present these as a usable timetable.
    if(times.some(([,time],index)=>!Number.isFinite(time.getTime()) || (index>0 && time.getTime()<=times[index-1]![1].getTime()))) return null;
    return times;
  } catch { return null; }
}

/** This is a necessary date check, not proof that the zone matches the location. */
export function prayerTimesMatchDeviceDay(times: NonNullable<ReturnType<typeof calculatePrayerTimes>>, date: Date, zone: string): boolean {
  try {
    const day=new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'});
    return day.format(times[1][1])===day.format(date) && day.format(times[2][1])===day.format(date);
  } catch { return false; }
}

/** Find the unshifted astronomical calculation whose noon and sunrise fall on
 * the requested device day. Some civil zones cross the international date
 * line relative to solar longitude. Never shift timestamps by 24 hours: that
 * would use the wrong day's solar position. Ambiguous days fail closed. */
export function calculatePrayerTimesForDeviceDay(latitude:number, longitude:number, date:Date, zone:string, method:Method, asr:Asr, night:NightRule) {
  if (!Number.isFinite(date.getTime())) return null;
  // Adhan reads the host's local date. Require the caller's zone to be that
  // same zone so candidate civil dates cannot silently diverge from its input.
  if (Intl.DateTimeFormat().resolvedOptions().timeZone !== zone) return null;
  const matches: NonNullable<ReturnType<typeof calculatePrayerTimes>>[]=[];
  for (const offset of [-1,0,1]) {
    const candidate=new Date(date.getFullYear(),date.getMonth(),date.getDate()+offset,12);
    const times=calculatePrayerTimes(latitude,longitude,candidate,method,asr,night);
    if (times && prayerTimesMatchDeviceDay(times,date,zone)) matches.push(times);
  }
  return matches.length===1 ? matches[0]! : null;
}
