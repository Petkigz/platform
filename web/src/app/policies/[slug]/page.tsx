import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound, redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  audienceLabel,
  liveLine,
  readableBlocks,
  type PolicyDocumentRow,
  type PolicyPageView,
  type PolicyStanding,
} from '@/lib/policies';
import { AcceptPolicy } from './accept-policy';

export const dynamic = 'force-dynamic';

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  if (!isSupabaseConfigured()) return { title: slug };
  const supabase = await createClient();
  const { data } = await supabase
    .from('policy_documents')
    .select('title, summary')
    .eq('slug', slug)
    .maybeSingle();
  if (!data) return { title: slug.replace(/-/g, ' ') };
  const title = String(data.title ?? slug);
  const description = typeof data.summary === 'string' ? data.summary : '';
  return {
    title,
    ...(description ? { description } : {}),
    alternates: { canonical: `/policies/${slug}` },
  };
}

/**
 * One document — screen 50.
 *
 * The text shown is the *live* version, read through `policy_page()`, which
 * returns null when nothing is in force. A signed-out visitor can read it; that
 * is the point of a term. A signed-in visitor whose account owes an agreement
 * gets the button, and the button names the version it is agreeing to.
 *
 * The empty state is the interesting one. It says a draft exists and why it is
 * not shown: a document nobody has approved is not yet an agreement, and showing
 * it here would let a reader believe they were bound by a paragraph that is still
 * being decided.
 */
export default async function PolicyPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  if (!isSupabaseConfigured()) notFound();

  const { slug } = await params;
  const supabase = await createClient();

  const [documentResult, pageResult, userResult] = await Promise.all([
    supabase
      .from('policy_documents')
      .select('slug, title, summary, audience, acceptance_required')
      .eq('slug', slug)
      .maybeSingle(),
    supabase.rpc('policy_page', { p_slug: slug }),
    supabase.auth.getUser(),
  ]);
  if (documentResult.error) throw new Error(documentResult.error.message);
  if (pageResult.error) throw new Error(pageResult.error.message);

  const document = documentResult.data as unknown as PolicyDocumentRow | null;
  if (!document) notFound();
  const page = (pageResult.data ?? null) as unknown as PolicyPageView | null;

  const user = userResult.data.user;
  let acceptedAt: string | null = null;
  let outstanding = 0;
  if (user) {
    const { data: standingData } = await supabase.rpc('my_policy_standing');
    const standing = (standingData ?? null) as PolicyStanding | null;
    outstanding = Number(standing?.outstanding ?? 0);
    acceptedAt = standing?.acceptanceRequired.find((row) => row.slug === slug)?.acceptedAt ?? null;
  }

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/policies">Policies</Link></p>
      <h1>{document.title}</h1>
      <p className="lede">{document.summary ?? 'No summary yet.'}</p>

      {!page ? (
        <>
          <div className="notice" style={{ maxWidth: '46rem', marginTop: '1rem' }}>
            <strong>Not in force yet.</strong> This document has been written and versioned,
            but no version has been approved, so there is nothing here for you to read or
            agree to. A draft is not shown: it still carries questions only the operator can
            answer, and one of them can change what the document says. Nothing on this page
            binds you until it is approved.
          </div>
          <p className="muted" style={{ maxWidth: '46rem' }}>
            In the meantime, an account here is governed by what the screens actually do —
            the catalogue, the account page and this register are the description.
          </p>
        </>
      ) : (
        <>
          <p className="muted" style={{ maxWidth: '46rem', marginTop: '1rem' }}>
            {liveLine({ versionNumber: page.versionNumber, effectiveAt: page.effectiveAt })}
            {' · '}
            For {audienceLabel(page.audience).toLowerCase()}
            {page.changeNote ? ` · ${page.changeNote}` : ''}
          </p>

          <article style={{ maxWidth: '46rem', marginTop: '1.5rem' }}>
            {readableBlocks(page.body).map((block, index) => (
              block.kind === 'heading' ? (
                <h2 key={index} style={{ marginTop: '2rem' }}>{block.text}</h2>
              ) : (
                <p key={index} style={{ marginTop: '0.75rem', whiteSpace: 'pre-line' }}>
                  {block.text}
                </p>
              )
            ))}
          </article>

          {document.acceptance_required && (
            <section className="card" style={{ maxWidth: '46rem', marginTop: '2rem' }}>
              <h2 style={{ marginTop: 0 }}>Your agreement</h2>
              {user ? (
                <AcceptPolicy
                  slug={document.slug}
                  title={document.title}
                  versionNumber={page.versionNumber}
                  acceptedAt={acceptedAt}
                />
              ) : (
                <>
                  <p className="muted">
                    This document asks for your agreement, and the time you give it is kept
                    against your account. Sign in first.
                  </p>
                  <p>
                    <Link className="btn" href={`/sign-in?next=/policies/${document.slug}`}>
                      Sign in to agree
                    </Link>
                  </p>
                </>
              )}
              {user && outstanding > 0 && acceptedAt === null && (
                <p className="muted" style={{ fontSize: '0.9rem' }}>
                  {outstanding === 1
                    ? 'This is the one document waiting for you.'
                    : `${outstanding} documents are waiting for you in total.`}
                </p>
              )}
            </section>
          )}
        </>
      )}

      <p className="muted" style={{ marginTop: '1.5rem', maxWidth: '46rem', fontSize: '0.9rem' }}>
        Every version is kept. If this text changes, the new version takes effect on a date
        rather than quietly replacing the one you read — and where a change needs your
        agreement, you will be asked again.
      </p>
      <p style={{ marginTop: '1rem' }}><Link href="/policies">All policies</Link></p>
    </div>
  );
}
