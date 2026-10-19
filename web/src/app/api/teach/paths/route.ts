import {NextResponse} from 'next/server';
import {createClient} from '@/lib/supabase/server';
import {isSupabaseConfigured} from '@/lib/env';
import {addLearningPathItem,activateLearningPath,createLearningPath,removeLearningPathItem,retireLearningPath} from '@/lib/learning-paths';

const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export async function POST(request:Request){
  if(!isSupabaseConfigured())return NextResponse.json({ok:false,message:'Supabase is not configured.'},{status:503});
  let raw:unknown;try{raw=await request.json();}catch{return NextResponse.json({ok:false,message:'Malformed request.'},{status:400});}
  const b=(raw&&typeof raw==='object'?raw:{}) as Record<string,unknown>;
  const supabase=await createClient();const {data:{user}}=await supabase.auth.getUser();
  if(!user)return NextResponse.json({ok:false,message:'Sign in first.'},{status:401});
  let result;
  if(b.action==='create'){
    if(typeof b.title!=='string'||typeof b.slug!=='string'||typeof b.audience!=='string')return NextResponse.json({ok:false,message:'Title, slug and audience are required.'},{status:400});
    if(!['child','adult','both'].includes(b.audience))return NextResponse.json({ok:false,message:'Choose child, adult or both.'},{status:400});
    result=await createLearningPath(supabase,{title:b.title,slug:b.slug,audience:b.audience as 'child'|'adult'|'both',description:typeof b.description==='string'?b.description:undefined});
  }else if(b.action==='add'){
    if(typeof b.pathId!=='string'||!UUID.test(b.pathId)||typeof b.courseId!=='string'||!UUID.test(b.courseId)||typeof b.required!=='boolean')return NextResponse.json({ok:false,message:'Choose a valid path, course and required/optional setting.'},{status:400});
    result=await addLearningPathItem(supabase,{pathId:b.pathId,courseId:b.courseId,required:b.required});
  }else if(b.action==='remove'){
    if(typeof b.itemId!=='string'||!UUID.test(b.itemId))return NextResponse.json({ok:false,message:'Choose a valid path item.'},{status:400});
    result=await removeLearningPathItem(supabase,b.itemId);
  }else if(b.action==='activate'){
    if(typeof b.pathId!=='string'||!UUID.test(b.pathId))return NextResponse.json({ok:false,message:'Choose a valid path.'},{status:400});
    result=await activateLearningPath(supabase,b.pathId);
  }else if(b.action==='retire'){
    if(typeof b.pathId!=='string'||!UUID.test(b.pathId)||typeof b.reason!=='string')return NextResponse.json({ok:false,message:'Path and written reason are required.'},{status:400});
    result=await retireLearningPath(supabase,b.pathId,b.reason);
  }else return NextResponse.json({ok:false,message:'Unsupported learning path action.'},{status:400});
  if(!result.ok)return NextResponse.json(result,{status:/only the path author/i.test(result.message)?403:400});
  return NextResponse.json(result,{status:201});
}
