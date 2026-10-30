import assert from 'node:assert/strict';
import test from 'node:test';

import {
  CHILD_LOGIN_DOMAIN, childLoginSentence, normaliseUsername, passwordProblem,
  signInAddress, usernameProblem,
} from './child-login.ts';

// ---------------------------------------------------------------------------
// A child's login.
//
// Two things matter here and neither is cosmetic: the username has to mean the
// same thing to a child typing it and to the database storing it, and a refusal
// has to arrive as a sentence about something a guardian can fix.
// ---------------------------------------------------------------------------

test('a username is lowercase and trimmed, wherever it came from', () => {
  assert.equal(normaliseUsername('  Amina.K '), 'amina.k');
  assert.equal(normaliseUsername('AMINA'), 'amina');
  assert.equal(normaliseUsername('amina.k'), 'amina.k');
});

test('the username rules are the database rules, said in words', () => {
  assert.equal(usernameProblem('amina.k'), null);
  assert.equal(usernameProblem('zayd_2019'), null);
  assert.match(usernameProblem('a1') ?? '', /at least three/);

  // Too short, too long, leading punctuation, spaces.
  assert.match(usernameProblem('') ?? '', /Choose a username/);
  assert.match(usernameProblem('ab') ?? '', /at least three/);
  assert.match(usernameProblem('a'.repeat(31)) ?? '', /at most thirty/);
  assert.match(usernameProblem('-amina') ?? '', /starts with a letter or a number/);
  assert.match(usernameProblem('amina k') ?? '', /no spaces/);
  assert.match(usernameProblem('amina@home') ?? '', /no spaces|only letters/);

  // Length is measured after trimming, because the form trims too.
  assert.equal(usernameProblem('  amina.k  '), null);
});

test('a password is the same eight characters the rest of the platform asks for', () => {
  assert.equal(passwordProblem(''), 'Set a password for your child.');
  assert.match(passwordProblem('1234567') ?? '', /eight characters/);
  assert.equal(passwordProblem('12345678'), null);
});

test('a bare word becomes a child address, an address is left alone', () => {
  assert.equal(signInAddress('Amina.K'), `amina.k@${CHILD_LOGIN_DOMAIN}`);
  assert.equal(signInAddress('  amina.k '), `amina.k@${CHILD_LOGIN_DOMAIN}`);

  // An adult's own address is never touched, whatever the case.
  assert.equal(signInAddress('Parent@Example.com'), 'Parent@Example.com');

  // The domain is one with no mailbox: nothing is sent there, and that is why a
  // child's password recovery is a guardian action rather than an email.
  assert.match(CHILD_LOGIN_DOMAIN, /^learners\./);
});

test('a bare word cannot be used to find out whether a child has an account', () => {
  // The transform is local and total: it never asks the database anything, so a
  // wrong username fails exactly as a wrong password does. This test exists to
  // stop somebody "improving" it into a lookup.
  assert.equal(typeof signInAddress('someone-who-does-not-exist'), 'string');
  assert.match(signInAddress('someone-who-does-not-exist'), /@/);
});

test('every refusal a guardian can meet is a sentence, and none of them leak a code', () => {
  const codes = [
    'child_login:disabled',
    'child_login:not_your_child',
    'child_login:already_has_one',
    'child_login:username_taken',
    'child_login:username_shape',
    'child_login:account_already_linked',
    'child_login:no_login',
    'age:declare_before_creating_a_child_login',
    'child_login_unavailable',
  ];

  for (const code of codes) {
    const sentence = childLoginSentence(code);
    assert.ok(sentence.length > 20, `${code} produced "${sentence}"`);
    assert.doesNotMatch(sentence, /child_login:|age:/,
      `${code} leaked its code to the screen`);
  }

  // Each one is about something different, so a guardian is not told the same
  // thing five ways.
  const distinct = new Set(codes.map((c) => childLoginSentence(c)));
  assert.equal(distinct.size, codes.length);

  // An unrecognised refusal is not dressed up as a real one.
  assert.match(childLoginSentence('some_new_code'), /please try again/);
  assert.match(childLoginSentence(null), /please try again/);
});
