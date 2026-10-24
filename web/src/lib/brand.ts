/**
 * The mark, as geometry.
 *
 * The masthead drew this star with a CSS `clip-path` on an empty `<span>` — a
 * shape with no file behind it. That works in the header and nowhere else: a
 * favicon, an app icon and a share card all need the geometry as data, and the
 * certificate needs it on paper. So the sixteen points live here and every
 * surface reads them: the `<BrandMark>` component, `app/icon.svg`, and the
 * generated `apple-icon.png`.
 *
 * An eight-pointed star is two squares rotated through each other — the
 * simplest unit of Islamic geometric pattern, and abstract enough to carry no
 * imagery at all. The points are unchanged from the CSS version, so the header
 * looks exactly as it did; what changed is that the shape is now a thing the
 * rest of the app can use.
 *
 * A mark that exists in two places is a mark that will disagree, so
 * `brand.test.ts` reads `app/icon.svg` and fails if its polygon stops matching
 * this one.
 */

/** The polygon in a `0 0 100 100` box, in the order the star is drawn. */
export const MARK_POINTS =
  '50,0 61,20 85,15 80,39 100,50 80,61 85,85 61,80 50,100 39,80 15,85 20,61 0,50 20,39 15,15 39,20';

/** The box every coordinate above is relative to. */
export const MARK_VIEWBOX = '0 0 100 100';

/**
 * The star on its own, as an SVG document — used for the favicon and as the
 * image inside the share card, where a component cannot be rendered.
 *
 * `tile` draws the star on the rounded green square the favicon and the app
 * icon use: at sixteen pixels a bare green star on transparent is a smudge,
 * and a browser puts the icon on chrome that may be either colour.
 */
export function markSvg({
  size = 100,
  tile = false,
  starScale = 0.62,
  radius = 22,
}: { size?: number; tile?: boolean; starScale?: number; radius?: number } = {}): string {
  const inset = (100 - 100 * starScale) / 2;
  const star = `<polygon points="${MARK_POINTS}" transform="translate(${inset} ${inset}) scale(${starScale})" fill="${tile ? '#ffffff' : '#0b6b3a'}"/>`;
  const background = tile
    ? `<rect x="0" y="0" width="100" height="100" rx="${radius}" fill="#0b6b3a"/>`
    : '';

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${MARK_VIEWBOX}" width="${size}" height="${size}">` +
    `${background}${star}</svg>`
  );
}
