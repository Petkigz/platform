// Data-free test preview only. This is not production authentication or a
// substitute for Cloudflare Access and does not make real user data safe.
const PASSWORD = /^[A-Za-z0-9_-]{32,128}$/;
const encoder = new TextEncoder();
const message = encoder.encode('ayahspring-data-free-preview-v1');

function response(status, text, challenge = false) {
  const headers = new Headers({ 'content-type': 'text/plain; charset=utf-8', 'cache-control': 'private, no-store', 'x-robots-tag': 'noindex, nofollow' });
  if (challenge) headers.set('www-authenticate', 'Basic realm="AyahSpring test preview", charset="UTF-8"');
  return new Response(text, { status, headers });
}

async function matches(secret, candidate) {
  // WebCrypto verifies HMAC tags without a JavaScript string comparison.
  const options = { name: 'HMAC', hash: 'SHA-256' };
  const expected = await crypto.subtle.importKey('raw', encoder.encode(secret), options, false, ['verify']);
  const supplied = await crypto.subtle.importKey('raw', encoder.encode(candidate), options, false, ['sign']);
  const tag = await crypto.subtle.sign('HMAC', supplied, message);
  return crypto.subtle.verify('HMAC', expected, tag, message);
}

function credentials(header) {
  if (!header || header.length > 512 || !/^Basic [A-Za-z0-9+/]+={0,2}$/i.test(header)) return null;
  try {
    const decoded = atob(header.slice(6));
    if (!decoded.startsWith('preview:')) return null;
    const candidate = decoded.slice('preview:'.length);
    return PASSWORD.test(candidate) ? candidate : null;
  } catch { return null; }
}

export function guardedPreview(app) {
  return {
    async fetch(request, env, ctx) {
      const secret = env.PREVIEW_PASSWORD;
      // No password, malformed password, or accidentally exposed config: never
      // invoke the app or the asset binding. Operators must generate randomness.
      if (typeof secret !== 'string' || !PASSWORD.test(secret)) return response(503, 'Test preview is not configured.');
      const candidate = credentials(request.headers.get('authorization'));
      if (!candidate || !(await matches(secret, candidate))) return response(401, 'Test preview access required.', true);

      const headers = new Headers(request.headers);
      headers.delete('authorization');
      const cleanRequest = new Request(request, { headers });
      const safeEnv = { ...env };
      delete safeEnv.PREVIEW_PASSWORD;
      // run_worker_first is required in Wrangler: static assets must not bypass
      // the gate. Serve existing assets through the binding after authentication.
      let result;
      if ((request.method === 'GET' || request.method === 'HEAD') && env.ASSETS) {
        const asset = await env.ASSETS.fetch(cleanRequest);
        if (asset.status !== 404) result = asset;
      }
      if (!result) result = await app.fetch(cleanRequest, safeEnv, ctx);
      const outputHeaders = new Headers(result.headers);
      outputHeaders.set('cache-control', 'private, no-store');
      outputHeaders.set('x-robots-tag', 'noindex, nofollow');
      return new Response(result.body, { status: result.status, statusText: result.statusText, headers: outputHeaders });
    },
  };
}
