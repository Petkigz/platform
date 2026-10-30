import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Türkmençe — Turkmen.
 *
 * About seven million speakers, most of them in Turkmenistan, with large
 * communities in Iran, Afghanistan and Iraq. **Written here in Latin**, which is
 * the alphabet Turkmenistan adopted in 1993 and the one a reader in Ashgabat meets
 * on a form. The Turkmen of Afghanistan and Iraq read Arabic script instead, and
 * they are not served by this file — an honest gap, noted rather than papered
 * over: a Turkmen speaker from Herat will find `ps`, `fa-af` and `ur` more useful
 * than a Latin transliteration of their own language.
 *
 * Turkmen has letters English does not — ä, ç, ž, ň, ö, ş, ü, ý — and they are
 * used properly here rather than folded into ASCII, because `öwrenmek` written as
 * `owrenmek` is a different word to a Turkmen reader.
 *
 * A whole catalogue in one file, 191 keys, every placeholder from `en.ts`
 * reproduced verbatim.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`.
 */
export const ASIA_TK: Partial<Record<LocaleCode, Partial<Messages>>> = {
  tk: {
    'skip.toContent': 'Mazmuna geçiň',

    'nav.main': 'Esasy',
    'nav.catalogue': 'Katalog',
    'nav.learn': 'Meniň okuwym',
    'nav.family': 'Meniň maşgalam',
    'nav.plans': 'Meýilnamalar',
    'nav.subscriptions': 'Abunalar',
    'nav.teach': 'Öwretmek',
    'nav.review': 'Barlag',
    'nav.certificates': 'Şahadatnamalar',

    'footer.tagline': 'Çagalar we ulular üçin yslam bilimi, dünýäboýunça.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Biz barada',
    'footer.terms': 'Şertler we gizlinlik',
    'footer.help': 'Kömek',
    'footer.verify': 'Şahadatnamany barlamak',
    'footer.area': 'Siziň sebitiňiz',
    'footer.notifications': 'Bildirişler',

    'action.signIn': 'Girmek',
    'action.getStarted': 'Başlamak',
    'action.signOut': 'Çykmak',
    'action.save': 'Saklamak',
    'action.cancel': 'Ýatyrmak',

    'region.africa': 'Afrika',
    'region.middleEast': 'Orta Gündogar',
    'region.asia': 'Aziýa',
    'region.west': 'Ýewropa we Amerika',

    'language.title': 'Dil',
    'language.lede':
      'Interfeýs şu ýerde saýlan diliňizde görkezilýär. Brauzer enjamyňyzyň haýyş eden dilinden başlaýar we siz başga dil saýlanyňyza çenli şol dilde dowam edýär.',
    'language.current': 'Häzir görkezilýär',
    'language.chosen': 'Bu dili şu brauzerde siz saýladyňyz.',
    'language.device':
      'Bu enjamyňyzyň haýyş eden dilidir. Üýtgetmek üçin aşakdakylardan birini saýlaň.',
    'language.default':
      'Enjamyňyz şu interfeýsde ýok dili haýyş etdi, şonuň üçin ol iňlis dilinde.',
    'language.pick': 'Interfeýsi şu dilde görkez',
    'language.deviceOption': 'Enjamymyň dili',
    'language.change': 'Dili üýtgetmek',
    'language.saved': 'Saklandy. Interfeýs indi {language} dilinde.',
    'language.coverage':
      'Bu interfeýs setirleriniň {percent}% {language} diline terjime edildi. Heniz terjime edilmedikleri iňlis dilinde görkezilýär.',
    'language.coverageAll': 'Bu dil doly terjime edildi.',
    'language.browser':
      'Saýlaw şu brauzerde saklanýar, hasabyňyzda däl, şonuň üçin başga enjam öz dilini soraýar.',

    'catalogue.title': 'Kurs tapmak',
    'catalogue.lede':
      'Her kurs çap edilmezden öň barlanýar. Ders boýunça göz aýlaň ýa-da kurs, ders ýa mugallym gözläň.',
    'catalogue.doorChild': 'Okuw çaga üçin',
    'catalogue.doorAdult': 'Okuw meniň üçin',
    'catalogue.searchPlaceholder': 'Kurslary, dersleri, mugallymlary gözlemek…',
    'catalogue.searchPlaceholderLessons':
      'Kurslary, sapaklary, dersleri, mugallymlary gözlemek…',
    'catalogue.searchLabel': 'Kurslary gözlemek',
    'catalogue.searchLabelLessons': 'Kurslary we sapaklary gözlemek',
    'catalogue.audience': 'Kim üçin',
    'catalogue.search': 'Gözlemek',
    'catalogue.allSubjects': 'Ähli dersler',
    'catalogue.anyLanguage': 'Islendik dil',
    'catalogue.languageRow': 'Kursyň okadylýan dili',
    'catalogue.pages': 'Sahypalar',
    'catalogue.previous': 'Öňki',
    'catalogue.next': 'Indiki',
    'catalogue.pageOf': '{pages} sahypanyň {page}-njysy',
    'catalogue.emptyPage':
      'Bu sahypada hiç zat ýok. Ol sanawyň soňundan geçen bolmagy mümkin.',
    'catalogue.emptyQuery':
      '«{query}» bilen hiç zat gabat gelmedi. Bir dersi, mugallymyň adyny ýa-da sapakdan bir sözi synanyşyň.',
    'catalogue.emptyQueryLessons':
      '«{query}» bilen hiç bir kurs gabat gelmedi, ýöne aşakdaky sapaklar gabat geldi.',
    'catalogue.emptyShelf':
      'Häzir kurs ýok. Mugallym birini çap edeninden soň ol şu ýerde peýda bolar — barlagdan geçmänçä hiç zat görkezilmeýär.',
    'catalogue.countOne': '{count} kurs',
    'catalogue.countOther': '{count} kurs',
    'catalogue.showing': '{total} sanysyndan {from}–{to} görkezilýär',

    'audience.child': 'Ýaş okuwçylar',
    'audience.adult': 'Ulular',
    'audience.both': 'Ähli ýaşlar',

    'difficulty.beginner': 'Başlangyç',
    'difficulty.intermediate': 'Orta',
    'difficulty.advanced': 'Ýokary',

    'price.free': 'Mugt',
    'price.included': 'Elýeterliligiňize girýär',
    'price.notOneOff': 'Bir gezeklik kurs hökmünde satylmaýar',
    'price.ambiguous': 'Bahanyň dogry walýuta gerek',
    'price.notAvailable': 'Ýurduňyzda heniz elýeterli däl',

    'card.sectionsOne': '{count} bölüm',
    'card.sectionsOther': '{count} bölüm',
    'card.lessonsOne': '{count} sapak',
    'card.lessonsOther': '{count} sapak',
    'card.minutes': '{count} min',
    'card.hours': '{count} sag',
    'card.hoursMinutes': '{hours} sag {minutes} min',

    'auth.signInTitle': 'Girmek',
    'auth.signUpTitle': 'Hasap döretmek',
    'auth.signInLede': 'Hoş geldiňiz.',
    'auth.email': 'E-poçta',
    'auth.password': 'Açar söz',
    'auth.mobile': 'Jübi telefony belgisi',
    'auth.countryCode': 'Ýurt kody',
    'auth.otpCode': 'SMS kod',
    'auth.tabPassword': 'E-poçta we açar söz',
    'auth.tabPhone': 'Telefon kody',
    'auth.google': 'Google bilen dowam etmek',
    'auth.sendCode': 'Kod ibermek',
    'auth.verifyCode': 'Kody tassyklamak',
    'auth.resendCode': 'Kody gaýtadan ibermek',
    'auth.changeNumber': 'Belgini üýtgetmek',
    'auth.forgot': 'Açar sözi ýatdan çykardyňyzmy?',
    'auth.noAccount': 'Hasap döretmek',
    'auth.haveAccount': 'Hasabyňyz barmy?',
    'auth.working': 'Işlenýär…',
    'auth.invalidPhone': 'Bu dogry telefon belgisine meňzemeýär. Ýurt koduny goşuň.',
    'auth.somethingWrong': 'Bir ýalňyşlyk boldy.',
    'auth.orGoogle': 'ýa-da bularyň birini ulanyň',
    'auth.orCreate': 'ýa-da e-poçta ýa telefon belgisi bilen hasap dörediň',
    'auth.phoneAs': '{phone} hökmünde saklanar',
    'auth.international': 'Eýýäm halkara görnüşinde.',
    'auth.passwordNote': 'Biz ony hiç haçan saklamaýarys. Açar sözi Supabase Auth saklaýar.',
    'auth.codeSent': 'Eger {phone} üçin hasap bar bolsa, kod ýolda.',
    'auth.codeResent': '{phone} belgisine täze kod iberildi.',
    'auth.checkEmail':
      'Hasap döredildi. Salgysyny tassyklamak üçin e-poçtaňyzy barlaň, soňra giriň.',
    'auth.accountCreated': '{phone} üçin hasap döredildi.',

    'doors.askAdult': 'Özüňiz üçin gözleýärsiňizmi?',
    'doors.askChild': 'Çaga üçin saýlaýarsyňyzmy?',
    'doors.adultsShelf': 'Ulularyň tekjesi',
    'doors.youngShelf': 'Ýaş okuwçylaryň tekjesi',
    'doors.wholeCatalogue': 'Ähli katalog',

    'young.eyebrow': 'Ýaş okuwçylar',
    'young.title': 'Ilki bilen çagalar üçin.',
    'young.lede':
      'Çagalara öwretmek üçin ýazylan kurslar — kyraat, arap elipbiýi, olaryň ilki eşitmelidiği hekaýatlar. Olaryň her biri şu ýerde peýda bolmazdan öň ylmy barlagdan geçdi.',
    'young.notice':
      'Çaga özi ýazylmaýar. Hasaby ene-ata ýa-da howandary saklaýar, çagany okuwçy hökmünde goşýar we näme açyljagyny kesgitleýär; mugallym ony öz hasabyna ýazyp biler. Bu sahypadaky hiç zat çaganyň hasaby däl we hiç zady çaganyň maglumaty däl.',
    'young.everyAge': 'Ähli ýaş',
    'young.emptyBand':
      '{band} ýaşlar üçin häzir hiç zat ýok. Başga ýaşy ýa-da ähli katalogy synanyşyň.',
    'young.empty':
      'Ýaş okuwçylar üçin kurslar heniz çap edilmedi. Bu ýerdäki ähli zat ilki barlagdan geçmeli.',

    'adults.eyebrow': 'Ulular',
    'adults.title': 'Ony dogry öwreniň.',
    'adults.lede':
      'Ulular üçin ýazylan kurslar — arap grammatikasy, fikh, tafsir, täjwid çuňlukda. Olaryň her biri şu ýerde peýda bolmazdan öň ylmy barlagdan geçdi we satyn alanyňyzyň her biri özüňizki: bir satyn almak, bir okuwçy.',
    'adults.notice':
      'Bu siziň şahsy hasabyňyz, çaganyňky däl. Maşgalaňyzda çaga hem okaýan bolsa, okuwçy geçiriji aralaryňyzda ikisini garyşdyrman geçýär.',
    'adults.empty':
      'Ulular üçin kurslar heniz çap edilmedi. Bu ýerdäki ähli zat ilki barlagdan geçmeli.',

    'auth.forgotTitle': 'Açar sözi täzelemek',
    'auth.forgotLede':
      'Hasabyňyzdaky e-poçta salgysyny ýazyň. Eger ol hasaba alnan bolsa, howpsuz baglanyşyk ibereris.',
    'auth.sendLink': 'Täzeleme baglanyşygyny ibermek',
    'auth.sending': 'Iberilýär…',
    'auth.resetSent':
      'Eger bu e-poçta salgysy bilen hasap bar bolsa, açar sözi täzeleme baglanyşygy ýolda. Gelen gutyňyzy we spam papkanyzy barlaň.',
    'auth.resetFailed':
      'Häzir baglanyşyk iberip bilmedik. Salgyny barlaň we soňrak synanyşyň.',
    'auth.backToSignIn': 'Girmäge dolanmak',
    'auth.accountSettings': 'Hasap sazlamalary',
    'auth.chooseTitle': 'Täze açar söz saýlaň',
    'auth.chooseLede':
      'Bu hasap üçin täze açar söz goýuň. Täzeleme baglanyşygy bir gezek ulanylýar.',
    'auth.newPassword': 'Täze açar söz',
    'auth.confirmPassword': 'Täze açar sözi tassyklaň',
    'auth.noMatch': 'Açar sözler gabat gelmeýär.',
    'auth.enterPassword': 'Täze açar söziňizi ýazyň.',
    'auth.updatePassword': 'Açar sözi täzelemek',
    'auth.updating': 'Täzelenýär…',
    'auth.offline': 'Serwere ýetip bilmedik. Baglanyşygyňyzy barlaň we gaýtadan synanyşyň.',

    'home.eyebrow': 'Yslam bilimi, dünýäboýunça',
    'home.title': 'Dinini özüňe laýyk depginde öwren.',
    'home.lede':
      'Kurʾan, arap dili, fikh, hadys we başgalar — hünärli mugallymlar tarapyndan çagalara we ululara öwredilýär, nirede bolsaňyz-da.',
    'home.browse': 'Katalogy göz aýlamak',
    'home.createAccount': 'Mugt hasap döretmek',
    'home.continue': 'Okuwy dowam etmek',
    'home.paths': 'Okuw ýollaryny göz aýlamak',
    'home.note':
      'Göz aýlamak hiç zada düşmeýär. Okuwa ýazylanda töleýärsiňiz — ady tutulan bir okuwçy üçin, we çagadan e-poçta salgysy hiç haçan soranmaýar.',
    'home.meansEyebrow': 'Bu nämäniň manysy',
    'home.meansTitle': 'Platformanyň etmekden ýüz öwürýän üç zady',
    'home.assure1Title': 'Sanawa girmezden öň barlanýar',
    'home.assure1Body':
      'Kurslar hünärli mugallymlardan gelýär we şol ders üçin ygtyýarly adam tarapyndan tassyklanýar. Ýazyjy öz işini özi tassyklap bilmeýär we her çap ediliş ýazga alynýar.',
    'home.assure2Title': 'Çaganyň girişini howandary döredýär',
    'home.assure2Body':
      'Çaga adatça ene-atanyň hasaby astynda okaýar we diňe ene-ata ony döredende öz girişini alýar — özi saýlan ulanyjy ady we özi goýan açar söz, çagadan e-poçta salgysy soranman. Ene-ata hiç bir sapaga el bermän ony yzyna aýyryp bilýär.',
    'home.assure3Title': 'Henizem barlap bolýan şahadatnama',
    'home.assure3Body':
      'Her birinde islendik adam gözläp bilýän belgi bar we kurs soňra aýrylsa-da ol barlandygyça galýar.',
    'home.studyTitle': 'Näme öwrenip bilersiňiz',
    'home.studyCountOne':
      '{count} ders, her birini şol ders üçin barlanan mugallym öwredýär.',
    'home.studyCountOther':
      '{count} ders, her birini şol ders üçin barlanan mugallym öwredýär.',
    'home.studyEmpty':
      'Kurslar goşuldygyça dersler şu ýerde peýda bolýar. Doly sanaw hemişe katalog sahypasy.',
    'home.doorChildBody':
      'Ýaş okuwçylar üçin ýazylan, ene-atanyň ýa howandaryň hasabynda saklanýar we diňe şol uly adam döredende öz girişini alýar.',
    'home.doorAdultBody':
      'Özüňiz üçin, öz derejäňizde okaň — soran islendik adama görkezip biljek şahadatnamalaryňyz bilen.',
    'home.doorOpen': 'Näme bardygyna göz aýlaň',
    'home.doorCatalogue': 'Olary katalogdan görüň',
    'home.howTitle': 'Nähili işleýär',
    'home.step': '{number}-nji ädim',
    'home.step1Title': 'Kimiň okaýanyny saýlaň',
    'home.step1Body':
      'Özüňiz ýa-da jogapkärçiligiňizdäki çaga. Kurs ady tutulan bir okuwçy üçin satyn alynýar, şonuň üçin bilelikde satyn alýan maşgala kimiň ösüşiniň kiminki bolýandygyny bilýär.',
    'home.step2Title': 'Öz depgiňizde okaň',
    'home.step2Body':
      'Sapaklar, jogaby barlanýan ýöne baha goýulmaýan türgenleşik soraglary we açan her sapagyňyzda nirede durlanyňyzy ýatda saklaýan ýer.',
    'home.step3Title': 'Özüňizden soň bir zat galdyryň',
    'home.step3Body':
      'Ösüş, hiç haçan täzeden ýazylmaýan kwitansiýa we belgisini ýyllar soň hem barlap bolýan şahadatnama.',
    'home.aboutLink': 'Kurs bu ýere nähili gelýär we çaganyň maglumatyna näme bolýar',
    'home.teachEyebrow': 'Mugallymlar üçin',
    'home.teachTitle': 'Okuwçylaryňyzy bile getiriň.',
    'home.teachBody1':
      'Eýýäm öwredýän bolsaňyz, platforma siziň özüňiz gurmaly däl bölegi: bölümler we sapaklar, dersi bilýän adam tarapyndan barlag, işgärler bilen kesgitlenen bahalar we gazanyňyzyň bir sahypada walýuta görä görkezilmegi.',
    'home.teachBody2':
      'Mugallymlar her satuwyň ýarysyny saklaýarlar. Bu ýerde öwretmek ýüz tutma bilen — eýesi mugallymlary bir-bir goşýar — we heniz hiç bir üpjün ediji pul geçirmeýär, şonuň üçin girdeji sahypasy näçe bergidarlygyňyzy aýdýar, iberildi diýip özüni tassyklamaýar.',
    'home.teachArea': 'Öwretmek meýdany',
    'home.teachReview': 'Kurslar nähili barlanýar',
    'home.closingTitle': 'Katalogdan başlaň.',
    'home.closingSignedOut':
      'Her çap edilen kurs nämeleri öz içine alýandygy we kimiň öwredýändigi bilen sanawda. Saklamak isleýän kursyňyzy tapanyňyzda hasap dörediň.',
    'home.closingSignedIn':
      'Her çap edilen kurs nämeleri öz içine alýandygy we kimiň öwredýändigi bilen sanawda. Ýazylmalaryňyz, ösüşiňiz we şahadatnamalaryňyz bir ýerde.',

    'language.reviewed': 'Bu terjimäni şu diliň ene dilinde gürleýjisi okady.',
    'language.unreviewed':
      'Bu terjimäni heniz şu diliň ene dilinde gürleýjisi okamady. Ony platformany guran adamlar ýazdy — bir söz size nädogry görünse, bu biziň ýalňyşlygymyz.',
    'language.notTranslated':
      'Diňe interfeýs terjime edildi. Kurs atlary, sapaklar, mugallym sahypalary we çap edilen düzgünler ýazylan dilinde görkezilýär.',
  },
};
