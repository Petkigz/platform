import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { validateInvitationToken } from '@/lib/sharing';
import { AcceptInvitationForm, type AcceptWords } from './accept-form';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'share');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  // A link to accept something is not a page for a search engine to keep.
  return { title: translator(shown.code)('share.acTitle'), robots: { index: false, follow: false } };
}

/**
 * Opening an invitation, in the reader's language.
 *
 * The page knows nothing about who sent the invitation or what it covers:
 * those live behind the token, which the database matches by hash and only
 * for the address it was sent to. So this page asks the signed-in person to
 * accept, and whether they may is decided by `accept_learning_share()`.
 *
 * Accepting is a button and not a page load on purpose. Mail clients and
 * security scanners open links before a person does, and a GET that granted
 * access would let them accept on somebody else's behalf.
 *
 * **Twenty-seven languages have it** (`messages/share.ts`); a language held
 * for review reads it in English, whole, under `lang="en"`.
 *
 * **Every refusal is this screen's sentence.** A link that is not a token is
 * said as that here; what the database refuses is read as a name
 * (`lib/sharing-outcome.ts`) and said by the button from the words below.
 */
export default async function AcceptInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { token } = await params;
  // Next hands back the segment percent-encoded. A malformed escape is not a
  // crash; it is simply not a token, and the validator below says so.
  const decoded = (() => {
    try {
      return decodeURIComponent(token);
    } catch {
      return token;
    }
  })();
  const checked = validateInvitationToken(decoded);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect(`/sign-in?next=${encodeURIComponent(`/share/invite/${token}`)}`);
  }

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const enabled = await isFlagEnabled(supabase, 'family.adult_shares').catch(() => false);
  const address = user.email ?? user.phone ?? '';

  const words: AcceptWords = {
    accept: t('share.acAccept'),
    accepting: t('share.acAccepting'),
    errors: {
      signed_out: t('merge.errSignedOut'),
      off: t('share.acOff'),
      link: t('share.acBadLink'),
      no_invitation: t('share.acErrNone'),
      used: t('share.acErrUsed'),
      withdrawn: t('share.acErrWithdrawn'),
      expired: t('share.acErrExpired'),
      other_address: t('share.acErrOther'),
      have_it: t('share.acErrHaveIt'),
      refused: t('merge.errRefused'),
    },
    unconfirmed: t('merge.unconfirmed'),
  };

  return (
    <div className="container section" {...frame}>
      <p className="eyebrow">
        <Link href="/account/sharing">{t('account.shareHeading')}</Link>
      </p>
      <h1>{t('share.acTitle')}</h1>

      {!checked.ok ? (
        <div className="notice error" role="alert">
          {t('share.acBadLink')}
        </div>
      ) : !enabled ? (
        <div className="notice warn">{t('share.acOff')}</div>
      ) : (
        <>
          <p className="lede" style={{ maxWidth: '42rem' }}>
            {t('share.acLede')}
          </p>

          <div className="notice" style={{ maxWidth: '42rem', marginBottom: '1rem' }}>
            {address !== '' && (
              <>
                <Say
                  text={t('share.acSignedIn')}
                  parts={{
                    address: (
                      <strong>
                        <bdi dir="ltr">{address}</bdi>
                      </strong>
                    ),
                  }}
                />{' '}
              </>
            )}
            {t('share.acAddressRule')}
          </div>

          <AcceptInvitationForm token={checked.value} words={words} />
        </>
      )}
    </div>
  );
}
