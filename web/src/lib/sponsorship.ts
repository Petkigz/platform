/**
 * Sponsoring a seat, as a screen sees it.
 *
 * Two people are on opposite sides of one thing and neither is allowed to see
 * the other. Everything in this file is shaped by that: the donor's parser has
 * no learner field to render, and the applicant's parser has no donor field.
 * The database does not send them; this file does not invent them.
 *
 * The other rule is the money one. A pledge is not a payment, and no screen may
 * imply that a card or a mobile-money prompt exists — nothing can take a
 * sponsorship automatically, so staff record what arrived.
 */

export type ApplicationStatus =
  | 'submitted'
  | 'approved'
  | 'declined'
  | 'withdrawn'
  | 'funded'
  | string;

export type SponsorshipApplication = {
  id: string;
  learnerName: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  status: ApplicationStatus;
  seatCode: string | null;
  reason: string | null;
  decisionReason: string | null;
  askedAt: string | null;
  decidedAt: string | null;
  covered: boolean;
};

export type Sponsorship = {
  id: string;
  seatCode: string | null;
  courseTitle: string | null;
  courseSlug: string | null;
  status: string;
  amountMinor: string | null;
  currencyCode: string | null;
  reference: string | null;
  recordedAt: string | null;
  pledgedAt: string | null;
};

export type PoolSeat = {
  seatCode: string;
  courseTitle: string | null;
  courseSlug: string | null;
  audience: string | null;
  difficulty: string | null;
  approvedAt: string | null;
  amountMinor: string | null;
  currencyCode: string | null;
  priceReason: string | null;
};

export type SponsorshipPool = {
  enabled: boolean;
  reason: string | null;
  seats: PoolSeat[];
};

export type SponsorshipOverview = {
  enabled: boolean;
  waiting: {
    id: string;
    learnerName: string | null;
    courseTitle: string | null;
    reason: string | null;
    askedAt: string | null;
    applicantName: string | null;
  }[];
  seats: {
    id: string;
    seatCode: string | null;
    courseTitle: string | null;
    donor: string | null;
    status: string;
    amountMinor: string | null;
    currencyCode: string | null;
    reference: string | null;
    pledgedAt: string | null;
  }[];
  counts: {
    waiting: number;
    approved: number;
    funded: number;
    declined: number;
    pledged: number;
    paid: number;
  };
};

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.length > 0 ? value : null;
}

function whole(value: unknown, fallback = 0): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.trunc(value);
  if (typeof value === 'string' && value.trim() !== '' && Number.isFinite(Number(value))) {
    return Math.trunc(Number(value));
  }
  return fallback;
}

function list(value: unknown): unknown[] {
  return Array.isArray(value) ? value : [];
}

function application(input: unknown): SponsorshipApplication | null {
  const row = record(input);
  if (!row) return null;
  return {
    id: typeof row.id === 'string' ? row.id : '',
    learnerName: text(row.learnerName),
    courseTitle: text(row.courseTitle),
    courseSlug: text(row.courseSlug),
    status: typeof row.status === 'string' ? row.status : 'submitted',
    seatCode: text(row.seatCode),
    reason: text(row.reason),
    decisionReason: text(row.decisionReason),
    askedAt: text(row.askedAt),
    decidedAt: text(row.decidedAt),
    covered: row.covered === true,
  };
}

function sponsorship(input: unknown): Sponsorship | null {
  const row = record(input);
  if (!row) return null;
  return {
    id: typeof row.id === 'string' ? row.id : '',
    seatCode: text(row.seatCode),
    courseTitle: text(row.courseTitle),
    courseSlug: text(row.courseSlug),
    status: typeof row.status === 'string' ? row.status : 'pledged',
    // Money stays a string from the database to the wire; a bigint narrowed by
    // Number is the one place a digit can disappear.
    amountMinor: text(String(row.amountMinor ?? '')),
    currencyCode: text(row.currencyCode),
    reference: text(row.reference),
    recordedAt: text(row.recordedAt),
    pledgedAt: text(row.pledgedAt),
  };
}

/** What `my_sponsorship_applications()` returns. */
export function parseApplicationBoard(input: unknown): {
  enabled: boolean;
  applications: SponsorshipApplication[];
} | null {
  const row = record(input);
  if (!row) return null;
  return {
    enabled: row.enabled === true,
    applications: list(row.applications)
      .map(application)
      .filter((a): a is SponsorshipApplication => a !== null),
  };
}

/** What `my_sponsorships()` returns. */
export function parseSponsorBoard(input: unknown): {
  enabled: boolean;
  sponsorships: Sponsorship[];
} | null {
  const row = record(input);
  if (!row) return null;
  return {
    enabled: row.enabled === true,
    sponsorships: list(row.sponsorships)
      .map(sponsorship)
      .filter((s): s is Sponsorship => s !== null),
  };
}

/** What `sponsorship_pool()` returns. Carries nothing that identifies anybody. */
export function parsePool(input: unknown): SponsorshipPool | null {
  const row = record(input);
  if (!row) return null;

  const seats: PoolSeat[] = [];
  for (const entry of list(row.seats)) {
    const seat = record(entry);
    if (!seat) continue;

    // A seat nobody can name cannot be taken, so a row without a code is
    // dropped rather than rendered as a button that would always fail.
    const seatCode = text(seat.seatCode);
    if (!seatCode) continue;

    const price = record(seat.price) ?? {};
    const amount =
      price.amountMinor === undefined || price.amountMinor === null
        ? null
        : String(price.amountMinor);

    seats.push({
      seatCode,
      courseTitle: text(seat.courseTitle),
      courseSlug: text(seat.courseSlug),
      audience: text(seat.audience),
      difficulty: text(seat.difficulty),
      approvedAt: text(seat.approvedAt),
      amountMinor: amount,
      currencyCode: text(price.currencyCode),
      priceReason: text(price.reason),
    });
  }

  return { enabled: row.enabled === true, reason: text(row.reason), seats };
}

/** What `sponsorship_overview()` returns. Staff only. */
export function parseOverview(input: unknown): SponsorshipOverview | null {
  const row = record(input);
  if (!row) return null;
  const counts = record(row.counts) ?? {};
  return {
    enabled: row.enabled === true,
    waiting: list(row.waiting)
      .map((entry) => {
        const item = record(entry);
        if (!item) return null;
        return {
          id: typeof item.id === 'string' ? item.id : '',
          learnerName: text(item.learnerName),
          courseTitle: text(item.courseTitle),
          reason: text(item.reason),
          askedAt: text(item.askedAt),
          applicantName: text(item.applicantName),
        };
      })
      .filter((r): r is SponsorshipOverview['waiting'][number] => r !== null),
    seats: list(row.seats)
      .map((entry) => {
        const item = record(entry);
        if (!item) return null;
        return {
          id: typeof item.id === 'string' ? item.id : '',
          seatCode: text(item.seatCode),
          courseTitle: text(item.courseTitle),
          donor: text(item.donor),
          status: typeof item.status === 'string' ? item.status : 'pledged',
          amountMinor: item.amountMinor === undefined ? null : String(item.amountMinor),
          currencyCode: text(item.currencyCode),
          reference: text(item.reference),
          pledgedAt: text(item.pledgedAt),
        };
      })
      .filter((r): r is SponsorshipOverview['seats'][number] => r !== null),
    counts: {
      waiting: whole(counts.waiting),
      approved: whole(counts.approved),
      funded: whole(counts.funded),
      declined: whole(counts.declined),
      pledged: whole(counts.pledged),
      paid: whole(counts.paid),
    },
  };
}

// ---------------------------------------------------------------------------
// Words
// ---------------------------------------------------------------------------

const APPLICATION_WORDS: Record<string, string> = {
  submitted: 'Waiting for somebody to read it',
  approved: 'Approved, and waiting for a sponsor',
  funded: 'Covered — somebody paid for this seat',
  declined: 'Not approved',
  withdrawn: 'You took this back',
};

const SPONSORSHIP_WORDS: Record<string, string> = {
  pledged: 'Pledged — waiting for the payment to be recorded',
  paid: 'Paid, and the seat is open',
  withdrawn: 'Called off',
};

export function describeApplicationStatus(status: ApplicationStatus): string {
  return APPLICATION_WORDS[status] ?? 'Recorded';
}

export function describeSponsorshipStatus(status: string): string {
  return SPONSORSHIP_WORDS[status] ?? 'Recorded';
}

/** Who a course is for, in words rather than an enum. */
export function audienceWords(audience: string | null): string {
  if (audience === 'child') return 'for a child';
  if (audience === 'adult') return 'for an adult';
  return '';
}

/**
 * The price a sponsor would pay for a seat, or the reason they cannot.
 *
 * A seat whose course has no price in the sponsor's market is still shown —
 * hiding it would make the pool look shorter than it is — but it cannot be
 * taken, and the sentence says why.
 */
export function seatPrice(seat: PoolSeat): { ok: boolean; label: string } {
  if (!seat.amountMinor || !seat.currencyCode) {
    return {
      ok: false,
      label: 'This course is not priced where you are, so this seat cannot be taken from here.',
    };
  }
  return { ok: true, label: `${seat.currencyCode} ${seat.amountMinor}` };
}

/** One sentence about where a pledge stands. Never implies a provider exists. */
export function pledgeNextStep(status: string): string {
  if (status === 'pledged') {
    return (
      'No card or mobile-money provider is connected to this platform yet, so nothing ' +
      'is taken automatically. Pay the amount by whatever means the platform directs, ' +
      'and staff will record it here — the seat opens when they do.'
    );
  }
  if (status === 'paid') {
    return 'Recorded. The seat is open for the learner, and they have not been told who paid.';
  }
  return 'This pledge was called off, so no money is expected for it.';
}

/** What a refusal from the database means, in a sentence. */
export function sponsorshipRefusal(message: string): { code: string; message: string } {
  const key = /sponsorship:([a-z_]+)/i.exec(message)?.[1]?.toLowerCase();
  const sentences: Record<string, string> = {
    disabled:
      'Sponsoring a seat is not switched on for this platform yet. The courses are still here.',
    not_signed_in: 'Sign in first — a sponsorship and a request are both attached to an account.',
    reason_required: 'Say a sentence about the situation. It is what the person deciding reads.',
    reason_too_long: 'That is longer than this field holds; a few sentences is enough.',
    learner_required: 'Choose who the course is for.',
    learner_not_yours:
      'That learner is not on your account. You can only ask for yourself or a child in your family.',
    course_not_available: 'That course is not on sale at the moment.',
    already_has_access: 'That learner already has this course, so there is nothing to sponsor.',
    already_asked: 'There is already an open request for this course. Only one is decided at a time.',
    not_allowed: 'Only the platform owner or finance can do that.',
    not_found: 'That request or seat could not be found.',
    already_decided: 'That request has already been decided.',
    seat_not_found: 'That seat code is not one we recognise.',
    seat_not_open: 'That seat is not open to sponsors.',
    seat_taken: 'Somebody took that seat a moment before you did. Choose another.',
    own_seat: 'That is the seat you asked for. You cannot sponsor your own request.',
    no_price_for_you:
      'This course has no price in your market, so we cannot take a sponsorship for it. ' +
      'Contact us and we will sort it out.',
    reference_required: 'Record the reference the payment came with, so it can be found later.',
    already_paid: 'That sponsorship is already recorded as paid.',
    withdrawn: 'That sponsorship was called off.',
    note_too_long: 'That note is longer than this field holds.',
  };
  if (key && sentences[key]) return { code: key, message: sentences[key]! };
  return { code: 'unknown', message: 'That did not work, and nothing was charged or changed.' };
}

/**
 * The sentence every screen about sponsorship has to carry. Whether a gift
 * counts as zakat is a scholar's ruling, and this platform does not make it.
 */
export const ZAKAT_HONESTY =
  'Whether a sponsored seat counts as zakat, sadaqah or neither is a scholar’s ' +
  'ruling, and this platform does not make it. Ask somebody you trust before you give.';
