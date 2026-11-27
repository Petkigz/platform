import assert from 'node:assert/strict';
import test from 'node:test';
import { homeFor, safeNextPath, type RoleFacts } from './auth.ts';

test('safeNextPath preserves a relative in-app destination', () => {
  assert.equal(safeNextPath('/learn/course?from=sign-in#lesson'), '/learn/course?from=sign-in#lesson');
});

test('an invitation link survives signing in', () => {
  // The accept page redirects to sign-in with itself as `next`. If this were dropped the
  // person would land on their dashboard and the invitation would look broken.
  const invitation = '/share/invite/6f1a1b6a-0000-4000-8000-000000000c03';
  assert.equal(safeNextPath(invitation), invitation);
  assert.equal(safeNextPath(`/sign-in?next=${encodeURIComponent(invitation)}`, '/dashboard'),
    `/sign-in?next=${encodeURIComponent(invitation)}`);
});

test('safeNextPath rejects external, protocol-relative and malformed destinations', () => {
  for (const value of ['https://evil.example', '//evil.example/path', '/\\evil.example/path', '/\n/evil.example/path', '/\t/evil.example/path', '/a/..//evil.example/path', '/%2e%2e//evil.example/path', 'javascript:alert(1)', '', null, undefined]) {
    assert.equal(safeNextPath(value), '/learn');
  }
});

const nobody: RoleFacts = {
  platformAdmin: false,
  governanceAdmin: false,
  financeAdmin: false,
  supportAgent: false,
  boardMember: false,
  boardActive: false,
  instructor: false,
  reviewer: false,
};

test('a staff member who is not the owner lands on the staff console, not on a learner page', () => {
  // The standing gap: a finance-only or support-only login used to fall through
  // every branch and land on `/learn`, which shows them nothing they can work.
  assert.equal(homeFor({ ...nobody, financeAdmin: true }), '/admin');
  assert.equal(homeFor({ ...nobody, supportAgent: true }), '/admin');
  assert.equal(homeFor({ ...nobody, financeAdmin: true, supportAgent: true }), '/admin');
  // And holding a learner-facing role as well does not send them backwards.
  assert.equal(homeFor({ ...nobody, financeAdmin: true, instructor: true }), '/admin');
});

test('each role lands in its own area', () => {
  assert.equal(homeFor({ ...nobody, platformAdmin: true }), '/admin');
  assert.equal(homeFor({ ...nobody, governanceAdmin: true }), '/admin');
  assert.equal(homeFor({ ...nobody, boardMember: true, boardActive: true }), '/admin/reviewers');
  assert.equal(homeFor({ ...nobody, instructor: true }), '/teach');
  assert.equal(homeFor({ ...nobody, reviewer: true }), '/review');
  assert.equal(homeFor(nobody), '/learn', 'a learner is the default, not a failure');
});

test('the widest authority is asked first, because roles overlap', () => {
  // The owner is often a teacher too; a teacher is often a reviewer.
  assert.equal(homeFor({ ...nobody, platformAdmin: true, instructor: true }), '/admin');
  assert.equal(homeFor({ ...nobody, governanceAdmin: true, reviewer: true }), '/admin');
  assert.equal(homeFor({ ...nobody, instructor: true, reviewer: true }), '/teach');
});

test('a board member whose board is not convened is not sent to a door that refuses them', () => {
  // The register and /admin both refuse them, so the fall-through has to be a
  // page they may actually open.
  assert.equal(homeFor({ ...nobody, boardMember: true, boardActive: false }), '/learn');
  assert.equal(
    homeFor({ ...nobody, boardMember: true, boardActive: false, reviewer: true }),
    '/review',
  );
});

test('a role question that fails is asked again, and is never read as no', async () => {
  const { askRole } = await import('./auth.ts');
  const answers = (list: { data: unknown; error: unknown }[]) => {
    let asked = 0;
    return { ask: async () => list[Math.min(asked++, list.length - 1)] ?? { data: null, error: 'none' }, count: () => asked };
  };
  // Answered: true is yes, anything else is no, and it is asked once.
  let q = answers([{ data: true, error: null }]);
  assert.equal(await askRole(q.ask), true); assert.equal(q.count(), 1);
  for (const data of [false, null, 'true', 1]) {
    q = answers([{ data, error: null }]);
    assert.equal(await askRole(q.ask), false); assert.equal(q.count(), 1);
  }
  // Failed once, answered the second time: the answer, not a no.
  q = answers([{ data: null, error: { message: 'fetch failed' } }, { data: true, error: null }]);
  assert.equal(await askRole(q.ask), true); assert.equal(q.count(), 2);
  // Never answered: it throws, so the owner is not drawn a learner's page.
  q = answers([{ data: null, error: { message: 'fetch failed' } }]);
  await assert.rejects(() => askRole(q.ask), /could not be read/); assert.equal(q.count(), 2);
});
