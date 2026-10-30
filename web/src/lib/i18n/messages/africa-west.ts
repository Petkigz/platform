import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * West and Central African catalogues: Hausa, Yoruba, Igbo, Wolof, Fulfulde and
 * Bambara.
 *
 * **A region with more languages than any picker can hold.** Nigeria alone has
 * over five hundred, and every one of them is somebody's mother tongue. What is
 * here is not a ranking of importance — it is the six with the largest numbers of
 * speakers that the platform can actually address in a sentence today, chosen so
 * that a learner in Kano, Ibadan, Enugu, Dakar, Bamako or the Sahel is not
 * automatically served English. A language absent from this list is absent
 * because nobody has written its catalogue, which is the only honest reason this
 * file allows.
 *
 * **Orthography, not transliteration.** Hausa and Fulfulde use the Latin script
 * with hooked letters (ɓ, ɗ, ƙ), Yoruba its tone marks, Bambara its own Latin
 * conventions. The strings carry them rather than stripping them to ASCII,
 * because a language written without its marks is a language written wrongly.
 *
 * **Not yet read by a speaker** — `reviewed: false` in `locales.ts`, and printed
 * on `/language` rather than glossed over.
 */
export const AFRICA_WEST: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ha: {
    'skip.toContent': 'Tsallake zuwa abun ciki',
    'nav.main': 'Babban menu',
    'nav.catalogue': 'Jerin kwasa-kwasai',
    'nav.learn': 'Karatuna',
    'nav.family': 'Iyalina',
    'nav.plans': 'Tsare-tsare',
    'nav.subscriptions': 'Biyan kuɗi na wata',
    'nav.teach': 'Koyarwa',
    'nav.review': 'Bita',
    'nav.certificates': 'Takardun shaida',
    'footer.tagline': 'Ilimin addinin Musulunci ga yara da manya, a duk duniya.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Game da mu',
    'footer.terms': 'Sharuɗɗa da sirri',
    'footer.help': 'Taimako',
    'footer.verify': 'Tabbatar da takarda',
    'footer.area': 'Yankinka',
    'footer.notifications': 'Sanarwa',
    'action.signIn': 'Shiga',
    'action.getStarted': 'Fara',
    'action.signOut': 'Fita',
    'action.save': 'Ajiye',
    'action.cancel': 'Soke',
    'region.africa': 'Afirka',
    'region.middleEast': 'Gabas ta Tsakiya',
    'region.asia': 'Asiya',
    'region.west': 'Turai da Amurka',
    'language.title': 'Harshe',
    'language.lede':
      'Ana nuna maƙallan shafin a harshen da ka zaɓa a nan. Wannan burauza yana farawa da harshen da na’urarka ta nemi, kuma yana bin sa har sai ka zaɓi wani.',
    'language.current': 'Harshen da ake amfani da shi',
    'language.chosen': 'Ka zaɓi wannan harshe a wannan burauza.',
    'language.device':
      'Wannan shine harshen da na’urarka ta nemi. Zaɓi wani a ƙasa don canza shi.',
    'language.default':
      'Na’urarka ta nemi harshen da wannan shafi ba shi da shi tukuna, don haka yana cikin Turanci.',
    'language.pick': 'Nuna maƙallan shafin cikin',
    'language.deviceOption': 'Harshen na’urarka',
    'language.change': 'Canza harshe',
    'language.saved': 'An ajiye. Yanzu shafin yana cikin {language}.',
    'language.coverage':
      'An fassara {percent}% na waɗannan kalmomin shafin zuwa {language}. Duk abin da ba a fassara ba ana nuna shi cikin Turanci.',
    'language.coverageAll': 'An fassara wannan harshe gaba ɗaya.',
    'language.browser':
      'Ana ajiye zaɓin a wannan burauza, ba a asusunka ba, don haka wata na’ura za ta tambayi nata harshen.',
    'language.reviewed': 'Mai harshen asali ya karanta wannan fassarar.',
    'language.partial':
      'Masu magana da harshen asali sun karanta kashi {read} cikin {total} na wannan fassarar.',
    'language.unreviewed':
      'Babu mai harshen asali da ya karanta wannan fassarar tukuna. Wadanda suka gina dandalin ne suka rubuta ta — idan wata kalma ta yi maka kama da kuskure, kuskuren namu ne.',
    'language.notTranslated':
      'Fassarar shafin ne kawai. Sunayen kwasa-kwasai, darussa, shafukan malamai da manufofin da aka wallafa suna fitowa cikin harshen da aka rubuta su.',
  },

  yo: {
    'skip.toContent': 'Fò kọjá lọ sí àkòónú',
    'nav.main': 'Àkọ́kọ́',
    'nav.catalogue': 'Àkójọ ẹ̀kọ́',
    'nav.learn': 'Ẹ̀kọ́ mi',
    'nav.family': 'Ìdílé mi',
    'nav.plans': 'Ètò',
    'nav.subscriptions': 'Ìsanwó oṣooṣù',
    'nav.teach': 'Kíkọ́ni',
    'nav.review': 'Àyẹ̀wò',
    'nav.certificates': 'Ìwé-ẹ̀rí',
    'footer.tagline': 'Ẹ̀kọ́ ìmọ̀ Ìsìlámù fún ọmọdé àti àgbà, kárí ayé.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Nípa wa',
    'footer.terms': 'Àwọn òfin àti àṣírí',
    'footer.help': 'Ìrànwọ́',
    'footer.verify': 'Ṣàyẹ̀wò ìwé-ẹ̀rí',
    'footer.area': 'Àgbègbè rẹ',
    'footer.notifications': 'Ìfitónilétí',
    'action.signIn': 'Wọlé',
    'action.getStarted': 'Bẹ̀rẹ̀',
    'action.signOut': 'Jáde',
    'action.save': 'Fi pamọ́',
    'action.cancel': 'Fagilé',
    'region.africa': 'Áfíríkà',
    'region.middleEast': 'Àárín Gbùngbùn Ìlà Oòrùn',
    'region.asia': 'Éṣíà',
    'region.west': 'Yúróòpù àti Amẹ́ríkà',
    'language.title': 'Èdè',
    'language.lede':
      'A ń fi èdè tí o yàn níbí hàn àwọn ọ̀rọ̀ ojú-ìwé. Ẹ̀rọ yìí bẹ̀rẹ̀ pẹ̀lú èdè tí ẹ̀rọ rẹ béèrè, ó sì ń tẹ̀lé e títí tí o fi yan èdè mìíràn.',
    'language.current': 'Èyí tí a ń lò báyìí',
    'language.chosen': 'O yan èdè yìí lórí ẹ̀rọ yìí.',
    'language.device':
      'Èyí ni èdè tí ẹ̀rọ rẹ béèrè. Yan èdè mìíràn ní ìsàlẹ̀ láti yí i padà.',
    'language.default':
      'Ẹ̀rọ rẹ béèrè èdè tí ojú-ìwé yìí kò tíì ní, nítorí náà ó wà ní èdè Gẹ̀ẹ́sì.',
    'language.pick': 'Fi ojú-ìwé hàn ní',
    'language.deviceOption': 'Èdè ẹ̀rọ mi',
    'language.change': 'Yí èdè padà',
    'language.saved': 'A ti fi pamọ́. Ojú-ìwé wà ní {language} báyìí.',
    'language.coverage':
      'A ti túmọ̀ {percent}% àwọn ọ̀rọ̀ ojú-ìwé yìí sí {language}. Ohun tí a kò tíì túmọ̀ ni a fi hàn ní èdè Gẹ̀ẹ́sì.',
    'language.coverageAll': 'A ti túmọ̀ èdè yìí ní kíkún.',
    'language.browser':
      'A ń fi yíyàn náà pamọ́ lórí ẹ̀rọ yìí, kì í ṣe lórí àkọsílẹ̀ rẹ, nítorí náà ẹ̀rọ mìíràn yóò béèrè èdè tirẹ̀.',
    'language.reviewed': 'Ẹnì kan tí èdè náà jẹ́ èdè ìbílẹ̀ ti ka ìtúmọ̀ yìí.',
    'language.partial':
      'Àwọn tó ń sọ èdè ìbílẹ̀ ti ka apá {read} nínú {total} apá ìtumọ̀ yìí.',
    'language.unreviewed':
      'Kò tíì sí ẹni tí èdè náà jẹ́ èdè ìbílẹ̀ tí ó ti ka ìtúmọ̀ yìí. Àwọn tí wọ́n kọ́ ojú-ìwé yìí ni wọ́n kọ ọ́ — bí ọ̀rọ̀ kan bá dà bí àṣìṣe, àṣìṣe wa ni.',
    'language.notTranslated':
      'Túmọ̀ ojú-ìwé nìkan. Àkọlé ẹ̀kọ́, ẹ̀kọ́, ojú-ìwé olùkọ́ àti àwọn òfin tí a tẹ̀ jáde wà ní èdè tí a kọ wọ́n.',
  },

  ig: {
    'skip.toContent': 'Mafere gaa na ọdịnaya',
    'nav.main': 'Isi menu',
    'nav.catalogue': 'Ndepụta ihe ọmụmụ',
    'nav.learn': 'Mmụta m',
    'nav.family': 'Ezinụlọ m',
    'nav.plans': 'Atụmatụ',
    'nav.subscriptions': 'Ịkwụ ụgwọ kwa ọnwa',
    'nav.teach': 'Nzí',
    'nav.review': 'Nyocha',
    'nav.certificates': 'Akwụkwọ asambodo',
    'footer.tagline': 'Mmụta Islam maka ụmụaka na ndị okenye, n’ụwa niile.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Banyere anyị',
    'footer.terms': 'Usoro na nzuzo',
    'footer.help': 'Enyemaka',
    'footer.verify': 'Lelee akwụkwọ asambodo',
    'footer.area': 'Ebe gị',
    'footer.notifications': 'Ọkwa',
    'action.signIn': 'Banye',
    'action.getStarted': 'Malite',
    'action.signOut': 'Pụọ',
    'action.save': 'Chekwaa',
    'action.cancel': 'Kagbuo',
    'region.africa': 'Afrịka',
    'region.middleEast': 'Etiti Ebe Ọwụwa Anyanwụ',
    'region.asia': 'Eshia',
    'region.west': 'Europe na Amerika',
    'language.title': 'Asụsụ',
    'language.lede':
      'A na-egosi okwu ihu akwụkwọ n’asụsụ ị họọrọ ebe a. Ihe nchọgharị a na-amalite n’asụsụ ngwaọrụ gị rịọrọ, ọ na-esokwa ya ruo mgbe ị họọrọ asụsụ ọzọ.',
    'language.current': 'Nke a na-eji ugbu a',
    'language.chosen': 'Ị họọrọ asụsụ a na ihe nchọgharị a.',
    'language.device':
      'Nke a bụ asụsụ ngwaọrụ gị rịọrọ. Họrọ otu n’okpuru iji gbanwee ya.',
    'language.default':
      'Ngwaọrụ gị rịọrọ asụsụ nke ihu akwụkwọ a na-enwebeghị, ya mere ọ nọ n’Bekee.',
    'language.pick': 'Gosi ihu akwụkwọ n’',
    'language.deviceOption': 'Asụsụ ngwaọrụ m',
    'language.change': 'Gbanwee asụsụ',
    'language.saved': 'Echekwara. Ihu akwụkwọ dị ugbu a n’{language}.',
    'language.coverage':
      'A sụgharịrị {percent}% nke okwu ihu akwụkwọ a gaa n’{language}. Ihe a na-akọwapụtabeghị na-egosi n’Bekee.',
    'language.coverageAll': 'A sụgharịrị asụsụ a kpamkpam.',
    'language.browser':
      'A na-echekwa nhọrọ a na ihe nchọgharị a, ọ bụghị na akaụntụ gị, ya mere ngwaọrụ ọzọ ga-ajụ asụsụ nke ya.',
    'language.reviewed': 'Onye na-asụ asụsụ a dịka asụsụ ala nna agụọla ntụgharị a.',
    'language.partial':
      'Ndị na-asụ asụsụ ọmụmụ agụọla akụkụ {read} nke {total} akụkụ ntụgharị a.',
    'language.unreviewed':
      'Ọ dịbeghị onye na-asụ asụsụ a dịka asụsụ ala nna gụrụ ntụgharị a. Ndị wuru ebe a ka dere ya — ọ bụrụ na okwu dị gị ka ihe e mejọrọ, anyị ka mejọrọ ya.',
    'language.notTranslated':
      'Naanị ntụgharị nke ihu akwụkwọ. Aha ihe ọmụmụ, nkuzi, ibe ndị nkuzi na iwu ndị e bipụtara na-apụta n’asụsụ e dere ha.',
  },

  wo: {
    'skip.toContent': 'Wàcc ci li ëmb',
    'nav.main': 'Menu gu mag',
    'nav.catalogue': 'Limu kursas',
    'nav.learn': 'Jàng mi',
    'nav.family': 'Kër gi',
    'nav.plans': 'Sémb',
    'nav.subscriptions': 'Abonmaa',
    'nav.teach': 'Jàngal',
    'nav.review': 'Saytul',
    'nav.certificates': 'Sertifika yi',
    'footer.tagline': 'Jàngalukaay ci diine Islaam ngir xale yi ak mag yi, ci àdduna bépp.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Ci nun',
    'footer.terms': 'Yoon yi ak sutura',
    'footer.help': 'Ndimbal',
    'footer.verify': 'Seet sertifika',
    'footer.area': 'Bérab ba',
    'footer.notifications': 'Yégal yi',
    'action.signIn': 'Dugg',
    'action.getStarted': 'Tàmbali',
    'action.signOut': 'Génn',
    'action.save': 'Denc',
    'action.cancel': 'Neenal',
    'region.africa': 'Afrik',
    'region.middleEast': 'Penku Diggu',
    'region.asia': 'Asi',
    'region.west': 'Ërop ak Amerik',
    'language.title': 'Làkk',
    'language.lede':
      'Xët wi dafay wone ci làkk bi nga tann fii. Browser bi dafay tàmbali ci làkk bi sa masin laaj, te dafay topp ko ba nga tann benn bu ñu ëmb.',
    'language.current': 'Bi ñu koy jëfandikoo léegi',
    'language.chosen': 'Tann nga làkk bii ci browser bii.',
    'language.device':
      'Bii mooy làkk bi sa masin laaj. Tann benn ci suuf ngir soppi ko.',
    'language.default':
      'Sa masin laaj na làkk bu xët wii amul, kon mu ngi ci Àngale.',
    'language.pick': 'Wone xët wi ci',
    'language.deviceOption': 'Làkk sama masin',
    'language.change': 'Soppi làkk',
    'language.saved': 'Denc nañu ko. Xët wi léegi mu ngi ci {language}.',
    'language.coverage':
      '{percent}% ci waxiin xët wii ñu tekki ko ci {language}. Li ñu tekkiwul ñu koy wone ci Àngale.',
    'language.coverageAll': 'Làkk bii ñu tekki na ko mat.',
    'language.browser':
      'Tann bi ñu koy denc ci browser bii, du ci sa kont, kon beneen masin dafay laaj boppam làkk.',
    'language.reviewed': 'Nit ku waxa làkk mi tekki naan na tafsir bii.',
    'language.partial':
      'Nit ñu koy wax ci làkk bi ci njëkk dañu jàng {read} ci {total} wàll yi ci tekki bii.',
    'language.unreviewed':
      'Amuloo nit ku waxa làkk mi tekki tafsir bii. Ku ñu tabax bàjji bi ñu ko bind — su wàll bi yoon laaj, yoon wi ñu la.',
    'language.notTranslated':
      'Tekki xët wi rekk. Turu kursas yi, jàng yi, xët jàngalekat yi ak yoon yi ñu siiwal, dañuy feeñ ci làkk bi ñu bindal.',
  },

  ff: {
    'skip.toContent': 'Yawto to loowdi',
    'nav.main': 'Menu mawɗo',
    'nav.catalogue': 'Doggol janngirɗe',
    'nav.learn': 'Janngirde am',
    'nav.family': 'Galle am',
    'nav.plans': 'Peccal',
    'nav.subscriptions': 'Abonmaa',
    'nav.teach': 'Janngingol',
    'nav.review': 'Ƴeewndo',
    'nav.certificates': 'Seedanteeje',
    'footer.tagline':
      'Janngirde Diina Lislaamu wonande sukaaɓe e mawɓe, e nder winndere ndee kala.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Fii amen',
    'footer.terms': 'Doosɗe e suturo',
    'footer.help': 'Ballal',
    'footer.verify': 'Ƴeew seedantaagal',
    'footer.area': 'Nokku maa',
    'footer.notifications': 'Habaruuji',
    'action.signIn': 'Naatu',
    'action.getStarted': 'Fuɗɗo',
    'action.signOut': 'Yaltu',
    'action.save': 'Danndu',
    'action.cancel': 'Haaytu',
    'region.africa': 'Afirik',
    'region.middleEast': 'Fuɗnaange Cakaare',
    'region.asia': 'Aasiya',
    'region.west': 'Yuroop e Amerik',
    'language.title': 'Ɗemngal',
    'language.lede':
      'Hello ngal ina holliree e ɗemngal ɗo ka suɓii. Browser oo fuɗɗotoo ko e ɗemngal nde masiin maa naamni, ina jokki haa ka suɓa goɗɗum.',
    'language.current': 'Ko huutorteeke jooni',
    'language.chosen': 'A suɓiima ndee ɗemngal e ndee browser.',
    'language.device':
      'Ndee ko ɗemngal nde masiin maa naamni. Suɓo goɗɗum les ngam waylude nde.',
    'language.default':
      'Masiin maa naamnii ɗemngal nde hello ngal alaa, haray ina e Engele.',
    'language.pick': 'Hollu hello ngal e',
    'language.deviceOption': 'Ɗemngal masiin am',
    'language.change': 'Waylu ɗemngal',
    'language.saved': 'Danndaama. Hello ngal jooni ina e {language}.',
    'language.coverage':
      '{percent}% e binndanɗe hello ngal firtaama e {language}. Ko firtaaka hollirtee ko e Engele.',
    'language.coverageAll': 'Ndee ɗemngal firtaama fof.',
    'language.browser':
      'Suɓal ngal danndiray e ndee browser, wonaa e konte maa, haray masiin goɗɗum naamnay ɗemngal mun.',
    'language.reviewed': 'Haaloowo ɗemngal mum firde ndee.',
    'language.partial':
      'Yimɓe ɓe ɗemngal gadanal woni ɗemngal mum en ndaari {read} e {total} pecce firo ndee.',
    'language.unreviewed':
      'On heɓaani haalooɓe ɗemngal mum firde ndee haa jooni. Ɗum winndiiɓe ɗum ko mahooɓe dingiral ngal — so konngol feeñii maa ko woopde, woopde menen.',
    'language.notTranslated':
      'Firde hello ngal tan. Tiitooɗe janngirɗe, janngirɗe, helloji jannginooɓe e doosɗe bayɗe ina kolliree e ɗemngal nde winndaani.',
  },

  bm: {
    'skip.toContent': 'Taa kɔnɔkow ma',
    'nav.main': 'Menu ba',
    'nav.catalogue': 'Kalansen lisili',
    'nav.learn': 'N ka kalan',
    'nav.family': 'N ka somɔgɔw',
    'nav.plans': 'Labɛnw',
    'nav.subscriptions': 'Abonman',
    'nav.teach': 'Karamɔgɔya',
    'nav.review': 'Ɲɛjirali',
    'nav.certificates': 'Sɛbɛnw minnu bɛ seedareya',
    'footer.tagline':
      'Silamɛ diinɛ kalan bɔlen bɛ bolodenniw ni mɔgɔkɔrɔw ye, diɲɛ fan bɛɛ.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'An ña',
    'footer.terms': 'Sariyaw ni gundo',
    'footer.help': 'Dɛmɛ',
    'footer.verify': 'Sɛbɛn lajɛ',
    'footer.area': 'I ka yɔrɔ',
    'footer.notifications': 'Kibaruw',
    'action.signIn': 'Don',
    'action.getStarted': 'Damina',
    'action.signOut': 'Bɔ',
    'action.save': 'A mara',
    'action.cancel': 'A bali',
    'region.africa': 'Afiriki',
    'region.middleEast': 'Cɛmancɛ Wuɲɔgɔn',
    'region.asia': 'Azi',
    'region.west': 'Eropu ni Ameriki',
    'language.title': 'Kan',
    'language.lede':
      'Nin ɲɛ bɛ jira kan min na i y’a sugandi yan. Nin browser bɛ damina kan min na i ka masin y’a ɲini, a bɛ a landa fɔ i ka dɔ wɛrɛ sugandi.',
    'language.current': 'Min bɛ baara kɛ ni a ye sisan',
    'language.chosen': 'I y’a sugandi nin browser in na.',
    'language.device':
      'Nin ye kan min na i ka masin y’a ɲini. Dɔ wɛrɛ sugandi duguma walisa ka a falen.',
    'language.default':
      'I ka masin y’a ɲini kan min tɛ nin ɲɛ fɛ, o la a bɛ Angilɛkan na.',
    'language.pick': 'Nin ɲɛ jira',
    'language.deviceOption': 'N ka masin ka kan',
    'language.change': 'Kan falen',
    'language.saved': 'A mara. Nin ɲɛ bɛ {language} kɔnɔ sisan.',
    'language.coverage':
      '{percent}% nin ɲɛ ka kumaw bɛ {language} kɔnɔ. Min ma baŋ, a bɛ jira Angilɛkan na.',
    'language.coverageAll': 'Nin kan baŋna kɔnɔ.',
    'language.browser':
      'Sugandi in bɛ mara nin browser in na, i ka konti kɔnɔ tɛ, o la masin wɛrɛ bɛna a ka kan ɲini.',
    'language.reviewed': 'Mɔgɔ min ka kan jɔyɔrɔ ye, o y’a kalan.',
    'language.partial':
      'Mɔgɔ minnu bɛ kuma bɛnkan na, u karan {read} ka bɔ {total} la, fɔlɔfɔlɔ kɔrɔ.',
    'language.unreviewed':
      'Mɔgɔ ma nin falen in kalan ni a ka kan jɔyɔrɔ ye fɔlɔ. Nin ɲɛ sabatigiw ye a sɛbɛn — ni kuma dɔ bɛ i ɲɛ ka a ye ko fili, an ka fili.',
    'language.notTranslated':
      'Nin ɲɛ ka kan falen dɔrɔn. Kalanw tɔgɔw, kalansenw, karamɔgɔw ka ɲɛw ni sariyaw minnu bɔra, bɛ jira kan min na a sɛbɛnna.',
  },
};
