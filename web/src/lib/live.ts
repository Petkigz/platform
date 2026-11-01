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

/**
 * Who cancelling a class would tell.
 *
 * `learners` and `people` are deliberately different numbers. A parent with two
 * children in the same class is two learners and one person to message, and the
 * second number is the one that decides whether cancelling is a note or a phone
 * call. Neither number includes the person reading it, because they are about to
 * take the action rather than be told about it.
 */
export type LiveAudience = {
  title: string;
  status: string;
  learners: number;
  people: number;
  cap: number;
  willTell: number;
  capped: boolean;
  cancellable: boolean;
};

export type CancelReceipt = {
  notified: number;
  people: number;
  capped: boolean;
  reason: string;
};

/**
 * The sentence above the button, before it is pressed.
 *
 * A bare "Cancel class" is a button that gets pressed by accident on a class of
 * thirty. Saying how many people it reaches turns it into a decision — and it is
 * the number the receipt afterwards is checked against.
 */
export function describeAudience(a: LiveAudience): string {
  if (!a.cancellable) return 'This class has already finished, so it cannot be cancelled.';
  if (a.people === 0) {
    return 'Nobody else is affected, so no one will be messaged. The class will still be marked cancelled.';
  }
  if (a.capped) {
    const rest = a.people - a.willTell;
    return `${a.people} people are coming, and ${a.willTell} will be messaged now — that is the most one cancellation sends. The other ${rest} will find the class gone, but will not be messaged.`;
  }
  if (a.people === 1) return 'One person will be messaged that this class is cancelled.';
  return `${a.people} people will be messaged that this class is cancelled.`;
}

/** What actually happened, said honestly, including when it was truncated. */
export function describeCancellation(r: Pick<CancelReceipt, 'notified' | 'people' | 'capped'>): string {
  if (r.people === 0) return 'Cancelled. Nobody needed telling.';
  if (r.capped) {
    return `Cancelled. Told ${r.notified} of ${r.people} people; the rest will find the class gone but were not messaged.`;
  }
  if (r.notified === r.people) {
    return `Cancelled. Told ${r.notified === 1 ? 'the one person' : `all ${r.people} people`}.`;
  }
  return `Cancelled. Told ${r.notified} of ${r.people} people.`;
}

/** Who is coming. The database decides whether the reader may know. */
export async function liveSessionAudience(
  supabase: SupabaseClient,
  sessionId: string,
): Promise<{ ok: true; audience: LiveAudience } | { ok: false; message: string }> {
  const { data, error } = await supabase.rpc('live_session_audience', {
    p_session_id: sessionId,
  });
  if (error) return { ok: false, message: error.message };

  const row = data as Partial<LiveAudience> | null;
  if (!row || typeof row.people !== 'number') {
    return { ok: false, message: 'the class could not be read just now' };
  }

  return {
    ok: true,
    audience: {
      title: typeof row.title === 'string' ? row.title : '',
      status: typeof row.status === 'string' ? row.status : '',
      learners: typeof row.learners === 'number' ? row.learners : 0,
      people: row.people,
      cap: typeof row.cap === 'number' ? row.cap : 200,
      willTell: typeof row.willTell === 'number' ? row.willTell : row.people,
      capped: row.capped === true,
      cancellable: row.cancellable !== false,
    },
  };
}

/**
 * Cancel, which is the act of telling people.
 *
 * The reason is mandatory and reaches learners, so it is trimmed here and
 * refused before it reaches the network: an empty reason is a message that says
 * a class is cancelled and nothing else.
 */
export async function cancelLiveSession(
  supabase: SupabaseClient,
  sessionId: string,
  reason: string,
): Promise<{ ok: true; receipt: CancelReceipt } | { ok: false; message: string }> {
  const trimmed = reason.trim();
  if (trimmed === '') return { ok: false, message: 'say why the class is cancelled' };

  const { data, error } = await supabase.rpc('cancel_live_session', {
    p_session_id: sessionId,
    p_reason: trimmed,
  });
  if (error) return { ok: false, message: error.message };

  const row = data as { people?: unknown; notified?: unknown; capped?: unknown } | null;
  if (!row || typeof row.notified !== 'number' || typeof row.people !== 'number') {
    return { ok: false, message: 'the class was cancelled, but the receipt could not be read' };
  }

  return {
    ok: true,
    receipt: {
      notified: row.notified,
      people: row.people,
      capped: row.capped === true,
      reason: trimmed,
    },
  };
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

/**
 * The recording of a class that already happened.
 *
 * Only the teacher is ever captured, so the file holds no learner. The address
 * of it is never in the page: the database keeps it and hands it out one
 * redirect at a time to somebody the permission admits, which is why the button
 * below points at `/api/live/<id>/recording` and not at a video host.
 */
export type RecordingReceipt = {
  announced: boolean;
  notified: number;
  people: number;
  capped: boolean;
  replaced: boolean;
};

/**
 * The one rule a link has to pass before it is worth sending.
 *
 * The database refuses anything that is not `https` — a `javascript:` address
 * here would be a link the platform hands a learner and a browser executes. This
 * checks the same thing in the browser so the person gets the sentence without a
 * round trip; it is not the enforcement, and it does not pretend to be.
 */
export function recordingLinkProblem(url: string): string | null {
  const trimmed = url.trim();
  if (trimmed === '') return 'Paste the address of the recording.';
  if (!/^https:\/\/[^\s]+$/.test(trimmed)) {
    return 'A recording link has to start with https:// and contain no spaces.';
  }
  if (trimmed.length > 2048) return 'That link is too long to be a recording address.';
  return null;
}

/** What happened, said honestly, including when nobody was told. */
export function describeRecordingAttach(r: RecordingReceipt): string {
  const what = r.replaced ? 'Replaced the recording.' : 'Recording attached.';
  if (!r.announced) {
    return `${what} Nobody was messaged — the class will find it on the class page.`;
  }
  if (r.people === 0) return `${what} There was nobody to tell.`;
  if (r.capped) {
    return `${what} Told ${r.notified} of ${r.people} people; the rest were not messaged.`;
  }
  return `${what} Told ${r.notified === 1 ? 'the one person' : `all ${r.people} people`}.`;
}

export async function attachLiveRecording(
  supabase: SupabaseClient,
  sessionId: string,
  url: string,
  announce: boolean,
): Promise<{ ok: true; receipt: RecordingReceipt } | { ok: false; message: string }> {
  const problem = recordingLinkProblem(url);
  if (problem) return { ok: false, message: problem };

  const { data, error } = await supabase.rpc('attach_live_recording', {
    p_session_id: sessionId,
    p_url: url.trim(),
    p_announce: announce,
  });
  if (error) return { ok: false, message: error.message };

  const row = data as {
    announced?: unknown;
    notified?: unknown;
    people?: unknown;
    capped?: unknown;
    replaced?: unknown;
  } | null;
  if (!row || typeof row.notified !== 'number' || typeof row.people !== 'number') {
    return { ok: false, message: 'the recording was attached, but the receipt could not be read' };
  }

  return {
    ok: true,
    receipt: {
      announced: row.announced === true,
      notified: row.notified,
      people: row.people,
      capped: row.capped === true,
      replaced: row.replaced === true,
    },
  };
}

/**
 * Taking a recording down.
 *
 * The reason is mandatory because the next person to ask "why has this class lost
 * its recording?" is answered by it, so it is refused here before it reaches the
 * network rather than after.
 */
export async function removeLiveRecording(
  supabase: SupabaseClient,
  sessionId: string,
  reason: string,
): Promise<{ ok: true; reason: string } | { ok: false; message: string }> {
  const trimmed = reason.trim();
  if (trimmed.length < 3) return { ok: false, message: 'Say why the recording is being removed.' };

  const { error } = await supabase.rpc('remove_live_recording', {
    p_session_id: sessionId,
    p_reason: trimmed,
  });
  if (error) return { ok: false, message: error.message };
  return { ok: true, reason: trimmed };
}
