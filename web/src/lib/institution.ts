/**
 * An institution, as its screens see it.
 *
 * Three rules run through this file, and they are the reason it is a separate
 * module rather than a few `as` casts:
 *
 * 1. **A report is counts, never records.** The parser drops any field it does
 *    not know, so a future database change cannot quietly start rendering a
 *    name through a screen built for numbers.
 * 2. **A claim is not a domain.** A domain the staff have not checked is shown
 *    with its token and the word "waiting"; nothing in this file treats it as
 *    verified.
 * 3. **A key is shown once.** The secret lives in the browser for the length of
 *    one response; the parser only ever sees a prefix and a last-used time.
 */

export type InstitutionFlags = {
  branding: boolean;
  reporting: boolean;
  api: boolean;
  sso: boolean;
};

export type Branding = {
  displayName: string | null;
  tagline: string | null;
  accent: string | null;
  logoUrl: string | null;
  updatedAt: string | null;
};

export type DomainClaim = {
  id: string;
  domain: string;
  status: string;
  claimToken: string | null;
  note: string | null;
  verifiedAt: string | null;
};

export type ApiKey = {
  id: string;
  name: string;
  prefix: string;
  createdAt: string | null;
  lastUsedAt: string | null;
  revokedAt: string | null;
  revokedReason: string | null;
};

export type MyInstitution = {
  joined: boolean;
  joinable: boolean;
  institution: {
    id: string;
    code: string;
    name: string;
    type: string;
    status: string;
  } | null;
  role: 'admin' | 'member' | null;
  joinedAt: string | null;
  branding: Branding | null;
  domains: DomainClaim[];
  keys: ApiKey[];
  flags: InstitutionFlags;
};

export type ReportTotals = {
  members: number;
  learners: number;
  enrolments: number;
  completions: number;
  certificates: number;
};

export type ReportCourse = {
  course: string;
  learnerProfiles: number;
  enrolments: number;
  completions: number;
};

export type InstitutionReport = {
  from: string | null;
  to: string | null;
  totals: ReportTotals;
  courses: ReportCourse[];
  months: { month: string; enrolments: number }[];
};

export type WaitingDomain = {
  id: string;
  domain: string;
  institution: string;
  claimToken: string;
  claimedAt: string | null;
};

export type DirectoryRow = {
  id: string;
  code: string;
  name: string;
  type: string;
  status: string;
  members: number;
  admins: number;
  domains: number;
  waitingDomains: number;
};

export type InstitutionDirectory = {
  institutions: DirectoryRow[];
  waitingDomains: WaitingDomain[];
};

/** The five tones the stylesheet can honour. Anything else is refused in SQL. */
export const ACCENTS: { value: string; label: string }[] = [
  { value: 'green', label: 'Green — the platform’s own' },
  { value: 'teal', label: 'Teal' },
  { value: 'olive', label: 'Olive' },
  { value: 'plum', label: 'Plum' },
  { value: 'slate', label: 'Slate' },
];

export const INSTITUTION_TYPES: { value: string; label: string }[] = [
  { value: 'madrasah', label: 'Madrasah' },
  { value: 'school', label: 'School' },
  { value: 'mosque', label: 'Mosque' },
  { value: 'organisation', label: 'Organisation' },
];

/**
 * What a report is, said once, so every screen and the API documentation can
 * carry the same sentence rather than three approximations of it.
 */
export const REPORT_NOTICE =
  'This is counts, not records. It counts the accounts that joined, the learner profiles ' +
  'belonging to them and to their children, the enrolments those profiles made in the window, ' +
  'completions and certificates — and it returns no name, no learner id and no email. A learner ' +
  'who has no account in this institution is not counted. A count of one can still point at ' +
  'somebody, so treat a small number as you would a name.';

export const SSO_NOTICE =
  'Domain identity is what exists: prove you control the domain, and an account whose address is ' +
  'at it may ask to join. Single sign-on is not connected — SAML and OIDC need an identity ' +
  'provider this platform does not have, so there is no “sign in with your school account” ' +
  'button anywhere.';

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function whole(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return 0;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function flags(value: unknown): InstitutionFlags {
  const row = record(value) ?? {};
  return {
    branding: row.branding === true,
    reporting: row.reporting === true,
    api: row.api === true,
    sso: row.sso === true,
  };
}

export function parseMyInstitution(input: unknown): MyInstitution | null {
  const row = record(input);
  if (!row) return null;

  const inst = record(row.institution);
  const brand = record(row.branding);

  const domains: DomainClaim[] = [];
  for (const entry of list(row.domains)) {
    const item = record(entry);
    if (!item || typeof item.id !== 'string') continue;
    domains.push({
      id: item.id,
      domain: text(item.domain) ?? '',
      status: text(item.status) ?? 'claimed',
      claimToken: text(item.claimToken),
      note: text(item.note),
      verifiedAt: text(item.verifiedAt),
    });
  }

  const keys: ApiKey[] = [];
  for (const entry of list(row.keys)) {
    const item = record(entry);
    if (!item || typeof item.id !== 'string') continue;
    keys.push({
      id: item.id,
      name: text(item.name) ?? '',
      prefix: text(item.prefix) ?? '',
      createdAt: text(item.createdAt),
      lastUsedAt: text(item.lastUsedAt),
      revokedAt: text(item.revokedAt),
      revokedReason: text(item.revokedReason),
    });
  }

  return {
    joined: row.joined === true,
    joinable: row.joinable === true,
    institution: inst
      ? {
          id: typeof inst.id === 'string' ? inst.id : '',
          code: text(inst.code) ?? '',
          name: text(inst.name) ?? '',
          type: text(inst.type) ?? '',
          status: text(inst.status) ?? '',
        }
      : null,
    role: row.role === 'admin' || row.role === 'member' ? row.role : null,
    joinedAt: text(row.joinedAt),
    branding: brand
      ? {
          displayName: text(brand.displayName),
          tagline: text(brand.tagline),
          accent: text(brand.accent),
          logoUrl: text(brand.logoUrl),
          updatedAt: text(brand.updatedAt),
        }
      : null,
    domains,
    keys,
    flags: flags(row.flags),
  };
}

export function parseReport(input: unknown): InstitutionReport | null {
  const row = record(input);
  if (!row) return null;
  const totals = record(row.totals) ?? {};

  const courses: ReportCourse[] = [];
  for (const entry of list(row.courses)) {
    const item = record(entry);
    if (!item) continue;
    // A course row is four numbers and a title. Anything else is dropped, so a
    // reader that later grows a learner column cannot reach a screen.
    courses.push({
      course: text(item.course) ?? 'A course',
      learnerProfiles: whole(item.learnerProfiles),
      enrolments: whole(item.enrolments),
      completions: whole(item.completions),
    });
  }

  const months: { month: string; enrolments: number }[] = [];
  for (const entry of list(row.months)) {
    const item = record(entry);
    if (!item) continue;
    const month = text(item.month);
    if (!month) continue;
    months.push({ month, enrolments: whole(item.enrolments) });
  }

  return {
    from: text(row.from),
    to: text(row.to),
    totals: {
      members: whole(totals.members),
      learners: whole(totals.learners),
      enrolments: whole(totals.enrolments),
      completions: whole(totals.completions),
      certificates: whole(totals.certificates),
    },
    courses,
    months,
  };
}

export function parseDirectory(input: unknown): InstitutionDirectory | null {
  const row = record(input);
  if (!row) return null;

  const institutions: DirectoryRow[] = [];
  for (const entry of list(row.institutions)) {
    const item = record(entry);
    if (!item || typeof item.id !== 'string') continue;
    institutions.push({
      id: item.id,
      code: text(item.code) ?? '',
      name: text(item.name) ?? '',
      type: text(item.type) ?? '',
      status: text(item.status) ?? '',
      members: whole(item.members),
      admins: whole(item.admins),
      domains: whole(item.domains),
      waitingDomains: whole(item.waitingDomains),
    });
  }

  const waitingDomains: WaitingDomain[] = [];
  for (const entry of list(row.waitingDomains)) {
    const item = record(entry);
    if (!item || typeof item.id !== 'string') continue;
    waitingDomains.push({
      id: item.id,
      domain: text(item.domain) ?? '',
      institution: text(item.institution) ?? '',
      claimToken: text(item.claimToken) ?? '',
      claimedAt: text(item.claimedAt),
    });
  }

  return { institutions, waitingDomains };
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

export function describeDomainStatus(status: string): string {
  switch (status) {
    case 'claimed':
      return 'Waiting for staff to check the DNS record';
    case 'verified':
      return 'Verified — accounts at this domain may join';
    case 'rejected':
      return 'Rejected — the record was not found';
    case 'released':
      return 'Released';
    default:
      return status;
  }
}

/** The DNS record an administrator publishes, verbatim, so they can copy it. */
export function dnsRecord(token: string): string {
  return `TXT  @  ${token}`;
}

/** What a refusal from the database means, in a sentence. */
export function institutionRefusal(message: string): { code: string; message: string } {
  const key = /institution:([a-z_]+)/i.exec(message)?.[1]?.toLowerCase();
  const sentences: Record<string, string> = {
    not_signed_in: 'Sign in first.',
    not_a_member: 'You are not a member of an institution.',
    not_an_admin: 'Only an administrator of this institution can do that.',
    not_allowed: 'Only the platform owner can do that.',
    already_joined: 'You already belong to an institution.',
    no_verified_domain:
      'No verified domain matches your address. An administrator has to claim the domain and a ' +
      'staff member has to check it before anyone can join by it.',
    domains_closed:
      'Domain identity is switched off at the moment, so no domain can be claimed and nobody can ' +
      'join. Nothing was changed.',
    branding_closed: 'Branding is switched off at the moment. Nothing was saved.',
    reporting_closed: 'Reporting is switched off at the moment. Nothing was read.',
    api_closed: 'The institution API is switched off at the moment. No key was created.',
    domain_required: 'Type the domain, for example school.example.',
    domain_not_found: 'That claim could not be found.',
    already_decided: 'That domain has already been decided.',
    key_not_found: 'That key could not be found.',
    already_revoked: 'That key was already revoked.',
    reason_required: 'Write a reason. Somebody will read it.',
    bad_window: 'Choose a start date before the end date.',
    window_too_long: 'Choose a window of two years or less.',
    last_admin:
      'You are the only administrator. Appoint somebody else before you leave or step down.',
    admin_not_found: 'That account does not exist.',
    bad_key: 'That key is not valid.',
    rate_limited: 'This key has used its allowance for this hour. Try again later.',

    // Seats. Each sentence names what the person reading it can do next, which
    // is why "the code is used" and "the code was withdrawn" are not one line.
    seats_closed:
      'Institution seats are switched off at the moment. Nothing was bought, issued or claimed.',
    invoice_required:
      'Record the invoice or transfer reference. A seat with no record of payment is a seat somebody will argue about.',
    seats_out_of_range: 'Choose between 1 and 500 seats for one order.',
    money_incomplete:
      'Give both the price per seat and the currency, or neither. Half a price is not a record.',
    order_not_found: 'That order could not be found.',
    no_codes: 'No codes were sent.',
    codes_out_of_range: 'Issue between 1 and 200 codes at a time.',
    not_enough_seats:
      'That is more codes than the order has left. The order is the limit — issue the rest on a new one.',
    bad_code: 'That code does not look like one of ours. Check it and try again.',
    code_unknown: 'No seat matches that code. Check it, or ask the school that gave it to you.',
    code_used: 'That code has already been used. Ask the school for another seat.',
    code_voided: 'That code was withdrawn by the school, so it no longer works. Ask them for another.',
    code_not_found: 'That code could not be found.',
    course_unavailable: 'That course is not open for new learners at the moment.',
    not_your_learner: 'That learner is not one you manage.',
    already_enrolled:
      'You are already enrolled in that course, so the code has not been used. Give it to somebody who is not.',
    not_found: 'That institution could not be found.',
  };
  if (key && sentences[key]) return { code: key, message: sentences[key]! };
  return { code: 'unknown', message: 'That did not work, and nothing changed.' };
}

/**
 * A logo address is only rendered if it is one — the database already refuses
 * anything but https, and this is the second refusal so a bad row from another
 * day cannot become an `<img>` with a `javascript:` source.
 */
export function safeLogoUrl(value: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' ? url.toString() : null;
  } catch {
    return null;
  }
}

/** The report as a CSV the institution can open in a spreadsheet. */
export function reportCsv(report: InstitutionReport): string {
  const rows: string[] = [];
  rows.push('"Course","Learner profiles","Enrolments","Completions"');
  for (const row of report.courses) {
    rows.push(
      [row.course, row.learnerProfiles, row.enrolments, row.completions]
        .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
        .join(','),
    );
  }
  rows.push('');
  rows.push('"Month","Enrolments"');
  for (const row of report.months) {
    rows.push(`"${row.month}",${row.enrolments}`);
  }
  return `${rows.join('\n')}\n`;
}
