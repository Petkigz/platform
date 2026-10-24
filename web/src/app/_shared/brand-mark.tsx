import { MARK_POINTS, MARK_VIEWBOX } from '@/lib/brand';

/**
 * The mark, drawn from the same sixteen points as the favicon.
 *
 * It is decorative wherever the word "AyahSpring" is next to it, so it is
 * hidden from assistive technology by default and takes a `title` only when a
 * screen shows the mark alone — a printed certificate, say, where it is the
 * only thing identifying who issued it.
 */
export function BrandMark({
  size = 24,
  className,
  title,
}: {
  size?: number;
  className?: string;
  title?: string;
}) {
  return (
    <svg
      viewBox={MARK_VIEWBOX}
      width={size}
      height={size}
      className={className}
      role={title ? 'img' : undefined}
      aria-hidden={title ? undefined : true}
      focusable="false"
    >
      {title && <title>{title}</title>}
      <polygon points={MARK_POINTS} fill="currentColor" />
    </svg>
  );
}
