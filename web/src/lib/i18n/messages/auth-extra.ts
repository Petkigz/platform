import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The rest of the sign-in and sign-up screens: the hints under a field, the two
 * "or" lines under the Google button, and the three sentences that confirm
 * something happened.
 *
 * These are the strings that make a form feel finished rather than translated.
 * A reader can find the password field in their own language and then be told
 * *"Will be sent as +256772123456"* in English — which is the exact sentence
 * that tells them what is about to happen to the number they just typed.
 *
 * **Placeholders travel.** `{phone}` is the E.164 value computed on the client,
 * and a translation that drops it is a test failure rather than a sentence that
 * quietly lost its number.
 */
export const AUTH_EXTRA: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'auth.orGoogle': 'أو استخدم أحد هذه',
    'auth.orCreate': 'أو أنشئ حسابًا ببريد إلكتروني أو رقم هاتف',
    'auth.phoneAs': 'سيُحفظ بالشكل {phone}',
    'auth.international': 'بصيغة دولية بالفعل.',
    'auth.passwordNote': 'لا نحتفظ بها أبدًا. Supabase Auth يحمل بيانات الاعتماد.',
    'auth.codeSent': 'إن كان هناك حساب لـ{phone}، فالرمز في طريقه إليك.',
    'auth.codeResent': 'أُرسل رمز جديد إلى {phone}.',
    'auth.checkEmail': 'تم إنشاء الحساب. تحقّق من بريدك لتأكيد العنوان، ثم سجّل الدخول.',
    'auth.accountCreated': 'تم إنشاء حساب لـ{phone}.',
  },

  ur: {
    'auth.orGoogle': 'یا ان میں سے کوئی استعمال کریں',
    'auth.orCreate': 'یا ای میل یا فون نمبر سے اکاؤنٹ بنائیں',
    'auth.phoneAs': 'بطور {phone} محفوظ ہوگا',
    'auth.international': 'پہلے ہی بین الاقوامی شکل میں ہے۔',
    'auth.passwordNote': 'ہم اسے کبھی محفوظ نہیں کرتے۔ اسناد Supabase Auth کے پاس رہتی ہیں۔',
    'auth.codeSent': 'اگر {phone} کا اکاؤنٹ موجود ہے تو کوڈ راستے میں ہے۔',
    'auth.codeResent': '{phone} پر نیا کوڈ بھیج دیا گیا ہے۔',
    'auth.checkEmail': 'اکاؤنٹ بن گیا۔ پتے کی تصدیق کے لیے اپنی ای میل دیکھیں، پھر سائن اِن کریں۔',
    'auth.accountCreated': '{phone} کے لیے اکاؤنٹ بن گیا۔',
  },

  fa: {
    'auth.orGoogle': 'یا از یکی از این‌ها استفاده کنید',
    'auth.orCreate': 'یا با ایمیل یا شماره تلفن حساب بسازید',
    'auth.phoneAs': 'به شکل {phone} ذخیره می‌شود',
    'auth.international': 'از قبل در قالب بین‌المللی است.',
    'auth.passwordNote': 'ما هرگز آن را ذخیره نمی‌کنیم. Supabase Auth اعتبارنامه را نگه می‌دارد.',
    'auth.codeSent': 'اگر حسابی برای {phone} وجود داشته باشد، کد در راه است.',
    'auth.codeResent': 'کد تازه‌ای به {phone} فرستاده شد.',
    'auth.checkEmail': 'حساب ساخته شد. برای تأیید نشانی، ایمیل خود را ببینید و سپس وارد شوید.',
    'auth.accountCreated': 'حساب برای {phone} ساخته شد.',
  },

  sw: {
    'auth.orGoogle': 'au tumia moja ya hizi',
    'auth.orCreate': 'au fungua akaunti kwa barua pepe au namba ya simu',
    'auth.phoneAs': 'Itahifadhiwa kama {phone}',
    'auth.international': 'Tayari iko katika muundo wa kimataifa.',
    'auth.passwordNote': 'Hatuhifadhi kamwe. Supabase Auth inashikilia sifa hizo.',
    'auth.codeSent': 'Kama akaunti ya {phone} ipo, msimbo unakuja.',
    'auth.codeResent': 'Msimbo mpya umetumwa kwa {phone}.',
    'auth.checkEmail': 'Akaunti imefunguliwa. Angalia barua pepe yako kuthibitisha anwani, kisha ingia.',
    'auth.accountCreated': 'Akaunti imefunguliwa kwa {phone}.',
  },

  am: {
    'auth.orGoogle': 'ወይም ከእነዚህ አንዱን ተጠቀም',
    'auth.orCreate': 'ወይም በኢሜይል ወይም በስልክ ቁጥር መለያ ፍጠር',
    'auth.phoneAs': 'በ{phone} ይቀመጣል',
    'auth.international': 'አስቀድሞ በዓለም አቀፍ ቅርጽ ነው።',
    'auth.passwordNote': 'በፍጹም አናስቀምጠውም። Supabase Auth መረጃውን ይይዛል።',
    'auth.codeSent': 'ለ{phone} መለያ ካለ፣ ኮዱ በመንገድ ላይ ነው።',
    'auth.codeResent': 'አዲስ ኮድ ወደ {phone} ተልኳል።',
    'auth.checkEmail': 'መለያ ተፈጥሯል። አድራሻውን ለማረጋገጥ ኢሜይልዎን ይመልከቱ፣ ከዚያ ይግቡ።',
    'auth.accountCreated': 'ለ{phone} መለያ ተፈጥሯል።',
  },

  om: {
    'auth.orGoogle': 'yookaan kanneen keessaa tokko fayyadami',
    'auth.orCreate': 'yookaan imeelii yookaan lakkoofsa bilbilaatiin herrega uumi',
    'auth.phoneAs': 'Akka {phone}tti ni olkaa’ama',
    'auth.international': 'Dursee bifa idil-addunyaatiin jira.',
    'auth.passwordNote': 'Nuu gonkumaa hin olkaa’inu. Supabase Auth ragaa sana qabata.',
    'auth.codeSent': 'Yoo herregni {phone} jiraate, koodiin karaa irra jira.',
    'auth.codeResent': 'Koodiin haaraan {phone}tti ergameera.',
    'auth.checkEmail': 'Herregni uumameera. Imeelii keessan ilaalaa adiresii mirkaneessuuf, sana booda seenaa.',
    'auth.accountCreated': 'Herregni {phone} uumameera.',
  },

  so: {
    'auth.orGoogle': 'ama isticmaal mid ka mid ah kuwaan',
    'auth.orCreate': 'ama akoon ku samee iimayl ama lambar telefoon',
    'auth.phoneAs': 'Waxaa lagu kaydin doonaa {phone}',
    'auth.international': 'Hore ayaa loogu qoray qaab caalami ah.',
    'auth.passwordNote': 'Marnaba ma kaydinno. Supabase Auth ayaa haya xogta gelitaanka.',
    'auth.codeSent': 'Haddii akoon {phone} u jiro, koodhka ayaa soo socda.',
    'auth.codeResent': 'Koodh cusub ayaa loo diray {phone}.',
    'auth.checkEmail': 'Akoonka waa la sameeyay. Fiiri iimaylkaaga si aad u xaqiijiso cinwaanka, kadib gal.',
    'auth.accountCreated': 'Akoon ayaa loo sameeyay {phone}.',
  },

  ti: {
    'auth.orGoogle': 'ወይ ካብዞም ሓደ ተጠቐም',
    'auth.orCreate': 'ወይ ብኢመይል ወይ ብቁጽሪ ተሌፎን ሒሳብ ፍጠር',
    'auth.phoneAs': 'ከም {phone} ክቕመጥ እዩ',
    'auth.international': 'ኣቐዲሙ ብዓለምለኻዊ ቅርጺ ኣሎ።',
    'auth.passwordNote': 'ፈጺምና ኣንቐምጦን። Supabase Auth እዩ ዝሕዞ።',
    'auth.codeSent': 'ን{phone} ሒሳብ እንተሎ፡ እቲ ኮድ ኣብ መንገዲ እዩ።',
    'auth.codeResent': 'ሓድሽ ኮድ ናብ {phone} ተላኢኹ።',
    'auth.checkEmail': 'ሒሳብ ተፈጢሩ። ነቲ ኣድራሻ ንምርግጋጽ ኢመይልካ ተመልከት፡ ደሓር እቶ።',
    'auth.accountCreated': 'ን{phone} ሒሳብ ተፈጢሩ።',
  },

  rw: {
    'auth.orGoogle': 'cyangwa ukoreshe imwe muri izi',
    'auth.orCreate': 'cyangwa fungura konti ukoresheje imeyili cyangwa numero ya telefoni',
    'auth.phoneAs': 'Bizabikwa nka {phone}',
    'auth.international': 'Isanzwe mu buryo mpuzamahanga.',
    'auth.passwordNote': 'Ntitubika na rimwe. Supabase Auth ni yo ibika ibyangombwa.',
    'auth.codeSent': 'Niba hari konti ya {phone}, kode iri mu nzira.',
    'auth.codeResent': 'Kode nshya yoherejwe kuri {phone}.',
    'auth.checkEmail': 'Konti yafunguwe. Reba imeyili yawe wemeze aderesi, hanyuma winjire.',
    'auth.accountCreated': 'Konti yafunguriwe {phone}.',
  },

  lg: {
    'auth.orGoogle': 'oba kozesa kimu ku bino',
    'auth.orCreate': 'oba kola akawunti ne imeyilo oba ennamba y’essimu',
    'auth.phoneAs': 'Kijja kuterekebwa nga {phone}',
    'auth.international': 'Kirekeddwa mu nkola y’ensi yonna.',
    'auth.passwordNote': 'Tetukiteranga. Supabase Auth ye etereka ebikwata ku kuyingira.',
    'auth.codeSent': 'Bwe wabaawo akawunti ya {phone}, koodi ejja.',
    'auth.codeResent': 'Koodi empya esindikiddwa eri {phone}.',
    'auth.checkEmail': 'Akawunti ekoleddwa. Kebera imeyilo yo okukakasa adiresi, oluvannyuma yingira.',
    'auth.accountCreated': 'Akawunti ekoleddwa eri {phone}.',
  },

  mg: {
    'auth.orGoogle': 'na mampiasà ny iray amin’ireto',
    'auth.orCreate': 'na mamorona kaonty amin’ny imailaka na ny nomeraon-telefaona',
    'auth.phoneAs': 'Hotehirizina ho {phone}',
    'auth.international': 'Efa amin’ny endriny iraisam-pirenena izy.',
    'auth.passwordNote': 'Tsy tehirizinay mihitsy izany. Supabase Auth no mitazona ny fampahalalana.',
    'auth.codeSent': 'Raha misy kaonty ho an’i {phone}, dia efa mandeha ny kaody.',
    'auth.codeResent': 'Nisy kaody vaovao nalefa ho an’i {phone}.',
    'auth.checkEmail': 'Voaforona ny kaonty. Jereo ny imailakao hanamarinana ny adiresy, dia hiditra.',
    'auth.accountCreated': 'Voaforona ny kaonty ho an’i {phone}.',
  },

  ln: {
    'auth.orGoogle': 'to ozwa moko ya bino',
    'auth.orCreate': 'to sala konti na imeli to na nimero ya telefone',
    'auth.phoneAs': 'Ekobombama lokola {phone}',
    'auth.international': 'Esili na ndenge ya mokili mobimba.',
    'auth.passwordNote': 'Tokobombaka yango ata moke te. Supabase Auth nde ebatelaka yango.',
    'auth.codeSent': 'Soki konti ya {phone} ezali, kode ezali na nzela.',
    'auth.codeResent': 'Kode ya sika etindami epai ya {phone}.',
    'auth.checkEmail': 'Konti esalami. Tala imeli na yo mpo na kondima adrese, sima kokota.',
    'auth.accountCreated': 'Konti esalami mpo na {phone}.',
  },

  ha: {
    'auth.orGoogle': 'ko yi amfani da ɗaya daga cikin waɗannan',
    'auth.orCreate': 'ko ƙirƙiri asusu da imel ko lambar waya',
    'auth.phoneAs': 'Za a adana shi a matsayin {phone}',
    'auth.international': 'Ya riga ya kasance cikin tsarin ƙasashen duniya.',
    'auth.passwordNote': 'Ba ma adana shi. Supabase Auth ne ke riƙe da shi.',
    'auth.codeSent': 'Idan akwai asusu na {phone}, lambar tana kan hanya.',
    'auth.codeResent': 'An aika sabuwar lamba zuwa {phone}.',
    'auth.checkEmail': 'An ƙirƙiri asusu. Duba imel ɗinka don tabbatar da adireshin, sannan ka shiga.',
    'auth.accountCreated': 'An ƙirƙiri asusu na {phone}.',
  },

  yo: {
    'auth.orGoogle': 'tàbí lo ọ̀kan lára ìwọ̀nyí',
    'auth.orCreate': 'tàbí ṣí àkọsílẹ̀ pẹ̀lú ímeèlì tàbí nọ́mbà fọ́n',
    'auth.phoneAs': 'Yóò fi {phone} pamọ́',
    'auth.international': 'Ó ti wà ní ọ̀nà àgbáyé.',
    'auth.passwordNote': 'A kì í fi í pamọ́. Supabase Auth ni ó ń dáàbò bo ẹ̀rí ìwọlé.',
    'auth.codeSent': 'Bí àkọsílẹ̀ {phone} bá wà, kóòdù ń bọ̀.',
    'auth.codeResent': 'A ti fi kóòdù tuntun ránṣẹ́ sí {phone}.',
    'auth.checkEmail': 'A ti ṣí àkọsílẹ̀. Wo ímeèlì rẹ láti jẹ́rìí àdírẹ́sì, kí o tó wọlé.',
    'auth.accountCreated': 'A ti ṣí àkọsílẹ̀ fún {phone}.',
  },

  ig: {
    'auth.orGoogle': 'ma ọ bụ jiri otu n’ime ndị a',
    'auth.orCreate': 'ma ọ bụ mepee akaụntụ site na ozi ịntanetị ma ọ bụ nọmba ekwentị',
    'auth.phoneAs': 'A ga-echekwa ya dị ka {phone}',
    'auth.international': 'Ọ dịlarị n’ụdị mba ụwa.',
    'auth.passwordNote': 'Anyị anaghị echekwa ya. Supabase Auth na-ejide ya.',
    'auth.codeSent': 'Ọ bụrụ na akaụntụ {phone} dị, koodu na-abịa.',
    'auth.codeResent': 'Ezipula koodu ọhụrụ na {phone}.',
    'auth.checkEmail': 'Emepela akaụntụ. Lelee ozi ịntanetị gị iji kwado adreesị, wee banye.',
    'auth.accountCreated': 'Emepela akaụntụ maka {phone}.',
  },

  wo: {
    'auth.orGoogle': 'walla jëfandikoo benn ci yii',
    'auth.orCreate': 'walla sos kont ak imeel walla nimero telefon',
    'auth.phoneAs': 'Dinañu ko denc ni {phone}',
    'auth.international': 'Ba noppi ci suuf bu àdduna bépp.',
    'auth.passwordNote': 'Du ñu koo denc. Supabase Auth a koy saytu.',
    'auth.codeSent': 'Su kont {phone} amee, kod bi ci yoon la.',
    'auth.codeResent': 'Yónnee nañu kod bu bees ci {phone}.',
    'auth.checkEmail': 'Sos nañu kont bi. Xoolal sa imeel ngir dëggal adres bi, ginnaaw ba dugg.',
    'auth.accountCreated': 'Sos nañu kont ngir {phone}.',
  },

  ff: {
    'auth.orGoogle': 'walla huutori gootal e ɗiin',
    'auth.orCreate': 'walla sos konte e iimeel walla nokku telefona',
    'auth.phoneAs': 'Ina danndee wano {phone}',
    'auth.international': 'Ina woni kadi e mbaadi winndere.',
    'auth.passwordNote': 'Men danndataa ɗum. Supabase Auth jogii ɗum.',
    'auth.codeSent': 'So konte {phone} woodii, kood oo ina e laawol.',
    'auth.codeResent': 'Kood keso neldaama to {phone}.',
    'auth.checkEmail': 'Konte sosaa. Ƴeew iimeel maa ngam teeŋtinde adres, caggal ɗuum naatu.',
    'auth.accountCreated': 'Konte sosaa wonande {phone}.',
  },

  bm: {
    'auth.orGoogle': 'walima baara nin yɔrɔ dɔ la',
    'auth.orCreate': 'walima kontiw kɛ ni imɛli walima telefɔni nimɔrɔ ye',
    'auth.phoneAs': 'A bɛna mara {phone} ye',
    'auth.international': 'A bɛ diɲɛ kɔnɔ cogo la.',
    'auth.passwordNote': 'An t’a mara abada. Supabase Auth b’a mara.',
    'auth.codeSent': 'Ni {phone} ka konti bɛ yen, kodi be taa.',
    'auth.codeResent': 'Kodi kura ciila {phone} ma.',
    'auth.checkEmail': 'Kontiw kɛra. I ka imɛli lajɛ walisa ka adirɛsi sɛbɛn, kɔfɛ i don.',
    'auth.accountCreated': 'Kontiw kɛra {phone} ye.',
  },

  zu: {
    'auth.orGoogle': 'noma sebenzisa okunye kwalokhu',
    'auth.orCreate': 'noma vula i-akhawunti nge-imeyili noma ngenombolo yeselula',
    'auth.phoneAs': 'Kuzogcinwa njengo-{phone}',
    'auth.international': 'Sekuvele kusefomethi yamazwe omhlaba.',
    'auth.passwordNote': 'Asikugcini nakancane. I-Supabase Auth iyigcina.',
    'auth.codeSent': 'Uma i-akhawunti ka-{phone} ikhona, ikhodi iyeza.',
    'auth.codeResent': 'Ikhodi entsha ithunyelwe ku-{phone}.',
    'auth.checkEmail': 'I-akhawunti ivuliwe. Bheka i-imeyili yakho ukuqinisekisa ikheli, bese ungena.',
    'auth.accountCreated': 'I-akhawunti ivulelwe u-{phone}.',
  },

  xh: {
    'auth.orGoogle': 'okanye sebenzisa enye kwezi',
    'auth.orCreate': 'okanye vula i-akhawunti nge-imeyile okanye ngenombolo yeselula',
    'auth.phoneAs': 'Iza kugcinwa njenge-{phone}',
    'auth.international': 'Sele ikwifomathi yamazwe ngamazwe.',
    'auth.passwordNote': 'Asiyigcini kwaphela. I-Supabase Auth iyigcina.',
    'auth.codeSent': 'Ukuba i-akhawunti ka-{phone} ikhona, ikhowudi iyeza.',
    'auth.codeResent': 'Ikhowudi entsha ithunyelwe ku-{phone}.',
    'auth.checkEmail': 'I-akhawunti ivuliwe. Jonga i-imeyile yakho ukuqinisekisa idilesi, emva koko ngena.',
    'auth.accountCreated': 'I-akhawunti ivulelwe u-{phone}.',
  },

  af: {
    'auth.orGoogle': 'of gebruik een van hierdie',
    'auth.orCreate': 'of skep ’n rekening met ’n e-pos of ’n selfoonnommer',
    'auth.phoneAs': 'Sal as {phone} gestoor word',
    'auth.international': 'Is reeds in internasionale formaat.',
    'auth.passwordNote': 'Ons stoor dit nooit nie. Supabase Auth hou die geloofsbrief.',
    'auth.codeSent': 'As daar ’n rekening vir {phone} is, is ’n kode op pad.',
    'auth.codeResent': '’n Nuwe kode is na {phone} gestuur.',
    'auth.checkEmail': 'Rekening geskep. Kyk in jou e-pos om die adres te bevestig, en meld dan aan.',
    'auth.accountCreated': 'Rekening vir {phone} geskep.',
  },

  sn: {
    'auth.orGoogle': 'kana shandisa imwe yeizvi',
    'auth.orCreate': 'kana vhura akaundi ne-imeyili kana nhamba yefoni',
    'auth.phoneAs': 'Richachengetwa se{phone}',
    'auth.international': 'Yatove muchimiro chepasi rose.',
    'auth.passwordNote': 'Hatikuchengeti. Supabase Auth ndiyo inochengeta.',
    'auth.codeSent': 'Kana akaundi ya{phone} iripo, kodhi iri munzira.',
    'auth.codeResent': 'Kodhi itsva yatumirwa kuna {phone}.',
    'auth.checkEmail': 'Akaundi yavhurwa. Tarisa imeyili yako kusimbisa kero, wobva wapinda.',
    'auth.accountCreated': 'Akaundi yavhuriwa ya{phone}.',
  },

  st: {
    'auth.orGoogle': 'kapa sebelisa e ’ngoe ea tsena',
    'auth.orCreate': 'kapa bula akhaonto ka imeile kapa nomoro ea mohala',
    'auth.phoneAs': 'E tla bolokoa e le {phone}',
    'auth.international': 'E se e le ka mokhoa oa machaba.',
    'auth.passwordNote': 'Ha re e boloke. Supabase Auth e e boloka.',
    'auth.codeSent': 'Haeba akhaonto ea {phone} e teng, khoutu e tseleng.',
    'auth.codeResent': 'Khoutu e ncha e rometsoe ho {phone}.',
    'auth.checkEmail': 'Akhaonto e butsoe. Sheba imeile ea hau ho netefatsa aterese, ebe ua kena.',
    'auth.accountCreated': 'Akhaonto e buloe bakeng sa {phone}.',
  },

  ny: {
    'auth.orGoogle': 'kapena gwiritsani ntchito imodzi mwa izi',
    'auth.orCreate': 'kapena tsegulani akaunti ndi imelo kapena nambala ya foni',
    'auth.phoneAs': 'Idzasungidwa ngati {phone}',
    'auth.international': 'Ili kale m’mawonekedwe a mayiko onse.',
    'auth.passwordNote': 'Sitisunga konse. Supabase Auth imasunga.',
    'auth.codeSent': 'Ngati akaunti ya {phone} ilipo, kodi ikubwera.',
    'auth.codeResent': 'Kodi yatsopano yatumizidwa kwa {phone}.',
    'auth.checkEmail': 'Akaunti yatsegulidwa. Onani imelo yanu kutsimikizira adilesi, kenako lowani.',
    'auth.accountCreated': 'Akaunti yatsegulidwa ya {phone}.',
  },

  tr: {
    'auth.orGoogle': 'ya da bunlardan birini kullanın',
    'auth.orCreate': 'ya da e-posta veya telefon numarasıyla hesap oluşturun',
    'auth.phoneAs': '{phone} olarak saklanacak',
    'auth.international': 'Zaten uluslararası biçimde.',
    'auth.passwordNote': 'Onu asla saklamayız. Kimliği Supabase Auth tutar.',
    'auth.codeSent': '{phone} için bir hesap varsa kod yolda.',
    'auth.codeResent': '{phone} numarasına yeni bir kod gönderildi.',
    'auth.checkEmail': 'Hesap oluşturuldu. Adresi doğrulamak için e-postanızı kontrol edin, sonra giriş yapın.',
    'auth.accountCreated': '{phone} için hesap oluşturuldu.',
  },

  id: {
    'auth.orGoogle': 'atau gunakan salah satu ini',
    'auth.orCreate': 'atau buat akun dengan email atau nomor ponsel',
    'auth.phoneAs': 'Akan disimpan sebagai {phone}',
    'auth.international': 'Sudah dalam format internasional.',
    'auth.passwordNote': 'Kami tidak pernah menyimpannya. Supabase Auth yang menyimpan.',
    'auth.codeSent': 'Jika ada akun untuk {phone}, kode sedang dikirim.',
    'auth.codeResent': 'Kode baru telah dikirim ke {phone}.',
    'auth.checkEmail': 'Akun dibuat. Periksa email Anda untuk mengonfirmasi alamat, lalu masuk.',
    'auth.accountCreated': 'Akun dibuat untuk {phone}.',
  },

  ms: {
    'auth.orGoogle': 'atau gunakan salah satu daripada ini',
    'auth.orCreate': 'atau cipta akaun dengan e-mel atau nombor telefon bimbit',
    'auth.phoneAs': 'Akan disimpan sebagai {phone}',
    'auth.international': 'Sudah dalam format antarabangsa.',
    'auth.passwordNote': 'Kami tidak pernah menyimpannya. Supabase Auth yang menyimpannya.',
    'auth.codeSent': 'Jika ada akaun untuk {phone}, kod sedang dalam perjalanan.',
    'auth.codeResent': 'Kod baharu telah dihantar ke {phone}.',
    'auth.checkEmail': 'Akaun dicipta. Semak e-mel anda untuk mengesahkan alamat, kemudian log masuk.',
    'auth.accountCreated': 'Akaun dicipta untuk {phone}.',
  },

  bn: {
    'auth.orGoogle': 'অথবা এর একটি ব্যবহার করুন',
    'auth.orCreate': 'অথবা ইমেইল বা মোবাইল নম্বর দিয়ে অ্যাকাউন্ট তৈরি করুন',
    'auth.phoneAs': '{phone} হিসেবে সংরক্ষিত হবে',
    'auth.international': 'আগেই আন্তর্জাতিক রূপে আছে।',
    'auth.passwordNote': 'আমরা এটি কখনও সংরক্ষণ করি না। Supabase Auth এটি রাখে।',
    'auth.codeSent': 'যদি {phone}-এর অ্যাকাউন্ট থাকে, কোড আসছে।',
    'auth.codeResent': '{phone}-এ নতুন কোড পাঠানো হয়েছে।',
    'auth.checkEmail': 'অ্যাকাউন্ট তৈরি হয়েছে। ঠিকানা নিশ্চিত করতে আপনার ইমেইল দেখুন, তারপর সাইন ইন করুন।',
    'auth.accountCreated': '{phone}-এর জন্য অ্যাকাউন্ট তৈরি হয়েছে।',
  },

  hi: {
    'auth.orGoogle': 'या इनमें से कोई एक इस्तेमाल करें',
    'auth.orCreate': 'या ईमेल या मोबाइल नंबर से खाता बनाएँ',
    'auth.phoneAs': '{phone} के रूप में सहेजा जाएगा',
    'auth.international': 'पहले से अंतर्राष्ट्रीय प्रारूप में है।',
    'auth.passwordNote': 'हम इसे कभी नहीं रखते। Supabase Auth इसे रखता है।',
    'auth.codeSent': 'अगर {phone} का खाता है, तो कोड रास्ते में है।',
    'auth.codeResent': '{phone} पर नया कोड भेजा गया है।',
    'auth.checkEmail': 'खाता बन गया। पता पुष्ट करने के लिए अपना ईमेल देखें, फिर साइन इन करें।',
    'auth.accountCreated': '{phone} के लिए खाता बन गया।',
  },

  fr: {
    'auth.orGoogle': 'ou utilisez l’un de ces moyens',
    'auth.orCreate': 'ou créez un compte avec un e-mail ou un numéro de téléphone',
    'auth.phoneAs': 'Sera enregistré comme {phone}',
    'auth.international': 'Déjà au format international.',
    'auth.passwordNote': 'Nous ne l’enregistrons jamais. Supabase Auth conserve l’identifiant.',
    'auth.codeSent': 'Si un compte existe pour {phone}, un code arrive.',
    'auth.codeResent': 'Un nouveau code a été envoyé au {phone}.',
    'auth.checkEmail': 'Compte créé. Vérifiez votre e-mail pour confirmer l’adresse, puis connectez-vous.',
    'auth.accountCreated': 'Compte créé pour {phone}.',
  },

  es: {
    'auth.orGoogle': 'o use uno de estos',
    'auth.orCreate': 'o cree una cuenta con un correo o un número de móvil',
    'auth.phoneAs': 'Se guardará como {phone}',
    'auth.international': 'Ya está en formato internacional.',
    'auth.passwordNote': 'Nunca la guardamos. Supabase Auth custodia la credencial.',
    'auth.codeSent': 'Si existe una cuenta para {phone}, el código va en camino.',
    'auth.codeResent': 'Se ha enviado un código nuevo a {phone}.',
    'auth.checkEmail': 'Cuenta creada. Revise su correo para confirmar la dirección y luego inicie sesión.',
    'auth.accountCreated': 'Cuenta creada para {phone}.',
  },

  pt: {
    'auth.orGoogle': 'ou use um destes',
    'auth.orCreate': 'ou crie uma conta com um e-mail ou um número de telemóvel',
    'auth.phoneAs': 'Será guardado como {phone}',
    'auth.international': 'Já está em formato internacional.',
    'auth.passwordNote': 'Nunca a guardamos. O Supabase Auth detém a credencial.',
    'auth.codeSent': 'Se existir uma conta para {phone}, o código está a caminho.',
    'auth.codeResent': 'Um novo código foi enviado para {phone}.',
    'auth.checkEmail': 'Conta criada. Verifique o seu e-mail para confirmar o endereço e depois entre.',
    'auth.accountCreated': 'Conta criada para {phone}.',
  },
};
