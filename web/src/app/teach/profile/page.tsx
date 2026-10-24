import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export default async function TeacherProfilePage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/teach/profile');

  const [profileResult, publicEnabled] = await Promise.all([
    supabase.from('instructor_public_profiles')
      .select('id,user_id,slug,display_name,headline,biography,website_url,instagram_url,youtube_url,tiktok_url,facebook_url,status')
      .eq('user_id', user.id).maybeSingle(),
    isFlagEnabled(supabase, 'teaching.public_profile'),
  ]);
  if (profileResult.error) throw new Error(profileResult.error.message);
  const profile = profileResult.data as unknown as {
    slug: string; display_name: string; headline: string | null; biography: string | null;
    website_url: string | null; instagram_url: string | null; youtube_url: string | null;
    tiktok_url: string | null; facebook_url: string | null; status: string;
  } | null;
  const initial = {
    slug: profile?.slug ?? '',
    displayName: profile?.display_name ?? '',
    headline: profile?.headline ?? '',
    biography: profile?.biography ?? '',
    websiteUrl: profile?.website_url ?? '',
    instagramUrl: profile?.instagram_url ?? '',
    youtubeUrl: profile?.youtube_url ?? '',
    tiktokUrl: profile?.tiktok_url ?? '',
    facebookUrl: profile?.facebook_url ?? '',
    publish: profile?.status === 'published',
  };

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/teach">Teaching</Link></p>
      <h1>My public teacher profile</h1>
      <p className="lede">Introduce yourself and link the social channels where your students already follow you. Your profile will list your public courses.</p>
      {profile?.status === 'published' && (
        <div className="notice">
          <p style={{ marginTop: 0 }}>
            <strong>This is the address to give your students.</strong>{' '}
            <Link href={`/teachers/${profile.slug}`}>/teachers/{profile.slug}</Link>
          </p>
          <p style={{ marginBottom: 0 }}>
            {publicEnabled
              ? 'It is live now, and every course you have published links to it from its own page.'
              : 'It is saved as published, but public teacher pages are switched off on this platform — the address will answer 404 until an administrator turns on “Public teacher profile”. Your courses are still published and readable meanwhile.'}
          </p>
        </div>
      )}
      <ProfileForm initial={initial} publicEnabled={publicEnabled} />
      <p style={{ marginTop: '1.5rem' }}><Link href="/teach">Back to teaching</Link></p>
    </div>
  );
}
