import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Asking about a lesson (`/learn/ask`): what the page says before anybody
 * types, the box, and what an answer from the database means, in the
 * page's own words.
 *
 * Written on 2026-11-27, in the same twenty-seven languages as the
 * dashboard. **Written by the people who built the site and read by no
 * speaker.**
 *
 * The box runs in the browser and is handed these words by the page; none
 * is in a script. `{number}` is a request's number, as written; `{max}` is
 * a count already in the reader's digits and follows a colon. The letter
 * in the example is the Arabic letter ح, named as each language names it.
 * French puts a no-break space before `:`, `;` and `?`.
 */
export const ASK: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'ask.title': 'اسأل عن درس',
    'ask.crumbLearn': 'تعلّمي',
    'ask.crumb': 'اسأل',
    'ask.eyebrow': 'مساعدة في الدراسة',
    'ask.ruleHead': 'يدلّ ولا يُفتي.',
    'ask.rule':
      'الجواب هنا درسٌ من دوراتك: عنوانه وموضعه وسطر من نصّ تستطيع قراءته أصلًا. لا شيء في هذه الصفحة يكتب جوابًا من عنده. والسؤال الذي يطلب حكمًا شرعيًّا يُرفع إلى معلّم.',
    'ask.offHead': 'مساعد الدراسة غير مفعّل بعد.',
    'ask.off': 'اسأل معلّمك في الدرس، أو اطلب المساعدة.',
    'ask.help': 'اطلب المساعدة',
    'ask.back': 'العودة إلى تعلّمي',
    'ask.label': 'ما الذي تودّ أن تفهمه؟',
    'ask.example': 'مثلًا: كيف يُنطق حرف الحاء؟',
    'ask.look': 'ابحث عنه',
    'ask.looking': 'جارٍ البحث…',
    'ask.found': 'موجود في دوراتك',
    'ask.forTeacher': 'سؤال لمعلّم',
    'ask.nothing': 'لا شيء في دوراتك بعد',
    'ask.closed': 'غير مفعّل',
    'ask.foundSays': 'هذا ما تتناوله دوراتك في ذلك. إنه يدلّ على درس، وليس جوابًا كُتب لك.',
    'ask.teacherCase': 'هذا سؤال لمعلّم، وهذا المساعد لا يجيب عن مثله. فُتح طلب مساعدة ليجيب عنه إنسان.',
    'ask.teacherNoCase': 'هذا سؤال لمعلّم، وهذا المساعد لا يجيب عن مثله. اسأل معلّمك في الدرس.',
    'ask.nothingSays':
      'لا شيء في دوراتك يتناول هذا بعد. يستطيع معلّم أن يجيب عنه: اسأل في الدرس، أو اطلب المساعدة.',
    'ask.openCase': 'افتح الطلب {number}',
    'ask.rules': 'درس تستطيع فتحه، أو لا جواب. الأسئلة التي تطلب حكمًا تُرفع إلى معلّم.',
    'ask.tooShort': 'اكتب أكثر قليلًا ليكون للسؤال معنى.',
    'ask.tooLong': 'هذا طويل جدًّا. أقصى عدد من الأحرف يتّسع له السؤال: {max}',
    'ask.signedOut': 'سجّل الدخول لتطرح سؤالًا.',
    'ask.notSent': 'تعذّر إرسال السؤال. لم يُسجَّل شيء.',
    'ask.unsure': 'تعذّرت قراءة الجواب. ربما سُجّل سؤالك؛ انظر إلى طلبات المساعدة قبل أن تطرحه من جديد.',
  },
  ur: {
    'ask.title': 'کسی سبق کے بارے میں پوچھیں',
    'ask.crumbLearn': 'میری تعلیم',
    'ask.crumb': 'پوچھیں',
    'ask.eyebrow': 'پڑھائی میں مدد',
    'ask.ruleHead': 'یہ راستہ دکھاتا ہے، فتویٰ نہیں دیتا۔',
    'ask.rule':
      'یہاں جواب آپ کے کورسز کا کوئی سبق ہوتا ہے: اس کا عنوان، اس کی جگہ، اور متن کی ایک سطر جو آپ پہلے ہی پڑھ سکتے ہیں۔ اس صفحے پر کوئی چیز اپنی طرف سے جواب نہیں لکھتی۔ جو سوال شرعی حکم مانگے وہ استاد کے پاس جاتا ہے۔',
    'ask.offHead': 'پڑھائی کا مددگار ابھی چالو نہیں ہوا۔',
    'ask.off': 'سبق میں اپنے استاد سے پوچھیں، یا مدد مانگیں۔',
    'ask.help': 'مدد مانگیں',
    'ask.back': 'میری تعلیم پر واپس',
    'ask.label': 'آپ کیا سمجھنا چاہتے ہیں؟',
    'ask.example': 'مثلاً: حرف ح کیسے ادا کیا جاتا ہے؟',
    'ask.look': 'تلاش کریں',
    'ask.looking': 'تلاش ہو رہی ہے…',
    'ask.found': 'آپ کے کورسز میں ملا',
    'ask.forTeacher': 'استاد کے لیے سوال',
    'ask.nothing': 'آپ کے کورسز میں ابھی کچھ نہیں',
    'ask.closed': 'چالو نہیں',
    'ask.foundSays':
      'اس بارے میں آپ کے کورسز میں یہ موجود ہے۔ یہ ایک سبق کی طرف اشارہ ہے، آپ کے لیے لکھا گیا جواب نہیں۔',
    'ask.teacherCase':
      'یہ سوال استاد کے لیے ہے، اور یہ مددگار ایسے سوالوں کا جواب نہیں دیتا۔ مدد کی ایک درخواست کھول دی گئی ہے تاکہ کوئی انسان اس کا جواب دے۔',
    'ask.teacherNoCase':
      'یہ سوال استاد کے لیے ہے، اور یہ مددگار ایسے سوالوں کا جواب نہیں دیتا۔ سبق میں اپنے استاد سے پوچھیں۔',
    'ask.nothingSays':
      'آپ کے کورسز میں ابھی اس بارے میں کچھ نہیں۔ کوئی استاد اس کا جواب دے سکتا ہے: سبق میں پوچھیں، یا مدد مانگیں۔',
    'ask.openCase': 'درخواست {number} کھولیں',
    'ask.rules':
      'ایک سبق جسے آپ کھول سکتے ہیں، یا کوئی جواب نہیں۔ حکم مانگنے والے سوال استاد کے پاس جاتے ہیں۔',
    'ask.tooShort': 'تھوڑا اور لکھیں تاکہ سوال کا مطلب بنے۔',
    'ask.tooLong': 'یہ بہت لمبا ہے۔ سوال میں زیادہ سے زیادہ حروف: {max}',
    'ask.signedOut': 'سوال پوچھنے کے لیے سائن اِن کریں۔',
    'ask.notSent': 'سوال بھیجا نہیں جا سکا۔ کچھ درج نہیں ہوا۔',
    'ask.unsure':
      'جواب پڑھا نہیں جا سکا۔ ممکن ہے آپ کا سوال درج ہو گیا ہو؛ دوبارہ پوچھنے سے پہلے اپنی مدد کی درخواستیں دیکھ لیں۔',
  },
  fa: {
    'ask.title': 'درباره یک درس بپرسید',
    'ask.crumbLearn': 'یادگیری من',
    'ask.crumb': 'پرسش',
    'ask.eyebrow': 'کمک در مطالعه',
    'ask.ruleHead': 'راه را نشان می‌دهد، فتوا نمی‌دهد.',
    'ask.rule':
      'پاسخ در اینجا درسی از دوره‌های شماست: عنوان آن، جای آن، و یک سطر از متنی که خودتان می‌توانید بخوانید. هیچ چیز در این صفحه از خودش پاسخی نمی‌نویسد. پرسشی که حکم شرعی بخواهد نزد معلم می‌رود.',
    'ask.offHead': 'دستیار مطالعه هنوز روشن نشده است.',
    'ask.off': 'در درس از معلم خود بپرسید، یا درخواست کمک کنید.',
    'ask.help': 'درخواست کمک',
    'ask.back': 'بازگشت به یادگیری من',
    'ask.label': 'چه چیزی را می‌خواهید بفهمید؟',
    'ask.example': 'برای نمونه: حرف «ح» چگونه تلفظ می‌شود؟',
    'ask.look': 'جست‌وجو کن',
    'ask.looking': 'در حال جست‌وجو…',
    'ask.found': 'در دوره‌های شما پیدا شد',
    'ask.forTeacher': 'پرسشی برای معلم',
    'ask.nothing': 'هنوز چیزی در دوره‌های شما نیست',
    'ask.closed': 'روشن نیست',
    'ask.foundSays':
      'این چیزی است که دوره‌های شما در این باره دارند. به یک درس اشاره می‌کند؛ پاسخی نیست که برای شما نوشته شده باشد.',
    'ask.teacherCase':
      'این پرسشی برای معلم است و این دستیار به چنین پرسش‌هایی پاسخ نمی‌دهد. یک درخواست کمک باز شد تا انسانی به آن پاسخ دهد.',
    'ask.teacherNoCase':
      'این پرسشی برای معلم است و این دستیار به چنین پرسش‌هایی پاسخ نمی‌دهد. در درس از معلم خود بپرسید.',
    'ask.nothingSays':
      'هنوز چیزی در دوره‌های شما به این نمی‌پردازد. معلم می‌تواند پاسخ دهد: در درس بپرسید، یا درخواست کمک کنید.',
    'ask.openCase': 'باز کردن درخواست {number}',
    'ask.rules': 'درسی که می‌توانید باز کنید، یا هیچ پاسخی. پرسش‌هایی که حکم می‌خواهند نزد معلم می‌روند.',
    'ask.tooShort': 'کمی بیشتر بنویسید تا پرسش معنا پیدا کند.',
    'ask.tooLong': 'این خیلی طولانی است. بیشترین شمار نویسه‌هایی که یک پرسش جا دارد: {max}',
    'ask.signedOut': 'برای پرسیدن وارد شوید.',
    'ask.notSent': 'پرسش فرستاده نشد. چیزی ثبت نشد.',
    'ask.unsure':
      'پاسخ خوانده نشد. شاید پرسش شما ثبت شده باشد؛ پیش از دوباره پرسیدن، درخواست‌های کمک خود را ببینید.',
  },
  'fa-af': {
    'ask.title': 'درباره یک درس سوال کنید',
    'ask.crumbLearn': 'آموزش من',
    'ask.crumb': 'سوال',
    'ask.eyebrow': 'کمک در درس خواندن',
    'ask.ruleHead': 'راه را نشان می‌دهد، فتوا نمی‌دهد.',
    'ask.rule':
      'جواب در اینجا درسی از کورس‌های شماست: عنوان آن، جای آن، و یک سطر از متنی که خودتان خوانده می‌توانید. هیچ چیز در این صفحه از خود جوابی نمی‌نویسد. سوالی که حکم شرعی بخواهد نزد استاد می‌رود.',
    'ask.offHead': 'دستیار درس هنوز فعال نشده است.',
    'ask.off': 'در درس از استاد خود بپرسید، یا درخواست کمک کنید.',
    'ask.help': 'درخواست کمک',
    'ask.back': 'برگشت به آموزش من',
    'ask.label': 'چه چیز را می‌خواهید بفهمید؟',
    'ask.example': 'به طور مثال: حرف «ح» چگونه تلفظ می‌شود؟',
    'ask.look': 'جستجو کن',
    'ask.looking': 'در حال جستجو…',
    'ask.found': 'در کورس‌های شما پیدا شد',
    'ask.forTeacher': 'سوالی برای استاد',
    'ask.nothing': 'هنوز چیزی در کورس‌های شما نیست',
    'ask.closed': 'فعال نیست',
    'ask.foundSays':
      'این چیزی است که کورس‌های شما در این باره دارند. به یک درس اشاره می‌کند؛ جوابی نیست که برای شما نوشته شده باشد.',
    'ask.teacherCase':
      'این سوالی برای استاد است و این دستیار به چنین سوال‌ها جواب نمی‌دهد. یک درخواست کمک باز شد تا یک انسان به آن جواب بدهد.',
    'ask.teacherNoCase':
      'این سوالی برای استاد است و این دستیار به چنین سوال‌ها جواب نمی‌دهد. در درس از استاد خود بپرسید.',
    'ask.nothingSays':
      'هنوز چیزی در کورس‌های شما به این نمی‌پردازد. استاد جواب داده می‌تواند: در درس بپرسید، یا درخواست کمک کنید.',
    'ask.openCase': 'باز کردن درخواست {number}',
    'ask.rules': 'درسی که باز کرده می‌توانید، یا هیچ جوابی. سوال‌هایی که حکم می‌خواهند نزد استاد می‌روند.',
    'ask.tooShort': 'کمی بیشتر بنویسید تا سوال معنا پیدا کند.',
    'ask.tooLong': 'این بسیار طولانی است. بیشترین شمار حروفی که یک سوال جا دارد: {max}',
    'ask.signedOut': 'برای سوال کردن داخل شوید.',
    'ask.notSent': 'سوال فرستاده نشد. چیزی ثبت نشد.',
    'ask.unsure':
      'جواب خوانده نشد. شاید سوال شما ثبت شده باشد؛ پیش از دوباره پرسیدن، درخواست‌های کمک خود را ببینید.',
  },
  tr: {
    'ask.title': 'Bir ders hakkında sorun',
    'ask.crumbLearn': 'Öğrenimim',
    'ask.crumb': 'Sor',
    'ask.eyebrow': 'Çalışma yardımı',
    'ask.ruleHead': 'Yol gösterir, hüküm vermez.',
    'ask.rule':
      'Buradaki cevap, kurslarınızdan bir derstir: başlığı, nerede durduğu ve zaten okuyabildiğiniz metinden bir satır. Bu sayfada hiçbir şey kendi cevabını yazmaz. Dinî hüküm isteyen bir soru bir öğretmene gider.',
    'ask.offHead': 'Çalışma yardımcısı henüz açılmadı.',
    'ask.off': 'Derste öğretmeninize sorun ya da yardım isteyin.',
    'ask.help': 'Yardım isteyin',
    'ask.back': 'Öğrenimime dön',
    'ask.label': 'Neyi anlamak istiyorsunuz?',
    'ask.example': 'Örneğin: ha harfi nasıl okunur?',
    'ask.look': 'Ara',
    'ask.looking': 'Aranıyor…',
    'ask.found': 'Kurslarınızda bulundu',
    'ask.forTeacher': 'Öğretmene sorulacak bir soru',
    'ask.nothing': 'Kurslarınızda henüz bir şey yok',
    'ask.closed': 'Açık değil',
    'ask.foundSays':
      'Kurslarınızda bu konuda olan budur. Bir derse işaret eder; sizin için yazılmış bir cevap değildir.',
    'ask.teacherCase':
      'Bu, bir öğretmene sorulacak bir sorudur ve bu yardımcı böyle soruları cevaplamaz. Bir kişinin cevaplaması için bir yardım isteği açıldı.',
    'ask.teacherNoCase':
      'Bu, bir öğretmene sorulacak bir sorudur ve bu yardımcı böyle soruları cevaplamaz. Derste öğretmeninize sorun.',
    'ask.nothingSays':
      'Kurslarınızda henüz bunu ele alan bir şey yok. Bir öğretmen cevaplayabilir: derste sorun ya da yardım isteyin.',
    'ask.openCase': '{number} numaralı isteği aç',
    'ask.rules': 'Açabileceğiniz bir ders ya da hiç cevap. Hüküm isteyen sorular bir öğretmene gider.',
    'ask.tooShort': 'Sorunun bir anlamı olması için biraz daha yazın.',
    'ask.tooLong': 'Bu çok uzun. Bir sorunun alabileceği en fazla karakter: {max}',
    'ask.signedOut': 'Soru sormak için giriş yapın.',
    'ask.notSent': 'Soru gönderilemedi. Hiçbir şey kaydedilmedi.',
    'ask.unsure':
      'Cevap okunamadı. Sorunuz kaydedilmiş olabilir; yeniden sormadan önce yardım isteklerinize bakın.',
  },
  id: {
    'ask.title': 'Tanyakan tentang pelajaran',
    'ask.crumbLearn': 'Pembelajaran saya',
    'ask.crumb': 'Tanya',
    'ask.eyebrow': 'Bantuan belajar',
    'ask.ruleHead': 'Ia menunjukkan, bukan memberi fatwa.',
    'ask.rule':
      'Jawaban di sini adalah sebuah pelajaran dari kursus Anda: judulnya, letaknya, dan sebaris teks yang memang sudah bisa Anda baca. Tidak ada apa pun di halaman ini yang menulis jawabannya sendiri. Pertanyaan yang meminta hukum agama diteruskan kepada seorang guru.',
    'ask.offHead': 'Asisten belajar belum dinyalakan.',
    'ask.off': 'Tanyakan kepada guru Anda di pelajaran, atau minta bantuan.',
    'ask.help': 'Minta bantuan',
    'ask.back': 'Kembali ke pembelajaran saya',
    'ask.label': 'Apa yang ingin Anda pahami?',
    'ask.example': 'Misalnya: bagaimana huruf ha diucapkan?',
    'ask.look': 'Cari',
    'ask.looking': 'Mencari…',
    'ask.found': 'Ditemukan di kursus Anda',
    'ask.forTeacher': 'Pertanyaan untuk guru',
    'ask.nothing': 'Belum ada di kursus Anda',
    'ask.closed': 'Belum dinyalakan',
    'ask.foundSays':
      'Inilah yang dibahas kursus Anda tentang hal itu. Ini menunjuk ke sebuah pelajaran; bukan jawaban yang ditulis untuk Anda.',
    'ask.teacherCase':
      'Itu pertanyaan untuk seorang guru, dan asisten ini tidak menjawab pertanyaan seperti itu. Sebuah permintaan bantuan telah dibuka agar seseorang dapat menjawabnya.',
    'ask.teacherNoCase':
      'Itu pertanyaan untuk seorang guru, dan asisten ini tidak menjawab pertanyaan seperti itu. Tanyakan kepada guru Anda di pelajaran.',
    'ask.nothingSays':
      'Belum ada di kursus Anda yang membahas hal ini. Seorang guru dapat menjawabnya: tanyakan di pelajaran, atau minta bantuan.',
    'ask.openCase': 'Buka permintaan {number}',
    'ask.rules':
      'Pelajaran yang bisa Anda buka, atau tanpa jawaban. Pertanyaan yang meminta hukum diteruskan kepada guru.',
    'ask.tooShort': 'Tulis sedikit lagi agar pertanyaannya bermakna.',
    'ask.tooLong': 'Itu terlalu panjang. Jumlah karakter terbanyak untuk satu pertanyaan: {max}',
    'ask.signedOut': 'Masuk untuk mengajukan pertanyaan.',
    'ask.notSent': 'Pertanyaan tidak dapat dikirim. Tidak ada yang dicatat.',
    'ask.unsure':
      'Jawaban tidak dapat dibaca. Pertanyaan Anda mungkin sudah dicatat; lihat permintaan bantuan Anda sebelum menanyakannya lagi.',
  },
  ms: {
    'ask.title': 'Tanya tentang sesuatu pelajaran',
    'ask.crumbLearn': 'Pembelajaran saya',
    'ask.crumb': 'Tanya soalan',
    'ask.eyebrow': 'Bantuan pembelajaran',
    'ask.ruleHead': 'Ia menunjukkan, bukan mengeluarkan fatwa.',
    'ask.rule':
      'Jawapan di sini ialah satu pelajaran daripada kursus anda: tajuknya, kedudukannya, dan sebaris teks yang memang boleh anda baca. Tiada apa-apa di halaman ini yang menulis jawapannya sendiri. Soalan yang meminta hukum agama dirujuk kepada seorang guru.',
    'ask.offHead': 'Pembantu pembelajaran belum dihidupkan.',
    'ask.off': 'Tanya guru anda dalam pelajaran, atau minta bantuan.',
    'ask.help': 'Minta bantuan',
    'ask.back': 'Kembali ke pembelajaran saya',
    'ask.label': 'Apakah yang ingin anda fahami?',
    'ask.example': 'Contohnya: bagaimanakah huruf ha disebut?',
    'ask.look': 'Cari jawapan',
    'ask.looking': 'Sedang mencari…',
    'ask.found': 'Ditemui dalam kursus anda',
    'ask.forTeacher': 'Soalan untuk guru',
    'ask.nothing': 'Belum ada dalam kursus anda',
    'ask.closed': 'Belum dihidupkan',
    'ask.foundSays':
      'Inilah yang dibincangkan oleh kursus anda tentang perkara itu. Ia menunjuk kepada satu pelajaran; bukan jawapan yang ditulis untuk anda.',
    'ask.teacherCase':
      'Itu soalan untuk seorang guru, dan pembantu ini tidak menjawab soalan sebegitu. Satu permintaan bantuan telah dibuka supaya seseorang dapat menjawabnya.',
    'ask.teacherNoCase':
      'Itu soalan untuk seorang guru, dan pembantu ini tidak menjawab soalan sebegitu. Tanya guru anda dalam pelajaran.',
    'ask.nothingSays':
      'Belum ada apa-apa dalam kursus anda yang membincangkan perkara ini. Seorang guru boleh menjawabnya: tanya dalam pelajaran, atau minta bantuan.',
    'ask.openCase': 'Buka permintaan {number}',
    'ask.rules':
      'Pelajaran yang boleh anda buka, atau tiada jawapan. Soalan yang meminta hukum dirujuk kepada guru.',
    'ask.tooShort': 'Tulis sedikit lagi supaya soalan itu bermakna.',
    'ask.tooLong': 'Itu terlalu panjang. Bilangan aksara terbanyak bagi satu soalan: {max}',
    'ask.signedOut': 'Log masuk untuk bertanya soalan.',
    'ask.notSent': 'Soalan tidak dapat dihantar. Tiada apa-apa yang direkodkan.',
    'ask.unsure':
      'Jawapan tidak dapat dibaca. Soalan anda mungkin telah direkodkan; lihat permintaan bantuan anda sebelum bertanya semula.',
  },
  bn: {
    'ask.title': 'কোনো পাঠ সম্পর্কে জিজ্ঞাসা করুন',
    'ask.crumbLearn': 'আমার শেখা',
    'ask.crumb': 'জিজ্ঞাসা',
    'ask.eyebrow': 'পড়াশোনায় সাহায্য',
    'ask.ruleHead': 'এটি পথ দেখায়, ফতোয়া দেয় না।',
    'ask.rule':
      'এখানে উত্তর হলো আপনার কোর্সের একটি পাঠ: তার শিরোনাম, তার অবস্থান, এবং লেখার একটি লাইন যা আপনি আগে থেকেই পড়তে পারেন। এই পাতার কিছুই নিজে থেকে উত্তর লেখে না। যে প্রশ্ন শরিয়তের বিধান চায় তা একজন শিক্ষকের কাছে যায়।',
    'ask.offHead': 'পড়াশোনার সহায়ক এখনো চালু হয়নি।',
    'ask.off': 'পাঠে আপনার শিক্ষককে জিজ্ঞাসা করুন, অথবা সাহায্য চান।',
    'ask.help': 'সাহায্য চান',
    'ask.back': 'আমার শেখায় ফিরে যান',
    'ask.label': 'আপনি কী বুঝতে চান?',
    'ask.example': 'যেমন: হা হরফটি কীভাবে উচ্চারণ করা হয়?',
    'ask.look': 'খুঁজে দেখুন',
    'ask.looking': 'খোঁজা হচ্ছে…',
    'ask.found': 'আপনার কোর্সে পাওয়া গেছে',
    'ask.forTeacher': 'শিক্ষকের জন্য প্রশ্ন',
    'ask.nothing': 'আপনার কোর্সে এখনো কিছু নেই',
    'ask.closed': 'চালু নেই',
    'ask.foundSays':
      'এ বিষয়ে আপনার কোর্সে এটুকুই আছে। এটি একটি পাঠের দিকে নির্দেশ করে; আপনার জন্য লেখা কোনো উত্তর নয়।',
    'ask.teacherCase':
      'এটি একজন শিক্ষকের জন্য প্রশ্ন, আর এই সহায়ক এমন প্রশ্নের উত্তর দেয় না। সাহায্যের একটি অনুরোধ খোলা হয়েছে যাতে একজন মানুষ এর উত্তর দিতে পারেন।',
    'ask.teacherNoCase':
      'এটি একজন শিক্ষকের জন্য প্রশ্ন, আর এই সহায়ক এমন প্রশ্নের উত্তর দেয় না। পাঠে আপনার শিক্ষককে জিজ্ঞাসা করুন।',
    'ask.nothingSays':
      'আপনার কোর্সে এখনো এ বিষয়ে কিছু নেই। একজন শিক্ষক এর উত্তর দিতে পারেন: পাঠে জিজ্ঞাসা করুন, অথবা সাহায্য চান।',
    'ask.openCase': 'অনুরোধ {number} খুলুন',
    'ask.rules':
      'এমন একটি পাঠ যা আপনি খুলতে পারেন, নয়তো কোনো উত্তর নয়। বিধান চাওয়া প্রশ্ন শিক্ষকের কাছে যায়।',
    'ask.tooShort': 'আরেকটু লিখুন যাতে প্রশ্নটির অর্থ হয়।',
    'ask.tooLong': 'এটি খুব দীর্ঘ। একটি প্রশ্নে সর্বোচ্চ যত অক্ষর ধরে: {max}',
    'ask.signedOut': 'প্রশ্ন করতে সাইন ইন করুন।',
    'ask.notSent': 'প্রশ্নটি পাঠানো যায়নি। কিছুই রেকর্ড হয়নি।',
    'ask.unsure':
      'উত্তরটি পড়া যায়নি। আপনার প্রশ্ন হয়তো রেকর্ড হয়েছে; আবার জিজ্ঞাসা করার আগে আপনার সাহায্যের অনুরোধগুলো দেখুন।',
  },
  hi: {
    'ask.title': 'किसी पाठ के बारे में पूछें',
    'ask.crumbLearn': 'मेरी पढ़ाई',
    'ask.crumb': 'पूछें',
    'ask.eyebrow': 'पढ़ाई में मदद',
    'ask.ruleHead': 'यह रास्ता दिखाता है, फ़तवा नहीं देता।',
    'ask.rule':
      'यहाँ जवाब आपके कोर्स का कोई पाठ होता है: उसका शीर्षक, उसकी जगह, और पाठ की एक पंक्ति जो आप पहले से पढ़ सकते हैं। इस पन्ने पर कुछ भी अपनी ओर से जवाब नहीं लिखता। जो सवाल शरई हुक्म माँगता है वह शिक्षक के पास जाता है।',
    'ask.offHead': 'पढ़ाई का सहायक अभी चालू नहीं हुआ है।',
    'ask.off': 'पाठ में अपने शिक्षक से पूछें, या मदद माँगें।',
    'ask.help': 'मदद माँगें',
    'ask.back': 'मेरी पढ़ाई पर वापस',
    'ask.label': 'आप क्या समझना चाहते हैं?',
    'ask.example': 'उदाहरण के लिए: हा अक्षर का उच्चारण कैसे होता है?',
    'ask.look': 'खोजें',
    'ask.looking': 'खोजा जा रहा है…',
    'ask.found': 'आपके कोर्स में मिला',
    'ask.forTeacher': 'शिक्षक के लिए सवाल',
    'ask.nothing': 'आपके कोर्स में अभी कुछ नहीं',
    'ask.closed': 'चालू नहीं',
    'ask.foundSays':
      'इस बारे में आपके कोर्स में यही है। यह एक पाठ की ओर इशारा करता है; आपके लिए लिखा गया जवाब नहीं है।',
    'ask.teacherCase':
      'यह शिक्षक के लिए सवाल है, और यह सहायक ऐसे सवालों का जवाब नहीं देता। मदद का एक अनुरोध खोल दिया गया है ताकि कोई इंसान इसका जवाब दे सके।',
    'ask.teacherNoCase':
      'यह शिक्षक के लिए सवाल है, और यह सहायक ऐसे सवालों का जवाब नहीं देता। पाठ में अपने शिक्षक से पूछें।',
    'ask.nothingSays':
      'आपके कोर्स में अभी इस बारे में कुछ नहीं है। कोई शिक्षक इसका जवाब दे सकता है: पाठ में पूछें, या मदद माँगें।',
    'ask.openCase': 'अनुरोध {number} खोलें',
    'ask.rules':
      'ऐसा पाठ जिसे आप खोल सकते हैं, या कोई जवाब नहीं। हुक्म माँगने वाले सवाल शिक्षक के पास जाते हैं।',
    'ask.tooShort': 'थोड़ा और लिखें ताकि सवाल का कोई मतलब बने।',
    'ask.tooLong': 'यह बहुत लंबा है। एक सवाल में ज़्यादा से ज़्यादा अक्षर: {max}',
    'ask.signedOut': 'सवाल पूछने के लिए साइन इन करें।',
    'ask.notSent': 'सवाल भेजा नहीं जा सका। कुछ भी दर्ज नहीं हुआ।',
    'ask.unsure':
      'जवाब पढ़ा नहीं जा सका। हो सकता है आपका सवाल दर्ज हो गया हो; दोबारा पूछने से पहले अपने मदद के अनुरोध देखें।',
  },
  fr: {
    'ask.title': 'Poser une question sur une leçon',
    'ask.crumbLearn': 'Mon apprentissage',
    'ask.crumb': 'Question',
    'ask.eyebrow': 'Aide à l’étude',
    'ask.ruleHead': 'Elle indique, elle ne tranche pas.',
    'ask.rule':
      'Ici, une réponse est une leçon de vos cours : son titre, sa place et une ligne du texte que vous pouvez déjà lire. Rien sur cette page n’écrit de réponse de son propre chef. Une question qui demande un avis religieux est transmise à un enseignant.',
    'ask.offHead': 'L’assistant d’étude n’est pas encore activé.',
    'ask.off': 'Demandez à votre enseignant dans la leçon, ou demandez de l’aide.',
    'ask.help': 'Demander de l’aide',
    'ask.back': 'Retour à mon apprentissage',
    'ask.label': 'Que souhaitez-vous comprendre ?',
    'ask.example': 'Par exemple : comment se prononce la lettre ha ?',
    'ask.look': 'Chercher',
    'ask.looking': 'Recherche…',
    'ask.found': 'Trouvé dans vos cours',
    'ask.forTeacher': 'Une question pour un enseignant',
    'ask.nothing': 'Rien dans vos cours pour l’instant',
    'ask.closed': 'Pas activé',
    'ask.foundSays':
      'Voici ce que vos cours contiennent à ce sujet. Cela renvoie à une leçon ; ce n’est pas une réponse écrite pour vous.',
    'ask.teacherCase':
      'C’est une question pour un enseignant, et cet assistant n’y répond pas. Une demande d’aide a été ouverte pour qu’une personne y réponde.',
    'ask.teacherNoCase':
      'C’est une question pour un enseignant, et cet assistant n’y répond pas. Demandez à votre enseignant dans la leçon.',
    'ask.nothingSays':
      'Rien dans vos cours ne traite encore de cela. Un enseignant peut y répondre : demandez dans la leçon, ou demandez de l’aide.',
    'ask.openCase': 'Ouvrir la demande {number}',
    'ask.rules':
      'Une leçon que vous pouvez ouvrir, ou pas de réponse. Les questions qui demandent un avis religieux vont à un enseignant.',
    'ask.tooShort': 'Écrivez un peu plus pour que la question ait un sens.',
    'ask.tooLong': 'C’est trop long. Nombre maximal de caractères pour une question : {max}',
    'ask.signedOut': 'Connectez-vous pour poser une question.',
    'ask.notSent': 'La question n’a pas pu être envoyée. Rien n’a été enregistré.',
    'ask.unsure':
      'La réponse n’a pas pu être lue. Votre question a peut-être été enregistrée ; regardez vos demandes d’aide avant de la poser de nouveau.',
  },
  es: {
    'ask.title': 'Preguntar sobre una lección',
    'ask.crumbLearn': 'Mi aprendizaje',
    'ask.crumb': 'Preguntar',
    'ask.eyebrow': 'Ayuda para el estudio',
    'ask.ruleHead': 'Señala, no dictamina.',
    'ask.rule':
      'Aquí una respuesta es una lección de sus cursos: su título, dónde está y una línea del texto que ya puede leer. Nada en esta página escribe una respuesta propia. Una pregunta que pide un dictamen religioso pasa a un profesor.',
    'ask.offHead': 'El asistente de estudio todavía no está activado.',
    'ask.off': 'Pregunte a su profesor en la lección, o pida ayuda.',
    'ask.help': 'Pedir ayuda',
    'ask.back': 'Volver a mi aprendizaje',
    'ask.label': '¿Qué le gustaría entender?',
    'ask.example': 'Por ejemplo: ¿cómo se pronuncia la letra ha?',
    'ask.look': 'Buscar',
    'ask.looking': 'Buscando…',
    'ask.found': 'Encontrado en sus cursos',
    'ask.forTeacher': 'Una pregunta para un profesor',
    'ask.nothing': 'Nada en sus cursos todavía',
    'ask.closed': 'No activado',
    'ask.foundSays':
      'Esto es lo que sus cursos tratan sobre eso. Señala una lección; no es una respuesta escrita para usted.',
    'ask.teacherCase':
      'Esa es una pregunta para un profesor, y este asistente no las responde. Se ha abierto una solicitud de ayuda para que la responda una persona.',
    'ask.teacherNoCase':
      'Esa es una pregunta para un profesor, y este asistente no las responde. Pregunte a su profesor en la lección.',
    'ask.nothingSays':
      'Nada en sus cursos trata esto todavía. Un profesor puede responderla: pregunte en la lección, o pida ayuda.',
    'ask.openCase': 'Abrir la solicitud {number}',
    'ask.rules':
      'Una lección que puede abrir, o ninguna respuesta. Las preguntas que piden un dictamen pasan a un profesor.',
    'ask.tooShort': 'Escriba un poco más para que la pregunta tenga sentido.',
    'ask.tooLong': 'Es demasiado larga. Máximo de caracteres que admite una pregunta: {max}',
    'ask.signedOut': 'Inicie sesión para hacer una pregunta.',
    'ask.notSent': 'No se pudo enviar la pregunta. No se registró nada.',
    'ask.unsure':
      'No se pudo leer la respuesta. Puede que su pregunta se haya registrado; mire sus solicitudes de ayuda antes de volver a hacerla.',
  },
  pt: {
    'ask.title': 'Perguntar sobre uma lição',
    'ask.crumbLearn': 'A minha aprendizagem',
    'ask.crumb': 'Perguntar',
    'ask.eyebrow': 'Ajuda ao estudo',
    'ask.ruleHead': 'Aponta, não emite pareceres.',
    'ask.rule':
      'Aqui, uma resposta é uma lição dos seus cursos: o título, onde fica e uma linha do texto que já pode ler. Nada nesta página escreve uma resposta por conta própria. Uma pergunta que pede um parecer religioso segue para um professor.',
    'ask.offHead': 'O assistente de estudo ainda não está ligado.',
    'ask.off': 'Pergunte ao seu professor na lição, ou peça ajuda.',
    'ask.help': 'Pedir ajuda',
    'ask.back': 'Voltar ao meu aprendizado',
    'ask.label': 'O que gostaria de compreender?',
    'ask.example': 'Por exemplo: como se pronuncia a letra ha?',
    'ask.look': 'Procurar',
    'ask.looking': 'A procurar…',
    'ask.found': 'Encontrado nos seus cursos',
    'ask.forTeacher': 'Uma pergunta para um professor',
    'ask.nothing': 'Ainda nada nos seus cursos',
    'ask.closed': 'Não está ligado',
    'ask.foundSays':
      'Isto é o que os seus cursos tratam sobre o assunto. Aponta para uma lição; não é uma resposta escrita para si.',
    'ask.teacherCase':
      'Essa é uma pergunta para um professor, e este assistente não responde a essas. Foi aberto um pedido de ajuda para que uma pessoa lhe responda.',
    'ask.teacherNoCase':
      'Essa é uma pergunta para um professor, e este assistente não responde a essas. Pergunte ao seu professor na lição.',
    'ask.nothingSays':
      'Ainda nada nos seus cursos trata disto. Um professor pode responder: pergunte na lição, ou peça ajuda.',
    'ask.openCase': 'Abrir o pedido {number}',
    'ask.rules':
      'Uma lição que pode abrir, ou nenhuma resposta. As perguntas que pedem um parecer seguem para um professor.',
    'ask.tooShort': 'Escreva um pouco mais para que a pergunta faça sentido.',
    'ask.tooLong': 'É demasiado longa. Máximo de caracteres que uma pergunta comporta: {max}',
    'ask.signedOut': 'Entre para fazer uma pergunta.',
    'ask.notSent': 'Não foi possível enviar a pergunta. Nada foi registado.',
    'ask.unsure':
      'Não foi possível ler a resposta. A sua pergunta pode ter sido registada; veja os seus pedidos de ajuda antes de a fazer de novo.',
  },
  sw: {
    'ask.title': 'Uliza kuhusu somo',
    'ask.crumbLearn': 'Masomo yangu',
    'ask.crumb': 'Uliza',
    'ask.eyebrow': 'Msaada wa masomo',
    'ask.ruleHead': 'Huonyesha, haitoi fatwa.',
    'ask.rule':
      'Jibu hapa ni somo kutoka kwenye kozi zako: kichwa chake, mahali lilipo, na mstari wa maandishi ambao tayari unaweza kuusoma. Hakuna kitu kwenye ukurasa huu kinachoandika jibu lake lenyewe. Swali linaloomba hukumu ya kidini hupelekwa kwa mwalimu.',
    'ask.offHead': 'Msaidizi wa masomo bado hajawashwa.',
    'ask.off': 'Muulize mwalimu wako ndani ya somo, au omba msaada.',
    'ask.help': 'Omba msaada',
    'ask.back': 'Rudi kwenye masomo yangu',
    'ask.label': 'Ungependa kuelewa nini?',
    'ask.example': 'Kwa mfano: herufi ha hutamkwaje?',
    'ask.look': 'Tafuta',
    'ask.looking': 'Inatafuta…',
    'ask.found': 'Imepatikana kwenye kozi zako',
    'ask.forTeacher': 'Swali la mwalimu',
    'ask.nothing': 'Bado hakuna kitu kwenye kozi zako',
    'ask.closed': 'Hajawashwa',
    'ask.foundSays':
      'Hiki ndicho kozi zako zinachoeleza kuhusu hilo. Kinaelekeza kwenye somo; si jibu lililoandikwa kwa ajili yako.',
    'ask.teacherCase':
      'Hilo ni swali la mwalimu, na msaidizi huyu hajibu maswali kama hayo. Ombi la msaada limefunguliwa ili mtu alijibu.',
    'ask.teacherNoCase':
      'Hilo ni swali la mwalimu, na msaidizi huyu hajibu maswali kama hayo. Muulize mwalimu wako ndani ya somo.',
    'ask.nothingSays':
      'Bado hakuna kitu kwenye kozi zako kinachoeleza hili. Mwalimu anaweza kulijibu: uliza ndani ya somo, au omba msaada.',
    'ask.openCase': 'Fungua ombi {number}',
    'ask.rules':
      'Somo unaloweza kulifungua, au hakuna jibu. Maswali yanayoomba hukumu hupelekwa kwa mwalimu.',
    'ask.tooShort': 'Andika zaidi kidogo ili swali liwe na maana.',
    'ask.tooLong': 'Hilo ni refu mno. Idadi kubwa zaidi ya herufi ambazo swali linaweza kubeba: {max}',
    'ask.signedOut': 'Ingia ili kuuliza swali.',
    'ask.notSent': 'Swali halikuweza kutumwa. Hakuna kilichorekodiwa.',
    'ask.unsure':
      'Jibu halikuweza kusomwa. Huenda swali lako limerekodiwa; angalia maombi yako ya msaada kabla ya kuliuliza tena.',
  },
  af: {
    'ask.title': 'Vra oor ’n les',
    'ask.crumbLearn': 'My leer',
    'ask.crumb': 'Vra',
    'ask.eyebrow': 'Studiehulp',
    'ask.ruleHead': 'Dit wys die pad; dit gee nie uitsprake nie.',
    'ask.rule':
      '’n Antwoord hier is ’n les uit jou kursusse: sy titel, waar dit staan, en ’n reël van die teks wat jy reeds kan lees. Niks op hierdie bladsy skryf ’n eie antwoord nie. ’n Vraag wat ’n godsdienstige uitspraak vra, gaan na ’n onderwyser.',
    'ask.offHead': 'Die studiehulp is nog nie aangeskakel nie.',
    'ask.off': 'Vra jou onderwyser in die les, of vra hulp.',
    'ask.help': 'Vra hulp',
    'ask.back': 'Terug na my leerwerk',
    'ask.label': 'Wat wil jy graag verstaan?',
    'ask.example': 'Byvoorbeeld: hoe word die letter ha uitgespreek?',
    'ask.look': 'Soek dit op',
    'ask.looking': 'Soek tans…',
    'ask.found': 'In jou kursusse gevind',
    'ask.forTeacher': '’n Vraag vir ’n onderwyser',
    'ask.nothing': 'Nog niks in jou kursusse nie',
    'ask.closed': 'Nie aangeskakel nie',
    'ask.foundSays':
      'Dit is wat jou kursusse daaroor dek. Dit wys na ’n les; dit is nie ’n antwoord wat vir jou geskryf is nie.',
    'ask.teacherCase':
      'Dit is ’n vraag vir ’n onderwyser, en hierdie hulp beantwoord nie sulke vrae nie. ’n Versoek om hulp is oopgemaak sodat ’n mens dit kan beantwoord.',
    'ask.teacherNoCase':
      'Dit is ’n vraag vir ’n onderwyser, en hierdie hulp beantwoord nie sulke vrae nie. Vra jou onderwyser in die les.',
    'ask.nothingSays':
      'Niks in jou kursusse dek dit nog nie. ’n Onderwyser kan dit beantwoord: vra in die les, of vra hulp.',
    'ask.openCase': 'Maak versoek {number} oop',
    'ask.rules':
      '’n Les wat jy kan oopmaak, of geen antwoord nie. Vrae wat ’n uitspraak vra, gaan na ’n onderwyser.',
    'ask.tooShort': 'Skryf ’n bietjie meer sodat die vraag iets beteken.',
    'ask.tooLong': 'Dit is te lank. Die meeste karakters wat ’n vraag kan hou: {max}',
    'ask.signedOut': 'Meld aan om ’n vraag te vra.',
    'ask.notSent': 'Die vraag kon nie gestuur word nie. Niks is aangeteken nie.',
    'ask.unsure':
      'Die antwoord kon nie gelees word nie. Jou vraag is dalk aangeteken; kyk na jou versoeke om hulp voordat jy dit weer vra.',
  },
  'zh-hans': {
    'ask.title': '就某节课提问',
    'ask.crumbLearn': '我的学习',
    'ask.crumb': '提问',
    'ask.eyebrow': '学习帮助',
    'ask.ruleHead': '它只指路，不作裁决。',
    'ask.rule': '这里的回答是你课程中的一节课：它的标题、所在位置，以及一行你本来就能读到的文字。本页面上没有任何东西会自己写出答案。请求教法裁决的问题会转给老师。',
    'ask.offHead': '学习助手尚未开启。',
    'ask.off': '请在课中问你的老师，或请求帮助。',
    'ask.help': '请求帮助',
    'ask.back': '返回我的学习',
    'ask.label': '你想弄明白什么？',
    'ask.example': '例如：阿拉伯字母 ح 怎么发音？',
    'ask.look': '查找',
    'ask.looking': '正在查找…',
    'ask.found': '在你的课程中找到',
    'ask.forTeacher': '该问老师的问题',
    'ask.nothing': '你的课程中暂时没有',
    'ask.closed': '未开启',
    'ask.foundSays': '这是你的课程中与此有关的内容。它指向一节课，并不是为你写的答案。',
    'ask.teacherCase': '这是该问老师的问题，本助手不回答这类问题。已开启一条帮助请求，由真人来回答。',
    'ask.teacherNoCase': '这是该问老师的问题，本助手不回答这类问题。请在课中问你的老师。',
    'ask.nothingSays': '你的课程中暂时没有涉及这一点的内容。老师可以回答：请在课中提问，或请求帮助。',
    'ask.openCase': '打开请求 {number}',
    'ask.rules': '要么是一节你能打开的课，要么没有回答。请求裁决的问题会转给老师。',
    'ask.tooShort': '请再多写一点，让问题有意义。',
    'ask.tooLong': '太长了。一个问题最多可容纳的字符数：{max}',
    'ask.signedOut': '请登录后提问。',
    'ask.notSent': '问题未能发送。没有记录任何内容。',
    'ask.unsure': '回答未能读取。你的问题可能已被记录；再次提问前，请先查看你的帮助请求。',
  },
  'zh-hant': {
    'ask.title': '就某一課提問',
    'ask.crumbLearn': '我的學習',
    'ask.crumb': '提問',
    'ask.eyebrow': '學習協助',
    'ask.ruleHead': '它只指路，不作裁決。',
    'ask.rule': '這裡的回答是你課程中的一課：它的標題、所在位置，以及一行你本來就能讀到的文字。本頁面上沒有任何東西會自己寫出答案。請求教法裁決的問題會轉給老師。',
    'ask.offHead': '學習助手尚未開啟。',
    'ask.off': '請在課中問你的老師，或請求協助。',
    'ask.help': '請求協助',
    'ask.back': '返回我的學習',
    'ask.label': '你想弄明白什麼？',
    'ask.example': '例如：阿拉伯字母 ح 怎麼發音？',
    'ask.look': '查找',
    'ask.looking': '正在查找…',
    'ask.found': '在你的課程中找到',
    'ask.forTeacher': '該問老師的問題',
    'ask.nothing': '你的課程中暫時沒有',
    'ask.closed': '未開啟',
    'ask.foundSays': '這是你的課程中與此有關的內容。它指向一課，並不是為你寫的答案。',
    'ask.teacherCase': '這是該問老師的問題，本助手不回答這類問題。已開啟一項協助請求，由真人來回答。',
    'ask.teacherNoCase': '這是該問老師的問題，本助手不回答這類問題。請在課中問你的老師。',
    'ask.nothingSays': '你的課程中暫時沒有涉及這一點的內容。老師可以回答：請在課中提問，或請求協助。',
    'ask.openCase': '開啟請求 {number}',
    'ask.rules': '要麼是一課你能開啟的課，要麼沒有回答。請求裁決的問題會轉給老師。',
    'ask.tooShort': '請再多寫一點，讓問題有意義。',
    'ask.tooLong': '太長了。一個問題最多可容納的字元數：{max}',
    'ask.signedOut': '請登入後提問。',
    'ask.notSent': '問題未能送出。沒有記錄任何內容。',
    'ask.unsure': '回答未能讀取。你的問題可能已被記錄；再次提問前，請先查看你的協助請求。',
  },
  vi: {
    'ask.title': 'Hỏi về một bài học',
    'ask.crumbLearn': 'Việc học của tôi',
    'ask.crumb': 'Hỏi',
    'ask.eyebrow': 'Trợ giúp học tập',
    'ask.ruleHead': 'Nó chỉ đường, không phán quyết.',
    'ask.rule':
      'Câu trả lời ở đây là một bài học trong các khóa học của bạn: tiêu đề, vị trí của nó, và một dòng văn bản mà bạn vốn đã đọc được. Không có gì trên trang này tự viết ra câu trả lời. Câu hỏi xin một phán quyết tôn giáo sẽ được chuyển đến giáo viên.',
    'ask.offHead': 'Trợ lý học tập chưa được bật.',
    'ask.off': 'Hãy hỏi giáo viên của bạn trong bài học, hoặc yêu cầu trợ giúp.',
    'ask.help': 'Yêu cầu trợ giúp',
    'ask.back': 'Quay lại việc học của tôi',
    'ask.label': 'Bạn muốn hiểu điều gì?',
    'ask.example': 'Ví dụ: chữ ha được phát âm như thế nào?',
    'ask.look': 'Tra cứu',
    'ask.looking': 'Đang tra cứu…',
    'ask.found': 'Tìm thấy trong các khóa học của bạn',
    'ask.forTeacher': 'Câu hỏi dành cho giáo viên',
    'ask.nothing': 'Chưa có gì trong các khóa học của bạn',
    'ask.closed': 'Chưa được bật',
    'ask.foundSays':
      'Đây là những gì các khóa học của bạn nói về điều đó. Nó chỉ đến một bài học; không phải câu trả lời được viết cho bạn.',
    'ask.teacherCase':
      'Đó là câu hỏi dành cho giáo viên, và trợ lý này không trả lời những câu như vậy. Một yêu cầu trợ giúp đã được mở để một người thật trả lời.',
    'ask.teacherNoCase':
      'Đó là câu hỏi dành cho giáo viên, và trợ lý này không trả lời những câu như vậy. Hãy hỏi giáo viên của bạn trong bài học.',
    'ask.nothingSays':
      'Chưa có gì trong các khóa học của bạn nói về điều này. Giáo viên có thể trả lời: hãy hỏi trong bài học, hoặc yêu cầu trợ giúp.',
    'ask.openCase': 'Mở yêu cầu {number}',
    'ask.rules':
      'Một bài học bạn có thể mở, hoặc không có câu trả lời. Câu hỏi xin phán quyết sẽ được chuyển đến giáo viên.',
    'ask.tooShort': 'Hãy viết thêm một chút để câu hỏi có nghĩa.',
    'ask.tooLong': 'Quá dài. Số ký tự tối đa của một câu hỏi: {max}',
    'ask.signedOut': 'Hãy đăng nhập để đặt câu hỏi.',
    'ask.notSent': 'Không gửi được câu hỏi. Không có gì được ghi lại.',
    'ask.unsure':
      'Không đọc được câu trả lời. Câu hỏi của bạn có thể đã được ghi lại; hãy xem các yêu cầu trợ giúp của bạn trước khi hỏi lại.',
  },
  th: {
    'ask.title': 'ถามเกี่ยวกับบทเรียน',
    'ask.crumbLearn': 'การเรียนของฉัน',
    'ask.crumb': 'ถาม',
    'ask.eyebrow': 'ความช่วยเหลือในการเรียน',
    'ask.ruleHead': 'ชี้ทางให้ ไม่ได้ชี้ขาด',
    'ask.rule':
      'คำตอบที่นี่คือบทเรียนหนึ่งจากหลักสูตรของคุณ: ชื่อบทเรียน ตำแหน่งของมัน และข้อความหนึ่งบรรทัดที่คุณอ่านได้อยู่แล้ว ไม่มีสิ่งใดในหน้านี้เขียนคำตอบขึ้นเอง คำถามที่ขอคำวินิจฉัยทางศาสนาจะถูกส่งต่อไปยังครู',
    'ask.offHead': 'ผู้ช่วยการเรียนยังไม่ได้เปิดใช้',
    'ask.off': 'ถามครูของคุณในบทเรียน หรือขอความช่วยเหลือ',
    'ask.help': 'ขอความช่วยเหลือ',
    'ask.back': 'กลับไปที่การเรียนของฉัน',
    'ask.label': 'คุณอยากเข้าใจเรื่องอะไร',
    'ask.example': 'ตัวอย่างเช่น: อักษรฮาออกเสียงอย่างไร',
    'ask.look': 'ค้นหา',
    'ask.looking': 'กำลังค้นหา…',
    'ask.found': 'พบในหลักสูตรของคุณ',
    'ask.forTeacher': 'คำถามสำหรับครู',
    'ask.nothing': 'ยังไม่มีในหลักสูตรของคุณ',
    'ask.closed': 'ยังไม่ได้เปิดใช้',
    'ask.foundSays':
      'นี่คือสิ่งที่หลักสูตรของคุณกล่าวถึงในเรื่องนั้น เป็นการชี้ไปยังบทเรียน ไม่ใช่คำตอบที่เขียนขึ้นเพื่อคุณ',
    'ask.teacherCase':
      'นั่นเป็นคำถามสำหรับครู และผู้ช่วยนี้ไม่ตอบคำถามเช่นนั้น ได้เปิดคำขอความช่วยเหลือไว้แล้วเพื่อให้คนจริงเป็นผู้ตอบ',
    'ask.teacherNoCase': 'นั่นเป็นคำถามสำหรับครู และผู้ช่วยนี้ไม่ตอบคำถามเช่นนั้น ถามครูของคุณในบทเรียน',
    'ask.nothingSays':
      'ยังไม่มีสิ่งใดในหลักสูตรของคุณที่กล่าวถึงเรื่องนี้ ครูตอบได้: ถามในบทเรียน หรือขอความช่วยเหลือ',
    'ask.openCase': 'เปิดคำขอ {number}',
    'ask.rules': 'บทเรียนที่คุณเปิดได้ หรือไม่มีคำตอบ คำถามที่ขอคำวินิจฉัยจะถูกส่งต่อไปยังครู',
    'ask.tooShort': 'เขียนเพิ่มอีกเล็กน้อยเพื่อให้คำถามมีความหมาย',
    'ask.tooLong': 'ยาวเกินไป จำนวนอักขระมากที่สุดที่คำถามหนึ่งรับได้: {max}',
    'ask.signedOut': 'เข้าสู่ระบบเพื่อถามคำถาม',
    'ask.notSent': 'ส่งคำถามไม่ได้ ไม่มีสิ่งใดถูกบันทึก',
    'ask.unsure':
      'อ่านคำตอบไม่ได้ คำถามของคุณอาจถูกบันทึกไว้แล้ว โปรดดูคำขอความช่วยเหลือของคุณก่อนถามอีกครั้ง',
  },
  fil: {
    'ask.title': 'Magtanong tungkol sa isang aralin',
    'ask.crumbLearn': 'Aking pag-aaral',
    'ask.crumb': 'Magtanong',
    'ask.eyebrow': 'Tulong sa pag-aaral',
    'ask.ruleHead': 'Nagtuturo ito ng daan, hindi nagpapasya.',
    'ask.rule':
      'Ang sagot dito ay isang aralin mula sa iyong mga kurso: ang pamagat nito, kung nasaan ito, at isang linya ng tekstong nababasa mo na. Walang anuman sa pahinang ito ang sumusulat ng sarili nitong sagot. Ang tanong na humihingi ng pasyang panrelihiyon ay napupunta sa isang guro.',
    'ask.offHead': 'Hindi pa nakabukas ang katulong sa pag-aaral.',
    'ask.off': 'Tanungin ang iyong guro sa aralin, o humingi ng tulong.',
    'ask.help': 'Humingi ng tulong',
    'ask.back': 'Bumalik sa aking pag-aaral',
    'ask.label': 'Ano ang gusto mong maunawaan?',
    'ask.example': 'Halimbawa: paano binibigkas ang titik na ha?',
    'ask.look': 'Hanapin',
    'ask.looking': 'Naghahanap…',
    'ask.found': 'Natagpuan sa iyong mga kurso',
    'ask.forTeacher': 'Tanong para sa isang guro',
    'ask.nothing': 'Wala pa sa iyong mga kurso',
    'ask.closed': 'Hindi nakabukas',
    'ask.foundSays':
      'Ito ang saklaw ng iyong mga kurso tungkol diyan. Itinuturo nito ang isang aralin; hindi ito sagot na isinulat para sa iyo.',
    'ask.teacherCase':
      'Tanong iyan para sa isang guro, at hindi sinasagot ng katulong na ito ang mga ganoon. Binuksan ang isang kahilingan ng tulong upang masagot ito ng isang tao.',
    'ask.teacherNoCase':
      'Tanong iyan para sa isang guro, at hindi sinasagot ng katulong na ito ang mga ganoon. Tanungin ang iyong guro sa aralin.',
    'ask.nothingSays':
      'Wala pa sa iyong mga kurso ang sumasaklaw dito. Masasagot ito ng isang guro: magtanong sa aralin, o humingi ng tulong.',
    'ask.openCase': 'Buksan ang kahilingan {number}',
    'ask.rules':
      'Isang araling mabubuksan mo, o walang sagot. Ang mga tanong na humihingi ng pasya ay napupunta sa isang guro.',
    'ask.tooShort': 'Sumulat pa nang kaunti upang magkaroon ng kahulugan ang tanong.',
    'ask.tooLong': 'Masyadong mahaba iyan. Pinakamaraming character na kasya sa isang tanong: {max}',
    'ask.signedOut': 'Mag-sign in upang magtanong.',
    'ask.notSent': 'Hindi naipadala ang tanong. Walang naitala.',
    'ask.unsure':
      'Hindi nabasa ang sagot. Maaaring naitala ang iyong tanong; tingnan ang iyong mga kahilingan ng tulong bago ito itanong muli.',
  },
  uz: {
    'ask.title': 'Dars haqida soʻrang',
    'ask.crumbLearn': 'Taʼlimim',
    'ask.crumb': 'Savol',
    'ask.eyebrow': 'Oʻqishda yordam',
    'ask.ruleHead': 'U yoʻl koʻrsatadi, hukm chiqarmaydi.',
    'ask.rule':
      'Bu yerdagi javob kurslaringizdagi bir darsdir: uning sarlavhasi, qayerda turgani va oʻzingiz allaqachon oʻqiy oladigan matndan bir satr. Bu sahifada hech narsa oʻzidan javob yozmaydi. Diniy hukm soʻragan savol oʻqituvchiga yuboriladi.',
    'ask.offHead': 'Oʻqish yordamchisi hali yoqilmagan.',
    'ask.off': 'Darsda oʻqituvchingizdan soʻrang yoki yordam soʻrang.',
    'ask.help': 'Yordam soʻrash',
    'ask.back': 'Oʻqishimga qaytish',
    'ask.label': 'Nimani tushunmoqchisiz?',
    'ask.example': 'Masalan: ha harfi qanday talaffuz qilinadi?',
    'ask.look': 'Izlash',
    'ask.looking': 'Izlanmoqda…',
    'ask.found': 'Kurslaringizdan topildi',
    'ask.forTeacher': 'Oʻqituvchiga beriladigan savol',
    'ask.nothing': 'Kurslaringizda hozircha hech narsa yoʻq',
    'ask.closed': 'Yoqilmagan',
    'ask.foundSays':
      'Kurslaringizda bu haqda bor narsa shu. U bir darsga ishora qiladi; siz uchun yozilgan javob emas.',
    'ask.teacherCase':
      'Bu oʻqituvchiga beriladigan savol, bu yordamchi esa bunday savollarga javob bermaydi. Unga inson javob berishi uchun yordam soʻrovi ochildi.',
    'ask.teacherNoCase':
      'Bu oʻqituvchiga beriladigan savol, bu yordamchi esa bunday savollarga javob bermaydi. Darsda oʻqituvchingizdan soʻrang.',
    'ask.nothingSays':
      'Kurslaringizda hozircha bu haqda hech narsa yoʻq. Oʻqituvchi javob bera oladi: darsda soʻrang yoki yordam soʻrang.',
    'ask.openCase': '{number} soʻrovini ochish',
    'ask.rules':
      'Siz ocha oladigan dars yoki hech qanday javob. Hukm soʻragan savollar oʻqituvchiga yuboriladi.',
    'ask.tooShort': 'Savol maʼno kasb etishi uchun biroz koʻproq yozing.',
    'ask.tooLong': 'Bu juda uzun. Bitta savolga sigʻadigan eng koʻp belgi: {max}',
    'ask.signedOut': 'Savol berish uchun tizimga kiring.',
    'ask.notSent': 'Savolni yuborib boʻlmadi. Hech narsa qayd etilmadi.',
    'ask.unsure':
      'Javobni oʻqib boʻlmadi. Savolingiz qayd etilgan boʻlishi mumkin; qayta soʻrashdan oldin yordam soʻrovlaringizga qarang.',
  },
  kk: {
    'ask.title': 'Сабақ туралы сұраңыз',
    'ask.crumbLearn': 'Оқуым',
    'ask.crumb': 'Сұрақ',
    'ask.eyebrow': 'Оқуға көмек',
    'ask.ruleHead': 'Ол жол көрсетеді, үкім шығармайды.',
    'ask.rule':
      'Мұндағы жауап — курстарыңыздағы бір сабақ: оның атауы, қай жерде тұрғаны және өзіңіз онсыз да оқи алатын мәтіннен бір жол. Бұл беттегі ештеңе өз бетінше жауап жазбайды. Діни үкім сұраған сұрақ мұғалімге жіберіледі.',
    'ask.offHead': 'Оқу көмекшісі әлі қосылмаған.',
    'ask.off': 'Сабақта мұғаліміңізден сұраңыз немесе көмек сұраңыз.',
    'ask.help': 'Көмек сұрау',
    'ask.back': 'Оқуыма оралу',
    'ask.label': 'Нені түсінгіңіз келеді?',
    'ask.example': 'Мысалы: «ха» әрпі қалай айтылады?',
    'ask.look': 'Іздеу',
    'ask.looking': 'Ізделуде…',
    'ask.found': 'Курстарыңыздан табылды',
    'ask.forTeacher': 'Мұғалімге қойылатын сұрақ',
    'ask.nothing': 'Курстарыңызда әзірге ештеңе жоқ',
    'ask.closed': 'Қосылмаған',
    'ask.foundSays':
      'Курстарыңызда бұл туралы бары осы. Ол бір сабақты көрсетеді; сізге арнап жазылған жауап емес.',
    'ask.teacherCase':
      'Бұл — мұғалімге қойылатын сұрақ, ал бұл көмекші мұндай сұрақтарға жауап бермейді. Оған адам жауап беруі үшін көмек сұрау өтініші ашылды.',
    'ask.teacherNoCase':
      'Бұл — мұғалімге қойылатын сұрақ, ал бұл көмекші мұндай сұрақтарға жауап бермейді. Сабақта мұғаліміңізден сұраңыз.',
    'ask.nothingSays':
      'Курстарыңызда әзірге бұл туралы ештеңе жоқ. Мұғалім жауап бере алады: сабақта сұраңыз немесе көмек сұраңыз.',
    'ask.openCase': '{number} өтінішін ашу',
    'ask.rules': 'Өзіңіз аша алатын сабақ, не болмаса жауап жоқ. Үкім сұраған сұрақтар мұғалімге жіберіледі.',
    'ask.tooShort': 'Сұрақтың мағынасы болуы үшін сәл көбірек жазыңыз.',
    'ask.tooLong': 'Бұл тым ұзын. Бір сұраққа сыятын ең көп таңба: {max}',
    'ask.signedOut': 'Сұрақ қою үшін жүйеге кіріңіз.',
    'ask.notSent': 'Сұрақты жіберу мүмкін болмады. Ештеңе жазылған жоқ.',
    'ask.unsure':
      'Жауапты оқу мүмкін болмады. Сұрағыңыз жазылып қалған болуы мүмкін; қайта сұрамас бұрын көмек сұрау өтініштеріңізді қараңыз.',
  },
  az: {
    'ask.title': 'Dərs haqqında soruşun',
    'ask.crumbLearn': 'Təhsilim',
    'ask.crumb': 'Sual',
    'ask.eyebrow': 'Təhsilə kömək',
    'ask.ruleHead': 'O yol göstərir, hökm vermir.',
    'ask.rule':
      'Buradakı cavab kurslarınızdan bir dərsdir: onun başlığı, harada yerləşdiyi və onsuz da oxuya bildiyiniz mətndən bir sətir. Bu səhifədə heç nə özündən cavab yazmır. Dini hökm istəyən sual müəllimə göndərilir.',
    'ask.offHead': 'Təhsil köməkçisi hələ işə salınmayıb.',
    'ask.off': 'Dərsdə müəlliminizdən soruşun və ya kömək istəyin.',
    'ask.help': 'Kömək istəyin',
    'ask.back': 'Təhsilimə qayıt',
    'ask.label': 'Nəyi başa düşmək istəyirsiniz?',
    'ask.example': 'Məsələn: ha hərfi necə tələffüz olunur?',
    'ask.look': 'Axtar',
    'ask.looking': 'Axtarılır…',
    'ask.found': 'Kurslarınızda tapıldı',
    'ask.forTeacher': 'Müəllimə veriləcək sual',
    'ask.nothing': 'Kurslarınızda hələ heç nə yoxdur',
    'ask.closed': 'İşə salınmayıb',
    'ask.foundSays':
      'Kurslarınızda bu barədə olan budur. O, bir dərsə işarə edir; sizin üçün yazılmış cavab deyil.',
    'ask.teacherCase':
      'Bu, müəllimə veriləcək sualdır və bu köməkçi belə suallara cavab vermir. Ona insan cavab versin deyə kömək sorğusu açıldı.',
    'ask.teacherNoCase':
      'Bu, müəllimə veriləcək sualdır və bu köməkçi belə suallara cavab vermir. Dərsdə müəlliminizdən soruşun.',
    'ask.nothingSays':
      'Kurslarınızda hələ bu barədə heç nə yoxdur. Müəllim cavab verə bilər: dərsdə soruşun və ya kömək istəyin.',
    'ask.openCase': '{number} nömrəli sorğunu aç',
    'ask.rules': 'Aça biləcəyiniz bir dərs və ya heç bir cavab. Hökm istəyən suallar müəllimə göndərilir.',
    'ask.tooShort': 'Sualın mənası olsun deyə bir az çox yazın.',
    'ask.tooLong': 'Bu çox uzundur. Bir sualın tuta biləcəyi ən çox simvol: {max}',
    'ask.signedOut': 'Sual vermək üçün daxil olun.',
    'ask.notSent': 'Sualı göndərmək mümkün olmadı. Heç nə qeydə alınmadı.',
    'ask.unsure':
      'Cavabı oxumaq mümkün olmadı. Sualınız qeydə alınmış ola bilər; yenidən soruşmazdan əvvəl kömək sorğularınıza baxın.',
  },
  tg: {
    'ask.title': 'Дар бораи дарс пурсед',
    'ask.crumbLearn': 'Таълими ман',
    'ask.crumb': 'Савол',
    'ask.eyebrow': 'Кумак дар омӯзиш',
    'ask.ruleHead': 'Он роҳ нишон медиҳад, ҳукм намебарорад.',
    'ask.rule':
      'Ҷавоб дар ин ҷо як дарс аз курсҳои шумост: унвони он, ҷойи он ва як сатр аз матне, ки худатон аллакай хонда метавонед. Дар ин саҳифа ҳеҷ чиз аз худ ҷавоб наменависад. Саволе, ки ҳукми шаръӣ мехоҳад, ба муаллим фиристода мешавад.',
    'ask.offHead': 'Ёрдамчии омӯзиш ҳанӯз фаъол нашудааст.',
    'ask.off': 'Дар дарс аз муаллими худ пурсед ё кумак дархост кунед.',
    'ask.help': 'Дархости кумак',
    'ask.back': 'Бозгашт ба омӯзиши ман',
    'ask.label': 'Чиро фаҳмидан мехоҳед?',
    'ask.example': 'Масалан: ҳарфи «ҳо» чӣ тавр талаффуз мешавад?',
    'ask.look': 'Ҷустуҷӯ',
    'ask.looking': 'Ҷустуҷӯ рафта истодааст…',
    'ask.found': 'Дар курсҳои шумо ёфт шуд',
    'ask.forTeacher': 'Савол барои муаллим',
    'ask.nothing': 'Дар курсҳои шумо ҳанӯз чизе нест',
    'ask.closed': 'Фаъол нест',
    'ask.foundSays':
      'Ин ҳамон чизест, ки курсҳои шумо дар ин бора доранд. Он ба як дарс ишора мекунад; ҷавобе нест, ки барои шумо навишта шуда бошад.',
    'ask.teacherCase':
      'Ин савол барои муаллим аст ва ин ёрдамчӣ ба чунин саволҳо ҷавоб намедиҳад. Дархости кумак кушода шуд, то ки инсон ба он ҷавоб диҳад.',
    'ask.teacherNoCase':
      'Ин савол барои муаллим аст ва ин ёрдамчӣ ба чунин саволҳо ҷавоб намедиҳад. Дар дарс аз муаллими худ пурсед.',
    'ask.nothingSays':
      'Дар курсҳои шумо ҳанӯз чизе дар ин бора нест. Муаллим ҷавоб дода метавонад: дар дарс пурсед ё кумак дархост кунед.',
    'ask.openCase': 'Кушодани дархости {number}',
    'ask.rules':
      'Дарсе, ки шумо кушода метавонед, ё ҳеҷ ҷавобе. Саволҳое, ки ҳукм мехоҳанд, ба муаллим фиристода мешаванд.',
    'ask.tooShort': 'Каме бештар нависед, то савол маъно пайдо кунад.',
    'ask.tooLong': 'Ин хеле дароз аст. Бештарин шумораи аломатҳое, ки як савол ҷой медиҳад: {max}',
    'ask.signedOut': 'Барои савол додан ворид шавед.',
    'ask.notSent': 'Саволро фиристодан муяссар нашуд. Ҳеҷ чиз сабт нашуд.',
    'ask.unsure':
      'Ҷавобро хондан муяссар нашуд. Шояд саволи шумо сабт шуда бошад; пеш аз дубора пурсидан дархостҳои кумаки худро бубинед.',
  },
  ky: {
    'ask.title': 'Сабак жөнүндө сураңыз',
    'ask.crumbLearn': 'Менин окуум',
    'ask.crumb': 'Суроо',
    'ask.eyebrow': 'Окууга жардам',
    'ask.ruleHead': 'Ал жол көрсөтөт, өкүм чыгарбайт.',
    'ask.rule':
      'Бул жердеги жооп — курстарыңыздагы бир сабак: анын аталышы, кайсы жерде турганы жана өзүңүз ансыз да окуй алган тексттен бир сап. Бул беттеги эч нерсе өз алдынча жооп жазбайт. Диний өкүм сураган суроо мугалимге жөнөтүлөт.',
    'ask.offHead': 'Окуу жардамчысы азырынча күйгүзүлө элек.',
    'ask.off': 'Сабакта мугалимиңизден сураңыз же жардам сураңыз.',
    'ask.help': 'Жардам суроо',
    'ask.back': 'Окуума кайтуу',
    'ask.label': 'Эмнени түшүнгүңүз келет?',
    'ask.example': 'Мисалы: «ха» тамгасы кантип айтылат?',
    'ask.look': 'Издөө',
    'ask.looking': 'Изделүүдө…',
    'ask.found': 'Курстарыңыздан табылды',
    'ask.forTeacher': 'Мугалимге берилчү суроо',
    'ask.nothing': 'Курстарыңызда азырынча эч нерсе жок',
    'ask.closed': 'Күйгүзүлгөн эмес',
    'ask.foundSays':
      'Курстарыңызда бул тууралуу бары ушул. Ал бир сабакты көрсөтөт; сиз үчүн жазылган жооп эмес.',
    'ask.teacherCase':
      'Бул — мугалимге берилчү суроо, ал эми бул жардамчы мындай суроолорго жооп бербейт. Ага адам жооп бериши үчүн жардам суроо өтүнүчү ачылды.',
    'ask.teacherNoCase':
      'Бул — мугалимге берилчү суроо, ал эми бул жардамчы мындай суроолорго жооп бербейт. Сабакта мугалимиңизден сураңыз.',
    'ask.nothingSays':
      'Курстарыңызда азырынча бул тууралуу эч нерсе жок. Мугалим жооп бере алат: сабакта сураңыз же жардам сураңыз.',
    'ask.openCase': '{number} өтүнүчүн ачуу',
    'ask.rules': 'Өзүңүз ача алган сабак же эч кандай жооп жок. Өкүм сураган суроолор мугалимге жөнөтүлөт.',
    'ask.tooShort': 'Суроонун мааниси болушу үчүн дагы бир аз жазыңыз.',
    'ask.tooLong': 'Бул өтө узун. Бир суроого батчу эң көп белги: {max}',
    'ask.signedOut': 'Суроо берүү үчүн кириңиз.',
    'ask.notSent': 'Суроону жөнөтүү мүмкүн болгон жок. Эч нерсе жазылган жок.',
    'ask.unsure':
      'Жоопту окуу мүмкүн болгон жок. Сурооңуз жазылып калган болушу мүмкүн; кайра суроодон мурун жардам суроо өтүнүчтөрүңүздү караңыз.',
  },
  tk: {
    'ask.title': 'Sapak barada soraň',
    'ask.crumbLearn': 'Meniň okuwym',
    'ask.crumb': 'Sorag',
    'ask.eyebrow': 'Okuwa kömek',
    'ask.ruleHead': 'Ol ýol görkezýär, höküm çykarmaýar.',
    'ask.rule':
      'Bu ýerdäki jogap kurslaryňyzdaky bir sapakdyr: onuň ady, nirede durýandygy we özüňiz eýýäm okap bilýän tekstden bir setir. Bu sahypada hiç zat öz-özünden jogap ýazmaýar. Dini höküm soraýan sorag mugallyma iberilýär.',
    'ask.offHead': 'Okuw kömekçisi entek işledilmedi.',
    'ask.off': 'Sapakda mugallymyňyzdan soraň ýa-da kömek soraň.',
    'ask.help': 'Kömek soramak',
    'ask.back': 'Okuwyma dolanmak',
    'ask.label': 'Nämäni düşünmek isleýärsiňiz?',
    'ask.example': 'Mysal üçin: ha harpy nähili aýdylýar?',
    'ask.look': 'Gözle',
    'ask.looking': 'Gözlenýär…',
    'ask.found': 'Kurslaryňyzdan tapyldy',
    'ask.forTeacher': 'Mugallyma berilmeli sorag',
    'ask.nothing': 'Kurslaryňyzda entek hiç zat ýok',
    'ask.closed': 'Işledilmedik',
    'ask.foundSays':
      'Kurslaryňyzda bu barada bar zat şudur. Ol bir sapagy görkezýär; siziň üçin ýazylan jogap däl.',
    'ask.teacherCase':
      'Bu mugallyma berilmeli sorag, bu kömekçi bolsa beýle soraglara jogap bermeýär. Oňa adam jogap berer ýaly kömek haýyşy açyldy.',
    'ask.teacherNoCase':
      'Bu mugallyma berilmeli sorag, bu kömekçi bolsa beýle soraglara jogap bermeýär. Sapakda mugallymyňyzdan soraň.',
    'ask.nothingSays':
      'Kurslaryňyzda entek bu barada hiç zat ýok. Mugallym jogap berip biler: sapakda soraň ýa-da kömek soraň.',
    'ask.openCase': '{number} belgili haýyşy aç',
    'ask.rules': 'Açyp bilýän sapagyňyz ýa-da hiç hili jogap. Höküm soraýan soraglar mugallyma iberilýär.',
    'ask.tooShort': 'Soragyň manysy bolar ýaly ýene biraz ýazyň.',
    'ask.tooLong': 'Bu örän uzyn. Bir soraga sygýan iň köp nyşan: {max}',
    'ask.signedOut': 'Sorag bermek üçin giriň.',
    'ask.notSent': 'Soragy iberip bolmady. Hiç zat ýazga alynmady.',
    'ask.unsure':
      'Jogaby okap bolmady. Soragyňyz ýazga alnan bolmagy mümkin; gaýtadan soramazdan öň kömek haýyşlaryňyza serediň.',
  },
  ta: {
    'ask.title': 'ஒரு பாடத்தைப் பற்றிக் கேளுங்கள்',
    'ask.crumbLearn': 'என் கற்றல்',
    'ask.crumb': 'கேள்வி',
    'ask.eyebrow': 'படிப்புக்கு உதவி',
    'ask.ruleHead': 'இது வழி காட்டும்; தீர்ப்பு வழங்காது.',
    'ask.rule':
      'இங்கே பதில் என்பது உங்கள் பாடநெறிகளில் உள்ள ஒரு பாடம்: அதன் தலைப்பு, அது இருக்கும் இடம், நீங்கள் ஏற்கெனவே படிக்கக்கூடிய உரையின் ஒரு வரி. இந்தப் பக்கத்தில் எதுவும் தானாகப் பதிலை எழுதுவதில்லை. மார்க்கத் தீர்ப்பைக் கேட்கும் கேள்வி ஓர் ஆசிரியரிடம் செல்லும்.',
    'ask.offHead': 'படிப்பு உதவியாளர் இன்னும் இயக்கப்படவில்லை.',
    'ask.off': 'பாடத்தில் உங்கள் ஆசிரியரிடம் கேளுங்கள், அல்லது உதவி கேளுங்கள்.',
    'ask.help': 'உதவி கேளுங்கள்',
    'ask.back': 'என் கற்றலுக்குத் திரும்பு',
    'ask.label': 'நீங்கள் எதைப் புரிந்துகொள்ள விரும்புகிறீர்கள்?',
    'ask.example': 'எடுத்துக்காட்டாக: ஹா எழுத்து எப்படி உச்சரிக்கப்படுகிறது?',
    'ask.look': 'தேடுங்கள்',
    'ask.looking': 'தேடுகிறது…',
    'ask.found': 'உங்கள் பாடநெறிகளில் கிடைத்தது',
    'ask.forTeacher': 'ஆசிரியருக்கான கேள்வி',
    'ask.nothing': 'உங்கள் பாடநெறிகளில் இன்னும் எதுவும் இல்லை',
    'ask.closed': 'இயக்கப்படவில்லை',
    'ask.foundSays':
      'இதைப் பற்றி உங்கள் பாடநெறிகளில் உள்ளது இதுதான். இது ஒரு பாடத்தைச் சுட்டுகிறது; உங்களுக்காக எழுதப்பட்ட பதில் அல்ல.',
    'ask.teacherCase':
      'அது ஆசிரியருக்கான கேள்வி; இந்த உதவியாளர் அத்தகைய கேள்விகளுக்குப் பதிலளிப்பதில்லை. ஒரு மனிதர் பதிலளிக்கும் வகையில் உதவிக் கோரிக்கை ஒன்று திறக்கப்பட்டுள்ளது.',
    'ask.teacherNoCase':
      'அது ஆசிரியருக்கான கேள்வி; இந்த உதவியாளர் அத்தகைய கேள்விகளுக்குப் பதிலளிப்பதில்லை. பாடத்தில் உங்கள் ஆசிரியரிடம் கேளுங்கள்.',
    'ask.nothingSays':
      'உங்கள் பாடநெறிகளில் இதைப் பற்றி இன்னும் எதுவும் இல்லை. ஓர் ஆசிரியர் பதிலளிக்கலாம்: பாடத்தில் கேளுங்கள், அல்லது உதவி கேளுங்கள்.',
    'ask.openCase': 'கோரிக்கை {number}-ஐத் திறக்கவும்',
    'ask.rules':
      'நீங்கள் திறக்கக்கூடிய ஒரு பாடம், இல்லையெனில் பதில் இல்லை. தீர்ப்பைக் கேட்கும் கேள்விகள் ஆசிரியரிடம் செல்லும்.',
    'ask.tooShort': 'கேள்விக்குப் பொருள் இருக்கும்படி இன்னும் கொஞ்சம் எழுதுங்கள்.',
    'ask.tooLong': 'இது மிக நீளமானது. ஒரு கேள்வியில் அடங்கும் அதிகபட்ச எழுத்துகள்: {max}',
    'ask.signedOut': 'கேள்வி கேட்க உள்நுழையுங்கள்.',
    'ask.notSent': 'கேள்வியை அனுப்ப முடியவில்லை. எதுவும் பதிவாகவில்லை.',
    'ask.unsure':
      'பதிலைப் படிக்க முடியவில்லை. உங்கள் கேள்வி பதிவாகியிருக்கலாம்; மீண்டும் கேட்கும் முன் உங்கள் உதவிக் கோரிக்கைகளைப் பாருங்கள்.',
  },
  ne: {
    'ask.title': 'कुनै पाठबारे सोध्नुहोस्',
    'ask.crumbLearn': 'मेरो सिकाइ',
    'ask.crumb': 'सोध्नुहोस्',
    'ask.eyebrow': 'पढाइमा मद्दत',
    'ask.ruleHead': 'यसले बाटो देखाउँछ, फतवा दिँदैन।',
    'ask.rule':
      'यहाँ जवाफ भनेको तपाईंका कोर्सहरूको कुनै पाठ हो: त्यसको शीर्षक, त्यो कहाँ छ, र तपाईंले पहिल्यै पढ्न सक्ने पाठको एक हरफ। यस पृष्ठमा कुनै पनि कुराले आफैँ जवाफ लेख्दैन। धार्मिक निर्णय माग्ने प्रश्न शिक्षककहाँ जान्छ।',
    'ask.offHead': 'पढाइ सहायक अझै चालु गरिएको छैन।',
    'ask.off': 'पाठमा आफ्नो शिक्षकलाई सोध्नुहोस्, वा मद्दत माग्नुहोस्।',
    'ask.help': 'मद्दत माग्नुहोस्',
    'ask.back': 'मेरो सिकाइमा फर्कनुहोस्',
    'ask.label': 'तपाईं के बुझ्न चाहनुहुन्छ?',
    'ask.example': 'उदाहरणका लागि: हा अक्षर कसरी उच्चारण गरिन्छ?',
    'ask.look': 'खोज्नुहोस्',
    'ask.looking': 'खोजिँदै छ…',
    'ask.found': 'तपाईंका कोर्सहरूमा भेटियो',
    'ask.forTeacher': 'शिक्षकका लागि प्रश्न',
    'ask.nothing': 'तपाईंका कोर्सहरूमा अझै केही छैन',
    'ask.closed': 'चालु छैन',
    'ask.foundSays':
      'यसबारे तपाईंका कोर्सहरूमा भएको यही हो। यसले एउटा पाठतर्फ देखाउँछ; तपाईंका लागि लेखिएको जवाफ होइन।',
    'ask.teacherCase':
      'त्यो शिक्षकका लागि प्रश्न हो, र यो सहायकले त्यस्ता प्रश्नको जवाफ दिँदैन। कुनै मानिसले जवाफ दिऊन् भनेर मद्दतको एउटा अनुरोध खोलिएको छ।',
    'ask.teacherNoCase':
      'त्यो शिक्षकका लागि प्रश्न हो, र यो सहायकले त्यस्ता प्रश्नको जवाफ दिँदैन। पाठमा आफ्नो शिक्षकलाई सोध्नुहोस्।',
    'ask.nothingSays':
      'तपाईंका कोर्सहरूमा अझै यसबारे केही छैन। शिक्षकले जवाफ दिन सक्छन्: पाठमा सोध्नुहोस्, वा मद्दत माग्नुहोस्।',
    'ask.openCase': 'अनुरोध {number} खोल्नुहोस्',
    'ask.rules': 'तपाईंले खोल्न सक्ने पाठ, नत्र कुनै जवाफ छैन। निर्णय माग्ने प्रश्नहरू शिक्षककहाँ जान्छन्।',
    'ask.tooShort': 'प्रश्नको अर्थ लागोस् भनेर अलि बढी लेख्नुहोस्।',
    'ask.tooLong': 'यो धेरै लामो भयो। एउटा प्रश्नमा अट्ने सबैभन्दा धेरै अक्षर: {max}',
    'ask.signedOut': 'प्रश्न सोध्न साइन इन गर्नुहोस्।',
    'ask.notSent': 'प्रश्न पठाउन सकिएन। केही पनि रेकर्ड भएन।',
    'ask.unsure':
      'जवाफ पढ्न सकिएन। तपाईंको प्रश्न रेकर्ड भएको हुन सक्छ; फेरि सोध्नुअघि आफ्ना मद्दतका अनुरोधहरू हेर्नुहोस्।',
  },
};
