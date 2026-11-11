/** A database acknowledgement proves detachment only, not provider deletion. */
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const knownCodes = ['child_login:verified_guardian_required', 'child_login:not_your_child', 'child_login:no_login'] as const;

type RemovalResult =
  | { status: 200; body: { ok: true; removed: { removed: true; username: string; databaseAccessBlocked: boolean } } }
  | { status: 400 | 409; body: { ok: false; message?: string; code?: string } };

export async function handleChildLoginRemoval(
  remove: (learnerId: string, reason: string | null) => Promise<{ data: unknown; error: { message?: string } | null }>,
  body: unknown,
): Promise<RemovalResult> {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return {status:400,body:{ok:false,message:'The form could not be read. Please try again.'}};
  }
  const raw=body as Record<string,unknown>;
  if (typeof raw.learnerId !== 'string' || !UUID.test(raw.learnerId)) {
    return {status:400,body:{ok:false,message:'That is not a child we can find.'}};
  }
  if (raw.reason !== undefined && raw.reason !== null && typeof raw.reason !== 'string') {
    return {status:400,body:{ok:false,message:'The reason must be text.'}};
  }
  const reason=typeof raw.reason==='string' ? raw.reason.trim() : '';
  if (reason.length>200) return {status:400,body:{ok:false,message:'The reason can be at most 200 characters.'}};
  try {
    const result=await remove(raw.learnerId,reason || null);
    if (result.error) {
      const code=knownCodes.find(c=>result.error?.message===c);
      return {status:409,body:{ok:false,...(code ? {code} : {})}};
    }
    const data=result.data;
    if (!data || typeof data !== 'object' || Array.isArray(data)) return {status:409,body:{ok:false}};
    const row=data as Record<string,unknown>;
    if (row.removed!==true || typeof row.username!=='string' || !row.username || typeof row.databaseAccessBlocked!=='boolean') {
      return {status:409,body:{ok:false}};
    }
    return {status:200,body:{ok:true,removed:{removed:true,username:row.username,databaseAccessBlocked:row.databaseAccessBlocked}}};
  } catch {
    // A request can commit even if its reply is lost. Do not call it failed.
    return {status:409,body:{ok:false}};
  }
}
