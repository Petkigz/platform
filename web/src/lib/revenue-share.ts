import type { SupabaseClient } from '@supabase/supabase-js';

export type RevenueShareOutcome =
  | { ok: true; percent: number }
  | { ok: false; code: 'invalid' | 'not_authorized' | 'rejected'; message: string };

export function validateRevenueShare(percent: unknown, reason: unknown): RevenueShareOutcome {
  if (typeof percent !== 'number' || !Number.isInteger(percent) || percent < 0 || percent > 100) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Enter a whole percentage from 0 to 100.',
    };
  }
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Give a written reason. It will be kept in the audit trail.',
    };
  }
  if (reason.trim().length > 500) {
    return { ok: false, code: 'invalid', message: 'Keep the reason under 500 characters.' };
  }
  return { ok: true, percent };
}

/** Change the share only through the audited, role-limited database writer. */
export async function setRevenueShare(
  supabase: SupabaseClient,
  percent: number,
  reason: string,
): Promise<RevenueShareOutcome> {
  const validation = validateRevenueShare(percent, reason);
  if (!validation.ok) return validation;

  const { data, error } = await supabase.rpc('set_revenue_share_percent', {
    p_percent: percent,
    p_reason: reason.trim(),
  });

  if (error) {
    const message = error.message;
    if (/only a finance admin or platform admin/i.test(message)) {
      return {
        ok: false,
        code: 'not_authorized',
        message: 'Only a finance admin or platform admin can change the revenue share.',
      };
    }
    if (/sign in to change/i.test(message)) {
      return { ok: false, code: 'not_authorized', message: 'Sign in first.' };
    }
    if (/between 0 and 100/i.test(message)) {
      return { ok: false, code: 'invalid', message: 'Enter a whole percentage from 0 to 100.' };
    }
    if (/written reason is required/i.test(message)) {
      return {
        ok: false,
        code: 'invalid',
        message: 'Give a written reason. It will be kept in the audit trail.',
      };
    }
    return { ok: false, code: 'rejected', message };
  }

  return { ok: true, percent: data === null ? percent : Number(data) };
}
