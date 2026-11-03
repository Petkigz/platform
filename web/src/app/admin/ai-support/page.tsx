import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { HelpEditor } from './help-editor';
import type { HelpArticle } from '@/lib/platform-help';

export const metadata = { title: 'Study assistant' };
export const dynamic = 'force-dynamic';

/**
 * What the study assistant was asked, and what the boundary did with it.
 *
 * This page exists because a boundary nobody can audit is a claim. The refusals
 * are the interesting half: they show whether the phrase list is refusing the
 * right questions, and the cases they opened show whether a learner who was
 * refused reached a person. Nothing here is a score.
 *
 * Gated on `is_privileged` inside `ai_support_summary()`, so the page redirects
 * rather than rendering an empty table for somebody who may not read it.
 */
export default async function AiSupportPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/admin/ai-support');

  const { data: summary, error } = await supabase.rpc('ai_support_summary', { p_days: 30 });
  if (error || !summary) redirect('/admin');

  const { data: ownerRole } = await supabase.rpc('has_role', { p_user_id: user.id, p_role_code: 'platform_admin' });
  const help = ownerRole === true
    ? await supabase.from('platform_help_articles').select('id,title,body,keywords,status,updated_at').order('title')
    : null;

  const s = summary as {
    days: number;
    asked: number;
    answered: number;
    refused: number;
    unmatched: number;
    withCase: number;
    topPhrases: { phrase: string; count: number }[];
    recitation: boolean;
  };

  const { data: rows } = await supabase
    .from('ai_support_questions')
    .select('id, question, status, matched_phrases, citation_count, support_cases(case_number), created_at')
    .order('created_at', { ascending: false })
    .limit(50);

  const questions = (rows ?? []) as unknown as {
    id: string;
    question: string;
    status: string;
    matched_phrases: string[];
    citation_count: number;
    support_cases: { case_number: string } | null;
    created_at: string;
  }[];

  return (
    <div className="container section">
      <p className="eyebrow">
        <Link href="/admin">Administration</Link>
      </p>
      <h1>Study assistant</h1>
      <p className="lede">
        Retrieval only: an answer is a lesson the person asking may open, and a
        question that asks for a ruling goes to a teacher. This page counts what
        happened in the last {s.days} days — it does not score anything.
      </p>

      <div className="stats">
        <div>
          <div className="n">{s.asked}</div>
          <div className="l">Questions asked</div>
        </div>
        <div>
          <div className="n">{s.answered}</div>
          <div className="l">Answered with a citation</div>
        </div>
        <div>
          <div className="n">{s.refused}</div>
          <div className="l">Sent to a teacher</div>
        </div>
        <div>
          <div className="n">{s.unmatched}</div>
          <div className="l">Nothing in their courses</div>
        </div>
        <div>
          <div className="n">{s.withCase}</div>
          <div className="l">Reached a support case</div>
        </div>
      </div>

      {s.refused > 0 && s.withCase < s.refused && (
        <div className="notice warn" style={{ marginTop: '1rem' }}>
          {s.refused - s.withCase} question{s.refused - s.withCase === 1 ? '' : 's'} that
          asked for a ruling did not reach a support case, because{' '}
          <code>platform.support</code> is off. The refusal still told the learner to
          ask their teacher — but the platform did not carry it there.
        </div>
      )}

      {s.topPhrases.length > 0 && (
        <section className="section">
          <h2>What the boundary refused</h2>
          <p className="muted">
            A phrase near the top is doing most of the refusing. If one of these is
            catching questions it should not, that is a phrase to remove — and the
            removal is a migration, because the list is code.
          </p>
          <ul className="lessons">
            {s.topPhrases.map((row) => (
              <li key={row.phrase}>
                <span className="n">{row.count}</span>
                <span className="t"><code>{row.phrase}</code></span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {ownerRole === true && (help?.error
        ? <p className="notice warn">Platform help could not be loaded.</p>
        : <HelpEditor articles={(help?.data ?? []) as HelpArticle[]} />)}

      <section className="section">
        <h2>The last fifty questions</h2>
        {questions.length === 0 ? (
          <p className="empty">Nobody has asked the assistant anything yet.</p>
        ) : (
          <ul className="lessons">
            {questions.map((q) => (
              <li key={q.id}>
                <span className="t">
                  {q.question}
                  <br />
                  <span className="muted">
                    {q.status === 'answered'
                      ? `${q.citation_count} citation${q.citation_count === 1 ? '' : 's'}`
                      : q.status === 'refused_ruling'
                        ? `sent to a teacher${q.support_cases?.case_number ? ` · case ${q.support_cases.case_number}` : ' · no case opened'}`
                        : 'nothing in their courses'}
                    {' · '}
                    {new Date(q.created_at).toLocaleString('en-GB', {
                      day: 'numeric', month: 'short', year: 'numeric',
                      hour: '2-digit', minute: '2-digit', timeZone: 'UTC',
                    })} UTC
                  </span>
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="muted" style={{ marginTop: '1.5rem' }}>
        Recitation feedback is {s.recitation ? 'on' : 'off'}. It stays off until
        Qur&rsquo;anic ASR has been validated on makharij.
      </p>

      <p style={{ marginTop: '1rem' }}>
        <Link href="/admin">Back to administration</Link>
      </p>
    </div>
  );
}
