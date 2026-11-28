import Link from 'next/link';

/**
 * "What is missing", above the queues.
 *
 * Rendered only when something is outstanding and only for the platform admin —
 * the person who can actually do the work. It is not a tutorial: each row is one
 * fact about today and one link to the screen that changes it, and the whole
 * panel disappears when the list is empty, because the admin home is a queue
 * page and a queue page must be able to say it has nothing to do.
 *
 * It is handed its sentences by the page, already in the reader's language
 * (2026-11-28); which steps are outstanding is decided in `lib/setup.ts`.
 */
export function SetupPanel({
  heading,
  note,
  steps,
}: {
  heading: string;
  note: string;
  steps: { key: string; href: string; title: string; why: string; number: string }[];
}) {
  if (steps.length === 0) return null;

  return (
    <section className="card setup-panel" aria-labelledby="setup-heading">
      <h2 id="setup-heading" style={{ marginTop: 0, fontSize: '1.15rem' }}>
        {heading}
      </h2>
      <p className="muted" style={{ marginTop: '-0.35rem' }}>
        {note}
      </p>

      <ol className="setup-steps">
        {steps.map((step) => (
          <li key={step.key} data-setup-step={step.key}>
            <span className="setup-n" aria-hidden="true">{step.number}</span>
            <span className="setup-body">
              <Link href={step.href}>{step.title}</Link>
              <span className="muted">{step.why}</span>
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
