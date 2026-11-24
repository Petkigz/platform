/**
 * What the child's age band means for a login, and whose password is in
 * force (`child_login_age()`). `under_twelve`: no login of their own.
 * `confirm`: only with the guardian's yes that the child is twelve or older.
 * `open`: 14-17, nobody is asked.
 */
export type ChildLoginAge = {
  gate: 'open' | 'confirm' | 'under_twelve';
  ownPassword: boolean | null;
};

export function parseChildLoginAge(input: unknown): ChildLoginAge | null {
  const row = input && typeof input === 'object' ? (input as Record<string, unknown>) : null;
  if (!row || (row.gate !== 'open' && row.gate !== 'confirm' && row.gate !== 'under_twelve')) return null;
  return { gate: row.gate, ownPassword: typeof row.ownPassword === 'boolean' ? row.ownPassword : null };
}
