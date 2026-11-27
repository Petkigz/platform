import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { Say } from '@/components/say';
import { PRIVACY_CONTACT } from '@/lib/erase-outcome';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { EraseAccount } from './erase-form';

export const dynamic = 'force-dynamic';

/** The address, kept left to right inside a sentence that may run the other way. */
const contact = <bdi dir="ltr">{PRIVACY_CONTACT}</bdi>;

/**
 * What a closed learner's certificate says in place of the name.
 *
 * It is the string `erase_my_account()` writes, so it is printed as it will be
 * seen, in English, whatever language is around it.
 */
const holderLabel = (
  <bdi lang="en" dir="ltr">
    “Deleted learner”
  </bdi>
);

const LIST = { paddingInlineStart: '1.1rem' } as const;

/**
 * Closing an account, in the reader's language.
 *
 * The page exists so the decision is made with the facts in front of it: what
 * goes, what stays, and why the two lists are not the same. A person who reads
 * this and still wants it closed is taken at their word.
 *
 * Some records are changed immediately while others remain, and neither a
 * scheduled job nor a manual storage step is proof of physical deletion.
 *
 * **Twenty-seven languages have it** (`messages/close.ts`); a language held
 * for review reads it in English, whole, under `lang="en"` — the same rule as
 * the account page. Nobody who speaks any of the twenty-seven has read them,
 * and this is the page where a wrong sentence promises a deletion that does
 * not happen. Every hedge in the English ("can remain", "is not proof") has a
 * counterpart in each language; `lib/account.test.ts` holds the English ones.
 *
 * The form is drawn in the browser and is handed its words, so none of this
 * is in the script every page carries.
 */
export default async function DeleteAccountPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/delete');

  const { data, error } = await supabase
    .from('user_profiles')
    .select('display_name, account_status, deleted_at')
    .eq('user_id', user.id)
    .maybeSingle();
  // A profile that could not be read is not an account with no profile: the
  // site's error page, not a silent return to the dashboard.
  if (error) throw new Error(error.message);

  if (!data) redirect('/learn');
  const profile = data as unknown as {
    display_name: string | null;
    account_status: string;
    deleted_at: string | null;
  };
  const closed = profile.deleted_at !== null || profile.account_status === 'closed';

  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'close');
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  // An address or a number, never a word: an account with neither is not
  // "unknown", it is simply not named in the sentence.
  const who = user.email ?? user.phone ?? null;

  return (
    <div className="container section" style={{ maxWidth: '46rem' }} {...frame}>
      <p className="eyebrow">
        <Link href="/account">{t('auth.accountSettings')}</Link>
      </p>
      <h1>{t('close.title')}</h1>

      {closed ? (
        <div className="card">
          <p className="empty" style={{ marginBottom: '0.5rem' }}>
            {t('close.already')}
          </p>
          <p className="muted" style={{ margin: 0 }}>
            {t('close.alreadyNote')}
          </p>
        </div>
      ) : (
        <>
          <p className="lede" style={{ maxWidth: 'none' }}>
            {who ? (
              <Say
                text={t('close.lede')}
                parts={{ who: <strong><bdi dir="ltr">{who}</bdi></strong> }}
              />
            ) : (
              t('close.ledeUnnamed')
            )}
          </p>

          <div className="grid cols-2" style={{ marginTop: '1rem' }}>
            <section className="card">
              <h2 style={{ marginTop: 0 }}>{t('close.goesHeading')}</h2>
              <ul className="muted" style={LIST}>
                <li>{t('close.goesProfile')}</li>
                <li>{t('close.goesNotes')}</li>
                <li>{t('close.goesSaved')}</li>
                <li>{t('close.goesReviews')}</li>
                <li>{t('close.goesAnswers')}</li>
                <li>{t('close.goesSharing')}</li>
                <li>{t('close.goesMessages')}</li>
                <li>
                  <Say text={t('close.goesAppointment')} parts={{ contact }} />
                </li>
                <li>
                  <Say text={t('close.goesChildren')} parts={{ contact }} />
                </li>
              </ul>
            </section>
            <section className="card">
              <h2 style={{ marginTop: 0 }}>{t('close.staysHeading')}</h2>
              <ul className="muted" style={LIST}>
                <li>{t('close.staysMoney')}</li>
                <li>{t('close.staysProgress')}</li>
                <li>{t('close.staysCertificates')}</li>
                <li>{t('close.staysSupport')}</li>
                <li>{t('close.staysAudit')}</li>
                <li>{t('close.staysFingerprint')}</li>
              </ul>
              <p className="muted" style={{ marginBottom: 0 }}>
                <Say text={t('close.staysHolder')} parts={{ label: holderLabel }} />
              </p>
            </section>
          </div>

          <section className="card" style={{ marginTop: '1rem' }}>
            <h2 style={{ marginTop: 0 }}>{t('close.undoHeading')}</h2>
            <p className="muted">{t('close.undoSessions')}</p>
            <p className="muted">
              <strong>{t('close.undoSignInLead')}</strong> {t('close.undoSignIn')}
            </p>
            <EraseAccount
              displayName={profile.display_name ?? ''}
              words={{
                confirmLabel: t('close.confirmLabel'),
                confirmNote: t('close.confirmNote'),
                nameless: t('close.nameless'),
                button: t('close.button'),
                closing: t('close.closing'),
                keep: t('close.keep'),
                reasons: {
                  signed_out: t('close.signedOut'),
                  no_account: t('close.noAccount'),
                  name_missing: t('close.nameMissing'),
                  name_mismatch: t('close.nameMismatch'),
                  teaching: t('close.teaching'),
                  board: t('close.board'),
                  held: t('close.held'),
                  appointment: t('close.appointment'),
                  refused: t('close.refused'),
                  unconfirmed: t('close.unconfirmed'),
                },
              }}
            />
          </section>
        </>
      )}
    </div>
  );
}
