import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';

import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { createClient } from '@/lib/supabase/server';
import {
  LOCALE_COOKIE,
  chooseLocale,
  isLocaleCode,
  localeByCode,
  translatedLocales,
  translator,
} from '@/lib/i18n';
import { SECTIONS, englishFor, sectionByPrefix, type Section } from '@/lib/translations';

export const metadata: Metadata = { title: 'Help us get a language right' };
export const dynamic = 'force-dynamic';

/**
 * The correction sheet.
 *
 * **Why this page exists.** The interface speaks fifty-one languages and not one
 * of them has been read by a native speaker. `/language` says so on every
 * catalogue, and that sentence was unchangeable: the only route from "written"
 * to "read" was somebody emailing the owner and the owner editing a TypeScript
 * file from memory. This is the missing half — a page where a person who speaks
 * the language can see the English line beside the translation and say what is
 * wrong with it.
 *
 * **No account, and none created.** The person who can fix a bad Tamil rendering
 * is exactly the person who has no reason to have an account here, and a
 * correction form behind a sign-up is a form that trades an email address for a
 * favour. So the form asks for a name and an address, says in as many words that
 * **the name will be published beside the language and the address never will
 * be**, and the email is not a login: there is no password, no confirmation
 * link, and no account at the end of it.
 *
 * **Two steps, both of them plain forms.** Choosing the language and the section
 * is a `GET` that reloads this page; submitting the corrections is a `POST` to
 * `/api/contribute`. Both work with JavaScript switched off, which matters more
 * here than anywhere: the people this page is for are the ones least likely to
 * be running the newest browser, in the languages where scripts and input
 * methods are already an obstacle.
 *
 * **The English stays on the page.** Everything below this paragraph is in the
 * language of the form rather than the reader's, and that is deliberate: the one
 * thing a correction needs beyond doubt is *which sentence is being corrected*.
 * A Sinhala reviewer needs to see what the English says, not a second translation
 * of it. The interface around this page — the navigation, the footer, the
 * language switch — is still in their language, because it is the site's frame
 * and not the sheet.
 *
 * **It is closed unless the owner opens it.** `platform.translation_reviews` is
 * off by default, because this is the only table in the schema a stranger may
 * write to and exactly one person reads the queue. When it is off the page does
 * not pretend to accept anything; it says so and gives the address.
 */
export default async function ContributePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const chosenLocale = typeof params.locale === 'string' ? params.locale : null;
  const chosenSection = typeof params.section === 'string' ? params.section : null;
  const sent = params.sent === '1';
  const errorCode = typeof params.error === 'string' ? params.error : null;

  const jar = await cookies();
  const hdrs = await headers();
  const { code } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const t = translator(code);

  // The flag first, and the page is honest when it is off rather than a form
  // that fails on submit. A database that cannot be reached is treated as a
  // closed door: this page must never imply it accepted something it did not.
  const configured = isSupabaseConfigured();
  const supabase = configured ? await createClient() : null;
  const open = supabase
    ? await isFlagEnabled(supabase, 'platform.translation_reviews').catch(() => false)
    : false;

  const languages = translatedLocales();
  const target =
    chosenLocale && isLocaleCode(chosenLocale) && chosenLocale !== 'en'
      ? localeByCode(chosenLocale)
      : undefined;
  const section: Section = sectionByPrefix(chosenSection) ?? SECTIONS[0]!;
  // The catalogue as it stands, so each box opens with the line it is
  // correcting rather than an empty rectangle: most corrections are one wrong
  // word inside a long sentence, and retyping the sentence is how a reviewer
  // gives up.
  const current = target ? translator(target.code) : null;

  const errorSentence: Record<string, string> = {
    closed: 'That form is not open at the moment. Nothing was saved.',
    language: 'That is not one of the languages this interface has. Nothing was saved.',
    name: 'Please give the name you would like printed beside the language.',
    email: 'That does not look like an email address. It is only so we can ask you a question.',
    nothing:
      'Nothing was changed, so there was nothing to send. Edit at least one line, or tick the box if you read the whole catalogue and found it right.',
    placeholder:
      'One of the lines lost a {placeholder} such as {count} or {year}. Those are filled in by the page that uses the sentence, so a translation without them would print a sentence missing its number. Nothing was saved.',
    failed: 'The submission did not reach us. Nothing was saved — please try again.',
  };

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/language">{t('language.title')}</Link>
      </p>
      <h1>Help us get a language right</h1>
      <p className="lede">
        Every language on this site was written by the people who built it, and none of
        them has been read by somebody who speaks it. If a word here looks wrong to you,
        you are the person who can fix it. You do not need an account.
      </p>

      {!open && (
        <div className="notice warn" style={{ maxWidth: '52rem' }}>
          <strong>The correction sheet is closed at the moment.</strong> Nothing is being
          accepted right now, because one person reads every submission and they would
          rather close the form than leave your correction in a queue nobody opens. If
          something is wrong badly enough to matter today, write to{' '}
          <a href="mailto:privacy@ayahspring.com">privacy@ayahspring.com</a>.
        </div>
      )}

      {open && sent && (
        <div className="notice" style={{ maxWidth: '52rem' }}>
          <strong>Thank you — that arrived.</strong> A person reads every submission
          before anything changes. If your correction is accepted, your name appears
          beside the language on the <Link href="/language">language page</Link>; your
          email address is not kept anywhere it can be read from the site.
        </div>
      )}

      {open && errorCode && (
        <div className="notice warn" style={{ maxWidth: '52rem' }}>
          <strong>{errorSentence[errorCode] ?? errorSentence.failed}</strong>
        </div>
      )}

      {/* Step one: which language, which part of it. A `GET` form, so it works
          with no JavaScript and the result is a URL somebody can send to a
          friend in the language they are fixing. */}
      <form method="get" action="/contribute" className="card" style={{ maxWidth: '52rem' }}>
        <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(14rem, 1fr))' }}>
          <div>
            <label htmlFor="locale" style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
              Which language
            </label>
            <select id="locale" name="locale" defaultValue={target?.code ?? ''} style={{ width: '100%' }}>
              {languages.map((locale) => (
                <option key={locale.code} value={locale.code}>
                  {locale.nativeName} · {locale.englishName}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="section" style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
              Which part of the site
            </label>
            <select id="section" name="section" defaultValue={section.prefix} style={{ width: '100%' }}>
              {SECTIONS.map((s) => (
                <option key={s.prefix} value={s.prefix}>
                  {s.label} ({s.keys.length})
                </option>
              ))}
            </select>
          </div>
        </div>
        <p style={{ margin: '0.9rem 0 0' }}>
          <button type="submit" className="btn secondary">
            Show me that part
          </button>
        </p>
      </form>

      {open && target && (
        <form
          method="post"
          action="/api/contribute"
          style={{ maxWidth: '52rem', marginTop: '1.5rem' }}
        >
          <input type="hidden" name="locale" value={target.code} />
          <input type="hidden" name="section" value={section.prefix} />

          <h2 style={{ marginTop: 0 }}>
            {section.label} — <span lang={target.code} dir={target.dir}>{target.nativeName}</span>
          </h2>
          <p className="muted" style={{ marginTop: 0 }}>
            The English is on the left. Change any line below into what it should say in{' '}
            {target.englishName}, and leave the rest alone. Only the lines you change are sent.
          </p>

          <div style={{ display: 'grid', gap: '1rem' }}>
            {section.keys.map((key) => {
              const english = englishFor(key) ?? '';
              return (
                <div key={key}>
                  <label htmlFor={`k-${key}`} style={{ display: 'block', marginBottom: '0.2rem' }}>
                    <code style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{key}</code>
                    <span style={{ display: 'block', fontSize: '0.92rem' }}>{english}</span>
                  </label>
                  <textarea
                    id={`k-${key}`}
                    name={`t__${key}`}
                    rows={english.length > 90 ? 3 : 2}
                    defaultValue={current ? current(key as never) : ''}
                    lang={target.code}
                    dir={target.dir}
                    style={{ width: '100%', fontFamily: 'inherit', fontSize: '0.95rem' }}
                  />
                </div>
              );
            })}
          </div>

          <h2 style={{ marginTop: '2rem' }}>Who you are</h2>
          <div style={{ display: 'grid', gap: '0.9rem', gridTemplateColumns: 'repeat(auto-fit, minmax(16rem, 1fr))' }}>
            <div>
              <label htmlFor="reviewer-name" style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                The name to print beside the language
              </label>
              <input id="reviewer-name" name="name" type="text" autoComplete="name" required style={{ width: '100%' }} />
              <p className="muted" style={{ margin: '0.3rem 0 0', fontSize: '0.82rem' }}>
                This is published if your review is accepted. A first name and a letter is enough.
              </p>
            </div>
            <div>
              <label htmlFor="reviewer-email" style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
                An address, only so we can ask you a question
              </label>
              <input id="reviewer-email" name="email" type="email" autoComplete="email" required style={{ width: '100%' }} />
              <p className="muted" style={{ margin: '0.3rem 0 0', fontSize: '0.82rem' }}>
                Never published, never granted to any screen, and not a login. No account is created.
              </p>
            </div>
          </div>

          <div style={{ marginTop: '1rem' }}>
            <label htmlFor="note" style={{ display: 'block', fontSize: '0.9rem', marginBottom: '0.3rem' }}>
              Anything else we should know (optional)
            </label>
            <textarea id="note" name="note" rows={3} style={{ width: '100%', fontFamily: 'inherit' }} />
          </div>

          <div style={{ marginTop: '1.1rem' }}>
            <label htmlFor="scope" style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
              <input id="scope" name="scope" type="checkbox" value="whole" style={{ marginTop: '0.25rem' }} />
              <span>
                I read the <strong>whole</strong> catalogue in this language, not only the part
                above. Only a whole read can make the site say the language has been read.
              </span>
            </label>
          </div>

          <p style={{ marginTop: '1.4rem' }}>
            <button type="submit" className="btn">
              Send the corrections
            </button>
          </p>
          <p className="muted" style={{ fontSize: '0.85rem' }}>
            Nothing changes on the site straight away. What you send is read by one person,
            who accepts or rejects each line, and your name appears beside the language only
            if the whole catalogue has been read.
          </p>
        </form>
      )}

      {open && !target && (
        <p className="muted" style={{ marginTop: '1rem' }}>
          Choose a language above and the sheet opens for it.
        </p>
      )}

      <p className="muted" style={{ marginTop: '2rem', maxWidth: '52rem', fontSize: '0.9rem' }}>
        Why this page is in English: it is the page where the English is the thing being
        replaced, so the sentence being corrected has to be readable without a second
        translation in the way. The rest of the site is in the language you chose.
      </p>
    </div>
  );
}
