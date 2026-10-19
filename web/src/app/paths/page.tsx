import Link from 'next/link';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/env';
import {isFlagEnabled} from '@/lib/flags';

export const dynamic='force-dynamic';

export default async function LearningPathsPage(){
  if(!isSupabaseConfigured())return <div className="container section"><h1>Learning paths</h1><p className="notice warn">The catalogue is not connected yet.</p></div>;
  const supabase=await createClient();
  const enabled=await isFlagEnabled(supabase,'learning.paths');
  if(!enabled)return <div className="container section"><p className="eyebrow">Guided learning</p><h1>Learning paths</h1><p className="notice">Guided paths are being prepared. Browse the <Link href="/catalogue">course catalogue</Link> while this feature is off.</p></div>;
  const {data,error}=await supabase.from('learning_paths').select(`
    id,title,slug,description,audience,
    learning_path_items(id,position,required,courses(id,title,slug,description,status))
  `).eq('status','active').is('deleted_at',null).order('title');
  if(error)throw new Error(error.message);
  return <div className="container section"><p className="eyebrow">Guided learning</p><h1>Learning paths</h1>
    <p className="lede">Follow a curated sequence of courses at your own pace. Each course keeps its own enrolment and access rules.</p>
    {(data??[]).length===0?<p className="empty">No learning paths are published yet.</p>:<div className="grid cols-2">{(data??[]).map(path=><article className="card" key={path.id}>
      <p className="eyebrow">{path.audience==='both'?'Children and adults':path.audience==='child'?'For children':'For adults'}</p><h2>{path.title}</h2>{path.description&&<p className="muted">{path.description}</p>}
      <ol>{[...(path.learning_path_items??[])].sort((a,b)=>a.position-b.position).map(item=><li key={item.id}>
        {item.courses?.[0]?.status==='active'?<Link href={`/courses/${item.courses[0].slug}`}>{item.courses[0].title}</Link>:(item.courses?.[0]?.title??'Course')}
        {!item.required&&<span className="badge neutral" style={{marginLeft:'.5rem'}}>Optional</span>}
      </li>)}</ol>
    </article>)}</div>}
  </div>;
}
