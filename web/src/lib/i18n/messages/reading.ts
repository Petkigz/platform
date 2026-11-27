import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The reading settings (`app/account/accessibility/page.tsx`) and the words
 * its controls say (four of them since 2026-11-27; the fourth and what the
 * page says about reading aloud are in `ease.ts`).
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts` and `export.ts`: written for the twenty-seven languages with
 * nothing held in `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Every claim here is one somebody can check.** The page used to say
 * "every input has a label", "no control is reachable only by a mouse" and
 * "all of them are complete today". The first two were never measured and
 * the third was false. Each language below says what is built and what was
 * tested, in those words: "built to work with a screen reader, but nobody
 * who relies on one has tested it yet". A translation that turned that back
 * into a promise would be the old page again. No speaker has checked any of
 * it.
 *
 * **Two things are put in, each after a colon** so that no language has to
 * inflect them: how many languages are offered besides English (`{count}`,
 * counted from the register, in the reader's own digits) and the names of
 * the right-to-left ones (`{languages}`, each in its own script, joined by
 * `Intl.ListFormat`).
 *
 * **Served to the server only.** `reading.` is in `SERVER_ONLY_PREFIXES`:
 * the page is drawn on the server and hands the controls their words.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const READING: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'reading.title': 'طريقة العرض',
    'reading.crumb': 'القراءة',
    'reading.lede':
      'أربعة إعدادات تُطبَّق لحظة اختيارها. وهي تخصّ هذا المتصفّح لا حسابك: فالهاتف والحاسوب المحمول يحتاجان إلى حجمين مختلفين، والجهاز المشترك لا ينبغي أن يرث اختيار شخص آخر. ولا يلزمك تسجيل الدخول لاستخدامها.',
    'reading.now': 'هذه هي الإعدادات في هذا المتصفّح.',
    'reading.saved': 'حُفظت لهذا المتصفّح.',
    'reading.notKept':
      'لم يحتفظ هذا المتصفّح بالإعداد. إنه يسري على هذه الصفحة فقط وسيزول في الصفحة التالية.',
    'reading.textLegend': 'حجم النص',
    'reading.textNormal': 'عادي',
    'reading.textNormalNote': 'الحجم الذي تستخدمه بقية المنصة.',
    'reading.textLarge': 'أكبر',
    'reading.textLargeNote': 'درجة واحدة أكبر، للعناوين ونص الفقرات معًا.',
    'reading.textLargest': 'الأكبر',
    'reading.textLargestNote':
      'درجتان أكبر. الصفوف المتجاورة تُرتَّب بعضها فوق بعض حتى لا تنضغط الكلمات.',
    'reading.contrastLegend': 'التباين',
    'reading.contrastNormal': 'عادي',
    'reading.contrastNormalNote': 'الأبيض والأخضر، كما صُمّمت المنصة.',
    'reading.contrastHigh': 'حدود أوضح',
    'reading.contrastHighNote':
      'نص ثانوي أغمق، وحدود أغمق، وخلفية بيضاء خالصة، وإطار أسمك حول العنصر الذي تقف عليه لوحة المفاتيح. مفيد في الضوء الساطع وعلى الشاشات الخافتة.',
    'reading.motionLegend': 'الحركة',
    'reading.motionSystem': 'اتبع جهازي',
    'reading.motionSystemNote': 'إذا طلب جهازك حركة أقل فالمنصة تستجيب له أصلًا.',
    'reading.motionReduce': 'قلّل الحركة دائمًا',
    'reading.motionReduceNote': 'يوقف الانتقالات والتمرير المتحرّك حتى إن لم يطلب الجهاز ذلك.',
    'reading.reset': 'العودة إلى الإعدادات الافتراضية',
    'reading.trueHeading': 'ما هو متحقّق أصلًا دون ضبط أي شيء',
    'reading.keyboard': 'لوحة المفاتيح تعمل.',
    'reading.keyboardNote':
      'للعنصر الذي تقف عليه لوحة المفاتيح إطار ظاهر، وأول محطة في كل صفحة رابط يتخطّى إلى المحتوى. وأي عنصر تحكّم لا يُوصَل إليه إلا بالفأرة أو بالإصبع هو خلل، ونريد أن نعلم به.',
    'reading.device': 'إعدادات جهازك نفسه محترمة.',
    'reading.deviceNote':
      'إذا طلب جهازك حركة أقل قلّلتها المنصة؛ والإعداد أعلاه هو لجهاز لا يطلب ذلك. وتُفتح الواجهة كذلك باللغة التي يطلبها جهازك متى كانت تلك اللغة معروضة.',
    'reading.colours': 'ألوان النص مقيسة.',
    'reading.coloursNote':
      'ألوان النص والخلفية الرئيسية في التصميم العادي يفحصها اختبار آلي عند كل تغيير في المنصة، مقابل التباين الذي تطلبه الإرشادات الدولية لإتاحة الوصول للنص العادي.',
    'reading.names': 'النماذج تحمل أسماء.',
    'reading.namesNote':
      'حقول الإدخال مبنيّة بتسمية يستطيع قارئ الشاشة أن ينطقها، والجدول العريض يُمرَّر داخل إطاره بدل أن يدفع الصفحة جانبًا.',
    'reading.arabic': 'العربية تُعرض بوصفها عربية.',
    'reading.arabicNote':
      'عنوان الدورة واسم الدرس واسم المعلّم والاسم المكتوب على الشهادة تُعرض بالخط الذي كُتبت به، وباتجاه القراءة الذي تطلبه الكلمات نفسها. وتُخبَر قارئات الشاشة بالمقاطع العربية كي تبدّل الصوت.',
    'reading.mixed': 'الاسم المختلط يبقى اسمًا واحدًا.',
    'reading.mixedNote':
      'العنوان المكتوب بخطّين لا يُفرض عليه اتجاه واحد: كل جزء يُعرض بخطّه، ويضمّهما المتصفّح بالترتيب الذي ينطقهما به القارئ.',
    'reading.langHeading': 'اللغة',
    'reading.offered': 'الواجهة مترجمة، وهي تذكر مدى اكتمال ترجمتها.',
    'reading.offeredNote':
      'عدد اللغات المعروضة غير الإنجليزية: {count}. وتذكر صفحة اللغة لكل واحدة منها مقدار ما تُرجم منها فعلًا. وحيث لم تُكتب شاشة بلغتك تُعرض بالإنجليزية كاملةً، لا جملًا إنجليزية بين جمل مترجمة. أما شاشات التدريس والموظفين وبعض صفحات الحساب والعائلة والدفع فلم تُهيَّأ للترجمة بعد، وهي بالإنجليزية للجميع. وتبقى عناوين الدورات والدروس والتعليقات باللغة التي كتبها بها صاحبها.',
    'reading.rtl': 'اللغات المكتوبة من اليمين إلى اليسار تقلب الصفحة كلها.',
    'reading.rtlNote':
      'الدورة المكتوبة من اليمين إلى اليسار تحتفظ باتجاهها إذا عُرضت داخل واجهة من اليسار إلى اليمين. واختيار إحدى هذه اللغات يعكس الشريط العلوي والتنقّل والإشعارات والتذييل: {languages}.',
    'reading.browser': 'اختيار اللغة يُحفظ على هذا المتصفّح لا في حسابك.',
    'reading.browserNote':
      'تُقرأ اللغة قبل أن يسجّل أحد دخوله، فيحصل الشخص نفسه على جهاز آخر على لغة ذلك الجهاز إلى أن يغيّرها هناك أيضًا.',
    'reading.unreviewed': 'لم يقرأ أي ترجمة بعدُ متحدث أصلي بلغتها.',
    'reading.unreviewedNote':
      'كتبها من بنوا المنصة. وإن بدت لك كلمة خطأ فذلك خطؤنا نحن، وصفحة اللغة تقول ذلك عن كل لغة تعرضها.',
    'reading.missingHeading': 'ما ليس متوفرًا هنا بعد',
    'reading.back': 'العودة إلى حسابي',
  },
  ur: {
    'reading.title': 'یہ کیسا دکھتا ہے',
    'reading.crumb': 'پڑھائی',
    'reading.lede':
      'چار ترتیبات، جو چنتے ہی لاگو ہو جاتی ہیں۔ یہ اسی براؤزر کی ہیں، آپ کے اکاؤنٹ کی نہیں: فون اور لیپ ٹاپ کو الگ الگ سائز چاہیے، اور مشترکہ ڈیوائس کو کسی اور کا انتخاب ورثے میں نہیں ملنا چاہیے۔ انہیں استعمال کرنے کے لیے سائن اِن ہونا ضروری نہیں۔',
    'reading.now': 'اس براؤزر میں یہ ترتیبات ہیں۔',
    'reading.saved': 'اس براؤزر کے لیے محفوظ ہو گیا۔',
    'reading.notKept':
      'اس براؤزر نے ترتیب محفوظ نہیں کی۔ یہ صرف اسی صفحے پر لاگو ہے اور اگلے صفحے پر نہیں رہے گی۔',
    'reading.textLegend': 'متن کا سائز',
    'reading.textNormal': 'عام',
    'reading.textNormalNote': 'وہ سائز جو باقی پلیٹ فارم استعمال کرتا ہے۔',
    'reading.textLarge': 'بڑا',
    'reading.textLargeNote': 'ایک درجہ بڑا، سرخیوں اور عام متن دونوں کے لیے۔',
    'reading.textLargest': 'سب سے بڑا',
    'reading.textLargestNote':
      'دو درجے بڑا۔ ساتھ ساتھ رکھی قطاریں اوپر نیچے ہو جاتی ہیں تاکہ الفاظ نہ بھنچیں۔',
    'reading.contrastLegend': 'تضاد',
    'reading.contrastNormal': 'عام',
    'reading.contrastNormalNote': 'سفید اور سبز، جیسا پلیٹ فارم ڈیزائن کیا گیا تھا۔',
    'reading.contrastHigh': 'زیادہ واضح حاشیے',
    'reading.contrastHighNote':
      'ثانوی متن زیادہ گہرا، حاشیے زیادہ گہرے، سادہ سفید پس منظر، اور کی بورڈ جس چیز پر ہو اس کے گرد موٹا خاکہ۔ تیز روشنی میں اور مدھم اسکرین پر کارآمد۔',
    'reading.motionLegend': 'حرکت',
    'reading.motionSystem': 'میرے ڈیوائس کے مطابق',
    'reading.motionSystemNote':
      'اگر آپ کا ڈیوائس کم حرکت مانگتا ہے تو پلیٹ فارم پہلے ہی اس کی بات مانتا ہے۔',
    'reading.motionReduce': 'ہمیشہ حرکت کم رکھیں',
    'reading.motionReduceNote': 'ٹرانزیشن اور متحرک اسکرولنگ بند کر دیتا ہے، چاہے ڈیوائس نہ مانگے۔',
    'reading.reset': 'طے شدہ ترتیبات پر واپس',
    'reading.trueHeading': 'کچھ ترتیب دیے بغیر جو پہلے ہی درست ہے',
    'reading.keyboard': 'کی بورڈ کام کرتا ہے۔',
    'reading.keyboardNote':
      'کی بورڈ جس چیز پر ہو اس کے گرد نظر آنے والا خاکہ ہوتا ہے، اور ہر صفحے کا پہلا پڑاؤ ایک لنک ہے جو سیدھا مواد پر لے جاتا ہے۔ جس کنٹرول تک صرف ماؤس یا انگلی سے پہنچا جا سکے وہ ایک خرابی ہے، اور ہم اس کے بارے میں جاننا چاہتے ہیں۔',
    'reading.device': 'آپ کے ڈیوائس کی اپنی ترتیبات کا لحاظ رکھا جاتا ہے۔',
    'reading.deviceNote':
      'اگر آپ کا ڈیوائس کم حرکت مانگتا ہے تو پلیٹ فارم اسے کم کر دیتا ہے؛ اوپر والی ترتیب اس ڈیوائس کے لیے ہے جو نہیں مانگتا۔ انٹرفیس بھی اسی زبان میں کھلتا ہے جو آپ کا ڈیوائس مانگتا ہے، جب وہ زبان پیش کی جاتی ہو۔',
    'reading.colours': 'متن کے رنگ ناپے جاتے ہیں۔',
    'reading.coloursNote':
      'عام ڈیزائن کے متن اور پس منظر کے بنیادی رنگ، پلیٹ فارم میں ہر تبدیلی پر ایک خودکار ٹیسٹ کے ذریعے، اس تضاد کے مقابل جانچے جاتے ہیں جو رسائی کی بین الاقوامی ہدایات عام متن کے لیے مانگتی ہیں۔',
    'reading.names': 'فارموں پر نام ہوتے ہیں۔',
    'reading.namesNote':
      'اِن پٹ خانے ایسے لیبل کے ساتھ بنائے گئے ہیں جسے اسکرین ریڈر پڑھ کر سنا سکے، اور چوڑی جدول صفحے کو ایک طرف دھکیلنے کے بجائے اپنے ہی فریم میں اسکرول ہوتی ہے۔',
    'reading.arabic': 'عربی، عربی ہی کی طرح دکھائی جاتی ہے۔',
    'reading.arabicNote':
      'کورس کا عنوان، سبق کا نام، استاد کا نام اور سرٹیفکیٹ پر لکھا نام اسی رسم الخط میں دکھائے جاتے ہیں جس میں لکھے گئے تھے، اور اسی سمت میں جو الفاظ خود مانگتے ہیں۔ اسکرین ریڈروں کو بتایا جاتا ہے کہ کون سے حصے عربی ہیں، تاکہ وہ آواز بدل سکیں۔',
    'reading.mixed': 'ملا جلا نام بھی ایک ہی نام رہتا ہے۔',
    'reading.mixedNote':
      'دو رسم الخط والا عنوان ایک سمت میں زبردستی نہیں رکھا جاتا: ہر حصہ اپنے رسم الخط میں دکھایا جاتا ہے، اور براؤزر انہیں اسی ترتیب سے جوڑتا ہے جس میں پڑھنے والا انہیں بولے گا۔',
    'reading.langHeading': 'زبان',
    'reading.offered': 'انٹرفیس ترجمہ شدہ ہے، اور یہ بتاتا ہے کہ کتنا مکمل ہے۔',
    'reading.offeredNote':
      'انگریزی کے علاوہ پیش کی جانے والی زبانوں کی تعداد: {count}۔ زبان کا صفحہ ہر ایک کے بارے میں بتاتا ہے کہ اس کا کتنا حصہ واقعی ترجمہ ہو چکا ہے۔ جہاں کوئی اسکرین آپ کی زبان میں نہیں لکھی گئی وہاں وہ پوری کی پوری انگریزی میں دکھائی جاتی ہے، نہ کہ ترجمہ شدہ جملوں کے بیچ انگریزی جملے۔ تدریس اور عملے کی اسکرینیں اور اکاؤنٹ، خاندان اور ادائیگی کے کچھ صفحات ابھی ترجمے کے لیے تیار نہیں کیے گئے اور سب کے لیے انگریزی میں ہیں۔ کورسوں کے عنوان، اسباق اور تبصرے اسی زبان میں رہتے ہیں جس میں ان کے لکھنے والے نے لکھے۔',
    'reading.rtl': 'دائیں سے بائیں لکھی جانے والی زبانیں پورا صفحہ پلٹ دیتی ہیں۔',
    'reading.rtlNote':
      'دائیں سے بائیں والا کورس جب بائیں سے دائیں والے انٹرفیس میں دکھایا جائے تو اپنی سمت برقرار رکھتا ہے۔ ان زبانوں میں سے کسی ایک کا انتخاب اوپری پٹی، نیویگیشن، اطلاعات اور فوٹر کو الٹ دیتا ہے: {languages}۔',
    'reading.browser': 'زبان کا انتخاب اس براؤزر پر محفوظ ہوتا ہے، آپ کے اکاؤنٹ میں نہیں۔',
    'reading.browserNote':
      'زبان کسی کے سائن اِن ہونے سے پہلے پڑھی جاتی ہے، اس لیے وہی شخص دوسرے ڈیوائس پر اُس ڈیوائس کی زبان پاتا ہے جب تک وہاں بھی اسے بدل نہ دے۔',
    'reading.unreviewed': 'ابھی تک کوئی ترجمہ کسی مادری زبان بولنے والے نے نہیں پڑھا۔',
    'reading.unreviewedNote':
      'یہ پلیٹ فارم بنانے والوں نے لکھے ہیں۔ اگر کوئی لفظ آپ کو غلط لگے تو وہ ہماری غلطی ہے، اور زبان کا صفحہ اپنی پیش کردہ ہر زبان کے بارے میں یہی کہتا ہے۔',
    'reading.missingHeading': 'جو ابھی یہاں نہیں ہے',
    'reading.back': 'میرے اکاؤنٹ پر واپس',
  },
  fa: {
    'reading.title': 'شیوهٔ نمایش',
    'reading.crumb': 'خواندن',
    'reading.lede':
      'چهار تنظیم که همان لحظهٔ انتخاب اعمال می‌شوند. این تنظیم‌ها به همین مرورگر تعلق دارند، نه به حساب شما: تلفن و لپ‌تاپ اندازه‌های متفاوتی می‌خواهند و دستگاه مشترک نباید انتخاب کس دیگری را به ارث ببرد. برای استفاده از آن‌ها لازم نیست وارد حساب شده باشید.',
    'reading.now': 'تنظیم‌های این مرورگر این‌ها هستند.',
    'reading.saved': 'برای این مرورگر ذخیره شد.',
    'reading.notKept':
      'این مرورگر تنظیم را نگه نداشت. فقط در همین صفحه اعمال می‌شود و در صفحهٔ بعد از بین می‌رود.',
    'reading.textLegend': 'اندازهٔ متن',
    'reading.textNormal': 'معمولی',
    'reading.textNormalNote': 'اندازه‌ای که بقیهٔ سکو به کار می‌برد.',
    'reading.textLarge': 'بزرگ‌تر',
    'reading.textLargeNote': 'یک پله بزرگ‌تر، برای عنوان‌ها و متن اصلی با هم.',
    'reading.textLargest': 'بزرگ‌ترین',
    'reading.textLargestNote':
      'دو پله بزرگ‌تر. ردیف‌های کنار هم زیر هم قرار می‌گیرند تا واژه‌ها فشرده نشوند.',
    'reading.contrastLegend': 'تضاد رنگ',
    'reading.contrastNormal': 'معمولی',
    'reading.contrastNormalNote': 'سفید و سبز، همان‌گونه که سکو طراحی شده است.',
    'reading.contrastHigh': 'خط‌های پررنگ‌تر',
    'reading.contrastHighNote':
      'متن فرعی تیره‌تر، حاشیه‌های تیره‌تر، زمینهٔ سفید ساده و خط دور ضخیم‌تر پیرامون هر چیزی که صفحه‌کلید روی آن است. در نور زیاد و روی صفحهٔ کم‌نور به کار می‌آید.',
    'reading.motionLegend': 'حرکت',
    'reading.motionSystem': 'پیروی از دستگاه من',
    'reading.motionSystemNote': 'اگر دستگاهتان حرکت کمتر بخواهد، سکو از پیش به آن گوش می‌دهد.',
    'reading.motionReduce': 'حرکت همیشه کم شود',
    'reading.motionReduceNote':
      'گذارها و پیمایش متحرک را خاموش می‌کند، حتی وقتی دستگاه چنین نخواهد.',
    'reading.reset': 'بازگشت به پیش‌فرض‌ها',
    'reading.trueHeading': 'آنچه بدون هیچ تنظیمی از پیش برقرار است',
    'reading.keyboard': 'صفحه‌کلید کار می‌کند.',
    'reading.keyboardNote':
      'هر چیزی که صفحه‌کلید روی آن است خط دور آشکاری دارد، و نخستین ایستگاه هر صفحه پیوندی است که به محتوا می‌پرد. کنترلی که فقط با ماوس یا انگشت بتوان به آن رسید یک نقص است و می‌خواهیم از آن باخبر شویم.',
    'reading.device': 'تنظیم‌های خود دستگاه شما رعایت می‌شود.',
    'reading.deviceNote':
      'اگر دستگاهتان حرکت کمتر بخواهد، سکو آن را کم می‌کند؛ تنظیم بالا برای دستگاهی است که چنین نمی‌خواهد. رابط کاربری نیز به زبانی باز می‌شود که دستگاهتان می‌خواهد، به شرط آنکه آن زبان عرضه شده باشد.',
    'reading.colours': 'رنگ‌های متن اندازه‌گیری می‌شوند.',
    'reading.coloursNote':
      'رنگ‌های اصلی متن و زمینه در طرح معمولی را آزمونی خودکار با هر تغییر سکو می‌سنجد، در برابر تضادی که رهنمودهای بین‌المللی دسترس‌پذیری برای متن معمولی می‌خواهند.',
    'reading.names': 'فرم‌ها نام دارند.',
    'reading.namesNote':
      'خانه‌های ورودی با برچسبی ساخته شده‌اند که صفحه‌خوان می‌تواند آن را بخواند، و جدول پهن به‌جای آنکه صفحه را به کنار براند درون قاب خودش پیمایش می‌شود.',
    'reading.arabic': 'عربی به‌صورت عربی نمایش داده می‌شود.',
    'reading.arabicNote':
      'عنوان دوره، نام درس، نام آموزگار و نام روی گواهی با همان خطی نمایش داده می‌شوند که نوشته شده‌اند و با همان جهت خواندنی که خود واژه‌ها می‌خواهند. به صفحه‌خوان‌ها گفته می‌شود کدام بخش‌ها عربی است تا بتوانند صدا را عوض کنند.',
    'reading.mixed': 'نام آمیخته همچنان یک نام است.',
    'reading.mixedNote':
      'عنوانی که با دو خط نوشته شده به یک جهت واداشته نمی‌شود: هر بخش با خط خودش نمایش داده می‌شود و مرورگر آن‌ها را به همان ترتیبی کنار هم می‌گذارد که خواننده بر زبان می‌آورد.',
    'reading.langHeading': 'زبان',
    'reading.offered': 'رابط کاربری ترجمه شده است و می‌گوید تا چه اندازه کامل است.',
    'reading.offeredNote':
      'شمار زبان‌های عرضه‌شده جز انگلیسی: {count}. صفحهٔ زبان برای هر یک می‌گوید چه مقدار از آن واقعاً ترجمه شده است. جایی که صفحه‌ای به زبان شما نوشته نشده باشد، آن صفحه یکجا به انگلیسی نمایش داده می‌شود، نه جمله‌های انگلیسی در میان جمله‌های ترجمه‌شده. صفحه‌های آموزگاران و کارکنان و برخی صفحه‌های حساب، خانواده و پرداخت هنوز برای ترجمه آماده نشده‌اند و برای همه به انگلیسی‌اند. عنوان دوره‌ها، درس‌ها و دیدگاه‌ها به همان زبانی می‌مانند که نویسنده‌شان نوشته است.',
    'reading.rtl': 'زبان‌های راست‌به‌چپ کل صفحه را برمی‌گردانند.',
    'reading.rtlNote':
      'دورهٔ راست‌به‌چپ وقتی درون رابطی چپ‌به‌راست نمایش داده شود جهت خودش را نگه می‌دارد. انتخاب یکی از این زبان‌ها نوار بالا، ناوبری، اعلان‌ها و پانویس را قرینه می‌کند: {languages}.',
    'reading.browser': 'انتخاب زبان در همین مرورگر نگه داشته می‌شود، نه در حساب شما.',
    'reading.browserNote':
      'زبان پیش از ورود هر کسی خوانده می‌شود؛ پس همان شخص در دستگاهی دیگر زبان آن دستگاه را می‌بیند تا آنجا هم آن را عوض کند.',
    'reading.unreviewed': 'هنوز هیچ ترجمه‌ای را گویشور بومی آن زبان نخوانده است.',
    'reading.unreviewedNote':
      'این ترجمه‌ها را سازندگان این سکو نوشته‌اند. اگر واژه‌ای به نظرتان نادرست آمد، آن اشتباه از ماست، و صفحهٔ زبان همین را دربارهٔ هر زبانی که عرضه می‌کند می‌گوید.',
    'reading.missingHeading': 'آنچه هنوز اینجا نیست',
    'reading.back': 'بازگشت به حساب من',
  },
  'fa-af': {
    'reading.title': 'طرز نمایش',
    'reading.crumb': 'خواندن',
    'reading.lede':
      'چهار تنظیم که همان لحظهٔ انتخاب عملی می‌شوند. این تنظیم‌ها مربوط به همین مرورگر است، نه به حساب شما: تلفون و لپ‌تاپ اندازه‌های متفاوت می‌خواهند و وسیلهٔ مشترک نباید انتخاب کس دیگری را به ارث ببرد. برای استفاده از آن‌ها لازم نیست وارد حساب شده باشید.',
    'reading.now': 'تنظیم‌های این مرورگر همین‌ها است.',
    'reading.saved': 'برای این مرورگر ذخیره شد.',
    'reading.notKept':
      'این مرورگر تنظیم را نگه نداشت. تنها در همین صفحه عملی می‌شود و در صفحهٔ بعدی از بین می‌رود.',
    'reading.textLegend': 'اندازهٔ متن',
    'reading.textNormal': 'عادی',
    'reading.textNormalNote': 'اندازه‌ای که باقی سامانه به کار می‌برد.',
    'reading.textLarge': 'کلان‌تر',
    'reading.textLargeNote': 'یک درجه کلان‌تر، برای عنوان‌ها و متن اصلی یکجا.',
    'reading.textLargest': 'کلان‌ترین',
    'reading.textLargestNote':
      'دو درجه کلان‌تر. ردیف‌های پهلوبه‌پهلو زیر هم قرار می‌گیرند تا کلمه‌ها فشرده نشوند.',
    'reading.contrastLegend': 'تضاد رنگ',
    'reading.contrastNormal': 'عادی',
    'reading.contrastNormalNote': 'سفید و سبز، همان‌گونه که سامانه طراحی شده است.',
    'reading.contrastHigh': 'خط‌های پررنگ‌تر',
    'reading.contrastHighNote':
      'متن فرعی تیره‌تر، حاشیه‌های تیره‌تر، زمینهٔ سفید ساده و خط دور ضخیم‌تر در اطراف هر چیزی که صفحه‌کلید روی آن است. در روشنی زیاد و روی صفحهٔ کم‌نور به کار می‌آید.',
    'reading.motionLegend': 'حرکت',
    'reading.motionSystem': 'پیروی از وسیلهٔ من',
    'reading.motionSystemNote': 'اگر وسیلهٔ شما حرکت کمتر بخواهد، سامانه از پیش به آن گوش می‌دهد.',
    'reading.motionReduce': 'حرکت همیشه کم شود',
    'reading.motionReduceNote':
      'گذارها و پیمایش متحرک را خاموش می‌کند، حتی وقتی وسیله چنین نخواهد.',
    'reading.reset': 'برگشت به پیش‌فرض‌ها',
    'reading.trueHeading': 'آنچه بدون هیچ تنظیمی از پیش برقرار است',
    'reading.keyboard': 'صفحه‌کلید کار می‌کند.',
    'reading.keyboardNote':
      'هر چیزی که صفحه‌کلید روی آن است خط دور آشکار دارد، و نخستین ایستگاه هر صفحه پیوندی است که به محتوا می‌پرد. کنترولی که تنها با موس یا انگشت بتوان به آن رسید یک نقص است و می‌خواهیم از آن باخبر شویم.',
    'reading.device': 'تنظیم‌های خود وسیلهٔ شما رعایت می‌شود.',
    'reading.deviceNote':
      'اگر وسیلهٔ شما حرکت کمتر بخواهد، سامانه آن را کم می‌کند؛ تنظیم بالا برای وسیله‌ای است که چنین نمی‌خواهد. رابط کاربری نیز به زبانی باز می‌شود که وسیلهٔ شما می‌خواهد، به شرطی که آن زبان عرضه شده باشد.',
    'reading.colours': 'رنگ‌های متن اندازه‌گیری می‌شوند.',
    'reading.coloursNote':
      'رنگ‌های اصلی متن و زمینه در طرح عادی را یک آزمایش خودکار با هر تغییر سامانه می‌سنجد، در برابر تضادی که رهنمودهای بین‌المللی دسترس‌پذیری برای متن عادی می‌خواهند.',
    'reading.names': 'فورمه‌ها نام دارند.',
    'reading.namesNote':
      'خانه‌های ورودی با برچسبی ساخته شده‌اند که صفحه‌خوان می‌تواند آن را بخواند، و جدول پهن به‌جای آنکه صفحه را به یک طرف براند در داخل چوکات خودش پیمایش می‌شود.',
    'reading.arabic': 'عربی به‌گونهٔ عربی نمایش داده می‌شود.',
    'reading.arabicNote':
      'عنوان دوره، نام درس، نام آموزگار و نام روی تصدیق‌نامه با همان خطی نمایش داده می‌شوند که نوشته شده‌اند و با همان جهت خواندنی که خود کلمه‌ها می‌خواهند. به صفحه‌خوان‌ها گفته می‌شود کدام بخش‌ها عربی است تا بتوانند صدا را تغییر دهند.',
    'reading.mixed': 'نام آمیخته همچنان یک نام است.',
    'reading.mixedNote':
      'عنوانی که با دو خط نوشته شده به یک جهت مجبور نمی‌شود: هر بخش با خط خودش نمایش داده می‌شود و مرورگر آن‌ها را به همان ترتیبی پهلوی هم می‌گذارد که خواننده بر زبان می‌آورد.',
    'reading.langHeading': 'زبان',
    'reading.offered': 'رابط کاربری ترجمه شده است و می‌گوید تا چه اندازه کامل است.',
    'reading.offeredNote':
      'شمار زبان‌های عرضه‌شده به‌جز انگلیسی: {count}. صفحهٔ زبان برای هر کدام می‌گوید چه مقدار آن واقعاً ترجمه شده است. جایی که صفحه‌ای به زبان شما نوشته نشده باشد، آن صفحه یکجا به انگلیسی نمایش داده می‌شود، نه جمله‌های انگلیسی در میان جمله‌های ترجمه‌شده. صفحه‌های آموزگاران و کارمندان و بعضی صفحه‌های حساب، خانواده و پرداخت هنوز برای ترجمه آماده نشده‌اند و برای همه به انگلیسی‌اند. عنوان دوره‌ها، درس‌ها و نظرها به همان زبانی می‌مانند که نویسندهٔ‌شان نوشته است.',
    'reading.rtl': 'زبان‌های راست‌به‌چپ تمام صفحه را برمی‌گردانند.',
    'reading.rtlNote':
      'دورهٔ راست‌به‌چپ وقتی در داخل رابط چپ‌به‌راست نمایش داده شود جهت خودش را نگه می‌دارد. انتخاب یکی از این زبان‌ها نوار بالا، ناوبری، اعلان‌ها و پاورقی را قرینه می‌کند: {languages}.',
    'reading.browser': 'انتخاب زبان در همین مرورگر نگه داشته می‌شود، نه در حساب شما.',
    'reading.browserNote':
      'زبان پیش از ورود هر کسی خوانده می‌شود؛ پس همان شخص در وسیلهٔ دیگر زبان همان وسیله را می‌بیند تا آنجا هم آن را تغییر دهد.',
    'reading.unreviewed': 'هنوز هیچ ترجمه‌ای را گویشوری با زبان مادری نخوانده است.',
    'reading.unreviewedNote':
      'این ترجمه‌ها را کسانی نوشته‌اند که سامانه را ساخته‌اند. اگر کلمه‌ای به نظر شما نادرست می‌آید، کوتاهی از ماست، و صفحهٔ زبان همین را دربارهٔ هر زبانی که عرضه می‌کند می‌گوید.',
    'reading.missingHeading': 'آنچه هنوز اینجا نیست',
    'reading.back': 'برگشت به حساب من',
  },
  tr: {
    'reading.title': 'Bu nasıl okunur',
    'reading.crumb': 'Okuma',
    'reading.lede':
      'Seçtiğiniz anda uygulanan dört ayar. Bunlar hesabınıza değil bu tarayıcıya aittir: telefon ile dizüstü bilgisayar farklı boyutlar ister, ortak kullanılan bir cihaz da başkasının seçimini devralmamalıdır. Bunları kullanmak için oturum açmış olmanız gerekmez.',
    'reading.now': 'Bu tarayıcıdaki ayarlar bunlardır.',
    'reading.saved': 'Bu tarayıcı için kaydedildi.',
    'reading.notKept':
      'Bu tarayıcı ayarı saklamadı. Yalnızca bu sayfada geçerlidir ve sonraki sayfada kaybolur.',
    'reading.textLegend': 'Metin boyutu',
    'reading.textNormal': 'Standart',
    'reading.textNormalNote': 'Platformun geri kalanının kullandığı boyut.',
    'reading.textLarge': 'Daha büyük',
    'reading.textLargeNote': 'Bir kademe büyük; başlıklar ve gövde metni birlikte.',
    'reading.textLargest': 'En büyük',
    'reading.textLargestNote':
      'İki kademe büyük. Yan yana duran satırlar alt alta dizilir, böylece sözcükler sıkışmaz.',
    'reading.contrastLegend': 'Karşıtlık',
    'reading.contrastNormal': 'Standart',
    'reading.contrastNormalNote': 'Beyaz ve yeşil; platform böyle tasarlandı.',
    'reading.contrastHigh': 'Daha belirgin çizgiler',
    'reading.contrastHighNote':
      'Daha koyu ikincil metin, daha koyu kenarlıklar, düz beyaz arka plan ve klavyenin üzerinde durduğu öğenin çevresinde daha kalın bir çerçeve. Parlak ışıkta ve soluk ekranda işe yarar.',
    'reading.motionLegend': 'Hareket',
    'reading.motionSystem': 'Cihazıma uy',
    'reading.motionSystemNote':
      'Cihazınız daha az hareket istiyorsa platform bunu zaten dikkate alır.',
    'reading.motionReduce': 'Hareketi her zaman azalt',
    'reading.motionReduceNote': 'Cihaz istemese bile geçişleri ve hareketli kaydırmayı kapatır.',
    'reading.reset': 'Varsayılanlara dön',
    'reading.trueHeading': 'Hiçbir şey ayarlamadan zaten geçerli olanlar',
    'reading.keyboard': 'Klavye çalışır.',
    'reading.keyboardNote':
      'Klavyenin üzerinde durduğu öğenin görünür bir çerçevesi vardır ve her sayfadaki ilk durak içeriğe atlayan bir bağlantıdır. Yalnızca fareyle veya parmakla ulaşılabilen bir denetim bir kusurdur; bunu bilmek isteriz.',
    'reading.device': 'Cihazınızın kendi ayarlarına uyulur.',
    'reading.deviceNote':
      'Cihazınız daha az hareket istiyorsa platform hareketi azaltır; yukarıdaki ayar bunu istemeyen cihazlar içindir. Arayüz de, sunuluyorsa, cihazınızın istediği dilde açılır.',
    'reading.colours': 'Metin renkleri ölçülür.',
    'reading.coloursNote':
      'Normal tasarımın ana metin ve arka plan renkleri, platform her değiştiğinde otomatik bir testle, uluslararası erişilebilirlik yönergelerinin sıradan metin için istediği karşıtlığa göre denetlenir.',
    'reading.names': 'Formların adları vardır.',
    'reading.namesNote':
      'Giriş alanları ekran okuyucunun seslendirebileceği bir etiketle kurulur; geniş bir tablo da sayfayı yana itmek yerine kendi çerçevesi içinde kaydırılır.',
    'reading.arabic': 'Arapça, Arapça olarak dizilir.',
    'reading.arabicNote':
      'Bir kurs başlığı, bir ders adı, bir öğretmenin adı ve sertifikadaki ad, yazıldıkları yazıyla ve sözcüklerin kendilerinin istediği okuma yönüyle dizilir. Ekran okuyuculara hangi bölümlerin Arapça olduğu bildirilir; böylece ses değiştirebilirler.',
    'reading.mixed': 'Karışık bir ad yine tek bir addır.',
    'reading.mixedNote':
      'İki yazıyla yazılmış bir başlık tek bir yöne zorlanmaz: her bölüm kendi yazısıyla dizilir ve tarayıcı bunları okuyanın söyleyeceği sırayla birleştirir.',
    'reading.langHeading': 'Dil',
    'reading.offered': 'Arayüz çevrilmiştir ve ne kadar eksiksiz olduğunu söyler.',
    'reading.offeredNote':
      'İngilizce dışında sunulan dil sayısı: {count}. Dil sayfası her biri için ne kadarının gerçekten çevrildiğini belirtir. Bir ekran dilinizde yazılmamışsa, çevrilmiş cümleler arasında İngilizce cümleler olarak değil, bütünüyle İngilizce gösterilir. Öğretim ve personel ekranları ile bazı hesap, aile ve ödeme sayfaları henüz çeviriye hazırlanmadı ve herkes için İngilizcedir. Kurs başlıkları, dersler ve yorumlar yazarının yazdığı dilde kalır.',
    'reading.rtl': 'Sağdan sola yazılan diller bütün sayfayı çevirir.',
    'reading.rtlNote':
      'Soldan sağa bir arayüz içinde gösterilen sağdan sola bir kurs kendi yönünü korur. Şu dillerden birini seçmek üst çubuğu, gezinmeyi, bildirimleri ve alt bilgiyi ters çevirir: {languages}.',
    'reading.browser': 'Dil seçimi hesabınızda değil bu tarayıcıda saklanır.',
    'reading.browserNote':
      'Dil, kimse oturum açmadan önce okunur; bu yüzden aynı kişi başka bir cihazda, orada da değiştirene kadar o cihazın dilini görür.',
    'reading.unreviewed': 'Hiçbir çeviriyi henüz ana dili konuşuru okumadı.',
    'reading.unreviewedNote':
      'Çevirileri platformu kuranlar yazdı. Bir kelime size yanlış görünüyorsa o hata bizimdir; dil sayfası sunduğu her dil için bunu söyler.',
    'reading.missingHeading': 'Henüz burada olmayanlar',
    'reading.back': 'Hesabıma dön',
  },
  id: {
    'reading.title': 'Tampilan bacaan',
    'reading.crumb': 'Bacaan',
    'reading.lede':
      'Empat pengaturan, diterapkan begitu Anda memilihnya. Pengaturan ini milik peramban ini, bukan akun Anda: ponsel dan laptop memerlukan ukuran yang berbeda, dan perangkat yang dipakai bersama tidak semestinya mewarisi pilihan orang lain. Anda tidak perlu masuk untuk menggunakannya.',
    'reading.now': 'Inilah pengaturan di peramban ini.',
    'reading.saved': 'Disimpan untuk peramban ini.',
    'reading.notKept':
      'Peramban ini tidak mau menyimpan pengaturan tersebut. Pengaturan hanya berlaku di halaman ini dan akan hilang di halaman berikutnya.',
    'reading.textLegend': 'Ukuran teks',
    'reading.textNormal': 'Biasa',
    'reading.textNormalNote': 'Ukuran yang dipakai bagian lain platform.',
    'reading.textLarge': 'Lebih besar',
    'reading.textLargeNote': 'Satu tingkat lebih besar, untuk judul dan teks isi sekaligus.',
    'reading.textLargest': 'Paling besar',
    'reading.textLargestNote':
      'Dua tingkat lebih besar. Baris yang berdampingan disusun bertumpuk agar kata-kata tidak terimpit.',
    'reading.contrastLegend': 'Kontras',
    'reading.contrastNormal': 'Biasa',
    'reading.contrastNormalNote': 'Putih dan hijau, sebagaimana platform ini dirancang.',
    'reading.contrastHigh': 'Garis lebih tegas',
    'reading.contrastHighNote':
      'Teks sekunder lebih gelap, garis tepi lebih gelap, latar putih polos, dan garis luar lebih tebal di sekeliling bagian yang sedang ditempati papan ketik. Berguna di bawah cahaya terang dan pada layar yang redup.',
    'reading.motionLegend': 'Gerakan',
    'reading.motionSystem': 'Ikuti perangkat saya',
    'reading.motionSystemNote':
      'Jika perangkat Anda meminta gerakan dikurangi, platform sudah menurutinya.',
    'reading.motionReduce': 'Selalu kurangi gerakan',
    'reading.motionReduceNote':
      'Mematikan transisi dan pengguliran beranimasi meskipun perangkat tidak memintanya.',
    'reading.reset': 'Kembali ke bawaan',
    'reading.trueHeading': 'Yang sudah berlaku tanpa mengatur apa pun',
    'reading.keyboard': 'Papan ketik berfungsi.',
    'reading.keyboardNote':
      'Bagian yang sedang ditempati papan ketik memiliki garis luar yang terlihat, dan perhentian pertama di setiap halaman adalah tautan yang melompat ke isi. Kontrol yang hanya dapat dijangkau dengan tetikus atau jari adalah cacat, dan kami ingin mengetahuinya.',
    'reading.device': 'Pengaturan perangkat Anda sendiri dihormati.',
    'reading.deviceNote':
      'Jika perangkat Anda meminta gerakan dikurangi, platform menguranginya; pengaturan di atas adalah untuk perangkat yang tidak memintanya. Antarmuka juga dibuka dalam bahasa yang diminta perangkat Anda, apabila bahasa itu ditawarkan.',
    'reading.colours': 'Warna teks diukur.',
    'reading.coloursNote':
      'Warna utama teks dan latar pada rancangan normal diperiksa oleh uji otomatis setiap kali platform berubah, terhadap kontras yang diminta pedoman aksesibilitas internasional untuk teks biasa.',
    'reading.names': 'Formulir memiliki nama.',
    'reading.namesNote':
      'Kolom isian dibuat dengan label yang dapat dibacakan pembaca layar, dan tabel yang lebar digulir di dalam bingkainya sendiri alih-alih mendorong halaman ke samping.',
    'reading.arabic': 'Bahasa Arab ditata sebagai bahasa Arab.',
    'reading.arabicNote':
      'Judul kursus, nama pelajaran, nama pengajar, dan nama pada sertifikat ditata dalam aksara aslinya, dengan arah baca yang diminta kata-kata itu sendiri. Pembaca layar diberi tahu bagian mana yang berbahasa Arab sehingga dapat berganti suara.',
    'reading.mixed': 'Nama campuran tetap satu nama.',
    'reading.mixedNote':
      'Judul dalam dua aksara tidak dipaksa ke satu arah: tiap bagian ditata dalam aksaranya sendiri, dan peramban menggabungkannya menurut urutan pembaca mengucapkannya.',
    'reading.langHeading': 'Bahasa',
    'reading.offered': 'Antarmuka diterjemahkan, dan menyebutkan seberapa lengkap.',
    'reading.offeredNote':
      'Jumlah bahasa yang ditawarkan selain bahasa Inggris: {count}. Halaman bahasa menyebutkan untuk masing-masing seberapa banyak yang benar-benar sudah diterjemahkan. Bila suatu layar belum ditulis dalam bahasa Anda, layar itu ditampilkan dalam bahasa Inggris seutuhnya, bukan sebagai kalimat Inggris di antara kalimat terjemahan. Layar pengajaran dan staf serta sebagian halaman akun, keluarga, dan pembayaran belum disiapkan untuk penerjemahan dan berbahasa Inggris bagi semua orang. Judul kursus, pelajaran, dan komentar tetap dalam bahasa yang dipakai penulisnya.',
    'reading.rtl': 'Bahasa kanan-ke-kiri membalik seluruh halaman.',
    'reading.rtlNote':
      'Kursus kanan-ke-kiri yang ditampilkan di dalam antarmuka kiri-ke-kanan mempertahankan arahnya sendiri. Memilih salah satu bahasa berikut mencerminkan bilah atas, navigasi, pemberitahuan, dan kaki halaman: {languages}.',
    'reading.browser': 'Pilihan bahasa disimpan di peramban ini, bukan di akun Anda.',
    'reading.browserNote':
      'Bahasa dibaca sebelum siapa pun masuk, sehingga orang yang sama di perangkat lain mendapat bahasa perangkat itu sampai ia mengubahnya di sana juga.',
    'reading.unreviewed': 'Belum ada terjemahan yang dibaca oleh penutur asli.',
    'reading.unreviewedNote':
      'Terjemahan ditulis oleh orang-orang yang membangun platform. Bila ada kata yang tampak keliru bagi Anda, itu kesalahan kami, dan halaman bahasa mengatakannya untuk setiap bahasa yang ditawarkannya.',
    'reading.missingHeading': 'Yang belum ada di sini',
    'reading.back': 'Kembali ke akun saya',
  },
  ms: {
    'reading.title': 'Cara paparan dibaca',
    'reading.crumb': 'Bacaan',
    'reading.lede':
      'Empat tetapan, digunakan sebaik sahaja anda memilihnya. Tetapan ini milik pelayar ini, bukan akaun anda: telefon dan komputer riba memerlukan saiz yang berbeza, dan peranti yang dikongsi tidak sepatutnya mewarisi pilihan orang lain. Anda tidak perlu log masuk untuk menggunakannya.',
    'reading.now': 'Inilah tetapan pada pelayar ini.',
    'reading.saved': 'Disimpan untuk pelayar ini.',
    'reading.notKept':
      'Pelayar ini tidak mahu menyimpan tetapan tersebut. Ia hanya berkuat kuasa pada halaman ini dan akan hilang pada halaman seterusnya.',
    'reading.textLegend': 'Saiz teks',
    'reading.textNormal': 'Biasa',
    'reading.textNormalNote': 'Saiz yang digunakan oleh bahagian lain platform.',
    'reading.textLarge': 'Lebih besar',
    'reading.textLargeNote': 'Satu tahap lebih besar, untuk tajuk dan teks isi sekali gus.',
    'reading.textLargest': 'Paling besar',
    'reading.textLargestNote':
      'Dua tahap lebih besar. Baris yang bersebelahan disusun bertindan supaya perkataan tidak terhimpit.',
    'reading.contrastLegend': 'Kontras',
    'reading.contrastNormal': 'Biasa',
    'reading.contrastNormalNote': 'Putih dan hijau, sebagaimana platform ini direka.',
    'reading.contrastHigh': 'Garisan lebih jelas',
    'reading.contrastHighNote':
      'Teks sekunder lebih gelap, sempadan lebih gelap, latar putih kosong dan garis luar lebih tebal di sekeliling bahagian yang sedang ditumpukan papan kekunci. Berguna dalam cahaya terang dan pada skrin yang malap.',
    'reading.motionLegend': 'Gerakan',
    'reading.motionSystem': 'Ikut peranti saya',
    'reading.motionSystemNote':
      'Jika peranti anda meminta gerakan dikurangkan, platform sudah pun menurutinya.',
    'reading.motionReduce': 'Sentiasa kurangkan gerakan',
    'reading.motionReduceNote':
      'Mematikan peralihan dan tatalan beranimasi walaupun peranti tidak memintanya.',
    'reading.reset': 'Kembali kepada tetapan asal',
    'reading.trueHeading': 'Perkara yang sudah berlaku tanpa menetapkan apa-apa',
    'reading.keyboard': 'Papan kekunci berfungsi.',
    'reading.keyboardNote':
      'Bahagian yang sedang ditumpukan papan kekunci mempunyai garis luar yang kelihatan, dan hentian pertama pada setiap halaman ialah pautan yang melangkau ke kandungan. Kawalan yang hanya boleh dicapai dengan tetikus atau jari ialah satu kecacatan, dan kami ingin mengetahuinya.',
    'reading.device': 'Tetapan peranti anda sendiri dihormati.',
    'reading.deviceNote':
      'Jika peranti anda meminta gerakan dikurangkan, platform mengurangkannya; tetapan di atas adalah untuk peranti yang tidak memintanya. Antara muka juga dibuka dalam bahasa yang diminta oleh peranti anda, apabila bahasa itu ditawarkan.',
    'reading.colours': 'Warna teks diukur.',
    'reading.coloursNote':
      'Warna utama teks dan latar dalam reka bentuk biasa disemak oleh ujian automatik setiap kali platform berubah, berbanding kontras yang diminta oleh garis panduan kebolehcapaian antarabangsa untuk teks biasa.',
    'reading.names': 'Borang mempunyai nama.',
    'reading.namesNote':
      'Medan input dibina dengan label yang boleh disebut oleh pembaca skrin, dan jadual yang lebar ditatal di dalam bingkainya sendiri dan tidak menolak halaman ke tepi.',
    'reading.arabic': 'Bahasa Arab diatur sebagai bahasa Arab.',
    'reading.arabicNote':
      'Tajuk kursus, nama pelajaran, nama guru dan nama pada sijil diatur dalam tulisan asalnya, dengan arah bacaan yang diminta oleh perkataan itu sendiri. Pembaca skrin diberitahu bahagian mana yang berbahasa Arab supaya dapat menukar suara.',
    'reading.mixed': 'Nama bercampur tetap satu nama.',
    'reading.mixedNote':
      'Tajuk dalam dua tulisan tidak dipaksa ke satu arah: setiap bahagian diatur dalam tulisannya sendiri, dan pelayar menggabungkannya mengikut urutan pembaca menyebutnya.',
    'reading.langHeading': 'Bahasa',
    'reading.offered': 'Antara muka diterjemah, dan ia menyatakan sejauh mana lengkapnya.',
    'reading.offeredNote':
      'Bilangan bahasa yang ditawarkan selain bahasa Inggeris: {count}. Halaman bahasa menyatakan bagi setiap satu berapa banyak yang benar-benar sudah diterjemah. Jika sesuatu skrin belum ditulis dalam bahasa anda, skrin itu dipaparkan dalam bahasa Inggeris sepenuhnya, bukan sebagai ayat Inggeris di celah ayat terjemahan. Skrin pengajaran dan kakitangan serta sebahagian halaman akaun, keluarga dan pembayaran belum disediakan untuk terjemahan dan berbahasa Inggeris untuk semua orang. Tajuk kursus, pelajaran dan komen kekal dalam bahasa yang ditulis oleh pengarangnya.',
    'reading.rtl': 'Bahasa kanan-ke-kiri membalikkan seluruh halaman.',
    'reading.rtlNote':
      'Kursus kanan-ke-kiri yang dipaparkan dalam antara muka kiri-ke-kanan mengekalkan arahnya sendiri. Memilih salah satu bahasa berikut mencerminkan bar atas, navigasi, notis dan pengaki: {languages}.',
    'reading.browser': 'Pilihan bahasa disimpan pada pelayar ini, bukan pada akaun anda.',
    'reading.browserNote':
      'Bahasa dibaca sebelum sesiapa log masuk, jadi orang yang sama pada peranti lain mendapat bahasa peranti itu sehingga dia menukarnya di sana juga.',
    'reading.unreviewed': 'Belum ada terjemahan yang dibaca oleh penutur jati.',
    'reading.unreviewedNote':
      'Terjemahan ditulis oleh mereka yang membina platform ini. Jika ada perkataan yang kelihatan salah kepada anda, itu kesilapan kami, dan halaman bahasa menyatakannya bagi setiap bahasa yang ditawarkannya.',
    'reading.missingHeading': 'Perkara yang belum ada di sini',
    'reading.back': 'Kembali ke akaun saya',
  },
  bn: {
    'reading.title': 'এটি কেমন দেখায়',
    'reading.crumb': 'পড়া',
    'reading.lede':
      'চারটি সেটিং, বেছে নেওয়ার সঙ্গে সঙ্গে প্রয়োগ হয়। এগুলো এই ব্রাউজারের, আপনার অ্যাকাউন্টের নয়: ফোন আর ল্যাপটপে আলাদা আকার দরকার হয়, আর ভাগাভাগি করা ডিভাইসে অন্য কারও পছন্দ চলে আসা উচিত নয়। এগুলো ব্যবহার করতে সাইন ইন করা লাগে না।',
    'reading.now': 'এই ব্রাউজারে এই সেটিংগুলো আছে।',
    'reading.saved': 'এই ব্রাউজারের জন্য সংরক্ষিত হয়েছে।',
    'reading.notKept':
      'এই ব্রাউজার সেটিংটি রাখেনি। এটি শুধু এই পাতায় প্রযোজ্য এবং পরের পাতায় থাকবে না।',
    'reading.textLegend': 'লেখার আকার',
    'reading.textNormal': 'সাধারণ',
    'reading.textNormalNote': 'প্ল্যাটফর্মের বাকি অংশ যে আকার ব্যবহার করে।',
    'reading.textLarge': 'আরও বড়',
    'reading.textLargeNote': 'এক ধাপ বড়, শিরোনাম ও মূল লেখা একসঙ্গে।',
    'reading.textLargest': 'সবচেয়ে বড়',
    'reading.textLargestNote':
      'দুই ধাপ বড়। পাশাপাশি থাকা সারিগুলো ওপর-নিচে সাজানো হয়, যাতে শব্দ চেপে না যায়।',
    'reading.contrastLegend': 'কনট্রাস্ট',
    'reading.contrastNormal': 'সাধারণ',
    'reading.contrastNormalNote': 'সাদা ও সবুজ, প্ল্যাটফর্মটি যেভাবে নকশা করা হয়েছে।',
    'reading.contrastHigh': 'আরও স্পষ্ট রেখা',
    'reading.contrastHighNote':
      'গৌণ লেখা আরও গাঢ়, সীমারেখা আরও গাঢ়, সাদামাটা সাদা পটভূমি, আর কিবোর্ড যেটির ওপর আছে তার চারপাশে আরও মোটা রেখা। কড়া আলোয় এবং অনুজ্জ্বল পর্দায় কাজে লাগে।',
    'reading.motionLegend': 'গতি',
    'reading.motionSystem': 'আমার ডিভাইস অনুসরণ করুন',
    'reading.motionSystemNote': 'আপনার ডিভাইস কম গতি চাইলে প্ল্যাটফর্ম আগে থেকেই তা মেনে চলে।',
    'reading.motionReduce': 'সব সময় গতি কমান',
    'reading.motionReduceNote': 'ডিভাইস না চাইলেও ট্রানজিশন ও অ্যানিমেটেড স্ক্রলিং বন্ধ করে দেয়।',
    'reading.reset': 'ডিফল্টে ফিরে যান',
    'reading.trueHeading': 'কিছু সেট না করেই যা আগে থেকে সত্য',
    'reading.keyboard': 'কিবোর্ড কাজ করে।',
    'reading.keyboardNote':
      'কিবোর্ড যেটির ওপর আছে তার চারপাশে দৃশ্যমান রেখা থাকে, আর প্রতিটি পাতার প্রথম বিরতি হলো একটি লিংক যা সরাসরি বিষয়বস্তুতে নিয়ে যায়। যে নিয়ন্ত্রণে শুধু মাউস বা আঙুল দিয়ে পৌঁছানো যায় সেটি একটি ত্রুটি, আর আমরা তা জানতে চাই।',
    'reading.device': 'আপনার ডিভাইসের নিজস্ব সেটিং মানা হয়।',
    'reading.deviceNote':
      'আপনার ডিভাইস কম গতি চাইলে প্ল্যাটফর্ম তা কমায়; ওপরের সেটিংটি সেই ডিভাইসের জন্য যা চায় না। ইন্টারফেসও সেই ভাষায় খোলে যা আপনার ডিভাইস চায়, যদি সেই ভাষা দেওয়া থাকে।',
    'reading.colours': 'লেখার রং মাপা হয়।',
    'reading.coloursNote':
      'সাধারণ নকশার লেখা ও পটভূমির প্রধান রংগুলো প্ল্যাটফর্মে প্রতিটি পরিবর্তনের সময় একটি স্বয়ংক্রিয় পরীক্ষায় যাচাই করা হয়, সাধারণ লেখার জন্য আন্তর্জাতিক প্রবেশগম্যতা নির্দেশিকা যে কনট্রাস্ট চায় তার বিপরীতে।',
    'reading.names': 'ফর্মে নাম থাকে।',
    'reading.namesNote':
      'ইনপুট ঘরগুলো এমন লেবেল দিয়ে তৈরি যা স্ক্রিন রিডার পড়ে শোনাতে পারে, আর চওড়া টেবিল পাতাকে পাশে ঠেলে না দিয়ে নিজের ফ্রেমের ভেতরেই স্ক্রল হয়।',
    'reading.arabic': 'আরবি আরবি হিসেবেই সাজানো হয়।',
    'reading.arabicNote':
      'কোর্সের শিরোনাম, পাঠের নাম, শিক্ষকের নাম এবং সনদে লেখা নাম যে লিপিতে লেখা হয়েছিল সেই লিপিতেই দেখানো হয়, শব্দগুলো নিজে যে পড়ার দিক চায় সেই দিকে। স্ক্রিন রিডারকে জানানো হয় কোন অংশগুলো আরবি, যাতে তারা কণ্ঠ বদলাতে পারে।',
    'reading.mixed': 'মিশ্র নামও একটিই নাম।',
    'reading.mixedNote':
      'দুই লিপিতে লেখা শিরোনামকে এক দিকে জোর করা হয় না: প্রতিটি অংশ নিজের লিপিতে সাজানো হয়, আর ব্রাউজার সেগুলোকে সেই ক্রমে জোড়ে যে ক্রমে পাঠক বলবেন।',
    'reading.langHeading': 'ভাষা',
    'reading.offered': 'ইন্টারফেস অনূদিত, এবং কতটা সম্পূর্ণ তা নিজেই বলে।',
    'reading.offeredNote':
      'ইংরেজি ছাড়া যতগুলো ভাষা দেওয়া আছে: {count}। ভাষার পাতা প্রতিটির জন্য বলে তার কতটা সত্যিই অনূদিত হয়েছে। কোনো পর্দা আপনার ভাষায় লেখা না হলে সেটি পুরোটাই ইংরেজিতে দেখানো হয়, অনূদিত বাক্যের মাঝে ইংরেজি বাক্য হিসেবে নয়। শিক্ষাদান ও কর্মীদের পর্দা এবং অ্যাকাউন্ট, পরিবার ও অর্থপ্রদানের কিছু পাতা এখনও অনুবাদের জন্য প্রস্তুত করা হয়নি এবং সবার জন্য ইংরেজিতে আছে। কোর্সের শিরোনাম, পাঠ ও মন্তব্য সেই ভাষাতেই থাকে যে ভাষায় লেখক লিখেছেন।',
    'reading.rtl': 'ডান-থেকে-বাম ভাষা পুরো পাতাটিকে ঘুরিয়ে দেয়।',
    'reading.rtlNote':
      'বাম-থেকে-ডান ইন্টারফেসের ভেতরে দেখানো ডান-থেকে-বাম কোর্স নিজের দিক ধরে রাখে। এই ভাষাগুলোর একটি বেছে নিলে ওপরের বার, নেভিগেশন, বিজ্ঞপ্তি ও ফুটার উল্টে যায়: {languages}।',
    'reading.browser': 'ভাষার পছন্দ এই ব্রাউজারে রাখা হয়, আপনার অ্যাকাউন্টে নয়।',
    'reading.browserNote':
      'কেউ সাইন ইন করার আগেই ভাষা পড়া হয়, তাই একই ব্যক্তি অন্য ডিভাইসে সেই ডিভাইসের ভাষা পান, যতক্ষণ না সেখানেও তা বদলান।',
    'reading.unreviewed': 'এখনও কোনো অনুবাদ কোনো মাতৃভাষী পড়েননি।',
    'reading.unreviewedNote':
      'এগুলো প্ল্যাটফর্মটি যাঁরা তৈরি করেছেন তাঁরাই লিখেছেন। কোনো শব্দ আপনার কাছে ভুল মনে হলে সেই ভুল আমাদের, আর ভাষার পাতা তার দেওয়া প্রতিটি ভাষার জন্য এ কথাই বলে।',
    'reading.missingHeading': 'যা এখনও এখানে নেই',
    'reading.back': 'আমার অ্যাকাউন্টে ফিরে যান',
  },
  hi: {
    'reading.title': 'यह कैसा दिखता है',
    'reading.crumb': 'पढ़ना',
    'reading.lede':
      'चार सेटिंग, जो चुनते ही लागू हो जाती हैं। ये इस ब्राउज़र की हैं, आपके खाते की नहीं: फ़ोन और लैपटॉप को अलग-अलग आकार चाहिए, और साझा डिवाइस को किसी और का चुनाव विरासत में नहीं मिलना चाहिए। इन्हें इस्तेमाल करने के लिए साइन इन होना ज़रूरी नहीं।',
    'reading.now': 'इस ब्राउज़र में ये सेटिंग हैं।',
    'reading.saved': 'इस ब्राउज़र के लिए सहेजा गया।',
    'reading.notKept':
      'इस ब्राउज़र ने सेटिंग नहीं रखी। यह केवल इसी पृष्ठ पर लागू है और अगले पृष्ठ पर नहीं रहेगी।',
    'reading.textLegend': 'पाठ का आकार',
    'reading.textNormal': 'सामान्य',
    'reading.textNormalNote': 'वह आकार जो बाक़ी प्लेटफ़ॉर्म इस्तेमाल करता है।',
    'reading.textLarge': 'बड़ा',
    'reading.textLargeNote': 'एक क़दम बड़ा, शीर्षकों और मुख्य पाठ दोनों के लिए।',
    'reading.textLargest': 'सबसे बड़ा',
    'reading.textLargestNote':
      'दो क़दम बड़ा। साथ-साथ रखी पंक्तियाँ ऊपर-नीचे हो जाती हैं ताकि शब्द न भिंचें।',
    'reading.contrastLegend': 'कंट्रास्ट',
    'reading.contrastNormal': 'सामान्य',
    'reading.contrastNormalNote': 'सफ़ेद और हरा, जैसा प्लेटफ़ॉर्म डिज़ाइन किया गया था।',
    'reading.contrastHigh': 'ज़्यादा स्पष्ट रेखाएँ',
    'reading.contrastHighNote':
      'गौण पाठ ज़्यादा गहरा, किनारे ज़्यादा गहरे, सादी सफ़ेद पृष्ठभूमि, और कीबोर्ड जिस चीज़ पर हो उसके चारों ओर मोटी रेखा। तेज़ रोशनी में और मद्धम स्क्रीन पर काम की।',
    'reading.motionLegend': 'गति',
    'reading.motionSystem': 'मेरे डिवाइस के अनुसार',
    'reading.motionSystemNote':
      'यदि आपका डिवाइस कम गति माँगता है तो प्लेटफ़ॉर्म पहले से उसकी बात मानता है।',
    'reading.motionReduce': 'गति हमेशा कम रखें',
    'reading.motionReduceNote':
      'ट्रांज़िशन और ऐनिमेटेड स्क्रॉलिंग बंद कर देता है, भले ही डिवाइस न माँगे।',
    'reading.reset': 'डिफ़ॉल्ट पर वापस जाएँ',
    'reading.trueHeading': 'जो कुछ सेट किए बिना पहले से सही है',
    'reading.keyboard': 'कीबोर्ड काम करता है।',
    'reading.keyboardNote':
      'कीबोर्ड जिस चीज़ पर हो उसके चारों ओर दिखने वाली रेखा होती है, और हर पृष्ठ का पहला पड़ाव एक लिंक है जो सीधे सामग्री पर ले जाता है। जिस नियंत्रण तक केवल माउस या उँगली से पहुँचा जा सके वह एक ख़राबी है, और हम उसके बारे में जानना चाहते हैं।',
    'reading.device': 'आपके डिवाइस की अपनी सेटिंग का सम्मान किया जाता है।',
    'reading.deviceNote':
      'यदि आपका डिवाइस कम गति माँगता है तो प्लेटफ़ॉर्म उसे कम कर देता है; ऊपर की सेटिंग उस डिवाइस के लिए है जो नहीं माँगता। इंटरफ़ेस भी उसी भाषा में खुलता है जो आपका डिवाइस माँगता है, जब वह भाषा उपलब्ध कराई गई हो।',
    'reading.colours': 'पाठ के रंग मापे जाते हैं।',
    'reading.coloursNote':
      'सामान्य डिज़ाइन के पाठ और पृष्ठभूमि के मुख्य रंग, प्लेटफ़ॉर्म में हर बदलाव पर एक स्वचालित परीक्षण द्वारा, उस कंट्रास्ट के विरुद्ध जाँचे जाते हैं जो सुलभता के अंतरराष्ट्रीय दिशानिर्देश सामान्य पाठ के लिए माँगते हैं।',
    'reading.names': 'फ़ॉर्म पर नाम होते हैं।',
    'reading.namesNote':
      'इनपुट खाने ऐसे लेबल के साथ बनाए गए हैं जिसे स्क्रीन रीडर बोलकर सुना सके, और चौड़ी तालिका पृष्ठ को एक ओर धकेलने के बजाय अपने ही फ़्रेम के भीतर स्क्रॉल होती है।',
    'reading.arabic': 'अरबी, अरबी की तरह ही दिखाई जाती है।',
    'reading.arabicNote':
      'कोर्स का शीर्षक, पाठ का नाम, शिक्षक का नाम और प्रमाणपत्र पर लिखा नाम उसी लिपि में दिखाए जाते हैं जिसमें वे लिखे गए थे, और उसी पढ़ने की दिशा में जो शब्द स्वयं माँगते हैं। स्क्रीन रीडरों को बताया जाता है कि कौन-से अंश अरबी हैं, ताकि वे आवाज़ बदल सकें।',
    'reading.mixed': 'मिला-जुला नाम भी एक ही नाम रहता है।',
    'reading.mixedNote':
      'दो लिपियों वाला शीर्षक एक दिशा में ज़बरदस्ती नहीं रखा जाता: हर हिस्सा अपनी लिपि में दिखाया जाता है, और ब्राउज़र उन्हें उसी क्रम में जोड़ता है जिसमें पाठक उन्हें बोलेगा।',
    'reading.langHeading': 'भाषा',
    'reading.offered': 'इंटरफ़ेस अनूदित है, और यह बताता है कि कितना पूरा है।',
    'reading.offeredNote':
      'अंग्रेज़ी के अलावा उपलब्ध भाषाओं की संख्या: {count}। भाषा पृष्ठ हर एक के बारे में बताता है कि उसका कितना हिस्सा वास्तव में अनूदित है। जहाँ कोई स्क्रीन आपकी भाषा में नहीं लिखी गई है वहाँ वह पूरी की पूरी अंग्रेज़ी में दिखाई जाती है, न कि अनूदित वाक्यों के बीच अंग्रेज़ी वाक्यों के रूप में। शिक्षण और कर्मचारियों की स्क्रीन तथा खाते, परिवार और भुगतान के कुछ पृष्ठ अभी अनुवाद के लिए तैयार नहीं किए गए हैं और सबके लिए अंग्रेज़ी में हैं। कोर्स के शीर्षक, पाठ और टिप्पणियाँ उसी भाषा में रहती हैं जिसमें उनके लेखक ने लिखा।',
    'reading.rtl': 'दाएँ से बाएँ लिखी जाने वाली भाषाएँ पूरे पृष्ठ को पलट देती हैं।',
    'reading.rtlNote':
      'बाएँ से दाएँ वाले इंटरफ़ेस के भीतर दिखाया गया दाएँ से बाएँ वाला कोर्स अपनी दिशा बनाए रखता है। इन भाषाओं में से किसी एक को चुनने पर ऊपरी पट्टी, नेविगेशन, सूचनाएँ और फ़ुटर उलट जाते हैं: {languages}।',
    'reading.browser': 'भाषा का चुनाव इस ब्राउज़र पर रखा जाता है, आपके खाते में नहीं।',
    'reading.browserNote':
      'भाषा किसी के साइन इन होने से पहले पढ़ी जाती है, इसलिए वही व्यक्ति दूसरे डिवाइस पर उस डिवाइस की भाषा पाता है, जब तक वहाँ भी उसे बदल न दे।',
    'reading.unreviewed': 'अभी तक कोई भी अनुवाद किसी मातृभाषी ने नहीं पढ़ा है।',
    'reading.unreviewedNote':
      'इन्हें प्लेटफ़ॉर्म बनाने वालों ने लिखा है। कोई शब्द आपको ग़लत लगे तो वह ग़लती हमारी है, और भाषा पृष्ठ अपनी हर उपलब्ध भाषा के बारे में यही कहता है।',
    'reading.missingHeading': 'जो अभी यहाँ नहीं है',
    'reading.back': 'मेरे खाते पर वापस जाएँ',
  },
  fr: {
    'reading.title': 'Confort de lecture',
    'reading.crumb': 'Lecture',
    'reading.lede':
      'Quatre réglages, appliqués dès que vous les choisissez. Ils appartiennent à ce navigateur, pas à votre compte : un téléphone et un ordinateur portable demandent des tailles différentes, et un appareil partagé ne doit pas hériter du choix de quelqu’un d’autre. Il n’est pas nécessaire d’être connecté pour les utiliser.',
    'reading.now': 'Voici les réglages de ce navigateur.',
    'reading.saved': 'Enregistré pour ce navigateur.',
    'reading.notKept':
      'Ce navigateur n’a pas voulu conserver le réglage. Il s’applique à cette page seulement et aura disparu à la suivante.',
    'reading.textLegend': 'Taille du texte',
    'reading.textNormal': 'Standard',
    'reading.textNormalNote': 'La taille utilisée par le reste de la plateforme.',
    'reading.textLarge': 'Plus grande',
    'reading.textLargeNote': 'Un cran au-dessus, pour les titres et le texte courant ensemble.',
    'reading.textLargest': 'La plus grande',
    'reading.textLargestNote':
      'Deux crans au-dessus. Les rangées placées côte à côte s’empilent, pour que les mots ne soient pas comprimés.',
    'reading.contrastLegend': 'Contraste',
    'reading.contrastNormal': 'Standard',
    'reading.contrastNormalNote': 'Blanc et vert, tel que la plateforme a été conçue.',
    'reading.contrastHigh': 'Contours renforcés',
    'reading.contrastHighNote':
      'Texte secondaire plus foncé, bordures plus foncées, fond blanc uni et contour plus épais autour de l’élément sur lequel se trouve le clavier. Utile en pleine lumière et sur un écran terne.',
    'reading.motionLegend': 'Mouvement',
    'reading.motionSystem': 'Suivre mon appareil',
    'reading.motionSystemNote':
      'Si votre appareil demande moins de mouvement, la plateforme en tient déjà compte.',
    'reading.motionReduce': 'Toujours réduire le mouvement',
    'reading.motionReduceNote':
      'Désactive les transitions et le défilement animé, même quand l’appareil ne le demande pas.',
    'reading.reset': 'Revenir aux réglages par défaut',
    'reading.trueHeading': 'Ce qui est déjà vrai sans rien régler',
    'reading.keyboard': 'Le clavier fonctionne.',
    'reading.keyboardNote':
      'L’élément sur lequel se trouve le clavier a un contour visible, et le premier arrêt de chaque page est un lien qui passe directement au contenu. Une commande que l’on ne peut atteindre qu’à la souris ou au doigt est un défaut, et nous voulons en être informés.',
    'reading.device': 'Les réglages de votre appareil sont respectés.',
    'reading.deviceNote':
      'Si votre appareil demande moins de mouvement, la plateforme le réduit ; le réglage ci-dessus est destiné à un appareil qui ne le demande pas. L’interface s’ouvre aussi dans la langue que demande votre appareil, lorsque cette langue est proposée.',
    'reading.colours': 'Les couleurs du texte sont mesurées.',
    'reading.coloursNote':
      'Les principales couleurs de texte et de fond de l’apparence normale sont vérifiées par un test automatique à chaque modification de la plateforme, par rapport au contraste que les recommandations internationales d’accessibilité demandent pour le texte courant.',
    'reading.names': 'Les formulaires portent des noms.',
    'reading.namesNote':
      'Les champs de saisie sont construits avec une étiquette qu’un lecteur d’écran peut annoncer, et un tableau large défile dans son propre cadre au lieu de pousser la page sur le côté.',
    'reading.arabic': 'L’arabe est composé comme de l’arabe.',
    'reading.arabicNote':
      'Un titre de cours, un nom de leçon, le nom d’un enseignant et le nom figurant sur un certificat sont composés dans l’écriture où ils ont été rédigés, avec le sens de lecture que demandent les mots eux-mêmes. Les lecteurs d’écran sont informés des passages en arabe, afin de pouvoir changer de voix.',
    'reading.mixed': 'Un nom mixte reste un seul nom.',
    'reading.mixedNote':
      'Un titre en deux écritures n’est pas forcé dans un seul sens : chaque partie est composée dans sa propre écriture, et le navigateur les assemble dans l’ordre où un lecteur les dirait.',
    'reading.langHeading': 'Langue',
    'reading.offered': 'L’interface est traduite, et elle dit dans quelle mesure.',
    'reading.offeredNote':
      'Nombre de langues proposées en plus de l’anglais : {count}. La page des langues indique pour chacune quelle part en est réellement traduite. Lorsqu’un écran n’a pas été rédigé dans votre langue, il est affiché en anglais, en entier, plutôt qu’en phrases anglaises mêlées à des phrases traduites. Les écrans d’enseignement et du personnel ainsi que certaines pages du compte, de la famille et du paiement n’ont pas encore été préparés pour la traduction et sont en anglais pour tout le monde. Les titres de cours, les leçons et les commentaires restent dans la langue où leur auteur les a écrits.',
    'reading.rtl': 'Les langues écrites de droite à gauche retournent toute la page.',
    'reading.rtlNote':
      'Un cours de droite à gauche affiché dans une interface de gauche à droite garde son propre sens. Choisir l’une de ces langues inverse la barre supérieure, la navigation, les avis et le pied de page : {languages}.',
    'reading.browser':
      'Le choix de la langue est conservé sur ce navigateur, pas sur votre compte.',
    'reading.browserNote':
      'La langue est lue avant que quiconque se connecte ; la même personne sur un autre appareil obtient donc la langue de cet appareil jusqu’à ce qu’elle la change là aussi.',
    'reading.unreviewed': 'Aucune traduction n’a encore été relue par un locuteur natif.',
    'reading.unreviewedNote':
      'Elles ont été écrites par ceux qui ont construit la plateforme. Si un mot vous paraît faux, c’est notre erreur, et la page des langues le dit pour chaque langue qu’elle propose.',
    'reading.missingHeading': 'Ce qui n’est pas encore ici',
    'reading.back': 'Retour à mon compte',
  },
  es: {
    'reading.title': 'Cómo se lee esto',
    'reading.crumb': 'Lectura',
    'reading.lede':
      'Cuatro ajustes, que se aplican en cuanto los elige. Pertenecen a este navegador, no a su cuenta: un teléfono y un portátil piden tamaños distintos, y un dispositivo compartido no debe heredar la elección de otra persona. No hace falta haber iniciado sesión para usarlos.',
    'reading.now': 'Estos son los ajustes de este navegador.',
    'reading.saved': 'Guardado para este navegador.',
    'reading.notKept':
      'Este navegador no ha querido conservar el ajuste. Se aplica solo a esta página y habrá desaparecido en la siguiente.',
    'reading.textLegend': 'Tamaño del texto',
    'reading.textNormal': 'Estándar',
    'reading.textNormalNote': 'El tamaño que usa el resto de la plataforma.',
    'reading.textLarge': 'Más grande',
    'reading.textLargeNote': 'Un paso más, para los títulos y el texto corriente a la vez.',
    'reading.textLargest': 'El más grande',
    'reading.textLargestNote':
      'Dos pasos más. Las filas que van una al lado de otra se apilan, para que las palabras no queden apretadas.',
    'reading.contrastLegend': 'Contraste',
    'reading.contrastNormal': 'Estándar',
    'reading.contrastNormalNote': 'Blanco y verde, tal como se diseñó la plataforma.',
    'reading.contrastHigh': 'Contornos más marcados',
    'reading.contrastHighNote':
      'Texto secundario más oscuro, bordes más oscuros, fondo blanco liso y un contorno más grueso alrededor del elemento en el que está el teclado. Útil con mucha luz y en una pantalla apagada.',
    'reading.motionLegend': 'Movimiento',
    'reading.motionSystem': 'Seguir mi dispositivo',
    'reading.motionSystemNote':
      'Si su dispositivo pide menos movimiento, la plataforma ya le hace caso.',
    'reading.motionReduce': 'Reducir siempre el movimiento',
    'reading.motionReduceNote':
      'Desactiva las transiciones y el desplazamiento animado aunque el dispositivo no lo pida.',
    'reading.reset': 'Volver a los valores por defecto',
    'reading.trueHeading': 'Lo que ya se cumple sin ajustar nada',
    'reading.keyboard': 'El teclado funciona.',
    'reading.keyboardNote':
      'El elemento en el que está el teclado tiene un contorno visible, y la primera parada de cada página es un enlace que salta al contenido. Un control al que solo se pueda llegar con el ratón o con el dedo es un fallo, y queremos saberlo.',
    'reading.device': 'Se respetan los ajustes de su propio dispositivo.',
    'reading.deviceNote':
      'Si su dispositivo pide menos movimiento, la plataforma lo reduce; el ajuste de arriba es para un dispositivo que no lo pide. La interfaz también se abre en el idioma que pide su dispositivo, cuando ese idioma se ofrece.',
    'reading.colours': 'Los colores del texto se miden.',
    'reading.coloursNote':
      'Los colores principales de texto y de fondo del diseño normal se comprueban con una prueba automática cada vez que la plataforma cambia, frente al contraste que las pautas internacionales de accesibilidad piden para el texto corriente.',
    'reading.names': 'Los formularios llevan nombres.',
    'reading.namesNote':
      'Los campos de entrada se construyen con una etiqueta que un lector de pantalla puede anunciar, y una tabla ancha se desplaza dentro de su propio marco en lugar de empujar la página hacia un lado.',
    'reading.arabic': 'El árabe se compone como árabe.',
    'reading.arabicNote':
      'El título de un curso, el nombre de una lección, el nombre de un docente y el nombre que figura en un certificado se componen en la escritura en que se redactaron, con el sentido de lectura que piden las propias palabras. A los lectores de pantalla se les indica qué pasajes están en árabe, para que puedan cambiar de voz.',
    'reading.mixed': 'Un nombre mixto sigue siendo un solo nombre.',
    'reading.mixedNote':
      'Un título en dos escrituras no se fuerza a un solo sentido: cada parte se compone en su propia escritura, y el navegador las une en el orden en que las diría un lector.',
    'reading.langHeading': 'Idioma',
    'reading.offered': 'La interfaz está traducida, y dice en qué medida.',
    'reading.offeredNote':
      'Número de idiomas que se ofrecen además del inglés: {count}. La página de idiomas indica para cada uno cuánto está realmente traducido. Cuando una pantalla no se ha escrito en su idioma, se muestra en inglés, entera, y no como frases en inglés entre frases traducidas. Las pantallas de enseñanza y del personal y algunas páginas de la cuenta, de la familia y de pago aún no se han preparado para la traducción y están en inglés para todos. Los títulos de los cursos, las lecciones y los comentarios permanecen en el idioma en que los escribió su autor.',
    'reading.rtl':
      'Los idiomas que se escriben de derecha a izquierda dan la vuelta a toda la página.',
    'reading.rtlNote':
      'Un curso de derecha a izquierda mostrado dentro de una interfaz de izquierda a derecha conserva su propio sentido. Elegir uno de estos idiomas invierte la barra superior, la navegación, los avisos y el pie de página: {languages}.',
    'reading.browser': 'La elección del idioma se guarda en este navegador, no en su cuenta.',
    'reading.browserNote':
      'El idioma se lee antes de que nadie inicie sesión, así que la misma persona en otro dispositivo recibe el idioma de ese dispositivo hasta que lo cambie también allí.',
    'reading.unreviewed': 'Ningún hablante nativo ha revisado todavía ninguna traducción.',
    'reading.unreviewedNote':
      'Las escribieron quienes construyeron la plataforma. Si una palabra le parece incorrecta, el error es nuestro, y la página de idiomas lo dice de cada idioma que ofrece.',
    'reading.missingHeading': 'Lo que todavía no está aquí',
    'reading.back': 'Volver a mi cuenta',
  },
  pt: {
    'reading.title': 'Como isto se lê',
    'reading.crumb': 'Leitura',
    'reading.lede':
      'Quatro definições, aplicadas no momento em que as escolhe. Pertencem a este navegador, não à sua conta: um telemóvel e um portátil pedem tamanhos diferentes, e um dispositivo partilhado não deve herdar a escolha de outra pessoa. Não precisa de ter iniciado sessão para as usar.',
    'reading.now': 'Estas são as definições deste navegador.',
    'reading.saved': 'Guardado para este navegador.',
    'reading.notKept':
      'Este navegador não quis guardar a definição. Aplica-se apenas a esta página e terá desaparecido na seguinte.',
    'reading.textLegend': 'Tamanho do texto',
    'reading.textNormal': 'Padrão',
    'reading.textNormalNote': 'O tamanho que o resto da plataforma usa.',
    'reading.textLarge': 'Maior',
    'reading.textLargeNote': 'Um passo acima, para os títulos e o texto corrente em conjunto.',
    'reading.textLargest': 'O maior',
    'reading.textLargestNote':
      'Dois passos acima. As linhas que ficam lado a lado passam a empilhar-se, para que as palavras não fiquem apertadas.',
    'reading.contrastLegend': 'Contraste',
    'reading.contrastNormal': 'Padrão',
    'reading.contrastNormalNote': 'Branco e verde, tal como a plataforma foi desenhada.',
    'reading.contrastHigh': 'Contornos mais fortes',
    'reading.contrastHighNote':
      'Texto secundário mais escuro, limites mais escuros, fundo branco liso e um contorno mais espesso em volta do elemento em que o teclado se encontra. Útil com muita luz e num ecrã esbatido.',
    'reading.motionLegend': 'Movimento',
    'reading.motionSystem': 'Seguir o meu dispositivo',
    'reading.motionSystemNote':
      'Se o seu dispositivo pede menos movimento, a plataforma já lhe obedece.',
    'reading.motionReduce': 'Reduzir sempre o movimento',
    'reading.motionReduceNote':
      'Desliga as transições e o deslocamento animado mesmo quando o dispositivo não o pede.',
    'reading.reset': 'Voltar às predefinições',
    'reading.trueHeading': 'O que já é verdade sem definir nada',
    'reading.keyboard': 'O teclado funciona.',
    'reading.keyboardNote':
      'O elemento em que o teclado se encontra tem um contorno visível, e a primeira paragem de cada página é uma ligação que salta para o conteúdo. Um controlo a que só se chegue com o rato ou com o dedo é uma falha, e queremos saber dela.',
    'reading.device': 'As definições do seu próprio dispositivo são respeitadas.',
    'reading.deviceNote':
      'Se o seu dispositivo pede menos movimento, a plataforma redu-lo; a definição acima é para um dispositivo que não o pede. A interface também abre no idioma que o seu dispositivo pede, quando esse idioma é oferecido.',
    'reading.colours': 'As cores do texto são medidas.',
    'reading.coloursNote':
      'As principais cores de texto e de fundo do desenho normal são verificadas por um teste automático sempre que a plataforma muda, face ao contraste que as diretrizes internacionais de acessibilidade pedem para o texto corrente.',
    'reading.names': 'Os formulários têm nomes.',
    'reading.namesNote':
      'Os campos de entrada são construídos com uma etiqueta que um leitor de ecrã consegue anunciar, e uma tabela larga desloca-se dentro da sua própria moldura em vez de empurrar a página para o lado.',
    'reading.arabic': 'O árabe é composto como árabe.',
    'reading.arabicNote':
      'O título de um curso, o nome de uma lição, o nome de um professor e o nome que consta de um certificado são compostos na escrita em que foram redigidos, com o sentido de leitura que as próprias palavras pedem. Os leitores de ecrã são informados de quais passagens estão em árabe, para poderem mudar de voz.',
    'reading.mixed': 'Um nome misto continua a ser um só nome.',
    'reading.mixedNote':
      'Um título em duas escritas não é forçado a um só sentido: cada parte é composta na sua própria escrita, e o navegador junta-as pela ordem em que um leitor as diria.',
    'reading.langHeading': 'Idioma',
    'reading.offered': 'A interface está traduzida, e diz em que medida.',
    'reading.offeredNote':
      'Número de idiomas oferecidos além do inglês: {count}. A página de idiomas indica para cada um quanto está realmente traduzido. Quando um ecrã não foi escrito no seu idioma, é mostrado em inglês, inteiro, e não como frases em inglês no meio de frases traduzidas. Os ecrãs de ensino e da equipa e algumas páginas da conta, da família e de pagamento ainda não foram preparados para tradução e estão em inglês para todos. Os títulos dos cursos, as lições e os comentários ficam no idioma em que o autor os escreveu.',
    'reading.rtl': 'Os idiomas escritos da direita para a esquerda viram a página inteira.',
    'reading.rtlNote':
      'Um curso da direita para a esquerda mostrado dentro de uma interface da esquerda para a direita mantém o seu próprio sentido. Escolher um destes idiomas inverte a barra superior, a navegação, os avisos e o rodapé: {languages}.',
    'reading.browser': 'A escolha do idioma é guardada neste navegador, não na sua conta.',
    'reading.browserNote':
      'O idioma é lido antes de alguém iniciar sessão, por isso a mesma pessoa noutro dispositivo recebe o idioma desse dispositivo até o mudar lá também.',
    'reading.unreviewed': 'Nenhuma tradução foi ainda revista por um falante nativo.',
    'reading.unreviewedNote':
      'Foram escritas por quem construiu a plataforma. Se alguma palavra lhe parecer errada, o erro é nosso, e a página de idiomas di-lo para cada idioma que oferece.',
    'reading.missingHeading': 'O que ainda não está aqui',
    'reading.back': 'Voltar à minha conta',
  },
  sw: {
    'reading.title': 'Jinsi ukurasa unavyosomeka',
    'reading.crumb': 'Usomaji',
    'reading.lede':
      'Mipangilio minne, inayotumika mara tu unapoichagua. Ni ya kivinjari hiki, si ya akaunti yako: simu na kompyuta ndogo huhitaji ukubwa tofauti, na kifaa kinachotumiwa na watu wengi hakipaswi kurithi chaguo la mtu mwingine. Huhitaji kuwa umeingia ili kuitumia.',
    'reading.now': 'Hii ndiyo mipangilio katika kivinjari hiki.',
    'reading.saved': 'Imehifadhiwa kwa kivinjari hiki.',
    'reading.notKept':
      'Kivinjari hiki hakikuhifadhi mpangilio huo. Unatumika kwenye ukurasa huu pekee na utatoweka kwenye ukurasa unaofuata.',
    'reading.textLegend': 'Ukubwa wa maandishi',
    'reading.textNormal': 'Kawaida',
    'reading.textNormalNote': 'Ukubwa unaotumiwa na sehemu nyingine za jukwaa.',
    'reading.textLarge': 'Kubwa zaidi',
    'reading.textLargeNote': 'Hatua moja juu, kwa vichwa na maandishi ya kawaida pamoja.',
    'reading.textLargest': 'Kubwa kabisa',
    'reading.textLargestNote':
      'Hatua mbili juu. Safu zinazokaa kando kwa kando hupangwa moja juu ya nyingine, ili maneno yasibanwe.',
    'reading.contrastLegend': 'Utofautishaji wa rangi',
    'reading.contrastNormal': 'Kawaida',
    'reading.contrastNormalNote': 'Nyeupe na kijani, kama jukwaa lilivyobuniwa.',
    'reading.contrastHigh': 'Mistari iliyo wazi zaidi',
    'reading.contrastHighNote':
      'Maandishi ya pili meusi zaidi, mipaka meusi zaidi, mandhari nyeupe tupu na mstari mnene zaidi kuzunguka kitu ambacho kibodi iko juu yake. Hufaa kwenye mwanga mkali na kwenye skrini hafifu.',
    'reading.motionLegend': 'Mwendo',
    'reading.motionSystem': 'Fuata kifaa changu',
    'reading.motionSystemNote': 'Kifaa chako kikiomba mwendo mdogo, jukwaa tayari hukisikiliza.',
    'reading.motionReduce': 'Punguza mwendo kila wakati',
    'reading.motionReduceNote':
      'Huzima mabadiliko ya polepole na usogezaji wenye uhuishaji hata kifaa kisipoomba.',
    'reading.reset': 'Rudi kwenye mipangilio ya awali',
    'reading.trueHeading': 'Yaliyo kweli tayari bila kuweka chochote',
    'reading.keyboard': 'Kibodi inafanya kazi.',
    'reading.keyboardNote':
      'Kitu ambacho kibodi iko juu yake kina mstari unaoonekana, na kituo cha kwanza kwenye kila ukurasa ni kiungo kinachoruka hadi kwenye maudhui. Kidhibiti kinachoweza kufikiwa kwa kipanya au kidole pekee ni hitilafu, na tunataka kuijua.',
    'reading.device': 'Mipangilio ya kifaa chako yenyewe inaheshimiwa.',
    'reading.deviceNote':
      'Kifaa chako kikiomba mwendo mdogo, jukwaa huupunguza; mpangilio ulio hapo juu ni kwa kifaa kisichoomba. Kiolesura pia hufunguka kwa lugha ambayo kifaa chako kinaomba, pale lugha hiyo inapotolewa.',
    'reading.colours': 'Rangi za maandishi hupimwa.',
    'reading.coloursNote':
      'Rangi kuu za maandishi na mandhari za muundo wa kawaida hukaguliwa na jaribio la kiotomatiki kila jukwaa linapobadilika, dhidi ya utofautishaji ambao miongozo ya kimataifa ya ufikivu inaomba kwa maandishi ya kawaida.',
    'reading.names': 'Fomu zina majina.',
    'reading.namesNote':
      'Visanduku vya kuandikia vimejengwa na lebo ambayo kisoma skrini kinaweza kuitamka, na jedwali pana husogezwa ndani ya fremu yake lenyewe badala ya kusukuma ukurasa upande.',
    'reading.arabic': 'Kiarabu hupangwa kama Kiarabu.',
    'reading.arabicNote':
      'Kichwa cha kozi, jina la somo, jina la mwalimu na jina lililo kwenye cheti hupangwa kwa hati ambayo viliandikwa, na kwa mwelekeo wa usomaji ambao maneno yenyewe yanaomba. Visoma skrini huambiwa ni sehemu zipi ni za Kiarabu, ili viweze kubadilisha sauti.',
    'reading.mixed': 'Jina lililochanganyika bado ni jina moja.',
    'reading.mixedNote':
      'Kichwa chenye hati mbili hakilazimishwi kwenye mwelekeo mmoja: kila sehemu hupangwa kwa hati yake, na kivinjari huziunganisha kwa mpangilio ambao msomaji angezitamka.',
    'reading.langHeading': 'Lugha',
    'reading.offered': 'Kiolesura kimetafsiriwa, na kinasema ni kwa kiasi gani.',
    'reading.offeredNote':
      'Idadi ya lugha zinazotolewa mbali na Kiingereza: {count}. Ukurasa wa lugha unaeleza kwa kila moja ni kiasi gani kimetafsiriwa kwa kweli. Pale ambapo skrini haijaandikwa kwa lugha yako, huonyeshwa kwa Kiingereza, nzima, badala ya sentensi za Kiingereza katikati ya zilizotafsiriwa. Skrini za ufundishaji na za wafanyakazi na baadhi ya kurasa za akaunti, familia na malipo bado hazijaandaliwa kwa tafsiri na ziko kwa Kiingereza kwa kila mtu. Vichwa vya kozi, masomo na maoni hubaki katika lugha ambayo mwandishi wake aliviandika.',
    'reading.rtl': 'Lugha za kulia kwenda kushoto hugeuza ukurasa mzima.',
    'reading.rtlNote':
      'Kozi ya kulia kwenda kushoto inayoonyeshwa ndani ya kiolesura cha kushoto kwenda kulia hubaki na mwelekeo wake. Kuchagua mojawapo ya lugha hizi hugeuza upau wa juu, urambazaji, matangazo na kijachini: {languages}.',
    'reading.browser': 'Chaguo la lugha huhifadhiwa kwenye kivinjari hiki, si kwenye akaunti yako.',
    'reading.browserNote':
      'Lugha husomwa kabla ya mtu yeyote kuingia, kwa hiyo mtu yuleyule kwenye kifaa kingine hupata lugha ya kifaa hicho hadi aibadilishe huko pia.',
    'reading.unreviewed': 'Hakuna tafsiri iliyosomwa bado na mzungumzaji wa asili.',
    'reading.unreviewedNote':
      'Ziliandikwa na waliojenga jukwaa. Neno likionekana si sahihi kwako, kosa hilo ni letu, na ukurasa wa lugha husema hivyo kwa kila lugha unayoitoa.',
    'reading.missingHeading': 'Yasiyokuwepo hapa bado',
    'reading.back': 'Rudi kwenye akaunti yangu',
  },
  af: {
    'reading.title': 'Hoe dit lees',
    'reading.crumb': 'Lees',
    'reading.lede':
      'Vier instellings, toegepas die oomblik wat jy hulle kies. Hulle behoort aan hierdie blaaier, nie aan jou rekening nie: ’n foon en ’n skootrekenaar vra verskillende groottes, en ’n gedeelde toestel behoort nie iemand anders se keuse te erf nie. Jy hoef nie aangemeld te wees om hulle te gebruik nie.',
    'reading.now': 'Dit is die instellings in hierdie blaaier.',
    'reading.saved': 'Gestoor vir hierdie blaaier.',
    'reading.notKept':
      'Hierdie blaaier wou nie die instelling hou nie. Dit geld net vir hierdie bladsy en sal op die volgende een weg wees.',
    'reading.textLegend': 'Teksgrootte',
    'reading.textNormal': 'Normaal',
    'reading.textNormalNote': 'Die grootte wat die res van die platform gebruik.',
    'reading.textLarge': 'Groter',
    'reading.textLargeNote': 'Een stap op, vir opskrifte en lopende teks saam.',
    'reading.textLargest': 'Grootste',
    'reading.textLargestNote':
      'Twee stappe op. Rye wat langs mekaar staan, word opmekaar gestapel sodat woorde nie saamgedruk word nie.',
    'reading.contrastLegend': 'Kontras',
    'reading.contrastNormal': 'Normaal',
    'reading.contrastNormalNote': 'Wit en groen, soos die platform ontwerp is.',
    'reading.contrastHigh': 'Sterker buitelyne',
    'reading.contrastHighNote':
      'Donkerder sekondêre teks, donkerder rande, ’n skoon wit agtergrond en ’n dikker buitelyn om die ding waarop die sleutelbord is. Nuttig in helder lig en op ’n dowwe skerm.',
    'reading.motionLegend': 'Beweging',
    'reading.motionSystem': 'Volg my toestel',
    'reading.motionSystemNote':
      'As jou toestel minder beweging vra, luister die platform reeds daarna.',
    'reading.motionReduce': 'Verminder beweging altyd',
    'reading.motionReduceNote':
      'Skakel oorgange en geanimeerde rol af, selfs wanneer die toestel nie daarom vra nie.',
    'reading.reset': 'Terug na die verstekwaardes',
    'reading.trueHeading': 'Wat reeds waar is sonder om enigiets in te stel',
    'reading.keyboard': 'Die sleutelbord werk.',
    'reading.keyboardNote':
      'Die ding waarop die sleutelbord is, het ’n sigbare buitelyn, en die eerste stop op elke bladsy is ’n skakel wat na die inhoud spring. ’n Kontrole wat net met ’n muis of ’n vinger bereik kan word, is ’n fout, en ons wil daarvan weet.',
    'reading.device': 'Jou toestel se eie instellings word gerespekteer.',
    'reading.deviceNote':
      'As jou toestel minder beweging vra, verminder die platform dit; die instelling hierbo is vir ’n toestel wat nie vra nie. Die koppelvlak maak ook oop in die taal wat jou toestel vra, wanneer daardie taal aangebied word.',
    'reading.colours': 'Tekskleure word gemeet.',
    'reading.coloursNote':
      'Die hoofkleure vir teks en agtergrond van die normale ontwerp word elke keer wat die platform verander deur ’n outomatiese toets nagegaan, teen die kontras wat internasionale toeganklikheidsriglyne vir gewone teks vra.',
    'reading.names': 'Vorms dra name.',
    'reading.namesNote':
      'Invoervelde word gebou met ’n etiket wat ’n skermleser kan aankondig, en ’n wye tabel rol binne sy eie raam eerder as om die bladsy sywaarts te stoot.',
    'reading.arabic': 'Arabies word as Arabies geset.',
    'reading.arabicNote':
      '’n Kursustitel, ’n lesnaam, ’n onderwyser se naam en die naam op ’n sertifikaat word geset in die skrif waarin hulle geskryf is, met die leesrigting wat die woorde self vra. Skermlesers word vertel watter gedeeltes Arabies is, sodat hulle van stem kan verander.',
    'reading.mixed': '’n Gemengde naam is steeds een naam.',
    'reading.mixedNote':
      '’n Titel in twee skrifte word nie in een rigting gedwing nie: elke deel word in sy eie skrif geset, en die blaaier voeg hulle saam in die volgorde waarin ’n leser hulle sou sê.',
    'reading.langHeading': 'Taal',
    'reading.offered': 'Die koppelvlak is vertaal, en dit sê hoe volledig.',
    'reading.offeredNote':
      'Aantal tale wat benewens Engels aangebied word: {count}. Die taalbladsy sê vir elkeen hoeveel daarvan werklik vertaal is. Waar ’n skerm nie in jou taal geskryf is nie, word dit in Engels gewys, in sy geheel, eerder as Engelse sinne tussen vertaaldes. Die onderrig- en personeelskerms en sommige rekening-, gesins- en betalingsbladsye is nog nie vir vertaling voorberei nie en is vir almal in Engels. Kursustitels, lesse en opmerkings bly in die taal waarin hul skrywer hulle geskryf het.',
    'reading.rtl': 'Tale wat van regs na links geskryf word, draai die hele bladsy om.',
    'reading.rtlNote':
      '’n Regs-na-links-kursus wat binne ’n links-na-regs-koppelvlak gewys word, behou sy eie rigting. Om een van hierdie tale te kies, spieël die boonste balk, die navigasie, die kennisgewings en die voetskrif: {languages}.',
    'reading.browser': 'Die taalkeuse word in hierdie blaaier gehou, nie op jou rekening nie.',
    'reading.browserNote':
      'Taal word gelees voordat enigiemand aanmeld, so dieselfde persoon op ’n ander toestel kry daardie toestel se taal totdat hulle dit ook daar verander.',
    'reading.unreviewed': 'Geen vertaling is nog deur ’n moedertaalspreker gelees nie.',
    'reading.unreviewedNote':
      'Hulle is geskryf deur die mense wat die platform gebou het. As ’n woord vir jou verkeerd lyk, is dit ons fout, en die taalbladsy sê dit vir elke taal wat dit aanbied.',
    'reading.missingHeading': 'Wat nog nie hier is nie',
    'reading.back': 'Terug na my rekening',
  },
  'zh-hans': {
    'reading.title': '阅读显示',
    'reading.crumb': '阅读',
    'reading.lede': '四项设置，选择后立即生效。它们属于此浏览器，而不属于你的账户：手机和笔记本电脑需要不同的字号，共用的设备也不应沿用别人的选择。使用它们无需登录。',
    'reading.now': '这是此浏览器中的设置。',
    'reading.saved': '已为此浏览器保存。',
    'reading.notKept': '此浏览器未能保留该设置。它只对本页生效，到下一页就会消失。',
    'reading.textLegend': '文字大小',
    'reading.textNormal': '标准',
    'reading.textNormalNote': '平台其他部分使用的大小。',
    'reading.textLarge': '较大',
    'reading.textLargeNote': '大一级，标题和正文一起放大。',
    'reading.textLargest': '最大',
    'reading.textLargestNote': '大两级。并排的行会改为上下排列，以免文字被挤压。',
    'reading.contrastLegend': '对比度',
    'reading.contrastNormal': '标准',
    'reading.contrastNormalNote': '白色和绿色，即平台原本的设计。',
    'reading.contrastHigh': '更清晰的轮廓',
    'reading.contrastHighNote': '次要文字更深，边框更深，纯白背景，键盘所在的项目周围有更粗的轮廓线。适合强光下和较暗的屏幕。',
    'reading.motionLegend': '动态效果',
    'reading.motionSystem': '跟随我的设备',
    'reading.motionSystemNote': '如果你的设备要求减少动态效果，平台本来就会照办。',
    'reading.motionReduce': '始终减少动态效果',
    'reading.motionReduceNote': '即使设备没有要求，也会关闭过渡效果和动画滚动。',
    'reading.reset': '恢复默认设置',
    'reading.trueHeading': '无需任何设置就已做到的事',
    'reading.keyboard': '键盘可以使用。',
    'reading.keyboardNote': '键盘所在的项目有可见的轮廓线，每个页面的第一站是一个跳到正文的链接。只能用鼠标或手指才能触及的控件属于缺陷，我们希望得知。',
    'reading.device': '你设备自身的设置会得到尊重。',
    'reading.deviceNote': '如果你的设备要求减少动态效果，平台就会减少；上面的设置是给没有提出这一要求的设备用的。只要提供了该语言，界面也会以你的设备所要求的语言打开。',
    'reading.colours': '文字颜色经过测量。',
    'reading.coloursNote': '标准设计中主要的文字和背景颜色，在平台每次改动时都由自动测试对照国际无障碍指南对普通文字所要求的对比度进行检查。',
    'reading.names': '表单带有名称。',
    'reading.namesNote': '输入框都配有屏幕阅读器可以读出的标签，较宽的表格在自己的框内滚动，而不会把页面挤向一侧。',
    'reading.arabic': '阿拉伯文按阿拉伯文排版。',
    'reading.arabicNote':
      '课程标题、课时名称、教师姓名和证书上的姓名，都按书写时所用的文字排版，并采用这些文字本身要求的阅读方向。屏幕阅读器会被告知哪些段落是阿拉伯文，以便切换语音。',
    'reading.mixed': '混合的名称仍是一个名称。',
    'reading.mixedNote': '含两种文字的标题不会被强行排成一个方向：每一部分按各自的文字排版，浏览器再按读者念出的顺序把它们连在一起。',
    'reading.langHeading': '语言',
    'reading.offered': '界面已翻译，并说明翻译的完整程度。',
    'reading.offeredNote':
      '除英语外提供的语言数量：{count}。语言页面会说明每种语言实际翻译了多少。如果某个界面还没有用你的语言写出，它会整页以英语显示，而不是在译文中夹杂英语句子。教学和工作人员界面以及部分账户、家庭和付款页面尚未做好翻译准备，对所有人都是英语。课程标题、课时和评论保持作者书写时所用的语言。',
    'reading.rtl': '从右到左书写的语言会把整个页面翻转过来。',
    'reading.rtlNote': '在从左到右的界面中显示的从右到左课程，会保持自己的方向。选择下列语言之一，会使顶栏、导航、通知和页脚镜像翻转：{languages}。',
    'reading.browser': '语言选择保存在此浏览器上，而不是你的账户里。',
    'reading.browserNote': '语言在任何人登录之前就已读取，所以同一个人在另一台设备上会得到那台设备的语言，直到在那里也改掉为止。',
    'reading.unreviewed': '目前还没有任何译文由母语者读过。',
    'reading.unreviewedNote': '译文是由搭建这个平台的人写的。如果某个词在你看来不对，那是我们的错误；语言页面对它提供的每种语言都这样说明。',
    'reading.missingHeading': '这里还没有的功能',
    'reading.back': '返回我的账户',
  },
  'zh-hant': {
    'reading.title': '閱讀顯示',
    'reading.crumb': '閱讀',
    'reading.lede': '四項設定，選擇後立即生效。它們屬於此瀏覽器，而不屬於你的帳號：手機和筆記型電腦需要不同的字級，共用的裝置也不應沿用別人的選擇。使用它們不必登入。',
    'reading.now': '這是此瀏覽器中的設定。',
    'reading.saved': '已為此瀏覽器儲存。',
    'reading.notKept': '此瀏覽器未能保留該設定。它只對本頁生效，到下一頁就會消失。',
    'reading.textLegend': '文字大小',
    'reading.textNormal': '標準',
    'reading.textNormalNote': '平台其他部分使用的大小。',
    'reading.textLarge': '較大',
    'reading.textLargeNote': '大一級，標題和內文一起放大。',
    'reading.textLargest': '最大',
    'reading.textLargestNote': '大兩級。並排的列會改為上下排列，以免文字被擠壓。',
    'reading.contrastLegend': '對比度',
    'reading.contrastNormal': '標準',
    'reading.contrastNormalNote': '白色和綠色，也就是平台原本的設計。',
    'reading.contrastHigh': '更清楚的輪廓',
    'reading.contrastHighNote': '次要文字更深，邊框更深，純白背景，鍵盤所在的項目周圍有更粗的輪廓線。適合強光下和較暗的螢幕。',
    'reading.motionLegend': '動態效果',
    'reading.motionSystem': '跟隨我的裝置',
    'reading.motionSystemNote': '如果你的裝置要求減少動態效果，平台本來就會照辦。',
    'reading.motionReduce': '一律減少動態效果',
    'reading.motionReduceNote': '即使裝置沒有要求，也會關閉轉場效果和動畫捲動。',
    'reading.reset': '恢復預設值',
    'reading.trueHeading': '不必任何設定就已做到的事',
    'reading.keyboard': '鍵盤可以使用。',
    'reading.keyboardNote': '鍵盤所在的項目有看得見的輪廓線，每個頁面的第一站是一個跳到內容的連結。只能用滑鼠或手指才碰得到的控制項屬於缺陷，我們希望得知。',
    'reading.device': '你裝置本身的設定會受到尊重。',
    'reading.deviceNote': '如果你的裝置要求減少動態效果，平台就會減少；上面的設定是給沒有提出這項要求的裝置用的。只要有提供該語言，介面也會以你的裝置所要求的語言開啟。',
    'reading.colours': '文字顏色經過測量。',
    'reading.coloursNote': '標準設計中主要的文字和背景顏色，在平台每次變更時都由自動測試對照國際無障礙指引對一般文字所要求的對比度進行檢查。',
    'reading.names': '表單帶有名稱。',
    'reading.namesNote': '輸入欄位都配有螢幕閱讀器可以讀出的標籤，較寬的表格在自己的框內捲動，而不會把頁面擠向一側。',
    'reading.arabic': '阿拉伯文按阿拉伯文排版。',
    'reading.arabicNote':
      '課程標題、課堂名稱、教師姓名和證書上的姓名，都按書寫時所用的文字排版，並採用這些文字本身要求的閱讀方向。螢幕閱讀器會被告知哪些段落是阿拉伯文，以便切換語音。',
    'reading.mixed': '混合的名稱仍是一個名稱。',
    'reading.mixedNote': '含兩種文字的標題不會被硬排成一個方向：每一部分按各自的文字排版，瀏覽器再按讀者唸出的順序把它們連在一起。',
    'reading.langHeading': '語言',
    'reading.offered': '介面已翻譯，並說明翻譯的完整程度。',
    'reading.offeredNote':
      '除英語外提供的語言數量：{count}。語言頁面會說明每種語言實際翻譯了多少。如果某個畫面還沒有用你的語言寫出，它會整頁以英語顯示，而不是在譯文中夾雜英語句子。教學和工作人員畫面以及部分帳號、家庭和付款頁面尚未做好翻譯準備，對所有人都是英語。課程標題、課堂和留言維持作者書寫時所用的語言。',
    'reading.rtl': '由右至左書寫的語言會把整個頁面翻轉過來。',
    'reading.rtlNote': '在由左至右的介面中顯示的由右至左課程，會維持自己的方向。選擇下列語言之一，會使頂端列、導覽、通知和頁尾鏡像翻轉：{languages}。',
    'reading.browser': '語言選擇保存在此瀏覽器上，而不是你的帳號裡。',
    'reading.browserNote': '語言在任何人登入之前就已讀取，所以同一個人在另一台裝置上會得到那台裝置的語言，直到在那裡也改掉為止。',
    'reading.unreviewed': '目前還沒有任何翻譯由母語者讀過。',
    'reading.unreviewedNote': '翻譯是由建立這個平台的人寫的。如果某個詞在你看來不對，那是我們的錯誤；語言頁面對它提供的每種語言都這樣說明。',
    'reading.missingHeading': '這裡還沒有的功能',
    'reading.back': '返回我的帳號',
  },
  vi: {
    'reading.title': 'Cách hiển thị để đọc',
    'reading.crumb': 'Đọc',
    'reading.lede':
      'Bốn thiết lập, được áp dụng ngay khi bạn chọn. Chúng thuộc về trình duyệt này, không thuộc về tài khoản của bạn: điện thoại và máy tính xách tay cần cỡ chữ khác nhau, và một thiết bị dùng chung không nên thừa hưởng lựa chọn của người khác. Bạn không cần đăng nhập để dùng chúng.',
    'reading.now': 'Đây là các thiết lập trong trình duyệt này.',
    'reading.saved': 'Đã lưu cho trình duyệt này.',
    'reading.notKept':
      'Trình duyệt này không chịu giữ thiết lập. Thiết lập chỉ áp dụng cho trang này và sẽ mất ở trang tiếp theo.',
    'reading.textLegend': 'Cỡ chữ',
    'reading.textNormal': 'Bình thường',
    'reading.textNormalNote': 'Cỡ chữ mà phần còn lại của nền tảng sử dụng.',
    'reading.textLarge': 'Lớn hơn',
    'reading.textLargeNote': 'Lớn hơn một bậc, cho cả tiêu đề lẫn phần chữ chính.',
    'reading.textLargest': 'Lớn nhất',
    'reading.textLargestNote':
      'Lớn hơn hai bậc. Các hàng nằm cạnh nhau được xếp chồng lên nhau để chữ không bị ép lại.',
    'reading.contrastLegend': 'Độ tương phản',
    'reading.contrastNormal': 'Bình thường',
    'reading.contrastNormalNote': 'Trắng và xanh lá, đúng như nền tảng được thiết kế.',
    'reading.contrastHigh': 'Đường viền rõ hơn',
    'reading.contrastHighNote':
      'Chữ phụ đậm hơn, đường viền đậm hơn, nền trắng trơn và một đường bao dày hơn quanh mục mà bàn phím đang đứng. Hữu ích dưới ánh sáng mạnh và trên màn hình mờ.',
    'reading.motionLegend': 'Chuyển động',
    'reading.motionSystem': 'Theo thiết bị của tôi',
    'reading.motionSystemNote':
      'Nếu thiết bị của bạn yêu cầu giảm chuyển động, nền tảng vốn đã làm theo.',
    'reading.motionReduce': 'Luôn giảm chuyển động',
    'reading.motionReduceNote':
      'Tắt hiệu ứng chuyển tiếp và cuộn có hoạt ảnh ngay cả khi thiết bị không yêu cầu.',
    'reading.reset': 'Trở về mặc định',
    'reading.trueHeading': 'Những điều vốn đã đúng mà không cần thiết lập gì',
    'reading.keyboard': 'Bàn phím hoạt động.',
    'reading.keyboardNote':
      'Mục mà bàn phím đang đứng có đường bao nhìn thấy được, và điểm dừng đầu tiên trên mỗi trang là một liên kết nhảy tới nội dung. Một nút điều khiển chỉ có thể chạm tới bằng chuột hoặc ngón tay là một lỗi, và chúng tôi muốn được biết.',
    'reading.device': 'Thiết lập của chính thiết bị bạn được tôn trọng.',
    'reading.deviceNote':
      'Nếu thiết bị của bạn yêu cầu giảm chuyển động, nền tảng sẽ giảm; thiết lập ở trên dành cho thiết bị không yêu cầu điều đó. Giao diện cũng mở bằng ngôn ngữ mà thiết bị của bạn yêu cầu, khi ngôn ngữ đó được cung cấp.',
    'reading.colours': 'Màu chữ được đo.',
    'reading.coloursNote':
      'Các màu chữ và màu nền chính của thiết kế bình thường được một bài kiểm tra tự động đối chiếu mỗi khi nền tảng thay đổi, so với độ tương phản mà các hướng dẫn quốc tế về khả năng tiếp cận yêu cầu cho chữ thông thường.',
    'reading.names': 'Biểu mẫu có tên.',
    'reading.namesNote':
      'Các ô nhập được dựng kèm nhãn mà trình đọc màn hình có thể đọc lên, và một bảng rộng sẽ cuộn bên trong khung của chính nó thay vì đẩy trang sang một bên.',
    'reading.arabic': 'Tiếng Ả Rập được trình bày đúng là tiếng Ả Rập.',
    'reading.arabicNote':
      'Tên khoá học, tên bài học, tên giáo viên và tên trên chứng chỉ được trình bày bằng chính hệ chữ đã dùng để viết, theo hướng đọc mà bản thân các chữ ấy yêu cầu. Trình đọc màn hình được báo đoạn nào là tiếng Ả Rập để có thể đổi giọng.',
    'reading.mixed': 'Một cái tên pha trộn vẫn là một cái tên.',
    'reading.mixedNote':
      'Một tiêu đề viết bằng hai hệ chữ không bị ép theo một hướng: mỗi phần được trình bày bằng hệ chữ của nó, và trình duyệt ghép chúng theo thứ tự người đọc sẽ nói ra.',
    'reading.langHeading': 'Ngôn ngữ',
    'reading.offered': 'Giao diện đã được dịch, và nó cho biết dịch đầy đủ đến đâu.',
    'reading.offeredNote':
      'Số ngôn ngữ được cung cấp ngoài tiếng Anh: {count}. Trang ngôn ngữ cho biết với từng ngôn ngữ đã thực sự dịch được bao nhiêu. Nơi nào một màn hình chưa được viết bằng ngôn ngữ của bạn, màn hình đó được hiển thị bằng tiếng Anh, trọn vẹn, chứ không phải những câu tiếng Anh xen giữa các câu đã dịch. Các màn hình giảng dạy và nhân viên cùng một số trang tài khoản, gia đình và thanh toán chưa được chuẩn bị để dịch và hiển thị bằng tiếng Anh cho mọi người. Tên khoá học, bài học và bình luận giữ nguyên ngôn ngữ mà tác giả đã viết.',
    'reading.rtl': 'Các ngôn ngữ viết từ phải sang trái xoay ngược cả trang.',
    'reading.rtlNote':
      'Một khoá học từ phải sang trái hiển thị trong giao diện từ trái sang phải vẫn giữ hướng của nó. Chọn một trong các ngôn ngữ sau sẽ lật ngược thanh trên cùng, phần điều hướng, các thông báo và chân trang: {languages}.',
    'reading.browser':
      'Lựa chọn ngôn ngữ được lưu trên trình duyệt này, không phải trên tài khoản của bạn.',
    'reading.browserNote':
      'Ngôn ngữ được đọc trước khi ai đó đăng nhập, nên cùng một người trên thiết bị khác sẽ nhận ngôn ngữ của thiết bị ấy cho đến khi họ đổi nó ở đó.',
    'reading.unreviewed': 'Chưa có bản dịch nào được người bản ngữ đọc.',
    'reading.unreviewedNote':
      'Các bản dịch được viết bởi những người dựng nên nền tảng. Nếu một từ có vẻ sai với bạn, đó là lỗi của chúng tôi, và trang ngôn ngữ nói điều đó về mọi ngôn ngữ mà nó cung cấp.',
    'reading.missingHeading': 'Những gì chưa có ở đây',
    'reading.back': 'Về tài khoản của tôi',
  },
  th: {
    'reading.title': 'การแสดงผลสำหรับอ่าน',
    'reading.crumb': 'การอ่าน',
    'reading.lede':
      'การตั้งค่าสี่อย่าง มีผลทันทีที่คุณเลือก การตั้งค่าเหล่านี้เป็นของเบราว์เซอร์นี้ ไม่ใช่ของบัญชีคุณ: โทรศัพท์กับแล็ปท็อปต้องการขนาดต่างกัน และอุปกรณ์ที่ใช้ร่วมกันไม่ควรรับช่วงตัวเลือกของคนอื่น คุณไม่จำเป็นต้องเข้าสู่ระบบเพื่อใช้การตั้งค่าเหล่านี้',
    'reading.now': 'นี่คือการตั้งค่าในเบราว์เซอร์นี้',
    'reading.saved': 'บันทึกสำหรับเบราว์เซอร์นี้แล้ว',
    'reading.notKept':
      'เบราว์เซอร์นี้ไม่ยอมเก็บการตั้งค่า การตั้งค่ามีผลกับหน้านี้เท่านั้นและจะหายไปในหน้าถัดไป',
    'reading.textLegend': 'ขนาดตัวอักษร',
    'reading.textNormal': 'ปกติ',
    'reading.textNormalNote': 'ขนาดที่ส่วนอื่นของแพลตฟอร์มใช้',
    'reading.textLarge': 'ใหญ่ขึ้น',
    'reading.textLargeNote': 'ใหญ่ขึ้นหนึ่งระดับ ทั้งหัวข้อและเนื้อความ',
    'reading.textLargest': 'ใหญ่ที่สุด',
    'reading.textLargestNote':
      'ใหญ่ขึ้นสองระดับ แถวที่วางเคียงกันจะเรียงซ้อนกันแทน เพื่อไม่ให้คำถูกบีบ',
    'reading.contrastLegend': 'ความคมชัดของสี',
    'reading.contrastNormal': 'ปกติ',
    'reading.contrastNormalNote': 'ขาวและเขียว ตามที่แพลตฟอร์มออกแบบไว้',
    'reading.contrastHigh': 'เส้นขอบชัดขึ้น',
    'reading.contrastHighNote':
      'ข้อความรองเข้มขึ้น เส้นขอบเข้มขึ้น พื้นหลังขาวล้วน และเส้นกรอบหนาขึ้นรอบสิ่งที่แป้นพิมพ์อยู่ มีประโยชน์ในที่แสงจ้าและบนจอที่หม่น',
    'reading.motionLegend': 'การเคลื่อนไหว',
    'reading.motionSystem': 'ตามอุปกรณ์ของฉัน',
    'reading.motionSystemNote': 'หากอุปกรณ์ของคุณขอให้ลดการเคลื่อนไหว แพลตฟอร์มก็ทำตามอยู่แล้ว',
    'reading.motionReduce': 'ลดการเคลื่อนไหวเสมอ',
    'reading.motionReduceNote': 'ปิดการเปลี่ยนภาพและการเลื่อนแบบเคลื่อนไหว แม้อุปกรณ์จะไม่ได้ขอ',
    'reading.reset': 'กลับไปใช้ค่าเริ่มต้น',
    'reading.trueHeading': 'สิ่งที่เป็นจริงอยู่แล้วโดยไม่ต้องตั้งค่าอะไร',
    'reading.keyboard': 'แป้นพิมพ์ใช้งานได้',
    'reading.keyboardNote':
      'สิ่งที่แป้นพิมพ์อยู่มีเส้นกรอบที่มองเห็นได้ และจุดแรกของทุกหน้าคือลิงก์ที่ข้ามไปยังเนื้อหา ตัวควบคุมที่เข้าถึงได้ด้วยเมาส์หรือนิ้วเท่านั้นถือเป็นข้อบกพร่อง และเราอยากทราบ',
    'reading.device': 'การตั้งค่าของอุปกรณ์คุณเองได้รับการเคารพ',
    'reading.deviceNote':
      'หากอุปกรณ์ของคุณขอให้ลดการเคลื่อนไหว แพลตฟอร์มจะลดให้ การตั้งค่าข้างบนมีไว้สำหรับอุปกรณ์ที่ไม่ได้ขอ ส่วนติดต่อยังเปิดในภาษาที่อุปกรณ์ของคุณขอด้วย เมื่อมีภาษานั้นให้เลือก',
    'reading.colours': 'สีของข้อความได้รับการวัด',
    'reading.coloursNote':
      'สีหลักของข้อความและพื้นหลังในแบบปกติถูกตรวจด้วยการทดสอบอัตโนมัติทุกครั้งที่แพลตฟอร์มเปลี่ยนแปลง เทียบกับความคมชัดที่แนวทางสากลด้านการเข้าถึงกำหนดสำหรับข้อความทั่วไป',
    'reading.names': 'แบบฟอร์มมีชื่อกำกับ',
    'reading.namesNote':
      'ช่องกรอกสร้างขึ้นพร้อมป้ายกำกับที่โปรแกรมอ่านหน้าจออ่านออกเสียงได้ และตารางที่กว้างจะเลื่อนอยู่ภายในกรอบของตัวเองแทนที่จะดันหน้าออกไปด้านข้าง',
    'reading.arabic': 'ภาษาอาหรับจัดเรียงแบบภาษาอาหรับ',
    'reading.arabicNote':
      'ชื่อหลักสูตร ชื่อบทเรียน ชื่อผู้สอน และชื่อบนใบรับรอง จัดเรียงด้วยอักษรที่ใช้เขียน และตามทิศทางการอ่านที่ตัวคำเองต้องการ โปรแกรมอ่านหน้าจอได้รับแจ้งว่าช่วงใดเป็นภาษาอาหรับ เพื่อให้เปลี่ยนเสียงได้',
    'reading.mixed': 'ชื่อที่ผสมกันยังคงเป็นชื่อเดียว',
    'reading.mixedNote':
      'หัวข้อที่มีอักษรสองแบบไม่ถูกบังคับให้ไปทิศทางเดียว: แต่ละส่วนจัดเรียงด้วยอักษรของตัวเอง และเบราว์เซอร์เชื่อมเข้าด้วยกันตามลำดับที่ผู้อ่านจะพูด',
    'reading.langHeading': 'ภาษา',
    'reading.offered': 'ส่วนติดต่อได้รับการแปล และบอกว่าแปลครบเพียงใด',
    'reading.offeredNote':
      'จำนวนภาษาที่มีให้เลือกนอกจากภาษาอังกฤษ: {count} หน้าภาษาระบุสำหรับแต่ละภาษาว่าแปลไปแล้วจริงเท่าใด หากหน้าจอใดยังไม่ได้เขียนเป็นภาษาของคุณ หน้าจอนั้นจะแสดงเป็นภาษาอังกฤษทั้งหน้า แทนที่จะเป็นประโยคภาษาอังกฤษปนอยู่กับประโยคที่แปลแล้ว หน้าจอการสอนและเจ้าหน้าที่ รวมทั้งหน้าบัญชี ครอบครัว และการชำระเงินบางหน้า ยังไม่ได้เตรียมสำหรับการแปล และเป็นภาษาอังกฤษสำหรับทุกคน ชื่อหลักสูตร บทเรียน และความคิดเห็น ยังคงเป็นภาษาที่ผู้เขียนเขียนไว้',
    'reading.rtl': 'ภาษาที่เขียนจากขวาไปซ้ายจะกลับด้านทั้งหน้า',
    'reading.rtlNote':
      'หลักสูตรแบบขวาไปซ้ายที่แสดงในส่วนติดต่อแบบซ้ายไปขวาจะคงทิศทางของตัวเองไว้ การเลือกภาษาใดภาษาหนึ่งต่อไปนี้จะกลับด้านแถบด้านบน การนำทาง ประกาศ และส่วนท้ายหน้า: {languages}',
    'reading.browser': 'ตัวเลือกภาษาเก็บไว้ในเบราว์เซอร์นี้ ไม่ใช่ในบัญชีของคุณ',
    'reading.browserNote':
      'ภาษาถูกอ่านก่อนที่ใครจะเข้าสู่ระบบ ดังนั้นคนเดียวกันบนอุปกรณ์อื่นจะได้ภาษาของอุปกรณ์นั้น จนกว่าจะเปลี่ยนที่นั่นด้วย',
    'reading.unreviewed': 'ยังไม่มีคำแปลใดที่เจ้าของภาษาตรวจอ่าน',
    'reading.unreviewedNote':
      'ผู้ที่สร้างแพลตฟอร์มเป็นผู้เขียนคำแปล หากคำใดดูไม่ถูกต้อง ข้อผิดพลาดเป็นของเรา และหน้าภาษาบอกเช่นนั้นสำหรับทุกภาษาที่มีให้เลือก',
    'reading.missingHeading': 'สิ่งที่ยังไม่มีที่นี่',
    'reading.back': 'กลับไปที่บัญชีของฉัน',
  },
  fil: {
    'reading.title': 'Paano ito binabasa',
    'reading.crumb': 'Pagbasa',
    'reading.lede':
      'Apat na setting, inilalapat sa sandaling piliin mo. Sa browser na ito ang mga iyon, hindi sa iyong akawnt: magkaibang laki ang kailangan ng telepono at ng laptop, at ang device na pinaghahatian ay hindi dapat magmana ng pinili ng iba. Hindi mo kailangang naka-sign in para gamitin ang mga ito.',
    'reading.now': 'Ito ang mga setting sa browser na ito.',
    'reading.saved': 'Na-save para sa browser na ito.',
    'reading.notKept':
      'Hindi itinago ng browser na ito ang setting. Sa pahinang ito lang ito umiiral at mawawala na sa susunod.',
    'reading.textLegend': 'Laki ng teksto',
    'reading.textNormal': 'Karaniwan',
    'reading.textNormalNote': 'Ang laking ginagamit ng ibang bahagi ng platform.',
    'reading.textLarge': 'Mas malaki',
    'reading.textLargeNote':
      'Isang antas pataas, para sa mga pamagat at pangunahing teksto nang sabay.',
    'reading.textLargest': 'Pinakamalaki',
    'reading.textLargestNote':
      'Dalawang antas pataas. Ang mga hanay na magkatabi ay pinagpapatong upang hindi maipit ang mga salita.',
    'reading.contrastLegend': 'Contrast ng kulay',
    'reading.contrastNormal': 'Karaniwan',
    'reading.contrastNormalNote': 'Puti at berde, gaya ng pagkakadisenyo sa platform.',
    'reading.contrastHigh': 'Mas malinaw na mga guhit',
    'reading.contrastHighNote':
      'Mas madilim na pangalawang teksto, mas madilim na mga gilid, payak na puting background, at mas makapal na balangkas sa paligid ng kinaroroonan ng keyboard. Kapaki-pakinabang sa matinding liwanag at sa malabong screen.',
    'reading.motionLegend': 'Galaw',
    'reading.motionSystem': 'Sundin ang aking device',
    'reading.motionSystemNote':
      'Kung humihingi ang iyong device ng mas kaunting galaw, sinusunod na ito ng platform.',
    'reading.motionReduce': 'Laging bawasan ang galaw',
    'reading.motionReduceNote':
      'Pinapatay ang mga transisyon at ang animated na pag-scroll kahit hindi ito hinihingi ng device.',
    'reading.reset': 'Bumalik sa mga default',
    'reading.trueHeading': 'Ang totoo na kahit walang itinatakda',
    'reading.keyboard': 'Gumagana ang keyboard.',
    'reading.keyboardNote':
      'May nakikitang balangkas ang kinaroroonan ng keyboard, at ang unang hinto sa bawat pahina ay isang link na lumalaktaw papunta sa nilalaman. Ang kontrol na maaabot lang ng mouse o daliri ay isang depekto, at gusto naming malaman iyon.',
    'reading.device': 'Iginagalang ang sariling mga setting ng iyong device.',
    'reading.deviceNote':
      'Kung humihingi ang iyong device ng mas kaunting galaw, binabawasan ito ng platform; ang setting sa itaas ay para sa device na hindi humihingi. Nagbubukas din ang interface sa wikang hinihingi ng iyong device, kapag iniaalok ang wikang iyon.',
    'reading.colours': 'Sinusukat ang mga kulay ng teksto.',
    'reading.coloursNote':
      'Ang mga pangunahing kulay ng teksto at background ng karaniwang disenyo ay sinusuri ng awtomatikong pagsubok tuwing nagbabago ang platform, laban sa contrast na hinihingi ng mga pandaigdigang alituntunin sa accessibility para sa karaniwang teksto.',
    'reading.names': 'May pangalan ang mga form.',
    'reading.namesNote':
      'Ginagawa ang mga input na may label na kayang bigkasin ng screen reader, at ang malapad na talahanayan ay nag-i-scroll sa loob ng sarili nitong kuwadro sa halip na itulak ang pahina patagilid.',
    'reading.arabic': 'Ang Arabe ay inaayos bilang Arabe.',
    'reading.arabicNote':
      'Ang pamagat ng kurso, pangalan ng aralin, pangalan ng guro at ang pangalan sa sertipiko ay inaayos sa panulat na ginamit sa pagsulat sa mga ito, sa direksiyon ng pagbasa na hinihingi mismo ng mga salita. Sinasabihan ang mga screen reader kung aling mga bahagi ang Arabe, upang makapagpalit sila ng boses.',
    'reading.mixed': 'Ang halong pangalan ay iisang pangalan pa rin.',
    'reading.mixedNote':
      'Ang pamagat na may dalawang panulat ay hindi pinipilit sa iisang direksiyon: bawat bahagi ay inaayos sa sarili nitong panulat, at pinagdudugtong ng browser ang mga ito ayon sa pagkakasunod na bibigkasin ng mambabasa.',
    'reading.langHeading': 'Wika',
    'reading.offered': 'Isinalin ang interface, at sinasabi nito kung gaano kabuo.',
    'reading.offeredNote':
      'Bilang ng mga wikang iniaalok bukod sa Ingles: {count}. Sinasabi ng pahina ng wika para sa bawat isa kung gaano karami ang talagang naisalin. Kapag ang isang screen ay hindi pa naisusulat sa iyong wika, ipinapakita ito sa Ingles nang buo, sa halip na mga pangungusap na Ingles sa gitna ng mga naisalin. Ang mga screen ng pagtuturo at ng kawani at ilang pahina ng akawnt, pamilya at pagbabayad ay hindi pa naihahanda para sa pagsasalin at nasa Ingles para sa lahat. Ang mga pamagat ng kurso, aralin at komento ay nananatili sa wikang ginamit ng sumulat.',
    'reading.rtl': 'Binabaligtad ng mga wikang kanan-pakaliwa ang buong pahina.',
    'reading.rtlNote':
      'Ang kursong kanan-pakaliwa na ipinapakita sa loob ng interface na kaliwa-pakanan ay nananatili sa sarili nitong direksiyon. Ang pagpili ng isa sa mga wikang ito ay bumabaligtad sa bar sa itaas, sa nabigasyon, sa mga abiso at sa footer: {languages}.',
    'reading.browser': 'Ang piniling wika ay naka-save sa browser na ito, hindi sa iyong akawnt.',
    'reading.browserNote':
      'Binabasa ang wika bago pa mag-sign in ang sinuman, kaya ang parehong tao sa ibang device ay makakakuha ng wika ng device na iyon hanggang palitan din niya iyon doon.',
    'reading.unreviewed': 'Wala pang salin na nabasa ng katutubong nagsasalita.',
    'reading.unreviewedNote':
      'Isinulat ang mga ito ng mga taong bumuo ng platform. Kung may salitang mali sa iyong paningin, pagkakamali namin iyon, at sinasabi iyon ng pahina ng wika para sa bawat wikang iniaalok nito.',
    'reading.missingHeading': 'Ang wala pa rito',
    'reading.back': 'Bumalik sa aking akawnt',
  },
  uz: {
    'reading.title': 'Oʻqish koʻrinishi',
    'reading.crumb': 'Oʻqish',
    'reading.lede':
      'Toʻrtta sozlama, tanlashingiz bilanoq qoʻllanadi. Ular hisobingizga emas, shu brauzerga tegishli: telefon va noutbuk turli oʻlchamni talab qiladi, umumiy qurilma esa boshqa birovning tanlovini meros qilib olmasligi kerak. Ulardan foydalanish uchun tizimga kirish shart emas.',
    'reading.now': 'Shu brauzerdagi sozlamalar mana shular.',
    'reading.saved': 'Shu brauzer uchun saqlandi.',
    'reading.notKept':
      'Bu brauzer sozlamani saqlab qolmadi. U faqat shu sahifada amal qiladi va keyingi sahifada yoʻqoladi.',
    'reading.textLegend': 'Matn oʻlchami',
    'reading.textNormal': 'Oddiy',
    'reading.textNormalNote': 'Platformaning qolgan qismi ishlatadigan oʻlcham.',
    'reading.textLarge': 'Kattaroq',
    'reading.textLargeNote': 'Bir pogʻona katta, sarlavhalar va asosiy matn birga.',
    'reading.textLargest': 'Eng katta',
    'reading.textLargestNote':
      'Ikki pogʻona katta. Yonma-yon turgan qatorlar ustma-ust joylashadi, shunda soʻzlar siqilmaydi.',
    'reading.contrastLegend': 'Kontrast',
    'reading.contrastNormal': 'Oddiy',
    'reading.contrastNormalNote': 'Oq va yashil, platforma qanday loyihalangan boʻlsa shunday.',
    'reading.contrastHigh': 'Aniqroq chiziqlar',
    'reading.contrastHighNote':
      'Ikkinchi darajali matn toʻqroq, chegaralar toʻqroq, sof oq fon va klaviatura turgan element atrofida qalinroq hoshiya. Yorqin yorugʻlikda va xira ekranda foydali.',
    'reading.motionLegend': 'Harakat',
    'reading.motionSystem': 'Qurilmamga ergash',
    'reading.motionSystemNote':
      'Agar qurilmangiz kamroq harakat soʻrasa, platforma bunga allaqachon quloq soladi.',
    'reading.motionReduce': 'Harakatni doim kamaytir',
    'reading.motionReduceNote':
      'Qurilma soʻramasa ham oʻtish effektlari va animatsiyali aylantirishni oʻchiradi.',
    'reading.reset': 'Standart sozlamalarga qaytish',
    'reading.trueHeading': 'Hech narsa sozlamasdan ham allaqachon amalda boʻlgan narsalar',
    'reading.keyboard': 'Klaviatura ishlaydi.',
    'reading.keyboardNote':
      'Klaviatura turgan elementning koʻrinadigan hoshiyasi bor, har bir sahifadagi birinchi toʻxtash joyi esa mazmunga oʻtkazadigan havoladir. Faqat sichqoncha yoki barmoq bilan yetib boriladigan boshqaruv elementi nuqson hisoblanadi va biz bundan xabardor boʻlishni istaymiz.',
    'reading.device': 'Qurilmangizning oʻz sozlamalari hurmat qilinadi.',
    'reading.deviceNote':
      'Agar qurilmangiz kamroq harakat soʻrasa, platforma uni kamaytiradi; yuqoridagi sozlama buni soʻramaydigan qurilma uchun. Interfeys ham, agar oʻsha til taklif etilgan boʻlsa, qurilmangiz soʻragan tilda ochiladi.',
    'reading.colours': 'Matn ranglari oʻlchanadi.',
    'reading.coloursNote':
      'Oddiy dizayndagi asosiy matn va fon ranglari platforma har safar oʻzgarganda avtomatik sinov orqali, xalqaro qulaylik yoʻriqnomalari oddiy matn uchun talab qiladigan kontrastga nisbatan tekshiriladi.',
    'reading.names': 'Shakllarning nomlari bor.',
    'reading.namesNote':
      'Kiritish maydonlari ekran oʻquvchi dastur oʻqib bera oladigan yorliq bilan quriladi, keng jadval esa sahifani yon tomonga surish oʻrniga oʻz ramkasi ichida aylantiriladi.',
    'reading.arabic': 'Arabcha arabcha sifatida teriladi.',
    'reading.arabicNote':
      'Kurs sarlavhasi, dars nomi, oʻqituvchining ismi va sertifikatdagi ism qaysi yozuvda yozilgan boʻlsa oʻsha yozuvda, soʻzlarning oʻzi talab qiladigan oʻqish yoʻnalishi bilan teriladi. Ekran oʻquvchi dasturlarga qaysi parchalar arabcha ekani aytiladi, shunda ular ovozni almashtira oladi.',
    'reading.mixed': 'Aralash nom ham baribir bitta nom.',
    'reading.mixedNote':
      'Ikki yozuvdagi sarlavha bitta yoʻnalishga majburlanmaydi: har bir qism oʻz yozuvida teriladi va brauzer ularni oʻquvchi aytadigan tartibda birlashtiradi.',
    'reading.langHeading': 'Til',
    'reading.offered': 'Interfeys tarjima qilingan va qanchalik toʻliqligini aytadi.',
    'reading.offeredNote':
      'Ingliz tilidan tashqari taklif etilgan tillar soni: {count}. Til sahifasi ularning har biri uchun qanchasi haqiqatan tarjima qilinganini koʻrsatadi. Biror ekran sizning tilingizda yozilmagan boʻlsa, u tarjima qilingan gaplar orasidagi inglizcha gaplar sifatida emas, butunligicha ingliz tilida koʻrsatiladi. Oʻqitish va xodimlar ekranlari hamda hisob, oila va toʻlovga oid ayrim sahifalar hali tarjimaga tayyorlanmagan va hamma uchun ingliz tilida. Kurs sarlavhalari, darslar va izohlar muallifi yozgan tilda qoladi.',
    'reading.rtl': 'Oʻngdan chapga yoziladigan tillar butun sahifani aylantiradi.',
    'reading.rtlNote':
      'Chapdan oʻngga interfeys ichida koʻrsatilgan oʻngdan chapga kurs oʻz yoʻnalishini saqlaydi. Quyidagi tillardan birini tanlash yuqori panel, navigatsiya, bildirishnomalar va sahifa pastki qismini teskari aks ettiradi: {languages}.',
    'reading.browser': 'Til tanlovi hisobingizda emas, shu brauzerda saqlanadi.',
    'reading.browserNote':
      'Til hech kim tizimga kirmasidan oldin oʻqiladi, shuning uchun oʻsha odam boshqa qurilmada, u yerda ham oʻzgartirmaguncha, oʻsha qurilmaning tilini oladi.',
    'reading.unreviewed': 'Hali hech bir tarjimani ona tilida soʻzlashuvchi oʻqimagan.',
    'reading.unreviewedNote':
      'Ularni platformani qurganlar yozgan. Biror soʻz sizga notoʻgʻri tuyulsa, xato bizniki, til sahifasi esa buni oʻzi taklif etadigan har bir til haqida aytadi.',
    'reading.missingHeading': 'Bu yerda hali yoʻq narsalar',
    'reading.back': 'Hisobimga qaytish',
  },
  kk: {
    'reading.title': 'Оқу көрінісі',
    'reading.crumb': 'Оқу',
    'reading.lede':
      'Төрт баптау, таңдаған сәтте қолданылады. Олар аккаунтыңызға емес, осы браузерге тиесілі: телефон мен ноутбукке әртүрлі өлшем керек, ал ортақ құрылғы басқа біреудің таңдауын мұраға алмауы тиіс. Оларды пайдалану үшін жүйеге кіру міндетті емес.',
    'reading.now': 'Осы браузердегі баптаулар осылар.',
    'reading.saved': 'Осы браузер үшін сақталды.',
    'reading.notKept':
      'Бұл браузер баптауды сақтамады. Ол тек осы бетте қолданылады және келесі бетте жоғалады.',
    'reading.textLegend': 'Мәтін өлшемі',
    'reading.textNormal': 'Қалыпты',
    'reading.textNormalNote': 'Платформаның қалған бөлігі қолданатын өлшем.',
    'reading.textLarge': 'Үлкенірек',
    'reading.textLargeNote': 'Бір саты үлкен, тақырыптар мен негізгі мәтін бірге.',
    'reading.textLargest': 'Ең үлкен',
    'reading.textLargestNote':
      'Екі саты үлкен. Қатар тұрған жолдар бірінің үстіне бірі орналасады, сонда сөздер қысылмайды.',
    'reading.contrastLegend': 'Контраст',
    'reading.contrastNormal': 'Қалыпты',
    'reading.contrastNormalNote': 'Ақ пен жасыл, платформа қалай жобаланса, солай.',
    'reading.contrastHigh': 'Айқынырақ сызықтар',
    'reading.contrastHighNote':
      'Қосалқы мәтін қоюырақ, жиектер қоюырақ, таза ақ фон және пернетақта тұрған элементтің айналасында қалыңырақ жиек сызық. Жарық қатты жерде және күңгірт экранда пайдалы.',
    'reading.motionLegend': 'Қозғалыс',
    'reading.motionSystem': 'Құрылғыма ілесу',
    'reading.motionSystemNote':
      'Құрылғыңыз азырақ қозғалыс сұраса, платформа оны онсыз да ескереді.',
    'reading.motionReduce': 'Қозғалысты әрдайым азайту',
    'reading.motionReduceNote':
      'Құрылғы сұрамаса да, ауысу әсерлері мен анимациялы айналдыруды өшіреді.',
    'reading.reset': 'Әдепкі баптауларға оралу',
    'reading.trueHeading': 'Ештеңе баптамай-ақ қазірдің өзінде орындалып тұрған нәрселер',
    'reading.keyboard': 'Пернетақта жұмыс істейді.',
    'reading.keyboardNote':
      'Пернетақта тұрған элементтің көрінетін жиек сызығы бар, ал әр беттегі алғашқы аялдама — мазмұнға өткізетін сілтеме. Тек тінтуірмен немесе саусақпен ғана жетуге болатын басқару элементі — ақау, және біз ол туралы білгіміз келеді.',
    'reading.device': 'Құрылғыңыздың өз баптаулары ескеріледі.',
    'reading.deviceNote':
      'Құрылғыңыз азырақ қозғалыс сұраса, платформа оны азайтады; жоғарыдағы баптау мұны сұрамайтын құрылғыға арналған. Интерфейс те, сол тіл ұсынылған болса, құрылғыңыз сұраған тілде ашылады.',
    'reading.colours': 'Мәтін түстері өлшенеді.',
    'reading.coloursNote':
      'Қалыпты дизайндағы негізгі мәтін мен фон түстері платформа өзгерген сайын автоматты сынақ арқылы, халықаралық қолжетімділік нұсқаулары кәдімгі мәтінге талап ететін контрастқа қатысты тексеріледі.',
    'reading.names': 'Пішіндердің атаулары бар.',
    'reading.namesNote':
      'Енгізу өрістері экраннан оқу бағдарламасы дауыстап айта алатын белгімен жасалады, ал кең кесте бетті бір жаққа итермей, өз жақтауының ішінде айналдырылады.',
    'reading.arabic': 'Араб тілі араб тілі ретінде теріледі.',
    'reading.arabicNote':
      'Курс тақырыбы, сабақ атауы, мұғалімнің аты және сертификаттағы ат қай жазумен жазылса, сол жазумен, сөздердің өзі талап ететін оқу бағытымен теріледі. Экраннан оқу бағдарламаларына қай үзінділер арабша екені айтылады, сонда олар дауысты ауыстыра алады.',
    'reading.mixed': 'Аралас атау да бәрібір бір атау.',
    'reading.mixedNote':
      'Екі жазудағы тақырып бір бағытқа мәжбүрленбейді: әр бөлік өз жазуымен теріледі, ал браузер оларды оқырман айтатын ретпен біріктіреді.',
    'reading.langHeading': 'Тіл',
    'reading.offered': 'Интерфейс аударылған және қаншалықты толық екенін айтады.',
    'reading.offeredNote':
      'Ағылшын тілінен басқа ұсынылған тілдер саны: {count}. Тіл беті олардың әрқайсысы үшін қаншасы шынымен аударылғанын көрсетеді. Қандай да бір экран сіздің тіліңізде жазылмаған болса, ол аударылған сөйлемдер арасындағы ағылшынша сөйлемдер ретінде емес, тұтастай ағылшын тілінде көрсетіледі. Оқыту және қызметкерлер экрандары мен аккаунтқа, отбасына және төлемге қатысты кейбір беттер әлі аудармаға дайындалмаған және барлығына ағылшын тілінде. Курс тақырыптары, сабақтар мен пікірлер авторы жазған тілде қалады.',
    'reading.rtl': 'Оңнан солға жазылатын тілдер бүкіл бетті аударады.',
    'reading.rtlNote':
      'Солдан оңға интерфейс ішінде көрсетілген оңнан солға курс өз бағытын сақтайды. Мына тілдердің бірін таңдау жоғарғы жолақты, навигацияны, хабарландыруларды және беттің төменгі бөлігін айнадай кері бұрады: {languages}.',
    'reading.browser': 'Тіл таңдауы аккаунтыңызда емес, осы браузерде сақталады.',
    'reading.browserNote':
      'Тіл ешкім жүйеге кірмей тұрып оқылады, сондықтан сол адам басқа құрылғыда, онда да өзгертпейінше, сол құрылғының тілін алады.',
    'reading.unreviewed': 'Әзірге ешбір аударманы ана тілінде сөйлейтін адам оқымаған.',
    'reading.unreviewedNote':
      'Оларды платформаны салғандар жазды. Бір сөз сізге дұрыс көрінбесе, қате біздікі, ал тіл беті мұны өзі ұсынатын әр тіл туралы айтады.',
    'reading.missingHeading': 'Мұнда әлі жоқ нәрселер',
    'reading.back': 'Аккаунтыма оралу',
  },
  az: {
    'reading.title': 'Oxu görünüşü',
    'reading.crumb': 'Oxu',
    'reading.lede':
      'Dörd ayar, seçdiyiniz anda tətbiq olunur. Onlar hesabınıza deyil, bu brauzerə aiddir: telefon və noutbuk fərqli ölçülər istəyir, ortaq cihaz isə başqasının seçimini miras almamalıdır. Onlardan istifadə etmək üçün daxil olmağınız lazım deyil.',
    'reading.now': 'Bu brauzerdəki ayarlar bunlardır.',
    'reading.saved': 'Bu brauzer üçün yadda saxlanıldı.',
    'reading.notKept':
      'Bu brauzer ayarı saxlamadı. O yalnız bu səhifədə qüvvədədir və növbəti səhifədə itəcək.',
    'reading.textLegend': 'Mətnin ölçüsü',
    'reading.textNormal': 'Adi',
    'reading.textNormalNote': 'Platformanın qalan hissəsinin istifadə etdiyi ölçü.',
    'reading.textLarge': 'Daha böyük',
    'reading.textLargeNote': 'Bir pillə böyük, başlıqlar və əsas mətn birlikdə.',
    'reading.textLargest': 'Ən böyük',
    'reading.textLargestNote':
      'İki pillə böyük. Yan-yana duran sətirlər üst-üstə düzülür ki, sözlər sıxılmasın.',
    'reading.contrastLegend': 'Kontrast',
    'reading.contrastNormal': 'Adi',
    'reading.contrastNormalNote': 'Ağ və yaşıl, platforma necə dizayn olunubsa elə.',
    'reading.contrastHigh': 'Daha aydın xətlər',
    'reading.contrastHighNote':
      'Daha tünd ikinci dərəcəli mətn, daha tünd haşiyələr, sadə ağ fon və klaviaturanın üzərində olduğu elementin ətrafında daha qalın kontur. Parlaq işıqda və solğun ekranda faydalıdır.',
    'reading.motionLegend': 'Hərəkət',
    'reading.motionSystem': 'Cihazıma uyğunlaş',
    'reading.motionSystemNote':
      'Cihazınız daha az hərəkət istəyirsə, platforma onsuz da buna əməl edir.',
    'reading.motionReduce': 'Hərəkəti həmişə azalt',
    'reading.motionReduceNote':
      'Cihaz istəməsə belə keçidləri və animasiyalı sürüşdürməni söndürür.',
    'reading.reset': 'İlkin ayarlara qayıt',
    'reading.trueHeading': 'Heç nə ayarlamadan artıq doğru olanlar',
    'reading.keyboard': 'Klaviatura işləyir.',
    'reading.keyboardNote':
      'Klaviaturanın üzərində olduğu elementin görünən konturu var və hər səhifədəki ilk dayanacaq məzmuna keçən keçiddir. Yalnız siçan və ya barmaqla çatmaq mümkün olan idarəetmə elementi qüsurdur və biz bundan xəbər tutmaq istəyirik.',
    'reading.device': 'Cihazınızın öz ayarlarına hörmət edilir.',
    'reading.deviceNote':
      'Cihazınız daha az hərəkət istəyirsə, platforma onu azaldır; yuxarıdakı ayar bunu istəməyən cihaz üçündür. İnterfeys də, həmin dil təklif olunursa, cihazınızın istədiyi dildə açılır.',
    'reading.colours': 'Mətn rəngləri ölçülür.',
    'reading.coloursNote':
      'Adi dizaynın əsas mətn və fon rəngləri platforma hər dəfə dəyişəndə avtomatik sınaqla, beynəlxalq əlçatanlıq təlimatlarının adi mətn üçün tələb etdiyi kontrasta görə yoxlanılır.',
    'reading.names': 'Formaların adları var.',
    'reading.namesNote':
      'Daxiletmə sahələri ekran oxuyucusunun səsləndirə biləcəyi etiketlə qurulur, enli cədvəl isə səhifəni yana itələmək əvəzinə öz çərçivəsinin içində sürüşdürülür.',
    'reading.arabic': 'Ərəbcə ərəbcə kimi yığılır.',
    'reading.arabicNote':
      'Kurs başlığı, dərsin adı, müəllimin adı və sertifikatdakı ad hansı yazı ilə yazılıbsa o yazı ilə, sözlərin özünün tələb etdiyi oxu istiqaməti ilə yığılır. Ekran oxuyucularına hansı hissələrin ərəbcə olduğu bildirilir ki, səsi dəyişə bilsinlər.',
    'reading.mixed': 'Qarışıq ad yenə də bir addır.',
    'reading.mixedNote':
      'İki yazı ilə yazılmış başlıq bir istiqamətə məcbur edilmir: hər hissə öz yazısı ilə yığılır və brauzer onları oxucunun deyəcəyi ardıcıllıqla birləşdirir.',
    'reading.langHeading': 'Dil',
    'reading.offered': 'İnterfeys tərcümə olunub və nə dərəcədə tam olduğunu bildirir.',
    'reading.offeredNote':
      'İngilis dilindən başqa təklif olunan dillərin sayı: {count}. Dil səhifəsi hər biri üçün nə qədərinin həqiqətən tərcümə olunduğunu göstərir. Hər hansı ekran sizin dilinizdə yazılmayıbsa, o, tərcümə olunmuş cümlələr arasında ingiliscə cümlələr kimi deyil, bütövlükdə ingiliscə göstərilir. Tədris və əməkdaş ekranları, eləcə də hesab, ailə və ödənişlə bağlı bəzi səhifələr hələ tərcüməyə hazırlanmayıb və hamı üçün ingiliscədir. Kurs başlıqları, dərslər və şərhlər müəllifin yazdığı dildə qalır.',
    'reading.rtl': 'Sağdan sola yazılan dillər bütün səhifəni çevirir.',
    'reading.rtlNote':
      'Soldan sağa interfeys içində göstərilən sağdan sola kurs öz istiqamətini saxlayır. Bu dillərdən birini seçmək yuxarı paneli, naviqasiyanı, bildirişləri və səhifənin aşağı hissəsini güzgü kimi əks etdirir: {languages}.',
    'reading.browser': 'Dil seçimi hesabınızda deyil, bu brauzerdə saxlanılır.',
    'reading.browserNote':
      'Dil hər kəs daxil olmazdan əvvəl oxunur, ona görə eyni şəxs başqa cihazda, orada da dəyişənə qədər, həmin cihazın dilini alır.',
    'reading.unreviewed': 'Hələ heç bir tərcüməni ana dili daşıyıcısı oxumayıb.',
    'reading.unreviewedNote':
      'Onları platformanı quranlar yazıb. Bir söz sizə səhv görünürsə, səhv bizimdir və dil səhifəsi bunu təklif etdiyi hər dil üçün deyir.',
    'reading.missingHeading': 'Hələ burada olmayanlar',
    'reading.back': 'Hesabıma qayıt',
  },
  tg: {
    'reading.title': 'Намуди хониш',
    'reading.crumb': 'Хониш',
    'reading.lede':
      'Чор танзим, ки ҳамон лаҳзаи интихоб татбиқ мешаванд. Онҳо ба ҳамин браузер тааллуқ доранд, на ба ҳисоби шумо: телефон ва ноутбук андозаҳои гуногун мехоҳанд ва дастгоҳи муштарак набояд интихоби каси дигарро мерос гирад. Барои истифодаи онҳо ворид шудан шарт нест.',
    'reading.now': 'Танзимҳои ин браузер ҳаминҳоянд.',
    'reading.saved': 'Барои ин браузер нигоҳ дошта шуд.',
    'reading.notKept':
      'Ин браузер танзимро нигоҳ надошт. Он танҳо дар ҳамин саҳифа амал мекунад ва дар саҳифаи оянда аз байн меравад.',
    'reading.textLegend': 'Андозаи матн',
    'reading.textNormal': 'Муқаррарӣ',
    'reading.textNormalNote': 'Андозае, ки боқимондаи платформа истифода мебарад.',
    'reading.textLarge': 'Калонтар',
    'reading.textLargeNote': 'Як зина калонтар, барои сарлавҳаҳо ва матни асосӣ якҷоя.',
    'reading.textLargest': 'Калонтарин',
    'reading.textLargestNote':
      'Ду зина калонтар. Сатрҳои паҳлу ба паҳлу болои ҳам ҷойгир мешаванд, то калимаҳо фишурда нашаванд.',
    'reading.contrastLegend': 'Тазод',
    'reading.contrastNormal': 'Муқаррарӣ',
    'reading.contrastNormalNote': 'Сафед ва сабз, чунон ки платформа тарҳрезӣ шудааст.',
    'reading.contrastHigh': 'Хатҳои равшантар',
    'reading.contrastHighNote':
      'Матни дуюмдараҷа тиратар, ҳошияҳо тиратар, заминаи сафеди сода ва хати гирди ғафстар дар атрофи он чизе, ки клавиатура дар болои он аст. Дар равшании тез ва дар экрани хира муфид аст.',
    'reading.motionLegend': 'Ҳаракат',
    'reading.motionSystem': 'Аз рӯи дастгоҳи ман',
    'reading.motionSystemNote':
      'Агар дастгоҳи шумо ҳаракати камтар хоҳад, платформа аллакай ба он гӯш медиҳад.',
    'reading.motionReduce': 'Ҳаракат ҳамеша кам шавад',
    'reading.motionReduceNote':
      'Гузаришҳо ва ҳаракати аниматсионии саҳифаро хомӯш мекунад, ҳатто агар дастгоҳ нахоҳад.',
    'reading.reset': 'Бозгашт ба танзимҳои пешфарз',
    'reading.trueHeading': 'Он чи бе ягон танзим аллакай дуруст аст',
    'reading.keyboard': 'Клавиатура кор мекунад.',
    'reading.keyboardNote':
      'Он чизе, ки клавиатура дар болои он аст, хати гирди намоён дорад ва истгоҳи аввал дар ҳар саҳифа пайвандест, ки ба мундариҷа мегузарад. Унсури идоракуние, ки танҳо бо муш ё ангушт ба он расидан мумкин аст, нуқс аст ва мо мехоҳем аз он огоҳ шавем.',
    'reading.device': 'Танзимҳои худи дастгоҳи шумо риоя мешаванд.',
    'reading.deviceNote':
      'Агар дастгоҳи шумо ҳаракати камтар хоҳад, платформа онро кам мекунад; танзими боло барои дастгоҳест, ки намехоҳад. Интерфейс низ бо забоне кушода мешавад, ки дастгоҳи шумо мехоҳад, агар он забон пешниҳод шуда бошад.',
    'reading.colours': 'Рангҳои матн чен карда мешаванд.',
    'reading.coloursNote':
      'Рангҳои асосии матн ва заминаи тарҳи муқаррариро ҳар боре, ки платформа тағйир меёбад, санҷиши худкор месанҷад, дар муқоиса бо тазоде, ки дастурҳои байналмилалии дастрасӣ барои матни одӣ талаб мекунанд.',
    'reading.names': 'Шаклҳо ном доранд.',
    'reading.namesNote':
      'Майдонҳои воридкунӣ бо барчаспе сохта мешаванд, ки барномаи хонандаи экран онро гуфта метавонад ва ҷадвали васеъ ба ҷои он ки саҳифаро ба як тараф тела диҳад, дар дохили чорчӯбаи худ ҳаракат мекунад.',
    'reading.arabic': 'Арабӣ ҳамчун арабӣ чида мешавад.',
    'reading.arabicNote':
      'Сарлавҳаи курс, номи дарс, номи омӯзгор ва номи рӯи шаҳодатнома бо ҳамон хате чида мешаванд, ки навишта шудаанд, бо самти хонише, ки худи калимаҳо талаб мекунанд. Ба барномаҳои хонандаи экран гуфта мешавад, ки кадом порчаҳо арабианд, то онҳо овозро иваз карда тавонанд.',
    'reading.mixed': 'Номи омехта боз ҳам як ном аст.',
    'reading.mixedNote':
      'Сарлавҳа бо ду хат ба як самт маҷбур карда намешавад: ҳар қисм бо хати худ чида мешавад ва браузер онҳоро бо ҳамон тартибе мепайвандад, ки хонанда мегӯяд.',
    'reading.langHeading': 'Забон',
    'reading.offered': 'Интерфейс тарҷума шудааст ва мегӯяд, ки то чӣ андоза пурра аст.',
    'reading.offeredNote':
      'Шумораи забонҳои пешниҳодшуда ғайр аз англисӣ: {count}. Саҳифаи забон барои ҳар яке мегӯяд, ки чӣ қадари он воқеан тарҷума шудааст. Агар ягон экран бо забони шумо навишта нашуда бошад, он пурра бо англисӣ нишон дода мешавад, на ҳамчун ҷумлаҳои англисӣ дар байни ҷумлаҳои тарҷумашуда. Экранҳои таълим ва кормандон ва баъзе саҳифаҳои ҳисоб, оила ва пардохт ҳанӯз барои тарҷума омода нашудаанд ва барои ҳама бо англисӣ мебошанд. Сарлавҳаҳои курсҳо, дарсҳо ва шарҳҳо бо ҳамон забоне мемонанд, ки муаллифашон навиштааст.',
    'reading.rtl': 'Забонҳои аз рост ба чап тамоми саҳифаро мегардонанд.',
    'reading.rtlNote':
      'Курси аз рост ба чап, ки дар дохили интерфейси аз чап ба рост нишон дода мешавад, самти худро нигоҳ медорад. Интихоби яке аз ин забонҳо навори боло, паймоиш, огоҳиномаҳо ва поёни саҳифаро чаппа мекунад: {languages}.',
    'reading.browser': 'Интихоби забон дар ҳамин браузер нигоҳ дошта мешавад, на дар ҳисоби шумо.',
    'reading.browserNote':
      'Забон пеш аз ворид шудани касе хонда мешавад, бинобар ин ҳамон шахс дар дастгоҳи дигар забони ҳамон дастгоҳро мегирад, то он ҷо низ онро иваз накунад.',
    'reading.unreviewed': 'Ҳанӯз ягон тарҷумаро гӯяндаи он забон нахондааст.',
    'reading.unreviewedNote':
      'Онҳоро одамоне навиштаанд, ки платформаро сохтаанд. Агар калимае ба назари шумо нодуруст бошад, ин хатои мост ва саҳифаи забон инро дар бораи ҳар забоне, ки пешниҳод мекунад, мегӯяд.',
    'reading.missingHeading': 'Он чи ҳанӯз дар ин ҷо нест',
    'reading.back': 'Бозгашт ба ҳисоби ман',
  },
  ky: {
    'reading.title': 'Окуу көрүнүшү',
    'reading.crumb': 'Окуу',
    'reading.lede':
      'Төрт жөндөө, тандаган заматта колдонулат. Алар аккаунтуңузга эмес, ушул браузерге таандык: телефон менен ноутбукка ар башка өлчөм керек, ал эми жалпы колдонулган түзмөк башка бирөөнүн тандоосун мураска албашы керек. Аларды колдонуу үчүн кирүүнүн кереги жок.',
    'reading.now': 'Ушул браузердеги жөндөөлөр мына ушулар.',
    'reading.saved': 'Ушул браузер үчүн сакталды.',
    'reading.notKept':
      'Бул браузер жөндөөнү сактаган жок. Ал ушул баракта гана иштейт жана кийинки баракта жоголот.',
    'reading.textLegend': 'Тексттин өлчөмү',
    'reading.textNormal': 'Кадимки',
    'reading.textNormalNote': 'Платформанын калган бөлүгү колдонгон өлчөм.',
    'reading.textLarge': 'Чоңураак',
    'reading.textLargeNote': 'Бир тепкич чоң, аталыштар менен негизги текст чогуу.',
    'reading.textLargest': 'Эң чоң',
    'reading.textLargestNote':
      'Эки тепкич чоң. Жанаша турган катарлар үстү-үстүнө жайгашат, ошондо сөздөр кысылбайт.',
    'reading.contrastLegend': 'Контраст',
    'reading.contrastNormal': 'Кадимки',
    'reading.contrastNormalNote': 'Ак жана жашыл, платформа кандай долбоорлонсо, ошондой.',
    'reading.contrastHigh': 'Даанараак сызыктар',
    'reading.contrastHighNote':
      'Кошумча текст коюураак, чектер коюураак, таза ак фон жана баскычтоп турган элементтин айланасында калыңыраак алкак сызык. Жарык күчтүү жерде жана күңүрт экранда пайдалуу.',
    'reading.motionLegend': 'Кыймыл',
    'reading.motionSystem': 'Түзмөгүмө ээрчүү',
    'reading.motionSystemNote':
      'Түзмөгүңүз азыраак кыймыл сураса, платформа аны ансыз деле эске алат.',
    'reading.motionReduce': 'Кыймылды дайыма азайтуу',
    'reading.motionReduceNote':
      'Түзмөк сурабаса да, өтүү эффекттерин жана анимациялуу сыдырууну өчүрөт.',
    'reading.reset': 'Демейки жөндөөлөргө кайтуу',
    'reading.trueHeading': 'Эч нерсе жөндөбөстөн эле аткарылып турган нерселер',
    'reading.keyboard': 'Баскычтоп иштейт.',
    'reading.keyboardNote':
      'Баскычтоп турган элементтин көрүнгөн алкак сызыгы бар, ал эми ар бир барактагы биринчи аялдама — мазмунга өткөргөн шилтеме. Чычкан же манжа менен гана жетүүгө мүмкүн болгон башкаруу элементи — мүчүлүштүк, жана биз ал тууралуу билгибиз келет.',
    'reading.device': 'Түзмөгүңүздүн өз жөндөөлөрү эске алынат.',
    'reading.deviceNote':
      'Түзмөгүңүз азыраак кыймыл сураса, платформа аны азайтат; жогорудагы жөндөө муну сурабаган түзмөк үчүн. Интерфейс да, ошол тил сунушталган болсо, түзмөгүңүз сураган тилде ачылат.',
    'reading.colours': 'Тексттин түстөрү өлчөнөт.',
    'reading.coloursNote':
      'Кадимки дизайндагы негизги текст жана фон түстөрү платформа өзгөргөн сайын автоматтык сыноо аркылуу, жеткиликтүүлүк боюнча эл аралык колдонмолор жөнөкөй текст үчүн талап кылган контрастка карата текшерилет.',
    'reading.names': 'Формалардын аталыштары бар.',
    'reading.namesNote':
      'Киргизүү талаалары экрандан окуу программасы айтып бере ала турган энбелги менен түзүлөт, ал эми кең таблица баракты капталга түртпөстөн, өз алкагынын ичинде сыдырылат.',
    'reading.arabic': 'Арабча арабча катары терилет.',
    'reading.arabicNote':
      'Курстун аталышы, сабактын аты, мугалимдин аты жана сертификаттагы ат кайсы жазуу менен жазылса, ошол жазуу менен, сөздөр өзү талап кылган окуу багыты менен терилет. Экрандан окуу программаларына кайсы үзүндүлөр арабча экени айтылат, ошондо алар үндү алмаштыра алат.',
    'reading.mixed': 'Аралаш ат баары бир бир эле ат.',
    'reading.mixedNote':
      'Эки жазуудагы аталыш бир багытка мажбурланбайт: ар бир бөлүк өз жазуусу менен терилет, ал эми браузер аларды окурман айта турган тартипте бириктирет.',
    'reading.langHeading': 'Тил',
    'reading.offered': 'Интерфейс которулган жана канчалык толук экенин айтат.',
    'reading.offeredNote':
      'Англис тилинен тышкары сунушталган тилдердин саны: {count}. Тил барагы алардын ар бири үчүн канчасы чындап которулганын көрсөтөт. Кайсы бир экран сиздин тилиңизде жазыла элек болсо, ал которулган сүйлөмдөрдүн арасындагы англисче сүйлөмдөр катары эмес, бүтүндөй англис тилинде көрсөтүлөт. Окутуу жана кызматкерлер экрандары, ошондой эле аккаунтка, үй-бүлөгө жана төлөмгө тиешелүү айрым барактар азырынча которууга даярдала элек жана баарына англис тилинде. Курстардын аталыштары, сабактар жана пикирлер автору жазган тилде калат.',
    'reading.rtl': 'Оңдон солго жазылган тилдер бүт баракты оодарат.',
    'reading.rtlNote':
      'Солдон оңго интерфейстин ичинде көрсөтүлгөн оңдон солго курс өз багытын сактайт. Төмөнкү тилдердин бирин тандоо жогорку тилкени, навигацияны, билдирмелерди жана барактын төмөнкү бөлүгүн күзгүдөй тескери бурат: {languages}.',
    'reading.browser': 'Тил тандоосу аккаунтуңузда эмес, ушул браузерде сакталат.',
    'reading.browserNote':
      'Тил эч ким кире электе окулат, ошондуктан ошол эле адам башка түзмөктө, ал жерде да өзгөртмөйүнчө, ошол түзмөктүн тилин алат.',
    'reading.unreviewed': 'Азырынча эч бир котормону ошол тилде сүйлөгөн адам окуган эмес.',
    'reading.unreviewedNote':
      'Аларды платформаны курган адамдар жазган. Бир сөз сизге туура эмес көрүнсө, ал биздин катабыз, жана тил барагы муну өзү сунуштаган ар бир тил тууралуу айтат.',
    'reading.missingHeading': 'Бул жерде азырынча жок нерселер',
    'reading.back': 'Аккаунтума кайтуу',
  },
  tk: {
    'reading.title': 'Okalyş görnüşi',
    'reading.crumb': 'Okamak',
    'reading.lede':
      'Dört sazlama, saýlan badyňyza ulanylýar. Olar hasabyňyza däl-de, şu brauzere degişli: telefon bilen noutbuk dürli ölçegi isleýär, umumy ulanylýan enjam bolsa başga biriniň saýlawyny miras almaly däl. Olary ulanmak üçin ulgama girmek hökman däl.',
    'reading.now': 'Şu brauzerdäki sazlamalar şulardyr.',
    'reading.saved': 'Şu brauzer üçin ýatda saklandy.',
    'reading.notKept':
      'Bu brauzer sazlamany saklamady. Ol diňe şu sahypada güýjünde bolar we indiki sahypada ýiter.',
    'reading.textLegend': 'Tekstiň ölçegi',
    'reading.textNormal': 'Adaty',
    'reading.textNormalNote': 'Platformanyň galan böleginiň ulanýan ölçegi.',
    'reading.textLarge': 'Ulurak',
    'reading.textLargeNote': 'Bir basgançak uly, sözbaşylar we esasy tekst bilelikde.',
    'reading.textLargest': 'Iň uly',
    'reading.textLargestNote':
      'Iki basgançak uly. Ýanaşyk duran hatarlar biri-biriniň üstünde ýerleşýär, şonda sözler gysylmaýar.',
    'reading.contrastLegend': 'Kontrast',
    'reading.contrastNormal': 'Adaty',
    'reading.contrastNormalNote': 'Ak we ýaşyl, platforma nähili taslanan bolsa şeýle.',
    'reading.contrastHigh': 'Has aýdyň çyzyklar',
    'reading.contrastHighNote':
      'Ikinji derejeli tekst has goýy, gyralar has goýy, sada ak fon we klawiaturanyň duran elementiniň daşynda has galyň çyzyk. Ýagty güýçli ýerde we öçügsi ekranda peýdaly.',
    'reading.motionLegend': 'Hereket',
    'reading.motionSystem': 'Enjamyma eýer',
    'reading.motionSystemNote':
      'Enjamyňyz az hereket soraýan bolsa, platforma muny eýýäm göz öňünde tutýar.',
    'reading.motionReduce': 'Hereketi hemişe azalt',
    'reading.motionReduceNote':
      'Enjam soramasa-da, geçiş täsirlerini we animasiýaly aýlamagy öçürýär.',
    'reading.reset': 'Başlangyç sazlamalara gaýt',
    'reading.trueHeading': 'Hiç zat sazlamazdan eýýäm dogry bolan zatlar',
    'reading.keyboard': 'Klawiatura işleýär.',
    'reading.keyboardNote':
      'Klawiaturanyň duran elementiniň görünýän çyzygy bar, her sahypadaky ilkinji duralga bolsa mazmuna geçirýän baglanyşykdyr. Diňe syçanjyk ýa-da barmak bilen ýetip bolýan dolandyryş elementi kemçilikdir we biz ondan habarly bolmak isleýäris.',
    'reading.device': 'Enjamyňyzyň öz sazlamalary hormatlanýar.',
    'reading.deviceNote':
      'Enjamyňyz az hereket soraýan bolsa, platforma ony azaldýar; ýokardaky sazlama muny soramaýan enjam üçindir. Interfeýs hem, şol dil hödürlenýän bolsa, enjamyňyzyň soraýan dilinde açylýar.',
    'reading.colours': 'Tekstiň reňkleri ölçenýär.',
    'reading.coloursNote':
      'Adaty dizaýnyň esasy tekst we fon reňkleri platforma her gezek üýtgände awtomatik synag bilen, elýeterlilik boýunça halkara görkezmeleriň adaty tekst üçin talap edýän kontrastyna görä barlanýar.',
    'reading.names': 'Formalaryň atlary bar.',
    'reading.namesNote':
      'Giriş meýdançalary ekran okaýjynyň aýdyp bilýän belligi bilen gurulýar, giň tablisa bolsa sahypany gapdala itmegiň deregine öz çarçuwasynyň içinde aýlanýar.',
    'reading.arabic': 'Arapça arapça hökmünde düzülýär.',
    'reading.arabicNote':
      'Kursuň ady, sapagyň ady, mugallymyň ady we şahadatnamadaky at haýsy ýazuwda ýazylan bolsa şol ýazuwda, sözleriň özüniň talap edýän okalyş ugry bilen düzülýär. Ekran okaýjylara haýsy bölekleriň arapçadygy aýdylýar, şonda olar sesi üýtgedip bilýär.',
    'reading.mixed': 'Garyşyk at hem ýene bir atdyr.',
    'reading.mixedNote':
      'Iki ýazuwdaky sözbaşy bir ugra mejbur edilmeýär: her bölek öz ýazuwynda düzülýär we brauzer olary okyjynyň aýtjak tertibinde birleşdirýär.',
    'reading.langHeading': 'Dil',
    'reading.offered': 'Interfeýs terjime edildi we näderejede doludygyny aýdýar.',
    'reading.offeredNote':
      'Iňlis dilinden başga hödürlenýän dilleriň sany: {count}. Dil sahypasy olaryň her biri üçin näçesiniň hakykatdan terjime edilendigini görkezýär. Haýsydyr bir ekran siziň diliňizde ýazylmadyk bolsa, ol terjime edilen sözlemleriň arasyndaky iňlisçe sözlemler hökmünde däl-de, tutuşlygyna iňlis dilinde görkezilýär. Okatmak we işgärler ekranlary hem-de hasaba, maşgala we töleglere degişli käbir sahypalar entek terjimä taýýarlanmady we hemmeler üçin iňlis dilindedir. Kurslaryň atlary, sapaklar we teswirler awtoryň ýazan dilinde galýar.',
    'reading.rtl': 'Sagdan çepe ýazylýan diller tutuş sahypany öwürýär.',
    'reading.rtlNote':
      'Çepden saga interfeýsiň içinde görkezilýän sagdan çepe kurs öz ugruny saklaýar. Şu dilleriň birini saýlamak ýokarky zolagy, nawigasiýany, bildirişleri we sahypanyň aşaky bölegini aýna ýaly tersine öwürýär: {languages}.',
    'reading.browser': 'Dil saýlawy hasabyňyzda däl-de, şu brauzerde saklanýar.',
    'reading.browserNote':
      'Dil hiç kim ulgama girmezden öň okalýar, şonuň üçin şol bir adam başga enjamda, ol ýerde-de üýtgedýänçä, şol enjamyň dilini alýar.',
    'reading.unreviewed': 'Entek hiç bir terjimäni ene dilinde gürleýji okamady.',
    'reading.unreviewedNote':
      'Olary platformany guran adamlar ýazdy. Bir söz size nädogry görünse, bu biziň ýalňyşlygymyz, dil sahypasy bolsa muny hödürleýän her dili barada aýdýar.',
    'reading.missingHeading': 'Bu ýerde entek ýok zatlar',
    'reading.back': 'Hasabyma gaýt',
  },
  ta: {
    'reading.title': 'வாசிப்புத் தோற்றம்',
    'reading.crumb': 'வாசிப்பு',
    'reading.lede':
      'நான்கு அமைப்புகள்; தேர்ந்தெடுத்த உடனே பொருந்தும். அவை இந்த உலாவிக்கு உரியவை, உங்கள் கணக்குக்கு அல்ல: தொலைபேசிக்கும் மடிக்கணினிக்கும் வெவ்வேறு அளவுகள் தேவை, பகிர்ந்து பயன்படுத்தும் சாதனம் வேறொருவரின் தேர்வைப் பெற்றுக்கொள்ளக் கூடாது. இவற்றைப் பயன்படுத்த உள்நுழைந்திருக்க வேண்டியதில்லை.',
    'reading.now': 'இந்த உலாவியில் உள்ள அமைப்புகள் இவை.',
    'reading.saved': 'இந்த உலாவிக்காகச் சேமிக்கப்பட்டது.',
    'reading.notKept':
      'இந்த உலாவி அமைப்பை வைத்துக்கொள்ளவில்லை. அது இந்தப் பக்கத்துக்கு மட்டுமே பொருந்தும்; அடுத்த பக்கத்தில் இருக்காது.',
    'reading.textLegend': 'எழுத்தின் அளவு',
    'reading.textNormal': 'இயல்பு',
    'reading.textNormalNote': 'தளத்தின் மற்ற பகுதிகள் பயன்படுத்தும் அளவு.',
    'reading.textLarge': 'பெரியது',
    'reading.textLargeNote': 'ஒரு படி பெரியது; தலைப்புகளும் உரையும் சேர்ந்து.',
    'reading.textLargest': 'மிகப் பெரியது',
    'reading.textLargestNote':
      'இரண்டு படி பெரியது. அருகருகே இருக்கும் வரிசைகள் ஒன்றன் கீழ் ஒன்றாக அடுக்கப்படும்; அதனால் சொற்கள் நெருக்கப்படாது.',
    'reading.contrastLegend': 'நிற வேறுபாடு',
    'reading.contrastNormal': 'இயல்பு',
    'reading.contrastNormalNote': 'வெள்ளையும் பச்சையும், தளம் வடிவமைக்கப்பட்டபடியே.',
    'reading.contrastHigh': 'தெளிவான கோடுகள்',
    'reading.contrastHighNote':
      'துணை உரை அடர்த்தியாக, எல்லைக் கோடுகள் அடர்த்தியாக, வெற்று வெள்ளைப் பின்னணி, விசைப்பலகை இருக்கும் உறுப்பைச் சுற்றித் தடிமனான கோடு. கடும் வெளிச்சத்திலும் மங்கலான திரையிலும் பயனுள்ளது.',
    'reading.motionLegend': 'அசைவு',
    'reading.motionSystem': 'என் சாதனத்தைப் பின்பற்று',
    'reading.motionSystemNote':
      'உங்கள் சாதனம் குறைந்த அசைவைக் கேட்டால், தளம் ஏற்கெனவே அதைக் கேட்கிறது.',
    'reading.motionReduce': 'எப்போதும் அசைவைக் குறை',
    'reading.motionReduceNote':
      'சாதனம் கேட்காவிட்டாலும் நிலைமாற்றங்களையும் அசைவூட்டப்பட்ட உருட்டலையும் நிறுத்துகிறது.',
    'reading.reset': 'இயல்புநிலைக்குத் திரும்பு',
    'reading.trueHeading': 'எதையும் அமைக்காமலேயே ஏற்கெனவே உண்மையாக இருப்பவை',
    'reading.keyboard': 'விசைப்பலகை வேலை செய்கிறது.',
    'reading.keyboardNote':
      'விசைப்பலகை இருக்கும் உறுப்புக்குக் கண்ணுக்குத் தெரியும் கோடு உண்டு; ஒவ்வொரு பக்கத்திலும் முதல் நிறுத்தம் உள்ளடக்கத்துக்குத் தாவும் இணைப்பு. சுட்டி அல்லது விரலால் மட்டுமே அடையக்கூடிய கட்டுப்பாடு ஒரு குறைபாடு; அதை நாங்கள் அறிய விரும்புகிறோம்.',
    'reading.device': 'உங்கள் சாதனத்தின் சொந்த அமைப்புகள் மதிக்கப்படுகின்றன.',
    'reading.deviceNote':
      'உங்கள் சாதனம் குறைந்த அசைவைக் கேட்டால், தளம் அதைக் குறைக்கிறது; மேலே உள்ள அமைப்பு அப்படிக் கேட்காத சாதனத்துக்கானது. உங்கள் சாதனம் கேட்கும் மொழி வழங்கப்பட்டிருந்தால், இடைமுகமும் அந்த மொழியிலேயே திறக்கும்.',
    'reading.colours': 'எழுத்து நிறங்கள் அளக்கப்படுகின்றன.',
    'reading.coloursNote':
      'இயல்பு வடிவமைப்பின் முதன்மையான எழுத்து மற்றும் பின்னணி நிறங்கள், தளம் மாறும் ஒவ்வொரு முறையும் ஒரு தானியங்கிச் சோதனையால், சாதாரண உரைக்கு அணுகல்தன்மை குறித்த பன்னாட்டு வழிகாட்டுதல்கள் கேட்கும் நிற வேறுபாட்டுடன் ஒப்பிட்டுச் சரிபார்க்கப்படுகின்றன.',
    'reading.names': 'படிவங்களுக்குப் பெயர்கள் உண்டு.',
    'reading.namesNote':
      'உள்ளீட்டுப் புலங்கள் திரை வாசிப்பான் அறிவிக்கக்கூடிய குறிச்சொல்லுடன் அமைக்கப்படுகின்றன; அகலமான அட்டவணை பக்கத்தைப் பக்கவாட்டில் தள்ளாமல் தன் சட்டகத்துக்குள்ளேயே உருளும்.',
    'reading.arabic': 'அரபு, அரபாகவே அமைக்கப்படுகிறது.',
    'reading.arabicNote':
      'பாடநெறியின் தலைப்பு, பாடத்தின் பெயர், ஆசிரியரின் பெயர், சான்றிதழில் உள்ள பெயர் ஆகியவை எழுதப்பட்ட எழுத்துமுறையிலேயே, சொற்களே கேட்கும் வாசிப்புத் திசையில் அமைக்கப்படுகின்றன. எந்தப் பகுதிகள் அரபு என்று திரை வாசிப்பான்களுக்குச் சொல்லப்படுகிறது; அதனால் அவை குரலை மாற்ற முடியும்.',
    'reading.mixed': 'கலந்த பெயரும் ஒரே பெயர்தான்.',
    'reading.mixedNote':
      'இரண்டு எழுத்துமுறைகளில் உள்ள தலைப்பு ஒரே திசைக்குள் திணிக்கப்படுவதில்லை: ஒவ்வொரு பகுதியும் தன் எழுத்துமுறையில் அமைக்கப்படுகிறது; வாசகர் சொல்லும் வரிசையில் உலாவி அவற்றை இணைக்கிறது.',
    'reading.langHeading': 'மொழி',
    'reading.offered':
      'இடைமுகம் மொழிபெயர்க்கப்பட்டுள்ளது; எவ்வளவு முழுமையாக என்பதையும் அது சொல்கிறது.',
    'reading.offeredNote':
      'ஆங்கிலம் தவிர வழங்கப்படும் மொழிகளின் எண்ணிக்கை: {count}. ஒவ்வொன்றிலும் உண்மையில் எவ்வளவு மொழிபெயர்க்கப்பட்டுள்ளது என்பதை மொழிப் பக்கம் கூறுகிறது. ஒரு திரை உங்கள் மொழியில் எழுதப்படாதிருந்தால், அது மொழிபெயர்க்கப்பட்ட வாக்கியங்களுக்கு இடையே ஆங்கில வாக்கியங்களாக அல்லாமல், முழுவதும் ஆங்கிலத்தில் காட்டப்படும். கற்பித்தல் மற்றும் பணியாளர் திரைகளும், கணக்கு, குடும்பம், கட்டணம் தொடர்பான சில பக்கங்களும் இன்னும் மொழிபெயர்ப்புக்குத் தயார்செய்யப்படவில்லை; அவை அனைவருக்கும் ஆங்கிலத்தில் உள்ளன. பாடநெறித் தலைப்புகள், பாடங்கள், கருத்துகள் ஆகியவை அவற்றை எழுதியவர் எழுதிய மொழியிலேயே இருக்கும்.',
    'reading.rtl': 'வலமிருந்து இடமாக எழுதப்படும் மொழிகள் முழுப் பக்கத்தையும் திருப்புகின்றன.',
    'reading.rtlNote':
      'இடமிருந்து வலமான இடைமுகத்துக்குள் காட்டப்படும் வலமிருந்து இடமான பாடநெறி தன் திசையைத் தக்கவைத்துக்கொள்கிறது. பின்வரும் மொழிகளில் ஒன்றைத் தேர்ந்தெடுத்தால் மேல் பட்டை, வழிசெலுத்தல், அறிவிப்புகள், அடிக்குறிப்பு ஆகியவை எதிர்ப்புறமாக மாறும்: {languages}.',
    'reading.browser': 'மொழித் தேர்வு இந்த உலாவியில் வைக்கப்படுகிறது, உங்கள் கணக்கில் அல்ல.',
    'reading.browserNote':
      'யாரும் உள்நுழைவதற்கு முன்பே மொழி படிக்கப்படுகிறது; எனவே அதே நபர் வேறு சாதனத்தில், அங்கேயும் மாற்றும் வரை, அந்தச் சாதனத்தின் மொழியையே பெறுவார்.',
    'reading.unreviewed': 'எந்த மொழிபெயர்ப்பையும் இன்னும் தாய்மொழி பேசுபவர் படிக்கவில்லை.',
    'reading.unreviewedNote':
      'அவற்றைத் தளத்தைக் கட்டியவர்கள் எழுதினார்கள். ஏதேனும் சொல் தவறாகத் தோன்றினால், தவறு எங்களுடையது; மொழிப் பக்கம் தான் வழங்கும் ஒவ்வொரு மொழிக்கும் இதையே சொல்கிறது.',
    'reading.missingHeading': 'இங்கே இன்னும் இல்லாதவை',
    'reading.back': 'என் கணக்குக்குத் திரும்பு',
  },
  ne: {
    'reading.title': 'पढ्ने देखावट',
    'reading.crumb': 'पढाइ',
    'reading.lede':
      'चार सेटिङ, छान्नेबित्तिकै लागू हुन्छन्। ती यही ब्राउजरका हुन्, तपाईंको खाताका होइनन्: फोन र ल्यापटपलाई फरक आकार चाहिन्छ, र साझा यन्त्रले अरू कसैको रोजाइ पाउनु हुँदैन। यी प्रयोग गर्न साइन इन भएको हुनुपर्दैन।',
    'reading.now': 'यस ब्राउजरका सेटिङ यिनै हुन्।',
    'reading.saved': 'यस ब्राउजरका लागि सुरक्षित गरियो।',
    'reading.notKept':
      'यस ब्राउजरले सेटिङ राखेन। यो यही पृष्ठमा मात्र लागू हुन्छ र अर्को पृष्ठमा रहने छैन।',
    'reading.textLegend': 'पाठको आकार',
    'reading.textNormal': 'सामान्य',
    'reading.textNormalNote': 'मञ्चका बाँकी भागले प्रयोग गर्ने आकार।',
    'reading.textLarge': 'ठूलो',
    'reading.textLargeNote': 'एक तह ठूलो, शीर्षक र मुख्य पाठ दुवैका लागि।',
    'reading.textLargest': 'सबैभन्दा ठूलो',
    'reading.textLargestNote':
      'दुई तह ठूलो। सँगसँगै रहेका पङ्क्तिहरू माथि-तल मिलाइन्छन्, जसले गर्दा शब्दहरू खुम्चिँदैनन्।',
    'reading.contrastLegend': 'कन्ट्रास्ट',
    'reading.contrastNormal': 'सामान्य',
    'reading.contrastNormalNote': 'सेतो र हरियो, मञ्च जसरी डिजाइन गरिएको थियो।',
    'reading.contrastHigh': 'अझ प्रस्ट रेखाहरू',
    'reading.contrastHighNote':
      'गौण पाठ अझ गाढा, किनाराहरू अझ गाढा, सादा सेतो पृष्ठभूमि, र किबोर्ड जुन कुरामा छ त्यसको वरिपरि बाक्लो रेखा। चर्को उज्यालोमा र मधुरो स्क्रिनमा उपयोगी।',
    'reading.motionLegend': 'गति',
    'reading.motionSystem': 'मेरो यन्त्र अनुसार',
    'reading.motionSystemNote': 'तपाईंको यन्त्रले कम गति माग्छ भने मञ्चले पहिल्यै त्यसलाई मान्छ।',
    'reading.motionReduce': 'गति सधैँ घटाउनुहोस्',
    'reading.motionReduceNote':
      'यन्त्रले नमागे पनि ट्रान्जिसन र एनिमेसनसहितको स्क्रोलिङ बन्द गर्छ।',
    'reading.reset': 'पूर्वनिर्धारित सेटिङमा फर्कनुहोस्',
    'reading.trueHeading': 'केही सेट नगरी पहिल्यै साँचो भएका कुरा',
    'reading.keyboard': 'किबोर्डले काम गर्छ।',
    'reading.keyboardNote':
      'किबोर्ड जुन कुरामा छ त्यसको देखिने रेखा हुन्छ, र हरेक पृष्ठको पहिलो बिसौनी सामग्रीमा फड्किने लिङ्क हो। माउस वा औँलाले मात्र पुग्न सकिने नियन्त्रण एउटा त्रुटि हो, र हामी त्यसबारे जान्न चाहन्छौँ।',
    'reading.device': 'तपाईंको यन्त्रका आफ्नै सेटिङको सम्मान गरिन्छ।',
    'reading.deviceNote':
      'तपाईंको यन्त्रले कम गति माग्छ भने मञ्चले त्यसलाई घटाउँछ; माथिको सेटिङ नमाग्ने यन्त्रका लागि हो। तपाईंको यन्त्रले माग्ने भाषा उपलब्ध गराइएको छ भने इन्टरफेस पनि त्यही भाषामा खुल्छ।',
    'reading.colours': 'पाठका रङ नापिन्छन्।',
    'reading.coloursNote':
      'सामान्य डिजाइनका पाठ र पृष्ठभूमिका मुख्य रङहरू, मञ्च परिवर्तन हुने हरेक पटक एउटा स्वचालित परीक्षणद्वारा, पहुँचसम्बन्धी अन्तर्राष्ट्रिय निर्देशिकाले साधारण पाठका लागि माग्ने कन्ट्रास्टसँग जाँचिन्छन्।',
    'reading.names': 'फारमहरूमा नाम हुन्छ।',
    'reading.namesNote':
      'इनपुट खानाहरू स्क्रिन रिडरले भन्न सक्ने लेबलसहित बनाइन्छन्, र फराकिलो तालिकाले पृष्ठलाई छेउतिर धकेल्नुको सट्टा आफ्नै फ्रेमभित्र स्क्रोल हुन्छ।',
    'reading.arabic': 'अरबी, अरबीकै रूपमा मिलाइन्छ।',
    'reading.arabicNote':
      'पाठ्यक्रमको शीर्षक, पाठको नाम, शिक्षकको नाम र प्रमाणपत्रमा रहेको नाम जुन लिपिमा लेखिएका थिए त्यही लिपिमा, शब्दहरू आफैँले माग्ने पढ्ने दिशामा मिलाइन्छन्। कुन अंश अरबी हुन् भनेर स्क्रिन रिडरलाई बताइन्छ, ताकि तिनले आवाज बदल्न सकून्।',
    'reading.mixed': 'मिश्रित नाम पनि एउटै नाम हो।',
    'reading.mixedNote':
      'दुई लिपिमा भएको शीर्षकलाई एउटै दिशामा जबरजस्ती राखिँदैन: हरेक भाग आफ्नै लिपिमा मिलाइन्छ, र ब्राउजरले तिनलाई पाठकले भन्ने क्रममा जोड्छ।',
    'reading.langHeading': 'भाषा',
    'reading.offered': 'इन्टरफेस अनुवाद गरिएको छ, र कति पूरा छ भनेर यसले भन्छ।',
    'reading.offeredNote':
      'अङ्ग्रेजीबाहेक उपलब्ध भाषाहरूको सङ्ख्या: {count}। भाषा पृष्ठले हरेकका लागि वास्तवमै कति अनुवाद भएको छ भनेर बताउँछ। कुनै स्क्रिन तपाईंको भाषामा लेखिएको छैन भने त्यो अनुवादित वाक्यहरूका बीचमा अङ्ग्रेजी वाक्यका रूपमा होइन, पूरै अङ्ग्रेजीमा देखाइन्छ। शिक्षण र कर्मचारीका स्क्रिन तथा खाता, परिवार र भुक्तानीका केही पृष्ठ अझै अनुवादका लागि तयार गरिएका छैनन् र सबैका लागि अङ्ग्रेजीमा छन्। पाठ्यक्रमका शीर्षक, पाठ र टिप्पणीहरू तिनका लेखकले लेखेकै भाषामा रहन्छन्।',
    'reading.rtl': 'दायाँबाट बायाँ लेखिने भाषाहरूले पूरै पृष्ठ फर्काउँछन्।',
    'reading.rtlNote':
      'बायाँबाट दायाँको इन्टरफेसभित्र देखाइएको दायाँबाट बायाँको पाठ्यक्रमले आफ्नै दिशा कायम राख्छ। यी भाषामध्ये एउटा छान्दा माथिल्लो पट्टी, नेभिगेसन, सूचनाहरू र फुटर उल्टिन्छन्: {languages}।',
    'reading.browser': 'भाषाको छनोट यही ब्राउजरमा राखिन्छ, तपाईंको खातामा होइन।',
    'reading.browserNote':
      'कसैले साइन इन गर्नुअघि नै भाषा पढिन्छ, त्यसैले उही व्यक्तिले अर्को यन्त्रमा, त्यहाँ पनि नबदलेसम्म, त्यही यन्त्रको भाषा पाउँछ।',
    'reading.unreviewed': 'अहिलेसम्म कुनै पनि अनुवाद मातृभाषीले पढेका छैनन्।',
    'reading.unreviewedNote':
      'ती यो मञ्च बनाउनेहरूले लेखेका हुन्। कुनै शब्द गलत लाग्यो भने गल्ती हाम्रै हो, र भाषा पृष्ठले आफूले उपलब्ध गराउने हरेक भाषाका बारेमा यही भन्छ।',
    'reading.missingHeading': 'यहाँ अझै नभएका कुरा',
    'reading.back': 'मेरो खातामा फर्कनुहोस्',
  },
};
