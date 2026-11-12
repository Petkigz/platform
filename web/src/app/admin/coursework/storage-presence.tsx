'use client';
import { useState } from 'react';

export function StoragePresence({assetId}:{assetId:string}) {
  const [busy,setBusy]=useState(false); const [message,setMessage]=useState('');
  async function check() {
    setBusy(true);setMessage('');
    try {
      const response=await fetch(`/api/admin/coursework/storage-presence?${new URLSearchParams({asset:assetId})}`,{cache:'no-store'});
      const data:unknown=await response.json().catch(()=>null);
      if (!data || typeof data!=='object' || Array.isArray(data)) throw new Error('The storage check could not be confirmed.');
      const r=data as Record<string,unknown>;
      if (!response.ok || r.ok!==true) throw new Error(typeof r.message==='string' ? r.message : 'The storage check could not be confirmed.');
      if (r.verifiedDeletion!==false || !['present','not_found','unknown'].includes(String(r.presence))) throw new Error('The storage check could not be confirmed.');
      setMessage(r.presence==='present' ? 'Storage reported the master object present at the time of the check.' :
        r.presence==='not_found' ? 'Storage returned not found for the master object at the time of the check. This does not verify deletion: the bucket, access, other copies and future writes need separate review.' :
          'Storage did not provide a conclusive response. The object may still exist.');
    } catch (error) {setMessage(error instanceof Error ? error.message : 'The storage check could not be confirmed.');}
    finally {setBusy(false);}
  }
  return <div><button type="button" className="btn ghost tiny" disabled={busy} onClick={()=>void check()}>{busy ? 'Checking storage…' : 'Check master presence'}</button>
    {message && <p className="notice warn" role="status">{message} This check does not delete anything or record a deletion.</p>}</div>;
}
