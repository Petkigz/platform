/**
 * Coordinates one verified reservation with the auth provider. A reservation is
 * durable and the provider's app metadata binds the identity to that attempt.
 * On uncertain outcomes do not delete an identity or release the reservation:
 * the other system may have committed even though its response was lost.
 */
export type ChildLoginCreatePorts = {
  prepare: (learnerId: string, username: string) => Promise<string>;
  findIdentity: (attemptId: string, guardianId: string) => Promise<string | null>;
  createIdentity: (input: { username: string; password: string; attemptId: string }) => Promise<string>;
  complete: (attemptId: string, guardianId: string, userId: string, expected: { learnerId: string; username: string }) => Promise<void>;
};

export type ChildLoginCreateResult =
  | { ok: true; recovered: boolean }
  | { ok: false; phase: 'reservation' | 'unknown' };

export async function createChildLogin(
  ports: ChildLoginCreatePorts,
  input: { learnerId: string; guardianId: string; username: string; password: string },
): Promise<ChildLoginCreateResult> {
  let attemptId: string;
  try {
    attemptId = await ports.prepare(input.learnerId, input.username);
    if (!attemptId) return { ok: false, phase: 'reservation' };
  } catch {
    // Even a lost reservation reply is not proof that it did not commit.
    return { ok: false, phase: 'reservation' };
  }

  try {
    let userId = await ports.findIdentity(attemptId, input.guardianId);
    let recovered = userId !== null;
    if (!userId) {
      try {
        userId = await ports.createIdentity({ username: input.username, password: input.password, attemptId });
      } catch {
        // The provider may have created the identity before a timeout. Look for
        // our marker, never an unmarked account that happens to share the name.
        userId = await ports.findIdentity(attemptId, input.guardianId);
        recovered = userId !== null;
      }
    }
    if (!userId) return { ok: false, phase: 'unknown' };
    await ports.complete(attemptId, input.guardianId, userId, { learnerId: input.learnerId, username: input.username });
    return { ok: true, recovered };
  } catch {
    return { ok: false, phase: 'unknown' };
  }
}
