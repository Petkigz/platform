/**
 * The feature-flag register.
 *
 * Everything is built to completion and shipped off. This module is the read
 * and write side of turning things on — which, per the standing decision, is
 * meant to happen from the admin dashboard rather than from a migration.
 *
 * The distinction that matters is `gateType`:
 *
 *   admin        a pure runtime toggle. Flip it here.
 *   admin_setup  the toggle exists, but external setup must finish first
 *                (a provider, a policy document, a deployment).
 *   code         needs a deploy. Not a runtime toggle, and the database
 *                refuses to enable one — `reject_code_flag_enablement()`.
 *
 * A `code` flag being unflippable is enforced by a trigger, not by this UI
 * hiding the control. A UI that hides something is not a control: the API is
 * reachable, and so is psql.
 */

import type { SupabaseClient } from '@supabase/supabase-js';

export type GateType = 'admin' | 'admin_setup' | 'code';

export type PlatformFlag = {
  key: string;
  description: string;
  enabled: boolean;
  gateType: GateType;
  preconditions: string | null;
  group: string | null;
  updatedAt: string | null;
};

type Row = {
  key: string;
  description: string;
  value_type: string;
  value_text: string | null;
  gate_type: string | null;
  preconditions: string | null;
  flag_group: string | null;
  updated_at: string | null;
};

const COLUMNS =
  'key, description, value_type, value_text, gate_type, preconditions, flag_group, updated_at';

function toFlag(r: Row): PlatformFlag {
  return {
    key: r.key,
    description: r.description,
    enabled: r.value_text === 'true',
    gateType: (r.gate_type ?? 'admin') as GateType,
    preconditions: r.preconditions,
    group: r.flag_group,
    updatedAt: r.updated_at,
  };
}

/**
 * The whole register, grouped and sorted.
 *
 * Readable only by privileged roles — the list describes unreleased features,
 * which is not something to publish to every signed-in user.
 */
export async function fetchFlags(supabase: SupabaseClient): Promise<PlatformFlag[]> {
  const { data, error } = await supabase
    .from('platform_settings')
    .select(COLUMNS)
    .order('flag_group', { ascending: true })
    .order('key', { ascending: true });

  if (error) throw new Error(error.message);
  return ((data ?? []) as unknown as Row[]).map(toFlag);
}

/**
 * One flag's state, for gating a feature in the app.
 *
 * Goes through `setting_bool()` rather than selecting the row, because that
 * function is `SECURITY DEFINER` and works for any role — an ordinary user's
 * request still needs to know whether a feature is on, without being able to
 * enumerate the register.
 */
export async function isFlagEnabled(
  supabase: SupabaseClient,
  key: string,
  fallback = false,
): Promise<boolean> {
  const { data, error } = await supabase.rpc('setting_bool', {
    p_key: key,
    p_default: fallback,
  });
  if (error) throw new Error(error.message);
  return data === true;
}

export type FlagOutcome =
  | { ok: true; flag: PlatformFlag }
  | { ok: false; code: FlagErrorCode; message: string };

export type FlagErrorCode =
  | 'not_privileged'
  | 'unknown_flag'
  | 'code_gated'
  | 'not_boolean'
  | 'rejected'
  | 'unsure';

/**
 * Whether an error is an answer at all. PostgreSQL and PostgREST both give a
 * refusal a code. An error with none is a gateway's page or a connection that
 * went (and class 08 is the connection itself): the request may have been
 * carried out and the answer lost, so nobody can say what happened.
 */
export function isNoAnswer(error: { code?: string | null } | null | undefined): boolean {
  const state = String(error?.code ?? '');
  return state === '' || state.startsWith('08');
}

const UNSURE = 'Nobody can say whether that switch changed. Load the page again and look at it before pressing again.';

/**
 * Enable or disable a flag.
 *
 * Refuses a `code`-gated flag with an explanation rather than passing the
 * database error through, because the person clicking needs to know what to do
 * next — and the trigger message, while accurate, is written for a developer.
 */
export async function setFlag(
  supabase: SupabaseClient,
  args: { key: string; enabled: boolean },
): Promise<FlagOutcome> {
  const { data: existing, error: readError } = await supabase
    .from('platform_settings')
    .select(COLUMNS)
    .eq('key', args.key)
    .maybeSingle();

  // A read that failed is not "no flag by that name": the page would tell the
  // owner a switch had gone that is still there (2026-11-28).
  if (readError) {
    return isNoAnswer(readError)
      ? { ok: false, code: 'unsure', message: UNSURE }
      : { ok: false, code: 'rejected', message: readError.message };
  }

  const row = existing as unknown as Row | null;
  if (!row) {
    return { ok: false, code: 'unknown_flag', message: `No flag named '${args.key}'.` };
  }
  if (row.value_type !== 'boolean') {
    return {
      ok: false,
      code: 'not_boolean',
      message: `'${args.key}' is a ${row.value_type} setting, not a switch.`,
    };
  }

  const gate = (row.gate_type ?? 'admin') as GateType;
  if (args.enabled && gate === 'code') {
    return {
      ok: false,
      code: 'code_gated',
      message:
        `'${args.key}' needs a deploy before it can run. ` +
        (row.preconditions
          ? `Preconditions: ${row.preconditions}`
          : 'No preconditions were recorded, which is itself a gap — see FLAGS.md.'),
    };
  }

  const { data, error } = await supabase
    .from('platform_settings')
    .update({ value_text: args.enabled ? 'true' : 'false' })
    .eq('key', args.key)
    .select(COLUMNS)
    .single();

  if (error) {
    // An admin_setup flag is allowed through: the gate is a warning about
    // external readiness, not a prohibition. Only `code` is refused by the
    // gate, and since 2026-10-24 only the platform admin may write a switch at
    // all — the table's trigger refuses everybody else, and its sentence is the
    // one worth showing.
    if (error.code === '42501' || /only the platform admin/i.test(error.message)) {
      return { ok: false, code: 'not_privileged', message: error.message };
    }
    // No answer of the database's own: the write may have been made and the
    // answer lost. Saying "refused" would be a guess, and so would a gateway's
    // page shown as the database's sentence.
    if (isNoAnswer(error)) return { ok: false, code: 'unsure', message: UNSURE };
    return { ok: false, code: 'rejected', message: error.message };
  }

  return { ok: true, flag: toFlag(data as unknown as Row) };
}

/**
 * The badge beside a switch, as the key of the sentence that says it.
 *
 * An `admin_setup` switch said "Needs external setup" whether it was off or
 * on. The owner finished the setup, switched Google sign-in on, and the row
 * went on saying something was needed (2026-11-27). The badge now says what
 * is true for the state the switch is in: before, do the outside part first;
 * after, this is on and leans on something outside the platform.
 *
 * A key and not a sentence since 2026-11-28: the page says it in the
 * reader's language.
 */
export type GateLabelKey =
  | 'switch.gateRuntime'
  | 'switch.gateSetupFirst'
  | 'switch.gateSetupOn'
  | 'switch.gateDeploy';

export function gateLabelKey(g: GateType, enabled = false): GateLabelKey {
  if (g === 'admin') return 'switch.gateRuntime';
  if (g === 'admin_setup') return enabled ? 'switch.gateSetupOn' : 'switch.gateSetupFirst';
  return 'switch.gateDeploy';
}

/** The group a flag with no group is listed under. */
export const UNGROUPED = 'Other';

/**
 * The groups the page can name in the reader's language. A group's name is a
 * value in the database (`platform_settings.flag_group`), written in English;
 * these are the ones the migrations use. A group that is not here is shown as
 * the database wrote it, and the page marks it as English.
 */
export const FLAG_GROUP_KEYS = {
  'Learner features': 'switch.gLearner',
  Teaching: 'switch.gTeaching',
  Money: 'switch.gMoney',
  'Children and families': 'switch.gFamilies',
  Platform: 'switch.gPlatform',
  Delivery: 'switch.gDelivery',
  Governance: 'switch.gGovernance',
  [UNGROUPED]: 'switch.gOther',
} as const;

export type FlagGroupKey = (typeof FLAG_GROUP_KEYS)[keyof typeof FLAG_GROUP_KEYS];

export function flagGroupKey(group: string): FlagGroupKey | null {
  return Object.hasOwn(FLAG_GROUP_KEYS, group)
    ? FLAG_GROUP_KEYS[group as keyof typeof FLAG_GROUP_KEYS]
    : null;
}

/**
 * What the switch says when a change was not made, by name (2026-11-28).
 *
 * `unsure` is not a refusal. An answer that is not the API's own (a gateway's
 * page, a connection that went) leaves nobody able to say whether the switch
 * changed, and the sentence says to look before pressing again. `refused`
 * carries the database's own sentence, which is English.
 */
export type FlagRefusal = 'notOwner' | 'deploy' | 'unknown' | 'refused' | 'signedOut' | 'unsure';

export function flagRefusalOf(
  status: number,
  body: unknown,
): { refusal: FlagRefusal; said: string | null } {
  if (typeof body !== 'object' || body === null || (body as { ok?: unknown }).ok !== false) {
    return { refusal: 'unsure', said: null };
  }
  const { code, message } = body as { code?: unknown; message?: unknown };
  if (status === 401) return { refusal: 'signedOut', said: null };
  if (code === 'not_privileged') return { refusal: 'notOwner', said: null };
  if (code === 'code_gated') return { refusal: 'deploy', said: null };
  if (code === 'unknown_flag') return { refusal: 'unknown', said: null };
  if (code === 'unsure') return { refusal: 'unsure', said: null };
  const said = typeof message === 'string' && message.trim() !== '' ? message.trim() : null;
  return { refusal: 'refused', said };
}

/** Every sentence a row of the register says, handed over by the page. */
export type FlagToggleWords = {
  gates: Record<GateLabelKey, string>;
  on: string;
  off: string;
  refusals: Record<FlagRefusal, string>;
  /** Whether what the database wrote has to be marked as English on this page. */
  markEnglish: boolean;
};

/** Groups in a stable, sensible order rather than alphabetical. */
export function groupFlags(flags: PlatformFlag[]): { group: string; flags: PlatformFlag[] }[] {
  const order = [
    'Learner features',
    'Teaching',
    'Money',
    'Children and families',
    'Platform',
    'Delivery',
  ];
  const byGroup = new Map<string, PlatformFlag[]>();
  for (const f of flags) {
    const g = f.group ?? UNGROUPED;
    const list = byGroup.get(g) ?? [];
    list.push(f);
    byGroup.set(g, list);
  }

  const known = order.filter((g) => byGroup.has(g)).map((g) => ({ group: g, flags: byGroup.get(g)! }));
  const rest = [...byGroup.keys()]
    .filter((g) => !order.includes(g))
    .sort()
    .map((g) => ({ group: g, flags: byGroup.get(g)! }));

  return [...known, ...rest];
}
