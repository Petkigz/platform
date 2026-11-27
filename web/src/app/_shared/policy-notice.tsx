'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

import { Say } from '@/components/say';
import { formatNumber } from '@/lib/i18n/format';
import type { LocaleCode } from '@/lib/i18n/locales';
import {
  AGREED_EVENT, DISMISSED_KEY, OPENING_KEY,
  SIGNUP_KEY,
  notOnItsWay, noticeHref, parseNoticeAnswer, readDismissed, readOpening, stillToTell, storeDismissed, storeOpening, withoutSlug,
  type NoticeItem,
} from '@/lib/policy-notice';

import { sessionOnce } from './session-once';

/** The words the notice says. Chosen on the server, in the reader's language. */
export type PolicyNoticeWords = {
  /** With `{count}` in it. */
  changed: string;
  open: string;
  /** For an account that was never asked: how many documents are waiting, and the way to them. */
  waiting: string;
  agree: string;
  dismiss: string;
};

/** A store that may not be there: private browsing, or storage turned off. */
function read(store: 'session' | 'local', key: string): string | null {
  try {
    return (store === 'session' ? window.sessionStorage : window.localStorage).getItem(key);
  } catch {
    return null;
  }
}
function write(store: 'session' | 'local', key: string, value: string | null): void {
  try {
    const area = store === 'session' ? window.sessionStorage : window.localStorage;
    if (value === null) area.removeItem(key);
    else area.setItem(key, value);
  } catch {
    // Nothing is kept. The notice then asks again on the next page, which is
    // more often than intended and never less.
  }
}

/**
 * This opening's answer, found once for each page that is loaded: the one
 * already kept for this tab, or else the route's. Null when there is none to
 * believe, which is a visitor, a failed read, or a request cut short.
 *
 * Once, and not once for each time the notice is drawn: a component can be
 * mounted twice, and each would otherwise ask.
 */
let opening: Promise<NoticeItem[] | null> | null = null;
/**
 * The documents agreed to on this page. An agreement can be recorded while
 * the question above is still on its way back, and the answer then names a
 * document that is no longer waiting.
 */
const agreedHere = new Set<string>();

function openingOnce(): Promise<NoticeItem[] | null> {
  opening ??= (async () => {
    const session = await sessionOnce();
    if (!session.signedIn) {
      // Whoever signs in next on this tab is asked about themselves.
      write('session', OPENING_KEY, null);
      return null;
    }
    const kept = readOpening(read('session', OPENING_KEY));
    if (kept !== null) return kept;
    try {
      const response = await fetch('/api/policies', { cache: 'no-store' });
      if (!response.ok) return null;
      const answer = parseNoticeAnswer(await response.json());
      // Not an answer: nothing is kept, so the next page asks again.
      if (answer === null) return null;
      write('session', OPENING_KEY, storeOpening(answer));
      return answer;
    } catch {
      // Offline, or the request was cut short. The next page asks again.
      return null;
    }
  })();
  return opening;
}

/**
 * The notice that a document the reader agreed to has changed.
 *
 * **Asked once each time the application is opened.** The owner's rule
 * (2026-11-23) is that a change of policy is told at the reader's next
 * opening or by a notification, and that nothing is sprung on a page they
 * already have open. So this asks `/api/policies` on the first page of an
 * opening, keeps the answer for as long as the tab lives, and does not ask
 * again: a version published an hour into a session is not announced over
 * whatever the reader is doing. They are told the next time they open the
 * application, and the notifications page says it whenever they look.
 *
 * Only somebody signed in is asked about, and that is learnt from the one
 * question the masthead already asks. A visitor costs no request. Signing
 * out forgets the answer, so the next person to sign in on the same tab is
 * asked about themselves.
 *
 * **It can be put away.** That is kept on the device, for those versions:
 * the next change to the same document is told again. Putting it away does
 * not agree to anything; the document's page and the account page go on
 * saying what is waiting.
 *
 * **It sits between the page and the footer and holds to the bottom of the
 * window.** It arrives after the page is drawn. Above the page it would push
 * everything down under a finger that was already on its way; here nothing
 * the reader was aiming at moves.
 *
 * Nothing is drawn until there is something to tell, so the HTML a visitor
 * and a crawler get has no trace of it.
 */
export function PolicyNotice({
  locale,
  words,
  lang,
  dir,
}: {
  locale: LocaleCode;
  words: PolicyNoticeWords;
  /** Set when the words are in another language than the page round them. */
  lang?: string;
  dir?: 'ltr' | 'rtl';
}) {
  const [items, setItems] = useState<NoticeItem[]>([]);

  useEffect(() => {
    let here = true;
    const show = (changed: NoticeItem[]) => {
      if (!here) return;
      // What was ticked at sign-up is being recorded by the layout on this
      // same page: that person is not asked a second time meanwhile.
      const due = notOnItsWay(changed, read('local', SIGNUP_KEY), Date.now());
      setItems(stillToTell(due, readDismissed(read('local', DISMISSED_KEY))));
    };

    void openingOnce().then((answer) => {
      // What is kept is read rather than what was answered: an agreement
      // since then has taken a document out of it. With no storage there is
      // only the answer.
      const told = readOpening(read('session', OPENING_KEY)) ?? answer;
      if (told === null) return;
      const left = told.filter((item) => !agreedHere.has(item.slug));
      if (left.length !== told.length) write('session', OPENING_KEY, storeOpening(left));
      show(left);
    });

    // The agreement button is on a page under this same layout. When it
    // records an agreement the notice stops telling about that document.
    const agreed = (event: Event) => {
      const slug = (event as CustomEvent<unknown>).detail;
      if (typeof slug !== 'string') return;
      agreedHere.add(slug);
      const kept = readOpening(read('session', OPENING_KEY));
      if (kept === null) return;
      const left = withoutSlug(kept, slug);
      write('session', OPENING_KEY, storeOpening(left));
      show(left);
    };
    window.addEventListener(AGREED_EVENT, agreed);
    return () => {
      here = false;
      window.removeEventListener(AGREED_EVENT, agreed);
    };
  }, []);

  if (items.length === 0) return null;

  const dismiss = () => {
    write('local', DISMISSED_KEY, storeDismissed(readDismissed(read('local', DISMISSED_KEY)), items));
    setItems([]);
  };

  // An account that was never asked has nothing that "changed": it is told
  // how many documents are waiting and shown the way to them.
  const asking = items.some((item) => item.first);

  return (
    <aside
      className="policy-notice"
      role="status"
      data-policy-notice={items.length}
      data-policy-notice-kind={asking ? 'waiting' : 'changed'}
      lang={lang}
      dir={dir}
    >
      <div className="container policy-notice-inner">
        <p>
          <Say text={asking ? words.waiting : words.changed} parts={{ count: <bdi>{formatNumber(locale, items.length)}</bdi> }} />
        </p>
        <div className="policy-notice-ways">
          <Link href={noticeHref(items)} className="btn" data-policy-notice-open>
            {asking ? words.agree : words.open}
          </Link>
          <button type="button" className="btn ghost" onClick={dismiss} data-policy-notice-dismiss>
            {words.dismiss}
          </button>
        </div>
      </div>
    </aside>
  );
}
