import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  CLAIM_ENGLISH,
  CLAIM_OUTCOMES,
  claimLearnerOf,
  claimLearnersOf,
  claimOutcomeOf,
  claimReasonOf,
  claimStatusOf,
  claimedCourseOf,
} from './seat-claim.ts';
import { messagesFor } from './i18n/index.ts';

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url);
const SRC = new URL('../', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, SRC), 'utf8');

/** The newest definition of a function in the migrations. */
function newest(name: string): string {
  const files = readdirSync(MIGRATIONS).filter((file) => file.endsWith('.sql')).sort();
  let found = '';
  for (const file of files) {
    const sql = readFileSync(new URL(file, MIGRATIONS), 'utf8');
    const at = sql.lastIndexOf(`create or replace function public.${name}(`);
    if (at === -1) continue;
    const end = sql.indexOf('\n$$;', at);
    assert.notEqual(end, -1, `${file}: ${name} has no end`);
    found = sql.slice(at, end);
  }
  assert.notEqual(found, '', `no migration defines ${name}`);
  return found;
}

const ME = '0ca318e2-8b44-4a64-9b58-2af31ab941c7';
const CHILD = '7d1f2a30-1111-4222-8333-444455556666';
const OTHER = '9e2a3b41-aaaa-4bbb-8ccc-ddddeeeeffff';

describe('what the database and the pages are held to', () => {
  it('has a name for every sentence using a code raises', () => {
    const raised = [...newest('claim_institution_seat').matchAll(/raise exception\s+'([^']+)'/gu)].map((m) => m[1]!);
    assert.deepEqual(
      Object.fromEntries(raised.map((s) => [s, claimReasonOf({ code: 'P0001', message: s })])),
      {
        'institution:not_signed_in': 'not_signed_in',
        'institution:seats_closed': 'seats_closed',
        'institution:bad_code': 'bad_code',
        'institution:code_unknown': 'code_unknown',
        'institution:code_voided': 'code_voided',
        'institution:code_used': 'code_used',
        'institution:course_unavailable': 'course_unavailable',
        'institution:not_your_learner': 'not_your_learner',
        'institution:already_enrolled': 'already_enrolled',
      },
    );
  });

  it('says of the school only what the database gives the school', () => {
    // An administrator is given each code's last characters, whether it was
    // used and when. The page says so, and says nothing of "not told".
    const summary = newest('institution_seat_summary');
    assert.match(summary, /'tail', k\.code_tail/u);
    assert.match(summary, /'claimedAt', k\.claimed_at/u);
    assert.doesNotMatch(summary, /learner_profile_id|claimed_by/u);
    const en = messagesFor('en');
    assert.match(en['inst.claimSchoolSees']!, /which of its codes have been used and when/u);
    assert.match(en['inst.claimSchoolSees']!, /not shown the learner’s name/u);
    // Withdrawing a used code revokes what it granted.
    const withdraw = newest('void_institution_seat_code');
    assert.match(withdraw, /set status = 'revoked'/u);
    assert.match(en['inst.claimWithdraw']!, /can no longer open the course/u);
    for (const file of ['app/institution/claim/page.tsx', 'app/institution/claim/claim-form.tsx', 'app/institution/seats/page.tsx']) {
      assert.doesNotMatch(read(file).replace(/\/\*\*[\s\S]*?\*\//gu, ''), /not told|nobody at the school/u, file);
    }
  });

  it('answers by name, sends the title only, and never the database’s sentence', () => {
    const route = read('app/api/institution/claim/route.ts');
    assert.match(route, /claimReasonOf\(asked\.error\)/u);
    assert.match(route, /CLAIM_ENGLISH\[code\]/u);
    assert.match(route, /\{ ok: true, \.\.\.claimedCourseOf\(asked\.data\) \}/u);
    assert.doesNotMatch(route, /institutionRefusal|message: asked\.error|\.\.\.\(data as object\)/u);
    // The learner is checked before the database is asked.
    assert.ok(route.indexOf('claimLearnerOf(body.learnerProfileId)') < route.indexOf(".rpc('claim_institution_seat'"));
  });

  it('draws nothing from the database’s own text, and the form does not call it', () => {
    for (const file of ['app/institution/claim/page.tsx', 'app/institution/seats/page.tsx']) {
      const page = read(file);
      assert.doesNotMatch(page.replace(/console\.error\([^;]*;/gu, ''), /error\??\.message/u, file);
      assert.match(page, /generateMetadata/u, file);
    }
    const form = read('app/institution/claim/claim-form.tsx');
    assert.match(form, /^'use client';/u);
    assert.doesNotMatch(form, /supabase|i18n\/messages|translator|out\.message|json\?\.message/u);
    // Nobody is chosen for a reader who has somebody else on the account.
    assert.match(form, /useState\(learners\.length === 0 \? MYSELF : ''\)/u);
    assert.match(form, /disabled=\{busy \|\| who === '' \|\| code\.length < 11\}/u);
    // What an administrator works with is drawn for an administrator only, marked as English.
    const seats = read('app/institution/seats/page.tsx');
    assert.match(seats, /!seats\.isAdmin \?[\s\S]*data-inst-admin[\s\S]*\{\.\.\.english\}[\s\S]*<SeatDesk orders=\{seats\.orders\} \/>/u);
    assert.match(seats, /if \(seats && !seats\.joined\) redirect\('\/institution'\)/u);
  });

  it('has a sentence for every name in the form’s words', () => {
    const reader = read('app/institution/reader.ts');
    const block = reader.slice(reader.indexOf('export function claimWords'));
    for (const name of CLAIM_OUTCOMES) assert.match(block, new RegExp(`\\b${name}: t\\('inst\\.`, 'u'), name);
  });
});

describe('using a code, as names', () => {
  it('gives every name a status and an English sentence', () => {
    for (const name of CLAIM_OUTCOMES) {
      assert.ok(claimStatusOf(name) >= 400, name);
      assert.ok(CLAIM_ENGLISH[name].length > 10, name);
    }
    assert.equal(claimStatusOf('not_signed_in'), 401);
    assert.equal(claimStatusOf('bad_code'), 400);
    assert.equal(claimStatusOf('not_your_learner'), 403);
    assert.equal(claimStatusOf('code_unknown'), 404);
    assert.equal(claimStatusOf('code_used'), 409);
    assert.equal(claimStatusOf('code_voided'), 410);
    assert.equal(claimStatusOf('seats_closed'), 503);
    assert.equal(claimStatusOf('refused'), 500);
    assert.equal(claimStatusOf('unconfirmed'), 502);
  });

  it('says the same English as the catalogue', () => {
    const en = messagesFor('en');
    assert.equal(CLAIM_ENGLISH.bad_code, en['inst.whyBadCode']);
    assert.equal(CLAIM_ENGLISH.code_unknown, en['inst.whyCodeUnknown']);
    assert.equal(CLAIM_ENGLISH.code_used, en['inst.whyCodeUsed']);
    assert.equal(CLAIM_ENGLISH.code_voided, en['inst.whyCodeVoided']);
    assert.equal(CLAIM_ENGLISH.course_unavailable, en['inst.whyCourseGone']);
    assert.equal(CLAIM_ENGLISH.not_your_learner, en['inst.whyNotYourLearner']);
    assert.equal(CLAIM_ENGLISH.already_enrolled, en['inst.whyAlreadyEnrolled']);
    assert.equal(CLAIM_ENGLISH.seats_closed, en['inst.whySeatsClosed']);
    assert.equal(CLAIM_ENGLISH.refused, en['inst.failed']);
    assert.equal(CLAIM_ENGLISH.unconfirmed, en['inst.claimUnsure']);
  });

  it('treats an answer that is not the database’s as unconfirmed, never as unspent', () => {
    assert.equal(claimReasonOf({ code: '', message: 'the request could not be made' }), 'unconfirmed');
    assert.equal(claimReasonOf({ code: null, message: 'institution:code_used' }), 'unconfirmed');
    assert.equal(claimReasonOf({ code: '08006', message: 'connection failure' }), 'unconfirmed');
    assert.equal(claimReasonOf({ code: 'PGRST301', message: 'JWT expired' }), 'unconfirmed');
    // The database's answer with a sentence that is not one of these is a refusal, and rolled back.
    assert.equal(claimReasonOf({ code: '42501', message: 'permission denied for table institution_seat_codes' }), 'refused');
    assert.equal(claimReasonOf({ code: 'P0001', message: 'institution:code_used and more' }), 'refused');
    assert.equal(claimReasonOf({ code: '23505', message: ' institution:code_used ' }), 'code_used');
  });

  it('believes a name only with that name’s own status', () => {
    assert.equal(claimOutcomeOf(409, 'code_used'), 'code_used');
    assert.equal(claimOutcomeOf(410, 'code_voided'), 'code_voided');
    assert.equal(claimOutcomeOf(404, 'code_unknown'), 'code_unknown');
    assert.equal(claimOutcomeOf(500, 'code_unknown'), 'unconfirmed');
    assert.equal(claimOutcomeOf(409, 'code_voided'), 'unconfirmed');
    assert.equal(claimOutcomeOf(409, undefined), 'unconfirmed');
    assert.equal(claimOutcomeOf(503, undefined), 'unconfirmed');
    assert.equal(claimOutcomeOf(400, 'made_up'), 'unconfirmed');
    assert.equal(claimOutcomeOf(409, { code: 'code_used' }), 'unconfirmed');
    assert.equal(claimOutcomeOf(409, 'toString'), 'unconfirmed');
  });
});

describe('who a code can be used for', () => {
  it('reads nothing as the account’s own learner, and an id only when it is one', () => {
    assert.deepEqual(claimLearnerOf(undefined), { ok: true, learner: null });
    assert.deepEqual(claimLearnerOf(null), { ok: true, learner: null });
    assert.deepEqual(claimLearnerOf(''), { ok: true, learner: null });
    assert.deepEqual(claimLearnerOf(CHILD.toUpperCase()), { ok: true, learner: CHILD });
    for (const bad of ['self', 'not-a-learner', 7, {}, [CHILD], `${CHILD} `, true]) {
      assert.deepEqual(claimLearnerOf(bad), { ok: false }, String(bad));
    }
  });

  it('lists everybody but the account’s own learner', () => {
    const rows = [
      { id: ME.replace(/^0/u, '1'), display_name: 'Synthetic Parent', learner_type: 'adult', linked_user_id: ME },
      { id: CHILD, display_name: ' Synthetic Child ', learner_type: 'child', linked_user_id: null },
      { id: OTHER, display_name: 'Synthetic Spouse', learner_type: 'adult', linked_user_id: OTHER },
    ];
    assert.deepEqual(claimLearnersOf(rows, ME), [
      { id: CHILD, name: 'Synthetic Child', child: true },
      { id: OTHER, name: 'Synthetic Spouse', child: false },
    ]);
    assert.deepEqual(claimLearnersOf([], ME), []);
    assert.deepEqual(claimLearnersOf([rows[0]], ME), []);
  });

  it('does not read a list it cannot trust as nobody', () => {
    assert.equal(claimLearnersOf(null, ME), null);
    assert.equal(claimLearnersOf({ message: 'permission denied' }, ME), null);
    assert.equal(claimLearnersOf([null], ME), null);
    assert.equal(claimLearnersOf([{ id: 'x', display_name: 'A', learner_type: 'child' }], ME), null);
    assert.equal(claimLearnersOf([{ id: CHILD, display_name: '', learner_type: 'child' }], ME), null);
    assert.equal(claimLearnersOf([{ id: CHILD, display_name: 'A', learner_type: 'pupil' }], ME), null);
  });

  it('sends back a title and nothing else', () => {
    const said = { courseId: 'c', courseTitle: ' Synthetic Tajwid ', courseSlug: 's', versionNumber: 3, learnerProfileId: CHILD, orderId: 'o' };
    assert.deepEqual(claimedCourseOf(said), { courseTitle: 'Synthetic Tajwid' });
    assert.deepEqual(claimedCourseOf({ courseTitle: 7 }), { courseTitle: null });
    assert.deepEqual(claimedCourseOf(null), { courseTitle: null });
    assert.deepEqual(claimedCourseOf(['x']), { courseTitle: null });
  });
});
