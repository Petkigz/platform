import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  describeEmptyRegister,
  describeRate,
  describeScope,
  type ChargeRule,
} from '@/lib/charges';
import { ChargeForm } from './charge-form';
import { RetireButton } from './retire-button';

export const dynamic = 'force-dynamic';

/**
 * Tax and transfer fees.
 *
 * The register behind `market_charges`. A rate is a fact about a jurisdiction,
 * so it is maintained here rather than in code: the owner adds a row when the
 * platform registers somewhere, and the next order carries it.
 *
 * The screen says the safe default out loud. No rule means no charge — which is
 * correct for a platform registered nowhere, and would be a catastrophe if it
 * were read as "tax is optional". The sentence is on the page rather than in a
 * comment for exactly that reason.
 */
export default async function TaxPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/tax');

  // The same pair the writers check. Support may read an order; nobody but
  // finance and the owner may change what a jurisdiction costs.
  const [{ data: platform }, { data: finance }] = await Promise.all([
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'finance_admin' }),
  ]);
  if (platform !== true && finance !== true) redirect('/admin');

  const { data, error } = await supabase
    .from('market_charges')
    .select(
      'id,kind,country_code,currency_code,label,rate_bps,fixed_minor,min_minor,' +
        'max_minor,effective_from,effective_to,status,note',
    )
    .order('status')
    .order('kind')
    .order('country_code', { nullsFirst: true });
  if (error) throw new Error(error.message);

  const rules = (data ?? []) as unknown as ChargeRule[];
  const active = rules.filter((r) => r.status === 'active');
  const retired = rules.filter((r) => r.status === 'retired');
  const empty = describeEmptyRegister(rules);

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Tax and transfer fees</h1>
      <p className="lede">
        What a buyer is charged on top of the price, by the country they buy from.
        The buyer pays both; neither is absorbed by the platform.
      </p>

      <div className="notice">
        <strong>No rule means no charge.</strong> A country with no rule is not
        taxed, which is right while this platform is registered nowhere. Add a rule
        the day a registration exists — a rate is a fact about a jurisdiction, not a
        setting to guess at.
      </div>

      {empty && <p className="muted">{empty}</p>}

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Rules in force</h2>
        {active.length === 0 ? (
          <p className="empty">Nothing is being charged on any order.</p>
        ) : (
          <div className="stack">
            {active.map((rule) => (
              <div
                key={rule.id}
                className="row"
                style={{
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  flexWrap: 'wrap',
                  gap: '0.75rem',
                  borderTop: '1px solid var(--line, #e6e6e6)',
                  paddingTop: '0.6rem',
                }}
              >
                <div>
                  <strong>{rule.label}</strong>
                  <span className="muted">
                    {' · '}
                    {rule.kind === 'tax' ? 'tax' : 'transfer fee'}
                    {' · '}
                    {describeScope(rule)}
                  </span>
                  <p className="muted" style={{ margin: '0.2rem 0 0' }}>
                    {describeRate(rule.rate_bps, rule.fixed_minor)}
                    {rule.min_minor !== null && ` · never below ${rule.min_minor}`}
                    {rule.max_minor !== null && ` · never above ${rule.max_minor}`}
                    {rule.note ? ` · ${rule.note}` : ''}
                  </p>
                </div>
                <RetireButton client={supabase} id={rule.id} label={rule.label} />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Add a rule</h2>
        <ChargeForm client={supabase} />
      </section>

      {retired.length > 0 && (
        <section className="card" style={{ marginTop: '1rem' }}>
          <h2 style={{ marginTop: 0 }}>Retired</h2>
          <p className="muted" style={{ marginTop: 0 }}>
            Kept because orders were billed under them. A retired rule explains its
            lines and charges nothing new.
          </p>
          <ul className="muted" style={{ paddingLeft: '1.1rem' }}>
            {retired.map((rule) => (
              <li key={rule.id}>
                {rule.label} · {describeScope(rule)} ·{' '}
                {describeRate(rule.rate_bps, rule.fixed_minor)} · ended{' '}
                {rule.effective_to?.slice(0, 10) ?? '—'}
              </li>
            ))}
          </ul>
        </section>
      )}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}
