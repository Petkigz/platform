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
            not ask. The same is true of language: the interface opens in the language this device
            asks for, and <Link href="/language">the language page</Link> is where it is changed.
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
            <strong>The interface is translated, and it says how completely.</strong> Thirty-three
            languages are offered, twenty-one of them African, and each one states how much of it is
            actually translated. All of them are complete today; the number is on{' '}
            <Link href="/language">the language page</Link> so that a language which falls behind
            shows it, rather than serving one English sentence among translated ones. Course titles,
            lessons and comments stay in the language their author wrote them in, whatever language
            the buttons are in.
          </li>
          <li>
            <strong>
              Right-to-left is for Arabic, Urdu, Persian, Pashto, Dari and Dhivehi.
            </strong>{' '}
            Choosing one of those six turns the whole page around: the masthead, the nav, the notices and
            the footer mirror, because the rules that place them are written in logical properties
            rather than left and right. A right-to-left course shown to a reader whose interface is
            left-to-right is handled separately, and is what the paragraphs above describe.
          </li>
          <li>
            <strong>The choice is kept on this browser, not on your account.</strong> Language is
            read before anybody signs in, so it is stored in a cookie; the same person on a
            different device gets that device's language until they change it there too.
          </li>
          <li>
            <strong>Most translations have not been read by a native speaker.</strong> They were
            written by the people who built the platform, and a wrong word in a language we do not
            speak is a mistake we owe the reader. The language page says so for every language it
            offers — including, today, all thirty-two that are not English — and the sentence is a
            flag in the language register rather than a paragraph somebody has to remember to edit.
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
