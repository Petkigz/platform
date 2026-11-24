import { NextResponse } from 'next/server';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  BOARD_ENGLISH,
  LOOK_REASON_MIN,
  boardOf,
  boardReasonOf,
  boardStatusOf,
  bodyFaultOf,
  handleFaultOf,
  isId,
  parseAuthor,
  reasonFaultOf,
  threadFaultOf,
  type BoardOutcome,
} from '@/lib/boards';

/**
 * Everything anybody does on a discussion board, in one place.
 *
 * Every rule is the database's: who is let in, that a username is taken once,
 * that a post is shown at once, who may take one down, and who may see the
 * account behind one. This route chooses the function, checks what was typed
 * so the reader is told which box is wrong, and turns a refusal into a name.
 *
 * **A refusal is `{ ok: false, code }`** with that name's own status
 * (`lib/boards.ts`) and an English sentence for a caller with no words of its
 * own. The database's text is logged and sent to nobody.
 *
 * **Nothing a member's action answers carries an account.** `author` is the
 * one action that does. It is the staff desk's; the database refuses it to
 * anybody else, asks for a reason, and writes the look to the audit log
 * before it answers.
 */
export async function POST(request: Request) {
  const named = (code: BoardOutcome) =>
    NextResponse.json({ ok: false, code, message: BOARD_ENGLISH[code] }, { status: boardStatusOf(code) });

  if (!isSupabaseConfigured()) return named('refused');

  let raw: unknown;
  try {
    raw = await request.json();
  } catch {
    return named('refused');
  }
  const body = (raw && typeof raw === 'object' && !Array.isArray(raw) ? raw : {}) as Record<string, unknown>;
  const action = typeof body.action === 'string' ? body.action : '';
  const str = (value: unknown): string => (typeof value === 'string' ? value : '');

  const supabase = await createClient();
  const user = await supabase.auth.getUser().then(
    (r) => r.data.user,
    () => null,
  );
  if (!user) return named('not_signed_in');

  const ask = async (fn: string, args: Record<string, unknown>) => {
    const asked = await supabase.rpc(fn, args).then(
      (r) => r,
      () => ({ data: null, error: { code: null, message: 'the request could not be made' } }),
    );
    if (asked.error) {
      const code = boardReasonOf(asked.error);
      if (code === 'refused' || code === 'unconfirmed') {
        console.error(`boards: ${action} was not done:`, asked.error.message);
      }
      return { refusal: named(code), data: null };
    }
    return { refusal: null, data: asked.data as Record<string, unknown> | null };
  };

  // A reply is named with its thread. No reply named means the thread's first post.
  const threadId = body.threadId;
  const replyId = body.replyId === undefined || body.replyId === null ? null : body.replyId;
  const post = isId(threadId) && (replyId === null || isId(replyId)) ? { threadId, replyId: replyId as string | null } : null;

  if (action === 'handle') {
    const board = boardOf(body.board);
    if (!board) return named('not_found');
    const handle = str(body.handle);
    const fault = handleFaultOf(handle);
    if (fault) return named(fault);
    const { refusal, data } = await ask('set_board_handle', { p_board: board, p_handle: handle });
    if (refusal) return refusal;
    if (data?.handle !== handle) return named('unconfirmed');
    return NextResponse.json({ ok: true, handle });
  }

  if (action === 'thread') {
    const board = boardOf(body.board);
    if (!board) return named('not_found');
    const title = str(body.title).trim();
    const words = str(body.body).trim();
    const fault = threadFaultOf(title, words);
    if (fault) return named(fault);
    const { refusal, data } = await ask('post_board_thread', { p_board: board, p_title: title, p_body: words });
    if (refusal) return refusal;
    if (!isId(data?.threadId)) return named('unconfirmed');
    return NextResponse.json({ ok: true, threadId: data.threadId });
  }

  if (action === 'reply') {
    if (!isId(threadId)) return named('not_found');
    const words = str(body.body).trim();
    const fault = bodyFaultOf(words);
    if (fault) return named(fault);
    const { refusal, data } = await ask('post_board_reply', { p_thread: threadId, p_body: words });
    if (refusal) return refusal;
    if (!isId(data?.replyId)) return named('unconfirmed');
    return NextResponse.json({ ok: true, replyId: data.replyId });
  }

  if (action === 'withdraw') {
    if (!post) return named('not_found');
    const { refusal, data } = await ask('withdraw_board_post', { p_thread: post.threadId, p_reply: post.replyId });
    if (refusal) return refusal;
    if (typeof data?.state !== 'string') return named('unconfirmed');
    return NextResponse.json({ ok: true, state: data.state });
  }

  if (action === 'report') {
    if (!post) return named('not_found');
    const reason = str(body.reason).trim();
    const fault = reasonFaultOf(reason);
    if (fault) return named(fault);
    const { refusal, data } = await ask('report_board_post', {
      p_thread: post.threadId,
      p_reply: post.replyId,
      p_reason: reason,
    });
    if (refusal) return refusal;
    if (data?.reported !== true) return named('unconfirmed');
    return NextResponse.json({ ok: true });
  }

  // ---- The staff desk. The database refuses each of these to anybody else. ----

  if (action === 'moderate') {
    if (!post || typeof body.remove !== 'boolean') return named('not_found');
    const reason = str(body.reason).trim();
    if ([...reason].length < 4) return named('reason_required');
    const { refusal, data } = await ask('moderate_board_post', {
      p_thread: post.threadId,
      p_reply: post.replyId,
      p_remove: body.remove,
      p_reason: reason,
    });
    if (refusal) return refusal;
    if (typeof data?.removed !== 'boolean') return named('unconfirmed');
    return NextResponse.json({ ok: true, removed: data.removed });
  }

  if (action === 'block') {
    if (!isId(body.handleId) || typeof body.block !== 'boolean') return named('not_found');
    const reason = str(body.reason).trim();
    if ([...reason].length < 4) return named('reason_required');
    const { refusal, data } = await ask('block_board_handle', {
      p_handle: body.handleId,
      p_block: body.block,
      p_reason: reason,
    });
    if (refusal) return refusal;
    if (typeof data?.blocked !== 'boolean') return named('unconfirmed');
    return NextResponse.json({ ok: true, blocked: data.blocked });
  }

  if (action === 'author') {
    if (!post) return named('not_found');
    const reason = str(body.reason).trim();
    if ([...reason].length < LOOK_REASON_MIN) return named('reason_required');
    const { refusal, data } = await ask('board_author', {
      p_thread: post.threadId,
      p_reply: post.replyId,
      p_reason: reason,
    });
    if (refusal) return refusal;
    const author = parseAuthor(data);
    if (!author) return named('unconfirmed');
    return NextResponse.json({ ok: true, author }, { headers: { 'cache-control': 'no-store' } });
  }

  return named('not_found');
}
