'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { describeBounds, validateControlValue, type Control } from '@/lib/controls';

/**
 * One control, one form.
 *
 * The reason field is not decoration and is not folded into the value: these are
 * the numbers that decide what a family can ask for, what a teacher may store and
 * how many people must agree before a course teaches anything. A change nobody
 * can explain later is not a policy.
 *
 * The value is validated here so a typo costs no round trip, and again in the
 * database, which is the boundary that matters.
 */
export function ControlForm({ control }: { control: Control }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [value, setValue] = useState(control.value);
  const [reason, setReason] = useState('');
  const [message, setMessage] = useState<string | null>(null);
  const [tone, setTone] = useState<'info' | 'error'>('info');

  const dirty = value.trim() !== control.value.trim();
  const localError = validateControlValue(control, value);

  async function submit() {
    setMessage(null);
    if (localError) {
      setTone('error');
      setMessage(localError);
      return;
    }

    const res = await fetch('/api/admin/controls', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: control.key, value, reason }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      error?: string;
      changed?: boolean;
      value?: string;
    };

    if (!res.ok) {
      setTone('error');
      setMessage(json.error ?? 'Could not save that.');
      return;
    }

    setTone('info');
    setReason('');
    setValue(json.value ?? value);
    setMessage(json.changed === false ? 'That was already the value — nothing changed.' : 'Saved.');
    startTransition(() => router.refresh());
  }

  return (
    <div
      className="card"
      style={{ padding: '1.25rem', marginBottom: '1rem', display: 'grid', gap: '0.6rem' }}
    >
      <div>
        <h3 style={{ margin: 0, fontSize: '1rem' }}>{control.label}</h3>
        <p className="muted" style={{ fontSize: '0.85rem', margin: '0.2rem 0 0' }}>
          {control.note}
        </p>
      </div>

      <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
        <code>{control.key}</code> · {describeBounds(control)}
        {control.updatedBy ? ` · last changed by ${control.updatedBy}` : ''}
      </p>

      <div>
        <label className="eyebrow" htmlFor={`ctl-${control.key}`}>
          Value
        </label>
        {control.valueType === 'boolean' ? (
          <select
            id={`ctl-${control.key}`}
            value={value === 'true' ? 'true' : 'false'}
            onChange={(e) => setValue(e.target.value)}
          >
            <option value="false">Off</option>
            <option value="true">On</option>
          </select>
        ) : (
          <input
            id={`ctl-${control.key}`}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            inputMode={control.valueType === 'integer' ? 'numeric' : undefined}
            placeholder={control.allowedPrefix ?? (control.valueType === 'integer' ? '0' : '')}
            autoComplete="off"
          />
        )}
      </div>

      <div>
        <label className="eyebrow" htmlFor={`why-${control.key}`}>
          Why, in writing
        </label>
        <input
          id={`why-${control.key}`}
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="What changed, and what you expect it to do"
          autoComplete="off"
        />
      </div>

      <div className="row" style={{ gap: '0.5rem', alignItems: 'center' }}>
        <button
          type="button"
          className="btn secondary"
          disabled={pending || !dirty || reason.trim().length < 4 || localError !== null}
          onClick={submit}
        >
          {pending ? 'Saving…' : 'Save'}
        </button>
        {control.value !== value ? (
          <button
            type="button"
            className="btn ghost"
            disabled={pending}
            onClick={() => { setValue(control.value); setMessage(null); }}
          >
            Undo
          </button>
        ) : null}
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          Now: <strong>{control.value === '' ? 'empty' : control.value}</strong>
          {control.unit && control.value !== '' ? ` ${control.unit}` : ''}
        </span>
      </div>

      {localError && dirty ? (
        <p className="muted" style={{ fontSize: '0.85rem', margin: 0 }}>{localError}</p>
      ) : null}

      {message && (
        <div className={`notice ${tone === 'error' ? 'error' : ''}`} role="status" style={{ margin: 0 }}>
          {message}
        </div>
      )}
    </div>
  );
}
