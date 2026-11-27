import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Checking a certificate: `/verify`, where a number is typed, and
 * `/verify/[number]`, which answers.
 *
 * Written on 2026-11-25, on the owner's ruling that what is not a
 * declaration is to be in the reader's language. The reader is usually
 * not a learner: it is an employer, a school or a parent holding
 * somebody else's certificate, with no account and no session, so the
 * language is the one their browser asks for.
 *
 * `{number}` is the sample number `AS-2026-00000001`, which the pages set
 * left to right in every language. "Valid" is the platform's answer: the
 * certificate was issued here and has not been revoked. "Revoked" is the
 * word the certificate pages use (`cert.revoked`), and the reason is
 * shown as a member of staff wrote it. "The holder" is the person named
 * on the certificate, of either sex. The sheet a learner prints stays
 * English (`cert.sheetNote`); this is the page that reads it back.
 *
 * `unchecked` and `uncheckedBody` (2026-11-27) are what the page says when
 * the check itself could not be made. They must never read as an answer
 * about the certificate: not "no match", not "not valid". No speaker has
 * read them.
 */
export const VERIFY: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'verify.unchecked': 'تعذّر التحقق من هذه الشهادة الآن.',
    'verify.uncheckedBody':
      'هذا خلل من جهتنا، ولا يعني أن الشهادة غير سارية. حاول مرة أخرى بعد قليل.',
    'verify.description': 'تحقّق من رقم شهادة AyahSpring. لا حاجة إلى حساب — الرقم هو كل ما يلزم.',
    'verify.lede':
      'تحمل كل شهادة من AyahSpring رقمًا. التحقق منه يخبرك هل صدرت الشهادة من هنا، ولمن، ولأي دورة، وهل أُلغيت بعد ذلك.',
    'verify.numberLabel': 'رقم الشهادة',
    'verify.check': 'تحقّق',
    'verify.where': 'أين تجد الرقم',
    'verify.whereBody':
      'الرقم مطبوع على الشهادة نفسها، وغالبًا في إحدى زواياها بهذا الشكل {number}: الحرفان AS، ثم السنة، ثم ثمانية أرقام. وإن أُرسل إليك رابط فالرقم في آخره — وكلاهما يوصلك إلى الجواب نفسه.',
    'verify.forgiving':
      'لا يهمّ هنا كون الحروف كبيرة أو صغيرة ولا المسافات ولا الشرطات: الرقم المنسوخ من ملف PDF يعمل أيضًا.',
    'verify.notTold': 'ما لا يخبرك به التحقق',
    'verify.notToldBody':
      'يؤكد ما أصدرته المنصة وهل ما زال قائمًا. لا يزكّي صاحب الشهادة خارج الدورة، ولا يُظهر عن المتعلّم شيئًا غير الاسم المكتوب على الشهادة — لا حساب هنا تدخل إليه، ولا قائمة بشهادات أحد تتصفحها.',
    'verify.home': 'الصفحة الرئيسية لـ AyahSpring',
    'verify.notANumber':
      'لا يبدو هذا رقم شهادة. أرقام الشهادات تكون بهذا الشكل {number} — الحرفان AS، ثم السنة، ثم ثمانية أرقام.',
    'verify.heading': 'التحقق من شهادة',
    'verify.none': 'لا توجد شهادة تطابق هذا الرقم.',
    'verify.noneBody': 'تأكد من عدم وجود خطأ في النسخ. أرقام الشهادات تكون بهذا الشكل {number}.',
    'verify.valid': 'هذه الشهادة سارية.',
    'verify.validBody': 'أصدرتها AyahSpring ولم تُلغَ.',
    'verify.invalid': 'هذه الشهادة غير سارية.',
    'verify.notIssued': 'حالتها ليست «صادرة».',
    'verify.holder': 'صاحب الشهادة',
    'verify.number': 'الرقم',
    'verify.frozen':
      'عنوان الدورة ونسختها المعروضان هنا هما ما كانا عليه عند إصدار الشهادة. وهما مسجّلان في الشهادة نفسها ولا يمكن تغييرهما بعد ذلك.',
  },
  ur: {
    'verify.unchecked': 'اس سند کی تصدیق ابھی نہیں ہو سکی۔',
    'verify.uncheckedBody':
      'یہ خرابی ہماری طرف سے ہے۔ اس کا مطلب یہ نہیں کہ سند درست نہیں ہے۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    'verify.description':
      'AyahSpring کی سند کا نمبر جانچیں۔ اکاؤنٹ کی ضرورت نہیں — صرف نمبر درکار ہے۔',
    'verify.lede':
      'AyahSpring کی ہر سند پر ایک نمبر ہوتا ہے۔ اسے جانچنے سے معلوم ہوتا ہے کہ آیا سند یہیں سے جاری ہوئی، کسے، کس کورس کے لیے، اور آیا بعد میں منسوخ ہوئی۔',
    'verify.numberLabel': 'سند کا نمبر',
    'verify.check': 'جانچیں',
    'verify.where': 'نمبر کہاں ملے گا',
    'verify.whereBody':
      'نمبر خود سند پر چھپا ہوتا ہے، عموماً کسی کونے میں اس شکل میں {number}: حروف AS، پھر سال، پھر آٹھ ہندسے۔ اگر آپ کو لنک بھیجا گیا ہے تو نمبر اس کے آخر میں ہے — دونوں ایک ہی جواب تک پہنچاتے ہیں۔',
    'verify.forgiving':
      'یہاں بڑے چھوٹے حروف، خالی جگہوں اور ڈیش سے کوئی فرق نہیں پڑتا: PDF سے نقل کیا ہوا نمبر بھی کام کرتا ہے۔',
    'verify.notTold': 'جانچ کیا نہیں بتاتی',
    'verify.notToldBody':
      'یہ تصدیق کرتی ہے کہ پلیٹ فارم نے کیا جاری کیا اور آیا وہ اب بھی برقرار ہے۔ یہ کورس سے باہر سند کے حامل کی ضمانت نہیں دیتی، اور سیکھنے والے کے بارے میں سند پر لکھے نام کے سوا کچھ نہیں دکھاتی — یہاں لاگ اِن کرنے کے لیے کوئی اکاؤنٹ نہیں، اور نہ کسی کی اسناد کی کوئی فہرست ہے۔',
    'verify.home': 'AyahSpring کا مرکزی صفحہ',
    'verify.notANumber':
      'یہ سند کا نمبر نہیں لگتا۔ سند کے نمبر اس شکل کے ہوتے ہیں {number} — حروف AS، پھر سال، پھر آٹھ ہندسے۔',
    'verify.heading': 'سند کی تصدیق',
    'verify.none': 'اس نمبر سے کوئی سند نہیں ملتی۔',
    'verify.noneBody':
      'دیکھیں کہ نقل کرنے میں غلطی تو نہیں ہوئی۔ سند کے نمبر اس شکل کے ہوتے ہیں {number}۔',
    'verify.valid': 'یہ سند درست ہے۔',
    'verify.validBody': 'یہ AyahSpring نے جاری کی اور منسوخ نہیں ہوئی۔',
    'verify.invalid': 'یہ سند درست نہیں ہے۔',
    'verify.notIssued': 'اس کی حالت ”جاری شدہ“ نہیں ہے۔',
    'verify.holder': 'سند کا حامل',
    'verify.number': 'نمبر',
    'verify.frozen':
      'یہاں دکھایا گیا کورس کا عنوان اور ورژن وہی ہیں جو سند جاری ہوتے وقت تھے۔ یہ خود سند پر درج ہیں اور بعد میں بدلے نہیں جا سکتے۔',
  },
  fa: {
    'verify.unchecked': 'این گواهی‌نامه هم‌اکنون قابل بررسی نبود.',
    'verify.uncheckedBody':
      'این اشکال از سمت ماست و به این معنا نیست که گواهی‌نامه معتبر نیست. کمی بعد دوباره تلاش کنید.',
    'verify.description':
      'شمارهٔ گواهی‌نامهٔ AyahSpring را بررسی کنید. حساب لازم نیست — فقط شماره لازم است.',
    'verify.lede':
      'هر گواهی‌نامهٔ AyahSpring شماره‌ای دارد. بررسی آن نشان می‌دهد که آیا اینجا صادر شده، برای چه کسی، برای کدام دوره، و آیا پس از آن باطل شده است.',
    'verify.numberLabel': 'شمارهٔ گواهی‌نامه',
    'verify.check': 'بررسی',
    'verify.where': 'شماره کجاست',
    'verify.whereBody':
      'شماره روی خود گواهی‌نامه چاپ شده است، معمولاً در یک گوشه به این شکل {number}: حروف AS، سال، سپس هشت رقم. اگر پیوندی برایتان فرستاده‌اند، شماره در پایان آن است — هر دو به یک پاسخ می‌رسند.',
    'verify.forgiving':
      'اینجا بزرگی و کوچکی حروف، فاصله‌ها و خط‌تیره‌ها اهمیتی ندارد: شماره‌ای که از PDF رونویسی شده هم کار می‌کند.',
    'verify.notTold': 'آنچه بررسی به شما نمی‌گوید',
    'verify.notToldBody':
      'بررسی تأیید می‌کند که سکو چه چیزی صادر کرده و آیا هنوز پابرجاست. دربارهٔ دارندهٔ گواهی‌نامه بیرون از دوره ضمانتی نمی‌دهد و از یادگیرنده چیزی جز نام روی گواهی‌نامه نشان نمی‌دهد — اینجا حسابی برای ورود نیست و فهرستی از گواهی‌نامه‌های کسی برای مرور وجود ندارد.',
    'verify.home': 'صفحهٔ اصلی AyahSpring',
    'verify.notANumber':
      'این به شمارهٔ گواهی‌نامه نمی‌ماند. شماره‌ها به این شکل‌اند {number} — حروف AS، سال، سپس هشت رقم.',
    'verify.heading': 'درستی‌سنجی گواهی‌نامه',
    'verify.none': 'هیچ گواهی‌نامه‌ای با این شماره مطابقت ندارد.',
    'verify.noneBody':
      'ببینید در رونویسی خطایی نشده باشد. شمارهٔ گواهی‌نامه به این شکل است {number}.',
    'verify.valid': 'این گواهی‌نامه معتبر است.',
    'verify.validBody': 'AyahSpring آن را صادر کرده و باطل نشده است.',
    'verify.invalid': 'این گواهی‌نامه معتبر نیست.',
    'verify.notIssued': 'وضعیت آن «صادرشده» نیست.',
    'verify.holder': 'دارنده',
    'verify.number': 'شماره',
    'verify.frozen':
      'عنوان و نسخهٔ دوره که اینجا نشان داده شده همان است که هنگام صدور گواهی‌نامه بود. این‌ها روی خود گواهی‌نامه ثبت شده‌اند و پس از آن قابل تغییر نیستند.',
  },
  'fa-af': {
    'verify.unchecked': 'این سند همین حالا بررسی شده نتوانست.',
    'verify.uncheckedBody':
      'این مشکل از طرف ماست و به این معنا نیست که سند معتبر نیست. کمی بعد دوباره کوشش کنید.',
    'verify.description':
      'شمارهٔ سند AyahSpring را بررسی کنید. به حساب ضرورت نیست — تنها شماره کافی است.',
    'verify.lede':
      'هر سند AyahSpring یک شماره دارد. بررسی آن نشان می‌دهد که آیا اینجا صادر شده، برای کی، برای کدام کورس، و آیا پس از آن باطل شده است.',
    'verify.numberLabel': 'شمارهٔ سند',
    'verify.check': 'بررسی',
    'verify.where': 'شماره در کجاست',
    'verify.whereBody':
      'شماره روی خود سند چاپ شده است، معمولاً در یک گوشه به این شکل {number}: حروف AS، سال، سپس هشت رقم. اگر برای‌تان لینک فرستاده شده، شماره در آخر آن است — هر دو به یک جواب می‌رسند.',
    'verify.forgiving':
      'اینجا کلان و خرد بودن حروف، فاصله‌ها و خط‌تیره‌ها اهمیت ندارد: شماره‌ای که از PDF کاپی شده هم کار می‌کند.',
    'verify.notTold': 'آنچه بررسی به شما نمی‌گوید',
    'verify.notToldBody':
      'بررسی تأیید می‌کند که پلتفرم چه چیزی صادر کرده و آیا هنوز پابرجاست. دربارهٔ دارندهٔ سند بیرون از کورس ضمانت نمی‌کند و از شاگرد چیزی جز نام روی سند نشان نمی‌دهد — اینجا حسابی برای ورود نیست و فهرستی از اسناد کسی برای دیدن وجود ندارد.',
    'verify.home': 'صفحهٔ اصلی AyahSpring',
    'verify.notANumber':
      'این به شمارهٔ سند نمی‌ماند. شماره‌ها به این شکل‌اند {number} — حروف AS، سال، سپس هشت رقم.',
    'verify.heading': 'تصدیق سند',
    'verify.none': 'هیچ سندی با این شماره مطابقت ندارد.',
    'verify.noneBody':
      'ببینید در نوشتن شماره اشتباهی نشده باشد. شمارهٔ سند به این شکل است {number}.',
    'verify.valid': 'این سند معتبر است.',
    'verify.validBody': 'AyahSpring آن را صادر کرده و باطل نشده است.',
    'verify.invalid': 'این سند معتبر نیست.',
    'verify.notIssued': 'وضعیت آن «صادرشده» نیست.',
    'verify.holder': 'دارنده',
    'verify.number': 'شماره',
    'verify.frozen':
      'عنوان و نسخهٔ کورس که اینجا نشان داده شده همان است که هنگام صدور سند بود. این‌ها روی خود سند ثبت شده‌اند و پس از آن تغییر داده نمی‌شوند.',
  },
  tr: {
    'verify.unchecked': 'Bu sertifika şu anda kontrol edilemedi.',
    'verify.uncheckedBody':
      'Bu bizden kaynaklanan bir hatadır; sertifikanın geçerli olmadığı anlamına gelmez. Biraz sonra yeniden deneyin.',
    'verify.description':
      'Bir AyahSpring sertifika numarasını doğrulayın. Hesap gerekmez — yalnızca numara yeterlidir.',
    'verify.lede':
      'Her AyahSpring sertifikasının bir numarası vardır. Numarayı doğrulamak, sertifikanın burada verilip verilmediğini, kime, hangi kurs için verildiğini ve sonradan iptal edilip edilmediğini gösterir.',
    'verify.numberLabel': 'Sertifika numarası',
    'verify.check': 'Doğrula',
    'verify.where': 'Numara nerede bulunur',
    'verify.whereBody':
      'Numara sertifikanın üzerinde, çoğunlukla bir köşede şu biçimde basılıdır: {number} — AS harfleri, yıl, ardından sekiz rakam. Size bir bağlantı gönderildiyse numara onun sonundadır; ikisi de aynı yanıta ulaşır.',
    'verify.forgiving':
      'Burada büyük-küçük harf, boşluklar ve tireler önemli değildir: PDF’ten kopyalanan numara da çalışır.',
    'verify.notTold': 'Doğrulamanın söylemediği',
    'verify.notToldBody':
      'Platformun neyi verdiğini ve bunun hâlâ geçerli olup olmadığını teyit eder. Sertifika sahibine kurs dışında kefil olmaz ve öğrenci hakkında sertifikadaki addan başka bir şey göstermez — burada giriş yapılacak bir hesap da, kimsenin sertifikalarının gezilecek bir listesi de yoktur.',
    'verify.home': 'AyahSpring ana sayfası',
    'verify.notANumber':
      'Bu bir sertifika numarasına benzemiyor. Numaralar şu biçimdedir: {number} — AS harfleri, yıl, ardından sekiz rakam.',
    'verify.heading': 'Sertifika doğrulama',
    'verify.none': 'Bu numarayla eşleşen bir sertifika yok.',
    'verify.noneBody':
      'Yazım hatası olup olmadığına bakın. Sertifika numaraları şu biçimdedir: {number}.',
    'verify.valid': 'Bu sertifika geçerlidir.',
    'verify.validBody': 'AyahSpring tarafından verilmiştir ve iptal edilmemiştir.',
    'verify.invalid': 'Bu sertifika geçerli değildir.',
    'verify.notIssued': 'Durumu “verildi” değildir.',
    'verify.holder': 'Sertifika sahibi',
    'verify.number': 'Numara',
    'verify.frozen':
      'Burada gösterilen kurs başlığı ve sürümü, sertifika verildiği andaki hâlidir. Bunlar sertifikanın üzerinde kayıtlıdır ve sonradan değiştirilemez.',
  },
  id: {
    'verify.unchecked': 'Sertifikat ini tidak dapat diperiksa saat ini.',
    'verify.uncheckedBody':
      'Ini kesalahan di pihak kami. Bukan berarti sertifikat ini tidak sah. Coba lagi sebentar lagi.',
    'verify.description':
      'Periksa nomor sertifikat AyahSpring. Tidak perlu akun — hanya nomornya yang diperlukan.',
    'verify.lede':
      'Setiap sertifikat AyahSpring memiliki nomor. Memeriksanya memberi tahu Anda apakah sertifikat itu diterbitkan di sini, untuk siapa, untuk kursus apa, dan apakah setelah itu dicabut.',
    'verify.numberLabel': 'Nomor sertifikat',
    'verify.check': 'Periksa',
    'verify.where': 'Di mana menemukannya',
    'verify.whereBody':
      'Nomor itu tercetak pada sertifikatnya sendiri, biasanya di salah satu sudut dalam bentuk {number}: huruf AS, tahun, lalu delapan angka. Jika Anda dikirimi tautan, nomornya ada di ujung tautan itu — keduanya sampai pada jawaban yang sama.',
    'verify.forgiving':
      'Huruf besar-kecil, spasi, dan tanda hubung tidak berpengaruh di sini: nomor yang disalin dari PDF tetap bisa dipakai.',
    'verify.notTold': 'Apa yang tidak diberitahukan oleh pemeriksaan',
    'verify.notToldBody':
      'Pemeriksaan menegaskan apa yang diterbitkan platform dan apakah itu masih berlaku. Pemeriksaan tidak menjamin pemegangnya di luar kursus, dan tidak menampilkan apa pun tentang peserta didik selain nama pada sertifikat — tidak ada akun untuk dimasuki di sini, dan tidak ada daftar sertifikat siapa pun untuk dijelajahi.',
    'verify.home': 'Beranda AyahSpring',
    'verify.notANumber':
      'Itu tidak tampak seperti nomor sertifikat. Bentuknya seperti {number} — huruf AS, tahun, lalu delapan angka.',
    'verify.heading': 'Verifikasi sertifikat',
    'verify.none': 'Tidak ada sertifikat yang cocok dengan nomor itu.',
    'verify.noneBody':
      'Periksa apakah ada salah ketik. Nomor sertifikat berbentuk seperti {number}.',
    'verify.valid': 'Sertifikat ini sah.',
    'verify.validBody': 'Sertifikat ini diterbitkan oleh AyahSpring dan belum dicabut.',
    'verify.invalid': 'Sertifikat ini tidak sah.',
    'verify.notIssued': 'Statusnya bukan “diterbitkan”.',
    'verify.holder': 'Pemegang',
    'verify.number': 'Nomor',
    'verify.frozen':
      'Judul dan versi kursus yang ditampilkan di sini adalah seperti saat sertifikat diterbitkan. Keduanya tercatat pada sertifikat itu sendiri dan tidak dapat diubah setelahnya.',
  },
  ms: {
    'verify.unchecked': 'Sijil ini tidak dapat disemak sekarang.',
    'verify.uncheckedBody':
      'Ini masalah di pihak kami. Ia tidak bermakna sijil ini tidak sah. Cuba lagi sebentar lagi.',
    'verify.description':
      'Semak nombor sijil AyahSpring. Akaun tidak diperlukan — hanya nombor itu yang diperlukan.',
    'verify.lede':
      'Setiap sijil AyahSpring mempunyai nombor. Menyemaknya memberitahu anda sama ada sijil itu dikeluarkan di sini, kepada siapa, untuk kursus apa, dan sama ada ia telah dibatalkan selepas itu.',
    'verify.numberLabel': 'Nombor sijil',
    'verify.check': 'Semak',
    'verify.where': 'Di mana hendak mencarinya',
    'verify.whereBody':
      'Nombor itu dicetak pada sijil itu sendiri, biasanya di satu penjuru dalam bentuk {number}: huruf AS, tahun, kemudian lapan digit. Jika anda dihantar pautan, nombor itu ada di hujungnya — kedua-duanya sampai kepada jawapan yang sama.',
    'verify.forgiving':
      'Huruf besar atau kecil, jarak dan sengkang tidak penting di sini: nombor yang disalin daripada PDF tetap berfungsi.',
    'verify.notTold': 'Apa yang tidak diberitahu oleh semakan',
    'verify.notToldBody':
      'Semakan mengesahkan apa yang dikeluarkan oleh platform dan sama ada ia masih sah. Semakan tidak menjamin pemegangnya di luar kursus, dan tidak menunjukkan apa-apa tentang pelajar selain nama pada sijil — tiada akaun untuk dilog masuk di sini, dan tiada senarai sijil sesiapa untuk dilayari.',
    'verify.home': 'Laman utama AyahSpring',
    'verify.notANumber':
      'Itu tidak kelihatan seperti nombor sijil. Bentuknya seperti {number} — huruf AS, tahun, kemudian lapan digit.',
    'verify.heading': 'Sahkan sijil',
    'verify.none': 'Tiada sijil yang sepadan dengan nombor itu.',
    'verify.noneBody':
      'Semak kalau-kalau ada kesilapan menyalin. Nombor sijil berbentuk seperti {number}.',
    'verify.valid': 'Sijil ini sah.',
    'verify.validBody': 'Sijil ini dikeluarkan oleh AyahSpring dan belum dibatalkan.',
    'verify.invalid': 'Sijil ini tidak sah.',
    'verify.notIssued': 'Statusnya bukan “dikeluarkan”.',
    'verify.holder': 'Pemegang',
    'verify.number': 'Nombor',
    'verify.frozen':
      'Tajuk dan versi kursus yang ditunjukkan di sini adalah seperti semasa sijil dikeluarkan. Kedua-duanya direkodkan pada sijil itu sendiri dan tidak boleh diubah selepas itu.',
  },
  bn: {
    'verify.unchecked': 'এই সনদটি এই মুহূর্তে যাচাই করা যায়নি।',
    'verify.uncheckedBody':
      'এটি আমাদের দিকের ত্রুটি। এর মানে এই নয় যে সনদটি বৈধ নয়। একটু পরে আবার চেষ্টা করুন।',
    'verify.description':
      'AyahSpring-এর সনদের নম্বর যাচাই করুন। অ্যাকাউন্ট লাগে না — শুধু নম্বরটিই দরকার।',
    'verify.lede':
      'AyahSpring-এর প্রতিটি সনদে একটি নম্বর থাকে। সেটি যাচাই করলে জানা যায় সনদটি এখান থেকে দেওয়া হয়েছে কি না, কাকে, কোন কোর্সের জন্য, এবং পরে তা বাতিল হয়েছে কি না।',
    'verify.numberLabel': 'সনদের নম্বর',
    'verify.check': 'যাচাই করুন',
    'verify.where': 'নম্বরটি কোথায় পাবেন',
    'verify.whereBody':
      'নম্বরটি সনদের ওপরেই ছাপা থাকে, সাধারণত কোনো এক কোণে এই আকারে {number}: AS অক্ষর দুটি, সাল, তারপর আটটি অঙ্ক। আপনাকে লিংক পাঠানো হয়ে থাকলে নম্বরটি তার শেষে আছে — দুটিই একই উত্তরে পৌঁছায়।',
    'verify.forgiving':
      'এখানে বড় বা ছোট হাতের অক্ষর, ফাঁকা জায়গা বা ড্যাশে কিছু আসে যায় না: PDF থেকে কপি করা নম্বরও কাজ করে।',
    'verify.notTold': 'যাচাই যা জানায় না',
    'verify.notToldBody':
      'এটি নিশ্চিত করে প্ল্যাটফর্ম কী দিয়েছে এবং তা এখনো বহাল আছে কি না। কোর্সের বাইরে সনদধারীর পক্ষে এটি কোনো নিশ্চয়তা দেয় না, এবং সনদে লেখা নাম ছাড়া শিক্ষার্থীর আর কিছুই দেখায় না — এখানে লগইন করার কোনো অ্যাকাউন্ট নেই, কারও সনদের তালিকাও নেই।',
    'verify.home': 'AyahSpring-এর মূল পাতা',
    'verify.notANumber':
      'এটি সনদের নম্বরের মতো দেখাচ্ছে না। নম্বর দেখতে এমন {number} — AS অক্ষর দুটি, সাল, তারপর আটটি অঙ্ক।',
    'verify.heading': 'সনদ যাচাই',
    'verify.none': 'এই নম্বরের সঙ্গে কোনো সনদ মেলে না।',
    'verify.noneBody': 'লিখতে ভুল হয়েছে কি না দেখুন। সনদের নম্বর দেখতে এমন {number}।',
    'verify.valid': 'এই সনদ বৈধ।',
    'verify.validBody': 'এটি AyahSpring দিয়েছে এবং বাতিল করা হয়নি।',
    'verify.invalid': 'এই সনদ বৈধ নয়।',
    'verify.notIssued': 'এর অবস্থা “প্রদত্ত” নয়।',
    'verify.holder': 'সনদধারী',
    'verify.number': 'নম্বর',
    'verify.frozen':
      'এখানে দেখানো কোর্সের শিরোনাম ও সংস্করণ সনদ দেওয়ার সময় যেমন ছিল তেমনই। এগুলো সনদেই লেখা আছে এবং পরে বদলানো যায় না।',
  },
  hi: {
    'verify.unchecked': 'इस प्रमाणपत्र की जाँच अभी नहीं हो सकी।',
    'verify.uncheckedBody':
      'यह हमारी ओर की गड़बड़ी है। इसका यह मतलब नहीं कि प्रमाणपत्र मान्य नहीं है। थोड़ी देर बाद फिर कोशिश करें।',
    'verify.description':
      'AyahSpring के प्रमाणपत्र का नंबर जाँचें। खाते की ज़रूरत नहीं — केवल नंबर चाहिए।',
    'verify.lede':
      'AyahSpring के हर प्रमाणपत्र पर एक नंबर होता है। उसे जाँचने से पता चलता है कि प्रमाणपत्र यहीं से जारी हुआ या नहीं, किसे, किस कोर्स के लिए, और क्या बाद में रद्द किया गया।',
    'verify.numberLabel': 'प्रमाणपत्र नंबर',
    'verify.check': 'जाँचें',
    'verify.where': 'नंबर कहाँ मिलेगा',
    'verify.whereBody':
      'नंबर प्रमाणपत्र पर ही छपा होता है, अक्सर किसी कोने में इस रूप में {number}: अक्षर AS, वर्ष, फिर आठ अंक। अगर आपको लिंक भेजा गया है तो नंबर उसके अंत में है — दोनों एक ही उत्तर तक पहुँचाते हैं।',
    'verify.forgiving':
      'यहाँ बड़े-छोटे अक्षरों, खाली जगहों और डैश से कोई फ़र्क नहीं पड़ता: PDF से कॉपी किया गया नंबर भी चलता है।',
    'verify.notTold': 'जाँच क्या नहीं बताती',
    'verify.notToldBody':
      'यह पुष्टि करती है कि प्लेटफ़ॉर्म ने क्या जारी किया और क्या वह अब भी मान्य है। यह कोर्स के बाहर प्रमाणपत्र धारक की ज़मानत नहीं देती, और शिक्षार्थी के बारे में प्रमाणपत्र पर लिखे नाम के सिवा कुछ नहीं दिखाती — यहाँ लॉगिन करने के लिए कोई खाता नहीं है, और न किसी के प्रमाणपत्रों की कोई सूची।',
    'verify.home': 'AyahSpring का मुखपृष्ठ',
    'verify.notANumber':
      'यह प्रमाणपत्र नंबर जैसा नहीं लगता। नंबर ऐसे दिखते हैं {number} — अक्षर AS, वर्ष, फिर आठ अंक।',
    'verify.heading': 'प्रमाणपत्र सत्यापित करें',
    'verify.none': 'इस नंबर से कोई प्रमाणपत्र मेल नहीं खाता।',
    'verify.noneBody':
      'देखें कि लिखने में कोई गलती तो नहीं हुई। प्रमाणपत्र नंबर ऐसे दिखते हैं {number}।',
    'verify.valid': 'यह प्रमाणपत्र मान्य है।',
    'verify.validBody': 'इसे AyahSpring ने जारी किया है और यह रद्द नहीं किया गया है।',
    'verify.invalid': 'यह प्रमाणपत्र मान्य नहीं है।',
    'verify.notIssued': 'इसकी स्थिति “जारी” नहीं है।',
    'verify.holder': 'धारक',
    'verify.number': 'नंबर',
    'verify.frozen':
      'यहाँ दिखाया गया कोर्स का शीर्षक और संस्करण वही है जो प्रमाणपत्र जारी होते समय था। ये प्रमाणपत्र पर ही दर्ज हैं और बाद में बदले नहीं जा सकते।',
  },
  fr: {
    'verify.unchecked': 'Ce certificat n’a pas pu être vérifié pour le moment.',
    'verify.uncheckedBody':
      'L’erreur vient de notre côté. Cela ne veut pas dire que le certificat n’est pas valide. Réessayez dans un instant.',
    'verify.description':
      'Vérifiez un numéro de certificat AyahSpring. Aucun compte n’est nécessaire — seul le numéro est requis.',
    'verify.lede':
      'Chaque certificat AyahSpring porte un numéro. Le vérifier vous indique s’il a été délivré ici, à qui, pour quel cours, et s’il a été révoqué depuis.',
    'verify.numberLabel': 'Numéro du certificat',
    'verify.check': 'Vérifier',
    'verify.where': 'Où le trouver',
    'verify.whereBody':
      'Le numéro est imprimé sur le certificat lui-même, le plus souvent dans un coin, sous la forme {number} : les lettres AS, l’année, puis huit chiffres. Si l’on vous a envoyé un lien, le numéro se trouve à la fin — les deux mènent à la même réponse.',
    'verify.forgiving':
      'Ici, ni les majuscules, ni les espaces, ni les tirets ne comptent : un numéro copié depuis un PDF fonctionne aussi.',
    'verify.notTold': 'Ce que la vérification ne dit pas',
    'verify.notToldBody':
      'Elle confirme ce que la plateforme a délivré et si cela tient toujours. Elle ne se porte pas garante du titulaire en dehors du cours, et ne montre rien d’un apprenant au-delà du nom inscrit sur le certificat — il n’y a ici aucun compte auquel se connecter, ni aucune liste de certificats à parcourir.',
    'verify.home': 'Accueil d’AyahSpring',
    'verify.notANumber':
      'Cela ne ressemble pas à un numéro de certificat. Ils se présentent ainsi : {number} — les lettres AS, l’année, puis huit chiffres.',
    'verify.heading': 'Vérifier un certificat',
    'verify.none': 'Aucun certificat ne correspond à ce numéro.',
    'verify.noneBody':
      'Vérifiez qu’il n’y a pas d’erreur de copie. Les numéros de certificat se présentent ainsi : {number}.',
    'verify.valid': 'Ce certificat est valide.',
    'verify.validBody': 'Il a été délivré par AyahSpring et n’a pas été révoqué.',
    'verify.invalid': 'Ce certificat n’est pas valide.',
    'verify.notIssued': 'Son statut n’est pas « délivré ».',
    'verify.holder': 'Titulaire',
    'verify.number': 'Numéro',
    'verify.frozen':
      'Le titre et la version du cours affichés ici sont ceux qu’ils étaient lorsque le certificat a été délivré. Ils sont inscrits sur le certificat lui-même et ne peuvent plus être modifiés.',
  },
  es: {
    'verify.unchecked': 'Este certificado no se ha podido comprobar en este momento.',
    'verify.uncheckedBody':
      'Es un fallo nuestro. No significa que el certificado no sea válido. Inténtelo de nuevo en un momento.',
    'verify.description':
      'Verifique un número de certificado de AyahSpring. No hace falta cuenta: solo se necesita el número.',
    'verify.lede':
      'Cada certificado de AyahSpring lleva un número. Verificarlo le indica si se emitió aquí, a quién, para qué curso y si después ha sido revocado.',
    'verify.numberLabel': 'Número del certificado',
    'verify.check': 'Verificar',
    'verify.where': 'Dónde encontrarlo',
    'verify.whereBody':
      'El número está impreso en el propio certificado, normalmente en una esquina, con la forma {number}: las letras AS, el año y luego ocho cifras. Si le enviaron un enlace, el número está al final; ambos llevan a la misma respuesta.',
    'verify.forgiving':
      'Aquí no importan las mayúsculas, los espacios ni los guiones: un número copiado de un PDF también funciona.',
    'verify.notTold': 'Lo que la verificación no le dice',
    'verify.notToldBody':
      'Confirma lo que la plataforma emitió y si sigue en pie. No responde por el titular fuera del curso, y no muestra nada de un alumno más allá del nombre que figura en el certificado: aquí no hay ninguna cuenta en la que entrar ni ninguna lista de certificados de nadie que consultar.',
    'verify.home': 'Inicio de AyahSpring',
    'verify.notANumber':
      'Eso no parece un número de certificado. Tienen esta forma: {number}; las letras AS, el año y luego ocho cifras.',
    'verify.heading': 'Verificar un certificado',
    'verify.none': 'Ningún certificado coincide con ese número.',
    'verify.noneBody':
      'Compruebe que no haya un error al copiarlo. Los números de certificado tienen esta forma: {number}.',
    'verify.valid': 'Este certificado es válido.',
    'verify.validBody': 'Fue emitido por AyahSpring y no ha sido revocado.',
    'verify.invalid': 'Este certificado no es válido.',
    'verify.notIssued': 'Su estado no es «emitido».',
    'verify.holder': 'Titular',
    'verify.number': 'Número',
    'verify.frozen':
      'El título y la versión del curso que se muestran aquí son los que eran cuando se emitió el certificado. Constan en el propio certificado y no pueden cambiarse después.',
  },
  pt: {
    'verify.unchecked': 'Não foi possível verificar este certificado agora.',
    'verify.uncheckedBody':
      'A falha é do nosso lado. Não significa que o certificado não seja válido. Tente novamente daqui a pouco.',
    'verify.description':
      'Verifique um número de certificado da AyahSpring. Não é preciso conta — só o número é necessário.',
    'verify.lede':
      'Cada certificado da AyahSpring tem um número. Verificá-lo indica-lhe se foi emitido aqui, a quem, para que curso, e se entretanto foi revogado.',
    'verify.numberLabel': 'Número do certificado',
    'verify.check': 'Verificar',
    'verify.where': 'Onde o encontrar',
    'verify.whereBody':
      'O número está impresso no próprio certificado, normalmente num canto, com a forma {number}: as letras AS, o ano e depois oito algarismos. Se lhe enviaram uma ligação, o número está no fim — ambos chegam à mesma resposta.',
    'verify.forgiving':
      'Aqui não importam as maiúsculas, os espaços nem os hífenes: um número copiado de um PDF também funciona.',
    'verify.notTold': 'O que a verificação não lhe diz',
    'verify.notToldBody':
      'Confirma o que a plataforma emitiu e se ainda se mantém. Não responde pelo titular fora do curso, e não mostra nada sobre um aluno além do nome que consta no certificado — não há aqui nenhuma conta onde entrar, nem nenhuma lista de certificados de ninguém para consultar.',
    'verify.home': 'Página inicial da AyahSpring',
    'verify.notANumber':
      'Isso não parece um número de certificado. Têm esta forma: {number} — as letras AS, o ano e depois oito algarismos.',
    'verify.heading': 'Verificar um certificado',
    'verify.none': 'Nenhum certificado corresponde a esse número.',
    'verify.noneBody':
      'Verifique se não houve um erro ao copiá-lo. Os números de certificado têm esta forma: {number}.',
    'verify.valid': 'Este certificado é válido.',
    'verify.validBody': 'Foi emitido pela AyahSpring e não foi revogado.',
    'verify.invalid': 'Este certificado não é válido.',
    'verify.notIssued': 'O seu estado não é «emitido».',
    'verify.holder': 'Titular',
    'verify.number': 'Número',
    'verify.frozen':
      'O título e a versão do curso aqui mostrados são os que eram quando o certificado foi emitido. Constam do próprio certificado e não podem ser alterados depois.',
  },
  sw: {
    'verify.unchecked': 'Cheti hiki hakikuweza kukaguliwa sasa hivi.',
    'verify.uncheckedBody':
      'Hili ni kosa la upande wetu. Haimaanishi kwamba cheti si halali. Jaribu tena baada ya muda mfupi.',
    'verify.description':
      'Hakiki namba ya cheti cha AyahSpring. Akaunti haihitajiki — namba pekee ndiyo inayohitajika.',
    'verify.lede':
      'Kila cheti cha AyahSpring kina namba. Kuihakiki kunakuambia kama kilitolewa hapa, kwa nani, kwa kozi gani, na kama kimebatilishwa baadaye.',
    'verify.numberLabel': 'Namba ya cheti',
    'verify.check': 'Hakiki',
    'verify.where': 'Mahali pa kuipata',
    'verify.whereBody':
      'Namba imechapishwa kwenye cheti chenyewe, mara nyingi kwenye kona kwa umbo hili {number}: herufi AS, mwaka, kisha tarakimu nane. Ikiwa ulitumiwa kiungo, namba iko mwishoni mwake — zote mbili hufika kwenye jibu lilelile.',
    'verify.forgiving':
      'Hapa herufi kubwa au ndogo, nafasi na vistari havijalishi: namba iliyonakiliwa kutoka kwenye PDF bado inafanya kazi.',
    'verify.notTold': 'Kile ambacho uhakiki haukuambii',
    'verify.notToldBody':
      'Unathibitisha kile ambacho jukwaa lilitoa na kama bado kinasimama. Haumdhamini mwenye cheti nje ya kozi, na hauonyeshi chochote kuhusu mwanafunzi zaidi ya jina lililo kwenye cheti — hakuna akaunti ya kuingia hapa, wala orodha ya vyeti vya mtu yeyote ya kupitia.',
    'verify.home': 'Mwanzo wa AyahSpring',
    'verify.notANumber':
      'Hiyo haionekani kuwa namba ya cheti. Huwa na umbo hili {number} — herufi AS, mwaka, kisha tarakimu nane.',
    'verify.heading': 'Thibitisha cheti',
    'verify.none': 'Hakuna cheti kinacholingana na namba hiyo.',
    'verify.noneBody':
      'Angalia kama kuna kosa la kunakili. Namba za vyeti huwa na umbo hili {number}.',
    'verify.valid': 'Cheti hiki ni halali.',
    'verify.validBody': 'Kilitolewa na AyahSpring na hakijabatilishwa.',
    'verify.invalid': 'Cheti hiki si halali.',
    'verify.notIssued': 'Hali yake si “kimetolewa”.',
    'verify.holder': 'Mwenye cheti',
    'verify.number': 'Namba',
    'verify.frozen':
      'Jina la kozi na toleo vinavyoonyeshwa hapa ni vile vilivyokuwa cheti kilipotolewa. Vimeandikwa kwenye cheti chenyewe na haviwezi kubadilishwa baadaye.',
  },
  af: {
    'verify.unchecked': 'Hierdie sertifikaat kon nie nou nagegaan word nie.',
    'verify.uncheckedBody':
      'Dit is ’n fout aan ons kant. Dit beteken nie dat die sertifikaat nie geldig is nie. Probeer oor ’n oomblik weer.',
    'verify.description':
      'Kontroleer ’n AyahSpring-sertifikaatnommer. Geen rekening is nodig nie — net die nommer word vereis.',
    'verify.lede':
      'Elke AyahSpring-sertifikaat het ’n nommer. Deur dit te kontroleer, sien jy of dit hier uitgereik is, aan wie, vir watter kursus, en of dit sedertdien herroep is.',
    'verify.numberLabel': 'Sertifikaatnommer',
    'verify.check': 'Kontroleer',
    'verify.where': 'Waar om dit te kry',
    'verify.whereBody':
      'Die nommer is op die sertifikaat self gedruk, gewoonlik in ’n hoek, in die vorm {number}: die letters AS, die jaar, dan agt syfers. As ’n skakel aan jou gestuur is, is die nommer aan die einde daarvan — albei kom by dieselfde antwoord uit.',
    'verify.forgiving':
      'Hoof- en kleinletters, spasies en strepies maak hier nie saak nie: ’n nommer wat uit ’n PDF gekopieer is, werk steeds.',
    'verify.notTold': 'Wat kontrolering jou nie vertel nie',
    'verify.notToldBody':
      'Dit bevestig wat die platform uitgereik het en of dit steeds geld. Dit staan nie vir die houer in buite die kursus nie, en dit wys niks oor ’n leerder behalwe die naam op die sertifikaat nie — hier is geen rekening om by aan te meld nie, en geen lys van enigiemand se sertifikate om deur te blaai nie.',
    'verify.home': 'AyahSpring-tuisblad',
    'verify.notANumber':
      'Dit lyk nie soos ’n sertifikaatnommer nie. Hulle lyk so: {number} — die letters AS, die jaar, dan agt syfers.',
    'verify.heading': 'Verifieer ’n sertifikaat',
    'verify.none': 'Geen sertifikaat pas by daardie nommer nie.',
    'verify.noneBody':
      'Kyk of daar nie ’n oorskryffout is nie. Sertifikaatnommers lyk so: {number}.',
    'verify.valid': 'Hierdie sertifikaat is geldig.',
    'verify.validBody': 'Dit is deur AyahSpring uitgereik en is nie herroep nie.',
    'verify.invalid': 'Hierdie sertifikaat is nie geldig nie.',
    'verify.notIssued': 'Die status daarvan is nie “uitgereik” nie.',
    'verify.holder': 'Houer',
    'verify.number': 'Nommer',
    'verify.frozen':
      'Die kursustitel en weergawe wat hier gewys word, is soos dit was toe die sertifikaat uitgereik is. Dit is op die sertifikaat self aangeteken en kan nie daarna verander word nie.',
  },
  'zh-hans': {
    'verify.unchecked': '暂时无法查验这张证书。',
    'verify.uncheckedBody':
      '这是我们这边的故障，并不表示证书无效。请稍后再试。',
    'verify.description': '查验 AyahSpring 证书编号。无需账号——只需要编号。',
    'verify.lede': '每张 AyahSpring 证书都有一个编号。查验它可以知道证书是否由这里颁发、颁发给谁、对应哪门课程，以及之后是否被撤销。',
    'verify.numberLabel': '证书编号',
    'verify.check': '查验',
    'verify.where': '在哪里找到编号',
    'verify.whereBody': '编号印在证书上，通常在一角，形如 {number}：字母 AS、年份，然后是八位数字。如果你收到的是链接，编号就在链接末尾——两者得到的结果相同。',
    'verify.forgiving': '这里不区分大小写，空格和短横线也不影响：从 PDF 复制出来的编号同样可用。',
    'verify.notTold': '查验不能告诉你什么',
    'verify.notToldBody':
      '它确认平台颁发了什么，以及是否仍然有效。它不为持证人在课程之外的情况作担保，也不显示学习者除证书上姓名以外的任何信息——这里没有可登录的账号，也没有任何人的证书列表可供浏览。',
    'verify.home': 'AyahSpring 首页',
    'verify.notANumber': '这看起来不像证书编号。编号形如 {number}——字母 AS、年份，然后是八位数字。',
    'verify.heading': '验证证书',
    'verify.none': '没有与该编号相符的证书。',
    'verify.noneBody': '请检查是否抄写有误。证书编号形如 {number}。',
    'verify.valid': '这张证书有效。',
    'verify.validBody': '它由 AyahSpring 颁发，且未被撤销。',
    'verify.invalid': '这张证书无效。',
    'verify.notIssued': '它的状态不是“已颁发”。',
    'verify.holder': '持证人',
    'verify.number': '编号',
    'verify.frozen': '这里显示的课程名称和版本是证书颁发时的内容。它们记录在证书上，之后无法更改。',
  },
  'zh-hant': {
    'verify.unchecked': '暫時無法查驗這張證書。',
    'verify.uncheckedBody':
      '這是我們這邊的故障，並不表示證書無效。請稍後再試。',
    'verify.description': '查驗 AyahSpring 證書編號。無需帳號——只需要編號。',
    'verify.lede': '每張 AyahSpring 證書都有一個編號。查驗它可以知道證書是否由這裡頒發、頒發給誰、對應哪門課程，以及之後是否被撤銷。',
    'verify.numberLabel': '證書編號',
    'verify.check': '查驗',
    'verify.where': '在哪裡找到編號',
    'verify.whereBody': '編號印在證書上，通常在一角，形如 {number}：字母 AS、年份，然後是八位數字。如果你收到的是連結，編號就在連結末尾——兩者得到的結果相同。',
    'verify.forgiving': '這裡不區分大小寫，空格和短橫線也不影響：從 PDF 複製出來的編號同樣可用。',
    'verify.notTold': '查驗不能告訴你什麼',
    'verify.notToldBody':
      '它確認平台頒發了什麼，以及是否仍然有效。它不為持證人在課程之外的情況作擔保，也不顯示學習者除證書上姓名以外的任何資訊——這裡沒有可登入的帳號，也沒有任何人的證書清單可供瀏覽。',
    'verify.home': 'AyahSpring 首頁',
    'verify.notANumber': '這看起來不像證書編號。編號形如 {number}——字母 AS、年份，然後是八位數字。',
    'verify.heading': '驗證證書',
    'verify.none': '沒有與該編號相符的證書。',
    'verify.noneBody': '請檢查是否抄寫有誤。證書編號形如 {number}。',
    'verify.valid': '這張證書有效。',
    'verify.validBody': '它由 AyahSpring 頒發，且未被撤銷。',
    'verify.invalid': '這張證書無效。',
    'verify.notIssued': '它的狀態不是「已頒發」。',
    'verify.holder': '持證人',
    'verify.number': '編號',
    'verify.frozen': '這裡顯示的課程名稱和版本是證書頒發時的內容。它們記錄在證書上，之後無法更改。',
  },
  vi: {
    'verify.unchecked': 'Hiện chưa thể kiểm tra chứng chỉ này.',
    'verify.uncheckedBody':
      'Đây là lỗi từ phía chúng tôi. Điều đó không có nghĩa là chứng chỉ không hợp lệ. Hãy thử lại sau giây lát.',
    'verify.description':
      'Tra cứu số chứng chỉ AyahSpring. Không cần tài khoản — chỉ cần số chứng chỉ.',
    'verify.lede':
      'Mỗi chứng chỉ AyahSpring đều có một số. Tra cứu số đó cho bạn biết chứng chỉ có được cấp tại đây hay không, cấp cho ai, cho khóa học nào, và sau đó có bị thu hồi hay không.',
    'verify.numberLabel': 'Số chứng chỉ',
    'verify.check': 'Tra cứu',
    'verify.where': 'Tìm số ở đâu',
    'verify.whereBody':
      'Số được in ngay trên chứng chỉ, thường ở một góc, có dạng {number}: hai chữ AS, năm, rồi tám chữ số. Nếu bạn được gửi một đường liên kết thì số nằm ở cuối liên kết — cả hai đều dẫn đến cùng một kết quả.',
    'verify.forgiving':
      'Ở đây chữ hoa hay chữ thường, khoảng trắng và dấu gạch ngang đều không quan trọng: số sao chép từ tệp PDF vẫn dùng được.',
    'verify.notTold': 'Những gì việc tra cứu không cho bạn biết',
    'verify.notToldBody':
      'Nó xác nhận nền tảng đã cấp gì và điều đó còn hiệu lực hay không. Nó không bảo đảm cho người được cấp chứng chỉ ở ngoài khóa học, và không hiển thị gì về học viên ngoài tên ghi trên chứng chỉ — ở đây không có tài khoản nào để đăng nhập, và không có danh sách chứng chỉ của ai để xem.',
    'verify.home': 'Trang chủ AyahSpring',
    'verify.notANumber':
      'Đó không giống số chứng chỉ. Số có dạng {number} — hai chữ AS, năm, rồi tám chữ số.',
    'verify.heading': 'Xác minh chứng chỉ',
    'verify.none': 'Không có chứng chỉ nào khớp với số đó.',
    'verify.noneBody': 'Hãy kiểm tra xem có chép sai không. Số chứng chỉ có dạng {number}.',
    'verify.valid': 'Chứng chỉ này hợp lệ.',
    'verify.validBody': 'Chứng chỉ do AyahSpring cấp và chưa bị thu hồi.',
    'verify.invalid': 'Chứng chỉ này không hợp lệ.',
    'verify.notIssued': 'Trạng thái của nó không phải là “đã cấp”.',
    'verify.holder': 'Người được cấp',
    'verify.number': 'Số',
    'verify.frozen':
      'Tên và phiên bản khóa học hiển thị ở đây là đúng như khi chứng chỉ được cấp. Chúng được ghi trên chính chứng chỉ và không thể thay đổi về sau.',
  },
  th: {
    'verify.unchecked': 'ขณะนี้ยังตรวจสอบประกาศนียบัตรนี้ไม่ได้',
    'verify.uncheckedBody':
      'นี่เป็นข้อผิดพลาดจากฝั่งเรา ไม่ได้หมายความว่าประกาศนียบัตรใช้ไม่ได้ โปรดลองอีกครั้งในอีกสักครู่',
    'verify.description':
      'ตรวจสอบหมายเลขประกาศนียบัตรของ AyahSpring ไม่ต้องมีบัญชี — ใช้เพียงหมายเลขเท่านั้น',
    'verify.lede':
      'ประกาศนียบัตรของ AyahSpring ทุกใบมีหมายเลข การตรวจสอบหมายเลขจะบอกคุณว่าประกาศนียบัตรออกจากที่นี่หรือไม่ ออกให้ใคร สำหรับหลักสูตรใด และถูกเพิกถอนหลังจากนั้นหรือไม่',
    'verify.numberLabel': 'หมายเลขประกาศนียบัตร',
    'verify.check': 'ตรวจสอบ',
    'verify.where': 'หาหมายเลขได้ที่ใด',
    'verify.whereBody':
      'หมายเลขพิมพ์อยู่บนประกาศนียบัตร โดยมากอยู่ที่มุมหนึ่งในรูปแบบ {number}: ตัวอักษร AS ปี แล้วตามด้วยตัวเลขแปดหลัก หากคุณได้รับลิงก์ หมายเลขจะอยู่ท้ายลิงก์ — ทั้งสองทางได้คำตอบเดียวกัน',
    'verify.forgiving':
      'ที่นี่ตัวพิมพ์เล็กหรือใหญ่ ช่องว่าง และขีดกลางไม่มีผล: หมายเลขที่คัดลอกจาก PDF ก็ใช้ได้',
    'verify.notTold': 'สิ่งที่การตรวจสอบไม่ได้บอกคุณ',
    'verify.notToldBody':
      'การตรวจสอบยืนยันสิ่งที่แพลตฟอร์มออกให้และยังคงมีผลอยู่หรือไม่ ไม่ได้รับรองผู้ถือประกาศนียบัตรในเรื่องนอกหลักสูตร และไม่แสดงข้อมูลใดของผู้เรียนนอกจากชื่อบนประกาศนียบัตร — ที่นี่ไม่มีบัญชีให้เข้าสู่ระบบ และไม่มีรายการประกาศนียบัตรของใครให้เปิดดู',
    'verify.home': 'หน้าแรกของ AyahSpring',
    'verify.notANumber':
      'นั่นดูไม่เหมือนหมายเลขประกาศนียบัตร หมายเลขมีรูปแบบ {number} — ตัวอักษร AS ปี แล้วตามด้วยตัวเลขแปดหลัก',
    'verify.heading': 'ยืนยันประกาศนียบัตร',
    'verify.none': 'ไม่มีประกาศนียบัตรที่ตรงกับหมายเลขนั้น',
    'verify.noneBody': 'ตรวจดูว่าคัดลอกผิดหรือไม่ หมายเลขประกาศนียบัตรมีรูปแบบ {number}',
    'verify.valid': 'ประกาศนียบัตรนี้ใช้ได้',
    'verify.validBody': 'ออกโดย AyahSpring และไม่ได้ถูกเพิกถอน',
    'verify.invalid': 'ประกาศนียบัตรนี้ใช้ไม่ได้',
    'verify.notIssued': 'สถานะไม่ใช่ “ออกแล้ว”',
    'verify.holder': 'ผู้ถือ',
    'verify.number': 'หมายเลข',
    'verify.frozen':
      'ชื่อหลักสูตรและฉบับที่แสดงที่นี่เป็นไปตามที่เป็นอยู่เมื่อออกประกาศนียบัตร ทั้งสองอย่างบันทึกอยู่บนประกาศนียบัตรและเปลี่ยนภายหลังไม่ได้',
  },
  fil: {
    'verify.unchecked': 'Hindi masuri ang sertipikong ito sa ngayon.',
    'verify.uncheckedBody':
      'Pagkakamali ito sa aming panig. Hindi ito nangangahulugang walang bisa ang sertipiko. Subukan muli maya-maya.',
    'verify.description':
      'Tingnan ang numero ng sertipiko ng AyahSpring. Hindi kailangan ng account — ang numero lang ang kailangan.',
    'verify.lede':
      'May numero ang bawat sertipiko ng AyahSpring. Kapag tiningnan ito, malalaman mo kung dito ito ibinigay, kanino, para sa aling kurso, at kung binawi na ito pagkatapos.',
    'verify.numberLabel': 'Numero ng sertipiko',
    'verify.check': 'Tingnan',
    'verify.where': 'Saan ito makikita',
    'verify.whereBody':
      'Nakalimbag ang numero sa mismong sertipiko, kadalasan sa isang sulok sa anyong {number}: ang mga titik na AS, ang taon, at pagkatapos ay walong digit. Kung pinadalhan ka ng link, nasa dulo nito ang numero — parehong sagot ang mararating ng dalawa.',
    'verify.forgiving':
      'Hindi mahalaga rito ang malaki o maliit na titik, ang mga puwang, o ang mga gitling: gumagana pa rin ang numerong kinopya mula sa PDF.',
    'verify.notTold': 'Ang hindi sinasabi ng pagtingin',
    'verify.notToldBody':
      'Kinukumpirma nito kung ano ang ibinigay ng plataporma at kung may bisa pa ito. Hindi nito ginagarantiyahan ang may hawak sa labas ng kurso, at wala itong ipinapakita tungkol sa mag-aaral maliban sa pangalang nasa sertipiko — walang account na mapapasukan dito, at walang listahan ng sertipiko ng sinuman na matitingnan.',
    'verify.home': 'Unang pahina ng AyahSpring',
    'verify.notANumber':
      'Mukhang hindi iyan numero ng sertipiko. Ganito ang anyo nito: {number} — ang mga titik na AS, ang taon, at pagkatapos ay walong digit.',
    'verify.heading': 'I-verify ang sertipiko',
    'verify.none': 'Walang sertipikong tumutugma sa numerong iyan.',
    'verify.noneBody':
      'Tingnan kung may mali sa pagkopya. Ganito ang anyo ng numero ng sertipiko: {number}.',
    'verify.valid': 'May bisa ang sertipikong ito.',
    'verify.validBody': 'Ibinigay ito ng AyahSpring at hindi ito binawi.',
    'verify.invalid': 'Walang bisa ang sertipikong ito.',
    'verify.notIssued': 'Hindi “naibigay” ang kalagayan nito.',
    'verify.holder': 'May hawak',
    'verify.number': 'Numero',
    'verify.frozen':
      'Ang pamagat at bersyon ng kurso na ipinapakita rito ay kung ano ang mga ito noong ibinigay ang sertipiko. Nakatala ang mga ito sa mismong sertipiko at hindi na mababago pagkatapos.',
  },
  uz: {
    'verify.unchecked': 'Bu sertifikatni hozir tekshirib boʻlmadi.',
    'verify.uncheckedBody':
      'Bu bizning tomonimizdagi nosozlik. Bu sertifikat haqiqiy emas degani emas. Birozdan soʻng qayta urinib koʻring.',
    'verify.description':
      'AyahSpring sertifikati raqamini tekshiring. Hisob kerak emas — faqat raqamning oʻzi kifoya.',
    'verify.lede':
      'Har bir AyahSpring sertifikatida raqam bor. Uni tekshirish sertifikat shu yerda berilganmi, kimga, qaysi kurs uchun va keyinchalik bekor qilinganmi — shuni koʻrsatadi.',
    'verify.numberLabel': 'Sertifikat raqami',
    'verify.check': 'Tekshirish',
    'verify.where': 'Raqamni qayerdan topish mumkin',
    'verify.whereBody':
      'Raqam sertifikatning oʻzida, odatda bir burchagida shu koʻrinishda bosilgan {number}: AS harflari, yil, soʻng sakkizta raqam. Agar sizga havola yuborilgan boʻlsa, raqam uning oxirida — ikkalasi ham bir xil javobga olib boradi.',
    'verify.forgiving':
      'Bu yerda katta-kichik harflar, boʻsh joylar va chiziqchalar ahamiyatsiz: PDF fayldan nusxalangan raqam ham ishlaydi.',
    'verify.notTold': 'Tekshirish nimani aytmaydi',
    'verify.notToldBody':
      'U platforma nimani berganini va u hali ham kuchda ekanini tasdiqlaydi. U sertifikat egasiga kursdan tashqarida kafillik bermaydi va oʻquvchi haqida sertifikatdagi ismdan boshqa hech narsani koʻrsatmaydi — bu yerda kiradigan hisob ham, birovning sertifikatlari roʻyxati ham yoʻq.',
    'verify.home': 'AyahSpring bosh sahifasi',
    'verify.notANumber':
      'Bu sertifikat raqamiga oʻxshamaydi. Raqamlar shu koʻrinishda boʻladi {number} — AS harflari, yil, soʻng sakkizta raqam.',
    'verify.heading': 'Sertifikatni tasdiqlash',
    'verify.none': 'Bu raqamga mos sertifikat yoʻq.',
    'verify.noneBody':
      'Koʻchirishda xato boʻlmaganini tekshiring. Sertifikat raqamlari shu koʻrinishda boʻladi {number}.',
    'verify.valid': 'Bu sertifikat haqiqiy.',
    'verify.validBody': 'U AyahSpring tomonidan berilgan va bekor qilinmagan.',
    'verify.invalid': 'Bu sertifikat haqiqiy emas.',
    'verify.notIssued': 'Uning holati “berilgan” emas.',
    'verify.holder': 'Egasi',
    'verify.number': 'Raqam',
    'verify.frozen':
      'Bu yerda koʻrsatilgan kurs nomi va versiyasi sertifikat berilgan paytdagidek. Ular sertifikatning oʻzida qayd etilgan va keyin oʻzgartirib boʻlmaydi.',
  },
  kk: {
    'verify.unchecked': 'Бұл сертификатты дәл қазір тексеру мүмкін болмады.',
    'verify.uncheckedBody':
      'Бұл — біздің тараптағы ақау. Сертификат жарамсыз деген сөз емес. Сәлден кейін қайталап көріңіз.',
    'verify.description':
      'AyahSpring сертификатының нөмірін тексеріңіз. Аккаунт қажет емес — тек нөмірдің өзі жеткілікті.',
    'verify.lede':
      'Әр AyahSpring сертификатында нөмір бар. Оны тексеру сертификаттың осы жерде берілген-берілмегенін, кімге, қай курс үшін берілгенін және кейін күші жойылған-жойылмағанын көрсетеді.',
    'verify.numberLabel': 'Сертификат нөмірі',
    'verify.check': 'Тексеру',
    'verify.where': 'Нөмірді қайдан табуға болады',
    'verify.whereBody':
      'Нөмір сертификаттың өзінде, әдетте бір бұрышында мына түрде басылған {number}: AS әріптері, жыл, содан кейін сегіз сан. Егер сізге сілтеме жіберілген болса, нөмір оның соңында тұр — екеуі де бір жауапқа әкеледі.',
    'verify.forgiving':
      'Мұнда бас әріп пен кіші әріптің, бос орындардың және сызықшалардың маңызы жоқ: PDF файлынан көшірілген нөмір де жарайды.',
    'verify.notTold': 'Тексеру нені айтпайды',
    'verify.notToldBody':
      'Ол платформаның не бергенін және оның әлі күшінде екенін растайды. Ол сертификат иесіне курстан тыс кепілдік бермейді және оқушы туралы сертификаттағы аттан басқа ештеңе көрсетпейді — мұнда кіретін аккаунт та, біреудің сертификаттарының тізімі де жоқ.',
    'verify.home': 'AyahSpring басты беті',
    'verify.notANumber':
      'Бұл сертификат нөміріне ұқсамайды. Нөмірлер мына түрде болады {number} — AS әріптері, жыл, содан кейін сегіз сан.',
    'verify.heading': 'Сертификатты растау',
    'verify.none': 'Бұл нөмірге сәйкес сертификат жоқ.',
    'verify.noneBody':
      'Көшіру кезінде қате кетпегенін тексеріңіз. Сертификат нөмірлері мына түрде болады {number}.',
    'verify.valid': 'Бұл сертификат жарамды.',
    'verify.validBody': 'Оны AyahSpring берген және оның күші жойылмаған.',
    'verify.invalid': 'Бұл сертификат жарамсыз.',
    'verify.notIssued': 'Оның күйі «берілген» емес.',
    'verify.holder': 'Иесі',
    'verify.number': 'Нөмір',
    'verify.frozen':
      'Мұнда көрсетілген курс атауы мен нұсқасы сертификат берілген кездегідей. Олар сертификаттың өзінде жазылған және кейін өзгертуге болмайды.',
  },
  az: {
    'verify.unchecked': 'Bu sertifikatı hazırda yoxlamaq mümkün olmadı.',
    'verify.uncheckedBody':
      'Bu, bizim tərəfimizdəki nasazlıqdır. Sertifikatın etibarlı olmadığı demək deyil. Bir azdan yenidən cəhd edin.',
    'verify.description':
      'AyahSpring sertifikatının nömrəsini yoxlayın. Hesab lazım deyil — yalnız nömrə kifayətdir.',
    'verify.lede':
      'Hər AyahSpring sertifikatının nömrəsi var. Onu yoxlamaq sertifikatın burada verilib-verilmədiyini, kimə, hansı kurs üçün verildiyini və sonradan ləğv edilib-edilmədiyini göstərir.',
    'verify.numberLabel': 'Sertifikat nömrəsi',
    'verify.check': 'Yoxla',
    'verify.where': 'Nömrəni haradan tapmaq olar',
    'verify.whereBody':
      'Nömrə sertifikatın özündə, adətən bir küncündə bu şəkildə çap olunub {number}: AS hərfləri, il, sonra səkkiz rəqəm. Sizə keçid göndərilibsə, nömrə onun sonundadır — hər ikisi eyni cavaba aparır.',
    'verify.forgiving':
      'Burada böyük-kiçik hərflərin, boşluqların və tirelərin əhəmiyyəti yoxdur: PDF-dən köçürülmüş nömrə də işləyir.',
    'verify.notTold': 'Yoxlama nəyi demir',
    'verify.notToldBody':
      'O, platformanın nə verdiyini və bunun hələ də qüvvədə olub-olmadığını təsdiqləyir. O, sertifikat sahibinə kursdan kənarda zəmanət vermir və öyrənən haqqında sertifikatdakı addan başqa heç nə göstərmir — burada daxil olmaq üçün hesab da, kiminsə sertifikatlarının siyahısı da yoxdur.',
    'verify.home': 'AyahSpring ana səhifəsi',
    'verify.notANumber':
      'Bu, sertifikat nömrəsinə oxşamır. Nömrələr bu şəkildə olur {number} — AS hərfləri, il, sonra səkkiz rəqəm.',
    'verify.heading': 'Sertifikatı təsdiqlə',
    'verify.none': 'Bu nömrəyə uyğun sertifikat yoxdur.',
    'verify.noneBody':
      'Köçürərkən səhv olmadığını yoxlayın. Sertifikat nömrələri bu şəkildə olur {number}.',
    'verify.valid': 'Bu sertifikat etibarlıdır.',
    'verify.validBody': 'Onu AyahSpring verib və o ləğv edilməyib.',
    'verify.invalid': 'Bu sertifikat etibarlı deyil.',
    'verify.notIssued': 'Onun vəziyyəti “verilib” deyil.',
    'verify.holder': 'Sahibi',
    'verify.number': 'Nömrə',
    'verify.frozen':
      'Burada göstərilən kurs adı və versiyası sertifikat verilən vaxtdakı kimidir. Onlar sertifikatın özündə qeyd olunub və sonradan dəyişdirilə bilməz.',
  },
  tg: {
    'verify.unchecked': 'Ин шаҳодатномаро ҳозир тафтиш кардан муяссар нашуд.',
    'verify.uncheckedBody':
      'Ин хато аз ҷониби мост. Ин маънои онро надорад, ки шаҳодатнома эътиборнок нест. Каме баъдтар боз кӯшиш кунед.',
    'verify.description':
      'Рақами шаҳодатномаи AyahSpring-ро санҷед. Ҳисоб лозим нест — танҳо худи рақам кифоя аст.',
    'verify.lede':
      'Ҳар як шаҳодатномаи AyahSpring рақам дорад. Санҷидани он нишон медиҳад, ки оё шаҳодатнома дар ҳамин ҷо дода шудааст, ба кӣ, барои кадом курс ва оё баъдан бекор шудааст.',
    'verify.numberLabel': 'Рақами шаҳодатнома',
    'verify.check': 'Санҷидан',
    'verify.where': 'Рақамро аз куҷо ёфтан мумкин аст',
    'verify.whereBody':
      'Рақам дар худи шаҳодатнома, одатан дар як кунҷ ба ин шакл чоп шудааст {number}: ҳарфҳои AS, сол, баъд ҳашт рақам. Агар ба шумо пайванд фиристода бошанд, рақам дар охири он аст — ҳар ду ба як ҷавоб мерасонанд.',
    'verify.forgiving':
      'Дар ин ҷо ҳарфҳои калон ё хурд, фосилаҳо ва тиреҳо аҳамият надоранд: рақаме, ки аз файли PDF нусхабардорӣ шудааст, низ кор мекунад.',
    'verify.notTold': 'Санҷиш чиро намегӯяд',
    'verify.notToldBody':
      'Он тасдиқ мекунад, ки платформа чӣ додааст ва оё он ҳоло ҳам эътибор дорад. Он барои соҳиби шаҳодатнома берун аз курс кафолат намедиҳад ва дар бораи хонанда ғайр аз номи дар шаҳодатнома навишташуда чизе нишон намедиҳад — дар ин ҷо на ҳисобе барои воридшавӣ ҳаст ва на рӯйхати шаҳодатномаҳои касе.',
    'verify.home': 'Саҳифаи асосии AyahSpring',
    'verify.notANumber':
      'Ин ба рақами шаҳодатнома монанд нест. Рақамҳо ба ин шакланд {number} — ҳарфҳои AS, сол, баъд ҳашт рақам.',
    'verify.heading': 'Тасдиқи шаҳодатнома',
    'verify.none': 'Ба ин рақам ягон шаҳодатнома мувофиқ намеояд.',
    'verify.noneBody':
      'Санҷед, ки ҳангоми нусхабардорӣ хато нашуда бошад. Рақамҳои шаҳодатнома ба ин шакланд {number}.',
    'verify.valid': 'Ин шаҳодатнома эътиборнок аст.',
    'verify.validBody': 'Онро AyahSpring додааст ва он бекор нашудааст.',
    'verify.invalid': 'Ин шаҳодатнома эътиборнок нест.',
    'verify.notIssued': 'Ҳолати он «дода шудааст» нест.',
    'verify.holder': 'Соҳиб',
    'verify.number': 'Рақам',
    'verify.frozen':
      'Номи курс ва нусхаи он, ки дар ин ҷо нишон дода шудааст, ҳамон аст, ки ҳангоми дода шудани шаҳодатнома буд. Онҳо дар худи шаҳодатнома сабт шудаанд ва баъдан тағйир дода намешаванд.',
  },
  ky: {
    'verify.unchecked': 'Бул сертификатты азыр текшерүү мүмкүн болгон жок.',
    'verify.uncheckedBody':
      'Бул — биз тараптагы ката. Сертификат жараксыз дегенди билдирбейт. Бир аздан кийин кайра аракет кылыңыз.',
    'verify.description':
      'AyahSpring сертификатынын номерин текшериңиз. Аккаунт керек эмес — номердин өзү эле жетиштүү.',
    'verify.lede':
      'Ар бир AyahSpring сертификатында номер бар. Аны текшерүү сертификат ушул жерде берилгенби, кимге, кайсы курс үчүн берилгенин жана кийин жокко чыгарылганбы — ошону көрсөтөт.',
    'verify.numberLabel': 'Сертификаттын номери',
    'verify.check': 'Текшерүү',
    'verify.where': 'Номерди кайдан тапса болот',
    'verify.whereBody':
      'Номер сертификаттын өзүндө, адатта бир бурчунда мындай түрдө басылган {number}: AS тамгалары, жыл, анан сегиз сан. Эгер сизге шилтеме жөнөтүлгөн болсо, номер анын аягында турат — экөө тең бир эле жоопко алып барат.',
    'verify.forgiving':
      'Бул жерде баш тамга менен кичине тамганын, боштуктардын жана сызыкчалардын мааниси жок: PDF файлынан көчүрүлгөн номер да иштейт.',
    'verify.notTold': 'Текшерүү эмнени айтпайт',
    'verify.notToldBody':
      'Ал платформа эмнени бергенин жана анын дагы эле күчүндө экенин ырастайт. Ал сертификаттын ээсине курстан тышкары кепилдик бербейт жана окуучу тууралуу сертификаттагы аттан башка эч нерсе көрсөтпөйт — бул жерде кире турган аккаунт да, бирөөнүн сертификаттарынын тизмеси да жок.',
    'verify.home': 'AyahSpring башкы бети',
    'verify.notANumber':
      'Бул сертификаттын номерине окшобойт. Номерлер мындай түрдө болот {number} — AS тамгалары, жыл, анан сегиз сан.',
    'verify.heading': 'Сертификатты ырастоо',
    'verify.none': 'Бул номерге дал келген сертификат жок.',
    'verify.noneBody':
      'Көчүрүүдө ката кетпегенин текшериңиз. Сертификаттын номерлери мындай түрдө болот {number}.',
    'verify.valid': 'Бул сертификат жарактуу.',
    'verify.validBody': 'Аны AyahSpring берген жана ал жокко чыгарылган эмес.',
    'verify.invalid': 'Бул сертификат жараксыз.',
    'verify.notIssued': 'Анын абалы «берилген» эмес.',
    'verify.holder': 'Ээси',
    'verify.number': 'Номер',
    'verify.frozen':
      'Бул жерде көрсөтүлгөн курстун аталышы жана версиясы сертификат берилген учурдагыдай. Алар сертификаттын өзүндө жазылган жана кийин өзгөртүүгө болбойт.',
  },
  tk: {
    'verify.unchecked': 'Bu şahadatnamany häzir barlap bolmady.',
    'verify.uncheckedBody':
      'Bu biziň tarapymyzdaky näsazlyk. Şahadatnamanyň hakyky däldigini aňlatmaýar. Biraz wagtdan soň gaýtadan synanyşyň.',
    'verify.description':
      'AyahSpring şahadatnamasynyň belgisini barlaň. Hasap gerek däl — diňe belginiň özi ýeterlik.',
    'verify.lede':
      'Her AyahSpring şahadatnamasynyň belgisi bar. Ony barlamak şahadatnamanyň şu ýerde berlendigini ýa-da berilmändigini, kime, haýsy kurs üçin berlendigini we soňra ýatyrylandygyny ýa-da ýatyrylmandygyny görkezýär.',
    'verify.numberLabel': 'Şahadatnamanyň belgisi',
    'verify.check': 'Barla',
    'verify.where': 'Belgini nireden tapmaly',
    'verify.whereBody':
      'Belgi şahadatnamanyň özünde, köplenç bir burçunda şu görnüşde çap edilen {number}: AS harplary, ýyl, soňra sekiz san. Size salgy iberilen bolsa, belgi onuň soňunda — ikisi-de şol bir jogaba eltýär.',
    'verify.forgiving':
      'Bu ýerde baş we setir harplaryň, boşluklaryň we kese çyzyklaryň ähmiýeti ýok: PDF faýlyndan göçürilen belgi hem işleýär.',
    'verify.notTold': 'Barlag nämäni aýtmaýar',
    'verify.notToldBody':
      'Ol platformanyň näme berendigini we onuň henizem güýjündedigini tassyklaýar. Ol şahadatnamanyň eýesine kursdan daşarda kepil geçmeýär we okuwçy barada şahadatnamadaky atdan başga hiç zat görkezmeýär — bu ýerde girmek üçin hasap-da, kimdir biriniň şahadatnamalarynyň sanawy-da ýok.',
    'verify.home': 'AyahSpring baş sahypasy',
    'verify.notANumber':
      'Bu şahadatnamanyň belgisine meňzemeýär. Belgiler şu görnüşde bolýar {number} — AS harplary, ýyl, soňra sekiz san.',
    'verify.heading': 'Şahadatnamany tassyklamak',
    'verify.none': 'Bu belgä gabat gelýän şahadatnama ýok.',
    'verify.noneBody':
      'Göçürilende ýalňyşlyk goýberilmändigini barlaň. Şahadatnamanyň belgileri şu görnüşde bolýar {number}.',
    'verify.valid': 'Bu şahadatnama hakyky.',
    'verify.validBody': 'Ony AyahSpring berdi we ol ýatyrylmady.',
    'verify.invalid': 'Bu şahadatnama hakyky däl.',
    'verify.notIssued': 'Onuň ýagdaýy “berlen” däl.',
    'verify.holder': 'Eýesi',
    'verify.number': 'Belgi',
    'verify.frozen':
      'Bu ýerde görkezilen kursuň ady we wersiýasy şahadatnama berlen wagtyndaky ýalydyr. Olar şahadatnamanyň özünde ýazylan we soňra üýtgedip bolmaýar.',
  },
  ta: {
    'verify.unchecked': 'இந்தச் சான்றிதழை இப்போது சரிபார்க்க முடியவில்லை.',
    'verify.uncheckedBody':
      'இது எங்கள் பக்கத்தில் ஏற்பட்ட கோளாறு. சான்றிதழ் செல்லுபடியாகாது என்று இதற்குப் பொருள் இல்லை. சிறிது நேரம் கழித்து மீண்டும் முயலவும்.',
    'verify.description':
      'AyahSpring சான்றிதழ் எண்ணைச் சரிபாருங்கள். கணக்கு தேவையில்லை — எண் மட்டுமே தேவை.',
    'verify.lede':
      'ஒவ்வொரு AyahSpring சான்றிதழிலும் ஓர் எண் உள்ளது. அதைச் சரிபார்த்தால், சான்றிதழ் இங்கே வழங்கப்பட்டதா, யாருக்கு, எந்தப் பாடநெறிக்கு, பின்னர் ரத்து செய்யப்பட்டதா என்பது தெரியும்.',
    'verify.numberLabel': 'சான்றிதழ் எண்',
    'verify.check': 'சரிபார்',
    'verify.where': 'எண்ணை எங்கே காணலாம்',
    'verify.whereBody':
      'எண் சான்றிதழிலேயே அச்சிடப்பட்டுள்ளது, பெரும்பாலும் ஒரு மூலையில் இந்த வடிவில் {number}: AS என்ற எழுத்துகள், ஆண்டு, பின்னர் எட்டு இலக்கங்கள். உங்களுக்கு ஓர் இணைப்பு அனுப்பப்பட்டிருந்தால், எண் அதன் இறுதியில் இருக்கும் — இரண்டும் ஒரே பதிலுக்கே கொண்டு செல்லும்.',
    'verify.forgiving':
      'இங்கே பெரிய எழுத்து, சிறிய எழுத்து, இடைவெளிகள், கோடுகள் எதுவும் பொருட்டல்ல: PDF-இலிருந்து நகலெடுத்த எண்ணும் வேலை செய்யும்.',
    'verify.notTold': 'சரிபார்ப்பு உங்களுக்குச் சொல்லாதது',
    'verify.notToldBody':
      'தளம் எதை வழங்கியது, அது இன்னும் செல்லுபடியாகிறதா என்பதை இது உறுதிப்படுத்துகிறது. பாடநெறிக்கு வெளியே சான்றிதழ் வைத்திருப்பவருக்கு இது உத்தரவாதம் தராது; சான்றிதழில் உள்ள பெயரைத் தவிர கற்பவரைப் பற்றி எதையும் காட்டாது — இங்கே உள்நுழைய எந்தக் கணக்கும் இல்லை, யாருடைய சான்றிதழ்களின் பட்டியலும் இல்லை.',
    'verify.home': 'AyahSpring முகப்பு',
    'verify.notANumber':
      'அது சான்றிதழ் எண் போலத் தெரியவில்லை. எண்கள் இந்த வடிவில் இருக்கும் {number} — AS என்ற எழுத்துகள், ஆண்டு, பின்னர் எட்டு இலக்கங்கள்.',
    'verify.heading': 'சான்றிதழை உறுதிப்படுத்துங்கள்',
    'verify.none': 'அந்த எண்ணுக்குப் பொருந்தும் சான்றிதழ் எதுவும் இல்லை.',
    'verify.noneBody':
      'நகலெடுத்ததில் பிழை உள்ளதா என்று பாருங்கள். சான்றிதழ் எண்கள் இந்த வடிவில் இருக்கும் {number}.',
    'verify.valid': 'இந்தச் சான்றிதழ் செல்லுபடியாகும்.',
    'verify.validBody': 'இது AyahSpring வழங்கியது; ரத்து செய்யப்படவில்லை.',
    'verify.invalid': 'இந்தச் சான்றிதழ் செல்லுபடியாகாது.',
    'verify.notIssued': 'இதன் நிலை “வழங்கப்பட்டது” அல்ல.',
    'verify.holder': 'வைத்திருப்பவர்',
    'verify.number': 'எண்',
    'verify.frozen':
      'இங்கே காட்டப்படும் பாடநெறியின் தலைப்பும் பதிப்பும் சான்றிதழ் வழங்கப்பட்டபோது இருந்தவையே. அவை சான்றிதழிலேயே பதிவாகியுள்ளன; பின்னர் மாற்ற முடியாது.',
  },
  ne: {
    'verify.unchecked': 'यो प्रमाणपत्र अहिले जाँच गर्न सकिएन।',
    'verify.uncheckedBody':
      'यो हाम्रो तर्फको गडबडी हो। यसको अर्थ प्रमाणपत्र मान्य छैन भन्ने होइन। केही बेरपछि फेरि प्रयास गर्नुहोस्।',
    'verify.description':
      'AyahSpring को प्रमाणपत्र नम्बर जाँच्नुहोस्। खाता चाहिँदैन — नम्बर मात्र भए पुग्छ।',
    'verify.lede':
      'AyahSpring को हरेक प्रमाणपत्रमा एउटा नम्बर हुन्छ। त्यो जाँच्दा प्रमाणपत्र यहीँबाट जारी भएको हो कि होइन, कसलाई, कुन कोर्सका लागि, र पछि रद्द भएको छ कि छैन भन्ने थाहा हुन्छ।',
    'verify.numberLabel': 'प्रमाणपत्र नम्बर',
    'verify.check': 'जाँच्नुहोस्',
    'verify.where': 'नम्बर कहाँ भेटिन्छ',
    'verify.whereBody':
      'नम्बर प्रमाणपत्रमै छापिएको हुन्छ, प्रायः एउटा कुनामा यस्तो रूपमा {number}: अक्षर AS, वर्ष, त्यसपछि आठ अङ्क। तपाईंलाई लिङ्क पठाइएको छ भने नम्बर त्यसको अन्त्यमा हुन्छ — दुवैले एउटै जवाफमा पुर्‍याउँछन्।',
    'verify.forgiving':
      'यहाँ ठूला-साना अक्षर, खाली ठाउँ र ड्यासले केही फरक पार्दैन: PDF बाट प्रतिलिपि गरिएको नम्बरले पनि काम गर्छ।',
    'verify.notTold': 'जाँचले के भन्दैन',
    'verify.notToldBody':
      'यसले प्लेटफर्मले के जारी गर्‍यो र त्यो अझै कायम छ कि छैन भन्ने पुष्टि गर्छ। यसले कोर्सबाहिर प्रमाणपत्र धारकको जमानी बस्दैन, र प्रमाणपत्रमा लेखिएको नामबाहेक सिकारुबारे केही देखाउँदैन — यहाँ लगइन गर्ने कुनै खाता छैन, र कसैका प्रमाणपत्रको सूची पनि छैन।',
    'verify.home': 'AyahSpring को गृहपृष्ठ',
    'verify.notANumber':
      'त्यो प्रमाणपत्र नम्बरजस्तो देखिँदैन। नम्बर यस्तो हुन्छ {number} — अक्षर AS, वर्ष, त्यसपछि आठ अङ्क।',
    'verify.heading': 'प्रमाणपत्र प्रमाणित गर्नुहोस्',
    'verify.none': 'त्यो नम्बरसँग कुनै प्रमाणपत्र मिल्दैन।',
    'verify.noneBody': 'सार्दा गल्ती भएको छ कि हेर्नुहोस्। प्रमाणपत्र नम्बर यस्तो हुन्छ {number}।',
    'verify.valid': 'यो प्रमाणपत्र मान्य छ।',
    'verify.validBody': 'यो AyahSpring ले जारी गरेको हो र रद्द गरिएको छैन।',
    'verify.invalid': 'यो प्रमाणपत्र मान्य छैन।',
    'verify.notIssued': 'यसको स्थिति “जारी” होइन।',
    'verify.holder': 'धारक',
    'verify.number': 'नम्बर',
    'verify.frozen':
      'यहाँ देखाइएको कोर्सको शीर्षक र संस्करण प्रमाणपत्र जारी हुँदा जस्तो थियो त्यस्तै हो। ती प्रमाणपत्रमै अभिलेख गरिएका छन् र पछि बदल्न सकिँदैन।',
  },
};
