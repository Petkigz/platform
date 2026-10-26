/**
 * What a brand-new platform still needs before anybody can use it.
 *
 * The admin home is a queue screen: `staff_attention()` counts work waiting
 * inside features that already exist. On a fresh deployment every queue reads
 * zero, so the page says **"Nothing is waiting. Every queue you can work was
 * checked, and every one reads zero."** That is true and it is useless — nothing
 * is waiting because nothing exists yet, and the person reading it is the one
 * person who could create the first thing.
 *
 * This module answers the question that page does not: *what is missing?* Four
 * facts about existence, and a step for each that is not yet true.
 *
 * **Only steps that can be done from a screen appear**, because the rule here is
 * that a routine change is a field or a button on somebody's screen. Subjects
 * are a step now that `/admin/subjects` exists — before that screen they were a
 * note, because the only instruction would have been "run SQL". They are listed
 * first: a course cannot be filed under a subject that does not exist.
 *
 * **The panel disappears when the list is empty.** A checklist that stays ticked
 * on a working platform is furniture; the admin home is a queue page, and a
 * queue page must be able to say it has nothing to do.
 */

export type SetupFacts = {
  /** Active subject areas — the shelves a course can be filed under. */
  subjects: number;
  /** Courses that exist at all, in any state. */
  courses: number;
  /** Versions that have reached `published`. */
  published: number;
  /** Reviewers who are active — a reviewer without verification cannot be. */
  reviewers: number;
};

export type SetupStep = {
  key: 'subjects' | 'reviewers' | 'courses' | 'published';
  title: string;
  /** What is true today, in one sentence. */
  detail: string;
  /** The screen that does it. */
  href: string;
  done: boolean;
};

/**
 * The steps, in the order they have to happen.
 *
 * The order is not cosmetic: a course cannot publish without a reviewer, so a
 * list that started with "publish something" would send the owner to a screen
 * that refuses. Each step's sentence says what it unlocks, not what it is.
 */
export function setupSteps(facts: SetupFacts): SetupStep[] {
  return [
    // Only when there are none. A deployment with subjects has nothing to do
    // here — they arrive with the seed migration, and a step that says "add a
    // subject" beside 37 of them would be noise on a working platform.
    ...(facts.subjects > 0
      ? []
      : [{
          key: 'subjects' as const,
          title: 'A subject to file courses under',
          detail:
            'The seed migration creates the usual ones. This deployment has none, so no course can be tagged yet.',
          href: '/admin/subjects',
          done: false,
        }]),
    {
      key: 'reviewers',
      title: 'A reviewer who is verified',
      detail:
        facts.reviewers > 0
          ? `${facts.reviewers} ${facts.reviewers === 1 ? 'reviewer is' : 'reviewers are'} active.`
          : 'Nothing can be published until at least one reviewer has been recorded and verified for the subject it will judge.',
      href: '/admin/reviewers',
      done: facts.reviewers > 0,
    },
    {
      key: 'courses',
      title: 'A course to review',
      detail:
        facts.courses > 0
          ? `${facts.courses} ${facts.courses === 1 ? 'course exists' : 'courses exist'}, in draft, review or retirement.`
          : 'A course is written by an appointed teacher, not by the platform. This is where you see what they have sent.',
      href: '/admin/courses',
      done: facts.courses > 0,
    },
    {
      key: 'published',
      title: 'Something a visitor can find',
      detail:
        facts.published > 0
          ? `${facts.published} ${facts.published === 1 ? 'version is' : 'versions are'} published and on the shelf.`
          : 'The catalogue is empty until a version is published. Until then the front door shows the shape of the product and nothing to study.',
      href: '/admin/courses',
      done: facts.published > 0,
    },
  ];
}

/** The steps that are not done, which is what the panel renders. */
export function outstandingSteps(facts: SetupFacts): SetupStep[] {
  return setupSteps(facts).filter((step) => !step.done);
}

/**
 * The subject line beside the panel.
 *
 * A fact rather than a step when there are subjects: they arrive with the seed
 * migration, and the panel is for what is missing. When there are none, the
 * panel carries the step — see `setupSteps()`.
 */
export function subjectsNote(facts: SetupFacts): string {
  if (facts.subjects > 0) {
    return `Courses are filed under ${facts.subjects} subject ${facts.subjects === 1 ? 'area' : 'areas'}.`;
  }
  return 'No subject areas exist yet, so nothing can be tagged.';
}

/**
 * What the admin home says when the queues are all empty.
 *
 * `null` means the page's own sentence — the count, and how many queues it
 * spans — is the right one, because there is work to describe. A string is the
 * replacement for the case the queue line cannot express: on a platform that is
 * not yet set up, "nothing is waiting" is accurate and reads as "the work is
 * done" when the work has not started.
 */
export function emptyQueueLede(facts: SetupFacts): string | null {
  const outstanding = outstandingSteps(facts).length;

  if (outstanding > 0) {
    return 'Nothing is waiting, because nothing is here yet — the platform still needs '
      + `${outstanding === 1 ? 'one thing' : `${outstanding} things`} before anybody can study.`;
  }
  return null;
}
