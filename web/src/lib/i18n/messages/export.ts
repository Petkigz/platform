import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * A copy of your data (`app/account/export/page.tsx`), the page that prints
 * it (`app/account/export/print/page.tsx`) and the words the download link
 * says while it works.
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`
 * and `close.ts`: written for the twenty-seven languages with nothing held
 * in `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **The word is "copy", not "everything".** The export leaves five kinds of
 * thing out on purpose and cuts a long list at a thousand rows, and the page
 * says both. Every language below says "a copy of what we hold", and the
 * sentence on the account page (`account.dataBody`) was changed with it. A
 * translation that went back to "everything" would promise what the file
 * does not contain. No speaker has checked any of it.
 *
 * **Section and field names stay English.** The file is the record as it is
 * stored: `learner_profiles`, `created_at`. The print page marks them
 * `lang="en"` and says so in one sentence (`export.english`) on every
 * page that is not English.
 *
 * **Three things are put in:** the row limit as a number in the reader's own
 * digits (`{count}`), the moment the copy was made (`{when}`), and the names
 * of the lists that were cut (`{lists}`), English and after a colon so that
 * no language has to inflect them.
 *
 * **"Ten" is a word** in every sentence that says it. The number is fixed
 * by the migration; `lib/export-outcome.test.ts` reads it there.
 *
 * **Served to the server only.** `export.` is in `SERVER_ONLY_PREFIXES`:
 * both pages are drawn on the server and hand the link its words.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const EXPORT: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'export.crumb': 'التصدير',
    'export.title': 'احصل على نسخة من بياناتك',
    'export.lede':
      'نسخة واحدة مما تحتفظ به هذه المنصة عنك، مع الاستثناءات المذكورة أدناه: حسابك، والدورات المسجَّل فيها، وما كتبته، وما قُيِّمت عليه، وما اشتريته، والرسائل التي أُرسلت إليك.',
    'export.how':
      'تُعَدّ كل نسخة عند طلبك لها، فهي محدَّثة في تلك اللحظة. يمكنك إعداد عشر نسخ في الساعة؛ هذا الحد يحمي المنصة وليس المقصود به تقييدك.',
    'export.cap':
      'القائمة التي يزيد طولها على {count} صف تُقطع عند هذا العدد، وتذكر النسخة كل قائمة قُطعت.',
    'export.json': 'تنزيل النسخة (JSON)',
    'export.jsonNote':
      'النسخة كاملة في ملف JSON واحد: كل حقل، بما فيها الحقول التي لا تعرضها أي شاشة. يُفتح في أي محرّر نصوص. للمطوّرين، أو للاحتفاظ بنسخة يمكنك مراجعتها لاحقًا.',
    'export.sheet': 'تنزيل النسخة (جدول بيانات)',
    'export.sheetNote':
      'جدول بيانات فيه قسم لكل جزء من حسابك وسطر فارغ بين الأقسام. يُفتح في Excel أو Numbers أو LibreOffice أو Google Sheets.',
    'export.read': 'اقرأها هنا أو احفظها بصيغة PDF',
    'export.readNote':
      'صفحة يمكنك قراءتها في المتصفح وطباعتها، أو حفظها بصيغة PDF من نافذة الطباعة لديك. متصفحك هو الذي يُنشئ ملف PDF. فتح الصفحة يُحتسب نسخة واحدة من نسخك العشر.',
    'export.english':
      'أسماء الأقسام والحقول داخل النسخة بالإنجليزية، لأنها الأسماء التي تُخزَّن بها السجلات.',
    'export.audit':
      'تُسجَّل كل نسخة في سجل التدقيق، مع التاريخ وعدد الصفوف في كل قسم. وهذا السجل هو ما يجعل أي نسخة غير متوقعة من بيانات شخص ما قابلة للتتبّع.',
    'export.preparing': 'جارٍ إعداد نسختك…',
    'export.done': 'أُعدّت نسختك وسُلّمت إلى متصفحك ليحفظها.',
    'export.limit':
      'أُعدّت عشر نسخ خلال الساعة الأخيرة، وهذا هو الحد. انتظر قليلًا ثم اطلب من جديد.',
    'export.failed': 'تعذّر إعداد النسخة الآن. اطلب من جديد بعد قليل.',
    'export.signedOut': 'لقد سُجّل خروجك. سجّل الدخول من جديد للحصول على نسخة.',
    'export.inHeading': 'ما الذي فيها',
    'export.inAccount': 'حسابك',
    'export.inAccountNote':
      'الاسم المعروض، واللغة، والمنطقة الزمنية، والبلد، والحالة، والأدوار التي تشغلها (معلّم، مراجع، موظف) إن وُجدت.',
    'export.inLearners': 'ملفات المتعلّمين',
    'export.inLearnersNote':
      'ملفك أنت، وملفات المتعلّمين الذين أنت وليّ أمرهم الموثَّق حاليًا ولديك إذن الاطلاع على تقدّمهم. ومعها تسجيلاتهم وتقدّمهم ومحاولاتهم وشهاداتهم.',
    'export.inWrote': 'ما كتبته',
    'export.inWroteNote':
      'ملاحظات الدروس، والإشارات المرجعية، والدورات المحفوظة والملاحظة الخاصة التي وضعتها بجانب إحداها، والتقييمات، ومشاركات النقاش، وتسليمات الواجبات، وإجابات الاختبارات.',
    'export.inGuardians': 'من أنت مسؤول عنهم، ومن يحق له الاطلاع عليك',
    'export.inGuardiansNote':
      'كل طفل أنت وليّ أمره، وما يُسمح لك برؤيته وإدارته، ومتى جرى توثيق ذلك؛ وفي الاتجاه الآخر، كل من وثّقته المنصة وليّ أمر لك.',
    'export.inInvited': 'من دعوتهم',
    'export.inInvitedNote':
      'العنوان الذي أرسلت إليه المشاركة، وما شاركته، وهل قُبلت. لا الرابط نفسه: فالرابط هو ما يُدخل حامله.',
    'export.inMoney': 'المال',
    'export.inMoneyNote':
      'الطلبات في أي حساب تنتمي إليه، وما اشتُري، وكذلك أرباحك ومدفوعاتك إن كنت تدرّس. تظهر المبالغ كما سُجّلت تمامًا، بعملتها.',
    'export.inSupport': 'الدعم والرسائل',
    'export.inSupportNote':
      'الحالات التي فتحتها، والردود التي تستطيع رؤيتها أصلًا، وكل إشعار أُرسل إليك، والبريد الذي أرسلته المنصة أو وضعته في قائمة الإرسال نيابةً عنك، مع طمس أي رابط دعوة.',
    'export.inActivity': 'النشاط والأجهزة',
    'export.inActivityNote':
      'الأحداث المسجَّلة عن استخدامك للمنتج، والأجهزة المسجَّلة للدروس دون اتصال. وتقارير المعلّمين والموظفين تُحسب من الأحداث نفسها.',
    'export.outHeading': 'ما ليس فيها، ولماذا',
    'export.outOthers': 'كلام الآخرين',
    'export.outOthersNote':
      'ردّ تحت مشاركتك، رسالة من زميل، ملاحظة معلّم عن متعلّم آخر: هذه بياناتهم لا بياناتك، حتى إن كانت تخصّك.',
    'export.outSignIn': 'عنوان تسجيل دخولك وكلمة مرورك',
    'export.outSignInNote': 'كلاهما محفوظ لدى مزوّد تسجيل الدخول، خارج قاعدة البيانات هذه.',
    'export.outStaff': 'ملاحظات الموظفين الداخلية',
    'export.outStaffNote':
      'حديث الفريق مع نفسه عن حالة دعم أو مراجعة. نشر هذه الملاحظات يُفقدها فائدتها، وهي ليست سجلًّا عنك.',
    'export.outFiles': 'الملفات المرفوعة نفسها',
    'export.outFilesNote':
      'المرفقات تُذكر بالإشارة إليها. أما نسخ كل فيديو مخزَّن في مستند واحد فميزة أخرى لها حدود حجم خاصة بها.',
    'export.outTokens': 'رموز الاعتماد',
    'export.outTokensNote':
      'رموز التحقّق من الشهادات وروابط المشاركة هي ما يُدخل الآخرين. وطباعتها في نسخة هي ما يجعلها تكفّ عن أن تكون سرّية.',
    'export.outBoards': 'مشاركاتك في نقاش الطلاب ونقاش المعلمين',
    'export.outBoardsNote':
      'هناك تكتب باسم مستعار، حتى لا تحمل المشاركة اسمك. والنسخة التي تضع تلك المشاركات بجانب اسمك تُبطل ذلك. تبقى المشاركات في النقاش، حيث يمكنك قراءتها وسحب أيٍّ منها. أما الأسئلة والأجوبة التي كتبتها داخل دورة فشيء آخر، وهي موجودة في النسخة.',
    'export.after':
      'التنزيل اتجاه والاستعادة اتجاه آخر: يمكن إعادة جزء من النسخة إلى هذا الحساب أو إلى حساب جديد. أما إغلاق حسابك فأمر منفصل ولا يمكن التراجع عنه؛ وما يحدث لكل نوع من السجلات مكتوب في تلك الصفحة.',
    'export.printCrumb': 'للطباعة',
    'export.printTitle': 'نسخة من بياناتك',
    'export.printLede':
      'اطبع هذه الصفحة، أو استخدم نافذة الطباعة في متصفحك لحفظها بصيغة PDF. متصفحك هو الذي يُنشئ ملف PDF.',
    'export.printCounts':
      'فتح هذه الصفحة أعدّ نسخة: تُحتسب واحدة من العشر في الساعة وتُسجَّل كما يُسجَّل التنزيل. وإعادة تحميل الصفحة تُعدّ نسخة أخرى.',
    'export.printMade': 'أُعدّت في: {when}',
    'export.printCut': 'هذه القوائم تجاوزت الحد فقُطعت: {lists}',
    'export.printSheet': 'تنزيل كجدول بيانات',
    'export.printJson': 'تنزيل بصيغة JSON',
    'export.printEmpty': 'لا يوجد شيء مسجَّل على هذا الحساب بعد.',
    'export.printSame':
      'هذا هو السجل نفسه الذي يحتويه التنزيلان. وما تُرك خارجه عمدًا، ولماذا، مذكور في صفحة التصدير.',
    'export.printBack': 'العودة إلى صفحة التصدير',
  },
  ur: {
    'export.crumb': 'ایکسپورٹ',
    'export.title': 'اپنے ڈیٹا کی ایک نقل حاصل کریں',
    'export.lede':
      'یہ پلیٹ فارم آپ کے بارے میں جو کچھ رکھتا ہے اس کی ایک نقل، نیچے درج مستثنیات کے ساتھ: آپ کا اکاؤنٹ، وہ کورس جن میں آپ کا اندراج ہے، جو آپ نے لکھا، جس پر آپ کو نمبر دیے گئے، جو آپ نے خریدا، اور وہ پیغامات جو آپ کو بھیجے گئے۔',
    'export.how':
      'ہر نقل اسی وقت بنتی ہے جب آپ مانگتے ہیں، اس لیے وہ اس لمحے تک تازہ ہوتی ہے۔ آپ ایک گھنٹے میں دس نقلیں بنا سکتے ہیں؛ یہ حد پلیٹ فارم کی حفاظت کے لیے ہے، آپ کو روکنے کے لیے نہیں۔',
    'export.cap':
      'جو فہرست {count} سطروں سے لمبی ہو اسے اسی تعداد پر کاٹ دیا جاتا ہے، اور نقل میں ہر کاٹی گئی فہرست کا نام درج ہوتا ہے۔',
    'export.json': 'نقل ڈاؤن لوڈ کریں (JSON)',
    'export.jsonNote':
      'پوری نقل ایک JSON فائل میں: ہر خانہ، وہ بھی جو کسی اسکرین پر نہیں دکھائے جاتے۔ یہ کسی بھی ٹیکسٹ ایڈیٹر میں کھلتی ہے۔ ڈویلپر کے لیے، یا ایسی نقل رکھنے کے لیے جسے آپ بعد میں دیکھ سکیں۔',
    'export.sheet': 'نقل ڈاؤن لوڈ کریں (اسپریڈ شیٹ)',
    'export.sheetNote':
      'ایک اسپریڈ شیٹ جس میں آپ کے اکاؤنٹ کے ہر حصے کے لیے ایک سیکشن اور سیکشنوں کے درمیان ایک خالی سطر ہے۔ یہ Excel، Numbers، LibreOffice یا Google Sheets میں کھلتی ہے۔',
    'export.read': 'یہیں پڑھیں، یا PDF کے طور پر محفوظ کریں',
    'export.readNote':
      'ایک صفحہ جسے آپ براؤزر میں پڑھ اور پرنٹ کر سکتے ہیں، یا اپنے پرنٹ ڈائیلاگ سے PDF کے طور پر محفوظ کر سکتے ہیں۔ PDF آپ کا براؤزر خود بناتا ہے۔ صفحہ کھولنا آپ کی دس نقلوں میں سے ایک شمار ہوتا ہے۔',
    'export.english':
      'نقل کے اندر سیکشنوں اور خانوں کے نام انگریزی میں ہیں، کیونکہ ریکارڈ انہی ناموں سے محفوظ ہیں۔',
    'export.audit':
      'ہر نقل آڈٹ ریکارڈ میں درج ہوتی ہے، تاریخ اور ہر سیکشن کی سطروں کی تعداد کے ساتھ۔ اسی ریکارڈ کی بدولت کسی کے ڈیٹا کی غیر متوقع نقل کا سراغ لگایا جا سکتا ہے۔',
    'export.preparing': 'آپ کی نقل بن رہی ہے…',
    'export.done': 'آپ کی نقل بن گئی اور محفوظ کرنے کے لیے آپ کے براؤزر کے حوالے کر دی گئی۔',
    'export.limit':
      'پچھلے ایک گھنٹے میں دس نقلیں بن چکی ہیں، اور یہی حد ہے۔ تھوڑا انتظار کریں، پھر دوبارہ مانگیں۔',
    'export.failed': 'نقل ابھی نہیں بن سکی۔ تھوڑی دیر بعد دوبارہ مانگیں۔',
    'export.signedOut': 'آپ سائن آؤٹ ہو چکے ہیں۔ نقل حاصل کرنے کے لیے دوبارہ سائن اِن کریں۔',
    'export.inHeading': 'اس میں کیا ہے',
    'export.inAccount': 'آپ کا اکاؤنٹ',
    'export.inAccountNote':
      'ظاہر ہونے والا نام، زبان، ٹائم زون، ملک، حالت، اور وہ کردار جو آپ کے پاس ہیں (استاد، جائزہ کار، عملہ)، اگر کوئی ہوں۔',
    'export.inLearners': 'سیکھنے والوں کے پروفائل',
    'export.inLearnersNote':
      'آپ کا اپنا، اور ان سیکھنے والوں کے جن کے آپ اس وقت تصدیق شدہ سرپرست ہیں اور پیش رفت دیکھنے کی اجازت رکھتے ہیں۔ ان کے اندراج، پیش رفت، کوششیں اور اسناد ساتھ آتی ہیں۔',
    'export.inWrote': 'جو آپ نے لکھا',
    'export.inWroteNote':
      'سبق کے نوٹس، بُک مارکس، محفوظ کیے گئے کورس اور وہ نجی نوٹ جو آپ نے کسی کے ساتھ رکھا، جائزے، گفتگو کی پوسٹیں، اسائنمنٹ کی جمع کرائی گئی تحریریں اور کوئز کے جوابات۔',
    'export.inGuardians': 'آپ کس کے ذمہ دار ہیں، اور کون آپ کو دیکھ سکتا ہے',
    'export.inGuardiansNote':
      'ہر وہ بچہ جس کے آپ سرپرست ہیں، آپ کو کیا دیکھنے اور سنبھالنے کی اجازت ہے، اور اس کی تصدیق کب ہوئی؛ اور دوسری طرف، وہ ہر شخص جسے پلیٹ فارم نے آپ کا سرپرست تصدیق کیا ہے۔',
    'export.inInvited': 'جنہیں آپ نے دعوت دی',
    'export.inInvitedNote':
      'وہ پتہ جس پر آپ نے شیئر بھیجا، آپ نے کیا شیئر کیا، اور آیا وہ قبول ہوا۔ خود لنک نہیں: لنک ہی وہ چیز ہے جو اپنے حامل کو اندر آنے دیتی ہے۔',
    'export.inMoney': 'رقم',
    'export.inMoneyNote':
      'ہر اس اکاؤنٹ کے آرڈر جس سے آپ وابستہ ہیں، کیا خریدا گیا، اور اگر آپ پڑھاتے ہیں تو آپ کی آمدنی اور ادائیگیاں۔ رقمیں بالکل ویسی ہی دکھائی دیتی ہیں جیسی درج ہیں، اپنی کرنسی میں۔',
    'export.inSupport': 'مدد اور پیغامات',
    'export.inSupportNote':
      'وہ کیس جو آپ نے کھولے، وہ جوابات جو آپ پہلے ہی دیکھ سکتے ہیں، آپ کو بھیجی گئی ہر اطلاع، اور وہ ای میل جو پلیٹ فارم نے آپ کی طرف سے بھیجی یا قطار میں رکھی، جس میں ہر دعوتی لنک مٹا دیا گیا ہے۔',
    'export.inActivity': 'سرگرمی اور آلات',
    'export.inActivityNote':
      'پروڈکٹ کے آپ کے استعمال کے بارے میں درج واقعات، اور آف لائن اسباق کے لیے رجسٹرڈ آلات۔ اساتذہ اور عملے کی رپورٹیں انہی واقعات سے شمار ہوتی ہیں۔',
    'export.outHeading': 'اس میں کیا نہیں ہے، اور کیوں',
    'export.outOthers': 'دوسروں کے الفاظ',
    'export.outOthersNote':
      'آپ کی پوسٹ کے نیچے کوئی جواب، ہم جماعت کا پیغام، کسی دوسرے سیکھنے والے کے بارے میں استاد کا نوٹ: یہ ان کا ڈیٹا ہے، آپ کا نہیں، چاہے اس کا تعلق آپ سے ہو۔',
    'export.outSignIn': 'آپ کا سائن اِن پتہ اور پاس ورڈ',
    'export.outSignInNote': 'دونوں سائن اِن فراہم کنندہ کے پاس ہیں، اس ڈیٹابیس سے باہر۔',
    'export.outStaff': 'عملے کے اندرونی نوٹس',
    'export.outStaffNote':
      'کسی سپورٹ کیس یا جائزے کے بارے میں ٹیم کی آپس کی گفتگو۔ ان نوٹس کو شائع کرنا انہیں بے کار کر دے گا، اور یہ آپ کے بارے میں کوئی ریکارڈ نہیں ہیں۔',
    'export.outFiles': 'اپ لوڈ کی گئی فائلیں خود',
    'export.outFilesNote':
      'منسلکات کا صرف حوالہ درج ہوتا ہے۔ ہر محفوظ ویڈیو کو ایک دستاویز میں نقل کرنا ایک الگ سہولت ہے، جس کی اپنی حجم کی حدیں ہیں۔',
    'export.outTokens': 'اسناد کے ٹوکن',
    'export.outTokensNote':
      'سند کی تصدیق کے ٹوکن اور شیئرنگ لنک ہی وہ چیزیں ہیں جو دوسروں کو اندر آنے دیتی ہیں۔ انہیں نقل میں چھاپ دینے سے وہ راز نہیں رہتے۔',
    'export.outBoards': 'طلبہ اور اساتذہ کی گفتگو میں آپ کی پوسٹیں',
    'export.outBoardsNote':
      'وہاں آپ فرضی نام سے لکھتے ہیں تاکہ پوسٹ پر آپ کا نام نہ ہو۔ جو نقل ان پوسٹوں کو آپ کے نام کے ساتھ رکھ دے وہ یہ بات ختم کر دیتی ہے۔ وہ گفتگو ہی میں رہتی ہیں، جہاں آپ انہیں پڑھ سکتے ہیں اور کوئی بھی واپس لے سکتے ہیں۔ کسی کورس میں آپ کے لکھے ہوئے سوال اور جواب الگ چیز ہیں: وہ نقل میں شامل ہیں۔',
    'export.after':
      'ڈاؤن لوڈ ایک سمت ہے اور بحالی دوسری: نقل کا کچھ حصہ اس اکاؤنٹ پر یا کسی نئے اکاؤنٹ پر واپس رکھا جا سکتا ہے۔ اکاؤنٹ بند کرنا الگ معاملہ ہے اور اسے واپس نہیں لیا جا سکتا؛ ہر قسم کے ریکارڈ کے ساتھ کیا ہوتا ہے، وہ اس صفحے پر لکھا ہے۔',
    'export.printCrumb': 'پرنٹ کے لیے',
    'export.printTitle': 'آپ کے ڈیٹا کی ایک نقل',
    'export.printLede':
      'یہ صفحہ پرنٹ کریں، یا اپنے براؤزر کے پرنٹ ڈائیلاگ سے اسے PDF کے طور پر محفوظ کریں۔ PDF آپ کا براؤزر خود بناتا ہے۔',
    'export.printCounts':
      'یہ صفحہ کھولنے سے ایک نقل بنی: یہ ایک گھنٹے کی دس میں سے ایک شمار ہوتی ہے اور ڈاؤن لوڈ کی طرح درج ہوتی ہے۔ صفحہ دوبارہ لوڈ کرنے سے ایک اور بنتی ہے۔',
    'export.printMade': 'بنائی گئی: {when}',
    'export.printCut': 'یہ فہرستیں حد سے لمبی تھیں اور کاٹ دی گئیں: {lists}',
    'export.printSheet': 'اسپریڈ شیٹ کے طور پر ڈاؤن لوڈ کریں',
    'export.printJson': 'JSON کے طور پر ڈاؤن لوڈ کریں',
    'export.printEmpty': 'اس اکاؤنٹ پر ابھی کچھ درج نہیں ہے۔',
    'export.printSame':
      'یہ وہی ریکارڈ ہے جو دونوں ڈاؤن لوڈ میں ہے۔ جو کچھ جان بوجھ کر باہر رکھا گیا ہے، اور کیوں، وہ ایکسپورٹ کے صفحے پر ہے۔',
    'export.printBack': 'ایکسپورٹ کے صفحے پر واپس',
  },
  fa: {
    'export.crumb': 'برون‌بری',
    'export.title': 'نسخه‌ای از داده‌های خود بگیرید',
    'export.lede':
      'یک نسخه از آنچه این سکو دربارهٔ شما نگه می‌دارد، با استثناهایی که در پایین آمده است: حساب شما، دوره‌هایی که در آن‌ها ثبت‌نام کرده‌اید، آنچه نوشته‌اید، آنچه برایش نمره گرفته‌اید، آنچه خریده‌اید و پیام‌هایی که برایتان فرستاده شده است.',
    'export.how':
      'هر نسخه همان زمانی ساخته می‌شود که آن را می‌خواهید، پس تا همان لحظه به‌روز است. می‌توانید در هر ساعت ده نسخه بسازید؛ این سقف برای محافظت از سکو است و قرار نیست شما را محدود کند.',
    'export.cap':
      'فهرستی که از {count} ردیف بلندتر باشد در همان شمار بریده می‌شود، و نسخه نام هر فهرست بریده‌شده را می‌آورد.',
    'export.json': 'بارگیری نسخه (JSON)',
    'export.jsonNote':
      'کل نسخه در یک پروندهٔ JSON: همهٔ فیلدها، از جمله آن‌هایی که هیچ صفحه‌ای نشانشان نمی‌دهد. در هر ویرایشگر متن باز می‌شود. برای برنامه‌نویس، یا برای نگه‌داشتن نسخه‌ای که بعداً بتوانید بررسی‌اش کنید.',
    'export.sheet': 'بارگیری نسخه (صفحه‌گسترده)',
    'export.sheetNote':
      'صفحه‌گسترده‌ای با یک بخش برای هر قسمت از حساب شما و یک سطر خالی میان بخش‌ها. در Excel، Numbers، LibreOffice یا Google Sheets باز می‌شود.',
    'export.read': 'همین‌جا بخوانید، یا به‌صورت PDF ذخیره کنید',
    'export.readNote':
      'صفحه‌ای که می‌توانید در مرورگر بخوانید و چاپ کنید، یا از پنجرهٔ چاپ خودتان به‌صورت PDF ذخیره کنید. PDF را خودِ مرورگر شما می‌سازد. باز کردن این صفحه یکی از ده نسخهٔ شما به شمار می‌آید.',
    'export.english':
      'نام بخش‌ها و فیلدهای درون نسخه به انگلیسی است، چون رکوردها با همین نام‌ها ذخیره شده‌اند.',
    'export.audit':
      'هر نسخه در سابقهٔ ممیزی ثبت می‌شود، همراه با تاریخ و شمار ردیف‌های هر بخش. همین سابقه است که نسخهٔ غیرمنتظره از داده‌های کسی را قابل ردیابی می‌کند.',
    'export.preparing': 'در حال ساختن نسخهٔ شما…',
    'export.done': 'نسخهٔ شما ساخته شد و برای ذخیره به مرورگرتان سپرده شد.',
    'export.limit':
      'در یک ساعت گذشته ده نسخه ساخته شده است و سقف همین است. کمی صبر کنید، سپس دوباره بخواهید.',
    'export.failed': 'نسخه همین حالا ساخته نشد. چند لحظهٔ دیگر دوباره بخواهید.',
    'export.signedOut': 'از حساب خارج شده‌اید. برای گرفتن نسخه دوباره وارد شوید.',
    'export.inHeading': 'چه چیزی در آن هست',
    'export.inAccount': 'حساب شما',
    'export.inAccountNote':
      'نام نمایشی، زبان، منطقهٔ زمانی، کشور، وضعیت، و نقش‌هایی که دارید (معلم، بازبین، کارمند)، اگر داشته باشید.',
    'export.inLearners': 'نمایه‌های یادگیرندگان',
    'export.inLearnersNote':
      'نمایهٔ خودتان، و نمایهٔ یادگیرندگانی که اکنون سرپرست تأییدشدهٔ آن‌ها هستید و اجازهٔ دیدن پیشرفتشان را دارید. ثبت‌نام‌ها، پیشرفت، تلاش‌ها و گواهی‌نامه‌هایشان هم همراه آن می‌آید.',
    'export.inWrote': 'آنچه نوشته‌اید',
    'export.inWroteNote':
      'یادداشت‌های درس، نشانک‌ها، دوره‌های ذخیره‌شده و یادداشت خصوصی‌ای که کنار یکی از آن‌ها گذاشته‌اید، نظرها، نوشته‌های گفت‌وگو، تکلیف‌های تحویل‌شده و پاسخ‌های آزمونک.',
    'export.inGuardians': 'مسئول چه کسانی هستید، و چه کسی می‌تواند شما را ببیند',
    'export.inGuardiansNote':
      'هر کودکی که سرپرستش هستید، آنچه اجازه دارید ببینید و مدیریت کنید، و زمانی که این تأیید شد؛ و از سوی دیگر، هر کسی که سکو او را سرپرست شما تأیید کرده است.',
    'export.inInvited': 'کسانی که دعوت کرده‌اید',
    'export.inInvitedNote':
      'نشانی‌ای که اشتراک را به آن فرستادید، آنچه به اشتراک گذاشتید، و اینکه پذیرفته شد یا نه. نه خودِ پیوند: پیوند همان چیزی است که دارنده‌اش را راه می‌دهد.',
    'export.inMoney': 'پول',
    'export.inMoneyNote':
      'سفارش‌های هر حسابی که عضو آن هستید، آنچه خریده شده، و اگر تدریس می‌کنید، درآمدها و پرداخت‌هایتان. مبلغ‌ها درست همان‌گونه که ثبت شده‌اند، با واحد پول خودشان، می‌آیند.',
    'export.inSupport': 'پشتیبانی و پیام‌ها',
    'export.inSupportNote':
      'پرونده‌هایی که باز کرده‌اید، پاسخ‌هایی که هم‌اکنون می‌توانید ببینید، هر اعلانی که برایتان فرستاده شده، و رایانامه‌ای که سکو از طرف شما فرستاده یا در صف گذاشته است، با پاک‌شدن هر پیوند دعوت.',
    'export.inActivity': 'فعالیت و دستگاه‌ها',
    'export.inActivityNote':
      'رویدادهایی که دربارهٔ استفادهٔ شما از محصول ثبت شده، و دستگاه‌هایی که برای درس‌های برون‌خط ثبت شده‌اند. گزارش‌های معلمان و کارکنان از همین رویدادها شمرده می‌شود.',
    'export.outHeading': 'چه چیزی در آن نیست، و چرا',
    'export.outOthers': 'سخنان دیگران',
    'export.outOthersNote':
      'پاسخی زیر نوشتهٔ شما، پیام یک هم‌کلاسی، یادداشت معلم دربارهٔ یادگیرنده‌ای دیگر: این‌ها دادهٔ آن‌هاست، نه شما، حتی اگر به شما مربوط باشد.',
    'export.outSignIn': 'نشانی ورود و گذرواژهٔ شما',
    'export.outSignInNote':
      'هر دو نزد ارائه‌دهندهٔ ورود نگه‌داری می‌شود، بیرون از این پایگاه داده.',
    'export.outStaff': 'یادداشت‌های داخلی کارکنان',
    'export.outStaffNote':
      'گفت‌وگوی گروه با خودش دربارهٔ یک پروندهٔ پشتیبانی یا یک بازبینی. انتشار این یادداشت‌ها آن‌ها را بی‌فایده می‌کند، و آن‌ها سابقه‌ای دربارهٔ شما نیستند.',
    'export.outFiles': 'خودِ پرونده‌های بارگذاری‌شده',
    'export.outFilesNote':
      'پیوست‌ها با ارجاع فهرست می‌شوند. رونوشت‌گرفتن از هر ویدیوی ذخیره‌شده در یک سند، قابلیتی دیگر است با سقف‌های حجم خودش.',
    'export.outTokens': 'توکن‌های اعتبارنامه',
    'export.outTokensNote':
      'توکن‌های راستی‌آزمایی گواهی‌نامه و پیوندهای اشتراک‌گذاری همان چیزهایی‌اند که دیگران را راه می‌دهند. چاپ‌کردنشان در یک نسخه همان راهی است که دیگر محرمانه نمی‌مانند.',
    'export.outBoards': 'نوشته‌های شما در گفت‌وگوی دانش‌آموزان و گفت‌وگوی معلمان',
    'export.outBoardsNote':
      'آنجا با نام کاربری می‌نویسید تا نوشته نام شما را با خود نداشته باشد. نسخه‌ای که آن نوشته‌ها را کنار نام شما بگذارد این را از میان می‌برد. آن‌ها در گفت‌وگو می‌مانند؛ همان‌جا می‌توانید بخوانیدشان و هرکدام را پس بگیرید. پرسش‌ها و پاسخ‌هایی که در یک دوره نوشته‌اید چیز دیگری است: آن‌ها در نسخه هستند.',
    'export.after':
      'بارگیری یک سو است و بازگردانی سوی دیگر: بخشی از یک نسخه را می‌توان به همین حساب یا به حسابی تازه بازگرداند. بستن حساب جداست و برگشت‌پذیر نیست؛ اینکه برای هر نوع رکورد چه پیش می‌آید در همان صفحه نوشته شده است.',
    'export.printCrumb': 'برای چاپ',
    'export.printTitle': 'نسخه‌ای از داده‌های شما',
    'export.printLede':
      'این صفحه را چاپ کنید، یا با پنجرهٔ چاپ مرورگرتان آن را به‌صورت PDF ذخیره کنید. PDF را خودِ مرورگر شما می‌سازد.',
    'export.printCounts':
      'با باز شدن این صفحه یک نسخه ساخته شد: یکی از ده نسخهٔ هر ساعت به شمار می‌آید و مانند بارگیری ثبت می‌شود. بارگذاری دوبارهٔ صفحه نسخه‌ای دیگر می‌سازد.',
    'export.printMade': 'زمان ساخت: {when}',
    'export.printCut': 'این فهرست‌ها از سقف بلندتر بودند و بریده شدند: {lists}',
    'export.printSheet': 'بارگیری به‌صورت صفحه‌گسترده',
    'export.printJson': 'بارگیری به‌صورت JSON',
    'export.printEmpty': 'هنوز چیزی برای این حساب ثبت نشده است.',
    'export.printSame':
      'این همان رکوردی است که دو بارگیری در خود دارند. آنچه به‌عمد کنار گذاشته شده، و چرایی‌اش، در صفحهٔ برون‌بری آمده است.',
    'export.printBack': 'بازگشت به صفحهٔ برون‌بری',
  },
  'fa-af': {
    'export.crumb': 'صادر کردن',
    'export.title': 'یک نسخه از معلومات خود را بگیرید',
    'export.lede':
      'یک نسخه از آنچه این پلتفرم دربارهٔ شما نگه می‌دارد، با استثناهایی که در پایین آمده است: حساب شما، کورس‌هایی که در آن‌ها ثبت نام کرده‌اید، آنچه نوشته‌اید، آنچه برایش نمره گرفته‌اید، آنچه خریده‌اید و پیام‌هایی که برای‌تان فرستاده شده است.',
    'export.how':
      'هر نسخه همان وقتی ساخته می‌شود که آن را می‌خواهید، پس تا همان لحظه تازه است. می‌توانید در هر ساعت ده نسخه بسازید؛ این حد برای محافظت از پلتفرم است و برای محدود ساختن شما نیست.',
    'export.cap':
      'فهرستی که از {count} سطر درازتر باشد در همان شمار قطع می‌شود، و نسخه نام هر فهرست قطع‌شده را می‌آورد.',
    'export.json': 'داونلود نسخه (JSON)',
    'export.jsonNote':
      'تمام نسخه در یک فایل JSON: همهٔ خانه‌ها، به شمول آن‌هایی که هیچ صفحه‌ای نشان‌شان نمی‌دهد. در هر ویرایشگر متن باز می‌شود. برای برنامه‌نویس، یا برای نگه‌داشتن نسخه‌ای که بعداً بتوانید آن را بررسی کنید.',
    'export.sheet': 'داونلود نسخه (صفحهٔ جدولی)',
    'export.sheetNote':
      'یک صفحهٔ جدولی با یک بخش برای هر قسمت حساب شما و یک سطر خالی میان بخش‌ها. در Excel، Numbers، LibreOffice یا Google Sheets باز می‌شود.',
    'export.read': 'همین‌جا بخوانید، یا به شکل PDF ذخیره کنید',
    'export.readNote':
      'صفحه‌ای که می‌توانید در مرورگر بخوانید و چاپ کنید، یا از پنجرهٔ چاپ خودتان به شکل PDF ذخیره کنید. PDF را خودِ مرورگر شما می‌سازد. باز کردن این صفحه یکی از ده نسخهٔ شما حساب می‌شود.',
    'export.english':
      'نام بخش‌ها و خانه‌های درون نسخه به انگلیسی است، زیرا سوابق با همین نام‌ها ذخیره شده‌اند.',
    'export.audit':
      'هر نسخه در سابقهٔ بازرسی ثبت می‌شود، همراه با تاریخ و شمار سطرهای هر بخش. همین سابقه است که نسخهٔ غیرمنتظره از معلومات کسی را قابل ردیابی می‌سازد.',
    'export.preparing': 'نسخهٔ شما ساخته می‌شود…',
    'export.done': 'نسخهٔ شما ساخته شد و برای ذخیره به مرورگرتان سپرده شد.',
    'export.limit':
      'در یک ساعت گذشته ده نسخه ساخته شده است و حد همین است. کمی صبر کنید، بعد دوباره بخواهید.',
    'export.failed': 'نسخه همین حالا ساخته نشد. چند لحظه بعد دوباره بخواهید.',
    'export.signedOut': 'از حساب خارج شده‌اید. برای گرفتن نسخه دوباره وارد شوید.',
    'export.inHeading': 'چه چیز در آن است',
    'export.inAccount': 'حساب شما',
    'export.inAccountNote':
      'نام نمایشی، زبان، منطقهٔ زمانی، کشور، وضعیت، و نقش‌هایی که دارید (استاد، بازبین، کارمند)، اگر داشته باشید.',
    'export.inLearners': 'پروفایل‌های شاگردان',
    'export.inLearnersNote':
      'پروفایل خودتان، و پروفایل شاگردانی که فعلاً سرپرست تأییدشدهٔ آن‌ها هستید و اجازهٔ دیدن پیشرفت‌شان را دارید. ثبت نام‌ها، پیشرفت، تلاش‌ها و اسنادشان هم همراه آن می‌آید.',
    'export.inWrote': 'آنچه نوشته‌اید',
    'export.inWroteNote':
      'یادداشت‌های درس، نشانه‌ها، کورس‌های ذخیره‌شده و یادداشت خصوصی‌ای که کنار یکی از آن‌ها گذاشته‌اید، نظرها، نوشته‌های گفت‌وگو، کارخانگی‌های تسلیم‌شده و پاسخ‌های آزمونک.',
    'export.inGuardians': 'مسئول چه کسانی هستید، و چه کسی می‌تواند شما را ببیند',
    'export.inGuardiansNote':
      'هر طفلی که سرپرستش هستید، آنچه اجازه دارید ببینید و اداره کنید، و وقتی که این تأیید شد؛ و از سوی دیگر، هر کسی که پلتفرم او را سرپرست شما تأیید کرده است.',
    'export.inInvited': 'کسانی که دعوت کرده‌اید',
    'export.inInvitedNote':
      'نشانی‌ای که اشتراک را به آن فرستادید، آنچه شریک ساختید، و اینکه پذیرفته شد یا نه. نه خودِ لینک: لینک همان چیزی است که دارنده‌اش را راه می‌دهد.',
    'export.inMoney': 'پول',
    'export.inMoneyNote':
      'فرمایش‌های هر حسابی که عضو آن هستید، آنچه خریده شده، و اگر تدریس می‌کنید، عایدها و پرداخت‌های‌تان. مبلغ‌ها درست همان‌گونه که ثبت شده‌اند، با واحد پول خودشان، می‌آیند.',
    'export.inSupport': 'پشتیبانی و پیام‌ها',
    'export.inSupportNote':
      'قضیه‌هایی که باز کرده‌اید، پاسخ‌هایی که همین حالا می‌توانید ببینید، هر اطلاعیه‌ای که برای‌تان فرستاده شده، و ایمیلی که پلتفرم از طرف شما فرستاده یا در صف گذاشته است، با پاک شدن هر لینک دعوت.',
    'export.inActivity': 'فعالیت و دستگاه‌ها',
    'export.inActivityNote':
      'رویدادهایی که دربارهٔ استفادهٔ شما از محصول ثبت شده، و دستگاه‌هایی که برای درس‌های آفلاین ثبت شده‌اند. گزارش‌های استادان و کارمندان از همین رویدادها شمرده می‌شود.',
    'export.outHeading': 'چه چیز در آن نیست، و چرا',
    'export.outOthers': 'گفته‌های دیگران',
    'export.outOthersNote':
      'پاسخی زیر نوشتهٔ شما، پیام یک هم‌صنفی، یادداشت استاد دربارهٔ شاگردی دیگر: این‌ها معلومات آن‌هاست، نه از شما، حتی اگر به شما مربوط باشد.',
    'export.outSignIn': 'نشانی ورود و رمز عبور شما',
    'export.outSignInNote': 'هر دو نزد ارائه‌کنندهٔ ورود نگه‌داری می‌شود، بیرون از این دیتابیس.',
    'export.outStaff': 'یادداشت‌های داخلی کارمندان',
    'export.outStaffNote':
      'گفت‌وگوی تیم با خودش دربارهٔ یک قضیهٔ پشتیبانی یا یک بازبینی. نشر این یادداشت‌ها آن‌ها را بی‌فایده می‌سازد، و آن‌ها سابقه‌ای دربارهٔ شما نیستند.',
    'export.outFiles': 'خودِ فایل‌های آپلودشده',
    'export.outFilesNote':
      'ضمیمه‌ها با اشاره فهرست می‌شوند. کاپی کردن هر ویدیوی ذخیره‌شده در یک سند، قابلیتی دیگر است با حدهای حجم خودش.',
    'export.outTokens': 'توکن‌های اعتبارنامه',
    'export.outTokensNote':
      'توکن‌های تصدیق سند و لینک‌های شریک‌سازی همان چیزهایی‌اند که دیگران را راه می‌دهند. چاپ کردن‌شان در یک نسخه همان راهی است که دیگر محرم نمی‌مانند.',
    'export.outBoards': 'نوشته‌های شما در گفت‌وگوی شاگردان و گفت‌وگوی استادان',
    'export.outBoardsNote':
      'آنجا با نام مستعار می‌نویسید تا نوشته نام شما را با خود نداشته باشد. نسخه‌ای که آن نوشته‌ها را کنار نام شما بگذارد این را از بین می‌برد. آن‌ها در گفت‌وگو می‌مانند؛ همان‌جا می‌توانید آن‌ها را بخوانید و هرکدام را پس بگیرید. پرسش‌ها و پاسخ‌هایی که در یک کورس نوشته‌اید چیز دیگری است: آن‌ها در نسخه هستند.',
    'export.after':
      'داونلود یک سو است و بازگرداندن سوی دیگر: بخشی از یک نسخه را می‌توان به همین حساب یا به حسابی نو برگرداند. بستن حساب جداست و برگشت‌پذیر نیست؛ اینکه برای هر نوع سابقه چه پیش می‌آید در همان صفحه نوشته شده است.',
    'export.printCrumb': 'برای چاپ',
    'export.printTitle': 'یک نسخه از معلومات شما',
    'export.printLede':
      'این صفحه را چاپ کنید، یا با پنجرهٔ چاپ مرورگرتان آن را به شکل PDF ذخیره کنید. PDF را خودِ مرورگر شما می‌سازد.',
    'export.printCounts':
      'با باز شدن این صفحه یک نسخه ساخته شد: یکی از ده نسخهٔ هر ساعت حساب می‌شود و مانند داونلود ثبت می‌شود. دوباره بار کردن صفحه نسخه‌ای دیگر می‌سازد.',
    'export.printMade': 'وقت ساخت: {when}',
    'export.printCut': 'این فهرست‌ها از حد درازتر بودند و قطع شدند: {lists}',
    'export.printSheet': 'داونلود به شکل صفحهٔ جدولی',
    'export.printJson': 'داونلود به شکل JSON',
    'export.printEmpty': 'هنوز چیزی برای این حساب ثبت نشده است.',
    'export.printSame':
      'این همان سابقه‌ای است که دو داونلود در خود دارند. آنچه قصداً بیرون گذاشته شده، و چرایی‌اش، در صفحهٔ صادر کردن آمده است.',
    'export.printBack': 'بازگشت به صفحهٔ صادر کردن',
  },
  tr: {
    'export.crumb': 'Dışa aktarma',
    'export.title': 'Verilerinizin bir kopyasını alın',
    'export.lede':
      'Bu platformun hakkınızda tuttuklarının, aşağıda sayılan istisnalar dışında, tek bir kopyası: hesabınız, kayıtlı olduğunuz kurslar, yazdıklarınız, not aldığınız çalışmalar, satın aldıklarınız ve size gönderilen mesajlar.',
    'export.how':
      'Her kopya siz istediğinizde hazırlanır, dolayısıyla o an itibarıyla günceldir. Saatte on kopya alabilirsiniz; bu sınır platformu korur, sizi kısıtlamak için konmamıştır.',
    'export.cap':
      '{count} satırdan uzun bir liste bu sayıda kesilir ve kopya, kesilen her listenin adını belirtir.',
    'export.json': 'Kopyayı indir (JSON)',
    'export.jsonNote':
      'Kopyanın tamamı tek bir JSON dosyası olarak: hiçbir ekranın göstermedikleri dahil her alan. Herhangi bir metin düzenleyicide açılır. Bir geliştirici için ya da sonradan kontrol edebileceğiniz bir kopya saklamak için.',
    'export.sheet': 'Kopyayı indir (elektronik tablo)',
    'export.sheetNote':
      'Hesabınızın her bölümü için bir kısım ve kısımlar arasında boş bir satır bulunan bir elektronik tablo. Excel, Numbers, LibreOffice veya Google Sheets ile açılır.',
    'export.read': 'Burada okuyun veya PDF olarak kaydedin',
    'export.readNote':
      'Tarayıcıda okuyup yazdırabileceğiniz ya da kendi yazdırma pencerenizden PDF olarak kaydedebileceğiniz bir sayfa. PDF’yi tarayıcınız kendisi oluşturur. Sayfayı açmak on kopyanızdan biri sayılır.',
    'export.english':
      'Kopyanın içindeki bölüm ve alan adları İngilizcedir, çünkü kayıtlar bu adlarla saklanır.',
    'export.audit':
      'Her kopya, tarihi ve her bölümdeki satır sayısıyla birlikte denetim kaydına işlenir. Birinin verilerinin beklenmedik bir kopyasını izlenebilir kılan şey bu kayıttır.',
    'export.preparing': 'Kopyanız hazırlanıyor…',
    'export.done': 'Kopyanız hazırlandı ve kaydetmesi için tarayıcınıza teslim edildi.',
    'export.limit':
      'Son bir saatte on kopya alındı; sınır budur. Biraz bekleyin, sonra yeniden isteyin.',
    'export.failed': 'Kopya şu anda hazırlanamadı. Biraz sonra yeniden isteyin.',
    'export.signedOut': 'Oturumunuz kapalı. Kopya almak için yeniden oturum açın.',
    'export.inHeading': 'İçinde neler var',
    'export.inAccount': 'Hesabınız',
    'export.inAccountNote':
      'Görünen ad, dil, saat dilimi, ülke, durum ve varsa üstlendiğiniz roller (öğretmen, değerlendirici, personel).',
    'export.inLearners': 'Öğrenci profilleri',
    'export.inLearnersNote':
      'Kendi profiliniz ve şu anda doğrulanmış velisi olduğunuz, ilerlemesini görme izniniz bulunan öğrencilerin profilleri. Kayıtları, ilerlemeleri, denemeleri ve sertifikaları da bunlarla birlikte gelir.',
    'export.inWrote': 'Yazdıklarınız',
    'export.inWroteNote':
      'Ders notları, yer imleri, kaydedilen kurslar ve birinin yanına koyduğunuz özel not, değerlendirmeler, tartışma gönderileri, teslim edilen ödevler ve sınav yanıtları.',
    'export.inGuardians': 'Kimlerden sorumlusunuz ve sizi kimler görebilir',
    'export.inGuardiansNote':
      'Velisi olduğunuz her çocuk, neleri görmenize ve yönetmenize izin verildiği ve bunun ne zaman doğrulandığı; öbür yönden de platformun sizin veliniz olarak doğruladığı herkes.',
    'export.inInvited': 'Davet ettiğiniz kişiler',
    'export.inInvitedNote':
      'Paylaşımı gönderdiğiniz adres, ne paylaştığınız ve kabul edilip edilmediği. Bağlantının kendisi değil: bağlantı, elinde tutanı içeri alan şeydir.',
    'export.inMoney': 'Para',
    'export.inMoneyNote':
      'Üyesi olduğunuz her hesaptaki siparişler, neyin satın alındığı ve öğretmenlik yapıyorsanız kazançlarınız ile size yapılan ödemeler. Tutarlar tam kaydedildiği gibi, kendi para biriminde görünür.',
    'export.inSupport': 'Destek ve mesajlar',
    'export.inSupportNote':
      'Açtığınız destek kayıtları, zaten görebildiğiniz yanıtlar, size gönderilen her bildirim ve platformun sizin adınıza gönderdiği veya sıraya aldığı e-postalar; her davet bağlantısı silinmiş olarak.',
    'export.inActivity': 'Etkinlik ve cihazlar',
    'export.inActivityNote':
      'Ürünü kullanımınız hakkında kaydedilen olaylar ve çevrimdışı dersler için kayıtlı cihazlar. Öğretmenlere ve personele yönelik raporlar da aynı olaylardan sayılır.',
    'export.outHeading': 'İçinde neler yok ve neden',
    'export.outOthers': 'Başkalarının sözleri',
    'export.outOthersNote':
      'Gönderinizin altındaki bir yanıt, bir sınıf arkadaşının mesajı, bir öğretmenin başka bir öğrenci hakkındaki notu: sizi ilgilendirse bile bunlar sizin değil, onların verisidir.',
    'export.outSignIn': 'Oturum açma adresiniz ve parolanız',
    'export.outSignInNote':
      'İkisi de bu veritabanının dışında, oturum açma sağlayıcısında tutulur.',
    'export.outStaff': 'Personelin iç notları',
    'export.outStaffNote':
      'Ekibin bir destek kaydı ya da bir inceleme hakkında kendi arasındaki konuşması. Bu notları yayımlamak onları işe yaramaz kılar; ayrıca bunlar sizin hakkınızda bir kayıt değildir.',
    'export.outFiles': 'Yüklenen dosyaların kendisi',
    'export.outFilesNote':
      'Ekler yalnızca atıfla listelenir. Saklanan her videoyu tek bir belgeye kopyalamak, kendi boyut sınırları olan ayrı bir özelliktir.',
    'export.outTokens': 'Kimlik doğrulama belirteçleri',
    'export.outTokensNote':
      'Sertifika doğrulama belirteçleri ve paylaşım bağlantıları, başkalarını içeri alan şeylerdir. Bunları bir kopyaya basmak, gizli olmaktan çıkmalarının yoludur.',
    'export.outBoards': 'Öğrenci ve öğretmen tartışmasındaki gönderileriniz',
    'export.outBoardsNote':
      'Orada bir kullanıcı adıyla yazarsınız; böylece gönderi adınızı taşımaz. Bu gönderileri adınızın yanına koyan bir kopya bunu boşa çıkarır. Gönderiler tartışmada kalır; orada okuyabilir ve istediğinizi geri alabilirsiniz. Bir kursta yazdığınız sorular ve yanıtlar ayrı bir şeydir: onlar kopyadadır.',
    'export.after':
      'İndirme bir yöndür, geri yükleme öbür yön: bir kopyanın bir kısmı bu hesaba veya yeni bir hesaba geri konabilir. Hesabınızı kapatmak ayrı bir iştir ve geri alınamaz; her kayıt türüne ne olduğu o sayfada yazılıdır.',
    'export.printCrumb': 'Yazdırmak için',
    'export.printTitle': 'Verilerinizin bir kopyası',
    'export.printLede':
      'Bu sayfayı yazdırın ya da tarayıcınızın yazdırma penceresini kullanarak PDF olarak kaydedin. PDF’yi tarayıcınız kendisi oluşturur.',
    'export.printCounts':
      'Bu sayfayı açmak bir kopya oluşturdu: saatteki on kopyadan biri sayılır ve bir indirme gibi kaydedilir. Sayfayı yeniden yüklemek bir kopya daha oluşturur.',
    'export.printMade': 'Hazırlanma zamanı: {when}',
    'export.printCut': 'Şu listeler sınırdan uzundu ve kesildi: {lists}',
    'export.printSheet': 'Elektronik tablo olarak indir',
    'export.printJson': 'JSON olarak indir',
    'export.printEmpty': 'Bu hesap için henüz kaydedilmiş bir şey yok.',
    'export.printSame':
      'Bu, iki indirmenin içerdiği kaydın aynısıdır. Bilerek dışarıda bırakılanlar ve nedenleri dışa aktarma sayfasındadır.',
    'export.printBack': 'Dışa aktarma sayfasına dön',
  },
  id: {
    'export.crumb': 'Ekspor',
    'export.title': 'Dapatkan salinan data Anda',
    'export.lede':
      'Satu salinan dari apa yang disimpan platform ini tentang Anda, dengan pengecualian yang disebutkan di bawah: akun Anda, kursus yang Anda ikuti, apa yang Anda tulis, apa yang telah dinilai, apa yang Anda beli, dan pesan yang dikirimkan kepada Anda.',
    'export.how':
      'Setiap salinan dibuat saat Anda memintanya, sehingga isinya terkini pada saat itu. Anda dapat membuat sepuluh salinan per jam; batas ini melindungi platform dan tidak dimaksudkan untuk membatasi Anda.',
    'export.cap':
      'Daftar yang lebih panjang dari {count} baris dipotong pada jumlah itu, dan salinan menyebutkan setiap daftar yang dipotong.',
    'export.json': 'Unduh salinan (JSON)',
    'export.jsonNote':
      'Seluruh salinan sebagai satu berkas JSON: setiap kolom, termasuk yang tidak ditampilkan di layar mana pun. Dapat dibuka di penyunting teks apa saja. Untuk pengembang, atau untuk menyimpan salinan yang dapat Anda periksa nanti.',
    'export.sheet': 'Unduh salinan (lembar kerja)',
    'export.sheetNote':
      'Lembar kerja dengan satu bagian untuk tiap bagian akun Anda dan satu baris kosong di antara bagian. Dapat dibuka di Excel, Numbers, LibreOffice, atau Google Sheets.',
    'export.read': 'Baca di sini, atau simpan sebagai PDF',
    'export.readNote':
      'Halaman yang dapat Anda baca di peramban dan cetak, atau simpan sebagai PDF dari dialog cetak Anda sendiri. Peramban Anda sendiri yang membuat PDF itu. Membuka halaman ini dihitung sebagai satu dari sepuluh salinan Anda.',
    'export.english':
      'Nama bagian dan kolom di dalam salinan berbahasa Inggris, karena dengan nama itulah catatan disimpan.',
    'export.audit':
      'Setiap salinan dicatat dalam jejak audit, beserta tanggal dan jumlah baris tiap bagian. Catatan itulah yang membuat salinan data seseorang yang tidak terduga dapat dilacak.',
    'export.preparing': 'Membuat salinan Anda…',
    'export.done': 'Salinan Anda telah dibuat dan diserahkan ke peramban Anda untuk disimpan.',
    'export.limit':
      'Sepuluh salinan telah dibuat dalam satu jam terakhir, dan itulah batasnya. Tunggu sebentar, lalu minta lagi.',
    'export.failed': 'Salinan tidak dapat dibuat saat ini. Minta lagi sebentar lagi.',
    'export.signedOut': 'Anda sudah keluar. Masuk lagi untuk mendapatkan salinan.',
    'export.inHeading': 'Apa isinya',
    'export.inAccount': 'Akun Anda',
    'export.inAccountNote':
      'Nama tampilan, bahasa, zona waktu, negara, status, dan peran yang Anda pegang (pengajar, peninjau, staf), jika ada.',
    'export.inLearners': 'Profil peserta didik',
    'export.inLearnersNote':
      'Profil Anda sendiri, dan profil peserta didik yang saat ini Anda menjadi wali terverifikasinya dengan izin melihat kemajuan. Pendaftaran, kemajuan, percobaan, dan sertifikat mereka ikut disertakan.',
    'export.inWrote': 'Apa yang Anda tulis',
    'export.inWroteNote':
      'Catatan pelajaran, markah, kursus tersimpan dan catatan pribadi yang Anda taruh di sampingnya, ulasan, kiriman diskusi, pengumpulan tugas, dan jawaban kuis.',
    'export.inGuardians':
      'Siapa yang menjadi tanggung jawab Anda, dan siapa yang boleh melihat Anda',
    'export.inGuardiansNote':
      'Setiap anak yang Anda menjadi walinya, apa yang boleh Anda lihat dan kelola, dan kapan hal itu diverifikasi; dan sebaliknya, siapa pun yang telah diverifikasi platform sebagai wali Anda.',
    'export.inInvited': 'Orang yang Anda undang',
    'export.inInvitedNote':
      'Alamat tujuan Anda mengirim pembagian, apa yang Anda bagikan, dan apakah diterima. Bukan tautannya sendiri: tautan itulah yang memberi jalan masuk kepada pemegangnya.',
    'export.inMoney': 'Uang',
    'export.inMoneyNote':
      'Pesanan pada akun mana pun tempat Anda tergabung, apa yang dibeli, dan, jika Anda mengajar, penghasilan dan pembayaran kepada Anda. Jumlah ditampilkan persis seperti yang tercatat, dalam mata uangnya sendiri.',
    'export.inSupport': 'Bantuan dan pesan',
    'export.inSupportNote':
      'Kasus yang Anda buka, balasan yang memang sudah dapat Anda lihat, setiap notifikasi yang dikirimkan kepada Anda, dan email yang telah dikirim atau diantrekan platform atas nama Anda, dengan setiap tautan undangan dihapus.',
    'export.inActivity': 'Aktivitas dan perangkat',
    'export.inActivityNote':
      'Peristiwa yang tercatat tentang penggunaan Anda atas produk ini, dan perangkat yang terdaftar untuk pelajaran luring. Laporan untuk pengajar dan staf dihitung dari peristiwa yang sama.',
    'export.outHeading': 'Apa yang tidak ada di dalamnya, dan mengapa',
    'export.outOthers': 'Kata-kata orang lain',
    'export.outOthersNote':
      'Balasan di bawah kiriman Anda, pesan teman sekelas, catatan pengajar tentang peserta didik lain: itu data mereka, bukan data Anda, meskipun menyangkut Anda.',
    'export.outSignIn': 'Alamat masuk dan kata sandi Anda',
    'export.outSignInNote':
      'Keduanya disimpan oleh penyedia layanan masuk, di luar basis data ini.',
    'export.outStaff': 'Catatan internal staf',
    'export.outStaffNote':
      'Cara tim berbicara di antara mereka sendiri tentang suatu kasus bantuan atau tinjauan. Menerbitkan catatan itu akan membuatnya tidak berguna, dan catatan itu bukan catatan tentang Anda.',
    'export.outFiles': 'Berkas unggahan itu sendiri',
    'export.outFilesNote':
      'Lampiran dicantumkan sebagai rujukan. Menyalin setiap video tersimpan ke dalam satu dokumen adalah fitur lain, dengan batas ukurannya sendiri.',
    'export.outTokens': 'Token kredensial',
    'export.outTokensNote':
      'Token verifikasi sertifikat dan tautan berbagi adalah hal yang memberi jalan masuk kepada orang lain. Mencetaknya dalam salinan adalah cara token itu berhenti menjadi rahasia.',
    'export.outBoards': 'Kiriman Anda di diskusi siswa dan diskusi guru',
    'export.outBoardsNote':
      'Di sana Anda menulis dengan nama pengguna, agar kiriman tidak membawa nama Anda. Salinan yang menaruh kiriman itu di samping nama Anda akan membatalkan hal itu. Kiriman tetap ada di diskusi; di sana Anda dapat membacanya dan menarik kembali yang mana pun. Pertanyaan dan jawaban yang Anda tulis dalam kursus adalah hal lain: semuanya ada dalam salinan.',
    'export.after':
      'Mengunduh adalah satu arah dan memulihkan adalah arah sebaliknya: sebagian salinan dapat dikembalikan ke akun ini atau ke akun baru. Menutup akun adalah hal terpisah dan tidak dapat dibatalkan; apa yang terjadi pada tiap jenis catatan tertulis di halaman itu.',
    'export.printCrumb': 'Untuk dicetak',
    'export.printTitle': 'Salinan data Anda',
    'export.printLede':
      'Cetak halaman ini, atau gunakan dialog cetak peramban Anda untuk menyimpannya sebagai PDF. Peramban Anda sendiri yang membuat PDF itu.',
    'export.printCounts':
      'Membuka halaman ini membuat satu salinan: dihitung sebagai satu dari sepuluh per jam dan dicatat seperti unduhan. Memuat ulang halaman membuat satu lagi.',
    'export.printMade': 'Dibuat: {when}',
    'export.printCut': 'Daftar berikut lebih panjang dari batas dan dipotong: {lists}',
    'export.printSheet': 'Unduh sebagai lembar kerja',
    'export.printJson': 'Unduh sebagai JSON',
    'export.printEmpty': 'Belum ada yang tercatat untuk akun ini.',
    'export.printSame':
      'Ini catatan yang sama dengan isi kedua unduhan. Apa yang sengaja tidak disertakan, dan alasannya, ada di halaman ekspor.',
    'export.printBack': 'Kembali ke halaman ekspor',
  },
  ms: {
    'export.crumb': 'Eksport',
    'export.title': 'Dapatkan salinan data anda',
    'export.lede':
      'Satu salinan daripada apa yang disimpan oleh platform ini tentang anda, dengan pengecualian yang disenaraikan di bawah: akaun anda, kursus yang anda sertai, apa yang anda tulis, apa yang telah dinilai, apa yang anda beli, dan mesej yang dihantar kepada anda.',
    'export.how':
      'Setiap salinan dibuat apabila anda memintanya, jadi kandungannya terkini pada saat itu. Anda boleh membuat sepuluh salinan sejam; had ini melindungi platform dan tidak bertujuan menyekat anda.',
    'export.cap':
      'Senarai yang lebih panjang daripada {count} baris dipotong pada bilangan itu, dan salinan menamakan setiap senarai yang dipotong.',
    'export.json': 'Muat turun salinan (JSON)',
    'export.jsonNote':
      'Seluruh salinan sebagai satu fail JSON: setiap medan, termasuk yang tidak dipaparkan pada mana-mana skrin. Boleh dibuka dalam mana-mana penyunting teks. Untuk pembangun, atau untuk menyimpan salinan yang boleh anda semak kemudian.',
    'export.sheet': 'Muat turun salinan (hamparan)',
    'export.sheetNote':
      'Hamparan dengan satu bahagian bagi setiap bahagian akaun anda dan satu baris kosong di antara bahagian. Boleh dibuka dalam Excel, Numbers, LibreOffice atau Google Sheets.',
    'export.read': 'Baca di sini, atau simpan sebagai PDF',
    'export.readNote':
      'Halaman yang boleh anda baca dalam pelayar dan cetak, atau simpan sebagai PDF daripada dialog cetak anda sendiri. Pelayar anda sendiri yang membuat PDF itu. Membuka halaman ini dikira sebagai satu daripada sepuluh salinan anda.',
    'export.english':
      'Nama bahagian dan medan di dalam salinan adalah dalam bahasa Inggeris, kerana dengan nama itulah rekod disimpan.',
    'export.audit':
      'Setiap salinan direkodkan dalam jejak audit, bersama tarikh dan bilangan baris setiap bahagian. Rekod itulah yang menjadikan salinan data seseorang yang tidak dijangka boleh dikesan.',
    'export.preparing': 'Membuat salinan anda…',
    'export.done': 'Salinan anda telah dibuat dan diserahkan kepada pelayar anda untuk disimpan.',
    'export.limit':
      'Sepuluh salinan telah dibuat dalam sejam yang lalu, dan itulah hadnya. Tunggu sebentar, kemudian minta lagi.',
    'export.failed': 'Salinan tidak dapat dibuat sekarang. Minta lagi sebentar lagi.',
    'export.signedOut': 'Anda telah log keluar. Log masuk semula untuk mendapatkan salinan.',
    'export.inHeading': 'Apa yang ada di dalamnya',
    'export.inAccount': 'Akaun anda',
    'export.inAccountNote':
      'Nama paparan, bahasa, zon waktu, negara, status, dan peranan yang anda pegang (guru, penyemak, kakitangan), jika ada.',
    'export.inLearners': 'Profil pelajar',
    'export.inLearnersNote':
      'Profil anda sendiri, dan profil pelajar yang anda kini penjaga yang disahkan dengan kebenaran melihat kemajuan. Pendaftaran, kemajuan, percubaan dan sijil mereka turut disertakan.',
    'export.inWrote': 'Apa yang anda tulis',
    'export.inWroteNote':
      'Nota pelajaran, penanda buku, kursus yang disimpan dan nota peribadi yang anda letakkan di sebelahnya, ulasan, kiriman perbincangan, serahan tugasan dan jawapan kuiz.',
    'export.inGuardians': 'Siapa di bawah tanggungjawab anda, dan siapa yang boleh melihat anda',
    'export.inGuardiansNote':
      'Setiap kanak-kanak yang anda menjadi penjaganya, apa yang anda dibenarkan lihat dan urus, dan bila hal itu disahkan; dan sebaliknya, sesiapa yang telah disahkan oleh platform sebagai penjaga anda.',
    'export.inInvited': 'Orang yang anda jemput',
    'export.inInvitedNote':
      'Alamat yang anda hantar perkongsian kepadanya, apa yang anda kongsi, dan sama ada ia diterima. Bukan pautan itu sendiri: pautan itulah yang membenarkan pemegangnya masuk.',
    'export.inMoney': 'Wang',
    'export.inMoneyNote':
      'Pesanan pada mana-mana akaun yang anda sertai, apa yang dibeli, dan, jika anda mengajar, pendapatan dan bayaran kepada anda. Jumlah dipaparkan tepat seperti yang direkodkan, dalam mata wangnya sendiri.',
    'export.inSupport': 'Sokongan dan mesej',
    'export.inSupportNote':
      'Kes yang anda buka, balasan yang memang sudah boleh anda lihat, setiap pemberitahuan yang dihantar kepada anda, dan e-mel yang telah dihantar atau dibariskan oleh platform bagi pihak anda, dengan setiap pautan jemputan dipadamkan.',
    'export.inActivity': 'Aktiviti dan peranti',
    'export.inActivityNote':
      'Peristiwa yang direkodkan tentang penggunaan anda terhadap produk ini, dan peranti yang didaftarkan untuk pelajaran luar talian. Laporan untuk guru dan kakitangan dikira daripada peristiwa yang sama.',
    'export.outHeading': 'Apa yang tiada di dalamnya, dan mengapa',
    'export.outOthers': 'Kata-kata orang lain',
    'export.outOthersNote':
      'Balasan di bawah kiriman anda, mesej rakan sekelas, nota guru tentang pelajar lain: itu data mereka, bukan data anda, walaupun ia berkaitan dengan anda.',
    'export.outSignIn': 'Alamat log masuk dan kata laluan anda',
    'export.outSignInNote':
      'Kedua-duanya disimpan oleh penyedia log masuk, di luar pangkalan data ini.',
    'export.outStaff': 'Nota dalaman kakitangan',
    'export.outStaffNote':
      'Cara pasukan berbincang sesama sendiri tentang sesuatu kes sokongan atau semakan. Menerbitkan nota itu akan menjadikannya tidak berguna, dan nota itu bukan rekod tentang anda.',
    'export.outFiles': 'Fail yang dimuat naik itu sendiri',
    'export.outFilesNote':
      'Lampiran disenaraikan sebagai rujukan. Menyalin setiap video yang disimpan ke dalam satu dokumen ialah ciri lain, dengan had saiznya sendiri.',
    'export.outTokens': 'Token kelayakan',
    'export.outTokensNote':
      'Token pengesahan sijil dan pautan perkongsian ialah perkara yang membenarkan orang lain masuk. Mencetaknya dalam salinan ialah cara token itu berhenti menjadi rahsia.',
    'export.outBoards': 'Kiriman anda dalam perbincangan pelajar dan perbincangan guru',
    'export.outBoardsNote':
      'Di sana anda menulis dengan nama pengguna, supaya kiriman tidak membawa nama anda. Salinan yang meletakkan kiriman itu di sebelah nama anda akan membatalkan perkara itu. Kiriman kekal dalam perbincangan; di sana anda boleh membacanya dan menarik balik mana-mana satu. Soalan dan jawapan yang anda tulis dalam kursus ialah perkara lain: semuanya ada dalam salinan.',
    'export.after':
      'Memuat turun ialah satu arah dan memulihkan ialah arah sebaliknya: sebahagian salinan boleh dikembalikan ke akaun ini atau ke akaun baharu. Menutup akaun anda ialah perkara berasingan dan tidak boleh dibatalkan; apa yang berlaku kepada setiap jenis rekod tertulis pada halaman itu.',
    'export.printCrumb': 'Untuk dicetak',
    'export.printTitle': 'Salinan data anda',
    'export.printLede':
      'Cetak halaman ini, atau gunakan dialog cetak pelayar anda untuk menyimpannya sebagai PDF. Pelayar anda sendiri yang membuat PDF itu.',
    'export.printCounts':
      'Membuka halaman ini telah membuat satu salinan: ia dikira sebagai satu daripada sepuluh sejam dan direkodkan seperti muat turun. Memuat semula halaman membuat satu lagi.',
    'export.printMade': 'Dibuat: {when}',
    'export.printCut': 'Senarai berikut lebih panjang daripada had dan dipotong: {lists}',
    'export.printSheet': 'Muat turun sebagai hamparan',
    'export.printJson': 'Muat turun sebagai JSON',
    'export.printEmpty': 'Belum ada apa-apa yang direkodkan untuk akaun ini.',
    'export.printSame':
      'Ini rekod yang sama dengan kandungan kedua-dua muat turun. Apa yang sengaja ditinggalkan, dan sebabnya, ada pada halaman eksport.',
    'export.printBack': 'Kembali ke halaman eksport',
  },
  bn: {
    'export.crumb': 'এক্সপোর্ট',
    'export.title': 'আপনার তথ্যের একটি কপি নিন',
    'export.lede':
      'এই প্ল্যাটফর্ম আপনার সম্পর্কে যা রাখে তার একটি কপি, নিচে উল্লেখ করা ব্যতিক্রমগুলো বাদে: আপনার অ্যাকাউন্ট, যেসব কোর্সে আপনি ভর্তি আছেন, আপনি যা লিখেছেন, যেসবে আপনাকে নম্বর দেওয়া হয়েছে, আপনি যা কিনেছেন, এবং আপনাকে পাঠানো বার্তা।',
    'export.how':
      'প্রতিটি কপি আপনি চাওয়ার সময় তৈরি হয়, তাই সেই মুহূর্ত পর্যন্ত তা হালনাগাদ। আপনি ঘণ্টায় দশটি কপি তৈরি করতে পারেন; এই সীমা প্ল্যাটফর্মকে রক্ষা করে, আপনাকে আটকানোর জন্য নয়।',
    'export.cap':
      'কোনো তালিকা {count} সারির চেয়ে লম্বা হলে সেই সংখ্যায় কেটে দেওয়া হয়, এবং কপিতে কেটে দেওয়া প্রতিটি তালিকার নাম থাকে।',
    'export.json': 'কপি ডাউনলোড করুন (JSON)',
    'export.jsonNote':
      'পুরো কপি একটি JSON ফাইলে: প্রতিটি ঘর, যেগুলো কোনো স্ক্রিনে দেখানো হয় না সেগুলোও। যেকোনো টেক্সট এডিটরে খোলে। ডেভেলপারের জন্য, অথবা এমন একটি কপি রাখার জন্য যা আপনি পরে মিলিয়ে দেখতে পারেন।',
    'export.sheet': 'কপি ডাউনলোড করুন (স্প্রেডশিট)',
    'export.sheetNote':
      'একটি স্প্রেডশিট, যাতে আপনার অ্যাকাউন্টের প্রতিটি অংশের জন্য একটি বিভাগ এবং বিভাগগুলোর মাঝে একটি ফাঁকা সারি থাকে। Excel, Numbers, LibreOffice বা Google Sheets-এ খোলে।',
    'export.read': 'এখানেই পড়ুন, অথবা PDF হিসেবে সংরক্ষণ করুন',
    'export.readNote':
      'একটি পাতা যা আপনি ব্রাউজারে পড়তে ও প্রিন্ট করতে পারেন, অথবা নিজের প্রিন্ট ডায়ালগ থেকে PDF হিসেবে সংরক্ষণ করতে পারেন। PDF আপনার ব্রাউজার নিজেই তৈরি করে। পাতাটি খোলা আপনার দশটি কপির একটি হিসেবে গণ্য হয়।',
    'export.english': 'কপির ভেতরের বিভাগ ও ঘরের নাম ইংরেজিতে, কারণ রেকর্ডগুলো ওই নামেই সংরক্ষিত।',
    'export.audit':
      'প্রতিটি কপি অডিট লগে নথিভুক্ত হয়, তারিখ এবং প্রতিটি বিভাগে কতগুলো সারি ছিল তা সহ। এই নথিই কারও তথ্যের অপ্রত্যাশিত কপিকে খুঁজে বের করার উপায় দেয়।',
    'export.preparing': 'আপনার কপি তৈরি হচ্ছে…',
    'export.done': 'আপনার কপি তৈরি হয়েছে এবং সংরক্ষণের জন্য আপনার ব্রাউজারকে দেওয়া হয়েছে।',
    'export.limit':
      'গত এক ঘণ্টায় দশটি কপি তৈরি হয়েছে, আর এটাই সীমা। একটু অপেক্ষা করুন, তারপর আবার চান।',
    'export.failed': 'এই মুহূর্তে কপিটি তৈরি করা যায়নি। একটু পরে আবার চান।',
    'export.signedOut': 'আপনি সাইন আউট অবস্থায় আছেন। কপি পেতে আবার সাইন ইন করুন।',
    'export.inHeading': 'এতে কী আছে',
    'export.inAccount': 'আপনার অ্যাকাউন্ট',
    'export.inAccountNote':
      'প্রদর্শিত নাম, ভাষা, সময় অঞ্চল, দেশ, অবস্থা, এবং আপনার ভূমিকা (শিক্ষক, পর্যালোচক, কর্মী), যদি থাকে।',
    'export.inLearners': 'শিক্ষার্থী প্রোফাইল',
    'export.inLearnersNote':
      'আপনার নিজের, এবং সেই শিক্ষার্থীদের যাদের আপনি বর্তমানে যাচাই করা অভিভাবক এবং অগ্রগতি দেখার অনুমতি রাখেন। তাদের ভর্তি, অগ্রগতি, প্রচেষ্টা ও সনদ এর সঙ্গে আসে।',
    'export.inWrote': 'আপনি যা লিখেছেন',
    'export.inWroteNote':
      'পাঠের নোট, বুকমার্ক, সংরক্ষিত কোর্স এবং তার পাশে রাখা আপনার ব্যক্তিগত নোট, পর্যালোচনা, আলোচনার পোস্ট, জমা দেওয়া অ্যাসাইনমেন্ট এবং কুইজের উত্তর।',
    'export.inGuardians': 'আপনি কার দায়িত্বে আছেন, এবং কে আপনাকে দেখতে পারে',
    'export.inGuardiansNote':
      'যেসব শিশুর আপনি অভিভাবক, আপনি কী দেখতে ও পরিচালনা করতে পারেন, এবং তা কখন যাচাই হয়েছে; আর উল্টো দিকে, প্ল্যাটফর্ম যাদের আপনার অভিভাবক হিসেবে যাচাই করেছে।',
    'export.inInvited': 'যাদের আপনি আমন্ত্রণ জানিয়েছেন',
    'export.inInvitedNote':
      'যে ঠিকানায় আপনি শেয়ার পাঠিয়েছেন, কী শেয়ার করেছেন, এবং তা গৃহীত হয়েছে কি না। লিংকটি নিজে নয়: লিংকই তার ধারককে ভেতরে ঢুকতে দেয়।',
    'export.inMoney': 'অর্থ',
    'export.inMoneyNote':
      'আপনি যে অ্যাকাউন্টগুলোর সদস্য সেগুলোর অর্ডার, কী কেনা হয়েছে, এবং আপনি পড়ালে আপনার আয় ও পাওনা পরিশোধ। অঙ্কগুলো ঠিক যেমন নথিভুক্ত আছে তেমনই দেখায়, নিজ নিজ মুদ্রায়।',
    'export.inSupport': 'সহায়তা ও বার্তা',
    'export.inSupportNote':
      'আপনার খোলা কেস, যে উত্তরগুলো আপনি এমনিতেই দেখতে পান, আপনাকে পাঠানো প্রতিটি বিজ্ঞপ্তি, এবং প্ল্যাটফর্ম আপনার পক্ষে যে ইমেইল পাঠিয়েছে বা সারিতে রেখেছে, প্রতিটি আমন্ত্রণ লিংক মুছে দিয়ে।',
    'export.inActivity': 'কার্যকলাপ ও ডিভাইস',
    'export.inActivityNote':
      'পণ্যটি আপনার ব্যবহার সম্পর্কে নথিভুক্ত ঘটনা, এবং অফলাইন পাঠের জন্য নিবন্ধিত ডিভাইস। শিক্ষক ও কর্মীদের প্রতিবেদন এই একই ঘটনা থেকে গোনা হয়।',
    'export.outHeading': 'এতে কী নেই, এবং কেন',
    'export.outOthers': 'অন্যদের কথা',
    'export.outOthersNote':
      'আপনার পোস্টের নিচে কোনো উত্তর, সহপাঠীর বার্তা, অন্য শিক্ষার্থী সম্পর্কে শিক্ষকের নোট: এগুলো তাদের তথ্য, আপনার নয়, তা আপনার সঙ্গে সম্পর্কিত হলেও।',
    'export.outSignIn': 'আপনার সাইন-ইন ঠিকানা ও পাসওয়ার্ড',
    'export.outSignInNote': 'দুটোই সাইন-ইন সেবাদাতার কাছে থাকে, এই ডেটাবেসের বাইরে।',
    'export.outStaff': 'কর্মীদের অভ্যন্তরীণ নোট',
    'export.outStaffNote':
      'কোনো সহায়তা কেস বা পর্যালোচনা নিয়ে দল নিজেদের মধ্যে যেভাবে কথা বলে। সেই নোট প্রকাশ করলে তা অকেজো হয়ে যাবে, আর এগুলো আপনার সম্পর্কে কোনো রেকর্ড নয়।',
    'export.outFiles': 'আপলোড করা ফাইলগুলো নিজে',
    'export.outFilesNote':
      'সংযুক্তিগুলো সূত্র হিসেবে তালিকাভুক্ত থাকে। সংরক্ষিত প্রতিটি ভিডিও এক নথিতে কপি করা একটি আলাদা সুবিধা, যার নিজস্ব আকারের সীমা আছে।',
    'export.outTokens': 'পরিচয়পত্রের টোকেন',
    'export.outTokensNote':
      'সনদ যাচাইয়ের টোকেন ও শেয়ারিং লিংকই অন্যদের ভেতরে ঢুকতে দেয়। এগুলো কপিতে ছাপালে সেগুলো আর গোপন থাকে না।',
    'export.outBoards': 'শিক্ষার্থীদের ও শিক্ষকদের আলোচনায় আপনার পোস্ট',
    'export.outBoardsNote':
      'সেখানে আপনি ব্যবহারকারী-নামে লেখেন, যাতে পোস্টে আপনার নাম না থাকে। যে কপি ওই পোস্টগুলো আপনার নামের পাশে রাখে, তা এই আড়ালটুকু নষ্ট করে দেয়। পোস্টগুলো আলোচনাতেই থাকে; সেখানে আপনি সেগুলো পড়তে পারেন এবং যেকোনোটি ফিরিয়ে নিতে পারেন। কোনো কোর্সে আপনার লেখা প্রশ্ন ও উত্তর আলাদা বিষয়: সেগুলো কপিতে আছে।',
    'export.after':
      'ডাউনলোড এক দিক আর পুনরুদ্ধার অন্য দিক: কপির একটি অংশ এই অ্যাকাউন্টে বা নতুন অ্যাকাউন্টে ফিরিয়ে রাখা যায়। অ্যাকাউন্ট বন্ধ করা আলাদা বিষয় এবং তা ফেরানো যায় না; প্রতিটি ধরনের রেকর্ডের কী হয় তা ওই পাতায় লেখা আছে।',
    'export.printCrumb': 'প্রিন্টের জন্য',
    'export.printTitle': 'আপনার তথ্যের একটি কপি',
    'export.printLede':
      'এই পাতাটি প্রিন্ট করুন, অথবা আপনার ব্রাউজারের প্রিন্ট ডায়ালগ ব্যবহার করে PDF হিসেবে সংরক্ষণ করুন। PDF আপনার ব্রাউজার নিজেই তৈরি করে।',
    'export.printCounts':
      'এই পাতা খোলায় একটি কপি তৈরি হয়েছে: এটি ঘণ্টায় দশটির একটি হিসেবে গণ্য হয় এবং ডাউনলোডের মতোই নথিভুক্ত হয়। পাতাটি আবার লোড করলে আরেকটি তৈরি হয়।',
    'export.printMade': 'তৈরির সময়: {when}',
    'export.printCut': 'এই তালিকাগুলো সীমার চেয়ে লম্বা ছিল এবং কেটে দেওয়া হয়েছে: {lists}',
    'export.printSheet': 'স্প্রেডশিট হিসেবে ডাউনলোড করুন',
    'export.printJson': 'JSON হিসেবে ডাউনলোড করুন',
    'export.printEmpty': 'এই অ্যাকাউন্টে এখনো কিছু নথিভুক্ত নেই।',
    'export.printSame':
      'দুটি ডাউনলোডে যে রেকর্ড থাকে এটি সেই একই রেকর্ড। ইচ্ছা করে কী বাদ রাখা হয়েছে, এবং কেন, তা এক্সপোর্ট পাতায় আছে।',
    'export.printBack': 'এক্সপোর্ট পাতায় ফিরে যান',
  },
  hi: {
    'export.crumb': 'निर्यात',
    'export.title': 'अपने डेटा की एक प्रति पाएँ',
    'export.lede':
      'यह प्लेटफ़ॉर्म आपके बारे में जो कुछ रखता है उसकी एक प्रति, नीचे बताए गए अपवादों के साथ: आपका खाता, वे कोर्स जिनमें आप नामांकित हैं, आपने जो लिखा, जिस पर आपको अंक मिले, आपने जो ख़रीदा, और आपको भेजे गए संदेश।',
    'export.how':
      'हर प्रति तभी बनती है जब आप माँगते हैं, इसलिए वह उस क्षण तक ताज़ा होती है। आप एक घंटे में दस प्रतियाँ बना सकते हैं; यह सीमा प्लेटफ़ॉर्म की रक्षा के लिए है, आपको रोकने के लिए नहीं।',
    'export.cap':
      'जो सूची {count} पंक्तियों से लंबी हो उसे उसी संख्या पर काट दिया जाता है, और प्रति में हर काटी गई सूची का नाम दिया जाता है।',
    'export.json': 'प्रति डाउनलोड करें (JSON)',
    'export.jsonNote':
      'पूरी प्रति एक JSON फ़ाइल में: हर फ़ील्ड, वे भी जो किसी स्क्रीन पर नहीं दिखते। यह किसी भी टेक्स्ट एडिटर में खुलती है। डेवलपर के लिए, या ऐसी प्रति रखने के लिए जिसे आप बाद में जाँच सकें।',
    'export.sheet': 'प्रति डाउनलोड करें (स्प्रेडशीट)',
    'export.sheetNote':
      'एक स्प्रेडशीट जिसमें आपके खाते के हर हिस्से के लिए एक खंड और खंडों के बीच एक ख़ाली पंक्ति है। यह Excel, Numbers, LibreOffice या Google Sheets में खुलती है।',
    'export.read': 'यहीं पढ़ें, या PDF के रूप में सहेजें',
    'export.readNote':
      'एक पेज जिसे आप ब्राउज़र में पढ़ और प्रिंट कर सकते हैं, या अपने प्रिंट डायलॉग से PDF के रूप में सहेज सकते हैं। PDF आपका ब्राउज़र ख़ुद बनाता है। पेज खोलना आपकी दस प्रतियों में से एक गिना जाता है।',
    'export.english':
      'प्रति के भीतर खंडों और फ़ील्डों के नाम अंग्रेज़ी में हैं, क्योंकि रिकॉर्ड इन्हीं नामों से सहेजे गए हैं।',
    'export.audit':
      'हर प्रति ऑडिट रिकॉर्ड में दर्ज होती है, तारीख़ और हर खंड की पंक्तियों की संख्या के साथ। यही रिकॉर्ड किसी के डेटा की अनपेक्षित प्रति का पता लगाना संभव बनाता है।',
    'export.preparing': 'आपकी प्रति बन रही है…',
    'export.done': 'आपकी प्रति बन गई और सहेजने के लिए आपके ब्राउज़र को सौंप दी गई।',
    'export.limit':
      'पिछले एक घंटे में दस प्रतियाँ बन चुकी हैं, और यही सीमा है। थोड़ा रुकें, फिर दोबारा माँगें।',
    'export.failed': 'प्रति अभी नहीं बन सकी। थोड़ी देर में दोबारा माँगें।',
    'export.signedOut': 'आप साइन आउट हैं। प्रति पाने के लिए दोबारा साइन इन करें।',
    'export.inHeading': 'इसमें क्या है',
    'export.inAccount': 'आपका खाता',
    'export.inAccountNote':
      'प्रदर्शित नाम, भाषा, समय क्षेत्र, देश, स्थिति, और आपकी भूमिकाएँ (शिक्षक, समीक्षक, स्टाफ़), यदि कोई हों।',
    'export.inLearners': 'शिक्षार्थी प्रोफ़ाइल',
    'export.inLearnersNote':
      'आपकी अपनी, और उन शिक्षार्थियों की जिनके आप इस समय सत्यापित अभिभावक हैं और प्रगति देखने की अनुमति रखते हैं। उनके नामांकन, प्रगति, प्रयास और प्रमाणपत्र साथ आते हैं।',
    'export.inWrote': 'आपने जो लिखा',
    'export.inWroteNote':
      'पाठ के नोट्स, बुकमार्क, सहेजे गए कोर्स और वह निजी नोट जो आपने किसी के साथ रखा, समीक्षाएँ, चर्चा की पोस्ट, जमा किए गए असाइनमेंट और क्विज़ के उत्तर।',
    'export.inGuardians': 'आप किनके ज़िम्मेदार हैं, और कौन आपको देख सकता है',
    'export.inGuardiansNote':
      'हर वह बच्चा जिसके आप अभिभावक हैं, आपको क्या देखने और सँभालने की अनुमति है, और यह कब सत्यापित हुआ; और दूसरी ओर, वह हर व्यक्ति जिसे प्लेटफ़ॉर्म ने आपका अभिभावक सत्यापित किया है।',
    'export.inInvited': 'जिन्हें आपने आमंत्रित किया',
    'export.inInvitedNote':
      'वह पता जिस पर आपने साझाकरण भेजा, आपने क्या साझा किया, और वह स्वीकार हुआ या नहीं। ख़ुद लिंक नहीं: लिंक ही वह चीज़ है जो अपने धारक को भीतर आने देती है।',
    'export.inMoney': 'पैसा',
    'export.inMoneyNote':
      'हर उस खाते के ऑर्डर जिससे आप जुड़े हैं, क्या ख़रीदा गया, और यदि आप पढ़ाते हैं तो आपकी कमाई और भुगतान। रकमें ठीक वैसी ही दिखती हैं जैसी दर्ज हैं, अपनी मुद्रा में।',
    'export.inSupport': 'सहायता और संदेश',
    'export.inSupportNote':
      'आपके खोले हुए मामले, वे उत्तर जो आप पहले से देख सकते हैं, आपको भेजी गई हर सूचना, और वह ईमेल जो प्लेटफ़ॉर्म ने आपकी ओर से भेजा या कतार में रखा, जिसमें हर आमंत्रण लिंक मिटा दिया गया है।',
    'export.inActivity': 'गतिविधि और डिवाइस',
    'export.inActivityNote':
      'उत्पाद के आपके उपयोग के बारे में दर्ज घटनाएँ, और ऑफ़लाइन पाठों के लिए पंजीकृत डिवाइस। शिक्षकों और स्टाफ़ की रिपोर्टें इन्हीं घटनाओं से गिनी जाती हैं।',
    'export.outHeading': 'इसमें क्या नहीं है, और क्यों',
    'export.outOthers': 'दूसरों के शब्द',
    'export.outOthersNote':
      'आपकी पोस्ट के नीचे कोई उत्तर, सहपाठी का संदेश, किसी दूसरे शिक्षार्थी के बारे में शिक्षक का नोट: यह उनका डेटा है, आपका नहीं, भले ही वह आपसे जुड़ा हो।',
    'export.outSignIn': 'आपका साइन-इन पता और पासवर्ड',
    'export.outSignInNote': 'दोनों साइन-इन प्रदाता के पास हैं, इस डेटाबेस से बाहर।',
    'export.outStaff': 'स्टाफ़ के आंतरिक नोट्स',
    'export.outStaffNote':
      'किसी सहायता मामले या समीक्षा के बारे में टीम की आपसी बातचीत। इन नोट्स को प्रकाशित करना उन्हें बेकार कर देगा, और ये आपके बारे में कोई रिकॉर्ड नहीं हैं।',
    'export.outFiles': 'अपलोड की गई फ़ाइलें स्वयं',
    'export.outFilesNote':
      'अटैचमेंट केवल संदर्भ के रूप में सूचीबद्ध हैं। हर सहेजे गए वीडियो को एक दस्तावेज़ में कॉपी करना एक अलग सुविधा है, जिसकी अपनी आकार सीमाएँ हैं।',
    'export.outTokens': 'क्रेडेंशियल टोकन',
    'export.outTokensNote':
      'प्रमाणपत्र सत्यापन टोकन और साझाकरण लिंक ही वे चीज़ें हैं जो दूसरों को भीतर आने देती हैं। उन्हें प्रति में छाप देने से वे गोपनीय नहीं रहते।',
    'export.outBoards': 'विद्यार्थियों और शिक्षकों की चर्चा में आपकी पोस्ट',
    'export.outBoardsNote':
      'वहाँ आप उपयोगकर्ता नाम से लिखते हैं, ताकि पोस्ट पर आपका नाम न हो। जो प्रति उन पोस्ट को आपके नाम के साथ रख दे, वह यह बात ख़त्म कर देती है। वे चर्चा में ही रहती हैं; वहाँ आप उन्हें पढ़ सकते हैं और कोई भी वापस ले सकते हैं। किसी कोर्स में आपके लिखे सवाल और जवाब अलग चीज़ हैं: वे प्रति में हैं।',
    'export.after':
      'डाउनलोड एक दिशा है और पुनर्स्थापना दूसरी: प्रति का कुछ हिस्सा इस खाते पर या किसी नए खाते पर वापस रखा जा सकता है। खाता बंद करना अलग बात है और उसे वापस नहीं लिया जा सकता; हर तरह के रिकॉर्ड के साथ क्या होता है, वह उस पेज पर लिखा है।',
    'export.printCrumb': 'प्रिंट के लिए',
    'export.printTitle': 'आपके डेटा की एक प्रति',
    'export.printLede':
      'यह पेज प्रिंट करें, या अपने ब्राउज़र के प्रिंट डायलॉग से इसे PDF के रूप में सहेजें। PDF आपका ब्राउज़र ख़ुद बनाता है।',
    'export.printCounts':
      'यह पेज खोलने से एक प्रति बनी: यह एक घंटे की दस में से एक गिनी जाती है और डाउनलोड की तरह दर्ज होती है। पेज दोबारा लोड करने से एक और बनती है।',
    'export.printMade': 'बनाई गई: {when}',
    'export.printCut': 'ये सूचियाँ सीमा से लंबी थीं और काट दी गईं: {lists}',
    'export.printSheet': 'स्प्रेडशीट के रूप में डाउनलोड करें',
    'export.printJson': 'JSON के रूप में डाउनलोड करें',
    'export.printEmpty': 'इस खाते पर अभी कुछ दर्ज नहीं है।',
    'export.printSame':
      'यह वही रिकॉर्ड है जो दोनों डाउनलोड में है। जो जान-बूझकर बाहर रखा गया है, और क्यों, वह निर्यात पेज पर है।',
    'export.printBack': 'निर्यात पेज पर वापस जाएँ',
  },
  fr: {
    'export.crumb': 'Exportation',
    'export.title': 'Obtenir une copie de vos données',
    'export.lede':
      'Une copie de ce que cette plateforme conserve à votre sujet, avec les exceptions indiquées ci-dessous : votre compte, les cours auxquels vous êtes inscrit, ce que vous avez écrit, ce sur quoi vous avez été noté, ce que vous avez acheté et les messages qui vous ont été envoyés.',
    'export.how':
      'Chaque copie est établie au moment où vous la demandez ; elle est donc à jour à cet instant. Vous pouvez faire dix copies par heure ; cette limite protège la plateforme et n’a pas pour but de vous restreindre.',
    'export.cap':
      'Une liste de plus de {count} lignes est coupée à ce nombre, et la copie nomme chaque liste coupée.',
    'export.json': 'Télécharger la copie (JSON)',
    'export.jsonNote':
      'Toute la copie en un seul fichier JSON : chaque champ, y compris ceux qu’aucun écran n’affiche. Il s’ouvre dans n’importe quel éditeur de texte. Pour un développeur, ou pour garder une copie que vous pourrez vérifier plus tard.',
    'export.sheet': 'Télécharger la copie (tableur)',
    'export.sheetNote':
      'Une feuille de calcul avec une section pour chaque partie de votre compte et une ligne vide entre les sections. Elle s’ouvre dans Excel, Numbers, LibreOffice ou Google Sheets.',
    'export.read': 'La lire ici, ou l’enregistrer en PDF',
    'export.readNote':
      'Une page que vous pouvez lire dans le navigateur et imprimer, ou enregistrer en PDF depuis votre propre fenêtre d’impression. C’est votre navigateur qui produit le PDF. Ouvrir la page compte pour une de vos dix copies.',
    'export.english':
      'Les noms des sections et des champs de la copie sont en anglais, car ce sont les noms sous lesquels les données sont enregistrées.',
    'export.audit':
      'Chaque copie est consignée dans le journal d’audit, avec la date et le nombre de lignes de chaque section. C’est ce journal qui permet de retracer une copie inattendue des données de quelqu’un.',
    'export.preparing': 'Préparation de votre copie…',
    'export.done':
      'Votre copie a été établie et remise à votre navigateur pour qu’il l’enregistre.',
    'export.limit':
      'Dix copies ont été faites au cours de la dernière heure, ce qui est la limite. Patientez un peu, puis redemandez.',
    'export.failed': 'La copie n’a pas pu être établie pour le moment. Redemandez dans un instant.',
    'export.signedOut': 'Vous êtes déconnecté. Reconnectez-vous pour obtenir une copie.',
    'export.inHeading': 'Ce qu’elle contient',
    'export.inAccount': 'Votre compte',
    'export.inAccountNote':
      'Nom affiché, langue, fuseau horaire, pays, état, et les rôles que vous occupez (enseignant, relecteur, personnel), le cas échéant.',
    'export.inLearners': 'Profils d’apprenants',
    'export.inLearnersNote':
      'Le vôtre, et ceux des apprenants dont vous êtes actuellement le tuteur vérifié avec l’autorisation de voir la progression. Leurs inscriptions, leur progression, leurs tentatives et leurs certificats les accompagnent.',
    'export.inWrote': 'Ce que vous avez écrit',
    'export.inWroteNote':
      'Notes de leçon, signets, cours enregistrés et la note privée que vous avez placée à côté de l’un d’eux, avis, messages de discussion, devoirs remis et réponses aux quiz.',
    'export.inGuardians': 'De qui vous êtes responsable, et qui peut vous voir',
    'export.inGuardiansNote':
      'Chaque enfant dont vous êtes le tuteur, ce que vous êtes autorisé à voir et à gérer, et la date de cette vérification ; et, dans l’autre sens, toute personne que la plateforme a vérifiée comme étant votre tuteur.',
    'export.inInvited': 'Les personnes que vous avez invitées',
    'export.inInvitedNote':
      'L’adresse à laquelle vous avez envoyé un partage, ce que vous avez partagé, et s’il a été accepté. Pas le lien lui-même : c’est le lien qui laisse entrer celui qui le détient.',
    'export.inMoney': 'Argent',
    'export.inMoneyNote':
      'Les commandes de tout compte auquel vous appartenez, ce qui a été acheté et, si vous enseignez, vos revenus et vos versements. Les montants apparaissent exactement tels qu’ils ont été enregistrés, dans leur propre devise.',
    'export.inSupport': 'Assistance et messages',
    'export.inSupportNote':
      'Les demandes que vous avez ouvertes, les réponses que vous pouvez déjà voir, chaque notification qui vous a été envoyée, et les e-mails que la plateforme a envoyés ou mis en file d’attente en votre nom, tout lien d’invitation étant effacé.',
    'export.inActivity': 'Activité et appareils',
    'export.inActivityNote':
      'Les événements enregistrés sur votre utilisation du produit, et les appareils enregistrés pour les leçons hors ligne. Les rapports destinés aux enseignants et au personnel sont comptés à partir des mêmes événements.',
    'export.outHeading': 'Ce qu’elle ne contient pas, et pourquoi',
    'export.outOthers': 'Les mots des autres',
    'export.outOthersNote':
      'Une réponse sous votre message, le message d’un camarade, la note d’un enseignant sur un autre apprenant : ce sont leurs données, pas les vôtres, même lorsqu’elles vous concernent.',
    'export.outSignIn': 'Votre adresse de connexion et votre mot de passe',
    'export.outSignInNote':
      'Tous deux sont détenus par le fournisseur de connexion, en dehors de cette base de données.',
    'export.outStaff': 'Notes internes du personnel',
    'export.outStaffNote':
      'La façon dont l’équipe se parle à elle-même d’une demande d’assistance ou d’un examen. Publier ces notes les rendrait inutiles, et elles ne constituent pas un enregistrement à votre sujet.',
    'export.outFiles': 'Les fichiers téléversés eux-mêmes',
    'export.outFilesNote':
      'Les pièces jointes sont indiquées par référence. Copier chaque vidéo stockée dans un seul document est une autre fonctionnalité, avec ses propres limites de taille.',
    'export.outTokens': 'Jetons d’accès',
    'export.outTokensNote':
      'Les jetons de vérification des certificats et les liens de partage sont ce qui laisse entrer d’autres personnes. Les imprimer dans une copie, c’est ce qui leur fait perdre leur secret.',
    'export.outBoards': 'Vos messages dans la discussion des élèves et celle des enseignants',
    'export.outBoardsNote':
      'Vous y écrivez sous un pseudonyme, pour qu’un message ne porte pas votre nom. Une copie qui placerait ces messages à côté de votre nom déferait cela. Ils restent dans la discussion, où vous pouvez les lire et en retirer un. Les questions et les réponses que vous avez écrites dans un cours sont autre chose : elles sont dans la copie.',
    'export.after':
      'Télécharger est un sens et restaurer est l’autre : une partie d’une copie peut être remise sur ce compte ou sur un nouveau. Fermer votre compte est une chose distincte et irréversible ; ce qu’il advient de chaque type d’enregistrement est écrit sur cette page.',
    'export.printCrumb': 'À imprimer',
    'export.printTitle': 'Une copie de vos données',
    'export.printLede':
      'Imprimez cette page, ou utilisez la fenêtre d’impression de votre navigateur pour l’enregistrer en PDF. C’est votre navigateur qui produit le PDF.',
    'export.printCounts':
      'L’ouverture de cette page a établi une copie : elle compte pour une des dix par heure et est consignée comme un téléchargement. Recharger la page en établit une autre.',
    'export.printMade': 'Établie le : {when}',
    'export.printCut': 'Ces listes dépassaient la limite et ont été coupées : {lists}',
    'export.printSheet': 'Télécharger en feuille de calcul',
    'export.printJson': 'Télécharger en JSON',
    'export.printEmpty': 'Rien n’est encore enregistré pour ce compte.',
    'export.printSame':
      'Il s’agit du même enregistrement que celui des deux téléchargements. Ce qui est volontairement laissé de côté, et pourquoi, figure sur la page d’exportation.',
    'export.printBack': 'Retour à la page d’exportation',
  },
  es: {
    'export.crumb': 'Exportación',
    'export.title': 'Obtenga una copia de sus datos',
    'export.lede':
      'Una copia de lo que esta plataforma conserva sobre usted, con las excepciones que se indican más abajo: su cuenta, los cursos en los que está inscrito, lo que ha escrito, aquello por lo que se le ha calificado, lo que ha comprado y los mensajes que se le han enviado.',
    'export.how':
      'Cada copia se elabora en el momento en que la pide, de modo que está al día en ese instante. Puede hacer diez copias por hora; ese límite protege la plataforma y no pretende restringirle.',
    'export.cap':
      'Una lista de más de {count} filas se corta en ese número, y la copia nombra cada lista cortada.',
    'export.json': 'Descargar la copia (JSON)',
    'export.jsonNote':
      'Toda la copia en un solo archivo JSON: todos los campos, incluidos los que ninguna pantalla muestra. Se abre en cualquier editor de texto. Para un desarrollador, o para guardar una copia que pueda comprobar más adelante.',
    'export.sheet': 'Descargar la copia (hoja de cálculo)',
    'export.sheetNote':
      'Una hoja de cálculo con una sección para cada parte de su cuenta y una fila en blanco entre secciones. Se abre en Excel, Numbers, LibreOffice o Google Sheets.',
    'export.read': 'Leerla aquí, o guardarla como PDF',
    'export.readNote':
      'Una página que puede leer en el navegador e imprimir, o guardar como PDF desde su propio cuadro de impresión. Es su navegador el que genera el PDF. Abrir la página cuenta como una de sus diez copias.',
    'export.english':
      'Los nombres de las secciones y de los campos de la copia están en inglés, porque con esos nombres se guardan los registros.',
    'export.audit':
      'Cada copia queda anotada en el registro de auditoría, con la fecha y el número de filas de cada sección. Ese registro es lo que permite rastrear una copia inesperada de los datos de alguien.',
    'export.preparing': 'Preparando su copia…',
    'export.done': 'Su copia se ha elaborado y se ha entregado a su navegador para que la guarde.',
    'export.limit':
      'Se han hecho diez copias en la última hora, y ese es el límite. Espere un poco y vuelva a pedirla.',
    'export.failed':
      'No se ha podido elaborar la copia en este momento. Vuelva a pedirla dentro de un momento.',
    'export.signedOut': 'Ha cerrado la sesión. Vuelva a iniciar sesión para obtener una copia.',
    'export.inHeading': 'Qué contiene',
    'export.inAccount': 'Su cuenta',
    'export.inAccountNote':
      'Nombre visible, idioma, zona horaria, país, estado y los roles que tenga (docente, revisor, personal), si los hay.',
    'export.inLearners': 'Perfiles de alumnos',
    'export.inLearnersNote':
      'El suyo, y los de los alumnos de los que usted es actualmente tutor verificado con permiso para ver el progreso. Sus inscripciones, progreso, intentos y certificados vienen con ellos.',
    'export.inWrote': 'Lo que ha escrito',
    'export.inWroteNote':
      'Notas de lecciones, marcadores, cursos guardados y la nota privada que haya puesto junto a alguno, reseñas, mensajes de debate, entregas de tareas y respuestas de cuestionarios.',
    'export.inGuardians': 'De quién es responsable, y quién puede verle',
    'export.inGuardiansNote':
      'Cada menor del que usted es tutor, lo que se le permite ver y gestionar, y cuándo se verificó; y, en el otro sentido, toda persona que la plataforma haya verificado como tutor suyo.',
    'export.inInvited': 'Personas a las que ha invitado',
    'export.inInvitedNote':
      'La dirección a la que envió algo compartido, lo que compartió y si se aceptó. No el enlace en sí: el enlace es lo que deja entrar a quien lo tiene.',
    'export.inMoney': 'Dinero',
    'export.inMoneyNote':
      'Los pedidos de cualquier cuenta a la que pertenezca, lo que se compró y, si enseña, sus ingresos y pagos. Los importes aparecen exactamente como se registraron, en su propia moneda.',
    'export.inSupport': 'Ayuda y mensajes',
    'export.inSupportNote':
      'Los casos que ha abierto, las respuestas que ya puede ver, cada notificación que se le ha enviado y los correos que la plataforma ha enviado o puesto en cola en su nombre, con todo enlace de invitación borrado.',
    'export.inActivity': 'Actividad y dispositivos',
    'export.inActivityNote':
      'Los eventos registrados sobre su uso del producto y los dispositivos registrados para lecciones sin conexión. Los informes para docentes y personal se cuentan a partir de los mismos eventos.',
    'export.outHeading': 'Qué no contiene, y por qué',
    'export.outOthers': 'Las palabras de otras personas',
    'export.outOthersNote':
      'Una respuesta bajo su mensaje, el mensaje de un compañero, la nota de un docente sobre otro alumno: son datos de ellos, no suyos, aunque le conciernan.',
    'export.outSignIn': 'Su dirección de inicio de sesión y su contraseña',
    'export.outSignInNote':
      'Ambas las guarda el proveedor de inicio de sesión, fuera de esta base de datos.',
    'export.outStaff': 'Notas internas del personal',
    'export.outStaffNote':
      'La forma en que el equipo habla consigo mismo sobre un caso de ayuda o una revisión. Publicar esas notas las volvería inútiles, y no son un registro sobre usted.',
    'export.outFiles': 'Los propios archivos subidos',
    'export.outFilesNote':
      'Los adjuntos se enumeran por referencia. Copiar cada vídeo almacenado en un solo documento es otra función, con sus propios límites de tamaño.',
    'export.outTokens': 'Tokens de credenciales',
    'export.outTokensNote':
      'Los tokens de verificación de certificados y los enlaces para compartir son lo que deja entrar a otras personas. Imprimirlos en una copia es la manera en que dejan de ser secretos.',
    'export.outBoards': 'Sus mensajes en el debate de estudiantes y en el de docentes',
    'export.outBoardsNote':
      'Allí escribe con un nombre de usuario, para que un mensaje no lleve su nombre. Una copia que pusiera esos mensajes junto a su nombre desharía eso. Se quedan en el debate, donde puede leerlos y retirar cualquiera. Las preguntas y respuestas que escribió en un curso son otra cosa: están en la copia.',
    'export.after':
      'Descargar es un sentido y restaurar es el otro: parte de una copia puede volver a ponerse en esta cuenta o en una nueva. Cerrar su cuenta es algo aparte y no se puede deshacer; lo que ocurre con cada tipo de registro está escrito en esa página.',
    'export.printCrumb': 'Para imprimir',
    'export.printTitle': 'Una copia de sus datos',
    'export.printLede':
      'Imprima esta página, o use el cuadro de impresión de su navegador para guardarla como PDF. Es su navegador el que genera el PDF.',
    'export.printCounts':
      'Al abrir esta página se ha elaborado una copia: cuenta como una de las diez por hora y queda registrada igual que una descarga. Recargar la página elabora otra.',
    'export.printMade': 'Elaborada: {when}',
    'export.printCut': 'Estas listas superaban el límite y se cortaron: {lists}',
    'export.printSheet': 'Descargar como hoja de cálculo',
    'export.printJson': 'Descargar como JSON',
    'export.printEmpty': 'Todavía no hay nada registrado para esta cuenta.',
    'export.printSame':
      'Este es el mismo registro que contienen las dos descargas. Lo que se deja fuera a propósito, y por qué, está en la página de exportación.',
    'export.printBack': 'Volver a la página de exportación',
  },
  pt: {
    'export.crumb': 'Exportação',
    'export.title': 'Obtenha uma cópia dos seus dados',
    'export.lede':
      'Uma cópia do que esta plataforma guarda sobre si, com as exceções indicadas abaixo: a sua conta, os cursos em que está inscrito, o que escreveu, aquilo em que foi avaliado, o que comprou e as mensagens que lhe foram enviadas.',
    'export.how':
      'Cada cópia é feita no momento em que a pede, por isso está atualizada nesse instante. Pode fazer dez cópias por hora; esse limite protege a plataforma e não pretende restringi-lo.',
    'export.cap':
      'Uma lista com mais de {count} linhas é cortada nesse número, e a cópia indica o nome de cada lista cortada.',
    'export.json': 'Descarregar a cópia (JSON)',
    'export.jsonNote':
      'A cópia inteira num único ficheiro JSON: todos os campos, incluindo os que nenhum ecrã mostra. Abre em qualquer editor de texto. Para um programador, ou para guardar uma cópia que possa verificar mais tarde.',
    'export.sheet': 'Descarregar a cópia (folha de cálculo)',
    'export.sheetNote':
      'Uma folha de cálculo com uma secção para cada parte da sua conta e uma linha em branco entre secções. Abre no Excel, Numbers, LibreOffice ou Google Sheets.',
    'export.read': 'Ler aqui, ou guardar como PDF',
    'export.readNote':
      'Uma página que pode ler no navegador e imprimir, ou guardar como PDF a partir da sua própria janela de impressão. É o seu navegador que produz o PDF. Abrir a página conta como uma das suas dez cópias.',
    'export.english':
      'Os nomes das secções e dos campos dentro da cópia estão em inglês, porque é com esses nomes que os registos estão guardados.',
    'export.audit':
      'Cada cópia fica anotada no registo de auditoria, com a data e o número de linhas de cada secção. É esse registo que torna rastreável uma cópia inesperada dos dados de alguém.',
    'export.preparing': 'A preparar a sua cópia…',
    'export.done': 'A sua cópia foi feita e entregue ao seu navegador para a guardar.',
    'export.limit':
      'Foram feitas dez cópias na última hora, e esse é o limite. Aguarde um pouco e volte a pedir.',
    'export.failed': 'Não foi possível fazer a cópia neste momento. Volte a pedir daqui a pouco.',
    'export.signedOut': 'Terminou a sessão. Inicie sessão novamente para obter uma cópia.',
    'export.inHeading': 'O que contém',
    'export.inAccount': 'A sua conta',
    'export.inAccountNote':
      'Nome apresentado, idioma, fuso horário, país, estado e as funções que tenha (professor, revisor, pessoal), se houver.',
    'export.inLearners': 'Perfis de alunos',
    'export.inLearnersNote':
      'O seu, e os dos alunos de quem é atualmente encarregado verificado com permissão para ver o progresso. As inscrições, o progresso, as tentativas e os certificados deles vêm juntos.',
    'export.inWrote': 'O que escreveu',
    'export.inWroteNote':
      'Notas de lições, marcadores, cursos guardados e a nota privada que pôs junto de algum, avaliações, mensagens de discussão, trabalhos entregues e respostas de questionários.',
    'export.inGuardians': 'Por quem é responsável, e quem o pode ver',
    'export.inGuardiansNote':
      'Cada criança de quem é encarregado, o que lhe é permitido ver e gerir, e quando isso foi verificado; e, no outro sentido, qualquer pessoa que a plataforma tenha verificado como seu encarregado.',
    'export.inInvited': 'Pessoas que convidou',
    'export.inInvitedNote':
      'O endereço para onde enviou uma partilha, o que partilhou e se foi aceite. Não a própria ligação: a ligação é aquilo que deixa entrar quem a tem.',
    'export.inMoney': 'Dinheiro',
    'export.inMoneyNote':
      'As encomendas de qualquer conta a que pertença, o que foi comprado e, se ensina, os seus ganhos e pagamentos. Os valores aparecem exatamente como foram registados, na sua própria moeda.',
    'export.inSupport': 'Apoio e mensagens',
    'export.inSupportNote':
      'Os casos que abriu, as respostas que já pode ver, cada notificação que lhe foi enviada e os e-mails que a plataforma enviou ou pôs em fila em seu nome, com todas as ligações de convite apagadas.',
    'export.inActivity': 'Atividade e dispositivos',
    'export.inActivityNote':
      'Os eventos registados sobre a sua utilização do produto e os dispositivos registados para lições offline. Os relatórios para professores e pessoal são contados a partir dos mesmos eventos.',
    'export.outHeading': 'O que não contém, e porquê',
    'export.outOthers': 'As palavras de outras pessoas',
    'export.outOthersNote':
      'Uma resposta por baixo da sua mensagem, a mensagem de um colega, a nota de um professor sobre outro aluno: são dados deles, não seus, mesmo quando lhe dizem respeito.',
    'export.outSignIn': 'O seu endereço de início de sessão e a sua palavra-passe',
    'export.outSignInNote':
      'Ambos estão guardados pelo fornecedor de início de sessão, fora desta base de dados.',
    'export.outStaff': 'Notas internas do pessoal',
    'export.outStaffNote':
      'A forma como a equipa fala consigo mesma sobre um caso de apoio ou uma revisão. Publicar essas notas torná-las-ia inúteis, e elas não são um registo sobre si.',
    'export.outFiles': 'Os próprios ficheiros carregados',
    'export.outFilesNote':
      'Os anexos são listados por referência. Copiar cada vídeo armazenado para um único documento é outra funcionalidade, com os seus próprios limites de tamanho.',
    'export.outTokens': 'Tokens de credenciais',
    'export.outTokensNote':
      'Os tokens de verificação de certificados e as ligações de partilha são aquilo que deixa entrar outras pessoas. Imprimi-los numa cópia é a forma de deixarem de ser secretos.',
    'export.outBoards': 'As suas mensagens na discussão dos alunos e na dos professores',
    'export.outBoardsNote':
      'Aí escreve com um nome de utilizador, para que uma mensagem não leve o seu nome. Uma cópia que pusesse essas mensagens junto do seu nome desfaria isso. Ficam na discussão, onde as pode ler e retirar qualquer uma. As perguntas e respostas que escreveu num curso são outra coisa: estão na cópia.',
    'export.after':
      'Descarregar é um sentido e restaurar é o outro: parte de uma cópia pode ser reposta nesta conta ou numa nova. Fechar a sua conta é uma coisa à parte e não pode ser desfeita; o que acontece a cada tipo de registo está escrito nessa página.',
    'export.printCrumb': 'Para imprimir',
    'export.printTitle': 'Uma cópia dos seus dados',
    'export.printLede':
      'Imprima esta página, ou use a janela de impressão do seu navegador para a guardar como PDF. É o seu navegador que produz o PDF.',
    'export.printCounts':
      'Ao abrir esta página foi feita uma cópia: conta como uma das dez por hora e fica registada tal como uma descarga. Recarregar a página faz outra.',
    'export.printMade': 'Feita em: {when}',
    'export.printCut': 'Estas listas ultrapassavam o limite e foram cortadas: {lists}',
    'export.printSheet': 'Descarregar como folha de cálculo',
    'export.printJson': 'Descarregar como JSON',
    'export.printEmpty': 'Ainda não há nada registado para esta conta.',
    'export.printSame':
      'Este é o mesmo registo que as duas descargas contêm. O que fica de fora de propósito, e porquê, está na página de exportação.',
    'export.printBack': 'Voltar à página de exportação',
  },
  sw: {
    'export.crumb': 'Kuhamisha',
    'export.title': 'Pata nakala ya data yako',
    'export.lede':
      'Nakala moja ya kile ambacho jukwaa hili linahifadhi kukuhusu, isipokuwa yaliyotajwa hapa chini: akaunti yako, kozi ulizojiandikisha, ulichoandika, ulichopewa alama, ulichonunua, na ujumbe uliotumiwa.',
    'export.how':
      'Kila nakala hutengenezwa unapoiomba, kwa hiyo ni ya wakati huo huo. Unaweza kutengeneza nakala kumi kwa saa; kikomo hicho kinalinda jukwaa na hakikusudiwi kukuzuia.',
    'export.cap':
      'Orodha yenye zaidi ya safu {count} hukatwa kwenye idadi hiyo, na nakala hutaja kila orodha iliyokatwa.',
    'export.json': 'Pakua nakala (JSON)',
    'export.jsonNote':
      'Nakala nzima kama faili moja la JSON: kila sehemu, pamoja na zile ambazo hakuna skrini inayozionyesha. Hufunguka katika kihariri chochote cha maandishi. Kwa msanidi programu, au kwa kuhifadhi nakala unayoweza kuikagua baadaye.',
    'export.sheet': 'Pakua nakala (lahajedwali)',
    'export.sheetNote':
      'Lahajedwali yenye kifungu kimoja kwa kila sehemu ya akaunti yako na safu tupu kati ya vifungu. Hufunguka katika Excel, Numbers, LibreOffice au Google Sheets.',
    'export.read': 'Isome hapa, au ihifadhi kama PDF',
    'export.readNote':
      'Ukurasa unaoweza kuusoma kwenye kivinjari na kuuchapisha, au kuuhifadhi kama PDF kutoka kwenye dirisha lako la kuchapisha. Kivinjari chako chenyewe ndicho kinachotengeneza PDF. Kufungua ukurasa huhesabiwa kama moja ya nakala zako kumi.',
    'export.english':
      'Majina ya vifungu na sehemu ndani ya nakala ni ya Kiingereza, kwa sababu kumbukumbu zimehifadhiwa kwa majina hayo.',
    'export.audit':
      'Kila nakala huandikwa kwenye kumbukumbu ya ukaguzi, pamoja na tarehe na idadi ya safu katika kila kifungu. Kumbukumbu hiyo ndiyo inayowezesha kufuatilia nakala isiyotarajiwa ya data ya mtu.',
    'export.preparing': 'Nakala yako inatengenezwa…',
    'export.done': 'Nakala yako imetengenezwa na kukabidhiwa kivinjari chako ili kiihifadhi.',
    'export.limit':
      'Nakala kumi zimetengenezwa katika saa iliyopita, na hicho ndicho kikomo. Subiri kidogo, kisha omba tena.',
    'export.failed': 'Nakala haikuweza kutengenezwa sasa hivi. Omba tena baada ya muda mfupi.',
    'export.signedOut': 'Umetoka kwenye akaunti. Ingia tena ili upate nakala.',
    'export.inHeading': 'Kilichomo',
    'export.inAccount': 'Akaunti yako',
    'export.inAccountNote':
      'Jina linaloonyeshwa, lugha, saa za eneo, nchi, hali, na majukumu uliyo nayo (mwalimu, mkaguzi, mfanyakazi), kama yapo.',
    'export.inLearners': 'Wasifu wa wanafunzi',
    'export.inLearnersNote':
      'Wako mwenyewe, na wa wanafunzi ambao kwa sasa wewe ni mlezi wao aliyethibitishwa mwenye ruhusa ya kuona maendeleo. Usajili wao, maendeleo, majaribio na vyeti vyao huja pamoja nao.',
    'export.inWrote': 'Ulichoandika',
    'export.inWroteNote':
      'Madokezo ya masomo, alamisho, kozi ulizohifadhi na dokezo la faragha uliloweka kando ya mojawapo, mapitio, machapisho ya majadiliano, kazi ulizowasilisha na majibu ya majaribio mafupi.',
    'export.inGuardians': 'Unawajibika kwa nani, na nani anaweza kukuona',
    'export.inGuardiansNote':
      'Kila mtoto ambaye wewe ni mlezi wake, unachoruhusiwa kuona na kusimamia, na lini hilo lilithibitishwa; na upande wa pili, yeyote ambaye jukwaa limemthibitisha kuwa mlezi wako.',
    'export.inInvited': 'Watu uliowaalika',
    'export.inInvitedNote':
      'Anwani uliyotuma ushiriki, ulichoshiriki, na kama kilikubaliwa. Si kiungo chenyewe: kiungo ndicho kinachomruhusu mwenye nacho kuingia.',
    'export.inMoney': 'Pesa',
    'export.inMoneyNote':
      'Maagizo kwenye akaunti yoyote uliyomo, kilichonunuliwa, na, ikiwa unafundisha, mapato yako na malipo uliyolipwa. Kiasi huonekana sawasawa na kilivyoandikwa, katika sarafu yake yenyewe.',
    'export.inSupport': 'Usaidizi na ujumbe',
    'export.inSupportNote':
      'Maombi uliyofungua, majibu ambayo tayari unaweza kuyaona, kila arifa uliyotumiwa, na barua pepe ambazo jukwaa limetuma au kuweka kwenye foleni kwa niaba yako, huku kila kiungo cha mwaliko kikiwa kimefutwa.',
    'export.inActivity': 'Shughuli na vifaa',
    'export.inActivityNote':
      'Matukio yaliyoandikwa kuhusu matumizi yako ya bidhaa, na vifaa vilivyosajiliwa kwa masomo ya nje ya mtandao. Ripoti za walimu na wafanyakazi huhesabiwa kutoka kwenye matukio hayo hayo.',
    'export.outHeading': 'Kisichomo, na kwa nini',
    'export.outOthers': 'Maneno ya watu wengine',
    'export.outOthersNote':
      'Jibu chini ya chapisho lako, ujumbe wa mwanafunzi mwenzako, dokezo la mwalimu kuhusu mwanafunzi mwingine: hiyo ni data yao, si yako, hata inapokuhusu.',
    'export.outSignIn': 'Anwani yako ya kuingia na nenosiri lako',
    'export.outSignInNote':
      'Vyote viwili vinahifadhiwa na mtoa huduma ya kuingia, nje ya hifadhidata hii.',
    'export.outStaff': 'Madokezo ya ndani ya wafanyakazi',
    'export.outStaffNote':
      'Jinsi timu inavyozungumza yenyewe kwa yenyewe kuhusu ombi la usaidizi au ukaguzi. Kuchapisha madokezo hayo kungeyafanya yasiwe na maana, na si kumbukumbu kukuhusu.',
    'export.outFiles': 'Faili zilizopakiwa zenyewe',
    'export.outFilesNote':
      'Viambatisho huorodheshwa kwa marejeo. Kunakili kila video iliyohifadhiwa ndani ya hati moja ni kipengele kingine, chenye vikomo vyake vya ukubwa.',
    'export.outTokens': 'Tokeni za vitambulisho',
    'export.outTokensNote':
      'Tokeni za uthibitishaji wa vyeti na viungo vya kushiriki ndivyo vinavyowaruhusu watu wengine kuingia. Kuvichapisha ndani ya nakala ndiyo njia ya kuacha kuwa siri.',
    'export.outBoards': 'Machapisho yako katika majadiliano ya wanafunzi na ya walimu',
    'export.outBoardsNote':
      'Huko unaandika kwa jina la mtumiaji, ili chapisho lisibebe jina lako. Nakala inayoweka machapisho hayo kando ya jina lako ingeondoa hilo. Yanabaki kwenye majadiliano, ambako unaweza kuyasoma na kuondoa lolote. Maswali na majibu uliyoandika ndani ya kozi ni jambo jingine: yamo kwenye nakala.',
    'export.after':
      'Kupakua ni upande mmoja na kurejesha ni upande mwingine: sehemu ya nakala inaweza kurudishwa kwenye akaunti hii au kwenye akaunti mpya. Kufunga akaunti yako ni jambo tofauti na haliwezi kutenduliwa; kinachotokea kwa kila aina ya kumbukumbu kimeandikwa kwenye ukurasa huo.',
    'export.printCrumb': 'Kwa kuchapisha',
    'export.printTitle': 'Nakala ya data yako',
    'export.printLede':
      'Chapisha ukurasa huu, au tumia dirisha la kuchapisha la kivinjari chako kuuhifadhi kama PDF. Kivinjari chako chenyewe ndicho kinachotengeneza PDF.',
    'export.printCounts':
      'Kufungua ukurasa huu kumetengeneza nakala: inahesabiwa kama moja ya kumi kwa saa na huandikwa kama upakuaji. Kupakia ukurasa upya hutengeneza nyingine.',
    'export.printMade': 'Imetengenezwa: {when}',
    'export.printCut': 'Orodha hizi zilikuwa ndefu kuliko kikomo na zilikatwa: {lists}',
    'export.printSheet': 'Pakua kama lahajedwali',
    'export.printJson': 'Pakua kama JSON',
    'export.printEmpty': 'Bado hakuna kilichoandikwa kwa akaunti hii.',
    'export.printSame':
      'Hii ni kumbukumbu ile ile iliyomo katika vipakuliwa vyote viwili. Kilichoachwa nje kwa makusudi, na sababu yake, kiko kwenye ukurasa wa kuhamisha.',
    'export.printBack': 'Rudi kwenye ukurasa wa kuhamisha',
  },
  af: {
    'export.crumb': 'Uitvoer',
    'export.title': 'Kry ’n kopie van jou data',
    'export.lede':
      'Een kopie van wat hierdie platform oor jou hou, met die uitsonderings wat hieronder gelys word: jou rekening, die kursusse waarvoor jy ingeskryf is, wat jy geskryf het, waarvoor jy gepunt is, wat jy gekoop het en die boodskappe wat aan jou gestuur is.',
    'export.how':
      'Elke kopie word gemaak wanneer jy daarvoor vra, dus is dit op daardie oomblik op datum. Jy kan tien kopieë per uur maak; daardie perk beskerm die platform en is nie bedoel om jou te beperk nie.',
    'export.cap':
      '’n Lys wat langer as {count} rye is, word by daardie getal afgesny, en die kopie noem elke lys wat afgesny is.',
    'export.json': 'Laai die kopie af (JSON)',
    'export.jsonNote':
      'Die hele kopie as een JSON-lêer: elke veld, ook dié wat geen skerm wys nie. Dit open in enige teksredigeerder. Vir ’n ontwikkelaar, of om ’n kopie te hou wat jy later kan nagaan.',
    'export.sheet': 'Laai die kopie af (sigblad)',
    'export.sheetNote':
      '’n Sigblad met een afdeling vir elke deel van jou rekening en ’n leë ry tussen afdelings. Dit open in Excel, Numbers, LibreOffice of Google Sheets.',
    'export.read': 'Lees dit hier, of stoor as PDF',
    'export.readNote':
      '’n Bladsy wat jy in die blaaier kan lees en druk, of vanuit jou eie drukvenster as PDF kan stoor. Jou blaaier maak self die PDF. Om die bladsy oop te maak tel as een van jou tien kopieë.',
    'export.english':
      'Die name van afdelings en velde binne die kopie is in Engels, omdat die rekords onder daardie name gestoor word.',
    'export.audit':
      'Elke kopie word in die ouditrekord aangeteken, met die datum en hoeveel rye elke afdeling gehad het. Dit is daardie rekord wat ’n onverwagte kopie van iemand se data naspeurbaar maak.',
    'export.preparing': 'Jou kopie word gemaak…',
    'export.done': 'Jou kopie is gemaak en aan jou blaaier oorhandig om te stoor.',
    'export.limit':
      'Tien kopieë is in die afgelope uur gemaak, en dit is die perk. Wag ’n bietjie en vra dan weer.',
    'export.failed': 'Die kopie kon nie nou gemaak word nie. Vra oor ’n oomblik weer.',
    'export.signedOut': 'Jy is afgemeld. Meld weer aan om ’n kopie te kry.',
    'export.inHeading': 'Wat daarin is',
    'export.inAccount': 'Jou rekening',
    'export.inAccountNote':
      'Vertoonnaam, taal, tydsone, land, status, en die rolle wat jy beklee (onderwyser, beoordelaar, personeel), indien enige.',
    'export.inLearners': 'Leerderprofiele',
    'export.inLearnersNote':
      'Jou eie, en dié van leerders van wie jy tans ’n geverifieerde voog is met toestemming om vordering te sien. Hul inskrywings, vordering, pogings en sertifikate kom saam.',
    'export.inWrote': 'Wat jy geskryf het',
    'export.inWroteNote':
      'Lesnotas, boekmerke, gestoorde kursusse en die private nota wat jy langs een geplaas het, resensies, besprekingsplasings, ingehandigde opdragte en vasvra-antwoorde.',
    'export.inGuardians': 'Vir wie jy verantwoordelik is, en wie jou kan sien',
    'export.inGuardiansNote':
      'Elke kind van wie jy die voog is, wat jy mag sien en bestuur, en wanneer dit geverifieer is; en omgekeerd, enigiemand wat die platform as jou voog geverifieer het.',
    'export.inInvited': 'Mense wat jy genooi het',
    'export.inInvitedNote':
      'Die adres waarheen jy iets gedeel het, wat jy gedeel het, en of dit aanvaar is. Nie die skakel self nie: die skakel is wat sy houer inlaat.',
    'export.inMoney': 'Geld',
    'export.inMoneyNote':
      'Bestellings op enige rekening waaraan jy behoort, wat gekoop is, en, as jy onderrig gee, jou verdienste en uitbetalings. Bedrae verskyn presies soos aangeteken, in hul eie geldeenheid.',
    'export.inSupport': 'Ondersteuning en boodskappe',
    'export.inSupportNote':
      'Die sake wat jy geopen het, die antwoorde wat jy reeds kan sien, elke kennisgewing wat aan jou gestuur is, en e-pos wat die platform namens jou gestuur of in die tou geplaas het, met elke uitnodigingskakel uitgevee.',
    'export.inActivity': 'Aktiwiteit en toestelle',
    'export.inActivityNote':
      'Gebeure wat oor jou gebruik van die produk aangeteken is, en toestelle wat vir vanlyn lesse geregistreer is. Verslae vir onderwysers en personeel word uit dieselfde gebeure getel.',
    'export.outHeading': 'Wat nie daarin is nie, en waarom',
    'export.outOthers': 'Ander mense se woorde',
    'export.outOthersNote':
      '’n Antwoord onder jou plasing, ’n klasmaat se boodskap, ’n onderwyser se nota oor ’n ander leerder: dit is hulle data, nie joune nie, selfs waar dit jou raak.',
    'export.outSignIn': 'Jou aanmeldadres en wagwoord',
    'export.outSignInNote': 'Albei word deur die aanmeldverskaffer gehou, buite hierdie databasis.',
    'export.outStaff': 'Interne personeelnotas',
    'export.outStaffNote':
      'Hoe die span met homself praat oor ’n ondersteuningsaak of ’n beoordeling. Om daardie notas te publiseer sou hulle nutteloos maak, en hulle is nie ’n rekord oor jou nie.',
    'export.outFiles': 'Die opgelaaide lêers self',
    'export.outFilesNote':
      'Aanhegsels word by verwysing gelys. Om elke gestoorde video in een dokument te kopieer is ’n ander funksie, met sy eie grootteperke.',
    'export.outTokens': 'Bewystekens',
    'export.outTokensNote':
      'Sertifikaat-verifikasietekens en deelskakels is wat ander mense inlaat. Om hulle in ’n kopie te druk is hoe hulle ophou om geheim te wees.',
    'export.outBoards': 'Jou plasings in die studentebespreking en die onderwysersbespreking',
    'export.outBoardsNote':
      'Daar skryf jy onder ’n gebruikersnaam, sodat ’n plasing nie jou naam dra nie. ’n Kopie wat daardie plasings langs jou naam sit, sou dit ongedaan maak. Hulle bly in die bespreking, waar jy hulle kan lees en enige een kan terugtrek. Die vrae en antwoorde wat jy in ’n kursus geskryf het, is iets anders: hulle is in die kopie.',
    'export.after':
      'Aflaai is een rigting en herstel is die ander: ’n deel van ’n kopie kan na hierdie rekening of na ’n nuwe een teruggesit word. Om jou rekening te sluit is afsonderlik en kan nie ongedaan gemaak word nie; wat met elke soort rekord gebeur, staan op daardie bladsy.',
    'export.printCrumb': 'Om te druk',
    'export.printTitle': '’n Kopie van jou data',
    'export.printLede':
      'Druk hierdie bladsy, of gebruik jou blaaier se drukvenster om dit as PDF te stoor. Jou blaaier maak self die PDF.',
    'export.printCounts':
      'Deur hierdie bladsy oop te maak is ’n kopie gemaak: dit tel as een van die tien per uur en word net soos ’n aflaai aangeteken. Om die bladsy te herlaai maak nog een.',
    'export.printMade': 'Gemaak: {when}',
    'export.printCut': 'Hierdie lyste was langer as die perk en is afgesny: {lists}',
    'export.printSheet': 'Laai af as sigblad',
    'export.printJson': 'Laai af as JSON',
    'export.printEmpty': 'Niks is nog vir hierdie rekening aangeteken nie.',
    'export.printSame':
      'Dit is dieselfde rekord as wat die twee aflaaie bevat. Wat doelbewus uitgelaat word, en waarom, staan op die uitvoerbladsy.',
    'export.printBack': 'Terug na die uitvoerbladsy',
  },
  'zh-hans': {
    'export.crumb': '导出',
    'export.title': '获取你的数据副本',
    'export.lede': '本平台保存的有关你的内容的一份副本，下面列出的例外除外：你的账户、你报名的课程、你写的内容、你被评分的内容、你购买的内容，以及发给你的消息。',
    'export.how': '每份副本都在你索取时生成，因此截至那一刻是最新的。你每小时可以生成十份副本；这个限制是为了保护平台，并不是要限制你。',
    'export.cap': '超过 {count} 行的列表会在该数目处截断，副本会列出每个被截断的列表的名称。',
    'export.json': '下载副本（JSON）',
    'export.jsonNote':
      '整份副本是一个 JSON 文件：包含每个字段，连任何页面都不显示的字段也在内。可以用任何文本编辑器打开。适合开发者，或用来保存一份日后可以核对的副本。',
    'export.sheet': '下载副本（电子表格）',
    'export.sheetNote':
      '一份电子表格，账户的每个部分各占一节，各节之间空一行。可以用 Excel、Numbers、LibreOffice 或 Google Sheets 打开。',
    'export.read': '在这里阅读，或保存为 PDF',
    'export.readNote': '一个可以在浏览器中阅读并打印的页面，也可以从你自己的打印对话框保存为 PDF。PDF 由你的浏览器自己生成。打开该页面算作你十份副本中的一份。',
    'export.english': '副本中各节和字段的名称是英文，因为记录就是以这些名称保存的。',
    'export.audit': '每份副本都会记入审计记录，连同日期和每一节的行数。正是这份记录让某人数据的意外副本可以被追查。',
    'export.preparing': '正在生成你的副本…',
    'export.done': '你的副本已生成，并已交给浏览器保存。',
    'export.limit': '过去一小时内已生成十份副本，这就是上限。请稍等一会儿再索取。',
    'export.failed': '副本暂时无法生成。请稍后再索取。',
    'export.signedOut': '你已退出登录。请重新登录以获取副本。',
    'export.inHeading': '其中包含什么',
    'export.inAccount': '你的账户',
    'export.inAccountNote': '显示名称、语言、时区、国家、状态，以及你担任的角色（教师、审阅者、工作人员），如有。',
    'export.inLearners': '学习者资料',
    'export.inLearnersNote': '你自己的资料，以及你目前作为已验证的监护人并有权查看其进度的学习者的资料。他们的报名、进度、作答和证书也一并包含。',
    'export.inWrote': '你写的内容',
    'export.inWroteNote': '课程笔记、书签、收藏的课程以及你在其旁边写下的私人备注、评价、讨论帖子、提交的作业和测验答案。',
    'export.inGuardians': '你对谁负责，以及谁可以看到你',
    'export.inGuardiansNote': '你作为监护人的每个孩子、你获准查看和管理的内容，以及验证的时间；反过来，还有平台已验证为你的监护人的任何人。',
    'export.inInvited': '你邀请过的人',
    'export.inInvitedNote': '你发送分享的地址、你分享了什么，以及是否被接受。不包括链接本身：链接正是让持有者进入的东西。',
    'export.inMoney': '钱款',
    'export.inMoneyNote': '你所属的任何账户上的订单、购买的内容，以及如果你授课，你的收入和付款。金额完全按记录的样子显示，使用各自的货币。',
    'export.inSupport': '支持与消息',
    'export.inSupportNote': '你提出的个案、你本来就能看到的回复、发给你的每条通知，以及平台代你发送或排队待发的电子邮件，其中所有邀请链接均已抹去。',
    'export.inActivity': '活动与设备',
    'export.inActivityNote': '记录下来的有关你使用本产品的事件，以及为离线课程登记的设备。给教师和工作人员的报告也是根据这些事件统计的。',
    'export.outHeading': '其中不包含什么，以及原因',
    'export.outOthers': '别人的话',
    'export.outOthersNote': '你帖子下面的回复、同学的消息、教师关于另一位学习者的备注：这些是他们的数据，不是你的，即使与你有关。',
    'export.outSignIn': '你的登录地址和密码',
    'export.outSignInNote': '两者都由登录服务提供方保管，不在本数据库中。',
    'export.outStaff': '工作人员的内部备注',
    'export.outStaffNote': '团队内部就某个支持个案或某次审查进行的交流。公开这些备注会使它们失去作用，而且它们并不是关于你的记录。',
    'export.outFiles': '上传的文件本身',
    'export.outFilesNote': '附件只以引用方式列出。把每个存储的视频复制到一份文档中是另一项功能，有它自己的大小限制。',
    'export.outTokens': '凭证令牌',
    'export.outTokensNote': '证书验证令牌和分享链接正是让其他人进入的东西。把它们印在副本里，它们就不再保密了。',
    'export.outBoards': '你在学生讨论区和教师讨论区发布的内容',
    'export.outBoardsNote': '在那里你用用户名发言，这样内容就不会带着你的名字。把这些内容和你的名字放在一起的副本，会让这一点落空。它们留在讨论区，你可以在那里阅读，也可以撤回任何一条。你在课程里写的提问和回答是另一回事：它们在副本里。',
    'export.after': '下载是一个方向，恢复是另一个方向：副本的一部分可以放回本账户或一个新账户。关闭账户是另一回事，而且无法撤销；每类记录会怎样处理，都写在那个页面上。',
    'export.printCrumb': '供打印',
    'export.printTitle': '你的数据副本',
    'export.printLede': '打印本页，或使用浏览器的打印对话框将其保存为 PDF。PDF 由你的浏览器自己生成。',
    'export.printCounts': '打开本页已生成一份副本：它算作每小时十份中的一份，并像下载一样被记录。重新加载本页会再生成一份。',
    'export.printMade': '生成时间：{when}',
    'export.printCut': '以下列表超过上限，已被截断：{lists}',
    'export.printSheet': '下载为电子表格',
    'export.printJson': '下载为 JSON',
    'export.printEmpty': '此账户尚无任何记录。',
    'export.printSame': '这与两种下载所包含的记录相同。有意不包含的内容及其原因，见导出页面。',
    'export.printBack': '返回导出页面',
  },
  'zh-hant': {
    'export.crumb': '匯出',
    'export.title': '取得你的資料副本',
    'export.lede': '本平台保存的有關你的內容的一份副本，下面列出的例外除外：你的帳號、你報名的課程、你寫的內容、你被評分的內容、你購買的內容，以及寄給你的訊息。',
    'export.how': '每份副本都在你索取時產生，因此截至那一刻是最新的。你每小時可以產生十份副本；這個限制是為了保護平台，並不是要限制你。',
    'export.cap': '超過 {count} 列的清單會在該數目處截斷，副本會列出每個被截斷的清單的名稱。',
    'export.json': '下載副本（JSON）',
    'export.jsonNote':
      '整份副本是一個 JSON 檔案：包含每個欄位，連任何畫面都不顯示的欄位也在內。可以用任何文字編輯器開啟。適合開發者，或用來保存一份日後可以核對的副本。',
    'export.sheet': '下載副本（試算表）',
    'export.sheetNote':
      '一份試算表，帳號的每個部分各占一節，各節之間空一列。可以用 Excel、Numbers、LibreOffice 或 Google Sheets 開啟。',
    'export.read': '在這裡閱讀，或儲存為 PDF',
    'export.readNote': '一個可以在瀏覽器中閱讀並列印的頁面，也可以從你自己的列印對話框儲存為 PDF。PDF 由你的瀏覽器自己產生。開啟該頁面算作你十份副本中的一份。',
    'export.english': '副本中各節和欄位的名稱是英文，因為紀錄就是以這些名稱保存的。',
    'export.audit': '每份副本都會記入稽核紀錄，連同日期和每一節的列數。正是這份紀錄讓某人資料的意外副本可以被追查。',
    'export.preparing': '正在產生你的副本…',
    'export.done': '你的副本已產生，並已交給瀏覽器儲存。',
    'export.limit': '過去一小時內已產生十份副本，這就是上限。請稍等一會兒再索取。',
    'export.failed': '副本暫時無法產生。請稍後再索取。',
    'export.signedOut': '你已登出。請重新登入以取得副本。',
    'export.inHeading': '其中包含什麼',
    'export.inAccount': '你的帳號',
    'export.inAccountNote': '顯示名稱、語言、時區、國家、狀態，以及你擔任的角色（教師、審閱者、工作人員），如有。',
    'export.inLearners': '學習者個人資料',
    'export.inLearnersNote': '你自己的個人資料，以及你目前作為已驗證的監護人並有權查看其進度的學習者的個人資料。他們的報名、進度、作答和證書也一併包含。',
    'export.inWrote': '你寫的內容',
    'export.inWroteNote': '課程筆記、書籤、收藏的課程以及你在其旁邊寫下的私人備註、評價、討論貼文、繳交的作業和測驗答案。',
    'export.inGuardians': '你對誰負責，以及誰可以看到你',
    'export.inGuardiansNote': '你作為監護人的每個孩子、你獲准查看和管理的內容，以及驗證的時間；反過來，還有平台已驗證為你的監護人的任何人。',
    'export.inInvited': '你邀請過的人',
    'export.inInvitedNote': '你寄送分享的地址、你分享了什麼，以及是否被接受。不包括連結本身：連結正是讓持有者進入的東西。',
    'export.inMoney': '款項',
    'export.inMoneyNote': '你所屬的任何帳號上的訂單、購買的內容，以及如果你授課，你的收入和付款。金額完全按紀錄的樣子顯示，使用各自的貨幣。',
    'export.inSupport': '支援與訊息',
    'export.inSupportNote': '你提出的個案、你本來就能看到的回覆、寄給你的每則通知，以及平台代你寄出或排入佇列的電子郵件，其中所有邀請連結均已抹去。',
    'export.inActivity': '活動與裝置',
    'export.inActivityNote': '記錄下來的有關你使用本產品的事件，以及為離線課程登記的裝置。給教師和工作人員的報告也是根據這些事件統計的。',
    'export.outHeading': '其中不包含什麼，以及原因',
    'export.outOthers': '別人的話',
    'export.outOthersNote': '你貼文下面的回覆、同學的訊息、教師關於另一位學習者的備註：這些是他們的資料，不是你的，即使與你有關。',
    'export.outSignIn': '你的登入地址和密碼',
    'export.outSignInNote': '兩者都由登入服務提供者保管，不在本資料庫中。',
    'export.outStaff': '工作人員的內部備註',
    'export.outStaffNote': '團隊內部就某個支援個案或某次審查進行的交流。公開這些備註會使它們失去作用，而且它們並不是關於你的紀錄。',
    'export.outFiles': '上傳的檔案本身',
    'export.outFilesNote': '附件只以參照方式列出。把每個儲存的影片複製到一份文件中是另一項功能，有它自己的大小限制。',
    'export.outTokens': '憑證權杖',
    'export.outTokensNote': '證書驗證權杖和分享連結正是讓其他人進入的東西。把它們印在副本裡，它們就不再保密了。',
    'export.outBoards': '你在學生討論區和教師討論區發布的內容',
    'export.outBoardsNote': '在那裡你用使用者名稱發言，這樣內容就不會帶著你的名字。把這些內容和你的名字放在一起的副本，會讓這一點落空。它們留在討論區，你可以在那裡閱讀，也可以收回任何一則。你在課程裡寫的提問和回答是另一回事：它們在副本裡。',
    'export.after': '下載是一個方向，還原是另一個方向：副本的一部分可以放回本帳號或一個新帳號。關閉帳號是另一回事，而且無法復原；每類紀錄會怎樣處理，都寫在那個頁面上。',
    'export.printCrumb': '供列印',
    'export.printTitle': '你的資料副本',
    'export.printLede': '列印本頁，或使用瀏覽器的列印對話框將其儲存為 PDF。PDF 由你的瀏覽器自己產生。',
    'export.printCounts': '開啟本頁已產生一份副本：它算作每小時十份中的一份，並像下載一樣被記錄。重新載入本頁會再產生一份。',
    'export.printMade': '產生時間：{when}',
    'export.printCut': '以下清單超過上限，已被截斷：{lists}',
    'export.printSheet': '下載為試算表',
    'export.printJson': '下載為 JSON',
    'export.printEmpty': '此帳號尚無任何紀錄。',
    'export.printSame': '這與兩種下載所包含的紀錄相同。有意不包含的內容及其原因，見匯出頁面。',
    'export.printBack': '返回匯出頁面',
  },
  vi: {
    'export.crumb': 'Xuất dữ liệu',
    'export.title': 'Nhận một bản sao dữ liệu của bạn',
    'export.lede':
      'Một bản sao những gì nền tảng này lưu về bạn, trừ các ngoại lệ nêu bên dưới: tài khoản của bạn, các khóa học bạn đã ghi danh, những gì bạn đã viết, những gì bạn đã được chấm điểm, những gì bạn đã mua và các tin nhắn đã gửi cho bạn.',
    'export.how':
      'Mỗi bản sao được tạo khi bạn yêu cầu, nên nó cập nhật đến đúng lúc đó. Bạn có thể tạo mười bản sao mỗi giờ; giới hạn này bảo vệ nền tảng và không nhằm hạn chế bạn.',
    'export.cap':
      'Danh sách dài hơn {count} dòng sẽ bị cắt ở con số đó, và bản sao nêu tên từng danh sách đã bị cắt.',
    'export.json': 'Tải bản sao xuống (JSON)',
    'export.jsonNote':
      'Toàn bộ bản sao trong một tệp JSON: mọi trường, kể cả những trường không màn hình nào hiển thị. Mở được bằng bất kỳ trình soạn thảo văn bản nào. Dành cho nhà phát triển, hoặc để giữ một bản sao mà bạn có thể kiểm tra sau này.',
    'export.sheet': 'Tải bản sao xuống (bảng tính)',
    'export.sheetNote':
      'Một bảng tính có một phần cho mỗi phần của tài khoản và một dòng trống giữa các phần. Mở được bằng Excel, Numbers, LibreOffice hoặc Google Sheets.',
    'export.read': 'Đọc tại đây, hoặc lưu thành PDF',
    'export.readNote':
      'Một trang bạn có thể đọc trong trình duyệt và in, hoặc lưu thành PDF từ hộp thoại in của chính bạn. Chính trình duyệt của bạn tạo ra tệp PDF. Mở trang này được tính là một trong mười bản sao của bạn.',
    'export.english':
      'Tên các phần và các trường bên trong bản sao bằng tiếng Anh, vì các bản ghi được lưu dưới những tên đó.',
    'export.audit':
      'Mỗi bản sao được ghi vào nhật ký kiểm tra, cùng với ngày và số dòng của từng phần. Chính bản ghi đó giúp truy được một bản sao dữ liệu bất ngờ của ai đó.',
    'export.preparing': 'Đang tạo bản sao của bạn…',
    'export.done': 'Bản sao của bạn đã được tạo và giao cho trình duyệt để lưu.',
    'export.limit':
      'Đã có mười bản sao được tạo trong một giờ qua, và đó là giới hạn. Hãy đợi một chút rồi yêu cầu lại.',
    'export.failed': 'Hiện chưa tạo được bản sao. Hãy yêu cầu lại sau giây lát.',
    'export.signedOut': 'Bạn đã đăng xuất. Hãy đăng nhập lại để nhận bản sao.',
    'export.inHeading': 'Trong đó có gì',
    'export.inAccount': 'Tài khoản của bạn',
    'export.inAccountNote':
      'Tên hiển thị, ngôn ngữ, múi giờ, quốc gia, trạng thái và các vai trò bạn đang giữ (giáo viên, người duyệt, nhân viên), nếu có.',
    'export.inLearners': 'Hồ sơ học viên',
    'export.inLearnersNote':
      'Hồ sơ của chính bạn, và của những học viên mà hiện bạn là người giám hộ đã được xác minh, có quyền xem tiến độ. Việc ghi danh, tiến độ, các lần làm bài và chứng chỉ của họ đi kèm theo.',
    'export.inWrote': 'Những gì bạn đã viết',
    'export.inWroteNote':
      'Ghi chú bài học, dấu trang, khóa học đã lưu và ghi chú riêng bạn đặt bên cạnh, đánh giá, bài đăng thảo luận, bài tập đã nộp và câu trả lời bài kiểm tra.',
    'export.inGuardians': 'Bạn chịu trách nhiệm cho ai, và ai có thể xem bạn',
    'export.inGuardiansNote':
      'Mỗi trẻ mà bạn là người giám hộ, những gì bạn được phép xem và quản lý, và thời điểm điều đó được xác minh; và theo chiều ngược lại, bất kỳ ai mà nền tảng đã xác minh là người giám hộ của bạn.',
    'export.inInvited': 'Những người bạn đã mời',
    'export.inInvitedNote':
      'Địa chỉ bạn đã gửi lượt chia sẻ, bạn đã chia sẻ gì, và nó có được chấp nhận không. Không gồm chính đường liên kết: đường liên kết là thứ cho người giữ nó vào.',
    'export.inMoney': 'Tiền',
    'export.inMoneyNote':
      'Đơn hàng trên bất kỳ tài khoản nào bạn thuộc về, những gì đã mua, và nếu bạn giảng dạy, thu nhập và các khoản chi trả cho bạn. Số tiền hiển thị đúng như đã ghi, bằng đơn vị tiền tệ của nó.',
    'export.inSupport': 'Hỗ trợ và tin nhắn',
    'export.inSupportNote':
      'Các yêu cầu bạn đã mở, những câu trả lời bạn vốn đã xem được, mọi thông báo đã gửi cho bạn, và thư điện tử mà nền tảng đã gửi hoặc xếp hàng chờ gửi thay bạn, với mọi đường liên kết mời đã được xóa.',
    'export.inActivity': 'Hoạt động và thiết bị',
    'export.inActivityNote':
      'Các sự kiện được ghi lại về việc bạn dùng sản phẩm, và các thiết bị đã đăng ký cho bài học ngoại tuyến. Báo cáo dành cho giáo viên và nhân viên được đếm từ chính những sự kiện đó.',
    'export.outHeading': 'Trong đó không có gì, và vì sao',
    'export.outOthers': 'Lời của người khác',
    'export.outOthersNote':
      'Một câu trả lời dưới bài đăng của bạn, tin nhắn của bạn cùng lớp, ghi chú của giáo viên về một học viên khác: đó là dữ liệu của họ, không phải của bạn, ngay cả khi nó liên quan đến bạn.',
    'export.outSignIn': 'Địa chỉ đăng nhập và mật khẩu của bạn',
    'export.outSignInNote': 'Cả hai do nhà cung cấp đăng nhập giữ, bên ngoài cơ sở dữ liệu này.',
    'export.outStaff': 'Ghi chú nội bộ của nhân viên',
    'export.outStaffNote':
      'Cách nhóm trao đổi với nhau về một yêu cầu hỗ trợ hoặc một lần xem xét. Công bố những ghi chú đó sẽ khiến chúng vô dụng, và chúng không phải là bản ghi về bạn.',
    'export.outFiles': 'Chính các tệp đã tải lên',
    'export.outFilesNote':
      'Tệp đính kèm được liệt kê theo tham chiếu. Sao chép mọi video đã lưu vào một tài liệu là một tính năng khác, với giới hạn dung lượng riêng.',
    'export.outTokens': 'Mã thông báo xác thực',
    'export.outTokensNote':
      'Mã xác minh chứng chỉ và đường liên kết chia sẻ là thứ cho người khác vào. In chúng trong một bản sao chính là cách chúng thôi còn bí mật.',
    'export.outBoards': 'Bài đăng của bạn trong thảo luận của học viên và của giáo viên',
    'export.outBoardsNote':
      'Ở đó bạn viết bằng tên người dùng, để bài đăng không mang tên của bạn. Một bản sao đặt những bài đăng đó cạnh tên của bạn sẽ làm mất điều ấy. Chúng vẫn ở trong phần thảo luận, nơi bạn có thể đọc và rút lại bất kỳ bài nào. Câu hỏi và câu trả lời bạn viết trong một khóa học là chuyện khác: chúng có trong bản sao.',
    'export.after':
      'Tải xuống là một chiều và khôi phục là chiều kia: một phần của bản sao có thể được đưa trở lại tài khoản này hoặc một tài khoản mới. Đóng tài khoản là việc riêng và không thể hoàn tác; điều gì xảy ra với từng loại bản ghi được viết trên trang đó.',
    'export.printCrumb': 'Để in',
    'export.printTitle': 'Một bản sao dữ liệu của bạn',
    'export.printLede':
      'Hãy in trang này, hoặc dùng hộp thoại in của trình duyệt để lưu thành PDF. Chính trình duyệt của bạn tạo ra tệp PDF.',
    'export.printCounts':
      'Việc mở trang này đã tạo một bản sao: nó được tính là một trong mười bản mỗi giờ và được ghi lại như một lượt tải xuống. Tải lại trang sẽ tạo thêm một bản nữa.',
    'export.printMade': 'Thời điểm tạo: {when}',
    'export.printCut': 'Các danh sách sau dài hơn giới hạn và đã bị cắt: {lists}',
    'export.printSheet': 'Tải xuống dạng bảng tính',
    'export.printJson': 'Tải xuống dạng JSON',
    'export.printEmpty': 'Chưa có gì được ghi cho tài khoản này.',
    'export.printSame':
      'Đây chính là bản ghi mà hai tệp tải xuống chứa. Những gì cố ý để ra ngoài, và lý do, có trên trang xuất dữ liệu.',
    'export.printBack': 'Quay lại trang xuất dữ liệu',
  },
  th: {
    'export.crumb': 'ส่งออก',
    'export.title': 'รับสำเนาข้อมูลของคุณ',
    'export.lede':
      'สำเนาหนึ่งชุดของสิ่งที่แพลตฟอร์มนี้เก็บไว้เกี่ยวกับคุณ โดยมีข้อยกเว้นตามที่ระบุด้านล่าง: บัญชีของคุณ หลักสูตรที่คุณลงทะเบียน สิ่งที่คุณเขียน สิ่งที่คุณได้รับคะแนน สิ่งที่คุณซื้อ และข้อความที่ส่งถึงคุณ',
    'export.how':
      'สำเนาแต่ละชุดจะจัดทำเมื่อคุณขอ จึงเป็นข้อมูลล่าสุด ณ ขณะนั้น คุณทำสำเนาได้สิบชุดต่อชั่วโมง ขีดจำกัดนี้มีไว้ปกป้องแพลตฟอร์ม ไม่ได้มีไว้เพื่อจำกัดคุณ',
    'export.cap':
      'รายการที่ยาวเกิน {count} แถวจะถูกตัดที่จำนวนนั้น และสำเนาจะระบุชื่อของทุกรายการที่ถูกตัด',
    'export.json': 'ดาวน์โหลดสำเนา (JSON)',
    'export.jsonNote':
      'สำเนาทั้งชุดเป็นไฟล์ JSON ไฟล์เดียว: ทุกช่องข้อมูล รวมถึงช่องที่ไม่มีหน้าจอใดแสดง เปิดได้ด้วยโปรแกรมแก้ไขข้อความใดก็ได้ สำหรับนักพัฒนา หรือสำหรับเก็บสำเนาที่คุณตรวจสอบได้ในภายหลัง',
    'export.sheet': 'ดาวน์โหลดสำเนา (สเปรดชีต)',
    'export.sheetNote':
      'สเปรดชีตที่มีหนึ่งส่วนสำหรับแต่ละส่วนของบัญชีคุณ และมีแถวว่างคั่นระหว่างส่วน เปิดได้ด้วย Excel, Numbers, LibreOffice หรือ Google Sheets',
    'export.read': 'อ่านที่นี่ หรือบันทึกเป็น PDF',
    'export.readNote':
      'หน้าที่คุณอ่านในเบราว์เซอร์และพิมพ์ได้ หรือบันทึกเป็น PDF จากหน้าต่างการพิมพ์ของคุณเอง เบราว์เซอร์ของคุณเป็นผู้สร้าง PDF เอง การเปิดหน้านี้นับเป็นหนึ่งในสิบสำเนาของคุณ',
    'export.english':
      'ชื่อส่วนและชื่อช่องข้อมูลในสำเนาเป็นภาษาอังกฤษ เพราะระเบียนถูกเก็บไว้ด้วยชื่อเหล่านั้น',
    'export.audit':
      'สำเนาทุกชุดจะถูกบันทึกในบันทึกการตรวจสอบ พร้อมวันที่และจำนวนแถวของแต่ละส่วน บันทึกนี้เองที่ทำให้ติดตามสำเนาข้อมูลของใครบางคนที่ไม่คาดคิดได้',
    'export.preparing': 'กำลังจัดทำสำเนาของคุณ…',
    'export.done': 'จัดทำสำเนาของคุณแล้ว และส่งให้เบราว์เซอร์ของคุณบันทึก',
    'export.limit':
      'มีการทำสำเนาสิบชุดในชั่วโมงที่ผ่านมา ซึ่งเป็นขีดจำกัด โปรดรอสักครู่แล้วขออีกครั้ง',
    'export.failed': 'ยังจัดทำสำเนาไม่ได้ในขณะนี้ โปรดขออีกครั้งในอีกสักครู่',
    'export.signedOut': 'คุณออกจากระบบแล้ว โปรดเข้าสู่ระบบอีกครั้งเพื่อรับสำเนา',
    'export.inHeading': 'มีอะไรอยู่ในนั้น',
    'export.inAccount': 'บัญชีของคุณ',
    'export.inAccountNote':
      'ชื่อที่แสดง ภาษา เขตเวลา ประเทศ สถานะ และบทบาทที่คุณมี (ผู้สอน ผู้ตรวจ เจ้าหน้าที่) ถ้ามี',
    'export.inLearners': 'โปรไฟล์ผู้เรียน',
    'export.inLearnersNote':
      'โปรไฟล์ของคุณเอง และของผู้เรียนที่ขณะนี้คุณเป็นผู้ปกครองที่ยืนยันแล้วและได้รับอนุญาตให้ดูความคืบหน้า การลงทะเบียน ความคืบหน้า การทำแบบทดสอบ และประกาศนียบัตรของพวกเขาจะมาพร้อมกัน',
    'export.inWrote': 'สิ่งที่คุณเขียน',
    'export.inWroteNote':
      'บันทึกบทเรียน บุ๊กมาร์ก หลักสูตรที่บันทึกไว้และบันทึกส่วนตัวที่คุณใส่ไว้ข้าง ๆ รีวิว โพสต์ในการสนทนา งานที่ส่ง และคำตอบแบบทดสอบ',
    'export.inGuardians': 'คุณรับผิดชอบใคร และใครเห็นข้อมูลของคุณได้',
    'export.inGuardiansNote':
      'เด็กทุกคนที่คุณเป็นผู้ปกครอง สิ่งที่คุณได้รับอนุญาตให้ดูและจัดการ และเวลาที่ได้รับการยืนยัน และในทางกลับกัน ทุกคนที่แพลตฟอร์มยืนยันแล้วว่าเป็นผู้ปกครองของคุณ',
    'export.inInvited': 'คนที่คุณเชิญ',
    'export.inInvitedNote':
      'ที่อยู่ที่คุณส่งการแชร์ไป สิ่งที่คุณแชร์ และมีการตอบรับหรือไม่ ไม่รวมตัวลิงก์เอง: ลิงก์คือสิ่งที่เปิดทางให้ผู้ถือเข้ามา',
    'export.inMoney': 'เงิน',
    'export.inMoneyNote':
      'คำสั่งซื้อในทุกบัญชีที่คุณเป็นสมาชิก สิ่งที่ซื้อ และหากคุณสอน รายได้และการจ่ายเงินให้คุณ จำนวนเงินแสดงตรงตามที่บันทึกไว้ ในสกุลเงินของมันเอง',
    'export.inSupport': 'การช่วยเหลือและข้อความ',
    'export.inSupportNote':
      'เรื่องที่คุณเปิดไว้ คำตอบที่คุณเห็นได้อยู่แล้ว การแจ้งเตือนทุกรายการที่ส่งถึงคุณ และอีเมลที่แพลตฟอร์มส่งหรือเข้าคิวรอส่งในนามของคุณ โดยลบลิงก์คำเชิญทุกลิงก์ออกแล้ว',
    'export.inActivity': 'กิจกรรมและอุปกรณ์',
    'export.inActivityNote':
      'เหตุการณ์ที่บันทึกไว้เกี่ยวกับการใช้ผลิตภัณฑ์ของคุณ และอุปกรณ์ที่ลงทะเบียนสำหรับบทเรียนออฟไลน์ รายงานสำหรับผู้สอนและเจ้าหน้าที่นับจากเหตุการณ์เดียวกันนี้',
    'export.outHeading': 'ไม่มีอะไรอยู่ในนั้น และเพราะอะไร',
    'export.outOthers': 'ถ้อยคำของคนอื่น',
    'export.outOthersNote':
      'คำตอบใต้โพสต์ของคุณ ข้อความของเพื่อนร่วมชั้น บันทึกของผู้สอนเกี่ยวกับผู้เรียนอีกคน: สิ่งเหล่านี้เป็นข้อมูลของพวกเขา ไม่ใช่ของคุณ แม้จะเกี่ยวข้องกับคุณก็ตาม',
    'export.outSignIn': 'ที่อยู่สำหรับเข้าสู่ระบบและรหัสผ่านของคุณ',
    'export.outSignInNote': 'ทั้งสองอย่างเก็บไว้ที่ผู้ให้บริการเข้าสู่ระบบ นอกฐานข้อมูลนี้',
    'export.outStaff': 'บันทึกภายในของเจ้าหน้าที่',
    'export.outStaffNote':
      'วิธีที่ทีมงานคุยกันเองเกี่ยวกับเรื่องขอความช่วยเหลือหรือการตรวจสอบ การเผยแพร่บันทึกเหล่านั้นจะทำให้มันไร้ประโยชน์ และมันไม่ใช่ระเบียนเกี่ยวกับคุณ',
    'export.outFiles': 'ตัวไฟล์ที่อัปโหลดเอง',
    'export.outFilesNote':
      'ไฟล์แนบจะแสดงเป็นรายการอ้างอิงเท่านั้น การคัดลอกวิดีโอที่เก็บไว้ทุกรายการลงในเอกสารเดียวเป็นอีกคุณสมบัติหนึ่ง ซึ่งมีขีดจำกัดขนาดของมันเอง',
    'export.outTokens': 'โทเค็นหลักฐานรับรอง',
    'export.outTokensNote':
      'โทเค็นยืนยันประกาศนียบัตรและลิงก์สำหรับแชร์คือสิ่งที่เปิดทางให้คนอื่นเข้ามา การพิมพ์สิ่งเหล่านี้ลงในสำเนาคือวิธีที่ทำให้มันไม่เป็นความลับอีกต่อไป',
    'export.outBoards': 'โพสต์ของคุณในการสนทนาของนักเรียนและการสนทนาของครู',
    'export.outBoardsNote':
      'ที่นั่นคุณเขียนด้วยชื่อผู้ใช้ เพื่อให้โพสต์ไม่มีชื่อของคุณติดอยู่ สำเนาที่นำโพสต์เหล่านั้นมาวางไว้ข้างชื่อของคุณจะทำให้สิ่งนี้หมดความหมาย โพสต์ยังอยู่ในการสนทนา ซึ่งคุณอ่านได้และถอนโพสต์ใดก็ได้ ส่วนคำถามและคำตอบที่คุณเขียนในหลักสูตรเป็นอีกเรื่องหนึ่ง สิ่งเหล่านั้นอยู่ในสำเนา',
    'export.after':
      'การดาวน์โหลดเป็นทางหนึ่ง และการกู้คืนเป็นอีกทางหนึ่ง: บางส่วนของสำเนานำกลับมาใส่ในบัญชีนี้หรือบัญชีใหม่ได้ การปิดบัญชีเป็นอีกเรื่องหนึ่งและย้อนกลับไม่ได้ สิ่งที่เกิดขึ้นกับระเบียนแต่ละประเภทเขียนไว้ในหน้านั้น',
    'export.printCrumb': 'สำหรับพิมพ์',
    'export.printTitle': 'สำเนาข้อมูลของคุณ',
    'export.printLede':
      'พิมพ์หน้านี้ หรือใช้หน้าต่างการพิมพ์ของเบราว์เซอร์เพื่อบันทึกเป็น PDF เบราว์เซอร์ของคุณเป็นผู้สร้าง PDF เอง',
    'export.printCounts':
      'การเปิดหน้านี้ได้จัดทำสำเนาหนึ่งชุด: นับเป็นหนึ่งในสิบชุดต่อชั่วโมง และถูกบันทึกเช่นเดียวกับการดาวน์โหลด การโหลดหน้าใหม่จะจัดทำอีกชุดหนึ่ง',
    'export.printMade': 'จัดทำเมื่อ: {when}',
    'export.printCut': 'รายการเหล่านี้ยาวเกินขีดจำกัดและถูกตัด: {lists}',
    'export.printSheet': 'ดาวน์โหลดเป็นสเปรดชีต',
    'export.printJson': 'ดาวน์โหลดเป็น JSON',
    'export.printEmpty': 'ยังไม่มีสิ่งใดบันทึกไว้สำหรับบัญชีนี้',
    'export.printSame':
      'นี่คือระเบียนเดียวกับที่อยู่ในการดาวน์โหลดทั้งสองแบบ สิ่งที่จงใจไม่รวมไว้ และเหตุผล อยู่ในหน้าส่งออก',
    'export.printBack': 'กลับไปหน้าส่งออก',
  },
  fil: {
    'export.crumb': 'Pag-export',
    'export.title': 'Kumuha ng kopya ng iyong data',
    'export.lede':
      'Isang kopya ng hawak ng platform na ito tungkol sa iyo, maliban sa mga nakalista sa ibaba: ang iyong account, ang mga kursong kinabibilangan mo, ang isinulat mo, ang mga minarkahan sa iyo, ang binili mo, at ang mga mensaheng ipinadala sa iyo.',
    'export.how':
      'Ginagawa ang bawat kopya kapag hiniling mo, kaya napapanahon ito sa sandaling iyon. Makagagawa ka ng sampung kopya bawat oras; pinoprotektahan ng limitasyong iyon ang platform at hindi ito para higpitan ka.',
    'export.cap':
      'Ang listahang mas mahaba sa {count} hilera ay pinuputol sa bilang na iyon, at pinapangalanan ng kopya ang bawat listahang pinutol.',
    'export.json': 'I-download ang kopya (JSON)',
    'export.jsonNote':
      'Ang buong kopya bilang isang JSON file: bawat field, kasama ang mga hindi ipinapakita ng anumang screen. Nabubuksan ito sa anumang text editor. Para sa developer, o para magtago ng kopyang masusuri mo sa ibang pagkakataon.',
    'export.sheet': 'I-download ang kopya (spreadsheet)',
    'export.sheetNote':
      'Isang spreadsheet na may isang seksyon para sa bawat bahagi ng iyong account at isang blangkong hilera sa pagitan ng mga seksyon. Nabubuksan ito sa Excel, Numbers, LibreOffice o Google Sheets.',
    'export.read': 'Basahin dito, o i-save bilang PDF',
    'export.readNote':
      'Isang pahinang mababasa mo sa browser at maipi-print, o mai-save bilang PDF mula sa sarili mong print dialog. Ang browser mo mismo ang gumagawa ng PDF. Ang pagbukas ng pahina ay binibilang bilang isa sa iyong sampung kopya.',
    'export.english':
      'Nasa Ingles ang mga pangalan ng seksyon at field sa loob ng kopya, dahil sa mga pangalang iyon nakaimbak ang mga tala.',
    'export.audit':
      'Bawat kopya ay itinatala sa audit record, kasama ang petsa at kung ilang hilera ang nasa bawat seksyon. Ang talang iyon ang dahilan kung bakit matutunton ang hindi inaasahang kopya ng data ng isang tao.',
    'export.preparing': 'Ginagawa ang iyong kopya…',
    'export.done': 'Nagawa na ang iyong kopya at ibinigay sa browser mo para i-save.',
    'export.limit':
      'Sampung kopya na ang nagawa sa nakaraang oras, at iyon ang limitasyon. Maghintay sandali, saka humiling muli.',
    'export.failed': 'Hindi magawa ang kopya sa ngayon. Humiling muli sa ilang sandali.',
    'export.signedOut': 'Naka-sign out ka. Mag-sign in muli para makakuha ng kopya.',
    'export.inHeading': 'Ano ang nasa loob nito',
    'export.inAccount': 'Ang iyong account',
    'export.inAccountNote':
      'Ipinapakitang pangalan, wika, time zone, bansa, katayuan, at ang mga tungkuling hawak mo (guro, tagasuri, kawani), kung mayroon.',
    'export.inLearners': 'Mga profile ng mag-aaral',
    'export.inLearnersNote':
      'Ang sa iyo, at ang sa mga mag-aaral na ikaw sa kasalukuyan ang beripikadong tagapag-alaga na may pahintulot na makita ang progreso. Kasama nila ang kanilang mga pagpapatala, progreso, pagsubok at sertipiko.',
    'export.inWrote': 'Ang isinulat mo',
    'export.inWroteNote':
      'Mga tala sa aralin, bookmark, mga naka-save na kurso at ang pribadong talang inilagay mo sa tabi ng isa, mga review, mga post sa talakayan, mga ipinasang takdang-gawain at mga sagot sa pagsusulit.',
    'export.inGuardians': 'Kanino ka may pananagutan, at sino ang makakakita sa iyo',
    'export.inGuardiansNote':
      'Bawat batang ikaw ang tagapag-alaga, kung ano ang pinapayagan kang makita at pamahalaan, at kung kailan iyon naberipika; at sa kabilang banda, sinumang naberipika ng platform bilang tagapag-alaga mo.',
    'export.inInvited': 'Mga taong inimbitahan mo',
    'export.inInvitedNote':
      'Ang address na pinadalhan mo ng ibinahagi, kung ano ang ibinahagi mo, at kung tinanggap ito. Hindi ang link mismo: ang link ang nagpapapasok sa may hawak nito.',
    'export.inMoney': 'Pera',
    'export.inMoneyNote':
      'Mga order sa anumang account na kinabibilangan mo, kung ano ang binili, at, kung nagtuturo ka, ang iyong kinita at mga bayad sa iyo. Lumalabas ang mga halaga nang eksakto sa pagkakatala, sa sarili nitong pera.',
    'export.inSupport': 'Suporta at mga mensahe',
    'export.inSupportNote':
      'Ang mga kasong binuksan mo, ang mga sagot na nakikita mo na, bawat abisong ipinadala sa iyo, at ang email na ipinadala o ipinila ng platform para sa iyo, na binura ang bawat link ng imbitasyon.',
    'export.inActivity': 'Aktibidad at mga device',
    'export.inActivityNote':
      'Mga pangyayaring naitala tungkol sa paggamit mo ng produkto, at mga device na nakarehistro para sa mga offline na aralin. Ang mga ulat para sa mga guro at kawani ay binibilang mula sa parehong mga pangyayari.',
    'export.outHeading': 'Ano ang wala rito, at bakit',
    'export.outOthers': 'Mga salita ng ibang tao',
    'export.outOthersNote':
      'Isang sagot sa ilalim ng post mo, mensahe ng kaklase, tala ng guro tungkol sa ibang mag-aaral: data nila iyon, hindi sa iyo, kahit may kinalaman ito sa iyo.',
    'export.outSignIn': 'Ang iyong address sa pag-sign in at password',
    'export.outSignInNote':
      'Parehong hawak ng provider ng pag-sign in, sa labas ng database na ito.',
    'export.outStaff': 'Mga panloob na tala ng kawani',
    'export.outStaffNote':
      'Kung paano nag-uusap ang team sa kanilang sarili tungkol sa isang kaso ng suporta o isang pagsusuri. Kapag inilathala ang mga talang iyon, mawawalan ito ng silbi, at hindi ito tala tungkol sa iyo.',
    'export.outFiles': 'Ang mismong mga in-upload na file',
    'export.outFilesNote':
      'Nakalista ang mga attachment bilang sanggunian. Ang pagkopya ng bawat nakaimbak na video sa isang dokumento ay ibang feature, na may sarili nitong mga limitasyon sa laki.',
    'export.outTokens': 'Mga token ng kredensyal',
    'export.outTokensNote':
      'Ang mga token sa pagberipika ng sertipiko at mga link sa pagbabahagi ang nagpapapasok sa ibang tao. Ang pag-print ng mga ito sa isang kopya ang paraan para hindi na ito maging lihim.',
    'export.outBoards': 'Ang mga post mo sa talakayan ng mga mag-aaral at ng mga guro',
    'export.outBoardsNote':
      'Doon ay sumusulat ka gamit ang username, para hindi dala ng post ang pangalan mo. Mawawalan iyon ng saysay kung ilalagay ng kopya ang mga post na iyon sa tabi ng pangalan mo. Nananatili ang mga ito sa talakayan, kung saan mababasa mo ang mga ito at mababawi ang alinman. Iba ang mga tanong at sagot na isinulat mo sa isang kurso: kasama ang mga iyon sa kopya.',
    'export.after':
      'Isang direksyon ang pag-download at ang kabila naman ang pagbabalik: maibabalik ang bahagi ng isang kopya sa account na ito o sa bago. Hiwalay ang pagsasara ng iyong account at hindi na ito mababawi; nakasulat sa pahinang iyon ang nangyayari sa bawat uri ng tala.',
    'export.printCrumb': 'Para i-print',
    'export.printTitle': 'Isang kopya ng iyong data',
    'export.printLede':
      'I-print ang pahinang ito, o gamitin ang print dialog ng browser mo para i-save ito bilang PDF. Ang browser mo mismo ang gumagawa ng PDF.',
    'export.printCounts':
      'Gumawa ng kopya ang pagbukas ng pahinang ito: binibilang ito bilang isa sa sampu bawat oras at itinatala gaya ng isang download. Gagawa ng isa pa ang pag-reload ng pahina.',
    'export.printMade': 'Ginawa: {when}',
    'export.printCut': 'Mas mahaba sa limitasyon ang mga listahang ito at pinutol: {lists}',
    'export.printSheet': 'I-download bilang spreadsheet',
    'export.printJson': 'I-download bilang JSON',
    'export.printEmpty': 'Wala pang naitatala para sa account na ito.',
    'export.printSame':
      'Ito ang parehong talang laman ng dalawang download. Ang sadyang hindi isinama, at kung bakit, ay nasa pahina ng pag-export.',
    'export.printBack': 'Bumalik sa pahina ng pag-export',
  },
  uz: {
    'export.crumb': 'Eksport',
    'export.title': 'Maʼlumotlaringiz nusxasini oling',
    'export.lede':
      'Bu platforma siz haqingizda saqlayotgan narsalarning bitta nusxasi, quyida sanab oʻtilgan istisnolardan tashqari: hisobingiz, siz yozilgan kurslar, yozganlaringiz, baholangan ishlaringiz, sotib olganlaringiz va sizga yuborilgan xabarlar.',
    'export.how':
      'Har bir nusxa siz soʻragan paytda tayyorlanadi, shuning uchun u oʻsha lahzagacha yangi boʻladi. Soatiga oʻnta nusxa olishingiz mumkin; bu cheklov platformani himoya qiladi va sizni cheklash uchun emas.',
    'export.cap':
      '{count} qatordan uzun roʻyxat shu sonda kesiladi va nusxada kesilgan har bir roʻyxatning nomi koʻrsatiladi.',
    'export.json': 'Nusxani yuklab olish (JSON)',
    'export.jsonNote':
      'Butun nusxa bitta JSON fayl sifatida: har bir maydon, hech bir ekranda koʻrsatilmaydiganlari ham. Istalgan matn muharririda ochiladi. Dasturchi uchun yoki keyinroq tekshirib koʻrish mumkin boʻlgan nusxani saqlab qoʻyish uchun.',
    'export.sheet': 'Nusxani yuklab olish (elektron jadval)',
    'export.sheetNote':
      'Hisobingizning har bir qismi uchun bittadan boʻlim va boʻlimlar orasida boʻsh qator boʻlgan elektron jadval. Excel, Numbers, LibreOffice yoki Google Sheets dasturida ochiladi.',
    'export.read': 'Shu yerda oʻqish yoki PDF sifatida saqlash',
    'export.readNote':
      'Brauzerda oʻqib, chop etishingiz yoki oʻzingizning chop etish oynangizdan PDF sifatida saqlashingiz mumkin boʻlgan sahifa. PDF faylni brauzeringizning oʻzi yaratadi. Sahifani ochish oʻnta nusxangizdan biri hisoblanadi.',
    'export.english':
      'Nusxa ichidagi boʻlim va maydon nomlari ingliz tilida, chunki yozuvlar shu nomlar bilan saqlanadi.',
    'export.audit':
      'Har bir nusxa sanasi va har bir boʻlimdagi qatorlar soni bilan birga audit qaydiga yoziladi. Aynan shu qayd kimningdir maʼlumotlaridan kutilmagan nusxa olinganini aniqlash imkonini beradi.',
    'export.preparing': 'Nusxangiz tayyorlanmoqda…',
    'export.done': 'Nusxangiz tayyorlandi va saqlash uchun brauzeringizga topshirildi.',
    'export.limit':
      'Soʻnggi bir soat ichida oʻnta nusxa olindi, cheklov shu. Biroz kuting, keyin qayta soʻrang.',
    'export.failed': 'Nusxani hozir tayyorlab boʻlmadi. Birozdan keyin qayta soʻrang.',
    'export.signedOut': 'Siz hisobdan chiqqansiz. Nusxa olish uchun qayta kiring.',
    'export.inHeading': 'Unda nimalar bor',
    'export.inAccount': 'Hisobingiz',
    'export.inAccountNote':
      'Koʻrinadigan ism, til, vaqt mintaqasi, mamlakat, holat va zimmangizdagi rollar (oʻqituvchi, tekshiruvchi, xodim), agar boʻlsa.',
    'export.inLearners': 'Oʻquvchi profillari',
    'export.inLearnersNote':
      'Oʻzingizniki hamda hozirda siz tasdiqlangan vasiysi boʻlgan va oʻzlashtirishini koʻrishga ruxsatingiz bor oʻquvchilarniki. Ularning kursga yozilishlari, oʻzlashtirishi, urinishlari va sertifikatlari ham birga keladi.',
    'export.inWrote': 'Yozganlaringiz',
    'export.inWroteNote':
      'Dars qaydlari, xatchoʻplar, saqlangan kurslar va ularning yoniga qoʻygan shaxsiy qaydingiz, sharhlar, muhokama xabarlari, topshirilgan vazifalar va test javoblari.',
    'export.inGuardians': 'Kimlar uchun masʼulsiz va sizni kimlar koʻra oladi',
    'export.inGuardiansNote':
      'Siz vasiysi boʻlgan har bir bola, nimalarni koʻrish va boshqarishga ruxsatingiz borligi hamda bu qachon tasdiqlangani; boshqa tomondan esa, platforma sizning vasiyingiz deb tasdiqlagan har bir kishi.',
    'export.inInvited': 'Siz taklif qilgan kishilar',
    'export.inInvitedNote':
      'Ulashuvni yuborgan manzilingiz, nimani ulashganingiz va u qabul qilingan-qilinmagani. Havolaning oʻzi emas: havola uni ushlab turgan kishini ichkariga kiritadigan narsadir.',
    'export.inMoney': 'Pul',
    'export.inMoneyNote':
      'Siz aʼzo boʻlgan har qanday hisobdagi buyurtmalar, nima sotib olingani va agar dars bersangiz, daromadingiz hamda sizga qilingan toʻlovlar. Summalar aynan qayd etilganidek, oʻz valyutasida koʻrsatiladi.',
    'export.inSupport': 'Yordam va xabarlar',
    'export.inSupportNote':
      'Siz ochgan murojaatlar, shundoq ham koʻra oladigan javoblaringiz, sizga yuborilgan har bir bildirishnoma va platforma sizning nomingizdan yuborgan yoki navbatga qoʻygan elektron xatlar; har bir taklif havolasi oʻchirilgan holda.',
    'export.inActivity': 'Faollik va qurilmalar',
    'export.inActivityNote':
      'Mahsulotdan foydalanishingiz haqida qayd etilgan hodisalar va oflayn darslar uchun roʻyxatdan oʻtgan qurilmalar. Oʻqituvchilar va xodimlar uchun hisobotlar ham shu hodisalardan sanaladi.',
    'export.outHeading': 'Unda nimalar yoʻq va nima uchun',
    'export.outOthers': 'Boshqalarning soʻzlari',
    'export.outOthersNote':
      'Xabaringiz ostidagi javob, sinfdoshingizning xabari, oʻqituvchining boshqa oʻquvchi haqidagi qaydi: bular sizga tegishli boʻlsa ham, sizning emas, ularning maʼlumotlaridir.',
    'export.outSignIn': 'Kirish manzilingiz va parolingiz',
    'export.outSignInNote':
      'Ikkalasi ham bu maʼlumotlar bazasidan tashqarida, kirish xizmati provayderida saqlanadi.',
    'export.outStaff': 'Xodimlarning ichki qaydlari',
    'export.outStaffNote':
      'Jamoaning yordam murojaati yoki tekshiruv haqida oʻzaro gaplashishi. Bu qaydlarni eʼlon qilish ularni foydasiz qilib qoʻyadi, qolaversa, ular siz haqingizdagi yozuv emas.',
    'export.outFiles': 'Yuklangan fayllarning oʻzi',
    'export.outFilesNote':
      'Ilovalar faqat havola tarzida sanab oʻtiladi. Saqlangan har bir videoni bitta hujjatga nusxalash boshqa imkoniyat boʻlib, uning oʻz hajm cheklovlari bor.',
    'export.outTokens': 'Hisob maʼlumoti tokenlari',
    'export.outTokensNote':
      'Sertifikatni tekshirish tokenlari va ulashish havolalari boshqalarni ichkariga kiritadigan narsalardir. Ularni nusxada chop etish ularning sir boʻlmay qolishiga olib keladi.',
    'export.outBoards': 'Oʻquvchilar va oʻqituvchilar muhokamasidagi xabarlaringiz',
    'export.outBoardsNote':
      'U yerda foydalanuvchi nomi bilan yozasiz, shunda xabarda ismingiz boʻlmaydi. Oʻsha xabarlarni ismingiz yoniga qoʻyadigan nusxa buni yoʻqqa chiqaradi. Ular muhokamada qoladi; u yerda ularni oʻqishingiz va istalganini qaytarib olishingiz mumkin. Kursda yozgan savol va javoblaringiz boshqa narsa: ular nusxada bor.',
    'export.after':
      'Yuklab olish bir yoʻnalish, tiklash esa ikkinchisi: nusxaning bir qismini shu hisobga yoki yangi hisobga qaytarib qoʻyish mumkin. Hisobni yopish alohida ish va uni ortga qaytarib boʻlmaydi; har bir turdagi yozuv bilan nima boʻlishi oʻsha sahifada yozilgan.',
    'export.printCrumb': 'Chop etish uchun',
    'export.printTitle': 'Maʼlumotlaringiz nusxasi',
    'export.printLede':
      'Bu sahifani chop eting yoki brauzeringizning chop etish oynasi orqali PDF sifatida saqlang. PDF faylni brauzeringizning oʻzi yaratadi.',
    'export.printCounts':
      'Bu sahifani ochish bitta nusxa yaratdi: u soatiga oʻntadan biri hisoblanadi va yuklab olish kabi qayd etiladi. Sahifani qayta yuklash yana bitta nusxa yaratadi.',
    'export.printMade': 'Tayyorlangan vaqti: {when}',
    'export.printCut': 'Quyidagi roʻyxatlar cheklovdan uzun edi va kesildi: {lists}',
    'export.printSheet': 'Elektron jadval sifatida yuklab olish',
    'export.printJson': 'JSON sifatida yuklab olish',
    'export.printEmpty': 'Bu hisob uchun hali hech narsa qayd etilmagan.',
    'export.printSame':
      'Bu ikkala yuklab olishdagi yozuvning aynan oʻzi. Ataylab qoldirilgan narsalar va buning sababi eksport sahifasida.',
    'export.printBack': 'Eksport sahifasiga qaytish',
  },
  kk: {
    'export.crumb': 'Экспорт',
    'export.title': 'Деректеріңіздің көшірмесін алыңыз',
    'export.lede':
      'Осы платформа сіз туралы сақтайтын нәрселердің бір көшірмесі, төменде аталған ерекшеліктерді қоспағанда: тіркелгіңіз, сіз жазылған курстар, жазғандарыңыз, бағаланған жұмыстарыңыз, сатып алғандарыңыз және сізге жіберілген хабарлар.',
    'export.how':
      'Әр көшірме сіз сұраған кезде жасалады, сондықтан ол сол сәтке дейін жаңа болады. Сағатына он көшірме жасай аласыз; бұл шек платформаны қорғайды және сізді шектеу үшін қойылмаған.',
    'export.cap':
      '{count} жолдан ұзын тізім сол санда қиылады, ал көшірмеде қиылған әр тізімнің аты көрсетіледі.',
    'export.json': 'Көшірмені жүктеп алу (JSON)',
    'export.jsonNote':
      'Бүкіл көшірме бір JSON файлы ретінде: әр өріс, ешбір экран көрсетпейтіндері де. Кез келген мәтін өңдегішінде ашылады. Әзірлеуші үшін немесе кейін тексере алатын көшірмені сақтап қою үшін.',
    'export.sheet': 'Көшірмені жүктеп алу (электрондық кесте)',
    'export.sheetNote':
      'Тіркелгіңіздің әр бөлігі үшін бір бөлімі және бөлімдер арасында бос жолы бар электрондық кесте. Excel, Numbers, LibreOffice немесе Google Sheets бағдарламасында ашылады.',
    'export.read': 'Осы жерде оқу немесе PDF ретінде сақтау',
    'export.readNote':
      'Браузерде оқып, басып шығаруға немесе өз басып шығару терезеңізден PDF ретінде сақтауға болатын бет. PDF файлын браузеріңіздің өзі жасайды. Бетті ашу он көшірмеңіздің бірі болып есептеледі.',
    'export.english':
      'Көшірме ішіндегі бөлім мен өріс атаулары ағылшын тілінде, өйткені жазбалар осы атаулармен сақталады.',
    'export.audit':
      'Әр көшірме күнімен және әр бөлімдегі жолдар санымен бірге аудит журналына жазылады. Біреудің деректерінің күтпеген көшірмесін қадағалауға мүмкіндік беретін дәл осы жазба.',
    'export.preparing': 'Көшірмеңіз жасалып жатыр…',
    'export.done': 'Көшірмеңіз жасалды және сақтау үшін браузеріңізге берілді.',
    'export.limit': 'Соңғы бір сағатта он көшірме жасалды, шек осы. Сәл күтіп, қайта сұраңыз.',
    'export.failed': 'Көшірмені дәл қазір жасау мүмкін болмады. Сәлден соң қайта сұраңыз.',
    'export.signedOut': 'Сіз тіркелгіден шыққансыз. Көшірме алу үшін қайта кіріңіз.',
    'export.inHeading': 'Онда не бар',
    'export.inAccount': 'Тіркелгіңіз',
    'export.inAccountNote':
      'Көрсетілетін ат, тіл, уақыт белдеуі, ел, күй және атқаратын рөлдеріңіз (мұғалім, тексеруші, қызметкер), егер болса.',
    'export.inLearners': 'Оқушы профильдері',
    'export.inLearnersNote':
      'Өз профиліңіз және қазір сіз расталған қамқоршысы болып табылатын, үлгерімін көруге рұқсатыңыз бар оқушылардың профильдері. Олардың курсқа жазылулары, үлгерімі, әрекеттері мен сертификаттары бірге келеді.',
    'export.inWrote': 'Жазғандарыңыз',
    'export.inWroteNote':
      'Сабақ жазбалары, бетбелгілер, сақталған курстар және солардың бірінің жанына қойған жеке жазбаңыз, пікірлер, талқылау хабарлары, тапсырылған тапсырмалар мен тест жауаптары.',
    'export.inGuardians': 'Кімге жауаптысыз және сізді кім көре алады',
    'export.inGuardiansNote':
      'Сіз қамқоршысы болып табылатын әр бала, нені көруге және басқаруға рұқсатыңыз бар екені және оның қашан расталғаны; екінші жағынан, платформа сіздің қамқоршыңыз деп растаған әр адам.',
    'export.inInvited': 'Сіз шақырған адамдар',
    'export.inInvitedNote':
      'Бөлісуді жіберген мекенжайыңыз, немен бөліскеніңіз және оның қабылданған-қабылданбағаны. Сілтеменің өзі емес: сілтеме оны ұстаушыны ішке кіргізетін нәрсе.',
    'export.inMoney': 'Ақша',
    'export.inMoneyNote':
      'Сіз мүше кез келген тіркелгідегі тапсырыстар, не сатып алынғаны және сабақ берсеңіз, табысыңыз бен сізге жасалған төлемдер. Сомалар дәл жазылғандай, өз валютасында көрсетіледі.',
    'export.inSupport': 'Қолдау және хабарлар',
    'export.inSupportNote':
      'Сіз ашқан өтініштер, онсыз да көре алатын жауаптарыңыз, сізге жіберілген әр хабарландыру және платформа сіздің атыңыздан жіберген немесе кезекке қойған электрондық хаттар; әр шақыру сілтемесі өшірілген күйде.',
    'export.inActivity': 'Белсенділік және құрылғылар',
    'export.inActivityNote':
      'Өнімді пайдалануыңыз туралы тіркелген оқиғалар және офлайн сабақтар үшін тіркелген құрылғылар. Мұғалімдер мен қызметкерлерге арналған есептер де осы оқиғалардан саналады.',
    'export.outHeading': 'Онда не жоқ және неліктен',
    'export.outOthers': 'Басқа адамдардың сөздері',
    'export.outOthersNote':
      'Хабарыңыздың астындағы жауап, сыныптасыңыздың хабары, мұғалімнің басқа оқушы туралы жазбасы: сізге қатысты болса да, бұлар сіздің емес, солардың деректері.',
    'export.outSignIn': 'Кіру мекенжайыңыз бен құпиясөзіңіз',
    'export.outSignInNote': 'Екеуі де осы дерекқордан тыс, кіру қызметін жеткізушіде сақталады.',
    'export.outStaff': 'Қызметкерлердің ішкі жазбалары',
    'export.outStaffNote':
      'Топтың қолдау өтініші немесе тексеру туралы өзара сөйлесуі. Бұл жазбаларды жариялау оларды пайдасыз етеді, оның үстіне олар сіз туралы жазба емес.',
    'export.outFiles': 'Жүктеп салынған файлдардың өзі',
    'export.outFilesNote':
      'Тіркемелер тек сілтеме ретінде тізімделеді. Сақталған әр бейнені бір құжатқа көшіру бөлек мүмкіндік, оның өз көлем шектері бар.',
    'export.outTokens': 'Тіркелу деректерінің токендері',
    'export.outTokensNote':
      'Сертификатты растау токендері мен бөлісу сілтемелері басқа адамдарды ішке кіргізетін нәрселер. Оларды көшірмеде басып шығару олардың құпия болудан қалуына әкеледі.',
    'export.outBoards': 'Оқушылар мен мұғалімдер талқылауындағы хабарларыңыз',
    'export.outBoardsNote':
      'Онда пайдаланушы атымен жазасыз, сонда хабарда атыңыз болмайды. Сол хабарларды атыңыздың жанына қоятын көшірме мұны жоққа шығарады. Олар талқылауда қалады; сол жерде оларды оқып, кез келгенін қайтарып ала аласыз. Курста жазған сұрақтарыңыз бен жауаптарыңыз — бөлек нәрсе: олар көшірмеде бар.',
    'export.after':
      'Жүктеп алу бір бағыт, ал қалпына келтіру екінші бағыт: көшірменің бір бөлігін осы тіркелгіге немесе жаңа тіркелгіге қайта қоюға болады. Тіркелгіні жабу бөлек іс және оны кері қайтару мүмкін емес; жазбаның әр түрімен не болатыны сол бетте жазылған.',
    'export.printCrumb': 'Басып шығару үшін',
    'export.printTitle': 'Деректеріңіздің көшірмесі',
    'export.printLede':
      'Осы бетті басып шығарыңыз немесе браузеріңіздің басып шығару терезесі арқылы PDF ретінде сақтаңыз. PDF файлын браузеріңіздің өзі жасайды.',
    'export.printCounts':
      'Осы бетті ашу бір көшірме жасады: ол сағатына онның бірі болып есептеледі және жүктеп алу сияқты тіркеледі. Бетті қайта жүктеу тағы біреуін жасайды.',
    'export.printMade': 'Жасалған уақыты: {when}',
    'export.printCut': 'Мына тізімдер шектен ұзын болды және қиылды: {lists}',
    'export.printSheet': 'Электрондық кесте ретінде жүктеп алу',
    'export.printJson': 'JSON ретінде жүктеп алу',
    'export.printEmpty': 'Бұл тіркелгі бойынша әлі ештеңе тіркелмеген.',
    'export.printSame':
      'Бұл екі жүктеп алудың ішіндегі дәл сол жазба. Әдейі тыс қалдырылғандар және оның себебі экспорт бетінде.',
    'export.printBack': 'Экспорт бетіне оралу',
  },
  az: {
    'export.crumb': 'İxrac',
    'export.title': 'Məlumatlarınızın surətini əldə edin',
    'export.lede':
      'Bu platformanın sizin haqqınızda saxladıqlarının bir surəti, aşağıda sadalanan istisnalarla: hesabınız, yazıldığınız kurslar, yazdıqlarınız, qiymətləndirildiyiniz işlər, aldıqlarınız və sizə göndərilən mesajlar.',
    'export.how':
      'Hər surət siz istədiyiniz anda hazırlanır, ona görə də həmin ana qədər yenidir. Saatda on surət hazırlaya bilərsiniz; bu hədd platformanı qoruyur və sizi məhdudlaşdırmaq üçün deyil.',
    'export.cap':
      '{count} sətirdən uzun siyahı həmin sayda kəsilir və surətdə kəsilən hər siyahının adı göstərilir.',
    'export.json': 'Surəti endir (JSON)',
    'export.jsonNote':
      'Bütün surət bir JSON faylı kimi: hər sahə, heç bir ekranın göstərmədikləri də daxil olmaqla. İstənilən mətn redaktorunda açılır. Proqramçı üçün və ya sonradan yoxlaya biləcəyiniz bir surət saxlamaq üçün.',
    'export.sheet': 'Surəti endir (elektron cədvəl)',
    'export.sheetNote':
      'Hesabınızın hər hissəsi üçün bir bölməsi və bölmələr arasında boş sətri olan elektron cədvəl. Excel, Numbers, LibreOffice və ya Google Sheets proqramında açılır.',
    'export.read': 'Burada oxuyun və ya PDF kimi saxlayın',
    'export.readNote':
      'Brauzerdə oxuyub çap edə biləcəyiniz və ya öz çap pəncərənizdən PDF kimi saxlaya biləcəyiniz səhifə. PDF faylını brauzeriniz özü yaradır. Səhifəni açmaq on surətinizdən biri sayılır.',
    'export.english':
      'Surətin içindəki bölmə və sahə adları ingiliscədir, çünki qeydlər bu adlarla saxlanılır.',
    'export.audit':
      'Hər surət tarixi və hər bölmədəki sətirlərin sayı ilə birlikdə audit jurnalına yazılır. Kiminsə məlumatlarının gözlənilməz surətini izləməyi mümkün edən məhz bu qeyddir.',
    'export.preparing': 'Surətiniz hazırlanır…',
    'export.done': 'Surətiniz hazırlandı və saxlamaq üçün brauzerinizə verildi.',
    'export.limit':
      'Son bir saatda on surət hazırlanıb və hədd budur. Bir az gözləyin, sonra yenidən istəyin.',
    'export.failed': 'Surəti indi hazırlamaq mümkün olmadı. Bir azdan yenidən istəyin.',
    'export.signedOut': 'Hesabdan çıxmısınız. Surət almaq üçün yenidən daxil olun.',
    'export.inHeading': 'İçində nə var',
    'export.inAccount': 'Hesabınız',
    'export.inAccountNote':
      'Görünən ad, dil, saat qurşağı, ölkə, vəziyyət və daşıdığınız rollar (müəllim, yoxlayıcı, əməkdaş), əgər varsa.',
    'export.inLearners': 'Öyrənən profilləri',
    'export.inLearnersNote':
      'Öz profiliniz və hazırda təsdiqlənmiş qəyyumu olduğunuz, irəliləyişini görməyə icazəniz olan öyrənənlərin profilləri. Onların qeydiyyatları, irəliləyişi, cəhdləri və sertifikatları da bunlarla birlikdə gəlir.',
    'export.inWrote': 'Yazdıqlarınız',
    'export.inWroteNote':
      'Dərs qeydləri, əlfəcinlər, saxlanılmış kurslar və birinin yanına qoyduğunuz şəxsi qeyd, rəylər, müzakirə yazıları, təhvil verilmiş tapşırıqlar və test cavabları.',
    'export.inGuardians': 'Kimlərə cavabdehsiniz və sizi kim görə bilər',
    'export.inGuardiansNote':
      'Qəyyumu olduğunuz hər uşaq, nəyi görməyə və idarə etməyə icazəniz olduğu və bunun nə vaxt təsdiqləndiyi; digər tərəfdən isə platformanın sizin qəyyumunuz kimi təsdiqlədiyi hər kəs.',
    'export.inInvited': 'Dəvət etdiyiniz şəxslər',
    'export.inInvitedNote':
      'Paylaşımı göndərdiyiniz ünvan, nəyi paylaşdığınız və onun qəbul edilib-edilmədiyi. Keçidin özü yox: keçid onu əlində tutanı içəri buraxan şeydir.',
    'export.inMoney': 'Pul',
    'export.inMoneyNote':
      'Üzvü olduğunuz istənilən hesabdakı sifarişlər, nəyin alındığı və dərs deyirsinizsə, qazancınız və sizə edilən ödənişlər. Məbləğlər məhz qeyd edildiyi kimi, öz valyutasında göstərilir.',
    'export.inSupport': 'Dəstək və mesajlar',
    'export.inSupportNote':
      'Açdığınız müraciətlər, onsuz da görə bildiyiniz cavablar, sizə göndərilən hər bildiriş və platformanın sizin adınızdan göndərdiyi və ya növbəyə qoyduğu e-poçt; hər dəvət keçidi silinmiş halda.',
    'export.inActivity': 'Fəaliyyət və cihazlar',
    'export.inActivityNote':
      'Məhsuldan istifadəniz barədə qeydə alınan hadisələr və oflayn dərslər üçün qeydiyyatdan keçmiş cihazlar. Müəllimlər və əməkdaşlar üçün hesabatlar da eyni hadisələrdən sayılır.',
    'export.outHeading': 'İçində nə yoxdur və niyə',
    'export.outOthers': 'Başqalarının sözləri',
    'export.outOthersNote':
      'Yazınızın altındakı cavab, sinif yoldaşınızın mesajı, müəllimin başqa öyrənən haqqında qeydi: sizə aid olsa belə, bunlar sizin yox, onların məlumatıdır.',
    'export.outSignIn': 'Giriş ünvanınız və parolunuz',
    'export.outSignInNote':
      'Hər ikisi bu verilənlər bazasından kənarda, giriş xidməti təchizatçısında saxlanılır.',
    'export.outStaff': 'Əməkdaşların daxili qeydləri',
    'export.outStaffNote':
      'Komandanın bir dəstək müraciəti və ya yoxlama barədə öz arasında danışığı. Bu qeydləri dərc etmək onları faydasız edər, üstəlik onlar sizin haqqınızda qeyd deyil.',
    'export.outFiles': 'Yüklənmiş faylların özü',
    'export.outFilesNote':
      'Qoşmalar yalnız istinad kimi sadalanır. Saxlanılan hər videonu bir sənədə köçürmək ayrı bir funksiyadır və onun öz ölçü hədləri var.',
    'export.outTokens': 'Etimadnamə tokenləri',
    'export.outTokensNote':
      'Sertifikat yoxlama tokenləri və paylaşım keçidləri başqalarını içəri buraxan şeylərdir. Onları surətdə çap etmək onların sirr olmaqdan çıxması deməkdir.',
    'export.outBoards': 'Tələbələrin və müəllimlərin müzakirəsindəki yazılarınız',
    'export.outBoardsNote':
      'Orada istifadəçi adı ilə yazırsınız ki, yazıda adınız olmasın. Həmin yazıları adınızın yanına qoyan surət bunu heçə endirər. Onlar müzakirədə qalır; orada onları oxuya və istədiyinizi geri götürə bilərsiniz. Kursda yazdığınız suallar və cavablar başqa şeydir: onlar surətdədir.',
    'export.after':
      'Endirmək bir istiqamətdir, bərpa etmək isə digəri: surətin bir hissəsi bu hesaba və ya yeni hesaba geri qoyula bilər. Hesabı bağlamaq ayrı işdir və geri qaytarıla bilməz; hər növ qeydlə nə baş verdiyi həmin səhifədə yazılıb.',
    'export.printCrumb': 'Çap üçün',
    'export.printTitle': 'Məlumatlarınızın surəti',
    'export.printLede':
      'Bu səhifəni çap edin və ya brauzerinizin çap pəncərəsi ilə PDF kimi saxlayın. PDF faylını brauzeriniz özü yaradır.',
    'export.printCounts':
      'Bu səhifənin açılması bir surət yaratdı: o, saatda ondan biri sayılır və endirmə kimi qeydə alınır. Səhifəni yenidən yükləmək daha birini yaradır.',
    'export.printMade': 'Hazırlanma vaxtı: {when}',
    'export.printCut': 'Bu siyahılar həddən uzun idi və kəsildi: {lists}',
    'export.printSheet': 'Elektron cədvəl kimi endir',
    'export.printJson': 'JSON kimi endir',
    'export.printEmpty': 'Bu hesab üçün hələ heç nə qeydə alınmayıb.',
    'export.printSame':
      'Bu, iki endirmənin içindəki eyni qeyddir. Qəsdən kənarda saxlananlar və bunun səbəbi ixrac səhifəsindədir.',
    'export.printBack': 'İxrac səhifəsinə qayıt',
  },
  tg: {
    'export.crumb': 'Содирот',
    'export.title': 'Нусхаи маълумоти худро гиред',
    'export.lede':
      'Як нусхаи он чи ин платформа дар бораи шумо нигоҳ медорад, бо истисноҳое, ки дар поён номбар шудаанд: ҳисоби шумо, курсҳое, ки ба онҳо номнавис шудаед, он чи навиштаед, он чи барояш баҳо гирифтаед, он чи харидаед ва паёмҳое, ки ба шумо фиристода шудаанд.',
    'export.how':
      'Ҳар нусха ҳамон вақте сохта мешавад, ки шумо онро мепурсед, аз ин рӯ то ҳамон лаҳза нав аст. Шумо метавонед дар як соат даҳ нусха созед; ин маҳдудият платформаро ҳифз мекунад ва барои маҳдуд кардани шумо нест.',
    'export.cap':
      'Рӯйхате, ки аз {count} сатр дарозтар аст, дар ҳамон шумора бурида мешавад ва нусха номи ҳар рӯйхати буридашударо зикр мекунад.',
    'export.json': 'Боргирии нусха (JSON)',
    'export.jsonNote':
      'Тамоми нусха ҳамчун як файли JSON: ҳар майдон, аз ҷумла онҳое, ки ҳеҷ экран нишон намедиҳад. Дар ҳар муҳаррири матн кушода мешавад. Барои барномасоз ё барои нигоҳ доштани нусхае, ки баъдтар онро тафтиш карда метавонед.',
    'export.sheet': 'Боргирии нусха (ҷадвали электронӣ)',
    'export.sheetNote':
      'Ҷадвали электронӣ бо як бахш барои ҳар қисми ҳисоби шумо ва як сатри холӣ байни бахшҳо. Дар Excel, Numbers, LibreOffice ё Google Sheets кушода мешавад.',
    'export.read': 'Дар ҳамин ҷо хонед ё ҳамчун PDF захира кунед',
    'export.readNote':
      'Саҳифае, ки онро дар браузер хонда ва чоп карда метавонед ё аз равзанаи чопи худ ҳамчун PDF захира карда метавонед. PDF-ро худи браузери шумо месозад. Кушодани саҳифа яке аз даҳ нусхаи шумо ҳисоб мешавад.',
    'export.english':
      'Номҳои бахшҳо ва майдонҳо дар дохили нусха ба забони англисӣ мебошанд, зеро сабтҳо бо ҳамин номҳо нигоҳ дошта мешаванд.',
    'export.audit':
      'Ҳар нусха дар сабти аудит навишта мешавад, бо сана ва шумораи сатрҳои ҳар бахш. Маҳз ҳамин сабт имкон медиҳад, ки нусхаи ғайричашмдошти маълумоти касе пайгирӣ шавад.',
    'export.preparing': 'Нусхаи шумо сохта мешавад…',
    'export.done': 'Нусхаи шумо сохта шуд ва барои захира ба браузери шумо супурда шуд.',
    'export.limit':
      'Дар як соати охир даҳ нусха сохта шудааст ва маҳдудият ҳамин аст. Каме интизор шавед, сипас дубора пурсед.',
    'export.failed': 'Нусхаро ҳозир сохтан муяссар нашуд. Пас аз лаҳзае дубора пурсед.',
    'export.signedOut': 'Шумо аз ҳисоб баромадаед. Барои гирифтани нусха дубора ворид шавед.',
    'export.inHeading': 'Дар он чӣ ҳаст',
    'export.inAccount': 'Ҳисоби шумо',
    'export.inAccountNote':
      'Номи намоишӣ, забон, минтақаи вақт, кишвар, ҳолат ва нақшҳое, ки доред (муаллим, тафтишгар, корманд), агар бошанд.',
    'export.inLearners': 'Профилҳои хонандагон',
    'export.inLearnersNote':
      'Профили худи шумо ва профилҳои хонандагоне, ки шумо ҳоло сарпарасти тасдиқшудаи онҳо ҳастед ва иҷозати дидани пешрафташонро доред. Номнависиҳо, пешрафт, кӯшишҳо ва шаҳодатномаҳои онҳо низ ҳамроҳ меоянд.',
    'export.inWrote': 'Он чи навиштаед',
    'export.inWroteNote':
      'Қайдҳои дарс, хатчӯбҳо, курсҳои захирашуда ва қайди хусусие, ки дар паҳлуи яке аз онҳо гузоштаед, тақризҳо, паёмҳои муҳокима, супоришҳои супурдашуда ва ҷавобҳои тест.',
    'export.inGuardians': 'Барои кӣ масъул ҳастед ва кӣ шуморо дида метавонад',
    'export.inGuardiansNote':
      'Ҳар кӯдаке, ки шумо сарпарасташ ҳастед, он чи ба шумо дидан ва идора кардан иҷозат аст ва кай ин тасдиқ шуд; ва аз тарафи дигар, ҳар касе, ки платформа ӯро сарпарасти шумо тасдиқ кардааст.',
    'export.inInvited': 'Одамоне, ки даъват кардаед',
    'export.inInvitedNote':
      'Суроғае, ки мубодиларо ба он фиристодед, он чи мубодила кардед ва оё он қабул шуд. На худи пайванд: пайванд ҳамон чизест, ки дорандаи худро ба дарун роҳ медиҳад.',
    'export.inMoney': 'Пул',
    'export.inMoneyNote':
      'Фармоишҳо дар ҳар ҳисобе, ки шумо узви он ҳастед, он чи харида шудааст ва агар дарс диҳед, даромад ва пардохтҳои шумо. Маблағҳо айнан ҳамон тавре ки сабт шудаанд, бо асъори худ нишон дода мешаванд.',
    'export.inSupport': 'Дастгирӣ ва паёмҳо',
    'export.inSupportNote':
      'Муроҷиатҳое, ки кушодаед, ҷавобҳое, ки шумо бе ин ҳам дида метавонед, ҳар огоҳиномае, ки ба шумо фиристода шудааст, ва почтаи электроние, ки платформа аз номи шумо фиристодааст ё ба навбат гузоштааст, бо тоза кардани ҳар пайванди даъват.',
    'export.inActivity': 'Фаъолият ва дастгоҳҳо',
    'export.inActivityNote':
      'Рӯйдодҳое, ки дар бораи истифодаи шумо аз маҳсулот сабт шудаанд, ва дастгоҳҳое, ки барои дарсҳои офлайн сабт шудаанд. Ҳисоботҳо барои муаллимон ва кормандон аз ҳамин рӯйдодҳо шумурда мешаванд.',
    'export.outHeading': 'Дар он чӣ нест ва чаро',
    'export.outOthers': 'Суханони дигарон',
    'export.outOthersNote':
      'Ҷавобе дар зери паёми шумо, паёми ҳамсинф, қайди муаллим дар бораи хонандаи дигар: ин маълумоти онҳост, на аз они шумо, ҳатто агар ба шумо дахл дошта бошад.',
    'export.outSignIn': 'Суроғаи воридшавӣ ва пароли шумо',
    'export.outSignInNote':
      'Ҳарду дар назди таъминкунандаи воридшавӣ, берун аз ин пойгоҳи додаҳо нигоҳ дошта мешаванд.',
    'export.outStaff': 'Қайдҳои дохилии кормандон',
    'export.outStaffNote':
      'Тарзи гуфтугӯи даста бо худаш дар бораи муроҷиати дастгирӣ ё тафтиш. Нашри ин қайдҳо онҳоро бефоида мекунад ва онҳо сабте дар бораи шумо нестанд.',
    'export.outFiles': 'Худи файлҳои боршуда',
    'export.outFilesNote':
      'Замимаҳо танҳо ҳамчун истинод номбар мешаванд. Нусхабардории ҳар видеои захирашуда ба як ҳуҷҷат имконияти дигар аст, ки маҳдудиятҳои ҳаҷми худро дорад.',
    'export.outTokens': 'Токенҳои эътимоднома',
    'export.outTokensNote':
      'Токенҳои тасдиқи шаҳодатнома ва пайвандҳои мубодила ҳамон чизҳое мебошанд, ки дигаронро ба дарун роҳ медиҳанд. Чоп кардани онҳо дар нусха ҳамон роҳест, ки онҳо дигар махфӣ намемонанд.',
    'export.outBoards': 'Паёмҳои шумо дар муҳокимаи донишомӯзон ва муаллимон',
    'export.outBoardsNote':
      'Он ҷо бо номи корбарӣ менависед, то паём номи шуморо надошта бошад. Нусхае, ки он паёмҳоро дар паҳлуи номи шумо мегузорад, инро аз байн мебарад. Онҳо дар муҳокима мемонанд; он ҷо метавонед онҳоро хонед ва ҳар якеро бозпас гиред. Саволу ҷавобҳое, ки дар курс навиштаед, чизи дигаранд: онҳо дар нусха ҳастанд.',
    'export.after':
      'Боргирӣ як самт аст ва барқарорсозӣ самти дигар: қисме аз нусхаро ба ҳамин ҳисоб ё ба ҳисоби нав баргардондан мумкин аст. Бастани ҳисоб кори алоҳида аст ва онро бекор кардан намешавад; бо ҳар намуди сабт чӣ мешавад, дар ҳамон саҳифа навишта шудааст.',
    'export.printCrumb': 'Барои чоп',
    'export.printTitle': 'Нусхаи маълумоти шумо',
    'export.printLede':
      'Ин саҳифаро чоп кунед ё бо равзанаи чопи браузери худ онро ҳамчун PDF захира кунед. PDF-ро худи браузери шумо месозад.',
    'export.printCounts':
      'Кушодани ин саҳифа як нусха сохт: он яке аз даҳ нусхаи як соат ҳисоб мешавад ва мисли боргирӣ сабт мешавад. Аз нав бор кардани саҳифа боз якто месозад.',
    'export.printMade': 'Вақти сохтан: {when}',
    'export.printCut': 'Ин рӯйхатҳо аз маҳдудият дарозтар буданд ва бурида шуданд: {lists}',
    'export.printSheet': 'Боргирӣ ҳамчун ҷадвали электронӣ',
    'export.printJson': 'Боргирӣ ҳамчун JSON',
    'export.printEmpty': 'Барои ин ҳисоб ҳанӯз чизе сабт нашудааст.',
    'export.printSame':
      'Ин ҳамон сабтест, ки ду боргирӣ дар худ доранд. Он чи қасдан берун гузошта шудааст ва сабаби он дар саҳифаи содирот аст.',
    'export.printBack': 'Бозгашт ба саҳифаи содирот',
  },
  ky: {
    'export.crumb': 'Экспорт',
    'export.title': 'Маалыматтарыңыздын көчүрмөсүн алыңыз',
    'export.lede':
      'Бул платформа сиз тууралуу сактаган нерселердин бир көчүрмөсү, төмөндө аталган өзгөчө учурларды кошпогондо: аккаунтуңуз, сиз катталган курстар, жазгандарыңыз, бааланган иштериңиз, сатып алгандарыңыз жана сизге жөнөтүлгөн билдирүүлөр.',
    'export.how':
      'Ар бир көчүрмө сиз сураган учурда даярдалат, ошондуктан ал ошол учурга чейин жаңы болот. Саатына он көчүрмө жасай аласыз; бул чек платформаны коргойт жана сизди чектөө үчүн коюлган эмес.',
    'export.cap':
      '{count} саптан узун тизме ошол санда кесилет, ал эми көчүрмөдө кесилген ар бир тизменин аты көрсөтүлөт.',
    'export.json': 'Көчүрмөнү жүктөп алуу (JSON)',
    'export.jsonNote':
      'Бүт көчүрмө бир JSON файлы катары: ар бир талаа, эч бир экран көрсөтпөгөндөрү да. Каалаган текст редакторунда ачылат. Иштеп чыгуучу үчүн же кийин текшере ала турган көчүрмөнү сактап коюу үчүн.',
    'export.sheet': 'Көчүрмөнү жүктөп алуу (электрондук таблица)',
    'export.sheetNote':
      'Аккаунтуңуздун ар бир бөлүгү үчүн бир бөлүмү жана бөлүмдөрдүн ортосунда бош сабы бар электрондук таблица. Excel, Numbers, LibreOffice же Google Sheets программасында ачылат.',
    'export.read': 'Ушул жерден окуу же PDF катары сактоо',
    'export.readNote':
      'Браузерде окуп, басып чыгарууга же өзүңүздүн басып чыгаруу терезеңизден PDF катары сактоого боло турган барак. PDF файлын браузериңиз өзү түзөт. Баракты ачуу он көчүрмөңүздүн бири болуп эсептелет.',
    'export.english':
      'Көчүрмөнүн ичиндеги бөлүм жана талаа аттары англис тилинде, анткени жазуулар ушул аттар менен сакталат.',
    'export.audit':
      'Ар бир көчүрмө датасы жана ар бир бөлүмдөгү саптардын саны менен кошо аудит журналына жазылат. Кимдир бирөөнүн маалыматтарынын күтүлбөгөн көчүрмөсүн издөөгө мүмкүндүк берген нерсе дал ушул жазуу.',
    'export.preparing': 'Көчүрмөңүз даярдалып жатат…',
    'export.done': 'Көчүрмөңүз даярдалды жана сактоо үчүн браузериңизге берилди.',
    'export.limit': 'Акыркы бир саатта он көчүрмө жасалды, чек ушул. Бир аз күтүп, кайра сураңыз.',
    'export.failed': 'Көчүрмөнү азыр даярдоо мүмкүн болгон жок. Бир аздан кийин кайра сураңыз.',
    'export.signedOut': 'Сиз аккаунттан чыгып кеткенсиз. Көчүрмө алуу үчүн кайра кириңиз.',
    'export.inHeading': 'Анда эмне бар',
    'export.inAccount': 'Аккаунтуңуз',
    'export.inAccountNote':
      'Көрсөтүлүүчү ат, тил, убакыт алкагы, өлкө, абал жана аткарган ролдоруңуз (мугалим, текшерүүчү, кызматкер), эгер болсо.',
    'export.inLearners': 'Окуучу профилдери',
    'export.inLearnersNote':
      'Өз профилиңиз жана азыр сиз ырасталган камкорчусу болгон, жетишкендигин көрүүгө уруксатыңыз бар окуучулардын профилдери. Алардын курска катталуулары, жетишкендиги, аракеттери жана сертификаттары кошо келет.',
    'export.inWrote': 'Жазгандарыңыз',
    'export.inWroteNote':
      'Сабак жазуулары, кыстармалар, сакталган курстар жана алардын биринин жанына койгон жеке жазууңуз, пикирлер, талкуу билдирүүлөрү, тапшырылган тапшырмалар жана тест жооптору.',
    'export.inGuardians': 'Кимдер үчүн жооптуусуз жана сизди ким көрө алат',
    'export.inGuardiansNote':
      'Сиз камкорчусу болгон ар бир бала, эмнени көрүүгө жана башкарууга уруксатыңыз бар экени жана ал качан ырасталганы; экинчи жагынан, платформа сиздин камкорчуңуз деп ырастаган ар бир адам.',
    'export.inInvited': 'Сиз чакырган адамдар',
    'export.inInvitedNote':
      'Бөлүшүүнү жөнөткөн дарегиңиз, эмне менен бөлүшкөнүңүз жана ал кабыл алынган-алынбаганы. Шилтеменин өзү эмес: шилтеме аны кармаган адамды ичкери киргизген нерсе.',
    'export.inMoney': 'Акча',
    'export.inMoneyNote':
      'Сиз мүчө болгон каалаган аккаунттагы буйрутмалар, эмне сатып алынганы жана сабак берсеңиз, кирешеңиз менен сизге жасалган төлөмдөр. Суммалар дал жазылгандай, өз валютасында көрсөтүлөт.',
    'export.inSupport': 'Колдоо жана билдирүүлөр',
    'export.inSupportNote':
      'Сиз ачкан кайрылуулар, ансыз да көрө алган жоопторуңуз, сизге жөнөтүлгөн ар бир билдирме жана платформа сиздин атыңыздан жөнөткөн же кезекке койгон электрондук каттар; ар бир чакыруу шилтемеси өчүрүлгөн түрдө.',
    'export.inActivity': 'Активдүүлүк жана түзмөктөр',
    'export.inActivityNote':
      'Продуктту колдонушуңуз тууралуу катталган окуялар жана оффлайн сабактар үчүн катталган түзмөктөр. Мугалимдер менен кызматкерлер үчүн отчеттор да ушул эле окуялардан саналат.',
    'export.outHeading': 'Анда эмне жок жана эмне үчүн',
    'export.outOthers': 'Башка адамдардын сөздөрү',
    'export.outOthersNote':
      'Билдирүүңүздүн астындагы жооп, классташыңыздын билдирүүсү, мугалимдин башка окуучу тууралуу жазуусу: сизге тиешелүү болсо да, булар сиздин эмес, алардын маалыматы.',
    'export.outSignIn': 'Кирүү дарегиңиз жана сырсөзүңүз',
    'export.outSignInNote':
      'Экөө тең бул маалымат базасынан тышкары, кирүү кызматын камсыздоочуда сакталат.',
    'export.outStaff': 'Кызматкерлердин ички жазуулары',
    'export.outStaffNote':
      'Команданын колдоо кайрылуусу же текшерүү тууралуу өз ара сүйлөшүүсү. Бул жазууларды жарыялоо аларды пайдасыз кылат, анын үстүнө алар сиз тууралуу жазуу эмес.',
    'export.outFiles': 'Жүктөлгөн файлдардын өзү',
    'export.outFilesNote':
      'Тиркемелер шилтеме катары гана тизмеленет. Сакталган ар бир видеону бир документке көчүрүү башка мүмкүнчүлүк, анын өз көлөм чектери бар.',
    'export.outTokens': 'Эсептик маалымат токендери',
    'export.outTokensNote':
      'Сертификатты текшерүү токендери жана бөлүшүү шилтемелери башка адамдарды ичкери киргизген нерселер. Аларды көчүрмөдө басып чыгаруу алардын сыр бойдон калбай калышына алып келет.',
    'export.outBoards': 'Окуучулардын жана мугалимдердин талкуусундагы билдирүүлөрүңүз',
    'export.outBoardsNote':
      'Ал жерде колдонуучу аты менен жазасыз, ошондо билдирүүдө атыңыз болбойт. Ошол билдирүүлөрдү атыңыздын жанына койгон көчүрмө муну жокко чыгарат. Алар талкууда калат; ал жерде аларды окуп, каалаганын кайтарып ала аласыз. Курста жазган суроолоруңуз менен жоопторуңуз — башка нерсе: алар көчүрмөдө бар.',
    'export.after':
      'Жүктөп алуу бир багыт, ал эми калыбына келтирүү экинчи багыт: көчүрмөнүн бир бөлүгүн ушул аккаунтка же жаңы аккаунтка кайра коюуга болот. Аккаунтту жабуу өзүнчө иш жана аны артка кайтарууга болбойт; жазуунун ар бир түрү менен эмне болору ошол баракта жазылган.',
    'export.printCrumb': 'Басып чыгаруу үчүн',
    'export.printTitle': 'Маалыматтарыңыздын көчүрмөсү',
    'export.printLede':
      'Бул баракты басып чыгарыңыз же браузериңиздин басып чыгаруу терезеси аркылуу PDF катары сактаңыз. PDF файлын браузериңиз өзү түзөт.',
    'export.printCounts':
      'Бул баракты ачуу бир көчүрмө түздү: ал саатына ондун бири болуп эсептелет жана жүктөп алуу сыяктуу катталат. Баракты кайра жүктөө дагы бирөөнү түзөт.',
    'export.printMade': 'Даярдалган убактысы: {when}',
    'export.printCut': 'Бул тизмелер чектен узун болгон жана кесилди: {lists}',
    'export.printSheet': 'Электрондук таблица катары жүктөп алуу',
    'export.printJson': 'JSON катары жүктөп алуу',
    'export.printEmpty': 'Бул аккаунт боюнча азырынча эч нерсе каттала элек.',
    'export.printSame':
      'Бул эки жүктөп алуунун ичиндеги дал ошол эле жазуу. Атайылап сыртта калтырылгандар жана анын себеби экспорт барагында.',
    'export.printBack': 'Экспорт барагына кайтуу',
  },
  tk: {
    'export.crumb': 'Eksport',
    'export.title': 'Maglumatlaryňyzyň nusgasyny alyň',
    'export.lede':
      'Bu platformanyň siz barada saklaýan zatlarynyň bir nusgasy, aşakda sanalan kadadan çykmalar bilen: hasabyňyz, ýazylan kurslaryňyz, ýazan zatlaryňyz, baha alan işleriňiz, satyn alan zatlaryňyz we size iberilen hatlar.',
    'export.how':
      'Her nusga siz soran wagtyňyz taýýarlanýar, şonuň üçin ol şol pursada çenli täzedir. Sagatda on nusga alyp bilersiňiz; bu çäk platformany goraýar we sizi çäklendirmek üçin däldir.',
    'export.cap':
      '{count} setirden uzyn sanaw şol sanda kesilýär we nusgada kesilen her sanawyň ady görkezilýär.',
    'export.json': 'Nusgany göçürip al (JSON)',
    'export.jsonNote':
      'Tutuş nusga bir JSON faýly hökmünde: her meýdan, hiç bir ekranyň görkezmeýänleri hem. Islendik tekst redaktorynda açylýar. Programmaçy üçin ýa-da soň barlap boljak nusgany saklamak üçin.',
    'export.sheet': 'Nusgany göçürip al (elektron tablisa)',
    'export.sheetNote':
      'Hasabyňyzyň her bölegi üçin bir bölümi we bölümleriň arasynda boş setiri bolan elektron tablisa. Excel, Numbers, LibreOffice ýa-da Google Sheets programmasynda açylýar.',
    'export.read': 'Şu ýerde okaň ýa-da PDF hökmünde saklaň',
    'export.readNote':
      'Brauzerde okap, çap edip boljak ýa-da öz çap ediş penjiräňizden PDF hökmünde saklap boljak sahypa. PDF faýlyny brauzeriňiziň özi döredýär. Sahypany açmak on nusgaňyzyň biri hasaplanýar.',
    'export.english':
      'Nusganyň içindäki bölüm we meýdan atlary iňlis dilinde, sebäbi ýazgylar şol atlar bilen saklanýar.',
    'export.audit':
      'Her nusga senesi we her bölümdäki setirleriň sany bilen bilelikde audit ýazgysyna girizilýär. Kimdir biriniň maglumatlarynyň garaşylmadyk nusgasyny yzarlamaga mümkinçilik berýän zat şol ýazgydyr.',
    'export.preparing': 'Nusgaňyz taýýarlanýar…',
    'export.done': 'Nusgaňyz taýýarlandy we saklamak üçin brauzeriňize berildi.',
    'export.limit':
      'Soňky bir sagatda on nusga alyndy, çäk hem şudur. Biraz garaşyň, soň täzeden soraň.',
    'export.failed': 'Nusgany häzir taýýarlap bolmady. Biraz soň täzeden soraň.',
    'export.signedOut': 'Siz hasapdan çykdyňyz. Nusga almak üçin täzeden giriň.',
    'export.inHeading': 'Onda näme bar',
    'export.inAccount': 'Hasabyňyz',
    'export.inAccountNote':
      'Görkezilýän at, dil, sagat guşaklygy, ýurt, ýagdaý we ýerine ýetirýän rollaryňyz (mugallym, barlagçy, işgär), eger bar bolsa.',
    'export.inLearners': 'Okuwçy profilleri',
    'export.inLearnersNote':
      'Öz profiliňiz hem-de häzir tassyklanan howandary bolup, ösüşini görmäge rugsadyňyz bar bolan okuwçylaryň profilleri. Olaryň kursa ýazylyşlary, ösüşi, synanyşyklary we şahadatnamalary hem bile gelýär.',
    'export.inWrote': 'Ýazan zatlaryňyz',
    'export.inWroteNote':
      'Sapak bellikleri, sahypa bellikleri, saklanan kurslar we olaryň biriniň ýanyna goýan şahsy belligiňiz, synlar, ara alyp maslahatlaşma ýazgylary, tabşyrylan ýumuşlar we test jogaplary.',
    'export.inGuardians': 'Kimler üçin jogapkär, we sizi kim görüp bilýär',
    'export.inGuardiansNote':
      'Howandary bolan her çagaňyz, nämeleri görmäge we dolandyrmaga rugsadyňyzyň bardygy we munuň haçan tassyklanandygy; beýleki tarapdan bolsa, platformanyň siziň howandaryňyz hökmünde tassyklan her bir adamy.',
    'export.inInvited': 'Çagyran adamlaryňyz',
    'export.inInvitedNote':
      'Paýlaşmany iberen salgyňyz, näme paýlaşandygyňyz we onuň kabul edilendigi ýa-da edilmändigi. Baglanyşygyň özi däl: baglanyşyk ony saklaýan adamy içeri goýberýän zatdyr.',
    'export.inMoney': 'Pul',
    'export.inMoneyNote':
      'Agzasy bolan islendik hasabyňyzdaky sargytlar, näme satyn alnandygy we sapak berýän bolsaňyz, gazanjyňyz hem-de size edilen tölegler. Möçberler edil ýazylyşy ýaly, öz pul birliginde görkezilýär.',
    'export.inSupport': 'Goldaw we hatlar',
    'export.inSupportNote':
      'Açan ýüzlenmeleriňiz, onsuz hem görüp bilýän jogaplaryňyz, size iberilen her bir habarnama we platformanyň siziň adyňyzdan iberen ýa-da nobata goýan e-poçta hatlary; her bir çakylyk baglanyşygy öçürilen görnüşde.',
    'export.inActivity': 'Işjeňlik we enjamlar',
    'export.inActivityNote':
      'Önümi ulanyşyňyz barada ýazylan wakalar we oflaýn sapaklar üçin hasaba alnan enjamlar. Mugallymlar we işgärler üçin hasabatlar hem şol wakalardan sanalýar.',
    'export.outHeading': 'Onda näme ýok, we näme üçin',
    'export.outOthers': 'Başgalaryň sözleri',
    'export.outOthersNote':
      'Ýazgyňyzyň aşagyndaky jogap, synpdaşyňyzyň haty, mugallymyň başga okuwçy baradaky belligi: size degişli bolsa-da, bular siziň däl, olaryň maglumatlarydyr.',
    'export.outSignIn': 'Giriş salgyňyz we açar sözüňiz',
    'export.outSignInNote':
      'Ikisi hem bu maglumat binýadynyň daşynda, giriş hyzmatyny üpjün edijide saklanýar.',
    'export.outStaff': 'Işgärleriň içerki bellikleri',
    'export.outStaffNote':
      'Toparyň goldaw ýüzlenmesi ýa-da barlag barada öz arasynda gürleşişi. Şol bellikleri çap etmek olary peýdasyz eder, üstesine-de olar siz baradaky ýazgy däldir.',
    'export.outFiles': 'Ýüklenen faýllaryň özi',
    'export.outFilesNote':
      'Goşundylar diňe salgylanma hökmünde sanalýar. Saklanýan her wideony bir resminama göçürmek başga bir mümkinçilik bolup, onuň öz ölçeg çäkleri bar.',
    'export.outTokens': 'Şahsyýet tokenleri',
    'export.outTokensNote':
      'Şahadatnamany barlamak tokenleri we paýlaşma baglanyşyklary başgalary içeri goýberýän zatlardyr. Olary nusgada çap etmek olaryň syr bolmagyny bes edýär.',
    'export.outBoards': 'Okuwçylaryň we mugallymlaryň maslahatyndaky ýazgylaryňyz',
    'export.outBoardsNote':
      'Ol ýerde ulanyjy ady bilen ýazýarsyňyz, şonda ýazgyda adyňyz bolmaýar. Şol ýazgylary adyňyzyň ýanyna goýýan nusga muny ýok edýär. Olar maslahatda galýar; ol ýerde olary okap we islän birini yzyna alyp bilersiniz. Kursda ýazan soraglaryňyz we jogaplaryňyz başga zat: olar nusgada bar.',
    'export.after':
      'Göçürip almak bir ugur, dikeltmek bolsa beýleki ugur: nusganyň bir bölegini şu hasaba ýa-da täze hasaba yzyna goýup bolýar. Hasaby ýapmak aýratyn işdir we ony yzyna gaýtaryp bolmaýar; her görnüşli ýazgy bilen näme bolýandygy şol sahypada ýazylan.',
    'export.printCrumb': 'Çap etmek üçin',
    'export.printTitle': 'Maglumatlaryňyzyň nusgasy',
    'export.printLede':
      'Bu sahypany çap ediň ýa-da brauzeriňiziň çap ediş penjiresi arkaly PDF hökmünde saklaň. PDF faýlyny brauzeriňiziň özi döredýär.',
    'export.printCounts':
      'Bu sahypanyň açylmagy bir nusga döretdi: ol sagatda onusynyň biri hasaplanýar we göçürip almak ýaly hasaba alynýar. Sahypany täzeden ýüklemek ýene birini döredýär.',
    'export.printMade': 'Taýýarlanan wagty: {when}',
    'export.printCut': 'Şu sanawlar çäkden uzyndy we kesildi: {lists}',
    'export.printSheet': 'Elektron tablisa hökmünde göçürip al',
    'export.printJson': 'JSON hökmünde göçürip al',
    'export.printEmpty': 'Bu hasap üçin entek hiç zat ýazylmandyr.',
    'export.printSame':
      'Bu iki göçürip almanyň içindäki şol bir ýazgydyr. Bilgeşleýin daşynda goýlan zatlar we munuň sebäbi eksport sahypasynda.',
    'export.printBack': 'Eksport sahypasyna dolan',
  },
  ta: {
    'export.crumb': 'ஏற்றுமதி',
    'export.title': 'உங்கள் தரவின் நகலைப் பெறுங்கள்',
    'export.lede':
      'இந்தத் தளம் உங்களைப் பற்றி வைத்திருப்பவற்றின் ஒரு நகல், கீழே குறிப்பிடப்பட்டுள்ள விதிவிலக்குகள் தவிர: உங்கள் கணக்கு, நீங்கள் சேர்ந்துள்ள பாடநெறிகள், நீங்கள் எழுதியவை, உங்களுக்கு மதிப்பெண் வழங்கப்பட்டவை, நீங்கள் வாங்கியவை, உங்களுக்கு அனுப்பப்பட்ட செய்திகள்.',
    'export.how':
      'ஒவ்வொரு நகலும் நீங்கள் கேட்கும்போது உருவாக்கப்படுகிறது, எனவே அந்த நொடி வரை அது புதியது. ஒரு மணி நேரத்திற்குப் பத்து நகல்களை உருவாக்கலாம்; அந்த வரம்பு தளத்தைப் பாதுகாக்கிறது, உங்களைக் கட்டுப்படுத்துவதற்காக அல்ல.',
    'export.cap':
      '{count} வரிசைகளை விட நீளமான பட்டியல் அந்த எண்ணிக்கையில் வெட்டப்படும், மேலும் வெட்டப்பட்ட ஒவ்வொரு பட்டியலின் பெயரையும் நகல் குறிப்பிடும்.',
    'export.json': 'நகலைப் பதிவிறக்கு (JSON)',
    'export.jsonNote':
      'முழு நகலும் ஒரே JSON கோப்பாக: எந்தத் திரையும் காட்டாதவை உட்பட ஒவ்வொரு புலமும். எந்த உரைத் திருத்தியிலும் திறக்கும். உருவாக்குநருக்காக, அல்லது பின்னர் சரிபார்க்கக்கூடிய நகலை வைத்திருப்பதற்காக.',
    'export.sheet': 'நகலைப் பதிவிறக்கு (விரிதாள்)',
    'export.sheetNote':
      'உங்கள் கணக்கின் ஒவ்வொரு பகுதிக்கும் ஒரு பிரிவும், பிரிவுகளுக்கு இடையே ஒரு வெற்று வரிசையும் கொண்ட விரிதாள். Excel, Numbers, LibreOffice அல்லது Google Sheets இல் திறக்கும்.',
    'export.read': 'இங்கேயே படிக்கவும், அல்லது PDF ஆகச் சேமிக்கவும்',
    'export.readNote':
      'உலாவியில் படித்து அச்சிடக்கூடிய, அல்லது உங்கள் சொந்த அச்சு உரையாடலிலிருந்து PDF ஆகச் சேமிக்கக்கூடிய பக்கம். PDF ஐ உங்கள் உலாவியே உருவாக்குகிறது. பக்கத்தைத் திறப்பது உங்கள் பத்து நகல்களில் ஒன்றாகக் கணக்கிடப்படும்.',
    'export.english':
      'நகலுக்குள் உள்ள பிரிவுகள் மற்றும் புலங்களின் பெயர்கள் ஆங்கிலத்தில் உள்ளன, ஏனெனில் பதிவுகள் அந்தப் பெயர்களில்தான் சேமிக்கப்படுகின்றன.',
    'export.audit':
      'ஒவ்வொரு நகலும் தணிக்கைப் பதிவில் குறிக்கப்படுகிறது, தேதியுடனும் ஒவ்வொரு பிரிவிலும் இருந்த வரிசைகளின் எண்ணிக்கையுடனும். ஒருவரின் தரவின் எதிர்பாராத நகலைக் கண்டறிய உதவுவது அந்தப் பதிவுதான்.',
    'export.preparing': 'உங்கள் நகல் உருவாக்கப்படுகிறது…',
    'export.done':
      'உங்கள் நகல் உருவாக்கப்பட்டு, சேமிப்பதற்காக உங்கள் உலாவியிடம் ஒப்படைக்கப்பட்டது.',
    'export.limit':
      'கடந்த ஒரு மணி நேரத்தில் பத்து நகல்கள் உருவாக்கப்பட்டுள்ளன, அதுவே வரம்பு. சிறிது காத்திருந்து, மீண்டும் கேளுங்கள்.',
    'export.failed': 'நகலை இப்போது உருவாக்க முடியவில்லை. சிறிது நேரத்தில் மீண்டும் கேளுங்கள்.',
    'export.signedOut': 'நீங்கள் வெளியேறியுள்ளீர்கள். நகலைப் பெற மீண்டும் உள்நுழையுங்கள்.',
    'export.inHeading': 'இதில் என்ன உள்ளது',
    'export.inAccount': 'உங்கள் கணக்கு',
    'export.inAccountNote':
      'காட்சிப் பெயர், மொழி, நேர மண்டலம், நாடு, நிலை, மேலும் நீங்கள் வகிக்கும் பொறுப்புகள் (ஆசிரியர், மதிப்பாய்வாளர், பணியாளர்), இருந்தால்.',
    'export.inLearners': 'கற்பவர் சுயவிவரங்கள்',
    'export.inLearnersNote':
      'உங்களுடையதும், தற்போது நீங்கள் சரிபார்க்கப்பட்ட பாதுகாவலராக இருந்து முன்னேற்றத்தைப் பார்க்க அனுமதி பெற்றுள்ள கற்பவர்களுடையதும். அவர்களின் சேர்க்கைகள், முன்னேற்றம், முயற்சிகள், சான்றிதழ்கள் ஆகியவை அவற்றுடன் வரும்.',
    'export.inWrote': 'நீங்கள் எழுதியவை',
    'export.inWroteNote':
      'பாடக் குறிப்புகள், புத்தகக்குறிகள், சேமித்த பாடநெறிகள் மற்றும் அவற்றில் ஒன்றின் அருகில் நீங்கள் வைத்த தனிப்பட்ட குறிப்பு, மதிப்புரைகள், விவாதப் பதிவுகள், சமர்ப்பித்த பணிகள், வினாடி வினா விடைகள்.',
    'export.inGuardians': 'நீங்கள் யாருக்குப் பொறுப்பு, உங்களை யார் பார்க்க முடியும்',
    'export.inGuardiansNote':
      'நீங்கள் பாதுகாவலராக உள்ள ஒவ்வொரு குழந்தை, நீங்கள் பார்க்கவும் நிர்வகிக்கவும் அனுமதிக்கப்பட்டவை, அது எப்போது சரிபார்க்கப்பட்டது; மறுபுறம், உங்கள் பாதுகாவலராகத் தளம் சரிபார்த்துள்ள எவரும்.',
    'export.inInvited': 'நீங்கள் அழைத்தவர்கள்',
    'export.inInvitedNote':
      'நீங்கள் பகிர்வை அனுப்பிய முகவரி, நீங்கள் பகிர்ந்தது, அது ஏற்கப்பட்டதா என்பது. இணைப்பு அல்ல: அதை வைத்திருப்பவரை உள்ளே விடுவது அந்த இணைப்புதான்.',
    'export.inMoney': 'பணம்',
    'export.inMoneyNote':
      'நீங்கள் சேர்ந்துள்ள எந்தக் கணக்கிலும் உள்ள ஆர்டர்கள், வாங்கப்பட்டவை, மேலும் நீங்கள் கற்பித்தால் உங்கள் வருமானமும் உங்களுக்குச் செலுத்தப்பட்ட தொகைகளும். தொகைகள் பதிவு செய்யப்பட்டபடியே, அவற்றின் சொந்த நாணயத்தில் தோன்றும்.',
    'export.inSupport': 'உதவியும் செய்திகளும்',
    'export.inSupportNote':
      'நீங்கள் திறந்த கோரிக்கைகள், ஏற்கனவே நீங்கள் பார்க்கக்கூடிய பதில்கள், உங்களுக்கு அனுப்பப்பட்ட ஒவ்வொரு அறிவிப்பும், உங்கள் சார்பாகத் தளம் அனுப்பிய அல்லது வரிசையில் வைத்த மின்னஞ்சலும்; ஒவ்வொரு அழைப்பு இணைப்பும் நீக்கப்பட்ட நிலையில்.',
    'export.inActivity': 'செயல்பாடும் சாதனங்களும்',
    'export.inActivityNote':
      'இந்தத் தயாரிப்பை நீங்கள் பயன்படுத்தியது பற்றிப் பதிவான நிகழ்வுகள், மற்றும் இணையமில்லாப் பாடங்களுக்காகப் பதிவு செய்யப்பட்ட சாதனங்கள். ஆசிரியர்களுக்கும் பணியாளர்களுக்குமான அறிக்கைகள் இதே நிகழ்வுகளிலிருந்து எண்ணப்படுகின்றன.',
    'export.outHeading': 'இதில் என்ன இல்லை, ஏன்',
    'export.outOthers': 'பிறரின் சொற்கள்',
    'export.outOthersNote':
      'உங்கள் பதிவின் கீழ் ஒரு பதில், வகுப்புத் தோழரின் செய்தி, வேறொரு கற்பவரைப் பற்றிய ஆசிரியரின் குறிப்பு: அது உங்களைப் பற்றியதாக இருந்தாலும், அது அவர்களின் தரவு, உங்களுடையது அல்ல.',
    'export.outSignIn': 'உங்கள் உள்நுழைவு முகவரியும் கடவுச்சொல்லும்',
    'export.outSignInNote':
      'இரண்டும் இந்தத் தரவுத்தளத்திற்கு வெளியே, உள்நுழைவு வழங்குநரிடம் உள்ளன.',
    'export.outStaff': 'பணியாளர்களின் உள் குறிப்புகள்',
    'export.outStaffNote':
      'ஓர் உதவிக் கோரிக்கை அல்லது மதிப்பாய்வு பற்றிக் குழு தனக்குள் பேசிக்கொள்ளும் விதம். அந்தக் குறிப்புகளை வெளியிடுவது அவற்றைப் பயனற்றதாக்கும், மேலும் அவை உங்களைப் பற்றிய பதிவு அல்ல.',
    'export.outFiles': 'பதிவேற்றிய கோப்புகளே',
    'export.outFilesNote':
      'இணைப்புகள் மேற்கோளாக மட்டுமே பட்டியலிடப்படுகின்றன. சேமிக்கப்பட்ட ஒவ்வொரு காணொளியையும் ஒரே ஆவணத்தில் நகலெடுப்பது வேறொரு வசதி; அதற்கு அதன் சொந்த அளவு வரம்புகள் உள்ளன.',
    'export.outTokens': 'அடையாளச் சான்று டோக்கன்கள்',
    'export.outTokensNote':
      'சான்றிதழ் சரிபார்ப்பு டோக்கன்களும் பகிர்வு இணைப்புகளுமே பிறரை உள்ளே விடுகின்றன. அவற்றை ஒரு நகலில் அச்சிடுவதுதான் அவை இரகசியமாக இல்லாமல் போகும் வழி.',
    'export.outBoards': 'மாணவர் மற்றும் ஆசிரியர் கலந்துரையாடலில் உங்கள் பதிவுகள்',
    'export.outBoardsNote':
      'அங்கே நீங்கள் பயனர்பெயரில் எழுதுகிறீர்கள்; அதனால் பதிவில் உங்கள் பெயர் இருக்காது. அந்தப் பதிவுகளை உங்கள் பெயருக்கு அருகில் வைக்கும் நகல் அதை இல்லாமல் செய்துவிடும். அவை கலந்துரையாடலிலேயே இருக்கும்; அங்கே அவற்றைப் படிக்கலாம், எதையும் திரும்பப் பெறலாம். ஒரு பாடநெறியில் நீங்கள் எழுதிய கேள்விகளும் பதில்களும் வேறு விஷயம்: அவை நகலில் உள்ளன.',
    'export.after':
      'பதிவிறக்குவது ஒரு திசை, மீட்டமைப்பது மறு திசை: ஒரு நகலின் ஒரு பகுதியை இந்தக் கணக்கிலோ புதிய கணக்கிலோ மீண்டும் வைக்கலாம். கணக்கை மூடுவது தனியானது, அதைத் திரும்பப் பெற முடியாது; ஒவ்வொரு வகைப் பதிவுக்கும் என்ன நடக்கும் என்பது அந்தப் பக்கத்தில் எழுதப்பட்டுள்ளது.',
    'export.printCrumb': 'அச்சிடுவதற்கு',
    'export.printTitle': 'உங்கள் தரவின் ஒரு நகல்',
    'export.printLede':
      'இந்தப் பக்கத்தை அச்சிடுங்கள், அல்லது உங்கள் உலாவியின் அச்சு உரையாடலைப் பயன்படுத்தி PDF ஆகச் சேமியுங்கள். PDF ஐ உங்கள் உலாவியே உருவாக்குகிறது.',
    'export.printCounts':
      'இந்தப் பக்கத்தைத் திறந்ததால் ஒரு நகல் உருவானது: அது ஒரு மணி நேரத்திற்கான பத்தில் ஒன்றாகக் கணக்கிடப்பட்டு, பதிவிறக்கத்தைப் போலவே பதிவு செய்யப்படுகிறது. பக்கத்தை மீண்டும் ஏற்றினால் இன்னொன்று உருவாகும்.',
    'export.printMade': 'உருவாக்கப்பட்ட நேரம்: {when}',
    'export.printCut': 'இந்தப் பட்டியல்கள் வரம்பை விட நீளமாக இருந்ததால் வெட்டப்பட்டன: {lists}',
    'export.printSheet': 'விரிதாளாகப் பதிவிறக்கு',
    'export.printJson': 'JSON ஆகப் பதிவிறக்கு',
    'export.printEmpty': 'இந்தக் கணக்கிற்கு இதுவரை எதுவும் பதிவாகவில்லை.',
    'export.printSame':
      'இரண்டு பதிவிறக்கங்களிலும் உள்ள அதே பதிவு இதுதான். வேண்டுமென்றே விடப்பட்டவையும் அதற்கான காரணமும் ஏற்றுமதிப் பக்கத்தில் உள்ளன.',
    'export.printBack': 'ஏற்றுமதிப் பக்கத்திற்குத் திரும்பு',
  },
  ne: {
    'export.crumb': 'निर्यात',
    'export.title': 'आफ्नो डेटाको प्रतिलिपि लिनुहोस्',
    'export.lede':
      'यो प्लेटफर्मले तपाईंबारे राखेका कुराको एउटा प्रतिलिपि, तल उल्लेख गरिएका अपवादबाहेक: तपाईंको खाता, तपाईं भर्ना भएका कोर्सहरू, तपाईंले लेखेका कुरा, तपाईंलाई अङ्क दिइएका कुरा, तपाईंले किनेका कुरा, र तपाईंलाई पठाइएका सन्देशहरू।',
    'export.how':
      'हरेक प्रतिलिपि तपाईंले माग्दा बनाइन्छ, त्यसैले त्यो त्यही क्षणसम्म ताजा हुन्छ। तपाईं एक घण्टामा दस प्रतिलिपि बनाउन सक्नुहुन्छ; त्यो सीमाले प्लेटफर्मको रक्षा गर्छ, तपाईंलाई रोक्न राखिएको होइन।',
    'export.cap':
      '{count} पङ्क्तिभन्दा लामो सूची त्यही सङ्ख्यामा काटिन्छ, र प्रतिलिपिले काटिएको हरेक सूचीको नाम दिन्छ।',
    'export.json': 'प्रतिलिपि डाउनलोड गर्नुहोस् (JSON)',
    'export.jsonNote':
      'सम्पूर्ण प्रतिलिपि एउटै JSON फाइलमा: हरेक फिल्ड, कुनै स्क्रिनले नदेखाउने पनि। जुनसुकै टेक्स्ट एडिटरमा खुल्छ। डेभलपरका लागि, वा पछि जाँच्न सकिने प्रतिलिपि राख्नका लागि।',
    'export.sheet': 'प्रतिलिपि डाउनलोड गर्नुहोस् (स्प्रेडसिट)',
    'export.sheetNote':
      'तपाईंको खाताको हरेक भागका लागि एउटा खण्ड र खण्डहरूबीच एउटा खाली पङ्क्ति भएको स्प्रेडसिट। Excel, Numbers, LibreOffice वा Google Sheets मा खुल्छ।',
    'export.read': 'यहीँ पढ्नुहोस्, वा PDF का रूपमा सुरक्षित गर्नुहोस्',
    'export.readNote':
      'ब्राउजरमा पढ्न र छाप्न सकिने, वा आफ्नै प्रिन्ट डायलगबाट PDF का रूपमा सुरक्षित गर्न सकिने पृष्ठ। PDF तपाईंको ब्राउजर आफैँले बनाउँछ। पृष्ठ खोल्नु तपाईंका दस प्रतिलिपिमध्ये एक गनिन्छ।',
    'export.english':
      'प्रतिलिपिभित्रका खण्ड र फिल्डका नाम अङ्ग्रेजीमा छन्, किनभने अभिलेखहरू तिनै नाममा भण्डारण गरिएका छन्।',
    'export.audit':
      'हरेक प्रतिलिपि अडिट अभिलेखमा टिपिन्छ, मिति र हरेक खण्डमा कति पङ्क्ति थिए भन्नेसहित। कसैको डेटाको अप्रत्याशित प्रतिलिपि पत्ता लगाउन सकिने बनाउने त्यही अभिलेख हो।',
    'export.preparing': 'तपाईंको प्रतिलिपि बनाइँदै छ…',
    'export.done': 'तपाईंको प्रतिलिपि बनाइयो र सुरक्षित गर्न तपाईंको ब्राउजरलाई दिइयो।',
    'export.limit':
      'पछिल्लो एक घण्टामा दस प्रतिलिपि बनाइसकिएका छन्, र सीमा त्यही हो। केही बेर पर्खनुहोस्, अनि फेरि माग्नुहोस्।',
    'export.failed': 'प्रतिलिपि अहिले बनाउन सकिएन। केही बेरमा फेरि माग्नुहोस्।',
    'export.signedOut': 'तपाईं साइन आउट हुनुभएको छ। प्रतिलिपि लिन फेरि साइन इन गर्नुहोस्।',
    'export.inHeading': 'यसमा के छ',
    'export.inAccount': 'तपाईंको खाता',
    'export.inAccountNote':
      'देखिने नाम, भाषा, समय क्षेत्र, देश, स्थिति, र तपाईंले लिएका भूमिकाहरू (शिक्षक, समीक्षक, कर्मचारी), भएमा।',
    'export.inLearners': 'सिकारु प्रोफाइलहरू',
    'export.inLearnersNote':
      'तपाईंको आफ्नै, र हाल तपाईं प्रमाणित अभिभावक भई प्रगति हेर्ने अनुमति पाएका सिकारुहरूको। उनीहरूका भर्ना, प्रगति, प्रयास र प्रमाणपत्रहरू साथै आउँछन्।',
    'export.inWrote': 'तपाईंले लेखेका कुरा',
    'export.inWroteNote':
      'पाठका नोटहरू, बुकमार्कहरू, सुरक्षित गरिएका कोर्स र तीमध्ये कुनैको छेउमा तपाईंले राखेको निजी नोट, समीक्षाहरू, छलफलका पोस्टहरू, बुझाइएका कार्यहरू र क्विजका उत्तरहरू।',
    'export.inGuardians': 'तपाईं कसको जिम्मेवार हुनुहुन्छ, र तपाईंलाई कसले हेर्न सक्छ',
    'export.inGuardiansNote':
      'तपाईं अभिभावक भएका हरेक बालबालिका, तपाईंलाई के हेर्न र व्यवस्थापन गर्न अनुमति छ, र त्यो कहिले प्रमाणित भयो; र अर्कोतर्फ, प्लेटफर्मले तपाईंको अभिभावकका रूपमा प्रमाणित गरेको जोसुकै।',
    'export.inInvited': 'तपाईंले निम्त्याएका मानिसहरू',
    'export.inInvitedNote':
      'तपाईंले साझेदारी पठाएको ठेगाना, तपाईंले के साझा गर्नुभयो, र त्यो स्वीकार भयो कि भएन। लिङ्क आफैँ होइन: लिङ्क नै त्यो कुरा हो जसले आफ्नो धारकलाई भित्र पस्न दिन्छ।',
    'export.inMoney': 'पैसा',
    'export.inMoneyNote':
      'तपाईं सदस्य भएको जुनसुकै खाताका अर्डरहरू, के किनियो, र तपाईं पढाउनुहुन्छ भने तपाईंको आम्दानी र भुक्तानीहरू। रकमहरू ठ्याक्कै अभिलेख गरिएजस्तै, आफ्नै मुद्रामा देखिन्छन्।',
    'export.inSupport': 'सहयोग र सन्देशहरू',
    'export.inSupportNote':
      'तपाईंले खोलेका केसहरू, तपाईंले पहिल्यै देख्न सक्ने जवाफहरू, तपाईंलाई पठाइएको हरेक सूचना, र प्लेटफर्मले तपाईंको तर्फबाट पठाएको वा लाममा राखेको इमेल, हरेक निमन्त्रणा लिङ्क मेटाइएको अवस्थामा।',
    'export.inActivity': 'गतिविधि र उपकरणहरू',
    'export.inActivityNote':
      'तपाईंले उत्पादन प्रयोग गरेको बारे अभिलेख गरिएका घटनाहरू, र अफलाइन पाठका लागि दर्ता गरिएका उपकरणहरू। शिक्षक र कर्मचारीका लागि प्रतिवेदनहरू यिनै घटनाबाट गनिन्छन्।',
    'export.outHeading': 'यसमा के छैन, र किन',
    'export.outOthers': 'अरूका शब्दहरू',
    'export.outOthersNote':
      'तपाईंको पोस्टमुनिको जवाफ, सहपाठीको सन्देश, अर्को सिकारुबारे शिक्षकको नोट: त्यो उनीहरूको डेटा हो, तपाईंको होइन, तपाईंसँग सम्बन्धित भए पनि।',
    'export.outSignIn': 'तपाईंको साइन-इन ठेगाना र पासवर्ड',
    'export.outSignInNote': 'दुवै साइन-इन प्रदायकसँग छन्, यो डेटाबेसबाहिर।',
    'export.outStaff': 'कर्मचारीका आन्तरिक नोटहरू',
    'export.outStaffNote':
      'कुनै सहयोग केस वा समीक्षाबारे टोलीले आफैँभित्र गर्ने कुराकानी। ती नोट प्रकाशित गर्दा ती बेकामे हुन्छन्, र ती तपाईंबारेको अभिलेख होइनन्।',
    'export.outFiles': 'अपलोड गरिएका फाइलहरू आफैँ',
    'export.outFilesNote':
      'संलग्न फाइलहरू सन्दर्भका रूपमा मात्र सूचीबद्ध हुन्छन्। भण्डारण गरिएको हरेक भिडियोलाई एउटै कागजातमा प्रतिलिपि गर्नु अर्कै सुविधा हो, जसका आफ्नै आकार सीमा छन्।',
    'export.outTokens': 'प्रमाणपत्र टोकनहरू',
    'export.outTokensNote':
      'प्रमाणपत्र प्रमाणीकरण टोकन र साझेदारी लिङ्कहरू नै अरू मानिसलाई भित्र पस्न दिने कुरा हुन्। तिनलाई प्रतिलिपिमा छाप्नु नै ती गोप्य नरहने बाटो हो।',
    'export.outBoards': 'विद्यार्थी र शिक्षकहरूको छलफलमा तपाईंका पोस्टहरू',
    'export.outBoardsNote':
      'त्यहाँ तपाईं प्रयोगकर्ता नामबाट लेख्नुहुन्छ, ताकि पोस्टमा तपाईंको नाम नहोस्। ती पोस्टलाई तपाईंको नामको छेउमा राख्ने प्रतिलिपिले यो कुरा नै मेटाइदिन्छ। ती छलफलमै रहन्छन्; त्यहाँ तपाईं तिनलाई पढ्न र कुनै पनि फिर्ता लिन सक्नुहुन्छ। कोर्समा तपाईंले लेखेका प्रश्न र उत्तरहरू अर्कै कुरा हुन्: ती प्रतिलिपिमा छन्।',
    'export.after':
      'डाउनलोड एउटा दिशा हो र पुनर्स्थापना अर्को: प्रतिलिपिको केही भाग यही खातामा वा नयाँ खातामा फेरि राख्न सकिन्छ। खाता बन्द गर्नु अलग कुरा हो र त्यसलाई फिर्ता गर्न सकिँदैन; हरेक प्रकारको अभिलेखलाई के हुन्छ भन्ने त्यही पृष्ठमा लेखिएको छ।',
    'export.printCrumb': 'छाप्नका लागि',
    'export.printTitle': 'तपाईंको डेटाको प्रतिलिपि',
    'export.printLede':
      'यो पृष्ठ छाप्नुहोस्, वा आफ्नो ब्राउजरको प्रिन्ट डायलग प्रयोग गरी PDF का रूपमा सुरक्षित गर्नुहोस्। PDF तपाईंको ब्राउजर आफैँले बनाउँछ।',
    'export.printCounts':
      'यो पृष्ठ खोल्दा एउटा प्रतिलिपि बन्यो: त्यो एक घण्टाका दसमध्ये एक गनिन्छ र डाउनलोडजस्तै अभिलेख गरिन्छ। पृष्ठ फेरि लोड गर्दा अर्को बन्छ।',
    'export.printMade': 'बनाइएको समय: {when}',
    'export.printCut': 'यी सूचीहरू सीमाभन्दा लामा थिए र काटिए: {lists}',
    'export.printSheet': 'स्प्रेडसिटका रूपमा डाउनलोड गर्नुहोस्',
    'export.printJson': 'JSON का रूपमा डाउनलोड गर्नुहोस्',
    'export.printEmpty': 'यो खातामा अहिलेसम्म केही अभिलेख गरिएको छैन।',
    'export.printSame':
      'यो दुवै डाउनलोडमा भएको उही अभिलेख हो। जानाजान बाहिर राखिएका कुरा, र किन, निर्यात पृष्ठमा छन्।',
    'export.printBack': 'निर्यात पृष्ठमा फर्कनुहोस्',
  },
};
