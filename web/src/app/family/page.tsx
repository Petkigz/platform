import Link from 'next/link';
import { ClaimLearner } from '@/components/claim-learner';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { isFlagEnabled } from '@/lib/flags';
import {
  AGE_BAND_LABEL,
  fetchChildCourses,
  fetchFamilies,
  fetchFamilyMembers,
  type Family,
} from '@/lib/family';
import { fetchEngagement } from '@/lib/engagement';
import { EngagementStrip } from '@/components/engagement-strip';
import { AddChild } from './add-child';
import { CreateFamily } from './create-family';

export const dynamic = 'force-dynamic';

const MEMBER_LABEL: Record<string, string> = {
  owner: 'Owner',
  guardian: 'Guardian',
  billing_manager: 'Billing',
};

/**
 * The family dashboard.
 *
 * A child here is a `learner_profile`, not a `user` (D2): no login, no email,
 * no password. That is why this page can show a child's progress without the
 * child ever having an account, and why adding one asks for a name and an age
 * band and nothing else.
 *
 * Nothing below filters by the signed-in user. RLS decides what comes back —
 * including the case that used to be a defect: a billing-only family member
 * sees the family and none of its children.
 */
export default async function FamilyPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/sign-in?next=/family');

  const [families, audienceSections] = await Promise.all([
    fetchFamilies(supabase),
    isFlagEnabled(supabase, 'learning.audience_sections').catch(() => false),
  ]);

  if (families.length === 0) {
    return (
      <div className="container section">
        <p className="eyebrow">My family</p>
        <h1>No family yet</h1>
        <p className="lede">
          A family lets one adult account hold several children. Each child
          learns under your account — they do not need an email address or a
          password.
        </p>
        <CreateFamily />
        <p className="muted" style={{ marginTop: '1rem' }}>
          A family is for children. To learn yourself, you do not need one — use your own
          account.
        </p>
        <ClaimLearner label="Learn on this account" />
        <p style={{ marginTop: '1.5rem' }}>
          <Link href="/learn">Back to my learning</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="container section">
      <p className="eyebrow">My family</p>
      <h1>Children and progress</h1>
      {!audienceSections && (
        <p className="lede">
          The separate young-learner and adult experiences are not enabled yet,
          so children and adults currently see the same catalogue.
        </p>
      )}

      {families.map((f: Family) => (
        <FamilyBlock key={f.id} family={f} supabase={supabase} />
      ))}

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/learn">Back to my learning</Link>
      </p>
    </div>
  );
}

/**
 * Split out so each family's members and children load together rather than
 * in one wide query. It also keeps the per-family heading and its own
 * "add a child" form next to each other.
 */
async function FamilyBlock({
  family,
  supabase,
}: {
  family: Family;
  // The request-scoped client. Passing it down rather than re-creating keeps
  // every query on the same session.
  supabase: Awaited<ReturnType<typeof createClient>>;
}) {
  // A streak is derived from progress that already exists, so a failure to read it is
  // silence rather than an error: the child's card is still worth showing without it.
  // The flag is checked once, not once per child.
  const streaksOn = await isFlagEnabled(supabase, 'learning.streaks').catch(() => false);

  const [members, childCourses] = await Promise.all([
    fetchFamilyMembers(supabase, family.id).catch(() => []),
    Promise.all(
      family.children.map(async (c) => ({
        child: c,
        courses: await fetchChildCourses(supabase, c.id).catch(() => []),
        engagement: streaksOn
          ? await fetchEngagement(supabase, c.id).catch(() => null)
          : null,
      })),
    ),
  ]);

  const active = members.filter((m) => m.status === 'active');

  return (
    <div style={{ marginTop: '1.75rem' }}>
      <div className="outline-h">
        <h3>{family.name ?? 'My family'}</h3>
        <span className="muted" style={{ fontSize: '0.85rem' }}>
          {active.length} adult{active.length === 1 ? '' : 's'} ·{' '}
          {family.children.length} child{family.children.length === 1 ? '' : 'ren'}
        </span>
      </div>

      {family.children.length === 0 ? (
        <div className="card">
          <p className="empty">No children yet.</p>
          <AddChild familyId={family.id} />
        </div>
      ) : (
        <div className="grid cols-2">
          {childCourses.map(({ child, courses, engagement }) => (
            <div className="card" key={child.id}>
              <h3 style={{ marginTop: 0 }}>{child.displayName}</h3>
              <div className="badges">
                {child.ageBand && (
                  <span className="badge">{AGE_BAND_LABEL[child.ageBand] ?? child.ageBand}</span>
                )}
                {child.status !== 'active' && (
                  <span className="badge neutral">{child.status}</span>
                )}
              </div>

              {engagement && (
                <div style={{ marginTop: '0.6rem', marginBottom: '0.6rem' }}>
                  <EngagementStrip engagement={engagement} subject={child.displayName} />
                </div>
              )}

              {courses.length === 0 ? (
                <p className="empty" style={{ marginBottom: 0 }}>
                  Not enrolled in anything yet.
                </p>
              ) : (
                courses.map((c) => (
                  <div className="course" key={c.enrolmentId}>
                    <div className="title">{c.courseTitle}</div>
                    <div
                      className="progress"
                      style={{ marginTop: '0.5rem' }}
                      role="progressbar"
                      aria-valuenow={Math.round(c.percentComplete)}
                      aria-valuemin={0}
                      aria-valuemax={100}
                      aria-label={`${child.displayName}: ${c.courseTitle} progress`}
                    >
                      <span
                        style={{
                          width: `${Math.min(100, Math.max(0, c.percentComplete))}%`,
                        }}
                      />
                    </div>
                    <div className="muted" style={{ marginTop: '0.4rem' }}>
                      {c.lessonsDone} of {c.lessonsTotal} lessons ·{' '}
                      {Math.round(c.percentComplete)}%
                    </div>
                  </div>
                ))
              )}

              <p style={{ marginTop: '0.75rem', marginBottom: 0 }}>
                <Link href={`/family/${child.id}`}>
                  Open {child.displayName}&rsquo;s learning
                </Link>
              </p>
            </div>
          ))}
        </div>
      )}

      <div style={{ marginTop: '0.75rem' }}>
        <AddChild familyId={family.id} />
      </div>

      {members.length > 0 && (
        <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.75rem' }}>
          Adults:{' '}
          {members
            .map((m) => `${m.displayName ?? 'Unnamed'} (${MEMBER_LABEL[m.membershipType] ?? m.membershipType}${m.status === 'active' ? '' : `, ${m.status}`})`)
            .join(', ')}
        </p>
      )}
    </div>
  );
}
