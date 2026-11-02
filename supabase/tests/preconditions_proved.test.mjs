// Each rewritten precondition, against the mechanism it names.
//
// `register_truth.test.mjs` checks that a name in a precondition *exists*. That is
// the weaker half. This suite checks the stronger one: that the sentence's claim
// about the software is true — the constraint has five values and not four, the
// report refuses a role by name, the quota is enforced before a byte moves.
//
// The difference matters because the defect being fixed was never a typo. Ten
// preconditions described a platform that no longer existed: "must be built first"
// about a dashboard that had shipped, "template chosen" about a numbering sequence
// in the schema, "decide who reads the report" about a decision enforced in three
// functions. A reader who trusts a register is not served by a spell-check.
//
// One test per row, named after the row, so a failure says which sentence has
// stopped being true rather than which assertion number broke.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const here = new URL('.', import.meta.url).pathname;
const root = join(here, '..', '..');
const webFile = (path) => readFileSync(join(root, 'web', 'src', path), 'utf8');

export async function run(ctx) {
  const { q, test, assert } = ctx;

  const eq = (actual, expected, what) =>
    assert(actual === expected,
      `${what}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);

  const row = async (key) => {
    const found = (await q(
      `select key, value_type, gate_type, value_text, preconditions
         from public.platform_settings where key = $1`, [key])).rows[0];
    assert(found, `${key} is not in the register at all`);
    return found;
  };

  const fn = async (name) => (await q(
    `select 1 from pg_proc p join pg_namespace n on n.oid = p.pronamespace
      where n.nspname = 'public' and p.proname = $1 limit 1`, [name])).rows.length === 1;

  // -------------------------------------------------------------------------
  await test('the four removed rows are gone, and their features are not', async () => {
    // A removal is only honest if the thing it named still works. Each of these
    // four keys described a feature that shipped; the check is that what replaced
    // the row is present, so nobody reads the deletion as a lost capability.
    const gone = ['platform.admin_settings', 'learning.certificates.simple',
      'learning.certificates.verification', 'teaching.authoring'];
    const still = (await q(
      `select key from public.platform_settings where key = any($1::text[])`, [gone])).rows;
    eq(still.length, 0, `removed rows still present: ${still.map((r) => r.key).join(', ')}`);

    // `platform.admin_settings`: the dashboard is the switchboard.
    for (const path of ['app/admin/page.tsx', 'app/admin/settings/page.tsx']) {
      assert(webFile(path).includes('export default'), `${path} is missing`);
    }
    assert(await fn('platform_controls'), 'platform_controls() is gone with the row');

    // `learning.certificates.simple`: numbering, template, and the real per-course gate.
    const seq = (await q(
      `select 1 from pg_class where relname = 'certificate_number_seq'
          and relkind = 'S'`)).rows.length;
    eq(seq, 1, 'certificate_number_seq');
    const policyCols = (await q(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'course_completion_policies'
          and column_name in ('certificate_enabled', 'certificate_template_version')`)).rows;
    eq(policyCols.length, 2, 'the per-course certificate gate');
    assert(await fn('issue_certificate'), 'issue_certificate() is missing');

    // `learning.certificates.verification`: the front door, the canonical page, the
    // revocation columns the page reads.
    for (const path of ['app/verify/page.tsx', 'app/verify/[number]/page.tsx']) {
      assert(webFile(path).includes('export default'), `${path} is missing`);
    }
    const certCols = (await q(
      `select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'certificates'
          and column_name in ('status', 'revoked_at', 'revoked_by', 'revocation_reason')`)).rows;
    eq(certCols.length, 4, 'the revocation record the verification page reads');

    // `teaching.authoring`: both limits, enforced where the claim says.
    const quota = (await q(
      `select value_text from public.platform_settings
        where key = 'media.upload_quota_gb_per_teacher'`)).rows[0];
    eq(quota?.value_text, '50', 'the per-account quota');
    assert(await fn('assert_media_upload_allowed'), 'the quota is not enforced by a function');
    assert(webFile('lib/media.ts').includes('8 * 1024 * 1024 * 1024'),
      'MAX_UPLOAD_BYTES is no longer 8 GiB');
  });

  // -------------------------------------------------------------------------
  await test('learning.provenance: the table, the route and the screen', async () => {
    const r = await row('learning.provenance');
    assert(/^None:/.test(r.preconditions), 'the row no longer says the mechanism exists');
    eq(r.value_text, 'false', 'the switch moved — this unit only corrected a sentence');

    assert(await fn('add_content_source_for_lesson'), 'add_content_source_for_lesson() is missing');
    assert(await fn('remove_content_source'), 'remove_content_source() is missing');
    assert(webFile('lib/provenance.ts').includes('SOURCE_TYPES'),
      'the source vocabulary the route validates against is missing');

    // The claim is specifically that the *learner's lesson page* reads the flag.
    const lesson = webFile('app/learn/[enrolmentId]/lesson/[lessonId]/page.tsx');
    assert(lesson.includes("'learning.provenance'"),
      'the lesson page no longer reads learning.provenance, so the sentence is false');
  });

  // -------------------------------------------------------------------------
  await test('learning.audience_sections: three doors, all closed by the flag', async () => {
    const r = await row('learning.audience_sections');
    assert(/^None:/.test(r.preconditions));
    // The correction that matters: this row is not the learner switcher.
    assert(/not the learner switcher/i.test(r.preconditions),
      'the sentence must say what it is not — the old one confused two features');
    assert(!/switcher designed/i.test(r.preconditions), 'the stale sentence is back');

    for (const path of ['app/adults/page.tsx', 'app/young/page.tsx']) {
      const text = webFile(path);
      assert(text.includes("'learning.audience_sections'"),
        `${path} does not read learning.audience_sections`);
      assert(text.includes("redirect('/catalogue')"),
        `${path} does not redirect while the switch is off`);
      assert(text.includes("isFlagEnabled(supabase, 'learning.audience_sections')"),
        `${path} reads the flag by another name`);
    }

    // And the thing the old sentence claimed exists — a per-learner label — does
    // exist, on `/learn`, without needing this key. If it ever needs the key, the
    // two features are entangled again and this sentence becomes wrong.
    const learn = webFile('app/learn/page.tsx');
    assert(learn.includes('const showLearner = distinctLearners.size > 1'),
      'the per-learner label on /learn is gone');
    assert(!/\bshowLearner\b[\s\S]{0,200}learning\.audience_sections/.test(learn),
      'the label now depends on audience_sections — the sentence needs rewriting');
  });

  // -------------------------------------------------------------------------
  await test('learning.age_bands: five values in the schema, chips on /young', async () => {
    const r = await row('learning.age_bands');
    assert(/^None:/.test(r.preconditions), 'the row no longer says the bands are chosen');

    // Read the constraint rather than the migration that wrote it: the schema is
    // what the sentence is about, and a later migration could have widened it.
    const def = (await q(
      `select pg_get_constraintdef(c.oid) as def
         from pg_constraint c join pg_class t on t.oid = c.conrelid
        where t.relname = 'learner_profiles' and c.contype = 'c'
          and pg_get_constraintdef(c.oid) like '%age_band%'`)).rows.map((r) => r.def).join(' ');
    for (const band of ['5-7', '8-10', '11-13', '14-17', '18+']) {
      assert(def.includes(`'${band}'`), `the ${band} band is not in the check constraint`);
    }
    eq((def.match(/'(\d+-\d+|18\+)'/g) ?? []).length, 5, 'the number of bands');

    // No date of birth anywhere: the sentence promises the band is the only age fact.
    const dob = (await q(
      `select table_name, column_name from information_schema.columns
        where table_schema = 'public'
          and (column_name like '%date_of_birth%' or column_name = 'dob'
               or column_name like '%birth%')`)).rows;
    eq(dob.length, 0, `a date of birth column exists: ${JSON.stringify(dob)}`);

    assert(webFile('app/young/page.tsx').includes("isFlagEnabled(supabase, 'learning.age_bands')"),
      '/young no longer reads learning.age_bands');
  });

  // -------------------------------------------------------------------------
  await test('platform.data_export: the right ships, the PDF does not', async () => {
    const r = await row('platform.data_export');
    eq(r.gate_type, 'code', 'the export flag must stay CODE: it cannot be a runtime toggle');
    assert(/PDF/.test(r.preconditions), 'the row no longer names what is missing');
    assert(!/85 tables/.test(r.preconditions), 'the stale table count is back');

    const route = webFile('app/api/account/export/route.ts');
    assert(route.includes("'csv'"), 'the CSV export is gone');
    assert(route.includes('export_my_data') || route.includes('exportMyData'),
      'the export route no longer calls the export function');
    assert(await fn('export_my_data'), 'export_my_data() is missing');
    assert(await fn('restore_my_data'), 'restore_my_data() is missing');
  });

  // -------------------------------------------------------------------------
  await test('delivery.analytics: staff-only, said in the database and the guard', async () => {
    const r = await row('delivery.analytics');
    assert(/Decided and enforced/.test(r.preconditions), 'the row no longer says who reads it');
    assert(!/Decide who reads/.test(r.preconditions), 'the undecided sentence is back');

    // The refusal itself, not a comment about it.
    const message = (await q(
      `select count(*)::int n from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.prosrc like '%only platform staff may read analytics%'`)).rows[0];
    assert(message.n >= 3, `only ${message.n} function(s) refuse a non-staff reader`);

    const page = webFile('app/admin/analytics/page.tsx');
    assert(page.includes("redirect('/')"), '/admin/analytics no longer sends a non-staff session home');
    assert(page.includes('privileged'), '/admin/analytics no longer checks for staff');
  });

  // -------------------------------------------------------------------------
  await test('learning.ai_support: retrieval only, and no provider to choose', async () => {
    const r = await row('learning.ai_support');
    assert(/needs no provider/.test(r.preconditions), 'the row no longer says a provider is unnecessary');
    assert(!/provider chosen/i.test(r.preconditions), 'the stale "provider chosen" is back');

    // The claim is about what the function cannot do, so it is read from the
    // function's own comment and from the absence of a model call.
    const src = (await q(
      `select p.prosrc as body,
              obj_description(p.oid, 'pg_proc') as note
         from pg_proc p join pg_namespace n on n.oid = p.pronamespace
        where n.nspname = 'public' and p.proname = 'ai_support_ask'`)).rows[0];
    assert(src, 'ai_support_ask() is missing');
    assert(/never generates text/i.test(src.note ?? ''), 'the function no longer records that it generates nothing');
    assert(!/openai|anthropic|https?:\/\/|fetch\(/i.test(src.body),
      'ai_support_ask() now calls something — the sentence and the design disagree');

    assert(await fn('ai_support_is_ruling'), 'the ruling detector is missing');
    const table = (await q(
      `select 1 from pg_class where relname = 'ai_support_questions' and relkind = 'r'`)).rows.length;
    eq(table, 1, 'ai_support_questions');
  });
}
