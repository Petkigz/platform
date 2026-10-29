import type { CSSProperties, ReactNode } from 'react';

import { describeText } from '@/lib/arabic';

/**
 * Text that may be in Arabic, rendered so that a browser and a screen reader
 * both handle it correctly.
 *
 * Used anywhere a person's own words appear: a course title, a lesson heading, a
 * learner's name on a certificate, a teacher's biography. The words are whatever
 * they typed; this is only about how it is presented.
 *
 * **`<bdi lang="ar">` and not a `<span>`.** `bdi` isolates the run from the
 * surrounding text, so the punctuation of an English sentence stays where it was
 * written instead of jumping to the other end of the line. `lang="ar"` is what
 * makes a screen reader switch to an Arabic voice for those letters — the
 * difference between a sentence being read and being spelled out as noise.
 *
 * **The block gets a direction.** A heading that is entirely Arabic should sit
 * against the right edge, the way it is read; a heading that quotes one Arabic
 * word should not move at all. `majorityDirection()` decides, because counting
 * letters is the only measure that does not need to know what the text means.
 */

/** Inline. Use inside a heading or a paragraph of your own. */
export function ArabicInline({ text }: { text: string | null | undefined }) {
  const described = describeText(text);
  if (!described.hasArabic) return <>{text ?? ''}</>;

  return (
    <>
      {described.runs.map((run, index) =>
        run.arabic ? (
          <bdi key={index} lang="ar" className="arabic">
            {run.text}
          </bdi>
        ) : (
          <span key={index}>{run.text}</span>
        ),
      )}
    </>
  );
}

/**
 * Block level: the same text, with the direction of the block set.
 *
 * `dir` is set from the *majority* rather than from the first character, because
 * a block that begins with a Latin citation and continues in Arabic should read
 * as Arabic once it has found its feet. Inline runs are still isolated inside it,
 * so an English gloss in an Arabic paragraph stays left-to-right.
 */
export function ArabicBlock({
  text,
  as: Tag = 'p',
  className,
  style,
}: {
  text: string | null | undefined;
  as?: 'p' | 'h1' | 'h2' | 'h3' | 'span' | 'div';
  className?: string;
  style?: CSSProperties;
}): ReactNode {
  const described = describeText(text);
  return (
    <Tag dir={described.blockDirection} className={className} style={style}>
      <ArabicInline text={text} />
    </Tag>
  );
}

/**
 * A heading whose element is chosen by the page.
 *
 * Headings are the place this matters most: a course taught in Arabic has an
 * Arabic `<h1>`, and an `<h1>` laid out left-to-right puts its full stop at the
 * wrong end of the line for anybody using a screen reader or a low-vision
 * magnifier.
 */
export function ArabicHeading({
  text,
  level = 1,
  className,
}: {
  text: string | null | undefined;
  level?: 1 | 2 | 3;
  className?: string;
}) {
  const described = describeText(text);
  const Tag = (`h${level}` as const) satisfies 'h1' | 'h2' | 'h3';
  const Heading = Tag as 'h1';
  return (
    <Heading dir={described.blockDirection} className={className}>
      <ArabicInline text={text} />
    </Heading>
  );
}
