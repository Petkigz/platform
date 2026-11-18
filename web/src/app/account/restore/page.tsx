import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { RESTORE_NEVER } from '@/lib/restore-outcome';
import { RestoreForm, type RestoreWords } from './restore-form';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'restore');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('restore.title') };
}

const DETAIL = { display: 'block', fontSize: '0.9rem' } as const;
const HEADING = { fontSize: '1.15rem', margin: '2rem 0 0.5rem' } as const;

/** How the name of the file the export page downloads begins, whichever name it was given. */
const FILE_START = 'ayahspring-';

/**
 * Putting an export back, in the reader's language.
 *
 * The page is written for somebody holding a file and hoping: they left, or
 * they are on a new account, and the question is what of it can come back. The
 * honest answer is on the page before the button (their own words come back,
 * and the platform's record of them does not), because a person who finds that
 * out afterwards has been misled by a screen that stayed silent.
 *
 * **Twenty-seven languages have it** (`messages/restore.ts`); a language held
 * for review reads it in English, whole, under `lang="en"`. Nobody who speaks
 * any of the twenty-seven has read them.
 *
 * **The second list is this page's own.** `restore_my_data()` returns nine
 * things it never puts back, in English, inside its report. They are said
 * here as seven, before a file is chosen, and the report's copy is not shown.
 * The function is still the authority: `lib/restore-outcome.test.ts` reads
 * the nine out of the migration and fails if one has no sentence here.
 */
export default async function RestorePage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/restore');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const words: RestoreWords = {
    locale: shown.code,
    fileLabel: t('restore.fileLabel'),
    fileHint: t('restore.fileHint'),
    fileStart: FILE_START,
    check: t('restore.check'),
    checking: t('restore.checking'),
    another: t('restore.another'),
    apply: t('restore.apply'),
    applying: t('restore.applying'),
    different: t('restore.different'),
    errors: {
      signed_out: t('restore.errSignedOut'),
      too_large: t('restore.errLarge'),
      not_json: t('restore.errNotJson'),
      not_export: t('restore.errNotExport'),
      newer: t('restore.errNewer'),
      refused: t('restore.errRefused'),
      failed: t('restore.errCheckFailed'),
    },
    unconfirmed: t('restore.unconfirmed'),
    headings: {
      check: t('restore.resultCheck'),
      applied: t('restore.resultApplied'),
      all_here: t('restore.resultAllHere'),
      nothing: t('restore.resultNothing'),
    },
    lineNotes: t('restore.lineNotes'),
    lineMarks: t('restore.lineMarks'),
    lineHere: t('restore.lineHere'),
    lineProfile: t('restore.lineProfile'),
    profile: t('restore.canProfile'),
    fields: {
      displayName: t('account.formName'),
      preferredLanguage: t('account.formLanguage'),
      timezone: t('account.formZone'),
      countryCode: t('restore.fieldCountry'),
    },
    skippedHeading: t('restore.skippedHeading'),
    whereEntry: t('restore.whereEntry'),
    why: {
      name_blank: t('restore.whyNameBlank'),
      name_long: t('restore.whyNameLong'),
      language: t('restore.whyLanguage'),
      timezone: t('restore.whyTimezone'),
      country: t('restore.whyCountry'),
      not_list: t('restore.whyNotList'),
      capped: t('restore.whyCapped'),
      off: t('restore.whyOff'),
      note_empty: t('restore.whyNoteEmpty'),
      note_long: t('restore.whyNoteLong'),
      no_lesson: t('restore.whyNoLesson'),
      not_enrolled: t('restore.whyNotEnrolled'),
      ambiguous: t('restore.whyAmbiguous'),
      differs: t('restore.whyDiffers'),
      no_access: t('restore.whyNoAccess'),
      other: t('restore.whyOther'),
    },
    nothingWritten: t('restore.nothingWritten'),
    afterApplied: t('restore.afterApplied'),
  };

  const can = [
    ['restore.canProfile', 'restore.canProfileNote'],
    ['restore.canNotes', 'restore.canNotesNote'],
  ] as const;
  const never = RESTORE_NEVER.map(
    (name) => [`restore.cannot${name}`, `restore.cannot${name}Note`] as const,
  );

  return (
    <div className="page narrow" {...frame}>
      <nav className="crumbs">
        <Link href="/account">{t('auth.accountSettings')}</Link>
        <span aria-hidden>›</span>
        <span>{t('restore.crumb')}</span>
      </nav>

      <div className="page-head">
        <h1>{t('restore.title')}</h1>
        <p className="muted">{t('restore.lede')}</p>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <RestoreForm words={words} />
        <p className="muted" style={{ fontSize: '0.85rem', margin: '1.25rem 0 0' }}>{t('restore.foot')}</p>
      </div>

      <h2 style={HEADING}>{t('restore.canHeading')}</h2>
      <div className="card">
        <ul className="lessons stacked">
          {can.map(([name, note]) => (
            <li key={name}>
              <strong>{t(name)}</strong>
              <span className="muted" style={DETAIL}>{t(note)}</span>
            </li>
          ))}
        </ul>
      </div>

      <h2 style={HEADING}>{t('restore.cannotHeading')}</h2>
      <div className="card">
        <ul className="lessons stacked">
          {never.map(([name, note]) => (
            <li key={name}>
              <strong>{t(name)}</strong>
              <span className="muted" style={DETAIL}>{t(note)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>
        <Link href="/account/export">{t('export.title')}</Link>
        {' · '}
        <Link href="/verify">{t('footer.verify')}</Link>
      </p>
    </div>
  );
}
