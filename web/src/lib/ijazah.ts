/**
 * Ijazah authorisations, as the screens say them.
 *
 * The database decides everything here: who may record one, that a row cannot be
 * edited, and that the evidence never travels back to the holder. This module
 * only turns a row into a sentence and a refusal into something a person can act
 * on — and, most importantly, keeps the vocabulary honest. **A record is not a
 * verification**, and no sentence in this file is allowed to suggest that the
 * platform checked a chain of transmission.
 */

export type Authorisation = {
  id: string;
  grantedBy: string;
  grantedOn: string | null;
  scope: string;
  chain: string | null;
  status: 'recorded' | 'withdrawn';
  recordedAt: string;
  withdrawnAt: string | null;
  withdrawnReason: string | null;
};

export type RegisterRow = Authorisation & {
  granteeUserId: string;
  displayName: string | null;
  hasEvidence: boolean;
};

export type Register = {
  authorisations: RegisterRow[];
  candidates: { userId: string; displayName: string | null }[];
};

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

function day(value: unknown): string | null {
  const raw = text(value);
  if (!raw) return null;
  const parsed = new Date(raw);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toISOString().slice(0, 10);
}

/** Read the function's reply defensively; a malformed row is dropped, not drawn. */
export function parseAuthorisations(data: unknown): Authorisation[] {
  if (!Array.isArray(data)) return [];
  return data.flatMap((raw): Authorisation[] => {
    if (!raw || typeof raw !== 'object') return [];
    const row = raw as Record<string, unknown>;
    const id = text(row.id);
    const grantedBy = text(row.grantedBy);
    const scope = text(row.scope);
    if (!id || !grantedBy || !scope) return [];
    return [{
      id,
      grantedBy,
      scope,
      grantedOn: day(row.grantedOn),
      chain: text(row.chain),
      status: row.status === 'withdrawn' ? 'withdrawn' : 'recorded',
      recordedAt: text(row.recordedAt) ?? '',
      withdrawnAt: text(row.withdrawnAt),
      withdrawnReason: text(row.withdrawnReason),
    }];
  });
}

/** "12 April 2019" — or nothing, because an old authorisation often has no day. */
export function grantedOnSentence(iso: string | null): string | null {
  if (!iso) return null;
  const parsed = new Date(`${iso}T00:00:00Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  return parsed.toLocaleDateString('en-GB', {
    day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC',
  });
}

/**
 * One authorisation in a line.
 *
 * *"Ḥafṣ ʿan ʿĀṣim, full recitation — granted by Shaykh Abdallāh al-Yūsufī, 12
 * April 2019."* The scope and the grantor are quoted as they were written: they
 * are somebody's own words about their own tradition, and a paraphrase here would
 * be the platform editing a scholar.
 */
export function authorisationLine(a: Authorisation): string {
  const when = grantedOnSentence(a.grantedOn);
  const base = `${a.scope} — granted by ${a.grantedBy}`;
  return when ? `${base}, ${when}.` : `${base}.`;
}

/**
 * What the record is, in the words the register has to keep saying.
 *
 * This is the sentence that stops a record from reading as a verification. It is
 * exported rather than written into one page so that every screen that shows an
 * authorisation shows the same caveat — the teacher's own page and the owner's
 * register cannot drift into two different claims about what this is.
 */
export const IJAZAH_CAVEAT =
  'This is a record, not a verification. The platform owner wrote down who granted ' +
  'it, for what, and what they were shown; nobody here has checked the chain of ' +
  'transmission, and no learner can see it. A scholarly panel may review these one ' +
  'day, and it would add its judgement beside this record rather than replace it.';

/** A refusal from the database, in a sentence. Unknown codes never leak through. */
export function ijazahSentence(code: string | null | undefined): string {
  const value = (code ?? '').toLowerCase();
  if (value.includes('ijazah:disabled')) {
    return 'Recording ijazahs is switched off for this platform just now. Nothing was changed.';
  }
  if (value.includes('ijazah:owner_only')) {
    return 'Only the platform owner records an ijazah.';
  }
  if (value.includes('ijazah:staff_only')) {
    return 'That register is for staff.';
  }
  if (value.includes('ijazah:needs_grantor')) {
    return 'Say who granted it, in their own name.';
  }
  if (value.includes('ijazah:needs_scope')) {
    return 'Say what it authorises — a text, a recitation, a science.';
  }
  if (value.includes('ijazah:needs_evidence')) {
    return 'Say what you were shown. A record with no evidence is a claim.';
  }
  if (value.includes('ijazah:needs_reason')) {
    return 'Give a reason for withdrawing it — the record keeps it.';
  }
  if (value.includes('ijazah:future_date')) {
    return 'An authorisation cannot have been granted in the future.';
  }
  if (value.includes('ijazah:already_recorded')) {
    return 'That authorisation is already recorded for this person. Withdraw the old one first if it changed.';
  }
  if (value.includes('ijazah:not_found')) {
    return 'That record could not be found.';
  }
  if (value.includes('ijazah:no_such_person')) {
    return 'Choose the person who holds it.';
  }
  return 'That could not be saved. Nothing was changed — please try again.';
}
