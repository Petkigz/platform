import type { LocaleCode } from '../locales.ts';
import { AFRICA_EAST } from './africa-east.ts';
import { AFRICA_SOUTH } from './africa-south.ts';
import { AFRICA_WEST } from './africa-west.ts';
import { AUTH } from './auth-east.ts';
import { AUTH_EXTRA } from './auth-extra.ts';
import { AUTH_SOUTH } from './auth-south.ts';
import { AUTH_WEST } from './auth-west.ts';
import { AUTH_WORLD } from './auth-world.ts';
import { SHELF_AFRICA } from './shelf-africa.ts';
import { SHELF_WORLD } from './shelf-world.ts';
import { AUTH_RESET } from './auth-reset.ts';
import { DOORS } from './doors.ts';
import { HOME_AFRICA_EAST } from './home-africa-east.ts';
import { HOME_AFRICA_SOUTH } from './home-africa-south.ts';
import { HOME_AFRICA_WEST } from './home-africa-west.ts';
import { HOME_WORLD } from './home-world.ts';
import { ASIA_AZ } from './asia-az.ts';
import { ASIA_CENTRAL } from './asia-uz.ts';
import { ASIA_KK } from './asia-kk.ts';
import { ASIA_FA_AF } from './asia-fa-af.ts';
import { ASIA_PS } from './asia-ps.ts';
import { ASIA_NE } from './asia-ne.ts';
import { ASIA_SI } from './asia-si.ts';
import { ASIA_TA } from './asia-ta.ts';
import { ASIA_TH } from './asia-th.ts';
import { ASIA_DV } from './asia-dv.ts';
import { ASIA_KY } from './asia-ky.ts';
import { ASIA_TG } from './asia-tg.ts';
import { ASIA_TK } from './asia-tk.ts';
import { ASIA_ZH_HANS } from './asia-zh-hans.ts';
import { ASIA_ZH_HANT } from './asia-zh-hant.ts';
import { ASIA_VI } from './asia-vi.ts';
import { ASIA_FIL } from './asia-fil.ts';
import { ASIA_MY } from './asia-my.ts';
import type { Messages } from './en.ts';

/**
 * Every language the interface speaks, in one place.
 *
 * **These are interface strings, not translations of the courses.** A teacher's
 * title, a lesson and a teacher's biography stay in the language their author
 * wrote them in, and the `lang`/`dir` handling in `lib/arabic.ts` is what makes
 * them read correctly inside whichever interface surrounds them.
 *
 * **Written, then counted — not promised.** Each catalogue carries what it has;
 * `coverageOf()` in `lib/i18n` measures it against `en.ts`, and the settings page
 * prints the number. A language is in the picker because this file exists, and a
 * string that is missing falls back to English rather than to a blank.
 *
 * **Placeholders travel.** `{year}`, `{language}` and `{percent}` are substituted
 * at render time and must survive translation; a test fails a catalogue that
 * drops one, because a sentence that quietly loses its number is worse than an
 * untranslated one.
 *
 * Adding a language is: a row in `locales.ts`, a block here, and the coverage
 * number takes care of itself. Nothing else in the application knows the list.
 */
/**
 * Layers, merged per language.
 *
 * The catalogues are written in groups — Africa by region, then the sign-in and
 * sign-up screens for everybody — and a language appears in more than one file.
 * A shallow spread would silently replace Amharic's frame with Amharic's auth
 * block and lose twenty-two strings, so this merges **per language**, and the
 * coverage number would be the thing that noticed if it ever stopped.
 */
function merge(
  ...parts: Array<Partial<Record<LocaleCode, Partial<Messages>>>>
): Partial<Record<LocaleCode, Partial<Messages>>> {
  const out: Partial<Record<LocaleCode, Partial<Messages>>> = {};
  for (const part of parts) {
    for (const [code, messages] of Object.entries(part)) {
      const key = code as LocaleCode;
      out[key] = { ...(out[key] ?? {}), ...messages };
    }
  }
  return out;
}

const BASE: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'skip.toContent': 'تخطَّ إلى المحتوى',
    'nav.main': 'القائمة الرئيسية',
    'nav.catalogue': 'الدورات',
    'nav.learn': 'تعلّمي',
    'nav.family': 'عائلتي',
    'nav.plans': 'الخطط',
    'nav.subscriptions': 'الاشتراكات',
    'nav.teach': 'التدريس',
    'nav.review': 'المراجعة',
    'nav.certificates': 'الشهادات',
    'footer.tagline': 'تعلّم إسلامي للأطفال والكبار في أنحاء العالم.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'عن المنصة',
    'footer.terms': 'الشروط والخصوصية',
    'footer.help': 'المساعدة',
    'footer.verify': 'التحقق من شهادة',
    'footer.area': 'صفحتك',
    'footer.notifications': 'الإشعارات',
    'action.getStarted': 'ابدأ الآن',
    'action.signIn': 'تسجيل الدخول',
    'action.signOut': 'تسجيل الخروج',
    'action.save': 'حفظ',
    'action.cancel': 'إلغاء',
    'region.africa': 'أفريقيا',
    'region.middleEast': 'الشرق الأوسط',
    'region.asia': 'آسيا',
    'region.west': 'أوروبا والأمريكتان',
    'language.title': 'اللغة',
    'language.lede':
      'تُعرض الواجهة باللغة التي تختارها هنا. يبدأ هذا المتصفح بلغة جهازك ويتبعها حتى تختار لغة أخرى.',
    'language.current': 'المعروضة الآن',
    'language.chosen': 'اخترت هذه اللغة على هذا المتصفح.',
    'language.device': 'هذه هي اللغة التي طلبها جهازك. اختر لغة أدناه لتغييرها.',
    'language.default':
      'طلب جهازك لغة لا تتوفر في هذه الواجهة بعد، لذا فهي بالإنجليزية.',
    'language.deviceOption': 'لغة جهازي',
    'language.pick': 'اعرض الواجهة باللغة',
    'language.change': 'تغيير اللغة',
    'language.saved': 'تم الحفظ. الواجهة الآن باللغة {language}.',
    'language.coverage':
      'تُرجمت {percent}% من نصوص الواجهة إلى {language}. ما لم يُترجم بعد يظهر بالإنجليزية.',
    'language.coverageAll': 'هذه اللغة مترجمة بالكامل.',
    'language.browser':
      'يُحفظ الاختيار على هذا المتصفح لا في حسابك، لذا سيسأل جهاز آخر لغته الخاصة.',
    'language.reviewed': 'قرأ هذه الترجمة متحدث أصلي للغة.',
    'language.unreviewed':
      'لم يقرأ هذه الترجمة بعد متحدث أصلي للغة. كتبها من بنوا المنصة — وإن بدت لك كلمة خطأ فذلك خطأ نتحمله نحن.',
    'language.notTranslated':
      'ترجمة الواجهة فقط. تظهر عناوين الدورات والدروس وصفحات المعلّمين والسياسات المنشورة باللغة التي كُتبت بها.',
  },

  ur: {
    'skip.toContent': 'مواد تک جائیں',
    'nav.main': 'مرکزی مینو',
    'nav.catalogue': 'کورسز',
    'nav.learn': 'میری تعلیم',
    'nav.family': 'میرا خاندان',
    'nav.plans': 'پلان',
    'nav.subscriptions': 'سبسکرپشن',
    'nav.teach': 'پڑھائیں',
    'nav.review': 'جائزہ',
    'nav.certificates': 'اسناد',
    'footer.tagline': 'دنیا بھر کے بچوں اور بڑوں کے لیے اسلامی تعلیم۔',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'تعارف',
    'footer.terms': 'شرائط و رازداری',
    'footer.help': 'مدد',
    'footer.verify': 'سند کی تصدیق کریں',
    'footer.area': 'آپ کا صفحہ',
    'footer.notifications': 'اطلاعات',
    'action.getStarted': 'شروع کریں',
    'action.signIn': 'سائن اِن',
    'action.signOut': 'سائن آؤٹ',
    'action.save': 'محفوظ کریں',
    'action.cancel': 'منسوخ',
    'region.africa': 'افریقہ',
    'region.middleEast': 'مشرقِ وسطیٰ',
    'region.asia': 'ایشیا',
    'region.west': 'یورپ اور امریکہ',
    'language.title': 'زبان',
    'language.lede':
      'انٹرفیس اُس زبان میں دکھایا جاتا ہے جو آپ یہاں منتخب کریں۔ یہ براؤزر پہلے آپ کے ڈیوائس کی زبان استعمال کرتا ہے اور آپ کے انتخاب تک اسی پر چلتا ہے۔',
    'language.current': 'ابھی دکھائی جا رہی ہے',
    'language.chosen': 'آپ نے یہ زبان اِس براؤزر پر منتخب کی ہے۔',
    'language.device': 'یہ وہ زبان ہے جو آپ کے ڈیوائس نے مانگی۔ تبدیل کرنے کے لیے نیچے سے کوئی زبان چنیں۔',
    'language.default':
      'آپ کے ڈیوائس نے ایسی زبان مانگی جو ابھی اِس انٹرفیس میں موجود نہیں، اس لیے یہ انگریزی میں ہے۔',
    'language.deviceOption': 'میرے ڈیوائس کی زبان',
    'language.pick': 'انٹرفیس اِس زبان میں دکھائیں',
    'language.change': 'زبان تبدیل کریں',
    'language.saved': 'محفوظ ہو گیا۔ انٹرفیس اب {language} میں ہے۔',
    'language.coverage':
      'انٹرفیس کے {percent}% متن {language} میں ترجمہ شدہ ہیں۔ جو باقی ہے وہ انگریزی میں دکھایا جاتا ہے۔',
    'language.coverageAll': 'یہ زبان مکمل ترجمہ شدہ ہے۔',
    'language.browser':
      'یہ انتخاب اِس براؤزر پر محفوظ ہوتا ہے، آپ کے اکاؤنٹ میں نہیں، اس لیے دوسرا ڈیوائس اپنی زبان پوچھے گا۔',
    'language.reviewed': 'اس ترجمے کو مادری زبان بولنے والے نے پڑھا ہے۔',
    'language.unreviewed':
      'ابھی تک کسی مادری زبان بولنے والے نے اس ترجمے کو نہیں پڑھا۔ یہ پلیٹ فارم بنانے والوں نے لکھا ہے — اگر کوئی لفظ آپ کو غلط لگے تو وہ ہماری غلطی ہے۔',
    'language.notTranslated':
      'صرف انٹرفیس کا ترجمہ۔ کورسز کے عنوانات، اسباق، اساتذہ کے صفحات اور شائع شدہ پالیسیاں اسی زبان میں نظر آتی ہیں جس میں لکھی گئی تھیں۔',
  },

  fa: {
    'skip.toContent': 'رفتن به محتوا',
    'nav.main': 'منوی اصلی',
    'nav.catalogue': 'دوره‌ها',
    'nav.learn': 'یادگیری من',
    'nav.family': 'خانوادهٔ من',
    'nav.plans': 'طرح‌ها',
    'nav.subscriptions': 'اشتراک‌ها',
    'nav.teach': 'آموزش',
    'nav.review': 'بازبینی',
    'nav.certificates': 'گواهی‌نامه‌ها',
    'footer.tagline': 'آموزش اسلامی برای کودکان و بزرگسالان، در سراسر جهان.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'درباره',
    'footer.terms': 'شرایط و حریم خصوصی',
    'footer.help': 'کمک',
    'footer.verify': 'بررسی گواهی‌نامه',
    'footer.area': 'صفحهٔ شما',
    'footer.notifications': 'اعلان‌ها',
    'action.getStarted': 'شروع کنید',
    'action.signIn': 'ورود',
    'action.signOut': 'خروج',
    'action.save': 'ذخیره',
    'action.cancel': 'لغو',
    'region.africa': 'آفریقا',
    'region.middleEast': 'خاورمیانه',
    'region.asia': 'آسیا',
    'region.west': 'اروپا و قاره‌های آمریکا',
    'language.title': 'زبان',
    'language.lede':
      'رابط به زبانی نمایش داده می‌شود که اینجا انتخاب می‌کنید. این مرورگر با زبان دستگاه شما آغاز می‌شود و تا زمانی که زبان دیگری انتخاب نکنید همان را دنبال می‌کند.',
    'language.current': 'در حال نمایش',
    'language.chosen': 'این زبان را در این مرورگر انتخاب کرده‌اید.',
    'language.device': 'این همان زبانی است که دستگاه شما درخواست کرده. برای تغییر، زبانی را در پایین انتخاب کنید.',
    'language.default':
      'دستگاه شما زبانی را درخواست کرده که این رابط هنوز آن را ندارد، بنابراین رابط انگلیسی است.',
    'language.deviceOption': 'زبان دستگاه من',
    'language.pick': 'نمایش رابط به زبان',
    'language.change': 'تغییر زبان',
    'language.saved': 'ذخیره شد. رابط اکنون به {language} است.',
    'language.coverage':
      '{percent}٪ از متن‌های رابط به {language} ترجمه شده‌اند. آنچه ترجمه نشده باشد به انگلیسی نمایش داده می‌شود.',
    'language.coverageAll': 'این زبان کامل ترجمه شده است.',
    'language.browser':
      'این انتخاب در همین مرورگر نگه داشته می‌شود، نه در حساب شما؛ بنابراین دستگاهی دیگر زبان خودش را می‌پرسد.',
    'language.reviewed': 'یک گویشور بومی این ترجمه را خوانده است.',
    'language.unreviewed':
      'هنوز هیچ گویشور بومی این ترجمه را نخوانده است. آن را سازندگان این سکو نوشته‌اند — اگر واژه‌ای به نظرتان نادرست آمد، آن اشتباه از ماست.',
    'language.notTranslated':
      'فقط ترجمهٔ رابط کاربری. عنوان دوره‌ها، درس‌ها، صفحه‌های مدرّسان و سیاست‌های منتشرشده به زبانی که نوشته شده‌اند نمایش داده می‌شوند.',
  },

  tr: {
    'skip.toContent': 'İçeriğe geç',
    'nav.main': 'Ana menü',
    'nav.catalogue': 'Katalog',
    'nav.learn': 'Öğrenimim',
    'nav.family': 'Ailem',
    'nav.plans': 'Planlar',
    'nav.subscriptions': 'Abonelikler',
    'nav.teach': 'Eğitim ver',
    'nav.review': 'İnceleme',
    'nav.certificates': 'Sertifikalar',
    'footer.tagline': 'Dünya çapında çocuklar ve yetişkinler için İslami eğitim.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Hakkında',
    'footer.terms': 'Koşullar ve gizlilik',
    'footer.help': 'Yardım',
    'footer.verify': 'Sertifika doğrula',
    'footer.area': 'Alanınız',
    'footer.notifications': 'Bildirimler',
    'action.getStarted': 'Başla',
    'action.signIn': 'Giriş yap',
    'action.signOut': 'Çıkış yap',
    'action.save': 'Kaydet',
    'action.cancel': 'İptal',
    'region.africa': 'Afrika',
    'region.middleEast': 'Orta Doğu',
    'region.asia': 'Asya',
    'region.west': 'Avrupa ve Amerika',
    'language.title': 'Dil',
    'language.lede':
      'Arayüz burada seçtiğiniz dilde gösterilir. Bu tarayıcı, cihazınızın istediği dille başlar ve siz bir dil seçene kadar onu izler.',
    'language.current': 'Şu anda gösterilen',
    'language.chosen': 'Bu dili bu tarayıcıda siz seçtiniz.',
    'language.device': 'Bu, cihazınızın istediği dil. Değiştirmek için aşağıdan bir dil seçin.',
    'language.default':
      'Cihazınız bu arayüzde henüz bulunmayan bir dil istedi, bu yüzden arayüz İngilizce.',
    'language.deviceOption': 'Cihazımın dili',
    'language.pick': 'Arayüzü şu dilde göster',
    'language.change': 'Dili değiştir',
    'language.saved': 'Kaydedildi. Arayüz artık {language}.',
    'language.coverage':
      'Arayüz metinlerinin %{percent} kadarı {language} diline çevrildi. Henüz çevrilmeyenler İngilizce gösterilir.',
    'language.coverageAll': 'Bu dil tamamen çevrildi.',
    'language.browser':
      'Seçim hesabınızda değil bu tarayıcıda saklanır; başka bir cihaz kendi dilini sorar.',
    'language.reviewed': 'Bu çeviriyi bir ana dili konuşuru okudu.',
    'language.unreviewed':
      'Bu çeviriyi henüz ana dili konuşuru okumadı. Platformu kuranlar yazdı — bir kelime size yanlış görünüyorsa, o hata bizim.',
    'language.notTranslated':
      'Yalnızca arayüz çevirisi. Kurs başlıkları, dersler, öğretmen sayfaları ve yayımlanmış politikalar yazıldıkları dilde görünür.',
  },

  id: {
    'skip.toContent': 'Langsung ke konten',
    'nav.main': 'Menu utama',
    'nav.catalogue': 'Katalog',
    'nav.learn': 'Pembelajaran saya',
    'nav.family': 'Keluarga saya',
    'nav.plans': 'Paket',
    'nav.subscriptions': 'Langganan',
    'nav.teach': 'Mengajar',
    'nav.review': 'Tinjauan',
    'nav.certificates': 'Sertifikat',
    'footer.tagline': 'Pembelajaran Islam untuk anak dan dewasa, di seluruh dunia.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Tentang',
    'footer.terms': 'Ketentuan dan privasi',
    'footer.help': 'Bantuan',
    'footer.verify': 'Periksa sertifikat',
    'footer.area': 'Area Anda',
    'footer.notifications': 'Notifikasi',
    'action.getStarted': 'Mulai',
    'action.signIn': 'Masuk',
    'action.signOut': 'Keluar',
    'action.save': 'Simpan',
    'action.cancel': 'Batal',
    'region.africa': 'Afrika',
    'region.middleEast': 'Timur Tengah',
    'region.asia': 'Asia',
    'region.west': 'Eropa dan Amerika',
    'language.title': 'Bahasa',
    'language.lede':
      'Antarmuka ditampilkan dalam bahasa yang Anda pilih di sini. Peramban ini dimulai dengan bahasa perangkat Anda dan mengikutinya sampai Anda memilih bahasa lain.',
    'language.current': 'Sedang ditampilkan',
    'language.chosen': 'Anda memilih bahasa ini di peramban ini.',
    'language.device': 'Ini bahasa yang diminta perangkat Anda. Pilih bahasa di bawah untuk mengubahnya.',
    'language.default':
      'Perangkat Anda meminta bahasa yang belum tersedia, sehingga antarmuka dalam bahasa Inggris.',
    'language.deviceOption': 'Bahasa perangkat saya',
    'language.pick': 'Tampilkan antarmuka dalam',
    'language.change': 'Ubah bahasa',
    'language.saved': 'Tersimpan. Antarmuka kini dalam {language}.',
    'language.coverage':
      '{percent}% teks antarmuka telah diterjemahkan ke {language}. Yang belum diterjemahkan ditampilkan dalam bahasa Inggris.',
    'language.coverageAll': 'Bahasa ini diterjemahkan sepenuhnya.',
    'language.browser':
      'Pilihan disimpan di peramban ini, bukan di akun Anda, jadi perangkat lain akan menanyakan bahasanya sendiri.',
    'language.reviewed': 'Seorang penutur asli telah membaca terjemahan ini.',
    'language.unreviewed':
      'Belum ada penutur asli yang membaca terjemahan ini. Terjemahan ini ditulis oleh orang-orang yang membangun platform — bila ada kata yang tampak keliru bagi Anda, itu kesalahan kami.',
    'language.notTranslated':
      'Hanya antarmuka yang diterjemahkan. Judul kursus, pelajaran, halaman pengajar, dan kebijakan yang diterbitkan tampil dalam bahasa saat ditulis.',
  },

  ms: {
    'skip.toContent': 'Langkau ke kandungan',
    'nav.main': 'Menu utama',
    'nav.catalogue': 'Katalog',
    'nav.learn': 'Pembelajaran saya',
    'nav.family': 'Keluarga saya',
    'nav.plans': 'Pelan',
    'nav.subscriptions': 'Langganan',
    'nav.teach': 'Mengajar',
    'nav.review': 'Semakan',
    'nav.certificates': 'Sijil',
    'footer.tagline': 'Pembelajaran Islam untuk kanak-kanak dan dewasa, di seluruh dunia.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Perihal',
    'footer.terms': 'Terma dan privasi',
    'footer.help': 'Bantuan',
    'footer.verify': 'Semak sijil',
    'footer.area': 'Ruang anda',
    'footer.notifications': 'Pemberitahuan',
    'action.getStarted': 'Mula',
    'action.signIn': 'Masuk',
    'action.signOut': 'Keluar',
    'action.save': 'Simpan',
    'action.cancel': 'Batal',
    'region.africa': 'Afrika',
    'region.middleEast': 'Timur Tengah',
    'region.asia': 'Asia',
    'region.west': 'Eropah dan Amerika',
    'language.title': 'Bahasa',
    'language.lede':
      'Antara muka dipaparkan dalam bahasa yang anda pilih di sini. Pelayar ini bermula dengan bahasa peranti anda dan mengikutinya sehingga anda memilih bahasa lain.',
    'language.current': 'Sedang dipaparkan',
    'language.chosen': 'Anda memilih bahasa ini pada pelayar ini.',
    'language.device': 'Ini bahasa yang diminta peranti anda. Pilih bahasa di bawah untuk menukarnya.',
    'language.default':
      'Peranti anda meminta bahasa yang belum tersedia, jadi antara muka dalam bahasa Inggeris.',
    'language.deviceOption': 'Bahasa peranti saya',
    'language.pick': 'Paparkan antara muka dalam',
    'language.change': 'Tukar bahasa',
    'language.saved': 'Disimpan. Antara muka kini dalam {language}.',
    'language.coverage':
      '{percent}% teks antara muka telah diterjemah ke {language}. Yang belum diterjemah dipaparkan dalam bahasa Inggeris.',
    'language.coverageAll': 'Bahasa ini diterjemah sepenuhnya.',
    'language.browser':
      'Pilihan disimpan pada pelayar ini, bukan pada akaun anda, jadi peranti lain akan menanyakan bahasanya sendiri.',
    'language.reviewed': 'Seorang penutur jati telah membaca terjemahan ini.',
    'language.unreviewed':
      'Belum ada penutur jati yang membaca terjemahan ini. Ia ditulis oleh mereka yang membina platform ini — jika ada perkataan yang kelihatan salah kepada anda, itu kesilapan kami.',
    'language.notTranslated':
      'Hanya antara muka diterjemahkan. Tajuk kursus, pelajaran, halaman pengajar dan dasar yang diterbitkan dipaparkan dalam bahasa ia ditulis.',
  },

  bn: {
    'skip.toContent': 'বিষয়বস্তুতে যান',
    'nav.main': 'প্রধান মেনু',
    'nav.catalogue': 'কোর্স তালিকা',
    'nav.learn': 'আমার শেখা',
    'nav.family': 'আমার পরিবার',
    'nav.plans': 'প্ল্যান',
    'nav.subscriptions': 'সাবস্ক্রিপশন',
    'nav.teach': 'শেখান',
    'nav.review': 'পর্যালোচনা',
    'nav.certificates': 'সনদ',
    'footer.tagline': 'বিশ্বজুড়ে শিশু ও বড়দের জন্য ইসলামি শিক্ষা।',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'পরিচিতি',
    'footer.terms': 'শর্তাবলি ও গোপনীয়তা',
    'footer.help': 'সহায়তা',
    'footer.verify': 'সনদ যাচাই করুন',
    'footer.area': 'আপনার পাতা',
    'footer.notifications': 'বিজ্ঞপ্তি',
    'action.getStarted': 'শুরু করুন',
    'action.signIn': 'সাইন ইন',
    'action.signOut': 'সাইন আউট',
    'action.save': 'সংরক্ষণ',
    'action.cancel': 'বাতিল',
    'region.africa': 'আফ্রিকা',
    'region.middleEast': 'মধ্যপ্রাচ্য',
    'region.asia': 'এশিয়া',
    'region.west': 'ইউরোপ ও আমেরিকা',
    'language.title': 'ভাষা',
    'language.lede':
      'আপনি এখানে যে ভাষা বাছেন, ইন্টারফেস সেই ভাষায় দেখানো হয়। এই ব্রাউজার আপনার ডিভাইসের ভাষা দিয়ে শুরু হয় এবং আপনি অন্য ভাষা না বাছা পর্যন্ত তা অনুসরণ করে।',
    'language.current': 'এখন দেখানো হচ্ছে',
    'language.chosen': 'আপনি এই ব্রাউজারে এই ভাষা বেছেছেন।',
    'language.device': 'এটি আপনার ডিভাইসের চাওয়া ভাষা। বদলাতে নিচে একটি ভাষা বাছুন।',
    'language.default':
      'আপনার ডিভাইস এমন ভাষা চেয়েছে যা এখনও এই ইন্টারফেসে নেই, তাই এটি ইংরেজিতে আছে।',
    'language.deviceOption': 'আমার ডিভাইসের ভাষা',
    'language.pick': 'ইন্টারফেস দেখান এই ভাষায়',
    'language.change': 'ভাষা বদলান',
    'language.saved': 'সংরক্ষিত হয়েছে। ইন্টারফেস এখন {language}-এ।',
    'language.coverage':
      'ইন্টারফেসের {percent}% লেখা {language}-এ অনূদিত। যা এখনও অনূদিত নয় তা ইংরেজিতে দেখানো হয়।',
    'language.coverageAll': 'এই ভাষা সম্পূর্ণ অনূদিত।',
    'language.browser':
      'পছন্দটি এই ব্রাউজারে রাখা হয়, আপনার অ্যাকাউন্টে নয়; তাই অন্য ডিভাইস নিজের ভাষা জিজ্ঞাসা করবে।',
    'language.reviewed': 'একজন মাতৃভাষী এই অনুবাদটি পড়েছেন।',
    'language.unreviewed':
      'এখনও কোনো মাতৃভাষী এই অনুবাদটি পড়েননি। এটি প্ল্যাটফর্মটি যাঁরা তৈরি করেছেন তাঁরাই লিখেছেন — কোনো শব্দ আপনার কাছে ভুল মনে হলে সেই ভুল আমাদের।',
    'language.notTranslated':
      'শুধু ইন্টারফেসের অনুবাদ। কোর্সের শিরোনাম, পাঠ, শিক্ষকের পাতা এবং প্রকাশিত নীতিমালা যে ভাষায় লেখা হয়েছে সেই ভাষাতেই দেখা যায়।',
  },

  hi: {
    'skip.toContent': 'सामग्री पर जाएँ',
    'nav.main': 'मुख्य मेन्यू',
    'nav.catalogue': 'कैटलॉग',
    'nav.learn': 'मेरी पढ़ाई',
    'nav.family': 'मेरा परिवार',
    'nav.plans': 'योजनाएँ',
    'nav.subscriptions': 'सदस्यताएँ',
    'nav.teach': 'पढ़ाएँ',
    'nav.review': 'समीक्षा',
    'nav.certificates': 'प्रमाणपत्र',
    'footer.tagline': 'दुनिया भर के बच्चों और बड़ों के लिए इस्लामी शिक्षा।',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'परिचय',
    'footer.terms': 'शर्तें और गोपनीयता',
    'footer.help': 'सहायता',
    'footer.verify': 'प्रमाणपत्र जाँचें',
    'footer.area': 'आपका पेज',
    'footer.notifications': 'सूचनाएँ',
    'action.getStarted': 'शुरू करें',
    'action.signIn': 'साइन इन',
    'action.signOut': 'साइन आउट',
    'action.save': 'सहेजें',
    'action.cancel': 'रद्द करें',
    'region.africa': 'अफ़्रीका',
    'region.middleEast': 'मध्य पूर्व',
    'region.asia': 'एशिया',
    'region.west': 'यूरोप और अमेरिका',
    'language.title': 'भाषा',
    'language.lede':
      'इंटरफ़ेस उस भाषा में दिखाया जाता है जो आप यहाँ चुनते हैं। यह ब्राउज़र आपके डिवाइस की भाषा से शुरू होता है और आपके चुनने तक उसी का पालन करता है।',
    'language.current': 'अभी दिखाई जा रही है',
    'language.chosen': 'आपने यह भाषा इस ब्राउज़र पर चुनी है।',
    'language.device': 'यह वह भाषा है जो आपके डिवाइस ने माँगी। बदलने के लिए नीचे कोई भाषा चुनें।',
    'language.default':
      'आपके डिवाइस ने ऐसी भाषा माँगी जो अभी इस इंटरफ़ेस में नहीं है, इसलिए यह अंग्रेज़ी में है।',
    'language.deviceOption': 'मेरे डिवाइस की भाषा',
    'language.pick': 'इंटरफ़ेस इस भाषा में दिखाएँ',
    'language.change': 'भाषा बदलें',
    'language.saved': 'सहेजा गया। इंटरफ़ेस अब {language} में है।',
    'language.coverage':
      'इंटरफ़ेस के {percent}% पाठ का {language} में अनुवाद हुआ है। जो बाकी है वह अंग्रेज़ी में दिखाया जाता है।',
    'language.coverageAll': 'यह भाषा पूरी तरह अनूदित है।',
    'language.browser':
      'चुनाव इस ब्राउज़र पर रखा जाता है, आपके खाते में नहीं; इसलिए दूसरा डिवाइस अपनी भाषा पूछेगा।',
    'language.reviewed': 'एक मातृभाषी ने इस अनुवाद को पढ़ा है।',
    'language.unreviewed':
      'अभी तक किसी मातृभाषी ने इस अनुवाद को नहीं पढ़ा है। इसे प्लेटफ़ॉर्म बनाने वालों ने लिखा है — कोई शब्द आपको ग़लत लगे तो वह ग़लती हमारी है।',
    'language.notTranslated':
      'केवल इंटरफ़ेस का अनुवाद। पाठ्यक्रम शीर्षक, पाठ, शिक्षक पृष्ठ और प्रकाशित नीतियाँ उसी भाषा में दिखती हैं जिसमें वे लिखी गई थीं।',
  },

  fr: {
    'skip.toContent': 'Aller au contenu',
    'nav.main': 'Menu principal',
    'nav.catalogue': 'Catalogue',
    'nav.learn': 'Mon apprentissage',
    'nav.family': 'Ma famille',
    'nav.plans': 'Formules',
    'nav.subscriptions': 'Abonnements',
    'nav.teach': 'Enseigner',
    'nav.review': 'Révision',
    'nav.certificates': 'Certificats',
    'footer.tagline': 'Un enseignement islamique pour les enfants et les adultes, partout dans le monde.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'À propos',
    'footer.terms': 'Conditions et confidentialité',
    'footer.help': 'Aide',
    'footer.verify': 'Vérifier un certificat',
    'footer.area': 'Votre espace',
    'footer.notifications': 'Notifications',
    'action.getStarted': 'Commencer',
    'action.signIn': 'Se connecter',
    'action.signOut': 'Se déconnecter',
    'action.save': 'Enregistrer',
    'action.cancel': 'Annuler',
    'region.africa': 'Afrique',
    'region.middleEast': 'Moyen-Orient',
    'region.asia': 'Asie',
    'region.west': 'Europe et Amériques',
    'language.title': 'Langue',
    'language.lede':
      'L’interface s’affiche dans la langue que vous choisissez ici. Ce navigateur commence par la langue demandée par votre appareil et la suit jusqu’à ce que vous en choisissiez une.',
    'language.current': 'Affichée actuellement',
    'language.chosen': 'Vous avez choisi cette langue sur ce navigateur.',
    'language.device':
      'C’est la langue demandée par votre appareil. Choisissez-en une ci-dessous pour la changer.',
    'language.default':
      'Votre appareil demande une langue que cette interface ne propose pas encore ; elle est donc en anglais.',
    'language.deviceOption': 'La langue de mon appareil',
    'language.pick': 'Afficher l’interface en',
    'language.change': 'Changer de langue',
    'language.saved': 'Enregistré. L’interface est maintenant en {language}.',
    'language.coverage':
      '{percent} % des textes de l’interface sont traduits en {language}. Ce qui n’est pas encore traduit s’affiche en anglais.',
    'language.coverageAll': 'Cette langue est entièrement traduite.',
    'language.browser':
      'Le choix est conservé sur ce navigateur, pas sur votre compte : un autre appareil demandera sa propre langue.',
    'language.reviewed': 'Un locuteur natif a relu cette traduction.',
    'language.unreviewed':
      'Aucun locuteur natif n’a encore relu cette traduction. Elle a été écrite par ceux qui ont construit la plateforme — si un mot vous paraît faux, c’est notre erreur.',
    'language.notTranslated':
      'Traduction de l’interface uniquement. Les titres de cours, les leçons, les pages des enseignants et les politiques publiées restent dans la langue où ils ont été écrits.',
  },

  es: {
    'skip.toContent': 'Saltar al contenido',
    'nav.main': 'Menú principal',
    'nav.catalogue': 'Catálogo',
    'nav.learn': 'Mi aprendizaje',
    'nav.family': 'Mi familia',
    'nav.plans': 'Planes',
    'nav.subscriptions': 'Suscripciones',
    'nav.teach': 'Enseñar',
    'nav.review': 'Revisión',
    'nav.certificates': 'Certificados',
    'footer.tagline': 'Educación islámica para niños y adultos, en todo el mundo.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Acerca de',
    'footer.terms': 'Condiciones y privacidad',
    'footer.help': 'Ayuda',
    'footer.verify': 'Verificar un certificado',
    'footer.area': 'Tu espacio',
    'footer.notifications': 'Notificaciones',
    'action.getStarted': 'Empezar',
    'action.signIn': 'Iniciar sesión',
    'action.signOut': 'Cerrar sesión',
    'action.save': 'Guardar',
    'action.cancel': 'Cancelar',
    'region.africa': 'África',
    'region.middleEast': 'Oriente Medio',
    'region.asia': 'Asia',
    'region.west': 'Europa y América',
    'language.title': 'Idioma',
    'language.lede':
      'La interfaz se muestra en el idioma que elijas aquí. Este navegador empieza con el idioma que pide tu dispositivo y lo sigue hasta que elijas uno.',
    'language.current': 'Se muestra ahora',
    'language.chosen': 'Elegiste este idioma en este navegador.',
    'language.device': 'Este es el idioma que pidió tu dispositivo. Elige uno abajo para cambiarlo.',
    'language.default':
      'Tu dispositivo pidió un idioma que esta interfaz aún no tiene, así que está en inglés.',
    'language.deviceOption': 'El idioma de mi dispositivo',
    'language.pick': 'Mostrar la interfaz en',
    'language.change': 'Cambiar idioma',
    'language.saved': 'Guardado. La interfaz está ahora en {language}.',
    'language.coverage':
      'El {percent}% de los textos de la interfaz está traducido al {language}. Lo que falta se muestra en inglés.',
    'language.coverageAll': 'Este idioma está totalmente traducido.',
    'language.browser':
      'La elección se guarda en este navegador, no en tu cuenta, así que otro dispositivo preguntará por su propio idioma.',
    'language.reviewed': 'Un hablante nativo ha revisado esta traducción.',
    'language.unreviewed':
      'Ningún hablante nativo ha revisado todavía esta traducción. La escribieron quienes construyeron la plataforma: si una palabra le parece incorrecta, el error es nuestro.',
    'language.notTranslated':
      'Solo se traduce la interfaz. Los títulos de los cursos, las lecciones, las páginas de los docentes y las políticas publicadas aparecen en el idioma en que se escribieron.',
  },

  pt: {
    'skip.toContent': 'Saltar para o conteúdo',
    'nav.main': 'Menu principal',
    'nav.catalogue': 'Catálogo',
    'nav.learn': 'A minha aprendizagem',
    'nav.family': 'A minha família',
    'nav.plans': 'Planos',
    'nav.subscriptions': 'Subscrições',
    'nav.teach': 'Ensinar',
    'nav.review': 'Revisão',
    'nav.certificates': 'Certificados',
    'footer.tagline': 'Ensino islâmico para crianças e adultos, em todo o mundo.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Sobre',
    'footer.terms': 'Termos e privacidade',
    'footer.help': 'Ajuda',
    'footer.verify': 'Verificar um certificado',
    'footer.area': 'O seu espaço',
    'footer.notifications': 'Notificações',
    'action.getStarted': 'Começar',
    'action.signIn': 'Entrar',
    'action.signOut': 'Sair',
    'action.save': 'Guardar',
    'action.cancel': 'Cancelar',
    'region.africa': 'África',
    'region.middleEast': 'Oriente Médio',
    'region.asia': 'Ásia',
    'region.west': 'Europa e Américas',
    'language.title': 'Idioma',
    'language.lede':
      'A interface é apresentada no idioma que escolher aqui. Este navegador começa com o idioma pedido pelo seu dispositivo e segue-o até escolher outro.',
    'language.current': 'A mostrar agora',
    'language.chosen': 'Escolheu este idioma neste navegador.',
    'language.device': 'Este é o idioma pedido pelo seu dispositivo. Escolha um abaixo para o alterar.',
    'language.default':
      'O seu dispositivo pediu um idioma que esta interface ainda não tem, por isso está em inglês.',
    'language.deviceOption': 'O idioma do meu dispositivo',
    'language.pick': 'Mostrar a interface em',
    'language.change': 'Alterar idioma',
    'language.saved': 'Guardado. A interface está agora em {language}.',
    'language.coverage':
      '{percent}% dos textos da interface estão traduzidos para {language}. O que falta é mostrado em inglês.',
    'language.coverageAll': 'Este idioma está totalmente traduzido.',
    'language.browser':
      'A escolha é guardada neste navegador, não na sua conta, por isso outro dispositivo perguntará pelo seu próprio idioma.',
    'language.reviewed': 'Um falante nativo revisou esta tradução.',
    'language.unreviewed':
      'Nenhum falante nativo revisou esta tradução ainda. Ela foi escrita por quem construiu a plataforma — se alguma palavra lhe parecer errada, o erro é nosso.',
    'language.notTranslated':
      'Apenas a interface é traduzida. Os títulos dos cursos, as aulas, as páginas dos professores e as políticas publicadas aparecem no idioma em que foram escritos.',
  },

  sw: {
    'skip.toContent': 'Ruka hadi maudhui',
    'nav.main': 'Menyu kuu',
    'nav.catalogue': 'Orodha ya kozi',
    'nav.learn': 'Masomo yangu',
    'nav.family': 'Familia yangu',
    'nav.plans': 'Mipango',
    'nav.subscriptions': 'Usajili',
    'nav.teach': 'Fundisha',
    'nav.review': 'Ukaguzi',
    'nav.certificates': 'Vyeti',
    'footer.tagline': 'Elimu ya Kiislamu kwa watoto na watu wazima, duniani kote.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Kuhusu',
    'footer.terms': 'Masharti na faragha',
    'footer.help': 'Msaada',
    'footer.verify': 'Hakiki cheti',
    'footer.area': 'Eneo lako',
    'footer.notifications': 'Arifa',
    'action.getStarted': 'Anza',
    'action.signIn': 'Ingia',
    'action.signOut': 'Toka',
    'action.save': 'Hifadhi',
    'action.cancel': 'Ghairi',
    'region.africa': 'Afrika',
    'region.middleEast': 'Mashariki ya Kati',
    'region.asia': 'Asia',
    'region.west': 'Ulaya na Amerika',
    'language.title': 'Lugha',
    'language.lede':
      'Kiolesura kinaonyeshwa kwa lugha unayochagua hapa. Kivinjari hiki huanza na lugha inayotakiwa na kifaa chako na kuifuata hadi uchague nyingine.',
    'language.current': 'Inaonyeshwa sasa',
    'language.chosen': 'Umechagua lugha hii kwenye kivinjari hiki.',
    'language.device':
      'Hii ni lugha iliyotakiwa na kifaa chako. Chagua lugha hapa chini kuibadilisha.',
    'language.default':
      'Kifaa chako kiliomba lugha ambayo kiolesura hiki hakina bado, kwa hiyo kiko kwa Kiingereza.',
    'language.deviceOption': 'Lugha ya kifaa changu',
    'language.pick': 'Onyesha kiolesura kwa',
    'language.change': 'Badilisha lugha',
    'language.saved': 'Imehifadhiwa. Kiolesura sasa kiko kwa {language}.',
    'language.coverage':
      'Asilimia {percent} ya maandishi ya kiolesura yametafsiriwa kwa {language}. Yasiyotafsiriwa yanaonyeshwa kwa Kiingereza.',
    'language.coverageAll': 'Lugha hii imetafsiriwa kikamilifu.',
    'language.browser':
      'Chaguo huhifadhiwa kwenye kivinjari hiki, si kwenye akaunti yako, kwa hiyo kifaa kingine kitauliza lugha yake yenyewe.',
    'language.reviewed': 'Mzungumzaji wa asili amesoma tafsiri hii.',
    'language.unreviewed':
      'Hakuna mzungumzaji wa asili aliyesoma tafsiri hii bado. Iliandikwa na waliojenga jukwaa — neno likionekana dogo kwako, kosa hilo ni letu.',
    'language.notTranslated':
      'Ni kiolesura pekee kinatafsiriwa. Majina ya kozi, masomo, kurasa za walimu na sera zilizochapishwa huonekana katika lugha zilizyoandikwa.',
  },
};

export const CATALOGUES: Partial<Record<LocaleCode, Partial<Messages>>> = merge(
  // The frame: navigation, footer, the language page.
  AFRICA_EAST,
  AFRICA_WEST,
  AFRICA_SOUTH,
  BASE,
  // The two screens a person meets before they trust the site.
  AUTH,
  AUTH_WEST,
  AUTH_SOUTH,
  AUTH_WORLD,
  // The hints, the two "or" lines, and the three confirmations.
  AUTH_EXTRA,
  // The shelf: the catalogue, its filters, its pager and the words on a card.
  SHELF_AFRICA,
  SHELF_WORLD,
  // The password screens: a reset link, and the new password after it.
  AUTH_RESET,
  // The two doors: the children's shelf and the adults' shelf.
  DOORS,
  // The front door itself, which used to be the one page in English.
  HOME_AFRICA_EAST,
  HOME_AFRICA_WEST,
  HOME_AFRICA_SOUTH,
  HOME_WORLD,
  // The Central Asian catalogues: whole files, because they were written from
  // nothing rather than added to a screen at a time.
  ASIA_CENTRAL,
  ASIA_KK,
  ASIA_AZ,
  ASIA_PS,
  ASIA_FA_AF,
  ASIA_TA,
  ASIA_NE,
  ASIA_SI,
  ASIA_TH,
  ASIA_DV,
  ASIA_KY,
  ASIA_TG,
  ASIA_TK,
  ASIA_ZH_HANS,
  ASIA_ZH_HANT,
  ASIA_VI,
  ASIA_FIL,
  ASIA_MY,
);
