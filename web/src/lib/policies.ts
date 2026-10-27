/**
 * The policy register, as the screens read it.
 *
 * Three things matter here more than usual for a small view model.
 *
 * **A draft is not a term.** The public list shows every document that exists
 * and marks the ones that are not in force, because a page that hid them would
 * let somebody believe the platform had no policy rather than no *approved* one.
 * The text of an unapproved draft is never shown: it can change, and an
 * agreement to a text that then changes is not an agreement.
 *
 * **The refusal is part of the feature.** A draft carries `[OWNER DECISION: …]`
 * where the law, the controller or a named person is required, and the database
 * refuses to publish one while any remain. The editor counts them in the browser
 * as somebody types, so the refusal is seen before the click rather than after
 * it — and `publishRefusal()` names the count rather than saying "invalid".
 *
 * **Body text is markdown-lite on purpose.** `## heading`, blank-line-separated
 * paragraphs, and a decision block. Nothing else. A policy is read, not styled,
 * and a parser that supports images and raw HTML in a legal document would be
 * asking for trouble it does not need.
 */

export type PolicyAudience = 'everyone' | 'child' | 'teacher' | 'institution';

export type PolicyDocumentRow = {
  slug: string;
  title: string;
  summary: string | null;
  audience: string;
  acceptance_required: boolean;
  sort_order?: number;
};

/** One document as `policies_in_force()` shapes it. */
export type PolicyInForce = {
  slug: string;
  title: string;
  summary: string | null;
  audience: string;
  acceptanceRequired: boolean;
  versionNumber: number;
  effectiveAt: string;
  changeNote: string | null;
};

/** One document plus its live text, as `policy_page()` shapes it. */
export type PolicyPageView = PolicyInForce & { body: string };

/** One row of what this account has agreed to, or still owes. */
export type StandingRow = {
  slug: string;
  title: string;
  versionNumber: number;
  effectiveAt: string;
  acceptedAt: string | null;
};

export type PolicyStanding = {
  acceptanceRequired: StandingRow[];
  outstanding: number;
  history: { slug: string; title: string; versionNumber: number; acceptedAt: string }[];
};

const AUDIENCE_LABELS: Record<string, string> = {
  everyone: 'Everyone',
  child: 'Children and their guardians',
  teacher: 'Teachers',
  institution: 'Institutions',
};

export function audienceLabel(audience: string | null | undefined): string {
  return AUDIENCE_LABELS[String(audience ?? '')] ?? 'Everyone';
}

/** A document is in force only when there is a live version behind it. */
export function isInForce(live: { versionNumber?: number | null } | null | undefined): boolean {
  return typeof live?.versionNumber === 'number' && live.versionNumber > 0;
}

/** What a list card says about one document. Never claims more than is true. */
export function statusNote(
  live: { versionNumber?: number | null; effectiveAt?: string | null } | null | undefined,
): string {
  if (!isInForce(live)) return 'Not in force yet';
  return liveLine({
    versionNumber: Number(live?.versionNumber),
    effectiveAt: live?.effectiveAt ?? null,
  });
}

export function liveLine(live: { versionNumber: number; effectiveAt: string | null }): string {
  const date = (live.effectiveAt ?? '').slice(0, 10);
  return date
    ? `Version ${live.versionNumber}, in force from ${date}`
    : `Version ${live.versionNumber}, in force`;
}

/** The sentence over the account page prompt. Silent when nothing is owed. */
export function outstandingSentence(outstanding: number): string {
  if (outstanding <= 0) return 'Nothing is waiting for your agreement.';
  if (outstanding === 1) return 'One document is waiting for your agreement.';
  return `${outstanding} documents are waiting for your agreement.`;
}

/** What the button on a document page says. */
export function acceptanceLabel(acceptedAt: string | null | undefined): string {
  if (!acceptedAt) return 'Agree to this version';
  return `Agreed on ${String(acceptedAt).slice(0, 10)}`;
}

// ---------------------------------------------------------------------------
// The text
// ---------------------------------------------------------------------------

export type BodyBlock =
  | { kind: 'heading'; text: string }
  | { kind: 'text'; text: string }
  | { kind: 'decision'; text: string };

const DECISION = /\[OWNER DECISION/;

/**
 * How many questions the owner has not answered yet.
 *
 * Mirrors `policy_open_decisions()` in SQL, which is the count that actually
 * refuses the publication. This one exists so the number is visible while
 * typing; the database's is the one that decides.
 */
export function decisionCount(body: string | null | undefined): number {
  return (String(body ?? '').match(/\[OWNER DECISION/g) ?? []).length;
}

export function canPublish(openDecisions: number): boolean {
  return openDecisions === 0;
}

/**
 * Why publishing is refused, in words that name the number.
 *
 * "Invalid" teaches nobody anything, and the person reading this is the one
 * person able to fix it.
 */
export function publishRefusal(openDecisions: number): string {
  if (openDecisions <= 0) return 'Nothing is blocking this version.';
  const subject = openDecisions === 1 ? 'one owner decision' : `${openDecisions} owner decisions`;
  return `Not publishable yet: ${subject} ${openDecisions === 1 ? 'is' : 'are'} still marked in the text. `
    + 'Answer each `[OWNER DECISION: …]` in the body — the database refuses to put a document in '
    + 'force while its governing law, its controller or a named person is still a placeholder.';
}

/**
 * Split a body into what a reader sees.
 *
 * A decision block is kept whole and flattened onto one line so it cannot be
 * mistaken for a paragraph of the policy — on the public page it is not shown
 * at all, but the editor renders it in a colour that says "unanswered".
 */
export function bodyBlocks(body: string | null | undefined): BodyBlock[] {
  const text = String(body ?? '').replace(/\r\n/g, '\n').trim();
  if (!text) return [];
  const chunks = text.split(/\n{2,}/).map((raw) => raw.trim()).filter(Boolean);
  const blocks: BodyBlock[] = [];
  for (let i = 0; i < chunks.length; i += 1) {
    let block = chunks[i] ?? '';
    if (DECISION.test(block)) {
      // A marker may have been written across a blank line. Keep reading until
      // the bracket closes, so the answer owed cannot hide inside two blocks.
      while (!block.includes(']') && i + 1 < chunks.length) {
        i += 1;
        block += ' ' + (chunks[i] ?? '');
      }
      blocks.push({ kind: 'decision', text: block.replace(/\s*\n\s*/g, ' ') });
      continue;
    }
    if (block.startsWith('## ')) {
      blocks.push({ kind: 'heading', text: block.slice(3).trim() });
    } else if (block.startsWith('# ')) {
      blocks.push({ kind: 'heading', text: block.slice(2).trim() });
    } else {
      blocks.push({ kind: 'text', text: block });
    }
  }
  return blocks;
}

/**
 * The body a reader is allowed to see: decisions removed.
 *
 * This is a second line of defence. The database refuses to publish a draft
 * that carries one, so a live body should never contain one — but if that guard
 * were ever lost, showing an unanswered question as though it were a term is
 * the worst failure this feature has, so the reader's view strips it regardless.
 */
export function readableBlocks(body: string | null | undefined): BodyBlock[] {
  return bodyBlocks(body).filter((block) => block.kind !== 'decision');
}

// ---------------------------------------------------------------------------
// The owner's editor
// ---------------------------------------------------------------------------

/** One version as `policy_register()` reports it. */
export type VersionRow = {
  id: string;
  versionNumber: number;
  status: 'draft' | 'in_force' | 'retired' | string;
  effectiveAt: string | null;
  approvedAt: string | null;
  openDecisions: number;
};

export type RegisterDocument = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  audience: string;
  acceptanceRequired: boolean;
  live: {
    versionNumber: number;
    effectiveAt: string;
    approvedAt: string;
    approvalReason: string;
  } | null;
  acceptedAccounts: number;
  draft: {
    id: string;
    versionNumber: number;
    openDecisions: number;
    changeNote: string;
    createdAt: string;
  } | null;
  versions: VersionRow[];
};

export type PolicyRegister = {
  documents: RegisterDocument[];
  counts: { documents: number; inForce: number; drafts: number; openDecisions: number };
};

/**
 * Which documents are blocked: unapproved, or a draft that still has an
 * unanswered question. Worst first, because that is the order they cost time in.
 *
 * A document that is already in force and has a clean draft beside it is not in
 * here. Publishing that is a choice, not a repair.
 */
export function documentsNeedingWork(register: PolicyRegister | null): RegisterDocument[] {
  if (!register) return [];
  return [...register.documents]
    .filter((doc) => !doc.live || (doc.draft?.openDecisions ?? 0) > 0)
    .sort((a, b) => (b.draft?.openDecisions ?? 0) - (a.draft?.openDecisions ?? 0));
}

/** Drafts that could go in force right now, if the owner decides to. */
export function readyToPublish(register: PolicyRegister | null): RegisterDocument[] {
  if (!register) return [];
  return register.documents.filter(
    (doc) => doc.draft !== null && (doc.draft?.openDecisions ?? 0) === 0);
}

/** What the editor says about one document before anybody opens it. */
export function draftNote(doc: RegisterDocument): string {
  if (!doc.draft) return doc.live ? 'In force. No draft waiting.' : 'No draft yet.';
  const open = doc.draft.openDecisions;
  const version = `Draft version ${doc.draft.versionNumber}`;
  if (open === 0) return `${version}, ready to publish.`;
  return `${version}, ${open === 1 ? 'one decision' : `${open} decisions`} still open.`;
}

/**
 * Turn a database refusal into something a person can act on.
 *
 * The functions raise `policy:<condition>` rather than a sentence, so the wording
 * lives here — in one place, tested, and able to name the missing thing instead
 * of showing PostgREST's `violates check constraint`.
 */
export function describePolicyError(message: string | null | undefined): string {
  const text = String(message ?? '').trim();
  if (text.includes('policy:decisions_open')) {
    return 'That draft still marks an owner decision as unanswered. The database refuses to '
      + 'publish a document while its law, its controller or a named person is a placeholder.';
  }
  if (text.includes('policy:reason_required')) {
    return 'Write the reason this version is being put in force. It is kept with the version.';
  }
  if (text.includes('policy:change_note_required')) {
    return 'Say what changed, in one line. A version nobody can describe is one nobody can review.';
  }
  if (text.includes('policy:body_too_short')) {
    return 'The text is too short to be a policy. A body needs at least a couple of paragraphs.';
  }
  if (text.includes('policy:not_allowed')) {
    return 'Only the platform owner can publish a policy. You can read the register, not change it.';
  }
  if (text.includes('policy:not_in_force')) {
    return 'That document is not in force yet, so there is nothing to agree to.';
  }
  if (text.includes('policy:not_found')) return 'That document does not exist.';
  if (text.includes('policy:already_decided')) {
    return 'That version has already been decided. Write a new draft instead of rewriting this one.';
  }
  if (text.includes('policy:not_signed_in')) return 'Sign in first.';
  return text || 'Something went wrong. Nothing was changed.';
}

/** The approval reason is mandatory; the screen says so before the click. */
export function approvalProblem(reason: string, effective: string): string | null {
  if (!reason.trim()) return 'Write the reason this version is being put in force.';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(effective.trim())) {
    return 'Choose the date this version takes effect.';
  }
  return null;
}
