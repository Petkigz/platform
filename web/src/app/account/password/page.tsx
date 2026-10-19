import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { PasswordForm } from '../password-form';

export const dynamic = 'force-dynamic';

export default async function UpdatePasswordPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/password');

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/account">Account settings</Link></p>
      <h1>Choose a new password</h1>
      <p className="lede">Set a new password for this account. Your reset link is single-use.</p>
      <PasswordForm />
    </div>
  );
}
