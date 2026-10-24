import type { MetadataRoute } from 'next';

/**
 * What Android and Chrome read when someone adds the site to a home screen.
 *
 * There is no service worker, so this deliberately does **not** claim to work
 * offline: `display: 'standalone'` opens the site without browser chrome, and
 * without a connection it shows the browser's own offline page rather than a
 * cached application. A manifest that promised offline would be the same kind of
 * claim the About page had to have removed.
 *
 * The colours are the design tokens, repeated here because a manifest is JSON
 * consumed by the operating system, not CSS.
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'AyahSpring',
    short_name: 'AyahSpring',
    description:
      'Islamic learning for children and adults, worldwide. Taught by qualified teachers.',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0b6b3a',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/apple-icon.png', sizes: '180x180', type: 'image/png' },
    ],
  };
}
