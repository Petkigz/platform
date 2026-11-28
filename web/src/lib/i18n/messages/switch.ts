import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The staff console (`/admin`), third part: the owner's switchboard. The
 * four counts above the flag register, the name of each group of flags,
 * the label that says how a flag is gated, the words on the switch and
 * what the page says when a switch is refused, the paragraph about
 * translation and its month, and the revenue share form with its refusals.
 *
 * Written on 2026-11-28, in the same twenty-seven languages as the rest of
 * the console. **Written by the people who built the site and read by no
 * speaker.** These are sentences about money and about who may decide: the
 * revenue share paragraph says what a change does and does not move, and a
 * refusal says who is allowed. A wrong one misdescribes a rule. Nothing
 * here enforces one: the database refuses, whatever the sentence says.
 *
 * A count follows a colon ("On: 3 of 9"), so that no language has to
 * agree a noun with a number. The sentence beside "Retention clock"
 * follows a dash, so it begins small and ends without a full stop. The two
 * sentences that end "What it said:" are followed by the database's own
 * sentence, which is English and is marked as English.
 *
 * Three things stay in Latin letters in every language, because they are
 * what the owner types or looks up: `GOOGLE_TRANSLATE_API_KEY`,
 * `platform.translate` and `Google`. Persian, Dari, Bengali and Nepali
 * write their own digits, as the numbers the page formats beside them do.
 * French puts a no-break space before `:`, `;` and `%` and inside « ».
 * A "deploy" is said as each language's older parts say it, or in the
 * plainest words for "a new version of the code has to be installed".
 *
 * Three sentences are copies, letter for letter, of what older parts say:
 * the group "Money" (`export.inMoney`), "Saving…" (`course.saving`) and
 * being signed out (`family.signedOut`). They are copied rather than
 * borrowed so that this part is whole on its own: were one of those parts
 * held for a language, a borrowed word would come out in English inside a
 * block that is not marked as English.
 *
 * Not here: what the database says a flag still needs, the name of a group
 * the page has not heard of, and the database's own sentence when it
 * refuses. Those are English, and the page marks them as English.
 *
 * Made by `scripts/catalogue-part/gen.py` from
 * `scripts/catalogue-part/data/switch.txt`.
 */
export const SWITCH: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'switch.title': 'مفاتيح الميزات',
    'switch.lede': 'كل شيء مبنيّ ومنشور وهو مُطفأ. شغِّل الميزات من هنا كلما تحققت شروطها المسبقة.',
    'switch.statOn': 'مفعَّلة',
    'switch.statOff': 'مُطفأة',
    'switch.statSetup': 'مُطفأة، والإعداد الخارجي أولًا',
    'switch.statDeploy': 'تحتاج إلى نشر',
    'switch.retention': 'ساعة الاحتفاظ',
    'switch.retentionNote':
      'الأمران اللذان يَعِد إشعار الخصوصية بحذفهما في تاريخ محدد: طلب دعم بعد ثلاث سنوات من إغلاقه، وسجلّ يفيد بأن معلمًا جرى التحقق منه بعد سبع سنوات من الأبعد بين تاريخ التحقق وبلوغه الثامنة عشرة. تذكر الصفحة ما حان موعده، وما لا ساعة له لأن أحدًا لم يغلقه، وتنفّذ الحذف على دفعات محدودة',
    'switch.deployNote':
      'الميزة التي عليها «يحتاج إلى نشر» لا يمكن تشغيلها من هنا، والرفض تفرضه قاعدة البيانات لا إخفاء أداة التحكم. ولكل واحدة منها شرط مسبق يجب أن يتحقق أولًا. والميزة التي ليس لها شرط مسبق مكتوب خلل ينتظر أن يُشغَّل.',
    'switch.empty': 'سجلّ الميزات فارغ.',
    'switch.groupOn': 'المفعَّل: {on} من {total}',
    'switch.gLearner': 'ميزات المتعلّمين',
    'switch.gTeaching': 'التدريس',
    'switch.gMoney': 'المال',
    'switch.gFamilies': 'الأطفال والأسر',
    'switch.gPlatform': 'المنصة',
    'switch.gDelivery': 'إيصال المحتوى',
    'switch.gGovernance': 'الحوكمة',
    'switch.gOther': 'غير ذلك',
    'switch.trHead': 'الترجمة.',
    'switch.trOn':
      'الترجمة مفعَّلة. يستطيع القارئ الذي سجّل دخوله أن يضغط «ترجمة» تحت ما كتبه شخص آخر، فيُرسَل ذلك النص إلى Google.',
    'switch.trOnNoKey':
      'مفتاح الترجمة مفعَّل، لكن هذا الخادم ليس فيه GOOGLE_TRANSLATE_API_KEY، فلا يُعرض أي زر ولا يُرسَل شيء.',
    'switch.trOffKey':
      'الترجمة مُطفأة. هذا الخادم فيه مفتاح؛ والمفتاح platform.translate أدناه هو ما يُظهر الزر.',
    'switch.trOffNoKey':
      'الترجمة مُطفأة، وهذا الخادم ليس فيه GOOGLE_TRANSLATE_API_KEY. وهي تحتاج إلى الاثنين معًا.',
    'switch.trUsed':
      'الأحرف هذا الشهر: {characters} من {monthly} ({share}%). الطلبات: {requests}. الأشخاص: {people}. أقصى ما يرسله شخص واحد في اليوم: {daily}. يتوقف الأعضاء عند أربعة أخماس حصة الشهر؛ والباقي محفوظ لفريق العمل.',
    'switch.gateRuntime': 'تشغيل مباشر',
    'switch.gateSetupFirst': 'الإعداد الخارجي أولًا',
    'switch.gateSetupOn': 'مفعَّل، ويعتمد على إعداد خارجي',
    'switch.gateDeploy': 'يحتاج إلى نشر',
    'switch.on': 'مفعَّل',
    'switch.off': 'مُطفأ',
    'switch.eNotOwner': 'مدير المنصة وحده يستطيع تغيير مفتاح ميزة. وهذا المفتاح باقٍ كما كان.',
    'switch.eDeploy':
      'هذه الميزة تحتاج إلى نشر قبل أن تعمل، فلا يمكن تشغيلها من هنا. وما يجب أن يتحقق أولًا مكتوب تحت اسمها.',
    'switch.eUnknown': 'لم يعد هناك مفتاح بهذا الاسم. أعد تحميل الصفحة.',
    'switch.eRefused': 'رفضت قاعدة البيانات هذا التغيير، والمفتاح باقٍ كما كان. وهذا ما قالته:',
    'switch.eUnsure':
      'لا أحد يستطيع أن يقول هل تغيّر هذا المفتاح. أعد تحميل الصفحة وانظر إليه قبل أن تضغط من جديد.',
    'switch.eSignedOut': 'لقد سُجّل خروجك. سجّل الدخول من جديد ثم حاول مرة أخرى.',
    'switch.rsTitle': 'حصة المعلمين من الإيرادات',
    'switch.rsBadge': 'للمعلمين: {percent}%',
    'switch.rsBody':
      'نسبة المعلم مما تجلبه عملية بيع دورة. تغييرها لا يسري إلا على الطلبات التي تُؤكَّد بعده: كل قيد أرباح يحتفظ بالحصة التي استُحقّ بها، فالمال المقيَّد من قبل لا يتحرك. رسوم المعالجة، وطريقة معاملة الضريبة، وهل الحصة واحدة لكل المعلمين، ما زالت تحتاج إلى قرار سياسة؛ والنسبة لا تقوم مقام البتّ في تلك الشروط، ولا تشغّل المدفوعات.',
    'switch.rsZero': 'هي الآن 0%: لا يستحق المعلمون أي حصة، والمنصة تحتفظ بما تجلبه عملية البيع.',
    'switch.rsField': 'حصة المعلم، نسبة مئوية صحيحة',
    'switch.rsReason': 'سبب هذا التغيير (يُحفظ في سجل التدقيق)',
    'switch.rsExample': 'مثال: سياسة معتمدة لأجور المعلمين، روجعت بتاريخ…',
    'switch.rsSave': 'حفظ حصة الإيرادات',
    'switch.rsSaving': 'جارٍ الحفظ…',
    'switch.rsSaved': 'تم الحفظ.',
    'switch.rsEPercent': 'أدخل نسبة مئوية صحيحة من 0 إلى 100.',
    'switch.rsEReason': 'اكتب سببًا. سيُحفظ في سجل التدقيق.',
    'switch.rsELong': 'اجعل السبب أقل من 500 حرف.',
    'switch.rsENotAllowed':
      'لا يستطيع تغيير حصة الإيرادات إلا مدير مالي أو مدير المنصة. وهي باقية كما كانت.',
    'switch.rsERefused': 'رفضت قاعدة البيانات هذا التغيير، والحصة باقية كما كانت. وهذا ما قالته:',
    'switch.rsEUnsure':
      'لا أحد يستطيع أن يقول هل حُفظت الحصة. أعد تحميل الصفحة واقرأ الرقم قبل أن تحفظ من جديد.',
  },
  ur: {
    'switch.title': 'سہولتوں کے سوئچ',
    'switch.lede':
      'سب کچھ بنا ہوا ہے اور بند حالت میں جاری ہو چکا ہے۔ جیسے جیسے پیشگی شرطیں پوری ہوں، سہولتیں یہاں سے چالو کریں۔',
    'switch.statOn': 'چالو',
    'switch.statOff': 'بند',
    'switch.statSetup': 'بند، پہلے بیرونی تیاری',
    'switch.statDeploy': 'تعیناتی درکار',
    'switch.retention': 'برقراری کی گھڑی',
    'switch.retentionNote':
      'وہ دو چیزیں جنھیں رازداری کا نوٹس ایک مقررہ تاریخ پر حذف کرنے کا وعدہ کرتا ہے: مدد کا معاملہ بند ہونے کے تین سال بعد، اور یہ ریکارڈ کہ کسی استاد کی جانچ ہوئی، جانچ اور اس کی اٹھارہویں سالگرہ میں سے جو بعد میں ہو اس کے سات سال بعد۔ صفحہ بتاتا ہے کہ کس کا وقت آ گیا، کس کی گھڑی نہیں چلی کیونکہ کسی نے اسے بند نہیں کیا، اور حذف محدود کھیپ میں کرتا ہے',
    'switch.deployNote':
      'جس سوئچ پر ”تعیناتی درکار ہے“ لکھا ہو وہ یہاں سے چالو نہیں ہو سکتا، اور یہ انکار کنٹرول چھپا کر نہیں بلکہ ڈیٹا بیس میں نافذ ہے۔ ہر ایک کے ساتھ وہ پیشگی شرط درج ہے جو پہلے پوری ہونی چاہیے۔ جس سوئچ کی کوئی لکھی ہوئی پیشگی شرط نہ ہو وہ ایک خرابی ہے جو چالو ہونے کی منتظر ہے۔',
    'switch.empty': 'سہولتوں کا رجسٹر خالی ہے۔',
    'switch.groupOn': 'چالو: {total} میں سے {on}',
    'switch.gLearner': 'سیکھنے والوں کی سہولتیں',
    'switch.gTeaching': 'تدریس',
    'switch.gMoney': 'رقم',
    'switch.gFamilies': 'بچے اور خاندان',
    'switch.gPlatform': 'پلیٹ فارم',
    'switch.gDelivery': 'ترسیل',
    'switch.gGovernance': 'گورننس',
    'switch.gOther': 'دیگر',
    'switch.trHead': 'ترجمہ۔',
    'switch.trOn':
      'ترجمہ چالو ہے۔ سائن اِن قاری کسی کی لکھی ہوئی بات کے نیچے ”ترجمہ کریں“ دبا سکتا ہے، اور وہ متن Google کو بھیجا جاتا ہے۔',
    'switch.trOnNoKey':
      'ترجمے کا سوئچ چالو ہے، مگر اس سرور پر GOOGLE_TRANSLATE_API_KEY نہیں، اس لیے کوئی بٹن نہیں دکھایا جاتا اور کچھ نہیں بھیجا جاتا۔',
    'switch.trOffKey':
      'ترجمہ بند ہے۔ اس سرور پر کلید موجود ہے؛ نیچے کا سوئچ platform.translate بٹن کو چالو کرتا ہے۔',
    'switch.trOffNoKey':
      'ترجمہ بند ہے، اور اس سرور پر GOOGLE_TRANSLATE_API_KEY نہیں۔ اسے دونوں درکار ہیں۔',
    'switch.trUsed':
      'اس مہینے کے حروف: {monthly} میں سے {characters} ({share}%)۔ درخواستیں: {requests}۔ افراد: {people}۔ ایک شخص ایک دن میں زیادہ سے زیادہ بھیج سکتا ہے: {daily}۔ ارکان مہینے کے چار پانچویں حصے پر رک جاتے ہیں؛ باقی عملے کے لیے رکھا جاتا ہے۔',
    'switch.gateRuntime': 'فوری سوئچ',
    'switch.gateSetupFirst': 'پہلے بیرونی تیاری',
    'switch.gateSetupOn': 'چالو، بیرونی تیاری پر منحصر',
    'switch.gateDeploy': 'تعیناتی درکار ہے',
    'switch.on': 'چالو',
    'switch.off': 'بند',
    'switch.eNotOwner':
      'سہولت کا سوئچ صرف پلیٹ فارم کا منتظم بدل سکتا ہے۔ یہ سوئچ جیسا تھا ویسا ہی ہے۔',
    'switch.eDeploy':
      'اس سہولت کو چلنے سے پہلے تعیناتی درکار ہے، اس لیے یہ یہاں سے چالو نہیں ہو سکتی۔ جو بات پہلے پوری ہونی چاہیے وہ اس کے نام کے نیچے لکھی ہے۔',
    'switch.eUnknown': 'اس نام کا کوئی سوئچ اب موجود نہیں۔ صفحہ دوبارہ کھولیں۔',
    'switch.eRefused':
      'ڈیٹا بیس نے یہ تبدیلی رد کر دی، اور سوئچ جیسا تھا ویسا ہی ہے۔ اس نے یہ کہا:',
    'switch.eUnsure':
      'کوئی نہیں بتا سکتا کہ یہ سوئچ بدلا یا نہیں۔ صفحہ دوبارہ کھولیں اور دوبارہ دبانے سے پہلے اسے دیکھ لیں۔',
    'switch.eSignedOut': 'آپ سائن آؤٹ ہو چکے ہیں۔ دوبارہ سائن اِن کریں، پھر ایک بار اور کوشش کریں۔',
    'switch.rsTitle': 'آمدنی میں اساتذہ کا حصہ',
    'switch.rsBadge': 'اساتذہ کے لیے: {percent}%',
    'switch.rsBody':
      'کورس کی فروخت سے جو آتا ہے اس میں استاد کا فیصد۔ اسے بدلنا صرف ان آرڈروں پر لاگو ہوتا ہے جن کی تصدیق اس کے بعد ہو: کمائی کا ہر اندراج وہی حصہ محفوظ رکھتا ہے جس کے تحت وہ کمایا گیا، اس لیے پہلے سے درج رقم نہیں ہل سکتی۔ پروسیسنگ فیس، ٹیکس کا برتاؤ، اور یہ کہ حصہ ہر استاد کے لیے یکساں ہے یا نہیں، ابھی پالیسی کے فیصلے کے محتاج ہیں؛ فیصد ان شرائط کے فیصلے کا بدل نہیں، اور یہ ادائیگیاں چالو نہیں کرتا۔',
    'switch.rsZero':
      'یہ اس وقت 0% ہے: اساتذہ کوئی حصہ نہیں کماتے اور فروخت سے جو آتا ہے وہ پلیٹ فارم رکھتا ہے۔',
    'switch.rsField': 'استاد کا حصہ، پورا فیصد',
    'switch.rsReason': 'اس تبدیلی کی وجہ (آڈٹ ریکارڈ میں رکھی جاتی ہے)',
    'switch.rsExample': 'مثلاً: اساتذہ کی ادائیگی کی منظور شدہ پالیسی، جس کا جائزہ … کو لیا گیا',
    'switch.rsSave': 'آمدنی کا حصہ محفوظ کریں',
    'switch.rsSaving': 'محفوظ ہو رہا ہے…',
    'switch.rsSaved': 'محفوظ ہو گیا۔',
    'switch.rsEPercent': '0 سے 100 تک پورا فیصد درج کریں۔',
    'switch.rsEReason': 'وجہ لکھیں۔ یہ آڈٹ ریکارڈ میں رکھی جائے گی۔',
    'switch.rsELong': 'وجہ 500 حروف سے کم رکھیں۔',
    'switch.rsENotAllowed':
      'آمدنی کا حصہ صرف مالیاتی منتظم یا پلیٹ فارم کا منتظم بدل سکتا ہے۔ یہ جیسا تھا ویسا ہی ہے۔',
    'switch.rsERefused':
      'ڈیٹا بیس نے یہ تبدیلی رد کر دی، اور حصہ جیسا تھا ویسا ہی ہے۔ اس نے یہ کہا:',
    'switch.rsEUnsure':
      'کوئی نہیں بتا سکتا کہ حصہ محفوظ ہوا یا نہیں۔ صفحہ دوبارہ کھولیں اور دوبارہ محفوظ کرنے سے پہلے عدد پڑھ لیں۔',
  },
  fa: {
    'switch.title': 'کلیدهای قابلیت‌ها',
    'switch.lede':
      'همه چیز ساخته شده و خاموش منتشر شده است. هر وقت پیش‌شرط‌های یک قابلیت برآورده شد، آن را از اینجا روشن کنید.',
    'switch.statOn': 'روشن',
    'switch.statOff': 'خاموش',
    'switch.statSetup': 'خاموش، اول تنظیم بیرونی',
    'switch.statDeploy': 'نیازمند استقرار',
    'switch.retention': 'ساعت نگهداری',
    'switch.retentionNote':
      'دو چیزی که اطلاعیهٔ حریم خصوصی وعده می‌دهد در تاریخی معیّن حذف شود: یک درخواست پشتیبانی سه سال پس از بسته‌شدنش، و سابقهٔ اینکه پیشینهٔ معلمی بررسی شده، هفت سال پس از هر کدام که دیرتر باشد: بررسی یا هجده‌سالگی او. صفحه می‌گوید موعد چه چیزهایی رسیده، چه چیزهایی ساعتی ندارند چون کسی آن‌ها را نبسته، و حذف را در دسته‌ای محدود انجام می‌دهد',
    'switch.deployNote':
      'قابلیتی که نشانش «نیازمند استقرار است» باشد از اینجا روشن نمی‌شود، و این امتناع در پایگاه داده اعمال می‌شود، نه با پنهان‌کردن کلید. هر کدام پیش‌شرطی دارد که باید اول برقرار باشد. قابلیتی که پیش‌شرط نوشته‌شده ندارد خطایی است که منتظر روشن‌شدن است.',
    'switch.empty': 'فهرست قابلیت‌ها خالی است.',
    'switch.groupOn': 'روشن: {on} از {total}',
    'switch.gLearner': 'قابلیت‌های یادگیرندگان',
    'switch.gTeaching': 'تدریس',
    'switch.gMoney': 'پول',
    'switch.gFamilies': 'کودکان و خانواده‌ها',
    'switch.gPlatform': 'سکو',
    'switch.gDelivery': 'تحویل محتوا',
    'switch.gGovernance': 'حاکمیت',
    'switch.gOther': 'سایر',
    'switch.trHead': 'ترجمه.',
    'switch.trOn':
      'ترجمه روشن است. خواننده‌ای که وارد شده می‌تواند زیر نوشتهٔ دیگران «ترجمه» را بزند، و آن متن برای Google فرستاده می‌شود.',
    'switch.trOnNoKey':
      'کلید ترجمه روشن است، اما این سرور GOOGLE_TRANSLATE_API_KEY ندارد، پس دکمه‌ای نمایش داده نمی‌شود و چیزی فرستاده نمی‌شود.',
    'switch.trOffKey':
      'ترجمه خاموش است. این سرور کلید دارد؛ کلید platform.translate در پایین دکمه را روشن می‌کند.',
    'switch.trOffNoKey':
      'ترجمه خاموش است و این سرور GOOGLE_TRANSLATE_API_KEY ندارد. به هر دو نیاز دارد.',
    'switch.trUsed':
      'نویسه‌های این ماه: {characters} از {monthly} ({share}%). درخواست‌ها: {requests}. افراد: {people}. بیشترین مقداری که یک نفر در یک روز می‌تواند بفرستد: {daily}. اعضا در چهار پنجمِ سهم ماه متوقف می‌شوند؛ باقی برای کارکنان نگه داشته می‌شود.',
    'switch.gateRuntime': 'کلید آنی',
    'switch.gateSetupFirst': 'اول تنظیم بیرونی',
    'switch.gateSetupOn': 'روشن، متکی به تنظیم بیرونی',
    'switch.gateDeploy': 'نیازمند استقرار است',
    'switch.on': 'روشن',
    'switch.off': 'خاموش',
    'switch.eNotOwner':
      'فقط مدیر سکو می‌تواند کلید یک قابلیت را تغییر دهد. این کلید همان‌طور که بود مانده است.',
    'switch.eDeploy':
      'این قابلیت پیش از آنکه کار کند به استقرار نیاز دارد، پس از اینجا روشن نمی‌شود. آنچه باید اول برقرار باشد زیر نامش نوشته شده است.',
    'switch.eUnknown': 'دیگر کلیدی با این نام وجود ندارد. صفحه را دوباره بار کنید.',
    'switch.eRefused':
      'پایگاه داده این تغییر را نپذیرفت و کلید همان‌طور که بود مانده است. آنچه گفت:',
    'switch.eUnsure':
      'هیچ‌کس نمی‌تواند بگوید این کلید تغییر کرد یا نه. صفحه را دوباره بار کنید و پیش از فشردن دوباره، به آن نگاه کنید.',
    'switch.eSignedOut': 'از حساب خارج شده‌اید. دوباره وارد شوید و یک بار دیگر تلاش کنید.',
    'switch.rsTitle': 'سهم معلمان از درآمد',
    'switch.rsBadge': 'برای معلمان: {percent}%',
    'switch.rsBody':
      'درصد معلم از آنچه فروش یک دوره به دست می‌آورد. تغییر آن فقط بر سفارش‌هایی اثر دارد که پس از آن تأیید شوند: هر ثبتِ درآمد سهمی را که با آن به دست آمده نگه می‌دارد، پس پولی که پیش‌تر ثبت شده جابه‌جا نمی‌شود. کارمزد پردازش، شیوهٔ برخورد با مالیات، و اینکه سهم برای همهٔ معلمان یکسان است یا نه، هنوز به تصمیم سیاستی نیاز دارد؛ این درصد جای تصمیم دربارهٔ آن شرایط را نمی‌گیرد و پرداخت‌ها را روشن نمی‌کند.',
    'switch.rsZero':
      'اکنون ۰% است: معلمان سهمی به دست نمی‌آورند و آنچه فروش به دست می‌آورد نزد سکو می‌ماند.',
    'switch.rsField': 'سهم معلم، درصد صحیح',
    'switch.rsReason': 'دلیل این تغییر (در سابقهٔ ممیزی نگه داشته می‌شود)',
    'switch.rsExample': 'برای نمونه: سیاست تأییدشدهٔ پرداخت به معلمان، بازبینی‌شده در تاریخ…',
    'switch.rsSave': 'ذخیرهٔ سهم درآمد',
    'switch.rsSaving': 'در حال ذخیره…',
    'switch.rsSaved': 'ذخیره شد.',
    'switch.rsEPercent': 'درصدی صحیح از ۰ تا ۱۰۰ وارد کنید.',
    'switch.rsEReason': 'دلیلی بنویسید. در سابقهٔ ممیزی نگه داشته می‌شود.',
    'switch.rsELong': 'دلیل را کمتر از ۵۰۰ نویسه نگه دارید.',
    'switch.rsENotAllowed':
      'فقط مدیر مالی یا مدیر سکو می‌تواند سهم درآمد را تغییر دهد. سهم همان‌طور که بود مانده است.',
    'switch.rsERefused':
      'پایگاه داده این تغییر را نپذیرفت و سهم همان‌طور که بود مانده است. آنچه گفت:',
    'switch.rsEUnsure':
      'هیچ‌کس نمی‌تواند بگوید سهم ذخیره شد یا نه. صفحه را دوباره بار کنید و پیش از ذخیرهٔ دوباره، رقم را بخوانید.',
  },
  'fa-af': {
    'switch.title': 'کلیدهای قابلیت‌ها',
    'switch.lede':
      'همه چیز ساخته شده و خاموش نشر شده است. هر وقت پیش‌شرط‌های یک قابلیت برآورده شد، آن را از این‌جا روشن کنید.',
    'switch.statOn': 'روشن',
    'switch.statOff': 'خاموش',
    'switch.statSetup': 'خاموش، اول تنظیم بیرونی',
    'switch.statDeploy': 'نیازمند نصب نسخهٔ نو',
    'switch.retention': 'ساعت نگهداری',
    'switch.retentionNote':
      'دو چیزی که اطلاعیهٔ محرمیت وعده می‌دهد در تاریخی معیّن حذف شود: یک درخواست پشتیبانی سه سال پس از بسته‌شدنش، و سابقهٔ این‌که پیشینهٔ آموزگاری بررسی شده، هفت سال پس از هر کدام که دیرتر باشد: بررسی یا هجده‌سالگی او. صفحه می‌گوید موعد چه چیزهایی رسیده، چه چیزهایی ساعتی ندارند چون کسی آن‌ها را نبسته، و حذف را در دسته‌ای محدود انجام می‌دهد',
    'switch.deployNote':
      'قابلیتی که نشانش «نیازمند نصب نسخهٔ نو است» باشد از این‌جا روشن نمی‌شود، و این امتناع در دیتابیس اعمال می‌شود، نه با پنهان‌کردن کلید. هر کدام پیش‌شرطی دارد که باید اول برقرار باشد. قابلیتی که پیش‌شرط نوشته‌شده ندارد خطایی است که منتظر روشن‌شدن است.',
    'switch.empty': 'فهرست قابلیت‌ها خالی است.',
    'switch.groupOn': 'روشن: {on} از {total}',
    'switch.gLearner': 'قابلیت‌های شاگردان',
    'switch.gTeaching': 'تدریس',
    'switch.gMoney': 'پول',
    'switch.gFamilies': 'اطفال و خانواده‌ها',
    'switch.gPlatform': 'پلتفرم',
    'switch.gDelivery': 'رساندن محتوا',
    'switch.gGovernance': 'حکومت‌داری',
    'switch.gOther': 'دیگر',
    'switch.trHead': 'ترجمه.',
    'switch.trOn':
      'ترجمه روشن است. خواننده‌ای که داخل شده می‌تواند زیر نوشتهٔ دیگران «ترجمه کنید» را فشار دهد، و آن متن به Google فرستاده می‌شود.',
    'switch.trOnNoKey':
      'کلید ترجمه روشن است، اما این سرور GOOGLE_TRANSLATE_API_KEY ندارد، پس دکمه‌ای نشان داده نمی‌شود و چیزی فرستاده نمی‌شود.',
    'switch.trOffKey':
      'ترجمه خاموش است. این سرور کلید دارد؛ کلید platform.translate در پایین دکمه را روشن می‌کند.',
    'switch.trOffNoKey':
      'ترجمه خاموش است و این سرور GOOGLE_TRANSLATE_API_KEY ندارد. به هر دو نیاز دارد.',
    'switch.trUsed':
      'حروف این ماه: {characters} از {monthly} ({share}%). درخواست‌ها: {requests}. افراد: {people}. بیشترین مقداری که یک نفر در یک روز فرستاده می‌تواند: {daily}. اعضا در چهار پنجمِ سهم ماه متوقف می‌شوند؛ باقی برای کارمندان نگه داشته می‌شود.',
    'switch.gateRuntime': 'کلید آنی',
    'switch.gateSetupFirst': 'اول تنظیم بیرونی',
    'switch.gateSetupOn': 'روشن، متکی به تنظیم بیرونی',
    'switch.gateDeploy': 'نیازمند نصب نسخهٔ نو است',
    'switch.on': 'روشن',
    'switch.off': 'خاموش',
    'switch.eNotOwner':
      'تنها مدیر پلتفرم می‌تواند کلید یک قابلیت را تغییر دهد. این کلید همان‌طور که بود مانده است.',
    'switch.eDeploy':
      'این قابلیت پیش از آن‌که کار کند به نصب نسخهٔ نو نیاز دارد، پس از این‌جا روشن نمی‌شود. آنچه باید اول برقرار باشد زیر نامش نوشته شده است.',
    'switch.eUnknown': 'دیگر کلیدی با این نام وجود ندارد. صفحه را دوباره باز کنید.',
    'switch.eRefused': 'دیتابیس این تغییر را نپذیرفت و کلید همان‌طور که بود مانده است. آنچه گفت:',
    'switch.eUnsure':
      'هیچ‌کس گفته نمی‌تواند که این کلید تغییر کرد یا نه. صفحه را دوباره باز کنید و پیش از دوباره فشار دادن، به آن نگاه کنید.',
    'switch.eSignedOut': 'از حساب خارج شده‌اید. دوباره داخل شوید و یک بار دیگر کوشش کنید.',
    'switch.rsTitle': 'سهم آموزگاران از عاید',
    'switch.rsBadge': 'برای آموزگاران: {percent}%',
    'switch.rsBody':
      'فیصدی آموزگار از آنچه فروش یک کورس به دست می‌آورد. تغییر آن تنها بر فرمایش‌هایی اثر دارد که پس از آن تأیید شوند: هر ثبتِ عاید سهمی را که با آن به دست آمده نگه می‌دارد، پس پولی که پیش‌تر ثبت شده جابه‌جا نمی‌شود. فیس پردازش، شیوهٔ برخورد با مالیه، و این‌که سهم برای همهٔ آموزگاران یکسان است یا نه، هنوز به تصمیم پالیسی نیاز دارد؛ این فیصدی جای تصمیم دربارهٔ آن شرایط را نمی‌گیرد و پرداخت‌ها را روشن نمی‌کند.',
    'switch.rsZero':
      'اکنون ۰% است: آموزگاران سهمی به دست نمی‌آورند و آنچه فروش به دست می‌آورد نزد پلتفرم می‌ماند.',
    'switch.rsField': 'سهم آموزگار، فیصدی صحیح',
    'switch.rsReason': 'دلیل این تغییر (در سابقهٔ بازرسی نگه داشته می‌شود)',
    'switch.rsExample': 'برای نمونه: پالیسی تأییدشدهٔ پرداخت به آموزگاران، بازبینی‌شده در تاریخ…',
    'switch.rsSave': 'ذخیرهٔ سهم عاید',
    'switch.rsSaving': 'در حال ذخیره…',
    'switch.rsSaved': 'ذخیره شد.',
    'switch.rsEPercent': 'فیصدی صحیح از ۰ تا ۱۰۰ وارد کنید.',
    'switch.rsEReason': 'دلیلی بنویسید. در سابقهٔ بازرسی نگه داشته می‌شود.',
    'switch.rsELong': 'دلیل را کمتر از ۵۰۰ حرف نگه دارید.',
    'switch.rsENotAllowed':
      'تنها مدیر مالی یا مدیر پلتفرم می‌تواند سهم عاید را تغییر دهد. سهم همان‌طور که بود مانده است.',
    'switch.rsERefused': 'دیتابیس این تغییر را نپذیرفت و سهم همان‌طور که بود مانده است. آنچه گفت:',
    'switch.rsEUnsure':
      'هیچ‌کس گفته نمی‌تواند که سهم ذخیره شد یا نه. صفحه را دوباره باز کنید و پیش از ذخیرهٔ دوباره، رقم را بخوانید.',
  },
  tr: {
    'switch.title': 'Özellik anahtarları',
    'switch.lede':
      'Her şey yapılmış ve kapalı olarak yayına alınmıştır. Ön koşulları sağlandıkça özellikleri buradan açın.',
    'switch.statOn': 'Açık',
    'switch.statOff': 'Kapalı',
    'switch.statSetup': 'Kapalı, önce dış kurulum',
    'switch.statDeploy': 'Dağıtım gerektiriyor',
    'switch.retention': 'Saklama saati',
    'switch.retentionNote':
      'gizlilik bildiriminin belirli bir tarihte silmeyi vaat ettiği iki şey: kapanmasından üç yıl sonra bir destek dosyası, ve bir öğretmenin tarandığına dair kayıt; taramanın ve öğretmenin on sekizinci doğum gününün geç olanından yedi yıl sonra. Sayfa neyin vadesinin geldiğini, kimse kapatmadığı için neyin saatinin işlemediğini söyler ve silmeyi sınırlı bir parti hâlinde yapar',
    'switch.deployNote':
      '“Dağıtım gerektirir” işaretli bir özellik buradan açılamaz; bu ret, denetimi gizleyerek değil veritabanında uygulanır. Her biri, önce doğru olması gereken ön koşulu taşır. Yazılı ön koşulu olmayan bir özellik, açılmayı bekleyen bir hatadır.',
    'switch.empty': 'Özellik kaydı boş.',
    'switch.groupOn': 'Açık: {on} / {total}',
    'switch.gLearner': 'Öğrenci özellikleri',
    'switch.gTeaching': 'Öğretim',
    'switch.gMoney': 'Para',
    'switch.gFamilies': 'Çocuklar ve aileler',
    'switch.gPlatform': 'Platform',
    'switch.gDelivery': 'İçerik teslimi',
    'switch.gGovernance': 'Yönetişim',
    'switch.gOther': 'Diğer',
    'switch.trHead': 'Çeviri.',
    'switch.trOn':
      'Çeviri açık. Oturum açmış bir okur, başkasının yazdığının altındaki “Çevir” düğmesine basabilir ve o metin Google’a gönderilir.',
    'switch.trOnNoKey':
      'Çeviri anahtarı açık, ama bu sunucuda GOOGLE_TRANSLATE_API_KEY yok; bu yüzden hiçbir düğme gösterilmez ve hiçbir şey gönderilmez.',
    'switch.trOffKey':
      'Çeviri kapalı. Bu sunucuda bir anahtar var; aşağıdaki platform.translate anahtarı düğmeyi açar.',
    'switch.trOffNoKey':
      'Çeviri kapalı ve bu sunucuda GOOGLE_TRANSLATE_API_KEY yok. İkisi de gerekir.',
    'switch.trUsed':
      'Bu ayki karakterler: {characters} / {monthly} (%{share}). İstekler: {requests}. Kişiler: {people}. Bir kişinin bir günde gönderebileceği en çok miktar: {daily}. Üyeler ayın beşte dördünde durur; kalanı görevliler için ayrılır.',
    'switch.gateRuntime': 'Anında açılır',
    'switch.gateSetupFirst': 'Önce dış kurulum',
    'switch.gateSetupOn': 'Açık, dış kuruluma dayanıyor',
    'switch.gateDeploy': 'Dağıtım gerektirir',
    'switch.on': 'Açık',
    'switch.off': 'Kapalı',
    'switch.eNotOwner':
      'Bir özellik anahtarını yalnızca platform yöneticisi değiştirebilir. Bu anahtar olduğu gibi duruyor.',
    'switch.eDeploy':
      'Bu özelliğin çalışabilmesi için önce dağıtım gerekir; bu yüzden buradan açılamaz. Önce neyin doğru olması gerektiği adının altında yazılıdır.',
    'switch.eUnknown': 'Bu adda bir anahtar artık yok. Sayfayı yeniden yükleyin.',
    'switch.eRefused':
      'Veritabanı bu değişikliği reddetti ve anahtar olduğu gibi duruyor. Söylediği şu:',
    'switch.eUnsure':
      'Bu anahtarın değişip değişmediğini kimse söyleyemez. Sayfayı yeniden yükleyin ve yeniden basmadan önce ona bakın.',
    'switch.eSignedOut': 'Oturumunuz kapanmış. Yeniden oturum açın, sonra bir kez daha deneyin.',
    'switch.rsTitle': 'Öğretmen gelir payı',
    'switch.rsBadge': 'Öğretmenlere: %{percent}',
    'switch.rsBody':
      'Bir kurs satışının getirdiğinden öğretmenin aldığı yüzde. Değiştirilmesi yalnızca sonradan onaylanan siparişlere uygulanır: her kazanç kaydı, hangi payla kazanıldıysa onu saklar; bu yüzden önceden kaydedilmiş para yer değiştiremez. İşlem ücretleri, verginin nasıl ele alınacağı ve payın her öğretmen için aynı olup olmadığı hâlâ bir politika kararı bekliyor; yüzde, bu koşullara karar vermenin yerini tutmaz ve ödemeleri açmaz.',
    'switch.rsZero':
      'Şu anda %0: öğretmenler pay kazanmıyor ve satışın getirdiği platformda kalıyor.',
    'switch.rsField': 'Öğretmen payı, tam yüzde',
    'switch.rsReason': 'Bu değişikliğin nedeni (denetim kaydında saklanır)',
    'switch.rsExample':
      'Örneğin: öğretmenlere ödeme konusunda onaylanmış politika, gözden geçirilme tarihi…',
    'switch.rsSave': 'Gelir payını kaydet',
    'switch.rsSaving': 'Kaydediliyor…',
    'switch.rsSaved': 'Kaydedildi.',
    'switch.rsEPercent': '0 ile 100 arasında tam bir yüzde girin.',
    'switch.rsEReason': 'Yazılı bir neden verin. Denetim kaydında saklanacaktır.',
    'switch.rsELong': 'Nedeni 500 karakterin altında tutun.',
    'switch.rsENotAllowed':
      'Gelir payını yalnızca bir finans yöneticisi veya platform yöneticisi değiştirebilir. Pay olduğu gibi duruyor.',
    'switch.rsERefused':
      'Veritabanı bu değişikliği reddetti ve pay olduğu gibi duruyor. Söylediği şu:',
    'switch.rsEUnsure':
      'Payın kaydedilip kaydedilmediğini kimse söyleyemez. Sayfayı yeniden yükleyin ve yeniden kaydetmeden önce rakamı okuyun.',
  },
  id: {
    'switch.title': 'Sakelar fitur',
    'switch.lede':
      'Semuanya sudah dibuat dan dirilis dalam keadaan mati. Nyalakan fitur di sini setelah prasyaratnya terpenuhi.',
    'switch.statOn': 'Menyala',
    'switch.statOff': 'Mati',
    'switch.statSetup': 'Mati, penyiapan luar dulu',
    'switch.statDeploy': 'Perlu deploy',
    'switch.retention': 'Jam retensi',
    'switch.retentionNote':
      'dua hal yang dijanjikan pemberitahuan privasi untuk dihapus pada tanggal tertentu: perkara dukungan tiga tahun setelah ditutup, dan catatan bahwa seorang pengajar telah diperiksa tujuh tahun setelah yang lebih akhir antara pemeriksaan itu dan ulang tahunnya yang kedelapan belas. Halaman itu menyebutkan apa yang sudah jatuh tempo, apa yang tidak punya jam karena tidak ada yang menutupnya, dan melakukan penghapusan dalam satu gelombang yang terbatas',
    'switch.deployNote':
      'Fitur yang bertanda “Perlu deploy” tidak dapat dinyalakan di sini, dan penolakan itu diberlakukan di basis data, bukan dengan menyembunyikan kontrolnya. Masing-masing membawa prasyarat yang harus benar lebih dulu. Fitur tanpa prasyarat tertulis adalah galat yang menunggu untuk dinyalakan.',
    'switch.empty': 'Daftar fitur kosong.',
    'switch.groupOn': 'Menyala: {on} dari {total}',
    'switch.gLearner': 'Fitur peserta',
    'switch.gTeaching': 'Pengajaran',
    'switch.gMoney': 'Uang',
    'switch.gFamilies': 'Anak dan keluarga',
    'switch.gPlatform': 'Platform',
    'switch.gDelivery': 'Pengantaran konten',
    'switch.gGovernance': 'Tata kelola',
    'switch.gOther': 'Lainnya',
    'switch.trHead': 'Terjemahan.',
    'switch.trOn':
      'Terjemahan menyala. Pembaca yang sudah masuk dapat menekan “Terjemahkan” di bawah tulisan orang lain, dan teks itu dikirim ke Google.',
    'switch.trOnNoKey':
      'Sakelar terjemahan menyala, tetapi server ini tidak memiliki GOOGLE_TRANSLATE_API_KEY, jadi tidak ada tombol yang ditampilkan dan tidak ada yang dikirim.',
    'switch.trOffKey':
      'Terjemahan mati. Server ini memiliki kunci; sakelar platform.translate di bawah menyalakan tombolnya.',
    'switch.trOffNoKey':
      'Terjemahan mati, dan server ini tidak memiliki GOOGLE_TRANSLATE_API_KEY. Keduanya diperlukan.',
    'switch.trUsed':
      'Karakter bulan ini: {characters} dari {monthly} ({share}%). Permintaan: {requests}. Orang: {people}. Paling banyak yang boleh dikirim satu orang dalam sehari: {daily}. Anggota berhenti pada empat perlima jatah bulan itu; sisanya disimpan untuk staf.',
    'switch.gateRuntime': 'Sakelar langsung',
    'switch.gateSetupFirst': 'Penyiapan luar dulu',
    'switch.gateSetupOn': 'Menyala, bergantung pada penyiapan luar',
    'switch.gateDeploy': 'Perlu deploy',
    'switch.on': 'Menyala',
    'switch.off': 'Mati',
    'switch.eNotOwner':
      'Hanya admin platform yang dapat mengubah sakelar fitur. Sakelar ini tetap seperti semula.',
    'switch.eDeploy':
      'Fitur itu perlu deploy sebelum dapat berjalan, jadi tidak dapat dinyalakan di sini. Apa yang harus benar lebih dulu tertulis di bawah namanya.',
    'switch.eUnknown': 'Tidak ada lagi sakelar dengan nama itu. Muat ulang halaman.',
    'switch.eRefused':
      'Basis data menolak perubahan itu, dan sakelar tetap seperti semula. Yang dikatakannya:',
    'switch.eUnsure':
      'Tidak ada yang dapat memastikan apakah sakelar itu berubah. Muat ulang halaman dan lihat sakelarnya sebelum menekan lagi.',
    'switch.eSignedOut': 'Anda sudah keluar. Masuk lagi, lalu coba sekali lagi.',
    'switch.rsTitle': 'Bagi hasil pendapatan pengajar',
    'switch.rsBadge': 'Untuk pengajar: {percent}%',
    'switch.rsBody':
      'Persentase pengajar dari apa yang dihasilkan penjualan kursus. Perubahannya hanya berlaku untuk pesanan yang dikonfirmasi sesudahnya: setiap catatan penghasilan menyimpan bagian yang berlaku saat penghasilan itu diperoleh, jadi uang yang sudah dibukukan tidak dapat bergeser. Biaya pemrosesan, perlakuan pajak, dan apakah bagian itu sama untuk setiap pengajar masih memerlukan keputusan kebijakan; persentase ini bukan pengganti keputusan atas ketentuan-ketentuan itu, dan tidak menyalakan pembayaran kepada pengajar.',
    'switch.rsZero':
      'Saat ini 0%: pengajar tidak memperoleh bagian dan platform menyimpan apa yang dihasilkan penjualan.',
    'switch.rsField': 'Bagian pengajar, persen bulat',
    'switch.rsReason': 'Alasan perubahan ini (disimpan dalam jejak audit)',
    'switch.rsExample':
      'Misalnya: kebijakan pembayaran pengajar yang telah disetujui, ditinjau pada…',
    'switch.rsSave': 'Simpan bagi hasil pendapatan',
    'switch.rsSaving': 'Menyimpan…',
    'switch.rsSaved': 'Tersimpan.',
    'switch.rsEPercent': 'Masukkan persentase bulat dari 0 sampai 100.',
    'switch.rsEReason': 'Berikan alasan tertulis. Alasan itu akan disimpan dalam jejak audit.',
    'switch.rsELong': 'Jaga agar alasan di bawah 500 karakter.',
    'switch.rsENotAllowed':
      'Hanya admin keuangan atau admin platform yang dapat mengubah bagi hasil pendapatan. Bagian itu tetap seperti semula.',
    'switch.rsERefused':
      'Basis data menolak perubahan itu, dan bagian itu tetap seperti semula. Yang dikatakannya:',
    'switch.rsEUnsure':
      'Tidak ada yang dapat memastikan apakah bagian itu tersimpan. Muat ulang halaman dan baca angkanya sebelum menyimpan lagi.',
  },
  ms: {
    'switch.title': 'Suis ciri',
    'switch.lede':
      'Semuanya sudah dibina dan dikeluarkan dalam keadaan mati. Hidupkan ciri di sini apabila prasyaratnya dipenuhi.',
    'switch.statOn': 'Hidup',
    'switch.statOff': 'Mati',
    'switch.statSetup': 'Mati, persediaan luar dahulu',
    'switch.statDeploy': 'Perlu pelancaran kod',
    'switch.retention': 'Jam penyimpanan',
    'switch.retentionNote':
      'dua perkara yang dijanjikan oleh notis privasi untuk dipadam pada tarikh tertentu: kes sokongan tiga tahun selepas ia ditutup, dan rekod bahawa seorang guru telah disaring tujuh tahun selepas yang lebih lewat antara saringan itu dengan hari lahirnya yang kelapan belas. Halaman itu menyatakan apa yang sudah sampai tempoh, apa yang tiada jam kerana tiada sesiapa menutupnya, dan melaksanakan pemadaman dalam satu kelompok yang terhad',
    'switch.deployNote':
      'Ciri yang bertanda “Perlu pelancaran kod” tidak boleh dihidupkan di sini, dan penolakan itu dikuatkuasakan dalam pangkalan data, bukan dengan menyembunyikan kawalannya. Setiap satu membawa prasyarat yang mesti benar dahulu. Ciri tanpa prasyarat bertulis ialah pepijat yang menunggu untuk dihidupkan.',
    'switch.empty': 'Daftar ciri kosong.',
    'switch.groupOn': 'Hidup: {on} daripada {total}',
    'switch.gLearner': 'Ciri pelajar',
    'switch.gTeaching': 'Pengajaran',
    'switch.gMoney': 'Wang',
    'switch.gFamilies': 'Kanak-kanak dan keluarga',
    'switch.gPlatform': 'Platform',
    'switch.gDelivery': 'Penghantaran kandungan',
    'switch.gGovernance': 'Tadbir urus',
    'switch.gOther': 'Lain-lain',
    'switch.trHead': 'Terjemahan.',
    'switch.trOn':
      'Terjemahan hidup. Pembaca yang telah log masuk boleh menekan “Terjemah” di bawah tulisan orang lain, dan teks itu dihantar kepada Google.',
    'switch.trOnNoKey':
      'Suis terjemahan hidup, tetapi pelayan ini tiada GOOGLE_TRANSLATE_API_KEY, jadi tiada butang dipaparkan dan tiada apa-apa dihantar.',
    'switch.trOffKey':
      'Terjemahan mati. Pelayan ini mempunyai kunci; suis platform.translate di bawah menghidupkan butang itu.',
    'switch.trOffNoKey':
      'Terjemahan mati, dan pelayan ini tiada GOOGLE_TRANSLATE_API_KEY. Kedua-duanya diperlukan.',
    'switch.trUsed':
      'Aksara bulan ini: {characters} daripada {monthly} ({share}%). Permintaan: {requests}. Orang: {people}. Paling banyak yang boleh dihantar oleh seorang dalam sehari: {daily}. Ahli berhenti pada empat perlima peruntukan bulan itu; selebihnya disimpan untuk kakitangan.',
    'switch.gateRuntime': 'Suis serta-merta',
    'switch.gateSetupFirst': 'Persediaan luar dahulu',
    'switch.gateSetupOn': 'Hidup, bergantung pada persediaan luar',
    'switch.gateDeploy': 'Perlu pelancaran kod',
    'switch.on': 'Hidup',
    'switch.off': 'Mati',
    'switch.eNotOwner':
      'Hanya pentadbir platform boleh menukar suis ciri. Suis ini kekal seperti asal.',
    'switch.eDeploy':
      'Ciri itu perlu pelancaran kod sebelum boleh berjalan, jadi ia tidak boleh dihidupkan di sini. Apa yang mesti benar dahulu tertulis di bawah namanya.',
    'switch.eUnknown': 'Tiada lagi suis dengan nama itu. Muat semula halaman.',
    'switch.eRefused':
      'Pangkalan data menolak perubahan itu, dan suis kekal seperti asal. Apa yang dikatakannya:',
    'switch.eUnsure':
      'Tiada sesiapa dapat memastikan sama ada suis itu berubah. Muat semula halaman dan lihat suis itu sebelum menekan lagi.',
    'switch.eSignedOut': 'Anda telah log keluar. Log masuk semula, kemudian cuba sekali lagi.',
    'switch.rsTitle': 'Bahagian hasil guru',
    'switch.rsBadge': 'Kepada guru: {percent}%',
    'switch.rsBody':
      'Peratusan guru daripada apa yang dihasilkan oleh jualan kursus. Perubahannya hanya terpakai kepada pesanan yang disahkan selepas itu: setiap catatan pendapatan menyimpan bahagian yang berkuat kuasa semasa pendapatan itu diperoleh, jadi wang yang sudah dibukukan tidak boleh berganjak. Yuran pemprosesan, layanan cukai, dan sama ada bahagian itu sama bagi setiap guru masih memerlukan keputusan dasar; peratusan ini bukan pengganti keputusan tentang terma-terma itu, dan ia tidak menghidupkan bayaran kepada guru.',
    'switch.rsZero':
      'Kini 0%: guru tidak memperoleh sebarang bahagian dan platform menyimpan apa yang dihasilkan oleh jualan.',
    'switch.rsField': 'Bahagian guru, peratus bulat',
    'switch.rsReason': 'Sebab perubahan ini (disimpan dalam jejak audit)',
    'switch.rsExample': 'Contohnya: dasar bayaran guru yang telah diluluskan, disemak pada…',
    'switch.rsSave': 'Simpan bahagian hasil',
    'switch.rsSaving': 'Menyimpan…',
    'switch.rsSaved': 'Disimpan.',
    'switch.rsEPercent': 'Masukkan peratusan bulat dari 0 hingga 100.',
    'switch.rsEReason': 'Berikan sebab bertulis. Ia akan disimpan dalam jejak audit.',
    'switch.rsELong': 'Pastikan sebab itu kurang daripada 500 aksara.',
    'switch.rsENotAllowed':
      'Hanya pentadbir kewangan atau pentadbir platform boleh menukar bahagian hasil. Bahagian itu kekal seperti asal.',
    'switch.rsERefused':
      'Pangkalan data menolak perubahan itu, dan bahagian itu kekal seperti asal. Apa yang dikatakannya:',
    'switch.rsEUnsure':
      'Tiada sesiapa dapat memastikan sama ada bahagian itu disimpan. Muat semula halaman dan baca angkanya sebelum menyimpan lagi.',
  },
  bn: {
    'switch.title': 'ফিচারের সুইচ',
    'switch.lede':
      'সবকিছু তৈরি এবং বন্ধ অবস্থায় চালু করা হয়েছে। পূর্বশর্ত পূরণ হলে এখান থেকে ফিচার চালু করুন।',
    'switch.statOn': 'চালু',
    'switch.statOff': 'বন্ধ',
    'switch.statSetup': 'বন্ধ, আগে বাইরের প্রস্তুতি',
    'switch.statDeploy': 'ডিপ্লয় দরকার',
    'switch.retention': 'সংরক্ষণকালের ঘড়ি',
    'switch.retentionNote':
      'গোপনীয়তা বিজ্ঞপ্তি যে দুটি জিনিস নির্দিষ্ট তারিখে মুছে ফেলার প্রতিশ্রুতি দেয়: সহায়তার কোনো কেস বন্ধ হওয়ার তিন বছর পর, এবং কোনো শিক্ষককে যাচাই করা হয়েছে এমন নথি, যাচাই ও তাঁর আঠারোতম জন্মদিনের মধ্যে যেটি পরে তার সাত বছর পর। পাতাটি বলে কোনটির সময় হয়েছে, কোনটির ঘড়ি নেই কারণ কেউ সেটি বন্ধ করেনি, এবং মুছে ফেলার কাজ সীমিত ব্যাচে করে',
    'switch.deployNote':
      '“ডিপ্লয় দরকার” চিহ্নিত ফিচার এখান থেকে চালু করা যায় না, এবং এই প্রত্যাখ্যান নিয়ন্ত্রণটি লুকিয়ে নয়, ডেটাবেসে কার্যকর করা হয়। প্রতিটির সঙ্গে সেই পূর্বশর্ত থাকে যা আগে সত্য হতে হবে। লিখিত পূর্বশর্ত ছাড়া কোনো ফিচার হলো চালু হওয়ার অপেক্ষায় থাকা একটি ত্রুটি।',
    'switch.empty': 'ফিচারের তালিকা খালি।',
    'switch.groupOn': 'চালু: {total}-এর মধ্যে {on}',
    'switch.gLearner': 'শিক্ষার্থীদের ফিচার',
    'switch.gTeaching': 'শিক্ষাদান',
    'switch.gMoney': 'অর্থ',
    'switch.gFamilies': 'শিশু ও পরিবার',
    'switch.gPlatform': 'প্ল্যাটফর্ম',
    'switch.gDelivery': 'কনটেন্ট পৌঁছানো',
    'switch.gGovernance': 'পরিচালন',
    'switch.gOther': 'অন্যান্য',
    'switch.trHead': 'অনুবাদ।',
    'switch.trOn':
      'অনুবাদ চালু আছে। সাইন ইন করা পাঠক অন্যের লেখার নিচে “অনুবাদ করুন” চাপতে পারেন, এবং সেই লেখা Google-এ পাঠানো হয়।',
    'switch.trOnNoKey':
      'অনুবাদের সুইচ চালু, কিন্তু এই সার্ভারে GOOGLE_TRANSLATE_API_KEY নেই, তাই কোনো বোতাম দেখানো হয় না এবং কিছুই পাঠানো হয় না।',
    'switch.trOffKey':
      'অনুবাদ বন্ধ। এই সার্ভারে একটি কী আছে; নিচের platform.translate সুইচটি বোতামটি চালু করে।',
    'switch.trOffNoKey': 'অনুবাদ বন্ধ, এবং এই সার্ভারে GOOGLE_TRANSLATE_API_KEY নেই। দুটোই দরকার।',
    'switch.trUsed':
      'এই মাসের অক্ষর: {monthly}-এর মধ্যে {characters} ({share}%)। অনুরোধ: {requests}। মানুষ: {people}। একজন এক দিনে সর্বোচ্চ যা পাঠাতে পারেন: {daily}। সদস্যরা মাসের পাঁচ ভাগের চার ভাগে থামেন; বাকিটা কর্মীদের জন্য রাখা হয়।',
    'switch.gateRuntime': 'তাৎক্ষণিক সুইচ',
    'switch.gateSetupFirst': 'আগে বাইরের প্রস্তুতি',
    'switch.gateSetupOn': 'চালু, বাইরের প্রস্তুতির ওপর নির্ভরশীল',
    'switch.gateDeploy': 'ডিপ্লয় দরকার',
    'switch.on': 'চালু',
    'switch.off': 'বন্ধ',
    'switch.eNotOwner':
      'ফিচারের সুইচ কেবল প্ল্যাটফর্ম অ্যাডমিনই বদলাতে পারেন। এই সুইচটি যেমন ছিল তেমনই আছে।',
    'switch.eDeploy':
      'এই ফিচারটি চলার আগে ডিপ্লয় দরকার, তাই এখান থেকে চালু করা যায় না। আগে কী সত্য হতে হবে তা এর নামের নিচে লেখা আছে।',
    'switch.eUnknown': 'এই নামে আর কোনো সুইচ নেই। পাতাটি আবার লোড করুন।',
    'switch.eRefused':
      'ডেটাবেস এই পরিবর্তন প্রত্যাখ্যান করেছে, এবং সুইচটি যেমন ছিল তেমনই আছে। সে যা বলেছে:',
    'switch.eUnsure':
      'সুইচটি বদলেছে কি না কেউ বলতে পারে না। পাতাটি আবার লোড করুন এবং আবার চাপার আগে সেটি দেখে নিন।',
    'switch.eSignedOut': 'আপনি সাইন আউট হয়ে গেছেন। আবার সাইন ইন করুন, তারপর আরেকবার চেষ্টা করুন।',
    'switch.rsTitle': 'আয়ে শিক্ষকদের ভাগ',
    'switch.rsBadge': 'শিক্ষকদের জন্য: {percent}%',
    'switch.rsBody':
      'কোর্স বিক্রি থেকে যা আসে তাতে শিক্ষকের শতাংশ। এটি বদলালে কেবল পরে নিশ্চিত হওয়া অর্ডারে প্রযোজ্য হয়: আয়ের প্রতিটি ভুক্তি যে ভাগে তা অর্জিত হয়েছিল সেটিই ধরে রাখে, তাই আগে লিপিবদ্ধ অর্থ নড়তে পারে না। প্রসেসিং ফি, করের ব্যবস্থা, এবং ভাগটি সব শিক্ষকের জন্য একই কি না, এগুলোর জন্য এখনও নীতিগত সিদ্ধান্ত দরকার; শতাংশটি সেই শর্তগুলো ঠিক করার বিকল্প নয়, এবং এটি শিক্ষকদের পেমেন্ট চালু করে না।',
    'switch.rsZero':
      'এখন এটি ০%: শিক্ষকেরা কোনো ভাগ অর্জন করেন না এবং বিক্রি থেকে যা আসে তা প্ল্যাটফর্ম রাখে।',
    'switch.rsField': 'শিক্ষকের ভাগ, পূর্ণ শতাংশ',
    'switch.rsReason': 'এই পরিবর্তনের কারণ (অডিট লগে রাখা হয়)',
    'switch.rsExample': 'যেমন: শিক্ষকদের পারিশ্রমিকের অনুমোদিত নীতি, পর্যালোচনার তারিখ…',
    'switch.rsSave': 'আয়ের ভাগ সংরক্ষণ করুন',
    'switch.rsSaving': 'সংরক্ষণ করা হচ্ছে…',
    'switch.rsSaved': 'সংরক্ষিত হয়েছে।',
    'switch.rsEPercent': '০ থেকে ১০০-এর মধ্যে একটি পূর্ণ শতাংশ লিখুন।',
    'switch.rsEReason': 'একটি লিখিত কারণ দিন। এটি অডিট লগে রাখা হবে।',
    'switch.rsELong': 'কারণটি ৫০০ অক্ষরের কম রাখুন।',
    'switch.rsENotAllowed':
      'আয়ের ভাগ কেবল ফাইন্যান্স অ্যাডমিন বা প্ল্যাটফর্ম অ্যাডমিন বদলাতে পারেন। ভাগটি যেমন ছিল তেমনই আছে।',
    'switch.rsERefused':
      'ডেটাবেস এই পরিবর্তন প্রত্যাখ্যান করেছে, এবং ভাগটি যেমন ছিল তেমনই আছে। সে যা বলেছে:',
    'switch.rsEUnsure':
      'ভাগটি সংরক্ষিত হয়েছে কি না কেউ বলতে পারে না। পাতাটি আবার লোড করুন এবং আবার সংরক্ষণের আগে সংখ্যাটি পড়ে নিন।',
  },
  hi: {
    'switch.title': 'सुविधाओं के स्विच',
    'switch.lede':
      'सब कुछ बना हुआ है और बंद हालत में जारी हो चुका है। जैसे-जैसे पूर्व-शर्तें पूरी हों, सुविधाएँ यहाँ से चालू करें।',
    'switch.statOn': 'चालू',
    'switch.statOff': 'बंद',
    'switch.statSetup': 'बंद, पहले बाहरी तैयारी',
    'switch.statDeploy': 'डिप्लॉय चाहिए',
    'switch.retention': 'अवधारण घड़ी',
    'switch.retentionNote':
      'वे दो चीज़ें जिन्हें गोपनीयता सूचना एक तय तारीख़ पर मिटाने का वादा करती है: सहायता का मामला बंद होने के तीन साल बाद, और यह रिकॉर्ड कि किसी शिक्षक की जाँच हुई, जाँच और उसके अठारहवें जन्मदिन में से जो बाद में हो उसके सात साल बाद। पेज बताता है कि किसका समय आ गया, किसकी घड़ी नहीं चली क्योंकि किसी ने उसे बंद नहीं किया, और मिटाने का काम सीमित खेप में करता है',
    'switch.deployNote':
      'जिस सुविधा पर “डिप्लॉय चाहिए” लिखा हो वह यहाँ से चालू नहीं हो सकती, और यह इनकार नियंत्रण छिपाकर नहीं बल्कि डेटाबेस में लागू है। हर एक के साथ वह पूर्व-शर्त दर्ज है जो पहले पूरी होनी चाहिए। जिस सुविधा की कोई लिखी हुई पूर्व-शर्त न हो वह एक गड़बड़ी है जो चालू होने का इंतज़ार कर रही है।',
    'switch.empty': 'सुविधाओं की पंजी खाली है।',
    'switch.groupOn': 'चालू: {total} में से {on}',
    'switch.gLearner': 'शिक्षार्थियों की सुविधाएँ',
    'switch.gTeaching': 'अध्यापन',
    'switch.gMoney': 'पैसा',
    'switch.gFamilies': 'बच्चे और परिवार',
    'switch.gPlatform': 'मंच',
    'switch.gDelivery': 'सामग्री पहुँचाना',
    'switch.gGovernance': 'शासन',
    'switch.gOther': 'अन्य',
    'switch.trHead': 'अनुवाद।',
    'switch.trOn':
      'अनुवाद चालू है। साइन इन पाठक किसी के लिखे के नीचे “अनुवाद करें” दबा सकता है, और वह पाठ Google को भेजा जाता है।',
    'switch.trOnNoKey':
      'अनुवाद का स्विच चालू है, पर इस सर्वर पर GOOGLE_TRANSLATE_API_KEY नहीं है, इसलिए कोई बटन नहीं दिखाया जाता और कुछ नहीं भेजा जाता।',
    'switch.trOffKey':
      'अनुवाद बंद है। इस सर्वर पर कुंजी मौजूद है; नीचे का platform.translate स्विच बटन को चालू करता है।',
    'switch.trOffNoKey':
      'अनुवाद बंद है, और इस सर्वर पर GOOGLE_TRANSLATE_API_KEY नहीं है। इसे दोनों चाहिए।',
    'switch.trUsed':
      'इस महीने के अक्षर: {monthly} में से {characters} ({share}%)। अनुरोध: {requests}। लोग: {people}। एक व्यक्ति एक दिन में अधिकतम भेज सकता है: {daily}। सदस्य महीने के चार-पाँचवें हिस्से पर रुक जाते हैं; बाक़ी कर्मचारियों के लिए रखा जाता है।',
    'switch.gateRuntime': 'तुरंत स्विच',
    'switch.gateSetupFirst': 'पहले बाहरी तैयारी',
    'switch.gateSetupOn': 'चालू, बाहरी तैयारी पर निर्भर',
    'switch.gateDeploy': 'डिप्लॉय चाहिए',
    'switch.on': 'चालू',
    'switch.off': 'बंद',
    'switch.eNotOwner':
      'सुविधा का स्विच केवल मंच का व्यवस्थापक बदल सकता है। यह स्विच जैसा था वैसा ही है।',
    'switch.eDeploy':
      'इस सुविधा को चलने से पहले डिप्लॉय चाहिए, इसलिए यह यहाँ से चालू नहीं हो सकती। जो बात पहले पूरी होनी चाहिए वह इसके नाम के नीचे लिखी है।',
    'switch.eUnknown': 'इस नाम का कोई स्विच अब नहीं है। पेज फिर से लोड करें।',
    'switch.eRefused':
      'डेटाबेस ने यह बदलाव अस्वीकार कर दिया, और स्विच जैसा था वैसा ही है। उसने यह कहा:',
    'switch.eUnsure':
      'कोई नहीं बता सकता कि यह स्विच बदला या नहीं। पेज फिर से लोड करें और दोबारा दबाने से पहले उसे देख लें।',
    'switch.eSignedOut': 'आप साइन आउट हो चुके हैं। फिर से साइन इन करें, फिर एक बार और कोशिश करें।',
    'switch.rsTitle': 'आय में शिक्षकों का हिस्सा',
    'switch.rsBadge': 'शिक्षकों के लिए: {percent}%',
    'switch.rsBody':
      'कोर्स की बिक्री से जो आता है उसमें शिक्षक का प्रतिशत। इसे बदलना केवल उन ऑर्डरों पर लागू होता है जिनकी पुष्टि इसके बाद हो: कमाई की हर प्रविष्टि वही हिस्सा सँजोकर रखती है जिसके तहत वह कमाई गई, इसलिए पहले से दर्ज पैसा नहीं हिल सकता। प्रोसेसिंग शुल्क, कर का बरताव, और हिस्सा हर शिक्षक के लिए एक-सा है या नहीं, इन पर अभी नीतिगत फ़ैसला बाक़ी है; प्रतिशत उन शर्तों के फ़ैसले की जगह नहीं लेता, और यह शिक्षकों के भुगतान चालू नहीं करता।',
    'switch.rsZero':
      'यह अभी 0% है: शिक्षक कोई हिस्सा नहीं कमाते और बिक्री से जो आता है वह मंच के पास रहता है।',
    'switch.rsField': 'शिक्षक का हिस्सा, पूरा प्रतिशत',
    'switch.rsReason': 'इस बदलाव का कारण (ऑडिट रिकॉर्ड में रखा जाता है)',
    'switch.rsExample': 'उदाहरण: शिक्षकों के भुगतान की स्वीकृत नीति, जिसकी समीक्षा … को हुई',
    'switch.rsSave': 'आय का हिस्सा सहेजें',
    'switch.rsSaving': 'सहेजा जा रहा है…',
    'switch.rsSaved': 'सहेज लिया गया।',
    'switch.rsEPercent': '0 से 100 तक पूरा प्रतिशत दर्ज करें।',
    'switch.rsEReason': 'लिखित कारण दें। यह ऑडिट रिकॉर्ड में रखा जाएगा।',
    'switch.rsELong': 'कारण 500 अक्षरों से कम रखें।',
    'switch.rsENotAllowed':
      'आय का हिस्सा केवल वित्त व्यवस्थापक या मंच का व्यवस्थापक बदल सकता है। हिस्सा जैसा था वैसा ही है।',
    'switch.rsERefused':
      'डेटाबेस ने यह बदलाव अस्वीकार कर दिया, और हिस्सा जैसा था वैसा ही है। उसने यह कहा:',
    'switch.rsEUnsure':
      'कोई नहीं बता सकता कि हिस्सा सहेजा गया या नहीं। पेज फिर से लोड करें और दोबारा सहेजने से पहले संख्या पढ़ लें।',
  },
  fr: {
    'switch.title': 'Interrupteurs des fonctions',
    'switch.lede':
      'Tout est construit et livré éteint. Activez les fonctions ici à mesure que leurs conditions préalables sont remplies.',
    'switch.statOn': 'Activées',
    'switch.statOff': 'Éteintes',
    'switch.statSetup': 'Éteintes, préparation externe d’abord',
    'switch.statDeploy': 'Demandent un déploiement',
    'switch.retention': 'Horloge de conservation',
    'switch.retentionNote':
      'les deux choses que l’avis de confidentialité promet de supprimer à une date : un dossier d’assistance trois ans après sa clôture, et la trace qu’un enseignant a été vérifié sept ans après la plus tardive de ces deux dates, la vérification ou ses dix-huit ans. La page dit ce qui est échu, ce qui n’a pas d’horloge parce que personne ne l’a clos, et effectue la suppression par lot limité',
    'switch.deployNote':
      'Une fonction marquée « Demande un déploiement » ne peut pas être activée ici, et ce refus est appliqué dans la base de données plutôt qu’en masquant la commande. Chacune porte la condition préalable qui doit d’abord être vraie. Une fonction sans condition préalable écrite est un défaut qui attend d’être activé.',
    'switch.empty': 'Le registre des fonctions est vide.',
    'switch.groupOn': 'Activées : {on} sur {total}',
    'switch.gLearner': 'Fonctions pour les apprenants',
    'switch.gTeaching': 'Enseignement',
    'switch.gMoney': 'Argent',
    'switch.gFamilies': 'Enfants et familles',
    'switch.gPlatform': 'Plateforme',
    'switch.gDelivery': 'Diffusion des contenus',
    'switch.gGovernance': 'Gouvernance',
    'switch.gOther': 'Autre',
    'switch.trHead': 'Traduction.',
    'switch.trOn':
      'La traduction est activée. Un lecteur connecté peut appuyer sur « Traduire » sous ce que quelqu’un a écrit, et ce texte est envoyé à Google.',
    'switch.trOnNoKey':
      'L’interrupteur de traduction est activé, mais ce serveur n’a pas de GOOGLE_TRANSLATE_API_KEY : aucun bouton n’est affiché et rien n’est envoyé.',
    'switch.trOffKey':
      'La traduction est éteinte. Ce serveur a une clé ; l’interrupteur platform.translate ci-dessous fait apparaître le bouton.',
    'switch.trOffNoKey':
      'La traduction est éteinte, et ce serveur n’a pas de GOOGLE_TRANSLATE_API_KEY. Il faut les deux.',
    'switch.trUsed':
      'Caractères ce mois-ci : {characters} sur {monthly} ({share} %). Demandes : {requests}. Personnes : {people}. Le plus qu’une personne peut envoyer en un jour : {daily}. Les membres s’arrêtent aux quatre cinquièmes du mois ; le reste est gardé pour l’équipe.',
    'switch.gateRuntime': 'Bascule immédiate',
    'switch.gateSetupFirst': 'Préparation externe d’abord',
    'switch.gateSetupOn': 'Activée, repose sur une préparation externe',
    'switch.gateDeploy': 'Demande un déploiement',
    'switch.on': 'Activée',
    'switch.off': 'Éteinte',
    'switch.eNotOwner':
      'Seul l’administrateur de la plateforme peut changer l’interrupteur d’une fonction. Celui-ci est resté tel qu’il était.',
    'switch.eDeploy':
      'Cette fonction demande un déploiement avant de pouvoir marcher : elle ne peut donc pas être activée ici. Ce qui doit d’abord être vrai est écrit sous son nom.',
    'switch.eUnknown': 'Il n’y a plus d’interrupteur de ce nom. Rechargez la page.',
    'switch.eRefused':
      'La base de données a refusé ce changement, et l’interrupteur est resté tel qu’il était. Ce qu’elle a dit :',
    'switch.eUnsure':
      'Personne ne peut dire si cet interrupteur a changé. Rechargez la page et regardez-le avant d’appuyer à nouveau.',
    'switch.eSignedOut': 'Votre session est fermée. Reconnectez-vous, puis réessayez une fois.',
    'switch.rsTitle': 'Part des recettes pour les enseignants',
    'switch.rsBadge': 'Aux enseignants : {percent} %',
    'switch.rsBody':
      'Le pourcentage de l’enseignant sur ce que rapporte la vente d’un cours. Le changer ne s’applique qu’aux commandes confirmées ensuite : chaque écriture de gains garde la part sous laquelle elle a été acquise, si bien que l’argent déjà comptabilisé ne peut pas bouger. Les frais de traitement, le traitement de la taxe et le fait que la part soit ou non la même pour chaque enseignant demandent encore une décision de politique ; le pourcentage ne remplace pas la décision sur ces conditions, et il n’active pas les versements.',
    'switch.rsZero':
      'Elle est de 0 % à présent : les enseignants n’acquièrent aucune part et la plateforme garde ce que rapporte une vente.',
    'switch.rsField': 'Part de l’enseignant, pourcentage entier',
    'switch.rsReason': 'Raison de ce changement (gardée dans le journal d’audit)',
    'switch.rsExample':
      'Par exemple : politique approuvée de rémunération des enseignants, revue le…',
    'switch.rsSave': 'Enregistrer la part des recettes',
    'switch.rsSaving': 'Enregistrement…',
    'switch.rsSaved': 'Enregistré.',
    'switch.rsEPercent': 'Saisissez un pourcentage entier de 0 à 100.',
    'switch.rsEReason': 'Donnez une raison écrite. Elle sera gardée dans le journal d’audit.',
    'switch.rsELong': 'Gardez la raison sous 500 caractères.',
    'switch.rsENotAllowed':
      'Seul un administrateur financier ou l’administrateur de la plateforme peut changer la part des recettes. Elle est restée telle qu’elle était.',
    'switch.rsERefused':
      'La base de données a refusé ce changement, et la part est restée telle qu’elle était. Ce qu’elle a dit :',
    'switch.rsEUnsure':
      'Personne ne peut dire si la part a été enregistrée. Rechargez la page et lisez le chiffre avant d’enregistrer à nouveau.',
  },
  es: {
    'switch.title': 'Interruptores de funciones',
    'switch.lede':
      'Todo está construido y publicado apagado. Active las funciones aquí a medida que se cumplan sus condiciones previas.',
    'switch.statOn': 'Activadas',
    'switch.statOff': 'Apagadas',
    'switch.statSetup': 'Apagadas, primero la preparación externa',
    'switch.statDeploy': 'Requieren un despliegue',
    'switch.retention': 'Reloj de conservación',
    'switch.retentionNote':
      'las dos cosas que el aviso de privacidad promete eliminar en una fecha: un caso de soporte tres años después de cerrarse, y el registro de que se comprobó a un docente siete años después de lo que ocurra más tarde, la comprobación o su decimoctavo cumpleaños. La página dice qué ha vencido, qué no tiene reloj porque nadie lo cerró, y hace la eliminación en un lote limitado',
    'switch.deployNote':
      'Una función marcada «Requiere un despliegue» no puede activarse aquí, y esa negativa se aplica en la base de datos en lugar de ocultar el control. Cada una lleva la condición previa que tiene que cumplirse primero. Una función sin condición previa escrita es un fallo que espera a ser activado.',
    'switch.empty': 'El registro de funciones está vacío.',
    'switch.groupOn': 'Activadas: {on} de {total}',
    'switch.gLearner': 'Funciones para alumnos',
    'switch.gTeaching': 'Enseñanza',
    'switch.gMoney': 'Dinero',
    'switch.gFamilies': 'Niños y familias',
    'switch.gPlatform': 'Plataforma',
    'switch.gDelivery': 'Entrega de contenidos',
    'switch.gGovernance': 'Gobernanza',
    'switch.gOther': 'Otro',
    'switch.trHead': 'Traducción.',
    'switch.trOn':
      'La traducción está activada. Un lector con sesión iniciada puede pulsar «Traducir» debajo de lo que alguien escribió, y ese texto se envía a Google.',
    'switch.trOnNoKey':
      'El interruptor de traducción está activado, pero este servidor no tiene GOOGLE_TRANSLATE_API_KEY, así que no se muestra ningún botón y no se envía nada.',
    'switch.trOffKey':
      'La traducción está apagada. Este servidor tiene una clave; el interruptor platform.translate de abajo hace aparecer el botón.',
    'switch.trOffNoKey':
      'La traducción está apagada, y este servidor no tiene GOOGLE_TRANSLATE_API_KEY. Necesita las dos cosas.',
    'switch.trUsed':
      'Caracteres este mes: {characters} de {monthly} ({share}%). Solicitudes: {requests}. Personas: {people}. Lo máximo que una persona puede enviar en un día: {daily}. Los miembros se detienen en cuatro quintos del mes; el resto se reserva para el personal.',
    'switch.gateRuntime': 'Cambio inmediato',
    'switch.gateSetupFirst': 'Primero la preparación externa',
    'switch.gateSetupOn': 'Activada, depende de una preparación externa',
    'switch.gateDeploy': 'Requiere un despliegue',
    'switch.on': 'Activada',
    'switch.off': 'Apagada',
    'switch.eNotOwner':
      'Solo el administrador de la plataforma puede cambiar el interruptor de una función. Este sigue como estaba.',
    'switch.eDeploy':
      'Esa función requiere un despliegue antes de poder funcionar, así que no puede activarse aquí. Lo que tiene que cumplirse primero está escrito debajo de su nombre.',
    'switch.eUnknown': 'Ya no hay ningún interruptor con ese nombre. Vuelva a cargar la página.',
    'switch.eRefused':
      'La base de datos rechazó ese cambio, y el interruptor sigue como estaba. Lo que dijo:',
    'switch.eUnsure':
      'Nadie puede decir si ese interruptor cambió. Vuelva a cargar la página y mírelo antes de pulsar otra vez.',
    'switch.eSignedOut':
      'Su sesión está cerrada. Inicie sesión de nuevo y vuelva a intentarlo una vez.',
    'switch.rsTitle': 'Reparto de ingresos para docentes',
    'switch.rsBadge': 'Para los docentes: {percent}%',
    'switch.rsBody':
      'El porcentaje del docente sobre lo que aporta la venta de un curso. Cambiarlo solo se aplica a los pedidos confirmados después: cada apunte de ganancias conserva el reparto con el que se devengó, así que el dinero ya contabilizado no puede moverse. Las comisiones de procesamiento, el tratamiento del impuesto y si el reparto es igual para todos los docentes siguen necesitando una decisión de política; el porcentaje no sustituye a la decisión sobre esas condiciones, y no activa los pagos a docentes.',
    'switch.rsZero':
      'Ahora es del 0%: los docentes no devengan ninguna parte y la plataforma conserva lo que aporta una venta.',
    'switch.rsField': 'Parte del docente, porcentaje entero',
    'switch.rsReason': 'Motivo de este cambio (se guarda en el registro de auditoría)',
    'switch.rsExample': 'Por ejemplo: política aprobada de retribución a docentes, revisada el…',
    'switch.rsSave': 'Guardar el reparto de ingresos',
    'switch.rsSaving': 'Guardando…',
    'switch.rsSaved': 'Guardado.',
    'switch.rsEPercent': 'Introduzca un porcentaje entero de 0 a 100.',
    'switch.rsEReason': 'Dé un motivo por escrito. Se guardará en el registro de auditoría.',
    'switch.rsELong': 'Mantenga el motivo por debajo de 500 caracteres.',
    'switch.rsENotAllowed':
      'Solo un administrador financiero o el administrador de la plataforma puede cambiar el reparto de ingresos. Sigue como estaba.',
    'switch.rsERefused':
      'La base de datos rechazó ese cambio, y el reparto sigue como estaba. Lo que dijo:',
    'switch.rsEUnsure':
      'Nadie puede decir si el reparto se guardó. Vuelva a cargar la página y lea la cifra antes de guardar otra vez.',
  },
  pt: {
    'switch.title': 'Interruptores das funcionalidades',
    'switch.lede':
      'Está tudo construído e publicado desligado. Ligue as funcionalidades aqui à medida que as suas condições prévias forem cumpridas.',
    'switch.statOn': 'Ligadas',
    'switch.statOff': 'Desligadas',
    'switch.statSetup': 'Desligadas, primeiro a preparação externa',
    'switch.statDeploy': 'Precisam de uma implementação',
    'switch.retention': 'Relógio de conservação',
    'switch.retentionNote':
      'as duas coisas que o aviso de privacidade promete eliminar numa data: um caso de apoio três anos depois de fechado, e o registo de que um professor foi verificado sete anos depois do que ocorrer mais tarde, a verificação ou o seu décimo oitavo aniversário. A página diz o que está vencido, o que não tem relógio porque ninguém o fechou, e faz a eliminação num lote limitado',
    'switch.deployNote':
      'Uma funcionalidade marcada «Precisa de uma implementação» não pode ser ligada aqui, e essa recusa é aplicada na base de dados em vez de se esconder o controlo. Cada uma traz a condição prévia que tem de ser verdadeira primeiro. Uma funcionalidade sem condição prévia escrita é um defeito à espera de ser ligado.',
    'switch.empty': 'O registo de funcionalidades está vazio.',
    'switch.groupOn': 'Ligadas: {on} de {total}',
    'switch.gLearner': 'Funcionalidades para alunos',
    'switch.gTeaching': 'Ensino',
    'switch.gMoney': 'Dinheiro',
    'switch.gFamilies': 'Crianças e famílias',
    'switch.gPlatform': 'Plataforma',
    'switch.gDelivery': 'Entrega de conteúdos',
    'switch.gGovernance': 'Governação',
    'switch.gOther': 'Outro',
    'switch.trHead': 'Tradução.',
    'switch.trOn':
      'A tradução está ligada. Um leitor com sessão iniciada pode carregar em «Traduzir» por baixo do que alguém escreveu, e esse texto é enviado para a Google.',
    'switch.trOnNoKey':
      'O interruptor da tradução está ligado, mas este servidor não tem GOOGLE_TRANSLATE_API_KEY, por isso nenhum botão é mostrado e nada é enviado.',
    'switch.trOffKey':
      'A tradução está desligada. Este servidor tem uma chave; o interruptor platform.translate abaixo faz aparecer o botão.',
    'switch.trOffNoKey':
      'A tradução está desligada, e este servidor não tem GOOGLE_TRANSLATE_API_KEY. Precisa das duas coisas.',
    'switch.trUsed':
      'Caracteres este mês: {characters} de {monthly} ({share}%). Pedidos: {requests}. Pessoas: {people}. O máximo que uma pessoa pode enviar num dia: {daily}. Os membros param nos quatro quintos do mês; o resto fica guardado para a equipa.',
    'switch.gateRuntime': 'Alternância imediata',
    'switch.gateSetupFirst': 'Primeiro a preparação externa',
    'switch.gateSetupOn': 'Ligada, depende de preparação externa',
    'switch.gateDeploy': 'Precisa de uma implementação',
    'switch.on': 'Ligada',
    'switch.off': 'Desligada',
    'switch.eNotOwner':
      'Só o administrador da plataforma pode mudar o interruptor de uma funcionalidade. Este ficou como estava.',
    'switch.eDeploy':
      'Essa funcionalidade precisa de uma implementação antes de poder funcionar, por isso não pode ser ligada aqui. O que tem de ser verdadeiro primeiro está escrito por baixo do nome.',
    'switch.eUnknown': 'Já não há nenhum interruptor com esse nome. Volte a carregar a página.',
    'switch.eRefused':
      'A base de dados recusou essa alteração, e o interruptor ficou como estava. O que disse:',
    'switch.eUnsure':
      'Ninguém pode dizer se esse interruptor mudou. Volte a carregar a página e veja-o antes de carregar outra vez.',
    'switch.eSignedOut': 'A sua sessão terminou. Inicie sessão de novo e tente mais uma vez.',
    'switch.rsTitle': 'Partilha de receitas com os professores',
    'switch.rsBadge': 'Para os professores: {percent}%',
    'switch.rsBody':
      'A percentagem do professor sobre o que a venda de um curso rende. Alterá-la só se aplica às encomendas confirmadas depois: cada lançamento de ganhos guarda a partilha com que foi ganho, por isso o dinheiro já contabilizado não pode mexer. As taxas de processamento, o tratamento do imposto e se a partilha é igual para todos os professores ainda precisam de uma decisão de política; a percentagem não substitui a decisão sobre essas condições, e não liga os pagamentos a professores.',
    'switch.rsZero':
      'Agora é de 0%: os professores não ganham nenhuma parte e a plataforma fica com o que uma venda rende.',
    'switch.rsField': 'Parte do professor, percentagem inteira',
    'switch.rsReason': 'Motivo desta alteração (fica guardado no registo de auditoria)',
    'switch.rsExample':
      'Por exemplo: política aprovada de remuneração dos professores, revista em…',
    'switch.rsSave': 'Guardar a partilha de receitas',
    'switch.rsSaving': 'A guardar…',
    'switch.rsSaved': 'Guardado.',
    'switch.rsEPercent': 'Introduza uma percentagem inteira de 0 a 100.',
    'switch.rsEReason': 'Dê um motivo por escrito. Ficará guardado no registo de auditoria.',
    'switch.rsELong': 'Mantenha o motivo abaixo de 500 caracteres.',
    'switch.rsENotAllowed':
      'Só um administrador financeiro ou o administrador da plataforma pode alterar a partilha de receitas. Ficou como estava.',
    'switch.rsERefused':
      'A base de dados recusou essa alteração, e a partilha ficou como estava. O que disse:',
    'switch.rsEUnsure':
      'Ninguém pode dizer se a partilha foi guardada. Volte a carregar a página e leia o número antes de guardar outra vez.',
  },
  sw: {
    'switch.title': 'Swichi za vipengele',
    'switch.lede':
      'Kila kitu kimejengwa na kutolewa kikiwa kimezimwa. Washa vipengele hapa kadiri masharti yake ya awali yanavyotimia.',
    'switch.statOn': 'Vimewashwa',
    'switch.statOff': 'Vimezimwa',
    'switch.statSetup': 'Vimezimwa, maandalizi ya nje kwanza',
    'switch.statDeploy': 'Vinahitaji toleo jipya la msimbo',
    'switch.retention': 'Saa ya uhifadhi',
    'switch.retentionNote':
      'mambo mawili ambayo taarifa ya faragha inaahidi kuyafuta kwa tarehe: shauri la msaada miaka mitatu baada ya kufungwa, na kumbukumbu kwamba mwalimu alichunguzwa miaka saba baada ya lililo la baadaye kati ya uchunguzi huo na siku yake ya kutimiza miaka kumi na minane. Ukurasa husema ni nini kimefikia muda wake, ni nini hakina saa kwa sababu hakuna aliyekifunga, na hufanya ufutaji kwa kundi lenye kikomo',
    'switch.deployNote':
      'Kipengele kilichowekwa alama “Kinahitaji toleo jipya la msimbo” hakiwezi kuwashwa hapa, na katazo hilo linatekelezwa ndani ya hifadhidata, si kwa kuficha kidhibiti. Kila kimoja kina sharti la awali ambalo lazima liwe kweli kwanza. Kipengele kisicho na sharti la awali lililoandikwa ni hitilafu inayosubiri kuwashwa.',
    'switch.empty': 'Rejista ya vipengele ni tupu.',
    'switch.groupOn': 'Vimewashwa: {on} kati ya {total}',
    'switch.gLearner': 'Vipengele vya wanafunzi',
    'switch.gTeaching': 'Ufundishaji',
    'switch.gMoney': 'Pesa',
    'switch.gFamilies': 'Watoto na familia',
    'switch.gPlatform': 'Jukwaa',
    'switch.gDelivery': 'Ufikishaji wa maudhui',
    'switch.gGovernance': 'Utawala',
    'switch.gOther': 'Kingine',
    'switch.trHead': 'Tafsiri.',
    'switch.trOn':
      'Tafsiri imewashwa. Msomaji aliyeingia anaweza kubonyeza “Tafsiri” chini ya alichoandika mtu mwingine, na maandishi hayo hutumwa kwa Google.',
    'switch.trOnNoKey':
      'Swichi ya tafsiri imewashwa, lakini seva hii haina GOOGLE_TRANSLATE_API_KEY, kwa hiyo hakuna kitufe kinachoonyeshwa na hakuna kinachotumwa.',
    'switch.trOffKey':
      'Tafsiri imezimwa. Seva hii ina ufunguo; swichi ya platform.translate hapa chini ndiyo inayowasha kitufe.',
    'switch.trOffNoKey':
      'Tafsiri imezimwa, na seva hii haina GOOGLE_TRANSLATE_API_KEY. Inahitaji vyote viwili.',
    'switch.trUsed':
      'Herufi za mwezi huu: {characters} kati ya {monthly} ({share}%). Maombi: {requests}. Watu: {people}. Kiwango cha juu ambacho mtu mmoja anaweza kutuma kwa siku: {daily}. Wanachama husimama kwenye sehemu nne kwa tano za mwezi; kilichobaki huwekwa kwa ajili ya wafanyakazi.',
    'switch.gateRuntime': 'Swichi ya papo hapo',
    'switch.gateSetupFirst': 'Maandalizi ya nje kwanza',
    'switch.gateSetupOn': 'Kimewashwa, kinategemea maandalizi ya nje',
    'switch.gateDeploy': 'Kinahitaji toleo jipya la msimbo',
    'switch.on': 'Kimewashwa',
    'switch.off': 'Kimezimwa',
    'switch.eNotOwner':
      'Ni msimamizi wa jukwaa pekee anayeweza kubadilisha swichi ya kipengele. Swichi hii imebaki ilivyokuwa.',
    'switch.eDeploy':
      'Kipengele hicho kinahitaji toleo jipya la msimbo kabla ya kufanya kazi, kwa hiyo hakiwezi kuwashwa hapa. Kinachopaswa kuwa kweli kwanza kimeandikwa chini ya jina lake.',
    'switch.eUnknown': 'Hakuna tena swichi yenye jina hilo. Pakia ukurasa upya.',
    'switch.eRefused':
      'Hifadhidata ilikataa badiliko hilo, na swichi imebaki ilivyokuwa. Ilichosema:',
    'switch.eUnsure':
      'Hakuna anayeweza kusema kama swichi hiyo ilibadilika. Pakia ukurasa upya na uiangalie kabla ya kubonyeza tena.',
    'switch.eSignedOut': 'Umetoka kwenye akaunti. Ingia tena, kisha ujaribu mara moja zaidi.',
    'switch.rsTitle': 'Mgao wa mapato kwa walimu',
    'switch.rsBadge': 'Kwa walimu: {percent}%',
    'switch.rsBody':
      'Asilimia ya mwalimu katika kile ambacho uuzaji wa kozi huleta. Kuibadilisha kunahusu oda zinazothibitishwa baadaye tu: kila ingizo la mapato huhifadhi mgao ambao lilipatikana chini yake, kwa hiyo pesa iliyokwisha kuandikwa haiwezi kusogea. Ada za uchakataji, jinsi kodi inavyoshughulikiwa, na kama mgao ni uleule kwa kila mwalimu bado vinahitaji uamuzi wa sera; asilimia hii si mbadala wa kuamua masharti hayo, na haiwashi malipo kwa walimu.',
    'switch.rsZero':
      'Sasa ni 0%: walimu hawapati mgao wowote na jukwaa hubaki na kile ambacho uuzaji huleta.',
    'switch.rsField': 'Mgao wa mwalimu, asilimia kamili',
    'switch.rsReason': 'Sababu ya badiliko hili (huhifadhiwa kwenye kumbukumbu ya ukaguzi)',
    'switch.rsExample': 'Kwa mfano: sera iliyoidhinishwa ya malipo ya walimu, iliyopitiwa tarehe…',
    'switch.rsSave': 'Hifadhi mgao wa mapato',
    'switch.rsSaving': 'Inahifadhi…',
    'switch.rsSaved': 'Imehifadhiwa.',
    'switch.rsEPercent': 'Weka asilimia kamili kuanzia 0 hadi 100.',
    'switch.rsEReason': 'Toa sababu iliyoandikwa. Itahifadhiwa kwenye kumbukumbu ya ukaguzi.',
    'switch.rsELong': 'Sababu isizidi herufi 500.',
    'switch.rsENotAllowed':
      'Ni msimamizi wa fedha au msimamizi wa jukwaa pekee anayeweza kubadilisha mgao wa mapato. Umebaki ulivyokuwa.',
    'switch.rsERefused':
      'Hifadhidata ilikataa badiliko hilo, na mgao umebaki ulivyokuwa. Ilichosema:',
    'switch.rsEUnsure':
      'Hakuna anayeweza kusema kama mgao ulihifadhiwa. Pakia ukurasa upya na usome namba kabla ya kuhifadhi tena.',
  },
  af: {
    'switch.title': 'Funksieskakelaars',
    'switch.lede':
      'Alles is gebou en afgeskakel uitgereik. Skakel funksies hier aan namate hulle voorvereistes nagekom word.',
    'switch.statOn': 'Aan',
    'switch.statOff': 'Af',
    'switch.statSetup': 'Af, eers eksterne opstelling',
    'switch.statDeploy': 'Benodig ’n ontplooiing',
    'switch.retention': 'Bewaringshorlosie',
    'switch.retentionNote':
      'die twee dinge wat die privaatheidskennisgewing belowe om op ’n datum te skrap: ’n ondersteuningsaak drie jaar nadat dit gesluit is, en die rekord dat ’n onderwyser gesif is sewe jaar ná die latere van die sifting en sy of haar agtiende verjaardag. Die bladsy sê wat verskuldig is, wat geen horlosie het nie omdat niemand dit gesluit het nie, en doen die skrapping in ’n beperkte bondel',
    'switch.deployNote':
      '’n Funksie wat “Benodig ’n ontplooiing” gemerk is, kan nie hier aangeskakel word nie, en dié weiering word in die databasis afgedwing eerder as deur die kontrole weg te steek. Elkeen dra die voorvereiste wat eers waar moet wees. ’n Funksie sonder ’n geskrewe voorvereiste is ’n fout wat wag om aangeskakel te word.',
    'switch.empty': 'Die funksieregister is leeg.',
    'switch.groupOn': 'Aan: {on} van {total}',
    'switch.gLearner': 'Funksies vir leerders',
    'switch.gTeaching': 'Onderrig',
    'switch.gMoney': 'Geld',
    'switch.gFamilies': 'Kinders en gesinne',
    'switch.gPlatform': 'Platform',
    'switch.gDelivery': 'Aflewering van inhoud',
    'switch.gGovernance': 'Bestuur',
    'switch.gOther': 'Ander',
    'switch.trHead': 'Vertaling.',
    'switch.trOn':
      'Vertaling is aan. ’n Aangemelde leser kan “Vertaal” druk onder wat iemand anders geskryf het, en daardie teks word na Google gestuur.',
    'switch.trOnNoKey':
      'Die vertaalskakelaar is aan, maar hierdie bediener het geen GOOGLE_TRANSLATE_API_KEY nie, dus word geen knoppie gewys nie en niks word gestuur nie.',
    'switch.trOffKey':
      'Vertaling is af. Hierdie bediener het ’n sleutel; die skakelaar platform.translate hieronder laat die knoppie verskyn.',
    'switch.trOffNoKey':
      'Vertaling is af, en hierdie bediener het geen GOOGLE_TRANSLATE_API_KEY nie. Dit het albei nodig.',
    'switch.trUsed':
      'Karakters hierdie maand: {characters} van {monthly} ({share}%). Versoeke: {requests}. Mense: {people}. Die meeste wat een persoon op ’n dag kan stuur: {daily}. Lede stop by vier vyfdes van die maand; die res word vir personeel gehou.',
    'switch.gateRuntime': 'Onmiddellike skakelaar',
    'switch.gateSetupFirst': 'Eers eksterne opstelling',
    'switch.gateSetupOn': 'Aan, steun op eksterne opstelling',
    'switch.gateDeploy': 'Benodig ’n ontplooiing',
    'switch.on': 'Aan',
    'switch.off': 'Af',
    'switch.eNotOwner':
      'Net die platformadministrateur kan ’n funksieskakelaar verander. Hierdie een is soos dit was.',
    'switch.eDeploy':
      'Daardie funksie benodig ’n ontplooiing voordat dit kan loop, dus kan dit nie hier aangeskakel word nie. Wat eers waar moet wees, staan onder sy naam geskryf.',
    'switch.eUnknown': 'Daar is nie meer ’n skakelaar met daardie naam nie. Laai die bladsy weer.',
    'switch.eRefused':
      'Die databasis het daardie verandering geweier, en die skakelaar is soos dit was. Wat dit gesê het:',
    'switch.eUnsure':
      'Niemand kan sê of daardie skakelaar verander het nie. Laai die bladsy weer en kyk daarna voordat jy weer druk.',
    'switch.eSignedOut': 'Jy is afgemeld. Meld weer aan en probeer dan nog een keer.',
    'switch.rsTitle': 'Inkomstedeling vir onderwysers',
    'switch.rsBadge': 'Aan onderwysers: {percent}%',
    'switch.rsBody':
      'Die onderwyser se persentasie van wat ’n kursusverkoping inbring. Om dit te verander, geld net vir bestellings wat daarna bevestig word: elke verdiensteboeking hou die deel waaronder dit verdien is, dus kan geld wat reeds geboek is nie skuif nie. Verwerkingsfooie, hoe belasting hanteer word, en of die deel vir elke onderwyser dieselfde is, het nog ’n beleidsbesluit nodig; die persentasie is geen plaasvervanger vir ’n besluit oor daardie bepalings nie, en dit skakel nie uitbetalings aan nie.',
    'switch.rsZero':
      'Dit is nou 0%: onderwysers verdien geen deel nie en die platform hou wat ’n verkoping inbring.',
    'switch.rsField': 'Onderwyser se deel, heel persentasie',
    'switch.rsReason': 'Rede vir hierdie verandering (in die ouditrekord gehou)',
    'switch.rsExample':
      'Byvoorbeeld: goedgekeurde beleid oor vergoeding van onderwysers, hersien op…',
    'switch.rsSave': 'Stoor inkomstedeling',
    'switch.rsSaving': 'Stoor tans…',
    'switch.rsSaved': 'Gestoor.',
    'switch.rsEPercent': 'Voer ’n heel persentasie van 0 tot 100 in.',
    'switch.rsEReason': 'Gee ’n geskrewe rede. Dit sal in die ouditrekord gehou word.',
    'switch.rsELong': 'Hou die rede onder 500 karakters.',
    'switch.rsENotAllowed':
      'Net ’n finansiële administrateur of die platformadministrateur kan die inkomstedeling verander. Dit is soos dit was.',
    'switch.rsERefused':
      'Die databasis het daardie verandering geweier, en die deling is soos dit was. Wat dit gesê het:',
    'switch.rsEUnsure':
      'Niemand kan sê of die deling gestoor is nie. Laai die bladsy weer en lees die syfer voordat jy weer stoor.',
  },
  'zh-hans': {
    'switch.title': '功能开关',
    'switch.lede': '所有功能都已建好，并在关闭状态下发布。前提条件满足后，在这里开启功能。',
    'switch.statOn': '已开启',
    'switch.statOff': '已关闭',
    'switch.statSetup': '已关闭，须先完成外部设置',
    'switch.statDeploy': '需要部署',
    'switch.retention': '保留期时钟',
    'switch.retentionNote':
      '隐私声明承诺到期删除的两样东西：支持个案在关闭三年后删除；教师接受过背景核查的记录，在核查之日与其年满十八岁之日两者较晚的一个之后七年删除。该页面会说明哪些已经到期，哪些因为没有人关闭而没有开始计时，并以有限的批次执行删除',
    'switch.deployNote':
      '标有“需要部署”的功能不能在这里开启，这一拒绝由数据库执行，而不是靠隐藏控件。每一项都写有必须先成立的前提条件。没有写明前提条件的功能，是一个等着被开启的缺陷。',
    'switch.empty': '功能登记表是空的。',
    'switch.groupOn': '已开启：{on} / {total}',
    'switch.gLearner': '学习者功能',
    'switch.gTeaching': '教学',
    'switch.gMoney': '钱款',
    'switch.gFamilies': '儿童与家庭',
    'switch.gPlatform': '平台',
    'switch.gDelivery': '内容交付',
    'switch.gGovernance': '治理',
    'switch.gOther': '其他',
    'switch.trHead': '翻译。',
    'switch.trOn': '翻译已开启。已登录的读者可以在别人写的内容下方点“翻译”，那段文字会发送给 Google。',
    'switch.trOnNoKey': '翻译开关已开启，但这台服务器没有 GOOGLE_TRANSLATE_API_KEY，所以不显示按钮，也不发送任何内容。',
    'switch.trOffKey': '翻译已关闭。这台服务器有密钥；下面的 platform.translate 开关会让按钮出现。',
    'switch.trOffNoKey': '翻译已关闭，这台服务器也没有 GOOGLE_TRANSLATE_API_KEY。两者都需要。',
    'switch.trUsed':
      '本月字符数：{characters} / {monthly}（{share}%）。请求数：{requests}。人数：{people}。一个人一天最多可发送：{daily}。成员用到当月额度的五分之四即停止；其余留给工作人员。',
    'switch.gateRuntime': '即时开关',
    'switch.gateSetupFirst': '须先完成外部设置',
    'switch.gateSetupOn': '已开启，依赖外部设置',
    'switch.gateDeploy': '需要部署',
    'switch.on': '已开启',
    'switch.off': '已关闭',
    'switch.eNotOwner': '只有平台管理员可以更改功能开关。这个开关保持原样。',
    'switch.eDeploy': '该功能需要先部署才能运行，所以不能在这里开启。必须先成立的条件写在它的名称下面。',
    'switch.eUnknown': '已经没有这个名称的开关了。请重新加载页面。',
    'switch.eRefused': '数据库拒绝了这项更改，开关保持原样。它的说明：',
    'switch.eUnsure': '无法确定这个开关是否已更改。请重新加载页面，先看一看，再决定是否重新点按。',
    'switch.eSignedOut': '你已退出登录。请重新登录，然后再试一次。',
    'switch.rsTitle': '教师收入分成',
    'switch.rsBadge': '教师所得：{percent}%',
    'switch.rsBody':
      '课程售出所得中教师占的百分比。更改只适用于此后确认的订单：每一笔收益记录都保留其产生时适用的分成，所以已入账的钱款不会变动。手续费、税款如何处理，以及分成是否对每位教师相同，仍需作出政策决定；这个百分比不能代替对这些条款的决定，也不会开启向教师付款。',
    'switch.rsZero': '现在是 0%：教师不获得任何分成，售出所得由平台保留。',
    'switch.rsField': '教师分成，整数百分比',
    'switch.rsReason': '这次更改的理由（保存在审计记录中）',
    'switch.rsExample': '例如：已批准的教师报酬政策，审阅日期…',
    'switch.rsSave': '保存收入分成',
    'switch.rsSaving': '正在保存…',
    'switch.rsSaved': '已保存。',
    'switch.rsEPercent': '请输入 0 到 100 之间的整数百分比。',
    'switch.rsEReason': '请写明理由。它会保存在审计记录中。',
    'switch.rsELong': '理由请控制在 500 个字符以内。',
    'switch.rsENotAllowed': '只有财务管理员或平台管理员可以更改收入分成。分成保持原样。',
    'switch.rsERefused': '数据库拒绝了这项更改，分成保持原样。它的说明：',
    'switch.rsEUnsure': '无法确定分成是否已保存。请重新加载页面，先读一下数字，再决定是否重新保存。',
  },
  'zh-hant': {
    'switch.title': '功能開關',
    'switch.lede': '所有功能都已建好，並在關閉狀態下發布。前提條件滿足後，在這裡開啟功能。',
    'switch.statOn': '已開啟',
    'switch.statOff': '已關閉',
    'switch.statSetup': '已關閉，須先完成外部設定',
    'switch.statDeploy': '需要部署',
    'switch.retention': '保留期時鐘',
    'switch.retentionNote':
      '隱私權聲明承諾到期刪除的兩樣東西：支援個案在關閉三年後刪除；教師接受過背景核查的紀錄，在核查之日與其年滿十八歲之日兩者較晚的一個之後七年刪除。該頁面會說明哪些已經到期，哪些因為沒有人關閉而沒有開始計時，並以有限的批次執行刪除',
    'switch.deployNote':
      '標有「需要部署」的功能不能在這裡開啟，這一拒絕由資料庫執行，而不是靠隱藏控制項。每一項都寫有必須先成立的前提條件。沒有寫明前提條件的功能，是一個等著被開啟的缺陷。',
    'switch.empty': '功能登記表是空的。',
    'switch.groupOn': '已開啟：{on} / {total}',
    'switch.gLearner': '學習者功能',
    'switch.gTeaching': '教學',
    'switch.gMoney': '款項',
    'switch.gFamilies': '兒童與家庭',
    'switch.gPlatform': '平台',
    'switch.gDelivery': '內容傳遞',
    'switch.gGovernance': '治理',
    'switch.gOther': '其他',
    'switch.trHead': '翻譯。',
    'switch.trOn': '翻譯已開啟。已登入的讀者可以在別人寫的內容下方點「翻譯」，那段文字會傳送給 Google。',
    'switch.trOnNoKey': '翻譯開關已開啟，但這台伺服器沒有 GOOGLE_TRANSLATE_API_KEY，所以不顯示按鈕，也不傳送任何內容。',
    'switch.trOffKey': '翻譯已關閉。這台伺服器有金鑰；下面的 platform.translate 開關會讓按鈕出現。',
    'switch.trOffNoKey': '翻譯已關閉，這台伺服器也沒有 GOOGLE_TRANSLATE_API_KEY。兩者都需要。',
    'switch.trUsed':
      '本月字元數：{characters} / {monthly}（{share}%）。請求數：{requests}。人數：{people}。一個人一天最多可傳送：{daily}。成員用到當月額度的五分之四即停止；其餘留給工作人員。',
    'switch.gateRuntime': '即時開關',
    'switch.gateSetupFirst': '須先完成外部設定',
    'switch.gateSetupOn': '已開啟，依賴外部設定',
    'switch.gateDeploy': '需要部署',
    'switch.on': '已開啟',
    'switch.off': '已關閉',
    'switch.eNotOwner': '只有平台管理員可以更改功能開關。這個開關保持原樣。',
    'switch.eDeploy': '該功能需要先部署才能運作，所以不能在這裡開啟。必須先成立的條件寫在它的名稱下面。',
    'switch.eUnknown': '已經沒有這個名稱的開關了。請重新載入頁面。',
    'switch.eRefused': '資料庫拒絕了這項更改，開關保持原樣。它的說明：',
    'switch.eUnsure': '無法確定這個開關是否已更改。請重新載入頁面，先看一看，再決定是否重新點按。',
    'switch.eSignedOut': '你已登出。請重新登入，然後再試一次。',
    'switch.rsTitle': '教師收入分成',
    'switch.rsBadge': '教師所得：{percent}%',
    'switch.rsBody':
      '課程售出所得中教師占的百分比。更改只適用於此後確認的訂單：每一筆收益紀錄都保留其產生時適用的分成，所以已入帳的款項不會變動。手續費、稅款如何處理，以及分成是否對每位教師相同，仍需作出政策決定；這個百分比不能代替對這些條款的決定，也不會開啟向教師付款。',
    'switch.rsZero': '現在是 0%：教師不獲得任何分成，售出所得由平台保留。',
    'switch.rsField': '教師分成，整數百分比',
    'switch.rsReason': '這次更改的理由（保存在稽核紀錄中）',
    'switch.rsExample': '例如：已核准的教師報酬政策，審閱日期…',
    'switch.rsSave': '儲存收入分成',
    'switch.rsSaving': '正在儲存…',
    'switch.rsSaved': '已儲存。',
    'switch.rsEPercent': '請輸入 0 到 100 之間的整數百分比。',
    'switch.rsEReason': '請寫明理由。它會保存在稽核紀錄中。',
    'switch.rsELong': '理由請控制在 500 個字元以內。',
    'switch.rsENotAllowed': '只有財務管理員或平台管理員可以更改收入分成。分成保持原樣。',
    'switch.rsERefused': '資料庫拒絕了這項更改，分成保持原樣。它的說明：',
    'switch.rsEUnsure': '無法確定分成是否已儲存。請重新載入頁面，先讀一下數字，再決定是否重新儲存。',
  },
  vi: {
    'switch.title': 'Công tắc tính năng',
    'switch.lede':
      'Mọi thứ đã được xây xong và phát hành ở trạng thái tắt. Hãy bật các tính năng ở đây khi điều kiện tiên quyết của chúng được đáp ứng.',
    'switch.statOn': 'Đang bật',
    'switch.statOff': 'Đang tắt',
    'switch.statSetup': 'Đang tắt, cần thiết lập bên ngoài trước',
    'switch.statDeploy': 'Cần triển khai mã',
    'switch.retention': 'Đồng hồ lưu giữ',
    'switch.retentionNote':
      'hai thứ mà thông báo về quyền riêng tư hứa sẽ xóa vào một ngày nhất định: một hồ sơ hỗ trợ ba năm sau khi đóng, và bản ghi rằng một giáo viên đã được thẩm tra bảy năm sau thời điểm muộn hơn giữa lần thẩm tra và sinh nhật thứ mười tám của người đó. Trang ấy cho biết cái gì đã đến hạn, cái gì chưa có đồng hồ vì chưa ai đóng nó, và thực hiện việc xóa theo một đợt có giới hạn',
    'switch.deployNote':
      'Tính năng được đánh dấu “Cần triển khai mã” không thể bật ở đây, và sự từ chối đó được thực thi trong cơ sở dữ liệu chứ không phải bằng cách ẩn nút điều khiển. Mỗi tính năng mang điều kiện tiên quyết phải đúng trước đã. Một tính năng không có điều kiện tiên quyết được viết ra là một lỗi đang chờ được bật.',
    'switch.empty': 'Sổ đăng ký tính năng đang trống.',
    'switch.groupOn': 'Đang bật: {on} trên {total}',
    'switch.gLearner': 'Tính năng cho học viên',
    'switch.gTeaching': 'Giảng dạy',
    'switch.gMoney': 'Tiền',
    'switch.gFamilies': 'Trẻ em và gia đình',
    'switch.gPlatform': 'Nền tảng',
    'switch.gDelivery': 'Phân phối nội dung',
    'switch.gGovernance': 'Quản trị',
    'switch.gOther': 'Khác',
    'switch.trHead': 'Dịch.',
    'switch.trOn':
      'Tính năng dịch đang bật. Người đọc đã đăng nhập có thể nhấn “Dịch” bên dưới nội dung người khác viết, và văn bản đó được gửi tới Google.',
    'switch.trOnNoKey':
      'Công tắc dịch đang bật, nhưng máy chủ này không có GOOGLE_TRANSLATE_API_KEY, nên không nút nào được hiển thị và không có gì được gửi đi.',
    'switch.trOffKey':
      'Tính năng dịch đang tắt. Máy chủ này có khóa; công tắc platform.translate bên dưới làm nút hiện ra.',
    'switch.trOffNoKey':
      'Tính năng dịch đang tắt, và máy chủ này không có GOOGLE_TRANSLATE_API_KEY. Cần cả hai.',
    'switch.trUsed':
      'Ký tự trong tháng này: {characters} trên {monthly} ({share}%). Yêu cầu: {requests}. Số người: {people}. Nhiều nhất một người có thể gửi trong một ngày: {daily}. Thành viên dừng ở bốn phần năm hạn mức của tháng; phần còn lại dành cho nhân viên.',
    'switch.gateRuntime': 'Bật tắt tức thì',
    'switch.gateSetupFirst': 'Cần thiết lập bên ngoài trước',
    'switch.gateSetupOn': 'Đang bật, dựa vào thiết lập bên ngoài',
    'switch.gateDeploy': 'Cần triển khai mã',
    'switch.on': 'Bật',
    'switch.off': 'Tắt',
    'switch.eNotOwner':
      'Chỉ quản trị viên nền tảng mới có thể thay đổi công tắc tính năng. Công tắc này vẫn như cũ.',
    'switch.eDeploy':
      'Tính năng đó cần triển khai mã trước khi chạy được, nên không thể bật ở đây. Điều gì phải đúng trước đã được viết dưới tên của nó.',
    'switch.eUnknown': 'Không còn công tắc nào mang tên đó. Hãy tải lại trang.',
    'switch.eRefused': 'Cơ sở dữ liệu đã từ chối thay đổi đó, và công tắc vẫn như cũ. Điều nó nói:',
    'switch.eUnsure':
      'Không ai có thể nói công tắc đó đã thay đổi hay chưa. Hãy tải lại trang và xem nó trước khi nhấn lần nữa.',
    'switch.eSignedOut': 'Bạn đã đăng xuất. Hãy đăng nhập lại rồi thử thêm một lần nữa.',
    'switch.rsTitle': 'Phần chia doanh thu cho giáo viên',
    'switch.rsBadge': 'Cho giáo viên: {percent}%',
    'switch.rsBody':
      'Tỷ lệ phần trăm của giáo viên trên những gì một lần bán khóa học mang lại. Việc thay đổi chỉ áp dụng cho các đơn hàng được xác nhận sau đó: mỗi bút toán thu nhập giữ nguyên phần chia mà nó được hưởng khi phát sinh, nên tiền đã ghi sổ không thể dịch chuyển. Phí xử lý, cách xử lý thuế, và việc phần chia có giống nhau cho mọi giáo viên hay không vẫn cần một quyết định chính sách; tỷ lệ phần trăm không thay thế cho việc quyết định các điều khoản đó, và nó không bật việc chi trả cho giáo viên.',
    'switch.rsZero':
      'Hiện là 0%: giáo viên không được hưởng phần nào và nền tảng giữ những gì một lần bán mang lại.',
    'switch.rsField': 'Phần của giáo viên, số phần trăm nguyên',
    'switch.rsReason': 'Lý do của thay đổi này (được lưu trong nhật ký kiểm tra)',
    'switch.rsExample':
      'Ví dụ: chính sách trả thù lao cho giáo viên đã được phê duyệt, xem xét ngày…',
    'switch.rsSave': 'Lưu phần chia doanh thu',
    'switch.rsSaving': 'Đang lưu…',
    'switch.rsSaved': 'Đã lưu.',
    'switch.rsEPercent': 'Hãy nhập một số phần trăm nguyên từ 0 đến 100.',
    'switch.rsEReason': 'Hãy nêu lý do bằng văn bản. Lý do sẽ được lưu trong nhật ký kiểm tra.',
    'switch.rsELong': 'Giữ lý do dưới 500 ký tự.',
    'switch.rsENotAllowed':
      'Chỉ quản trị viên tài chính hoặc quản trị viên nền tảng mới có thể thay đổi phần chia doanh thu. Phần chia vẫn như cũ.',
    'switch.rsERefused':
      'Cơ sở dữ liệu đã từ chối thay đổi đó, và phần chia vẫn như cũ. Điều nó nói:',
    'switch.rsEUnsure':
      'Không ai có thể nói phần chia đã được lưu hay chưa. Hãy tải lại trang và đọc con số trước khi lưu lần nữa.',
  },
  th: {
    'switch.title': 'สวิตช์ฟีเจอร์',
    'switch.lede':
      'ทุกอย่างสร้างเสร็จแล้วและปล่อยออกมาในสภาพปิดอยู่ เปิดฟีเจอร์ได้ที่นี่เมื่อเงื่อนไขเบื้องต้นของแต่ละอย่างครบแล้ว',
    'switch.statOn': 'เปิดอยู่',
    'switch.statOff': 'ปิดอยู่',
    'switch.statSetup': 'ปิดอยู่ ต้องตั้งค่าภายนอกก่อน',
    'switch.statDeploy': 'ต้องดีพลอยโค้ดก่อน',
    'switch.retention': 'นาฬิกาการเก็บรักษา',
    'switch.retentionNote':
      'สองสิ่งที่ประกาศความเป็นส่วนตัวสัญญาว่าจะลบเมื่อถึงวันที่กำหนด ได้แก่ เคสขอความช่วยเหลือเมื่อครบสามปีหลังปิดเคส และบันทึกว่าครูคนหนึ่งผ่านการตรวจสอบประวัติเมื่อครบเจ็ดปีนับจากวันที่ช้ากว่าระหว่างวันตรวจสอบกับวันเกิดครบสิบแปดปีของครูคนนั้น หน้านั้นบอกว่าอะไรถึงกำหนดแล้ว อะไรยังไม่มีนาฬิกาเพราะยังไม่มีใครปิด และทำการลบเป็นชุดที่จำกัดจำนวน',
    'switch.deployNote':
      'ฟีเจอร์ที่มีป้าย “ต้องดีพลอยโค้ดก่อน” เปิดจากที่นี่ไม่ได้ และการปฏิเสธนี้บังคับใช้ในฐานข้อมูล ไม่ใช่ด้วยการซ่อนปุ่มควบคุม แต่ละอย่างมีเงื่อนไขเบื้องต้นที่ต้องเป็นจริงก่อน ฟีเจอร์ที่ไม่มีเงื่อนไขเบื้องต้นเขียนไว้คือข้อบกพร่องที่รอวันถูกเปิด',
    'switch.empty': 'ทะเบียนฟีเจอร์ว่างอยู่',
    'switch.groupOn': 'เปิดอยู่: {on} จาก {total}',
    'switch.gLearner': 'ฟีเจอร์สำหรับผู้เรียน',
    'switch.gTeaching': 'การสอน',
    'switch.gMoney': 'เงิน',
    'switch.gFamilies': 'เด็กและครอบครัว',
    'switch.gPlatform': 'แพลตฟอร์ม',
    'switch.gDelivery': 'การส่งมอบเนื้อหา',
    'switch.gGovernance': 'การกำกับดูแล',
    'switch.gOther': 'อื่น ๆ',
    'switch.trHead': 'การแปล',
    'switch.trOn':
      'การแปลเปิดอยู่ ผู้อ่านที่เข้าสู่ระบบแล้วกด “แปล” ใต้สิ่งที่คนอื่นเขียนได้ และข้อความนั้นจะถูกส่งไปยัง Google',
    'switch.trOnNoKey':
      'สวิตช์การแปลเปิดอยู่ แต่เซิร์ฟเวอร์นี้ไม่มี GOOGLE_TRANSLATE_API_KEY จึงไม่มีปุ่มแสดงและไม่มีอะไรถูกส่งออกไป',
    'switch.trOffKey':
      'การแปลปิดอยู่ เซิร์ฟเวอร์นี้มีคีย์แล้ว สวิตช์ platform.translate ด้านล่างเป็นตัวทำให้ปุ่มปรากฏ',
    'switch.trOffNoKey':
      'การแปลปิดอยู่ และเซิร์ฟเวอร์นี้ไม่มี GOOGLE_TRANSLATE_API_KEY ต้องมีทั้งสองอย่าง',
    'switch.trUsed':
      'ตัวอักษรเดือนนี้: {characters} จาก {monthly} ({share}%) คำขอ: {requests} จำนวนคน: {people} มากที่สุดที่คนหนึ่งส่งได้ในหนึ่งวัน: {daily} สมาชิกหยุดที่สี่ในห้าของโควตาเดือนนั้น ส่วนที่เหลือเก็บไว้ให้เจ้าหน้าที่',
    'switch.gateRuntime': 'สลับได้ทันที',
    'switch.gateSetupFirst': 'ต้องตั้งค่าภายนอกก่อน',
    'switch.gateSetupOn': 'เปิดอยู่ โดยอาศัยการตั้งค่าภายนอก',
    'switch.gateDeploy': 'ต้องดีพลอยโค้ดก่อน',
    'switch.on': 'เปิด',
    'switch.off': 'ปิด',
    'switch.eNotOwner':
      'มีเพียงผู้ดูแลแพลตฟอร์มเท่านั้นที่เปลี่ยนสวิตช์ฟีเจอร์ได้ สวิตช์นี้ยังเป็นเหมือนเดิม',
    'switch.eDeploy':
      'ฟีเจอร์นั้นต้องดีพลอยโค้ดก่อนจึงจะทำงานได้ จึงเปิดจากที่นี่ไม่ได้ สิ่งที่ต้องเป็นจริงก่อนเขียนไว้ใต้ชื่อของมัน',
    'switch.eUnknown': 'ไม่มีสวิตช์ชื่อนั้นแล้ว โปรดโหลดหน้านี้ใหม่',
    'switch.eRefused':
      'ฐานข้อมูลปฏิเสธการเปลี่ยนแปลงนั้น และสวิตช์ยังเป็นเหมือนเดิม สิ่งที่ฐานข้อมูลบอก:',
    'switch.eUnsure':
      'ไม่มีใครบอกได้ว่าสวิตช์นั้นเปลี่ยนแล้วหรือไม่ โปรดโหลดหน้านี้ใหม่และดูสวิตช์ก่อนกดอีกครั้ง',
    'switch.eSignedOut': 'คุณออกจากระบบแล้ว โปรดเข้าสู่ระบบอีกครั้ง แล้วลองอีกหนึ่งครั้ง',
    'switch.rsTitle': 'ส่วนแบ่งรายได้ของครู',
    'switch.rsBadge': 'ให้ครู: {percent}%',
    'switch.rsBody':
      'เปอร์เซ็นต์ของครูจากสิ่งที่การขายคอร์สหนึ่งครั้งได้มา การเปลี่ยนค่านี้มีผลเฉพาะกับคำสั่งซื้อที่ยืนยันหลังจากนั้น รายการรายได้แต่ละรายการเก็บส่วนแบ่งที่ใช้ตอนได้มา เงินที่ลงบัญชีไปแล้วจึงขยับไม่ได้ ค่าธรรมเนียมการประมวลผล วิธีจัดการภาษี และส่วนแบ่งจะเท่ากันสำหรับครูทุกคนหรือไม่ ยังต้องมีการตัดสินใจเชิงนโยบาย เปอร์เซ็นต์นี้ใช้แทนการตัดสินใจเรื่องเงื่อนไขเหล่านั้นไม่ได้ และไม่ได้เปิดการจ่ายเงินให้ครู',
    'switch.rsZero': 'ตอนนี้เป็น 0%: ครูไม่ได้รับส่วนแบ่งใดเลย และแพลตฟอร์มเก็บสิ่งที่การขายได้มา',
    'switch.rsField': 'ส่วนแบ่งของครู เป็นเปอร์เซ็นต์จำนวนเต็ม',
    'switch.rsReason': 'เหตุผลของการเปลี่ยนแปลงนี้ (เก็บไว้ในบันทึกการตรวจสอบ)',
    'switch.rsExample': 'เช่น นโยบายค่าตอบแทนครูที่อนุมัติแล้ว ทบทวนเมื่อวันที่…',
    'switch.rsSave': 'บันทึกส่วนแบ่งรายได้',
    'switch.rsSaving': 'กำลังบันทึก…',
    'switch.rsSaved': 'บันทึกแล้ว',
    'switch.rsEPercent': 'โปรดใส่เปอร์เซ็นต์จำนวนเต็มตั้งแต่ 0 ถึง 100',
    'switch.rsEReason': 'โปรดให้เหตุผลเป็นลายลักษณ์อักษร เหตุผลนี้จะเก็บไว้ในบันทึกการตรวจสอบ',
    'switch.rsELong': 'โปรดเขียนเหตุผลไม่เกิน 500 ตัวอักษร',
    'switch.rsENotAllowed':
      'มีเพียงผู้ดูแลการเงินหรือผู้ดูแลแพลตฟอร์มเท่านั้นที่เปลี่ยนส่วนแบ่งรายได้ได้ ส่วนแบ่งยังเป็นเหมือนเดิม',
    'switch.rsERefused':
      'ฐานข้อมูลปฏิเสธการเปลี่ยนแปลงนั้น และส่วนแบ่งยังเป็นเหมือนเดิม สิ่งที่ฐานข้อมูลบอก:',
    'switch.rsEUnsure':
      'ไม่มีใครบอกได้ว่าส่วนแบ่งถูกบันทึกแล้วหรือไม่ โปรดโหลดหน้านี้ใหม่และอ่านตัวเลขก่อนบันทึกอีกครั้ง',
  },
  fil: {
    'switch.title': 'Mga switch ng feature',
    'switch.lede':
      'Lahat ay nagawa na at inilabas nang naka-off. I-on ang mga feature dito habang natutupad ang mga paunang kondisyon nito.',
    'switch.statOn': 'Naka-on',
    'switch.statOff': 'Naka-off',
    'switch.statSetup': 'Naka-off, panlabas na setup muna',
    'switch.statDeploy': 'Kailangan ng deploy',
    'switch.retention': 'Orasan ng pagpapanatili',
    'switch.retentionNote':
      'ang dalawang bagay na ipinangangako ng abiso sa privacy na buburahin sa isang petsa: isang kaso ng suporta tatlong taon matapos itong isara, at ang tala na nasiyasat ang isang guro pitong taon matapos ang mas huli sa pagsisiyasat at sa ikalabingwalong kaarawan niya. Sinasabi ng pahina kung ano ang dapat nang burahin, kung ano ang walang orasan dahil walang nagsara nito, at ginagawa nito ang pagbubura sa limitadong batch',
    'switch.deployNote':
      'Ang feature na may markang “Kailangan ng deploy” ay hindi mai-o-on dito, at ang pagtangging iyon ay ipinatutupad sa database sa halip na itago ang kontrol. Bawat isa ay may paunang kondisyon na dapat munang maging totoo. Ang feature na walang nakasulat na paunang kondisyon ay depektong naghihintay na ma-on.',
    'switch.empty': 'Walang laman ang talaan ng feature.',
    'switch.groupOn': 'Naka-on: {on} sa {total}',
    'switch.gLearner': 'Mga feature para sa mag-aaral',
    'switch.gTeaching': 'Pagtuturo',
    'switch.gMoney': 'Pera',
    'switch.gFamilies': 'Mga bata at pamilya',
    'switch.gPlatform': 'Platform',
    'switch.gDelivery': 'Paghahatid ng nilalaman',
    'switch.gGovernance': 'Pamamahala',
    'switch.gOther': 'Iba pa',
    'switch.trHead': 'Pagsasalin.',
    'switch.trOn':
      'Naka-on ang pagsasalin. Ang mambabasang naka-sign in ay makakapindot ng “Isalin” sa ilalim ng isinulat ng iba, at ipinapadala ang tekstong iyon sa Google.',
    'switch.trOnNoKey':
      'Naka-on ang switch ng pagsasalin, pero walang GOOGLE_TRANSLATE_API_KEY ang server na ito, kaya walang button na ipinapakita at walang ipinapadala.',
    'switch.trOffKey':
      'Naka-off ang pagsasalin. May key ang server na ito; ang switch na platform.translate sa ibaba ang nagpapalabas ng button.',
    'switch.trOffNoKey':
      'Naka-off ang pagsasalin, at walang GOOGLE_TRANSLATE_API_KEY ang server na ito. Kailangan nito ang dalawa.',
    'switch.trUsed':
      'Mga character ngayong buwan: {characters} sa {monthly} ({share}%). Mga request: {requests}. Mga tao: {people}. Pinakamarami na maipapadala ng isang tao sa isang araw: {daily}. Humihinto ang mga miyembro sa apat na ikalima ng buwan; ang natitira ay nakalaan sa staff.',
    'switch.gateRuntime': 'Agarang switch',
    'switch.gateSetupFirst': 'Panlabas na setup muna',
    'switch.gateSetupOn': 'Naka-on, umaasa sa panlabas na setup',
    'switch.gateDeploy': 'Kailangan ng deploy',
    'switch.on': 'Naka-on',
    'switch.off': 'Naka-off',
    'switch.eNotOwner':
      'Ang admin ng platform lang ang makapagbabago ng switch ng feature. Nananatili ang switch na ito sa dati.',
    'switch.eDeploy':
      'Kailangan ng feature na iyon ng deploy bago ito tumakbo, kaya hindi ito mai-o-on dito. Nakasulat sa ilalim ng pangalan nito kung ano ang dapat munang maging totoo.',
    'switch.eUnknown': 'Wala nang switch na may ganoong pangalan. I-load muli ang pahina.',
    'switch.eRefused':
      'Tinanggihan ng database ang pagbabagong iyon, at nananatili ang switch sa dati. Ang sinabi nito:',
    'switch.eUnsure':
      'Walang makapagsasabi kung nagbago ang switch na iyon. I-load muli ang pahina at tingnan ito bago pumindot ulit.',
    'switch.eSignedOut': 'Naka-sign out ka na. Mag-sign in muli, saka subukan nang isa pang beses.',
    'switch.rsTitle': 'Hatian ng kita para sa mga guro',
    'switch.rsBadge': 'Sa mga guro: {percent}%',
    'switch.rsBody':
      'Ang porsiyento ng guro sa naipapasok ng benta ng kurso. Ang pagbabago nito ay para lang sa mga order na makukumpirma pagkatapos: bawat tala ng kita ay nag-iingat ng hating umiral noong kinita ito, kaya hindi magagalaw ang perang naitala na. Ang mga bayad sa pagproseso, ang pagtrato sa buwis, at kung pareho ang hati para sa bawat guro ay nangangailangan pa ng pasya sa patakaran; ang porsiyento ay hindi kapalit ng pagpapasya sa mga tuntuning iyon, at hindi nito ino-on ang pagbabayad sa mga guro.',
    'switch.rsZero':
      '0% ito ngayon: walang hating kinikita ang mga guro at nasa platform ang naipapasok ng benta.',
    'switch.rsField': 'Hati ng guro, buong porsiyento',
    'switch.rsReason': 'Dahilan ng pagbabagong ito (iniingatan sa audit record)',
    'switch.rsExample': 'Halimbawa: aprobadong patakaran sa bayad sa mga guro, nirepaso noong…',
    'switch.rsSave': 'I-save ang hatian ng kita',
    'switch.rsSaving': 'Sine-save…',
    'switch.rsSaved': 'Na-save na.',
    'switch.rsEPercent': 'Maglagay ng buong porsiyento mula 0 hanggang 100.',
    'switch.rsEReason': 'Magbigay ng nakasulat na dahilan. Iingatan ito sa audit record.',
    'switch.rsELong': 'Panatilihing mas maikli sa 500 character ang dahilan.',
    'switch.rsENotAllowed':
      'Finance admin o admin ng platform lang ang makapagbabago ng hatian ng kita. Nananatili ito sa dati.',
    'switch.rsERefused':
      'Tinanggihan ng database ang pagbabagong iyon, at nananatili ang hatian sa dati. Ang sinabi nito:',
    'switch.rsEUnsure':
      'Walang makapagsasabi kung na-save ang hatian. I-load muli ang pahina at basahin ang numero bago mag-save ulit.',
  },
  uz: {
    'switch.title': 'Funksiya kalitlari',
    'switch.lede':
      'Hammasi qurilgan va oʻchiq holda chiqarilgan. Dastlabki shartlari bajarilgani sari funksiyalarni shu yerda yoqing.',
    'switch.statOn': 'Yoqilgan',
    'switch.statOff': 'Oʻchiq',
    'switch.statSetup': 'Oʻchiq, avval tashqi sozlash',
    'switch.statDeploy': 'Deploy talab qiladi',
    'switch.retention': 'Saqlash muddati soati',
    'switch.retentionNote':
      'maxfiylik bildirishnomasi maʼlum sanada oʻchirishni vaʼda qilgan ikki narsa: yordam ishi yopilganidan uch yil oʻtib, va oʻqituvchi tekshirilgani haqidagi qayd tekshiruv bilan uning oʻn sakkiz yoshga toʻlishidan qaysi biri keyin boʻlsa, oʻshandan yetti yil oʻtib. Sahifa nimaning muddati kelganini, hech kim yopmagani uchun nimaning soati yoʻqligini aytadi va oʻchirishni cheklangan toʻplam bilan bajaradi',
    'switch.deployNote':
      '“Deploy talab qiladi” deb belgilangan funksiyani bu yerda yoqib boʻlmaydi va bu rad boshqaruv elementini yashirish bilan emas, maʼlumotlar bazasida amalga oshiriladi. Har birida avval toʻgʻri boʻlishi kerak boʻlgan dastlabki shart yozilgan. Yozma dastlabki sharti yoʻq funksiya yoqilishini kutayotgan xatodir.',
    'switch.empty': 'Funksiyalar reyestri boʻsh.',
    'switch.groupOn': 'Yoqilgan: {total} tadan {on} ta',
    'switch.gLearner': 'Oʻquvchilar uchun funksiyalar',
    'switch.gTeaching': 'Oʻqitish',
    'switch.gMoney': 'Pul',
    'switch.gFamilies': 'Bolalar va oilalar',
    'switch.gPlatform': 'Platforma',
    'switch.gDelivery': 'Kontentni yetkazish',
    'switch.gGovernance': 'Boshqaruv',
    'switch.gOther': 'Boshqa',
    'switch.trHead': 'Tarjima.',
    'switch.trOn':
      'Tarjima yoqilgan. Hisobiga kirgan oʻquvchi boshqa birov yozgan narsa ostidagi “Tarjima qilish” tugmasini bosa oladi va oʻsha matn Google xizmatiga yuboriladi.',
    'switch.trOnNoKey':
      'Tarjima kaliti yoqilgan, lekin bu serverda GOOGLE_TRANSLATE_API_KEY yoʻq, shuning uchun hech qanday tugma koʻrsatilmaydi va hech narsa yuborilmaydi.',
    'switch.trOffKey':
      'Tarjima oʻchiq. Bu serverda kalit bor; quyidagi platform.translate kaliti tugmani paydo qiladi.',
    'switch.trOffNoKey':
      'Tarjima oʻchiq va bu serverda GOOGLE_TRANSLATE_API_KEY yoʻq. Unga ikkalasi ham kerak.',
    'switch.trUsed':
      'Shu oydagi belgilar: {monthly} tadan {characters} ta ({share}%). Soʻrovlar: {requests}. Odamlar: {people}. Bir kishi bir kunda eng koʻpi bilan yubora oladi: {daily}. Aʼzolar oy ulushining beshdan toʻrt qismida toʻxtaydi; qolgani xodimlar uchun saqlanadi.',
    'switch.gateRuntime': 'Darhol yoqiladi',
    'switch.gateSetupFirst': 'Avval tashqi sozlash',
    'switch.gateSetupOn': 'Yoqilgan, tashqi sozlashga tayanadi',
    'switch.gateDeploy': 'Deploy talab qiladi',
    'switch.on': 'Yoqilgan',
    'switch.off': 'Oʻchiq',
    'switch.eNotOwner':
      'Funksiya kalitini faqat platforma administratori oʻzgartira oladi. Bu kalit qanday boʻlsa, shundayligicha qoldi.',
    'switch.eDeploy':
      'Bu funksiya ishlashi uchun avval deploy kerak, shuning uchun uni bu yerda yoqib boʻlmaydi. Avval nima toʻgʻri boʻlishi kerakligi uning nomi ostida yozilgan.',
    'switch.eUnknown': 'Bunday nomli kalit endi yoʻq. Sahifani qayta yuklang.',
    'switch.eRefused':
      'Maʼlumotlar bazasi bu oʻzgarishni rad etdi va kalit qanday boʻlsa, shundayligicha qoldi. U aytgan gap:',
    'switch.eUnsure':
      'Bu kalit oʻzgargan-oʻzgarmaganini hech kim ayta olmaydi. Sahifani qayta yuklang va qayta bosishdan oldin unga qarang.',
    'switch.eSignedOut': 'Hisobdan chiqqansiz. Qayta kiring, soʻng yana bir marta urinib koʻring.',
    'switch.rsTitle': 'Oʻqituvchilarning daromad ulushi',
    'switch.rsBadge': 'Oʻqituvchilarga: {percent}%',
    'switch.rsBody':
      'Kurs sotuvidan tushgan narsadan oʻqituvchining foizi. Uni oʻzgartirish faqat shundan keyin tasdiqlangan buyurtmalarga taalluqli: har bir daromad yozuvi qaysi ulush bilan topilgan boʻlsa, oʻshani saqlaydi, shuning uchun allaqachon yozilgan pul joyidan qoʻzgʻalmaydi. Ishlov berish toʻlovlari, soliqqa qanday munosabatda boʻlish va ulush har bir oʻqituvchi uchun bir xilmi-yoʻqmi, hali siyosat qarorini talab qiladi; foiz bu shartlar boʻyicha qaror oʻrnini bosmaydi va oʻqituvchilarga toʻlovlarni yoqmaydi.',
    'switch.rsZero':
      'Hozir 0%: oʻqituvchilar ulush olmaydi va sotuvdan tushgan narsa platformada qoladi.',
    'switch.rsField': 'Oʻqituvchi ulushi, butun foiz',
    'switch.rsReason': 'Bu oʻzgarishning sababi (audit qaydida saqlanadi)',
    'switch.rsExample':
      'Masalan: oʻqituvchilarga haq toʻlash boʻyicha tasdiqlangan siyosat, koʻrib chiqilgan sana…',
    'switch.rsSave': 'Daromad ulushini saqlash',
    'switch.rsSaving': 'Saqlanmoqda…',
    'switch.rsSaved': 'Saqlandi.',
    'switch.rsEPercent': '0 dan 100 gacha butun foiz kiriting.',
    'switch.rsEReason': 'Yozma sabab keltiring. U audit qaydida saqlanadi.',
    'switch.rsELong': 'Sababni 500 belgidan qisqa tuting.',
    'switch.rsENotAllowed':
      'Daromad ulushini faqat moliya administratori yoki platforma administratori oʻzgartira oladi. U qanday boʻlsa, shundayligicha qoldi.',
    'switch.rsERefused':
      'Maʼlumotlar bazasi bu oʻzgarishni rad etdi va ulush qanday boʻlsa, shundayligicha qoldi. U aytgan gap:',
    'switch.rsEUnsure':
      'Ulush saqlangan-saqlanmaganini hech kim ayta olmaydi. Sahifani qayta yuklang va qayta saqlashdan oldin raqamni oʻqing.',
  },
  kk: {
    'switch.title': 'Функция қосқыштары',
    'switch.lede':
      'Бәрі жасалған және өшірулі күйде шығарылған. Алғышарттары орындалған сайын функцияларды осы жерден қосыңыз.',
    'switch.statOn': 'Қосулы',
    'switch.statOff': 'Өшірулі',
    'switch.statSetup': 'Өшірулі, алдымен сыртқы баптау',
    'switch.statDeploy': 'Деплой қажет',
    'switch.retention': 'Сақтау мерзімінің сағаты',
    'switch.retentionNote':
      'құпиялылық хабарламасы белгілі бір күні жоюға уәде берген екі нәрсе: қолдау ісі жабылғаннан кейін үш жыл өткенде, және мұғалімнің тексерілгені туралы жазба тексеру мен оның он сегіз жасқа толуының қайсысы кеш болса, содан жеті жыл өткенде. Бет ненің мерзімі жеткенін, ешкім жаппағандықтан ненің сағаты жоқ екенін айтады және жоюды шектеулі топтамамен орындайды',
    'switch.deployNote':
      '«Деплой қажет» деп белгіленген функцияны осы жерден қосу мүмкін емес, және бұл бас тарту басқару элементін жасыру арқылы емес, дерекқорда орындалады. Әрқайсысында алдымен шын болуы тиіс алғышарт жазылған. Жазбаша алғышарты жоқ функция — қосылуын күтіп тұрған қате.',
    'switch.empty': 'Функциялар тізілімі бос.',
    'switch.groupOn': 'Қосулы: {total} ішінен {on}',
    'switch.gLearner': 'Оқушыларға арналған функциялар',
    'switch.gTeaching': 'Оқыту',
    'switch.gMoney': 'Ақша',
    'switch.gFamilies': 'Балалар мен отбасылар',
    'switch.gPlatform': 'Платформа',
    'switch.gDelivery': 'Мазмұнды жеткізу',
    'switch.gGovernance': 'Басқару',
    'switch.gOther': 'Басқа',
    'switch.trHead': 'Аударма.',
    'switch.trOn':
      'Аударма қосулы. Тіркелгісіне кірген оқырман басқа біреу жазған нәрсенің астындағы «Аудару» түймесін баса алады, және сол мәтін Google-ға жіберіледі.',
    'switch.trOnNoKey':
      'Аударма қосқышы қосулы, бірақ бұл серверде GOOGLE_TRANSLATE_API_KEY жоқ, сондықтан ешқандай түйме көрсетілмейді және ештеңе жіберілмейді.',
    'switch.trOffKey':
      'Аударма өшірулі. Бұл серверде кілт бар; төмендегі platform.translate қосқышы түймені шығарады.',
    'switch.trOffNoKey':
      'Аударма өшірулі, және бұл серверде GOOGLE_TRANSLATE_API_KEY жоқ. Оған екеуі де қажет.',
    'switch.trUsed':
      'Осы айдағы таңбалар: {monthly} ішінен {characters} ({share}%). Сұраулар: {requests}. Адамдар: {people}. Бір адам бір күнде ең көбі жібере алады: {daily}. Мүшелер айлық үлестің бестен төртінде тоқтайды; қалғаны қызметкерлерге сақталады.',
    'switch.gateRuntime': 'Бірден қосылады',
    'switch.gateSetupFirst': 'Алдымен сыртқы баптау',
    'switch.gateSetupOn': 'Қосулы, сыртқы баптауға сүйенеді',
    'switch.gateDeploy': 'Деплой қажет',
    'switch.on': 'Қосулы',
    'switch.off': 'Өшірулі',
    'switch.eNotOwner':
      'Функция қосқышын тек платформа әкімшісі өзгерте алады. Бұл қосқыш бұрынғы күйінде қалды.',
    'switch.eDeploy':
      'Бұл функция жұмыс істеуі үшін алдымен деплой қажет, сондықтан оны осы жерден қосу мүмкін емес. Алдымен не шын болуы тиіс екені оның атауының астында жазылған.',
    'switch.eUnknown': 'Мұндай атаулы қосқыш енді жоқ. Бетті қайта жүктеңіз.',
    'switch.eRefused':
      'Дерекқор бұл өзгерісті қабылдамады, және қосқыш бұрынғы күйінде қалды. Оның айтқаны:',
    'switch.eUnsure':
      'Бұл қосқыштың өзгерген-өзгермегенін ешкім айта алмайды. Бетті қайта жүктеп, қайта баспас бұрын оған қараңыз.',
    'switch.eSignedOut': 'Тіркелгіден шығып кеткенсіз. Қайта кіріп, тағы бір рет байқап көріңіз.',
    'switch.rsTitle': 'Мұғалімдердің табыс үлесі',
    'switch.rsBadge': 'Мұғалімдерге: {percent}%',
    'switch.rsBody':
      'Курс сатылымынан түскен нәрседен мұғалімнің пайызы. Оны өзгерту тек содан кейін расталған тапсырыстарға қатысты: әрбір табыс жазбасы қай үлеспен табылса, соны сақтайды, сондықтан бұрын жазылған ақша орнынан қозғалмайды. Өңдеу алымдары, салықтың қалай есептелетіні және үлестің әр мұғалімге бірдей-бірдей еместігі әлі саясат шешімін қажет етеді; пайыз сол шарттар бойынша шешімнің орнын баспайды және мұғалімдерге төлемдерді қоспайды.',
    'switch.rsZero':
      'Қазір 0%: мұғалімдер үлес алмайды және сатылымнан түскен нәрсе платформада қалады.',
    'switch.rsField': 'Мұғалім үлесі, бүтін пайыз',
    'switch.rsReason': 'Бұл өзгерістің себебі (аудит журналында сақталады)',
    'switch.rsExample': 'Мысалы: мұғалімдерге ақы төлеудің бекітілген саясаты, қаралған күні…',
    'switch.rsSave': 'Табыс үлесін сақтау',
    'switch.rsSaving': 'Сақталуда…',
    'switch.rsSaved': 'Сақталды.',
    'switch.rsEPercent': '0-ден 100-ге дейінгі бүтін пайызды енгізіңіз.',
    'switch.rsEReason': 'Жазбаша себеп келтіріңіз. Ол аудит журналында сақталады.',
    'switch.rsELong': 'Себепті 500 таңбадан қысқа ұстаңыз.',
    'switch.rsENotAllowed':
      'Табыс үлесін тек қаржы әкімшісі немесе платформа әкімшісі өзгерте алады. Ол бұрынғы күйінде қалды.',
    'switch.rsERefused':
      'Дерекқор бұл өзгерісті қабылдамады, және үлес бұрынғы күйінде қалды. Оның айтқаны:',
    'switch.rsEUnsure':
      'Үлестің сақталған-сақталмағанын ешкім айта алмайды. Бетті қайта жүктеп, қайта сақтамас бұрын санды оқыңыз.',
  },
  az: {
    'switch.title': 'Funksiya açarları',
    'switch.lede':
      'Hər şey qurulub və söndürülmüş halda buraxılıb. İlkin şərtləri yerinə yetdikcə funksiyaları buradan yandırın.',
    'switch.statOn': 'Yandırılıb',
    'switch.statOff': 'Söndürülüb',
    'switch.statSetup': 'Söndürülüb, əvvəlcə kənar quraşdırma',
    'switch.statDeploy': 'Deploy tələb edir',
    'switch.retention': 'Saxlama müddəti saatı',
    'switch.retentionNote':
      'məxfilik bildirişinin müəyyən tarixdə silməyi vəd etdiyi iki şey: dəstək işi bağlandıqdan üç il sonra, və müəllimin yoxlanıldığı barədə qeyd yoxlama ilə onun on səkkiz yaşının tamam olmasından hansı gecdirsə, ondan yeddi il sonra. Səhifə nəyin vaxtının çatdığını, heç kim bağlamadığı üçün nəyin saatının olmadığını deyir və silməni məhdud dəstə ilə icra edir',
    'switch.deployNote':
      '“Deploy tələb edir” işarəli funksiya buradan yandırıla bilməz və bu imtina idarəetmə elementini gizlətməklə deyil, verilənlər bazasında tətbiq olunur. Hər birində əvvəlcə doğru olmalı olan ilkin şərt yazılıb. Yazılı ilkin şərti olmayan funksiya yandırılmağı gözləyən xətadır.',
    'switch.empty': 'Funksiyalar reyestri boşdur.',
    'switch.groupOn': 'Yandırılıb: {total} funksiyadan {on}',
    'switch.gLearner': 'Öyrənənlər üçün funksiyalar',
    'switch.gTeaching': 'Tədris',
    'switch.gMoney': 'Pul',
    'switch.gFamilies': 'Uşaqlar və ailələr',
    'switch.gPlatform': 'Platforma',
    'switch.gDelivery': 'Məzmunun çatdırılması',
    'switch.gGovernance': 'İdarəçilik',
    'switch.gOther': 'Digər',
    'switch.trHead': 'Tərcümə.',
    'switch.trOn':
      'Tərcümə yandırılıb. Hesabına daxil olmuş oxucu başqasının yazdığının altındakı “Tərcümə et” düyməsini basa bilər və həmin mətn Google-a göndərilir.',
    'switch.trOnNoKey':
      'Tərcümə açarı yandırılıb, amma bu serverdə GOOGLE_TRANSLATE_API_KEY yoxdur, ona görə heç bir düymə göstərilmir və heç nə göndərilmir.',
    'switch.trOffKey':
      'Tərcümə söndürülüb. Bu serverdə açar var; aşağıdakı platform.translate açarı düyməni üzə çıxarır.',
    'switch.trOffNoKey':
      'Tərcümə söndürülüb və bu serverdə GOOGLE_TRANSLATE_API_KEY yoxdur. Ona hər ikisi lazımdır.',
    'switch.trUsed':
      'Bu ayın simvolları: {monthly} simvoldan {characters} ({share}%). Sorğular: {requests}. İnsanlar: {people}. Bir nəfərin bir gündə göndərə biləcəyi ən çox miqdar: {daily}. Üzvlər ayın beşdə dördündə dayanır; qalanı əməkdaşlar üçün saxlanılır.',
    'switch.gateRuntime': 'Dərhal yandırılır',
    'switch.gateSetupFirst': 'Əvvəlcə kənar quraşdırma',
    'switch.gateSetupOn': 'Yandırılıb, kənar quraşdırmaya söykənir',
    'switch.gateDeploy': 'Deploy tələb edir',
    'switch.on': 'Yandırılıb',
    'switch.off': 'Söndürülüb',
    'switch.eNotOwner':
      'Funksiya açarını yalnız platforma administratoru dəyişə bilər. Bu açar olduğu kimi qalıb.',
    'switch.eDeploy':
      'Həmin funksiyanın işləməsi üçün əvvəlcə deploy lazımdır, ona görə buradan yandırıla bilməz. Əvvəlcə nəyin doğru olmalı olduğu onun adının altında yazılıb.',
    'switch.eUnknown': 'Bu adda açar artıq yoxdur. Səhifəni yenidən yükləyin.',
    'switch.eRefused':
      'Verilənlər bazası bu dəyişikliyi rədd etdi və açar olduğu kimi qalıb. Onun dediyi:',
    'switch.eUnsure':
      'Bu açarın dəyişib-dəyişmədiyini heç kim deyə bilməz. Səhifəni yenidən yükləyin və yenidən basmazdan əvvəl ona baxın.',
    'switch.eSignedOut': 'Hesabdan çıxmısınız. Yenidən daxil olun, sonra bir dəfə də cəhd edin.',
    'switch.rsTitle': 'Müəllimlərin gəlir payı',
    'switch.rsBadge': 'Müəllimlərə: {percent}%',
    'switch.rsBody':
      'Kurs satışının gətirdiyindən müəllimin faizi. Onu dəyişmək yalnız bundan sonra təsdiqlənən sifarişlərə aiddir: hər qazanc qeydi hansı payla qazanılıbsa, onu saxlayır, ona görə artıq yazılmış pul yerindən tərpənə bilməz. Emal haqları, verginin necə nəzərə alınması və payın hər müəllim üçün eyni olub-olmaması hələ siyasət qərarı tələb edir; faiz həmin şərtlər barədə qərarı əvəz etmir və müəllimlərə ödənişləri yandırmır.',
    'switch.rsZero':
      'Hazırda 0%-dir: müəllimlər pay qazanmır və satışın gətirdiyi platformada qalır.',
    'switch.rsField': 'Müəllimin payı, tam faiz',
    'switch.rsReason': 'Bu dəyişikliyin səbəbi (audit jurnalında saxlanılır)',
    'switch.rsExample': 'Məsələn: müəllimlərə ödəniş üzrə təsdiqlənmiş siyasət, baxıldığı tarix…',
    'switch.rsSave': 'Gəlir payını yadda saxla',
    'switch.rsSaving': 'Yadda saxlanılır…',
    'switch.rsSaved': 'Yadda saxlanıldı.',
    'switch.rsEPercent': '0-dan 100-ə qədər tam faiz daxil edin.',
    'switch.rsEReason': 'Yazılı səbəb göstərin. O, audit jurnalında saxlanılacaq.',
    'switch.rsELong': 'Səbəbi 500 simvoldan qısa saxlayın.',
    'switch.rsENotAllowed':
      'Gəlir payını yalnız maliyyə administratoru və ya platforma administratoru dəyişə bilər. O, olduğu kimi qalıb.',
    'switch.rsERefused':
      'Verilənlər bazası bu dəyişikliyi rədd etdi və pay olduğu kimi qalıb. Onun dediyi:',
    'switch.rsEUnsure':
      'Payın yadda saxlanılıb-saxlanılmadığını heç kim deyə bilməz. Səhifəni yenidən yükləyin və yenidən yadda saxlamazdan əvvəl rəqəmi oxuyun.',
  },
  tg: {
    'switch.title': 'Калидҳои хусусиятҳо',
    'switch.lede':
      'Ҳама чиз сохта шудааст ва дар ҳолати хомӯш нашр шудааст. Ҳар гоҳ пешшартҳои хусусият иҷро шаванд, онро аз ҳамин ҷо фаъол кунед.',
    'switch.statOn': 'Фаъол',
    'switch.statOff': 'Хомӯш',
    'switch.statSetup': 'Хомӯш, аввал танзими берунӣ',
    'switch.statDeploy': 'Насби нусхаи нави кодро талаб мекунад',
    'switch.retention': 'Соати нигоҳдорӣ',
    'switch.retentionNote':
      'ду чизе, ки огоҳиномаи махфият ваъда медиҳад дар санаи муайян нест кунад: парвандаи дастгирӣ пас аз се соли баста шуданаш, ва сабти он ки муаллим санҷида шудааст, пас аз ҳафт сол аз он чи дертар аст: санҷиш ё ҳаждаҳсола шудани ӯ. Саҳифа мегӯяд, ки мӯҳлати чӣ расидааст, чӣ соат надорад, зеро касе онро набастааст, ва несткуниро бо дастаи маҳдуд анҷом медиҳад',
    'switch.deployNote':
      'Хусусияте, ки бо нишони «Насби нусхаи нави кодро талаб мекунад» аст, аз ин ҷо фаъол карда намешавад, ва ин радкунӣ на бо пинҳон кардани идора, балки дар пойгоҳи додаҳо иҷро мешавад. Ҳар кадом пешшартеро дорад, ки бояд аввал дуруст бошад. Хусусияте, ки пешшарти навишташуда надорад, хатоест, ки фаъол шуданро интизор аст.',
    'switch.empty': 'Феҳристи хусусиятҳо холӣ аст.',
    'switch.groupOn': 'Фаъол: {on} аз {total}',
    'switch.gLearner': 'Хусусиятҳо барои омӯзандагон',
    'switch.gTeaching': 'Таълим',
    'switch.gMoney': 'Пул',
    'switch.gFamilies': 'Кӯдакон ва оилаҳо',
    'switch.gPlatform': 'Платформа',
    'switch.gDelivery': 'Расонидани мӯҳтаво',
    'switch.gGovernance': 'Идоракунӣ',
    'switch.gOther': 'Дигар',
    'switch.trHead': 'Тарҷума.',
    'switch.trOn':
      'Тарҷума фаъол аст. Хонандае, ки ба ҳисоб ворид шудааст, метавонад дар зери навиштаи каси дигар «Тарҷума кардан»-ро пахш кунад, ва он матн ба Google фиристода мешавад.',
    'switch.trOnNoKey':
      'Калиди тарҷума фаъол аст, аммо ин сервер GOOGLE_TRANSLATE_API_KEY надорад, бинобар ин ҳеҷ тугма нишон дода намешавад ва ҳеҷ чиз фиристода намешавад.',
    'switch.trOffKey':
      'Тарҷума хомӯш аст. Ин сервер калид дорад; калиди platform.translate дар поён тугмаро пайдо мекунад.',
    'switch.trOffNoKey':
      'Тарҷума хомӯш аст, ва ин сервер GOOGLE_TRANSLATE_API_KEY надорад. Ба он ҳар ду лозим аст.',
    'switch.trUsed':
      'Аломатҳои ин моҳ: {characters} аз {monthly} ({share}%). Дархостҳо: {requests}. Одамон: {people}. Бештарин миқдоре, ки як нафар дар як рӯз фиристода метавонад: {daily}. Аъзо дар чор панҷяки саҳми моҳ меистанд; боқимонда барои кормандон нигоҳ дошта мешавад.',
    'switch.gateRuntime': 'Фавран фаъол мешавад',
    'switch.gateSetupFirst': 'Аввал танзими берунӣ',
    'switch.gateSetupOn': 'Фаъол, ба танзими берунӣ такя мекунад',
    'switch.gateDeploy': 'Насби нусхаи нави кодро талаб мекунад',
    'switch.on': 'Фаъол',
    'switch.off': 'Хомӯш',
    'switch.eNotOwner':
      'Калиди хусусиятро танҳо маъмури платформа иваз карда метавонад. Ин калид ҳамон тавр ки буд, мондааст.',
    'switch.eDeploy':
      'Он хусусият пеш аз кор карданаш насби нусхаи нави кодро талаб мекунад, бинобар ин аз ин ҷо фаъол карда намешавад. Он чи бояд аввал дуруст бошад, дар зери номаш навишта шудааст.',
    'switch.eUnknown': 'Калиде бо чунин ном дигар нест. Саҳифаро аз нав бор кунед.',
    'switch.eRefused':
      'Пойгоҳи додаҳо ин тағйиротро рад кард, ва калид ҳамон тавр ки буд, мондааст. Он чи гуфт:',
    'switch.eUnsure':
      'Ҳеҷ кас гуфта наметавонад, ки ин калид тағйир ёфт ё не. Саҳифаро аз нав бор кунед ва пеш аз дубора пахш кардан ба он нигаред.',
    'switch.eSignedOut':
      'Шумо аз ҳисоб баромадаед. Дубора ворид шавед, сипас як бори дигар кӯшиш кунед.',
    'switch.rsTitle': 'Ҳиссаи муаллимон аз даромад',
    'switch.rsBadge': 'Ба муаллимон: {percent}%',
    'switch.rsBody':
      'Фоизи муаллим аз он чи фурӯши курс меорад. Тағйир додани он танҳо ба фармоишҳое дахл дорад, ки пас аз он тасдиқ мешаванд: ҳар сабти даромад ҳамон ҳиссаеро нигоҳ медорад, ки бо он ба даст омадааст, бинобар ин пуле, ки аллакай сабт шудааст, ҷой иваз карда наметавонад. Ҳаққи коркард, тарзи муносибат бо андоз ва он ки ҳисса барои ҳар муаллим якхела аст ё не, ҳанӯз қарори сиёсатро талаб мекунанд; фоиз ҷои қарор дар бораи он шартҳоро намегирад ва пардохтҳо ба муаллимонро фаъол намекунад.',
    'switch.rsZero':
      'Ҳоло 0% аст: муаллимон ҳеҷ ҳисса ба даст намеоранд ва он чи фурӯш меорад, дар платформа мемонад.',
    'switch.rsField': 'Ҳиссаи муаллим, фоизи бутун',
    'switch.rsReason': 'Сабаби ин тағйирот (дар сабти аудит нигоҳ дошта мешавад)',
    'switch.rsExample': 'Масалан: сиёсати тасдиқшудаи пардохт ба муаллимон, баррасӣ шуд дар санаи…',
    'switch.rsSave': 'Нигоҳ доштани ҳиссаи даромад',
    'switch.rsSaving': 'Нигоҳ дошта мешавад…',
    'switch.rsSaved': 'Нигоҳ дошта шуд.',
    'switch.rsEPercent': 'Фоизи бутунро аз 0 то 100 ворид кунед.',
    'switch.rsEReason': 'Сабаби хаттӣ нависед. Он дар сабти аудит нигоҳ дошта мешавад.',
    'switch.rsELong': 'Сабабро аз 500 аломат кӯтоҳтар нигоҳ доред.',
    'switch.rsENotAllowed':
      'Ҳиссаи даромадро танҳо маъмури молия ё маъмури платформа иваз карда метавонад. Он ҳамон тавр ки буд, мондааст.',
    'switch.rsERefused':
      'Пойгоҳи додаҳо ин тағйиротро рад кард, ва ҳисса ҳамон тавр ки буд, мондааст. Он чи гуфт:',
    'switch.rsEUnsure':
      'Ҳеҷ кас гуфта наметавонад, ки ҳисса нигоҳ дошта шуд ё не. Саҳифаро аз нав бор кунед ва пеш аз дубора нигоҳ доштан рақамро хонед.',
  },
  ky: {
    'switch.title': 'Функциялардын которгучтары',
    'switch.lede':
      'Баары курулган жана өчүрүлгөн абалда чыгарылган. Алдын ала шарттары аткарылган сайын функцияларды ушул жерден күйгүзүңүз.',
    'switch.statOn': 'Күйгүзүлгөн',
    'switch.statOff': 'Өчүрүлгөн',
    'switch.statSetup': 'Өчүрүлгөн, адегенде тышкы орнотуу',
    'switch.statDeploy': 'Деплой талап кылат',
    'switch.retention': 'Сактоо мөөнөтүнүн сааты',
    'switch.retentionNote':
      'купуялык билдирүүсү белгилүү бир күнү өчүрүүгө убада кылган эки нерсе: колдоо иши жабылгандан үч жыл өткөндө, жана мугалим текшерилгени тууралуу жазуу текшерүү менен анын он сегиз жашка толушунун кайсынысы кеч болсо, ошондон жети жыл өткөндө. Барак эмненин мөөнөтү келгенин, эч ким жаппагандыктан эмненин сааты жок экенин айтат жана өчүрүүнү чектелген топтом менен аткарат',
    'switch.deployNote':
      '«Деплой талап кылат» деп белгиленген функцияны бул жерден күйгүзүүгө болбойт, жана бул баш тартуу башкаруу элементин жашыруу менен эмес, маалымат базасында аткарылат. Ар биринде адегенде чын болушу керек болгон алдын ала шарт жазылган. Жазылган алдын ала шарты жок функция күйгүзүлүшүн күтүп турган ката.',
    'switch.empty': 'Функциялардын реестри бош.',
    'switch.groupOn': 'Күйгүзүлгөн: {total} ичинен {on}',
    'switch.gLearner': 'Окуучулар үчүн функциялар',
    'switch.gTeaching': 'Окутуу',
    'switch.gMoney': 'Акча',
    'switch.gFamilies': 'Балдар жана үй-бүлөлөр',
    'switch.gPlatform': 'Платформа',
    'switch.gDelivery': 'Мазмунду жеткирүү',
    'switch.gGovernance': 'Башкаруу',
    'switch.gOther': 'Башка',
    'switch.trHead': 'Котормо.',
    'switch.trOn':
      'Котормо күйгүзүлгөн. Аккаунтуна кирген окурман башка бирөө жазган нерсенин астындагы «Которуу» баскычын баса алат, жана ал текст Google кызматына жөнөтүлөт.',
    'switch.trOnNoKey':
      'Котормонун которгучу күйгүзүлгөн, бирок бул серверде GOOGLE_TRANSLATE_API_KEY жок, ошондуктан эч кандай баскыч көрсөтүлбөйт жана эч нерсе жөнөтүлбөйт.',
    'switch.trOffKey':
      'Котормо өчүрүлгөн. Бул серверде ачкыч бар; төмөндөгү platform.translate которгучу баскычты чыгарат.',
    'switch.trOffNoKey':
      'Котормо өчүрүлгөн, жана бул серверде GOOGLE_TRANSLATE_API_KEY жок. Ага экөө тең керек.',
    'switch.trUsed':
      'Ушул айдагы белгилер: {monthly} ичинен {characters} ({share}%). Суроо-талаптар: {requests}. Адамдар: {people}. Бир адам бир күндө эң көп жөнөтө алат: {daily}. Мүчөлөр айлык үлүштүн бештен төртүндө токтойт; калганы кызматкерлер үчүн сакталат.',
    'switch.gateRuntime': 'Дароо күйгүзүлөт',
    'switch.gateSetupFirst': 'Адегенде тышкы орнотуу',
    'switch.gateSetupOn': 'Күйгүзүлгөн, тышкы орнотууга таянат',
    'switch.gateDeploy': 'Деплой талап кылат',
    'switch.on': 'Күйгүзүлгөн',
    'switch.off': 'Өчүрүлгөн',
    'switch.eNotOwner':
      'Функциянын которгучун платформанын администратору гана өзгөртө алат. Бул которгуч мурдагыдай эле калды.',
    'switch.eDeploy':
      'Ал функция иштеши үчүн адегенде деплой керек, ошондуктан аны бул жерден күйгүзүүгө болбойт. Адегенде эмне чын болушу керек экени анын аталышынын астында жазылган.',
    'switch.eUnknown': 'Мындай аталыштагы которгуч эми жок. Баракты кайра жүктөңүз.',
    'switch.eRefused':
      'Маалымат базасы бул өзгөртүүнү четке какты, жана которгуч мурдагыдай эле калды. Анын айтканы:',
    'switch.eUnsure':
      'Бул которгуч өзгөргөнүн же өзгөрбөгөнүн эч ким айта албайт. Баракты кайра жүктөп, кайра басардан мурда аны караңыз.',
    'switch.eSignedOut': 'Аккаунттан чыгып кеткенсиз. Кайра кирип, дагы бир жолу аракет кылыңыз.',
    'switch.rsTitle': 'Мугалимдердин кирешедеги үлүшү',
    'switch.rsBadge': 'Мугалимдерге: {percent}%',
    'switch.rsBody':
      'Курсту сатуудан түшкөн нерседен мугалимдин пайызы. Аны өзгөртүү андан кийин ырасталган буйрутмаларга гана тиешелүү: ар бир киреше жазуусу кайсы үлүш менен табылса, ошону сактайт, ошондуктан мурда жазылган акча ордунан козголбойт. Иштетүү акылары, салыктын кандай эсептелиши жана үлүш ар бир мугалим үчүн бирдейби же жокпу, дагы эле саясат чечимин талап кылат; пайыз ал шарттар боюнча чечимдин ордун баспайт жана мугалимдерге төлөмдөрдү күйгүзбөйт.',
    'switch.rsZero':
      'Азыр 0%: мугалимдер үлүш албайт жана сатуудан түшкөн нерсе платформада калат.',
    'switch.rsField': 'Мугалимдин үлүшү, бүтүн пайыз',
    'switch.rsReason': 'Бул өзгөртүүнүн себеби (аудит журналында сакталат)',
    'switch.rsExample': 'Мисалы: мугалимдерге акы төлөө боюнча бекитилген саясат, каралган күнү…',
    'switch.rsSave': 'Кирешенин үлүшүн сактоо',
    'switch.rsSaving': 'Сакталууда…',
    'switch.rsSaved': 'Сакталды.',
    'switch.rsEPercent': '0дөн 100гө чейинки бүтүн пайызды киргизиңиз.',
    'switch.rsEReason': 'Жазуу жүзүндө себеп келтириңиз. Ал аудит журналында сакталат.',
    'switch.rsELong': 'Себепти 500 белгиден кыска кармаңыз.',
    'switch.rsENotAllowed':
      'Кирешенин үлүшүн каржы администратору же платформанын администратору гана өзгөртө алат. Ал мурдагыдай эле калды.',
    'switch.rsERefused':
      'Маалымат базасы бул өзгөртүүнү четке какты, жана үлүш мурдагыдай эле калды. Анын айтканы:',
    'switch.rsEUnsure':
      'Үлүш сакталганын же сакталбаганын эч ким айта албайт. Баракты кайра жүктөп, кайра сактардан мурда санды окуңуз.',
  },
  tk: {
    'switch.title': 'Aýratynlyk açarlary',
    'switch.lede':
      'Hemme zat gurlan we öçürilen ýagdaýda çykarylan. Deslapky şertleri ýerine ýetdigiçe aýratynlyklary şu ýerden açyň.',
    'switch.statOn': 'Açyk',
    'switch.statOff': 'Öçürilen',
    'switch.statSetup': 'Öçürilen, ilki daşarky sazlama',
    'switch.statDeploy': 'Kodyň täze nusgasyny ornaşdyrmagy talap edýär',
    'switch.retention': 'Saklaýyş möhletiniň sagady',
    'switch.retentionNote':
      'gizlinlik habarnamasynyň belli bir senede pozmagy wada berýän iki zady: goldaw işi ýapylandan üç ýyl soň, we mugallymyň barlanandygy baradaky ýazgy barlag bilen onuň on sekiz ýaşynyň dolmagynyň haýsysy giç bolsa, şondan ýedi ýyl soň. Sahypa nämäniň möhletiniň gelendigini, hiç kim ýapmandygy sebäpli nämäniň sagadynyň ýokdugyny aýdýar we pozmagy çäkli topar bilen ýerine ýetirýär',
    'switch.deployNote':
      '“Kodyň täze nusgasyny ornaşdyrmagy talap edýär” diýlip bellenen aýratynlygy şu ýerden açyp bolmaýar, we bu ret etme dolandyryş elementini gizlemek bilen däl-de, maglumat bazasynda amala aşyrylýar. Olaryň her birinde ilki dogry bolmaly deslapky şert ýazylan. Ýazylan deslapky şerti ýok aýratynlyk açylmagyna garaşýan ýalňyşlykdyr.',
    'switch.empty': 'Aýratynlyklaryň sanawy boş.',
    'switch.groupOn': 'Açyk: {total} sanydan {on}',
    'switch.gLearner': 'Öwrenijiler üçin aýratynlyklar',
    'switch.gTeaching': 'Okatmak',
    'switch.gMoney': 'Pul',
    'switch.gFamilies': 'Çagalar we maşgalalar',
    'switch.gPlatform': 'Platforma',
    'switch.gDelivery': 'Mazmuny ýetirmek',
    'switch.gGovernance': 'Dolandyryş',
    'switch.gOther': 'Başga',
    'switch.trHead': 'Terjime.',
    'switch.trOn':
      'Terjime açyk. Hasabyna giren okyjy başga biriniň ýazan zadynyň aşagyndaky “Terjime et” düwmesini basyp bilýär, we şol tekst Google-a iberilýär.',
    'switch.trOnNoKey':
      'Terjime açary açyk, ýöne bu serwerde GOOGLE_TRANSLATE_API_KEY ýok, şonuň üçin hiç hili düwme görkezilmeýär we hiç zat iberilmeýär.',
    'switch.trOffKey':
      'Terjime öçürilen. Bu serwerde açar bar; aşakdaky platform.translate açary düwmäni ýüze çykarýar.',
    'switch.trOffNoKey':
      'Terjime öçürilen, we bu serwerde GOOGLE_TRANSLATE_API_KEY ýok. Oňa ikisi-de gerek.',
    'switch.trUsed':
      'Şu aýyň nyşanlary: {monthly} sanydan {characters} ({share}%). Haýyşlar: {requests}. Adamlar: {people}. Bir adamyň bir günde iň köp iberip biljegi: {daily}. Agzalar aýlyk paýyň bäşden dördünde durýar; galany işgärler üçin saklanýar.',
    'switch.gateRuntime': 'Derrew açylýar',
    'switch.gateSetupFirst': 'Ilki daşarky sazlama',
    'switch.gateSetupOn': 'Açyk, daşarky sazlama daýanýar',
    'switch.gateDeploy': 'Kodyň täze nusgasyny ornaşdyrmagy talap edýär',
    'switch.on': 'Açyk',
    'switch.off': 'Öçürilen',
    'switch.eNotOwner':
      'Aýratynlyk açaryny diňe platformanyň administratory üýtgedip bilýär. Bu açar öňküsi ýaly galdy.',
    'switch.eDeploy':
      'Şol aýratynlygyň işlemegi üçin ilki kodyň täze nusgasyny ornaşdyrmak gerek, şonuň üçin ony şu ýerden açyp bolmaýar. Ilki nämäniň dogry bolmalydygy onuň adynyň aşagynda ýazylan.',
    'switch.eUnknown': 'Şeýle atly açar indi ýok. Sahypany täzeden ýükläň.',
    'switch.eRefused':
      'Maglumat bazasy bu üýtgetmäni ret etdi, we açar öňküsi ýaly galdy. Onuň aýdany:',
    'switch.eUnsure':
      'Bu açaryň üýtgändigini ýa-da üýtgemändigini hiç kim aýdyp bilmez. Sahypany täzeden ýükläň we täzeden basmazdan öň oňa serediň.',
    'switch.eSignedOut': 'Hasapdan çykypsyňyz. Täzeden giriň, soňra ýene bir gezek synanyşyň.',
    'switch.rsTitle': 'Mugallymlaryň girdeji paýy',
    'switch.rsBadge': 'Mugallymlara: {percent}%',
    'switch.rsBody':
      'Kurs satuwynyň getirýän zadyndan mugallymyň göterimi. Ony üýtgetmek diňe şondan soň tassyklanan sargytlara degişlidir: her bir gazanç ýazgysy haýsy paý bilen gazanylan bolsa, şony saklaýar, şonuň üçin eýýäm ýazylan pul ýerinden gozganyp bilmeýär. Işläp taýýarlamak tölegleri, salgydyň nähili hasaplanýandygy we paýyň her mugallym üçin birmeňzeşdigi ýa-da däldigi henizem syýasat kararyny talap edýär; göterim şol şertler barada karar bermegiň ornuny tutmaýar we mugallymlara tölegleri açmaýar.',
    'switch.rsZero':
      'Häzir 0%: mugallymlar paý gazanmaýar we satuwyň getirýän zady platformada galýar.',
    'switch.rsField': 'Mugallymyň paýy, bitin göterim',
    'switch.rsReason': 'Bu üýtgetmäniň sebäbi (audit ýazgysynda saklanýar)',
    'switch.rsExample':
      'Mysal üçin: mugallymlara hak tölemek boýunça tassyklanan syýasat, gözden geçirilen senesi…',
    'switch.rsSave': 'Girdeji paýyny sakla',
    'switch.rsSaving': 'Saklanýar…',
    'switch.rsSaved': 'Saklandy.',
    'switch.rsEPercent': '0-dan 100-e çenli bitin göterim giriziň.',
    'switch.rsEReason': 'Ýazmaça sebäp görkeziň. Ol audit ýazgysynda saklanar.',
    'switch.rsELong': 'Sebäbi 500 nyşandan gysga saklaň.',
    'switch.rsENotAllowed':
      'Girdeji paýyny diňe maliýe administratory ýa-da platformanyň administratory üýtgedip bilýär. Ol öňküsi ýaly galdy.',
    'switch.rsERefused':
      'Maglumat bazasy bu üýtgetmäni ret etdi, we paý öňküsi ýaly galdy. Onuň aýdany:',
    'switch.rsEUnsure':
      'Paýyň saklanandygyny ýa-da saklanmandygyny hiç kim aýdyp bilmez. Sahypany täzeden ýükläň we täzeden saklamazdan öň sany okaň.',
  },
  ta: {
    'switch.title': 'அம்சச் சுவிட்சுகள்',
    'switch.lede':
      'எல்லாம் கட்டப்பட்டு, அணைந்த நிலையில் வெளியிடப்பட்டுள்ளது. முன்நிபந்தனைகள் நிறைவேறும்போது அம்சங்களை இங்கே இயக்குங்கள்.',
    'switch.statOn': 'இயக்கத்தில்',
    'switch.statOff': 'அணைந்துள்ளவை',
    'switch.statSetup': 'அணைந்துள்ளவை, முதலில் வெளிப்புற அமைப்பு',
    'switch.statDeploy': 'நிரல் வெளியீடு தேவை',
    'switch.retention': 'தக்கவைப்புக் கடிகாரம்',
    'switch.retentionNote':
      'தனியுரிமை அறிவிப்பு ஒரு தேதியில் நீக்குவதாக உறுதியளிக்கும் இரண்டு விஷயங்கள்: ஓர் ஆதரவு வழக்கு மூடப்பட்டு மூன்று ஆண்டுகளுக்குப் பிறகு, மற்றும் ஓர் ஆசிரியர் சரிபார்க்கப்பட்டார் என்ற பதிவு, சரிபார்ப்பு அல்லது அவரது பதினெட்டாவது பிறந்தநாள் ஆகியவற்றில் பிந்தையதிலிருந்து ஏழு ஆண்டுகளுக்குப் பிறகு. எதற்குக் காலம் வந்துவிட்டது, யாரும் மூடாததால் எதற்குக் கடிகாரம் இல்லை என்பதை அந்தப் பக்கம் சொல்கிறது; நீக்கத்தை வரம்புள்ள தொகுதியாகச் செய்கிறது',
    'switch.deployNote':
      '“நிரல் வெளியீடு தேவை” என்று குறிக்கப்பட்ட அம்சத்தை இங்கே இயக்க முடியாது; அந்த மறுப்பு கட்டுப்பாட்டை மறைப்பதால் அல்ல, தரவுத்தளத்தில் நடைமுறைப்படுத்தப்படுகிறது. ஒவ்வொன்றும் முதலில் உண்மையாக இருக்க வேண்டிய முன்நிபந்தனையைக் கொண்டுள்ளது. எழுதப்பட்ட முன்நிபந்தனை இல்லாத அம்சம், இயக்கப்படக் காத்திருக்கும் ஒரு பிழை.',
    'switch.empty': 'அம்சப் பதிவேடு காலியாக உள்ளது.',
    'switch.groupOn': 'இயக்கத்தில்: {total} இல் {on}',
    'switch.gLearner': 'கற்பவர்களுக்கான அம்சங்கள்',
    'switch.gTeaching': 'கற்பித்தல்',
    'switch.gMoney': 'பணம்',
    'switch.gFamilies': 'குழந்தைகளும் குடும்பங்களும்',
    'switch.gPlatform': 'தளம்',
    'switch.gDelivery': 'உள்ளடக்க வழங்கல்',
    'switch.gGovernance': 'நிர்வாகம்',
    'switch.gOther': 'மற்றவை',
    'switch.trHead': 'மொழிபெயர்ப்பு.',
    'switch.trOn':
      'மொழிபெயர்ப்பு இயக்கத்தில் உள்ளது. உள்நுழைந்த வாசகர் வேறொருவர் எழுதியதன் கீழ் “மொழிபெயர்” என்பதை அழுத்தலாம்; அந்த உரை Google-க்கு அனுப்பப்படுகிறது.',
    'switch.trOnNoKey':
      'மொழிபெயர்ப்புச் சுவிட்சு இயக்கத்தில் உள்ளது, ஆனால் இந்தச் சேவையகத்தில் GOOGLE_TRANSLATE_API_KEY இல்லை; எனவே எந்தப் பொத்தானும் காட்டப்படாது, எதுவும் அனுப்பப்படாது.',
    'switch.trOffKey':
      'மொழிபெயர்ப்பு அணைந்துள்ளது. இந்தச் சேவையகத்தில் ஒரு திறவுகோல் உள்ளது; கீழே உள்ள platform.translate சுவிட்சு பொத்தானைத் தோன்றச் செய்கிறது.',
    'switch.trOffNoKey':
      'மொழிபெயர்ப்பு அணைந்துள்ளது, இந்தச் சேவையகத்தில் GOOGLE_TRANSLATE_API_KEY இல்லை. இரண்டும் தேவை.',
    'switch.trUsed':
      'இந்த மாத எழுத்துகள்: {monthly} இல் {characters} ({share}%). கோரிக்கைகள்: {requests}. நபர்கள்: {people}. ஒருவர் ஒரு நாளில் அதிகபட்சம் அனுப்பக்கூடியது: {daily}. உறுப்பினர்கள் மாத ஒதுக்கீட்டின் ஐந்தில் நான்கு பங்கில் நிற்கிறார்கள்; மீதம் பணியாளர்களுக்காக வைக்கப்படுகிறது.',
    'switch.gateRuntime': 'உடனடிச் சுவிட்சு',
    'switch.gateSetupFirst': 'முதலில் வெளிப்புற அமைப்பு',
    'switch.gateSetupOn': 'இயக்கத்தில், வெளிப்புற அமைப்பைச் சார்ந்துள்ளது',
    'switch.gateDeploy': 'நிரல் வெளியீடு தேவை',
    'switch.on': 'இயக்கத்தில்',
    'switch.off': 'அணைந்துள்ளது',
    'switch.eNotOwner':
      'அம்சச் சுவிட்சைத் தள நிர்வாகி மட்டுமே மாற்ற முடியும். இந்தச் சுவிட்சு இருந்தபடியே உள்ளது.',
    'switch.eDeploy':
      'அந்த அம்சம் இயங்குவதற்கு முன் நிரல் வெளியீடு தேவை; எனவே அதை இங்கே இயக்க முடியாது. முதலில் எது உண்மையாக இருக்க வேண்டும் என்பது அதன் பெயருக்குக் கீழே எழுதப்பட்டுள்ளது.',
    'switch.eUnknown': 'அந்தப் பெயரில் இனி எந்தச் சுவிட்சும் இல்லை. பக்கத்தை மீண்டும் ஏற்றுங்கள்.',
    'switch.eRefused':
      'தரவுத்தளம் அந்த மாற்றத்தை மறுத்தது; சுவிட்சு இருந்தபடியே உள்ளது. அது சொன்னது:',
    'switch.eUnsure':
      'அந்தச் சுவிட்சு மாறியதா என்று யாராலும் சொல்ல முடியாது. பக்கத்தை மீண்டும் ஏற்றி, மீண்டும் அழுத்துவதற்கு முன் அதைப் பாருங்கள்.',
    'switch.eSignedOut':
      'நீங்கள் வெளியேறியுள்ளீர்கள். மீண்டும் உள்நுழைந்து, இன்னொரு முறை முயலுங்கள்.',
    'switch.rsTitle': 'ஆசிரியர்களின் வருவாய்ப் பங்கு',
    'switch.rsBadge': 'ஆசிரியர்களுக்கு: {percent}%',
    'switch.rsBody':
      'ஒரு பாடநெறி விற்பனை கொண்டுவருவதில் ஆசிரியரின் சதவீதம். அதை மாற்றுவது அதன் பிறகு உறுதிப்படுத்தப்படும் ஆர்டர்களுக்கு மட்டுமே பொருந்தும்: ஒவ்வொரு வருமானப் பதிவும் அது ஈட்டப்பட்டபோது இருந்த பங்கையே வைத்திருக்கும்; எனவே ஏற்கனவே பதிவான பணம் நகர முடியாது. செயலாக்கக் கட்டணங்கள், வரி கையாளப்படும் விதம், பங்கு ஒவ்வோர் ஆசிரியருக்கும் ஒன்றா என்பவை இன்னும் கொள்கை முடிவை எதிர்நோக்கியுள்ளன; சதவீதம் அந்த விதிமுறைகளைத் தீர்மானிப்பதற்கு மாற்று அல்ல, ஆசிரியர்களுக்கான பணம் வழங்கலை அது இயக்காது.',
    'switch.rsZero':
      'இப்போது இது 0%: ஆசிரியர்கள் எந்தப் பங்கும் ஈட்டுவதில்லை; விற்பனை கொண்டுவருவதைத் தளமே வைத்துக்கொள்கிறது.',
    'switch.rsField': 'ஆசிரியர் பங்கு, முழு எண் சதவீதம்',
    'switch.rsReason': 'இந்த மாற்றத்துக்கான காரணம் (தணிக்கைப் பதிவில் வைக்கப்படும்)',
    'switch.rsExample':
      'எடுத்துக்காட்டு: ஆசிரியர் ஊதியம் குறித்த அங்கீகரிக்கப்பட்ட கொள்கை, மறுஆய்வு செய்த தேதி…',
    'switch.rsSave': 'வருவாய்ப் பங்கைச் சேமி',
    'switch.rsSaving': 'சேமிக்கப்படுகிறது…',
    'switch.rsSaved': 'சேமிக்கப்பட்டது.',
    'switch.rsEPercent': '0 முதல் 100 வரையிலான முழு எண் சதவீதத்தை உள்ளிடுங்கள்.',
    'switch.rsEReason': 'எழுத்தில் ஒரு காரணம் கொடுங்கள். அது தணிக்கைப் பதிவில் வைக்கப்படும்.',
    'switch.rsELong': 'காரணத்தை 500 எழுத்துகளுக்குக் குறைவாக வைத்திருங்கள்.',
    'switch.rsENotAllowed':
      'வருவாய்ப் பங்கை நிதி நிர்வாகி அல்லது தள நிர்வாகி மட்டுமே மாற்ற முடியும். அது இருந்தபடியே உள்ளது.',
    'switch.rsERefused':
      'தரவுத்தளம் அந்த மாற்றத்தை மறுத்தது; பங்கு இருந்தபடியே உள்ளது. அது சொன்னது:',
    'switch.rsEUnsure':
      'பங்கு சேமிக்கப்பட்டதா என்று யாராலும் சொல்ல முடியாது. பக்கத்தை மீண்டும் ஏற்றி, மீண்டும் சேமிப்பதற்கு முன் எண்ணைப் படியுங்கள்.',
  },
  ne: {
    'switch.title': 'सुविधाका स्विचहरू',
    'switch.lede':
      'सबै कुरा बनिसकेको छ र बन्द अवस्थामा जारी गरिएको छ। पूर्वसर्तहरू पूरा हुँदै जाँदा सुविधाहरू यहाँबाट चालु गर्नुहोस्।',
    'switch.statOn': 'चालु',
    'switch.statOff': 'बन्द',
    'switch.statSetup': 'बन्द, पहिले बाहिरी तयारी',
    'switch.statDeploy': 'डिप्लोय चाहिन्छ',
    'switch.retention': 'अवधारण घडी',
    'switch.retentionNote':
      'गोपनीयता सूचनाले तोकिएको मितिमा मेटाउने वाचा गरेका दुई कुरा: सहायताको मुद्दा बन्द भएको तीन वर्षपछि, र कुनै शिक्षकको जाँच भएको अभिलेख, जाँच र उहाँको अठारौँ जन्मदिनमध्ये जुन पछि हुन्छ त्यसको सात वर्षपछि। पृष्ठले केको समय पुगेको छ, कसैले बन्द नगरेकाले केको घडी चलेको छैन भनी बताउँछ, र मेटाउने काम सीमित खेपमा गर्छ',
    'switch.deployNote':
      '“डिप्लोय चाहिन्छ” भनी चिनो लगाइएको सुविधा यहाँबाट चालु गर्न सकिँदैन, र त्यो अस्वीकार नियन्त्रण लुकाएर होइन, डाटाबेसमै लागू गरिन्छ। प्रत्येकसँग पहिले साँचो हुनुपर्ने पूर्वसर्त लेखिएको हुन्छ। लिखित पूर्वसर्त नभएको सुविधा चालु हुन पर्खिरहेको एउटा त्रुटि हो।',
    'switch.empty': 'सुविधाको दर्ता खाली छ।',
    'switch.groupOn': 'चालु: {total} मध्ये {on}',
    'switch.gLearner': 'सिकारुका लागि सुविधाहरू',
    'switch.gTeaching': 'शिक्षण',
    'switch.gMoney': 'पैसा',
    'switch.gFamilies': 'बालबालिका र परिवार',
    'switch.gPlatform': 'प्लेटफर्म',
    'switch.gDelivery': 'सामग्री पुर्‍याउने काम',
    'switch.gGovernance': 'सुशासन',
    'switch.gOther': 'अन्य',
    'switch.trHead': 'अनुवाद।',
    'switch.trOn':
      'अनुवाद चालु छ। साइन इन गरेको पाठकले अरूले लेखेको कुराको मुनि “अनुवाद गर्नुहोस्” थिच्न सक्छ, र त्यो पाठ Google मा पठाइन्छ।',
    'switch.trOnNoKey':
      'अनुवादको स्विच चालु छ, तर यो सर्भरमा GOOGLE_TRANSLATE_API_KEY छैन, त्यसैले कुनै बटन देखाइँदैन र केही पनि पठाइँदैन।',
    'switch.trOffKey':
      'अनुवाद बन्द छ। यो सर्भरमा कुञ्जी छ; तलको platform.translate स्विचले बटन देखाउँछ।',
    'switch.trOffNoKey':
      'अनुवाद बन्द छ, र यो सर्भरमा GOOGLE_TRANSLATE_API_KEY छैन। यसलाई दुवै चाहिन्छ।',
    'switch.trUsed':
      'यो महिनाका अक्षर: {monthly} मध्ये {characters} ({share}%)। अनुरोध: {requests}। मानिस: {people}। एक जनाले एक दिनमा बढीमा पठाउन सक्ने: {daily}। सदस्यहरू महिनाको कोटाको पाँच भागको चार भागमा रोकिन्छन्; बाँकी कर्मचारीका लागि राखिन्छ।',
    'switch.gateRuntime': 'तुरुन्तै चालु हुने',
    'switch.gateSetupFirst': 'पहिले बाहिरी तयारी',
    'switch.gateSetupOn': 'चालु, बाहिरी तयारीमा निर्भर',
    'switch.gateDeploy': 'डिप्लोय चाहिन्छ',
    'switch.on': 'चालु',
    'switch.off': 'बन्द',
    'switch.eNotOwner':
      'सुविधाको स्विच प्लेटफर्म प्रशासकले मात्र बदल्न सक्नुहुन्छ। यो स्विच जस्ताको तस्तै छ।',
    'switch.eDeploy':
      'त्यो सुविधा चल्नुअघि डिप्लोय चाहिन्छ, त्यसैले यहाँबाट चालु गर्न सकिँदैन। पहिले के साँचो हुनुपर्छ भन्ने कुरा त्यसको नाममुनि लेखिएको छ।',
    'switch.eUnknown': 'त्यो नामको स्विच अब छैन। पृष्ठ फेरि लोड गर्नुहोस्।',
    'switch.eRefused':
      'डाटाबेसले त्यो परिवर्तन अस्वीकार गर्‍यो, र स्विच जस्ताको तस्तै छ। यसले भनेको कुरा:',
    'switch.eUnsure':
      'त्यो स्विच बदलियो कि बदलिएन कसैले भन्न सक्दैन। पृष्ठ फेरि लोड गर्नुहोस् र फेरि थिच्नुअघि त्यसलाई हेर्नुहोस्।',
    'switch.eSignedOut':
      'तपाईं साइन आउट हुनुभएको छ। फेरि साइन इन गर्नुहोस्, अनि अर्को एक पटक प्रयास गर्नुहोस्।',
    'switch.rsTitle': 'आम्दानीमा शिक्षकको हिस्सा',
    'switch.rsBadge': 'शिक्षकहरूलाई: {percent}%',
    'switch.rsBody':
      'कोर्सको बिक्रीले ल्याएको रकममा शिक्षकको प्रतिशत। यसलाई बदल्दा त्यसपछि पुष्टि भएका अर्डरमा मात्र लागू हुन्छ: आम्दानीको प्रत्येक प्रविष्टिले जुन हिस्सामा कमाइएको हो त्यही राख्छ, त्यसैले पहिले नै दर्ता भएको पैसा सर्न सक्दैन। प्रशोधन शुल्क, करको व्यवहार, र हिस्सा हरेक शिक्षकका लागि उही हो कि होइन भन्ने कुरामा अझै नीतिगत निर्णय चाहिन्छ; प्रतिशतले ती सर्तहरूको निर्णयको ठाउँ लिँदैन, र यसले शिक्षकहरूलाई भुक्तानी चालु गर्दैन।',
    'switch.rsZero':
      'अहिले यो ०% छ: शिक्षकहरूले कुनै हिस्सा कमाउँदैनन् र बिक्रीले ल्याएको रकम प्लेटफर्मले राख्छ।',
    'switch.rsField': 'शिक्षकको हिस्सा, पूर्ण प्रतिशत',
    'switch.rsReason': 'यो परिवर्तनको कारण (अडिट अभिलेखमा राखिन्छ)',
    'switch.rsExample': 'उदाहरण: शिक्षक पारिश्रमिकको स्वीकृत नीति, समीक्षा गरिएको मिति…',
    'switch.rsSave': 'आम्दानीको हिस्सा सुरक्षित गर्नुहोस्',
    'switch.rsSaving': 'सुरक्षित गरिँदै छ…',
    'switch.rsSaved': 'सुरक्षित गरियो।',
    'switch.rsEPercent': '० देखि १०० सम्मको पूर्ण प्रतिशत राख्नुहोस्।',
    'switch.rsEReason': 'लिखित कारण दिनुहोस्। यो अडिट अभिलेखमा राखिनेछ।',
    'switch.rsELong': 'कारण ५०० अक्षरभन्दा छोटो राख्नुहोस्।',
    'switch.rsENotAllowed':
      'आम्दानीको हिस्सा वित्त प्रशासक वा प्लेटफर्म प्रशासकले मात्र बदल्न सक्नुहुन्छ। यो जस्ताको तस्तै छ।',
    'switch.rsERefused':
      'डाटाबेसले त्यो परिवर्तन अस्वीकार गर्‍यो, र हिस्सा जस्ताको तस्तै छ। यसले भनेको कुरा:',
    'switch.rsEUnsure':
      'हिस्सा सुरक्षित भयो कि भएन कसैले भन्न सक्दैन। पृष्ठ फेरि लोड गर्नुहोस् र फेरि सुरक्षित गर्नुअघि सङ्ख्या पढ्नुहोस्।',
  },
};
