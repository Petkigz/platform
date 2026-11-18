import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { Say } from '@/components/say';
import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { exportSections } from '@/lib/csv';
import { exportCodeOf, exportListsCut, type ExportCode } from '@/lib/export-outcome';
import { LOCALE_COOKIE, chooseLocale, languageShownFor, translator } from '@/lib/i18n';
import { formatDateTime } from '@/lib/i18n/format';
import { DownloadCopy, type CopyWords } from '../download-copy';

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
  return { title: translator(shown.code)('export.printTitle') };
}

const CELL = { borderBottom: '1px solid var(--border)', padding: '0.35rem' } as const;

/**
 * The same record, as a page you can print.
 *
 * A PDF without a PDF library and without a server: the browser already has a
 * print dialog, and every phone and desktop can "save as PDF" from it. The
 * alternative — pulling a rendering dependency into the app to draw tables the
 * browser draws anyway — would be a large amount of code for a worse result.
 *
 * It is the *same* `export_my_data()` document as the JSON and the CSV, rendered
 * rather than flattened. A third view of one answer, never a third answer.
 *
 * **Opening it is a copy.** It counts as one of the ten an hour and is written
 * to the audit trail, and the page says so. Nothing links here with a
 * prefetch, so a copy is made by a press and not by a glance.
 *
 * **What is translated and what is not.** The page around the tables is in the
 * reader's language. The names of the sections and columns are the names the
 * records are stored under, the same ones the two files carry, so they are
 * printed as they are and marked as English. A cell is whatever was written:
 * a `<bdi>` lets an Arabic name and an English one each read their own way.
 *
 * A refusal is said in place of the tables. It used to be thrown, which sent
 * the eleventh view in an hour to the page for a page that broke.
 */
export default async function PrintExportPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/export/print');

  let data: unknown = null;
  let refused: ExportCode | null = null;
  try {
    const answer = await supabase.rpc('export_my_data');
    if (answer.error) refused = exportCodeOf(answer.error);
    else if (typeof answer.data !== 'object' || answer.data === null) refused = 'failed';
    else data = answer.data;
  } catch {
    refused = 'failed';
  }
  if (refused === 'signed_out') redirect('/sign-in?next=/account/export/print');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  // The names inside the copy are English whatever the page is. They are
  // isolated rather than given a direction of their own, so a heading still
  // starts where the page's other headings start.
  const english = shown.code !== 'en' ? ({ lang: 'en' } as const) : {};

  const sections = exportSections(data).filter((section) => section.rows.length > 0);
  const stamp = (data as Record<string, unknown> | null)?.generatedAt;
  // The server does not know the reader's clock, so the zone is printed.
  const made = typeof stamp === 'string' ? formatDateTime(shown.code, stamp, 'UTC') : '';
  const cut = exportListsCut(data);

  const words: CopyWords = {
    preparing: t('export.preparing'),
    done: t('export.done'),
    unreachable: t('auth.offline'),
    reasons: {
      signed_out: t('export.signedOut'),
      limit: t('export.limit'),
      format: t('export.failed'),
      failed: t('export.failed'),
    },
  };

  return (
    <div className="page narrow export-print-page" {...frame}>
      <nav className="crumbs no-print">
        <Link href="/account">{t('auth.accountSettings')}</Link>
        <span aria-hidden>›</span>
        <Link href="/account/export">{t('export.crumb')}</Link>
        <span aria-hidden>›</span>
        <span>{t('export.printCrumb')}</span>
      </nav>

      <div className="page-head">
        <h1>{t('export.printTitle')}</h1>
        {made && (
          <p className="muted">
            <Say text={t('export.printMade')} parts={{ when: <bdi>{made}</bdi> }} />
          </p>
        )}
        {!refused && <p className="muted no-print">{t('export.printLede')}</p>}
      </div>

      {refused ? (
        <p className="notice error" role="alert">
          {t(refused === 'limit' ? 'export.limit' : 'export.failed')}
        </p>
      ) : (
        <>
          <p className="muted no-print" style={{ fontSize: '0.9rem' }}>{t('export.printCounts')}</p>
          <div className="page-actions no-print" style={{ marginTop: '1rem', marginBottom: '1.5rem' }}>
            <DownloadCopy
              href="/api/account/export?format=csv"
              fallbackName="ayahspring-my-data.csv"
              className="btn"
              label={t('export.printSheet')}
              words={words}
            />
            <DownloadCopy
              href="/api/account/export"
              fallbackName="ayahspring-my-data.json"
              className="btn secondary"
              label={t('export.printJson')}
              words={words}
            />
          </div>

          {cut.length > 0 && (
            <p className="notice warn">
              <Say
                text={t('export.printCut')}
                parts={{ lists: <bdi {...english}>{cut.join(', ')}</bdi> }}
              />
            </p>
          )}
          {shown.code !== 'en' && sections.length > 0 && (
            <p className="muted" style={{ fontSize: '0.9rem' }}>{t('export.english')}</p>
          )}

          {sections.length === 0 ? (
            <p className="muted">{t('export.printEmpty')}</p>
          ) : (
            sections.map((section) => (
              <section key={section.title} className="card" style={{ marginBottom: '1rem' }}>
                <h2 style={{ marginTop: 0 }}>
                  <bdi {...english}>{section.title}</bdi>
                </h2>
                <div className="scroll-x">
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr>
                        {section.columns.map((column) => (
                          <th key={column} scope="col" style={{ ...CELL, textAlign: 'start' }}>
                            <bdi {...english}>{column}</bdi>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {section.rows.map((row, index) => (
                        <tr key={index}>
                          {row.map((cell, cellIndex) => (
                            <td key={cellIndex} style={{ ...CELL, textAlign: 'start', overflowWrap: 'anywhere' }}>
                              {cell === '' ? <span className="muted">—</span> : <bdi>{cell}</bdi>}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            ))
          )}
          <p className="muted no-print" style={{ fontSize: '0.9rem' }}>{t('export.printSame')}</p>
        </>
      )}

      <p className="no-print">
        <Link href="/account/export">{t('export.printBack')}</Link>
      </p>
    </div>
  );
}
