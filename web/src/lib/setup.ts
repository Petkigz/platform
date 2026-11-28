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

import type { MessageKey } from './i18n/messages/en.ts';

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
  /** The sentence that names it (a key of the message catalogue). */
  title: MessageKey;
  /** Why it is still outstanding, in one sentence. Said only while it is. */
  why: MessageKey;
  /** How many there are today. */
  count: number;
  /** The screen that does it. */
  href: string;
  done: boolean;
};

export function setupSteps(facts: SetupFacts): SetupStep[] {
  return [
    // Only when there are none. A deployment with subjects has nothing to do
    // here — they arrive with the seed migration, and a step that says "add a
    // subject" beside 37 of them would be noise on a working platform.
    ...(facts.subjects > 0
      ? []
      : [{
          key: 'subjects' as const,
          title: 'staff.stepSubjects' as const,
          why: 'staff.stepSubjectsWhy' as const,
          count: 0,
          href: '/admin/subjects',
          done: false,
        }]),
    {
      key: 'reviewers',
      title: 'staff.stepReviewers',
      why: 'staff.stepReviewersWhy',
      count: facts.reviewers,
      href: '/admin/reviewers',
      done: facts.reviewers > 0,
    },
    {
      key: 'courses',
      title: 'staff.stepCourses',
      why: 'staff.stepCoursesWhy',
      count: facts.courses,
      href: '/admin/courses',
      done: facts.courses > 0,
    },
    {
      key: 'published',
      title: 'staff.stepPublished',
      why: 'staff.stepPublishedWhy',
      count: facts.published,
      href: '/admin/courses',
      done: facts.published > 0,
    },
  ];
}

/** The steps that are not done, which is what the panel renders. */
export function outstandingSteps(facts: SetupFacts): SetupStep[] {
  return setupSteps(facts).filter((step) => !step.done);
}

/** A sentence of the catalogue and what fills its gaps. The page says it. */
export type Said = { key: MessageKey; vars?: Record<string, number> };

/**
 * The subject line beside the panel.
 *
 * A fact rather than a step when there are subjects: they arrive with the seed
 * migration, and the panel is for what is missing. When there are none, the
 * panel carries the step — see `setupSteps()`.
 *
 * The count follows a colon, so that no word has to agree with it in any of
 * the languages the page is written in.
 */
export function subjectsNote(facts: SetupFacts): Said {
  if (facts.subjects > 0) return { key: 'staff.subjectsSome', vars: { count: facts.subjects } };
  return { key: 'staff.subjectsNone' };
}

/**
 * What the admin home says when the queues are all empty.
 *
 * `null` means the page's own sentence — the count, and how many queues it
 * spans — is the right one, because there is work to describe. A sentence is
 * the replacement for the case the queue line cannot express: on a platform
 * that is not yet set up, "nothing is waiting" is accurate and reads as "the
 * work is done" when the work has not started.
 */
export function emptyQueueLede(facts: SetupFacts): Said | null {
  const outstanding = outstandingSteps(facts).length;
  return outstanding > 0 ? { key: 'staff.zeroSetup', vars: { count: outstanding } } : null;
}
