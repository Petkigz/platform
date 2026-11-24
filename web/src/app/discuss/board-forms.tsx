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
  type BoardOutcome,
} from '@/lib/boards';

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
    if (['unconfirmed', 'not_found', 'not_allowed', 'closed', 'no_handle', 'blocked', 'handle_fixed'].includes(named)) {
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
