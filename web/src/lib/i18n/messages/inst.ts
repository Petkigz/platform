import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The page somebody opens to see the institution they belong to, or whether
 * their address could join one (`app/institution/page.tsx`), with its two
 * islands: joining and leaving, and the counts.
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts`, `reading.ts`, `restore.ts`, `phone.ts`, `merge.ts`,
 * `share.ts`, `refer.ts`, `sponsor.ts`, `orders.ts`, `billing.ts`,
 * `receipt.ts`, `notify.ts`, `plans.ts`, `subs.ts` and `policy.ts`: written
 * for the twenty-seven languages with nothing held in `held.ts`, and for no
 * other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **These are a member's words.** Joining, what joining adds a family to,
 * the counts and leaving are what anybody with an account may meet. The
 * fields an administrator fills in (the name shown, the email domain, the
 * keys) stay in English for now, and `adminEnglish` says so above them.
 *
 * **Joining says what it counts before the button.** `joinMeans` is the
 * database's own cohort: the account, and the learners in that account's
 * family. The old page said nothing about the family.
 *
 * **Nothing here says more than the counts do.** `reportWhat` and
 * `joinMeans` both say that no name is shown and that a small number can
 * still point at somebody, because both are true.
 *
 * **A refusal is a name with a sentence** (`whyLastAdmin`, `whyAlready`,
 * `whyNoMatch`, `whyNotMember`, `whySignedOut`); anything else is `failed`,
 * and a reply that never came is `unsure`, never a guess.
 *
 * What is put into a sentence comes last, after a colon, so no language has
 * to inflect it. No speaker has read any of these yet.
 */
export const INST: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'inst.title': 'المؤسسات',
    'inst.yours': 'مؤسستك',
    'inst.unread':
      'تعذّرت قراءة مؤسستك الآن. هذا لا يعني أنك لست في مؤسسة. حاول مرة أخرى بعد قليل.',
    'inst.notIn': 'لست عضوًا في مؤسسة',
    'inst.canJoin':
      'بريدك الإلكتروني على نطاق أثبتت مؤسسة أنه نطاقها، فيمكنك الانضمام إليها. لا شيء يحدث تلقائيًا: تنضم بالضغط على الزر.',
    'inst.joinMeans':
      'الانضمام يضيفك أنت والمتعلّمين في عائلتك إلى أعداد تلك المؤسسة: كم من أفرادها سجّل في كل دورة وكم أتمّها. تُعرض هذه الأعداد على أعضائها. لا يُعرض أي اسم. والعدد الصغير قد يدلّ على شخص بعينه.',
    'inst.joinDo': 'انضم إلى هذه المؤسسة',
    'inst.joinClosed':
      'الانضمام إلى مؤسسة بالبريد الإلكتروني غير متاح حاليًا. مسؤولو المؤسسة تسمّيهم المنصة.',
    'inst.noMatch':
      'لا توجد مؤسسة لها نطاق بريد متحقَّق منه يطابق عنوانك. إن كان ينبغي أن تكون مدرستك هنا، فاسأل مسؤولها.',
    'inst.haveCode': 'هل لديك رمز من مدرسة؟ يُستخدم في صفحة أخرى.',
    'inst.useCode': 'استخدم رمزًا',
    'inst.memberNote': 'أنت عضو في هذه المؤسسة. يديرها مسؤولوها. يمكنك المغادرة في أي وقت.',
    'inst.joinedOn': 'انضممت في: {date}',
    'inst.reportTitle': 'ما درسه أفرادها',
    'inst.reportWhat':
      'هذه أعداد وليست سجلات. تَعُدّ الحسابات التي انضمت، والمتعلّمين في عائلات تلك الحسابات، والدورات التي سجّل فيها هؤلاء المتعلّمون بين التاريخين، والدورات المُتمَّة والشهادات الصادرة. لا يُعرض أي اسم ولا أي عنوان بريد. المتعلّم الذي لا حساب له في هذه المؤسسة لا يُعَدّ. والعدد الصغير حتى الواحد قد يدلّ على شخص بعينه، فعامِل العدد الصغير كما تعامل الاسم.',
    'inst.from': 'من',
    'inst.to': 'إلى',
    'inst.readDo': 'اعرض هذه التواريخ',
    'inst.csvDo': 'نزّل كملف',
    'inst.statAccounts': 'الحسابات التي انضمت: {count}',
    'inst.statLearners': 'المتعلّمون في عائلاتها: {count}',
    'inst.statEnrolments': 'التسجيلات بين التاريخين: {count}',
    'inst.statFinished': 'الدورات المُتمَّة بين التاريخين: {count}',
    'inst.statCertificates': 'الشهادات الصادرة بين التاريخين: {count}',
    'inst.byCourse': 'حسب الدورة',
    'inst.colCourse': 'الدورة',
    'inst.colLearners': 'المتعلّمون',
    'inst.colEnrolments': 'التسجيلات',
    'inst.colFinished': 'المُتمَّة',
    'inst.noneEnrolled': 'لم يسجّل أحد في أي شيء بين هذين التاريخين.',
    'inst.reportUnread':
      'تعذّرت قراءة الأعداد الآن. هذا لا يعني أنه لا توجد أعداد. حاول مرة أخرى بعد قليل.',
    'inst.badWindow': 'اختر تاريخ بداية لا يأتي بعد تاريخ النهاية.',
    'inst.windowTooLong': 'اختر تاريخين لا يفصل بينهما أكثر من سنتين.',
    'inst.leaveTitle': 'المغادرة',
    'inst.leaveBody':
      'المغادرة تنهي عضويتك، ولا تُعَدّ أنت وعائلتك بعدها ضمن أعدادها. لا تحذف حسابك ولا شيئًا مما تعلّمته.',
    'inst.leaveDo': 'غادر هذه المؤسسة',
    'inst.whyLastAdmin': 'أنت مسؤولها الوحيد. يجب أن يُعيَّن شخص آخر مسؤولًا قبل أن تغادر.',
    'inst.whyAlready': 'أنت عضو في مؤسسة بالفعل.',
    'inst.whyNoMatch': 'لا يوجد نطاق بريد متحقَّق منه يطابق عنوانك، فلم تُضَف.',
    'inst.whyNotMember': 'لست عضوًا في مؤسسة.',
    'inst.failed': 'تعذّر تنفيذ ذلك. لم يتغيّر شيء.',
    'inst.unsure': 'لم نتمكّن من التأكّد من تنفيذ ذلك. افتح هذه الصفحة من جديد لترى.',
    'inst.adminEnglish': 'الأجزاء أدناه خاصة بمسؤولي هذه المؤسسة وهي بالإنجليزية حاليًا.',
    'inst.csvNote': 'العناوين داخل الملف بالإنجليزية.',
    'inst.whySignedOut': 'لقد سُجّل خروجك. سجّل الدخول وحاول مرة أخرى.',
  },
  ur: {
    'inst.title': 'ادارے',
    'inst.yours': 'آپ کا ادارہ',
    'inst.unread':
      'آپ کا ادارہ ابھی پڑھا نہیں جا سکا۔ اس کا یہ مطلب نہیں کہ آپ کسی ادارے میں نہیں ہیں۔ تھوڑی دیر میں دوبارہ کوشش کریں۔',
    'inst.notIn': 'آپ کسی ادارے میں نہیں ہیں',
    'inst.canJoin':
      'آپ کا ای میل پتہ ایسے ڈومین پر ہے جسے ایک ادارے نے اپنا ثابت کیا ہے، اس لیے آپ اس میں شامل ہو سکتے ہیں۔ کچھ بھی خود بخود نہیں ہوتا: آپ بٹن دبا کر شامل ہوتے ہیں۔',
    'inst.joinMeans':
      'شامل ہونے سے آپ اور آپ کے خاندان کے متعلمین اس ادارے کی گنتی میں آ جاتے ہیں: اس کے کتنے لوگوں نے ہر کورس میں داخلہ لیا اور کتنوں نے مکمل کیا۔ یہ گنتی اس کے ارکان کو دکھائی جاتی ہے۔ کوئی نام نہیں دکھایا جاتا۔ چھوٹی گنتی پھر بھی کسی ایک شخص کی طرف اشارہ کر سکتی ہے۔',
    'inst.joinDo': 'اس ادارے میں شامل ہوں',
    'inst.joinClosed':
      'ای میل پتے کے ذریعے کسی ادارے میں شامل ہونا اس وقت کھلا نہیں ہے۔ ادارے کے منتظمین پلیٹ فارم مقرر کرتا ہے۔',
    'inst.noMatch':
      'کسی ادارے کا کوئی جانچا ہوا ای میل ڈومین آپ کے پتے سے نہیں ملتا۔ اگر آپ کا اسکول یا مدرسہ یہاں ہونا چاہیے تو اس کے منتظم سے کہیں۔',
    'inst.haveCode': 'کیا آپ کے پاس کسی اسکول کا کوڈ ہے؟ وہ ایک دوسرے صفحے پر استعمال ہوتا ہے۔',
    'inst.useCode': 'کوڈ استعمال کریں',
    'inst.memberNote':
      'آپ اس ادارے کے رکن ہیں۔ اس کے منتظمین اسے چلاتے ہیں۔ آپ کسی بھی وقت اسے چھوڑ سکتے ہیں۔',
    'inst.joinedOn': 'آپ اس وقت شامل ہوئے: {date}',
    'inst.reportTitle': 'اس کے لوگوں نے کیا پڑھا',
    'inst.reportWhat':
      'یہ گنتی ہے، ریکارڈ نہیں۔ اس میں وہ اکاؤنٹ گنے جاتے ہیں جو شامل ہوئے، ان اکاؤنٹس کے خاندانوں کے متعلمین، وہ کورس جن میں ان متعلمین نے دونوں تاریخوں کے درمیان داخلہ لیا، مکمل کیے گئے کورس اور جاری کیے گئے سرٹیفکیٹ۔ کوئی نام اور کوئی ای میل پتہ نہیں دکھایا جاتا۔ جس متعلم کا اس ادارے میں کوئی اکاؤنٹ نہیں وہ نہیں گنا جاتا۔ ایک جتنی چھوٹی گنتی بھی کسی شخص کی طرف اشارہ کر سکتی ہے، اس لیے چھوٹی گنتی کو نام کی طرح سمجھیں۔',
    'inst.from': 'سے',
    'inst.to': 'تک',
    'inst.readDo': 'یہ تاریخیں دکھائیں',
    'inst.csvDo': 'فائل کے طور پر ڈاؤن لوڈ کریں',
    'inst.statAccounts': 'شامل ہونے والے اکاؤنٹ: {count}',
    'inst.statLearners': 'ان کے خاندانوں کے متعلمین: {count}',
    'inst.statEnrolments': 'دونوں تاریخوں کے درمیان داخلے: {count}',
    'inst.statFinished': 'دونوں تاریخوں کے درمیان مکمل ہونے والے کورس: {count}',
    'inst.statCertificates': 'دونوں تاریخوں کے درمیان جاری ہونے والے سرٹیفکیٹ: {count}',
    'inst.byCourse': 'کورس کے لحاظ سے',
    'inst.colCourse': 'کورس',
    'inst.colLearners': 'متعلمین',
    'inst.colEnrolments': 'داخلے',
    'inst.colFinished': 'مکمل',
    'inst.noneEnrolled': 'ان تاریخوں کے درمیان کسی نے کسی چیز میں داخلہ نہیں لیا۔',
    'inst.reportUnread':
      'گنتی ابھی پڑھی نہیں جا سکی۔ اس کا یہ مطلب نہیں کہ کوئی گنتی نہیں ہے۔ تھوڑی دیر میں دوبارہ کوشش کریں۔',
    'inst.badWindow': 'ایسی ابتدائی تاریخ چنیں جو آخری تاریخ کے بعد نہ ہو۔',
    'inst.windowTooLong': 'ایسی دو تاریخیں چنیں جن کے درمیان دو سال سے زیادہ کا فاصلہ نہ ہو۔',
    'inst.leaveTitle': 'چھوڑنا',
    'inst.leaveBody':
      'چھوڑنے سے آپ کی رکنیت ختم ہو جاتی ہے، اور آپ اور آپ کا خاندان اس کی گنتی میں شمار نہیں ہوتے۔ اس سے آپ کا اکاؤنٹ یا آپ کا سیکھا ہوا کچھ بھی حذف نہیں ہوتا۔',
    'inst.leaveDo': 'یہ ادارہ چھوڑیں',
    'inst.whyLastAdmin':
      'آپ اس کے واحد منتظم ہیں۔ آپ کے چھوڑنے سے پہلے کسی اور کو منتظم بنانا ضروری ہے۔',
    'inst.whyAlready': 'آپ پہلے ہی ایک ادارے کے رکن ہیں۔',
    'inst.whyNoMatch':
      'کوئی جانچا ہوا ای میل ڈومین آپ کے پتے سے نہیں ملتا، اس لیے آپ شامل نہیں کیے گئے۔',
    'inst.whyNotMember': 'آپ کسی ادارے کے رکن نہیں ہیں۔',
    'inst.failed': 'یہ نہیں ہو سکا۔ کچھ نہیں بدلا۔',
    'inst.unsure': 'ہم تصدیق نہیں کر سکے کہ یہ ہو گیا۔ دیکھنے کے لیے یہ صفحہ دوبارہ کھولیں۔',
    'inst.adminEnglish': 'نیچے کے حصے اس ادارے کے منتظمین کے لیے ہیں اور فی الحال انگریزی میں ہیں۔',
    'inst.csvNote': 'فائل کے اندر کے عنوانات انگریزی میں ہیں۔',
    'inst.whySignedOut': 'آپ سائن آؤٹ ہیں۔ سائن ان کریں اور دوبارہ کوشش کریں۔',
  },
  fa: {
    'inst.title': 'مؤسسه‌ها',
    'inst.yours': 'مؤسسهٔ شما',
    'inst.unread':
      'خواندن مؤسسهٔ شما اکنون ممکن نشد. این به آن معنا نیست که عضو مؤسسه‌ای نیستید. کمی بعد دوباره تلاش کنید.',
    'inst.notIn': 'شما عضو هیچ مؤسسه‌ای نیستید',
    'inst.canJoin':
      'نشانی ایمیل شما در دامنه‌ای است که یک مؤسسه نشان داده از آنِ خودش است، پس می‌توانید به آن بپیوندید. هیچ چیز خودبه‌خود رخ نمی‌دهد: با فشردن دکمه می‌پیوندید.',
    'inst.joinMeans':
      'پیوستن، شما و یادگیرندگان خانواده‌تان را به شمارهای آن مؤسسه می‌افزاید: چند نفر از افراد آن در هر دوره ثبت‌نام کرده‌اند و چند نفر آن را به پایان رسانده‌اند. این شمارها به اعضای آن نشان داده می‌شود. هیچ نامی نشان داده نمی‌شود. شمار کوچک هنوز می‌تواند به یک نفر اشاره کند.',
    'inst.joinDo': 'به این مؤسسه بپیوندید',
    'inst.joinClosed':
      'پیوستن به مؤسسه با نشانی ایمیل در حال حاضر باز نیست. مدیران مؤسسه را سکو تعیین می‌کند.',
    'inst.noMatch':
      'هیچ مؤسسه‌ای دامنهٔ ایمیلِ بررسی‌شده‌ای ندارد که با نشانی شما بخواند. اگر مدرسه یا مدرسهٔ دینی شما باید اینجا باشد، از مدیر آن بپرسید.',
    'inst.haveCode': 'آیا کدی از یک مدرسه دارید؟ آن کد در صفحهٔ دیگری به کار می‌رود.',
    'inst.useCode': 'استفاده از کد',
    'inst.memberNote':
      'شما عضو این مؤسسه هستید. مدیران آن ادارهٔ آن را بر عهده دارند. هر زمان بخواهید می‌توانید آن را ترک کنید.',
    'inst.joinedOn': 'زمان پیوستن شما: {date}',
    'inst.reportTitle': 'افراد آن چه خوانده‌اند',
    'inst.reportWhat':
      'این‌ها شمار هستند، نه پرونده. حساب‌هایی که پیوسته‌اند، یادگیرندگان خانواده‌های آن حساب‌ها، دوره‌هایی که آن یادگیرندگان میان دو تاریخ در آن‌ها ثبت‌نام کرده‌اند، دوره‌های به‌پایان‌رسیده و گواهی‌های صادرشده شمرده می‌شوند. هیچ نام و هیچ نشانی ایمیلی نشان داده نمی‌شود. یادگیرنده‌ای که در این مؤسسه حسابی ندارد شمرده نمی‌شود. شماری به کوچکی یک هم می‌تواند به کسی اشاره کند، پس با شمار کوچک همان‌گونه رفتار کنید که با نام.',
    'inst.from': 'از',
    'inst.to': 'تا',
    'inst.readDo': 'این تاریخ‌ها را نشان بده',
    'inst.csvDo': 'بارگیری به صورت پرونده',
    'inst.statAccounts': 'حساب‌هایی که پیوسته‌اند: {count}',
    'inst.statLearners': 'یادگیرندگان خانواده‌های آن‌ها: {count}',
    'inst.statEnrolments': 'ثبت‌نام‌ها میان دو تاریخ: {count}',
    'inst.statFinished': 'دوره‌های به‌پایان‌رسیده میان دو تاریخ: {count}',
    'inst.statCertificates': 'گواهی‌های صادرشده میان دو تاریخ: {count}',
    'inst.byCourse': 'بر پایهٔ دوره',
    'inst.colCourse': 'دوره',
    'inst.colLearners': 'یادگیرندگان',
    'inst.colEnrolments': 'ثبت‌نام‌ها',
    'inst.colFinished': 'به‌پایان‌رسیده',
    'inst.noneEnrolled': 'میان این دو تاریخ کسی در چیزی ثبت‌نام نکرده است.',
    'inst.reportUnread':
      'خواندن شمارها اکنون ممکن نشد. این به آن معنا نیست که شماری وجود ندارد. کمی بعد دوباره تلاش کنید.',
    'inst.badWindow': 'تاریخ آغازی برگزینید که پس از تاریخ پایان نباشد.',
    'inst.windowTooLong': 'دو تاریخ برگزینید که بیش از دو سال از هم فاصله نداشته باشند.',
    'inst.leaveTitle': 'ترک کردن',
    'inst.leaveBody':
      'ترک کردن عضویت شما را پایان می‌دهد و شما و خانواده‌تان دیگر در شمارهای آن شمرده نمی‌شوید. حساب شما یا هیچ‌یک از آموخته‌هایتان حذف نمی‌شود.',
    'inst.leaveDo': 'این مؤسسه را ترک کنید',
    'inst.whyLastAdmin': 'شما تنها مدیر آن هستید. پیش از ترک کردن باید کس دیگری مدیر شود.',
    'inst.whyAlready': 'شما هم‌اکنون عضو یک مؤسسه هستید.',
    'inst.whyNoMatch': 'هیچ دامنهٔ ایمیلِ بررسی‌شده‌ای با نشانی شما نمی‌خواند، پس افزوده نشدید.',
    'inst.whyNotMember': 'شما عضو هیچ مؤسسه‌ای نیستید.',
    'inst.failed': 'انجام این کار ممکن نشد. چیزی تغییر نکرد.',
    'inst.unsure':
      'نتوانستیم تأیید کنیم که این کار انجام شده است. برای دیدن، این صفحه را دوباره باز کنید.',
    'inst.adminEnglish': 'بخش‌های زیر برای مدیران این مؤسسه است و فعلاً به انگلیسی است.',
    'inst.csvNote': 'عنوان‌های درون پرونده به انگلیسی است.',
    'inst.whySignedOut': 'شما از حساب بیرون آمده‌اید. وارد شوید و دوباره تلاش کنید.',
  },
  'fa-af': {
    'inst.title': 'مؤسسه‌ها',
    'inst.yours': 'مؤسسهٔ شما',
    'inst.unread':
      'خواندن مؤسسهٔ شما فعلاً ممکن نشد. این به آن معنا نیست که عضو مؤسسه‌ای نیستید. کمی بعد دوباره کوشش کنید.',
    'inst.notIn': 'شما عضو هیچ مؤسسه‌ای نیستید',
    'inst.canJoin':
      'نشانی ایمیل شما در دومینی است که یک مؤسسه نشان داده از خودش است، پس می‌توانید به آن بپیوندید. هیچ چیز خودبه‌خود رخ نمی‌دهد: با فشار دادن دکمه می‌پیوندید.',
    'inst.joinMeans':
      'پیوستن، شما و آموزندگان خانواده‌تان را به شمارهای آن مؤسسه می‌افزاید: چند نفر از افراد آن در هر کورس ثبت‌نام کرده‌اند و چند نفر آن را تمام کرده‌اند. این شمارها به اعضای آن نشان داده می‌شود. هیچ نامی نشان داده نمی‌شود. شمار کوچک هنوز می‌تواند به یک نفر اشاره کند.',
    'inst.joinDo': 'به این مؤسسه بپیوندید',
    'inst.joinClosed':
      'پیوستن به مؤسسه با نشانی ایمیل فعلاً باز نیست. مدیران مؤسسه را پلتفرم تعیین می‌کند.',
    'inst.noMatch':
      'هیچ مؤسسه‌ای دومین ایمیلِ بررسی‌شده‌ای ندارد که با نشانی شما برابر باشد. اگر مکتب یا مدرسهٔ دینی شما باید اینجا باشد، از مدیر آن بپرسید.',
    'inst.haveCode': 'آیا کودی از یک مکتب دارید؟ آن کود در صفحهٔ دیگری به کار می‌رود.',
    'inst.useCode': 'استفاده از کود',
    'inst.memberNote':
      'شما عضو این مؤسسه هستید. مدیران آن ادارهٔ آن را بر عهده دارند. هر وقت بخواهید می‌توانید آن را ترک کنید.',
    'inst.joinedOn': 'وقت پیوستن شما: {date}',
    'inst.reportTitle': 'افراد آن چه خوانده‌اند',
    'inst.reportWhat':
      'این‌ها شمار هستند، نه دوسیه. حساب‌هایی که پیوسته‌اند، آموزندگان خانواده‌های آن حساب‌ها، کورس‌هایی که آن آموزندگان میان دو تاریخ در آن‌ها ثبت‌نام کرده‌اند، کورس‌های تمام‌شده و تصدیق‌نامه‌های صادرشده شمرده می‌شوند. هیچ نام و هیچ نشانی ایمیلی نشان داده نمی‌شود. آموزنده‌ای که در این مؤسسه حسابی ندارد شمرده نمی‌شود. شماری به کوچکی یک هم می‌تواند به کسی اشاره کند، پس با شمار کوچک همان‌گونه رفتار کنید که با نام.',
    'inst.from': 'از',
    'inst.to': 'تا',
    'inst.readDo': 'این تاریخ‌ها را نشان بده',
    'inst.csvDo': 'دانلود به شکل فایل',
    'inst.statAccounts': 'حساب‌هایی که پیوسته‌اند: {count}',
    'inst.statLearners': 'آموزندگان خانواده‌های آن‌ها: {count}',
    'inst.statEnrolments': 'ثبت‌نام‌ها میان دو تاریخ: {count}',
    'inst.statFinished': 'کورس‌های تمام‌شده میان دو تاریخ: {count}',
    'inst.statCertificates': 'تصدیق‌نامه‌های صادرشده میان دو تاریخ: {count}',
    'inst.byCourse': 'به اساس کورس',
    'inst.colCourse': 'کورس',
    'inst.colLearners': 'آموزندگان',
    'inst.colEnrolments': 'ثبت‌نام‌ها',
    'inst.colFinished': 'تمام‌شده',
    'inst.noneEnrolled': 'میان این دو تاریخ کسی در چیزی ثبت‌نام نکرده است.',
    'inst.reportUnread':
      'خواندن شمارها فعلاً ممکن نشد. این به آن معنا نیست که شماری وجود ندارد. کمی بعد دوباره کوشش کنید.',
    'inst.badWindow': 'تاریخ آغازی انتخاب کنید که پس از تاریخ پایان نباشد.',
    'inst.windowTooLong': 'دو تاریخ انتخاب کنید که بیش از دو سال از هم فاصله نداشته باشند.',
    'inst.leaveTitle': 'ترک کردن',
    'inst.leaveBody':
      'ترک کردن عضویت شما را پایان می‌دهد و شما و خانواده‌تان دیگر در شمارهای آن شمرده نمی‌شوید. حساب شما یا هیچ‌یک از آموخته‌هایتان حذف نمی‌شود.',
    'inst.leaveDo': 'این مؤسسه را ترک کنید',
    'inst.whyLastAdmin': 'شما یگانه مدیر آن هستید. پیش از ترک کردن باید کس دیگری مدیر شود.',
    'inst.whyAlready': 'شما همین حالا عضو یک مؤسسه هستید.',
    'inst.whyNoMatch': 'هیچ دومین ایمیلِ بررسی‌شده‌ای با نشانی شما برابر نیست، پس افزوده نشدید.',
    'inst.whyNotMember': 'شما عضو هیچ مؤسسه‌ای نیستید.',
    'inst.failed': 'انجام این کار ممکن نشد. چیزی تغییر نکرد.',
    'inst.unsure':
      'نتوانستیم تأیید کنیم که این کار انجام شده است. برای دیدن، این صفحه را دوباره باز کنید.',
    'inst.adminEnglish': 'بخش‌های زیر برای مدیران این مؤسسه است و فعلاً به انگلیسی است.',
    'inst.csvNote': 'عنوان‌های درون فایل به انگلیسی است.',
    'inst.whySignedOut': 'شما از حساب بیرون شده‌اید. داخل شوید و دوباره کوشش کنید.',
  },
  tr: {
    'inst.title': 'Kurumlar',
    'inst.yours': 'Kurumunuz',
    'inst.unread':
      'Kurumunuz şu anda okunamadı. Bu, bir kurumda olmadığınız anlamına gelmez. Biraz sonra yeniden deneyin.',
    'inst.notIn': 'Bir kurumda değilsiniz',
    'inst.canJoin':
      'E-posta adresiniz, bir kurumun kendisine ait olduğunu gösterdiği bir alan adında; bu yüzden o kuruma katılabilirsiniz. Hiçbir şey kendiliğinden olmaz: düğmeye basarak katılırsınız.',
    'inst.joinMeans':
      'Katılmak, sizi ve ailenizdeki öğrenenleri o kurumun sayılarına ekler: kişilerinden kaçının her kursa kaydolduğu ve kaçının bitirdiği. Bu sayılar kurumun üyelerine gösterilir. Hiçbir ad gösterilmez. Küçük bir sayı yine de bir kişiyi işaret edebilir.',
    'inst.joinDo': 'Bu kuruma katıl',
    'inst.joinClosed':
      'Bir kuruma e-posta adresiyle katılmak şu anda açık değil. Bir kurumun yöneticilerini platform belirler.',
    'inst.noMatch':
      'Hiçbir kurumun, adresinizle eşleşen denetlenmiş bir e-posta alan adı yok. Okulunuz veya medreseniz burada olmalıysa yöneticisine sorun.',
    'inst.haveCode': 'Bir okuldan aldığınız bir kod mu var? Kod başka bir sayfada kullanılır.',
    'inst.useCode': 'Kod kullan',
    'inst.memberNote':
      'Bu kurumun üyesisiniz. Kurumu yöneticileri yönetir. İstediğiniz zaman ayrılabilirsiniz.',
    'inst.joinedOn': 'Katıldığınız zaman: {date}',
    'inst.reportTitle': 'Kişileri ne çalıştı',
    'inst.reportWhat':
      'Bunlar sayıdır, kayıt değildir. Katılan hesaplar, bu hesapların ailelerindeki öğrenenler, bu öğrenenlerin iki tarih arasında kaydolduğu kurslar, bitirilen kurslar ve verilen sertifikalar sayılır. Hiçbir ad ve hiçbir e-posta adresi gösterilmez. Bu kurumda hesabı olmayan bir öğrenen sayılmaz. Bir kadar küçük bir sayı bile bir kişiyi işaret edebilir; bu yüzden küçük bir sayıya bir ada davrandığınız gibi davranın.',
    'inst.from': 'Başlangıç',
    'inst.to': 'Bitiş',
    'inst.readDo': 'Bu tarihleri göster',
    'inst.csvDo': 'Dosya olarak indir',
    'inst.statAccounts': 'Katılan hesaplar: {count}',
    'inst.statLearners': 'Ailelerindeki öğrenenler: {count}',
    'inst.statEnrolments': 'İki tarih arasındaki kayıtlar: {count}',
    'inst.statFinished': 'İki tarih arasında bitirilen kurslar: {count}',
    'inst.statCertificates': 'İki tarih arasında verilen sertifikalar: {count}',
    'inst.byCourse': 'Kursa göre',
    'inst.colCourse': 'Kurs',
    'inst.colLearners': 'Öğrenenler',
    'inst.colEnrolments': 'Kayıtlar',
    'inst.colFinished': 'Bitirilen',
    'inst.noneEnrolled': 'Bu tarihler arasında kimse hiçbir şeye kaydolmadı.',
    'inst.reportUnread':
      'Sayılar şu anda okunamadı. Bu, hiç sayı olmadığı anlamına gelmez. Biraz sonra yeniden deneyin.',
    'inst.badWindow': 'Bitiş tarihinden sonra olmayan bir başlangıç tarihi seçin.',
    'inst.windowTooLong': 'Aralarında iki yıldan fazla olmayan iki tarih seçin.',
    'inst.leaveTitle': 'Ayrılma',
    'inst.leaveBody':
      'Ayrılmak üyeliğinizi sona erdirir; siz ve aileniz artık kurumun sayılarında sayılmazsınız. Hesabınızı veya öğrendiğiniz hiçbir şeyi silmez.',
    'inst.leaveDo': 'Bu kurumdan ayrıl',
    'inst.whyLastAdmin':
      'Kurumun tek yöneticisi sizsiniz. Ayrılabilmeniz için önce başka birinin yönetici yapılması gerekir.',
    'inst.whyAlready': 'Zaten bir kurumun üyesisiniz.',
    'inst.whyNoMatch':
      'Adresinizle eşleşen denetlenmiş bir e-posta alan adı yok; bu yüzden eklenmediniz.',
    'inst.whyNotMember': 'Bir kurumun üyesi değilsiniz.',
    'inst.failed': 'Bu yapılamadı. Hiçbir şey değişmedi.',
    'inst.unsure': 'Bunun yapıldığını doğrulayamadık. Görmek için bu sayfayı yeniden açın.',
    'inst.adminEnglish':
      'Aşağıdaki bölümler bu kurumun yöneticileri içindir ve şimdilik İngilizcedir.',
    'inst.csvNote': 'Dosyanın içindeki başlıklar İngilizcedir.',
    'inst.whySignedOut': 'Oturumunuz kapalı. Oturum açıp yeniden deneyin.',
  },
  id: {
    'inst.title': 'Lembaga',
    'inst.yours': 'Lembaga Anda',
    'inst.unread':
      'Lembaga Anda tidak dapat dibaca saat ini. Ini tidak berarti Anda tidak berada di suatu lembaga. Coba lagi sebentar lagi.',
    'inst.notIn': 'Anda tidak berada di suatu lembaga',
    'inst.canJoin':
      'Alamat email Anda berada pada domain yang telah ditunjukkan suatu lembaga sebagai miliknya, jadi Anda boleh bergabung. Tidak ada yang terjadi dengan sendirinya: Anda bergabung dengan menekan tombol.',
    'inst.joinMeans':
      'Bergabung menambahkan Anda dan para pelajar di keluarga Anda ke angka lembaga itu: berapa orangnya yang mendaftar di tiap kursus dan berapa yang menyelesaikannya. Angka itu ditampilkan kepada para anggotanya. Tidak ada nama yang ditampilkan. Angka yang kecil tetap dapat menunjuk kepada seseorang.',
    'inst.joinDo': 'Bergabung dengan lembaga ini',
    'inst.joinClosed':
      'Bergabung dengan lembaga memakai alamat email belum dibuka saat ini. Pengelola suatu lembaga ditunjuk oleh platform.',
    'inst.noMatch':
      'Tidak ada lembaga yang memiliki domain email terperiksa yang cocok dengan alamat Anda. Jika sekolah atau madrasah Anda seharusnya ada di sini, tanyakan kepada pengelolanya.',
    'inst.haveCode': 'Apakah Anda punya kode dari sekolah? Kode itu dipakai di halaman lain.',
    'inst.useCode': 'Pakai kode',
    'inst.memberNote':
      'Anda anggota lembaga ini. Lembaga ini diurus oleh para pengelolanya. Anda dapat keluar kapan saja.',
    'inst.joinedOn': 'Anda bergabung pada: {date}',
    'inst.reportTitle': 'Apa yang dipelajari orang-orangnya',
    'inst.reportWhat':
      'Ini angka, bukan catatan. Yang dihitung adalah akun yang bergabung, para pelajar di keluarga akun-akun itu, kursus yang didaftari para pelajar itu di antara kedua tanggal, kursus yang diselesaikan, dan sertifikat yang diterbitkan. Tidak ada nama dan tidak ada alamat email yang ditampilkan. Pelajar yang tidak punya akun di lembaga ini tidak dihitung. Angka sekecil satu pun dapat menunjuk kepada seseorang, jadi perlakukan angka kecil seperti Anda memperlakukan nama.',
    'inst.from': 'Dari',
    'inst.to': 'Sampai',
    'inst.readDo': 'Tampilkan tanggal ini',
    'inst.csvDo': 'Unduh sebagai berkas',
    'inst.statAccounts': 'Akun yang bergabung: {count}',
    'inst.statLearners': 'Pelajar di keluarga mereka: {count}',
    'inst.statEnrolments': 'Pendaftaran di antara kedua tanggal: {count}',
    'inst.statFinished': 'Kursus yang diselesaikan di antara kedua tanggal: {count}',
    'inst.statCertificates': 'Sertifikat yang diterbitkan di antara kedua tanggal: {count}',
    'inst.byCourse': 'Per kursus',
    'inst.colCourse': 'Kursus',
    'inst.colLearners': 'Pelajar',
    'inst.colEnrolments': 'Pendaftaran',
    'inst.colFinished': 'Selesai',
    'inst.noneEnrolled': 'Tidak ada yang mendaftar apa pun di antara tanggal-tanggal ini.',
    'inst.reportUnread':
      'Angka-angka tidak dapat dibaca saat ini. Ini tidak berarti tidak ada angka. Coba lagi sebentar lagi.',
    'inst.badWindow': 'Pilih tanggal mulai yang tidak setelah tanggal akhir.',
    'inst.windowTooLong': 'Pilih dua tanggal yang berjarak tidak lebih dari dua tahun.',
    'inst.leaveTitle': 'Keluar',
    'inst.leaveBody':
      'Keluar mengakhiri keanggotaan Anda, dan Anda serta keluarga Anda tidak lagi dihitung dalam angkanya. Akun Anda dan apa pun yang telah Anda pelajari tidak dihapus.',
    'inst.leaveDo': 'Keluar dari lembaga ini',
    'inst.whyLastAdmin':
      'Anda satu-satunya pengelolanya. Orang lain harus dijadikan pengelola sebelum Anda dapat keluar.',
    'inst.whyAlready': 'Anda sudah menjadi anggota suatu lembaga.',
    'inst.whyNoMatch':
      'Tidak ada domain email terperiksa yang cocok dengan alamat Anda, jadi Anda tidak digabungkan.',
    'inst.whyNotMember': 'Anda bukan anggota suatu lembaga.',
    'inst.failed': 'Hal itu tidak dapat dilakukan. Tidak ada yang berubah.',
    'inst.unsure':
      'Kami tidak dapat memastikan bahwa hal itu telah dilakukan. Buka halaman ini lagi untuk melihatnya.',
    'inst.adminEnglish':
      'Bagian-bagian di bawah ini untuk para pengelola lembaga ini dan untuk saat ini berbahasa Inggris.',
    'inst.csvNote': 'Judul-judul di dalam berkas berbahasa Inggris.',
    'inst.whySignedOut': 'Anda sudah keluar dari akun. Masuk lalu coba lagi.',
  },
  ms: {
    'inst.title': 'Institusi',
    'inst.yours': 'Institusi anda',
    'inst.unread':
      'Institusi anda tidak dapat dibaca sekarang. Ini tidak bermakna anda tidak berada dalam mana-mana institusi. Cuba lagi sebentar lagi.',
    'inst.notIn': 'Anda tidak berada dalam mana-mana institusi',
    'inst.canJoin':
      'Alamat e-mel anda berada pada domain yang telah ditunjukkan oleh sebuah institusi sebagai miliknya, jadi anda boleh menyertainya. Tiada apa-apa berlaku dengan sendirinya: anda menyertai dengan menekan butang.',
    'inst.joinMeans':
      'Menyertai menambah anda dan pelajar dalam keluarga anda kepada angka institusi itu: berapa ramai orangnya mendaftar dalam setiap kursus dan berapa ramai yang menamatkannya. Angka itu ditunjukkan kepada ahli-ahlinya. Tiada nama ditunjukkan. Angka yang kecil masih boleh menunjuk kepada seseorang.',
    'inst.joinDo': 'Sertai institusi ini',
    'inst.joinClosed':
      'Menyertai institusi dengan alamat e-mel tidak dibuka pada masa ini. Pentadbir sesebuah institusi dilantik oleh platform.',
    'inst.noMatch':
      'Tiada institusi yang mempunyai domain e-mel yang telah disemak yang sepadan dengan alamat anda. Jika sekolah atau madrasah anda sepatutnya ada di sini, tanya pentadbirnya.',
    'inst.haveCode':
      'Adakah anda mempunyai kod daripada sekolah? Kod itu digunakan di halaman lain.',
    'inst.useCode': 'Guna kod',
    'inst.memberNote':
      'Anda ahli institusi ini. Institusi ini diurus oleh pentadbirnya. Anda boleh keluar pada bila-bila masa.',
    'inst.joinedOn': 'Anda menyertai pada: {date}',
    'inst.reportTitle': 'Apa yang dipelajari oleh orang-orangnya',
    'inst.reportWhat':
      'Ini angka, bukan rekod. Yang dikira ialah akaun yang menyertai, pelajar dalam keluarga akaun-akaun itu, kursus yang didaftar oleh pelajar itu di antara dua tarikh tersebut, kursus yang ditamatkan dan sijil yang dikeluarkan. Tiada nama dan tiada alamat e-mel ditunjukkan. Pelajar yang tiada akaun dalam institusi ini tidak dikira. Angka sekecil satu pun boleh menunjuk kepada seseorang, jadi layan angka kecil seperti anda melayan nama.',
    'inst.from': 'Dari',
    'inst.to': 'Hingga',
    'inst.readDo': 'Tunjukkan tarikh ini',
    'inst.csvDo': 'Muat turun sebagai fail',
    'inst.statAccounts': 'Akaun yang menyertai: {count}',
    'inst.statLearners': 'Pelajar dalam keluarga mereka: {count}',
    'inst.statEnrolments': 'Pendaftaran di antara dua tarikh: {count}',
    'inst.statFinished': 'Kursus yang ditamatkan di antara dua tarikh: {count}',
    'inst.statCertificates': 'Sijil yang dikeluarkan di antara dua tarikh: {count}',
    'inst.byCourse': 'Mengikut kursus',
    'inst.colCourse': 'Kursus',
    'inst.colLearners': 'Pelajar',
    'inst.colEnrolments': 'Pendaftaran',
    'inst.colFinished': 'Tamat',
    'inst.noneEnrolled': 'Tiada sesiapa mendaftar apa-apa di antara tarikh-tarikh ini.',
    'inst.reportUnread':
      'Angka-angka tidak dapat dibaca sekarang. Ini tidak bermakna tiada angka. Cuba lagi sebentar lagi.',
    'inst.badWindow': 'Pilih tarikh mula yang tidak selepas tarikh akhir.',
    'inst.windowTooLong': 'Pilih dua tarikh yang jaraknya tidak lebih daripada dua tahun.',
    'inst.leaveTitle': 'Keluar',
    'inst.leaveBody':
      'Keluar menamatkan keahlian anda, dan anda serta keluarga anda tidak lagi dikira dalam angkanya. Akaun anda dan apa-apa yang telah anda pelajari tidak dipadam.',
    'inst.leaveDo': 'Keluar daripada institusi ini',
    'inst.whyLastAdmin':
      'Anda satu-satunya pentadbirnya. Orang lain perlu dijadikan pentadbir sebelum anda boleh keluar.',
    'inst.whyAlready': 'Anda sudah menjadi ahli sebuah institusi.',
    'inst.whyNoMatch':
      'Tiada domain e-mel yang telah disemak yang sepadan dengan alamat anda, jadi anda tidak disertakan.',
    'inst.whyNotMember': 'Anda bukan ahli mana-mana institusi.',
    'inst.failed': 'Perkara itu tidak dapat dilakukan. Tiada apa-apa yang berubah.',
    'inst.unsure':
      'Kami tidak dapat mengesahkan bahawa perkara itu telah dilakukan. Buka halaman ini semula untuk melihatnya.',
    'inst.adminEnglish':
      'Bahagian di bawah adalah untuk pentadbir institusi ini dan buat masa ini dalam bahasa Inggeris.',
    'inst.csvNote': 'Tajuk-tajuk di dalam fail adalah dalam bahasa Inggeris.',
    'inst.whySignedOut': 'Anda telah log keluar. Log masuk dan cuba lagi.',
  },
  bn: {
    'inst.title': 'প্রতিষ্ঠান',
    'inst.yours': 'আপনার প্রতিষ্ঠান',
    'inst.unread':
      'আপনার প্রতিষ্ঠান এখন পড়া যায়নি। এর মানে এই নয় যে আপনি কোনো প্রতিষ্ঠানে নেই। একটু পরে আবার চেষ্টা করুন।',
    'inst.notIn': 'আপনি কোনো প্রতিষ্ঠানে নেই',
    'inst.canJoin':
      'আপনার ইমেইল ঠিকানা এমন একটি ডোমেইনে আছে যা একটি প্রতিষ্ঠান নিজের বলে দেখিয়েছে, তাই আপনি তাতে যোগ দিতে পারেন। কিছুই নিজে থেকে ঘটে না: বোতাম চেপে আপনি যোগ দেন।',
    'inst.joinMeans':
      'যোগ দিলে আপনি এবং আপনার পরিবারের শিক্ষার্থীরা সেই প্রতিষ্ঠানের সংখ্যায় যুক্ত হন: তার কতজন প্রতিটি কোর্সে ভর্তি হয়েছে এবং কতজন শেষ করেছে। এই সংখ্যা তার সদস্যদের দেখানো হয়। কোনো নাম দেখানো হয় না। ছোট সংখ্যা তবু কোনো একজনকে নির্দেশ করতে পারে।',
    'inst.joinDo': 'এই প্রতিষ্ঠানে যোগ দিন',
    'inst.joinClosed':
      'ইমেইল ঠিকানা দিয়ে কোনো প্রতিষ্ঠানে যোগ দেওয়া এই মুহূর্তে খোলা নেই। প্রতিষ্ঠানের প্রশাসকদের প্ল্যাটফর্ম নিযুক্ত করে।',
    'inst.noMatch':
      'কোনো প্রতিষ্ঠানের এমন যাচাই করা ইমেইল ডোমেইন নেই যা আপনার ঠিকানার সঙ্গে মেলে। আপনার স্কুল বা মাদ্রাসার এখানে থাকার কথা হলে তার প্রশাসককে জিজ্ঞাসা করুন।',
    'inst.haveCode': 'আপনার কাছে কি কোনো স্কুলের কোড আছে? সেটি অন্য একটি পাতায় ব্যবহার করা হয়।',
    'inst.useCode': 'কোড ব্যবহার করুন',
    'inst.memberNote':
      'আপনি এই প্রতিষ্ঠানের সদস্য। এর প্রশাসকেরা এটি পরিচালনা করেন। আপনি যেকোনো সময় ছেড়ে যেতে পারেন।',
    'inst.joinedOn': 'আপনি যোগ দিয়েছেন এই সময়ে: {date}',
    'inst.reportTitle': 'এর লোকেরা কী পড়েছে',
    'inst.reportWhat':
      'এগুলো সংখ্যা, নথি নয়। যে অ্যাকাউন্টগুলো যোগ দিয়েছে, সেই অ্যাকাউন্টগুলোর পরিবারের শিক্ষার্থী, দুই তারিখের মধ্যে সেই শিক্ষার্থীরা যে কোর্সে ভর্তি হয়েছে, শেষ করা কোর্স এবং দেওয়া সনদ গোনা হয়। কোনো নাম বা কোনো ইমেইল ঠিকানা দেখানো হয় না। এই প্রতিষ্ঠানে যার অ্যাকাউন্ট নেই এমন শিক্ষার্থীকে গোনা হয় না। এক-এর মতো ছোট সংখ্যাও কাউকে নির্দেশ করতে পারে, তাই ছোট সংখ্যাকে নামের মতোই গণ্য করুন।',
    'inst.from': 'থেকে',
    'inst.to': 'পর্যন্ত',
    'inst.readDo': 'এই তারিখগুলো দেখান',
    'inst.csvDo': 'ফাইল হিসেবে ডাউনলোড করুন',
    'inst.statAccounts': 'যোগ দেওয়া অ্যাকাউন্ট: {count}',
    'inst.statLearners': 'তাদের পরিবারের শিক্ষার্থী: {count}',
    'inst.statEnrolments': 'দুই তারিখের মধ্যে ভর্তি: {count}',
    'inst.statFinished': 'দুই তারিখের মধ্যে শেষ করা কোর্স: {count}',
    'inst.statCertificates': 'দুই তারিখের মধ্যে দেওয়া সনদ: {count}',
    'inst.byCourse': 'কোর্স অনুযায়ী',
    'inst.colCourse': 'কোর্স',
    'inst.colLearners': 'শিক্ষার্থী',
    'inst.colEnrolments': 'ভর্তি',
    'inst.colFinished': 'শেষ হয়েছে',
    'inst.noneEnrolled': 'এই তারিখগুলোর মধ্যে কেউ কিছুতে ভর্তি হয়নি।',
    'inst.reportUnread':
      'সংখ্যাগুলো এখন পড়া যায়নি। এর মানে এই নয় যে কোনো সংখ্যা নেই। একটু পরে আবার চেষ্টা করুন।',
    'inst.badWindow': 'এমন শুরুর তারিখ বেছে নিন যা শেষের তারিখের পরে নয়।',
    'inst.windowTooLong': 'এমন দুটি তারিখ বেছে নিন যাদের ব্যবধান দুই বছরের বেশি নয়।',
    'inst.leaveTitle': 'ছেড়ে যাওয়া',
    'inst.leaveBody':
      'ছেড়ে গেলে আপনার সদস্যপদ শেষ হয়, এবং আপনি ও আপনার পরিবার আর এর সংখ্যায় গণ্য হন না। এতে আপনার অ্যাকাউন্ট বা আপনি যা শিখেছেন তার কিছুই মুছে যায় না।',
    'inst.leaveDo': 'এই প্রতিষ্ঠান ছেড়ে যান',
    'inst.whyLastAdmin':
      'আপনি এর একমাত্র প্রশাসক। আপনি ছেড়ে যাওয়ার আগে অন্য কাউকে প্রশাসক করতে হবে।',
    'inst.whyAlready': 'আপনি ইতিমধ্যে একটি প্রতিষ্ঠানের সদস্য।',
    'inst.whyNoMatch':
      'কোনো যাচাই করা ইমেইল ডোমেইন আপনার ঠিকানার সঙ্গে মেলে না, তাই আপনাকে যুক্ত করা হয়নি।',
    'inst.whyNotMember': 'আপনি কোনো প্রতিষ্ঠানের সদস্য নন।',
    'inst.failed': 'এটি করা যায়নি। কিছুই বদলায়নি।',
    'inst.unsure': 'এটি করা হয়েছে কি না আমরা নিশ্চিত করতে পারিনি। দেখতে এই পাতা আবার খুলুন।',
    'inst.adminEnglish': 'নিচের অংশগুলো এই প্রতিষ্ঠানের প্রশাসকদের জন্য এবং আপাতত ইংরেজিতে আছে।',
    'inst.csvNote': 'ফাইলের ভেতরের শিরোনামগুলো ইংরেজিতে আছে।',
    'inst.whySignedOut': 'আপনি সাইন আউট অবস্থায় আছেন। সাইন ইন করে আবার চেষ্টা করুন।',
  },
  hi: {
    'inst.title': 'संस्थाएँ',
    'inst.yours': 'आपकी संस्था',
    'inst.unread':
      'आपकी संस्था अभी पढ़ी नहीं जा सकी। इसका यह अर्थ नहीं कि आप किसी संस्था में नहीं हैं। थोड़ी देर में फिर कोशिश करें।',
    'inst.notIn': 'आप किसी संस्था में नहीं हैं',
    'inst.canJoin':
      'आपका ईमेल पता ऐसे डोमेन पर है जिसे एक संस्था ने अपना दिखाया है, इसलिए आप उसमें शामिल हो सकते हैं। कुछ भी अपने आप नहीं होता: आप बटन दबाकर शामिल होते हैं।',
    'inst.joinMeans':
      'शामिल होने से आप और आपके परिवार के शिक्षार्थी उस संस्था की गिनती में जुड़ जाते हैं: उसके कितने लोगों ने हर कोर्स में नामांकन किया और कितनों ने उसे पूरा किया। यह गिनती उसके सदस्यों को दिखाई जाती है। कोई नाम नहीं दिखाया जाता। छोटी गिनती फिर भी किसी एक व्यक्ति की ओर इशारा कर सकती है।',
    'inst.joinDo': 'इस संस्था में शामिल हों',
    'inst.joinClosed':
      'ईमेल पते से किसी संस्था में शामिल होना इस समय खुला नहीं है। संस्था के प्रशासक प्लेटफ़ॉर्म नियुक्त करता है।',
    'inst.noMatch':
      'किसी संस्था का कोई जाँचा हुआ ईमेल डोमेन आपके पते से मेल नहीं खाता। अगर आपका स्कूल या मदरसा यहाँ होना चाहिए, तो उसके प्रशासक से पूछें।',
    'inst.haveCode': 'क्या आपके पास किसी स्कूल का कोड है? वह दूसरे पृष्ठ पर इस्तेमाल होता है।',
    'inst.useCode': 'कोड इस्तेमाल करें',
    'inst.memberNote':
      'आप इस संस्था के सदस्य हैं। इसके प्रशासक इसे चलाते हैं। आप किसी भी समय इसे छोड़ सकते हैं।',
    'inst.joinedOn': 'आप इस समय शामिल हुए: {date}',
    'inst.reportTitle': 'इसके लोगों ने क्या पढ़ा',
    'inst.reportWhat':
      'यह गिनती है, रिकॉर्ड नहीं। इसमें वे खाते गिने जाते हैं जो शामिल हुए, उन खातों के परिवारों के शिक्षार्थी, वे कोर्स जिनमें उन शिक्षार्थियों ने दोनों तारीखों के बीच नामांकन किया, पूरे किए गए कोर्स और जारी किए गए प्रमाणपत्र। कोई नाम और कोई ईमेल पता नहीं दिखाया जाता। जिस शिक्षार्थी का इस संस्था में कोई खाता नहीं है वह नहीं गिना जाता। एक जितनी छोटी गिनती भी किसी व्यक्ति की ओर इशारा कर सकती है, इसलिए छोटी गिनती को नाम की तरह ही समझें।',
    'inst.from': 'से',
    'inst.to': 'तक',
    'inst.readDo': 'ये तारीखें दिखाएँ',
    'inst.csvDo': 'फ़ाइल के रूप में डाउनलोड करें',
    'inst.statAccounts': 'शामिल हुए खाते: {count}',
    'inst.statLearners': 'उनके परिवारों के शिक्षार्थी: {count}',
    'inst.statEnrolments': 'दोनों तारीखों के बीच नामांकन: {count}',
    'inst.statFinished': 'दोनों तारीखों के बीच पूरे किए गए कोर्स: {count}',
    'inst.statCertificates': 'दोनों तारीखों के बीच जारी प्रमाणपत्र: {count}',
    'inst.byCourse': 'कोर्स के अनुसार',
    'inst.colCourse': 'कोर्स',
    'inst.colLearners': 'शिक्षार्थी',
    'inst.colEnrolments': 'नामांकन',
    'inst.colFinished': 'पूरे हुए',
    'inst.noneEnrolled': 'इन तारीखों के बीच किसी ने किसी चीज़ में नामांकन नहीं किया।',
    'inst.reportUnread':
      'गिनती अभी पढ़ी नहीं जा सकी। इसका यह अर्थ नहीं कि कोई गिनती नहीं है। थोड़ी देर में फिर कोशिश करें।',
    'inst.badWindow': 'ऐसी आरंभ तारीख चुनें जो अंतिम तारीख के बाद न हो।',
    'inst.windowTooLong': 'ऐसी दो तारीखें चुनें जिनके बीच दो साल से अधिक का अंतर न हो।',
    'inst.leaveTitle': 'छोड़ना',
    'inst.leaveBody':
      'छोड़ने से आपकी सदस्यता समाप्त हो जाती है, और आप तथा आपका परिवार इसकी गिनती में नहीं गिने जाते। इससे आपका खाता या आपका सीखा हुआ कुछ भी नहीं मिटता।',
    'inst.leaveDo': 'यह संस्था छोड़ें',
    'inst.whyLastAdmin':
      'आप इसके एकमात्र प्रशासक हैं। आपके छोड़ने से पहले किसी और को प्रशासक बनाना होगा।',
    'inst.whyAlready': 'आप पहले से एक संस्था के सदस्य हैं।',
    'inst.whyNoMatch':
      'कोई जाँचा हुआ ईमेल डोमेन आपके पते से मेल नहीं खाता, इसलिए आपको शामिल नहीं किया गया।',
    'inst.whyNotMember': 'आप किसी संस्था के सदस्य नहीं हैं।',
    'inst.failed': 'यह नहीं हो सका। कुछ नहीं बदला।',
    'inst.unsure': 'हम पुष्टि नहीं कर सके कि यह हो गया। देखने के लिए यह पृष्ठ फिर खोलें।',
    'inst.adminEnglish': 'नीचे के भाग इस संस्था के प्रशासकों के लिए हैं और अभी अंग्रेज़ी में हैं।',
    'inst.csvNote': 'फ़ाइल के अंदर के शीर्षक अंग्रेज़ी में हैं।',
    'inst.whySignedOut': 'आप साइन आउट हैं। साइन इन करके फिर कोशिश करें।',
  },
  fr: {
    'inst.title': 'Établissements',
    'inst.yours': 'Votre établissement',
    'inst.unread':
      'Votre établissement n’a pas pu être lu pour l’instant. Cela ne veut pas dire que vous n’êtes dans aucun établissement. Réessayez dans un instant.',
    'inst.notIn': 'Vous n’êtes dans aucun établissement',
    'inst.canJoin':
      'Votre adresse e-mail relève d’un domaine dont un établissement a montré qu’il est le sien ; vous pouvez donc le rejoindre. Rien ne se fait tout seul : vous le rejoignez en appuyant sur le bouton.',
    'inst.joinMeans':
      'En le rejoignant, vous et les apprenants de votre famille entrez dans les chiffres de cet établissement : combien de ses personnes se sont inscrites à chaque cours et combien l’ont terminé. Ces chiffres sont montrés à ses membres. Aucun nom n’est montré. Un petit chiffre peut tout de même désigner quelqu’un.',
    'inst.joinDo': 'Rejoindre cet établissement',
    'inst.joinClosed':
      'Rejoindre un établissement avec une adresse e-mail n’est pas ouvert pour le moment. Les administrateurs d’un établissement sont désignés par la plateforme.',
    'inst.noMatch':
      'Aucun établissement n’a de domaine e-mail vérifié qui corresponde à votre adresse. Si votre école ou votre madrasa devrait être ici, demandez à son administrateur.',
    'inst.haveCode': 'Avez-vous un code remis par une école ? Il s’utilise sur une autre page.',
    'inst.useCode': 'Utiliser un code',
    'inst.memberNote':
      'Vous êtes membre de cet établissement. Ses administrateurs le gèrent. Vous pouvez le quitter à tout moment.',
    'inst.joinedOn': 'Vous l’avez rejoint le : {date}',
    'inst.reportTitle': 'Ce que ses personnes ont étudié',
    'inst.reportWhat':
      'Ce sont des chiffres, pas des dossiers. Sont comptés les comptes qui ont rejoint l’établissement, les apprenants des familles de ces comptes, les cours auxquels ces apprenants se sont inscrits entre les deux dates, les cours terminés et les certificats délivrés. Aucun nom ni aucune adresse e-mail n’est montré. Un apprenant sans compte dans cet établissement n’est pas compté. Un chiffre aussi petit que un peut désigner quelqu’un ; traitez donc un petit chiffre comme vous traiteriez un nom.',
    'inst.from': 'Du',
    'inst.to': 'Au',
    'inst.readDo': 'Afficher ces dates',
    'inst.csvDo': 'Télécharger en fichier',
    'inst.statAccounts': 'Comptes qui l’ont rejoint : {count}',
    'inst.statLearners': 'Apprenants de leurs familles : {count}',
    'inst.statEnrolments': 'Inscriptions entre les deux dates : {count}',
    'inst.statFinished': 'Cours terminés entre les deux dates : {count}',
    'inst.statCertificates': 'Certificats délivrés entre les deux dates : {count}',
    'inst.byCourse': 'Par cours',
    'inst.colCourse': 'Cours',
    'inst.colLearners': 'Apprenants',
    'inst.colEnrolments': 'Inscriptions',
    'inst.colFinished': 'Terminés',
    'inst.noneEnrolled': 'Personne ne s’est inscrit à quoi que ce soit entre ces dates.',
    'inst.reportUnread':
      'Les chiffres n’ont pas pu être lus pour l’instant. Cela ne veut pas dire qu’il n’y en a pas. Réessayez dans un instant.',
    'inst.badWindow': 'Choisissez une date de début qui ne soit pas postérieure à la date de fin.',
    'inst.windowTooLong': 'Choisissez deux dates séparées de deux ans au plus.',
    'inst.leaveTitle': 'Quitter',
    'inst.leaveBody':
      'Quitter met fin à votre adhésion, et vous et votre famille n’êtes plus comptés dans ses chiffres. Cela ne supprime ni votre compte ni rien de ce que vous avez appris.',
    'inst.leaveDo': 'Quitter cet établissement',
    'inst.whyLastAdmin':
      'Vous en êtes le seul administrateur. Une autre personne doit devenir administrateur avant que vous puissiez partir.',
    'inst.whyAlready': 'Vous appartenez déjà à un établissement.',
    'inst.whyNoMatch':
      'Aucun domaine e-mail vérifié ne correspond à votre adresse ; vous n’avez donc pas été ajouté.',
    'inst.whyNotMember': 'Vous n’êtes membre d’aucun établissement.',
    'inst.failed': 'Cela n’a pas pu être fait. Rien n’a été modifié.',
    'inst.unsure':
      'Nous n’avons pas pu confirmer que cela a été fait. Rouvrez cette page pour le voir.',
    'inst.adminEnglish':
      'Les parties ci-dessous sont destinées aux administrateurs de cet établissement et sont en anglais pour le moment.',
    'inst.csvNote': 'Les intitulés à l’intérieur du fichier sont en anglais.',
    'inst.whySignedOut': 'Vous êtes déconnecté. Connectez-vous et réessayez.',
  },
  es: {
    'inst.title': 'Instituciones',
    'inst.yours': 'Su institución',
    'inst.unread':
      'Su institución no se pudo leer en este momento. Esto no significa que no esté en ninguna. Inténtelo de nuevo en un momento.',
    'inst.notIn': 'No está en ninguna institución',
    'inst.canJoin':
      'Su dirección de correo está en un dominio que una institución ha demostrado que es suyo, así que puede unirse a ella. Nada ocurre por sí solo: usted se une al pulsar el botón.',
    'inst.joinMeans':
      'Al unirse, usted y los estudiantes de su familia entran en las cifras de esa institución: cuántas de sus personas se inscribieron en cada curso y cuántas lo terminaron. Esas cifras se muestran a sus miembros. No se muestra ningún nombre. Una cifra pequeña puede aun así señalar a alguien.',
    'inst.joinDo': 'Unirse a esta institución',
    'inst.joinClosed':
      'Unirse a una institución con una dirección de correo no está abierto por ahora. La plataforma nombra a los administradores de una institución.',
    'inst.noMatch':
      'Ninguna institución tiene un dominio de correo comprobado que coincida con su dirección. Si su escuela o madrasa debería estar aquí, pregunte a su administrador.',
    'inst.haveCode': '¿Tiene un código de una escuela? Se usa en otra página.',
    'inst.useCode': 'Usar un código',
    'inst.memberNote':
      'Usted es miembro de esta institución. Sus administradores la gestionan. Puede salir en cualquier momento.',
    'inst.joinedOn': 'Se unió el: {date}',
    'inst.reportTitle': 'Lo que estudiaron sus personas',
    'inst.reportWhat':
      'Estas son cifras, no expedientes. Se cuentan las cuentas que se unieron, los estudiantes de las familias de esas cuentas, los cursos en los que esos estudiantes se inscribieron entre las dos fechas, los cursos terminados y los certificados emitidos. No se muestra ningún nombre ni ninguna dirección de correo. Un estudiante sin cuenta en esta institución no se cuenta. Una cifra tan pequeña como uno puede señalar a alguien, así que trate una cifra pequeña como trataría un nombre.',
    'inst.from': 'Desde',
    'inst.to': 'Hasta',
    'inst.readDo': 'Mostrar estas fechas',
    'inst.csvDo': 'Descargar como archivo',
    'inst.statAccounts': 'Cuentas que se unieron: {count}',
    'inst.statLearners': 'Estudiantes de sus familias: {count}',
    'inst.statEnrolments': 'Inscripciones entre las dos fechas: {count}',
    'inst.statFinished': 'Cursos terminados entre las dos fechas: {count}',
    'inst.statCertificates': 'Certificados emitidos entre las dos fechas: {count}',
    'inst.byCourse': 'Por curso',
    'inst.colCourse': 'Curso',
    'inst.colLearners': 'Estudiantes',
    'inst.colEnrolments': 'Inscripciones',
    'inst.colFinished': 'Terminados',
    'inst.noneEnrolled': 'Nadie se inscribió en nada entre estas fechas.',
    'inst.reportUnread':
      'Las cifras no se pudieron leer en este momento. Esto no significa que no haya ninguna. Inténtelo de nuevo en un momento.',
    'inst.badWindow': 'Elija una fecha de inicio que no sea posterior a la fecha final.',
    'inst.windowTooLong': 'Elija dos fechas separadas por no más de dos años.',
    'inst.leaveTitle': 'Salir',
    'inst.leaveBody':
      'Salir pone fin a su membresía, y usted y su familia dejan de contarse en sus cifras. No elimina su cuenta ni nada de lo que ha aprendido.',
    'inst.leaveDo': 'Salir de esta institución',
    'inst.whyLastAdmin':
      'Usted es su único administrador. Otra persona tiene que ser nombrada administradora antes de que usted pueda salir.',
    'inst.whyAlready': 'Usted ya pertenece a una institución.',
    'inst.whyNoMatch':
      'Ningún dominio de correo comprobado coincide con su dirección, así que no se le añadió.',
    'inst.whyNotMember': 'Usted no es miembro de ninguna institución.',
    'inst.failed': 'Eso no se pudo hacer. No se cambió nada.',
    'inst.unsure': 'No pudimos confirmar que eso se hizo. Abra esta página de nuevo para verlo.',
    'inst.adminEnglish':
      'Las partes de abajo son para los administradores de esta institución y por ahora están en inglés.',
    'inst.csvNote': 'Los encabezados dentro del archivo están en inglés.',
    'inst.whySignedOut': 'Su sesión está cerrada. Inicie sesión e inténtelo de nuevo.',
  },
  pt: {
    'inst.title': 'Instituições',
    'inst.yours': 'A sua instituição',
    'inst.unread':
      'Não foi possível ler a sua instituição neste momento. Isto não significa que não esteja em nenhuma. Tente de novo daqui a pouco.',
    'inst.notIn': 'Não está em nenhuma instituição',
    'inst.canJoin':
      'O seu endereço de e-mail está num domínio que uma instituição mostrou ser seu, por isso pode aderir a ela. Nada acontece sozinho: adere ao carregar no botão.',
    'inst.joinMeans':
      'Ao aderir, você e os aprendentes da sua família entram nos números dessa instituição: quantas das suas pessoas se inscreveram em cada curso e quantas o concluíram. Esses números são mostrados aos seus membros. Nenhum nome é mostrado. Um número pequeno pode ainda assim apontar para alguém.',
    'inst.joinDo': 'Aderir a esta instituição',
    'inst.joinClosed':
      'Aderir a uma instituição com um endereço de e-mail não está aberto de momento. Os administradores de uma instituição são nomeados pela plataforma.',
    'inst.noMatch':
      'Nenhuma instituição tem um domínio de e-mail verificado que corresponda ao seu endereço. Se a sua escola ou madraça devia estar aqui, pergunte ao administrador dela.',
    'inst.haveCode': 'Tem um código de uma escola? É usado noutra página.',
    'inst.useCode': 'Usar um código',
    'inst.memberNote':
      'É membro desta instituição. Os administradores dela gerem-na. Pode sair em qualquer altura.',
    'inst.joinedOn': 'Aderiu em: {date}',
    'inst.reportTitle': 'O que as suas pessoas estudaram',
    'inst.reportWhat':
      'Estes são números, não registos. Contam-se as contas que aderiram, os aprendentes das famílias dessas contas, os cursos em que esses aprendentes se inscreveram entre as duas datas, os cursos concluídos e os certificados emitidos. Nenhum nome e nenhum endereço de e-mail é mostrado. Um aprendente sem conta nesta instituição não é contado. Um número tão pequeno como um pode apontar para alguém, por isso trate um número pequeno como trataria um nome.',
    'inst.from': 'De',
    'inst.to': 'Até',
    'inst.readDo': 'Mostrar estas datas',
    'inst.csvDo': 'Descarregar como ficheiro',
    'inst.statAccounts': 'Contas que aderiram: {count}',
    'inst.statLearners': 'Aprendentes das famílias delas: {count}',
    'inst.statEnrolments': 'Inscrições entre as duas datas: {count}',
    'inst.statFinished': 'Cursos concluídos entre as duas datas: {count}',
    'inst.statCertificates': 'Certificados emitidos entre as duas datas: {count}',
    'inst.byCourse': 'Por curso',
    'inst.colCourse': 'Curso',
    'inst.colLearners': 'Aprendentes',
    'inst.colEnrolments': 'Inscrições',
    'inst.colFinished': 'Concluídos',
    'inst.noneEnrolled': 'Ninguém se inscreveu em nada entre estas datas.',
    'inst.reportUnread':
      'Não foi possível ler os números neste momento. Isto não significa que não haja nenhum. Tente de novo daqui a pouco.',
    'inst.badWindow': 'Escolha uma data de início que não seja posterior à data de fim.',
    'inst.windowTooLong': 'Escolha duas datas com não mais de dois anos de intervalo.',
    'inst.leaveTitle': 'Sair',
    'inst.leaveBody':
      'Sair termina a sua adesão, e você e a sua família deixam de ser contados nos números dela. Não apaga a sua conta nem nada do que aprendeu.',
    'inst.leaveDo': 'Sair desta instituição',
    'inst.whyLastAdmin':
      'É o único administrador dela. Outra pessoa tem de passar a administrador antes de poder sair.',
    'inst.whyAlready': 'Já pertence a uma instituição.',
    'inst.whyNoMatch':
      'Nenhum domínio de e-mail verificado corresponde ao seu endereço, por isso não foi adicionado.',
    'inst.whyNotMember': 'Não é membro de nenhuma instituição.',
    'inst.failed': 'Não foi possível fazer isso. Nada foi alterado.',
    'inst.unsure':
      'Não conseguimos confirmar que isso foi feito. Abra esta página de novo para ver.',
    'inst.adminEnglish':
      'As partes abaixo destinam-se aos administradores desta instituição e, por agora, estão em inglês.',
    'inst.csvNote': 'Os títulos dentro do ficheiro estão em inglês.',
    'inst.whySignedOut': 'A sua sessão está terminada. Inicie sessão e tente de novo.',
  },
  sw: {
    'inst.title': 'Taasisi',
    'inst.yours': 'Taasisi yako',
    'inst.unread':
      'Taasisi yako haikuweza kusomwa sasa hivi. Hii haimaanishi kwamba hauko katika taasisi yoyote. Jaribu tena baada ya muda mfupi.',
    'inst.notIn': 'Hauko katika taasisi yoyote',
    'inst.canJoin':
      'Anwani yako ya barua pepe iko kwenye kikoa ambacho taasisi imeonyesha kuwa ni chake, kwa hiyo unaweza kujiunga nayo. Hakuna kinachotokea chenyewe: unajiunga kwa kubonyeza kitufe.',
    'inst.joinMeans':
      'Kujiunga kunakuongeza wewe na wanafunzi wa familia yako kwenye idadi za taasisi hiyo: wangapi kati ya watu wake walijiandikisha katika kila kozi na wangapi walimaliza. Idadi hizo huonyeshwa kwa wanachama wake. Hakuna jina linaloonyeshwa. Idadi ndogo bado inaweza kumwelekeza mtu fulani.',
    'inst.joinDo': 'Jiunge na taasisi hii',
    'inst.joinClosed':
      'Kujiunga na taasisi kwa anwani ya barua pepe hakujafunguliwa kwa sasa. Wasimamizi wa taasisi huteuliwa na jukwaa.',
    'inst.noMatch':
      'Hakuna taasisi yenye kikoa cha barua pepe kilichokaguliwa kinacholingana na anwani yako. Ikiwa shule au madrasa yako inapaswa kuwa hapa, muulize msimamizi wake.',
    'inst.haveCode': 'Je, una msimbo kutoka shuleni? Unatumika kwenye ukurasa mwingine.',
    'inst.useCode': 'Tumia msimbo',
    'inst.memberNote':
      'Wewe ni mwanachama wa taasisi hii. Wasimamizi wake huiendesha. Unaweza kuondoka wakati wowote.',
    'inst.joinedOn': 'Ulijiunga tarehe: {date}',
    'inst.reportTitle': 'Watu wake walichosoma',
    'inst.reportWhat':
      'Hizi ni idadi, si kumbukumbu. Zinahesabu akaunti zilizojiunga, wanafunzi wa familia za akaunti hizo, kozi ambazo wanafunzi hao walijiandikisha kati ya tarehe hizo mbili, kozi zilizomalizwa na vyeti vilivyotolewa. Hakuna jina wala anwani ya barua pepe inayoonyeshwa. Mwanafunzi asiye na akaunti katika taasisi hii hahesabiwi. Idadi ndogo kama moja bado inaweza kumwelekeza mtu, kwa hiyo ichukulie idadi ndogo kama ambavyo ungelichukulia jina.',
    'inst.from': 'Kuanzia',
    'inst.to': 'Hadi',
    'inst.readDo': 'Onyesha tarehe hizi',
    'inst.csvDo': 'Pakua kama faili',
    'inst.statAccounts': 'Akaunti zilizojiunga: {count}',
    'inst.statLearners': 'Wanafunzi wa familia zao: {count}',
    'inst.statEnrolments': 'Uandikishaji kati ya tarehe hizo mbili: {count}',
    'inst.statFinished': 'Kozi zilizomalizwa kati ya tarehe hizo mbili: {count}',
    'inst.statCertificates': 'Vyeti vilivyotolewa kati ya tarehe hizo mbili: {count}',
    'inst.byCourse': 'Kwa kozi',
    'inst.colCourse': 'Kozi',
    'inst.colLearners': 'Wanafunzi',
    'inst.colEnrolments': 'Uandikishaji',
    'inst.colFinished': 'Zilizomalizwa',
    'inst.noneEnrolled': 'Hakuna aliyejiandikisha katika chochote kati ya tarehe hizi.',
    'inst.reportUnread':
      'Idadi hazikuweza kusomwa sasa hivi. Hii haimaanishi kwamba hakuna. Jaribu tena baada ya muda mfupi.',
    'inst.badWindow': 'Chagua tarehe ya kuanza isiyokuja baada ya tarehe ya mwisho.',
    'inst.windowTooLong': 'Chagua tarehe mbili zisizotengana kwa zaidi ya miaka miwili.',
    'inst.leaveTitle': 'Kuondoka',
    'inst.leaveBody':
      'Kuondoka kunamaliza uanachama wako, na wewe na familia yako hamhesabiwi tena katika idadi zake. Hakufuti akaunti yako wala chochote ulichojifunza.',
    'inst.leaveDo': 'Ondoka katika taasisi hii',
    'inst.whyLastAdmin':
      'Wewe ndiye msimamizi wake pekee. Mtu mwingine lazima afanywe msimamizi kabla hujaweza kuondoka.',
    'inst.whyAlready': 'Tayari wewe ni mwanachama wa taasisi.',
    'inst.whyNoMatch':
      'Hakuna kikoa cha barua pepe kilichokaguliwa kinacholingana na anwani yako, kwa hiyo hukuongezwa.',
    'inst.whyNotMember': 'Wewe si mwanachama wa taasisi yoyote.',
    'inst.failed': 'Hilo halikuweza kufanyika. Hakuna kilichobadilishwa.',
    'inst.unsure':
      'Hatukuweza kuthibitisha kwamba hilo limefanyika. Fungua ukurasa huu tena ili uone.',
    'inst.adminEnglish':
      'Sehemu zilizo hapa chini ni za wasimamizi wa taasisi hii na kwa sasa ziko kwa Kiingereza.',
    'inst.csvNote': 'Vichwa vilivyo ndani ya faili viko kwa Kiingereza.',
    'inst.whySignedOut': 'Umetoka kwenye akaunti. Ingia kisha ujaribu tena.',
  },
  af: {
    'inst.title': 'Instellings',
    'inst.yours': 'Jou instelling',
    'inst.unread':
      'Jou instelling kon nie nou gelees word nie. Dit beteken nie dat jy nie in een is nie. Probeer oor ’n oomblik weer.',
    'inst.notIn': 'Jy is nie in ’n instelling nie',
    'inst.canJoin':
      'Jou e-posadres is by ’n domein wat ’n instelling gewys het syne is, dus mag jy daarby aansluit. Niks gebeur vanself nie: jy sluit aan deur die knoppie te druk.',
    'inst.joinMeans':
      'Deur aan te sluit word jy en die leerders in jou gesin by daardie instelling se getalle gevoeg: hoeveel van sy mense vir elke kursus ingeskryf het en hoeveel dit voltooi het. Daardie getalle word aan sy lede gewys. Geen naam word gewys nie. ’n Klein getal kan steeds na iemand wys.',
    'inst.joinDo': 'Sluit by hierdie instelling aan',
    'inst.joinClosed':
      'Om met ’n e-posadres by ’n instelling aan te sluit is op die oomblik nie oop nie. ’n Instelling se administrateurs word deur die platform aangewys.',
    'inst.noMatch':
      'Geen instelling het ’n nagegaande e-posdomein wat by jou adres pas nie. As jou skool of madrasa hier behoort te wees, vra sy administrateur.',
    'inst.haveCode': 'Het jy ’n kode van ’n skool? Dit word op ’n ander bladsy gebruik.',
    'inst.useCode': 'Gebruik ’n kode',
    'inst.memberNote':
      'Jy is ’n lid van hierdie instelling. Sy administrateurs bestuur dit. Jy kan enige tyd verlaat.',
    'inst.joinedOn': 'Jy het aangesluit op: {date}',
    'inst.reportTitle': 'Wat sy mense bestudeer het',
    'inst.reportWhat':
      'Dit is getalle, nie rekords nie. Dit tel die rekeninge wat aangesluit het, die leerders in daardie rekeninge se gesinne, die kursusse waarvoor daardie leerders tussen die twee datums ingeskryf het, die voltooide kursusse en die sertifikate wat uitgereik is. Geen naam en geen e-posadres word gewys nie. ’n Leerder sonder ’n rekening in hierdie instelling word nie getel nie. ’n Getal so klein soos een kan steeds na iemand wys, dus behandel ’n klein getal soos jy ’n naam sou behandel.',
    'inst.from': 'Van',
    'inst.to': 'Tot',
    'inst.readDo': 'Wys hierdie datums',
    'inst.csvDo': 'Laai af as ’n lêer',
    'inst.statAccounts': 'Rekeninge wat aangesluit het: {count}',
    'inst.statLearners': 'Leerders in hulle gesinne: {count}',
    'inst.statEnrolments': 'Inskrywings tussen die twee datums: {count}',
    'inst.statFinished': 'Kursusse voltooi tussen die twee datums: {count}',
    'inst.statCertificates': 'Sertifikate uitgereik tussen die twee datums: {count}',
    'inst.byCourse': 'Volgens kursus',
    'inst.colCourse': 'Kursus',
    'inst.colLearners': 'Leerders',
    'inst.colEnrolments': 'Inskrywings',
    'inst.colFinished': 'Voltooi',
    'inst.noneEnrolled': 'Niemand het tussen hierdie datums vir enigiets ingeskryf nie.',
    'inst.reportUnread':
      'Die getalle kon nie nou gelees word nie. Dit beteken nie dat daar geen is nie. Probeer oor ’n oomblik weer.',
    'inst.badWindow': 'Kies ’n begindatum wat nie ná die einddatum is nie.',
    'inst.windowTooLong': 'Kies twee datums wat nie meer as twee jaar uitmekaar is nie.',
    'inst.leaveTitle': 'Verlaat',
    'inst.leaveBody':
      'Om te verlaat beëindig jou lidmaatskap, en jy en jou gesin word nie meer in sy getalle getel nie. Dit skrap nie jou rekening of enigiets wat jy geleer het nie.',
    'inst.leaveDo': 'Verlaat hierdie instelling',
    'inst.whyLastAdmin':
      'Jy is sy enigste administrateur. Iemand anders moet ’n administrateur gemaak word voordat jy kan verlaat.',
    'inst.whyAlready': 'Jy behoort reeds aan ’n instelling.',
    'inst.whyNoMatch':
      'Geen nagegaande e-posdomein pas by jou adres nie, dus is jy nie bygevoeg nie.',
    'inst.whyNotMember': 'Jy is nie ’n lid van ’n instelling nie.',
    'inst.failed': 'Dit kon nie gedoen word nie. Niks is verander nie.',
    'inst.unsure':
      'Ons kon nie bevestig dat dit gedoen is nie. Maak hierdie bladsy weer oop om te sien.',
    'inst.adminEnglish':
      'Die dele hieronder is vir hierdie instelling se administrateurs en is vir eers in Engels.',
    'inst.csvNote': 'Die opskrifte binne die lêer is in Engels.',
    'inst.whySignedOut': 'Jy is afgemeld. Meld aan en probeer weer.',
  },
  'zh-hans': {
    'inst.title': '机构',
    'inst.yours': '你的机构',
    'inst.unread': '现在无法读取你的机构。这并不表示你不在任何机构中。请稍后再试。',
    'inst.notIn': '你不在任何机构中',
    'inst.canJoin': '你的电子邮件地址属于某个机构已证明归其所有的域名，所以你可以加入它。不会自动发生任何事：你按下按钮才会加入。',
    'inst.joinMeans':
      '加入后，你和你家庭中的学习者会计入该机构的数字：它的人员中有多少人报名了每门课程，有多少人学完。这些数字会显示给它的成员。不显示任何姓名。很小的数字仍可能指向某个人。',
    'inst.joinDo': '加入这个机构',
    'inst.joinClosed': '目前不开放用电子邮件地址加入机构。机构的管理员由平台指定。',
    'inst.noMatch': '没有哪个机构拥有与你的地址相符的已核查邮箱域名。如果你的学校或经学院应该在这里，请询问它的管理员。',
    'inst.haveCode': '你有学校给的代码吗？它在另一个页面使用。',
    'inst.useCode': '使用代码',
    'inst.memberNote': '你是这个机构的成员。它由其管理员管理。你可以随时离开。',
    'inst.joinedOn': '你的加入时间：{date}',
    'inst.reportTitle': '它的人员学了什么',
    'inst.reportWhat':
      '这些是数字，不是记录。统计的是已加入的账户、这些账户家庭中的学习者、这些学习者在两个日期之间报名的课程、学完的课程和颁发的证书。不显示任何姓名或电子邮件地址。在这个机构中没有账户的学习者不计入。小到一的数字也可能指向某个人，所以请像对待姓名一样对待小数字。',
    'inst.from': '从',
    'inst.to': '到',
    'inst.readDo': '显示这些日期',
    'inst.csvDo': '下载为文件',
    'inst.statAccounts': '已加入的账户：{count}',
    'inst.statLearners': '其家庭中的学习者：{count}',
    'inst.statEnrolments': '两个日期之间的报名：{count}',
    'inst.statFinished': '两个日期之间学完的课程：{count}',
    'inst.statCertificates': '两个日期之间颁发的证书：{count}',
    'inst.byCourse': '按课程',
    'inst.colCourse': '课程',
    'inst.colLearners': '学习者',
    'inst.colEnrolments': '报名',
    'inst.colFinished': '学完',
    'inst.noneEnrolled': '这两个日期之间没有人报名任何课程。',
    'inst.reportUnread': '现在无法读取这些数字。这并不表示没有数字。请稍后再试。',
    'inst.badWindow': '请选择不晚于结束日期的开始日期。',
    'inst.windowTooLong': '请选择相隔不超过两年的两个日期。',
    'inst.leaveTitle': '离开',
    'inst.leaveBody': '离开会结束你的成员身份，你和你的家庭不再计入它的数字。这不会删除你的账户或你学过的任何内容。',
    'inst.leaveDo': '离开这个机构',
    'inst.whyLastAdmin': '你是它唯一的管理员。必须先让另一个人成为管理员，你才能离开。',
    'inst.whyAlready': '你已经属于一个机构。',
    'inst.whyNoMatch': '没有已核查的邮箱域名与你的地址相符，所以没有把你加入。',
    'inst.whyNotMember': '你不是任何机构的成员。',
    'inst.failed': '无法完成这项操作。没有任何更改。',
    'inst.unsure': '我们无法确认这项操作已完成。请重新打开此页面查看。',
    'inst.adminEnglish': '下面的部分供这个机构的管理员使用，目前为英文。',
    'inst.csvNote': '文件内的标题为英文。',
    'inst.whySignedOut': '你已退出登录。请登录后再试。',
  },
  'zh-hant': {
    'inst.title': '機構',
    'inst.yours': '你的機構',
    'inst.unread': '現在無法讀取你的機構。這並不表示你不在任何機構中。請稍後再試。',
    'inst.notIn': '你不在任何機構中',
    'inst.canJoin': '你的電子郵件地址屬於某個機構已證明歸其所有的網域，所以你可以加入它。不會自動發生任何事：你按下按鈕才會加入。',
    'inst.joinMeans':
      '加入後，你和你家庭中的學習者會計入該機構的數字：它的人員中有多少人報名了每門課程，有多少人學完。這些數字會顯示給它的成員。不顯示任何姓名。很小的數字仍可能指向某個人。',
    'inst.joinDo': '加入這個機構',
    'inst.joinClosed': '目前不開放用電子郵件地址加入機構。機構的管理員由平台指定。',
    'inst.noMatch': '沒有哪個機構擁有與你的地址相符的已核查電子郵件網域。如果你的學校或經學院應該在這裡，請詢問它的管理員。',
    'inst.haveCode': '你有學校給的代碼嗎？它在另一個頁面使用。',
    'inst.useCode': '使用代碼',
    'inst.memberNote': '你是這個機構的成員。它由其管理員管理。你可以隨時離開。',
    'inst.joinedOn': '你的加入時間：{date}',
    'inst.reportTitle': '它的人員學了什麼',
    'inst.reportWhat':
      '這些是數字，不是紀錄。統計的是已加入的帳戶、這些帳戶家庭中的學習者、這些學習者在兩個日期之間報名的課程、學完的課程和頒發的證書。不顯示任何姓名或電子郵件地址。在這個機構中沒有帳戶的學習者不計入。小到一的數字也可能指向某個人，所以請像對待姓名一樣對待小數字。',
    'inst.from': '從',
    'inst.to': '到',
    'inst.readDo': '顯示這些日期',
    'inst.csvDo': '下載為檔案',
    'inst.statAccounts': '已加入的帳戶：{count}',
    'inst.statLearners': '其家庭中的學習者：{count}',
    'inst.statEnrolments': '兩個日期之間的報名：{count}',
    'inst.statFinished': '兩個日期之間學完的課程：{count}',
    'inst.statCertificates': '兩個日期之間頒發的證書：{count}',
    'inst.byCourse': '按課程',
    'inst.colCourse': '課程',
    'inst.colLearners': '學習者',
    'inst.colEnrolments': '報名',
    'inst.colFinished': '學完',
    'inst.noneEnrolled': '這兩個日期之間沒有人報名任何課程。',
    'inst.reportUnread': '現在無法讀取這些數字。這並不表示沒有數字。請稍後再試。',
    'inst.badWindow': '請選擇不晚於結束日期的開始日期。',
    'inst.windowTooLong': '請選擇相隔不超過兩年的兩個日期。',
    'inst.leaveTitle': '離開',
    'inst.leaveBody': '離開會結束你的成員身分，你和你的家庭不再計入它的數字。這不會刪除你的帳戶或你學過的任何內容。',
    'inst.leaveDo': '離開這個機構',
    'inst.whyLastAdmin': '你是它唯一的管理員。必須先讓另一個人成為管理員，你才能離開。',
    'inst.whyAlready': '你已經屬於一個機構。',
    'inst.whyNoMatch': '沒有已核查的電子郵件網域與你的地址相符，所以沒有把你加入。',
    'inst.whyNotMember': '你不是任何機構的成員。',
    'inst.failed': '無法完成這項操作。沒有任何變更。',
    'inst.unsure': '我們無法確認這項操作已完成。請重新開啟此頁面查看。',
    'inst.adminEnglish': '下面的部分供這個機構的管理員使用，目前為英文。',
    'inst.csvNote': '檔案內的標題為英文。',
    'inst.whySignedOut': '你已登出。請登入後再試。',
  },
  vi: {
    'inst.title': 'Tổ chức',
    'inst.yours': 'Tổ chức của bạn',
    'inst.unread':
      'Hiện không đọc được tổ chức của bạn. Điều này không có nghĩa là bạn không ở trong tổ chức nào. Hãy thử lại sau giây lát.',
    'inst.notIn': 'Bạn không ở trong tổ chức nào',
    'inst.canJoin':
      'Địa chỉ email của bạn thuộc một tên miền mà một tổ chức đã chứng minh là của mình, nên bạn có thể tham gia tổ chức đó. Không có gì tự xảy ra: bạn tham gia bằng cách bấm nút.',
    'inst.joinMeans':
      'Khi tham gia, bạn và những người học trong gia đình bạn được tính vào các con số của tổ chức đó: bao nhiêu người của tổ chức đã ghi danh từng khóa học và bao nhiêu người đã học xong. Các con số đó được hiển thị cho các thành viên của tổ chức. Không tên nào được hiển thị. Một con số nhỏ vẫn có thể chỉ ra một người.',
    'inst.joinDo': 'Tham gia tổ chức này',
    'inst.joinClosed':
      'Hiện chưa mở việc tham gia tổ chức bằng địa chỉ email. Quản trị viên của một tổ chức do nền tảng chỉ định.',
    'inst.noMatch':
      'Không tổ chức nào có tên miền email đã được kiểm tra khớp với địa chỉ của bạn. Nếu trường hoặc madrasah của bạn lẽ ra phải có ở đây, hãy hỏi quản trị viên của nơi đó.',
    'inst.haveCode': 'Bạn có mã do một trường cấp không? Mã đó được dùng ở một trang khác.',
    'inst.useCode': 'Dùng mã',
    'inst.memberNote':
      'Bạn là thành viên của tổ chức này. Các quản trị viên của tổ chức quản lý nó. Bạn có thể rời đi bất cứ lúc nào.',
    'inst.joinedOn': 'Bạn đã tham gia vào: {date}',
    'inst.reportTitle': 'Người của tổ chức đã học gì',
    'inst.reportWhat':
      'Đây là các con số, không phải hồ sơ. Chúng đếm các tài khoản đã tham gia, những người học trong gia đình của các tài khoản đó, các khóa học mà những người học đó ghi danh giữa hai ngày, các khóa học đã học xong và các chứng chỉ đã cấp. Không tên nào và không địa chỉ email nào được hiển thị. Người học không có tài khoản trong tổ chức này không được đếm. Một con số nhỏ đến mức bằng một vẫn có thể chỉ ra một người, nên hãy đối xử với con số nhỏ như với một cái tên.',
    'inst.from': 'Từ',
    'inst.to': 'Đến',
    'inst.readDo': 'Hiển thị các ngày này',
    'inst.csvDo': 'Tải về dưới dạng tệp',
    'inst.statAccounts': 'Tài khoản đã tham gia: {count}',
    'inst.statLearners': 'Người học trong gia đình của họ: {count}',
    'inst.statEnrolments': 'Lượt ghi danh giữa hai ngày: {count}',
    'inst.statFinished': 'Khóa học đã học xong giữa hai ngày: {count}',
    'inst.statCertificates': 'Chứng chỉ đã cấp giữa hai ngày: {count}',
    'inst.byCourse': 'Theo khóa học',
    'inst.colCourse': 'Khóa học',
    'inst.colLearners': 'Người học',
    'inst.colEnrolments': 'Lượt ghi danh',
    'inst.colFinished': 'Đã học xong',
    'inst.noneEnrolled': 'Không ai ghi danh vào bất cứ khóa nào giữa các ngày này.',
    'inst.reportUnread':
      'Hiện không đọc được các con số. Điều này không có nghĩa là không có con số nào. Hãy thử lại sau giây lát.',
    'inst.badWindow': 'Hãy chọn ngày bắt đầu không sau ngày kết thúc.',
    'inst.windowTooLong': 'Hãy chọn hai ngày cách nhau không quá hai năm.',
    'inst.leaveTitle': 'Rời đi',
    'inst.leaveBody':
      'Rời đi sẽ chấm dứt tư cách thành viên của bạn, và bạn cùng gia đình không còn được tính vào các con số của tổ chức. Việc này không xóa tài khoản của bạn hay bất cứ điều gì bạn đã học.',
    'inst.leaveDo': 'Rời tổ chức này',
    'inst.whyLastAdmin':
      'Bạn là quản trị viên duy nhất của tổ chức. Phải có người khác được làm quản trị viên trước khi bạn có thể rời đi.',
    'inst.whyAlready': 'Bạn đã thuộc về một tổ chức.',
    'inst.whyNoMatch':
      'Không tên miền email đã được kiểm tra nào khớp với địa chỉ của bạn, nên bạn chưa được thêm vào.',
    'inst.whyNotMember': 'Bạn không phải là thành viên của tổ chức nào.',
    'inst.failed': 'Không thể thực hiện việc đó. Không có gì thay đổi.',
    'inst.unsure':
      'Chúng tôi không thể xác nhận việc đó đã được thực hiện. Hãy mở lại trang này để xem.',
    'inst.adminEnglish':
      'Các phần bên dưới dành cho quản trị viên của tổ chức này và hiện bằng tiếng Anh.',
    'inst.csvNote': 'Các tiêu đề bên trong tệp bằng tiếng Anh.',
    'inst.whySignedOut': 'Bạn đã đăng xuất. Hãy đăng nhập rồi thử lại.',
  },
  th: {
    'inst.title': 'สถาบัน',
    'inst.yours': 'สถาบันของคุณ',
    'inst.unread':
      'ขณะนี้อ่านข้อมูลสถาบันของคุณไม่ได้ ไม่ได้หมายความว่าคุณไม่ได้อยู่ในสถาบันใด โปรดลองอีกครั้งในอีกสักครู่',
    'inst.notIn': 'คุณไม่ได้อยู่ในสถาบันใด',
    'inst.canJoin':
      'ที่อยู่อีเมลของคุณอยู่ในโดเมนที่สถาบันแห่งหนึ่งแสดงแล้วว่าเป็นของตน คุณจึงเข้าร่วมสถาบันนั้นได้ ไม่มีสิ่งใดเกิดขึ้นเอง: คุณเข้าร่วมด้วยการกดปุ่ม',
    'inst.joinMeans':
      'การเข้าร่วมจะนับคุณและผู้เรียนในครอบครัวของคุณรวมในตัวเลขของสถาบันนั้น: คนของสถาบันกี่คนลงทะเบียนในแต่ละหลักสูตรและกี่คนเรียนจบ ตัวเลขเหล่านั้นแสดงให้สมาชิกของสถาบันเห็น ไม่มีการแสดงชื่อใด ตัวเลขที่น้อยยังอาจชี้ไปที่ใครบางคนได้',
    'inst.joinDo': 'เข้าร่วมสถาบันนี้',
    'inst.joinClosed':
      'ขณะนี้ยังไม่เปิดให้เข้าร่วมสถาบันด้วยที่อยู่อีเมล ผู้ดูแลของสถาบันได้รับการแต่งตั้งโดยแพลตฟอร์ม',
    'inst.noMatch':
      'ไม่มีสถาบันใดมีโดเมนอีเมลที่ตรวจแล้วซึ่งตรงกับที่อยู่ของคุณ หากโรงเรียนหรือมัดรอซะฮ์ของคุณควรอยู่ที่นี่ โปรดถามผู้ดูแลของที่นั่น',
    'inst.haveCode': 'คุณมีรหัสจากโรงเรียนหรือไม่ รหัสนั้นใช้ในอีกหน้าหนึ่ง',
    'inst.useCode': 'ใช้รหัส',
    'inst.memberNote': 'คุณเป็นสมาชิกของสถาบันนี้ ผู้ดูแลของสถาบันเป็นผู้จัดการ คุณออกได้ทุกเมื่อ',
    'inst.joinedOn': 'คุณเข้าร่วมเมื่อ: {date}',
    'inst.reportTitle': 'คนของสถาบันเรียนอะไร',
    'inst.reportWhat':
      'นี่คือตัวเลข ไม่ใช่ระเบียน ตัวเลขนับบัญชีที่เข้าร่วม ผู้เรียนในครอบครัวของบัญชีเหล่านั้น หลักสูตรที่ผู้เรียนเหล่านั้นลงทะเบียนระหว่างสองวันที่ หลักสูตรที่เรียนจบ และใบรับรองที่ออกให้ ไม่มีการแสดงชื่อหรือที่อยู่อีเมลใด ผู้เรียนที่ไม่มีบัญชีในสถาบันนี้จะไม่ถูกนับ ตัวเลขที่น้อยเพียงหนึ่งก็อาจชี้ไปที่ใครบางคนได้ จึงควรปฏิบัติต่อตัวเลขน้อยเหมือนที่ปฏิบัติต่อชื่อ',
    'inst.from': 'ตั้งแต่',
    'inst.to': 'ถึง',
    'inst.readDo': 'แสดงวันที่เหล่านี้',
    'inst.csvDo': 'ดาวน์โหลดเป็นไฟล์',
    'inst.statAccounts': 'บัญชีที่เข้าร่วม: {count}',
    'inst.statLearners': 'ผู้เรียนในครอบครัวของบัญชีเหล่านั้น: {count}',
    'inst.statEnrolments': 'การลงทะเบียนระหว่างสองวันที่: {count}',
    'inst.statFinished': 'หลักสูตรที่เรียนจบระหว่างสองวันที่: {count}',
    'inst.statCertificates': 'ใบรับรองที่ออกระหว่างสองวันที่: {count}',
    'inst.byCourse': 'ตามหลักสูตร',
    'inst.colCourse': 'หลักสูตร',
    'inst.colLearners': 'ผู้เรียน',
    'inst.colEnrolments': 'การลงทะเบียน',
    'inst.colFinished': 'เรียนจบ',
    'inst.noneEnrolled': 'ไม่มีใครลงทะเบียนสิ่งใดระหว่างวันที่เหล่านี้',
    'inst.reportUnread':
      'ขณะนี้อ่านตัวเลขไม่ได้ ไม่ได้หมายความว่าไม่มีตัวเลข โปรดลองอีกครั้งในอีกสักครู่',
    'inst.badWindow': 'โปรดเลือกวันที่เริ่มต้นที่ไม่อยู่หลังวันที่สิ้นสุด',
    'inst.windowTooLong': 'โปรดเลือกสองวันที่ที่ห่างกันไม่เกินสองปี',
    'inst.leaveTitle': 'การออก',
    'inst.leaveBody':
      'การออกจะสิ้นสุดการเป็นสมาชิกของคุณ และคุณกับครอบครัวจะไม่ถูกนับในตัวเลขของสถาบันอีก การออกไม่ลบบัญชีของคุณหรือสิ่งใดที่คุณได้เรียน',
    'inst.leaveDo': 'ออกจากสถาบันนี้',
    'inst.whyLastAdmin':
      'คุณเป็นผู้ดูแลเพียงคนเดียวของสถาบัน ต้องมีผู้อื่นได้รับการตั้งเป็นผู้ดูแลก่อนคุณจึงจะออกได้',
    'inst.whyAlready': 'คุณเป็นสมาชิกของสถาบันแห่งหนึ่งอยู่แล้ว',
    'inst.whyNoMatch': 'ไม่มีโดเมนอีเมลที่ตรวจแล้วซึ่งตรงกับที่อยู่ของคุณ คุณจึงไม่ได้ถูกเพิ่ม',
    'inst.whyNotMember': 'คุณไม่ได้เป็นสมาชิกของสถาบันใด',
    'inst.failed': 'ทำสิ่งนั้นไม่ได้ ไม่มีสิ่งใดเปลี่ยนแปลง',
    'inst.unsure': 'เรายืนยันไม่ได้ว่าทำสิ่งนั้นแล้ว โปรดเปิดหน้านี้อีกครั้งเพื่อดู',
    'inst.adminEnglish': 'ส่วนด้านล่างสำหรับผู้ดูแลของสถาบันนี้ และขณะนี้เป็นภาษาอังกฤษ',
    'inst.csvNote': 'หัวข้อภายในไฟล์เป็นภาษาอังกฤษ',
    'inst.whySignedOut': 'คุณออกจากระบบแล้ว โปรดเข้าสู่ระบบแล้วลองอีกครั้ง',
  },
  fil: {
    'inst.title': 'Mga institusyon',
    'inst.yours': 'Ang iyong institusyon',
    'inst.unread':
      'Hindi mabasa ang iyong institusyon sa ngayon. Hindi ito nangangahulugang wala ka sa isang institusyon. Subukan muli maya-maya.',
    'inst.notIn': 'Wala ka sa isang institusyon',
    'inst.canJoin':
      'Ang iyong email address ay nasa domain na ipinakita ng isang institusyon na sa kanya, kaya maaari kang sumali rito. Walang nangyayari nang kusa: sumasali ka sa pagpindot ng button.',
    'inst.joinMeans':
      'Sa pagsali, ikaw at ang mga mag-aaral sa iyong pamilya ay idinadagdag sa mga bilang ng institusyong iyon: ilan sa mga tao nito ang nagpatala sa bawat kurso at ilan ang nakatapos. Ipinapakita ang mga bilang na iyon sa mga kasapi nito. Walang pangalang ipinapakita. Ang maliit na bilang ay maaari pa ring tumukoy sa isang tao.',
    'inst.joinDo': 'Sumali sa institusyong ito',
    'inst.joinClosed':
      'Hindi bukas sa ngayon ang pagsali sa institusyon gamit ang email address. Ang mga tagapangasiwa ng isang institusyon ay itinatalaga ng platform.',
    'inst.noMatch':
      'Walang institusyong may nasuring email domain na tumutugma sa iyong address. Kung dapat narito ang iyong paaralan o madrasah, tanungin ang tagapangasiwa nito.',
    'inst.haveCode': 'May code ka ba mula sa isang paaralan? Ginagamit iyon sa ibang pahina.',
    'inst.useCode': 'Gumamit ng code',
    'inst.memberNote':
      'Kasapi ka ng institusyong ito. Pinamamahalaan ito ng mga tagapangasiwa nito. Maaari kang umalis anumang oras.',
    'inst.joinedOn': 'Sumali ka noong: {date}',
    'inst.reportTitle': 'Ano ang pinag-aralan ng mga tao nito',
    'inst.reportWhat':
      'Mga bilang ito, hindi mga tala. Binibilang ang mga account na sumali, ang mga mag-aaral sa mga pamilya ng mga account na iyon, ang mga kursong pinagpatalaan ng mga mag-aaral na iyon sa pagitan ng dalawang petsa, ang mga kursong natapos at ang mga sertipikong naibigay. Walang pangalan at walang email address na ipinapakita. Hindi binibilang ang mag-aaral na walang account sa institusyong ito. Ang bilang na kasinliit ng isa ay maaari pa ring tumukoy sa isang tao, kaya ituring ang maliit na bilang gaya ng pagturing mo sa isang pangalan.',
    'inst.from': 'Mula',
    'inst.to': 'Hanggang',
    'inst.readDo': 'Ipakita ang mga petsang ito',
    'inst.csvDo': 'I-download bilang file',
    'inst.statAccounts': 'Mga account na sumali: {count}',
    'inst.statLearners': 'Mga mag-aaral sa kanilang mga pamilya: {count}',
    'inst.statEnrolments': 'Mga pagpapatala sa pagitan ng dalawang petsa: {count}',
    'inst.statFinished': 'Mga kursong natapos sa pagitan ng dalawang petsa: {count}',
    'inst.statCertificates': 'Mga sertipikong naibigay sa pagitan ng dalawang petsa: {count}',
    'inst.byCourse': 'Ayon sa kurso',
    'inst.colCourse': 'Kurso',
    'inst.colLearners': 'Mga mag-aaral',
    'inst.colEnrolments': 'Mga pagpapatala',
    'inst.colFinished': 'Natapos',
    'inst.noneEnrolled': 'Walang nagpatala sa anuman sa pagitan ng mga petsang ito.',
    'inst.reportUnread':
      'Hindi mabasa ang mga bilang sa ngayon. Hindi ito nangangahulugang wala. Subukan muli maya-maya.',
    'inst.badWindow': 'Pumili ng petsa ng simula na hindi lampas sa petsa ng wakas.',
    'inst.windowTooLong': 'Pumili ng dalawang petsang hindi hihigit sa dalawang taon ang pagitan.',
    'inst.leaveTitle': 'Pag-alis',
    'inst.leaveBody':
      'Tinatapos ng pag-alis ang iyong pagiging kasapi, at ikaw at ang iyong pamilya ay hindi na binibilang sa mga bilang nito. Hindi nito binubura ang iyong account o anumang natutuhan mo.',
    'inst.leaveDo': 'Umalis sa institusyong ito',
    'inst.whyLastAdmin':
      'Ikaw ang nag-iisang tagapangasiwa nito. Kailangang may ibang gawing tagapangasiwa bago ka makaalis.',
    'inst.whyAlready': 'Kasapi ka na ng isang institusyon.',
    'inst.whyNoMatch':
      'Walang nasuring email domain na tumutugma sa iyong address, kaya hindi ka naidagdag.',
    'inst.whyNotMember': 'Hindi ka kasapi ng isang institusyon.',
    'inst.failed': 'Hindi iyon nagawa. Walang nabago.',
    'inst.unsure':
      'Hindi namin nakumpirma na nagawa iyon. Buksan muli ang pahinang ito para makita.',
    'inst.adminEnglish':
      'Ang mga bahagi sa ibaba ay para sa mga tagapangasiwa ng institusyong ito at nasa Ingles sa ngayon.',
    'inst.csvNote': 'Nasa Ingles ang mga pamagat sa loob ng file.',
    'inst.whySignedOut': 'Naka-sign out ka. Mag-sign in at subukan muli.',
  },
  uz: {
    'inst.title': 'Muassasalar',
    'inst.yours': 'Sizning muassasangiz',
    'inst.unread':
      'Muassasangizni hozir oʻqib boʻlmadi. Bu hech bir muassasada emasligingizni anglatmaydi. Birozdan soʻng qayta urinib koʻring.',
    'inst.notIn': 'Siz hech bir muassasada emassiz',
    'inst.canJoin':
      'Elektron pochta manzilingiz bir muassasa oʻziniki ekanini koʻrsatgan domenda, shuning uchun unga qoʻshilishingiz mumkin. Hech narsa oʻz-oʻzidan boʻlmaydi: tugmani bosib qoʻshilasiz.',
    'inst.joinMeans':
      'Qoʻshilish sizni va oilangizdagi oʻquvchilarni oʻsha muassasaning sonlariga qoʻshadi: uning odamlaridan nechtasi har bir kursga yozilgani va nechtasi tugatgani. Bu sonlar uning aʼzolariga koʻrsatiladi. Hech qanday ism koʻrsatilmaydi. Kichik son baribir biror kishiga ishora qilishi mumkin.',
    'inst.joinDo': 'Bu muassasaga qoʻshilish',
    'inst.joinClosed':
      'Muassasaga elektron pochta manzili orqali qoʻshilish hozircha ochiq emas. Muassasa maʼmurlarini platforma tayinlaydi.',
    'inst.noMatch':
      'Hech bir muassasada manzilingizga mos keladigan tekshirilgan pochta domeni yoʻq. Agar maktabingiz yoki madrasangiz bu yerda boʻlishi kerak boʻlsa, uning maʼmuridan soʻrang.',
    'inst.haveCode': 'Sizda maktab bergan kod bormi? U boshqa sahifada ishlatiladi.',
    'inst.useCode': 'Koddan foydalanish',
    'inst.memberNote':
      'Siz bu muassasaning aʼzosisiz. Uni maʼmurlari boshqaradi. Istalgan vaqtda chiqib ketishingiz mumkin.',
    'inst.joinedOn': 'Qoʻshilgan vaqtingiz: {date}',
    'inst.reportTitle': 'Uning odamlari nimani oʻqigan',
    'inst.reportWhat':
      'Bular sonlar, yozuvlar emas. Qoʻshilgan hisoblar, oʻsha hisoblar oilalaridagi oʻquvchilar, oʻsha oʻquvchilar ikki sana oraligʻida yozilgan kurslar, tugatilgan kurslar va berilgan sertifikatlar sanaladi. Hech qanday ism va hech qanday pochta manzili koʻrsatilmaydi. Bu muassasada hisobi boʻlmagan oʻquvchi sanalmaydi. Birdek kichik son ham biror kishiga ishora qilishi mumkin, shuning uchun kichik songa ismga qaragandek qarang.',
    'inst.from': 'Boshlanishi',
    'inst.to': 'Tugashi',
    'inst.readDo': 'Shu sanalarni koʻrsatish',
    'inst.csvDo': 'Fayl sifatida yuklab olish',
    'inst.statAccounts': 'Qoʻshilgan hisoblar: {count}',
    'inst.statLearners': 'Ularning oilalaridagi oʻquvchilar: {count}',
    'inst.statEnrolments': 'Ikki sana oraligʻidagi yozilishlar: {count}',
    'inst.statFinished': 'Ikki sana oraligʻida tugatilgan kurslar: {count}',
    'inst.statCertificates': 'Ikki sana oraligʻida berilgan sertifikatlar: {count}',
    'inst.byCourse': 'Kurs boʻyicha',
    'inst.colCourse': 'Kurs',
    'inst.colLearners': 'Oʻquvchilar',
    'inst.colEnrolments': 'Yozilishlar',
    'inst.colFinished': 'Tugatilgan',
    'inst.noneEnrolled': 'Bu sanalar oraligʻida hech kim hech narsaga yozilmagan.',
    'inst.reportUnread':
      'Sonlarni hozir oʻqib boʻlmadi. Bu sonlar yoʻqligini anglatmaydi. Birozdan soʻng qayta urinib koʻring.',
    'inst.badWindow': 'Tugash sanasidan keyin boʻlmagan boshlanish sanasini tanlang.',
    'inst.windowTooLong': 'Orasi ikki yildan oshmaydigan ikki sanani tanlang.',
    'inst.leaveTitle': 'Chiqib ketish',
    'inst.leaveBody':
      'Chiqib ketish aʼzoligingizni tugatadi, siz va oilangiz endi uning sonlarida sanalmaysiz. Bu hisobingizni yoki oʻrgangan biror narsangizni oʻchirmaydi.',
    'inst.leaveDo': 'Bu muassasadan chiqish',
    'inst.whyLastAdmin':
      'Siz uning yagona maʼmurisiz. Chiqib ketishingizdan oldin boshqa birov maʼmur qilinishi kerak.',
    'inst.whyAlready': 'Siz allaqachon bir muassasaga mansubsiz.',
    'inst.whyNoMatch':
      'Manzilingizga mos keladigan tekshirilgan pochta domeni yoʻq, shuning uchun qoʻshilmadingiz.',
    'inst.whyNotMember': 'Siz hech bir muassasaning aʼzosi emassiz.',
    'inst.failed': 'Buni bajarib boʻlmadi. Hech narsa oʻzgarmadi.',
    'inst.unsure': 'Bu bajarilganini tasdiqlay olmadik. Koʻrish uchun bu sahifani qayta oching.',
    'inst.adminEnglish': 'Quyidagi qismlar bu muassasa maʼmurlari uchun va hozircha ingliz tilida.',
    'inst.csvNote': 'Fayl ichidagi sarlavhalar ingliz tilida.',
    'inst.whySignedOut': 'Siz hisobdan chiqqansiz. Kiring va qayta urinib koʻring.',
  },
  kk: {
    'inst.title': 'Мекемелер',
    'inst.yours': 'Сіздің мекемеңіз',
    'inst.unread':
      'Мекемеңізді қазір оқу мүмкін болмады. Бұл сіз ешбір мекемеде емессіз дегенді білдірмейді. Сәлден кейін қайталап көріңіз.',
    'inst.notIn': 'Сіз ешбір мекемеде емессіз',
    'inst.canJoin':
      'Электрондық пошта мекенжайыңыз бір мекеме өзінікі екенін көрсеткен доменде, сондықтан оған қосыла аласыз. Ештеңе өздігінен болмайды: түймені басып қосыласыз.',
    'inst.joinMeans':
      'Қосылу сізді және отбасыңыздағы оқушыларды сол мекеменің сандарына қосады: оның адамдарының нешеуі әр курсқа жазылғаны және нешеуі аяқтағаны. Бұл сандар оның мүшелеріне көрсетіледі. Ешқандай есім көрсетілмейді. Шағын сан бәрібір біреуді меңзеуі мүмкін.',
    'inst.joinDo': 'Осы мекемеге қосылу',
    'inst.joinClosed':
      'Мекемеге электрондық пошта мекенжайы арқылы қосылу қазір ашық емес. Мекеме әкімшілерін платформа тағайындайды.',
    'inst.noMatch':
      'Ешбір мекемеде мекенжайыңызға сәйкес келетін тексерілген пошта домені жоқ. Мектебіңіз немесе медресеңіз осында болуы тиіс болса, оның әкімшісінен сұраңыз.',
    'inst.haveCode': 'Сізде мектеп берген код бар ма? Ол басқа бетте қолданылады.',
    'inst.useCode': 'Кодты қолдану',
    'inst.memberNote':
      'Сіз осы мекеменің мүшесісіз. Оны әкімшілері басқарады. Кез келген уақытта шыға аласыз.',
    'inst.joinedOn': 'Қосылған уақытыңыз: {date}',
    'inst.reportTitle': 'Оның адамдары нені оқыды',
    'inst.reportWhat':
      'Бұлар сандар, жазбалар емес. Қосылған тіркелгілер, сол тіркелгілердің отбасыларындағы оқушылар, сол оқушылар екі күннің арасында жазылған курстар, аяқталған курстар және берілген сертификаттар саналады. Ешқандай есім де, ешқандай пошта мекенжайы да көрсетілмейді. Осы мекемеде тіркелгісі жоқ оқушы саналмайды. Бір сияқты шағын сан да біреуді меңзеуі мүмкін, сондықтан шағын санға есімге қарағандай қараңыз.',
    'inst.from': 'Басы',
    'inst.to': 'Соңы',
    'inst.readDo': 'Осы күндерді көрсету',
    'inst.csvDo': 'Файл ретінде жүктеп алу',
    'inst.statAccounts': 'Қосылған тіркелгілер: {count}',
    'inst.statLearners': 'Олардың отбасыларындағы оқушылар: {count}',
    'inst.statEnrolments': 'Екі күннің арасындағы жазылулар: {count}',
    'inst.statFinished': 'Екі күннің арасында аяқталған курстар: {count}',
    'inst.statCertificates': 'Екі күннің арасында берілген сертификаттар: {count}',
    'inst.byCourse': 'Курс бойынша',
    'inst.colCourse': 'Курс',
    'inst.colLearners': 'Оқушылар',
    'inst.colEnrolments': 'Жазылулар',
    'inst.colFinished': 'Аяқталған',
    'inst.noneEnrolled': 'Осы күндердің арасында ешкім ештеңеге жазылмаған.',
    'inst.reportUnread':
      'Сандарды қазір оқу мүмкін болмады. Бұл сандар жоқ дегенді білдірмейді. Сәлден кейін қайталап көріңіз.',
    'inst.badWindow': 'Соңғы күннен кейін болмайтын бастапқы күнді таңдаңыз.',
    'inst.windowTooLong': 'Арасы екі жылдан аспайтын екі күнді таңдаңыз.',
    'inst.leaveTitle': 'Шығу',
    'inst.leaveBody':
      'Шығу мүшелігіңізді аяқтайды, сіз және отбасыңыз енді оның сандарында саналмайсыз. Бұл тіркелгіңізді де, үйренген ештеңеңізді де жоймайды.',
    'inst.leaveDo': 'Осы мекемеден шығу',
    'inst.whyLastAdmin':
      'Сіз оның жалғыз әкімшісісіз. Сіз шықпас бұрын басқа біреу әкімші етілуі керек.',
    'inst.whyAlready': 'Сіз бір мекемеге әлдеқашан мүшесіз.',
    'inst.whyNoMatch':
      'Мекенжайыңызға сәйкес келетін тексерілген пошта домені жоқ, сондықтан қосылмадыңыз.',
    'inst.whyNotMember': 'Сіз ешбір мекеменің мүшесі емессіз.',
    'inst.failed': 'Мұны орындау мүмкін болмады. Ештеңе өзгерген жоқ.',
    'inst.unsure': 'Мұның орындалғанын растай алмадық. Көру үшін осы бетті қайта ашыңыз.',
    'inst.adminEnglish':
      'Төмендегі бөліктер осы мекеменің әкімшілеріне арналған және әзірге ағылшын тілінде.',
    'inst.csvNote': 'Файл ішіндегі тақырыптар ағылшын тілінде.',
    'inst.whySignedOut': 'Сіз тіркелгіден шыққансыз. Кіріп, қайталап көріңіз.',
  },
  az: {
    'inst.title': 'Qurumlar',
    'inst.yours': 'Sizin qurumunuz',
    'inst.unread':
      'Qurumunuzu indi oxumaq mümkün olmadı. Bu, heç bir qurumda olmadığınız demək deyil. Bir azdan yenidən cəhd edin.',
    'inst.notIn': 'Siz heç bir qurumda deyilsiniz',
    'inst.canJoin':
      'E-poçt ünvanınız bir qurumun özününkü olduğunu göstərdiyi domendədir, buna görə ona qoşula bilərsiniz. Heç nə öz-özünə baş vermir: düyməni basmaqla qoşulursunuz.',
    'inst.joinMeans':
      'Qoşulmaq sizi və ailənizdəki öyrənənləri həmin qurumun saylarına əlavə edir: onun adamlarından neçəsinin hər kursa yazıldığı və neçəsinin bitirdiyi. Bu saylar onun üzvlərinə göstərilir. Heç bir ad göstərilmir. Kiçik say yenə də kiməsə işarə edə bilər.',
    'inst.joinDo': 'Bu quruma qoşul',
    'inst.joinClosed':
      'Quruma e-poçt ünvanı ilə qoşulmaq hazırda açıq deyil. Qurumun idarəçilərini platforma təyin edir.',
    'inst.noMatch':
      'Heç bir qurumun ünvanınıza uyğun gələn yoxlanılmış e-poçt domeni yoxdur. Məktəbiniz və ya mədrəsəniz burada olmalıdırsa, onun idarəçisindən soruşun.',
    'inst.haveCode': 'Məktəbdən aldığınız kod varmı? O, başqa səhifədə istifadə olunur.',
    'inst.useCode': 'Koddan istifadə et',
    'inst.memberNote':
      'Siz bu qurumun üzvüsünüz. Onu idarəçiləri idarə edir. İstənilən vaxt çıxa bilərsiniz.',
    'inst.joinedOn': 'Qoşulduğunuz vaxt: {date}',
    'inst.reportTitle': 'Onun adamları nə oxuyub',
    'inst.reportWhat':
      'Bunlar saylardır, qeydlər deyil. Qoşulmuş hesablar, həmin hesabların ailələrindəki öyrənənlər, həmin öyrənənlərin iki tarix arasında yazıldığı kurslar, bitirilmiş kurslar və verilmiş sertifikatlar sayılır. Heç bir ad və heç bir e-poçt ünvanı göstərilmir. Bu qurumda hesabı olmayan öyrənən sayılmır. Bir qədər kiçik say da kiməsə işarə edə bilər, buna görə kiçik saya ada yanaşdığınız kimi yanaşın.',
    'inst.from': 'Başlanğıc',
    'inst.to': 'Son',
    'inst.readDo': 'Bu tarixləri göstər',
    'inst.csvDo': 'Fayl kimi endir',
    'inst.statAccounts': 'Qoşulmuş hesablar: {count}',
    'inst.statLearners': 'Onların ailələrindəki öyrənənlər: {count}',
    'inst.statEnrolments': 'İki tarix arasındakı yazılmalar: {count}',
    'inst.statFinished': 'İki tarix arasında bitirilmiş kurslar: {count}',
    'inst.statCertificates': 'İki tarix arasında verilmiş sertifikatlar: {count}',
    'inst.byCourse': 'Kurs üzrə',
    'inst.colCourse': 'Kurs',
    'inst.colLearners': 'Öyrənənlər',
    'inst.colEnrolments': 'Yazılmalar',
    'inst.colFinished': 'Bitirilmiş',
    'inst.noneEnrolled': 'Bu tarixlər arasında heç kim heç nəyə yazılmayıb.',
    'inst.reportUnread':
      'Sayları indi oxumaq mümkün olmadı. Bu, heç bir sayın olmadığı demək deyil. Bir azdan yenidən cəhd edin.',
    'inst.badWindow': 'Son tarixdən sonra olmayan başlanğıc tarixi seçin.',
    'inst.windowTooLong': 'Arası iki ildən çox olmayan iki tarix seçin.',
    'inst.leaveTitle': 'Çıxmaq',
    'inst.leaveBody':
      'Çıxmaq üzvlüyünüzü bitirir, siz və ailəniz daha onun saylarında sayılmırsınız. Bu, hesabınızı və ya öyrəndiyiniz heç nəyi silmir.',
    'inst.leaveDo': 'Bu qurumdan çıx',
    'inst.whyLastAdmin':
      'Siz onun yeganə idarəçisisiniz. Çıxmazdan əvvəl başqa biri idarəçi edilməlidir.',
    'inst.whyAlready': 'Siz artıq bir quruma mənsubsunuz.',
    'inst.whyNoMatch':
      'Ünvanınıza uyğun gələn yoxlanılmış e-poçt domeni yoxdur, buna görə əlavə edilmədiniz.',
    'inst.whyNotMember': 'Siz heç bir qurumun üzvü deyilsiniz.',
    'inst.failed': 'Bunu etmək mümkün olmadı. Heç nə dəyişmədi.',
    'inst.unsure': 'Bunun edildiyini təsdiqləyə bilmədik. Görmək üçün bu səhifəni yenidən açın.',
    'inst.adminEnglish':
      'Aşağıdakı hissələr bu qurumun idarəçiləri üçündür və hələlik ingilis dilindədir.',
    'inst.csvNote': 'Faylın içindəki başlıqlar ingilis dilindədir.',
    'inst.whySignedOut': 'Siz hesabdan çıxmısınız. Daxil olun və yenidən cəhd edin.',
  },
  tg: {
    'inst.title': 'Муассисаҳо',
    'inst.yours': 'Муассисаи шумо',
    'inst.unread':
      'Муассисаи шуморо ҳозир хондан имкон нашуд. Ин маънои онро надорад, ки шумо дар ягон муассиса нестед. Пас аз лаҳзае дубора кӯшиш кунед.',
    'inst.notIn': 'Шумо дар ягон муассиса нестед',
    'inst.canJoin':
      'Суроғаи почтаи электронии шумо дар доменест, ки як муассиса нишон додааст, ки аз они худаш аст, бинобар ин метавонед ба он ҳамроҳ шавед. Ҳеҷ чиз худ аз худ рӯй намедиҳад: бо пахши тугма ҳамроҳ мешавед.',
    'inst.joinMeans':
      'Ҳамроҳ шудан шумо ва омӯзандагони оилаатонро ба шумораҳои он муассиса илова мекунад: чанд нафар аз одамони он ба ҳар курс номнавис шудаанд ва чанд нафар онро ба анҷом расондаанд. Ин шумораҳо ба аъзои он нишон дода мешаванд. Ҳеҷ ном нишон дода намешавад. Шумораи хурд боз ҳам метавонад ба касе ишора кунад.',
    'inst.joinDo': 'Ба ин муассиса ҳамроҳ шавед',
    'inst.joinClosed':
      'Ҳамроҳ шудан ба муассиса бо суроғаи почтаи электронӣ ҳоло кушода нест. Маъмурони муассисаро платформа таъин мекунад.',
    'inst.noMatch':
      'Ҳеҷ муассиса домени почтаи тафтишшудае надорад, ки ба суроғаи шумо мувофиқ ояд. Агар мактаб ё мадрасаи шумо бояд дар ин ҷо бошад, аз маъмури он пурсед.',
    'inst.haveCode': 'Оё шумо рамзе аз мактаб доред? Он дар саҳифаи дигар истифода мешавад.',
    'inst.useCode': 'Истифодаи рамз',
    'inst.memberNote':
      'Шумо узви ин муассиса ҳастед. Онро маъмуронаш идора мекунанд. Шумо ҳар вақт метавонед онро тарк кунед.',
    'inst.joinedOn': 'Вақти ҳамроҳ шудани шумо: {date}',
    'inst.reportTitle': 'Одамони он чӣ хондаанд',
    'inst.reportWhat':
      'Инҳо шумораҳоянд, на сабтҳо. Ҳисобҳое, ки ҳамроҳ шудаанд, омӯзандагони оилаҳои он ҳисобҳо, курсҳое, ки он омӯзандагон дар байни ду сана ба онҳо номнавис шудаанд, курсҳои анҷомёфта ва шаҳодатномаҳои додашуда шумурда мешаванд. Ҳеҷ ном ва ҳеҷ суроғаи почта нишон дода намешавад. Омӯзандае, ки дар ин муассиса ҳисоб надорад, шумурда намешавад. Шумораи ба андозаи як хурд ҳам метавонад ба касе ишора кунад, бинобар ин бо шумораи хурд ҳамон тавр рафтор кунед, ки бо ном.',
    'inst.from': 'Аз',
    'inst.to': 'То',
    'inst.readDo': 'Ин санаҳоро нишон диҳед',
    'inst.csvDo': 'Ҳамчун файл боргирӣ кунед',
    'inst.statAccounts': 'Ҳисобҳое, ки ҳамроҳ шудаанд: {count}',
    'inst.statLearners': 'Омӯзандагони оилаҳои онҳо: {count}',
    'inst.statEnrolments': 'Номнависиҳо дар байни ду сана: {count}',
    'inst.statFinished': 'Курсҳои дар байни ду сана анҷомёфта: {count}',
    'inst.statCertificates': 'Шаҳодатномаҳои дар байни ду сана додашуда: {count}',
    'inst.byCourse': 'Аз рӯи курс',
    'inst.colCourse': 'Курс',
    'inst.colLearners': 'Омӯзандагон',
    'inst.colEnrolments': 'Номнависиҳо',
    'inst.colFinished': 'Анҷомёфта',
    'inst.noneEnrolled': 'Дар байни ин санаҳо ҳеҷ кас ба чизе номнавис нашудааст.',
    'inst.reportUnread':
      'Шумораҳоро ҳозир хондан имкон нашуд. Ин маънои онро надорад, ки шумора нест. Пас аз лаҳзае дубора кӯшиш кунед.',
    'inst.badWindow': 'Санаи оғозеро интихоб кунед, ки пас аз санаи анҷом набошад.',
    'inst.windowTooLong': 'Ду санаеро интихоб кунед, ки фосилаашон аз ду сол зиёд набошад.',
    'inst.leaveTitle': 'Тарк кардан',
    'inst.leaveBody':
      'Тарк кардан узвияти шуморо ба охир мерасонад ва шумо ва оилаатон дигар дар шумораҳои он шумурда намешавед. Ин ҳисоби шумо ё чизеро, ки омӯхтаед, нест намекунад.',
    'inst.leaveDo': 'Ин муассисаро тарк кунед',
    'inst.whyLastAdmin':
      'Шумо ягона маъмури он ҳастед. Пеш аз он ки шумо тарк кунед, бояд каси дигар маъмур таъин шавад.',
    'inst.whyAlready': 'Шумо аллакай ба як муассиса тааллуқ доред.',
    'inst.whyNoMatch':
      'Ягон домени почтаи тафтишшуда ба суроғаи шумо мувофиқ намеояд, бинобар ин илова нашудед.',
    'inst.whyNotMember': 'Шумо узви ягон муассиса нестед.',
    'inst.failed': 'Ин корро иҷро кардан имкон нашуд. Ҳеҷ чиз тағйир наёфт.',
    'inst.unsure':
      'Мо тасдиқ карда натавонистем, ки ин кор иҷро шудааст. Барои дидан ин саҳифаро дубора кушоед.',
    'inst.adminEnglish':
      'Қисмҳои поён барои маъмурони ин муассиса мебошанд ва ҳоло ба забони англисӣ ҳастанд.',
    'inst.csvNote': 'Сарлавҳаҳои дохили файл ба забони англисӣ ҳастанд.',
    'inst.whySignedOut': 'Шумо аз ҳисоб баромадаед. Ворид шавед ва дубора кӯшиш кунед.',
  },
  ky: {
    'inst.title': 'Мекемелер',
    'inst.yours': 'Сиздин мекемеңиз',
    'inst.unread':
      'Мекемеңизди азыр окуу мүмкүн болгон жок. Бул сиз эч бир мекемеде эмессиз дегенди билдирбейт. Бир аздан кийин кайра аракет кылыңыз.',
    'inst.notIn': 'Сиз эч бир мекемеде эмессиз',
    'inst.canJoin':
      'Электрондук почта дарегиңиз бир мекеме өзүнүкү экенин көрсөткөн доменде, ошондуктан ага кошула аласыз. Эч нерсе өзүнөн-өзү болбойт: баскычты басып кошуласыз.',
    'inst.joinMeans':
      'Кошулуу сизди жана үй-бүлөңүздөгү окуучуларды ошол мекеменин сандарына кошот: анын адамдарынын канчасы ар бир курска жазылганы жана канчасы бүтүргөнү. Бул сандар анын мүчөлөрүнө көрсөтүлөт. Эч кандай ысым көрсөтүлбөйт. Кичине сан баары бир кимдир бирөөнү көрсөтүшү мүмкүн.',
    'inst.joinDo': 'Бул мекемеге кошулуу',
    'inst.joinClosed':
      'Мекемеге электрондук почта дареги менен кошулуу азырынча ачык эмес. Мекеменин администраторлорун платформа дайындайт.',
    'inst.noMatch':
      'Эч бир мекемеде дарегиңизге дал келген текшерилген почта домени жок. Эгер мектебиңиз же медресеңиз бул жерде болушу керек болсо, анын администраторунан сураңыз.',
    'inst.haveCode': 'Сизде мектеп берген код барбы? Ал башка бетте колдонулат.',
    'inst.useCode': 'Кодду колдонуу',
    'inst.memberNote':
      'Сиз бул мекеменин мүчөсүсүз. Аны администраторлору башкарат. Каалаган убакта чыга аласыз.',
    'inst.joinedOn': 'Кошулган убактыңыз: {date}',
    'inst.reportTitle': 'Анын адамдары эмнени окуган',
    'inst.reportWhat':
      'Булар сандар, жазуулар эмес. Кошулган аккаунттар, ошол аккаунттардын үй-бүлөлөрүндөгү окуучулар, ошол окуучулар эки күндүн ортосунда жазылган курстар, бүтүрүлгөн курстар жана берилген сертификаттар саналат. Эч кандай ысым да, эч кандай почта дареги да көрсөтүлбөйт. Бул мекемеде аккаунту жок окуучу саналбайт. Бирдей кичине сан да кимдир бирөөнү көрсөтүшү мүмкүн, ошондуктан кичине санга ысымга карагандай караңыз.',
    'inst.from': 'Башы',
    'inst.to': 'Аягы',
    'inst.readDo': 'Ушул күндөрдү көрсөтүү',
    'inst.csvDo': 'Файл катары жүктөп алуу',
    'inst.statAccounts': 'Кошулган аккаунттар: {count}',
    'inst.statLearners': 'Алардын үй-бүлөлөрүндөгү окуучулар: {count}',
    'inst.statEnrolments': 'Эки күндүн ортосундагы жазылуулар: {count}',
    'inst.statFinished': 'Эки күндүн ортосунда бүтүрүлгөн курстар: {count}',
    'inst.statCertificates': 'Эки күндүн ортосунда берилген сертификаттар: {count}',
    'inst.byCourse': 'Курс боюнча',
    'inst.colCourse': 'Курс',
    'inst.colLearners': 'Окуучулар',
    'inst.colEnrolments': 'Жазылуулар',
    'inst.colFinished': 'Бүтүрүлгөн',
    'inst.noneEnrolled': 'Бул күндөрдүн ортосунда эч ким эч нерсеге жазылган эмес.',
    'inst.reportUnread':
      'Сандарды азыр окуу мүмкүн болгон жок. Бул сандар жок дегенди билдирбейт. Бир аздан кийин кайра аракет кылыңыз.',
    'inst.badWindow': 'Акыркы күндөн кийин болбогон баштапкы күндү тандаңыз.',
    'inst.windowTooLong': 'Арасы эки жылдан ашпаган эки күндү тандаңыз.',
    'inst.leaveTitle': 'Чыгуу',
    'inst.leaveBody':
      'Чыгуу мүчөлүгүңүздү аяктайт, сиз жана үй-бүлөңүз мындан ары анын сандарында саналбайсыз. Бул аккаунтуңузду да, үйрөнгөн эч нерсеңизди да өчүрбөйт.',
    'inst.leaveDo': 'Бул мекемеден чыгуу',
    'inst.whyLastAdmin':
      'Сиз анын жалгыз администраторусуз. Сиз чыгардан мурун башка бирөө администратор кылынышы керек.',
    'inst.whyAlready': 'Сиз буга чейин эле бир мекемеге таандыксыз.',
    'inst.whyNoMatch':
      'Дарегиңизге дал келген текшерилген почта домени жок, ошондуктан кошулган жоксуз.',
    'inst.whyNotMember': 'Сиз эч бир мекеменин мүчөсү эмессиз.',
    'inst.failed': 'Муну аткаруу мүмкүн болгон жок. Эч нерсе өзгөргөн жок.',
    'inst.unsure': 'Мунун аткарылганын ырастай алган жокпуз. Көрүү үчүн бул бетти кайра ачыңыз.',
    'inst.adminEnglish':
      'Төмөндөгү бөлүктөр бул мекеменин администраторлору үчүн жана азырынча англис тилинде.',
    'inst.csvNote': 'Файлдын ичиндеги аталыштар англис тилинде.',
    'inst.whySignedOut': 'Сиз аккаунттан чыккансыз. Кирип, кайра аракет кылыңыз.',
  },
  tk: {
    'inst.title': 'Edaralar',
    'inst.yours': 'Siziň edaraňyz',
    'inst.unread':
      'Edaraňyzy häzir okap bolmady. Bu siziň hiç bir edarada däldigiňizi aňlatmaýar. Biraz wagtdan gaýtadan synanyşyň.',
    'inst.notIn': 'Siz hiç bir edarada däl',
    'inst.canJoin':
      'E-poçta salgyňyz bir edaranyň özüniňkidigini görkezen domeninde, şonuň üçin oňa goşulyp bilersiňiz. Hiç zat öz-özünden bolmaýar: düwmäni basyp goşulýarsyňyz.',
    'inst.joinMeans':
      'Goşulmak sizi we maşgalaňyzdaky öwrenijileri şol edaranyň sanlaryna goşýar: onuň adamlaryndan näçesiniň her kursa ýazylandygy we näçesiniň tamamlandygy. Bu sanlar onuň agzalaryna görkezilýär. Hiç bir at görkezilmeýär. Kiçi san şonda-da kimdir birine yşarat edip biler.',
    'inst.joinDo': 'Bu edara goşul',
    'inst.joinClosed':
      'Edara e-poçta salgysy bilen goşulmak häzirlikçe açyk däl. Edaranyň administratorlaryny platforma belleýär.',
    'inst.noMatch':
      'Hiç bir edaranyň salgyňyza gabat gelýän barlanan e-poçta domeni ýok. Mekdebiňiz ýa-da medresäňiz şu ýerde bolmaly bolsa, onuň administratoryndan soraň.',
    'inst.haveCode': 'Sizde mekdebiň beren kody barmy? Ol başga sahypada ulanylýar.',
    'inst.useCode': 'Kody ulan',
    'inst.memberNote':
      'Siz bu edaranyň agzasy. Ony administratorlary dolandyrýar. Islän wagtyňyz çykyp bilersiňiz.',
    'inst.joinedOn': 'Goşulan wagtyňyz: {date}',
    'inst.reportTitle': 'Onuň adamlary näme okady',
    'inst.reportWhat':
      'Bular sanlar, ýazgylar däl. Goşulan hasaplar, şol hasaplaryň maşgalalaryndaky öwrenijiler, şol öwrenijileriň iki senäniň arasynda ýazylan kurslary, tamamlanan kurslar we berlen sertifikatlar sanalýar. Hiç bir at we hiç bir e-poçta salgysy görkezilmeýär. Bu edarada hasaby bolmadyk öwreniji sanalmaýar. Bir ýaly kiçi san hem kimdir birine yşarat edip biler, şonuň üçin kiçi sana ada garaýşyňyz ýaly garaň.',
    'inst.from': 'Başy',
    'inst.to': 'Soňy',
    'inst.readDo': 'Şu seneleri görkez',
    'inst.csvDo': 'Faýl hökmünde göçürip al',
    'inst.statAccounts': 'Goşulan hasaplar: {count}',
    'inst.statLearners': 'Olaryň maşgalalaryndaky öwrenijiler: {count}',
    'inst.statEnrolments': 'Iki senäniň arasyndaky ýazylmalar: {count}',
    'inst.statFinished': 'Iki senäniň arasynda tamamlanan kurslar: {count}',
    'inst.statCertificates': 'Iki senäniň arasynda berlen sertifikatlar: {count}',
    'inst.byCourse': 'Kurs boýunça',
    'inst.colCourse': 'Kurs',
    'inst.colLearners': 'Öwrenijiler',
    'inst.colEnrolments': 'Ýazylmalar',
    'inst.colFinished': 'Tamamlanan',
    'inst.noneEnrolled': 'Bu seneleriň arasynda hiç kim hiç zada ýazylmady.',
    'inst.reportUnread':
      'Sanlary häzir okap bolmady. Bu sanlaryň ýokdugyny aňlatmaýar. Biraz wagtdan gaýtadan synanyşyň.',
    'inst.badWindow': 'Soňky seneden soň bolmadyk başlangyç senesini saýlaň.',
    'inst.windowTooLong': 'Arasy iki ýyldan köp bolmadyk iki senäni saýlaň.',
    'inst.leaveTitle': 'Çykmak',
    'inst.leaveBody':
      'Çykmak agzalygyňyzy tamamlaýar, siz we maşgalaňyz mundan beýläk onuň sanlarynda sanalmaýarsyňyz. Bu hasabyňyzy ýa-da öwrenen hiç zadyňyzy pozmaýar.',
    'inst.leaveDo': 'Bu edaradan çyk',
    'inst.whyLastAdmin':
      'Siz onuň ýeke-täk administratory. Siz çykmazdan öň başga biri administrator edilmeli.',
    'inst.whyAlready': 'Siz eýýäm bir edara degişli.',
    'inst.whyNoMatch':
      'Salgyňyza gabat gelýän barlanan e-poçta domeni ýok, şonuň üçin goşulmadyňyz.',
    'inst.whyNotMember': 'Siz hiç bir edaranyň agzasy däl.',
    'inst.failed': 'Muny edip bolmady. Hiç zat üýtgemedi.',
    'inst.unsure': 'Munuň edilendigini tassyklap bilmedik. Görmek üçin bu sahypany gaýtadan açyň.',
    'inst.adminEnglish':
      'Aşakdaky bölekler bu edaranyň administratorlary üçin we häzirlikçe iňlis dilinde.',
    'inst.csvNote': 'Faýlyň içindäki sözbaşylar iňlis dilinde.',
    'inst.whySignedOut': 'Siz hasapdan çykdyňyz. Giriň we gaýtadan synanyşyň.',
  },
  ta: {
    'inst.title': 'நிறுவனங்கள்',
    'inst.yours': 'உங்கள் நிறுவனம்',
    'inst.unread':
      'உங்கள் நிறுவனத்தை இப்போது படிக்க முடியவில்லை. நீங்கள் எந்த நிறுவனத்திலும் இல்லை என்று இதற்குப் பொருள் இல்லை. சிறிது நேரத்தில் மீண்டும் முயலுங்கள்.',
    'inst.notIn': 'நீங்கள் எந்த நிறுவனத்திலும் இல்லை',
    'inst.canJoin':
      'உங்கள் மின்னஞ்சல் முகவரி, ஒரு நிறுவனம் தன்னுடையது என்று காட்டிய டொமைனில் உள்ளது; எனவே நீங்கள் அதில் சேரலாம். எதுவும் தானாக நடக்காது: பொத்தானை அழுத்தியே நீங்கள் சேர்கிறீர்கள்.',
    'inst.joinMeans':
      'சேர்வதால் நீங்களும் உங்கள் குடும்பத்தில் உள்ள கற்பவர்களும் அந்த நிறுவனத்தின் எண்ணிக்கைகளில் சேர்க்கப்படுகிறீர்கள்: அதன் நபர்களில் எத்தனை பேர் ஒவ்வொரு பாடநெறியிலும் பதிவு செய்தனர், எத்தனை பேர் முடித்தனர். அந்த எண்ணிக்கைகள் அதன் உறுப்பினர்களுக்குக் காட்டப்படுகின்றன. எந்தப் பெயரும் காட்டப்படுவதில்லை. சிறிய எண்ணிக்கை இருந்தும் ஒருவரைச் சுட்டக்கூடும்.',
    'inst.joinDo': 'இந்த நிறுவனத்தில் சேரவும்',
    'inst.joinClosed':
      'மின்னஞ்சல் முகவரி மூலம் நிறுவனத்தில் சேர்வது தற்போது திறக்கப்படவில்லை. ஒரு நிறுவனத்தின் நிர்வாகிகளைத் தளம் நியமிக்கிறது.',
    'inst.noMatch':
      'உங்கள் முகவரியுடன் பொருந்தும் சரிபார்க்கப்பட்ட மின்னஞ்சல் டொமைன் எந்த நிறுவனத்திடமும் இல்லை. உங்கள் பள்ளி அல்லது மதரசா இங்கே இருக்க வேண்டும் என்றால், அதன் நிர்வாகியிடம் கேளுங்கள்.',
    'inst.haveCode':
      'ஒரு பள்ளி கொடுத்த குறியீடு உங்களிடம் உள்ளதா? அது வேறொரு பக்கத்தில் பயன்படுத்தப்படுகிறது.',
    'inst.useCode': 'குறியீட்டைப் பயன்படுத்தவும்',
    'inst.memberNote':
      'நீங்கள் இந்த நிறுவனத்தின் உறுப்பினர். அதன் நிர்வாகிகள் அதை நிர்வகிக்கின்றனர். நீங்கள் எப்போது வேண்டுமானாலும் விலகலாம்.',
    'inst.joinedOn': 'நீங்கள் சேர்ந்த நேரம்: {date}',
    'inst.reportTitle': 'அதன் நபர்கள் என்ன படித்தனர்',
    'inst.reportWhat':
      'இவை எண்ணிக்கைகள், பதிவுகள் அல்ல. சேர்ந்த கணக்குகள், அந்தக் கணக்குகளின் குடும்பங்களில் உள்ள கற்பவர்கள், அந்தக் கற்பவர்கள் இரு தேதிகளுக்கு இடையில் பதிவு செய்த பாடநெறிகள், முடிக்கப்பட்ட பாடநெறிகள், வழங்கப்பட்ட சான்றிதழ்கள் ஆகியவை எண்ணப்படுகின்றன. எந்தப் பெயரும் எந்த மின்னஞ்சல் முகவரியும் காட்டப்படுவதில்லை. இந்த நிறுவனத்தில் கணக்கு இல்லாத கற்பவர் எண்ணப்படுவதில்லை. ஒன்று என்ற அளவு சிறிய எண்ணிக்கையும் ஒருவரைச் சுட்டக்கூடும்; எனவே சிறிய எண்ணிக்கையை ஒரு பெயரை நடத்துவது போலவே நடத்துங்கள்.',
    'inst.from': 'தொடக்கம்',
    'inst.to': 'முடிவு',
    'inst.readDo': 'இந்தத் தேதிகளைக் காட்டு',
    'inst.csvDo': 'கோப்பாகப் பதிவிறக்கவும்',
    'inst.statAccounts': 'சேர்ந்த கணக்குகள்: {count}',
    'inst.statLearners': 'அவற்றின் குடும்பங்களில் உள்ள கற்பவர்கள்: {count}',
    'inst.statEnrolments': 'இரு தேதிகளுக்கு இடையிலான பதிவுகள்: {count}',
    'inst.statFinished': 'இரு தேதிகளுக்கு இடையில் முடிக்கப்பட்ட பாடநெறிகள்: {count}',
    'inst.statCertificates': 'இரு தேதிகளுக்கு இடையில் வழங்கப்பட்ட சான்றிதழ்கள்: {count}',
    'inst.byCourse': 'பாடநெறி வாரியாக',
    'inst.colCourse': 'பாடநெறி',
    'inst.colLearners': 'கற்பவர்கள்',
    'inst.colEnrolments': 'பதிவுகள்',
    'inst.colFinished': 'முடிக்கப்பட்டவை',
    'inst.noneEnrolled': 'இந்தத் தேதிகளுக்கு இடையில் யாரும் எதிலும் பதிவு செய்யவில்லை.',
    'inst.reportUnread':
      'எண்ணிக்கைகளை இப்போது படிக்க முடியவில்லை. எண்ணிக்கை எதுவும் இல்லை என்று இதற்குப் பொருள் இல்லை. சிறிது நேரத்தில் மீண்டும் முயலுங்கள்.',
    'inst.badWindow': 'முடிவுத் தேதிக்குப் பிந்தாத தொடக்கத் தேதியைத் தேர்ந்தெடுங்கள்.',
    'inst.windowTooLong': 'இரண்டு ஆண்டுகளுக்கு மேல் இடைவெளி இல்லாத இரு தேதிகளைத் தேர்ந்தெடுங்கள்.',
    'inst.leaveTitle': 'விலகுதல்',
    'inst.leaveBody':
      'விலகுவது உங்கள் உறுப்பினர் நிலையை முடிக்கிறது; நீங்களும் உங்கள் குடும்பமும் இனி அதன் எண்ணிக்கைகளில் எண்ணப்படுவதில்லை. இது உங்கள் கணக்கையோ நீங்கள் கற்ற எதையுமோ நீக்காது.',
    'inst.leaveDo': 'இந்த நிறுவனத்திலிருந்து விலகவும்',
    'inst.whyLastAdmin':
      'நீங்கள் அதன் ஒரே நிர்வாகி. நீங்கள் விலகுவதற்கு முன் வேறொருவர் நிர்வாகியாக்கப்பட வேண்டும்.',
    'inst.whyAlready': 'நீங்கள் ஏற்கெனவே ஒரு நிறுவனத்தைச் சேர்ந்தவர்.',
    'inst.whyNoMatch':
      'உங்கள் முகவரியுடன் பொருந்தும் சரிபார்க்கப்பட்ட மின்னஞ்சல் டொமைன் இல்லை; எனவே நீங்கள் சேர்க்கப்படவில்லை.',
    'inst.whyNotMember': 'நீங்கள் எந்த நிறுவனத்தின் உறுப்பினரும் அல்ல.',
    'inst.failed': 'அதைச் செய்ய முடியவில்லை. எதுவும் மாற்றப்படவில்லை.',
    'inst.unsure':
      'அது செய்யப்பட்டது என்பதை எங்களால் உறுதிப்படுத்த முடியவில்லை. பார்க்க இந்தப் பக்கத்தை மீண்டும் திறக்கவும்.',
    'inst.adminEnglish':
      'கீழே உள்ள பகுதிகள் இந்த நிறுவனத்தின் நிர்வாகிகளுக்கானவை; தற்போது ஆங்கிலத்தில் உள்ளன.',
    'inst.csvNote': 'கோப்பின் உள்ளே உள்ள தலைப்புகள் ஆங்கிலத்தில் உள்ளன.',
    'inst.whySignedOut': 'நீங்கள் வெளியேறியுள்ளீர்கள். உள்நுழைந்து மீண்டும் முயலுங்கள்.',
  },
  ne: {
    'inst.title': 'संस्थाहरू',
    'inst.yours': 'तपाईंको संस्था',
    'inst.unread':
      'तपाईंको संस्था अहिले पढ्न सकिएन। यसको अर्थ तपाईं कुनै संस्थामा हुनुहुन्न भन्ने होइन। केही बेरमा फेरि प्रयास गर्नुहोस्।',
    'inst.notIn': 'तपाईं कुनै संस्थामा हुनुहुन्न',
    'inst.canJoin':
      'तपाईंको इमेल ठेगाना एउटा संस्थाले आफ्नै हो भनी देखाएको डोमेनमा छ, त्यसैले तपाईं त्यसमा सामेल हुन सक्नुहुन्छ। केही पनि आफैँ हुँदैन: तपाईं बटन थिचेर सामेल हुनुहुन्छ।',
    'inst.joinMeans':
      'सामेल हुँदा तपाईं र तपाईंको परिवारका सिकारुहरू त्यस संस्थाको सङ्ख्यामा थपिनुहुन्छ: त्यसका कति जनाले प्रत्येक कोर्समा भर्ना गरे र कति जनाले पूरा गरे। ती सङ्ख्या त्यसका सदस्यहरूलाई देखाइन्छ। कुनै नाम देखाइँदैन। सानो सङ्ख्याले पनि कसैलाई औँल्याउन सक्छ।',
    'inst.joinDo': 'यस संस्थामा सामेल हुनुहोस्',
    'inst.joinClosed':
      'इमेल ठेगानाबाट संस्थामा सामेल हुने सुविधा अहिले खुला छैन। संस्थाका प्रशासकहरू प्लेटफर्मले तोक्छ।',
    'inst.noMatch':
      'कुनै पनि संस्थासँग तपाईंको ठेगानासँग मिल्ने जाँचिएको इमेल डोमेन छैन। तपाईंको विद्यालय वा मदरसा यहाँ हुनुपर्ने हो भने, त्यसको प्रशासकलाई सोध्नुहोस्।',
    'inst.haveCode': 'के तपाईंसँग विद्यालयले दिएको कोड छ? त्यो अर्को पृष्ठमा प्रयोग हुन्छ।',
    'inst.useCode': 'कोड प्रयोग गर्नुहोस्',
    'inst.memberNote':
      'तपाईं यस संस्थाको सदस्य हुनुहुन्छ। यसका प्रशासकहरूले यसलाई सञ्चालन गर्छन्। तपाईं जुनसुकै बेला छोड्न सक्नुहुन्छ।',
    'inst.joinedOn': 'तपाईं सामेल भएको समय: {date}',
    'inst.reportTitle': 'यसका मानिसहरूले के पढे',
    'inst.reportWhat':
      'यी सङ्ख्या हुन्, अभिलेख होइनन्। सामेल भएका खाताहरू, ती खाताका परिवारका सिकारुहरू, ती सिकारुहरूले दुई मितिबीच भर्ना गरेका कोर्सहरू, पूरा गरिएका कोर्सहरू र जारी गरिएका प्रमाणपत्रहरू गनिन्छन्। कुनै नाम र कुनै इमेल ठेगाना देखाइँदैन। यस संस्थामा खाता नभएको सिकारु गनिँदैन। एक जति सानो सङ्ख्याले पनि कसैलाई औँल्याउन सक्छ, त्यसैले सानो सङ्ख्यालाई नामलाई जस्तै व्यवहार गर्नुहोस्।',
    'inst.from': 'देखि',
    'inst.to': 'सम्म',
    'inst.readDo': 'यी मितिहरू देखाउनुहोस्',
    'inst.csvDo': 'फाइलका रूपमा डाउनलोड गर्नुहोस्',
    'inst.statAccounts': 'सामेल भएका खाताहरू: {count}',
    'inst.statLearners': 'तिनका परिवारका सिकारुहरू: {count}',
    'inst.statEnrolments': 'दुई मितिबीचका भर्नाहरू: {count}',
    'inst.statFinished': 'दुई मितिबीच पूरा गरिएका कोर्सहरू: {count}',
    'inst.statCertificates': 'दुई मितिबीच जारी गरिएका प्रमाणपत्रहरू: {count}',
    'inst.byCourse': 'कोर्स अनुसार',
    'inst.colCourse': 'कोर्स',
    'inst.colLearners': 'सिकारुहरू',
    'inst.colEnrolments': 'भर्नाहरू',
    'inst.colFinished': 'पूरा भएका',
    'inst.noneEnrolled': 'यी मितिहरूबीच कसैले केहीमा भर्ना गरेन।',
    'inst.reportUnread':
      'सङ्ख्याहरू अहिले पढ्न सकिएन। यसको अर्थ कुनै सङ्ख्या छैन भन्ने होइन। केही बेरमा फेरि प्रयास गर्नुहोस्।',
    'inst.badWindow': 'अन्तिम मितिभन्दा पछि नपर्ने सुरु मिति छान्नुहोस्।',
    'inst.windowTooLong': 'दुई वर्षभन्दा बढी फरक नभएका दुई मिति छान्नुहोस्।',
    'inst.leaveTitle': 'छोड्ने',
    'inst.leaveBody':
      'छोड्दा तपाईंको सदस्यता समाप्त हुन्छ, र तपाईं र तपाईंको परिवार अब यसको सङ्ख्यामा गनिनुहुन्न। यसले तपाईंको खाता वा तपाईंले सिकेको केही पनि मेटाउँदैन।',
    'inst.leaveDo': 'यो संस्था छोड्नुहोस्',
    'inst.whyLastAdmin':
      'तपाईं यसको एक मात्र प्रशासक हुनुहुन्छ। तपाईंले छोड्नुअघि अरू कसैलाई प्रशासक बनाउनुपर्छ।',
    'inst.whyAlready': 'तपाईं पहिले नै एउटा संस्थाको सदस्य हुनुहुन्छ।',
    'inst.whyNoMatch': 'तपाईंको ठेगानासँग मिल्ने जाँचिएको इमेल डोमेन छैन, त्यसैले तपाईंलाई थपिएन।',
    'inst.whyNotMember': 'तपाईं कुनै संस्थाको सदस्य हुनुहुन्न।',
    'inst.failed': 'त्यो गर्न सकिएन। केही पनि परिवर्तन भएन।',
    'inst.unsure': 'त्यो भयो भनी हामीले पुष्टि गर्न सकेनौँ। हेर्न यो पृष्ठ फेरि खोल्नुहोस्।',
    'inst.adminEnglish':
      'तलका भागहरू यस संस्थाका प्रशासकहरूका लागि हुन् र अहिलेका लागि अङ्ग्रेजीमा छन्।',
    'inst.csvNote': 'फाइलभित्रका शीर्षकहरू अङ्ग्रेजीमा छन्।',
    'inst.whySignedOut': 'तपाईं साइन आउट हुनुहुन्छ। साइन इन गरेर फेरि प्रयास गर्नुहोस्।',
  },
};
