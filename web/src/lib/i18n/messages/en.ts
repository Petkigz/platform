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
  'language.coverageAll':
    'Every screen prepared for translation so far is written in this language. Some screens have not been prepared yet and are in English for everyone.',
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
  // The dated classes a learner is in for this enrolment.
  'course.cohortHeading': 'Dated classes for this enrolment',
  'course.cohortPaused': 'Joining classes is paused. You can still leave a class you already joined.',
  'course.cohortStatusDraft': 'Not open yet',
  'course.cohortStatusOpen': 'Open',
  'course.cohortStatusClosed': 'Closed',
  'course.cohortStatusCancelled': 'Cancelled',
  'course.cohortStarts': 'Starts {date}',
  'course.cohortEnds': 'Ends {date}',
  'course.cohortLeave': 'Leave class',
  'course.cohortLeaving': 'Leaving…',
  'course.cohortLeft': 'You have left the class.',
  'course.cohortLeaveFailed':
    'Leaving the class could not be confirmed. Reload the page to see whether you are still in it.',

  // The lesson page's own frame. Same twenty-seven languages (`lesson.ts`).
  'lesson.crumbs': 'Breadcrumb',
  'lesson.previewLesson': 'Preview lesson',
  'lesson.completed': 'Completed',
  'lesson.notStarted': 'Not started',
  'lesson.transcript': 'Transcript',
  'lesson.materials': 'Materials',
  'lesson.noMaterials': 'No materials have been attached to this lesson yet.',
  'lesson.noAccess': 'You do not have access to this lesson’s materials. Enrol in {course} to open them.',
  'lesson.noAccessUntitled': 'You do not have access to this lesson’s materials. Enrol in the course to open them.',
  'lesson.typeVideo': 'Video',
  'lesson.typeAudio': 'Audio',
  'lesson.typeDocument': 'Document',
  'lesson.typeWorksheet': 'Worksheet',
  'lesson.typeLink': 'Link',
  'lesson.typeQuiz': 'Quiz',
  'lesson.typeOther': 'Resource',
  'lesson.backToCourse': 'Back to course',
  'lesson.markedComplete': 'Marked complete.',
  'lesson.navLabel': 'Lesson navigation',
  'lesson.contents': 'Course contents',
  'lesson.discussion': 'Discussion',
  'lesson.discussionClosed': 'Discussion is not open on this lesson.',
  // The open discussion (the switch `learning.discussion` is off, so what
  // ships is the closed card above). `{name}` is a person's own name, or
  // `lesson.discussionSomeone`. The too-long sentence and "Sending…" are the
  // report form's (`lesson.reportTooLong`, `lesson.reportSending`).
  'lesson.discussionIntro':
    'Ask about this lesson, or answer someone else. Learner questions and replies are reviewed before they appear. Course author and staff posts appear immediately.',
  'lesson.discussionEmpty': 'No questions yet.',
  'lesson.discussionEmptyAsk': 'No questions yet. Ask the first one.',
  'lesson.discussionTeacher': 'teacher',
  'lesson.discussionSomeone': 'Someone',
  'lesson.discussionAwaiting': 'Awaiting review',
  'lesson.discussionWithdrawn': 'Not shown after review',
  'lesson.discussionReply': 'Reply',
  'lesson.discussionReportPost': 'Report this post',
  'lesson.discussionReportReply': 'Report this reply',
  'lesson.discussionReplyTo': 'Reply to {name}',
  'lesson.discussionSend': 'Send',
  'lesson.discussionAsk': 'Ask a question',
  'lesson.discussionAskPlaceholder': 'Ask a question about this lesson',
  'lesson.discussionCancelReply': 'Cancel reply',
  'lesson.discussionHeld': 'Sent. It will appear once a person has reviewed it.',
  'lesson.discussionPosted': 'Posted.',
  'lesson.discussionWriteFirst': 'Write something first.',
  'lesson.discussionClosedNow': 'Discussion is not open on this lesson right now.',
  'lesson.discussionReplyGone': 'That question is no longer open for replies.',
  'lesson.discussionSignIn': 'Sign in to join the discussion.',
  'lesson.discussionRefused': 'That could not be posted. Reload the page and try again.',
  'lesson.discussionUncertain':
    'We could not confirm that this was posted. Reload the page to check before sending it again.',
  'lesson.reportOpen': 'Report a problem',
  'lesson.reportIntro': 'A person reviews every report. Please say what is wrong, not only that you disagree.',
  'lesson.reportKind': 'What kind of problem?',
  'lesson.reportKindDoctrinal': 'Doctrinal error',
  'lesson.reportKindTranslation': 'Translation or wording error',
  'lesson.reportKindInappropriate': 'Inappropriate content',
  'lesson.reportKindMisattribution': 'Misattribution',
  'lesson.reportKindCopyright': 'Copyright',
  'lesson.reportKindTechnical': 'Technical fault',
  'lesson.reportKindOther': 'Something else',
  'lesson.reportWhat': 'What is wrong?',
  'lesson.reportPlaceholder': 'Quote the part you mean, if you can',
  'lesson.reportSend': 'Send report',
  'lesson.reportSending': 'Sending…',
  'lesson.reportCancel': 'Cancel',
  'lesson.reportSent': 'Sent. A person will look at it.',
  'lesson.reportTooLong': 'Please keep it under {max} characters.',
  'lesson.reportNotVisible': 'You cannot report something you cannot see.',
  'lesson.reportDuplicate': 'You already have an open report of this kind here. It has not been ignored.',
  'lesson.reportRefused': 'That report could not be accepted. Reload the page and try again.',
  'lesson.reportUncertain': 'We could not confirm that your report was sent. Please send it again.',

  // What is said in place of a recording that cannot be played, and above the
  // materials when a lesson has one. Two situations that ask opposite things
  // of the learner: wait, or tell somebody. None of them gives a time, blames
  // the reader, or names the machinery. `lib/playback-standing.ts` chooses.
  'lesson.recPreparingHead': 'Not ready yet',
  'lesson.recPreparing':
    'The recording for this lesson is still being prepared, so there is nothing to play yet. You can read the rest of the lesson and come back to this.',
  'lesson.recUnavailableHead': 'Not available',
  'lesson.recUnavailable':
    'This recording cannot be played at the moment, and waiting will not fix it — somebody has to look at it. If you need it for this lesson, tell us and it becomes a person’s job rather than yours.',
  'lesson.recSummaryOne': 'One recording cannot be played',
  'lesson.recSummarySome': 'Some recordings cannot be played',
  'lesson.recSummaryBroken':
    'This is not something waiting will fix — somebody has to look at it. The rest of the lesson is below, and telling us turns it into a person’s job rather than yours.',
  'lesson.recSummaryPreparingHead': 'Some of this is still being prepared',
  'lesson.recSummaryPreparing':
    'The parts that are ready are below. Anything not ready yet will not appear by refreshing, so there is no need to keep trying; read what is here and come back to the rest.',
  // The link that opens the report form on "technical fault".
  'lesson.recTell': 'Tell us about this recording',

  // The questions at the foot of a lesson that are not the quiz: nothing is
  // recorded and no attempt is used. Its other words are the quiz's own
  // (`assess.untitledQuestion`, `assess.yourAnswer`, `assess.true`,
  // `assess.false`). A check that fails says so in one sentence; it is safe to
  // say "try again" because checking writes nothing.
  'lesson.practiceHeading': 'Check yourself',
  'lesson.practiceIntro':
    'These are not marked and do not count as an attempt. Answering them changes nothing except what you know — the quiz, if this course has one, is a separate sitting.',
  'lesson.practiceCheck': 'Check',
  'lesson.practiceChecking': 'Checking…',
  'lesson.practiceRight': 'That’s right.',
  'lesson.practiceWrong': 'Not quite.',
  'lesson.practiceRetry': 'Try again, or read that part of the lesson once more.',
  'lesson.practiceFailed': 'That could not be checked. Try again.',

  // A learner's own note on a lesson, and the bookmark. Saving twice leaves
  // one note and one bookmark, so "try again" is safe here too. The busy word
  // on the button is `course.saving`.
  'lesson.studyLabel': 'Your private study tools',
  'lesson.studyHeading': 'Your study tools',
  'lesson.studyBookmark': 'Bookmark lesson',
  'lesson.studyUnbookmark': 'Remove bookmark',
  'lesson.studyNoteLabel': 'Private lesson note',
  'lesson.studyPlaceholder': 'Save a thought or reminder for yourself…',
  'lesson.studySave': 'Save note',
  'lesson.studyClear': 'Clear note',
  'lesson.studySaved': 'Note saved privately.',
  'lesson.studyCleared': 'Note removed.',
  'lesson.studyBookmarked': 'Lesson bookmarked.',
  'lesson.studyUnbookmarked': 'Bookmark removed.',
  'lesson.studyPrivate': 'Notes and bookmarks are private to your account.',
  'lesson.studyFailed': 'We could not confirm that change. Try again.',
  'lesson.studySignIn': 'Sign in again to save notes and bookmarks.',

  // The card that lists what a lesson rests on. `{place}` is where in the
  // lesson a source is used, as the teacher wrote it, and comes last. The ten
  // kinds are the ones the database accepts (`SOURCE_TYPES`); a source's
  // title, author, edition and reference are the teacher's and not translated.
  'lesson.sourcesHeading': 'Sources and references',
  'lesson.sourcesNone': 'No references are listed for this lesson yet.',
  'lesson.sourcesUsedAt': 'Used at: {place}',
  'lesson.sourcesOpen': 'Open the source',
  'lesson.sourceQuran': 'Qur’an',
  'lesson.sourceHadith': 'Hadith',
  'lesson.sourceTafsir': 'Tafsir',
  'lesson.sourceFiqh': 'Fiqh reference',
  'lesson.sourceBook': 'Book',
  'lesson.sourceArticle': 'Article',
  'lesson.sourceLecture': 'Lecture',
  'lesson.sourceFatwa': 'Fatwa',
  'lesson.sourceManuscript': 'Manuscript',
  'lesson.sourceOther': 'Other',

  // Taking an assessment: the page and the quiz on it. Same twenty-seven
  // languages (`assess.ts`). No sentence here types a number or a percent
  // sign; `{count}`, `{earned}`, `{possible}`, `{number}`, `{answered}`,
  // `{total}` and `{percent}` arrive already written the reader's way.
  'assess.label': 'Assessment',
  'assess.typePractice': 'Practice',
  'assess.typeGraded': 'Graded',
  'assess.typeFinal': 'Final assessment',
  'assess.passAt': 'Pass mark: {percent}',
  'assess.attemptsOne': '{count} attempt allowed',
  'assess.attemptsOther': '{count} attempts allowed',
  'assess.noQuestions': 'This assessment has no questions yet.',
  'assess.attemptN': 'Attempt {number}',
  'assess.savesAsYouGo': 'Your answers are saved as you go.',
  'assess.limitReached':
    'You have used all your attempts for this assessment. Ask your teacher if you need another.',
  'assess.cannotStart': 'This assessment could not be opened just now. Reload the page to try again.',
  'assess.startAnother': 'Start another attempt',
  'assess.startUsesAttempt': 'Starting uses one of your attempts.',
  'assess.awaitingMarking': 'Waiting for your teacher to mark it.',
  'assess.markedAttempts': 'Your marked attempts',
  'assess.score': 'Score: {earned} of {possible}',
  'assess.passed': 'Passed',
  'assess.notPassed': 'Not passed',
  'assess.markedNoComment': 'Marked, with no comment.',
  'assess.back': 'Back to the course',
  'assess.untitledQuestion': 'Untitled question',
  'assess.pointsOne': '{count} point',
  'assess.pointsOther': '{count} points',
  'assess.yourAnswer': 'Your answer',
  'assess.saved': 'Saved',
  'assess.true': 'True',
  'assess.false': 'False',
  'assess.answered': '{answered} of {total} answered',
  'assess.submit': 'Submit',
  'assess.submitting': 'Submitting…',
  'assess.submitted': 'Submitted.',
  'assess.submittedManual': 'Submitted. Some answers need a teacher to mark them.',
  'assess.saveFailed': 'That answer could not be saved. Check your connection and answer again.',
  'assess.submitFailed': 'Your answers could not be submitted. Check your connection and try again.',
  'assess.alreadySubmitted': 'This attempt has already been submitted.',
  'assess.unanswered': 'Answer every question before you submit.',
  // The assessment list on the course page.
  'assess.heading': 'Assessments',
  'assess.practise': 'Practise',
  'assess.take': 'Take',

  // The assignment page: a written answer, handed in, marked and revised.
  // The files part of that page (uploads) is further down, as `assign.file*`.
  // Five sentences are the quiz's and are not said twice: `assess.back`,
  // `assess.pointsOne`, `assess.pointsOther`, `assess.score`, `assess.submitting`.
  'assign.label': 'Assignment',
  'assign.selfPaced': 'Self-paced',
  'assign.cohortWork': 'Class work',
  'assign.lateAccepted': 'Late work accepted',
  'assign.yourWork': 'Your work',
  'assign.version': 'Version {number}',
  'assign.due': 'Due: {date}',
  'assign.dueLateOk': 'Late work is accepted.',
  'assign.deadlinePassed': 'The deadline has passed and late work is not accepted.',
  'assign.submittedResponse': 'Your submitted response',
  'assign.marked': 'Marked',
  'assign.score': 'Score: {earned}',
  'assign.waiting': 'Submitted and waiting for marking.',
  'assign.written': 'Written response',
  'assign.placeholder': 'Write your answer here…',
  'assign.draftSaved': 'Draft saved',
  'assign.saveDraft': 'Save draft',
  'assign.saving': 'Saving…',
  'assign.submit': 'Submit assignment',
  'assign.submitRevision': 'Submit revision',
  'assign.revise': 'Revise this work',
  'assign.working': 'Working…',
  'assign.reviseExplain':
    'Revising clears this mark so you can hand the work in again. The version you were marked on is kept below.',
  'assign.revisionsLeftOne': 'You have {count} revision left.',
  'assign.revisionsLeftOther': 'You have {count} revisions left.',
  'assign.blockedClosed': 'This assignment is closed.',
  'assign.blockedDeadline': 'The deadline has passed, so this mark stands.',
  'assign.blockedOnce': 'This work is marked once; the teacher has not allowed revisions.',
  'assign.blockedLimit': 'This was the last version this task allows.',
  'assign.earlierOne': 'Earlier version',
  'assign.earlierOther': 'Earlier versions',
  'assign.markedOn': 'Marked: {date}',
  'assign.late': 'Late',
  'assign.closedDraft': 'This assignment is closed; a saved draft can no longer be submitted.',
  'assign.msgDraftSaved': 'Draft saved privately.',
  'assign.msgSubmitted': 'Submitted. Your work is now with your teacher for marking.',
  'assign.msgSubmittedVersion': 'Version {number} submitted. Your work is with your teacher for marking.',
  'assign.msgReopened':
    'Your marked version is saved below. Edit your work and submit it again as version {number}.',
  'assign.errUnconfirmed':
    'The result could not be confirmed. Before trying again, copy any unsaved text somewhere private, reload the page, and check the current work.',
  'assign.errUnavailable': 'Assignments are not available right now.',
  'assign.errSignIn': 'Sign in again to do that.',
  'assign.errNotEnrolled': 'This learner is not enrolled in the course right now.',
  'assign.errNotAllowed': 'You do not have permission to do that.',
  'assign.errNotFound': 'That assignment or submission could not be found.',
  'assign.errDeadline': 'The deadline has passed.',
  'assign.errAlreadySubmitted': 'This work has already been submitted.',
  'assign.errClosed': 'This assignment is not open.',
  'assign.errEmpty': 'Write an answer or attach a file before submitting.',
  'assign.errFileGone': 'A file on this work is no longer available. Remove it before submitting.',
  'assign.errTooLong': 'Your answer is too long. Shorten it and try again.',
  'assign.errRejected': 'That could not be done.',
  // The assignment list on the course page.
  'assign.heading': 'Assignments',
  'assign.noDeadline': 'No deadline',
  'assign.submittedLate': 'Submitted late',
  'assign.statusDraft': 'Draft, not submitted',
  'assign.statusSubmitted': 'Waiting for marking',
  'assign.notStarted': 'Not started',
  'assign.viewFeedback': 'View feedback',
  'assign.viewSubmission': 'View submission',
  'assign.open': 'Open',
  // The files on a hand-in. Several of these are said when it is not known
  // whether a file arrived or was removed; they say so, and say to check.
  'assign.files': 'Files',
  'assign.fileCountUnknown': 'File count unavailable',
  'assign.filesAttached': 'Attached: {count}',
  'assign.filesNotAttached': 'Not attached: {count}',
  'assign.fileListUnknown':
    'The file list could not be checked. Refresh before relying on it; do not assume there are no files.',
  'assign.fileUnnamed': 'Handed-in file',
  'assign.fileCheckAgain': 'Check upload again',
  'assign.fileResend': 'Resend same file',
  'assign.fileRemove': 'Remove',
  'assign.fileShowing':
    'Showing {shown} of {total}. The list can change between pages; refresh to check again.',
  'assign.fileShowMore': 'Show more files',
  'assign.fileHint': 'A photo of each page, a PDF, or a recording. Up to {size} each.',
  'assign.fileHintRemaining': 'Files you can still add: {count}. The server checks the limit.',
  'assign.filePendingExplain':
    'Pending files do not count as attached. Whoever uploaded a pending file can check whether it arrived. If it did not, they can choose the same file to send it again. Check first, and do not resend while the first transfer is still running.',
  'assign.fileResendLabel': 'Select the same file to resend',
  'assign.fileNone': 'No files were handed in with this work.',
  'assign.filePhaseReading': 'Reading the file…',
  'assign.filePhaseAsking': 'Asking where to put it…',
  'assign.filePhaseSending': 'Sending…',
  'assign.filePhaseChecking': 'Checking it arrived…',
  'assign.filePhaseDone': 'File attached',
  'assign.fileKindImage': 'image',
  'assign.fileKindAudio': 'audio',
  'assign.fileKindOther': 'file',
  'assign.fileStatusPending': 'upload pending; arrival not confirmed',
  'assign.fileStatusHeld': 'held for review',
  'assign.fileStatusUnavailable': 'not available',
  'assign.fileErrNoName': 'That file has no name.',
  'assign.fileErrEmpty': 'That file is empty, so there is nothing to hand in.',
  'assign.fileErrTooBig':
    'That file is {size} and the limit is {limit}. A photo of each page, or a scan, is usually smaller.',
  'assign.fileErrKind':
    'That kind of file cannot be handed in. A PDF, a photo (JPEG, PNG or WebP) or an audio recording works.',
  'assign.fileErrTooMany': 'An assignment takes {count} files, and this one already has that many.',
  'assign.fileErrDraft':
    'The draft could not be confirmed, so this file was not sent. Check the current work before trying again.',
  'assign.fileErrUnreadable':
    'The file could not be read. If it is on a removable drive, copy it first and try again.',
  'assign.fileErrUncertain':
    'The upload could not be confirmed. Refresh and check the file list before trying again; a file may have been registered or attached.',
  'assign.fileErrListAfterAttach':
    'The file was attached, but the list could not be checked. Refresh before relying on it.',
  'assign.fileErrListChanged':
    'The file list changed or could not be checked. Refresh it before relying on it.',
  'assign.fileMsgAttached': 'File attached ({size}). Access remains subject to permissions and review.',
  'assign.fileMsgConfirmed':
    'Storage reported the expected size and the file was attached. Its contents have not been scanned for malware.',
  'assign.fileMsgRemoved': 'Removed from this hand-in. The stored file is not deleted by this action.',
  'assign.fileErrRemove':
    'The removal could not be confirmed. Refresh and check the file list before trying again; it may already have been removed.',
  'assign.fileErrRemoveList':
    'The removal was acknowledged, but the file list could not be checked. Refresh before relying on it.',
  'assign.fileRevisionNote':
    'Files recorded with this version. Opening a file checks your current access; a file may no longer be available.',
  'assign.fileRevisionOpen': 'Try opening file {number}',
  'assign.fileRevisionInvalid': 'File reference {number} is invalid and needs individual review.',
  // Two reasons only the server knows. Both are known refusals: nothing was
  // registered, and sending the same thing again will be refused again.
  'assign.fileErrNotDraft':
    'A file can only be added while this work is a draft and the assignment is open. Refresh the page to see where it stands.',
  'assign.fileErrDifferent':
    'That is not the file that is waiting. Choose the same file again; a different one cannot be sent in its place.',

  // The page for an address with nothing at it (`app/not-found.tsx`). Two
  // people arrive there: one mistyped, one followed a link to a course that
  // has been retired and has made no mistake. `{learn}` is the name of the
  // learning page, a link, taken from the navigation.
  'missing.title': 'Not found',
  'missing.heading': 'That page is not here',
  'missing.lede':
    'Either the address is slightly wrong, or what used to be here has been retired. Courses are retired when a teacher stops teaching them, and a retired course stays readable to the people already enrolled in it through {learn}.',
  'missing.home': 'Home',
  'missing.help': 'Ask for help',
  'missing.fault':
    'If you followed a link from inside AyahSpring and landed here, that is a fault on our side, and we will fix the link.',
  // A link, on its own after the sentence above.
  'missing.tell': 'Tell us where the link was',

  // The page for a page that broke (`app/error.tsx`). Drawn in the browser,
  // so unlike the parts above these are in what every page carries. `{code}`
  // is the server's id for the failure and comes last. The buttons beside
  // "try again" are `nav.catalogue` and `broke.help`.
  'broke.eyebrow': 'Something broke',
  'broke.heading': 'This page stopped working',
  'broke.lede': 'That is a fault on our side, not a mistake you made. Trying again often works.',
  'broke.reference': 'If it keeps happening, quote this reference when you ask for help: {code}',
  'broke.retry': 'Try this page again',
  'broke.help': 'Ask for help',
  'broke.payHead': 'Check before you pay again.',
  'broke.pay':
    'An order that did not finish is listed on your orders page with its real status. That page is the record, not this one.',
  'broke.orders': 'Your orders',
  'broke.lesson':
    'If you were watching a lesson, it resumes from the place it last saved. Your place is saved about every ten seconds while a recording plays.',

  // The players on the lesson page, with every saved-place and recovery
  // message (`messages/player.ts`). Client components ask for these through
  // a provider the lesson page puts round its players, so no other page
  // carries them. `{at}`, `{from}` and `{to}` are places in a recording
  // ("12:34"); `{when}` is a date and time.
  'player.videoUnsupported': 'Your browser cannot play this video.',
  'player.audioUnsupported': 'Your browser cannot play this audio.',
  'player.openVideo': 'Open the video directly',
  'player.openAudio': 'Open the audio directly',
  'player.speed': 'Speed',
  'player.slower': 'Slower',
  'player.faster': 'Faster',
  'player.loopFrom': 'Repeat from here',
  'player.loopTo': 'to here',
  'player.loopStop': 'Stop repeating',
  'player.loopOpenEnd': 'Repeating from {from} — mark where it ends.',
  'player.loopOpenStart': 'Repeating up to {to} — mark where it starts.',
  'player.loopBackwards': 'That passage ends before it starts. Mark it again.',
  'player.loopBoth': 'Repeating {from} – {to}.',
  'player.resuming': 'Resuming at {at}.',
  'player.checking': 'Checking your saved place…',
  'player.legacyGroup': 'Earlier lesson-wide place',
  'player.legacyPlace':
    'An earlier lesson-wide place is {at}. It might belong to a different recording. You can review it here; it will not replace this recording’s saved place without your choice.',
  'player.limit': 'The player cannot go past 24 hours.',
  'player.legacyReview': 'Review earlier place',
  'player.notNow': 'Not now',
  'player.recoveryToggle': 'Keep a temporary recovery place on this browser',
  'player.recoveryNotice':
    'Optional. Anyone with access to this browser profile may see account, enrolment, lesson and recording identifiers, session identifiers, positions and timestamps, including for other accounts using it. Turning this off removes recovery places for all accounts on this browser. Your account must be confirmed online before a place can be stored. Records expire after seven days and are cleared on a later visit; storage may be unavailable or cleared sooner.',
  'player.earlierGroup': 'Earlier lesson-wide device places',
  'player.earlierIntro':
    'These older device places were saved for the whole lesson, not a specific recording. They may belong to another recording. Review one here or discard it; reviewing does not replace the account place without another choice.',
  'player.earlierReview': 'Review earlier device place',
  'player.earlierReviewLabel': 'Review earlier device place {at} from {when}',
  'player.earlierDiscard': 'Discard earlier place',
  'player.earlierDiscardLabel': 'Discard earlier device place {at} from {when}',
  'player.deviceGroup': 'Device recovery places',
  'player.deviceIntro':
    'A place from this browser may not have reached your account. Review or discard each place before automatic saving continues. Choosing one leaves other places for a later visit.',
  'player.deviceReview': 'Review this place',
  'player.deviceReviewLabel': 'Review device place {at} from {when}',
  'player.deviceDiscard': 'Discard',
  'player.deviceDiscardLabel': 'Discard device place {at} from {when}',
  'player.conflictGroup': 'Choose your saved place',
  'player.conflictIntro': 'The account’s saved place may differ from this player.',
  'player.conflictNone': 'No saved place.',
  'player.conflictSaved': 'Saved place: {at}.',
  'player.conflictLocal': 'This player: {at}. Which should be kept?',
  'player.useSaved': 'Use saved place',
  'player.keepLocal': 'Keep this player’s place',
  'player.storeClearFailed': 'Device storage could not be cleared. Check your browser storage settings.',
  'player.storeSaveFailed': 'Could not save a recovery place on this device.',
  'player.storeUnavailable': 'Recovery storage is unavailable in this browser.',
  'player.storeReadFailed': 'Could not read earlier device places. Check your browser storage settings.',
  'player.earlierClearFailed':
    'Could not clear the earlier device place. Check your browser storage settings.',
  'player.unconfirmed':
    'Could not confirm your saved place. Reload the lesson to check before continuing to save.',
  'player.loadFailed':
    'Could not load your saved place. You can play this lesson, but saving is unavailable until you reload.',
  'player.turnedOff': 'Recovery was turned off or cleared elsewhere in this browser.',
  'player.storeCheckFailed': 'Could not check recovery storage in this browser.',
  'player.legacyBusy': 'Finish the current save or recovery choice before reviewing the old place.',
  'player.legacyWait': 'Wait for the recording to load before reviewing the old place.',
  'player.legacyBeyond': 'The old place is beyond this recording. It may belong to another recording.',
  'player.legacySeekFailed': 'Could not seek to the old place. Try again when the recording is ready.',
  'player.earlierRemoveFailed': 'Could not remove the earlier device place.',
  'player.earlierBusy':
    'Finish the current save or recovery choice before reviewing an earlier device place.',
  'player.earlierWait': 'Wait for the recording to load before reviewing the earlier device place.',
  'player.earlierChanged': 'The earlier device place changed. Review the updated list.',
  'player.earlierBeyond':
    'The earlier device place is beyond this recording. It may belong to another recording.',
  'player.earlierSeekFailed': 'Could not seek to the earlier device place.',
  'player.earlierReadFailed': 'Could not read the earlier device place.',
  'player.needConfirmed':
    'Recovery cannot record a place until your account is confirmed. Reload when connected.',
  'player.storeChangeFailed':
    'Device storage could not be changed or cleared completely. Check your browser storage settings.',
  'player.deviceRemoveFailed': 'Could not remove this recovery place from the device.',
  'player.deviceChanged': 'The device place changed. Review the updated list.',
  'player.othersRemain':
    'Other device recovery places, if any, remain available when you reopen this lesson.',
  'player.deviceUseFailed': 'Could not use this device place. Try again after the media loads.',
  'player.quality': 'Quality',
  'player.qualityStandard': '480p — standard',
  'player.qualitySmall': '360p — small',
  'player.qualityAudio': 'Audio only',
  'player.saving': 'Saving…',
  'player.saveDevice': 'Save on this device',
  'player.onDevice': 'On this device',
  'player.seePlus': 'See what Plus includes',
  'player.plusNote': 'Saving a lesson on a device is part of the Plus plan.',
  'player.tryAgain': 'Try again',
  'player.preparing': 'Preparing the player…',
  'player.linksNote': 'Playback links are short-lived and are tied to your access to this lesson.',
  'player.savedNote':
    'A saved lesson stays inside the app, but currently needs a connection to check access each time you open it.',
  'player.playFailed': 'That lesson could not be played.',
  'player.saveRefused': 'This lesson cannot be saved on this plan.',
  'player.fetchFailed': 'That lesson could not be fetched to save.',
  'player.saveFailed': 'That lesson could not be saved.',
  'player.noCopy': 'This recording has no copy that can be played yet.',

  // The account page and its profile form. Written for the same twenty-seven
  // languages as the dashboard (`account.ts`); the page's title, "Signed in
  // as" and the learner-profile button are the dashboard's own keys.
  'account.lede':
    'Manage how your account appears. Your sign-in address is shown for reference and is not changed here.',
  'account.status': 'Account status: {status}',
  'account.statusActive': 'active',
  'account.statusSuspended': 'suspended',
  'account.statusClosed': 'closed',
  'account.owedHeading': 'Before you carry on',
  'account.owedOne': '{count} document is waiting for your agreement.',
  'account.owedOther': '{count} documents are waiting for your agreement.',
  'account.owedBody':
    'Read and agree, and the time you did is kept against your account. Nothing else on this page is held back meanwhile.',
  'account.owedVersion': '{title} — version {number}',
  'account.selfHeading': 'Learning as yourself',
  'account.selfLearnsAs':
    'This account learns as {name}. Courses you enrol in or buy belong to that learner, and nobody else’s progress is mixed into it.',
  'account.selfInFamily':
    'Your learning is inside a family account, so one family plan can cover you alongside its children. You manage that on the family page.',
  'account.selfOnOwn':
    'Your learning sits on its own. If you run a family account, you can move it in beside the children so one plan covers everybody — same profile, same progress.',
  'account.selfGo': 'Go to my learning',
  'account.selfJoinFamily': 'Learn inside my family',
  'account.selfWhoSees': 'Who can see my progress',
  'account.selfNone':
    'You do not have a learner profile yet. One is needed before you can enrol in a course, buy one, or share your progress — a course is always for a named learner, and this is how you become one.',
  'account.selfFamilyInstead':
    'If you run a family account, you can become a learner there instead, and be part of the family from the start.',
  'account.selfClaimNote':
    'This does not create a second account. It adds you as a learner to this one.',
  'account.formName': 'Display name',
  'account.formLanguage': 'Preferred language code',
  'account.formLanguageNote':
    'This is kept with your profile, and nothing reads it yet. The language of these pages is chosen on the Language page and is kept on this browser.',
  'account.formZone': 'Time zone',
  'account.formSave': 'Save profile',
  'account.formSaved': 'Your profile has been updated.',
  'account.formFailed': 'Your profile could not be saved. Try again.',
  'account.formNameMissing': 'Add the name you want people to see.',
  'account.formNameLong': 'Keep your display name to {count} characters or fewer.',
  'account.formLanguageBad': 'Use a language code such as en or en-GB.',
  'account.formZoneLong': 'Keep the time zone to {count} characters or fewer.',
  'account.formZoneBad': 'Use a valid IANA time zone, such as Africa/Kampala.',
  'account.formSignedOut': 'You are signed out. Sign in again, then save.',
  'account.formNotFound': 'Your profile could not be found. Sign out and back in, then try again.',
  'account.signInHeading': 'How you sign in',
  'account.signInBoth': 'You can sign in with a password or with Google.',
  'account.signInPassword': 'You sign in with your email address and a password.',
  'account.signInGoogle': 'You sign in with Google. There is no password on this account.',
  'account.signInPhone': 'You sign in with a code sent to your phone.',
  'account.signInOther': 'You sign in with: {methods}.',
  'account.signInNone': 'No sign-in method is recorded for this account.',
  'account.signInUnread': 'Your sign-in methods could not be read just now.',
  'account.resetBody':
    'Send a secure password reset link to your sign-in email. The link expires according to your authentication provider’s settings.',
  'account.resetLink': 'Send reset link',
  'account.noPasswordGoogle':
    'There is no password on this account, so there is nothing to reset — keep using Google to sign in.',
  'account.noPasswordPhone':
    'This account signs in with a phone code, so there is no password to reset.',
  'account.mergeHeading': 'Two accounts, one person',
  'account.mergeBody':
    'If you signed up twice, the accounts can be folded together. The one you keep survives; the other is closed, and both have to agree before anything moves.',
  'account.mergeWaiting': 'Someone is asking to merge an account into this one.',
  'account.mergeNone': 'Nothing is waiting on this account.',
  'account.mergeLink': 'Merging accounts',
  'account.mergeLinkWaiting': 'Merging accounts ({count} waiting)',
  'account.sponsorHeading': 'Sponsored seats',
  'account.sponsorBody':
    'A course can be paid for by somebody else. Ask for one if it is out of reach, or pay for a seat that is waiting — the two sides never learn who the other is.',
  'account.sponsorMine': 'What I have asked for and sponsored',
  'account.sponsorWaiting': 'Seats waiting',
  'account.teachHeading': 'Teaching here',
  'account.teachBody':
    'Teaching is by appointment — nobody becomes a teacher by signing up. If you would like to teach, you can send your qualifications and a link to a lesson you have given, and the owner reads it.',
  'account.teachLink': 'Apply to teach',
  'account.inviteHeading': 'Invite a friend',
  'account.inviteBody':
    'A friend who is new here gets a discount on their first course, and you get one on your next once their payment has stayed past the refund window. Both are discounts, not money, so there is nothing to pay out.',
  'account.inviteLink': 'Your invitation code',
  'account.shareHeading': 'Sharing my learning',
  'account.shareBody':
    'Your progress and certificates are private, including to your family. Invite somebody by email and they accept it themselves; you choose what they see and how long it lasts, and you can end it whenever you like.',
  'account.shareLink': 'Who can see my learning',
  'account.readHeading': 'How this reads',
  'account.readBody':
    'Text size, contrast and motion — applied the moment you choose one, for this browser. Nothing here needs saving, and nothing else changes about the page.',
  'account.readLink': 'Reading preferences',
  'account.termsBody': 'The terms, the privacy notice and the terms for teachers, each versioned.',
  'account.termsAgreed': 'The versions you have agreed to are listed with the time you agreed.',
  'account.termsNone': 'Nothing is waiting for your agreement.',
  'account.termsLink': 'Read them',
  'account.instHeading': 'My institution',
  'account.instBody':
    'A madrasah, school or organisation you belong to. If your email address is at a domain one of them has verified, you can join it; once you are in, it sees counts of its people and never your name or what you studied.',
  'account.instLink': 'Where I belong',
  'account.paidHeading': 'What I have paid',
  'account.paidBody':
    'Every payment that has moved on your billing account, and every refund that has come back, with a running total per currency. A refund you have asked for is listed separately until it actually moves, because asking is not receiving.',
  'account.paidLink': 'See what I have paid',
  'account.toldHeading': 'What I am told',
  'account.toldBody':
    'Messages from the platform appear in your notification centre, not in an inbox or a text message — no delivery provider is configured yet.',
  'account.toldUnreadOne': 'You have {count} unread message.',
  'account.toldUnreadOther': 'You have {count} unread messages.',
  'account.toldNone': 'Nothing is waiting for you.',
  'account.toldChoice':
    'You choose which kinds you want, except for notices that money owed to you did not arrive: those always come.',
  'account.toldLinkUnread': 'Notifications ({count} unread)',
  'account.toldPrefs': 'Choose what you are told',
  'account.dataHeading': 'My data',
  'account.dataBody':
    'Download a copy of what we hold about this account as one file: your profile, the learners you are responsible for, what they have studied and finished, your certificates, orders and receipts, your notes, and who you have shared your learning with.',
  'account.dataDownload': 'Download my data',
  'account.dataSheet': 'As a spreadsheet',
  'account.dataPrint': 'Read or print it',
  'account.dataMore':
    'It now carries more than it did: the discussion posts, reviews and marked work, the support cases, the messages sent to you, and — if you teach — your earnings and payouts.',
  'account.dataWhat': 'What is in it, and what is left out',
  'account.dataRestore':
    'Have a file already? Your profile, notes and bookmarks can be put back on the lessons you are enrolled in; enrolments, certificates and orders cannot, and that page says why.',
  'account.dataRestoreLink': 'Put it back',
  'account.closeHeading': 'Closing this account',
  'account.closeBody':
    'Closing changes your profile, removes some personal information and tries to sign you out. Orders, payments, enrolments and certificates are kept, because a refund or a certificate check still needs them, and some other records remain too. The page lists both sides before anything happens.',
  'account.closeLink': 'Close this account',

  // The family page, its forms, and one learner's page. Written for the same
  // twenty-seven languages as the dashboard (`family.ts`). The family link,
  // the learner-profile button, the progress line and "Cancel" are keys that
  // already existed.
  'family.noneTitle': 'No family yet',
  'family.noneLede':
    'A family lets one adult account hold several children. Each child learns under your account — they do not need an email address or a password.',
  'family.noneAlso':
    'A family holds children, and it can hold you as well — the adult who runs it can learn here too, beside them, so one plan covers everybody. Until you have a family you do not need one to learn: your own account is enough.',
  'family.title': 'Children and progress',
  'family.sameCatalogue':
    'The separate young-learner and adult experiences are not enabled yet, so children and adults currently see the same catalogue.',
  'family.handoverBody':
    'When a learner turns eighteen, their record can become their own account, or be deleted.',
  'family.handoverLink': 'A learner has turned eighteen',
  'family.adultsOne': '{count} adult',
  'family.adultsOther': '{count} adults',
  'family.childrenOne': '{count} child',
  'family.childrenOther': '{count} children',
  'family.alsoHere': 'Also learning here: {names}.',
  'family.noChildren': 'No children yet.',
  'family.ages': 'Ages {from}–{to}',
  'family.bandAdult': 'Adult',
  'family.archived': 'Archived',
  'family.notEnrolled': 'Not enrolled in anything yet.',
  'family.progressLabel': '{name}: {course} progress',
  'family.openLearning': 'Open {name}’s learning',
  'family.progressBadges': 'Progress and badges',
  'family.adultsLine': 'Adults: {list}',
  'family.roleOwner': 'Owner',
  'family.roleGuardian': 'Guardian',
  'family.roleBilling': 'Billing',
  'family.unnamed': 'Unnamed',
  'family.member': '{name} ({role})',
  'family.memberInvited': '{name} ({role}, invited)',
  'family.memberRevoked': '{name} ({role}, removed)',
  'family.createHeading': 'Create your family space',
  'family.createBody':
    'Add children under your adult account. They do not need an email address, password or separate sign-in.',
  'family.createName': 'Family name',
  'family.optional': '(optional)',
  'family.createPlaceholder': 'For example, our family',
  'family.creating': 'Creating…',
  'family.create': 'Create family',
  'family.createNameLong': 'Keep the family name to {count} characters or fewer.',
  'family.createRefused': 'Your family could not be created.',
  'family.createUnconfirmed':
    'We could not confirm that your family was created. Reload the page to check before trying again.',
  'family.addOpen': 'Add a child',
  'family.childName': 'Name',
  'family.childPlaceholder': 'What should we call them?',
  'family.bandLabel': 'Age band',
  'family.childNote':
    'No date of birth and no email address. A child learns under your account, not their own.',
  'family.adding': 'Adding…',
  'family.add': 'Add child',
  'family.childNameMissing': 'Add the child’s name.',
  'family.childBandBad': 'Choose an age band.',
  'family.childNotOwner': 'Only the family owner can add a child.',
  'family.childDeclaration': 'Declare that you are {age} or older before adding a child.',
  'family.childRefused': 'That child could not be added.',
  'family.childUnconfirmed':
    'We could not confirm that the child was added. Reload the page to check before adding them again.',
  'family.signedOut': 'You are signed out. Sign in again, then try once more.',
  'family.noFamily': 'That family does not exist.',
  'family.adultHeadIn': 'You learn here too',
  'family.adultHeadInNamed': 'You learn here too — {name}',
  'family.adultHeadAlone': 'Your learning is separate from this family',
  'family.adultHeadOther': 'Your learning is in another family',
  'family.adultHeadNone': 'You are not a learner yet',
  'family.adultWhyIn':
    'Your courses, progress and certificates sit beside the children’s, so one plan can cover everybody.',
  'family.adultWhyAlone':
    'Joining this family moves your existing learning into it — the same profile, the same courses, the same progress. Nothing is copied and nothing is lost.',
  'family.adultWhyOther':
    'A learner profile belongs to one family at a time. To learn here, take your learning out of the other family first; it keeps its progress either way.',
  'family.adultWhyNone':
    'Adding yourself makes this account a learner inside this family. You keep your own progress, and other adults in the family will be able to see it.',
  'family.joinMove': 'Move my learning into this family',
  'family.joinNew': 'Learn here as myself',
  'family.joining': 'Adding you…',
  'family.leave': 'Take my learning out of this family',
  'family.leaving': 'Taking your learning out…',
  'family.leaveNote':
    'Leaving keeps every course and all of your progress; it only takes your learning out of this family. If you hold a seat on the family plan, whoever manages the plan has to release that seat first.',
  'family.outMoved': 'Your learning moved into this family. Everything you had came with it.',
  'family.outCreated': 'This account is now a learner in this family.',
  'family.outAlready': 'This account already learns in this family.',
  'family.outLeft':
    'Your learning is out of this family. Every course and all of your progress is still there.',
  'family.notMember': 'You are not a member of that family.',
  'family.seatHeld':
    'This learning holds a seat on the family plan. Whoever manages the plan has to release that seat first.',
  'family.notHere': 'This account does not learn inside that family.',
  'family.adultRefused': 'That did not work. Nothing was changed.',
  'family.adultUnconfirmed':
    'We could not confirm that. Reload the page to see where your learning is.',
  'family.backFamily': 'Back to your family',
  'family.noBand': 'No age band',
  'family.goingNone': 'nothing in progress',
  'family.goingOne': '{count} course in progress',
  'family.goingOther': '{count} courses in progress',
  'family.finishedCount': '{count} finished',
  'family.stoppedCount': '{count} stopped',
  'family.nothing': 'Nothing here yet.',
  'family.guardianAdd':
    'A guardian can add a course from the catalogue, choosing this learner when it asks who is learning.',
  'family.stFinished': 'Finished',
  'family.stPaused': 'Paused by the teacher',
  'family.stExpired': 'No longer available',
  'family.noLessons': 'No lessons in this course yet',
  'family.actNever': 'Not started yet',
  'family.actToday': 'Active today',
  'family.actYesterday': 'Active yesterday',
  'family.actDays': 'Active {count} days ago',
  'family.actWeeksOne': 'Active {count} week ago',
  'family.actWeeksOther': 'Active {count} weeks ago',
  'family.actOn': 'Last active {date}',
  'family.cert': 'Certificate {number}',
  'family.certRevoked': 'Certificate {number} — revoked',
  'family.again': 'Look again',

  // The buy page and its form (`buy.ts`), for the same twenty-seven languages
  // as the dashboard. The 14-day withdrawal box is not here: its paragraph is
  // the database's, in the version the buyer's choice is recorded against.
  'buy.crumb': 'Buy',
  'buy.eyebrow': 'Checkout',
  'buy.nobodyLead': 'There is nobody to buy this for yet.',
  'buy.nobodyBody':
    'A course purchase covers one learner, so there has to be one to name: you on this account, or a child’s profile in your family.',
  'buy.claim': 'Buy it for myself',
  'buy.claimNote': 'This makes you a learner on this account. It is not a second account.',
  'buy.addChild': 'Add a child instead',
  'buy.backCourse': 'Back to the course',
  'buy.subLead': 'This course is sold as a subscription, not as a one-off purchase.',
  'buy.subBody':
    'Subscriptions are not on sale through this checkout yet. Nothing has been charged.',
  'buy.ambiguousLead': 'This course has more than one price for your country.',
  'buy.ambiguousBody':
    'We will not choose a currency on your behalf. Contact us and we will set the right one, then you can buy it.',
  'buy.noPriceLead': 'This course is not priced for {country} yet.',
  'buy.noPriceAny': 'This course is not priced for your country yet.',
  'buy.noPriceBody':
    'Nothing has been charged. Contact us and we will open your market, then you can buy it.',
  'buy.hasAlready': '{name} already has this course. This purchase is for another learner.',
  'buy.noProviderLead': 'No payment provider is connected yet.',
  'buy.noProviderBody':
    'You can place this order and it will be saved, but it cannot be paid until a provider is connected. Nothing is charged, and the course does not open until payment is confirmed.',
  'buy.noProviderHere':
    'No payment service connected to this platform collects the currency this course is priced in here: {currency}.',
  'buy.closedLead': 'Checkout is not open yet.',
  'buy.closedBody':
    'This platform is not taking payment for courses at the moment, so no order can be placed and nothing has been charged. Free courses can still be joined from the course page.',
  'buy.notOnSale': 'This course is not on sale to you at the moment, so there is nothing to pay.',
  'buy.payHeading': 'What you will pay',
  'buy.pricedFor': 'Priced for {country}.',
  'buy.standardPrice': 'The standard price.',
  'buy.oneOff': 'One-off purchase, not a subscription.',
  'buy.accessNote':
    'Access starts when payment is confirmed, not when you press the button. The order is listed on your orders page either way.',
  'buy.whoFor': 'Who is this for?',
  'buy.choose': 'Choose a learner',
  'buy.learnerChild': '{name} (child)',
  'buy.whoNote': 'One purchase covers one learner. To buy for two children, buy it twice.',
  'buy.forOne': 'This purchase is for {name}.',
  'buy.codeLabel': 'Discount code',
  'buy.checkPrice': 'Check the price',
  'buy.checking': 'Checking…',
  'buy.codeNote':
    'Have a code? Enter it here. If it does not apply to this course, you will be told before anything is charged.',
  'buy.quoteFailed': 'That price could not be worked out. Try again.',
  'buy.quoteSimple': 'You would pay {amount}.',
  'buy.quoteList': 'List price {amount}',
  'buy.quoteOffCode': '{code} takes off {amount}',
  'buy.quoteOff': 'discount {amount}',
  'buy.quoteTax': 'tax {amount}',
  'buy.quoteFee': 'fee {amount}',
  'buy.quotePay': 'you pay {amount}.',
  'buy.quoteTaxNote': 'Tax and fees are worked out from the price after any discount.',
  'buy.quoteHolds': 'Nothing is reserved until you place the order.',
  'buy.payWith': 'Pay with',
  'buy.phoneLabel': 'Mobile money number',
  'buy.phoneNote': 'The number that will be asked to approve the payment.',
  'buy.phoneCountry':
    'A number written without a country code is read as a number of this country: {country}. Its code: {dial}.',
  'buy.continue': 'Continue to payment',
  'buy.starting': 'Starting…',
  'buy.noProviderNote': 'This order will be recorded but cannot be paid yet.',
  'buy.approve':
    'Approve the payment on your phone. Your course unlocks once the payment is confirmed. This can take a moment.',
  'buy.orderSaved': 'Your order was saved.',
  'buy.signedOut': 'You are signed out. Sign in again, then try once more.',
  'buy.whyClosed': 'Checkout is not open yet, so no order was placed. Nothing has been charged.',
  'buy.whyNoCourse': 'This course cannot be bought at the moment.',
  'buy.whyNoPrice': 'This course is not on sale at the moment. Reload the page to check.',
  'buy.whyOwned': 'That learner already has this course, so buying it again would add nothing.',
  'buy.whyChoose': 'Choose who this course is for.',
  'buy.whyNotYours': 'That learner is not on your account. Reload the page and choose again.',
  'buy.codeUnknown': 'That code is not one we recognise. Check it and try again.',
  'buy.codeNotNow': 'That code is not running at the moment: it has ended, or has not started yet.',
  'buy.codeNotHere': 'That code is not available in your country.',
  'buy.codeNotCourse': 'That code is not for this course.',
  'buy.codeOwn':
    'That is your own invitation code, so it cannot be used on your own purchase. It is for the friend you send it to.',
  'buy.codeNewOnly': 'That code is only for people who have not bought anything before.',
  'buy.codeUsedUp': 'That code has been used up.',
  'buy.codeUsedYou': 'You have already used that code as often as it allows.',
  'buy.codeUsedFamily': 'Your family has already used that code as often as it allows.',
  'buy.codeFree':
    'That code would make the course entirely free, which this checkout cannot take. Contact us and we will enrol you directly.',
  'buy.codeCurrency':
    'That code is in a different currency from this course, so it cannot be used here.',
  'buy.codeNothing': 'That code takes nothing off this order.',
  'buy.whyFree': 'This course is free. Join it from the course page.',
  'buy.whyWithdrawal':
    'Your choice about the 14-day withdrawal right could not be recorded, so payment was not started. Nothing has been charged.',
  'buy.whyNoProvider': 'No payment provider is connected yet, so this order cannot be paid.',
  'buy.whyPhone': 'That phone number is not valid. Check it and try again.',
  'buy.whyProvider': 'The payment could not be started. Look at your orders before trying again.',
  'buy.refused': 'The order could not be placed. Nothing has been charged.',
  'buy.unconfirmed':
    'We could not confirm whether your order was placed. Look at your orders before trying again.',

  // Closing an account and its form (`close.ts`), for the same twenty-seven
  // languages as the dashboard. Every hedge here is deliberate: the page
  // must not promise a deletion that does not happen.
  'close.title': 'Close this account',
  'close.already': 'This account is already closed.',
  'close.alreadyNote':
    'The profile has been changed, but some records and files may remain. The sign-in is held by the sign-in provider; if it is still there, removing it is a separate step. Being on the list for removal is not proof that it has been removed.',
  'close.lede':
    'You are signed in as {who}. This closes the account, changes your profile and removes some personal information. Some records and stored files remain, as explained below.',
  'close.ledeUnnamed':
    'This closes the account you are signed in to, changes your profile and removes some personal information. Some records and stored files remain, as explained below.',
  'close.goesHeading': 'Removed or changed when the account closes',
  'close.goesProfile': 'Your name, photo, time zone and country',
  'close.goesNotes': 'Lesson notes and bookmarks',
  'close.goesSaved': 'Saved courses and the notes on them',
  'close.goesReviews':
    'Your course reviews are removed. Discussion posts stay as threads, with what you wrote replaced.',
  'close.goesAnswers':
    'The current answer text on your own learner profile is cleared. Earlier revision snapshots and attached files can remain under separate retention rules.',
  'close.goesSharing': 'Live sharing links, invitations and guardian access',
  'close.goesMessages':
    'Platform notifications and outgoing-message records about you. Email that has already been delivered cannot be recalled.',
  'close.goesAppointment':
    'If this account holds a safeguarding or refund-approval appointment, closing it needs individual review. Contact {contact}.',
  'close.goesChildren':
    'A child profile in a family with no other active member may be closed. If it has a separate login, or coursework under a safeguarding hold, closing the account yourself is paused for individual review: contact {contact}. Other eligible child learning records, including coursework, are scheduled for removal after thirty days. Stored files need a separate deletion step.',
  'close.staysHeading': 'Records that remain',
  'close.staysMoney': 'Orders, payments and refunds: the ledger a refund depends on',
  'close.staysProgress':
    'Your own enrolments and lesson progress. Eligible child records are scheduled for removal thirty days after closure.',
  'close.staysCertificates': 'Certificates, under the number they were issued with',
  'close.staysSupport':
    'Support cases. The text of cases you opened is replaced, and messages you wrote are removed, including messages in other people’s cases. If a case is under a safeguarding pause, its content is kept until the pause is released, and it may identify you. The platform tries to replace your display name in staff replies and resolution notes, but other names or identifiers may remain. A case is due for deletion three years after it closes.',
  'close.staysAudit': 'The audit record that the account was closed',
  'close.staysFingerprint':
    'A fingerprint of your sign-in address, not the address itself, so that support can answer “was my account erased?” once the sign-in is gone',
  'close.staysHolder':
    'On a certificate, the holder’s name is replaced with {label}; its number and the other details recorded on it remain. A child’s certificate also keeps its number after the learning record is removed.',
  'close.undoHeading': 'This cannot be undone',
  'close.undoSessions':
    'The app tries to sign you out, but other sessions and the provider sign-in may remain until they are separately revoked or removed. If you are a teacher with a course in review or published, the platform owner has to close the teaching account first; this page will say so if that applies to you.',
  'close.undoSignInLead': 'Closing the account does not delete the sign-in.',
  'close.undoSignIn':
    'It is held by the sign-in provider rather than by AyahSpring, so closing the account puts it on the platform owner’s list for a separate removal step if it is still there. Before removal is recorded, the database checks that the identity is absent from its authentication table; that is not proof about all provider copies.',
  'close.confirmLabel': 'Type {name} to confirm',
  'close.confirmNote':
    'The button becomes available when the name matches exactly. This cannot be undone, and there is no cooling-off period.',
  'close.nameless': 'This account has no name to type. Add one in account settings first.',
  'close.button': 'Close my account for good',
  'close.closing': 'Closing…',
  'close.keep': 'Keep my account',
  'close.signedOut': 'You are signed out. Sign in again to close this account.',
  'close.noAccount': 'There is no account here to close.',
  'close.nameMissing': 'Type your name to confirm.',
  'close.nameMismatch': 'The name does not match. Type it exactly as it appears above.',
  'close.teaching':
    'You still have a course in review or published. Ask the platform owner to close the teaching account first. Nothing was changed.',
  'close.board':
    'You sit on a scholarly board. Ask the platform owner to remove you from it first. Nothing was changed.',
  'close.held':
    'This account is linked to a separate child login, or to coursework that is being held, so closing it needs individual review. Nothing was changed. Contact {contact}.',
  'close.appointment':
    'This account holds a safeguarding or refund-approval appointment, so closing it needs individual review. Nothing was changed. Contact {contact}.',
  'close.refused':
    'This account could not be closed, and nothing was changed. If this keeps happening, contact {contact}.',
  'close.unconfirmed':
    'We could not confirm whether your account closed. Before trying again, reload this page to see, or contact {contact}.',

  // A copy of your data, the page that prints it and the words the download
  // link says (`export.ts`), for the same twenty-seven languages as the
  // dashboard. "A copy", never "everything": the export leaves things out
  // on purpose and the page lists them.
  'export.crumb': 'Export',
  'export.title': 'Get a copy of your data',
  'export.lede':
    'One copy of what this platform holds about you, with the exceptions listed below: your account, the courses you are enrolled in, what you have written, what you have been marked on, what you have bought, and the messages you have been sent.',
  'export.how':
    'Each copy is made when you ask for it, so it is current at that moment. You can make ten copies an hour; the limit protects the platform and is not meant to restrict you.',
  'export.cap':
    'A list longer than {count} rows is cut at that number, and the copy names every list that was cut.',
  'export.json': 'Download the copy (JSON)',
  'export.jsonNote':
    'The whole copy as one JSON file: every field, including the ones no screen shows. It opens in any text editor. For a developer, or for keeping a copy you can check later.',
  'export.sheet': 'Download the copy (spreadsheet)',
  'export.sheetNote':
    'A spreadsheet with one section for each part of your account and a blank line between sections. It opens in Excel, Numbers, LibreOffice or Google Sheets.',
  'export.read': 'Read it here, or save it as a PDF',
  'export.readNote':
    'A page you can read in the browser and print, or save as a PDF from your own print dialog. Your browser makes the PDF itself. Opening the page counts as one of your ten copies.',
  'export.english':
    'The names of the sections and fields inside the copy are in English, because those are the names the records are stored under.',
  'export.audit':
    'Every copy is recorded in the audit trail, with the date and how many rows each section held. That record is what makes an unexpected copy of somebody’s data traceable.',
  'export.preparing': 'Making your copy…',
  'export.done': 'Your copy was made and handed to your browser to save.',
  'export.limit':
    'Ten copies have been made in the last hour, which is the limit. Wait a little, then ask again.',
  'export.failed': 'The copy could not be made just now. Ask again in a moment.',
  'export.signedOut': 'You are signed out. Sign in again to get a copy.',
  'export.inHeading': 'What is in it',
  'export.inAccount': 'Your account',
  'export.inAccountNote':
    'Display name, language, time zone, country, status, and the roles you hold (teacher, reviewer, staff), if any.',
  'export.inLearners': 'Learner profiles',
  'export.inLearnersNote':
    'Your own, and those of learners for whom you are a currently verified guardian with permission to see progress. Their enrolments, progress, attempts and certificates come with them.',
  'export.inWrote': 'What you wrote',
  'export.inWroteNote':
    'Lesson notes, bookmarks, saved courses and the private note you put beside one, reviews, discussion posts, assignment submissions and quiz answers.',
  'export.inGuardians': 'Who you are responsible for, and who may see you',
  'export.inGuardiansNote':
    'Every child you are a guardian of, what you are allowed to see and manage, and when that was verified; and, the other way round, whoever the platform has verified as a guardian of you.',
  'export.inInvited': 'People you invited',
  'export.inInvitedNote':
    'The address you sent a share to, what you shared, and whether it was accepted. Not the link itself: the link is what lets its holder in.',
  'export.inMoney': 'Money',
  'export.inMoneyNote':
    'Orders on any account you belong to, what was bought, and, if you teach, your earnings and payouts. Amounts appear exactly as recorded, in their own currency.',
  'export.inSupport': 'Support and messages',
  'export.inSupportNote':
    'Cases you opened, the replies you can already see, every notification sent to you, and the email the platform has sent or queued on your behalf, with any invitation link blanked out.',
  'export.inActivity': 'Activity and devices',
  'export.inActivityNote':
    'The events recorded about your use of the product, and the devices registered for offline lessons. Reports for teachers and staff are counted from the same events.',
  'export.outHeading': 'What is not in it, and why',
  'export.outOthers': 'Other people’s words',
  'export.outOthersNote':
    'A reply under your post, a classmate’s message, a teacher’s note about a different learner: that is their data, not yours, even where it concerns you.',
  'export.outSignIn': 'Your sign-in address and password',
  'export.outSignInNote': 'Both are held by the sign-in provider, outside this database.',
  'export.outStaff': 'Internal staff notes',
  'export.outStaffNote':
    'How the team talks to itself about a support case or a review. Publishing those notes would make them useless, and they are not a record about you.',
  'export.outFiles': 'Uploaded files themselves',
  'export.outFilesNote':
    'Attachments are listed by reference. Copying every stored video into one document is a different feature, with its own size limits.',
  'export.outTokens': 'Credential tokens',
  'export.outTokensNote':
    'Certificate verification tokens and sharing links are what let other people in. Printing them in a copy is how they stop being secret.',
  'export.after':
    'Downloading is one direction and restoring is the other: part of a copy can be put back on this account or on a new one. Closing your account is separate and cannot be undone; what happens to each kind of record is written on that page.',
  'export.printCrumb': 'To print',
  'export.printTitle': 'A copy of your data',
  'export.printLede':
    'Print this page, or use your browser’s print dialog to save it as a PDF. Your browser makes the PDF itself.',
  'export.printCounts':
    'Opening this page made a copy: it counts as one of the ten an hour and is recorded like a download. Reloading the page makes another.',
  'export.printMade': 'Made: {when}',
  'export.printCut': 'These lists were longer than the limit and were cut: {lists}',
  'export.printSheet': 'Download as a spreadsheet',
  'export.printJson': 'Download as JSON',
  'export.printEmpty': 'There is nothing recorded against this account yet.',
  'export.printSame':
    'This is the same record the two downloads contain. What is left out on purpose, and why, is on the export page.',
  'export.printBack': 'Back to the export page',

  // The reading settings and the words their three controls say
  // (`reading.ts`), for the same twenty-seven languages as the dashboard.
  // What is built and what was tested, said apart: nothing here is a claim
  // nobody measured.
  'reading.title': 'How this reads',
  'reading.crumb': 'Reading',
  'reading.lede':
    'Three settings, applied the moment you choose them. They belong to this browser, not to your account: a phone and a laptop want different sizes, and a shared device should not inherit somebody else’s choice. You do not need to be signed in to use them.',
  'reading.now': 'These are the settings in this browser.',
  'reading.saved': 'Saved for this browser.',
  'reading.notKept':
    'This browser would not keep the setting. It applies to this page only and will be gone on the next one.',
  'reading.textLegend': 'Text size',
  'reading.textNormal': 'Normal',
  'reading.textNormalNote': 'The size the rest of the platform uses.',
  'reading.textLarge': 'Larger',
  'reading.textLargeNote': 'One step up, for headings and body text together.',
  'reading.textLargest': 'Largest',
  'reading.textLargestNote':
    'Two steps up. Rows that sit side by side stack, so words are not squeezed.',
  'reading.contrastLegend': 'Contrast',
  'reading.contrastNormal': 'Normal',
  'reading.contrastNormalNote': 'White and green, as the platform was designed.',
  'reading.contrastHigh': 'Stronger outlines',
  'reading.contrastHighNote':
    'Darker secondary text, darker borders, a plain white background and a thicker outline around whatever the keyboard is on. Useful in bright light and on a dim screen.',
  'reading.motionLegend': 'Motion',
  'reading.motionSystem': 'Follow my device',
  'reading.motionSystemNote':
    'If your device asks for less motion, the platform already listens to it.',
  'reading.motionReduce': 'Always reduce motion',
  'reading.motionReduceNote':
    'Turns off transitions and animated scrolling even when the device does not ask.',
  'reading.reset': 'Back to the defaults',
  'reading.trueHeading': 'What is already true without setting anything',
  'reading.keyboard': 'The keyboard works.',
  'reading.keyboardNote':
    'Whatever the keyboard is on has a visible outline, and the first stop on every page is a link that skips to the content. A control that can be reached only with a mouse or a finger is a fault, and we want to hear about it.',
  'reading.device': 'Your device’s own settings are honoured.',
  'reading.deviceNote':
    'If your device asks for less motion, the platform reduces it; the setting above is for a device that does not ask. The interface also opens in the language your device asks for, when that language is offered.',
  'reading.colours': 'Text colours are measured.',
  'reading.coloursNote':
    'The main text and background colours of the normal design are checked, by an automatic test every time the platform changes, against the contrast that international accessibility guidelines ask of ordinary text.',
  'reading.names': 'Forms carry names.',
  'reading.namesNote':
    'Inputs are built with a label a screen reader can announce, and a wide table scrolls inside its own frame rather than pushing the page sideways.',
  'reading.arabic': 'Arabic is set as Arabic.',
  'reading.arabicNote':
    'A course title, a lesson name, a teacher’s name and the name on a certificate are set in the script they were written in, with the reading direction the words themselves ask for. Screen readers are told which passages are Arabic, so they can change voice.',
  'reading.mixed': 'A mixed name is still one name.',
  'reading.mixedNote':
    'A title in two scripts is not forced into one direction: each part is set in its own script, and the browser joins them in the order a reader would say them.',
  'reading.langHeading': 'Language',
  'reading.offered': 'The interface is translated, and it says how completely.',
  'reading.offeredNote':
    'Languages offered besides English: {count}. The language page states for each one how much of it is actually translated. Where a screen has not been written in your language it is shown in English, whole, rather than as English sentences among translated ones. The teaching and staff screens and some account, family and payment pages have not been prepared for translation yet and are in English for everyone. Course titles, lessons and comments stay in the language their author wrote them in.',
  'reading.rtl': 'Right-to-left languages turn the whole page around.',
  'reading.rtlNote':
    'A right-to-left course shown inside a left-to-right interface keeps its own direction. Choosing one of these languages mirrors the top bar, the navigation, the notices and the footer: {languages}.',
  'reading.browser': 'The choice of language is kept on this browser, not on your account.',
  'reading.browserNote':
    'Language is read before anybody signs in, so the same person on another device gets that device’s language until they change it there too.',
  'reading.unreviewed': 'No translation has been read by a first-language speaker yet.',
  'reading.unreviewedNote':
    'They were written by the people who built the platform. If a word looks wrong to you, that is our mistake, and the language page says so for every language it offers.',
  'reading.missingHeading': 'What is not here yet',
  'reading.noSpeech': 'No text-to-speech.',
  'reading.noSpeechNote':
    'The platform does not read a lesson aloud. It is built to work with a screen reader, but nobody who relies on one has tested it yet.',
  'reading.noFont': 'No dyslexia-friendly font.',
  'reading.noFontNote':
    'None is included. The text size and contrast settings are the substitutes for now.',
  'reading.back': 'Back to my account',

  // Putting a copy of your data back, and the words its form says
  // (`restore.ts`), for the same twenty-seven languages as the dashboard.
  // "Put back", never "restore everything": a file brings back what the
  // reader wrote and nothing the platform wrote about them. The refusals
  // and reasons are this page's own sentences; none is the database's.
  'restore.title': 'Put your data back',
  'restore.crumb': 'Restore',
  'restore.lede':
    'If you downloaded a copy of your data and want it back, on this account after a break or on a new account, this page reads that file and puts back the part of it that you wrote.',
  'restore.canHeading': 'What can come back',
  'restore.canProfile': 'Your profile',
  'restore.canProfileNote':
    'Name, language, time zone and country. Only where the file differs from what is here now, and only values this platform can hold.',
  'restore.canNotes': 'Your notes and bookmarks',
  'restore.canNotesNote':
    'Put back on the lessons they were written on, but only in courses you are enrolled in now. A note belongs to an enrolment, so a course you have left has nowhere to put it.',
  'restore.cannotHeading': 'What cannot, and why',
  'restore.cannotEnrol': 'Enrolments',
  'restore.cannotEnrolNote':
    'An enrolment is an entitlement, and sometimes a paid one. A file that could grant one would be a file that gives courses away. Enrol again, then use the file a second time: your notes will find their lessons.',
  'restore.cannotCert': 'Certificates',
  'restore.cannotCertNote':
    'A certificate is issued by the platform. One written from a file would be a forgery that passes the check. The numbers in your file are still real, and the certificate check still confirms them.',
  'restore.cannotMoney': 'Orders, refunds and progress',
  'restore.cannotMoneyNote':
    'These are records of what happened here, kept by the platform. Putting one back from a file would be a claim, not a copy. Your receipts stay in the file for your own records.',
  'restore.cannotPublished': 'What you published, and what you were marked on',
  'restore.cannotPublishedNote':
    'Reviews, discussion posts and assignment submissions were each published here and, where it was needed, moderated. Posting them again from a file would publish words nobody has read again.',
  'restore.cannotPeople': 'Children, roles and permissions',
  'restore.cannotPeopleNote':
    'A child’s profile records who its guardian is, and a staff role is given by a person, not carried in a file. Both are added through the screens that record who did it.',
  'restore.cannotHistory': 'Your activity history',
  'restore.cannotHistoryNote':
    'It is a record of what happened here and can only be added to. A history brought in from a file would be an invented one.',
  'restore.cannotSignIn': 'Your sign-in address and password',
  'restore.cannotSignInNote':
    'Both are kept by the sign-in service, apart from this record. Sign in with the address you want to use; a file cannot set it.',
  'restore.foot':
    'Nothing is written until you have seen what would be written. Putting a file back is recorded in the audit trail, with what it put back.',
  'restore.fileLabel': 'The JSON file the export page downloaded',
  'restore.fileHint':
    'The spreadsheet and the printable copy are for reading; this page needs the JSON file. Its name begins with: {name}',
  'restore.check': 'Check this file',
  'restore.checking': 'Checking…',
  'restore.another': 'Choose another file',
  'restore.apply': 'Put back what can be put back',
  'restore.applying': 'Putting back…',
  'restore.different': 'Put back a different file',
  'restore.errLarge':
    'This file is larger than a copy of your data can be. Choose the JSON file that the export page downloaded.',
  'restore.errNotJson':
    'This file is empty or is not JSON. Choose the JSON file that the export page downloaded; the spreadsheet and the printable copy cannot be put back.',
  'restore.errNotExport':
    'This file holds JSON, but it is not a copy of your data made by this platform.',
  'restore.errNewer':
    'This copy was made by a newer version of the platform than this one reads, so it cannot be put back here.',
  'restore.errSignedOut':
    'You are signed out. Sign in again, then choose the file again. Nothing was changed.',
  'restore.errCheckFailed':
    'The file could not be checked, and nothing was changed. Check your connection and try again.',
  'restore.errRefused': 'The platform refused this file. Nothing was changed.',
  'restore.unconfirmed':
    'We could not confirm whether the file was put back. Check the file again: an entry that is already here is skipped, so nothing is written twice.',
  'restore.resultCheck': 'What this file would put back',
  'restore.resultApplied': 'What this file put back',
  'restore.resultNothing': 'Nothing in this file can be put back as things stand.',
  'restore.resultAllHere': 'What this file can put back is already here.',
  'restore.lineNotes': 'Notes: {count}',
  'restore.lineMarks': 'Bookmarks: {count}',
  'restore.lineProfile': 'Profile details: {fields}',
  'restore.lineHere': 'Already here and left as they are: {count}',
  'restore.skippedHeading': 'Left in the file, and why',
  'restore.nothingWritten': 'Nothing has been written yet. Checking a file changes nothing.',
  'restore.afterApplied':
    'Your file has not changed, so it can be used again: an entry that is already here is skipped, not written twice. What a file never puts back is listed further down this page.',
  'restore.fieldCountry': 'Country',
  'restore.whereEntry': 'A saved entry',
  'restore.whyNameBlank': 'The name in the file is blank, and a profile cannot have a blank name.',
  'restore.whyNameLong':
    'The name in the file is too long. The most characters a name may have: {count}',
  'restore.whyLanguage':
    'The language in the file is not written in a form the profile can hold. In the file: {value}',
  'restore.whyTimezone':
    'The time zone in the file is not one this platform knows. In the file: {value}',
  'restore.whyCountry':
    'The country in the file is not a two-letter country code. In the file: {value}',
  'restore.whyNotList': 'A part of this file is not a list, so it could not be read.',
  'restore.whyCapped':
    'This list is longer than is read at one time, so only its beginning is read. Entries read: {read}. Entries in the file: {held}',
  'restore.whyOff':
    'Notes and bookmarks are switched off on this platform, so there is nowhere to put them. They are still in your file.',
  'restore.whyNoteEmpty': 'This note has no text.',
  'restore.whyNoteLong': 'This note is too long. The most characters a note may have: {count}',
  'restore.whyNoLesson': 'This entry names no lesson, so there is nothing to attach it to.',
  'restore.whyNotEnrolled': 'You are not enrolled now in a course that has a lesson of this name.',
  'restore.whyAmbiguous':
    'More than one of your courses has a lesson of this name, and the file cannot say which.',
  'restore.whyDiffers':
    'You have since written a different note on this lesson, and it was not replaced.',
  'restore.whyNoAccess':
    'An active enrolment in this course, and access to this lesson, are needed.',
  'restore.whyOther': 'This entry could not be put back.',

  // The phone number card on the account page (`phone.ts`), for the same
  // twenty-seven languages as the dashboard. Each reason a number cannot be
  // kept is the card's own sentence; none is the database's. It says the
  // number is kept and who may read it, and that nothing is sent to it.
  'phone.heading': 'Your phone number',
  'phone.lede':
    'It is kept in one form, the country code and then the number, so that a call from any country reaches the same phone. You see it here, and platform staff are allowed to read it.',
  'phone.storedAs': 'Kept as: {number}',
  'phone.country': 'Country',
  'phone.number': 'Phone number',
  'phone.help':
    'Write it any way you like: with spaces, with brackets, with a zero in front or with a plus sign. It is read the same way.',
  'phone.willStore': 'It will be kept as: {number}',
  'phone.whyCountry': 'Choose the country this number belongs to.',
  'phone.whyEmpty': 'Type a phone number.',
  'phone.whyLetters': 'A phone number cannot have letters in it.',
  'phone.whyPunctuation': 'Type the digits of the number. So far there are only signs.',
  'phone.whyPlus': 'A number has one plus sign at most, and only at the beginning.',
  'phone.whyOtherCountry':
    'This number begins with {begins}, and a number from the country chosen begins with {dial}. Choose the country the number belongs to.',
  'phone.whyLength':
    'Digits a number from this country has after the country code: {digits}. Digits this number has: {count}',
  'phone.whyLengthRange':
    'In this country the number of digits after the country code has two limits. Fewest: {min}. Most: {max}. In this number: {count}',
  'phone.whyTrunk': 'The digit {digit} written in front of the number is not counted.',
  'phone.whyNoDial':
    'No code is on record here for that country, so a number from there cannot be kept yet.',
  'phone.save': 'Save my number',
  'phone.update': 'Change my number',
  'phone.saving': 'Saving…',
  'phone.remove': 'Remove my number',
  'phone.saved': 'Your phone number has been saved.',
  'phone.removed': 'Your phone number has been removed.',
  'phone.signedOut': 'You are signed out. Sign in again, then try once more. Nothing was changed.',
  'phone.off': 'Phone numbers are not being collected at the moment. Nothing was changed.',
  'phone.refused': 'The platform did not accept this number. Nothing was changed.',
  'phone.unconfirmed':
    'No answer came back, so it is not known whether your number changed. Reload this page to see what is kept.',
  'phone.paused':
    'Phone numbers are not being collected at the moment. Your number is kept until you remove it.',
  'phone.foot':
    'Nothing is sent to this number: no messaging service is connected to this platform. No staff screen shows it yet.',

  // The merge screen (`merge.ts`), for the same twenty-seven languages as
  // the dashboard. Each reason a merge cannot run and each refusal is the
  // screen's own sentence; none is the database's. It lists what moves, what
  // is deleted and what stays, and never says that everything moves.
  'merge.title': 'Merging accounts',
  'merge.back': 'Account settings',
  'merge.heading': 'Merging accounts',
  'merge.lede':
    'If you signed up twice, one account can be moved into the other, so that your courses and certificates are in one place. Both accounts have to agree, and the account that is moved is closed afterwards.',
  'merge.unread': 'The merge requests could not be read just now. Nothing was changed.',
  'merge.off':
    'Merging accounts is switched off on this platform. Nothing on this page can be done until the owner switches it on.',
  'merge.foot': 'Each merge is written into the platform’s record of changes, with what was moved.',
  'merge.closeInstead':
    'To close a second account instead of merging it, sign in to that account and close it there.',
  'merge.closeLink': 'Closing an account',
  'merge.inHeading': 'Another account is asking to be merged into this one',
  'merge.inLede':
    'If this is you on a second account, agreeing moves that account’s learning, roles and details into this one and closes that account. It cannot be undone. If it is not you, decline. Nothing happens until you answer.',
  'merge.noName': 'An account with no name',
  'merge.inMerged': 'Merged. The other account is closed.',
  'merge.inExpired':
    'This request ran out before it was answered. Ask again from the other account.',
  'merge.whatMoves':
    'What moves: that account’s learning record with its progress and certificates, its roles, its notifications, its phone number and the courses it made. What stays: the record of what that account did, such as the orders it placed.',
  'merge.whatGoes':
    'What is deleted: where both accounts have a note or a bookmark on the same lesson, or the same notification, the one on this account is kept and the other is deleted. So is the other account’s phone number, if this account already has one.',
  'merge.confirmLabel': 'Type the name of this account to confirm: {name}',
  'merge.needName':
    'This account has no name yet. Add one in the account settings first: a merge is confirmed by typing it.',
  'merge.accept': 'Merge it into this account',
  'merge.accepting': 'Merging…',
  'merge.decline': 'Decline',
  'merge.cannotUndo':
    'This cannot be undone. The other account is closed and its name and details are removed. Its sign-in stays with the sign-in service until it is deleted there.',
  'merge.blockSame': 'Both sides of this request are the same account.',
  'merge.blockAbsorbedClosed': 'The account that would be moved is closed.',
  'merge.blockTargetClosed': 'The account it would be moved into is closed.',
  'merge.blockPayouts':
    'The account that would be moved has payouts on their way: {count}. Wait until they are finished.',
  'merge.blockBilling':
    'The account that would be moved shares billing accounts with other people: {count}. A merge cannot move another person’s payment arrangements.',
  'merge.blockReviewers':
    'Both accounts are on the reviewer register. The owner decides which entry stays.',
  'merge.blockHouseholds':
    'Each account is a learner in a different family. A merge cannot move one person’s learning into another family.',
  'merge.blockSameCourse':
    'Both accounts have started the same course: {title}. The platform cannot choose which progress is the real one. Finish the course on one account, or leave it, before merging.',
  'merge.blockOwner':
    'The account that would be moved holds an owner’s appointment on this platform. It has to be looked at individually before it can be merged.',
  'merge.blockOther':
    'This merge cannot run now, and this page has no sentence for the reason. Ask the platform’s staff before trying again.',
  'merge.noteJoin':
    'The two learning records become one. What the record on this account already has stays as it is.',
  'merge.noteMoves': 'The learning record moves across whole, with its progress and certificates.',
  'merge.outHeading': 'Move this account into another one',
  'merge.outLede':
    'If you have two accounts and this is the one you no longer want, type the email address of the account you want to keep. The request waits there until somebody signs in to that account and agrees. That is how the platform knows you control both.',
  'merge.emailLabel': 'Email address of the account to keep',
  'merge.emailHelp':
    'That account has to agree before anything moves. This account is closed afterwards, and closing it cannot be undone.',
  'merge.ask': 'Ask to be merged',
  'merge.asking': 'Asking…',
  'merge.listHeading': 'Requests made from this account',
  'merge.listInto': 'Into the account whose address you typed',
  'merge.waitingUntil': 'Waiting until {date}',
  'merge.nothingMoved': 'Nothing needed moving.',
  'merge.withdraw': 'Withdraw',
  'merge.stPending': 'Waiting',
  'merge.stCompleted': 'Merged',
  'merge.stDeclined': 'Declined',
  'merge.stCancelled': 'Withdrawn',
  'merge.stExpired': 'Ran out',
  'merge.movedHeading': 'What was moved',
  'merge.mvLearner': 'The learning record',
  'merge.mvEnrolments': 'Enrolments: {count}',
  'merge.mvCertificates': 'Certificates: {count}',
  'merge.mvGrants': 'Access grants: {count}',
  'merge.mvReviews': 'Reviews: {count}',
  'merge.mvAttempts': 'Assessment attempts: {count}',
  'merge.mvSubmissions': 'Assignments: {count}',
  'merge.mvCohorts': 'Dated classes: {count}',
  'merge.mvAttendance': 'Live classes attended: {count}',
  'merge.mvCases': 'Support cases: {count}',
  'merge.mvNotifications': 'Notifications: {count}',
  'merge.mvRoles': 'Roles: {count}',
  'merge.mvNotes': 'Lesson notes: {count}',
  'merge.mvBookmarks': 'Bookmarks: {count}',
  'merge.mvGuardianships': 'Guardian links: {count}',
  'merge.stayed':
    'Records that stayed with the closed account, because this account already held the same thing: {count}.',
  'merge.asked':
    'The request is recorded. If that address belongs to an account, the request is waiting there: sign in to that account to agree to it. You are not told whether the address has an account.',
  'merge.withdrawn': 'The request is withdrawn. Nothing was moved.',
  'merge.merged': 'The accounts are merged. The other account is closed.',
  'merge.declined': 'Declined. Both accounts are as they were.',
  'merge.errSignedOut':
    'You are signed out. Sign in again, then try once more. Nothing was changed.',
  'merge.errEmail': 'Type the email address of the account you want to keep.',
  'merge.errNoAccount': 'No account has that email address. Nothing was changed.',
  'merge.errSameAccount':
    'That is the address of this account. Type the address of the other one, the account you want to keep.',
  'merge.errPending':
    'A request from this account is already waiting. Withdraw it before you ask another account.',
  'merge.errTooMany':
    'This account has asked for a merge too many times in one day. Try again tomorrow. Nothing was changed.',
  'merge.errNoRequest': 'That request is no longer there. Nothing was changed.',
  'merge.errNotYours': 'This account cannot answer that request. Nothing was changed.',
  'merge.errName':
    'The name typed is not the name of this account, letter for letter. Nothing was changed.',
  'merge.errBlocked':
    'This merge cannot run now. Nothing was moved. Reload this page to see the reason beside the request.',
  'merge.errExpired':
    'This request ran out before it was answered. Nothing was moved. Ask again from the other account.',
  'merge.errAnswered':
    'This request had already been answered. Nothing was changed now. Reload this page to see what happened.',
  'merge.errRefused': 'The platform did not accept this. Nothing was changed.',
  'merge.unconfirmed':
    'No answer came back, so it is not known whether this was done. Reload this page to see how things stand before you try again.',

  // Sharing an adult's own learning and opening an invitation (`share.ts`),
  // for the same twenty-seven languages as the dashboard. Each refusal is the
  // screen's own sentence; none is the database's. Nothing here says whether
  // an address has an account.
  'share.lede':
    'Your learning is private, inside your family too. Nobody else sees any of it unless you invite them here, and anything you share can be ended here.',
  'share.noProfile':
    'You have no learning record yet, so there is nothing of your own to share. One is made when you enrol in your first course. What others share with you is listed below.',
  'share.unreadMine':
    'The list of who can see your learning could not be read just now. Nothing was changed.',
  'share.unreadTheirs':
    'What others share with you could not be read just now. Nothing was changed.',
  'share.off':
    'Sharing your learning is switched off at the moment, so nobody can be invited. A share made earlier can still be ended here.',
  'share.liveCount': 'Can see it now: {count}',
  'share.nobody': 'Nobody can see your learning.',
  'share.noName': 'Somebody with no name',
  'share.granted': 'Shared on {date}',
  'share.until': 'Until {date}',
  'share.noEnd': 'No end date',
  'share.ended': 'Ended on {date}',
  'share.stActive': 'Can see it',
  'share.stRevoked': 'Ended',
  'share.stExpired': 'Ran out',
  'share.end': 'End it',
  'share.ending': 'Ending…',
  'share.scopeProgress': 'Progress',
  'share.scopeCertificates': 'Certificates',
  'share.scopeBoth': 'Progress and certificates',
  'share.inviteHeading': 'Invite somebody',
  'share.inviteLede':
    'Type their email address and a link is sent to it. Nothing is shared until they open the link, sign in with that address and accept. Somebody who has no account yet can make one, and the same link works.',
  'share.emailLabel': 'Their email address',
  'share.scopeLabel': 'What they may see',
  'share.lengthLabel': 'For how long',
  'share.lenWeek': 'A week',
  'share.lenMonth': 'A month',
  'share.lenQuarter': 'Three months',
  'share.lengthHelp':
    'The link can be accepted until that day, and the share ends on that day too. To go on after it, invite them again.',
  'share.invite': 'Send the invitation',
  'share.inviting': 'Sending…',
  'share.emailOff':
    'Email is switched off at the moment. The invitation is kept and is sent once email is on.',
  'share.sameAnswer':
    'You are not told whether an address has an account here. Every address is answered the same way.',
  'share.invited': 'An invitation has been recorded for this address: {email}',
  'share.invitedUntil': 'It can be accepted until {date}.',
  'share.endedDone': 'That share is ended. They can no longer see it.',
  'share.errEmail': 'That is not an email address. Nothing was sent.',
  'share.errOwnAddress': 'That is your own address. Nothing was sent.',
  'share.errNoProfile':
    'This account has no learning record of its own to share. Nothing was sent.',
  'share.errNoShare': 'That share is no longer there. Nothing was changed.',
  'share.errNotYours': 'Only the person who shared it can end it. Nothing was changed.',
  'share.theirsHeading': 'Learning shared with me',
  'share.theirsNone':
    'Nobody has shared their learning with you. It cannot be asked for: a person invites you from their own sharing page, and you see it once you accept.',
  'share.theirsUntil': 'Shared with you until {date}',
  'share.theirsNoEnd': 'Shared with you with no end date',
  'share.theirsCanEnd': 'They can end this at any time, and you stop seeing it as soon as they do.',
  'share.courses': 'Courses',
  'share.lessonsDone': 'Lessons completed',
  'share.noCourses': 'No courses yet.',
  'share.lessonsOf': 'Lessons completed: {done} / {total}',
  'share.lastActive': 'Last active on {date}',
  'share.showing': 'Shown here: {shown} / {total}',
  'share.certNone': 'No certificates yet.',
  'share.certIssued': 'Issued on {date}',
  'share.acTitle': 'An invitation to see somebody’s learning',
  'share.acLede':
    'If you accept, you will see the progress or the certificates this person chose to share, until the share runs out or they end it. Only they can end it.',
  'share.acSignedIn': 'You are signed in with this address: {address}',
  'share.acAddressRule':
    'An invitation works only for the address it was sent to. If it was sent to another address, sign out and sign in with that one.',
  'share.acAccept': 'Accept the invitation',
  'share.acAccepting': 'Accepting…',
  'share.acBadLink':
    'This invitation link is not complete. Ask the person who sent it for a new one.',
  'share.acOff':
    'Sharing is switched off at the moment, so this invitation cannot be accepted yet. Nothing has been shared with you.',
  'share.acErrNone': 'There is no such invitation. Nothing was shared.',
  'share.acErrUsed': 'This invitation has already been accepted.',
  'share.acErrWithdrawn': 'This invitation was withdrawn. Nothing was shared.',
  'share.acErrExpired': 'This invitation has run out. Ask the person who sent it for a new one.',
  'share.acErrOther': 'This invitation was sent to a different address. Nothing was shared.',
  'share.acErrHaveIt': 'This person already shares that with you.',

  // Inviting a friend and the page a friend opens (`refer.ts`), for the same
  // twenty-seven languages as the dashboard. Both sides get a discount code:
  // no sentence says anything is paid.
  'refer.lede':
    'A friend who is new here gets a discount on their first course, and you get one on your next. Both are discounts on a course, not money, so there is nothing to withdraw and no bank details to give.',
  'refer.off':
    'Inviting a friend is switched off at the moment, so there is no code to give yet. When it is switched on, this page shows your code and what came of it.',
  'refer.unread':
    'The invitation details could not be read just now. Nothing was charged and no code was used. Reloading is safe.',
  'refer.terms':
    'Your friend gets {friend} off their first course. When their payment arrives you get a code for {you} off your next course, which starts to work once the refund window has passed.',
  'refer.copyLink': 'Copy the invitation link',
  'refer.linkCopied': 'Link copied',
  'refer.copyMessage': 'Copy a message',
  'refer.messageCopied': 'Message copied',
  'refer.copyRefused':
    'This browser did not allow copying. The link is written below and can be selected by hand.',
  'refer.noCode':
    'Your code is made the first time this page opens and stays the same for good. If it is still missing, reload the page once.',
  'refer.msgNamed': '{name} invited you to AyahSpring. {percent} off your first course: {link}',
  'refer.msgPlain': 'You are invited to AyahSpring. {percent} off your first course: {link}',
  'refer.rewardsHeading': 'Rewards you have earned',
  'refer.rewardCount': 'Rewards: {count}',
  'refer.noRewards':
    'Nothing yet. A reward appears here once somebody uses your code and their payment has arrived.',
  'refer.rewardWorth': '{percent} off a course',
  'refer.rwEarned': 'Earned',
  'refer.rwReversed': 'Withdrawn: the purchase it came from was refunded',
  'refer.rwOther': 'Recorded',
  'refer.rwFrom': 'Usable from {date}',
  'refer.rwBy': 'Use it by {date}',
  'refer.rwUse': 'Type it in the code box on the payment page of any course you are buying.',
  'refer.invitedHeading': 'Who you invited',
  'refer.invitedCount': 'People: {count}',
  'refer.nobodyInvited':
    'Nobody yet. People appear here once they have used your code on a purchase.',
  'refer.pnPending': 'Started a purchase',
  'refer.pnBought': 'Bought a course',
  'refer.pnRefunded': 'Their purchase was refunded',
  'refer.friend': 'A friend',
  'refer.onlyFirstName':
    'Only a first name is shown. What somebody else learns, and with whom, is not yours to see because you invited them.',
  'refer.howHeading': 'How it works',
  'refer.how1':
    'You send the link. They open it and see what the code is worth before they decide anything.',
  'refer.how2':
    'They type it while buying their first course, and the discount shows on the receipt they keep.',
  'refer.how3':
    'When their payment arrives, your reward code is made. It starts to work once the refund window has passed, and then works for this many days: {days}. If they are refunded, the reward is withdrawn.',
  'refer.how4':
    'Rewards you may earn in twelve months: {max}. Each one is an ordinary discount on an ordinary order, with an ordinary receipt.',
  'refer.honesty':
    'Both rewards are discounts on a course, not money. Nothing is paid out to anyone, which is why inviting a friend needs no bank details.',
  'refer.lnEyebrow': 'An invitation',
  'refer.lnBadTitle': 'This link does not work',
  'refer.lnBadBody':
    'The code in it is mistyped or was never real. Nothing was charged and nothing was signed up for. You are only a visitor on this page.',
  'refer.lnOffTitle': 'Invitations are not open at the moment',
  'refer.lnUnreadTitle': 'This invitation could not be read just now',
  'refer.lnStill': 'Nothing was charged, and the courses are still here.',
  'refer.lnBrowse': 'Browse the courses',
  'refer.lnTitleNamed': '{name} invited you',
  'refer.lnTitlePlain': 'You were invited',
  'refer.lnWorth': 'Their code takes {percent} off your first course here.',
  'refer.lnNotMoney': 'It is a discount on the course, not money, so there is nothing to withdraw.',
  'refer.lnCardHeading': 'Your invitation',
  'refer.lnKeep': 'Keep this code and browse',
  'refer.lnKept':
    'Use the button and this browser remembers the code and fills it in on the payment page. Days it is remembered: {days}. You can also type it there yourself.',
  'refer.lnAbout':
    'AyahSpring teaches the Islamic faith to children and adults, at a pace that fits around a life. Courses are reviewed before they are published, and every teacher is appointed by the platform.',

  // Sponsored seats, both sides on one page (`sponsor.ts`), for the same
  // twenty-seven languages as the dashboard. A pledge is not a payment, and
  // no sentence says this page takes one.
  'sponsor.lede':
    'Courses somebody else paid for, and courses you paid for somebody else to take. Neither side learns who the other is.',
  'sponsor.off':
    'Sponsoring a seat is switched off at the moment, so nothing new can be asked for or sponsored. What was asked for or sponsored earlier is still shown here.',
  'sponsor.askedHeading': 'What I have asked for',
  'sponsor.askedUnread':
    'Your requests could not be read just now. Nothing has changed: this page only reads.',
  'sponsor.askedNone': 'You have not asked for a sponsored seat.',
  'sponsor.askedHow':
    'If a course is out of reach, you can ask. It costs nothing and obliges nobody.',
  'sponsor.askLink': 'Ask for a sponsored seat',
  'sponsor.aCourse': 'A course',
  'sponsor.forWhom': 'For: {name}',
  'sponsor.apSubmitted': 'Waiting for somebody to read it',
  'sponsor.apApproved': 'Approved, and waiting for a sponsor',
  'sponsor.apFunded': 'Covered: somebody paid for this seat',
  'sponsor.apDeclined': 'Not approved',
  'sponsor.apWithdrawn': 'Taken back',
  'sponsor.seat': 'Seat: {code}',
  'sponsor.staffNote': 'What staff wrote, in their own words:',
  'sponsor.askedOn': 'Asked on {date}',
  'sponsor.decidedOn': 'Decided on {date}',
  'sponsor.coveredLead': 'A seat you asked for has been covered.',
  'sponsor.coveredBody':
    'The course is open for the learner now. Whoever paid is not named here, and that is on purpose: who gave is between the giver and Allah.',
  'sponsor.gaveHeading': 'What I have sponsored',
  'sponsor.gaveUnread':
    'Your sponsorships could not be read just now. Nothing has changed: this page only reads.',
  'sponsor.gaveNone': 'You have not sponsored a seat.',
  'sponsor.gaveHow': 'Each seat that is waiting is a course somebody asked for.',
  'sponsor.spPledged': 'Pledged: waiting for the payment to be recorded',
  'sponsor.spPaid': 'Paid, and the seat is open',
  'sponsor.spWithdrawn': 'Called off',
  'sponsor.amount': 'Amount: {amount}',
  'sponsor.reference': 'Reference: {reference}',
  'sponsor.nextPledged':
    'Nothing is taken automatically: this page collects no payment. Staff record the payment here when it reaches the platform, and the seat opens when they do.',
  'sponsor.nextPaid':
    'Recorded. The seat is open for the learner, and they have not been told who paid.',
  'sponsor.nextWithdrawn': 'This pledge was called off, so no money is expected for it.',
  'sponsor.pledgedOn': 'Pledged on {date}',
  'sponsor.recordedOn': 'Payment recorded on {date}',
  'sponsor.zakat':
    'Whether a sponsored seat counts as zakat, sadaqah or neither is a scholar’s ruling, and this platform does not make it. Ask somebody you trust before you give.',
  // Paying a pledge at checkout (2026-11-19). `nextPay` is said in place of
  // `nextPledged` where the pledge can be paid on the site; `payNot` answers
  // a pledge that is paid, called off or somebody else’s in one sentence, so
  // that asking does not say which.
  'sponsor.pay': 'Pay this pledge',
  'sponsor.payLede':
    'The seat opens for the learner as soon as the payment is confirmed. Neither side learns who the other is.',
  'sponsor.payApprove':
    'Approve the payment on your phone. The seat opens for the learner once the payment is confirmed. This can take a moment.',
  'sponsor.payNot':
    'This pledge cannot be paid here: it has been paid or called off, or it is not one of yours.',
  'sponsor.nextPay':
    'Nothing is taken until you pay. The seat opens when the payment is confirmed.',
  // The pool a sponsor chooses a seat from (`pl…`) and asking for a seat
  // (`rq…`), 2026-11-19. `tooLong` and `unconfirmed` serve both. Staff are
  // "staff", never a named role; nobody is given a gender.
  'sponsor.plEyebrow': 'Sponsoring',
  'sponsor.plTitle': 'Pay for somebody else’s course',
  'sponsor.plLede':
    'A learner who cannot afford a course asks for it, and staff decide. An approved request appears here as a seat with a code and the price of the course, and never a name. You choose a seat; the learner gets the course.',
  'sponsor.plSeeHeading': 'What you see, and what you do not',
  'sponsor.plSeeBody':
    'A seat code, the course, whether it is for a child or an adult, and the price where you are. Not the learner’s name, age or family, and not a word of what they wrote. That is read by the staff who decide, and by nobody else.',
  'sponsor.plPayHeading': 'What you pay, and when',
  'sponsor.plPayBody':
    'The price of the course where you are, worked out as it is for a purchase. Taking a seat is a pledge and takes no money. Your sponsored seats page says how the pledge is paid, and the seat opens for the learner when the payment is confirmed.',
  'sponsor.plListHeading': 'Seats waiting for a sponsor',
  'sponsor.plSignIn': 'The seats are shown to people who are signed in.',
  'sponsor.plUnread':
    'The seats could not be read. Nothing has been charged and no seat was taken.',
  'sponsor.plOff':
    'Sponsoring a seat is switched off at the moment, so no seat can be taken and none can be asked for.',
  'sponsor.plNone':
    'No seat is waiting for a sponsor right now. A request appears here once staff approve it.',
  'sponsor.plForChild': 'For a child',
  'sponsor.plForAdult': 'For an adult',
  'sponsor.plPriceNote':
    'The price of this course where you are. It is the seat that is sponsored, not a gift card.',
  'sponsor.plNoPrice':
    'This course has no price where you are, so this seat cannot be taken from here.',
  'sponsor.plPriceUnread':
    'The price of this seat could not be read, so it cannot be taken just now.',
  'sponsor.plNoteLabel': 'A note for staff, if you want one',
  'sponsor.plTake': 'Sponsor this seat',
  'sponsor.plTaken': 'This seat is yours to pay for: {amount}',
  'sponsor.plTakenNext': 'Nothing has been taken. Your sponsored seats page says how to pay.',
  'sponsor.plWhyGone': 'That seat has just been taken, or is no longer open. Choose another.',
  'sponsor.plWhyOwn': 'That is the seat you asked for. You cannot sponsor your own request.',
  'sponsor.tooLong': 'That is longer than this box holds.',
  'sponsor.plWhyFailed': 'That did not work. Nothing was charged and nothing changed.',
  'sponsor.unconfirmed':
    'We could not confirm whether that was recorded. Look at your sponsored seats before trying again.',
  'sponsor.plAskHeading': 'Asking for a seat',
  'sponsor.rqLede':
    'If a course is out of reach, write a few sentences about the situation. Staff read it and answer either way, with a reason. Asking costs nothing and obliges nobody.',
  'sponsor.rqCourse': 'Which course?',
  'sponsor.rqChoose': 'Choose a course',
  'sponsor.rqReason': 'What is the situation?',
  'sponsor.rqReasonNote':
    'Read by the staff who decide, and by nobody else. Not shown to whoever pays for the seat.',
  'sponsor.rqSubmit': 'Ask for this seat',
  'sponsor.rqDone':
    'Asked. Staff will read it, and the answer, with its reason, will be on your sponsored seats page.',
  'sponsor.rqNoLearner':
    'There is no learner on this account yet, so there is nobody to ask for.',
  'sponsor.rqNoCourse': 'No course is on sale at the moment, so there is nothing to ask for.',
  'sponsor.rqPrivacy':
    'If the request is approved, a sponsor sees a seat code, the course, whether it is for a child or an adult, and the price. Never your name, your family or what you wrote here.',
  'sponsor.rqWhyReason':
    'Write a sentence about the situation. It is what the person deciding reads.',
  'sponsor.rqWhyHas': 'That learner already has this course, so there is nothing to ask for.',
  'sponsor.rqWhyAsked': 'There is already an open request for this course.',

  // My orders (`orders.ts`), for the same twenty-seven languages as the
  // dashboard, 2026-11-23. States are `st…`, an order's own lines `ln…`,
  // asking for a refund `rf…`, a code on an unpaid order `pm…`. Nothing here
  // says money has been returned before it has.
  'orders.title': 'My orders',
  'orders.waitLead': 'Still waiting for confirmation.',
  'orders.waitBody':
    'You came back from the payment screen, and the payment has not been confirmed yet. Access opens as soon as it is. You can leave this page and come back.',
  'orders.paidLead': 'Payment confirmed.',
  'orders.paidBody': 'Access is open.',
  'orders.none': 'You have not placed any orders yet.',
  'orders.unread':
    'Your orders could not be read just now. Nothing has changed: this page only reads.',
  'orders.anOrder': 'Order',
  'orders.stDraft': 'Not started',
  'orders.stPending': 'Waiting for payment',
  'orders.stConfirming': 'Payment being confirmed',
  'orders.stPaid': 'Paid',
  'orders.stPartRefunded': 'Partly refunded',
  'orders.stRefunded': 'Refunded',
  'orders.stCancelled': 'Cancelled',
  'orders.stFailed': 'Failed',
  'orders.stExpired': 'Expired',
  'orders.notPaid': 'Not paid, so no access yet',
  'orders.learn': 'Start learning',
  'orders.receipt': 'Receipt',
  'orders.placedOn': 'Placed on: {date}',
  'orders.total': 'Total: {amount}',
  'orders.lnSubtotal': 'Subtotal: {amount}',
  'orders.lnDiscount': 'Discount: {amount}',
  'orders.lnTax': 'Tax: {amount}',
  'orders.lnFee': 'Fee: {amount}',
  'orders.adjOther': 'Adjustment: {amount}',
  'orders.adjWithdrawn': 'Withdrawn',
  'orders.footNote':
    'Access opens when a payment is confirmed. Coming back from a payment screen is not confirmation.',
  'orders.billing': 'What you have paid',
  'orders.billingNote':
    'Money that has moved and money that has not, across every order on your account.',
  'orders.rfAsk': 'Ask for a refund',
  'orders.rfUntil': 'A refund can be asked for until: {date}',
  'orders.rfClosed': 'The time for asking for a refund on this order ended on: {date}',
  'orders.rfRuleLaw': 'This is the 14 days the law gives for withdrawing from a purchase.',
  'orders.rfRuleWaived':
    'The 14 days the law gives do not apply to this order, because the course was opened at once at the buyer’s request.',
  'orders.rfNothingLeft': 'Everything paid on this order has already been returned.',
  'orders.rfUnread': 'Whether a refund can be asked for on this order could not be read just now.',
  'orders.rfWhy': 'Why are you asking for a refund?',
  'orders.rfAmount': 'Amount asked for: {amount}',
  'orders.rfSend': 'Send the request',
  'orders.rfSent': 'Sent. A person will review it. Nothing has been refunded yet.',
  'orders.rfNote':
    'A person reviews every request. Access stays open until a refund is actually paid back.',
  'orders.rfWhyReason': 'Say what the refund is for.',
  'orders.rfWhyNotYours': 'That order is not on your account.',
  'orders.rfWhyTooMuch': 'That is more than is left to refund on this order.',
  'orders.rfWhyClosed': 'The time for asking for a refund on this order has ended.',
  'orders.rfFailed': 'The request could not be sent. Nothing was changed.',
  'orders.unconfirmed':
    'We could not confirm whether that was recorded. Reload this page before trying again.',
  'orders.pmUse': 'Use this code',
  'orders.pmRemove': 'Take the code off',
  'orders.pmWhyPaid': 'This order is no longer waiting for payment, so its code cannot be changed.',
  'orders.pmWhyHas': 'This order already has a code. Take it off first.',
  'orders.pmFailed': 'That could not be changed. Nothing was charged.',

  // What you have paid (`billing.ts`), for the same twenty-seven languages
  // as the dashboard, 2026-11-23. A sum is `sum…`, a movement `mv…`, what is
  // waiting `wt…` with its state (`rq…` a request, `rf…` a refund being
  // sent, `dp…` a case with a bank). Only money that moved is called paid
  // or returned.
  'billing.lede':
    'Money that has moved, and money that has not yet. Only the first changes the net figure.',
  'billing.noAccount':
    'You are not on a billing account yet. One is created the first time you buy something, and everything you pay appears here afterwards.',
  'billing.unread':
    'What you have paid could not be read just now. That is not the same as having paid nothing.',
  'billing.billedIn': 'Billed in: {currency}',
  'billing.quiet': 'Nothing has been paid on this account yet.',
  'billing.sumPaid': 'Paid',
  'billing.sumReturned': 'Returned',
  'billing.sumNet': 'Net paid',
  'billing.noneMoved': 'Nothing has moved in this currency.',
  'billing.mvPayment': 'Payment',
  'billing.mvPaymentFor': 'Payment: {what}',
  'billing.mvRefund': 'Refund',
  'billing.mvRefundFor': 'Refund: {what}',
  'billing.mvPaid': 'Paid: {amount}',
  'billing.mvReturned': 'Returned: {amount}',
  'billing.mvAfter': 'Net paid after this: {amount}',
  'billing.waitTitle': 'Not counted yet',
  'billing.waitBody':
    'None of this has moved money, so none of it changes the net paid figure above.',
  'billing.wtRequest': 'Refund asked for: {amount}',
  'billing.wtRefund': 'Refund: {amount}',
  'billing.wtDispute': 'Case with your bank: {amount}',
  'billing.wtOther': 'Not counted yet: {amount}',
  'billing.rqRequested': 'Asked for. Nobody has decided yet.',
  'billing.rqApproved': 'Approved, but not sent yet. Nothing has been returned.',
  'billing.rqRejected': 'Declined. Nothing was returned. You can ask why through the help page.',
  'billing.rqWithdrawn': 'The request was withdrawn.',
  'billing.rfPending': 'Sent to the payment service. Waiting for it to confirm.',
  'billing.rfFailed': 'The payment service refused it. Nothing was returned.',
  'billing.dpOpen': 'Your bank has a case open. Nothing has moved in this record.',
  'billing.dpWon': 'The case was decided in the platform’s favour, so nothing was returned.',
  'billing.dpLost':
    'The case was decided in your favour. This record has no entry for it, so the figures above do not include it.',
  'billing.dpWithdrawn': 'The case was withdrawn.',
  'billing.youWrote': 'You wrote: {reason}',
  'billing.waiting': 'Still waiting on this account: {count}',
  'billing.askNote': 'Asking for a refund does not return money. A completed refund does.',
  'billing.recLead': 'This is the platform’s record, not your bank’s.',
  'billing.recBody':
    'A refund shown here as completed may take a few days to reach you, and a fee charged for receiving it is not this platform’s. Neither appears on this page. Amounts are shown in the currency you were charged. Nothing here is converted into another one.',

  // The receipt (`receipt.ts`), for the same twenty-seven languages as the
  // dashboard, 2026-11-23. An order that has not been paid is not a receipt
  // (`notLead`, `totalDue`). The rest of the sheet is borrowed from my
  // orders and from the statement.
  'receipt.notLead': 'This is not a receipt.',
  'receipt.notBody':
    'No payment has been confirmed for this order. What follows is the order as it stands.',
  'receipt.unread':
    'This order could not be read just now. That does not change what has been paid.',
  'receipt.print': 'Print or save as PDF',
  'receipt.number': 'Number: {number}',
  'receipt.billedTo': 'Billed to: {name}',
  'receipt.forLearner': 'For: {name}',
  'receipt.paidOn': 'Paid on: {date}',
  'receipt.noLines': 'No items are recorded on this order.',
  'receipt.anItem': 'Untitled item',
  'receipt.qty': 'Quantity: {count}',
  'receipt.unit': 'Price for one: {amount}',
  'receipt.totalPaid': 'Total paid: {amount}',
  'receipt.totalDue': 'Total to pay: {amount}',
  'receipt.through': 'Paid through: {provider}',
  'receipt.reference': 'Payment reference: {reference}',
  'receipt.rfDoneOn': 'Returned on: {date}',
  'receipt.record':
    'This document is made from the order record the platform holds. It is not a tax invoice.',

  // The notification centre (`notify.ts`), for the same twenty-seven
  // languages as the dashboard, 2026-11-23. The page's own words and the
  // eight kinds' names and descriptions. A stored message is not here: it
  // is English prose from the database, shown beneath its kind's name.
  'notify.lead':
    'Messages from the platform, shown inside the application. They are not sent to an inbox or a phone. This page is the only place they appear.',
  'notify.unread':
    'Your notifications could not be read just now. That is not the same as having none.',
  'notify.soon': 'Coming up',
  'notify.recent': 'Recent',
  'notify.unreadCount': 'Unread: {count}',
  'notify.unreadMark': 'Unread',
  'notify.none': 'No messages yet.',
  'notify.inEnglish':
    'Older messages are shown in English, as they were written. The line above each one says what it is about.',
  'notify.classAt': 'A class starts on: {date}',
  'notify.planNamed': 'Plan: {name}',
  'notify.renewsOn': 'The next period starts on: {date}',
  'notify.renewCancel': 'Cancel before then if you do not want it to continue.',
  'notify.markAll': 'Mark all as read',
  'notify.marked': 'Marked as read: {count}',
  'notify.markFailed': 'They could not be marked as read just now.',
  'notify.prefsTitle': 'What you are told',
  'notify.prefsBody': 'These switches decide what appears on this page.',
  'notify.prefsUnread': 'What you have chosen could not be read just now. Nothing was changed.',
  'notify.sumAllOn': 'Everything you can choose is on.',
  'notify.sumAllOff': 'You have switched off every optional message.',
  'notify.sumOff': 'Optional messages switched off: {count}',
  'notify.always': 'Always on',
  'notify.notInUse':
    'Not in use on this platform yet. Your choice is saved and applies if it is switched on.',
  'notify.prefLocked': 'Being told that money owed to you did not arrive cannot be switched off.',
  'notify.prefFailed': 'That change was not saved.',
  'notify.prefUnsure': 'No answer came back. Reload this page to see whether the change was saved.',
  'notify.kPayoutPaid': 'A payout was sent to you',
  'notify.kPayoutFailed': 'A payout did not go through',
  'notify.kPayoutCancelled': 'A payout request was cancelled',
  'notify.kMediaFailed': 'A recording of yours will not play',
  'notify.kClassStarting': 'A class is about to start',
  'notify.kPlanRenewing': 'A plan renews soon',
  'notify.kLiveCancelled': 'A class you were going to was cancelled',
  'notify.kRecordingReady': 'A recording of a class is ready',
  'notify.dPayoutPaid': 'When money owed to you has been sent.',
  'notify.dPayoutFailed':
    'When a transfer did not go through. Always on: it is how you find out, and the fix is usually yours to make.',
  'notify.dPayoutCancelled':
    'When a payout is withdrawn before it is sent. Always on, for the same reason as a failure.',
  'notify.dMediaFailed':
    'When an upload could not be prepared for playback. Turning this off means finding out from a learner instead. It does not affect whether the file is fixed.',
  'notify.dClassStarting': 'A reminder for a live class in a course you or a child of yours is in.',
  'notify.dPlanRenewing':
    'Three days before a subscription renews, so cancelling is possible in time.',
  'notify.dLiveCancelled':
    'When a live class you or a child of yours was enrolled in is called off, with the reason. Turning this off means finding out by opening the room instead. The class still says it was cancelled, and why.',
  'notify.dRecordingReady':
    'When a recording is added for a class you or a child of yours was in. Turning this off means finding out by opening the class page instead. The recording is still there, and can still be watched while your enrolment lasts.',
  // A kept message said from what it is made of (2026-11-24). The amount and
  // the reference reuse the sponsor page's sentences.
  'notify.mReason': 'The reason given: {reason}',
  'notify.mStillOwed': 'The money is still owed to you. Nothing has been lost.',
  'notify.mCancelledBy':
    'The staff of this site cancelled this request. The money is still owed to you. Ask again when you are ready.',
  'notify.mLessonEmpty': 'A lesson of yours has nothing to play',
  'notify.mRecording': 'The recording: {name}',
  'notify.mNotPlayable':
    'It could not be prepared for playing. It will not play until it is tried again.',
  'notify.mEncoder': 'What the program that prepares it reported: {reason}',
  'notify.mClass': 'The class: {title}',
  'notify.mWasAt': 'It was to start on: {date}',
  'notify.mHeldAt': 'The class was on: {date}',

  // The plans page and the page a plan is paid for on (`plans.ts`), for the
  // same twenty-seven languages as the dashboard, 2026-11-23. A price is
  // said with the period it pays for, never as "per month": nothing renews.
  'plans.title': 'Choose a learning plan',
  'plans.lede':
    'A plan opens courses for the learners it covers, for the period it is paid for. It starts when payment is confirmed, not when the order is placed.',
  'plans.shelves':
    '{basic} opens the lessons. {plus} is the VIP package: the same lessons, and more besides. Each plan lists what it opens.',
  'plans.noRenew':
    'Nothing is taken again automatically. When the period ends, the plan ends unless it is paid for again.',
  'plans.closedLead': 'Plans are not on sale yet.',
  'plans.closedBody':
    'When they are, each plan and its price will be listed here. Nothing can be bought before then.',
  'plans.unread':
    'The plans could not be read just now. This does not mean there are none. Try again in a moment.',
  'plans.none': 'No plan is on sale at the moment.',
  'plans.forWeek': 'For one week: {amount}',
  'plans.forMonth': 'For one month: {amount}',
  'plans.forQuarter': 'For three months: {amount}',
  'plans.forYear': 'For one year: {amount}',
  'plans.forOnce': 'One payment: {amount}',
  'plans.adults': 'Places for adults: {count}',
  'plans.children': 'Places for children: {count}',
  'plans.opens': 'What it opens',
  'plans.subject': 'Every course in this subject: {name}',
  'plans.offline': 'Saving lessons in the app, to watch with no connection',
  'plans.noPrice': 'This plan has no price for your account yet, so it cannot be bought here.',
  'plans.choose': 'Choose this plan',
  'plans.payLede':
    'Choose who this plan is for and how to pay. The plan starts once the payment is confirmed.',
  'plans.notHere': 'This plan is not on sale, or there is no such plan.',
  'plans.whichPrice': 'Which price?',
  'plans.whoFor': 'Who is this plan for?',
  'plans.forOne': 'This plan is for: {name}',
  'plans.nobodyLead': 'There is nobody on your account this plan can cover yet.',
  'plans.nobodyBody':
    'A place for an adult is for you, once you are a learner on this account. A place for a child is for a child in your family.',
  'plans.noService': 'So a plan cannot be bought yet. No order has been placed.',
  'plans.noServiceHere':
    'No payment service connected to this platform collects the currency this plan is priced in here: {currency}',
  'plans.approve':
    'Approve the payment on your phone. The plan starts once the payment is confirmed. This can take a moment.',
  'plans.waiting':
    'An order for this plan is waiting for payment. To start again, cancel it under your subscriptions first.',
  'plans.haveLive': 'This account already has this plan. It runs until: {date}',
  'plans.whyGone': 'This plan is not on sale any more. No order was placed.',
  'plans.whyPrice':
    'That price is not available to your account any more. No order was placed. Open the plans again to see the current price.',
  'plans.whySlot': 'This plan has no place for that learner. No order was placed.',
  'plans.whyAlready':
    'This account already has this plan, or an order for it that is still waiting. Look at your subscriptions.',
  'plans.whyAccount':
    'Your place on this billing account does not allow you to pay from it. No order was placed.',
  'plans.whyLearner': 'That learner cannot be chosen from this account. No order was placed.',
  'plans.whyClosed': 'Plans are not on sale yet, so no order was placed. Nothing has been charged.',
  'plans.whyChoose': 'Choose who this plan is for.',
  'plans.whyNoService': 'No payment service can take this payment at the moment.',
  'plans.whyFailed': 'The payment could not be started.',

  // The page an account's plans are kept on, and its two forms (`subs.ts`),
  // for the same twenty-seven languages as the dashboard, 2026-11-23. What
  // is said about a plan is worked out from its status and its date, and
  // what cancelling does is said as the database does it: nothing is taken
  // away, nothing is returned, and nothing was going to be taken again.
  'subs.title': 'Your plans',
  'subs.lede': 'Each plan on your account: what it opens, who is learning on it and when it ends.',
  'subs.unread':
    'Your plans could not be read just now. This does not mean you have none. Try again in a moment.',
  'subs.partUnread':
    'Part of this page could not be read just now, so some of it is missing. Try again in a moment.',
  'subs.none': 'There is no plan on this account.',
  'subs.unnamed': 'A plan that is no longer on sale',
  'subs.waiting': 'Waiting for payment. It has not started.',
  'subs.until': 'Runs until: {date}',
  'subs.ended': 'Ended: {date}',
  'subs.stopped': 'Cancelled. Paid for until: {date}',
  'subs.withdrawn': 'Cancelled before it was paid for.',
  'subs.learners': 'Learning on this plan',
  'subs.noLearner': 'Nobody is learning on this plan yet.',
  'subs.someone': 'A learner whose name is not shown to you',
  'subs.add': 'Add a learner',
  'subs.addDo': 'Add to this plan',
  'subs.full': 'Every place on this plan is taken.',
  'subs.cancelOrder': 'Cancel this order',
  'subs.cancelOrderNote':
    'This cancels the order before it is paid, so that you can start again. If a payment request is still waiting on a phone, do not approve it.',
  'subs.cancelPlan': 'Cancel this plan',
  'subs.cancelPlanNote':
    'Cancelling returns no money and does not end the plan early. Nothing is taken again whether you cancel or not. After cancelling, nobody else can be added to it. This plan is paid for until: {date}',
  'subs.reason': 'Why are you cancelling?',
  'subs.whyReason': 'Write why you are cancelling.',
  'subs.whyNotYours': 'This plan cannot be changed from your account.',
  'subs.whyNotRunning': 'This plan is not running, so nobody can be added to it.',
  'subs.whyLearner': 'That learner cannot be put on this plan from your account.',
  'subs.whySlot': 'That place has just been taken. Nobody was added.',
  'subs.failed': 'That could not be done. Nothing was changed.',
  'subs.unsure':
    'We could not confirm that this was done. Look at this page again before trying once more.',
  // Put back on 2026-11-23 at the owner's word: when the paid period began,
  // which kind of place each learner is in, and what the other shelf adds.
  // Somebody enrolling a grandchild should not have to work any of it out.
  'subs.started': 'Paid for from: {date}',
  'subs.inAdult': 'In a place for an adult: {name}',
  'subs.inChild': 'In a place for a child: {name}',
  'subs.plusAdds': 'Saving lessons in the app, to watch with no connection, comes with: {plus}',
  'subs.compare': 'Compare the plans',

  // The policy register, one document's page and the button that records an
  // agreement (`policy.ts`), for the same twenty-seven languages as the
  // dashboard, 2026-11-23. These are the words round a document. The
  // document itself is the owner's, in the language it was written in.
  'policy.lede':
    'What you agree to when you learn or teach here, what is done with your data, and what happens when something goes wrong.',
  'policy.kept':
    'Every version of a document is kept. A change is a new version that takes effect on a date, never an edit to an old one, and where it needs your agreement you are asked again.',
  'policy.unread':
    'The policies could not be read just now. This does not mean there are none. Try again in a moment.',
  'policy.none': 'No policy has been written yet.',
  'policy.noneLead': 'None of these is in force yet.',
  'policy.noneBody':
    'A document is published only when the owner of the platform has answered the questions in it that only they can answer, such as which law applies and who is responsible for your data. Until then it is not in force, and a draft is not shown.',
  'policy.inForceCount': 'Documents in force: {count}',
  'policy.othersDraft': 'The others are written and not yet approved.',
  'policy.forEveryone': 'For everyone',
  'policy.forChild': 'For children and their guardians',
  'policy.forTeacher': 'For teachers',
  'policy.forInstitution': 'For institutions',
  'policy.notYet': 'Not in force yet',
  'policy.versionNo': 'Version: {number}',
  'policy.inForceFrom': 'In force from: {date}',
  'policy.mustAgree': 'You will be asked to agree to it, and the time you agree is kept.',
  'policy.noSign': 'It is for reading. There is nothing to agree to.',
  'policy.concern':
    'A concern about how somebody behaved, or about a child’s safety, is not a question about a policy. It goes to a person.',
  'policy.draftBody':
    'This document is written, but no version of it has been approved, so there is nothing here to read or to agree to. A draft is not shown, because it can still change. Nothing here asks for your agreement until a version is approved.',
  'policy.changed': 'What changed in this version: {note}',
  'policy.asWritten': 'The document is shown in the language it was written in.',
  'policy.agreeTitle': 'Your agreement',
  'policy.agreeSignIn':
    'This document asks for your agreement, and the time you give it is kept with your account. Sign in first.',
  'policy.agreeSignInDo': 'Sign in to agree',
  'policy.agreeNote':
    'Agreeing records that you have read this version and accept it. The version and the time are kept with your account.',
  'policy.agreeDo': 'Agree to this version',
  'policy.agreed': 'You agreed to this version on: {date}',
  'policy.agreedWhere': 'What you have agreed to is listed on your account page.',
  'policy.agreedNewer':
    'A newer version was published while this page was open, and your agreement was recorded for that one. This page now shows it. Read it.',
  'policy.waitingCount': 'Documents waiting for your agreement: {count}',
  'policy.whyChanged':
    'This document changed after this page was opened, so nothing was recorded. Read it again before you agree.',
  'policy.agreeFailed': 'Your agreement could not be recorded. Nothing was changed.',
  'policy.agreeUnsure':
    'We could not confirm that your agreement was recorded. Open this page again to see.',

  // The institution page a member opens, joining and leaving, and the counts
  // (`inst.ts`), for the same twenty-seven languages as the dashboard,
  // 2026-11-23. The fields an administrator fills in are not here: they are
  // in English for now and the page says so above them.
  'inst.title': 'Institutions',
  'inst.yours': 'Your institution',
  'inst.unread':
    'Your institution could not be read just now. This does not mean you are not in one. Try again in a moment.',
  'inst.notIn': 'You are not in an institution',
  'inst.canJoin':
    'Your email address is at a domain that an institution has shown is its own, so you may join it. Nothing happens by itself: you join by pressing the button.',
  'inst.joinMeans':
    'Joining adds you and the learners in your family to that institution’s numbers: how many of its people enrolled in each course and how many finished. Its members are shown those numbers. No name is shown. A small number can still point at somebody.',
  'inst.joinDo': 'Join this institution',
  'inst.joinClosed':
    'Joining an institution with an email address is not open at the moment. An institution’s administrators are named by the platform.',
  'inst.noMatch':
    'No institution has a checked email domain that matches your address. If your school or madrasah should be here, ask its administrator.',
  'inst.haveCode': 'Do you have a code from a school? It is used on another page.',
  'inst.useCode': 'Use a code',
  'inst.memberNote':
    'You are a member of this institution. Its administrators manage it. You can leave at any time.',
  'inst.joinedOn': 'You joined on: {date}',
  'inst.reportTitle': 'What its people studied',
  'inst.reportWhat':
    'These are numbers, not records. They count the accounts that joined, the learners in those accounts’ families, the courses those learners enrolled in between the two dates, the courses finished and the certificates issued. No name and no email address is shown. A learner with no account in this institution is not counted. A number as small as one can still point at somebody, so treat a small number as you would a name.',
  'inst.from': 'From',
  'inst.to': 'To',
  'inst.readDo': 'Show these dates',
  'inst.csvDo': 'Download as a file',
  'inst.statAccounts': 'Accounts that joined: {count}',
  'inst.statLearners': 'Learners in their families: {count}',
  'inst.statEnrolments': 'Enrolments between the two dates: {count}',
  'inst.statFinished': 'Courses finished between the two dates: {count}',
  'inst.statCertificates': 'Certificates issued between the two dates: {count}',
  'inst.byCourse': 'By course',
  'inst.colCourse': 'Course',
  'inst.colLearners': 'Learners',
  'inst.colEnrolments': 'Enrolments',
  'inst.colFinished': 'Finished',
  'inst.noneEnrolled': 'Nobody enrolled in anything between these dates.',
  'inst.reportUnread':
    'The numbers could not be read just now. This does not mean there are none. Try again in a moment.',
  'inst.badWindow': 'Choose a start date that is not after the end date.',
  'inst.windowTooLong': 'Choose two dates no more than two years apart.',
  'inst.leaveTitle': 'Leaving',
  'inst.leaveBody':
    'Leaving ends your membership, and you and your family are no longer counted in its numbers. It does not delete your account or anything you have learned.',
  'inst.leaveDo': 'Leave this institution',
  'inst.whyLastAdmin':
    'You are its only administrator. Somebody else has to be made an administrator before you can leave.',
  'inst.whyAlready': 'You already belong to an institution.',
  'inst.whyNoMatch': 'No checked email domain matches your address, so you were not joined.',
  'inst.whyNotMember': 'You are not a member of an institution.',
  'inst.failed': 'That could not be done. Nothing was changed.',
  'inst.unsure': 'We could not confirm that this was done. Open this page again to see.',
  'inst.adminEnglish':
    'The parts below are for this institution’s administrators and are in English for now.',
  'inst.csvNote': 'The headings inside the file are in English.',
  'inst.whySignedOut': 'You are signed out. Sign in and try again.',

  // The page that asks to teach, its form and taking an application back
  // (`tapply.ts`), for the same twenty-seven languages as the dashboard,
  // 2026-11-23. What the applicant types and the note the owner leaves are
  // not translated, and the page says so.
  'tapply.byAppointment':
    'Teaching here is by appointment. Sending this asks the owner to consider you. It does not make you a teacher, and it creates no course and no page. Nothing you write here is published. If you are approved, every course you write is still reviewed before a learner sees it.',
  'tapply.asWritten': 'The owner reads what you write as you wrote it. It is not translated.',
  'tapply.unread':
    'Your application could not be read. This page sent nothing and changed nothing.',
  'tapply.teachesAlready': 'You already teach here, so there is nothing to apply for.',
  'tapply.toCourses': 'Go to your courses',
  'tapply.approved': 'Your application was approved.',
  'tapply.noteLeft': 'The note left for you, as it was written:',
  'tapply.yours': 'Your application',
  'tapply.waiting': 'With the owner, waiting to be read',
  'tapply.sentOn': 'Sent on: {date}',
  'tapply.answerHere':
    'The answer will be shown on this page. No message is sent when it comes, so look here again.',
  'tapply.sampleLink': 'The sample lesson you sent',
  'tapply.withdrawDo': 'Take this application back',
  'tapply.withdrawNote':
    'You can take it back at any time before it is answered. You do not have to say why.',
  'tapply.declined': 'Not approved this time.',
  'tapply.again': 'You can send another application.',
  'tapply.withdrawn': 'You took your application back. You can send a new one.',
  'tapply.closed':
    'Applications are closed at the moment, so nothing can be sent from this page. If you would like to teach here, ask the owner.',
  'tapply.formTitle': 'What the owner reads',
  'tapply.fieldTeach': 'What would you teach, in one line?',
  'tapply.hintTeach': 'For example: tajweed and Quran recitation for children.',
  'tapply.fieldKnow': 'What you know, and who you learned it from',
  'tapply.hintKnow':
    'In your own words. A person checks a teacher’s qualifications here, so write what you would tell another teacher: for example an ijazah and who gave it, the years you have taught, and where.',
  'tapply.fieldSample': 'A link to a sample lesson',
  'tapply.hintSample':
    'A link to a lesson you have recorded or streamed. The owner has to be able to watch it. A file cannot be uploaded here.',
  'tapply.fieldElse': 'Anything else',
  'tapply.hintElse':
    'For example the hours you can teach, your time zone and the languages you teach in.',
  'tapply.sendDo': 'Send to the owner',
  'tapply.whyTeach': 'Say what you would teach, in a few words.',
  'tapply.whyKnow': 'Write a sentence or two about what you know and who you learned it from.',
  'tapply.whySample':
    'That is not a link the owner can open. Paste the whole address of the lesson, with no spaces in it.',
  'tapply.whyLong': 'One of the boxes holds more than it can take. Shorten it and send again.',
  'tapply.whyClosed': 'Applications to teach are closed at the moment. Nothing was sent.',
  'tapply.whyApplied': 'You already have an application with the owner. Wait for the answer.',
  'tapply.whyNothing':
    'There is no application waiting to be taken back. It may already have been answered.',
} as const;

export type MessageKey = keyof typeof en;
export type Messages = Record<MessageKey, string>;
