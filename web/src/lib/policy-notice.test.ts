import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';

import {
  AGREED_EVENT, DISMISSED_KEY, OPENING_KEY,
  changedSince, noticeHref, parseNoticeAnswer, readDismissed, readOpening, stillToTell, storeDismissed, storeOpening,
  withoutSlug,
} from './policy-notice.ts';

const SRC = new URL('../', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, SRC), 'utf8');

const row = (slug: string, versionNumber: number, acceptedAt: string | null) => ({
  slug, title: `The ${slug}`, versionNumber, effectiveAt: '2026-11-24', acceptedAt,
});
const agreed = (slug: string, versionNumber: number) => ({
  slug, title: `The ${slug}`, versionNumber, acceptedAt: '2026-10-29T08:00:00+00:00',
});

test('changed is a document agreed to before whose version in force is not agreed to', () => {
  const standing = {
    acceptanceRequired: [
      row('terms', 2, null), // agreed to version 1: changed
      row('privacy', 1, '2026-10-29T08:00:00+00:00'), // agreed to what is in force: nothing to tell
      row('teaching', 1, null), // never agreed to any version: waiting, not changed
    ],
    outstanding: 2,
    history: [agreed('terms', 1), agreed('privacy', 1)],
  };
  assert.deepEqual(changedSince(standing), [
    { slug: 'terms', title: 'The terms', version: 2, effectiveAt: '2026-11-24' },
  ]);
  // A new account owes every document and has been told of no change.
  assert.deepEqual(changedSince({ acceptanceRequired: [row('terms', 1, null), row('privacy', 1, null)], outstanding: 2, history: [] }), []);
  // Nothing owed.
  assert.deepEqual(changedSince({ acceptanceRequired: [], outstanding: 0, history: [] }), []);
});

test('an answer that is not a standing is not read as "nothing changed"', () => {
  for (const reply of [null, undefined, 'ok', 4, [], {}, { acceptanceRequired: [] }, { history: [] }, { acceptanceRequired: {}, history: [] }]) {
    assert.equal(changedSince(reply), null, JSON.stringify(reply));
  }
  // A row that is not one is left out; the rest is still said.
  const odd = {
    acceptanceRequired: [null, 'terms', { slug: '../x', versionNumber: 2, acceptedAt: null }, { slug: 'terms', versionNumber: '2', acceptedAt: null }, row('privacy', 3, null)],
    history: [null, { slug: 7 }, agreed('privacy', 2), agreed('terms', 1)],
  };
  assert.deepEqual(changedSince(odd)?.map((doc) => `${doc.slug}:${doc.version}`), ['privacy:3']);
  // No title is the slug; no day is null.
  assert.deepEqual(
    changedSince({ acceptanceRequired: [{ slug: 'terms', versionNumber: 2, acceptedAt: null }], history: [agreed('terms', 1)] }),
    [{ slug: 'terms', title: 'terms', version: 2, effectiveAt: null }],
  );
});

test('what the route answered is believed whole or not at all', () => {
  assert.deepEqual(parseNoticeAnswer({ signedIn: true, changed: [{ slug: 'terms', version: 2 }] }), [{ slug: 'terms', version: 2 }]);
  assert.deepEqual(parseNoticeAnswer({ signedIn: true, changed: [] }), []);
  // More than was asked for is dropped: the notice keeps a slug and a number.
  assert.deepEqual(parseNoticeAnswer({ signedIn: true, changed: [{ slug: 'terms', version: 2, title: 'Terms' }] }), [{ slug: 'terms', version: 2 }]);
  for (const reply of [
    null, [], 'ok', {}, { signedIn: false }, { signedIn: false, changed: [] }, { signedIn: 'true', changed: [] },
    { signedIn: true }, { signedIn: true, changed: 'none' }, { signedIn: true, changed: null },
    { signedIn: true, changed: [{ slug: 'Terms', version: 2 }] }, { signedIn: true, changed: [{ slug: 'terms', version: 0 }] },
    { signedIn: true, changed: [{ slug: 'terms', version: 2 }, null] }, { ok: false, reason: 'unconfirmed' },
  ]) {
    assert.equal(parseNoticeAnswer(reply), null, JSON.stringify(reply));
  }
});

test('an opening’s answer is kept and read back, and anything else means ask', () => {
  const items = [{ slug: 'terms', version: 2 }, { slug: 'privacy', version: 5 }];
  assert.deepEqual(readOpening(storeOpening(items)), items);
  // Asked, and nothing had changed: kept as that, so it is not asked again.
  assert.deepEqual(readOpening(storeOpening([])), []);
  for (const stored of [null, undefined, '', 'yes', '{', '{}', 'null', '[{"slug":"terms"}]', '[{"slug":"terms","version":"2"}]']) {
    assert.equal(readOpening(stored), null, String(stored));
  }
});

test('putting the notice away is for those versions, on this device', () => {
  const items = [{ slug: 'terms', version: 2 }, { slug: 'privacy', version: 5 }];
  const stored = storeDismissed([], items);
  assert.deepEqual(readDismissed(stored), ['terms:2', 'privacy:5']);
  assert.deepEqual(stillToTell(items, readDismissed(stored)), []);
  // The next change to the same document is told again.
  assert.deepEqual(stillToTell([{ slug: 'terms', version: 3 }, { slug: 'privacy', version: 5 }], readDismissed(stored)), [{ slug: 'terms', version: 3 }]);
  // Put away twice is kept once, and the list does not grow without end.
  assert.deepEqual(readDismissed(storeDismissed(readDismissed(stored), items)), ['terms:2', 'privacy:5']);
  const many = Array.from({ length: 80 }, (_, at) => ({ slug: 'terms', version: at + 1 }));
  const kept = readDismissed(storeDismissed([], many));
  assert.equal(kept.length, 60);
  assert.equal(kept.at(-1), 'terms:80');
  for (const bad of [null, '', '{', '{}', '"terms:2"', 'null']) assert.deepEqual(readDismissed(bad), [], String(bad));
  assert.deepEqual(readDismissed('["terms:2", 4, null]'), ['terms:2']);
});

test('agreeing takes that document out, and the link goes to the one document or to the list', () => {
  const items = [{ slug: 'terms', version: 2 }, { slug: 'privacy', version: 5 }];
  assert.deepEqual(withoutSlug(items, 'terms'), [{ slug: 'privacy', version: 5 }]);
  assert.deepEqual(withoutSlug(items, 'teaching'), items);
  assert.equal(noticeHref([{ slug: 'terms', version: 2 }]), '/policies/terms');
  assert.equal(noticeHref(items), '/notifications');
  assert.notEqual(OPENING_KEY, DISMISSED_KEY);
  assert.match(AGREED_EVENT, /^ayahspring:/u);
});

test('the notice asks once an opening, only about somebody signed in, and draws nothing until there is something to tell', () => {
  const notice = read('app/_shared/policy-notice.tsx');
  // Who is signed in is the masthead's one question, shared.
  assert.match(notice, /const session = await sessionOnce\(\);\s+if \(!session\.signedIn\) \{\s+\/\/[^\n]+\n\s+write\('session', OPENING_KEY, null\);\s+return null;/u);
  // Once for each page loaded, however many times the notice is mounted.
  assert.match(notice, /opening \?\?= \(async \(\) => \{/u);
  assert.equal(notice.split("fetch('/api/policies'").length - 1, 1);
  assert.doesNotMatch(notice, /fetch\('\/api\/session'/u);
  // An answer already kept for this opening is used, and nothing is asked.
  const kept = notice.indexOf("readOpening(read('session', OPENING_KEY))");
  const asks = notice.indexOf("fetch('/api/policies'");
  assert.ok(kept > 0 && asks > kept, 'the kept answer is looked for before the route is asked');
  // Only a whole answer is kept; a failed read is asked again on the next page.
  assert.match(notice, /if \(answer === null\) return null;\s+write\('session', OPENING_KEY, storeOpening\(answer\)\);/u);
  // No timer and nothing that listens for the page being looked at again.
  assert.doesNotMatch(notice, /setInterval|setTimeout|visibilitychange|addEventListener\('focus'/u);
  assert.match(notice, /if \(items\.length === 0\) return null;/u);
  // Putting it away agrees to nothing.
  assert.doesNotMatch(notice, /method: 'POST'|supabase/u);

  const once = read('app/_shared/session-once.ts');
  assert.equal(once.split("fetch('/api/session'").length - 1, 1);
  assert.match(once, /asked \?\?=/u);
  const masthead = read('app/_shared/masthead-actions.tsx');
  assert.doesNotMatch(masthead, /fetch\(/u);
  assert.match(masthead, /sessionOnce\(\)/u);

  // The layout stays as it was for everyone: it reads no account.
  const layout = read('app/layout.tsx');
  assert.doesNotMatch(layout, /supabase|getUser|my_policy_standing/u);
  assert.match(layout, /<\/main>\s+\{\/\*[^*]+\*\/\}\s+<PolicyNotice/u);
  assert.match(layout, /const policyShown = languageShownFor\(code, 'policy'\);/u);

  // The button tells the notice when an agreement was recorded, and only then.
  const button = read('app/policies/[slug]/accept-policy.tsx');
  assert.match(button, /setTold\([^\n]+\n(?:\s+\/\/[^\n]*\n)+\s+window\.dispatchEvent\(new CustomEvent\(AGREED_EVENT, \{ detail: slug \}\)\);/u);

  // The notifications page lists them from the same reading.
  const page = read('app/notifications/page.tsx');
  assert.match(page, /supabase\.rpc\('my_policy_standing'\)/u);
  assert.match(page, /changedSince\(standingReply\.data\)/u);
  assert.match(page, /data-changed-policy=\{doc\.slug\}/u);
});
