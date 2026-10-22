# Sign in with Google

The flow is Supabase Auth's. This deployment never sees a Google client secret, and no
credential belongs in this repository — they live in the Supabase dashboard and the Google Cloud
console.

## What the code already does

- `/auth/callback` exchanges the code Supabase hands back for a session in a cookie, and forwards
  to a **sanitised** destination: relative, no `//`, no backslash. A sign-in callback that forwards
  to an arbitrary URL is a phishing kit's favourite component.
- A refusal returns to `/sign-in` with the reason in words a person can act on (cancelled, not
  configured, address already has a password), not an error page.
- `handle_new_user()` prefers the name Google supplies (`full_name`, then `name`), capped at 80
  characters, then falls back to the local part of the address.
- `my_sign_in_methods()` tells a Google account it has **no password**, so `/account` does not
  offer a password reset that would be a dead end.
- Nothing else about the account is special. Roles are still granted by a person; teaching is
  still an appointment.

## What you have to do, once

1. **Google Cloud console** → *APIs & Services* → *Credentials* → *Create credentials* →
   *OAuth client ID* → *Web application*.
   - Authorised redirect URI: `https://<project-ref>.supabase.co/auth/v1/callback`
   - No other URI is needed for this flow.
2. Copy the **client id** and **client secret**.
3. **Supabase dashboard** → *Authentication* → *Providers* → *Google* → enable, paste both, save.
4. **Supabase dashboard** → *Authentication* → *URL configuration*:
   - *Site URL*: your production URL.
   - *Redirect URLs*: add `https://<your-domain>/auth/callback` **and**, while developing,
     `http://localhost:3000/auth/callback`.
5. In the app, as the platform owner: `/admin` → flags → `auth.google_sign_in` → on.

Nothing needs a deploy: the flag is `admin_setup`, not `code`-gated, because the only missing piece
was configuration.

## What it does not do

- **No account linking button.** If somebody already has a password account under the same
  address, Supabase links the Google identity to it on first sign-in, because Google verifies the
  address. That is the behaviour this deployment relies on; it is why the address must be verified
  before linking, and it is Google's job to verify it.
- **No email is sent.** Google sign-in needs no confirmation mail, which is one more reason it is
  worth having before an email provider exists.
- **No role, ever.** A Google sign-in creates a learner like any other account.

## If the button does not appear

Check, in this order: the flag is on; the Supabase provider is enabled; the redirect URI in Google
matches `https://<project-ref>.supabase.co/auth/v1/callback` exactly; the deployment's own
`/auth/callback` is listed in Supabase's redirect URLs. The sign-in screen will say *"Google
sign-in is not switched on for this deployment yet"* when Supabase refuses the provider, which
means step 3 is missing.
