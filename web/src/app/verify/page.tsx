import Link from 'next/link';
import type { Metadata } from 'next';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { normaliseCertificateNumber } from '@/lib/certificate-number';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { SAMPLE_NUMBER, WithSampleNumber } from './sample-number';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  return { locale, shown: languageShownFor(locale, 'verify') };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  const t = translator(shown.code);
  return { title: t('footer.verify'), description: t('verify.description') };
}

/**
 * Where a certificate number is typed.
 *
 * Until this page existed, verification was reachable only by a link from
 * inside the product: `/verify/AS-2026-00000001` worked, and `/verify` — the
 * address a person would actually try, holding a printed certificate and a
 * piece of paper — was a 404. The platform's loudest claim, *a certificate you
 * can still check years later*, therefore had no front door.
 *
 * The person arriving here is usually not a learner. It is an employer, a
 * school, or a parent checking somebody else's document, and they have never
 * heard of this site. So: no account, no email, no session. The number is the
 * capability (see `certificates_read`: nobody can list certificates), which is
 * exactly what makes publishing a result to an anonymous caller safe.
 *
 * A GET form, so the address is shareable and the back button behaves. A number
 * that parses is redirected to its own page — the canonical link that can be
 * copied, printed, or pasted into an email.
 *
 * **In the reader's language** since 2026-11-25 (`messages/verify.ts`). That
 * reader has no account, so the language is the one their browser asks for,
 * or the one they chose in the footer. The number is a number in every
 * language and is set left to right, in the box and in the sentences.
 */
export default async function VerifyLandingPage({
  searchParams,
}: {
  searchParams: Promise<{ number?: string }>;
}) {
  const { number } = await searchParams;
  const typed = typeof number === 'string' ? number : '';

  // A number that is a number goes to its own address, so the answer has a link
  // somebody can keep. A number that is not stays here, with the reason.
  const canonical = normaliseCertificateNumber(typed);
  if (canonical) redirect(`/verify/${encodeURIComponent(canonical)}`);

  // Anything typed that reached here is not a number.
  const problem = typed.trim().length > 0;

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  return (
    <div className="container section" style={{ maxWidth: '38rem' }} {...frame}>
      <p className="eyebrow">AyahSpring</p>
      <h1>{t('footer.verify')}</h1>
      <p className="lede">{t('verify.lede')}</p>

      <form method="get" action="/verify" className="search" style={{ marginTop: '1.5rem' }}>
        <input
          type="text"
          name="number"
          dir="ltr"
          defaultValue={typed}
          placeholder={SAMPLE_NUMBER}
          aria-label={t('verify.numberLabel')}
          autoComplete="off"
          spellCheck={false}
          autoCapitalize="characters"
        />
        <button type="submit" className="btn">{t('verify.check')}</button>
      </form>

      {problem && (
        <div className="notice warn" role="alert">
          <WithSampleNumber text={t('verify.notANumber')} />
        </div>
      )}

      <div className="card" style={{ marginTop: '1.75rem' }}>
        <h2 style={{ marginTop: 0, fontSize: '1.02rem' }}>{t('verify.where')}</h2>
        <p className="muted" style={{ marginBottom: '0.6rem' }}>
          <WithSampleNumber text={t('verify.whereBody')} />
        </p>
        <p className="muted" style={{ marginBottom: 0 }}>{t('verify.forgiving')}</p>
      </div>

      <section style={{ marginTop: '1.75rem' }}>
        <h2 style={{ fontSize: '1.02rem' }}>{t('verify.notTold')}</h2>
        <p className="muted">{t('verify.notToldBody')}</p>
      </section>

      <p style={{ marginTop: '1.75rem' }}>
        <Link href="/">{t('verify.home')}</Link>
        {' · '}
        <Link href="/catalogue">{t('home.browse')}</Link>
      </p>
    </div>
  );
}
