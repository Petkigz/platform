import assert from 'node:assert/strict';
import test from 'node:test';
import {
  describeOAuthFailure,
  oauthRedirectUrl,
  safeNextPath,
} from './oauth.ts';

test('the callback carries a safe destination and nothing else', () => {
  assert.equal(
    oauthRedirectUrl('https://ayahspring.example', '/teach'),
    'https://ayahspring.example/auth/callback?next=%2Fteach',
  );
  // A trailing slash on the origin does not produce a double slash.
  assert.equal(
    oauthRedirectUrl('https://ayahspring.example/', '/learn'),
    'https://ayahspring.example/auth/callback?next=%2Flearn',
  );
  // An absolute or protocol-relative destination is replaced, not forwarded.
  assert.match(oauthRedirectUrl('https://a.example', 'https://evil.example'), /next=%2Fdashboard/);
  assert.match(oauthRedirectUrl('https://a.example', '//evil.example'), /next=%2Fdashboard/);
});

test('a destination can never leave the site', () => {
  assert.equal(safeNextPath('/courses/quran'), '/courses/quran');
  assert.equal(safeNextPath('//evil.example'), '/dashboard');
  assert.equal(safeNextPath('https://evil.example'), '/dashboard');
  assert.equal(safeNextPath('/\\evil.example'), '/dashboard');
  for (const path of ['/\n/evil.example', '/\t/evil.example', '/a/..//evil.example', '/%2e%2e//evil.example']) {
    assert.equal(safeNextPath(path), '/dashboard');
    assert.equal(new URL(oauthRedirectUrl('https://a.example', path)).searchParams.get('next'), '/dashboard');
  }
  assert.equal(safeNextPath(null), '/dashboard');
  assert.equal(safeNextPath(undefined, '/learn'), '/learn');
});

test('a refusal says what the person should do next', () => {
  assert.match(describeOAuthFailure('access_denied'), /cancelled/i);
  assert.match(describeOAuthFailure('provider is not enabled'), /not switched on/i);
  assert.match(describeOAuthFailure('redirect_uri_mismatch'), /not registered/i);
  assert.match(describeOAuthFailure(''), /did not complete/i);
  // An unknown failure is still reported rather than swallowed.
  assert.match(describeOAuthFailure('boom'), /boom/);
});
