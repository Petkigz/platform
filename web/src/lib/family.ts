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
/**
 * What a child's home shows: what they are doing, then what they finished.
 *
 * The split is by **enrolment status, not by the percentage**. A course can read
 * 100% and still be `active` — the last completion rule may be a quiz that has
 * not been passed, and calling that "finished" on a child's own page would be a
 * promise the platform has not kept. Withdrawn, suspended and expired
 * enrolments are not shown at all: they are a fact for the guardian, not a
 * thing to put on a child's shelf.
 */
export function learnerCoursesInOrder(courses: ChildCourse[]): {
  active: ChildCourse[];
  finished: ChildCourse[];
} {
  return {
    active: courses.filter((c) => c.status === 'active'),
    finished: courses.filter((c) => c.status === 'completed'),
  };
}

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
 * The writer is `add_child_to_family()`, not an insert. The table admitted an insert
 * from any active family member until 2026-10-22, which is how this function used to
 * work — and it meant the owner-only rule and the audit row lived in a function nobody
 * called, while a billing manager could create a profile they could not then read. The
 * policy is staff-only now, so this is the only way in.
 *
 * The constraints doing the rest are the database's: `lp_children_need_age_band` means a
 * child must have an age band, `lp_no_child_login_yet` means no child can be given a
 * login, and the writer refuses a band it does not recognise. None can be argued with
 * from the client.
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
  if (!args.familyId) {
    return { ok: false, code: 'no_family', message: 'That family is missing.' };
  }

  const { data, error } = await supabase.rpc('add_child_to_family', {
    p_family_id: args.familyId,
    p_display_name: name,
    p_age_band: args.ageBand,
  });

  if (error) {
    if (/only the owner/i.test(error.message)) {
      return {
        ok: false,
        code: 'not_owner',
        message: 'Only the family owner can add a child.',
      };
    }
    if (/sign in/i.test(error.message)) {
      return { ok: false, code: 'not_owner', message: 'Sign in to add a child.' };
    }
    if (/family .* not found/i.test(error.message)) {
      return { ok: false, code: 'no_family', message: 'That family does not exist.' };
    }
    return { ok: false, code: 'rejected', message: error.message };
  }

  // The writer returns the new profile's id directly.
  const childId = typeof data === 'string' ? data : '';
  if (!childId) {
    return { ok: false, code: 'rejected', message: 'The child was added without an id.' };
  }

  return { ok: true, childId };
}

export const AGE_BANDS = ['5-7', '8-10', '11-13', '14-17'] as const;

// ---------------------------------------------------------------------------
// Creating and managing the family itself
//
// Everything above assumed a family already existed. Until now it could not:
// `families` and `family_memberships` had zero rows and no writer, and the
// policies made the first row impossible to write.
//
//   fm_write_owner  using (is_family_owner(family_id, current_user_id()))
//
// `is_family_owner()` looks for an active 'owner' row in `family_memberships`,
// so inserting the first owner membership required already being an active
// owner. Measured, not inferred:
//
//   plain INSERT into families ............. allowed
//   INSERT ... RETURNING id ................ refused by RLS
//   INSERT the owner membership ............ refused by RLS
//   creator selects their own family ....... 0 rows
//
// The RETURNING case is the subtle one: RETURNING must satisfy the SELECT
// policy, and `families_read` requires an active membership the creator does
// not have. The creator could not even read back the family they made.
//
// That made `addChild` above unreachable in practice — it inserts a child into
// a family the caller is an active member of, and no caller could ever become
// one. `guardian_relationships` has the same dependency, so the parental-consent
// workflow was blocked at the same point.
// ---------------------------------------------------------------------------

export const MEMBERSHIP_TYPES = ['owner', 'guardian', 'billing_manager'] as const;

export const MEMBERSHIP_TYPE_LABEL: Record<
  'owner' | 'guardian' | 'billing_manager',
  string
> = {
  owner: 'Owner',
  guardian: 'Guardian',
  billing_manager: 'Billing manager',
};

export type CreateFamilyOutcome =
  | { ok: true; familyId: string }
  | { ok: false; message: string };

/**
 * Create a family.
 *
 * The database creates the owner membership in the same transaction, so no
 * family ever exists without an owner — which is what makes the deadlock above
 * impossible to reintroduce by accident. A family with no owner is invisible to
 * its creator, unmanageable, and would strand its children.
 */
export async function createFamily(
  supabase: SupabaseClient,
  name?: string,
): Promise<CreateFamilyOutcome> {
  const trimmed = name?.trim() ?? '';
  if (trimmed.length > 120) {
    return { ok: false, message: 'Keep the family name under 120 characters.' };
  }

  const { data, error } = await supabase.rpc('create_family', {
    p_name: trimmed === '' ? null : trimmed,
  });

  if (error) {
    if (/sign in to create a family/i.test(error.message)) {
      return { ok: false, message: 'Sign in first.' };
    }
    return { ok: false, message: error.message };
  }

  return { ok: true, familyId: data === null ? '' : String(data) };
}

export type InviteOutcome =
  | { ok: true; membershipId: string }
  | { ok: false; message: string };

/**
 * Invite someone to the family.
 *
 * The invitation is `invited`, not `active`: the person has to accept. Being
 * added to someone else's household without agreeing would be a way to attach an
 * account that never chose it.
 */
export async function inviteFamilyMember(
  supabase: SupabaseClient,
  args: {
    familyId: string;
    userId: string;
    membershipType: 'owner' | 'guardian' | 'billing_manager';
  },
): Promise<InviteOutcome> {
  if (!args.familyId) return { ok: false, message: 'That family is missing.' };
  if (!args.userId) return { ok: false, message: 'Pick who to invite.' };

  const { data, error } = await supabase.rpc('invite_family_member', {
    p_family_id: args.familyId,
    p_user_id: args.userId,
    p_membership_type: args.membershipType,
  });

  if (error) {
    const m = error.message;
    if (/only the owner may invite/i.test(m)) {
      return { ok: false, message: 'Only the owner can invite someone.' };
    }
    if (/already a member/i.test(m)) {
      return { ok: false, message: 'That person is already a member.' };
    }
    if (/no such user/i.test(m)) {
      return { ok: false, message: 'No one has that account.' };
    }
    if (/unsupported membership type/i.test(m)) {
      return { ok: false, message: 'That is not a kind of member we support.' };
    }
    if (/not found/i.test(m)) {
      return { ok: false, message: 'That family no longer exists.' };
    }
    return { ok: false, message: m };
  }

  return { ok: true, membershipId: data === null ? '' : String(data) };
}

export type MembershipOutcome = { ok: true } | { ok: false; message: string };

/** Accept a family invitation. Only the invited person may do this. */
export async function acceptFamilyMembership(
  supabase: SupabaseClient,
  membershipId: string,
): Promise<MembershipOutcome> {
  if (!membershipId) return { ok: false, message: 'That invitation is missing.' };

  const { error } = await supabase.rpc('accept_family_membership', {
    p_membership_id: membershipId,
  });

  if (error) {
    const m = error.message;
    if (/only the invited person/i.test(m)) {
      return { ok: false, message: 'Only the invited person can accept this.' };
    }
    if (/was withdrawn/i.test(m)) {
      return { ok: false, message: 'That invitation was withdrawn.' };
    }
    if (/not found/i.test(m)) {
      return { ok: false, message: 'That invitation no longer exists.' };
    }
    return { ok: false, message: m };
  }

  return { ok: true };
}

/**
 * Remove a member. Soft revoke per D7, written reason required.
 *
 * Refuses to remove the last active owner — a family with no owner would be
 * unmanageable and its children stranded, which is the same lockout guard the
 * privileged roles use.
 */
export async function revokeFamilyMembership(
  supabase: SupabaseClient,
  args: { membershipId: string; reason: string },
): Promise<MembershipOutcome> {
  if (!args.membershipId) return { ok: false, message: 'That member is missing.' };
  if (args.reason.trim().length === 0) {
    return { ok: false, message: 'Give a reason for removing them.' };
  }

  const { error } = await supabase.rpc('revoke_family_membership', {
    p_membership_id: args.membershipId,
    p_reason: args.reason.trim(),
  });

  if (error) {
    const m = error.message;
    if (/only the owner may remove/i.test(m)) {
      return { ok: false, message: 'Only the owner can remove a member.' };
    }
    if (/needs at least one owner/i.test(m)) {
      return {
        ok: false,
        message:
          'A family needs at least one owner. Appoint another before removing this one.',
      };
    }
    if (/a reason is required/i.test(m)) {
      return { ok: false, message: 'Give a reason for removing them.' };
    }
    return { ok: false, message: m };
  }

  return { ok: true };
}
