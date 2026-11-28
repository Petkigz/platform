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

export type ConsoleLink = { href: string; label: MessageKey; note: string };

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
 * `label` is a key of the catalogue. `note` is still an English sentence: the
 * forty-three of them are not in the catalogue yet, and the page marks each
 * as English for a reader who is shown the rest in another language.
 */
export const CONSOLE_LINKS = {
  money: [
    {
      href: '/admin/orders',
      label: 'staff.lOrders',
      note: 'the only orders whose total can still change: record a discount, tax, fee or rounding against one, or withdraw one',
    },
    {
      href: '/admin/refunds',
      label: 'staff.lRefunds',
      note: 'money going back out. Approving is an agreement, not a transfer',
    },
    {
      href: '/admin/financial-adjustments',
      label: 'staff.lAdjustments',
      note: 'append-only accounting corrections and earnings clawbacks',
    },
    {
      href: '/admin/reconciliation',
      label: 'staff.lReconciliation',
      note: 'signed statement rows against the internal ledger',
    },
    {
      href: '/admin/disputes',
      label: 'staff.lDisputes',
      note: 'a chargeback has a deadline; the provider decides what happens if it passes',
    },
    {
      href: '/admin/tax',
      label: 'staff.lTax',
      note: 'what a buyer is charged on top of the price, by the country they buy from',
    },
    {
      href: '/admin/exchange-rates',
      label: 'staff.lRates',
      note: 'what one currency was worth in another, when, and who said so',
    },
    {
      href: '/admin/revenue',
      label: 'staff.lRevenue',
      note: 'what sold in a period by currency, course, plan and teacher, with refunds beside the sale and never netted out of sight',
    },
    {
      href: '/admin/money-report',
      label: 'staff.lMoneyReport',
      note: 'what moved in a period, in the one currency the platform is read in, with the rate beside every figure',
    },
    {
      href: '/admin/renewals',
      label: 'staff.lRenewals',
      note: 'every live subscription expanded forward at the price it was sold at. Committed, not arrived — nothing charges a renewal yet',
    },
    {
      href: '/admin/payouts',
      label: 'staff.lPayouts',
      note: 'what teachers have asked to be paid, and the refund hold that keeps a sale from leaving before it can be reversed',
    },
  ],
  publication: [
    {
      href: '/admin/courses',
      label: 'share.courses',
      note: 'every course, which door it stands behind and how many learners it holds. Changing an audience is recorded against your name, with both sides of the change',
    },
    {
      href: '/admin/teachers',
      label: 'tq.title',
      note: 'the people asking to teach, and everyone who may teach here with what each has published and how many learners their courses hold. Approving an application is the appointment: it grants the role, with your reason against the applicant',
    },
    {
      href: '/admin/reviews',
      label: 'staff.lAssign',
      note: 'courses waiting for a reviewer',
    },
    {
      href: '/admin/subjects',
      label: 'staff.lSubjects',
      note: 'the vocabulary of the catalogue: what a learner can filter by, and what a badge on a course card may say. A subject in use by a live course cannot be retired',
    },
    {
      href: '/admin/reviewers',
      label: 'staff.lReviewers',
      note: 'who applied to review, who has been checked, and what each may judge. Nothing publishes until somebody here is verified',
    },
    {
      href: '/admin/screenings',
      label: 'staff.lScreenings',
      note: 'every appointed teacher and whether a check is on file: what kind, when, when it lapses, who recorded it. The reference to the document is stored and never shown again, and a record cannot be edited — a new check supersedes it. While `platform.safeguarding` is on, a course a child may be shown cannot be published unless its author holds a passed, unexpired check and has acknowledged the conduct policy',
    },
    {
      href: '/admin/ijazah',
      label: 'staff.lIjazah',
      note: 'who authorised whom, for what, and what you were shown. Yours alone to record: a chain of transmission is not something this platform has the standing to check, so the register says “recorded”, never “verified”, and nothing here is visible to a learner',
    },
    {
      href: '/admin/translations',
      label: 'staff.lTranslations',
      note: 'corrections sent by people who speak the language, each shown against the line it replaces and against the catalogue that is actually built. Yours alone to decide: accepting a line does not change the site — the paste block does that — and a language is only described as read when every part of it has a published read — or when one person has published a whole-catalogue read — with every correction decided',
    },
  ],
  institution: [
    {
      href: '/admin/institutions',
      label: 'inst.title',
      note: 'madrasahs, schools and organisations with their own page: open one, check the DNS record behind a domain claim, and change who administers it. An institution sees counts of its own members and never a learner’s name, and it cannot buy seats — invoicing needs terms and a provider nobody has',
    },
  ],
  sponsorship: [
    {
      href: '/admin/sponsorships',
      label: 'account.sponsorHeading',
      note: 'learners asking for a course, and donors paying for one. Deciding needs a written reason and recording a payment needs a reference; a sponsored seat is not an order, so it carries no tax and no teacher earning',
    },
  ],
  referral: [
    {
      href: '/admin/referrals',
      label: 'staff.lInvitations',
      note: 'who invited whom, what it earned and what the yearly cap or a refund stopped. Both rewards are discounts on a course — nothing is paid out, so there is no balance here',
    },
  ],
  support: [
    {
      href: '/admin/support',
      label: 'staff.lSupport',
      note: 'requests people opened from Help. Turning the feature off stops new ones; it does not close what is in flight',
    },
  ],
  shared: [
    {
      href: '/admin/users',
      label: 'staff.lUsers',
      note: 'every account on the platform, searchable by name or email — accounts, not children',
    },
    {
      href: '/admin/settings',
      label: 'staff.lControls',
      note: 'the numbers behind features that are already on. Only the ones your role owns are shown, and each change needs a reason',
    },
    {
      href: '/admin/reports',
      label: 'staff.lReports',
      note: 'problems readers flagged in a lesson or an answer. Closing one needs a written note',
    },
    {
      href: '/admin/media',
      label: 'staff.lMedia',
      note: 'every master anybody has uploaded. Quarantine and withdrawal both need a written reason',
    },
    {
      href: '/admin/course-reviews',
      label: 'staff.lCourseReviews',
      note: 'learner ratings that include words, held until someone reads them',
    },
    {
      href: '/admin/discussion',
      label: 'staff.lDiscussion',
      note: 'learner questions and peer answers held for review',
    },
    {
      href: '/admin/boards',
      label: 'staff.lBoards',
      note: 'posts on the students’ and the teachers’ boards that somebody reported. A post there is shown at once, so this is where one is taken down. Seeing who is behind a username needs a reason and is recorded',
    },
    {
      href: '/admin/ai-support',
      label: 'staff.lAssistant',
      note: 'what it was asked and what the boundary did: answers that cited a lesson, questions sent to a teacher, and the phrases doing the refusing',
    },
    {
      href: '/admin/connections',
      label: 'staff.lConnections',
      note: 'the outside accounts this site uses (database, email, scheduler, storage, payments) and which are still to be connected. The owner only; names of missing settings, never a value',
    },
    {
      href: '/admin/messages',
      label: 'staff.lMessages',
      note: 'what the platform would send, rendered and recorded. Nothing leaves the building until a provider is configured',
    },
    {
      href: '/admin/plans',
      label: 'staff.lPlans',
      note: 'versioned terms, entitlements and recurring prices',
    },
    {
      href: '/admin/panels',
      label: 'staff.lPanels',
      note: 'the owner convenes a panel and sets its quorum; staff open a case against an unpublished version; seated members vote and the chair records the decision. A case cannot close below quorum, and with governance.panel_required off nothing waits on it',
    },
    {
      href: '/admin/takedowns',
      label: 'staff.lTakedowns',
      note: 'a notice holds the version it names out of distribution the moment it is entered — nothing is deleted, so the decision still has its evidence. The teacher answers on their own page, somebody other than the person who took the notice decides it, and a hold changes no money',
    },
    {
      href: '/admin/incidents',
      label: 'staff.lIncidents',
      note: 'what happened, who has to be told and by when, and the timeline as it happens. Counts, never a list of names; every deadline is typed by a person because the rule differs by market. Nothing here detects a breach and nothing sends a notification',
    },
    {
      href: '/admin/policies',
      label: 'staff.lPolicies',
      note: 'every document with the versions that have been in force and the draft waiting now. Publishing needs a date and a written reason, and is refused while a question only you can answer is still marked in the text',
    },
    {
      href: '/admin/certificates',
      label: 'nav.certificates',
      note: 'issue completion certificates and record revocations with a reason',
    },
    {
      href: '/admin/analytics',
      label: 'staff.lAnalytics',
      note: 'what people do, kept forever, by event and by day. Aggregates only',
    },
    {
      href: '/admin/guardians',
      label: 'staff.lGuardians',
      note: 'adults asking to be recognised as a child’s parent',
    },
    {
      href: '/admin/appeals',
      label: 'staff.lAppeals',
      note: 'teachers contesting a rejection. You cannot decide an appeal against your own decision',
    },
    {
      href: '/admin/roles',
      label: 'tq.roles',
      note: 'who may do what. Every check in the database reads these',
    },
  ],
} as const satisfies Record<string, readonly ConsoleLink[]>;
