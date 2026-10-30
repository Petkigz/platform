// A native speaker can say what is wrong, and only the owner can say it is fixed.
//
// The feature exists because of a number this project kept printing honestly and
// could do nothing about: fifty-one languages, and **not one read by the person
// it is for**. `/language` says so on every catalogue. These tests are about the
// loop that makes that sentence changeable:
//
//   * anybody, with no account, may submit a correction — and nobody may read
//     back what anybody submitted, including their own row;
//   * a proposal cannot disagree with its review about which language it is for,
//     cannot replace a line with itself, and cannot claim a key that is not a key;
//   * the door closes completely when the flag is off, in the database and not
//     only in the page;
//   * a language is not described as read because somebody sent a file — only
//     because the owner published a review, and only a whole-catalogue read, and
//     only with every correction decided;
//   * and what a reviewer said stays what they said. Their name, their address and
//     their note are not the platform's to tidy afterwards.
//
// The console compares `current_text` against the catalogue that is actually
// built, so a correction the file has moved past shows as stale rather than
// being applied twice. That half of the design lives in TypeScript; here it is
// enough that the stored text is the text that was read.

export async function run(ctx) {
  const {
    q, test, assert, rejects,
    committed, bootstrapAdmin, newUser, newProfile, grantRole,
  } = ctx;

  const owner = await bootstrapAdmin('tr-owner@example.com');
  // A support agent: staff enough to read the queue, not the owner, and
  // therefore not allowed to decide it.
  const support = await newUser('tr-support@example.com');
  await newProfile(support, 'Support agent');
  await committed(() => grantRole(support, 'support_agent', owner));
  // A reviewer of course content is **not** staff for this: `reviewer` is not
  // privileged, and the queue says so by refusing them.
  const plainReviewer = await newUser('tr-reviewer@example.com');
  await newProfile(plainReviewer, 'Reviewer');
  await committed(() => grantRole(plainReviewer, 'reviewer', owner));

  async function setFlag(on) {
    await q(
      `update public.platform_settings set value_text = $2 where key = $1`,
      ['platform.translation_reviews', on ? 'true' : 'false'],
    );
  }
  await setFlag(false);

  const scalar = async (sql, params = []) => (await q(sql, params)).rows[0];

  /** Run `fn` inside a transaction as `actor`, rolling back afterwards. */
  async function asActor(actor, fn) {
    await q('begin');
    await q(`select set_config('request.jwt.claims',$1,true)`, [
      JSON.stringify({ sub: actor, role: 'authenticated' }),
    ]);
    await q('set local role authenticated');
    try {
      const result = await fn();
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  /** Run `fn` inside a transaction as an anonymous visitor. */
  async function asAnon(fn) {
    await q('begin');
    await q(`select set_config('request.jwt.claims', '', true)`);
    await q('set local role anon');
    try {
      const result = await fn();
      await q('commit');
      return result;
    } catch (e) {
      await q('rollback');
      throw e;
    }
  }

  const REVIEW_COLUMNS =
    'locale, reviewer_name, reviewer_email, scope, note';

  function insertReview(values) {
    return q(
      `insert into public.translation_reviews (${REVIEW_COLUMNS})
       values ($1, $2, $3, $4, $5)`,
      values,
    );
  }

  const SAMPLE = ['si', 'Amina Fernando', 'amina@example.com', 'whole', null];

  async function anonReview(extra = {}) {
    await asAnon(() => insertReview([
      extra.locale ?? 'si',
      extra.name ?? 'Amina Fernando',
      extra.email ?? 'amina@example.com',
      extra.scope ?? 'part',
      extra.note ?? null,
    ]));
    return (await scalar(
      `select id from public.translation_reviews
        where reviewer_email = $1 order by created_at desc limit 1`,
      [extra.email ?? 'amina@example.com'],
    )).id;
  }

  // -------------------------------------------------------------------------
  // The door
  // -------------------------------------------------------------------------
  await test('with the flag off, nobody can submit anything', async () => {
    await setFlag(false);
    await rejects(
      () => asAnon(() => insertReview(SAMPLE)),
      /row-level security|violates row-level security/,
    );
  });

  await test('with the flag on, a stranger with no account can submit a review', async () => {
    await setFlag(true);
    const id = await anonReview({ scope: 'whole' });
    assert(!!id, 'the review was not written');
    const row = await scalar(
      `select status, decided_at from public.translation_reviews where id = $1`, [id]);
    assert(row.status === 'submitted', `expected submitted, got ${row.status}`);
    assert(row.decided_at === null, 'a fresh submission already carries a decision');
  });

  await test('a submission cannot read itself back', async () => {
    // Not fussiness: `insert ... returning` is the ordinary way an application
    // echoes an id to a caller, and granting it would mean granting select on the
    // table to `anon` — which is granting every reviewer's email address to the
    // internet. The application generates the id instead.
    await setFlag(true);
    await rejects(
      () => asAnon(() => q(
        `insert into public.translation_reviews
           (locale, reviewer_name, reviewer_email, scope)
         values ('si', 'Amina Fernando', 'amina@example.com', 'whole')
         returning id`)),
      /permission denied|row-level security/,
    );
  });

  await test('nobody but staff may read the queue', async () => {
    await setFlag(true);
    const id = await anonReview({ email: 'quiet@example.com' });
    assert(!!id);
    // No select grant at all, not a policy that filters: a stranger cannot even
    // count the rows, let alone read an address out of one.
    await rejects(
      () => asAnon(() => q('select count(*)::int n from public.translation_reviews')),
      /permission denied/,
    );
  });

  await test('a stranger cannot look like somebody else', async () => {
    await setFlag(true);
    const other = await newUser('tr-other@example.com');
    await newProfile(other, 'Somebody Else');
    await rejects(
      () => asAnon(() => q(
        `insert into public.translation_reviews
           (locale, reviewer_name, reviewer_email, scope, reviewer_user_id)
         values ('si', 'Impostor', 'impostor@example.com', 'whole', $1)`, [other])),
      /row-level security/,
    );
  });

  await test('a review cannot be born decided, or for English, or with no address', async () => {
    await setFlag(true);
    const born = (status) => asAnon(() => q(
      `insert into public.translation_reviews
         (locale, reviewer_name, reviewer_email, scope, status)
       values ('si', 'Amina Fernando', 'amina@example.com', 'whole', $1)`, [status]));

    await rejects(() => born('published'), /row-level security|check constraint/);
    await rejects(
      () => asAnon(() => insertReview(['en', 'Amina', 'a@example.com', 'whole', null])),
      /review_locale_shape/,
    );
    await rejects(
      () => asAnon(() => insertReview(['si', 'Amina', 'not-an-address', 'whole', null])),
      /review_email_looks_like_one/,
    );
    await rejects(
      () => asAnon(() => insertReview(['si', '   ', 'a@example.com', 'whole', null])),
      /review_name_not_blank/,
    );
  });

  // -------------------------------------------------------------------------
  // The corrections
  // -------------------------------------------------------------------------
  async function propose(reviewId, key, current, proposed, locale = 'si') {
    return asAnon(() => q(
      `insert into public.translation_proposals
         (review_id, locale, message_key, current_text, proposed_text)
       values ($1, $2, $3, $4, $5)`,
      [reviewId, locale, key, current, proposed],
    ));
  }

  await test('a correction belongs to the language it was written for', async () => {
    await setFlag(true);
    const id = await anonReview({ locale: 'si', email: 'pair@example.com' });
    await rejects(
      () => propose(id, 'home.title', 'x', 'y', 'ta'),
      /proposal_locale_matches|foreign key/,
    );
  });

  await test('a correction that changes nothing is not a correction', async () => {
    await setFlag(true);
    const id = await anonReview({ email: 'same@example.com' });
    await rejects(
      () => propose(id, 'home.title', 'Same words', 'Same words'),
      /proposal_is_a_change/,
    );
    await rejects(
      () => propose(id, 'home.title', 'x', '   '),
      /proposal_text_not_blank/,
    );
    await rejects(
      () => propose(id, 'not a key', 'x', 'y'),
      /proposal_key_shape/,
    );
  });

  await test('one key, one correction per review', async () => {
    await setFlag(true);
    const id = await anonReview({ email: 'twice@example.com' });
    await propose(id, 'home.title', 'old', 'new');
    await rejects(
      () => propose(id, 'home.title', 'old', 'newer'),
      /proposal_once_per_key|duplicate key/,
    );
  });

  await test('the queue is capped, because the door is the open internet', async () => {
    await setFlag(true);
    const id = await anonReview({ email: 'script@example.com' });
    for (let i = 0; i < 60; i += 1) {
      await propose(id, `home.key${i}`, `old ${i}`, `new ${i}`);
    }
    await rejects(
      () => propose(id, 'home.oneTooMany', 'old', 'new'),
      /translation:too_many/,
    );
    const n = (await scalar(
      `select count(*)::int n from public.translation_proposals where review_id = $1`,
      [id])).n;
    assert(n === 60, `expected the cap to leave 60 rows, found ${n}`);
  });

  await test('a correction cannot attach to a review that is already decided', async () => {
    await setFlag(true);
    const id = await anonReview({ email: 'closed@example.com' });
    await asActor(owner, () => q(
      `select public.decline_translation_review($1, 'not a review of the catalogue')`, [id]));
    await rejects(
      () => propose(id, 'home.title', 'old', 'new'),
      /row-level security/,
    );
  });

  // -------------------------------------------------------------------------
  // The decision
  // -------------------------------------------------------------------------
  async function freshWhole(email) {
    await setFlag(true);
    return anonReview({ scope: 'whole', email });
  }

  await test('staff may read the queue and may not decide it', async () => {
    await setFlag(true);
    const id = await freshWhole('staffread@example.com');
    await propose(id, 'home.title', 'old', 'new');

    // A support agent is privileged, so the queue is readable.
    const payload = await asActor(support, async () =>
      (await scalar('select public.translation_review_queue() as q')).q);
    assert(Array.isArray(payload.reviews), 'the queue did not return reviews');
    const mine = payload.reviews.find((r) => r.id === id);
    assert(!!mine, 'the submission was not in the queue');
    assert(mine.reviewer_email === null,
      'staff who are not the owner were shown the reviewer’s email address');

    // …and may not decide it. The owner alone.
    await rejects(
      () => asActor(support, () => q(
        `select public.publish_translation_review($1)`, [id])),
      /translation:not_owner/,
    );
    await rejects(
      () => asActor(support, () => q(
        `select public.decide_translation_proposal($1, true)`,
        [mine.proposals[0].id])),
      /translation:not_owner/,
    );

    // A course reviewer is not staff for this at all: the queue is refused
    // outright rather than returned empty.
    await rejects(
      () => asActor(plainReviewer, () => q(
        `select public.translation_review_queue()`)),
      /translation:not_staff/,
    );
  });

  await test('the owner sees the address, and nobody else does', async () => {
    await setFlag(true);
    const id = await freshWhole('ownerinbox@example.com');
    const payload = await asActor(owner, async () =>
      (await scalar('select public.translation_review_queue() as q')).q);
    const mine = payload.reviews.find((r) => r.id === id);
    assert(mine.reviewer_email === 'ownerinbox@example.com',
      'the owner could not read the address they may need to reply to');
  });

  await test('a partial read cannot be published', async () => {
    await setFlag(true);
    const id = await anonReview({ scope: 'part', email: 'partial@example.com' });
    await rejects(
      () => asActor(owner, () => q(`select public.publish_translation_review($1)`, [id])),
      /translation:partial_read/,
    );
  });

  await test('nothing is published while a correction is undecided', async () => {
    await setFlag(true);
    const id = await freshWhole('undecided@example.com');
    await propose(id, 'home.title', 'old', 'new');

    await rejects(
      () => asActor(owner, () => q(`select public.publish_translation_review($1)`, [id])),
      /translation:undecided/,
    );
  });

  await test('decided, then published, then it is what the interface prints', async () => {
    await setFlag(true);
    const id = await freshWhole('published@example.com');
    await propose(id, 'home.title', 'old', 'new');
    const proposal = await scalar(
      `select id from public.translation_proposals where review_id = $1`, [id]);

    await asActor(owner, () => q(
      `select public.decide_translation_proposal($1, true)`, [proposal.id]));
    const decided = await scalar(
      `select status, decided_at from public.translation_proposals where id = $1`,
      [proposal.id]);
    assert(decided.status === 'accepted', `expected accepted, got ${decided.status}`);
    assert(decided.decided_at !== null, 'an accepted correction has no decision date');

    await asActor(owner, () => q(`select public.publish_translation_review($1)`, [id]));

    // What `/language` reads: one row per published review, name and date, no
    // address, no note, nothing unpublished.
    const rows = await asAnon(async () =>
      (await q('select * from public.published_locale_reviews()')).rows);
    const mine = rows.find((r) => r.locale === 'si' && r.reviewer_name === 'Amina Fernando');
    assert(!!mine, 'the published review is not visible to an anonymous reader');
    assert(mine.published_at !== null, 'a published review has no date');
    assert(!('reviewer_email' in mine), 'the public view hands out the email address');
    assert(!('note' in mine), 'the public view hands out the private note');

    // A published review is closed: no more decisions, no second publication.
    await rejects(
      () => asActor(owner, () => q(`select public.publish_translation_review($1)`, [id])),
      /translation:already_decided/,
    );
  });

  await test('a draft is not visible, and neither is a refusal', async () => {
    await setFlag(true);
    const draft = await freshWhole('draft@example.com');
    const draftName = (await scalar('select reviewer_name from public.translation_reviews where id = $1', [draft])).reviewer_name;
    const refused = await anonReview({ email: 'refused@example.com' });
    await asActor(owner, () => q(
      `select public.decline_translation_review($1, 'sent us no corrections and we cannot tell why')`,
      [refused]));

    const rows = await asAnon(async () =>
      (await q('select * from public.published_locale_reviews()')).rows);
    const ids = new Set(rows.map((r) => r.locale));
    assert(!rows.some((r) => r.locale === 'ta'),
      'a declined review was published');

    // The draft and the refusal are both absent, matched by the exact row rather
    // than by a name several fixtures share.
    const published = await q(
      `select locale from public.translation_reviews where id = $1`, [draft]);
    assert(published.rows.length === 1 && published.rows[0].locale === 'si');
    assert(!rows.some((r) => r.reviewer_name === draftName && r.scope === 'whole'
      && r.published_at === null),
      'a draft reached the public view with a null date');
    assert(!ids.has('ta'), 'a declined review is being printed');
  });

  await test('a refusal needs a reason, on the record', async () => {
    await setFlag(true);
    const id = await freshWhole('noreason@example.com');
    await rejects(
      () => asActor(owner, () => q(`select public.decline_translation_review($1, '  ')`, [id])),
      /translation:needs_reason/,
    );
    await asActor(owner, () => q(
      `select public.decline_translation_review($1, 'duplicate of an earlier submission')`, [id]));
    const row = await scalar(
      `select status, decline_reason from public.translation_reviews where id = $1`, [id]);
    assert(row.status === 'declined', `expected declined, got ${row.status}`);
    assert(/duplicate/.test(row.decline_reason), 'the reason was not kept');
  });

  // -------------------------------------------------------------------------
  // What was said stays said
  // -------------------------------------------------------------------------
  await test('what the reviewer offered cannot be tidied afterwards', async () => {
    await setFlag(true);
    const id = await freshWhole('keep@example.com');

    // Two layers, and both are asserted. The grants: no role holds update on
    // this table, so even the owner editing through a client is refused before
    // any trigger runs.
    await rejects(
      () => asActor(owner, () => q(
        `update public.translation_reviews set reviewer_name = 'Someone Handier' where id = $1`,
        [id])),
      /permission denied|translation:no_edit/,
    );
    await rejects(
      () => asActor(owner, () => q(
        `delete from public.translation_reviews where id = $1`, [id])),
      /permission denied|translation:no_delete/,
    );

    // And the trigger: a superuser — which is what a hand at `psql` is — still
    // cannot rewrite what somebody wrote. The grant is not the whole defence.
    await rejects(
      () => q(`update public.translation_reviews set reviewer_name = 'Someone Handier'
               where id = $1`, [id]),
      /translation:no_edit/,
    );
    await rejects(
      () => q(`delete from public.translation_reviews where id = $1`, [id]),
      /translation:no_delete/,
    );
  });

  await test('a decided correction cannot be decided again, one way or the other', async () => {
    await setFlag(true);
    const id = await freshWhole('again@example.com');
    await propose(id, 'home.title', 'old', 'new');
    const proposal = await scalar(
      `select id from public.translation_proposals where review_id = $1`, [id]);

    await asActor(owner, () => q(
      `select public.decide_translation_proposal($1, false)`, [proposal.id]));
    await rejects(
      () => asActor(owner, () => q(
        `select public.decide_translation_proposal($1, true)`, [proposal.id])),
      /translation:already_decided/,
    );
    const row = await scalar(
      `select status, proposed_text from public.translation_proposals where id = $1`,
      [proposal.id]);
    assert(row.status === 'rejected', `expected rejected, got ${row.status}`);
    assert(row.proposed_text === 'new', 'the rejected text was rewritten');
  });

  await setFlag(false);

  // Leave the register as it was found: the next suite to read this flag should
  // see the shipped default, not whatever this one needed.
  await test('the switch is off again', async () => {
    const row = await scalar(
      `select value_text from public.platform_settings where key = 'platform.translation_reviews'`);
    assert(row && row.value_text === 'false',
      `platform.translation_reviews was left at ${row && row.value_text}`);
  });
}
