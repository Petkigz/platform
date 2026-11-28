import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  applyDecisionToVersion,
  fetchAssignment,
  recordDecision,
  respondToAssignment,
  versionStatusAfter,
  type Decision,
  type ReviewAssignment,
} from '@/lib/review';
import {
  assignmentRefusalOf,
  assignmentStatusOf,
  isAssignmentId,
  type AssignmentRefusal,
} from '@/lib/review-assignment';

const DECISIONS: Decision[] = ['approved', 'revision_requested', 'rejected'];

/**
 * Reviewer actions.
 *
 * Nothing here decides who is allowed to do what: `cra_update` admits
 * privileged users and the assigned reviewer, `crd_write` requires
 * `decided_by` to be the session user, and from migration 371 the database
 * also decides which states a reviewer may move an assignment between, that
 * a decision is recorded only on a review that was accepted and is still
 * open, and that recording one completes the assignment. This forwards and
 * reports.
 *
 * The version and scope for a decision are read back from the assignment
 * rather than accepted from the client, so a caller cannot attach a decision
 * to a version they were not asked about even by trying.
 *
 * **A refusal has a name** (2026-11-28), which the page says in the reader's
 * language; the English `message` beside it is for a log. Until then the
 * browser printed `message`, the only names were `rejected` and `forbidden`,
 * and an assignment that could not be read was answered as "not yours".
 */
function fail(code: AssignmentRefusal, message: string, status = assignmentStatusOf(code)) {
  return NextResponse.json({ ok: false, code, message }, { status });
}

/** What a library call answered, as a reply. A gateway's page is not sent on to the browser. */
function refused(outcome: { message: string; state?: string | null; code?: string | null }) {
  // No `state` at all is the library's own check: nothing was sent, so it is
  // a refusal. A `state` of null is the database's call answering without one.
  if (outcome.state === undefined) return fail('refused', outcome.message);
  const code = assignmentRefusalOf(outcome);
  return fail(code, code === 'unsure' ? 'The answer could not be read.' : outcome.message);
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('refused', 'Supabase is not configured.', 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('refused', 'Malformed request.', 400);
  }
  const b = (raw && typeof raw === 'object' ? raw : {}) as {
    action?: unknown;
    assignmentId?: unknown;
    accept?: unknown;
    decision?: unknown;
    rationale?: unknown;
  };

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return fail('signedOut', 'Sign in first.');

  // The whole shape of an id, not "36 characters of hex and hyphens": the
  // looser test let through text the database then refused as malformed.
  if (!isAssignmentId(b.assignmentId)) return fail('refused', 'An assignment id is required.', 400);

  // ---------------------------------------------------------------------
  if (b.action === 'respond') {
    // Until 2026-11-27 anything that was not `true` declined: a request that
    // left the answer out, or sent the word "true", turned an offer down.
    if (typeof b.accept !== 'boolean') return fail('refused', 'Say whether you accept or decline.', 400);
    const outcome = await respondToAssignment(supabase, {
      assignmentId: b.assignmentId,
      accept: b.accept,
    });
    if (!outcome.ok) return refused(outcome);
    return NextResponse.json({ ok: true, value: outcome.value }, { status: 200 });
  }

  // ---------------------------------------------------------------------
  if (b.action === 'decide') {
    if (typeof b.decision !== 'string' || !DECISIONS.includes(b.decision as Decision)) {
      return fail('refused', 'Choose a decision.', 400);
    }
    if (typeof b.rationale !== 'string' || b.rationale.trim().length === 0) {
      return fail('reason', 'Give a reason for the decision.');
    }
    const decision = b.decision as Decision;

    // Read the assignment rather than trusting the client about what it is
    // for. RLS decides whether this reviewer may even see it. A read that
    // failed is not "not yours": nothing was sent, and that is what is said.
    let assignment: ReviewAssignment | null;
    try {
      assignment = await fetchAssignment(supabase, b.assignmentId);
    } catch (error) {
      console.error(`review: the assignment could not be read before a decision: ${error instanceof Error ? error.message : String(error)}`);
      return fail('refused', 'The assignment could not be read, so nothing was recorded.', 502);
    }
    if (!assignment) return fail('notYours', 'That assignment is not yours.');

    const recorded = await recordDecision(supabase, {
      assignmentId: assignment.id,
      courseVersionId: assignment.courseVersionId,
      scope: assignment.scope,
      decision,
      rationale: b.rationale,
      reviewerUserId: user.id,
    });

    if (!recorded.ok) return refused(recorded);

    // Then move the version. If this fails the decision is still recorded,
    // and from migration 371 the assignment is completed with it: that is
    // deliberate, and the answer says so rather than pretending nothing
    // happened. `ok` is about the decision, which is what was asked for;
    // `moved` is about the version.
    const moved = await applyDecisionToVersion(supabase, {
      versionId: assignment.courseVersionId,
      decision,
      actorId: user.id,
    });
    if (moved.ok) return NextResponse.json({ ok: true, value: recorded.value, moved: 'yes' }, { status: 200 });

    // Another reviewer's decision may have moved the version there already
    // (a version can carry a technical and a scholarly review): then there
    // was nothing left to move, and that is not a failure.
    const { data: now } = await supabase
      .from('course_versions')
      .select('version_status')
      .eq('id', assignment.courseVersionId)
      .maybeSingle();
    const already = (now as { version_status?: unknown } | null)?.version_status === versionStatusAfter(decision);
    if (!already) console.error(`review: a decision was recorded and the version was not moved: ${moved.message}`);
    return NextResponse.json({ ok: true, value: recorded.value, moved: already ? 'already' : 'no' }, { status: 200 });
  }

  return fail('refused', 'Unknown action.', 400);
}
