import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Closing an account (`app/account/delete/page.tsx`) and its form.
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts` and
 * `buy.ts`: written for the twenty-seven languages with nothing held in
 * `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Who reads it.** Somebody about to do the one thing here that cannot be
 * undone. The page is two lists, what goes and what stays, and the English
 * is hedged on purpose: "can remain", "may identify you", "tries to", "is
 * not proof". Each of those has a counterpart in every language below. A
 * translation that tidied one away would promise a deletion that does not
 * happen. No speaker has checked any of it, and that is the risk to name.
 *
 * **"Nothing was changed"** is said only where the database answered and
 * rolled back (`teaching`, `board`, `held`, `appointment`, `refused`).
 * `unconfirmed` never says it: the account may be closed.
 *
 * **Three things are put into sentences as markup**, each after a colon in
 * every language but English so that no language has to inflect it: the
 * address the reader is signed in with (`{who}`), the name to type
 * (`{name}`), and the address to write to (`{contact}`). A fourth, `{label}`,
 * is the English string the database writes on a certificate in place of the
 * holder's name; it is printed as it will be seen.
 *
 * **Durations are words** (thirty days, three years), not numbers put in:
 * they are fixed by the migrations, and a language picks its own form for
 * exactly that number.
 *
 * **Served to the server only.** `close.` is in `SERVER_ONLY_PREFIXES`: the
 * page is drawn on the server and hands the form its words.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const CLOSE: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'close.title': 'إغلاق هذا الحساب',
    'close.already': 'هذا الحساب مغلق بالفعل.',
    'close.alreadyNote':
      'تم تغيير الملف الشخصي، لكن قد تبقى بعض السجلات والملفات. بيانات تسجيل الدخول محفوظة لدى مزوّد تسجيل الدخول؛ وإن كانت ما تزال موجودة فإزالتها خطوة منفصلة. وإدراجها في قائمة الإزالة ليس دليلًا على أنها أُزيلت.',
    'close.lede':
      'أنت مسجّل الدخول بالحساب: {who}. هذا الإجراء يغلق الحساب ويغيّر ملفك الشخصي ويزيل بعض المعلومات الشخصية. تبقى بعض السجلات والملفات المخزّنة كما هو موضّح أدناه.',
    'close.ledeUnnamed':
      'هذا الإجراء يغلق الحساب الذي سجّلت الدخول به ويغيّر ملفك الشخصي ويزيل بعض المعلومات الشخصية. تبقى بعض السجلات والملفات المخزّنة كما هو موضّح أدناه.',
    'close.goesHeading': 'ما يُزال أو يُغيَّر عند إغلاق الحساب',
    'close.goesProfile': 'اسمك وصورتك ومنطقتك الزمنية وبلدك',
    'close.goesNotes': 'ملاحظات الدروس والإشارات المرجعية',
    'close.goesSaved': 'الدورات المحفوظة والملاحظات المكتوبة عليها',
    'close.goesReviews':
      'تُزال تقييماتك للدورات. تبقى مشاركات النقاش ضمن سلاسلها مع استبدال ما كتبته.',
    'close.goesAnswers':
      'يُمسح نص الإجابة الحالي في ملف المتعلّم الخاص بك. قد تبقى اللقطات المحفوظة من الصيغ السابقة والملفات المرفقة وفق قواعد احتفاظ منفصلة.',
    'close.goesSharing': 'روابط المشاركة السارية والدعوات وصلاحيات أولياء الأمور',
    'close.goesMessages':
      'إشعارات المنصة وسجلات الرسائل الصادرة المتعلقة بك. البريد الإلكتروني الذي سُلِّم فعلًا لا يمكن استرجاعه.',
    'close.goesAppointment':
      'إذا كان صاحب هذا الحساب معيَّنًا مسؤولًا عن حماية الأطفال أو عن اعتماد ردّ المبالغ، فإن إغلاقه يحتاج إلى مراجعة فردية. للتواصل: {contact}.',
    'close.goesChildren':
      'قد يُغلق ملف الطفل في عائلة ليس فيها عضو نشط آخر. إذا كان للطفل تسجيل دخول مستقل، أو واجبات محتجزة لأسباب تتعلق بالحماية، يتوقف الإغلاق الذاتي للحساب إلى حين مراجعة فردية. للتواصل: {contact}. أما سجلات تعلّم الأطفال الأخرى المؤهلة، ومنها الواجبات، فتُجدول إزالتها بعد ثلاثين يومًا. الملفات المخزّنة تحتاج إلى خطوة حذف منفصلة.',
    'close.staysHeading': 'السجلات التي تبقى',
    'close.staysMoney':
      'الطلبات والمدفوعات والمبالغ المستردة: وهي الدفتر الذي يعتمد عليه أي استرداد',
    'close.staysProgress':
      'تسجيلاتك في الدورات وتقدّمك في الدروس. سجلات الأطفال المؤهلة تُجدول إزالتها بعد ثلاثين يومًا من الإغلاق.',
    'close.staysCertificates': 'الشهادات، بالرقم الذي صدرت به',
    'close.staysSupport':
      'حالات الدعم. يُستبدل نص الحالات التي فتحتها، وتُزال الرسائل التي كتبتها، ومنها رسائلك في حالات غيرك. إذا كانت الحالة موقوفة لأسباب تتعلق بالحماية يُحتفظ بمحتواها إلى أن يُرفع الإيقاف، وقد تدلّ عليك. تحاول المنصة استبدال اسمك المعروض في ردود الموظفين وملاحظات الحل، لكن قد تبقى أسماء أو معرّفات أخرى. يحين موعد حذف الحالة بعد ثلاث سنوات من إغلاقها.',
    'close.staysAudit': 'سجل التدقيق الذي يثبت أن الحساب أُغلق',
    'close.staysFingerprint':
      'بصمة رقمية لعنوان تسجيل الدخول، لا العنوان نفسه، ليتمكّن الدعم من الإجابة عن سؤال «هل مُحي حسابي؟» بعد زوال تسجيل الدخول',
    'close.staysHolder':
      'في الشهادة يُستبدل باسم حاملها النص التالي: {label}؛ ويبقى رقمها وسائر التفاصيل المسجّلة فيها. وشهادة الطفل تحتفظ برقمها أيضًا بعد إزالة سجل التعلّم.',
    'close.undoHeading': 'لا يمكن التراجع عن هذا',
    'close.undoSessions':
      'يحاول التطبيق تسجيل خروجك، لكن قد تبقى جلسات أخرى وبيانات تسجيل الدخول لدى المزوّد إلى أن تُلغى أو تُزال بإجراء منفصل. إذا كنت معلّمًا ولك دورة قيد المراجعة أو منشورة، فعلى مالك المنصة أن يغلق حساب التدريس أولًا؛ وستخبرك هذه الصفحة إن كان ذلك ينطبق عليك.',
    'close.undoSignInLead': 'إغلاق الحساب لا يحذف تسجيل الدخول.',
    'close.undoSignIn':
      'فهو محفوظ لدى مزوّد تسجيل الدخول لا لدى AyahSpring، ولذلك يضعه إغلاق الحساب في قائمة مالك المنصة لخطوة إزالة منفصلة إن كان ما يزال موجودًا. قبل تسجيل الإزالة تتحقق قاعدة البيانات من أن الهوية غير موجودة في جدول المصادقة لديها؛ وهذا ليس دليلًا على زوال كل النسخ لدى المزوّد.',
    'close.confirmLabel': 'للتأكيد اكتب: {name}',
    'close.confirmNote':
      'يصبح الزر متاحًا عندما يطابق الاسم تمامًا. لا يمكن التراجع عن هذا، ولا توجد مهلة للعدول.',
    'close.nameless': 'ليس لهذا الحساب اسم يُكتب. أضف اسمًا في إعدادات الحساب أولًا.',
    'close.button': 'أغلق حسابي نهائيًا',
    'close.closing': 'جارٍ الإغلاق…',
    'close.keep': 'أبقِ حسابي',
    'close.signedOut': 'لقد سُجّل خروجك. سجّل الدخول من جديد لإغلاق هذا الحساب.',
    'close.noAccount': 'لا يوجد هنا حساب يمكن إغلاقه.',
    'close.nameMissing': 'اكتب اسمك للتأكيد.',
    'close.nameMismatch': 'الاسم غير مطابق. اكتبه تمامًا كما يظهر أعلاه.',
    'close.teaching':
      'ما زالت لك دورة قيد المراجعة أو منشورة. اطلب من مالك المنصة إغلاق حساب التدريس أولًا. لم يتغيّر شيء.',
    'close.board': 'أنت عضو في هيئة علمية. اطلب من مالك المنصة إعفاءك منها أولًا. لم يتغيّر شيء.',
    'close.held':
      'هذا الحساب مرتبط بتسجيل دخول مستقل لطفل، أو بواجبات محتجزة، ولذلك يحتاج إغلاقه إلى مراجعة فردية. لم يتغيّر شيء. للتواصل: {contact}.',
    'close.appointment':
      'صاحب هذا الحساب معيَّن مسؤولًا عن حماية الأطفال أو عن اعتماد ردّ المبالغ، ولذلك يحتاج إغلاقه إلى مراجعة فردية. لم يتغيّر شيء. للتواصل: {contact}.',
    'close.refused': 'تعذّر إغلاق هذا الحساب، ولم يتغيّر شيء. إذا تكرّر ذلك فللتواصل: {contact}.',
    'close.unconfirmed':
      'لم نتمكّن من التأكد هل أُغلق حسابك أم لا. قبل المحاولة من جديد أعد تحميل هذه الصفحة لترى، أو تواصل عبر: {contact}.',
  },
  ur: {
    'close.title': 'یہ اکاؤنٹ بند کریں',
    'close.already': 'یہ اکاؤنٹ پہلے ہی بند ہے۔',
    'close.alreadyNote':
      'پروفائل بدل دیا گیا ہے، لیکن کچھ ریکارڈ اور فائلیں باقی رہ سکتی ہیں۔ سائن اِن کی معلومات سائن اِن فراہم کنندہ کے پاس ہوتی ہیں؛ اگر وہ اب بھی موجود ہیں تو انہیں ہٹانا ایک الگ قدم ہے۔ ہٹانے کی فہرست میں ہونا اس بات کا ثبوت نہیں کہ وہ ہٹا دی گئی ہیں۔',
    'close.lede':
      'آپ اس اکاؤنٹ سے سائن اِن ہیں: {who}۔ یہ عمل اکاؤنٹ بند کرتا ہے، آپ کا پروفائل بدلتا ہے اور کچھ ذاتی معلومات ہٹاتا ہے۔ کچھ ریکارڈ اور محفوظ فائلیں باقی رہتی ہیں، جیسا کہ نیچے بتایا گیا ہے۔',
    'close.ledeUnnamed':
      'یہ عمل وہ اکاؤنٹ بند کرتا ہے جس سے آپ سائن اِن ہیں، آپ کا پروفائل بدلتا ہے اور کچھ ذاتی معلومات ہٹاتا ہے۔ کچھ ریکارڈ اور محفوظ فائلیں باقی رہتی ہیں، جیسا کہ نیچے بتایا گیا ہے۔',
    'close.goesHeading': 'اکاؤنٹ بند ہونے پر جو ہٹایا یا بدلا جاتا ہے',
    'close.goesProfile': 'آپ کا نام، تصویر، ٹائم زون اور ملک',
    'close.goesNotes': 'اسباق کے نوٹس اور بُک مارکس',
    'close.goesSaved': 'محفوظ کیے گئے کورسز اور ان پر لکھے نوٹس',
    'close.goesReviews':
      'کورسز پر آپ کے تبصرے ہٹا دیے جاتے ہیں۔ گفتگو کی پوسٹس اپنے سلسلوں میں رہتی ہیں، مگر آپ کا لکھا ہوا متن بدل دیا جاتا ہے۔',
    'close.goesAnswers':
      'آپ کے اپنے سیکھنے والے کے پروفائل پر موجودہ جواب کا متن صاف کر دیا جاتا ہے۔ پہلے کی نظرِ ثانی کی محفوظ نقلیں اور منسلک فائلیں الگ قواعد کے تحت باقی رہ سکتی ہیں۔',
    'close.goesSharing': 'فعال شیئرنگ لنکس، دعوتیں اور سرپرست کی رسائی',
    'close.goesMessages':
      'پلیٹ فارم کی اطلاعات اور آپ سے متعلق بھیجے گئے پیغامات کے ریکارڈ۔ جو ای میل پہنچ چکی ہے وہ واپس نہیں لی جا سکتی۔',
    'close.goesAppointment':
      'اگر اس اکاؤنٹ کے پاس بچوں کے تحفظ یا رقم واپسی کی منظوری کی ذمہ داری ہے تو اسے بند کرنے کے لیے انفرادی جائزہ ضروری ہے۔ رابطہ: {contact}۔',
    'close.goesChildren':
      'جس خاندان میں کوئی اور فعال رکن نہ ہو اس میں بچے کا پروفائل بند کیا جا سکتا ہے۔ اگر بچے کا الگ لاگ اِن ہے، یا اس کا کورس ورک تحفظ کی وجہ سے روکا گیا ہے، تو خود سے اکاؤنٹ بند کرنا انفرادی جائزے تک روک دیا جاتا ہے۔ رابطہ: {contact}۔ بچوں کے دیگر اہل تعلیمی ریکارڈ، بشمول کورس ورک، تیس دن بعد ہٹانے کے لیے طے کیے جاتے ہیں۔ محفوظ فائلوں کو حذف کرنا ایک الگ قدم ہے۔',
    'close.staysHeading': 'جو ریکارڈ باقی رہتے ہیں',
    'close.staysMoney': 'آرڈر، ادائیگیاں اور رقم کی واپسیاں: وہ کھاتہ جس پر رقم واپسی کا انحصار ہے',
    'close.staysProgress':
      'آپ کے اپنے اندراجات اور اسباق میں پیش رفت۔ بچوں کے اہل ریکارڈ بندش کے تیس دن بعد ہٹانے کے لیے طے کیے جاتے ہیں۔',
    'close.staysCertificates': 'اسناد، اسی نمبر کے ساتھ جس پر وہ جاری ہوئیں',
    'close.staysSupport':
      'مدد کے کیس۔ جو کیس آپ نے کھولے ان کا متن بدل دیا جاتا ہے، اور آپ کے لکھے پیغامات ہٹا دیے جاتے ہیں، دوسروں کے کیسوں میں لکھے پیغامات سمیت۔ اگر کوئی کیس تحفظ کی وجہ سے روکا گیا ہو تو اس کا مواد روک ہٹنے تک رکھا جاتا ہے، اور اس سے آپ کی شناخت ہو سکتی ہے۔ پلیٹ فارم عملے کے جوابات اور حل کے نوٹس میں آپ کا ظاہری نام بدلنے کی کوشش کرتا ہے، لیکن دوسرے نام یا شناختی نشان باقی رہ سکتے ہیں۔ کیس بند ہونے کے تین سال بعد حذف کیا جانا ہوتا ہے۔',
    'close.staysAudit': 'آڈٹ کا وہ ریکارڈ کہ اکاؤنٹ بند کیا گیا',
    'close.staysFingerprint':
      'آپ کے سائن اِن پتے کا ڈیجیٹل نشان، خود پتہ نہیں، تاکہ سائن اِن ختم ہونے کے بعد بھی مدد کا عملہ اس سوال کا جواب دے سکے: ”کیا میرا اکاؤنٹ مٹا دیا گیا؟“',
    'close.staysHolder':
      'سند پر حامل کے نام کی جگہ یہ لکھا جاتا ہے: {label}؛ اس کا نمبر اور اس پر درج دیگر تفصیلات باقی رہتی ہیں۔ بچے کی سند بھی تعلیمی ریکارڈ ہٹنے کے بعد اپنا نمبر برقرار رکھتی ہے۔',
    'close.undoHeading': 'یہ واپس نہیں ہو سکتا',
    'close.undoSessions':
      'ایپ آپ کو سائن آؤٹ کرنے کی کوشش کرتی ہے، لیکن دوسرے سیشن اور فراہم کنندہ کے پاس موجود سائن اِن اس وقت تک باقی رہ سکتے ہیں جب تک انہیں الگ سے منسوخ یا ہٹایا نہ جائے۔ اگر آپ استاد ہیں اور آپ کا کوئی کورس جائزے میں ہے یا شائع ہے تو پہلے پلیٹ فارم کے مالک کو تدریسی اکاؤنٹ بند کرنا ہوگا؛ اگر یہ آپ پر لاگو ہوا تو یہ صفحہ بتا دے گا۔',
    'close.undoSignInLead': 'اکاؤنٹ بند کرنے سے سائن اِن حذف نہیں ہوتا۔',
    'close.undoSignIn':
      'وہ AyahSpring کے پاس نہیں بلکہ سائن اِن فراہم کنندہ کے پاس ہوتا ہے، اس لیے اگر وہ اب بھی موجود ہو تو اکاؤنٹ بند ہونے پر اسے پلیٹ فارم کے مالک کی فہرست میں الگ سے ہٹانے کے لیے رکھ دیا جاتا ہے۔ ہٹانے کا اندراج کرنے سے پہلے ڈیٹابیس دیکھتا ہے کہ شناخت اس کی تصدیقی جدول میں موجود نہیں؛ یہ فراہم کنندہ کی تمام نقلوں کے بارے میں ثبوت نہیں ہے۔',
    'close.confirmLabel': 'تصدیق کے لیے یہ لکھیں: {name}',
    'close.confirmNote':
      'جب نام بالکل مل جائے گا تو بٹن دستیاب ہو جائے گا۔ یہ واپس نہیں ہو سکتا، اور ارادہ بدلنے کی کوئی مہلت نہیں ہے۔',
    'close.nameless':
      'اس اکاؤنٹ کا کوئی نام نہیں جو لکھا جا سکے۔ پہلے اکاؤنٹ کی ترتیبات میں نام شامل کریں۔',
    'close.button': 'میرا اکاؤنٹ ہمیشہ کے لیے بند کریں',
    'close.closing': 'بند کیا جا رہا ہے…',
    'close.keep': 'میرا اکاؤنٹ برقرار رکھیں',
    'close.signedOut': 'آپ سائن آؤٹ ہو چکے ہیں۔ یہ اکاؤنٹ بند کرنے کے لیے دوبارہ سائن اِن کریں۔',
    'close.noAccount': 'یہاں بند کرنے کے لیے کوئی اکاؤنٹ نہیں ہے۔',
    'close.nameMissing': 'تصدیق کے لیے اپنا نام لکھیں۔',
    'close.nameMismatch': 'نام نہیں ملتا۔ اسے بالکل ویسے لکھیں جیسے اوپر دکھایا گیا ہے۔',
    'close.teaching':
      'آپ کا ایک کورس ابھی جائزے میں ہے یا شائع ہے۔ پہلے پلیٹ فارم کے مالک سے تدریسی اکاؤنٹ بند کرنے کو کہیں۔ کچھ نہیں بدلا۔',
    'close.board':
      'آپ ایک علمی بورڈ کے رکن ہیں۔ پہلے پلیٹ فارم کے مالک سے کہیں کہ آپ کو اس سے ہٹا دیں۔ کچھ نہیں بدلا۔',
    'close.held':
      'یہ اکاؤنٹ بچے کے ایک الگ لاگ اِن سے، یا روکے گئے کورس ورک سے جڑا ہے، اس لیے اسے بند کرنے کے لیے انفرادی جائزہ ضروری ہے۔ کچھ نہیں بدلا۔ رابطہ: {contact}۔',
    'close.appointment':
      'اس اکاؤنٹ کے پاس بچوں کے تحفظ یا رقم واپسی کی منظوری کی ذمہ داری ہے، اس لیے اسے بند کرنے کے لیے انفرادی جائزہ ضروری ہے۔ کچھ نہیں بدلا۔ رابطہ: {contact}۔',
    'close.refused':
      'یہ اکاؤنٹ بند نہیں ہو سکا، اور کچھ نہیں بدلا۔ اگر ایسا بار بار ہو تو رابطہ: {contact}۔',
    'close.unconfirmed':
      'ہم تصدیق نہیں کر سکے کہ آپ کا اکاؤنٹ بند ہوا یا نہیں۔ دوبارہ کوشش سے پہلے یہ صفحہ دوبارہ لوڈ کر کے دیکھیں، یا رابطہ کریں: {contact}۔',
  },
  fa: {
    'close.title': 'بستن این حساب',
    'close.already': 'این حساب پیش‌تر بسته شده است.',
    'close.alreadyNote':
      'نمایه تغییر کرده است، اما ممکن است برخی سوابق و پرونده‌ها باقی بمانند. اطلاعات ورود نزد ارائه‌دهندهٔ ورود نگه‌داری می‌شود؛ اگر هنوز وجود داشته باشد، برداشتن آن گامی جداگانه است. بودن در فهرست حذف دلیل بر حذف شدن آن نیست.',
    'close.lede':
      'شما با این حساب وارد شده‌اید: {who}. این کار حساب را می‌بندد، نمایهٔ شما را تغییر می‌دهد و برخی اطلاعات شخصی را برمی‌دارد. برخی سوابق و پرونده‌های ذخیره‌شده، چنان‌که در پایین توضیح داده شده، باقی می‌مانند.',
    'close.ledeUnnamed':
      'این کار حسابی را که با آن وارد شده‌اید می‌بندد، نمایهٔ شما را تغییر می‌دهد و برخی اطلاعات شخصی را برمی‌دارد. برخی سوابق و پرونده‌های ذخیره‌شده، چنان‌که در پایین توضیح داده شده، باقی می‌مانند.',
    'close.goesHeading': 'آنچه هنگام بستن حساب برداشته یا تغییر داده می‌شود',
    'close.goesProfile': 'نام، عکس، منطقهٔ زمانی و کشور شما',
    'close.goesNotes': 'یادداشت‌های درس و نشانک‌ها',
    'close.goesSaved': 'دوره‌های ذخیره‌شده و یادداشت‌های روی آن‌ها',
    'close.goesReviews':
      'نظرهای شما دربارهٔ دوره‌ها برداشته می‌شود. نوشته‌های گفت‌وگو در رشتهٔ خود می‌مانند و متن شما جایگزین می‌شود.',
    'close.goesAnswers':
      'متن کنونی پاسخ در نمایهٔ یادگیرندهٔ خود شما پاک می‌شود. نسخه‌های ثبت‌شده از بازنگری‌های پیشین و پرونده‌های پیوست ممکن است بر پایهٔ قواعد نگه‌داری جداگانه باقی بمانند.',
    'close.goesSharing': 'پیوندهای هم‌رسانی فعال، دعوت‌ها و دسترسی سرپرست',
    'close.goesMessages':
      'اعلان‌های سکو و سوابق پیام‌های فرستاده‌شدهٔ مربوط به شما. ایمیلی که تحویل شده است پس گرفته نمی‌شود.',
    'close.goesAppointment':
      'اگر این حساب مسئولیت حفاظت از کودکان یا تأیید بازپرداخت را بر عهده داشته باشد، بستن آن به بررسی موردی نیاز دارد. نشانی تماس: {contact}.',
    'close.goesChildren':
      'نمایهٔ کودک در خانواده‌ای که عضو فعال دیگری ندارد ممکن است بسته شود. اگر کودک ورود جداگانه داشته باشد، یا تکلیف‌هایش به دلیل حفاظت نگه داشته شده باشد، بستن حساب به دست خودتان تا بررسی موردی متوقف می‌شود. نشانی تماس: {contact}. دیگر سوابق یادگیری کودکان که واجد شرایط‌اند، از جمله تکلیف‌ها، برای برداشته شدن پس از سی روز زمان‌بندی می‌شوند. پرونده‌های ذخیره‌شده به گام حذف جداگانه نیاز دارند.',
    'close.staysHeading': 'سوابقی که باقی می‌مانند',
    'close.staysMoney': 'سفارش‌ها، پرداخت‌ها و بازپرداخت‌ها: دفتری که بازپرداخت به آن وابسته است',
    'close.staysProgress':
      'ثبت‌نام‌های خود شما و پیشرفت در درس‌ها. سوابق واجد شرایط کودکان برای برداشته شدن سی روز پس از بسته شدن حساب زمان‌بندی می‌شوند.',
    'close.staysCertificates': 'گواهی‌نامه‌ها، با همان شماره‌ای که صادر شده‌اند',
    'close.staysSupport':
      'پرونده‌های پشتیبانی. متن پرونده‌هایی که خودتان باز کرده‌اید جایگزین می‌شود و پیام‌هایی که نوشته‌اید برداشته می‌شود، از جمله پیام‌هایتان در پرونده‌های دیگران. اگر پرونده‌ای به دلیل حفاظت متوقف شده باشد، محتوای آن تا برداشته شدن توقف نگه داشته می‌شود و ممکن است هویت شما را نشان دهد. سکو می‌کوشد نام نمایشی شما را در پاسخ‌های کارکنان و یادداشت‌های حل‌وفصل جایگزین کند، اما ممکن است نام‌ها یا شناسه‌های دیگری باقی بماند. موعد حذف هر پرونده سه سال پس از بسته شدن آن است.',
    'close.staysAudit': 'سابقهٔ ممیزی که نشان می‌دهد حساب بسته شده است',
    'close.staysFingerprint':
      'اثر انگشت رقمی نشانی ورود شما، نه خود نشانی، تا پشتیبانی پس از برداشته شدن ورود هم بتواند به این پرسش پاسخ دهد: «آیا حساب من پاک شد؟»',
    'close.staysHolder':
      'در گواهی‌نامه به جای نام دارنده این نوشته می‌شود: {label}؛ شماره و دیگر جزئیات ثبت‌شده در آن باقی می‌ماند. گواهی‌نامهٔ کودک نیز پس از برداشته شدن سابقهٔ یادگیری شمارهٔ خود را نگه می‌دارد.',
    'close.undoHeading': 'این کار برگشت‌پذیر نیست',
    'close.undoSessions':
      'برنامه می‌کوشد شما را خارج کند، اما نشست‌های دیگر و ورود نزد ارائه‌دهنده ممکن است تا زمانی که جداگانه لغو یا برداشته شوند باقی بمانند. اگر معلم هستید و دوره‌ای در حال بازبینی یا منتشرشده دارید، نخست مالک سکو باید حساب تدریس را ببندد؛ اگر این وضع شامل شما شود، همین صفحه آن را خواهد گفت.',
    'close.undoSignInLead': 'بستن حساب ورود را حذف نمی‌کند.',
    'close.undoSignIn':
      'ورود نزد ارائه‌دهندهٔ ورود نگه‌داری می‌شود نه نزد AyahSpring؛ از این رو اگر هنوز وجود داشته باشد، بستن حساب آن را برای گام حذف جداگانه در فهرست مالک سکو می‌گذارد. پیش از ثبت حذف، پایگاه داده بررسی می‌کند که آن هویت در جدول احراز هویتش نباشد؛ این دلیلی دربارهٔ همهٔ نسخه‌های نزد ارائه‌دهنده نیست.',
    'close.confirmLabel': 'برای تأیید این را بنویسید: {name}',
    'close.confirmNote':
      'دکمه زمانی فعال می‌شود که نام دقیقاً یکسان باشد. این کار برگشت‌پذیر نیست و مهلتی برای انصراف وجود ندارد.',
    'close.nameless': 'این حساب نامی برای نوشتن ندارد. نخست در تنظیمات حساب نامی بیفزایید.',
    'close.button': 'حساب مرا برای همیشه ببند',
    'close.closing': 'در حال بستن…',
    'close.keep': 'حسابم را نگه دار',
    'close.signedOut': 'شما از حساب خارج شده‌اید. برای بستن این حساب دوباره وارد شوید.',
    'close.noAccount': 'حسابی برای بستن در اینجا وجود ندارد.',
    'close.nameMissing': 'برای تأیید نام خود را بنویسید.',
    'close.nameMismatch': 'نام یکسان نیست. آن را دقیقاً همان‌گونه که در بالا آمده بنویسید.',
    'close.teaching':
      'هنوز دوره‌ای در حال بازبینی یا منتشرشده دارید. نخست از مالک سکو بخواهید حساب تدریس را ببندد. چیزی تغییر نکرد.',
    'close.board':
      'شما عضو یک هیئت علمی هستید. نخست از مالک سکو بخواهید شما را از آن بردارد. چیزی تغییر نکرد.',
    'close.held':
      'این حساب به ورود جداگانهٔ یک کودک یا به تکلیف‌های نگه‌داشته‌شده پیوند دارد و بستن آن به بررسی موردی نیاز دارد. چیزی تغییر نکرد. نشانی تماس: {contact}.',
    'close.appointment':
      'این حساب مسئولیت حفاظت از کودکان یا تأیید بازپرداخت را بر عهده دارد و بستن آن به بررسی موردی نیاز دارد. چیزی تغییر نکرد. نشانی تماس: {contact}.',
    'close.refused':
      'این حساب بسته نشد و چیزی تغییر نکرد. اگر این وضع تکرار شد، نشانی تماس: {contact}.',
    'close.unconfirmed':
      'نتوانستیم تأیید کنیم که حساب شما بسته شد یا نه. پیش از تلاش دوباره، این صفحه را دوباره بار کنید تا ببینید، یا تماس بگیرید: {contact}.',
  },
  'fa-af': {
    'close.title': 'بستن این حساب',
    'close.already': 'این حساب پیش از این بسته شده است.',
    'close.alreadyNote':
      'پروفایل تغییر کرده است، اما شاید برخی سوابق و فایل‌ها باقی بمانند. معلومات ورود نزد فراهم‌کنندهٔ ورود نگه‌داری می‌شود؛ اگر هنوز موجود باشد، برداشتن آن یک گام جداگانه است. بودن در فهرست حذف دلیل حذف شدن آن نیست.',
    'close.lede':
      'شما با این حساب وارد شده‌اید: {who}. این کار حساب را می‌بندد، پروفایل شما را تغییر می‌دهد و برخی معلومات شخصی را برمی‌دارد. برخی سوابق و فایل‌های ذخیره‌شده، چنان‌که در پایین توضیح داده شده، باقی می‌مانند.',
    'close.ledeUnnamed':
      'این کار حسابی را که با آن وارد شده‌اید می‌بندد، پروفایل شما را تغییر می‌دهد و برخی معلومات شخصی را برمی‌دارد. برخی سوابق و فایل‌های ذخیره‌شده، چنان‌که در پایین توضیح داده شده، باقی می‌مانند.',
    'close.goesHeading': 'آنچه هنگام بستن حساب برداشته یا تغییر داده می‌شود',
    'close.goesProfile': 'نام، عکس، ساحهٔ زمانی و کشور شما',
    'close.goesNotes': 'یادداشت‌های درس و نشانی‌ها',
    'close.goesSaved': 'کورس‌های ذخیره‌شده و یادداشت‌های روی آن‌ها',
    'close.goesReviews':
      'نظرهای شما دربارهٔ کورس‌ها برداشته می‌شود. نوشته‌های گفت‌وگو در رشتهٔ خود می‌مانند و متن شما جایگزین می‌شود.',
    'close.goesAnswers':
      'متن کنونی پاسخ در پروفایل شاگرد خود شما پاک می‌شود. نسخه‌های ثبت‌شده از بازنگری‌های پیشین و فایل‌های ضمیمه شاید بر اساس قواعد نگه‌داری جداگانه باقی بمانند.',
    'close.goesSharing': 'لینک‌های شریک‌سازی فعال، دعوت‌ها و دسترسی سرپرست',
    'close.goesMessages':
      'اطلاعیه‌های پلتفرم و سوابق پیام‌های فرستاده‌شدهٔ مربوط به شما. ایمیلی که رسیده است پس گرفته نمی‌شود.',
    'close.goesAppointment':
      'اگر این حساب مسئولیت محافظت از اطفال یا تأیید بازپرداخت را به عهده داشته باشد، بستن آن به بررسی انفرادی نیاز دارد. آدرس تماس: {contact}.',
    'close.goesChildren':
      'پروفایل طفل در خانواده‌ای که عضو فعال دیگری ندارد شاید بسته شود. اگر طفل ورود جداگانه داشته باشد، یا کارهای درسی‌اش به دلیل محافظت نگه داشته شده باشد، بستن حساب به دست خودتان تا بررسی انفرادی متوقف می‌شود. آدرس تماس: {contact}. دیگر سوابق آموزشی اطفال که واجد شرایط‌اند، به شمول کارهای درسی، برای برداشته شدن پس از سی روز زمان‌بندی می‌شوند. فایل‌های ذخیره‌شده به گام حذف جداگانه نیاز دارند.',
    'close.staysHeading': 'سوابقی که باقی می‌مانند',
    'close.staysMoney': 'فرمایش‌ها، پرداخت‌ها و بازپرداخت‌ها: دفتری که بازپرداخت به آن وابسته است',
    'close.staysProgress':
      'ثبت‌نام‌های خود شما و پیشرفت در درس‌ها. سوابق واجد شرایط اطفال برای برداشته شدن سی روز پس از بسته شدن حساب زمان‌بندی می‌شوند.',
    'close.staysCertificates': 'اسناد، با همان نمبری که صادر شده‌اند',
    'close.staysSupport':
      'دوسیه‌های پشتیبانی. متن دوسیه‌هایی که خودتان باز کرده‌اید جایگزین می‌شود و پیام‌هایی که نوشته‌اید برداشته می‌شود، به شمول پیام‌های شما در دوسیه‌های دیگران. اگر دوسیه‌ای به دلیل محافظت متوقف شده باشد، محتوای آن تا برداشته شدن توقف نگه داشته می‌شود و شاید هویت شما را نشان دهد. پلتفرم می‌کوشد نام نمایشی شما را در پاسخ‌های کارمندان و یادداشت‌های حل‌وفصل جایگزین کند، اما شاید نام‌ها یا شناسه‌های دیگری باقی بماند. موعد حذف هر دوسیه سه سال پس از بسته شدن آن است.',
    'close.staysAudit': 'سابقهٔ تفتیش که نشان می‌دهد حساب بسته شده است',
    'close.staysFingerprint':
      'اثر انگشت دیجیتال آدرس ورود شما، نه خود آدرس، تا پشتیبانی پس از برداشته شدن ورود هم بتواند به این پرسش پاسخ دهد: «آیا حساب من پاک شد؟»',
    'close.staysHolder':
      'در سند به جای نام دارنده این نوشته می‌شود: {label}؛ نمبر و دیگر جزئیات ثبت‌شده در آن باقی می‌ماند. سند طفل نیز پس از برداشته شدن سابقهٔ آموزشی نمبر خود را نگه می‌دارد.',
    'close.undoHeading': 'این کار برگشت‌پذیر نیست',
    'close.undoSessions':
      'برنامه می‌کوشد شما را بیرون کند، اما نشست‌های دیگر و ورود نزد فراهم‌کننده شاید تا زمانی که جداگانه لغو یا برداشته شوند باقی بمانند. اگر استاد هستید و کورسی در حال بازبینی یا نشرشده دارید، نخست مالک پلتفرم باید حساب تدریس را ببندد؛ اگر این وضع شامل شما شود، همین صفحه آن را خواهد گفت.',
    'close.undoSignInLead': 'بستن حساب ورود را حذف نمی‌کند.',
    'close.undoSignIn':
      'ورود نزد فراهم‌کنندهٔ ورود نگه‌داری می‌شود نه نزد AyahSpring؛ از این رو اگر هنوز موجود باشد، بستن حساب آن را برای گام حذف جداگانه در فهرست مالک پلتفرم می‌گذارد. پیش از ثبت حذف، دیتابیس بررسی می‌کند که آن هویت در جدول تصدیق هویتش نباشد؛ این دلیلی دربارهٔ همهٔ نسخه‌های نزد فراهم‌کننده نیست.',
    'close.confirmLabel': 'برای تأیید این را بنویسید: {name}',
    'close.confirmNote':
      'دکمه زمانی فعال می‌شود که نام کاملاً یکسان باشد. این کار برگشت‌پذیر نیست و مهلتی برای انصراف وجود ندارد.',
    'close.nameless': 'این حساب نامی برای نوشتن ندارد. نخست در تنظیمات حساب یک نام بیفزایید.',
    'close.button': 'حساب مرا برای همیشه ببند',
    'close.closing': 'در حال بستن…',
    'close.keep': 'حسابم را نگه دار',
    'close.signedOut': 'شما از حساب بیرون شده‌اید. برای بستن این حساب دوباره وارد شوید.',
    'close.noAccount': 'حسابی برای بستن در اینجا وجود ندارد.',
    'close.nameMissing': 'برای تأیید نام خود را بنویسید.',
    'close.nameMismatch': 'نام یکسان نیست. آن را دقیقاً همان‌طور که در بالا آمده بنویسید.',
    'close.teaching':
      'هنوز کورسی در حال بازبینی یا نشرشده دارید. نخست از مالک پلتفرم بخواهید حساب تدریس را ببندد. چیزی تغییر نکرد.',
    'close.board':
      'شما عضو یک هیئت علمی هستید. نخست از مالک پلتفرم بخواهید شما را از آن بردارد. چیزی تغییر نکرد.',
    'close.held':
      'این حساب به ورود جداگانهٔ یک طفل یا به کارهای درسی نگه‌داشته‌شده پیوند دارد و بستن آن به بررسی انفرادی نیاز دارد. چیزی تغییر نکرد. آدرس تماس: {contact}.',
    'close.appointment':
      'این حساب مسئولیت محافظت از اطفال یا تأیید بازپرداخت را به عهده دارد و بستن آن به بررسی انفرادی نیاز دارد. چیزی تغییر نکرد. آدرس تماس: {contact}.',
    'close.refused':
      'این حساب بسته نشد و چیزی تغییر نکرد. اگر این وضع تکرار شد، آدرس تماس: {contact}.',
    'close.unconfirmed':
      'نتوانستیم تأیید کنیم که حساب شما بسته شد یا نه. پیش از تلاش دوباره، این صفحه را دوباره باز کنید تا ببینید، یا تماس بگیرید: {contact}.',
  },
  tr: {
    'close.title': 'Bu hesabı kapat',
    'close.already': 'Bu hesap zaten kapatılmış.',
    'close.alreadyNote':
      'Profil değiştirildi, ancak bazı kayıtlar ve dosyalar kalabilir. Oturum açma bilgisi oturum açma sağlayıcısında tutulur; hâlâ duruyorsa kaldırılması ayrı bir adımdır. Kaldırılacaklar listesinde olması, kaldırıldığının kanıtı değildir.',
    'close.lede':
      'Oturum açtığınız hesap: {who}. Bu işlem hesabı kapatır, profilinizi değiştirir ve bazı kişisel bilgileri kaldırır. Bazı kayıtlar ve saklanan dosyalar, aşağıda açıklandığı gibi kalır.',
    'close.ledeUnnamed':
      'Bu işlem oturum açtığınız hesabı kapatır, profilinizi değiştirir ve bazı kişisel bilgileri kaldırır. Bazı kayıtlar ve saklanan dosyalar, aşağıda açıklandığı gibi kalır.',
    'close.goesHeading': 'Hesap kapanınca kaldırılan veya değiştirilenler',
    'close.goesProfile': 'Adınız, fotoğrafınız, saat diliminiz ve ülkeniz',
    'close.goesNotes': 'Ders notları ve yer imleri',
    'close.goesSaved': 'Kaydedilen kurslar ve onlara düşülen notlar',
    'close.goesReviews':
      'Kurs değerlendirmeleriniz kaldırılır. Tartışma gönderileri konu başlıkları olarak kalır, yazdıklarınızın yerine başka bir metin konur.',
    'close.goesAnswers':
      'Kendi öğrenci profilinizdeki güncel yanıt metni silinir. Önceki düzeltmelerin kayıtlı kopyaları ve ekli dosyalar ayrı saklama kuralları uyarınca kalabilir.',
    'close.goesSharing': 'Geçerli paylaşım bağlantıları, davetler ve veli erişimi',
    'close.goesMessages':
      'Sizinle ilgili platform bildirimleri ve giden ileti kayıtları. Teslim edilmiş e-posta geri alınamaz.',
    'close.goesAppointment':
      'Bu hesap çocuk koruma veya iade onayı görevini taşıyorsa kapatılması bireysel inceleme gerektirir. İletişim: {contact}.',
    'close.goesChildren':
      'Başka etkin üyesi olmayan bir ailedeki çocuk profili kapatılabilir. Çocuğun ayrı bir oturum açma bilgisi veya koruma nedeniyle bekletilen ödevleri varsa, hesabı kendi başınıza kapatmanız bireysel inceleme yapılana kadar durdurulur. İletişim: {contact}. Çocuklara ait diğer uygun öğrenme kayıtları, ödevler dâhil, otuz gün sonra kaldırılmak üzere planlanır. Saklanan dosyalar ayrı bir silme adımı gerektirir.',
    'close.staysHeading': 'Kalan kayıtlar',
    'close.staysMoney': 'Siparişler, ödemeler ve iadeler: bir iadenin dayandığı defter',
    'close.staysProgress':
      'Kendi kayıtlarınız ve ders ilerlemeniz. Uygun çocuk kayıtları, kapatmadan otuz gün sonra kaldırılmak üzere planlanır.',
    'close.staysCertificates': 'Sertifikalar, verildikleri numarayla',
    'close.staysSupport':
      'Destek talepleri. Sizin açtığınız taleplerin metni değiştirilir ve yazdığınız iletiler, başkalarının taleplerindekiler dâhil, kaldırılır. Bir talep koruma nedeniyle bekletiliyorsa içeriği bekletme kalkana kadar saklanır ve kimliğinizi belli edebilir. Platform, görevli yanıtlarında ve çözüm notlarında görünen adınızı değiştirmeye çalışır, ancak başka adlar veya tanımlayıcılar kalabilir. Bir talebin silinme zamanı, kapanmasından üç yıl sonradır.',
    'close.staysAudit': 'Hesabın kapatıldığına dair denetim kaydı',
    'close.staysFingerprint':
      'Oturum açma adresinizin kendisi değil, dijital parmak izi; böylece destek ekibi oturum açma bilgisi kalktıktan sonra da “hesabım silindi mi?” sorusunu yanıtlayabilir',
    'close.staysHolder':
      'Sertifikada sahibinin adı yerine şu yazılır: {label}; numarası ve üzerinde kayıtlı diğer ayrıntılar kalır. Bir çocuğun sertifikası da öğrenme kaydı kaldırıldıktan sonra numarasını korur.',
    'close.undoHeading': 'Bu geri alınamaz',
    'close.undoSessions':
      'Uygulama oturumunuzu kapatmaya çalışır, ancak diğer oturumlar ve sağlayıcıdaki oturum açma bilgisi ayrıca iptal edilene veya kaldırılana kadar kalabilir. İncelemede veya yayında bir kursu olan bir öğretmenseniz önce platform sahibinin öğretmen hesabını kapatması gerekir; bu sizin için geçerliyse bu sayfa bunu söyleyecektir.',
    'close.undoSignInLead': 'Hesabı kapatmak oturum açma bilgisini silmez.',
    'close.undoSignIn':
      'Bu bilgi AyahSpring’de değil oturum açma sağlayıcısında tutulur; bu yüzden hâlâ duruyorsa hesabı kapatmak onu ayrı bir kaldırma adımı için platform sahibinin listesine koyar. Kaldırma kaydedilmeden önce veritabanı, kimliğin kendi kimlik doğrulama tablosunda bulunmadığını denetler; bu, sağlayıcıdaki bütün kopyalar için kanıt değildir.',
    'close.confirmLabel': 'Onaylamak için şunu yazın: {name}',
    'close.confirmNote':
      'Ad tam olarak eşleştiğinde düğme kullanılabilir olur. Bu geri alınamaz ve cayma süresi yoktur.',
    'close.nameless': 'Bu hesabın yazılacak bir adı yok. Önce hesap ayarlarından bir ad ekleyin.',
    'close.button': 'Hesabımı kalıcı olarak kapat',
    'close.closing': 'Kapatılıyor…',
    'close.keep': 'Hesabım kalsın',
    'close.signedOut': 'Oturumunuz kapanmış. Bu hesabı kapatmak için yeniden oturum açın.',
    'close.noAccount': 'Burada kapatılacak bir hesap yok.',
    'close.nameMissing': 'Onaylamak için adınızı yazın.',
    'close.nameMismatch': 'Ad eşleşmiyor. Yukarıda göründüğü gibi, tam olarak yazın.',
    'close.teaching':
      'Hâlâ incelemede veya yayında bir kursunuz var. Önce platform sahibinden öğretmen hesabını kapatmasını isteyin. Hiçbir şey değişmedi.',
    'close.board':
      'Bir ilim kurulunda üyesiniz. Önce platform sahibinden sizi kuruldan çıkarmasını isteyin. Hiçbir şey değişmedi.',
    'close.held':
      'Bu hesap bir çocuğun ayrı oturum açma bilgisine veya bekletilen ödevlere bağlı; bu yüzden kapatılması bireysel inceleme gerektirir. Hiçbir şey değişmedi. İletişim: {contact}.',
    'close.appointment':
      'Bu hesap çocuk koruma veya iade onayı görevini taşıyor; bu yüzden kapatılması bireysel inceleme gerektirir. Hiçbir şey değişmedi. İletişim: {contact}.',
    'close.refused':
      'Bu hesap kapatılamadı ve hiçbir şey değişmedi. Bu tekrarlanırsa iletişim: {contact}.',
    'close.unconfirmed':
      'Hesabınızın kapanıp kapanmadığını doğrulayamadık. Yeniden denemeden önce görmek için bu sayfayı yeniden yükleyin veya şu adrese yazın: {contact}.',
  },
  id: {
    'close.title': 'Tutup akun ini',
    'close.already': 'Akun ini sudah ditutup.',
    'close.alreadyNote':
      'Profil sudah diubah, tetapi sebagian catatan dan berkas mungkin masih ada. Data masuk disimpan oleh penyedia layanan masuk; jika masih ada, menghapusnya adalah langkah terpisah. Tercantum dalam daftar penghapusan bukan bukti bahwa data itu sudah dihapus.',
    'close.lede':
      'Anda masuk dengan akun: {who}. Tindakan ini menutup akun, mengubah profil Anda, dan menghapus sebagian informasi pribadi. Sebagian catatan dan berkas tersimpan tetap ada, seperti dijelaskan di bawah.',
    'close.ledeUnnamed':
      'Tindakan ini menutup akun yang sedang Anda pakai, mengubah profil Anda, dan menghapus sebagian informasi pribadi. Sebagian catatan dan berkas tersimpan tetap ada, seperti dijelaskan di bawah.',
    'close.goesHeading': 'Yang dihapus atau diubah saat akun ditutup',
    'close.goesProfile': 'Nama, foto, zona waktu, dan negara Anda',
    'close.goesNotes': 'Catatan pelajaran dan penanda',
    'close.goesSaved': 'Kursus tersimpan dan catatan padanya',
    'close.goesReviews':
      'Ulasan kursus Anda dihapus. Kiriman diskusi tetap ada sebagai utas, dengan tulisan Anda diganti.',
    'close.goesAnswers':
      'Teks jawaban terkini pada profil peserta didik Anda sendiri dikosongkan. Salinan revisi sebelumnya dan berkas lampiran dapat tetap ada menurut aturan penyimpanan tersendiri.',
    'close.goesSharing': 'Tautan berbagi yang aktif, undangan, dan akses wali',
    'close.goesMessages':
      'Notifikasi platform dan catatan pesan keluar tentang Anda. Email yang sudah terkirim tidak dapat ditarik kembali.',
    'close.goesAppointment':
      'Jika akun ini memegang penunjukan perlindungan anak atau persetujuan pengembalian dana, penutupannya memerlukan peninjauan tersendiri. Hubungi: {contact}.',
    'close.goesChildren':
      'Profil anak dalam keluarga yang tidak punya anggota aktif lain dapat ditutup. Jika anak itu memiliki login terpisah, atau tugasnya ditahan demi perlindungan anak, penutupan akun secara mandiri dihentikan sementara untuk peninjauan tersendiri. Hubungi: {contact}. Catatan belajar anak lainnya yang memenuhi syarat, termasuk tugas, dijadwalkan untuk dihapus setelah tiga puluh hari. Berkas tersimpan memerlukan langkah penghapusan terpisah.',
    'close.staysHeading': 'Catatan yang tetap ada',
    'close.staysMoney':
      'Pesanan, pembayaran, dan pengembalian dana: buku besar yang menjadi dasar pengembalian dana',
    'close.staysProgress':
      'Pendaftaran Anda sendiri dan kemajuan pelajaran. Catatan anak yang memenuhi syarat dijadwalkan untuk dihapus tiga puluh hari setelah penutupan.',
    'close.staysCertificates': 'Sertifikat, dengan nomor saat diterbitkan',
    'close.staysSupport':
      'Kasus bantuan. Teks kasus yang Anda buka diganti, dan pesan yang Anda tulis dihapus, termasuk pesan dalam kasus orang lain. Jika suatu kasus sedang ditahan demi perlindungan anak, isinya disimpan sampai penahanan dicabut, dan isinya mungkin menunjukkan identitas Anda. Platform berusaha mengganti nama tampilan Anda dalam balasan staf dan catatan penyelesaian, tetapi nama atau pengenal lain mungkin masih ada. Kasus dijadwalkan dihapus tiga tahun setelah ditutup.',
    'close.staysAudit': 'Catatan audit bahwa akun ini ditutup',
    'close.staysFingerprint':
      'Sidik digital alamat masuk Anda, bukan alamatnya, agar tim bantuan dapat menjawab “apakah akun saya sudah dihapus?” setelah data masuk tidak ada lagi',
    'close.staysHolder':
      'Pada sertifikat, nama pemegang diganti dengan: {label}; nomor dan rincian lain yang tercatat padanya tetap ada. Sertifikat anak juga tetap memiliki nomornya setelah catatan belajar dihapus.',
    'close.undoHeading': 'Ini tidak dapat dibatalkan',
    'close.undoSessions':
      'Aplikasi berusaha mengeluarkan Anda, tetapi sesi lain dan data masuk pada penyedia dapat tetap ada sampai dicabut atau dihapus secara terpisah. Jika Anda seorang pengajar dengan kursus yang sedang ditinjau atau sudah terbit, pemilik platform harus menutup akun pengajar lebih dahulu; halaman ini akan mengatakannya jika hal itu berlaku bagi Anda.',
    'close.undoSignInLead': 'Menutup akun tidak menghapus data masuk.',
    'close.undoSignIn':
      'Data itu disimpan oleh penyedia layanan masuk, bukan oleh AyahSpring, sehingga penutupan akun memasukkannya ke daftar pemilik platform untuk langkah penghapusan terpisah jika masih ada. Sebelum penghapusan dicatat, basis data memeriksa bahwa identitas itu tidak ada dalam tabel autentikasinya; itu bukan bukti mengenai semua salinan pada penyedia.',
    'close.confirmLabel': 'Untuk mengonfirmasi, ketik: {name}',
    'close.confirmNote':
      'Tombol dapat dipakai ketika nama cocok persis. Ini tidak dapat dibatalkan, dan tidak ada masa tenggang.',
    'close.nameless':
      'Akun ini tidak punya nama untuk diketik. Tambahkan dahulu di pengaturan akun.',
    'close.button': 'Tutup akun saya selamanya',
    'close.closing': 'Menutup…',
    'close.keep': 'Pertahankan akun saya',
    'close.signedOut': 'Anda sudah keluar. Masuk lagi untuk menutup akun ini.',
    'close.noAccount': 'Tidak ada akun yang dapat ditutup di sini.',
    'close.nameMissing': 'Ketik nama Anda untuk mengonfirmasi.',
    'close.nameMismatch': 'Nama tidak cocok. Ketik persis seperti yang tampil di atas.',
    'close.teaching':
      'Anda masih memiliki kursus yang sedang ditinjau atau sudah terbit. Minta pemilik platform menutup akun pengajar lebih dahulu. Tidak ada yang diubah.',
    'close.board':
      'Anda anggota dewan keilmuan. Minta pemilik platform melepas Anda dari dewan itu lebih dahulu. Tidak ada yang diubah.',
    'close.held':
      'Akun ini terkait dengan login anak yang terpisah, atau dengan tugas yang sedang ditahan, sehingga penutupannya memerlukan peninjauan tersendiri. Tidak ada yang diubah. Hubungi: {contact}.',
    'close.appointment':
      'Akun ini memegang penunjukan perlindungan anak atau persetujuan pengembalian dana, sehingga penutupannya memerlukan peninjauan tersendiri. Tidak ada yang diubah. Hubungi: {contact}.',
    'close.refused':
      'Akun ini tidak dapat ditutup, dan tidak ada yang diubah. Jika terus terjadi, hubungi: {contact}.',
    'close.unconfirmed':
      'Kami tidak dapat memastikan apakah akun Anda sudah ditutup. Sebelum mencoba lagi, muat ulang halaman ini untuk melihatnya, atau hubungi: {contact}.',
  },
  ms: {
    'close.title': 'Tutup akaun ini',
    'close.already': 'Akaun ini sudah ditutup.',
    'close.alreadyNote':
      'Profil telah diubah, tetapi sesetengah rekod dan fail mungkin masih ada. Maklumat log masuk disimpan oleh penyedia log masuk; jika masih ada, membuangnya ialah langkah yang berasingan. Tersenarai untuk dibuang bukan bukti bahawa ia sudah dibuang.',
    'close.lede':
      'Anda log masuk dengan akaun: {who}. Tindakan ini menutup akaun, mengubah profil anda dan membuang sesetengah maklumat peribadi. Sesetengah rekod dan fail yang disimpan kekal, seperti yang diterangkan di bawah.',
    'close.ledeUnnamed':
      'Tindakan ini menutup akaun yang anda sedang gunakan, mengubah profil anda dan membuang sesetengah maklumat peribadi. Sesetengah rekod dan fail yang disimpan kekal, seperti yang diterangkan di bawah.',
    'close.goesHeading': 'Yang dibuang atau diubah apabila akaun ditutup',
    'close.goesProfile': 'Nama, foto, zon waktu dan negara anda',
    'close.goesNotes': 'Nota pelajaran dan penanda',
    'close.goesSaved': 'Kursus yang disimpan dan nota padanya',
    'close.goesReviews':
      'Ulasan kursus anda dibuang. Kiriman perbincangan kekal sebagai bebenang, dengan tulisan anda diganti.',
    'close.goesAnswers':
      'Teks jawapan semasa pada profil pelajar anda sendiri dikosongkan. Salinan semakan terdahulu dan fail lampiran boleh kekal di bawah peraturan penyimpanan yang berasingan.',
    'close.goesSharing': 'Pautan perkongsian yang aktif, jemputan dan akses penjaga',
    'close.goesMessages':
      'Pemberitahuan platform dan rekod mesej keluar tentang anda. E-mel yang sudah dihantar tidak boleh ditarik balik.',
    'close.goesAppointment':
      'Jika akaun ini memegang pelantikan perlindungan kanak-kanak atau kelulusan bayaran balik, penutupannya memerlukan semakan khusus. Hubungi: {contact}.',
    'close.goesChildren':
      'Profil kanak-kanak dalam keluarga yang tiada ahli aktif lain boleh ditutup. Jika kanak-kanak itu mempunyai log masuk berasingan, atau kerja kursusnya ditahan atas sebab perlindungan, penutupan akaun secara sendiri dihentikan sementara untuk semakan khusus. Hubungi: {contact}. Rekod pembelajaran kanak-kanak lain yang layak, termasuk kerja kursus, dijadualkan untuk dibuang selepas tiga puluh hari. Fail yang disimpan memerlukan langkah pemadaman berasingan.',
    'close.staysHeading': 'Rekod yang kekal',
    'close.staysMoney':
      'Pesanan, bayaran dan bayaran balik: lejar yang menjadi asas sesuatu bayaran balik',
    'close.staysProgress':
      'Pendaftaran anda sendiri dan kemajuan pelajaran. Rekod kanak-kanak yang layak dijadualkan untuk dibuang tiga puluh hari selepas penutupan.',
    'close.staysCertificates': 'Sijil, dengan nombor semasa ia dikeluarkan',
    'close.staysSupport':
      'Kes sokongan. Teks kes yang anda buka diganti, dan mesej yang anda tulis dibuang, termasuk mesej dalam kes orang lain. Jika sesuatu kes ditahan atas sebab perlindungan, kandungannya disimpan sehingga tahanan itu ditarik balik, dan ia mungkin mengenal pasti anda. Platform cuba menggantikan nama paparan anda dalam balasan kakitangan dan nota penyelesaian, tetapi nama atau pengecam lain mungkin kekal. Kes dijadualkan dipadam tiga tahun selepas ia ditutup.',
    'close.staysAudit': 'Rekod audit bahawa akaun ini ditutup',
    'close.staysFingerprint':
      'Cap jari digital alamat log masuk anda, bukan alamat itu sendiri, supaya pihak sokongan dapat menjawab “adakah akaun saya telah dipadam?” selepas log masuk tiada lagi',
    'close.staysHolder':
      'Pada sijil, nama pemegang diganti dengan: {label}; nombor dan butiran lain yang direkodkan padanya kekal. Sijil kanak-kanak juga mengekalkan nombornya selepas rekod pembelajaran dibuang.',
    'close.undoHeading': 'Ini tidak boleh dibatalkan',
    'close.undoSessions':
      'Aplikasi cuba melog keluar anda, tetapi sesi lain dan log masuk pada penyedia boleh kekal sehingga dibatalkan atau dibuang secara berasingan. Jika anda seorang guru dengan kursus yang sedang disemak atau sudah diterbitkan, pemilik platform perlu menutup akaun pengajaran terlebih dahulu; halaman ini akan menyatakannya jika perkara itu berkenaan dengan anda.',
    'close.undoSignInLead': 'Menutup akaun tidak memadam log masuk.',
    'close.undoSignIn':
      'Ia disimpan oleh penyedia log masuk, bukan oleh AyahSpring, maka penutupan akaun meletakkannya dalam senarai pemilik platform untuk langkah pembuangan berasingan jika ia masih ada. Sebelum pembuangan direkodkan, pangkalan data memeriksa bahawa identiti itu tiada dalam jadual pengesahannya; itu bukan bukti tentang semua salinan pada penyedia.',
    'close.confirmLabel': 'Untuk mengesahkan, taip: {name}',
    'close.confirmNote':
      'Butang boleh digunakan apabila nama sepadan dengan tepat. Ini tidak boleh dibatalkan, dan tiada tempoh bertenang.',
    'close.nameless':
      'Akaun ini tiada nama untuk ditaip. Tambahkan nama dalam tetapan akaun dahulu.',
    'close.button': 'Tutup akaun saya buat selama-lamanya',
    'close.closing': 'Menutup…',
    'close.keep': 'Kekalkan akaun saya',
    'close.signedOut': 'Anda telah log keluar. Log masuk semula untuk menutup akaun ini.',
    'close.noAccount': 'Tiada akaun untuk ditutup di sini.',
    'close.nameMissing': 'Taip nama anda untuk mengesahkan.',
    'close.nameMismatch': 'Nama tidak sepadan. Taip tepat seperti yang dipaparkan di atas.',
    'close.teaching':
      'Anda masih mempunyai kursus yang sedang disemak atau sudah diterbitkan. Minta pemilik platform menutup akaun pengajaran terlebih dahulu. Tiada apa-apa yang diubah.',
    'close.board':
      'Anda ahli lembaga keilmuan. Minta pemilik platform mengeluarkan anda daripadanya terlebih dahulu. Tiada apa-apa yang diubah.',
    'close.held':
      'Akaun ini dipautkan kepada log masuk kanak-kanak yang berasingan, atau kepada kerja kursus yang sedang ditahan, maka penutupannya memerlukan semakan khusus. Tiada apa-apa yang diubah. Hubungi: {contact}.',
    'close.appointment':
      'Akaun ini memegang pelantikan perlindungan kanak-kanak atau kelulusan bayaran balik, maka penutupannya memerlukan semakan khusus. Tiada apa-apa yang diubah. Hubungi: {contact}.',
    'close.refused':
      'Akaun ini tidak dapat ditutup, dan tiada apa-apa yang diubah. Jika ini berterusan, hubungi: {contact}.',
    'close.unconfirmed':
      'Kami tidak dapat mengesahkan sama ada akaun anda telah ditutup. Sebelum mencuba lagi, muat semula halaman ini untuk melihatnya, atau hubungi: {contact}.',
  },
  bn: {
    'close.title': 'এই অ্যাকাউন্ট বন্ধ করুন',
    'close.already': 'এই অ্যাকাউন্ট আগেই বন্ধ করা হয়েছে।',
    'close.alreadyNote':
      'প্রোফাইল বদলানো হয়েছে, তবে কিছু রেকর্ড ও ফাইল থেকে যেতে পারে। সাইন-ইনের তথ্য সাইন-ইন সেবাদাতার কাছে থাকে; সেটি এখনো থাকলে সরানো একটি আলাদা ধাপ। সরানোর তালিকায় থাকা মানে সরানো হয়েছে, তার প্রমাণ নয়।',
    'close.lede':
      'আপনি এই অ্যাকাউন্টে সাইন ইন করে আছেন: {who}। এই কাজটি অ্যাকাউন্ট বন্ধ করে, আপনার প্রোফাইল বদলায় এবং কিছু ব্যক্তিগত তথ্য সরায়। নিচে যেমন বলা হয়েছে, কিছু রেকর্ড ও সংরক্ষিত ফাইল থেকে যায়।',
    'close.ledeUnnamed':
      'এই কাজটি আপনি যে অ্যাকাউন্টে সাইন ইন করে আছেন সেটি বন্ধ করে, আপনার প্রোফাইল বদলায় এবং কিছু ব্যক্তিগত তথ্য সরায়। নিচে যেমন বলা হয়েছে, কিছু রেকর্ড ও সংরক্ষিত ফাইল থেকে যায়।',
    'close.goesHeading': 'অ্যাকাউন্ট বন্ধ হলে যা সরানো বা বদলানো হয়',
    'close.goesProfile': 'আপনার নাম, ছবি, সময় অঞ্চল ও দেশ',
    'close.goesNotes': 'পাঠের নোট ও বুকমার্ক',
    'close.goesSaved': 'সংরক্ষিত কোর্স ও সেগুলোর ওপর লেখা নোট',
    'close.goesReviews':
      'কোর্স নিয়ে আপনার মতামত সরানো হয়। আলোচনার পোস্ট থ্রেড হিসেবে থাকে, তবে আপনার লেখা বদলে দেওয়া হয়।',
    'close.goesAnswers':
      'আপনার নিজের শিক্ষার্থী প্রোফাইলে বর্তমান উত্তরের লেখা মুছে ফেলা হয়। আগের সংশোধনের সংরক্ষিত কপি ও সংযুক্ত ফাইল আলাদা সংরক্ষণ-নিয়মে থেকে যেতে পারে।',
    'close.goesSharing': 'চালু শেয়ারিং লিংক, আমন্ত্রণ ও অভিভাবকের প্রবেশাধিকার',
    'close.goesMessages':
      'আপনার সম্পর্কে প্ল্যাটফর্মের বিজ্ঞপ্তি ও পাঠানো বার্তার রেকর্ড। যে ইমেইল পৌঁছে গেছে তা ফেরত আনা যায় না।',
    'close.goesAppointment':
      'এই অ্যাকাউন্টে শিশু সুরক্ষা বা অর্থ ফেরত অনুমোদনের দায়িত্ব থাকলে এটি বন্ধ করতে আলাদা পর্যালোচনা লাগে। যোগাযোগ: {contact}।',
    'close.goesChildren':
      'যে পরিবারে আর কোনো সক্রিয় সদস্য নেই, সেখানে শিশুর প্রোফাইল বন্ধ হতে পারে। শিশুর আলাদা লগইন থাকলে, বা সুরক্ষার কারণে তার কোর্সওয়ার্ক আটকে রাখা থাকলে, নিজে থেকে অ্যাকাউন্ট বন্ধ করা আলাদা পর্যালোচনা পর্যন্ত স্থগিত থাকে। যোগাযোগ: {contact}। শিশুদের অন্যান্য যোগ্য শিক্ষা-রেকর্ড, কোর্সওয়ার্কসহ, ত্রিশ দিন পর সরানোর জন্য নির্ধারিত হয়। সংরক্ষিত ফাইল মুছতে আলাদা একটি ধাপ লাগে।',
    'close.staysHeading': 'যেসব রেকর্ড থেকে যায়',
    'close.staysMoney': 'অর্ডার, পেমেন্ট ও অর্থ ফেরত: যে খতিয়ানের ওপর অর্থ ফেরত নির্ভর করে',
    'close.staysProgress':
      'আপনার নিজের ভর্তি ও পাঠের অগ্রগতি। শিশুদের যোগ্য রেকর্ড বন্ধ করার ত্রিশ দিন পর সরানোর জন্য নির্ধারিত হয়।',
    'close.staysCertificates': 'সনদ, যে নম্বরে তা দেওয়া হয়েছিল সেই নম্বরেই',
    'close.staysSupport':
      'সহায়তার কেস। আপনার খোলা কেসের লেখা বদলে দেওয়া হয়, আর আপনার লেখা বার্তা সরানো হয়, অন্যদের কেসে লেখা বার্তাসহ। কোনো কেস সুরক্ষার কারণে স্থগিত থাকলে স্থগিতাদেশ না ওঠা পর্যন্ত তার বিষয়বস্তু রাখা হয়, এবং তা থেকে আপনাকে চেনা যেতে পারে। প্ল্যাটফর্ম কর্মীদের উত্তর ও সমাধান-নোটে আপনার প্রদর্শিত নাম বদলানোর চেষ্টা করে, তবে অন্য নাম বা শনাক্তকারী থেকে যেতে পারে। কেস বন্ধ হওয়ার তিন বছর পর তা মুছে ফেলার সময় হয়।',
    'close.staysAudit': 'অ্যাকাউন্টটি বন্ধ করা হয়েছে, এই মর্মে নিরীক্ষা-রেকর্ড',
    'close.staysFingerprint':
      'আপনার সাইন-ইন ঠিকানার একটি ডিজিটাল ছাপ, ঠিকানাটি নয়, যাতে সাইন-ইন মুছে যাওয়ার পরও সহায়তা দল “আমার অ্যাকাউন্ট কি মুছে ফেলা হয়েছে?” প্রশ্নের উত্তর দিতে পারে',
    'close.staysHolder':
      'সনদে ধারকের নামের জায়গায় এটি লেখা হয়: {label}; এর নম্বর ও এতে লিপিবদ্ধ অন্যান্য বিবরণ থেকে যায়। শিক্ষা-রেকর্ড সরানোর পরও শিশুর সনদের নম্বর থাকে।',
    'close.undoHeading': 'এটি ফেরানো যায় না',
    'close.undoSessions':
      'অ্যাপ আপনাকে সাইন আউট করার চেষ্টা করে, তবে অন্য সেশন ও সেবাদাতার কাছে থাকা সাইন-ইন আলাদাভাবে বাতিল বা সরানো না হওয়া পর্যন্ত থেকে যেতে পারে। আপনি যদি শিক্ষক হন এবং আপনার কোনো কোর্স পর্যালোচনায় বা প্রকাশিত থাকে, তবে আগে প্ল্যাটফর্মের মালিককে শিক্ষক অ্যাকাউন্টটি বন্ধ করতে হবে; এটি আপনার ক্ষেত্রে প্রযোজ্য হলে এই পাতা তা জানাবে।',
    'close.undoSignInLead': 'অ্যাকাউন্ট বন্ধ করলে সাইন-ইন মুছে যায় না।',
    'close.undoSignIn':
      'সেটি AyahSpring-এর কাছে নয়, সাইন-ইন সেবাদাতার কাছে থাকে; তাই সেটি এখনো থাকলে অ্যাকাউন্ট বন্ধ করার সময় আলাদা ধাপে সরানোর জন্য তা প্ল্যাটফর্মের মালিকের তালিকায় ওঠে। সরানোর কথা লিপিবদ্ধ করার আগে ডেটাবেস দেখে নেয় যে পরিচয়টি তার প্রমাণীকরণ টেবিলে নেই; এটি সেবাদাতার সব কপি সম্পর্কে প্রমাণ নয়।',
    'close.confirmLabel': 'নিশ্চিত করতে এটি লিখুন: {name}',
    'close.confirmNote':
      'নাম হুবহু মিললে বোতামটি চালু হয়। এটি ফেরানো যায় না, এবং মত বদলানোর কোনো সময়সীমা নেই।',
    'close.nameless':
      'এই অ্যাকাউন্টে লেখার মতো কোনো নাম নেই। আগে অ্যাকাউন্ট সেটিংসে একটি নাম যোগ করুন।',
    'close.button': 'আমার অ্যাকাউন্ট চিরতরে বন্ধ করুন',
    'close.closing': 'বন্ধ করা হচ্ছে…',
    'close.keep': 'আমার অ্যাকাউন্ট রাখুন',
    'close.signedOut': 'আপনি সাইন আউট হয়ে গেছেন। এই অ্যাকাউন্ট বন্ধ করতে আবার সাইন ইন করুন।',
    'close.noAccount': 'এখানে বন্ধ করার মতো কোনো অ্যাকাউন্ট নেই।',
    'close.nameMissing': 'নিশ্চিত করতে আপনার নাম লিখুন।',
    'close.nameMismatch': 'নাম মেলেনি। ওপরে যেমন দেখানো আছে হুবহু তেমন লিখুন।',
    'close.teaching':
      'আপনার একটি কোর্স এখনো পর্যালোচনায় বা প্রকাশিত আছে। আগে প্ল্যাটফর্মের মালিককে শিক্ষক অ্যাকাউন্টটি বন্ধ করতে বলুন। কিছুই বদলানো হয়নি।',
    'close.board':
      'আপনি একটি আলেম বোর্ডের সদস্য। আগে প্ল্যাটফর্মের মালিককে আপনাকে সেখান থেকে সরাতে বলুন। কিছুই বদলানো হয়নি।',
    'close.held':
      'এই অ্যাকাউন্ট শিশুর একটি আলাদা লগইনের সঙ্গে, বা আটকে রাখা কোর্সওয়ার্কের সঙ্গে যুক্ত, তাই এটি বন্ধ করতে আলাদা পর্যালোচনা লাগে। কিছুই বদলানো হয়নি। যোগাযোগ: {contact}।',
    'close.appointment':
      'এই অ্যাকাউন্টে শিশু সুরক্ষা বা অর্থ ফেরত অনুমোদনের দায়িত্ব আছে, তাই এটি বন্ধ করতে আলাদা পর্যালোচনা লাগে। কিছুই বদলানো হয়নি। যোগাযোগ: {contact}।',
    'close.refused':
      'এই অ্যাকাউন্ট বন্ধ করা যায়নি, এবং কিছুই বদলানো হয়নি। এমন বারবার হলে যোগাযোগ: {contact}।',
    'close.unconfirmed':
      'আপনার অ্যাকাউন্ট বন্ধ হয়েছে কি না আমরা নিশ্চিত করতে পারিনি। আবার চেষ্টা করার আগে দেখতে এই পাতা নতুন করে লোড করুন, অথবা যোগাযোগ করুন: {contact}।',
  },
  hi: {
    'close.title': 'यह खाता बंद करें',
    'close.already': 'यह खाता पहले ही बंद है।',
    'close.alreadyNote':
      'प्रोफ़ाइल बदल दी गई है, लेकिन कुछ रिकॉर्ड और फ़ाइलें बची रह सकती हैं। साइन-इन की जानकारी साइन-इन प्रदाता के पास रहती है; अगर वह अब भी मौजूद है तो उसे हटाना एक अलग चरण है। हटाने की सूची में होना इस बात का प्रमाण नहीं कि उसे हटा दिया गया है।',
    'close.lede':
      'आप इस खाते से साइन इन हैं: {who}। यह क्रिया खाता बंद करती है, आपकी प्रोफ़ाइल बदलती है और कुछ निजी जानकारी हटाती है। कुछ रिकॉर्ड और संग्रहीत फ़ाइलें बची रहती हैं, जैसा नीचे बताया गया है।',
    'close.ledeUnnamed':
      'यह क्रिया वह खाता बंद करती है जिससे आप साइन इन हैं, आपकी प्रोफ़ाइल बदलती है और कुछ निजी जानकारी हटाती है। कुछ रिकॉर्ड और संग्रहीत फ़ाइलें बची रहती हैं, जैसा नीचे बताया गया है।',
    'close.goesHeading': 'खाता बंद होने पर जो हटाया या बदला जाता है',
    'close.goesProfile': 'आपका नाम, फ़ोटो, समय क्षेत्र और देश',
    'close.goesNotes': 'पाठ के नोट और बुकमार्क',
    'close.goesSaved': 'सहेजे गए कोर्स और उन पर लिखे नोट',
    'close.goesReviews':
      'कोर्स पर आपकी समीक्षाएँ हटा दी जाती हैं। चर्चा की पोस्ट अपने थ्रेड में रहती हैं, पर आपका लिखा हुआ बदल दिया जाता है।',
    'close.goesAnswers':
      'आपकी अपनी शिक्षार्थी प्रोफ़ाइल पर मौजूदा उत्तर का पाठ मिटा दिया जाता है। पहले के संशोधनों की सहेजी गई प्रतियाँ और संलग्न फ़ाइलें अलग प्रतिधारण नियमों के तहत बची रह सकती हैं।',
    'close.goesSharing': 'चालू साझाकरण लिंक, आमंत्रण और अभिभावक की पहुँच',
    'close.goesMessages':
      'आपसे जुड़ी प्लैटफ़ॉर्म सूचनाएँ और भेजे गए संदेशों के रिकॉर्ड। जो ईमेल पहुँच चुका है उसे वापस नहीं लिया जा सकता।',
    'close.goesAppointment':
      'अगर इस खाते के पास बाल सुरक्षा या रिफ़ंड स्वीकृति की ज़िम्मेदारी है, तो इसे बंद करने के लिए अलग से समीक्षा ज़रूरी है। संपर्क: {contact}।',
    'close.goesChildren':
      'जिस परिवार में कोई और सक्रिय सदस्य नहीं है, उसमें बच्चे की प्रोफ़ाइल बंद की जा सकती है। अगर बच्चे का अलग लॉगिन है, या सुरक्षा के कारण उसका कोर्सवर्क रोका गया है, तो खुद से खाता बंद करना अलग समीक्षा होने तक रोक दिया जाता है। संपर्क: {contact}। बच्चों के अन्य पात्र शिक्षण रिकॉर्ड, कोर्सवर्क सहित, तीस दिन बाद हटाने के लिए निर्धारित किए जाते हैं। संग्रहीत फ़ाइलों को मिटाने के लिए अलग चरण चाहिए।',
    'close.staysHeading': 'जो रिकॉर्ड बचे रहते हैं',
    'close.staysMoney': 'ऑर्डर, भुगतान और रिफ़ंड: वह बही जिस पर कोई रिफ़ंड निर्भर करता है',
    'close.staysProgress':
      'आपके अपने नामांकन और पाठों में प्रगति। बच्चों के पात्र रिकॉर्ड खाता बंद होने के तीस दिन बाद हटाने के लिए निर्धारित किए जाते हैं।',
    'close.staysCertificates': 'प्रमाणपत्र, उसी संख्या के साथ जिस पर वे जारी हुए थे',
    'close.staysSupport':
      'सहायता के मामले। जो मामले आपने खोले उनका पाठ बदल दिया जाता है, और आपके लिखे संदेश हटा दिए जाते हैं, दूसरों के मामलों में लिखे संदेशों सहित। अगर कोई मामला सुरक्षा के कारण रोका गया है तो रोक हटने तक उसकी सामग्री रखी जाती है, और उससे आपकी पहचान हो सकती है। प्लैटफ़ॉर्म कर्मचारियों के उत्तरों और समाधान नोटों में आपका प्रदर्शित नाम बदलने की कोशिश करता है, लेकिन दूसरे नाम या पहचानकर्ता बचे रह सकते हैं। मामला बंद होने के तीन साल बाद उसे मिटाया जाना होता है।',
    'close.staysAudit': 'यह ऑडिट रिकॉर्ड कि खाता बंद किया गया',
    'close.staysFingerprint':
      'आपके साइन-इन पते की डिजिटल छाप, पता नहीं, ताकि साइन-इन हट जाने के बाद भी सहायता टीम इस सवाल का जवाब दे सके: “क्या मेरा खाता मिटा दिया गया?”',
    'close.staysHolder':
      'प्रमाणपत्र पर धारक के नाम की जगह यह लिखा जाता है: {label}; उसकी संख्या और उस पर दर्ज बाकी विवरण बने रहते हैं। शिक्षण रिकॉर्ड हटने के बाद भी बच्चे के प्रमाणपत्र की संख्या बनी रहती है।',
    'close.undoHeading': 'इसे वापस नहीं किया जा सकता',
    'close.undoSessions':
      'ऐप आपको साइन आउट करने की कोशिश करता है, लेकिन दूसरे सत्र और प्रदाता के पास मौजूद साइन-इन तब तक बचे रह सकते हैं जब तक उन्हें अलग से रद्द या हटाया न जाए। अगर आप शिक्षक हैं और आपका कोई कोर्स समीक्षा में है या प्रकाशित है, तो पहले प्लैटफ़ॉर्म के मालिक को शिक्षण खाता बंद करना होगा; अगर यह आप पर लागू होता है तो यह पृष्ठ बता देगा।',
    'close.undoSignInLead': 'खाता बंद करने से साइन-इन नहीं मिटता।',
    'close.undoSignIn':
      'वह AyahSpring के पास नहीं, साइन-इन प्रदाता के पास रहता है; इसलिए अगर वह अब भी मौजूद है, तो खाता बंद होने पर उसे अलग से हटाने के लिए प्लैटफ़ॉर्म के मालिक की सूची में रखा जाता है। हटाने को दर्ज करने से पहले डेटाबेस जाँचता है कि वह पहचान उसकी प्रमाणीकरण तालिका में नहीं है; यह प्रदाता की सभी प्रतियों के बारे में प्रमाण नहीं है।',
    'close.confirmLabel': 'पुष्टि के लिए यह लिखें: {name}',
    'close.confirmNote':
      'नाम ठीक-ठीक मिलने पर बटन उपलब्ध हो जाता है। इसे वापस नहीं किया जा सकता, और मन बदलने की कोई अवधि नहीं है।',
    'close.nameless':
      'इस खाते में लिखने के लिए कोई नाम नहीं है। पहले खाता सेटिंग्स में नाम जोड़ें।',
    'close.button': 'मेरा खाता हमेशा के लिए बंद करें',
    'close.closing': 'बंद किया जा रहा है…',
    'close.keep': 'मेरा खाता रहने दें',
    'close.signedOut': 'आप साइन आउट हो चुके हैं। यह खाता बंद करने के लिए फिर से साइन इन करें।',
    'close.noAccount': 'यहाँ बंद करने के लिए कोई खाता नहीं है।',
    'close.nameMissing': 'पुष्टि के लिए अपना नाम लिखें।',
    'close.nameMismatch': 'नाम नहीं मिला। इसे ठीक वैसे ही लिखें जैसा ऊपर दिखाया गया है।',
    'close.teaching':
      'आपका एक कोर्स अभी समीक्षा में है या प्रकाशित है। पहले प्लैटफ़ॉर्म के मालिक से शिक्षण खाता बंद करने को कहें। कुछ भी नहीं बदला गया।',
    'close.board':
      'आप एक विद्वत् बोर्ड के सदस्य हैं। पहले प्लैटफ़ॉर्म के मालिक से कहें कि आपको उससे हटा दें। कुछ भी नहीं बदला गया।',
    'close.held':
      'यह खाता बच्चे के एक अलग लॉगिन से, या रोके गए कोर्सवर्क से जुड़ा है, इसलिए इसे बंद करने के लिए अलग से समीक्षा ज़रूरी है। कुछ भी नहीं बदला गया। संपर्क: {contact}।',
    'close.appointment':
      'इस खाते के पास बाल सुरक्षा या रिफ़ंड स्वीकृति की ज़िम्मेदारी है, इसलिए इसे बंद करने के लिए अलग से समीक्षा ज़रूरी है। कुछ भी नहीं बदला गया। संपर्क: {contact}।',
    'close.refused':
      'यह खाता बंद नहीं हो सका, और कुछ भी नहीं बदला गया। अगर ऐसा बार-बार हो तो संपर्क: {contact}।',
    'close.unconfirmed':
      'हम पुष्टि नहीं कर सके कि आपका खाता बंद हुआ या नहीं। दोबारा कोशिश करने से पहले देखने के लिए यह पृष्ठ फिर से लोड करें, या संपर्क करें: {contact}।',
  },
  fr: {
    'close.title': 'Fermer ce compte',
    'close.already': 'Ce compte est déjà fermé.',
    'close.alreadyNote':
      'Le profil a été modifié, mais certains enregistrements et fichiers peuvent subsister. L’identifiant de connexion est détenu par le fournisseur de connexion ; s’il existe encore, sa suppression est une étape distincte. Figurer sur la liste des suppressions ne prouve pas qu’il a été supprimé.',
    'close.lede':
      'Vous êtes connecté avec le compte : {who}. Cette action ferme le compte, modifie votre profil et supprime certaines informations personnelles. Certains enregistrements et fichiers stockés subsistent, comme expliqué ci-dessous.',
    'close.ledeUnnamed':
      'Cette action ferme le compte avec lequel vous êtes connecté, modifie votre profil et supprime certaines informations personnelles. Certains enregistrements et fichiers stockés subsistent, comme expliqué ci-dessous.',
    'close.goesHeading': 'Supprimé ou modifié à la fermeture du compte',
    'close.goesProfile': 'Votre nom, votre photo, votre fuseau horaire et votre pays',
    'close.goesNotes': 'Les notes de leçon et les favoris',
    'close.goesSaved': 'Les cours enregistrés et les notes qui les accompagnent',
    'close.goesReviews':
      'Vos avis sur les cours sont supprimés. Les messages de discussion restent sous forme de fils, votre texte étant remplacé.',
    'close.goesAnswers':
      'Le texte actuel des réponses sur votre propre profil d’apprenant est effacé. Les copies des révisions antérieures et les fichiers joints peuvent subsister selon des règles de conservation distinctes.',
    'close.goesSharing': 'Les liens de partage actifs, les invitations et l’accès des tuteurs',
    'close.goesMessages':
      'Les notifications de la plateforme et les traces des messages sortants qui vous concernent. Un e-mail déjà remis ne peut pas être rappelé.',
    'close.goesAppointment':
      'Si ce compte porte une désignation de protection de l’enfance ou d’approbation des remboursements, sa fermeture exige un examen individuel. Contact : {contact}.',
    'close.goesChildren':
      'Le profil d’un enfant dans une famille sans autre membre actif peut être fermé. S’il dispose d’une connexion distincte, ou de travaux retenus au titre de la protection de l’enfance, la fermeture du compte par vous-même est suspendue dans l’attente d’un examen individuel. Contact : {contact}. Les autres données d’apprentissage d’enfants qui remplissent les conditions, travaux compris, sont programmées pour être supprimées après trente jours. Les fichiers stockés exigent une étape de suppression distincte.',
    'close.staysHeading': 'Enregistrements qui subsistent',
    'close.staysMoney':
      'Commandes, paiements et remboursements : le registre dont dépend un remboursement',
    'close.staysProgress':
      'Vos propres inscriptions et votre progression dans les leçons. Les données d’enfants qui remplissent les conditions sont programmées pour être supprimées trente jours après la fermeture.',
    'close.staysCertificates': 'Les certificats, sous le numéro avec lequel ils ont été délivrés',
    'close.staysSupport':
      'Les demandes d’assistance. Le texte des demandes que vous avez ouvertes est remplacé et les messages que vous avez écrits sont supprimés, y compris dans les demandes d’autres personnes. Si une demande est suspendue au titre de la protection de l’enfance, son contenu est conservé jusqu’à la levée de la suspension et peut vous identifier. La plateforme s’efforce de remplacer votre nom affiché dans les réponses du personnel et les notes de résolution, mais d’autres noms ou identifiants peuvent subsister. Une demande doit être supprimée trois ans après sa clôture.',
    'close.staysAudit': 'La trace d’audit indiquant que le compte a été fermé',
    'close.staysFingerprint':
      'Une empreinte numérique de votre adresse de connexion, et non l’adresse elle-même, afin que l’assistance puisse répondre à la question « mon compte a-t-il été effacé ? » une fois l’identifiant de connexion disparu',
    'close.staysHolder':
      'Sur un certificat, le nom du titulaire est remplacé par : {label} ; son numéro et les autres détails qui y sont consignés subsistent. Le certificat d’un enfant conserve lui aussi son numéro après la suppression des données d’apprentissage.',
    'close.undoHeading': 'Cette action est irréversible',
    'close.undoSessions':
      'L’application tente de vous déconnecter, mais d’autres sessions et l’identifiant détenu par le fournisseur peuvent subsister jusqu’à ce qu’ils soient révoqués ou supprimés séparément. Si vous êtes enseignant et qu’un de vos cours est en cours d’examen ou publié, le propriétaire de la plateforme doit d’abord fermer le compte d’enseignant ; cette page vous le dira si c’est votre cas.',
    'close.undoSignInLead': 'La fermeture du compte ne supprime pas l’identifiant de connexion.',
    'close.undoSignIn':
      'Il est détenu par le fournisseur de connexion et non par AyahSpring ; la fermeture du compte l’inscrit donc sur la liste du propriétaire de la plateforme en vue d’une étape de suppression distincte, s’il existe encore. Avant d’enregistrer la suppression, la base de données vérifie que l’identité est absente de sa table d’authentification ; cela ne prouve rien quant à toutes les copies détenues par le fournisseur.',
    'close.confirmLabel': 'Pour confirmer, saisissez : {name}',
    'close.confirmNote':
      'Le bouton devient disponible lorsque le nom correspond exactement. Cette action est irréversible et il n’y a pas de délai de rétractation.',
    'close.nameless':
      'Ce compte n’a pas de nom à saisir. Ajoutez-en un d’abord dans les paramètres du compte.',
    'close.button': 'Fermer mon compte définitivement',
    'close.closing': 'Fermeture…',
    'close.keep': 'Conserver mon compte',
    'close.signedOut': 'Vous êtes déconnecté. Reconnectez-vous pour fermer ce compte.',
    'close.noAccount': 'Il n’y a ici aucun compte à fermer.',
    'close.nameMissing': 'Saisissez votre nom pour confirmer.',
    'close.nameMismatch':
      'Le nom ne correspond pas. Saisissez-le exactement tel qu’il apparaît ci-dessus.',
    'close.teaching':
      'Vous avez encore un cours en cours d’examen ou publié. Demandez d’abord au propriétaire de la plateforme de fermer le compte d’enseignant. Rien n’a été modifié.',
    'close.board':
      'Vous siégez dans un conseil savant. Demandez d’abord au propriétaire de la plateforme de vous en retirer. Rien n’a été modifié.',
    'close.held':
      'Ce compte est lié à la connexion distincte d’un enfant, ou à des travaux retenus ; sa fermeture exige donc un examen individuel. Rien n’a été modifié. Contact : {contact}.',
    'close.appointment':
      'Ce compte porte une désignation de protection de l’enfance ou d’approbation des remboursements ; sa fermeture exige donc un examen individuel. Rien n’a été modifié. Contact : {contact}.',
    'close.refused':
      'Ce compte n’a pas pu être fermé et rien n’a été modifié. Si cela se reproduit, contact : {contact}.',
    'close.unconfirmed':
      'Nous n’avons pas pu confirmer que votre compte a été fermé. Avant de réessayer, rechargez cette page pour le voir, ou écrivez à : {contact}.',
  },
  es: {
    'close.title': 'Cerrar esta cuenta',
    'close.already': 'Esta cuenta ya está cerrada.',
    'close.alreadyNote':
      'El perfil se ha modificado, pero pueden quedar algunos registros y archivos. El inicio de sesión lo guarda el proveedor de inicio de sesión; si todavía existe, eliminarlo es un paso aparte. Estar en la lista de eliminación no prueba que se haya eliminado.',
    'close.lede':
      'Ha iniciado sesión con la cuenta: {who}. Esta acción cierra la cuenta, modifica su perfil y elimina parte de la información personal. Algunos registros y archivos almacenados se conservan, como se explica más abajo.',
    'close.ledeUnnamed':
      'Esta acción cierra la cuenta con la que ha iniciado sesión, modifica su perfil y elimina parte de la información personal. Algunos registros y archivos almacenados se conservan, como se explica más abajo.',
    'close.goesHeading': 'Lo que se elimina o se modifica al cerrar la cuenta',
    'close.goesProfile': 'Su nombre, su foto, su zona horaria y su país',
    'close.goesNotes': 'Las notas de las lecciones y los marcadores',
    'close.goesSaved': 'Los cursos guardados y las notas que tienen',
    'close.goesReviews':
      'Sus reseñas de cursos se eliminan. Los mensajes de debate permanecen como hilos, con lo que usted escribió sustituido.',
    'close.goesAnswers':
      'El texto actual de las respuestas en su propio perfil de alumno se borra. Las copias de revisiones anteriores y los archivos adjuntos pueden conservarse según normas de conservación aparte.',
    'close.goesSharing':
      'Los enlaces para compartir activos, las invitaciones y el acceso de los tutores',
    'close.goesMessages':
      'Las notificaciones de la plataforma y los registros de mensajes salientes sobre usted. El correo ya entregado no puede retirarse.',
    'close.goesAppointment':
      'Si esta cuenta tiene asignada la protección de menores o la aprobación de reembolsos, cerrarla requiere una revisión individual. Contacto: {contact}.',
    'close.goesChildren':
      'El perfil de un menor en una familia sin otro miembro activo puede cerrarse. Si tiene un inicio de sesión propio, o trabajos retenidos por protección de menores, el cierre de la cuenta por su cuenta queda en pausa hasta una revisión individual. Contacto: {contact}. Los demás registros de aprendizaje de menores que cumplan los requisitos, incluidos los trabajos, se programan para eliminarse al cabo de treinta días. Los archivos almacenados requieren un paso de eliminación aparte.',
    'close.staysHeading': 'Registros que se conservan',
    'close.staysMoney': 'Pedidos, pagos y reembolsos: el libro del que depende un reembolso',
    'close.staysProgress':
      'Sus propias inscripciones y su progreso en las lecciones. Los registros de menores que cumplan los requisitos se programan para eliminarse treinta días después del cierre.',
    'close.staysCertificates': 'Los certificados, con el número con el que se emitieron',
    'close.staysSupport':
      'Los casos de asistencia. El texto de los casos que usted abrió se sustituye y los mensajes que escribió se eliminan, incluidos los que estén en casos de otras personas. Si un caso está en pausa por protección de menores, su contenido se conserva hasta que se levante la pausa, y puede identificarle. La plataforma intenta sustituir su nombre visible en las respuestas del personal y en las notas de resolución, pero pueden quedar otros nombres o identificadores. Un caso debe eliminarse tres años después de cerrarse.',
    'close.staysAudit': 'El registro de auditoría de que la cuenta se cerró',
    'close.staysFingerprint':
      'Una huella digital de su dirección de inicio de sesión, no la dirección, para que el equipo de asistencia pueda responder a «¿se borró mi cuenta?» cuando el inicio de sesión ya no exista',
    'close.staysHolder':
      'En un certificado, el nombre del titular se sustituye por: {label}; su número y los demás datos que constan en él se conservan. El certificado de un menor también conserva su número después de eliminarse el registro de aprendizaje.',
    'close.undoHeading': 'Esto no se puede deshacer',
    'close.undoSessions':
      'La aplicación intenta cerrar su sesión, pero otras sesiones y el inicio de sesión del proveedor pueden seguir existiendo hasta que se revoquen o eliminen por separado. Si usted es docente y tiene un curso en revisión o publicado, el propietario de la plataforma debe cerrar primero la cuenta de docente; esta página se lo indicará si es su caso.',
    'close.undoSignInLead': 'Cerrar la cuenta no elimina el inicio de sesión.',
    'close.undoSignIn':
      'Lo guarda el proveedor de inicio de sesión y no AyahSpring, de modo que cerrar la cuenta lo pone en la lista del propietario de la plataforma para un paso de eliminación aparte, si todavía existe. Antes de registrar la eliminación, la base de datos comprueba que la identidad no figura en su tabla de autenticación; eso no prueba nada sobre todas las copias del proveedor.',
    'close.confirmLabel': 'Para confirmar, escriba: {name}',
    'close.confirmNote':
      'El botón se activa cuando el nombre coincide exactamente. Esto no se puede deshacer y no hay plazo de desistimiento.',
    'close.nameless':
      'Esta cuenta no tiene un nombre que escribir. Añada uno primero en los ajustes de la cuenta.',
    'close.button': 'Cerrar mi cuenta para siempre',
    'close.closing': 'Cerrando…',
    'close.keep': 'Conservar mi cuenta',
    'close.signedOut': 'Su sesión está cerrada. Inicie sesión de nuevo para cerrar esta cuenta.',
    'close.noAccount': 'Aquí no hay ninguna cuenta que cerrar.',
    'close.nameMissing': 'Escriba su nombre para confirmar.',
    'close.nameMismatch': 'El nombre no coincide. Escríbalo exactamente como aparece arriba.',
    'close.teaching':
      'Todavía tiene un curso en revisión o publicado. Pida primero al propietario de la plataforma que cierre la cuenta de docente. No se ha cambiado nada.',
    'close.board':
      'Usted forma parte de un consejo de eruditos. Pida primero al propietario de la plataforma que le retire de él. No se ha cambiado nada.',
    'close.held':
      'Esta cuenta está vinculada al inicio de sesión propio de un menor, o a trabajos retenidos, por lo que cerrarla requiere una revisión individual. No se ha cambiado nada. Contacto: {contact}.',
    'close.appointment':
      'Esta cuenta tiene asignada la protección de menores o la aprobación de reembolsos, por lo que cerrarla requiere una revisión individual. No se ha cambiado nada. Contacto: {contact}.',
    'close.refused':
      'Esta cuenta no se ha podido cerrar y no se ha cambiado nada. Si sigue ocurriendo, contacto: {contact}.',
    'close.unconfirmed':
      'No hemos podido confirmar si su cuenta se cerró. Antes de volver a intentarlo, recargue esta página para verlo, o escriba a: {contact}.',
  },
  pt: {
    'close.title': 'Encerrar esta conta',
    'close.already': 'Esta conta já está encerrada.',
    'close.alreadyNote':
      'O perfil foi alterado, mas alguns registos e ficheiros podem permanecer. O início de sessão é guardado pelo fornecedor de início de sessão; se ainda existir, a sua remoção é um passo à parte. Constar da lista de remoção não prova que tenha sido removido.',
    'close.lede':
      'Tem sessão iniciada com a conta: {who}. Esta ação encerra a conta, altera o seu perfil e remove algumas informações pessoais. Alguns registos e ficheiros guardados permanecem, como se explica abaixo.',
    'close.ledeUnnamed':
      'Esta ação encerra a conta com que tem sessão iniciada, altera o seu perfil e remove algumas informações pessoais. Alguns registos e ficheiros guardados permanecem, como se explica abaixo.',
    'close.goesHeading': 'O que é removido ou alterado quando a conta é encerrada',
    'close.goesProfile': 'O seu nome, a sua fotografia, o seu fuso horário e o seu país',
    'close.goesNotes': 'As notas das aulas e os marcadores',
    'close.goesSaved': 'Os cursos guardados e as notas que têm',
    'close.goesReviews':
      'As suas avaliações de cursos são removidas. As publicações de discussão permanecem como tópicos, com o que escreveu substituído.',
    'close.goesAnswers':
      'O texto atual das respostas no seu próprio perfil de aluno é apagado. As cópias de revisões anteriores e os ficheiros anexos podem permanecer ao abrigo de regras de conservação à parte.',
    'close.goesSharing': 'As ligações de partilha ativas, os convites e o acesso de tutores',
    'close.goesMessages':
      'As notificações da plataforma e os registos de mensagens enviadas a seu respeito. O e-mail já entregue não pode ser recolhido.',
    'close.goesAppointment':
      'Se esta conta tiver uma nomeação de proteção de menores ou de aprovação de reembolsos, encerrá-la exige uma análise individual. Contacto: {contact}.',
    'close.goesChildren':
      'O perfil de uma criança numa família sem outro membro ativo pode ser encerrado. Se tiver um início de sessão próprio, ou trabalhos retidos por motivos de proteção de menores, o encerramento da conta por si fica suspenso até uma análise individual. Contacto: {contact}. Os outros registos de aprendizagem de crianças que reúnam as condições, incluindo trabalhos, ficam agendados para remoção ao fim de trinta dias. Os ficheiros guardados exigem um passo de eliminação à parte.',
    'close.staysHeading': 'Registos que permanecem',
    'close.staysMoney':
      'Encomendas, pagamentos e reembolsos: o livro de registo de que um reembolso depende',
    'close.staysProgress':
      'As suas próprias inscrições e o progresso nas aulas. Os registos de crianças que reúnam as condições ficam agendados para remoção trinta dias após o encerramento.',
    'close.staysCertificates': 'Os certificados, com o número com que foram emitidos',
    'close.staysSupport':
      'Os pedidos de apoio. O texto dos pedidos que abriu é substituído e as mensagens que escreveu são removidas, incluindo as que estão em pedidos de outras pessoas. Se um pedido estiver suspenso por motivos de proteção de menores, o seu conteúdo é mantido até a suspensão ser levantada, e pode identificá-lo. A plataforma tenta substituir o seu nome visível nas respostas da equipa e nas notas de resolução, mas podem permanecer outros nomes ou identificadores. Um pedido deve ser eliminado três anos depois de ser fechado.',
    'close.staysAudit': 'O registo de auditoria de que a conta foi encerrada',
    'close.staysFingerprint':
      'Uma impressão digital do seu endereço de início de sessão, e não o endereço, para que o apoio possa responder a «a minha conta foi apagada?» quando o início de sessão já não existir',
    'close.staysHolder':
      'Num certificado, o nome do titular é substituído por: {label}; o número e os restantes dados nele registados permanecem. O certificado de uma criança também mantém o número depois de removido o registo de aprendizagem.',
    'close.undoHeading': 'Isto não pode ser desfeito',
    'close.undoSessions':
      'A aplicação tenta terminar a sua sessão, mas outras sessões e o início de sessão no fornecedor podem permanecer até serem revogados ou removidos em separado. Se for professor e tiver um curso em análise ou publicado, o proprietário da plataforma tem de encerrar primeiro a conta de professor; esta página dir-lho-á se for o seu caso.',
    'close.undoSignInLead': 'Encerrar a conta não elimina o início de sessão.',
    'close.undoSignIn':
      'É guardado pelo fornecedor de início de sessão e não pela AyahSpring, pelo que o encerramento da conta o coloca na lista do proprietário da plataforma para um passo de remoção à parte, se ainda existir. Antes de registar a remoção, a base de dados verifica que a identidade não consta da sua tabela de autenticação; isso não prova nada quanto a todas as cópias do fornecedor.',
    'close.confirmLabel': 'Para confirmar, escreva: {name}',
    'close.confirmNote':
      'O botão fica disponível quando o nome coincide exatamente. Isto não pode ser desfeito e não há período de reflexão.',
    'close.nameless':
      'Esta conta não tem um nome para escrever. Adicione primeiro um nas definições da conta.',
    'close.button': 'Encerrar a minha conta de vez',
    'close.closing': 'A encerrar…',
    'close.keep': 'Manter a minha conta',
    'close.signedOut': 'A sua sessão terminou. Inicie sessão novamente para encerrar esta conta.',
    'close.noAccount': 'Não há aqui nenhuma conta para encerrar.',
    'close.nameMissing': 'Escreva o seu nome para confirmar.',
    'close.nameMismatch': 'O nome não coincide. Escreva-o exatamente como aparece acima.',
    'close.teaching':
      'Ainda tem um curso em análise ou publicado. Peça primeiro ao proprietário da plataforma que encerre a conta de professor. Nada foi alterado.',
    'close.board':
      'Faz parte de um conselho de estudiosos. Peça primeiro ao proprietário da plataforma que o retire dele. Nada foi alterado.',
    'close.held':
      'Esta conta está ligada ao início de sessão próprio de uma criança, ou a trabalhos retidos, pelo que encerrá-la exige uma análise individual. Nada foi alterado. Contacto: {contact}.',
    'close.appointment':
      'Esta conta tem uma nomeação de proteção de menores ou de aprovação de reembolsos, pelo que encerrá-la exige uma análise individual. Nada foi alterado. Contacto: {contact}.',
    'close.refused':
      'Não foi possível encerrar esta conta e nada foi alterado. Se continuar a acontecer, contacto: {contact}.',
    'close.unconfirmed':
      'Não conseguimos confirmar se a sua conta foi encerrada. Antes de tentar de novo, recarregue esta página para ver, ou escreva para: {contact}.',
  },
  sw: {
    'close.title': 'Funga akaunti hii',
    'close.already': 'Akaunti hii tayari imefungwa.',
    'close.alreadyNote':
      'Wasifu umebadilishwa, lakini baadhi ya kumbukumbu na faili zinaweza kubaki. Taarifa za kuingia zinashikiliwa na mtoa huduma wa kuingia; ikiwa bado zipo, kuziondoa ni hatua tofauti. Kuwa kwenye orodha ya kuondolewa si uthibitisho kwamba zimeondolewa.',
    'close.lede':
      'Umeingia kwa akaunti: {who}. Hatua hii inafunga akaunti, inabadilisha wasifu wako na kuondoa baadhi ya taarifa binafsi. Baadhi ya kumbukumbu na faili zilizohifadhiwa hubaki, kama inavyoelezwa hapa chini.',
    'close.ledeUnnamed':
      'Hatua hii inafunga akaunti uliyoingia nayo, inabadilisha wasifu wako na kuondoa baadhi ya taarifa binafsi. Baadhi ya kumbukumbu na faili zilizohifadhiwa hubaki, kama inavyoelezwa hapa chini.',
    'close.goesHeading': 'Vinavyoondolewa au kubadilishwa akaunti inapofungwa',
    'close.goesProfile': 'Jina lako, picha, saa za eneo na nchi yako',
    'close.goesNotes': 'Madokezo ya vipindi na alamisho',
    'close.goesSaved': 'Kozi zilizohifadhiwa na madokezo yaliyo juu yake',
    'close.goesReviews':
      'Maoni yako kuhusu kozi huondolewa. Machapisho ya majadiliano hubaki kama mfululizo, huku ulichoandika kikibadilishwa.',
    'close.goesAnswers':
      'Maandishi ya sasa ya majibu kwenye wasifu wako mwenyewe wa mwanafunzi hufutwa. Nakala za marekebisho ya awali na faili zilizoambatishwa zinaweza kubaki chini ya kanuni tofauti za uhifadhi.',
    'close.goesSharing': 'Viungo vya kushiriki vilivyo hai, mialiko na ruhusa za walezi',
    'close.goesMessages':
      'Arifa za jukwaa na kumbukumbu za ujumbe uliotumwa kukuhusu. Barua pepe iliyokwisha kufika haiwezi kurudishwa.',
    'close.goesAppointment':
      'Ikiwa akaunti hii ina uteuzi wa ulinzi wa watoto au wa kuidhinisha urejeshaji wa pesa, kuifunga kunahitaji mapitio ya kipekee. Wasiliana kupitia: {contact}.',
    'close.goesChildren':
      'Wasifu wa mtoto katika familia isiyo na mwanachama mwingine hai unaweza kufungwa. Ikiwa mtoto ana njia yake tofauti ya kuingia, au kazi zake za kozi zimezuiliwa kwa sababu za ulinzi, kufunga akaunti mwenyewe husitishwa hadi mapitio ya kipekee yafanyike. Wasiliana kupitia: {contact}. Kumbukumbu nyingine za masomo ya watoto zinazostahiki, pamoja na kazi za kozi, hupangwa kuondolewa baada ya siku thelathini. Faili zilizohifadhiwa zinahitaji hatua tofauti ya kufutwa.',
    'close.staysHeading': 'Kumbukumbu zinazobaki',
    'close.staysMoney':
      'Maagizo, malipo na urejeshaji wa pesa: daftari ambalo urejeshaji wa pesa hutegemea',
    'close.staysProgress':
      'Usajili wako mwenyewe na maendeleo ya vipindi. Kumbukumbu za watoto zinazostahiki hupangwa kuondolewa siku thelathini baada ya akaunti kufungwa.',
    'close.staysCertificates': 'Vyeti, kwa nambari vilivyotolewa nayo',
    'close.staysSupport':
      'Kesi za usaidizi. Maandishi ya kesi ulizofungua hubadilishwa, na ujumbe ulioandika huondolewa, pamoja na ujumbe ulio katika kesi za watu wengine. Ikiwa kesi imesitishwa kwa sababu za ulinzi, maudhui yake huhifadhiwa hadi usitishaji uondolewe, na yanaweza kukutambulisha. Jukwaa hujaribu kubadilisha jina lako linaloonekana katika majibu ya wafanyakazi na madokezo ya utatuzi, lakini majina au vitambulisho vingine vinaweza kubaki. Kesi inapaswa kufutwa miaka mitatu baada ya kufungwa.',
    'close.staysAudit': 'Kumbukumbu ya ukaguzi kwamba akaunti ilifungwa',
    'close.staysFingerprint':
      'Alama ya kidijitali ya anwani yako ya kuingia, si anwani yenyewe, ili usaidizi uweze kujibu “je, akaunti yangu ilifutwa?” baada ya taarifa za kuingia kuondoka',
    'close.staysHolder':
      'Kwenye cheti, jina la mwenye cheti hubadilishwa na: {label}; nambari yake na maelezo mengine yaliyorekodiwa humo hubaki. Cheti cha mtoto pia huendelea kuwa na nambari yake baada ya kumbukumbu za masomo kuondolewa.',
    'close.undoHeading': 'Hili haliwezi kutenduliwa',
    'close.undoSessions':
      'Programu hujaribu kukutoa, lakini vipindi vingine vya kuingia na taarifa za kuingia kwa mtoa huduma zinaweza kubaki hadi zibatilishwe au ziondolewe kando. Ikiwa wewe ni mwalimu mwenye kozi inayopitiwa au iliyochapishwa, mmiliki wa jukwaa lazima afunge akaunti ya ualimu kwanza; ukurasa huu utasema hivyo ikiwa hilo linakuhusu.',
    'close.undoSignInLead': 'Kufunga akaunti hakufuti taarifa za kuingia.',
    'close.undoSignIn':
      'Zinashikiliwa na mtoa huduma wa kuingia, si AyahSpring, kwa hiyo kufunga akaunti huziweka kwenye orodha ya mmiliki wa jukwaa kwa hatua tofauti ya kuondolewa ikiwa bado zipo. Kabla ya kurekodi kuondolewa, hifadhidata hukagua kwamba utambulisho haupo kwenye jedwali lake la uthibitishaji; huo si uthibitisho kuhusu nakala zote za mtoa huduma.',
    'close.confirmLabel': 'Ili kuthibitisha, andika: {name}',
    'close.confirmNote':
      'Kitufe hupatikana jina linapolingana kabisa. Hili haliwezi kutenduliwa, na hakuna muda wa kubadili nia.',
    'close.nameless':
      'Akaunti hii haina jina la kuandika. Ongeza jina kwanza kwenye mipangilio ya akaunti.',
    'close.button': 'Funga akaunti yangu kabisa',
    'close.closing': 'Inafunga…',
    'close.keep': 'Bakiza akaunti yangu',
    'close.signedOut': 'Umetoka kwenye akaunti. Ingia tena ili kufunga akaunti hii.',
    'close.noAccount': 'Hakuna akaunti ya kufunga hapa.',
    'close.nameMissing': 'Andika jina lako ili kuthibitisha.',
    'close.nameMismatch': 'Jina halilingani. Liandike sawasawa na linavyoonekana hapo juu.',
    'close.teaching':
      'Bado una kozi inayopitiwa au iliyochapishwa. Mwombe mmiliki wa jukwaa afunge akaunti ya ualimu kwanza. Hakuna kilichobadilishwa.',
    'close.board':
      'Wewe ni mjumbe wa bodi ya wanazuoni. Mwombe mmiliki wa jukwaa akuondoe humo kwanza. Hakuna kilichobadilishwa.',
    'close.held':
      'Akaunti hii imeunganishwa na njia tofauti ya kuingia ya mtoto, au na kazi za kozi zilizozuiliwa, kwa hiyo kuifunga kunahitaji mapitio ya kipekee. Hakuna kilichobadilishwa. Wasiliana kupitia: {contact}.',
    'close.appointment':
      'Akaunti hii ina uteuzi wa ulinzi wa watoto au wa kuidhinisha urejeshaji wa pesa, kwa hiyo kuifunga kunahitaji mapitio ya kipekee. Hakuna kilichobadilishwa. Wasiliana kupitia: {contact}.',
    'close.refused':
      'Akaunti hii haikuweza kufungwa, na hakuna kilichobadilishwa. Hili likiendelea, wasiliana kupitia: {contact}.',
    'close.unconfirmed':
      'Hatukuweza kuthibitisha kama akaunti yako ilifungwa. Kabla ya kujaribu tena, pakia upya ukurasa huu ili uone, au wasiliana kupitia: {contact}.',
  },
  af: {
    'close.title': 'Sluit hierdie rekening',
    'close.already': 'Hierdie rekening is reeds gesluit.',
    'close.alreadyNote':
      'Die profiel is verander, maar sommige rekords en lêers kan oorbly. Die aanmelding word deur die aanmeldverskaffer gehou; as dit nog bestaan, is die verwydering daarvan ’n aparte stap. Om op die lys vir verwydering te wees, is nie bewys dat dit verwyder is nie.',
    'close.lede':
      'Jy is aangemeld met die rekening: {who}. Hierdie stap sluit die rekening, verander jou profiel en verwyder sommige persoonlike inligting. Sommige rekords en gestoorde lêers bly oor, soos hieronder verduidelik.',
    'close.ledeUnnamed':
      'Hierdie stap sluit die rekening waarmee jy aangemeld is, verander jou profiel en verwyder sommige persoonlike inligting. Sommige rekords en gestoorde lêers bly oor, soos hieronder verduidelik.',
    'close.goesHeading': 'Wat verwyder of verander word wanneer die rekening sluit',
    'close.goesProfile': 'Jou naam, foto, tydsone en land',
    'close.goesNotes': 'Lesnotas en boekmerke',
    'close.goesSaved': 'Gestoorde kursusse en die notas daarby',
    'close.goesReviews':
      'Jou kursusresensies word verwyder. Besprekingsplasings bly as drade, met wat jy geskryf het vervang.',
    'close.goesAnswers':
      'Die huidige antwoordteks op jou eie leerderprofiel word skoongemaak. Kopieë van vroeëre hersienings en aangehegte lêers kan onder aparte bewaringsreëls oorbly.',
    'close.goesSharing': 'Aktiewe deelskakels, uitnodigings en voogtoegang',
    'close.goesMessages':
      'Platformkennisgewings en rekords van uitgaande boodskappe oor jou. E-pos wat reeds afgelewer is, kan nie teruggeroep word nie.',
    'close.goesAppointment':
      'As hierdie rekening ’n aanstelling vir kinderbeskerming of vir die goedkeuring van terugbetalings het, vereis die sluiting daarvan individuele hersiening. Kontak: {contact}.',
    'close.goesChildren':
      '’n Kinderprofiel in ’n gesin sonder ’n ander aktiewe lid kan gesluit word. As die kind ’n aparte aanmelding het, of kursuswerk wat weens kinderbeskerming teruggehou word, word die sluiting van die rekening deur jouself onderbreek vir individuele hersiening. Kontak: {contact}. Ander leerrekords van kinders wat in aanmerking kom, kursuswerk ingesluit, word geskeduleer om ná dertig dae verwyder te word. Gestoorde lêers vereis ’n aparte skrapstap.',
    'close.staysHeading': 'Rekords wat oorbly',
    'close.staysMoney':
      'Bestellings, betalings en terugbetalings: die grootboek waarvan ’n terugbetaling afhang',
    'close.staysProgress':
      'Jou eie inskrywings en lesvordering. Kinderrekords wat in aanmerking kom, word geskeduleer om dertig dae ná sluiting verwyder te word.',
    'close.staysCertificates': 'Sertifikate, onder die nommer waarmee hulle uitgereik is',
    'close.staysSupport':
      'Ondersteuningsake. Die teks van sake wat jy geopen het, word vervang, en boodskappe wat jy geskryf het, word verwyder, ook dié in ander mense se sake. As ’n saak weens kinderbeskerming onderbreek is, word die inhoud gehou totdat die onderbreking opgehef word, en dit kan jou identifiseer. Die platform probeer jou vertoonnaam in personeelantwoorde en oplossingsnotas vervang, maar ander name of identifiseerders kan oorbly. ’n Saak moet drie jaar nadat dit gesluit is, geskrap word.',
    'close.staysAudit': 'Die ouditrekord dat die rekening gesluit is',
    'close.staysFingerprint':
      '’n Digitale vingerafdruk van jou aanmeldadres, nie die adres self nie, sodat ondersteuning “is my rekening uitgevee?” kan beantwoord wanneer die aanmelding weg is',
    'close.staysHolder':
      'Op ’n sertifikaat word die houer se naam vervang met: {label}; die nommer en die ander besonderhede wat daarop aangeteken is, bly oor. ’n Kind se sertifikaat behou ook sy nommer nadat die leerrekord verwyder is.',
    'close.undoHeading': 'Dit kan nie ongedaan gemaak word nie',
    'close.undoSessions':
      'Die toepassing probeer jou afmeld, maar ander sessies en die aanmelding by die verskaffer kan oorbly totdat hulle afsonderlik herroep of verwyder word. As jy ’n onderwyser is met ’n kursus wat hersien word of gepubliseer is, moet die platformeienaar eers die onderwysrekening sluit; hierdie bladsy sal dit sê as dit op jou van toepassing is.',
    'close.undoSignInLead': 'Om die rekening te sluit, skrap nie die aanmelding nie.',
    'close.undoSignIn':
      'Dit word deur die aanmeldverskaffer gehou en nie deur AyahSpring nie, dus plaas die sluiting van die rekening dit op die platformeienaar se lys vir ’n aparte verwyderingstap as dit nog bestaan. Voordat verwydering aangeteken word, gaan die databasis na dat die identiteit nie in sy verifikasietabel is nie; dit is nie bewys oor alle kopieë by die verskaffer nie.',
    'close.confirmLabel': 'Om te bevestig, tik: {name}',
    'close.confirmNote':
      'Die knoppie word beskikbaar wanneer die naam presies ooreenstem. Dit kan nie ongedaan gemaak word nie, en daar is geen afkoeltydperk nie.',
    'close.nameless':
      'Hierdie rekening het geen naam om te tik nie. Voeg eers een by in die rekeningsinstellings.',
    'close.button': 'Sluit my rekening vir goed',
    'close.closing': 'Sluit tans…',
    'close.keep': 'Behou my rekening',
    'close.signedOut': 'Jy is afgemeld. Meld weer aan om hierdie rekening te sluit.',
    'close.noAccount': 'Hier is geen rekening om te sluit nie.',
    'close.nameMissing': 'Tik jou naam om te bevestig.',
    'close.nameMismatch': 'Die naam stem nie ooreen nie. Tik dit presies soos dit hierbo verskyn.',
    'close.teaching':
      'Jy het nog ’n kursus wat hersien word of gepubliseer is. Vra eers die platformeienaar om die onderwysrekening te sluit. Niks is verander nie.',
    'close.board':
      'Jy dien op ’n raad van geleerdes. Vra eers die platformeienaar om jou daarvan te verwyder. Niks is verander nie.',
    'close.held':
      'Hierdie rekening is gekoppel aan ’n kind se aparte aanmelding, of aan kursuswerk wat teruggehou word, dus vereis die sluiting daarvan individuele hersiening. Niks is verander nie. Kontak: {contact}.',
    'close.appointment':
      'Hierdie rekening het ’n aanstelling vir kinderbeskerming of vir die goedkeuring van terugbetalings, dus vereis die sluiting daarvan individuele hersiening. Niks is verander nie. Kontak: {contact}.',
    'close.refused':
      'Hierdie rekening kon nie gesluit word nie, en niks is verander nie. As dit aanhou gebeur, kontak: {contact}.',
    'close.unconfirmed':
      'Ons kon nie bevestig of jou rekening gesluit is nie. Voordat jy weer probeer, herlaai hierdie bladsy om te sien, of kontak: {contact}.',
  },
  'zh-hans': {
    'close.title': '关闭此账户',
    'close.already': '此账户已经关闭。',
    'close.alreadyNote':
      '个人资料已更改，但部分记录和文件可能仍然保留。登录凭据由登录服务提供方保管；如果它仍然存在，移除它是另一个单独的步骤。已列入待移除清单，并不证明它已被移除。',
    'close.lede': '你当前登录的账户是：{who}。此操作会关闭账户、更改你的个人资料并移除部分个人信息。部分记录和已存储的文件会保留，详见下文。',
    'close.ledeUnnamed': '此操作会关闭你当前登录的账户、更改你的个人资料并移除部分个人信息。部分记录和已存储的文件会保留，详见下文。',
    'close.goesHeading': '账户关闭时会移除或更改的内容',
    'close.goesProfile': '你的姓名、照片、时区和国家',
    'close.goesNotes': '课程笔记和书签',
    'close.goesSaved': '已收藏的课程以及写在上面的备注',
    'close.goesReviews': '你对课程的评价会被移除。讨论帖仍以话题的形式保留，但你写的内容会被替换。',
    'close.goesAnswers': '你本人学习者资料中当前的答案文字会被清除。先前修订的存档副本和附加的文件可能依照另外的保留规则继续保留。',
    'close.goesSharing': '仍然有效的分享链接、邀请和监护人权限',
    'close.goesMessages': '与你有关的平台通知和外发消息记录。已经送达的电子邮件无法撤回。',
    'close.goesAppointment': '如果此账户担任儿童保护或退款审批的指定职责，关闭它需要单独审核。联系方式：{contact}。',
    'close.goesChildren':
      '如果家庭中没有其他有效成员，其中的儿童资料可能被关闭。如果该儿童有独立的登录，或有因儿童保护而被保留的作业，自行关闭账户会暂停，等待单独审核。联系方式：{contact}。其他符合条件的儿童学习记录（包括作业）会安排在三十天后移除。已存储的文件需要另外的删除步骤。',
    'close.staysHeading': '会保留的记录',
    'close.staysMoney': '订单、付款和退款：退款所依据的账簿',
    'close.staysProgress': '你本人的报名记录和课程进度。符合条件的儿童记录会安排在账户关闭三十天后移除。',
    'close.staysCertificates': '证书，沿用签发时的编号',
    'close.staysSupport':
      '支持个案。你发起的个案的文字会被替换，你写的消息会被移除，包括你在他人个案中的消息。如果某个个案因儿童保护而被暂停，其内容会保留到暂停解除为止，而这些内容可能识别出你。平台会尽量替换工作人员回复和处理备注中你的显示名称，但其他姓名或标识可能仍然保留。个案在结案三年后到期删除。',
    'close.staysAudit': '记载账户已关闭的审计记录',
    'close.staysFingerprint': '你登录地址的数字指纹，而不是地址本身，以便在登录凭据消失后，支持人员仍能回答“我的账户被清除了吗？”',
    'close.staysHolder': '证书上的持有人姓名会被替换为：{label}；证书编号和上面记载的其他信息会保留。儿童的证书在学习记录被移除后也会保留其编号。',
    'close.undoHeading': '此操作无法撤销',
    'close.undoSessions':
      '应用会尝试让你退出登录，但其他会话以及提供方那里的登录凭据可能仍然保留，直到另行撤销或移除。如果你是教师，并且有课程正在审核或已经发布，平台所有者必须先关闭教学账户；如果这适用于你，本页面会说明。',
    'close.undoSignInLead': '关闭账户不会删除登录凭据。',
    'close.undoSignIn':
      '登录凭据由登录服务提供方保管，而不是由 AyahSpring 保管，因此如果它仍然存在，关闭账户会把它列入平台所有者的清单，等待另一个单独的移除步骤。在记录移除之前，数据库会检查该身份已不在其身份验证表中；这并不能证明提供方的所有副本都已移除。',
    'close.confirmLabel': '请输入以下内容以确认：{name}',
    'close.confirmNote': '名称完全一致时按钮才可使用。此操作无法撤销，也没有冷静期。',
    'close.nameless': '此账户没有可供输入的名称。请先在账户设置中添加名称。',
    'close.button': '永久关闭我的账户',
    'close.closing': '正在关闭…',
    'close.keep': '保留我的账户',
    'close.signedOut': '你已退出登录。请重新登录后再关闭此账户。',
    'close.noAccount': '这里没有可关闭的账户。',
    'close.nameMissing': '请输入你的名称以确认。',
    'close.nameMismatch': '名称不一致。请完全按照上面显示的内容输入。',
    'close.teaching': '你仍有课程正在审核或已经发布。请先请平台所有者关闭教学账户。没有任何更改。',
    'close.board': '你是学术委员会的成员。请先请平台所有者将你从中移除。没有任何更改。',
    'close.held': '此账户关联了儿童的独立登录，或关联了被保留的作业，因此关闭它需要单独审核。没有任何更改。联系方式：{contact}。',
    'close.appointment': '此账户担任儿童保护或退款审批的指定职责，因此关闭它需要单独审核。没有任何更改。联系方式：{contact}。',
    'close.refused': '无法关闭此账户，没有任何更改。如果一再发生，联系方式：{contact}。',
    'close.unconfirmed': '我们无法确认你的账户是否已关闭。再次尝试之前，请重新加载本页面查看，或联系：{contact}。',
  },
  'zh-hant': {
    'close.title': '關閉此帳號',
    'close.already': '此帳號已經關閉。',
    'close.alreadyNote':
      '個人資料已變更，但部分紀錄和檔案可能仍然保留。登入憑證由登入服務提供者保管；如果它仍然存在，移除它是另一個獨立的步驟。已列入待移除清單，並不證明它已被移除。',
    'close.lede': '你目前登入的帳號是：{who}。此操作會關閉帳號、變更你的個人資料並移除部分個人資訊。部分紀錄和已儲存的檔案會保留，詳見下文。',
    'close.ledeUnnamed': '此操作會關閉你目前登入的帳號、變更你的個人資料並移除部分個人資訊。部分紀錄和已儲存的檔案會保留，詳見下文。',
    'close.goesHeading': '帳號關閉時會移除或變更的內容',
    'close.goesProfile': '你的姓名、照片、時區和國家',
    'close.goesNotes': '課程筆記和書籤',
    'close.goesSaved': '已收藏的課程以及寫在上面的備註',
    'close.goesReviews': '你對課程的評價會被移除。討論貼文仍以討論串的形式保留，但你寫的內容會被取代。',
    'close.goesAnswers': '你本人學習者資料中目前的答案文字會被清除。先前修訂的存檔副本和附加的檔案可能依照另外的保存規則繼續保留。',
    'close.goesSharing': '仍然有效的分享連結、邀請和監護人權限',
    'close.goesMessages': '與你有關的平台通知和外寄訊息紀錄。已經送達的電子郵件無法收回。',
    'close.goesAppointment': '如果此帳號擔任兒童保護或退款核准的指定職責，關閉它需要個別審查。聯絡方式：{contact}。',
    'close.goesChildren':
      '如果家庭中沒有其他有效成員，其中的兒童資料可能被關閉。如果該兒童有獨立的登入，或有因兒童保護而被保留的作業，自行關閉帳號會暫停，等待個別審查。聯絡方式：{contact}。其他符合條件的兒童學習紀錄（包括作業）會安排在三十天後移除。已儲存的檔案需要另外的刪除步驟。',
    'close.staysHeading': '會保留的紀錄',
    'close.staysMoney': '訂單、付款和退款：退款所依據的帳簿',
    'close.staysProgress': '你本人的報名紀錄和課程進度。符合條件的兒童紀錄會安排在帳號關閉三十天後移除。',
    'close.staysCertificates': '證書，沿用核發時的編號',
    'close.staysSupport':
      '支援個案。你提出的個案的文字會被取代，你寫的訊息會被移除，包括你在他人個案中的訊息。如果某個個案因兒童保護而被暫停，其內容會保留到暫停解除為止，而這些內容可能識別出你。平台會盡量取代工作人員回覆和處理備註中你的顯示名稱，但其他姓名或識別資訊可能仍然保留。個案在結案三年後到期刪除。',
    'close.staysAudit': '記載帳號已關閉的稽核紀錄',
    'close.staysFingerprint': '你登入位址的數位指紋，而不是位址本身，以便在登入憑證消失後，支援人員仍能回答「我的帳號被清除了嗎？」',
    'close.staysHolder': '證書上的持有人姓名會被取代為：{label}；證書編號和上面記載的其他資訊會保留。兒童的證書在學習紀錄被移除後也會保留其編號。',
    'close.undoHeading': '此操作無法復原',
    'close.undoSessions':
      '應用程式會嘗試讓你登出，但其他工作階段以及提供者那裡的登入憑證可能仍然保留，直到另行撤銷或移除。如果你是教師，並且有課程正在審查或已經發布，平台擁有者必須先關閉教學帳號；如果這適用於你，本頁面會說明。',
    'close.undoSignInLead': '關閉帳號不會刪除登入憑證。',
    'close.undoSignIn':
      '登入憑證由登入服務提供者保管，而不是由 AyahSpring 保管，因此如果它仍然存在，關閉帳號會把它列入平台擁有者的清單，等待另一個獨立的移除步驟。在記錄移除之前，資料庫會檢查該身分已不在其身分驗證表中；這並不能證明提供者的所有副本都已移除。',
    'close.confirmLabel': '請輸入以下內容以確認：{name}',
    'close.confirmNote': '名稱完全一致時按鈕才可使用。此操作無法復原，也沒有猶豫期。',
    'close.nameless': '此帳號沒有可供輸入的名稱。請先在帳號設定中新增名稱。',
    'close.button': '永久關閉我的帳號',
    'close.closing': '正在關閉…',
    'close.keep': '保留我的帳號',
    'close.signedOut': '你已登出。請重新登入後再關閉此帳號。',
    'close.noAccount': '這裡沒有可關閉的帳號。',
    'close.nameMissing': '請輸入你的名稱以確認。',
    'close.nameMismatch': '名稱不一致。請完全按照上面顯示的內容輸入。',
    'close.teaching': '你仍有課程正在審查或已經發布。請先請平台擁有者關閉教學帳號。沒有任何變更。',
    'close.board': '你是學術委員會的成員。請先請平台擁有者將你從中移除。沒有任何變更。',
    'close.held': '此帳號連結了兒童的獨立登入，或連結了被保留的作業，因此關閉它需要個別審查。沒有任何變更。聯絡方式：{contact}。',
    'close.appointment': '此帳號擔任兒童保護或退款核准的指定職責，因此關閉它需要個別審查。沒有任何變更。聯絡方式：{contact}。',
    'close.refused': '無法關閉此帳號，沒有任何變更。如果一再發生，聯絡方式：{contact}。',
    'close.unconfirmed': '我們無法確認你的帳號是否已關閉。再次嘗試之前，請重新載入本頁面查看，或聯絡：{contact}。',
  },
  vi: {
    'close.title': 'Đóng tài khoản này',
    'close.already': 'Tài khoản này đã được đóng.',
    'close.alreadyNote':
      'Hồ sơ đã được thay đổi, nhưng một số bản ghi và tệp có thể vẫn còn. Thông tin đăng nhập do nhà cung cấp dịch vụ đăng nhập lưu giữ; nếu vẫn còn thì việc gỡ bỏ nó là một bước riêng. Việc nằm trong danh sách chờ gỡ bỏ không chứng minh rằng nó đã được gỡ bỏ.',
    'close.lede':
      'Bạn đang đăng nhập bằng tài khoản: {who}. Thao tác này đóng tài khoản, thay đổi hồ sơ của bạn và gỡ bỏ một số thông tin cá nhân. Một số bản ghi và tệp đã lưu vẫn còn, như giải thích bên dưới.',
    'close.ledeUnnamed':
      'Thao tác này đóng tài khoản bạn đang đăng nhập, thay đổi hồ sơ của bạn và gỡ bỏ một số thông tin cá nhân. Một số bản ghi và tệp đã lưu vẫn còn, như giải thích bên dưới.',
    'close.goesHeading': 'Những gì bị gỡ bỏ hoặc thay đổi khi tài khoản đóng',
    'close.goesProfile': 'Tên, ảnh, múi giờ và quốc gia của bạn',
    'close.goesNotes': 'Ghi chú bài học và dấu trang',
    'close.goesSaved': 'Các khóa học đã lưu và ghi chú kèm theo',
    'close.goesReviews':
      'Các đánh giá khóa học của bạn bị gỡ bỏ. Bài đăng thảo luận vẫn còn dưới dạng chuỗi, với nội dung bạn viết được thay thế.',
    'close.goesAnswers':
      'Nội dung câu trả lời hiện tại trong hồ sơ học viên của chính bạn bị xóa trắng. Bản lưu của các lần chỉnh sửa trước và các tệp đính kèm có thể vẫn còn theo quy định lưu giữ riêng.',
    'close.goesSharing':
      'Liên kết chia sẻ đang hoạt động, lời mời và quyền truy cập của người giám hộ',
    'close.goesMessages':
      'Thông báo của nền tảng và bản ghi tin nhắn gửi đi liên quan đến bạn. Email đã được gửi đến thì không thể thu hồi.',
    'close.goesAppointment':
      'Nếu tài khoản này giữ vai trò được chỉ định về bảo vệ trẻ em hoặc phê duyệt hoàn tiền, việc đóng tài khoản cần được xem xét riêng. Liên hệ: {contact}.',
    'close.goesChildren':
      'Hồ sơ trẻ em trong một gia đình không còn thành viên nào khác đang hoạt động có thể bị đóng. Nếu trẻ có thông tin đăng nhập riêng, hoặc có bài làm đang được giữ lại vì lý do bảo vệ trẻ em, việc tự đóng tài khoản sẽ tạm dừng để xem xét riêng. Liên hệ: {contact}. Các bản ghi học tập khác của trẻ đủ điều kiện, kể cả bài làm, được lên lịch gỡ bỏ sau ba mươi ngày. Các tệp đã lưu cần một bước xóa riêng.',
    'close.staysHeading': 'Những bản ghi vẫn còn',
    'close.staysMoney': 'Đơn hàng, thanh toán và hoàn tiền: sổ cái mà việc hoàn tiền dựa vào',
    'close.staysProgress':
      'Các lượt ghi danh và tiến độ bài học của chính bạn. Bản ghi của trẻ đủ điều kiện được lên lịch gỡ bỏ ba mươi ngày sau khi đóng tài khoản.',
    'close.staysCertificates': 'Chứng chỉ, theo số đã được cấp',
    'close.staysSupport':
      'Các yêu cầu hỗ trợ. Nội dung của các yêu cầu do bạn mở được thay thế, và tin nhắn bạn viết bị gỡ bỏ, kể cả tin nhắn trong yêu cầu của người khác. Nếu một yêu cầu đang bị tạm dừng vì lý do bảo vệ trẻ em, nội dung của nó được giữ cho đến khi lệnh tạm dừng được dỡ bỏ, và nội dung đó có thể nhận ra bạn. Nền tảng cố gắng thay thế tên hiển thị của bạn trong câu trả lời của nhân viên và ghi chú giải quyết, nhưng các tên hoặc mã định danh khác có thể vẫn còn. Một yêu cầu đến hạn xóa ba năm sau khi được đóng.',
    'close.staysAudit': 'Bản ghi kiểm toán cho biết tài khoản đã được đóng',
    'close.staysFingerprint':
      'Một dấu vân tay số của địa chỉ đăng nhập của bạn, không phải chính địa chỉ đó, để bộ phận hỗ trợ có thể trả lời câu hỏi “tài khoản của tôi đã bị xóa chưa?” khi thông tin đăng nhập không còn nữa',
    'close.staysHolder':
      'Trên chứng chỉ, tên người được cấp được thay bằng: {label}; số chứng chỉ và các chi tiết khác ghi trên đó vẫn còn. Chứng chỉ của trẻ cũng giữ nguyên số sau khi bản ghi học tập bị gỡ bỏ.',
    'close.undoHeading': 'Việc này không thể hoàn tác',
    'close.undoSessions':
      'Ứng dụng cố gắng đăng xuất bạn, nhưng các phiên khác và thông tin đăng nhập ở nhà cung cấp có thể vẫn còn cho đến khi được thu hồi hoặc gỡ bỏ riêng. Nếu bạn là giáo viên có khóa học đang được duyệt hoặc đã xuất bản, chủ nền tảng phải đóng tài khoản giảng dạy trước; trang này sẽ cho biết nếu điều đó áp dụng với bạn.',
    'close.undoSignInLead': 'Đóng tài khoản không xóa thông tin đăng nhập.',
    'close.undoSignIn':
      'Thông tin đó do nhà cung cấp dịch vụ đăng nhập lưu giữ chứ không phải AyahSpring, vì vậy nếu nó vẫn còn thì việc đóng tài khoản sẽ đưa nó vào danh sách của chủ nền tảng để gỡ bỏ ở một bước riêng. Trước khi ghi nhận việc gỡ bỏ, cơ sở dữ liệu kiểm tra rằng danh tính đó không còn trong bảng xác thực của mình; điều đó không chứng minh gì về mọi bản sao ở nhà cung cấp.',
    'close.confirmLabel': 'Để xác nhận, hãy nhập: {name}',
    'close.confirmNote':
      'Nút sẽ dùng được khi tên khớp chính xác. Việc này không thể hoàn tác và không có thời gian cân nhắc lại.',
    'close.nameless':
      'Tài khoản này không có tên để nhập. Hãy thêm tên trong phần cài đặt tài khoản trước.',
    'close.button': 'Đóng vĩnh viễn tài khoản của tôi',
    'close.closing': 'Đang đóng…',
    'close.keep': 'Giữ tài khoản của tôi',
    'close.signedOut': 'Bạn đã đăng xuất. Hãy đăng nhập lại để đóng tài khoản này.',
    'close.noAccount': 'Không có tài khoản nào để đóng ở đây.',
    'close.nameMissing': 'Hãy nhập tên của bạn để xác nhận.',
    'close.nameMismatch': 'Tên không khớp. Hãy nhập chính xác như hiển thị ở trên.',
    'close.teaching':
      'Bạn vẫn còn khóa học đang được duyệt hoặc đã xuất bản. Hãy đề nghị chủ nền tảng đóng tài khoản giảng dạy trước. Không có gì bị thay đổi.',
    'close.board':
      'Bạn là thành viên của một hội đồng học giả. Hãy đề nghị chủ nền tảng đưa bạn ra khỏi hội đồng trước. Không có gì bị thay đổi.',
    'close.held':
      'Tài khoản này liên kết với thông tin đăng nhập riêng của một trẻ, hoặc với bài làm đang được giữ lại, nên việc đóng tài khoản cần được xem xét riêng. Không có gì bị thay đổi. Liên hệ: {contact}.',
    'close.appointment':
      'Tài khoản này giữ vai trò được chỉ định về bảo vệ trẻ em hoặc phê duyệt hoàn tiền, nên việc đóng tài khoản cần được xem xét riêng. Không có gì bị thay đổi. Liên hệ: {contact}.',
    'close.refused':
      'Không thể đóng tài khoản này, và không có gì bị thay đổi. Nếu việc này tiếp diễn, liên hệ: {contact}.',
    'close.unconfirmed':
      'Chúng tôi không thể xác nhận tài khoản của bạn đã đóng hay chưa. Trước khi thử lại, hãy tải lại trang này để xem, hoặc liên hệ: {contact}.',
  },
  th: {
    'close.title': 'ปิดบัญชีนี้',
    'close.already': 'บัญชีนี้ถูกปิดไปแล้ว',
    'close.alreadyNote':
      'โปรไฟล์ถูกเปลี่ยนแล้ว แต่บันทึกและไฟล์บางส่วนอาจยังคงอยู่ ข้อมูลการเข้าสู่ระบบเก็บไว้ที่ผู้ให้บริการเข้าสู่ระบบ หากยังมีอยู่ การนำออกเป็นขั้นตอนแยกต่างหาก การอยู่ในรายการรอนำออกไม่ใช่หลักฐานว่าได้นำออกแล้ว',
    'close.lede':
      'คุณเข้าสู่ระบบด้วยบัญชี: {who} การดำเนินการนี้จะปิดบัญชี เปลี่ยนโปรไฟล์ของคุณ และนำข้อมูลส่วนบุคคลบางส่วนออก บันทึกและไฟล์ที่จัดเก็บไว้บางส่วนจะยังคงอยู่ ตามที่อธิบายไว้ด้านล่าง',
    'close.ledeUnnamed':
      'การดำเนินการนี้จะปิดบัญชีที่คุณเข้าสู่ระบบอยู่ เปลี่ยนโปรไฟล์ของคุณ และนำข้อมูลส่วนบุคคลบางส่วนออก บันทึกและไฟล์ที่จัดเก็บไว้บางส่วนจะยังคงอยู่ ตามที่อธิบายไว้ด้านล่าง',
    'close.goesHeading': 'สิ่งที่ถูกนำออกหรือเปลี่ยนเมื่อบัญชีปิด',
    'close.goesProfile': 'ชื่อ รูปภาพ เขตเวลา และประเทศของคุณ',
    'close.goesNotes': 'บันทึกบทเรียนและบุ๊กมาร์ก',
    'close.goesSaved': 'คอร์สที่บันทึกไว้และโน้ตที่เขียนกำกับไว้',
    'close.goesReviews':
      'รีวิวคอร์สของคุณจะถูกนำออก โพสต์ในการสนทนาจะยังอยู่เป็นกระทู้ โดยข้อความที่คุณเขียนจะถูกแทนที่',
    'close.goesAnswers':
      'ข้อความคำตอบปัจจุบันในโปรไฟล์ผู้เรียนของคุณเองจะถูกล้าง สำเนาของฉบับแก้ไขก่อนหน้าและไฟล์แนบอาจยังคงอยู่ภายใต้กฎการเก็บรักษาที่แยกต่างหาก',
    'close.goesSharing': 'ลิงก์แชร์ที่ยังใช้งานอยู่ คำเชิญ และสิทธิ์ของผู้ปกครอง',
    'close.goesMessages':
      'การแจ้งเตือนของแพลตฟอร์มและบันทึกข้อความขาออกที่เกี่ยวกับคุณ อีเมลที่ส่งถึงแล้วไม่สามารถเรียกคืนได้',
    'close.goesAppointment':
      'หากบัญชีนี้ได้รับแต่งตั้งให้ดูแลการคุ้มครองเด็กหรือการอนุมัติคืนเงิน การปิดบัญชีต้องได้รับการพิจารณาเป็นรายกรณี ติดต่อ: {contact}',
    'close.goesChildren':
      'โปรไฟล์เด็กในครอบครัวที่ไม่มีสมาชิกที่ใช้งานอยู่คนอื่นอาจถูกปิด หากเด็กมีการเข้าสู่ระบบแยกต่างหาก หรือมีงานในคอร์สที่ถูกระงับไว้เพื่อการคุ้มครองเด็ก การปิดบัญชีด้วยตนเองจะถูกหยุดไว้เพื่อพิจารณาเป็นรายกรณี ติดต่อ: {contact} บันทึกการเรียนอื่นของเด็กที่เข้าเงื่อนไข รวมถึงงานในคอร์ส จะถูกกำหนดให้นำออกหลังจากสามสิบวัน ไฟล์ที่จัดเก็บไว้ต้องมีขั้นตอนการลบแยกต่างหาก',
    'close.staysHeading': 'บันทึกที่ยังคงอยู่',
    'close.staysMoney':
      'คำสั่งซื้อ การชำระเงิน และการคืนเงิน: บัญชีแยกประเภทที่การคืนเงินต้องอาศัย',
    'close.staysProgress':
      'การลงทะเบียนและความคืบหน้าในบทเรียนของคุณเอง บันทึกของเด็กที่เข้าเงื่อนไขจะถูกกำหนดให้นำออกสามสิบวันหลังจากปิดบัญชี',
    'close.staysCertificates': 'ประกาศนียบัตร ภายใต้หมายเลขที่ออกให้',
    'close.staysSupport':
      'เคสขอความช่วยเหลือ ข้อความของเคสที่คุณเปิดจะถูกแทนที่ และข้อความที่คุณเขียนจะถูกนำออก รวมถึงข้อความในเคสของผู้อื่น หากเคสถูกระงับไว้เพื่อการคุ้มครองเด็ก เนื้อหาจะถูกเก็บไว้จนกว่าจะยกเลิกการระงับ และเนื้อหานั้นอาจระบุตัวคุณได้ แพลตฟอร์มพยายามแทนที่ชื่อที่แสดงของคุณในคำตอบของเจ้าหน้าที่และบันทึกการแก้ไขปัญหา แต่ชื่อหรือตัวระบุอื่นอาจยังคงอยู่ เคสจะครบกำหนดลบเมื่อผ่านไปสามปีหลังจากปิดเคส',
    'close.staysAudit': 'บันทึกการตรวจสอบที่ระบุว่าบัญชีถูกปิดแล้ว',
    'close.staysFingerprint':
      'ลายนิ้วมือดิจิทัลของที่อยู่ที่ใช้เข้าสู่ระบบของคุณ ไม่ใช่ตัวที่อยู่ เพื่อให้ฝ่ายช่วยเหลือตอบคำถามว่า “บัญชีของฉันถูกลบแล้วหรือยัง” ได้ เมื่อข้อมูลการเข้าสู่ระบบไม่มีอยู่แล้ว',
    'close.staysHolder':
      'ในประกาศนียบัตร ชื่อผู้ถือจะถูกแทนที่ด้วย: {label} ส่วนหมายเลขและรายละเอียดอื่นที่บันทึกไว้ในนั้นยังคงอยู่ ประกาศนียบัตรของเด็กก็ยังคงมีหมายเลขเดิมหลังจากบันทึกการเรียนถูกนำออก',
    'close.undoHeading': 'การดำเนินการนี้ย้อนกลับไม่ได้',
    'close.undoSessions':
      'แอปพยายามออกจากระบบให้คุณ แต่เซสชันอื่นและข้อมูลการเข้าสู่ระบบที่ผู้ให้บริการอาจยังคงอยู่จนกว่าจะถูกเพิกถอนหรือนำออกแยกต่างหาก หากคุณเป็นครูที่มีคอร์สอยู่ระหว่างการตรวจทานหรือเผยแพร่แล้ว เจ้าของแพลตฟอร์มต้องปิดบัญชีผู้สอนก่อน หน้านี้จะแจ้งให้ทราบหากกรณีนี้เกี่ยวกับคุณ',
    'close.undoSignInLead': 'การปิดบัญชีไม่ได้ลบข้อมูลการเข้าสู่ระบบ',
    'close.undoSignIn':
      'ข้อมูลนั้นเก็บไว้ที่ผู้ให้บริการเข้าสู่ระบบ ไม่ใช่ที่ AyahSpring ดังนั้นหากยังมีอยู่ การปิดบัญชีจะใส่ข้อมูลนั้นไว้ในรายการของเจ้าของแพลตฟอร์มเพื่อนำออกในขั้นตอนแยกต่างหาก ก่อนบันทึกว่านำออกแล้ว ฐานข้อมูลจะตรวจสอบว่าตัวตนนั้นไม่อยู่ในตารางการยืนยันตัวตนของตน ซึ่งไม่ใช่หลักฐานเกี่ยวกับสำเนาทั้งหมดที่ผู้ให้บริการ',
    'close.confirmLabel': 'หากต้องการยืนยัน ให้พิมพ์: {name}',
    'close.confirmNote':
      'ปุ่มจะใช้ได้เมื่อชื่อตรงกันทุกตัวอักษร การดำเนินการนี้ย้อนกลับไม่ได้ และไม่มีช่วงเวลาให้เปลี่ยนใจ',
    'close.nameless': 'บัญชีนี้ไม่มีชื่อให้พิมพ์ โปรดเพิ่มชื่อในการตั้งค่าบัญชีก่อน',
    'close.button': 'ปิดบัญชีของฉันอย่างถาวร',
    'close.closing': 'กำลังปิด…',
    'close.keep': 'เก็บบัญชีของฉันไว้',
    'close.signedOut': 'คุณออกจากระบบแล้ว โปรดเข้าสู่ระบบอีกครั้งเพื่อปิดบัญชีนี้',
    'close.noAccount': 'ไม่มีบัญชีให้ปิดที่นี่',
    'close.nameMissing': 'พิมพ์ชื่อของคุณเพื่อยืนยัน',
    'close.nameMismatch': 'ชื่อไม่ตรงกัน โปรดพิมพ์ให้ตรงกับที่แสดงด้านบนทุกตัวอักษร',
    'close.teaching':
      'คุณยังมีคอร์สที่อยู่ระหว่างการตรวจทานหรือเผยแพร่แล้ว โปรดขอให้เจ้าของแพลตฟอร์มปิดบัญชีผู้สอนก่อน ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
    'close.board':
      'คุณเป็นสมาชิกของคณะกรรมการผู้ทรงความรู้ โปรดขอให้เจ้าของแพลตฟอร์มนำคุณออกจากคณะกรรมการก่อน ไม่มีสิ่งใดถูกเปลี่ยนแปลง',
    'close.held':
      'บัญชีนี้เชื่อมโยงกับการเข้าสู่ระบบแยกต่างหากของเด็ก หรือกับงานในคอร์สที่ถูกระงับไว้ การปิดบัญชีจึงต้องได้รับการพิจารณาเป็นรายกรณี ไม่มีสิ่งใดถูกเปลี่ยนแปลง ติดต่อ: {contact}',
    'close.appointment':
      'บัญชีนี้ได้รับแต่งตั้งให้ดูแลการคุ้มครองเด็กหรือการอนุมัติคืนเงิน การปิดบัญชีจึงต้องได้รับการพิจารณาเป็นรายกรณี ไม่มีสิ่งใดถูกเปลี่ยนแปลง ติดต่อ: {contact}',
    'close.refused':
      'ไม่สามารถปิดบัญชีนี้ได้ และไม่มีสิ่งใดถูกเปลี่ยนแปลง หากยังเกิดขึ้นอีก ติดต่อ: {contact}',
    'close.unconfirmed':
      'เราไม่สามารถยืนยันได้ว่าบัญชีของคุณถูกปิดแล้วหรือไม่ ก่อนลองอีกครั้ง โปรดโหลดหน้านี้ใหม่เพื่อดู หรือติดต่อ: {contact}',
  },
  fil: {
    'close.title': 'Isara ang account na ito',
    'close.already': 'Nakasara na ang account na ito.',
    'close.alreadyNote':
      'Nabago na ang profile, pero maaaring may matirang ilang rekord at file. Ang sign-in ay hawak ng provider ng sign-in; kung naroon pa ito, hiwalay na hakbang ang pag-aalis nito. Ang pagiging nasa listahan ng aalisin ay hindi patunay na naalis na ito.',
    'close.lede':
      'Naka-sign in ka gamit ang account: {who}. Isinasara ng hakbang na ito ang account, binabago ang profile mo at inaalis ang ilang personal na impormasyon. May ilang rekord at nakaimbak na file na nananatili, gaya ng ipinaliliwanag sa ibaba.',
    'close.ledeUnnamed':
      'Isinasara ng hakbang na ito ang account na gamit mo ngayon, binabago ang profile mo at inaalis ang ilang personal na impormasyon. May ilang rekord at nakaimbak na file na nananatili, gaya ng ipinaliliwanag sa ibaba.',
    'close.goesHeading': 'Inaalis o binabago kapag isinara ang account',
    'close.goesProfile': 'Ang pangalan, larawan, time zone at bansa mo',
    'close.goesNotes': 'Mga tala sa aralin at mga bookmark',
    'close.goesSaved': 'Mga naka-save na kurso at ang mga tala sa mga ito',
    'close.goesReviews':
      'Inaalis ang mga review mo sa kurso. Nananatili ang mga post sa talakayan bilang mga thread, at pinapalitan ang isinulat mo.',
    'close.goesAnswers':
      'Binubura ang kasalukuyang teksto ng sagot sa sarili mong profile ng mag-aaral. Maaaring manatili ang mga kopya ng mga naunang rebisyon at ang mga nakalakip na file sa ilalim ng hiwalay na mga tuntunin sa pagtatago.',
    'close.goesSharing':
      'Mga aktibong link sa pagbabahagi, mga imbitasyon at access ng tagapag-alaga',
    'close.goesMessages':
      'Mga abiso ng platform at mga rekord ng ipinadalang mensahe tungkol sa iyo. Hindi na mababawi ang email na naihatid na.',
    'close.goesAppointment':
      'Kung ang account na ito ay may hawak na tungkulin sa pangangalaga ng bata o sa pag-apruba ng refund, kailangan ng indibidwal na pagsusuri bago ito maisara. Makipag-ugnayan sa: {contact}.',
    'close.goesChildren':
      'Maaaring isara ang profile ng bata sa pamilyang walang ibang aktibong miyembro. Kung may hiwalay itong login, o may gawain sa kurso na pinipigil para sa pangangalaga ng bata, ihihinto muna ang sariling pagsasara ng account para sa indibidwal na pagsusuri. Makipag-ugnayan sa: {contact}. Ang iba pang kuwalipikadong rekord ng pag-aaral ng bata, kasama ang gawain sa kurso, ay nakatakdang alisin pagkalipas ng tatlumpung araw. Kailangan ng hiwalay na hakbang sa pagbura ang mga nakaimbak na file.',
    'close.staysHeading': 'Mga rekord na nananatili',
    'close.staysMoney': 'Mga order, bayad at refund: ang talaang pinagbabatayan ng refund',
    'close.staysProgress':
      'Ang sarili mong mga enrolment at pag-usad sa aralin. Ang mga kuwalipikadong rekord ng bata ay nakatakdang alisin tatlumpung araw pagkatapos ng pagsasara.',
    'close.staysCertificates': 'Mga sertipiko, sa numerong ibinigay nang ilabas ang mga ito',
    'close.staysSupport':
      'Mga kaso ng suporta. Pinapalitan ang teksto ng mga kasong binuksan mo, at inaalis ang mga mensaheng isinulat mo, kasama ang mga nasa kaso ng ibang tao. Kung ang isang kaso ay nakahinto para sa pangangalaga ng bata, itinatago ang nilalaman nito hanggang alisin ang paghinto, at maaari ka nitong matukoy. Sinisikap ng platform na palitan ang ipinapakitang pangalan mo sa mga sagot ng staff at sa mga tala ng resolusyon, pero maaaring may matirang ibang pangalan o pagkakakilanlan. Nakatakdang burahin ang kaso tatlong taon matapos itong isara.',
    'close.staysAudit': 'Ang rekord ng audit na isinara ang account',
    'close.staysFingerprint':
      'Isang digital na bakas ng address mo sa pag-sign in, hindi ang address mismo, para masagot ng suporta ang “nabura ba ang account ko?” kapag wala na ang sign-in',
    'close.staysHolder':
      'Sa sertipiko, pinapalitan ang pangalan ng may-hawak ng: {label}; nananatili ang numero nito at ang iba pang detalyeng nakatala rito. Nananatili rin ang numero ng sertipiko ng bata matapos alisin ang rekord ng pag-aaral.',
    'close.undoHeading': 'Hindi na ito mababawi',
    'close.undoSessions':
      'Sinisikap ng app na i-sign out ka, pero maaaring manatili ang ibang session at ang sign-in sa provider hanggang hiwalay na bawiin o alisin ang mga ito. Kung guro ka na may kursong sinusuri o nailathala na, kailangang isara muna ng may-ari ng platform ang account sa pagtuturo; sasabihin ito ng pahinang ito kung saklaw ka nito.',
    'close.undoSignInLead': 'Hindi binubura ng pagsasara ng account ang sign-in.',
    'close.undoSignIn':
      'Hawak ito ng provider ng sign-in at hindi ng AyahSpring, kaya inilalagay ito ng pagsasara ng account sa listahan ng may-ari ng platform para sa hiwalay na hakbang ng pag-aalis kung naroon pa ito. Bago itala ang pag-aalis, tinitingnan ng database na wala na ang pagkakakilanlan sa talahanayan nito ng authentication; hindi iyon patunay tungkol sa lahat ng kopya sa provider.',
    'close.confirmLabel': 'Para kumpirmahin, i-type ang: {name}',
    'close.confirmNote':
      'Magagamit ang button kapag eksaktong tumugma ang pangalan. Hindi na ito mababawi, at walang panahon para magbago ng isip.',
    'close.nameless':
      'Walang pangalang mai-type ang account na ito. Magdagdag muna sa mga setting ng account.',
    'close.button': 'Isara nang tuluyan ang account ko',
    'close.closing': 'Isinasara…',
    'close.keep': 'Panatilihin ang account ko',
    'close.signedOut': 'Naka-sign out ka na. Mag-sign in ulit para isara ang account na ito.',
    'close.noAccount': 'Walang account na maisasara dito.',
    'close.nameMissing': 'I-type ang pangalan mo para kumpirmahin.',
    'close.nameMismatch':
      'Hindi tumutugma ang pangalan. I-type ito nang eksakto gaya ng nakikita sa itaas.',
    'close.teaching':
      'May kurso ka pang sinusuri o nailathala na. Hilingin muna sa may-ari ng platform na isara ang account sa pagtuturo. Walang binago.',
    'close.board':
      'Kasapi ka ng isang lupon ng mga iskolar. Hilingin muna sa may-ari ng platform na alisin ka roon. Walang binago.',
    'close.held':
      'Nakaugnay ang account na ito sa hiwalay na login ng isang bata, o sa gawain sa kurso na pinipigil, kaya kailangan ng indibidwal na pagsusuri bago ito maisara. Walang binago. Makipag-ugnayan sa: {contact}.',
    'close.appointment':
      'May hawak ang account na ito na tungkulin sa pangangalaga ng bata o sa pag-apruba ng refund, kaya kailangan ng indibidwal na pagsusuri bago ito maisara. Walang binago. Makipag-ugnayan sa: {contact}.',
    'close.refused':
      'Hindi naisara ang account na ito, at walang binago. Kung paulit-ulit itong mangyari, makipag-ugnayan sa: {contact}.',
    'close.unconfirmed':
      'Hindi namin makumpirma kung naisara ang account mo. Bago sumubok ulit, i-reload ang pahinang ito para makita, o makipag-ugnayan sa: {contact}.',
  },
  uz: {
    'close.title': 'Bu hisobni yopish',
    'close.already': 'Bu hisob allaqachon yopilgan.',
    'close.alreadyNote':
      'Profil oʻzgartirildi, lekin ayrim yozuvlar va fayllar qolishi mumkin. Kirish maʼlumoti kirish xizmati provayderida saqlanadi; u hali ham mavjud boʻlsa, uni olib tashlash alohida qadamdir. Olib tashlash roʻyxatida turishi uning olib tashlanganiga dalil emas.',
    'close.lede':
      'Siz kirgan hisob: {who}. Bu amal hisobni yopadi, profilingizni oʻzgartiradi va ayrim shaxsiy maʼlumotlarni olib tashlaydi. Ayrim yozuvlar va saqlangan fayllar quyida tushuntirilganidek qoladi.',
    'close.ledeUnnamed':
      'Bu amal siz kirgan hisobni yopadi, profilingizni oʻzgartiradi va ayrim shaxsiy maʼlumotlarni olib tashlaydi. Ayrim yozuvlar va saqlangan fayllar quyida tushuntirilganidek qoladi.',
    'close.goesHeading': 'Hisob yopilganda olib tashlanadigan yoki oʻzgartiriladigan narsalar',
    'close.goesProfile': 'Ismingiz, rasmingiz, vaqt mintaqangiz va mamlakatingiz',
    'close.goesNotes': 'Dars qaydlari va xatchoʻplar',
    'close.goesSaved': 'Saqlangan kurslar va ularga yozilgan qaydlar',
    'close.goesReviews':
      'Kurslarga yozgan sharhlaringiz olib tashlanadi. Muhokama xabarlari mavzular sifatida qoladi, siz yozgan matn esa almashtiriladi.',
    'close.goesAnswers':
      'Oʻzingizning oʻquvchi profilingizdagi joriy javob matni tozalanadi. Oldingi tahrirlarning saqlangan nusxalari va biriktirilgan fayllar alohida saqlash qoidalari boʻyicha qolishi mumkin.',
    'close.goesSharing': 'Amaldagi ulashish havolalari, taklifnomalar va vasiy ruxsati',
    'close.goesMessages':
      'Siz haqingizdagi platforma bildirishnomalari va yuborilgan xabarlar yozuvlari. Yetkazib boʻlingan elektron xatni qaytarib olib boʻlmaydi.',
    'close.goesAppointment':
      'Agar bu hisobga bolalarni himoya qilish yoki pul qaytarishni tasdiqlash vazifasi yuklangan boʻlsa, uni yopish alohida koʻrib chiqishni talab qiladi. Aloqa: {contact}.',
    'close.goesChildren':
      'Boshqa faol aʼzosi yoʻq oiladagi bola profili yopilishi mumkin. Agar bolaning alohida logini yoki himoya sababli ushlab turilgan kurs ishlari boʻlsa, hisobni oʻzingiz yopishingiz alohida koʻrib chiqilguncha toʻxtatiladi. Aloqa: {contact}. Bolalarning boshqa mos keladigan oʻquv yozuvlari, jumladan kurs ishlari, oʻttiz kundan keyin olib tashlashga rejalashtiriladi. Saqlangan fayllar alohida oʻchirish qadamini talab qiladi.',
    'close.staysHeading': 'Qoladigan yozuvlar',
    'close.staysMoney':
      'Buyurtmalar, toʻlovlar va qaytarilgan pullar: pulni qaytarish tayanadigan daftar',
    'close.staysProgress':
      'Oʻzingizning yozilishlaringiz va darslardagi oʻzlashtirishingiz. Bolalarning mos keladigan yozuvlari hisob yopilganidan oʻttiz kun oʻtgach olib tashlashga rejalashtiriladi.',
    'close.staysCertificates': 'Sertifikatlar, berilgan raqami bilan',
    'close.staysSupport':
      'Yordam murojaatlari. Siz ochgan murojaatlarning matni almashtiriladi, siz yozgan xabarlar esa, boshqalarning murojaatlaridagilari bilan birga, olib tashlanadi. Agar murojaat himoya sababli toʻxtatib qoʻyilgan boʻlsa, uning mazmuni toʻxtatish bekor qilinguncha saqlanadi va u sizni tanitishi mumkin. Platforma xodimlar javoblari va hal qilish qaydlarida koʻrinadigan ismingizni almashtirishga harakat qiladi, lekin boshqa ismlar yoki identifikatorlar qolishi mumkin. Murojaat yopilganidan uch yil oʻtgach oʻchirilishi kerak.',
    'close.staysAudit': 'Hisob yopilgani haqidagi audit yozuvi',
    'close.staysFingerprint':
      'Kirish manzilingizning oʻzi emas, raqamli izi; shunda kirish maʼlumoti yoʻqolgach ham yordam xizmati “hisobim oʻchirildimi?” degan savolga javob bera oladi',
    'close.staysHolder':
      'Sertifikatda egasining ismi oʻrniga shu yoziladi: {label}; uning raqami va unda qayd etilgan boshqa tafsilotlar qoladi. Bolaning sertifikati ham oʻquv yozuvi olib tashlangach raqamini saqlab qoladi.',
    'close.undoHeading': 'Buni ortga qaytarib boʻlmaydi',
    'close.undoSessions':
      'Ilova sizni hisobdan chiqarishga harakat qiladi, lekin boshqa seanslar va provayderdagi kirish maʼlumoti alohida bekor qilinguncha yoki olib tashlanguncha qolishi mumkin. Agar siz koʻrib chiqilayotgan yoki chop etilgan kursi bor oʻqituvchi boʻlsangiz, avval platforma egasi oʻqituvchi hisobini yopishi kerak; bu sizga tegishli boʻlsa, shu sahifa buni aytadi.',
    'close.undoSignInLead': 'Hisobni yopish kirish maʼlumotini oʻchirmaydi.',
    'close.undoSignIn':
      'U AyahSpringda emas, kirish xizmati provayderida saqlanadi, shuning uchun u hali ham mavjud boʻlsa, hisobni yopish uni alohida olib tashlash qadami uchun platforma egasining roʻyxatiga qoʻyadi. Olib tashlash qayd etilishidan oldin maʼlumotlar bazasi shaxsning oʻz autentifikatsiya jadvalida yoʻqligini tekshiradi; bu provayderdagi barcha nusxalar haqida dalil emas.',
    'close.confirmLabel': 'Tasdiqlash uchun shuni yozing: {name}',
    'close.confirmNote':
      'Ism aynan mos kelganda tugma ishlaydigan boʻladi. Buni ortga qaytarib boʻlmaydi va fikrdan qaytish muddati yoʻq.',
    'close.nameless': 'Bu hisobda yoziladigan ism yoʻq. Avval hisob sozlamalarida ism qoʻshing.',
    'close.button': 'Hisobimni butunlay yopish',
    'close.closing': 'Yopilmoqda…',
    'close.keep': 'Hisobim qolsin',
    'close.signedOut': 'Siz hisobdan chiqqansiz. Bu hisobni yopish uchun qayta kiring.',
    'close.noAccount': 'Bu yerda yopiladigan hisob yoʻq.',
    'close.nameMissing': 'Tasdiqlash uchun ismingizni yozing.',
    'close.nameMismatch': 'Ism mos kelmadi. Uni yuqorida koʻrsatilganidek, aynan yozing.',
    'close.teaching':
      'Sizda hali ham koʻrib chiqilayotgan yoki chop etilgan kurs bor. Avval platforma egasidan oʻqituvchi hisobini yopishni soʻrang. Hech narsa oʻzgarmadi.',
    'close.board':
      'Siz ilmiy kengash aʼzosisiz. Avval platforma egasidan sizni undan chiqarishni soʻrang. Hech narsa oʻzgarmadi.',
    'close.held':
      'Bu hisob bolaning alohida loginiga yoki ushlab turilgan kurs ishlariga bogʻlangan, shuning uchun uni yopish alohida koʻrib chiqishni talab qiladi. Hech narsa oʻzgarmadi. Aloqa: {contact}.',
    'close.appointment':
      'Bu hisobga bolalarni himoya qilish yoki pul qaytarishni tasdiqlash vazifasi yuklangan, shuning uchun uni yopish alohida koʻrib chiqishni talab qiladi. Hech narsa oʻzgarmadi. Aloqa: {contact}.',
    'close.refused':
      'Bu hisobni yopib boʻlmadi va hech narsa oʻzgarmadi. Bu takrorlansa, aloqa: {contact}.',
    'close.unconfirmed':
      'Hisobingiz yopilgan yoki yopilmaganini tasdiqlay olmadik. Qayta urinishdan oldin koʻrish uchun shu sahifani qayta yuklang yoki shu manzilga yozing: {contact}.',
  },
  kk: {
    'close.title': 'Осы тіркелгіні жабу',
    'close.already': 'Бұл тіркелгі бұрыннан жабылған.',
    'close.alreadyNote':
      'Профиль өзгертілді, бірақ кейбір жазбалар мен файлдар қалуы мүмкін. Кіру деректері кіру қызметін жеткізушіде сақталады; егер олар әлі бар болса, оларды жою бөлек қадам. Жоюға арналған тізімде тұруы оның жойылғанын дәлелдемейді.',
    'close.lede':
      'Сіз кірген тіркелгі: {who}. Бұл әрекет тіркелгіні жабады, профиліңізді өзгертеді және кейбір жеке деректерді жояды. Кейбір жазбалар мен сақталған файлдар төменде түсіндірілгендей қалады.',
    'close.ledeUnnamed':
      'Бұл әрекет сіз кірген тіркелгіні жабады, профиліңізді өзгертеді және кейбір жеке деректерді жояды. Кейбір жазбалар мен сақталған файлдар төменде түсіндірілгендей қалады.',
    'close.goesHeading': 'Тіркелгі жабылғанда жойылатын немесе өзгертілетін нәрселер',
    'close.goesProfile': 'Атыңыз, суретіңіз, уақыт белдеуіңіз және еліңіз',
    'close.goesNotes': 'Сабақ жазбалары мен бетбелгілер',
    'close.goesSaved': 'Сақталған курстар және оларға жазылған ескертпелер',
    'close.goesReviews':
      'Курстарға жазған пікірлеріңіз жойылады. Талқылаудағы жазбалар тақырып ретінде қалады, ал сіз жазған мәтін ауыстырылады.',
    'close.goesAnswers':
      'Өз оқушы профиліңіздегі ағымдағы жауап мәтіні тазартылады. Бұрынғы түзетулердің сақталған көшірмелері мен тіркелген файлдар бөлек сақтау ережелері бойынша қалуы мүмкін.',
    'close.goesSharing': 'Жұмыс істеп тұрған бөлісу сілтемелері, шақырулар және қамқоршы рұқсаты',
    'close.goesMessages':
      'Сізге қатысты платформа хабарландырулары мен жіберілген хабарлардың жазбалары. Жеткізіліп қойған электрондық хатты қайтарып алу мүмкін емес.',
    'close.goesAppointment':
      'Егер бұл тіркелгіге балаларды қорғау немесе ақшаны қайтаруды бекіту міндеті жүктелген болса, оны жабу жеке қарауды қажет етеді. Байланыс: {contact}.',
    'close.goesChildren':
      'Басқа белсенді мүшесі жоқ отбасындағы бала профилі жабылуы мүмкін. Егер баланың бөлек логині немесе қорғау себебімен ұсталып тұрған курс жұмыстары болса, тіркелгіні өз бетіңізше жабу жеке қарау жүргізілгенше тоқтатылады. Байланыс: {contact}. Балалардың талапқа сай келетін басқа оқу жазбалары, соның ішінде курс жұмыстары, отыз күннен кейін жоюға жоспарланады. Сақталған файлдар бөлек жою қадамын қажет етеді.',
    'close.staysHeading': 'Қалатын жазбалар',
    'close.staysMoney':
      'Тапсырыстар, төлемдер және қайтарылған ақша: ақшаны қайтару сүйенетін кітап',
    'close.staysProgress':
      'Өз тіркелулеріңіз және сабақтардағы ілгерілеуіңіз. Балалардың талапқа сай келетін жазбалары тіркелгі жабылғаннан кейін отыз күн өткен соң жоюға жоспарланады.',
    'close.staysCertificates': 'Сертификаттар, берілген нөмірімен',
    'close.staysSupport':
      'Қолдау өтініштері. Сіз ашқан өтініштердің мәтіні ауыстырылады, ал сіз жазған хабарлар, басқа адамдардың өтініштеріндегілерін қоса, жойылады. Егер өтініш қорғау себебімен тоқтатылып тұрса, оның мазмұны тоқтату алынғанша сақталады және ол сізді танытуы мүмкін. Платформа қызметкерлер жауаптары мен шешім жазбаларындағы көрсетілетін атыңызды ауыстыруға тырысады, бірақ басқа аттар немесе идентификаторлар қалуы мүмкін. Өтініш жабылғаннан кейін үш жыл өткен соң жойылуға тиіс.',
    'close.staysAudit': 'Тіркелгінің жабылғаны туралы аудит жазбасы',
    'close.staysFingerprint':
      'Кіру мекенжайыңыздың өзі емес, цифрлық ізі; сонда кіру деректері жойылғаннан кейін де қолдау қызметі «тіркелгім өшірілді ме?» деген сұраққа жауап бере алады',
    'close.staysHolder':
      'Сертификатта иесінің атының орнына мынау жазылады: {label}; оның нөмірі мен онда жазылған басқа мәліметтер қалады. Баланың сертификаты да оқу жазбасы жойылғаннан кейін нөмірін сақтайды.',
    'close.undoHeading': 'Мұны кері қайтару мүмкін емес',
    'close.undoSessions':
      'Қолданба сізді жүйеден шығаруға тырысады, бірақ басқа сеанстар мен жеткізушідегі кіру деректері бөлек күші жойылғанша немесе жойылғанша қалуы мүмкін. Егер сіз қаралып жатқан немесе жарияланған курсы бар мұғалім болсаңыз, алдымен платформа иесі мұғалім тіркелгісін жабуы керек; бұл сізге қатысты болса, осы бет соны айтады.',
    'close.undoSignInLead': 'Тіркелгіні жабу кіру деректерін жоймайды.',
    'close.undoSignIn':
      'Олар AyahSpring-те емес, кіру қызметін жеткізушіде сақталады, сондықтан олар әлі бар болса, тіркелгіні жабу оларды бөлек жою қадамы үшін платформа иесінің тізіміне қояды. Жою тіркелмес бұрын дерекқор сол тұлғаның өз аутентификация кестесінде жоқ екенін тексереді; бұл жеткізушідегі барлық көшірмелер туралы дәлел емес.',
    'close.confirmLabel': 'Растау үшін мынаны жазыңыз: {name}',
    'close.confirmNote':
      'Ат дәл сәйкес келгенде түйме қолжетімді болады. Мұны кері қайтару мүмкін емес және ойлану мерзімі жоқ.',
    'close.nameless': 'Бұл тіркелгіде жазатын ат жоқ. Алдымен тіркелгі параметрлерінде ат қосыңыз.',
    'close.button': 'Тіркелгімді біржола жабу',
    'close.closing': 'Жабылып жатыр…',
    'close.keep': 'Тіркелгім қалсын',
    'close.signedOut': 'Сіз жүйеден шығып кеткенсіз. Бұл тіркелгіні жабу үшін қайта кіріңіз.',
    'close.noAccount': 'Мұнда жабатын тіркелгі жоқ.',
    'close.nameMissing': 'Растау үшін атыңызды жазыңыз.',
    'close.nameMismatch': 'Ат сәйкес келмеді. Оны жоғарыда көрсетілгендей дәл жазыңыз.',
    'close.teaching':
      'Сізде әлі де қаралып жатқан немесе жарияланған курс бар. Алдымен платформа иесінен мұғалім тіркелгісін жабуды сұраңыз. Ештеңе өзгерген жоқ.',
    'close.board':
      'Сіз ғылыми кеңестің мүшесісіз. Алдымен платформа иесінен сізді одан шығаруды сұраңыз. Ештеңе өзгерген жоқ.',
    'close.held':
      'Бұл тіркелгі баланың бөлек логиніне немесе ұсталып тұрған курс жұмыстарына байланған, сондықтан оны жабу жеке қарауды қажет етеді. Ештеңе өзгерген жоқ. Байланыс: {contact}.',
    'close.appointment':
      'Бұл тіркелгіге балаларды қорғау немесе ақшаны қайтаруды бекіту міндеті жүктелген, сондықтан оны жабу жеке қарауды қажет етеді. Ештеңе өзгерген жоқ. Байланыс: {contact}.',
    'close.refused':
      'Бұл тіркелгіні жабу мүмкін болмады және ештеңе өзгерген жоқ. Бұл қайталана берсе, байланыс: {contact}.',
    'close.unconfirmed':
      'Тіркелгіңіздің жабылған-жабылмағанын растай алмадық. Қайта әрекет жасамас бұрын көру үшін осы бетті қайта жүктеңіз немесе мына мекенжайға жазыңыз: {contact}.',
  },
  az: {
    'close.title': 'Bu hesabı bağla',
    'close.already': 'Bu hesab artıq bağlanıb.',
    'close.alreadyNote':
      'Profil dəyişdirilib, lakin bəzi qeydlər və fayllar qala bilər. Giriş məlumatı giriş xidməti təminatçısında saxlanılır; hələ də mövcuddursa, onun silinməsi ayrıca addımdır. Silinmə siyahısında olması onun silindiyinə sübut deyil.',
    'close.lede':
      'Daxil olduğunuz hesab: {who}. Bu əməliyyat hesabı bağlayır, profilinizi dəyişdirir və bəzi şəxsi məlumatları silir. Bəzi qeydlər və saxlanılan fayllar aşağıda izah edildiyi kimi qalır.',
    'close.ledeUnnamed':
      'Bu əməliyyat daxil olduğunuz hesabı bağlayır, profilinizi dəyişdirir və bəzi şəxsi məlumatları silir. Bəzi qeydlər və saxlanılan fayllar aşağıda izah edildiyi kimi qalır.',
    'close.goesHeading': 'Hesab bağlananda silinən və ya dəyişdirilənlər',
    'close.goesProfile': 'Adınız, şəkliniz, saat qurşağınız və ölkəniz',
    'close.goesNotes': 'Dərs qeydləri və əlfəcinlər',
    'close.goesSaved': 'Yadda saxlanılan kurslar və onlara yazılan qeydlər',
    'close.goesReviews':
      'Kurslara yazdığınız rəylər silinir. Müzakirə yazıları mövzu kimi qalır, sizin yazdığınız mətn isə əvəz olunur.',
    'close.goesAnswers':
      'Öz öyrənən profilinizdəki cari cavab mətni təmizlənir. Əvvəlki düzəlişlərin saxlanılan surətləri və əlavə edilmiş fayllar ayrıca saxlama qaydalarına əsasən qala bilər.',
    'close.goesSharing': 'Qüvvədə olan paylaşım keçidləri, dəvətlər və qəyyum icazəsi',
    'close.goesMessages':
      'Sizinlə bağlı platforma bildirişləri və göndərilmiş mesajların qeydləri. Artıq çatdırılmış e-poçt geri çağırıla bilməz.',
    'close.goesAppointment':
      'Bu hesaba uşaqların qorunması və ya geri qaytarmanın təsdiqi vəzifəsi həvalə olunubsa, onun bağlanması fərdi baxış tələb edir. Əlaqə: {contact}.',
    'close.goesChildren':
      'Başqa fəal üzvü olmayan ailədəki uşaq profili bağlana bilər. Uşağın ayrıca girişi və ya qoruma səbəbi ilə saxlanılan kurs işləri varsa, hesabı özünüzün bağlamağınız fərdi baxış keçirilənədək dayandırılır. Əlaqə: {contact}. Uşaqların şərtlərə uyğun digər təhsil qeydləri, kurs işləri də daxil olmaqla, otuz gündən sonra silinmək üçün planlaşdırılır. Saxlanılan fayllar ayrıca silmə addımı tələb edir.',
    'close.staysHeading': 'Qalan qeydlər',
    'close.staysMoney':
      'Sifarişlər, ödənişlər və geri qaytarmalar: geri qaytarmanın əsaslandığı dəftər',
    'close.staysProgress':
      'Öz yazılışlarınız və dərslərdəki irəliləyişiniz. Uşaqların şərtlərə uyğun qeydləri hesab bağlandıqdan otuz gün sonra silinmək üçün planlaşdırılır.',
    'close.staysCertificates': 'Sertifikatlar, verildikləri nömrə ilə',
    'close.staysSupport':
      'Dəstək müraciətləri. Sizin açdığınız müraciətlərin mətni əvəz olunur, yazdığınız mesajlar isə, başqalarının müraciətlərindəkilər də daxil olmaqla, silinir. Müraciət qoruma səbəbi ilə dayandırılıbsa, onun məzmunu dayandırma götürülənədək saxlanılır və o sizi tanıda bilər. Platforma əməkdaşların cavablarında və həll qeydlərində görünən adınızı əvəz etməyə çalışır, lakin başqa adlar və ya identifikatorlar qala bilər. Müraciət bağlandıqdan üç il sonra silinməlidir.',
    'close.staysAudit': 'Hesabın bağlandığına dair audit qeydi',
    'close.staysFingerprint':
      'Giriş ünvanınızın özü deyil, rəqəmsal izi; beləliklə, giriş məlumatı yox olduqdan sonra da dəstək xidməti “hesabım silinibmi?” sualına cavab verə bilər',
    'close.staysHolder':
      'Sertifikatda sahibinin adının yerinə bu yazılır: {label}; onun nömrəsi və orada qeyd olunan digər təfərrüatlar qalır. Uşağın sertifikatı da təhsil qeydi silindikdən sonra nömrəsini saxlayır.',
    'close.undoHeading': 'Bunu geri qaytarmaq olmaz',
    'close.undoSessions':
      'Tətbiq sizi hesabdan çıxarmağa çalışır, lakin digər sessiyalar və təminatçıdakı giriş məlumatı ayrıca ləğv edilənədək və ya silinənədək qala bilər. Baxışda və ya dərc olunmuş kursu olan müəllimsinizsə, əvvəlcə platforma sahibi müəllim hesabını bağlamalıdır; bu sizə aiddirsə, bu səhifə bunu deyəcək.',
    'close.undoSignInLead': 'Hesabı bağlamaq giriş məlumatını silmir.',
    'close.undoSignIn':
      'O, AyahSpring-də deyil, giriş xidməti təminatçısında saxlanılır, buna görə də hələ mövcuddursa, hesabın bağlanması onu ayrıca silmə addımı üçün platforma sahibinin siyahısına salır. Silinmə qeydə alınmazdan əvvəl verilənlər bazası həmin şəxsiyyətin öz autentifikasiya cədvəlində olmadığını yoxlayır; bu, təminatçıdakı bütün surətlər barədə sübut deyil.',
    'close.confirmLabel': 'Təsdiqləmək üçün bunu yazın: {name}',
    'close.confirmNote':
      'Ad tam uyğun gələndə düymə aktiv olur. Bunu geri qaytarmaq olmaz və fikirdən daşınmaq üçün müddət yoxdur.',
    'close.nameless':
      'Bu hesabda yazılacaq ad yoxdur. Əvvəlcə hesab parametrlərində ad əlavə edin.',
    'close.button': 'Hesabımı həmişəlik bağla',
    'close.closing': 'Bağlanır…',
    'close.keep': 'Hesabım qalsın',
    'close.signedOut': 'Siz hesabdan çıxmısınız. Bu hesabı bağlamaq üçün yenidən daxil olun.',
    'close.noAccount': 'Burada bağlanacaq hesab yoxdur.',
    'close.nameMissing': 'Təsdiqləmək üçün adınızı yazın.',
    'close.nameMismatch': 'Ad uyğun gəlmir. Onu yuxarıda göründüyü kimi, tam eyni yazın.',
    'close.teaching':
      'Hələ də baxışda və ya dərc olunmuş kursunuz var. Əvvəlcə platforma sahibindən müəllim hesabını bağlamağı xahiş edin. Heç nə dəyişmədi.',
    'close.board':
      'Siz elmi şuranın üzvüsünüz. Əvvəlcə platforma sahibindən sizi oradan çıxarmağı xahiş edin. Heç nə dəyişmədi.',
    'close.held':
      'Bu hesab uşağın ayrıca girişinə və ya saxlanılan kurs işlərinə bağlıdır, buna görə onun bağlanması fərdi baxış tələb edir. Heç nə dəyişmədi. Əlaqə: {contact}.',
    'close.appointment':
      'Bu hesaba uşaqların qorunması və ya geri qaytarmanın təsdiqi vəzifəsi həvalə olunub, buna görə onun bağlanması fərdi baxış tələb edir. Heç nə dəyişmədi. Əlaqə: {contact}.',
    'close.refused':
      'Bu hesabı bağlamaq mümkün olmadı və heç nə dəyişmədi. Bu təkrarlanarsa, əlaqə: {contact}.',
    'close.unconfirmed':
      'Hesabınızın bağlanıb-bağlanmadığını təsdiqləyə bilmədik. Yenidən cəhd etməzdən əvvəl görmək üçün bu səhifəni yenidən yükləyin və ya bu ünvana yazın: {contact}.',
  },
  tg: {
    'close.title': 'Бастани ин ҳисоб',
    'close.already': 'Ин ҳисоб аллакай баста шудааст.',
    'close.alreadyNote':
      'Профил тағйир дода шуд, вале баъзе сабтҳо ва файлҳо метавонанд боқӣ монанд. Маълумоти воридшавӣ дар назди таъминкунандаи воридшавӣ нигоҳ дошта мешавад; агар он ҳанӯз вуҷуд дошта бошад, бардоштани он қадами алоҳида аст. Дар рӯйхати бардоштан будан далели бардошта шудани он нест.',
    'close.lede':
      'Шумо бо ин ҳисоб ворид шудаед: {who}. Ин амал ҳисобро мебандад, профили шуморо тағйир медиҳад ва баъзе маълумоти шахсиро мебардорад. Баъзе сабтҳо ва файлҳои захирашуда, чунон ки дар поён шарҳ дода шудааст, боқӣ мемонанд.',
    'close.ledeUnnamed':
      'Ин амал ҳисоберо, ки шумо бо он ворид шудаед, мебандад, профили шуморо тағйир медиҳад ва баъзе маълумоти шахсиро мебардорад. Баъзе сабтҳо ва файлҳои захирашуда, чунон ки дар поён шарҳ дода шудааст, боқӣ мемонанд.',
    'close.goesHeading': 'Он чи ҳангоми бастани ҳисоб бардошта ё тағйир дода мешавад',
    'close.goesProfile': 'Ном, акс, минтақаи вақт ва кишвари шумо',
    'close.goesNotes': 'Қайдҳои дарс ва хатчӯбҳо',
    'close.goesSaved': 'Курсҳои захирашуда ва қайдҳои онҳо',
    'close.goesReviews':
      'Тақризҳои шумо ба курсҳо бардошта мешаванд. Навиштаҳои муҳокима ҳамчун риштаҳо мемонанд ва матни навиштаи шумо иваз карда мешавад.',
    'close.goesAnswers':
      'Матни ҷории ҷавоб дар профили хонандаи худи шумо тоза карда мешавад. Нусхаҳои захирашудаи таҳрирҳои пешина ва файлҳои замимашуда метавонанд тибқи қоидаҳои алоҳидаи нигоҳдорӣ боқӣ монанд.',
    'close.goesSharing': 'Пайвандҳои фаъоли мубодила, даъватномаҳо ва дастрасии сарпараст',
    'close.goesMessages':
      'Огоҳиномаҳои платформа ва сабтҳои паёмҳои фиристодашуда дар бораи шумо. Почтаи электронии аллакай расонидашударо баргардондан мумкин нест.',
    'close.goesAppointment':
      'Агар ба ин ҳисоб вазифаи ҳифзи кӯдакон ё тасдиқи баргардонидани маблағ вогузор шуда бошад, бастани он баррасии инфиродиро талаб мекунад. Тамос: {contact}.',
    'close.goesChildren':
      'Профили кӯдак дар оилае, ки узви фаъоли дигар надорад, метавонад баста шавад. Агар кӯдак воридшавии алоҳида ё корҳои курсие дошта бошад, ки бо сабаби ҳифз нигоҳ дошта шудаанд, бастани ҳисоб аз ҷониби худи шумо то баррасии инфиродӣ боздошта мешавад. Тамос: {contact}. Дигар сабтҳои таълимии кӯдакон, ки ба шартҳо мувофиқанд, аз ҷумла корҳои курсӣ, барои бардоштан пас аз сӣ рӯз ба нақша гирифта мешаванд. Файлҳои захирашуда қадами алоҳидаи несткуниро талаб мекунанд.',
    'close.staysHeading': 'Сабтҳое, ки боқӣ мемонанд',
    'close.staysMoney':
      'Фармоишҳо, пардохтҳо ва маблағҳои баргардонидашуда: дафтаре, ки баргардонидани маблағ ба он такя мекунад',
    'close.staysProgress':
      'Номнависиҳои худи шумо ва пешрафт дар дарсҳо. Сабтҳои кӯдакон, ки ба шартҳо мувофиқанд, барои бардоштан сӣ рӯз пас аз бастани ҳисоб ба нақша гирифта мешаванд.',
    'close.staysCertificates': 'Шаҳодатномаҳо, бо рақаме, ки дода шудаанд',
    'close.staysSupport':
      'Муроҷиатҳо ба дастгирӣ. Матни муроҷиатҳое, ки шумо кушодаед, иваз карда мешавад ва паёмҳои навиштаи шумо, аз ҷумла паёмҳо дар муроҷиатҳои дигарон, бардошта мешаванд. Агар муроҷиат бо сабаби ҳифз боздошта шуда бошад, мӯҳтавои он то бардошта шудани боздошт нигоҳ дошта мешавад ва он метавонад шуморо шиносонад. Платформа мекӯшад номи намоишии шуморо дар ҷавобҳои кормандон ва қайдҳои ҳал иваз кунад, вале дигар номҳо ё шиносаҳо метавонанд боқӣ монанд. Муроҷиат бояд се сол пас аз баста шуданаш нест карда шавад.',
    'close.staysAudit': 'Сабти аудит дар бораи он ки ҳисоб баста шудааст',
    'close.staysFingerprint':
      'Изи рақамии суроғаи воридшавии шумо, на худи суроға, то хадамоти дастгирӣ пас аз нест шудани воридшавӣ низ ба саволи «оё ҳисоби ман пок карда шуд?» ҷавоб дода тавонад',
    'close.staysHolder':
      'Дар шаҳодатнома ба ҷойи номи дорандаи он чунин навишта мешавад: {label}; рақами он ва дигар тафсилоти дар он сабтшуда боқӣ мемонанд. Шаҳодатномаи кӯдак низ пас аз бардошта шудани сабти таълимӣ рақами худро нигоҳ медорад.',
    'close.undoHeading': 'Инро баргардондан мумкин нест',
    'close.undoSessions':
      'Барнома мекӯшад шуморо аз ҳисоб барорад, вале дигар сеансҳо ва воридшавӣ дар назди таъминкунанда метавонанд то алоҳида бекор ё бардошта шуданашон боқӣ монанд. Агар шумо муаллим бошед ва курсе дар баррасӣ ё нашршуда дошта бошед, аввал соҳиби платформа бояд ҳисоби муаллимиро бандад; агар ин ба шумо дахл дошта бошад, ҳамин саҳифа онро мегӯяд.',
    'close.undoSignInLead': 'Бастани ҳисоб воридшавиро нест намекунад.',
    'close.undoSignIn':
      'Он на дар AyahSpring, балки дар назди таъминкунандаи воридшавӣ нигоҳ дошта мешавад, аз ин рӯ агар ҳанӯз вуҷуд дошта бошад, бастани ҳисоб онро барои қадами алоҳидаи бардоштан ба рӯйхати соҳиби платформа мегузорад. Пеш аз сабти бардоштан пойгоҳи додаҳо месанҷад, ки ин шахсият дар ҷадвали аутентификатсияи он нест; ин далел дар бораи ҳамаи нусхаҳои назди таъминкунанда нест.',
    'close.confirmLabel': 'Барои тасдиқ инро нависед: {name}',
    'close.confirmNote':
      'Тугма вақте дастрас мешавад, ки ном айнан мувофиқ ояд. Инро баргардондан мумкин нест ва мӯҳлати аз фикр гаштан вуҷуд надорад.',
    'close.nameless':
      'Ин ҳисоб номе барои навиштан надорад. Аввал дар танзимоти ҳисоб ном илова кунед.',
    'close.button': 'Ҳисоби маро барои ҳамеша бандед',
    'close.closing': 'Баста мешавад…',
    'close.keep': 'Ҳисоби ман бимонад',
    'close.signedOut': 'Шумо аз ҳисоб баромадаед. Барои бастани ин ҳисоб аз нав ворид шавед.',
    'close.noAccount': 'Дар ин ҷо ҳисобе барои бастан нест.',
    'close.nameMissing': 'Барои тасдиқ номи худро нависед.',
    'close.nameMismatch':
      'Ном мувофиқ наомад. Онро айнан ҳамон тавре ки дар боло омадааст, нависед.',
    'close.teaching':
      'Шумо ҳанӯз курсе дар баррасӣ ё нашршуда доред. Аввал аз соҳиби платформа хоҳиш кунед, ки ҳисоби муаллимиро бандад. Ҳеҷ чиз тағйир наёфт.',
    'close.board':
      'Шумо узви шӯрои илмӣ ҳастед. Аввал аз соҳиби платформа хоҳиш кунед, ки шуморо аз он барорад. Ҳеҷ чиз тағйир наёфт.',
    'close.held':
      'Ин ҳисоб ба воридшавии алоҳидаи кӯдак ё ба корҳои курсии нигоҳдошташуда пайваст аст, аз ин рӯ бастани он баррасии инфиродиро талаб мекунад. Ҳеҷ чиз тағйир наёфт. Тамос: {contact}.',
    'close.appointment':
      'Ба ин ҳисоб вазифаи ҳифзи кӯдакон ё тасдиқи баргардонидани маблағ вогузор шудааст, аз ин рӯ бастани он баррасии инфиродиро талаб мекунад. Ҳеҷ чиз тағйир наёфт. Тамос: {contact}.',
    'close.refused':
      'Ин ҳисобро бастан муяссар нашуд ва ҳеҷ чиз тағйир наёфт. Агар ин такрор шавад, тамос: {contact}.',
    'close.unconfirmed':
      'Мо тасдиқ карда натавонистем, ки ҳисоби шумо баста шуд ё не. Пеш аз кӯшиши дубора барои дидан ин саҳифаро аз нав бор кунед ё ба ин суроға нависед: {contact}.',
  },
  ky: {
    'close.title': 'Бул аккаунтту жабуу',
    'close.already': 'Бул аккаунт мурунтан эле жабылган.',
    'close.alreadyNote':
      'Профиль өзгөртүлдү, бирок айрым жазуулар менен файлдар калышы мүмкүн. Кирүү маалыматы кирүү кызматын камсыздоочуда сакталат; эгер ал дагы эле бар болсо, аны алып салуу өзүнчө кадам. Алып салуу тизмесинде турганы анын алынып салынганын далилдебейт.',
    'close.lede':
      'Сиз кирген аккаунт: {who}. Бул аракет аккаунтту жабат, профилиңизди өзгөртөт жана айрым жеке маалыматтарды алып салат. Айрым жазуулар менен сакталган файлдар төмөндө түшүндүрүлгөндөй калат.',
    'close.ledeUnnamed':
      'Бул аракет сиз кирген аккаунтту жабат, профилиңизди өзгөртөт жана айрым жеке маалыматтарды алып салат. Айрым жазуулар менен сакталган файлдар төмөндө түшүндүрүлгөндөй калат.',
    'close.goesHeading': 'Аккаунт жабылганда алынып салынуучу же өзгөртүлүүчү нерселер',
    'close.goesProfile': 'Атыңыз, сүрөтүңүз, убакыт алкагыңыз жана өлкөңүз',
    'close.goesNotes': 'Сабак жазуулары жана кыстармалар',
    'close.goesSaved': 'Сакталган курстар жана аларга жазылган эскертмелер',
    'close.goesReviews':
      'Курстарга жазган пикирлериңиз алынып салынат. Талкуудагы билдирүүлөр тема катары калат, ал эми сиз жазган текст алмаштырылат.',
    'close.goesAnswers':
      'Өзүңүздүн окуучу профилиңиздеги учурдагы жооп тексти тазаланат. Мурунку оңдоолордун сакталган көчүрмөлөрү жана тиркелген файлдар өзүнчө сактоо эрежелери боюнча калышы мүмкүн.',
    'close.goesSharing': 'Иштеп турган бөлүшүү шилтемелери, чакыруулар жана камкорчунун уруксаты',
    'close.goesMessages':
      'Сизге тиешелүү платформа билдирмелери жана жөнөтүлгөн билдирүүлөрдүн жазуулары. Жеткирилип калган электрондук катты кайра чакыртып алуу мүмкүн эмес.',
    'close.goesAppointment':
      'Эгер бул аккаунтка балдарды коргоо же акчаны кайтарууну бекитүү милдети жүктөлгөн болсо, аны жабуу жекече кароону талап кылат. Байланыш: {contact}.',
    'close.goesChildren':
      'Башка активдүү мүчөсү жок үй-бүлөдөгү баланын профили жабылышы мүмкүн. Эгер баланын өзүнчө логини же коргоо себебинен кармалып турган курстук иштери болсо, аккаунтту өз алдыңызча жабуу жекече кароого чейин токтотулат. Байланыш: {contact}. Балдардын шартка туура келген башка окуу жазуулары, анын ичинде курстук иштер, отуз күндөн кийин алып салууга пландалат. Сакталган файлдар өзүнчө өчүрүү кадамын талап кылат.',
    'close.staysHeading': 'Калуучу жазуулар',
    'close.staysMoney':
      'Буйрутмалар, төлөмдөр жана кайтарылган акча: акчаны кайтаруу таянган китепче',
    'close.staysProgress':
      'Өзүңүздүн катталууларыңыз жана сабактардагы илгерилөөңүз. Балдардын шартка туура келген жазуулары аккаунт жабылгандан отуз күн өткөндөн кийин алып салууга пландалат.',
    'close.staysCertificates': 'Сертификаттар, берилген номери менен',
    'close.staysSupport':
      'Колдоо кайрылуулары. Сиз ачкан кайрылуулардын тексти алмаштырылат, ал эми сиз жазган билдирүүлөр, башкалардын кайрылууларындагылар менен кошо, алынып салынат. Эгер кайрылуу коргоо себебинен токтотулуп турса, анын мазмуну токтотуу алынганга чейин сакталат жана ал сизди таанытышы мүмкүн. Платформа кызматкерлердин жоопторундагы жана чечим жазууларындагы көрсөтүлүүчү атыңызды алмаштырууга аракет кылат, бирок башка аттар же идентификаторлор калышы мүмкүн. Кайрылуу жабылгандан үч жыл өткөндөн кийин өчүрүлүшү керек.',
    'close.staysAudit': 'Аккаунттун жабылганы тууралуу аудит жазуусу',
    'close.staysFingerprint':
      'Кирүү дарегиңиздин өзү эмес, санариптик изи; ошондо кирүү маалыматы жок болгондон кийин да колдоо кызматы «аккаунтум өчүрүлдүбү?» деген суроого жооп бере алат',
    'close.staysHolder':
      'Сертификатта ээсинин атынын ордуна мындай жазылат: {label}; анын номери жана анда жазылган башка маалыматтар калат. Баланын сертификаты да окуу жазуусу алынып салынгандан кийин номерин сактайт.',
    'close.undoHeading': 'Муну артка кайтаруу мүмкүн эмес',
    'close.undoSessions':
      'Колдонмо сизди аккаунттан чыгарууга аракет кылат, бирок башка сеанстар жана камсыздоочудагы кирүү маалыматы өзүнчө жокко чыгарылганга же алынып салынганга чейин калышы мүмкүн. Эгер сиз каралып жаткан же жарыяланган курсу бар мугалим болсоңуз, адегенде платформанын ээси мугалим аккаунтун жабышы керек; бул сизге тиешелүү болсо, ушул барак аны айтат.',
    'close.undoSignInLead': 'Аккаунтту жабуу кирүү маалыматын өчүрбөйт.',
    'close.undoSignIn':
      'Ал AyahSpring-де эмес, кирүү кызматын камсыздоочуда сакталат, ошондуктан ал дагы эле бар болсо, аккаунтту жабуу аны өзүнчө алып салуу кадамы үчүн платформанын ээсинин тизмесине коёт. Алып салуу катталардан мурун маалымат базасы ал инсандын өзүнүн аутентификация таблицасында жок экенин текшерет; бул камсыздоочудагы бардык көчүрмөлөр тууралуу далил эмес.',
    'close.confirmLabel': 'Ырастоо үчүн муну жазыңыз: {name}',
    'close.confirmNote':
      'Ат так дал келгенде баскыч жеткиликтүү болот. Муну артка кайтаруу мүмкүн эмес жана ойдон кайтуу мөөнөтү жок.',
    'close.nameless':
      'Бул аккаунтта жаза турган ат жок. Адегенде аккаунт жөндөөлөрүнөн ат кошуңуз.',
    'close.button': 'Аккаунтумду биротоло жабуу',
    'close.closing': 'Жабылууда…',
    'close.keep': 'Аккаунтум калсын',
    'close.signedOut': 'Сиз аккаунттан чыгып кеткенсиз. Бул аккаунтту жабуу үчүн кайра кириңиз.',
    'close.noAccount': 'Бул жерде жаба турган аккаунт жок.',
    'close.nameMissing': 'Ырастоо үчүн атыңызды жазыңыз.',
    'close.nameMismatch': 'Ат дал келген жок. Аны жогоруда көрсөтүлгөндөй так жазыңыз.',
    'close.teaching':
      'Сизде дагы эле каралып жаткан же жарыяланган курс бар. Адегенде платформанын ээсинен мугалим аккаунтун жабууну сураныңыз. Эч нерсе өзгөргөн жок.',
    'close.board':
      'Сиз илимий кеңештин мүчөсүсүз. Адегенде платформанын ээсинен сизди андан чыгарууну сураныңыз. Эч нерсе өзгөргөн жок.',
    'close.held':
      'Бул аккаунт баланын өзүнчө логинине же кармалып турган курстук иштерге байланган, ошондуктан аны жабуу жекече кароону талап кылат. Эч нерсе өзгөргөн жок. Байланыш: {contact}.',
    'close.appointment':
      'Бул аккаунтка балдарды коргоо же акчаны кайтарууну бекитүү милдети жүктөлгөн, ошондуктан аны жабуу жекече кароону талап кылат. Эч нерсе өзгөргөн жок. Байланыш: {contact}.',
    'close.refused':
      'Бул аккаунтту жабуу мүмкүн болгон жок жана эч нерсе өзгөргөн жок. Бул кайталана берсе, байланыш: {contact}.',
    'close.unconfirmed':
      'Аккаунтуңуздун жабылган-жабылбаганын ырастай алган жокпуз. Кайра аракет кылардан мурун көрүү үчүн ушул баракты кайра жүктөңүз же бул дарекке жазыңыз: {contact}.',
  },
  tk: {
    'close.title': 'Bu hasaby ýap',
    'close.already': 'Bu hasap eýýäm ýapylan.',
    'close.alreadyNote':
      'Profil üýtgedildi, ýöne käbir ýazgylar we faýllar galyp biler. Giriş maglumaty giriş hyzmatyny üpjün edijide saklanýar; ol henizem bar bolsa, ony aýyrmak aýratyn ädimdir. Aýyrmak sanawynda durmagy onuň aýrylandygynyň subutnamasy däldir.',
    'close.lede':
      'Siziň giren hasabyňyz: {who}. Bu hereket hasaby ýapýar, profiliňizi üýtgedýär we käbir şahsy maglumatlary aýyrýar. Käbir ýazgylar we saklanan faýllar aşakda düşündirilişi ýaly galýar.',
    'close.ledeUnnamed':
      'Bu hereket siziň giren hasabyňyzy ýapýar, profiliňizi üýtgedýär we käbir şahsy maglumatlary aýyrýar. Käbir ýazgylar we saklanan faýllar aşakda düşündirilişi ýaly galýar.',
    'close.goesHeading': 'Hasap ýapylanda aýrylýan ýa-da üýtgedilýän zatlar',
    'close.goesProfile': 'Adyňyz, suratyňyz, wagt guşaklygyňyz we ýurduňyz',
    'close.goesNotes': 'Sapak bellikleri we hatjoýlar',
    'close.goesSaved': 'Saklanan kurslar we olara ýazylan bellikler',
    'close.goesReviews':
      'Kurslara ýazan synlaryňyz aýrylýar. Çekişme ýazgylary tema hökmünde galýar, siziň ýazan tekstiňiz bolsa çalşyrylýar.',
    'close.goesAnswers':
      'Öz okuwçy profiliňizdäki häzirki jogap teksti arassalanýar. Öňki düzedişleriň saklanan nusgalary we goşulan faýllar aýratyn saklaýyş düzgünlerine laýyklykda galyp biler.',
    'close.goesSharing': 'Hereket edýän paýlaşma baglanyşyklary, çakylyklar we howandaryň rugsady',
    'close.goesMessages':
      'Siz barada platforma bildirişleri we iberilen hatlaryň ýazgylary. Eýýäm gowşurylan e-poçta hatyny yzyna alyp bolmaýar.',
    'close.goesAppointment':
      'Bu hasaba çagalary goramak ýa-da pul gaýtarmagy tassyklamak wezipesi ýüklenen bolsa, ony ýapmak aýratyn seredilmegini talap edýär. Habarlaşmak üçin: {contact}.',
    'close.goesChildren':
      'Başga işjeň agzasy bolmadyk maşgaladaky çaga profili ýapylyp bilner. Çaganyň aýratyn logini ýa-da goramak sebäpli saklanýan kurs işleri bar bolsa, hasaby özbaşdak ýapmak aýratyn seredilýänçä togtadylýar. Habarlaşmak üçin: {contact}. Çagalaryň şertlere laýyk gelýän beýleki okuw ýazgylary, şol sanda kurs işleri, otuz günden soň aýyrmak üçin meýilleşdirilýär. Saklanan faýllar aýratyn pozmak ädimini talap edýär.',
    'close.staysHeading': 'Galýan ýazgylar',
    'close.staysMoney':
      'Sargytlar, tölegler we gaýtarylan pullar: pul gaýtarmagyň daýanýan depderi',
    'close.staysProgress':
      'Öz ýazylyşlaryňyz we sapaklardaky ösüşiňiz. Çagalaryň şertlere laýyk gelýän ýazgylary hasap ýapylandan otuz gün geçenden soň aýyrmak üçin meýilleşdirilýär.',
    'close.staysCertificates': 'Şahadatnamalar, berlen belgisi bilen',
    'close.staysSupport':
      'Goldaw ýüztutmalary. Siziň açan ýüztutmalaryňyzyň teksti çalşyrylýar, siziň ýazan hatlaryňyz bolsa, başgalaryň ýüztutmalaryndakylar bilen bilelikde, aýrylýar. Ýüztutma goramak sebäpli togtadylan bolsa, onuň mazmuny togtatma aýrylýança saklanýar we ol sizi tanadyp biler. Platforma işgärleriň jogaplarynda we çözgüt belliklerinde görkezilýän adyňyzy çalşyrmaga çalyşýar, ýöne beýleki atlar ýa-da kesgitleýjiler galyp biler. Ýüztutma ýapylandan üç ýyl geçenden soň pozulmalydyr.',
    'close.staysAudit': 'Hasabyň ýapylandygy baradaky audit ýazgysy',
    'close.staysFingerprint':
      'Giriş salgyňyzyň özi däl-de, sanly yzy; şeýlelikde giriş maglumaty ýok bolandan soň hem goldaw gullugy “hasabym pozuldymy?” diýen soraga jogap berip biler',
    'close.staysHolder':
      'Şahadatnamada eýesiniň adynyň ýerine şu ýazylýar: {label}; onuň belgisi we onda ýazylan beýleki maglumatlar galýar. Çaganyň şahadatnamasy hem okuw ýazgysy aýrylandan soň belgisini saklaýar.',
    'close.undoHeading': 'Muny yzyna gaýtaryp bolmaýar',
    'close.undoSessions':
      'Programma sizi hasapdan çykarmaga çalyşýar, ýöne beýleki seanslar we üpjün edijidäki giriş maglumaty aýratyn ýatyrylýança ýa-da aýrylýança galyp biler. Siz seredilýän ýa-da çap edilen kursy bolan mugallym bolsaňyz, ilki platformanyň eýesi mugallym hasabyny ýapmalydyr; bu size degişli bolsa, şu sahypa muny aýdar.',
    'close.undoSignInLead': 'Hasaby ýapmak giriş maglumatyny pozmaýar.',
    'close.undoSignIn':
      'Ol AyahSpring-de däl-de, giriş hyzmatyny üpjün edijide saklanýar, şonuň üçin ol henizem bar bolsa, hasaby ýapmak ony aýratyn aýyrmak ädimi üçin platformanyň eýesiniň sanawyna goýýar. Aýyrmak hasaba alynmazdan öň maglumat binýady şol şahsyýetiň öz tassyklaýyş tablisasynda ýokdugyny barlaýar; bu üpjün edijidäki ähli nusgalar barada subutnama däldir.',
    'close.confirmLabel': 'Tassyklamak üçin şuny ýazyň: {name}',
    'close.confirmNote':
      'At doly gabat gelende düwme elýeterli bolýar. Muny yzyna gaýtaryp bolmaýar we pikirden dänmek üçin möhlet ýok.',
    'close.nameless': 'Bu hasapda ýazmaga at ýok. Ilki hasap sazlamalarynda at goşuň.',
    'close.button': 'Hasabymy hemişelik ýap',
    'close.closing': 'Ýapylýar…',
    'close.keep': 'Hasabym galsyn',
    'close.signedOut': 'Siz hasapdan çykypsyňyz. Bu hasaby ýapmak üçin täzeden giriň.',
    'close.noAccount': 'Bu ýerde ýapmaga hasap ýok.',
    'close.nameMissing': 'Tassyklamak üçin adyňyzy ýazyň.',
    'close.nameMismatch': 'At gabat gelmedi. Ony ýokarda görkezilişi ýaly, doly dogry ýazyň.',
    'close.teaching':
      'Sizde henizem seredilýän ýa-da çap edilen kurs bar. Ilki platformanyň eýesinden mugallym hasabyny ýapmagyny haýyş ediň. Hiç zat üýtgemedi.',
    'close.board':
      'Siz ylmy geňeşiň agzasy. Ilki platformanyň eýesinden sizi ondan çykarmagyny haýyş ediň. Hiç zat üýtgemedi.',
    'close.held':
      'Bu hasap çaganyň aýratyn loginine ýa-da saklanýan kurs işlerine bagly, şonuň üçin ony ýapmak aýratyn seredilmegini talap edýär. Hiç zat üýtgemedi. Habarlaşmak üçin: {contact}.',
    'close.appointment':
      'Bu hasaba çagalary goramak ýa-da pul gaýtarmagy tassyklamak wezipesi ýüklenen, şonuň üçin ony ýapmak aýratyn seredilmegini talap edýär. Hiç zat üýtgemedi. Habarlaşmak üçin: {contact}.',
    'close.refused':
      'Bu hasaby ýapyp bolmady we hiç zat üýtgemedi. Bu gaýtalansa, habarlaşmak üçin: {contact}.',
    'close.unconfirmed':
      'Hasabyňyzyň ýapylandygyny ýa-da ýapylmandygyny tassyklap bilmedik. Täzeden synanyşmazdan öň görmek üçin şu sahypany täzeden ýükläň ýa-da şu salga ýazyň: {contact}.',
  },
  ta: {
    'close.title': 'இந்தக் கணக்கை மூடு',
    'close.already': 'இந்தக் கணக்கு ஏற்கெனவே மூடப்பட்டுள்ளது.',
    'close.alreadyNote':
      'சுயவிவரம் மாற்றப்பட்டுள்ளது, ஆனால் சில பதிவுகளும் கோப்புகளும் எஞ்சியிருக்கலாம். உள்நுழைவுத் தகவல் உள்நுழைவு வழங்குநரிடம் உள்ளது; அது இன்னும் இருந்தால், அதை நீக்குவது தனியான படி. நீக்கப்பட வேண்டியவற்றின் பட்டியலில் இருப்பது அது நீக்கப்பட்டதற்கான சான்று அல்ல.',
    'close.lede':
      'நீங்கள் உள்நுழைந்துள்ள கணக்கு: {who}. இந்தச் செயல் கணக்கை மூடுகிறது, உங்கள் சுயவிவரத்தை மாற்றுகிறது, சில தனிப்பட்ட தகவல்களை நீக்குகிறது. கீழே விளக்கியுள்ளபடி, சில பதிவுகளும் சேமிக்கப்பட்ட கோப்புகளும் எஞ்சியிருக்கும்.',
    'close.ledeUnnamed':
      'இந்தச் செயல் நீங்கள் உள்நுழைந்துள்ள கணக்கை மூடுகிறது, உங்கள் சுயவிவரத்தை மாற்றுகிறது, சில தனிப்பட்ட தகவல்களை நீக்குகிறது. கீழே விளக்கியுள்ளபடி, சில பதிவுகளும் சேமிக்கப்பட்ட கோப்புகளும் எஞ்சியிருக்கும்.',
    'close.goesHeading': 'கணக்கு மூடப்படும்போது நீக்கப்படுபவை அல்லது மாற்றப்படுபவை',
    'close.goesProfile': 'உங்கள் பெயர், படம், நேர மண்டலம், நாடு',
    'close.goesNotes': 'பாடக் குறிப்புகளும் புக்மார்க்குகளும்',
    'close.goesSaved': 'சேமித்த பாடநெறிகளும் அவற்றின் மீதான குறிப்புகளும்',
    'close.goesReviews':
      'பாடநெறிகள் பற்றிய உங்கள் மதிப்புரைகள் நீக்கப்படும். விவாதப் பதிவுகள் இழைகளாகவே இருக்கும்; நீங்கள் எழுதியது மாற்றப்படும்.',
    'close.goesAnswers':
      'உங்கள் சொந்தக் கற்பவர் சுயவிவரத்தில் உள்ள தற்போதைய பதில் உரை அழிக்கப்படும். முந்தைய திருத்தங்களின் சேமிக்கப்பட்ட நகல்களும் இணைக்கப்பட்ட கோப்புகளும் தனியான தக்கவைப்பு விதிகளின் கீழ் எஞ்சியிருக்கலாம்.',
    'close.goesSharing': 'செயலில் உள்ள பகிர்வு இணைப்புகள், அழைப்புகள், பாதுகாவலர் அணுகல்',
    'close.goesMessages':
      'உங்களைப் பற்றிய தள அறிவிப்புகளும் அனுப்பப்பட்ட செய்திகளின் பதிவுகளும். ஏற்கெனவே சென்று சேர்ந்த மின்னஞ்சலைத் திரும்பப் பெற முடியாது.',
    'close.goesAppointment':
      'இந்தக் கணக்கிற்குக் குழந்தைப் பாதுகாப்பு அல்லது பணத்திருப்பு ஒப்புதல் பொறுப்பு வழங்கப்பட்டிருந்தால், இதை மூடத் தனிப்பட்ட பரிசீலனை தேவை. தொடர்புக்கு: {contact}.',
    'close.goesChildren':
      'வேறு செயலில் உள்ள உறுப்பினர் இல்லாத குடும்பத்தில் உள்ள குழந்தையின் சுயவிவரம் மூடப்படலாம். குழந்தைக்குத் தனி உள்நுழைவு இருந்தால், அல்லது பாதுகாப்புக் காரணமாக அதன் பாடப்பணி நிறுத்தி வைக்கப்பட்டிருந்தால், நீங்களே கணக்கை மூடுவது தனிப்பட்ட பரிசீலனை வரை இடைநிறுத்தப்படும். தொடர்புக்கு: {contact}. தகுதியுள்ள பிற குழந்தைக் கற்றல் பதிவுகள், பாடப்பணி உட்பட, முப்பது நாட்களுக்குப் பிறகு நீக்கப்படத் திட்டமிடப்படும். சேமிக்கப்பட்ட கோப்புகளை அழிக்கத் தனியான படி தேவை.',
    'close.staysHeading': 'எஞ்சியிருக்கும் பதிவுகள்',
    'close.staysMoney':
      'ஆர்டர்கள், கட்டணங்கள், பணத்திருப்புகள்: பணத்திருப்பு சார்ந்திருக்கும் பேரேடு',
    'close.staysProgress':
      'உங்கள் சொந்தப் பதிவுகளும் பாட முன்னேற்றமும். தகுதியுள்ள குழந்தைப் பதிவுகள் கணக்கு மூடப்பட்ட முப்பது நாட்களுக்குப் பிறகு நீக்கப்படத் திட்டமிடப்படும்.',
    'close.staysCertificates': 'சான்றிதழ்கள், அவை வழங்கப்பட்ட எண்ணுடன்',
    'close.staysSupport':
      'உதவிக் கோரிக்கைகள். நீங்கள் திறந்த கோரிக்கைகளின் உரை மாற்றப்படும்; நீங்கள் எழுதிய செய்திகள், பிறரின் கோரிக்கைகளில் உள்ளவை உட்பட, நீக்கப்படும். ஒரு கோரிக்கை பாதுகாப்புக் காரணமாக இடைநிறுத்தப்பட்டிருந்தால், இடைநிறுத்தம் நீக்கப்படும் வரை அதன் உள்ளடக்கம் வைக்கப்படும்; அது உங்களை அடையாளம் காட்டக்கூடும். பணியாளர் பதில்களிலும் தீர்வுக் குறிப்புகளிலும் உங்கள் காட்சிப் பெயரை மாற்றத் தளம் முயல்கிறது; ஆனால் பிற பெயர்களோ அடையாளங்காட்டிகளோ எஞ்சியிருக்கலாம். ஒரு கோரிக்கை மூடப்பட்ட மூன்று ஆண்டுகளுக்குப் பிறகு அழிக்கப்பட வேண்டும்.',
    'close.staysAudit': 'கணக்கு மூடப்பட்டது என்பதற்கான தணிக்கைப் பதிவு',
    'close.staysFingerprint':
      'உங்கள் உள்நுழைவு முகவரியின் டிஜிட்டல் கைரேகை, முகவரியே அல்ல; உள்நுழைவு இல்லாமல் போன பிறகும் “என் கணக்கு அழிக்கப்பட்டதா?” என்ற கேள்விக்கு உதவிக் குழு பதிலளிக்க இது உதவும்',
    'close.staysHolder':
      'சான்றிதழில் உரியவரின் பெயருக்குப் பதிலாக இது எழுதப்படும்: {label}; அதன் எண்ணும் அதில் பதிவான பிற விவரங்களும் எஞ்சியிருக்கும். கற்றல் பதிவு நீக்கப்பட்ட பிறகும் குழந்தையின் சான்றிதழ் அதன் எண்ணை வைத்திருக்கும்.',
    'close.undoHeading': 'இதைத் திரும்பப் பெற முடியாது',
    'close.undoSessions':
      'செயலி உங்களை வெளியேற்ற முயல்கிறது; ஆனால் பிற அமர்வுகளும் வழங்குநரிடம் உள்ள உள்நுழைவும் தனியாக ரத்து செய்யப்படும் வரை அல்லது நீக்கப்படும் வரை எஞ்சியிருக்கலாம். நீங்கள் மதிப்பாய்வில் உள்ள அல்லது வெளியிடப்பட்ட பாடநெறியைக் கொண்ட ஆசிரியராக இருந்தால், தளத்தின் உரிமையாளர் முதலில் ஆசிரியர் கணக்கை மூட வேண்டும்; அது உங்களுக்குப் பொருந்தினால் இந்தப் பக்கம் அதைச் சொல்லும்.',
    'close.undoSignInLead': 'கணக்கை மூடுவது உள்நுழைவை அழிக்காது.',
    'close.undoSignIn':
      'அது AyahSpring இடம் அல்ல, உள்நுழைவு வழங்குநரிடம் உள்ளது; எனவே அது இன்னும் இருந்தால், கணக்கை மூடுவது அதைத் தனியான நீக்கப் படிக்காகத் தளத்தின் உரிமையாளரின் பட்டியலில் சேர்க்கும். நீக்கம் பதிவு செய்யப்படுவதற்கு முன், அந்த அடையாளம் தன் அங்கீகார அட்டவணையில் இல்லை என்பதைத் தரவுத்தளம் சரிபார்க்கும்; இது வழங்குநரிடம் உள்ள எல்லா நகல்களையும் பற்றிய சான்று அல்ல.',
    'close.confirmLabel': 'உறுதிப்படுத்த இதைத் தட்டச்சிடுங்கள்: {name}',
    'close.confirmNote':
      'பெயர் சரியாகப் பொருந்தும்போது பொத்தான் கிடைக்கும். இதைத் திரும்பப் பெற முடியாது; மனம் மாற்றிக்கொள்ள அவகாசம் எதுவும் இல்லை.',
    'close.nameless':
      'இந்தக் கணக்கில் தட்டச்சிடப் பெயர் இல்லை. முதலில் கணக்கு அமைப்புகளில் ஒரு பெயரைச் சேர்க்கவும்.',
    'close.button': 'என் கணக்கை நிரந்தரமாக மூடு',
    'close.closing': 'மூடப்படுகிறது…',
    'close.keep': 'என் கணக்கை வைத்திரு',
    'close.signedOut': 'நீங்கள் வெளியேறியுள்ளீர்கள். இந்தக் கணக்கை மூட மீண்டும் உள்நுழையவும்.',
    'close.noAccount': 'இங்கே மூடுவதற்குக் கணக்கு எதுவும் இல்லை.',
    'close.nameMissing': 'உறுதிப்படுத்த உங்கள் பெயரைத் தட்டச்சிடுங்கள்.',
    'close.nameMismatch': 'பெயர் பொருந்தவில்லை. மேலே காட்டியுள்ளபடியே சரியாகத் தட்டச்சிடுங்கள்.',
    'close.teaching':
      'மதிப்பாய்வில் உள்ள அல்லது வெளியிடப்பட்ட பாடநெறி உங்களிடம் இன்னும் உள்ளது. முதலில் ஆசிரியர் கணக்கை மூடுமாறு தளத்தின் உரிமையாளரிடம் கேளுங்கள். எதுவும் மாற்றப்படவில்லை.',
    'close.board':
      'நீங்கள் ஓர் அறிஞர் குழுவின் உறுப்பினர். முதலில் உங்களை அதிலிருந்து நீக்குமாறு தளத்தின் உரிமையாளரிடம் கேளுங்கள். எதுவும் மாற்றப்படவில்லை.',
    'close.held':
      'இந்தக் கணக்கு ஒரு குழந்தையின் தனி உள்நுழைவுடன், அல்லது நிறுத்தி வைக்கப்பட்ட பாடப்பணியுடன் இணைக்கப்பட்டுள்ளது; எனவே இதை மூடத் தனிப்பட்ட பரிசீலனை தேவை. எதுவும் மாற்றப்படவில்லை. தொடர்புக்கு: {contact}.',
    'close.appointment':
      'இந்தக் கணக்கிற்குக் குழந்தைப் பாதுகாப்பு அல்லது பணத்திருப்பு ஒப்புதல் பொறுப்பு வழங்கப்பட்டுள்ளது; எனவே இதை மூடத் தனிப்பட்ட பரிசீலனை தேவை. எதுவும் மாற்றப்படவில்லை. தொடர்புக்கு: {contact}.',
    'close.refused':
      'இந்தக் கணக்கை மூட முடியவில்லை; எதுவும் மாற்றப்படவில்லை. இது தொடர்ந்தால், தொடர்புக்கு: {contact}.',
    'close.unconfirmed':
      'உங்கள் கணக்கு மூடப்பட்டதா என்பதை எங்களால் உறுதிப்படுத்த முடியவில்லை. மீண்டும் முயல்வதற்கு முன், பார்க்க இந்தப் பக்கத்தை மீண்டும் ஏற்றவும், அல்லது இந்த முகவரிக்கு எழுதவும்: {contact}.',
  },
  ne: {
    'close.title': 'यो खाता बन्द गर्नुहोस्',
    'close.already': 'यो खाता पहिले नै बन्द भइसकेको छ।',
    'close.alreadyNote':
      'प्रोफाइल परिवर्तन गरिएको छ, तर केही अभिलेख र फाइलहरू बाँकी रहन सक्छन्। साइन-इनको जानकारी साइन-इन प्रदायकसँग रहन्छ; त्यो अझै छ भने त्यसलाई हटाउनु छुट्टै चरण हो। हटाउने सूचीमा हुनु त्यो हटाइएको प्रमाण होइन।',
    'close.lede':
      'तपाईं यो खाताबाट साइन इन हुनुहुन्छ: {who}। यो कार्यले खाता बन्द गर्छ, तपाईंको प्रोफाइल परिवर्तन गर्छ र केही व्यक्तिगत जानकारी हटाउँछ। तल बताइएअनुसार केही अभिलेख र भण्डारण गरिएका फाइलहरू बाँकी रहन्छन्।',
    'close.ledeUnnamed':
      'यो कार्यले तपाईं साइन इन भएको खाता बन्द गर्छ, तपाईंको प्रोफाइल परिवर्तन गर्छ र केही व्यक्तिगत जानकारी हटाउँछ। तल बताइएअनुसार केही अभिलेख र भण्डारण गरिएका फाइलहरू बाँकी रहन्छन्।',
    'close.goesHeading': 'खाता बन्द हुँदा हटाइने वा परिवर्तन गरिने कुरा',
    'close.goesProfile': 'तपाईंको नाम, तस्बिर, समय क्षेत्र र देश',
    'close.goesNotes': 'पाठका टिपोट र बुकमार्कहरू',
    'close.goesSaved': 'सुरक्षित गरिएका कोर्स र तिनमा लेखिएका टिपोट',
    'close.goesReviews':
      'कोर्सबारे तपाईंका समीक्षाहरू हटाइन्छन्। छलफलका पोस्टहरू थ्रेडका रूपमा रहन्छन्, तर तपाईंले लेखेको कुरा बदलिन्छ।',
    'close.goesAnswers':
      'तपाईंको आफ्नै सिकारु प्रोफाइलमा रहेको हालको उत्तरको पाठ मेटिन्छ। अघिल्ला संशोधनका सुरक्षित प्रतिहरू र संलग्न फाइलहरू छुट्टै अवधारण नियमअन्तर्गत बाँकी रहन सक्छन्।',
    'close.goesSharing': 'चालु साझेदारी लिङ्क, निमन्त्रणा र अभिभावकको पहुँच',
    'close.goesMessages':
      'तपाईंसँग सम्बन्धित प्लेटफर्मका सूचना र पठाइएका सन्देशका अभिलेख। पुगिसकेको इमेल फिर्ता लिन सकिँदैन।',
    'close.goesAppointment':
      'यो खातासँग बाल संरक्षण वा रकम फिर्ता स्वीकृतिको जिम्मेवारी छ भने यसलाई बन्द गर्न छुट्टै समीक्षा चाहिन्छ। सम्पर्क: {contact}।',
    'close.goesChildren':
      'अर्को सक्रिय सदस्य नभएको परिवारमा रहेको बालबालिकाको प्रोफाइल बन्द हुन सक्छ। बालबालिकाको छुट्टै लगइन छ भने, वा संरक्षणका कारण उसको कोर्सवर्क रोकिएको छ भने, आफैँले खाता बन्द गर्ने काम छुट्टै समीक्षा नहुन्जेल रोकिन्छ। सम्पर्क: {contact}। बालबालिकाका अन्य योग्य सिकाइ अभिलेख, कोर्सवर्कसहित, तीस दिनपछि हटाउन तालिकाबद्ध गरिन्छन्। भण्डारण गरिएका फाइल मेट्न छुट्टै चरण चाहिन्छ।',
    'close.staysHeading': 'बाँकी रहने अभिलेख',
    'close.staysMoney': 'अर्डर, भुक्तानी र रकम फिर्ता: रकम फिर्ता जुन खाताबहीमा निर्भर हुन्छ',
    'close.staysProgress':
      'तपाईंका आफ्नै भर्ना र पाठको प्रगति। बालबालिकाका योग्य अभिलेख खाता बन्द भएको तीस दिनपछि हटाउन तालिकाबद्ध गरिन्छन्।',
    'close.staysCertificates': 'प्रमाणपत्रहरू, जुन नम्बरमा जारी भएका थिए त्यही नम्बरसहित',
    'close.staysSupport':
      'सहायताका केसहरू। तपाईंले खोलेका केसको पाठ बदलिन्छ, र तपाईंले लेखेका सन्देशहरू हटाइन्छन्, अरूका केसमा लेखिएका सन्देशसहित। कुनै केस संरक्षणका कारण रोकिएको छ भने रोक नहटेसम्म त्यसको सामग्री राखिन्छ, र त्यसले तपाईंलाई चिनाउन सक्छ। प्लेटफर्मले कर्मचारीका जवाफ र समाधानका टिपोटमा तपाईंको देखिने नाम बदल्ने प्रयास गर्छ, तर अन्य नाम वा पहिचानकर्ता बाँकी रहन सक्छन्। केस बन्द भएको तीन वर्षपछि मेटिनुपर्छ।',
    'close.staysAudit': 'खाता बन्द गरिएको भन्ने लेखापरीक्षण अभिलेख',
    'close.staysFingerprint':
      'तपाईंको साइन-इन ठेगानाको डिजिटल छाप, ठेगाना आफैँ होइन, ताकि साइन-इन हटिसकेपछि पनि सहायता टोलीले “के मेरो खाता मेटियो?” भन्ने प्रश्नको जवाफ दिन सकोस्',
    'close.staysHolder':
      'प्रमाणपत्रमा धारकको नामको सट्टा यो लेखिन्छ: {label}; यसको नम्बर र यसमा अभिलेख गरिएका अन्य विवरण बाँकी रहन्छन्। सिकाइ अभिलेख हटाइएपछि पनि बालबालिकाको प्रमाणपत्रले आफ्नो नम्बर राख्छ।',
    'close.undoHeading': 'यो फिर्ता गर्न सकिँदैन',
    'close.undoSessions':
      'एपले तपाईंलाई साइन आउट गर्ने प्रयास गर्छ, तर अन्य सत्र र प्रदायकसँग रहेको साइन-इन छुट्टै रद्द वा हटाइएसम्म बाँकी रहन सक्छन्। तपाईं समीक्षामा रहेको वा प्रकाशित कोर्स भएको शिक्षक हुनुहुन्छ भने पहिले प्लेटफर्मका मालिकले शिक्षण खाता बन्द गर्नुपर्छ; यो तपाईंमा लागू हुन्छ भने यही पृष्ठले बताउनेछ।',
    'close.undoSignInLead': 'खाता बन्द गर्दा साइन-इन मेटिँदैन।',
    'close.undoSignIn':
      'त्यो AyahSpring सँग होइन, साइन-इन प्रदायकसँग रहन्छ; त्यसैले त्यो अझै छ भने खाता बन्द गर्दा त्यसलाई छुट्टै हटाउने चरणका लागि प्लेटफर्मका मालिकको सूचीमा राखिन्छ। हटाइएको अभिलेख गर्नुअघि डेटाबेसले त्यो पहिचान आफ्नो प्रमाणीकरण तालिकामा छैन भनी जाँच्छ; यो प्रदायकसँग भएका सबै प्रतिबारे प्रमाण होइन।',
    'close.confirmLabel': 'पुष्टि गर्न यो लेख्नुहोस्: {name}',
    'close.confirmNote':
      'नाम ठ्याक्कै मिलेपछि बटन उपलब्ध हुन्छ। यो फिर्ता गर्न सकिँदैन, र मन बदल्ने कुनै अवधि छैन।',
    'close.nameless': 'यो खातामा लेख्नका लागि कुनै नाम छैन। पहिले खाता सेटिङमा नाम थप्नुहोस्।',
    'close.button': 'मेरो खाता सधैँका लागि बन्द गर्नुहोस्',
    'close.closing': 'बन्द गरिँदै छ…',
    'close.keep': 'मेरो खाता राख्नुहोस्',
    'close.signedOut': 'तपाईं साइन आउट हुनुभएको छ। यो खाता बन्द गर्न फेरि साइन इन गर्नुहोस्।',
    'close.noAccount': 'यहाँ बन्द गर्नका लागि कुनै खाता छैन।',
    'close.nameMissing': 'पुष्टि गर्न आफ्नो नाम लेख्नुहोस्।',
    'close.nameMismatch': 'नाम मिलेन। माथि देखाइएजस्तै ठ्याक्कै लेख्नुहोस्।',
    'close.teaching':
      'तपाईंको एउटा कोर्स अझै समीक्षामा छ वा प्रकाशित छ। पहिले प्लेटफर्मका मालिकलाई शिक्षण खाता बन्द गर्न भन्नुहोस्। केही पनि परिवर्तन भएन।',
    'close.board':
      'तपाईं एउटा विद्वत् बोर्डको सदस्य हुनुहुन्छ। पहिले प्लेटफर्मका मालिकलाई तपाईंलाई त्यसबाट हटाउन भन्नुहोस्। केही पनि परिवर्तन भएन।',
    'close.held':
      'यो खाता बालबालिकाको छुट्टै लगइनसँग, वा रोकिएको कोर्सवर्कसँग जोडिएको छ, त्यसैले यसलाई बन्द गर्न छुट्टै समीक्षा चाहिन्छ। केही पनि परिवर्तन भएन। सम्पर्क: {contact}।',
    'close.appointment':
      'यो खातासँग बाल संरक्षण वा रकम फिर्ता स्वीकृतिको जिम्मेवारी छ, त्यसैले यसलाई बन्द गर्न छुट्टै समीक्षा चाहिन्छ। केही पनि परिवर्तन भएन। सम्पर्क: {contact}।',
    'close.refused':
      'यो खाता बन्द गर्न सकिएन, र केही पनि परिवर्तन भएन। यस्तो भइरह्यो भने सम्पर्क: {contact}।',
    'close.unconfirmed':
      'तपाईंको खाता बन्द भयो कि भएन भनी हामीले पुष्टि गर्न सकेनौँ। फेरि प्रयास गर्नुअघि हेर्नका लागि यो पृष्ठ फेरि लोड गर्नुहोस्, वा सम्पर्क गर्नुहोस्: {contact}।',
  },
};
