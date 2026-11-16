import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, companionMessagesFor, translator } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/client';
import { Counter } from './counter';

export const dynamic='force-dynamic';
export const metadata={title:'Private counter'};

export default async function CounterPage() {
  if(!isSupabaseConfigured()) redirect('/');
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/sign-in?next=/companion/counter');
  const enabled=await isFlagEnabled(supabase,'companion.dhikr_counter').catch(()=>false);
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const t = translator(locale);
  return (
    <div className="container section">
      <p className="eyebrow">{t('companion.eyebrow')}</p>
      <h1>{t('companion.counterTitle')}</h1>
      {enabled ? <>
        <p className="lede">{t('companion.counterLede')}</p>
        <p className="muted">{t('companion.counterPrivacy')}</p>
        <I18nProvider locale={locale} messages={companionMessagesFor(locale)}><Counter /></I18nProvider>
      </> : <p className="notice">{t('companion.counterOff')}</p>}
      <p style={{marginTop:'1rem'}}><Link href="/learn">{t('companion.backToLearning')}</Link></p>
    </div>
  );
}
