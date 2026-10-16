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
  | 'rejected';

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
  const { data: existing } = await supabase
    .from('platform_settings')
    .select(COLUMNS)
    .eq('key', args.key)
    .maybeSingle();

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
    // external readiness, not a prohibition. Only `code` is refused, and only
    // by the database.
    return { ok: false, code: 'rejected', message: error.message };
  }

  return { ok: true, flag: toFlag(data as unknown as Row) };
}

export function gateLabel(g: GateType): string {
  if (g === 'admin') return 'Runtime toggle';
  if (g === 'admin_setup') return 'Needs external setup';
  return 'Needs a deploy';
}

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
    const g = f.group ?? 'Other';
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
