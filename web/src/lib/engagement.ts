import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * Streaks and badges, as the database computes them.
 *
 * Nothing here recalculates anything: `learner_engagement()` decides the streak (in the
 * learner's own time zone) and which badges have been earned. This module only makes the
 * reply safe to render and turns a number into a sentence.
 */

export type Badge = {
  code: string;
  name: string;
  description: string;
  earnedOn: string | null;
};

export type Engagement = {
  learnerProfileId: string;
  timezone: string;
  streakDays: number;
  longestStreakDays: number;
  lastActiveOn: string | null;
  lessonsCompleted: number;
  coursesCompleted: number;
  certificates: number;
  badges: Badge[];
};

function wholeNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0
    ? Math.trunc(value)
    : null;
}

function text(value: unknown): string | null {
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
}

/**
 * Read the function's reply defensively.
 *
 * A malformed reply returns null rather than a half-filled strip: a streak of `NaN` on a
 * child's dashboard is worse than no streak, because they cannot tell it is a bug.
 */
export function parseEngagement(data: unknown): Engagement | null {
  if (!data || typeof data !== 'object') return null;
  const record = data as Record<string, unknown>;

  const learnerProfileId = text(record.learnerProfileId);
  const streakDays = wholeNumber(record.streakDays);
  const longestStreakDays = wholeNumber(record.longestStreakDays);
  const lessonsCompleted = wholeNumber(record.lessonsCompleted);

  if (!learnerProfileId || streakDays === null || longestStreakDays === null || lessonsCompleted === null) {
    return null;
  }

  const rawBadges = Array.isArray(record.badges) ? record.badges : [];
  const badges: Badge[] = [];
  for (const entry of rawBadges) {
    if (!entry || typeof entry !== 'object') continue;
    const badge = entry as Record<string, unknown>;
    const code = text(badge.code);
    const name = text(badge.name);
    if (!code || !name) continue;
    badges.push({
      code,
      name,
      description: text(badge.description) ?? '',
      earnedOn: text(badge.earnedOn),
    });
  }

  return {
    learnerProfileId,
    timezone: text(record.timezone) ?? 'UTC',
    streakDays,
    longestStreakDays,
    lastActiveOn: text(record.lastActiveOn),
    lessonsCompleted,
    coursesCompleted: wholeNumber(record.coursesCompleted) ?? 0,
    certificates: wholeNumber(record.certificates) ?? 0,
    badges,
  };
}

/**
 * Ask for one learner's engagement.
 *
 * A refusal is not an error for the page: the feature may be switched off, or the learner
 * may not be the caller's. Both mean "show nothing", which is why this returns null rather
 * than throwing — a dashboard should not break because a flag is off.
 */
export async function fetchEngagement(
  supabase: SupabaseClient,
  learnerProfileId: string,
): Promise<Engagement | null> {
  if (!learnerProfileId) return null;
  const { data, error } = await supabase.rpc('learner_engagement', {
    p_learner_id: learnerProfileId,
  });
  if (error) return null;
  return parseEngagement(data);
}

/** "3 days in a row", said the way a person would say it. */
export function describeStreak(days: number): string {
  if (!Number.isFinite(days) || days <= 0) return 'No streak yet';
  if (days === 1) return '1 day in a row';
  return `${Math.trunc(days)} days in a row`;
}
