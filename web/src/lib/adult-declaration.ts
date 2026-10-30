import type { SupabaseClient } from '@supabase/supabase-js';

/**
 * The adulthood declaration.
 *
 * The owner's decision of 2026-10-30: the platform asks an adult to *say* they
 * are eighteen or older before it accepts a child onto their account, and it
 * takes the answer. Nothing here checks a document, a card or a face, and the
 * interface says so in a sentence rather than implying otherwise.
 *
 * The shape below is what `my_adult_declaration()` returns. It is read as
 * unknown and narrowed rather than cast, because a page that trusts a JSON
 * blob's shape is a page that renders `undefined` the day a column is renamed.
 */
export type AdultDeclaration = {
  /** Whether the platform is asking at all. Off means the page mentions it and moves on. */
  required: boolean;
  /** An unwithdrawn declaration exists. It means somebody said so. */
  declared: boolean;
  /** A declaration exists but was withdrawn — a different fact from never made. */
  withdrawn: boolean;
  statementVersion: number;
  /** The exact words, in the version that was agreed to. */
  statement: string;
  declaredAt: string | null;
  withdrawnAt: string | null;
};

const NEVER: AdultDeclaration = {
  required: false,
  declared: false,
  withdrawn: false,
  statementVersion: 1,
  statement: '',
  declaredAt: null,
  withdrawnAt: null,
};

const str = (v: unknown): string | null => (typeof v === 'string' && v.length > 0 ? v : null);

export function parseDeclaration(value: unknown): AdultDeclaration {
  if (typeof value !== 'object' || value === null) return NEVER;
  const v = value as Record<string, unknown>;
  return {
    required: v.required === true,
    declared: v.declared === true,
    withdrawn: v.withdrawn === true,
    statementVersion: typeof v.statementVersion === 'number' ? v.statementVersion : 1,
    statement: str(v.statement) ?? '',
    declaredAt: str(v.declaredAt),
    withdrawnAt: str(v.withdrawnAt),
  };
}

/** Read it for the signed-in account. A failure is silence, not an error page. */
export async function fetchDeclaration(
  supabase: SupabaseClient,
): Promise<AdultDeclaration> {
  const { data, error } = await supabase.rpc('my_adult_declaration');
  if (error) return NEVER;
  return parseDeclaration(data);
}

/**
 * The sentence under the button, which exists because the alternative is a
 * checkbox that implies a check we do not perform.
 *
 * It says three things in one breath: what we record, that we do not verify it,
 * and what happens if it turns out to be untrue. A declaration form that omitted
 * the second would be the sort of quiet overclaim this platform refuses
 * everywhere else.
 */
export function declarationNote(): string {
  return (
    'We record that you said this and when. We do not check it — no document, ' +
    'no card. If it is untrue, the children on your account are the reason we ask.'
  );
}
