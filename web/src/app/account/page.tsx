import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { ProfileForm } from './profile-form';

export const dynamic = 'force-dynamic';

export default async function AccountPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account');

  const { data, error } = await supabase
    .from('user_profiles')
    .select('display_name, preferred_language, timezone, account_status')
    .eq('user_id', user.id)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) redirect('/learn');
  const profile = data as unknown as {
    display_name: string;
    preferred_language: string;
    timezone: string | null;
    account_status: string;
  };

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/learn">My learning</Link></p>
      <h1>Account settings</h1>
      <p className="lede">Manage how your account appears. Your sign-in address is shown for reference and is not changed here.</p>
      <div className="notice" style={{ maxWidth: '42rem', marginBottom: '1rem' }}>
        Signed in as <strong>{user.email ?? user.phone ?? 'unknown'}</strong>
        {' · '}account status: {profile.account_status}
      </div>
      <ProfileForm initial={{
        displayName: profile.display_name,
        preferredLanguage: profile.preferred_language,
        timezone: profile.timezone,
      }} />
      <section className="card" style={{ maxWidth: '42rem', marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>Password</h2>
        {user.email ? (
          <p className="muted">
            Send a secure password reset link to your sign-in email. The link expires according to your authentication provider&rsquo;s settings.
            {' '}<Link href="/forgot-password">Send reset link</Link>
          </p>
        ) : (
          <p className="muted">This account signs in with a phone code, so there is no password to reset.</p>
        )}
      </section>
      <p style={{ marginTop: '1.5rem' }}><Link href="/learn">Back to my learning</Link></p>
    </div>
  );
}
