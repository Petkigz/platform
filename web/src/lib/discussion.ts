/**
 * Per-lesson discussion.
 *
 * The moderation rule, settled before this was built: a post by the course
 * author or by staff is visible immediately; anything a learner writes — a
 * question or a peer's answer — is held until a person approves it.
 *
 * None of that is enforced here. The insert trigger computes who the author is
 * and overwrites whatever `visibility_state` the caller supplied, so this file
 * cannot publish a learner's post even by trying. What this file does is shape
 * the request and read back what the database decided.
 *
 * That division is deliberate: a moderation model implemented in the
 * application layer is a moderation model that stops working the moment someone
 * adds a second caller.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type VisibilityState = 'pending' | 'visible' | 'hidden' | 'removed';

export type DiscussionPost = {
  id: string;
  lessonId: string;
  parentId: string | null;
  authorName: string;
  authorIsMe: boolean;
  /** True when the author is the course author or staff. */
  isAuthority: boolean;
  body: string;
  visibilityState: VisibilityState;
  createdAt: string;
  replies: DiscussionPost[];
};

type PostRow = {
  id: string;
  lesson_id: string;
  parent_id: string | null;
  author_user_id: string;
  body: string;
  visibility_state: string;
  author_kind: string;
  created_at: string;
  user_profiles: { display_name: string }[] | null;
};

/**
 * The thread for one lesson, as the caller is allowed to see it.
 *
 * RLS does the narrowing: published posts, plus the caller's own held ones. A
 * learner therefore sees their own question sitting at "awaiting review" and
 * not everyone else's — which is what stops "where did my post go?" without
 * turning the queue into a public list.
 */
export async function fetchThread(
  supabase: SupabaseClient,
  args: { lessonId: string; myUserId: string },
): Promise<DiscussionPost[]> {
  const { data, error } = await supabase
    .from('discussion_posts')
    .select(
      'id, lesson_id, parent_id, author_user_id, body, visibility_state, ' +
        'author_kind, created_at, user_profiles ( display_name )',
    )
    .eq('lesson_id', args.lessonId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as unknown as PostRow[];

  const toPost = (r: PostRow): DiscussionPost => ({
    id: r.id,
    lessonId: r.lesson_id,
    parentId: r.parent_id,
    authorName: r.user_profiles?.[0]?.display_name ?? 'Someone',
    authorIsMe: r.author_user_id === args.myUserId,
    isAuthority: r.author_kind === 'teacher',
    body: r.body,
    visibilityState: r.visibility_state as VisibilityState,
    createdAt: r.created_at,
    replies: [],
  });

  // Two levels: questions, then their replies. A reply whose parent is not in
  // the visible set is dropped rather than orphaned — its parent was held or
  // withdrawn, so showing the reply alone would quote something invisible.
  const byId = new Map<string, DiscussionPost>();
  const roots: DiscussionPost[] = [];

  for (const r of rows.filter((x) => x.parent_id === null)) {
    const p = toPost(r);
    byId.set(p.id, p);
    roots.push(p);
  }
  for (const r of rows.filter((x) => x.parent_id !== null)) {
    const parent = r.parent_id ? byId.get(r.parent_id) : undefined;
    if (parent) parent.replies.push(toPost(r));
  }

  return roots;
}

export type PostOutcome =
  | { ok: true; id: string; held: boolean }
  | { ok: false; message: string };

/**
 * Post a question or a reply.
 *
 * `held` is read back from the row rather than assumed, because whether a post
 * is held is the database's decision and the UI has to tell the truth about
 * it. Telling a learner "posted!" when it is sitting in a review queue is how
 * someone concludes the site is broken.
 */
export async function postToDiscussion(
  supabase: SupabaseClient,
  args: { lessonId: string; body: string; parentId?: string | null },
): Promise<PostOutcome> {
  const body = args.body.trim();
  if (body.length === 0) {
    return { ok: false, message: 'Write something first.' };
  }

  const { data, error } = await supabase
    .from('discussion_posts')
    .insert({
      lesson_id: args.lessonId,
      parent_id: args.parentId ?? null,
      body,
    })
    .select('id, visibility_state')
    .single();

  if (error) {
    // The flag gate and the moderation trigger both surface as check
    // violations. Neither is the caller's fault, and neither should read like
    // a validation error.
    if (error.code === '23514') {
      return {
        ok: false,
        message:
          'Discussion is not open on this lesson right now.',
      };
    }
    return { ok: false, message: error.message };
  }

  const row = data as { id: string; visibility_state: string } | null;
  if (!row) return { ok: false, message: 'The post was not saved.' };

  return { ok: true, id: row.id, held: row.visibility_state === 'pending' };
}

export type QueueItem = {
  id: string;
  body: string;
  authorName: string;
  lessonTitle: string;
  createdAt: string;
  isReply: boolean;
};

/** The moderation queue: learner posts waiting on a person. */
export async function fetchModerationQueue(
  supabase: SupabaseClient,
  limit = 50,
): Promise<QueueItem[]> {
  const { data, error } = await supabase
    .from('discussion_posts')
    .select(
      'id, body, parent_id, created_at, author_user_id, ' +
        'user_profiles ( display_name ), lessons ( title )',
    )
    .eq('visibility_state', 'pending')
    .is('deleted_at', null)
    .order('created_at', { ascending: true })
    .limit(limit);

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    body: string;
    parent_id: string | null;
    created_at: string;
    user_profiles: { display_name: string }[] | null;
    lessons: { title: string }[] | null;
  };

  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    body: r.body,
    authorName: r.user_profiles?.[0]?.display_name ?? 'Someone',
    lessonTitle: r.lessons?.[0]?.title ?? 'Unknown lesson',
    createdAt: r.created_at,
    isReply: r.parent_id !== null,
  }));
}

export type ModerationOutcome = { ok: true } | { ok: false; message: string };

export async function moderatePost(
  supabase: SupabaseClient,
  args: { postId: string; state: 'visible' | 'hidden' | 'removed'; note?: string },
): Promise<ModerationOutcome> {
  // The function requires a written reason before withdrawing anything. Saying
  // so here gives the reviewer a sentence rather than a database error.
  if (args.state !== 'visible' && (args.note ?? '').trim().length === 0) {
    return { ok: false, message: 'Withdrawing a post needs a written reason.' };
  }

  const { error } = await supabase.rpc('moderate_discussion_post', {
    p_post_id: args.postId,
    p_state: args.state,
    p_note: args.note ?? null,
  });

  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
