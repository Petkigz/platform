/**
 * The scholarly panel, as the screens read it.
 *
 * Two rules shape everything here, and both come from the owner: **the board
 * decides only when it is present and active**, and **appointing a member is the
 * owner's act**. So the votes a screen shows are only ever the counts — the
 * direction of somebody else's vote stays hidden until the reader has voted —
 * and the controls a governance admin sees stop at opening the case.
 *
 * `outcomeProblem()` mirrors the database's refusals rather than inventing a
 * majority rule: it checks the quorum, and it refuses a contradiction (approving
 * while more voted to reject). Which majority the owner wants — simple,
 * two-thirds, unanimity — is the owner's to state, and the screen shows the tally
 * beside the choice instead of deciding it for them.
 */

export type PanelTally = { approve: number; reject: number; abstain: number; cast: number };

export type PanelCase = {
  id: string;
  status: string;
  openedAt: string;
  closedAt: string | null;
  outcomeSummary: string | null;
  versionId: string;
  versionNumber: number;
  versionStatus: string;
  courseTitle: string;
  tally: PanelTally;
};

export type PanelMember = {
  id: string;
  reviewerProfileId: string;
  name: string;
  memberRole: string;
  status: string;
  joinedAt: string;
  leftAt: string | null;
};

export type Panel = {
  id: string;
  name: string;
  description: string | null;
  status: string;
  quorum: number;
  subject: string | null;
  activeMembers: number;
  members: PanelMember[];
  cases: PanelCase[];
};

export type PanelRegister = {
  panels: Panel[];
  awaiting: {
    versionId: string;
    versionNumber: number;
    versionStatus: string;
    courseTitle: string;
    hasOpenCase: boolean;
  }[];
  candidates: { reviewerProfileId: string; name: string; appointed: boolean }[];
  counts: { panels: number; convened: number; openCases: number };
  panelRequired: boolean;
};

export type MyPanelWork = {
  panelMember: boolean;
  panels: { id: string; name: string; status: string; quorum: number; memberRole: string }[];
  cases: {
    id: string;
    panelName: string;
    quorum: number;
    openedAt: string;
    versionNumber: number;
    courseTitle: string;
    cast: number;
    myVote: string | null;
    tally: PanelTally | null;
  }[];
  decided: {
    id: string;
    outcome: string;
    closedAt: string;
    outcomeSummary: string;
    courseTitle: string;
    myVote: string;
  }[];
};

const PANEL_STATUS: Record<string, string> = {
  active: 'Convened',
  inactive: 'Not convened',
  dissolved: 'Dissolved',
};

export function panelStatusLabel(status: string | null | undefined): string {
  return PANEL_STATUS[String(status ?? '')] ?? 'Not convened';
}

export function panelMemberRole(role: string | null | undefined): string {
  return String(role ?? '') === 'chair' ? 'Chair' : 'Member';
}

export function voteLabel(vote: string | null | undefined): string {
  switch (String(vote ?? '')) {
    case 'approve': return 'Approve';
    case 'reject': return 'Reject';
    case 'abstain': return 'Abstain';
    default: return 'Not voted';
  }
}

export function quorumMet(cast: number, quorum: number): boolean {
  return cast >= quorum;
}

/** "2 of 3 votes cast", and whether that is enough. */
export function quorumSentence(cast: number, quorum: number): string {
  const votes = `${cast} of ${quorum} ${quorum === 1 ? 'vote' : 'votes'} cast`;
  return quorumMet(cast, quorum) ? `Quorum met — ${votes}.` : `Waiting on quorum — ${votes}.`;
}

/**
 * Why a decision cannot be recorded, in the order the database checks it.
 *
 * Returns null when the outcome may be recorded. `p_outcome` is one of
 * `approved`, `rejected`, `withdrawn`.
 */
export function outcomeProblem(
  outcome: string,
  tally: PanelTally | null,
  quorum: number,
): string | null {
  const cast = Number(tally?.cast ?? 0);
  if (cast < quorum) {
    return `The panel has not reached its quorum: ${cast} of ${quorum} votes cast. `
      + 'A decision cannot be recorded until enough members have voted.';
  }
  const yes = Number(tally?.approve ?? 0);
  const no = Number(tally?.reject ?? 0);
  if (outcome === 'approved' && !(yes >= 1 && yes > no)) {
    return `The votes do not approve this: ${yes} approve, ${no} reject. `
      + 'Recording approval here would contradict the panel.';
  }
  if (outcome === 'rejected' && !(no >= 1 && no >= yes)) {
    return `The votes do not reject this: ${yes} approve, ${no} reject. `
      + 'Recording rejection here would contradict the panel.';
  }
  return null;
}

export function tallySentence(tally: PanelTally | null): string {
  if (!tally || tally.cast === 0) return 'No votes cast yet.';
  return `${tally.approve} approve · ${tally.reject} reject · ${tally.abstain} abstain`;
}

/** The version states a case may be opened against, in words. */
export function versionLabel(status: string | null | undefined): string {
  switch (String(status ?? '')) {
    case 'draft': return 'draft';
    case 'submitted': return 'submitted for review';
    case 'approved': return 'approved, not published';
    case 'published': return 'published';
    case 'retired': return 'retired';
    case 'rejected': return 'rejected';
    default: return String(status ?? 'unknown');
  }
}

/**
 * A refusal from the database, in a sentence somebody can act on.
 *
 * The quorum sentence is written here rather than read from the database's hint
 * because PostgREST returns the message and not the hint — so the wording has to
 * name the rule and leave the number to the screen, which already has it.
 */
export function describePanelError(message: string | null | undefined): string {
  const text = String(message ?? '').trim();
  if (text.includes('panel:not_allowed')) {
    return 'Only the platform owner convenes or seats a panel; governance staff may open a case.';
  }
  if (text.includes('panel:not_enough_members')) {
    return 'Not enough people are seated to convene this panel. Seat at least as many as the quorum.';
  }
  if (text.includes('panel:below_quorum')) {
    return 'Removing this member would leave the panel below its quorum, unable to decide anything. '
      + 'Close the panel first, or lower the quorum, and then remove them.';
  }
  if (text.includes('panel:quorum_not_met')) {
    return 'The panel has not reached its quorum. A decision cannot be recorded until enough members have voted.';
  }
  if (text.includes('panel:outcome_contradicts_votes')) {
    return 'That decision contradicts the votes recorded. The tally is on the case — read it before deciding.';
  }
  if (text.includes('panel:already_voted')) {
    return 'You have already voted on this case. One vote each, and a vote is not edited afterwards.';
  }
  if (text.includes('panel:already_decided')) return 'That case has already been decided.';
  if (text.includes('panel:not_convened')) {
    return 'This panel is not convened, and a board that is not sitting decides nothing.';
  }
  if (text.includes('panel:dissolved')) return 'This panel has been dissolved.';
  if (text.includes('panel:case_open')) {
    return 'This version already has a case waiting for the panel.';
  }
  if (text.includes('panel:already_published')) {
    return 'That version is already published. A panel decides before publication, not after it.';
  }
  if (text.includes('panel:appointment_required')) {
    return 'That person has not been appointed to the board. The owner appoints a board member on the roles screen first.';
  }
  if (text.includes('panel:reviewer_not_active')) {
    return 'That reviewer has not been checked yet, so there is no seat to give them.';
  }
  if (text.includes('panel:not_a_member')) {
    return 'Only a seated member of the panel hearing the case may vote on it.';
  }
  if (text.includes('panel:reason_required')) return 'Write the reason. It is kept with the record.';
  if (text.includes('panel:summary_required')) {
    return 'Write what the panel decided, in a sentence — a decision nobody can read is not a record.';
  }
  if (text.includes('panel:quorum_invalid')) {
    return 'A quorum is a whole number of people, at least one and at most twenty-five.';
  }
  if (text.includes('panel:name_required')) return 'Give the panel a name, at least three characters.';
  if (text.includes('panel:role_invalid')) return 'A seat is a chair or a member.';
  if (text.includes('panel:vote_invalid')) return 'A vote is approve, reject or abstain.';
  if (text.includes('panel:outcome_invalid')) return 'A decision is approved, rejected or withdrawn.';
  if (text.includes('panel:not_signed_in')) return 'Sign in first.';
  if (text.includes('panel:not_found')) return 'That panel or case does not exist.';
  if (text.includes('panel:version_not_found')) return 'That course version does not exist.';
  if (text.includes('panel:reviewer_not_found')) return 'That reviewer does not exist.';
  if (text.includes('panel:subject_not_found')) return 'That subject area does not exist.';
  if (text.includes('panel:status_invalid')) return 'That is not a panel status.';
  if (text.includes('panel:open_cases')) {
    return 'This panel still has cases open. Close them before dissolving it.';
  }
  return text || 'Something went wrong. Nothing was changed.';
}
