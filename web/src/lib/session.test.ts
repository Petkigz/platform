import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

import {
  accountLabel,
  closingCopy,
  firstName,
  frontDoorCta,
  frontDoorDestination,
  mastheadActions,
  parseSession,
  staffNavLink,
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
    staff: false,
  });
});

test('a name that is only whitespace is no name, but the session still counts', () => {
  assert.deepEqual(parseSession({ signedIn: true, name: '   ' }), { signedIn: true, name: null, staff: false });
  assert.deepEqual(parseSession({ signedIn: true }), { signedIn: true, name: null, staff: false });
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
  assert.equal(accountLabel({ signedIn: true, name: 'Amina' }), 'Your area — Amina');
  assert.equal(accountLabel({ signedIn: true, name: null }), 'Your area');
  // No English between the two in a header that is in another language, and
  // the name starts with the words on the button.
  assert.equal(accountLabel({ signedIn: true, name: 'Amina' }, 'صفحتك'), 'صفحتك — Amina');

  // It is the accessible name, not the words on the button: the header has no
  // room for a name on a phone, and used to print one anyway.
  const masthead = readFileSync(new URL('../app/_shared/masthead-actions.tsx', import.meta.url), 'utf8');
  assert.match(masthead, /aria-label=\{name === action\.label \? undefined : name\}/u);
  assert.match(masthead, /className=\{className\}\s+aria-label=[^>]+>\s+\{action\.label\}\s+<\/Link>/u);
});

test('the front door stops offering sign-up to somebody who signed up', () => {
  assert.equal(frontDoorCta(false).href, '/sign-up');
  assert.equal(frontDoorCta(true).href, '/dashboard');
  assert.notEqual(frontDoorCta(true).href, '/sign-up');
});

test('the signed-in front door button goes to the place that knows where you belong', () => {
  // `/learn` was right for a learner and wrong for the owner, who was shown a
  // catalogue of their own courses. The redirector is the only thing that knows
  // the precedence, so this button goes through it rather than guessing.
  assert.equal(frontDoorCta(true).href, '/dashboard');
  assert.ok(frontDoorCta(true).label.length > 0);
});

test('the front door sends a signed-in person away, and a visitor nowhere', () => {
  assert.equal(frontDoorDestination(false), null, 'a visitor was redirected off the pitch');
  assert.equal(frontDoorDestination(true), '/dashboard');
});

test('asking for the public page is the way back', () => {
  // The owner checking a change, a teacher reading what a stranger reads.
  assert.equal(frontDoorDestination(true, { public: '1' }), null);
  assert.equal(frontDoorDestination(true, { public: 'true' }), null);
  assert.equal(frontDoorDestination(true, { public: ['1'] }), null);
  // Only an explicit yes. A stray `?public=0` is not a request for the pitch, and
  // a redirect cannot be argued with once it has happened.
  assert.equal(frontDoorDestination(true, { public: '0' }), '/dashboard');
  assert.equal(frontDoorDestination(true, { public: 'yes' }), '/dashboard');
  assert.equal(frontDoorDestination(false, { public: '0' }), null);
});

test('the closing sentence is not the visitor sentence with a word changed', () => {
  const visitor = closingCopy(false);
  const member = closingCopy(true);

  assert.match(visitor, /Create an account/);
  assert.doesNotMatch(member, /Create an account/);
  assert.notEqual(visitor, member);
});

test('staff are told so only by an exact true, and only when signed in', () => {
  assert.equal(parseSession({ signedIn: true, staff: true }).staff, true);
  for (const junk of ['true', 1, null, undefined, {}, false]) {
    assert.equal(parseSession({ signedIn: true, staff: junk }).staff, false, JSON.stringify(junk));
  }
  // Signed out is nobody, whatever else the answer claims.
  assert.equal(parseSession({ signedIn: false, staff: true }).staff, false);
});

test('staff have a way back to the console from every page, and nobody else is shown one', () => {
  // The owner, 2026-11-27: after opening another tab of the header there was
  // "no button or element" that led back to the console.
  // The word is handed in: it is the catalogue's, in the reader's language.
  assert.deepEqual(staffNavLink({ signedIn: true, name: null, staff: true }, 'Admin'), { label: 'Admin', href: '/admin' });
  assert.deepEqual(staffNavLink({ signedIn: true, name: null, staff: true }, 'الإدارة'), { label: 'الإدارة', href: '/admin' });
  assert.equal(staffNavLink({ signedIn: true, name: 'Amina', staff: false }, 'Admin'), null);
  assert.equal(staffNavLink({ signedIn: true, name: 'Amina' }, 'Admin'), null);
  assert.equal(staffNavLink({ signedIn: false, name: null, staff: true }, 'Admin'), null);

  const read = (path: string) => readFileSync(new URL(path, import.meta.url), 'utf8');
  // The answer comes from the question `/admin` itself is guarded by, so the
  // link is never shown to somebody the page would turn away.
  const route = read('../app/api/session/route.ts');
  assert.match(route, /rpc\('is_privileged', \{ p_user_id: user\.id \}\)/u);
  assert.match(route, /staff: privileged === true/u);
  // It is in the main navigation, drawn by the layout on every page, and it
  // shares the masthead's one request.
  const layout = read('../app/layout.tsx');
  assert.match(layout, /<nav className="nav"[^>]*>\s*<StaffNavLink\s/u);
  // The layout reads the word on the server, in the language the console's
  // sentences are shown in, and marks it only when that is not the page's.
  assert.match(layout, /const consoleShown = languageShownFor\(code, 'console'\);/u);
  assert.match(layout, /label=\{translator\(consoleShown\.code\)\('console\.nav'\)\}/u);
  assert.match(layout, /mark=\{consoleShown\.code !== code \? \{ lang: consoleShown\.code, dir: consoleShown\.dir \} : undefined\}/u);
  const link = read('../app/_shared/staff-nav-link.tsx');
  assert.match(link, /sessionOnce\(\)/u);
  assert.doesNotMatch(link, /fetch\(/u);
  // No English word and no fixed language in the component any more.
  assert.doesNotMatch(link, /lang="en"|'Admin'/u);
  assert.match(link, /staffNavLink\(session, label\)/u);
  assert.match(link, /\{\.\.\.\(mark \?\? \{\}\)\}/u);
  assert.doesNotMatch(read('./session.ts'), /label: 'Admin'/u);
});
