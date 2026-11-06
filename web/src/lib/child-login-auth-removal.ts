/** Provider operations never accept a browser-supplied identity. The session RPC
 * authorizes a task and names the original, trusted marked account. */
export type ChildLoginAuthRemovalTarget = { identityId: string; attemptId: string; email: string };
export type ChildLoginAuthRemovalPorts = {
  authorize: (taskId: string) => Promise<ChildLoginAuthRemovalTarget>;
  lookup: (identityId: string) => Promise<{ id: string; email: string | null; marker: unknown }>;
  remove: (identityId: string) => Promise<void>;
  recordAbsence: (taskId: string) => Promise<void>;
};
export type ChildLoginAuthRemovalResult = { ok: true } | { ok: false };

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function removeTrustedChildAuth(
  ports: ChildLoginAuthRemovalPorts, taskId: string,
): Promise<ChildLoginAuthRemovalResult> {
  if (!uuid.test(taskId)) return { ok: false };
  let target: ChildLoginAuthRemovalTarget;
  try {
    target = await ports.authorize(taskId);
    if (!uuid.test(target.identityId) || !uuid.test(target.attemptId)
      || !/^[a-z0-9][a-z0-9._-]{2,29}@learners\.ayahspring\.com$/.test(target.email)) return { ok: false };
    const identity = await ports.lookup(target.identityId);
    if (identity.id !== target.identityId || identity.email?.toLowerCase() !== target.email
      || identity.marker !== target.attemptId) return { ok: false };
  } catch { return { ok: false }; }

  // A failed HTTP response may still have committed at Auth. Ask the database
  // to record absence in either case; the recorder refuses while an identity
  // with the original ID or matching marker is still present.
  try { await ports.remove(target.identityId); } catch { /* outcome uncertain */ }
  try { await ports.recordAbsence(taskId); return { ok: true }; }
  catch { return { ok: false }; }
}
