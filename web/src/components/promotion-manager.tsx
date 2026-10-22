'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  describeBenefit,
  describeLimits,
  describeMarkets,
  type PromotionCampaign,
  type PromotionCourseOption,
  type PromotionStatus,
} from '@/lib/promotions';

/**
 * The promotion screen, shared by the admin console and the teacher's area.
 *
 * There is one form and one list because there is one set of rules; the
 * difference between the two screens is which courses and which campaigns the
 * page hands in, and both of those come from the database rather than from this
 * component. A teacher who edits the request to name somebody else's course is
 * refused by `create_promotion_campaign()`, not by a hidden field here.
 */
export function PromotionManager({
  campaigns,
  courses,
  markets,
  scope,
  canCreate,
}: {
  campaigns: PromotionCampaign[];
  courses: PromotionCourseOption[];
  /** Countries the platform actually sells in, from live prices. */
  markets: string[];
  scope: 'platform' | 'teacher';
  /**
   * Whether this viewer may open a campaign. The database decides the same
   * thing again; this only avoids showing a form whose submit is refused.
   */
  canCreate: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState<string | null>(null);
  const [benefitType, setBenefitType] = useState<'percent_off' | 'fixed_amount_off'>('percent_off');

  async function post(payload: Record<string, unknown>): Promise<boolean> {
    setBusy(true);
    setError(null);
    setSaved(null);
    const res = await fetch('/api/promotions', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const json = (await res.json().catch(() => ({}))) as { ok?: boolean; message?: string };
    setBusy(false);
    if (!res.ok || json.ok !== true) {
      setError(json.message ?? 'That did not work. Please try again.');
      return false;
    }
    startTransition(() => router.refresh());
    return true;
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => {
      const v = data.get(key);
      return typeof v === 'string' ? v.trim() : '';
    };
    const list = (key: string) => data.getAll(key).map(String).filter(Boolean);

    const ok = await post({
      action: 'create',
      code: text('code'),
      name: text('name'),
      benefitType,
      percent: text('percent'),
      amountMinor: text('amountMinor'),
      currency: text('currency'),
      markets: list('markets'),
      courseIds: list('courseIds'),
      totalLimit: text('totalLimit'),
      perUserLimit: text('perUserLimit'),
      perFamilyLimit: text('perFamilyLimit'),
      startsAt: text('startsAt'),
      endsAt: text('endsAt'),
      newCustomersOnly: data.get('newCustomersOnly') === 'on',
    });

    if (ok) {
      setSaved('Promotion saved as a draft. Switch it on when you are ready for people to use it.');
      event.currentTarget.reset();
      setBenefitType('percent_off');
    }
  }

  async function changeStatus(campaign: PromotionCampaign, status: PromotionStatus) {
    if (await post({ action: 'status', campaignId: campaign.id, status })) {
      setSaved(`${campaign.code} is now ${status}.`);
    }
  }

  async function submitLimits(event: React.FormEvent<HTMLFormElement>, campaign: PromotionCampaign) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const text = (key: string) => {
      const v = data.get(key);
      return typeof v === 'string' ? v.trim() : '';
    };
    if (
      await post({
        action: 'limits',
        campaignId: campaign.id,
        totalLimit: text('totalLimit'),
        perUserLimit: text('perUserLimit'),
        perFamilyLimit: text('perFamilyLimit'),
      })
    ) {
      setSaved(`Limits for ${campaign.code} updated.`);
    }
  }

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      {error && <div className="notice error">{error}</div>}
      {saved && <div className="notice">{saved}</div>}

      {!canCreate && (
        <div className="notice warn">
          You can see every promotion and its usage here, but only the platform owner
          opens a new one. Ask them if you need an offer run.
        </div>
      )}

      {canCreate && (
      <section className="card">
        <h2>Create a promotion</h2>
        <p className="meta">
          {scope === 'platform'
            ? 'You can run an offer on any course and in any country. A teacher can run one on their own courses, and switching it on is theirs to do.'
            : 'Your promotion applies to the courses you choose, in the countries you choose. The platform owner can see it, and you switch it on yourself.'}
        </p>

        <form onSubmit={submit} className="stack" style={{ gap: '1rem' }}>
          <div className="grid cols-2">
            <div>
              <label htmlFor="promo-code" className="eyebrow">Code</label>
              <input id="promo-code" name="code" required maxLength={32}
                placeholder="EID24" autoCapitalize="characters" />
              <p className="meta">What a family types at checkout. Letters, digits, dash or underscore.</p>
            </div>
            <div>
              <label htmlFor="promo-name" className="eyebrow">Name</label>
              <input id="promo-name" name="name" required maxLength={120}
                placeholder="Eid al-Fitr offer" />
              <p className="meta">For you and your staff. Families see the code and the discount.</p>
            </div>
          </div>

          <div>
            <span className="eyebrow">What it takes off</span>
            <div className="row" style={{ flexWrap: 'wrap' }}>
              <label className="radio">
                <input type="radio" name="benefitType" checked={benefitType === 'percent_off'}
                  onChange={() => setBenefitType('percent_off')} />
                <span>A percentage</span>
              </label>
              <label className="radio">
                <input type="radio" name="benefitType" checked={benefitType === 'fixed_amount_off'}
                  onChange={() => setBenefitType('fixed_amount_off')} />
                <span>A fixed amount</span>
              </label>
            </div>
            <p className="meta">
              A percentage follows the local price, so it means the same thing in every
              country. A fixed amount is written in one currency and can only be used where
              the course is priced in it.
            </p>
          </div>

          <div className="grid cols-2">
            {benefitType === 'percent_off' ? (
              <div>
                <label htmlFor="promo-percent" className="eyebrow">Percentage off</label>
                <input id="promo-percent" name="percent" inputMode="numeric" placeholder="20" />
              </div>
            ) : (
              <>
                <div>
                  <label htmlFor="promo-amount" className="eyebrow">Amount off (minor units)</label>
                  <input id="promo-amount" name="amountMinor" inputMode="numeric" placeholder="5000" />
                  <p className="meta">5 000 means 5 000 shillings, not 50.</p>
                </div>
                <div>
                  <label htmlFor="promo-currency" className="eyebrow">Currency</label>
                  <input id="promo-currency" name="currency" maxLength={3}
                    placeholder="UGX" autoCapitalize="characters" />
                </div>
              </>
            )}
          </div>

          <div>
            <span className="eyebrow">Countries</span>
            {markets.length === 0 ? (
              <p className="meta">No country has a live price yet, so there is nowhere to run this.</p>
            ) : (
              <div className="chips">
                {markets.map((market) => (
                  <label key={market} className="radio">
                    <input type="checkbox" name="markets" value={market} />
                    <span>{market}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="meta">
              Leave every box clear to run it wherever the course is sold.
            </p>
          </div>

          <div>
            <span className="eyebrow">Courses</span>
            {courses.length === 0 ? (
              <p className="meta">There are no courses to discount yet.</p>
            ) : (
              <div className="chips">
                {courses.map((course) => (
                  <label key={course.id} className="radio">
                    <input type="checkbox" name="courseIds" value={course.id} />
                    <span>{course.title}</span>
                  </label>
                ))}
              </div>
            )}
            <p className="meta">
              {scope === 'platform'
                ? 'Leave every box clear to cover every course, including ones written later.'
                : 'Choose at least one of your courses.'}
            </p>
          </div>

          <div className="grid cols-3">
            <div>
              <label htmlFor="promo-total" className="eyebrow">Total uses</label>
              <input id="promo-total" name="totalLimit" inputMode="numeric" placeholder="No limit" />
            </div>
            <div>
              <label htmlFor="promo-person" className="eyebrow">Per person</label>
              <input id="promo-person" name="perUserLimit" inputMode="numeric" placeholder="No limit" />
            </div>
            <div>
              <label htmlFor="promo-family" className="eyebrow">Per family</label>
              <input id="promo-family" name="perFamilyLimit" inputMode="numeric" placeholder="No limit" />
              <p className="meta">Two or three covers a household buying for several children.</p>
            </div>
          </div>

          <div className="grid cols-2">
            <div>
              <label htmlFor="promo-start" className="eyebrow">Starts</label>
              <input id="promo-start" name="startsAt" type="datetime-local" />
            </div>
            <div>
              <label htmlFor="promo-end" className="eyebrow">Ends</label>
              <input id="promo-end" name="endsAt" type="datetime-local" />
            </div>
          </div>

          <label className="radio">
            <input type="checkbox" name="newCustomersOnly" />
            <span>Only people who have never bought anything</span>
          </label>

          <div>
            <button type="submit" className="btn" disabled={busy || pending}>
              {busy ? 'Saving…' : 'Save as a draft'}
            </button>
          </div>
        </form>
      </section>
      )}

      <section>
        <h2>Promotions</h2>
        {campaigns.length === 0 ? (
          <p className="empty">
            No promotions yet. A campaign is saved as a draft and does nothing until you
            switch it on.
          </p>
        ) : (
          <div className="stack">
            {campaigns.map((campaign) => (
              <article className="card" key={campaign.id}>
                <div className="row" style={{ flexWrap: 'wrap' }}>
                  <div>
                    <strong>{campaign.name}</strong>
                    <p className="meta">
                      <code>{campaign.code}</code> · {describeBenefit(campaign.benefit)} ·{' '}
                      {describeMarkets(campaign.markets)}
                    </p>
                  </div>
                  <span className={campaign.status === 'active' ? 'badge ok' : 'badge'}>
                    {campaign.status}
                  </span>
                </div>

                <p className="meta">
                  {campaign.ownerType === 'teacher'
                    ? `Run by ${campaign.ownerName ?? 'a teacher'}`
                    : 'Run by the platform'}
                  {' · '}
                  {campaign.courses.length === 0
                    ? 'every course'
                    : campaign.courses.map((c) => c.title).join(', ')}
                  {' · '}
                  {describeLimits(campaign.limits)}
                  {' · '}
                  {campaign.redemptions} used
                </p>

                <div className="row" style={{ flexWrap: 'wrap', marginTop: '0.5rem' }}>
                  {campaign.status !== 'active' && campaign.status !== 'archived' && (
                    <button type="button" className="btn tiny"
                      disabled={busy || pending}
                      onClick={() => changeStatus(campaign, 'active')}>
                      Switch on
                    </button>
                  )}
                  {campaign.status === 'active' && (
                    <button type="button" className="btn tiny secondary"
                      disabled={busy || pending}
                      onClick={() => changeStatus(campaign, 'paused')}>
                      Pause
                    </button>
                  )}
                  {campaign.status !== 'archived' && (
                    <button type="button" className="btn tiny ghost"
                      disabled={busy || pending}
                      onClick={() => changeStatus(campaign, 'archived')}>
                      Archive
                    </button>
                  )}
                </div>

                <details style={{ marginTop: '0.75rem' }}>
                  <summary className="meta">Change the limits</summary>
                  <form onSubmit={(event) => submitLimits(event, campaign)}
                    className="grid cols-3" style={{ marginTop: '0.75rem' }}>
                    <div>
                      <label htmlFor={`total-${campaign.id}`} className="eyebrow">Total uses</label>
                      <input id={`total-${campaign.id}`} name="totalLimit" inputMode="numeric"
                        defaultValue={campaign.limits.total ?? ''} placeholder="No limit" />
                    </div>
                    <div>
                      <label htmlFor={`person-${campaign.id}`} className="eyebrow">Per person</label>
                      <input id={`person-${campaign.id}`} name="perUserLimit" inputMode="numeric"
                        defaultValue={campaign.limits.perUser ?? ''} placeholder="No limit" />
                    </div>
                    <div>
                      <label htmlFor={`family-${campaign.id}`} className="eyebrow">Per family</label>
                      <input id={`family-${campaign.id}`} name="perFamilyLimit" inputMode="numeric"
                        defaultValue={campaign.limits.perFamily ?? ''} placeholder="No limit" />
                    </div>
                    <div style={{ gridColumn: '1 / -1' }}>
                      <button type="submit" className="btn tiny" disabled={busy || pending}>
                        Save limits
                      </button>
                    </div>
                  </form>
                </details>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
