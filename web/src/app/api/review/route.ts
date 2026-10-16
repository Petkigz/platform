import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  applyDecisionToVersion,
  fetchAssignment,
  recordDecision,
  respondToAssignment,
  type Decision,
} from '@/lib/review';

const DECISIONS: Decision[] = ['approved', 'revision_requested', 'rejected'];

/**
 * Reviewer actions.
 *
 * Nothing here decides who is allowed to do what — `cra_update` admits
 * privileged users and the assigned reviewer, `crd_write` requires
 * `decided_by` to be the session user, and `validate_review_decision()` checks
 * that the decision matches its assignment and was made by the reviewer it
 * names. This forwards and reports.
 *
 * The version and scope for a decision are read back from the assignment
 * rather than accepted from the client, so a caller cannot attach a decision
 * to a version they were not asked about even by trying.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Supabase is not configured.' },
      { status: 503 },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Malformed request.' },
      { status: 400 },
    );
  }

  const b = body as {
    action?: unknown;
    assignmentId?: unknown;
    accept?: unknown;
    decision?: unknown;
    rationale?: unknown;
  };

  const uuid = /^[0-9a-f-]{36}$/i;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'Sign in first.' },
      { status: 401 },
    );
  }

  if (typeof b.assignmentId !== 'string' || !uuid.test(b.assignmentId)) {
    return NextResponse.json(
      { ok: false, code: 'rejected', message: 'An assignment id is required.' },
      { status: 400 },
    );
  }

  // ---------------------------------------------------------------------
  if (b.action === 'respond') {
    const outcome = await respondToAssignment(supabase, {
      assignmentId: b.assignmentId,
      accept: b.accept === true,
    });
    return json(outcome);
  }

  // ---------------------------------------------------------------------
  if (b.action === 'decide') {
    if (typeof b.decision !== 'string' || !DECISIONS.includes(b.decision as Decision)) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'Choose a decision.' },
        { status: 400 },
      );
    }
    if (typeof b.rationale !== 'string' || b.rationale.trim().length === 0) {
      return NextResponse.json(
        { ok: false, code: 'rejected', message: 'Give a reason for the decision.' },
        { status: 400 },
      );
    }

    // Read the assignment rather than trusting the client about what it is
    // for. RLS decides whether this reviewer may even see it.
    const assignment = await fetchAssignment(supabase, b.assignmentId);
    if (!assignment) {
      return NextResponse.json(
        { ok: false, code: 'forbidden', message: 'That assignment is not yours.' },
        { status: 403 },
      );
    }

    const recorded = await recordDecision(supabase, {
      assignmentId: assignment.id,
      courseVersionId: assignment.courseVersionId,
      scope: assignment.scope,
      decision: b.decision as Decision,
      rationale: b.rationale,
      reviewerUserId: user.id,
    });

    if (!recorded.ok) return json(recorded);

    // Then move the version. If this fails the decision is still recorded —
    // that is deliberate, and the message says so rather than pretending
    // nothing happened.
    const moved = await applyDecisionToVersion(supabase, {
      versionId: assignment.courseVersionId,
      decision: b.decision as Decision,
      actorId: user.id,
    });

    if (!moved.ok) {
      return NextResponse.json(
        {
          ok: false,
          code: 'rejected',
          message: `The decision was recorded, but the course could not be moved: ${moved.message}`,
        },
        { status: 409 },
      );
    }

    return NextResponse.json({ ok: true, value: recorded.value }, { status: 200 });
  }

  return NextResponse.json(
    { ok: false, code: 'rejected', message: 'Unknown action.' },
    { status: 400 },
  );
}

function json(outcome: { ok: boolean; code?: string; message?: string }) {
  if (outcome.ok) return NextResponse.json(outcome, { status: 200 });
  const status = outcome.code === 'forbidden' ? 403 : 400;
  return NextResponse.json(outcome, { status });
}
