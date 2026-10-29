import Link from 'next/link';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';

import { createClient } from '@/lib/supabase/server';
import { isSupabaseConfigured } from '@/lib/env';
import { A11Y_COOKIE, parsePreferences } from '@/lib/a11y';
import { ReadingPreferences } from './preferences';

export const dynamic = 'force-dynamic';

/**
 * Reading preferences.
 *
 * One page with three settings and no save button. It exists because the
 * platform is for young children and adults worldwide, and "readable" is not one
 * size: a five-year-old on a tablet, a grandmother on an old phone in bright
 * light, and somebody who has asked their operating system for less motion all
 * get the same pages today.
 *
 * What this page does not pretend: it does not change the language, it does not
 * read the page aloud, and it is stored per browser rather than per account —
 * each of those is said here rather than left to be discovered.
 */
export default async function AccessibilityPage() {
  if (!isSupabaseConfigured()) redirect('/');

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?next=/account/accessibility');

  const jar = await cookies();
  const prefs = parsePreferences(jar.get(A11Y_COOKIE)?.value ?? null);

  return (
    <div className="page">
      <nav className="crumbs">
        <Link href="/account">Account</Link>
        <span aria-hidden>›</span>
        <span>Reading</span>
      </nav>

      <div className="page-head">
        <p className="eyebrow">Accessibility</p>
        <h1>How this reads</h1>
        <p className="muted">
          Three settings, applied the moment you choose them. They belong to this browser, not to
          your account — a phone and a laptop want different sizes, and a shared machine should not
          inherit somebody else’s choice.
        </p>
      </div>

      <ReadingPreferences initial={prefs} />

      <section className="card" style={{ marginTop: '1.5rem' }}>
        <h2 style={{ marginTop: 0 }}>What is already true without setting anything</h2>
        <ul>
          <li>
            <strong>The keyboard works everywhere.</strong> Every button and link has a visible
            focus outline, the first thing on each page is a “Skip to content” link, and no control
            is reachable only by a mouse.
          </li>
          <li>
            <strong>Your device’s own settings are honoured.</strong> If your system asks for less
            motion, the platform already reduces it; the setting above is for a device that does
            not ask.
          </li>
          <li>
            <strong>Text and background colours are measured, not eyeballed.</strong> Every colour
            pair in the stylesheet is checked against the WCAG AA ratio in the repository’s own
            check, and a pair that fails stops the build.
          </li>
          <li>
            <strong>Tables and forms carry names.</strong> Every input has a label, every table is
            inside a scroll container rather than pushing the page sideways, and every image that
            is decoration is marked as such.
          </li>
          <li>
            <strong>Arabic is set as Arabic.</strong> A course title, a lesson name, a teacher’s
            name and the name printed on a certificate are read in the script they were written
            in: the right letter shapes, the right spacing between joined letters, and the reading
            direction the words themselves ask for. A page that is mostly Arabic runs from right to
            left. Screen readers are told which passages are Arabic, so they switch voice instead
            of spelling the letters out one by one.
          </li>
          <li>
            <strong>A mixed name is still one name.</strong> “Surah Al-Fatihah (الفاتحة)” is not
            forced into one direction: each part is set in its own script and the browser joins
            them in the order a reader would say them.
          </li>
        </ul>
      </section>

      <section className="card" style={{ marginTop: '1rem' }}>
        <h2 style={{ marginTop: 0 }}>What is not here yet</h2>
        <ul>
          <li>
            <strong>The interface itself is in English.</strong> This has not changed and is not
            going to change by itself. Course content, names and certificates appear in whatever
            language they were written in, and Arabic among them is displayed properly — but the
            buttons, labels and sentences around them are English. Translating the interface needs
            translators, and the platform does not claim a translation it does not have.
          </li>
          <li>
            <strong>No right-to-left interface.</strong> A page whose content is Arabic still has
            its navigation, buttons and headings arranged for an English reader. Making the whole
            shell run right to left is a separate job from rendering Arabic text correctly, and
            only the second one is done.
          </li>
          <li>
            <strong>No text-to-speech.</strong> Reading a lesson aloud needs a speech provider
            nobody has connected.
          </li>
          <li>
            <strong>No dyslexia-friendly font.</strong> A font that is actually designed for it is
            licensed, and none is embedded here. The size and contrast settings are the honest
            substitutes until somebody buys one.
          </li>
        </ul>
      </section>

      <p style={{ marginTop: '1.5rem' }}>
        <Link href="/account" className="btn secondary">
          Back to my account
        </Link>
      </p>
    </div>
  );
}
