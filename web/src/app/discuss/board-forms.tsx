'use client';

import { useRef, useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';

import {
  BODY_MAX,
  HANDLE_MAX,
  REASON_MAX,
  TITLE_MAX,
  boardOutcomeOf,
  bodyFaultOf,
  handleFaultOf,
  reasonFaultOf,
  threadFaultOf,
  type Board,
  type BoardAgreement,
  type BoardOutcome,
} from '@/lib/boards';
import { AGREED_EVENT } from '@/lib/policy-notice';
import { policyOutcomeOf } from '@/lib/policy-outcome';

/** What the forms say, already in the reader's language. */
export type BoardWords = {
  nameField: string;
  nameSave: string;
  fieldTitle: string;
  fieldBody: string;
  send: string;
  report: string;
  reportField: string;
  reportSend: string;
  reported: string;
  takeBack: string;
  working: string;
  /** The request could not be made at all. */
  unreachable: string;
  reasons: Record<BoardOutcome, string>;
};

type Said = { tone: 'warn' | 'error' | 'info'; text: string } | null;

/**
 * One request to the boards route, and what to say about its answer.
 *
 * **A refusal is a name.** The route answers `{ ok: false, code }` with that
 * name's own status; `words.reasons` has the sentence. A name that arrives
 * with another status, or no name, is `unconfirmed`: the form says it does
 * not know, and the page is read again so the reader can see whether it was
 * done. Two presses in one moment are one request.
 */
function useAsk(words: BoardWords) {
  const router = useRouter();
  const asking = useRef(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said>(null);

  async function ask(payload: Record<string, unknown>): Promise<Record<string, unknown> | null> {
    if (asking.current) return null;
    asking.current = true;
    setBusy(true);
    setSaid(null);
    let res: Response;
    try {
      res = await fetch('/api/boards', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      setSaid({ tone: 'warn', text: words.unreachable });
      asking.current = false;
      setBusy(false);
      return null;
    }
    const json = (await res.json().catch(() => null)) as Record<string, unknown> | null;
    asking.current = false;
    setBusy(false);
    if (res.ok && json?.ok === true) return json;
    const named = res.ok ? 'unconfirmed' : boardOutcomeOf(res.status, json?.code);
    setSaid({ tone: named === 'refused' || named === 'unconfirmed' ? 'warn' : 'error', text: words.reasons[named] });
    // The page may be out of date: the post went, access ended, or it was done after all.
    if (['unconfirmed', 'not_found', 'not_allowed', 'agree_first', 'closed', 'no_handle', 'blocked', 'handle_fixed'].includes(named)) {
      router.refresh();
    }
    return null;
  }

  const refuse = (named: BoardOutcome) => setSaid({ tone: 'error', text: words.reasons[named] });
  return { ask, busy, said, setSaid, refuse, router };
}

function Notice({ said }: { said: Said }) {
  if (!said) return null;
  return (
    <div className={`notice ${said.tone}`} role={said.tone === 'error' ? 'alert' : 'status'} data-board-said={said.tone}>
      {said.text}
    </div>
  );
}

/** What the agreement box says, already in the reader's language. */
export type AgreeWords = {
  box: string;
  send: string;
  /** Pressed without the box ticked. */
  tick: string;
  working: string;
  unreachable: string;
  signedOut: string;
  /** The document was replaced while the page was open. */
  changed: string;
  failed: string;
  unsure: string;
};

/**
 * The box somebody ticks before they may choose a username or write.
 *
 * **It records an agreement to each document, by the version the page
 * named.** The record is made by the policies route (`accept_policy()`),
 * one request for each document, in the order they are listed. A document
 * replaced while this page was open is refused there, and nothing is
 * recorded for it.
 *
 * **It decides nothing.** Whether this account may write is the database's
 * answer, asked again when the page is read again, which happens after
 * every press: what is still owed is then listed with the versions in force
 * at that moment, and when nothing is, this box is not drawn.
 */
export function AgreeForm({ documents, words }: { documents: BoardAgreement[]; words: AgreeWords }) {
  const router = useRouter();
  const asking = useRef(false);
  const [ticked, setTicked] = useState(false);
  const [busy, setBusy] = useState(false);
  const [said, setSaid] = useState<Said>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!ticked) return setSaid({ tone: 'error', text: words.tick });
    if (asking.current) return;
    asking.current = true;
    setBusy(true);
    setSaid(null);

    let fault: Said = null;
    for (const document of documents) {
      let res: Response;
      try {
        res = await fetch('/api/policies', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ slug: document.slug, version: document.version }),
        });
      } catch {
        fault = { tone: 'warn', text: words.unreachable };
        break;
      }
      const json = (await res.json().catch(() => null)) as { ok?: unknown; reason?: unknown } | null;
      if (res.ok && json?.ok === true) {
        // The notice under the page stops telling about a document just agreed to.
        window.dispatchEvent(new CustomEvent(AGREED_EVENT, { detail: document.slug }));
        continue;
      }
      const named = res.ok ? 'unconfirmed' : policyOutcomeOf(res.status, json?.reason);
      fault =
        named === 'changed' || named === 'not_in_force' || named === 'not_found'
          ? { tone: 'error', text: words.changed }
          : named === 'not_signed_in'
            ? { tone: 'error', text: words.signedOut }
            : named === 'unconfirmed'
              ? { tone: 'warn', text: words.unsure }
              : { tone: 'warn', text: words.failed };
      // What comes after it in the list is not asked for: the reader is told about this one first.
      break;
    }

    asking.current = false;
    setBusy(false);
    setSaid(fault);
    router.refresh();
  }

  return (
    <form className="board-form" onSubmit={submit} noValidate data-board-form="agree">
      <label style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-start' }}>
        <input
          type="checkbox"
          name="agree"
          checked={ticked}
          onChange={(event) => setTicked(event.target.checked)}
          // The boards' forms stretch every input across the card; a tick box is not a line of text.
          style={{ inlineSize: '1.25rem', blockSize: '1.25rem', margin: '0.15rem 0 0', flex: 'none' }}
        />
        <span>{words.box}</span>
      </label>
      <button type="submit" className="btn" disabled={busy} aria-busy={busy}>
        {busy ? words.working : words.send}
      </button>
      <Notice said={said} />
    </form>
  );
}

/** Choosing the name you write under. */
export function HandleForm({ board, current, words }: { board: Board; current: string | null; words: BoardWords }) {
  const { ask, busy, said, refuse, router } = useAsk(words);
  const [handle, setHandle] = useState(current ?? '');

  async function submit(event: FormEvent) {
    event.preventDefault();
    // A space at either end is a slip of the thumb, not part of a name.
    const name = handle.trim();
    const fault = handleFaultOf(name);
    if (fault) return refuse(fault);
    const done = await ask({ action: 'handle', board, handle: name });
    if (done) router.refresh();
  }

  return (
    <form className="board-form" onSubmit={submit} noValidate data-board-form="handle">
      <label className="field">
        <span>{words.nameField}</span>
        <input
          type="text"
          name="handle"
          value={handle}
          onChange={(event) => setHandle(event.target.value)}
          maxLength={HANDLE_MAX + 8}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck={false}
          dir="auto"
        />
      </label>
      <button type="submit" className="btn" disabled={busy} aria-busy={busy}>
        {busy ? words.working : words.nameSave}
      </button>
      <Notice said={said} />
    </form>
  );
}

/** Starting a thread. */
export function ThreadForm({ board, words }: { board: Board; words: BoardWords }) {
  const { ask, busy, said, refuse, router } = useAsk(words);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const fault = threadFaultOf(title, body);
    if (fault) return refuse(fault);
    const done = await ask({ action: 'thread', board, title, body });
    if (done && typeof done.threadId === 'string') router.push(`/discuss/${board}/${done.threadId}`);
  }

  return (
    <form className="board-form" onSubmit={submit} noValidate data-board-form="thread">
      <label className="field">
        <span>{words.fieldTitle}</span>
        <input type="text" name="title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={TITLE_MAX} dir="auto" />
      </label>
      <label className="field">
        <span>{words.fieldBody}</span>
        <textarea name="body" rows={5} value={body} onChange={(event) => setBody(event.target.value)} maxLength={BODY_MAX} dir="auto" />
      </label>
      <button type="submit" className="btn" disabled={busy} aria-busy={busy}>
        {busy ? words.working : words.send}
      </button>
      <Notice said={said} />
    </form>
  );
}

/** Replying in a thread. */
export function ReplyForm({ threadId, words }: { threadId: string; words: BoardWords }) {
  const { ask, busy, said, refuse, router } = useAsk(words);
  const [body, setBody] = useState('');

  async function submit(event: FormEvent) {
    event.preventDefault();
    const fault = bodyFaultOf(body);
    if (fault) return refuse(fault);
    const done = await ask({ action: 'reply', threadId, body });
    if (done) {
      setBody('');
      router.refresh();
    }
  }

  return (
    <form className="board-form" onSubmit={submit} noValidate data-board-form="reply">
      <label className="field">
        <span>{words.fieldBody}</span>
        <textarea name="body" rows={4} value={body} onChange={(event) => setBody(event.target.value)} maxLength={BODY_MAX} dir="auto" />
      </label>
      <button type="submit" className="btn" disabled={busy} aria-busy={busy}>
        {busy ? words.working : words.send}
      </button>
      <Notice said={said} />
    </form>
  );
}

/**
 * Under a post: take it back if it is yours, report it if it is not.
 *
 * Reporting opens a box for the reason rather than sending at one press: a
 * report with no reason gives whoever reads the queue nothing to go on.
 */
export function PostActions({
  threadId,
  replyId,
  mine,
  words,
}: {
  threadId: string;
  replyId: string | null;
  mine: boolean;
  words: BoardWords;
}) {
  const { ask, busy, said, setSaid, refuse, router } = useAsk(words);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState('');
  const which = replyId ?? 'thread';

  async function takeBack() {
    const done = await ask({ action: 'withdraw', threadId, replyId });
    if (done) router.refresh();
  }

  async function report(event: FormEvent) {
    event.preventDefault();
    const fault = reasonFaultOf(reason);
    if (fault) return refuse(fault);
    const done = await ask({ action: 'report', threadId, replyId, reason });
    if (done) {
      setOpen(false);
      setReason('');
      setSaid({ tone: 'info', text: words.reported });
    }
  }

  if (mine) {
    return (
      <div className="board-actions" data-board-actions={which}>
        <button type="button" className="btn ghost" onClick={takeBack} disabled={busy} aria-busy={busy} data-board-button="withdraw">
          {busy ? words.working : words.takeBack}
        </button>
        <Notice said={said} />
      </div>
    );
  }

  return (
    <div className="board-actions" data-board-actions={which}>
      {open ? (
        <form className="board-form" onSubmit={report} noValidate data-board-form="report">
          <label className="field">
            <span>{words.reportField}</span>
            <textarea name="reason" rows={2} value={reason} onChange={(event) => setReason(event.target.value)} maxLength={REASON_MAX} dir="auto" />
          </label>
          <button type="submit" className="btn secondary" disabled={busy} aria-busy={busy}>
            {busy ? words.working : words.reportSend}
          </button>
        </form>
      ) : (
        <button type="button" className="btn ghost" onClick={() => { setSaid(null); setOpen(true); }} aria-expanded={false} data-board-button="report">
          {words.report}
        </button>
      )}
      <Notice said={said} />
    </div>
  );
}
