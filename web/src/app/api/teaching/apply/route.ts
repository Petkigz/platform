import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { teachingRefusal } from '@/lib/teaching';
import {
  APPLY_ENGLISH,
  applicationFaultOf,
  applicationOf,
  applyReasonOf,
  applyStatusOf,
  type ApplyOutcome,
} from '@/lib/teaching-outcome';

/**
 * The three things anybody does about teaching, in one place.
 *
 * Every rule is the database's: who may apply, who may decide, when a decision
 * is final, and — the one that matters most — that applying grants nothing.
 * This route chooses the function and turns a refusal into a sentence.
 *
 * There is no `grant` action here, and there could not be a useful one: the
 * role is created inside `decide_teaching_application()` alongside the decision
 * that justifies it, so there is no request a caller could send that makes
 * somebody a teacher without a written reason attached.
 *
 * **Sending and taking back are answered by name.** `submit` and `withdraw`
 * are what the applicant's page calls, in whatever language that reader has,
 * so each refusal is `{ ok: false, code }` with that name's own status
 * (`lib/teaching-outcome.ts`) and an English sentence for a caller with no
 * words of its own. The database's own text is logged and sent to nobody.
 * What was typed is checked against the table's four rules before the
 * database is asked, so the reader is told which box is wrong.
 *
 * `decide` is the staff desk's, in English, and answers as it always did.
 */
export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }
  const body = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;

  const action = typeof body.action === 'string' ? body.action : '';
  const named = (code: ApplyOutcome) =>
    NextResponse.json({ ok: false, code, message: APPLY_ENGLISH[code] }, { status: applyStatusOf(code) });
  const applicants = action === 'submit' || action === 'withdraw';

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return applicants
      ? named('not_signed_in')
      : NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  }

  const str = (value: unknown): string | null =>
    typeof value === 'string' && value.trim() !== '' ? value : null;

  const fail = (message: string, status = 400) =>
    NextResponse.json({ ok: false, ...teachingRefusal(message) }, { status });

  if (action === 'submit') {
    const fields = applicationOf(body);
    const fault = applicationFaultOf(fields);
    if (fault) return named(fault);
    const asked = await supabase
      .rpc('submit_teaching_application', {
        p_headline: fields.headline,
        p_qualifications: fields.qualifications,
        p_sample_url: fields.sampleUrl,
        p_note: fields.note,
      })
      .then((r) => r, () => ({ data: null, error: { code: null, message: 'the request could not be made' } }));
    if (asked.error) {
      const code = applyReasonOf(asked.error);
      if (code === 'refused' || code === 'unconfirmed') {
        console.error('teaching: an application was not sent:', asked.error.message);
      }
      return named(code);
    }
    const said = asked.data as { status?: unknown } | null;
    if (said?.status !== 'submitted') return named('unconfirmed');
    return NextResponse.json({ ok: true, status: 'submitted' });
  }

  if (action === 'withdraw') {
    const asked = await supabase
      .rpc('withdraw_teaching_application')
      .then((r) => r, () => ({ data: null, error: { code: null, message: 'the request could not be made' } }));
    if (asked.error) {
      const code = applyReasonOf(asked.error);
      if (code === 'refused' || code === 'unconfirmed') {
        console.error('teaching: an application was not taken back:', asked.error.message);
      }
      return named(code);
    }
    const said = asked.data as { status?: unknown } | null;
    if (said?.status !== 'withdrawn') return named('unconfirmed');
    return NextResponse.json({ ok: true, status: 'withdrawn' });
  }

  if (action === 'decide') {
    const applicationId = str(body.applicationId);
    if (!applicationId || typeof body.approve !== 'boolean') {
      return NextResponse.json(
        { ok: false, message: 'Say which application, and whether it is approved.' },
        { status: 400 },
      );
    }
    const reason = str(body.reason);
    if (!reason) {
      return NextResponse.json(
        {
          ok: false,
          code: 'reason_required',
          message: 'Write a reason. The applicant reads it, so it has to say something.',
        },
        { status: 400 },
      );
    }
    const { data, error } = await supabase.rpc('decide_teaching_application', {
      p_application: applicationId,
      p_approve: body.approve,
      p_reason: reason,
    });
    if (error) return fail(error.message);
    return NextResponse.json({ ok: true, ...(data as object) });
  }

  return NextResponse.json({ ok: false, message: 'Unknown action.' }, { status: 400 });
}
