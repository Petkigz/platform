'use client';
import { useState } from 'react';
export function QuarantineScan({assetId}:{assetId:string}) {
  const [busy,setBusy]=useState(false);const [message,setMessage]=useState('');
  async function scan(){
    setBusy(true);setMessage('');
    try {
      const response=await fetch('/api/admin/coursework/quarantine-scan',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({asset:assetId})});
      const data:unknown=await response.json().catch(()=>null);
      if(!data || typeof data!=='object' || Array.isArray(data)) throw new Error('The scan could not be confirmed.');
      const row=data as Record<string,unknown>;
      if(!response.ok || row.ok!==true) throw new Error(typeof row.message==='string' ? row.message : 'The scan could not be confirmed.');
      if((row.outcome!=='clean' && row.outcome!=='infected') || typeof row.bytes!=='number' || !Number.isSafeInteger(row.bytes) || row.bytes<=0 || row.quarantineReleased!==false) throw new Error('The scan could not be confirmed.');
      setMessage(row.outcome==='infected' ? 'The scanner detected a threat in the downloaded bytes. Keep the file quarantined and review the incident.' : 'The scanner found no known threat in the downloaded bytes. This does not guarantee safety, inspect encrypted contents, or prove a later download is the same object.');
    } catch(error){setMessage(error instanceof Error ? error.message : 'The scan could not be confirmed.');}
    finally {setBusy(false);}
  }
  return <div><button type="button" className="btn ghost tiny" disabled={busy} onClick={()=>void scan()}>{busy ? 'Scanning…' : 'Scan quarantined file locally'}</button>
    {message && <p className="notice warn" role="status">{message} Quarantine was not released by this scan.</p>}</div>;
}
