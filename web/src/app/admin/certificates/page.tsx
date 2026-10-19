import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { fetchCertificateAdminRecords, fetchCertificateCandidates } from '@/lib/certificates';
import { CertificateAdmin } from './certificate-admin';

export const dynamic = 'force-dynamic';

export default async function AdminCertificatesPage() {
  if (!isSupabaseConfigured()) redirect('/');
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/certificates');

  const [{ data: privileged }, { data: supportAgent }] = await Promise.all([
    supabase.rpc('is_privileged', { p_user_id: user.id }),
    supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'support_agent' }),
  ]);
  if (privileged !== true && supportAgent !== true) redirect('/');

  const [candidates, records] = await Promise.all([
    fetchCertificateCandidates(supabase),
    fetchCertificateAdminRecords(supabase),
  ]);

  return (
    <div className="container section">
      <p className="eyebrow"><Link href="/admin">Administration</Link></p>
      <h1>Certificates</h1>
      <p className="lede">Issue certificates only after the learner has completed a certificate-enabled course. Every issue is idempotent; every revocation is permanent and reasoned.</p>
      <CertificateAdmin candidates={candidates} records={records} />
    </div>
  );
}
