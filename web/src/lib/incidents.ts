/**
 * The incident register, read.
 *
 * An incident register is a document somebody else reads later: a regulator, a
 * school, a parent, or the owner themselves at 2 a.m. wondering what is outstanding.
 * Three things it therefore has to get right, and they are the three things this
 * module exists to make testable:
 *
 * 1. **What is late.** A deadline is typed by a person, and the register's job is to
 *    make it impossible to overlook — not to compute one. Every sentence below is
 *    built to say how many hours are left or how many have gone.
 * 2. **What is decided rather than met.** An obligation that will not be told is
 *    recorded with a reason. It must never look the same as one that is simply
 *    unstarted, which is why `waived` is its own state and its own sentence.
 * 3. **Counts, never people.** Nothing in these types can hold a name of an affected
 *    person, because the database does not return one.
 *
 * Pure, so every sentence is testable without a browser or a database.
 */

export type IncidentSeverity = 'critical' | 'major' | 'minor';
export type IncidentStatus = 'open' | 'contained' | 'resolved' | 'closed';
export type ObligationState = 'due' | 'overdue' | 'told' | 'late' | 'waived';
export type EntryKind = 'update' | 'containment' | 'decision' | 'notification' | 'lesson';

export type IncidentSummary = {
  id: string;
  reference: string;
  title: string;
  summary: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  discoveredAt: string;
  daysOpen: number;
  people: number;
  children: number;
  teachers: number;
  categories: string[];
  obligations: number;
  told: number;
  waived: number;
  overdue: number;
  nextDue: string | null;
  hasNotice: boolean;
  hasImpact: boolean;
  hasLessons: boolean;
};

export type IncidentRegister = {
  incidents: IncidentSummary[];
  counts: {
    open: number;
    resolved: number;
    closed: number;
    critical: number;
    overdueObligations: number;
    noObligations: number;
    childrenAffected: number;
  };
  canWork: boolean;
};

export type Obligation = {
  id: string;
  audience: string;
  basis: string;
  dueAt: string;
  toldAt: string | null;
  toldBy: string | null;
  method: string | null;
  note: string | null;
  waivedAt: string | null;
  waiveReason: string | null;
  state: ObligationState;
};

export type IncidentEntry = {
  id: string;
  kind: EntryKind;
  body: string;
  actor: string | null;
  at: string;
};

export type IncidentDetail = {
  incident: {
    id: string;
    reference: string;
    title: string;
    summary: string;
    severity: IncidentSeverity;
    status: IncidentStatus;
    occurredAt: string | null;
    discoveredAt: string;
    containedAt: string | null;
    resolvedAt: string | null;
    closedAt: string | null;
    categories: string[];
    people: number;
    children: number;
    teachers: number;
    harm: string | null;
    learnerNotice: string | null;
    lessons: string | null;
    openedBy: string | null;
    createdAt: string;
  };
  notifications: Obligation[];
  entries: IncidentEntry[];
};

export const SEVERITY_LABEL: Record<IncidentSeverity, string> = {
  critical: 'Critical',
  major: 'Major',
  minor: 'Minor',
};

export const STATUS_LABEL: Record<IncidentStatus, string> = {
  open: 'Open',
  contained: 'Contained',
  resolved: 'Resolved',
  closed: 'Closed',
};

export const OBLIGATION_LABEL: Record<ObligationState, string> = {
  due: 'Due',
  overdue: 'Overdue',
  told: 'Told',
  late: 'Told late',
  waived: 'Decided against',
};

export const CATEGORY_LABEL: Record<string, string> = {
  accounts: 'Account details',
  learning: 'Learning records',
  children: 'Children’s data',
  payments: 'Payment records',
  messages: 'Messages',
  credentials: 'Credentials',
  teacher_records: 'Teacher records',
};

export function severityLabel(severity: string | null | undefined): string {
  return SEVERITY_LABEL[severity as IncidentSeverity] ?? 'Major';
}

export function statusLabel(status: string | null | undefined): string {
  return STATUS_LABEL[status as IncidentStatus] ?? 'Open';
}

export function obligationLabel(state: string | null | undefined): string {
  return OBLIGATION_LABEL[state as ObligationState] ?? 'Due';
}

export function categoryLabels(categories: string[] | null | undefined): string[] {
  if (!categories || categories.length === 0) return ['Not yet described'];
  return categories.map((c) => CATEGORY_LABEL[c] ?? c.replace(/_/g, ' '));
}

/** A date and time, because a deadline is a time of day as well as a day. */
export function moment(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/** How long is left, said in the unit a person would say it in. */
export function timeUntil(dueAt: string, now: Date = new Date()): string {
  const due = new Date(dueAt);
  if (Number.isNaN(due.getTime())) return 'with no readable deadline';
  const minutes = Math.round((due.getTime() - now.getTime()) / 60000);
  const past = minutes < 0;
  const size = Math.abs(minutes);
  let amount: string;
  if (size < 60) amount = `${size} minute${size === 1 ? '' : 's'}`;
  else if (size < 60 * 24) {
    const hours = Math.round(size / 60);
    amount = `${hours} hour${hours === 1 ? '' : 's'}`;
  } else {
    const days = Math.round(size / 1440);
    amount = `${days} day${days === 1 ? '' : 's'}`;
  }
  return past ? `${amount} late` : `${amount} left`;
}

/**
 * One obligation, in the sentence that decides what the reader does next.
 *
 * A met obligation says when and how, and whether it was late. An unmet one says
 * how long is left — or how long it has been overdue, which is the number that ends
 * up in a report.
 */
export function obligationSentence(obligation: Obligation, now: Date = new Date()): string {
  switch (obligation.state) {
    case 'told':
      return `Told ${moment(obligation.toldAt) ?? 'at an unrecorded time'}${obligation.method ? ` by ${obligation.method}` : ''}, inside the deadline.`;
    case 'late':
      return `Told ${moment(obligation.toldAt) ?? 'at an unrecorded time'}${obligation.method ? ` by ${obligation.method}` : ''} — after the deadline.`;
    case 'waived':
      return `Decided not to tell: ${obligation.waiveReason ?? 'no reason recorded'}`;
    case 'overdue':
      return `Overdue by ${timeUntil(obligation.dueAt, now).replace(' late', '')} — it was due ${moment(obligation.dueAt) ?? 'on a date that is not recorded'}.`;
    default:
      return `Due ${moment(obligation.dueAt) ?? 'on a date that is not recorded'} — ${timeUntil(obligation.dueAt, now)}.`;
  }
}

/**
 * The line above the queue.
 *
 * Ordered by what would cost something if it were missed: an overdue obligation
 * first, then an incident with nobody to tell, then children affected. A register
 * that opens with "3 incidents" has told the reader nothing they can act on.
 */
export function registerHeadline(register: IncidentRegister | null | undefined): string {
  if (!register) return 'The register could not be read.';
  const { open, overdueObligations, noObligations, childrenAffected } = register.counts;
  if (open === 0 && register.counts.closed === 0 && register.counts.resolved === 0) {
    return 'No incident has ever been recorded. That is either a good sign or a register nobody writes in.';
  }
  const parts: string[] = [];
  parts.push(open === 1 ? 'One incident is open' : `${open} incidents are open`);
  if (overdueObligations > 0) {
    parts.push(overdueObligations === 1
      ? 'and one notification is past its deadline'
      : `and ${overdueObligations} notifications are past their deadline`);
  }
  const sentence = `${parts.join(' ')}.`;
  const notes: string[] = [];
  if (noObligations > 0) {
    notes.push(noObligations === 1
      ? 'One open incident has nobody recorded to tell.'
      : `${noObligations} open incidents have nobody recorded to tell.`);
  }
  if (childrenAffected > 0) {
    notes.push(childrenAffected === 1
      ? 'One child is affected by an incident that is not closed.'
      : `${childrenAffected} children are affected by incidents that are not closed.`);
  }
  return notes.length === 0 ? sentence : `${sentence} ${notes.join(' ')}`;
}

/**
 * What is standing between this incident and the next state.
 *
 * The console disables a button with a reason rather than letting a click be
 * refused, and this is that reason. It mirrors the database exactly — and the
 * database is still the one that decides, so a disagreement here is a bug in the
 * sentence, never a hole in the rule.
 */
export function nextStateProblem(
  incident: IncidentDetail,
  next: IncidentStatus,
): string | null {
  const status = incident.incident.status;
  const order: IncidentStatus[] = ['open', 'contained', 'resolved', 'closed'];
  const from = order.indexOf(status);
  const to = order.indexOf(next);
  if (next === 'open') {
    if (status === 'open') return 'It is already open.';
    return null;
  }
  if (to <= from) {
    return next === status
      ? `It is already ${statusLabel(next).toLowerCase()}.`
      : `A ${statusLabel(status).toLowerCase()} incident does not go back to ${statusLabel(next).toLowerCase()}; reopen it instead.`;
  }
  if (to > from + 1) {
    return `It has to pass through ${statusLabel(order[from + 1]).toLowerCase()} first.`;
  }
  if (next === 'resolved' || next === 'closed') {
    const open = incident.notifications.filter((n) => n.toldAt === null && n.waivedAt === null).length;
    if (open > 0) {
      return open === 1
        ? 'One notification is neither told nor decided against. Met or waived, it closes the gap.'
        : `${open} notifications are neither told nor decided against. Met or waived, they close the gap.`;
    }
  }
  if (next === 'closed') {
    const lessons = (incident.incident.lessons ?? '').trim();
    if (lessons.length < 20) {
      return 'Record what changed before closing it, or the same incident happens again.';
    }
  }
  return null;
}

/**
 * The states this incident can move to right now.
 *
 * Used to build the buttons, so the console never offers a transition that will be
 * refused — the same rule as everywhere else: a link that refuses teaches the reader
 * to stop reading the page.
 */
export function nextStates(incident: IncidentDetail): IncidentStatus[] {
  const status = incident.incident.status;
  switch (status) {
    case 'open':
      return ['contained', 'resolved', 'open'];
    case 'contained':
      return ['resolved', 'open'];
    case 'resolved':
      return ['closed', 'open'];
    case 'closed':
      return ['open'];
    default:
      return [];
  }
}

/** "412 people, of whom 30 are children" — and never a list. */
export function impactSentence(incident: Pick<IncidentDetail['incident'], 'people' | 'children' | 'teachers'>): string {
  if (incident.people === 0) return 'Nobody is recorded as affected yet.';
  const people = `${incident.people} ${incident.people === 1 ? 'person' : 'people'}`;
  const notes: string[] = [];
  if (incident.children > 0) {
    notes.push(`${incident.children} ${incident.children === 1 ? 'is a child' : 'are children'}`);
  }
  if (incident.teachers > 0) {
    notes.push(`${incident.teachers} ${incident.teachers === 1 ? 'is a teacher' : 'are teachers'}`);
  }
  return notes.length === 0 ? `${people}.` : `${people}, of whom ${notes.join(' and ')}.`;
}

/**
 * The one thing a notice field must never imply.
 *
 * There is no email or SMS provider. A console that offers "Send notice" would be
 * promising delivery the platform cannot make, and the promise would be discovered
 * at exactly the wrong moment.
 */
export const NOTICE_NOT_SENT =
  'Written and held, not sent. There is no email or SMS provider behind this platform yet, so the '
  + 'notice has to be copied out and delivered by hand until one is configured.';

const INCIDENT_ERROR: Record<string, string> = {
  'incident:not_allowed': 'The owner or governance staff work incidents.',
  'incident:not_signed_in': 'Sign in first.',
  'incident:not_found': 'That incident does not exist — or is already gone.',
  'incident:closed': 'That incident is closed. Reopen it before changing what it says.',
  'incident:title_required': 'Give the incident a title somebody can find it by.',
  'incident:summary_required': 'Say what happened, in a sentence somebody else could act on.',
  'incident:severity_invalid': 'Choose critical, major or minor.',
  'incident:discovered_in_the_future': 'The discovery time is in the future — a typo, and every clock would start late.',
  'incident:occurred_after_discovery': 'An incident cannot have started after it was found.',
  'incident:category_invalid': 'One of those kinds of data is not one the register knows.',
  'incident:count_invalid': 'Counts are whole numbers and cannot be negative.',
  'incident:count_incoherent': 'Children and teachers are people; neither can exceed the total.',
  'incident:entry_required': 'Write what happened, in a few words.',
  'incident:entry_kind_invalid': 'That is not a kind of log entry.',
  'incident:entry_append_only': 'The log is a record, not a document. Add a line instead of editing one.',
  'incident:audience_required': 'Say who has to be told.',
  'incident:basis_required': 'Say what requires this notification — a habit is not a basis.',
  'incident:due_date_required': 'The deadline is the point of recording the obligation.',
  'incident:method_required': 'Say how they were told — a letter, an email, a call.',
  'incident:already_told': 'That one was already told. Put a correction in the log instead.',
  'incident:already_waived': 'It was decided not to tell them. Record the change of mind in the log.',
  'incident:reason_required': 'Write the reason. It outlives the incident and somebody will read it.',
  'incident:notice_required': 'Say what happened, what it means for them, and what to do.',
  'incident:status_invalid': 'That is not a status an incident has.',
  'incident:status_unchanged': 'It is already in that state.',
  'incident:transition_invalid': 'An incident moves one step at a time, and a closed one is reopened rather than moved sideways.',
  'incident:obligations_open': 'A notification is neither told nor decided against. One of those, and it can move on.',
  'incident:lessons_required': 'Record what changed, so that this cannot happen the same way again.',
};

export function describeIncidentError(message: string | null | undefined, hint?: string | null): string {
  const code = (message ?? '').trim();
  const known = INCIDENT_ERROR[code];
  if (known) {
    if (hint && hint.trim() && (code === 'incident:obligations_open' || code === 'incident:transition_invalid')) {
      return `${known} ${hint.trim()}.`;
    }
    return known;
  }
  if (hint && hint.trim()) return hint.trim();
  if (!code) return 'That did not work, and the reason was not returned.';
  return code.startsWith('incident:') ? code.slice('incident:'.length).replace(/_/g, ' ') : code;
}

/** What the form offers. Two severities would be a shrug; five would be a taxonomy. */
export const SEVERITIES: readonly IncidentSeverity[] = ['critical', 'major', 'minor'];

export const CATEGORIES = Object.keys(CATEGORY_LABEL) as readonly string[];
