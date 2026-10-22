import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  createCampaign,
  describePromotionRefusal,
  setCampaignLimits,
  setCampaignStatus,
  type BenefitType,
  type PromotionInput,
  type PromotionStatus,
} from '@/lib/promotions';

function fail(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status });
}

const STATUSES: PromotionStatus[] = ['draft', 'active', 'paused', 'archived'];

/**
 * POST /api/promotions — create a campaign, change its status, or change its limits.
 *
 * One route for both the admin console and the teacher's screen, because the
 * rules are the same and only the database knows who is asking. The writer
 * derives the owner from the session, so a teacher posting a platform-wide
 * campaign is refused by SQL rather than by a check here that a future caller
 * could skip.
 */
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
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return fail('Sign in first.', 401);

  switch (body.action) {
    case 'create': {
      const input: PromotionInput = {
        code: String(body.code ?? ''),
        name: String(body.name ?? ''),
        benefitType: (body.benefitType === 'fixed_amount_off'
          ? 'fixed_amount_off'
          : 'percent_off') as BenefitType,
        percent: body.percent,
        amountMinor: body.amountMinor,
        currency: body.currency,
        markets: Array.isArray(body.markets) ? body.markets.map(String) : [],
        courseIds: Array.isArray(body.courseIds) ? body.courseIds.map(String) : [],
        totalLimit: body.totalLimit,
        perUserLimit: body.perUserLimit,
        perFamilyLimit: body.perFamilyLimit,
        startsAt: body.startsAt,
        endsAt: body.endsAt,
        newCustomersOnly: body.newCustomersOnly === true,
      };
      const outcome = await createCampaign(supabase, input);
      if (!outcome.ok) {
        // A refusal that names the wrong actor is a 403; everything else is a
        // form the person can fix.
        const forbidden = /^(Only the platform owner or a teacher|You can only discount)/.test(
          outcome.message,
        );
        return fail(outcome.message, forbidden ? 403 : 400);
      }
      return NextResponse.json({ ok: true });
    }

    case 'status': {
      const campaignId = String(body.campaignId ?? '');
      const status = String(body.status ?? '') as PromotionStatus;
      if (!campaignId) return fail('Choose a promotion.');
      if (!STATUSES.includes(status)) return fail('That is not a status a promotion can have.');
      const outcome = await setCampaignStatus(supabase, campaignId, status);
      if (!outcome.ok) {
        return fail(outcome.message, /Only the person who created/.test(outcome.message) ? 403 : 400);
      }
      return NextResponse.json({ ok: true });
    }

    case 'limits': {
      const campaignId = String(body.campaignId ?? '');
      if (!campaignId) return fail('Choose a promotion.');
      const outcome = await setCampaignLimits(supabase, campaignId, {
        total: body.totalLimit,
        perUser: body.perUserLimit,
        perFamily: body.perFamilyLimit,
      });
      if (!outcome.ok) {
        return fail(outcome.message, /Only the person who created/.test(outcome.message) ? 403 : 400);
      }
      return NextResponse.json({ ok: true });
    }

    default:
      return fail('Unknown promotion action.');
  }
}

/** Exported for the tests that hold the refusal sentences against the writers. */
export { describePromotionRefusal };
