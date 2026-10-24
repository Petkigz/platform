import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DirectoryError,
  directorySummary,
  parseDirectory,
  roleLabel,
} from './directory.ts';

const account = {
  userId: 'u-1',
  name: 'Amina Yusuf',
  email: 'amina@example.com',
  status: 'active',
  country: 'UG',
  joinedAt: '2026-10-24T08:00:00Z',
  roles: ['guardian', 'learner'],
  learnerProfiles: 2,
  courses: 0,
};

const teacher = {
  userId: 'u-2',
  name: 'Ustadh Bilal',
  email: 'bilal@example.com',
  joinedAt: '2026-10-20T08:00:00Z',
  slug: 'ustadh-bilal',
  profileStatus: 'published',
  headline: 'Qur’an and tajweed',
  publishedCourses: 3,
  courses: 4,
  learners: 120,
};

const accountsPayload = { kind: 'accounts', query: null, total: 1, shown: 1, truncated: false, rows: [account] };
const teachersPayload = { kind: 'teachers', query: null, total: 1, shown: 1, truncated: false, rows: [teacher] };

test('an account list is read as the database shaped it', () => {
  const result = parseDirectory(accountsPayload);
  assert.equal(result.kind, 'accounts');
  assert.equal(result.rows.length, 1);
  if (result.kind === 'accounts') {
    assert.deepEqual(result.rows[0]!.roles, ['guardian', 'learner']);
    assert.equal(result.rows[0]!.learnerProfiles, 2);
  }
});

test('a teacher list carries what they teach, not what they earn', () => {
  const result = parseDirectory(teachersPayload);
  assert.equal(result.kind, 'teachers');
  if (result.kind === 'teachers') {
    assert.equal(result.rows[0]!.publishedCourses, 3);
    assert.equal(result.rows[0]!.learners, 120);
    assert.equal(result.rows[0]!.profileStatus, 'published');
  }
});

test('a payload that does not say what it is a list of is refused', () => {
  // `/admin/users` rendering a teacher roster would be a page that lies about
  // which question it answers.
  assert.throws(() => parseDirectory({ rows: [] }), DirectoryError);
  assert.throws(() => parseDirectory(null), DirectoryError);
  assert.throws(() => parseDirectory({ kind: 'people', rows: [] }), /what it is a list of/);
});

test('a row with a field the directory does not show refuses the payload', () => {
  // The guard against a balance appearing on this screen later: the parser has
  // to be edited first, and editing it means reading why it is a list.
  assert.throws(
    () => parseDirectory({ ...accountsPayload, rows: [{ ...account, balanceMinor: 1200 }] }),
    /balanceMinor/,
  );
  assert.throws(
    () => parseDirectory({ ...teachersPayload, rows: [{ ...teacher, earningsMinor: 900 }] }),
    /earningsMinor/,
  );
});

test('an account with no role reads as an empty list, not as an unknown', () => {
  const result = parseDirectory({ ...accountsPayload, rows: [{ ...account, roles: [] }] });
  if (result.kind === 'accounts') assert.deepEqual(result.rows[0]!.roles, []);
});

test('a missing name refuses the row rather than rendering a blank person', () => {
  assert.throws(() => parseDirectory({ ...accountsPayload, rows: [{ ...account, name: '' }] }),
    /no name/);
});

test('a truncated list admits it, and one that is cut short without saying so is caught', () => {
  const honest = parseDirectory({ ...accountsPayload, total: 120, shown: 1, truncated: true });
  assert.equal(honest.truncated, true);

  // The database might one day forget the flag. The arithmetic still knows: a
  // total larger than the rows means rows are missing.
  const silent = parseDirectory({ ...accountsPayload, total: 120, shown: 1, truncated: false });
  assert.equal(silent.truncated, true);
});

test('the summary says the count, and says when it is not all of them', () => {
  assert.equal(directorySummary({ total: 0, shown: 0, truncated: false }, 'account'), 'No accounts match.');
  assert.equal(directorySummary({ total: 1, shown: 1, truncated: false }, 'account'), 'One account.');
  assert.equal(directorySummary({ total: 7, shown: 7, truncated: false }, 'teacher'), '7 teachers.');
  assert.equal(
    directorySummary({ total: 120, shown: 50, truncated: true }, 'account'),
    'Showing 50 of 120 accounts. Narrow the search to see the rest.',
  );
});

test('a role code is said the way a person reads it', () => {
  assert.equal(roleLabel('platform_admin'), 'Owner');
  assert.equal(roleLabel('scholarly_panel_member'), 'Scholar board');
  // An unknown code is shown raw but readable, rather than dropped.
  assert.equal(roleLabel('new_role'), 'new role');
});
