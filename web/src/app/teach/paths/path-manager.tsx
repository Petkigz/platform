'use client';

import {useState} from 'react';
import {useRouter} from 'next/navigation';

type Course={id:string;title:string;slug:string};
type Item={id:string;course_id:string;position:number;required:boolean;courses:Course|null};
type Path={id:string;title:string;slug:string;description:string|null;audience:string;status:string;learning_path_items:Item[]};
export function PathManager({paths,courses}:{paths:Path[];courses:Course[]}){
  const router=useRouter();const[busy,setBusy]=useState<string|null>(null);const[message,setMessage]=useState<string|null>(null);
  async function send(payload:Record<string,string|boolean>,key:string){setBusy(key);setMessage(null);try{const r=await fetch('/api/teach/paths',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(payload)});const out=(await r.json().catch(()=>null)) as {ok?:boolean;message?:string}|null;if(!r.ok||out?.ok!==true){setMessage(out?.message??'Could not save the learning path.');return;}router.refresh();}catch{setMessage('Could not reach the learning path service.');}finally{setBusy(null);}}
  return <>
    {message&&<div className="notice" role="alert">{message}</div>}
    <section className="section-sm"><h2>Create a draft path</h2><div className="card" style={{padding:'1.25rem'}}><form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void send({action:'create',title:String(d.get('title')??''),slug:String(d.get('slug')??''),audience:String(d.get('audience')??'both'),description:String(d.get('description')??'')},'create');}}>
      <label>Title<input name="title" required maxLength={200}/></label><label>Slug<input name="slug" required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="quran-foundations"/></label>
      <label>Audience<select name="audience" defaultValue="both"><option value="both">Children and adults</option><option value="child">Children</option><option value="adult">Adults</option></select></label>
      <label>Description<textarea name="description" rows={2}/></label><button className="btn" disabled={busy!==null}>{busy==='create'?'Creating…':'Create draft path'}</button>
    </form></div></section>
    <section className="section-sm"><h2>Paths you can manage</h2>{paths.length===0?<p className="empty">No learning paths yet.</p>:<div className="grid cols-2">{paths.map(path=><article className="card" key={path.id}>
      <div className="outline-h"><h3>{path.title}</h3><span className="badge neutral">{path.status}</span></div><p><code>/{path.slug}</code> · {path.audience}</p>{path.description&&<p className="muted">{path.description}</p>}
      <h4>Courses</h4>{path.learning_path_items.length===0?<p className="muted">No courses added yet.</p>:<ol>{[...path.learning_path_items].sort((a,b)=>a.position-b.position).map(item=><li key={item.id}>
        {item.courses?.title??item.course_id} · {item.required?'Required':'Optional'}
        {path.status==='draft'&&<button type="button" className="btn ghost" disabled={busy!==null} onClick={()=>void send({action:'remove',itemId:item.id},`remove:${item.id}`)}>Remove</button>}
      </li>)}</ol>}
      {path.status==='draft'&&<form onSubmit={e=>{e.preventDefault();const d=new FormData(e.currentTarget);void send({action:'add',pathId:path.id,courseId:String(d.get('courseId')??''),required:d.get('required')==='true'},`add:${path.id}`);}}>
        <label>Add active, published course<select name="courseId" required defaultValue=""><option value="" disabled>Choose a course</option>{courses.map(course=><option key={course.id} value={course.id}>{course.title}</option>)}</select></label>
        <label>Course is<select name="required" defaultValue="true"><option value="true">Required</option><option value="false">Optional</option></select></label>
        <button className="btn secondary" disabled={busy!==null}>{busy===`add:${path.id}`?'Adding…':'Add course'}</button>
        <button type="button" className="btn" disabled={busy!==null} onClick={()=>void send({action:'activate',pathId:path.id},`activate:${path.id}`)}>{busy===`activate:${path.id}`?'Publishing…':'Publish path'}</button>
      </form>}
      {path.status!=='retired'&&<form onSubmit={e=>{e.preventDefault();const reason=String(new FormData(e.currentTarget).get('reason')??'');void send({action:'retire',pathId:path.id,reason},`retire:${path.id}`);}}>
        <label>Retirement reason<input name="reason" required maxLength={500}/></label><button className="btn ghost" disabled={busy!==null}>{busy===`retire:${path.id}`?'Retiring…':'Retire path'}</button>
      </form>}
    </article>)}</div>}</section>
  </>;
}
