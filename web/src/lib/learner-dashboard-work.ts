/** Request-local dashboard work. Call only after authentication and the flag
 * and profile reads; these functions must use the visitor's scoped client. */
export async function loadLearnerDashboardExtras<Row, Summary, Live, Engagement, Lead>(options: {
  rows: readonly Row[];
  myProfileId: string | null;
  liveOn: boolean;
  streaksOn: boolean;
  progressOn: boolean;
  summary: (row: Row) => Promise<Summary>;
  summaryFallback: () => Summary;
  live: () => Promise<Live[]>;
  engagement: (profileId: string) => Promise<Engagement | null>;
  lead: (rows: readonly Row[]) => Promise<Lead | null>;
}): Promise<{ summaries: Summary[]; liveSessions: Live[]; engagement: Engagement | null; lead: Lead | null }> {
  const [summaries, liveSessions, engagement, lead] = await Promise.all([
    Promise.all(options.rows.map((row) => options.summary(row).catch(options.summaryFallback))),
    options.liveOn ? options.live() : Promise.resolve([]),
    options.streaksOn && options.myProfileId ? options.engagement(options.myProfileId) : Promise.resolve(null),
    options.progressOn && options.rows.length > 0 ? options.lead(options.rows) : Promise.resolve(null),
  ]);
  return { summaries, liveSessions, engagement, lead };
}
