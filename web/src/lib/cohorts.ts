import type { SupabaseClient } from '@supabase/supabase-js';

export type CohortStatus = 'draft' | 'open' | 'closed' | 'cancelled';

export type CourseCohort = {
  id: string;
  courseId: string;
  courseVersionId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  status: CohortStatus;
  /** When this class stops accepting joiners. Defaults to `startsAt`. */
  joinClosesAt: string;
};

export type JoinableCohort = CourseCohort & {
  versionNumber: number | null;
  eligibleLearnerIds: string[];
  joinedLearnerIds: string[];
  /** How full the class is, as far as a joiner is allowed to know. */
  places: CohortPlaces;
};

/**
 * How full a class is.
 *
 * A joiner may know that a class has three of twelve places taken and may not
 * know who took them: `cohort_members_read` is deliberately narrower than
 * `cohorts_read`, so a learner sees their own membership and their family's and
 * never a class list of other people's children. The count therefore comes from
 * `cohort_places()`, which is SECURITY DEFINER and returns integers only.
 *
 * `null` means "could not be read", which is not the same as zero. Nothing treats
 * an unknown count as full: refusing a joiner because a number was unavailable
 * would be worse than letting them try.
 */
export type CohortPlaces = {
  activeMembers: number | null;
  /** Null when the class has no capacity, or when the count is unknown. */
  placesLeft: number | null;
  /** True only when a capacity is known and no place is left. */
  full: boolean;
};

export type CohortMemberCounts = Record<string, { active: number; left: number }>;

export type CohortWriteResult =
  | { ok: true; id: string | null }
  | { ok: false; status: number; message: string };

export type CohortInput = {
  courseId: string;
  courseVersionId: string;
  title: string;
  description: string | null;
  startsAt: string;
  endsAt: string | null;
  capacity: number | null;
  /** Null means "close when the class starts", which is the decided default. */
  joinClosesAt: string | null;
};

export function validateCohortInput(input: {
  courseId: unknown;
  courseVersionId: unknown;
  title: unknown;
  description?: unknown;
  startsAt: unknown;
  endsAt?: unknown;
  capacity?: unknown;
  joinClosesAt?: unknown;
}):
  | { ok: true; value: CohortInput }
  | { ok: false; message: string } {
  const courseId = typeof input.courseId === 'string' ? input.courseId.trim() : '';
  const courseVersionId = typeof input.courseVersionId === 'string' ? input.courseVersionId.trim() : '';
  if (!courseId || !courseVersionId) return { ok: false, message: 'Choose a published course version.' };
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title || title.length > 120) return { ok: false, message: 'A cohort needs a title under 120 characters.' };
  const description = typeof input.description === 'string' ? input.description.trim() : '';
  if (description.length > 2000) return { ok: false, message: 'Keep the description under 2000 characters.' };
  if (typeof input.startsAt !== 'string' || !Number.isFinite(Date.parse(input.startsAt)))
    return { ok: false, message: 'Choose a valid start date and time.' };
  const starts = new Date(input.startsAt);
  if (starts.getTime() < Date.now()) return { ok: false, message: 'A cohort must start now or later.' };
  let endsAt: string | null = null;
  if (input.endsAt !== null && input.endsAt !== undefined && input.endsAt !== '') {
    if (typeof input.endsAt !== 'string' || !Number.isFinite(Date.parse(input.endsAt)))
      return { ok: false, message: 'Choose a valid end date and time.' };
    const ends = new Date(input.endsAt);
    if (ends.getTime() <= starts.getTime()) return { ok: false, message: 'The cohort must end after it starts.' };
    endsAt = ends.toISOString();
  }
  let capacity: number | null = null;
  if (input.capacity !== null && input.capacity !== undefined && input.capacity !== '') {
    capacity = typeof input.capacity === 'number' ? input.capacity : Number(input.capacity);
    if (!Number.isInteger(capacity) || capacity < 1)
      return { ok: false, message: 'Capacity must be a whole number of at least one.' };
  }
  // Blank is a real choice here, not a missing one: it means the class stops
  // taking joiners when it starts. Setting a date is how a teacher says the
  // first weeks are catch-up-able, or that registration closes early.
  let joinClosesAt: string | null = null;
  if (input.joinClosesAt !== null && input.joinClosesAt !== undefined && input.joinClosesAt !== '') {
    if (typeof input.joinClosesAt !== 'string' || !Number.isFinite(Date.parse(input.joinClosesAt)))
      return { ok: false, message: 'Choose a valid date for closing registration.' };
    const closes = new Date(input.joinClosesAt);
    if (closes.getTime() <= Date.now())
      return { ok: false, message: 'Registration must close later than now, or be left blank to close at the start.' };
    if (endsAt !== null && closes.getTime() > new Date(endsAt).getTime())
      return { ok: false, message: 'Registration cannot stay open past the end of the class.' };
    joinClosesAt = closes.toISOString();
  }
  return {
    ok: true,
    value: {
      courseId,
      courseVersionId,
      title,
      description: description || null,
      startsAt: starts.toISOString(),
      endsAt,
      capacity,
      joinClosesAt,
    },
  };
}

export function mapCohortError(error: { message: string; code?: string }): { status: number; message: string } {
  const m = error.message;
  if (/not enabled/i.test(m)) return { status: 409, message: 'Cohorts are paused right now.' };
  if (/only the course author|responsible for|insufficient privilege|row-level security/i.test(m))
    return { status: 403, message: 'You do not have permission to do that.' };
  if (/not found|no_data_found|does not exist/i.test(m) || error.code === 'P0002')
    return { status: 404, message: 'That cohort could not be found.' };
  if (/full/i.test(m)) return { status: 409, message: 'This cohort is full.' };
  if (/already in the cohort/i.test(m)) return { status: 409, message: 'This learner is already in the cohort.' };
  if (/only the teacher who opened/i.test(m))
    return { status: 403, message: 'Only the teacher who opened this class can change it.' };
  // The window shut. Say so, and say when: "not open" would read as the whole
  // class being closed, which is a different thing to a learner.
  if (/stopped accepting joiners/i.test(m)) return { status: 409, message: m };
  if (/must close later than now|cannot close after the cohort ends|choose when the cohort stops/i.test(m))
    return { status: 400, message: m };
  if (/not open|already ended|cannot move|start already|ends after|not accepting joiners/i.test(m))
    return { status: 409, message: m };
  return { status: 400, message: m };
}

async function rpcWrite(
  client: SupabaseClient,
  fn: string,
  args: Record<string, unknown>,
): Promise<CohortWriteResult> {
  const { data, error } = await client.rpc(fn, args);
  if (error) return { ok: false, ...mapCohortError(error) };
  return { ok: true, id: data === null || data === undefined ? null : String(data) };
}

export async function createCohort(
  client: SupabaseClient,
  input: CohortInput,
): Promise<CohortWriteResult> {
  return rpcWrite(client, 'create_cohort', {
    p_course_id: input.courseId,
    p_course_version_id: input.courseVersionId,
    p_title: input.title,
    p_description: input.description,
    p_starts_at: input.startsAt,
    p_ends_at: input.endsAt,
    p_capacity: input.capacity,
    p_join_closes_at: input.joinClosesAt,
  });
}

/** Move the join window. Only the teacher who opened the class, while it is draft or open. */
export async function setCohortJoinWindow(
  client: SupabaseClient,
  cohortId: string,
  joinClosesAt: string,
): Promise<CohortWriteResult> {
  return rpcWrite(client, 'set_cohort_join_window', {
    p_cohort_id: cohortId,
    p_join_closes_at: joinClosesAt,
  });
}

/** Whether the class is still taking joiners. The database decides; this is for the button. */
export function cohortJoinWindowOpen(
  cohort: Pick<CourseCohort, 'status' | 'joinClosesAt'>,
  now: Date = new Date(),
): boolean {
  if (cohort.status !== 'open') return false;
  const closes = new Date(cohort.joinClosesAt);
  if (!Number.isFinite(closes.getTime())) return false;
  return now.getTime() <= closes.getTime();
}

/** What the window says, in words: a learner should not have to work out a date. */
export function joinWindowLabel(
  cohort: Pick<CourseCohort, 'status' | 'startsAt' | 'joinClosesAt'>,
  now: Date = new Date(),
): string {
  const closes = new Date(cohort.joinClosesAt);
  const starts = new Date(cohort.startsAt);
  const sameAsStart = Math.abs(closes.getTime() - starts.getTime()) < 60_000;
  if (now.getTime() > closes.getTime()) return 'Registration has closed';
  return sameAsStart
    ? 'Registration closes when the class starts'
    : `Registration closes ${closes.toLocaleString()}`;
}

export async function setCohortStatus(
  client: SupabaseClient,
  cohortId: string,
  status: 'open' | 'closed' | 'cancelled',
): Promise<CohortWriteResult> {
  return rpcWrite(client, 'set_cohort_status', { p_cohort_id: cohortId, p_status: status });
}

export async function joinCohort(
  client: SupabaseClient,
  cohortId: string,
  learnerProfileId: string,
): Promise<CohortWriteResult> {
  return rpcWrite(client, 'join_cohort', {
    p_cohort_id: cohortId,
    p_learner_profile_id: learnerProfileId,
  });
}

export async function leaveCohort(
  client: SupabaseClient,
  cohortId: string,
  learnerProfileId: string,
): Promise<CohortWriteResult> {
  return rpcWrite(client, 'leave_cohort', {
    p_cohort_id: cohortId,
    p_learner_profile_id: learnerProfileId,
  });
}

const COHORT_COLUMNS = 'id,course_id,course_version_id,title,description,starts_at,ends_at,capacity,status,join_closes_at';

function mapCohort(row: {
  id: string; course_id: string; course_version_id: string; title: string; description: string | null;
  starts_at: string; ends_at: string | null; capacity: number | null; status: CohortStatus;
  join_closes_at: string;
}): CourseCohort {
  return {
    id: String(row.id), courseId: String(row.course_id), courseVersionId: String(row.course_version_id),
    title: String(row.title), description: row.description, startsAt: String(row.starts_at),
    endsAt: row.ends_at, capacity: row.capacity === null ? null : Number(row.capacity), status: row.status,
    joinClosesAt: String(row.join_closes_at),
  };
}

export async function fetchCourseCohorts(
  client: SupabaseClient,
  args: { courseId: string; openOnly?: boolean },
): Promise<CourseCohort[]> {
  let query = client.from('cohorts').select(COHORT_COLUMNS)
    .eq('course_id', args.courseId).is('deleted_at', null)
    .order('starts_at', { ascending: true });
  if (args.openOnly) query = query.eq('status', 'open');
  const { data, error } = await query;
  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Parameters<typeof mapCohort>[0][]).map(mapCohort);
}

export async function fetchCohortMemberCounts(
  client: SupabaseClient,
  cohortIds: string[],
): Promise<CohortMemberCounts> {
  if (cohortIds.length === 0) return {};
  const { data, error } = await client.from('cohort_members')
    .select('cohort_id,status')
    .in('cohort_id', cohortIds);
  if (error) throw new Error(error.message);
  const result: CohortMemberCounts = {};
  for (const id of cohortIds) result[id] = { active: 0, left: 0 };
  for (const row of (data ?? []) as unknown as { cohort_id: string; status: string }[]) {
    if (!result[row.cohort_id]) continue;
    if (row.status === 'active') result[row.cohort_id]!.active++;
    else if (row.status === 'left') result[row.cohort_id]!.left++;
  }
  return result;
}

/**
 * "3 of 12 places taken" — or null, when the count could not be read.
 *
 * A count that is not readable is left unsaid rather than shown as zero, because
 * "0 of 12 places taken" on a full class is a promise the Join button cannot
 * keep.
 */
export function placesLabel(places: CohortPlaces, capacity: number | null): string | null {
  if (places.activeMembers === null || capacity === null) return null;
  return `${String(places.activeMembers)} of ${String(capacity)} places taken`;
}

/** Places left, from a capacity and a count that may be either unknown or stale. */
export function summarisePlaces(
  capacity: number | null,
  activeMembers: number | null,
): CohortPlaces {
  if (activeMembers === null) return { activeMembers: null, placesLeft: null, full: false };
  if (capacity === null) return { activeMembers, placesLeft: null, full: false };
  // More members than capacity is possible: capacity can be lowered after people
  // join. That is a class that is over, not one with negative places.
  const placesLeft = Math.max(0, capacity - activeMembers);
  return { activeMembers, placesLeft, full: placesLeft === 0 };
}

/**
 * Active members per cohort, in one call.
 *
 * A cohort the caller may not read is absent from the result rather than zero,
 * which is why this is not `fetchCohortMemberCounts()`: that one counts rows the
 * caller can read, and it is used on the teacher's own cohort page, where the
 * roster is visible anyway and "left" members are counted too.
 */
export async function fetchCohortPlaces(
  client: SupabaseClient,
  cohortIds: string[],
): Promise<Record<string, number>> {
  if (cohortIds.length === 0) return {};
  const { data, error } = await client.rpc('cohort_places', { p_cohort_ids: cohortIds });
  if (error) throw new Error(error.message);
  const places: Record<string, number> = {};
  for (const row of (data ?? []) as unknown as { cohort_id: string; active_members: number }[]) {
    places[String(row.cohort_id)] = Number(row.active_members);
  }
  return places;
}

export async function fetchJoinableCohorts(
  client: SupabaseClient,
  args: { courseId: string; learners: { id: string }[] },
): Promise<JoinableCohort[]> {
  const cohorts = await fetchCourseCohorts(client, { courseId: args.courseId, openOnly: true });
  if (cohorts.length === 0) return [];
  const cohortIds = cohorts.map((c) => c.id);
  const learnerIds = args.learners.map((l) => l.id);
  const versionIds = [...new Set(cohorts.map((c) => c.courseVersionId))];
  const [versionsResult, enrolmentsResult, membershipsResult] = await Promise.all([
    client.from('course_versions').select('id,version_number').in('id', versionIds),
    learnerIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : client.from('course_enrolments')
          .select('learner_profile_id,course_version_id,status')
          .eq('course_id', args.courseId)
          .in('learner_profile_id', learnerIds)
          .in('status', ['active', 'completed'])
          .is('deleted_at', null),
    learnerIds.length === 0
      ? Promise.resolve({ data: [], error: null })
      : client.from('cohort_members')
          .select('cohort_id,learner_profile_id')
          .in('cohort_id', cohortIds)
          .in('learner_profile_id', learnerIds)
          .eq('status', 'active'),
  ]);
  if (versionsResult.error) throw new Error(versionsResult.error.message);
  if (enrolmentsResult.error) throw new Error(enrolmentsResult.error.message);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);

  const versionNumbers = new Map(
    ((versionsResult.data ?? []) as unknown as { id: string; version_number: number }[])
      .map((v) => [v.id, Number(v.version_number)]),
  );
  const enrolled = new Set(
    ((enrolmentsResult.data ?? []) as unknown as { learner_profile_id: string; course_version_id: string }[])
      .map((e) => `${e.learner_profile_id}:${e.course_version_id}`),
  );
  const joinedByCohort = new Map<string, string[]>();
  for (const row of (membershipsResult.data ?? []) as unknown as { cohort_id: string; learner_profile_id: string }[]) {
    const list = joinedByCohort.get(row.cohort_id) ?? [];
    list.push(row.learner_profile_id);
    joinedByCohort.set(row.cohort_id, list);
  }

  // One call for every cohort on the page rather than one per cohort, because a
  // course can have several open classes and this is a round trip.
  const places = await fetchCohortPlaces(client, cohortIds);

  return cohorts.map((c) => ({
    ...c,
    versionNumber: versionNumbers.get(c.courseVersionId) ?? null,
    eligibleLearnerIds: learnerIds.filter((id) => enrolled.has(`${id}:${c.courseVersionId}`)),
    joinedLearnerIds: joinedByCohort.get(c.id) ?? [],
    places: summarisePlaces(
      c.capacity,
      Object.hasOwn(places, c.id) ? (places[c.id] ?? null) : null,
    ),
  }));
}
