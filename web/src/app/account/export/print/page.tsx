import Link from 'next/link';
import { redirect } from 'next/navigation';

import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';
import { exportSections } from '@/lib/csv';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'My data, to print' };

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
 */
export default async function PrintExportPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/export/print');

  const { data, error } = await supabase.rpc('export_my_data');
  if (error) throw new Error(error.message);

  const sections = exportSections(data).filter((section) => section.rows.length > 0);
  const generatedAt =
    data && typeof data === 'object' && typeof (data as Record<string, unknown>).generatedAt === 'string'
      ? String((data as Record<string, unknown>).generatedAt)
      : null;

  return (
    <div className="page narrow">
      <nav className="crumbs">
        <Link href="/account">Account</Link>
        <span aria-hidden>›</span>
        <Link href="/account/export">Export</Link>
        <span aria-hidden>›</span>
        <span>To print</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Your account</p>
        <h1>A copy of your data</h1>
        <p className="muted">
          Print this page, or use your browser&apos;s print dialog to save it as a PDF. Nothing is
          sent anywhere to make it. {generatedAt ? `Assembled ${generatedAt}.` : ''}
        </p>
        <p>
          <a className="btn" href="/api/account/export?format=csv">Download as a spreadsheet</a>{' '}
          <a className="btn secondary" href="/api/account/export">Download as JSON</a>
        </p>
      </div>

      {sections.length === 0 ? (
        <p className="muted">There is nothing recorded against this account yet.</p>
      ) : (
        sections.map((section) => (
          <section key={section.title} className="card" style={{ marginBottom: '1rem' }}>
            <h2 style={{ marginTop: 0, textTransform: 'capitalize' }}>{section.title}</h2>
            <div className="scroll-x">
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  {section.columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      style={{ textAlign: 'left', borderBottom: '1px solid var(--border)', padding: '0.35rem' }}
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {section.rows.map((row, index) => (
                  <tr key={index}>
                    {row.map((cell, cellIndex) => (
                      <td
                        key={cellIndex}
                        style={{ borderBottom: '1px solid var(--border)', padding: '0.35rem', wordBreak: 'break-word' }}
                      >
                        {cell === '' ? <span className="muted">—</span> : cell}
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

      <p className="muted" style={{ fontSize: '0.9rem' }}>
        This is the same record the two downloads contain. What is deliberately left out, and why,
        is on <Link href="/account/export">the export page</Link>.
      </p>
    </div>
  );
}
