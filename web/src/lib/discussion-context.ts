import type { SupabaseClient } from '@supabase/supabase-js';

export type DiscussionContext = { id: string; lessonId: string; body: string; state: string };

/** Read parent questions with the caller's RLS. Missing context never becomes approval. */
export async function fetchDiscussionContexts(client: SupabaseClient, ids: string[]): Promise<Map<string,DiscussionContext>> {
  const result=new Map<string,DiscussionContext>();
  const unique=[...new Set(ids)];
  for (let offset=0;offset<unique.length;offset+=100) {
    const {data,error}=await client.from('discussion_posts')
      .select('id,lesson_id,body,visibility_state,parent_id,deleted_at')
      .in('id',unique.slice(offset,offset+100)).is('deleted_at',null);
    if(error) throw new Error(error.message);
    for(const row of data ?? []) {
      if(typeof row.id==='string' && typeof row.lesson_id==='string' && typeof row.body==='string' &&
          typeof row.visibility_state==='string' && row.parent_id===null && row.deleted_at===null)
        result.set(row.id,{id:row.id,lessonId:row.lesson_id,body:row.body,state:row.visibility_state});
    }
  }
  return result;
}
