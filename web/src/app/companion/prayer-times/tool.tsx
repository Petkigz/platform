'use client';
import { useEffect, useState } from 'react';
import { calculatePrayerTimesForDeviceDay, methodExampleForZone, methods, selectedNightRule, type Asr, type Method, type NightRule } from '@/lib/prayer-calculation';
import { useLocaleCode, useT } from '@/lib/i18n/client';

type Result = { lines: readonly (readonly [string,string])[]; date:string; zone:string; method:string; asr:Asr; night:NightRule };

/** A number as this language writes it, with English behind a bad tag. */
function number(locale: string, value: number): string {
  try { return new Intl.NumberFormat(locale).format(value); }
  catch { return String(value); }
}

/** A date in this language, with English behind a bad tag. */
function date(locale: string, options: Intl.DateTimeFormatOptions, value: Date): string {
  try { return new Intl.DateTimeFormat(locale, options).format(value); }
  catch { return new Intl.DateTimeFormat('en', options).format(value); }
}

export function PrayerTimesTool() {
  const t = useT();
  const locale = useLocaleCode();
  const [latitude,setLatitude]=useState(''); const [longitude,setLongitude]=useState('');
  const [method,setMethod]=useState(''); const [asr,setAsr]=useState(''); const [night,setNight]=useState('');
  const [confirmZone,setConfirmZone]=useState(false); const [message,setMessage]=useState('');
  const [result,setResult]=useState<Result|null>(null); const [locating,setLocating]=useState(false);
  const [deviceZone,setDeviceZone]=useState('');
  useEffect(()=>{setDeviceZone(Intl.DateTimeFormat().resolvedOptions().timeZone || '');},[]);
  useEffect(()=>{
    if(!deviceZone) return;
    function invalidateIfOutdated() {
      const zone=Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      if(zone!==deviceZone) {
        setDeviceZone(zone); setConfirmZone(false); setResult(null);
        setMessage(t('companion.prayerMsgZoneChanged'));
        return;
      }
      if(!result) return;
      let day='';
      try { day=date(locale,{timeZone:zone,dateStyle:'full'},new Date()); } catch { /* Fail closed if the zone is invalid. */ }
      if(day!==result.date) {
        setResult(null);
        setMessage(t('companion.prayerMsgDateChanged'));
      }
    }
    const timer=window.setInterval(invalidateIfOutdated,60000);
    window.addEventListener('focus',invalidateIfOutdated);
    document.addEventListener('visibilitychange',invalidateIfOutdated);
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',invalidateIfOutdated);document.removeEventListener('visibilitychange',invalidateIfOutdated);};
  },[result,deviceZone,t,locale]);
  function locate() {
    // A new request replaces the old location even if permission is denied or
    // the browser times out. Never let a failed refresh reuse stale coordinates.
    setResult(null); setMessage(''); setLatitude(''); setLongitude(''); setConfirmZone(false);
    if (!navigator.geolocation) { setMessage(t('companion.prayerMsgNoGeo')); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position=>{
      setLatitude(String(position.coords.latitude)); setLongitude(String(position.coords.longitude));
      setLocating(false); setConfirmZone(false);
      setMessage(t('companion.prayerMsgLocationReceived', { accuracy: number(locale, Math.round(position.coords.accuracy)) }));
    },()=>{setLocating(false);setMessage(t('companion.prayerMsgLocationDenied'));}, {enableHighAccuracy:false,timeout:15000,maximumAge:0});
  }
  function calculate() {
    setResult(null); setMessage('');
    const nightRule=selectedNightRule(method,night);
    if(!latitude.trim() || !longitude.trim() || !method || !asr || !nightRule || !confirmZone) {setMessage(t('companion.prayerMsgIncomplete'));return;}
    const lat=Number(latitude); const lon=Number(longitude); const now=new Date();
    if(!Number.isFinite(lat) || Math.abs(lat)>90 || !Number.isFinite(lon) || Math.abs(lon)>180) {setMessage(t('companion.prayerMsgRange'));return;}
    const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    if(!zone) {setMessage(t('companion.prayerMsgZoneUnknown'));return;}
    if(zone!==deviceZone) {setDeviceZone(zone);setConfirmZone(false);setMessage(t('companion.prayerMsgZoneChangedAgain'));return;}
    const times=calculatePrayerTimesForDeviceDay(lat,lon,now,zone,method as Method,asr as Asr,nightRule);
    if(!times) {setMessage(t('companion.prayerMsgCannotCalculate'));return;}
    const fmtOptions: Intl.DateTimeFormatOptions = { timeZone:zone, year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short' };
    setResult({lines:times.map(([name,time])=>[name,date(locale,fmtOptions,time)] as const),date:date(locale,{timeZone:zone,dateStyle:'full'},now),zone,method:methods[method as Method],asr:asr as Asr,night:nightRule});
  }
  const changed=()=>{setResult(null);setMessage('');};
  const example=methodExampleForZone(deviceZone);
  return <section className="card" aria-labelledby="prayer-heading">
    <h2 id="prayer-heading">{t('companion.prayerHeading')}</h2>
    <p>{t('companion.prayerLede')}</p>
    <p>{t('companion.prayerPrivacy')}</p>
    <button type="button" className="btn secondary" onClick={locate} disabled={locating}>{locating?t('companion.prayerLocating'):t('companion.prayerUseLocation')}</button>
    <div><label htmlFor="latitude">{t('companion.prayerLatitude')}</label><input id="latitude" type="number" min="-90" max="90" step="any" disabled={locating} value={latitude} onChange={e=>{setLatitude(e.target.value);setConfirmZone(false);changed();}} /></div>
    <div><label htmlFor="longitude">{t('companion.prayerLongitude')}</label><input id="longitude" type="number" min="-180" max="180" step="any" disabled={locating} value={longitude} onChange={e=>{setLongitude(e.target.value);setConfirmZone(false);changed();}} /></div>
    <p>{t('companion.prayerMethodIntro')}</p>
    {example && <div className="notice">
      <p>{t('companion.prayerExample', { zone: deviceZone, place: example.place, method: methods[example.method] })}</p>
      <button type="button" className="btn secondary" onClick={()=>{setMethod(example.method);changed();}}>{t('companion.prayerUseMethod')}</button>
    </div>}

    <div><label htmlFor="method">{t('companion.prayerMethodLabel')}</label><select id="method" value={method} onChange={e=>{setMethod(e.target.value);changed();}}><option value="">{t('companion.prayerMethodChoose')}</option>{Object.entries(methods).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div>
    {method==='Singapore' && <p className="notice">{t('companion.prayerSingaporeBefore')} <a href="https://www.muis.gov.sg/resources/islamic-calendar/" target="_blank" rel="noopener noreferrer">{t('companion.prayerSingaporeLink')}</a> {t('companion.prayerSingaporeAfter')}</p>}
    <div><label htmlFor="asr">{t('companion.prayerAsrLabel')}</label><select id="asr" aria-describedby="asr-explanation" value={asr} onChange={e=>{setAsr(e.target.value);changed();}}><option value="">{t('companion.prayerAsrChoose')}</option><option value="standard">{t('companion.prayerAsrStandard')}</option><option value="hanafi">{t('companion.prayerAsrHanafi')}</option></select></div>
    <p id="asr-explanation">{t('companion.prayerAsrNote')}</p>
    {method==='MoonsightingCommittee' ? <p>{t('companion.prayerMoonsightingNote')}</p> : <>
      <div><label htmlFor="night">{t('companion.prayerNightLabel')}</label><select id="night" aria-describedby="night-explanation" value={night} onChange={e=>{setNight(e.target.value);changed();}}><option value="">{t('companion.prayerNightChoose')}</option><option value="middle">{t('companion.prayerNightMiddle')}</option><option value="seventh">{t('companion.prayerNightSeventh')}</option><option value="angle">{t('companion.prayerNightAngle')}</option></select></div>
      <p id="night-explanation">{t('companion.prayerNightNote')}</p>
    </>}
    <p>{t('companion.prayerNoPolar')}</p>
    <p>{t('companion.prayerZone', { zone: deviceZone || t('companion.prayerZoneUnavailable') })}</p>
    <label className="row" style={{alignItems:'center',paddingBlock:'0.5rem'}}><input type="checkbox" checked={confirmZone} onChange={e=>{setConfirmZone(e.target.checked);changed();}} style={{width:'1.25rem',height:'1.25rem',flex:'0 0 1.25rem',margin:0}} /><span>{t('companion.prayerZoneConfirm')}</span></label>
    <p><button type="button" className="btn" onClick={calculate} disabled={locating}>{t('companion.prayerCalculate')}</button></p>
    {message && <p className="notice" role="status">{message}</p>}
    {result && <div aria-live="polite"><h3>{t('companion.prayerTimesFor', { date: result.date })}</h3><p>{t('companion.prayerSummary', { zone: result.zone, method: result.method, asr: result.asr==='hanafi' ? t('companion.prayerAsrHanafi') : t('companion.prayerAsrStandard'), night: result.method==='Moonsighting Committee' ? t('companion.prayerSummaryMoonsighting') : result.night==='middle' ? t('companion.prayerNightMiddle') : result.night==='seventh' ? t('companion.prayerNightSeventh') : t('companion.prayerNightAngle') })}</p><ul>{result.lines.map(([name,time])=><li key={name}><strong>{name}:</strong> {time}</li>)}</ul><p>{t('companion.prayerResultNote')}</p></div>}
  </section>;
}
