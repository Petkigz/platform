import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * پښتو — Pashto.
 *
 * Right to left, and the first language in the register added since the
 * interface gained a mirrored shell — so it is also the first test of whether
 * the shell really is written in logical properties rather than left and right.
 * It is: the layout, the arrows and the pager all read from `direction`, and
 * nothing here needs a special case.
 *
 * Pashto is the first language of perhaps sixty million people across
 * Afghanistan and Pakistan, and of the languages the platform now speaks it is
 * the one with the least software written in it for a parent to trust. That is
 * the reason it is here, and the reason a reader is told plainly that no
 * first-language speaker has checked it yet.
 *
 * A whole catalogue in one file: see `asia-uz.ts`.
 *
 * Every placeholder from `en.ts` survives — `{count}`, `{number}`, `{year}`,
 * `{query}`, `{band}`, `{phone}`, `{language}`, `{percent}`, `{page}`, `{pages}`,
 * `{from}`, `{to}`, `{total}`, `{hours}`, `{minutes}`.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`.
 */
export const ASIA_PS: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ps: {
    'skip.toContent': 'منځپانګې ته ورشه',

    'nav.main': 'اصلي',
    'nav.catalogue': 'لړلیک',
    'nav.learn': 'زده‌کړه',
    'nav.family': 'کورنۍ',
    'nav.plans': 'پلانونه',
    'nav.subscriptions': 'ګډونونه',
    'nav.teach': 'تدریس',
    'nav.review': 'بیاکتنه',
    'nav.certificates': 'سندونه',

    'footer.tagline': 'د ماشومانو او لویانو لپاره اسلامي زده‌کړه، په ټوله نړۍ کې.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'زموږ په اړه',
    'footer.terms': 'شرطونه او محرمیت',
    'footer.help': 'مرسته',
    'footer.verify': 'سند وګوره',
    'footer.area': 'ستاسو سیمه',
    'footer.notifications': 'خبرتیاوې',

    'action.signIn': 'ننوتل',
    'action.getStarted': 'پیل کړه',
    'action.signOut': 'وتل',
    'action.save': 'خوندي کړه',
    'action.cancel': 'لغوه کړه',

    'region.africa': 'افریقا',
    'region.middleEast': 'منځنی ختیځ',
    'region.asia': 'آسیا',
    'region.west': 'اروپا او امریکا',

    'language.title': 'ژبه',
    'language.lede':
      'برخه دلته د هغې ژبې له مخې ښودل کېږي چې تاسو ټاکئ. براوزر لومړی د ستاسو د وسیلې غوښتل شوې ژبه کاروي او تر هغې پرې ولاړ وي چې تاسو بله وټاکئ.',
    'language.current': 'اوس ښودل کېږي',
    'language.chosen': 'دا ژبه مو په دې براوزر کې ټاکلې ده.',
    'language.device': 'دا هغه ژبه ده چې ستاسو وسیلې غوښتې ده. د بدلون لپاره لاندې یوه وټاکئ.',
    'language.default':
      'ستاسو وسیلې یوه ژبه غوښتله چې دا برخه یې نه لري، نو اوس په انګلیسي کې ده.',
    'language.pick': 'برخه په دې ژبه وښایه',
    'language.deviceOption': 'زما د وسیلې ژبه',
    'language.change': 'ژبه بدله کړه',
    'language.saved': 'خوندي شوه. برخه اوس په {language} ژبه ده.',
    'language.coverage':
      'د دې برخې {percent}% متنونه {language} ژبې ته ژباړل شوي دي. ناژباړل شوي په انګلیسي ښودل کېږي.',
    'language.coverageAll': 'دا ژبه په بشپړه توګه ژباړل شوې ده.',
    'language.browser':
      'ټاکنه په دې براوزر کې ساتل کېږي، نه ستاسو په حساب کې، نو بله وسیله به خپله ژبه پخپله وپوښتي.',

    'catalogue.title': 'کورس ومومه',
    'catalogue.lede':
      'هر کورس د خپرېدو دمخه بیاکتل کېږي. د مضمون له مخې وګوره، یا کورس، مضمون یا ښوونکی ولټوه.',
    'catalogue.doorChild': 'زده‌کړه د ماشوم لپاره',
    'catalogue.doorAdult': 'زده‌کړه زما لپاره',
    'catalogue.searchPlaceholder': 'کورسونه، مضمونونه، ښوونکي…',
    'catalogue.searchPlaceholderLessons': 'کورسونه، درسونه، مضمونونه، ښوونکي…',
    'catalogue.searchLabel': 'کورسونه ولټوه',
    'catalogue.searchLabelLessons': 'کورسونه او درسونه ولټوه',
    'catalogue.audience': 'د چا لپاره',
    'catalogue.search': 'لټون',
    'catalogue.allSubjects': 'ټول مضمونونه',
    'catalogue.anyLanguage': 'هره ژبه',
    'catalogue.languageRow': 'کورس په کومه ژبه تدریس کېږي',
    'catalogue.pages': 'پاڼې',
    'catalogue.previous': 'مخکینی',
    'catalogue.next': 'بل',
    'catalogue.pageOf': 'د {pages} پاڼو څخه {page} پاڼه',
    'catalogue.emptyPage': 'په دې پاڼه کې هېڅ نشته. کېدای شي د لړلیک له پای وروسته وي.',
    'catalogue.emptyQuery':
      '«{query}» سره هېڅ ونه موندل شو. یو مضمون، د ښوونکي نوم یا د یوه درس یوه کلمه وآزمویه.',
    'catalogue.emptyQueryLessons': '«{query}» سره کورس ونه موندل شو، خو لاندې درسونه وموندل شول.',
    'catalogue.emptyShelf':
      'لا کورسونه نشته. کله چې ښوونکی یو کورس خپور کړي، دلته به ښکاره شي — تر بیاکتنې تېرېدو دمخه هېڅ نه ښودل کېږي.',
    'catalogue.countOne': '{count} کورس',
    'catalogue.countOther': '{count} کورسونه',
    'catalogue.showing': 'د {total} څخه {from}–{to} ښودل کېږي',

    'audience.child': 'جوان زده‌کوونکي',
    'audience.adult': 'لویان',
    'audience.both': 'ټول عمرونه',

    'difficulty.beginner': 'پیل کوونکی',
    'difficulty.intermediate': 'منځنی',
    'difficulty.advanced': 'پرمختللی',

    'price.free': 'وړیا',
    'price.included': 'ستاسو په لاسرسي کې شامل',
    'price.notOneOff': 'د یو ځلي کورس په توګه نه پلورل کېږي',
    'price.ambiguous': 'بیې ته سمه اسعارو پکار ده',
    'price.notAvailable': 'لا ستاسو په هېواد کې نشته',

    'card.sectionsOne': '{count} برخه',
    'card.sectionsOther': '{count} برخې',
    'card.lessonsOne': '{count} درس',
    'card.lessonsOther': '{count} درسونه',
    'card.minutes': '{count} دقیقې',
    'card.hours': '{count} ساعت',
    'card.hoursMinutes': '{hours} ساعت {minutes} دقیقې',

    'auth.signInTitle': 'ننوتل',
    'auth.signUpTitle': 'حساب جوړول',
    'auth.signInLede': 'بیا هم ښه راغلاست.',
    'auth.email': 'بریښنالیک',
    'auth.password': 'پټنوم',
    'auth.mobile': 'د موبایل شمېره',
    'auth.countryCode': 'د هېواد کوډ',
    'auth.otpCode': 'د SMS کوډ',
    'auth.tabPassword': 'بریښنالیک او پټنوم',
    'auth.tabPhone': 'د تلیفون کوډ',
    'auth.google': 'له Google سره دوام',
    'auth.sendCode': 'کوډ ولېږه',
    'auth.verifyCode': 'کوډ تایید کړه',
    'auth.resendCode': 'کوډ بیا ولېږه',
    'auth.changeNumber': 'شمېره بدله کړه',
    'auth.forgot': 'پټنوم مو هېر شو؟',
    'auth.noAccount': 'حساب جوړ کړه',
    'auth.haveAccount': 'حساب لرئ؟',
    'auth.working': 'کار روان دی…',
    'auth.invalidPhone': 'دا سمه تلیفون شمېره نه ښکاري. د هېواد کوډ هم ولیکه.',
    'auth.somethingWrong': 'یو څه سم نه شو.',
    'auth.orGoogle': 'یا له دې یوه کار واخله',
    'auth.orCreate': 'یا په بریښنالیک یا تلیفون شمېره حساب جوړ کړه',
    'auth.phoneAs': 'به د {phone} په ډول خوندي شي',
    'auth.international': 'له سره په نړیوال بڼه کې دی.',
    'auth.passwordNote': 'موږ یې هېڅکله نه ساتو. پټنوم Supabase Auth ساتي.',
    'auth.codeSent': 'که د {phone} لپاره حساب وي، کوډ په لاره کې دی.',
    'auth.codeResent': 'نوی کوډ {phone} ته ولېږل شو.',
    'auth.checkEmail': 'حساب جوړ شو. د پتې تایید لپاره خپل بریښنالیک وګوره، بیا ننوځه.',
    'auth.accountCreated': 'د {phone} لپاره حساب جوړ شو.',

    'doors.askAdult': 'د ځان لپاره ګرځې؟',
    'doors.askChild': 'د ماشوم لپاره ټاکې؟',
    'doors.adultsShelf': 'د لویانو الماري',
    'doors.youngShelf': 'د جوانانو الماري',
    'doors.wholeCatalogue': 'ټول لړلیک',
    'young.eyebrow': 'جوان زده‌کوونکي',
    'young.title': 'لومړی ماشومان.',
    'young.lede':
      'هغه کورسونه چې د ماشومانو د تدریس لپاره لیکل شوي — تلاوت، عربي الفبا، هغه کیسې چې لومړی باید واوري. هر یو یې دلته د ښکارېدو دمخه علمي بیاکتنه تېره کړې ده.',
    'young.notice':
      'ماشوم پخپله نوم نه لیکي. حساب یې مور او پلار یا سرپرست ساتي، ماشوم د زده‌کوونکي په توګه ورزیاتوي او پرېکړه کوي چې څه پرانیستل شي؛ ښوونکی یې په خپل حساب کې نوم لیکلی شي. په دې پاڼه کې هېڅ د ماشوم حساب نه دی او هېڅ یې د ماشوم معلومات نه دي.',
    'young.everyAge': 'ټول عمرونه',
    'young.emptyBand':
      'د {band} کلونو لپاره لا هېڅ نه دی لیست شوی. بل عمر یا ټول لړلیک وآزمویه.',
    'young.empty':
      'د جوانانو لپاره لا کورس نه دی خپور شوی. دلته هر څه لومړی بیاکتنه تېرول پکار دي.',
    'adults.eyebrow': 'لویان',
    'adults.title': 'په سمه توګه یې زده کړه.',
    'adults.lede':
      'د لویانو لپاره لیکل شوي کورسونه — عربي ګرامر، فقه، تفسیر، تجوید، په ژوره توګه. هر یو یې دلته د ښکارېدو دمخه علمي بیاکتنه تېره کړې ده، او هر څه چې واخله ستاسو دي: یو پیرود، یو زده‌کوونکی.',
    'adults.notice':
      'دا ستاسو حساب دی، نه د ماشوم. که په کورنۍ کې ماشوم هم زده کوي، د زده‌کوونکي بدلوونکی له توپیر پرته له تاسو هغه ته ځي.',
    'adults.empty':
      'د لویانو لپاره لا کورس نه دی خپور شوی. دلته هر څه لومړی بیاکتنه تېرول پکار دي.',

    'auth.forgotTitle': 'پټنوم بیا ومومه',
    'auth.forgotLede':
      'هغه بریښنالیک ولیکه چې ستاسو په حساب کې دی. که ثبت وي، به یو خوندي لینک ولېږو.',
    'auth.sendLink': 'د بیا موندنې لینک ولېږه',
    'auth.sending': 'لېږل کېږي…',
    'auth.resetSent':
      'که دا پته د یوه حساب لپاره وي، د پټنوم د بیا موندنې لینک په لاره کې دی. خپل انباکس او سپم فولډر وګوره.',
    'auth.resetFailed': 'اوس د بیا موندنې لینک نه شو لېږلی. پته وګوره او بیا وروسته هڅه وکړه.',
    'auth.backToSignIn': 'ننوتلو ته بېرته',
    'auth.accountSettings': 'د حساب تنظیمات',
    'auth.chooseTitle': 'نوی پټنوم وټاکه',
    'auth.chooseLede': 'د دې حساب لپاره نوی پټنوم وټاکه. د بیا موندنې لینک یوازې یو ځل کار کوي.',
    'auth.newPassword': 'نوی پټنوم',
    'auth.confirmPassword': 'نوی پټنوم تایید کړه',
    'auth.noMatch': 'پټنومونه سره نه ځي.',
    'auth.enterPassword': 'خپل نوی پټنوم ولیکه.',
    'auth.updatePassword': 'پټنوم نوی کړه',
    'auth.updating': 'نوی کېږي…',
    'auth.offline': 'سرور ته ونه رسېدو. اړیکه وګوره او بیا هڅه وکړه.',

    'home.eyebrow': 'اسلامي زده‌کړه، په ټوله نړۍ کې',
    'home.title': 'خپل دین زده کړه، په هغه تېزۍ چې تاته ښه وي.',
    'home.lede':
      'قرآن، عربي، فقه، حدیث او نور — د وړ ښوونکو لخوا ماشومانو او لویانو ته، هر چېرې چې یې.',
    'home.browse': 'لړلیک وګوره',
    'home.createAccount': 'وړیا حساب جوړ کړه',
    'home.continue': 'زده‌کړه ته دوام ورکړه',
    'home.paths': 'د زده‌کړې لارې وګوره',
    'home.note':
      'کتل هېڅ لګښت نه لري. کله چې نوم ولیکې بیې ورکړې، د یوه نوم لرونکي زده‌کوونکي لپاره، او له ماشوم څخه هېڅکله بریښنالیک نه پوښتل کېږي.',
    'home.meansEyebrow': 'دا څه معنا لري',
    'home.meansTitle': 'درې شیان چې سامانه یې کول ردوي',
    'home.assure1Title': 'د لیست کېدو دمخه بیاکتل کېږي',
    'home.assure1Body':
      'کورسونه له وړ ښوونکو راځي او هغه څوک یې تاییدوي چې په دې مضمون کې واک لري. لیکوال خپل کار پخپله تاییدولی نه شي، او هر خپرېدل ثبت کېږي.',
    'home.assure2Title': 'د ماشوم ننوتل یې سرپرست جوړوي',
    'home.assure2Body':
      'ماشوم معمولاً د مور او پلار تر حساب لاندې زده کوي، او خپل ننوتل یوازې هغه وخت ترلاسه کوي چې مور او پلار یې جوړ کړي — هغه کارن نوم چې دوی ټاکي او هغه پټنوم چې دوی اېږدي، او له ماشوم څخه بریښنالیک نه پوښتل کېږي. مور او پلار یې بې له دې چې کوم درس ته لاس ووهي بیا لرې کولی شي.',
    'home.assure3Title': 'هغه سند چې لا هم کتلی شي',
    'home.assure3Body':
      'هر یو یې یوه شمېره لري چې هر څوک یې لټولی شي، او که کورس وروسته لرې هم شي، د کتلو وړ پاتې کېږي.',
    'home.studyTitle': 'څه زده کولی شې',
    'home.studyCountOne': '{count} مضمون، هر یو د هغه مضمون لپاره بیاکتل شوي ښوونکي لخوا تدریس کېږي.',
    'home.studyCountOther': '{count} مضمونونه، هر یو د هغه مضمون لپاره بیاکتل شوي ښوونکي لخوا تدریس کېږي.',
    'home.studyEmpty':
      'مضمونونه دلته ښکاري کله چې کورسونه ورزیات شي. بشپړ لیست هېڅکله د کورسونو لړلیک دی.',
    'home.doorChildBody':
      'د جوان زده‌کوونکو لپاره لیکل شوی، د مور او پلار یا سرپرست په حساب کې ساتل کېږي، او خپل ننوتل یوازې هغه وخت ترلاسه کوي چې هغه لوی وګړی یې جوړ کړي.',
    'home.doorAdultBody':
      'د ځان لپاره، په خپله کچه زده کړه، له هغو سندونو سره چې هر پوښتونکي ته یې ښودلی شې.',
    'home.doorOpen': 'وګوره چې هلته څه دي',
    'home.doorCatalogue': 'هغه په لړلیک کې وګوره',
    'home.howTitle': 'څنګه کار کوي',
    'home.step': '{number} ګام',
    'home.step1Title': 'وټاکه چې څوک زده کوي',
    'home.step1Body':
      'ته پخپله، یا هغه ماشوم چې ته یې مسوول یې. کورس د یوه نوم لرونکي زده‌کوونکي لپاره اخیستل کېږي، نو هغه کورنۍ چې یو ځای اخلي پوهېږي چې د چا پرمختګ د چا دی.',
    'home.step2Title': 'په خپله تېزۍ زده کړه',
    'home.step2Body':
      'درسونه، هغه تمریني پوښتنې چې ځواب ګوري خو نمره نه ورکوي، او هغه ځای چې په هر پرانیستل شوي درس کې د بندېدو ځای په یاد ساتي.',
    'home.step3Title': 'وروسته یو څه پرېږده',
    'home.step3Body':
      'پرمختګ، هغه رسید چې هېڅکله بیا نه لیکل کېږي، او هغه سند چې شمېره یې کلونه وروسته هم کتل کېږي.',
    'home.aboutLink': 'کورس دلته څنګه راځي، او د ماشوم معلوماتو سره څه کېږي',
    'home.teachEyebrow': 'د ښوونکو لپاره',
    'home.teachTitle': 'خپل زده‌کوونکي راوړه.',
    'home.teachBody1':
      'که لا دمخه تدریس کوې، سامانه هغه برخه ده چې ته یې نه جوړول پکار دي: برخې او درسونه، بیاکتنه د هغه چا لخوا چې مضمون پېژني، بیې چې له کارکونکو سره ټاکل کېږي، او هغه څه چې ګټلي یې په هر اسعارو کې په یوه پاڼه کې.',
    'home.teachBody2':
      'ښوونکي د هر پلور نیمه ساتي. دلته تدریس په هوکړه ده — د سامانې خاوند ښوونکي یو په یو ورزیاتوي — او لا هېڅ خدمت‌وړونکی پیسې نه لېږدوي، نو د عاید پاڼه د دې پر ځای چې ووايي لېږل شوې، وايي څه پاتې دي.',
    'home.teachArea': 'د تدریس سیمه',
    'home.teachReview': 'کورسونه څنګه بیاکتل کېږي',
    'home.closingTitle': 'له لړلیک پیل کړه.',
    'home.closingSignedOut':
      'هر خپور شوی کورس د خپل منځپانګې او ښوونکي سره لیست شوی. کله چې وغواړې یو وساتې، حساب جوړ کړه.',
    'home.closingSignedIn':
      'هر خپور شوی کورس د خپل منځپانګې او ښوونکي سره لیست شوی. ستاسو نوم‌لیکنې، پرمختګ او سندونه په یوه ځای کې دي.',

    'language.reviewed': 'دې ژباړې ته یوه مورنۍ ژبې ویناواله کتلي ده.',
    'language.partial':
      'مورنې ژبې ویونکو د دې ژباړې له {total} برخو {read} برخې لوستلې دي.',
    'language.unreviewed':
      'دې ژباړې ته لا یوه مورنۍ ژبې ویناواله نه ده کتلي. هغو کسانو لیکلې ده چې سامانه یې جوړه کړې — که یوه کلمه سمه نه ښکاري، خطا زموږ ده.',
    'language.notTranslated':
      'یوازې برخه ژباړل کېږي. د کورسونو نومونه، درسونه، د ښوونکو پاڼې او خپرې شوې تګلارې په هغه ژبه ښکاري چې لیکل شوې دي.',
  },
};
