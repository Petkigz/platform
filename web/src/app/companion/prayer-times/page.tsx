import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, companionMessagesFor, languageShownFor, translator } from '@/lib/i18n';
import { I18nProvider } from '@/lib/i18n/client';
import { PrayerTimesTool } from './tool';

export const dynamic='force-dynamic';
// The tab's title in the language the heading is in. It was a fixed English
// string, so a reader in Arabic had an Arabic page under an English tab — and
// the title is what a screen reader announces first and a history list keeps.
// No new sentence: it is the page's own heading. Where this language's
// companion text is held for review, both are English together.
export async function generateMetadata(): Promise<Metadata> {
  const jar = await cookies();
  const hdrs = await headers();
  const { code } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { title: translator(code)('companion.prayerTitle') };
}
export default async function Page() {
  if(!isSupabaseConfigured()) redirect('/');
  const supabase=await createClient();
  const {data:{user}}=await supabase.auth.getUser();
  if(!user) redirect('/sign-in?next=/companion/prayer-times');
  const enabled=await isFlagEnabled(supabase,'companion.calculated_prayer_times').catch(()=>false);
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const t = translator(locale);
  // English and left-to-right while this language's companion text is held for
  // review; the reader's own language and direction otherwise.
  const shown = languageShownFor(locale, 'companion');
  return <div className="container section companion-page" lang={shown.code} dir={shown.dir}>
    <div className="companion-head"><p className="eyebrow">{t('companion.eyebrow')}</p><h1>{t('companion.prayerTitle')}</h1></div>
    {enabled ? <I18nProvider locale={locale} messages={companionMessagesFor(locale)}><PrayerTimesTool /></I18nProvider> : <p className="notice">{t('companion.prayerOff')}</p>}
    <p className="companion-back"><Link href="/learn">{t('companion.backToLearning')}</Link></p>
  </div>;
}
