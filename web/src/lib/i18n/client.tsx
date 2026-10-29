'use client';

import { createContext, useContext, useMemo, type ReactNode } from 'react';

import { fill } from './index';
import { en, type MessageKey, type Messages } from './messages/en';
import type { LocaleCode } from './locales';

/**
 * Translation for the parts of the interface that run in the browser.
 *
 * The server knows the language; a form does not. This carries the **one**
 * catalogue the reader needs from the layout into every client component below
 * it, so a sign-in form is in the same language as the page that opened it.
 *
 * **The messages arrive already merged.** The server calls `messagesFor(code)`,
 * which is the chosen catalogue with English behind every gap — so this file
 * never has to decide what a missing string means, and no catalogue other than
 * the reader's is shipped to their browser. Loading all of them to translate one
 * page would be a small dishonesty about how much the client knows.
 *
 * **No provider is not an error.** `useT()` outside a provider returns English.
 * A component that is rendered somewhere the layout is not — a test, an error
 * boundary, a future route handler's client island — must render a sentence, not
 * throw; the same fallback rule the catalogue itself follows.
 */

type Value = { locale: LocaleCode; t: (key: MessageKey, vars?: Record<string, string | number>) => string };

const I18nContext = createContext<Value | null>(null);

export function I18nProvider({
  locale,
  messages,
  children,
}: {
  locale: LocaleCode;
  messages: Messages;
  children: ReactNode;
}) {
  const value = useMemo<Value>(
    () => ({
      locale,
      t: (key, vars) => fill(messages[key] ?? en[key], vars),
    }),
    [locale, messages],
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

/** The translator for the language this page is being rendered in. */
export function useT(): (key: MessageKey, vars?: Record<string, string | number>) => string {
  const value = useContext(I18nContext);
  return value?.t ?? ((key, vars) => fill(en[key], vars));
}

/** The language code, for `lang` and `dir` on a piece of text of its own. */
export function useLocaleCode(): LocaleCode {
  return useContext(I18nContext)?.locale ?? 'en';
}
