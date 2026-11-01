// "Put my data back."
//
// The export has been tested for what it *leaves out*. This suite tests the
// harder direction: a restore writes, and the question is not what it carries
// but what it is allowed to create. A person handing the platform a file is
// handing it a claim about their own past, and the platform's job is to bring
// back the part of that claim the person wrote, while refusing to manufacture
// the part the platform wrote.
//
// So most of these tests assert an *absence*: no enrolment was created, no note
// landed on somebody else's lesson, no live note was overwritten, a dry run
// wrote nothing at all. The positive cases are the easy half.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    bootstrapAdmin, newUser, newProfile, newInstructor, newReviewer,
    newCourse, newVersion, newSection, newLesson, satisfyReview,
  } = ctx;

  const admin = await bootstrapAdmin('restore-admin@example.com');
  const teacher = await newInstructor('restore-teacher@example.com', admin);
  const reviewer = await newReviewer('restore-reviewer@example.com', admin);

  async function asActor(actor, sql, params = []) {
    await q('begin');
    await q("select set_config('request.jwt.claims',$1,true)", [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
    await q('set local role authenticated');
    try {
      const result = await q(sql, params);
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  async function transition(versionId, status, actor) {
    await q('select id from public.set_course_version_status($1,$2,$3,$4)',
      [versionId, status, actor, 'restore test']);
  }

  let seq = 0;
  async function adult(name) {
    seq += 1;
    const userId = await newUser(`restore-adult-${seq}@example.com`);
    await newProfile(userId, name);
    const learnerId = (await scalar(
      `insert into public.learner_profiles (display_name, learner_type, age_band, linked_user_id)
       values ($1,'adult','18+',$2) returning id`, [name, userId])).id;
    return { userId, learnerId, name };
  }

  /** A published course, with the section title and lesson title given. */
  async function publishedCourse({ title = null, sectionTitle = 'Week one', lessonTitle = 'Introduction' } = {}) {
    seq += 1;
    const course = await newCourse(teacher, { status: 'active', title: title ?? `Restore Course ${seq}` });
    const version = await newVersion(course, teacher);
    const section = await newSection(version, { title: sectionTitle });
    const lesson = await newLesson(section, { title: lessonTitle });
    await transition(version, 'submitted', teacher);
    await transition(version, 'approved', admin);
    await satisfyReview(version, reviewer, admin);
    await transition(version, 'published', admin);
    const slug = (await scalar('select slug from public.courses where id = $1', [course])).slug;
    return { course, version, lesson, slug, sectionTitle, lessonTitle };
  }

  async function enrolAs(actor, learnerId, course) {
    const result = await asActor(actor,
      `insert into public.course_enrolments
         (learner_profile_id, course_id, course_version_id, source, status)
       values ($1,$2,$3,'free','active') returning id`, [learnerId, course.course, course.version]);
    return result.rows[0].id;
  }

  // Notes and bookmarks are gated in the database; every test that writes one
  // opens the gate and puts it back the same way the notes suite does.
  async function withNotesOn(fn, { off = false } = {}) {
    const before = (await scalar(
      `select value_text from public.platform_settings where key = 'learning.notes_bookmarks'`)).value_text;
    await q(`update public.platform_settings set value_text = $1
              where key = 'learning.notes_bookmarks'`, [off ? 'false' : 'true']);
    try {
      return await fn();
    } finally {
      await q(`update public.platform_settings set value_text = $1
                where key = 'learning.notes_bookmarks'`, [before]);
    }
  }

  const exportAs = async (actor) => (await asActor(actor, 'select public.export_my_data() d')).rows[0].d;
  const restoreAs = async (actor, doc, apply = false) =>
    (await asActor(actor, 'select public.restore_my_data($1,$2) r', [doc, apply])).rows[0].r;

  const noteCount = async (userId) =>
    Number((await scalar('select count(*) from public.lesson_notes where user_id = $1', [userId])).count);

  /** The export of `me`, with one real note on a real enrolment. */
  async function accountWithNote(me, lessonTitle = 'Introduction') {
    const course = await publishedCourse({ lessonTitle });
    const enrolmentId = await enrolAs(me.userId, me.learnerId, course);
    await asActor(me.userId,
      `insert into public.lesson_notes (user_id, learner_profile_id, course_enrolment_id, lesson_id, body)
       values ($1,$2,$3,$4,'What I wrote the first time')`,
      [me.userId, me.learnerId, enrolmentId, course.lesson]);
    return { course, enrolmentId };
  }

  // ---------------------------------------------------------------------------
  // The document the restore reads
  // ---------------------------------------------------------------------------
  await test('the export names the course and section a note belongs to', async () => withNotesOn(async () => {
    const me = await adult('Keyed Adult');
    const { course } = await accountWithNote(me);

    const doc = await exportAs(me.userId);

    // A title is not an identity: this is the field the restore matches on.
    assert(doc.formatVersion === 2, `formatVersion is ${doc.formatVersion}`);
    assert(doc.notes.length === 1, 'the note is missing from the export');
    assert(doc.notes[0].courseSlug === course.slug, `courseSlug is ${doc.notes[0].courseSlug}`);
    assert(doc.notes[0].section === 'Week one', `section is ${doc.notes[0].section}`);
    assert(doc.notes[0].lesson === 'Introduction', `lesson is ${doc.notes[0].lesson}`);
  }));

  // ---------------------------------------------------------------------------
  // A dry run is a dry run
  // ---------------------------------------------------------------------------
  await test('the default is a dry run, and a dry run writes nothing', async () => withNotesOn(async () => {
    const me = await adult('Previewing Adult');
    const { course, enrolmentId } = await accountWithNote(me);
    const doc = await exportAs(me.userId);

    // Take the note away, as a closed-and-reopened account would.
    await q('delete from public.lesson_notes where user_id = $1', [me.userId]);
    assert((await noteCount(me.userId)) === 0, 'the note was not removed for the test');

    const preview = await restoreAs(me.userId, doc);

    assert(preview.applied === false, 'a restore applied itself without being asked');
    assert(preview.notes.restored === 1, `the preview promised ${preview.notes.restored} notes`);
    assert(preview.notes.skipped.length === 0, JSON.stringify(preview.notes.skipped));

    assert((await noteCount(me.userId)) === 0, 'a dry run wrote a note');
    const audits = await scalar(
      `select count(*) from public.governance_audit_events
        where actor = $1 and action = 'data.restored'`, [me.userId]);
    assert(Number(audits.count) === 0, 'a dry run wrote an audit event');

    // …and the apply it previewed does exactly what it said.
    const applied = await restoreAs(me.userId, doc, true);
    assert(applied.applied === true);
    assert(applied.notes.restored === 1, `the apply restored ${applied.notes.restored}`);

    const back = await scalar(
      'select lesson_id, course_enrolment_id, body from public.lesson_notes where user_id = $1',
      [me.userId]);
    assert(back.lesson_id === course.lesson, 'the note came back on a different lesson');
    assert(back.course_enrolment_id === enrolmentId, 'the note came back on a different enrolment');
    assert(back.body === 'What I wrote the first time', 'the note came back with different text');

    const logged = await scalar(
      `select detail from public.governance_audit_events
        where actor = $1 and action = 'data.restored'`, [me.userId]);
    assert(Number(logged.detail.notesRestored) === 1, 'the audit event does not say what it restored');
  }));

  // ---------------------------------------------------------------------------
  // The rule it does not restate
  // ---------------------------------------------------------------------------
  await test('a note for a course the person is not enrolled in is refused, and no enrolment is invented', async () => withNotesOn(async () => {
    const me = await adult('Unenrolled Adult');
    const source = await adult('Fortunate Adult');
    await accountWithNote(source);

    // The file is genuinely somebody's real export, of a real course.
    const doc = await exportAs(source.userId);

    const result = await restoreAs(me.userId, doc, true);

    assert(result.notes.restored === 0, 'a note landed on a course the person never enrolled in');
    assert(result.notes.skipped.length === 1, JSON.stringify(result.notes));
    assert(/not enrolled/.test(result.notes.skipped[0].reason), result.notes.skipped[0].reason);
    assert((await noteCount(me.userId)) === 0, 'a note was written anyway');

    // The thing that would have made it work is the thing it must not do.
    const enrolments = await scalar(
      'select count(*) from public.course_enrolments where learner_profile_id = $1', [me.learnerId]);
    assert(Number(enrolments.count) === 0, 'the restore created an enrolment');
  }));

  await test('the source account keeps its own note and gains nothing', async () => withNotesOn(async () => {
    const me = await adult('Borrowed File Adult');
    const source = await adult('Original Adult');
    await accountWithNote(source);
    const doc = await exportAs(source.userId);

    await restoreAs(me.userId, doc, true);

    // Somebody else's file never writes into somebody else's record.
    assert((await noteCount(source.userId)) === 1, 'the source account gained or lost a note');
  }));

  // ---------------------------------------------------------------------------
  // Two lessons, one title
  // ---------------------------------------------------------------------------
  await test('an entry two courses could claim is reported as ambiguous, never guessed', async () => withNotesOn(async () => {
    const me = await adult('Ambiguous Adult');
    const first = await publishedCourse({ title: 'First Course', lessonTitle: 'Introduction' });
    const second = await publishedCourse({ title: 'Second Course', lessonTitle: 'Introduction' });
    await enrolAs(me.userId, me.learnerId, first);
    await enrolAs(me.userId, me.learnerId, second);

    // A format 1 file: it has a lesson title and nothing else to go on.
    const v1 = {
      formatVersion: 1,
      notes: [{ lesson: 'Introduction', body: 'Written in an older copy' }],
    };

    const result = await restoreAs(me.userId, v1, true);
    assert(result.notes.restored === 0, 'a note was guessed onto one of two identical lessons');
    assert(/more than one/.test(result.notes.skipped[0]?.reason ?? ''), JSON.stringify(result.notes));
    assert((await noteCount(me.userId)) === 0, 'something was written anyway');

    // A format 2 file names the course, and the same entry now lands exactly.
    const v2 = {
      formatVersion: 2,
      notes: [{ lesson: 'Introduction', courseSlug: second.slug, section: 'Week one', body: 'Named properly' }],
    };
    const named = await restoreAs(me.userId, v2, true);
    assert(named.notes.restored === 1, JSON.stringify(named.notes));
    const landed = await scalar('select lesson_id from public.lesson_notes where user_id = $1', [me.userId]);
    assert(landed.lesson_id === second.lesson, 'the note landed in the wrong course');
  }));

  // ---------------------------------------------------------------------------
  // Already there, and never overwritten
  // ---------------------------------------------------------------------------
  await test('running it twice changes nothing the second time', async () => withNotesOn(async () => {
    const me = await adult('Twice Adult');
    await accountWithNote(me);
    const doc = await exportAs(me.userId);

    const second = await restoreAs(me.userId, doc, true);

    assert(second.notes.restored === 0, 'the second run restored a duplicate');
    assert(second.notes.alreadyThere === 1, JSON.stringify(second.notes));
    assert((await noteCount(me.userId)) === 1, 'the second run made a second note');
  }));

  await test('a live note is never replaced by an older file', async () => withNotesOn(async () => {
    const me = await adult('Edited Adult');
    const { course, enrolmentId } = await accountWithNote(me);
    const stale = await exportAs(me.userId);

    // The person has since thought again.
    // Edited as the learner, because the guard on update checks the enrolment
    // the same way the guard on insert does.
    await asActor(me.userId,
      'update public.lesson_notes set body = $2 where user_id = $1',
      [me.userId, 'What I think now']);

    const result = await restoreAs(me.userId, stale, true);

    assert(result.notes.restored === 0, 'the stale note was written over the live one');
    assert(/not overwritten/.test(result.notes.skipped[0]?.reason ?? ''), JSON.stringify(result.notes));
    const live = await scalar('select body from public.lesson_notes where user_id = $1', [me.userId]);
    assert(live.body === 'What I think now', `the live note became “${live.body}”`);
    assert(enrolmentId && course.lesson, 'the note was written for the test');
  }));

  // ---------------------------------------------------------------------------
  // Preferences
  // ---------------------------------------------------------------------------
  await test('the account preferences come back, and only where they differ', async () => {
    const me = await adult('Renamed Adult');
    // Start from a profile that disagrees with the file on every field, so the
    // test is about the restore rather than about what the fixture happened to
    // hold. `newProfile` writes UG / Africa/Kampala for every user.
    await q(`update public.user_profiles
                set display_name = 'Old Name', preferred_language = 'en',
                    timezone = null, country_code = null
              where user_id = $1`, [me.userId]);

    const doc = {
      formatVersion: 2,
      account: { displayName: 'Restored Name', preferredLanguage: 'ar', timezone: 'Africa/Kampala', countryCode: 'UG' },
    };

    const first = await restoreAs(me.userId, doc, true);
    assert(first.account.changed.includes('displayName'), JSON.stringify(first.account));
    assert(first.account.skipped.length === 0, JSON.stringify(first.account.skipped));

    const profile = await scalar(
      'select display_name, preferred_language, timezone, country_code from public.user_profiles where user_id = $1',
      [me.userId]);
    assert(profile.display_name === 'Restored Name', profile.display_name);
    assert(profile.preferred_language === 'ar', profile.preferred_language);
    assert(profile.timezone === 'Africa/Kampala', profile.timezone);
    assert(profile.country_code === 'UG', profile.country_code);

    // Nothing left to change, so nothing is claimed to have changed.
    const again = await restoreAs(me.userId, doc, true);
    assert(again.account.changed.length === 0, `second run claims to have changed ${again.account.changed}`);
  });

  await test('a value the column cannot hold is skipped and said so, not truncated', async () => {
    const me = await adult('Odd Preference Adult');
    await q(`update public.user_profiles set timezone = null, country_code = 'UG' where user_id = $1`,
      [me.userId]);

    const result = await restoreAs(me.userId, {
      formatVersion: 2,
      account: { timezone: 'Mars/Olympus', countryCode: 'uganda', preferredLanguage: 'fa-af' },
    }, true);

    const fields = result.account.skipped.map((s) => s.field).sort();
    assert(fields.join(',') === 'countryCode,preferredLanguage,timezone', fields.join(','));
    for (const skip of result.account.skipped) {
      assert(skip.reason.length > 20, `“${skip.field}” was skipped without a sentence`);
    }

    assert(result.account.changed.length === 0, `rejected values were still reported as changed: ${result.account.changed}`);

    const profile = await scalar(
      'select timezone, country_code, preferred_language from public.user_profiles where user_id = $1',
      [me.userId]);
    assert(profile.timezone === null, `timezone became ${profile.timezone}`);
    assert(profile.country_code === 'UG', 'a rejected country code was still written');
    assert(profile.preferred_language === 'en', 'a rejected language was still written');
  });

  // ---------------------------------------------------------------------------
  // What is switched off, and what is not a file
  // ---------------------------------------------------------------------------
  await test('notes are skipped, not forced, when the feature is off', async () => {
    // Written while the feature was on — the point of the test is what happens
    // to the file after the platform has been switched off, not before.
    const me = await adult('Off Adult');
    await withNotesOn(async () => accountWithNote(me));
    const doc = await exportAs(me.userId);
    await q('delete from public.lesson_notes where user_id = $1', [me.userId]);

    const result = await withNotesOn(async () => restoreAs(me.userId, doc, true), { off: true });

    assert(result.notes.restored === 0, 'notes were written while the feature was off');
    assert(/switched off/.test(result.notes.skipped[0]?.reason ?? ''), JSON.stringify(result.notes));
    assert((await noteCount(me.userId)) === 0, 'a note was written while the feature was off');
  });

  await test('a section that is present but unreadable is reported, not ignored', async () => {
    const me = await adult('Malformed Section Adult');

    const result = await restoreAs(me.userId, {
      formatVersion: 2,
      account: { displayName: '   ' },
      notes: { lesson: 'Introduction', body: 'not a list of notes' },
      bookmarks: 'also not a list',
    }, true);

    const reasons = [
      ...result.notes.skipped.map((s) => s.reason),
      ...result.bookmarks.skipped.map((s) => s.reason),
      ...result.account.skipped.map((s) => s.reason),
    ].join(' | ');

    assert(/notes section of this file is not a list/.test(reasons), reasons);
    assert(/bookmarks section of this file is not a list/.test(reasons), reasons);
    assert(/name in the file is blank/.test(reasons), reasons);
    // A blank name was not written over the real one.
    const profile = await scalar('select display_name from public.user_profiles where user_id = $1', [me.userId]);
    assert(profile.display_name.trim().length > 0, 'a blank name was written');
  });

  await test('something that is not an export is refused, by name', async () => {
    const me = await adult('Wrong File Adult');

    await rejects(() => restoreAs(me.userId, { hello: 'world' }, true), /formatVersion/);
    await rejects(() => restoreAs(me.userId, { formatVersion: 99 }, true), /newer version/);
    await rejects(() => restoreAs(me.userId, [], true), /one JSON object/);
  });

  await test('a signed-out caller restores nothing', async () => {
    await rejects(
      () => asActor(null, 'select public.restore_my_data($1,true)', [{ formatVersion: 2 }]),
      /sign in/);
  });
}
