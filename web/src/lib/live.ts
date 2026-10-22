import type { SupabaseClient } from '@supabase/supabase-js';

export type LiveSession = {
  session_id: string;
  course_id: string;
  course_title: string;
  title: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  scheduled_zone: string;
  status: 'scheduled' | 'live' | 'ended' | 'cancelled';
  cancelled_reason: string | null;
  joinable: boolean;
  reason: string | null;
  learner_profile_id: string;
  attended: boolean;
};

/** Why a door is shut, in words a learner can act on. */
export const REASON_LABEL: Record<string, string> = {
  not_open_yet: 'The room opens shortly before the class starts.',
  closed: 'This class has finished.',
  ended: 'This class has finished.',
  cancelled: 'This class was cancelled.',
  not_enrolled: 'You are not enrolled in this course.',
  no_room_host: 'Live rooms are not connected yet, so the room cannot open.',
  unknown_session: 'This class no longer exists.',
};

export function describeReason(reason: string | null | undefined): string | null {
  if (!reason) return null;
  return REASON_LABEL[reason] ?? 'This room is not open.';
}

/**
 * The time as the teacher set it, and the reader's own time beside it.
 *
 * A class scheduled in Kampala at 19:00 is 19:00 EAT. A learner in London needs
 * both numbers, because the one that matters to them is the second, but the one
 * the teacher will refer to in the class is the first.
 */
export function describeWhen(
  startsAt: string,
  zone: string,
  readerZone?: string,
): string {
  const date = new Date(startsAt);
  const inZone = (tz: string) => {
    try {
      return new Intl.DateTimeFormat('en-GB', {
        timeZone: tz,
        weekday: 'short',
        day: 'numeric',
        month: 'short',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }).format(date);
    } catch {
      return null;
    }
  };

  const scheduled = inZone(zone) ?? date.toISOString().slice(0, 16).replace('T', ' ');
  const local = readerZone && readerZone !== zone ? inZone(readerZone) : null;
  return local ? `${scheduled} (${zone}) · ${local} your time` : `${scheduled} (${zone})`;
}

export function describeLength(startsAt: string, endsAt: string): string {
  const minutes = Math.max(
    0,
    Math.round((new Date(endsAt).getTime() - new Date(startsAt).getTime()) / 60000),
  );
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest === 0 ? `${hours} hour${hours === 1 ? '' : 's'}` : `${hours}h ${rest}m`;
}

export type JoinResult =
  | { joined: true; roomUrl: string; roomSlug: string; startsAt: string; endsAt: string }
  | { joined: false; reason: string; message?: string };

/** Ask to enter. The database checks the entitlement, the clock and the host. */
export async function joinLiveSession(
  supabase: SupabaseClient,
  sessionId: string,
  learnerProfileId: string,
): Promise<JoinResult> {
  const { data, error } = await supabase.rpc('join_live_session', {
    p_session_id: sessionId,
    p_learner_profile_id: learnerProfileId,
  });
  if (error) return { joined: false, reason: 'refused', message: error.message };

  const row = data as {
    joined?: unknown;
    reason?: unknown;
    message?: unknown;
    roomUrl?: unknown;
    roomSlug?: unknown;
    startsAt?: unknown;
    endsAt?: unknown;
  } | null;

  if (row?.joined === true && typeof row.roomUrl === 'string' && row.roomUrl !== '') {
    return {
      joined: true,
      roomUrl: row.roomUrl,
      roomSlug: typeof row.roomSlug === 'string' ? row.roomSlug : '',
      startsAt: typeof row.startsAt === 'string' ? row.startsAt : '',
      endsAt: typeof row.endsAt === 'string' ? row.endsAt : '',
    };
  }

  return {
    joined: false,
    reason: typeof row?.reason === 'string' ? row.reason : 'refused',
    message: typeof row?.message === 'string' ? row.message : undefined,
  };
}
