import Link from 'next/link';

import { subjectsNote, type SetupFacts, type SetupStep } from '@/lib/setup';

/**
 * "What is missing", above the queues.
 *
 * Rendered only when something is outstanding and only for the platform admin —
 * the person who can actually do the work. It is not a tutorial: each row is one
 * fact about today and one link to the screen that changes it, and the whole
 * panel disappears when the list is empty, because the admin home is a queue
 * page and a queue page must be able to say it has nothing to do.
 */
export function SetupPanel({
  facts,
  steps,
}: {
  facts: SetupFacts;
  steps: SetupStep[];
}) {
  if (steps.length === 0) return null;

  return (
    <section className="card setup-panel" aria-labelledby="setup-heading">
      <h2 id="setup-heading" style={{ marginTop: 0, fontSize: '1.15rem' }}>
        Before anyone can study here
      </h2>
      <p className="muted" style={{ marginTop: '-0.35rem' }}>
        {subjectsNote(facts)}
      </p>

      <ol className="setup-steps">
        {steps.map((step, i) => (
          <li key={step.key}>
            <span className="setup-n" aria-hidden="true">{i + 1}</span>
            <span className="setup-body">
              <Link href={step.href}>{step.title}</Link>
              <span className="muted">{step.detail}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
