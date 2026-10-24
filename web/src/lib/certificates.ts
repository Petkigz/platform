/**
 * Certificates.
 *
 * The shape here is deliberate and worth understanding before changing it:
 *
 * - Session-bound SECURITY DEFINER wrappers issue and revoke certificates;
 *   clients cannot choose an actor id. Issuance still requires platform/support
 *   staff, an enabled policy and a genuinely complete enrolment. It is
 *   idempotent — a second call returns the existing public certificate number.
 *
 * - Everything on the row is a **snapshot**: `course_title`,
 *   `course_version_number`, `learner_display_name`, and `criteria_snapshot`
 *   are copied at issue time and `protect_certificate_snapshot()` keeps them
 *   there. A certificate says what was true when it was issued, so renaming
 *   the course afterwards cannot rewrite history.
 *
 * - `verify_certificate()` is executable by `anon`. That is the only reason a
 *   public verification page can exist at all: `certificates_read` is
 *   authenticated-only, so an anonymous visitor can never list certificates —
 *   they can only be told about one whose number they already hold.
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import { normaliseCertificateNumber } from './certificate-number.ts';

export type Certificate = {
  id: string;
  certificateNumber: string;
  status: 'issued' | 'revoked';
  issuedAt: string | null;
  courseTitle: string;
  courseVersionNumber: number;
  courseLanguage: string | null;
  learnerDisplayName: string;
  revocationReason: string | null;
};

export type Verification = {
  found: true;
  valid: boolean;
  status: string;
  courseTitle: string | null;
  learnerName: string | null;
  issuedOn: string | null;
  courseVersion: number | null;
  language: string | null;
  revokedReason: string | null;
} | { found: false };

type CertificateRow = {
  id: string;
  certificate_number: string;
  status: string;
  issued_at: string | null;
  course_title: string;
  course_version_number: number;
  course_language: string | null;
  learner_display_name: string;
  revocation_reason: string | null;
};

/**
 * Certificates belonging to whoever can access the learner.
 *
 * No user filter: `certificates_read` is `can_access_learner(...)`, so a
 * parent sees their children's certificates, a verified guardian sees the
 * child they were verified for, and a billing-only family member sees none.
 */
export async function fetchCertificates(
  supabase: SupabaseClient,
): Promise<Certificate[]> {
  const { data, error } = await supabase
    .from('certificates')
    .select(
      'id, certificate_number, status, issued_at, course_title, course_version_number, course_language, learner_display_name, revocation_reason',
    )
    .order('issued_at', { ascending: false });

  if (error) throw new Error(error.message);

  return ((data ?? []) as unknown as CertificateRow[]).map((r) => ({
    id: r.id,
    certificateNumber: r.certificate_number,
    status: r.status as Certificate['status'],
    issuedAt: r.issued_at,
    courseTitle: r.course_title,
    courseVersionNumber: r.course_version_number,
    courseLanguage: r.course_language,
    learnerDisplayName: r.learner_display_name,
    revocationReason: r.revocation_reason,
  }));
}

/**
 * Look one certificate up by number.
 *
 * Works anonymously, which is the point: verification is for an employer or a
 * school that holds a number and wants to know whether it is real. Returns
 * `{ found: false }` for a number that does not exist rather than throwing, so
 * the page can say "no such certificate" instead of showing an error.
 */
export async function verifyCertificate(
  supabase: SupabaseClient,
  certificateNumber: string,
): Promise<Verification> {
  // One normaliser for the whole platform: the page, the API and the printed
  // certificate must agree on what a number is, or a link that works in one
  // place fails in another.
  const number = normaliseCertificateNumber(certificateNumber);
  if (number === null) return { found: false };

  const { data, error } = await supabase.rpc('verify_certificate', {
    p_certificate_number: number,
  });

  if (error) throw new Error(error.message);

  type Row = {
    valid: boolean;
    status: string;
    course_title: string | null;
    learner_name: string | null;
    issued_on: string | null;
    course_version: number | null;
    language: string | null;
    revoked_reason: string | null;
  };

  // A set-returning function comes back as an array even for one row.
  const rows = (Array.isArray(data) ? data : data ? [data] : []) as unknown as Row[];
  const row = rows[0];
  if (!row) return { found: false };

  return {
    found: true,
    valid: row.valid,
    status: row.status,
    courseTitle: row.course_title,
    learnerName: row.learner_name,
    issuedOn: row.issued_on,
    courseVersion: row.course_version,
    language: row.language,
    revokedReason: row.revoked_reason,
  };
}

export type CertificateCandidate = {
  enrolment_id: string;
  course_title: string;
  course_version_number: number;
  learner_display_name: string;
};

export type CertificateAdminRecord = {
  certificate_id: string;
  certificate_number: string;
  status: 'issued' | 'revoked';
  issued_at: string;
  course_title: string;
  course_version_number: number;
  learner_display_name: string;
  revocation_reason: string | null;
};

export async function fetchCertificateCandidates(
  supabase: SupabaseClient,
): Promise<CertificateCandidate[]> {
  const { data, error } = await supabase.rpc('list_certificate_issuance_candidates');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CertificateCandidate[];
}

export async function fetchCertificateAdminRecords(
  supabase: SupabaseClient,
): Promise<CertificateAdminRecord[]> {
  const { data, error } = await supabase.rpc('list_certificate_admin_records');
  if (error) throw new Error(error.message);
  return (data ?? []) as unknown as CertificateAdminRecord[];
}

/** The certificate itself remains visible only through the holder's RLS access. */
export async function fetchCertificateForHolder(
  supabase: SupabaseClient,
  certificateNumber: string,
): Promise<Certificate | null> {
  const number = certificateNumber.trim().toUpperCase();
  if (!number) return null;
  const { data, error } = await supabase
    .from('certificates')
    .select('id, certificate_number, status, issued_at, course_title, course_version_number, course_language, learner_display_name, revocation_reason')
    .eq('certificate_number', number)
    .maybeSingle();
  if (error) throw new Error(error.message);
  const row = data as unknown as CertificateRow | null;
  if (!row) return null;
  return {
    id: row.id,
    certificateNumber: row.certificate_number,
    status: row.status as Certificate['status'],
    issuedAt: row.issued_at,
    courseTitle: row.course_title,
    courseVersionNumber: row.course_version_number,
    courseLanguage: row.course_language,
    learnerDisplayName: row.learner_display_name,
    revocationReason: row.revocation_reason,
  };
}

export type IssueOutcome =
  | { ok: true; certificateNumber: string }
  | { ok: false; code: 'not_privileged' | 'not_eligible' | 'rejected'; message: string };

/** Issue a completed, eligible enrolment without accepting an actor id from the client. */
export async function issueCertificate(
  supabase: SupabaseClient,
  args: { enrolmentId: string },
): Promise<IssueOutcome> {
  const { data, error } = await supabase.rpc('issue_certificate_for_session', {
    p_enrolment_id: args.enrolmentId,
  });

  if (error) {
    const m = error.message;
    if (/may issue certificates/i.test(m)) {
      return { ok: false, code: 'not_privileged', message: 'Only platform staff can issue certificates.' };
    }
    if (/not complete|does not issue certificates/i.test(m)) {
      return { ok: false, code: 'not_eligible', message: m };
    }
    return { ok: false, code: 'rejected', message: m };
  }
  return { ok: true, certificateNumber: String(data ?? '') };
}

export async function revokeCertificate(
  supabase: SupabaseClient,
  args: { certificateId: string; reason: string },
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!args.certificateId) return { ok: false, message: 'Choose a certificate.' };
  if (!args.reason.trim() || args.reason.trim().length > 500) {
    return { ok: false, message: 'Give a written reason under 500 characters.' };
  }
  const { error } = await supabase.rpc('revoke_certificate_for_session', {
    p_certificate_id: args.certificateId,
    p_reason: args.reason.trim(),
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true };
}
