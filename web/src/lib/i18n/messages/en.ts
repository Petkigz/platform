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

  // The front door. It was the last page in English, which was the wrong page to
  // leave: it is the one a stranger reads before deciding whether this is for
  // them, and a platform that greets a reader in Yoruba on the shelf and in
  // English on the way in has told them which of the two it really meant.
  'home.eyebrow': 'Islamic learning, worldwide',
  'home.title': 'Learn your deen, at the pace that suits you.',
  'home.lede':
    'Qur’an, Arabic, Fiqh, Hadith and more — taught by qualified teachers to children and adults, wherever you are.',
  'home.browse': 'Browse the catalogue',
  'home.createAccount': 'Create a free account',
  'home.continue': 'Continue learning',
  'home.paths': 'Explore learning paths',
  'home.note':
    'Looking costs nothing. You pay when you enrol, for one named learner, and a child is never asked for an email address.',
  'home.meansEyebrow': 'What that means',
  'home.meansTitle': 'Three things the platform refuses to do',
  'home.assure1Title': 'Reviewed before it is listed',
  'home.assure1Body':
    'Courses come from qualified teachers and are approved by someone authorised for the subject. An author cannot approve their own work, and every publication is recorded.',
  'home.assure2Title': 'A child’s login is made by their guardian',
  'home.assure2Body':
    'A child learns under a parent’s account by default, and only gets a sign-in of their own if the parent makes it — a username they choose and a password they set, with no email address asked of the child. The parent can remove it again without touching a lesson.',
  'home.assure3Title': 'A certificate that can still be checked',
  'home.assure3Body':
    'Each one carries a number anyone can look up, and it stays verifiable even if the course is later withdrawn.',
  'home.studyTitle': 'What you can study',
  'home.studyCountOne': '{count} subject, each taught by a teacher reviewed for it.',
  'home.studyCountOther': '{count} subjects, each taught by a teacher reviewed for it.',
  'home.studyEmpty':
    'Subjects appear here as courses are added. The catalogue is always the full list.',
  'home.doorChildBody':
    'Written for young learners, held by a parent or guardian’s account, and given a sign-in of their own only when that adult makes one.',
  'home.doorAdultBody':
    'Study for yourself, at your own level, with certificates you can show to anyone who asks.',
  'home.doorOpen': 'Look at what is there',
  'home.doorCatalogue': 'See them in the catalogue',
  'home.howTitle': 'How it works',
  'home.step': 'Step {number}',
  'home.step1Title': 'Choose who is learning',
  'home.step1Body':
    'Yourself, or a child you are responsible for. A course is bought for one named learner, so a family buying together still knows whose progress is whose.',
  'home.step2Title': 'Study at your own pace',
  'home.step2Body':
    'Lessons, practice questions that check an answer without marking it, and a place that remembers where you stopped on every lesson you have opened.',
  'home.step3Title': 'Keep something afterwards',
  'home.step3Body':
    'Progress, a receipt that is never rewritten, and a certificate whose number can be checked years later.',
  'home.aboutLink': 'How a course gets here, and what happens to a child’s data',
  'home.teachEyebrow': 'For teachers',
  'home.teachTitle': 'Bring your students with you.',
  'home.teachBody1':
    'If you already teach, the platform is the part you should not have to build: sections and lessons, review by someone who knows the subject, prices set with staff, and what you have earned shown per currency on one page.',
  'home.teachBody2':
    'Teachers keep half of every sale. Teaching here is by appointment — the owner adds teachers one at a time — and no provider moves money yet, so the earnings page says what is owed rather than claiming it has been sent.',
  'home.teachArea': 'The teaching area',
  'home.teachReview': 'How courses are reviewed',
  'home.closingTitle': 'Start with the catalogue.',
  'home.closingSignedOut':
    'Every published course is listed with what it contains and who teaches it. Create an account when you find one you want to keep.',
  'home.closingSignedIn':
    'Every published course is listed with what it contains and who teaches it. Your enrolments, progress and certificates are in one place.',

  // The companion tools: prayer times, the Hijri date and the private counter.
  // These three screens sit behind the `companion.*` flags, and they were the
  // last surfaces on the site written in English — the wrong place to leave
  // them, because a reader who chose their language for the shelf should not
  // meet English when they open the tool they actually came for. The prayer
  // names (Fajr, Dhuhr) and the calculation method names are proper names and
  // stay as they are, the way a brand does.
  'companion.eyebrow': 'Companion',
  'companion.backToLearning': 'Back to my learning',
  'companion.prayerTitle': 'Calculated prayer times',
  'companion.prayerOff': 'Calculated prayer times are not switched on.',
  'companion.hijriTitle': 'Calculated Hijri date',
  'companion.hijriOff': 'The calculated date display is not switched on.',
  'companion.counterTitle': 'Private counter',
  'companion.counterOff': 'The private counter is not switched on.',
  'companion.counterLede': 'A simple tool for keeping a count while this page is open.',
  'companion.counterPrivacy':
    'Your count is not saved or sent to AyahSpring. Reloading clears it. Your browser may temporarily restore the page if you navigate back. It does not sync across devices or accounts.',
  'companion.cardPrayerBody': 'Estimate times on your device and check them with your local community.',
  'companion.cardPrayerLink': 'Open prayer times',
  'companion.cardHijriBody': 'See a labelled Umm al-Qura civil date; local announcements may differ.',
  'companion.cardHijriLink': 'Open the date display',
  'companion.cardCounterBody': 'Keep a count on this page without saving it to your account.',
  'companion.cardCounterLink': 'Open the counter',

  'companion.prayerHeading': "Today's estimated times",
  'companion.prayerLede':
    'Calculations may differ from your mosque or local authority. Confirm prayer times and calculation choices with your community, especially at high latitudes. Sunrise is shown for reference; it is not a prayer.',
  'companion.prayerPrivacy':
    'Location is used on this device and is not saved or sent to AyahSpring. Your browser or operating system may use a location provider. Reloading clears the entries; browser back navigation may restore them.',
  'companion.prayerLocating': 'Finding location…',
  'companion.prayerUseLocation': 'Use device location',
  'companion.prayerLatitude': 'Latitude',
  'companion.prayerLongitude': 'Longitude',
  'companion.prayerMethodIntro':
    'Choose a method used by your community. The calculation library suggests the Moonsighting Committee method for North America and the UK, but this is not a local-authority ruling.',
  'companion.prayerExample':
    'Your device is set to {zone}. If your location is in {place}, you could consider {method}; check your mosque or local authority first. A time zone does not identify your location, and other methods may be used there.',
  'companion.prayerUseMethod': 'Use this method',
  'companion.prayerMethodLabel': 'Calculation method',
  'companion.prayerMethodChoose': 'Choose a method',
  'companion.prayerSingaporeBefore':
    'This calculation is not the official Singapore timetable and can differ by minutes. For Singapore, check the',
  'companion.prayerSingaporeLink': 'MUIS prayer timetable',
  'companion.prayerSingaporeAfter': 'especially around the start or end of a prayer time.',
  'companion.prayerAsrLabel': 'Asr calculation',
  'companion.prayerAsrChoose': 'Choose an Asr method',
  'companion.prayerAsrStandard': 'Standard (earlier)',
  'companion.prayerAsrHanafi': 'Hanafi (later)',
  'companion.prayerAsrNote':
    'Standard uses a shadow factor of one; Hanafi uses a factor of two, in addition to the noon shadow. Ask your community if you are unsure.',
  'companion.prayerMoonsightingNote':
    'This method uses its own seasonal adjustments and a one-seventh approximation at northern latitudes of 55° or above; no separate night rule is needed.',
  'companion.prayerNightLabel': 'High-latitude night rule',
  'companion.prayerNightChoose': 'Choose a night rule',
  'companion.prayerNightMiddle': 'Middle of the night',
  'companion.prayerNightSeventh': 'One seventh of the night',
  'companion.prayerNightAngle': 'Twilight angle',
  'companion.prayerNightNote':
    'These rules divide the night to limit Fajr and Isha: one half, one seventh, or a portion based on the twilight angle. They can apply even outside polar regions. Ask your community which rule it follows.',
  'companion.prayerNoPolar':
    'No polar fallback is applied. If a complete set of times cannot be calculated, consult your local mosque or authority.',
  'companion.prayerZone': 'Your device time zone is {zone}. It must match the coordinates, including daylight saving.',
  'companion.prayerZoneUnavailable': 'unavailable',
  'companion.prayerZoneConfirm': 'My device time zone matches this location.',
  'companion.prayerCalculate': 'Calculate today',
  'companion.prayerTimesFor': 'Times for {date}',
  'companion.prayerSummary': '{zone} · {method} · Asr: {asr} · Night rule: {night}',
  'companion.prayerSummaryMoonsighting': 'Moonsighting Committee seasonal rule',
  'companion.prayerResultNote':
    'Times do not recalculate automatically. Check the date and recalculate after a location or time-zone change. An old display is cleared when a date or zone change is detected.',
  'companion.prayerMsgZoneChanged':
    'The device time zone changed. Check your location, method and time zone before calculating.',
  'companion.prayerMsgDateChanged': 'The date changed. Check your settings and calculate again.',
  'companion.prayerMsgNoGeo': 'Location is not available in this browser. You can enter coordinates manually.',
  'companion.prayerMsgLocationReceived':
    'Location received. Estimated accuracy: {accuracy} metres. Check that this location and your device time zone are correct.',
  'companion.prayerMsgLocationDenied':
    'Location was unavailable or permission was denied. You can enter coordinates manually.',
  'companion.prayerMsgIncomplete':
    'Enter coordinates, choose the calculation settings and confirm your device time zone.',
  'companion.prayerMsgRange': 'Enter a latitude between −90 and 90 and a longitude between −180 and 180.',
  'companion.prayerMsgZoneUnknown': 'Your device time zone could not be identified.',
  'companion.prayerMsgZoneChangedAgain': 'Your device time zone changed. Check it and confirm again.',
  'companion.prayerMsgCannotCalculate':
    'A complete, consistent set of times could not be calculated for this location and date. At high latitudes normal solar events can be unavailable or fall in an unexpected order. Check the location and time zone and follow a timetable from your local mosque or authority. No polar approximation has been applied.',

  'companion.hijriHeading': 'Umm al-Qura civil calendar',
  'companion.hijriLede':
    "This is a calculated civil date, not a moon-sighting announcement. Local religious dates may differ; check your community's announcements for Ramadan, Eid and other observances.",
  'companion.hijriClock':
    "The date uses your device's clock and time zone and changes at midnight, not sunset. Browser calendar data may vary. Refresh to update the date.",
  'companion.hijriLoading': 'Loading date…',
  'companion.hijriUnsupported': 'This browser cannot display this calendar.',
  'companion.hijriDeviceDate': 'Device civil date: {date}',
  'companion.hijriRefresh': 'Refresh date',

  'companion.counterHeading': 'Your count',
  'companion.counterToolLede': 'Use this for a count of your choice. There is no required target.',
  'companion.counterCurrent': 'Current count',
  'companion.counterOne': 'Count one',
  'companion.counterUndo': 'Undo one',
  'companion.counterReset': 'Reset',
  'companion.counterConfirmLabel': 'Confirm reset',
  'companion.counterConfirmQuestion': 'Reset this count to zero?',
  'companion.counterYes': 'Yes, reset',
  'companion.counterKeep': 'Keep count',
  'companion.counterLimit': 'The counter has reached its limit.',

  'language.reviewed': 'A first-language speaker has read this translation.',
  // Between "nobody has read this" and "somebody has". A part read is a real
  // fact and it is not the whole claim, so it gets its own sentence rather than
  // being rounded to either neighbour.
  'language.partial':
    'First-language speakers have read {read} of the {total} parts of this translation.',
  'language.unreviewed':
    'No first-language speaker has read this translation yet. It was written by the people who built the platform — if a word looks wrong to you, that is a mistake we owe you.',
  'language.notTranslated':
    'Interface translation only. Course titles, lessons, teacher pages and the published policies appear in the language they were written in.',

  // The learner dashboard. Written in twenty-seven languages (`learn.ts`); the
  // rest read these in English until a speaker has written theirs.
  'learn.greeting': 'Assalamu alaikum, {name}',
  'learn.yourCourses': 'Your courses',
  'learn.signedInAs': 'Signed in as {identity}.',
  'learn.shortcuts': 'Learning shortcuts',
  'learn.account': 'Account settings',
  'learn.saved': 'Saved courses',
  'learn.savedCount': 'Saved courses ({count})',
  'learn.onDevice': 'On this device',
  'learn.ask': 'Ask about a lesson',
  'learn.errorEnrolments': 'Could not load enrolments.',
  'learn.errorProfile': 'Could not load your profile.',
  'learn.empty': 'No enrolments yet.',
  'learn.me': 'Me',
  'learn.someoneElse': 'Someone else',
  'learn.untitled': 'Untitled course',
  'learn.statusActive': 'In progress',
  'learn.statusCompleted': 'Completed',
  'learn.statusWithdrawn': 'Withdrawn',
  'learn.statusSuspended': 'Suspended',
  'learn.statusExpired': 'Expired',
  'learn.progressLabel': '{course} progress',
  'learn.lessonsDone': '{done} of {total} lessons · {percent}%',
  'learn.start': 'Start course',
  'learn.continue': 'Continue',
  'learn.carryResume': 'Carry on where you stopped',
  'learn.carryStart': 'Start the course',
  'learn.carryNext': 'Next up',
  'learn.carryContinue': 'Continue lesson {number}',
  'learn.carryOpen': 'Open lesson {number}',
  'learn.carryMeta': 'Lesson {index} of {total}',
  // The prompt shown on the dashboard to an account with no learner profile.
  'learn.needProfile': 'Enrolling needs a learner profile, and this account does not have one yet.',
  'learn.claimNote': 'A course is always for a named learner. This makes you one on this account.',
  'learn.claim': 'Learn on this account',
  'learn.claimBusy': 'Setting up…',
  'learn.claimDone': 'You are ready',
  'learn.claimReady': 'You can now enrol in a course, buy one, or share your own progress.',
  'learn.claimFailed': 'Your learner profile could not be set up.',

  // The course page. Written in the same twenty-seven languages (`course.ts`).
  'course.fallbackTitle': 'Course',
  'course.version': 'Version {number} · {language}',
  'course.progressOff':
    'Progress tracking is not enabled yet. You can still read the course and play its lessons; nothing is being recorded.',
  'course.progressLabel': 'Course progress',
  'course.lessonsComplete': '{done} of {total} lessons complete · {percent}%',
  'course.completeHeading': 'Course complete.',
  'course.completeBody': 'Certificates are issued by the platform once your completion has been reviewed.',
  'course.stillToDo': 'Still to do:',
  'course.noOutline': 'This course has no published outline yet.',
  'course.preview': 'Preview',
  'course.markComplete': 'Mark complete',
  'course.undo': 'Undo',
  'course.saving': 'Saving…',
  'course.unconfirmed':
    'Could not confirm whether progress was saved. Reload this page to check before trying again.',
  'course.reload': 'Reload page',
  'course.back': 'Back to my learning',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
