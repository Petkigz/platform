import { CalculationMethod, Coordinates, HighLatitudeRule, Madhab, PolarCircleResolution, PrayerTimes } from 'adhan';

export const methods = {
  MuslimWorldLeague: 'Muslim World League',
  Egyptian: 'Egyptian General Authority of Survey',
  Karachi: 'University of Islamic Sciences, Karachi',
  MoonsightingCommittee: 'Moonsighting Committee',
  NorthAmerica: 'ISNA / North America',
  Singapore: 'Singapore',
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
    if(times.some(([,time])=>!Number.isFinite(time.getTime()))) return null;
    return times;
  } catch { return null; }
}
