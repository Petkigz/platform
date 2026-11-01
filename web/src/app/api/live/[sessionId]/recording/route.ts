import { NextResponse } from 'next/server';

import { isSupabaseConfigured } from '@/lib/env';
import { createClient } from '@/lib/supabase/server';

export const dynamic = 'force-dynamic';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

/**
 * The recording of a class: a redirect, and the only place the address appears.
 *
 * The address is not in the page. It is not in the session row — the two columns
 * that promised one were never written and are gone — and it is not in a table
 * any client can select. It reaches a browser exactly once, here, and only after
 * `live_recording_link()` has asked `can_watch_live_recording()` and raised
 * rather than answering null. So **a refusal and a class with no recording are
 * the same 404**, which is the whole reason the database raises instead of
 * returning null: a stranger must not be able to use the difference to find out
 * which classes were recorded.
 *
 * What this route cannot do is follow the address later. Once a browser has
 * visited the recording host, that host — and anything the teacher pasted, such
 * as a Drive or Zoom link — may well accept the URL from anybody. The platform
 * controls who is *given* the link, which is the part it owns; the class page
 * says so plainly rather than implying a lock it does not have.
 *
 * `no-referrer` on the way out, because the recording host has no business
 * learning the address of a page about a named class.
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ sessionId: string }> },
) {
  if (!isSupabaseConfigured()) {
    return new NextResponse('Recording links are not configured on this deployment.', {
      status: 503,
    });
  }

  const { sessionId } = await params;
  if (!UUID.test(sessionId)) {
    return new NextResponse('That recording is not available to you.', { status: 404 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.redirect(
      new URL(
        `/sign-in?next=${encodeURIComponent(`/live/${sessionId}`)}`,
        request.url,
      ),
    );
  }

  const { data, error } = await supabase.rpc('live_recording_link', { p_session_id: sessionId });

  if (error) {
    // `42501` is the database's insufficient_privilege: no recording, or not
    // yours, or the class was cancelled. All three are the same answer.
    if (error.code === '42501' || error.code === 'P0002') {
      return new NextResponse('That recording is not available to you.', { status: 404 });
    }
    return new NextResponse('The recording could not be opened just now.', { status: 500 });
  }

  const url = typeof data === 'string' ? data.trim() : '';
  // Belt and braces: the table's own check already refuses anything that is not
  // https, and a redirect is not the place to discover that it stopped.
  if (!/^https:\/\//i.test(url)) {
    return new NextResponse('The recording could not be opened just now.', { status: 500 });
  }

  const response = NextResponse.redirect(url, 302);
  response.headers.set('cache-control', 'private, no-store');
  response.headers.set('referrer-policy', 'no-referrer');
  response.headers.set('x-robots-tag', 'noindex');
  return response;
}
