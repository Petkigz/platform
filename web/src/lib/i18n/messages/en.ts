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
  // The shelf. A catalogue that says "Find a course" in Yoruba and
  // "Showing 25-48 of 137" in English has translated the decoration and left
  // the sentence that tells you where you are.
  'catalogue.title': 'Find a course',
  'catalogue.lede':
    'Every course is reviewed before publication. Browse by subject, or search for a course, a subject or a teacher.',
  'catalogue.doorChild': 'Learning is for a child',
  'catalogue.doorAdult': 'Learning is for me',
  'catalogue.searchPlaceholder': 'Search courses, subjects, teachers…',
  'catalogue.searchPlaceholderLessons': 'Search courses, lessons, subjects, teachers…',
  'catalogue.searchLabel': 'Search courses',
  'catalogue.searchLabelLessons': 'Search courses and lessons',
  'catalogue.audience': 'Audience',
  'catalogue.search': 'Search',
  'catalogue.allSubjects': 'All subjects',
  'catalogue.anyLanguage': 'Any language',
  'catalogue.languageRow': 'Language the course is taught in',
  'catalogue.pages': 'Pages',
  'catalogue.previous': 'Previous',
  'catalogue.next': 'Next',
  'catalogue.pageOf': 'Page {page} of {pages}',
  'catalogue.emptyPage': 'There is nothing on this page. It may be past the end of the shelf.',
  'catalogue.emptyQuery':
    'Nothing matched “{query}”. Try a subject, a teacher’s name, or a word from a lesson.',
  'catalogue.emptyQueryLessons': 'No course matched “{query}”, but the lessons below did.',
  'catalogue.emptyShelf':
    'No courses yet. Once a teacher publishes one it will appear here — nothing is shown until it has passed review.',
  'catalogue.countOne': '{count} course',
  'catalogue.countOther': '{count} courses',
  'catalogue.showing': 'Showing {from}–{to} of {total}',

  'audience.child': 'Young learners',
  'audience.adult': 'Adults',
  'audience.both': 'All ages',

  'difficulty.beginner': 'Beginner',
  'difficulty.intermediate': 'Intermediate',
  'difficulty.advanced': 'Advanced',

  'price.free': 'Free',
  'price.included': 'Included in your access',
  'price.notOneOff': 'Not sold as a one-off course',
  'price.ambiguous': 'Price needs a correct currency',
  'price.notAvailable': 'Not available in your country yet',

  'card.sectionsOne': '{count} section',
  'card.sectionsOther': '{count} sections',
  'card.lessonsOne': '{count} lesson',
  'card.lessonsOther': '{count} lessons',
  'card.minutes': '{count} min',
  'card.hours': '{count} hr',
  'card.hoursMinutes': '{hours}h {minutes}m',

  // Sign-in and sign-up. The two screens a person meets before they have any
  // reason to trust the site, so they are the first forms translated rather than
  // the last.
  'auth.signInTitle': 'Sign in',
  'auth.signUpTitle': 'Create an account',
  'auth.signInLede': 'Welcome back.',
  'auth.signUpLede':
    'For an adult. Children learn under a family account, not their own login.',
  'auth.email': 'Email',
  'auth.password': 'Password',
  'auth.mobile': 'Mobile number',
  'auth.countryCode': 'Country code',
  'auth.otpCode': 'Text message code',
  'auth.tabPassword': 'Email and password',
  'auth.tabPhone': 'Phone code',
  'auth.google': 'Continue with Google',
  'auth.sendCode': 'Send code',
  'auth.verifyCode': 'Verify code',
  'auth.resendCode': 'Resend code',
  'auth.changeNumber': 'Change number',
  'auth.forgot': 'Forgot password?',
  'auth.noAccount': 'Create an account',
  'auth.haveAccount': 'Already have an account?',
  'auth.working': 'Working…',
  'auth.invalidPhone':
    'That does not look like a valid phone number. Include the country code.',
  'auth.somethingWrong': 'Something went wrong.',
  'auth.orGoogle': 'or use one of these',
  'auth.orCreate': 'or create an account with an email or a phone number',
  'auth.phoneAs': 'Will be stored as {phone}',
  'auth.international': 'Already in international format.',
  'auth.passwordNote': 'We never store it. Supabase Auth holds the credential.',
  'auth.codeSent': 'If an account exists for {phone}, a code is on its way.',
  'auth.codeResent': 'A new code has been sent to {phone}.',
  'auth.checkEmail': 'Account created. Check your email to confirm the address, then sign in.',
  'auth.accountCreated': 'Account created for {phone}.',

  // The two doors off the catalogue. They share the shelf's cards and pager, so
  // translating the shelf and not the doors would leave one English heading on
  // a page otherwise in Yoruba.
  'doors.askAdult': 'Looking for yourself?',
  'doors.askChild': 'Choosing for a child?',
  'doors.adultsShelf': 'The adults’ shelf',
  'doors.youngShelf': 'The young learners’ shelf',
  'doors.wholeCatalogue': 'Whole catalogue',
  'young.eyebrow': 'Young learners',
  'young.title': 'For the children first.',
  'young.lede':
    'Courses written to be taught to children — recitation, the Arabic alphabet, the stories they should hear first. Every one of them has passed scholarly review before it appears here.',
  'young.notice':
    'A child does not sign up on their own. A parent or guardian holds the account, adds the child as a learner, and decides what opens; a teacher may enrol them on their own account. Nothing on this page is a child’s account, and none of it is a child’s data.',
  'young.everyAge': 'Every age',
  'young.emptyBand': 'Nothing is listed for ages {band} yet. Try another age, or the whole catalogue.',
  'young.empty':
    'No courses for young learners have been published yet. Everything here has to pass review first.',
  'adults.eyebrow': 'Adults',
  'adults.title': 'Study it properly.',
  'adults.lede':
    'Courses written for adults — Arabic grammar, fiqh, tafsir, tajweed at depth. Every one of them has passed scholarly review before it appears here, and each one you buy is your own: one purchase, one learner.',
  'adults.notice':
    'This is your own account, not a child’s. If a child also learns in your family, the learner switcher moves between you without mixing the two.',
  'adults.empty':
    'No courses for adults have been published yet. Everything here has to pass review first.',

  // The two password screens. Our own sentences only: what Supabase Auth says
  // about a password comes back in its own words and is shown as it arrives.
  'auth.forgotTitle': 'Reset your password',
  'auth.forgotLede':
    'Enter the email address on your account. We will send a secure link if it is registered.',
  'auth.sendLink': 'Send reset link',
  'auth.sending': 'Sending…',
  'auth.resetSent':
    'If an account uses that email address, a password reset link is on its way. Check your inbox and spam folder.',
  'auth.resetFailed':
    'We could not send a reset link right now. Check the address and try again later.',
  'auth.backToSignIn': 'Back to sign in',
  'auth.accountSettings': 'Account settings',
  'auth.chooseTitle': 'Choose a new password',
  'auth.chooseLede': 'Set a new password for this account. Your reset link is single-use.',
  'auth.newPassword': 'New password',
  'auth.confirmPassword': 'Confirm new password',
  'auth.noMatch': 'The passwords do not match.',
  'auth.enterPassword': 'Enter your new password.',
  'auth.updatePassword': 'Update password',
  'auth.updating': 'Updating…',
  'auth.offline': 'Could not reach the server. Check your connection and try again.',

  'language.reviewed': 'A first-language speaker has read this translation.',
  'language.unreviewed':
    'No first-language speaker has read this translation yet. It was written by the people who built the platform — if a word looks wrong to you, that is a mistake we owe you.',
  'language.notTranslated':
    'Interface translation only. Course titles, lessons, teacher pages and the published policies appear in the language they were written in.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
