import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

export async function POST(request: Request) {
  if (!isSupabaseConfigured()) return fail('Supabase is not configured.', 503);

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return fail('Malformed request.');
  }
  if (typeof raw !== 'object' || raw === null) return fail('Malformed request.');
  const body = raw as Record<string, unknown>;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);
  const { data: privileged } = await supabase.rpc('is_privileged', { p_user_id: user.id });
  if (privileged !== true) return fail('Only platform staff may manage plans.', 403);

  let fn: string;
  let args: Record<string, unknown>;
  switch (body.action) {
    case 'create_plan':
      if (typeof body.code !== 'string' || typeof body.name !== 'string')
        return fail('A plan code and name are required.');
      fn = 'create_plan';
      args = { p_code: body.code, p_name: body.name, p_description: typeof body.description === 'string' ? body.description : null };
      break;
    case 'create_version':
      if (typeof body.planId !== 'string') return fail('Choose a plan first.');
      if (!Number.isInteger(body.childAllowance) || !Number.isInteger(body.adultAllowance))
        return fail('Learner allowances must be whole numbers.');
      if (typeof body.billingInterval !== 'string') return fail('Choose a billing interval.');
      fn = 'create_plan_version';
      args = {
        p_plan_id: body.planId,
        p_child_allowance: body.childAllowance,
        p_adult_allowance: body.adultAllowance,
        p_billing_interval: body.billingInterval,
        p_change_summary: typeof body.changeSummary === 'string' ? body.changeSummary : null,
      };
      break;
    case 'add_entitlement':
      if (typeof body.versionId !== 'string' || typeof body.scopeType !== 'string')
        return fail('Choose a plan version and entitlement scope.');
      fn = 'add_plan_entitlement';
      args = {
        p_plan_version_id: body.versionId,
        p_scope_type: body.scopeType,
        p_subject_area_id: typeof body.subjectAreaId === 'string' ? body.subjectAreaId : null,
        p_product_id: typeof body.productId === 'string' ? body.productId : null,
        p_feature_code: typeof body.featureCode === 'string' ? body.featureCode : null,
      };
      break;
    case 'set_price':
      if (typeof body.versionId !== 'string'
          || typeof body.amountMinor !== 'string'
          || !/^(0|[1-9][0-9]*)$/.test(body.amountMinor)
          || typeof body.currencyCode !== 'string')
        return fail('A version, whole minor-unit amount and currency are required.');
      fn = 'set_plan_price';
      args = {
        p_plan_version_id: body.versionId,
        // Keep money as its decimal integer string all the way to PostgreSQL's
        // bigint parameter; converting it to a JS number can silently round D4.
        p_amount_minor: body.amountMinor,
        p_currency_code: body.currencyCode,
        p_market: typeof body.market === 'string' && body.market ? body.market : null,
      };
      break;
    case 'activate_version':
      if (typeof body.versionId !== 'string') return fail('Choose a plan version.');
      fn = 'activate_plan_version';
      args = { p_plan_version_id: body.versionId };
      break;
    default:
      return fail('Unsupported plan action.');
  }

  const { data, error } = await supabase.rpc(fn, args as never);
  if (error) {
    const message = error.message;
    const status = /only platform staff/i.test(message) ? 403
      : /not found|does not exist/i.test(message) ? 404
      : 409;
    return fail(message, status);
  }
  return NextResponse.json({ ok: true, data }, { status: 200 });
}
