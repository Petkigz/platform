import Link from 'next/link';
import { isSupabaseConfigured } from '@/lib/env';

export default function Home() {
  return (
    <div className="card">
      <h1>AyahSpring</h1>
      <p className="muted">Islamic learning for children and adults, worldwide.</p>

      {!isSupabaseConfigured() && (
        <div className="notice">
          <strong>Supabase is not configured.</strong> Copy{' '}
          <code>web/.env.example</code> to <code>web/.env.local</code> and set your
          project URL and anon key, then restart the dev server.
        </div>
      )}

      <p>
        The database is complete: 88 tables, row level security on every one,
        170 passing tests. This app is the first thing above it.
      </p>

      <div className="tabs">
        <Link href="/sign-in">Sign in</Link>
        <Link href="/sign-up">Create an account</Link>
        <Link href="/learn">My learning</Link>
      </div>
    </div>
  );
}
