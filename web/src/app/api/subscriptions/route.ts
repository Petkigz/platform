import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) {
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 });
  }
  const b = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });

  let fn: string;
  let args: Record<string, unknown>;
  if (b.action === 'cancel') {
    if (typeof b.subscriptionId !== 'string' || !uuid.test(b.subscriptionId)) {
      return NextResponse.json({ ok: false, message: 'A subscription id is required.' }, { status: 400 });
    }
    if (typeof b.reason !== 'string' || b.reason.trim().length === 0 || b.reason.length > 500) {
      return NextResponse.json({ ok: false, message: 'Give a reason under 500 characters.' }, { status: 400 });
    }
    fn = 'cancel_subscription';
    args = { p_subscription_id: b.subscriptionId, p_reason: b.reason.trim() };
  } else if (b.action === 'allocate') {
    if (typeof b.subscriptionId !== 'string' || !uuid.test(b.subscriptionId)
        || typeof b.learnerProfileId !== 'string' || !uuid.test(b.learnerProfileId)) {
      return NextResponse.json({ ok: false, message: 'Choose a valid subscription and learner.' }, { status: 400 });
    }
    fn = 'allocate_subscription_learner';
    args = { p_subscription_id: b.subscriptionId, p_learner_profile_id: b.learnerProfileId };
  } else {
    return NextResponse.json({ ok: false, message: 'Unsupported subscription action.' }, { status: 400 });
  }

  const { data, error } = await supabase.rpc(fn, args as never);
  if (error) {
    const message = error.message;
    const status = /not a member|permission to cancel|only an active family member|may only be assigned/i.test(message)
      ? 403
      : /not found|not available/i.test(message)
        ? 404
        : /slot|active subscription|written cancellation reason/i.test(message)
          ? 409
          : 400;
    return NextResponse.json({ ok: false, message }, { status });
  }

  return NextResponse.json({ ok: true, data }, { status: 200 });
}
