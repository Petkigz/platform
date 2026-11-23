import Link from 'next/link';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Say } from '@/components/say';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { formatDay, formatNumber, translator } from '@/lib/i18n';
import { audienceOf, isInForce, type PolicyDocumentRow, type PolicyInForce } from '@/lib/policies';
import { AUDIENCE_WORDS, READ_FAILED, readerLanguage } from './reader';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  const t = translator(shown.code);
  return { title: t('footer.terms'), description: t('policy.lede') };
}

type Card = PolicyDocumentRow & { live: PolicyInForce | null };

/**
 * The public register.
 *
 * In the reader's language, for the twenty-seven it is written in
 * (`messages/policy.ts`); English, marked as English, for the rest. What is
 * translated is the page round the documents. A document's title and summary
 * are the owner's and are shown as written, marked as English.
 *
 * Two states, and the second matters more. A document with a version in
 * force says which version and from what day. A document with none keeps its
 * card and says it is not in force: a platform with seven written documents
 * and none approved has policies in preparation, and hiding them would say
 * it has none. The draft is never shown.
 *
 * **Not read is said as not read.** The page used to throw when either read
 * failed, which drew the "this page broke" screen. Both reads are needed to
 * say anything true about a document, because one without the other would
 * call a live document a draft. So either failing is one sentence, at status
 * 200, that says it does not mean there are no policies.
 *
 * Anybody may read this, signed in or not: a term that has to be accepted
 * before signing up has to be readable before signing up.
 */
export default async function PoliciesPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};

  const supabase = await createClient();
  const [documents, live] = await Promise.all([
    supabase
      .from('policy_documents')
      .select('slug, title, summary, audience, acceptance_required, sort_order')
      .order('sort_order')
      .then((r) => r, () => READ_FAILED),
    supabase.rpc('policies_in_force').then((r) => r, () => READ_FAILED),
  ]);

  const head = (
    <div className="page-head">
      <h1>{t('footer.terms')}</h1>
      <p className="lede">{t('policy.lede')}</p>
    </div>
  );
  const ways = (
    <>
      <p className="muted policy-concern">
        {t('policy.concern')} <Link href="/support">{t('missing.help')}</Link>
      </p>
      <p className="policy-ways">
        <Link href="/">{t('missing.home')}</Link>
      </p>
    </>
  );

  if (documents.error || live.error || !Array.isArray(documents.data) || !Array.isArray(live.data)) {
    console.error('policies: the register could not be read:', documents.error?.message ?? live.error?.message ?? 'a reply that was not a list');
    return (
      <div className="page policy-page" {...frame}>
        {head}
        <div className="notice error" role="alert" data-policies-state="unread">
          {t('policy.unread')}
        </div>
        {ways}
      </div>
    );
  }

  const liveBySlug = new Map((live.data as unknown as PolicyInForce[]).map((row) => [row.slug, row]));
  const cards: Card[] = (documents.data as unknown as PolicyDocumentRow[]).map((doc) => ({
    ...doc,
    live: liveBySlug.get(doc.slug) ?? null,
  }));
  const inForce = cards.filter((card) => isInForce(card.live)).length;
  // The documents are the owner's words, in English, whatever the page is in.
  const written = shown.code === 'en' ? {} : { lang: 'en', dir: 'ltr' as const };

  return (
    <div className="page policy-page" {...frame}>
      {head}

      {cards.length === 0 ? (
        <div className="notice" data-policies-state="none">
          {t('policy.none')}
        </div>
      ) : (
        <>
          {inForce === 0 ? (
            <div className="notice" data-policies-state="none-in-force">
              <strong>{t('policy.noneLead')}</strong> {t('policy.noneBody')}
            </div>
          ) : (
            <p className="muted" data-policies-state="in-force">
              {t('policy.inForceCount', { count: formatNumber(locale, inForce) })}
              {inForce < cards.length ? <> · {t('policy.othersDraft')}</> : null}
            </p>
          )}

          <ul className="policy-list">
            {cards.map((card) => {
              const day = card.live ? formatDay(locale, card.live.effectiveAt) : '';
              return (
                <li
                  key={card.slug}
                  className="card policy-card"
                  data-policy={card.slug}
                  data-in-force={isInForce(card.live) ? 'yes' : 'no'}
                >
                  <h2 {...written}>
                    <Link href={`/policies/${card.slug}`}>{card.title}</Link>
                  </h2>
                  {card.summary ? (
                    <p className="muted" {...written}>
                      {card.summary}
                    </p>
                  ) : null}
                  <ul className="policy-facts">
                    <li>{t(AUDIENCE_WORDS[audienceOf(card.audience)])}</li>
                    {card.live && isInForce(card.live) ? (
                      <>
                        <li>
                          <strong>{t('policy.versionNo', { number: formatNumber(locale, card.live.versionNumber) })}</strong>
                        </li>
                        {day ? (
                          <li>
                            <Say text={t('policy.inForceFrom')} parts={{ date: <bdi>{day}</bdi> }} />
                          </li>
                        ) : null}
                      </>
                    ) : (
                      <li>
                        <strong>{t('policy.notYet')}</strong>
                      </li>
                    )}
                    <li>{t(card.acceptance_required ? 'policy.mustAgree' : 'policy.noSign')}</li>
                  </ul>
                </li>
              );
            })}
          </ul>
        </>
      )}

      <p className="muted policy-kept">{t('policy.kept')}</p>
      {ways}
    </div>
  );
}
