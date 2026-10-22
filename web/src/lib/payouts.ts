import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Asking to be paid.
 *
 * Two things this module will not do. It will not invent a destination format —
 * a Ugandan mobile-money number, a bank account and a PayPal address are three
 * different things, and the teacher writes theirs in words a human can act on.
 * And it will not report a payout as money moved: only `complete`, by finance,
 * with a provider reference, marks an earning paid.
 */

export type PayoutOutcome =
  | { ok: true; message: string; id?: string }
  | { ok: false; code: 'invalid' | 'not_authorized' | 'rejected'; message: string };

export type PayoutRequest = {
  currency: string;
  destination: string;
  acknowledgeTax: boolean;
};

const CURRENCY = /^[A-Z]{3}$/;

/**
 * The checks a person can be told about before they press the button. The
 * database enforces the same rules; this exists so the refusal arrives without
 * a round trip and in the same words.
 */
export function validatePayoutRequest(input: Partial<PayoutRequest>): PayoutOutcome {
  const currency =
    typeof input.currency === 'string' ? input.currency.trim().toUpperCase() : '';
  if (!CURRENCY.test(currency)) {
    return { ok: false, code: 'invalid', message: 'Choose the currency you want to be paid in.' };
  }

  const destination = typeof input.destination === 'string' ? input.destination.trim() : '';
  if (destination.length < 3) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Say where the money should go — a number, an account, whatever a person would need.',
    };
  }
  if (destination.length > 300) {
    return { ok: false, code: 'invalid', message: 'Keep the destination under 300 characters.' };
  }

  if (input.acknowledgeTax !== true) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Confirm that declaring this income is your own responsibility.',
    };
  }

  return { ok: true, message: 'Ready to request.' };
}

export function mapPayoutError(message: string): PayoutOutcome {
  if (/only a finance admin or platform admin/i.test(message)) {
    return {
      ok: false,
      code: 'not_authorized',
      message: 'Only a finance admin or platform admin can do that.',
    };
  }
  if (/sign in to/i.test(message)) {
    return { ok: false, code: 'not_authorized', message: 'Sign in first.' };
  }
  if (/not switched on/i.test(message)) {
    return {
      ok: false,
      code: 'not_authorized',
      message:
        'Payouts are not switched on yet. The request is built; the provider, the destination details and the tax treatment are not.',
    };
  }
  if (/already have a payout waiting/i.test(message)) {
    return {
      ok: false,
      code: 'rejected',
      message: 'You already have a payout waiting in that currency. Cancel it before asking again.',
    };
  }
  if (/nothing to pay out/i.test(message)) {
    return {
      ok: false,
      code: 'rejected',
      message: 'Nothing is payable in that currency yet — earnings inside the refund hold do not count.',
    };
  }
  if (/already (completed|failed|cancelled)/i.test(message)) {
    return { ok: false, code: 'rejected', message };
  }
  if (/written reason|say why/i.test(message)) {
    return { ok: false, code: 'invalid', message: 'Write the reason. It is kept in the audit trail.' };
  }
  return { ok: false, code: 'rejected', message };
}

export async function requestPayout(
  supabase: SupabaseClient,
  input: PayoutRequest,
): Promise<PayoutOutcome> {
  const valid = validatePayoutRequest(input);
  if (!valid.ok) return valid;

  const { data, error } = await supabase.rpc('request_instructor_payout', {
    p_currency: input.currency.trim().toUpperCase(),
    p_destination: input.destination.trim(),
    p_acknowledge_tax: true,
  });
  if (error) return mapPayoutError(error.message);

  return {
    ok: true,
    id: typeof data === 'string' ? data : undefined,
    message:
      'Requested. No money has moved — finance sees it in the queue, and the amount is whatever the ledger owes when it is paid.',
  };
}

export async function cancelPayout(
  supabase: SupabaseClient,
  payoutId: string,
): Promise<PayoutOutcome> {
  if (!payoutId) return { ok: false, code: 'invalid', message: 'No payout was chosen.' };
  const { error } = await supabase.rpc('cancel_instructor_payout', { p_payout_id: payoutId });
  if (error) return mapPayoutError(error.message);
  return { ok: true, message: 'Cancelled. Nothing had moved, so nothing is reversed.' };
}

export async function completePayout(
  supabase: SupabaseClient,
  input: { payoutId: string; provider: string; reference: string },
): Promise<PayoutOutcome> {
  const provider = input.provider?.trim() ?? '';
  const reference = input.reference?.trim() ?? '';
  if (provider.length < 2 || reference.length < 2) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Record the provider and the reference it sent under, or the payment cannot be checked later.',
    };
  }

  const { data, error } = await supabase.rpc('complete_instructor_payout', {
    p_payout_id: input.payoutId,
    p_provider: provider,
    p_provider_reference: reference,
  });
  if (error) return mapPayoutError(error.message);

  const row = data as { amountMinor?: string; entries?: number } | null;
  return {
    ok: true,
    message: row?.amountMinor
      ? `Recorded as paid: ${row.amountMinor} minor units across ${row.entries ?? 0} earning(s).`
      : 'Recorded as paid.',
  };
}

export async function failPayout(
  supabase: SupabaseClient,
  input: { payoutId: string; reason: string },
): Promise<PayoutOutcome> {
  const reason = input.reason?.trim() ?? '';
  if (reason.length < 3) {
    return { ok: false, code: 'invalid', message: 'Write why it failed. The teacher will read it.' };
  }
  const { error } = await supabase.rpc('fail_instructor_payout', {
    p_payout_id: input.payoutId,
    p_reason: reason,
  });
  if (error) return mapPayoutError(error.message);
  return { ok: true, message: 'Marked failed. The earnings are still owed.' };
}

export async function setPayoutPolicy(
  supabase: SupabaseClient,
  input: { holdDays: number; reason: string },
): Promise<PayoutOutcome> {
  if (!Number.isInteger(input.holdDays) || input.holdDays < 0 || input.holdDays > 365) {
    return { ok: false, code: 'invalid', message: 'Choose a hold between 0 and 365 days.' };
  }
  const reason = input.reason?.trim() ?? '';
  if (reason.length === 0) {
    return {
      ok: false,
      code: 'invalid',
      message: 'Give a written reason. It is kept in the audit trail.',
    };
  }
  const { error } = await supabase.rpc('set_payout_policy', {
    p_hold_days: input.holdDays,
    p_reason: reason,
  });
  if (error) return mapPayoutError(error.message);
  return { ok: true, message: `New earnings now wait ${input.holdDays} day(s) before they can be requested.` };
}

/** What a status means, in a sentence rather than a word. */
export function describePayoutStatus(status: string): string {
  switch (status) {
    case 'scheduled':
      return 'Waiting for finance';
    case 'processing':
      return 'Being sent';
    case 'completed':
      return 'Paid';
    case 'failed':
      return 'Did not go through';
    case 'cancelled':
      return 'Cancelled';
    default:
      return status;
  }
}
