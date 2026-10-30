import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * සිංහල — Sinhala.
 *
 * Around seventeen million speakers, and a Muslim community of roughly two
 * million — the largest on the island after the Sinhalese, and one that has lived
 * there for a thousand years. Sri Lankan Muslims read Sinhala as a second
 * language far more often than they read it as a first, which is exactly the
 * case a translated interface is for: it does not replace Tamil or Arabic, it
 * lets someone who has to use Sinhala to get through a form do so without
 * guessing.
 *
 * A whole catalogue in one file: see `asia-uz.ts` for why the newer languages do
 * not imitate the layering of the older ones.
 *
 * Every placeholder from `en.ts` survives — `{count}`, `{number}`, `{year}`,
 * `{query}`, `{band}`, `{phone}`, `{language}`, `{percent}`, `{page}`, `{pages}`,
 * `{from}`, `{to}`, `{total}`, `{hours}`, `{minutes}`.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`.
 */
export const ASIA_SI: Partial<Record<LocaleCode, Partial<Messages>>> = {
  si: {
    'skip.toContent': 'අන්තර්ගතයට යන්න',

    'nav.main': 'ප්‍රධාන',
    'nav.catalogue': 'පාඨමාලා',
    'nav.learn': 'මගේ ඉගෙනීම',
    'nav.family': 'මගේ පවුල',
    'nav.plans': 'සැලසුම්',
    'nav.subscriptions': 'දායකත්ව',
    'nav.teach': 'උගන්වන්න',
    'nav.review': 'සමාලෝචනය',
    'nav.certificates': 'සහතික',

    'footer.tagline': 'ළමයින් සහ වැඩිහිටියන් සඳහා ඉස්ලාමීය අධ්‍යාපනය, ලොව පුරා.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'අපි ගැන',
    'footer.terms': 'කොන්දේසි සහ පෞද්ගලිකත්වය',
    'footer.help': 'උදව්',
    'footer.verify': 'සහතිකය පරීක්ෂා කරන්න',
    'footer.area': 'ඔබේ ප්‍රදේශය',
    'footer.notifications': 'දැනුම්දීම්',

    'action.signIn': 'පිවිසෙන්න',
    'action.getStarted': 'ආරම්භ කරන්න',
    'action.signOut': 'ඉවත් වන්න',
    'action.save': 'සුරකින්න',
    'action.cancel': 'අවලංගු කරන්න',

    'region.africa': 'අප්‍රිකාව',
    'region.middleEast': 'මැද පෙරදිග',
    'region.asia': 'ආසියාව',
    'region.west': 'යුරෝපය සහ ඇමරිකාව',

    'language.title': 'භාෂාව',
    'language.lede':
      'ඔබ මෙහි තෝරන භාෂාවෙන් අතුරුමුහුණත පෙන්වයි. බ්‍රවුසරය මුලින්ම ඔබේ උපාංගය ඉල්ලන භාෂාවෙන් ආරම්භ වී, ඔබ වෙනත් එකක් තෝරන තෙක් එහිම රැඳේ.',
    'language.current': 'දැන් පෙන්වන්නේ',
    'language.chosen': 'මෙම භාෂාව ඔබ මෙම බ්‍රවුසරයේ තෝරාගත්තා.',
    'language.device': 'මෙය ඔබේ උපාංගය ඉල්ලූ භාෂාවයි. වෙනස් කිරීමට පහතින් එකක් තෝරන්න.',
    'language.default':
      'ඔබේ උපාංගය මෙම අතුරුමුහුණතේ නොමැති භාෂාවක් ඉල්ලා ඇත, එබැවින් එය ඉංග්‍රීසියෙන් ඇත.',
    'language.pick': 'අතුරුමුහුණත මෙම භාෂාවෙන් පෙන්වන්න',
    'language.deviceOption': 'මගේ උපාංගයේ භාෂාව',
    'language.change': 'භාෂාව වෙනස් කරන්න',
    'language.saved': 'සුරකින ලදි. අතුරුමුහුණත දැන් {language} භාෂාවෙන්.',
    'language.coverage':
      'මෙම අතුරුමුහුණතේ පෙළවලින් {percent}% {language} භාෂාවට පරිවර්තනය වී ඇත. පරිවර්තනය නොවූ දේ ඉංග්‍රීසියෙන් පෙන්වයි.',
    'language.coverageAll': 'මෙම භාෂාව සම්පූර්ණයෙන් පරිවර්තනය වී ඇත.',
    'language.browser':
      'තේරීම මෙම බ්‍රවුසරයේ තබා ගනී, ඔබේ ගිණුමේ නොවේ, එබැවින් වෙනත් උපාංගයක් එහි භාෂාව එයම අසයි.',

    'catalogue.title': 'පාඨමාලාවක් සොයන්න',
    'catalogue.lede':
      'සෑම පාඨමාලාවක්ම ප්‍රකාශයට පෙර සමාලෝචනය කෙරේ. විෂය අනුව බලන්න, නැතහොත් පාඨමාලාවක්, විෂයක් හෝ ගුරුවරයෙක් සොයන්න.',
    'catalogue.doorChild': 'ඉගෙනීම ළමයෙකුට',
    'catalogue.doorAdult': 'ඉගෙනීම මට',
    'catalogue.searchPlaceholder': 'පාඨමාලා, විෂය, ගුරුවරු…',
    'catalogue.searchPlaceholderLessons': 'පාඨමාලා, පාඩම්, විෂය, ගුරුවරු…',
    'catalogue.searchLabel': 'පාඨමාලා සොයන්න',
    'catalogue.searchLabelLessons': 'පාඨමාලා සහ පාඩම් සොයන්න',
    'catalogue.audience': 'කා සඳහාද',
    'catalogue.search': 'සොයන්න',
    'catalogue.allSubjects': 'සියලු විෂය',
    'catalogue.anyLanguage': 'ඕනෑම භාෂාවක්',
    'catalogue.languageRow': 'පාඨමාලාව උගන්වන භාෂාව',
    'catalogue.pages': 'පිටු',
    'catalogue.previous': 'පෙර',
    'catalogue.next': 'ඊළඟ',
    'catalogue.pageOf': '{pages} න් පිටුව {page}',
    'catalogue.emptyPage': 'මෙම පිටුවේ කිසිවක් නැත. එය ලැයිස්තුවේ අවසානයෙන් පසු විය හැක.',
    'catalogue.emptyQuery':
      '“{query}” සමඟ කිසිවක් නොගැළපුණි. විෂයක්, ගුරුවරයෙකුගේ නමක් හෝ පාඩමක වචනයක් උත්සාහ කරන්න.',
    'catalogue.emptyQueryLessons': '“{query}” සමඟ පාඨමාලාවක් නොගැළපුණි, නමුත් පහත පාඩම් ගැළපුණි.',
    'catalogue.emptyShelf':
      'තවම පාඨමාලා නැත. ගුරුවරයෙක් එකක් ප්‍රකාශයට පත් කළ පසු එය මෙහි දිස්වේ — සමාලෝචනය පසු නොකළ තෙක් කිසිවක් නොපෙන්වයි.',
    'catalogue.countOne': 'පාඨමාලා {count}',
    'catalogue.countOther': 'පාඨමාලා {count}',
    'catalogue.showing': '{total} න් {from}–{to} පෙන්වයි',

    'audience.child': 'කුඩා ඉගෙනුම්කරුවෝ',
    'audience.adult': 'වැඩිහිටියන්',
    'audience.both': 'සියලු වයස්',

    'difficulty.beginner': 'ආරම්භක',
    'difficulty.intermediate': 'මධ්‍යම',
    'difficulty.advanced': 'උසස්',

    'price.free': 'නොමිලේ',
    'price.included': 'ඔබේ ප්‍රවේශයට ඇතුළත්',
    'price.notOneOff': 'එක් වරක් ගෙවන පාඨමාලාවක් ලෙස අලෙවි නොකෙරේ',
    'price.ambiguous': 'මිලට නිවැරදි මුදල් ඒකකයක් අවශ්‍යයි',
    'price.notAvailable': 'ඔබේ රටේ තවම නොමැත',

    'card.sectionsOne': 'කොටස් {count}',
    'card.sectionsOther': 'කොටස් {count}',
    'card.lessonsOne': 'පාඩම් {count}',
    'card.lessonsOther': 'පාඩම් {count}',
    'card.minutes': 'මිනිත්තු {count}',
    'card.hours': 'පැය {count}',
    'card.hoursMinutes': 'පැය {hours} මිනිත්තු {minutes}',

    'auth.signInTitle': 'පිවිසෙන්න',
    'auth.signUpTitle': 'ගිණුමක් සාදන්න',
    'auth.signInLede': 'නැවත සාදරයෙන් පිළිගනිමු.',
    'auth.email': 'විද්‍යුත් තැපෑල',
    'auth.password': 'මුරපදය',
    'auth.mobile': 'ජංගම දුරකථන අංකය',
    'auth.countryCode': 'රට කේතය',
    'auth.otpCode': 'කෙටි පණිවිඩ කේතය',
    'auth.tabPassword': 'විද්‍යුත් තැපෑල සහ මුරපදය',
    'auth.tabPhone': 'දුරකථන කේතය',
    'auth.google': 'Google සමඟ ඉදිරියට',
    'auth.sendCode': 'කේතය යවන්න',
    'auth.verifyCode': 'කේතය තහවුරු කරන්න',
    'auth.resendCode': 'කේතය නැවත යවන්න',
    'auth.changeNumber': 'අංකය වෙනස් කරන්න',
    'auth.forgot': 'මුරපදය අමතකද?',
    'auth.noAccount': 'ගිණුමක් සාදන්න',
    'auth.haveAccount': 'දැනටමත් ගිණුමක් තිබේද?',
    'auth.working': 'ක්‍රියාත්මක වෙමින්…',
    'auth.invalidPhone': 'මෙය වලංගු දුරකථන අංකයක් ලෙස නොපෙනේ. රට කේතය ඇතුළත් කරන්න.',
    'auth.somethingWrong': 'යම් දෙයක් වැරදී ඇත.',
    'auth.orGoogle': 'නැතහොත් මේවායින් එකක් භාවිත කරන්න',
    'auth.orCreate': 'නැතහොත් විද්‍යුත් තැපෑලක් හෝ දුරකථන අංකයක් සමඟ ගිණුමක් සාදන්න',
    'auth.phoneAs': '{phone} ලෙස සුරකිනු ඇත',
    'auth.international': 'දැනටමත් ජාත්‍යන්තර ආකෘතියෙන් ඇත.',
    'auth.passwordNote': 'අපි එය කිසිදා සුරකින්නේ නැත. මුරපදය Supabase Auth සතුව ඇත.',
    'auth.codeSent': '{phone} සඳහා ගිණුමක් තිබේ නම්, කේතය එන ගමනේ ඇත.',
    'auth.codeResent': '{phone} වෙත නව කේතයක් යවා ඇත.',
    'auth.checkEmail': 'ගිණුම සාදන ලදි. ලිපිනය තහවුරු කිරීමට විද්‍යුත් තැපෑල බලා, පසුව පිවිසෙන්න.',
    'auth.accountCreated': '{phone} සඳහා ගිණුම සාදන ලදි.',

    'doors.askAdult': 'ඔබ වෙනුවෙන් සොයනවාද?',
    'doors.askChild': 'ළමයෙකු වෙනුවෙන් තෝරනවාද?',
    'doors.adultsShelf': 'වැඩිහිටියන්ගේ රාක්කය',
    'doors.youngShelf': 'කුඩා ඉගෙනුම්කරුවන්ගේ රාක්කය',
    'doors.wholeCatalogue': 'සම්පූර්ණ පාඨමාලාව',
    'young.eyebrow': 'කුඩා ඉගෙනුම්කරුවෝ',
    'young.title': 'මුලින්ම ළමයින්.',
    'young.lede':
      'ළමයින්ට උගන්වන්නට ලියූ පාඨමාලා — සජ්ජායනය, අරාබි අක්ෂර මාලාව, මුලින්ම ඇසිය යුතු කතා. සෑම එකක්ම මෙහි පෙනෙන්නට පෙර විද්වත් සමාලෝචනය පසු කර ඇත.',
    'young.notice':
      'ළමයෙක් තමාම ලියාපදිංචි නොවේ. ගිණුම දෙමාපියන් හෝ භාරකරුවෙක් රඳවා ගනී, ළමයා ඉගෙනුම්කරුවෙක් ලෙස එකතු කරයි, කුමක් විවෘත විය යුතුද යන්න තීරණය කරයි; ගුරුවරයෙකුට ඔහු තම ගිණුමට ලියාපදිංචි කළ හැක. මෙම පිටුවේ කිසිවක් ළමයෙකුගේ ගිණුමක් නොවේ, කිසිවක් ළමයෙකුගේ දත්ත නොවේ.',
    'young.everyAge': 'සියලු වයස්',
    'young.emptyBand':
      'වයස් {band} සඳහා තවම කිසිවක් ලැයිස්තුගත කර නැත. වෙනත් වයසක් හෝ සම්පූර්ණ පාඨමාලාව බලන්න.',
    'young.empty':
      'කුඩා ඉගෙනුම්කරුවන් සඳහා තවම පාඨමාලා ප්‍රකාශයට පත් කර නැත. මෙහි සියල්ල මුලින්ම සමාලෝචනය පසු කළ යුතුය.',
    'adults.eyebrow': 'වැඩිහිටියන්',
    'adults.title': 'නිසි ලෙස ඉගෙන ගන්න.',
    'adults.lede':
      'වැඩිහිටියන් සඳහා ලියූ පාඨමාලා — අරාබි ව්‍යාකරණය, ෆික්හ්, තෆ්සීර්, තජ්වීද්, ගැඹුරින්. සෑම එකක්ම මෙහි පෙනෙන්නට පෙර විද්වත් සමාලෝචනය පසු කර ඇත, ඔබ මිලදී ගන්නා දේ ඔබේමය: එක් මිලදී ගැනීමක්, එක් ඉගෙනුම්කරුවෙක්.',
    'adults.notice':
      'මෙය ළමයෙකුගේ නොව ඔබේම ගිණුමයි. ඔබේ පවුලේ ළමයෙකුද ඉගෙන ගන්නවා නම්, ඉගෙනුම්කරු මාරු කරන මෙවලම දෙක මිශ්‍ර නොකර ඔබෙන් ඔහු වෙත යයි.',
    'adults.empty':
      'වැඩිහිටියන් සඳහා තවම පාඨමාලා ප්‍රකාශයට පත් කර නැත. මෙහි සියල්ල මුලින්ම සමාලෝචනය පසු කළ යුතුය.',

    'auth.forgotTitle': 'මුරපදය නැවත සකසන්න',
    'auth.forgotLede':
      'ඔබේ ගිණුමේ විද්‍යුත් තැපැල් ලිපිනය ඇතුළත් කරන්න. එය ලියාපදිංචි නම් ආරක්ෂිත සබැඳියක් යවමු.',
    'auth.sendLink': 'නැවත සැකසුම් සබැඳිය යවන්න',
    'auth.sending': 'යවමින්…',
    'auth.resetSent':
      'මෙම ලිපිනය යම් ගිණුමක භාවිත වේ නම්, මුරපද නැවත සැකසුම් සබැඳිය එන ගමනේ ඇත. ලැබුණු තැපෑල සහ ආයාචිත තැපෑල බලන්න.',
    'auth.resetFailed':
      'දැන් නැවත සැකසුම් සබැඳිය යැවිය නොහැකි විය. ලිපිනය බලා පසුව නැවත උත්සාහ කරන්න.',
    'auth.backToSignIn': 'පිවිසීමට ආපසු',
    'auth.accountSettings': 'ගිණුම් සැකසුම්',
    'auth.chooseTitle': 'නව මුරපදයක් තෝරන්න',
    'auth.chooseLede': 'මෙම ගිණුමට නව මුරපදයක් දමන්න. නැවත සැකසුම් සබැඳිය එක් වරක් පමණි.',
    'auth.newPassword': 'නව මුරපදය',
    'auth.confirmPassword': 'නව මුරපදය තහවුරු කරන්න',
    'auth.noMatch': 'මුරපද නොගැළපේ.',
    'auth.enterPassword': 'ඔබේ නව මුරපදය ඇතුළත් කරන්න.',
    'auth.updatePassword': 'මුරපදය යාවත්කාලීන කරන්න',
    'auth.updating': 'යාවත්කාලීන වෙමින්…',
    'auth.offline': 'සේවාදායකයට ළඟා විය නොහැකි විය. සම්බන්ධතාවය බලා නැවත උත්සාහ කරන්න.',

    'home.eyebrow': 'ඉස්ලාමීය අධ්‍යාපනය, ලොව පුරා',
    'home.title': 'ඔබේ දීන් ඉගෙන ගන්න, ඔබට ගැළපෙන වේගයෙන්.',
    'home.lede':
      'කුර්ආනය, අරාබි, ෆික්හ්, හදීස් සහ තවත් — සුදුසුකම් ලත් ගුරුවරුන් විසින් ළමයින්ට සහ වැඩිහිටියන්ට, ඔබ කොහේ සිටියත්.',
    'home.browse': 'පාඨමාලා නාමාවලිය බලන්න',
    'home.createAccount': 'නොමිලේ ගිණුමක් සාදන්න',
    'home.continue': 'ඉගෙනීම දිගටම කරගෙන යන්න',
    'home.paths': 'ඉගෙනුම් මාර්ග බලන්න',
    'home.note':
      'බැලීමට කිසිදු වියදමක් නැත. ලියාපදිංචි වන විට ගෙවන්නේ, නම සඳහන් එක් ඉගෙනුම්කරුවෙකු සඳහා, ළමයෙකුගෙන් විද්‍යුත් තැපැල් ලිපිනයක් කිසිදා අසන්නේ නැත.',
    'home.meansEyebrow': 'එහි අර්ථය කුමක්ද',
    'home.meansTitle': 'මෙම වේදිකාව කිරීමට ප්‍රතික්ෂේප කරන කරුණු තුන',
    'home.assure1Title': 'ලැයිස්තුගත කිරීමට පෙර සමාලෝචනය කෙරේ',
    'home.assure1Body':
      'පාඨමාලා සුදුසුකම් ලත් ගුරුවරුන්ගෙන් පැමිණේ, එම විෂයට අධිකාරිය ඇති අයෙක් ඒවා අනුමත කරයි. ලේඛකයෙකුට තමන්ගේම කාර්යය අනුමත කළ නොහැක, සෑම ප්‍රකාශනයක්ම සටහන් වේ.',
    'home.assure2Title': 'ළමයෙකුගේ පිවිසුම ඔහුගේ භාරකරු සාදයි',
    'home.assure2Body':
      'ළමයෙක් සාමාන්‍යයෙන් දෙමාපියන්ගේ ගිණුම යටතේ ඉගෙන ගනී, දෙමාපියන් සාදන්නේ නම් පමණක් තමන්ගේම පිවිසුමක් ලබයි — ඔවුන් තෝරන පරිශීලක නාමය සහ ඔවුන් දමන මුරපදය, ළමයාගෙන් විද්‍යුත් තැපැල් ලිපිනයක් අසන්නේ නැත. දෙමාපියන්ට කිසිදු පාඩමක් ස්පර්ශ නොකර එය නැවත ඉවත් කළ හැක.',
    'home.assure3Title': 'තවමත් පරීක්ෂා කළ හැකි සහතිකයක්',
    'home.assure3Body':
      'සෑම එකකම ඕනෑම කෙනෙකුට සොයා බැලිය හැකි අංකයක් ඇත, පාඨමාලාව පසුව ඉවත් කළත් එය පරීක්ෂා කළ හැකි ලෙසම රැඳේ.',
    'home.studyTitle': 'ඔබට ඉගෙන ගත හැකි දේ',
    'home.studyCountOne': 'විෂය {count}, එක් එක් ඒ සඳහා සමාලෝචනය වූ ගුරුවරයෙකු විසින් උගන්වයි.',
    'home.studyCountOther': 'විෂය {count}, එක් එක් ඒ සඳහා සමාලෝචනය වූ ගුරුවරයෙකු විසින් උගන්වයි.',
    'home.studyEmpty':
      'පාඨමාලා එකතු වන විට විෂය මෙහි දිස්වේ. සම්පූර්ණ ලැයිස්තුව සැමවිටම පාඨමාලා නාමාවලියයි.',
    'home.doorChildBody':
      'කුඩා ඉගෙනුම්කරුවන් සඳහා ලියා ඇත, දෙමාපියන් හෝ භාරකරුවෙකුගේ ගිණුමේ තබා ඇත, එම වැඩිහිටියා සාදන විට පමණක් තමන්ගේම පිවිසුමක් ලබයි.',
    'home.doorAdultBody':
      'ඔබ වෙනුවෙන්, ඔබේ මට්ටමින් ඉගෙන ගන්න, අසන ඕනෑම කෙනෙකුට පෙන්විය හැකි සහතික සමඟ.',
    'home.doorOpen': 'එහි ඇති දේ බලන්න',
    'home.doorCatalogue': 'ඒවා පාඨමාලා නාමාවලියේ බලන්න',
    'home.howTitle': 'මෙය ක්‍රියා කරන්නේ කෙසේද',
    'home.step': 'පියවර {number}',
    'home.step1Title': 'කවුරුන් ඉගෙන ගන්නේද යන්න තෝරන්න',
    'home.step1Body':
      'ඔබම, නැතහොත් ඔබ වගකීම දරන ළමයෙක්. පාඨමාලාවක් නම සඳහන් එක් ඉගෙනුම්කරුවෙකු සඳහා මිලදී ගැනේ, එබැවින් එකට මිලදී ගන්නා පවුලකට කාගේ දියුණුව කාගේද යන්න දැනගත හැක.',
    'home.step2Title': 'ඔබේම වේගයෙන් ඉගෙන ගන්න',
    'home.step2Body':
      'පාඩම්, පිළිතුර ලකුණු නොකර පරීක්ෂා කරන අභ්‍යාස ප්‍රශ්න, ඔබ විවෘත කළ සෑම පාඩමකම කොහේ නතර වූවාද යන්න මතක තබා ගන්නා තැනක්.',
    'home.step3Title': 'පසුව යමක් ඉතිරි වේවා',
    'home.step3Body':
      'දියුණුව, කිසිදා නැවත නොලියන රිසිට්පත, අංකය වසර ගණනකට පසුවත් පරීක්ෂා කළ හැකි සහතිකයක්.',
    'home.aboutLink': 'පාඨමාලාවක් මෙහිට පැමිණෙන්නේ කෙසේද, ළමයෙකුගේ දත්තවලට සිදුවන්නේ කුමක්ද',
    'home.teachEyebrow': 'ගුරුවරුන් සඳහා',
    'home.teachTitle': 'ඔබේ සිසුන් රැගෙන එන්න.',
    'home.teachBody1':
      'ඔබ දැනටමත් උගන්වනවා නම්, ඔබම ගොඩනගා ගත යුතු නොවන කොටස මෙම වේදිකාවයි: කොටස් සහ පාඩම්, විෂය දන්නා අයෙකුගේ සමාලෝචනය, කාර්ය මණ්ඩලය සමඟ තීරණය කරන මිල, ඔබ උපයාගත් දේ සෑම මුදල් ඒකකයකින්ම එක් පිටුවක.',
    'home.teachBody2':
      'ගුරුවරු සෑම විකුණුමකින්ම අඩක් තබා ගනී. මෙහි උගැන්වීම ගිවිසුමක් මතය — වේදිකාවේ හිමිකරු ගුරුවරුන් එකින් එක එකතු කරයි — තවම කිසිදු සැපයුම්කරුවෙක් මුදල් යවන්නේ නැත, එබැවින් ආදායම් පිටුව යැව්වා යැයි පවසනවා වෙනුවට කොපමණ ණය ගැතිද යන්න පවසයි.',
    'home.teachArea': 'ඉගැන්වීමේ ප්‍රදේශය',
    'home.teachReview': 'පාඨමාලා සමාලෝචනය කරන්නේ කෙසේද',
    'home.closingTitle': 'පාඨමාලා නාමාවලියෙන් ආරම්භ කරන්න.',
    'home.closingSignedOut':
      'ප්‍රකාශිත සෑම පාඨමාලාවක්ම එහි අන්තර්ගතය සහ උගන්වන ගුරුවරයා සමඟ ලැයිස්තුගත කර ඇත. තබා ගැනීමට අවශ්‍ය එකක් හමු වූ විට ගිණුමක් සාදන්න.',
    'home.closingSignedIn':
      'ප්‍රකාශිත සෑම පාඨමාලාවක්ම එහි අන්තර්ගතය සහ උගන්වන ගුරුවරයා සමඟ ලැයිස්තුගත කර ඇත. ඔබේ ලියාපදිංචි, දියුණුව සහ සහතික එකම තැනක ඇත.',

    'language.reviewed': 'මෙම පරිවර්තනය මාතෘ භාෂාව කතා කරන්නෙක් කියවා ඇත.',
    'language.partial':
      'මව්බස කතා කරන්නන් මෙම පරිවර්තනයේ කොටස් {total} න් {read} කියවා ඇත.',
    'language.unreviewed':
      'මෙම පරිවර්තනය තවම මාතෘ භාෂාව කතා කරන්නෙක් කියවා නැත. එය වේදිකාව ගොඩනැගූ අය ලියූ දෙයකි — වචනයක් වැරදි ලෙස පෙනේ නම්, වැරැද්ද අපගේය.',
    'language.notTranslated':
      'පරිවර්තනය වන්නේ අතුරුමුහුණත පමණි. පාඨමාලා නම්, පාඩම්, ගුරු පිටු සහ ප්‍රකාශිත ප්‍රතිපත්ති ලියූ භාෂාවෙන්ම දිස්වේ.',
  },
};
