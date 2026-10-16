'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

type Dispute={id:string;financial_transaction_id:string;order_id:string|null;dispute_type:string;provider:string;provider_reference:string|null;disputed_amount_minor:string|number;currency_code:string;status:string;opened_at:string;resolution_notes:string|null};
export function DisputeManager({disputes}:{disputes:Dispute[]}){
  const router=useRouter();const[busy,setBusy]=useState<string|null>(null);const[message,setMessage]=useState<string|null>(null);const[notice,setNotice]=useState<string|null>(null);
  async function send(payload:Record<string,string>,key:string){setBusy(key);setMessage(null);setNotice(null);try{const r=await fetch('/api/admin/disputes',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const x=(await r.json().catch(()=>null)) as{ok?:boolean;message?:string}|null;if(!r.ok||x?.ok!==true){setMessage(x?.message??'Could not update dispute.');return;}setNotice('Dispute record updated. Provider submission is a separate step.');router.refresh();}catch{setMessage('Could not reach dispute service.');}finally{setBusy(null);}}
  return <>
    {message&&<div className="notice" role="alert">{message}</div>}{notice&&<div className="notice" role="status">{notice}</div>}
    <section className="section-sm"><h2>Open a case</h2><p className="muted">Record a dispute notice against an internal transaction. This case log does not submit evidence to a provider.</p>
      <div className="card" style={{padding:'1.25rem'}}><form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void send({action:'open',transactionId:String(d.get('transactionId')??''),orderId:String(d.get('orderId')??''),type:String(d.get('type')??''),amountMinor:String(d.get('amountMinor')??''),currencyCode:String(d.get('currencyCode')??'').toUpperCase(),providerReference:String(d.get('providerReference')??'')},'open');}}>
        <label>Financial transaction UUID<input name="transactionId" required placeholder="UUID"/></label><label>Order UUID (optional)<input name="orderId" placeholder="UUID"/></label>
        <label>Dispute type<select name="type" defaultValue="chargeback"><option value="chargeback">Chargeback</option><option value="fraud">Fraud</option><option value="unauthorised">Unauthorised</option><option value="not_received">Not received</option><option value="other">Other</option></select></label>
        <label>Disputed amount, minor units<input name="amountMinor" required pattern="[1-9][0-9]*" inputMode="numeric"/></label><label>Currency<input name="currencyCode" required minLength={3} maxLength={3} defaultValue="UGX"/></label><label>Provider reference<input name="providerReference" maxLength={300}/></label>
        <button className="btn" disabled={busy!==null}>{busy==='open'?'Opening…':'Open dispute record'}</button>
      </form></div>
    </section>
    <section className="section-sm"><h2>Dispute cases</h2>{disputes.length===0?<p className="empty">No payment disputes recorded.</p>:<div className="grid cols-2">{disputes.map(d=><article className="card" key={d.id}>
      <div className="outline-h"><h3>{d.dispute_type}</h3><span className="badge neutral">{d.status}</span></div>
      <p>{d.provider} · {d.disputed_amount_minor} {d.currency_code}</p><p className="muted">Opened {new Date(d.opened_at).toLocaleDateString()}</p>
      <p><code>{d.financial_transaction_id}</code></p>{d.order_id&&<p>Order <code>{d.order_id}</code></p>}{d.provider_reference&&<p>Reference <code>{d.provider_reference}</code></p>}
      {d.resolution_notes&&<div className="notice">{d.resolution_notes}</div>}
      {d.status==='open'&&<form onSubmit={e=>{e.preventDefault();const notes=String(new FormData(e.currentTarget).get('notes')??'');void send({action:'update',disputeId:d.id,status:'under_review',notes},`review:${d.id}`);}}><label>Review note<input name="notes" required maxLength={1000}/></label><button className="btn secondary" disabled={busy!==null}>Start review</button></form>}
      {['under_review','evidence_submitted'].includes(d.status)&&<form onSubmit={e=>{e.preventDefault();const data=new FormData(e.currentTarget);void send({action:'update',disputeId:d.id,status:String(data.get('status')??''),notes:String(data.get('notes')??'')},`resolve:${d.id}`);}}>
        <label>Next state<select name="status" defaultValue={d.status==='under_review'?'evidence_submitted':'won'}>{d.status==='under_review'&&<option value="evidence_submitted">Evidence submitted</option>}<option value="won">Won</option><option value="lost">Lost</option><option value="withdrawn">Withdrawn</option></select></label>
        <label>Written note<textarea name="notes" required maxLength={1000} rows={2}/></label><button className="btn" disabled={busy!==null}>{busy===`resolve:${d.id}`?'Saving…':'Update dispute'}</button>
      </form>}
    </article>)}</div>}</section>
  </>;
}
