import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import {
  consentSentence,
  consentStateLabel,
  consentTone,
  enforcementNote,
  expiryWarning,
  myGuardianConsents,
  permissionSentence,
  policyLine,
  relationshipLabel,
} from '@/lib/guardian-consent';
import { ConsentForm } from './consent-form';
import { ConsentActions } from './consent-actions';

export const dynamic = 'force-dynamic';

/**
 * Verifiable parental consent, from the parent's side.
 *
 * Before this page could say anything useful: a request was a row at
 * `pending_verification` and the parent had no way to tell whether it had been
 * read. Now a consent is four facts they can see — who asked, how it was
 * established, when it was verified and when it lapses — plus a sentence that
 * tells them what it means today.
 *
 * The page is deliberately usable with the flag off. A parent may ask, and staff
 * may decide, whether or not enforcement is on; the flag only decides whether a
 * lapse bites. Saying that plainly is better than hiding the form and letting
 * people think consent is a switch somebody forgot to flip.
 */
export default async function FamilyGuardiansPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/family/guardians');

  const mine = await myGuardianConsents(supabase);

  // Children this person could plausibly ask about: learner profiles in a family
  // they belong to. RLS narrows this to what they may see.
  const { data: memberships } = await supabase
    .from('family_memberships')
    .select('families ( id, name, learner_profiles ( id, display_name, learner_type ) )')
    .eq('user_id', user.id)
    .eq('status', 'active');

  type ChildRow = { id: string; display_name: string; learner_type: string };
  const children: ChildRow[] = ((memberships ?? []) as {
    families: { id: string; learner_profiles: ChildRow[] | null }[] | null;
  }[])
    .flatMap((m) => m.families ?? [])
    .flatMap((f) => f.learner_profiles ?? [])
    .filter((c) => c.learner_type === 'child');

  const stateFor = new Map(
    mine.consents.map((c) => [c.learnerProfileId, consentStateLabel(c)]),
  );

  const needsAction = mine.consents.filter(
    (c) => c.status !== 'active' && c.status !== 'pending_verification',
  );

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/family">Family</Link>
        <span aria-hidden>›</span>
        <span>Guardian consent</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Family</p>
        <h1>Guardian consent</h1>
        <p className="muted">
          Ask to be verified as a child&rsquo;s parent or guardian. A person reads
          every request — it is not instant, and it is not a formality. A
          verification lasts a stated number of months and then runs out, because
          a relationship can change within a year.
        </p>
      </div>

      {enforcementNote(mine.enforced) && (
        <div className="notice warn">{enforcementNote(mine.enforced)}</div>
      )}

      <div className="notice info">{policyLine(mine.policyInForce)}</div>

      {mine.consents.length === 0 ? (
        <p className="muted">You have no guardian consent on record yet.</p>
      ) : (
        <section className="card">
          <h2>Your consents</h2>
          <ul className="lessons">
            {mine.consents.map((c) => {
              const warning = expiryWarning(c);
              return (
                <li key={c.relationshipId}>
                  <span className="t">
                    {c.learnerName}
                    <span className="muted">
                      {' · '}
                      {relationshipLabel(c.relationshipType)}
                    </span>
                  </span>
                  <span className={`badge ${consentTone(c) === 'ok' ? 'ok' : 'neutral'}`}>
                    {consentStateLabel(c)}
                  </span>
                  <p className="muted">{consentSentence(c)}</p>
                  <p className="muted">{permissionSentence(c)}</p>
                  {warning && <p className="danger">{warning}</p>}
                  {c.policyChanged && (
                    <p className="muted">
                      The children&rsquo;s policy has changed since this consent was
                      given. Renewing it records the version in force now.
                    </p>
                  )}
                  {c.lastDecision?.reason && (
                    <p className="muted">
                      Reviewer said: &ldquo;{c.lastDecision.reason}&rdquo;
                    </p>
                  )}
                  {c.revokedReason && (
                    <p className="muted">Withdrawal reason: {c.revokedReason}</p>
                  )}
                  {(c.status === 'active' || c.status === 'pending_verification') && (
                    <ConsentActions relationshipId={c.relationshipId} />
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      )}

      <section className="card">
        <h2>{needsAction.length > 0 ? 'Ask again or renew' : 'Ask for consent'}</h2>
        {children.length === 0 ? (
          <p className="muted">
            There is no child profile in your family to ask about yet.{' '}
            <Link href="/family">Add a child first</Link>.
          </p>
        ) : (
          <ConsentForm
            options={children.map((c) => ({
              id: c.id,
              name: c.display_name,
              state: stateFor.get(c.id),
            }))}
          />
        )}
      </section>

      <p className="muted">
        Being verified does not give you the child&rsquo;s account. It gives you a
        view of their progress, it can be narrowed by the reviewer, and it can be
        withdrawn — by you, at any time, with a reason that is kept.
      </p>
    </div>
  );
}
