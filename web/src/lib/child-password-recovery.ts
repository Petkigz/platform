import { passwordProblem } from './child-login.ts';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const uncertain = 'We could not confirm the password change. Try signing in with the new password before trying again. A request may still complete for a few minutes.';
export type RecoveryPorts = {
  prepare: (learnerId: string) => Promise<unknown>;
  change: (identityId: string, resetId: string, password: string) => Promise<void>;
  status: (resetId: string) => Promise<unknown>;
};
export async function recoverChildPassword(ports: RecoveryPorts, input: unknown): Promise<{ok: true} | {ok: false; message: string; status: 400 | 409}> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) return {ok:false,status:400,message:'Choose a child and a new password.'};
  const body=input as Record<string,unknown>;
  if (typeof body.learnerId !== 'string' || !UUID.test(body.learnerId) || typeof body.password !== 'string') return {ok:false,status:400,message:'Choose a child and a new password.'};
  const issue=passwordProblem(body.password);
  if (issue) return {ok:false,status:400,message:issue};
  let resetId:string; let userId:string;
  try {
    const value=await ports.prepare(body.learnerId);
    if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('invalid reservation');
    const row=value as Record<string,unknown>;
    if (typeof row.resetId !== 'string' || !UUID.test(row.resetId) || typeof row.userId !== 'string' || !UUID.test(row.userId)) throw new Error('invalid reservation');
    resetId=row.resetId; userId=row.userId;
  } catch {return {ok:false,status:409,message:uncertain};}
  try {await ports.change(userId,resetId,body.password);} catch { /* provider may have committed */ }
  try {
    const value=await ports.status(resetId);
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      const row=value as Record<string,unknown>;
      if (row.resetId===resetId && typeof row.learnerId==='string' && row.learnerId.toLowerCase()===body.learnerId.toLowerCase() && row.completed===true) return {ok:true};
    }
  } catch { /* completion is unknown */ }
  return {ok:false,status:409,message:uncertain};
}
