'use client';
import { useEffect, useState } from 'react';
import { calculatePrayerTimesForDeviceDay, methods, selectedNightRule, type Asr, type Method } from '@/lib/prayer-calculation';

type Result = { lines: readonly (readonly [string,string])[]; date:string; zone:string; method:string; asr:string; night:string };
export function PrayerTimesTool() {
  const [latitude,setLatitude]=useState(''); const [longitude,setLongitude]=useState('');
  const [method,setMethod]=useState(''); const [asr,setAsr]=useState(''); const [night,setNight]=useState('');
  const [confirmZone,setConfirmZone]=useState(false); const [message,setMessage]=useState('');
  const [result,setResult]=useState<Result|null>(null); const [locating,setLocating]=useState(false);
  const [deviceZone,setDeviceZone]=useState('');
  useEffect(()=>{setDeviceZone(Intl.DateTimeFormat().resolvedOptions().timeZone || '');},[]);
  useEffect(()=>{
    if(!result) return;
    function invalidateIfOutdated() {
      const zone=Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      let day='';
      try { if(zone) day=new Intl.DateTimeFormat('en',{timeZone:zone,dateStyle:'full'}).format(new Date()); } catch { /* Fail closed if the zone is invalid. */ }
      if(zone!==result!.zone || day!==result!.date) {
        setResult(null);
        setMessage('The date or device time zone changed. Check your settings and calculate again.');
        if(zone!==result!.zone) {setDeviceZone(zone);setConfirmZone(false);}
      }
    }
    const timer=window.setInterval(invalidateIfOutdated,60000);
    window.addEventListener('focus',invalidateIfOutdated);
    document.addEventListener('visibilitychange',invalidateIfOutdated);
    return ()=>{window.clearInterval(timer);window.removeEventListener('focus',invalidateIfOutdated);document.removeEventListener('visibilitychange',invalidateIfOutdated);};
  },[result]);
  function locate() {
    setResult(null); setMessage('');
    if (!navigator.geolocation) { setMessage('Location is not available in this browser. You can enter coordinates manually.'); return; }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(position=>{
      setLatitude(String(position.coords.latitude)); setLongitude(String(position.coords.longitude));
      setLocating(false); setConfirmZone(false);
      setMessage(`Location received. Estimated accuracy: ${Math.round(position.coords.accuracy)} metres. Check that this location and your device time zone are correct.`);
    },()=>{setLocating(false);setMessage('Location was unavailable or permission was denied. You can enter coordinates manually.');}, {enableHighAccuracy:false,timeout:15000,maximumAge:0});
  }
  function calculate() {
    setResult(null); setMessage('');
    const nightRule=selectedNightRule(method,night);
    if(!latitude.trim() || !longitude.trim() || !method || !asr || !nightRule || !confirmZone) {setMessage('Enter coordinates, choose the calculation settings and confirm your device time zone.');return;}
    const lat=Number(latitude); const lon=Number(longitude); const now=new Date();
    if(!Number.isFinite(lat) || Math.abs(lat)>90 || !Number.isFinite(lon) || Math.abs(lon)>180) {setMessage('Enter a latitude between −90 and 90 and a longitude between −180 and 180.');return;}
    const zone=Intl.DateTimeFormat().resolvedOptions().timeZone;
    if(!zone) {setMessage('Your device time zone could not be identified.');return;}
    if(zone!==deviceZone) {setDeviceZone(zone);setConfirmZone(false);setMessage('Your device time zone changed. Check it and confirm again.');return;}
    const times=calculatePrayerTimesForDeviceDay(lat,lon,now,zone,method as Method,asr as Asr,nightRule);
    if(!times) {setMessage('A complete, consistent set of times could not be calculated for this location and date. At high latitudes normal solar events can be unavailable or fall in an unexpected order. Check the location and time zone and follow a timetable from your local mosque or authority. No polar approximation has been applied.');return;}
    const fmt=new Intl.DateTimeFormat('en', { timeZone:zone, year:'numeric',month:'short',day:'numeric',hour:'numeric',minute:'2-digit',timeZoneName:'short' });
    setResult({lines:times.map(([name,time])=>[name,fmt.format(time)] as const),date:new Intl.DateTimeFormat('en',{timeZone:zone,dateStyle:'full'}).format(now),zone,method:methods[method as Method],asr:asr==='hanafi'?'Hanafi (later)':'Standard (earlier)',night:night==='middle'?'Middle of the night':night==='seventh'?'One seventh of the night':'Twilight angle'});
  }
  const changed=()=>{setResult(null);setMessage('');};
  return <section className="card" aria-labelledby="prayer-heading">
    <h2 id="prayer-heading">Today’s estimated times</h2>
    <p>Calculations may differ from your mosque or local authority. Confirm prayer times and calculation choices with your community, especially at high latitudes. Sunrise is shown for reference; it is not a prayer.</p>
    <p>Location is used on this device and is not saved or sent to AyahSpring. Your browser or operating system may use a location provider. Reloading clears the entries; browser back navigation may restore them.</p>
    <button type="button" className="btn secondary" onClick={locate} disabled={locating}>{locating?'Finding location…':'Use device location'}</button>
    <div><label htmlFor="latitude">Latitude</label><input id="latitude" type="number" min="-90" max="90" step="any" disabled={locating} value={latitude} onChange={e=>{setLatitude(e.target.value);setConfirmZone(false);changed();}} /></div>
    <div><label htmlFor="longitude">Longitude</label><input id="longitude" type="number" min="-180" max="180" step="any" disabled={locating} value={longitude} onChange={e=>{setLongitude(e.target.value);setConfirmZone(false);changed();}} /></div>
    <p>For North America and the UK, the calculation library suggests the Moonsighting Committee method; this is not a local-authority ruling. For other regions, ask your local community which method to use.</p>
    <div><label htmlFor="method">Calculation method</label><select id="method" value={method} onChange={e=>{setMethod(e.target.value);changed();}}><option value="">Choose a method</option>{Object.entries(methods).map(([id,label])=><option key={id} value={id}>{label}</option>)}</select></div>
    {method==='Singapore' && <p className="notice">This calculation is not the official Singapore timetable and can differ by minutes. For Singapore, check the <a href="https://www.muis.gov.sg/resources/islamic-calendar/" target="_blank" rel="noopener noreferrer">MUIS prayer timetable</a>, especially around the start or end of a prayer time.</p>}
    <div><label htmlFor="asr">Asr calculation</label><select id="asr" value={asr} onChange={e=>{setAsr(e.target.value);changed();}}><option value="">Choose an Asr method</option><option value="standard">Standard (earlier)</option><option value="hanafi">Hanafi (later)</option></select></div>
    {method==='MoonsightingCommittee' ? <p>This method uses its own seasonal adjustments and a one-seventh approximation at northern latitudes of 55° or above; no separate night rule is needed.</p> : <>
      <div><label htmlFor="night">High-latitude night rule</label><select id="night" value={night} onChange={e=>{setNight(e.target.value);changed();}}><option value="">Choose a night rule</option><option value="middle">Middle of the night</option><option value="seventh">One seventh of the night</option><option value="angle">Twilight angle</option></select></div>
      <p>Night rules can limit Fajr and Isha even outside polar regions. Ask your community which rule it follows.</p>
    </>}
    <p>No polar fallback is applied. If a complete set of times cannot be calculated, consult your local mosque or authority.</p>
    <p>Your device time zone is <strong>{deviceZone || 'unavailable'}</strong>. It must match the coordinates, including daylight saving.</p>
    <label><input type="checkbox" checked={confirmZone} onChange={e=>{setConfirmZone(e.target.checked);changed();}} /> My device time zone matches this location.</label>
    <p><button type="button" className="btn" onClick={calculate} disabled={locating}>Calculate today</button></p>
    {message && <p className="notice" role="status">{message}</p>}
    {result && <div aria-live="polite"><h3>Times for {result.date}</h3><p>{result.zone} · {result.method} · Asr: {result.asr} · Night rule: {result.method==='Moonsighting Committee'?'Moonsighting Committee seasonal rule':result.night}</p><ul>{result.lines.map(([name,time])=><li key={name}><strong>{name}:</strong> {time}</li>)}</ul><p>Times do not recalculate automatically. Check the date and recalculate after a location or time-zone change. An old display is cleared when a date or zone change is detected.</p></div>}
  </section>;
}
