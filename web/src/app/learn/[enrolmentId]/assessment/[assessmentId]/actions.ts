'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchAssessmentContext, startAttempt } from '@/lib/assessment';
import { isFlagEnabled } from '@/lib/flags';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/iu;

/**
 * Start another attempt, because the learner pressed the button that says so.
 *
 * The first attempt opens when the page is first opened. Every later one is
 * opened here and nowhere else: by a person, on purpose, after being told it
 * uses one of their attempts.
 *
 * The two ids arrive bound into the form by the page. They are still checked
 * as if a stranger had typed them, because a form can be posted by anyone:
 * `fetchAssessmentContext` reads under the caller's session and answers
 * nothing for an enrolment that is not theirs, and the insert itself is
 * subject to row-level security and to `enforce_attempt_limit`.
 */
export async function startAnotherAttempt(enrolmentId: string, assessmentId: string): Promise<void> {
  if (!isSupabaseConfigured() || !UUID.test(enrolmentId) || !UUID.test(assessmentId)) redirect('/learn');
  const path = `/learn/${enrolmentId}/assessment/${assessmentId}`;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect(`/sign-in?next=/learn/${enrolmentId}`);

  const context = await fetchAssessmentContext(supabase, { enrolmentId, assessmentId });
  if (!context) redirect('/learn');
  if (!(await isFlagEnabled(supabase, 'learning.assessments').catch(() => false))) {
    redirect(`/learn/${enrolmentId}`);
  }

  // Returns the attempt already in progress if there is one, so a button
  // pressed twice opens one attempt.
  const started = await startAttempt(supabase, {
    learnerProfileId: context.enrolment.learnerProfileId,
    enrolmentId: context.enrolment.id,
    assessmentId: context.assessment.id,
  });

  revalidatePath(path);
  // A reached limit needs no flag in the address: the page reads the attempts
  // and says so itself.
  redirect(started.ok || started.code === 'attempt_limit_reached' ? path : `${path}?start=failed`);
}
