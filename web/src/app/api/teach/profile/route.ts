import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { saveInstructorProfile, type InstructorProfileInput } from '@/lib/instructor-profiles';

export async function POST(request: Request) {
  if (!isSupabaseConfigured())
    return NextResponse.json({ ok: false, message: 'Supabase is not configured.' }, { status: 503 });
  let raw: unknown;
  try { raw = await request.json(); }
  catch { return NextResponse.json({ ok: false, message: 'Malformed request.' }, { status: 400 }); }
  if (!raw || typeof raw !== 'object')
    return NextResponse.json({ ok: false, message: 'Profile details are required.' }, { status: 400 });
  const body = raw as Record<string, unknown>;
  const text = (key: string) => typeof body[key] === 'string' ? body[key] as string : '';
  if (typeof body.publish !== 'boolean')
    return NextResponse.json({ ok: false, message: 'Choose whether to save as draft or publish.' }, { status: 400 });
  const input: InstructorProfileInput = {
    slug: text('slug'), displayName: text('displayName'), headline: text('headline'),
    biography: text('biography'), websiteUrl: text('websiteUrl'), instagramUrl: text('instagramUrl'),
    youtubeUrl: text('youtubeUrl'), tiktokUrl: text('tiktokUrl'), facebookUrl: text('facebookUrl'),
    publish: body.publish,
  };
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ ok: false, message: 'Sign in first.' }, { status: 401 });
  const result = await saveInstructorProfile(supabase, input);
  if (!result.ok) {
    const status = /active instructor role/i.test(result.message) ? 403
      : /already in use/i.test(result.message) ? 409 : 400;
    return NextResponse.json(result, { status });
  }
  return NextResponse.json(result, { status: 200 });
}
