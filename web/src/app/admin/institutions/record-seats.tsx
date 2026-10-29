'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

/**
 * Recording a school's purchase.
 *
 * This is the whole of "checkout" for an institution: there is no payment
 * provider, so a member of staff writes down what was agreed against the invoice
 * reference, and the seats exist. The form asks for a reason as well as an
 * invoice, because two years from now "why did this school get thirty seats" is a
 * different question from "which transfer was it".
 *
 * The price is optional on purpose. A bursary or a pilot is a real arrangement,
 * and refusing the order because nobody typed a number would push somebody into
 * writing zero — which is a claim about money rather than an absence of one.
 */
export function RecordSeats({
  institutions,
  courses,
}: {
  institutions: { id: string; name: string }[];
  courses: { id: string; title: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);

  const [institutionId, setInstitutionId] = useState(institutions[0]?.id ?? '');
  const [courseId, setCourseId] = useState(courses[0]?.id ?? '');
  const [seats, setSeats] = useState('1');
  const [invoiceReference, setInvoiceReference] = useState('');
  const [unitPrice, setUnitPrice] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [note, setNote] = useState('');
  const [reason, setReason] = useState('');

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    try {
      const res = await fetch('/api/institution', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          action: 'recordSeats',
          institutionId,
          courseId,
          seats: Number(seats),
          invoiceReference,
          unitPrice: unitPrice.trim() === '' ? null : Number(unitPrice),
          currency: unitPrice.trim() === '' ? null : currency,
          note,
          reason,
        }),
      });
      const out = (await res.json()) as { ok?: boolean; message?: string; seats?: number };
      if (!out.ok) {
        setError(out.message ?? 'That did not work.');
        return;
      }
      setDone(`${String(out.seats ?? seats)} seats recorded. The school can issue the codes now.`);
      setInvoiceReference('');
      setUnitPrice('');
      setNote('');
      setReason('');
      startTransition(() => router.refresh());
    } catch {
      setError('The request could not be sent. Nothing was recorded.');
    } finally {
      setBusy(false);
    }
  }

  if (institutions.length === 0) {
    return (
      <p className="muted">
        Open an institution first — seats belong to one, and there is nowhere to put them yet.
      </p>
    );
  }

  if (courses.length === 0) {
    return (
      <p className="muted">
        There is no active course to sell yet. A course has to be active with a published version
        before seats can be bought for it.
      </p>
    );
  }

  return (
    <div>
      {!open ? (
        <button type="button" className="btn" onClick={() => setOpen(true)}>
          Record a seat purchase
        </button>
      ) : (
        <form onSubmit={submit} style={{ maxWidth: '40rem' }}>
          <label htmlFor="seat-institution" style={{ display: 'block', marginBottom: '0.35rem' }}>
            Institution
          </label>
          <select
            id="seat-institution"
            value={institutionId}
            onChange={(event) => setInstitutionId(event.target.value)}
            style={{ width: '100%' }}
          >
            {institutions.map((row) => (
              <option key={row.id} value={row.id}>
                {row.name}
              </option>
            ))}
          </select>

          <label htmlFor="seat-course" style={{ display: 'block', margin: '0.75rem 0 0.35rem' }}>
            Course
          </label>
          <select
            id="seat-course"
            value={courseId}
            onChange={(event) => setCourseId(event.target.value)}
            style={{ width: '100%' }}
          >
            {courses.map((row) => (
              <option key={row.id} value={row.id}>
                {row.title}
              </option>
            ))}
          </select>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
            The newest published edition is pinned automatically — a seat buys an edition, not
            whatever the course becomes.
          </p>

          <label htmlFor="seat-count" style={{ display: 'block', margin: '0.75rem 0 0.35rem' }}>
            Seats
          </label>
          <input
            id="seat-count"
            type="number"
            min={1}
            max={500}
            value={seats}
            onChange={(event) => setSeats(event.target.value)}
            style={{ width: '8rem' }}
          />

          <label htmlFor="seat-invoice" style={{ display: 'block', margin: '0.75rem 0 0.35rem' }}>
            Invoice or transfer reference
          </label>
          <input
            id="seat-invoice"
            value={invoiceReference}
            onChange={(event) => setInvoiceReference(event.target.value)}
            placeholder="BR-2026-0041"
            style={{ width: '100%' }}
            required
          />

          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-end', marginTop: '0.75rem' }}>
            <div style={{ flex: 1 }}>
              <label htmlFor="seat-price" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Price per seat <span className="muted">(optional)</span>
              </label>
              <input
                id="seat-price"
                type="number"
                min={0}
                step="0.01"
                value={unitPrice}
                onChange={(event) => setUnitPrice(event.target.value)}
                placeholder="15.00"
                style={{ width: '100%' }}
              />
            </div>
            <div style={{ width: '7rem' }}>
              <label htmlFor="seat-currency" style={{ display: 'block', marginBottom: '0.35rem' }}>
                Currency
              </label>
              <input
                id="seat-currency"
                value={currency}
                onChange={(event) => setCurrency(event.target.value.toUpperCase().slice(0, 3))}
                style={{ width: '100%' }}
              />
            </div>
          </div>
          <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.35rem' }}>
            Leave both empty for a bursary or a pilot. A zero would be a claim about money nobody
            made.
          </p>

          <label htmlFor="seat-note" style={{ display: 'block', margin: '0.75rem 0 0.35rem' }}>
            Note <span className="muted">(optional, shown to the school)</span>
          </label>
          <input
            id="seat-note"
            value={note}
            onChange={(event) => setNote(event.target.value)}
            style={{ width: '100%' }}
          />

          <label htmlFor="seat-reason" style={{ display: 'block', margin: '0.75rem 0 0.35rem' }}>
            Why <span className="muted">(kept in the audit trail, not shown to the school)</span>
          </label>
          <input
            id="seat-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            style={{ width: '100%' }}
            required
          />

          {error && (
            <p className="notice error" role="alert" style={{ marginTop: '1rem' }}>
              {error}
            </p>
          )}
          {done && (
            <p className="notice" role="status" style={{ marginTop: '1rem' }}>
              {done}
            </p>
          )}

          <p style={{ marginTop: '1rem' }}>
            <button type="submit" className="btn" disabled={busy || pending}>
              {busy ? 'Recording…' : 'Record the purchase'}
            </button>{' '}
            <button type="button" className="btn secondary" onClick={() => setOpen(false)}>
              Cancel
            </button>
          </p>
        </form>
      )}
    </div>
  );
}
