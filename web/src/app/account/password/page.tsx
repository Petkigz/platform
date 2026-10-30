import Link from 'next/link';
import { redirect } from 'next/navigation';
import { cookies, headers } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, translator } from '@/lib/i18n';
import { PasswordForm } from '../password-form';

export const dynamic = 'force-dynamic';

/**
 * Choose a new password, at the end of a reset link.
 *
 * The whole journey is translated, not just its first step: somebody who asked
 * for a link in Luganda and then landed on an English page would conclude the
 * reset had failed. The page is a server component for the same reason the sign-in
 * page is — the language is in the HTML the first time, not swapped in later.
 *
 * The eyebrow says where this form sits, because a person who followed a link
 * from an inbox has no idea they are inside account settings.
 */
export default async function UpdatePasswordPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/password');

  const jar = await cookies();
  const hdrs = await headers();
  const { code } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const t = translator(code);

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/account">{t('auth.accountSettings')}</Link></p>
      <h1>{t('auth.chooseTitle')}</h1>
      <p className="lede">{t('auth.chooseLede')}</p>
      <PasswordForm />
    </div>
  );
}
