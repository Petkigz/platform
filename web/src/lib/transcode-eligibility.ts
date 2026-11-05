/** Fail closed if the database cannot prove a master is eligible for delivery. */
export async function decideTranscodeEligibility(
  check: () => PromiseLike<{ data: unknown; error: unknown }>,
): Promise<'eligible' | 'ineligible' | 'error'> {
  try {
    const { data, error } = await check();
    if (error) return 'error';
    return data === true ? 'eligible' : 'ineligible';
  } catch {
    return 'error';
  }
}
