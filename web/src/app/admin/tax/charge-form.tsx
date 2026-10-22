'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import { describeRate, describeScope, type ChargeRule } from '@/lib/charges';

const blank = {
  kind: 'tax' as 'tax' | 'transfer_fee',
  country: '',
  currency: '',
  label: '',
  rate: '0',
  fixed: '0',
  min: '',
  max: '',
  note: '',
};

/**
 * Add a tax or transfer-fee rule.
 *
 * Every field is one a finance admin can explain to themselves: what kind of
 * charge, where, what it is called, and how it is calculated. The percentage is
 * typed as a percentage — 18, not 1800 basis points — because a person setting a
 * tax rate should not have to know that the database stores basis points, and the
 * screen converts.
 *
 * Nothing here is the control. `set_market_charge()` checks the role again and
 * audits the change.
 */
export function ChargeForm({ client }: { client: SupabaseClient }) {
  const router = useRouter();
  const [form, setForm] = useState(blank);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const set = <K extends keyof typeof blank>(key: K, value: (typeof blank)[K]) =>
    setForm((f) => ({ ...f, [key]: value }));

  const rateBps = Math.round(Number(form.rate || '0') * 100);
  const preview: ChargeRule = {
    id: 'preview',
    kind: form.kind,
    country_code: form.country.trim().toUpperCase() || null,
    currency_code: form.currency.trim().toUpperCase() || null,
    label: form.label || '—',
    rate_bps: rateBps,
    fixed_minor: form.fixed || '0',
    min_minor: form.min || null,
    max_minor: form.max || null,
    effective_from: new Date().toISOString(),
    effective_to: null,
    status: 'active',
    note: null,
  };

  async function save() {
    setBusy(true);
    setError(null);
    setDone(null);
    const { data, error: rpcError } = await client.rpc('set_market_charge', {
      p_kind: form.kind,
      p_country: form.country.trim().toUpperCase() || null,
      p_currency: form.currency.trim().toUpperCase() || null,
      p_label: form.label.trim(),
      p_rate_bps: rateBps,
      p_fixed_minor: Number(form.fixed || '0'),
      p_min_minor: form.min === '' ? null : Number(form.min),
      p_max_minor: form.max === '' ? null : Number(form.max),
      p_note: form.note.trim() || null,
    });

    if (rpcError) {
      setError(rpcError.message);
      setBusy(false);
      return;
    }

    const row = data as { id: string; label: string } | null;
    setDone(`${row?.label ?? 'The rule'} is live for new orders from today.`);
    setForm(blank);
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="stack">
      <div className="grid cols-2">
        <label>
          What kind of charge
          <select
            value={form.kind}
            onChange={(e) => set('kind', e.target.value as 'tax' | 'transfer_fee')}
            disabled={busy}
          >
            <option value="tax">Tax — a levy owed to a country</option>
            <option value="transfer_fee">Transfer fee — what it costs to move the money</option>
          </select>
        </label>
        <label>
          Name the payer reads
          <input
            value={form.label}
            onChange={(e) => set('label', e.target.value)}
            placeholder={form.kind === 'tax' ? 'VAT' : 'Mobile money fee'}
            disabled={busy}
          />
        </label>
        <label>
          Country code (blank for every country)
          <input
            value={form.country}
            onChange={(e) => set('country', e.target.value.toUpperCase().slice(0, 2))}
            placeholder="UG"
            maxLength={2}
            disabled={busy}
          />
        </label>
        <label>
          Currency (blank for any)
          <input
            value={form.currency}
            onChange={(e) => set('currency', e.target.value.toUpperCase().slice(0, 3))}
            placeholder="UGX"
            maxLength={3}
            disabled={busy}
          />
        </label>
        <label>
          Rate, as a percentage
          <input
            value={form.rate}
            onChange={(e) => set('rate', e.target.value)}
            inputMode="decimal"
            placeholder="18"
            disabled={busy}
          />
        </label>
        <label>
          Plus a fixed amount, in minor units
          <input
            value={form.fixed}
            onChange={(e) => set('fixed', e.target.value)}
            inputMode="numeric"
            placeholder="0"
            disabled={busy}
          />
        </label>
        <label>
          Never less than (minor units, optional)
          <input
            value={form.min}
            onChange={(e) => set('min', e.target.value)}
            inputMode="numeric"
            disabled={busy}
          />
        </label>
        <label>
          Never more than (minor units, optional)
          <input
            value={form.max}
            onChange={(e) => set('max', e.target.value)}
            inputMode="numeric"
            disabled={busy}
          />
        </label>
      </div>

      <label>
        Why this exists (read by whoever answers the support case)
        <input
          value={form.note}
          onChange={(e) => set('note', e.target.value)}
          placeholder="VAT registered from 1 November; certificate in the shared drive"
          disabled={busy}
        />
      </label>

      <p className="muted" style={{ margin: 0 }}>
        This will apply to <strong>{describeScope(preview)}</strong>, charged as{' '}
        <strong>{describeRate(rateBps, form.fixed)}</strong>. A rule with a country
        beats one without, and a rule with a currency beats one without — the same
        precedence prices use.
      </p>

      {error && <p className="notice error">{error}</p>}
      {done && <p className="notice">{done}</p>}

      <div>
        <button
          type="button"
          className="btn"
          style={{ width: 'auto' }}
          onClick={save}
          disabled={busy || form.label.trim() === ''}
        >
          {busy ? 'Saving…' : 'Make this rule live'}
        </button>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        There is no delete. A rule that has priced an order must keep explaining
        it, so a wrong rule is retired and a new one added.
      </p>
    </div>
  );
}
