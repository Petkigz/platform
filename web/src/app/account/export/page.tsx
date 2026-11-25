import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { EXPORT_ROW_LIMIT } from '@/lib/export-outcome';
import { isFlagEnabled } from '@/lib/flags';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { formatNumber } from '@/lib/i18n/format';
import { DownloadCopy, type CopyWords } from './download-copy';

export const dynamic = 'force-dynamic';

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'export');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('export.title') };
}

const NOTE = { fontSize: '0.85rem', margin: '0.35rem 0 0' } as const;
const DETAIL = { display: 'block', fontSize: '0.9rem' } as const;
const HEADING = { fontSize: '1.15rem', margin: '2rem 0 0.5rem' } as const;

/**
 * Getting your own data out, in the reader's language.
 *
 * The page is written for the person who is about to download it, which means
 * it says what is inside, what is deliberately outside, and why — before the
 * button, not in a FAQ nobody opens.
 *
 * **Twenty-seven languages have it** (`messages/export.ts`); a language held
 * for review reads it in English, whole, under `lang="en"`. Nobody who speaks
 * any of the twenty-seven has read them.
 *
 * **It asks for no copy itself.** A copy is made when a button is pressed,
 * and the link to the page that prints one is not fetched ahead of a press
 * (`prefetch={false}`): opening that page is a copy, counted and recorded.
 *
 * The two lists are sentences about `export_my_data()`. What the copy leaves
 * out is also written inside the copy, in English, by the database.
 *
 * **Posts on the two discussion boards are not in a copy**, by the owner's
 * decision of 2026-11-25: there a person writes under a username, and a file
 * that sets those posts beside their name would undo that. The copy says so
 * itself; this page says so while a board is switched on.
 */
export default async function ExportPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/export');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const [studentBoard, teacherBoard] = await Promise.all([
    isFlagEnabled(supabase, 'community.student_board').catch(() => true),
    isFlagEnabled(supabase, 'community.teacher_board').catch(() => true),
  ]);
  const boardsOpen = studentBoard || teacherBoard;

  const words: CopyWords = {
    preparing: t('export.preparing'),
    done: t('export.done'),
    unreachable: t('auth.offline'),
    reasons: {
      signed_out: t('export.signedOut'),
      limit: t('export.limit'),
      // The buttons cannot ask for another format; if one ever did, it failed.
      format: t('export.failed'),
      failed: t('export.failed'),
    },
  };

  const inside = [
    ['export.inAccount', 'export.inAccountNote'],
    ['export.inLearners', 'export.inLearnersNote'],
    ['export.inWrote', 'export.inWroteNote'],
    ['export.inGuardians', 'export.inGuardiansNote'],
    ['export.inInvited', 'export.inInvitedNote'],
    ['export.inMoney', 'export.inMoneyNote'],
    ['export.inSupport', 'export.inSupportNote'],
    ['export.inActivity', 'export.inActivityNote'],
  ] as const;
  const outside = [
    ['export.outOthers', 'export.outOthersNote'],
    ['export.outSignIn', 'export.outSignInNote'],
    ['export.outStaff', 'export.outStaffNote'],
    ['export.outFiles', 'export.outFilesNote'],
    ['export.outTokens', 'export.outTokensNote'],
    // Board posts stay out of a copy (owner decision, 2026-11-25). The line is
    // written while either board is switched on: before that there is no
    // board for it to be about. If the switches cannot be read it is written,
    // because leaving out a sentence about what a copy lacks is the worse of
    // the two mistakes.
    ...(boardsOpen ? ([['export.outBoards', 'export.outBoardsNote']] as const) : []),
  ] as const;

  return (
    <div className="page narrow" {...frame}>
      <nav className="crumbs">
        <Link href="/account">{t('auth.accountSettings')}</Link>
        <span aria-hidden>›</span>
        <span>{t('export.crumb')}</span>
      </nav>

      <div className="page-head">
        <h1>{t('export.title')}</h1>
        <p className="muted">{t('export.lede')}</p>
      </div>

      <div className="card" style={{ padding: '1.25rem' }}>
        <p className="muted" style={{ marginTop: 0 }}>
          {t('export.how')} {t('export.cap', { count: formatNumber(shown.code, EXPORT_ROW_LIMIT) })}
        </p>
        <div style={{ marginTop: '1rem', display: 'grid', gap: '0.75rem' }}>
          <div>
            <DownloadCopy
              href="/api/account/export"
              fallbackName="ayahspring-my-data.json"
              className="btn"
              label={t('export.json')}
              words={words}
            />
            <p className="muted" style={NOTE}>{t('export.jsonNote')}</p>
          </div>
          <div>
            <DownloadCopy
              href="/api/account/export?format=csv"
              fallbackName="ayahspring-my-data.csv"
              className="btn secondary"
              label={t('export.sheet')}
              words={words}
            />
            <p className="muted" style={NOTE}>{t('export.sheetNote')}</p>
          </div>
          <div>
            <Link className="btn secondary" href="/account/export/print" prefetch={false}>
              {t('export.read')}
            </Link>
            <p className="muted" style={NOTE}>{t('export.readNote')}</p>
          </div>
        </div>
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '1.25rem' }}>{t('export.english')}</p>
        <p className="muted" style={{ fontSize: '0.85rem', marginBottom: 0 }}>{t('export.audit')}</p>
      </div>

      <h2 style={HEADING}>{t('export.inHeading')}</h2>
      <div className="card">
        <ul className="lessons stacked">
          {inside.map(([name, note]) => (
            <li key={name}>
              <strong>{t(name)}</strong>
              <span className="muted" style={DETAIL}>{t(note)}</span>
            </li>
          ))}
        </ul>
      </div>

      <h2 style={HEADING}>{t('export.outHeading')}</h2>
      <div className="card">
        <ul className="lessons stacked">
          {outside.map(([name, note]) => (
            <li key={name}>
              <strong>{t(name)}</strong>
              <span className="muted" style={DETAIL}>{t(note)}</span>
            </li>
          ))}
        </ul>
      </div>

      <p className="muted" style={{ marginTop: '1.5rem', fontSize: '0.9rem' }}>{t('export.after')}</p>
      <p style={{ fontSize: '0.9rem' }}>
        <Link href="/account/restore">{t('account.dataRestoreLink')}</Link>
        {' · '}
        <Link href="/account/delete">{t('account.closeLink')}</Link>
      </p>
    </div>
  );
}
