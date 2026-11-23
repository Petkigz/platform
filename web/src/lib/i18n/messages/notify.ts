import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The notification centre (`app/notifications/page.tsx`): what the platform
 * tells a person inside the application, and the switches that choose it.
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts`, `reading.ts`, `restore.ts`, `phone.ts`, `merge.ts`,
 * `share.ts`, `refer.ts`, `sponsor.ts`, `orders.ts`, `billing.ts` and
 * `receipt.ts`: written for the twenty-seven languages with nothing held in
 * `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **The messages themselves are not here.** A stored notification is English
 * prose the database wrote, with an amount, a reference or somebody's reason
 * inside it, and nothing in the row says which part is which. So the page
 * says, in the reader's language, what kind of message each one is (`k…`),
 * shows the stored text beneath it marked as English, and says once that it
 * is doing so (`inEnglish`). The two reminders are different: they carry the
 * moment they are about as a value, so the page says its own sentence for
 * them (`classAt`, `renewsOn`).
 *
 * **A kind has one name in two places.** `k…` is the label beside its switch
 * and the line above a message of that kind, so it is written as something
 * that happened ("a payout did not go through") and reads as either.
 *
 * **It says where a message goes, and only that.** `lead` says these are
 * shown here and are not sent to an inbox or a phone, which is true of how
 * they are written and not of a switch: nothing that writes a notification
 * writes to the outbox.
 *
 * **What is put in comes last, after a colon**, so that no language has to
 * inflect it: a count, a date, a plan's name.
 *
 * **Nobody is given a gender**, where the language lets a sentence avoid
 * it: a recording "is added", not "the teacher adds".
 *
 * **Served to the server only.** `notify.` is in `SERVER_ONLY_PREFIXES`: the
 * two islands on the page are handed their words by the page.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const NOTIFY: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'notify.lead':
      'رسائل من المنصة تُعرض داخل التطبيق. لا تُرسَل إلى بريد ولا إلى هاتف. هذه الصفحة هي المكان الوحيد الذي تظهر فيه.',
    'notify.unread': 'تعذّرت قراءة إشعاراتك الآن. هذا لا يعني أنه لا توجد إشعارات.',
    'notify.soon': 'قريبًا',
    'notify.recent': 'الأخيرة',
    'notify.unreadCount': 'غير مقروءة: {count}',
    'notify.unreadMark': 'غير مقروءة',
    'notify.none': 'لا توجد رسائل بعد.',
    'notify.inEnglish':
      'الرسائل نفسها مكتوبة بالإنجليزية حاليًا. السطر الذي فوق كل رسالة يبيّن موضوعها.',
    'notify.classAt': 'موعد بدء الحصة: {date}',
    'notify.planNamed': 'الخطة: {name}',
    'notify.renewsOn': 'الفترة التالية تبدأ في: {date}',
    'notify.renewCancel': 'ألغِ قبل ذلك إن لم ترد أن يستمر.',
    'notify.markAll': 'اجعلها كلها مقروءة',
    'notify.marked': 'جُعلت مقروءة: {count}',
    'notify.markFailed': 'تعذّر جعلها مقروءة الآن.',
    'notify.prefsTitle': 'ما تُبلَّغ به',
    'notify.prefsBody': 'هذه المفاتيح تحدّد ما يظهر في هذه الصفحة.',
    'notify.prefsUnread': 'تعذّرت قراءة ما اخترتَه الآن. لم يتغيّر شيء.',
    'notify.sumAllOn': 'كل ما يمكنك اختياره مُشغَّل.',
    'notify.sumAllOff': 'أوقفتَ كل الرسائل الاختيارية.',
    'notify.sumOff': 'الرسائل الاختيارية الموقوفة: {count}',
    'notify.always': 'مُشغَّل دائمًا',
    'notify.notInUse': 'غير مستخدَم في هذه المنصة بعد. اختيارك محفوظ ويُطبَّق إذا شُغِّل.',
    'notify.prefLocked': 'لا يمكن إيقاف إبلاغك بأن مالًا مستحقًّا لك لم يصل.',
    'notify.prefFailed': 'لم يُحفظ هذا التغيير.',
    'notify.prefUnsure': 'لم يصل ردّ. أعد تحميل هذه الصفحة لترى هل حُفظ التغيير.',
    'notify.kPayoutPaid': 'أُرسلت إليك دفعة',
    'notify.kPayoutFailed': 'دفعة لم تتم',
    'notify.kPayoutCancelled': 'أُلغي طلب دفعة',
    'notify.kMediaFailed': 'تسجيل لك لا يمكن تشغيله',
    'notify.kClassStarting': 'حصة على وشك أن تبدأ',
    'notify.kPlanRenewing': 'خطة تتجدّد قريبًا',
    'notify.kLiveCancelled': 'أُلغيت حصة كنت ستحضرها',
    'notify.kRecordingReady': 'تسجيل حصة صار جاهزًا',
    'notify.dPayoutPaid': 'عندما يُرسَل مال مستحق لك.',
    'notify.dPayoutFailed':
      'عندما لا يتم تحويل. مُشغَّل دائمًا: بهذا تعرف، وإصلاحه في الغالب بيدك.',
    'notify.dPayoutCancelled':
      'عندما تُسحب دفعة قبل إرسالها. مُشغَّل دائمًا، للسبب نفسه كما في الفشل.',
    'notify.dMediaFailed':
      'عندما يتعذّر تجهيز ملف رفعتَه للتشغيل. إيقاف هذا يعني أن تعرف ذلك من أحد المتعلّمين. وهو لا يؤثّر في إصلاح الملف.',
    'notify.dClassStarting': 'تذكير بحصة مباشرة في دورة أنت فيها أو أحد أطفالك.',
    'notify.dPlanRenewing': 'قبل تجدّد الاشتراك بثلاثة أيام، ليمكن الإلغاء في الوقت المناسب.',
    'notify.dLiveCancelled':
      'عندما تُلغى حصة مباشرة فيها تسجيل لك أو لأحد أطفالك، مع السبب. إيقاف هذا يعني أن تعرف ذلك عند فتح الغرفة. الحصة تبقى تقول إنها أُلغيت ولماذا.',
    'notify.dRecordingReady':
      'عندما يُضاف تسجيل لحصة كنت فيها أنت أو أحد أطفالك. إيقاف هذا يعني أن تعرف ذلك عند فتح صفحة الحصة. التسجيل يبقى موجودًا، وتمكن مشاهدته ما دام تسجيلك في الدورة قائمًا.',
  },
  ur: {
    'notify.lead':
      'پلیٹ فارم کے پیغامات، جو ایپلیکیشن کے اندر دکھائے جاتے ہیں۔ یہ کسی ان باکس یا فون پر نہیں بھیجے جاتے۔ یہ صفحہ واحد جگہ ہے جہاں یہ نظر آتے ہیں۔',
    'notify.unread':
      'آپ کی اطلاعات ابھی پڑھی نہیں جا سکیں۔ اس کا مطلب یہ نہیں کہ کوئی اطلاع نہیں ہے۔',
    'notify.soon': 'آنے والا',
    'notify.recent': 'حالیہ',
    'notify.unreadCount': 'بغیر پڑھے: {count}',
    'notify.unreadMark': 'بغیر پڑھا',
    'notify.none': 'ابھی کوئی پیغام نہیں۔',
    'notify.inEnglish':
      'پیغامات خود فی الحال انگریزی میں لکھے ہیں۔ ہر پیغام کے اوپر کی سطر بتاتی ہے کہ وہ کس بارے میں ہے۔',
    'notify.classAt': 'کلاس شروع ہونے کا وقت: {date}',
    'notify.planNamed': 'پلان: {name}',
    'notify.renewsOn': 'اگلی مدت شروع ہوگی: {date}',
    'notify.renewCancel': 'اگر آپ نہیں چاہتے کہ یہ جاری رہے تو اس سے پہلے منسوخ کر دیں۔',
    'notify.markAll': 'سب کو پڑھا ہوا نشان زد کریں',
    'notify.marked': 'پڑھا ہوا نشان زد ہوئے: {count}',
    'notify.markFailed': 'انہیں ابھی پڑھا ہوا نشان زد نہیں کیا جا سکا۔',
    'notify.prefsTitle': 'آپ کو کیا بتایا جاتا ہے',
    'notify.prefsBody': 'یہ سوئچ طے کرتے ہیں کہ اس صفحے پر کیا نظر آئے۔',
    'notify.prefsUnread': 'آپ کا انتخاب ابھی پڑھا نہیں جا سکا۔ کچھ تبدیل نہیں ہوا۔',
    'notify.sumAllOn': 'جو کچھ آپ چن سکتے ہیں وہ سب چالو ہے۔',
    'notify.sumAllOff': 'آپ نے ہر اختیاری پیغام بند کر دیا ہے۔',
    'notify.sumOff': 'بند کیے گئے اختیاری پیغامات: {count}',
    'notify.always': 'ہمیشہ چالو',
    'notify.notInUse':
      'اس پلیٹ فارم پر ابھی استعمال میں نہیں۔ آپ کا انتخاب محفوظ ہے اور اس کے چالو ہونے پر لاگو ہوگا۔',
    'notify.prefLocked': 'یہ بتایا جانا بند نہیں کیا جا سکتا کہ آپ کی واجب الادا رقم نہیں پہنچی۔',
    'notify.prefFailed': 'یہ تبدیلی محفوظ نہیں ہوئی۔',
    'notify.prefUnsure':
      'کوئی جواب نہیں آیا۔ یہ دیکھنے کے لیے کہ تبدیلی محفوظ ہوئی یا نہیں، یہ صفحہ دوبارہ لوڈ کریں۔',
    'notify.kPayoutPaid': 'آپ کو ایک ادائیگی بھیجی گئی',
    'notify.kPayoutFailed': 'ایک ادائیگی مکمل نہیں ہوئی',
    'notify.kPayoutCancelled': 'ادائیگی کی ایک درخواست منسوخ ہوئی',
    'notify.kMediaFailed': 'آپ کی ایک ریکارڈنگ نہیں چلے گی',
    'notify.kClassStarting': 'ایک کلاس شروع ہونے والی ہے',
    'notify.kPlanRenewing': 'ایک پلان کی جلد تجدید ہوگی',
    'notify.kLiveCancelled': 'جس کلاس میں آپ جانے والے تھے وہ منسوخ ہوئی',
    'notify.kRecordingReady': 'ایک کلاس کی ریکارڈنگ تیار ہے',
    'notify.dPayoutPaid': 'جب آپ کی واجب الادا رقم بھیج دی جائے۔',
    'notify.dPayoutFailed':
      'جب کوئی منتقلی مکمل نہ ہو۔ ہمیشہ چالو: اسی سے آپ کو پتا چلتا ہے، اور اسے ٹھیک کرنا عموماً آپ کے ہاتھ میں ہوتا ہے۔',
    'notify.dPayoutCancelled':
      'جب کوئی ادائیگی بھیجے جانے سے پہلے واپس لے لی جائے۔ ہمیشہ چالو، اسی وجہ سے جس وجہ سے ناکامی کی اطلاع۔',
    'notify.dMediaFailed':
      'جب کوئی اپ لوڈ چلانے کے لیے تیار نہ ہو سکے۔ اسے بند کرنے کا مطلب ہے کہ آپ کو یہ کسی طالبِ علم سے پتا چلے گا۔ اس سے فائل کے ٹھیک ہونے پر کوئی اثر نہیں پڑتا۔',
    'notify.dClassStarting':
      'اس کورس کی براہِ راست کلاس کی یاددہانی جس میں آپ یا آپ کا کوئی بچہ ہے۔',
    'notify.dPlanRenewing': 'سبسکرپشن کی تجدید سے تین دن پہلے، تاکہ وقت پر منسوخ کرنا ممکن ہو۔',
    'notify.dLiveCancelled':
      'جب وہ براہِ راست کلاس منسوخ ہو جس میں آپ یا آپ کا کوئی بچہ داخل تھا، وجہ کے ساتھ۔ اسے بند کرنے کا مطلب ہے کہ آپ کو یہ کمرہ کھولنے پر پتا چلے گا۔ کلاس پھر بھی بتاتی ہے کہ وہ منسوخ ہوئی اور کیوں۔',
    'notify.dRecordingReady':
      'جب اس کلاس کی ریکارڈنگ شامل کی جائے جس میں آپ یا آپ کا کوئی بچہ تھا۔ اسے بند کرنے کا مطلب ہے کہ آپ کو یہ کلاس کا صفحہ کھولنے پر پتا چلے گا۔ ریکارڈنگ پھر بھی وہیں رہتی ہے، اور جب تک آپ کا داخلہ برقرار ہے دیکھی جا سکتی ہے۔',
  },
  fa: {
    'notify.lead':
      'پیام‌های سکو که درون برنامه نشان داده می‌شوند. به هیچ صندوق نامه یا تلفنی فرستاده نمی‌شوند. این صفحه تنها جایی است که دیده می‌شوند.',
    'notify.unread': 'اعلان‌های شما اکنون خوانده نشد. این به معنای آن نیست که اعلانی ندارید.',
    'notify.soon': 'در پیش',
    'notify.recent': 'اخیر',
    'notify.unreadCount': 'خوانده‌نشده: {count}',
    'notify.unreadMark': 'خوانده‌نشده',
    'notify.none': 'هنوز پیامی نیست.',
    'notify.inEnglish':
      'خود پیام‌ها فعلاً به انگلیسی نوشته شده‌اند. سطر بالای هر پیام می‌گوید درباره چیست.',
    'notify.classAt': 'زمان شروع کلاس: {date}',
    'notify.planNamed': 'طرح: {name}',
    'notify.renewsOn': 'دوره بعدی شروع می‌شود در: {date}',
    'notify.renewCancel': 'اگر نمی‌خواهید ادامه یابد، پیش از آن لغو کنید.',
    'notify.markAll': 'همه را خوانده‌شده علامت بزن',
    'notify.marked': 'خوانده‌شده علامت خورد: {count}',
    'notify.markFailed': 'اکنون نشد آن‌ها را خوانده‌شده علامت زد.',
    'notify.prefsTitle': 'آنچه به شما گفته می‌شود',
    'notify.prefsBody': 'این کلیدها تعیین می‌کنند چه چیزی در این صفحه دیده شود.',
    'notify.prefsUnread': 'آنچه انتخاب کرده‌اید اکنون خوانده نشد. چیزی تغییر نکرد.',
    'notify.sumAllOn': 'هر چه می‌توانید انتخاب کنید روشن است.',
    'notify.sumAllOff': 'همه پیام‌های اختیاری را خاموش کرده‌اید.',
    'notify.sumOff': 'پیام‌های اختیاری خاموش‌شده: {count}',
    'notify.always': 'همیشه روشن',
    'notify.notInUse':
      'هنوز در این سکو به کار نمی‌رود. انتخاب شما ذخیره شده و اگر روشن شود اعمال می‌شود.',
    'notify.prefLocked':
      'نمی‌توان خاموش کرد که به شما گفته شود پولی که به شما بدهکاریم نرسیده است.',
    'notify.prefFailed': 'این تغییر ذخیره نشد.',
    'notify.prefUnsure':
      'پاسخی نیامد. این صفحه را دوباره بار کنید تا ببینید تغییر ذخیره شده است یا نه.',
    'notify.kPayoutPaid': 'پرداختی برای شما فرستاده شد',
    'notify.kPayoutFailed': 'یک پرداخت انجام نشد',
    'notify.kPayoutCancelled': 'یک درخواست پرداخت لغو شد',
    'notify.kMediaFailed': 'یکی از ضبط‌های شما پخش نمی‌شود',
    'notify.kClassStarting': 'کلاسی در آستانه شروع است',
    'notify.kPlanRenewing': 'طرحی به‌زودی تمدید می‌شود',
    'notify.kLiveCancelled': 'کلاسی که قرار بود در آن باشید لغو شد',
    'notify.kRecordingReady': 'ضبط یک کلاس آماده است',
    'notify.dPayoutPaid': 'وقتی پولی که به شما بدهکاریم فرستاده شده باشد.',
    'notify.dPayoutFailed':
      'وقتی انتقالی انجام نشود. همیشه روشن: از همین راه باخبر می‌شوید، و درست کردنش معمولاً با خود شماست.',
    'notify.dPayoutCancelled':
      'وقتی پرداختی پیش از فرستادن پس گرفته شود. همیشه روشن، به همان دلیلِ ناموفق شدن.',
    'notify.dMediaFailed':
      'وقتی فایلی که بارگذاری شده برای پخش آماده نشود. خاموش کردن این یعنی از یک یادگیرنده باخبر می‌شوید. بر درست شدن فایل اثری ندارد.',
    'notify.dClassStarting':
      'یادآوری برای کلاس زنده در دوره‌ای که شما یا یکی از کودکانتان در آن هستید.',
    'notify.dPlanRenewing': 'سه روز پیش از تمدید اشتراک، تا لغو به‌موقع ممکن باشد.',
    'notify.dLiveCancelled':
      'وقتی کلاس زنده‌ای که شما یا یکی از کودکانتان در آن ثبت‌نام بودید لغو شود، همراه با دلیل. خاموش کردن این یعنی با باز کردن اتاق باخبر می‌شوید. کلاس همچنان می‌گوید که لغو شده و چرا.',
    'notify.dRecordingReady':
      'وقتی ضبطی برای کلاسی افزوده شود که شما یا یکی از کودکانتان در آن بودید. خاموش کردن این یعنی با باز کردن صفحه کلاس باخبر می‌شوید. ضبط همچنان آنجاست، و تا وقتی ثبت‌نام شما برقرار است می‌توان آن را دید.',
  },
  'fa-af': {
    'notify.lead':
      'پیام‌های پلتفورم که درون برنامه نشان داده می‌شوند. به هیچ صندوق نامه یا تیلفونی فرستاده نمی‌شوند. این صفحه یگانه جایی است که دیده می‌شوند.',
    'notify.unread': 'اطلاعیه‌های شما فعلاً خوانده نشد. این به آن معنا نیست که اطلاعیه‌ای ندارید.',
    'notify.soon': 'در پیش',
    'notify.recent': 'تازه',
    'notify.unreadCount': 'ناخوانده: {count}',
    'notify.unreadMark': 'ناخوانده',
    'notify.none': 'هنوز پیامی نیست.',
    'notify.inEnglish':
      'خود پیام‌ها فعلاً به انگلیسی نوشته شده‌اند. سطر بالای هر پیام می‌گوید درباره چیست.',
    'notify.classAt': 'وقت شروع صنف: {date}',
    'notify.planNamed': 'پلان: {name}',
    'notify.renewsOn': 'دوره بعدی شروع می‌شود در: {date}',
    'notify.renewCancel': 'اگر نمی‌خواهید ادامه یابد، پیش از آن لغو کنید.',
    'notify.markAll': 'همه را خوانده‌شده نشانی کن',
    'notify.marked': 'خوانده‌شده نشانی شد: {count}',
    'notify.markFailed': 'فعلاً نشد آن‌ها را خوانده‌شده نشانی کرد.',
    'notify.prefsTitle': 'آنچه به شما گفته می‌شود',
    'notify.prefsBody': 'این کلیدها تعیین می‌کنند چه چیزی در این صفحه دیده شود.',
    'notify.prefsUnread': 'آنچه انتخاب کرده‌اید فعلاً خوانده نشد. چیزی تغییر نکرد.',
    'notify.sumAllOn': 'هر چه می‌توانید انتخاب کنید روشن است.',
    'notify.sumAllOff': 'همه پیام‌های اختیاری را خاموش کرده‌اید.',
    'notify.sumOff': 'پیام‌های اختیاری خاموش‌شده: {count}',
    'notify.always': 'همیشه روشن',
    'notify.notInUse':
      'هنوز در این پلتفورم استفاده نمی‌شود. انتخاب شما ثبت شده و اگر روشن شود تطبیق می‌شود.',
    'notify.prefLocked': 'نمی‌توان خاموش کرد که به شما گفته شود پولی که از شماست نرسیده است.',
    'notify.prefFailed': 'این تغییر ثبت نشد.',
    'notify.prefUnsure':
      'جوابی نیامد. این صفحه را دوباره باز کنید تا ببینید تغییر ثبت شده است یا نه.',
    'notify.kPayoutPaid': 'پرداختی برای شما فرستاده شد',
    'notify.kPayoutFailed': 'یک پرداخت انجام نشد',
    'notify.kPayoutCancelled': 'یک درخواست پرداخت لغو شد',
    'notify.kMediaFailed': 'یکی از ثبت‌های شما پخش نمی‌شود',
    'notify.kClassStarting': 'صنفی در آستانه شروع است',
    'notify.kPlanRenewing': 'پلانی به‌زودی تمدید می‌شود',
    'notify.kLiveCancelled': 'صنفی که قرار بود در آن باشید لغو شد',
    'notify.kRecordingReady': 'ثبت یک صنف آماده است',
    'notify.dPayoutPaid': 'وقتی پولی که از شماست فرستاده شده باشد.',
    'notify.dPayoutFailed':
      'وقتی انتقالی انجام نشود. همیشه روشن: از همین راه خبر می‌شوید، و درست کردنش معمولاً به دست خود شماست.',
    'notify.dPayoutCancelled':
      'وقتی پرداختی پیش از فرستادن پس گرفته شود. همیشه روشن، به همان دلیلِ ناکام شدن.',
    'notify.dMediaFailed':
      'وقتی فایلی که بارگذاری شده برای پخش آماده نشود. خاموش کردن این یعنی از یک شاگرد خبر می‌شوید. بر درست شدن فایل اثری ندارد.',
    'notify.dClassStarting':
      'یادآوری برای صنف زنده در دوره‌ای که شما یا یکی از اطفالتان در آن هستید.',
    'notify.dPlanRenewing': 'سه روز پیش از تمدید اشتراک، تا لغو به‌وقت ممکن باشد.',
    'notify.dLiveCancelled':
      'وقتی صنف زنده‌ای که شما یا یکی از اطفالتان در آن شامل بودید لغو شود، همراه با دلیل. خاموش کردن این یعنی با باز کردن اتاق خبر می‌شوید. صنف همچنان می‌گوید که لغو شده و چرا.',
    'notify.dRecordingReady':
      'وقتی ثبتی برای صنفی افزوده شود که شما یا یکی از اطفالتان در آن بودید. خاموش کردن این یعنی با باز کردن صفحه صنف خبر می‌شوید. ثبت همچنان آنجاست، و تا وقتی شمولیت شما برقرار است می‌توان آن را دید.',
  },
  tr: {
    'notify.lead':
      'Platformdan gelen, uygulamanın içinde gösterilen mesajlar. Bir gelen kutusuna ya da telefona gönderilmezler. Göründükleri tek yer bu sayfadır.',
    'notify.unread':
      'Bildirimleriniz şu anda okunamadı. Bu, hiç bildiriminiz olmadığı anlamına gelmez.',
    'notify.soon': 'Yaklaşanlar',
    'notify.recent': 'Son gelenler',
    'notify.unreadCount': 'Okunmamış: {count}',
    'notify.unreadMark': 'Okunmamış',
    'notify.none': 'Henüz mesaj yok.',
    'notify.inEnglish':
      'Mesajların kendisi şimdilik İngilizce yazılıyor. Her birinin üstündeki satır neyle ilgili olduğunu söyler.',
    'notify.classAt': 'Dersin başlama zamanı: {date}',
    'notify.planNamed': 'Planın adı: {name}',
    'notify.renewsOn': 'Sonraki dönemin başlangıcı: {date}',
    'notify.renewCancel': 'Devam etmesini istemiyorsanız o tarihten önce iptal edin.',
    'notify.markAll': 'Tümünü okundu olarak işaretle',
    'notify.marked': 'Okundu olarak işaretlenen: {count}',
    'notify.markFailed': 'Şu anda okundu olarak işaretlenemediler.',
    'notify.prefsTitle': 'Size neler bildirilir',
    'notify.prefsBody': 'Bu anahtarlar bu sayfada nelerin görüneceğini belirler.',
    'notify.prefsUnread': 'Seçtikleriniz şu anda okunamadı. Hiçbir şey değişmedi.',
    'notify.sumAllOn': 'Seçebileceğiniz her şey açık.',
    'notify.sumAllOff': 'İsteğe bağlı bütün mesajları kapattınız.',
    'notify.sumOff': 'Kapatılan isteğe bağlı mesajlar: {count}',
    'notify.always': 'Her zaman açık',
    'notify.notInUse':
      'Bu platformda henüz kullanılmıyor. Seçiminiz kaydedildi ve açılırsa geçerli olur.',
    'notify.prefLocked': 'Size borçlu olunan paranın ulaşmadığının bildirilmesi kapatılamaz.',
    'notify.prefFailed': 'Bu değişiklik kaydedilmedi.',
    'notify.prefUnsure':
      'Yanıt gelmedi. Değişikliğin kaydedilip kaydedilmediğini görmek için bu sayfayı yeniden yükleyin.',
    'notify.kPayoutPaid': 'Size bir ödeme gönderildi',
    'notify.kPayoutFailed': 'Bir ödeme gerçekleşmedi',
    'notify.kPayoutCancelled': 'Bir ödeme talebi iptal edildi',
    'notify.kMediaFailed': 'Bir kaydınız oynatılamayacak',
    'notify.kClassStarting': 'Bir ders başlamak üzere',
    'notify.kPlanRenewing': 'Bir plan yakında yenileniyor',
    'notify.kLiveCancelled': 'Katılacağınız bir ders iptal edildi',
    'notify.kRecordingReady': 'Bir dersin kaydı hazır',
    'notify.dPayoutPaid': 'Size borçlu olunan para gönderildiğinde.',
    'notify.dPayoutFailed':
      'Bir aktarım gerçekleşmediğinde. Her zaman açık: bunu böyle öğrenirsiniz ve düzeltmek çoğu zaman sizin elinizdedir.',
    'notify.dPayoutCancelled':
      'Bir ödeme gönderilmeden önce geri çekildiğinde. Başarısızlıkla aynı nedenle her zaman açık.',
    'notify.dMediaFailed':
      'Bir yükleme oynatılmaya hazırlanamadığında. Bunu kapatmak, durumu bir öğrenciden öğrenmek demektir. Dosyanın düzeltilip düzeltilmemesini etkilemez.',
    'notify.dClassStarting':
      'Sizin ya da bir çocuğunuzun bulunduğu bir kurstaki canlı ders için hatırlatma.',
    'notify.dPlanRenewing':
      'Bir abonelik yenilenmeden üç gün önce; böylece zamanında iptal etmek mümkün olur.',
    'notify.dLiveCancelled':
      'Sizin ya da bir çocuğunuzun kayıtlı olduğu canlı bir ders iptal edildiğinde, nedeniyle birlikte. Bunu kapatmak, durumu odayı açınca öğrenmek demektir. Ders yine de iptal edildiğini ve nedenini söyler.',
    'notify.dRecordingReady':
      'Sizin ya da bir çocuğunuzun bulunduğu bir derse kayıt eklendiğinde. Bunu kapatmak, durumu ders sayfasını açınca öğrenmek demektir. Kayıt yine oradadır ve kurs kaydınız sürdükçe izlenebilir.',
  },
  id: {
    'notify.lead':
      'Pesan dari platform, yang ditampilkan di dalam aplikasi. Pesan ini tidak dikirim ke kotak masuk atau ke telepon. Halaman ini satu-satunya tempat pesan itu muncul.',
    'notify.unread':
      'Notifikasi Anda tidak dapat dibaca saat ini. Itu tidak berarti tidak ada notifikasi.',
    'notify.soon': 'Akan datang',
    'notify.recent': 'Terbaru',
    'notify.unreadCount': 'Belum dibaca: {count}',
    'notify.unreadMark': 'Belum dibaca',
    'notify.none': 'Belum ada pesan.',
    'notify.inEnglish':
      'Pesannya sendiri untuk saat ini ditulis dalam bahasa Inggris. Baris di atas setiap pesan menyebutkan isinya tentang apa.',
    'notify.classAt': 'Kelas dimulai pada: {date}',
    'notify.planNamed': 'Paket: {name}',
    'notify.renewsOn': 'Periode berikutnya dimulai pada: {date}',
    'notify.renewCancel': 'Batalkan sebelum itu jika Anda tidak ingin paket ini berlanjut.',
    'notify.markAll': 'Tandai semua sudah dibaca',
    'notify.marked': 'Ditandai sudah dibaca: {count}',
    'notify.markFailed': 'Pesan-pesan itu tidak dapat ditandai sudah dibaca saat ini.',
    'notify.prefsTitle': 'Apa yang diberitahukan kepada Anda',
    'notify.prefsBody': 'Sakelar ini menentukan apa yang muncul di halaman ini.',
    'notify.prefsUnread': 'Pilihan Anda tidak dapat dibaca saat ini. Tidak ada yang diubah.',
    'notify.sumAllOn': 'Semua yang dapat Anda pilih menyala.',
    'notify.sumAllOff': 'Anda telah mematikan semua pesan opsional.',
    'notify.sumOff': 'Pesan opsional yang dimatikan: {count}',
    'notify.always': 'Selalu menyala',
    'notify.notInUse':
      'Belum dipakai di platform ini. Pilihan Anda disimpan dan berlaku jika fitur ini dinyalakan.',
    'notify.prefLocked':
      'Pemberitahuan bahwa uang yang menjadi hak Anda tidak sampai tidak dapat dimatikan.',
    'notify.prefFailed': 'Perubahan itu tidak disimpan.',
    'notify.prefUnsure':
      'Tidak ada jawaban yang kembali. Muat ulang halaman ini untuk melihat apakah perubahan itu tersimpan.',
    'notify.kPayoutPaid': 'Pencairan dikirim kepada Anda',
    'notify.kPayoutFailed': 'Sebuah pencairan tidak berhasil',
    'notify.kPayoutCancelled': 'Permintaan pencairan dibatalkan',
    'notify.kMediaFailed': 'Sebuah rekaman Anda tidak akan dapat diputar',
    'notify.kClassStarting': 'Sebuah kelas akan segera dimulai',
    'notify.kPlanRenewing': 'Sebuah paket segera diperpanjang',
    'notify.kLiveCancelled': 'Kelas yang akan Anda ikuti dibatalkan',
    'notify.kRecordingReady': 'Rekaman sebuah kelas sudah siap',
    'notify.dPayoutPaid': 'Ketika uang yang menjadi hak Anda telah dikirim.',
    'notify.dPayoutFailed':
      'Ketika sebuah transfer tidak berhasil. Selalu menyala: begitulah Anda mengetahuinya, dan memperbaikinya biasanya ada di tangan Anda.',
    'notify.dPayoutCancelled':
      'Ketika sebuah pencairan ditarik sebelum dikirim. Selalu menyala, dengan alasan yang sama seperti kegagalan.',
    'notify.dMediaFailed':
      'Ketika sebuah unggahan tidak dapat disiapkan untuk diputar. Mematikan ini berarti Anda mengetahuinya dari seorang pelajar. Ini tidak memengaruhi diperbaiki atau tidaknya berkas itu.',
    'notify.dClassStarting':
      'Pengingat untuk kelas langsung dalam kursus yang diikuti Anda atau anak Anda.',
    'notify.dPlanRenewing':
      'Tiga hari sebelum langganan diperpanjang, agar masih sempat membatalkan.',
    'notify.dLiveCancelled':
      'Ketika kelas langsung yang diikuti Anda atau anak Anda dibatalkan, beserta alasannya. Mematikan ini berarti Anda mengetahuinya saat membuka ruang kelas. Kelas itu tetap menyatakan bahwa ia dibatalkan, dan mengapa.',
    'notify.dRecordingReady':
      'Ketika rekaman ditambahkan untuk kelas yang diikuti Anda atau anak Anda. Mematikan ini berarti Anda mengetahuinya saat membuka halaman kelas. Rekaman itu tetap ada, dan tetap dapat ditonton selama pendaftaran Anda berlaku.',
  },
  ms: {
    'notify.lead':
      'Mesej daripada platform, yang dipaparkan di dalam aplikasi. Mesej ini tidak dihantar ke peti masuk atau ke telefon. Halaman ini satu-satunya tempat mesej itu muncul.',
    'notify.unread':
      'Pemberitahuan anda tidak dapat dibaca sekarang. Itu tidak bermakna tiada pemberitahuan.',
    'notify.soon': 'Akan datang',
    'notify.recent': 'Terkini',
    'notify.unreadCount': 'Belum dibaca: {count}',
    'notify.unreadMark': 'Belum dibaca',
    'notify.none': 'Belum ada mesej.',
    'notify.inEnglish':
      'Mesej itu sendiri buat masa ini ditulis dalam bahasa Inggeris. Baris di atas setiap mesej menyatakan perkaranya.',
    'notify.classAt': 'Kelas bermula pada: {date}',
    'notify.planNamed': 'Pelan: {name}',
    'notify.renewsOn': 'Tempoh seterusnya bermula pada: {date}',
    'notify.renewCancel': 'Batalkan sebelum itu jika anda tidak mahu pelan ini diteruskan.',
    'notify.markAll': 'Tandakan semua sebagai sudah dibaca',
    'notify.marked': 'Ditandakan sebagai sudah dibaca: {count}',
    'notify.markFailed': 'Mesej-mesej itu tidak dapat ditandakan sebagai sudah dibaca sekarang.',
    'notify.prefsTitle': 'Apa yang diberitahu kepada anda',
    'notify.prefsBody': 'Suis ini menentukan apa yang muncul di halaman ini.',
    'notify.prefsUnread': 'Pilihan anda tidak dapat dibaca sekarang. Tiada apa-apa yang diubah.',
    'notify.sumAllOn': 'Semua yang boleh anda pilih dihidupkan.',
    'notify.sumAllOff': 'Anda telah mematikan semua mesej pilihan.',
    'notify.sumOff': 'Mesej pilihan yang dimatikan: {count}',
    'notify.always': 'Sentiasa hidup',
    'notify.notInUse':
      'Belum digunakan di platform ini. Pilihan anda disimpan dan berkuat kuasa jika ciri ini dihidupkan.',
    'notify.prefLocked':
      'Pemberitahuan bahawa wang yang terhutang kepada anda tidak sampai tidak boleh dimatikan.',
    'notify.prefFailed': 'Perubahan itu tidak disimpan.',
    'notify.prefUnsure':
      'Tiada jawapan yang kembali. Muat semula halaman ini untuk melihat sama ada perubahan itu disimpan.',
    'notify.kPayoutPaid': 'Bayaran keluar dihantar kepada anda',
    'notify.kPayoutFailed': 'Satu bayaran keluar tidak berjaya',
    'notify.kPayoutCancelled': 'Permintaan bayaran keluar dibatalkan',
    'notify.kMediaFailed': 'Satu rakaman anda tidak akan dapat dimainkan',
    'notify.kClassStarting': 'Satu kelas akan bermula sebentar lagi',
    'notify.kPlanRenewing': 'Satu pelan akan diperbaharui tidak lama lagi',
    'notify.kLiveCancelled': 'Kelas yang akan anda hadiri dibatalkan',
    'notify.kRecordingReady': 'Rakaman satu kelas sudah sedia',
    'notify.dPayoutPaid': 'Apabila wang yang terhutang kepada anda telah dihantar.',
    'notify.dPayoutFailed':
      'Apabila satu pemindahan tidak berjaya. Sentiasa hidup: begitulah anda mengetahuinya, dan membetulkannya biasanya di tangan anda.',
    'notify.dPayoutCancelled':
      'Apabila satu bayaran keluar ditarik balik sebelum dihantar. Sentiasa hidup, atas sebab yang sama seperti kegagalan.',
    'notify.dMediaFailed':
      'Apabila satu muat naik tidak dapat disediakan untuk dimainkan. Mematikan ini bermakna anda mengetahuinya daripada seorang pelajar. Ini tidak menjejaskan sama ada fail itu dibetulkan.',
    'notify.dClassStarting':
      'Peringatan untuk kelas langsung dalam kursus yang disertai anda atau anak anda.',
    'notify.dPlanRenewing':
      'Tiga hari sebelum langganan diperbaharui, supaya sempat membatalkannya.',
    'notify.dLiveCancelled':
      'Apabila kelas langsung yang disertai anda atau anak anda dibatalkan, berserta sebabnya. Mematikan ini bermakna anda mengetahuinya apabila membuka bilik kelas. Kelas itu tetap menyatakan bahawa ia dibatalkan, dan mengapa.',
    'notify.dRecordingReady':
      'Apabila rakaman ditambah bagi kelas yang disertai anda atau anak anda. Mematikan ini bermakna anda mengetahuinya apabila membuka halaman kelas. Rakaman itu tetap ada, dan masih boleh ditonton selagi pendaftaran anda berkuat kuasa.',
  },
  bn: {
    'notify.lead':
      'প্ল্যাটফর্মের বার্তা, যা অ্যাপ্লিকেশনের ভেতরে দেখানো হয়। এগুলো কোনো ইনবক্সে বা ফোনে পাঠানো হয় না। এই পৃষ্ঠাই একমাত্র জায়গা যেখানে এগুলো দেখা যায়।',
    'notify.unread':
      'আপনার বিজ্ঞপ্তিগুলো এই মুহূর্তে পড়া যায়নি। এর মানে এই নয় যে কোনো বিজ্ঞপ্তি নেই।',
    'notify.soon': 'সামনে আসছে',
    'notify.recent': 'সাম্প্রতিক',
    'notify.unreadCount': 'পড়া হয়নি: {count}',
    'notify.unreadMark': 'পড়া হয়নি',
    'notify.none': 'এখনো কোনো বার্তা নেই।',
    'notify.inEnglish':
      'বার্তাগুলো আপাতত ইংরেজিতে লেখা। প্রতিটির ওপরের লাইনটি বলে দেয় সেটি কী নিয়ে।',
    'notify.classAt': 'ক্লাস শুরু হবে: {date}',
    'notify.planNamed': 'প্ল্যান: {name}',
    'notify.renewsOn': 'পরের মেয়াদ শুরু হবে: {date}',
    'notify.renewCancel': 'এটি চালু রাখতে না চাইলে তার আগে বাতিল করুন।',
    'notify.markAll': 'সবগুলো পড়া হয়েছে বলে চিহ্নিত করুন',
    'notify.marked': 'পড়া হয়েছে বলে চিহ্নিত: {count}',
    'notify.markFailed': 'এগুলো এই মুহূর্তে পড়া হয়েছে বলে চিহ্নিত করা যায়নি।',
    'notify.prefsTitle': 'আপনাকে যা জানানো হয়',
    'notify.prefsBody': 'এই সুইচগুলো ঠিক করে এই পৃষ্ঠায় কী দেখা যাবে।',
    'notify.prefsUnread': 'আপনি যা বেছে নিয়েছেন তা এই মুহূর্তে পড়া যায়নি। কিছুই বদলানো হয়নি।',
    'notify.sumAllOn': 'আপনি যা যা বেছে নিতে পারেন তার সবই চালু আছে।',
    'notify.sumAllOff': 'আপনি সব ঐচ্ছিক বার্তা বন্ধ করে রেখেছেন।',
    'notify.sumOff': 'বন্ধ করা ঐচ্ছিক বার্তা: {count}',
    'notify.always': 'সব সময় চালু',
    'notify.notInUse':
      'এই প্ল্যাটফর্মে এখনো ব্যবহারে নেই। আপনার পছন্দ সংরক্ষিত আছে এবং এটি চালু হলে কার্যকর হবে।',
    'notify.prefLocked': 'আপনার পাওনা টাকা পৌঁছায়নি, এ কথা জানানো বন্ধ করা যায় না।',
    'notify.prefFailed': 'এই পরিবর্তন সংরক্ষিত হয়নি।',
    'notify.prefUnsure':
      'কোনো উত্তর আসেনি। পরিবর্তনটি সংরক্ষিত হয়েছে কি না দেখতে এই পৃষ্ঠাটি আবার লোড করুন।',
    'notify.kPayoutPaid': 'আপনাকে একটি পরিশোধ পাঠানো হয়েছে',
    'notify.kPayoutFailed': 'একটি পরিশোধ সম্পন্ন হয়নি',
    'notify.kPayoutCancelled': 'পরিশোধের একটি অনুরোধ বাতিল হয়েছে',
    'notify.kMediaFailed': 'আপনার একটি রেকর্ডিং চলবে না',
    'notify.kClassStarting': 'একটি ক্লাস শুরু হতে যাচ্ছে',
    'notify.kPlanRenewing': 'একটি প্ল্যান শিগগিরই নবায়ন হবে',
    'notify.kLiveCancelled': 'আপনি যে ক্লাসে যেতেন সেটি বাতিল হয়েছে',
    'notify.kRecordingReady': 'একটি ক্লাসের রেকর্ডিং প্রস্তুত',
    'notify.dPayoutPaid': 'যখন আপনার পাওনা টাকা পাঠানো হয়।',
    'notify.dPayoutFailed':
      'যখন কোনো স্থানান্তর সম্পন্ন হয় না। সব সময় চালু: এভাবেই আপনি জানতে পারেন, আর ঠিক করার কাজটি সাধারণত আপনারই।',
    'notify.dPayoutCancelled':
      'যখন কোনো পরিশোধ পাঠানোর আগে তুলে নেওয়া হয়। সব সময় চালু, ব্যর্থতার ক্ষেত্রে যে কারণে, সেই একই কারণে।',
    'notify.dMediaFailed':
      'যখন কোনো আপলোড চালানোর জন্য প্রস্তুত করা যায় না। এটি বন্ধ করার মানে হলো কোনো শিক্ষার্থীর কাছ থেকে জানতে পারা। ফাইলটি ঠিক করা হবে কি না, তাতে এর কোনো প্রভাব নেই।',
    'notify.dClassStarting':
      'আপনি বা আপনার কোনো সন্তান যে কোর্সে আছেন, তার সরাসরি ক্লাসের স্মরণিকা।',
    'notify.dPlanRenewing': 'সাবস্ক্রিপশন নবায়নের তিন দিন আগে, যাতে সময়মতো বাতিল করা যায়।',
    'notify.dLiveCancelled':
      'যখন আপনি বা আপনার কোনো সন্তান যে সরাসরি ক্লাসে নথিভুক্ত ছিলেন তা বাতিল হয়, কারণসহ। এটি বন্ধ করার মানে হলো কক্ষটি খুলে জানতে পারা। ক্লাসটি তখনো বলে যে সেটি বাতিল হয়েছে, এবং কেন।',
    'notify.dRecordingReady':
      'যখন আপনি বা আপনার কোনো সন্তান যে ক্লাসে ছিলেন তার রেকর্ডিং যোগ করা হয়। এটি বন্ধ করার মানে হলো ক্লাসের পৃষ্ঠা খুলে জানতে পারা। রেকর্ডিংটি তখনো সেখানেই থাকে, এবং আপনার ভর্তি যত দিন বহাল থাকে তত দিন দেখা যায়।',
  },
  hi: {
    'notify.lead':
      'प्लेटफ़ॉर्म के संदेश, जो ऐप्लिकेशन के अंदर दिखाए जाते हैं। ये किसी इनबॉक्स या फ़ोन पर नहीं भेजे जाते। यह पृष्ठ ही एकमात्र जगह है जहाँ ये दिखते हैं।',
    'notify.unread': 'आपकी सूचनाएँ अभी पढ़ी नहीं जा सकीं। इसका मतलब यह नहीं कि कोई सूचना नहीं है।',
    'notify.soon': 'आने वाला',
    'notify.recent': 'हाल के',
    'notify.unreadCount': 'अपठित: {count}',
    'notify.unreadMark': 'अपठित',
    'notify.none': 'अभी कोई संदेश नहीं है।',
    'notify.inEnglish':
      'संदेश ख़ुद फ़िलहाल अंग्रेज़ी में लिखे हैं। हर संदेश के ऊपर की पंक्ति बताती है कि वह किस बारे में है।',
    'notify.classAt': 'कक्षा शुरू होने का समय: {date}',
    'notify.planNamed': 'प्लान: {name}',
    'notify.renewsOn': 'अगली अवधि शुरू होगी: {date}',
    'notify.renewCancel': 'अगर आप नहीं चाहते कि यह जारी रहे तो उससे पहले रद्द कर दें।',
    'notify.markAll': 'सबको पढ़ा हुआ चिह्नित करें',
    'notify.marked': 'पढ़े हुए चिह्नित किए गए: {count}',
    'notify.markFailed': 'इन्हें अभी पढ़ा हुआ चिह्नित नहीं किया जा सका।',
    'notify.prefsTitle': 'आपको क्या बताया जाता है',
    'notify.prefsBody': 'ये स्विच तय करते हैं कि इस पृष्ठ पर क्या दिखे।',
    'notify.prefsUnread': 'आपने जो चुना है वह अभी पढ़ा नहीं जा सका। कुछ नहीं बदला।',
    'notify.sumAllOn': 'जो कुछ आप चुन सकते हैं वह सब चालू है।',
    'notify.sumAllOff': 'आपने हर वैकल्पिक संदेश बंद कर दिया है।',
    'notify.sumOff': 'बंद किए गए वैकल्पिक संदेश: {count}',
    'notify.always': 'हमेशा चालू',
    'notify.notInUse':
      'इस प्लेटफ़ॉर्म पर अभी उपयोग में नहीं है। आपकी पसंद सहेजी गई है और इसके चालू होने पर लागू होगी।',
    'notify.prefLocked': 'यह बताया जाना बंद नहीं किया जा सकता कि आपका बकाया पैसा नहीं पहुँचा।',
    'notify.prefFailed': 'यह बदलाव सहेजा नहीं गया।',
    'notify.prefUnsure':
      'कोई जवाब नहीं आया। बदलाव सहेजा गया या नहीं, यह देखने के लिए यह पृष्ठ फिर से लोड करें।',
    'notify.kPayoutPaid': 'आपको एक भुगतान भेजा गया',
    'notify.kPayoutFailed': 'एक भुगतान पूरा नहीं हुआ',
    'notify.kPayoutCancelled': 'भुगतान का एक अनुरोध रद्द हुआ',
    'notify.kMediaFailed': 'आपकी एक रिकॉर्डिंग नहीं चलेगी',
    'notify.kClassStarting': 'एक कक्षा शुरू होने वाली है',
    'notify.kPlanRenewing': 'एक प्लान का जल्द नवीनीकरण होगा',
    'notify.kLiveCancelled': 'जिस कक्षा में आप जाने वाले थे वह रद्द हुई',
    'notify.kRecordingReady': 'एक कक्षा की रिकॉर्डिंग तैयार है',
    'notify.dPayoutPaid': 'जब आपका बकाया पैसा भेज दिया जाए।',
    'notify.dPayoutFailed':
      'जब कोई अंतरण पूरा न हो। हमेशा चालू: इसी से आपको पता चलता है, और इसे ठीक करना अक्सर आपके हाथ में होता है।',
    'notify.dPayoutCancelled':
      'जब कोई भुगतान भेजे जाने से पहले वापस ले लिया जाए। हमेशा चालू, उसी कारण से जिससे विफलता की सूचना।',
    'notify.dMediaFailed':
      'जब कोई अपलोड चलाने के लिए तैयार न हो सके। इसे बंद करने का मतलब है कि आपको यह किसी शिक्षार्थी से पता चलेगा। फ़ाइल ठीक होगी या नहीं, इस पर इसका कोई असर नहीं पड़ता।',
    'notify.dClassStarting': 'उस कोर्स की लाइव कक्षा की याद, जिसमें आप या आपका कोई बच्चा है।',
    'notify.dPlanRenewing': 'सदस्यता के नवीनीकरण से तीन दिन पहले, ताकि समय रहते रद्द करना संभव हो।',
    'notify.dLiveCancelled':
      'जब वह लाइव कक्षा रद्द हो जिसमें आप या आपका कोई बच्चा नामांकित था, कारण के साथ। इसे बंद करने का मतलब है कि आपको यह कमरा खोलने पर पता चलेगा। कक्षा फिर भी बताती है कि वह रद्द हुई, और क्यों।',
    'notify.dRecordingReady':
      'जब उस कक्षा की रिकॉर्डिंग जोड़ी जाए जिसमें आप या आपका कोई बच्चा था। इसे बंद करने का मतलब है कि आपको यह कक्षा का पृष्ठ खोलने पर पता चलेगा। रिकॉर्डिंग फिर भी वहीं रहती है, और जब तक आपका नामांकन बना है तब तक देखी जा सकती है।',
  },
  fr: {
    'notify.lead':
      'Des messages de la plateforme, affichés dans l’application. Ils ne sont envoyés ni dans une boîte de réception ni sur un téléphone. Cette page est le seul endroit où ils apparaissent.',
    'notify.unread':
      'Vos notifications n’ont pas pu être lues pour le moment. Cela ne veut pas dire qu’il n’y en a aucune.',
    'notify.soon': 'À venir',
    'notify.recent': 'Récents',
    'notify.unreadCount': 'Non lus : {count}',
    'notify.unreadMark': 'Non lu',
    'notify.none': 'Aucun message pour l’instant.',
    'notify.inEnglish':
      'Les messages eux-mêmes sont rédigés en anglais pour le moment. La ligne au-dessus de chacun dit de quoi il s’agit.',
    'notify.classAt': 'Début du cours : {date}',
    'notify.planNamed': 'Formule : {name}',
    'notify.renewsOn': 'Début de la prochaine période : {date}',
    'notify.renewCancel': 'Annulez avant cette date si vous ne voulez pas que cela continue.',
    'notify.markAll': 'Tout marquer comme lu',
    'notify.marked': 'Marqués comme lus : {count}',
    'notify.markFailed': 'Ils n’ont pas pu être marqués comme lus pour le moment.',
    'notify.prefsTitle': 'Ce que l’on vous signale',
    'notify.prefsBody': 'Ces interrupteurs décident de ce qui apparaît sur cette page.',
    'notify.prefsUnread': 'Vos choix n’ont pas pu être lus pour le moment. Rien n’a été modifié.',
    'notify.sumAllOn': 'Tout ce que vous pouvez choisir est activé.',
    'notify.sumAllOff': 'Vous avez désactivé tous les messages facultatifs.',
    'notify.sumOff': 'Messages facultatifs désactivés : {count}',
    'notify.always': 'Toujours activé',
    'notify.notInUse':
      'Pas encore utilisé sur cette plateforme. Votre choix est enregistré et s’appliquera si la fonction est activée.',
    'notify.prefLocked':
      'Il n’est pas possible de désactiver l’avis indiquant qu’une somme qui vous est due n’est pas arrivée.',
    'notify.prefFailed': 'Ce changement n’a pas été enregistré.',
    'notify.prefUnsure':
      'Aucune réponse n’est revenue. Rechargez cette page pour voir si le changement a été enregistré.',
    'notify.kPayoutPaid': 'Un versement vous a été envoyé',
    'notify.kPayoutFailed': 'Un versement n’a pas abouti',
    'notify.kPayoutCancelled': 'Une demande de versement a été annulée',
    'notify.kMediaFailed': 'Un de vos enregistrements ne pourra pas être lu',
    'notify.kClassStarting': 'Un cours va bientôt commencer',
    'notify.kPlanRenewing': 'Une formule se renouvelle bientôt',
    'notify.kLiveCancelled': 'Un cours auquel vous deviez assister a été annulé',
    'notify.kRecordingReady': 'L’enregistrement d’un cours est prêt',
    'notify.dPayoutPaid': 'Quand une somme qui vous est due a été envoyée.',
    'notify.dPayoutFailed':
      'Quand un virement n’a pas abouti. Toujours activé : c’est ainsi que vous l’apprenez, et la correction dépend le plus souvent de vous.',
    'notify.dPayoutCancelled':
      'Quand un versement est retiré avant d’être envoyé. Toujours activé, pour la même raison qu’un échec.',
    'notify.dMediaFailed':
      'Quand un fichier envoyé n’a pas pu être préparé pour la lecture. Désactiver cet avis, c’est l’apprendre par une personne qui suit le cours. Cela ne change rien à la réparation du fichier.',
    'notify.dClassStarting':
      'Un rappel avant un cours en direct auquel vous ou l’un de vos enfants pouvez assister.',
    'notify.dPlanRenewing':
      'Trois jours avant le renouvellement d’un abonnement, pour qu’il soit encore possible d’annuler à temps.',
    'notify.dLiveCancelled':
      'Quand un cours en direct où vous ou l’un de vos enfants aviez une inscription est annulé, avec la raison. Désactiver cet avis, c’est l’apprendre en ouvrant la salle. Le cours indique toujours qu’il a été annulé, et pourquoi.',
    'notify.dRecordingReady':
      'Quand un enregistrement est ajouté pour un cours auquel vous ou l’un de vos enfants avez assisté. Désactiver cet avis, c’est l’apprendre en ouvrant la page du cours. L’enregistrement reste là, et peut être regardé tant que dure votre inscription.',
  },
  es: {
    'notify.lead':
      'Mensajes de la plataforma, que se muestran dentro de la aplicación. No se envían a una bandeja de entrada ni a un teléfono. Esta página es el único lugar donde aparecen.',
    'notify.unread':
      'Sus notificaciones no se pudieron leer en este momento. Eso no significa que no haya ninguna.',
    'notify.soon': 'Próximamente',
    'notify.recent': 'Recientes',
    'notify.unreadCount': 'Sin leer: {count}',
    'notify.unreadMark': 'Sin leer',
    'notify.none': 'Todavía no hay mensajes.',
    'notify.inEnglish':
      'Los mensajes en sí están escritos en inglés por ahora. La línea que hay encima de cada uno dice de qué trata.',
    'notify.classAt': 'Inicio de la clase: {date}',
    'notify.planNamed': 'Nombre del plan: {name}',
    'notify.renewsOn': 'Inicio del próximo periodo: {date}',
    'notify.renewCancel': 'Cancele antes de esa fecha si no quiere que continúe.',
    'notify.markAll': 'Marcar todo como leído',
    'notify.marked': 'Marcados como leídos: {count}',
    'notify.markFailed': 'No se pudieron marcar como leídos en este momento.',
    'notify.prefsTitle': 'Lo que se le comunica',
    'notify.prefsBody': 'Estos interruptores deciden lo que aparece en esta página.',
    'notify.prefsUnread':
      'Lo que usted ha elegido no se pudo leer en este momento. No se cambió nada.',
    'notify.sumAllOn': 'Todo lo que puede elegir está activado.',
    'notify.sumAllOff': 'Ha desactivado todos los mensajes opcionales.',
    'notify.sumOff': 'Mensajes opcionales desactivados: {count}',
    'notify.always': 'Siempre activado',
    'notify.notInUse':
      'Todavía no se usa en esta plataforma. Su elección queda guardada y se aplica si se activa.',
    'notify.prefLocked':
      'No se puede desactivar el aviso de que un dinero que se le debe no llegó.',
    'notify.prefFailed': 'Ese cambio no se guardó.',
    'notify.prefUnsure':
      'No llegó ninguna respuesta. Vuelva a cargar esta página para ver si el cambio se guardó.',
    'notify.kPayoutPaid': 'Se le envió un pago',
    'notify.kPayoutFailed': 'Un pago no se completó',
    'notify.kPayoutCancelled': 'Se canceló una solicitud de pago',
    'notify.kMediaFailed': 'Una grabación suya no se podrá reproducir',
    'notify.kClassStarting': 'Una clase está a punto de empezar',
    'notify.kPlanRenewing': 'Un plan se renueva pronto',
    'notify.kLiveCancelled': 'Se canceló una clase a la que iba a asistir',
    'notify.kRecordingReady': 'La grabación de una clase está lista',
    'notify.dPayoutPaid': 'Cuando se ha enviado un dinero que se le debe.',
    'notify.dPayoutFailed':
      'Cuando una transferencia no se completó. Siempre activado: así es como se entera, y la solución suele depender de usted.',
    'notify.dPayoutCancelled':
      'Cuando un pago se retira antes de enviarse. Siempre activado, por la misma razón que un fallo.',
    'notify.dMediaFailed':
      'Cuando un archivo subido no se pudo preparar para su reproducción. Desactivar esto significa enterarse por alguien que sigue el curso. No afecta a que el archivo se arregle o no.',
    'notify.dClassStarting':
      'Un recordatorio de una clase en directo de un curso en el que está usted o uno de sus hijos.',
    'notify.dPlanRenewing':
      'Tres días antes de que se renueve una suscripción, para que sea posible cancelar a tiempo.',
    'notify.dLiveCancelled':
      'Cuando se cancela una clase en directo en la que usted o uno de sus hijos tenía una inscripción, con el motivo. Desactivar esto significa enterarse al abrir la sala. La clase sigue diciendo que se canceló, y por qué.',
    'notify.dRecordingReady':
      'Cuando se añade una grabación de una clase en la que estuvo usted o uno de sus hijos. Desactivar esto significa enterarse al abrir la página de la clase. La grabación sigue ahí, y se puede ver mientras dure su inscripción.',
  },
  pt: {
    'notify.lead':
      'Mensagens da plataforma, mostradas dentro da aplicação. Não são enviadas para uma caixa de entrada nem para um telefone. Esta página é o único sítio onde aparecem.',
    'notify.unread':
      'Não foi possível ler agora as suas notificações. Isso não significa que não haja nenhuma.',
    'notify.soon': 'A seguir',
    'notify.recent': 'Recentes',
    'notify.unreadCount': 'Por ler: {count}',
    'notify.unreadMark': 'Por ler',
    'notify.none': 'Ainda não há mensagens.',
    'notify.inEnglish':
      'As mensagens em si estão, por agora, escritas em inglês. A linha por cima de cada uma diz de que se trata.',
    'notify.classAt': 'Início da aula: {date}',
    'notify.planNamed': 'Nome do plano: {name}',
    'notify.renewsOn': 'Início do próximo período: {date}',
    'notify.renewCancel': 'Cancele antes dessa data se não quiser que continue.',
    'notify.markAll': 'Marcar tudo como lido',
    'notify.marked': 'Marcadas como lidas: {count}',
    'notify.markFailed': 'Não foi possível marcá-las como lidas agora.',
    'notify.prefsTitle': 'O que lhe é comunicado',
    'notify.prefsBody': 'Estes interruptores decidem o que aparece nesta página.',
    'notify.prefsUnread': 'Não foi possível ler agora o que escolheu. Nada foi alterado.',
    'notify.sumAllOn': 'Tudo o que pode escolher está ligado.',
    'notify.sumAllOff': 'Desligou todas as mensagens opcionais.',
    'notify.sumOff': 'Mensagens opcionais desligadas: {count}',
    'notify.always': 'Sempre ligado',
    'notify.notInUse':
      'Ainda não está em uso nesta plataforma. A sua escolha fica guardada e aplica-se se for ligado.',
    'notify.prefLocked':
      'Não é possível desligar o aviso de que dinheiro que lhe é devido não chegou.',
    'notify.prefFailed': 'Essa alteração não foi guardada.',
    'notify.prefUnsure':
      'Não chegou nenhuma resposta. Recarregue esta página para ver se a alteração foi guardada.',
    'notify.kPayoutPaid': 'Foi-lhe enviado um pagamento',
    'notify.kPayoutFailed': 'Um pagamento não se concretizou',
    'notify.kPayoutCancelled': 'Um pedido de pagamento foi cancelado',
    'notify.kMediaFailed': 'Uma gravação sua não poderá ser reproduzida',
    'notify.kClassStarting': 'Uma aula está prestes a começar',
    'notify.kPlanRenewing': 'Um plano renova-se em breve',
    'notify.kLiveCancelled': 'Uma aula a que ia assistir foi cancelada',
    'notify.kRecordingReady': 'A gravação de uma aula está pronta',
    'notify.dPayoutPaid': 'Quando dinheiro que lhe é devido foi enviado.',
    'notify.dPayoutFailed':
      'Quando uma transferência não se concretizou. Sempre ligado: é assim que fica a saber, e a correção depende quase sempre de si.',
    'notify.dPayoutCancelled':
      'Quando um pagamento é retirado antes de ser enviado. Sempre ligado, pela mesma razão que uma falha.',
    'notify.dMediaFailed':
      'Quando um ficheiro carregado não pôde ser preparado para reprodução. Desligar isto significa ficar a saber por alguém que segue o curso. Não afeta se o ficheiro é corrigido ou não.',
    'notify.dClassStarting':
      'Um lembrete de uma aula em direto de um curso em que há uma inscrição sua ou de uma criança sua.',
    'notify.dPlanRenewing':
      'Três dias antes de uma subscrição se renovar, para que ainda seja possível cancelar a tempo.',
    'notify.dLiveCancelled':
      'Quando é cancelada uma aula em direto em que havia uma inscrição sua ou de uma criança sua, com o motivo. Desligar isto significa ficar a saber ao abrir a sala. A aula continua a dizer que foi cancelada, e porquê.',
    'notify.dRecordingReady':
      'Quando é adicionada uma gravação de uma aula em que esteve, ou em que esteve uma criança sua. Desligar isto significa ficar a saber ao abrir a página da aula. A gravação continua lá, e pode ser vista enquanto durar a sua inscrição.',
  },
  sw: {
    'notify.lead':
      'Jumbe kutoka kwenye jukwaa, zinazoonyeshwa ndani ya programu. Hazitumwi kwenye kikasha wala kwenye simu. Ukurasa huu ndio mahali pekee zinapoonekana.',
    'notify.unread':
      'Arifa zako hazikuweza kusomwa sasa hivi. Hiyo haimaanishi kwamba hakuna arifa.',
    'notify.soon': 'Yanayokuja',
    'notify.recent': 'Za karibuni',
    'notify.unreadCount': 'Hazijasomwa: {count}',
    'notify.unreadMark': 'Haijasomwa',
    'notify.none': 'Bado hakuna jumbe.',
    'notify.inEnglish':
      'Jumbe zenyewe kwa sasa zimeandikwa kwa Kiingereza. Mstari ulio juu ya kila ujumbe unasema unahusu nini.',
    'notify.classAt': 'Darasa linaanza: {date}',
    'notify.planNamed': 'Mpango: {name}',
    'notify.renewsOn': 'Kipindi kijacho kinaanza: {date}',
    'notify.renewCancel': 'Ghairi kabla ya hapo ikiwa hutaki uendelee.',
    'notify.markAll': 'Weka zote alama ya kusomwa',
    'notify.marked': 'Zilizowekwa alama ya kusomwa: {count}',
    'notify.markFailed': 'Hazikuweza kuwekwa alama ya kusomwa sasa hivi.',
    'notify.prefsTitle': 'Unachoarifiwa',
    'notify.prefsBody': 'Swichi hizi huamua kinachoonekana kwenye ukurasa huu.',
    'notify.prefsUnread': 'Ulichochagua hakikuweza kusomwa sasa hivi. Hakuna kilichobadilishwa.',
    'notify.sumAllOn': 'Kila unachoweza kuchagua kimewashwa.',
    'notify.sumAllOff': 'Umezima kila ujumbe wa hiari.',
    'notify.sumOff': 'Jumbe za hiari zilizozimwa: {count}',
    'notify.always': 'Imewashwa kila mara',
    'notify.notInUse':
      'Bado haitumiki kwenye jukwaa hili. Chaguo lako limehifadhiwa na litatumika ikiwashwa.',
    'notify.prefLocked': 'Kuarifiwa kwamba pesa unazodaiwa kulipwa hazikufika hakuwezi kuzimwa.',
    'notify.prefFailed': 'Badiliko hilo halikuhifadhiwa.',
    'notify.prefUnsure':
      'Hakuna jibu lililorudi. Pakia ukurasa huu upya ili uone kama badiliko limehifadhiwa.',
    'notify.kPayoutPaid': 'Umetumiwa malipo',
    'notify.kPayoutFailed': 'Malipo hayakukamilika',
    'notify.kPayoutCancelled': 'Ombi la malipo limeghairiwa',
    'notify.kMediaFailed': 'Rekodi yako moja haitaweza kuchezwa',
    'notify.kClassStarting': 'Darasa linakaribia kuanza',
    'notify.kPlanRenewing': 'Mpango unakaribia kusasishwa',
    'notify.kLiveCancelled': 'Darasa ulilokuwa uhudhurie limeghairiwa',
    'notify.kRecordingReady': 'Rekodi ya darasa iko tayari',
    'notify.dPayoutPaid': 'Pesa unazodaiwa kulipwa zinapokuwa zimetumwa.',
    'notify.dPayoutFailed':
      'Uhamisho unapokosa kukamilika. Imewashwa kila mara: hivyo ndivyo unavyojua, na mara nyingi kurekebisha ni juu yako.',
    'notify.dPayoutCancelled':
      'Malipo yanapoondolewa kabla ya kutumwa. Imewashwa kila mara, kwa sababu ileile ya kushindwa.',
    'notify.dMediaFailed':
      'Faili lililopakiwa linaposhindwa kuandaliwa ili lichezwe. Kuzima hii kunamaanisha utajua kutoka kwa mwanafunzi. Hakuathiri kama faili litarekebishwa.',
    'notify.dClassStarting':
      'Kikumbusho cha darasa la moja kwa moja katika kozi ambayo wewe au mtoto wako mmo.',
    'notify.dPlanRenewing':
      'Siku tatu kabla ya usajili kusasishwa, ili iwezekane kughairi kwa wakati.',
    'notify.dLiveCancelled':
      'Darasa la moja kwa moja ambalo wewe au mtoto wako mlisajiliwa linapoghairiwa, pamoja na sababu. Kuzima hii kunamaanisha utajua kwa kufungua chumba. Darasa bado linasema lilighairiwa, na kwa nini.',
    'notify.dRecordingReady':
      'Rekodi inapoongezwa ya darasa ambalo wewe au mtoto wako mlikuwemo. Kuzima hii kunamaanisha utajua kwa kufungua ukurasa wa darasa. Rekodi bado ipo, na inaweza kutazamwa muda wote usajili wako unapodumu.',
  },
  af: {
    'notify.lead':
      'Boodskappe van die platform, wat binne die toepassing gewys word. Hulle word nie na ’n inkassie of ’n foon gestuur nie. Hierdie bladsy is die enigste plek waar hulle verskyn.',
    'notify.unread':
      'Jou kennisgewings kon nie nou gelees word nie. Dit beteken nie dat daar geen is nie.',
    'notify.soon': 'Kom binnekort',
    'notify.recent': 'Onlangs',
    'notify.unreadCount': 'Ongelees: {count}',
    'notify.unreadMark': 'Ongelees',
    'notify.none': 'Nog geen boodskappe nie.',
    'notify.inEnglish':
      'Die boodskappe self is vir eers in Engels geskryf. Die reël bokant elkeen sê waaroor dit gaan.',
    'notify.classAt': 'Die klas begin op: {date}',
    'notify.planNamed': 'Naam van die plan: {name}',
    'notify.renewsOn': 'Die volgende tydperk begin op: {date}',
    'notify.renewCancel': 'Kanselleer voor dan as jy nie wil hê dit moet voortgaan nie.',
    'notify.markAll': 'Merk alles as gelees',
    'notify.marked': 'As gelees gemerk: {count}',
    'notify.markFailed': 'Hulle kon nie nou as gelees gemerk word nie.',
    'notify.prefsTitle': 'Wat vir jou gesê word',
    'notify.prefsBody': 'Hierdie skakelaars bepaal wat op hierdie bladsy verskyn.',
    'notify.prefsUnread': 'Wat jy gekies het, kon nie nou gelees word nie. Niks is verander nie.',
    'notify.sumAllOn': 'Alles wat jy kan kies, is aan.',
    'notify.sumAllOff': 'Jy het elke opsionele boodskap afgeskakel.',
    'notify.sumOff': 'Opsionele boodskappe wat afgeskakel is: {count}',
    'notify.always': 'Altyd aan',
    'notify.notInUse':
      'Nog nie op hierdie platform in gebruik nie. Jou keuse is gestoor en geld as dit aangeskakel word.',
    'notify.prefLocked':
      'Die kennisgewing dat geld wat aan jou verskuldig is nie aangekom het nie, kan nie afgeskakel word nie.',
    'notify.prefFailed': 'Daardie verandering is nie gestoor nie.',
    'notify.prefUnsure':
      'Geen antwoord het teruggekom nie. Laai hierdie bladsy weer om te sien of die verandering gestoor is.',
    'notify.kPayoutPaid': '’n Uitbetaling is aan jou gestuur',
    'notify.kPayoutFailed': '’n Uitbetaling het nie deurgegaan nie',
    'notify.kPayoutCancelled': '’n Versoek om uitbetaling is gekanselleer',
    'notify.kMediaFailed': '’n Opname van jou sal nie speel nie',
    'notify.kClassStarting': '’n Klas gaan nou-nou begin',
    'notify.kPlanRenewing': '’n Plan word binnekort hernu',
    'notify.kLiveCancelled': '’n Klas wat jy sou bywoon, is gekanselleer',
    'notify.kRecordingReady': '’n Opname van ’n klas is gereed',
    'notify.dPayoutPaid': 'Wanneer geld wat aan jou verskuldig is, gestuur is.',
    'notify.dPayoutFailed':
      'Wanneer ’n oordrag nie deurgegaan het nie. Altyd aan: dit is hoe jy uitvind, en om dit reg te stel is gewoonlik in jou hande.',
    'notify.dPayoutCancelled':
      'Wanneer ’n uitbetaling teruggetrek word voordat dit gestuur is. Altyd aan, om dieselfde rede as ’n mislukking.',
    'notify.dMediaFailed':
      'Wanneer ’n oplaai nie vir afspeel voorberei kon word nie. As jy dit afskakel, vind jy eerder by ’n leerder uit. Dit raak nie of die lêer reggemaak word nie.',
    'notify.dClassStarting':
      '’n Herinnering vir ’n regstreekse klas in ’n kursus waarin jy of ’n kind van jou is.',
    'notify.dPlanRenewing':
      'Drie dae voordat ’n subskripsie hernu word, sodat dit nog betyds gekanselleer kan word.',
    'notify.dLiveCancelled':
      'Wanneer ’n regstreekse klas waarvoor jy of ’n kind van jou ingeskryf was, afgestel word, met die rede. As jy dit afskakel, vind jy eerder uit wanneer jy die kamer oopmaak. Die klas sê steeds dat dit gekanselleer is, en waarom.',
    'notify.dRecordingReady':
      'Wanneer ’n opname bygevoeg word vir ’n klas waarin jy of ’n kind van jou was. As jy dit afskakel, vind jy eerder uit wanneer jy die klas se bladsy oopmaak. Die opname is steeds daar, en kan gekyk word solank jou inskrywing duur.',
  },
  'zh-hans': {
    'notify.lead': '来自平台的消息，显示在应用内。它们不会发送到任何收件箱或手机。本页是它们唯一出现的地方。',
    'notify.unread': '目前无法读取你的通知。这并不表示没有通知。',
    'notify.soon': '即将到来',
    'notify.recent': '最近',
    'notify.unreadCount': '未读：{count}',
    'notify.unreadMark': '未读',
    'notify.none': '还没有消息。',
    'notify.inEnglish': '消息本身目前以英文书写。每条消息上方的一行说明它是关于什么的。',
    'notify.classAt': '上课时间：{date}',
    'notify.planNamed': '套餐：{name}',
    'notify.renewsOn': '下一周期开始于：{date}',
    'notify.renewCancel': '如果不想继续，请在此之前取消。',
    'notify.markAll': '全部标为已读',
    'notify.marked': '已标为已读：{count}',
    'notify.markFailed': '目前无法将它们标为已读。',
    'notify.prefsTitle': '平台会告诉你什么',
    'notify.prefsBody': '这些开关决定本页显示什么。',
    'notify.prefsUnread': '目前无法读取你的选择。没有任何更改。',
    'notify.sumAllOn': '你可以选择的项目都已开启。',
    'notify.sumAllOff': '你已关闭所有可选消息。',
    'notify.sumOff': '已关闭的可选消息：{count}',
    'notify.always': '始终开启',
    'notify.notInUse': '本平台尚未启用此项。你的选择已保存，启用后即生效。',
    'notify.prefLocked': '“应付给你的款项未到账”的通知无法关闭。',
    'notify.prefFailed': '该更改未保存。',
    'notify.prefUnsure': '没有收到回应。请重新加载本页，查看更改是否已保存。',
    'notify.kPayoutPaid': '有一笔付款已发给你',
    'notify.kPayoutFailed': '有一笔付款未成功',
    'notify.kPayoutCancelled': '有一项付款申请已取消',
    'notify.kMediaFailed': '你的一项录制内容将无法播放',
    'notify.kClassStarting': '有一节课即将开始',
    'notify.kPlanRenewing': '有一个套餐即将续订',
    'notify.kLiveCancelled': '你要参加的一节课已取消',
    'notify.kRecordingReady': '一节课的录制内容已准备好',
    'notify.dPayoutPaid': '应付给你的款项已发出时。',
    'notify.dPayoutFailed': '一笔转账未成功时。始终开启：你就是这样得知的，而且通常需要由你来解决。',
    'notify.dPayoutCancelled': '一笔付款在发出前被撤回时。始终开启，原因与付款失败相同。',
    'notify.dMediaFailed': '上传的文件无法处理成可播放的内容时。关闭它意味着你要从学习者那里得知。它不影响文件是否会被修复。',
    'notify.dClassStarting': '你或你的孩子所在课程的直播课提醒。',
    'notify.dPlanRenewing': '订阅续订前三天，以便来得及取消。',
    'notify.dLiveCancelled': '你或你的孩子报名的直播课被取消时，并附上原因。关闭它意味着你要打开教室才会得知。课程本身仍会说明它已取消以及原因。',
    'notify.dRecordingReady': '你或你的孩子上过的课添加了录制内容时。关闭它意味着你要打开课程页面才会得知。录制内容仍在那里，在你的报名有效期间仍可观看。',
  },
  'zh-hant': {
    'notify.lead': '來自平台的訊息，顯示在應用程式內。它們不會傳送到任何收件匣或手機。本頁是它們唯一出現的地方。',
    'notify.unread': '目前無法讀取你的通知。這並不表示沒有通知。',
    'notify.soon': '即將到來',
    'notify.recent': '最近',
    'notify.unreadCount': '未讀：{count}',
    'notify.unreadMark': '未讀',
    'notify.none': '還沒有訊息。',
    'notify.inEnglish': '訊息本身目前以英文書寫。每則訊息上方的一行說明它是關於什麼的。',
    'notify.classAt': '上課時間：{date}',
    'notify.planNamed': '方案：{name}',
    'notify.renewsOn': '下一週期開始於：{date}',
    'notify.renewCancel': '如果不想繼續，請在此之前取消。',
    'notify.markAll': '全部標為已讀',
    'notify.marked': '已標為已讀：{count}',
    'notify.markFailed': '目前無法將它們標為已讀。',
    'notify.prefsTitle': '平台會告訴你什麼',
    'notify.prefsBody': '這些開關決定本頁顯示什麼。',
    'notify.prefsUnread': '目前無法讀取你的選擇。沒有任何變更。',
    'notify.sumAllOn': '你可以選擇的項目都已開啟。',
    'notify.sumAllOff': '你已關閉所有選用訊息。',
    'notify.sumOff': '已關閉的選用訊息：{count}',
    'notify.always': '一律開啟',
    'notify.notInUse': '本平台尚未啟用此項。你的選擇已儲存，啟用後即生效。',
    'notify.prefLocked': '「應付給你的款項未入帳」的通知無法關閉。',
    'notify.prefFailed': '該變更未儲存。',
    'notify.prefUnsure': '沒有收到回應。請重新載入本頁，查看變更是否已儲存。',
    'notify.kPayoutPaid': '有一筆撥款已發給你',
    'notify.kPayoutFailed': '有一筆撥款未成功',
    'notify.kPayoutCancelled': '有一項撥款申請已取消',
    'notify.kMediaFailed': '你的一項錄製內容將無法播放',
    'notify.kClassStarting': '有一堂課即將開始',
    'notify.kPlanRenewing': '有一個方案即將續訂',
    'notify.kLiveCancelled': '你要參加的一堂課已取消',
    'notify.kRecordingReady': '一堂課的錄製內容已準備好',
    'notify.dPayoutPaid': '應付給你的款項已發出時。',
    'notify.dPayoutFailed': '一筆轉帳未成功時。一律開啟：你就是這樣得知的，而且通常需要由你來解決。',
    'notify.dPayoutCancelled': '一筆撥款在發出前被撤回時。一律開啟，原因與撥款失敗相同。',
    'notify.dMediaFailed': '上傳的檔案無法處理成可播放的內容時。關閉它表示你要從學習者那裡得知。它不影響檔案是否會被修復。',
    'notify.dClassStarting': '你或你的孩子所在課程的直播課提醒。',
    'notify.dPlanRenewing': '訂閱續訂前三天，以便來得及取消。',
    'notify.dLiveCancelled': '你或你的孩子報名的直播課被取消時，並附上原因。關閉它表示你要打開教室才會得知。課程本身仍會說明它已取消以及原因。',
    'notify.dRecordingReady': '你或你的孩子上過的課新增了錄製內容時。關閉它表示你要打開課程頁面才會得知。錄製內容仍在那裡，在你的報名有效期間仍可觀看。',
  },
  vi: {
    'notify.lead':
      'Tin nhắn từ nền tảng, hiển thị bên trong ứng dụng. Chúng không được gửi đến hộp thư hay điện thoại nào. Trang này là nơi duy nhất chúng xuất hiện.',
    'notify.unread':
      'Hiện không đọc được thông báo của bạn. Điều đó không có nghĩa là không có thông báo nào.',
    'notify.soon': 'Sắp tới',
    'notify.recent': 'Gần đây',
    'notify.unreadCount': 'Chưa đọc: {count}',
    'notify.unreadMark': 'Chưa đọc',
    'notify.none': 'Chưa có tin nhắn nào.',
    'notify.inEnglish':
      'Bản thân các tin nhắn hiện được viết bằng tiếng Anh. Dòng phía trên mỗi tin cho biết tin đó nói về việc gì.',
    'notify.classAt': 'Lớp bắt đầu lúc: {date}',
    'notify.planNamed': 'Gói: {name}',
    'notify.renewsOn': 'Kỳ tiếp theo bắt đầu vào: {date}',
    'notify.renewCancel': 'Hãy hủy trước thời điểm đó nếu bạn không muốn tiếp tục.',
    'notify.markAll': 'Đánh dấu tất cả là đã đọc',
    'notify.marked': 'Đã đánh dấu là đã đọc: {count}',
    'notify.markFailed': 'Hiện không đánh dấu được chúng là đã đọc.',
    'notify.prefsTitle': 'Những điều bạn được báo',
    'notify.prefsBody': 'Các công tắc này quyết định những gì xuất hiện trên trang này.',
    'notify.prefsUnread': 'Hiện không đọc được những gì bạn đã chọn. Không có gì bị thay đổi.',
    'notify.sumAllOn': 'Mọi thứ bạn có thể chọn đều đang bật.',
    'notify.sumAllOff': 'Bạn đã tắt mọi tin nhắn tùy chọn.',
    'notify.sumOff': 'Tin nhắn tùy chọn đã tắt: {count}',
    'notify.always': 'Luôn bật',
    'notify.notInUse':
      'Chưa được dùng trên nền tảng này. Lựa chọn của bạn đã được lưu và sẽ áp dụng nếu tính năng được bật.',
    'notify.prefLocked':
      'Không thể tắt việc báo cho bạn rằng khoản tiền phải trả cho bạn đã không đến.',
    'notify.prefFailed': 'Thay đổi đó chưa được lưu.',
    'notify.prefUnsure':
      'Không có phản hồi nào trở lại. Hãy tải lại trang này để xem thay đổi đã được lưu hay chưa.',
    'notify.kPayoutPaid': 'Một khoản chi trả đã được gửi cho bạn',
    'notify.kPayoutFailed': 'Một khoản chi trả không thành công',
    'notify.kPayoutCancelled': 'Một yêu cầu chi trả đã bị hủy',
    'notify.kMediaFailed': 'Một bản ghi của bạn sẽ không phát được',
    'notify.kClassStarting': 'Một lớp sắp bắt đầu',
    'notify.kPlanRenewing': 'Một gói sắp được gia hạn',
    'notify.kLiveCancelled': 'Một lớp bạn định tham dự đã bị hủy',
    'notify.kRecordingReady': 'Bản ghi của một lớp đã sẵn sàng',
    'notify.dPayoutPaid': 'Khi khoản tiền phải trả cho bạn đã được gửi.',
    'notify.dPayoutFailed':
      'Khi một lần chuyển tiền không thành công. Luôn bật: đây là cách bạn biết được, và việc khắc phục thường do bạn thực hiện.',
    'notify.dPayoutCancelled':
      'Khi một khoản chi trả bị rút lại trước khi được gửi. Luôn bật, cùng lý do như khi thất bại.',
    'notify.dMediaFailed':
      'Khi một tệp tải lên không thể được chuẩn bị để phát. Tắt mục này nghĩa là bạn sẽ biết từ một người học. Nó không ảnh hưởng đến việc tệp có được sửa hay không.',
    'notify.dClassStarting':
      'Lời nhắc về một lớp trực tiếp trong khóa học mà bạn hoặc con bạn đang theo.',
    'notify.dPlanRenewing': 'Ba ngày trước khi một lượt đăng ký được gia hạn, để còn kịp hủy.',
    'notify.dLiveCancelled':
      'Khi một lớp trực tiếp mà bạn hoặc con bạn đã ghi danh bị hủy, kèm theo lý do. Tắt mục này nghĩa là bạn sẽ biết khi mở phòng học. Lớp vẫn ghi rõ là đã bị hủy, và vì sao.',
    'notify.dRecordingReady':
      'Khi một bản ghi được thêm cho lớp mà bạn hoặc con bạn đã tham dự. Tắt mục này nghĩa là bạn sẽ biết khi mở trang của lớp. Bản ghi vẫn ở đó, và vẫn xem được chừng nào lượt ghi danh của bạn còn hiệu lực.',
  },
  th: {
    'notify.lead':
      'ข้อความจากแพลตฟอร์ม ซึ่งแสดงภายในแอปพลิเคชัน ข้อความเหล่านี้ไม่ถูกส่งไปยังกล่องจดหมายหรือโทรศัพท์ หน้านี้เป็นที่เดียวที่ข้อความปรากฏ',
    'notify.unread': 'ขณะนี้อ่านการแจ้งเตือนของคุณไม่ได้ ซึ่งไม่ได้หมายความว่าไม่มีการแจ้งเตือน',
    'notify.soon': 'กำลังจะมาถึง',
    'notify.recent': 'ล่าสุด',
    'notify.unreadCount': 'ยังไม่ได้อ่าน: {count}',
    'notify.unreadMark': 'ยังไม่ได้อ่าน',
    'notify.none': 'ยังไม่มีข้อความ',
    'notify.inEnglish':
      'ตัวข้อความในตอนนี้เขียนเป็นภาษาอังกฤษ บรรทัดเหนือแต่ละข้อความบอกว่าเป็นเรื่องอะไร',
    'notify.classAt': 'ชั้นเรียนเริ่มเมื่อ: {date}',
    'notify.planNamed': 'แผน: {name}',
    'notify.renewsOn': 'รอบถัดไปเริ่มเมื่อ: {date}',
    'notify.renewCancel': 'ยกเลิกก่อนถึงเวลานั้นหากคุณไม่ต้องการให้ดำเนินต่อ',
    'notify.markAll': 'ทำเครื่องหมายทั้งหมดว่าอ่านแล้ว',
    'notify.marked': 'ทำเครื่องหมายว่าอ่านแล้ว: {count}',
    'notify.markFailed': 'ขณะนี้ทำเครื่องหมายว่าอ่านแล้วไม่ได้',
    'notify.prefsTitle': 'สิ่งที่คุณจะได้รับแจ้ง',
    'notify.prefsBody': 'สวิตช์เหล่านี้กำหนดว่าอะไรจะปรากฏในหน้านี้',
    'notify.prefsUnread': 'ขณะนี้อ่านสิ่งที่คุณเลือกไว้ไม่ได้ ไม่มีอะไรถูกเปลี่ยนแปลง',
    'notify.sumAllOn': 'ทุกอย่างที่คุณเลือกได้เปิดอยู่',
    'notify.sumAllOff': 'คุณปิดข้อความที่เลือกได้ทั้งหมดแล้ว',
    'notify.sumOff': 'ข้อความที่เลือกได้ซึ่งปิดอยู่: {count}',
    'notify.always': 'เปิดเสมอ',
    'notify.notInUse':
      'ยังไม่ได้ใช้งานบนแพลตฟอร์มนี้ ตัวเลือกของคุณถูกบันทึกไว้และจะมีผลเมื่อเปิดใช้',
    'notify.prefLocked': 'ไม่สามารถปิดการแจ้งว่าเงินที่ค้างจ่ายให้คุณไปไม่ถึงได้',
    'notify.prefFailed': 'การเปลี่ยนแปลงนั้นไม่ได้ถูกบันทึก',
    'notify.prefUnsure':
      'ไม่มีคำตอบกลับมา โปรดโหลดหน้านี้ใหม่เพื่อดูว่าการเปลี่ยนแปลงถูกบันทึกหรือไม่',
    'notify.kPayoutPaid': 'มีการจ่ายเงินส่งถึงคุณ',
    'notify.kPayoutFailed': 'การจ่ายเงินรายการหนึ่งไม่สำเร็จ',
    'notify.kPayoutCancelled': 'คำขอจ่ายเงินรายการหนึ่งถูกยกเลิก',
    'notify.kMediaFailed': 'สื่อบันทึกของคุณรายการหนึ่งจะเล่นไม่ได้',
    'notify.kClassStarting': 'ชั้นเรียนกำลังจะเริ่ม',
    'notify.kPlanRenewing': 'แผนกำลังจะต่ออายุเร็ว ๆ นี้',
    'notify.kLiveCancelled': 'ชั้นเรียนที่คุณจะเข้าร่วมถูกยกเลิก',
    'notify.kRecordingReady': 'สื่อบันทึกของชั้นเรียนพร้อมแล้ว',
    'notify.dPayoutPaid': 'เมื่อเงินที่ค้างจ่ายให้คุณถูกส่งแล้ว',
    'notify.dPayoutFailed':
      'เมื่อการโอนไม่สำเร็จ เปิดเสมอ: นี่คือวิธีที่คุณจะรู้ และการแก้ไขมักเป็นสิ่งที่คุณต้องทำเอง',
    'notify.dPayoutCancelled':
      'เมื่อการจ่ายเงินถูกถอนก่อนที่จะส่ง เปิดเสมอ ด้วยเหตุผลเดียวกับกรณีไม่สำเร็จ',
    'notify.dMediaFailed':
      'เมื่อไฟล์ที่อัปโหลดไม่สามารถเตรียมให้เล่นได้ การปิดรายการนี้หมายความว่าคุณจะรู้จากผู้เรียนแทน ไม่มีผลต่อการที่ไฟล์จะได้รับการแก้ไขหรือไม่',
    'notify.dClassStarting': 'การเตือนสำหรับชั้นเรียนสดในหลักสูตรที่คุณหรือบุตรหลานของคุณเรียนอยู่',
    'notify.dPlanRenewing': 'สามวันก่อนที่การสมัครสมาชิกจะต่ออายุ เพื่อให้ยกเลิกได้ทันเวลา',
    'notify.dLiveCancelled':
      'เมื่อชั้นเรียนสดที่คุณหรือบุตรหลานของคุณลงทะเบียนไว้ถูกยกเลิก พร้อมเหตุผล การปิดรายการนี้หมายความว่าคุณจะรู้เมื่อเปิดห้องแทน ชั้นเรียนยังคงบอกว่าถูกยกเลิก และเพราะอะไร',
    'notify.dRecordingReady':
      'เมื่อมีการเพิ่มสื่อบันทึกของชั้นเรียนที่คุณหรือบุตรหลานของคุณเข้าร่วม การปิดรายการนี้หมายความว่าคุณจะรู้เมื่อเปิดหน้าชั้นเรียนแทน สื่อบันทึกยังคงอยู่ที่นั่น และดูได้ตราบเท่าที่การลงทะเบียนของคุณยังมีผล',
  },
  fil: {
    'notify.lead':
      'Mga mensahe mula sa platform, na ipinapakita sa loob ng application. Hindi ipinapadala ang mga ito sa inbox o sa telepono. Ang pahinang ito lang ang lugar kung saan lumalabas ang mga ito.',
    'notify.unread':
      'Hindi mabasa ngayon ang mga abiso mo. Hindi ibig sabihin nito na wala kang abiso.',
    'notify.soon': 'Paparating',
    'notify.recent': 'Kamakailan',
    'notify.unreadCount': 'Hindi pa nababasa: {count}',
    'notify.unreadMark': 'Hindi pa nababasa',
    'notify.none': 'Wala pang mensahe.',
    'notify.inEnglish':
      'Sa ngayon, nakasulat sa Ingles ang mga mensahe mismo. Sinasabi ng linya sa itaas ng bawat isa kung tungkol saan ito.',
    'notify.classAt': 'Magsisimula ang klase sa: {date}',
    'notify.planNamed': 'Pangalan ng plan: {name}',
    'notify.renewsOn': 'Magsisimula ang susunod na panahon sa: {date}',
    'notify.renewCancel': 'Kanselahin bago iyon kung ayaw mong magpatuloy ito.',
    'notify.markAll': 'Markahan ang lahat bilang nabasa na',
    'notify.marked': 'Namarkahan bilang nabasa na: {count}',
    'notify.markFailed': 'Hindi mamarkahan ngayon ang mga ito bilang nabasa na.',
    'notify.prefsTitle': 'Ang mga ipinapaalam sa iyo',
    'notify.prefsBody':
      'Ang mga switch na ito ang nagpapasya kung ano ang lalabas sa pahinang ito.',
    'notify.prefsUnread': 'Hindi mabasa ngayon ang mga pinili mo. Walang binago.',
    'notify.sumAllOn': 'Nakabukas ang lahat ng mapipili mo.',
    'notify.sumAllOff': 'Pinatay mo ang bawat opsyonal na mensahe.',
    'notify.sumOff': 'Mga opsyonal na mensaheng nakapatay: {count}',
    'notify.always': 'Laging nakabukas',
    'notify.notInUse':
      'Hindi pa ginagamit sa platform na ito. Naka-save ang pinili mo at ipatutupad kapag binuksan ito.',
    'notify.prefLocked':
      'Hindi mapapatay ang pagpapaalam na hindi dumating ang perang dapat mapunta sa iyo.',
    'notify.prefFailed': 'Hindi na-save ang pagbabagong iyon.',
    'notify.prefUnsure':
      'Walang bumalik na sagot. I-reload ang pahinang ito para makita kung na-save ang pagbabago.',
    'notify.kPayoutPaid': 'May payout na ipinadala sa iyo',
    'notify.kPayoutFailed': 'May payout na hindi natuloy',
    'notify.kPayoutCancelled': 'May hiling na payout na kinansela',
    'notify.kMediaFailed': 'May recording mo na hindi mapapatugtog',
    'notify.kClassStarting': 'May klaseng malapit nang magsimula',
    'notify.kPlanRenewing': 'May plan na malapit nang ma-renew',
    'notify.kLiveCancelled': 'Kinansela ang klaseng dadaluhan mo sana',
    'notify.kRecordingReady': 'Handa na ang recording ng isang klase',
    'notify.dPayoutPaid': 'Kapag naipadala na ang perang dapat mapunta sa iyo.',
    'notify.dPayoutFailed':
      'Kapag hindi natuloy ang isang paglilipat. Laging nakabukas: ganito mo nalalaman, at kadalasan ay ikaw ang makakaayos nito.',
    'notify.dPayoutCancelled':
      'Kapag binawi ang isang payout bago ito maipadala. Laging nakabukas, sa parehong dahilan ng pagkabigo.',
    'notify.dMediaFailed':
      'Kapag hindi maihanda para mapatugtog ang isang in-upload. Kapag pinatay ito, sa isang mag-aaral mo na malalaman. Hindi nito naaapektuhan kung maaayos ang file.',
    'notify.dClassStarting':
      'Paalala para sa live na klase sa kursong kinabibilangan mo o ng anak mo.',
    'notify.dPlanRenewing':
      'Tatlong araw bago ma-renew ang isang subskripsyon, para makapagkansela pa sa oras.',
    'notify.dLiveCancelled':
      'Kapag kinansela ang live na klaseng naka-enroll ka o ang anak mo, kasama ang dahilan. Kapag pinatay ito, malalaman mo na lang sa pagbukas ng silid. Sinasabi pa rin ng klase na kinansela ito, at kung bakit.',
    'notify.dRecordingReady':
      'Kapag may idinagdag na recording para sa klaseng dinaluhan mo o ng anak mo. Kapag pinatay ito, malalaman mo na lang sa pagbukas ng pahina ng klase. Naroon pa rin ang recording, at mapapanood pa rin habang tumatagal ang enrolment mo.',
  },
  uz: {
    'notify.lead':
      'Platformadan kelgan, ilova ichida koʻrsatiladigan xabarlar. Ular hech qanday pochta qutisiga yoki telefonga yuborilmaydi. Ular koʻrinadigan yagona joy shu sahifadir.',
    'notify.unread':
      'Bildirishnomalaringizni hozir oʻqib boʻlmadi. Bu bildirishnoma yoʻq degani emas.',
    'notify.soon': 'Yaqinlashayotganlar',
    'notify.recent': 'Soʻnggilari',
    'notify.unreadCount': 'Oʻqilmagan: {count}',
    'notify.unreadMark': 'Oʻqilmagan',
    'notify.none': 'Hali xabar yoʻq.',
    'notify.inEnglish':
      'Xabarlarning oʻzi hozircha ingliz tilida yozilgan. Har birining ustidagi satr u nima haqida ekanini aytadi.',
    'notify.classAt': 'Dars boshlanish vaqti: {date}',
    'notify.planNamed': 'Tarif nomi: {name}',
    'notify.renewsOn': 'Keyingi davr boshlanishi: {date}',
    'notify.renewCancel': 'Davom etishini istamasangiz, ungacha bekor qiling.',
    'notify.markAll': 'Hammasini oʻqilgan deb belgilash',
    'notify.marked': 'Oʻqilgan deb belgilandi: {count}',
    'notify.markFailed': 'Ularni hozir oʻqilgan deb belgilab boʻlmadi.',
    'notify.prefsTitle': 'Sizga nimalar xabar qilinadi',
    'notify.prefsBody': 'Bu tugmalar shu sahifada nima koʻrinishini belgilaydi.',
    'notify.prefsUnread': 'Tanlaganlaringizni hozir oʻqib boʻlmadi. Hech narsa oʻzgartirilmadi.',
    'notify.sumAllOn': 'Siz tanlashingiz mumkin boʻlgan hamma narsa yoqilgan.',
    'notify.sumAllOff': 'Siz barcha ixtiyoriy xabarlarni oʻchirib qoʻygansiz.',
    'notify.sumOff': 'Oʻchirilgan ixtiyoriy xabarlar: {count}',
    'notify.always': 'Doim yoqilgan',
    'notify.notInUse':
      'Bu platformada hali ishlatilmaydi. Tanlovingiz saqlangan va u yoqilsa, kuchga kiradi.',
    'notify.prefLocked':
      'Sizga tegishli pul yetib kelmagani haqida xabar qilinishini oʻchirib boʻlmaydi.',
    'notify.prefFailed': 'Bu oʻzgarish saqlanmadi.',
    'notify.prefUnsure':
      'Javob qaytmadi. Oʻzgarish saqlangan-saqlanmaganini koʻrish uchun shu sahifani qayta yuklang.',
    'notify.kPayoutPaid': 'Sizga toʻlov yuborildi',
    'notify.kPayoutFailed': 'Bir toʻlov amalga oshmadi',
    'notify.kPayoutCancelled': 'Toʻlov soʻrovi bekor qilindi',
    'notify.kMediaFailed': 'Bir yozuvingizni ijro etib boʻlmaydi',
    'notify.kClassStarting': 'Dars boshlanay deb turibdi',
    'notify.kPlanRenewing': 'Tarif tez orada yangilanadi',
    'notify.kLiveCancelled': 'Siz qatnashmoqchi boʻlgan dars bekor qilindi',
    'notify.kRecordingReady': 'Dars yozuvi tayyor',
    'notify.dPayoutPaid': 'Sizga tegishli pul yuborilganda.',
    'notify.dPayoutFailed':
      'Oʻtkazma amalga oshmaganda. Doim yoqilgan: shu orqali bilib olasiz, va uni tuzatish odatda oʻzingizga bogʻliq.',
    'notify.dPayoutCancelled':
      'Toʻlov yuborilishidan oldin qaytarib olinganda. Doim yoqilgan, muvaffaqiyatsizlik bilan bir xil sababga koʻra.',
    'notify.dMediaFailed':
      'Yuklangan faylni ijroga tayyorlab boʻlmaganda. Buni oʻchirish buni bir oʻquvchidan bilib olishni anglatadi. Bu fayl tuzatilish-tuzatilmasligiga taʼsir qilmaydi.',
    'notify.dClassStarting': 'Siz yoki bolangiz qatnashayotgan kursdagi jonli dars haqida eslatma.',
    'notify.dPlanRenewing':
      'Obuna yangilanishidan uch kun oldin, oʻz vaqtida bekor qilish mumkin boʻlishi uchun.',
    'notify.dLiveCancelled':
      'Siz yoki bolangiz yozilgan jonli dars bekor qilinganda, sababi bilan. Buni oʻchirish buni xonani ochganda bilib olishni anglatadi. Dars baribir bekor qilinganini va nega ekanini aytib turadi.',
    'notify.dRecordingReady':
      'Siz yoki bolangiz qatnashgan darsga yozuv qoʻshilganda. Buni oʻchirish buni dars sahifasini ochganda bilib olishni anglatadi. Yozuv baribir oʻsha yerda turadi va kursga yozilganingiz amalda ekan, uni koʻrish mumkin.',
  },
  kk: {
    'notify.lead':
      'Платформадан келген, қолданба ішінде көрсетілетін хабарлар. Олар ешбір кіріс жәшігіне не телефонға жіберілмейді. Олар көрінетін жалғыз жер осы бет.',
    'notify.unread':
      'Хабарламаларыңызды қазір оқу мүмкін болмады. Бұл хабарлама жоқ деген сөз емес.',
    'notify.soon': 'Алдағы',
    'notify.recent': 'Соңғылары',
    'notify.unreadCount': 'Оқылмаған: {count}',
    'notify.unreadMark': 'Оқылмаған',
    'notify.none': 'Әзірге хабар жоқ.',
    'notify.inEnglish':
      'Хабарлардың өзі әзірге ағылшын тілінде жазылған. Әрқайсысының үстіндегі жол оның не туралы екенін айтады.',
    'notify.classAt': 'Сабақтың басталу уақыты: {date}',
    'notify.planNamed': 'Жоспардың атауы: {name}',
    'notify.renewsOn': 'Келесі кезеңнің басталуы: {date}',
    'notify.renewCancel': 'Жалғасқанын қаламасаңыз, оған дейін бас тартыңыз.',
    'notify.markAll': 'Барлығын оқылған деп белгілеу',
    'notify.marked': 'Оқылған деп белгіленді: {count}',
    'notify.markFailed': 'Оларды қазір оқылған деп белгілеу мүмкін болмады.',
    'notify.prefsTitle': 'Сізге не хабарланады',
    'notify.prefsBody': 'Бұл қосқыштар осы бетте не көрінетінін анықтайды.',
    'notify.prefsUnread': 'Таңдағандарыңызды қазір оқу мүмкін болмады. Ештеңе өзгертілген жоқ.',
    'notify.sumAllOn': 'Сіз таңдай алатын нәрсенің бәрі қосулы.',
    'notify.sumAllOff': 'Сіз барлық міндетті емес хабарды өшіріп қойғансыз.',
    'notify.sumOff': 'Өшірілген міндетті емес хабарлар: {count}',
    'notify.always': 'Әрқашан қосулы',
    'notify.notInUse':
      'Бұл платформада әзірге қолданылмайды. Таңдауыңыз сақталған және ол қосылса, күшіне енеді.',
    'notify.prefLocked': 'Сізге тиесілі ақшаның жетпегені туралы хабарлауды өшіру мүмкін емес.',
    'notify.prefFailed': 'Бұл өзгеріс сақталмады.',
    'notify.prefUnsure':
      'Жауап қайтпады. Өзгерістің сақталған-сақталмағанын көру үшін осы бетті қайта жүктеңіз.',
    'notify.kPayoutPaid': 'Сізге төлем жіберілді',
    'notify.kPayoutFailed': 'Бір төлем өтпей қалды',
    'notify.kPayoutCancelled': 'Төлем сұрауы тоқтатылды',
    'notify.kMediaFailed': 'Бір жазбаңыз ойнатылмайды',
    'notify.kClassStarting': 'Сабақ басталғалы тұр',
    'notify.kPlanRenewing': 'Жоспар жақында жаңартылады',
    'notify.kLiveCancelled': 'Сіз қатыспақ болған сабақ болмайтын болды',
    'notify.kRecordingReady': 'Сабақтың жазбасы дайын',
    'notify.dPayoutPaid': 'Сізге тиесілі ақша жіберілгенде.',
    'notify.dPayoutFailed':
      'Аударым өтпей қалғанда. Әрқашан қосулы: осылай білесіз, ал оны түзету көбіне өзіңізге байланысты.',
    'notify.dPayoutCancelled':
      'Төлем жіберілмей тұрып кері алынғанда. Әрқашан қосулы, сәтсіздікпен бірдей себеппен.',
    'notify.dMediaFailed':
      'Жүктелген файлды ойнатуға дайындау мүмкін болмағанда. Мұны өшіру оны бір оқушыдан білуді білдіреді. Бұл файлдың түзетілу-түзетілмеуіне әсер етпейді.',
    'notify.dClassStarting':
      'Сіз немесе балаңыз қатысатын курстағы тікелей сабақ туралы еске салу.',
    'notify.dPlanRenewing':
      'Жазылым жаңартылардан үш күн бұрын, уақытында бас тарту мүмкін болуы үшін.',
    'notify.dLiveCancelled':
      'Сіз немесе балаңыз тіркелген тікелей сабақ болмайтын болғанда, себебімен бірге. Мұны өшіру оны бөлмені ашқанда білуді білдіреді. Сабақ бәрібір өзінің болмайтынын және неге екенін айтып тұрады.',
    'notify.dRecordingReady':
      'Сіз немесе балаңыз қатысқан сабаққа жазба қосылғанда. Мұны өшіру оны сабақ бетін ашқанда білуді білдіреді. Жазба бәрібір сол жерде тұрады және курсқа тіркелуіңіз күшінде болғанша оны көруге болады.',
  },
  az: {
    'notify.lead':
      'Platformadan gələn, tətbiqin içində göstərilən mesajlar. Onlar heç bir poçt qutusuna və ya telefona göndərilmir. Göründükləri yeganə yer bu səhifədir.',
    'notify.unread':
      'Bildirişləriniz hazırda oxuna bilmədi. Bu, heç bir bildirişin olmadığı demək deyil.',
    'notify.soon': 'Qarşıdan gələnlər',
    'notify.recent': 'Son gələnlər',
    'notify.unreadCount': 'Oxunmamış: {count}',
    'notify.unreadMark': 'Oxunmamış',
    'notify.none': 'Hələ mesaj yoxdur.',
    'notify.inEnglish':
      'Mesajların özü hələlik ingilis dilində yazılır. Hər birinin üstündəki sətir onun nə barədə olduğunu deyir.',
    'notify.classAt': 'Dərsin başlama vaxtı: {date}',
    'notify.planNamed': 'Planın adı: {name}',
    'notify.renewsOn': 'Növbəti dövrün başlanğıcı: {date}',
    'notify.renewCancel': 'Davam etməsini istəmirsinizsə, o vaxta qədər ləğv edin.',
    'notify.markAll': 'Hamısını oxunmuş kimi işarələ',
    'notify.marked': 'Oxunmuş kimi işarələndi: {count}',
    'notify.markFailed': 'Onları hazırda oxunmuş kimi işarələmək mümkün olmadı.',
    'notify.prefsTitle': 'Sizə nələr bildirilir',
    'notify.prefsBody': 'Bu açarlar bu səhifədə nəyin görünəcəyini müəyyən edir.',
    'notify.prefsUnread': 'Seçdikləriniz hazırda oxuna bilmədi. Heç nə dəyişdirilmədi.',
    'notify.sumAllOn': 'Seçə biləcəyiniz hər şey yandırılıb.',
    'notify.sumAllOff': 'Bütün könüllü mesajları söndürmüsünüz.',
    'notify.sumOff': 'Söndürülmüş könüllü mesajlar: {count}',
    'notify.always': 'Həmişə yanılı',
    'notify.notInUse':
      'Bu platformada hələ istifadə olunmur. Seçiminiz yadda saxlanılıb və yandırılsa, qüvvəyə minəcək.',
    'notify.prefLocked': 'Sizə çatmalı olan pulun gəlmədiyi barədə bildirişi söndürmək olmaz.',
    'notify.prefFailed': 'Bu dəyişiklik yadda saxlanılmadı.',
    'notify.prefUnsure':
      'Cavab qayıtmadı. Dəyişikliyin yadda saxlanılıb-saxlanılmadığını görmək üçün bu səhifəni yenidən yükləyin.',
    'notify.kPayoutPaid': 'Sizə ödəniş göndərildi',
    'notify.kPayoutFailed': 'Bir ödəniş baş tutmadı',
    'notify.kPayoutCancelled': 'Ödəniş sorğusu ləğv edildi',
    'notify.kMediaFailed': 'Bir yazılışınız oxudula bilməyəcək',
    'notify.kClassStarting': 'Dərs başlamaq üzrədir',
    'notify.kPlanRenewing': 'Plan tezliklə yenilənir',
    'notify.kLiveCancelled': 'Qatılacağınız dərs ləğv edildi',
    'notify.kRecordingReady': 'Dərsin yazılışı hazırdır',
    'notify.dPayoutPaid': 'Sizə çatmalı olan pul göndəriləndə.',
    'notify.dPayoutFailed':
      'Köçürmə baş tutmayanda. Həmişə yanılı: bunu belə öyrənirsiniz və düzəltmək adətən sizin əlinizdədir.',
    'notify.dPayoutCancelled':
      'Ödəniş göndərilməzdən əvvəl geri götürüləndə. Həmişə yanılı, uğursuzluqla eyni səbəbdən.',
    'notify.dMediaFailed':
      'Yüklənmiş fayl oxutmaq üçün hazırlana bilməyəndə. Bunu söndürmək onu bir şagirddən öyrənmək deməkdir. Bu, faylın düzəldilib-düzəldilməməsinə təsir etmir.',
    'notify.dClassStarting': 'Sizin və ya uşağınızın olduğu kursdakı canlı dərs üçün xatırlatma.',
    'notify.dPlanRenewing':
      'Abunə yenilənməzdən üç gün əvvəl ki, vaxtında ləğv etmək mümkün olsun.',
    'notify.dLiveCancelled':
      'Sizin və ya uşağınızın yazıldığı canlı dərs ləğv ediləndə, səbəbi ilə birlikdə. Bunu söndürmək onu otağı açanda öyrənmək deməkdir. Dərs yenə də ləğv edildiyini və niyə edildiyini deyir.',
    'notify.dRecordingReady':
      'Sizin və ya uşağınızın olduğu dərsə yazılış əlavə ediləndə. Bunu söndürmək onu dərsin səhifəsini açanda öyrənmək deməkdir. Yazılış yenə də oradadır və kursa yazılışınız qüvvədə olduqca ona baxmaq olar.',
  },
  tg: {
    'notify.lead':
      'Паёмҳо аз платформа, ки дар дохили барнома нишон дода мешаванд. Онҳо ба ягон қуттии почта ё телефон фиристода намешаванд. Ин саҳифа ягона ҷоест, ки онҳо пайдо мешаванд.',
    'notify.unread':
      'Огоҳиномаҳои шумо ҳоло хонда нашуданд. Ин маънои онро надорад, ки огоҳинома нест.',
    'notify.soon': 'Дар пеш',
    'notify.recent': 'Охирин',
    'notify.unreadCount': 'Нохонда: {count}',
    'notify.unreadMark': 'Нохонда',
    'notify.none': 'Ҳоло паёме нест.',
    'notify.inEnglish':
      'Худи паёмҳо ҳоло бо забони англисӣ навишта шудаанд. Сатри болои ҳар кадом мегӯяд, ки он дар бораи чист.',
    'notify.classAt': 'Вақти оғози дарс: {date}',
    'notify.planNamed': 'Номи нақша: {name}',
    'notify.renewsOn': 'Оғози давраи навбатӣ: {date}',
    'notify.renewCancel': 'Агар нахоҳед, ки он идома ёбад, пеш аз он бекор кунед.',
    'notify.markAll': 'Ҳамаро хондашуда қайд кардан',
    'notify.marked': 'Хондашуда қайд шуд: {count}',
    'notify.markFailed': 'Онҳоро ҳоло хондашуда қайд кардан муяссар нашуд.',
    'notify.prefsTitle': 'Ба шумо чӣ хабар дода мешавад',
    'notify.prefsBody': 'Ин калидҳо муайян мекунанд, ки дар ин саҳифа чӣ пайдо мешавад.',
    'notify.prefsUnread': 'Он чи интихоб кардаед, ҳоло хонда нашуд. Ҳеҷ чиз тағйир дода нашуд.',
    'notify.sumAllOn': 'Ҳар чизе ки шумо интихоб карда метавонед, фаъол аст.',
    'notify.sumAllOff': 'Шумо ҳамаи паёмҳои ихтиёриро хомӯш кардаед.',
    'notify.sumOff': 'Паёмҳои ихтиёрии хомӯшшуда: {count}',
    'notify.always': 'Ҳамеша фаъол',
    'notify.notInUse':
      'Дар ин платформа ҳоло истифода намешавад. Интихоби шумо нигоҳ дошта шудааст ва агар фаъол шавад, амал мекунад.',
    'notify.prefLocked':
      'Хабар додан дар бораи он ки пули ба шумо тааллуқдошта нарасид, хомӯш карда намешавад.',
    'notify.prefFailed': 'Ин тағйирот нигоҳ дошта нашуд.',
    'notify.prefUnsure':
      'Ҷавобе барнагашт. Барои дидани он ки тағйирот нигоҳ дошта шудааст ё не, ин саҳифаро аз нав бор кунед.',
    'notify.kPayoutPaid': 'Ба шумо пардохте фиристода шуд',
    'notify.kPayoutFailed': 'Як пардохт анҷом наёфт',
    'notify.kPayoutCancelled': 'Дархости пардохт бекор карда шуд',
    'notify.kMediaFailed': 'Як сабти шумо пахш намешавад',
    'notify.kClassStarting': 'Дарс наздик аст оғоз шавад',
    'notify.kPlanRenewing': 'Нақша ба наздикӣ нав карда мешавад',
    'notify.kLiveCancelled': 'Дарсе, ки шумо бояд дар он иштирок мекардед, бекор карда шуд',
    'notify.kRecordingReady': 'Сабти дарс омода аст',
    'notify.dPayoutPaid': 'Вақте ки пули ба шумо тааллуқдошта фиристода шудааст.',
    'notify.dPayoutFailed':
      'Вақте ки интиқол анҷом наёфт. Ҳамеша фаъол: шумо ҳамин тавр огоҳ мешавед, ва ислоҳи он одатан ба худи шумо вобаста аст.',
    'notify.dPayoutCancelled':
      'Вақте ки пардохт пеш аз фиристодан бозпас гирифта мешавад. Ҳамеша фаъол, бо ҳамон сабабе ки нокомӣ.',
    'notify.dMediaFailed':
      'Вақте ки файли боршуда барои пахш омода карда нашуд. Хомӯш кардани ин маънои онро дорад, ки шумо аз як донишомӯз огоҳ мешавед. Ин ба ислоҳ шудан ё нашудани файл таъсир намерасонад.',
    'notify.dClassStarting':
      'Ёдрасӣ барои дарси мустақим дар курсе, ки шумо ё фарзанди шумо дар он ҳастед.',
    'notify.dPlanRenewing':
      'Се рӯз пеш аз нав шудани обуна, то сари вақт бекор кардан имконпазир бошад.',
    'notify.dLiveCancelled':
      'Вақте ки дарси мустақиме, ки шумо ё фарзанди шумо ба он сабти ном шуда будед, бекор карда мешавад, бо сабабаш. Хомӯш кардани ин маънои онро дорад, ки шумо ҳангоми кушодани ҳуҷра огоҳ мешавед. Дарс ба ҳар ҳол мегӯяд, ки бекор шудааст ва чаро.',
    'notify.dRecordingReady':
      'Вақте ки ба дарсе, ки шумо ё фарзанди шумо дар он будед, сабт илова карда мешавад. Хомӯш кардани ин маънои онро дорад, ки шумо ҳангоми кушодани саҳифаи дарс огоҳ мешавед. Сабт ба ҳар ҳол дар ҳамон ҷост ва то даме ки сабти номи шумо эътибор дорад, онро тамошо кардан мумкин аст.',
  },
  ky: {
    'notify.lead':
      'Платформадан келген, колдонмонун ичинде көрсөтүлгөн билдирүүлөр. Алар эч бир почта кутусуна же телефонго жөнөтүлбөйт. Алар көрүнгөн жалгыз жер ушул барак.',
    'notify.unread':
      'Билдирүүлөрүңүздү азыр окуу мүмкүн болгон жок. Бул билдирүү жок дегенди билдирбейт.',
    'notify.soon': 'Алдыда',
    'notify.recent': 'Акыркылар',
    'notify.unreadCount': 'Окула элек: {count}',
    'notify.unreadMark': 'Окула элек',
    'notify.none': 'Азырынча билдирүү жок.',
    'notify.inEnglish':
      'Билдирүүлөрдүн өзү азырынча англис тилинде жазылган. Ар биринин үстүндөгү сап анын эмне жөнүндө экенин айтат.',
    'notify.classAt': 'Сабактын башталуу убактысы: {date}',
    'notify.planNamed': 'Пландын аталышы: {name}',
    'notify.renewsOn': 'Кийинки мезгилдин башталышы: {date}',
    'notify.renewCancel': 'Улантылышын каалабасаңыз, ага чейин жокко чыгарыңыз.',
    'notify.markAll': 'Баарын окулду деп белгилөө',
    'notify.marked': 'Окулду деп белгиленди: {count}',
    'notify.markFailed': 'Аларды азыр окулду деп белгилөө мүмкүн болгон жок.',
    'notify.prefsTitle': 'Сизге эмнелер билдирилет',
    'notify.prefsBody': 'Бул которгучтар ушул баракта эмне көрүнөрүн аныктайт.',
    'notify.prefsUnread':
      'Тандагандарыңызды азыр окуу мүмкүн болгон жок. Эч нерсе өзгөртүлгөн жок.',
    'notify.sumAllOn': 'Сиз тандай ала турган нерсенин баары күйгүзүлгөн.',
    'notify.sumAllOff': 'Сиз милдеттүү эмес билдирүүлөрдүн баарын өчүрүп койгонсуз.',
    'notify.sumOff': 'Өчүрүлгөн милдеттүү эмес билдирүүлөр: {count}',
    'notify.always': 'Ар дайым күйүк',
    'notify.notInUse':
      'Бул платформада азырынча колдонулбайт. Тандооңуз сакталган жана ал күйгүзүлсө, күчүнө кирет.',
    'notify.prefLocked': 'Сизге тиешелүү акча жетпей калганы тууралуу билдирүүнү өчүрүүгө болбойт.',
    'notify.prefFailed': 'Бул өзгөртүү сакталган жок.',
    'notify.prefUnsure':
      'Жооп кайткан жок. Өзгөртүү сакталган-сакталбаганын көрүү үчүн ушул баракты кайра жүктөңүз.',
    'notify.kPayoutPaid': 'Сизге төлөм жөнөтүлдү',
    'notify.kPayoutFailed': 'Бир төлөм ишке ашкан жок',
    'notify.kPayoutCancelled': 'Төлөм сурамы жокко чыгарылды',
    'notify.kMediaFailed': 'Бир жазууңуз ойнотулбайт',
    'notify.kClassStarting': 'Сабак башталганы турат',
    'notify.kPlanRenewing': 'План жакында жаңыртылат',
    'notify.kLiveCancelled': 'Сиз катышмак болгон сабак жокко чыгарылды',
    'notify.kRecordingReady': 'Сабактын жазуусу даяр',
    'notify.dPayoutPaid': 'Сизге тиешелүү акча жөнөтүлгөндө.',
    'notify.dPayoutFailed':
      'Которуу ишке ашпай калганда. Ар дайым күйүк: ушинтип билесиз, ал эми аны оңдоо көбүнчө өзүңүзгө байланыштуу.',
    'notify.dPayoutCancelled':
      'Төлөм жөнөтүлө электе кайра алынганда. Ар дайым күйүк, ийгиликсиздик менен бирдей себептен.',
    'notify.dMediaFailed':
      'Жүктөлгөн файлды ойнотууга даярдоо мүмкүн болбогондо. Муну өчүрүү аны бир окуучудан билүүнү билдирет. Бул файлдын оңдолуу-оңдолбосуна таасир этпейт.',
    'notify.dClassStarting': 'Сиз же балаңыз катышкан курстагы түз сабак тууралуу эскертме.',
    'notify.dPlanRenewing':
      'Жазылуу жаңыртыларга үч күн калганда, өз убагында жокко чыгаруу мүмкүн болушу үчүн.',
    'notify.dLiveCancelled':
      'Сиз же балаңыз катталган түз сабак жокко чыгарылганда, себеби менен кошо. Муну өчүрүү аны бөлмөнү ачканда билүүнү билдирет. Сабак баары бир жокко чыгарылганын жана эмне үчүн экенин айтып турат.',
    'notify.dRecordingReady':
      'Сиз же балаңыз катышкан сабакка жазуу кошулганда. Муну өчүрүү аны сабактын барагын ачканда билүүнү билдирет. Жазуу баары бир ошол жерде турат жана курска катталууңуз күчүндө турганда аны көрүүгө болот.',
  },
  tk: {
    'notify.lead':
      'Platformadan gelen, programmanyň içinde görkezilýän habarlar. Olar hiç bir poçta gutusyna ýa-da telefona iberilmeýär. Olaryň görünýän ýeke-täk ýeri şu sahypadyr.',
    'notify.unread': 'Bildirişleriňizi häzir okap bolmady. Bu bildiriş ýok diýmek däl.',
    'notify.soon': 'Öňde duranlar',
    'notify.recent': 'Soňkular',
    'notify.unreadCount': 'Okalmadyk: {count}',
    'notify.unreadMark': 'Okalmadyk',
    'notify.none': 'Entek habar ýok.',
    'notify.inEnglish':
      'Habarlaryň özi häzirlikçe iňlis dilinde ýazylýar. Her biriniň üstündäki setir onuň näme hakdadygyny aýdýar.',
    'notify.classAt': 'Sapagyň başlanýan wagty: {date}',
    'notify.planNamed': 'Meýilnamanyň ady: {name}',
    'notify.renewsOn': 'Indiki döwrüň başlangyjy: {date}',
    'notify.renewCancel': 'Dowam etmegini islemeýän bolsaňyz, şoňa çenli ýatyryň.',
    'notify.markAll': 'Hemmesini okalan diýip bellemek',
    'notify.marked': 'Okalan diýip bellendi: {count}',
    'notify.markFailed': 'Olary häzir okalan diýip belläp bolmady.',
    'notify.prefsTitle': 'Size nämeler habar berilýär',
    'notify.prefsBody': 'Bu açarlar şu sahypada nämäniň görünjekdigini kesgitleýär.',
    'notify.prefsUnread': 'Saýlanlaryňyzy häzir okap bolmady. Hiç zat üýtgedilmedi.',
    'notify.sumAllOn': 'Siziň saýlap bilýän zatlaryňyzyň hemmesi açyk.',
    'notify.sumAllOff': 'Siz ähli meýletin habarlary öçürip goýupsyňyz.',
    'notify.sumOff': 'Öçürilen meýletin habarlar: {count}',
    'notify.always': 'Hemişe açyk',
    'notify.notInUse':
      'Bu platformada entek ulanylmaýar. Saýlawyňyz saklandy we ol açylsa, güýje girer.',
    'notify.prefLocked': 'Size degişli puluň gelmändigi baradaky habary öçürip bolmaýar.',
    'notify.prefFailed': 'Bu üýtgeşme saklanmady.',
    'notify.prefUnsure':
      'Jogap gaýdyp gelmedi. Üýtgeşmäniň saklanandygyny ýa-da saklanmandygyny görmek üçin şu sahypany täzeden ýükläň.',
    'notify.kPayoutPaid': 'Size töleg iberildi',
    'notify.kPayoutFailed': 'Bir töleg amala aşmady',
    'notify.kPayoutCancelled': 'Töleg haýyşy ýatyryldy',
    'notify.kMediaFailed': 'Bir ýazgyňyzy oýnadyp bolmaz',
    'notify.kClassStarting': 'Sapak başlanjak bolup dur',
    'notify.kPlanRenewing': 'Meýilnama ýakynda täzelenýär',
    'notify.kLiveCancelled': 'Gatnaşjak sapagyňyz ýatyryldy',
    'notify.kRecordingReady': 'Sapagyň ýazgysy taýýar',
    'notify.dPayoutPaid': 'Size degişli pul iberilende.',
    'notify.dPayoutFailed':
      'Geçirim amala aşmanda. Hemişe açyk: şeýdip bilýärsiňiz, ony düzetmek bolsa köplenç öz eliňizde.',
    'notify.dPayoutCancelled':
      'Töleg iberilmezden öň yzyna alnanda. Hemişe açyk, şowsuzlyk bilen şol bir sebäbe görä.',
    'notify.dMediaFailed':
      'Ýüklenen faýly oýnatmak üçin taýýarlap bolmanda. Muny öçürmek ony bir okuwçydan bilmegi aňladýar. Bu faýlyň düzedilmegine ýa-da düzedilmezligine täsir etmeýär.',
    'notify.dClassStarting':
      'Siziň ýa-da çagaňyzyň gatnaşýan kursundaky göni sapak barada ýatlatma.',
    'notify.dPlanRenewing': 'Abuna täzelenmezinden üç gün öň, wagtynda ýatyrmak mümkin bolar ýaly.',
    'notify.dLiveCancelled':
      'Siziň ýa-da çagaňyzyň ýazylan göni sapagy ýatyrylanda, sebäbi bilen bilelikde. Muny öçürmek ony otagy açanyňyzda bilmegi aňladýar. Sapak şonda-da ýatyrylandygyny we näme üçindigini aýdýar.',
    'notify.dRecordingReady':
      'Siziň ýa-da çagaňyzyň gatnaşan sapagyna ýazgy goşulanda. Muny öçürmek ony sapagyň sahypasyny açanyňyzda bilmegi aňladýar. Ýazgy şonda-da şol ýerde durýar we kursa ýazgyňyz güýjünde durka oňa tomaşa edip bolýar.',
  },
  ta: {
    'notify.lead':
      'தளத்திலிருந்து வரும் செய்திகள், பயன்பாட்டுக்குள் காட்டப்படுகின்றன. இவை எந்த அஞ்சல் பெட்டிக்கும் தொலைபேசிக்கும் அனுப்பப்படுவதில்லை. இவை தோன்றும் ஒரே இடம் இந்தப் பக்கம்தான்.',
    'notify.unread':
      'உங்கள் அறிவிப்புகளை இப்போது படிக்க முடியவில்லை. அறிவிப்புகள் எதுவும் இல்லை என்று இதற்குப் பொருள் இல்லை.',
    'notify.soon': 'வரவிருப்பவை',
    'notify.recent': 'அண்மையவை',
    'notify.unreadCount': 'படிக்காதவை: {count}',
    'notify.unreadMark': 'படிக்காதது',
    'notify.none': 'இன்னும் செய்திகள் இல்லை.',
    'notify.inEnglish':
      'செய்திகள் தற்போதைக்கு ஆங்கிலத்தில் எழுதப்பட்டுள்ளன. ஒவ்வொன்றின் மேலுள்ள வரி அது எதைப் பற்றியது என்று சொல்கிறது.',
    'notify.classAt': 'வகுப்பு தொடங்கும் நேரம்: {date}',
    'notify.planNamed': 'திட்டத்தின் பெயர்: {name}',
    'notify.renewsOn': 'அடுத்த காலம் தொடங்குவது: {date}',
    'notify.renewCancel': 'இது தொடர வேண்டாம் என்றால் அதற்கு முன் ரத்து செய்யுங்கள்.',
    'notify.markAll': 'அனைத்தையும் படித்ததாகக் குறி',
    'notify.marked': 'படித்ததாகக் குறிக்கப்பட்டவை: {count}',
    'notify.markFailed': 'இவற்றை இப்போது படித்ததாகக் குறிக்க முடியவில்லை.',
    'notify.prefsTitle': 'உங்களுக்குத் தெரிவிக்கப்படுபவை',
    'notify.prefsBody':
      'இந்தப் பக்கத்தில் என்ன தோன்றும் என்பதை இந்த நிலைமாற்றிகள் தீர்மானிக்கின்றன.',
    'notify.prefsUnread':
      'நீங்கள் தேர்ந்தெடுத்தவற்றை இப்போது படிக்க முடியவில்லை. எதுவும் மாற்றப்படவில்லை.',
    'notify.sumAllOn': 'நீங்கள் தேர்ந்தெடுக்கக்கூடிய அனைத்தும் இயக்கத்தில் உள்ளன.',
    'notify.sumAllOff': 'விருப்பத்துக்குரிய எல்லாச் செய்திகளையும் நீங்கள் அணைத்துள்ளீர்கள்.',
    'notify.sumOff': 'அணைக்கப்பட்ட விருப்பத்துக்குரிய செய்திகள்: {count}',
    'notify.always': 'எப்போதும் இயக்கத்தில்',
    'notify.notInUse':
      'இந்தத் தளத்தில் இன்னும் பயன்பாட்டில் இல்லை. உங்கள் தேர்வு சேமிக்கப்பட்டுள்ளது; இது இயக்கப்பட்டால் நடைமுறைக்கு வரும்.',
    'notify.prefLocked':
      'உங்களுக்குச் சேர வேண்டிய பணம் வந்து சேரவில்லை என்று தெரிவிப்பதை அணைக்க முடியாது.',
    'notify.prefFailed': 'அந்த மாற்றம் சேமிக்கப்படவில்லை.',
    'notify.prefUnsure':
      'பதில் எதுவும் திரும்ப வரவில்லை. மாற்றம் சேமிக்கப்பட்டதா என்று பார்க்க இந்தப் பக்கத்தை மீண்டும் ஏற்றுங்கள்.',
    'notify.kPayoutPaid': 'உங்களுக்கு ஒரு பணம் செலுத்தல் அனுப்பப்பட்டது',
    'notify.kPayoutFailed': 'ஒரு பணம் செலுத்தல் நிறைவேறவில்லை',
    'notify.kPayoutCancelled': 'பணம் செலுத்தல் கோரிக்கை ஒன்று ரத்து செய்யப்பட்டது',
    'notify.kMediaFailed': 'உங்கள் பதிவு ஒன்றை இயக்க முடியாது',
    'notify.kClassStarting': 'ஒரு வகுப்பு தொடங்கவிருக்கிறது',
    'notify.kPlanRenewing': 'ஒரு திட்டம் விரைவில் புதுப்பிக்கப்படும்',
    'notify.kLiveCancelled': 'நீங்கள் கலந்துகொள்ளவிருந்த வகுப்பு ரத்து செய்யப்பட்டது',
    'notify.kRecordingReady': 'ஒரு வகுப்பின் பதிவு தயாராக உள்ளது',
    'notify.dPayoutPaid': 'உங்களுக்குச் சேர வேண்டிய பணம் அனுப்பப்பட்டதும்.',
    'notify.dPayoutFailed':
      'ஒரு பரிமாற்றம் நிறைவேறாதபோது. எப்போதும் இயக்கத்தில்: இப்படித்தான் உங்களுக்குத் தெரியவரும்; அதைச் சரிசெய்வது பெரும்பாலும் உங்கள் கையில் உள்ளது.',
    'notify.dPayoutCancelled':
      'ஒரு பணம் செலுத்தல் அனுப்பப்படும் முன் திரும்பப் பெறப்படும்போது. எப்போதும் இயக்கத்தில், தோல்விக்கான அதே காரணத்துக்காக.',
    'notify.dMediaFailed':
      'பதிவேற்றிய கோப்பை இயக்குவதற்குத் தயார் செய்ய முடியாதபோது. இதை அணைத்தால் கற்பவர் ஒருவரிடமிருந்துதான் தெரிந்துகொள்வீர்கள். கோப்பு சரிசெய்யப்படுமா என்பதை இது பாதிக்காது.',
    'notify.dClassStarting':
      'நீங்களோ உங்கள் குழந்தையோ இருக்கும் பாடநெறியின் நேரலை வகுப்புக்கான நினைவூட்டல்.',
    'notify.dPlanRenewing':
      'சந்தா புதுப்பிக்கப்படுவதற்கு மூன்று நாட்களுக்கு முன், உரிய நேரத்தில் ரத்து செய்ய முடியும்படி.',
    'notify.dLiveCancelled':
      'நீங்களோ உங்கள் குழந்தையோ சேர்ந்திருந்த நேரலை வகுப்பு ரத்து செய்யப்படும்போது, காரணத்துடன். இதை அணைத்தால் அறையைத் திறக்கும்போதுதான் தெரிந்துகொள்வீர்கள். வகுப்பு அப்போதும் தான் ரத்து செய்யப்பட்டதையும் ஏன் என்பதையும் சொல்கிறது.',
    'notify.dRecordingReady':
      'நீங்களோ உங்கள் குழந்தையோ இருந்த வகுப்புக்கு ஒரு பதிவு சேர்க்கப்படும்போது. இதை அணைத்தால் வகுப்பின் பக்கத்தைத் திறக்கும்போதுதான் தெரிந்துகொள்வீர்கள். பதிவு அப்போதும் அங்கேயே இருக்கும்; உங்கள் சேர்க்கை நீடிக்கும் வரை அதைப் பார்க்கலாம்.',
  },
  ne: {
    'notify.lead':
      'प्लेटफर्मका सन्देशहरू, जुन एप्लिकेसनभित्र देखाइन्छन्। यी कुनै इनबक्स वा फोनमा पठाइँदैनन्। यी देखिने एक मात्र ठाउँ यही पृष्ठ हो।',
    'notify.unread': 'तपाईंका सूचनाहरू अहिले पढ्न सकिएन। यसको अर्थ कुनै सूचना छैन भन्ने होइन।',
    'notify.soon': 'आउँदै गरेका',
    'notify.recent': 'हालका',
    'notify.unreadCount': 'नपढिएका: {count}',
    'notify.unreadMark': 'नपढिएको',
    'notify.none': 'अहिलेसम्म कुनै सन्देश छैन।',
    'notify.inEnglish':
      'सन्देशहरू आफैँ अहिलेका लागि अङ्ग्रेजीमा लेखिएका छन्। प्रत्येकको माथिको पङ्क्तिले त्यो के बारेमा हो भन्छ।',
    'notify.classAt': 'कक्षा सुरु हुने समय: {date}',
    'notify.planNamed': 'योजनाको नाम: {name}',
    'notify.renewsOn': 'अर्को अवधि सुरु हुने मिति: {date}',
    'notify.renewCancel': 'यो जारी रहोस् भन्ने चाहनुहुन्न भने त्यसअघि रद्द गर्नुहोस्।',
    'notify.markAll': 'सबैलाई पढिएको भनी चिह्न लगाउनुहोस्',
    'notify.marked': 'पढिएको भनी चिह्न लगाइएका: {count}',
    'notify.markFailed': 'यिनलाई अहिले पढिएको भनी चिह्न लगाउन सकिएन।',
    'notify.prefsTitle': 'तपाईंलाई के-के भनिन्छ',
    'notify.prefsBody': 'यी स्विचहरूले यो पृष्ठमा के देखिने भन्ने तय गर्छन्।',
    'notify.prefsUnread': 'तपाईंले छान्नुभएको कुरा अहिले पढ्न सकिएन। केही पनि फेरिएको छैन।',
    'notify.sumAllOn': 'तपाईंले छान्न सक्ने सबै कुरा चालु छ।',
    'notify.sumAllOff': 'तपाईंले हरेक ऐच्छिक सन्देश बन्द गर्नुभएको छ।',
    'notify.sumOff': 'बन्द गरिएका ऐच्छिक सन्देशहरू: {count}',
    'notify.always': 'सधैँ चालु',
    'notify.notInUse':
      'यो प्लेटफर्ममा अहिलेसम्म प्रयोगमा छैन। तपाईंको रोजाइ सुरक्षित छ र यो चालु भएमा लागू हुन्छ।',
    'notify.prefLocked': 'तपाईंले पाउनुपर्ने पैसा आइपुगेन भनी जानकारी दिने कुरा बन्द गर्न सकिँदैन।',
    'notify.prefFailed': 'त्यो परिवर्तन सुरक्षित भएन।',
    'notify.prefUnsure':
      'कुनै जवाफ फर्किएन। परिवर्तन सुरक्षित भयो कि भएन भनी हेर्न यो पृष्ठ फेरि लोड गर्नुहोस्।',
    'notify.kPayoutPaid': 'तपाईंलाई एउटा भुक्तानी पठाइयो',
    'notify.kPayoutFailed': 'एउटा भुक्तानी पूरा भएन',
    'notify.kPayoutCancelled': 'भुक्तानीको एउटा अनुरोध रद्द भयो',
    'notify.kMediaFailed': 'तपाईंको एउटा रेकर्डिङ बज्ने छैन',
    'notify.kClassStarting': 'एउटा कक्षा सुरु हुनै लागेको छ',
    'notify.kPlanRenewing': 'एउटा योजना चाँडै नवीकरण हुँदै छ',
    'notify.kLiveCancelled': 'तपाईं जान लाग्नुभएको कक्षा रद्द भयो',
    'notify.kRecordingReady': 'एउटा कक्षाको रेकर्डिङ तयार छ',
    'notify.dPayoutPaid': 'तपाईंले पाउनुपर्ने पैसा पठाइएपछि।',
    'notify.dPayoutFailed':
      'कुनै स्थानान्तरण पूरा नभएको बेला। सधैँ चालु: तपाईंले यसरी नै थाहा पाउनुहुन्छ, र यसलाई ठीक गर्ने काम प्रायः तपाईंकै हातमा हुन्छ।',
    'notify.dPayoutCancelled':
      'कुनै भुक्तानी पठाउनुअघि फिर्ता लिइएको बेला। सधैँ चालु, असफलताकै जस्तो कारणले।',
    'notify.dMediaFailed':
      'अपलोड गरिएको फाइल बजाउनका लागि तयार गर्न नसकिएको बेला। यो बन्द गर्नुको अर्थ कुनै सिकारुबाट थाहा पाउनु हो। फाइल ठीक हुन्छ कि हुँदैन भन्नेमा यसले असर गर्दैन।',
    'notify.dClassStarting': 'तपाईं वा तपाईंको बच्चा रहेको पाठ्यक्रमको प्रत्यक्ष कक्षाको सम्झना।',
    'notify.dPlanRenewing': 'सदस्यता नवीकरण हुनुभन्दा तीन दिनअघि, ताकि समयमै रद्द गर्न सकियोस्।',
    'notify.dLiveCancelled':
      'तपाईं वा तपाईंको बच्चा भर्ना भएको प्रत्यक्ष कक्षा रद्द भएको बेला, कारणसहित। यो बन्द गर्नुको अर्थ कोठा खोलेर मात्र थाहा पाउनु हो। कक्षाले त्यतिबेला पनि आफू रद्द भएको र किन भएको भन्छ।',
    'notify.dRecordingReady':
      'तपाईं वा तपाईंको बच्चा रहेको कक्षामा रेकर्डिङ थपिएको बेला। यो बन्द गर्नुको अर्थ कक्षाको पृष्ठ खोलेर मात्र थाहा पाउनु हो। रेकर्डिङ त्यतिबेला पनि त्यहीँ हुन्छ, र तपाईंको भर्ना कायम रहेसम्म हेर्न सकिन्छ।',
  },
};
