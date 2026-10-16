/**
 * Certificates.
 *
 * The shape here is deliberate and worth understanding before changing it:
 *
 * - `issue_certificate()` is SECURITY DEFINER and checks internally that the
 *   actor is privileged or a support agent. It refuses an enrolment whose
 *   completion policy has `certificate_enabled = false`, and it refuses an
 *   incomplete enrolment. It is idempotent — a second call returns the
 *   existing certificate rather than minting another.
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
  const number = certificateNumber.trim().toUpperCase();
  if (number.length === 0) return { found: false };

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

export type IssueOutcome =
  | { ok: true; certificateNumber: string }
  | { ok: false; code: 'not_privileged' | 'not_eligible' | 'rejected'; message: string };

/**
 * Issue a certificate for a completed enrolment.
 *
 * The eligibility rules live in `issue_certificate()`, not here: the course
 * version's completion policy must have certificates enabled, and the
 * enrolment must actually be complete. This only translates the refusal into
 * something worth showing.
 */
export async function issueCertificate(
  supabase: SupabaseClient,
  args: { enrolmentId: string; actorId: string },
): Promise<IssueOutcome> {
  const { data, error } = await supabase.rpc('issue_certificate', {
    p_enrolment_id: args.enrolmentId,
    p_actor_id: args.actorId,
  });

  if (error) {
    const m = error.message;
    if (/may not issue/i.test(m)) {
      return {
        ok: false,
        code: 'not_privileged',
        message: 'Only platform staff can issue certificates.',
      };
    }
    if (/not complete|does not issue certificates/i.test(m)) {
      return { ok: false, code: 'not_eligible', message: m };
    }
    return { ok: false, code: 'rejected', message: m };
  }

  const row = (Array.isArray(data) ? data[0] : data) as
    | { certificate_number?: string }
    | null;

  return { ok: true, certificateNumber: row?.certificate_number ?? '' };
}
