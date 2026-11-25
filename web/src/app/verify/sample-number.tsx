/**
 * The sample certificate number, set inside a translated sentence.
 *
 * The sentences in `messages/verify.ts` say where the number goes with
 * `{number}`. It is a number in every language: Latin letters, Western
 * digits, read left to right, also in the middle of an Arabic line.
 */
export const SAMPLE_NUMBER = 'AS-2026-00000001';

export function WithSampleNumber({ text }: { text: string }) {
  const blank = '{number}';
  const at = text.indexOf(blank);
  if (at < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, at)}
      <code dir="ltr">{SAMPLE_NUMBER}</code>
      {text.slice(at + blank.length)}
    </>
  );
}
