/**
 * Revenue analytics — the shape `revenue_breakdown()` returns, and the checks
 * a page has to make before it prints a figure.
 *
 * The database does the arithmetic and this file does not redo it. What it adds
 * is the two things a screen needs that a query cannot give it: a payload that
 * has been looked at before it is trusted, and a statement about whether the
 * report agrees with itself.
 *
 * Why parsing at all. A report whose `byCurrency` came back missing would, with
 * a defensive default, render as "no revenue in this period" — a wrong answer
 * stated calmly. Parsing refuses the payload instead, and the page says it could
 * not be read. Zero and unknown are different screens.
 *
 * Why the self-check. Gross, refunded and net are three columns on purpose: they
 * are asked to agree (`net = gross − refunded`) but never collapsed into one
 * number. If a row disagrees, the page shows the disagreement rather than
 * quietly preferring one of the figures.
 */

export type RevenueCurrencyRow = {
  currency: string;
  orders: number;
  grossMinor: string;
  discountMinor: string;
  refundedMinor: string;
  netMinor: string;
};

export type RevenueCourseRow = {
  courseId: string | null;
  courseSlug: string | null;
  courseTitle: string | null;
  currency: string;
  sales: number;
  grossMinor: string;
  discountMinor: string;
  refundedMinor: string;
  netMinor: string;
};

export type RevenuePlanRow = {
  planCode: string;
  planName: string;
  currency: string;
  sales: number;
  grossMinor: string;
  discountMinor: string;
};

export type RevenueTeacherRow = {
  userId: string;
  displayName: string | null;
  currency: string;
  entries: number;
  grossMinor: string;
  netMinor: string;
  reversedMinor: string;
};

export type RevenueRefundRow = {
  orderId: string;
  currency: string;
  amountMinor: string;
  refundedAt: string;
};

export type RevenueReport = {
  from: string;
  to: string;
  orders: number;
  households: number;
  byCurrency: RevenueCurrencyRow[];
  byCourse: RevenueCourseRow[];
  byPlan: RevenuePlanRow[];
  byTeacher: RevenueTeacherRow[];
  refunds: RevenueRefundRow[];
};

// ---------------------------------------------------------------------------
// Reading a payload
// ---------------------------------------------------------------------------

function record(value: unknown): Record<string, unknown> | null {
  return value && typeof value === 'object' && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function text(value: unknown): string | null {
  if (typeof value === 'string' && value.length > 0) return value;
  // A minor amount is a bigint in the database and jsonb prints it as a JSON
  // number, so it arrives as one unless the query cast it. Both are the same
  // figure and neither is a float in this range; `String()` keeps every digit.
  if (typeof value === 'number' && Number.isSafeInteger(value)) return String(value);
  return null;
}

function count(value: unknown): number | null {
  if (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) return value;
  if (typeof value === 'string' && /^\d+$/.test(value)) return Number(value);
  return null;
}

function list(value: unknown): unknown[] | null {
  return Array.isArray(value) ? value : null;
}

function parseCurrencyRow(value: unknown): RevenueCurrencyRow | null {
  const row = record(value);
  if (!row) return null;
  const currency = text(row.currency);
  const grossMinor = text(row.grossMinor);
  const refundedMinor = text(row.refundedMinor);
  const netMinor = text(row.netMinor);
  const orders = count(row.orders);
  const discountMinor = text(row.discountMinor);
  if (!currency || grossMinor === null || refundedMinor === null || netMinor === null
      || orders === null || discountMinor === null) {
    return null;
  }
  return { currency, orders, grossMinor, discountMinor, refundedMinor, netMinor };
}

function parseCourseRow(value: unknown): RevenueCourseRow | null {
  const row = record(value);
  if (!row) return null;
  const currency = text(row.currency);
  const grossMinor = text(row.grossMinor);
  const discountMinor = text(row.discountMinor);
  const refundedMinor = text(row.refundedMinor);
  const netMinor = text(row.netMinor);
  const sales = count(row.sales);
  if (!currency || grossMinor === null || discountMinor === null
      || refundedMinor === null || netMinor === null || sales === null) {
    return null;
  }
  return {
    courseId: text(row.courseId),
    courseSlug: text(row.courseSlug),
    courseTitle: text(row.courseTitle),
    currency,
    sales,
    grossMinor,
    discountMinor,
    refundedMinor,
    netMinor,
  };
}

function parsePlanRow(value: unknown): RevenuePlanRow | null {
  const row = record(value);
  if (!row) return null;
  const planCode = text(row.planCode);
  const planName = text(row.planName);
  const currency = text(row.currency);
  const grossMinor = text(row.grossMinor);
  const discountMinor = text(row.discountMinor);
  const sales = count(row.sales);
  if (!planCode || !planName || !currency || grossMinor === null
      || discountMinor === null || sales === null) {
    return null;
  }
  return { planCode, planName, currency, sales, grossMinor, discountMinor };
}

function parseTeacherRow(value: unknown): RevenueTeacherRow | null {
  const row = record(value);
  if (!row) return null;
  const userId = text(row.userId);
  const currency = text(row.currency);
  const grossMinor = text(row.grossMinor);
  const netMinor = text(row.netMinor);
  const reversedMinor = text(row.reversedMinor);
  const entries = count(row.entries);
  if (!userId || !currency || grossMinor === null || netMinor === null
      || reversedMinor === null || entries === null) {
    return null;
  }
  return {
    userId,
    displayName: text(row.displayName),
    currency,
    entries,
    grossMinor,
    netMinor,
    reversedMinor,
  };
}

function parseRefundRow(value: unknown): RevenueRefundRow | null {
  const row = record(value);
  if (!row) return null;
  const orderId = text(row.orderId);
  const currency = text(row.currency);
  const amountMinor = text(row.amountMinor);
  const refundedAt = text(row.refundedAt);
  if (!orderId || !currency || amountMinor === null || !refundedAt) return null;
  return { orderId, currency, amountMinor, refundedAt };
}

function parseRows<T>(value: unknown, parse: (row: unknown) => T | null): T[] | null {
  const rows = list(value);
  if (!rows) return null;
  const parsed: T[] = [];
  for (const row of rows) {
    const one = parse(row);
    // One unreadable row is not "skip it": every row in the list is either a
    // figure the page will print or a reason not to print any of them.
    if (one === null) return null;
    parsed.push(one);
  }
  return parsed;
}

/**
 * The report, or null.
 *
 * Null means *this is not the report I know how to read* — never "empty".
 */
export function parseRevenueReport(value: unknown): RevenueReport | null {
  const root = record(value);
  if (!root) return null;

  const from = text(root.from);
  const to = text(root.to);
  const orders = count(root.orders);
  const households = count(root.households);
  if (!from || !to || orders === null || households === null) return null;

  const byCurrency = parseRows(root.byCurrency, parseCurrencyRow);
  const byCourse = parseRows(root.byCourse, parseCourseRow);
  const byPlan = parseRows(root.byPlan, parsePlanRow);
  const byTeacher = parseRows(root.byTeacher, parseTeacherRow);
  const refunds = parseRows(root.refunds, parseRefundRow);
  if (!byCurrency || !byCourse || !byPlan || !byTeacher || !refunds) return null;

  return { from, to, orders, households, byCurrency, byCourse, byPlan, byTeacher, refunds };
}

// ---------------------------------------------------------------------------
// Does the report agree with itself?
// ---------------------------------------------------------------------------

function asBigInt(value: string): bigint | null {
  try {
    return BigInt(value);
  } catch {
    return null;
  }
}

/**
 * Every way this report contradicts itself, in sentences.
 *
 * Empty means it is safe to print. The checks are the ones this screen has no
 * business being wrong about: a row that does not add up, money returned in
 * excess of money taken, and the same currency appearing twice (which would put
 * two figures on the page that a reader would add together by eye).
 */
export function revenueReconciliation(report: RevenueReport): string[] {
  const issues: string[] = [];
  const seen = new Set<string>();

  for (const row of report.byCurrency) {
    if (seen.has(row.currency)) {
      issues.push(`${row.currency} is listed twice, and two rows in one currency read as one total.`);
    }
    seen.add(row.currency);

    const gross = asBigInt(row.grossMinor);
    const refunded = asBigInt(row.refundedMinor);
    const net = asBigInt(row.netMinor);
    if (gross === null || refunded === null || net === null) {
      issues.push(`${row.currency}: one of the three figures is not a whole amount.`);
      continue;
    }
    if (refunded > gross) {
      issues.push(
        `${row.currency}: ${row.refundedMinor} was refunded against ${row.grossMinor} taken.`,
      );
    }
    if (net !== gross - refunded) {
      issues.push(
        `${row.currency}: ${row.grossMinor} taken less ${row.refundedMinor} returned is ` +
          `${gross - refunded}, but the report says ${row.netMinor}.`,
      );
    }
  }

  // Courses are split by proportion line by line, so their refunded figures are
  // allowed to drift by a minor unit from the order's own total. What they are
  // not allowed to do is claim that more came back than was ever taken.
  for (const row of report.byCourse) {
    const gross = asBigInt(row.grossMinor);
    const refunded = asBigInt(row.refundedMinor);
    if (gross === null || refunded === null) {
      issues.push(`${courseLabel(row)}: one of the figures is not a whole amount.`);
      continue;
    }
    if (refunded > gross) {
      issues.push(
        `${courseLabel(row)}: ${row.refundedMinor} was refunded against ${row.grossMinor} sold.`,
      );
    }
  }

  return issues;
}

/** The name to print for a course group — the course, or the fact that there is none. */
export function courseLabel(row: RevenueCourseRow): string {
  if (row.courseTitle) return row.courseTitle;
  if (row.courseSlug) return row.courseSlug;
  // A product that maps to more than one course is reported under the product
  // rather than attributed to one of them; that has to be said, not left blank.
  return 'A product that maps to more than one course';
}

/** The currencies on this report, in a stable order. Never summed. */
export function currenciesIn(report: RevenueReport): string[] {
  const all = new Set<string>();
  for (const row of report.byCurrency) all.add(row.currency);
  for (const row of report.byCourse) all.add(row.currency);
  for (const row of report.byPlan) all.add(row.currency);
  for (const row of report.byTeacher) all.add(row.currency);
  return [...all].sort();
}

/** Rows for one currency, which is how every list on the page is grouped. */
export function forCurrency<T extends { currency: string }>(rows: T[], currency: string): T[] {
  return rows.filter((row) => row.currency === currency);
}

/**
 * The window, written the way a person says it.
 *
 * Dates are read as UTC because that is what the database compared them as; a
 * date rendered in local time can name the day either side of the boundary.
 */
export function describePeriod(report: RevenueReport): string {
  const fmt = (day: string) => {
    const date = new Date(`${day}T00:00:00Z`);
    if (Number.isNaN(date.getTime())) return day;
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      timeZone: 'UTC',
    });
  };
  return `${fmt(report.from)} → ${fmt(report.to)}`;
}

/** True when this period recorded nothing at all — said in words, not with zeroes. */
export function isEmptyPeriod(report: RevenueReport): boolean {
  return report.orders === 0 && report.byCurrency.length === 0;
}
