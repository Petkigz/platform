import Link from 'next/link';
import type { Metadata } from 'next';
import { notFound } from 'next/navigation';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDateTime, formatDay, formatNumber, translator } from '@/lib/i18n';
import {
  audienceOf,
  isInForce,
  readableBlocks,
  type PolicyDocumentRow,
  type PolicyPageView,
  type PolicyStanding,
} from '@/lib/policies';
import { isPolicySlug } from '@/lib/policy-outcome';
import { AUDIENCE_WORDS, READ_FAILED, acceptWords, readerLanguage } from '../reader';
import { AcceptPolicy } from './accept-policy';

export const dynamic = 'force-dynamic';

type Params = Promise<{ slug: string }>;

/**
 * The tab's name: the document's own title when it can be read, and the
 * register's name when it cannot. Never a reason for the page to fail.
 */
export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { shown } = await readerLanguage();
  const fallback = { title: translator(shown.code)('footer.terms') };
  if (!isSupabaseConfigured()) return fallback;
  const { slug } = await params;
  if (!isPolicySlug(slug)) return fallback;
  try {
    const supabase = await createClient();
    const { data } = await supabase.from('policy_documents').select('title, summary').eq('slug', slug).maybeSingle();
    const row = data as { title?: string; summary?: string | null } | null;
    if (!row?.title) return fallback;
    return { title: row.title, description: row.summary ?? undefined };
  } catch {
    return fallback;
  }
}

/**
 * One policy.
 *
 * In the reader's language, for the twenty-seven it is written in
 * (`messages/policy.ts`); English, marked as English, for the rest.
 *
 * **The document is not translated.** Its title, summary, change note and
 * text are the owner's, in English, shown as written and marked as English,
 * and the page says so above the text. What somebody agrees to is that text.
 * A translation of it that nobody approved would be a different text.
 *
 * It shows the live version or says there is none. It never shows a draft.
 *
 * **Not read is said as not read.** The page used to throw when the document
 * or its live text could not be read. Either is now one sentence at status
 * 200. Whether the reader has agreed already is a lesser read: without it the
 * button is still offered, and pressing it twice is not a mistake, because
 * the writer answers a second agreement with the time of the first.
 *
 * **Agreeing goes through `/api/policies`**, with the version this page
 * showed. See that route for why.
 */
export default async function PolicyDocumentPage({ params }: { params: Params }) {
  if (!isSupabaseConfigured()) notFound();

  const { slug } = await params;
  // A slug the table could not hold names no document; nothing is asked.
  if (!isPolicySlug(slug)) notFound();

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const written = shown.code === 'en' ? {} : { lang: 'en', dir: 'ltr' as const };

  const supabase = await createClient();
  const [documentResult, pageResult, userResult] = await Promise.all([
    supabase
      .from('policy_documents')
      .select('slug, title, summary, audience, acceptance_required')
      .eq('slug', slug)
      .maybeSingle()
      .then((r) => r, () => READ_FAILED),
    supabase.rpc('policy_page', { p_slug: slug } as never).then((r) => r, () => READ_FAILED),
    // Not knowing who is reading is treated as nobody: they are sent to sign in.
    supabase.auth.getUser().then((r) => r.data.user, () => null),
  ]);

  const ways = (
    <>
      <p className="muted policy-kept">{t('policy.kept')}</p>
      <p className="policy-ways">
        <Link href="/policies">{t('footer.terms')}</Link>
      </p>
    </>
  );

  if (documentResult.error || pageResult.error) {
    console.error('policies: a document could not be read:', documentResult.error?.message ?? pageResult.error?.message);
    return (
      <div className="page policy-page" {...frame}>
        <div className="page-head">
          <h1>{t('footer.terms')}</h1>
        </div>
        <div className="notice error" role="alert" data-policy-state="unread">
          {t('policy.unread')}
        </div>
        {ways}
      </div>
    );
  }

  const document = documentResult.data as unknown as PolicyDocumentRow | null;
  if (!document) notFound();
  const found = (pageResult.data ?? null) as unknown as PolicyPageView | null;
  const page = found && isInForce(found) ? found : null;

  const head = (
    <div className="page-head">
      <p className="eyebrow">
        <Link href="/policies">{t('footer.terms')}</Link>
      </p>
      <h1 {...written}>{document.title}</h1>
      {document.summary ? (
        <p className="lede" {...written}>
          {document.summary}
        </p>
      ) : null}
    </div>
  );

  if (!page) {
    return (
      <div className="page policy-page" {...frame}>
        {head}
        <div className="notice" data-policy-state="draft">
          <strong>{t('policy.notYet')}</strong> {t('policy.draftBody')}
        </div>
        {ways}
      </div>
    );
  }

  const user = userResult;
  // Whether this reader has agreed to this version, and how many documents
  // still wait for them. Unread is `null`: not "no", and not "none".
  let acceptedAt: string | null = null;
  let outstanding: number | null = null;
  if (user && document.acceptance_required) {
    const standing = await supabase.rpc('my_policy_standing').then((r) => r, () => READ_FAILED);
    if (standing.error) {
      console.error('policies: what this account has agreed to could not be read:', standing.error.message);
    } else {
      const read = (standing.data ?? null) as PolicyStanding | null;
      const rows = Array.isArray(read?.acceptanceRequired) ? read.acceptanceRequired : [];
      const row = rows.find((one) => one.slug === document.slug && one.versionNumber === page.versionNumber);
      acceptedAt = typeof row?.acceptedAt === 'string' ? row.acceptedAt : null;
      outstanding = typeof read?.outstanding === 'number' ? read.outstanding : null;
    }
  }

  const day = formatDay(locale, page.effectiveAt);
  const blocks = readableBlocks(page.body);

  return (
    <div className="page policy-page" data-policy-state="live" data-policy-version={page.versionNumber} {...frame}>
      {head}

      <ul className="policy-facts">
        <li>
          <strong>{t('policy.versionNo', { number: formatNumber(locale, page.versionNumber) })}</strong>
        </li>
        {day ? (
          <li>
            <Say text={t('policy.inForceFrom')} parts={{ date: <bdi>{day}</bdi> }} />
          </li>
        ) : null}
        <li>{t(AUDIENCE_WORDS[audienceOf(page.audience)])}</li>
      </ul>
      {page.changeNote ? (
        <p className="muted policy-change">
          <Say text={t('policy.changed')} parts={{ note: <bdi {...written}>{page.changeNote}</bdi> }} />
        </p>
      ) : null}
      {shown.code === 'en' ? null : <p className="muted policy-as-written">{t('policy.asWritten')}</p>}

      <article className="policy-body" data-policy-body {...written}>
        {blocks.map((block, index) =>
          block.kind === 'heading' ? <h2 key={index}>{block.text}</h2> : <p key={index}>{block.text}</p>,
        )}
      </article>

      {document.acceptance_required ? (
        <section className="card policy-agree" data-policy-agree={user ? (acceptedAt ? 'agreed' : 'asked') : 'signed-out'}>
          <h2>{t('policy.agreeTitle')}</h2>
          {user ? (
            <>
              <AcceptPolicy
                slug={document.slug}
                version={page.versionNumber}
                agreedAt={acceptedAt ? formatDateTime(locale, acceptedAt, 'UTC') : null}
                locale={locale}
                words={acceptWords(t)}
              />
              {acceptedAt ? (
                <p className="muted">
                  {t('policy.agreedWhere')} <Link href="/account">{t('export.inAccount')}</Link>
                </p>
              ) : null}
              {acceptedAt === null && outstanding !== null && outstanding > 0 ? (
                <p className="muted" data-policy-waiting>
                  {t('policy.waitingCount', { count: formatNumber(locale, outstanding) })}
                </p>
              ) : null}
            </>
          ) : (
            <>
              <p className="muted">{t('policy.agreeSignIn')}</p>
              <p>
                <Link className="btn" href={`/sign-in?next=/policies/${document.slug}`}>
                  {t('policy.agreeSignInDo')}
                </Link>
              </p>
            </>
          )}
        </section>
      ) : null}

      {ways}
    </div>
  );
}
