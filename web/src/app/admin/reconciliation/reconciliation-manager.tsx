'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

type Item={id:string;provider_reference:string|null;internal_amount_minor:string|number|null;provider_amount_minor:string|number|null;currency_code:string|null;match_status:string;discrepancy_reason:string|null;financial_transaction_id:string|null};
type Reconciliation={id:string;provider:string;period_start:string;period_end:string;status:string;started_at:string;closed_at:string|null;payment_reconciliation_items:Item[]};

export function ReconciliationManager({runs}:{runs:Reconciliation[]}){
  const router=useRouter();const [busy,setBusy]=useState<string|null>(null);const [message,setMessage]=useState<string|null>(null);const [notice,setNotice]=useState<string|null>(null);
  async function send(payload:Record<string,string>,key:string){setBusy(key);setMessage(null);setNotice(null);try{const res=await fetch('/api/admin/reconciliation',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const out=(await res.json().catch(()=>null)) as {ok?:boolean;message?:string;data?:unknown}|null;if(!res.ok||out?.ok!==true){setMessage(out?.message??'Could not update reconciliation.');return;}setNotice(typeof out.data==='string'?`Saved: ${out.data}`:'Saved.');router.refresh();}catch{setMessage('Could not reach the reconciliation service.');}finally{setBusy(null);}}
  return <>
    {message&&<div className="notice" role="alert">{message}</div>}{notice&&<div className="notice" role="status">{notice}</div>}
    <section className="section-sm">
      <h2>Start a statement period</h2>
      <p className="muted">No provider file format is assumed. Start a run, then enter statement references and signed minor-unit amounts. Credits are positive; debits are negative.</p>
      <div className="card" style={{padding:'1.25rem'}}><form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void send({action:'start',provider:String(d.get('provider')??''),periodStart:String(d.get('periodStart')??''),periodEnd:String(d.get('periodEnd')??'')},'start');}}>
        <label>Provider<input name="provider" required maxLength={80} placeholder="mtn_momo"/></label>
        <label>Period start<input name="periodStart" type="date" required/></label>
        <label>Period end<input name="periodEnd" type="date" required/></label>
        <button className="btn" disabled={busy!==null}>{busy==='start'?'Starting…':'Start reconciliation'}</button>
      </form></div>
    </section>
    <section className="section-sm"><h2>Reconciliation runs</h2>
      {runs.length===0?<p className="empty">No statement runs yet.</p>:<div className="grid cols-2">{runs.map(run=><article className="card" key={run.id}>
        <div className="outline-h"><h3>{run.provider}</h3><span className="badge neutral">{run.status}</span></div>
        <p>{run.period_start} – {run.period_end}</p><code style={{fontSize:'0.78rem'}}>{run.id}</code>
        <h4>Statement lines</h4>
        {run.payment_reconciliation_items.length===0?<p className="muted">No lines entered.</p>:<ul>{run.payment_reconciliation_items.map(item=><li key={item.id} style={{marginBottom:'0.75rem'}}>
          <strong>{item.match_status}</strong> · <code>{item.provider_reference}</code><br/>
          Provider: {item.provider_amount_minor} {item.currency_code} · Internal: {item.internal_amount_minor ?? '—'} {item.currency_code}
          {item.discrepancy_reason&&<span className="muted" style={{display:'block'}}>{item.discrepancy_reason}</span>}
          {(item.match_status==='unmatched'||item.match_status==='discrepant')&&run.status!=='closed'&&<form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void send({action:'resolve',itemId:item.id,transactionId:String(d.get('transactionId')??''),reason:String(d.get('reason')??'')},`resolve:${item.id}`);}}>
            <label>Internal transaction UUID<input name="transactionId" required placeholder="UUID"/></label>
            <label>Reason (required if still discrepant)<input name="reason" maxLength={500}/></label>
            <button className="btn secondary" disabled={busy!==null}>{busy===`resolve:${item.id}`?'Checking…':'Resolve / compare'}</button>
          </form>}
        </li>)}</ul>}
        {['open','in_progress'].includes(run.status)&&<form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void send({action:'add_line',reconciliationId:run.id,providerReference:String(d.get('providerReference')??''),amountMinor:String(d.get('amountMinor')??''),currencyCode:String(d.get('currencyCode')??'').toUpperCase()},`line:${run.id}`);}}>
          <h4>Add statement line</h4>
          <label>Provider reference<input name="providerReference" required maxLength={300}/></label>
          <label>Signed minor-unit amount<input name="amountMinor" required pattern="-?[1-9][0-9]*" inputMode="numeric" placeholder="-12500"/></label>
          <label>Currency<input name="currencyCode" required minLength={3} maxLength={3} defaultValue="UGX"/></label>
          <button className="btn secondary" disabled={busy!==null}>{busy===`line:${run.id}`?'Adding…':'Add line'}</button>
        </form>}
        {['open','in_progress','discrepancies_found'].includes(run.status)&&<button className="btn" disabled={busy!==null} onClick={()=>void send({action:'finalize',reconciliationId:run.id},`finalize:${run.id}`)}>{busy===`finalize:${run.id}`?'Checking…':'Finalize matching'}</button>}
        {['balanced','discrepancies_found'].includes(run.status)&&<form onSubmit={e=>{e.preventDefault();const reason=String(new FormData(e.currentTarget).get('reason')??'');void send({action:'close',reconciliationId:run.id,reason},`close:${run.id}`);}}>
          <label>Close reason<textarea name="reason" required maxLength={500} rows={2}/></label>
          <button className="btn" disabled={busy!==null}>{busy===`close:${run.id}`?'Closing…':'Close reconciliation'}</button>
        </form>}
      </article>)}</div>}
    </section>
  </>;
}
