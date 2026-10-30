import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * دری — Dari, the Afghan Persian.
 *
 * **Why this is a separate catalogue and not an entry in `fa`.** Dari and
 * Iranian Persian are one language in the way English and Scots are one
 * language: mutually readable, and immediately distinguishable to the people who
 * speak them. The everyday words differ (کورس rather than دوره, صنف for class),
 * and an Afghan reader handed the Iranian catalogue reads a page written for
 * somewhere else — which is exactly the thing this feature exists to stop. The
 * code is `fa-af` because that is what BCP-47 says, and `matchLocale()` now
 * matches a full tag before it falls back to a base language so that a device
 * asking for `fa-AF` lands here rather than in Tehran.
 *
 * A whole catalogue in one file: see `asia-uz.ts`.
 *
 * Every placeholder from `en.ts` survives — `{count}`, `{number}`, `{year}`,
 * `{query}`, `{band}`, `{phone}`, `{language}`, `{percent}`, `{page}`, `{pages}`,
 * `{from}`, `{to}`, `{total}`, `{hours}`, `{minutes}`.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`.
 */
export const ASIA_FA_AF: Partial<Record<LocaleCode, Partial<Messages>>> = {
  'fa-af': {
    'skip.toContent': 'رفتن به محتوا',

    'nav.main': 'اصلی',
    'nav.catalogue': 'فهرست',
    'nav.learn': 'آموزش من',
    'nav.family': 'فامیل من',
    'nav.plans': 'پلان‌ها',
    'nav.subscriptions': 'اشتراک‌ها',
    'nav.teach': 'تدریس',
    'nav.review': 'بررسی',
    'nav.certificates': 'اسناد',

    'footer.tagline': 'آموزش اسلامی برای کودکان و بزرگسالان، در سراسر جهان.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'درباره ما',
    'footer.terms': 'شرایط و محرمیت',
    'footer.help': 'کمک',
    'footer.verify': 'بررسی سند',
    'footer.area': 'منطقه شما',
    'footer.notifications': 'اطلاعیه‌ها',

    'action.signIn': 'ورود',
    'action.getStarted': 'شروع کنید',
    'action.signOut': 'خروج',
    'action.save': 'ذخیره',
    'action.cancel': 'لغو',

    'region.africa': 'افریقا',
    'region.middleEast': 'شرق میانه',
    'region.asia': 'آسیا',
    'region.west': 'اروپا و امریکا',

    'language.title': 'زبان',
    'language.lede':
      'رابط به زبانی نشان داده می‌شود که در همین‌جا انتخاب می‌کنید. مرورگر نخست با زبان درخواستی وسیله شما آغاز می‌شود و تا زمانی که زبان دیگری انتخاب نکنید همین‌گونه می‌ماند.',
    'language.current': 'اکنون نشان داده می‌شود',
    'language.chosen': 'این زبان را شما در همین مرورگر انتخاب کرده‌اید.',
    'language.device': 'این زبان درخواستی وسیله شماست. برای تغییر، یکی را از پایین انتخاب کنید.',
    'language.default':
      'وسیله شما زبانی را خواسته که این رابط آن را ندارد، بنابراین رابط به انگلیسی است.',
    'language.pick': 'نشان دادن رابط به',
    'language.deviceOption': 'زبان وسیله من',
    'language.change': 'تغییر زبان',
    'language.saved': 'ذخیره شد. رابط اکنون به زبان {language} است.',
    'language.coverage':
      '{percent}% از متن‌های این رابط به زبان {language} ترجمه شده است. آن‌چه ترجمه نشده به انگلیسی نشان داده می‌شود.',
    'language.coverageAll': 'این زبان کاملاً ترجمه شده است.',
    'language.browser':
      'انتخاب در همین مرورگر نگه داشته می‌شود، نه در حساب شما، بنابراین وسیله دیگر زبان خودش را خودش می‌پرسد.',

    'catalogue.title': 'یافتن کورس',
    'catalogue.lede':
      'هر کورس پیش از نشر بررسی می‌شود. بر اساس مضمون ببینید، یا کورس، مضمون یا استاد را جستجو کنید.',
    'catalogue.doorChild': 'آموزش برای کودک',
    'catalogue.doorAdult': 'آموزش برای من',
    'catalogue.searchPlaceholder': 'کورس‌ها، مضامین، استادان…',
    'catalogue.searchPlaceholderLessons': 'کورس‌ها، درس‌ها، مضامین، استادان…',
    'catalogue.searchLabel': 'جستجوی کورس‌ها',
    'catalogue.searchLabelLessons': 'جستجوی کورس‌ها و درس‌ها',
    'catalogue.audience': 'برای چه کسی',
    'catalogue.search': 'جستجو',
    'catalogue.allSubjects': 'همه مضامین',
    'catalogue.anyLanguage': 'هر زبانی',
    'catalogue.languageRow': 'کورس به کدام زبان تدریس می‌شود',
    'catalogue.pages': 'صفحه‌ها',
    'catalogue.previous': 'پیشین',
    'catalogue.next': 'بعدی',
    'catalogue.pageOf': 'صفحه {page} از {pages}',
    'catalogue.emptyPage': 'در این صفحه چیزی نیست. ممکن است پس از پایان فهرست باشد.',
    'catalogue.emptyQuery':
      'چیزی با «{query}» مطابقت نداشت. یک مضمون، نام استاد یا کلمه‌ای از یک درس را امتحان کنید.',
    'catalogue.emptyQueryLessons': 'کورسی با «{query}» مطابقت نداشت، اما درس‌های پایین مطابقت کردند.',
    'catalogue.emptyShelf':
      'هنوز کورسی نیست. وقتی استاد کورسی را نشر کند، در همین‌جا پیدا می‌شود — هیچ چیزی پیش از گذشتن از بررسی نشان داده نمی‌شود.',
    'catalogue.countOne': '{count} کورس',
    'catalogue.countOther': '{count} کورس',
    'catalogue.showing': 'نمایش {from}–{to} از {total}',

    'audience.child': 'شاگردان جوان',
    'audience.adult': 'بزرگسالان',
    'audience.both': 'همه سنین',

    'difficulty.beginner': 'آغاز',
    'difficulty.intermediate': 'میانه',
    'difficulty.advanced': 'پیشرفته',

    'price.free': 'رایگان',
    'price.included': 'در دسترسی شما شامل است',
    'price.notOneOff': 'به‌عنوان کورس یک‌باره فروخته نمی‌شود',
    'price.ambiguous': 'قیمت به واحد پول درست نیاز دارد',
    'price.notAvailable': 'هنوز در کشور شما موجود نیست',

    'card.sectionsOne': '{count} بخش',
    'card.sectionsOther': '{count} بخش',
    'card.lessonsOne': '{count} درس',
    'card.lessonsOther': '{count} درس',
    'card.minutes': '{count} دقیقه',
    'card.hours': '{count} ساعت',
    'card.hoursMinutes': '{hours} ساعت {minutes} دقیقه',

    'auth.signInTitle': 'ورود',
    'auth.signUpTitle': 'ساختن حساب',
    'auth.signInLede': 'دوباره خوش آمدید.',
    'auth.email': 'ایمیل',
    'auth.password': 'رمز',
    'auth.mobile': 'شماره موبایل',
    'auth.countryCode': 'کد کشور',
    'auth.otpCode': 'کد پیام کوتاه',
    'auth.tabPassword': 'ایمیل و رمز',
    'auth.tabPhone': 'کد تلیفون',
    'auth.google': 'ادامه با Google',
    'auth.sendCode': 'ارسال کد',
    'auth.verifyCode': 'تأیید کد',
    'auth.resendCode': 'ارسال دوباره کد',
    'auth.changeNumber': 'تغییر شماره',
    'auth.forgot': 'رمز را فراموش کرده‌اید؟',
    'auth.noAccount': 'ساختن حساب',
    'auth.haveAccount': 'حساب دارید؟',
    'auth.working': 'در حال اجرا…',
    'auth.invalidPhone': 'این شماره تلیفون معتبر به نظر نمی‌رسد. کد کشور را هم بنویسید.',
    'auth.somethingWrong': 'مشکلی پیش آمد.',
    'auth.orGoogle': 'یا از یکی از این‌ها استفاده کنید',
    'auth.orCreate': 'یا با ایمیل یا شماره تلیفون حساب بسازید',
    'auth.phoneAs': 'به شکل {phone} ذخیره می‌شود',
    'auth.international': 'از قبل در شکل بین‌المللی است.',
    'auth.passwordNote': 'ما هرگز آن را ذخیره نمی‌کنیم. رمز را Supabase Auth نگه می‌دارد.',
    'auth.codeSent': 'اگر حسابی برای {phone} باشد، کد در راه است.',
    'auth.codeResent': 'کد تازه‌ای به {phone} فرستاده شد.',
    'auth.checkEmail': 'حساب ساخته شد. برای تأیید آدرس، ایمیل خود را ببینید و سپس وارد شوید.',
    'auth.accountCreated': 'حساب برای {phone} ساخته شد.',

    'doors.askAdult': 'برای خودتان می‌گردید؟',
    'doors.askChild': 'برای یک کودک انتخاب می‌کنید؟',
    'doors.adultsShelf': 'قفسه بزرگسالان',
    'doors.youngShelf': 'قفسه شاگردان جوان',
    'doors.wholeCatalogue': 'همه فهرست',
    'young.eyebrow': 'شاگردان جوان',
    'young.title': 'نخست کودکان.',
    'young.lede':
      'کورس‌هایی که برای تدریس به کودکان نوشته شده‌اند — تلاوت، الفبای عربی، آن قصه‌هایی که باید نخست بشنوند. هر یکی از آن‌ها پیش از آمدن به این‌جا از بررسی علمی گذشته است.',
    'young.notice':
      'کودک خودش ثبت نام نمی‌کند. حساب را پدر و مادر یا سرپرست نگه می‌دارد، کودک را به‌عنوان شاگرد می‌افزاید و تصمیم می‌گیرد چه باز شود؛ استاد می‌تواند او را در حساب خودش ثبت کند. هیچ چیزی در این صفحه حساب کودک نیست و هیچ یکی از آن‌ها معلومات کودک نیست.',
    'young.everyAge': 'همه سنین',
    'young.emptyBand':
      'برای سنین {band} هنوز چیزی فهرست نشده است. سن دیگری یا همه فهرست را امتحان کنید.',
    'young.empty':
      'برای شاگردان جوان هنوز کورسی نشر نشده است. هر چیزی در این‌جا نخست باید از بررسی بگذرد.',
    'adults.eyebrow': 'بزرگسالان',
    'adults.title': 'درست بیاموزید.',
    'adults.lede':
      'کورس‌های نوشته‌شده برای بزرگسالان — صرف و نحو عربی، فقه، تفسیر، تجوید، به‌گونه‌ای عمیق. هر یکی از آن‌ها پیش از آمدن به این‌جا از بررسی علمی گذشته است، و هر چه بخرید از خودتان است: یک خرید، یک شاگرد.',
    'adults.notice':
      'این حساب خود شماست، نه حساب کودک. اگر در فامیل شما کودکی هم می‌آموزد، تغییردهنده شاگرد بدون آمیختن آن دو، از شما به او می‌رود.',
    'adults.empty':
      'برای بزرگسالان هنوز کورسی نشر نشده است. هر چیزی در این‌جا نخست باید از بررسی بگذرد.',

    'auth.forgotTitle': 'بازنشانی رمز',
    'auth.forgotLede':
      'آدرس ایمیل حساب خود را بنویسید. اگر ثبت شده باشد، لینک مطمئنی می‌فرستیم.',
    'auth.sendLink': 'ارسال لینک بازنشانی',
    'auth.sending': 'در حال ارسال…',
    'auth.resetSent':
      'اگر این آدرس در حسابی استفاده شود، لینک بازنشانی رمز در راه است. صندوق ورودی و پوشه هرزنامه را ببینید.',
    'auth.resetFailed': 'اکنون نتوانستیم لینک بازنشانی را بفرستیم. آدرس را ببینید و بعداً دوباره کوشش کنید.',
    'auth.backToSignIn': 'بازگشت به ورود',
    'auth.accountSettings': 'تنظیمات حساب',
    'auth.chooseTitle': 'رمز تازه‌ای انتخاب کنید',
    'auth.chooseLede': 'برای این حساب رمز تازه‌ای بگذارید. لینک بازنشانی تنها یک بار کار می‌کند.',
    'auth.newPassword': 'رمز تازه',
    'auth.confirmPassword': 'تأیید رمز تازه',
    'auth.noMatch': 'رمزها هم‌خوان نیستند.',
    'auth.enterPassword': 'رمز تازه خود را بنویسید.',
    'auth.updatePassword': 'به‌روز کردن رمز',
    'auth.updating': 'در حال به‌روز شدن…',
    'auth.offline': 'به سرور نرسیدیم. اتصال را ببینید و دوباره کوشش کنید.',

    'home.eyebrow': 'آموزش اسلامی، در سراسر جهان',
    'home.title': 'دین خود را بیاموزید، با آهنگی که به شما می‌آید.',
    'home.lede':
      'قرآن، عربی، فقه، حدیث و بیشتر — به دست استادان واجد شرایط، برای کودکان و بزرگسالان، هر جا که باشید.',
    'home.browse': 'دیدن فهرست کورس‌ها',
    'home.createAccount': 'ساختن حساب رایگان',
    'home.continue': 'ادامه آموزش',
    'home.paths': 'دیدن راه‌های آموزش',
    'home.note':
      'دیدن هیچ هزینه‌ای ندارد. وقتی ثبت نام می‌کنید پرداخت می‌کنید، برای یک شاگرد با نام، و از کودک هرگز آدرس ایمیل پرسیده نمی‌شود.',
    'home.meansEyebrow': 'این یعنی چه',
    'home.meansTitle': 'سه چیزی که این سامانه از انجام آن سر باز می‌زند',
    'home.assure1Title': 'پیش از فهرست شدن بررسی می‌شود',
    'home.assure1Body':
      'کورس‌ها از استادان واجد شرایط می‌آیند و کسی که در آن مضمون صلاحیت دارد آن‌ها را تأیید می‌کند. نویسنده نمی‌تواند کار خود را تأیید کند، و هر نشر ثبت می‌شود.',
    'home.assure2Title': 'ورود کودک را سرپرست او می‌سازد',
    'home.assure2Body':
      'کودک به‌گونه‌ای معمول زیر حساب پدر و مادر می‌آموزد و ورود خود را تنها وقتی می‌یابد که پدر و مادر آن را بسازند — نام کاربری که خودشان انتخاب می‌کنند و رمزی که خودشان می‌گذارند، و از کودک آدرس ایمیل پرسیده نمی‌شود. پدر و مادر می‌توانند آن را بدون دست زدن به هیچ درسی دوباره بردارند.',
    'home.assure3Title': 'سندی که هنوز بررسی‌شدنی است',
    'home.assure3Body':
      'هر یکی از آن‌ها شماره‌ای دارد که هر کسی می‌تواند جستجو کند، و اگر کورس بعداً برداشته شود هم بررسی‌شدنی می‌ماند.',
    'home.studyTitle': 'چه می‌توانید بیاموزید',
    'home.studyCountOne': '{count} مضمون، هر یکی توسط استادی که برای آن بررسی شده تدریس می‌شود.',
    'home.studyCountOther': '{count} مضمون، هر یکی توسط استادی که برای آن بررسی شده تدریس می‌شود.',
    'home.studyEmpty':
      'مضامین با افزودن کورس‌ها در این‌جا پیدا می‌شوند. فهرست کامل همیشه همان فهرست کورس‌هاست.',
    'home.doorChildBody':
      'برای شاگردان جوان نوشته شده، در حساب پدر و مادر یا سرپرست نگه داشته می‌شود، و ورود خود را تنها وقتی می‌یابد که آن بزرگسال آن را بسازد.',
    'home.doorAdultBody':
      'برای خودتان، در سطح خودتان بیاموزید، با اسنادی که می‌توانید به هر پرسنده‌ای نشان دهید.',
    'home.doorOpen': 'ببینید چه در آن‌جا است',
    'home.doorCatalogue': 'آن‌ها را در فهرست ببینید',
    'home.howTitle': 'چگونه کار می‌کند',
    'home.step': 'گام {number}',
    'home.step1Title': 'انتخاب کنید چه کسی می‌آموزد',
    'home.step1Body':
      'خودتان، یا کودکی که مسوولیت او را دارید. کورس برای یک شاگرد با نام خریداری می‌شود، بنابراین فامیلی که با هم می‌خرد می‌داند پیشرفت چه کسی از چه کسی است.',
    'home.step2Title': 'با آهنگ خود بیاموزید',
    'home.step2Body':
      'درس‌ها، پرسش‌های تمرینی که پاسخ را می‌بینند بی‌آن‌که نمره بدهند، و جایی که به یاد می‌سپارد در هر درسی که باز کرده‌اید کجا ایستاده‌اید.',
    'home.step3Title': 'بعد از آن چیزی بماند',
    'home.step3Body':
      'پیشرفت، رسیدی که هرگز دوباره نوشته نمی‌شود، و سندی که شماره‌اش سال‌ها بعد هم بررسی‌شدنی است.',
    'home.aboutLink': 'کورس چگونه به این‌جا می‌آید، و با معلومات کودک چه می‌شود',
    'home.teachEyebrow': 'برای استادان',
    'home.teachTitle': 'شاگردان خود را همراه بیاورید.',
    'home.teachBody1':
      'اگر از پیش تدریس می‌کنید، سامانه همان بخشی است که نباید خودتان بسازید: بخش‌ها و درس‌ها، بررسی به دست کسی که مضمون را می‌شناسد، قیمت‌هایی که با کارمندان گذاشته می‌شود، و آن‌چه به دست آورده‌اید به هر واحد پول در یک صفحه.',
    'home.teachBody2':
      'استادان نیمه هر فروش را نگه می‌دارند. تدریس در این‌جا با قرار است — صاحب سامانه استادان را یکی یکی می‌افزاید — و هنوز هیچ فراهم‌کننده‌ای پول نمی‌فرستد، بنابراین صفحه درآمد به‌جای ادعای فرستاده شدن، می‌گوید چه باقی مانده است.',
    'home.teachArea': 'بخش تدریس',
    'home.teachReview': 'کورس‌ها چگونه بررسی می‌شوند',
    'home.closingTitle': 'با فهرست کورس‌ها آغاز کنید.',
    'home.closingSignedOut':
      'هر کورس نشرشده با آن‌چه در آن است و کسی که آن را تدریس می‌کند فهرست شده است. وقتی یکی را یافتید که می‌خواهید نگه دارید، حساب بسازید.',
    'home.closingSignedIn':
      'هر کورس نشرشده با آن‌چه در آن است و کسی که آن را تدریس می‌کند فهرست شده است. ثبت‌نام‌ها، پیشرفت و اسناد شما در یک جا است.',

    'language.reviewed': 'گویشوری با زبان مادری این ترجمه را خوانده است.',
    'language.partial':
      'گویشوران بومی {read} از {total} بخش این ترجمه را خوانده‌اند.',
    'language.unreviewed':
      'هنوز گویشوری با زبان مادری این ترجمه را نخوانده است. آن را کسانی نوشته‌اند که سامانه را ساخته‌اند — اگر واژه‌ای نادرست به نظر می‌رسد، کوتاهی از ماست.',
    'language.notTranslated':
      'تنها رابط ترجمه می‌شود. نام کورس‌ها، درس‌ها، صفحه‌های استادان و پالیسی‌های نشرشده به زبانی که نوشته شده‌اند دیده می‌شوند.',
  },
};
