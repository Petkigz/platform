/**
 * Who is here, and who teaches.
 *
 * Two screens that are not queues. Everything else in the admin console is about
 * work waiting for a person; these answer a question about people, and the shape
 * they read is `staff_directory()`, which decides who may ask at all.
 *
 * The parsing is separate from the page so the two refusals that matter can be
 * tested without a database: an account row that arrives with money in it, and a
 * list that claims to be complete when it was cut off. Neither is a hypothetical
 * — the first is the colum that would eventually get added, the second is what a
 * LIMIT does if nobody says so.
 */

export type AccountRow = {
  userId: string;
  name: string;
  email: string | null;
  status: 'active' | 'suspended' | 'closed';
  country: string | null;
  joinedAt: string;
  roles: string[];
  learnerProfiles: number;
  courses: number;
};

export type TeacherRow = {
  userId: string;
  name: string;
  email: string | null;
  joinedAt: string;
  slug: string | null;
  profileStatus: 'draft' | 'published' | null;
  headline: string | null;
  publishedCourses: number;
  courses: number;
  learners: number;
};

export type Directory<K extends 'accounts' | 'teachers'> = {
  kind: K;
  query: string | null;
  total: number;
  shown: number;
  truncated: boolean;
  rows: K extends 'accounts' ? AccountRow[] : TeacherRow[];
};

export class DirectoryError extends Error {}

function str(value: unknown, field: string): string {
  if (typeof value === 'string' && value.length > 0) return value;
  throw new DirectoryError(`a directory row has no ${field}`);
}

function num(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return 0;
}

function strOrNull(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

/**
 * The columns a directory row is allowed to have.
 *
 * Written as a list rather than assumed, so the day somebody adds a balance to
 * `staff_directory()` the page does not start rendering it and this file has to
 * be edited first. A directory that quietly grows a money column is the screen
 * where two currencies get added together by eye.
 */
export const ALLOWED_ACCOUNT_FIELDS = [
  'userId', 'name', 'email', 'status', 'country', 'joinedAt',
  'roles', 'learnerProfiles', 'courses',
] as const;

export const ALLOWED_TEACHER_FIELDS = [
  'userId', 'name', 'email', 'joinedAt', 'slug', 'profileStatus',
  'headline', 'publishedCourses', 'courses', 'learners',
] as const;

function pick(raw: Record<string, unknown>, allowed: readonly string[], kind: string) {
  for (const key of Object.keys(raw)) {
    if (!allowed.includes(key)) {
      throw new DirectoryError(`a ${kind} row carries '${key}', which the directory does not show`);
    }
  }
  return raw;
}

export function parseDirectory(value: unknown): Directory<'accounts'> | Directory<'teachers'> {
  if (!value || typeof value !== 'object') throw new DirectoryError('the directory did not load');

  const raw = value as Record<string, unknown>;
  const kind = raw.kind;
  if (kind !== 'accounts' && kind !== 'teachers') {
    throw new DirectoryError('the directory did not say what it is a list of');
  }

  const rows = Array.isArray(raw.rows) ? raw.rows : [];
  const total = num(raw.total);

  if (kind === 'accounts') {
    const parsed: AccountRow[] = rows.map((entry): AccountRow => {
      const row = pick((entry ?? {}) as Record<string, unknown>, ALLOWED_ACCOUNT_FIELDS, 'account');
      return {
        userId: str(row.userId, 'id'),
        name: str(row.name, 'name'),
        email: strOrNull(row.email),
        status: (row.status === 'suspended' || row.status === 'closed' ? row.status : 'active') as
          AccountRow['status'],
        country: strOrNull(row.country),
        joinedAt: str(row.joinedAt, 'join date'),
        // A person with no role has an empty list, not a null to be guessed at.
        roles: Array.isArray(row.roles) ? row.roles.filter((r): r is string => typeof r === 'string') : [],
        learnerProfiles: num(row.learnerProfiles),
        courses: num(row.courses),
      };
    });

    return {
      kind: 'accounts',
      query: strOrNull(raw.query),
      total,
      shown: parsed.length,
      truncated: raw.truncated === true || total > parsed.length,
      rows: parsed,
    };
  }

  const parsed: TeacherRow[] = rows.map((entry): TeacherRow => {
    const row = pick((entry ?? {}) as Record<string, unknown>, ALLOWED_TEACHER_FIELDS, 'teacher');
    const status = row.profileStatus === 'published' || row.profileStatus === 'draft'
      ? row.profileStatus
      : null;
    return {
      userId: str(row.userId, 'id'),
      name: str(row.name, 'name'),
      email: strOrNull(row.email),
      joinedAt: str(row.joinedAt, 'join date'),
      slug: strOrNull(row.slug),
      profileStatus: status,
      headline: strOrNull(row.headline),
      publishedCourses: num(row.publishedCourses),
      courses: num(row.courses),
      learners: num(row.learners),
    };
  });

  return {
    kind: 'teachers',
    query: strOrNull(raw.query),
    total,
    shown: parsed.length,
    truncated: raw.truncated === true || total > parsed.length,
    rows: parsed,
  };
}

const ROLE_LABELS: Record<string, string> = {
  platform_admin: 'Owner',
  governance_admin: 'Governance',
  finance_admin: 'Finance',
  support_agent: 'Support',
  instructor: 'Teacher',
  learner: 'Learner',
  guardian: 'Guardian',
  reviewer: 'Reviewer',
  scholarly_panel_member: 'Scholar board',
  billing_manager: 'Billing',
};

/** A role code said the way a person reads it. Unknown codes are shown raw. */
export function roleLabel(code: string): string {
  return ROLE_LABELS[code] ?? code.replace(/_/g, ' ');
}

/**
 * What the list says above itself, including the case where it is not the whole
 * platform. Silence about a LIMIT is how a list of fifty becomes "we have fifty
 * accounts" in somebody's head.
 */
export function directorySummary(
  result: Pick<Directory<'accounts'>, 'total' | 'shown' | 'truncated'>,
  noun: 'account' | 'teacher',
): string {
  const plural = `${noun}s`;
  if (result.total === 0) return `No ${plural} match.`;
  if (!result.truncated) {
    return result.total === 1 ? `One ${noun}.` : `${result.total} ${plural}.`;
  }
  return `Showing ${result.shown} of ${result.total} ${plural}. Narrow the search to see the rest.`;
}
