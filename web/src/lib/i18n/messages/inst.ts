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
    'inst.claimTitle': 'استخدام رمز من مدرسة',
    'inst.claimLede':
      'اكتب الرمز الذي أعطتك إياه المدرسة. يعمل مرة واحدة. يضيف دورة للمتعلّم الذي تختاره، ولا تدفع شيئًا.',
    'inst.claimSchoolSees':
      'ترى المدرسة أيّ رموزها استُخدم ومتى. لا يُعرض عليها اسم المتعلّم. إذا احتفظت المدرسة بسجلّ لمن أُعطي كل رمز، فبإمكانها أن تعرف أن رمزك استُخدم.',
    'inst.claimWithdraw':
      'يمكن للمدرسة أن تسحب رمزًا لاحقًا. إذا سحبت رمزًا استُخدم، لا يستطيع المتعلّم فتح الدورة بعد ذلك. يبقى العمل الذي أُنجز محفوظًا.',
    'inst.claimCodeLabel': 'رمزك',
    'inst.claimCodeHelp':
      'عشرة أحرف وأرقام، على الرسالة أو البطاقة من المدرسة. الأحرف الصغيرة والشرطة لا تهمّ. لا يحتوي الرمز أبدًا على الأحرف I أو L أو O، ولا على صفر أو واحد.',
    'inst.claimWho': 'لمن هذه الدورة؟',
    'inst.claimWhoNote': 'الرمز الواحد لمتعلّم واحد. إذا استُخدم لمتعلّم، لا يمكن استخدامه لآخر.',
    'inst.claimMe': 'لي أنا',
    'inst.claimForMe': 'ستُضاف هذه الدورة لك.',
    'inst.claimLearnersUnread':
      'تعذّرت قراءة المتعلّمين في حسابك الآن، لذا لا يمكن استخدام الرمز هنا بعد. لم يُستخدم شيء. حاول مرة أخرى بعد قليل.',
    'inst.claimDo': 'استخدم هذا الرمز',
    'inst.claimDone': 'استُخدم الرمز. أُضيفت هذه الدورة: {title}',
    'inst.claimDoneNoTitle': 'استُخدم الرمز وأُضيفت الدورة.',
    'inst.claimDoneWhere': 'ستجدها في صفحة التعلّم.',
    'inst.claimAnother': 'استخدم رمزًا آخر',
    'inst.claimUnsure':
      'لم نتمكّن من التأكّد من أن الرمز استُخدم. انظر في صفحة التعلّم قبل أن تحاول مرة أخرى.',
    'inst.whyBadCode': 'هذا ليس شكل الرمز. راجع كل حرف ورقم على ما أعطتك المدرسة.',
    'inst.whyCodeUnknown': 'ليس لدينا رمز كهذا. راجعه على ما أعطتك المدرسة. لم يُستخدم شيء.',
    'inst.whyCodeUsed':
      'استُخدم هذا الرمز من قبل، والرمز يعمل مرة واحدة. إذا استخدمته أنت، فالدورة في صفحة التعلّم. وإن لم تستخدمه، فاطلب من المدرسة رمزًا آخر.',
    'inst.whyCodeVoided': 'سحبت المدرسة هذا الرمز. اطلب من المدرسة رمزًا غيره.',
    'inst.whyCourseGone':
      'الدورة التي يخصّها هذا الرمز لا يمكن الانضمام إليها الآن. لم يُستخدم الرمز، فيمكنك تجربته لاحقًا.',
    'inst.whyNotYourLearner': 'لا يمكنك استخدام رمز لهذا المتعلّم. لم يُستخدم الرمز.',
    'inst.whyAlreadyEnrolled':
      'هذا المتعلّم مسجّل من قبل في الدورة التي يخصّها هذا الرمز. لم يُستخدم الرمز، فيمكن استخدامه لمتعلّم آخر.',
    'inst.whySeatsClosed': 'لا يمكن استخدام رموز المدارس الآن. لم يُستخدم الرمز. حاول لاحقًا.',
    'inst.seatsTitle': 'الدورات التي اشترتها المؤسسة',
    'inst.seatsUnread':
      'تعذّرت قراءة ما اشترته مؤسستك الآن. هذا لا يعني أنها لم تشترِ شيئًا. حاول مرة أخرى بعد قليل.',
    'inst.seatsOff':
      'رموز المدارس موقوفة الآن. إلى أن تُشغَّل من جديد، لا يمكن شراء شيء جديد ولا إعطاء رمز ولا استخدام رمز. الدورات التي أُضيفت برمز من قبل لا تُسحب.',
    'inst.seatsMemberTitle': 'مسؤولو المؤسسة وحدهم يرون هذه الصفحة',
    'inst.seatsMemberBody':
      'أنت عضو في هذه المؤسسة ولست من مسؤوليها، لذا لا تُعرض عليك الدورات التي اشترتها. إذا أُعطيت رمزًا، فهو يُستخدم في صفحة أخرى.',
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
    'inst.claimTitle': 'اسکول کا کوڈ استعمال کرنا',
    'inst.claimLede':
      'وہ کوڈ لکھیں جو اسکول نے آپ کو دیا ہے۔ یہ ایک بار کام کرتا ہے۔ یہ آپ کے چنے ہوئے سیکھنے والے کے لیے ایک کورس شامل کرتا ہے، اور آپ کچھ ادا نہیں کرتے۔',
    'inst.claimSchoolSees':
      'اسکول دیکھتا ہے کہ اس کے کون سے کوڈ استعمال ہوئے اور کب۔ اسے سیکھنے والے کا نام نہیں دکھایا جاتا۔ اگر اسکول نے لکھ رکھا ہو کہ کون سا کوڈ کسے دیا گیا تھا تو وہ جان سکتا ہے کہ آپ کا کوڈ استعمال ہوا۔',
    'inst.claimWithdraw':
      'اسکول بعد میں کوئی کوڈ واپس لے سکتا ہے۔ اگر وہ استعمال شدہ کوڈ واپس لے تو سیکھنے والا وہ کورس مزید نہیں کھول سکتا۔ جو کام ہو چکا ہے وہ محفوظ رہتا ہے۔',
    'inst.claimCodeLabel': 'آپ کا کوڈ',
    'inst.claimCodeHelp':
      'دس حروف اور ہندسے، جو اسکول کے خط یا کارڈ پر لکھے ہیں۔ چھوٹے حروف اور ڈیش سے فرق نہیں پڑتا۔ کوڈ میں I، L یا O کے حروف کبھی نہیں ہوتے، اور نہ صفر یا ایک۔',
    'inst.claimWho': 'یہ کورس کس کے لیے ہے؟',
    'inst.claimWhoNote':
      'ایک کوڈ ایک سیکھنے والے کے لیے ہے۔ ایک بار کسی کے لیے استعمال ہو جائے تو کسی اور کے لیے استعمال نہیں ہو سکتا۔',
    'inst.claimMe': 'میرے اپنے لیے',
    'inst.claimForMe': 'یہ کورس آپ کے لیے شامل کیا جائے گا۔',
    'inst.claimLearnersUnread':
      'آپ کے اکاؤنٹ کے سیکھنے والے ابھی پڑھے نہیں جا سکے، اس لیے کوڈ ابھی یہاں استعمال نہیں ہو سکتا۔ کچھ استعمال نہیں ہوا۔ تھوڑی دیر میں دوبارہ کوشش کریں۔',
    'inst.claimDo': 'یہ کوڈ استعمال کریں',
    'inst.claimDone': 'کوڈ استعمال ہو گیا۔ یہ کورس شامل کیا گیا: {title}',
    'inst.claimDoneNoTitle': 'کوڈ استعمال ہو گیا اور کورس شامل کر دیا گیا۔',
    'inst.claimDoneWhere': 'یہ آپ کو تعلیم کے صفحے پر ملے گا۔',
    'inst.claimAnother': 'ایک اور کوڈ استعمال کریں',
    'inst.claimUnsure':
      'ہم تصدیق نہیں کر سکے کہ کوڈ استعمال ہوا۔ دوبارہ کوشش کرنے سے پہلے تعلیم کا صفحہ دیکھیں۔',
    'inst.whyBadCode':
      'یہ کوڈ کی شکل نہیں ہے۔ ہر حرف اور ہندسہ اسکول کی دی ہوئی چیز سے ملا کر دیکھیں۔',
    'inst.whyCodeUnknown':
      'ہمارے پاس ایسا کوئی کوڈ نہیں۔ اسے اسکول کی دی ہوئی چیز سے ملا کر دیکھیں۔ کچھ استعمال نہیں ہوا۔',
    'inst.whyCodeUsed':
      'یہ کوڈ پہلے ہی استعمال ہو چکا ہے، اور کوڈ ایک بار کام کرتا ہے۔ اگر آپ نے خود استعمال کیا تھا تو کورس تعلیم کے صفحے پر ہے۔ اگر نہیں تو اسکول سے دوسرا کوڈ مانگیں۔',
    'inst.whyCodeVoided': 'اسکول نے یہ کوڈ واپس لے لیا ہے۔ اسکول سے کوئی اور کوڈ مانگیں۔',
    'inst.whyCourseGone':
      'جس کورس کے لیے یہ کوڈ ہے اس میں ابھی شامل نہیں ہوا جا سکتا۔ کوڈ استعمال نہیں ہوا، اس لیے آپ بعد میں دوبارہ آزما سکتے ہیں۔',
    'inst.whyNotYourLearner':
      'آپ اس سیکھنے والے کے لیے کوڈ استعمال نہیں کر سکتے۔ کوڈ استعمال نہیں ہوا۔',
    'inst.whyAlreadyEnrolled':
      'یہ سیکھنے والا پہلے ہی اس کورس میں ہے جس کے لیے یہ کوڈ ہے۔ کوڈ استعمال نہیں ہوا، اس لیے یہ کسی اور سیکھنے والے کے لیے استعمال ہو سکتا ہے۔',
    'inst.whySeatsClosed':
      'اسکولوں کے کوڈ ابھی استعمال نہیں ہو سکتے۔ کوڈ استعمال نہیں ہوا۔ بعد میں دوبارہ کوشش کریں۔',
    'inst.seatsTitle': 'ادارے کے خریدے ہوئے کورس',
    'inst.seatsUnread':
      'آپ کے ادارے نے جو خریدا وہ ابھی پڑھا نہیں جا سکا۔ اس کا یہ مطلب نہیں کہ اس نے کچھ نہیں خریدا۔ تھوڑی دیر میں دوبارہ کوشش کریں۔',
    'inst.seatsOff':
      'اسکولوں کے کوڈ ابھی بند ہیں۔ جب تک انہیں دوبارہ کھولا نہ جائے، کچھ نیا خریدا نہیں جا سکتا، کوئی کوڈ دیا نہیں جا سکتا اور کوئی کوڈ استعمال نہیں ہو سکتا۔ جو کورس پہلے کسی کوڈ سے شامل ہو چکے ہیں وہ واپس نہیں لیے جاتے۔',
    'inst.seatsMemberTitle': 'یہ صفحہ صرف ادارے کے منتظمین دیکھتے ہیں',
    'inst.seatsMemberBody':
      'آپ اس ادارے کے رکن ہیں، اس کے منتظم نہیں، اس لیے اس کے خریدے ہوئے کورس آپ کو نہیں دکھائے جاتے۔ اگر آپ کو کوڈ دیا گیا ہے تو وہ ایک دوسرے صفحے پر استعمال ہوتا ہے۔',
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
    'inst.claimTitle': 'استفاده از کد یک مدرسه',
    'inst.claimLede':
      'کدی را که مدرسه به شما داده بنویسید. یک بار کار می‌کند. برای یادگیرنده‌ای که انتخاب می‌کنید یک دوره اضافه می‌کند و شما چیزی نمی‌پردازید.',
    'inst.claimSchoolSees':
      'مدرسه می‌بیند کدام کدهایش استفاده شده و چه زمانی. نام یادگیرنده به آن نشان داده نمی‌شود. اگر مدرسه یادداشت کرده باشد که هر کد به چه کسی داده شده، می‌تواند بفهمد که کد شما استفاده شده است.',
    'inst.claimWithdraw':
      'مدرسه می‌تواند بعداً کدی را پس بگیرد. اگر کدی را که استفاده شده پس بگیرد، یادگیرنده دیگر نمی‌تواند دوره را باز کند. کاری که انجام شده نگه داشته می‌شود.',
    'inst.claimCodeLabel': 'کد شما',
    'inst.claimCodeHelp':
      'ده حرف و رقم، روی نامه یا کارتی که مدرسه داده است. حروف کوچک و خط تیره مهم نیست. کد هرگز حرف‌های I، L یا O ندارد و هرگز صفر یا یک ندارد.',
    'inst.claimWho': 'این دوره برای چه کسی است؟',
    'inst.claimWhoNote':
      'هر کد برای یک یادگیرنده است. وقتی برای یک یادگیرنده استفاده شد، برای دیگری قابل استفاده نیست.',
    'inst.claimMe': 'خودم',
    'inst.claimForMe': 'این دوره برای شما اضافه می‌شود.',
    'inst.claimLearnersUnread':
      'خواندن یادگیرنده‌های حساب شما اکنون ممکن نشد، پس هنوز نمی‌توان کد را اینجا استفاده کرد. چیزی استفاده نشد. کمی بعد دوباره تلاش کنید.',
    'inst.claimDo': 'استفاده از این کد',
    'inst.claimDone': 'کد استفاده شد. این دوره اضافه شد: {title}',
    'inst.claimDoneNoTitle': 'کد استفاده شد و دوره اضافه شد.',
    'inst.claimDoneWhere': 'آن را در صفحهٔ یادگیری پیدا می‌کنید.',
    'inst.claimAnother': 'استفاده از کدی دیگر',
    'inst.claimUnsure':
      'نتوانستیم مطمئن شویم که کد استفاده شده است. پیش از تلاش دوباره، صفحهٔ یادگیری را ببینید.',
    'inst.whyBadCode': 'این شکل یک کد نیست. هر حرف و رقم را با آنچه مدرسه به شما داده مقایسه کنید.',
    'inst.whyCodeUnknown':
      'کدی مانند این نداریم. آن را با آنچه مدرسه به شما داده مقایسه کنید. چیزی استفاده نشد.',
    'inst.whyCodeUsed':
      'این کد پیش‌تر استفاده شده است و هر کد یک بار کار می‌کند. اگر خودتان آن را استفاده کرده‌اید، دوره در صفحهٔ یادگیری است. اگر نه، از مدرسه کد دیگری بخواهید.',
    'inst.whyCodeVoided': 'مدرسه این کد را پس گرفته است. از مدرسه کدی تازه بخواهید.',
    'inst.whyCourseGone':
      'در حال حاضر نمی‌توان به دوره‌ای که این کد برای آن است پیوست. کد استفاده نشد، پس می‌توانید بعداً دوباره امتحان کنید.',
    'inst.whyNotYourLearner': 'شما نمی‌توانید برای آن یادگیرنده کد استفاده کنید. کد استفاده نشد.',
    'inst.whyAlreadyEnrolled':
      'آن یادگیرنده از پیش در دوره‌ای است که این کد برای آن است. کد استفاده نشد، پس می‌توان آن را برای یادگیرندهٔ دیگری استفاده کرد.',
    'inst.whySeatsClosed':
      'در حال حاضر نمی‌توان کدهای مدرسه‌ها را استفاده کرد. کد استفاده نشد. بعداً دوباره تلاش کنید.',
    'inst.seatsTitle': 'دوره‌هایی که مؤسسه خریده است',
    'inst.seatsUnread':
      'خواندن آنچه مؤسسهٔ شما خریده اکنون ممکن نشد. این به آن معنا نیست که چیزی نخریده است. کمی بعد دوباره تلاش کنید.',
    'inst.seatsOff':
      'کدهای مدرسه‌ها در حال حاضر خاموش است. تا وقتی دوباره روشن نشود، نه چیز تازه‌ای می‌توان خرید، نه کدی می‌توان داد و نه کدی می‌توان استفاده کرد. دوره‌هایی که پیش‌تر با کد اضافه شده‌اند پس گرفته نمی‌شوند.',
    'inst.seatsMemberTitle': 'فقط مدیران مؤسسه این صفحه را می‌بینند',
    'inst.seatsMemberBody':
      'شما عضو این مؤسسه هستید و از مدیران آن نیستید، پس دوره‌هایی که خریده برای شما فهرست نمی‌شود. اگر کدی به شما داده شده، در صفحهٔ دیگری به کار می‌رود.',
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
    'inst.claimTitle': 'استفاده از کود یک مکتب',
    'inst.claimLede':
      'کودی را که مکتب به شما داده بنویسید. یک بار کار می‌کند. برای شاگردی که انتخاب می‌کنید یک کورس اضافه می‌کند و شما چیزی نمی‌پردازید.',
    'inst.claimSchoolSees':
      'مکتب می‌بیند کدام کودهایش استفاده شده و چه وقت. نام شاگرد به آن نشان داده نمی‌شود. اگر مکتب یادداشت کرده باشد که هر کود به چه کسی داده شده، می‌تواند بفهمد که کود شما استفاده شده است.',
    'inst.claimWithdraw':
      'مکتب می‌تواند بعداً کودی را پس بگیرد. اگر کودی را که استفاده شده پس بگیرد، شاگرد دیگر نمی‌تواند کورس را باز کند. کاری که انجام شده نگهداری می‌شود.',
    'inst.claimCodeLabel': 'کود شما',
    'inst.claimCodeHelp':
      'ده حرف و رقم، روی مکتوب یا کارتی که مکتب داده است. حروف خرد و خط تیره مهم نیست. کود هرگز حرف‌های I، L یا O ندارد و هرگز صفر یا یک ندارد.',
    'inst.claimWho': 'این کورس برای چه کسی است؟',
    'inst.claimWhoNote':
      'هر کود برای یک شاگرد است. وقتی برای یک شاگرد استفاده شد، برای دیگری قابل استفاده نیست.',
    'inst.claimMe': 'خودم',
    'inst.claimForMe': 'این کورس برای شما اضافه می‌شود.',
    'inst.claimLearnersUnread':
      'خواندن شاگردان حساب شما فعلاً ممکن نشد، پس هنوز نمی‌توان کود را اینجا استفاده کرد. چیزی استفاده نشد. کمی بعد دوباره کوشش کنید.',
    'inst.claimDo': 'استفاده از این کود',
    'inst.claimDone': 'کود استفاده شد. این کورس اضافه شد: {title}',
    'inst.claimDoneNoTitle': 'کود استفاده شد و کورس اضافه شد.',
    'inst.claimDoneWhere': 'آن را در صفحهٔ آموزش پیدا می‌کنید.',
    'inst.claimAnother': 'استفاده از کودی دیگر',
    'inst.claimUnsure':
      'نتوانستیم مطمئن شویم که کود استفاده شده است. پیش از کوشش دوباره، صفحهٔ آموزش را ببینید.',
    'inst.whyBadCode': 'این شکل یک کود نیست. هر حرف و رقم را با آنچه مکتب به شما داده مقایسه کنید.',
    'inst.whyCodeUnknown':
      'کودی مانند این نداریم. آن را با آنچه مکتب به شما داده مقایسه کنید. چیزی استفاده نشد.',
    'inst.whyCodeUsed':
      'این کود قبلاً استفاده شده است و هر کود یک بار کار می‌کند. اگر خودتان آن را استفاده کرده‌اید، کورس در صفحهٔ آموزش است. اگر نه، از مکتب کود دیگری بخواهید.',
    'inst.whyCodeVoided': 'مکتب این کود را پس گرفته است. از مکتب کودی نو بخواهید.',
    'inst.whyCourseGone':
      'فعلاً نمی‌توان به کورسی که این کود برای آن است پیوست. کود استفاده نشد، پس می‌توانید بعداً دوباره امتحان کنید.',
    'inst.whyNotYourLearner': 'شما نمی‌توانید برای آن شاگرد کود استفاده کنید. کود استفاده نشد.',
    'inst.whyAlreadyEnrolled':
      'آن شاگرد از قبل در کورسی است که این کود برای آن است. کود استفاده نشد، پس می‌توان آن را برای شاگرد دیگری استفاده کرد.',
    'inst.whySeatsClosed':
      'فعلاً نمی‌توان کودهای مکتب‌ها را استفاده کرد. کود استفاده نشد. بعداً دوباره کوشش کنید.',
    'inst.seatsTitle': 'کورس‌هایی که مؤسسه خریده است',
    'inst.seatsUnread':
      'خواندن آنچه مؤسسهٔ شما خریده فعلاً ممکن نشد. این به آن معنا نیست که چیزی نخریده است. کمی بعد دوباره کوشش کنید.',
    'inst.seatsOff':
      'کودهای مکتب‌ها فعلاً خاموش است. تا وقتی دوباره روشن نشود، نه چیز نوی می‌توان خرید، نه کودی می‌توان داد و نه کودی می‌توان استفاده کرد. کورس‌هایی که قبلاً با کود اضافه شده‌اند پس گرفته نمی‌شوند.',
    'inst.seatsMemberTitle': 'تنها مدیران مؤسسه این صفحه را می‌بینند',
    'inst.seatsMemberBody':
      'شما عضو این مؤسسه هستید و از مدیران آن نیستید، پس کورس‌هایی که خریده برای شما فهرست نمی‌شود. اگر کودی به شما داده شده، در صفحهٔ دیگری به کار می‌رود.',
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
    'inst.claimTitle': 'Okuldan alınan kodu kullanma',
    'inst.claimLede':
      'Okulun size verdiği kodu yazın. Kod bir kez çalışır. Seçtiğiniz öğrenciye bir kurs ekler ve hiçbir şey ödemezsiniz.',
    'inst.claimSchoolSees':
      'Okul, kodlarından hangilerinin ne zaman kullanıldığını görür. Öğrencinin adı okula gösterilmez. Okul her kodu kime verdiğini not ettiyse, sizin kodunuzun kullanıldığını anlayabilir.',
    'inst.claimWithdraw':
      'Okul bir kodu sonradan geri çekebilir. Kullanılmış bir kodu geri çekerse öğrenci kursu artık açamaz. Yapılmış çalışmalar saklanır.',
    'inst.claimCodeLabel': 'Kodunuz',
    'inst.claimCodeHelp':
      'On harf ve rakam; okulun verdiği mektupta veya kartta yazar. Küçük harf ve tire fark etmez. Bir kodda I, L veya O harfleri hiç bulunmaz; sıfır veya bir de bulunmaz.',
    'inst.claimWho': 'Bu kurs kimin için?',
    'inst.claimWhoNote':
      'Bir kod tek bir öğrenci içindir. Bir öğrenci için kullanıldıktan sonra başkası için kullanılamaz.',
    'inst.claimMe': 'Kendim',
    'inst.claimForMe': 'Bu kurs sizin için eklenecek.',
    'inst.claimLearnersUnread':
      'Hesabınızdaki öğrenciler şu anda okunamadı, bu yüzden kod burada henüz kullanılamıyor. Hiçbir şey kullanılmadı. Biraz sonra yeniden deneyin.',
    'inst.claimDo': 'Bu kodu kullan',
    'inst.claimDone': 'Kod kullanıldı. Şu kurs eklendi: {title}',
    'inst.claimDoneNoTitle': 'Kod kullanıldı ve kurs eklendi.',
    'inst.claimDoneWhere': 'Kursu öğrenim sayfasında bulursunuz.',
    'inst.claimAnother': 'Başka bir kod kullan',
    'inst.claimUnsure':
      'Kodun kullanıldığını doğrulayamadık. Yeniden denemeden önce öğrenim sayfasına bakın.',
    'inst.whyBadCode':
      'Bu bir kodun biçimi değil. Her harfi ve rakamı okulun size verdiğiyle karşılaştırın.',
    'inst.whyCodeUnknown':
      'Böyle bir kodumuz yok. Kodu okulun size verdiğiyle karşılaştırın. Hiçbir şey kullanılmadı.',
    'inst.whyCodeUsed':
      'Bu kod daha önce kullanılmış ve bir kod yalnızca bir kez çalışır. Kodu siz kullandıysanız kurs öğrenim sayfasındadır. Kullanmadıysanız okuldan başka bir kod isteyin.',
    'inst.whyCodeVoided': 'Okul bu kodu geri çekti. Okuldan yeni bir kod isteyin.',
    'inst.whyCourseGone':
      'Bu kodun ait olduğu kursa şu anda katılınamıyor. Kod kullanılmadı, daha sonra yeniden deneyebilirsiniz.',
    'inst.whyNotYourLearner': 'Bu öğrenci için kod kullanamazsınız. Kod kullanılmadı.',
    'inst.whyAlreadyEnrolled':
      'Bu öğrenci, kodun ait olduğu kursa zaten kayıtlı. Kod kullanılmadı, başka bir öğrenci için kullanılabilir.',
    'inst.whySeatsClosed':
      'Okul kodları şu anda kullanılamıyor. Kod kullanılmadı. Daha sonra yeniden deneyin.',
    'inst.seatsTitle': 'Kurumun satın aldığı kurslar',
    'inst.seatsUnread':
      'Kurumunuzun satın aldıkları şu anda okunamadı. Bu, hiçbir şey satın almadığı anlamına gelmez. Biraz sonra yeniden deneyin.',
    'inst.seatsOff':
      'Okul kodları şu anda kapalı. Yeniden açılana kadar yeni bir şey satın alınamaz, kod verilemez ve kod kullanılamaz. Daha önce bir kodla eklenmiş kurslar geri alınmaz.',
    'inst.seatsMemberTitle': 'Bu sayfayı yalnızca kurumun yöneticileri görür',
    'inst.seatsMemberBody':
      'Bu kurumun üyesisiniz, yöneticisi değilsiniz; bu yüzden kurumun satın aldığı kurslar size listelenmez. Size bir kod verildiyse o kod başka bir sayfada kullanılır.',
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
    'inst.claimTitle': 'Pakai kode dari sekolah',
    'inst.claimLede':
      'Ketik kode yang diberikan sekolah kepada Anda. Kode berlaku satu kali. Kode itu menambahkan satu kursus untuk peserta didik yang Anda pilih, dan Anda tidak membayar apa pun.',
    'inst.claimSchoolSees':
      'Sekolah melihat kode mana yang sudah dipakai dan kapan. Nama peserta didik tidak ditampilkan kepada sekolah. Jika sekolah mencatat siapa yang diberi tiap kode, sekolah dapat mengetahui bahwa kode Anda sudah dipakai.',
    'inst.claimWithdraw':
      'Sekolah dapat menarik kembali sebuah kode di kemudian hari. Jika kode yang sudah dipakai ditarik, peserta didik tidak dapat lagi membuka kursus itu. Pekerjaan yang sudah dikerjakan tetap disimpan.',
    'inst.claimCodeLabel': 'Kode Anda',
    'inst.claimCodeHelp':
      'Sepuluh huruf dan angka, tertulis pada surat atau kartu dari sekolah. Huruf kecil dan tanda hubung tidak menjadi masalah. Kode tidak pernah memuat huruf I, L, atau O, dan tidak pernah memuat angka nol atau satu.',
    'inst.claimWho': 'Untuk siapa kursus ini?',
    'inst.claimWhoNote':
      'Satu kode untuk satu peserta didik. Setelah dipakai untuk satu peserta didik, kode tidak dapat dipakai untuk yang lain.',
    'inst.claimMe': 'Saya sendiri',
    'inst.claimForMe': 'Kursus ini akan ditambahkan untuk Anda.',
    'inst.claimLearnersUnread':
      'Peserta didik di akun Anda tidak dapat dibaca saat ini, jadi kode belum dapat dipakai di sini. Tidak ada yang terpakai. Coba lagi sebentar lagi.',
    'inst.claimDo': 'Pakai kode ini',
    'inst.claimDone': 'Kode sudah dipakai. Kursus ini ditambahkan: {title}',
    'inst.claimDoneNoTitle': 'Kode sudah dipakai dan kursus sudah ditambahkan.',
    'inst.claimDoneWhere': 'Anda akan menemukannya di halaman pembelajaran.',
    'inst.claimAnother': 'Pakai kode lain',
    'inst.claimUnsure':
      'Kami tidak dapat memastikan bahwa kode sudah dipakai. Lihat halaman pembelajaran sebelum mencoba lagi.',
    'inst.whyBadCode':
      'Itu bukan bentuk sebuah kode. Cocokkan tiap huruf dan angka dengan yang diberikan sekolah.',
    'inst.whyCodeUnknown':
      'Kami tidak memiliki kode seperti itu. Cocokkan dengan yang diberikan sekolah. Tidak ada yang terpakai.',
    'inst.whyCodeUsed':
      'Kode ini sudah pernah dipakai, dan satu kode hanya berlaku satu kali. Jika Anda sendiri yang memakainya, kursusnya ada di halaman pembelajaran. Jika bukan, mintalah kode lain kepada sekolah.',
    'inst.whyCodeVoided':
      'Sekolah telah menarik kembali kode ini. Mintalah kode baru kepada sekolah.',
    'inst.whyCourseGone':
      'Kursus untuk kode ini belum dapat diikuti saat ini. Kode tidak terpakai, jadi Anda dapat mencobanya lagi nanti.',
    'inst.whyNotYourLearner':
      'Anda tidak dapat memakai kode untuk peserta didik itu. Kode tidak terpakai.',
    'inst.whyAlreadyEnrolled':
      'Peserta didik itu sudah mengikuti kursus untuk kode ini. Kode tidak terpakai, jadi dapat dipakai untuk peserta didik lain.',
    'inst.whySeatsClosed':
      'Kode dari sekolah tidak dapat dipakai saat ini. Kode tidak terpakai. Coba lagi nanti.',
    'inst.seatsTitle': 'Kursus yang dibeli lembaga',
    'inst.seatsUnread':
      'Apa yang dibeli lembaga Anda tidak dapat dibaca saat ini. Ini tidak berarti lembaga tidak membeli apa pun. Coba lagi sebentar lagi.',
    'inst.seatsOff':
      'Kode dari sekolah sedang dimatikan saat ini. Sampai dihidupkan kembali, tidak ada hal baru yang dapat dibeli, tidak ada kode yang dapat dibagikan, dan tidak ada kode yang dapat dipakai. Kursus yang sudah ditambahkan dengan kode tidak dicabut.',
    'inst.seatsMemberTitle': 'Hanya pengelola lembaga yang melihat halaman ini',
    'inst.seatsMemberBody':
      'Anda anggota lembaga ini dan bukan salah satu pengelolanya, jadi kursus yang dibelinya tidak ditampilkan kepada Anda. Jika Anda diberi kode, kode itu dipakai di halaman lain.',
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
    'inst.claimTitle': 'Guna kod daripada sekolah',
    'inst.claimLede':
      'Taip kod yang diberikan oleh sekolah kepada anda. Kod itu berfungsi sekali sahaja. Kod itu menambah satu kursus untuk pelajar yang anda pilih, dan anda tidak membayar apa-apa.',
    'inst.claimSchoolSees':
      'Sekolah melihat kod mana yang telah digunakan dan bila. Nama pelajar tidak ditunjukkan kepada sekolah. Jika sekolah menyimpan catatan tentang siapa yang diberi setiap kod, sekolah boleh tahu bahawa kod anda telah digunakan.',
    'inst.claimWithdraw':
      'Sekolah boleh menarik balik sesuatu kod kemudian. Jika kod yang telah digunakan ditarik balik, pelajar tidak lagi dapat membuka kursus itu. Kerja yang telah dibuat tetap disimpan.',
    'inst.claimCodeLabel': 'Kod anda',
    'inst.claimCodeHelp':
      'Sepuluh huruf dan nombor, pada surat atau kad daripada sekolah. Huruf kecil dan tanda sempang tidak menjadi masalah. Kod tidak pernah mengandungi huruf I, L atau O, dan tidak pernah mengandungi sifar atau satu.',
    'inst.claimWho': 'Untuk siapa kursus ini?',
    'inst.claimWhoNote':
      'Satu kod untuk seorang pelajar. Setelah digunakan untuk seorang pelajar, kod itu tidak boleh digunakan untuk pelajar lain.',
    'inst.claimMe': 'Saya sendiri',
    'inst.claimForMe': 'Kursus ini akan ditambah untuk anda.',
    'inst.claimLearnersUnread':
      'Pelajar dalam akaun anda tidak dapat dibaca sekarang, jadi kod belum boleh digunakan di sini. Tiada apa-apa yang digunakan. Cuba lagi sebentar lagi.',
    'inst.claimDo': 'Guna kod ini',
    'inst.claimDone': 'Kod telah digunakan. Kursus ini telah ditambah: {title}',
    'inst.claimDoneNoTitle': 'Kod telah digunakan dan kursus telah ditambah.',
    'inst.claimDoneWhere': 'Anda akan menemuinya di halaman pembelajaran.',
    'inst.claimAnother': 'Guna kod lain',
    'inst.claimUnsure':
      'Kami tidak dapat mengesahkan bahawa kod telah digunakan. Lihat halaman pembelajaran sebelum mencuba lagi.',
    'inst.whyBadCode':
      'Itu bukan bentuk sesuatu kod. Semak setiap huruf dan nombor dengan apa yang diberikan oleh sekolah.',
    'inst.whyCodeUnknown':
      'Kami tidak mempunyai kod seperti itu. Semak dengan apa yang diberikan oleh sekolah. Tiada apa-apa yang digunakan.',
    'inst.whyCodeUsed':
      'Kod ini telah pun digunakan, dan sesuatu kod berfungsi sekali sahaja. Jika anda sendiri yang menggunakannya, kursus itu ada di halaman pembelajaran. Jika tidak, minta kod lain daripada sekolah.',
    'inst.whyCodeVoided': 'Sekolah telah menarik balik kod ini. Minta kod baharu daripada sekolah.',
    'inst.whyCourseGone':
      'Kursus bagi kod ini tidak dapat disertai buat masa ini. Kod tidak digunakan, jadi anda boleh mencubanya lagi kemudian.',
    'inst.whyNotYourLearner':
      'Anda tidak boleh menggunakan kod untuk pelajar itu. Kod tidak digunakan.',
    'inst.whyAlreadyEnrolled':
      'Pelajar itu sudah menyertai kursus bagi kod ini. Kod tidak digunakan, jadi kod itu boleh digunakan untuk pelajar lain.',
    'inst.whySeatsClosed':
      'Kod daripada sekolah tidak boleh digunakan buat masa ini. Kod tidak digunakan. Cuba lagi kemudian.',
    'inst.seatsTitle': 'Kursus yang dibeli oleh institusi',
    'inst.seatsUnread':
      'Apa yang dibeli oleh institusi anda tidak dapat dibaca sekarang. Ini tidak bermakna institusi itu tidak membeli apa-apa. Cuba lagi sebentar lagi.',
    'inst.seatsOff':
      'Kod daripada sekolah dimatikan buat masa ini. Sehingga dihidupkan semula, tiada perkara baharu boleh dibeli, tiada kod boleh diberikan dan tiada kod boleh digunakan. Kursus yang telah ditambah dengan kod tidak ditarik balik.',
    'inst.seatsMemberTitle': 'Hanya pentadbir institusi yang melihat halaman ini',
    'inst.seatsMemberBody':
      'Anda ahli institusi ini dan bukan salah seorang pentadbirnya, jadi kursus yang dibelinya tidak disenaraikan untuk anda. Jika anda diberi kod, kod itu digunakan di halaman lain.',
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
    'inst.claimTitle': 'স্কুলের দেওয়া কোড ব্যবহার',
    'inst.claimLede':
      'স্কুল আপনাকে যে কোড দিয়েছে তা লিখুন। এটি একবারই কাজ করে। আপনি যে শিক্ষার্থীকে বেছে নেন তার জন্য এটি একটি কোর্স যোগ করে, এবং আপনাকে কিছুই দিতে হয় না।',
    'inst.claimSchoolSees':
      'স্কুল দেখতে পায় তার কোন কোডগুলো ব্যবহার হয়েছে এবং কখন। শিক্ষার্থীর নাম স্কুলকে দেখানো হয় না। কোন কোড কাকে দেওয়া হয়েছিল তা স্কুল লিখে রাখলে, আপনার কোডটি ব্যবহার হয়েছে তা সে বুঝতে পারে।',
    'inst.claimWithdraw':
      'স্কুল পরে কোনো কোড ফিরিয়ে নিতে পারে। ব্যবহার হওয়া কোড ফিরিয়ে নিলে শিক্ষার্থী আর কোর্সটি খুলতে পারে না। যে কাজ হয়ে গেছে তা রেখে দেওয়া হয়।',
    'inst.claimCodeLabel': 'আপনার কোড',
    'inst.claimCodeHelp':
      'দশটি অক্ষর ও সংখ্যা, স্কুলের চিঠি বা কার্ডে লেখা। ছোট হাতের অক্ষর ও ড্যাশে কিছু যায় আসে না। কোডে কখনো I, L বা O অক্ষর থাকে না, এবং কখনো শূন্য বা এক থাকে না।',
    'inst.claimWho': 'এই কোর্সটি কার জন্য?',
    'inst.claimWhoNote':
      'একটি কোড একজন শিক্ষার্থীর জন্য। একজনের জন্য ব্যবহার হয়ে গেলে তা আর অন্যজনের জন্য ব্যবহার করা যায় না।',
    'inst.claimMe': 'আমি নিজে',
    'inst.claimForMe': 'এই কোর্সটি আপনার জন্য যোগ করা হবে।',
    'inst.claimLearnersUnread':
      'আপনার অ্যাকাউন্টের শিক্ষার্থীদের এখন পড়া যায়নি, তাই কোডটি এখনো এখানে ব্যবহার করা যাচ্ছে না। কিছুই ব্যবহার হয়নি। একটু পরে আবার চেষ্টা করুন।',
    'inst.claimDo': 'এই কোড ব্যবহার করুন',
    'inst.claimDone': 'কোডটি ব্যবহার হয়েছে। এই কোর্সটি যোগ হয়েছে: {title}',
    'inst.claimDoneNoTitle': 'কোডটি ব্যবহার হয়েছে এবং কোর্সটি যোগ হয়েছে।',
    'inst.claimDoneWhere': 'এটি আপনি শেখার পাতায় পাবেন।',
    'inst.claimAnother': 'আরেকটি কোড ব্যবহার করুন',
    'inst.claimUnsure':
      'কোডটি ব্যবহার হয়েছে কি না আমরা নিশ্চিত করতে পারিনি। আবার চেষ্টা করার আগে শেখার পাতাটি দেখুন।',
    'inst.whyBadCode':
      'এটি কোডের আকার নয়। স্কুল যা দিয়েছে তার সঙ্গে প্রতিটি অক্ষর ও সংখ্যা মিলিয়ে দেখুন।',
    'inst.whyCodeUnknown':
      'এমন কোনো কোড আমাদের কাছে নেই। স্কুল যা দিয়েছে তার সঙ্গে মিলিয়ে দেখুন। কিছুই ব্যবহার হয়নি।',
    'inst.whyCodeUsed':
      'এই কোডটি আগেই ব্যবহার হয়েছে, আর একটি কোড একবারই কাজ করে। আপনি নিজে ব্যবহার করে থাকলে কোর্সটি শেখার পাতায় আছে। না করে থাকলে স্কুলের কাছে আরেকটি কোড চান।',
    'inst.whyCodeVoided': 'স্কুল এই কোডটি ফিরিয়ে নিয়েছে। স্কুলের কাছে নতুন একটি কোড চান।',
    'inst.whyCourseGone':
      'এই কোডটি যে কোর্সের জন্য, তাতে এখন যোগ দেওয়া যাচ্ছে না। কোডটি ব্যবহার হয়নি, তাই পরে আবার চেষ্টা করতে পারেন।',
    'inst.whyNotYourLearner':
      'আপনি ওই শিক্ষার্থীর জন্য কোড ব্যবহার করতে পারেন না। কোডটি ব্যবহার হয়নি।',
    'inst.whyAlreadyEnrolled':
      'এই কোডটি যে কোর্সের জন্য, ওই শিক্ষার্থী আগে থেকেই সেই কোর্সে আছে। কোডটি ব্যবহার হয়নি, তাই এটি অন্য শিক্ষার্থীর জন্য ব্যবহার করা যাবে।',
    'inst.whySeatsClosed':
      'স্কুলের কোড এখন ব্যবহার করা যাচ্ছে না। কোডটি ব্যবহার হয়নি। পরে আবার চেষ্টা করুন।',
    'inst.seatsTitle': 'প্রতিষ্ঠান যে কোর্সগুলো কিনেছে',
    'inst.seatsUnread':
      'আপনার প্রতিষ্ঠান যা কিনেছে তা এখন পড়া যায়নি। এর মানে এই নয় যে সে কিছুই কেনেনি। একটু পরে আবার চেষ্টা করুন।',
    'inst.seatsOff':
      'স্কুলের কোড এখন বন্ধ আছে। আবার চালু না হওয়া পর্যন্ত নতুন কিছু কেনা যাবে না, কোনো কোড দেওয়া যাবে না এবং কোনো কোড ব্যবহার করা যাবে না। আগে কোড দিয়ে যোগ হওয়া কোর্সগুলো ফিরিয়ে নেওয়া হয় না।',
    'inst.seatsMemberTitle': 'কেবল প্রতিষ্ঠানের প্রশাসকেরা এই পাতাটি দেখেন',
    'inst.seatsMemberBody':
      'আপনি এই প্রতিষ্ঠানের সদস্য, এর প্রশাসক নন, তাই এটি যে কোর্সগুলো কিনেছে তা আপনাকে দেখানো হয় না। আপনাকে কোনো কোড দেওয়া হয়ে থাকলে তা অন্য একটি পাতায় ব্যবহার করা হয়।',
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
    'inst.claimTitle': 'स्कूल का कोड इस्तेमाल करना',
    'inst.claimLede':
      'वह कोड लिखें जो स्कूल ने आपको दिया है। यह एक बार काम करता है। यह आपके चुने हुए शिक्षार्थी के लिए एक कोर्स जोड़ता है, और आप कुछ नहीं चुकाते।',
    'inst.claimSchoolSees':
      'स्कूल देखता है कि उसके कौन से कोड इस्तेमाल हुए और कब। उसे शिक्षार्थी का नाम नहीं दिखाया जाता। अगर स्कूल ने लिख रखा है कि कौन सा कोड किसे दिया गया था, तो वह जान सकता है कि आपका कोड इस्तेमाल हुआ।',
    'inst.claimWithdraw':
      'स्कूल बाद में कोई कोड वापस ले सकता है। अगर वह इस्तेमाल हो चुका कोड वापस लेता है, तो शिक्षार्थी वह कोर्स आगे नहीं खोल सकता। जो काम हो चुका है वह रखा जाता है।',
    'inst.claimCodeLabel': 'आपका कोड',
    'inst.claimCodeHelp':
      'दस अक्षर और अंक, जो स्कूल के पत्र या कार्ड पर लिखे हैं। छोटे अक्षरों और डैश से फ़र्क़ नहीं पड़ता। कोड में I, L या O अक्षर कभी नहीं होते, और शून्य या एक भी कभी नहीं होता।',
    'inst.claimWho': 'यह कोर्स किसके लिए है?',
    'inst.claimWhoNote':
      'एक कोड एक शिक्षार्थी के लिए है। एक बार किसी के लिए इस्तेमाल हो जाए तो वह किसी और के लिए इस्तेमाल नहीं हो सकता।',
    'inst.claimMe': 'मेरे अपने लिए',
    'inst.claimForMe': 'यह कोर्स आपके लिए जोड़ा जाएगा।',
    'inst.claimLearnersUnread':
      'आपके खाते के शिक्षार्थी अभी पढ़े नहीं जा सके, इसलिए कोड अभी यहाँ इस्तेमाल नहीं हो सकता। कुछ भी इस्तेमाल नहीं हुआ। थोड़ी देर में फिर कोशिश करें।',
    'inst.claimDo': 'यह कोड इस्तेमाल करें',
    'inst.claimDone': 'कोड इस्तेमाल हो गया। यह कोर्स जोड़ा गया: {title}',
    'inst.claimDoneNoTitle': 'कोड इस्तेमाल हो गया और कोर्स जोड़ दिया गया।',
    'inst.claimDoneWhere': 'यह आपको पढ़ाई के पृष्ठ पर मिलेगा।',
    'inst.claimAnother': 'एक और कोड इस्तेमाल करें',
    'inst.claimUnsure':
      'हम पुष्टि नहीं कर सके कि कोड इस्तेमाल हुआ। फिर कोशिश करने से पहले पढ़ाई का पृष्ठ देखें।',
    'inst.whyBadCode':
      'यह कोड का रूप नहीं है। हर अक्षर और अंक को स्कूल की दी हुई चीज़ से मिलाकर देखें।',
    'inst.whyCodeUnknown':
      'हमारे पास ऐसा कोई कोड नहीं है। इसे स्कूल की दी हुई चीज़ से मिलाकर देखें। कुछ भी इस्तेमाल नहीं हुआ।',
    'inst.whyCodeUsed':
      'यह कोड पहले ही इस्तेमाल हो चुका है, और कोड एक बार काम करता है। अगर आपने ख़ुद इस्तेमाल किया था, तो कोर्स पढ़ाई के पृष्ठ पर है। अगर नहीं, तो स्कूल से दूसरा कोड माँगें।',
    'inst.whyCodeVoided': 'स्कूल ने यह कोड वापस ले लिया है। स्कूल से कोई और कोड माँगें।',
    'inst.whyCourseGone':
      'जिस कोर्स के लिए यह कोड है, उसमें अभी शामिल नहीं हुआ जा सकता। कोड इस्तेमाल नहीं हुआ, इसलिए आप बाद में फिर आज़मा सकते हैं।',
    'inst.whyNotYourLearner':
      'आप उस शिक्षार्थी के लिए कोड इस्तेमाल नहीं कर सकते। कोड इस्तेमाल नहीं हुआ।',
    'inst.whyAlreadyEnrolled':
      'वह शिक्षार्थी पहले से उस कोर्स में है जिसके लिए यह कोड है। कोड इस्तेमाल नहीं हुआ, इसलिए यह किसी और शिक्षार्थी के लिए इस्तेमाल हो सकता है।',
    'inst.whySeatsClosed':
      'स्कूलों के कोड अभी इस्तेमाल नहीं हो सकते। कोड इस्तेमाल नहीं हुआ। बाद में फिर कोशिश करें।',
    'inst.seatsTitle': 'संस्था के ख़रीदे हुए कोर्स',
    'inst.seatsUnread':
      'आपकी संस्था ने जो ख़रीदा वह अभी पढ़ा नहीं जा सका। इसका यह अर्थ नहीं कि उसने कुछ नहीं ख़रीदा। थोड़ी देर में फिर कोशिश करें।',
    'inst.seatsOff':
      'स्कूलों के कोड अभी बंद हैं। जब तक इन्हें फिर चालू नहीं किया जाता, कुछ नया ख़रीदा नहीं जा सकता, कोई कोड दिया नहीं जा सकता और कोई कोड इस्तेमाल नहीं हो सकता। जो कोर्स पहले किसी कोड से जुड़ चुके हैं, वे वापस नहीं लिए जाते।',
    'inst.seatsMemberTitle': 'यह पृष्ठ केवल संस्था के प्रशासक देखते हैं',
    'inst.seatsMemberBody':
      'आप इस संस्था के सदस्य हैं, इसके प्रशासक नहीं, इसलिए इसके ख़रीदे हुए कोर्स आपको नहीं दिखाए जाते। अगर आपको कोई कोड दिया गया है, तो वह दूसरे पृष्ठ पर इस्तेमाल होता है।',
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
    'inst.claimTitle': 'Utiliser un code remis par une école',
    'inst.claimLede':
      'Saisissez le code que l’école vous a remis. Il ne fonctionne qu’une fois. Il ajoute un cours pour l’apprenant que vous choisissez, et vous ne payez rien.',
    'inst.claimSchoolSees':
      'L’école voit lesquels de ses codes ont été utilisés et quand. Le nom de l’apprenant ne lui est pas montré. Si l’école a noté à qui chaque code a été remis, elle peut savoir que le vôtre a été utilisé.',
    'inst.claimWithdraw':
      'L’école peut retirer un code plus tard. Si elle retire un code déjà utilisé, l’apprenant ne peut plus ouvrir le cours. Le travail déjà fait est conservé.',
    'inst.claimCodeLabel': 'Votre code',
    'inst.claimCodeHelp':
      'Dix lettres et chiffres, sur la lettre ou la carte remise par l’école. Les minuscules et le tiret n’ont pas d’importance. Un code ne contient jamais les lettres I, L ou O, ni de zéro ni de un.',
    'inst.claimWho': 'Pour qui est ce cours ?',
    'inst.claimWhoNote':
      'Un code vaut pour un seul apprenant. Une fois utilisé pour un apprenant, il ne peut plus l’être pour un autre.',
    'inst.claimMe': 'Moi-même',
    'inst.claimForMe': 'Ce cours sera ajouté pour vous.',
    'inst.claimLearnersUnread':
      'Les apprenants de votre compte n’ont pas pu être lus pour l’instant ; le code ne peut donc pas encore être utilisé ici. Rien n’a été utilisé. Réessayez dans un instant.',
    'inst.claimDo': 'Utiliser ce code',
    'inst.claimDone': 'Le code a été utilisé. Ce cours a été ajouté : {title}',
    'inst.claimDoneNoTitle': 'Le code a été utilisé et le cours a été ajouté.',
    'inst.claimDoneWhere': 'Vous le trouverez sur la page d’apprentissage.',
    'inst.claimAnother': 'Utiliser un autre code',
    'inst.claimUnsure':
      'Nous n’avons pas pu confirmer que le code a été utilisé. Regardez la page d’apprentissage avant de réessayer.',
    'inst.whyBadCode':
      'Ce n’est pas la forme d’un code. Vérifiez chaque lettre et chaque chiffre avec ce que l’école vous a remis.',
    'inst.whyCodeUnknown':
      'Nous n’avons aucun code comme celui-ci. Vérifiez-le avec ce que l’école vous a remis. Rien n’a été utilisé.',
    'inst.whyCodeUsed':
      'Ce code a déjà été utilisé, et un code ne fonctionne qu’une fois. Si vous l’avez utilisé vous-même, le cours est sur la page d’apprentissage. Sinon, demandez un autre code à l’école.',
    'inst.whyCodeVoided': 'L’école a retiré ce code. Demandez-lui-en un nouveau.',
    'inst.whyCourseGone':
      'Le cours auquel ce code donne accès ne peut pas être rejoint pour le moment. Le code n’a pas été utilisé ; vous pourrez réessayer plus tard.',
    'inst.whyNotYourLearner':
      'Vous ne pouvez pas utiliser de code pour cet apprenant. Le code n’a pas été utilisé.',
    'inst.whyAlreadyEnrolled':
      'Cet apprenant suit déjà le cours auquel ce code donne accès. Le code n’a pas été utilisé ; il peut servir à un autre apprenant.',
    'inst.whySeatsClosed':
      'Les codes des écoles ne peuvent pas être utilisés pour le moment. Le code n’a pas été utilisé. Réessayez plus tard.',
    'inst.seatsTitle': 'Cours achetés par l’établissement',
    'inst.seatsUnread':
      'Ce que votre établissement a acheté n’a pas pu être lu pour l’instant. Cela ne veut pas dire qu’il n’a rien acheté. Réessayez dans un instant.',
    'inst.seatsOff':
      'Les codes des écoles sont désactivés pour le moment. Tant qu’ils ne sont pas réactivés, rien de nouveau ne peut être acheté, aucun code ne peut être remis et aucun code ne peut être utilisé. Les cours déjà ajoutés par un code ne sont pas retirés.',
    'inst.seatsMemberTitle': 'Seuls les administrateurs de l’établissement voient cette page',
    'inst.seatsMemberBody':
      'Vous êtes membre de cet établissement et non l’un de ses administrateurs ; les cours qu’il a achetés ne vous sont donc pas présentés. Si un code vous a été remis, il s’utilise sur une autre page.',
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
    'inst.claimTitle': 'Usar un código de una escuela',
    'inst.claimLede':
      'Escriba el código que le dio la escuela. Funciona una sola vez. Añade un curso para el alumno que usted elija, y no paga nada.',
    'inst.claimSchoolSees':
      'La escuela ve cuáles de sus códigos se han usado y cuándo. No se le muestra el nombre del alumno. Si la escuela anotó a quién le dio cada código, puede saber que el suyo se usó.',
    'inst.claimWithdraw':
      'La escuela puede retirar un código más adelante. Si retira uno que ya se usó, el alumno ya no puede abrir el curso. El trabajo ya hecho se conserva.',
    'inst.claimCodeLabel': 'Su código',
    'inst.claimCodeHelp':
      'Diez letras y números, en la carta o la tarjeta de la escuela. Las minúsculas y el guion no importan. Un código nunca tiene las letras I, L u O, ni un cero ni un uno.',
    'inst.claimWho': '¿Para quién es este curso?',
    'inst.claimWhoNote':
      'Un código es para un solo alumno. Una vez usado para un alumno, no se puede usar para otro.',
    'inst.claimMe': 'Para mí',
    'inst.claimForMe': 'Este curso se añadirá para usted.',
    'inst.claimLearnersUnread':
      'Los alumnos de su cuenta no se pudieron leer en este momento, así que el código aún no se puede usar aquí. No se usó nada. Inténtelo de nuevo en un momento.',
    'inst.claimDo': 'Usar este código',
    'inst.claimDone': 'El código se usó. Se añadió este curso: {title}',
    'inst.claimDoneNoTitle': 'El código se usó y el curso se añadió.',
    'inst.claimDoneWhere': 'Lo encontrará en la página de aprendizaje.',
    'inst.claimAnother': 'Usar otro código',
    'inst.claimUnsure':
      'No pudimos confirmar que el código se haya usado. Mire la página de aprendizaje antes de intentarlo de nuevo.',
    'inst.whyBadCode':
      'Esa no es la forma de un código. Compare cada letra y cada número con lo que le dio la escuela.',
    'inst.whyCodeUnknown':
      'No tenemos ningún código como ese. Compárelo con lo que le dio la escuela. No se usó nada.',
    'inst.whyCodeUsed':
      'Este código ya se usó, y un código funciona una sola vez. Si lo usó usted, el curso está en la página de aprendizaje. Si no, pida otro código a la escuela.',
    'inst.whyCodeVoided': 'La escuela ha retirado este código. Pida uno nuevo a la escuela.',
    'inst.whyCourseGone':
      'Por ahora no es posible unirse al curso de este código. El código no se usó, así que puede probarlo más tarde.',
    'inst.whyNotYourLearner': 'No puede usar un código para ese alumno. El código no se usó.',
    'inst.whyAlreadyEnrolled':
      'Ese alumno ya está en el curso de este código. El código no se usó, así que se puede usar para otro alumno.',
    'inst.whySeatsClosed':
      'Los códigos de escuelas no se pueden usar por ahora. El código no se usó. Inténtelo más tarde.',
    'inst.seatsTitle': 'Cursos que compró la institución',
    'inst.seatsUnread':
      'Lo que compró su institución no se pudo leer en este momento. Esto no significa que no haya comprado nada. Inténtelo de nuevo en un momento.',
    'inst.seatsOff':
      'Los códigos de escuelas están desactivados por ahora. Hasta que se activen de nuevo, no se puede comprar nada nuevo, no se puede entregar ningún código y no se puede usar ningún código. Los cursos ya añadidos con un código no se retiran.',
    'inst.seatsMemberTitle': 'Solo los administradores de la institución ven esta página',
    'inst.seatsMemberBody':
      'Usted es miembro de esta institución y no uno de sus administradores, así que no se le muestran los cursos que compró. Si le dieron un código, se usa en otra página.',
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
    'inst.claimTitle': 'Usar um código de uma escola',
    'inst.claimLede':
      'Escreva o código que a escola lhe deu. Funciona uma só vez. Acrescenta um curso para o aluno que escolher, e não paga nada.',
    'inst.claimSchoolSees':
      'A escola vê quais dos seus códigos foram usados e quando. O nome do aluno não lhe é mostrado. Se a escola anotou a quem deu cada código, pode saber que o seu foi usado.',
    'inst.claimWithdraw':
      'A escola pode retirar um código mais tarde. Se retirar um que já foi usado, o aluno deixa de poder abrir o curso. O trabalho já feito é guardado.',
    'inst.claimCodeLabel': 'O seu código',
    'inst.claimCodeHelp':
      'Dez letras e números, na carta ou no cartão da escola. As minúsculas e o hífen não importam. Um código nunca tem as letras I, L ou O, nem um zero nem um um.',
    'inst.claimWho': 'Para quem é este curso?',
    'inst.claimWhoNote':
      'Um código é para um só aluno. Depois de usado para um aluno, não pode ser usado para outro.',
    'inst.claimMe': 'Para mim',
    'inst.claimForMe': 'Este curso será acrescentado para si.',
    'inst.claimLearnersUnread':
      'Não foi possível ler os alunos da sua conta neste momento, por isso o código ainda não pode ser usado aqui. Nada foi usado. Tente de novo daqui a pouco.',
    'inst.claimDo': 'Usar este código',
    'inst.claimDone': 'O código foi usado. Foi acrescentado este curso: {title}',
    'inst.claimDoneNoTitle': 'O código foi usado e o curso foi acrescentado.',
    'inst.claimDoneWhere': 'Vai encontrá-lo na página de aprendizagem.',
    'inst.claimAnother': 'Usar outro código',
    'inst.claimUnsure':
      'Não conseguimos confirmar que o código foi usado. Veja a página de aprendizagem antes de tentar de novo.',
    'inst.whyBadCode':
      'Essa não é a forma de um código. Compare cada letra e cada número com o que a escola lhe deu.',
    'inst.whyCodeUnknown':
      'Não temos nenhum código como esse. Compare-o com o que a escola lhe deu. Nada foi usado.',
    'inst.whyCodeUsed':
      'Este código já foi usado, e um código funciona uma só vez. Se foi você que o usou, o curso está na página de aprendizagem. Se não, peça outro código à escola.',
    'inst.whyCodeVoided': 'A escola retirou este código. Peça um novo à escola.',
    'inst.whyCourseGone':
      'De momento não é possível entrar no curso deste código. O código não foi usado, por isso pode tentar mais tarde.',
    'inst.whyNotYourLearner': 'Não pode usar um código para esse aluno. O código não foi usado.',
    'inst.whyAlreadyEnrolled':
      'Esse aluno já está no curso deste código. O código não foi usado, por isso pode ser usado para outro aluno.',
    'inst.whySeatsClosed':
      'Os códigos de escolas não podem ser usados de momento. O código não foi usado. Tente mais tarde.',
    'inst.seatsTitle': 'Cursos que a instituição comprou',
    'inst.seatsUnread':
      'Não foi possível ler neste momento o que a sua instituição comprou. Isto não significa que não tenha comprado nada. Tente de novo daqui a pouco.',
    'inst.seatsOff':
      'Os códigos de escolas estão desligados de momento. Até voltarem a ser ligados, não se pode comprar nada de novo, não se pode entregar nenhum código e não se pode usar nenhum código. Os cursos já acrescentados por um código não são retirados.',
    'inst.seatsMemberTitle': 'Só os administradores da instituição veem esta página',
    'inst.seatsMemberBody':
      'É membro desta instituição e não um dos seus administradores, por isso os cursos que ela comprou não lhe são mostrados. Se lhe deram um código, ele é usado noutra página.',
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
    'inst.claimTitle': 'Tumia msimbo kutoka shuleni',
    'inst.claimLede':
      'Andika msimbo uliopewa na shule. Unafanya kazi mara moja tu. Unaongeza kozi kwa mwanafunzi unayemchagua, na hulipi chochote.',
    'inst.claimSchoolSees':
      'Shule huona ni misimbo yake ipi imetumika na lini. Haionyeshwi jina la mwanafunzi. Ikiwa shule iliandika ni nani alipewa kila msimbo, inaweza kujua kwamba msimbo wako umetumika.',
    'inst.claimWithdraw':
      'Shule inaweza kuuondoa msimbo baadaye. Ikiuondoa msimbo uliokwisha tumika, mwanafunzi hataweza tena kuifungua kozi. Kazi iliyokwisha fanyika huhifadhiwa.',
    'inst.claimCodeLabel': 'Msimbo wako',
    'inst.claimCodeHelp':
      'Herufi na namba kumi, kwenye barua au kadi kutoka shuleni. Herufi ndogo na kistari havijalishi. Msimbo hauna kamwe herufi I, L au O, wala sifuri au moja.',
    'inst.claimWho': 'Kozi hii ni ya nani?',
    'inst.claimWhoNote':
      'Msimbo mmoja ni wa mwanafunzi mmoja. Ukishatumika kwa mwanafunzi mmoja, hauwezi kutumika kwa mwingine.',
    'inst.claimMe': 'Mimi mwenyewe',
    'inst.claimForMe': 'Kozi hii itaongezwa kwa ajili yako.',
    'inst.claimLearnersUnread':
      'Wanafunzi walio kwenye akaunti yako hawakuweza kusomwa sasa hivi, kwa hiyo msimbo hauwezi kutumika hapa bado. Hakuna kilichotumika. Jaribu tena baada ya muda mfupi.',
    'inst.claimDo': 'Tumia msimbo huu',
    'inst.claimDone': 'Msimbo umetumika. Kozi hii imeongezwa: {title}',
    'inst.claimDoneNoTitle': 'Msimbo umetumika na kozi imeongezwa.',
    'inst.claimDoneWhere': 'Utaipata kwenye ukurasa wa masomo.',
    'inst.claimAnother': 'Tumia msimbo mwingine',
    'inst.claimUnsure':
      'Hatukuweza kuthibitisha kwamba msimbo umetumika. Angalia ukurasa wa masomo kabla ya kujaribu tena.',
    'inst.whyBadCode':
      'Huo si muundo wa msimbo. Linganisha kila herufi na namba na kile ulichopewa na shule.',
    'inst.whyCodeUnknown':
      'Hatuna msimbo kama huo. Ulinganishe na kile ulichopewa na shule. Hakuna kilichotumika.',
    'inst.whyCodeUsed':
      'Msimbo huu umeshatumika, na msimbo hufanya kazi mara moja tu. Ikiwa uliutumia wewe mwenyewe, kozi iko kwenye ukurasa wa masomo. Ikiwa sivyo, omba msimbo mwingine kutoka shuleni.',
    'inst.whyCodeVoided': 'Shule imeuondoa msimbo huu. Omba msimbo mpya kutoka shuleni.',
    'inst.whyCourseGone':
      'Kozi ambayo msimbo huu ni wake haiwezi kujiungwa kwa sasa. Msimbo haukutumika, kwa hiyo unaweza kuujaribu tena baadaye.',
    'inst.whyNotYourLearner': 'Huwezi kutumia msimbo kwa mwanafunzi huyo. Msimbo haukutumika.',
    'inst.whyAlreadyEnrolled':
      'Mwanafunzi huyo tayari yuko kwenye kozi ambayo msimbo huu ni wake. Msimbo haukutumika, kwa hiyo unaweza kutumika kwa mwanafunzi mwingine.',
    'inst.whySeatsClosed':
      'Misimbo kutoka shuleni haiwezi kutumika kwa sasa. Msimbo haukutumika. Jaribu tena baadaye.',
    'inst.seatsTitle': 'Kozi ambazo taasisi ilinunua',
    'inst.seatsUnread':
      'Kile ambacho taasisi yako ilinunua hakikuweza kusomwa sasa hivi. Hii haimaanishi kwamba haikununua chochote. Jaribu tena baada ya muda mfupi.',
    'inst.seatsOff':
      'Misimbo kutoka shuleni imezimwa kwa sasa. Hadi iwashwe tena, hakuna kipya kinachoweza kununuliwa, hakuna msimbo unaoweza kutolewa na hakuna msimbo unaoweza kutumika. Kozi zilizokwisha ongezwa kwa msimbo haziondolewi.',
    'inst.seatsMemberTitle': 'Wasimamizi wa taasisi pekee ndio huuona ukurasa huu',
    'inst.seatsMemberBody':
      'Wewe ni mwanachama wa taasisi hii na si mmoja wa wasimamizi wake, kwa hiyo kozi ilizonunua hazionyeshwi kwako. Ikiwa ulipewa msimbo, unatumika kwenye ukurasa mwingine.',
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
    'inst.claimTitle': 'Gebruik ’n kode van ’n skool',
    'inst.claimLede':
      'Tik die kode wat die skool vir jou gegee het. Dit werk een keer. Dit voeg ’n kursus by vir die leerder wat jy kies, en jy betaal niks.',
    'inst.claimSchoolSees':
      'Die skool sien watter van sy kodes gebruik is en wanneer. Die leerder se naam word nie vir die skool gewys nie. As die skool aangeteken het wie elke kode gekry het, kan dit weet dat joune gebruik is.',
    'inst.claimWithdraw':
      'Die skool kan ’n kode later terugtrek. As dit een terugtrek wat reeds gebruik is, kan die leerder nie meer die kursus oopmaak nie. Die werk wat reeds gedoen is, word gehou.',
    'inst.claimCodeLabel': 'Jou kode',
    'inst.claimCodeHelp':
      'Tien letters en syfers, op die brief of kaart van die skool. Kleinletters en die koppelteken maak nie saak nie. ’n Kode het nooit die letters I, L of O nie, en nooit ’n nul of ’n een nie.',
    'inst.claimWho': 'Vir wie is hierdie kursus?',
    'inst.claimWhoNote':
      'Een kode is vir een leerder. Sodra dit vir een leerder gebruik is, kan dit nie vir ’n ander gebruik word nie.',
    'inst.claimMe': 'Ekself',
    'inst.claimForMe': 'Hierdie kursus sal vir jou bygevoeg word.',
    'inst.claimLearnersUnread':
      'Die leerders op jou rekening kon nie nou gelees word nie, dus kan die kode nog nie hier gebruik word nie. Niks is gebruik nie. Probeer oor ’n oomblik weer.',
    'inst.claimDo': 'Gebruik hierdie kode',
    'inst.claimDone': 'Die kode is gebruik. Hierdie kursus is bygevoeg: {title}',
    'inst.claimDoneNoTitle': 'Die kode is gebruik en die kursus is bygevoeg.',
    'inst.claimDoneWhere': 'Jy sal dit op die leerbladsy kry.',
    'inst.claimAnother': 'Gebruik nog ’n kode',
    'inst.claimUnsure':
      'Ons kon nie bevestig dat die kode gebruik is nie. Kyk op die leerbladsy voordat jy weer probeer.',
    'inst.whyBadCode':
      'Dit is nie die vorm van ’n kode nie. Vergelyk elke letter en syfer met wat die skool vir jou gegee het.',
    'inst.whyCodeUnknown':
      'Ons het geen kode soos daardie nie. Vergelyk dit met wat die skool vir jou gegee het. Niks is gebruik nie.',
    'inst.whyCodeUsed':
      'Hierdie kode is reeds gebruik, en ’n kode werk een keer. As jy dit self gebruik het, is die kursus op die leerbladsy. Indien nie, vra die skool vir nog ’n kode.',
    'inst.whyCodeVoided': 'Die skool het hierdie kode teruggetrek. Vra die skool vir ’n nuwe een.',
    'inst.whyCourseGone':
      'Die kursus waarvoor hierdie kode is, kan nie op die oomblik aangesluit word nie. Die kode is nie gebruik nie, dus kan jy dit later weer probeer.',
    'inst.whyNotYourLearner':
      'Jy kan nie ’n kode vir daardie leerder gebruik nie. Die kode is nie gebruik nie.',
    'inst.whyAlreadyEnrolled':
      'Daardie leerder is reeds in die kursus waarvoor hierdie kode is. Die kode is nie gebruik nie, dus kan dit vir ’n ander leerder gebruik word.',
    'inst.whySeatsClosed':
      'Kodes van skole kan nie op die oomblik gebruik word nie. Die kode is nie gebruik nie. Probeer later weer.',
    'inst.seatsTitle': 'Kursusse wat die instelling gekoop het',
    'inst.seatsUnread':
      'Wat jou instelling gekoop het, kon nie nou gelees word nie. Dit beteken nie dat dit niks gekoop het nie. Probeer oor ’n oomblik weer.',
    'inst.seatsOff':
      'Kodes van skole is op die oomblik afgeskakel. Totdat hulle weer aangeskakel word, kan niks nuuts gekoop word nie, kan geen kode uitgegee word nie en kan geen kode gebruik word nie. Kursusse wat reeds deur ’n kode bygevoeg is, word nie weggeneem nie.',
    'inst.seatsMemberTitle': 'Net die instelling se administrateurs sien hierdie bladsy',
    'inst.seatsMemberBody':
      'Jy is ’n lid van hierdie instelling en nie een van sy administrateurs nie, dus word die kursusse wat dit gekoop het nie vir jou gelys nie. As jy ’n kode gekry het, word dit op ’n ander bladsy gebruik.',
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
    'inst.claimTitle': '使用学校给的代码',
    'inst.claimLede': '输入学校给你的代码。它只能使用一次。它会为你选择的学习者添加一门课程，你不需要付款。',
    'inst.claimSchoolSees': '学校能看到它的哪些代码已被使用以及使用时间。学校看不到学习者的姓名。如果学校记下了每个代码发给了谁，它就能知道你的代码已被使用。',
    'inst.claimWithdraw': '学校以后可以撤回代码。如果撤回的是已使用的代码，学习者将无法再打开该课程。已经完成的学习内容会保留。',
    'inst.claimCodeLabel': '你的代码',
    'inst.claimCodeHelp': '十个字母和数字，写在学校给的信或卡片上。小写字母和短横线都没有关系。代码中从不出现字母 I、L 或 O，也从不出现零或一。',
    'inst.claimWho': '这门课程是给谁的？',
    'inst.claimWhoNote': '一个代码只对应一位学习者。为一位学习者使用后，就不能再为另一位使用。',
    'inst.claimMe': '我自己',
    'inst.claimForMe': '这门课程将添加给你。',
    'inst.claimLearnersUnread': '现在无法读取你账户中的学习者，所以代码暂时不能在这里使用。没有使用任何代码。请稍后再试。',
    'inst.claimDo': '使用这个代码',
    'inst.claimDone': '代码已使用。已添加这门课程：{title}',
    'inst.claimDoneNoTitle': '代码已使用，课程已添加。',
    'inst.claimDoneWhere': '你可以在学习页面找到它。',
    'inst.claimAnother': '使用另一个代码',
    'inst.claimUnsure': '我们无法确认代码是否已被使用。再次尝试之前，请先查看学习页面。',
    'inst.whyBadCode': '这不是代码的格式。请对照学校给你的内容，核对每个字母和数字。',
    'inst.whyCodeUnknown': '我们没有这样的代码。请对照学校给你的内容核对。没有使用任何代码。',
    'inst.whyCodeUsed': '这个代码已经被使用过，而一个代码只能使用一次。如果是你自己用的，课程就在学习页面上。如果不是，请向学校再要一个代码。',
    'inst.whyCodeVoided': '学校已撤回这个代码。请向学校要一个新的。',
    'inst.whyCourseGone': '这个代码对应的课程目前无法加入。代码没有被使用，你可以稍后再试。',
    'inst.whyNotYourLearner': '你不能为那位学习者使用代码。代码没有被使用。',
    'inst.whyAlreadyEnrolled': '那位学习者已经在这个代码对应的课程中。代码没有被使用，可以用于另一位学习者。',
    'inst.whySeatsClosed': '目前无法使用学校的代码。代码没有被使用。请稍后再试。',
    'inst.seatsTitle': '机构购买的课程',
    'inst.seatsUnread': '现在无法读取你的机构购买的内容。这并不表示它什么都没有购买。请稍后再试。',
    'inst.seatsOff': '学校代码目前已关闭。在重新开启之前，不能购买新的内容，不能发放代码，也不能使用代码。此前通过代码添加的课程不会被收回。',
    'inst.seatsMemberTitle': '只有机构的管理员能看到此页面',
    'inst.seatsMemberBody': '你是这个机构的成员，而不是它的管理员，所以不会向你列出它购买的课程。如果你拿到了代码，它在另一个页面使用。',
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
    'inst.claimTitle': '使用學校給的代碼',
    'inst.claimLede': '輸入學校給你的代碼。它只能使用一次。它會為你選擇的學習者加入一門課程，你不需要付款。',
    'inst.claimSchoolSees': '學校能看到它的哪些代碼已被使用以及使用時間。學校看不到學習者的姓名。如果學校記下了每個代碼發給了誰，它就能知道你的代碼已被使用。',
    'inst.claimWithdraw': '學校之後可以撤回代碼。如果撤回的是已使用的代碼，學習者將無法再開啟該課程。已經完成的學習內容會保留。',
    'inst.claimCodeLabel': '你的代碼',
    'inst.claimCodeHelp': '十個字母和數字，寫在學校給的信或卡片上。小寫字母和短橫線都沒有關係。代碼中從不出現字母 I、L 或 O，也從不出現零或一。',
    'inst.claimWho': '這門課程是給誰的？',
    'inst.claimWhoNote': '一個代碼只對應一位學習者。為一位學習者使用後，就不能再為另一位使用。',
    'inst.claimMe': '我自己',
    'inst.claimForMe': '這門課程將加入給你。',
    'inst.claimLearnersUnread': '現在無法讀取你帳戶中的學習者，所以代碼暫時不能在這裡使用。沒有使用任何代碼。請稍後再試。',
    'inst.claimDo': '使用這個代碼',
    'inst.claimDone': '代碼已使用。已加入這門課程：{title}',
    'inst.claimDoneNoTitle': '代碼已使用，課程已加入。',
    'inst.claimDoneWhere': '你可以在學習頁面找到它。',
    'inst.claimAnother': '使用另一個代碼',
    'inst.claimUnsure': '我們無法確認代碼是否已被使用。再次嘗試之前，請先查看學習頁面。',
    'inst.whyBadCode': '這不是代碼的格式。請對照學校給你的內容，核對每個字母和數字。',
    'inst.whyCodeUnknown': '我們沒有這樣的代碼。請對照學校給你的內容核對。沒有使用任何代碼。',
    'inst.whyCodeUsed': '這個代碼已經被使用過，而一個代碼只能使用一次。如果是你自己用的，課程就在學習頁面上。如果不是，請向學校再要一個代碼。',
    'inst.whyCodeVoided': '學校已撤回這個代碼。請向學校要一個新的。',
    'inst.whyCourseGone': '這個代碼對應的課程目前無法加入。代碼沒有被使用，你可以稍後再試。',
    'inst.whyNotYourLearner': '你不能為那位學習者使用代碼。代碼沒有被使用。',
    'inst.whyAlreadyEnrolled': '那位學習者已經在這個代碼對應的課程中。代碼沒有被使用，可以用於另一位學習者。',
    'inst.whySeatsClosed': '目前無法使用學校的代碼。代碼沒有被使用。請稍後再試。',
    'inst.seatsTitle': '機構購買的課程',
    'inst.seatsUnread': '現在無法讀取你的機構購買的內容。這並不表示它什麼都沒有購買。請稍後再試。',
    'inst.seatsOff': '學校代碼目前已關閉。在重新開啟之前，不能購買新的內容，不能發放代碼，也不能使用代碼。此前透過代碼加入的課程不會被收回。',
    'inst.seatsMemberTitle': '只有機構的管理員能看到此頁面',
    'inst.seatsMemberBody': '你是這個機構的成員，而不是它的管理員，所以不會向你列出它購買的課程。如果你拿到了代碼，它在另一個頁面使用。',
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
    'inst.claimTitle': 'Dùng mã do một trường cấp',
    'inst.claimLede':
      'Nhập mã mà trường đã đưa cho bạn. Mã chỉ dùng được một lần. Mã thêm một khóa học cho học viên bạn chọn, và bạn không phải trả gì.',
    'inst.claimSchoolSees':
      'Trường thấy mã nào của mình đã được dùng và vào lúc nào. Trường không được cho xem tên học viên. Nếu trường có ghi lại mỗi mã đã được đưa cho ai, trường có thể biết mã của bạn đã được dùng.',
    'inst.claimWithdraw':
      'Trường có thể thu hồi một mã về sau. Nếu trường thu hồi một mã đã được dùng, học viên không còn mở được khóa học nữa. Phần đã học vẫn được giữ lại.',
    'inst.claimCodeLabel': 'Mã của bạn',
    'inst.claimCodeHelp':
      'Mười chữ cái và chữ số, ghi trên thư hoặc thẻ của trường. Chữ thường và dấu gạch ngang không quan trọng. Mã không bao giờ có các chữ I, L hay O, và không bao giờ có số không hay số một.',
    'inst.claimWho': 'Khóa học này dành cho ai?',
    'inst.claimWhoNote':
      'Một mã dành cho một học viên. Khi đã dùng cho một học viên, mã không thể dùng cho người khác.',
    'inst.claimMe': 'Chính tôi',
    'inst.claimForMe': 'Khóa học này sẽ được thêm cho bạn.',
    'inst.claimLearnersUnread':
      'Hiện không đọc được các học viên trong tài khoản của bạn, nên chưa thể dùng mã ở đây. Chưa có gì được dùng. Hãy thử lại sau giây lát.',
    'inst.claimDo': 'Dùng mã này',
    'inst.claimDone': 'Mã đã được dùng. Khóa học này đã được thêm: {title}',
    'inst.claimDoneNoTitle': 'Mã đã được dùng và khóa học đã được thêm.',
    'inst.claimDoneWhere': 'Bạn sẽ thấy khóa học trên trang học tập.',
    'inst.claimAnother': 'Dùng một mã khác',
    'inst.claimUnsure':
      'Chúng tôi không xác nhận được là mã đã được dùng. Hãy xem trang học tập trước khi thử lại.',
    'inst.whyBadCode':
      'Đó không phải là dạng của một mã. Hãy đối chiếu từng chữ cái và chữ số với thứ trường đã đưa cho bạn.',
    'inst.whyCodeUnknown':
      'Chúng tôi không có mã nào như vậy. Hãy đối chiếu với thứ trường đã đưa cho bạn. Chưa có gì được dùng.',
    'inst.whyCodeUsed':
      'Mã này đã được dùng rồi, và một mã chỉ dùng được một lần. Nếu chính bạn đã dùng, khóa học nằm trên trang học tập. Nếu không, hãy xin trường một mã khác.',
    'inst.whyCodeVoided': 'Trường đã thu hồi mã này. Hãy xin trường một mã mới.',
    'inst.whyCourseGone':
      'Hiện chưa thể tham gia khóa học của mã này. Mã chưa được dùng, nên bạn có thể thử lại sau.',
    'inst.whyNotYourLearner': 'Bạn không thể dùng mã cho học viên đó. Mã chưa được dùng.',
    'inst.whyAlreadyEnrolled':
      'Học viên đó đã ở trong khóa học của mã này. Mã chưa được dùng, nên có thể dùng cho học viên khác.',
    'inst.whySeatsClosed':
      'Hiện không thể dùng mã của các trường. Mã chưa được dùng. Hãy thử lại sau.',
    'inst.seatsTitle': 'Các khóa học tổ chức đã mua',
    'inst.seatsUnread':
      'Hiện không đọc được những gì tổ chức của bạn đã mua. Điều này không có nghĩa là tổ chức chưa mua gì. Hãy thử lại sau giây lát.',
    'inst.seatsOff':
      'Mã của các trường hiện đang tắt. Cho đến khi được bật lại, không thể mua thêm gì, không thể phát mã và không thể dùng mã. Các khóa học đã được thêm bằng mã trước đây không bị thu lại.',
    'inst.seatsMemberTitle': 'Chỉ quản trị viên của tổ chức mới thấy trang này',
    'inst.seatsMemberBody':
      'Bạn là thành viên của tổ chức này chứ không phải quản trị viên, nên các khóa học tổ chức đã mua không được liệt kê cho bạn. Nếu bạn được đưa một mã, mã đó được dùng ở một trang khác.',
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
    'inst.claimTitle': 'ใช้รหัสจากโรงเรียน',
    'inst.claimLede':
      'พิมพ์รหัสที่โรงเรียนให้คุณ รหัสใช้ได้ครั้งเดียว รหัสจะเพิ่มหลักสูตรให้ผู้เรียนที่คุณเลือก และคุณไม่ต้องจ่ายอะไร',
    'inst.claimSchoolSees':
      'โรงเรียนเห็นว่ารหัสใดของตนถูกใช้แล้วและเมื่อใด โรงเรียนไม่เห็นชื่อผู้เรียน หากโรงเรียนจดไว้ว่าให้รหัสใดแก่ใคร โรงเรียนก็รู้ได้ว่ารหัสของคุณถูกใช้แล้ว',
    'inst.claimWithdraw':
      'โรงเรียนอาจเพิกถอนรหัสในภายหลังได้ หากเพิกถอนรหัสที่ใช้ไปแล้ว ผู้เรียนจะเปิดหลักสูตรนั้นไม่ได้อีก งานที่ทำไปแล้วจะยังเก็บไว้',
    'inst.claimCodeLabel': 'รหัสของคุณ',
    'inst.claimCodeHelp':
      'ตัวอักษรและตัวเลขรวมสิบตัว อยู่บนจดหมายหรือบัตรจากโรงเรียน ตัวพิมพ์เล็กและขีดกลางไม่มีผล รหัสไม่มีตัวอักษร I, L หรือ O และไม่มีเลขศูนย์หรือเลขหนึ่ง',
    'inst.claimWho': 'หลักสูตรนี้สำหรับใคร',
    'inst.claimWhoNote':
      'รหัสหนึ่งรหัสสำหรับผู้เรียนหนึ่งคน เมื่อใช้กับผู้เรียนคนหนึ่งแล้ว จะใช้กับอีกคนไม่ได้',
    'inst.claimMe': 'ตัวฉันเอง',
    'inst.claimForMe': 'หลักสูตรนี้จะถูกเพิ่มให้คุณ',
    'inst.claimLearnersUnread':
      'ขณะนี้อ่านรายชื่อผู้เรียนในบัญชีของคุณไม่ได้ จึงยังใช้รหัสที่นี่ไม่ได้ ยังไม่มีสิ่งใดถูกใช้ โปรดลองอีกครั้งในอีกสักครู่',
    'inst.claimDo': 'ใช้รหัสนี้',
    'inst.claimDone': 'ใช้รหัสแล้ว เพิ่มหลักสูตรนี้แล้ว: {title}',
    'inst.claimDoneNoTitle': 'ใช้รหัสแล้วและเพิ่มหลักสูตรแล้ว',
    'inst.claimDoneWhere': 'คุณจะพบหลักสูตรในหน้าการเรียน',
    'inst.claimAnother': 'ใช้รหัสอื่น',
    'inst.claimUnsure': 'เรายืนยันไม่ได้ว่ารหัสถูกใช้แล้ว โปรดดูหน้าการเรียนก่อนลองอีกครั้ง',
    'inst.whyBadCode':
      'นั่นไม่ใช่รูปแบบของรหัส โปรดตรวจตัวอักษรและตัวเลขทุกตัวกับสิ่งที่โรงเรียนให้คุณ',
    'inst.whyCodeUnknown':
      'เราไม่มีรหัสแบบนั้น โปรดตรวจกับสิ่งที่โรงเรียนให้คุณ ยังไม่มีสิ่งใดถูกใช้',
    'inst.whyCodeUsed':
      'รหัสนี้ถูกใช้ไปแล้ว และรหัสใช้ได้ครั้งเดียว หากคุณเป็นผู้ใช้เอง หลักสูตรอยู่ในหน้าการเรียน หากไม่ใช่ โปรดขอรหัสใหม่จากโรงเรียน',
    'inst.whyCodeVoided': 'โรงเรียนเพิกถอนรหัสนี้แล้ว โปรดขอรหัสอื่นจากโรงเรียน',
    'inst.whyCourseGone':
      'ขณะนี้ยังเข้าร่วมหลักสูตรของรหัสนี้ไม่ได้ รหัสยังไม่ถูกใช้ คุณจึงลองใหม่ภายหลังได้',
    'inst.whyNotYourLearner': 'คุณใช้รหัสให้ผู้เรียนคนนั้นไม่ได้ รหัสยังไม่ถูกใช้',
    'inst.whyAlreadyEnrolled':
      'ผู้เรียนคนนั้นอยู่ในหลักสูตรของรหัสนี้อยู่แล้ว รหัสยังไม่ถูกใช้ จึงใช้กับผู้เรียนคนอื่นได้',
    'inst.whySeatsClosed': 'ขณะนี้ใช้รหัสจากโรงเรียนไม่ได้ รหัสยังไม่ถูกใช้ โปรดลองอีกครั้งภายหลัง',
    'inst.seatsTitle': 'หลักสูตรที่สถาบันซื้อ',
    'inst.seatsUnread':
      'ขณะนี้อ่านสิ่งที่สถาบันของคุณซื้อไม่ได้ ไม่ได้หมายความว่าสถาบันไม่ได้ซื้ออะไร โปรดลองอีกครั้งในอีกสักครู่',
    'inst.seatsOff':
      'รหัสจากโรงเรียนปิดอยู่ในขณะนี้ จนกว่าจะเปิดอีกครั้ง จะซื้อสิ่งใหม่ไม่ได้ แจกรหัสไม่ได้ และใช้รหัสไม่ได้ หลักสูตรที่เพิ่มด้วยรหัสไปแล้วจะไม่ถูกนำออก',
    'inst.seatsMemberTitle': 'เฉพาะผู้ดูแลของสถาบันเท่านั้นที่เห็นหน้านี้',
    'inst.seatsMemberBody':
      'คุณเป็นสมาชิกของสถาบันนี้ ไม่ใช่ผู้ดูแล จึงไม่มีการแสดงหลักสูตรที่สถาบันซื้อให้คุณเห็น หากคุณได้รับรหัส รหัสนั้นใช้ในอีกหน้าหนึ่ง',
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
    'inst.claimTitle': 'Gumamit ng code mula sa paaralan',
    'inst.claimLede':
      'I-type ang code na ibinigay sa iyo ng paaralan. Isang beses lang ito gumagana. Nagdaragdag ito ng kurso para sa mag-aaral na pipiliin mo, at wala kang babayaran.',
    'inst.claimSchoolSees':
      'Nakikita ng paaralan kung alin sa mga code nito ang nagamit na at kung kailan. Hindi ipinapakita rito ang pangalan ng mag-aaral. Kung itinala ng paaralan kung kanino ibinigay ang bawat code, malalaman nitong nagamit na ang sa iyo.',
    'inst.claimWithdraw':
      'Maaaring bawiin ng paaralan ang isang code sa ibang pagkakataon. Kapag binawi nito ang code na nagamit na, hindi na mabubuksan ng mag-aaral ang kurso. Nananatili ang gawaing natapos na.',
    'inst.claimCodeLabel': 'Ang iyong code',
    'inst.claimCodeHelp':
      'Sampung titik at numero, na nasa sulat o card mula sa paaralan. Hindi mahalaga ang maliliit na titik at ang gitling. Walang titik na I, L o O ang isang code kailanman, at walang zero o isa.',
    'inst.claimWho': 'Para kanino ang kursong ito?',
    'inst.claimWhoNote':
      'Ang isang code ay para sa isang mag-aaral. Kapag nagamit na ito para sa isang mag-aaral, hindi na ito magagamit para sa iba.',
    'inst.claimMe': 'Ako mismo',
    'inst.claimForMe': 'Idaragdag ang kursong ito para sa iyo.',
    'inst.claimLearnersUnread':
      'Hindi mabasa sa ngayon ang mga mag-aaral sa iyong account, kaya hindi pa magagamit dito ang code. Walang nagamit. Subukan muli maya-maya.',
    'inst.claimDo': 'Gamitin ang code na ito',
    'inst.claimDone': 'Nagamit na ang code. Naidagdag ang kursong ito: {title}',
    'inst.claimDoneNoTitle': 'Nagamit na ang code at naidagdag na ang kurso.',
    'inst.claimDoneWhere': 'Makikita mo ito sa pahina ng pag-aaral.',
    'inst.claimAnother': 'Gumamit ng ibang code',
    'inst.claimUnsure':
      'Hindi namin natiyak na nagamit ang code. Tingnan ang pahina ng pag-aaral bago subukan muli.',
    'inst.whyBadCode':
      'Hindi iyan ang anyo ng isang code. Ihambing ang bawat titik at numero sa ibinigay sa iyo ng paaralan.',
    'inst.whyCodeUnknown':
      'Wala kaming code na ganyan. Ihambing ito sa ibinigay sa iyo ng paaralan. Walang nagamit.',
    'inst.whyCodeUsed':
      'Nagamit na ang code na ito, at isang beses lang gumagana ang isang code. Kung ikaw mismo ang gumamit, nasa pahina ng pag-aaral ang kurso. Kung hindi, humingi ng ibang code sa paaralan.',
    'inst.whyCodeVoided': 'Binawi na ng paaralan ang code na ito. Humingi ng bago sa paaralan.',
    'inst.whyCourseGone':
      'Hindi pa masasalihan sa ngayon ang kursong para sa code na ito. Hindi nagamit ang code, kaya maaari mo itong subukan muli sa ibang pagkakataon.',
    'inst.whyNotYourLearner':
      'Hindi ka maaaring gumamit ng code para sa mag-aaral na iyon. Hindi nagamit ang code.',
    'inst.whyAlreadyEnrolled':
      'Nasa kursong para sa code na ito na ang mag-aaral na iyon. Hindi nagamit ang code, kaya magagamit ito para sa ibang mag-aaral.',
    'inst.whySeatsClosed':
      'Hindi magagamit sa ngayon ang mga code mula sa mga paaralan. Hindi nagamit ang code. Subukan muli sa ibang pagkakataon.',
    'inst.seatsTitle': 'Mga kursong binili ng institusyon',
    'inst.seatsUnread':
      'Hindi mabasa sa ngayon ang binili ng iyong institusyon. Hindi ito nangangahulugang wala itong binili. Subukan muli maya-maya.',
    'inst.seatsOff':
      'Nakapatay sa ngayon ang mga code mula sa mga paaralan. Hangga’t hindi muling binubuksan, walang bagong mabibili, walang code na maibibigay at walang code na magagamit. Hindi binabawi ang mga kursong naidagdag na ng isang code.',
    'inst.seatsMemberTitle': 'Mga tagapangasiwa lang ng institusyon ang nakakakita ng pahinang ito',
    'inst.seatsMemberBody':
      'Kasapi ka ng institusyong ito at hindi isa sa mga tagapangasiwa nito, kaya hindi inililista para sa iyo ang mga kursong binili nito. Kung binigyan ka ng code, ginagamit iyon sa ibang pahina.',
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
    'inst.claimTitle': 'Maktab bergan koddan foydalanish',
    'inst.claimLede':
      'Maktab sizga bergan kodni yozing. U bir marta ishlaydi. U siz tanlagan oʻquvchi uchun kurs qoʻshadi va siz hech narsa toʻlamaysiz.',
    'inst.claimSchoolSees':
      'Maktab oʻz kodlaridan qaysilari va qachon ishlatilganini koʻradi. Unga oʻquvchining ismi koʻrsatilmaydi. Agar maktab har bir kod kimga berilganini yozib qoʻygan boʻlsa, sizning kodingiz ishlatilganini bila oladi.',
    'inst.claimWithdraw':
      'Maktab kodni keyinroq qaytarib olishi mumkin. Agar ishlatilgan kodni qaytarib olsa, oʻquvchi kursni boshqa ocha olmaydi. Bajarilgan ish saqlanadi.',
    'inst.claimCodeLabel': 'Kodingiz',
    'inst.claimCodeHelp':
      'Oʻnta harf va raqam, maktab bergan xat yoki kartada yozilgan. Kichik harflar va chiziqcha ahamiyatsiz. Kodda hech qachon I, L yoki O harflari boʻlmaydi, nol yoki bir ham boʻlmaydi.',
    'inst.claimWho': 'Bu kurs kim uchun?',
    'inst.claimWhoNote':
      'Bitta kod bitta oʻquvchi uchun. Bir oʻquvchi uchun ishlatilgach, uni boshqasi uchun ishlatib boʻlmaydi.',
    'inst.claimMe': 'Oʻzim',
    'inst.claimForMe': 'Bu kurs siz uchun qoʻshiladi.',
    'inst.claimLearnersUnread':
      'Hisobingizdagi oʻquvchilarni hozir oʻqib boʻlmadi, shuning uchun kodni bu yerda hali ishlatib boʻlmaydi. Hech narsa ishlatilmadi. Birozdan soʻng qayta urinib koʻring.',
    'inst.claimDo': 'Shu koddan foydalanish',
    'inst.claimDone': 'Kod ishlatildi. Ushbu kurs qoʻshildi: {title}',
    'inst.claimDoneNoTitle': 'Kod ishlatildi va kurs qoʻshildi.',
    'inst.claimDoneWhere': 'Uni taʼlim sahifasidan topasiz.',
    'inst.claimAnother': 'Boshqa koddan foydalanish',
    'inst.claimUnsure':
      'Kod ishlatilganini tasdiqlay olmadik. Qayta urinishdan oldin taʼlim sahifasiga qarang.',
    'inst.whyBadCode':
      'Bu kodning shakli emas. Har bir harf va raqamni maktab bergan narsa bilan solishtiring.',
    'inst.whyCodeUnknown':
      'Bizda bunday kod yoʻq. Uni maktab bergan narsa bilan solishtiring. Hech narsa ishlatilmadi.',
    'inst.whyCodeUsed':
      'Bu kod allaqachon ishlatilgan, kod esa bir marta ishlaydi. Agar uni oʻzingiz ishlatgan boʻlsangiz, kurs taʼlim sahifasida. Aks holda maktabdan boshqa kod soʻrang.',
    'inst.whyCodeVoided': 'Maktab bu kodni qaytarib olgan. Maktabdan yangisini soʻrang.',
    'inst.whyCourseGone':
      'Bu kod tegishli boʻlgan kursga hozircha qoʻshilib boʻlmaydi. Kod ishlatilmadi, shuning uchun keyinroq yana urinib koʻrishingiz mumkin.',
    'inst.whyNotYourLearner': 'Siz u oʻquvchi uchun koddan foydalana olmaysiz. Kod ishlatilmadi.',
    'inst.whyAlreadyEnrolled':
      'U oʻquvchi bu kod tegishli boʻlgan kursda allaqachon bor. Kod ishlatilmadi, shuning uchun uni boshqa oʻquvchi uchun ishlatish mumkin.',
    'inst.whySeatsClosed':
      'Maktab kodlarini hozircha ishlatib boʻlmaydi. Kod ishlatilmadi. Keyinroq qayta urinib koʻring.',
    'inst.seatsTitle': 'Muassasa sotib olgan kurslar',
    'inst.seatsUnread':
      'Muassasangiz sotib olgan narsalarni hozir oʻqib boʻlmadi. Bu u hech narsa sotib olmaganini anglatmaydi. Birozdan soʻng qayta urinib koʻring.',
    'inst.seatsOff':
      'Maktab kodlari hozircha oʻchirilgan. Ular qayta yoqilmaguncha yangi narsa sotib olib boʻlmaydi, kod berib boʻlmaydi va kod ishlatib boʻlmaydi. Avval kod bilan qoʻshilgan kurslar olib qoʻyilmaydi.',
    'inst.seatsMemberTitle': 'Bu sahifani faqat muassasa maʼmurlari koʻradi',
    'inst.seatsMemberBody':
      'Siz bu muassasaning aʼzosisiz, maʼmuri emassiz, shuning uchun u sotib olgan kurslar sizga koʻrsatilmaydi. Agar sizga kod berilgan boʻlsa, u boshqa sahifada ishlatiladi.',
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
    'inst.claimTitle': 'Мектеп берген кодты қолдану',
    'inst.claimLede':
      'Мектеп сізге берген кодты жазыңыз. Ол бір рет жұмыс істейді. Ол сіз таңдаған оқушыға курс қосады және сіз ештеңе төлемейсіз.',
    'inst.claimSchoolSees':
      'Мектеп өз кодтарының қайсысы және қашан қолданылғанын көреді. Оған оқушының аты көрсетілмейді. Егер мектеп әр кодтың кімге берілгенін жазып қойған болса, сіздің кодыңыз қолданылғанын біле алады.',
    'inst.claimWithdraw':
      'Мектеп кодты кейін қайтарып ала алады. Егер қолданылған кодты қайтарып алса, оқушы курсты енді аша алмайды. Орындалған жұмыс сақталады.',
    'inst.claimCodeLabel': 'Сіздің кодыңыз',
    'inst.claimCodeHelp':
      'Он әріп пен цифр, мектеп берген хатта немесе карточкада жазылған. Кіші әріптер мен сызықша маңызды емес. Кодта ешқашан I, L немесе O әріптері болмайды, нөл немесе бір де болмайды.',
    'inst.claimWho': 'Бұл курс кімге арналған?',
    'inst.claimWhoNote':
      'Бір код бір оқушыға арналған. Бір оқушыға қолданылғаннан кейін оны басқасына қолдану мүмкін емес.',
    'inst.claimMe': 'Өзім',
    'inst.claimForMe': 'Бұл курс сізге қосылады.',
    'inst.claimLearnersUnread':
      'Есептік жазбаңыздағы оқушыларды қазір оқу мүмкін болмады, сондықтан кодты мұнда әзірге қолдану мүмкін емес. Ештеңе қолданылған жоқ. Сәлден кейін қайталап көріңіз.',
    'inst.claimDo': 'Осы кодты қолдану',
    'inst.claimDone': 'Код қолданылды. Мына курс қосылды: {title}',
    'inst.claimDoneNoTitle': 'Код қолданылды және курс қосылды.',
    'inst.claimDoneWhere': 'Оны оқу бетінен табасыз.',
    'inst.claimAnother': 'Басқа кодты қолдану',
    'inst.claimUnsure':
      'Кодтың қолданылғанын растай алмадық. Қайталап көрмес бұрын оқу бетін қараңыз.',
    'inst.whyBadCode':
      'Бұл кодтың пішіні емес. Әр әріп пен цифрды мектеп берген нәрсемен салыстырыңыз.',
    'inst.whyCodeUnknown':
      'Бізде мұндай код жоқ. Оны мектеп берген нәрсемен салыстырыңыз. Ештеңе қолданылған жоқ.',
    'inst.whyCodeUsed':
      'Бұл код бұрын қолданылған, ал код бір рет жұмыс істейді. Егер оны өзіңіз қолданған болсаңыз, курс оқу бетінде. Олай болмаса, мектептен басқа код сұраңыз.',
    'inst.whyCodeVoided': 'Мектеп бұл кодты қайтарып алды. Мектептен жаңасын сұраңыз.',
    'inst.whyCourseGone':
      'Бұл код арналған курсқа қазір қосылу мүмкін емес. Код қолданылған жоқ, сондықтан кейінірек қайта байқап көре аласыз.',
    'inst.whyNotYourLearner': 'Сіз ол оқушы үшін кодты қолдана алмайсыз. Код қолданылған жоқ.',
    'inst.whyAlreadyEnrolled':
      'Ол оқушы бұл код арналған курста бұрыннан бар. Код қолданылған жоқ, сондықтан оны басқа оқушыға қолдануға болады.',
    'inst.whySeatsClosed':
      'Мектеп кодтарын қазір қолдану мүмкін емес. Код қолданылған жоқ. Кейінірек қайталап көріңіз.',
    'inst.seatsTitle': 'Мекеме сатып алған курстар',
    'inst.seatsUnread':
      'Мекемеңіз сатып алған нәрселерді қазір оқу мүмкін болмады. Бұл оның ештеңе сатып алмағанын білдірмейді. Сәлден кейін қайталап көріңіз.',
    'inst.seatsOff':
      'Мектеп кодтары қазір өшірулі. Олар қайта қосылғанша жаңа ештеңе сатып алуға, код беруге және код қолдануға болмайды. Бұрын кодпен қосылған курстар алынып тасталмайды.',
    'inst.seatsMemberTitle': 'Бұл бетті тек мекеменің әкімшілері көреді',
    'inst.seatsMemberBody':
      'Сіз осы мекеменің мүшесісіз, әкімшісі емессіз, сондықтан ол сатып алған курстар сізге көрсетілмейді. Егер сізге код берілген болса, ол басқа бетте қолданылады.',
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
    'inst.claimTitle': 'Məktəbdən alınan koddan istifadə',
    'inst.claimLede':
      'Məktəbin sizə verdiyi kodu yazın. Kod bir dəfə işləyir. O, seçdiyiniz öyrənən üçün kurs əlavə edir və siz heç nə ödəmirsiniz.',
    'inst.claimSchoolSees':
      'Məktəb kodlarından hansının nə vaxt istifadə olunduğunu görür. Öyrənənin adı məktəbə göstərilmir. Məktəb hər kodu kimə verdiyini qeyd edibsə, sizin kodunuzun istifadə olunduğunu bilə bilər.',
    'inst.claimWithdraw':
      'Məktəb kodu sonradan geri götürə bilər. İstifadə olunmuş kodu geri götürsə, öyrənən kursu daha aça bilməz. Görülmüş iş saxlanılır.',
    'inst.claimCodeLabel': 'Kodunuz',
    'inst.claimCodeHelp':
      'On hərf və rəqəm; məktəbin verdiyi məktubda və ya kartda yazılıb. Kiçik hərflərin və tirenin fərqi yoxdur. Kodda heç vaxt I, L və ya O hərfləri olmur, sıfır və ya bir də olmur.',
    'inst.claimWho': 'Bu kurs kimin üçündür?',
    'inst.claimWhoNote':
      'Bir kod bir öyrənən üçündür. Bir öyrənən üçün istifadə olunduqdan sonra başqası üçün istifadə oluna bilməz.',
    'inst.claimMe': 'Özüm',
    'inst.claimForMe': 'Bu kurs sizin üçün əlavə olunacaq.',
    'inst.claimLearnersUnread':
      'Hesabınızdakı öyrənənləri indi oxumaq mümkün olmadı, ona görə kod burada hələ istifadə oluna bilmir. Heç nə istifadə olunmadı. Bir azdan yenidən cəhd edin.',
    'inst.claimDo': 'Bu koddan istifadə et',
    'inst.claimDone': 'Kod istifadə olundu. Bu kurs əlavə olundu: {title}',
    'inst.claimDoneNoTitle': 'Kod istifadə olundu və kurs əlavə olundu.',
    'inst.claimDoneWhere': 'Onu təhsil səhifəsində tapacaqsınız.',
    'inst.claimAnother': 'Başqa koddan istifadə et',
    'inst.claimUnsure':
      'Kodun istifadə olunduğunu təsdiqləyə bilmədik. Yenidən cəhd etməzdən əvvəl təhsil səhifəsinə baxın.',
    'inst.whyBadCode':
      'Bu, kodun forması deyil. Hər hərfi və rəqəmi məktəbin sizə verdiyi ilə tutuşdurun.',
    'inst.whyCodeUnknown':
      'Bizdə belə kod yoxdur. Onu məktəbin sizə verdiyi ilə tutuşdurun. Heç nə istifadə olunmadı.',
    'inst.whyCodeUsed':
      'Bu kod artıq istifadə olunub və kod bir dəfə işləyir. Onu özünüz istifadə etmisinizsə, kurs təhsil səhifəsindədir. Etməmisinizsə, məktəbdən başqa kod istəyin.',
    'inst.whyCodeVoided': 'Məktəb bu kodu geri götürüb. Məktəbdən yenisini istəyin.',
    'inst.whyCourseGone':
      'Bu kodun aid olduğu kursa hazırda qoşulmaq mümkün deyil. Kod istifadə olunmadı, ona görə sonra yenidən yoxlaya bilərsiniz.',
    'inst.whyNotYourLearner':
      'Siz həmin öyrənən üçün koddan istifadə edə bilməzsiniz. Kod istifadə olunmadı.',
    'inst.whyAlreadyEnrolled':
      'Həmin öyrənən bu kodun aid olduğu kursda artıq var. Kod istifadə olunmadı, ona görə başqa öyrənən üçün istifadə oluna bilər.',
    'inst.whySeatsClosed':
      'Məktəb kodlarından hazırda istifadə etmək mümkün deyil. Kod istifadə olunmadı. Sonra yenidən cəhd edin.',
    'inst.seatsTitle': 'Qurumun aldığı kurslar',
    'inst.seatsUnread':
      'Qurumunuzun aldıqlarını indi oxumaq mümkün olmadı. Bu, onun heç nə almadığı demək deyil. Bir azdan yenidən cəhd edin.',
    'inst.seatsOff':
      'Məktəb kodları hazırda söndürülüb. Yenidən yandırılana qədər yeni heç nə alına bilməz, kod verilə bilməz və kod istifadə oluna bilməz. Əvvəl kodla əlavə olunmuş kurslar geri alınmır.',
    'inst.seatsMemberTitle': 'Bu səhifəni yalnız qurumun idarəçiləri görür',
    'inst.seatsMemberBody':
      'Siz bu qurumun üzvüsünüz, idarəçisi deyilsiniz, ona görə onun aldığı kurslar sizə göstərilmir. Sizə kod verilibsə, o, başqa səhifədə istifadə olunur.',
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
    'inst.claimTitle': 'Истифодаи рамзи мактаб',
    'inst.claimLede':
      'Рамзеро, ки мактаб ба шумо додааст, нависед. Он як маротиба кор мекунад. Он барои хонандае, ки интихоб мекунед, курс илова мекунад ва шумо ҳеҷ чиз намепардозед.',
    'inst.claimSchoolSees':
      'Мактаб мебинад, ки кадом рамзҳояш ва кай истифода шудаанд. Номи хонанда ба он нишон дода намешавад. Агар мактаб навишта бошад, ки ҳар рамз ба кӣ дода шудааст, метавонад донад, ки рамзи шумо истифода шудааст.',
    'inst.claimWithdraw':
      'Мактаб метавонад рамзро баъдтар бозпас гирад. Агар рамзи истифодашударо бозпас гирад, хонанда дигар курсро кушода наметавонад. Кори иҷрошуда нигоҳ дошта мешавад.',
    'inst.claimCodeLabel': 'Рамзи шумо',
    'inst.claimCodeHelp':
      'Даҳ ҳарф ва рақам, ки дар мактуб ё корти мактаб навишта шудааст. Ҳарфҳои хурд ва тире аҳамият надоранд. Дар рамз ҳеҷ гоҳ ҳарфҳои I, L ё O намешаванд, сифр ё як низ намешавад.',
    'inst.claimWho': 'Ин курс барои кист?',
    'inst.claimWhoNote':
      'Як рамз барои як хонанда аст. Пас аз он ки барои як хонанда истифода шуд, онро барои дигаре истифода кардан мумкин нест.',
    'inst.claimMe': 'Худам',
    'inst.claimForMe': 'Ин курс барои шумо илова мешавад.',
    'inst.claimLearnersUnread':
      'Хонандагони ҳисоби шуморо ҳозир хондан имкон нашуд, бинобар ин рамзро ҳоло дар ин ҷо истифода кардан мумкин нест. Ҳеҷ чиз истифода нашуд. Пас аз лаҳзае дубора кӯшиш кунед.',
    'inst.claimDo': 'Истифодаи ин рамз',
    'inst.claimDone': 'Рамз истифода шуд. Ин курс илова шуд: {title}',
    'inst.claimDoneNoTitle': 'Рамз истифода шуд ва курс илова шуд.',
    'inst.claimDoneWhere': 'Онро дар саҳифаи таълим меёбед.',
    'inst.claimAnother': 'Истифодаи рамзи дигар',
    'inst.claimUnsure':
      'Мо тасдиқ карда натавонистем, ки рамз истифода шудааст. Пеш аз кӯшиши дубора ба саҳифаи таълим нигаред.',
    'inst.whyBadCode':
      'Ин шакли рамз нест. Ҳар ҳарф ва рақамро бо он чи мактаб ба шумо додааст, муқоиса кунед.',
    'inst.whyCodeUnknown':
      'Мо чунин рамз надорем. Онро бо он чи мактаб ба шумо додааст, муқоиса кунед. Ҳеҷ чиз истифода нашуд.',
    'inst.whyCodeUsed':
      'Ин рамз аллакай истифода шудааст ва рамз як маротиба кор мекунад. Агар онро худатон истифода карда бошед, курс дар саҳифаи таълим аст. Агар не, аз мактаб рамзи дигар пурсед.',
    'inst.whyCodeVoided': 'Мактаб ин рамзро бозпас гирифтааст. Аз мактаб рамзи нав пурсед.',
    'inst.whyCourseGone':
      'Ба курсе, ки ин рамз барои он аст, ҳоло пайвастан мумкин нест. Рамз истифода нашуд, бинобар ин метавонед баъдтар боз санҷед.',
    'inst.whyNotYourLearner':
      'Шумо барои он хонанда рамз истифода карда наметавонед. Рамз истифода нашуд.',
    'inst.whyAlreadyEnrolled':
      'Он хонанда аллакай дар курсе аст, ки ин рамз барои он аст. Рамз истифода нашуд, бинобар ин онро барои хонандаи дигар истифода кардан мумкин аст.',
    'inst.whySeatsClosed':
      'Рамзҳои мактабҳоро ҳоло истифода кардан мумкин нест. Рамз истифода нашуд. Баъдтар дубора кӯшиш кунед.',
    'inst.seatsTitle': 'Курсҳое, ки муассиса харидааст',
    'inst.seatsUnread':
      'Он чиро, ки муассисаи шумо харидааст, ҳозир хондан имкон нашуд. Ин маънои онро надорад, ки он ҳеҷ чиз нахаридааст. Пас аз лаҳзае дубора кӯшиш кунед.',
    'inst.seatsOff':
      'Рамзҳои мактабҳо ҳоло хомӯш карда шудаанд. То дубора фаъол шуданашон чизи нав харидан, рамз додан ва рамз истифода кардан мумкин нест. Курсҳое, ки пештар бо рамз илова шудаанд, гирифта намешаванд.',
    'inst.seatsMemberTitle': 'Ин саҳифаро танҳо маъмурони муассиса мебинанд',
    'inst.seatsMemberBody':
      'Шумо узви ин муассиса ҳастед, на маъмури он, бинобар ин курсҳои харидаи он ба шумо нишон дода намешаванд. Агар ба шумо рамз дода шуда бошад, он дар саҳифаи дигар истифода мешавад.',
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
    'inst.claimTitle': 'Мектеп берген кодду колдонуу',
    'inst.claimLede':
      'Мектеп сизге берген кодду жазыңыз. Ал бир жолу иштейт. Ал сиз тандаган окуучуга курс кошот жана сиз эч нерсе төлөбөйсүз.',
    'inst.claimSchoolSees':
      'Мектеп өз коддорунун кайсынысы жана качан колдонулганын көрөт. Ага окуучунун аты көрсөтүлбөйт. Эгер мектеп ар бир код кимге берилгенин жазып койгон болсо, сиздин кодуңуз колдонулганын биле алат.',
    'inst.claimWithdraw':
      'Мектеп кодду кийин кайтарып ала алат. Эгер колдонулган кодду кайтарып алса, окуучу курсту мындан ары ача албайт. Аткарылган иш сакталат.',
    'inst.claimCodeLabel': 'Сиздин кодуңуз',
    'inst.claimCodeHelp':
      'Он тамга жана цифра, мектеп берген катта же карточкада жазылган. Кичине тамгалар менен сызыкча маанилүү эмес. Коддо эч качан I, L же O тамгалары болбойт, нөл же бир да болбойт.',
    'inst.claimWho': 'Бул курс ким үчүн?',
    'inst.claimWhoNote':
      'Бир код бир окуучу үчүн. Бир окуучу үчүн колдонулгандан кийин аны башкасы үчүн колдонууга болбойт.',
    'inst.claimMe': 'Өзүм',
    'inst.claimForMe': 'Бул курс сиз үчүн кошулат.',
    'inst.claimLearnersUnread':
      'Аккаунтуңуздагы окуучуларды азыр окуу мүмкүн болгон жок, ошондуктан кодду бул жерде азырынча колдонууга болбойт. Эч нерсе колдонулган жок. Бир аздан кийин кайра аракет кылыңыз.',
    'inst.claimDo': 'Ушул кодду колдонуу',
    'inst.claimDone': 'Код колдонулду. Бул курс кошулду: {title}',
    'inst.claimDoneNoTitle': 'Код колдонулду жана курс кошулду.',
    'inst.claimDoneWhere': 'Аны окуу бетинен табасыз.',
    'inst.claimAnother': 'Башка кодду колдонуу',
    'inst.claimUnsure':
      'Коддун колдонулганын ырастай алган жокпуз. Кайра аракет кылардан мурун окуу бетин караңыз.',
    'inst.whyBadCode':
      'Бул коддун формасы эмес. Ар бир тамганы жана цифраны мектеп берген нерсе менен салыштырыңыз.',
    'inst.whyCodeUnknown':
      'Бизде мындай код жок. Аны мектеп берген нерсе менен салыштырыңыз. Эч нерсе колдонулган жок.',
    'inst.whyCodeUsed':
      'Бул код мурун колдонулган, ал эми код бир жолу иштейт. Эгер аны өзүңүз колдонгон болсоңуз, курс окуу бетинде. Андай болбосо, мектептен башка код сураңыз.',
    'inst.whyCodeVoided': 'Мектеп бул кодду кайтарып алган. Мектептен жаңысын сураңыз.',
    'inst.whyCourseGone':
      'Бул код тиешелүү болгон курска азыр кошулууга болбойт. Код колдонулган жок, ошондуктан кийинчерээк кайра байкап көрө аласыз.',
    'inst.whyNotYourLearner': 'Сиз ал окуучу үчүн кодду колдоно албайсыз. Код колдонулган жок.',
    'inst.whyAlreadyEnrolled':
      'Ал окуучу бул код тиешелүү болгон курста мурунтан эле бар. Код колдонулган жок, ошондуктан аны башка окуучу үчүн колдонууга болот.',
    'inst.whySeatsClosed':
      'Мектеп коддорун азыр колдонууга болбойт. Код колдонулган жок. Кийинчерээк кайра аракет кылыңыз.',
    'inst.seatsTitle': 'Мекеме сатып алган курстар',
    'inst.seatsUnread':
      'Мекемеңиз сатып алган нерселерди азыр окуу мүмкүн болгон жок. Бул анын эч нерсе сатып албаганын билдирбейт. Бир аздан кийин кайра аракет кылыңыз.',
    'inst.seatsOff':
      'Мектеп коддору азыр өчүрүлгөн. Алар кайра күйгүзүлгөнгө чейин жаңы эч нерсе сатып алууга, код берүүгө жана код колдонууга болбойт. Мурун код менен кошулган курстар алынып салынбайт.',
    'inst.seatsMemberTitle': 'Бул бетти мекеменин администраторлору гана көрөт',
    'inst.seatsMemberBody':
      'Сиз бул мекеменин мүчөсүсүз, администратору эмессиз, ошондуктан ал сатып алган курстар сизге көрсөтүлбөйт. Эгер сизге код берилген болсо, ал башка бетте колдонулат.',
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
    'inst.claimTitle': 'Mekdebiň beren koduny ulanmak',
    'inst.claimLede':
      'Mekdebiň size beren koduny ýazyň. Ol bir gezek işleýär. Ol siziň saýlan okuwçyňyz üçin kurs goşýar we siz hiç zat tölemeýärsiňiz.',
    'inst.claimSchoolSees':
      'Mekdep öz kodlarynyň haýsysynyň we haçan ulanylandygyny görýär. Oňa okuwçynyň ady görkezilmeýär. Eger mekdep her koduň kime berlendigini ýazyp goýan bolsa, siziň koduňyzyň ulanylandygyny bilip biler.',
    'inst.claimWithdraw':
      'Mekdep kody soň yzyna alyp biler. Eger ulanylan kody yzyna alsa, okuwçy kursy mundan beýläk açyp bilmez. Edilen iş saklanýar.',
    'inst.claimCodeLabel': 'Siziň koduňyz',
    'inst.claimCodeHelp':
      'On harp we san, mekdebiň beren hatynda ýa-da kartynda ýazylan. Kiçi harplaryň we kese çyzygyň tapawudy ýok. Kodda hiç haçan I, L ýa-da O harplary bolmaýar, nol ýa-da bir hem bolmaýar.',
    'inst.claimWho': 'Bu kurs kim üçin?',
    'inst.claimWhoNote':
      'Bir kod bir okuwçy üçin. Bir okuwçy üçin ulanylandan soň ony başga biri üçin ulanyp bolmaýar.',
    'inst.claimMe': 'Özüm',
    'inst.claimForMe': 'Bu kurs siziň üçin goşular.',
    'inst.claimLearnersUnread':
      'Hasabyňyzdaky okuwçylary häzir okap bolmady, şonuň üçin kody bu ýerde entek ulanyp bolmaýar. Hiç zat ulanylmady. Biraz wagtdan gaýtadan synanyşyň.',
    'inst.claimDo': 'Şu kody ulan',
    'inst.claimDone': 'Kod ulanyldy. Şu kurs goşuldy: {title}',
    'inst.claimDoneNoTitle': 'Kod ulanyldy we kurs goşuldy.',
    'inst.claimDoneWhere': 'Ony okuw sahypasynda taparsyňyz.',
    'inst.claimAnother': 'Başga kody ulan',
    'inst.claimUnsure':
      'Koduň ulanylandygyny tassyklap bilmedik. Gaýtadan synanyşmazdan öň okuw sahypasyna serediň.',
    'inst.whyBadCode':
      'Bu koduň görnüşi däl. Her harpy we sany mekdebiň size bereni bilen deňeşdiriň.',
    'inst.whyCodeUnknown':
      'Bizde beýle kod ýok. Ony mekdebiň size bereni bilen deňeşdiriň. Hiç zat ulanylmady.',
    'inst.whyCodeUsed':
      'Bu kod eýýäm ulanyldy, kod bolsa bir gezek işleýär. Eger ony özüňiz ulanan bolsaňyz, kurs okuw sahypasynda. Ýogsa mekdepden başga kod soraň.',
    'inst.whyCodeVoided': 'Mekdep bu kody yzyna aldy. Mekdepden täzesini soraň.',
    'inst.whyCourseGone':
      'Bu koduň degişli kursuna häzir goşulyp bolmaýar. Kod ulanylmady, şonuň üçin soňrak ýene synap bilersiňiz.',
    'inst.whyNotYourLearner': 'Siz şol okuwçy üçin kod ulanyp bilmeýärsiňiz. Kod ulanylmady.',
    'inst.whyAlreadyEnrolled':
      'Şol okuwçy bu koduň degişli kursunda eýýäm bar. Kod ulanylmady, şonuň üçin ony başga okuwçy üçin ulanyp bolar.',
    'inst.whySeatsClosed':
      'Mekdep kodlaryny häzir ulanyp bolmaýar. Kod ulanylmady. Soňrak gaýtadan synanyşyň.',
    'inst.seatsTitle': 'Edaranyň satyn alan kurslary',
    'inst.seatsUnread':
      'Edaraňyzyň satyn alan zatlaryny häzir okap bolmady. Bu onuň hiç zat satyn almandygyny aňlatmaýar. Biraz wagtdan gaýtadan synanyşyň.',
    'inst.seatsOff':
      'Mekdep kodlary häzir öçürilen. Olar täzeden açylýança täze zat satyn alyp, kod berip we kod ulanyp bolmaýar. Öň kod bilen goşulan kurslar yzyna alynmaýar.',
    'inst.seatsMemberTitle': 'Bu sahypany diňe edaranyň administratorlary görýär',
    'inst.seatsMemberBody':
      'Siz bu edaranyň agzasy, administratory däl, şonuň üçin onuň satyn alan kurslary size görkezilmeýär. Eger size kod berlen bolsa, ol başga sahypada ulanylýar.',
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
    'inst.claimTitle': 'பள்ளி கொடுத்த குறியீட்டைப் பயன்படுத்துதல்',
    'inst.claimLede':
      'பள்ளி உங்களுக்குக் கொடுத்த குறியீட்டை உள்ளிடவும். அது ஒரு முறை மட்டுமே வேலை செய்யும். நீங்கள் தேர்ந்தெடுக்கும் கற்பவருக்கு அது ஒரு பாடநெறியைச் சேர்க்கும், நீங்கள் எதுவும் செலுத்த வேண்டியதில்லை.',
    'inst.claimSchoolSees':
      'தன் குறியீடுகளில் எவை எப்போது பயன்படுத்தப்பட்டன என்பதைப் பள்ளி பார்க்கிறது. கற்பவரின் பெயர் அதற்குக் காட்டப்படாது. ஒவ்வொரு குறியீடும் யாருக்குக் கொடுக்கப்பட்டது என்பதைப் பள்ளி குறித்து வைத்திருந்தால், உங்களுடையது பயன்படுத்தப்பட்டது என்பதை அது அறிய முடியும்.',
    'inst.claimWithdraw':
      'பள்ளி பின்னர் ஒரு குறியீட்டைத் திரும்பப் பெறலாம். பயன்படுத்தப்பட்ட குறியீட்டை அது திரும்பப் பெற்றால், கற்பவரால் இனி அந்தப் பாடநெறியைத் திறக்க முடியாது. ஏற்கெனவே செய்த வேலை வைத்திருக்கப்படும்.',
    'inst.claimCodeLabel': 'உங்கள் குறியீடு',
    'inst.claimCodeHelp':
      'பத்து எழுத்துகளும் எண்களும், பள்ளி கொடுத்த கடிதத்தில் அல்லது அட்டையில் இருக்கும். சிறிய எழுத்துகளும் இடைக்கோடும் பொருட்டல்ல. குறியீட்டில் I, L அல்லது O எழுத்துகள் ஒருபோதும் இருக்காது, பூஜ்யமோ ஒன்றோ ஒருபோதும் இருக்காது.',
    'inst.claimWho': 'இந்தப் பாடநெறி யாருக்கானது?',
    'inst.claimWhoNote':
      'ஒரு குறியீடு ஒரு கற்பவருக்கானது. ஒரு கற்பவருக்குப் பயன்படுத்தப்பட்ட பின், அதை வேறொருவருக்குப் பயன்படுத்த முடியாது.',
    'inst.claimMe': 'எனக்கே',
    'inst.claimForMe': 'இந்தப் பாடநெறி உங்களுக்குச் சேர்க்கப்படும்.',
    'inst.claimLearnersUnread':
      'உங்கள் கணக்கில் உள்ள கற்பவர்களை இப்போது படிக்க முடியவில்லை, அதனால் குறியீட்டை இங்கே இன்னும் பயன்படுத்த முடியாது. எதுவும் பயன்படுத்தப்படவில்லை. சிறிது நேரத்தில் மீண்டும் முயலவும்.',
    'inst.claimDo': 'இந்தக் குறியீட்டைப் பயன்படுத்தவும்',
    'inst.claimDone': 'குறியீடு பயன்படுத்தப்பட்டது. இந்தப் பாடநெறி சேர்க்கப்பட்டது: {title}',
    'inst.claimDoneNoTitle': 'குறியீடு பயன்படுத்தப்பட்டது, பாடநெறி சேர்க்கப்பட்டது.',
    'inst.claimDoneWhere': 'அதைக் கற்றல் பக்கத்தில் காண்பீர்கள்.',
    'inst.claimAnother': 'வேறொரு குறியீட்டைப் பயன்படுத்தவும்',
    'inst.claimUnsure':
      'குறியீடு பயன்படுத்தப்பட்டதா என்பதை எங்களால் உறுதிப்படுத்த முடியவில்லை. மீண்டும் முயல்வதற்கு முன் கற்றல் பக்கத்தைப் பாருங்கள்.',
    'inst.whyBadCode':
      'அது ஒரு குறியீட்டின் வடிவம் அல்ல. ஒவ்வொரு எழுத்தையும் எண்ணையும் பள்ளி கொடுத்ததுடன் ஒப்பிட்டுப் பாருங்கள்.',
    'inst.whyCodeUnknown':
      'அப்படி ஒரு குறியீடு எங்களிடம் இல்லை. அதைப் பள்ளி கொடுத்ததுடன் ஒப்பிட்டுப் பாருங்கள். எதுவும் பயன்படுத்தப்படவில்லை.',
    'inst.whyCodeUsed':
      'இந்தக் குறியீடு ஏற்கெனவே பயன்படுத்தப்பட்டுவிட்டது, ஒரு குறியீடு ஒரு முறை மட்டுமே வேலை செய்யும். நீங்களே பயன்படுத்தியிருந்தால், பாடநெறி கற்றல் பக்கத்தில் உள்ளது. இல்லையெனில், பள்ளியிடம் வேறொரு குறியீட்டைக் கேளுங்கள்.',
    'inst.whyCodeVoided':
      'பள்ளி இந்தக் குறியீட்டைத் திரும்பப் பெற்றுவிட்டது. பள்ளியிடம் புதிய ஒன்றைக் கேளுங்கள்.',
    'inst.whyCourseGone':
      'இந்தக் குறியீட்டுக்கான பாடநெறியில் இப்போது சேர முடியாது. குறியீடு பயன்படுத்தப்படவில்லை, அதனால் பின்னர் மீண்டும் முயலலாம்.',
    'inst.whyNotYourLearner':
      'அந்தக் கற்பவருக்கு நீங்கள் குறியீட்டைப் பயன்படுத்த முடியாது. குறியீடு பயன்படுத்தப்படவில்லை.',
    'inst.whyAlreadyEnrolled':
      'அந்தக் கற்பவர் இந்தக் குறியீட்டுக்கான பாடநெறியில் ஏற்கெனவே இருக்கிறார். குறியீடு பயன்படுத்தப்படவில்லை, அதனால் அதை வேறொரு கற்பவருக்குப் பயன்படுத்தலாம்.',
    'inst.whySeatsClosed':
      'பள்ளிகளின் குறியீடுகளை இப்போது பயன்படுத்த முடியாது. குறியீடு பயன்படுத்தப்படவில்லை. பின்னர் மீண்டும் முயலவும்.',
    'inst.seatsTitle': 'நிறுவனம் வாங்கிய பாடநெறிகள்',
    'inst.seatsUnread':
      'உங்கள் நிறுவனம் வாங்கியவற்றை இப்போது படிக்க முடியவில்லை. அது எதுவும் வாங்கவில்லை என்று இதற்குப் பொருள் இல்லை. சிறிது நேரத்தில் மீண்டும் முயலவும்.',
    'inst.seatsOff':
      'பள்ளிகளின் குறியீடுகள் இப்போது நிறுத்தப்பட்டுள்ளன. அவை மீண்டும் இயக்கப்படும் வரை புதிதாக எதையும் வாங்க முடியாது, குறியீடு கொடுக்க முடியாது, குறியீட்டைப் பயன்படுத்த முடியாது. முன்பு குறியீட்டால் சேர்க்கப்பட்ட பாடநெறிகள் நீக்கப்படாது.',
    'inst.seatsMemberTitle': 'நிறுவனத்தின் நிர்வாகிகள் மட்டுமே இந்தப் பக்கத்தைப் பார்க்கிறார்கள்',
    'inst.seatsMemberBody':
      'நீங்கள் இந்த நிறுவனத்தின் உறுப்பினர், அதன் நிர்வாகி அல்ல; அதனால் அது வாங்கிய பாடநெறிகள் உங்களுக்குக் காட்டப்படாது. உங்களுக்குக் குறியீடு கொடுக்கப்பட்டிருந்தால், அது வேறொரு பக்கத்தில் பயன்படுத்தப்படுகிறது.',
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
    'inst.claimTitle': 'विद्यालयले दिएको कोड प्रयोग गर्ने',
    'inst.claimLede':
      'विद्यालयले तपाईंलाई दिएको कोड लेख्नुहोस्। यसले एक पटक मात्र काम गर्छ। यसले तपाईंले रोजेको सिकारुका लागि एउटा कोर्स थप्छ, र तपाईंले केही तिर्नुपर्दैन।',
    'inst.claimSchoolSees':
      'विद्यालयले आफ्ना कुन कोड कहिले प्रयोग भए भनेर देख्छ। सिकारुको नाम त्यसलाई देखाइँदैन। कुन कोड कसलाई दिइएको थियो भनेर विद्यालयले टिपेर राखेको छ भने, तपाईंको कोड प्रयोग भएको त्यसले थाहा पाउन सक्छ।',
    'inst.claimWithdraw':
      'विद्यालयले पछि कुनै कोड फिर्ता लिन सक्छ। प्रयोग भइसकेको कोड फिर्ता लियो भने सिकारुले त्यो कोर्स फेरि खोल्न सक्दैन। गरिसकेको काम राखिन्छ।',
    'inst.claimCodeLabel': 'तपाईंको कोड',
    'inst.claimCodeHelp':
      'दस अक्षर र अङ्क, विद्यालयले दिएको पत्र वा कार्डमा लेखिएको। साना अक्षर र ड्यासले फरक पार्दैन। कोडमा I, L वा O अक्षर कहिल्यै हुँदैन, र शून्य वा एक पनि कहिल्यै हुँदैन।',
    'inst.claimWho': 'यो कोर्स कसका लागि हो?',
    'inst.claimWhoNote':
      'एउटा कोड एक जना सिकारुका लागि हो। एक जनाका लागि प्रयोग भएपछि त्यो अर्काका लागि प्रयोग गर्न सकिँदैन।',
    'inst.claimMe': 'म आफैँ',
    'inst.claimForMe': 'यो कोर्स तपाईंका लागि थपिनेछ।',
    'inst.claimLearnersUnread':
      'तपाईंको खातामा भएका सिकारुहरू अहिले पढ्न सकिएन, त्यसैले कोड यहाँ अझै प्रयोग गर्न सकिँदैन। केही पनि प्रयोग भएन। केही बेरमा फेरि प्रयास गर्नुहोस्।',
    'inst.claimDo': 'यो कोड प्रयोग गर्नुहोस्',
    'inst.claimDone': 'कोड प्रयोग भयो। यो कोर्स थपियो: {title}',
    'inst.claimDoneNoTitle': 'कोड प्रयोग भयो र कोर्स थपियो।',
    'inst.claimDoneWhere': 'त्यो तपाईंले सिकाइको पृष्ठमा भेट्नुहुनेछ।',
    'inst.claimAnother': 'अर्को कोड प्रयोग गर्नुहोस्',
    'inst.claimUnsure':
      'कोड प्रयोग भएको हामीले पुष्टि गर्न सकेनौँ। फेरि प्रयास गर्नुअघि सिकाइको पृष्ठ हेर्नुहोस्।',
    'inst.whyBadCode':
      'त्यो कोडको रूप होइन। हरेक अक्षर र अङ्क विद्यालयले दिएको कुरासँग दाँजेर हेर्नुहोस्।',
    'inst.whyCodeUnknown':
      'हामीसँग त्यस्तो कोड छैन। त्यसलाई विद्यालयले दिएको कुरासँग दाँजेर हेर्नुहोस्। केही पनि प्रयोग भएन।',
    'inst.whyCodeUsed':
      'यो कोड पहिले नै प्रयोग भइसकेको छ, र कोडले एक पटक मात्र काम गर्छ। तपाईं आफैँले प्रयोग गर्नुभएको हो भने कोर्स सिकाइको पृष्ठमा छ। होइन भने विद्यालयसँग अर्को कोड माग्नुहोस्।',
    'inst.whyCodeVoided': 'विद्यालयले यो कोड फिर्ता लिएको छ। विद्यालयसँग नयाँ कोड माग्नुहोस्।',
    'inst.whyCourseGone':
      'यो कोड जुन कोर्सका लागि हो, त्यसमा अहिले सामेल हुन सकिँदैन। कोड प्रयोग भएन, त्यसैले पछि फेरि प्रयास गर्न सक्नुहुन्छ।',
    'inst.whyNotYourLearner':
      'तपाईंले त्यो सिकारुका लागि कोड प्रयोग गर्न सक्नुहुन्न। कोड प्रयोग भएन।',
    'inst.whyAlreadyEnrolled':
      'त्यो सिकारु यो कोड जुन कोर्सका लागि हो त्यसमा पहिले नै छ। कोड प्रयोग भएन, त्यसैले यो अर्को सिकारुका लागि प्रयोग गर्न सकिन्छ।',
    'inst.whySeatsClosed':
      'विद्यालयका कोडहरू अहिले प्रयोग गर्न सकिँदैन। कोड प्रयोग भएन। पछि फेरि प्रयास गर्नुहोस्।',
    'inst.seatsTitle': 'संस्थाले किनेका कोर्सहरू',
    'inst.seatsUnread':
      'तपाईंको संस्थाले किनेका कुरा अहिले पढ्न सकिएन। यसको अर्थ त्यसले केही किनेको छैन भन्ने होइन। केही बेरमा फेरि प्रयास गर्नुहोस्।',
    'inst.seatsOff':
      'विद्यालयका कोडहरू अहिले बन्द छन्। फेरि खोलिएसम्म नयाँ केही किन्न, कोड दिन र कोड प्रयोग गर्न सकिँदैन। पहिले कोडबाट थपिएका कोर्सहरू फिर्ता लिइँदैनन्।',
    'inst.seatsMemberTitle': 'यो पृष्ठ संस्थाका प्रशासकहरूले मात्र देख्छन्',
    'inst.seatsMemberBody':
      'तपाईं यस संस्थाको सदस्य हुनुहुन्छ, यसको प्रशासक होइन, त्यसैले यसले किनेका कोर्सहरू तपाईंलाई देखाइँदैनन्। तपाईंलाई कोड दिइएको छ भने, त्यो अर्को पृष्ठमा प्रयोग हुन्छ।',
  },
};
