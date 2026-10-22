import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Promotions, as a person manages them.
 *
 * Everything here exists because the writers in `20261235000100` and
 * `20261236000100` are SQL functions, and the people who run this platform do
 * not write SQL. A campaign is created, paused and re-limited from a screen;
 * the database still decides who may do what, so a teacher opening
 * `/teach/promotions` cannot reach a platform-wide campaign even if the request
 * is edited.
 */

export type PromotionStatus = 'draft' | 'active' | 'paused' | 'archived';
export type BenefitType = 'percent_off' | 'fixed_amount_off';

export type PromotionCampaign = {
  id: string;
  code: string;
  name: string;
  status: PromotionStatus;
  ownerType: 'platform' | 'teacher';
  /** The teacher's display name, when a teacher owns it. */
  ownerName: string | null;
  benefit:
    | { type: 'percent_off'; percent: number }
    | { type: 'fixed_amount_off'; amountMinor: bigint; currency: string };
  /** Empty means every market the course is sold in. */
  markets: string[];
  courses: { id: string; title: string }[];
  limits: { total: number | null; perUser: number | null; perFamily: number | null };
  startsAt: string | null;
  endsAt: string | null;
  newCustomersOnly: boolean;
  redemptions: number;
};

export type PromotionCourseOption = { id: string; title: string };

export type PromotionInput = {
  code: string;
  name: string;
  benefitType: BenefitType;
  percent?: unknown;
  amountMinor?: unknown;
  currency?: unknown;
  markets: string[];
  courseIds: string[];
  totalLimit?: unknown;
  perUserLimit?: unknown;
  perFamilyLimit?: unknown;
  startsAt?: unknown;
  endsAt?: unknown;
  newCustomersOnly?: boolean;
};

export type PromotionValidation =
  | { ok: true; value: Record<string, unknown> }
  | { ok: false; message: string };

const CODE = /^[A-Za-z0-9][A-Za-z0-9_-]{0,31}$/;
const CURRENCY = /^[A-Z]{3}$/;
const MARKET = /^[A-Z]{2}$/;

type WholeNumber = { ok: true; value: number | null } | { ok: false; message: string };

/**
 * A blank field means "no limit", which is different from zero. Returning the
 * two as `null` and a number rather than as `''` keeps every caller honest: a
 * zero here is a mistake, not an empty box.
 */
function wholeNumber(value: unknown, label: string, min: number, max: number): WholeNumber {
  if (value === null || value === undefined || String(value).trim() === '') {
    return { ok: true, value: null };
  }
  const n = typeof value === 'number' ? value : Number(String(value).trim());
  if (!Number.isInteger(n)) return { ok: false, message: `${label} has to be a whole number.` };
  if (n < min || n > max) {
    return { ok: false, message: `${label} has to be between ${min} and ${max}.` };
  }
  return { ok: true, value: n };
}

/**
 * Turns a filled-in form into the writer's arguments, or into the sentence that
 * tells the person what is missing.
 *
 * The rules are duplicated deliberately: the database is the authority, but a
 * form that posts a 100.5% discount and waits for a Postgres error to explain
 * itself is not the screen this platform wants. The database still checks
 * everything, including the things only it can know — a teacher's ownership of
 * a course, and the currency a market is priced in.
 */
export function validateCampaignInput(input: PromotionInput): PromotionValidation {
  const code = String(input.code ?? '').trim().toUpperCase();
  if (!CODE.test(code)) {
    return {
      ok: false,
      message: 'A code is letters, digits, a dash or an underscore, up to 32 characters.',
    };
  }

  const name = String(input.name ?? '').trim();
  if (name.length === 0) return { ok: false, message: 'Give the promotion a name.' };
  if (name.length > 120) return { ok: false, message: 'Keep the name under 120 characters.' };

  if (input.benefitType !== 'percent_off' && input.benefitType !== 'fixed_amount_off') {
    return { ok: false, message: 'A promotion is a percentage or a fixed amount off.' };
  }

  let percent: number | null = null;
  let amountMinor: bigint | null = null;
  let currency: string | null = null;

  if (input.benefitType === 'percent_off') {
    const p = wholeNumber(input.percent, 'The percentage', 1, 100);
    if (!p.ok) return { ok: false, message: p.message };
    if (p.value === null) return { ok: false, message: 'Give the percentage this takes off.' };
    percent = p.value;
  } else {
    const raw = String(input.amountMinor ?? '').replace(/[\s,]/g, '');
    if (!/^\d+$/.test(raw) || raw === '0') {
      return { ok: false, message: 'A fixed discount needs a whole amount in minor units.' };
    }
    amountMinor = BigInt(raw);
    currency = String(input.currency ?? '').trim().toUpperCase();
    if (!CURRENCY.test(currency)) {
      return { ok: false, message: 'A fixed discount needs a three-letter currency code.' };
    }
  }

  const markets = [...new Set(input.markets.map((m) => m.trim().toUpperCase()).filter(Boolean))];
  if (markets.some((m) => !MARKET.test(m))) {
    return { ok: false, message: 'Every market is a two-letter country code.' };
  }

  const courseIds = [...new Set(input.courseIds.filter(Boolean))];

  const total = wholeNumber(input.totalLimit, 'The total limit', 1, 1_000_000);
  if (!total.ok) return { ok: false, message: total.message };
  const perUser = wholeNumber(input.perUserLimit, 'The per-person limit', 1, 1000);
  if (!perUser.ok) return { ok: false, message: perUser.message };
  const perFamily = wholeNumber(input.perFamilyLimit, 'The per-family limit', 1, 1000);
  if (!perFamily.ok) return { ok: false, message: perFamily.message };

  const window = parseWindow(input.startsAt, input.endsAt);
  if (!window.ok) return window;

  return {
    ok: true,
    value: {
      code,
      name,
      benefitType: input.benefitType,
      percent,
      amountMinor: amountMinor === null ? null : amountMinor.toString(),
      currency,
      markets,
      courseIds,
      totalLimit: total.value,
      perUserLimit: perUser.value,
      perFamilyLimit: perFamily.value,
      startsAt: window.startsAt,
      endsAt: window.endsAt,
      newCustomersOnly: Boolean(input.newCustomersOnly),
    },
  };
}

function parseWindow(
  startsAt: unknown,
  endsAt: unknown,
): { ok: true; startsAt: string | null; endsAt: string | null } | { ok: false; message: string } {
  const read = (value: unknown): Date | string | null => {
    if (value === null || value === undefined || String(value).trim() === '') return null;
    const date = new Date(String(value));
    if (Number.isNaN(date.getTime())) return 'That date is not a date.';
    return date;
  };

  const start = read(startsAt);
  if (typeof start === 'string') return { ok: false, message: start };
  const end = read(endsAt);
  if (typeof end === 'string') return { ok: false, message: end };

  if (start && end && start > end) {
    return { ok: false, message: 'A promotion cannot end before it starts.' };
  }

  return {
    ok: true,
    startsAt: start ? start.toISOString() : null,
    endsAt: end ? end.toISOString() : null,
  };
}

/**
 * The database's refusals, in words a person managing an offer can act on.
 *
 * Matched on substrings rather than error codes because these are `raise
 * exception` messages, and the keys that matter are stable phrases. An unknown
 * message is passed through unchanged: it is better to show a technical sentence
 * than to replace it with a vague one.
 */
export function describePromotionRefusal(message: string): string {
  const checks: [RegExp, string][] = [
    [/only the platform owner or a teacher/i,
      'Only the platform owner or a teacher can create a promotion.'],
    [/has to name the courses it applies to/i,
      'A teacher promotion has to name the courses it applies to.'],
    [/is not yours to discount/i,
      'You can only discount courses you created.'],
    [/already used by another promotion/i,
      'That code is already in use. Pick another.'],
    [/has no live price in market/i,
      'That course has no price in one of the countries you chose. Remove it or price the course there.'],
    [/priced in more than one currency/i,
      'That course has two prices in one country, so a fixed discount cannot say what it is worth there.'],
    [/priced in ([A-Z]{3}) in market ([A-Z]{2}), so a ([A-Z]{3}) discount/i,
      'That country prices this course in a different currency from the one your discount is written in.'],
    [/only the owner of this campaign/i, 'Only the person who created this promotion can change it.'],
    [/has already been redeemed/i,
      'This promotion has already been used more times than the limit you are setting.'],
    [/at least one redemption/i, 'A limit has to be at least one.'],
    [/cannot end before it starts/i, 'A promotion cannot end before it starts.'],
  ];
  for (const [pattern, sentence] of checks) {
    if (pattern.test(message)) return sentence;
  }
  return message;
}

export type PromotionWriteOutcome =
  | { ok: true }
  | { ok: false; message: string };

export async function createCampaign(
  supabase: SupabaseClient,
  input: PromotionInput,
): Promise<PromotionWriteOutcome> {
  const validated = validateCampaignInput(input);
  if (!validated.ok) return { ok: false, message: validated.message };
  const v = validated.value;

  const { error } = await supabase.rpc('create_promotion_campaign', {
    p_code: v.code,
    p_name: v.name,
    p_benefit_type: v.benefitType,
    p_percent: v.percent,
    p_amount_minor: v.amountMinor === null ? null : Number(v.amountMinor),
    p_currency: v.currency,
    p_markets: v.markets,
    p_course_ids: v.courseIds,
    p_starts_at: v.startsAt,
    p_ends_at: v.endsAt,
    p_total_limit: v.totalLimit,
    p_per_user_limit: v.perUserLimit,
    p_new_customers_only: v.newCustomersOnly,
    p_per_family_limit: v.perFamilyLimit,
  });

  if (error) return { ok: false, message: describePromotionRefusal(error.message) };
  return { ok: true };
}

export async function setCampaignStatus(
  supabase: SupabaseClient,
  campaignId: string,
  status: PromotionStatus,
): Promise<PromotionWriteOutcome> {
  const { error } = await supabase.rpc('set_promotion_campaign_status', {
    p_campaign_id: campaignId,
    p_status: status,
  });
  if (error) return { ok: false, message: describePromotionRefusal(error.message) };
  return { ok: true };
}

export async function setCampaignLimits(
  supabase: SupabaseClient,
  campaignId: string,
  limits: { total: unknown; perUser: unknown; perFamily: unknown },
): Promise<PromotionWriteOutcome> {
  const total = wholeNumber(limits.total, 'The total limit', 1, 1_000_000);
  if (!total.ok) return { ok: false, message: total.message };
  const perUser = wholeNumber(limits.perUser, 'The per-person limit', 1, 1000);
  if (!perUser.ok) return { ok: false, message: perUser.message };
  const perFamily = wholeNumber(limits.perFamily, 'The per-family limit', 1, 1000);
  if (!perFamily.ok) return { ok: false, message: perFamily.message };

  const { error } = await supabase.rpc('set_promotion_limits', {
    p_campaign_id: campaignId,
    p_total_limit: total.value,
    p_per_user_limit: perUser.value,
    p_per_family_limit: perFamily.value,
  });
  if (error) return { ok: false, message: describePromotionRefusal(error.message) };
  return { ok: true };
}

/** "20% off" or "5,000 UGX off", in words a person reads rather than parses. */
export function describeBenefit(benefit: PromotionCampaign['benefit']): string {
  if (benefit.type === 'percent_off') {
    return `${benefit.percent}% off`;
  }
  const amount = benefit.amountMinor.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  return `${amount} ${benefit.currency} off`;
}

/** Where a campaign applies, in words. */
export function describeMarkets(markets: string[]): string {
  if (markets.length === 0) return 'Everywhere the course is sold';
  if (markets.length === 1) return markets[0] ?? '';
  return markets.join(', ');
}

export function describeLimits(limits: PromotionCampaign['limits']): string {
  const parts: string[] = [];
  if (limits.total !== null) parts.push(`${limits.total} in total`);
  if (limits.perUser !== null) parts.push(`${limits.perUser} per person`);
  if (limits.perFamily !== null) parts.push(`${limits.perFamily} per family`);
  return parts.length === 0 ? 'No limit' : parts.join(' · ');
}

type RawCampaign = {
  id: string;
  code: string;
  name: string;
  status: PromotionStatus;
  owner_type: 'platform' | 'teacher';
  instructor_id: string | null;
  per_family_limit: number | null;
  total_usage_limit: number | null;
  per_user_limit: number | null;
  starts_at: string | null;
  ends_at: string | null;
  new_customers_only: boolean;
  promotion_benefits: {
    benefit_type: BenefitType;
    percent_off: number | string | null;
    amount_off_minor: number | string | null;
    amount_off_currency: string | null;
    position: number;
  }[];
  promotion_campaign_markets: { market: string }[];
  promotion_campaign_courses: { course_id: string; courses: { title: string } | null }[];
};

/**
 * Every campaign this person may see, with its benefit, markets, courses and
 * usage.
 *
 * RLS decides the list: staff see everything, a teacher sees their own, and
 * everybody else sees only active campaigns (which is what makes a public "current
 * offers" strip possible later). The screen does not filter by role — it renders
 * what came back, because a second filter is a second authority.
 */
export async function fetchCampaigns(supabase: SupabaseClient): Promise<PromotionCampaign[]> {
  const { data, error } = await supabase
    .from('promotion_campaigns')
    .select(
      'id,code,name,status,owner_type,instructor_id,per_family_limit,total_usage_limit,' +
        'per_user_limit,starts_at,ends_at,new_customers_only,' +
        'promotion_benefits(benefit_type,percent_off,amount_off_minor,amount_off_currency,position),' +
        'promotion_campaign_markets(market),' +
        'promotion_campaign_courses(course_id,courses(title))',
    )
    .order('created_at', { ascending: false });
  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as RawCampaign[];
  if (rows.length === 0) return [];

  // Redemption counts in one query rather than one per campaign. A teacher can
  // read their own by policy; staff can read all.
  const ids = rows.map((r) => r.id);
  const { data: redemptionRows } = await supabase
    .from('promotion_redemptions')
    .select('campaign_id')
    .in('campaign_id', ids);
  const counts = new Map<string, number>();
  for (const row of (redemptionRows ?? []) as { campaign_id: string }[]) {
    counts.set(row.campaign_id, (counts.get(row.campaign_id) ?? 0) + 1);
  }

  // Owner names, for staff looking at a teacher's campaign. `user_profiles_read_own`
  // returns nothing for other people, so this is best-effort by design: the id
  // is always shown, the name when the policy allows it.
  const instructorIds = [...new Set(rows.map((r) => r.instructor_id).filter((v): v is string => Boolean(v)))];
  const names = new Map<string, string>();
  if (instructorIds.length > 0) {
    const { data: profiles } = await supabase
      .from('user_profiles')
      .select('user_id,display_name')
      .in('user_id', instructorIds);
    for (const profile of (profiles ?? []) as { user_id: string; display_name: string | null }[]) {
      if (profile.display_name) names.set(profile.user_id, profile.display_name);
    }
  }

  return rows.map((row) => {
    const benefitRow = [...row.promotion_benefits].sort((a, b) => a.position - b.position)[0];
    const benefit: PromotionCampaign['benefit'] = benefitRow?.benefit_type === 'fixed_amount_off'
      ? {
          type: 'fixed_amount_off',
          amountMinor: BigInt(String(benefitRow.amount_off_minor ?? 0)),
          currency: benefitRow.amount_off_currency ?? '',
        }
      : { type: 'percent_off', percent: Number(benefitRow?.percent_off ?? 0) };

    return {
      id: row.id,
      code: row.code,
      name: row.name,
      status: row.status,
      ownerType: row.owner_type,
      ownerName: row.instructor_id ? names.get(row.instructor_id) ?? null : null,
      benefit,
      markets: row.promotion_campaign_markets.map((m) => m.market).sort(),
      courses: row.promotion_campaign_courses.map((c) => ({
        id: c.course_id,
        title: c.courses?.title ?? 'A course you cannot read',
      })),
      limits: {
        total: row.total_usage_limit,
        perUser: row.per_user_limit,
        perFamily: row.per_family_limit,
      },
      startsAt: row.starts_at,
      endsAt: row.ends_at,
      newCustomersOnly: row.new_customers_only,
      redemptions: counts.get(row.id) ?? 0,
    };
  });
}
