/**
 * Families and children.
 *
 * The model here is D2, and it is worth restating because it shapes every
 * query below: **a child is a `learner_profile` under a `family`, never a
 * `user`.** A child has no login, no email, no password. `linked_user_id` is
 * null for every child, and `lp_no_child_login_yet` enforces that until the
 * trusted-linking workflow and verifiable parental consent both exist.
 *
 * So "my children" is not a join on `auth.users`. It is: the families I am an
 * active member of, then the learner profiles attached to those families.
 *
 * None of the queries below filter by the current user. Row level security
 * decides: `families_read` admits active members, `lp_read` admits family
 * members other than billing-only ones plus verified guardians. A billing
 * manager sees the family and none of its children — that was a real defect
 * until `is_learner_family_member` was fixed.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type Child = {
  id: string;
  displayName: string;
  ageBand: string | null;
  status: string;
};

export type Family = {
  id: string;
  name: string | null;
  children: Child[];
};

export type FamilyMember = {
  id: string;
  familyId: string;
  userId: string;
  membershipType: 'owner' | 'guardian' | 'billing_manager';
  status: 'invited' | 'active' | 'revoked';
  displayName: string | null;
};

export type ChildCourse = {
  enrolmentId: string;
  courseTitle: string;
  courseSlug: string;
  status: string;
  lessonsDone: number;
  lessonsTotal: number;
  percentComplete: number;
};

type FamilyRow = { id: string; name: string | null };
type LearnerRow = {
  id: string;
  family_id: string | null;
  display_name: string;
  learner_type: string;
  age_band: string | null;
  status: string;
  linked_user_id: string | null;
  deleted_at: string | null;
};

export const AGE_BAND_LABEL: Record<string, string> = {
  '5-7': 'Ages 5–7',
  '8-10': 'Ages 8–10',
  '11-13': 'Ages 11–13',
  '14-17': 'Ages 14–17',
  '18+': 'Adult',
};

export async function fetchFamilies(supabase: SupabaseClient): Promise<Family[]> {
  const { data, error } = await supabase
    .from('families')
    .select('id, name')
    .order('created_at', { ascending: true });

  if (error) throw new Error(error.message);
  const families = (data ?? []) as unknown as FamilyRow[];

  // Children come back in one query for every family I can see, then get
  // bucketed here. `learner_type = 'child'` is the whole distinction — an
  // adult learner profile in the same family is a person with their own
  // login, not a child to be supervised.
  const { data: learners, error: lErr } = await supabase
    .from('learner_profiles')
    .select('id, family_id, display_name, learner_type, age_band, status, linked_user_id, deleted_at')
    .eq('learner_type', 'child')
    .is('deleted_at', null)
    .order('display_name', { ascending: true });

  if (lErr) throw new Error(lErr.message);
  const rows = (learners ?? []) as unknown as LearnerRow[];

  return families.map((f) => ({
    id: f.id,
    name: f.name,
    children: rows
      .filter((r) => r.family_id === f.id)
      .map((r) => ({
        id: r.id,
        displayName: r.display_name,
        ageBand: r.age_band,
        status: r.status,
      })),
  }));
}

export async function fetchFamilyMembers(
  supabase: SupabaseClient,
  familyId: string,
): Promise<FamilyMember[]> {
  const { data, error } = await supabase
    .from('family_memberships')
    .select('id, family_id, user_id, membership_type, status, user_profiles ( display_name )')
    .eq('family_id', familyId)
    .order('status', { ascending: true });

  if (error) throw new Error(error.message);

  // A raw PostgREST row: snake_case columns plus the joined profile as an
  // array, because PostgREST nests to-one relations as arrays too.
  type Row = {
    id: string;
    family_id: string;
    user_id: string;
    membership_type: 'owner' | 'guardian' | 'billing_manager';
    status: 'invited' | 'active' | 'revoked';
    user_profiles: { display_name: string | null }[] | null;
  };
  return ((data ?? []) as unknown as Row[]).map((r) => ({
    id: r.id,
    familyId: r.family_id,
    userId: r.user_id,
    membershipType: r.membership_type,
    status: r.status,
    displayName: r.user_profiles?.[0]?.display_name ?? null,
  }));
}

/**
 * What a child is studying.
 *
 * Deliberately the same shape as the adult dashboard, because a parent
 * comparing two children should not have to read two different layouts.
 */
export async function fetchChildCourses(
  supabase: SupabaseClient,
  childLearnerId: string,
): Promise<ChildCourse[]> {
  const { data, error } = await supabase
    .from('course_enrolments')
    .select('id, status, courses ( title, slug )')
    .eq('learner_profile_id', childLearnerId)
    .eq('deleted_at', null)
    .order('enrolled_at', { ascending: false });

  if (error) throw new Error(error.message);

  type Row = {
    id: string;
    status: string;
    courses: { title: string; slug: string }[] | null;
  };
  const rows = (data ?? []) as unknown as Row[];

  // Progress per enrolment. Serialised inside a Promise.all rather than a loop
  // of awaits: a parent with three children in four courses each would
  // otherwise wait on twelve round trips one after another.
  const withProgress = await Promise.all(
    rows.map(async (r) => {
      const { data: summary } = await supabase.rpc('enrolment_progress_summary', {
        p_enrolment_id: r.id,
      });
      const s = (Array.isArray(summary) ? summary[0] : summary) as
        | { lessons_total: number | string; lessons_done: number | string; percent_complete: number | string }
        | null;
      return {
        enrolmentId: r.id,
        courseTitle: r.courses?.[0]?.title ?? 'Untitled course',
        courseSlug: r.courses?.[0]?.slug ?? '',
        status: r.status,
        lessonsDone: Number(s?.lessons_done ?? 0),
        lessonsTotal: Number(s?.lessons_total ?? 0),
        percentComplete: Number(s?.percent_complete ?? 0),
      };
    }),
  );

  return withProgress;
}

/**
 * Create a child profile under a family.
 *
 * This is the COPPA-adjacent path, and the constraints doing the work are in
 * the database rather than here: `lp_children_need_age_band` means a child
 * must have an age band, and `lp_no_child_login_yet` means no child can be
 * given a login. Neither can be argued with from the client.
 */
export type AddChildOutcome =
  | { ok: true; childId: string }
  | { ok: false; code: 'no_family' | 'not_owner' | 'rejected'; message: string };

export async function addChild(
  supabase: SupabaseClient,
  args: { familyId: string; displayName: string; ageBand: string },
): Promise<AddChildOutcome> {
  const name = args.displayName.trim();
  if (name.length === 0) {
    return { ok: false, code: 'rejected', message: 'A name is required.' };
  }

  const { data, error } = await supabase
    .from('learner_profiles')
    .insert({
      family_id: args.familyId,
      display_name: name,
      learner_type: 'child',
      age_band: args.ageBand,
    })
    .select('id')
    .single();

  if (error) {
    // RLS refuses an insert into a family you do not own, and reports it as a
    // policy violation. Say the useful thing rather than quoting the policy.
    if (/policy|permission/i.test(error.message)) {
      return {
        ok: false,
        code: 'not_owner',
        message: 'Only the family owner can add a child.',
      };
    }
    return { ok: false, code: 'rejected', message: error.message };
  }

  return { ok: true, childId: (data as unknown as { id: string }).id };
}

export const AGE_BANDS = ['5-7', '8-10', '11-13', '14-17'] as const;
