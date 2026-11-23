import type { Metadata } from 'next';
import Link from 'next/link';
import { cookies, headers } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { LOCALE_COOKIE, chooseLocale, formatDateTime, languageShownFor, translator, type MessageKey } from '@/lib/i18n';
import { fetchRefundStanding } from '@/lib/refunds';
import { amountOf } from '@/lib/sponsorship-outcome';
import {
  adjustmentKindOf,
  isSettled,
  mayAskRefund,
  orderLinesOf,
  orderStateOf,
  refundStandingShownOf,
  type AdjustmentKind,
  type OrderLineKind,
  type OrderState,
  type RefundRule,
  type RefundStandingShown,
} from '@/lib/orders-outcome';
import { RefundForm, type RefundWords } from './refund-form';
import { PromotionActions, type CodeWords } from './promotion-actions';

import { Ending } from '../_shared/ending';

export const dynamic = 'force-dynamic';

type AdjustmentRow = {
  id: string;
  adjustment_type: string;
  direction: 'debit' | 'credit';
  amount_minor: string | number;
  currency_code: string;
  description: string | null;
  voided_at: string | null;
  voided_reason: string | null;
};

type OrderRow = {
  id: string;
  status: string;
  currency_code: string;
  subtotal_minor: string | number;
  discount_minor: string | number;
  tax_minor: string | number;
  fee_minor: string | number;
  total_minor: string | number;
  paid_at: string | null;
  created_at: string;
  order_items: {
    id: string;
    item_snapshot: { title?: string } | null;
  }[] | null;
  order_adjustments: AdjustmentRow[] | null;
};

/** The language this page is written in for this reader, and whether that is the one they chose. */
async function readerLanguage() {
  const jar = await cookies();
  const hdrs = await headers();
  const { code: locale } = chooseLocale({
    chosen: jar.get(LOCALE_COOKIE)?.value ?? null,
    acceptLanguage: hdrs.get('accept-language'),
  });
  const shown = languageShownFor(locale, 'orders');
  return { locale, shown };
}

export async function generateMetadata(): Promise<Metadata> {
  const { shown } = await readerLanguage();
  return { title: translator(shown.code)('orders.title') };
}

const STATE: Record<OrderState, MessageKey> = {
  draft: 'orders.stDraft',
  pending_payment: 'orders.stPending',
  awaiting_confirmation: 'orders.stConfirming',
  paid: 'orders.stPaid',
  partially_refunded: 'orders.stPartRefunded',
  refunded: 'orders.stRefunded',
  cancelled: 'orders.stCancelled',
  failed: 'orders.stFailed',
  expired: 'orders.stExpired',
};

const LINE: Record<OrderLineKind, MessageKey> = {
  subtotal: 'orders.lnSubtotal',
  discount: 'orders.lnDiscount',
  tax: 'orders.lnTax',
  fee: 'orders.lnFee',
};

const ADJUSTMENT: Record<AdjustmentKind, MessageKey> = {
  discount: 'orders.lnDiscount',
  tax: 'orders.lnTax',
  fee: 'orders.lnFee',
  other: 'orders.adjOther',
};

/**
 * My orders, in the reader's language.
 *
 * This page is the payer's answer to "did it work?", and it is the return URL
 * for a provider redirect. That makes its honesty load-bearing: someone comes
 * back here from a payment screen expecting to be let in.
 *
 * So it does not infer success from having been redirected. The order's status
 * comes from the database, which only `record_payment_success()` can set to
 * paid, and that only happens on a verified provider event. A redirect that
 * arrives before the webhook lands shows "waiting for payment" — which is the
 * truth, and better than a green tick that turns out to be wrong.
 *
 * **Unread is not empty.** Orders that could not be read are said as that.
 * They used to be drawn as "you have not placed any orders yet", which is a
 * different fact and an alarming one to somebody who has just paid. The same
 * for whether a refund may be asked for: no answer is said as no answer, and
 * was drawn as a refusal.
 *
 * **Nothing the database wrote in English is printed as the page's own.** An
 * order's state, each line of its total and the standing of a refund are
 * named (`lib/orders-outcome.ts`) and said here; a state this page has no
 * word for is left out. A note that staff or the database put beside an
 * adjustment is theirs, and is shown as it was written, set apart.
 *
 * **Amounts are major units** (`UGX 50000`, `USD 19.99`), read left to
 * right, and an amount that cannot be said correctly is left out. Dates are
 * said with their zone, in UTC, because a server does not know the reader's
 * clock.
 *
 * **A refund is asked for what is left**, as the database counts it, not for
 * the order's total: on an order already partly refunded the total is more
 * than can be returned, and asking for it was always refused.
 *
 * Fifty-four sentences in twenty-seven languages (`messages/orders.ts`),
 * unreviewed; a language held for review reads the page in English, whole,
 * under `lang="en"`. The receipt (`/orders/[id]/receipt`) is still English.
 */
export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ pending?: string }>;
}) {
  if (!isSupabaseConfigured()) redirect('/');

  const { pending } = await searchParams;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/orders');

  const { locale, shown } = await readerLanguage();
  const t = translator(shown.code);
  const frame = shown.code !== locale ? { lang: shown.code, dir: shown.dir } : {};
  const when = (iso: string) => formatDateTime(shown.code, iso, 'UTC');

  // null: not read. Never drawn as "none".
  let orders: OrderRow[] | null = null;
  const memberships = await supabase
    .from('billing_account_memberships')
    .select('billing_account_id')
    .eq('user_id', user.id)
    .eq('status', 'active');

  if (!memberships.error) {
    const accountIds = ((memberships.data ?? []) as { billing_account_id: string }[]).map(
      (m) => m.billing_account_id,
    );
    if (accountIds.length === 0) {
      orders = [];
    } else {
      const read = await supabase
        .from('orders')
        .select(
          'id, status, currency_code, subtotal_minor, discount_minor, tax_minor, ' +
          'fee_minor, total_minor, paid_at, created_at, ' +
          'order_items ( id, item_snapshot ), ' +
          // A payer may read the adjustments on their own order, including
          // withdrawn ones: without them the total on this page cannot be
          // reconstructed from anything the payer can see.
          'order_adjustments ( id, adjustment_type, direction, amount_minor, ' +
          'currency_code, description, voided_at, voided_reason )',
        )
        .in('billing_account_id', accountIds)
        .is('deleted_at', null)
        .order('created_at', { ascending: false });
      orders = read.error ? null : ((read.data ?? []) as unknown as OrderRow[]);
    }
  }

  // Why a refund can or cannot be asked for, from the database's clock.
  //
  // Only the orders that could conceivably be refunded are asked about: a paid
  // order, or one already partly refunded. Everything else has no button to
  // explain, and asking about every order a family ever placed would be one
  // round trip per row on a page that is mostly history.
  const standings: Record<string, RefundStandingShown> = {};
  await Promise.all(
    (orders ?? [])
      .filter((o) => mayAskRefund(orderStateOf(o.status)))
      .map(async (o) => {
        standings[o.id] = refundStandingShownOf(await fetchRefundStanding(supabase, o.id));
      }),
  );

  // The order the payer was just redirected back from, if that is why they are
  // here. Looked up in the list already fetched rather than queried separately,
  // so the status shown in the banner is exactly the status in the table.
  const returned = pending ? orders?.find((o) => o.id === pending) : undefined;

  const ruleSentence = (rule: RefundRule) =>
    rule === 'law' ? t('orders.rfRuleLaw') : rule === 'waived' ? t('orders.rfRuleWaived') : null;

  const refundWords: RefundWords = {
    ask: t('orders.rfAsk'),
    why: t('orders.rfWhy'),
    send: t('orders.rfSend'),
    sending: t('auth.sending'),
    cancel: t('action.cancel'),
    sent: t('orders.rfSent'),
    note: t('orders.rfNote'),
    reasons: {
      reason_required: t('orders.rfWhyReason'),
      too_long: t('sponsor.tooLong'),
      not_yours: t('orders.rfWhyNotYours'),
      // Not something this form can be shown for: the button is only drawn on a paid order.
      not_paid: t('orders.rfFailed'),
      too_much: t('orders.rfWhyTooMuch'),
      window_closed: t('orders.rfWhyClosed'),
      not_signed_in: t('buy.signedOut'),
      malformed: t('orders.rfFailed'),
      failed: t('orders.rfFailed'),
      unconfirmed: t('orders.unconfirmed'),
    },
  };

  const codeWords: CodeWords = {
    label: t('buy.codeLabel'),
    use: t('orders.pmUse'),
    remove: t('orders.pmRemove'),
    // One sentence for each reason in `lib/orders-outcome.ts`. The record
    // type makes a reason without a sentence a compile error.
    reasons: {
      unknown_code: t('buy.codeUnknown'),
      // "Switched off" and "outside its dates" are one thing to a buyer.
      not_active: t('buy.codeNotNow'),
      not_running: t('buy.codeNotNow'),
      not_in_market: t('buy.codeNotHere'),
      not_for_this_course: t('buy.codeNotCourse'),
      self_referral: t('buy.codeOwn'),
      new_customers_only: t('buy.codeNewOnly'),
      limit_reached_total: t('buy.codeUsedUp'),
      limit_reached_person: t('buy.codeUsedYou'),
      limit_reached_family: t('buy.codeUsedFamily'),
      would_be_free: t('buy.codeFree'),
      currency_mismatch: t('buy.codeCurrency'),
      nothing_off: t('buy.codeNothing'),
      order_not_pending: t('orders.pmWhyPaid'),
      already_applied: t('orders.pmWhyHas'),
      // The order has no code, which is what was asked for. The form reloads and says nothing.
      none_applied: t('orders.pmFailed'),
      not_yours: t('orders.rfWhyNotYours'),
      not_signed_in: t('buy.signedOut'),
      malformed: t('orders.pmFailed'),
      failed: t('orders.pmFailed'),
      unconfirmed: t('orders.unconfirmed'),
    },
  };

  return (
    <div className="page" {...frame}>
      <div className="page-head">
        <p className="eyebrow">
          <Link href="/account">{t('merge.back')}</Link>
        </p>
        <h1>{t('orders.title')}</h1>
      </div>

      {returned && orderStateOf(returned.status) !== 'paid' && (
        <div className="notice warn" role="status" data-returned="waiting">
          <strong>{t('orders.waitLead')}</strong> {t('orders.waitBody')}
        </div>
      )}

      {returned && orderStateOf(returned.status) === 'paid' && (
        <div className="notice" role="status" data-returned="paid">
          <strong>{t('orders.paidLead')}</strong> {t('orders.paidBody')}{' '}
          <Link href="/learn">{t('account.selfGo')}</Link>
        </div>
      )}

      {orders === null && (
        <div className="notice error" role="alert" data-orders="unread">
          {t('orders.unread')}
        </div>
      )}

      {orders !== null && orders.length === 0 && (
        <p className="empty" data-orders="none">
          {t('orders.none')} <Link href="/catalogue">{t('refer.lnBrowse')}</Link>
        </p>
      )}

      {orders !== null && orders.length > 0 && (
        <section className="card">
          <ul className="lessons stacked" data-orders="list">
            {orders.map((o) => {
              const state = orderStateOf(o.status);
              const title = o.order_items?.[0]?.item_snapshot?.title?.trim() || null;
              const total = amountOf(String(o.total_minor), o.currency_code);
              const placed = when(o.created_at);
              const lines = orderLinesOf({
                subtotalMinor: String(o.subtotal_minor ?? 0),
                discountMinor: String(o.discount_minor ?? 0),
                taxMinor: String(o.tax_minor ?? 0),
                feeMinor: String(o.fee_minor ?? 0),
              });
              const standing = standings[o.id];
              const rule = standing?.kind === 'open' || standing?.kind === 'closed' ? ruleSentence(standing.rule) : null;
              const refundable = standing?.kind === 'open' ? amountOf(standing.refundableMinor, standing.currencyCode) : null;
              return (
                <li key={o.id} data-order={state ?? 'unknown'}>
                  <div className="order-head">
                    <strong>{title ? <bdi>{title}</bdi> : t('orders.anOrder')}</strong>
                    {state && <span className={`badge ${state === 'paid' ? 'ok' : 'neutral'}`}>{t(STATE[state])}</span>}
                  </div>

                  {total && (
                    <p className="meta" data-total>
                      <Ending words={t('orders.total')} gap="amount" value={total} ltr />
                    </p>
                  )}
                  {placed && (
                    <p className="meta">
                      <Ending words={t('orders.placedOn')} gap="date" value={placed} />
                    </p>
                  )}

                  {lines.map((line) => {
                    const amount = amountOf(line.minor, o.currency_code);
                    return amount ? (
                      <p key={line.kind} className="muted order-line" data-line={line.kind}>
                        <Ending words={t(LINE[line.kind])} gap="amount" value={`${line.sign}${amount}`} ltr />
                      </p>
                    ) : null;
                  })}

                  {(o.order_adjustments ?? []).map((a) => {
                    // PostgREST sends a bigint as a JSON number; money is a
                    // decimal integer string everywhere else, so it becomes
                    // one here rather than being formatted as a float.
                    const amount = amountOf(String(a.amount_minor), a.currency_code);
                    if (!amount) return null;
                    const note = a.description?.trim();
                    const why = a.voided_reason?.trim();
                    return (
                      <p key={a.id} className="muted order-line order-adjustment" data-adjustment={a.voided_at ? 'withdrawn' : 'live'}>
                        <Ending
                          words={t(ADJUSTMENT[adjustmentKindOf(a.adjustment_type)])}
                          gap="amount"
                          value={`${a.direction === 'credit' ? '−' : '+'}${amount}`}
                          ltr
                        />
                        {/* Whoever wrote the note wrote it in their own language.
                            The space before it is the line's, not the note's: a
                            margin on a right-to-left note in a left-to-right
                            line falls on the far side of it. */}
                        {note && <> <bdi dir="auto" className="order-note">{note}</bdi></>}
                        {/* Still shown once withdrawn: hiding it would leave a
                            total that cannot be reconstructed from the page. */}
                        {a.voided_at && <> <span className="badge neutral">{t('orders.adjWithdrawn')}</span></>}
                        {a.voided_at && why && <> <bdi dir="auto" className="order-note">{why}</bdi></>}
                      </p>
                    );
                  })}

                  <div className="order-actions">
                    {state === 'paid' && (
                      <Link href="/learn" className="btn secondary">
                        {t('orders.learn')}
                      </Link>
                    )}
                    {/* A receipt exists once money has moved, including for an
                        order that was later refunded. */}
                    {isSettled(state) && (
                      <Link href={`/orders/${o.id}/receipt`} className="btn ghost">
                        {t('orders.receipt')}
                      </Link>
                    )}
                  </div>

                  {state === 'pending_payment' && (
                    <div className="order-part" data-unpaid>
                      <p className="muted">{t('orders.notPaid')}</p>
                      <PromotionActions
                        orderId={o.id}
                        applied={(o.order_adjustments ?? []).some(
                          (a) => a.adjustment_type === 'promotion' && !a.voided_at,
                        )}
                        words={codeWords}
                      />
                    </div>
                  )}

                  {mayAskRefund(state) && (
                    <div className="order-part" data-refund={standing?.kind ?? 'unread'}>
                      {standing?.kind === 'open' && refundable ? (
                        <>
                          <p className="muted">
                            <Ending words={t('orders.rfUntil')} gap="date" value={when(standing.closesAt)} />
                          </p>
                          {rule && <p className="muted">{rule}</p>}
                          <RefundForm
                            orderId={o.id}
                            amountMinor={standing.refundableMinor}
                            amountLine={{ lead: t('orders.rfAmount').split('{amount}')[0] ?? '', amount: refundable }}
                            words={refundWords}
                          />
                        </>
                      ) : (
                        // Said, not hidden: a button that vanished would leave
                        // the customer unable to tell a missed deadline from a
                        // broken page.
                        <p className="muted">
                          {standing?.kind === 'closed' && standing.closedAt && when(standing.closedAt) ? (
                            <Ending words={t('orders.rfClosed')} gap="date" value={when(standing.closedAt)} />
                          ) : standing?.kind === 'closed' ? (
                            t('orders.rfWhyClosed')
                          ) : standing?.kind === 'nothing_left' ? (
                            t('orders.rfNothingLeft')
                          ) : (
                            t('orders.rfUnread')
                          )}
                          {standing?.kind === 'closed' && rule && <span className="order-rule">{rule}</span>}{' '}
                          <Link href="/support">{t('footer.help')}</Link>
                        </p>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <p className="muted order-foot">{t('orders.footNote')}</p>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/billing">{t('orders.billing')}</Link>
        <span className="muted" style={{ display: 'block' }}>
          {t('orders.billingNote')}
        </span>
      </p>
    </div>
  );
}
