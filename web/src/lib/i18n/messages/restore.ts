import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Putting a copy of your data back (`app/account/restore/page.tsx`) and the
 * words its form says while a file is checked and put back.
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts` and `reading.ts`: written for the twenty-seven
 * languages with nothing held in `held.ts`, and for no other. See
 * `UNWRITTEN_WHILE_HELD`.
 *
 * **The verb is "put back", and only for what is put back.** A file brings
 * back what the reader wrote (profile, notes, bookmarks) and nothing the
 * platform wrote about them. No language below says "restore your account"
 * or "everything": a translation that did would promise enrolments and
 * certificates the function refuses to write. No speaker has checked any of
 * it.
 *
 * **Every reason is the page's own sentence.** `restore_my_data()` answers in
 * English: why it refused a file, why it left an entry in it, and the nine
 * things it never puts back. None of that is shown. The refusals and reasons
 * are named in `lib/restore-outcome.ts` and said here (`restore.err*`,
 * `restore.why*`); the nine are said as seven (`restore.cannot*`), and a
 * test reads the migration to see that none of the nine is left unsaid.
 *
 * **What is put in comes after a colon** so that no language has to inflect
 * it: a count in the reader's own digits (`{count}`, `{read}`, `{held}`),
 * the names of profile fields joined by `Intl.ListFormat` (`{fields}`), what
 * the reader's own file held (`{value}`), and how the name of the file
 * begins (`{name}`). A lesson's name is never inside a sentence: it heads
 * the line the sentence is under.
 *
 * **Served to the server only.** `restore.` is in `SERVER_ONLY_PREFIXES`:
 * the page is drawn on the server and hands the form its words.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const RESTORE: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'restore.title': 'أعِد بياناتك',
    'restore.crumb': 'الاستعادة',
    'restore.lede':
      'إذا نزّلت نسخة من بياناتك وتريد إعادتها، إلى هذا الحساب بعد انقطاع أو إلى حساب جديد، فهذه الصفحة تقرأ ذلك الملف وتعيد منه الجزء الذي كتبته أنت.',
    'restore.canHeading': 'ما الذي يمكن أن يعود',
    'restore.canProfile': 'ملفك الشخصي',
    'restore.canProfileNote':
      'الاسم واللغة والمنطقة الزمنية والبلد. فقط حيث يختلف الملف عمّا هو موجود هنا الآن، وفقط القيم التي تستطيع هذه المنصة حفظها.',
    'restore.canNotes': 'ملاحظاتك وإشاراتك المرجعية',
    'restore.canNotesNote':
      'تُعاد إلى الدروس التي كُتبت عليها، لكن فقط في الدورات التي أنت مسجّل فيها الآن. الملاحظة تتبع تسجيلًا في دورة، فالدورة التي غادرتها لا مكان فيها لوضعها.',
    'restore.cannotHeading': 'ما الذي لا يمكن، ولماذا',
    'restore.cannotEnrol': 'التسجيلات في الدورات',
    'restore.cannotEnrolNote':
      'التسجيل في دورة استحقاق، وقد يكون مدفوعًا. والملف الذي يستطيع منحه ملف يوزّع الدورات مجانًا. سجّل من جديد ثم استخدم الملف مرة ثانية: ستجد ملاحظاتك دروسها.',
    'restore.cannotCert': 'الشهادات',
    'restore.cannotCertNote':
      'الشهادة تصدرها المنصة. والشهادة المكتوبة من ملف تزوير يجتاز التحقق. الأرقام التي في ملفك ما زالت صحيحة، والتحقق من الشهادات ما زال يؤكدها.',
    'restore.cannotMoney': 'الطلبات والمبالغ المستردة والتقدّم',
    'restore.cannotMoneyNote':
      'هذه سجلات لما حدث هنا تحتفظ بها المنصة. وإعادة أحدها من ملف ادّعاء لا نسخة. إيصالاتك تبقى في الملف لسجلاتك الخاصة.',
    'restore.cannotPublished': 'ما نشرته وما قُيّمت عليه',
    'restore.cannotPublishedNote':
      'التقييمات ومشاركات النقاش وتسليمات الواجبات نُشر كلٌّ منها هنا، وأُشرف عليه حيث لزم. ونشرها من جديد من ملف ينشر كلامًا لم يقرأه أحد مرة أخرى.',
    'restore.cannotPeople': 'الأطفال والأدوار والصلاحيات',
    'restore.cannotPeopleNote':
      'ملف الطفل يسجّل من هو وليّ أمره، ودور الموظف يمنحه شخص ولا يُحمل في ملف. وكلاهما يُضاف عبر الشاشات التي تسجّل من قام بذلك.',
    'restore.cannotHistory': 'سجل نشاطك',
    'restore.cannotHistoryNote':
      'هو سجل لما حدث هنا ولا يمكن إلا الإضافة إليه. والسجل المجلوب من ملف سجل مختلَق.',
    'restore.cannotSignIn': 'عنوان تسجيل الدخول وكلمة المرور',
    'restore.cannotSignInNote':
      'كلاهما محفوظ لدى خدمة تسجيل الدخول، بمعزل عن هذا السجل. سجّل الدخول بالعنوان الذي تريد استخدامه؛ فالملف لا يستطيع تعيينه.',
    'restore.foot':
      'لا يُكتب شيء حتى ترى ما الذي سيُكتب. وإعادة ملف تُسجَّل في سجل التدقيق مع ما أعادته.',
    'restore.fileLabel': 'ملف JSON الذي نزّلته صفحة التصدير',
    'restore.fileHint':
      'جدول البيانات والنسخة القابلة للطباعة للقراءة؛ وهذه الصفحة تحتاج إلى ملف JSON. يبدأ اسمه بـ: {name}',
    'restore.check': 'افحص هذا الملف',
    'restore.checking': 'جارٍ الفحص…',
    'restore.another': 'اختر ملفًا آخر',
    'restore.apply': 'أعِد ما يمكن إعادته',
    'restore.applying': 'جارٍ الإعادة…',
    'restore.different': 'أعِد ملفًا مختلفًا',
    'restore.errLarge':
      'هذا الملف أكبر مما يمكن أن تكون عليه نسخة من بياناتك. اختر ملف JSON الذي نزّلته صفحة التصدير.',
    'restore.errNotJson':
      'هذا الملف فارغ أو ليس JSON. اختر ملف JSON الذي نزّلته صفحة التصدير؛ فجدول البيانات والنسخة القابلة للطباعة لا يمكن إعادتهما.',
    'restore.errNotExport':
      'هذا الملف يحتوي على JSON، لكنه ليس نسخة من بياناتك أنشأتها هذه المنصة.',
    'restore.errNewer':
      'هذه النسخة أنشأها إصدار من المنصة أحدث مما يقرؤه هذا الإصدار، فلا يمكن إعادتها هنا.',
    'restore.errSignedOut':
      'لقد سُجّل خروجك. سجّل الدخول من جديد ثم اختر الملف مرة أخرى. لم يتغيّر شيء.',
    'restore.errCheckFailed': 'تعذّر فحص الملف، ولم يتغيّر شيء. تحقّق من اتصالك وحاول مرة أخرى.',
    'restore.errRefused': 'رفضت المنصة هذا الملف. لم يتغيّر شيء.',
    'restore.unconfirmed':
      'لم نتمكن من التأكد مما إذا كان الملف قد أُعيد. افحص الملف مرة أخرى: المُدخل الموجود هنا من قبل يُتخطّى، فلا يُكتب شيء مرتين.',
    'restore.resultCheck': 'ما الذي سيعيده هذا الملف',
    'restore.resultApplied': 'ما الذي أعاده هذا الملف',
    'restore.resultNothing': 'لا شيء في هذا الملف يمكن إعادته في الوضع الحالي.',
    'restore.resultAllHere': 'ما يستطيع هذا الملف إعادته موجود هنا من قبل.',
    'restore.lineNotes': 'الملاحظات: {count}',
    'restore.lineMarks': 'الإشارات المرجعية: {count}',
    'restore.lineProfile': 'تفاصيل الملف الشخصي: {fields}',
    'restore.lineHere': 'موجود هنا من قبل وتُرك كما هو: {count}',
    'restore.skippedHeading': 'ما تُرك في الملف، ولماذا',
    'restore.nothingWritten': 'لم يُكتب شيء بعد. فحص الملف لا يغيّر شيئًا.',
    'restore.afterApplied':
      'ملفك لم يتغيّر، فيمكن استخدامه مرة أخرى: المُدخل الموجود هنا من قبل يُتخطّى ولا يُكتب مرتين. وما لا يعيده أي ملف أبدًا مذكور في أسفل هذه الصفحة.',
    'restore.fieldCountry': 'البلد',
    'restore.whereEntry': 'مُدخل محفوظ',
    'restore.whyNameBlank': 'الاسم في الملف فارغ، ولا يمكن أن يكون اسم الملف الشخصي فارغًا.',
    'restore.whyNameLong':
      'الاسم في الملف طويل جدًا. أقصى عدد من الأحرف يمكن أن يكون للاسم: {count}',
    'restore.whyLanguage':
      'اللغة في الملف ليست مكتوبة بصيغة يستطيع الملف الشخصي حفظها. في الملف: {value}',
    'restore.whyTimezone': 'المنطقة الزمنية في الملف ليست مما تعرفه هذه المنصة. في الملف: {value}',
    'restore.whyCountry': 'البلد في الملف ليس رمز بلد من حرفين. في الملف: {value}',
    'restore.whyNotList': 'جزء من هذا الملف ليس قائمة، فتعذّرت قراءته.',
    'restore.whyCapped':
      'هذه القائمة أطول مما يُقرأ في المرة الواحدة، فلا يُقرأ إلا أولها. المُدخلات المقروءة: {read}. المُدخلات في الملف: {held}',
    'restore.whyOff':
      'الملاحظات والإشارات المرجعية متوقفة في هذه المنصة، فلا مكان لوضعها. وهي ما زالت في ملفك.',
    'restore.whyNoteEmpty': 'هذه الملاحظة بلا نص.',
    'restore.whyNoteLong':
      'هذه الملاحظة طويلة جدًا. أقصى عدد من الأحرف يمكن أن يكون للملاحظة: {count}',
    'restore.whyNoLesson': 'هذا المُدخل لا يذكر درسًا، فلا شيء يُلحق به.',
    'restore.whyNotEnrolled': 'لست مسجّلًا الآن في دورة فيها درس بهذا الاسم.',
    'restore.whyAmbiguous':
      'أكثر من دورة من دوراتك فيها درس بهذا الاسم، والملف لا يستطيع تحديد أيّها.',
    'restore.whyDiffers': 'كتبتَ منذ ذلك الحين ملاحظة مختلفة على هذا الدرس، ولم تُستبدل.',
    'restore.whyNoAccess': 'يلزم تسجيل نشط في هذه الدورة وإمكانية الوصول إلى هذا الدرس.',
    'restore.whyOther': 'تعذّرت إعادة هذا المُدخل.',
  },
  ur: {
    'restore.title': 'اپنا ڈیٹا واپس رکھیں',
    'restore.crumb': 'بحالی',
    'restore.lede':
      'اگر آپ نے اپنے ڈیٹا کی نقل ڈاؤن لوڈ کی تھی اور اسے واپس چاہتے ہیں، وقفے کے بعد اسی اکاؤنٹ پر یا کسی نئے اکاؤنٹ پر، تو یہ صفحہ اس فائل کو پڑھتا ہے اور اس کا وہ حصہ واپس رکھتا ہے جو آپ نے خود لکھا تھا۔',
    'restore.canHeading': 'کیا واپس آ سکتا ہے',
    'restore.canProfile': 'آپ کا پروفائل',
    'restore.canProfileNote':
      'نام، زبان، ٹائم زون اور ملک۔ صرف وہاں جہاں فائل اس سے مختلف ہو جو ابھی یہاں موجود ہے، اور صرف وہ قدریں جو یہ پلیٹ فارم رکھ سکتا ہے۔',
    'restore.canNotes': 'آپ کے نوٹس اور بُک مارکس',
    'restore.canNotesNote':
      'ان اسباق پر واپس رکھے جاتے ہیں جن پر لکھے گئے تھے، مگر صرف ان کورسز میں جن میں آپ کا ابھی اندراج ہے۔ نوٹ ایک اندراج سے جڑا ہوتا ہے، اس لیے جو کورس آپ چھوڑ چکے ہیں اس میں اسے رکھنے کی کوئی جگہ نہیں۔',
    'restore.cannotHeading': 'کیا نہیں آ سکتا، اور کیوں',
    'restore.cannotEnrol': 'اندراجات',
    'restore.cannotEnrolNote':
      'اندراج ایک حق ہے، اور کبھی کبھی قیمت دے کر ملتا ہے۔ جو فائل اندراج دے سکے وہ کورسز مفت بانٹنے والی فائل ہوگی۔ دوبارہ اندراج کریں، پھر فائل دوسری بار استعمال کریں: آپ کے نوٹس اپنے اسباق تک پہنچ جائیں گے۔',
    'restore.cannotCert': 'اسناد',
    'restore.cannotCertNote':
      'سند پلیٹ فارم جاری کرتا ہے۔ فائل سے لکھی گئی سند ایسی جعل سازی ہوگی جو جانچ میں پاس ہو جائے۔ آپ کی فائل میں موجود نمبر اب بھی اصلی ہیں، اور سند کی جانچ اب بھی ان کی تصدیق کرتی ہے۔',
    'restore.cannotMoney': 'آرڈر، رقم کی واپسی اور پیش رفت',
    'restore.cannotMoneyNote':
      'یہ یہاں جو کچھ ہوا اس کے ریکارڈ ہیں جو پلیٹ فارم رکھتا ہے۔ ان میں سے کسی کو فائل سے واپس رکھنا نقل نہیں، دعویٰ ہوگا۔ آپ کی رسیدیں آپ کے اپنے ریکارڈ کے لیے فائل میں رہتی ہیں۔',
    'restore.cannotPublished': 'جو آپ نے شائع کیا، اور جس پر آپ کو نمبر ملے',
    'restore.cannotPublishedNote':
      'جائزے، بحث کی پوسٹس اور اسائنمنٹ کی جمع کرائی گئی تحریریں ہر ایک یہاں شائع ہوئی اور جہاں ضرورت تھی اس کی نگرانی کی گئی۔ انہیں فائل سے دوبارہ پوسٹ کرنا ایسے الفاظ شائع کرے گا جنہیں کسی نے دوبارہ نہیں پڑھا۔',
    'restore.cannotPeople': 'بچے، کردار اور اجازتیں',
    'restore.cannotPeopleNote':
      'بچے کے پروفائل میں درج ہوتا ہے کہ اس کا سرپرست کون ہے، اور عملے کا کردار کوئی شخص دیتا ہے، وہ فائل میں نہیں آتا۔ دونوں ان اسکرینوں سے شامل کیے جاتے ہیں جو درج کرتی ہیں کہ یہ کس نے کیا۔',
    'restore.cannotHistory': 'آپ کی سرگرمی کی تاریخ',
    'restore.cannotHistoryNote':
      'یہ یہاں جو ہوا اس کا ریکارڈ ہے اور اس میں صرف اضافہ ہو سکتا ہے۔ فائل سے لائی گئی تاریخ گھڑی ہوئی تاریخ ہوگی۔',
    'restore.cannotSignIn': 'آپ کا سائن اِن پتا اور پاس ورڈ',
    'restore.cannotSignInNote':
      'دونوں سائن اِن سروس کے پاس رہتے ہیں، اس ریکارڈ سے الگ۔ جس پتے کو استعمال کرنا چاہتے ہیں اسی سے سائن اِن کریں؛ فائل اسے مقرر نہیں کر سکتی۔',
    'restore.foot':
      'جب تک آپ دیکھ نہ لیں کہ کیا لکھا جائے گا، کچھ نہیں لکھا جاتا۔ فائل واپس رکھنا آڈٹ ریکارڈ میں درج ہوتا ہے، اس کے ساتھ کہ کیا واپس رکھا گیا۔',
    'restore.fileLabel': 'وہ JSON فائل جو ایکسپورٹ کے صفحے نے ڈاؤن لوڈ کی',
    'restore.fileHint':
      'اسپریڈ شیٹ اور چھاپنے کے قابل نقل پڑھنے کے لیے ہیں؛ اس صفحے کو JSON فائل چاہیے۔ اس کا نام یوں شروع ہوتا ہے: {name}',
    'restore.check': 'اس فائل کو جانچیں',
    'restore.checking': 'جانچ ہو رہی ہے…',
    'restore.another': 'دوسری فائل چنیں',
    'restore.apply': 'جو واپس رکھا جا سکتا ہے واپس رکھیں',
    'restore.applying': 'واپس رکھا جا رہا ہے…',
    'restore.different': 'کوئی اور فائل واپس رکھیں',
    'restore.errLarge':
      'یہ فائل اس سے بڑی ہے جتنی آپ کے ڈیٹا کی نقل ہو سکتی ہے۔ وہ JSON فائل چنیں جو ایکسپورٹ کے صفحے نے ڈاؤن لوڈ کی تھی۔',
    'restore.errNotJson':
      'یہ فائل خالی ہے یا JSON نہیں ہے۔ وہ JSON فائل چنیں جو ایکسپورٹ کے صفحے نے ڈاؤن لوڈ کی تھی؛ اسپریڈ شیٹ اور چھاپنے کے قابل نقل واپس نہیں رکھی جا سکتیں۔',
    'restore.errNotExport':
      'اس فائل میں JSON ہے، مگر یہ آپ کے ڈیٹا کی وہ نقل نہیں جو اس پلیٹ فارم نے بنائی ہو۔',
    'restore.errNewer':
      'یہ نقل پلیٹ فارم کے اس ورژن سے نئے ورژن نے بنائی ہے جسے یہ پڑھ سکتا ہے، اس لیے اسے یہاں واپس نہیں رکھا جا سکتا۔',
    'restore.errSignedOut':
      'آپ سائن آؤٹ ہو چکے ہیں۔ دوبارہ سائن اِن کریں، پھر فائل دوبارہ چنیں۔ کچھ تبدیل نہیں ہوا۔',
    'restore.errCheckFailed':
      'فائل کی جانچ نہیں ہو سکی، اور کچھ تبدیل نہیں ہوا۔ اپنا کنکشن دیکھیں اور دوبارہ کوشش کریں۔',
    'restore.errRefused': 'پلیٹ فارم نے یہ فائل رد کر دی۔ کچھ تبدیل نہیں ہوا۔',
    'restore.unconfirmed':
      'ہم تصدیق نہیں کر سکے کہ فائل واپس رکھی گئی یا نہیں۔ فائل کو دوبارہ جانچیں: جو اندراج پہلے سے یہاں ہے اسے چھوڑ دیا جاتا ہے، اس لیے کچھ بھی دو بار نہیں لکھا جاتا۔',
    'restore.resultCheck': 'یہ فائل کیا واپس رکھے گی',
    'restore.resultApplied': 'اس فائل نے کیا واپس رکھا',
    'restore.resultNothing': 'موجودہ حالت میں اس فائل سے کچھ بھی واپس نہیں رکھا جا سکتا۔',
    'restore.resultAllHere': 'یہ فائل جو کچھ واپس رکھ سکتی ہے وہ پہلے سے یہاں موجود ہے۔',
    'restore.lineNotes': 'نوٹس: {count}',
    'restore.lineMarks': 'بُک مارکس: {count}',
    'restore.lineProfile': 'پروفائل کی تفصیلات: {fields}',
    'restore.lineHere': 'پہلے سے یہاں موجود اور جوں کے توں چھوڑے گئے: {count}',
    'restore.skippedHeading': 'فائل میں کیا رہ گیا، اور کیوں',
    'restore.nothingWritten': 'ابھی کچھ نہیں لکھا گیا۔ فائل کی جانچ کچھ نہیں بدلتی۔',
    'restore.afterApplied':
      'آپ کی فائل نہیں بدلی، اس لیے اسے دوبارہ استعمال کیا جا سکتا ہے: جو اندراج پہلے سے یہاں ہے اسے چھوڑ دیا جاتا ہے، دو بار نہیں لکھا جاتا۔ جو چیزیں کوئی فائل کبھی واپس نہیں رکھتی وہ اسی صفحے پر نیچے درج ہیں۔',
    'restore.fieldCountry': 'ملک',
    'restore.whereEntry': 'ایک محفوظ اندراج',
    'restore.whyNameBlank': 'فائل میں نام خالی ہے، اور پروفائل کا نام خالی نہیں ہو سکتا۔',
    'restore.whyNameLong': 'فائل میں نام بہت لمبا ہے۔ نام میں زیادہ سے زیادہ حروف: {count}',
    'restore.whyLanguage':
      'فائل میں زبان اس شکل میں نہیں لکھی جو پروفائل رکھ سکے۔ فائل میں: {value}',
    'restore.whyTimezone':
      'فائل میں ٹائم زون ایسا نہیں جسے یہ پلیٹ فارم جانتا ہو۔ فائل میں: {value}',
    'restore.whyCountry': 'فائل میں ملک دو حرفی ملکی کوڈ نہیں ہے۔ فائل میں: {value}',
    'restore.whyNotList': 'اس فائل کا ایک حصہ فہرست نہیں ہے، اس لیے پڑھا نہیں جا سکا۔',
    'restore.whyCapped':
      'یہ فہرست اس سے لمبی ہے جتنی ایک بار میں پڑھی جاتی ہے، اس لیے صرف اس کا شروع کا حصہ پڑھا جاتا ہے۔ پڑھے گئے اندراجات: {read}۔ فائل میں اندراجات: {held}',
    'restore.whyOff':
      'اس پلیٹ فارم پر نوٹس اور بُک مارکس بند ہیں، اس لیے انہیں رکھنے کی کوئی جگہ نہیں۔ وہ اب بھی آپ کی فائل میں ہیں۔',
    'restore.whyNoteEmpty': 'اس نوٹ میں کوئی متن نہیں۔',
    'restore.whyNoteLong': 'یہ نوٹ بہت لمبا ہے۔ نوٹ میں زیادہ سے زیادہ حروف: {count}',
    'restore.whyNoLesson': 'اس اندراج میں کسی سبق کا نام نہیں، اس لیے اسے جوڑنے کے لیے کچھ نہیں۔',
    'restore.whyNotEnrolled': 'آپ کا اس وقت کسی ایسے کورس میں اندراج نہیں جس میں اس نام کا سبق ہو۔',
    'restore.whyAmbiguous':
      'آپ کے ایک سے زیادہ کورسز میں اس نام کا سبق ہے، اور فائل نہیں بتا سکتی کہ کون سا۔',
    'restore.whyDiffers':
      'آپ اس کے بعد اس سبق پر ایک مختلف نوٹ لکھ چکے ہیں، اور اسے بدلا نہیں گیا۔',
    'restore.whyNoAccess': 'اس کورس میں فعال اندراج اور اس سبق تک رسائی درکار ہے۔',
    'restore.whyOther': 'یہ اندراج واپس نہیں رکھا جا سکا۔',
  },
  fa: {
    'restore.title': 'داده‌هایتان را برگردانید',
    'restore.crumb': 'بازگردانی',
    'restore.lede':
      'اگر نسخه‌ای از داده‌هایتان را بارگیری کرده‌اید و می‌خواهید برگردد، به همین حساب پس از یک وقفه یا به حسابی تازه، این صفحه آن پرونده را می‌خواند و بخشی از آن را که خودتان نوشته‌اید برمی‌گرداند.',
    'restore.canHeading': 'چه چیزهایی می‌تواند برگردد',
    'restore.canProfile': 'نمایهٔ شما',
    'restore.canProfileNote':
      'نام، زبان، منطقهٔ زمانی و کشور. فقط جایی که پرونده با آنچه اکنون اینجاست فرق دارد، و فقط مقدارهایی که این سکو می‌تواند نگه دارد.',
    'restore.canNotes': 'یادداشت‌ها و نشانک‌های شما',
    'restore.canNotesNote':
      'به درس‌هایی که روی آن‌ها نوشته شده بودند برمی‌گردند، اما فقط در دوره‌هایی که اکنون در آن‌ها ثبت‌نام هستید. یادداشت به یک ثبت‌نام تعلق دارد، پس دوره‌ای که ترکش کرده‌اید جایی برای گذاشتن آن ندارد.',
    'restore.cannotHeading': 'چه چیزهایی نمی‌تواند، و چرا',
    'restore.cannotEnrol': 'ثبت‌نام‌ها',
    'restore.cannotEnrolNote':
      'ثبت‌نام یک حق است و گاهی حقی که بهایش پرداخت شده. پرونده‌ای که بتواند آن را بدهد پرونده‌ای است که دوره‌ها را رایگان می‌بخشد. دوباره ثبت‌نام کنید، سپس پرونده را بار دوم به کار ببرید: یادداشت‌هایتان درس‌هایشان را پیدا می‌کنند.',
    'restore.cannotCert': 'گواهی‌نامه‌ها',
    'restore.cannotCertNote':
      'گواهی‌نامه را سکو صادر می‌کند. گواهی‌نامه‌ای که از روی پرونده نوشته شود جعلی است که از بررسی می‌گذرد. شماره‌های درون پروندهٔ شما هنوز واقعی‌اند و بررسی گواهی‌نامه هنوز آن‌ها را تأیید می‌کند.',
    'restore.cannotMoney': 'سفارش‌ها، بازپرداخت‌ها و پیشرفت',
    'restore.cannotMoneyNote':
      'این‌ها سابقهٔ چیزهایی‌اند که اینجا رخ داده و سکو نگهشان می‌دارد. برگرداندن یکی از آن‌ها از روی پرونده ادعاست، نه نسخه. رسیدهایتان برای بایگانی خودتان در پرونده می‌مانند.',
    'restore.cannotPublished': 'آنچه منتشر کرده‌اید و آنچه برایش نمره گرفته‌اید',
    'restore.cannotPublishedNote':
      'نظرها، نوشته‌های گفت‌وگو و تحویل‌های تکلیف هر یک اینجا منتشر شده‌اند و هر جا لازم بوده بازبینی شده‌اند. فرستادن دوبارهٔ آن‌ها از روی پرونده سخنانی را منتشر می‌کند که کسی دوباره نخوانده است.',
    'restore.cannotPeople': 'کودکان، نقش‌ها و مجوزها',
    'restore.cannotPeopleNote':
      'نمایهٔ کودک ثبت می‌کند سرپرست او کیست، و نقش کارمندی را یک شخص می‌دهد و در پرونده جابه‌جا نمی‌شود. هر دو از راه صفحه‌هایی افزوده می‌شوند که ثبت می‌کنند چه کسی این کار را کرده است.',
    'restore.cannotHistory': 'تاریخچهٔ فعالیت شما',
    'restore.cannotHistoryNote':
      'این سابقهٔ چیزهایی است که اینجا رخ داده و فقط می‌توان به آن افزود. تاریخچه‌ای که از پرونده آورده شود تاریخچه‌ای ساختگی است.',
    'restore.cannotSignIn': 'نشانی ورود و گذرواژهٔ شما',
    'restore.cannotSignInNote':
      'هر دو نزد سرویس ورود نگه‌داری می‌شوند، جدا از این سابقه. با نشانی‌ای که می‌خواهید به کار ببرید وارد شوید؛ پرونده نمی‌تواند آن را تعیین کند.',
    'restore.foot':
      'تا وقتی ندیده‌اید چه چیزی نوشته خواهد شد، چیزی نوشته نمی‌شود. برگرداندن پرونده در سابقهٔ ممیزی ثبت می‌شود، همراه با آنچه برگردانده است.',
    'restore.fileLabel': 'پروندهٔ JSON که صفحهٔ برون‌بری بارگیری کرده است',
    'restore.fileHint':
      'صفحه‌گسترده و نسخهٔ چاپی برای خواندن‌اند؛ این صفحه پروندهٔ JSON را لازم دارد. نام آن این‌گونه آغاز می‌شود: {name}',
    'restore.check': 'این پرونده را بررسی کنید',
    'restore.checking': 'در حال بررسی…',
    'restore.another': 'پروندهٔ دیگری برگزینید',
    'restore.apply': 'آنچه را می‌شود برگرداند برگردانید',
    'restore.applying': 'در حال برگرداندن…',
    'restore.different': 'پروندهٔ دیگری را برگردانید',
    'restore.errLarge':
      'این پرونده بزرگ‌تر از آن است که نسخه‌ای از داده‌های شما باشد. پروندهٔ JSON را که صفحهٔ برون‌بری بارگیری کرده برگزینید.',
    'restore.errNotJson':
      'این پرونده خالی است یا JSON نیست. پروندهٔ JSON را که صفحهٔ برون‌بری بارگیری کرده برگزینید؛ صفحه‌گسترده و نسخهٔ چاپی را نمی‌توان برگرداند.',
    'restore.errNotExport':
      'این پرونده JSON دارد، اما نسخه‌ای از داده‌های شما نیست که این سکو ساخته باشد.',
    'restore.errNewer':
      'این نسخه را نگارشی از سکو ساخته که تازه‌تر از نگارشی است که اینجا خوانده می‌شود، پس نمی‌توان آن را اینجا برگرداند.',
    'restore.errSignedOut':
      'از حساب خارج شده‌اید. دوباره وارد شوید، سپس پرونده را دوباره برگزینید. چیزی تغییر نکرد.',
    'restore.errCheckFailed':
      'پرونده بررسی نشد و چیزی تغییر نکرد. اتصالتان را بررسی کنید و دوباره تلاش کنید.',
    'restore.errRefused': 'سکو این پرونده را نپذیرفت. چیزی تغییر نکرد.',
    'restore.unconfirmed':
      'نتوانستیم مطمئن شویم پرونده برگردانده شد یا نه. پرونده را دوباره بررسی کنید: موردی که از پیش اینجاست نادیده گرفته می‌شود، پس چیزی دو بار نوشته نمی‌شود.',
    'restore.resultCheck': 'این پرونده چه چیزهایی را برمی‌گرداند',
    'restore.resultApplied': 'این پرونده چه چیزهایی را برگرداند',
    'restore.resultNothing': 'در وضع کنونی هیچ چیز از این پرونده را نمی‌توان برگرداند.',
    'restore.resultAllHere': 'آنچه این پرونده می‌تواند برگرداند از پیش اینجاست.',
    'restore.lineNotes': 'یادداشت‌ها: {count}',
    'restore.lineMarks': 'نشانک‌ها: {count}',
    'restore.lineProfile': 'جزئیات نمایه: {fields}',
    'restore.lineHere': 'از پیش اینجا بوده و دست‌نخورده مانده: {count}',
    'restore.skippedHeading': 'آنچه در پرونده ماند، و چرا',
    'restore.nothingWritten': 'هنوز چیزی نوشته نشده است. بررسی پرونده چیزی را تغییر نمی‌دهد.',
    'restore.afterApplied':
      'پروندهٔ شما تغییر نکرده است، پس می‌توان دوباره آن را به کار برد: موردی که از پیش اینجاست نادیده گرفته می‌شود و دو بار نوشته نمی‌شود. آنچه هیچ پرونده‌ای هرگز برنمی‌گرداند پایین‌تر در همین صفحه آمده است.',
    'restore.fieldCountry': 'کشور',
    'restore.whereEntry': 'یک مورد ذخیره‌شده',
    'restore.whyNameBlank': 'نام در پرونده خالی است و نمایه نمی‌تواند نام خالی داشته باشد.',
    'restore.whyNameLong':
      'نام در پرونده بیش از اندازه بلند است. بیشترین شمار نویسه‌های یک نام: {count}',
    'restore.whyLanguage':
      'زبان در پرونده به شکلی نوشته نشده که نمایه بتواند نگه دارد. در پرونده: {value}',
    'restore.whyTimezone':
      'منطقهٔ زمانی در پرونده از آن‌هایی نیست که این سکو می‌شناسد. در پرونده: {value}',
    'restore.whyCountry': 'کشور در پرونده یک کد دوحرفی کشور نیست. در پرونده: {value}',
    'restore.whyNotList': 'بخشی از این پرونده فهرست نیست، پس خوانده نشد.',
    'restore.whyCapped':
      'این فهرست بلندتر از آن است که یک‌باره خوانده شود، پس فقط آغاز آن خوانده می‌شود. موردهای خوانده‌شده: {read}. موردهای درون پرونده: {held}',
    'restore.whyOff':
      'یادداشت‌ها و نشانک‌ها در این سکو خاموش‌اند، پس جایی برای گذاشتنشان نیست. آن‌ها هنوز در پروندهٔ شما هستند.',
    'restore.whyNoteEmpty': 'این یادداشت متنی ندارد.',
    'restore.whyNoteLong':
      'این یادداشت بیش از اندازه بلند است. بیشترین شمار نویسه‌های یک یادداشت: {count}',
    'restore.whyNoLesson': 'این مورد نام هیچ درسی را ندارد، پس چیزی نیست که به آن پیوست شود.',
    'restore.whyNotEnrolled': 'اکنون در دوره‌ای که درسی با این نام داشته باشد ثبت‌نام نیستید.',
    'restore.whyAmbiguous':
      'بیش از یکی از دوره‌های شما درسی با این نام دارد و پرونده نمی‌تواند بگوید کدام.',
    'restore.whyDiffers':
      'از آن زمان یادداشت دیگری روی این درس نوشته‌اید و آن یادداشت جایگزین نشد.',
    'restore.whyNoAccess': 'ثبت‌نام فعال در این دوره و دسترسی به این درس لازم است.',
    'restore.whyOther': 'این مورد برگردانده نشد.',
  },
  'fa-af': {
    'restore.title': 'معلومات تان را برگردانید',
    'restore.crumb': 'بازگرداندن',
    'restore.lede':
      'اگر یک نسخه از معلومات تان را داونلود کرده‌اید و می‌خواهید برگردد، به همین حساب پس از یک وقفه یا به یک حساب نو، این صفحه آن فایل را می‌خواند و بخشی از آن را که خود تان نوشته‌اید برمی‌گرداند.',
    'restore.canHeading': 'چه چیزها می‌تواند برگردد',
    'restore.canProfile': 'پروفایل شما',
    'restore.canProfileNote':
      'نام، زبان، ساحهٔ زمانی و کشور. تنها جایی که فایل با آنچه حالا اینجاست فرق دارد، و تنها مقدارهایی که این پلتفرم می‌تواند نگه دارد.',
    'restore.canNotes': 'یادداشت‌ها و نشانی‌های شما',
    'restore.canNotesNote':
      'به درس‌هایی که روی آن‌ها نوشته شده بودند برمی‌گردند، اما تنها در کورس‌هایی که حالا در آن‌ها ثبت‌نام هستید. یادداشت به یک ثبت‌نام تعلق دارد، پس کورسی که آن را ترک کرده‌اید جایی برای گذاشتن آن ندارد.',
    'restore.cannotHeading': 'چه چیزها نمی‌تواند، و چرا',
    'restore.cannotEnrol': 'ثبت‌نام‌ها',
    'restore.cannotEnrolNote':
      'ثبت‌نام یک حق است و گاهی حقی که پول آن پرداخت شده. فایلی که بتواند آن را بدهد فایلی است که کورس‌ها را رایگان می‌بخشد. دوباره ثبت‌نام کنید، بعد فایل را بار دوم به کار ببرید: یادداشت‌های تان درس‌های شان را پیدا می‌کنند.',
    'restore.cannotCert': 'اسناد',
    'restore.cannotCertNote':
      'سند را پلتفرم صادر می‌کند. سندی که از روی فایل نوشته شود جعلی است که از بررسی می‌گذرد. شماره‌هایی که در فایل شماست هنوز واقعی‌اند و بررسی سند هنوز آن‌ها را تأیید می‌کند.',
    'restore.cannotMoney': 'فرمایش‌ها، بازپرداخت‌ها و پیشرفت',
    'restore.cannotMoneyNote':
      'این‌ها سابقهٔ چیزهایی‌اند که اینجا رخ داده و پلتفرم آن‌ها را نگه می‌دارد. برگرداندن یکی از آن‌ها از روی فایل ادعاست، نه نسخه. رسیدهای تان برای ثبت خود تان در فایل می‌مانند.',
    'restore.cannotPublished': 'آنچه نشر کرده‌اید و آنچه برایش نمره گرفته‌اید',
    'restore.cannotPublishedNote':
      'نظرها، نوشته‌های گفت‌وگو و تحویل‌های کار خانگی هر یک اینجا نشر شده‌اند و هر جا لازم بوده بازبینی شده‌اند. فرستادن دوبارهٔ آن‌ها از روی فایل سخنانی را نشر می‌کند که کسی دوباره نخوانده است.',
    'restore.cannotPeople': 'اطفال، نقش‌ها و صلاحیت‌ها',
    'restore.cannotPeopleNote':
      'پروفایل طفل ثبت می‌کند سرپرست او کیست، و نقش کارمندی را یک شخص می‌دهد و در فایل انتقال نمی‌یابد. هر دو از راه صفحه‌هایی افزوده می‌شوند که ثبت می‌کنند چه کسی این کار را کرده است.',
    'restore.cannotHistory': 'تاریخچهٔ فعالیت شما',
    'restore.cannotHistoryNote':
      'این سابقهٔ چیزهایی است که اینجا رخ داده و تنها می‌شود به آن افزود. تاریخچه‌ای که از فایل آورده شود تاریخچه‌ای ساختگی است.',
    'restore.cannotSignIn': 'نشانی ورود و رمز عبور شما',
    'restore.cannotSignInNote':
      'هر دو نزد خدمت ورود نگه‌داری می‌شوند، جدا از این سابقه. با نشانی‌ای که می‌خواهید به کار ببرید وارد شوید؛ فایل نمی‌تواند آن را تعیین کند.',
    'restore.foot':
      'تا وقتی ندیده‌اید چه چیزی نوشته خواهد شد، چیزی نوشته نمی‌شود. برگرداندن فایل در سابقهٔ بازرسی ثبت می‌شود، همراه با آنچه برگردانده است.',
    'restore.fileLabel': 'فایل JSON که صفحهٔ صادر کردن داونلود کرده است',
    'restore.fileHint':
      'صفحهٔ جدولی و نسخهٔ چاپی برای خواندن‌اند؛ این صفحه فایل JSON را ضرورت دارد. نام آن این‌گونه آغاز می‌شود: {name}',
    'restore.check': 'این فایل را بررسی کنید',
    'restore.checking': 'در حال بررسی…',
    'restore.another': 'فایل دیگری انتخاب کنید',
    'restore.apply': 'آنچه را می‌شود برگرداند برگردانید',
    'restore.applying': 'در حال برگرداندن…',
    'restore.different': 'فایل دیگری را برگردانید',
    'restore.errLarge':
      'این فایل کلان‌تر از آن است که یک نسخه از معلومات شما باشد. فایل JSON را که صفحهٔ صادر کردن داونلود کرده انتخاب کنید.',
    'restore.errNotJson':
      'این فایل خالی است یا JSON نیست. فایل JSON را که صفحهٔ صادر کردن داونلود کرده انتخاب کنید؛ صفحهٔ جدولی و نسخهٔ چاپی را نمی‌شود برگرداند.',
    'restore.errNotExport':
      'این فایل JSON دارد، اما نسخه‌ای از معلومات شما نیست که این پلتفرم ساخته باشد.',
    'restore.errNewer':
      'این نسخه را نسخه‌ای از پلتفرم ساخته که نوتر از نسخه‌ای است که اینجا خوانده می‌شود، پس نمی‌شود آن را اینجا برگرداند.',
    'restore.errSignedOut':
      'از حساب خارج شده‌اید. دوباره وارد شوید، بعد فایل را دوباره انتخاب کنید. چیزی تغییر نکرد.',
    'restore.errCheckFailed':
      'فایل بررسی نشد و چیزی تغییر نکرد. اتصال تان را ببینید و دوباره کوشش کنید.',
    'restore.errRefused': 'پلتفرم این فایل را نپذیرفت. چیزی تغییر نکرد.',
    'restore.unconfirmed':
      'نتوانستیم مطمئن شویم که فایل برگردانده شد یا نه. فایل را دوباره بررسی کنید: موردی که از پیش اینجاست نادیده گرفته می‌شود، پس چیزی دو بار نوشته نمی‌شود.',
    'restore.resultCheck': 'این فایل چه چیزها را برمی‌گرداند',
    'restore.resultApplied': 'این فایل چه چیزها را برگرداند',
    'restore.resultNothing': 'در وضع کنونی هیچ چیز از این فایل را نمی‌شود برگرداند.',
    'restore.resultAllHere': 'آنچه این فایل می‌تواند برگرداند از پیش اینجاست.',
    'restore.lineNotes': 'یادداشت‌ها: {count}',
    'restore.lineMarks': 'نشانی‌ها: {count}',
    'restore.lineProfile': 'جزئیات پروفایل: {fields}',
    'restore.lineHere': 'از پیش اینجا بوده و دست‌نخورده مانده: {count}',
    'restore.skippedHeading': 'آنچه در فایل ماند، و چرا',
    'restore.nothingWritten': 'هنوز چیزی نوشته نشده است. بررسی فایل چیزی را تغییر نمی‌دهد.',
    'restore.afterApplied':
      'فایل شما تغییر نکرده است، پس می‌شود دوباره آن را به کار برد: موردی که از پیش اینجاست نادیده گرفته می‌شود و دو بار نوشته نمی‌شود. آنچه هیچ فایلی هرگز برنمی‌گرداند پایین‌تر در همین صفحه آمده است.',
    'restore.fieldCountry': 'کشور',
    'restore.whereEntry': 'یک مورد ذخیره‌شده',
    'restore.whyNameBlank': 'نام در فایل خالی است و پروفایل نمی‌تواند نام خالی داشته باشد.',
    'restore.whyNameLong': 'نام در فایل بسیار دراز است. بیشترین شمار حرف‌های یک نام: {count}',
    'restore.whyLanguage':
      'زبان در فایل به شکلی نوشته نشده که پروفایل بتواند نگه دارد. در فایل: {value}',
    'restore.whyTimezone':
      'ساحهٔ زمانی در فایل از آن‌هایی نیست که این پلتفرم می‌شناسد. در فایل: {value}',
    'restore.whyCountry': 'کشور در فایل یک کود دوحرفی کشور نیست. در فایل: {value}',
    'restore.whyNotList': 'بخشی از این فایل فهرست نیست، پس خوانده نشد.',
    'restore.whyCapped':
      'این فهرست درازتر از آن است که یک‌باره خوانده شود، پس تنها آغاز آن خوانده می‌شود. موردهای خوانده‌شده: {read}. موردهای درون فایل: {held}',
    'restore.whyOff':
      'یادداشت‌ها و نشانی‌ها در این پلتفرم خاموش‌اند، پس جایی برای گذاشتن شان نیست. آن‌ها هنوز در فایل شما هستند.',
    'restore.whyNoteEmpty': 'این یادداشت متنی ندارد.',
    'restore.whyNoteLong': 'این یادداشت بسیار دراز است. بیشترین شمار حرف‌های یک یادداشت: {count}',
    'restore.whyNoLesson': 'این مورد نام هیچ درسی را ندارد، پس چیزی نیست که به آن پیوست شود.',
    'restore.whyNotEnrolled': 'حالا در کورسی که درسی با این نام داشته باشد ثبت‌نام نیستید.',
    'restore.whyAmbiguous':
      'بیش از یکی از کورس‌های شما درسی با این نام دارد و فایل نمی‌تواند بگوید کدام.',
    'restore.whyDiffers': 'از آن وقت یادداشت دیگری روی این درس نوشته‌اید و آن یادداشت عوض نشد.',
    'restore.whyNoAccess': 'ثبت‌نام فعال در این کورس و دسترسی به این درس لازم است.',
    'restore.whyOther': 'این مورد برگردانده نشد.',
  },
  tr: {
    'restore.title': 'Verilerinizi geri koyun',
    'restore.crumb': 'Geri yükleme',
    'restore.lede':
      'Verilerinizin bir kopyasını indirdiyseniz ve geri istiyorsanız, bir aradan sonra bu hesaba ya da yeni bir hesaba, bu sayfa o dosyayı okur ve içinden sizin yazdığınız kısmı geri koyar.',
    'restore.canHeading': 'Neler geri gelebilir',
    'restore.canProfile': 'Profiliniz',
    'restore.canProfileNote':
      'Ad, dil, saat dilimi ve ülke. Yalnızca dosyanın şu anda burada olandan farklı olduğu yerde ve yalnızca bu platformun tutabildiği değerler.',
    'restore.canNotes': 'Notlarınız ve yer imleriniz',
    'restore.canNotesNote':
      'Yazıldıkları derslere geri konur, ama yalnızca şu anda kayıtlı olduğunuz kurslarda. Bir not bir kayda aittir; bu yüzden ayrıldığınız bir kursta onu koyacak yer yoktur.',
    'restore.cannotHeading': 'Neler gelemez ve neden',
    'restore.cannotEnrol': 'Kayıtlar',
    'restore.cannotEnrolNote':
      'Kayıt bir haktır, bazen de ücreti ödenmiş bir haktır. Kayıt verebilen bir dosya, kursları bedava dağıtan bir dosya olurdu. Yeniden kaydolun, sonra dosyayı ikinci kez kullanın: notlarınız derslerini bulur.',
    'restore.cannotCert': 'Sertifikalar',
    'restore.cannotCertNote':
      'Sertifikayı platform düzenler. Bir dosyadan yazılan sertifika, doğrulamadan geçen bir sahtecilik olurdu. Dosyanızdaki numaralar hâlâ gerçektir ve sertifika doğrulaması onları hâlâ onaylar.',
    'restore.cannotMoney': 'Siparişler, iadeler ve ilerleme',
    'restore.cannotMoneyNote':
      'Bunlar burada olanların platformun tuttuğu kayıtlarıdır. Birini dosyadan geri koymak kopya değil, iddia olurdu. Makbuzlarınız kendi kayıtlarınız için dosyada kalır.',
    'restore.cannotPublished': 'Yayımladıklarınız ve not aldığınız çalışmalar',
    'restore.cannotPublishedNote':
      'Değerlendirmeler, tartışma gönderileri ve ödev teslimlerinin her biri burada yayımlandı ve gereken yerde denetlendi. Bunları bir dosyadan yeniden göndermek, kimsenin yeniden okumadığı sözleri yayımlamak olurdu.',
    'restore.cannotPeople': 'Çocuklar, roller ve izinler',
    'restore.cannotPeopleNote':
      'Bir çocuğun profili velisinin kim olduğunu kaydeder; görevli rolünü ise bir kişi verir, dosyayla taşınmaz. İkisi de kimin yaptığını kaydeden ekranlardan eklenir.',
    'restore.cannotHistory': 'Etkinlik geçmişiniz',
    'restore.cannotHistoryNote':
      'Burada olanların kaydıdır ve ona yalnızca ekleme yapılabilir. Bir dosyadan getirilen geçmiş, uydurulmuş bir geçmiş olurdu.',
    'restore.cannotSignIn': 'Oturum açma adresiniz ve parolanız',
    'restore.cannotSignInNote':
      'İkisi de bu kayıttan ayrı olarak oturum açma hizmetinde tutulur. Kullanmak istediğiniz adresle oturum açın; bir dosya onu belirleyemez.',
    'restore.foot':
      'Neyin yazılacağını görmeden hiçbir şey yazılmaz. Bir dosyanın geri konması, neyi geri koyduğuyla birlikte denetim kaydına yazılır.',
    'restore.fileLabel': 'Dışa aktarma sayfasının indirdiği JSON dosyası',
    'restore.fileHint':
      'Elektronik tablo ve yazdırılabilir kopya okumak içindir; bu sayfaya JSON dosyası gerekir. Adı şöyle başlar: {name}',
    'restore.check': 'Bu dosyayı denetle',
    'restore.checking': 'Denetleniyor…',
    'restore.another': 'Başka bir dosya seç',
    'restore.apply': 'Geri konabilenleri geri koy',
    'restore.applying': 'Geri konuyor…',
    'restore.different': 'Farklı bir dosyayı geri koy',
    'restore.errLarge':
      'Bu dosya, verilerinizin bir kopyasının olabileceğinden daha büyük. Dışa aktarma sayfasının indirdiği JSON dosyasını seçin.',
    'restore.errNotJson':
      'Bu dosya boş ya da JSON değil. Dışa aktarma sayfasının indirdiği JSON dosyasını seçin; elektronik tablo ve yazdırılabilir kopya geri konamaz.',
    'restore.errNotExport':
      'Bu dosyada JSON var, ama bu platformun oluşturduğu bir veri kopyanız değil.',
    'restore.errNewer':
      'Bu kopyayı, platformun buradakinin okuduğundan daha yeni bir sürümü oluşturmuş; bu yüzden burada geri konamaz.',
    'restore.errSignedOut':
      'Oturumunuz kapanmış. Yeniden oturum açın, sonra dosyayı yeniden seçin. Hiçbir şey değişmedi.',
    'restore.errCheckFailed':
      'Dosya denetlenemedi ve hiçbir şey değişmedi. Bağlantınızı kontrol edip yeniden deneyin.',
    'restore.errRefused': 'Platform bu dosyayı reddetti. Hiçbir şey değişmedi.',
    'restore.unconfirmed':
      'Dosyanın geri konup konmadığını doğrulayamadık. Dosyayı yeniden denetleyin: zaten burada olan bir girdi atlanır, bu yüzden hiçbir şey iki kez yazılmaz.',
    'restore.resultCheck': 'Bu dosyanın geri koyacakları',
    'restore.resultApplied': 'Bu dosyanın geri koydukları',
    'restore.resultNothing': 'Şu durumda bu dosyadaki hiçbir şey geri konamaz.',
    'restore.resultAllHere': 'Bu dosyanın geri koyabilecekleri zaten burada.',
    'restore.lineNotes': 'Notlar: {count}',
    'restore.lineMarks': 'Yer imleri: {count}',
    'restore.lineProfile': 'Profil ayrıntıları: {fields}',
    'restore.lineHere': 'Zaten burada olan ve olduğu gibi bırakılan: {count}',
    'restore.skippedHeading': 'Dosyada kalanlar ve nedeni',
    'restore.nothingWritten':
      'Henüz hiçbir şey yazılmadı. Bir dosyayı denetlemek hiçbir şeyi değiştirmez.',
    'restore.afterApplied':
      'Dosyanız değişmedi, bu yüzden yeniden kullanılabilir: zaten burada olan bir girdi atlanır, iki kez yazılmaz. Hiçbir dosyanın asla geri koymadıkları bu sayfanın aşağısında sayılmıştır.',
    'restore.fieldCountry': 'Ülke',
    'restore.whereEntry': 'Kayıtlı bir girdi',
    'restore.whyNameBlank': 'Dosyadaki ad boş ve bir profilin adı boş olamaz.',
    'restore.whyNameLong': 'Dosyadaki ad fazla uzun. Bir adın en fazla karakter sayısı: {count}',
    'restore.whyLanguage':
      'Dosyadaki dil, profilin tutabileceği biçimde yazılmamış. Dosyada: {value}',
    'restore.whyTimezone':
      'Dosyadaki saat dilimi bu platformun bildiği bir saat dilimi değil. Dosyada: {value}',
    'restore.whyCountry': 'Dosyadaki ülke iki harfli bir ülke kodu değil. Dosyada: {value}',
    'restore.whyNotList': 'Bu dosyanın bir bölümü liste değil, bu yüzden okunamadı.',
    'restore.whyCapped':
      'Bu liste bir seferde okunandan daha uzun, bu yüzden yalnızca başı okunur. Okunan girdiler: {read}. Dosyadaki girdiler: {held}',
    'restore.whyOff':
      'Notlar ve yer imleri bu platformda kapalı, bu yüzden konacakları bir yer yok. Hâlâ dosyanızdalar.',
    'restore.whyNoteEmpty': 'Bu notta metin yok.',
    'restore.whyNoteLong': 'Bu not fazla uzun. Bir notun en fazla karakter sayısı: {count}',
    'restore.whyNoLesson': 'Bu girdi bir ders adı vermiyor, bu yüzden ekleneceği bir yer yok.',
    'restore.whyNotEnrolled': 'Şu anda bu adda bir dersi olan bir kursa kayıtlı değilsiniz.',
    'restore.whyAmbiguous':
      'Kurslarınızın birden fazlasında bu adda bir ders var ve dosya hangisi olduğunu söyleyemiyor.',
    'restore.whyDiffers':
      'O zamandan beri bu derse farklı bir not yazmışsınız ve o notun yerine konmadı.',
    'restore.whyNoAccess': 'Bu kursta etkin bir kayıt ve bu derse erişim gerekir.',
    'restore.whyOther': 'Bu girdi geri konamadı.',
  },
  id: {
    'restore.title': 'Kembalikan data Anda',
    'restore.crumb': 'Pemulihan',
    'restore.lede':
      'Jika Anda pernah mengunduh salinan data Anda dan ingin mengembalikannya, ke akun ini setelah jeda atau ke akun baru, halaman ini membaca berkas itu dan mengembalikan bagian yang Anda tulis sendiri.',
    'restore.canHeading': 'Apa yang bisa kembali',
    'restore.canProfile': 'Profil Anda',
    'restore.canProfileNote':
      'Nama, bahasa, zona waktu, dan negara. Hanya bila berkas berbeda dari yang ada di sini sekarang, dan hanya nilai yang dapat disimpan platform ini.',
    'restore.canNotes': 'Catatan dan penanda Anda',
    'restore.canNotesNote':
      'Dikembalikan ke pelajaran tempat catatan itu ditulis, tetapi hanya di kursus yang sedang Anda ikuti sekarang. Catatan melekat pada suatu pendaftaran, jadi kursus yang sudah Anda tinggalkan tidak punya tempat untuk menaruhnya.',
    'restore.cannotHeading': 'Apa yang tidak bisa, dan alasannya',
    'restore.cannotEnrol': 'Pendaftaran',
    'restore.cannotEnrolNote':
      'Pendaftaran adalah hak, dan kadang hak yang dibayar. Berkas yang dapat memberikannya berarti berkas yang membagikan kursus secara gratis. Daftar lagi, lalu gunakan berkas itu untuk kedua kalinya: catatan Anda akan menemukan pelajarannya.',
    'restore.cannotCert': 'Sertifikat',
    'restore.cannotCertNote':
      'Sertifikat diterbitkan oleh platform. Sertifikat yang ditulis dari berkas adalah pemalsuan yang lolos pemeriksaan. Nomor di berkas Anda tetap asli, dan pemeriksaan sertifikat tetap mengonfirmasinya.',
    'restore.cannotMoney': 'Pesanan, pengembalian dana, dan kemajuan',
    'restore.cannotMoneyNote':
      'Ini adalah catatan tentang apa yang terjadi di sini, yang disimpan oleh platform. Mengembalikan salah satunya dari berkas adalah klaim, bukan salinan. Tanda terima Anda tetap ada di berkas untuk arsip Anda sendiri.',
    'restore.cannotPublished': 'Yang Anda terbitkan, dan yang dinilai dari Anda',
    'restore.cannotPublishedNote':
      'Ulasan, kiriman diskusi, dan pengumpulan tugas masing-masing diterbitkan di sini dan, bila perlu, dimoderasi. Mengirimkannya lagi dari berkas berarti menerbitkan kata-kata yang belum dibaca ulang siapa pun.',
    'restore.cannotPeople': 'Anak, peran, dan izin',
    'restore.cannotPeopleNote':
      'Profil anak mencatat siapa walinya, dan peran staf diberikan oleh seseorang, tidak dibawa dalam berkas. Keduanya ditambahkan melalui layar yang mencatat siapa yang melakukannya.',
    'restore.cannotHistory': 'Riwayat aktivitas Anda',
    'restore.cannotHistoryNote':
      'Ini catatan tentang apa yang terjadi di sini dan hanya dapat ditambah. Riwayat yang dibawa dari berkas adalah riwayat karangan.',
    'restore.cannotSignIn': 'Alamat masuk dan kata sandi Anda',
    'restore.cannotSignInNote':
      'Keduanya disimpan oleh layanan masuk, terpisah dari catatan ini. Masuklah dengan alamat yang ingin Anda gunakan; berkas tidak dapat mengaturnya.',
    'restore.foot':
      'Tidak ada yang ditulis sebelum Anda melihat apa yang akan ditulis. Pengembalian berkas dicatat dalam jejak audit, beserta apa yang dikembalikannya.',
    'restore.fileLabel': 'Berkas JSON yang diunduh oleh halaman ekspor',
    'restore.fileHint':
      'Lembar kerja dan salinan cetak untuk dibaca; halaman ini memerlukan berkas JSON. Namanya diawali dengan: {name}',
    'restore.check': 'Periksa berkas ini',
    'restore.checking': 'Memeriksa…',
    'restore.another': 'Pilih berkas lain',
    'restore.apply': 'Kembalikan yang bisa dikembalikan',
    'restore.applying': 'Mengembalikan…',
    'restore.different': 'Kembalikan berkas yang lain',
    'restore.errLarge':
      'Berkas ini lebih besar daripada ukuran yang mungkin untuk salinan data Anda. Pilih berkas JSON yang diunduh oleh halaman ekspor.',
    'restore.errNotJson':
      'Berkas ini kosong atau bukan JSON. Pilih berkas JSON yang diunduh oleh halaman ekspor; lembar kerja dan salinan cetak tidak dapat dikembalikan.',
    'restore.errNotExport':
      'Berkas ini berisi JSON, tetapi bukan salinan data Anda yang dibuat oleh platform ini.',
    'restore.errNewer':
      'Salinan ini dibuat oleh versi platform yang lebih baru daripada yang dapat dibaca di sini, jadi tidak dapat dikembalikan di sini.',
    'restore.errSignedOut':
      'Anda sudah keluar. Masuk lagi, lalu pilih berkas itu lagi. Tidak ada yang berubah.',
    'restore.errCheckFailed':
      'Berkas tidak dapat diperiksa, dan tidak ada yang berubah. Periksa koneksi Anda lalu coba lagi.',
    'restore.errRefused': 'Platform menolak berkas ini. Tidak ada yang berubah.',
    'restore.unconfirmed':
      'Kami tidak dapat memastikan apakah berkas itu sudah dikembalikan. Periksa berkas itu lagi: entri yang sudah ada di sini dilewati, jadi tidak ada yang ditulis dua kali.',
    'restore.resultCheck': 'Yang akan dikembalikan berkas ini',
    'restore.resultApplied': 'Yang dikembalikan berkas ini',
    'restore.resultNothing':
      'Dalam keadaan sekarang, tidak ada isi berkas ini yang dapat dikembalikan.',
    'restore.resultAllHere': 'Yang dapat dikembalikan berkas ini sudah ada di sini.',
    'restore.lineNotes': 'Catatan: {count}',
    'restore.lineMarks': 'Penanda: {count}',
    'restore.lineProfile': 'Rincian profil: {fields}',
    'restore.lineHere': 'Sudah ada di sini dan dibiarkan apa adanya: {count}',
    'restore.skippedHeading': 'Yang tertinggal di berkas, dan alasannya',
    'restore.nothingWritten': 'Belum ada yang ditulis. Memeriksa berkas tidak mengubah apa pun.',
    'restore.afterApplied':
      'Berkas Anda tidak berubah, jadi dapat digunakan lagi: entri yang sudah ada di sini dilewati, tidak ditulis dua kali. Hal-hal yang tidak pernah dikembalikan oleh berkas mana pun tercantum lebih bawah di halaman ini.',
    'restore.fieldCountry': 'Negara',
    'restore.whereEntry': 'Entri tersimpan',
    'restore.whyNameBlank': 'Nama di berkas kosong, dan profil tidak boleh bernama kosong.',
    'restore.whyNameLong':
      'Nama di berkas terlalu panjang. Jumlah karakter terbanyak untuk nama: {count}',
    'restore.whyLanguage':
      'Bahasa di berkas tidak ditulis dalam bentuk yang dapat disimpan profil. Di berkas: {value}',
    'restore.whyTimezone':
      'Zona waktu di berkas bukan yang dikenal platform ini. Di berkas: {value}',
    'restore.whyCountry': 'Negara di berkas bukan kode negara dua huruf. Di berkas: {value}',
    'restore.whyNotList': 'Salah satu bagian berkas ini bukan daftar, jadi tidak dapat dibaca.',
    'restore.whyCapped':
      'Daftar ini lebih panjang daripada yang dibaca dalam satu kali, jadi hanya bagian awalnya yang dibaca. Entri yang dibaca: {read}. Entri di berkas: {held}',
    'restore.whyOff':
      'Catatan dan penanda dimatikan di platform ini, jadi tidak ada tempat untuk menaruhnya. Semuanya masih ada di berkas Anda.',
    'restore.whyNoteEmpty': 'Catatan ini tidak berisi teks.',
    'restore.whyNoteLong':
      'Catatan ini terlalu panjang. Jumlah karakter terbanyak untuk catatan: {count}',
    'restore.whyNoLesson':
      'Entri ini tidak menyebut pelajaran, jadi tidak ada tempat untuk melekatkannya.',
    'restore.whyNotEnrolled':
      'Saat ini Anda tidak terdaftar di kursus yang memiliki pelajaran dengan nama ini.',
    'restore.whyAmbiguous':
      'Lebih dari satu kursus Anda memiliki pelajaran dengan nama ini, dan berkas tidak dapat menyebutkan yang mana.',
    'restore.whyDiffers':
      'Sejak itu Anda telah menulis catatan lain pada pelajaran ini, dan catatan itu tidak diganti.',
    'restore.whyNoAccess': 'Diperlukan pendaftaran aktif di kursus ini dan akses ke pelajaran ini.',
    'restore.whyOther': 'Entri ini tidak dapat dikembalikan.',
  },
  ms: {
    'restore.title': 'Kembalikan data anda',
    'restore.crumb': 'Pemulihan',
    'restore.lede':
      'Jika anda pernah memuat turun salinan data anda dan mahu mengembalikannya, ke akaun ini selepas berehat atau ke akaun baharu, halaman ini membaca fail itu dan mengembalikan bahagian yang anda tulis sendiri.',
    'restore.canHeading': 'Apa yang boleh kembali',
    'restore.canProfile': 'Profil anda',
    'restore.canProfileNote':
      'Nama, bahasa, zon waktu dan negara. Hanya apabila fail berbeza daripada yang ada di sini sekarang, dan hanya nilai yang boleh disimpan oleh platform ini.',
    'restore.canNotes': 'Nota dan penanda anda',
    'restore.canNotesNote':
      'Dikembalikan ke pelajaran tempat ia ditulis, tetapi hanya dalam kursus yang anda daftar sekarang. Nota terikat pada satu pendaftaran, jadi kursus yang telah anda tinggalkan tiada tempat untuk meletakkannya.',
    'restore.cannotHeading': 'Apa yang tidak boleh, dan sebabnya',
    'restore.cannotEnrol': 'Pendaftaran',
    'restore.cannotEnrolNote':
      'Pendaftaran ialah satu hak, dan kadangkala hak yang dibayar. Fail yang boleh memberikannya ialah fail yang mengagihkan kursus secara percuma. Daftar semula, kemudian gunakan fail itu kali kedua: nota anda akan menemui pelajarannya.',
    'restore.cannotCert': 'Sijil',
    'restore.cannotCertNote':
      'Sijil dikeluarkan oleh platform. Sijil yang ditulis daripada fail ialah pemalsuan yang lulus semakan. Nombor dalam fail anda masih benar, dan semakan sijil masih mengesahkannya.',
    'restore.cannotMoney': 'Pesanan, bayaran balik dan kemajuan',
    'restore.cannotMoneyNote':
      'Ini ialah rekod tentang apa yang berlaku di sini, yang disimpan oleh platform. Mengembalikan salah satunya daripada fail ialah satu dakwaan, bukan salinan. Resit anda kekal dalam fail untuk simpanan anda sendiri.',
    'restore.cannotPublished': 'Apa yang anda terbitkan, dan apa yang anda dinilai',
    'restore.cannotPublishedNote':
      'Ulasan, kiriman perbincangan dan serahan tugasan masing-masing diterbitkan di sini dan, jika perlu, disederhanakan. Menghantarnya semula daripada fail bermakna menerbitkan kata-kata yang tidak dibaca semula oleh sesiapa.',
    'restore.cannotPeople': 'Kanak-kanak, peranan dan kebenaran',
    'restore.cannotPeopleNote':
      'Profil kanak-kanak merekodkan siapa penjaganya, dan peranan kakitangan diberikan oleh seseorang, bukan dibawa dalam fail. Kedua-duanya ditambah melalui skrin yang merekodkan siapa yang melakukannya.',
    'restore.cannotHistory': 'Sejarah aktiviti anda',
    'restore.cannotHistoryNote':
      'Ia rekod tentang apa yang berlaku di sini dan hanya boleh ditambah. Sejarah yang dibawa masuk daripada fail ialah sejarah rekaan.',
    'restore.cannotSignIn': 'Alamat log masuk dan kata laluan anda',
    'restore.cannotSignInNote':
      'Kedua-duanya disimpan oleh perkhidmatan log masuk, berasingan daripada rekod ini. Log masuk dengan alamat yang anda mahu gunakan; fail tidak boleh menetapkannya.',
    'restore.foot':
      'Tiada apa-apa ditulis sehingga anda melihat apa yang akan ditulis. Pengembalian fail direkodkan dalam jejak audit, bersama apa yang dikembalikannya.',
    'restore.fileLabel': 'Fail JSON yang dimuat turun oleh halaman eksport',
    'restore.fileHint':
      'Hamparan dan salinan boleh cetak adalah untuk dibaca; halaman ini memerlukan fail JSON. Namanya bermula dengan: {name}',
    'restore.check': 'Semak fail ini',
    'restore.checking': 'Menyemak…',
    'restore.another': 'Pilih fail lain',
    'restore.apply': 'Kembalikan apa yang boleh dikembalikan',
    'restore.applying': 'Mengembalikan…',
    'restore.different': 'Kembalikan fail yang lain',
    'restore.errLarge':
      'Fail ini lebih besar daripada saiz yang mungkin bagi salinan data anda. Pilih fail JSON yang dimuat turun oleh halaman eksport.',
    'restore.errNotJson':
      'Fail ini kosong atau bukan JSON. Pilih fail JSON yang dimuat turun oleh halaman eksport; hamparan dan salinan boleh cetak tidak boleh dikembalikan.',
    'restore.errNotExport':
      'Fail ini mengandungi JSON, tetapi ia bukan salinan data anda yang dibuat oleh platform ini.',
    'restore.errNewer':
      'Salinan ini dibuat oleh versi platform yang lebih baharu daripada yang boleh dibaca di sini, jadi ia tidak boleh dikembalikan di sini.',
    'restore.errSignedOut':
      'Anda telah log keluar. Log masuk semula, kemudian pilih fail itu sekali lagi. Tiada apa-apa berubah.',
    'restore.errCheckFailed':
      'Fail tidak dapat disemak, dan tiada apa-apa berubah. Semak sambungan anda dan cuba lagi.',
    'restore.errRefused': 'Platform menolak fail ini. Tiada apa-apa berubah.',
    'restore.unconfirmed':
      'Kami tidak dapat mengesahkan sama ada fail itu telah dikembalikan. Semak fail itu sekali lagi: entri yang sudah ada di sini dilangkau, jadi tiada apa-apa ditulis dua kali.',
    'restore.resultCheck': 'Apa yang akan dikembalikan oleh fail ini',
    'restore.resultApplied': 'Apa yang dikembalikan oleh fail ini',
    'restore.resultNothing':
      'Dalam keadaan sekarang, tiada apa-apa dalam fail ini boleh dikembalikan.',
    'restore.resultAllHere': 'Apa yang boleh dikembalikan oleh fail ini sudah ada di sini.',
    'restore.lineNotes': 'Nota: {count}',
    'restore.lineMarks': 'Penanda: {count}',
    'restore.lineProfile': 'Butiran profil: {fields}',
    'restore.lineHere': 'Sudah ada di sini dan dibiarkan seadanya: {count}',
    'restore.skippedHeading': 'Apa yang tinggal dalam fail, dan sebabnya',
    'restore.nothingWritten': 'Belum ada apa-apa ditulis. Menyemak fail tidak mengubah apa-apa.',
    'restore.afterApplied':
      'Fail anda tidak berubah, jadi ia boleh digunakan lagi: entri yang sudah ada di sini dilangkau, tidak ditulis dua kali. Perkara yang tidak pernah dikembalikan oleh mana-mana fail disenaraikan lebih bawah pada halaman ini.',
    'restore.fieldCountry': 'Negara',
    'restore.whereEntry': 'Entri tersimpan',
    'restore.whyNameBlank': 'Nama dalam fail kosong, dan profil tidak boleh mempunyai nama kosong.',
    'restore.whyNameLong':
      'Nama dalam fail terlalu panjang. Bilangan aksara terbanyak bagi nama: {count}',
    'restore.whyLanguage':
      'Bahasa dalam fail tidak ditulis dalam bentuk yang boleh disimpan oleh profil. Dalam fail: {value}',
    'restore.whyTimezone':
      'Zon waktu dalam fail bukan yang dikenali oleh platform ini. Dalam fail: {value}',
    'restore.whyCountry': 'Negara dalam fail bukan kod negara dua huruf. Dalam fail: {value}',
    'restore.whyNotList': 'Satu bahagian fail ini bukan senarai, jadi ia tidak dapat dibaca.',
    'restore.whyCapped':
      'Senarai ini lebih panjang daripada yang dibaca pada satu masa, jadi hanya permulaannya dibaca. Entri yang dibaca: {read}. Entri dalam fail: {held}',
    'restore.whyOff':
      'Nota dan penanda dimatikan pada platform ini, jadi tiada tempat untuk meletakkannya. Semuanya masih ada dalam fail anda.',
    'restore.whyNoteEmpty': 'Nota ini tiada teks.',
    'restore.whyNoteLong': 'Nota ini terlalu panjang. Bilangan aksara terbanyak bagi nota: {count}',
    'restore.whyNoLesson':
      'Entri ini tidak menamakan pelajaran, jadi tiada tempat untuk melekatkannya.',
    'restore.whyNotEnrolled':
      'Anda tidak berdaftar sekarang dalam kursus yang mempunyai pelajaran dengan nama ini.',
    'restore.whyAmbiguous':
      'Lebih daripada satu kursus anda mempunyai pelajaran dengan nama ini, dan fail tidak dapat menyatakan yang mana.',
    'restore.whyDiffers':
      'Sejak itu anda telah menulis nota lain pada pelajaran ini, dan nota itu tidak diganti.',
    'restore.whyNoAccess':
      'Pendaftaran aktif dalam kursus ini dan akses kepada pelajaran ini diperlukan.',
    'restore.whyOther': 'Entri ini tidak dapat dikembalikan.',
  },
  bn: {
    'restore.title': 'আপনার তথ্য ফিরিয়ে রাখুন',
    'restore.crumb': 'পুনরুদ্ধার',
    'restore.lede':
      'আপনি যদি আপনার তথ্যের একটি কপি ডাউনলোড করে থাকেন এবং তা ফিরিয়ে আনতে চান, বিরতির পরে এই অ্যাকাউন্টে বা নতুন কোনো অ্যাকাউন্টে, তবে এই পাতা সেই ফাইলটি পড়ে এবং তার যে অংশ আপনি নিজে লিখেছিলেন তা ফিরিয়ে রাখে।',
    'restore.canHeading': 'কী ফিরে আসতে পারে',
    'restore.canProfile': 'আপনার প্রোফাইল',
    'restore.canProfileNote':
      'নাম, ভাষা, সময় অঞ্চল ও দেশ। কেবল যেখানে ফাইলটি এখন এখানে যা আছে তার থেকে আলাদা, এবং কেবল সেই মান যা এই প্ল্যাটফর্ম রাখতে পারে।',
    'restore.canNotes': 'আপনার নোট ও বুকমার্ক',
    'restore.canNotesNote':
      'যে পাঠে লেখা হয়েছিল সেখানেই ফিরিয়ে রাখা হয়, তবে কেবল সেই কোর্সে যেখানে আপনি এখন ভর্তি আছেন। নোট একটি ভর্তির সঙ্গে যুক্ত, তাই যে কোর্স আপনি ছেড়ে দিয়েছেন সেখানে তা রাখার জায়গা নেই।',
    'restore.cannotHeading': 'কী পারে না, এবং কেন',
    'restore.cannotEnrol': 'ভর্তি',
    'restore.cannotEnrolNote':
      'ভর্তি একটি অধিকার, কখনো কখনো মূল্য দিয়ে পাওয়া অধিকার। যে ফাইল তা দিতে পারে সেটি কোর্স বিনামূল্যে বিলিয়ে দেওয়ার ফাইল হতো। আবার ভর্তি হোন, তারপর ফাইলটি দ্বিতীয়বার ব্যবহার করুন: আপনার নোট তাদের পাঠ খুঁজে পাবে।',
    'restore.cannotCert': 'সনদ',
    'restore.cannotCertNote':
      'সনদ প্ল্যাটফর্ম দেয়। ফাইল থেকে লেখা সনদ হতো এমন জালিয়াতি যা যাচাইয়ে উতরে যায়। আপনার ফাইলের নম্বরগুলো এখনো আসল, আর সনদ যাচাই এখনো সেগুলো নিশ্চিত করে।',
    'restore.cannotMoney': 'অর্ডার, অর্থ ফেরত ও অগ্রগতি',
    'restore.cannotMoneyNote':
      'এগুলো এখানে যা ঘটেছে তার রেকর্ড, যা প্ল্যাটফর্ম রাখে। ফাইল থেকে এর কোনোটি ফিরিয়ে রাখা কপি নয়, দাবি হতো। আপনার রসিদগুলো আপনার নিজের রেকর্ডের জন্য ফাইলেই থাকে।',
    'restore.cannotPublished': 'আপনি যা প্রকাশ করেছেন, এবং যার জন্য নম্বর পেয়েছেন',
    'restore.cannotPublishedNote':
      'পর্যালোচনা, আলোচনার পোস্ট ও অ্যাসাইনমেন্টের জমা প্রতিটি এখানে প্রকাশিত হয়েছিল এবং যেখানে দরকার ছিল সেখানে তদারক করা হয়েছিল। ফাইল থেকে সেগুলো আবার পোস্ট করলে এমন কথা প্রকাশিত হতো যা কেউ আবার পড়েনি।',
    'restore.cannotPeople': 'শিশু, ভূমিকা ও অনুমতি',
    'restore.cannotPeopleNote':
      'শিশুর প্রোফাইলে লেখা থাকে তার অভিভাবক কে, আর কর্মীর ভূমিকা একজন ব্যক্তি দেন, তা ফাইলে করে আসে না। দুটোই সেই পর্দা দিয়ে যোগ করা হয় যা কে করেছে তা লিখে রাখে।',
    'restore.cannotHistory': 'আপনার কার্যকলাপের ইতিহাস',
    'restore.cannotHistoryNote':
      'এটি এখানে যা ঘটেছে তার রেকর্ড এবং এতে কেবল যোগ করা যায়। ফাইল থেকে আনা ইতিহাস হতো বানানো ইতিহাস।',
    'restore.cannotSignIn': 'আপনার সাইন-ইন ঠিকানা ও পাসওয়ার্ড',
    'restore.cannotSignInNote':
      'দুটোই সাইন-ইন পরিষেবার কাছে থাকে, এই রেকর্ড থেকে আলাদা। যে ঠিকানা ব্যবহার করতে চান তা দিয়ে সাইন ইন করুন; ফাইল তা ঠিক করে দিতে পারে না।',
    'restore.foot':
      'কী লেখা হবে তা আপনি না দেখা পর্যন্ত কিছুই লেখা হয় না। ফাইল ফিরিয়ে রাখা অডিট লগে লেখা থাকে, কী ফিরিয়ে রাখা হয়েছে তা সহ।',
    'restore.fileLabel': 'এক্সপোর্ট পাতা যে JSON ফাইলটি ডাউনলোড করেছে',
    'restore.fileHint':
      'স্প্রেডশিট ও ছাপার উপযোগী কপি পড়ার জন্য; এই পাতার JSON ফাইলটি দরকার। তার নাম শুরু হয় এভাবে: {name}',
    'restore.check': 'এই ফাইলটি যাচাই করুন',
    'restore.checking': 'যাচাই হচ্ছে…',
    'restore.another': 'অন্য ফাইল বেছে নিন',
    'restore.apply': 'যা ফিরিয়ে রাখা যায় তা ফিরিয়ে রাখুন',
    'restore.applying': 'ফিরিয়ে রাখা হচ্ছে…',
    'restore.different': 'অন্য একটি ফাইল ফিরিয়ে রাখুন',
    'restore.errLarge':
      'আপনার তথ্যের কপি যত বড় হতে পারে এই ফাইলটি তার চেয়ে বড়। এক্সপোর্ট পাতা যে JSON ফাইলটি ডাউনলোড করেছে সেটি বেছে নিন।',
    'restore.errNotJson':
      'এই ফাইলটি খালি অথবা JSON নয়। এক্সপোর্ট পাতা যে JSON ফাইলটি ডাউনলোড করেছে সেটি বেছে নিন; স্প্রেডশিট ও ছাপার উপযোগী কপি ফিরিয়ে রাখা যায় না।',
    'restore.errNotExport':
      'এই ফাইলে JSON আছে, কিন্তু এটি এই প্ল্যাটফর্মের তৈরি আপনার তথ্যের কপি নয়।',
    'restore.errNewer':
      'এই কপিটি প্ল্যাটফর্মের এমন সংস্করণ তৈরি করেছে যা এখানে যা পড়া যায় তার চেয়ে নতুন, তাই এখানে তা ফিরিয়ে রাখা যায় না।',
    'restore.errSignedOut':
      'আপনি সাইন আউট হয়ে গেছেন। আবার সাইন ইন করুন, তারপর ফাইলটি আবার বেছে নিন। কিছুই বদলায়নি।',
    'restore.errCheckFailed':
      'ফাইলটি যাচাই করা যায়নি, এবং কিছুই বদলায়নি। আপনার সংযোগ দেখে আবার চেষ্টা করুন।',
    'restore.errRefused': 'প্ল্যাটফর্ম এই ফাইলটি প্রত্যাখ্যান করেছে। কিছুই বদলায়নি।',
    'restore.unconfirmed':
      'ফাইলটি ফিরিয়ে রাখা হয়েছে কি না আমরা নিশ্চিত হতে পারিনি। ফাইলটি আবার যাচাই করুন: যে ভুক্তি আগে থেকেই এখানে আছে তা বাদ দেওয়া হয়, তাই কিছুই দুবার লেখা হয় না।',
    'restore.resultCheck': 'এই ফাইল যা ফিরিয়ে রাখবে',
    'restore.resultApplied': 'এই ফাইল যা ফিরিয়ে রেখেছে',
    'restore.resultNothing': 'বর্তমান অবস্থায় এই ফাইলের কিছুই ফিরিয়ে রাখা যায় না।',
    'restore.resultAllHere': 'এই ফাইল যা ফিরিয়ে রাখতে পারে তা আগে থেকেই এখানে আছে।',
    'restore.lineNotes': 'নোট: {count}',
    'restore.lineMarks': 'বুকমার্ক: {count}',
    'restore.lineProfile': 'প্রোফাইলের বিবরণ: {fields}',
    'restore.lineHere': 'আগে থেকেই এখানে আছে এবং যেমন ছিল তেমন রাখা হয়েছে: {count}',
    'restore.skippedHeading': 'ফাইলে যা রয়ে গেল, এবং কেন',
    'restore.nothingWritten': 'এখনো কিছুই লেখা হয়নি। ফাইল যাচাই করলে কিছুই বদলায় না।',
    'restore.afterApplied':
      'আপনার ফাইল বদলায়নি, তাই তা আবার ব্যবহার করা যায়: যে ভুক্তি আগে থেকেই এখানে আছে তা বাদ দেওয়া হয়, দুবার লেখা হয় না। কোনো ফাইল যা কখনোই ফিরিয়ে রাখে না তা এই পাতার আরও নিচে লেখা আছে।',
    'restore.fieldCountry': 'দেশ',
    'restore.whereEntry': 'একটি সংরক্ষিত ভুক্তি',
    'restore.whyNameBlank': 'ফাইলে নামটি ফাঁকা, আর প্রোফাইলের নাম ফাঁকা হতে পারে না।',
    'restore.whyNameLong': 'ফাইলে নামটি খুব লম্বা। নামে সর্বোচ্চ অক্ষরের সংখ্যা: {count}',
    'restore.whyLanguage': 'ফাইলে ভাষাটি এমন রূপে লেখা নেই যা প্রোফাইল রাখতে পারে। ফাইলে: {value}',
    'restore.whyTimezone': 'ফাইলের সময় অঞ্চলটি এই প্ল্যাটফর্মের জানা নয়। ফাইলে: {value}',
    'restore.whyCountry': 'ফাইলে দেশটি দুই অক্ষরের দেশ-কোড নয়। ফাইলে: {value}',
    'restore.whyNotList': 'এই ফাইলের একটি অংশ তালিকা নয়, তাই তা পড়া যায়নি।',
    'restore.whyCapped':
      'এই তালিকাটি একবারে যতটা পড়া হয় তার চেয়ে লম্বা, তাই কেবল তার শুরুটা পড়া হয়। পড়া ভুক্তি: {read}। ফাইলে ভুক্তি: {held}',
    'restore.whyOff':
      'এই প্ল্যাটফর্মে নোট ও বুকমার্ক বন্ধ আছে, তাই সেগুলো রাখার জায়গা নেই। সেগুলো এখনো আপনার ফাইলে আছে।',
    'restore.whyNoteEmpty': 'এই নোটে কোনো লেখা নেই।',
    'restore.whyNoteLong': 'এই নোটটি খুব লম্বা। নোটে সর্বোচ্চ অক্ষরের সংখ্যা: {count}',
    'restore.whyNoLesson': 'এই ভুক্তিতে কোনো পাঠের নাম নেই, তাই একে জোড়ার মতো কিছু নেই।',
    'restore.whyNotEnrolled': 'এই নামের পাঠ আছে এমন কোনো কোর্সে আপনি এখন ভর্তি নন।',
    'restore.whyAmbiguous': 'আপনার একাধিক কোর্সে এই নামের পাঠ আছে, আর ফাইল বলতে পারে না কোনটি।',
    'restore.whyDiffers': 'এর পরে আপনি এই পাঠে অন্য একটি নোট লিখেছেন, এবং সেটি বদলানো হয়নি।',
    'restore.whyNoAccess': 'এই কোর্সে সক্রিয় ভর্তি এবং এই পাঠে প্রবেশাধিকার দরকার।',
    'restore.whyOther': 'এই ভুক্তিটি ফিরিয়ে রাখা যায়নি।',
  },
  hi: {
    'restore.title': 'अपना डेटा वापस रखें',
    'restore.crumb': 'पुनर्स्थापना',
    'restore.lede':
      'यदि आपने अपने डेटा की प्रति डाउनलोड की थी और उसे वापस चाहते हैं, अंतराल के बाद इसी खाते पर या किसी नए खाते पर, तो यह पेज उस फ़ाइल को पढ़ता है और उसका वह भाग वापस रखता है जो आपने स्वयं लिखा था।',
    'restore.canHeading': 'क्या वापस आ सकता है',
    'restore.canProfile': 'आपकी प्रोफ़ाइल',
    'restore.canProfileNote':
      'नाम, भाषा, समय क्षेत्र और देश। केवल वहाँ जहाँ फ़ाइल उससे अलग है जो अभी यहाँ है, और केवल वे मान जिन्हें यह प्लेटफ़ॉर्म रख सकता है।',
    'restore.canNotes': 'आपके नोट्स और बुकमार्क',
    'restore.canNotesNote':
      'उन्हीं पाठों पर वापस रखे जाते हैं जिन पर लिखे गए थे, पर केवल उन कोर्सों में जिनमें आपका अभी नामांकन है। नोट एक नामांकन से जुड़ा होता है, इसलिए जिस कोर्स को आप छोड़ चुके हैं उसमें उसे रखने की जगह नहीं है।',
    'restore.cannotHeading': 'क्या नहीं आ सकता, और क्यों',
    'restore.cannotEnrol': 'नामांकन',
    'restore.cannotEnrolNote':
      'नामांकन एक अधिकार है, और कभी-कभी भुगतान से मिला अधिकार। जो फ़ाइल उसे दे सके वह कोर्स मुफ़्त बाँटने वाली फ़ाइल होगी। फिर से नामांकन करें, फिर फ़ाइल को दूसरी बार उपयोग करें: आपके नोट्स अपने पाठ पा लेंगे।',
    'restore.cannotCert': 'प्रमाणपत्र',
    'restore.cannotCertNote':
      'प्रमाणपत्र प्लेटफ़ॉर्म जारी करता है। फ़ाइल से लिखा गया प्रमाणपत्र ऐसी जालसाज़ी होगी जो जाँच में पास हो जाए। आपकी फ़ाइल के नंबर अब भी असली हैं, और प्रमाणपत्र की जाँच अब भी उनकी पुष्टि करती है।',
    'restore.cannotMoney': 'ऑर्डर, धनवापसी और प्रगति',
    'restore.cannotMoneyNote':
      'ये यहाँ जो हुआ उसके अभिलेख हैं, जिन्हें प्लेटफ़ॉर्म रखता है। इनमें से किसी को फ़ाइल से वापस रखना प्रति नहीं, दावा होगा। आपकी रसीदें आपके अपने अभिलेख के लिए फ़ाइल में रहती हैं।',
    'restore.cannotPublished': 'जो आपने प्रकाशित किया, और जिस पर आपको अंक मिले',
    'restore.cannotPublishedNote':
      'समीक्षाएँ, चर्चा की पोस्ट और असाइनमेंट की प्रस्तुतियाँ हर एक यहाँ प्रकाशित हुई और जहाँ ज़रूरत थी वहाँ उसकी निगरानी की गई। उन्हें फ़ाइल से फिर पोस्ट करना ऐसे शब्द प्रकाशित करना होगा जिन्हें किसी ने दोबारा नहीं पढ़ा।',
    'restore.cannotPeople': 'बच्चे, भूमिकाएँ और अनुमतियाँ',
    'restore.cannotPeopleNote':
      'बच्चे की प्रोफ़ाइल में दर्ज होता है कि उसका अभिभावक कौन है, और कर्मचारी की भूमिका कोई व्यक्ति देता है, वह फ़ाइल में नहीं आती। दोनों उन स्क्रीन से जोड़े जाते हैं जो दर्ज करती हैं कि यह किसने किया।',
    'restore.cannotHistory': 'आपकी गतिविधि का इतिहास',
    'restore.cannotHistoryNote':
      'यह यहाँ जो हुआ उसका अभिलेख है और इसमें केवल जोड़ा जा सकता है। फ़ाइल से लाया गया इतिहास गढ़ा हुआ इतिहास होगा।',
    'restore.cannotSignIn': 'आपका साइन-इन पता और पासवर्ड',
    'restore.cannotSignInNote':
      'दोनों साइन-इन सेवा के पास रहते हैं, इस अभिलेख से अलग। जिस पते का उपयोग करना चाहते हैं उसी से साइन इन करें; फ़ाइल उसे तय नहीं कर सकती।',
    'restore.foot':
      'जब तक आप देख न लें कि क्या लिखा जाएगा, कुछ नहीं लिखा जाता। फ़ाइल वापस रखना ऑडिट रिकॉर्ड में दर्ज होता है, इसके साथ कि क्या वापस रखा गया।',
    'restore.fileLabel': 'वह JSON फ़ाइल जो निर्यात पेज ने डाउनलोड की',
    'restore.fileHint':
      'स्प्रेडशीट और छापने योग्य प्रति पढ़ने के लिए हैं; इस पेज को JSON फ़ाइल चाहिए। उसका नाम इस तरह शुरू होता है: {name}',
    'restore.check': 'इस फ़ाइल को जाँचें',
    'restore.checking': 'जाँच हो रही है…',
    'restore.another': 'दूसरी फ़ाइल चुनें',
    'restore.apply': 'जो वापस रखा जा सकता है उसे वापस रखें',
    'restore.applying': 'वापस रखा जा रहा है…',
    'restore.different': 'कोई और फ़ाइल वापस रखें',
    'restore.errLarge':
      'यह फ़ाइल उससे बड़ी है जितनी आपके डेटा की प्रति हो सकती है। वह JSON फ़ाइल चुनें जो निर्यात पेज ने डाउनलोड की थी।',
    'restore.errNotJson':
      'यह फ़ाइल खाली है या JSON नहीं है। वह JSON फ़ाइल चुनें जो निर्यात पेज ने डाउनलोड की थी; स्प्रेडशीट और छापने योग्य प्रति वापस नहीं रखी जा सकतीं।',
    'restore.errNotExport':
      'इस फ़ाइल में JSON है, पर यह आपके डेटा की वह प्रति नहीं है जो इस प्लेटफ़ॉर्म ने बनाई हो।',
    'restore.errNewer':
      'यह प्रति प्लेटफ़ॉर्म के उस संस्करण ने बनाई है जो यहाँ पढ़े जाने वाले संस्करण से नया है, इसलिए इसे यहाँ वापस नहीं रखा जा सकता।',
    'restore.errSignedOut':
      'आप साइन आउट हो चुके हैं। फिर से साइन इन करें, फिर फ़ाइल दोबारा चुनें। कुछ नहीं बदला।',
    'restore.errCheckFailed':
      'फ़ाइल की जाँच नहीं हो सकी, और कुछ नहीं बदला। अपना कनेक्शन देखें और फिर प्रयास करें।',
    'restore.errRefused': 'प्लेटफ़ॉर्म ने यह फ़ाइल अस्वीकार कर दी। कुछ नहीं बदला।',
    'restore.unconfirmed':
      'हम पुष्टि नहीं कर सके कि फ़ाइल वापस रखी गई या नहीं। फ़ाइल को फिर जाँचें: जो प्रविष्टि पहले से यहाँ है उसे छोड़ दिया जाता है, इसलिए कुछ भी दो बार नहीं लिखा जाता।',
    'restore.resultCheck': 'यह फ़ाइल क्या वापस रखेगी',
    'restore.resultApplied': 'इस फ़ाइल ने क्या वापस रखा',
    'restore.resultNothing': 'वर्तमान स्थिति में इस फ़ाइल से कुछ भी वापस नहीं रखा जा सकता।',
    'restore.resultAllHere': 'यह फ़ाइल जो वापस रख सकती है वह पहले से यहाँ है।',
    'restore.lineNotes': 'नोट्स: {count}',
    'restore.lineMarks': 'बुकमार्क: {count}',
    'restore.lineProfile': 'प्रोफ़ाइल के विवरण: {fields}',
    'restore.lineHere': 'पहले से यहाँ हैं और जैसे थे वैसे छोड़े गए: {count}',
    'restore.skippedHeading': 'फ़ाइल में क्या रह गया, और क्यों',
    'restore.nothingWritten': 'अभी कुछ नहीं लिखा गया है। फ़ाइल की जाँच कुछ नहीं बदलती।',
    'restore.afterApplied':
      'आपकी फ़ाइल नहीं बदली है, इसलिए उसे फिर उपयोग किया जा सकता है: जो प्रविष्टि पहले से यहाँ है उसे छोड़ दिया जाता है, दो बार नहीं लिखा जाता। जो चीज़ें कोई फ़ाइल कभी वापस नहीं रखती वे इसी पेज पर नीचे दी गई हैं।',
    'restore.fieldCountry': 'देश',
    'restore.whereEntry': 'एक सहेजी गई प्रविष्टि',
    'restore.whyNameBlank': 'फ़ाइल में नाम खाली है, और प्रोफ़ाइल का नाम खाली नहीं हो सकता।',
    'restore.whyNameLong': 'फ़ाइल में नाम बहुत लंबा है। नाम में अधिकतम वर्ण: {count}',
    'restore.whyLanguage':
      'फ़ाइल में भाषा उस रूप में नहीं लिखी है जिसे प्रोफ़ाइल रख सके। फ़ाइल में: {value}',
    'restore.whyTimezone':
      'फ़ाइल का समय क्षेत्र वह नहीं है जिसे यह प्लेटफ़ॉर्म जानता हो। फ़ाइल में: {value}',
    'restore.whyCountry': 'फ़ाइल में देश दो अक्षरों का देश कोड नहीं है। फ़ाइल में: {value}',
    'restore.whyNotList': 'इस फ़ाइल का एक भाग सूची नहीं है, इसलिए उसे पढ़ा नहीं जा सका।',
    'restore.whyCapped':
      'यह सूची उससे लंबी है जितनी एक बार में पढ़ी जाती है, इसलिए केवल उसका आरंभ पढ़ा जाता है। पढ़ी गई प्रविष्टियाँ: {read}। फ़ाइल में प्रविष्टियाँ: {held}',
    'restore.whyOff':
      'इस प्लेटफ़ॉर्म पर नोट्स और बुकमार्क बंद हैं, इसलिए उन्हें रखने की जगह नहीं है। वे अब भी आपकी फ़ाइल में हैं।',
    'restore.whyNoteEmpty': 'इस नोट में कोई पाठ्य नहीं है।',
    'restore.whyNoteLong': 'यह नोट बहुत लंबा है। नोट में अधिकतम वर्ण: {count}',
    'restore.whyNoLesson':
      'इस प्रविष्टि में किसी पाठ का नाम नहीं है, इसलिए इसे जोड़ने के लिए कुछ नहीं है।',
    'restore.whyNotEnrolled':
      'आपका अभी किसी ऐसे कोर्स में नामांकन नहीं है जिसमें इस नाम का पाठ हो।',
    'restore.whyAmbiguous':
      'आपके एक से अधिक कोर्सों में इस नाम का पाठ है, और फ़ाइल नहीं बता सकती कि कौन सा।',
    'restore.whyDiffers': 'उसके बाद आप इस पाठ पर एक अलग नोट लिख चुके हैं, और उसे बदला नहीं गया।',
    'restore.whyNoAccess': 'इस कोर्स में सक्रिय नामांकन और इस पाठ तक पहुँच चाहिए।',
    'restore.whyOther': 'यह प्रविष्टि वापस नहीं रखी जा सकी।',
  },
  fr: {
    'restore.title': 'Remettre vos données',
    'restore.crumb': 'Restauration',
    'restore.lede':
      'Si vous avez téléchargé une copie de vos données et souhaitez la retrouver, sur ce compte après une pause ou sur un nouveau compte, cette page lit ce fichier et remet la partie que vous avez écrite.',
    'restore.canHeading': 'Ce qui peut revenir',
    'restore.canProfile': 'Votre profil',
    'restore.canProfileNote':
      'Nom, langue, fuseau horaire et pays. Seulement là où le fichier diffère de ce qui se trouve ici aujourd’hui, et seulement les valeurs que cette plateforme peut conserver.',
    'restore.canNotes': 'Vos notes et vos signets',
    'restore.canNotesNote':
      'Remis sur les leçons où ils ont été écrits, mais seulement dans les cours auxquels vous êtes inscrit aujourd’hui. Une note appartient à une inscription : un cours que vous avez quitté n’a donc nulle part où la mettre.',
    'restore.cannotHeading': 'Ce qui ne le peut pas, et pourquoi',
    'restore.cannotEnrol': 'Les inscriptions',
    'restore.cannotEnrolNote':
      'Une inscription est un droit, parfois payant. Un fichier capable d’en accorder une serait un fichier qui distribue des cours gratuitement. Inscrivez-vous de nouveau, puis utilisez le fichier une seconde fois : vos notes retrouveront leurs leçons.',
    'restore.cannotCert': 'Les certificats',
    'restore.cannotCertNote':
      'Un certificat est délivré par la plateforme. Un certificat écrit à partir d’un fichier serait un faux qui passe la vérification. Les numéros de votre fichier restent authentiques, et la vérification des certificats les confirme toujours.',
    'restore.cannotMoney': 'Les commandes, les remboursements et la progression',
    'restore.cannotMoneyNote':
      'Ce sont des traces de ce qui s’est passé ici, tenues par la plateforme. En remettre une à partir d’un fichier serait une affirmation, non une copie. Vos reçus restent dans le fichier pour vos propres archives.',
    'restore.cannotPublished': 'Ce que vous avez publié, et ce sur quoi vous avez été noté',
    'restore.cannotPublishedNote':
      'Les avis, les messages de discussion et les devoirs remis ont chacun été publiés ici et, lorsque c’était nécessaire, modérés. Les publier de nouveau à partir d’un fichier publierait des mots que personne n’a relus.',
    'restore.cannotPeople': 'Les enfants, les rôles et les autorisations',
    'restore.cannotPeopleNote':
      'Le profil d’un enfant indique qui est son tuteur, et un rôle d’équipe est accordé par une personne, non transporté dans un fichier. Les deux s’ajoutent par les écrans qui enregistrent qui l’a fait.',
    'restore.cannotHistory': 'Votre historique d’activité',
    'restore.cannotHistoryNote':
      'C’est une trace de ce qui s’est passé ici, à laquelle on ne peut qu’ajouter. Un historique importé d’un fichier serait un historique inventé.',
    'restore.cannotSignIn': 'Votre adresse de connexion et votre mot de passe',
    'restore.cannotSignInNote':
      'Les deux sont conservés par le service de connexion, à part de ces données. Connectez-vous avec l’adresse que vous voulez utiliser ; un fichier ne peut pas la définir.',
    'restore.foot':
      'Rien n’est écrit avant que vous ayez vu ce qui serait écrit. La remise d’un fichier est consignée dans le journal d’audit, avec ce qu’elle a remis.',
    'restore.fileLabel': 'Le fichier JSON téléchargé par la page d’exportation',
    'restore.fileHint':
      'La feuille de calcul et la copie imprimable servent à lire ; cette page a besoin du fichier JSON. Son nom commence par : {name}',
    'restore.check': 'Vérifier ce fichier',
    'restore.checking': 'Vérification…',
    'restore.another': 'Choisir un autre fichier',
    'restore.apply': 'Remettre ce qui peut l’être',
    'restore.applying': 'Remise en cours…',
    'restore.different': 'Remettre un autre fichier',
    'restore.errLarge':
      'Ce fichier est plus volumineux qu’une copie de vos données ne peut l’être. Choisissez le fichier JSON téléchargé par la page d’exportation.',
    'restore.errNotJson':
      'Ce fichier est vide ou n’est pas du JSON. Choisissez le fichier JSON téléchargé par la page d’exportation ; la feuille de calcul et la copie imprimable ne peuvent pas être remises.',
    'restore.errNotExport':
      'Ce fichier contient du JSON, mais ce n’est pas une copie de vos données produite par cette plateforme.',
    'restore.errNewer':
      'Cette copie a été produite par une version de la plateforme plus récente que celle qui lit ici ; elle ne peut donc pas être remise ici.',
    'restore.errSignedOut':
      'Vous êtes déconnecté. Reconnectez-vous, puis choisissez de nouveau le fichier. Rien n’a été modifié.',
    'restore.errCheckFailed':
      'Le fichier n’a pas pu être vérifié, et rien n’a été modifié. Vérifiez votre connexion et réessayez.',
    'restore.errRefused': 'La plateforme a refusé ce fichier. Rien n’a été modifié.',
    'restore.unconfirmed':
      'Nous n’avons pas pu confirmer que le fichier a été remis. Vérifiez de nouveau le fichier : une entrée déjà présente ici est ignorée, donc rien n’est écrit deux fois.',
    'restore.resultCheck': 'Ce que ce fichier remettrait',
    'restore.resultApplied': 'Ce que ce fichier a remis',
    'restore.resultNothing': 'En l’état, rien dans ce fichier ne peut être remis.',
    'restore.resultAllHere': 'Ce que ce fichier peut remettre se trouve déjà ici.',
    'restore.lineNotes': 'Notes : {count}',
    'restore.lineMarks': 'Signets : {count}',
    'restore.lineProfile': 'Éléments du profil : {fields}',
    'restore.lineHere': 'Déjà ici et laissés tels quels : {count}',
    'restore.skippedHeading': 'Ce qui est resté dans le fichier, et pourquoi',
    'restore.nothingWritten': 'Rien n’a encore été écrit. Vérifier un fichier ne modifie rien.',
    'restore.afterApplied':
      'Votre fichier n’a pas changé ; il peut donc resservir : une entrée déjà présente ici est ignorée, non écrite deux fois. Ce qu’aucun fichier ne remet jamais est indiqué plus bas sur cette page.',
    'restore.fieldCountry': 'Pays',
    'restore.whereEntry': 'Une entrée enregistrée',
    'restore.whyNameBlank':
      'Le nom dans le fichier est vide, et un profil ne peut pas avoir un nom vide.',
    'restore.whyNameLong':
      'Le nom dans le fichier est trop long. Nombre maximal de caractères d’un nom : {count}',
    'restore.whyLanguage':
      'La langue dans le fichier n’est pas écrite sous une forme que le profil peut conserver. Dans le fichier : {value}',
    'restore.whyTimezone':
      'Le fuseau horaire dans le fichier n’est pas connu de cette plateforme. Dans le fichier : {value}',
    'restore.whyCountry':
      'Le pays dans le fichier n’est pas un code de pays à deux lettres. Dans le fichier : {value}',
    'restore.whyNotList':
      'Une partie de ce fichier n’est pas une liste ; elle n’a donc pas pu être lue.',
    'restore.whyCapped':
      'Cette liste est plus longue que ce qui est lu en une fois ; seul son début est lu. Entrées lues : {read}. Entrées dans le fichier : {held}',
    'restore.whyOff':
      'Les notes et les signets sont désactivés sur cette plateforme ; il n’y a donc nulle part où les mettre. Ils sont toujours dans votre fichier.',
    'restore.whyNoteEmpty': 'Cette note n’a pas de texte.',
    'restore.whyNoteLong':
      'Cette note est trop longue. Nombre maximal de caractères d’une note : {count}',
    'restore.whyNoLesson':
      'Cette entrée ne nomme aucune leçon ; il n’y a donc rien à quoi la rattacher.',
    'restore.whyNotEnrolled':
      'Vous n’êtes pas inscrit aujourd’hui à un cours comportant une leçon de ce nom.',
    'restore.whyAmbiguous':
      'Plusieurs de vos cours comportent une leçon de ce nom, et le fichier ne peut pas dire laquelle.',
    'restore.whyDiffers':
      'Vous avez depuis écrit une autre note sur cette leçon, et elle n’a pas été remplacée.',
    'restore.whyNoAccess':
      'Une inscription active à ce cours et l’accès à cette leçon sont nécessaires.',
    'restore.whyOther': 'Cette entrée n’a pas pu être remise.',
  },
  es: {
    'restore.title': 'Vuelva a poner sus datos',
    'restore.crumb': 'Restauración',
    'restore.lede':
      'Si descargó una copia de sus datos y quiere recuperarla, en esta cuenta tras una pausa o en una cuenta nueva, esta página lee ese archivo y vuelve a poner la parte que usted escribió.',
    'restore.canHeading': 'Lo que puede volver',
    'restore.canProfile': 'Su perfil',
    'restore.canProfileNote':
      'Nombre, idioma, zona horaria y país. Solo donde el archivo difiere de lo que hay aquí ahora, y solo los valores que esta plataforma puede guardar.',
    'restore.canNotes': 'Sus notas y sus marcadores',
    'restore.canNotesNote':
      'Se vuelven a poner en las lecciones donde se escribieron, pero solo en los cursos en los que está inscrito ahora. Una nota pertenece a una inscripción, así que un curso que ha dejado no tiene dónde ponerla.',
    'restore.cannotHeading': 'Lo que no puede, y por qué',
    'restore.cannotEnrol': 'Las inscripciones',
    'restore.cannotEnrolNote':
      'Una inscripción es un derecho, y a veces uno de pago. Un archivo capaz de concederla sería un archivo que regala cursos. Inscríbase de nuevo y luego use el archivo por segunda vez: sus notas encontrarán sus lecciones.',
    'restore.cannotCert': 'Los certificados',
    'restore.cannotCertNote':
      'Un certificado lo emite la plataforma. Uno escrito a partir de un archivo sería una falsificación que supera la comprobación. Los números de su archivo siguen siendo auténticos, y la comprobación de certificados los sigue confirmando.',
    'restore.cannotMoney': 'Los pedidos, los reembolsos y el progreso',
    'restore.cannotMoneyNote':
      'Son registros de lo que ocurrió aquí, que guarda la plataforma. Volver a poner uno a partir de un archivo sería una afirmación, no una copia. Sus recibos permanecen en el archivo para sus propios registros.',
    'restore.cannotPublished': 'Lo que publicó y aquello por lo que fue calificado',
    'restore.cannotPublishedNote':
      'Las reseñas, los mensajes de debate y las entregas de tareas se publicaron aquí cada uno y, donde hizo falta, se moderaron. Publicarlos otra vez desde un archivo publicaría palabras que nadie ha vuelto a leer.',
    'restore.cannotPeople': 'Los niños, los roles y los permisos',
    'restore.cannotPeopleNote':
      'El perfil de un niño registra quién es su tutor, y un rol del equipo lo concede una persona, no se lleva en un archivo. Ambos se añaden mediante las pantallas que registran quién lo hizo.',
    'restore.cannotHistory': 'Su historial de actividad',
    'restore.cannotHistoryNote':
      'Es un registro de lo que ocurrió aquí y solo se le puede añadir. Un historial traído de un archivo sería un historial inventado.',
    'restore.cannotSignIn': 'Su dirección de acceso y su contraseña',
    'restore.cannotSignInNote':
      'Ambas las guarda el servicio de acceso, aparte de este registro. Acceda con la dirección que quiera usar; un archivo no puede establecerla.',
    'restore.foot':
      'No se escribe nada hasta que haya visto lo que se escribiría. Volver a poner un archivo queda anotado en el registro de auditoría, con lo que se volvió a poner.',
    'restore.fileLabel': 'El archivo JSON que descargó la página de exportación',
    'restore.fileHint':
      'La hoja de cálculo y la copia imprimible son para leer; esta página necesita el archivo JSON. Su nombre empieza por: {name}',
    'restore.check': 'Comprobar este archivo',
    'restore.checking': 'Comprobando…',
    'restore.another': 'Elegir otro archivo',
    'restore.apply': 'Volver a poner lo que se pueda',
    'restore.applying': 'Volviendo a poner…',
    'restore.different': 'Volver a poner otro archivo',
    'restore.errLarge':
      'Este archivo es más grande de lo que puede ser una copia de sus datos. Elija el archivo JSON que descargó la página de exportación.',
    'restore.errNotJson':
      'Este archivo está vacío o no es JSON. Elija el archivo JSON que descargó la página de exportación; la hoja de cálculo y la copia imprimible no se pueden volver a poner.',
    'restore.errNotExport':
      'Este archivo contiene JSON, pero no es una copia de sus datos hecha por esta plataforma.',
    'restore.errNewer':
      'Esta copia la hizo una versión de la plataforma más reciente que la que se lee aquí, así que no se puede volver a poner aquí.',
    'restore.errSignedOut':
      'Se ha cerrado su sesión. Acceda de nuevo y vuelva a elegir el archivo. No se cambió nada.',
    'restore.errCheckFailed':
      'No se pudo comprobar el archivo, y no se cambió nada. Revise su conexión e inténtelo de nuevo.',
    'restore.errRefused': 'La plataforma rechazó este archivo. No se cambió nada.',
    'restore.unconfirmed':
      'No pudimos confirmar si el archivo se volvió a poner. Compruebe el archivo otra vez: una entrada que ya está aquí se omite, así que nada se escribe dos veces.',
    'restore.resultCheck': 'Lo que este archivo volvería a poner',
    'restore.resultApplied': 'Lo que este archivo volvió a poner',
    'restore.resultNothing':
      'Tal como están las cosas, nada de este archivo se puede volver a poner.',
    'restore.resultAllHere': 'Lo que este archivo puede volver a poner ya está aquí.',
    'restore.lineNotes': 'Notas: {count}',
    'restore.lineMarks': 'Marcadores: {count}',
    'restore.lineProfile': 'Datos del perfil: {fields}',
    'restore.lineHere': 'Ya estaban aquí y se dejaron como están: {count}',
    'restore.skippedHeading': 'Lo que quedó en el archivo, y por qué',
    'restore.nothingWritten': 'Todavía no se ha escrito nada. Comprobar un archivo no cambia nada.',
    'restore.afterApplied':
      'Su archivo no ha cambiado, así que puede usarse otra vez: una entrada que ya está aquí se omite, no se escribe dos veces. Lo que ningún archivo vuelve a poner nunca figura más abajo en esta página.',
    'restore.fieldCountry': 'País',
    'restore.whereEntry': 'Una entrada guardada',
    'restore.whyNameBlank':
      'El nombre del archivo está en blanco, y un perfil no puede tener un nombre en blanco.',
    'restore.whyNameLong':
      'El nombre del archivo es demasiado largo. Número máximo de caracteres de un nombre: {count}',
    'restore.whyLanguage':
      'El idioma del archivo no está escrito en una forma que el perfil pueda guardar. En el archivo: {value}',
    'restore.whyTimezone':
      'La zona horaria del archivo no es una que esta plataforma conozca. En el archivo: {value}',
    'restore.whyCountry':
      'El país del archivo no es un código de país de dos letras. En el archivo: {value}',
    'restore.whyNotList': 'Una parte de este archivo no es una lista, así que no se pudo leer.',
    'restore.whyCapped':
      'Esta lista es más larga de lo que se lee de una vez, así que solo se lee su comienzo. Entradas leídas: {read}. Entradas en el archivo: {held}',
    'restore.whyOff':
      'Las notas y los marcadores están desactivados en esta plataforma, así que no hay dónde ponerlos. Siguen en su archivo.',
    'restore.whyNoteEmpty': 'Esta nota no tiene texto.',
    'restore.whyNoteLong':
      'Esta nota es demasiado larga. Número máximo de caracteres de una nota: {count}',
    'restore.whyNoLesson':
      'Esta entrada no nombra ninguna lección, así que no hay a qué adjuntarla.',
    'restore.whyNotEnrolled':
      'Ahora no está inscrito en ningún curso que tenga una lección con este nombre.',
    'restore.whyAmbiguous':
      'Más de uno de sus cursos tiene una lección con este nombre, y el archivo no puede decir cuál.',
    'restore.whyDiffers':
      'Desde entonces ha escrito una nota distinta en esta lección, y no se sustituyó.',
    'restore.whyNoAccess':
      'Hacen falta una inscripción activa en este curso y acceso a esta lección.',
    'restore.whyOther': 'Esta entrada no se pudo volver a poner.',
  },
  pt: {
    'restore.title': 'Reponha os seus dados',
    'restore.crumb': 'Reposição',
    'restore.lede':
      'Se descarregou uma cópia dos seus dados e a quer de volta, nesta conta depois de uma pausa ou numa conta nova, esta página lê esse ficheiro e repõe a parte que foi escrita por si.',
    'restore.canHeading': 'O que pode voltar',
    'restore.canProfile': 'O seu perfil',
    'restore.canProfileNote':
      'Nome, idioma, fuso horário e país. Apenas onde o ficheiro difere do que está aqui agora, e apenas valores que esta plataforma consegue guardar.',
    'restore.canNotes': 'As suas notas e os seus marcadores',
    'restore.canNotesNote':
      'São repostos nas aulas em que foram escritos, mas apenas nos cursos em que está inscrito agora. Uma nota pertence a uma inscrição, pelo que um curso que deixou não tem onde a pôr.',
    'restore.cannotHeading': 'O que não pode, e porquê',
    'restore.cannotEnrol': 'As inscrições',
    'restore.cannotEnrolNote':
      'Uma inscrição é um direito, por vezes pago. Um ficheiro capaz de a conceder seria um ficheiro que oferece cursos. Inscreva-se de novo e depois use o ficheiro uma segunda vez: as suas notas encontrarão as suas aulas.',
    'restore.cannotCert': 'Os certificados',
    'restore.cannotCertNote':
      'Um certificado é emitido pela plataforma. Um certificado escrito a partir de um ficheiro seria uma falsificação que passa na verificação. Os números do seu ficheiro continuam a ser verdadeiros, e a verificação de certificados continua a confirmá-los.',
    'restore.cannotMoney': 'As encomendas, os reembolsos e o progresso',
    'restore.cannotMoneyNote':
      'São registos do que aconteceu aqui, guardados pela plataforma. Repor um deles a partir de um ficheiro seria uma alegação, não uma cópia. Os seus recibos ficam no ficheiro para os seus próprios registos.',
    'restore.cannotPublished': 'O que publicou e aquilo em que foi avaliado',
    'restore.cannotPublishedNote':
      'As avaliações, as mensagens de discussão e as entregas de trabalhos foram cada uma publicadas aqui e, onde foi preciso, moderadas. Publicá-las de novo a partir de um ficheiro publicaria palavras que ninguém voltou a ler.',
    'restore.cannotPeople': 'As crianças, as funções e as permissões',
    'restore.cannotPeopleNote':
      'O perfil de uma criança regista quem é o seu tutor, e uma função da equipa é atribuída por uma pessoa, não vem num ficheiro. Ambos são acrescentados através dos ecrãs que registam quem o fez.',
    'restore.cannotHistory': 'O seu histórico de atividade',
    'restore.cannotHistoryNote':
      'É um registo do que aconteceu aqui e só se lhe pode acrescentar. Um histórico trazido de um ficheiro seria um histórico inventado.',
    'restore.cannotSignIn': 'O seu endereço de acesso e a sua palavra-passe',
    'restore.cannotSignInNote':
      'Ambos são guardados pelo serviço de acesso, à parte deste registo. Entre com o endereço que quer usar; um ficheiro não o pode definir.',
    'restore.foot':
      'Nada é escrito antes de ter visto o que seria escrito. A reposição de um ficheiro fica anotada no registo de auditoria, com o que foi reposto.',
    'restore.fileLabel': 'O ficheiro JSON que a página de exportação descarregou',
    'restore.fileHint':
      'A folha de cálculo e a cópia para imprimir servem para ler; esta página precisa do ficheiro JSON. O nome dele começa por: {name}',
    'restore.check': 'Verificar este ficheiro',
    'restore.checking': 'A verificar…',
    'restore.another': 'Escolher outro ficheiro',
    'restore.apply': 'Repor o que pode ser reposto',
    'restore.applying': 'A repor…',
    'restore.different': 'Repor um ficheiro diferente',
    'restore.errLarge':
      'Este ficheiro é maior do que uma cópia dos seus dados pode ser. Escolha o ficheiro JSON que a página de exportação descarregou.',
    'restore.errNotJson':
      'Este ficheiro está vazio ou não é JSON. Escolha o ficheiro JSON que a página de exportação descarregou; a folha de cálculo e a cópia para imprimir não podem ser repostas.',
    'restore.errNotExport':
      'Este ficheiro contém JSON, mas não é uma cópia dos seus dados feita por esta plataforma.',
    'restore.errNewer':
      'Esta cópia foi feita por uma versão da plataforma mais recente do que a que é lida aqui, pelo que não pode ser reposta aqui.',
    'restore.errSignedOut':
      'A sua sessão foi terminada. Entre de novo e volte a escolher o ficheiro. Nada foi alterado.',
    'restore.errCheckFailed':
      'Não foi possível verificar o ficheiro, e nada foi alterado. Verifique a sua ligação e tente de novo.',
    'restore.errRefused': 'A plataforma recusou este ficheiro. Nada foi alterado.',
    'restore.unconfirmed':
      'Não conseguimos confirmar se o ficheiro foi reposto. Verifique o ficheiro outra vez: uma entrada que já está aqui é ignorada, pelo que nada é escrito duas vezes.',
    'restore.resultCheck': 'O que este ficheiro reporia',
    'restore.resultApplied': 'O que este ficheiro repôs',
    'restore.resultNothing': 'Tal como as coisas estão, nada neste ficheiro pode ser reposto.',
    'restore.resultAllHere': 'O que este ficheiro pode repor já está aqui.',
    'restore.lineNotes': 'Notas: {count}',
    'restore.lineMarks': 'Marcadores: {count}',
    'restore.lineProfile': 'Dados do perfil: {fields}',
    'restore.lineHere': 'Já estavam aqui e ficaram como estão: {count}',
    'restore.skippedHeading': 'O que ficou no ficheiro, e porquê',
    'restore.nothingWritten': 'Ainda nada foi escrito. Verificar um ficheiro não altera nada.',
    'restore.afterApplied':
      'O seu ficheiro não mudou, pelo que pode ser usado outra vez: uma entrada que já está aqui é ignorada, não escrita duas vezes. O que nenhum ficheiro repõe alguma vez está indicado mais abaixo nesta página.',
    'restore.fieldCountry': 'País',
    'restore.whereEntry': 'Uma entrada guardada',
    'restore.whyNameBlank':
      'O nome no ficheiro está em branco, e um perfil não pode ter um nome em branco.',
    'restore.whyNameLong':
      'O nome no ficheiro é demasiado longo. Número máximo de caracteres de um nome: {count}',
    'restore.whyLanguage':
      'O idioma no ficheiro não está escrito numa forma que o perfil consiga guardar. No ficheiro: {value}',
    'restore.whyTimezone':
      'O fuso horário no ficheiro não é um que esta plataforma conheça. No ficheiro: {value}',
    'restore.whyCountry':
      'O país no ficheiro não é um código de país de duas letras. No ficheiro: {value}',
    'restore.whyNotList': 'Uma parte deste ficheiro não é uma lista, pelo que não pôde ser lida.',
    'restore.whyCapped':
      'Esta lista é mais longa do que o que é lido de uma vez, pelo que só o seu início é lido. Entradas lidas: {read}. Entradas no ficheiro: {held}',
    'restore.whyOff':
      'As notas e os marcadores estão desligados nesta plataforma, pelo que não há onde os pôr. Continuam no seu ficheiro.',
    'restore.whyNoteEmpty': 'Esta nota não tem texto.',
    'restore.whyNoteLong':
      'Esta nota é demasiado longa. Número máximo de caracteres de uma nota: {count}',
    'restore.whyNoLesson': 'Esta entrada não indica nenhuma aula, pelo que não há a que a anexar.',
    'restore.whyNotEnrolled':
      'Não está inscrito agora em nenhum curso que tenha uma aula com este nome.',
    'restore.whyAmbiguous':
      'Mais de um dos seus cursos tem uma aula com este nome, e o ficheiro não consegue dizer qual.',
    'restore.whyDiffers':
      'Entretanto escreveu uma nota diferente nesta aula, e ela não foi substituída.',
    'restore.whyNoAccess': 'São necessários uma inscrição ativa neste curso e acesso a esta aula.',
    'restore.whyOther': 'Não foi possível repor esta entrada.',
  },
  sw: {
    'restore.title': 'Rudisha data yako',
    'restore.crumb': 'Urejeshaji',
    'restore.lede':
      'Ikiwa ulipakua nakala ya data yako na unataka irudi, kwenye akaunti hii baada ya mapumziko au kwenye akaunti mpya, ukurasa huu husoma faili hilo na kurudisha sehemu uliyoiandika wewe.',
    'restore.canHeading': 'Kinachoweza kurudi',
    'restore.canProfile': 'Wasifu wako',
    'restore.canProfileNote':
      'Jina, lugha, saa za eneo na nchi. Pale tu faili linapotofautiana na kilichopo hapa sasa, na thamani tu ambazo jukwaa hili linaweza kuhifadhi.',
    'restore.canNotes': 'Madokezo na alamisho zako',
    'restore.canNotesNote':
      'Hurudishwa kwenye vipindi vilipoandikwa, lakini katika kozi ulizojisajili sasa tu. Dokezo ni la usajili fulani, kwa hiyo kozi uliyoiacha haina mahali pa kuliweka.',
    'restore.cannotHeading': 'Kisichoweza, na sababu',
    'restore.cannotEnrol': 'Usajili',
    'restore.cannotEnrolNote':
      'Usajili ni haki, na wakati mwingine haki iliyolipiwa. Faili linaloweza kuutoa lingekuwa faili linalogawa kozi bure. Jisajili tena, kisha tumia faili mara ya pili: madokezo yako yatapata vipindi vyake.',
    'restore.cannotCert': 'Vyeti',
    'restore.cannotCertNote':
      'Cheti hutolewa na jukwaa. Cheti kilichoandikwa kutoka kwenye faili kingekuwa cha kughushi kinachopita uhakiki. Nambari zilizo kwenye faili lako bado ni halisi, na uhakiki wa vyeti bado unazithibitisha.',
    'restore.cannotMoney': 'Maagizo, marejesho ya pesa na maendeleo',
    'restore.cannotMoneyNote':
      'Hizi ni kumbukumbu za kilichotokea hapa, zinazotunzwa na jukwaa. Kurudisha mojawapo kutoka kwenye faili kungekuwa dai, si nakala. Risiti zako zinabaki kwenye faili kwa kumbukumbu zako mwenyewe.',
    'restore.cannotPublished': 'Ulichochapisha, na ulichopewa alama',
    'restore.cannotPublishedNote':
      'Maoni, machapisho ya majadiliano na kazi zilizowasilishwa kila moja ilichapishwa hapa na, pale ilipohitajika, ilisimamiwa. Kuzichapisha tena kutoka kwenye faili kungechapisha maneno ambayo hakuna aliyeyasoma tena.',
    'restore.cannotPeople': 'Watoto, majukumu na ruhusa',
    'restore.cannotPeopleNote':
      'Wasifu wa mtoto huandika mlezi wake ni nani, na jukumu la mfanyakazi hutolewa na mtu, halibebwi kwenye faili. Vyote viwili huongezwa kupitia skrini zinazoandika nani aliyefanya hivyo.',
    'restore.cannotHistory': 'Historia ya shughuli zako',
    'restore.cannotHistoryNote':
      'Ni kumbukumbu ya kilichotokea hapa na inaweza kuongezwa tu. Historia iliyoletwa kutoka kwenye faili ingekuwa historia ya kubuniwa.',
    'restore.cannotSignIn': 'Anwani yako ya kuingia na nenosiri',
    'restore.cannotSignInNote':
      'Vyote viwili hutunzwa na huduma ya kuingia, kando na kumbukumbu hii. Ingia kwa anwani unayotaka kutumia; faili haliwezi kuiweka.',
    'restore.foot':
      'Hakuna kinachoandikwa hadi uone kitakachoandikwa. Kurudishwa kwa faili huandikwa kwenye kumbukumbu ya ukaguzi, pamoja na kilichorudishwa.',
    'restore.fileLabel': 'Faili la JSON lililopakuliwa na ukurasa wa kuhamisha',
    'restore.fileHint':
      'Lahajedwali na nakala ya kuchapisha ni za kusoma; ukurasa huu unahitaji faili la JSON. Jina lake huanza na: {name}',
    'restore.check': 'Kagua faili hili',
    'restore.checking': 'Inakagua…',
    'restore.another': 'Chagua faili jingine',
    'restore.apply': 'Rudisha kinachoweza kurudishwa',
    'restore.applying': 'Inarudisha…',
    'restore.different': 'Rudisha faili tofauti',
    'restore.errLarge':
      'Faili hili ni kubwa kuliko nakala ya data yako inavyoweza kuwa. Chagua faili la JSON lililopakuliwa na ukurasa wa kuhamisha.',
    'restore.errNotJson':
      'Faili hili ni tupu au si JSON. Chagua faili la JSON lililopakuliwa na ukurasa wa kuhamisha; lahajedwali na nakala ya kuchapisha haziwezi kurudishwa.',
    'restore.errNotExport':
      'Faili hili lina JSON, lakini si nakala ya data yako iliyotengenezwa na jukwaa hili.',
    'restore.errNewer':
      'Nakala hii ilitengenezwa na toleo la jukwaa lililo jipya kuliko linalosomwa hapa, kwa hiyo haiwezi kurudishwa hapa.',
    'restore.errSignedOut':
      'Umetoka kwenye akaunti. Ingia tena, kisha chagua faili tena. Hakuna kilichobadilika.',
    'restore.errCheckFailed':
      'Faili halikuweza kukaguliwa, na hakuna kilichobadilika. Angalia muunganisho wako kisha ujaribu tena.',
    'restore.errRefused': 'Jukwaa limelikataa faili hili. Hakuna kilichobadilika.',
    'restore.unconfirmed':
      'Hatukuweza kuthibitisha kama faili lilirudishwa. Kagua faili tena: ingizo ambalo tayari lipo hapa hurukwa, kwa hiyo hakuna kinachoandikwa mara mbili.',
    'restore.resultCheck': 'Kile ambacho faili hili lingerudisha',
    'restore.resultApplied': 'Kile ambacho faili hili limerudisha',
    'restore.resultNothing':
      'Kwa hali ilivyo sasa, hakuna chochote katika faili hili kinachoweza kurudishwa.',
    'restore.resultAllHere': 'Kile ambacho faili hili linaweza kurudisha tayari kipo hapa.',
    'restore.lineNotes': 'Madokezo: {count}',
    'restore.lineMarks': 'Alamisho: {count}',
    'restore.lineProfile': 'Maelezo ya wasifu: {fields}',
    'restore.lineHere': 'Tayari yapo hapa na yameachwa yalivyo: {count}',
    'restore.skippedHeading': 'Kilichobaki kwenye faili, na sababu',
    'restore.nothingWritten': 'Bado hakuna kilichoandikwa. Kukagua faili hakubadilishi chochote.',
    'restore.afterApplied':
      'Faili lako halijabadilika, kwa hiyo linaweza kutumika tena: ingizo ambalo tayari lipo hapa hurukwa, haliandikwi mara mbili. Mambo ambayo hakuna faili linaloyarudisha kamwe yameorodheshwa chini zaidi kwenye ukurasa huu.',
    'restore.fieldCountry': 'Nchi',
    'restore.whereEntry': 'Ingizo lililohifadhiwa',
    'restore.whyNameBlank':
      'Jina lililo kwenye faili ni tupu, na wasifu hauwezi kuwa na jina tupu.',
    'restore.whyNameLong':
      'Jina lililo kwenye faili ni refu mno. Idadi ya juu ya herufi za jina: {count}',
    'restore.whyLanguage':
      'Lugha iliyo kwenye faili haijaandikwa kwa namna ambayo wasifu unaweza kuhifadhi. Kwenye faili: {value}',
    'restore.whyTimezone':
      'Saa za eneo zilizo kwenye faili hazijulikani kwa jukwaa hili. Kwenye faili: {value}',
    'restore.whyCountry':
      'Nchi iliyo kwenye faili si msimbo wa nchi wa herufi mbili. Kwenye faili: {value}',
    'restore.whyNotList': 'Sehemu moja ya faili hili si orodha, kwa hiyo haikuweza kusomwa.',
    'restore.whyCapped':
      'Orodha hii ni ndefu kuliko inayosomwa kwa mara moja, kwa hiyo mwanzo wake tu ndio unaosomwa. Maingizo yaliyosomwa: {read}. Maingizo kwenye faili: {held}',
    'restore.whyOff':
      'Madokezo na alamisho vimezimwa kwenye jukwaa hili, kwa hiyo hakuna mahali pa kuviweka. Bado vipo kwenye faili lako.',
    'restore.whyNoteEmpty': 'Dokezo hili halina maandishi.',
    'restore.whyNoteLong': 'Dokezo hili ni refu mno. Idadi ya juu ya herufi za dokezo: {count}',
    'restore.whyNoLesson':
      'Ingizo hili halitaji kipindi chochote, kwa hiyo hakuna cha kuliambatisha nacho.',
    'restore.whyNotEnrolled': 'Kwa sasa hujajisajili kwenye kozi yenye kipindi chenye jina hili.',
    'restore.whyAmbiguous':
      'Zaidi ya kozi yako moja ina kipindi chenye jina hili, na faili haliwezi kusema ni kipi.',
    'restore.whyDiffers':
      'Tangu hapo umeandika dokezo tofauti kwenye kipindi hiki, na halikubadilishwa.',
    'restore.whyNoAccess':
      'Usajili hai katika kozi hii na ruhusa ya kufikia kipindi hiki vinahitajika.',
    'restore.whyOther': 'Ingizo hili halikuweza kurudishwa.',
  },
  af: {
    'restore.title': 'Sit jou data terug',
    'restore.crumb': 'Terugsit',
    'restore.lede':
      'As jy ’n kopie van jou data afgelaai het en dit terug wil hê, op hierdie rekening ná ’n blaaskans of op ’n nuwe een, lees hierdie bladsy daardie lêer en sit die deel terug wat jy self geskryf het.',
    'restore.canHeading': 'Wat kan terugkom',
    'restore.canProfile': 'Jou profiel',
    'restore.canProfileNote':
      'Naam, taal, tydsone en land. Net waar die lêer verskil van wat nou hier is, en net waardes wat hierdie platform kan hou.',
    'restore.canNotes': 'Jou notas en boekmerke',
    'restore.canNotesNote':
      'Word teruggesit op die lesse waar hulle geskryf is, maar net in kursusse waarvoor jy nou ingeskryf is. ’n Nota behoort aan ’n inskrywing, dus het ’n kursus wat jy verlaat het nêrens om dit te sit nie.',
    'restore.cannotHeading': 'Wat nie kan nie, en hoekom',
    'restore.cannotEnrol': 'Inskrywings',
    'restore.cannotEnrolNote':
      '’n Inskrywing is ’n reg, en soms een waarvoor betaal is. ’n Lêer wat dit kan toeken, sou ’n lêer wees wat kursusse verniet uitdeel. Skryf weer in en gebruik dan die lêer ’n tweede keer: jou notas sal hul lesse vind.',
    'restore.cannotCert': 'Sertifikate',
    'restore.cannotCertNote':
      '’n Sertifikaat word deur die platform uitgereik. Een wat uit ’n lêer geskryf is, sou ’n vervalsing wees wat verifikasie slaag. Die nommers in jou lêer is steeds eg, en sertifikaatverifikasie bevestig hulle steeds.',
    'restore.cannotMoney': 'Bestellings, terugbetalings en vordering',
    'restore.cannotMoneyNote':
      'Dit is rekords van wat hier gebeur het, wat die platform hou. Om een uit ’n lêer terug te sit, sou ’n bewering wees, nie ’n kopie nie. Jou kwitansies bly in die lêer vir jou eie rekords.',
    'restore.cannotPublished': 'Wat jy gepubliseer het, en waarvoor jy gepunt is',
    'restore.cannotPublishedNote':
      'Resensies, besprekingsplasings en opdraginhandigings is elkeen hier gepubliseer en, waar nodig, gemodereer. Om hulle weer uit ’n lêer te plaas, sou woorde publiseer wat niemand weer gelees het nie.',
    'restore.cannotPeople': 'Kinders, rolle en toestemmings',
    'restore.cannotPeopleNote':
      '’n Kind se profiel teken aan wie sy voog is, en ’n personeelrol word deur ’n persoon toegeken, nie in ’n lêer saamgedra nie. Albei word bygevoeg deur die skerms wat aanteken wie dit gedoen het.',
    'restore.cannotHistory': 'Jou aktiwiteitsgeskiedenis',
    'restore.cannotHistoryNote':
      'Dit is ’n rekord van wat hier gebeur het, en daar kan net bygevoeg word. Geskiedenis wat uit ’n lêer ingebring is, sou versinde geskiedenis wees.',
    'restore.cannotSignIn': 'Jou aanmeldadres en wagwoord',
    'restore.cannotSignInNote':
      'Albei word deur die aanmelddiens gehou, apart van hierdie rekord. Meld aan met die adres wat jy wil gebruik; ’n lêer kan dit nie stel nie.',
    'restore.foot':
      'Niks word geskryf voordat jy gesien het wat geskryf sou word nie. Die terugsit van ’n lêer word in die ouditrekord aangeteken, saam met wat dit teruggesit het.',
    'restore.fileLabel': 'Die JSON-lêer wat die uitvoerbladsy afgelaai het',
    'restore.fileHint':
      'Die sigblad en die drukbare kopie is om te lees; hierdie bladsy het die JSON-lêer nodig. Sy naam begin met: {name}',
    'restore.check': 'Gaan hierdie lêer na',
    'restore.checking': 'Gaan na…',
    'restore.another': 'Kies ’n ander lêer',
    'restore.apply': 'Sit terug wat teruggesit kan word',
    'restore.applying': 'Sit terug…',
    'restore.different': 'Sit ’n ander lêer terug',
    'restore.errLarge':
      'Hierdie lêer is groter as wat ’n kopie van jou data kan wees. Kies die JSON-lêer wat die uitvoerbladsy afgelaai het.',
    'restore.errNotJson':
      'Hierdie lêer is leeg of is nie JSON nie. Kies die JSON-lêer wat die uitvoerbladsy afgelaai het; die sigblad en die drukbare kopie kan nie teruggesit word nie.',
    'restore.errNotExport':
      'Hierdie lêer bevat JSON, maar dit is nie ’n kopie van jou data wat deur hierdie platform gemaak is nie.',
    'restore.errNewer':
      'Hierdie kopie is gemaak deur ’n weergawe van die platform wat nuwer is as die een wat hier gelees word, dus kan dit nie hier teruggesit word nie.',
    'restore.errSignedOut':
      'Jy is afgemeld. Meld weer aan en kies dan weer die lêer. Niks is verander nie.',
    'restore.errCheckFailed':
      'Die lêer kon nie nagegaan word nie, en niks is verander nie. Gaan jou verbinding na en probeer weer.',
    'restore.errRefused': 'Die platform het hierdie lêer geweier. Niks is verander nie.',
    'restore.unconfirmed':
      'Ons kon nie bevestig of die lêer teruggesit is nie. Gaan die lêer weer na: ’n item wat reeds hier is, word oorgeslaan, dus word niks twee keer geskryf nie.',
    'restore.resultCheck': 'Wat hierdie lêer sou terugsit',
    'restore.resultApplied': 'Wat hierdie lêer teruggesit het',
    'restore.resultNothing': 'Soos sake nou staan, kan niks in hierdie lêer teruggesit word nie.',
    'restore.resultAllHere': 'Wat hierdie lêer kan terugsit, is reeds hier.',
    'restore.lineNotes': 'Notas: {count}',
    'restore.lineMarks': 'Boekmerke: {count}',
    'restore.lineProfile': 'Profielbesonderhede: {fields}',
    'restore.lineHere': 'Reeds hier en gelaat soos dit is: {count}',
    'restore.skippedHeading': 'Wat in die lêer gebly het, en hoekom',
    'restore.nothingWritten': 'Niks is nog geskryf nie. Om ’n lêer na te gaan, verander niks nie.',
    'restore.afterApplied':
      'Jou lêer het nie verander nie, dus kan dit weer gebruik word: ’n item wat reeds hier is, word oorgeslaan, nie twee keer geskryf nie. Wat geen lêer ooit terugsit nie, staan laer af op hierdie bladsy.',
    'restore.fieldCountry': 'Land',
    'restore.whereEntry': '’n Gestoorde item',
    'restore.whyNameBlank':
      'Die naam in die lêer is leeg, en ’n profiel kan nie ’n leë naam hê nie.',
    'restore.whyNameLong':
      'Die naam in die lêer is te lank. Die meeste karakters wat ’n naam mag hê: {count}',
    'restore.whyLanguage':
      'Die taal in die lêer is nie geskryf in ’n vorm wat die profiel kan hou nie. In die lêer: {value}',
    'restore.whyTimezone':
      'Die tydsone in die lêer is nie een wat hierdie platform ken nie. In die lêer: {value}',
    'restore.whyCountry':
      'Die land in die lêer is nie ’n landkode van twee letters nie. In die lêer: {value}',
    'restore.whyNotList':
      'Een deel van hierdie lêer is nie ’n lys nie, dus kon dit nie gelees word nie.',
    'restore.whyCapped':
      'Hierdie lys is langer as wat op een slag gelees word, dus word net die begin daarvan gelees. Items gelees: {read}. Items in die lêer: {held}',
    'restore.whyOff':
      'Notas en boekmerke is op hierdie platform afgeskakel, dus is daar nêrens om hulle te sit nie. Hulle is steeds in jou lêer.',
    'restore.whyNoteEmpty': 'Hierdie nota het geen teks nie.',
    'restore.whyNoteLong':
      'Hierdie nota is te lank. Die meeste karakters wat ’n nota mag hê: {count}',
    'restore.whyNoLesson':
      'Hierdie item noem geen les nie, dus is daar niks om dit aan te heg nie.',
    'restore.whyNotEnrolled':
      'Jy is nie nou ingeskryf vir ’n kursus met ’n les met hierdie naam nie.',
    'restore.whyAmbiguous':
      'Meer as een van jou kursusse het ’n les met hierdie naam, en die lêer kan nie sê watter een nie.',
    'restore.whyDiffers':
      'Jy het sedertdien ’n ander nota by hierdie les geskryf, en dit is nie vervang nie.',
    'restore.whyNoAccess':
      '’n Aktiewe inskrywing vir hierdie kursus en toegang tot hierdie les is nodig.',
    'restore.whyOther': 'Hierdie item kon nie teruggesit word nie.',
  },
  'zh-hans': {
    'restore.title': '把你的数据放回来',
    'restore.crumb': '恢复',
    'restore.lede': '如果你下载过自己数据的副本，并想把它放回来，无论是中断一段时间后放回这个账户，还是放到一个新账户，本页面会读取那个文件，并把其中由你写下的部分放回来。',
    'restore.canHeading': '可以回来的内容',
    'restore.canProfile': '你的资料',
    'restore.canProfileNote': '姓名、语言、时区和国家。只在文件与这里现有内容不同的地方，而且只限本平台能够保存的值。',
    'restore.canNotes': '你的笔记和书签',
    'restore.canNotesNote': '会放回当初写下它们的课时，但只限你现在已报名的课程。笔记属于某一次报名，所以你已离开的课程没有地方放它。',
    'restore.cannotHeading': '不能回来的内容，以及原因',
    'restore.cannotEnrol': '报名记录',
    'restore.cannotEnrolNote':
      '报名是一项权利，有时还是付费得到的权利。能授予报名的文件，就等于免费派发课程的文件。请重新报名，然后再用一次这个文件：你的笔记会找到它们的课时。',
    'restore.cannotCert': '证书',
    'restore.cannotCertNote': '证书由平台颁发。从文件写入的证书，就是能通过验证的伪造品。你文件里的编号仍然是真实的，证书验证仍然能确认它们。',
    'restore.cannotMoney': '订单、退款和学习进度',
    'restore.cannotMoneyNote': '这些是平台保存的、在这里发生过的事情的记录。从文件把其中一项放回来，是一种声称，而不是副本。你的收据仍留在文件里，供你自己留存。',
    'restore.cannotPublished': '你发布过的内容，以及被评分的内容',
    'restore.cannotPublishedNote': '评价、讨论帖和作业提交都曾在这里发布，并在需要时经过审核。从文件重新发布它们，等于发布没有人重新读过的文字。',
    'restore.cannotPeople': '孩子、角色和权限',
    'restore.cannotPeopleNote': '孩子的资料记录了监护人是谁，工作人员角色由人授予，不会随文件带来。两者都通过会记录操作人的页面添加。',
    'restore.cannotHistory': '你的活动历史',
    'restore.cannotHistoryNote': '它是这里发生过的事情的记录，只能往里追加。从文件带进来的历史，就是编造的历史。',
    'restore.cannotSignIn': '你的登录地址和密码',
    'restore.cannotSignInNote': '两者都由登录服务保存，与这份记录分开。请用你想使用的地址登录；文件无法设定它。',
    'restore.foot': '在你看到将要写入的内容之前，不会写入任何东西。放回文件一事会记入审计记录，连同放回了什么。',
    'restore.fileLabel': '导出页面下载的 JSON 文件',
    'restore.fileHint': '电子表格和可打印副本是供阅读的；本页面需要 JSON 文件。它的名称开头是：{name}',
    'restore.check': '检查这个文件',
    'restore.checking': '正在检查…',
    'restore.another': '选择另一个文件',
    'restore.apply': '放回可以放回的内容',
    'restore.applying': '正在放回…',
    'restore.different': '放回另一个文件',
    'restore.errLarge': '这个文件比你的数据副本可能达到的大小还要大。请选择导出页面下载的 JSON 文件。',
    'restore.errNotJson': '这个文件是空的，或者不是 JSON。请选择导出页面下载的 JSON 文件；电子表格和可打印副本无法放回。',
    'restore.errNotExport': '这个文件包含 JSON，但不是本平台生成的你的数据副本。',
    'restore.errNewer': '这份副本由比这里所能读取的更新的平台版本生成，所以无法在这里放回。',
    'restore.errSignedOut': '你已退出登录。请重新登录，然后再次选择文件。没有任何更改。',
    'restore.errCheckFailed': '无法检查这个文件，没有任何更改。请检查网络连接后重试。',
    'restore.errRefused': '平台拒绝了这个文件。没有任何更改。',
    'restore.unconfirmed': '我们无法确认文件是否已放回。请再检查一次文件：已经在这里的条目会被跳过，所以不会有内容被写入两次。',
    'restore.resultCheck': '这个文件将放回的内容',
    'restore.resultApplied': '这个文件已放回的内容',
    'restore.resultNothing': '按目前的情况，这个文件里没有可以放回的内容。',
    'restore.resultAllHere': '这个文件能放回的内容已经在这里了。',
    'restore.lineNotes': '笔记：{count}',
    'restore.lineMarks': '书签：{count}',
    'restore.lineProfile': '资料项目：{fields}',
    'restore.lineHere': '已经在这里并保持原样：{count}',
    'restore.skippedHeading': '留在文件里的内容，以及原因',
    'restore.nothingWritten': '尚未写入任何内容。检查文件不会更改任何东西。',
    'restore.afterApplied': '你的文件没有改变，所以可以再次使用：已经在这里的条目会被跳过，不会写入两次。任何文件都永远不会放回的内容列在本页面下方。',
    'restore.fieldCountry': '国家',
    'restore.whereEntry': '一条已保存的条目',
    'restore.whyNameBlank': '文件里的姓名是空的，而资料的姓名不能为空。',
    'restore.whyNameLong': '文件里的姓名太长。姓名最多可有的字符数：{count}',
    'restore.whyLanguage': '文件里的语言不是以资料能够保存的形式写的。文件中为：{value}',
    'restore.whyTimezone': '文件里的时区不是本平台认识的时区。文件中为：{value}',
    'restore.whyCountry': '文件里的国家不是两个字母的国家代码。文件中为：{value}',
    'restore.whyNotList': '这个文件的某一部分不是列表，所以无法读取。',
    'restore.whyCapped': '这个列表比一次读取的长度更长，所以只读取开头部分。已读取的条目：{read}。文件中的条目：{held}',
    'restore.whyOff': '本平台已关闭笔记和书签，所以没有地方放它们。它们仍在你的文件里。',
    'restore.whyNoteEmpty': '这条笔记没有文字。',
    'restore.whyNoteLong': '这条笔记太长。笔记最多可有的字符数：{count}',
    'restore.whyNoLesson': '这个条目没有指明课时，所以没有可以附加的地方。',
    'restore.whyNotEnrolled': '你现在没有报名任何含有这个名称课时的课程。',
    'restore.whyAmbiguous': '你有不止一门课程含有这个名称的课时，文件无法说明是哪一个。',
    'restore.whyDiffers': '你后来在这个课时写了另一条笔记，它没有被替换。',
    'restore.whyNoAccess': '需要在这门课程中有有效的报名，并能访问这个课时。',
    'restore.whyOther': '这个条目无法放回。',
  },
  'zh-hant': {
    'restore.title': '把你的資料放回來',
    'restore.crumb': '還原',
    'restore.lede': '如果你下載過自己資料的副本，並想把它放回來，無論是中斷一段時間後放回這個帳戶，還是放到一個新帳戶，本頁面會讀取那個檔案，並把其中由你寫下的部分放回來。',
    'restore.canHeading': '可以回來的內容',
    'restore.canProfile': '你的個人資料',
    'restore.canProfileNote': '姓名、語言、時區和國家。只在檔案與這裡現有內容不同的地方，而且只限本平台能夠保存的值。',
    'restore.canNotes': '你的筆記和書籤',
    'restore.canNotesNote': '會放回當初寫下它們的單元，但只限你現在已報名的課程。筆記屬於某一次報名，所以你已離開的課程沒有地方放它。',
    'restore.cannotHeading': '不能回來的內容，以及原因',
    'restore.cannotEnrol': '報名紀錄',
    'restore.cannotEnrolNote':
      '報名是一項權利，有時還是付費得到的權利。能授予報名的檔案，就等於免費派發課程的檔案。請重新報名，然後再用一次這個檔案：你的筆記會找到它們的單元。',
    'restore.cannotCert': '證書',
    'restore.cannotCertNote': '證書由平台頒發。從檔案寫入的證書，就是能通過驗證的偽造品。你檔案裡的編號仍然是真實的，證書驗證仍然能確認它們。',
    'restore.cannotMoney': '訂單、退款和學習進度',
    'restore.cannotMoneyNote': '這些是平台保存的、在這裡發生過的事情的紀錄。從檔案把其中一項放回來，是一種聲稱，而不是副本。你的收據仍留在檔案裡，供你自己留存。',
    'restore.cannotPublished': '你發布過的內容，以及被評分的內容',
    'restore.cannotPublishedNote': '評價、討論貼文和作業繳交都曾在這裡發布，並在需要時經過審核。從檔案重新發布它們，等於發布沒有人重新讀過的文字。',
    'restore.cannotPeople': '孩子、角色和權限',
    'restore.cannotPeopleNote': '孩子的個人資料記錄了監護人是誰，工作人員角色由人授予，不會隨檔案帶來。兩者都透過會記錄操作人的頁面新增。',
    'restore.cannotHistory': '你的活動歷史',
    'restore.cannotHistoryNote': '它是這裡發生過的事情的紀錄，只能往裡追加。從檔案帶進來的歷史，就是編造的歷史。',
    'restore.cannotSignIn': '你的登入地址和密碼',
    'restore.cannotSignInNote': '兩者都由登入服務保存，與這份紀錄分開。請用你想使用的地址登入；檔案無法設定它。',
    'restore.foot': '在你看到將要寫入的內容之前，不會寫入任何東西。放回檔案一事會記入稽核紀錄，連同放回了什麼。',
    'restore.fileLabel': '匯出頁面下載的 JSON 檔案',
    'restore.fileHint': '試算表和可列印副本是供閱讀的；本頁面需要 JSON 檔案。它的名稱開頭是：{name}',
    'restore.check': '檢查這個檔案',
    'restore.checking': '正在檢查…',
    'restore.another': '選擇另一個檔案',
    'restore.apply': '放回可以放回的內容',
    'restore.applying': '正在放回…',
    'restore.different': '放回另一個檔案',
    'restore.errLarge': '這個檔案比你的資料副本可能達到的大小還要大。請選擇匯出頁面下載的 JSON 檔案。',
    'restore.errNotJson': '這個檔案是空的，或者不是 JSON。請選擇匯出頁面下載的 JSON 檔案；試算表和可列印副本無法放回。',
    'restore.errNotExport': '這個檔案包含 JSON，但不是本平台產生的你的資料副本。',
    'restore.errNewer': '這份副本由比這裡所能讀取的更新的平台版本產生，所以無法在這裡放回。',
    'restore.errSignedOut': '你已登出。請重新登入，然後再次選擇檔案。沒有任何變更。',
    'restore.errCheckFailed': '無法檢查這個檔案，沒有任何變更。請檢查網路連線後重試。',
    'restore.errRefused': '平台拒絕了這個檔案。沒有任何變更。',
    'restore.unconfirmed': '我們無法確認檔案是否已放回。請再檢查一次檔案：已經在這裡的項目會被略過，所以不會有內容被寫入兩次。',
    'restore.resultCheck': '這個檔案將放回的內容',
    'restore.resultApplied': '這個檔案已放回的內容',
    'restore.resultNothing': '按目前的情況，這個檔案裡沒有可以放回的內容。',
    'restore.resultAllHere': '這個檔案能放回的內容已經在這裡了。',
    'restore.lineNotes': '筆記：{count}',
    'restore.lineMarks': '書籤：{count}',
    'restore.lineProfile': '個人資料項目：{fields}',
    'restore.lineHere': '已經在這裡並保持原樣：{count}',
    'restore.skippedHeading': '留在檔案裡的內容，以及原因',
    'restore.nothingWritten': '尚未寫入任何內容。檢查檔案不會變更任何東西。',
    'restore.afterApplied': '你的檔案沒有改變，所以可以再次使用：已經在這裡的項目會被略過，不會寫入兩次。任何檔案都永遠不會放回的內容列在本頁面下方。',
    'restore.fieldCountry': '國家',
    'restore.whereEntry': '一個已儲存的項目',
    'restore.whyNameBlank': '檔案裡的姓名是空的，而個人資料的姓名不能為空。',
    'restore.whyNameLong': '檔案裡的姓名太長。姓名最多可有的字元數：{count}',
    'restore.whyLanguage': '檔案裡的語言不是以個人資料能夠保存的形式寫的。檔案中為：{value}',
    'restore.whyTimezone': '檔案裡的時區不是本平台認識的時區。檔案中為：{value}',
    'restore.whyCountry': '檔案裡的國家不是兩個字母的國家代碼。檔案中為：{value}',
    'restore.whyNotList': '這個檔案的某一部分不是清單，所以無法讀取。',
    'restore.whyCapped': '這個清單比一次讀取的長度更長，所以只讀取開頭部分。已讀取的項目：{read}。檔案中的項目：{held}',
    'restore.whyOff': '本平台已關閉筆記和書籤，所以沒有地方放它們。它們仍在你的檔案裡。',
    'restore.whyNoteEmpty': '這則筆記沒有文字。',
    'restore.whyNoteLong': '這則筆記太長。筆記最多可有的字元數：{count}',
    'restore.whyNoLesson': '這個項目沒有指明單元，所以沒有可以附加的地方。',
    'restore.whyNotEnrolled': '你現在沒有報名任何含有這個名稱單元的課程。',
    'restore.whyAmbiguous': '你有不止一門課程含有這個名稱的單元，檔案無法說明是哪一個。',
    'restore.whyDiffers': '你後來在這個單元寫了另一則筆記，它沒有被取代。',
    'restore.whyNoAccess': '需要在這門課程中有有效的報名，並能存取這個單元。',
    'restore.whyOther': '這個項目無法放回。',
  },
  vi: {
    'restore.title': 'Đưa dữ liệu của bạn trở lại',
    'restore.crumb': 'Khôi phục',
    'restore.lede':
      'Nếu bạn đã tải về một bản sao dữ liệu của mình và muốn có lại, trên tài khoản này sau một thời gian nghỉ hoặc trên một tài khoản mới, trang này đọc tệp đó và đưa trở lại phần do chính bạn viết.',
    'restore.canHeading': 'Những gì có thể trở lại',
    'restore.canProfile': 'Hồ sơ của bạn',
    'restore.canProfileNote':
      'Tên, ngôn ngữ, múi giờ và quốc gia. Chỉ ở những chỗ tệp khác với những gì đang có ở đây, và chỉ những giá trị mà nền tảng này lưu được.',
    'restore.canNotes': 'Ghi chú và dấu trang của bạn',
    'restore.canNotesNote':
      'Được đưa trở lại các bài học nơi chúng được viết, nhưng chỉ trong những khoá học bạn đang ghi danh. Ghi chú thuộc về một lần ghi danh, nên khoá học bạn đã rời đi không có chỗ để đặt nó.',
    'restore.cannotHeading': 'Những gì không thể, và vì sao',
    'restore.cannotEnrol': 'Việc ghi danh',
    'restore.cannotEnrolNote':
      'Ghi danh là một quyền, đôi khi là quyền đã trả tiền. Một tệp có thể cấp quyền đó sẽ là một tệp phát khoá học miễn phí. Hãy ghi danh lại, rồi dùng tệp lần thứ hai: ghi chú của bạn sẽ tìm thấy bài học của chúng.',
    'restore.cannotCert': 'Chứng chỉ',
    'restore.cannotCertNote':
      'Chứng chỉ do nền tảng cấp. Chứng chỉ được ghi từ một tệp sẽ là đồ giả vượt qua được bước xác minh. Các số trong tệp của bạn vẫn là thật, và việc xác minh chứng chỉ vẫn xác nhận chúng.',
    'restore.cannotMoney': 'Đơn hàng, hoàn tiền và tiến độ',
    'restore.cannotMoneyNote':
      'Đây là các bản ghi về những gì đã xảy ra ở đây, do nền tảng lưu giữ. Đưa một bản ghi trở lại từ tệp sẽ là một lời khẳng định, không phải bản sao. Biên nhận của bạn vẫn nằm trong tệp để bạn tự lưu.',
    'restore.cannotPublished': 'Những gì bạn đã đăng, và những gì bạn đã được chấm điểm',
    'restore.cannotPublishedNote':
      'Đánh giá, bài thảo luận và bài nộp đều đã được đăng ở đây và được kiểm duyệt khi cần. Đăng lại chúng từ một tệp sẽ là đăng những lời chưa ai đọc lại.',
    'restore.cannotPeople': 'Trẻ em, vai trò và quyền',
    'restore.cannotPeopleNote':
      'Hồ sơ của trẻ ghi lại ai là người giám hộ, còn vai trò nhân viên do một người cấp, không mang theo trong tệp. Cả hai được thêm qua những màn hình có ghi lại ai đã thực hiện.',
    'restore.cannotHistory': 'Lịch sử hoạt động của bạn',
    'restore.cannotHistoryNote':
      'Đó là bản ghi về những gì đã xảy ra ở đây và chỉ có thể thêm vào. Lịch sử mang vào từ một tệp sẽ là lịch sử bịa đặt.',
    'restore.cannotSignIn': 'Địa chỉ đăng nhập và mật khẩu của bạn',
    'restore.cannotSignInNote':
      'Cả hai do dịch vụ đăng nhập lưu giữ, tách riêng khỏi bản ghi này. Hãy đăng nhập bằng địa chỉ bạn muốn dùng; tệp không thể đặt địa chỉ đó.',
    'restore.foot':
      'Không có gì được ghi cho đến khi bạn thấy những gì sẽ được ghi. Việc đưa một tệp trở lại được ghi vào nhật ký kiểm tra, cùng với những gì đã được đưa trở lại.',
    'restore.fileLabel': 'Tệp JSON mà trang xuất dữ liệu đã tải về',
    'restore.fileHint':
      'Bảng tính và bản in là để đọc; trang này cần tệp JSON. Tên tệp bắt đầu bằng: {name}',
    'restore.check': 'Kiểm tra tệp này',
    'restore.checking': 'Đang kiểm tra…',
    'restore.another': 'Chọn tệp khác',
    'restore.apply': 'Đưa trở lại những gì có thể',
    'restore.applying': 'Đang đưa trở lại…',
    'restore.different': 'Đưa một tệp khác trở lại',
    'restore.errLarge':
      'Tệp này lớn hơn mức mà một bản sao dữ liệu của bạn có thể đạt tới. Hãy chọn tệp JSON mà trang xuất dữ liệu đã tải về.',
    'restore.errNotJson':
      'Tệp này trống hoặc không phải JSON. Hãy chọn tệp JSON mà trang xuất dữ liệu đã tải về; bảng tính và bản in không thể đưa trở lại.',
    'restore.errNotExport':
      'Tệp này chứa JSON, nhưng không phải là bản sao dữ liệu của bạn do nền tảng này tạo ra.',
    'restore.errNewer':
      'Bản sao này do một phiên bản nền tảng mới hơn phiên bản đọc được ở đây tạo ra, nên không thể đưa trở lại ở đây.',
    'restore.errSignedOut':
      'Bạn đã đăng xuất. Hãy đăng nhập lại, rồi chọn lại tệp. Không có gì thay đổi.',
    'restore.errCheckFailed':
      'Không kiểm tra được tệp, và không có gì thay đổi. Hãy kiểm tra kết nối rồi thử lại.',
    'restore.errRefused': 'Nền tảng đã từ chối tệp này. Không có gì thay đổi.',
    'restore.unconfirmed':
      'Chúng tôi không xác nhận được tệp đã được đưa trở lại hay chưa. Hãy kiểm tra lại tệp: mục đã có ở đây sẽ được bỏ qua, nên không có gì bị ghi hai lần.',
    'restore.resultCheck': 'Những gì tệp này sẽ đưa trở lại',
    'restore.resultApplied': 'Những gì tệp này đã đưa trở lại',
    'restore.resultNothing':
      'Trong tình trạng hiện tại, không có gì trong tệp này có thể đưa trở lại.',
    'restore.resultAllHere': 'Những gì tệp này có thể đưa trở lại đều đã có ở đây.',
    'restore.lineNotes': 'Ghi chú: {count}',
    'restore.lineMarks': 'Dấu trang: {count}',
    'restore.lineProfile': 'Chi tiết hồ sơ: {fields}',
    'restore.lineHere': 'Đã có ở đây và được giữ nguyên: {count}',
    'restore.skippedHeading': 'Những gì còn lại trong tệp, và vì sao',
    'restore.nothingWritten': 'Chưa có gì được ghi. Kiểm tra một tệp không làm thay đổi gì.',
    'restore.afterApplied':
      'Tệp của bạn không thay đổi, nên có thể dùng lại: mục đã có ở đây sẽ được bỏ qua, không ghi hai lần. Những gì không tệp nào đưa trở lại được liệt kê ở phía dưới trang này.',
    'restore.fieldCountry': 'Quốc gia',
    'restore.whereEntry': 'Một mục đã lưu',
    'restore.whyNameBlank': 'Tên trong tệp để trống, mà hồ sơ không thể có tên trống.',
    'restore.whyNameLong': 'Tên trong tệp quá dài. Số ký tự tối đa của một tên: {count}',
    'restore.whyLanguage':
      'Ngôn ngữ trong tệp không được viết ở dạng mà hồ sơ lưu được. Trong tệp: {value}',
    'restore.whyTimezone':
      'Múi giờ trong tệp không phải múi giờ mà nền tảng này biết. Trong tệp: {value}',
    'restore.whyCountry':
      'Quốc gia trong tệp không phải mã quốc gia hai chữ cái. Trong tệp: {value}',
    'restore.whyNotList': 'Một phần của tệp này không phải danh sách, nên không đọc được.',
    'restore.whyCapped':
      'Danh sách này dài hơn mức được đọc trong một lần, nên chỉ phần đầu được đọc. Số mục đã đọc: {read}. Số mục trong tệp: {held}',
    'restore.whyOff':
      'Ghi chú và dấu trang đang tắt trên nền tảng này, nên không có chỗ để đặt chúng. Chúng vẫn nằm trong tệp của bạn.',
    'restore.whyNoteEmpty': 'Ghi chú này không có nội dung.',
    'restore.whyNoteLong': 'Ghi chú này quá dài. Số ký tự tối đa của một ghi chú: {count}',
    'restore.whyNoLesson': 'Mục này không nêu tên bài học nào, nên không có gì để gắn nó vào.',
    'restore.whyNotEnrolled': 'Hiện bạn không ghi danh khoá học nào có bài học mang tên này.',
    'restore.whyAmbiguous':
      'Hơn một khoá học của bạn có bài học mang tên này, và tệp không thể cho biết là bài nào.',
    'restore.whyDiffers':
      'Từ đó bạn đã viết một ghi chú khác cho bài học này, và ghi chú đó không bị thay thế.',
    'restore.whyNoAccess':
      'Cần có ghi danh đang hoạt động trong khoá học này và quyền truy cập bài học này.',
    'restore.whyOther': 'Không thể đưa mục này trở lại.',
  },
  th: {
    'restore.title': 'นำข้อมูลของคุณกลับมาใส่',
    'restore.crumb': 'การกู้คืน',
    'restore.lede':
      'หากคุณเคยดาวน์โหลดสำเนาข้อมูลของคุณและต้องการนำกลับมา ไม่ว่าจะในบัญชีนี้หลังหยุดพักหรือในบัญชีใหม่ หน้านี้จะอ่านไฟล์นั้นและนำส่วนที่คุณเขียนเองกลับมาใส่',
    'restore.canHeading': 'สิ่งที่กลับมาได้',
    'restore.canProfile': 'โปรไฟล์ของคุณ',
    'restore.canProfileNote':
      'ชื่อ ภาษา เขตเวลา และประเทศ เฉพาะส่วนที่ไฟล์ต่างจากที่มีอยู่ที่นี่ในตอนนี้ และเฉพาะค่าที่แพลตฟอร์มนี้เก็บได้',
    'restore.canNotes': 'บันทึกและบุ๊กมาร์กของคุณ',
    'restore.canNotesNote':
      'นำกลับไปใส่ในบทเรียนที่เขียนไว้ แต่เฉพาะในหลักสูตรที่คุณลงทะเบียนอยู่ในตอนนี้ บันทึกผูกกับการลงทะเบียน หลักสูตรที่คุณออกไปแล้วจึงไม่มีที่ให้ใส่',
    'restore.cannotHeading': 'สิ่งที่กลับมาไม่ได้ และเหตุผล',
    'restore.cannotEnrol': 'การลงทะเบียน',
    'restore.cannotEnrolNote':
      'การลงทะเบียนเป็นสิทธิ์ และบางครั้งเป็นสิทธิ์ที่ต้องจ่ายเงิน ไฟล์ที่ให้สิทธิ์นี้ได้ก็คือไฟล์ที่แจกหลักสูตรฟรี โปรดลงทะเบียนอีกครั้ง แล้วใช้ไฟล์เป็นครั้งที่สอง บันทึกของคุณจะพบบทเรียนของมัน',
    'restore.cannotCert': 'ประกาศนียบัตร',
    'restore.cannotCertNote':
      'ประกาศนียบัตรออกโดยแพลตฟอร์ม ประกาศนียบัตรที่เขียนจากไฟล์ก็คือของปลอมที่ผ่านการตรวจสอบได้ หมายเลขในไฟล์ของคุณยังเป็นของจริง และการตรวจสอบประกาศนียบัตรยังยืนยันได้',
    'restore.cannotMoney': 'คำสั่งซื้อ การคืนเงิน และความคืบหน้า',
    'restore.cannotMoneyNote':
      'สิ่งเหล่านี้คือระเบียนของสิ่งที่เกิดขึ้นที่นี่ ซึ่งแพลตฟอร์มเก็บไว้ การนำรายการใดกลับมาใส่จากไฟล์จะเป็นการกล่าวอ้าง ไม่ใช่สำเนา ใบเสร็จของคุณยังอยู่ในไฟล์สำหรับเก็บไว้เอง',
    'restore.cannotPublished': 'สิ่งที่คุณเผยแพร่ และสิ่งที่คุณได้รับคะแนน',
    'restore.cannotPublishedNote':
      'รีวิว โพสต์สนทนา และงานที่ส่ง แต่ละอย่างเผยแพร่ที่นี่และได้รับการตรวจดูแลเมื่อจำเป็น การโพสต์อีกครั้งจากไฟล์จะเป็นการเผยแพร่ข้อความที่ไม่มีใครอ่านซ้ำ',
    'restore.cannotPeople': 'เด็ก บทบาท และสิทธิ์',
    'restore.cannotPeopleNote':
      'โปรไฟล์ของเด็กบันทึกว่าใครเป็นผู้ปกครอง ส่วนบทบาทเจ้าหน้าที่มีคนเป็นผู้ให้ ไม่ได้ติดมากับไฟล์ ทั้งสองอย่างเพิ่มผ่านหน้าจอที่บันทึกว่าใครเป็นผู้ทำ',
    'restore.cannotHistory': 'ประวัติกิจกรรมของคุณ',
    'restore.cannotHistoryNote':
      'เป็นระเบียนของสิ่งที่เกิดขึ้นที่นี่ และทำได้เพียงเพิ่มเข้าไป ประวัติที่นำเข้าจากไฟล์ก็คือประวัติที่แต่งขึ้น',
    'restore.cannotSignIn': 'ที่อยู่สำหรับเข้าสู่ระบบและรหัสผ่านของคุณ',
    'restore.cannotSignInNote':
      'ทั้งสองอย่างเก็บโดยบริการเข้าสู่ระบบ แยกจากระเบียนนี้ โปรดเข้าสู่ระบบด้วยที่อยู่ที่คุณต้องการใช้ ไฟล์กำหนดให้ไม่ได้',
    'restore.foot':
      'จะไม่มีการเขียนสิ่งใดจนกว่าคุณจะได้เห็นว่าจะเขียนอะไร การนำไฟล์กลับมาใส่จะถูกบันทึกในบันทึกการตรวจสอบ พร้อมกับสิ่งที่นำกลับมาใส่',
    'restore.fileLabel': 'ไฟล์ JSON ที่หน้าส่งออกดาวน์โหลดไว้',
    'restore.fileHint':
      'สเปรดชีตและสำเนาสำหรับพิมพ์มีไว้อ่าน หน้านี้ต้องใช้ไฟล์ JSON ชื่อไฟล์ขึ้นต้นด้วย: {name}',
    'restore.check': 'ตรวจไฟล์นี้',
    'restore.checking': 'กำลังตรวจ…',
    'restore.another': 'เลือกไฟล์อื่น',
    'restore.apply': 'นำสิ่งที่ใส่กลับได้กลับมาใส่',
    'restore.applying': 'กำลังนำกลับมาใส่…',
    'restore.different': 'นำไฟล์อื่นกลับมาใส่',
    'restore.errLarge':
      'ไฟล์นี้ใหญ่กว่าที่สำเนาข้อมูลของคุณจะเป็นได้ โปรดเลือกไฟล์ JSON ที่หน้าส่งออกดาวน์โหลดไว้',
    'restore.errNotJson':
      'ไฟล์นี้ว่างเปล่าหรือไม่ใช่ JSON โปรดเลือกไฟล์ JSON ที่หน้าส่งออกดาวน์โหลดไว้ สเปรดชีตและสำเนาสำหรับพิมพ์นำกลับมาใส่ไม่ได้',
    'restore.errNotExport': 'ไฟล์นี้มี JSON แต่ไม่ใช่สำเนาข้อมูลของคุณที่แพลตฟอร์มนี้สร้างขึ้น',
    'restore.errNewer':
      'สำเนานี้สร้างโดยแพลตฟอร์มเวอร์ชันที่ใหม่กว่าที่อ่านได้ที่นี่ จึงนำกลับมาใส่ที่นี่ไม่ได้',
    'restore.errSignedOut':
      'คุณออกจากระบบแล้ว โปรดเข้าสู่ระบบอีกครั้ง แล้วเลือกไฟล์ใหม่ ไม่มีสิ่งใดเปลี่ยนแปลง',
    'restore.errCheckFailed':
      'ตรวจไฟล์ไม่ได้ และไม่มีสิ่งใดเปลี่ยนแปลง โปรดตรวจการเชื่อมต่อแล้วลองอีกครั้ง',
    'restore.errRefused': 'แพลตฟอร์มปฏิเสธไฟล์นี้ ไม่มีสิ่งใดเปลี่ยนแปลง',
    'restore.unconfirmed':
      'เราไม่สามารถยืนยันได้ว่าไฟล์ถูกนำกลับมาใส่แล้วหรือไม่ โปรดตรวจไฟล์อีกครั้ง รายการที่มีอยู่ที่นี่แล้วจะถูกข้าม จึงไม่มีสิ่งใดถูกเขียนสองครั้ง',
    'restore.resultCheck': 'สิ่งที่ไฟล์นี้จะนำกลับมาใส่',
    'restore.resultApplied': 'สิ่งที่ไฟล์นี้นำกลับมาใส่แล้ว',
    'restore.resultNothing': 'ตามสภาพในตอนนี้ ไม่มีสิ่งใดในไฟล์นี้ที่นำกลับมาใส่ได้',
    'restore.resultAllHere': 'สิ่งที่ไฟล์นี้นำกลับมาใส่ได้มีอยู่ที่นี่แล้ว',
    'restore.lineNotes': 'บันทึก: {count}',
    'restore.lineMarks': 'บุ๊กมาร์ก: {count}',
    'restore.lineProfile': 'รายละเอียดโปรไฟล์: {fields}',
    'restore.lineHere': 'มีอยู่ที่นี่แล้วและคงไว้ตามเดิม: {count}',
    'restore.skippedHeading': 'สิ่งที่ยังอยู่ในไฟล์ และเหตุผล',
    'restore.nothingWritten': 'ยังไม่มีการเขียนสิ่งใด การตรวจไฟล์ไม่เปลี่ยนแปลงอะไร',
    'restore.afterApplied':
      'ไฟล์ของคุณไม่ได้เปลี่ยนแปลง จึงใช้ซ้ำได้ รายการที่มีอยู่ที่นี่แล้วจะถูกข้าม ไม่ถูกเขียนสองครั้ง สิ่งที่ไม่มีไฟล์ใดนำกลับมาใส่ได้เลยระบุไว้ด้านล่างของหน้านี้',
    'restore.fieldCountry': 'ประเทศ',
    'restore.whereEntry': 'รายการที่บันทึกไว้',
    'restore.whyNameBlank': 'ชื่อในไฟล์ว่างเปล่า และโปรไฟล์จะมีชื่อว่างเปล่าไม่ได้',
    'restore.whyNameLong': 'ชื่อในไฟล์ยาวเกินไป จำนวนอักขระสูงสุดของชื่อ: {count}',
    'restore.whyLanguage': 'ภาษาในไฟล์ไม่ได้เขียนในรูปแบบที่โปรไฟล์เก็บได้ ในไฟล์: {value}',
    'restore.whyTimezone': 'เขตเวลาในไฟล์ไม่ใช่เขตเวลาที่แพลตฟอร์มนี้รู้จัก ในไฟล์: {value}',
    'restore.whyCountry': 'ประเทศในไฟล์ไม่ใช่รหัสประเทศสองตัวอักษร ในไฟล์: {value}',
    'restore.whyNotList': 'ส่วนหนึ่งของไฟล์นี้ไม่ใช่รายการ จึงอ่านไม่ได้',
    'restore.whyCapped':
      'รายการนี้ยาวกว่าที่อ่านได้ในครั้งเดียว จึงอ่านเฉพาะส่วนต้น รายการที่อ่าน: {read} รายการในไฟล์: {held}',
    'restore.whyOff':
      'บันทึกและบุ๊กมาร์กถูกปิดอยู่บนแพลตฟอร์มนี้ จึงไม่มีที่ให้ใส่ ทั้งหมดยังอยู่ในไฟล์ของคุณ',
    'restore.whyNoteEmpty': 'บันทึกนี้ไม่มีข้อความ',
    'restore.whyNoteLong': 'บันทึกนี้ยาวเกินไป จำนวนอักขระสูงสุดของบันทึก: {count}',
    'restore.whyNoLesson': 'รายการนี้ไม่ได้ระบุบทเรียน จึงไม่มีสิ่งใดให้แนบ',
    'restore.whyNotEnrolled': 'ตอนนี้คุณไม่ได้ลงทะเบียนในหลักสูตรที่มีบทเรียนชื่อนี้',
    'restore.whyAmbiguous':
      'หลักสูตรของคุณมากกว่าหนึ่งหลักสูตรมีบทเรียนชื่อนี้ และไฟล์บอกไม่ได้ว่าเป็นบทเรียนใด',
    'restore.whyDiffers': 'หลังจากนั้นคุณได้เขียนบันทึกอื่นในบทเรียนนี้ และบันทึกนั้นไม่ถูกแทนที่',
    'restore.whyNoAccess':
      'ต้องมีการลงทะเบียนที่ใช้งานอยู่ในหลักสูตรนี้ และมีสิทธิ์เข้าถึงบทเรียนนี้',
    'restore.whyOther': 'รายการนี้นำกลับมาใส่ไม่ได้',
  },
  fil: {
    'restore.title': 'Ibalik ang iyong data',
    'restore.crumb': 'Pagbabalik',
    'restore.lede':
      'Kung nag-download ka ng kopya ng iyong data at gusto mo itong ibalik, sa account na ito pagkatapos ng pahinga o sa bagong account, binabasa ng pahinang ito ang file na iyon at ibinabalik ang bahaging ikaw ang sumulat.',
    'restore.canHeading': 'Ang maaaring bumalik',
    'restore.canProfile': 'Ang iyong profile',
    'restore.canProfileNote':
      'Pangalan, wika, time zone at bansa. Kung saan lang naiiba ang file sa narito ngayon, at mga halaga lang na kayang itago ng platform na ito.',
    'restore.canNotes': 'Ang iyong mga tala at bookmark',
    'restore.canNotesNote':
      'Ibinabalik sa mga araling pinagsulatan ng mga ito, pero sa mga kursong naka-enrol ka ngayon lang. Ang tala ay bahagi ng isang enrolment, kaya walang mapaglalagyan nito ang kursong iniwan mo na.',
    'restore.cannotHeading': 'Ang hindi maaari, at kung bakit',
    'restore.cannotEnrol': 'Mga enrolment',
    'restore.cannotEnrolNote':
      'Ang enrolment ay isang karapatan, at kung minsan ay binayaran. Ang file na makapagbibigay nito ay file na namimigay ng mga kurso nang libre. Mag-enrol muli, saka gamitin ang file sa ikalawang pagkakataon: mahahanap ng iyong mga tala ang kanilang mga aralin.',
    'restore.cannotCert': 'Mga sertipiko',
    'restore.cannotCertNote':
      'Ang sertipiko ay inilalabas ng platform. Ang sertipikong isinulat mula sa file ay pamemeke na pumapasa sa beripikasyon. Totoo pa rin ang mga numero sa iyong file, at kinukumpirma pa rin ang mga ito ng beripikasyon ng sertipiko.',
    'restore.cannotMoney': 'Mga order, refund at pag-usad',
    'restore.cannotMoneyNote':
      'Mga tala ito ng nangyari rito, na iniingatan ng platform. Ang pagbabalik ng isa mula sa file ay isang pag-aangkin, hindi kopya. Nananatili sa file ang iyong mga resibo para sa sarili mong talaan.',
    'restore.cannotPublished': 'Ang inilathala mo, at ang minarkahan sa iyo',
    'restore.cannotPublishedNote':
      'Ang mga review, post sa talakayan at ipinasang takdang-gawain ay inilathala rito at, kung kinailangan, sinuri ng tagapamagitan. Ang muling pag-post ng mga ito mula sa file ay maglalathala ng mga salitang walang muling bumasa.',
    'restore.cannotPeople': 'Mga bata, tungkulin at pahintulot',
    'restore.cannotPeopleNote':
      'Itinatala ng profile ng bata kung sino ang kanyang tagapag-alaga, at ang tungkulin ng kawani ay ibinibigay ng isang tao, hindi dinadala sa file. Kapwa idinaragdag sa pamamagitan ng mga screen na nagtatala kung sino ang gumawa nito.',
    'restore.cannotHistory': 'Ang kasaysayan ng iyong aktibidad',
    'restore.cannotHistoryNote':
      'Tala ito ng nangyari rito at madaragdagan lang. Ang kasaysayang dinala mula sa file ay kasaysayang gawa-gawa.',
    'restore.cannotSignIn': 'Ang iyong address sa pag-sign in at password',
    'restore.cannotSignInNote':
      'Kapwa iniingatan ng serbisyo sa pag-sign in, hiwalay sa talang ito. Mag-sign in gamit ang address na gusto mong gamitin; hindi ito maitatakda ng file.',
    'restore.foot':
      'Walang isinusulat hangga’t hindi mo nakikita kung ano ang isusulat. Ang pagbabalik ng file ay itinatala sa audit record, kasama kung ano ang ibinalik nito.',
    'restore.fileLabel': 'Ang JSON file na na-download ng pahina ng pag-export',
    'restore.fileHint':
      'Ang spreadsheet at ang kopyang maipi-print ay para basahin; kailangan ng pahinang ito ang JSON file. Nagsisimula ang pangalan nito sa: {name}',
    'restore.check': 'Suriin ang file na ito',
    'restore.checking': 'Sinusuri…',
    'restore.another': 'Pumili ng ibang file',
    'restore.apply': 'Ibalik ang maibabalik',
    'restore.applying': 'Ibinabalik…',
    'restore.different': 'Magbalik ng ibang file',
    'restore.errLarge':
      'Mas malaki ang file na ito kaysa sa maaaring laki ng kopya ng iyong data. Piliin ang JSON file na na-download ng pahina ng pag-export.',
    'restore.errNotJson':
      'Walang laman ang file na ito o hindi ito JSON. Piliin ang JSON file na na-download ng pahina ng pag-export; hindi maibabalik ang spreadsheet at ang kopyang maipi-print.',
    'restore.errNotExport':
      'May JSON ang file na ito, pero hindi ito kopya ng iyong data na ginawa ng platform na ito.',
    'restore.errNewer':
      'Ginawa ang kopyang ito ng bersiyon ng platform na mas bago kaysa sa nababasa rito, kaya hindi ito maibabalik dito.',
    'restore.errSignedOut':
      'Naka-sign out ka na. Mag-sign in muli, saka piliin muli ang file. Walang nabago.',
    'restore.errCheckFailed':
      'Hindi nasuri ang file, at walang nabago. Tingnan ang iyong koneksyon at subukan muli.',
    'restore.errRefused': 'Tinanggihan ng platform ang file na ito. Walang nabago.',
    'restore.unconfirmed':
      'Hindi namin nakumpirma kung naibalik ang file. Suriin muli ang file: nilalaktawan ang entry na narito na, kaya walang naisusulat nang dalawang beses.',
    'restore.resultCheck': 'Ang ibabalik ng file na ito',
    'restore.resultApplied': 'Ang ibinalik ng file na ito',
    'restore.resultNothing':
      'Sa kasalukuyang kalagayan, walang anuman sa file na ito ang maibabalik.',
    'restore.resultAllHere': 'Narito na ang maibabalik ng file na ito.',
    'restore.lineNotes': 'Mga tala: {count}',
    'restore.lineMarks': 'Mga bookmark: {count}',
    'restore.lineProfile': 'Mga detalye ng profile: {fields}',
    'restore.lineHere': 'Narito na at iniwan kung ano ito: {count}',
    'restore.skippedHeading': 'Ang naiwan sa file, at kung bakit',
    'restore.nothingWritten': 'Wala pang naisusulat. Walang binabago ang pagsusuri ng file.',
    'restore.afterApplied':
      'Hindi nagbago ang iyong file, kaya magagamit ito muli: nilalaktawan ang entry na narito na, hindi isinusulat nang dalawang beses. Ang mga bagay na hindi kailanman ibinabalik ng alinmang file ay nakalista sa ibaba ng pahinang ito.',
    'restore.fieldCountry': 'Bansa',
    'restore.whereEntry': 'Isang naka-save na entry',
    'restore.whyNameBlank':
      'Blangko ang pangalan sa file, at hindi maaaring blangko ang pangalan ng profile.',
    'restore.whyNameLong':
      'Masyadong mahaba ang pangalan sa file. Pinakamaraming karakter ng isang pangalan: {count}',
    'restore.whyLanguage':
      'Ang wika sa file ay hindi nakasulat sa anyong kayang itago ng profile. Sa file: {value}',
    'restore.whyTimezone':
      'Ang time zone sa file ay hindi kilala ng platform na ito. Sa file: {value}',
    'restore.whyCountry':
      'Ang bansa sa file ay hindi dalawang-titik na code ng bansa. Sa file: {value}',
    'restore.whyNotList': 'Hindi listahan ang isang bahagi ng file na ito, kaya hindi ito nabasa.',
    'restore.whyCapped':
      'Mas mahaba ang listahang ito kaysa sa binabasa sa isang pagkakataon, kaya ang simula lang nito ang binabasa. Mga entry na nabasa: {read}. Mga entry sa file: {held}',
    'restore.whyOff':
      'Naka-off ang mga tala at bookmark sa platform na ito, kaya walang mapaglalagyan ng mga ito. Nasa file mo pa rin ang mga ito.',
    'restore.whyNoteEmpty': 'Walang teksto ang talang ito.',
    'restore.whyNoteLong':
      'Masyadong mahaba ang talang ito. Pinakamaraming karakter ng isang tala: {count}',
    'restore.whyNoLesson':
      'Walang binabanggit na aralin ang entry na ito, kaya walang mapagkakabitan nito.',
    'restore.whyNotEnrolled':
      'Hindi ka naka-enrol ngayon sa kursong may araling ganito ang pangalan.',
    'restore.whyAmbiguous':
      'Mahigit sa isa sa iyong mga kurso ang may araling ganito ang pangalan, at hindi masabi ng file kung alin.',
    'restore.whyDiffers':
      'Mula noon ay nakasulat ka na ng ibang tala sa araling ito, at hindi iyon pinalitan.',
    'restore.whyNoAccess':
      'Kailangan ang aktibong enrolment sa kursong ito at access sa araling ito.',
    'restore.whyOther': 'Hindi naibalik ang entry na ito.',
  },
  uz: {
    'restore.title': 'Maʼlumotlaringizni qaytarib qoʻying',
    'restore.crumb': 'Tiklash',
    'restore.lede':
      'Agar maʼlumotlaringiz nusxasini yuklab olgan boʻlsangiz va uni qaytarmoqchi boʻlsangiz, tanaffusdan soʻng shu hisobga yoki yangi hisobga, bu sahifa oʻsha faylni oʻqiydi va undagi oʻzingiz yozgan qismni qaytarib qoʻyadi.',
    'restore.canHeading': 'Nimalar qaytishi mumkin',
    'restore.canProfile': 'Profilingiz',
    'restore.canProfileNote':
      'Ism, til, vaqt mintaqasi va mamlakat. Faqat fayl hozir bu yerda turganidan farq qiladigan joyda va faqat bu platforma saqlay oladigan qiymatlar.',
    'restore.canNotes': 'Qaydlaringiz va xatchoʻplaringiz',
    'restore.canNotesNote':
      'Ular yozilgan darslarga qaytarib qoʻyiladi, lekin faqat hozir siz yozilgan kurslarda. Qayd bitta yozilishga tegishli, shuning uchun siz tark etgan kursda uni qoʻyadigan joy yoʻq.',
    'restore.cannotHeading': 'Nimalar qayta olmaydi va nima uchun',
    'restore.cannotEnrol': 'Yozilishlar',
    'restore.cannotEnrolNote':
      'Yozilish huquqdir, baʼzan esa pullik huquq. Uni bera oladigan fayl kurslarni tekin tarqatadigan fayl boʻlar edi. Qayta yoziling, soʻng fayldan ikkinchi marta foydalaning: qaydlaringiz oʻz darslarini topadi.',
    'restore.cannotCert': 'Sertifikatlar',
    'restore.cannotCertNote':
      'Sertifikatni platforma beradi. Fayldan yozilgan sertifikat tekshiruvdan oʻtadigan soxta hujjat boʻlar edi. Faylingizdagi raqamlar hali ham haqiqiy va sertifikat tekshiruvi ularni hali ham tasdiqlaydi.',
    'restore.cannotMoney': 'Buyurtmalar, pul qaytarishlar va oʻzlashtirish',
    'restore.cannotMoneyNote':
      'Bular bu yerda sodir boʻlgan narsalarning platforma saqlaydigan yozuvlaridir. Ulardan birini fayldan qaytarib qoʻyish nusxa emas, daʼvo boʻlar edi. Kvitansiyalaringiz oʻz hisobingiz uchun faylda qoladi.',
    'restore.cannotPublished': 'Siz eʼlon qilgan narsalar va baholangan ishlaringiz',
    'restore.cannotPublishedNote':
      'Sharhlar, muhokama xabarlari va topshirilgan vazifalarning har biri bu yerda eʼlon qilingan va kerak boʻlganda nazoratdan oʻtgan. Ularni fayldan qayta joylash hech kim qayta oʻqimagan soʻzlarni eʼlon qilish boʻlar edi.',
    'restore.cannotPeople': 'Bolalar, rollar va ruxsatlar',
    'restore.cannotPeopleNote':
      'Bola profilida uning vasiysi kim ekani qayd etiladi, xodim rolini esa odam beradi, u faylda olib kelinmaydi. Ikkalasi ham kim qilganini qayd etadigan ekranlar orqali qoʻshiladi.',
    'restore.cannotHistory': 'Faoliyatingiz tarixi',
    'restore.cannotHistoryNote':
      'Bu yerda sodir boʻlgan narsalarning yozuvi boʻlib, unga faqat qoʻshish mumkin. Fayldan olib kirilgan tarix toʻqilgan tarix boʻlar edi.',
    'restore.cannotSignIn': 'Kirish manzilingiz va parolingiz',
    'restore.cannotSignInNote':
      'Ikkalasini ham kirish xizmati shu yozuvlardan alohida saqlaydi. Foydalanmoqchi boʻlgan manzilingiz bilan kiring; fayl uni belgilay olmaydi.',
    'restore.foot':
      'Nima yozilishini koʻrmaguningizcha hech narsa yozilmaydi. Faylning qaytarib qoʻyilishi nima qaytarilgani bilan birga audit qaydiga yoziladi.',
    'restore.fileLabel': 'Eksport sahifasi yuklab bergan JSON fayli',
    'restore.fileHint':
      'Elektron jadval va chop etiladigan nusxa oʻqish uchun; bu sahifaga JSON fayli kerak. Uning nomi shunday boshlanadi: {name}',
    'restore.check': 'Bu faylni tekshirish',
    'restore.checking': 'Tekshirilmoqda…',
    'restore.another': 'Boshqa fayl tanlash',
    'restore.apply': 'Qaytarib qoʻyish mumkin boʻlganini qaytarib qoʻyish',
    'restore.applying': 'Qaytarib qoʻyilmoqda…',
    'restore.different': 'Boshqa faylni qaytarib qoʻyish',
    'restore.errLarge':
      'Bu fayl maʼlumotlaringiz nusxasi boʻlishi mumkin boʻlgan hajmdan katta. Eksport sahifasi yuklab bergan JSON faylini tanlang.',
    'restore.errNotJson':
      'Bu fayl boʻsh yoki JSON emas. Eksport sahifasi yuklab bergan JSON faylini tanlang; elektron jadval va chop etiladigan nusxani qaytarib qoʻyib boʻlmaydi.',
    'restore.errNotExport':
      'Bu faylda JSON bor, lekin u shu platforma yaratgan maʼlumotlaringiz nusxasi emas.',
    'restore.errNewer':
      'Bu nusxani platformaning bu yerda oʻqiladiganidan yangiroq versiyasi yaratgan, shuning uchun uni bu yerda qaytarib qoʻyib boʻlmaydi.',
    'restore.errSignedOut':
      'Siz hisobdan chiqqansiz. Qayta kiring, soʻng faylni yana tanlang. Hech narsa oʻzgarmadi.',
    'restore.errCheckFailed':
      'Faylni tekshirib boʻlmadi va hech narsa oʻzgarmadi. Aloqangizni tekshirib, qayta urinib koʻring.',
    'restore.errRefused': 'Platforma bu faylni rad etdi. Hech narsa oʻzgarmadi.',
    'restore.unconfirmed':
      'Fayl qaytarib qoʻyilgan-qoʻyilmaganini tasdiqlay olmadik. Faylni yana tekshiring: bu yerda allaqachon bor band oʻtkazib yuboriladi, shuning uchun hech narsa ikki marta yozilmaydi.',
    'restore.resultCheck': 'Bu fayl nimalarni qaytarib qoʻyadi',
    'restore.resultApplied': 'Bu fayl nimalarni qaytarib qoʻydi',
    'restore.resultNothing': 'Hozirgi holatda bu fayldagi hech narsani qaytarib qoʻyib boʻlmaydi.',
    'restore.resultAllHere': 'Bu fayl qaytarib qoʻya oladigan narsalar allaqachon shu yerda.',
    'restore.lineNotes': 'Qaydlar: {count}',
    'restore.lineMarks': 'Xatchoʻplar: {count}',
    'restore.lineProfile': 'Profil tafsilotlari: {fields}',
    'restore.lineHere': 'Allaqachon shu yerda va oʻz holicha qoldirildi: {count}',
    'restore.skippedHeading': 'Faylda nimalar qoldi va nima uchun',
    'restore.nothingWritten':
      'Hali hech narsa yozilmadi. Faylni tekshirish hech narsani oʻzgartirmaydi.',
    'restore.afterApplied':
      'Faylingiz oʻzgarmadi, shuning uchun undan yana foydalanish mumkin: bu yerda allaqachon bor band oʻtkazib yuboriladi, ikki marta yozilmaydi. Hech bir fayl hech qachon qaytarib qoʻymaydigan narsalar shu sahifaning quyirogʻida sanab oʻtilgan.',
    'restore.fieldCountry': 'Mamlakat',
    'restore.whereEntry': 'Saqlangan band',
    'restore.whyNameBlank': 'Fayldagi ism boʻsh, profilning ismi esa boʻsh boʻla olmaydi.',
    'restore.whyNameLong': 'Fayldagi ism juda uzun. Ismdagi belgilarning eng koʻp soni: {count}',
    'restore.whyLanguage':
      'Fayldagi til profil saqlay oladigan shaklda yozilmagan. Faylda: {value}',
    'restore.whyTimezone':
      'Fayldagi vaqt mintaqasi bu platforma biladigan mintaqa emas. Faylda: {value}',
    'restore.whyCountry': 'Fayldagi mamlakat ikki harfli mamlakat kodi emas. Faylda: {value}',
    'restore.whyNotList': 'Bu faylning bir qismi roʻyxat emas, shuning uchun uni oʻqib boʻlmadi.',
    'restore.whyCapped':
      'Bu roʻyxat bir martada oʻqiladiganidan uzun, shuning uchun faqat boshi oʻqiladi. Oʻqilgan bandlar: {read}. Fayldagi bandlar: {held}',
    'restore.whyOff':
      'Qaydlar va xatchoʻplar bu platformada oʻchirilgan, shuning uchun ularni qoʻyadigan joy yoʻq. Ular hali ham faylingizda.',
    'restore.whyNoteEmpty': 'Bu qaydda matn yoʻq.',
    'restore.whyNoteLong': 'Bu qayd juda uzun. Qayddagi belgilarning eng koʻp soni: {count}',
    'restore.whyNoLesson': 'Bu bandda dars nomi yoʻq, shuning uchun uni biriktiradigan narsa yoʻq.',
    'restore.whyNotEnrolled': 'Hozir siz shu nomli darsi bor kursga yozilmagansiz.',
    'restore.whyAmbiguous':
      'Kurslaringizning bir nechtasida shu nomli dars bor va fayl qaysi biri ekanini ayta olmaydi.',
    'restore.whyDiffers':
      'Oʻshandan beri siz bu darsga boshqa qayd yozgansiz va u almashtirilmadi.',
    'restore.whyNoAccess': 'Bu kursda faol yozilish va bu darsga kirish huquqi kerak.',
    'restore.whyOther': 'Bu bandni qaytarib qoʻyib boʻlmadi.',
  },
  kk: {
    'restore.title': 'Деректеріңізді қайта қойыңыз',
    'restore.crumb': 'Қалпына келтіру',
    'restore.lede':
      'Деректеріңіздің көшірмесін жүктеп алып, оны қайтарғыңыз келсе, үзілістен кейін осы тіркелгіге немесе жаңа тіркелгіге, бұл бет сол файлды оқып, ішіндегі өзіңіз жазған бөлікті қайта қояды.',
    'restore.canHeading': 'Не қайта орала алады',
    'restore.canProfile': 'Профиліңіз',
    'restore.canProfileNote':
      'Аты, тілі, уақыт белдеуі және елі. Тек файл қазір осында тұрғаннан өзгеше болған жерде және тек осы платформа сақтай алатын мәндер.',
    'restore.canNotes': 'Жазбаларыңыз бен бетбелгілеріңіз',
    'restore.canNotesNote':
      'Олар жазылған сабақтарға қайта қойылады, бірақ тек қазір сіз тіркелген курстарда. Жазба бір тіркелуге тиесілі, сондықтан сіз шығып кеткен курста оны қоятын орын жоқ.',
    'restore.cannotHeading': 'Не орала алмайды және неліктен',
    'restore.cannotEnrol': 'Тіркелулер',
    'restore.cannotEnrolNote':
      'Тіркелу — құқық, кейде ақылы құқық. Оны бере алатын файл курстарды тегін тарататын файл болар еді. Қайта тіркеліңіз, сосын файлды екінші рет пайдаланыңыз: жазбаларыңыз өз сабақтарын табады.',
    'restore.cannotCert': 'Сертификаттар',
    'restore.cannotCertNote':
      'Сертификатты платформа береді. Файлдан жазылған сертификат тексеруден өтетін жалған құжат болар еді. Файлыңыздағы нөмірлер әлі де шынайы, ал сертификатты тексеру оларды әлі де растайды.',
    'restore.cannotMoney': 'Тапсырыстар, ақша қайтарулар және үлгерім',
    'restore.cannotMoneyNote':
      'Бұлар — осында болған оқиғалардың платформа жүргізетін есебі. Олардың бірін файлдан қайта қою көшірме емес, мәлімдеме болар еді. Түбіртектеріңіз өз есебіңіз үшін файлда қалады.',
    'restore.cannotPublished': 'Сіз жариялаған нәрселер және бағаланған жұмыстарыңыз',
    'restore.cannotPublishedNote':
      'Пікірлер, талқылау хабарламалары және тапсырылған жұмыстардың әрқайсысы осында жарияланып, қажет болғанда тексеруден өткен. Оларды файлдан қайта жариялау ешкім қайта оқымаған сөздерді жариялау болар еді.',
    'restore.cannotPeople': 'Балалар, рөлдер және рұқсаттар',
    'restore.cannotPeopleNote':
      'Баланың профилінде оның қамқоршысы кім екені жазылады, ал қызметкер рөлін адам береді, ол файлмен келмейді. Екеуі де кім жасағанын тіркейтін экрандар арқылы қосылады.',
    'restore.cannotHistory': 'Әрекеттеріңіздің тарихы',
    'restore.cannotHistoryNote':
      'Бұл — осында болған оқиғалардың есебі, оған тек қосуға болады. Файлдан әкелінген тарих ойдан шығарылған тарих болар еді.',
    'restore.cannotSignIn': 'Кіру мекенжайыңыз бен құпия сөзіңіз',
    'restore.cannotSignInNote':
      'Екеуін де кіру қызметі осы есептен бөлек сақтайды. Пайдаланғыңыз келетін мекенжаймен кіріңіз; файл оны белгілей алмайды.',
    'restore.foot':
      'Не жазылатынын көрмейінше ештеңе жазылмайды. Файлдың қайта қойылуы не қайта қойылғанымен бірге аудит журналына жазылады.',
    'restore.fileLabel': 'Экспорт беті жүктеп берген JSON файлы',
    'restore.fileHint':
      'Электрондық кесте мен басып шығаруға арналған көшірме оқуға арналған; бұл бетке JSON файлы керек. Оның атауы былай басталады: {name}',
    'restore.check': 'Осы файлды тексеру',
    'restore.checking': 'Тексерілуде…',
    'restore.another': 'Басқа файл таңдау',
    'restore.apply': 'Қайта қоюға болатынды қайта қою',
    'restore.applying': 'Қайта қойылуда…',
    'restore.different': 'Басқа файлды қайта қою',
    'restore.errLarge':
      'Бұл файл деректеріңіздің көшірмесі бола алатын көлемнен үлкен. Экспорт беті жүктеп берген JSON файлын таңдаңыз.',
    'restore.errNotJson':
      'Бұл файл бос немесе JSON емес. Экспорт беті жүктеп берген JSON файлын таңдаңыз; электрондық кесте мен басып шығаруға арналған көшірмені қайта қою мүмкін емес.',
    'restore.errNotExport':
      'Бұл файлда JSON бар, бірақ ол осы платформа жасаған деректеріңіздің көшірмесі емес.',
    'restore.errNewer':
      'Бұл көшірмені платформаның осында оқылатынынан жаңарақ нұсқасы жасаған, сондықтан оны осында қайта қою мүмкін емес.',
    'restore.errSignedOut':
      'Сіз тіркелгіден шығып қалғансыз. Қайта кіріңіз, сосын файлды қайта таңдаңыз. Ештеңе өзгерген жоқ.',
    'restore.errCheckFailed':
      'Файлды тексеру мүмкін болмады, ештеңе өзгерген жоқ. Байланысыңызды тексеріп, қайталап көріңіз.',
    'restore.errRefused': 'Платформа бұл файлдан бас тартты. Ештеңе өзгерген жоқ.',
    'restore.unconfirmed':
      'Файлдың қайта қойылған-қойылмағанын растай алмадық. Файлды қайта тексеріңіз: осында бұрыннан бар элемент өткізіп жіберіледі, сондықтан ештеңе екі рет жазылмайды.',
    'restore.resultCheck': 'Бұл файл нені қайта қояды',
    'restore.resultApplied': 'Бұл файл нені қайта қойды',
    'restore.resultNothing': 'Қазіргі жағдайда бұл файлдағы ештеңені қайта қою мүмкін емес.',
    'restore.resultAllHere': 'Бұл файл қайта қоя алатын нәрселер осында бұрыннан бар.',
    'restore.lineNotes': 'Жазбалар: {count}',
    'restore.lineMarks': 'Бетбелгілер: {count}',
    'restore.lineProfile': 'Профиль мәліметтері: {fields}',
    'restore.lineHere': 'Осында бұрыннан бар және сол күйінде қалдырылды: {count}',
    'restore.skippedHeading': 'Файлда не қалды және неліктен',
    'restore.nothingWritten': 'Әзірге ештеңе жазылған жоқ. Файлды тексеру ештеңені өзгертпейді.',
    'restore.afterApplied':
      'Файлыңыз өзгерген жоқ, сондықтан оны қайта пайдалануға болады: осында бұрыннан бар элемент өткізіп жіберіледі, екі рет жазылмайды. Ешбір файл ешқашан қайта қоймайтын нәрселер осы беттің төменгі жағында аталған.',
    'restore.fieldCountry': 'Ел',
    'restore.whereEntry': 'Сақталған элемент',
    'restore.whyNameBlank': 'Файлдағы ат бос, ал профильдің аты бос бола алмайды.',
    'restore.whyNameLong': 'Файлдағы ат тым ұзын. Аттағы таңбалардың ең көп саны: {count}',
    'restore.whyLanguage': 'Файлдағы тіл профиль сақтай алатын түрде жазылмаған. Файлда: {value}',
    'restore.whyTimezone':
      'Файлдағы уақыт белдеуі осы платформа білетін белдеу емес. Файлда: {value}',
    'restore.whyCountry': 'Файлдағы ел екі әріпті ел коды емес. Файлда: {value}',
    'restore.whyNotList': 'Бұл файлдың бір бөлігі тізім емес, сондықтан оны оқу мүмкін болмады.',
    'restore.whyCapped':
      'Бұл тізім бір жолда оқылатыннан ұзын, сондықтан тек басы оқылады. Оқылған элементтер: {read}. Файлдағы элементтер: {held}',
    'restore.whyOff':
      'Жазбалар мен бетбелгілер осы платформада өшірілген, сондықтан оларды қоятын орын жоқ. Олар әлі де файлыңызда.',
    'restore.whyNoteEmpty': 'Бұл жазбада мәтін жоқ.',
    'restore.whyNoteLong': 'Бұл жазба тым ұзын. Жазбадағы таңбалардың ең көп саны: {count}',
    'restore.whyNoLesson': 'Бұл элементте сабақ аталмаған, сондықтан оны тіркейтін ештеңе жоқ.',
    'restore.whyNotEnrolled': 'Қазір сіз осындай атаулы сабағы бар курсқа тіркелмегенсіз.',
    'restore.whyAmbiguous':
      'Курстарыңыздың бірнешеуінде осындай атаулы сабақ бар, ал файл қайсысы екенін айта алмайды.',
    'restore.whyDiffers':
      'Содан бері сіз бұл сабаққа басқа жазба жазғансыз, және ол ауыстырылған жоқ.',
    'restore.whyNoAccess': 'Осы курста белсенді тіркелу және осы сабаққа қолжетімділік қажет.',
    'restore.whyOther': 'Бұл элементті қайта қою мүмкін болмады.',
  },
  az: {
    'restore.title': 'Məlumatlarınızı geri qoyun',
    'restore.crumb': 'Bərpa',
    'restore.lede':
      'Məlumatlarınızın surətini endirmisinizsə və onu geri istəyirsinizsə, fasilədən sonra bu hesaba və ya yeni hesaba, bu səhifə həmin faylı oxuyur və içindəki özünüzün yazdığınız hissəni geri qoyur.',
    'restore.canHeading': 'Nə geri qayıda bilər',
    'restore.canProfile': 'Profiliniz',
    'restore.canProfileNote':
      'Ad, dil, saat qurşağı və ölkə. Yalnız faylın hazırda burada olandan fərqləndiyi yerdə və yalnız bu platformanın saxlaya bildiyi dəyərlər.',
    'restore.canNotes': 'Qeydləriniz və əlfəcinləriniz',
    'restore.canNotesNote':
      'Yazıldıqları dərslərə geri qoyulur, amma yalnız hazırda yazıldığınız kurslarda. Qeyd bir yazılışa aiddir, ona görə tərk etdiyiniz kursda onu qoymağa yer yoxdur.',
    'restore.cannotHeading': 'Nə qayıda bilməz və niyə',
    'restore.cannotEnrol': 'Yazılışlar',
    'restore.cannotEnrolNote':
      'Yazılış hüquqdur, bəzən də ödənişli hüquq. Onu verə bilən fayl kursları pulsuz paylayan fayl olardı. Yenidən yazılın, sonra fayldan ikinci dəfə istifadə edin: qeydləriniz öz dərslərini tapacaq.',
    'restore.cannotCert': 'Sertifikatlar',
    'restore.cannotCertNote':
      'Sertifikatı platforma verir. Fayldan yazılan sertifikat yoxlamadan keçən saxta sənəd olardı. Faylınızdakı nömrələr hələ də həqiqidir və sertifikat yoxlaması onları hələ də təsdiqləyir.',
    'restore.cannotMoney': 'Sifarişlər, geri ödənişlər və irəliləyiş',
    'restore.cannotMoneyNote':
      'Bunlar burada baş verənlərin platformanın apardığı uçotudur. Onlardan birini fayldan geri qoymaq surət yox, iddia olardı. Qəbzləriniz öz uçotunuz üçün faylda qalır.',
    'restore.cannotPublished': 'Dərc etdikləriniz və qiymətləndirildiyiniz işlər',
    'restore.cannotPublishedNote':
      'Rəylər, müzakirə yazıları və təhvil verilən tapşırıqların hər biri burada dərc olunub və lazım olan yerdə nəzarətdən keçib. Onları fayldan yenidən göndərmək heç kimin yenidən oxumadığı sözləri dərc etmək olardı.',
    'restore.cannotPeople': 'Uşaqlar, rollar və icazələr',
    'restore.cannotPeopleNote':
      'Uşağın profilində qəyyumunun kim olduğu yazılır, əməkdaş rolunu isə insan verir, o, faylla gəlmir. Hər ikisi bunu kimin etdiyini qeydə alan ekranlar vasitəsilə əlavə olunur.',
    'restore.cannotHistory': 'Fəaliyyət tarixçəniz',
    'restore.cannotHistoryNote':
      'Bu, burada baş verənlərin uçotudur və ona yalnız əlavə etmək olar. Fayldan gətirilən tarixçə uydurma tarixçə olardı.',
    'restore.cannotSignIn': 'Giriş ünvanınız və şifrəniz',
    'restore.cannotSignInNote':
      'Hər ikisini giriş xidməti bu uçotdan ayrı saxlayır. İstifadə etmək istədiyiniz ünvanla daxil olun; fayl onu təyin edə bilməz.',
    'restore.foot':
      'Nəyin yazılacağını görməyincə heç nə yazılmır. Faylın geri qoyulması nəyin geri qoyulduğu ilə birlikdə audit jurnalına yazılır.',
    'restore.fileLabel': 'İxrac səhifəsinin endirdiyi JSON faylı',
    'restore.fileHint':
      'Elektron cədvəl və çap üçün surət oxumaq üçündür; bu səhifəyə JSON faylı lazımdır. Onun adı belə başlayır: {name}',
    'restore.check': 'Bu faylı yoxla',
    'restore.checking': 'Yoxlanılır…',
    'restore.another': 'Başqa fayl seç',
    'restore.apply': 'Geri qoyula biləni geri qoy',
    'restore.applying': 'Geri qoyulur…',
    'restore.different': 'Başqa bir faylı geri qoy',
    'restore.errLarge':
      'Bu fayl məlumatlarınızın surətinin ola biləcəyi ölçüdən böyükdür. İxrac səhifəsinin endirdiyi JSON faylını seçin.',
    'restore.errNotJson':
      'Bu fayl boşdur və ya JSON deyil. İxrac səhifəsinin endirdiyi JSON faylını seçin; elektron cədvəl və çap üçün surət geri qoyula bilməz.',
    'restore.errNotExport':
      'Bu faylda JSON var, amma o, bu platformanın yaratdığı məlumatlarınızın surəti deyil.',
    'restore.errNewer':
      'Bu surəti platformanın burada oxunandan daha yeni versiyası yaradıb, ona görə onu burada geri qoymaq olmur.',
    'restore.errSignedOut':
      'Siz hesabdan çıxmısınız. Yenidən daxil olun, sonra faylı yenidən seçin. Heç nə dəyişmədi.',
    'restore.errCheckFailed':
      'Faylı yoxlamaq mümkün olmadı və heç nə dəyişmədi. Bağlantınızı yoxlayıb yenidən cəhd edin.',
    'restore.errRefused': 'Platforma bu faylı rədd etdi. Heç nə dəyişmədi.',
    'restore.unconfirmed':
      'Faylın geri qoyulub-qoyulmadığını təsdiqləyə bilmədik. Faylı yenidən yoxlayın: artıq burada olan bənd ötürülür, ona görə heç nə iki dəfə yazılmır.',
    'restore.resultCheck': 'Bu fayl nəyi geri qoyacaq',
    'restore.resultApplied': 'Bu fayl nəyi geri qoydu',
    'restore.resultNothing': 'İndiki vəziyyətdə bu fayldakı heç nə geri qoyula bilməz.',
    'restore.resultAllHere': 'Bu faylın geri qoya biləcəyi artıq buradadır.',
    'restore.lineNotes': 'Qeydlər: {count}',
    'restore.lineMarks': 'Əlfəcinlər: {count}',
    'restore.lineProfile': 'Profil təfərrüatları: {fields}',
    'restore.lineHere': 'Artıq burada olan və olduğu kimi saxlanan: {count}',
    'restore.skippedHeading': 'Faylda nə qaldı və niyə',
    'restore.nothingWritten': 'Hələ heç nə yazılmayıb. Faylı yoxlamaq heç nəyi dəyişmir.',
    'restore.afterApplied':
      'Faylınız dəyişməyib, ona görə ondan yenidən istifadə etmək olar: artıq burada olan bənd ötürülür, iki dəfə yazılmır. Heç bir faylın heç vaxt geri qoymadığı şeylər bu səhifənin aşağısında sadalanıb.',
    'restore.fieldCountry': 'Ölkə',
    'restore.whereEntry': 'Saxlanmış bənd',
    'restore.whyNameBlank': 'Fayldakı ad boşdur, profilin adı isə boş ola bilməz.',
    'restore.whyNameLong': 'Fayldakı ad çox uzundur. Adda ola biləcək ən çox simvol sayı: {count}',
    'restore.whyLanguage':
      'Fayldakı dil profilin saxlaya biləcəyi formada yazılmayıb. Faylda: {value}',
    'restore.whyTimezone':
      'Fayldakı saat qurşağı bu platformanın tanıdığı qurşaq deyil. Faylda: {value}',
    'restore.whyCountry': 'Fayldakı ölkə iki hərfli ölkə kodu deyil. Faylda: {value}',
    'restore.whyNotList': 'Bu faylın bir hissəsi siyahı deyil, ona görə oxuna bilmədi.',
    'restore.whyCapped':
      'Bu siyahı bir dəfəyə oxunandan uzundur, ona görə yalnız əvvəli oxunur. Oxunan bəndlər: {read}. Fayldakı bəndlər: {held}',
    'restore.whyOff':
      'Qeydlər və əlfəcinlər bu platformada söndürülüb, ona görə onları qoymağa yer yoxdur. Onlar hələ də faylınızdadır.',
    'restore.whyNoteEmpty': 'Bu qeyddə mətn yoxdur.',
    'restore.whyNoteLong': 'Bu qeyd çox uzundur. Qeyddə ola biləcək ən çox simvol sayı: {count}',
    'restore.whyNoLesson': 'Bu bənddə dərs adı çəkilmir, ona görə onu əlavə etməyə bir şey yoxdur.',
    'restore.whyNotEnrolled': 'Hazırda bu adda dərsi olan kursa yazılmamısınız.',
    'restore.whyAmbiguous':
      'Kurslarınızın birdən çoxunda bu adda dərs var və fayl hansı olduğunu deyə bilmir.',
    'restore.whyDiffers': 'O vaxtdan bəri bu dərsə başqa qeyd yazmısınız və o, əvəz olunmadı.',
    'restore.whyNoAccess': 'Bu kursda aktiv yazılış və bu dərsə giriş lazımdır.',
    'restore.whyOther': 'Bu bənd geri qoyula bilmədi.',
  },
  tg: {
    'restore.title': 'Маълумоти худро баргардонед',
    'restore.crumb': 'Барқарорсозӣ',
    'restore.lede':
      'Агар нусхаи маълумоти худро боргирӣ карда бошед ва онро баргардондан хоҳед, пас аз танаффус ба ҳамин ҳисоб ё ба ҳисоби нав, ин саҳифа он файлро мехонад ва қисмеро, ки худатон навиштаед, бармегардонад.',
    'restore.canHeading': 'Чӣ баргашта метавонад',
    'restore.canProfile': 'Профили шумо',
    'restore.canProfileNote':
      'Ном, забон, минтақаи вақт ва кишвар. Танҳо дар ҷое, ки файл аз он чи ҳоло дар ин ҷост, фарқ мекунад, ва танҳо қиматҳое, ки ин платформа нигоҳ дошта метавонад.',
    'restore.canNotes': 'Қайдҳо ва хатчӯбҳои шумо',
    'restore.canNotesNote':
      'Ба дарсҳое, ки дар онҳо навишта шуда буданд, баргардонда мешаванд, вале танҳо дар курсҳое, ки ҳоло ба онҳо номнавис ҳастед. Қайд ба як номнависӣ тааллуқ дорад, аз ин рӯ дар курсе, ки тарк кардаед, барои гузоштани он ҷой нест.',
    'restore.cannotHeading': 'Чӣ наметавонад ва чаро',
    'restore.cannotEnrol': 'Номнависиҳо',
    'restore.cannotEnrolNote':
      'Номнависӣ ҳуқуқ аст, гоҳе ҳуқуқи пулакӣ. Файле, ки онро дода метавонад, файле мебуд, ки курсҳоро ройгон тақсим мекунад. Аз нав номнавис шавед, сипас файлро бори дуюм истифода баред: қайдҳои шумо дарсҳои худро меёбанд.',
    'restore.cannotCert': 'Шаҳодатномаҳо',
    'restore.cannotCertNote':
      'Шаҳодатномаро платформа медиҳад. Шаҳодатномае, ки аз файл навишта шудааст, ҳуҷҷати қалбакие мебуд, ки аз тафтиш мегузарад. Рақамҳои файли шумо ҳанӯз ҳақиқӣ ҳастанд ва тафтиши шаҳодатнома онҳоро ҳанӯз тасдиқ мекунад.',
    'restore.cannotMoney': 'Фармоишҳо, баргардонидани маблағ ва пешрафт',
    'restore.cannotMoneyNote':
      'Инҳо сабтҳои он чи дар ин ҷо рух додааст мебошанд, ки платформа нигоҳ медорад. Баргардондани яке аз онҳо аз файл нусха не, балки иддао мебуд. Расидҳои шумо барои ҳисоби худатон дар файл мемонанд.',
    'restore.cannotPublished': 'Он чи нашр кардаед ва он чи барояш баҳо гирифтаед',
    'restore.cannotPublishedNote':
      'Тақризҳо, паёмҳои муҳокима ва супоришҳои супурдашуда ҳар яке дар ин ҷо нашр шуда, дар ҷойи лозим аз назорат гузаштааст. Аз нав фиристодани онҳо аз файл нашри суханоне мебуд, ки ҳеҷ кас дубора нахондааст.',
    'restore.cannotPeople': 'Кӯдакон, нақшҳо ва иҷозатҳо',
    'restore.cannotPeopleNote':
      'Дар профили кӯдак сабт мешавад, ки сарпарасти ӯ кист, ва нақши кормандро шахс медиҳад, он дар файл оварда намешавад. Ҳарду тавассути экранҳое илова мешаванд, ки кӣ ин корро кардааст, сабт мекунанд.',
    'restore.cannotHistory': 'Таърихи фаъолияти шумо',
    'restore.cannotHistoryNote':
      'Ин сабти он чи дар ин ҷо рух додааст мебошад ва ба он танҳо илова кардан мумкин аст. Таърихе, ки аз файл оварда шудааст, таърихи бофта мебуд.',
    'restore.cannotSignIn': 'Суроғаи воридшавӣ ва рамзи шумо',
    'restore.cannotSignInNote':
      'Ҳардуро хадамоти воридшавӣ ҷудо аз ин сабт нигоҳ медорад. Бо суроғае, ки истифода бурдан мехоҳед, ворид шавед; файл онро муқаррар карда наметавонад.',
    'restore.foot':
      'То он даме ки набинед, ки чӣ навишта мешавад, ҳеҷ чиз навишта намешавад. Баргардондани файл дар сабти аудит навишта мешавад, ҳамроҳ бо он чи баргардонда шуд.',
    'restore.fileLabel': 'Файли JSON, ки саҳифаи содирот боргирӣ кардааст',
    'restore.fileHint':
      'Ҷадвали электронӣ ва нусхаи чопӣ барои хондан мебошанд; ба ин саҳифа файли JSON лозим аст. Номи он чунин оғоз мешавад: {name}',
    'restore.check': 'Ин файлро тафтиш кунед',
    'restore.checking': 'Тафтиш шуда истодааст…',
    'restore.another': 'Файли дигарро интихоб кунед',
    'restore.apply': 'Он чиро, ки баргардондан мумкин аст, баргардонед',
    'restore.applying': 'Баргардонда шуда истодааст…',
    'restore.different': 'Файли дигарро баргардонед',
    'restore.errLarge':
      'Ин файл аз он андозае, ки нусхаи маълумоти шумо буда метавонад, калонтар аст. Файли JSON-ро, ки саҳифаи содирот боргирӣ кардааст, интихоб кунед.',
    'restore.errNotJson':
      'Ин файл холӣ аст ё JSON нест. Файли JSON-ро, ки саҳифаи содирот боргирӣ кардааст, интихоб кунед; ҷадвали электронӣ ва нусхаи чопиро баргардондан мумкин нест.',
    'restore.errNotExport':
      'Дар ин файл JSON ҳаст, вале он нусхаи маълумоти шумо нест, ки ин платформа сохта бошад.',
    'restore.errNewer':
      'Ин нусхаро версияи платформа сохтааст, ки аз версияи дар ин ҷо хондашаванда навтар аст, аз ин рӯ онро дар ин ҷо баргардондан мумкин нест.',
    'restore.errSignedOut':
      'Шумо аз ҳисоб баромадаед. Аз нав ворид шавед, сипас файлро дубора интихоб кунед. Ҳеҷ чиз тағйир наёфт.',
    'restore.errCheckFailed':
      'Файлро тафтиш кардан муяссар нашуд ва ҳеҷ чиз тағйир наёфт. Пайвасти худро тафтиш карда, дубора кӯшиш кунед.',
    'restore.errRefused': 'Платформа ин файлро рад кард. Ҳеҷ чиз тағйир наёфт.',
    'restore.unconfirmed':
      'Мо тасдиқ карда натавонистем, ки файл баргардонда шудааст ё не. Файлро дубора тафтиш кунед: банде, ки аллакай дар ин ҷост, гузаронда мешавад, аз ин рӯ ҳеҷ чиз ду бор навишта намешавад.',
    'restore.resultCheck': 'Ин файл чиро бармегардонад',
    'restore.resultApplied': 'Ин файл чиро баргардонд',
    'restore.resultNothing': 'Дар ҳолати кунунӣ аз ин файл ҳеҷ чизро баргардондан мумкин нест.',
    'restore.resultAllHere': 'Он чи ин файл баргардонда метавонад, аллакай дар ин ҷост.',
    'restore.lineNotes': 'Қайдҳо: {count}',
    'restore.lineMarks': 'Хатчӯбҳо: {count}',
    'restore.lineProfile': 'Тафсилоти профил: {fields}',
    'restore.lineHere': 'Аллакай дар ин ҷо буданд ва ҳамон тавр монданд: {count}',
    'restore.skippedHeading': 'Чӣ дар файл монд ва чаро',
    'restore.nothingWritten':
      'Ҳанӯз ҳеҷ чиз навишта нашудааст. Тафтиши файл ҳеҷ чизро тағйир намедиҳад.',
    'restore.afterApplied':
      'Файли шумо тағйир наёфтааст, аз ин рӯ онро боз истифода бурдан мумкин аст: банде, ки аллакай дар ин ҷост, гузаронда мешавад, ду бор навишта намешавад. Он чи ҳеҷ файл ҳеҷ гоҳ барнамегардонад, дар поёни ҳамин саҳифа номбар шудааст.',
    'restore.fieldCountry': 'Кишвар',
    'restore.whereEntry': 'Банди сабтшуда',
    'restore.whyNameBlank': 'Ном дар файл холӣ аст ва номи профил холӣ буда наметавонад.',
    'restore.whyNameLong':
      'Ном дар файл аз ҳад дароз аст. Шумораи зиёдтарини аломатҳои ном: {count}',
    'restore.whyLanguage':
      'Забон дар файл ба шакле навишта нашудааст, ки профил нигоҳ дошта тавонад. Дар файл: {value}',
    'restore.whyTimezone':
      'Минтақаи вақт дар файл барои ин платформа шинос нест. Дар файл: {value}',
    'restore.whyCountry': 'Кишвар дар файл рамзи дуҳарфаи кишвар нест. Дар файл: {value}',
    'restore.whyNotList': 'Як қисми ин файл рӯйхат нест, аз ин рӯ онро хондан муяссар нашуд.',
    'restore.whyCapped':
      'Ин рӯйхат аз он чи дар як бор хонда мешавад, дарозтар аст, аз ин рӯ танҳо аввали он хонда мешавад. Бандҳои хондашуда: {read}. Бандҳои файл: {held}',
    'restore.whyOff':
      'Қайдҳо ва хатчӯбҳо дар ин платформа хомӯш карда шудаанд, аз ин рӯ барои гузоштани онҳо ҷой нест. Онҳо ҳанӯз дар файли шумо ҳастанд.',
    'restore.whyNoteEmpty': 'Ин қайд матн надорад.',
    'restore.whyNoteLong': 'Ин қайд аз ҳад дароз аст. Шумораи зиёдтарини аломатҳои қайд: {count}',
    'restore.whyNoLesson':
      'Ин банд ягон дарсро ном намебарад, аз ин рӯ чизе нест, ки ба он пайваст шавад.',
    'restore.whyNotEnrolled': 'Ҳоло шумо ба курсе, ки дарси чунин ном дорад, номнавис нестед.',
    'restore.whyAmbiguous':
      'Дар зиёда аз як курси шумо дарси чунин ном ҳаст ва файл гуфта наметавонад, ки кадомаш.',
    'restore.whyDiffers':
      'Аз он вақт шумо ба ин дарс қайди дигаре навиштаед ва он иваз карда нашуд.',
    'restore.whyNoAccess': 'Номнависии фаъол дар ин курс ва дастрасӣ ба ин дарс лозим аст.',
    'restore.whyOther': 'Ин бандро баргардондан муяссар нашуд.',
  },
  ky: {
    'restore.title': 'Маалыматтарыңызды кайра коюңуз',
    'restore.crumb': 'Калыбына келтирүү',
    'restore.lede':
      'Эгер маалыматтарыңыздын көчүрмөсүн жүктөп алып, аны кайтаргыңыз келсе, тыныгуудан кийин ушул аккаунтка же жаңы аккаунтка, бул барак ошол файлды окуп, ичиндеги өзүңүз жазган бөлүктү кайра коёт.',
    'restore.canHeading': 'Эмнелер кайтып келе алат',
    'restore.canProfile': 'Профилиңиз',
    'restore.canProfileNote':
      'Аты, тили, убакыт алкагы жана өлкөсү. Файл азыр бул жерде турганынан айырмаланган жерде гана жана бул платформа сактай алган маанилер гана.',
    'restore.canNotes': 'Жазууларыңыз жана кыстармаларыңыз',
    'restore.canNotesNote':
      'Алар жазылган сабактарга кайра коюлат, бирок азыр сиз катталган курстарда гана. Жазуу бир катталууга таандык, ошондуктан сиз чыгып кеткен курста аны коё турган жер жок.',
    'restore.cannotHeading': 'Эмнелер келе албайт жана эмне үчүн',
    'restore.cannotEnrol': 'Катталуулар',
    'restore.cannotEnrolNote':
      'Катталуу — укук, кээде акы төлөнгөн укук. Аны бере алган файл курстарды бекер тараткан файл болмок. Кайра катталыңыз, анан файлды экинчи жолу колдонуңуз: жазууларыңыз өз сабактарын табат.',
    'restore.cannotCert': 'Сертификаттар',
    'restore.cannotCertNote':
      'Сертификатты платформа берет. Файлдан жазылган сертификат текшерүүдөн өткөн жасалма документ болмок. Файлыңыздагы номерлер дагы эле чыныгы, жана сертификатты текшерүү аларды дагы эле тастыктайт.',
    'restore.cannotMoney': 'Буйрутмалар, акчаны кайтаруулар жана жетишкендик',
    'restore.cannotMoneyNote':
      'Булар — бул жерде болгон окуялардын платформа жүргүзгөн эсеби. Алардын бирин файлдан кайра коюу көчүрмө эмес, доомат болмок. Дүмүрчөктөрүңүз өз эсебиңиз үчүн файлда калат.',
    'restore.cannotPublished': 'Сиз жарыялаган нерселер жана бааланган иштериңиз',
    'restore.cannotPublishedNote':
      'Пикирлер, талкуу билдирүүлөрү жана тапшырылган иштердин ар бири бул жерде жарыяланып, керек болгондо текшерүүдөн өткөн. Аларды файлдан кайра жарыялоо эч ким кайра окубаган сөздөрдү жарыялоо болмок.',
    'restore.cannotPeople': 'Балдар, ролдор жана уруксаттар',
    'restore.cannotPeopleNote':
      'Баланын профилинде анын камкорчусу ким экени жазылат, ал эми кызматкердин ролун адам берет, ал файл менен келбейт. Экөө тең ким жасаганын каттаган экрандар аркылуу кошулат.',
    'restore.cannotHistory': 'Аракеттериңиздин таржымалы',
    'restore.cannotHistoryNote':
      'Бул — бул жерде болгон окуялардын эсеби, ага кошууга гана болот. Файлдан алынып келген таржымал ойдон чыгарылган таржымал болмок.',
    'restore.cannotSignIn': 'Кирүү дарегиңиз жана сырсөзүңүз',
    'restore.cannotSignInNote':
      'Экөөнү тең кирүү кызматы ушул эсептен өзүнчө сактайт. Колдонгуңуз келген дарек менен кириңиз; файл аны белгилей албайт.',
    'restore.foot':
      'Эмне жазыларын көрмөйүнчө эч нерсе жазылбайт. Файлдын кайра коюлушу эмне кайра коюлганы менен кошо аудит журналына жазылат.',
    'restore.fileLabel': 'Экспорт барагы жүктөп берген JSON файлы',
    'restore.fileHint':
      'Электрондук таблица жана басып чыгарууга ылайыктуу көчүрмө окуу үчүн; бул баракка JSON файлы керек. Анын аталышы мындай башталат: {name}',
    'restore.check': 'Бул файлды текшерүү',
    'restore.checking': 'Текшерилүүдө…',
    'restore.another': 'Башка файл тандоо',
    'restore.apply': 'Кайра коюуга боло турганды кайра коюу',
    'restore.applying': 'Кайра коюлууда…',
    'restore.different': 'Башка файлды кайра коюу',
    'restore.errLarge':
      'Бул файл маалыматтарыңыздын көчүрмөсү боло ала турган көлөмдөн чоң. Экспорт барагы жүктөп берген JSON файлын тандаңыз.',
    'restore.errNotJson':
      'Бул файл бош же JSON эмес. Экспорт барагы жүктөп берген JSON файлын тандаңыз; электрондук таблицаны жана басып чыгарууга ылайыктуу көчүрмөнү кайра коюуга болбойт.',
    'restore.errNotExport':
      'Бул файлда JSON бар, бирок ал ушул платформа түзгөн маалыматтарыңыздын көчүрмөсү эмес.',
    'restore.errNewer':
      'Бул көчүрмөнү платформанын бул жерде окулганынан жаңыраак версиясы түзгөн, ошондуктан аны бул жерде кайра коюуга болбойт.',
    'restore.errSignedOut':
      'Сиз аккаунттан чыгып калгансыз. Кайра кириңиз, анан файлды кайра тандаңыз. Эч нерсе өзгөргөн жок.',
    'restore.errCheckFailed':
      'Файлды текшерүү мүмкүн болгон жок, эч нерсе өзгөргөн жок. Байланышыңызды текшерип, кайра аракет кылыңыз.',
    'restore.errRefused': 'Платформа бул файлдан баш тартты. Эч нерсе өзгөргөн жок.',
    'restore.unconfirmed':
      'Файл кайра коюлган-коюлбаганын тастыктай алган жокпуз. Файлды кайра текшериңиз: бул жерде мурунтан бар элемент өткөрүп жиберилет, ошондуктан эч нерсе эки жолу жазылбайт.',
    'restore.resultCheck': 'Бул файл эмнелерди кайра коёт',
    'restore.resultApplied': 'Бул файл эмнелерди кайра койду',
    'restore.resultNothing': 'Азыркы абалда бул файлдагы эч нерсени кайра коюуга болбойт.',
    'restore.resultAllHere': 'Бул файл кайра коё ала турган нерселер бул жерде мурунтан бар.',
    'restore.lineNotes': 'Жазуулар: {count}',
    'restore.lineMarks': 'Кыстармалар: {count}',
    'restore.lineProfile': 'Профилдин чоо-жайы: {fields}',
    'restore.lineHere': 'Бул жерде мурунтан бар жана ошол бойдон калтырылды: {count}',
    'restore.skippedHeading': 'Файлда эмнелер калды жана эмне үчүн',
    'restore.nothingWritten':
      'Азырынча эч нерсе жазылган жок. Файлды текшерүү эч нерсени өзгөртпөйт.',
    'restore.afterApplied':
      'Файлыңыз өзгөргөн жок, ошондуктан аны кайра колдонууга болот: бул жерде мурунтан бар элемент өткөрүп жиберилет, эки жолу жазылбайт. Эч бир файл эч качан кайра койбой турган нерселер ушул барактын ылдый жагында саналган.',
    'restore.fieldCountry': 'Өлкө',
    'restore.whereEntry': 'Сакталган элемент',
    'restore.whyNameBlank': 'Файлдагы ат бош, ал эми профилдин аты бош боло албайт.',
    'restore.whyNameLong': 'Файлдагы ат өтө узун. Аттагы белгилердин эң көп саны: {count}',
    'restore.whyLanguage':
      'Файлдагы тил профиль сактай ала турган түрдө жазылган эмес. Файлда: {value}',
    'restore.whyTimezone':
      'Файлдагы убакыт алкагы бул платформа билген алкак эмес. Файлда: {value}',
    'restore.whyCountry': 'Файлдагы өлкө эки тамгалуу өлкө коду эмес. Файлда: {value}',
    'restore.whyNotList':
      'Бул файлдын бир бөлүгү тизме эмес, ошондуктан аны окуу мүмкүн болгон жок.',
    'restore.whyCapped':
      'Бул тизме бир жолу окулгандан узун, ошондуктан башы гана окулат. Окулган элементтер: {read}. Файлдагы элементтер: {held}',
    'restore.whyOff':
      'Жазуулар жана кыстармалар бул платформада өчүрүлгөн, ошондуктан аларды коё турган жер жок. Алар дагы эле файлыңызда.',
    'restore.whyNoteEmpty': 'Бул жазууда текст жок.',
    'restore.whyNoteLong': 'Бул жазуу өтө узун. Жазуудагы белгилердин эң көп саны: {count}',
    'restore.whyNoLesson':
      'Бул элементте сабак аталган эмес, ошондуктан аны тиркей турган эч нерсе жок.',
    'restore.whyNotEnrolled': 'Азыр сиз ушундай аталыштагы сабагы бар курска катталган эмессиз.',
    'restore.whyAmbiguous':
      'Курстарыңыздын бир нечесинде ушундай аталыштагы сабак бар, ал эми файл кайсынысы экенин айта албайт.',
    'restore.whyDiffers':
      'Ошондон бери сиз бул сабакка башка жазуу жазгансыз, жана ал алмаштырылган жок.',
    'restore.whyNoAccess': 'Бул курста активдүү катталуу жана бул сабакка жеткиликтүүлүк керек.',
    'restore.whyOther': 'Бул элементти кайра коюу мүмкүн болгон жок.',
  },
  tk: {
    'restore.title': 'Maglumatlaryňyzy yzyna goýuň',
    'restore.crumb': 'Dikeltmek',
    'restore.lede':
      'Maglumatlaryňyzyň nusgasyny göçürip alan bolsaňyz we ony yzyna isleýän bolsaňyz, arakesmeden soň şu hasaba ýa-da täze hasaba, bu sahypa şol faýly okaýar we içindäki özüňiziň ýazan bölegiňizi yzyna goýýar.',
    'restore.canHeading': 'Näme yzyna gelip biler',
    'restore.canProfile': 'Profiliňiz',
    'restore.canProfileNote':
      'At, dil, wagt guşaklygy we ýurt. Diňe faýlyň häzir şu ýerde duranyndan tapawutlanýan ýerinde we diňe bu platformanyň saklap bilýän bahalary.',
    'restore.canNotes': 'Bellikleriňiz we hatjoýlaryňyz',
    'restore.canNotesNote':
      'Olar ýazylan sapaklaryna yzyna goýulýar, ýöne diňe häzir ýazylan kurslaryňyzda. Bellik bir ýazylyşa degişli, şonuň üçin taşlap giden kursuňyzda ony goýmaga ýer ýok.',
    'restore.cannotHeading': 'Näme gelip bilmez we näme üçin',
    'restore.cannotEnrol': 'Ýazylyşlar',
    'restore.cannotEnrolNote':
      'Ýazylyş hukukdyr, käte bolsa tölegli hukuk. Ony berip bilýän faýl kurslary mugt paýlaýan faýl bolardy. Täzeden ýazylyň, soňra faýly ikinji gezek ulanyň: bellikleriňiz öz sapaklaryny tapar.',
    'restore.cannotCert': 'Şahadatnamalar',
    'restore.cannotCertNote':
      'Şahadatnamany platforma berýär. Faýldan ýazylan şahadatnama barlagdan geçýän galp resminama bolardy. Faýlyňyzdaky belgiler henizem hakyky we şahadatnama barlagy olary henizem tassyklaýar.',
    'restore.cannotMoney': 'Sargytlar, pul gaýtarmalar we öňegidişlik',
    'restore.cannotMoneyNote':
      'Bular şu ýerde bolan zatlaryň platformanyň ýöredýän hasabatydyr. Olaryň birini faýldan yzyna goýmak nusga däl-de, tassyklama bolardy. Kwitansiýalaryňyz öz hasabatyňyz üçin faýlda galýar.',
    'restore.cannotPublished': 'Çap eden zatlaryňyz we baha alan işleriňiz',
    'restore.cannotPublishedNote':
      'Synlar, ara alyp maslahatlaşma ýazgylary we tabşyrylan işleriň her biri şu ýerde çap edildi we gerek ýerinde gözegçilikden geçdi. Olary faýldan täzeden ibermek hiç kimiň täzeden okamadyk sözlerini çap etmek bolardy.',
    'restore.cannotPeople': 'Çagalar, wezipeler we rugsatlar',
    'restore.cannotPeopleNote':
      'Çaganyň profilinde onuň howandarynyň kimdigi ýazylýar, işgär wezipesini bolsa adam berýär, ol faýl bilen gelmeýär. Ikisi hem muny kimiň edendigini belleýän ekranlar arkaly goşulýar.',
    'restore.cannotHistory': 'Işjeňligiňiziň taryhy',
    'restore.cannotHistoryNote':
      'Bu şu ýerde bolan zatlaryň hasabatydyr we oňa diňe goşup bolýar. Faýldan getirilen taryh toslanan taryh bolardy.',
    'restore.cannotSignIn': 'Giriş salgyňyz we açar sözüňiz',
    'restore.cannotSignInNote':
      'Ikisini hem giriş hyzmaty şu hasabatdan aýratyn saklaýar. Ulanmak isleýän salgyňyz bilen giriň; faýl ony belläp bilmeýär.',
    'restore.foot':
      'Nämäniň ýazyljakdygyny görýänçäňiz hiç zat ýazylmaýar. Faýlyň yzyna goýulmagy nämäniň yzyna goýlandygy bilen bilelikde audit ýazgysyna girizilýär.',
    'restore.fileLabel': 'Eksport sahypasynyň göçürip beren JSON faýly',
    'restore.fileHint':
      'Elektron tablisa we çap edilýän nusga okamak üçindir; bu sahypa JSON faýly gerek. Onuň ady şeýle başlanýar: {name}',
    'restore.check': 'Bu faýly barla',
    'restore.checking': 'Barlanýar…',
    'restore.another': 'Başga faýl saýla',
    'restore.apply': 'Yzyna goýup bolýan zady yzyna goý',
    'restore.applying': 'Yzyna goýulýar…',
    'restore.different': 'Başga bir faýly yzyna goý',
    'restore.errLarge':
      'Bu faýl maglumatlaryňyzyň nusgasynyň bolup biljek ölçeginden uly. Eksport sahypasynyň göçürip beren JSON faýlyny saýlaň.',
    'restore.errNotJson':
      'Bu faýl boş ýa-da JSON däl. Eksport sahypasynyň göçürip beren JSON faýlyny saýlaň; elektron tablisany we çap edilýän nusgany yzyna goýup bolmaýar.',
    'restore.errNotExport':
      'Bu faýlda JSON bar, ýöne ol şu platformanyň döreden maglumatlaryňyzyň nusgasy däl.',
    'restore.errNewer':
      'Bu nusgany platformanyň şu ýerde okalýanyndan täzeräk wersiýasy döredipdir, şonuň üçin ony şu ýerde yzyna goýup bolmaýar.',
    'restore.errSignedOut':
      'Siz hasapdan çykypsyňyz. Täzeden giriň, soňra faýly ýene saýlaň. Hiç zat üýtgemedi.',
    'restore.errCheckFailed':
      'Faýly barlap bolmady we hiç zat üýtgemedi. Baglanyşygyňyzy barlap, täzeden synanyşyň.',
    'restore.errRefused': 'Platforma bu faýly ret etdi. Hiç zat üýtgemedi.',
    'restore.unconfirmed':
      'Faýlyň yzyna goýlandygyny ýa-da goýulmandygyny tassyklap bilmedik. Faýly ýene barlaň: şu ýerde eýýäm bar bolan bent geçirilýär, şonuň üçin hiç zat iki gezek ýazylmaýar.',
    'restore.resultCheck': 'Bu faýl nämäni yzyna goýar',
    'restore.resultApplied': 'Bu faýl nämäni yzyna goýdy',
    'restore.resultNothing': 'Häzirki ýagdaýda bu faýldaky hiç zady yzyna goýup bolmaýar.',
    'restore.resultAllHere': 'Bu faýlyň yzyna goýup biljek zatlary eýýäm şu ýerde.',
    'restore.lineNotes': 'Bellikler: {count}',
    'restore.lineMarks': 'Hatjoýlar: {count}',
    'restore.lineProfile': 'Profil maglumatlary: {fields}',
    'restore.lineHere': 'Eýýäm şu ýerde bar we bolşy ýaly galdyryldy: {count}',
    'restore.skippedHeading': 'Faýlda näme galdy we näme üçin',
    'restore.nothingWritten': 'Entek hiç zat ýazylmady. Faýly barlamak hiç zady üýtgetmeýär.',
    'restore.afterApplied':
      'Faýlyňyz üýtgemedi, şonuň üçin ony ýene ulanyp bolýar: şu ýerde eýýäm bar bolan bent geçirilýär, iki gezek ýazylmaýar. Hiç bir faýlyň hiç haçan yzyna goýmaýan zatlary şu sahypanyň aşagynda sanalandyr.',
    'restore.fieldCountry': 'Ýurt',
    'restore.whereEntry': 'Saklanan bent',
    'restore.whyNameBlank': 'Faýldaky at boş, profiliň ady bolsa boş bolup bilmeýär.',
    'restore.whyNameLong': 'Faýldaky at aşa uzyn. Atdaky nyşanlaryň iň köp sany: {count}',
    'restore.whyLanguage':
      'Faýldaky dil profiliň saklap bilýän görnüşinde ýazylmandyr. Faýlda: {value}',
    'restore.whyTimezone':
      'Faýldaky wagt guşaklygy bu platformanyň bilýän guşaklygy däl. Faýlda: {value}',
    'restore.whyCountry': 'Faýldaky ýurt iki harply ýurt kody däl. Faýlda: {value}',
    'restore.whyNotList': 'Bu faýlyň bir bölegi sanaw däl, şonuň üçin ony okap bolmady.',
    'restore.whyCapped':
      'Bu sanaw bir gezekde okalýanyndan uzyn, şonuň üçin diňe başy okalýar. Okalan bentler: {read}. Faýldaky bentler: {held}',
    'restore.whyOff':
      'Bellikler we hatjoýlar bu platformada öçürilen, şonuň üçin olary goýmaga ýer ýok. Olar henizem faýlyňyzda.',
    'restore.whyNoteEmpty': 'Bu bellikde ýazgy ýok.',
    'restore.whyNoteLong': 'Bu bellik aşa uzyn. Bellikdäki nyşanlaryň iň köp sany: {count}',
    'restore.whyNoLesson': 'Bu bentde sapak ady ýok, şonuň üçin ony birikdirmäge zat ýok.',
    'restore.whyNotEnrolled': 'Häzir siz şu atly sapagy bolan kursa ýazylmadyksyňyz.',
    'restore.whyAmbiguous':
      'Kurslaryňyzyň birnäçesinde şu atly sapak bar we faýl haýsydygyny aýdyp bilmeýär.',
    'restore.whyDiffers': 'Şondan bäri siz bu sapaga başga bellik ýazypsyňyz we ol çalşylmady.',
    'restore.whyNoAccess': 'Bu kursda işjeň ýazylyş we bu sapaga giriş gerek.',
    'restore.whyOther': 'Bu bendi yzyna goýup bolmady.',
  },
  ta: {
    'restore.title': 'உங்கள் தரவை மீண்டும் வையுங்கள்',
    'restore.crumb': 'மீட்டமைப்பு',
    'restore.lede':
      'உங்கள் தரவின் நகலைப் பதிவிறக்கியிருந்து, அதை மீண்டும் பெற விரும்பினால், இடைவெளிக்குப் பிறகு இந்தக் கணக்கிலோ புதிய கணக்கிலோ, இந்தப் பக்கம் அந்தக் கோப்பைப் படித்து, அதில் நீங்களே எழுதிய பகுதியை மீண்டும் வைக்கிறது.',
    'restore.canHeading': 'எவை திரும்ப வரலாம்',
    'restore.canProfile': 'உங்கள் சுயவிவரம்',
    'restore.canProfileNote':
      'பெயர், மொழி, நேர மண்டலம், நாடு. இப்போது இங்கே உள்ளதிலிருந்து கோப்பு வேறுபடும் இடத்தில் மட்டும், இந்தத் தளம் வைத்திருக்கக்கூடிய மதிப்புகள் மட்டும்.',
    'restore.canNotes': 'உங்கள் குறிப்புகளும் புக்மார்க்குகளும்',
    'restore.canNotesNote':
      'அவை எழுதப்பட்ட பாடங்களிலேயே மீண்டும் வைக்கப்படும்; ஆனால் நீங்கள் இப்போது பதிவு செய்துள்ள பாடநெறிகளில் மட்டும். ஒரு குறிப்பு ஒரு பாடநெறிப் பதிவைச் சேர்ந்தது; எனவே நீங்கள் விட்டுச் சென்ற பாடநெறியில் அதை வைக்க இடமில்லை.',
    'restore.cannotHeading': 'எவை வர முடியாது, ஏன்',
    'restore.cannotEnrol': 'பாடநெறிப் பதிவுகள்',
    'restore.cannotEnrolNote':
      'பாடநெறிப் பதிவு ஓர் உரிமை; சில நேரங்களில் பணம் செலுத்திப் பெற்ற உரிமை. அதை வழங்கக்கூடிய கோப்பு, பாடநெறிகளை இலவசமாக வழங்கும் கோப்பாகிவிடும். மீண்டும் பதிவு செய்யுங்கள்; பிறகு கோப்பை இரண்டாவது முறை பயன்படுத்துங்கள்: உங்கள் குறிப்புகள் தங்கள் பாடங்களைக் கண்டடையும்.',
    'restore.cannotCert': 'சான்றிதழ்கள்',
    'restore.cannotCertNote':
      'சான்றிதழைத் தளமே வழங்குகிறது. கோப்பிலிருந்து எழுதப்பட்ட சான்றிதழ், சரிபார்ப்பில் தேறிவிடும் போலியாக இருக்கும். உங்கள் கோப்பிலுள்ள எண்கள் இன்னும் உண்மையானவை; சான்றிதழ் சரிபார்ப்பு அவற்றை இன்னும் உறுதிப்படுத்துகிறது.',
    'restore.cannotMoney': 'ஆர்டர்கள், பணத்திருப்பங்கள், முன்னேற்றம்',
    'restore.cannotMoneyNote':
      'இவை இங்கே நடந்தவற்றைப் பற்றித் தளம் வைத்திருக்கும் ஆவணங்கள். அவற்றில் ஒன்றைக் கோப்பிலிருந்து மீண்டும் வைப்பது நகல் அல்ல, ஒரு கூற்றாகிவிடும். உங்கள் ரசீதுகள் உங்கள் சொந்தக் குறிப்புக்காகக் கோப்பிலேயே இருக்கும்.',
    'restore.cannotPublished': 'நீங்கள் வெளியிட்டவையும், மதிப்பெண் பெற்றவையும்',
    'restore.cannotPublishedNote':
      'மதிப்புரைகள், விவாதப் பதிவுகள், ஒப்படைத்த பணிகள் ஒவ்வொன்றும் இங்கே வெளியிடப்பட்டு, தேவையான இடத்தில் மட்டுறுத்தப்பட்டன. அவற்றைக் கோப்பிலிருந்து மீண்டும் இடுவது, யாரும் மறுபடி படிக்காத சொற்களை வெளியிடுவதாகும்.',
    'restore.cannotPeople': 'குழந்தைகள், பொறுப்புகள், அனுமதிகள்',
    'restore.cannotPeopleNote':
      'குழந்தையின் சுயவிவரம் அவரது பாதுகாவலர் யார் என்பதைப் பதிவு செய்கிறது; பணியாளர் பொறுப்பை ஒரு நபர் வழங்குகிறார், அது கோப்பில் வருவதில்லை. இரண்டும், யார் செய்தார் என்பதைப் பதிவு செய்யும் திரைகள் வழியாகச் சேர்க்கப்படுகின்றன.',
    'restore.cannotHistory': 'உங்கள் செயல்பாட்டு வரலாறு',
    'restore.cannotHistoryNote':
      'இது இங்கே நடந்தவற்றின் ஆவணம்; இதில் சேர்க்க மட்டுமே முடியும். கோப்பிலிருந்து கொண்டுவரப்பட்ட வரலாறு, புனையப்பட்ட வரலாறாகும்.',
    'restore.cannotSignIn': 'உங்கள் உள்நுழைவு முகவரியும் கடவுச்சொல்லும்',
    'restore.cannotSignInNote':
      'இரண்டையும் உள்நுழைவுச் சேவை இந்த ஆவணத்திலிருந்து தனியாக வைத்திருக்கிறது. நீங்கள் பயன்படுத்த விரும்பும் முகவரியுடன் உள்நுழையுங்கள்; கோப்பால் அதை அமைக்க முடியாது.',
    'restore.foot':
      'என்ன எழுதப்படும் என்பதை நீங்கள் பார்க்கும் வரை எதுவும் எழுதப்படாது. ஒரு கோப்பை மீண்டும் வைத்தது, எது மீண்டும் வைக்கப்பட்டது என்பதுடன் தணிக்கைப் பதிவில் குறிக்கப்படும்.',
    'restore.fileLabel': 'ஏற்றுமதிப் பக்கம் பதிவிறக்கிய JSON கோப்பு',
    'restore.fileHint':
      'விரிதாளும் அச்சிடக்கூடிய நகலும் படிப்பதற்கானவை; இந்தப் பக்கத்திற்கு JSON கோப்பு தேவை. அதன் பெயர் இவ்வாறு தொடங்கும்: {name}',
    'restore.check': 'இந்தக் கோப்பைச் சரிபார்',
    'restore.checking': 'சரிபார்க்கிறது…',
    'restore.another': 'வேறு கோப்பைத் தேர்ந்தெடு',
    'restore.apply': 'மீண்டும் வைக்கக்கூடியதை மீண்டும் வை',
    'restore.applying': 'மீண்டும் வைக்கிறது…',
    'restore.different': 'வேறொரு கோப்பை மீண்டும் வை',
    'restore.errLarge':
      'உங்கள் தரவின் நகல் இருக்கக்கூடிய அளவைவிட இந்தக் கோப்பு பெரியது. ஏற்றுமதிப் பக்கம் பதிவிறக்கிய JSON கோப்பைத் தேர்ந்தெடுங்கள்.',
    'restore.errNotJson':
      'இந்தக் கோப்பு காலியாக உள்ளது அல்லது JSON அல்ல. ஏற்றுமதிப் பக்கம் பதிவிறக்கிய JSON கோப்பைத் தேர்ந்தெடுங்கள்; விரிதாளையும் அச்சிடக்கூடிய நகலையும் மீண்டும் வைக்க முடியாது.',
    'restore.errNotExport':
      'இந்தக் கோப்பில் JSON உள்ளது; ஆனால் இது இந்தத் தளம் உருவாக்கிய உங்கள் தரவின் நகல் அல்ல.',
    'restore.errNewer':
      'இங்கே படிக்கப்படுவதைவிடப் புதிய தளப் பதிப்பு இந்த நகலை உருவாக்கியுள்ளது; எனவே இதை இங்கே மீண்டும் வைக்க முடியாது.',
    'restore.errSignedOut':
      'நீங்கள் வெளியேறிவிட்டீர்கள். மீண்டும் உள்நுழைந்து, கோப்பை மறுபடி தேர்ந்தெடுங்கள். எதுவும் மாறவில்லை.',
    'restore.errCheckFailed':
      'கோப்பைச் சரிபார்க்க முடியவில்லை; எதுவும் மாறவில்லை. உங்கள் இணைப்பைச் சரிபார்த்து மீண்டும் முயலுங்கள்.',
    'restore.errRefused': 'தளம் இந்தக் கோப்பை ஏற்க மறுத்தது. எதுவும் மாறவில்லை.',
    'restore.unconfirmed':
      'கோப்பு மீண்டும் வைக்கப்பட்டதா என்பதை எங்களால் உறுதிப்படுத்த முடியவில்லை. கோப்பை மறுபடி சரிபாருங்கள்: ஏற்கெனவே இங்கே உள்ள உள்ளீடு தவிர்க்கப்படும்; எனவே எதுவும் இரண்டு முறை எழுதப்படாது.',
    'restore.resultCheck': 'இந்தக் கோப்பு மீண்டும் வைக்கவிருப்பவை',
    'restore.resultApplied': 'இந்தக் கோப்பு மீண்டும் வைத்தவை',
    'restore.resultNothing':
      'தற்போதைய நிலையில் இந்தக் கோப்பிலுள்ள எதையும் மீண்டும் வைக்க முடியாது.',
    'restore.resultAllHere': 'இந்தக் கோப்பு மீண்டும் வைக்கக்கூடியவை ஏற்கெனவே இங்கே உள்ளன.',
    'restore.lineNotes': 'குறிப்புகள்: {count}',
    'restore.lineMarks': 'புக்மார்க்குகள்: {count}',
    'restore.lineProfile': 'சுயவிவர விவரங்கள்: {fields}',
    'restore.lineHere': 'ஏற்கெனவே இங்கே உள்ளவை, அப்படியே விடப்பட்டவை: {count}',
    'restore.skippedHeading': 'கோப்பில் எஞ்சியவை, ஏன்',
    'restore.nothingWritten':
      'இன்னும் எதுவும் எழுதப்படவில்லை. கோப்பைச் சரிபார்ப்பது எதையும் மாற்றாது.',
    'restore.afterApplied':
      'உங்கள் கோப்பு மாறவில்லை; எனவே அதை மீண்டும் பயன்படுத்தலாம்: ஏற்கெனவே இங்கே உள்ள உள்ளீடு தவிர்க்கப்படும், இரண்டு முறை எழுதப்படாது. எந்தக் கோப்பும் ஒருபோதும் மீண்டும் வைக்காதவை இந்தப் பக்கத்தின் கீழ்ப்பகுதியில் பட்டியலிடப்பட்டுள்ளன.',
    'restore.fieldCountry': 'நாடு',
    'restore.whereEntry': 'சேமிக்கப்பட்ட ஓர் உள்ளீடு',
    'restore.whyNameBlank':
      'கோப்பிலுள்ள பெயர் வெறுமையாக உள்ளது; சுயவிவரத்தின் பெயர் வெறுமையாக இருக்க முடியாது.',
    'restore.whyNameLong':
      'கோப்பிலுள்ள பெயர் மிக நீளமானது. ஒரு பெயரில் இருக்கக்கூடிய அதிகபட்ச எழுத்துகள்: {count}',
    'restore.whyLanguage':
      'கோப்பிலுள்ள மொழி, சுயவிவரம் வைத்திருக்கக்கூடிய வடிவில் எழுதப்படவில்லை. கோப்பில்: {value}',
    'restore.whyTimezone':
      'கோப்பிலுள்ள நேர மண்டலம் இந்தத் தளத்திற்குத் தெரிந்த ஒன்றல்ல. கோப்பில்: {value}',
    'restore.whyCountry':
      'கோப்பிலுள்ள நாடு இரண்டு எழுத்து நாட்டுக் குறியீடு அல்ல. கோப்பில்: {value}',
    'restore.whyNotList': 'இந்தக் கோப்பின் ஒரு பகுதி பட்டியல் அல்ல; எனவே அதைப் படிக்க முடியவில்லை.',
    'restore.whyCapped':
      'இந்தப் பட்டியல் ஒரே நேரத்தில் படிக்கப்படுவதைவிட நீளமானது; எனவே அதன் தொடக்கம் மட்டுமே படிக்கப்படும். படிக்கப்பட்ட உள்ளீடுகள்: {read}. கோப்பிலுள்ள உள்ளீடுகள்: {held}',
    'restore.whyOff':
      'குறிப்புகளும் புக்மார்க்குகளும் இந்தத் தளத்தில் நிறுத்தப்பட்டுள்ளன; எனவே அவற்றை வைக்க இடமில்லை. அவை இன்னும் உங்கள் கோப்பில் உள்ளன.',
    'restore.whyNoteEmpty': 'இந்தக் குறிப்பில் உரை இல்லை.',
    'restore.whyNoteLong':
      'இந்தக் குறிப்பு மிக நீளமானது. ஒரு குறிப்பில் இருக்கக்கூடிய அதிகபட்ச எழுத்துகள்: {count}',
    'restore.whyNoLesson':
      'இந்த உள்ளீடு எந்தப் பாடத்தையும் குறிப்பிடவில்லை; எனவே இதை இணைக்க எதுவும் இல்லை.',
    'restore.whyNotEnrolled':
      'இந்தப் பெயருள்ள பாடம் கொண்ட பாடநெறியில் நீங்கள் இப்போது பதிவு செய்யவில்லை.',
    'restore.whyAmbiguous':
      'உங்கள் பாடநெறிகளில் ஒன்றுக்கு மேற்பட்டவற்றில் இந்தப் பெயருள்ள பாடம் உள்ளது; எது என்று கோப்பால் சொல்ல முடியாது.',
    'restore.whyDiffers':
      'அதன் பிறகு இந்தப் பாடத்தில் வேறொரு குறிப்பை எழுதியுள்ளீர்கள்; அது மாற்றப்படவில்லை.',
    'restore.whyNoAccess':
      'இந்தப் பாடநெறியில் செயலிலுள்ள பதிவும், இந்தப் பாடத்திற்கான அணுகலும் தேவை.',
    'restore.whyOther': 'இந்த உள்ளீட்டை மீண்டும் வைக்க முடியவில்லை.',
  },
  ne: {
    'restore.title': 'आफ्नो डेटा फेरि राख्नुहोस्',
    'restore.crumb': 'पुनर्स्थापना',
    'restore.lede':
      'तपाईंले आफ्नो डेटाको प्रतिलिपि डाउनलोड गर्नुभएको थियो र त्यो फिर्ता चाहनुहुन्छ भने, विश्रामपछि यही खातामा वा नयाँ खातामा, यो पृष्ठले त्यो फाइल पढ्छ र त्यसमा तपाईं आफैंले लेखेको भाग फेरि राख्छ।',
    'restore.canHeading': 'के फर्कन सक्छ',
    'restore.canProfile': 'तपाईंको प्रोफाइल',
    'restore.canProfileNote':
      'नाम, भाषा, समय क्षेत्र र देश। फाइल अहिले यहाँ भएको भन्दा फरक भएको ठाउँमा मात्र, र यो प्लेटफर्मले राख्न सक्ने मान मात्र।',
    'restore.canNotes': 'तपाईंका नोट र बुकमार्कहरू',
    'restore.canNotesNote':
      'जुन पाठमा लेखिएका थिए त्यहीँ फेरि राखिन्छन्, तर तपाईं अहिले भर्ना भएका कोर्समा मात्र। नोट एउटा भर्नासँग जोडिएको हुन्छ, त्यसैले तपाईंले छोडेको कोर्समा त्यसलाई राख्ने ठाउँ हुँदैन।',
    'restore.cannotHeading': 'के सक्दैन, र किन',
    'restore.cannotEnrol': 'भर्ना',
    'restore.cannotEnrolNote':
      'भर्ना एउटा अधिकार हो, र कहिलेकाहीँ पैसा तिरेर पाएको अधिकार। त्यो दिन सक्ने फाइल कोर्स सित्तैंमा बाँड्ने फाइल हुन्थ्यो। फेरि भर्ना हुनुहोस्, अनि फाइल दोस्रो पटक प्रयोग गर्नुहोस्: तपाईंका नोटले आफ्ना पाठ भेट्टाउनेछन्।',
    'restore.cannotCert': 'प्रमाणपत्र',
    'restore.cannotCertNote':
      'प्रमाणपत्र प्लेटफर्मले जारी गर्छ। फाइलबाट लेखिएको प्रमाणपत्र प्रमाणीकरणमा पास हुने नक्कली कागज हुन्थ्यो। तपाईंको फाइलका नम्बरहरू अझै साँचा छन्, र प्रमाणपत्र प्रमाणीकरणले तिनलाई अझै पुष्टि गर्छ।',
    'restore.cannotMoney': 'अर्डर, रकम फिर्ता र प्रगति',
    'restore.cannotMoneyNote':
      'यी यहाँ भएका कुराका अभिलेख हुन्, जुन प्लेटफर्मले राख्छ। तीमध्ये कुनैलाई फाइलबाट फेरि राख्नु प्रतिलिपि होइन, दाबी हुन्थ्यो। तपाईंका रसिदहरू तपाईंको आफ्नै अभिलेखका लागि फाइलमै रहन्छन्।',
    'restore.cannotPublished': 'तपाईंले प्रकाशित गरेका कुरा, र अङ्क पाएका काम',
    'restore.cannotPublishedNote':
      'समीक्षा, छलफलका पोस्ट र बुझाइएका कार्यहरू प्रत्येक यहाँ प्रकाशित भएका थिए र आवश्यक परेको ठाउँमा तिनको निगरानी गरिएको थियो। तिनलाई फाइलबाट फेरि पोस्ट गर्नु कसैले दोहोर्‍याएर नपढेका शब्द प्रकाशित गर्नु हुन्थ्यो।',
    'restore.cannotPeople': 'बालबालिका, भूमिका र अनुमति',
    'restore.cannotPeopleNote':
      'बालबालिकाको प्रोफाइलले उनका संरक्षक को हुन् भनेर अभिलेख राख्छ, र कर्मचारीको भूमिका कुनै व्यक्तिले दिन्छ, त्यो फाइलमा आउँदैन। दुवै कसले गर्‍यो भनेर अभिलेख राख्ने स्क्रिनमार्फत थपिन्छन्।',
    'restore.cannotHistory': 'तपाईंको गतिविधिको इतिहास',
    'restore.cannotHistoryNote':
      'यो यहाँ भएका कुराको अभिलेख हो र यसमा थप्न मात्र सकिन्छ। फाइलबाट ल्याइएको इतिहास बनावटी इतिहास हुन्थ्यो।',
    'restore.cannotSignIn': 'तपाईंको साइन-इन ठेगाना र पासवर्ड',
    'restore.cannotSignInNote':
      'दुवै साइन-इन सेवाले यो अभिलेखभन्दा अलग राख्छ। तपाईंले प्रयोग गर्न चाहेको ठेगानाबाट साइन इन गर्नुहोस्; फाइलले त्यो तोक्न सक्दैन।',
    'restore.foot':
      'के लेखिनेछ भनेर तपाईंले नदेखेसम्म केही पनि लेखिँदैन। फाइल फेरि राखिएको कुरा अडिट अभिलेखमा टिपिन्छ, के फेरि राखियो भन्नेसहित।',
    'restore.fileLabel': 'निर्यात पृष्ठले डाउनलोड गरेको JSON फाइल',
    'restore.fileHint':
      'स्प्रेडसिट र छाप्न मिल्ने प्रतिलिपि पढ्नका लागि हुन्; यो पृष्ठलाई JSON फाइल चाहिन्छ। त्यसको नाम यसरी सुरु हुन्छ: {name}',
    'restore.check': 'यो फाइल जाँच्नुहोस्',
    'restore.checking': 'जाँच हुँदै छ…',
    'restore.another': 'अर्को फाइल छान्नुहोस्',
    'restore.apply': 'फेरि राख्न सकिने कुरा फेरि राख्नुहोस्',
    'restore.applying': 'फेरि राखिँदै छ…',
    'restore.different': 'अर्कै फाइल फेरि राख्नुहोस्',
    'restore.errLarge':
      'यो फाइल तपाईंको डेटाको प्रतिलिपि हुन सक्ने भन्दा ठूलो छ। निर्यात पृष्ठले डाउनलोड गरेको JSON फाइल छान्नुहोस्।',
    'restore.errNotJson':
      'यो फाइल खाली छ वा JSON होइन। निर्यात पृष्ठले डाउनलोड गरेको JSON फाइल छान्नुहोस्; स्प्रेडसिट र छाप्न मिल्ने प्रतिलिपि फेरि राख्न सकिँदैन।',
    'restore.errNotExport':
      'यो फाइलमा JSON छ, तर यो यस प्लेटफर्मले बनाएको तपाईंको डेटाको प्रतिलिपि होइन।',
    'restore.errNewer':
      'यो प्रतिलिपि यहाँ पढिने भन्दा नयाँ संस्करणको प्लेटफर्मले बनाएको हो, त्यसैले यसलाई यहाँ फेरि राख्न सकिँदैन।',
    'restore.errSignedOut':
      'तपाईं साइन आउट हुनुभएको छ। फेरि साइन इन गर्नुहोस्, अनि फाइल फेरि छान्नुहोस्। केही पनि बदलिएन।',
    'restore.errCheckFailed':
      'फाइल जाँच्न सकिएन, र केही पनि बदलिएन। आफ्नो जडान हेरेर फेरि प्रयास गर्नुहोस्।',
    'restore.errRefused': 'प्लेटफर्मले यो फाइल अस्वीकार गर्‍यो। केही पनि बदलिएन।',
    'restore.unconfirmed':
      'फाइल फेरि राखियो कि राखिएन भनेर हामीले पुष्टि गर्न सकेनौं। फाइल फेरि जाँच्नुहोस्: पहिल्यै यहाँ भएको प्रविष्टि छोडिन्छ, त्यसैले केही पनि दुई पटक लेखिँदैन।',
    'restore.resultCheck': 'यो फाइलले के फेरि राख्नेछ',
    'restore.resultApplied': 'यो फाइलले के फेरि राख्यो',
    'restore.resultNothing': 'अहिलेको अवस्थामा यो फाइलको केही पनि फेरि राख्न सकिँदैन।',
    'restore.resultAllHere': 'यो फाइलले फेरि राख्न सक्ने कुरा पहिल्यै यहाँ छन्।',
    'restore.lineNotes': 'नोट: {count}',
    'restore.lineMarks': 'बुकमार्क: {count}',
    'restore.lineProfile': 'प्रोफाइलका विवरण: {fields}',
    'restore.lineHere': 'पहिल्यै यहाँ भएका र जस्ताको तस्तै छोडिएका: {count}',
    'restore.skippedHeading': 'फाइलमा के रह्यो, र किन',
    'restore.nothingWritten': 'अहिलेसम्म केही पनि लेखिएको छैन। फाइल जाँच्दा केही पनि बदलिँदैन।',
    'restore.afterApplied':
      'तपाईंको फाइल बदलिएको छैन, त्यसैले यसलाई फेरि प्रयोग गर्न सकिन्छ: पहिल्यै यहाँ भएको प्रविष्टि छोडिन्छ, दुई पटक लेखिँदैन। कुनै पनि फाइलले कहिल्यै फेरि नराख्ने कुराहरू यही पृष्ठको तल सूचीबद्ध छन्।',
    'restore.fieldCountry': 'देश',
    'restore.whereEntry': 'सुरक्षित गरिएको प्रविष्टि',
    'restore.whyNameBlank': 'फाइलको नाम खाली छ, र प्रोफाइलको नाम खाली हुन सक्दैन।',
    'restore.whyNameLong': 'फाइलको नाम धेरै लामो छ। नाममा हुन सक्ने अधिकतम वर्ण: {count}',
    'restore.whyLanguage': 'फाइलको भाषा प्रोफाइलले राख्न सक्ने रूपमा लेखिएको छैन। फाइलमा: {value}',
    'restore.whyTimezone':
      'फाइलको समय क्षेत्र यो प्लेटफर्मले चिन्ने समय क्षेत्र होइन। फाइलमा: {value}',
    'restore.whyCountry': 'फाइलको देश दुई अक्षरको देश कोड होइन। फाइलमा: {value}',
    'restore.whyNotList': 'यो फाइलको एउटा भाग सूची होइन, त्यसैले पढ्न सकिएन।',
    'restore.whyCapped':
      'यो सूची एकै पटकमा पढिने भन्दा लामो छ, त्यसैले यसको सुरुको भाग मात्र पढिन्छ। पढिएका प्रविष्टि: {read}। फाइलका प्रविष्टि: {held}',
    'restore.whyOff':
      'यो प्लेटफर्ममा नोट र बुकमार्क बन्द गरिएका छन्, त्यसैले तिनलाई राख्ने ठाउँ छैन। ती अझै तपाईंको फाइलमा छन्।',
    'restore.whyNoteEmpty': 'यो नोटमा कुनै पाठ्य छैन।',
    'restore.whyNoteLong': 'यो नोट धेरै लामो छ। नोटमा हुन सक्ने अधिकतम वर्ण: {count}',
    'restore.whyNoLesson':
      'यो प्रविष्टिले कुनै पाठको नाम दिएको छैन, त्यसैले यसलाई जोड्ने केही छैन।',
    'restore.whyNotEnrolled': 'यो नामको पाठ भएको कोर्समा तपाईं अहिले भर्ना हुनुहुन्न।',
    'restore.whyAmbiguous':
      'तपाईंका एकभन्दा बढी कोर्समा यो नामको पाठ छ, र फाइलले कुन हो भनेर भन्न सक्दैन।',
    'restore.whyDiffers': 'त्यसपछि तपाईंले यो पाठमा अर्कै नोट लेख्नुभएको छ, र त्यो बदलिएन।',
    'restore.whyNoAccess': 'यो कोर्समा सक्रिय भर्ना र यो पाठमा पहुँच चाहिन्छ।',
    'restore.whyOther': 'यो प्रविष्टि फेरि राख्न सकिएन।',
  },
};
