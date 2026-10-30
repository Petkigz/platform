import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Tagalog — Filipino.
 *
 * About eighty million speakers. The national language of the Philippines is
 * called Filipino in law and Tagalog in everyday speech, and the ISO code for it
 * is `fil`; all three names describe the same catalogue, and the picker prints the
 * word people actually say.
 *
 * The Philippines has one of Asia's larger Muslim populations — around six
 * million, mostly in Mindanao, Sulu and the Bangsamoro — and until now the
 * interface had no way to address a Maranao or Tausug family that reads school and
 * phone in Tagalog. Bangsamoro is the case here, not the majority: the platform is
 * for a Muslim minority reading the national language, and it says so rather than
 * implying Tagalog is itself a Muslim language.
 *
 * Written in natural Tagalog rather than the heavy English code-switching that
 * fills most Philippine apps: `Mag-log in` and `account` are everyday, but a
 * sentence that is 70% English with Tagalog grammar around it is not a
 * translation. Where a borrowed word is what a reader actually uses — `akawnt`,
 * `pasword`, `email` — it is used.
 *
 * A whole catalogue in one file, 191 keys, every placeholder from `en.ts`
 * reproduced verbatim.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`.
 */
export const ASIA_FIL: Partial<Record<LocaleCode, Partial<Messages>>> = {
  fil: {
    'skip.toContent': 'Lumaktaw sa nilalaman',

    'nav.main': 'Pangunahin',
    'nav.catalogue': 'Katalogo',
    'nav.learn': 'Aking pag-aaral',
    'nav.family': 'Aking pamilya',
    'nav.plans': 'Mga plano',
    'nav.subscriptions': 'Mga subskripsyon',
    'nav.teach': 'Magturo',
    'nav.review': 'Pagsusuri',
    'nav.certificates': 'Mga sertipiko',

    'footer.tagline': 'Kaalamang Islamiko para sa mga bata at matatanda, sa buong mundo.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Tungkol sa amin',
    'footer.terms': 'Mga tuntunin at pagkapribado',
    'footer.help': 'Tulong',
    'footer.verify': 'Tingnan ang sertipiko',
    'footer.area': 'Ang iyong rehiyon',
    'footer.notifications': 'Mga abiso',

    'action.signIn': 'Mag-sign in',
    'action.getStarted': 'Magsimula',
    'action.signOut': 'Mag-sign out',
    'action.save': 'I-save',
    'action.cancel': 'Kanselahin',

    'region.africa': 'Aprika',
    'region.middleEast': 'Gitnang Silangan',
    'region.asia': 'Asya',
    'region.west': 'Europa at Amerika',

    'language.title': 'Wika',
    'language.lede':
      'Ipinapakita ang interface sa wikang pipiliin mo rito. Nagsisimula ang browser sa wikang hinihingi ng iyong device, at ito ang sinusundan hanggang pumili ka ng iba.',
    'language.current': 'Kasalukuyang ipinapakita',
    'language.chosen': 'Pinili mo ang wikang ito sa browser na ito.',
    'language.device': 'Ito ang wikang hinihingi ng iyong device. Pumili sa ibaba upang palitan.',
    'language.default':
      'Humiling ang iyong device ng wikang wala pa sa interface na ito, kaya Ingles ang ginagamit.',
    'language.pick': 'Ipakita ang interface sa',
    'language.deviceOption': 'Wika ng aking device',
    'language.change': 'Palitan ang wika',
    'language.saved': 'Na-save na. Ang interface ay nasa {language} na.',
    'language.coverage':
      '{percent}% ng mga pahayag sa interface na ito ay naisalin sa {language}. Ang hindi pa naisalin ay ipinapakita sa Ingles.',
    'language.coverageAll': 'Ganap nang naisalin ang wikang ito.',
    'language.browser':
      'Naka-save ang pinili sa browser na ito, hindi sa iyong akawnt, kaya ang ibang device ay magtatanong ng sarili nitong wika.',

    'catalogue.title': 'Maghanap ng kurso',
    'catalogue.lede':
      'Sinusuri ang bawat kurso bago ito ilathala. Mag-browse ayon sa asignatura, o maghanap ng kurso, asignatura o guro.',
    'catalogue.doorChild': 'Pag-aaral para sa bata',
    'catalogue.doorAdult': 'Pag-aaral para sa akin',
    'catalogue.searchPlaceholder': 'Maghanap ng kurso, asignatura, guro…',
    'catalogue.searchPlaceholderLessons': 'Maghanap ng kurso, aralin, asignatura, guro…',
    'catalogue.searchLabel': 'Maghanap ng kurso',
    'catalogue.searchLabelLessons': 'Maghanap ng kurso at aralin',
    'catalogue.audience': 'Para kanino',
    'catalogue.anyLanguage': 'Kahit anong wika',
    'catalogue.search': 'Maghanap',
    'catalogue.allSubjects': 'Lahat ng asignatura',
    'catalogue.languageRow': 'Wikang ginagamit sa pagtuturo',
    'catalogue.pages': 'Mga pahina',
    'catalogue.previous': 'Nauna',
    'catalogue.next': 'Susunod',
    'catalogue.pageOf': 'Pahina {page} ng {pages}',
    'catalogue.emptyPage':
      'Walang laman ang pahinang ito. Maaaring lumagpas na ito sa dulo ng listahan.',
    'catalogue.emptyQuery':
      'Walang tumugma sa “{query}”. Subukan ang isang asignatura, pangalan ng guro, o isang salita mula sa aralin.',
    'catalogue.emptyQueryLessons':
      'Walang kursong tumugma sa “{query}”, ngunit may mga araling tumugma sa ibaba.',
    'catalogue.emptyShelf':
      'Wala pang kurso. Kapag naglathala ang isang guro, lalabas ito rito — walang ipinapakita hangga’t hindi ito nakapasa sa pagsusuri.',
    'catalogue.countOne': '{count} kurso',
    'catalogue.countOther': '{count} kurso',
    'catalogue.showing': 'Ipinapakita ang {from}–{to} ng {total}',

    'audience.child': 'Mga batang mag-aaral',
    'audience.adult': 'Matatanda',
    'audience.both': 'Lahat ng edad',

    'difficulty.beginner': 'Panimula',
    'difficulty.intermediate': 'Katamtaman',
    'difficulty.advanced': 'Masinsinan',

    'price.free': 'Libre',
    'price.included': 'Kasama sa iyong access',
    'price.notOneOff': 'Hindi ibinebenta bilang isahang kurso',
    'price.ambiguous': 'Kailangan ng tamang pera ang presyo',
    'price.notAvailable': 'Wala pa sa iyong bansa',

    'card.sectionsOne': '{count} bahagi',
    'card.sectionsOther': '{count} bahagi',
    'card.lessonsOne': '{count} aralin',
    'card.lessonsOther': '{count} aralin',
    'card.minutes': '{count} min',
    'card.hours': '{count} oras',
    'card.hoursMinutes': '{hours} oras {minutes} min',

    'auth.signInTitle': 'Mag-sign in',
    'auth.signUpTitle': 'Gumawa ng akawnt',
    'auth.signInLede': 'Maligayang pagbabalik.',
    'auth.email': 'Email',
    'auth.password': 'Pasword',
    'auth.mobile': 'Numero ng cellphone',
    'auth.countryCode': 'Country code',
    'auth.otpCode': 'Code sa text',
    'auth.tabPassword': 'Email at pasword',
    'auth.tabPhone': 'Code sa telepono',
    'auth.google': 'Magpatuloy gamit ang Google',
    'auth.sendCode': 'Ipadala ang code',
    'auth.verifyCode': 'Tiyakin ang code',
    'auth.resendCode': 'Ipadala muli ang code',
    'auth.changeNumber': 'Palitan ang numero',
    'auth.forgot': 'Nakalimutan ang pasword?',
    'auth.noAccount': 'Gumawa ng akawnt',
    'auth.haveAccount': 'May akawnt ka na?',
    'auth.working': 'Ginagawa…',
    'auth.invalidPhone': 'Mukhang hindi valid na numero ng telepono ito. Isama ang country code.',
    'auth.somethingWrong': 'May nangyaring mali.',
    'auth.orGoogle': 'o gamitin ang isa sa mga ito',
    'auth.orCreate': 'o gumawa ng akawnt gamit ang email o numero ng telepono',
    'auth.phoneAs': 'Itatabi bilang {phone}',
    'auth.international': 'Nasa internasyonal na format na.',
    'auth.passwordNote':
      'Hindi namin ito itinatabi. Ang Supabase Auth ang humahawak ng kredensyal.',
    'auth.codeSent': 'Kung may akawnt para sa {phone}, paparating na ang code.',
    'auth.codeResent': 'Naipadala na ang bagong code sa {phone}.',
    'auth.checkEmail': 'Nagawa ang akawnt. Tingnan ang email upang tiyakin ang address, pagkatapos mag-sign in.',
    'auth.accountCreated': 'Nagawa ang akawnt para sa {phone}.',

    'doors.askAdult': 'Para sa sarili mo ba?',
    'doors.askChild': 'Pumipili ka ba para sa isang bata?',
    'doors.adultsShelf': 'Istante ng matatanda',
    'doors.youngShelf': 'Istante ng batang mag-aaral',
    'doors.wholeCatalogue': 'Buong katalogo',

    'young.eyebrow': 'Mga batang mag-aaral',
    'young.title': 'Bata muna.',
    'young.lede':
      'Mga kursong isinulat upang ituro sa mga bata — pagbigkas, alpabetong Arabe, ang mga kuwentong dapat nilang unang marinig. Nakapasa sa pagsusuring pang-akademya ang bawat isa bago ito lumitaw dito.',
    'young.notice':
      'Hindi nagpaparehistro ang bata nang mag-isa. Ang magulang o tagapag-alaga ang may akawnt, nagdaragdag sa bata bilang mag-aaral, at nagpapasya kung ano ang bubuksan; maaari ring i-enrol ng guro ang bata sa sariling akawnt nito. Wala rito ang akawnt ng bata, at wala rin ditong datos ng bata.',
    'young.everyAge': 'Lahat ng edad',
    'young.emptyBand':
      'Wala pang nakalista para sa edad {band}. Subukan ang ibang edad, o ang buong katalogo.',
    'young.empty':
      'Wala pang kursong nailathala para sa batang mag-aaral. Kailangan munang makapasa sa pagsusuri ang lahat ng narito.',

    'adults.eyebrow': 'Matatanda',
    'adults.title': 'Pag-aralan ito nang maayos.',
    'adults.lede':
      'Mga kursong isinulat para sa matatanda — gramatikang Arabe, fiqh, tafsir, tajweed sa malalim na antas. Nakapasa sa pagsusuring pang-akademya ang bawat isa bago ito lumitaw dito, at bawat kursong binili mo ay sa iyo: isang bayad, isang mag-aaral.',
    'adults.notice':
      'Ito ang sarili mong akawnt, hindi ng bata. Kung may batang nag-aaral din sa inyong pamilya, gumagalaw ang tagapalit ng mag-aaral sa inyong dalawa nang hindi naghahalo.',
    'adults.empty':
      'Wala pang kursong nailathala para sa matatanda. Kailangan munang makapasa sa pagsusuri ang lahat ng narito.',

    'auth.forgotTitle': 'I-reset ang pasword',
    'auth.forgotLede':
      'Ilagay ang email na nasa iyong akawnt. Magpapadala kami ng ligtas na link kung nakarehistro ito.',
    'auth.sendLink': 'Ipadala ang reset link',
    'auth.sending': 'Ipinapadala…',
    'auth.resetSent':
      'Kung may akawnt na gumagamit ng email na iyon, paparating na ang reset link. Tingnan ang inbox at ang spam folder.',
    'auth.resetFailed':
      'Hindi kami makapagpadala ng reset link ngayon. Tiyakin ang address at subukan muli mamaya.',
    'auth.backToSignIn': 'Bumalik sa sign in',
    'auth.accountSettings': 'Mga setting ng akawnt',
    'auth.chooseTitle': 'Pumili ng bagong pasword',
    'auth.chooseLede':
      'Magtakda ng bagong pasword para sa akawnt na ito. Isang beses lang magagamit ang reset link.',
    'auth.newPassword': 'Bagong pasword',
    'auth.confirmPassword': 'Tiyakin ang bagong pasword',
    'auth.noMatch': 'Hindi magkatugma ang mga pasword.',
    'auth.enterPassword': 'Ilagay ang bagong pasword mo.',
    'auth.updatePassword': 'I-update ang pasword',
    'auth.updating': 'Ina-update…',
    'auth.offline': 'Hindi maabot ang server. Tiyakin ang koneksyon at subukan muli.',

    'home.eyebrow': 'Kaalamang Islamiko, sa buong mundo',
    'home.title': 'Pag-aralan ang iyong deen, sa bilis na bagay sa iyo.',
    'home.lede':
      'Qur’an, Arabe, Fiqh, Hadith at iba pa — itinuturo ng mga kwalipikadong guro sa mga bata at matatanda, saan ka man naroroon.',
    'home.browse': 'Tingnan ang katalogo',
    'home.createAccount': 'Gumawa ng libreng akawnt',
    'home.continue': 'Magpatuloy sa pag-aaral',
    'home.paths': 'Tuklasin ang mga landas ng pag-aaral',
    'home.note':
      'Walang bayad ang pagtingin. Magbabayad ka kapag nag-enrol, para sa isang mag-aaral na may pangalan, at hindi kailanman tinatanong ang email ng bata.',
    'home.meansEyebrow': 'Ano ang ibig sabihin nito',
    'home.meansTitle': 'Tatlong bagay na tinatanggihan ng platform na ito',
    'home.assure1Title': 'Sinusuri bago ilista',
    'home.assure1Body':
      'Galing sa mga kwalipikadong guro ang mga kurso at inaprubahan ng may kapangyarihan sa asignatura. Hindi maaaring aprubahan ng may-akda ang sariling gawa, at naitala ang bawat paglalathala.',
    'home.assure2Title': 'Ang login ng bata ay ginagawa ng kanyang tagapag-alaga',
    'home.assure2Body':
      'Sa simula, nag-aaral ang bata sa ilalim ng akawnt ng magulang, at magkakaroon lamang ng sariling login kapag ginawa ito ng magulang — username na siya mismo ang pumili at pasword na siya ang nagtakda, na hindi tinatanong ang email ng bata. Maaaring alisin itong muli ng magulang nang walang nasasaktang aralin.',
    'home.assure3Title': 'Sertipikong matitingnan pa rin',
    'home.assure3Body':
      'May numero ang bawat isa na kayang hanapin ng kahit sino, at nananatili itong matitingnan kahit bawiin pa ang kurso mamaya.',
    'home.studyTitle': 'Ano ang maaari mong pag-aralan',
    'home.studyCountOne':
      '{count} asignatura, bawat isa ay itinuturo ng gurong sinuri para dito.',
    'home.studyCountOther':
      '{count} asignatura, bawat isa ay itinuturo ng gurong sinuri para dito.',
    'home.studyEmpty':
      'Lumilitaw dito ang mga asignatura habang nadaragdagan ang kurso. Ang buong listahan ay laging nasa katalogo.',
    'home.doorChildBody':
      'Isinulat para sa batang mag-aaral, hawak ng akawnt ng magulang o tagapag-alaga, at magkakaroon lamang ng sariling login kapag ginawa ito ng matandang iyon.',
    'home.doorAdultBody':
      'Mag-aral para sa sarili mo, sa sarili mong antas, may mga sertipikong maipapakita sa sinumang magtanong.',
    'home.doorOpen': 'Tingnan kung ano ang naroon',
    'home.doorCatalogue': 'Tingnan sila sa katalogo',
    'home.howTitle': 'Paano ito gumagana',
    'home.step': 'Hakbang {number}',
    'home.step1Title': 'Piliin kung sino ang mag-aaral',
    'home.step1Body':
      'Ikaw mismo, o isang batang responsable ka. Binibili ang kurso para sa isang mag-aaral na may pangalan, kaya alam pa rin ng pamilyang sabay bumili kung kanino ang progreso ng kanino.',
    'home.step2Title': 'Mag-aral sa sarili mong bilis',
    'home.step2Body':
      'Mga aralin, mga tanong sa pagsasanay na tumitingin ng sagot nang walang marka, at isang lugar na tumatanda kung saan ka tumigil sa bawat araling binuksan mo.',
    'home.step3Title': 'Mag-iwan ng isang bagay',
    'home.step3Body':
      'Progreso, resibong hindi kailanman muling isinusulat, at sertipikong matitingnan pa ang numero pagkalipas ng mga taon.',
    'home.aboutLink': 'Paano napaparito ang isang kurso, at ano ang nangyayari sa datos ng bata',
    'home.teachEyebrow': 'Para sa mga guro',
    'home.teachTitle': 'Isama mo ang iyong mga mag-aaral.',
    'home.teachBody1':
      'Kung nagtuturo ka na, ang platform na ito ang bahaging hindi mo na dapat pa ang gumawa: mga bahagi at aralin, pagsusuri ng taong nakakaalam ng asignatura, presyong itinatakda kasama ng staff, at ang kinita mo na nakalathala ayon sa pera sa isang pahina.',
    'home.teachBody2':
      'Hinahawakan ng guro ang kalahati ng bawat benta. Ang pagtuturo rito ay sa pamamagitan ng appointment — isa-isang nagdaragdag ng guro ang may-ari — at wala pang provider na naglilipat ng pera, kaya sinasabi ng pahina ng kita kung magkano ang utang sa iyo, hindi na pinadala na ito.',
    'home.teachArea': 'Ang lugar ng pagtuturo',
    'home.teachReview': 'Paano sinusuri ang mga kurso',
    'home.closingTitle': 'Magsimula sa katalogo.',
    'home.closingSignedOut':
      'Nakalista ang bawat nailathalang kurso kasama ang laman at kung sino ang nagtuturo. Gumawa ng akawnt kapag may nakita kang kursong nais mong itabi.',
    'home.closingSignedIn':
      'Nakalista ang bawat nailathalang kurso kasama ang laman at kung sino ang nagtuturo. Ang iyong mga enrolment, progreso at sertipiko ay nasa isang lugar.',

    'language.reviewed': 'May katutubong nagsasalita ng wikang ito na nakabasa ng salin.',
    'language.partial':
      'Nabasa na mga katutubong nagsasalita ang {read} sa {total} bahagi ng saling ito.',
    'language.unreviewed':
      'Wala pang katutubong nagsasalita ng wikang ito ang nakabasa ng salin. Isinulat ito ng mga taong bumuo ng platform — kung may salitang mali sa iyong paningin, pagkakamali namin iyon.',
    'language.notTranslated':
      'Interface lamang ang isinalin. Ang mga pamagat ng kurso, aralin, pahina ng guro at mga patakarang nailathala ay nasa wikang isinulat ang mga ito.',
  },
};
