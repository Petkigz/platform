import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Which of the things a refusal can be about. `invalid` covers three
 * sentences and `not_authorized` two, and the form says each in the reader's
 * language, so the outcome names the one it is (2026-11-28).
 */
export type RevenueShareDetail = 'percent' | 'reason' | 'long' | 'signed_out';

export type RevenueShareOutcome =
  | { ok: true; percent: number }
  | {
      ok: false;
      code: 'invalid' | 'not_authorized' | 'rejected' | 'unsure';
      message: string;
      detail?: RevenueShareDetail;
    };

export function validateRevenueShare(percent: unknown, reason: unknown): RevenueShareOutcome {
  if (typeof percent !== 'number' || !Number.isInteger(percent) || percent < 0 || percent > 100) {
    return {
      ok: false,
      code: 'invalid',
      detail: 'percent',
      message: 'Enter a whole percentage from 0 to 100.',
    };
  }
  if (typeof reason !== 'string' || reason.trim().length === 0) {
    return {
      ok: false,
      code: 'invalid',
      detail: 'reason',
      message: 'Give a written reason. It will be kept in the audit trail.',
    };
  }
  if (reason.trim().length > 500) {
    return { ok: false, code: 'invalid', detail: 'long', message: 'Keep the reason under 500 characters.' };
  }
  return { ok: true, percent };
}

/**
 * Where nought sits in each set of digits this site's languages write:
 * Arabic-Indic, Persian, Devanagari, Bengali, Tamil, Thai, Burmese, and the
 * full-width digits a Chinese keyboard gives. Every set `formatNumber()`
 * writes for a language of this site has to be here, because the field opens
 * with the figure as the page writes it; a test goes through every language
 * and every percentage. (It found Burmese missing on 2026-11-28. The
 * switchboard is not written in Burmese, so no Burmese page had the field
 * yet.)
 */
const DIGIT_ZEROS = [0x0660, 0x06f0, 0x0966, 0x09e6, 0x0be6, 0x0e50, 0x1040, 0xff10];

/**
 * What the owner typed as a percentage, read as a whole number from 0 to 100,
 * or null. Persian, Dari, Bengali and Nepali readers are shown their own
 * digits on this page, so "۴۰" and "४०" are read as 40. Nothing else is
 * forgiven: no sign, no point, no space inside, and no digit of a script that
 * is not listed above, because a guess at a number is not a number.
 */
export function readPercent(typed: string): number | null {
  let digits = '';
  for (const character of typed.trim()) {
    const point = character.codePointAt(0)!;
    if (point >= 0x30 && point <= 0x39) {
      digits += character;
      continue;
    }
    const zero = DIGIT_ZEROS.find((z) => point >= z && point <= z + 9);
    if (zero === undefined) return null;
    digits += String(point - zero);
  }
  if (!/^[0-9]{1,3}$/.test(digits)) return null;
  const value = Number(digits);
  return value <= 100 ? value : null;
}

/**
 * What the form says when the share was not saved, by name. `unsure` is not a
 * refusal: an answer that is not the API's own leaves nobody able to say
 * whether the share was saved. `refused` carries the database's own sentence,
 * which is English.
 */
export type RevenueShareRefusal = 'percent' | 'reason' | 'long' | 'notAllowed' | 'signedOut' | 'refused' | 'unsure';

export function revenueShareRefusalOf(
  status: number,
  body: unknown,
): { refusal: RevenueShareRefusal; said: string | null } {
  if (typeof body !== 'object' || body === null || (body as { ok?: unknown }).ok !== false) {
    return { refusal: 'unsure', said: null };
  }
  const { code, detail, message } = body as { code?: unknown; detail?: unknown; message?: unknown };
  if (status === 401 || detail === 'signed_out') return { refusal: 'signedOut', said: null };
  if (code === 'not_authorized') return { refusal: 'notAllowed', said: null };
  if (code === 'unsure') return { refusal: 'unsure', said: null };
  if (code === 'invalid' && (detail === 'percent' || detail === 'reason' || detail === 'long')) {
    return { refusal: detail, said: null };
  }
  const said = typeof message === 'string' && message.trim() !== '' ? message.trim() : null;
  return { refusal: 'refused', said };
}

/** Every sentence the revenue share form says, handed over by the page. */
export type RevenueShareWords = {
  title: string;
  badge: string;
  body: string;
  zero: string;
  field: string;
  reason: string;
  example: string;
  save: string;
  saving: string;
  saved: string;
  refusals: Record<RevenueShareRefusal, string>;
  /** Whether what the database wrote has to be marked as English on this page. */
  markEnglish: boolean;
};

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
      return { ok: false, code: 'not_authorized', detail: 'signed_out', message: 'Sign in first.' };
    }
    if (/between 0 and 100/i.test(message)) {
      return { ok: false, code: 'invalid', detail: 'percent', message: 'Enter a whole percentage from 0 to 100.' };
    }
    if (/written reason is required/i.test(message)) {
      return {
        ok: false,
        code: 'invalid',
        detail: 'reason',
        message: 'Give a written reason. It will be kept in the audit trail.',
      };
    }
    // No answer of the database's own (a gateway's page, a connection that
    // went): the share may have been saved and the answer lost.
    const state = String((error as { code?: string | null }).code ?? '');
    if (state === '' || state.startsWith('08')) {
      return {
        ok: false,
        code: 'unsure',
        message: 'Nobody can say whether the share was saved. Load the page again and read the figure before saving again.',
      };
    }
    return { ok: false, code: 'rejected', message };
  }

  return { ok: true, percent: data === null ? percent : Number(data) };
}
