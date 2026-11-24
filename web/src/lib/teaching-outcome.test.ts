import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { describe, it } from 'node:test';

import {
  APPLY_ENGLISH,
  APPLY_OUTCOMES,
  HEADLINE_MAX,
  HEADLINE_MIN,
  NOTE_MAX,
  ONE_OPEN_INDEX,
  QUALIFICATIONS_MAX,
  QUALIFICATIONS_MIN,
  SAMPLE_MAX,
  applicationFaultOf,
  applicationOf,
  applyOutcomeOf,
  applyReasonOf,
  applyStatusOf,
  faultFieldOf,
} from './teaching-outcome.ts';

const MIGRATIONS = new URL('../../../supabase/migrations/', import.meta.url);
const SRC = new URL('../', import.meta.url);
const read = (path: string): string => readFileSync(new URL(path, SRC), 'utf8');
const migrations = (): string[] => readdirSync(MIGRATIONS).filter((file) => file.endsWith('.sql')).sort();

/** The newest definition of a function in the migrations. */
function newest(name: string): string {
  let found = '';
  for (const file of migrations()) {
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

const raised = (name: string): string[] =>
  [...newest(name).matchAll(/raise exception\s+'([^']+)'/gu)].map((m) => m[1]!);

const GOOD = {
  headline: 'Tajweed for children',
  qualifications: 'An ijazah in Hafs from a named teacher.',
  sampleUrl: 'https://video.example/lesson',
  note: null,
};

describe('what the database and the page are held to', () => {
  it('has a name for every sentence sending and taking back raise', () => {
    const named = (name: string) =>
      Object.fromEntries(raised(name).map((s) => [s, applyReasonOf({ code: 'P0001', message: s })]));
    assert.deepEqual(named('submit_teaching_application'), {
      'teaching:not_signed_in': 'not_signed_in',
      'teaching:applications_closed': 'applications_closed',
      'teaching:already_teaching': 'already_teaching',
      'teaching:already_applied': 'already_applied',
    });
    // Taking back has no sentence of its own for a caller with no session:
    // nobody has nothing to take back. The route turns that caller away first.
    assert.deepEqual(named('withdraw_teaching_application'), {
      'teaching:nothing_to_withdraw': 'nothing_to_withdraw',
    });
  });

  it('checks what was typed by the table’s own four rules', () => {
    const table = migrations()
      .map((file) => readFileSync(new URL(file, MIGRATIONS), 'utf8'))
      .find((sql) => sql.includes('create table public.teaching_applications'));
    assert.ok(table, 'no migration creates teaching_applications');
    assert.ok(table.includes(`check (length(btrim(headline)) between ${HEADLINE_MIN} and ${HEADLINE_MAX})`));
    assert.ok(table.includes(`check (length(btrim(qualifications)) >= ${QUALIFICATIONS_MIN})`));
    assert.ok(table.includes(`check (sample_url ~* '^https?://[^\\s]+$' and length(sample_url) <= ${SAMPLE_MAX})`));
    assert.ok(table.includes(`check (note is null or length(note) <= ${NOTE_MAX})`));
    // The index a second request at the same instant is stopped by.
    assert.ok(table.includes(`create unique index ${ONE_OPEN_INDEX}`));
    // No later migration has touched the table's rules.
    const later = migrations()
      .map((file) => readFileSync(new URL(file, MIGRATIONS), 'utf8'))
      .filter((sql) => /alter table (public\.)?teaching_applications\s+(add|drop|alter|rename)/u.test(sql));
    assert.equal(later.length, 0, 'a later migration alters teaching_applications: read its rules again');
  });

  it('tells the applicant once when an application is answered, and not what the owner wrote', () => {
    const decide = newest('decide_teaching_application');
    assert.equal(decide.match(/public\.notify_user\(/gu)?.length, 1);
    const call = decide.slice(decide.indexOf('perform public.notify_user('), decide.indexOf("'outcome'"));
    assert.match(call, /v_row\.applicant_id,\n\s+'teaching_answered',/u);
    assert.match(call, /'\/teach\/apply',\n\s+'info',\n\s+'teaching-answer:' \|\| p_application::text,/u);
    // The reason stays on the application; the message has the outcome only.
    assert.doesNotMatch(call, /reason/iu);
    assert.match(decide, /jsonb_build_object\('outcome', case when p_approve then 'approved' else 'declined' end\)\);/u);
    // Asking and taking back tell nobody: the applicant did those.
    assert.doesNotMatch(newest('submit_teaching_application'), /notify_user/u);
    assert.doesNotMatch(newest('withdraw_teaching_application'), /notify_user/u);
  });

  it('is each earlier function with the message, the word or the one field added, and nothing else', () => {
    // PostgreSQL cannot wrap the function it replaces, so each was copied
    // whole into 20261281151000. A copy can lose a line. Every earlier line
    // must still be there, in order, and what was added is counted.
    const TOLD = '20261281151000_teaching_answer_told.sql';
    const inFile = (file: string, name: string): string[] => {
      const sql = readFileSync(new URL(file, MIGRATIONS), 'utf8');
      const at = sql.lastIndexOf(`create or replace function public.${name}(`);
      assert.notEqual(at, -1, `${file} does not define ${name}`);
      return sql.slice(at, sql.indexOf('\n$$;', at)).split('\n');
    };
    const cases: [string, string, number, (now: string) => string][] = [
      ['decide_teaching_application', '20261281001100_teaching_applications.sql', 18, (now) => now],
      ['my_teaching_application', '20261281001100_teaching_applications.sql', 3, (now) => now.replace('    ) end,\n', '    ) end\n')],
      ['set_notification_preference', '20261281009000_live_recording.sql', 0,
        (now) => now.replace("'live_recording_ready', 'teaching_answered') then", "'live_recording_ready') then")],
      ['my_notification_preferences', '20261281009000_live_recording.sql', 8,
        (now) => now.replace("'live_cancelled', 'live_recording_ready',\n", "'live_cancelled', 'live_recording_ready'\n")],
    ];
    for (const [name, file, expected, undo] of cases) {
      const old = inFile(file, name);
      const now = undo(inFile(TOLD, name).join('\n')).split('\n');
      let i = 0;
      const added: string[] = [];
      for (const line of now) {
        if (line === old[i]) i += 1;
        else added.push(line);
      }
      assert.equal(i, old.length, `${name}(): the earlier definition has ${old.length - i} lines the new one lost`);
      assert.equal(added.length, expected, `${name}(): ${added.length} lines were added:\n${added.join('\n')}`);
      // Nothing added changes a row, a grant or who may call.
      assert.doesNotMatch(added.join('\n'), /\b(?:update|insert|delete|grant|revoke|alter|drop)\b/iu, name);
      assert.equal(newest(name), inFile(TOLD, name).join('\n'), `${name}() is defined again after ${TOLD}`);
    }
    // The page is told whether this person will be told, by the function that knows.
    assert.match(newest('my_teaching_application'), /'answerTold', public\.notification_enabled\(v_actor, 'teaching_answered'\)/u);
  });

  it('says a message will come only when the database says this person will be told', () => {
    const page = read('app/teach/apply/page.tsx');
    assert.match(page, /const answerTold = !mine\.error && said\?\.answerTold === true;/u);
    assert.match(page, /\{answerTold \? t\('tapply\.answerTold'\) : t\('tapply\.answerHere'\)\}/u);
    assert.equal(page.match(/tapply\.answerTold/gu)?.length, 1);
  });

  it('answers sending and taking back by name, and never with the database’s sentence', () => {
    const route = read('app/api/teaching/apply/route.ts');
    const from = route.indexOf("if (action === 'submit') {");
    const to = route.indexOf("if (action === 'decide') {");
    assert.ok(from !== -1 && to > from);
    const block = route.slice(from, to);
    assert.match(block, /applicationFaultOf\(fields\)/u);
    assert.equal(block.match(/applyReasonOf\(asked\.error\)/gu)?.length, 2);
    assert.doesNotMatch(block.replace(/console\.error\([^;]*;/gu, ''), /fail\(|teachingRefusal|asked\.error\.message|\.\.\.\(data/u);
    // What was typed is checked before the database is asked.
    assert.ok(block.indexOf('applicationFaultOf(fields)') < block.indexOf("rpc('submit_teaching_application'"));
  });

  it('draws nothing from the database’s own text, and the form does not call it', () => {
    const page = read('app/teach/apply/page.tsx');
    assert.doesNotMatch(page.replace(/console\.error\([^;]*;/gsu, ''), /error\??\.message/u);
    assert.doesNotMatch(page, /throw /u);
    assert.doesNotMatch(page, /toLocaleDateString|APPOINTMENT_NOTICE|describeStatus/u);
    for (const island of ['app/teach/apply/apply-form.tsx', 'app/teach/apply/withdraw-button.tsx']) {
      const source = read(island);
      assert.match(source, /^'use client';/u);
      assert.doesNotMatch(source, /supabase|i18n\/messages|translator/u, island);
      // No sentence of its own: every word is handed in.
      assert.doesNotMatch(source, /['"][A-Z][a-z]+ [a-z]+[^'"]*\.['"]/u, island);
    }
    const form = read('app/teach/apply/apply-form.tsx');
    assert.match(form, /noValidate/u);
    // The button is greyed out while a request is on its way, and for nothing else.
    assert.match(form, /<button type="submit" className="btn" disabled=\{busy\}/u);
  });
});

describe('what was typed', () => {
  it('is read trimmed, and an empty last box is nothing', () => {
    assert.deepEqual(applicationOf({ headline: '  Tajweed  ', qualifications: 'x', sampleUrl: ' https://a.example ', note: '   ' }), {
      headline: 'Tajweed',
      qualifications: 'x',
      sampleUrl: 'https://a.example',
      note: null,
    });
    assert.deepEqual(applicationOf({ headline: 4, qualifications: null, note: ['a'] }), {
      headline: '',
      qualifications: '',
      sampleUrl: '',
      note: null,
    });
  });

  it('passes an application the table would take', () => {
    assert.equal(applicationFaultOf(GOOD), null);
    assert.equal(applicationFaultOf({ ...GOOD, sampleUrl: 'HTTP://video.example/a?b=c#d' }), null);
    assert.equal(applicationFaultOf({ ...GOOD, note: 'x'.repeat(NOTE_MAX) }), null);
    assert.equal(applicationFaultOf({ ...GOOD, headline: 'x'.repeat(HEADLINE_MAX) }), null);
  });

  it('names the first box that is wrong, in the order of the form', () => {
    assert.equal(applicationFaultOf({ ...GOOD, headline: 'abc', qualifications: '' }), 'headline_short');
    assert.equal(applicationFaultOf({ ...GOOD, headline: 'x'.repeat(HEADLINE_MAX + 1) }), 'headline_long');
    assert.equal(applicationFaultOf({ ...GOOD, qualifications: 'x'.repeat(QUALIFICATIONS_MIN - 1) }), 'qualifications_short');
    assert.equal(applicationFaultOf({ ...GOOD, qualifications: 'x'.repeat(QUALIFICATIONS_MAX + 1) }), 'qualifications_long');
    assert.equal(applicationFaultOf({ ...GOOD, note: 'x'.repeat(NOTE_MAX + 1) }), 'note_long');
  });

  it('counts characters as the database does, not the units JavaScript does', () => {
    // Four characters outside the basic plane are eight units and four characters.
    assert.equal(applicationFaultOf({ ...GOOD, headline: '𞤀𞤁𞤂𞤃' }), null);
    assert.equal(applicationFaultOf({ ...GOOD, headline: '𞤀𞤁𞤂' }), 'headline_short');
  });

  it('takes a link only if a browser could open it', () => {
    for (const bad of [
      '',
      'video.example/lesson',
      'ftp://video.example/lesson',
      'javascript:alert(1)',
      'https://video.example/a lesson',
      'https://',
      'https://???',
      `https://video.example/${'x'.repeat(SAMPLE_MAX)}`,
    ]) {
      assert.equal(applicationFaultOf({ ...GOOD, sampleUrl: bad }), 'sample_not_link', bad);
    }
  });

  it('gives every fault a box', () => {
    assert.equal(faultFieldOf('headline_short'), 'headline');
    assert.equal(faultFieldOf('headline_long'), 'headline');
    assert.equal(faultFieldOf('qualifications_short'), 'qualifications');
    assert.equal(faultFieldOf('qualifications_long'), 'qualifications');
    assert.equal(faultFieldOf('sample_not_link'), 'sample');
    assert.equal(faultFieldOf('note_long'), 'note');
  });
});

describe('sending and taking back, as names', () => {
  it('gives every name a status and an English sentence', () => {
    for (const name of APPLY_OUTCOMES) {
      assert.ok(applyStatusOf(name) >= 400, name);
      assert.ok(APPLY_ENGLISH[name].length > 10, name);
    }
    assert.equal(applyStatusOf('not_signed_in'), 401);
    assert.equal(applyStatusOf('applications_closed'), 403);
    assert.equal(applyStatusOf('already_applied'), 409);
    assert.equal(applyStatusOf('refused'), 500);
    assert.equal(applyStatusOf('unconfirmed'), 502);
  });

  it('reads the database’s answer as a refusal, and anything else as unconfirmed', () => {
    assert.equal(applyReasonOf({ code: '42501', message: 'permission denied for table teaching_applications' }), 'refused');
    assert.equal(applyReasonOf({ code: 'P0001', message: 'institution:last_admin' }), 'refused');
    assert.equal(applyReasonOf({ code: '23514', message: 'new row violates check constraint' }), 'refused');
    assert.equal(applyReasonOf({ code: null, message: 'fetch failed' }), 'unconfirmed');
    assert.equal(applyReasonOf({ code: '08006', message: 'connection failure' }), 'unconfirmed');
    assert.equal(applyReasonOf({ code: 'PGRST301', message: 'JWT expired' }), 'unconfirmed');
  });

  it('reads the second of two requests at one instant as already applied', () => {
    assert.equal(
      applyReasonOf({ code: '23505', message: `duplicate key value violates unique constraint "${ONE_OPEN_INDEX}"` }),
      'already_applied',
    );
    // Another index is not this rule.
    assert.equal(
      applyReasonOf({ code: '23505', message: 'duplicate key value violates unique constraint "something_else"' }),
      'refused',
    );
  });

  it('believes a name only with its own status', () => {
    assert.equal(applyOutcomeOf(409, 'already_applied'), 'already_applied');
    assert.equal(applyOutcomeOf(400, 'sample_not_link'), 'sample_not_link');
    assert.equal(applyOutcomeOf(500, 'already_applied'), 'unconfirmed');
    assert.equal(applyOutcomeOf(409, 'last_admin'), 'unconfirmed');
    assert.equal(applyOutcomeOf(400, undefined), 'unconfirmed');
    assert.equal(applyOutcomeOf(502, 'unconfirmed'), 'unconfirmed');
  });
});
