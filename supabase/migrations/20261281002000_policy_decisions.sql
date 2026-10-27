-- The owner answered. Twenty-two of the twenty-three open decisions are now text.
--
-- Every `[OWNER DECISION: …]` marker in the seven seeded policies was a question
-- only the owner could answer, and `approve_policy_version()` refuses to put a
-- document in force while one remains. On 2026-10-27 the owner answered them:
--
--   * **Uganda.** The operator is the person who runs the platform, Ugandan law
--     governs, Ugandan courts hear disputes, and the supervisory authority is the
--     Personal Data Protection Office under the Data Protection and Privacy Act,
--     2019. No Delaware entity, no London address: a governing-law clause pointing
--     at a country the operator does not inhabit is tested once and fails.
--   * **Nothing is sold yet.** The catalogue is free until a merchant of record is
--     connected. That is why the refunds policy offers no withdrawal waiver — a
--     waiver is only worth asking for once content is delivered the instant
--     somebody pays.
--   * **No one under 13, anywhere, until guardian verification works.** The
--     database already refuses a child profile without a verified guardian and the
--     switch is off. The children's policy says so rather than describing a future
--     as though it were the present.
--   * **Retention:** a support case for three years after closure; a safeguarding
--     or screening record for seven years after the person turns 18 (or after it is
--     made, for an adult).
--   * **A check on a teacher** is a government photo ID, two references and a
--     written self-declaration, recorded by the owner or governance staff, valid for
--     24 months — and it is stated plainly that this is not a criminal-record check,
--     because no such check is available in most of the countries this platform
--     serves.
--   * **The teacher's share is 50%**, which is what `teaching.revenue_share_percent`
--     has said since 2026-10-19; this confirms it rather than changing it. The fine
--     print around it — monthly on the 15th, USD 50 minimum, the teacher bears the
--     transfer fee, a closing account is paid regardless of the minimum — is now
--     written down for the first time.
--
-- **One question is left, and only one.** The name and contact details of the
-- operator cannot be invented: a privacy notice must name the data controller, and
-- a made-up name is worse than an unanswered one. So the privacy notice keeps a
-- single marker, and the children's, safeguarding and takedown documents point at
-- it — "the operator named in the privacy notice" — rather than repeating a fact in
-- four places that could then disagree. One name fills one marker and unblocks the
-- last document.
--
-- Nothing here is published. These are drafts; putting one in force still needs a
-- date and a written reason, and is still refused while a marker remains.

do $$
declare
  r record;
  v_body text;
  v_answered int := 0;
  v_docs int := 0;
begin
  for r in
    select * from (values
  ($q$terms$q$, $q$[OWNER DECISION: state whether courses are sold at launch, and in which markets,
since the platform has no payment provider connected yet.]$q$, $a$Nothing is sold today. The catalogue is free to use until a merchant of record is connected, and from that day courses may be sold everywhere the provider operates, priced in the buyer's currency where it can be. Mobile money is added in Uganda when a provider for it is connected. If that changes what you have already agreed to, a new version of this document is published before it takes effect.$a$),
  ($q$terms$q$, $q$[OWNER DECISION: the limitation of liability this operator is willing to accept.]$q$, $a$Nothing in these terms excludes liability for death or personal injury caused by negligence, for fraud, or for anything else the law does not allow to be excluded. Beyond that, the operator's total liability to you is limited to the greater of what you paid in the twelve months before the claim and USD 20.$a$),
  ($q$terms$q$, $q$[OWNER DECISION: the governing law and the courts that hear a dispute.]$q$, $a$Ugandan law governs these terms, and the courts of Uganda hear any dispute. Where the consumer law of the country you live in says it cannot be displaced, it still applies.$a$),
  ($q$privacy$q$, $q$[OWNER DECISION: name the hosting provider and confirm the region data is stored
in.]$q$, $a$The database is hosted by Supabase, in its Frankfurt region (eu-central-1). Lesson media, once there is any, is stored by Cloudflare R2 in the European Union.$a$),
  ($q$privacy$q$, $q$[OWNER DECISION: whether personal data is transferred outside the region a learner
lives in, and on what safeguard.]$q$, $a$Yes. Personal data is stored in the European Union and is reached from wherever the platform is operated. Where a learner or teacher is outside the EU, that transfer rests on the European Commission's standard contractual clauses and on the provider's own data processing terms.$a$),
  ($q$privacy$q$, $q$[OWNER DECISION: the retention period for a support case, and for a safeguarding
record.]$q$, $a$A support case is kept for three years after it is closed. A safeguarding or screening record is kept for seven years after the person it concerns turns 18, or for seven years after it is made where they were already an adult. Nothing else about a person is kept beyond the life of their account, apart from what the law requires and the certificate number described in the children's policy.$a$),
  ($q$privacy$q$, $q$[OWNER DECISION: name the person or company responsible for personal data, with a
contact address.]$q$, $a$[OWNER DECISION: the name and contact details of the operator of this platform.]$a$),
  ($q$privacy$q$, $q$[OWNER DECISION: name the supervisory authority a complaint may go to, and the
law this notice is written against.]$q$, $a$This notice is written against the Data Protection and Privacy Act, 2019 of Uganda, and the supervisory authority is the Personal Data Protection Office (PDPO) of Uganda. You may also complain to the supervisory authority of the country you live in.$a$),
  ($q$children$q$, $q$[OWNER DECISION: whether children under 13 may enrol anywhere at all before that
verification is enabled, and in which countries.]$q$, $a$No one under 13 may use this platform anywhere, in any country, until guardian verification is working and switched on. It is not yet: the database refuses to create a child profile without a verified guardian, and the switch that would open the door is off.$a$),
  ($q$children$q$, $q$[OWNER DECISION: the named person responsible for child protection, and how they
are reached.]$q$, $a$The person responsible for child protection is the operator named in the privacy notice.$a$),
  ($q$children$q$, $q$[OWNER DECISION: what happens to a child's learning record when they turn 18 —
whether it becomes their own account, is handed over with consent, or is
archived.]$q$, $a$When a learner turns 18 the record becomes their own account, and they are asked whether to keep it. If they say no it is deleted within 30 days. It is not archived, and it is not quietly kept.$a$),
  ($q$children$q$, $q$[OWNER DECISION: how long a child's learning record is kept after the adult's
account closes.]$q$, $a$A child's learning record is deleted with the guardian's account, 30 days after that account closes. The exception is a certificate already issued: its number stays verifiable, because a certificate somebody may have shown an employer has to keep meaning something. It verifies the certificate, not the child.$a$),
  ($q$refunds$q$, $q$[OWNER DECISION: whether the 72-hour window replaces the statutory period, or
applies on top of it, market by market — and the exact wording of the waiver
shown at checkout where content starts immediately.]$q$, $a$The 72-hour window applies on top of any right the law gives you. It never replaces one. No waiver is offered and none will be: a waiver is only worth asking for once content is delivered the instant somebody pays, and nothing is sold yet. When selling begins the statutory period is honoured in full, in every market.$a$),
  ($q$refunds$q$, $q$[OWNER DECISION: the treatment of a subscription cancelled mid-month.]$q$, $a$A cancelled subscription runs to the end of the period that has been paid for and then stops. There is no part-month refund, and cancelling never removes what has already been learned.$a$),
  ($q$refunds$q$, $q$[OWNER DECISION: the provider, and what a learner is told about timing.]$q$, $a$The refund is executed by the merchant of record that took the payment; the provider is named on this page when one is connected. This platform records the decision and the provider moves the money, which typically appears within 5 to 10 working days. It cannot be made faster here, because the platform is not the party holding the funds.$a$),
  ($q$teaching$q$, $q$[OWNER DECISION: the payout schedule, the minimum balance that may be withdrawn,
who bears the transfer fee, and what happens to a balance if an account is
closed.]$q$, $a$Earnings accrue as orders are confirmed and are paid monthly, on the 15th, for the previous month. A balance is transferred when it reaches USD 50; below that it rolls over. The teacher bears the transfer fee, which is deducted from the transfer and shown on the statement. If an account closes, any balance beyond the refund hold is paid at the next run regardless of the minimum. Nothing is paid out today: no payout provider is connected, and the screen that shows a balance says so.$a$),
  ($q$teaching$q$, $q$[OWNER DECISION: what happens to a course and to a teacher's appointment when the
breach is serious — whether courses are withdrawn automatically, and whether the
appointment ends.]$q$, $a$Where a breach is serious, the course is withdrawn from the catalogue and the appointment to teach ends, with the reason recorded against the teacher's name. A learner who has paid keeps access to what they paid for, except where the breach concerns the safety of a child, in which case access ends for everybody at once and the money question follows the takedown rules rather than this paragraph.$a$),
  ($q$safeguarding$q$, $q$[OWNER DECISION: the screening standard a teacher must meet before teaching
children, who performs it, and how long it lasts.]$q$, $a$A teacher shows a government-issued photo identity document, gives two named references who can be reached, and signs a written declaration that nothing makes them unsuitable to teach a child. The owner or governance staff record it, with the date and when it lapses. It lasts 24 months. This is not a criminal-record check: no such check is available to this platform in most of the countries it serves, and pretending otherwise would be worse than saying plainly that it is not.$a$),
  ($q$safeguarding$q$, $q$[OWNER DECISION: the named safeguarding lead, their contact, the hours they are
reachable, and the timescale for answering a child-safety report.]$q$, $a$The safeguarding lead is the operator named in the privacy notice, and is reachable every day. A child-safety report is acknowledged within 24 hours and decided within 7 days, and the person who made it is told the outcome.$a$),
  ($q$takedown$q$, $q$[OWNER DECISION: the named agent and address for copyright notices, and whether a
postal address is required in the operator's jurisdiction.]$q$, $a$Notices go to the operator named in the privacy notice. Email is enough: a postal address is not required under Ugandan law, and a notice that arrives by email is answered like any other.$a$),
  ($q$takedown$q$, $q$[OWNER DECISION: how long a notice has before it is decided, and whether material
is withheld at once or after a first review.]$q$, $a$Material is withheld the moment a notice is recorded, not after a first review, because a rights holder should not have to wait for distribution to stop. A notice is decided within 14 days. Where it is not, the review date on the notice shows as overdue to the operator and the claimant may write again.$a$),
  ($q$takedown$q$, $q$[OWNER DECISION: what a counter-notice must contain, how long the original
complainant has to respond, and on what basis material is restored.]$q$, $a$A teacher may send a counter-notice: what the material is, where it came from, why they may use it, how to reach them, and agreement that the courts of Uganda may hear the dispute. The claimant then has 10 days to respond. If they do not, the material is restored and the notice is recorded as withdrawn. Restoration happens on that basis alone and never on a timer.$a$),
  ($q$takedown$q$, $q$[OWNER DECISION: what counts as repeated, and what the consequence is for a
teacher versus a learner.]$q$, $a$Three upheld notices against one person within 12 months is repeated infringement. A teacher's appointment ends and their courses are withdrawn. A learner loses the ability to post in discussions and to submit work that is published. The record of why is kept rather than deleted, because the next person deciding needs it.$a$)
    ) as t(slug, marker, answer)
  loop
    -- The replacement must find its marker. A silent miss would leave an
    -- unanswered question in a document that then looked answered.
    select v.body into v_body
      from public.policy_versions v
      join public.policy_documents d on d.id = v.document_id
     where d.slug = r.slug and v.status = 'draft';

    if v_body is null then
      raise exception 'policy decisions: no draft for %', r.slug;
    end if;
    if position(r.marker in v_body) = 0 then
      raise exception 'policy decisions: marker not found in %: %', r.slug, left(r.marker, 60);
    end if;

    update public.policy_versions v
       set body = replace(v.body, r.marker, r.answer),
           change_note = 'The owner answered the decisions in this text on 2026-10-27.'
     from public.policy_documents d
     where d.id = v.document_id and d.slug = r.slug and v.status = 'draft';

    v_answered := v_answered + 1;
  end loop;

  select count(*)::int into v_docs from public.policy_versions where status = 'draft';

  insert into public.governance_audit_events (actor, action, target_type, target_id, detail)
  values (null, 'policy.decisions_answered', 'policy_document', null,
          jsonb_build_object('answered', v_answered, 'documents', v_docs,
                             'remaining', 1, 'source', 'migration',
                             'reason', 'Owner decisions of 2026-10-27'));
end $$;

-- The flag row listed those questions as unanswered. It must not keep saying so.
update public.platform_settings
   set preconditions = 'Six of the seven drafts are answered as of 2026-10-27: '
        || 'Ugandan law and courts, the Personal Data Protection Office under the Data '
        || 'Protection and Privacy Act 2019, retention of three years for support and '
        || 'seven for safeguarding, no under-13s until guardian verification works, and '
        || 'a screening standard that says plainly it is not a criminal-record check. '
        || 'One marker remains and it is a fact rather than a decision: the operator''s '
        || 'name and contact details, which the privacy notice must state and which '
        || 'nobody else can supply. Type it in the editor on /admin/policies, then '
        || 'publish each draft with a date and a written reason',
       description = 'Terms, privacy, child policy, refund policy, content licence'
 where key = 'platform.legal';
