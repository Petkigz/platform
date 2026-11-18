import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The merge screen (`app/account/merge/page.tsx` and its panel).
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts`, `reading.ts`, `restore.ts` and `phone.ts`: written
 * for the twenty-seven languages with nothing held in `held.ts`, and for no
 * other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Every refusal is the screen's own sentence.** `merge_blocks()` and the
 * four merge functions refuse in English. None of that is shown: the reasons
 * are named in `lib/merge-outcome.ts` and said here (`merge.block*`,
 * `merge.err*`).
 *
 * **What is put in comes after a colon wherever a language would have to
 * inflect it.** A count in the reader's own digits (`{count}`), the name to
 * type (`{name}`) and a course title (`{title}`), each isolated by the page.
 * `{date}` is a formatted date and time in UTC.
 *
 * **It says what is so and no more.** What moves, what is deleted and what
 * stays behind are the three lists the migration acts on. No language below
 * says "everything" moves: the record of what the closed account did stays
 * with it, and a note, bookmark or notification both accounts hold is
 * deleted, not moved.
 *
 * **Served to the server only.** `merge.` is in `SERVER_ONLY_PREFIXES`: the
 * page is drawn on the server and hands the panel its words.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const MERGE: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'merge.title': 'دمج الحسابات',
    'merge.back': 'إعدادات الحساب',
    'merge.heading': 'دمج الحسابات',
    'merge.lede':
      'إذا سجّلت مرتين، يمكن نقل أحد الحسابين إلى الآخر لتكون دوراتك وشهاداتك في مكان واحد. يجب أن يوافق الحسابان، ويُغلق بعد ذلك الحساب الذي نُقل.',
    'merge.unread': 'تعذّرت قراءة طلبات الدمج الآن. لم يتغيّر شيء.',
    'merge.off':
      'دمج الحسابات موقوف في هذه المنصة. لا يمكن فعل شيء في هذه الصفحة حتى يشغّله المالك.',
    'merge.foot': 'يُكتب كل دمج في سجل التغييرات لدى المنصة، مع ما نُقل.',
    'merge.closeInstead':
      'لإغلاق حساب ثانٍ بدلًا من دمجه، سجّل الدخول إلى ذلك الحساب وأغلقه من هناك.',
    'merge.closeLink': 'إغلاق حساب',
    'merge.inHeading': 'حساب آخر يطلب أن يُدمج في هذا الحساب',
    'merge.inLede':
      'إذا كنت أنت صاحب الحساب الثاني، فالموافقة تنقل تعلّم ذلك الحساب وأدواره وبياناته إلى هذا الحساب وتغلق ذلك الحساب. لا يمكن التراجع عن ذلك. وإذا لم تكن أنت، فارفض. لا يحدث شيء حتى تجيب.',
    'merge.noName': 'حساب بلا اسم',
    'merge.inMerged': 'تم الدمج. الحساب الآخر مغلق.',
    'merge.inExpired': 'انتهت مهلة هذا الطلب قبل الرد عليه. اطلب مرة أخرى من الحساب الآخر.',
    'merge.whatMoves':
      'ما يُنقل: سجل تعلّم ذلك الحساب مع تقدّمه وشهاداته، وأدواره، وإشعاراته، ورقم هاتفه، والدورات التي أنشأها. ما يبقى: سجل ما فعله ذلك الحساب، مثل طلبات الشراء التي أجراها.',
    'merge.whatGoes':
      'ما يُحذف: إذا كان للحسابين ملاحظة أو إشارة مرجعية على الدرس نفسه، أو الإشعار نفسه، يُحتفظ بما في هذا الحساب ويُحذف الآخر. ويُحذف كذلك رقم هاتف الحساب الآخر إذا كان لهذا الحساب رقم.',
    'merge.confirmLabel': 'اكتب اسم هذا الحساب للتأكيد: {name}',
    'merge.needName':
      'ليس لهذا الحساب اسم بعد. أضف اسمًا في إعدادات الحساب أولًا: يُؤكَّد الدمج بكتابته.',
    'merge.accept': 'ادمجه في هذا الحساب',
    'merge.accepting': 'جارٍ الدمج…',
    'merge.decline': 'رفض',
    'merge.cannotUndo':
      'لا يمكن التراجع عن هذا. يُغلق الحساب الآخر ويُزال اسمه وبياناته. ويبقى تسجيل دخوله لدى خدمة تسجيل الدخول حتى يُحذف هناك.',
    'merge.blockSame': 'طرفا هذا الطلب حساب واحد.',
    'merge.blockAbsorbedClosed': 'الحساب الذي سيُنقل مغلق.',
    'merge.blockTargetClosed': 'الحساب الذي سيُنقل إليه مغلق.',
    'merge.blockPayouts': 'للحساب الذي سيُنقل دفعات في طريقها: {count}. انتظر حتى تنتهي.',
    'merge.blockBilling':
      'الحساب الذي سيُنقل يشارك أشخاصًا آخرين في حسابات فوترة: {count}. لا يمكن للدمج أن ينقل ترتيبات الدفع الخاصة بشخص آخر.',
    'merge.blockReviewers': 'الحسابان كلاهما في سجل المراجعين. المالك يقرّر أي قيد يبقى.',
    'merge.blockHouseholds':
      'كل حساب متعلّم في أسرة مختلفة. لا يمكن للدمج أن ينقل تعلّم شخص إلى أسرة أخرى.',
    'merge.blockSameCourse':
      'بدأ الحسابان الدورة نفسها: {title}. لا تستطيع المنصة أن تختار أي تقدّم هو الحقيقي. أكمل الدورة في أحد الحسابين أو اتركها قبل الدمج.',
    'merge.blockOwner':
      'الحساب الذي سيُنقل يحمل تعيينًا من تعيينات المالك في هذه المنصة. يجب أن يُنظر فيه على حدة قبل دمجه.',
    'merge.blockOther':
      'لا يمكن تنفيذ هذا الدمج الآن، وليس في هذه الصفحة جملة تشرح السبب. اسأل موظفي المنصة قبل المحاولة مرة أخرى.',
    'merge.noteJoin': 'يصير سجلّا التعلّم سجلًا واحدًا. وما في سجل هذا الحساب من قبل يبقى كما هو.',
    'merge.noteMoves': 'يُنقل سجل التعلّم كاملًا، مع تقدّمه وشهاداته.',
    'merge.outHeading': 'انقل هذا الحساب إلى حساب آخر',
    'merge.outLede':
      'إذا كان لك حسابان وهذا هو الذي لم تعد تريده، فاكتب عنوان البريد الإلكتروني للحساب الذي تريد الاحتفاظ به. ينتظر الطلب هناك حتى يسجّل أحد الدخول إلى ذلك الحساب ويوافق. وبهذا تعرف المنصة أنك تتحكم في الحسابين.',
    'merge.emailLabel': 'عنوان البريد الإلكتروني للحساب الذي سيبقى',
    'merge.emailHelp':
      'يجب أن يوافق ذلك الحساب قبل أن يُنقل أي شيء. يُغلق هذا الحساب بعد ذلك، ولا يمكن التراجع عن إغلاقه.',
    'merge.ask': 'اطلب الدمج',
    'merge.asking': 'جارٍ الطلب…',
    'merge.listHeading': 'الطلبات المرسلة من هذا الحساب',
    'merge.listInto': 'إلى الحساب الذي كتبت عنوانه',
    'merge.waitingUntil': 'ينتظر حتى {date}',
    'merge.nothingMoved': 'لم يكن هناك ما يحتاج إلى نقل.',
    'merge.withdraw': 'سحب الطلب',
    'merge.stPending': 'ينتظر',
    'merge.stCompleted': 'دُمج',
    'merge.stDeclined': 'رُفض',
    'merge.stCancelled': 'سُحب',
    'merge.stExpired': 'انتهت مهلته',
    'merge.movedHeading': 'ما نُقل',
    'merge.mvLearner': 'سجل التعلّم',
    'merge.mvEnrolments': 'التسجيلات في الدورات: {count}',
    'merge.mvCertificates': 'الشهادات: {count}',
    'merge.mvGrants': 'أذونات الوصول: {count}',
    'merge.mvReviews': 'التقييمات: {count}',
    'merge.mvAttempts': 'محاولات الاختبارات: {count}',
    'merge.mvSubmissions': 'الواجبات: {count}',
    'merge.mvCohorts': 'الصفوف المحددة بتاريخ: {count}',
    'merge.mvAttendance': 'الحصص المباشرة التي حُضرت: {count}',
    'merge.mvCases': 'طلبات الدعم: {count}',
    'merge.mvNotifications': 'الإشعارات: {count}',
    'merge.mvRoles': 'الأدوار: {count}',
    'merge.mvNotes': 'ملاحظات الدروس: {count}',
    'merge.mvBookmarks': 'الإشارات المرجعية: {count}',
    'merge.mvGuardianships': 'روابط أولياء الأمور: {count}',
    'merge.stayed': 'سجلات بقيت مع الحساب المغلق لأن هذا الحساب كان لديه الشيء نفسه: {count}.',
    'merge.asked': 'الطلب ينتظر في الحساب الآخر. سجّل الدخول هناك لتوافق عليه.',
    'merge.withdrawn': 'سُحب الطلب. لم يُنقل شيء.',
    'merge.merged': 'دُمج الحسابان. الحساب الآخر مغلق.',
    'merge.declined': 'رُفض الطلب. الحسابان كما كانا.',
    'merge.errSignedOut':
      'لقد خرجت من الحساب. سجّل الدخول مرة أخرى ثم حاول من جديد. لم يتغيّر شيء.',
    'merge.errEmail': 'اكتب عنوان البريد الإلكتروني للحساب الذي تريد الاحتفاظ به.',
    'merge.errNoAccount': 'لا يوجد حساب بهذا العنوان. لم يتغيّر شيء.',
    'merge.errSameAccount':
      'هذا عنوان هذا الحساب نفسه. اكتب عنوان الحساب الآخر، الذي تريد الاحتفاظ به.',
    'merge.errPending': 'هناك طلب من هذا الحساب ينتظر من قبل. اسحبه قبل أن تطلب من حساب آخر.',
    'merge.errNoRequest': 'لم يعد ذلك الطلب موجودًا. لم يتغيّر شيء.',
    'merge.errNotYours': 'لا يستطيع هذا الحساب الرد على ذلك الطلب. لم يتغيّر شيء.',
    'merge.errName': 'الاسم المكتوب ليس اسم هذا الحساب حرفًا بحرف. لم يتغيّر شيء.',
    'merge.errBlocked':
      'لا يمكن تنفيذ هذا الدمج الآن. لم يُنقل شيء. أعد تحميل هذه الصفحة لترى السبب بجانب الطلب.',
    'merge.errExpired':
      'انتهت مهلة هذا الطلب قبل الرد عليه. لم يُنقل شيء. اطلب مرة أخرى من الحساب الآخر.',
    'merge.errAnswered':
      'سبق الرد على هذا الطلب. لم يتغيّر شيء الآن. أعد تحميل هذه الصفحة لترى ما حدث.',
    'merge.errRefused': 'لم تقبل المنصة هذا. لم يتغيّر شيء.',
    'merge.unconfirmed':
      'لم يصل أي رد، ولذلك لا يُعرف هل تمّ هذا. أعد تحميل هذه الصفحة لترى الحال قبل أن تحاول مرة أخرى.',
  },
  ur: {
    'merge.title': 'اکاؤنٹ ضم کرنا',
    'merge.back': 'اکاؤنٹ کی ترتیبات',
    'merge.heading': 'اکاؤنٹ ضم کرنا',
    'merge.lede':
      'اگر آپ نے دو بار اندراج کیا ہے تو ایک اکاؤنٹ دوسرے میں منتقل کیا جا سکتا ہے، تاکہ آپ کے کورس اور اسناد ایک جگہ ہوں۔ دونوں اکاؤنٹس کا متفق ہونا ضروری ہے، اور جو اکاؤنٹ منتقل ہوتا ہے وہ بعد میں بند کر دیا جاتا ہے۔',
    'merge.unread': 'ضم کی درخواستیں اس وقت پڑھی نہیں جا سکیں۔ کچھ تبدیل نہیں ہوا۔',
    'merge.off':
      'اس پلیٹ فارم پر اکاؤنٹ ضم کرنا بند ہے۔ جب تک مالک اسے چالو نہ کرے، اس صفحے پر کچھ نہیں کیا جا سکتا۔',
    'merge.foot':
      'ہر ضم پلیٹ فارم کے تبدیلیوں کے ریکارڈ میں لکھا جاتا ہے، ساتھ یہ بھی کہ کیا منتقل ہوا۔',
    'merge.closeInstead':
      'دوسرے اکاؤنٹ کو ضم کرنے کے بجائے بند کرنے کے لیے اس اکاؤنٹ میں سائن اِن کریں اور اسے وہیں سے بند کریں۔',
    'merge.closeLink': 'اکاؤنٹ بند کرنا',
    'merge.inHeading': 'ایک اور اکاؤنٹ اس اکاؤنٹ میں ضم ہونے کی درخواست کر رہا ہے',
    'merge.inLede':
      'اگر دوسرے اکاؤنٹ پر آپ ہی ہیں تو متفق ہونے سے اس اکاؤنٹ کی تعلیم، کردار اور تفصیلات اس اکاؤنٹ میں منتقل ہو جاتی ہیں اور وہ اکاؤنٹ بند ہو جاتا ہے۔ اسے واپس نہیں کیا جا سکتا۔ اگر یہ آپ نہیں ہیں تو انکار کریں۔ آپ کے جواب تک کچھ نہیں ہوتا۔',
    'merge.noName': 'بغیر نام کا اکاؤنٹ',
    'merge.inMerged': 'ضم ہو گیا۔ دوسرا اکاؤنٹ بند ہے۔',
    'merge.inExpired':
      'جواب ملنے سے پہلے اس درخواست کی مدت ختم ہو گئی۔ دوسرے اکاؤنٹ سے دوبارہ درخواست کریں۔',
    'merge.whatMoves':
      'کیا منتقل ہوتا ہے: اس اکاؤنٹ کا تعلیمی ریکارڈ اس کی پیش رفت اور اسناد سمیت، اس کے کردار، اس کی اطلاعات، اس کا فون نمبر اور اس کے بنائے ہوئے کورس۔ کیا رہ جاتا ہے: اس اکاؤنٹ کے کیے ہوئے کاموں کا ریکارڈ، جیسے اس کے دیے ہوئے آرڈر۔',
    'merge.whatGoes':
      'کیا حذف ہوتا ہے: جہاں دونوں اکاؤنٹس کا ایک ہی سبق پر نوٹ یا بُک مارک ہو، یا ایک ہی اطلاع ہو، وہاں اس اکاؤنٹ والا رکھا جاتا ہے اور دوسرا حذف کر دیا جاتا ہے۔ اگر اس اکاؤنٹ کا اپنا فون نمبر ہے تو دوسرے اکاؤنٹ کا فون نمبر بھی حذف ہو جاتا ہے۔',
    'merge.confirmLabel': 'تصدیق کے لیے اس اکاؤنٹ کا نام لکھیں: {name}',
    'merge.needName':
      'اس اکاؤنٹ کا ابھی کوئی نام نہیں۔ پہلے اکاؤنٹ کی ترتیبات میں نام شامل کریں: ضم کی تصدیق اسے لکھ کر ہوتی ہے۔',
    'merge.accept': 'اسے اس اکاؤنٹ میں ضم کریں',
    'merge.accepting': 'ضم ہو رہا ہے…',
    'merge.decline': 'انکار کریں',
    'merge.cannotUndo':
      'اسے واپس نہیں کیا جا سکتا۔ دوسرا اکاؤنٹ بند کر دیا جاتا ہے اور اس کا نام اور تفصیلات ہٹا دی جاتی ہیں۔ اس کا سائن اِن، سائن اِن کی سروس کے پاس رہتا ہے جب تک وہاں سے حذف نہ کیا جائے۔',
    'merge.blockSame': 'اس درخواست کے دونوں طرف ایک ہی اکاؤنٹ ہے۔',
    'merge.blockAbsorbedClosed': 'جو اکاؤنٹ منتقل ہونا ہے وہ بند ہے۔',
    'merge.blockTargetClosed': 'جس اکاؤنٹ میں منتقل ہونا ہے وہ بند ہے۔',
    'merge.blockPayouts':
      'جو اکاؤنٹ منتقل ہونا ہے اس کی ادائیگیاں راستے میں ہیں: {count}۔ ان کے مکمل ہونے تک انتظار کریں۔',
    'merge.blockBilling':
      'جو اکاؤنٹ منتقل ہونا ہے وہ دوسرے لوگوں کے ساتھ بلنگ اکاؤنٹس میں شریک ہے: {count}۔ ضم کسی دوسرے شخص کے ادائیگی کے انتظامات منتقل نہیں کر سکتا۔',
    'merge.blockReviewers':
      'دونوں اکاؤنٹس جائزہ لینے والوں کے رجسٹر میں ہیں۔ مالک طے کرتا ہے کہ کون سا اندراج رہے گا۔',
    'merge.blockHouseholds':
      'ہر اکاؤنٹ ایک الگ خاندان میں طالب علم ہے۔ ضم ایک شخص کی تعلیم کسی دوسرے خاندان میں منتقل نہیں کر سکتا۔',
    'merge.blockSameCourse':
      'دونوں اکاؤنٹس نے ایک ہی کورس شروع کیا ہے: {title}۔ پلیٹ فارم یہ نہیں چن سکتا کہ کون سی پیش رفت اصل ہے۔ ضم سے پہلے ایک اکاؤنٹ پر کورس مکمل کریں یا اسے چھوڑ دیں۔',
    'merge.blockOwner':
      'جو اکاؤنٹ منتقل ہونا ہے اس کے پاس اس پلیٹ فارم پر مالک کی ایک تقرری ہے۔ ضم سے پہلے اسے الگ سے دیکھا جانا ضروری ہے۔',
    'merge.blockOther':
      'یہ ضم اس وقت نہیں ہو سکتا، اور اس صفحے پر وجہ کے لیے کوئی جملہ نہیں۔ دوبارہ کوشش سے پہلے پلیٹ فارم کے عملے سے پوچھیں۔',
    'merge.noteJoin':
      'دونوں تعلیمی ریکارڈ ایک ہو جاتے ہیں۔ جو کچھ اس اکاؤنٹ کے ریکارڈ میں پہلے سے ہے وہ ویسا ہی رہتا ہے۔',
    'merge.noteMoves': 'تعلیمی ریکارڈ پورا منتقل ہوتا ہے، اپنی پیش رفت اور اسناد سمیت۔',
    'merge.outHeading': 'اس اکاؤنٹ کو کسی دوسرے اکاؤنٹ میں منتقل کریں',
    'merge.outLede':
      'اگر آپ کے دو اکاؤنٹ ہیں اور یہ وہ ہے جو آپ کو اب نہیں چاہیے تو اس اکاؤنٹ کا ای میل پتا لکھیں جسے آپ رکھنا چاہتے ہیں۔ درخواست وہاں انتظار کرتی ہے جب تک کوئی اس اکاؤنٹ میں سائن اِن کر کے متفق نہ ہو۔ اسی سے پلیٹ فارم جانتا ہے کہ دونوں آپ کے قابو میں ہیں۔',
    'merge.emailLabel': 'جو اکاؤنٹ رکھنا ہے اس کا ای میل پتا',
    'merge.emailHelp':
      'کچھ بھی منتقل ہونے سے پہلے اس اکاؤنٹ کا متفق ہونا ضروری ہے۔ اس کے بعد یہ اکاؤنٹ بند کر دیا جاتا ہے، اور اسے بند کرنا واپس نہیں ہو سکتا۔',
    'merge.ask': 'ضم کی درخواست کریں',
    'merge.asking': 'درخواست بھیجی جا رہی ہے…',
    'merge.listHeading': 'اس اکاؤنٹ سے کی گئی درخواستیں',
    'merge.listInto': 'اس اکاؤنٹ میں جس کا پتا آپ نے لکھا',
    'merge.waitingUntil': '{date} تک انتظار میں',
    'merge.nothingMoved': 'منتقل کرنے کو کچھ نہیں تھا۔',
    'merge.withdraw': 'درخواست واپس لیں',
    'merge.stPending': 'انتظار میں',
    'merge.stCompleted': 'ضم ہو گیا',
    'merge.stDeclined': 'انکار ہوا',
    'merge.stCancelled': 'واپس لی گئی',
    'merge.stExpired': 'مدت ختم',
    'merge.movedHeading': 'کیا منتقل ہوا',
    'merge.mvLearner': 'تعلیمی ریکارڈ',
    'merge.mvEnrolments': 'کورسوں میں داخلے: {count}',
    'merge.mvCertificates': 'اسناد: {count}',
    'merge.mvGrants': 'رسائی کی اجازتیں: {count}',
    'merge.mvReviews': 'تبصرے: {count}',
    'merge.mvAttempts': 'جائزوں کی کوششیں: {count}',
    'merge.mvSubmissions': 'اسائنمنٹس: {count}',
    'merge.mvCohorts': 'تاریخ والی کلاسیں: {count}',
    'merge.mvAttendance': 'براہِ راست کلاسیں جن میں حاضری رہی: {count}',
    'merge.mvCases': 'مدد کے معاملات: {count}',
    'merge.mvNotifications': 'اطلاعات: {count}',
    'merge.mvRoles': 'کردار: {count}',
    'merge.mvNotes': 'سبق کے نوٹ: {count}',
    'merge.mvBookmarks': 'بُک مارک: {count}',
    'merge.mvGuardianships': 'سرپرستی کے تعلق: {count}',
    'merge.stayed':
      'وہ ریکارڈ جو بند اکاؤنٹ کے ساتھ رہ گئے، کیونکہ اس اکاؤنٹ کے پاس وہی چیز پہلے سے تھی: {count}۔',
    'merge.asked':
      'درخواست دوسرے اکاؤنٹ پر انتظار میں ہے۔ اس سے متفق ہونے کے لیے وہاں سائن اِن کریں۔',
    'merge.withdrawn': 'درخواست واپس لے لی گئی۔ کچھ منتقل نہیں ہوا۔',
    'merge.merged': 'اکاؤنٹ ضم ہو گئے۔ دوسرا اکاؤنٹ بند ہے۔',
    'merge.declined': 'انکار کر دیا گیا۔ دونوں اکاؤنٹ ویسے ہی ہیں جیسے تھے۔',
    'merge.errSignedOut':
      'آپ سائن آؤٹ ہو چکے ہیں۔ دوبارہ سائن اِن کریں، پھر ایک بار اور کوشش کریں۔ کچھ تبدیل نہیں ہوا۔',
    'merge.errEmail': 'اس اکاؤنٹ کا ای میل پتا لکھیں جسے آپ رکھنا چاہتے ہیں۔',
    'merge.errNoAccount': 'اس ای میل پتے کا کوئی اکاؤنٹ نہیں۔ کچھ تبدیل نہیں ہوا۔',
    'merge.errSameAccount':
      'یہ اسی اکاؤنٹ کا پتا ہے۔ دوسرے اکاؤنٹ کا پتا لکھیں، جسے آپ رکھنا چاہتے ہیں۔',
    'merge.errPending':
      'اس اکاؤنٹ کی ایک درخواست پہلے سے انتظار میں ہے۔ کسی اور اکاؤنٹ سے درخواست کرنے سے پہلے اسے واپس لیں۔',
    'merge.errNoRequest': 'وہ درخواست اب موجود نہیں۔ کچھ تبدیل نہیں ہوا۔',
    'merge.errNotYours': 'یہ اکاؤنٹ اس درخواست کا جواب نہیں دے سکتا۔ کچھ تبدیل نہیں ہوا۔',
    'merge.errName': 'لکھا ہوا نام حرف بہ حرف اس اکاؤنٹ کا نام نہیں ہے۔ کچھ تبدیل نہیں ہوا۔',
    'merge.errBlocked':
      'یہ ضم اس وقت نہیں ہو سکتا۔ کچھ منتقل نہیں ہوا۔ درخواست کے ساتھ وجہ دیکھنے کے لیے یہ صفحہ دوبارہ لوڈ کریں۔',
    'merge.errExpired':
      'جواب ملنے سے پہلے اس درخواست کی مدت ختم ہو گئی۔ کچھ منتقل نہیں ہوا۔ دوسرے اکاؤنٹ سے دوبارہ درخواست کریں۔',
    'merge.errAnswered':
      'اس درخواست کا جواب پہلے ہی دیا جا چکا تھا۔ ابھی کچھ تبدیل نہیں ہوا۔ کیا ہوا، یہ دیکھنے کے لیے یہ صفحہ دوبارہ لوڈ کریں۔',
    'merge.errRefused': 'پلیٹ فارم نے اسے قبول نہیں کیا۔ کچھ تبدیل نہیں ہوا۔',
    'merge.unconfirmed':
      'کوئی جواب نہیں آیا، اس لیے معلوم نہیں کہ یہ ہوا یا نہیں۔ دوبارہ کوشش سے پہلے صورتِ حال دیکھنے کے لیے یہ صفحہ دوبارہ لوڈ کریں۔',
  },
  fa: {
    'merge.title': 'ادغام حساب‌ها',
    'merge.back': 'تنظیمات حساب',
    'merge.heading': 'ادغام حساب‌ها',
    'merge.lede':
      'اگر دو بار ثبت‌نام کرده‌اید، می‌توان یک حساب را به حساب دیگر منتقل کرد تا دوره‌ها و گواهی‌نامه‌هایتان یک جا باشند. هر دو حساب باید موافقت کنند، و حسابی که منتقل می‌شود پس از آن بسته می‌شود.',
    'merge.unread': 'درخواست‌های ادغام اکنون خوانده نشد. چیزی تغییر نکرد.',
    'merge.off':
      'ادغام حساب‌ها در این سکو خاموش است. تا وقتی مالک آن را روشن نکند، در این صفحه کاری نمی‌توان کرد.',
    'merge.foot': 'هر ادغام در سابقهٔ تغییرات سکو نوشته می‌شود، همراه با آنچه منتقل شد.',
    'merge.closeInstead':
      'برای بستن حساب دوم به جای ادغام آن، وارد همان حساب شوید و آن را از همان‌جا ببندید.',
    'merge.closeLink': 'بستن حساب',
    'merge.inHeading': 'حساب دیگری درخواست کرده در این حساب ادغام شود',
    'merge.inLede':
      'اگر در حساب دوم هم خود شما هستید، موافقت شما یادگیری، نقش‌ها و مشخصات آن حساب را به این حساب منتقل می‌کند و آن حساب را می‌بندد. این کار برگشت‌پذیر نیست. اگر شما نیستید، رد کنید. تا وقتی پاسخ ندهید هیچ اتفاقی نمی‌افتد.',
    'merge.noName': 'حسابی بدون نام',
    'merge.inMerged': 'ادغام شد. حساب دیگر بسته است.',
    'merge.inExpired': 'مهلت این درخواست پیش از پاسخ تمام شد. از حساب دیگر دوباره درخواست کنید.',
    'merge.whatMoves':
      'آنچه منتقل می‌شود: سابقهٔ یادگیری آن حساب با پیشرفت و گواهی‌نامه‌هایش، نقش‌هایش، اعلان‌هایش، شمارهٔ تلفنش و دوره‌هایی که ساخته است. آنچه می‌ماند: سابقهٔ کارهایی که آن حساب کرده است، مانند سفارش‌هایی که ثبت کرده.',
    'merge.whatGoes':
      'آنچه حذف می‌شود: جایی که هر دو حساب روی یک درس یادداشت یا نشانک دارند، یا یک اعلان یکسان دارند، آنچه در این حساب است می‌ماند و دیگری حذف می‌شود. شمارهٔ تلفن حساب دیگر هم، اگر این حساب خودش شماره داشته باشد، حذف می‌شود.',
    'merge.confirmLabel': 'برای تأیید، نام این حساب را بنویسید: {name}',
    'merge.needName':
      'این حساب هنوز نام ندارد. نخست در تنظیمات حساب نامی بیفزایید: ادغام با نوشتن آن تأیید می‌شود.',
    'merge.accept': 'در این حساب ادغام شود',
    'merge.accepting': 'در حال ادغام…',
    'merge.decline': 'رد کردن',
    'merge.cannotUndo':
      'این کار برگشت‌پذیر نیست. حساب دیگر بسته می‌شود و نام و مشخصاتش برداشته می‌شود. ورود آن نزد سرویس ورود می‌ماند تا آنجا حذف شود.',
    'merge.blockSame': 'دو طرف این درخواست یک حساب‌اند.',
    'merge.blockAbsorbedClosed': 'حسابی که قرار است منتقل شود بسته است.',
    'merge.blockTargetClosed': 'حسابی که قرار است به آن منتقل شود بسته است.',
    'merge.blockPayouts':
      'حسابی که قرار است منتقل شود پرداخت‌هایی در راه دارد: {count}. صبر کنید تا تمام شوند.',
    'merge.blockBilling':
      'حسابی که قرار است منتقل شود با افراد دیگر در حساب‌های صورت‌حساب شریک است: {count}. ادغام نمی‌تواند ترتیبات پرداخت شخص دیگری را منتقل کند.',
    'merge.blockReviewers':
      'هر دو حساب در فهرست بازبین‌ها هستند. مالک تصمیم می‌گیرد کدام ثبت بماند.',
    'merge.blockHouseholds':
      'هر حساب در خانواده‌ای جداگانه یادگیرنده است. ادغام نمی‌تواند یادگیری یک نفر را به خانوادهٔ دیگری ببرد.',
    'merge.blockSameCourse':
      'هر دو حساب یک دوره را آغاز کرده‌اند: {title}. سکو نمی‌تواند برگزیند کدام پیشرفت واقعی است. پیش از ادغام، دوره را در یکی از حساب‌ها تمام کنید یا آن را ترک کنید.',
    'merge.blockOwner':
      'حسابی که قرار است منتقل شود در این سکو یکی از سمت‌های مالک را دارد. پیش از ادغام باید جداگانه بررسی شود.',
    'merge.blockOther':
      'این ادغام اکنون انجام‌شدنی نیست، و این صفحه برای دلیل آن جمله‌ای ندارد. پیش از تلاش دوباره از کارکنان سکو بپرسید.',
    'merge.noteJoin':
      'دو سابقهٔ یادگیری یکی می‌شوند. آنچه سابقهٔ این حساب از پیش دارد همان‌طور می‌ماند.',
    'merge.noteMoves': 'سابقهٔ یادگیری به‌طور کامل منتقل می‌شود، با پیشرفت و گواهی‌نامه‌هایش.',
    'merge.outHeading': 'این حساب را به حساب دیگری منتقل کنید',
    'merge.outLede':
      'اگر دو حساب دارید و این همان است که دیگر نمی‌خواهید، نشانی ایمیل حسابی را که می‌خواهید نگه دارید بنویسید. درخواست آنجا منتظر می‌ماند تا کسی وارد آن حساب شود و موافقت کند. سکو از همین راه می‌فهمد که هر دو در اختیار شماست.',
    'merge.emailLabel': 'نشانی ایمیل حسابی که می‌ماند',
    'merge.emailHelp':
      'پیش از آنکه چیزی منتقل شود، آن حساب باید موافقت کند. این حساب پس از آن بسته می‌شود، و بستن آن برگشت‌پذیر نیست.',
    'merge.ask': 'درخواست ادغام',
    'merge.asking': 'در حال درخواست…',
    'merge.listHeading': 'درخواست‌هایی که از این حساب داده شده',
    'merge.listInto': 'به حسابی که نشانی‌اش را نوشتید',
    'merge.waitingUntil': 'تا {date} منتظر است',
    'merge.nothingMoved': 'چیزی برای انتقال نبود.',
    'merge.withdraw': 'پس گرفتن درخواست',
    'merge.stPending': 'در انتظار',
    'merge.stCompleted': 'ادغام شد',
    'merge.stDeclined': 'رد شد',
    'merge.stCancelled': 'پس گرفته شد',
    'merge.stExpired': 'مهلت تمام شد',
    'merge.movedHeading': 'آنچه منتقل شد',
    'merge.mvLearner': 'سابقهٔ یادگیری',
    'merge.mvEnrolments': 'ثبت‌نام‌ها در دوره‌ها: {count}',
    'merge.mvCertificates': 'گواهی‌نامه‌ها: {count}',
    'merge.mvGrants': 'مجوزهای دسترسی: {count}',
    'merge.mvReviews': 'نظرها: {count}',
    'merge.mvAttempts': 'تلاش‌های آزمون: {count}',
    'merge.mvSubmissions': 'تکلیف‌ها: {count}',
    'merge.mvCohorts': 'کلاس‌های تاریخ‌دار: {count}',
    'merge.mvAttendance': 'کلاس‌های زنده‌ای که در آن‌ها حضور بوده: {count}',
    'merge.mvCases': 'پرونده‌های پشتیبانی: {count}',
    'merge.mvNotifications': 'اعلان‌ها: {count}',
    'merge.mvRoles': 'نقش‌ها: {count}',
    'merge.mvNotes': 'یادداشت‌های درس: {count}',
    'merge.mvBookmarks': 'نشانک‌ها: {count}',
    'merge.mvGuardianships': 'پیوندهای سرپرستی: {count}',
    'merge.stayed':
      'سابقه‌هایی که نزد حساب بسته‌شده ماندند، چون این حساب همان را از پیش داشت: {count}.',
    'merge.asked': 'درخواست در حساب دیگر منتظر است. برای موافقت با آن، آنجا وارد شوید.',
    'merge.withdrawn': 'درخواست پس گرفته شد. چیزی منتقل نشد.',
    'merge.merged': 'حساب‌ها ادغام شدند. حساب دیگر بسته است.',
    'merge.declined': 'رد شد. هر دو حساب همان‌اند که بودند.',
    'merge.errSignedOut':
      'از حساب خارج شده‌اید. دوباره وارد شوید و یک بار دیگر تلاش کنید. چیزی تغییر نکرد.',
    'merge.errEmail': 'نشانی ایمیل حسابی را که می‌خواهید نگه دارید بنویسید.',
    'merge.errNoAccount': 'هیچ حسابی با این نشانی ایمیل نیست. چیزی تغییر نکرد.',
    'merge.errSameAccount':
      'این نشانی همین حساب است. نشانی حساب دیگر را بنویسید، همان که می‌خواهید نگه دارید.',
    'merge.errPending':
      'یک درخواست از این حساب از پیش منتظر است. پیش از درخواست از حساب دیگر، آن را پس بگیرید.',
    'merge.errNoRequest': 'آن درخواست دیگر وجود ندارد. چیزی تغییر نکرد.',
    'merge.errNotYours': 'این حساب نمی‌تواند به آن درخواست پاسخ دهد. چیزی تغییر نکرد.',
    'merge.errName': 'نامی که نوشته شد، حرف به حرف، نام این حساب نیست. چیزی تغییر نکرد.',
    'merge.errBlocked':
      'این ادغام اکنون انجام‌شدنی نیست. چیزی منتقل نشد. برای دیدن دلیل در کنار درخواست، این صفحه را دوباره بارگیری کنید.',
    'merge.errExpired':
      'مهلت این درخواست پیش از پاسخ تمام شد. چیزی منتقل نشد. از حساب دیگر دوباره درخواست کنید.',
    'merge.errAnswered':
      'به این درخواست پیش‌تر پاسخ داده شده بود. اکنون چیزی تغییر نکرد. برای دیدن آنچه رخ داد، این صفحه را دوباره بارگیری کنید.',
    'merge.errRefused': 'سکو این را نپذیرفت. چیزی تغییر نکرد.',
    'merge.unconfirmed':
      'پاسخی نرسید، پس معلوم نیست این کار انجام شد یا نه. پیش از تلاش دوباره، این صفحه را دوباره بارگیری کنید تا ببینید وضع چگونه است.',
  },
  'fa-af': {
    'merge.title': 'یکجا کردن حساب‌ها',
    'merge.back': 'تنظیمات حساب',
    'merge.heading': 'یکجا کردن حساب‌ها',
    'merge.lede':
      'اگر دو بار ثبت نام کرده‌اید، یک حساب را می‌توان به حساب دیگر انتقال داد تا کورس‌ها و اسناد شما در یک جای باشند. هر دو حساب باید موافقه کنند، و حسابی که انتقال می‌یابد پس از آن بسته می‌شود.',
    'merge.unread': 'درخواست‌های یکجا کردن همین حالا خوانده نشد. چیزی تغییر نکرد.',
    'merge.off':
      'یکجا کردن حساب‌ها در این پلتفرم خاموش است. تا وقتی مالک آن را روشن نکند، در این صفحه کاری کرده نمی‌شود.',
    'merge.foot': 'هر یکجا کردن در سابقهٔ تغییرات پلتفرم نوشته می‌شود، همراه با آنچه انتقال یافت.',
    'merge.closeInstead':
      'برای بستن حساب دوم به جای یکجا کردن آن، به همان حساب وارد شوید و آن را از همان‌جا ببندید.',
    'merge.closeLink': 'بستن حساب',
    'merge.inHeading': 'حساب دیگری خواسته است با این حساب یکجا شود',
    'merge.inLede':
      'اگر در حساب دوم هم خود شما هستید، موافقهٔ شما آموزش، نقش‌ها و مشخصات آن حساب را به این حساب انتقال می‌دهد و آن حساب را می‌بندد. این کار برگشت ندارد. اگر شما نیستید، رد کنید. تا وقتی پاسخ ندهید هیچ چیزی رخ نمی‌دهد.',
    'merge.noName': 'حسابی بدون نام',
    'merge.inMerged': 'یکجا شد. حساب دیگر بسته است.',
    'merge.inExpired': 'مهلت این درخواست پیش از پاسخ تمام شد. از حساب دیگر دوباره درخواست کنید.',
    'merge.whatMoves':
      'آنچه انتقال می‌یابد: سابقهٔ آموزش آن حساب با پیشرفت و اسنادش، نقش‌هایش، اطلاعیه‌هایش، شمارهٔ تلفونش و کورس‌هایی که ساخته است. آنچه می‌ماند: سابقهٔ کارهایی که آن حساب کرده است، مانند فرمایش‌هایی که داده.',
    'merge.whatGoes':
      'آنچه حذف می‌شود: جایی که هر دو حساب روی یک درس یادداشت یا نشانی دارند، یا یک اطلاعیهٔ یکسان دارند، آنچه در این حساب است می‌ماند و دیگرش حذف می‌شود. شمارهٔ تلفون حساب دیگر هم، اگر این حساب خودش شماره داشته باشد، حذف می‌شود.',
    'merge.confirmLabel': 'برای تأیید، نام این حساب را بنویسید: {name}',
    'merge.needName':
      'این حساب هنوز نام ندارد. نخست در تنظیمات حساب نامی بیفزایید: یکجا کردن با نوشتن آن تأیید می‌شود.',
    'merge.accept': 'با این حساب یکجا شود',
    'merge.accepting': 'در حال یکجا کردن…',
    'merge.decline': 'رد کردن',
    'merge.cannotUndo':
      'این کار برگشت ندارد. حساب دیگر بسته می‌شود و نام و مشخصاتش برداشته می‌شود. ورود آن نزد خدمت ورود می‌ماند تا آنجا حذف شود.',
    'merge.blockSame': 'دو طرف این درخواست یک حساب است.',
    'merge.blockAbsorbedClosed': 'حسابی که باید انتقال یابد بسته است.',
    'merge.blockTargetClosed': 'حسابی که باید به آن انتقال یابد بسته است.',
    'merge.blockPayouts':
      'حسابی که باید انتقال یابد پرداخت‌هایی در راه دارد: {count}. صبر کنید تا تمام شوند.',
    'merge.blockBilling':
      'حسابی که باید انتقال یابد با کسان دیگر در حساب‌های صورت‌حساب شریک است: {count}. یکجا کردن نمی‌تواند ترتیبات پرداخت کس دیگری را انتقال دهد.',
    'merge.blockReviewers':
      'هر دو حساب در فهرست بازبین‌ها هستند. مالک تصمیم می‌گیرد کدام ثبت بماند.',
    'merge.blockHouseholds':
      'هر حساب در یک خانوادهٔ جداگانه شاگرد است. یکجا کردن نمی‌تواند آموزش یک نفر را به خانوادهٔ دیگری ببرد.',
    'merge.blockSameCourse':
      'هر دو حساب یک کورس را آغاز کرده‌اند: {title}. پلتفرم نمی‌تواند انتخاب کند کدام پیشرفت واقعی است. پیش از یکجا کردن، کورس را در یکی از حساب‌ها تمام کنید یا آن را ترک کنید.',
    'merge.blockOwner':
      'حسابی که باید انتقال یابد در این پلتفرم یکی از گماشت‌های مالک را دارد. پیش از یکجا کردن باید جداگانه بررسی شود.',
    'merge.blockOther':
      'این یکجا کردن همین حالا شدنی نیست، و این صفحه برای دلیل آن جمله‌ای ندارد. پیش از تلاش دوباره از کارمندان پلتفرم بپرسید.',
    'merge.noteJoin':
      'دو سابقهٔ آموزش یکی می‌شوند. آنچه سابقهٔ این حساب از پیش دارد همان‌طور می‌ماند.',
    'merge.noteMoves': 'سابقهٔ آموزش به‌طور کامل انتقال می‌یابد، با پیشرفت و اسنادش.',
    'merge.outHeading': 'این حساب را به حساب دیگری انتقال دهید',
    'merge.outLede':
      'اگر دو حساب دارید و این همان است که دیگر نمی‌خواهید، نشانی ایمیل حسابی را که می‌خواهید نگه دارید بنویسید. درخواست آنجا منتظر می‌ماند تا کسی به آن حساب وارد شود و موافقه کند. پلتفرم از همین راه می‌داند که هر دو در اختیار شماست.',
    'merge.emailLabel': 'نشانی ایمیل حسابی که می‌ماند',
    'merge.emailHelp':
      'پیش از آنکه چیزی انتقال یابد، آن حساب باید موافقه کند. این حساب پس از آن بسته می‌شود، و بستن آن برگشت ندارد.',
    'merge.ask': 'درخواست یکجا کردن',
    'merge.asking': 'در حال درخواست…',
    'merge.listHeading': 'درخواست‌هایی که از این حساب داده شده',
    'merge.listInto': 'به حسابی که نشانی‌اش را نوشتید',
    'merge.waitingUntil': 'تا {date} منتظر است',
    'merge.nothingMoved': 'چیزی برای انتقال نبود.',
    'merge.withdraw': 'پس گرفتن درخواست',
    'merge.stPending': 'در انتظار',
    'merge.stCompleted': 'یکجا شد',
    'merge.stDeclined': 'رد شد',
    'merge.stCancelled': 'پس گرفته شد',
    'merge.stExpired': 'مهلت تمام شد',
    'merge.movedHeading': 'آنچه انتقال یافت',
    'merge.mvLearner': 'سابقهٔ آموزش',
    'merge.mvEnrolments': 'ثبت نام‌ها در کورس‌ها: {count}',
    'merge.mvCertificates': 'اسناد: {count}',
    'merge.mvGrants': 'اجازه‌های دسترسی: {count}',
    'merge.mvReviews': 'نظرها: {count}',
    'merge.mvAttempts': 'تلاش‌های ارزیابی: {count}',
    'merge.mvSubmissions': 'کارهای خانگی: {count}',
    'merge.mvCohorts': 'صنف‌های تاریخ‌دار: {count}',
    'merge.mvAttendance': 'صنف‌های زنده‌ای که در آن‌ها حاضری بوده: {count}',
    'merge.mvCases': 'دوسیه‌های پشتیبانی: {count}',
    'merge.mvNotifications': 'اطلاعیه‌ها: {count}',
    'merge.mvRoles': 'نقش‌ها: {count}',
    'merge.mvNotes': 'یادداشت‌های درس: {count}',
    'merge.mvBookmarks': 'نشانی‌ها: {count}',
    'merge.mvGuardianships': 'پیوندهای سرپرستی: {count}',
    'merge.stayed':
      'سابقه‌هایی که نزد حساب بسته‌شده ماندند، چون این حساب همان را از پیش داشت: {count}.',
    'merge.asked': 'درخواست در حساب دیگر منتظر است. برای موافقه با آن، آنجا وارد شوید.',
    'merge.withdrawn': 'درخواست پس گرفته شد. چیزی انتقال نیافت.',
    'merge.merged': 'حساب‌ها یکجا شدند. حساب دیگر بسته است.',
    'merge.declined': 'رد شد. هر دو حساب همان‌اند که بودند.',
    'merge.errSignedOut':
      'از حساب بیرون شده‌اید. دوباره وارد شوید و یک بار دیگر تلاش کنید. چیزی تغییر نکرد.',
    'merge.errEmail': 'نشانی ایمیل حسابی را که می‌خواهید نگه دارید بنویسید.',
    'merge.errNoAccount': 'هیچ حسابی با این نشانی ایمیل نیست. چیزی تغییر نکرد.',
    'merge.errSameAccount':
      'این نشانی همین حساب است. نشانی حساب دیگر را بنویسید، همان که می‌خواهید نگه دارید.',
    'merge.errPending':
      'یک درخواست از این حساب از پیش منتظر است. پیش از درخواست از حساب دیگر، آن را پس بگیرید.',
    'merge.errNoRequest': 'آن درخواست دیگر وجود ندارد. چیزی تغییر نکرد.',
    'merge.errNotYours': 'این حساب نمی‌تواند به آن درخواست پاسخ دهد. چیزی تغییر نکرد.',
    'merge.errName': 'نامی که نوشته شد، حرف به حرف، نام این حساب نیست. چیزی تغییر نکرد.',
    'merge.errBlocked':
      'این یکجا کردن همین حالا شدنی نیست. چیزی انتقال نیافت. برای دیدن دلیل در کنار درخواست، این صفحه را دوباره بارگذاری کنید.',
    'merge.errExpired':
      'مهلت این درخواست پیش از پاسخ تمام شد. چیزی انتقال نیافت. از حساب دیگر دوباره درخواست کنید.',
    'merge.errAnswered':
      'به این درخواست پیش‌تر پاسخ داده شده بود. همین حالا چیزی تغییر نکرد. برای دیدن آنچه رخ داد، این صفحه را دوباره بارگذاری کنید.',
    'merge.errRefused': 'پلتفرم این را نپذیرفت. چیزی تغییر نکرد.',
    'merge.unconfirmed':
      'پاسخی نرسید، پس معلوم نیست این کار شد یا نه. پیش از تلاش دوباره، این صفحه را دوباره بارگذاری کنید تا ببینید وضع چگونه است.',
  },
  tr: {
    'merge.title': 'Hesapları birleştirme',
    'merge.back': 'Hesap ayarları',
    'merge.heading': 'Hesapları birleştirme',
    'merge.lede':
      'İki kez kaydolduysanız, kurslarınız ve sertifikalarınız tek yerde olsun diye hesaplardan biri diğerine taşınabilir. İki hesabın da kabul etmesi gerekir ve taşınan hesap sonrasında kapatılır.',
    'merge.unread': 'Birleştirme istekleri şu anda okunamadı. Hiçbir şey değişmedi.',
    'merge.off':
      'Hesapları birleştirme bu platformda kapalı. Sahibi açana kadar bu sayfada hiçbir şey yapılamaz.',
    'merge.foot':
      'Her birleştirme, nelerin taşındığıyla birlikte platformun değişiklik kaydına yazılır.',
    'merge.closeInstead':
      'İkinci bir hesabı birleştirmek yerine kapatmak için o hesaba giriş yapın ve hesabı oradan kapatın.',
    'merge.closeLink': 'Hesap kapatma',
    'merge.inHeading': 'Başka bir hesap bu hesapla birleştirilmek istiyor',
    'merge.inLede':
      'İkinci hesaptaki kişi sizseniz, kabul etmeniz o hesabın öğrenimini, rollerini ve bilgilerini bu hesaba taşır ve o hesabı kapatır. Bu geri alınamaz. Siz değilseniz reddedin. Siz yanıt verene kadar hiçbir şey olmaz.',
    'merge.noName': 'Adı olmayan bir hesap',
    'merge.inMerged': 'Birleştirildi. Diğer hesap kapalı.',
    'merge.inExpired': 'Bu isteğin süresi yanıtlanmadan doldu. Diğer hesaptan yeniden isteyin.',
    'merge.whatMoves':
      'Taşınanlar: o hesabın ilerlemesi ve sertifikalarıyla birlikte öğrenim kaydı, rolleri, bildirimleri, telefon numarası ve oluşturduğu kurslar. Kalanlar: o hesabın yaptıklarının kaydı, örneğin verdiği siparişler.',
    'merge.whatGoes':
      'Silinenler: iki hesabın da aynı derste notu veya yer imi varsa ya da aynı bildirim ikisinde de varsa, bu hesaptaki tutulur, diğeri silinir. Bu hesabın kendi telefon numarası varsa diğer hesabın telefon numarası da silinir.',
    'merge.confirmLabel': 'Onaylamak için bu hesabın adını yazın: {name}',
    'merge.needName':
      'Bu hesabın henüz bir adı yok. Önce hesap ayarlarında bir ad ekleyin: birleştirme, o ad yazılarak onaylanır.',
    'merge.accept': 'Bu hesapla birleştir',
    'merge.accepting': 'Birleştiriliyor…',
    'merge.decline': 'Reddet',
    'merge.cannotUndo':
      'Bu geri alınamaz. Diğer hesap kapatılır, adı ve bilgileri kaldırılır. Girişi, orada silinene kadar giriş hizmetinde kalır.',
    'merge.blockSame': 'Bu isteğin iki tarafı da aynı hesap.',
    'merge.blockAbsorbedClosed': 'Taşınacak hesap kapalı.',
    'merge.blockTargetClosed': 'Taşınacağı hesap kapalı.',
    'merge.blockPayouts':
      'Taşınacak hesabın yolda olan ödemeleri var: {count}. Tamamlanmalarını bekleyin.',
    'merge.blockBilling':
      'Taşınacak hesap, faturalama hesaplarını başka kişilerle paylaşıyor: {count}. Birleştirme, başka birinin ödeme düzenini taşıyamaz.',
    'merge.blockReviewers':
      'İki hesap da değerlendirici kütüğünde. Hangi kaydın kalacağına platformun sahibi karar verir.',
    'merge.blockHouseholds':
      'Hesapların her biri farklı bir ailede öğrenci. Birleştirme, bir kişinin öğrenimini başka bir aileye taşıyamaz.',
    'merge.blockSameCourse':
      'İki hesap da aynı kursa başlamış: {title}. Platform hangi ilerlemenin gerçek olduğunu seçemez. Birleştirmeden önce kursu hesaplardan birinde bitirin veya bırakın.',
    'merge.blockOwner':
      'Taşınacak hesap bu platformda sahibin verdiği bir görevi taşıyor. Birleştirilmeden önce ayrıca incelenmesi gerekir.',
    'merge.blockOther':
      'Bu birleştirme şu anda yapılamıyor ve bu sayfada nedenini söyleyen bir cümle yok. Yeniden denemeden önce platform görevlilerine sorun.',
    'merge.noteJoin':
      'İki öğrenim kaydı tek kayıt olur. Bu hesabın kaydında zaten bulunanlar olduğu gibi kalır.',
    'merge.noteMoves':
      'Öğrenim kaydı, ilerlemesi ve sertifikalarıyla birlikte bütün olarak taşınır.',
    'merge.outHeading': 'Bu hesabı başka bir hesaba taşıyın',
    'merge.outLede':
      'İki hesabınız varsa ve artık istemediğiniz hesap buysa, tutmak istediğiniz hesabın e-posta adresini yazın. İstek, biri o hesaba giriş yapıp kabul edene kadar orada bekler. Platform, iki hesabın da sizin denetiminizde olduğunu böyle anlar.',
    'merge.emailLabel': 'Tutulacak hesabın e-posta adresi',
    'merge.emailHelp':
      'Herhangi bir şey taşınmadan önce o hesabın kabul etmesi gerekir. Bu hesap sonrasında kapatılır ve kapatılması geri alınamaz.',
    'merge.ask': 'Birleştirme iste',
    'merge.asking': 'İsteniyor…',
    'merge.listHeading': 'Bu hesaptan yapılan istekler',
    'merge.listInto': 'Adresini yazdığınız hesaba',
    'merge.waitingUntil': '{date} tarihine kadar bekliyor',
    'merge.nothingMoved': 'Taşınması gereken bir şey yoktu.',
    'merge.withdraw': 'İsteği geri çek',
    'merge.stPending': 'Bekliyor',
    'merge.stCompleted': 'Birleştirildi',
    'merge.stDeclined': 'Reddedildi',
    'merge.stCancelled': 'Geri çekildi',
    'merge.stExpired': 'Süresi doldu',
    'merge.movedHeading': 'Taşınanlar',
    'merge.mvLearner': 'Öğrenim kaydı',
    'merge.mvEnrolments': 'Kurs kayıtları: {count}',
    'merge.mvCertificates': 'Sertifikalar: {count}',
    'merge.mvGrants': 'Erişim izinleri: {count}',
    'merge.mvReviews': 'Değerlendirmeler: {count}',
    'merge.mvAttempts': 'Sınav denemeleri: {count}',
    'merge.mvSubmissions': 'Ödevler: {count}',
    'merge.mvCohorts': 'Tarihli sınıflar: {count}',
    'merge.mvAttendance': 'Katılınan canlı dersler: {count}',
    'merge.mvCases': 'Destek talepleri: {count}',
    'merge.mvNotifications': 'Bildirimler: {count}',
    'merge.mvRoles': 'Roller: {count}',
    'merge.mvNotes': 'Ders notları: {count}',
    'merge.mvBookmarks': 'Yer imleri: {count}',
    'merge.mvGuardianships': 'Veli bağlantıları: {count}',
    'merge.stayed':
      'Bu hesapta aynısı zaten bulunduğu için kapatılan hesapta kalan kayıtlar: {count}.',
    'merge.asked': 'İstek diğer hesapta bekliyor. Kabul etmek için orada giriş yapın.',
    'merge.withdrawn': 'İstek geri çekildi. Hiçbir şey taşınmadı.',
    'merge.merged': 'Hesaplar birleştirildi. Diğer hesap kapalı.',
    'merge.declined': 'Reddedildi. İki hesap da olduğu gibi duruyor.',
    'merge.errSignedOut':
      'Oturumunuz kapanmış. Yeniden giriş yapın, sonra bir kez daha deneyin. Hiçbir şey değişmedi.',
    'merge.errEmail': 'Tutmak istediğiniz hesabın e-posta adresini yazın.',
    'merge.errNoAccount': 'Bu e-posta adresiyle bir hesap yok. Hiçbir şey değişmedi.',
    'merge.errSameAccount':
      'Bu, bu hesabın adresi. Diğer hesabın, yani tutmak istediğiniz hesabın adresini yazın.',
    'merge.errPending':
      'Bu hesaptan yapılmış bir istek zaten bekliyor. Başka bir hesaptan istemeden önce onu geri çekin.',
    'merge.errNoRequest': 'O istek artık yok. Hiçbir şey değişmedi.',
    'merge.errNotYours': 'Bu hesap o isteği yanıtlayamaz. Hiçbir şey değişmedi.',
    'merge.errName': 'Yazılan ad, harfi harfine bu hesabın adı değil. Hiçbir şey değişmedi.',
    'merge.errBlocked':
      'Bu birleştirme şu anda yapılamıyor. Hiçbir şey taşınmadı. Nedeni isteğin yanında görmek için bu sayfayı yeniden yükleyin.',
    'merge.errExpired':
      'Bu isteğin süresi yanıtlanmadan doldu. Hiçbir şey taşınmadı. Diğer hesaptan yeniden isteyin.',
    'merge.errAnswered':
      'Bu istek zaten yanıtlanmıştı. Şimdi hiçbir şey değişmedi. Ne olduğunu görmek için bu sayfayı yeniden yükleyin.',
    'merge.errRefused': 'Platform bunu kabul etmedi. Hiçbir şey değişmedi.',
    'merge.unconfirmed':
      'Yanıt gelmedi, bu yüzden bunun yapılıp yapılmadığı bilinmiyor. Yeniden denemeden önce durumu görmek için bu sayfayı yeniden yükleyin.',
  },
  id: {
    'merge.title': 'Menggabungkan akun',
    'merge.back': 'Pengaturan akun',
    'merge.heading': 'Menggabungkan akun',
    'merge.lede':
      'Jika Anda mendaftar dua kali, satu akun dapat dipindahkan ke akun lainnya agar kursus dan sertifikat Anda berada di satu tempat. Kedua akun harus setuju, dan akun yang dipindahkan ditutup setelahnya.',
    'merge.unread': 'Permintaan penggabungan tidak dapat dibaca saat ini. Tidak ada yang diubah.',
    'merge.off':
      'Penggabungan akun dimatikan di platform ini. Tidak ada yang dapat dilakukan di halaman ini sampai pemilik menyalakannya.',
    'merge.foot':
      'Setiap penggabungan ditulis dalam catatan perubahan platform, beserta apa yang dipindahkan.',
    'merge.closeInstead':
      'Untuk menutup akun kedua alih-alih menggabungkannya, masuklah ke akun itu dan tutup dari sana.',
    'merge.closeLink': 'Menutup akun',
    'merge.inHeading': 'Akun lain meminta untuk digabungkan ke akun ini',
    'merge.inLede':
      'Jika ini Anda di akun kedua, menyetujuinya memindahkan pembelajaran, peran, dan data akun itu ke akun ini lalu menutup akun itu. Ini tidak dapat dibatalkan. Jika bukan Anda, tolaklah. Tidak ada yang terjadi sampai Anda menjawab.',
    'merge.noName': 'Akun tanpa nama',
    'merge.inMerged': 'Digabungkan. Akun lainnya sudah ditutup.',
    'merge.inExpired':
      'Permintaan ini habis waktunya sebelum dijawab. Minta lagi dari akun lainnya.',
    'merge.whatMoves':
      'Yang dipindahkan: catatan belajar akun itu beserta kemajuan dan sertifikatnya, perannya, notifikasinya, nomor teleponnya, dan kursus yang dibuatnya. Yang tetap tinggal: catatan tentang apa yang dilakukan akun itu, seperti pesanan yang dibuatnya.',
    'merge.whatGoes':
      'Yang dihapus: jika kedua akun punya catatan atau penanda pada pelajaran yang sama, atau notifikasi yang sama, yang ada di akun ini disimpan dan yang lain dihapus. Nomor telepon akun lainnya juga dihapus jika akun ini sudah punya nomor.',
    'merge.confirmLabel': 'Ketik nama akun ini untuk mengonfirmasi: {name}',
    'merge.needName':
      'Akun ini belum punya nama. Tambahkan dulu nama di pengaturan akun: penggabungan dikonfirmasi dengan mengetiknya.',
    'merge.accept': 'Gabungkan ke akun ini',
    'merge.accepting': 'Menggabungkan…',
    'merge.decline': 'Tolak',
    'merge.cannotUndo':
      'Ini tidak dapat dibatalkan. Akun lainnya ditutup, lalu nama dan datanya dihapus darinya. Data masuknya tetap ada di layanan masuk sampai dihapus di sana.',
    'merge.blockSame': 'Kedua sisi permintaan ini adalah akun yang sama.',
    'merge.blockAbsorbedClosed': 'Akun yang akan dipindahkan sudah ditutup.',
    'merge.blockTargetClosed': 'Akun tujuan pemindahan sudah ditutup.',
    'merge.blockPayouts':
      'Akun yang akan dipindahkan punya pencairan yang sedang berjalan: {count}. Tunggu sampai selesai.',
    'merge.blockBilling':
      'Akun yang akan dipindahkan berbagi akun penagihan dengan orang lain: {count}. Penggabungan tidak dapat memindahkan pengaturan pembayaran milik orang lain.',
    'merge.blockReviewers':
      'Kedua akun ada di daftar peninjau. Pemilik yang memutuskan entri mana yang tetap.',
    'merge.blockHouseholds':
      'Tiap akun adalah pelajar di keluarga yang berbeda. Penggabungan tidak dapat memindahkan pembelajaran seseorang ke keluarga lain.',
    'merge.blockSameCourse':
      'Kedua akun sudah memulai kursus yang sama: {title}. Platform tidak dapat memilih kemajuan mana yang sebenarnya. Selesaikan kursus itu di salah satu akun, atau tinggalkan, sebelum menggabungkan.',
    'merge.blockOwner':
      'Akun yang akan dipindahkan memegang penunjukan dari pemilik di platform ini. Akun itu harus ditinjau tersendiri sebelum dapat digabungkan.',
    'merge.blockOther':
      'Penggabungan ini tidak dapat dijalankan sekarang, dan halaman ini tidak punya kalimat untuk alasannya. Tanyakan kepada staf platform sebelum mencoba lagi.',
    'merge.noteJoin':
      'Kedua catatan belajar menjadi satu. Apa yang sudah ada di catatan akun ini tetap seperti adanya.',
    'merge.noteMoves': 'Catatan belajar dipindahkan seutuhnya, beserta kemajuan dan sertifikatnya.',
    'merge.outHeading': 'Pindahkan akun ini ke akun lain',
    'merge.outLede':
      'Jika Anda punya dua akun dan ini yang tidak Anda inginkan lagi, ketik alamat surel akun yang ingin Anda pertahankan. Permintaan menunggu di sana sampai seseorang masuk ke akun itu dan setuju. Begitulah platform tahu bahwa Anda menguasai keduanya.',
    'merge.emailLabel': 'Alamat surel akun yang dipertahankan',
    'merge.emailHelp':
      'Akun itu harus setuju sebelum apa pun dipindahkan. Akun ini ditutup setelahnya, dan penutupannya tidak dapat dibatalkan.',
    'merge.ask': 'Minta digabungkan',
    'merge.asking': 'Meminta…',
    'merge.listHeading': 'Permintaan yang dibuat dari akun ini',
    'merge.listInto': 'Ke akun yang alamatnya Anda ketik',
    'merge.waitingUntil': 'Menunggu sampai {date}',
    'merge.nothingMoved': 'Tidak ada yang perlu dipindahkan.',
    'merge.withdraw': 'Tarik permintaan',
    'merge.stPending': 'Menunggu',
    'merge.stCompleted': 'Digabungkan',
    'merge.stDeclined': 'Ditolak',
    'merge.stCancelled': 'Ditarik',
    'merge.stExpired': 'Habis waktunya',
    'merge.movedHeading': 'Yang dipindahkan',
    'merge.mvLearner': 'Catatan belajar',
    'merge.mvEnrolments': 'Pendaftaran kursus: {count}',
    'merge.mvCertificates': 'Sertifikat: {count}',
    'merge.mvGrants': 'Izin akses: {count}',
    'merge.mvReviews': 'Ulasan: {count}',
    'merge.mvAttempts': 'Percobaan penilaian: {count}',
    'merge.mvSubmissions': 'Tugas: {count}',
    'merge.mvCohorts': 'Kelas bertanggal: {count}',
    'merge.mvAttendance': 'Kelas langsung yang dihadiri: {count}',
    'merge.mvCases': 'Kasus dukungan: {count}',
    'merge.mvNotifications': 'Notifikasi: {count}',
    'merge.mvRoles': 'Peran: {count}',
    'merge.mvNotes': 'Catatan pelajaran: {count}',
    'merge.mvBookmarks': 'Penanda: {count}',
    'merge.mvGuardianships': 'Hubungan wali: {count}',
    'merge.stayed':
      'Catatan yang tetap di akun yang ditutup, karena akun ini sudah punya hal yang sama: {count}.',
    'merge.asked': 'Permintaan menunggu di akun lainnya. Masuklah di sana untuk menyetujuinya.',
    'merge.withdrawn': 'Permintaan ditarik. Tidak ada yang dipindahkan.',
    'merge.merged': 'Akun sudah digabungkan. Akun lainnya ditutup.',
    'merge.declined': 'Ditolak. Kedua akun tetap seperti semula.',
    'merge.errSignedOut':
      'Anda sudah keluar. Masuk lagi, lalu coba sekali lagi. Tidak ada yang diubah.',
    'merge.errEmail': 'Ketik alamat surel akun yang ingin Anda pertahankan.',
    'merge.errNoAccount': 'Tidak ada akun dengan alamat surel itu. Tidak ada yang diubah.',
    'merge.errSameAccount':
      'Itu alamat akun ini. Ketik alamat akun yang satunya, yaitu akun yang ingin Anda pertahankan.',
    'merge.errPending':
      'Sebuah permintaan dari akun ini sudah menunggu. Tarik dulu sebelum meminta ke akun lain.',
    'merge.errNoRequest': 'Permintaan itu sudah tidak ada. Tidak ada yang diubah.',
    'merge.errNotYours': 'Akun ini tidak dapat menjawab permintaan itu. Tidak ada yang diubah.',
    'merge.errName':
      'Nama yang diketik tidak sama huruf demi huruf dengan nama akun ini. Tidak ada yang diubah.',
    'merge.errBlocked':
      'Penggabungan ini tidak dapat dijalankan sekarang. Tidak ada yang dipindahkan. Muat ulang halaman ini untuk melihat alasannya di samping permintaan.',
    'merge.errExpired':
      'Permintaan ini habis waktunya sebelum dijawab. Tidak ada yang dipindahkan. Minta lagi dari akun lainnya.',
    'merge.errAnswered':
      'Permintaan ini sudah dijawab sebelumnya. Sekarang tidak ada yang diubah. Muat ulang halaman ini untuk melihat apa yang terjadi.',
    'merge.errRefused': 'Platform tidak menerima ini. Tidak ada yang diubah.',
    'merge.unconfirmed':
      'Tidak ada jawaban yang kembali, jadi tidak diketahui apakah ini sudah dilakukan. Muat ulang halaman ini untuk melihat keadaannya sebelum mencoba lagi.',
  },
  ms: {
    'merge.title': 'Menggabungkan akaun',
    'merge.back': 'Tetapan akaun',
    'merge.heading': 'Menggabungkan akaun',
    'merge.lede':
      'Jika anda mendaftar dua kali, satu akaun boleh dipindahkan ke dalam akaun yang satu lagi supaya kursus dan sijil anda berada di satu tempat. Kedua-dua akaun mesti bersetuju, dan akaun yang dipindahkan ditutup selepas itu.',
    'merge.unread':
      'Permintaan penggabungan tidak dapat dibaca sekarang. Tiada apa-apa yang diubah.',
    'merge.off':
      'Penggabungan akaun dimatikan di platform ini. Tiada apa-apa yang boleh dilakukan di halaman ini sehingga pemilik menghidupkannya.',
    'merge.foot':
      'Setiap penggabungan ditulis dalam rekod perubahan platform, bersama apa yang dipindahkan.',
    'merge.closeInstead':
      'Untuk menutup akaun kedua dan bukan menggabungkannya, masuk ke akaun itu dan tutup dari sana.',
    'merge.closeLink': 'Menutup akaun',
    'merge.inHeading': 'Akaun lain meminta untuk digabungkan ke dalam akaun ini',
    'merge.inLede':
      'Jika ini anda di akaun kedua, persetujuan anda memindahkan pembelajaran, peranan dan butiran akaun itu ke dalam akaun ini dan menutup akaun itu. Ini tidak boleh dibatalkan. Jika bukan anda, tolak. Tiada apa-apa berlaku sehingga anda menjawab.',
    'merge.noName': 'Akaun tanpa nama',
    'merge.inMerged': 'Digabungkan. Akaun yang satu lagi sudah ditutup.',
    'merge.inExpired':
      'Permintaan ini tamat tempoh sebelum dijawab. Minta sekali lagi dari akaun yang satu lagi.',
    'merge.whatMoves':
      'Yang dipindahkan: rekod pembelajaran akaun itu bersama kemajuan dan sijilnya, peranannya, pemberitahuannya, nombor telefonnya dan kursus yang dibuatnya. Yang kekal: rekod tentang apa yang dilakukan oleh akaun itu, seperti pesanan yang dibuatnya.',
    'merge.whatGoes':
      'Yang dipadam: jika kedua-dua akaun mempunyai nota atau penanda pada pelajaran yang sama, atau pemberitahuan yang sama, yang ada di akaun ini disimpan dan yang lain dipadam. Nombor telefon akaun yang satu lagi juga dipadam jika akaun ini sudah mempunyai nombor.',
    'merge.confirmLabel': 'Taip nama akaun ini untuk mengesahkan: {name}',
    'merge.needName':
      'Akaun ini belum mempunyai nama. Tambah nama dalam tetapan akaun dahulu: penggabungan disahkan dengan menaipnya.',
    'merge.accept': 'Gabungkan ke dalam akaun ini',
    'merge.accepting': 'Menggabungkan…',
    'merge.decline': 'Tolak',
    'merge.cannotUndo':
      'Ini tidak boleh dibatalkan. Akaun yang satu lagi ditutup, dan nama serta butirannya dibuang. Maklumat masuknya kekal pada perkhidmatan masuk sehingga dipadam di sana.',
    'merge.blockSame': 'Kedua-dua pihak permintaan ini ialah akaun yang sama.',
    'merge.blockAbsorbedClosed': 'Akaun yang akan dipindahkan sudah ditutup.',
    'merge.blockTargetClosed': 'Akaun yang menjadi tujuan pemindahan sudah ditutup.',
    'merge.blockPayouts':
      'Akaun yang akan dipindahkan mempunyai bayaran keluar yang sedang berjalan: {count}. Tunggu sehingga selesai.',
    'merge.blockBilling':
      'Akaun yang akan dipindahkan berkongsi akaun pengebilan dengan orang lain: {count}. Penggabungan tidak boleh memindahkan urusan pembayaran orang lain.',
    'merge.blockReviewers':
      'Kedua-dua akaun ada dalam daftar penyemak. Pemilik memutuskan entri mana yang kekal.',
    'merge.blockHouseholds':
      'Setiap akaun ialah pelajar dalam keluarga yang berlainan. Penggabungan tidak boleh memindahkan pembelajaran seseorang ke dalam keluarga lain.',
    'merge.blockSameCourse':
      'Kedua-dua akaun sudah memulakan kursus yang sama: {title}. Platform tidak dapat memilih kemajuan mana yang sebenar. Selesaikan kursus itu di satu akaun, atau tinggalkannya, sebelum menggabungkan.',
    'merge.blockOwner':
      'Akaun yang akan dipindahkan memegang satu pelantikan daripada pemilik di platform ini. Akaun itu perlu disemak secara berasingan sebelum boleh digabungkan.',
    'merge.blockOther':
      'Penggabungan ini tidak boleh dijalankan sekarang, dan halaman ini tidak mempunyai ayat untuk sebabnya. Tanya kakitangan platform sebelum mencuba lagi.',
    'merge.noteJoin':
      'Dua rekod pembelajaran menjadi satu. Apa yang sudah ada dalam rekod akaun ini kekal seperti sedia ada.',
    'merge.noteMoves': 'Rekod pembelajaran dipindahkan seluruhnya, bersama kemajuan dan sijilnya.',
    'merge.outHeading': 'Pindahkan akaun ini ke dalam akaun lain',
    'merge.outLede':
      'Jika anda mempunyai dua akaun dan ini yang anda tidak mahu lagi, taip alamat e-mel akaun yang anda mahu simpan. Permintaan menunggu di sana sehingga seseorang masuk ke akaun itu dan bersetuju. Begitulah platform tahu bahawa anda menguasai kedua-duanya.',
    'merge.emailLabel': 'Alamat e-mel akaun yang disimpan',
    'merge.emailHelp':
      'Akaun itu mesti bersetuju sebelum apa-apa dipindahkan. Akaun ini ditutup selepas itu, dan penutupannya tidak boleh dibatalkan.',
    'merge.ask': 'Minta digabungkan',
    'merge.asking': 'Meminta…',
    'merge.listHeading': 'Permintaan yang dibuat dari akaun ini',
    'merge.listInto': 'Ke dalam akaun yang alamatnya anda taip',
    'merge.waitingUntil': 'Menunggu sehingga {date}',
    'merge.nothingMoved': 'Tiada apa-apa yang perlu dipindahkan.',
    'merge.withdraw': 'Tarik balik permintaan',
    'merge.stPending': 'Menunggu',
    'merge.stCompleted': 'Digabungkan',
    'merge.stDeclined': 'Ditolak',
    'merge.stCancelled': 'Ditarik balik',
    'merge.stExpired': 'Tamat tempoh',
    'merge.movedHeading': 'Yang dipindahkan',
    'merge.mvLearner': 'Rekod pembelajaran',
    'merge.mvEnrolments': 'Pendaftaran kursus: {count}',
    'merge.mvCertificates': 'Sijil: {count}',
    'merge.mvGrants': 'Kebenaran akses: {count}',
    'merge.mvReviews': 'Ulasan: {count}',
    'merge.mvAttempts': 'Percubaan penilaian: {count}',
    'merge.mvSubmissions': 'Tugasan: {count}',
    'merge.mvCohorts': 'Kelas bertarikh: {count}',
    'merge.mvAttendance': 'Kelas langsung yang dihadiri: {count}',
    'merge.mvCases': 'Kes sokongan: {count}',
    'merge.mvNotifications': 'Pemberitahuan: {count}',
    'merge.mvRoles': 'Peranan: {count}',
    'merge.mvNotes': 'Nota pelajaran: {count}',
    'merge.mvBookmarks': 'Penanda: {count}',
    'merge.mvGuardianships': 'Pautan penjaga: {count}',
    'merge.stayed':
      'Rekod yang kekal dengan akaun yang ditutup, kerana akaun ini sudah mempunyai perkara yang sama: {count}.',
    'merge.asked': 'Permintaan menunggu di akaun yang satu lagi. Masuk di sana untuk bersetuju.',
    'merge.withdrawn': 'Permintaan ditarik balik. Tiada apa-apa yang dipindahkan.',
    'merge.merged': 'Akaun sudah digabungkan. Akaun yang satu lagi ditutup.',
    'merge.declined': 'Ditolak. Kedua-dua akaun kekal seperti sebelumnya.',
    'merge.errSignedOut':
      'Anda sudah keluar. Masuk semula, kemudian cuba sekali lagi. Tiada apa-apa yang diubah.',
    'merge.errEmail': 'Taip alamat e-mel akaun yang anda mahu simpan.',
    'merge.errNoAccount': 'Tiada akaun dengan alamat e-mel itu. Tiada apa-apa yang diubah.',
    'merge.errSameAccount':
      'Itu alamat akaun ini. Taip alamat akaun yang satu lagi, iaitu akaun yang anda mahu simpan.',
    'merge.errPending':
      'Satu permintaan dari akaun ini sudah menunggu. Tarik balik dahulu sebelum meminta daripada akaun lain.',
    'merge.errNoRequest': 'Permintaan itu sudah tiada. Tiada apa-apa yang diubah.',
    'merge.errNotYours':
      'Akaun ini tidak boleh menjawab permintaan itu. Tiada apa-apa yang diubah.',
    'merge.errName':
      'Nama yang ditaip tidak sama huruf demi huruf dengan nama akaun ini. Tiada apa-apa yang diubah.',
    'merge.errBlocked':
      'Penggabungan ini tidak boleh dijalankan sekarang. Tiada apa-apa yang dipindahkan. Muat semula halaman ini untuk melihat sebabnya di sebelah permintaan.',
    'merge.errExpired':
      'Permintaan ini tamat tempoh sebelum dijawab. Tiada apa-apa yang dipindahkan. Minta sekali lagi dari akaun yang satu lagi.',
    'merge.errAnswered':
      'Permintaan ini sudah dijawab sebelum ini. Sekarang tiada apa-apa yang diubah. Muat semula halaman ini untuk melihat apa yang berlaku.',
    'merge.errRefused': 'Platform tidak menerima ini. Tiada apa-apa yang diubah.',
    'merge.unconfirmed':
      'Tiada jawapan yang kembali, jadi tidak diketahui sama ada ini sudah dilakukan. Muat semula halaman ini untuk melihat keadaannya sebelum mencuba lagi.',
  },
  bn: {
    'merge.title': 'অ্যাকাউন্ট একত্র করা',
    'merge.back': 'অ্যাকাউন্ট সেটিংস',
    'merge.heading': 'অ্যাকাউন্ট একত্র করা',
    'merge.lede':
      'আপনি দুবার নিবন্ধন করে থাকলে একটি অ্যাকাউন্ট অন্যটিতে সরিয়ে নেওয়া যায়, যাতে আপনার কোর্স ও সনদ এক জায়গায় থাকে। দুটি অ্যাকাউন্টকেই সম্মত হতে হবে, আর যে অ্যাকাউন্ট সরানো হয় সেটি পরে বন্ধ করে দেওয়া হয়।',
    'merge.unread': 'একত্র করার অনুরোধগুলো এই মুহূর্তে পড়া যায়নি। কিছুই বদলানো হয়নি।',
    'merge.off':
      'এই প্ল্যাটফর্মে অ্যাকাউন্ট একত্র করা বন্ধ আছে। মালিক এটি চালু না করা পর্যন্ত এই পৃষ্ঠায় কিছু করা যাবে না।',
    'merge.foot': 'প্রতিটি একত্রীকরণ প্ল্যাটফর্মের পরিবর্তনের নথিতে লেখা হয়, কী সরানো হলো তা-সহ।',
    'merge.closeInstead':
      'দ্বিতীয় অ্যাকাউন্টটি একত্র না করে বন্ধ করতে চাইলে সেই অ্যাকাউন্টে সাইন ইন করে সেখান থেকেই বন্ধ করুন।',
    'merge.closeLink': 'অ্যাকাউন্ট বন্ধ করা',
    'merge.inHeading': 'আরেকটি অ্যাকাউন্ট এই অ্যাকাউন্টের সঙ্গে একত্র হতে চাইছে',
    'merge.inLede':
      'দ্বিতীয় অ্যাকাউন্টে যদি আপনিই থাকেন, তবে সম্মতি দিলে সেই অ্যাকাউন্টের শেখা, ভূমিকা ও বিবরণ এই অ্যাকাউন্টে চলে আসে এবং সেই অ্যাকাউন্ট বন্ধ হয়ে যায়। এটি ফেরানো যায় না। যদি আপনি না হন, প্রত্যাখ্যান করুন। আপনি উত্তর না দেওয়া পর্যন্ত কিছুই ঘটে না।',
    'merge.noName': 'নামহীন একটি অ্যাকাউন্ট',
    'merge.inMerged': 'একত্র করা হয়েছে। অন্য অ্যাকাউন্টটি বন্ধ।',
    'merge.inExpired':
      'উত্তর পাওয়ার আগেই এই অনুরোধের মেয়াদ শেষ হয়ে গেছে। অন্য অ্যাকাউন্ট থেকে আবার অনুরোধ করুন।',
    'merge.whatMoves':
      'যা সরে আসে: সেই অ্যাকাউন্টের শেখার নথি তার অগ্রগতি ও সনদসহ, তার ভূমিকা, তার বিজ্ঞপ্তি, তার ফোন নম্বর এবং তার তৈরি কোর্স। যা থেকে যায়: সেই অ্যাকাউন্ট যা করেছে তার নথি, যেমন তার দেওয়া অর্ডার।',
    'merge.whatGoes':
      'যা মুছে যায়: যেখানে দুটি অ্যাকাউন্টেরই একই পাঠে নোট বা বুকমার্ক আছে, কিংবা একই বিজ্ঞপ্তি আছে, সেখানে এই অ্যাকাউন্টেরটি রাখা হয় আর অন্যটি মুছে ফেলা হয়। এই অ্যাকাউন্টের নিজের ফোন নম্বর থাকলে অন্য অ্যাকাউন্টের ফোন নম্বরও মুছে যায়।',
    'merge.confirmLabel': 'নিশ্চিত করতে এই অ্যাকাউন্টের নাম লিখুন: {name}',
    'merge.needName':
      'এই অ্যাকাউন্টের এখনো কোনো নাম নেই। আগে অ্যাকাউন্ট সেটিংসে একটি নাম যোগ করুন: একত্রীকরণ সেই নাম লিখে নিশ্চিত করা হয়।',
    'merge.accept': 'এই অ্যাকাউন্টের সঙ্গে একত্র করুন',
    'merge.accepting': 'একত্র করা হচ্ছে…',
    'merge.decline': 'প্রত্যাখ্যান করুন',
    'merge.cannotUndo':
      'এটি ফেরানো যায় না। অন্য অ্যাকাউন্টটি বন্ধ করা হয় এবং তার নাম ও বিবরণ সরিয়ে ফেলা হয়। তার সাইন ইন, সাইন ইন পরিষেবার কাছে থেকে যায় যতক্ষণ না সেখানে মুছে ফেলা হয়।',
    'merge.blockSame': 'এই অনুরোধের দুই পক্ষই একই অ্যাকাউন্ট।',
    'merge.blockAbsorbedClosed': 'যে অ্যাকাউন্ট সরানো হবে সেটি বন্ধ।',
    'merge.blockTargetClosed': 'যে অ্যাকাউন্টে সরানো হবে সেটি বন্ধ।',
    'merge.blockPayouts':
      'যে অ্যাকাউন্ট সরানো হবে তার কিছু পরিশোধ পথে আছে: {count}। সেগুলো শেষ হওয়া পর্যন্ত অপেক্ষা করুন।',
    'merge.blockBilling':
      'যে অ্যাকাউন্ট সরানো হবে সেটি অন্য মানুষের সঙ্গে বিলিং অ্যাকাউন্ট ভাগ করে: {count}। একত্রীকরণ অন্য কারও অর্থ পরিশোধের ব্যবস্থা সরাতে পারে না।',
    'merge.blockReviewers':
      'দুটি অ্যাকাউন্টই পর্যালোচকদের তালিকায় আছে। কোন ভুক্তিটি থাকবে তা মালিক ঠিক করেন।',
    'merge.blockHouseholds':
      'প্রতিটি অ্যাকাউন্ট আলাদা পরিবারের শিক্ষার্থী। একত্রীকরণ একজনের শেখা অন্য পরিবারে সরাতে পারে না।',
    'merge.blockSameCourse':
      'দুটি অ্যাকাউন্টই একই কোর্স শুরু করেছে: {title}। কোন অগ্রগতিটি আসল তা প্ল্যাটফর্ম বেছে নিতে পারে না। একত্র করার আগে একটি অ্যাকাউন্টে কোর্সটি শেষ করুন অথবা ছেড়ে দিন।',
    'merge.blockOwner':
      'যে অ্যাকাউন্ট সরানো হবে তার কাছে এই প্ল্যাটফর্মে মালিকের একটি নিয়োগ আছে। একত্র করার আগে সেটি আলাদাভাবে দেখা দরকার।',
    'merge.blockOther':
      'এই একত্রীকরণ এখন চালানো যাচ্ছে না, আর কারণটির জন্য এই পৃষ্ঠায় কোনো বাক্য নেই। আবার চেষ্টা করার আগে প্ল্যাটফর্মের কর্মীদের জিজ্ঞাসা করুন।',
    'merge.noteJoin':
      'শেখার দুটি নথি একটি হয়ে যায়। এই অ্যাকাউন্টের নথিতে আগে থেকে যা আছে তা যেমন আছে তেমনই থাকে।',
    'merge.noteMoves': 'শেখার নথিটি পুরোটাই সরে আসে, তার অগ্রগতি ও সনদসহ।',
    'merge.outHeading': 'এই অ্যাকাউন্টটি অন্য একটিতে সরিয়ে নিন',
    'merge.outLede':
      'আপনার যদি দুটি অ্যাকাউন্ট থাকে আর এটিই সেটি যা আপনি আর চান না, তবে যে অ্যাকাউন্ট রাখতে চান তার ইমেইল ঠিকানা লিখুন। কেউ সেই অ্যাকাউন্টে সাইন ইন করে সম্মত না হওয়া পর্যন্ত অনুরোধটি সেখানে অপেক্ষা করে। এভাবেই প্ল্যাটফর্ম জানে যে দুটিই আপনার নিয়ন্ত্রণে।',
    'merge.emailLabel': 'যে অ্যাকাউন্ট রাখা হবে তার ইমেইল ঠিকানা',
    'merge.emailHelp':
      'কিছু সরানোর আগে সেই অ্যাকাউন্টকে সম্মত হতে হবে। এরপর এই অ্যাকাউন্ট বন্ধ করে দেওয়া হয়, আর এটি বন্ধ করা ফেরানো যায় না।',
    'merge.ask': 'একত্র করার অনুরোধ করুন',
    'merge.asking': 'অনুরোধ করা হচ্ছে…',
    'merge.listHeading': 'এই অ্যাকাউন্ট থেকে করা অনুরোধ',
    'merge.listInto': 'যে অ্যাকাউন্টের ঠিকানা আপনি লিখেছেন সেটিতে',
    'merge.waitingUntil': '{date} পর্যন্ত অপেক্ষায়',
    'merge.nothingMoved': 'সরানোর মতো কিছু ছিল না।',
    'merge.withdraw': 'অনুরোধ প্রত্যাহার করুন',
    'merge.stPending': 'অপেক্ষায়',
    'merge.stCompleted': 'একত্র করা হয়েছে',
    'merge.stDeclined': 'প্রত্যাখ্যাত',
    'merge.stCancelled': 'প্রত্যাহার করা হয়েছে',
    'merge.stExpired': 'মেয়াদ শেষ',
    'merge.movedHeading': 'যা সরানো হয়েছে',
    'merge.mvLearner': 'শেখার নথি',
    'merge.mvEnrolments': 'কোর্সে ভর্তি: {count}',
    'merge.mvCertificates': 'সনদ: {count}',
    'merge.mvGrants': 'প্রবেশের অনুমতি: {count}',
    'merge.mvReviews': 'পর্যালোচনা: {count}',
    'merge.mvAttempts': 'মূল্যায়নের চেষ্টা: {count}',
    'merge.mvSubmissions': 'অ্যাসাইনমেন্ট: {count}',
    'merge.mvCohorts': 'তারিখ দেওয়া ক্লাস: {count}',
    'merge.mvAttendance': 'যেসব সরাসরি ক্লাসে উপস্থিতি ছিল: {count}',
    'merge.mvCases': 'সহায়তার বিষয়: {count}',
    'merge.mvNotifications': 'বিজ্ঞপ্তি: {count}',
    'merge.mvRoles': 'ভূমিকা: {count}',
    'merge.mvNotes': 'পাঠের নোট: {count}',
    'merge.mvBookmarks': 'বুকমার্ক: {count}',
    'merge.mvGuardianships': 'অভিভাবক সংযোগ: {count}',
    'merge.stayed':
      'যেসব নথি বন্ধ অ্যাকাউন্টের কাছে থেকে গেছে, কারণ এই অ্যাকাউন্টে একই জিনিস আগে থেকেই ছিল: {count}।',
    'merge.asked': 'অনুরোধটি অন্য অ্যাকাউন্টে অপেক্ষা করছে। তাতে সম্মত হতে সেখানে সাইন ইন করুন।',
    'merge.withdrawn': 'অনুরোধ প্রত্যাহার করা হয়েছে। কিছুই সরানো হয়নি।',
    'merge.merged': 'অ্যাকাউন্ট দুটি একত্র করা হয়েছে। অন্য অ্যাকাউন্টটি বন্ধ।',
    'merge.declined': 'প্রত্যাখ্যান করা হয়েছে। দুটি অ্যাকাউন্টই আগের মতো আছে।',
    'merge.errSignedOut':
      'আপনি সাইন আউট হয়ে গেছেন। আবার সাইন ইন করুন, তারপর আরেকবার চেষ্টা করুন। কিছুই বদলানো হয়নি।',
    'merge.errEmail': 'যে অ্যাকাউন্ট রাখতে চান তার ইমেইল ঠিকানা লিখুন।',
    'merge.errNoAccount': 'ওই ইমেইল ঠিকানার কোনো অ্যাকাউন্ট নেই। কিছুই বদলানো হয়নি।',
    'merge.errSameAccount':
      'ওটি এই অ্যাকাউন্টেরই ঠিকানা। অন্য অ্যাকাউন্টটির ঠিকানা লিখুন, যেটি আপনি রাখতে চান।',
    'merge.errPending':
      'এই অ্যাকাউন্টের একটি অনুরোধ আগে থেকেই অপেক্ষায় আছে। অন্য অ্যাকাউন্টকে অনুরোধ করার আগে সেটি প্রত্যাহার করুন।',
    'merge.errNoRequest': 'ওই অনুরোধটি আর নেই। কিছুই বদলানো হয়নি।',
    'merge.errNotYours': 'এই অ্যাকাউন্ট ওই অনুরোধের উত্তর দিতে পারে না। কিছুই বদলানো হয়নি।',
    'merge.errName': 'লেখা নামটি অক্ষরে অক্ষরে এই অ্যাকাউন্টের নাম নয়। কিছুই বদলানো হয়নি।',
    'merge.errBlocked':
      'এই একত্রীকরণ এখন চালানো যাচ্ছে না। কিছুই সরানো হয়নি। অনুরোধের পাশে কারণ দেখতে এই পৃষ্ঠাটি পুনরায় লোড করুন।',
    'merge.errExpired':
      'উত্তর পাওয়ার আগেই এই অনুরোধের মেয়াদ শেষ হয়ে গেছে। কিছুই সরানো হয়নি। অন্য অ্যাকাউন্ট থেকে আবার অনুরোধ করুন।',
    'merge.errAnswered':
      'এই অনুরোধের উত্তর আগেই দেওয়া হয়ে গিয়েছিল। এখন কিছুই বদলানো হয়নি। কী ঘটেছে দেখতে এই পৃষ্ঠাটি পুনরায় লোড করুন।',
    'merge.errRefused': 'প্ল্যাটফর্ম এটি গ্রহণ করেনি। কিছুই বদলানো হয়নি।',
    'merge.unconfirmed':
      'কোনো উত্তর ফিরে আসেনি, তাই এটি হয়েছে কি না জানা নেই। আবার চেষ্টা করার আগে অবস্থা দেখতে এই পৃষ্ঠাটি পুনরায় লোড করুন।',
  },
  hi: {
    'merge.title': 'खाते मिलाना',
    'merge.back': 'खाता सेटिंग्स',
    'merge.heading': 'खाते मिलाना',
    'merge.lede':
      'अगर आपने दो बार पंजीकरण किया है, तो एक खाते को दूसरे में ले जाया जा सकता है, ताकि आपके कोर्स और प्रमाणपत्र एक जगह रहें। दोनों खातों की सहमति ज़रूरी है, और जो खाता ले जाया जाता है वह बाद में बंद कर दिया जाता है।',
    'merge.unread': 'खाते मिलाने के अनुरोध अभी पढ़े नहीं जा सके। कुछ नहीं बदला।',
    'merge.off':
      'इस प्लेटफ़ॉर्म पर खाते मिलाना बंद है। जब तक स्वामी इसे चालू नहीं करते, इस पृष्ठ पर कुछ नहीं किया जा सकता।',
    'merge.foot':
      'हर मिलान प्लेटफ़ॉर्म के बदलावों के अभिलेख में लिखा जाता है, साथ में यह भी कि क्या ले जाया गया।',
    'merge.closeInstead':
      'दूसरे खाते को मिलाने के बजाय बंद करने के लिए उसी खाते में साइन इन करें और उसे वहीं से बंद करें।',
    'merge.closeLink': 'खाता बंद करना',
    'merge.inHeading': 'एक और खाता इस खाते में मिलाए जाने का अनुरोध कर रहा है',
    'merge.inLede':
      'अगर दूसरे खाते पर आप ही हैं, तो सहमति देने से उस खाते की पढ़ाई, भूमिकाएँ और विवरण इस खाते में आ जाते हैं और वह खाता बंद हो जाता है। इसे वापस नहीं किया जा सकता। अगर यह आप नहीं हैं, तो अस्वीकार करें। आपके उत्तर देने तक कुछ नहीं होता।',
    'merge.noName': 'बिना नाम का खाता',
    'merge.inMerged': 'मिला दिया गया। दूसरा खाता बंद है।',
    'merge.inExpired':
      'उत्तर मिलने से पहले इस अनुरोध की अवधि समाप्त हो गई। दूसरे खाते से फिर अनुरोध करें।',
    'merge.whatMoves':
      'क्या ले जाया जाता है: उस खाते का पढ़ाई का अभिलेख उसकी प्रगति और प्रमाणपत्रों के साथ, उसकी भूमिकाएँ, उसकी सूचनाएँ, उसका फ़ोन नंबर और उसके बनाए कोर्स। क्या रह जाता है: उस खाते ने जो किया उसका अभिलेख, जैसे उसके दिए ऑर्डर।',
    'merge.whatGoes':
      'क्या हटाया जाता है: जहाँ दोनों खातों के पास एक ही पाठ पर नोट या बुकमार्क है, या एक ही सूचना है, वहाँ इस खाते वाला रखा जाता है और दूसरा हटा दिया जाता है। अगर इस खाते का अपना फ़ोन नंबर है, तो दूसरे खाते का फ़ोन नंबर भी हटा दिया जाता है।',
    'merge.confirmLabel': 'पुष्टि के लिए इस खाते का नाम लिखें: {name}',
    'merge.needName':
      'इस खाते का अभी कोई नाम नहीं है। पहले खाता सेटिंग्स में नाम जोड़ें: मिलान की पुष्टि उसे लिखकर होती है।',
    'merge.accept': 'इसे इस खाते में मिलाएँ',
    'merge.accepting': 'मिलाया जा रहा है…',
    'merge.decline': 'अस्वीकार करें',
    'merge.cannotUndo':
      'इसे वापस नहीं किया जा सकता। दूसरा खाता बंद कर दिया जाता है और उसका नाम व विवरण हटा दिए जाते हैं। उसका साइन इन, साइन इन सेवा के पास तब तक रहता है जब तक वहाँ से हटाया न जाए।',
    'merge.blockSame': 'इस अनुरोध के दोनों पक्ष एक ही खाता हैं।',
    'merge.blockAbsorbedClosed': 'जो खाता ले जाया जाना है वह बंद है।',
    'merge.blockTargetClosed': 'जिस खाते में ले जाया जाना है वह बंद है।',
    'merge.blockPayouts':
      'जो खाता ले जाया जाना है उसके भुगतान रास्ते में हैं: {count}। उनके पूरे होने तक प्रतीक्षा करें।',
    'merge.blockBilling':
      'जो खाता ले जाया जाना है वह दूसरे लोगों के साथ बिलिंग खाते साझा करता है: {count}। मिलान किसी और व्यक्ति की भुगतान व्यवस्था नहीं ले जा सकता।',
    'merge.blockReviewers':
      'दोनों खाते समीक्षकों की पंजी में हैं। कौन सी प्रविष्टि रहेगी, यह स्वामी तय करते हैं।',
    'merge.blockHouseholds':
      'हर खाता एक अलग परिवार में शिक्षार्थी है। मिलान एक व्यक्ति की पढ़ाई को किसी दूसरे परिवार में नहीं ले जा सकता।',
    'merge.blockSameCourse':
      'दोनों खातों ने एक ही कोर्स शुरू किया है: {title}। प्लेटफ़ॉर्म यह नहीं चुन सकता कि कौन सी प्रगति असली है। मिलाने से पहले कोर्स को एक खाते पर पूरा करें या छोड़ दें।',
    'merge.blockOwner':
      'जो खाता ले जाया जाना है उसके पास इस प्लेटफ़ॉर्म पर स्वामी की एक नियुक्ति है। मिलाने से पहले उसे अलग से देखा जाना ज़रूरी है।',
    'merge.blockOther':
      'यह मिलान अभी नहीं हो सकता, और इस पृष्ठ के पास कारण के लिए कोई वाक्य नहीं है। फिर कोशिश करने से पहले प्लेटफ़ॉर्म के कर्मचारियों से पूछें।',
    'merge.noteJoin':
      'पढ़ाई के दोनों अभिलेख एक हो जाते हैं। इस खाते के अभिलेख में जो पहले से है वह वैसा ही रहता है।',
    'merge.noteMoves': 'पढ़ाई का अभिलेख पूरा ले जाया जाता है, अपनी प्रगति और प्रमाणपत्रों के साथ।',
    'merge.outHeading': 'इस खाते को किसी दूसरे खाते में ले जाएँ',
    'merge.outLede':
      'अगर आपके दो खाते हैं और यह वह है जो अब आपको नहीं चाहिए, तो उस खाते का ईमेल पता लिखें जिसे आप रखना चाहते हैं। अनुरोध वहाँ तब तक प्रतीक्षा करता है जब तक कोई उस खाते में साइन इन करके सहमति न दे। इसी से प्लेटफ़ॉर्म जानता है कि दोनों आपके नियंत्रण में हैं।',
    'merge.emailLabel': 'रखे जाने वाले खाते का ईमेल पता',
    'merge.emailHelp':
      'कुछ भी ले जाए जाने से पहले उस खाते की सहमति ज़रूरी है। इसके बाद यह खाता बंद कर दिया जाता है, और इसे बंद करना वापस नहीं किया जा सकता।',
    'merge.ask': 'मिलाने का अनुरोध करें',
    'merge.asking': 'अनुरोध किया जा रहा है…',
    'merge.listHeading': 'इस खाते से किए गए अनुरोध',
    'merge.listInto': 'उस खाते में जिसका पता आपने लिखा',
    'merge.waitingUntil': '{date} तक प्रतीक्षा में',
    'merge.nothingMoved': 'ले जाने के लिए कुछ नहीं था।',
    'merge.withdraw': 'अनुरोध वापस लें',
    'merge.stPending': 'प्रतीक्षा में',
    'merge.stCompleted': 'मिला दिया गया',
    'merge.stDeclined': 'अस्वीकार किया गया',
    'merge.stCancelled': 'वापस लिया गया',
    'merge.stExpired': 'अवधि समाप्त',
    'merge.movedHeading': 'क्या ले जाया गया',
    'merge.mvLearner': 'पढ़ाई का अभिलेख',
    'merge.mvEnrolments': 'कोर्स में नामांकन: {count}',
    'merge.mvCertificates': 'प्रमाणपत्र: {count}',
    'merge.mvGrants': 'पहुँच की अनुमतियाँ: {count}',
    'merge.mvReviews': 'समीक्षाएँ: {count}',
    'merge.mvAttempts': 'मूल्यांकन के प्रयास: {count}',
    'merge.mvSubmissions': 'असाइनमेंट: {count}',
    'merge.mvCohorts': 'तारीख़ वाली कक्षाएँ: {count}',
    'merge.mvAttendance': 'लाइव कक्षाएँ जिनमें उपस्थिति रही: {count}',
    'merge.mvCases': 'सहायता के मामले: {count}',
    'merge.mvNotifications': 'सूचनाएँ: {count}',
    'merge.mvRoles': 'भूमिकाएँ: {count}',
    'merge.mvNotes': 'पाठ के नोट: {count}',
    'merge.mvBookmarks': 'बुकमार्क: {count}',
    'merge.mvGuardianships': 'अभिभावक संबंध: {count}',
    'merge.stayed':
      'वे अभिलेख जो बंद किए गए खाते के पास रह गए, क्योंकि इस खाते के पास वही चीज़ पहले से थी: {count}।',
    'merge.asked':
      'अनुरोध दूसरे खाते पर प्रतीक्षा में है। उस पर सहमति देने के लिए वहाँ साइन इन करें।',
    'merge.withdrawn': 'अनुरोध वापस ले लिया गया। कुछ नहीं ले जाया गया।',
    'merge.merged': 'खाते मिला दिए गए। दूसरा खाता बंद है।',
    'merge.declined': 'अस्वीकार कर दिया गया। दोनों खाते वैसे ही हैं जैसे थे।',
    'merge.errSignedOut':
      'आप साइन आउट हो चुके हैं। फिर साइन इन करें, फिर एक बार और कोशिश करें। कुछ नहीं बदला।',
    'merge.errEmail': 'उस खाते का ईमेल पता लिखें जिसे आप रखना चाहते हैं।',
    'merge.errNoAccount': 'इस ईमेल पते का कोई खाता नहीं है। कुछ नहीं बदला।',
    'merge.errSameAccount':
      'यह इसी खाते का पता है। दूसरे खाते का पता लिखें, जिसे आप रखना चाहते हैं।',
    'merge.errPending':
      'इस खाते का एक अनुरोध पहले से प्रतीक्षा में है। किसी और खाते से अनुरोध करने से पहले उसे वापस लें।',
    'merge.errNoRequest': 'वह अनुरोध अब नहीं है। कुछ नहीं बदला।',
    'merge.errNotYours': 'यह खाता उस अनुरोध का उत्तर नहीं दे सकता। कुछ नहीं बदला।',
    'merge.errName': 'लिखा गया नाम अक्षर-दर-अक्षर इस खाते का नाम नहीं है। कुछ नहीं बदला।',
    'merge.errBlocked':
      'यह मिलान अभी नहीं हो सकता। कुछ नहीं ले जाया गया। अनुरोध के साथ कारण देखने के लिए यह पृष्ठ फिर से लोड करें।',
    'merge.errExpired':
      'उत्तर मिलने से पहले इस अनुरोध की अवधि समाप्त हो गई। कुछ नहीं ले जाया गया। दूसरे खाते से फिर अनुरोध करें।',
    'merge.errAnswered':
      'इस अनुरोध का उत्तर पहले ही दिया जा चुका था। अभी कुछ नहीं बदला। क्या हुआ, यह देखने के लिए यह पृष्ठ फिर से लोड करें।',
    'merge.errRefused': 'प्लेटफ़ॉर्म ने इसे स्वीकार नहीं किया। कुछ नहीं बदला।',
    'merge.unconfirmed':
      'कोई उत्तर नहीं आया, इसलिए पता नहीं कि यह हुआ या नहीं। फिर कोशिश करने से पहले स्थिति देखने के लिए यह पृष्ठ फिर से लोड करें।',
  },
  fr: {
    'merge.title': 'Fusion de comptes',
    'merge.back': 'Paramètres du compte',
    'merge.heading': 'Fusion de comptes',
    'merge.lede':
      'Si vous vous êtes inscrit deux fois, l’un des comptes peut être transféré dans l’autre, afin que vos cours et vos certificats soient au même endroit. Les deux comptes doivent être d’accord, et le compte transféré est ensuite fermé.',
    'merge.unread':
      'Les demandes de fusion n’ont pas pu être lues pour l’instant. Rien n’a été modifié.',
    'merge.off':
      'La fusion de comptes est désactivée sur cette plateforme. Rien ne peut être fait sur cette page tant que le propriétaire ne l’a pas activée.',
    'merge.foot':
      'Chaque fusion est inscrite dans le registre des modifications de la plateforme, avec ce qui a été transféré.',
    'merge.closeInstead':
      'Pour fermer un second compte au lieu de le fusionner, connectez-vous à ce compte et fermez-le de là.',
    'merge.closeLink': 'Fermer un compte',
    'merge.inHeading': 'Un autre compte demande à être fusionné avec celui-ci',
    'merge.inLede':
      'Si c’est vous sur un second compte, accepter transfère l’apprentissage, les rôles et les informations de ce compte vers celui-ci et ferme ce compte. C’est irréversible. Si ce n’est pas vous, refusez. Rien ne se passe tant que vous n’avez pas répondu.',
    'merge.noName': 'Un compte sans nom',
    'merge.inMerged': 'Fusionné. L’autre compte est fermé.',
    'merge.inExpired':
      'Cette demande a expiré avant d’avoir reçu une réponse. Refaites la demande depuis l’autre compte.',
    'merge.whatMoves':
      'Ce qui est transféré : le dossier d’apprentissage de ce compte avec sa progression et ses certificats, ses rôles, ses notifications, son numéro de téléphone et les cours qu’il a créés. Ce qui reste : la trace de ce que ce compte a fait, par exemple les commandes qu’il a passées.',
    'merge.whatGoes':
      'Ce qui est supprimé : lorsque les deux comptes ont une note ou un favori sur la même leçon, ou la même notification, celui de ce compte est conservé et l’autre est supprimé. Le numéro de téléphone de l’autre compte l’est aussi, si ce compte en a déjà un.',
    'merge.confirmLabel': 'Saisissez le nom de ce compte pour confirmer : {name}',
    'merge.needName':
      'Ce compte n’a pas encore de nom. Ajoutez-en d’abord un dans les paramètres du compte : une fusion se confirme en le saisissant.',
    'merge.accept': 'Le fusionner avec ce compte',
    'merge.accepting': 'Fusion en cours…',
    'merge.decline': 'Refuser',
    'merge.cannotUndo':
      'C’est irréversible. L’autre compte est fermé, et son nom et ses informations en sont retirés. Sa connexion reste auprès du service de connexion jusqu’à ce qu’elle y soit supprimée.',
    'merge.blockSame': 'Les deux côtés de cette demande sont le même compte.',
    'merge.blockAbsorbedClosed': 'Le compte qui serait transféré est fermé.',
    'merge.blockTargetClosed': 'Le compte vers lequel il serait transféré est fermé.',
    'merge.blockPayouts':
      'Le compte qui serait transféré a des versements en cours : {count}. Attendez qu’ils soient terminés.',
    'merge.blockBilling':
      'Le compte qui serait transféré partage des comptes de facturation avec d’autres personnes : {count}. Une fusion ne peut pas déplacer les modalités de paiement de quelqu’un d’autre.',
    'merge.blockReviewers':
      'Les deux comptes figurent au registre des relecteurs. Le propriétaire décide quelle inscription est conservée.',
    'merge.blockHouseholds':
      'Chaque compte est un apprenant dans une famille différente. Une fusion ne peut pas déplacer l’apprentissage d’une personne dans une autre famille.',
    'merge.blockSameCourse':
      'Les deux comptes ont commencé le même cours : {title}. La plateforme ne peut pas choisir quelle progression est la vraie. Terminez le cours sur l’un des comptes, ou quittez-le, avant de fusionner.',
    'merge.blockOwner':
      'Le compte qui serait transféré détient une désignation du propriétaire sur cette plateforme. Il doit être examiné individuellement avant de pouvoir être fusionné.',
    'merge.blockOther':
      'Cette fusion ne peut pas être effectuée pour l’instant, et cette page n’a pas de phrase pour en dire la raison. Renseignez-vous auprès du personnel de la plateforme avant de réessayer.',
    'merge.noteJoin':
      'Les deux dossiers d’apprentissage n’en font plus qu’un. Ce que le dossier de ce compte contient déjà reste tel quel.',
    'merge.noteMoves':
      'Le dossier d’apprentissage est transféré en entier, avec sa progression et ses certificats.',
    'merge.outHeading': 'Transférer ce compte dans un autre',
    'merge.outLede':
      'Si vous avez deux comptes et que celui-ci est celui dont vous ne voulez plus, saisissez l’adresse e-mail du compte que vous voulez garder. La demande y attend jusqu’à ce que quelqu’un se connecte à ce compte et accepte. C’est ainsi que la plateforme sait que vous contrôlez les deux.',
    'merge.emailLabel': 'Adresse e-mail du compte à garder',
    'merge.emailHelp':
      'Ce compte doit accepter avant que quoi que ce soit ne soit transféré. Celui-ci est ensuite fermé, et sa fermeture est irréversible.',
    'merge.ask': 'Demander la fusion',
    'merge.asking': 'Demande en cours…',
    'merge.listHeading': 'Demandes faites depuis ce compte',
    'merge.listInto': 'Vers le compte dont vous avez saisi l’adresse',
    'merge.waitingUntil': 'En attente jusqu’au {date}',
    'merge.nothingMoved': 'Rien n’était à transférer.',
    'merge.withdraw': 'Retirer la demande',
    'merge.stPending': 'En attente',
    'merge.stCompleted': 'Fusionné',
    'merge.stDeclined': 'Refusée',
    'merge.stCancelled': 'Retirée',
    'merge.stExpired': 'Expirée',
    'merge.movedHeading': 'Ce qui a été transféré',
    'merge.mvLearner': 'Le dossier d’apprentissage',
    'merge.mvEnrolments': 'Inscriptions aux cours : {count}',
    'merge.mvCertificates': 'Certificats : {count}',
    'merge.mvGrants': 'Droits d’accès : {count}',
    'merge.mvReviews': 'Avis : {count}',
    'merge.mvAttempts': 'Tentatives d’évaluation : {count}',
    'merge.mvSubmissions': 'Devoirs : {count}',
    'merge.mvCohorts': 'Classes datées : {count}',
    'merge.mvAttendance': 'Cours en direct suivis : {count}',
    'merge.mvCases': 'Dossiers d’assistance : {count}',
    'merge.mvNotifications': 'Notifications : {count}',
    'merge.mvRoles': 'Rôles : {count}',
    'merge.mvNotes': 'Notes de leçon : {count}',
    'merge.mvBookmarks': 'Favoris : {count}',
    'merge.mvGuardianships': 'Liens de tutelle : {count}',
    'merge.stayed':
      'Éléments restés avec le compte fermé, parce que ce compte avait déjà la même chose : {count}.',
    'merge.asked': 'La demande attend sur l’autre compte. Connectez-vous-y pour l’accepter.',
    'merge.withdrawn': 'La demande est retirée. Rien n’a été transféré.',
    'merge.merged': 'Les comptes sont fusionnés. L’autre compte est fermé.',
    'merge.declined': 'Refusé. Les deux comptes sont tels qu’ils étaient.',
    'merge.errSignedOut':
      'Vous êtes déconnecté. Reconnectez-vous, puis réessayez une fois. Rien n’a été modifié.',
    'merge.errEmail': 'Saisissez l’adresse e-mail du compte que vous voulez garder.',
    'merge.errNoAccount': 'Aucun compte n’a cette adresse e-mail. Rien n’a été modifié.',
    'merge.errSameAccount':
      'C’est l’adresse de ce compte-ci. Saisissez l’adresse de l’autre, le compte que vous voulez garder.',
    'merge.errPending':
      'Une demande faite depuis ce compte attend déjà. Retirez-la avant de vous adresser à un autre compte.',
    'merge.errNoRequest': 'Cette demande n’existe plus. Rien n’a été modifié.',
    'merge.errNotYours': 'Ce compte ne peut pas répondre à cette demande. Rien n’a été modifié.',
    'merge.errName':
      'Le nom saisi n’est pas, lettre pour lettre, le nom de ce compte. Rien n’a été modifié.',
    'merge.errBlocked':
      'Cette fusion ne peut pas être effectuée pour l’instant. Rien n’a été transféré. Rechargez cette page pour voir la raison à côté de la demande.',
    'merge.errExpired':
      'Cette demande a expiré avant d’avoir reçu une réponse. Rien n’a été transféré. Refaites la demande depuis l’autre compte.',
    'merge.errAnswered':
      'Cette demande avait déjà reçu une réponse. Rien n’a été modifié à l’instant. Rechargez cette page pour voir ce qui s’est passé.',
    'merge.errRefused': 'La plateforme n’a pas accepté cela. Rien n’a été modifié.',
    'merge.unconfirmed':
      'Aucune réponse n’est revenue, on ne sait donc pas si cela a été fait. Rechargez cette page pour voir où en sont les choses avant de réessayer.',
  },
  es: {
    'merge.title': 'Fusión de cuentas',
    'merge.back': 'Ajustes de la cuenta',
    'merge.heading': 'Fusión de cuentas',
    'merge.lede':
      'Si se registró dos veces, una cuenta puede trasladarse a la otra para que sus cursos y certificados estén en un solo lugar. Las dos cuentas tienen que estar de acuerdo, y la cuenta trasladada se cierra después.',
    'merge.unread':
      'No se pudieron leer las solicitudes de fusión en este momento. No se cambió nada.',
    'merge.off':
      'La fusión de cuentas está desactivada en esta plataforma. No se puede hacer nada en esta página hasta que el propietario la active.',
    'merge.foot':
      'Cada fusión se anota en el registro de cambios de la plataforma, con lo que se trasladó.',
    'merge.closeInstead':
      'Para cerrar una segunda cuenta en lugar de fusionarla, inicie sesión en esa cuenta y ciérrela desde allí.',
    'merge.closeLink': 'Cerrar una cuenta',
    'merge.inHeading': 'Otra cuenta solicita fusionarse con esta',
    'merge.inLede':
      'Si es usted en una segunda cuenta, aceptar traslada el aprendizaje, los roles y los datos de esa cuenta a esta y cierra esa cuenta. No se puede deshacer. Si no es usted, rechace. No ocurre nada hasta que usted responda.',
    'merge.noName': 'Una cuenta sin nombre',
    'merge.inMerged': 'Fusionada. La otra cuenta está cerrada.',
    'merge.inExpired':
      'Esta solicitud caducó antes de recibir respuesta. Vuelva a solicitarlo desde la otra cuenta.',
    'merge.whatMoves':
      'Lo que se traslada: el registro de aprendizaje de esa cuenta con su progreso y sus certificados, sus roles, sus notificaciones, su número de teléfono y los cursos que creó. Lo que se queda: el registro de lo que esa cuenta hizo, como los pedidos que realizó.',
    'merge.whatGoes':
      'Lo que se elimina: cuando las dos cuentas tienen una nota o un marcador en la misma lección, o la misma notificación, se conserva lo de esta cuenta y lo otro se elimina. También el número de teléfono de la otra cuenta, si esta ya tiene uno.',
    'merge.confirmLabel': 'Escriba el nombre de esta cuenta para confirmar: {name}',
    'merge.needName':
      'Esta cuenta aún no tiene nombre. Añada primero uno en los ajustes de la cuenta: una fusión se confirma escribiéndolo.',
    'merge.accept': 'Fusionarla con esta cuenta',
    'merge.accepting': 'Fusionando…',
    'merge.decline': 'Rechazar',
    'merge.cannotUndo':
      'Esto no se puede deshacer. La otra cuenta se cierra y se le quitan el nombre y los datos. Su inicio de sesión permanece en el servicio de inicio de sesión hasta que se elimine allí.',
    'merge.blockSame': 'Los dos lados de esta solicitud son la misma cuenta.',
    'merge.blockAbsorbedClosed': 'La cuenta que se trasladaría está cerrada.',
    'merge.blockTargetClosed': 'La cuenta a la que se trasladaría está cerrada.',
    'merge.blockPayouts':
      'La cuenta que se trasladaría tiene pagos en camino: {count}. Espere a que terminen.',
    'merge.blockBilling':
      'La cuenta que se trasladaría comparte cuentas de facturación con otras personas: {count}. Una fusión no puede trasladar los acuerdos de pago de otra persona.',
    'merge.blockReviewers':
      'Las dos cuentas están en el registro de revisores. El propietario decide qué inscripción se conserva.',
    'merge.blockHouseholds':
      'Cada cuenta es un estudiante de una familia distinta. Una fusión no puede trasladar el aprendizaje de una persona a otra familia.',
    'merge.blockSameCourse':
      'Las dos cuentas han empezado el mismo curso: {title}. La plataforma no puede elegir cuál progreso es el real. Termine el curso en una de las cuentas, o déjelo, antes de fusionar.',
    'merge.blockOwner':
      'La cuenta que se trasladaría tiene un nombramiento del propietario en esta plataforma. Debe examinarse de forma individual antes de poder fusionarse.',
    'merge.blockOther':
      'Esta fusión no puede realizarse ahora, y esta página no tiene una frase para el motivo. Consulte al personal de la plataforma antes de volver a intentarlo.',
    'merge.noteJoin':
      'Los dos registros de aprendizaje pasan a ser uno. Lo que el registro de esta cuenta ya tiene se queda como está.',
    'merge.noteMoves':
      'El registro de aprendizaje se traslada entero, con su progreso y sus certificados.',
    'merge.outHeading': 'Trasladar esta cuenta a otra',
    'merge.outLede':
      'Si tiene dos cuentas y esta es la que ya no quiere, escriba la dirección de correo electrónico de la cuenta que quiere conservar. La solicitud espera allí hasta que alguien inicie sesión en esa cuenta y acepte. Así sabe la plataforma que usted controla las dos.',
    'merge.emailLabel': 'Dirección de correo de la cuenta que se conserva',
    'merge.emailHelp':
      'Esa cuenta tiene que aceptar antes de que se traslade nada. Esta cuenta se cierra después, y su cierre no se puede deshacer.',
    'merge.ask': 'Solicitar la fusión',
    'merge.asking': 'Solicitando…',
    'merge.listHeading': 'Solicitudes hechas desde esta cuenta',
    'merge.listInto': 'A la cuenta cuya dirección escribió',
    'merge.waitingUntil': 'En espera hasta el {date}',
    'merge.nothingMoved': 'No había nada que trasladar.',
    'merge.withdraw': 'Retirar la solicitud',
    'merge.stPending': 'En espera',
    'merge.stCompleted': 'Fusionada',
    'merge.stDeclined': 'Rechazada',
    'merge.stCancelled': 'Retirada',
    'merge.stExpired': 'Caducada',
    'merge.movedHeading': 'Lo que se trasladó',
    'merge.mvLearner': 'El registro de aprendizaje',
    'merge.mvEnrolments': 'Inscripciones en cursos: {count}',
    'merge.mvCertificates': 'Certificados: {count}',
    'merge.mvGrants': 'Permisos de acceso: {count}',
    'merge.mvReviews': 'Reseñas: {count}',
    'merge.mvAttempts': 'Intentos de evaluación: {count}',
    'merge.mvSubmissions': 'Tareas: {count}',
    'merge.mvCohorts': 'Clases con fecha: {count}',
    'merge.mvAttendance': 'Clases en directo a las que se asistió: {count}',
    'merge.mvCases': 'Casos de asistencia: {count}',
    'merge.mvNotifications': 'Notificaciones: {count}',
    'merge.mvRoles': 'Roles: {count}',
    'merge.mvNotes': 'Notas de lección: {count}',
    'merge.mvBookmarks': 'Marcadores: {count}',
    'merge.mvGuardianships': 'Vínculos de tutela: {count}',
    'merge.stayed':
      'Registros que se quedaron con la cuenta cerrada, porque esta cuenta ya tenía lo mismo: {count}.',
    'merge.asked': 'La solicitud espera en la otra cuenta. Inicie sesión allí para aceptarla.',
    'merge.withdrawn': 'La solicitud se ha retirado. No se trasladó nada.',
    'merge.merged': 'Las cuentas se han fusionado. La otra cuenta está cerrada.',
    'merge.declined': 'Rechazada. Las dos cuentas están como estaban.',
    'merge.errSignedOut':
      'Su sesión está cerrada. Inicie sesión de nuevo y vuelva a intentarlo una vez. No se cambió nada.',
    'merge.errEmail':
      'Escriba la dirección de correo electrónico de la cuenta que quiere conservar.',
    'merge.errNoAccount': 'Ninguna cuenta tiene esa dirección de correo. No se cambió nada.',
    'merge.errSameAccount':
      'Esa es la dirección de esta misma cuenta. Escriba la de la otra, la cuenta que quiere conservar.',
    'merge.errPending':
      'Ya hay una solicitud de esta cuenta en espera. Retírela antes de pedirlo a otra cuenta.',
    'merge.errNoRequest': 'Esa solicitud ya no existe. No se cambió nada.',
    'merge.errNotYours': 'Esta cuenta no puede responder a esa solicitud. No se cambió nada.',
    'merge.errName':
      'El nombre escrito no es, letra por letra, el nombre de esta cuenta. No se cambió nada.',
    'merge.errBlocked':
      'Esta fusión no puede realizarse ahora. No se trasladó nada. Recargue esta página para ver el motivo junto a la solicitud.',
    'merge.errExpired':
      'Esta solicitud caducó antes de recibir respuesta. No se trasladó nada. Vuelva a solicitarlo desde la otra cuenta.',
    'merge.errAnswered':
      'Esta solicitud ya había sido respondida. Ahora no se cambió nada. Recargue esta página para ver qué ocurrió.',
    'merge.errRefused': 'La plataforma no aceptó esto. No se cambió nada.',
    'merge.unconfirmed':
      'No llegó ninguna respuesta, así que no se sabe si esto se hizo. Recargue esta página para ver cómo están las cosas antes de volver a intentarlo.',
  },
  pt: {
    'merge.title': 'Fusão de contas',
    'merge.back': 'Definições da conta',
    'merge.heading': 'Fusão de contas',
    'merge.lede':
      'Se se registou duas vezes, uma conta pode ser transferida para a outra, para que os seus cursos e certificados fiquem num só lugar. As duas contas têm de concordar, e a conta transferida é fechada depois.',
    'merge.unread': 'Não foi possível ler os pedidos de fusão neste momento. Nada foi alterado.',
    'merge.off':
      'A fusão de contas está desligada nesta plataforma. Nada pode ser feito nesta página até o proprietário a ligar.',
    'merge.foot':
      'Cada fusão é escrita no registo de alterações da plataforma, com o que foi transferido.',
    'merge.closeInstead':
      'Para fechar uma segunda conta em vez de a fundir, entre nessa conta e feche-a a partir de lá.',
    'merge.closeLink': 'Fechar uma conta',
    'merge.inHeading': 'Outra conta está a pedir para ser fundida com esta',
    'merge.inLede':
      'Se é o próprio numa segunda conta, aceitar transfere a aprendizagem, as funções e os dados dessa conta para esta e fecha essa conta. Não pode ser desfeito. Se não é o próprio, recuse. Nada acontece até responder.',
    'merge.noName': 'Uma conta sem nome',
    'merge.inMerged': 'Fundida. A outra conta está fechada.',
    'merge.inExpired':
      'Este pedido expirou antes de ter resposta. Peça de novo a partir da outra conta.',
    'merge.whatMoves':
      'O que é transferido: o registo de aprendizagem dessa conta com o seu progresso e certificados, as suas funções, as suas notificações, o seu número de telefone e os cursos que criou. O que fica: o registo do que essa conta fez, como as encomendas que efetuou.',
    'merge.whatGoes':
      'O que é eliminado: quando as duas contas têm uma nota ou um marcador na mesma aula, ou a mesma notificação, fica o que está nesta conta e o outro é eliminado. O número de telefone da outra conta também, se esta já tiver um.',
    'merge.confirmLabel': 'Escreva o nome desta conta para confirmar: {name}',
    'merge.needName':
      'Esta conta ainda não tem nome. Acrescente primeiro um nas definições da conta: uma fusão confirma-se escrevendo-o.',
    'merge.accept': 'Fundi-la com esta conta',
    'merge.accepting': 'A fundir…',
    'merge.decline': 'Recusar',
    'merge.cannotUndo':
      'Isto não pode ser desfeito. A outra conta é fechada e o nome e os dados são-lhe retirados. O seu início de sessão permanece no serviço de início de sessão até ser eliminado lá.',
    'merge.blockSame': 'Os dois lados deste pedido são a mesma conta.',
    'merge.blockAbsorbedClosed': 'A conta que seria transferida está fechada.',
    'merge.blockTargetClosed': 'A conta para onde seria transferida está fechada.',
    'merge.blockPayouts':
      'A conta que seria transferida tem pagamentos a caminho: {count}. Aguarde até terminarem.',
    'merge.blockBilling':
      'A conta que seria transferida partilha contas de faturação com outras pessoas: {count}. Uma fusão não pode transferir os acordos de pagamento de outra pessoa.',
    'merge.blockReviewers':
      'As duas contas estão no registo de revisores. O proprietário decide que inscrição fica.',
    'merge.blockHouseholds':
      'Cada conta é um aluno numa família diferente. Uma fusão não pode transferir a aprendizagem de uma pessoa para outra família.',
    'merge.blockSameCourse':
      'As duas contas começaram o mesmo curso: {title}. A plataforma não pode escolher qual é o progresso verdadeiro. Termine o curso numa das contas, ou deixe-o, antes de fundir.',
    'merge.blockOwner':
      'A conta que seria transferida tem uma nomeação do proprietário nesta plataforma. Tem de ser analisada individualmente antes de poder ser fundida.',
    'merge.blockOther':
      'Esta fusão não pode ser feita agora, e esta página não tem uma frase para o motivo. Pergunte ao pessoal da plataforma antes de tentar de novo.',
    'merge.noteJoin':
      'Os dois registos de aprendizagem passam a ser um. O que o registo desta conta já tem fica como está.',
    'merge.noteMoves':
      'O registo de aprendizagem é transferido inteiro, com o seu progresso e certificados.',
    'merge.outHeading': 'Transferir esta conta para outra',
    'merge.outLede':
      'Se tem duas contas e esta é a que já não quer, escreva o endereço de e-mail da conta que quer manter. O pedido fica lá à espera até alguém entrar nessa conta e concordar. É assim que a plataforma sabe que controla as duas.',
    'merge.emailLabel': 'Endereço de e-mail da conta a manter',
    'merge.emailHelp':
      'Essa conta tem de concordar antes de qualquer coisa ser transferida. Esta conta é fechada depois, e fechá-la não pode ser desfeito.',
    'merge.ask': 'Pedir a fusão',
    'merge.asking': 'A pedir…',
    'merge.listHeading': 'Pedidos feitos a partir desta conta',
    'merge.listInto': 'Para a conta cujo endereço escreveu',
    'merge.waitingUntil': 'À espera até {date}',
    'merge.nothingMoved': 'Não havia nada para transferir.',
    'merge.withdraw': 'Retirar o pedido',
    'merge.stPending': 'À espera',
    'merge.stCompleted': 'Fundida',
    'merge.stDeclined': 'Recusado',
    'merge.stCancelled': 'Retirado',
    'merge.stExpired': 'Expirado',
    'merge.movedHeading': 'O que foi transferido',
    'merge.mvLearner': 'O registo de aprendizagem',
    'merge.mvEnrolments': 'Inscrições em cursos: {count}',
    'merge.mvCertificates': 'Certificados: {count}',
    'merge.mvGrants': 'Permissões de acesso: {count}',
    'merge.mvReviews': 'Avaliações de cursos: {count}',
    'merge.mvAttempts': 'Tentativas de avaliação: {count}',
    'merge.mvSubmissions': 'Tarefas: {count}',
    'merge.mvCohorts': 'Turmas com data: {count}',
    'merge.mvAttendance': 'Aulas em direto a que assistiu: {count}',
    'merge.mvCases': 'Casos de apoio: {count}',
    'merge.mvNotifications': 'Notificações: {count}',
    'merge.mvRoles': 'Funções: {count}',
    'merge.mvNotes': 'Notas de aula: {count}',
    'merge.mvBookmarks': 'Marcadores: {count}',
    'merge.mvGuardianships': 'Ligações de tutela: {count}',
    'merge.stayed':
      'Registos que ficaram com a conta fechada, porque esta conta já tinha a mesma coisa: {count}.',
    'merge.asked': 'O pedido está à espera na outra conta. Entre lá para concordar com ele.',
    'merge.withdrawn': 'O pedido foi retirado. Nada foi transferido.',
    'merge.merged': 'As contas foram fundidas. A outra conta está fechada.',
    'merge.declined': 'Recusado. As duas contas estão como estavam.',
    'merge.errSignedOut':
      'Terminou a sessão. Entre de novo e tente mais uma vez. Nada foi alterado.',
    'merge.errEmail': 'Escreva o endereço de e-mail da conta que quer manter.',
    'merge.errNoAccount': 'Nenhuma conta tem esse endereço de e-mail. Nada foi alterado.',
    'merge.errSameAccount':
      'Esse é o endereço desta mesma conta. Escreva o da outra, a conta que quer manter.',
    'merge.errPending':
      'Já há um pedido desta conta à espera. Retire-o antes de pedir a outra conta.',
    'merge.errNoRequest': 'Esse pedido já não existe. Nada foi alterado.',
    'merge.errNotYours': 'Esta conta não pode responder a esse pedido. Nada foi alterado.',
    'merge.errName':
      'O nome escrito não é, letra por letra, o nome desta conta. Nada foi alterado.',
    'merge.errBlocked':
      'Esta fusão não pode ser feita agora. Nada foi transferido. Recarregue esta página para ver o motivo junto ao pedido.',
    'merge.errExpired':
      'Este pedido expirou antes de ter resposta. Nada foi transferido. Peça de novo a partir da outra conta.',
    'merge.errAnswered':
      'Este pedido já tinha tido resposta. Nada foi alterado agora. Recarregue esta página para ver o que aconteceu.',
    'merge.errRefused': 'A plataforma não aceitou isto. Nada foi alterado.',
    'merge.unconfirmed':
      'Não chegou nenhuma resposta, por isso não se sabe se isto foi feito. Recarregue esta página para ver como estão as coisas antes de tentar de novo.',
  },
  sw: {
    'merge.title': 'Kuunganisha akaunti',
    'merge.back': 'Mipangilio ya akaunti',
    'merge.heading': 'Kuunganisha akaunti',
    'merge.lede':
      'Ikiwa ulijisajili mara mbili, akaunti moja inaweza kuhamishiwa kwenye nyingine ili kozi na vyeti vyako viwe mahali pamoja. Akaunti zote mbili lazima zikubali, na akaunti inayohamishwa hufungwa baadaye.',
    'merge.unread': 'Maombi ya kuunganisha hayakuweza kusomwa sasa hivi. Hakuna kilichobadilishwa.',
    'merge.off':
      'Kuunganisha akaunti kumezimwa kwenye jukwaa hili. Hakuna kinachoweza kufanyika kwenye ukurasa huu hadi mmiliki akuwashe.',
    'merge.foot':
      'Kila muunganisho huandikwa kwenye rekodi ya mabadiliko ya jukwaa, pamoja na kilichohamishwa.',
    'merge.closeInstead':
      'Ili kufunga akaunti ya pili badala ya kuiunganisha, ingia kwenye akaunti hiyo na uifunge kutoka huko.',
    'merge.closeLink': 'Kufunga akaunti',
    'merge.inHeading': 'Akaunti nyingine inaomba kuunganishwa na hii',
    'merge.inLede':
      'Ikiwa ni wewe kwenye akaunti ya pili, kukubali kunahamisha masomo, majukumu na taarifa za akaunti hiyo kuja kwenye hii na kuifunga akaunti hiyo. Hakuwezi kutenduliwa. Ikiwa si wewe, kataa. Hakuna kinachotokea hadi ujibu.',
    'merge.noName': 'Akaunti isiyo na jina',
    'merge.inMerged': 'Imeunganishwa. Akaunti nyingine imefungwa.',
    'merge.inExpired':
      'Ombi hili liliisha muda kabla ya kujibiwa. Omba tena kutoka kwenye akaunti nyingine.',
    'merge.whatMoves':
      'Kinachohamishwa: rekodi ya masomo ya akaunti hiyo pamoja na maendeleo na vyeti vyake, majukumu yake, arifa zake, namba yake ya simu na kozi ilizotengeneza. Kinachobaki: rekodi ya mambo ambayo akaunti hiyo ilifanya, kama vile oda ilizoweka.',
    'merge.whatGoes':
      'Kinachofutwa: pale ambapo akaunti zote mbili zina dokezo au alamisho kwenye kipindi kilekile, au arifa ileile, kilicho kwenye akaunti hii hubaki na kingine hufutwa. Namba ya simu ya akaunti nyingine pia hufutwa ikiwa akaunti hii tayari ina namba.',
    'merge.confirmLabel': 'Andika jina la akaunti hii ili kuthibitisha: {name}',
    'merge.needName':
      'Akaunti hii bado haina jina. Kwanza ongeza jina kwenye mipangilio ya akaunti: muunganisho huthibitishwa kwa kuliandika.',
    'merge.accept': 'Iunganishe na akaunti hii',
    'merge.accepting': 'Inaunganisha…',
    'merge.decline': 'Kataa',
    'merge.cannotUndo':
      'Hili haliwezi kutenduliwa. Akaunti nyingine hufungwa, na jina na taarifa zake huondolewa. Taarifa zake za kuingia hubaki kwa huduma ya kuingia hadi zifutwe huko.',
    'merge.blockSame': 'Pande zote mbili za ombi hili ni akaunti moja.',
    'merge.blockAbsorbedClosed': 'Akaunti ambayo ingehamishwa imefungwa.',
    'merge.blockTargetClosed': 'Akaunti ambayo ingehamishiwa imefungwa.',
    'merge.blockPayouts':
      'Akaunti ambayo ingehamishwa ina malipo yaliyo njiani: {count}. Subiri hadi yakamilike.',
    'merge.blockBilling':
      'Akaunti ambayo ingehamishwa inashiriki akaunti za bili na watu wengine: {count}. Muunganisho hauwezi kuhamisha mipango ya malipo ya mtu mwingine.',
    'merge.blockReviewers':
      'Akaunti zote mbili ziko kwenye rejista ya wakaguzi. Mmiliki ndiye anayeamua ni ingizo lipi linabaki.',
    'merge.blockHouseholds':
      'Kila akaunti ni mwanafunzi katika familia tofauti. Muunganisho hauwezi kuhamisha masomo ya mtu mmoja kwenda familia nyingine.',
    'merge.blockSameCourse':
      'Akaunti zote mbili zimeanza kozi ileile: {title}. Jukwaa haliwezi kuchagua ni maendeleo yapi ndiyo halisi. Maliza kozi hiyo kwenye akaunti moja, au iache, kabla ya kuunganisha.',
    'merge.blockOwner':
      'Akaunti ambayo ingehamishwa ina uteuzi wa mmiliki kwenye jukwaa hili. Lazima iangaliwe peke yake kabla ya kuunganishwa.',
    'merge.blockOther':
      'Muunganisho huu hauwezi kufanyika sasa, na ukurasa huu hauna sentensi ya kueleza sababu. Waulize wafanyakazi wa jukwaa kabla ya kujaribu tena.',
    'merge.noteJoin':
      'Rekodi mbili za masomo zinakuwa moja. Kile ambacho rekodi ya akaunti hii tayari inacho hubaki kilivyo.',
    'merge.noteMoves': 'Rekodi ya masomo huhamishwa nzima, pamoja na maendeleo na vyeti vyake.',
    'merge.outHeading': 'Hamishia akaunti hii kwenye nyingine',
    'merge.outLede':
      'Ikiwa una akaunti mbili na hii ndiyo usiyoitaka tena, andika anwani ya barua pepe ya akaunti unayotaka kubaki nayo. Ombi husubiri huko hadi mtu aingie kwenye akaunti hiyo na akubali. Hivyo ndivyo jukwaa linavyojua kwamba unazimiliki zote mbili.',
    'merge.emailLabel': 'Anwani ya barua pepe ya akaunti ya kubaki nayo',
    'merge.emailHelp':
      'Akaunti hiyo lazima ikubali kabla ya chochote kuhamishwa. Akaunti hii hufungwa baadaye, na kuifunga hakuwezi kutenduliwa.',
    'merge.ask': 'Omba kuunganishwa',
    'merge.asking': 'Inaomba…',
    'merge.listHeading': 'Maombi yaliyotumwa kutoka akaunti hii',
    'merge.listInto': 'Kwenda kwenye akaunti ambayo uliandika anwani yake',
    'merge.waitingUntil': 'Linasubiri hadi {date}',
    'merge.nothingMoved': 'Hakukuwa na cha kuhamisha.',
    'merge.withdraw': 'Ondoa ombi',
    'merge.stPending': 'Linasubiri',
    'merge.stCompleted': 'Imeunganishwa',
    'merge.stDeclined': 'Limekataliwa',
    'merge.stCancelled': 'Limeondolewa',
    'merge.stExpired': 'Limeisha muda',
    'merge.movedHeading': 'Kilichohamishwa',
    'merge.mvLearner': 'Rekodi ya masomo',
    'merge.mvEnrolments': 'Usajili wa kozi: {count}',
    'merge.mvCertificates': 'Vyeti: {count}',
    'merge.mvGrants': 'Ruhusa za kufikia: {count}',
    'merge.mvReviews': 'Maoni: {count}',
    'merge.mvAttempts': 'Majaribio ya tathmini: {count}',
    'merge.mvSubmissions': 'Mazoezi: {count}',
    'merge.mvCohorts': 'Madarasa yenye tarehe: {count}',
    'merge.mvAttendance': 'Madarasa ya moja kwa moja yaliyohudhuriwa: {count}',
    'merge.mvCases': 'Kesi za msaada: {count}',
    'merge.mvNotifications': 'Arifa: {count}',
    'merge.mvRoles': 'Majukumu: {count}',
    'merge.mvNotes': 'Madokezo ya vipindi: {count}',
    'merge.mvBookmarks': 'Alamisho: {count}',
    'merge.mvGuardianships': 'Viungo vya walezi: {count}',
    'merge.stayed':
      'Rekodi zilizobaki kwenye akaunti iliyofungwa, kwa sababu akaunti hii tayari ilikuwa na kitu kilekile: {count}.',
    'merge.asked': 'Ombi linasubiri kwenye akaunti nyingine. Ingia huko ili ulikubali.',
    'merge.withdrawn': 'Ombi limeondolewa. Hakuna kilichohamishwa.',
    'merge.merged': 'Akaunti zimeunganishwa. Akaunti nyingine imefungwa.',
    'merge.declined': 'Limekataliwa. Akaunti zote mbili ziko kama zilivyokuwa.',
    'merge.errSignedOut':
      'Umetoka kwenye akaunti. Ingia tena, kisha ujaribu mara moja zaidi. Hakuna kilichobadilishwa.',
    'merge.errEmail': 'Andika anwani ya barua pepe ya akaunti unayotaka kubaki nayo.',
    'merge.errNoAccount':
      'Hakuna akaunti yenye anwani hiyo ya barua pepe. Hakuna kilichobadilishwa.',
    'merge.errSameAccount':
      'Hiyo ni anwani ya akaunti hii. Andika anwani ya ile nyingine, akaunti unayotaka kubaki nayo.',
    'merge.errPending':
      'Ombi kutoka akaunti hii tayari linasubiri. Liondoe kabla ya kuomba akaunti nyingine.',
    'merge.errNoRequest': 'Ombi hilo halipo tena. Hakuna kilichobadilishwa.',
    'merge.errNotYours': 'Akaunti hii haiwezi kujibu ombi hilo. Hakuna kilichobadilishwa.',
    'merge.errName':
      'Jina lililoandikwa si jina la akaunti hii, herufi kwa herufi. Hakuna kilichobadilishwa.',
    'merge.errBlocked':
      'Muunganisho huu hauwezi kufanyika sasa. Hakuna kilichohamishwa. Pakia upya ukurasa huu ili uone sababu kando ya ombi.',
    'merge.errExpired':
      'Ombi hili liliisha muda kabla ya kujibiwa. Hakuna kilichohamishwa. Omba tena kutoka kwenye akaunti nyingine.',
    'merge.errAnswered':
      'Ombi hili lilikuwa limeshajibiwa. Hakuna kilichobadilishwa sasa. Pakia upya ukurasa huu ili uone kilichotokea.',
    'merge.errRefused': 'Jukwaa halikukubali hili. Hakuna kilichobadilishwa.',
    'merge.unconfirmed':
      'Hakuna jibu lililorudi, kwa hiyo haijulikani kama hili lilifanyika. Pakia upya ukurasa huu ili uone hali ilivyo kabla ya kujaribu tena.',
  },
  af: {
    'merge.title': 'Samevoeging van rekeninge',
    'merge.back': 'Rekeningsinstellings',
    'merge.heading': 'Samevoeging van rekeninge',
    'merge.lede':
      'As jy twee keer geregistreer het, kan een rekening na die ander geskuif word, sodat jou kursusse en sertifikate op een plek is. Albei rekeninge moet instem, en die rekening wat geskuif word, word daarna gesluit.',
    'merge.unread': 'Die samevoegingsversoeke kon nie nou gelees word nie. Niks is verander nie.',
    'merge.off':
      'Samevoeging van rekeninge is op hierdie platform afgeskakel. Niks kan op hierdie bladsy gedoen word totdat die eienaar dit aanskakel nie.',
    'merge.foot':
      'Elke samevoeging word in die platform se rekord van veranderinge geskryf, saam met wat geskuif is.',
    'merge.closeInstead':
      'Om ’n tweede rekening te sluit in plaas daarvan om dit saam te voeg, meld by daardie rekening aan en sluit dit van daar af.',
    'merge.closeLink': 'Sluit ’n rekening',
    'merge.inHeading': '’n Ander rekening vra om by hierdie een saamgevoeg te word',
    'merge.inLede':
      'As dit jy is op ’n tweede rekening, skuif instemming daardie rekening se leerwerk, rolle en besonderhede na hierdie een en sluit daardie rekening. Dit kan nie ontdoen word nie. As dit nie jy is nie, weier. Niks gebeur totdat jy antwoord nie.',
    'merge.noName': '’n Rekening sonder naam',
    'merge.inMerged': 'Saamgevoeg. Die ander rekening is gesluit.',
    'merge.inExpired':
      'Hierdie versoek het verval voordat dit beantwoord is. Vra weer van die ander rekening af.',
    'merge.whatMoves':
      'Wat geskuif word: daardie rekening se leerrekord met sy vordering en sertifikate, sy rolle, sy kennisgewings, sy telefoonnommer en die kursusse wat dit geskep het. Wat bly: die rekord van wat daardie rekening gedoen het, soos die bestellings wat dit geplaas het.',
    'merge.whatGoes':
      'Wat uitgevee word: waar albei rekeninge ’n nota of ’n boekmerk by dieselfde les het, of dieselfde kennisgewing, word dié van hierdie rekening behou en die ander uitgevee. So ook die ander rekening se telefoonnommer, as hierdie rekening reeds een het.',
    'merge.confirmLabel': 'Tik die naam van hierdie rekening om te bevestig: {name}',
    'merge.needName':
      'Hierdie rekening het nog nie ’n naam nie. Voeg eers een by in die rekeningsinstellings: ’n samevoeging word bevestig deur dit te tik.',
    'merge.accept': 'Voeg dit by hierdie rekening saam',
    'merge.accepting': 'Voeg tans saam…',
    'merge.decline': 'Weier',
    'merge.cannotUndo':
      'Dit kan nie ontdoen word nie. Die ander rekening word gesluit en sy naam en besonderhede word verwyder. Sy aanmelding bly by die aanmelddiens totdat dit daar uitgevee word.',
    'merge.blockSame': 'Albei kante van hierdie versoek is dieselfde rekening.',
    'merge.blockAbsorbedClosed': 'Die rekening wat geskuif sou word, is gesluit.',
    'merge.blockTargetClosed': 'Die rekening waarheen dit geskuif sou word, is gesluit.',
    'merge.blockPayouts':
      'Die rekening wat geskuif sou word, het uitbetalings wat op pad is: {count}. Wag totdat hulle afgehandel is.',
    'merge.blockBilling':
      'Die rekening wat geskuif sou word, deel faktuurrekeninge met ander mense: {count}. ’n Samevoeging kan nie iemand anders se betaalreëlings skuif nie.',
    'merge.blockReviewers':
      'Albei rekeninge is op die beoordelaarsregister. Die eienaar besluit watter inskrywing bly.',
    'merge.blockHouseholds':
      'Elke rekening is ’n leerder in ’n ander gesin. ’n Samevoeging kan nie een persoon se leerwerk na ’n ander gesin skuif nie.',
    'merge.blockSameCourse':
      'Albei rekeninge het dieselfde kursus begin: {title}. Die platform kan nie kies watter vordering die ware een is nie. Voltooi die kursus op een rekening, of verlaat dit, voordat jy saamvoeg.',
    'merge.blockOwner':
      'Die rekening wat geskuif sou word, het ’n aanstelling van die eienaar op hierdie platform. Dit moet afsonderlik bekyk word voordat dit saamgevoeg kan word.',
    'merge.blockOther':
      'Hierdie samevoeging kan nie nou uitgevoer word nie, en hierdie bladsy het nie ’n sin vir die rede nie. Vra die platform se personeel voordat jy weer probeer.',
    'merge.noteJoin':
      'Die twee leerrekords word een. Wat die rekord van hierdie rekening reeds het, bly soos dit is.',
    'merge.noteMoves': 'Die leerrekord skuif in sy geheel oor, met sy vordering en sertifikate.',
    'merge.outHeading': 'Skuif hierdie rekening na ’n ander een',
    'merge.outLede':
      'As jy twee rekeninge het en hierdie is die een wat jy nie meer wil hê nie, tik die e-posadres van die rekening wat jy wil behou. Die versoek wag daar totdat iemand by daardie rekening aanmeld en instem. Só weet die platform dat jy albei beheer.',
    'merge.emailLabel': 'E-posadres van die rekening om te behou',
    'merge.emailHelp':
      'Daardie rekening moet instem voordat enigiets geskuif word. Hierdie rekening word daarna gesluit, en die sluiting kan nie ontdoen word nie.',
    'merge.ask': 'Vra om saamgevoeg te word',
    'merge.asking': 'Vra tans…',
    'merge.listHeading': 'Versoeke wat van hierdie rekening af gemaak is',
    'merge.listInto': 'Na die rekening waarvan jy die adres getik het',
    'merge.waitingUntil': 'Wag tot {date}',
    'merge.nothingMoved': 'Niks hoef geskuif te word nie.',
    'merge.withdraw': 'Trek versoek terug',
    'merge.stPending': 'Wag',
    'merge.stCompleted': 'Saamgevoeg',
    'merge.stDeclined': 'Geweier',
    'merge.stCancelled': 'Teruggetrek',
    'merge.stExpired': 'Verval',
    'merge.movedHeading': 'Wat geskuif is',
    'merge.mvLearner': 'Die leerrekord',
    'merge.mvEnrolments': 'Kursusinskrywings: {count}',
    'merge.mvCertificates': 'Sertifikate: {count}',
    'merge.mvGrants': 'Toegangsverlenings: {count}',
    'merge.mvReviews': 'Resensies: {count}',
    'merge.mvAttempts': 'Assesseringspogings: {count}',
    'merge.mvSubmissions': 'Opdragte: {count}',
    'merge.mvCohorts': 'Klasse met datums: {count}',
    'merge.mvAttendance': 'Regstreekse klasse wat bygewoon is: {count}',
    'merge.mvCases': 'Ondersteuningsake: {count}',
    'merge.mvNotifications': 'Kennisgewings: {count}',
    'merge.mvRoles': 'Rolle: {count}',
    'merge.mvNotes': 'Lesnotas: {count}',
    'merge.mvBookmarks': 'Boekmerke: {count}',
    'merge.mvGuardianships': 'Voogskakels: {count}',
    'merge.stayed':
      'Rekords wat by die geslote rekening gebly het, omdat hierdie rekening reeds dieselfde gehad het: {count}.',
    'merge.asked': 'Die versoek wag op die ander rekening. Meld daar aan om daartoe in te stem.',
    'merge.withdrawn': 'Die versoek is teruggetrek. Niks is geskuif nie.',
    'merge.merged': 'Die rekeninge is saamgevoeg. Die ander rekening is gesluit.',
    'merge.declined': 'Geweier. Albei rekeninge is soos hulle was.',
    'merge.errSignedOut':
      'Jy is afgemeld. Meld weer aan en probeer dan nog een keer. Niks is verander nie.',
    'merge.errEmail': 'Tik die e-posadres van die rekening wat jy wil behou.',
    'merge.errNoAccount': 'Geen rekening het daardie e-posadres nie. Niks is verander nie.',
    'merge.errSameAccount':
      'Dit is die adres van hierdie rekening. Tik die adres van die ander een, die rekening wat jy wil behou.',
    'merge.errPending':
      '’n Versoek van hierdie rekening af wag reeds. Trek dit terug voordat jy ’n ander rekening vra.',
    'merge.errNoRequest': 'Daardie versoek is nie meer daar nie. Niks is verander nie.',
    'merge.errNotYours':
      'Hierdie rekening kan nie daardie versoek beantwoord nie. Niks is verander nie.',
    'merge.errName':
      'Die naam wat getik is, is nie letter vir letter die naam van hierdie rekening nie. Niks is verander nie.',
    'merge.errBlocked':
      'Hierdie samevoeging kan nie nou uitgevoer word nie. Niks is geskuif nie. Herlaai hierdie bladsy om die rede langs die versoek te sien.',
    'merge.errExpired':
      'Hierdie versoek het verval voordat dit beantwoord is. Niks is geskuif nie. Vra weer van die ander rekening af.',
    'merge.errAnswered':
      'Hierdie versoek is reeds beantwoord. Niks is nou verander nie. Herlaai hierdie bladsy om te sien wat gebeur het.',
    'merge.errRefused': 'Die platform het dit nie aanvaar nie. Niks is verander nie.',
    'merge.unconfirmed':
      'Geen antwoord het teruggekom nie, dus is dit nie bekend of dit gedoen is nie. Herlaai hierdie bladsy om te sien hoe sake staan voordat jy weer probeer.',
  },
  'zh-hans': {
    'merge.title': '合并账户',
    'merge.back': '账户设置',
    'merge.heading': '合并账户',
    'merge.lede': '如果你注册了两次，可以把其中一个账户转入另一个账户，让你的课程和证书都在一处。两个账户都必须同意，被转入的账户之后会被关闭。',
    'merge.unread': '目前无法读取合并请求。没有任何更改。',
    'merge.off': '本平台已关闭账户合并。在所有者开启之前，此页面上无法进行任何操作。',
    'merge.foot': '每次合并都会连同转移的内容一起写入平台的更改记录。',
    'merge.closeInstead': '若想关闭第二个账户而不是合并它，请登录那个账户并在那里关闭。',
    'merge.closeLink': '关闭账户',
    'merge.inHeading': '另一个账户请求合并到此账户',
    'merge.inLede': '如果第二个账户也是你本人，同意后会把那个账户的学习、角色和资料转入此账户，并关闭那个账户。此操作无法撤销。如果不是你，请拒绝。在你答复之前不会发生任何事。',
    'merge.noName': '没有名称的账户',
    'merge.inMerged': '已合并。另一个账户已关闭。',
    'merge.inExpired': '此请求在得到答复之前已过期。请从另一个账户重新请求。',
    'merge.whatMoves': '会转移的内容：那个账户的学习记录及其进度和证书、角色、通知、电话号码，以及它创建的课程。会留下的内容：那个账户做过的事情的记录，例如它下过的订单。',
    'merge.whatGoes':
      '会删除的内容：如果两个账户在同一节课上都有笔记或书签，或者有相同的通知，则保留此账户的那一份，删除另一份。如果此账户已有电话号码，另一个账户的电话号码也会被删除。',
    'merge.confirmLabel': '请输入此账户的名称以确认：{name}',
    'merge.needName': '此账户还没有名称。请先在账户设置中添加名称：合并要通过输入该名称来确认。',
    'merge.accept': '合并到此账户',
    'merge.accepting': '正在合并…',
    'merge.decline': '拒绝',
    'merge.cannotUndo': '此操作无法撤销。另一个账户会被关闭，其名称和资料会被移除。它的登录信息仍保留在登录服务那里，直到在那里被删除。',
    'merge.blockSame': '此请求的双方是同一个账户。',
    'merge.blockAbsorbedClosed': '将被转移的账户已关闭。',
    'merge.blockTargetClosed': '将要转入的账户已关闭。',
    'merge.blockPayouts': '将被转移的账户有正在办理中的付款：{count}。请等待它们完成。',
    'merge.blockBilling': '将被转移的账户与其他人共用账单账户：{count}。合并不能转移别人的付款安排。',
    'merge.blockReviewers': '两个账户都在审阅者名册上。由所有者决定保留哪一条记录。',
    'merge.blockHouseholds': '两个账户分别是不同家庭中的学习者。合并不能把一个人的学习转入另一个家庭。',
    'merge.blockSameCourse': '两个账户都已开始同一门课程：{title}。平台无法选择哪一份进度才是真实的。请在合并之前，在其中一个账户上完成该课程或退出该课程。',
    'merge.blockOwner': '将被转移的账户在本平台上担任所有者指定的职务。合并之前必须单独审查。',
    'merge.blockOther': '此合并目前无法进行，而此页面没有说明原因的句子。再次尝试之前，请先询问平台的工作人员。',
    'merge.noteJoin': '两份学习记录会合成一份。此账户的记录中已有的内容保持不变。',
    'merge.noteMoves': '学习记录会连同进度和证书整份转移。',
    'merge.outHeading': '把此账户转入另一个账户',
    'merge.outLede':
      '如果你有两个账户，而这是你不再需要的那个，请输入你想保留的账户的电子邮箱地址。请求会在那里等待，直到有人登录那个账户并同意。平台正是这样知道两个账户都由你掌控。',
    'merge.emailLabel': '要保留的账户的电子邮箱地址',
    'merge.emailHelp': '在转移任何内容之前，那个账户必须同意。之后此账户会被关闭，且关闭无法撤销。',
    'merge.ask': '请求合并',
    'merge.asking': '正在请求…',
    'merge.listHeading': '从此账户发出的请求',
    'merge.listInto': '转入你输入了地址的那个账户',
    'merge.waitingUntil': '等待至 {date}',
    'merge.nothingMoved': '没有需要转移的内容。',
    'merge.withdraw': '撤回请求',
    'merge.stPending': '等待中',
    'merge.stCompleted': '已合并',
    'merge.stDeclined': '已拒绝',
    'merge.stCancelled': '已撤回',
    'merge.stExpired': '已过期',
    'merge.movedHeading': '已转移的内容',
    'merge.mvLearner': '学习记录',
    'merge.mvEnrolments': '课程报名：{count}',
    'merge.mvCertificates': '证书：{count}',
    'merge.mvGrants': '访问授权：{count}',
    'merge.mvReviews': '评价：{count}',
    'merge.mvAttempts': '测评作答次数：{count}',
    'merge.mvSubmissions': '作业：{count}',
    'merge.mvCohorts': '有日期的班级：{count}',
    'merge.mvAttendance': '已参加的直播课：{count}',
    'merge.mvCases': '支持个案：{count}',
    'merge.mvNotifications': '通知：{count}',
    'merge.mvRoles': '角色：{count}',
    'merge.mvNotes': '课堂笔记：{count}',
    'merge.mvBookmarks': '书签：{count}',
    'merge.mvGuardianships': '监护关系：{count}',
    'merge.stayed': '因为此账户已有相同内容而留在已关闭账户中的记录：{count}。',
    'merge.asked': '请求正在另一个账户上等待。请在那里登录以同意。',
    'merge.withdrawn': '请求已撤回。没有转移任何内容。',
    'merge.merged': '账户已合并。另一个账户已关闭。',
    'merge.declined': '已拒绝。两个账户都保持原样。',
    'merge.errSignedOut': '你已退出登录。请重新登录，然后再试一次。没有任何更改。',
    'merge.errEmail': '请输入你想保留的账户的电子邮箱地址。',
    'merge.errNoAccount': '没有使用该电子邮箱地址的账户。没有任何更改。',
    'merge.errSameAccount': '那是此账户自己的地址。请输入另一个账户的地址，也就是你想保留的那个账户。',
    'merge.errPending': '此账户已有一个请求在等待。请先撤回它，再向其他账户请求。',
    'merge.errNoRequest': '那个请求已不存在。没有任何更改。',
    'merge.errNotYours': '此账户无法答复那个请求。没有任何更改。',
    'merge.errName': '输入的名称与此账户的名称并非逐字相同。没有任何更改。',
    'merge.errBlocked': '此合并目前无法进行。没有转移任何内容。请重新加载此页面，在请求旁边查看原因。',
    'merge.errExpired': '此请求在得到答复之前已过期。没有转移任何内容。请从另一个账户重新请求。',
    'merge.errAnswered': '此请求之前已经得到答复。现在没有任何更改。请重新加载此页面，查看发生了什么。',
    'merge.errRefused': '平台没有接受此操作。没有任何更改。',
    'merge.unconfirmed': '没有收到答复，因此不知道此操作是否已完成。再次尝试之前，请重新加载此页面查看目前的情况。',
  },
  'zh-hant': {
    'merge.title': '合併帳號',
    'merge.back': '帳號設定',
    'merge.heading': '合併帳號',
    'merge.lede': '如果你註冊了兩次，可以把其中一個帳號轉入另一個帳號，讓你的課程和證書都在同一處。兩個帳號都必須同意，被轉入的帳號之後會被關閉。',
    'merge.unread': '目前無法讀取合併請求。沒有任何變更。',
    'merge.off': '本平台已關閉帳號合併。在擁有者開啟之前，此頁面上無法進行任何操作。',
    'merge.foot': '每次合併都會連同轉移的內容一起寫入平台的變更紀錄。',
    'merge.closeInstead': '若想關閉第二個帳號而不是合併它，請登入那個帳號並在那裡關閉。',
    'merge.closeLink': '關閉帳號',
    'merge.inHeading': '另一個帳號請求合併到此帳號',
    'merge.inLede': '如果第二個帳號也是你本人，同意後會把那個帳號的學習、角色和資料轉入此帳號，並關閉那個帳號。此操作無法復原。如果不是你，請拒絕。在你答覆之前不會發生任何事。',
    'merge.noName': '沒有名稱的帳號',
    'merge.inMerged': '已合併。另一個帳號已關閉。',
    'merge.inExpired': '此請求在得到答覆之前已過期。請從另一個帳號重新請求。',
    'merge.whatMoves': '會轉移的內容：那個帳號的學習紀錄及其進度和證書、角色、通知、電話號碼，以及它建立的課程。會留下的內容：那個帳號做過的事情的紀錄，例如它下過的訂單。',
    'merge.whatGoes':
      '會刪除的內容：如果兩個帳號在同一個單元上都有筆記或書籤，或者有相同的通知，則保留此帳號的那一份，刪除另一份。如果此帳號已有電話號碼，另一個帳號的電話號碼也會被刪除。',
    'merge.confirmLabel': '請輸入此帳號的名稱以確認：{name}',
    'merge.needName': '此帳號還沒有名稱。請先在帳號設定中新增名稱：合併要透過輸入該名稱來確認。',
    'merge.accept': '合併到此帳號',
    'merge.accepting': '正在合併…',
    'merge.decline': '拒絕',
    'merge.cannotUndo': '此操作無法復原。另一個帳號會被關閉，其名稱和資料會被移除。它的登入資訊仍保留在登入服務那裡，直到在那裡被刪除。',
    'merge.blockSame': '此請求的雙方是同一個帳號。',
    'merge.blockAbsorbedClosed': '將被轉移的帳號已關閉。',
    'merge.blockTargetClosed': '將要轉入的帳號已關閉。',
    'merge.blockPayouts': '將被轉移的帳號有正在辦理中的撥款：{count}。請等待它們完成。',
    'merge.blockBilling': '將被轉移的帳號與其他人共用帳單帳戶：{count}。合併不能轉移別人的付款安排。',
    'merge.blockReviewers': '兩個帳號都在審閱者名冊上。由擁有者決定保留哪一筆紀錄。',
    'merge.blockHouseholds': '兩個帳號分別是不同家庭中的學習者。合併不能把一個人的學習轉入另一個家庭。',
    'merge.blockSameCourse': '兩個帳號都已開始同一門課程：{title}。平台無法選擇哪一份進度才是真實的。請在合併之前，在其中一個帳號上完成該課程或退出該課程。',
    'merge.blockOwner': '將被轉移的帳號在本平台上擔任擁有者指派的職務。合併之前必須個別審查。',
    'merge.blockOther': '此合併目前無法進行，而此頁面沒有說明原因的句子。再次嘗試之前，請先詢問平台的工作人員。',
    'merge.noteJoin': '兩份學習紀錄會合成一份。此帳號的紀錄中已有的內容保持不變。',
    'merge.noteMoves': '學習紀錄會連同進度和證書整份轉移。',
    'merge.outHeading': '把此帳號轉入另一個帳號',
    'merge.outLede':
      '如果你有兩個帳號，而這是你不再需要的那個，請輸入你想保留的帳號的電子郵件地址。請求會在那裡等待，直到有人登入那個帳號並同意。平台正是這樣知道兩個帳號都由你掌控。',
    'merge.emailLabel': '要保留的帳號的電子郵件地址',
    'merge.emailHelp': '在轉移任何內容之前，那個帳號必須同意。之後此帳號會被關閉，且關閉無法復原。',
    'merge.ask': '請求合併',
    'merge.asking': '正在請求…',
    'merge.listHeading': '從此帳號發出的請求',
    'merge.listInto': '轉入你輸入了地址的那個帳號',
    'merge.waitingUntil': '等待至 {date}',
    'merge.nothingMoved': '沒有需要轉移的內容。',
    'merge.withdraw': '撤回請求',
    'merge.stPending': '等待中',
    'merge.stCompleted': '已合併',
    'merge.stDeclined': '已拒絕',
    'merge.stCancelled': '已撤回',
    'merge.stExpired': '已過期',
    'merge.movedHeading': '已轉移的內容',
    'merge.mvLearner': '學習紀錄',
    'merge.mvEnrolments': '課程報名：{count}',
    'merge.mvCertificates': '證書：{count}',
    'merge.mvGrants': '存取授權：{count}',
    'merge.mvReviews': '評價：{count}',
    'merge.mvAttempts': '測驗作答次數：{count}',
    'merge.mvSubmissions': '作業：{count}',
    'merge.mvCohorts': '有日期的班級：{count}',
    'merge.mvAttendance': '已參加的直播課：{count}',
    'merge.mvCases': '支援個案：{count}',
    'merge.mvNotifications': '通知：{count}',
    'merge.mvRoles': '角色：{count}',
    'merge.mvNotes': '單元筆記：{count}',
    'merge.mvBookmarks': '書籤：{count}',
    'merge.mvGuardianships': '監護關係：{count}',
    'merge.stayed': '因為此帳號已有相同內容而留在已關閉帳號中的紀錄：{count}。',
    'merge.asked': '請求正在另一個帳號上等待。請在那裡登入以同意。',
    'merge.withdrawn': '請求已撤回。沒有轉移任何內容。',
    'merge.merged': '帳號已合併。另一個帳號已關閉。',
    'merge.declined': '已拒絕。兩個帳號都維持原狀。',
    'merge.errSignedOut': '你已登出。請重新登入，然後再試一次。沒有任何變更。',
    'merge.errEmail': '請輸入你想保留的帳號的電子郵件地址。',
    'merge.errNoAccount': '沒有使用該電子郵件地址的帳號。沒有任何變更。',
    'merge.errSameAccount': '那是此帳號自己的地址。請輸入另一個帳號的地址，也就是你想保留的那個帳號。',
    'merge.errPending': '此帳號已有一個請求在等待。請先撤回它，再向其他帳號請求。',
    'merge.errNoRequest': '那個請求已不存在。沒有任何變更。',
    'merge.errNotYours': '此帳號無法答覆那個請求。沒有任何變更。',
    'merge.errName': '輸入的名稱與此帳號的名稱並非逐字相同。沒有任何變更。',
    'merge.errBlocked': '此合併目前無法進行。沒有轉移任何內容。請重新載入此頁面，在請求旁邊查看原因。',
    'merge.errExpired': '此請求在得到答覆之前已過期。沒有轉移任何內容。請從另一個帳號重新請求。',
    'merge.errAnswered': '此請求之前已經得到答覆。現在沒有任何變更。請重新載入此頁面，查看發生了什麼。',
    'merge.errRefused': '平台沒有接受此操作。沒有任何變更。',
    'merge.unconfirmed': '沒有收到答覆，因此不知道此操作是否已完成。再次嘗試之前，請重新載入此頁面查看目前的情況。',
  },
  vi: {
    'merge.title': 'Gộp tài khoản',
    'merge.back': 'Cài đặt tài khoản',
    'merge.heading': 'Gộp tài khoản',
    'merge.lede':
      'Nếu bạn đã đăng ký hai lần, một tài khoản có thể được chuyển vào tài khoản kia để các khóa học và chứng chỉ của bạn ở cùng một nơi. Cả hai tài khoản phải đồng ý, và tài khoản được chuyển sẽ bị đóng sau đó.',
    'merge.unread': 'Hiện chưa đọc được các yêu cầu gộp. Không có gì thay đổi.',
    'merge.off':
      'Việc gộp tài khoản đang tắt trên nền tảng này. Không thể làm gì trên trang này cho đến khi chủ sở hữu bật nó.',
    'merge.foot':
      'Mỗi lần gộp đều được ghi vào sổ ghi thay đổi của nền tảng, kèm theo những gì đã được chuyển.',
    'merge.closeInstead':
      'Để đóng tài khoản thứ hai thay vì gộp, hãy đăng nhập vào tài khoản đó và đóng nó từ đó.',
    'merge.closeLink': 'Đóng tài khoản',
    'merge.inHeading': 'Một tài khoản khác đang yêu cầu được gộp vào tài khoản này',
    'merge.inLede':
      'Nếu đó là bạn ở tài khoản thứ hai, việc đồng ý sẽ chuyển việc học, vai trò và thông tin của tài khoản đó sang tài khoản này và đóng tài khoản đó. Không thể hoàn tác. Nếu không phải bạn, hãy từ chối. Không có gì xảy ra cho đến khi bạn trả lời.',
    'merge.noName': 'Tài khoản không có tên',
    'merge.inMerged': 'Đã gộp. Tài khoản kia đã đóng.',
    'merge.inExpired':
      'Yêu cầu này đã hết hạn trước khi được trả lời. Hãy yêu cầu lại từ tài khoản kia.',
    'merge.whatMoves':
      'Những gì được chuyển: hồ sơ học tập của tài khoản đó cùng tiến độ và chứng chỉ, các vai trò, các thông báo, số điện thoại và các khóa học mà tài khoản đó đã tạo. Những gì ở lại: bản ghi về những việc tài khoản đó đã làm, chẳng hạn các đơn hàng đã đặt.',
    'merge.whatGoes':
      'Những gì bị xóa: khi cả hai tài khoản đều có ghi chú hoặc dấu trang ở cùng một bài học, hoặc cùng một thông báo, thì cái của tài khoản này được giữ và cái kia bị xóa. Số điện thoại của tài khoản kia cũng bị xóa nếu tài khoản này đã có số.',
    'merge.confirmLabel': 'Nhập tên của tài khoản này để xác nhận: {name}',
    'merge.needName':
      'Tài khoản này chưa có tên. Trước hết hãy thêm tên trong phần cài đặt tài khoản: việc gộp được xác nhận bằng cách nhập tên đó.',
    'merge.accept': 'Gộp vào tài khoản này',
    'merge.accepting': 'Đang gộp…',
    'merge.decline': 'Từ chối',
    'merge.cannotUndo':
      'Không thể hoàn tác việc này. Tài khoản kia bị đóng, tên và thông tin của nó bị gỡ bỏ. Thông tin đăng nhập của nó vẫn nằm ở dịch vụ đăng nhập cho đến khi bị xóa ở đó.',
    'merge.blockSame': 'Hai phía của yêu cầu này là cùng một tài khoản.',
    'merge.blockAbsorbedClosed': 'Tài khoản sẽ được chuyển đã bị đóng.',
    'merge.blockTargetClosed': 'Tài khoản sẽ nhận đã bị đóng.',
    'merge.blockPayouts':
      'Tài khoản sẽ được chuyển có các khoản chi trả đang trên đường: {count}. Hãy đợi cho đến khi chúng hoàn tất.',
    'merge.blockBilling':
      'Tài khoản sẽ được chuyển dùng chung tài khoản thanh toán với người khác: {count}. Việc gộp không thể chuyển các thỏa thuận thanh toán của người khác.',
    'merge.blockReviewers':
      'Cả hai tài khoản đều có trong sổ đăng ký người duyệt. Chủ sở hữu quyết định mục nào được giữ.',
    'merge.blockHouseholds':
      'Mỗi tài khoản là người học trong một gia đình khác nhau. Việc gộp không thể chuyển việc học của một người sang gia đình khác.',
    'merge.blockSameCourse':
      'Cả hai tài khoản đã bắt đầu cùng một khóa học: {title}. Nền tảng không thể chọn tiến độ nào là thật. Hãy hoàn thành khóa học ở một tài khoản, hoặc rời khóa học, trước khi gộp.',
    'merge.blockOwner':
      'Tài khoản sẽ được chuyển đang giữ một sự bổ nhiệm của chủ sở hữu trên nền tảng này. Tài khoản đó phải được xem xét riêng trước khi có thể gộp.',
    'merge.blockOther':
      'Lần gộp này chưa thể thực hiện lúc này, và trang này không có câu nào cho lý do. Hãy hỏi nhân viên của nền tảng trước khi thử lại.',
    'merge.noteJoin':
      'Hai hồ sơ học tập trở thành một. Những gì hồ sơ của tài khoản này đã có vẫn giữ nguyên.',
    'merge.noteMoves': 'Hồ sơ học tập được chuyển trọn vẹn, cùng tiến độ và chứng chỉ.',
    'merge.outHeading': 'Chuyển tài khoản này vào một tài khoản khác',
    'merge.outLede':
      'Nếu bạn có hai tài khoản và đây là tài khoản bạn không còn muốn dùng, hãy nhập địa chỉ thư điện tử của tài khoản bạn muốn giữ. Yêu cầu sẽ chờ ở đó cho đến khi có người đăng nhập vào tài khoản đó và đồng ý. Đó là cách nền tảng biết bạn kiểm soát cả hai.',
    'merge.emailLabel': 'Địa chỉ thư điện tử của tài khoản cần giữ',
    'merge.emailHelp':
      'Tài khoản đó phải đồng ý trước khi bất cứ thứ gì được chuyển. Tài khoản này sẽ bị đóng sau đó, và việc đóng không thể hoàn tác.',
    'merge.ask': 'Yêu cầu gộp',
    'merge.asking': 'Đang yêu cầu…',
    'merge.listHeading': 'Các yêu cầu được gửi từ tài khoản này',
    'merge.listInto': 'Vào tài khoản có địa chỉ bạn đã nhập',
    'merge.waitingUntil': 'Đang chờ đến {date}',
    'merge.nothingMoved': 'Không có gì cần chuyển.',
    'merge.withdraw': 'Rút yêu cầu',
    'merge.stPending': 'Đang chờ',
    'merge.stCompleted': 'Đã gộp',
    'merge.stDeclined': 'Đã từ chối',
    'merge.stCancelled': 'Đã rút',
    'merge.stExpired': 'Đã hết hạn',
    'merge.movedHeading': 'Những gì đã được chuyển',
    'merge.mvLearner': 'Hồ sơ học tập',
    'merge.mvEnrolments': 'Lượt ghi danh khóa học: {count}',
    'merge.mvCertificates': 'Chứng chỉ: {count}',
    'merge.mvGrants': 'Quyền truy cập: {count}',
    'merge.mvReviews': 'Đánh giá: {count}',
    'merge.mvAttempts': 'Lượt làm bài kiểm tra: {count}',
    'merge.mvSubmissions': 'Bài tập: {count}',
    'merge.mvCohorts': 'Lớp có ngày cụ thể: {count}',
    'merge.mvAttendance': 'Lớp trực tiếp đã tham dự: {count}',
    'merge.mvCases': 'Yêu cầu hỗ trợ: {count}',
    'merge.mvNotifications': 'Thông báo: {count}',
    'merge.mvRoles': 'Vai trò: {count}',
    'merge.mvNotes': 'Ghi chú bài học: {count}',
    'merge.mvBookmarks': 'Dấu trang: {count}',
    'merge.mvGuardianships': 'Liên kết giám hộ: {count}',
    'merge.stayed':
      'Các bản ghi ở lại với tài khoản đã đóng, vì tài khoản này đã có thứ tương tự: {count}.',
    'merge.asked': 'Yêu cầu đang chờ ở tài khoản kia. Hãy đăng nhập ở đó để đồng ý.',
    'merge.withdrawn': 'Yêu cầu đã được rút. Không có gì được chuyển.',
    'merge.merged': 'Các tài khoản đã được gộp. Tài khoản kia đã đóng.',
    'merge.declined': 'Đã từ chối. Cả hai tài khoản vẫn như cũ.',
    'merge.errSignedOut':
      'Bạn đã đăng xuất. Hãy đăng nhập lại rồi thử thêm một lần. Không có gì thay đổi.',
    'merge.errEmail': 'Nhập địa chỉ thư điện tử của tài khoản bạn muốn giữ.',
    'merge.errNoAccount':
      'Không có tài khoản nào dùng địa chỉ thư điện tử đó. Không có gì thay đổi.',
    'merge.errSameAccount':
      'Đó là địa chỉ của chính tài khoản này. Hãy nhập địa chỉ của tài khoản kia, tài khoản bạn muốn giữ.',
    'merge.errPending':
      'Một yêu cầu từ tài khoản này đang chờ sẵn. Hãy rút nó trước khi yêu cầu một tài khoản khác.',
    'merge.errNoRequest': 'Yêu cầu đó không còn nữa. Không có gì thay đổi.',
    'merge.errNotYours': 'Tài khoản này không thể trả lời yêu cầu đó. Không có gì thay đổi.',
    'merge.errName':
      'Tên đã nhập không đúng từng chữ với tên của tài khoản này. Không có gì thay đổi.',
    'merge.errBlocked':
      'Lần gộp này chưa thể thực hiện lúc này. Không có gì được chuyển. Hãy tải lại trang này để xem lý do bên cạnh yêu cầu.',
    'merge.errExpired':
      'Yêu cầu này đã hết hạn trước khi được trả lời. Không có gì được chuyển. Hãy yêu cầu lại từ tài khoản kia.',
    'merge.errAnswered':
      'Yêu cầu này đã được trả lời từ trước. Lúc này không có gì thay đổi. Hãy tải lại trang này để xem điều gì đã xảy ra.',
    'merge.errRefused': 'Nền tảng không chấp nhận việc này. Không có gì thay đổi.',
    'merge.unconfirmed':
      'Không có câu trả lời nào quay về, nên không biết việc này đã được thực hiện hay chưa. Hãy tải lại trang này để xem tình hình trước khi thử lại.',
  },
  th: {
    'merge.title': 'การรวมบัญชี',
    'merge.back': 'การตั้งค่าบัญชี',
    'merge.heading': 'การรวมบัญชี',
    'merge.lede':
      'หากคุณสมัครไว้สองครั้ง สามารถย้ายบัญชีหนึ่งเข้าไปรวมกับอีกบัญชีหนึ่งได้ เพื่อให้หลักสูตรและประกาศนียบัตรของคุณอยู่ในที่เดียวกัน ทั้งสองบัญชีต้องเห็นชอบ และบัญชีที่ถูกย้ายจะถูกปิดหลังจากนั้น',
    'merge.unread': 'ขณะนี้อ่านคำขอรวมบัญชีไม่ได้ ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
    'merge.off': 'การรวมบัญชีปิดอยู่บนแพลตฟอร์มนี้ ทำสิ่งใดในหน้านี้ไม่ได้จนกว่าเจ้าของจะเปิดใช้',
    'merge.foot':
      'การรวมแต่ละครั้งจะถูกเขียนลงในบันทึกการเปลี่ยนแปลงของแพลตฟอร์ม พร้อมกับสิ่งที่ถูกย้าย',
    'merge.closeInstead':
      'หากต้องการปิดบัญชีที่สองแทนการรวม ให้เข้าสู่ระบบด้วยบัญชีนั้นแล้วปิดจากที่นั่น',
    'merge.closeLink': 'การปิดบัญชี',
    'merge.inHeading': 'มีอีกบัญชีหนึ่งขอรวมเข้ากับบัญชีนี้',
    'merge.inLede':
      'หากบัญชีที่สองนั้นเป็นคุณเอง การเห็นชอบจะย้ายการเรียน บทบาท และรายละเอียดของบัญชีนั้นมาไว้ในบัญชีนี้และปิดบัญชีนั้น ไม่สามารถย้อนกลับได้ หากไม่ใช่คุณ ให้ปฏิเสธ จะไม่มีอะไรเกิดขึ้นจนกว่าคุณจะตอบ',
    'merge.noName': 'บัญชีที่ไม่มีชื่อ',
    'merge.inMerged': 'รวมแล้ว อีกบัญชีหนึ่งถูกปิดแล้ว',
    'merge.inExpired': 'คำขอนี้หมดเวลาก่อนจะได้รับคำตอบ โปรดขออีกครั้งจากอีกบัญชีหนึ่ง',
    'merge.whatMoves':
      'สิ่งที่ถูกย้าย ได้แก่ บันทึกการเรียนของบัญชีนั้นพร้อมความคืบหน้าและประกาศนียบัตร บทบาท การแจ้งเตือน หมายเลขโทรศัพท์ และหลักสูตรที่บัญชีนั้นสร้าง สิ่งที่คงอยู่ ได้แก่ บันทึกของสิ่งที่บัญชีนั้นเคยทำ เช่น คำสั่งซื้อที่เคยสั่ง',
    'merge.whatGoes':
      'สิ่งที่ถูกลบ ได้แก่ กรณีที่ทั้งสองบัญชีมีบันทึกย่อหรือบุ๊กมาร์กในบทเรียนเดียวกัน หรือมีการแจ้งเตือนเดียวกัน ของบัญชีนี้จะถูกเก็บไว้และของอีกบัญชีจะถูกลบ หมายเลขโทรศัพท์ของอีกบัญชีก็ถูกลบด้วย หากบัญชีนี้มีหมายเลขอยู่แล้ว',
    'merge.confirmLabel': 'พิมพ์ชื่อของบัญชีนี้เพื่อยืนยัน: {name}',
    'merge.needName':
      'บัญชีนี้ยังไม่มีชื่อ โปรดเพิ่มชื่อในการตั้งค่าบัญชีก่อน การรวมบัญชียืนยันด้วยการพิมพ์ชื่อนั้น',
    'merge.accept': 'รวมเข้ากับบัญชีนี้',
    'merge.accepting': 'กำลังรวม…',
    'merge.decline': 'ปฏิเสธ',
    'merge.cannotUndo':
      'ไม่สามารถย้อนกลับได้ อีกบัญชีหนึ่งจะถูกปิด และชื่อกับรายละเอียดของบัญชีนั้นจะถูกนำออก ข้อมูลการเข้าสู่ระบบของบัญชีนั้นยังอยู่กับบริการเข้าสู่ระบบจนกว่าจะถูกลบที่นั่น',
    'merge.blockSame': 'ทั้งสองฝ่ายของคำขอนี้คือบัญชีเดียวกัน',
    'merge.blockAbsorbedClosed': 'บัญชีที่จะถูกย้ายถูกปิดแล้ว',
    'merge.blockTargetClosed': 'บัญชีปลายทางที่จะย้ายเข้าไปถูกปิดแล้ว',
    'merge.blockPayouts':
      'บัญชีที่จะถูกย้ายมีการจ่ายเงินที่อยู่ระหว่างดำเนินการ: {count} โปรดรอจนกว่าจะเสร็จสิ้น',
    'merge.blockBilling':
      'บัญชีที่จะถูกย้ายใช้บัญชีเรียกเก็บเงินร่วมกับผู้อื่น: {count} การรวมบัญชีไม่สามารถย้ายข้อตกลงการชำระเงินของผู้อื่นได้',
    'merge.blockReviewers':
      'ทั้งสองบัญชีอยู่ในทะเบียนผู้ตรวจทาน เจ้าของเป็นผู้ตัดสินว่ารายการใดจะคงอยู่',
    'merge.blockHouseholds':
      'แต่ละบัญชีเป็นผู้เรียนในครอบครัวที่ต่างกัน การรวมบัญชีไม่สามารถย้ายการเรียนของคนหนึ่งไปไว้ในอีกครอบครัวหนึ่งได้',
    'merge.blockSameCourse':
      'ทั้งสองบัญชีเริ่มเรียนหลักสูตรเดียวกันแล้ว: {title} แพลตฟอร์มไม่สามารถเลือกได้ว่าความคืบหน้าใดเป็นของจริง โปรดเรียนหลักสูตรนั้นให้จบในบัญชีหนึ่ง หรือออกจากหลักสูตร ก่อนจะรวมบัญชี',
    'merge.blockOwner':
      'บัญชีที่จะถูกย้ายมีตำแหน่งที่เจ้าของแต่งตั้งไว้บนแพลตฟอร์มนี้ ต้องได้รับการพิจารณาเป็นรายกรณีก่อนจึงจะรวมได้',
    'merge.blockOther':
      'ขณะนี้ยังรวมบัญชีนี้ไม่ได้ และหน้านี้ไม่มีประโยคสำหรับบอกเหตุผล โปรดถามเจ้าหน้าที่ของแพลตฟอร์มก่อนลองอีกครั้ง',
    'merge.noteJoin':
      'บันทึกการเรียนทั้งสองจะกลายเป็นหนึ่งเดียว สิ่งที่บันทึกของบัญชีนี้มีอยู่แล้วจะคงอยู่ตามเดิม',
    'merge.noteMoves': 'บันทึกการเรียนจะถูกย้ายมาทั้งหมด พร้อมความคืบหน้าและประกาศนียบัตร',
    'merge.outHeading': 'ย้ายบัญชีนี้ไปรวมกับอีกบัญชีหนึ่ง',
    'merge.outLede':
      'หากคุณมีสองบัญชีและบัญชีนี้คือบัญชีที่คุณไม่ต้องการแล้ว ให้พิมพ์ที่อยู่อีเมลของบัญชีที่คุณต้องการเก็บไว้ คำขอจะรออยู่ที่นั่นจนกว่าจะมีคนเข้าสู่ระบบด้วยบัญชีนั้นและเห็นชอบ นี่คือวิธีที่แพลตฟอร์มรู้ว่าคุณควบคุมทั้งสองบัญชี',
    'merge.emailLabel': 'ที่อยู่อีเมลของบัญชีที่จะเก็บไว้',
    'merge.emailHelp':
      'บัญชีนั้นต้องเห็นชอบก่อนจึงจะมีการย้ายสิ่งใด หลังจากนั้นบัญชีนี้จะถูกปิด และการปิดนั้นไม่สามารถย้อนกลับได้',
    'merge.ask': 'ขอรวมบัญชี',
    'merge.asking': 'กำลังขอ…',
    'merge.listHeading': 'คำขอที่ส่งจากบัญชีนี้',
    'merge.listInto': 'ไปยังบัญชีที่คุณพิมพ์ที่อยู่ไว้',
    'merge.waitingUntil': 'รออยู่จนถึง {date}',
    'merge.nothingMoved': 'ไม่มีสิ่งใดต้องย้าย',
    'merge.withdraw': 'ถอนคำขอ',
    'merge.stPending': 'รออยู่',
    'merge.stCompleted': 'รวมแล้ว',
    'merge.stDeclined': 'ถูกปฏิเสธ',
    'merge.stCancelled': 'ถอนแล้ว',
    'merge.stExpired': 'หมดเวลา',
    'merge.movedHeading': 'สิ่งที่ถูกย้าย',
    'merge.mvLearner': 'บันทึกการเรียน',
    'merge.mvEnrolments': 'การลงทะเบียนเรียนหลักสูตร: {count}',
    'merge.mvCertificates': 'ประกาศนียบัตร: {count}',
    'merge.mvGrants': 'สิทธิ์การเข้าถึง: {count}',
    'merge.mvReviews': 'รีวิว: {count}',
    'merge.mvAttempts': 'การทำแบบประเมิน: {count}',
    'merge.mvSubmissions': 'งานที่มอบหมาย: {count}',
    'merge.mvCohorts': 'ชั้นเรียนที่มีกำหนดวัน: {count}',
    'merge.mvAttendance': 'ชั้นเรียนสดที่เข้าร่วม: {count}',
    'merge.mvCases': 'เรื่องที่ขอความช่วยเหลือ: {count}',
    'merge.mvNotifications': 'การแจ้งเตือน: {count}',
    'merge.mvRoles': 'บทบาท: {count}',
    'merge.mvNotes': 'บันทึกย่อของบทเรียน: {count}',
    'merge.mvBookmarks': 'บุ๊กมาร์ก: {count}',
    'merge.mvGuardianships': 'ความเชื่อมโยงกับผู้ปกครอง: {count}',
    'merge.stayed':
      'รายการที่ยังอยู่กับบัญชีที่ถูกปิด เพราะบัญชีนี้มีสิ่งเดียวกันอยู่แล้ว: {count}',
    'merge.asked': 'คำขอกำลังรออยู่ที่อีกบัญชีหนึ่ง โปรดเข้าสู่ระบบที่นั่นเพื่อเห็นชอบ',
    'merge.withdrawn': 'ถอนคำขอแล้ว ไม่มีสิ่งใดถูกย้าย',
    'merge.merged': 'รวมบัญชีแล้ว อีกบัญชีหนึ่งถูกปิดแล้ว',
    'merge.declined': 'ปฏิเสธแล้ว ทั้งสองบัญชียังเป็นเหมือนเดิม',
    'merge.errSignedOut':
      'คุณออกจากระบบแล้ว โปรดเข้าสู่ระบบอีกครั้ง แล้วลองอีกหนึ่งครั้ง ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
    'merge.errEmail': 'พิมพ์ที่อยู่อีเมลของบัญชีที่คุณต้องการเก็บไว้',
    'merge.errNoAccount': 'ไม่มีบัญชีที่ใช้ที่อยู่อีเมลนั้น ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
    'merge.errSameAccount':
      'นั่นคือที่อยู่ของบัญชีนี้เอง โปรดพิมพ์ที่อยู่ของอีกบัญชีหนึ่ง ซึ่งเป็นบัญชีที่คุณต้องการเก็บไว้',
    'merge.errPending': 'มีคำขอจากบัญชีนี้รออยู่แล้ว โปรดถอนคำขอนั้นก่อนจะขอกับบัญชีอื่น',
    'merge.errNoRequest': 'คำขอนั้นไม่มีอยู่แล้ว ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
    'merge.errNotYours': 'บัญชีนี้ตอบคำขอนั้นไม่ได้ ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
    'merge.errName': 'ชื่อที่พิมพ์ไม่ตรงกับชื่อของบัญชีนี้ทุกตัวอักษร ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
    'merge.errBlocked':
      'ขณะนี้ยังรวมบัญชีนี้ไม่ได้ ไม่มีสิ่งใดถูกย้าย โปรดโหลดหน้านี้ใหม่เพื่อดูเหตุผลข้างคำขอ',
    'merge.errExpired':
      'คำขอนี้หมดเวลาก่อนจะได้รับคำตอบ ไม่มีสิ่งใดถูกย้าย โปรดขออีกครั้งจากอีกบัญชีหนึ่ง',
    'merge.errAnswered':
      'คำขอนี้ได้รับคำตอบไปแล้วก่อนหน้านี้ ตอนนี้ไม่มีสิ่งใดถูกเปลี่ยนแปลง โปรดโหลดหน้านี้ใหม่เพื่อดูว่าเกิดอะไรขึ้น',
    'merge.errRefused': 'แพลตฟอร์มไม่รับสิ่งนี้ ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
    'merge.unconfirmed':
      'ไม่มีคำตอบกลับมา จึงไม่ทราบว่าได้ทำสิ่งนี้แล้วหรือไม่ โปรดโหลดหน้านี้ใหม่เพื่อดูสถานะก่อนลองอีกครั้ง',
  },
  fil: {
    'merge.title': 'Pagsasama ng mga account',
    'merge.back': 'Mga setting ng akawnt',
    'merge.heading': 'Pagsasama ng mga account',
    'merge.lede':
      'Kung dalawang beses kang nagparehistro, maaaring ilipat ang isang account sa isa pa para nasa iisang lugar ang iyong mga kurso at sertipiko. Kailangang pumayag ang dalawang account, at isinasara pagkatapos ang account na inilipat.',
    'merge.unread': 'Hindi mabasa ngayon ang mga hiling sa pagsasama. Walang binago.',
    'merge.off':
      'Nakapatay ang pagsasama ng mga account sa platapormang ito. Walang magagawa sa pahinang ito hangga’t hindi ito binubuksan ng may-ari.',
    'merge.foot':
      'Isinusulat ang bawat pagsasama sa talaan ng mga pagbabago ng plataporma, kasama ang nailipat.',
    'merge.closeInstead':
      'Para isara ang ikalawang account sa halip na isama ito, mag-sign in sa account na iyon at isara ito mula roon.',
    'merge.closeLink': 'Pagsasara ng account',
    'merge.inHeading': 'May ibang account na humihiling na isama sa account na ito',
    'merge.inLede':
      'Kung ikaw ito sa ikalawang account, ang pagpayag ay naglilipat ng pag-aaral, mga tungkulin at detalye ng account na iyon papunta rito at isinasara ang account na iyon. Hindi na ito mababawi. Kung hindi ikaw, tanggihan. Walang mangyayari hangga’t hindi ka sumasagot.',
    'merge.noName': 'Account na walang pangalan',
    'merge.inMerged': 'Naisama na. Sarado na ang kabilang account.',
    'merge.inExpired':
      'Lumipas ang hiling na ito bago nasagot. Humiling muli mula sa kabilang account.',
    'merge.whatMoves':
      'Ang inililipat: ang talaan ng pag-aaral ng account na iyon kasama ang pag-usad at mga sertipiko nito, ang mga tungkulin nito, ang mga abiso nito, ang numero ng telepono nito at ang mga kursong ginawa nito. Ang naiiwan: ang talaan ng mga ginawa ng account na iyon, gaya ng mga order na inilagay nito.',
    'merge.whatGoes':
      'Ang binubura: kapag parehong may tala o bookmark ang dalawang account sa iisang aralin, o iisang abiso, pinananatili ang nasa account na ito at binubura ang isa pa. Binubura rin ang numero ng telepono ng kabilang account kung may numero na ang account na ito.',
    'merge.confirmLabel': 'I-type ang pangalan ng account na ito para kumpirmahin: {name}',
    'merge.needName':
      'Wala pang pangalan ang account na ito. Magdagdag muna ng pangalan sa mga setting ng akawnt: kinukumpirma ang pagsasama sa pag-type nito.',
    'merge.accept': 'Isama sa account na ito',
    'merge.accepting': 'Isinasama…',
    'merge.decline': 'Tanggihan',
    'merge.cannotUndo':
      'Hindi na ito mababawi. Isinasara ang kabilang account at inaalis ang pangalan at mga detalye nito. Nananatili ang sign-in nito sa serbisyo ng pag-sign in hanggang burahin iyon doon.',
    'merge.blockSame': 'Iisang account ang dalawang panig ng hiling na ito.',
    'merge.blockAbsorbedClosed': 'Sarado ang account na ililipat sana.',
    'merge.blockTargetClosed': 'Sarado ang account na paglilipatan sana.',
    'merge.blockPayouts':
      'May mga payout na nasa daan ang account na ililipat sana: {count}. Hintaying matapos ang mga iyon.',
    'merge.blockBilling':
      'Ang account na ililipat sana ay may kahating ibang tao sa mga billing account: {count}. Hindi maililipat ng pagsasama ang kaayusan sa pagbabayad ng ibang tao.',
    'merge.blockReviewers':
      'Parehong nasa talaan ng mga tagasuri ang dalawang account. Ang may-ari ang nagpapasya kung aling entry ang mananatili.',
    'merge.blockHouseholds':
      'Mag-aaral sa magkaibang pamilya ang bawat account. Hindi maililipat ng pagsasama ang pag-aaral ng isang tao sa ibang pamilya.',
    'merge.blockSameCourse':
      'Parehong nasimulan ng dalawang account ang iisang kurso: {title}. Hindi makakapili ang plataporma kung aling pag-usad ang totoo. Tapusin ang kurso sa isang account, o iwan ito, bago magsama.',
    'merge.blockOwner':
      'May hawak na pagtatalaga mula sa may-ari sa platapormang ito ang account na ililipat sana. Kailangan itong suriin nang hiwalay bago maisama.',
    'merge.blockOther':
      'Hindi maisasagawa ngayon ang pagsasamang ito, at walang pangungusap ang pahinang ito para sa dahilan. Magtanong sa mga kawani ng plataporma bago sumubok muli.',
    'merge.noteJoin':
      'Nagiging isa ang dalawang talaan ng pag-aaral. Nananatili kung ano na ang mayroon sa talaan ng account na ito.',
    'merge.noteMoves':
      'Inililipat nang buo ang talaan ng pag-aaral, kasama ang pag-usad at mga sertipiko nito.',
    'merge.outHeading': 'Ilipat ang account na ito sa iba',
    'merge.outLede':
      'Kung may dalawa kang account at ito ang ayaw mo na, i-type ang email address ng account na gusto mong panatilihin. Maghihintay roon ang hiling hanggang may mag-sign in sa account na iyon at pumayag. Sa ganoong paraan nalalaman ng plataporma na hawak mo ang dalawa.',
    'merge.emailLabel': 'Email address ng account na pananatilihin',
    'merge.emailHelp':
      'Kailangang pumayag ang account na iyon bago may mailipat. Isinasara pagkatapos ang account na ito, at hindi na mababawi ang pagsasara nito.',
    'merge.ask': 'Humiling na maisama',
    'merge.asking': 'Humihiling…',
    'merge.listHeading': 'Mga hiling na ginawa mula sa account na ito',
    'merge.listInto': 'Papunta sa account na ang address ay na-type mo',
    'merge.waitingUntil': 'Naghihintay hanggang {date}',
    'merge.nothingMoved': 'Walang kinailangang ilipat.',
    'merge.withdraw': 'Bawiin ang hiling',
    'merge.stPending': 'Naghihintay',
    'merge.stCompleted': 'Naisama na',
    'merge.stDeclined': 'Tinanggihan',
    'merge.stCancelled': 'Binawi',
    'merge.stExpired': 'Lumipas na',
    'merge.movedHeading': 'Ang nailipat',
    'merge.mvLearner': 'Ang talaan ng pag-aaral',
    'merge.mvEnrolments': 'Mga pagpapatala sa kurso: {count}',
    'merge.mvCertificates': 'Mga sertipiko: {count}',
    'merge.mvGrants': 'Mga pahintulot sa pag-access: {count}',
    'merge.mvReviews': 'Mga review: {count}',
    'merge.mvAttempts': 'Mga pagsubok sa pagtatasa: {count}',
    'merge.mvSubmissions': 'Mga takdang-aralin: {count}',
    'merge.mvCohorts': 'Mga klaseng may petsa: {count}',
    'merge.mvAttendance': 'Mga live na klaseng nadaluhan: {count}',
    'merge.mvCases': 'Mga kaso ng suporta: {count}',
    'merge.mvNotifications': 'Mga abiso: {count}',
    'merge.mvRoles': 'Mga tungkulin: {count}',
    'merge.mvNotes': 'Mga tala sa aralin: {count}',
    'merge.mvBookmarks': 'Mga bookmark: {count}',
    'merge.mvGuardianships': 'Mga ugnayan ng tagapag-alaga: {count}',
    'merge.stayed':
      'Mga talaang naiwan sa isinarang account, dahil mayroon na ring ganoon ang account na ito: {count}.',
    'merge.asked':
      'Naghihintay ang hiling sa kabilang account. Mag-sign in doon para pumayag dito.',
    'merge.withdrawn': 'Binawi na ang hiling. Walang nailipat.',
    'merge.merged': 'Naisama na ang mga account. Sarado na ang kabilang account.',
    'merge.declined': 'Tinanggihan. Ganoon pa rin ang dalawang account gaya ng dati.',
    'merge.errSignedOut':
      'Naka-sign out ka na. Mag-sign in muli, pagkatapos ay subukan nang isa pang beses. Walang binago.',
    'merge.errEmail': 'I-type ang email address ng account na gusto mong panatilihin.',
    'merge.errNoAccount': 'Walang account na may ganoong email address. Walang binago.',
    'merge.errSameAccount':
      'Iyan ang address ng account na ito. I-type ang address ng isa pa, ang account na gusto mong panatilihin.',
    'merge.errPending':
      'May naghihintay nang hiling mula sa account na ito. Bawiin muna iyon bago humiling sa ibang account.',
    'merge.errNoRequest': 'Wala na ang hiling na iyon. Walang binago.',
    'merge.errNotYours': 'Hindi masasagot ng account na ito ang hiling na iyon. Walang binago.',
    'merge.errName':
      'Ang pangalang na-type ay hindi ang pangalan ng account na ito, titik por titik. Walang binago.',
    'merge.errBlocked':
      'Hindi maisasagawa ngayon ang pagsasamang ito. Walang nailipat. I-reload ang pahinang ito para makita ang dahilan sa tabi ng hiling.',
    'merge.errExpired':
      'Lumipas ang hiling na ito bago nasagot. Walang nailipat. Humiling muli mula sa kabilang account.',
    'merge.errAnswered':
      'Nasagot na dati ang hiling na ito. Walang binago ngayon. I-reload ang pahinang ito para makita kung ano ang nangyari.',
    'merge.errRefused': 'Hindi ito tinanggap ng plataporma. Walang binago.',
    'merge.unconfirmed':
      'Walang bumalik na sagot, kaya hindi alam kung nagawa ito. I-reload ang pahinang ito para makita ang kalagayan bago sumubok muli.',
  },
  uz: {
    'merge.title': 'Hisoblarni birlashtirish',
    'merge.back': 'Hisob sozlamalari',
    'merge.heading': 'Hisoblarni birlashtirish',
    'merge.lede':
      'Agar ikki marta roʻyxatdan oʻtgan boʻlsangiz, kurslaringiz va sertifikatlaringiz bir joyda boʻlishi uchun bir hisobni ikkinchisiga koʻchirish mumkin. Ikkala hisob ham rozi boʻlishi kerak, koʻchirilgan hisob esa keyin yopiladi.',
    'merge.unread': 'Birlashtirish soʻrovlarini hozir oʻqib boʻlmadi. Hech narsa oʻzgarmadi.',
    'merge.off':
      'Bu platformada hisoblarni birlashtirish oʻchirilgan. Egasi uni yoqmaguncha bu sahifada hech narsa qilib boʻlmaydi.',
    'merge.foot':
      'Har bir birlashtirish nima koʻchirilgani bilan birga platformaning oʻzgarishlar qaydiga yoziladi.',
    'merge.closeInstead':
      'Ikkinchi hisobni birlashtirish oʻrniga yopish uchun oʻsha hisobga kiring va uni oʻsha yerdan yoping.',
    'merge.closeLink': 'Hisobni yopish',
    'merge.inHeading': 'Boshqa bir hisob shu hisobga birlashtirilishini soʻramoqda',
    'merge.inLede':
      'Agar ikkinchi hisobdagi ham siz boʻlsangiz, rozilik oʻsha hisobning oʻqishi, rollari va maʼlumotlarini shu hisobga koʻchiradi va oʻsha hisobni yopadi. Buni ortga qaytarib boʻlmaydi. Agar bu siz boʻlmasangiz, rad eting. Siz javob bermaguningizcha hech narsa boʻlmaydi.',
    'merge.noName': 'Nomsiz hisob',
    'merge.inMerged': 'Birlashtirildi. Boshqa hisob yopilgan.',
    'merge.inExpired':
      'Bu soʻrovning muddati javob berilishidan oldin tugadi. Boshqa hisobdan qayta soʻrang.',
    'merge.whatMoves':
      'Nima koʻchiriladi: oʻsha hisobning oʻqish qaydi, uning oʻzlashtirishi va sertifikatlari bilan, rollari, bildirishnomalari, telefon raqami va u yaratgan kurslar. Nima qoladi: oʻsha hisob qilgan ishlarning qaydi, masalan, u bergan buyurtmalar.',
    'merge.whatGoes':
      'Nima oʻchiriladi: ikkala hisobda ham bitta darsga qayd yoki xatchoʻp boʻlsa yoki bir xil bildirishnoma boʻlsa, shu hisobdagisi saqlanadi, boshqasi oʻchiriladi. Shu hisobning oʻz telefon raqami boʻlsa, boshqa hisobning telefon raqami ham oʻchiriladi.',
    'merge.confirmLabel': 'Tasdiqlash uchun shu hisobning nomini yozing: {name}',
    'merge.needName':
      'Bu hisobning hali nomi yoʻq. Avval hisob sozlamalarida nom qoʻshing: birlashtirish uni yozish orqali tasdiqlanadi.',
    'merge.accept': 'Shu hisobga birlashtirish',
    'merge.accepting': 'Birlashtirilmoqda…',
    'merge.decline': 'Rad etish',
    'merge.cannotUndo':
      'Buni ortga qaytarib boʻlmaydi. Boshqa hisob yopiladi, uning nomi va maʼlumotlari olib tashlanadi. Uning kirish maʼlumoti kirish xizmatida oʻsha yerda oʻchirilmaguncha qoladi.',
    'merge.blockSame': 'Bu soʻrovning ikkala tomoni ham bitta hisob.',
    'merge.blockAbsorbedClosed': 'Koʻchirilishi kerak boʻlgan hisob yopilgan.',
    'merge.blockTargetClosed': 'U koʻchirilishi kerak boʻlgan hisob yopilgan.',
    'merge.blockPayouts':
      'Koʻchirilishi kerak boʻlgan hisobning yoʻldagi toʻlovlari bor: {count}. Ular tugaguncha kuting.',
    'merge.blockBilling':
      'Koʻchirilishi kerak boʻlgan hisob toʻlov hisoblarini boshqa odamlar bilan boʻlishadi: {count}. Birlashtirish boshqa odamning toʻlov tartibini koʻchira olmaydi.',
    'merge.blockReviewers':
      'Ikkala hisob ham taqrizchilar roʻyxatida. Qaysi yozuv qolishini platforma egasi hal qiladi.',
    'merge.blockHouseholds':
      'Har bir hisob boshqa-boshqa oilada oʻquvchi. Birlashtirish bir kishining oʻqishini boshqa oilaga koʻchira olmaydi.',
    'merge.blockSameCourse':
      'Ikkala hisob ham bitta kursni boshlagan: {title}. Platforma qaysi oʻzlashtirish haqiqiy ekanini tanlay olmaydi. Birlashtirishdan oldin kursni hisoblardan birida tugating yoki uni tark eting.',
    'merge.blockOwner':
      'Koʻchirilishi kerak boʻlgan hisobda bu platformada egasi bergan tayinlov bor. Birlashtirishdan oldin u alohida koʻrib chiqilishi kerak.',
    'merge.blockOther':
      'Bu birlashtirishni hozir bajarib boʻlmaydi va bu sahifada sababi uchun gap yoʻq. Qayta urinishdan oldin platforma xodimlaridan soʻrang.',
    'merge.noteJoin':
      'Ikki oʻqish qaydi bitta boʻladi. Shu hisobning qaydida allaqachon bor narsa oʻz holicha qoladi.',
    'merge.noteMoves': 'Oʻqish qaydi oʻzlashtirishi va sertifikatlari bilan toʻliq koʻchiriladi.',
    'merge.outHeading': 'Bu hisobni boshqasiga koʻchirish',
    'merge.outLede':
      'Agar ikkita hisobingiz boʻlsa va bu endi kerak boʻlmagani boʻlsa, saqlab qolmoqchi boʻlgan hisobingizning elektron pochta manzilini yozing. Kimdir oʻsha hisobga kirib rozi boʻlmaguncha soʻrov oʻsha yerda kutadi. Platforma ikkalasi ham sizning ixtiyoringizda ekanini shundan biladi.',
    'merge.emailLabel': 'Saqlanadigan hisobning elektron pochta manzili',
    'merge.emailHelp':
      'Biror narsa koʻchirilishidan oldin oʻsha hisob rozi boʻlishi kerak. Shundan keyin bu hisob yopiladi va uni yopishni ortga qaytarib boʻlmaydi.',
    'merge.ask': 'Birlashtirishni soʻrash',
    'merge.asking': 'Soʻralmoqda…',
    'merge.listHeading': 'Shu hisobdan qilingan soʻrovlar',
    'merge.listInto': 'Manzilini yozgan hisobingizga',
    'merge.waitingUntil': '{date} gacha kutmoqda',
    'merge.nothingMoved': 'Koʻchiriladigan narsa yoʻq edi.',
    'merge.withdraw': 'Soʻrovni qaytarib olish',
    'merge.stPending': 'Kutmoqda',
    'merge.stCompleted': 'Birlashtirildi',
    'merge.stDeclined': 'Rad etildi',
    'merge.stCancelled': 'Qaytarib olindi',
    'merge.stExpired': 'Muddati tugadi',
    'merge.movedHeading': 'Nima koʻchirildi',
    'merge.mvLearner': 'Oʻqish qaydi',
    'merge.mvEnrolments': 'Kurslarga yozilishlar: {count}',
    'merge.mvCertificates': 'Sertifikatlar: {count}',
    'merge.mvGrants': 'Kirish ruxsatlari: {count}',
    'merge.mvReviews': 'Sharhlar: {count}',
    'merge.mvAttempts': 'Baholash urinishlari: {count}',
    'merge.mvSubmissions': 'Topshiriqlar: {count}',
    'merge.mvCohorts': 'Sanasi belgilangan sinflar: {count}',
    'merge.mvAttendance': 'Qatnashilgan jonli darslar: {count}',
    'merge.mvCases': 'Yordam murojaatlari: {count}',
    'merge.mvNotifications': 'Bildirishnomalar: {count}',
    'merge.mvRoles': 'Rollar: {count}',
    'merge.mvNotes': 'Dars qaydlari: {count}',
    'merge.mvBookmarks': 'Xatchoʻplar: {count}',
    'merge.mvGuardianships': 'Vasiylik aloqalari: {count}',
    'merge.stayed':
      'Shu hisobda xuddi shu narsa allaqachon boʻlgani uchun yopilgan hisobda qolgan yozuvlar: {count}.',
    'merge.asked': 'Soʻrov boshqa hisobda kutmoqda. Unga rozi boʻlish uchun oʻsha yerda kiring.',
    'merge.withdrawn': 'Soʻrov qaytarib olindi. Hech narsa koʻchirilmadi.',
    'merge.merged': 'Hisoblar birlashtirildi. Boshqa hisob yopilgan.',
    'merge.declined': 'Rad etildi. Ikkala hisob ham avvalgidek.',
    'merge.errSignedOut':
      'Siz hisobdan chiqqansiz. Qayta kiring, soʻng yana bir marta urinib koʻring. Hech narsa oʻzgarmadi.',
    'merge.errEmail': 'Saqlab qolmoqchi boʻlgan hisobingizning elektron pochta manzilini yozing.',
    'merge.errNoAccount': 'Bunday elektron pochta manzilli hisob yoʻq. Hech narsa oʻzgarmadi.',
    'merge.errSameAccount':
      'Bu shu hisobning oʻz manzili. Boshqasining, yaʼni saqlab qolmoqchi boʻlgan hisobingizning manzilini yozing.',
    'merge.errPending':
      'Shu hisobdan bitta soʻrov allaqachon kutmoqda. Boshqa hisobdan soʻrashdan oldin uni qaytarib oling.',
    'merge.errNoRequest': 'Oʻsha soʻrov endi yoʻq. Hech narsa oʻzgarmadi.',
    'merge.errNotYours': 'Bu hisob oʻsha soʻrovga javob bera olmaydi. Hech narsa oʻzgarmadi.',
    'merge.errName': 'Yozilgan nom harfma-harf shu hisobning nomi emas. Hech narsa oʻzgarmadi.',
    'merge.errBlocked':
      'Bu birlashtirishni hozir bajarib boʻlmaydi. Hech narsa koʻchirilmadi. Sababini soʻrov yonida koʻrish uchun bu sahifani qayta yuklang.',
    'merge.errExpired':
      'Bu soʻrovning muddati javob berilishidan oldin tugadi. Hech narsa koʻchirilmadi. Boshqa hisobdan qayta soʻrang.',
    'merge.errAnswered':
      'Bu soʻrovga allaqachon javob berilgan edi. Hozir hech narsa oʻzgarmadi. Nima boʻlganini koʻrish uchun bu sahifani qayta yuklang.',
    'merge.errRefused': 'Platforma buni qabul qilmadi. Hech narsa oʻzgarmadi.',
    'merge.unconfirmed':
      'Hech qanday javob qaytmadi, shuning uchun bu bajarilgan-bajarilmagani nomaʼlum. Qayta urinishdan oldin ahvolni koʻrish uchun bu sahifani qayta yuklang.',
  },
  kk: {
    'merge.title': 'Тіркелгілерді біріктіру',
    'merge.back': 'Аккаунт параметрлері',
    'merge.heading': 'Тіркелгілерді біріктіру',
    'merge.lede':
      'Егер екі рет тіркелген болсаңыз, курстарыңыз бен сертификаттарыңыз бір жерде болуы үшін бір тіркелгіні екіншісіне көшіруге болады. Екі тіркелгі де келісуі керек, ал көшірілген тіркелгі кейін жабылады.',
    'merge.unread': 'Біріктіру сұраулары дәл қазір оқылмады. Ештеңе өзгерген жоқ.',
    'merge.off':
      'Бұл платформада тіркелгілерді біріктіру өшірулі. Иесі оны қоспайынша, бұл бетте ештеңе істеу мүмкін емес.',
    'merge.foot':
      'Әр біріктіру не көшірілгенімен бірге платформаның өзгерістер жазбасына жазылады.',
    'merge.closeInstead':
      'Екінші тіркелгіні біріктірудің орнына жабу үшін сол тіркелгіге кіріп, оны сол жерден жабыңыз.',
    'merge.closeLink': 'Тіркелгіні жабу',
    'merge.inHeading': 'Басқа тіркелгі осы тіркелгіге біріктірілуді сұрап отыр',
    'merge.inLede':
      'Егер екінші тіркелгідегі де өзіңіз болсаңыз, келісім сол тіркелгінің оқуын, рөлдерін және мәліметтерін осы тіркелгіге көшіріп, сол тіркелгіні жабады. Мұны кері қайтару мүмкін емес. Егер бұл сіз болмасаңыз, бас тартыңыз. Сіз жауап бергенше ештеңе болмайды.',
    'merge.noName': 'Атауы жоқ тіркелгі',
    'merge.inMerged': 'Біріктірілді. Екінші тіркелгі жабылған.',
    'merge.inExpired':
      'Бұл сұраудың мерзімі жауап берілгенге дейін өтіп кетті. Екінші тіркелгіден қайта сұраңыз.',
    'merge.whatMoves':
      'Не көшіріледі: сол тіркелгінің оқу жазбасы ілгерілеуімен және сертификаттарымен бірге, рөлдері, хабарламалары, телефон нөмірі және ол жасаған курстар. Не қалады: сол тіркелгінің істеген істерінің жазбасы, мысалы, оның берген тапсырыстары.',
    'merge.whatGoes':
      'Не жойылады: екі тіркелгіде де бір сабаққа жазба немесе бетбелгі болса, не бірдей хабарлама болса, осы тіркелгідегісі сақталып, екіншісі жойылады. Осы тіркелгінің өз телефон нөмірі болса, екінші тіркелгінің телефон нөмірі де жойылады.',
    'merge.confirmLabel': 'Растау үшін осы тіркелгінің атын жазыңыз: {name}',
    'merge.needName':
      'Бұл тіркелгінің әлі аты жоқ. Алдымен аккаунт параметрлерінде ат қосыңыз: біріктіру сол атты жазу арқылы расталады.',
    'merge.accept': 'Осы тіркелгіге біріктіру',
    'merge.accepting': 'Біріктірілуде…',
    'merge.decline': 'Бас тарту',
    'merge.cannotUndo':
      'Мұны кері қайтару мүмкін емес. Екінші тіркелгі жабылып, оның аты мен мәліметтері алынып тасталады. Оның кіру дерегі кіру қызметінде сол жерде жойылғанша қалады.',
    'merge.blockSame': 'Бұл сұраудың екі жағы да бір тіркелгі.',
    'merge.blockAbsorbedClosed': 'Көшірілуге тиіс тіркелгі жабылған.',
    'merge.blockTargetClosed': 'Ол көшірілуге тиіс тіркелгі жабылған.',
    'merge.blockPayouts':
      'Көшірілуге тиіс тіркелгінің жолдағы төлемдері бар: {count}. Олар аяқталғанша күтіңіз.',
    'merge.blockBilling':
      'Көшірілуге тиіс тіркелгі есеп айырысу тіркелгілерін басқа адамдармен бөліседі: {count}. Біріктіру басқа адамның төлем тәртібін көшіре алмайды.',
    'merge.blockReviewers':
      'Екі тіркелгі де рецензенттер тізілімінде. Қай жазба қалатынын платформа иесі шешеді.',
    'merge.blockHouseholds':
      'Әр тіркелгі басқа-басқа отбасындағы оқушы. Біріктіру бір адамның оқуын басқа отбасына көшіре алмайды.',
    'merge.blockSameCourse':
      'Екі тіркелгі де бір курсты бастаған: {title}. Платформа қай ілгерілеудің шын екенін таңдай алмайды. Біріктірмес бұрын курсты тіркелгілердің бірінде аяқтаңыз немесе одан шығыңыз.',
    'merge.blockOwner':
      'Көшірілуге тиіс тіркелгіде осы платформада иесі берген тағайындау бар. Біріктірмес бұрын ол жеке қаралуы керек.',
    'merge.blockOther':
      'Бұл біріктіруді дәл қазір орындау мүмкін емес, ал бұл бетте себебін айтатын сөйлем жоқ. Қайта көрмес бұрын платформа қызметкерлерінен сұраңыз.',
    'merge.noteJoin':
      'Екі оқу жазбасы біреу болады. Осы тіркелгінің жазбасында бұрыннан бар нәрсе сол күйінде қалады.',
    'merge.noteMoves': 'Оқу жазбасы ілгерілеуімен және сертификаттарымен бірге тұтас көшіріледі.',
    'merge.outHeading': 'Осы тіркелгіні басқасына көшіру',
    'merge.outLede':
      'Егер екі тіркелгіңіз болса және бұл енді керек емесі болса, сақтағыңыз келетін тіркелгінің электрондық пошта мекенжайын жазыңыз. Біреу сол тіркелгіге кіріп келіскенше, сұрау сол жерде күтеді. Платформа екеуі де сіздің бақылауыңызда екенін осылай біледі.',
    'merge.emailLabel': 'Сақталатын тіркелгінің электрондық пошта мекенжайы',
    'merge.emailHelp':
      'Бірдеңе көшірілмес бұрын сол тіркелгі келісуі керек. Содан кейін бұл тіркелгі жабылады, ал оны жабуды кері қайтару мүмкін емес.',
    'merge.ask': 'Біріктіруді сұрау',
    'merge.asking': 'Сұралуда…',
    'merge.listHeading': 'Осы тіркелгіден жасалған сұраулар',
    'merge.listInto': 'Мекенжайын жазған тіркелгіңізге',
    'merge.waitingUntil': '{date} дейін күтуде',
    'merge.nothingMoved': 'Көшіретін ештеңе болған жоқ.',
    'merge.withdraw': 'Сұрауды қайтарып алу',
    'merge.stPending': 'Күтуде',
    'merge.stCompleted': 'Біріктірілді',
    'merge.stDeclined': 'Бас тартылды',
    'merge.stCancelled': 'Қайтарып алынды',
    'merge.stExpired': 'Мерзімі өтті',
    'merge.movedHeading': 'Не көшірілді',
    'merge.mvLearner': 'Оқу жазбасы',
    'merge.mvEnrolments': 'Курстарға жазылулар: {count}',
    'merge.mvCertificates': 'Сертификаттар: {count}',
    'merge.mvGrants': 'Қол жеткізу рұқсаттары: {count}',
    'merge.mvReviews': 'Пікірлер: {count}',
    'merge.mvAttempts': 'Бағалау талпыныстары: {count}',
    'merge.mvSubmissions': 'Тапсырмалар: {count}',
    'merge.mvCohorts': 'Күні белгіленген сыныптар: {count}',
    'merge.mvAttendance': 'Қатысқан тікелей сабақтар: {count}',
    'merge.mvCases': 'Қолдау өтініштері: {count}',
    'merge.mvNotifications': 'Хабарламалар: {count}',
    'merge.mvRoles': 'Рөлдер: {count}',
    'merge.mvNotes': 'Сабақ жазбалары: {count}',
    'merge.mvBookmarks': 'Бетбелгілер: {count}',
    'merge.mvGuardianships': 'Қамқоршылық байланыстары: {count}',
    'merge.stayed':
      'Осы тіркелгіде дәл сондай нәрсе бұрыннан болғандықтан, жабылған тіркелгіде қалған жазбалар: {count}.',
    'merge.asked': 'Сұрау екінші тіркелгіде күтіп тұр. Оған келісу үшін сол жерде кіріңіз.',
    'merge.withdrawn': 'Сұрау қайтарып алынды. Ештеңе көшірілген жоқ.',
    'merge.merged': 'Тіркелгілер біріктірілді. Екінші тіркелгі жабылған.',
    'merge.declined': 'Бас тартылды. Екі тіркелгі де бұрынғыдай.',
    'merge.errSignedOut':
      'Сіз тіркелгіден шыққансыз. Қайта кіріп, тағы бір рет көріңіз. Ештеңе өзгерген жоқ.',
    'merge.errEmail': 'Сақтағыңыз келетін тіркелгінің электрондық пошта мекенжайын жазыңыз.',
    'merge.errNoAccount':
      'Мұндай электрондық пошта мекенжайы бар тіркелгі жоқ. Ештеңе өзгерген жоқ.',
    'merge.errSameAccount':
      'Бұл осы тіркелгінің өз мекенжайы. Екіншісінің, яғни сақтағыңыз келетін тіркелгінің мекенжайын жазыңыз.',
    'merge.errPending':
      'Осы тіркелгіден бір сұрау бұрыннан күтіп тұр. Басқа тіркелгіден сұрамас бұрын оны қайтарып алыңыз.',
    'merge.errNoRequest': 'Ол сұрау енді жоқ. Ештеңе өзгерген жоқ.',
    'merge.errNotYours': 'Бұл тіркелгі ол сұрауға жауап бере алмайды. Ештеңе өзгерген жоқ.',
    'merge.errName': 'Жазылған ат әріпке әріп осы тіркелгінің аты емес. Ештеңе өзгерген жоқ.',
    'merge.errBlocked':
      'Бұл біріктіруді дәл қазір орындау мүмкін емес. Ештеңе көшірілген жоқ. Себебін сұраудың жанынан көру үшін бұл бетті қайта жүктеңіз.',
    'merge.errExpired':
      'Бұл сұраудың мерзімі жауап берілгенге дейін өтіп кетті. Ештеңе көшірілген жоқ. Екінші тіркелгіден қайта сұраңыз.',
    'merge.errAnswered':
      'Бұл сұрауға бұрын жауап берілген болатын. Қазір ештеңе өзгерген жоқ. Не болғанын көру үшін бұл бетті қайта жүктеңіз.',
    'merge.errRefused': 'Платформа мұны қабылдамады. Ештеңе өзгерген жоқ.',
    'merge.unconfirmed':
      'Ешқандай жауап келмеді, сондықтан бұл орындалды ма, жоқ па, белгісіз. Қайта көрмес бұрын жағдайды көру үшін бұл бетті қайта жүктеңіз.',
  },
  az: {
    'merge.title': 'Hesabların birləşdirilməsi',
    'merge.back': 'Hesab parametrləri',
    'merge.heading': 'Hesabların birləşdirilməsi',
    'merge.lede':
      'İki dəfə qeydiyyatdan keçmisinizsə, kurslarınız və sertifikatlarınız bir yerdə olsun deyə hesablardan biri digərinə köçürülə bilər. Hər iki hesab razılaşmalıdır və köçürülən hesab sonra bağlanır.',
    'merge.unread': 'Birləşdirmə sorğularını indi oxumaq mümkün olmadı. Heç nə dəyişmədi.',
    'merge.off':
      'Bu platformada hesabların birləşdirilməsi söndürülüb. Sahibi onu yandırana qədər bu səhifədə heç nə etmək olmaz.',
    'merge.foot':
      'Hər birləşdirmə nəyin köçürüldüyü ilə birlikdə platformanın dəyişikliklər qeydinə yazılır.',
    'merge.closeInstead':
      'İkinci hesabı birləşdirmək əvəzinə bağlamaq üçün həmin hesaba daxil olun və onu oradan bağlayın.',
    'merge.closeLink': 'Hesabın bağlanması',
    'merge.inHeading': 'Başqa bir hesab bu hesabla birləşdirilməyi xahiş edir',
    'merge.inLede':
      'İkinci hesabdakı da sizsinizsə, razılıq həmin hesabın təhsilini, rollarını və məlumatlarını bu hesaba köçürür və həmin hesabı bağlayır. Bunu geri qaytarmaq olmaz. Bu siz deyilsinizsə, imtina edin. Siz cavab verənə qədər heç nə baş vermir.',
    'merge.noName': 'Adı olmayan hesab',
    'merge.inMerged': 'Birləşdirildi. Digər hesab bağlıdır.',
    'merge.inExpired':
      'Bu sorğunun müddəti cavablandırılmadan bitdi. Digər hesabdan yenidən xahiş edin.',
    'merge.whatMoves':
      'Nə köçürülür: həmin hesabın təhsil qeydi irəliləyişi və sertifikatları ilə birlikdə, rolları, bildirişləri, telefon nömrəsi və yaratdığı kurslar. Nə qalır: həmin hesabın etdiklərinin qeydi, məsələn, verdiyi sifarişlər.',
    'merge.whatGoes':
      'Nə silinir: hər iki hesabın eyni dərsdə qeydi və ya əlfəcini varsa, yaxud eyni bildiriş hər ikisində varsa, bu hesabdakı saxlanılır, digəri silinir. Bu hesabın öz telefon nömrəsi varsa, digər hesabın telefon nömrəsi də silinir.',
    'merge.confirmLabel': 'Təsdiqləmək üçün bu hesabın adını yazın: {name}',
    'merge.needName':
      'Bu hesabın hələ adı yoxdur. Əvvəlcə hesab parametrlərində ad əlavə edin: birləşdirmə həmin adı yazmaqla təsdiqlənir.',
    'merge.accept': 'Bu hesabla birləşdir',
    'merge.accepting': 'Birləşdirilir…',
    'merge.decline': 'İmtina et',
    'merge.cannotUndo':
      'Bunu geri qaytarmaq olmaz. Digər hesab bağlanır, adı və məlumatları götürülür. Onun girişi orada silinənə qədər giriş xidmətində qalır.',
    'merge.blockSame': 'Bu sorğunun hər iki tərəfi eyni hesabdır.',
    'merge.blockAbsorbedClosed': 'Köçürüləcək hesab bağlıdır.',
    'merge.blockTargetClosed': 'Köçürüləcəyi hesab bağlıdır.',
    'merge.blockPayouts':
      'Köçürüləcək hesabın yolda olan ödənişləri var: {count}. Onların bitməsini gözləyin.',
    'merge.blockBilling':
      'Köçürüləcək hesab hesablaşma hesablarını başqa adamlarla bölüşür: {count}. Birləşdirmə başqasının ödəniş qaydasını köçürə bilməz.',
    'merge.blockReviewers':
      'Hər iki hesab rəyçilər reyestrindədir. Hansı qeydin qalacağına platformanın sahibi qərar verir.',
    'merge.blockHouseholds':
      'Hər hesab ayrı bir ailədə şagirddir. Birləşdirmə bir nəfərin təhsilini başqa ailəyə köçürə bilməz.',
    'merge.blockSameCourse':
      'Hər iki hesab eyni kursa başlayıb: {title}. Platforma hansı irəliləyişin əsl olduğunu seçə bilməz. Birləşdirməzdən əvvəl kursu hesablardan birində bitirin və ya onu tərk edin.',
    'merge.blockOwner':
      'Köçürüləcək hesabın bu platformada sahibin verdiyi təyinatı var. Birləşdirilməzdən əvvəl ona ayrıca baxılmalıdır.',
    'merge.blockOther':
      'Bu birləşdirməni indi icra etmək olmur və bu səhifədə səbəbi deyən cümlə yoxdur. Yenidən cəhd etməzdən əvvəl platformanın işçilərindən soruşun.',
    'merge.noteJoin':
      'İki təhsil qeydi bir olur. Bu hesabın qeydində artıq olanlar olduğu kimi qalır.',
    'merge.noteMoves': 'Təhsil qeydi irəliləyişi və sertifikatları ilə birlikdə bütöv köçürülür.',
    'merge.outHeading': 'Bu hesabı başqasına köçürün',
    'merge.outLede':
      'İki hesabınız varsa və artıq istəmədiyiniz budursa, saxlamaq istədiyiniz hesabın e-poçt ünvanını yazın. Kimsə həmin hesaba daxil olub razılaşana qədər sorğu orada gözləyir. Platforma hər ikisinin sizin nəzarətinizdə olduğunu belə bilir.',
    'merge.emailLabel': 'Saxlanılacaq hesabın e-poçt ünvanı',
    'merge.emailHelp':
      'Nəsə köçürülməzdən əvvəl həmin hesab razılaşmalıdır. Bundan sonra bu hesab bağlanır və onun bağlanmasını geri qaytarmaq olmaz.',
    'merge.ask': 'Birləşdirməni xahiş et',
    'merge.asking': 'Xahiş edilir…',
    'merge.listHeading': 'Bu hesabdan edilən sorğular',
    'merge.listInto': 'Ünvanını yazdığınız hesaba',
    'merge.waitingUntil': '{date} tarixinədək gözləyir',
    'merge.nothingMoved': 'Köçürüləsi heç nə yox idi.',
    'merge.withdraw': 'Sorğunu geri götür',
    'merge.stPending': 'Gözləyir',
    'merge.stCompleted': 'Birləşdirildi',
    'merge.stDeclined': 'İmtina edildi',
    'merge.stCancelled': 'Geri götürüldü',
    'merge.stExpired': 'Müddəti bitdi',
    'merge.movedHeading': 'Nə köçürüldü',
    'merge.mvLearner': 'Təhsil qeydi',
    'merge.mvEnrolments': 'Kurslara yazılmalar: {count}',
    'merge.mvCertificates': 'Sertifikatlar: {count}',
    'merge.mvGrants': 'Giriş icazələri: {count}',
    'merge.mvReviews': 'Rəylər: {count}',
    'merge.mvAttempts': 'Qiymətləndirmə cəhdləri: {count}',
    'merge.mvSubmissions': 'Tapşırıqlar: {count}',
    'merge.mvCohorts': 'Tarixi olan siniflər: {count}',
    'merge.mvAttendance': 'İştirak edilən canlı dərslər: {count}',
    'merge.mvCases': 'Dəstək müraciətləri: {count}',
    'merge.mvNotifications': 'Bildirişlər: {count}',
    'merge.mvRoles': 'Rollar: {count}',
    'merge.mvNotes': 'Dərs qeydləri: {count}',
    'merge.mvBookmarks': 'Əlfəcinlər: {count}',
    'merge.mvGuardianships': 'Qəyyumluq əlaqələri: {count}',
    'merge.stayed': 'Bu hesabda eynisi artıq olduğu üçün bağlanmış hesabda qalan qeydlər: {count}.',
    'merge.asked': 'Sorğu digər hesabda gözləyir. Onunla razılaşmaq üçün orada daxil olun.',
    'merge.withdrawn': 'Sorğu geri götürüldü. Heç nə köçürülmədi.',
    'merge.merged': 'Hesablar birləşdirildi. Digər hesab bağlıdır.',
    'merge.declined': 'İmtina edildi. Hər iki hesab olduğu kimidir.',
    'merge.errSignedOut':
      'Hesabdan çıxmısınız. Yenidən daxil olun, sonra bir dəfə də cəhd edin. Heç nə dəyişmədi.',
    'merge.errEmail': 'Saxlamaq istədiyiniz hesabın e-poçt ünvanını yazın.',
    'merge.errNoAccount': 'Bu e-poçt ünvanı ilə hesab yoxdur. Heç nə dəyişmədi.',
    'merge.errSameAccount':
      'Bu, elə bu hesabın ünvanıdır. Digərinin, yəni saxlamaq istədiyiniz hesabın ünvanını yazın.',
    'merge.errPending':
      'Bu hesabdan bir sorğu artıq gözləyir. Başqa hesabdan xahiş etməzdən əvvəl onu geri götürün.',
    'merge.errNoRequest': 'Həmin sorğu artıq yoxdur. Heç nə dəyişmədi.',
    'merge.errNotYours': 'Bu hesab həmin sorğuya cavab verə bilməz. Heç nə dəyişmədi.',
    'merge.errName': 'Yazılan ad hərfbəhərf bu hesabın adı deyil. Heç nə dəyişmədi.',
    'merge.errBlocked':
      'Bu birləşdirməni indi icra etmək olmur. Heç nə köçürülmədi. Səbəbi sorğunun yanında görmək üçün bu səhifəni yenidən yükləyin.',
    'merge.errExpired':
      'Bu sorğunun müddəti cavablandırılmadan bitdi. Heç nə köçürülmədi. Digər hesabdan yenidən xahiş edin.',
    'merge.errAnswered':
      'Bu sorğu artıq cavablandırılmışdı. İndi heç nə dəyişmədi. Nə baş verdiyini görmək üçün bu səhifəni yenidən yükləyin.',
    'merge.errRefused': 'Platforma bunu qəbul etmədi. Heç nə dəyişmədi.',
    'merge.unconfirmed':
      'Heç bir cavab gəlmədi, ona görə bunun edilib-edilmədiyi məlum deyil. Yenidən cəhd etməzdən əvvəl vəziyyəti görmək üçün bu səhifəni yenidən yükləyin.',
  },
  tg: {
    'merge.title': 'Якҷоя кардани ҳисобҳо',
    'merge.back': 'Танзимоти ҳисоб',
    'merge.heading': 'Якҷоя кардани ҳисобҳо',
    'merge.lede':
      'Агар шумо ду бор сабти ном карда бошед, як ҳисобро ба дигараш гузаронидан мумкин аст, то курсҳо ва шаҳодатномаҳоятон дар як ҷо бошанд. Ҳар ду ҳисоб бояд розӣ шаванд ва ҳисоби гузаронидашуда баъдан баста мешавад.',
    'merge.unread': 'Дархостҳои якҷоякуниро ҳозир хондан нашуд. Ҳеҷ чиз тағйир наёфт.',
    'merge.off':
      'Якҷоя кардани ҳисобҳо дар ин платформа хомӯш аст. То соҳиб онро фаъол накунад, дар ин саҳифа ҳеҷ коре кардан намешавад.',
    'merge.foot':
      'Ҳар якҷоякунӣ бо он чи гузаронида шуд, дар сабти тағйироти платформа навишта мешавад.',
    'merge.closeInstead':
      'Барои бастани ҳисоби дуюм ба ҷойи якҷоя кардани он, ба ҳамон ҳисоб дароед ва онро аз ҳамон ҷо бандед.',
    'merge.closeLink': 'Бастани ҳисоб',
    'merge.inHeading': 'Ҳисоби дигар хоҳиш дорад, ки бо ин ҳисоб якҷоя карда шавад',
    'merge.inLede':
      'Агар дар ҳисоби дуюм ҳам худи шумо бошед, розигӣ омӯзиш, нақшҳо ва маълумоти он ҳисобро ба ин ҳисоб мегузаронад ва он ҳисобро мебандад. Инро баргардондан намешавад. Агар ин шумо набошед, рад кунед. То шумо ҷавоб надиҳед, ҳеҷ чиз рӯй намедиҳад.',
    'merge.noName': 'Ҳисоби беном',
    'merge.inMerged': 'Якҷоя карда шуд. Ҳисоби дигар баста аст.',
    'merge.inExpired':
      'Муҳлати ин дархост пеш аз ҷавоб гузашт. Аз ҳисоби дигар дубора дархост кунед.',
    'merge.whatMoves':
      'Чӣ гузаронида мешавад: сабти омӯзиши он ҳисоб бо пешрафт ва шаҳодатномаҳояш, нақшҳояш, огоҳиномаҳояш, рақами телефонаш ва курсҳое, ки сохтааст. Чӣ мемонад: сабти корҳое, ки он ҳисоб кардааст, масалан фармоишҳое, ки додааст.',
    'merge.whatGoes':
      'Чӣ нест карда мешавад: агар ҳар ду ҳисоб дар як дарс қайд ё хатчӯб дошта бошанд ё як огоҳиномаи якхела дошта бошанд, он чи дар ин ҳисоб аст, нигоҳ дошта мешавад ва дигараш нест карда мешавад. Агар ин ҳисоб рақами телефони худро дошта бошад, рақами телефони ҳисоби дигар низ нест карда мешавад.',
    'merge.confirmLabel': 'Барои тасдиқ номи ин ҳисобро нависед: {name}',
    'merge.needName':
      'Ин ҳисоб ҳанӯз ном надорад. Аввал дар танзимоти ҳисоб ном илова кунед: якҷоякунӣ бо навиштани он тасдиқ мешавад.',
    'merge.accept': 'Бо ин ҳисоб якҷоя кардан',
    'merge.accepting': 'Якҷоя карда мешавад…',
    'merge.decline': 'Рад кардан',
    'merge.cannotUndo':
      'Инро баргардондан намешавад. Ҳисоби дигар баста мешавад ва ном ва маълумоташ гирифта мешавад. Воридшавии он дар хидмати воридшавӣ мемонад, то он ҷо нест карда шавад.',
    'merge.blockSame': 'Ҳар ду тарафи ин дархост як ҳисоб аст.',
    'merge.blockAbsorbedClosed': 'Ҳисобе, ки бояд гузаронида шавад, баста аст.',
    'merge.blockTargetClosed': 'Ҳисобе, ки бояд ба он гузаронида шавад, баста аст.',
    'merge.blockPayouts':
      'Ҳисобе, ки бояд гузаронида шавад, пардохтҳои дар роҳ дорад: {count}. Мунтазир шавед, то онҳо анҷом ёбанд.',
    'merge.blockBilling':
      'Ҳисобе, ки бояд гузаронида шавад, ҳисобҳои пардохтро бо одамони дигар шарик аст: {count}. Якҷоякунӣ тартиби пардохти шахси дигарро гузаронида наметавонад.',
    'merge.blockReviewers':
      'Ҳар ду ҳисоб дар феҳристи бознигарон ҳастанд. Кадом сабт мемонад, соҳиби платформа ҳал мекунад.',
    'merge.blockHouseholds':
      'Ҳар ҳисоб дар оилаи дигар донишомӯз аст. Якҷоякунӣ омӯзиши як шахсро ба оилаи дигар гузаронида наметавонад.',
    'merge.blockSameCourse':
      'Ҳар ду ҳисоб як курсро оғоз кардаанд: {title}. Платформа интихоб карда наметавонад, ки кадом пешрафт воқеӣ аст. Пеш аз якҷоя кардан курсро дар яке аз ҳисобҳо анҷом диҳед ё онро тарк кунед.',
    'merge.blockOwner':
      'Ҳисобе, ки бояд гузаронида шавад, дар ин платформа таъиноти соҳибро дорад. Пеш аз якҷоя кардан он бояд алоҳида баррасӣ шавад.',
    'merge.blockOther':
      'Ин якҷоякуниро ҳозир иҷро кардан намешавад ва дар ин саҳифа барои сабаби он ҷумлае нест. Пеш аз кӯшиши дубора аз кормандони платформа пурсед.',
    'merge.noteJoin':
      'Ду сабти омӯзиш як мешаванд. Он чи сабти ин ҳисоб аллакай дорад, ҳамон тавр мемонад.',
    'merge.noteMoves': 'Сабти омӯзиш бо пешрафт ва шаҳодатномаҳояш пурра гузаронида мешавад.',
    'merge.outHeading': 'Ин ҳисобро ба ҳисоби дигар гузаронед',
    'merge.outLede':
      'Агар шумо ду ҳисоб дошта бошед ва ин ҳамонест, ки дигар намехоҳед, нишонии почтаи электронии ҳисоберо нависед, ки нигоҳ доштан мехоҳед. Дархост он ҷо мунтазир мемонад, то касе ба он ҳисоб дарояд ва розӣ шавад. Платформа аз ҳамин медонад, ки ҳар ду дар ихтиёри шумост.',
    'merge.emailLabel': 'Нишонии почтаи электронии ҳисобе, ки мемонад',
    'merge.emailHelp':
      'Пеш аз он ки чизе гузаронида шавад, он ҳисоб бояд розӣ шавад. Баъд аз он ин ҳисоб баста мешавад ва бастани онро баргардондан намешавад.',
    'merge.ask': 'Дархости якҷоякунӣ',
    'merge.asking': 'Дархост карда мешавад…',
    'merge.listHeading': 'Дархостҳое, ки аз ин ҳисоб шудаанд',
    'merge.listInto': 'Ба ҳисобе, ки нишониашро навиштед',
    'merge.waitingUntil': 'То {date} мунтазир аст',
    'merge.nothingMoved': 'Чизе барои гузаронидан набуд.',
    'merge.withdraw': 'Бозпас гирифтани дархост',
    'merge.stPending': 'Мунтазир',
    'merge.stCompleted': 'Якҷоя шуд',
    'merge.stDeclined': 'Рад шуд',
    'merge.stCancelled': 'Бозпас гирифта шуд',
    'merge.stExpired': 'Муҳлат гузашт',
    'merge.movedHeading': 'Чӣ гузаронида шуд',
    'merge.mvLearner': 'Сабти омӯзиш',
    'merge.mvEnrolments': 'Сабти ном ба курсҳо: {count}',
    'merge.mvCertificates': 'Шаҳодатномаҳо: {count}',
    'merge.mvGrants': 'Иҷозатҳои дастрасӣ: {count}',
    'merge.mvReviews': 'Тақризҳо: {count}',
    'merge.mvAttempts': 'Кӯшишҳои арзёбӣ: {count}',
    'merge.mvSubmissions': 'Супоришҳо: {count}',
    'merge.mvCohorts': 'Синфҳои санадор: {count}',
    'merge.mvAttendance': 'Дарсҳои мустақиме, ки дар онҳо иштирок шудааст: {count}',
    'merge.mvCases': 'Муроҷиатҳои дастгирӣ: {count}',
    'merge.mvNotifications': 'Огоҳиномаҳо: {count}',
    'merge.mvRoles': 'Нақшҳо: {count}',
    'merge.mvNotes': 'Қайдҳои дарс: {count}',
    'merge.mvBookmarks': 'Хатчӯбҳо: {count}',
    'merge.mvGuardianships': 'Пайвандҳои сарпарастӣ: {count}',
    'merge.stayed':
      'Сабтҳое, ки бо ҳисоби басташуда монданд, зеро ин ҳисоб аллакай ҳамон чизро дошт: {count}.',
    'merge.asked': 'Дархост дар ҳисоби дигар мунтазир аст. Барои розӣ шудан ба он, он ҷо дароед.',
    'merge.withdrawn': 'Дархост бозпас гирифта шуд. Ҳеҷ чиз гузаронида нашуд.',
    'merge.merged': 'Ҳисобҳо якҷоя шуданд. Ҳисоби дигар баста аст.',
    'merge.declined': 'Рад карда шуд. Ҳар ду ҳисоб ҳамон тавранд, ки буданд.',
    'merge.errSignedOut':
      'Шумо аз ҳисоб баромадаед. Дубора дароед, баъд як бори дигар кӯшиш кунед. Ҳеҷ чиз тағйир наёфт.',
    'merge.errEmail': 'Нишонии почтаи электронии ҳисоберо нависед, ки нигоҳ доштан мехоҳед.',
    'merge.errNoAccount': 'Ҳисобе бо чунин нишонии почтаи электронӣ нест. Ҳеҷ чиз тағйир наёфт.',
    'merge.errSameAccount':
      'Ин нишонии худи ҳамин ҳисоб аст. Нишонии ҳисоби дигарро нависед, яъне ҳисоберо, ки нигоҳ доштан мехоҳед.',
    'merge.errPending':
      'Як дархост аз ин ҳисоб аллакай мунтазир аст. Пеш аз дархост аз ҳисоби дигар онро бозпас гиред.',
    'merge.errNoRequest': 'Он дархост дигар нест. Ҳеҷ чиз тағйир наёфт.',
    'merge.errNotYours': 'Ин ҳисоб ба он дархост ҷавоб дода наметавонад. Ҳеҷ чиз тағйир наёфт.',
    'merge.errName': 'Номи навишташуда ҳарф ба ҳарф номи ин ҳисоб нест. Ҳеҷ чиз тағйир наёфт.',
    'merge.errBlocked':
      'Ин якҷоякуниро ҳозир иҷро кардан намешавад. Ҳеҷ чиз гузаронида нашуд. Барои дидани сабаб дар паҳлуи дархост ин саҳифаро аз нав бор кунед.',
    'merge.errExpired':
      'Муҳлати ин дархост пеш аз ҷавоб гузашт. Ҳеҷ чиз гузаронида нашуд. Аз ҳисоби дигар дубора дархост кунед.',
    'merge.errAnswered':
      'Ба ин дархост аллакай ҷавоб дода шуда буд. Ҳозир ҳеҷ чиз тағйир наёфт. Барои дидани он чи рӯй дод, ин саҳифаро аз нав бор кунед.',
    'merge.errRefused': 'Платформа инро қабул накард. Ҳеҷ чиз тағйир наёфт.',
    'merge.unconfirmed':
      'Ҳеҷ ҷавобе барнагашт, аз ин рӯ маълум нест, ки ин иҷро шуд ё не. Пеш аз кӯшиши дубора барои дидани вазъият ин саҳифаро аз нав бор кунед.',
  },
  ky: {
    'merge.title': 'Аккаунттарды бириктирүү',
    'merge.back': 'Аккаунт жөндөөлөрү',
    'merge.heading': 'Аккаунттарды бириктирүү',
    'merge.lede':
      'Эгер эки жолу катталган болсоңуз, курстарыңыз менен сертификаттарыңыз бир жерде болушу үчүн бир аккаунтту экинчисине көчүрүүгө болот. Эки аккаунт тең макул болушу керек, ал эми көчүрүлгөн аккаунт кийин жабылат.',
    'merge.unread': 'Бириктирүү суроо-талаптары азыр окулган жок. Эч нерсе өзгөргөн жок.',
    'merge.off':
      'Бул платформада аккаунттарды бириктирүү өчүрүлгөн. Ээси аны күйгүзмөйүнчө, бул баракта эч нерсе кылууга болбойт.',
    'merge.foot':
      'Ар бир бириктирүү эмне көчүрүлгөнү менен кошо платформанын өзгөрүүлөр жазуусуна жазылат.',
    'merge.closeInstead':
      'Экинчи аккаунтту бириктирүүнүн ордуна жабуу үчүн ошол аккаунтка кирип, аны ошол жерден жабыңыз.',
    'merge.closeLink': 'Аккаунтту жабуу',
    'merge.inHeading': 'Башка аккаунт ушул аккаунтка бириктирилүүнү суранып жатат',
    'merge.inLede':
      'Эгер экинчи аккаунттагы да өзүңүз болсоңуз, макулдук ошол аккаунттун окуусун, ролдорун жана маалыматтарын ушул аккаунтка көчүрүп, ошол аккаунтту жабат. Муну артка кайтарууга болбойт. Эгер бул сиз болбосоңуз, баш тартыңыз. Сиз жооп бермейинче эч нерсе болбойт.',
    'merge.noName': 'Аты жок аккаунт',
    'merge.inMerged': 'Бириктирилди. Экинчи аккаунт жабылган.',
    'merge.inExpired':
      'Бул суроо-талаптын мөөнөтү жооп берилгенге чейин өтүп кетти. Экинчи аккаунттан кайра сураңыз.',
    'merge.whatMoves':
      'Эмне көчүрүлөт: ошол аккаунттун окуу жазуусу илгерилөөсү жана сертификаттары менен кошо, ролдору, билдирүүлөрү, телефон номери жана ал түзгөн курстар. Эмне калат: ошол аккаунттун кылган иштеринин жазуусу, мисалы, ал берген буйрутмалар.',
    'merge.whatGoes':
      'Эмне өчүрүлөт: эки аккаунтта тең бир сабакка жазуу же кыстарма болсо, же бирдей билдирүү болсо, ушул аккаунттагысы сакталып, экинчиси өчүрүлөт. Ушул аккаунттун өз телефон номери болсо, экинчи аккаунттун телефон номери да өчүрүлөт.',
    'merge.confirmLabel': 'Ырастоо үчүн ушул аккаунттун атын жазыңыз: {name}',
    'merge.needName':
      'Бул аккаунттун азырынча аты жок. Адегенде аккаунт жөндөөлөрүнө ат кошуңуз: бириктирүү ошол атты жазуу менен ырасталат.',
    'merge.accept': 'Ушул аккаунтка бириктирүү',
    'merge.accepting': 'Бириктирилүүдө…',
    'merge.decline': 'Баш тартуу',
    'merge.cannotUndo':
      'Муну артка кайтарууга болбойт. Экинчи аккаунт жабылып, анын аты жана маалыматтары алынып салынат. Анын кирүү маалыматы кирүү кызматында ошол жерде өчүрүлгөнгө чейин калат.',
    'merge.blockSame': 'Бул суроо-талаптын эки тарабы тең бир эле аккаунт.',
    'merge.blockAbsorbedClosed': 'Көчүрүлө турган аккаунт жабылган.',
    'merge.blockTargetClosed': 'Ал көчүрүлө турган аккаунт жабылган.',
    'merge.blockPayouts':
      'Көчүрүлө турган аккаунттун жолдо бараткан төлөмдөрү бар: {count}. Алар бүткөнчө күтүңүз.',
    'merge.blockBilling':
      'Көчүрүлө турган аккаунт эсеп-кысап аккаунттарын башка адамдар менен бөлүшөт: {count}. Бириктирүү башка адамдын төлөм тартибин көчүрө албайт.',
    'merge.blockReviewers':
      'Эки аккаунт тең рецензенттер реестринде. Кайсы жазуу каларын платформанын ээси чечет.',
    'merge.blockHouseholds':
      'Ар бир аккаунт башка-башка үй-бүлөдөгү окуучу. Бириктирүү бир адамдын окуусун башка үй-бүлөгө көчүрө албайт.',
    'merge.blockSameCourse':
      'Эки аккаунт тең бир эле курсту баштаган: {title}. Платформа кайсы илгерилөө чыныгы экенин тандай албайт. Бириктирүүдөн мурун курсту аккаунттардын биринде бүтүрүңүз же андан чыгыңыз.',
    'merge.blockOwner':
      'Көчүрүлө турган аккаунтта ушул платформада ээси берген дайындоо бар. Бириктирүүдөн мурун ал өзүнчө каралышы керек.',
    'merge.blockOther':
      'Бул бириктирүүнү азыр аткарууга болбойт, ал эми бул баракта себебин айткан сүйлөм жок. Кайра аракет кылардан мурун платформанын кызматкерлеринен сураңыз.',
    'merge.noteJoin':
      'Эки окуу жазуусу бир болуп калат. Ушул аккаунттун жазуусунда мурунтан бар нерсе ошол бойдон калат.',
    'merge.noteMoves':
      'Окуу жазуусу илгерилөөсү жана сертификаттары менен кошо толугу менен көчүрүлөт.',
    'merge.outHeading': 'Ушул аккаунтту башкасына көчүрүү',
    'merge.outLede':
      'Эгер эки аккаунтуңуз болсо жана бул эми кереги жогу болсо, сактап калгыңыз келген аккаунттун электрондук почта дарегин жазыңыз. Кимдир бирөө ошол аккаунтка кирип макул болмоюнча, суроо-талап ошол жерде күтөт. Платформа экөө тең сиздин көзөмөлүңүздө экенин ушундайча билет.',
    'merge.emailLabel': 'Сактала турган аккаунттун электрондук почта дареги',
    'merge.emailHelp':
      'Бир нерсе көчүрүлөрдөн мурун ошол аккаунт макул болушу керек. Андан кийин бул аккаунт жабылат, ал эми аны жабууну артка кайтарууга болбойт.',
    'merge.ask': 'Бириктирүүнү суроо',
    'merge.asking': 'Суралууда…',
    'merge.listHeading': 'Ушул аккаунттан жасалган суроо-талаптар',
    'merge.listInto': 'Дарегин жазган аккаунтуңузга',
    'merge.waitingUntil': '{date} чейин күтүүдө',
    'merge.nothingMoved': 'Көчүрө турган эч нерсе болгон жок.',
    'merge.withdraw': 'Суроо-талапты кайтарып алуу',
    'merge.stPending': 'Күтүүдө',
    'merge.stCompleted': 'Бириктирилди',
    'merge.stDeclined': 'Баш тартылды',
    'merge.stCancelled': 'Кайтарып алынды',
    'merge.stExpired': 'Мөөнөтү өттү',
    'merge.movedHeading': 'Эмне көчүрүлдү',
    'merge.mvLearner': 'Окуу жазуусу',
    'merge.mvEnrolments': 'Курстарга жазылуулар: {count}',
    'merge.mvCertificates': 'Сертификаттар: {count}',
    'merge.mvGrants': 'Кирүү уруксаттары: {count}',
    'merge.mvReviews': 'Пикирлер: {count}',
    'merge.mvAttempts': 'Баалоо аракеттери: {count}',
    'merge.mvSubmissions': 'Тапшырмалар: {count}',
    'merge.mvCohorts': 'Күнү белгиленген класстар: {count}',
    'merge.mvAttendance': 'Катышкан түз сабактар: {count}',
    'merge.mvCases': 'Колдоо кайрылуулары: {count}',
    'merge.mvNotifications': 'Билдирүүлөр: {count}',
    'merge.mvRoles': 'Ролдор: {count}',
    'merge.mvNotes': 'Сабак жазуулары: {count}',
    'merge.mvBookmarks': 'Кыстармалар: {count}',
    'merge.mvGuardianships': 'Камкорчулук байланыштары: {count}',
    'merge.stayed':
      'Ушул аккаунтта дал ошондой нерсе мурунтан болгондуктан, жабылган аккаунтта калган жазуулар: {count}.',
    'merge.asked':
      'Суроо-талап экинчи аккаунтта күтүп турат. Ага макул болуу үчүн ошол жерде кириңиз.',
    'merge.withdrawn': 'Суроо-талап кайтарып алынды. Эч нерсе көчүрүлгөн жок.',
    'merge.merged': 'Аккаунттар бириктирилди. Экинчи аккаунт жабылган.',
    'merge.declined': 'Баш тартылды. Эки аккаунт тең мурдагыдай.',
    'merge.errSignedOut':
      'Сиз аккаунттан чыгып кеткенсиз. Кайра кирип, дагы бир жолу аракет кылыңыз. Эч нерсе өзгөргөн жок.',
    'merge.errEmail': 'Сактап калгыңыз келген аккаунттун электрондук почта дарегин жазыңыз.',
    'merge.errNoAccount': 'Мындай электрондук почта дареги бар аккаунт жок. Эч нерсе өзгөргөн жок.',
    'merge.errSameAccount':
      'Бул ушул эле аккаунттун дареги. Экинчисинин, башкача айтканда сактап калгыңыз келген аккаунттун дарегин жазыңыз.',
    'merge.errPending':
      'Ушул аккаунттан бир суроо-талап мурунтан күтүп турат. Башка аккаунттан суроодон мурун аны кайтарып алыңыз.',
    'merge.errNoRequest': 'Ал суроо-талап эми жок. Эч нерсе өзгөргөн жок.',
    'merge.errNotYours': 'Бул аккаунт ал суроо-талапка жооп бере албайт. Эч нерсе өзгөргөн жок.',
    'merge.errName': 'Жазылган ат тамгама-тамга ушул аккаунттун аты эмес. Эч нерсе өзгөргөн жок.',
    'merge.errBlocked':
      'Бул бириктирүүнү азыр аткарууга болбойт. Эч нерсе көчүрүлгөн жок. Себебин суроо-талаптын жанынан көрүү үчүн бул баракты кайра жүктөңүз.',
    'merge.errExpired':
      'Бул суроо-талаптын мөөнөтү жооп берилгенге чейин өтүп кетти. Эч нерсе көчүрүлгөн жок. Экинчи аккаунттан кайра сураңыз.',
    'merge.errAnswered':
      'Бул суроо-талапка мурун эле жооп берилген болчу. Азыр эч нерсе өзгөргөн жок. Эмне болгонун көрүү үчүн бул баракты кайра жүктөңүз.',
    'merge.errRefused': 'Платформа муну кабыл алган жок. Эч нерсе өзгөргөн жок.',
    'merge.unconfirmed':
      'Эч кандай жооп келген жок, ошондуктан бул аткарылганбы же жокпу, белгисиз. Кайра аракет кылардан мурун абалды көрүү үчүн бул баракты кайра жүктөңүз.',
  },
  tk: {
    'merge.title': 'Hasaplary birleşdirmek',
    'merge.back': 'Hasap sazlamalary',
    'merge.heading': 'Hasaplary birleşdirmek',
    'merge.lede':
      'Eger iki gezek hasaba alnan bolsaňyz, kurslaryňyz we şahadatnamalaryňyz bir ýerde bolar ýaly bir hasaby beýlekisine geçirip bolýar. Iki hasap hem razy bolmaly, geçirilen hasap bolsa soň ýapylýar.',
    'merge.unread': 'Birleşdirme haýyşlaryny häzir okap bolmady. Hiç zat üýtgemedi.',
    'merge.off':
      'Bu platformada hasaplary birleşdirmek öçürilen. Eýesi ony açýança bu sahypada hiç zat edip bolmaýar.',
    'merge.foot':
      'Her birleşdirme näme geçirilendigi bilen bilelikde platformanyň üýtgeşmeler ýazgysyna ýazylýar.',
    'merge.closeInstead':
      'Ikinji hasaby birleşdirmegiň ýerine ýapmak üçin şol hasaba giriň we ony şol ýerden ýapyň.',
    'merge.closeLink': 'Hasaby ýapmak',
    'merge.inHeading': 'Başga bir hasap şu hasap bilen birleşdirilmegi soraýar',
    'merge.inLede':
      'Eger ikinji hasapdaky hem özüňiz bolsaňyz, razylyk şol hasabyň okuwyny, rollaryny we maglumatlaryny şu hasaba geçirýär we şol hasaby ýapýar. Muny yzyna gaýtaryp bolmaýar. Eger bu siz däl bolsaňyz, ret ediň. Siz jogap berýänçäňiz hiç zat bolmaýar.',
    'merge.noName': 'Ady ýok hasap',
    'merge.inMerged': 'Birleşdirildi. Beýleki hasap ýapyk.',
    'merge.inExpired':
      'Bu haýyşyň möhleti jogap berilmänkä gutardy. Beýleki hasapdan täzeden soraň.',
    'merge.whatMoves':
      'Näme geçirilýär: şol hasabyň okuw ýazgysy öňe gidişligi we şahadatnamalary bilen bilelikde, rollary, bildirişleri, telefon belgisi we onuň döreden kurslary. Näme galýar: şol hasabyň eden işleriniň ýazgysy, meselem, onuň beren sargytlary.',
    'merge.whatGoes':
      'Näme pozulýar: iki hasapda hem bir sapaga bellik ýa-da hatjoý bar bolsa, ýa-da birmeňzeş bildiriş bar bolsa, şu hasapdakysy saklanýar, beýlekisi pozulýar. Şu hasabyň öz telefon belgisi bar bolsa, beýleki hasabyň telefon belgisi hem pozulýar.',
    'merge.confirmLabel': 'Tassyklamak üçin şu hasabyň adyny ýazyň: {name}',
    'merge.needName':
      'Bu hasabyň entek ady ýok. Ilki hasap sazlamalarynda at goşuň: birleşdirme şol ady ýazmak bilen tassyklanýar.',
    'merge.accept': 'Şu hasap bilen birleşdir',
    'merge.accepting': 'Birleşdirilýär…',
    'merge.decline': 'Ret et',
    'merge.cannotUndo':
      'Muny yzyna gaýtaryp bolmaýar. Beýleki hasap ýapylýar, ady we maglumatlary aýrylýar. Onuň giriş maglumaty giriş hyzmatynda şol ýerde pozulýança galýar.',
    'merge.blockSame': 'Bu haýyşyň iki tarapy hem bir hasap.',
    'merge.blockAbsorbedClosed': 'Geçirilmeli hasap ýapyk.',
    'merge.blockTargetClosed': 'Onuň geçirilmeli hasaby ýapyk.',
    'merge.blockPayouts':
      'Geçirilmeli hasabyň ýoldaky tölegleri bar: {count}. Olar gutarýança garaşyň.',
    'merge.blockBilling':
      'Geçirilmeli hasap hasaplaşyk hasaplaryny başga adamlar bilen paýlaşýar: {count}. Birleşdirme başga adamyň töleg tertibini geçirip bilmeýär.',
    'merge.blockReviewers':
      'Iki hasap hem synçylaryň sanawynda. Haýsy ýazgynyň galjakdygyny platformanyň eýesi çözýär.',
    'merge.blockHouseholds':
      'Her hasap başga-başga maşgalada okuwçy. Birleşdirme bir adamyň okuwyny başga maşgala geçirip bilmeýär.',
    'merge.blockSameCourse':
      'Iki hasap hem şol bir kursy başlapdyr: {title}. Platforma haýsy öňe gidişligiň hakykydygyny saýlap bilmeýär. Birleşdirmezden öň kursy hasaplaryň birinde tamamlaň ýa-da ony taşlaň.',
    'merge.blockOwner':
      'Geçirilmeli hasabyň bu platformada eýesiniň beren bellenilmesi bar. Birleşdirilmezden öň oňa aýratyn seredilmeli.',
    'merge.blockOther':
      'Bu birleşdirmäni häzir ýerine ýetirip bolmaýar we bu sahypada sebäbini aýdýan sözlem ýok. Täzeden synanyşmazdan öň platformanyň işgärlerinden soraň.',
    'merge.noteJoin':
      'Iki okuw ýazgysy bir bolýar. Şu hasabyň ýazgysynda eýýäm bar zat bolşy ýaly galýar.',
    'merge.noteMoves':
      'Okuw ýazgysy öňe gidişligi we şahadatnamalary bilen bilelikde tutuşlygyna geçirilýär.',
    'merge.outHeading': 'Şu hasaby başga birine geçiriň',
    'merge.outLede':
      'Eger iki hasabyňyz bar bolsa we bu indi islemeýäniňiz bolsa, saklamak isleýän hasabyňyzyň elektron poçta salgysyny ýazyň. Kimdir biri şol hasaba girip razy bolýança haýyş şol ýerde garaşýar. Platforma ikisiniň hem siziň ygtyýaryňyzdadygyny şeýdip bilýär.',
    'merge.emailLabel': 'Saklanjak hasabyň elektron poçta salgysy',
    'merge.emailHelp':
      'Bir zat geçirilmezden öň şol hasap razy bolmaly. Şondan soň bu hasap ýapylýar we ony ýapmagy yzyna gaýtaryp bolmaýar.',
    'merge.ask': 'Birleşdirmegi sora',
    'merge.asking': 'Soralýar…',
    'merge.listHeading': 'Şu hasapdan edilen haýyşlar',
    'merge.listInto': 'Salgysyny ýazan hasabyňyza',
    'merge.waitingUntil': '{date} çenli garaşýar',
    'merge.nothingMoved': 'Geçirmeli zat ýokdy.',
    'merge.withdraw': 'Haýyşy yzyna al',
    'merge.stPending': 'Garaşýar',
    'merge.stCompleted': 'Birleşdirildi',
    'merge.stDeclined': 'Ret edildi',
    'merge.stCancelled': 'Yzyna alyndy',
    'merge.stExpired': 'Möhleti gutardy',
    'merge.movedHeading': 'Näme geçirildi',
    'merge.mvLearner': 'Okuw ýazgysy',
    'merge.mvEnrolments': 'Kurslara ýazylmalar: {count}',
    'merge.mvCertificates': 'Şahadatnamalar: {count}',
    'merge.mvGrants': 'Giriş rugsatlary: {count}',
    'merge.mvReviews': 'Synlar: {count}',
    'merge.mvAttempts': 'Baha beriş synanyşyklary: {count}',
    'merge.mvSubmissions': 'Ýumuşlar: {count}',
    'merge.mvCohorts': 'Senesi bellenen synplar: {count}',
    'merge.mvAttendance': 'Gatnaşylan göni sapaklar: {count}',
    'merge.mvCases': 'Goldaw ýüztutmalary: {count}',
    'merge.mvNotifications': 'Bildirişler: {count}',
    'merge.mvRoles': 'Rollar: {count}',
    'merge.mvNotes': 'Sapak bellikleri: {count}',
    'merge.mvBookmarks': 'Hatjoýlar: {count}',
    'merge.mvGuardianships': 'Hossarlyk baglanyşyklary: {count}',
    'merge.stayed':
      'Şu hasapda şonuň ýaly zat eýýäm bolany üçin ýapylan hasapda galan ýazgylar: {count}.',
    'merge.asked': 'Haýyş beýleki hasapda garaşýar. Oňa razy bolmak üçin şol ýerde giriň.',
    'merge.withdrawn': 'Haýyş yzyna alyndy. Hiç zat geçirilmedi.',
    'merge.merged': 'Hasaplar birleşdirildi. Beýleki hasap ýapyk.',
    'merge.declined': 'Ret edildi. Iki hasap hem öňküsi ýaly.',
    'merge.errSignedOut':
      'Siz hasapdan çykypsyňyz. Täzeden giriň, soň ýene bir gezek synanyşyň. Hiç zat üýtgemedi.',
    'merge.errEmail': 'Saklamak isleýän hasabyňyzyň elektron poçta salgysyny ýazyň.',
    'merge.errNoAccount': 'Şeýle elektron poçta salgyly hasap ýok. Hiç zat üýtgemedi.',
    'merge.errSameAccount':
      'Bu şu hasabyň öz salgysy. Beýlekisiniň, ýagny saklamak isleýän hasabyňyzyň salgysyny ýazyň.',
    'merge.errPending':
      'Şu hasapdan bir haýyş eýýäm garaşýar. Başga hasapdan soramazdan öň ony yzyna alyň.',
    'merge.errNoRequest': 'Ol haýyş indi ýok. Hiç zat üýtgemedi.',
    'merge.errNotYours': 'Bu hasap ol haýyşa jogap berip bilmeýär. Hiç zat üýtgemedi.',
    'merge.errName': 'Ýazylan at harpma-harp şu hasabyň ady däl. Hiç zat üýtgemedi.',
    'merge.errBlocked':
      'Bu birleşdirmäni häzir ýerine ýetirip bolmaýar. Hiç zat geçirilmedi. Sebäbini haýyşyň ýanynda görmek üçin bu sahypany täzeden ýükläň.',
    'merge.errExpired':
      'Bu haýyşyň möhleti jogap berilmänkä gutardy. Hiç zat geçirilmedi. Beýleki hasapdan täzeden soraň.',
    'merge.errAnswered':
      'Bu haýyşa eýýäm jogap berlipdi. Häzir hiç zat üýtgemedi. Näme bolandygyny görmek üçin bu sahypany täzeden ýükläň.',
    'merge.errRefused': 'Platforma muny kabul etmedi. Hiç zat üýtgemedi.',
    'merge.unconfirmed':
      'Hiç hili jogap gelmedi, şonuň üçin munuň edilendigi ýa-da edilmändigi belli däl. Täzeden synanyşmazdan öň ýagdaýy görmek üçin bu sahypany täzeden ýükläň.',
  },
  ta: {
    'merge.title': 'கணக்குகளை இணைத்தல்',
    'merge.back': 'கணக்கு அமைப்புகள்',
    'merge.heading': 'கணக்குகளை இணைத்தல்',
    'merge.lede':
      'நீங்கள் இரண்டு முறை பதிவு செய்திருந்தால், உங்கள் பாடநெறிகளும் சான்றிதழ்களும் ஒரே இடத்தில் இருக்கும்படி ஒரு கணக்கை மற்றொன்றுக்கு நகர்த்தலாம். இரண்டு கணக்குகளும் ஒப்புக்கொள்ள வேண்டும்; நகர்த்தப்படும் கணக்கு பின்னர் மூடப்படும்.',
    'merge.unread': 'இணைப்புக் கோரிக்கைகளை இப்போது படிக்க முடியவில்லை. எதுவும் மாற்றப்படவில்லை.',
    'merge.off':
      'இந்தத் தளத்தில் கணக்குகளை இணைத்தல் அணைக்கப்பட்டுள்ளது. உரிமையாளர் அதை இயக்கும் வரை இந்தப் பக்கத்தில் எதுவும் செய்ய முடியாது.',
    'merge.foot':
      'ஒவ்வொரு இணைப்பும், எது நகர்த்தப்பட்டது என்பதுடன், தளத்தின் மாற்றப் பதிவேட்டில் எழுதப்படுகிறது.',
    'merge.closeInstead':
      'இரண்டாவது கணக்கை இணைப்பதற்குப் பதிலாக மூட, அந்தக் கணக்கில் உள்நுழைந்து அங்கிருந்தே அதை மூடுங்கள்.',
    'merge.closeLink': 'கணக்கை மூடுதல்',
    'merge.inHeading': 'மற்றொரு கணக்கு இந்தக் கணக்குடன் இணைக்கப்படக் கேட்கிறது',
    'merge.inLede':
      'இரண்டாவது கணக்கில் இருப்பவர் நீங்களே என்றால், ஒப்புக்கொள்வது அந்தக் கணக்கின் கற்றல், பொறுப்புகள், விவரங்கள் ஆகியவற்றை இந்தக் கணக்குக்கு நகர்த்தி அந்தக் கணக்கை மூடும். இதைத் திரும்பப் பெற முடியாது. அது நீங்கள் இல்லை என்றால் மறுத்துவிடுங்கள். நீங்கள் பதில் அளிக்கும் வரை எதுவும் நடக்காது.',
    'merge.noName': 'பெயர் இல்லாத கணக்கு',
    'merge.inMerged': 'இணைக்கப்பட்டது. மற்றக் கணக்கு மூடப்பட்டுள்ளது.',
    'merge.inExpired':
      'பதில் கிடைக்கும் முன்பே இந்தக் கோரிக்கையின் காலம் முடிந்துவிட்டது. மற்றக் கணக்கிலிருந்து மீண்டும் கேளுங்கள்.',
    'merge.whatMoves':
      'நகர்பவை: அந்தக் கணக்கின் கற்றல் பதிவு அதன் முன்னேற்றம், சான்றிதழ்களுடன், அதன் பொறுப்புகள், அதன் அறிவிப்புகள், அதன் தொலைபேசி எண், அது உருவாக்கிய பாடநெறிகள். இருப்பவை: அந்தக் கணக்கு செய்தவற்றின் பதிவு, எடுத்துக்காட்டாக அது செய்த ஆர்டர்கள்.',
    'merge.whatGoes':
      'நீக்கப்படுபவை: இரண்டு கணக்குகளுக்கும் ஒரே பாடத்தில் குறிப்பு அல்லது புக்மார்க் இருந்தால், அல்லது ஒரே அறிவிப்பு இருந்தால், இந்தக் கணக்கில் உள்ளது வைக்கப்படும்; மற்றது நீக்கப்படும். இந்தக் கணக்குக்குச் சொந்தமாக ஒரு தொலைபேசி எண் இருந்தால், மற்றக் கணக்கின் தொலைபேசி எண்ணும் நீக்கப்படும்.',
    'merge.confirmLabel': 'உறுதிப்படுத்த இந்தக் கணக்கின் பெயரைத் தட்டச்சு செய்யுங்கள்: {name}',
    'merge.needName':
      'இந்தக் கணக்குக்கு இன்னும் பெயர் இல்லை. முதலில் கணக்கு அமைப்புகளில் ஒரு பெயரைச் சேருங்கள்: அதைத் தட்டச்சு செய்வதன் மூலமே இணைப்பு உறுதிப்படுத்தப்படுகிறது.',
    'merge.accept': 'இந்தக் கணக்குடன் இணை',
    'merge.accepting': 'இணைக்கப்படுகிறது…',
    'merge.decline': 'மறு',
    'merge.cannotUndo':
      'இதைத் திரும்பப் பெற முடியாது. மற்றக் கணக்கு மூடப்படும்; அதன் பெயரும் விவரங்களும் அகற்றப்படும். அதன் உள்நுழைவு, அங்கே நீக்கப்படும் வரை உள்நுழைவுச் சேவையிடம் இருக்கும்.',
    'merge.blockSame': 'இந்தக் கோரிக்கையின் இரு பக்கங்களும் ஒரே கணக்கு.',
    'merge.blockAbsorbedClosed': 'நகர்த்தப்பட வேண்டிய கணக்கு மூடப்பட்டுள்ளது.',
    'merge.blockTargetClosed': 'எந்தக் கணக்குக்கு நகர்த்தப்பட வேண்டுமோ அது மூடப்பட்டுள்ளது.',
    'merge.blockPayouts':
      'நகர்த்தப்பட வேண்டிய கணக்குக்கு வழியில் உள்ள பணம் செலுத்தல்கள் உள்ளன: {count}. அவை முடியும் வரை காத்திருங்கள்.',
    'merge.blockBilling':
      'நகர்த்தப்பட வேண்டிய கணக்கு பிறருடன் பில்லிங் கணக்குகளைப் பகிர்கிறது: {count}. இணைப்பால் வேறொருவரின் கட்டண ஏற்பாடுகளை நகர்த்த முடியாது.',
    'merge.blockReviewers':
      'இரண்டு கணக்குகளும் மதிப்பாய்வாளர் பதிவேட்டில் உள்ளன. எந்தப் பதிவு இருக்க வேண்டும் என்பதை உரிமையாளர் முடிவு செய்கிறார்.',
    'merge.blockHouseholds':
      'ஒவ்வொரு கணக்கும் வெவ்வேறு குடும்பத்தில் கற்பவராக உள்ளது. இணைப்பால் ஒருவரின் கற்றலை வேறொரு குடும்பத்துக்கு நகர்த்த முடியாது.',
    'merge.blockSameCourse':
      'இரண்டு கணக்குகளும் ஒரே பாடநெறியைத் தொடங்கியுள்ளன: {title}. எந்த முன்னேற்றம் உண்மையானது என்பதைத் தளத்தால் தேர்வு செய்ய முடியாது. இணைக்கும் முன் ஒரு கணக்கில் அந்தப் பாடநெறியை முடியுங்கள் அல்லது விட்டுவிடுங்கள்.',
    'merge.blockOwner':
      'நகர்த்தப்பட வேண்டிய கணக்கு இந்தத் தளத்தில் உரிமையாளரின் ஒரு நியமனத்தைக் கொண்டுள்ளது. இணைக்கும் முன் அது தனியாகப் பார்க்கப்பட வேண்டும்.',
    'merge.blockOther':
      'இந்த இணைப்பை இப்போது இயக்க முடியாது; காரணத்துக்கான வாக்கியம் இந்தப் பக்கத்தில் இல்லை. மீண்டும் முயலும் முன் தளத்தின் பணியாளர்களிடம் கேளுங்கள்.',
    'merge.noteJoin':
      'இரண்டு கற்றல் பதிவுகளும் ஒன்றாகின்றன. இந்தக் கணக்கின் பதிவில் ஏற்கெனவே உள்ளது அப்படியே இருக்கும்.',
    'merge.noteMoves': 'கற்றல் பதிவு அதன் முன்னேற்றம், சான்றிதழ்களுடன் முழுமையாக நகர்கிறது.',
    'merge.outHeading': 'இந்தக் கணக்கை மற்றொரு கணக்குக்கு நகர்த்துங்கள்',
    'merge.outLede':
      'உங்களிடம் இரண்டு கணக்குகள் இருந்து, இனி வேண்டாதது இதுதான் என்றால், நீங்கள் வைத்திருக்க விரும்பும் கணக்கின் மின்னஞ்சல் முகவரியைத் தட்டச்சு செய்யுங்கள். யாராவது அந்தக் கணக்கில் உள்நுழைந்து ஒப்புக்கொள்ளும் வரை கோரிக்கை அங்கே காத்திருக்கும். இரண்டும் உங்கள் கட்டுப்பாட்டில் உள்ளன என்பதைத் தளம் இப்படித்தான் அறிகிறது.',
    'merge.emailLabel': 'வைத்திருக்க வேண்டிய கணக்கின் மின்னஞ்சல் முகவரி',
    'merge.emailHelp':
      'எதுவும் நகரும் முன் அந்தக் கணக்கு ஒப்புக்கொள்ள வேண்டும். அதன் பின் இந்தக் கணக்கு மூடப்படும்; அதை மூடுவதைத் திரும்பப் பெற முடியாது.',
    'merge.ask': 'இணைக்கக் கேள்',
    'merge.asking': 'கேட்கப்படுகிறது…',
    'merge.listHeading': 'இந்தக் கணக்கிலிருந்து செய்யப்பட்ட கோரிக்கைகள்',
    'merge.listInto': 'நீங்கள் முகவரியைத் தட்டச்சு செய்த கணக்குக்கு',
    'merge.waitingUntil': '{date} வரை காத்திருக்கிறது',
    'merge.nothingMoved': 'நகர்த்த வேண்டியது எதுவும் இல்லை.',
    'merge.withdraw': 'கோரிக்கையைத் திரும்பப் பெறு',
    'merge.stPending': 'காத்திருக்கிறது',
    'merge.stCompleted': 'இணைக்கப்பட்டது',
    'merge.stDeclined': 'மறுக்கப்பட்டது',
    'merge.stCancelled': 'திரும்பப் பெறப்பட்டது',
    'merge.stExpired': 'காலம் முடிந்தது',
    'merge.movedHeading': 'நகர்த்தப்பட்டவை',
    'merge.mvLearner': 'கற்றல் பதிவு',
    'merge.mvEnrolments': 'பாடநெறிப் பதிவுகள்: {count}',
    'merge.mvCertificates': 'சான்றிதழ்கள்: {count}',
    'merge.mvGrants': 'அணுகல் அனுமதிகள்: {count}',
    'merge.mvReviews': 'மதிப்புரைகள்: {count}',
    'merge.mvAttempts': 'மதிப்பீட்டு முயற்சிகள்: {count}',
    'merge.mvSubmissions': 'ஒப்படைப்புகள்: {count}',
    'merge.mvCohorts': 'தேதியிட்ட வகுப்புகள்: {count}',
    'merge.mvAttendance': 'கலந்துகொண்ட நேரலை வகுப்புகள்: {count}',
    'merge.mvCases': 'உதவி வழக்குகள்: {count}',
    'merge.mvNotifications': 'அறிவிப்புகள்: {count}',
    'merge.mvRoles': 'பொறுப்புகள்: {count}',
    'merge.mvNotes': 'பாடக் குறிப்புகள்: {count}',
    'merge.mvBookmarks': 'புக்மார்க்குகள்: {count}',
    'merge.mvGuardianships': 'பாதுகாவலர் இணைப்புகள்: {count}',
    'merge.stayed':
      'இந்தக் கணக்கில் அதே விஷயம் ஏற்கெனவே இருந்ததால், மூடப்பட்ட கணக்கிடமே தங்கிய பதிவுகள்: {count}.',
    'merge.asked':
      'கோரிக்கை மற்றக் கணக்கில் காத்திருக்கிறது. அதை ஒப்புக்கொள்ள அங்கே உள்நுழையுங்கள்.',
    'merge.withdrawn': 'கோரிக்கை திரும்பப் பெறப்பட்டது. எதுவும் நகர்த்தப்படவில்லை.',
    'merge.merged': 'கணக்குகள் இணைக்கப்பட்டன. மற்றக் கணக்கு மூடப்பட்டுள்ளது.',
    'merge.declined': 'மறுக்கப்பட்டது. இரண்டு கணக்குகளும் இருந்தபடியே உள்ளன.',
    'merge.errSignedOut':
      'நீங்கள் வெளியேறியுள்ளீர்கள். மீண்டும் உள்நுழைந்து, இன்னொரு முறை முயலுங்கள். எதுவும் மாற்றப்படவில்லை.',
    'merge.errEmail':
      'நீங்கள் வைத்திருக்க விரும்பும் கணக்கின் மின்னஞ்சல் முகவரியைத் தட்டச்சு செய்யுங்கள்.',
    'merge.errNoAccount':
      'அந்த மின்னஞ்சல் முகவரியில் எந்தக் கணக்கும் இல்லை. எதுவும் மாற்றப்படவில்லை.',
    'merge.errSameAccount':
      'அது இந்தக் கணக்கின் முகவரி. மற்றக் கணக்கின், அதாவது நீங்கள் வைத்திருக்க விரும்பும் கணக்கின் முகவரியைத் தட்டச்சு செய்யுங்கள்.',
    'merge.errPending':
      'இந்தக் கணக்கிலிருந்து ஒரு கோரிக்கை ஏற்கெனவே காத்திருக்கிறது. வேறொரு கணக்கிடம் கேட்கும் முன் அதைத் திரும்பப் பெறுங்கள்.',
    'merge.errNoRequest': 'அந்தக் கோரிக்கை இனி இல்லை. எதுவும் மாற்றப்படவில்லை.',
    'merge.errNotYours':
      'இந்தக் கணக்கால் அந்தக் கோரிக்கைக்குப் பதில் அளிக்க முடியாது. எதுவும் மாற்றப்படவில்லை.',
    'merge.errName':
      'தட்டச்சு செய்த பெயர் எழுத்துக்கு எழுத்து இந்தக் கணக்கின் பெயர் அல்ல. எதுவும் மாற்றப்படவில்லை.',
    'merge.errBlocked':
      'இந்த இணைப்பை இப்போது இயக்க முடியாது. எதுவும் நகர்த்தப்படவில்லை. கோரிக்கையின் அருகே காரணத்தைப் பார்க்க இந்தப் பக்கத்தை மீளேற்றுங்கள்.',
    'merge.errExpired':
      'பதில் கிடைக்கும் முன்பே இந்தக் கோரிக்கையின் காலம் முடிந்துவிட்டது. எதுவும் நகர்த்தப்படவில்லை. மற்றக் கணக்கிலிருந்து மீண்டும் கேளுங்கள்.',
    'merge.errAnswered':
      'இந்தக் கோரிக்கைக்கு ஏற்கெனவே பதில் அளிக்கப்பட்டிருந்தது. இப்போது எதுவும் மாற்றப்படவில்லை. என்ன நடந்தது என்று பார்க்க இந்தப் பக்கத்தை மீளேற்றுங்கள்.',
    'merge.errRefused': 'தளம் இதை ஏற்கவில்லை. எதுவும் மாற்றப்படவில்லை.',
    'merge.unconfirmed':
      'பதில் எதுவும் திரும்பி வரவில்லை; எனவே இது செய்யப்பட்டதா என்று தெரியவில்லை. மீண்டும் முயலும் முன் நிலைமையைப் பார்க்க இந்தப் பக்கத்தை மீளேற்றுங்கள்.',
  },
  ne: {
    'merge.title': 'खाताहरू गाभ्ने',
    'merge.back': 'खाता सेटिङ',
    'merge.heading': 'खाताहरू गाभ्ने',
    'merge.lede':
      'तपाईंले दुई पटक दर्ता गर्नुभएको छ भने एउटा खातालाई अर्कोमा सार्न सकिन्छ, ताकि तपाईंका कोर्स र प्रमाणपत्रहरू एकै ठाउँमा होऊन्। दुवै खाताको सहमति चाहिन्छ, र सारिएको खाता पछि बन्द गरिन्छ।',
    'merge.unread': 'गाभ्ने अनुरोधहरू अहिले पढ्न सकिएन। केही पनि परिवर्तन भएन।',
    'merge.off':
      'यो प्लेटफर्ममा खाता गाभ्ने काम बन्द छ। मालिकले यसलाई चालु नगरेसम्म यो पृष्ठमा केही गर्न सकिँदैन।',
    'merge.foot': 'हरेक गभाइ प्लेटफर्मको परिवर्तनको अभिलेखमा लेखिन्छ, के सारियो भन्ने सहित।',
    'merge.closeInstead':
      'दोस्रो खातालाई गाभ्नुको सट्टा बन्द गर्न त्यही खातामा साइन इन गर्नुहोस् र त्यहीँबाट बन्द गर्नुहोस्।',
    'merge.closeLink': 'खाता बन्द गर्ने',
    'merge.inHeading': 'अर्को खाताले यो खातामा गाभिन अनुरोध गरिरहेको छ',
    'merge.inLede':
      'दोस्रो खातामा तपाईं नै हुनुहुन्छ भने, सहमति दिँदा त्यो खाताको सिकाइ, भूमिकाहरू र विवरण यो खातामा सर्छन् र त्यो खाता बन्द हुन्छ। यसलाई फिर्ता गर्न सकिँदैन। तपाईं होइन भने अस्वीकार गर्नुहोस्। तपाईंले जवाफ नदिएसम्म केही हुँदैन।',
    'merge.noName': 'नाम नभएको खाता',
    'merge.inMerged': 'गाभियो। अर्को खाता बन्द छ।',
    'merge.inExpired': 'जवाफ आउनुअघि यो अनुरोधको म्याद सकियो। अर्को खाताबाट फेरि अनुरोध गर्नुहोस्।',
    'merge.whatMoves':
      'के सर्छ: त्यो खाताको सिकाइको अभिलेख त्यसको प्रगति र प्रमाणपत्रहरूसहित, त्यसका भूमिकाहरू, त्यसका सूचनाहरू, त्यसको फोन नम्बर र त्यसले बनाएका कोर्सहरू। के रहन्छ: त्यो खाताले गरेका कामको अभिलेख, जस्तै त्यसले गरेका अर्डरहरू।',
    'merge.whatGoes':
      'के मेटिन्छ: जहाँ दुवै खातासँग एउटै पाठमा टिपोट वा बुकमार्क छ, वा एउटै सूचना छ, त्यहाँ यो खाताको राखिन्छ र अर्को मेटिन्छ। यो खाताको आफ्नै फोन नम्बर छ भने अर्को खाताको फोन नम्बर पनि मेटिन्छ।',
    'merge.confirmLabel': 'पुष्टि गर्न यो खाताको नाम लेख्नुहोस्: {name}',
    'merge.needName':
      'यो खाताको अझै नाम छैन। पहिले खाता सेटिङमा नाम थप्नुहोस्: गभाइको पुष्टि त्यही नाम लेखेर हुन्छ।',
    'merge.accept': 'यसलाई यो खातामा गाभ्नुहोस्',
    'merge.accepting': 'गाभिँदै छ…',
    'merge.decline': 'अस्वीकार गर्नुहोस्',
    'merge.cannotUndo':
      'यसलाई फिर्ता गर्न सकिँदैन। अर्को खाता बन्द गरिन्छ र त्यसको नाम र विवरण हटाइन्छ। त्यसको साइन इन, साइन इन सेवासँग त्यहाँबाट नमेटिएसम्म रहन्छ।',
    'merge.blockSame': 'यो अनुरोधका दुवै पक्ष एउटै खाता हुन्।',
    'merge.blockAbsorbedClosed': 'सारिने खाता बन्द छ।',
    'merge.blockTargetClosed': 'जुन खातामा सारिने हो त्यो बन्द छ।',
    'merge.blockPayouts':
      'सारिने खाताका भुक्तानीहरू बाटोमा छन्: {count}। ती पूरा नभएसम्म पर्खनुहोस्।',
    'merge.blockBilling':
      'सारिने खाताले अरू मानिससँग बिलिङ खाताहरू साझा गर्छ: {count}। गभाइले अर्को व्यक्तिको भुक्तानी व्यवस्था सार्न सक्दैन।',
    'merge.blockReviewers':
      'दुवै खाता समीक्षकहरूको दर्तामा छन्। कुन प्रविष्टि रहने भन्ने मालिकले निर्णय गर्छन्।',
    'merge.blockHouseholds':
      'हरेक खाता फरक परिवारमा सिकारु हो। गभाइले एक व्यक्तिको सिकाइ अर्को परिवारमा सार्न सक्दैन।',
    'merge.blockSameCourse':
      'दुवै खाताले एउटै कोर्स सुरु गरेका छन्: {title}। कुन प्रगति साँचो हो भनेर प्लेटफर्मले छान्न सक्दैन। गाभ्नुअघि एउटा खातामा कोर्स पूरा गर्नुहोस् वा छोड्नुहोस्।',
    'merge.blockOwner':
      'सारिने खातासँग यो प्लेटफर्ममा मालिकको एउटा नियुक्ति छ। गाभ्नुअघि त्यसलाई छुट्टै हेरिनुपर्छ।',
    'merge.blockOther':
      'यो गभाइ अहिले हुन सक्दैन, र यो पृष्ठसँग कारणका लागि कुनै वाक्य छैन। फेरि प्रयास गर्नुअघि प्लेटफर्मका कर्मचारीलाई सोध्नुहोस्।',
    'merge.noteJoin':
      'सिकाइका दुई अभिलेख एउटै हुन्छन्। यो खाताको अभिलेखमा पहिल्यै भएको कुरा जस्ताको तस्तै रहन्छ।',
    'merge.noteMoves': 'सिकाइको अभिलेख पूरै सर्छ, त्यसको प्रगति र प्रमाणपत्रहरूसहित।',
    'merge.outHeading': 'यो खातालाई अर्को खातामा सार्नुहोस्',
    'merge.outLede':
      'तपाईंका दुई खाता छन् र यो अब नचाहिने खाता हो भने, तपाईंले राख्न चाहेको खाताको इमेल ठेगाना लेख्नुहोस्। कसैले त्यो खातामा साइन इन गरेर सहमति नदिएसम्म अनुरोध त्यहाँ पर्खन्छ। दुवै तपाईंको नियन्त्रणमा छन् भनेर प्लेटफर्मले यसरी नै थाहा पाउँछ।',
    'merge.emailLabel': 'राखिने खाताको इमेल ठेगाना',
    'merge.emailHelp':
      'केही पनि सर्नुअघि त्यो खाताको सहमति चाहिन्छ। त्यसपछि यो खाता बन्द गरिन्छ, र यसलाई बन्द गर्नु फिर्ता गर्न सकिँदैन।',
    'merge.ask': 'गाभ्न अनुरोध गर्नुहोस्',
    'merge.asking': 'अनुरोध गरिँदै छ…',
    'merge.listHeading': 'यो खाताबाट गरिएका अनुरोधहरू',
    'merge.listInto': 'तपाईंले ठेगाना लेखेको खातामा',
    'merge.waitingUntil': '{date} सम्म पर्खिरहेको',
    'merge.nothingMoved': 'सार्नुपर्ने केही थिएन।',
    'merge.withdraw': 'अनुरोध फिर्ता लिनुहोस्',
    'merge.stPending': 'पर्खिरहेको',
    'merge.stCompleted': 'गाभियो',
    'merge.stDeclined': 'अस्वीकार गरियो',
    'merge.stCancelled': 'फिर्ता लिइयो',
    'merge.stExpired': 'म्याद सकियो',
    'merge.movedHeading': 'के सारियो',
    'merge.mvLearner': 'सिकाइको अभिलेख',
    'merge.mvEnrolments': 'कोर्समा भर्ना: {count}',
    'merge.mvCertificates': 'प्रमाणपत्रहरू: {count}',
    'merge.mvGrants': 'पहुँचका अनुमतिहरू: {count}',
    'merge.mvReviews': 'समीक्षाहरू: {count}',
    'merge.mvAttempts': 'मूल्याङ्कनका प्रयासहरू: {count}',
    'merge.mvSubmissions': 'गृहकार्यहरू: {count}',
    'merge.mvCohorts': 'मिति तोकिएका कक्षाहरू: {count}',
    'merge.mvAttendance': 'उपस्थित भएका प्रत्यक्ष कक्षाहरू: {count}',
    'merge.mvCases': 'सहायताका मामिलाहरू: {count}',
    'merge.mvNotifications': 'सूचनाहरू: {count}',
    'merge.mvRoles': 'भूमिकाहरू: {count}',
    'merge.mvNotes': 'पाठका टिपोटहरू: {count}',
    'merge.mvBookmarks': 'बुकमार्कहरू: {count}',
    'merge.mvGuardianships': 'अभिभावक सम्बन्धहरू: {count}',
    'merge.stayed':
      'बन्द गरिएको खातासँगै रहेका अभिलेखहरू, किनभने यो खातासँग त्यही कुरा पहिल्यै थियो: {count}।',
    'merge.asked': 'अनुरोध अर्को खातामा पर्खिरहेको छ। त्यसमा सहमति दिन त्यहाँ साइन इन गर्नुहोस्।',
    'merge.withdrawn': 'अनुरोध फिर्ता लिइयो। केही पनि सारिएन।',
    'merge.merged': 'खाताहरू गाभिए। अर्को खाता बन्द छ।',
    'merge.declined': 'अस्वीकार गरियो। दुवै खाता पहिले जस्तै छन्।',
    'merge.errSignedOut':
      'तपाईं साइन आउट हुनुभएको छ। फेरि साइन इन गर्नुहोस्, अनि एक पटक फेरि प्रयास गर्नुहोस्। केही पनि परिवर्तन भएन।',
    'merge.errEmail': 'तपाईंले राख्न चाहेको खाताको इमेल ठेगाना लेख्नुहोस्।',
    'merge.errNoAccount': 'त्यो इमेल ठेगानाको कुनै खाता छैन। केही पनि परिवर्तन भएन।',
    'merge.errSameAccount':
      'त्यो यही खाताको ठेगाना हो। अर्को खाताको ठेगाना लेख्नुहोस्, जुन तपाईं राख्न चाहनुहुन्छ।',
    'merge.errPending':
      'यो खाताको एउटा अनुरोध पहिल्यै पर्खिरहेको छ। अर्को खातालाई अनुरोध गर्नुअघि त्यसलाई फिर्ता लिनुहोस्।',
    'merge.errNoRequest': 'त्यो अनुरोध अब छैन। केही पनि परिवर्तन भएन।',
    'merge.errNotYours': 'यो खाताले त्यो अनुरोधको जवाफ दिन सक्दैन। केही पनि परिवर्तन भएन।',
    'merge.errName': 'लेखिएको नाम अक्षर-अक्षर यो खाताको नाम होइन। केही पनि परिवर्तन भएन।',
    'merge.errBlocked':
      'यो गभाइ अहिले हुन सक्दैन। केही पनि सारिएन। अनुरोधसँगै कारण हेर्न यो पृष्ठ फेरि लोड गर्नुहोस्।',
    'merge.errExpired':
      'जवाफ आउनुअघि यो अनुरोधको म्याद सकियो। केही पनि सारिएन। अर्को खाताबाट फेरि अनुरोध गर्नुहोस्।',
    'merge.errAnswered':
      'यो अनुरोधको जवाफ पहिल्यै दिइसकिएको थियो। अहिले केही पनि परिवर्तन भएन। के भयो हेर्न यो पृष्ठ फेरि लोड गर्नुहोस्।',
    'merge.errRefused': 'प्लेटफर्मले यसलाई स्वीकार गरेन। केही पनि परिवर्तन भएन।',
    'merge.unconfirmed':
      'कुनै जवाफ आएन, त्यसैले यो भयो कि भएन थाहा छैन। फेरि प्रयास गर्नुअघि अवस्था हेर्न यो पृष्ठ फेरि लोड गर्नुहोस्।',
  },
};
