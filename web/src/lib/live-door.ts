/**
 * The words the door of a live class and the roll's button are handed, and
 * the sentence for a refusal.
 *
 * Pure, with no import, because two client components read it
 * (`live/[sessionId]/join-button.tsx`, `attendance.tsx`) and a browser may
 * not carry the catalogues. The words are made on the server by
 * `liveWords` in `live-words.ts`.
 */

/** What the door says. A browser is handed this; it holds no sentence itself. */
export type DoorWords = {
  enter: string;
  opening: string;
  /** No answer, or an answer that was not one: nothing is known about the room. */
  failed: string;
  /** A reason this build has no sentence for. */
  shut: string;
  reasons: Record<string, string>;
};

/** What the button beside a name on the roll says. */
export type RollWords = {
  mark: string;
  left: string;
  failed: string;
};

/** The sentence for a refusal the door was given. Pure; a browser may call it. */
export function doorRefusal(words: DoorWords, reason: string | null | undefined): string {
  if (!reason || reason === 'refused') return words.failed;
  return Object.hasOwn(words.reasons, reason) ? (words.reasons[reason] ?? words.shut) : words.shut;
}
