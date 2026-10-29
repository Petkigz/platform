/**
 * The strings, in the language everybody's translation is checked against.
 *
 * English is the source, not the priority: a key exists here first, and a
 * catalogue in another language supplies whatever it has. A key that has no
 * translation falls back to this file rather than showing a blank or a key name,
 * so a half-translated interface reads as *mostly translated* instead of broken.
 *
 * **Placeholders are `{name}` and are not optional.** `{year}` in the copyright
 * line is filled at render time; leaving it out of a translation is a mistake the
 * tests catch, because a translation that drops a placeholder is a sentence that
 * has quietly lost a number.
 *
 * Kept short on purpose. Every key here is one that appears on every page — the
 * frame, the language settings and the few words a visitor meets before signing
 * in. A key nobody uses is a string nobody maintains.
 */

export const en = {
  'skip.toContent': 'Skip to content',

  'nav.main': 'Main',
  'nav.catalogue': 'Catalogue',
  'nav.learn': 'My learning',
  'nav.family': 'My family',
  'nav.plans': 'Plans',
  'nav.subscriptions': 'Subscriptions',
  'nav.teach': 'Teach',
  'nav.review': 'Review',
  'nav.certificates': 'Certificates',

  'footer.tagline': 'Islamic learning for children and adults, worldwide.',
  'footer.rights': '© {year} AyahSpring',
  'footer.about': 'About',
  'footer.terms': 'Terms and privacy',
  'footer.help': 'Help',
  'footer.verify': 'Check a certificate',
  'footer.area': 'Your area',
  'footer.notifications': 'Notifications',

  'action.signIn': 'Sign in',
  'action.getStarted': 'Get started',
  'action.signOut': 'Sign out',
  'action.save': 'Save',
  'action.cancel': 'Cancel',

  'region.africa': 'Africa',
  'region.middleEast': 'Middle East',
  'region.asia': 'Asia',
  'region.west': 'Europe and the Americas',
  'language.title': 'Language',
  'language.lede':
    'The interface is shown in the language you choose here. This browser starts with the language your device asks for, and follows it until you choose one.',
  'language.current': 'Currently showing',
  'language.chosen': 'You chose this language on this browser.',
  'language.device': 'This is the language your device asked for. Choose one below to change it.',
  'language.default': 'Your device asked for a language this interface does not have yet, so it is in English.',
  'language.pick': 'Show the interface in',
  'language.deviceOption': 'My device’s language',
  'language.change': 'Change language',
  'language.saved': 'Saved. The interface is now in {language}.',
  'language.coverage': '{percent}% of these interface strings are translated into {language}. Anything not yet translated is shown in English.',
  'language.coverageAll': 'This language is fully translated.',
  'language.browser': 'The choice is kept on this browser, not on your account, so another device will ask its own device which language to use.',
  'language.reviewed': 'A first-language speaker has read this translation.',
  'language.unreviewed':
    'No first-language speaker has read this translation yet. It was written by the people who built the platform — if a word looks wrong to you, that is a mistake we owe you.',
  'language.notTranslated':
    'Interface translation only. Course titles, lessons, teacher pages and the published policies appear in the language they were written in.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
