import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Southern African catalogues: Zulu, Xhosa, Afrikaans, Shona, Sesotho and
 * Chichewa.
 *
 * **Nguni and Sotho languages carry their noun-class prefixes into the interface
 * too.** A Zulu reader says `isiZulu` for the language and `iSitifiketi` for the
 * certificate; the prefixes are written out rather than dropped, because
 * `Zulu` and `Sitifiketi` are English spellings of Zulu words, not Zulu.
 *
 * **Afrikaans is here although it is not an African *language family*.** It is
 * the home language of millions of South Africans and Namibians, it is written
 * in Latin script with no special machinery, and a picker that skipped it would
 * be making a point rather than doing a job.
 *
 * **Not yet read by a speaker** — `reviewed: false` in `locales.ts`, printed on
 * `/language`.
 */
export const AFRICA_SOUTH: Partial<Record<LocaleCode, Partial<Messages>>> = {
  zu: {
    'skip.toContent': 'Yeqa uye kokuqukethwe',
    'nav.main': 'Imenyu eyinhloko',
    'nav.catalogue': 'Uhlu lwezifundo',
    'nav.learn': 'Ukufunda kwami',
    'nav.family': 'Umndeni wami',
    'nav.plans': 'Izinhlelo',
    'nav.subscriptions': 'Ukubhalisa nyanga zonke',
    'nav.teach': 'Fundisa',
    'nav.review': 'Ukubukezwa',
    'nav.certificates': 'Izitifiketi',
    'footer.tagline': 'Imfundo yamaSulumane yezingane nabantu abadala, emhlabeni wonke.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Mayelana nathi',
    'footer.terms': 'Imigomo nobumfihlo',
    'footer.help': 'Usizo',
    'footer.verify': 'Hlola isitifiketi',
    'footer.area': 'Indawo yakho',
    'footer.notifications': 'Izaziso',
    'action.signIn': 'Ngena',
    'action.getStarted': 'Qala',
    'action.signOut': 'Phuma',
    'action.save': 'Londoloza',
    'action.cancel': 'Khansela',
    'region.africa': 'i-Afrika',
    'region.middleEast': 'iMpumalanga Ephakathi',
    'region.asia': 'i-Asia',
    'region.west': 'iYurophu neMelika',
    'language.title': 'Ulimi',
    'language.lede':
      'Ikhasi likhonjiswa ngolimi olukhetha lapha. Isiphequluli siqala ngolimi olucelwa idivayisi yakho, futhi silulandela kuze kube ukhetha olunye.',
    'language.current': 'Okusetshenziswa manje',
    'language.chosen': 'Ukhethe lolu limi kulesi siphequluli.',
    'language.device':
      'Lolu ulimi olucelwe idivayisi yakho. Khetha olunye ngezansi ukuze ulushintshe.',
    'language.default':
      'Idivayisi yakho icele ulimi leli khasi elinganalo, ngakho likhuluma isiNgisi.',
    'language.pick': 'Bonisa ikhasi ngo',
    'language.deviceOption': 'Ulimi lwedivayisi yami',
    'language.change': 'Shintsha ulimi',
    'language.saved': 'Kugciniwe. Ikhasi manje likhuluma {language}.',
    'language.coverage':
      '{percent}% yombhalo wale khasi uhunyushiwe olimini: {language}. Okungakahunyushwa kukhonjiswa ngesiNgisi.',
    'language.coverageAll': 'Lolu limi luhunyushwe ngokugcwele.',
    'language.browser':
      'Ukukhetha kwakho kugcinwa kulesi siphequluli, hhayi ku-akhawunti yakho, ngakho edivayisi enye izocela ulimi lwayo.',
    'language.reviewed': 'Okhuluma lolu limi njengolimi lwakhe useke wafunda le nguqulo.',
    'language.unreviewed':
      'Akekho okhuluma lolu limi njengolimi lwakhe oseke wafunda le nguqulo. Iqanjwe yilabo abakha le ndawo — uma igama likubonakala lingalungile, iphutha lethu.',
    'language.notTranslated':
      'Ukuhunyushwa kwekhasi kuphela. Izihloko zezifundo, izifundo, amakhasi othisha nemigomo eshicilelwe kuvela ngolimi eyabhalwa ngalo.',
  },

  xh: {
    'skip.toContent': 'Tsiba uye kumxholo',
    'nav.main': 'Imenyu ephambili',
    'nav.catalogue': 'Uluhlu lwezifundo',
    'nav.learn': 'Ukufunda kwam',
    'nav.family': 'Usapho lwam',
    'nav.plans': 'Izicwangciso',
    'nav.subscriptions': 'Ukubhalisa nyanga zonke',
    'nav.teach': 'Fundisa',
    'nav.review': 'Uphononongo',
    'nav.certificates': 'Izatifikethi',
    'footer.tagline': 'Imfundo yamaSilamsi yabantwana nabantu abadala, ehlabathini lonke.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Ngathi',
    'footer.terms': 'Imigaqo nobumfihlo',
    'footer.help': 'Uncedo',
    'footer.verify': 'Khangela isatifikethi',
    'footer.area': 'Indawo yakho',
    'footer.notifications': 'Izaziso',
    'action.signIn': 'Ngena',
    'action.getStarted': 'Qalisa',
    'action.signOut': 'Phuma',
    'action.save': 'Gcina',
    'action.cancel': 'Rhoxisa',
    'region.africa': 'i-Afrika',
    'region.middleEast': 'uMbindi Mpuma',
    'region.asia': 'i-Asiya',
    'region.west': 'iYurophu neMelika',
    'language.title': 'Ulwimi',
    'language.lede':
      'Eli phepha liboniswa ngolwimi olukhetha apha. Isikhangeli siqala ngolwimi olucelwa sisixhobo sakho, kwaye silulandela de ukhethe olunye.',
    'language.current': 'Okusetyenziswayo ngoku',
    'language.chosen': 'Ukhethe olu lwimi kwesi sikhangeli.',
    'language.device':
      'Olu lulwimi olucelwe sisixhobo sakho. Khetha olunye ngezantsi ukuze ulutshintshe.',
    'language.default':
      'Isixhobo sakho sicele ulwimi eli phepha elinganalo, ngoko likwisiNgesi.',
    'language.pick': 'Bonisa eli phepha ngo',
    'language.deviceOption': 'Ulwimi lwesixhobo sam',
    'language.change': 'Tshintsha ulwimi',
    'language.saved': 'Kugciniwe. Eli phepha ngoku likulwimi: {language}.',
    'language.coverage':
      '{percent}% yombhalo weli phepha uguqulelwe kulwimi: {language}. Okungaguqulelwanga kuboniswa ngesiNgesi.',
    'language.coverageAll': 'Olu lwimi luguqulelwe ngokupheleleyo.',
    'language.browser':
      'Ukukhetha kwakho kugcinwa kwesi sikhangeli, hayi kwi-akhawunti yakho, ngoko esinye isixhobo siza kucela ulwimi lwaso.',
    'language.reviewed': 'Umntu othetha olu lwimi njengolwimi lwakhe ufunde le nguqulelo.',
    'language.unreviewed':
      'Akukho mntu uthetha olu lwimi njengolwimi lwakhe okwangoku ufunde le nguqulelo. Ibhalwe ngabo bakhe eli qonga — ukuba igama libonakala lingalunganga, impazamo yeyethu.',
    'language.notTranslated':
      'Uguqulelo lwephepha kuphela. Izihloko zezifundo, izifundo, amaphepha ootitshala nemigaqo epapashiweyo ivela ngolwimi eyabhalwa ngalo.',
  },

  af: {
    'skip.toContent': 'Spring na inhoud',
    'nav.main': 'Hoofkieslys',
    'nav.catalogue': 'Katalogus',
    'nav.learn': 'My leer',
    'nav.family': 'My familie',
    'nav.plans': 'Planne',
    'nav.subscriptions': 'Subskripsies',
    'nav.teach': 'Onderrig',
    'nav.review': 'Nasien',
    'nav.certificates': 'Sertifikate',
    'footer.tagline': 'Islamitiese onderwys vir kinders en volwassenes, wêreldwyd.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Oor ons',
    'footer.terms': 'Voorwaardes en privaatheid',
    'footer.help': 'Hulp',
    'footer.verify': 'Kontroleer ’n sertifikaat',
    'footer.area': 'Jou area',
    'footer.notifications': 'Kennisgewings',
    'action.signIn': 'Meld aan',
    'action.getStarted': 'Begin',
    'action.signOut': 'Meld af',
    'action.save': 'Stoor',
    'action.cancel': 'Kanselleer',
    'region.africa': 'Afrika',
    'region.middleEast': 'Midde-Ooste',
    'region.asia': 'Asië',
    'region.west': 'Europa en die Amerikas',
    'language.title': 'Taal',
    'language.lede':
      'Die koppelvlak word in die taal gewys wat jy hier kies. Hierdie blaaier begin met die taal wat jou toestel vra, en volg dit totdat jy een kies.',
    'language.current': 'Tans gewys',
    'language.chosen': 'Jy het hierdie taal in hierdie blaaier gekies.',
    'language.device':
      'Dit is die taal wat jou toestel gevra het. Kies een hieronder om dit te verander.',
    'language.default':
      'Jou toestel het ’n taal gevra wat hierdie koppelvlak nog nie het nie, daarom is dit in Engels.',
    'language.pick': 'Wys die koppelvlak in',
    'language.deviceOption': 'My toestel se taal',
    'language.change': 'Verander taal',
    'language.saved': 'Gestoor. Die koppelvlak is nou in {language}.',
    'language.coverage':
      '{percent}% van hierdie koppelvlak se woorde is in {language} vertaal. Wat nog nie vertaal is nie, word in Engels gewys.',
    'language.coverageAll': 'Hierdie taal is volledig vertaal.',
    'language.browser':
      'Die keuse word in hierdie blaaier gehou, nie op jou rekening nie, so ’n ander toestel vra sy eie toestel.',
    'language.reviewed': '’n Moedertaalspreker het hierdie vertaling gelees.',
    'language.unreviewed':
      'Nog geen moedertaalspreker het hierdie vertaling gelees nie. Dit is deur die mense geskryf wat die platform gebou het — as ’n woord vir jou verkeerd lyk, is dit ons fout.',
    'language.notTranslated':
      'Slegs die koppelvlak is vertaal. Kursustitels, lesse, onderwyserblaaie en die gepubliseerde beleide verskyn in die taal waarin dit geskryf is.',
  },

  sn: {
    'skip.toContent': 'Svika kune zviri mukati',
    'nav.main': 'Menyu huru',
    'nav.catalogue': 'Rondedzero yezvidzidzo',
    'nav.learn': 'Kudzidza kwangu',
    'nav.family': 'Mhuri yangu',
    'nav.plans': 'Zvirongwa',
    'nav.subscriptions': 'Kubhadhara mwedzi nemwedzi',
    'nav.teach': 'Dzidzisa',
    'nav.review': 'Ongorora',
    'nav.certificates': 'Zvitupa',
    'footer.tagline': 'Dzidzo yeIslam kuvana nevakuru, munyika yose.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Nezvedu',
    'footer.terms': 'Mitemo nekuvanzika',
    'footer.help': 'Rubatsiro',
    'footer.verify': 'Tarisa chitupa',
    'footer.area': 'Nzvimbo yako',
    'footer.notifications': 'Zviziviso',
    'action.signIn': 'Pinda',
    'action.getStarted': 'Tanga',
    'action.signOut': 'Buda',
    'action.save': 'Chengetedza',
    'action.cancel': 'Kanzura',
    'region.africa': 'Afrika',
    'region.middleEast': 'Mabvazuva epakati',
    'region.asia': 'Asia',
    'region.west': 'Europe neAmerica',
    'language.title': 'Mutauro',
    'language.lede':
      'Peji rino rinoratidzwa nemutauro waunosarudza pano. Bhurauza rino rinotanga nemutauro unokumbirwa nechishandiso chako, uye rinouramba uri pauri kusvikira wasarudza mumwe.',
    'language.current': 'Zvirikushandiswa izvozvi',
    'language.chosen': 'Wasarudza mutauro uyu pabhurauza rino.',
    'language.device':
      'Uyu ndiwo mutauro wakumbirwa nechishandiso chako. Sarudza mumwe pazasi kuti uuchinje.',
    'language.default':
      'Chishandiso chako chakumbira mutauro usipo papeji rino, saka riri muChirungu.',
    'language.pick': 'Ratidza peji rino mu',
    'language.deviceOption': 'Mutauro wechishandiso changu',
    'language.change': 'Chinja mutauro',
    'language.saved': 'Zvachengetwa. Peji rino rava mu{language}.',
    'language.coverage':
      '{percent}% yemashoko epeji rino yashandurirwa mu{language}. Zvisati zvashandurwa zvinoratidzwa muChirungu.',
    'language.coverageAll': 'Mutauro uyu washandurwa zvizere.',
    'language.browser':
      'Sarudzo inochengetwa pabhurauza rino, kwete paakaunti yako, saka chimwe chishandiso chichakumbira chayo mutauro.',
    'language.reviewed': 'Mumwe mutauri wemutauro uyu akarangarira kushandurwa uku.',
    'language.unreviewed':
      'Hapana mutauri wemutauro uyu sezvarangarira kushandurwa uku. Kwakanyorwa nevanovaka chikuva ichi — kana izwi richiita seri riri, kukanganisa kwedu.',
    'language.notTranslated':
      'Kushandurwa kwepeji chete. Misoro yezvidzidzo, zvidzidzo, mapeji evadzidzisi nemitemo yakabudiswa zvinoratidzwa nemutauro zvakanyorerwa nawo.',
  },

  st: {
    'skip.toContent': 'Tlōla u ee ho litaba',
    'nav.main': 'Menyu e kholo',
    'nav.catalogue': 'Lenane la lithuto',
    'nav.learn': 'Thuto ea ka',
    'nav.family': 'Lelapa la ka',
    'nav.plans': 'Merero',
    'nav.subscriptions': 'Ngodiso',
    'nav.teach': 'Ruta',
    'nav.review': 'Tlhatlhobo',
    'nav.certificates': 'Litifikete',
    'footer.tagline': 'Thuto ea Boislamo bakeng sa bana le batho ba baholo, lefats’eng lohle.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Mabapi le rona',
    'footer.terms': 'Melao le lekunutu',
    'footer.help': 'Thuso',
    'footer.verify': 'Hlahloba tifikeiti',
    'footer.area': 'Sebaka sa hau',
    'footer.notifications': 'Litsebiso',
    'action.signIn': 'Kena',
    'action.getStarted': 'Qala',
    'action.signOut': 'Tsoa',
    'action.save': 'Boloka',
    'action.cancel': 'Hlakola',
    'region.africa': 'Afrika',
    'region.middleEast': 'Botjhabela bo Hare',
    'region.asia': 'Asia',
    'region.west': 'Europa le Amerika',
    'language.title': 'Puo',
    'language.lede':
      'Leqephe lena le bontšoa ka puo eo u e khethang mona. Sebatli sena se qala ka puo eo sesebelisoa sa hau se e kopang, ’me se e latela ho fihlela u khetha e ’ngoe.',
    'language.current': 'E sebelisoang hona joale',
    'language.chosen': 'U khethile puo ena ho sebatli sena.',
    'language.device':
      'Ena ke puo eo sesebelisoa sa hau se e kopileng. Khetha e ’ngoe ka tlase ho e fetola.',
    'language.default':
      'Sesebelisoa sa hau se kopile puo eo leqephe lena le se nang eona, kahoo le ka Senyesemane.',
    'language.pick': 'Bontša leqephe ka',
    'language.deviceOption': 'Puo ea sesebelisoa sa ka',
    'language.change': 'Fetola puo',
    'language.saved': 'Ho bolokiloe. Leqephe hona joale le ka {language}.',
    'language.coverage':
      '{percent}% ea mantsoe a leqephe lena e fetoletsoe ho {language}. Se sa fetoleloang se bontšoa ka Senyesemane.',
    'language.coverageAll': 'Puo ena e fetoletsoe ka botlalo.',
    'language.browser':
      'Khetho e bolokoa ho sebatli sena, eseng ho akhaonto ea hau, kahoo sesebelisoa se seng se tla kopa puo ea sona.',
    'language.reviewed': 'Sebui sa puo ena e le puo ea hae se balile phetolelo ena.',
    'language.unreviewed':
      'Ha ho na sebui sa puo ena e le puo ea hae se se kileng sa bala phetolelo ena. E ngotsoe ke ba hahang sethala sena — haeba lentsoe le bonahala le fosahetse, phoso ke ea rona.',
    'language.notTranslated':
      'Ho fetoleloa ha leqephe feela. Lihlooho tsa lithuto, lithuto, maqephe a matichere le maano a phatlalalitsoeng li hlaha ka puo eo li ngotsoeng ka eona.',
  },

  ny: {
    'skip.toContent': 'Lumphani kupita ku zomwe zili',
    'nav.main': 'Menyu yaikulu',
    'nav.catalogue': 'Mndandanda wa maphunziro',
    'nav.learn': 'Maphunziro anga',
    'nav.family': 'Banja langa',
    'nav.plans': 'Mapulani',
    'nav.subscriptions': 'Kulembetsa mwezi uliwonse',
    'nav.teach': 'Phunzitsani',
    'nav.review': 'Unikani',
    'nav.certificates': 'Satifiketi',
    'footer.tagline': 'Maphunziro a Chisilamu kwa ana ndi akulu, padziko lonse lapansi.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Za ife',
    'footer.terms': 'Malamulo ndi chinsinsi',
    'footer.help': 'Thandizo',
    'footer.verify': 'Onani satifiketi',
    'footer.area': 'Malo anu',
    'footer.notifications': 'Zidziwitso',
    'action.signIn': 'Lowani',
    'action.getStarted': 'Yambani',
    'action.signOut': 'Tulukani',
    'action.save': 'Sungani',
    'action.cancel': 'Letsani',
    'region.africa': 'Afirika',
    'region.middleEast': 'Mmawa Wapakati',
    'region.asia': 'Asia',
    'region.west': 'Ulaya ndi Amerika',
    'language.title': 'Chinenero',
    'language.lede':
      'Tsamba ili likuonetsedwa m’chinenero chomwe mwasankha pano. Msakatuli ameneyu amayamba ndi chinenero chomwe chipangizo chanu chikupempha, ndipo amatsatira mpaka musankhe china.',
    'language.current': 'Chomwe chikugwiritsidwa ntchito tsopano',
    'language.chosen': 'Munasankha chinenero ichi pa msakatuli ameneyu.',
    'language.device':
      'Ichi ndi chinenero chomwe chipangizo chanu chinapempha. Sankhani china pansipa kuti musinthe.',
    'language.default':
      'Chipangizo chanu chinapempha chinenero chomwe tsamba ili lilibe, choncho lili m’Chingerezi.',
    'language.pick': 'Onetsani tsamba mu',
    'language.deviceOption': 'Chinenero cha chipangizo changa',
    'language.change': 'Sinthani chinenero',
    'language.saved': 'Zasungidwa. Tsamba ili tsopano lili mu {language}.',
    'language.coverage':
      '{percent}% ya mawu a tsamba ili yatanthauziridwa mu {language}. Zomwe sizinatanthauzidwe zikuonetsedwa m’Chingerezi.',
    'language.coverageAll': 'Chinenero ichi chatanthauziridwa kwathunthu.',
    'language.browser':
      'Chisankho chimasungidwa pa msakatuli ameneyu, osati pa akaunti yanu, kotero chipangizo china chidzapempha chinenero chake.',
    'language.reviewed': 'Wolankhula chinenero ichi monga chinenero chawo anawerenga kumasulira uku.',
    'language.unreviewed':
      'Palibe wolankhula chinenero ichi monga chinenero chawo amene anawerenga kumasulira uku. Zinalembedwa ndi omwe anamanga malo awa — ngati mawu akuoneka olakwika, kulakwitsa kwathu.',
    'language.notTranslated':
      'Kutanthauzira kwa tsamba pokha. Mitu ya maphunziro, maphunziro, masamba a aphunzitsi ndi malamulo ofalitsidwa amawonekera m’chinenero chomwe adalembedwera.',
  },
};
