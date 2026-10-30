import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { disciplines, fetchSubjectAreas } from '@/lib/catalogue';
import { isFlagEnabled } from '@/lib/flags';
import { frontDoorCta } from '@/lib/session';
import {
  LOCALE_COOKIE,
  chooseLocale,
  countLabel,
  directionOf,
  formatNumber,
  translator,
  type MessageKey,
} from '@/lib/i18n';

export const dynamic = 'force-dynamic';

/**
 * The front door.
 *
 * It is the one page a stranger reads before deciding whether this is for them,
 * so it is the only page allowed a display face — see `.display` in globals.css.
 *
 * **It says only what is true.** No counters ("12,000 learners"), no
 * testimonials, no logos of institutions that have not endorsed anything. The
 * platform is young, and a front page that invents its own size is the first
 * lie a careful parent catches. Everything here is a claim the database already
 * enforces: a course cannot be published without an approval from somebody
 * authorised for the subject, a child's login exists only if their guardian made
 * it, a certificate
 * carries a number that stays checkable after the course is withdrawn, and a
 * teacher's share is a recorded decision rather than a slogan.
 *
 * It also says the two limits out loud, because they are the ones a person
 * discovers too late otherwise: teaching is by appointment, and no provider
 * moves money yet.
 *
 * **It is the last page to stop being English-only, and it is now translated
 * like every other.** The sentence above — "the one page a stranger reads
 * before deciding whether this is for them" — is exactly why: a door that opens
 * in a language somebody reads only with effort has already told them the
 * product was not built for their family. The language arrives the same way it
 * does everywhere else: the cookie if they have ever chosen one, then what the
 * device asked for, then English. Nothing here needs a login to be translated,
 * which is the whole point — a stranger has no account to read a preference
 * from.
 *
 * The copy lives in `lib/i18n/messages/home-*.ts`, in all forty-one other
 * languages, and this file only holds **message keys**. Two consequences worth
 * naming, because they are the reason for the shape rather than a style choice:
 *
 *   * The step number is a value, not a word. `home.step` is a template holding
 *     `{number}`, filled with `formatNumber(locale, n)` so a reader of Arabic
 *     sees ٣ rather than 3 in a sentence that is otherwise theirs.
 *   * The subject count uses `countLabel()`, which picks the singular or plural
 *     noun per language. Swahili, isiZulu and isiXhosa do not form the plural by
 *     adding a letter, so one template with a number in front would have been
 *     wrong in precisely the languages this page was written for last.
 */

/** The three assurances, as keys. The words are in the catalogues. */
const ASSURANCES: ReadonlyArray<{ title: MessageKey; body: MessageKey }> = [
  { title: 'home.assure1Title', body: 'home.assure1Body' },
  { title: 'home.assure2Title', body: 'home.assure2Body' },
  { title: 'home.assure3Title', body: 'home.assure3Body' },
];

/** The three steps. The number beside each is generated, never written down. */
const STEPS: ReadonlyArray<{ title: MessageKey; body: MessageKey }> = [
  { title: 'home.step1Title', body: 'home.step1Body' },
  { title: 'home.step2Title', body: 'home.step2Body' },
  { title: 'home.step3Title', body: 'home.step3Body' },
];

/**
 * The two doors.
 *
 * The heading reuses `audience.child` / `audience.adult` rather than a second
 * pair of names: the catalogue's filter says "Young learners" and "Adults", and
 * a front page that called the same two things something else would be teaching
 * a vocabulary the next screen contradicts.
 */
const DOORS: ReadonlyArray<{
  href: string;
  audience: 'child' | 'adult';
  label: MessageKey;
  body: MessageKey;
}> = [
  { href: '/young', audience: 'child', label: 'audience.child', body: 'home.doorChildBody' },
  { href: '/adults', audience: 'adult', label: 'audience.adult', body: 'home.doorAdultBody' },
];

export default async function Home() {
  // The language first, because everything below is written in it. This page is
  // already dynamic — it reads the database and the session — so reading two
  // more request headers costs nothing it was not already paying.
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const t = translator(locale);

  // The arrows follow the reading direction, not the words. In Arabic a
  // right-pointing arrow at the end of a link points back at the start of the
  // line, so it reads as "go back" beside a link that goes forward.
  const forward = directionOf(locale) === 'rtl' ? '\u2190' : '\u2192';

  const configured = isSupabaseConfigured();
  const supabase = configured ? await createClient() : null;
  // Two flags, both asked here rather than inside the cards: `learning.paths`
  // decides whether a third hero button exists, and `learning.audience_sections`
  // decides whether the two doors are walkable. With that one off, `/young` and
  // `/adults` redirect to the catalogue — so linking to them from the front
  // page would be a link that refuses, which is the one thing a landing page
  // must not do.
  //
  // The session is read here too, because this page already reads the database
  // and the front door must not offer "Create a free account" to somebody who
  // has just made one. It costs one call beside three that were happening
  // anyway — which is why the landing page can do this and the About page
  // cannot: About is static on purpose, and this page is dynamic already.
  const [subjects, learningPathsEnabled, doorsOpen, user] = supabase
    ? await Promise.all([
        fetchSubjectAreas(supabase).then(disciplines),
        isFlagEnabled(supabase, 'learning.paths').catch(() => false),
        isFlagEnabled(supabase, 'learning.audience_sections').catch(() => false),
        supabase.auth.getUser().then(({ data }) => data.user).catch(() => null),
      ])
    : [[], false, false, null];

  const signedIn = user !== null;
  // The destination is still decided by `frontDoorCta` — one function answers
  // "where does this button go", so the header, the front page and the closing
  // band cannot disagree. Only the label has moved into the catalogues.
  const cta = frontDoorCta(signedIn);
  const ctaLabel = t(signedIn ? 'home.continue' : 'home.createAccount');

  return (
    <>
      <section className="hero">
        <div className="container">
          <div className="hero-grid">
            <div>
              <p className="eyebrow">{t('home.eyebrow')}</p>
              <h1 className="display">{t('home.title')}</h1>
              <p className="lede wide">{t('home.lede')}</p>

              <div className="hero-actions">
                <Link href="/catalogue" className="btn">
                  {t('home.browse')}
                </Link>
                <Link href={cta.href} className="btn secondary">
                  {ctaLabel}
                </Link>
                {learningPathsEnabled && (
                  <Link href="/paths" className="btn secondary">
                    {t('home.paths')}
                  </Link>
                )}
              </div>

              <p className="hero-note">{t('home.note')}</p>
            </div>

            {/* Labelled by its own heading rather than by a string in English:
                `aria-labelledby` is what a screen reader wants anyway, and it
                cannot drift from what is printed in the panel. */}
            <aside className="panel" aria-labelledby="home-means">
              <p className="eyebrow" style={{ marginBottom: '0.15rem' }}>
                {t('home.meansEyebrow')}
              </p>
              <h2 id="home-means">{t('home.meansTitle')}</h2>
              <ul className="assurances">
                {ASSURANCES.map((a) => (
                  <li key={a.title}>
                    <strong>{t(a.title)}</strong>
                    {t(a.body)}
                  </li>
                ))}
              </ul>
            </aside>
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container">
          <h2 style={{ marginTop: 0 }}>{t('home.studyTitle')}</h2>
          {subjects.length > 0 ? (
            <>
              <p className="lede" style={{ marginBottom: '1rem' }}>
                {countLabel(locale, subjects.length, {
                  one: 'home.studyCountOne',
                  other: 'home.studyCountOther',
                })}
              </p>
              <div className="chips" style={{ marginBottom: '1.75rem' }}>
                {subjects.map((s) => (
                  <Link
                    key={s.id}
                    href={`/catalogue?subject=${encodeURIComponent(s.code)}`}
                    className="chip"
                  >
                    {s.name}
                  </Link>
                ))}
              </div>
            </>
          ) : (
            <p className="muted" style={{ marginBottom: '1.75rem' }}>
              {t('home.studyEmpty')}
            </p>
          )}

          <div className="grid cols-2">
            {DOORS.map((door) => (
              <div key={door.href} className="card">
                <h3 style={{ marginTop: 0 }}>{t(door.label)}</h3>
                <p className="muted" style={{ margin: 0, fontSize: '0.93rem' }}>
                  {t(door.body)}
                </p>
                <p style={{ margin: '0.85rem 0 0', fontSize: '0.93rem' }}>
                  {/* Two doors only exist once they open. Until then the
                      catalogue is the way in, and it carries the same choice as
                      a filter, so the link goes where it actually lands. */}
                  {doorsOpen ? (
                    <Link href={door.href}>
                      {t('home.doorOpen')} <span aria-hidden="true">{forward}</span>
                    </Link>
                  ) : (
                    <Link href={`/catalogue?audience=${door.audience}`}>
                      {t('home.doorCatalogue')} <span aria-hidden="true">{forward}</span>
                    </Link>
                  )}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section" style={{ paddingTop: 0 }}>
        <div className="container">
          <h2 style={{ marginTop: 0 }}>{t('home.howTitle')}</h2>
          <div className="steps">
            {STEPS.map((step, i) => (
              <div key={step.title} className="step">
                <div className="n">
                  {t('home.step', { number: formatNumber(locale, i + 1) })}
                </div>
                <h3>{t(step.title)}</h3>
                <p>{t(step.body)}</p>
              </div>
            ))}
          </div>
          <p className="muted" style={{ marginTop: '1.5rem' }}>
            <Link href="/about">
              {t('home.aboutLink')} <span aria-hidden="true">{forward}</span>
            </Link>
          </p>
        </div>
      </section>

      <section className="band">
        <div className="container band-inner">
          <div>
            <p className="eyebrow">{t('home.teachEyebrow')}</p>
            <h2>{t('home.teachTitle')}</h2>
            <p>{t('home.teachBody1')}</p>
            <p>{t('home.teachBody2')}</p>
          </div>
          <div className="band-actions">
            <Link href="/teach" className="btn">
              {t('home.teachArea')}
            </Link>
            <Link href="/about" className="btn ghost">
              {t('home.teachReview')}
            </Link>
          </div>
        </div>
      </section>

      <section className="closing">
        <div className="container">
          <h2>{t('home.closingTitle')}</h2>
          <p>{t(signedIn ? 'home.closingSignedIn' : 'home.closingSignedOut')}</p>
          <div className="actions">
            <Link href="/catalogue" className="btn">
              {t('home.browse')}
            </Link>
            <Link href={cta.href} className="btn secondary">
              {ctaLabel}
            </Link>
          </div>
        </div>
      </section>

      {/* A setup note, not marketing. It appears only when this deployment has
          no database, and it sits at the bottom so it cannot be mistaken for
          the product. It stays in English on purpose: whoever reads it is the
          person who deploys this, and they are reading `.env.example`. */}
      {!configured && (
        <div className="container" style={{ paddingBottom: '2rem' }}>
          <div className="notice warn">
            <strong>Supabase is not configured.</strong> Copy <code>web/.env.example</code> to{' '}
            <code>web/.env.local</code>, set your project URL and anon key, then restart the dev
            server. The catalogue is empty until then.
          </div>
        </div>
      )}
    </>
  );
}
