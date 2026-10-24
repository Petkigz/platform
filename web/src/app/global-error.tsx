'use client';

/**
 * The last page standing.
 *
 * `error.tsx` catches a page that throws. This catches a failure in the root
 * layout itself — the masthead, the providers, anything above every page — where
 * the app has no chrome left to render inside. It must therefore carry its own
 * `<html>` and `<body>`, and it cannot rely on the stylesheet having loaded,
 * which is why the few styles below are inline and deliberately plain.
 *
 * There are no links here. In this state the router itself may be the thing that
 * is broken, so the honest action is a full reload of the home page, and the
 * only reference worth quoting is the digest.
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body
        style={{
          margin: 0,
          minHeight: '100vh',
          display: 'grid',
          placeItems: 'center',
          padding: '2rem',
          fontFamily: 'system-ui, -apple-system, Segoe UI, sans-serif',
          background: '#ffffff',
          color: '#12341f',
        }}
      >
        <main style={{ maxWidth: '34rem' }}>
          <p
            style={{
              textTransform: 'uppercase',
              letterSpacing: '0.12em',
              fontSize: '0.75rem',
              color: '#4a6b56',
              margin: 0,
            }}
          >
            AyahSpring
          </p>
          <h1 style={{ fontSize: '1.75rem', lineHeight: 1.2, margin: '0.4rem 0 0.75rem' }}>
            The site failed to load
          </h1>
          <p style={{ color: '#3d5a47', lineHeight: 1.55, margin: 0 }}>
            Something above every page broke, so nothing could be drawn. Reloading
            usually fixes it. If it keeps happening, quote the reference below when
            you ask for help.
          </p>

          {error.digest && (
            <p style={{ color: '#3d5a47', margin: '0.75rem 0 0', fontSize: '0.9rem' }}>
              Reference: <code>{error.digest}</code>
            </p>
          )}

          <p style={{ marginTop: '1.25rem' }}>
            <button
              type="button"
              onClick={reset}
              style={{
                background: '#12341f',
                color: '#ffffff',
                border: 0,
                borderRadius: '0.5rem',
                padding: '0.6rem 1rem',
                fontSize: '0.95rem',
                cursor: 'pointer',
              }}
            >
              Try again
            </button>{' '}
            <a
              href="/"
              style={{
                display: 'inline-block',
                marginLeft: '0.5rem',
                color: '#12341f',
                padding: '0.6rem 0.75rem',
              }}
            >
              Go to the home page
            </a>
          </p>
        </main>
      </body>
    </html>
  );
}
