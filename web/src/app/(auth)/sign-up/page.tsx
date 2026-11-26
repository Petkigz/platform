import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { formatNumber, translator } from '@/lib/i18n';
import { readerLanguage } from '@/app/policies/reader';
import { SignUpForm, type SignUpAgreement } from './sign-up-form';

export const dynamic = 'force-dynamic';

/** The two documents an account agrees to when it is made. */
const ASKED = ['terms', 'privacy'] as const;

/**
 * Create an account.
 *
 * With Google there is no separate sign-up: the provider creates the account on
 * first arrival, which is why the same button does the same thing on both
 * screens. It is only drawn when the provider is configured.
 *
 * **Nobody makes an account without agreeing** (the owner, 2026-11-26). The
 * form has a box to tick that names the terms and the privacy notice, each a
 * link to the document with the version in force, and none of the three ways
 * in (email, telephone, Google) goes ahead without it. The agreement itself
 * is recorded once there is an account to record it against: see
 * `SIGNUP_KEY` in `lib/policy-notice.ts`. When the register cannot be read
 * the box is still there and links to the list of documents; nothing is
 * kept to record then, and the account page asks.
 */
export default async function SignUpPage() {
  let googleEnabled = false;
  const { shown } = await readerLanguage();
  const t = translator(shown.code);
  const documents: SignUpAgreement['documents'] = [];

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    googleEnabled = await isFlagEnabled(supabase, 'auth.google_sign_in').catch(() => false);
    const live = await supabase.rpc('policies_in_force').then(
      (r) => r,
      () => ({ data: null, error: { message: 'the request could not be made' } }),
    );
    const rows: unknown[] = !live.error && Array.isArray(live.data) ? live.data : [];
    if (live.error) console.error('sign-up: the documents in force could not be read:', live.error.message);
    for (const slug of ASKED) {
      const row = rows.find((r) => r !== null && typeof r === 'object' && (r as { slug?: unknown }).slug === slug) as
        | { title?: unknown; versionNumber?: unknown }
        | undefined;
      if (!row || typeof row.title !== 'string' || !row.title) continue;
      if (typeof row.versionNumber !== 'number' || !Number.isInteger(row.versionNumber) || row.versionNumber < 1) continue;
      documents.push({
        slug,
        title: row.title,
        version: row.versionNumber,
        versionLine: t('policy.versionNo', { number: formatNumber(shown.code, row.versionNumber) }),
      });
    }
  }

  return (
    <SignUpForm
      googleEnabled={googleEnabled}
      agreement={{
        // Both or neither: an agreement to one of the two is not what the box says.
        documents: documents.length === ASKED.length ? documents : [],
        box: t('board.agreeBox'),
        tick: t('board.agreeTick'),
        all: t('footer.terms'),
      }}
    />
  );
}
