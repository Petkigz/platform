import assert from 'node:assert/strict';
import test from 'node:test';

import {
  accountLabel,
  closingCopy,
  firstName,
  frontDoorCta,
  mastheadActions,
  parseSession,
} from './session.ts';

test('anything that is not a session is nobody', () => {
  for (const junk of [null, undefined, '', 'signed in', 42, [], {}, { signedIn: 'true' }, { signedIn: 1 }]) {
    const parsed = parseSession(junk);
    assert.equal(parsed.signedIn, false, `${JSON.stringify(junk)} became a session`);
    assert.equal(parsed.name, null);
  }
});

test('a signed-in session keeps a trimmed first name and nothing more', () => {
  assert.deepEqual(parseSession({ signedIn: true, name: '  Amina Yusuf ' }), {
    signedIn: true,
    name: 'Amina',
  });
});

test('a name that is only whitespace is no name, but the session still counts', () => {
  assert.deepEqual(parseSession({ signedIn: true, name: '   ' }), { signedIn: true, name: null });
  assert.deepEqual(parseSession({ signedIn: true }), { signedIn: true, name: null });
});

test('firstName splits on any run of whitespace and refuses the empty case', () => {
  assert.equal(firstName('Amina\tYusuf'), 'Amina');
  assert.equal(firstName('  Amina  '), 'Amina');
  assert.equal(firstName(''), null);
  assert.equal(firstName('   '), null);
  assert.equal(firstName(null), null);
  assert.equal(firstName(7), null);
});

test('signed out, the header offers the way in', () => {
  const actions = mastheadActions({ signedIn: false, name: null });
  assert.deepEqual(actions.map((a) => a.href), ['/sign-in', '/sign-up']);
  assert.equal(actions.filter((a) => a.emphasis === 'primary').length, 1);
});

test('signed in, the header never offers to sign in again', () => {
  const actions = mastheadActions({ signedIn: true, name: 'Amina' });
  const hrefs = actions.map((a) => a.href);

  assert.ok(!hrefs.includes('/sign-in'), 'a signed-in header offered sign-in');
  assert.ok(!hrefs.includes('/sign-up'), 'a signed-in header offered sign-up');
  assert.deepEqual(hrefs, ['/sign-out', '/dashboard']);
});

test('signing out is a POST, because the route refuses GET', () => {
  const signOut = mastheadActions({ signedIn: true, name: null }).find((a) => a.href === '/sign-out');
  assert.ok(signOut, 'no sign-out action');
  assert.equal(signOut.method, 'post');
});

test('the accessible name says who is signed in when it is known', () => {
  assert.equal(accountLabel({ signedIn: true, name: 'Amina' }), 'Your area — signed in as Amina');
  assert.equal(accountLabel({ signedIn: true, name: null }), 'Your area');
});

test('the front door stops offering sign-up to somebody who signed up', () => {
  assert.equal(frontDoorCta(false).href, '/sign-up');
  assert.equal(frontDoorCta(true).href, '/learn');
  assert.notEqual(frontDoorCta(true).href, '/sign-up');
});

test('the signed-in front door button goes somewhere that exists', () => {
  assert.equal(frontDoorCta(true).href, '/learn');
  assert.ok(frontDoorCta(true).label.length > 0);
});

test('the closing sentence is not the visitor sentence with a word changed', () => {
  const visitor = closingCopy(false);
  const member = closingCopy(true);

  assert.match(visitor, /Create an account/);
  assert.doesNotMatch(member, /Create an account/);
  assert.notEqual(visitor, member);
});
