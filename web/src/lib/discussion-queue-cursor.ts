/** Strictly shaped cursors are safe to use in PostgREST's filter grammar. */
export type DiscussionCursor = { createdAt: string; id: string };
const TIMESTAMP=/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,6})?(?:Z|[+-]\d{2}:\d{2})$/;
const UUID=/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
function valid(value:unknown): value is DiscussionCursor {
  if(!value || typeof value!=='object' || Array.isArray(value)) return false;
  const c=value as Record<string,unknown>;
  return typeof c.createdAt==='string' && TIMESTAMP.test(c.createdAt) && Number.isFinite(Date.parse(c.createdAt)) &&
    typeof c.id==='string' && UUID.test(c.id);
}
export function encodeDiscussionCursor(value:DiscussionCursor):string {
  if(!valid(value)) throw new Error('The discussion queue cursor could not be created.');
  return btoa(JSON.stringify(value)).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
export function decodeDiscussionCursor(token:unknown):DiscussionCursor | null {
  if(typeof token!=='string' || !/^[A-Za-z0-9_-]{1,256}$/.test(token))return null;
  try {
    const base64=token.replace(/-/g,'+').replace(/_/g,'/');
    const value:unknown=JSON.parse(atob(base64.padEnd(Math.ceil(base64.length/4)*4,'=')));
    return valid(value) ? value : null;
  } catch {return null;}
}
