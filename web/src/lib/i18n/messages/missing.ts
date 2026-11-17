import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The page for an address with nothing at it (`app/not-found.tsx`).
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts` and
 * `assign.ts`: written for the twenty-seven languages with nothing held in
 * `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Who reads it.** Somebody who mistyped an address, and somebody who
 * followed a link to a course that has been withdrawn. The second has made no
 * mistake, and this is the page that tells them the course they enrolled in is
 * still theirs to read. That sentence is the one to get right.
 *
 * **What is not here.** The name of the learning page inside the long
 * sentence (`{learn}`) is the navigation's own word (`nav.learn`), and the
 * first button is the front page's (`home.browse`), so the page cannot call
 * either by a second name.
 *
 * **Unreviewed.** No speaker has read any of these. "Retired" is written as
 * withdrawn or removed in each language, never as deleted: an enrolled learner
 * keeps the course.
 */
export const MISSING: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'missing.title': 'غير موجودة',
    'missing.heading': 'هذه الصفحة غير موجودة هنا',
    'missing.lede':
      'إمّا أن العنوان فيه خطأ بسيط، أو أن ما كان هنا قد سُحب. تُسحب الدورة عندما يتوقف معلّمها عن تدريسها، وتبقى الدورة المسحوبة متاحة للقراءة لمن سبق أن سجّلوا فيها عبر {learn}.',
    'missing.home': 'الرئيسية',
    'missing.help': 'اطلب المساعدة',
    'missing.fault': 'إذا وصلت إلى هنا عبر رابط من داخل AyahSpring فهذا خطأ من جانبنا، وسنصلح الرابط.',
    'missing.tell': 'أخبرنا أين كان الرابط',
  },
  ur: {
    'missing.title': 'نہیں ملا',
    'missing.heading': 'وہ صفحہ یہاں نہیں ہے',
    'missing.lede':
      'یا تو پتہ تھوڑا سا غلط ہے، یا جو چیز یہاں تھی وہ ہٹا دی گئی ہے۔ کورس اس وقت ہٹایا جاتا ہے جب استاد اسے پڑھانا چھوڑ دے، اور ہٹایا گیا کورس ان لوگوں کے لیے {learn} کے ذریعے پڑھنے کے قابل رہتا ہے جو پہلے سے اس میں داخل ہیں۔',
    'missing.home': 'سرورق',
    'missing.help': 'مدد مانگیں',
    'missing.fault':
      'اگر آپ AyahSpring کے اندر کے کسی لنک سے یہاں پہنچے ہیں تو یہ ہماری غلطی ہے، اور ہم لنک درست کر دیں گے۔',
    'missing.tell': 'ہمیں بتائیں کہ لنک کہاں تھا',
  },
  fa: {
    'missing.title': 'پیدا نشد',
    'missing.heading': 'آن صفحه اینجا نیست',
    'missing.lede':
      'یا نشانی کمی اشتباه است، یا آنچه اینجا بود کنار گذاشته شده است. دوره زمانی کنار گذاشته می‌شود که استاد دیگر آن را درس ندهد، و دورهٔ کنارگذاشته برای کسانی که پیش‌تر در آن ثبت‌نام کرده‌اند از راه {learn} خواندنی می‌ماند.',
    'missing.home': 'خانه',
    'missing.help': 'کمک بخواهید',
    'missing.fault': 'اگر از پیوندی در خودِ AyahSpring به اینجا رسیده‌اید، این خطای ماست و پیوند را درست می‌کنیم.',
    'missing.tell': 'به ما بگویید پیوند کجا بود',
  },
  'fa-af': {
    'missing.title': 'پیدا نشد',
    'missing.heading': 'آن صفحه اینجا نیست',
    'missing.lede':
      'یا آدرس کمی اشتباه است، یا آنچه اینجا بود برداشته شده است. کورس زمانی برداشته می‌شود که استاد دیگر آن را درس ندهد، و کورس برداشته‌شده برای کسانی که پیش‌تر در آن ثبت‌نام کرده‌اند از راه {learn} خواندنی می‌ماند.',
    'missing.home': 'صفحهٔ اصلی',
    'missing.help': 'کمک بخواهید',
    'missing.fault': 'اگر از لینکی در داخل AyahSpring به اینجا رسیده‌اید، این اشتباه ماست و لینک را درست می‌کنیم.',
    'missing.tell': 'به ما بگویید لینک کجا بود',
  },
  tr: {
    'missing.title': 'Bulunamadı',
    'missing.heading': 'O sayfa burada değil',
    'missing.lede':
      'Ya adres biraz yanlış ya da burada olan şey kaldırıldı. Bir kurs, öğretmeni onu vermeyi bıraktığında kaldırılır; kaldırılan kurs, ona zaten kayıtlı olanlar için {learn} üzerinden okunabilir kalır.',
    'missing.home': 'Ana sayfa',
    'missing.help': 'Yardım isteyin',
    'missing.fault':
      'AyahSpring içindeki bir bağlantıdan buraya geldiyseniz bu bizim hatamızdır ve bağlantıyı düzeltiriz.',
    'missing.tell': 'Bağlantının nerede olduğunu bize bildirin',
  },
  id: {
    'missing.title': 'Tidak ditemukan',
    'missing.heading': 'Halaman itu tidak ada di sini',
    'missing.lede':
      'Mungkin alamatnya sedikit keliru, atau yang dulu ada di sini sudah ditarik. Kursus ditarik ketika pengajarnya berhenti mengajarkannya, dan kursus yang ditarik tetap bisa dibaca oleh orang yang sudah terdaftar di dalamnya melalui {learn}.',
    'missing.home': 'Beranda',
    'missing.help': 'Minta bantuan',
    'missing.fault':
      'Jika Anda mengikuti tautan dari dalam AyahSpring dan tiba di sini, itu kesalahan di pihak kami, dan kami akan memperbaiki tautannya.',
    'missing.tell': 'Beri tahu kami di mana tautan itu berada',
  },
  ms: {
    'missing.title': 'Tidak ditemui',
    'missing.heading': 'Halaman itu tiada di sini',
    'missing.lede':
      'Sama ada alamatnya sedikit silap, atau apa yang dahulu ada di sini telah ditarik balik. Kursus ditarik balik apabila gurunya berhenti mengajarnya, dan kursus yang ditarik balik kekal boleh dibaca oleh mereka yang sudah mendaftar melalui {learn}.',
    'missing.home': 'Laman utama',
    'missing.help': 'Minta bantuan',
    'missing.fault':
      'Jika anda mengikuti pautan dari dalam AyahSpring dan sampai di sini, itu kesilapan di pihak kami, dan kami akan membetulkan pautan itu.',
    'missing.tell': 'Beritahu kami di mana pautan itu berada',
  },
  bn: {
    'missing.title': 'পাওয়া যায়নি',
    'missing.heading': 'ওই পাতাটি এখানে নেই',
    'missing.lede':
      'হয় ঠিকানায় সামান্য ভুল আছে, নয়তো এখানে যা ছিল তা সরিয়ে নেওয়া হয়েছে। শিক্ষক কোনো কোর্স পড়ানো বন্ধ করলে সেটি সরিয়ে নেওয়া হয়, আর যাঁরা আগে থেকেই তাতে ভর্তি আছেন তাঁরা {learn} থেকে সেই কোর্স পড়তে পারেন।',
    'missing.home': 'প্রথম পাতা',
    'missing.help': 'সাহায্য চান',
    'missing.fault':
      'আপনি যদি AyahSpring-এর ভেতরের কোনো লিংক ধরে এখানে এসে থাকেন, সেটি আমাদের ভুল, এবং আমরা লিংকটি ঠিক করে দেব।',
    'missing.tell': 'লিংকটি কোথায় ছিল আমাদের জানান',
  },
  hi: {
    'missing.title': 'नहीं मिला',
    'missing.heading': 'वह पेज यहाँ नहीं है',
    'missing.lede':
      'या तो पता थोड़ा गलत है, या जो यहाँ था उसे हटा दिया गया है। कोई कोर्स तब हटाया जाता है जब शिक्षक उसे पढ़ाना बंद कर देते हैं, और हटाया गया कोर्स उन लोगों के लिए {learn} के ज़रिए पढ़ने योग्य रहता है जो उसमें पहले से नामांकित हैं।',
    'missing.home': 'मुखपृष्ठ',
    'missing.help': 'मदद माँगें',
    'missing.fault':
      'अगर आप AyahSpring के अंदर के किसी लिंक से यहाँ पहुँचे हैं, तो यह हमारी गलती है, और हम लिंक ठीक कर देंगे।',
    'missing.tell': 'हमें बताएँ कि लिंक कहाँ था',
  },
  fr: {
    'missing.title': 'Introuvable',
    'missing.heading': 'Cette page n’est pas ici',
    'missing.lede':
      'Soit l’adresse est légèrement erronée, soit ce qui se trouvait ici a été retiré. Un cours est retiré lorsque son enseignant cesse de le donner, et un cours retiré reste lisible par les personnes déjà inscrites, depuis {learn}.',
    'missing.home': 'Accueil',
    'missing.help': 'Demander de l’aide',
    'missing.fault':
      'Si vous avez suivi un lien depuis AyahSpring et êtes arrivé ici, l’erreur vient de nous, et nous corrigerons le lien.',
    'missing.tell': 'Dites-nous où se trouvait le lien',
  },
  es: {
    'missing.title': 'No encontrada',
    'missing.heading': 'Esa página no está aquí',
    'missing.lede':
      'O la dirección tiene un pequeño error, o lo que había aquí se ha retirado. Un curso se retira cuando su docente deja de impartirlo, y un curso retirado puede seguir leyéndolo quien ya estaba inscrito, desde {learn}.',
    'missing.home': 'Inicio',
    'missing.help': 'Pedir ayuda',
    'missing.fault':
      'Si has seguido un enlace desde dentro de AyahSpring y has llegado aquí, es un fallo nuestro, y corregiremos el enlace.',
    'missing.tell': 'Dinos dónde estaba el enlace',
  },
  pt: {
    'missing.title': 'Não encontrada',
    'missing.heading': 'Essa página não está aqui',
    'missing.lede':
      'Ou o endereço tem um pequeno erro, ou o que estava aqui foi retirado. Um curso é retirado quando o professor deixa de o lecionar, e um curso retirado continua a poder ser lido por quem já estava inscrito, através de {learn}.',
    'missing.home': 'Início',
    'missing.help': 'Pedir ajuda',
    'missing.fault':
      'Se seguiu uma ligação dentro do AyahSpring e veio parar aqui, a falha é nossa, e vamos corrigir a ligação.',
    'missing.tell': 'Diga-nos onde estava a ligação',
  },
  sw: {
    'missing.title': 'Haikupatikana',
    'missing.heading': 'Ukurasa huo haupo hapa',
    'missing.lede':
      'Huenda anwani ina kosa dogo, au kilichokuwa hapa kimeondolewa. Kozi huondolewa mwalimu anapoacha kuifundisha, na kozi iliyoondolewa hubaki ikisomeka kwa waliokwisha kujiandikisha kupitia {learn}.',
    'missing.home': 'Mwanzo',
    'missing.help': 'Omba msaada',
    'missing.fault':
      'Ikiwa ulifuata kiungo kutoka ndani ya AyahSpring ukafika hapa, hilo ni kosa letu, na tutakirekebisha kiungo hicho.',
    'missing.tell': 'Tuambie kiungo hicho kilikuwa wapi',
  },
  af: {
    'missing.title': 'Nie gevind nie',
    'missing.heading': 'Daardie bladsy is nie hier nie',
    'missing.lede':
      'Óf die adres is effens verkeerd, óf wat hier was, is onttrek. ’n Kursus word onttrek wanneer die onderwyser ophou om dit aan te bied, en ’n onttrekte kursus bly leesbaar vir mense wat reeds daarvoor ingeskryf is, deur {learn}.',
    'missing.home': 'Tuis',
    'missing.help': 'Vra hulp',
    'missing.fault':
      'As jy ’n skakel binne AyahSpring gevolg het en hier beland het, is dit ons fout, en ons sal die skakel regmaak.',
    'missing.tell': 'Sê vir ons waar die skakel was',
  },
  'zh-hans': {
    'missing.title': '未找到',
    'missing.heading': '该页面不在这里',
    'missing.lede':
      '可能是地址有些出入，也可能是原来在这里的内容已下架。教师不再教授某门课程时，课程会下架；已报名的人仍可通过{learn}阅读已下架的课程。',
    'missing.home': '首页',
    'missing.help': '寻求帮助',
    'missing.fault': '如果您是从 AyahSpring 内部的链接来到这里的，这是我们的问题，我们会修正该链接。',
    'missing.tell': '告诉我们该链接在哪里',
  },
  'zh-hant': {
    'missing.title': '找不到',
    'missing.heading': '該頁面不在這裡',
    'missing.lede':
      '可能是網址有些出入，也可能是原本在這裡的內容已下架。教師不再教授某門課程時，課程會下架；已報名的人仍可透過{learn}閱讀已下架的課程。',
    'missing.home': '首頁',
    'missing.help': '尋求協助',
    'missing.fault': '如果您是從 AyahSpring 內部的連結來到這裡，這是我們的問題，我們會修正該連結。',
    'missing.tell': '告訴我們該連結在哪裡',
  },
  vi: {
    'missing.title': 'Không tìm thấy',
    'missing.heading': 'Trang đó không có ở đây',
    'missing.lede':
      'Hoặc địa chỉ hơi sai, hoặc nội dung từng ở đây đã được gỡ xuống. Khoá học được gỡ xuống khi giáo viên ngừng dạy, và những người đã ghi danh vẫn đọc được khoá học đã gỡ qua {learn}.',
    'missing.home': 'Trang chủ',
    'missing.help': 'Yêu cầu trợ giúp',
    'missing.fault':
      'Nếu bạn đi theo một liên kết bên trong AyahSpring và đến đây thì đó là lỗi của chúng tôi, và chúng tôi sẽ sửa liên kết.',
    'missing.tell': 'Cho chúng tôi biết liên kết đó nằm ở đâu',
  },
  th: {
    'missing.title': 'ไม่พบ',
    'missing.heading': 'หน้านั้นไม่ได้อยู่ที่นี่',
    'missing.lede':
      'ที่อยู่อาจผิดไปเล็กน้อย หรือสิ่งที่เคยอยู่ตรงนี้ถูกถอดออกแล้ว หลักสูตรจะถูกถอดออกเมื่อผู้สอนเลิกสอน และผู้ที่ลงทะเบียนไว้แล้วยังอ่านหลักสูตรที่ถูกถอดออกได้ผ่าน {learn}',
    'missing.home': 'หน้าแรก',
    'missing.help': 'ขอความช่วยเหลือ',
    'missing.fault':
      'หากคุณตามลิงก์จากภายใน AyahSpring แล้วมาถึงหน้านี้ นั่นเป็นความผิดพลาดของเรา และเราจะแก้ไขลิงก์',
    'missing.tell': 'บอกเราว่าลิงก์นั้นอยู่ที่ไหน',
  },
  fil: {
    'missing.title': 'Hindi nahanap',
    'missing.heading': 'Wala rito ang pahinang iyon',
    'missing.lede':
      'Maaaring bahagyang mali ang address, o inalis na ang dating narito. Inaalis ang kurso kapag tumigil na ang guro sa pagtuturo nito, at nababasa pa rin ang inalis na kurso ng mga dati nang naka-enrol dito sa pamamagitan ng {learn}.',
    'missing.home': 'Unang pahina',
    'missing.help': 'Humingi ng tulong',
    'missing.fault':
      'Kung sumunod ka sa isang link mula sa loob ng AyahSpring at dito ka napunta, pagkakamali namin iyon, at aayusin namin ang link.',
    'missing.tell': 'Sabihin sa amin kung nasaan ang link',
  },
  uz: {
    'missing.title': 'Topilmadi',
    'missing.heading': 'U sahifa bu yerda yo‘q',
    'missing.lede':
      'Yo manzil biroz xato, yo bu yerda bo‘lgan narsa olib tashlangan. Kurs o‘qituvchi uni o‘qitishni to‘xtatganda olib tashlanadi, olib tashlangan kursni esa unga avval yozilganlar {learn} orqali o‘qiy oladi.',
    'missing.home': 'Bosh sahifa',
    'missing.help': 'Yordam so‘rash',
    'missing.fault':
      'Agar AyahSpring ichidagi havola orqali bu yerga kelgan bo‘lsangiz, bu bizning xatomiz va havolani tuzatamiz.',
    'missing.tell': 'Havola qayerda bo‘lganini bizga ayting',
  },
  kk: {
    'missing.title': 'Табылмады',
    'missing.heading': 'Ол бет мұнда жоқ',
    'missing.lede':
      'Не мекенжай сәл қате, не мұнда болған нәрсе алынып тасталған. Курс оқытушы оны оқытуды тоқтатқанда алынып тасталады, ал алынып тасталған курсты оған бұрын жазылғандар {learn} арқылы оқи алады.',
    'missing.home': 'Басты бет',
    'missing.help': 'Көмек сұрау',
    'missing.fault': 'Егер AyahSpring ішіндегі сілтеме арқылы осында келсеңіз, бұл біздің қатеміз, сілтемені түзетеміз.',
    'missing.tell': 'Сілтеменің қай жерде болғанын бізге айтыңыз',
  },
  az: {
    'missing.title': 'Tapılmadı',
    'missing.heading': 'Həmin səhifə burada deyil',
    'missing.lede':
      'Ya ünvan bir az səhvdir, ya da burada olan şey götürülüb. Kurs müəllim onu tədris etməyi dayandırdıqda götürülür, götürülmüş kursu isə ona artıq yazılmış şəxslər {learn} vasitəsilə oxuya bilir.',
    'missing.home': 'Ana səhifə',
    'missing.help': 'Kömək istəyin',
    'missing.fault': 'AyahSpring daxilindəki keçiddən bura gəlmisinizsə, bu bizim səhvimizdir və keçidi düzəldəcəyik.',
    'missing.tell': 'Keçidin harada olduğunu bizə bildirin',
  },
  tg: {
    'missing.title': 'Ёфт нашуд',
    'missing.heading': 'Он саҳифа дар ин ҷо нест',
    'missing.lede':
      'Ё нишонӣ каме хато аст, ё он чи дар ин ҷо буд, бардошта шудааст. Курс вақте бардошта мешавад, ки омӯзгор дигар онро дарс намедиҳад, ва курси бардошташударо онҳое, ки пештар ба он номнавис шудаанд, тавассути {learn} хонда метавонанд.',
    'missing.home': 'Саҳифаи асосӣ',
    'missing.help': 'Кӯмак пурсед',
    'missing.fault':
      'Агар шумо бо пайванде аз дохили AyahSpring ба ин ҷо омада бошед, ин хатои мост ва пайвандро ислоҳ мекунем.',
    'missing.tell': 'Ба мо гӯед, ки пайванд дар куҷо буд',
  },
  ky: {
    'missing.title': 'Табылган жок',
    'missing.heading': 'Ал барак бул жерде жок',
    'missing.lede':
      'Же дарек бир аз ката, же бул жерде болгон нерсе алынып салынган. Курс мугалим аны окутууну токтотконда алынып салынат, ал эми алынып салынган курсту ага мурда жазылгандар {learn} аркылуу окуй алышат.',
    'missing.home': 'Башкы бет',
    'missing.help': 'Жардам суроо',
    'missing.fault': 'Эгер AyahSpring ичиндеги шилтеме аркылуу бул жерге келсеңиз, бул биздин катабыз, шилтемени оңдойбуз.',
    'missing.tell': 'Шилтеме кайсы жерде болгонун бизге айтыңыз',
  },
  tk: {
    'missing.title': 'Tapylmady',
    'missing.heading': 'Ol sahypa bu ýerde ýok',
    'missing.lede':
      'Ýa salgy birneme ýalňyş, ýa-da bu ýerde bolan zat aýrylypdyr. Kurs mugallym ony okatmagy bes edende aýrylýar, aýrylan kursy bolsa oňa öň ýazylanlar {learn} arkaly okap bilýärler.',
    'missing.home': 'Baş sahypa',
    'missing.help': 'Kömek soraň',
    'missing.fault':
      'AyahSpring içindäki salgylanma arkaly bu ýere gelen bolsaňyz, bu biziň ýalňyşymyz, salgylanmany düzederis.',
    'missing.tell': 'Salgylanmanyň nirededigini bize aýdyň',
  },
  ta: {
    'missing.title': 'கிடைக்கவில்லை',
    'missing.heading': 'அந்தப் பக்கம் இங்கே இல்லை',
    'missing.lede':
      'முகவரியில் சிறு பிழை இருக்கலாம், அல்லது இங்கே இருந்தது நீக்கப்பட்டிருக்கலாம். ஆசிரியர் ஒரு பாடநெறியைக் கற்பிப்பதை நிறுத்தும்போது அது நீக்கப்படுகிறது; ஏற்கெனவே அதில் சேர்ந்தவர்கள் நீக்கப்பட்ட பாடநெறியை {learn} வழியாகப் படிக்கலாம்.',
    'missing.home': 'முகப்பு',
    'missing.help': 'உதவி கேளுங்கள்',
    'missing.fault':
      'AyahSpring-இன் உள்ளே உள்ள இணைப்பைப் பின்தொடர்ந்து இங்கே வந்திருந்தால், அது எங்கள் தவறு; இணைப்பைச் சரிசெய்வோம்.',
    'missing.tell': 'இணைப்பு எங்கே இருந்தது என்று எங்களிடம் சொல்லுங்கள்',
  },
  ne: {
    'missing.title': 'भेटिएन',
    'missing.heading': 'त्यो पृष्ठ यहाँ छैन',
    'missing.lede':
      'या त ठेगाना अलिकति गलत छ, वा यहाँ भएको कुरा हटाइएको छ। शिक्षकले पढाउन छोडेपछि कोर्स हटाइन्छ, र हटाइएको कोर्स त्यसमा पहिले नै भर्ना भएकाहरूले {learn} मार्फत पढ्न सक्छन्।',
    'missing.home': 'गृहपृष्ठ',
    'missing.help': 'मद्दत माग्नुहोस्',
    'missing.fault':
      'तपाईं AyahSpring भित्रको लिङ्कबाट यहाँ आइपुग्नुभएको हो भने, त्यो हाम्रो गल्ती हो, र हामी लिङ्क सच्याउनेछौं।',
    'missing.tell': 'लिङ्क कहाँ थियो हामीलाई भन्नुहोस्',
  },
};
