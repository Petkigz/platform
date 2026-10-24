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
 * The sentence a non-owner reads where the switchboard would be.
 *
 * It does not say "you do not have permission", which reads as a fault the
 * reader should report. It says whose the switches are, because that is the
 * useful fact: the person who can turn a feature on is one specific person, and
 * asking them is the action.
 */
export function switchboardNotice(facts: StaffFacts): string {
  if (facts.platformAdmin) return '';
  const owns: string[] = [];
  if (facts.financeAdmin) owns.push('money');
  if (facts.governanceAdmin) owns.push('publication');
  if (facts.supportAgent) owns.push('support');
  const work = owns.length === 0 ? 'staff work' : owns.join(' and ');
  return 'The feature switches and the revenue share belong to the platform admin. '
    + `Your work here is ${work}: the queues above and the links below are yours, `
    + 'and nothing on this page is waiting for a decision you cannot make.';
}
