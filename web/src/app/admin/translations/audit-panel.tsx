import Link from 'next/link';

import { translator, type LocaleCode } from '@/lib/i18n';
import {
  AUDIT_LIMITS,
  auditHeadline,
  type AuditSummary,
  type Finding,
  type FindingKind,
} from '@/lib/translation-audit';
import { englishFor, sectionByPrefix } from '@/lib/translations';

/**
 * What a machine can see in the catalogues, and what it cannot.
 *
 * The panel exists because the owner's real problem is not knowing *whether* the
 * translations are good — it is that nine thousand six hundred strings is too
 * many to look at, so nobody looks at any of them. This narrows it to sixteen
 * lines worth a second look, and says in the same breath that sixteen is not the
 * same as "the rest are fine".
 *
 * A server component, deliberately: the section list and the catalogues are
 * already on the server, and a client component that imported them would ship
 * every language to the browser to render a table of counts.
 */

const KIND_SENTENCE: Record<FindingKind, string> = {
  'same-as-english': 'says exactly what the English says',
  'latin-word': 'has a word in Latin letters',
  'foreign-script': 'has a character from another script',
  placeholder: 'would print with a number missing',
  blank: 'is empty',
  missing: 'has never been translated',
};

const KIND_ORDER: FindingKind[] = [
  'placeholder',
  'blank',
  'missing',
  'foreign-script',
  'latin-word',
  'same-as-english',
];

function SheetLink({ locale, finding }: { locale: string; finding: Finding }) {
  const section = sectionByPrefix(finding.key.split('.')[0]);
  if (!section) return null;
  return (
    <Link
      href={`/contribute?locale=${locale}&section=${section.prefix}`}
      style={{ fontSize: '0.82rem' }}
    >
      open it on the sheet
    </Link>
  );
}

export function AuditPanel({ summaries }: { summaries: AuditSummary[] }) {
  const total = summaries.reduce((sum, summary) => sum + summary.total, 0);

  return (
    <section className="card" style={{ marginBottom: '1.5rem' }}>
      <h2 style={{ marginTop: 0, marginBottom: '0.4rem' }}>What a machine can see</h2>
      <p style={{ marginTop: 0 }}>
        {total === 0
          ? 'Nothing mechanical is wrong in any of the fifty-one catalogues.'
          : auditHeadline(summaries)}{' '}
        Every other line is English that somebody rewrote, and whether it says the right thing
        is a question only a speaker of the language can answer — which is what{' '}
        <Link href="/contribute">the sheet</Link> is for.
      </p>

      {total > 0 && (
        <>
          <div className="scroll-x">
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'start', padding: '0.3rem 0', fontWeight: 600 }}>Language</th>
                {KIND_ORDER.filter((kind) =>
                  summaries.some((summary) => summary.counts[kind] > 0),
                ).map((kind) => (
                  <th
                    key={kind}
                    style={{ textAlign: 'end', padding: '0.3rem 0', fontWeight: 600 }}
                    title={KIND_SENTENCE[kind]}
                  >
                    {kind === 'same-as-english'
                      ? 'same as English'
                      : kind === 'latin-word'
                        ? 'Latin word'
                        : kind === 'foreign-script'
                          ? 'other script'
                          : kind === 'placeholder'
                            ? 'placeholder'
                            : kind === 'missing'
                              ? 'untranslated'
                              : 'blank'}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {summaries.map((summary) => (
                <tr key={summary.locale} style={{ borderTop: '1px solid var(--border, #e4e4e0)' }}>
                  <td style={{ padding: '0.35rem 0' }}>
                    {summary.englishName}{' '}
                    <span className="muted" style={{ fontSize: '0.8rem' }}>
                      {summary.locale}
                    </span>
                  </td>
                  {KIND_ORDER.filter((kind) =>
                    summaries.some((s) => s.counts[kind] > 0),
                  ).map((kind) => (
                    <td
                      key={kind}
                      style={{
                        textAlign: 'end',
                        padding: '0.35rem 0',
                        color: summary.counts[kind] === 0 ? 'var(--muted)' : undefined,
                      }}
                    >
                      {summary.counts[kind] > 0 ? summary.counts[kind] : '·'}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          </div>

          {/* The lines themselves, behind a disclosure. A panel that printed all
              sixteen on every visit would become a wall, and a wall is what this
              was built to replace. */}
          <details style={{ marginTop: '0.9rem' }}>
            <summary style={{ cursor: 'pointer', fontSize: '0.9rem' }}>
              Show the {total} line{total === 1 ? '' : 's'}
            </summary>
            <div style={{ display: 'grid', gap: '1rem', marginTop: '0.8rem' }}>
              {summaries.map((summary) => {
                const t = translator(summary.locale as LocaleCode);
                return (
                  <div key={summary.locale}>
                    <p style={{ margin: '0 0 0.3rem', fontWeight: 600 }}>
                      {summary.englishName}{' '}
                      <span className="muted" style={{ fontWeight: 400, fontSize: '0.82rem' }}>
                        {summary.total} of 192
                      </span>
                    </p>
                    <ul style={{ margin: 0, paddingInlineStart: '1.1rem', fontSize: '0.88rem' }}>
                      {summary.findings.map((finding) => {
                        const key = finding.key;
                        const english = englishFor(key) ?? '';
                        const current = t(key as never);
                        return (
                          <li key={`${summary.locale}-${finding.kind}-${key}`} style={{ marginBottom: '0.3rem' }}>
                            <code style={{ fontSize: '0.78rem', color: 'var(--muted)' }}>{key}</code>{' '}
                            {KIND_SENTENCE[finding.kind]}
                            {finding.detail.length > 0 && (
                              <span className="muted"> — {finding.detail.join(', ')}</span>
                            )}
                            {finding.kind !== 'missing' && (
                              <>
                                <br />
                                <span className="muted" style={{ fontSize: '0.84rem' }}>
                                  {english}
                                </span>
                                <br />
                                <span lang={summary.locale} dir="auto">
                                  {current}
                                </span>
                              </>
                            )}
                            <br />
                            <SheetLink locale={summary.locale} finding={finding} />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })}
            </div>
          </details>
        </>
      )}

      <div className="notice warn" style={{ marginTop: '1rem' }}>
        <strong>What this does not check.</strong> It has no idea what any of these sentences
        mean, so it cannot tell a good translation from a fluent wrong one. Specifically, it
        says nothing about:
        <ul style={{ margin: '0.5rem 0 0', paddingInlineStart: '1.1rem' }}>
          {AUDIT_LIMITS.map((limit) => (
            <li key={limit}>{limit}</li>
          ))}
        </ul>
        A clean panel means the catalogues are mechanically sound. It has never meant they are
        right, and one has not been read by a first-language speaker yet.
      </div>
    </section>
  );
}
