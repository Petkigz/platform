import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Oʻzbekcha — the first of the Central Asian catalogues.
 *
 * Uzbek is the most widely spoken Turkic language in the world and the first
 * language of a Muslim population of roughly thirty-five million, none of whom
 * this interface could address before today. It is written in Latin script here
 * because that is what Uzbekistan reads: the Cyrillic alphabet was retired in
 * 1993 and a menu that arrives in Cyrillic, however well meant, reads as a
 * document from before the reader was born.
 *
 * **This file is a whole catalogue, not a layer.** The older groups are layers —
 * a sign-in block here, a shelf block there — because they grew that way, one
 * screen at a time. A language added from nothing has no such history, and
 * splitting one language across eight files to imitate the shape of the others
 * would be ceremony: a reader checking whether Uzbek is finished wants one file
 * they can read top to bottom. `merge()` in `catalogues.ts` does not care which
 * file a string came from.
 *
 * Every placeholder from `en.ts` is reproduced verbatim — `{count}`, `{number}`,
 * `{year}`, `{query}`, `{band}`, `{phone}`, `{language}`, `{percent}`, `{page}`,
 * `{pages}`, `{from}`, `{to}`, `{total}`, `{hours}`, `{minutes}` — because a
 * sentence that quietly loses its number is worse than an untranslated one.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`,
 * printed on `/language`.
 */
export const ASIA_CENTRAL: Partial<Record<LocaleCode, Partial<Messages>>> = {
  uz: {
    'skip.toContent': 'Asosiy mazmunga oʻtish',

    'nav.main': 'Asosiy',
    'nav.catalogue': 'Katalog',
    'nav.learn': 'Taʼlimim',
    'nav.family': 'Oilam',
    'nav.plans': 'Tariflar',
    'nav.subscriptions': 'Obunalar',
    'nav.teach': 'Dars berish',
    'nav.review': 'Taqriz',
    'nav.certificates': 'Sertifikatlar',

    'footer.tagline': 'Bolalar va kattalar uchun islomiy taʼlim, butun dunyo boʻylab.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Biz haqimizda',
    'footer.terms': 'Shartlar va maxfiylik',
    'footer.help': 'Yordam',
    'footer.verify': 'Sertifikatni tekshirish',
    'footer.area': 'Sizning hududingiz',
    'footer.notifications': 'Bildirishnomalar',

    'action.signIn': 'Kirish',
    'action.getStarted': 'Boshlash',
    'action.signOut': 'Chiqish',
    'action.save': 'Saqlash',
    'action.cancel': 'Bekor qilish',

    'region.africa': 'Afrika',
    'region.middleEast': 'Yaqin Sharq',
    'region.asia': 'Osiyo',
    'region.west': 'Yevropa va Amerika',

    'language.title': 'Til',
    'language.lede':
      'Interfeys shu yerda tanlagan tilingizda koʻrsatiladi. Brauzer avval qurilmangiz soʻragan tildan boshlanadi va siz tanlamaguningizcha shunda qoladi.',
    'language.current': 'Hozir koʻrsatilmoqda',
    'language.chosen': 'Bu tilni shu brauzerda siz tanlagansiz.',
    'language.device': 'Bu qurilmangiz soʻragan til. Oʻzgartirish uchun quyidan birini tanlang.',
    'language.default':
      'Qurilmangiz bu interfeysda hali mavjud boʻlmagan tilni soʻradi, shuning uchun u ingliz tilida.',
    'language.pick': 'Interfeysni shu tilda koʻrsatish',
    'language.deviceOption': 'Qurilmamning tili',
    'language.change': 'Tilni oʻzgartirish',
    'language.saved': 'Saqlandi. Interfeys endi {language} tilida.',
    'language.coverage':
      'Ushbu interfeys matnlarining {percent}% {language} tiliga tarjima qilingan. Tarjima qilinmaganlari ingliz tilida koʻrsatiladi.',
    'language.coverageAll': 'Bu til toʻliq tarjima qilingan.',
    'language.browser':
      'Tanlov shu brauzerda saqlanadi, hisobingizda emas, shuning uchun boshqa qurilma oʻz tilini oʻzi soʻraydi.',

    'catalogue.title': 'Kurs topish',
    'catalogue.lede':
      'Har bir kurs eʼlon qilinishidan oldin tekshiriladi. Fan boʻyicha koʻrib chiqing yoki kurs, fan yoki muallimni qidiring.',
    'catalogue.doorChild': 'Taʼlim bolaga',
    'catalogue.doorAdult': 'Taʼlim menga',
    'catalogue.searchPlaceholder': 'Kurslar, fanlar, muallimlar…',
    'catalogue.searchPlaceholderLessons': 'Kurslar, darslar, fanlar, muallimlar…',
    'catalogue.searchLabel': 'Kurslarni qidirish',
    'catalogue.searchLabelLessons': 'Kurslar va darslarni qidirish',
    'catalogue.audience': 'Kim uchun',
    'catalogue.search': 'Qidirish',
    'catalogue.allSubjects': 'Barcha fanlar',
    'catalogue.anyLanguage': 'Istalgan til',
    'catalogue.languageRow': 'Kurs qaysi tilda oʻqitiladi',
    'catalogue.pages': 'Sahifalar',
    'catalogue.previous': 'Oldingi',
    'catalogue.next': 'Keyingi',
    'catalogue.pageOf': '{pages} sahifadan {page}-sahifa',
    'catalogue.emptyPage': 'Bu sahifada hech narsa yoʻq. U roʻyxat oxiridan keyin boʻlishi mumkin.',
    'catalogue.emptyQuery':
      '“{query}” boʻyicha hech narsa topilmadi. Fan, muallim ismi yoki darsdagi soʻzni sinab koʻring.',
    'catalogue.emptyQueryLessons': '“{query}” boʻyicha kurs topilmadi, ammo quyidagi darslar topildi.',
    'catalogue.emptyShelf':
      'Hozircha kurslar yoʻq. Muallim kursni eʼlon qilgach, u shu yerda paydo boʻladi — taqrizdan oʻtmaguncha hech narsa koʻrsatilmaydi.',
    'catalogue.countOne': '{count} kurs',
    'catalogue.countOther': '{count} kurs',
    'catalogue.showing': '{total} dan {from}–{to} koʻrsatilmoqda',

    'audience.child': 'Yosh oʻquvchilar',
    'audience.adult': 'Kattalar',
    'audience.both': 'Barcha yoshdagilar',

    'difficulty.beginner': 'Boshlangʻich',
    'difficulty.intermediate': 'Oʻrta',
    'difficulty.advanced': 'Yuqori',

    'price.free': 'Bepul',
    'price.included': 'Ruxsatingizga kiritilgan',
    'price.notOneOff': 'Bir martalik kurs sifatida sotilmaydi',
    'price.ambiguous': 'Narx uchun toʻgʻri valyuta kerak',
    'price.notAvailable': 'Hozircha mamlakatingizda mavjud emas',

    'card.sectionsOne': '{count} boʻlim',
    'card.sectionsOther': '{count} boʻlim',
    'card.lessonsOne': '{count} dars',
    'card.lessonsOther': '{count} dars',
    'card.minutes': '{count} daq',
    'card.hours': '{count} soat',
    'card.hoursMinutes': '{hours} soat {minutes} daq',

    'auth.signInTitle': 'Kirish',
    'auth.signUpTitle': 'Hisob yaratish',
    'auth.signInLede': 'Yana xush kelibsiz.',
    'auth.email': 'Elektron pochta',
    'auth.password': 'Parol',
    'auth.mobile': 'Telefon raqami',
    'auth.countryCode': 'Mamlakat kodi',
    'auth.otpCode': 'SMS kod',
    'auth.tabPassword': 'Pochta va parol',
    'auth.tabPhone': 'Telefon kodi',
    'auth.google': 'Google orqali davom etish',
    'auth.sendCode': 'Kod yuborish',
    'auth.verifyCode': 'Kodni tasdiqlash',
    'auth.resendCode': 'Kodni qayta yuborish',
    'auth.changeNumber': 'Raqamni oʻzgartirish',
    'auth.forgot': 'Parolni unutdingizmi?',
    'auth.noAccount': 'Hisob yaratish',
    'auth.haveAccount': 'Hisobingiz bormi?',
    'auth.working': 'Bajarilmoqda…',
    'auth.invalidPhone': 'Bu toʻgʻri telefon raqamiga oʻxshamaydi. Mamlakat kodini kiriting.',
    'auth.somethingWrong': 'Nimadir xato ketdi.',
    'auth.orGoogle': 'yoki bulardan birini ishlating',
    'auth.orCreate': 'yoki pochta yoki telefon raqami bilan hisob yarating',
    'auth.phoneAs': 'Bu raqam {phone} koʻrinishida saqlanadi',
    'auth.international': 'Allaqachon xalqaro formatda.',
    'auth.passwordNote': 'Biz uni hech qachon saqlamaymiz. Parolni Supabase Auth saqlaydi.',
    'auth.codeSent': 'Agar {phone} uchun hisob mavjud boʻlsa, kod yoʻlda.',
    'auth.codeResent': '{phone} raqamiga yangi kod yuborildi.',
    'auth.checkEmail':
      'Hisob yaratildi. Manzilni tasdiqlash uchun pochtangizni tekshiring, soʻng kiring.',
    'auth.accountCreated': '{phone} uchun hisob yaratildi.',

    'doors.askAdult': 'Oʻzingiz uchun qidiryapsizmi?',
    'doors.askChild': 'Bola uchun tanlayapsizmi?',
    'doors.adultsShelf': 'Kattalar javoni',
    'doors.youngShelf': 'Yosh oʻquvchilar javoni',
    'doors.wholeCatalogue': 'Butun katalog',
    'young.eyebrow': 'Yosh oʻquvchilar',
    'young.title': 'Avval bolalar.',
    'young.lede':
      'Bolalarga oʻqitish uchun yozilgan kurslar — qiroat, arab alifbosi, ular birinchi eshitishi kerak boʻlgan qissalar. Har biri bu yerga chiqishidan oldin ilmiy taqrizdan oʻtgan.',
    'young.notice':
      'Bola oʻz-oʻzidan roʻyxatdan oʻtmaydi. Hisobni ota-ona yoki vasiy yuritadi, bolani oʻquvchi sifatida qoʻshadi va nima ochilishini hal qiladi; muallim uni oʻz hisobiga yozib qoʻyishi mumkin. Bu sahifada hech narsa bolaning hisobi emas va hech biri bolaning maʼlumoti emas.',
    'young.everyAge': 'Barcha yosh',
    'young.emptyBand':
      '{band} yoshdagilar uchun hozircha hech narsa yoʻq. Boshqa yoshni yoki butun katalogni koʻrib koʻring.',
    'young.empty':
      'Yosh oʻquvchilar uchun hali kurs eʼlon qilinmagan. Bu yerdagi hamma narsa avval taqrizdan oʻtishi kerak.',
    'adults.eyebrow': 'Kattalar',
    'adults.title': 'Chuqur oʻrganing.',
    'adults.lede':
      'Kattalar uchun yozilgan kurslar — arab grammatikasi, fiqh, tafsir, tajvid, chuqur tarzda. Har biri bu yerga chiqishidan oldin ilmiy taqrizdan oʻtgan va sotib olganingiz sizniki: bir xarid, bir oʻquvchi.',
    'adults.notice':
      'Bu bolaning emas, sizning hisobingiz. Agar oilangizda bola ham oʻqisa, oʻquvchi almashtirgichi ikkalasini aralashtirmasdan sizdan unga oʻtadi.',
    'adults.empty':
      'Kattalar uchun hali kurs eʼlon qilinmagan. Bu yerdagi hamma narsa avval taqrizdan oʻtishi kerak.',

    'auth.forgotTitle': 'Parolni tiklash',
    'auth.forgotLede':
      'Hisobingizdagi elektron pochta manzilini kiriting. Agar u roʻyxatdan oʻtgan boʻlsa, xavfsiz havola yuboramiz.',
    'auth.sendLink': 'Tiklash havolasini yuborish',
    'auth.sending': 'Yuborilmoqda…',
    'auth.resetSent':
      'Agar bu manzil biror hisobda ishlatilsa, parolni tiklash havolasi yoʻlda. Pochta qutisi va spam jildini tekshiring.',
    'auth.resetFailed':
      'Hozir tiklash havolasini yubora olmadik. Manzilni tekshirib, keyinroq qayta urinib koʻring.',
    'auth.backToSignIn': 'Kirishga qaytish',
    'auth.accountSettings': 'Hisob sozlamalari',
    'auth.chooseTitle': 'Yangi parol tanlang',
    'auth.chooseLede': 'Bu hisob uchun yangi parol oʻrnating. Tiklash havolasi bir marta ishlaydi.',
    'auth.newPassword': 'Yangi parol',
    'auth.confirmPassword': 'Yangi parolni tasdiqlang',
    'auth.noMatch': 'Parollar mos kelmaydi.',
    'auth.enterPassword': 'Yangi parolingizni kiriting.',
    'auth.updatePassword': 'Parolni yangilash',
    'auth.updating': 'Yangilanmoqda…',
    'auth.offline': 'Serverga ulanib boʻlmadi. Aloqani tekshirib, qayta urinib koʻring.',

    'home.eyebrow': 'Islomiy taʼlim, butun dunyo boʻylab',
    'home.title': 'Diningizni oʻzingizga qulay surʼatda oʻrganing.',
    'home.lede':
      'Qurʼon, arab tili, fiqh, hadis va boshqalar — malakali muallimlar tomonidan bolalar va kattalarga, qayerda boʻlsangiz ham.',
    'home.browse': 'Katalogni koʻrish',
    'home.createAccount': 'Bepul hisob yaratish',
    'home.continue': 'Oʻqishni davom ettirish',
    'home.paths': 'Taʼlim yoʻllarini koʻrish',
    'home.note':
      'Koʻrish hech narsa turmaydi. Roʻyxatdan oʻtganingizda toʻlaysiz, bitta ismi koʻrsatilgan oʻquvchi uchun, va boladan hech qachon elektron pochta soʻralmaydi.',
    'home.meansEyebrow': 'Bu nimani anglatadi',
    'home.meansTitle': 'Platforma qilishdan bosh tortadigan uchta narsa',
    'home.assure1Title': 'Roʻyxatga olinishidan oldin tekshiriladi',
    'home.assure1Body':
      'Kurslar malakali muallimlardan keladi va shu fanga vakolatli odam tomonidan tasdiqlanadi. Muallif oʻz ishini oʻzi tasdiqlay olmaydi va har bir eʼlon qayd etiladi.',
    'home.assure2Title': 'Bolaning kirishi vasiysi tomonidan yaratiladi',
    'home.assure2Body':
      'Bola odatda ota-onasining hisobi ostida oʻqiydi va faqat ota-ona yaratgan taqdirda oʻz kirishiga ega boʻladi — oʻzlari tanlagan foydalanuvchi nomi va oʻzlari qoʻygan parol, boladan esa elektron pochta soʻralmaydi. Ota-ona hech bir darsga tegmasdan uni yana olib tashlashi mumkin.',
    'home.assure3Title': 'Hali ham tekshirib boʻladigan sertifikat',
    'home.assure3Body':
      'Har birida istalgan kishi qidirib topa oladigan raqam bor va kurs keyin olib tashlansa ham u tekshiriladigan boʻlib qoladi.',
    'home.studyTitle': 'Nimalarni oʻrganish mumkin',
    'home.studyCountOne': '{count} fan, har biri shu fan uchun tekshirilgan muallim tomonidan oʻqitiladi.',
    'home.studyCountOther': '{count} fan, har biri shu fan uchun tekshirilgan muallim tomonidan oʻqitiladi.',
    'home.studyEmpty':
      'Kurslar qoʻshilishi bilan fanlar shu yerda paydo boʻladi. Toʻliq roʻyxat har doim katalogda.',
    'home.doorChildBody':
      'Yosh oʻquvchilar uchun yozilgan, ota-ona yoki vasiy hisobida saqlanadi va oʻz kirishiga faqat oʻsha kattalar yaratganda ega boʻladi.',
    'home.doorAdultBody':
      'Oʻzingiz uchun, oʻz darajangizda oʻqing va soʻragan har kimga koʻrsata oladigan sertifikatlarga ega boʻling.',
    'home.doorOpen': 'U yerda nima borligini koʻring',
    'home.doorCatalogue': 'Ularni katalogda koʻring',
    'home.howTitle': 'Bu qanday ishlaydi',
    'home.step': '{number}-qadam',
    'home.step1Title': 'Kim oʻqishini tanlang',
    'home.step1Body':
      'Oʻzingiz yoki javobgarligingizdagi bola. Kurs bitta ismi koʻrsatilgan oʻquvchi uchun sotib olinadi, shuning uchun birga sotib olgan oila kimning yutugʻi kimniki ekanini biladi.',
    'home.step2Title': 'Oʻz surʼatingizda oʻqing',
    'home.step2Body':
      'Darslar, javobni baholamasdan tekshiradigan mashq savollari va ochgan har bir darsingizda qayerda toʻxtaganini eslab qoladigan joy.',
    'home.step3Title': 'Keyin ham bir narsa qolsin',
    'home.step3Body':
      'Yutuqlar, hech qachon qayta yozilmaydigan kvitansiya va raqamini yillar oʻtib ham tekshirish mumkin boʻlgan sertifikat.',
    'home.aboutLink': 'Kurs bu yerga qanday keladi va bolaning maʼlumotiga nima boʻladi',
    'home.teachEyebrow': 'Muallimlar uchun',
    'home.teachTitle': 'Oʻquvchilaringizni olib keling.',
    'home.teachBody1':
      'Agar allaqachon dars bersangiz, platforma — siz oʻzingiz qurmasligingiz kerak boʻlgan qism: boʻlimlar va darslar, fanni biladigan odam tomonidan taqriz, xodimlar bilan belgilangan narxlar va topganingiz har bir valyutada bitta sahifada.',
    'home.teachBody2':
      'Muallimlar har bir savdoning yarmini saqlab qoladi. Bu yerda dars berish kelishuv asosida — platforma egasi muallimlarni birma-bir qoʻshadi — va hozircha hech bir provayder pul oʻtkazmaydi, shuning uchun daromad sahifasi yuborilganini daʼvo qilish oʻrniga nima qarz ekanini aytadi.',
    'home.teachArea': 'Dars berish hududi',
    'home.teachReview': 'Kurslar qanday taqriz qilinadi',
    'home.closingTitle': 'Katalogdan boshlang.',
    'home.closingSignedOut':
      'Har bir eʼlon qilingan kurs ichida nima borligi va kim oʻqitishi bilan roʻyxatga olingan. Saqlab qolmoqchi boʻlganingizni topganingizda hisob yarating.',
    'home.closingSignedIn':
      'Har bir eʼlon qilingan kurs ichida nima borligi va kim oʻqitishi bilan roʻyxatga olingan. Yozilishlaringiz, yutuqlaringiz va sertifikatlaringiz bir joyda.',

    'language.reviewed': 'Bu tarjimani ona tilida soʻzlashuvchi oʻqib chiqqan.',
    'language.unreviewed':
      'Bu tarjimani hali ona tilida soʻzlashuvchi oʻqimagan. Uni platformani qurganlar yozgan — biror soʻz sizga notoʻgʻri tuyulsa, xato bizniki.',
    'language.notTranslated':
      'Faqat interfeys tarjima qilinadi. Kurs nomlari, darslar, muallim sahifalari va eʼlon qilingan qoidalar yozilgan tilida koʻrinadi.',
  },
};
