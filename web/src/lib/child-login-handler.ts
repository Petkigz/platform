import { normaliseUsername, passwordProblem, usernameProblem } from './child-login.ts';
import { createChildLogin, type ChildLoginCreatePorts } from './child-login-create.ts';

/** What a guardian is told when the child's age is why no login was made. */
export const CHILD_LOGIN_AGE_ENGLISH = {
  under_twelve:
    'A child under twelve does not have a login of their own. They learn through your sign-in. Nothing was made.',
  confirm_twelve: 'Confirm that this child is twelve or older first. Nothing was made.',
} as const;

export type ChildLoginHandlerResult =
  | { status: 200; body: { ok: true; username: string; recovered: boolean } }
  | { status: 400 | 409; body: { ok: false; message: string; code?: 'under_twelve' | 'confirm_twelve' } };

/** Guardian identity is supplied by the authenticated server, never by the body. */
export async function handleChildLoginCreation(
  ports: ChildLoginCreatePorts,
  guardianId: string,
  body: unknown,
): Promise<ChildLoginHandlerResult> {
  const raw = body && typeof body === 'object' ? body as Record<string, unknown> : {};
  const learnerId = typeof raw.learnerId === 'string' ? raw.learnerId : '';
  const username = normaliseUsername(typeof raw.username === 'string' ? raw.username : '');
  const password = typeof raw.password === 'string' ? raw.password : '';
  // Only a literal true is the guardian's yes.
  const twelveOrOlder = raw.twelveOrOlder === true;
  if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(learnerId)) {
    return { status: 400, body: { ok: false, message: 'That child could not be identified.' } };
  }
  const problem = usernameProblem(username) ?? passwordProblem(password);
  if (problem) return { status: 400, body: { ok: false, message: problem } };

  const outcome = await createChildLogin(ports, { learnerId, guardianId, username, password, twelveOrOlder });
  if (!outcome.ok && outcome.phase === 'age') {
    return { status: 400, body: { ok: false, code: outcome.code, message: CHILD_LOGIN_AGE_ENGLISH[outcome.code] } };
  }
  if (!outcome.ok) {
    return { status: 409, body: { ok: false, message:
      'We could not confirm this login. Refresh the family page or contact privacy@ayahspring.com before retrying. If you retry, use the original password.' } };
  }
  return { status: 200, body: { ok: true, username, recovered: outcome.recovered } };
}
