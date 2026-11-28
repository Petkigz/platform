/**
 * What the staff console shows one staff member.
 *
 * `/admin` is one address with four kinds of staff behind it, and the rule the
 * owner set is that each person's power ends where their work does. The queues
 * at the top were already filtered in the database (`staff_attention()`), which
 * is the part that matters — a count that is not sent cannot be read. The links
 * and the switchboard below them were not filtered at all: a support agent was
 * shown a wall of money links, a revenue-share field, and ninety feature
 * switches they could not touch.
 *
 * A link is a smaller thing than a number, and hiding one is a courtesy rather
 * than a control. But a console that offers work you will be refused for is a
 * console that teaches you to stop reading it — and the one time it matters is
 * the time it offered something that looked like it would work.
 *
 * Pure, so the matrix is testable without a browser or a database.
 */
import type { MessageKey } from './i18n/messages/en.ts';

export type StaffFacts = {
  platformAdmin: boolean;
  financeAdmin: boolean;
  governanceAdmin: boolean;
  supportAgent: boolean;
};

export type ConsoleSections = {
  /** The flag register and the revenue share. The owner's own work. */
  switchboard: boolean;
  /** Orders, refunds, payouts, reconciliation, tax, rates, the money report. */
  money: boolean;
  /** Review assignments, the reviewer register, appeals. */
  publication: boolean;
  /** The support queue. */
  support: boolean;
  /**
   * Content moderation: reports, held reviews, media, discussion. Every
   * privileged role may work these, so it is not a section that narrows.
   */
  moderation: boolean;
};

/**
 * Which parts of the console belong to this person.
 *
 * The platform admin sees everything, because everything is theirs; the other
 * three see their own work plus moderation, which any privileged person may
 * do. A finance admin does not see the support queue and a support agent does
 * not see the money screens — not because the counts are hidden (they already
 * are) but because the link would be a promise.
 */
export function consoleSections(facts: StaffFacts): ConsoleSections {
  const platform = facts.platformAdmin;
  return {
    switchboard: platform,
    money: platform || facts.financeAdmin,
    publication: platform || facts.governanceAdmin,
    support: platform || facts.supportAgent,
    moderation: platform || facts.financeAdmin || facts.governanceAdmin || facts.supportAgent,
  };
}

/**
 * The sentence a non-owner reads where the switchboard would be (a key of
 * the message catalogue), or null for the owner, who has the switchboard.
 *
 * It does not say "you do not have permission", which reads as a fault the
 * reader should report. It says whose the switches are, because that is the
 * useful fact: the person who can turn a feature on is one specific person, and
 * asking them is the action.
 *
 * Until 2026-11-28 it also named the reader's work ("money and publication").
 * A list joined by "and" is not a sentence every language can be handed in
 * pieces, and the headings right below it name the same work.
 */
export function switchboardNotice(facts: StaffFacts): 'staff.notOwner' | null {
  return facts.platformAdmin ? null : 'staff.notOwner';
}

/**
 * The words for a queue, by the code `staff_attention()` gives it.
 *
 * The database still sends an English label and sentence with each queue.
 * They are what is shown for a code this table does not have, so that a queue
 * added in a migration is never nameless; the page marks them as English.
 */
export const QUEUE_WORDS: Readonly<Record<string, { label: MessageKey; detail: MessageKey }>> = {
  refunds: { label: 'staff.lRefunds', detail: 'staff.dRefunds' },
  disputes: { label: 'staff.lDisputes', detail: 'staff.dDisputes' },
  reconciliation: { label: 'staff.qReconciliation', detail: 'staff.dReconciliation' },
  payouts: { label: 'staff.lPayouts', detail: 'staff.dPayouts' },
  support: { label: 'staff.qSupport', detail: 'staff.dSupport' },
  appeals: { label: 'staff.qAppeals', detail: 'staff.dAppeals' },
  credentials: { label: 'staff.qCredentials', detail: 'staff.dCredentials' },
  guardians: { label: 'staff.qGuardians', detail: 'staff.dGuardians' },
  board_reports_students: { label: 'staff.qBoardStudents', detail: 'staff.dBoards' },
  board_reports_teachers: { label: 'staff.qBoardTeachers', detail: 'staff.dBoards' },
  reports: { label: 'staff.qReports', detail: 'staff.dReports' },
  reviews: { label: 'staff.qReviews', detail: 'staff.dReviews' },
  media: { label: 'staff.qMedia', detail: 'staff.dMedia' },
};

export type ConsoleLink = { href: string; label: MessageKey; note: MessageKey };

/**
 * The screens below the queues, grouped by who may open them.
 *
 * Each group matches the gate its page actually enforces — the money screens
 * redirect anybody without `finance_admin` or `platform_admin`, so a support
 * agent is not shown them here. A link that refuses is worse than no link: it
 * teaches the reader that this page cannot be trusted to know what they may do.
 *
 * A screen whose page gate is `is_privileged` is in `shared`, whoever it
 * belongs to conceptually. Being honest about the gate beats being tidy about
 * the filing.
 *
 * `label` and `note` are keys of the catalogue. The note is the sentence
 * beside the link (`console.n…`, in `i18n/messages/console.ts` since
 * 2026-11-28); its English is in `en.ts`, where a flag's key is written as
 * the register writes it and without the backticks it used to carry here.
 */
export const CONSOLE_LINKS = {
  money: [
    {
      href: '/admin/orders',
      label: 'staff.lOrders',
      note: 'console.nOrders',
    },
    {
      href: '/admin/refunds',
      label: 'staff.lRefunds',
      note: 'console.nRefunds',
    },
    {
      href: '/admin/financial-adjustments',
      label: 'staff.lAdjustments',
      note: 'console.nAdjustments',
    },
    {
      href: '/admin/reconciliation',
      label: 'staff.lReconciliation',
      note: 'console.nReconciliation',
    },
    {
      href: '/admin/disputes',
      label: 'staff.lDisputes',
      note: 'console.nDisputes',
    },
    {
      href: '/admin/tax',
      label: 'staff.lTax',
      note: 'console.nTax',
    },
    {
      href: '/admin/exchange-rates',
      label: 'staff.lRates',
      note: 'console.nRates',
    },
    {
      href: '/admin/revenue',
      label: 'staff.lRevenue',
      note: 'console.nRevenue',
    },
    {
      href: '/admin/money-report',
      label: 'staff.lMoneyReport',
      note: 'console.nMoneyReport',
    },
    {
      href: '/admin/renewals',
      label: 'staff.lRenewals',
      note: 'console.nRenewals',
    },
    {
      href: '/admin/payouts',
      label: 'staff.lPayouts',
      note: 'console.nPayouts',
    },
  ],
  publication: [
    {
      href: '/admin/courses',
      label: 'share.courses',
      note: 'console.nCourses',
    },
    {
      href: '/admin/teachers',
      label: 'tq.title',
      note: 'console.nTeachers',
    },
    {
      href: '/admin/reviews',
      label: 'staff.lAssign',
      note: 'console.nAssign',
    },
    {
      href: '/admin/subjects',
      label: 'staff.lSubjects',
      note: 'console.nSubjects',
    },
    {
      href: '/admin/reviewers',
      label: 'staff.lReviewers',
      note: 'console.nReviewers',
    },
    {
      href: '/admin/screenings',
      label: 'staff.lScreenings',
      note: 'console.nScreenings',
    },
    {
      href: '/admin/ijazah',
      label: 'staff.lIjazah',
      note: 'console.nIjazah',
    },
    {
      href: '/admin/translations',
      label: 'staff.lTranslations',
      note: 'console.nTranslations',
    },
  ],
  institution: [
    {
      href: '/admin/institutions',
      label: 'inst.title',
      note: 'console.nInstitutions',
    },
  ],
  sponsorship: [
    {
      href: '/admin/sponsorships',
      label: 'account.sponsorHeading',
      note: 'console.nSponsorships',
    },
  ],
  referral: [
    {
      href: '/admin/referrals',
      label: 'staff.lInvitations',
      note: 'console.nInvitations',
    },
  ],
  support: [
    {
      href: '/admin/support',
      label: 'staff.lSupport',
      note: 'console.nSupport',
    },
  ],
  shared: [
    {
      href: '/admin/users',
      label: 'staff.lUsers',
      note: 'console.nUsers',
    },
    {
      href: '/admin/settings',
      label: 'staff.lControls',
      note: 'console.nControls',
    },
    {
      href: '/admin/reports',
      label: 'staff.lReports',
      note: 'console.nReports',
    },
    {
      href: '/admin/media',
      label: 'staff.lMedia',
      note: 'console.nMedia',
    },
    {
      href: '/admin/course-reviews',
      label: 'staff.lCourseReviews',
      note: 'console.nCourseReviews',
    },
    {
      href: '/admin/discussion',
      label: 'staff.lDiscussion',
      note: 'console.nDiscussion',
    },
    {
      href: '/admin/boards',
      label: 'staff.lBoards',
      note: 'console.nBoards',
    },
    {
      href: '/admin/ai-support',
      label: 'staff.lAssistant',
      note: 'console.nAssistant',
    },
    {
      href: '/admin/connections',
      label: 'staff.lConnections',
      note: 'console.nConnections',
    },
    {
      href: '/admin/messages',
      label: 'staff.lMessages',
      note: 'console.nMessages',
    },
    {
      href: '/admin/plans',
      label: 'staff.lPlans',
      note: 'console.nPlans',
    },
    {
      href: '/admin/panels',
      label: 'staff.lPanels',
      note: 'console.nPanels',
    },
    {
      href: '/admin/takedowns',
      label: 'staff.lTakedowns',
      note: 'console.nTakedowns',
    },
    {
      href: '/admin/incidents',
      label: 'staff.lIncidents',
      note: 'console.nIncidents',
    },
    {
      href: '/admin/policies',
      label: 'staff.lPolicies',
      note: 'console.nPolicies',
    },
    {
      href: '/admin/certificates',
      label: 'nav.certificates',
      note: 'console.nCertificates',
    },
    {
      href: '/admin/analytics',
      label: 'staff.lAnalytics',
      note: 'console.nAnalytics',
    },
    {
      href: '/admin/guardians',
      label: 'staff.lGuardians',
      note: 'console.nGuardians',
    },
    {
      href: '/admin/appeals',
      label: 'staff.lAppeals',
      note: 'console.nAppeals',
    },
    {
      href: '/admin/roles',
      label: 'tq.roles',
      note: 'console.nRoles',
    },
  ],
} as const satisfies Record<string, readonly ConsoleLink[]>;
