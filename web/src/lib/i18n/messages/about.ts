import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The about page: what the platform teaches, how a course gets here, why a
 * child is a learner and not an account, and who has read these words.
 *
 * Written on 2026-11-27, in the same twenty-seven languages as the
 * dashboard. **Written by the people who built the site and read by no
 * speaker**, which the page itself says (`about.langWritten`).
 *
 * `{ayah}` and `{spring}` are the two halves of the name and stay in Latin
 * letters; the sentence round them is the translator's. `{count}` is a
 * number already written in the reader's digits and always follows a colon,
 * so no language has to agree a noun with it. `{languages}` is a list of
 * language names the page writes. "AyahSpring" is never transliterated.
 *
 * There is no link inside a sentence: a link follows its paragraph
 * (`about.langSheet`), because where its words would sit is not the same
 * in every language.
 */
export const ABOUT: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'about.title': 'لماذا AyahSpring',
    'about.description':
      'ما الذي تعلّمه AyahSpring، وكيف تصل الدورة إلى المتعلّم، ولماذا يكون الطفل متعلّمًا لا حسابًا، ومن يُسمح له بالتدريس هنا.',
    'about.lede':
      '{ayah} هي الآية من القرآن، وهي في أصل معناها العلامة. و{spring} هو التجدّد: النماء الذي يأتي بعد الماء. والاسم هو ما تحاول المنصّة أن تكونه: الآية، ومن يتعلّم أن يحملها.',
    'about.bar':
      'كلّ ما يأتي يصف شيئًا تفعله المنصّة، لا شيئًا تنوي فعله. كُتبت هذه الصفحة لتبقى صحيحة حين تُشغَّل الميزات وتُوقَف، فهي تخبرك بالقاعدة لا بإعداد اليوم، وتفضّل أن تقول أقلّ على أن تقول شيئًا لا يصحّ إلا هذا الأسبوع.',
    'about.catTitle': 'فهرس واحد ونوعان من المتعلّمين',
    'about.catAudience':
      'الأطفال والكبار قرّاء مختلفون، ولذلك تعلن كلّ دورة لمن هي: للأطفال أو للكبار أو لكليهما. يمكن حصر الفهرس في فئة واحدة، والصفحة الرئيسية تفتح بابًا لكلّ فئة، ولا تظهر الدورة إلا تحت الفئة التي أعلنتها.',
    'about.catAges':
      'ويمكن للدورة أن تذكر أيضًا الأعمار التي كُتبت لها ضمن فئة المتعلّمين الصغار، حتى لا يصل ابن ستّ سنوات وابن خمس عشرة سنة إلى الرفّ نفسه. والدورة التي لا تذكر أعمارًا مفتوحة لكلّ الأعمار: السكوت ليس قيدًا، ولا يُفهم أبدًا على أنه قيد.',
    'about.howTitle': 'كيف تصل الدورة إلى هنا',
    'about.how1Lead': 'يكتبها معلّم.',
    'about.how1':
      'نسخة مسوّدة فيها أقسام ودروس ومصادر، واختبار إن كانت الدورة تُختبر. تُذكر المصادر لكلّ درس، لأن درسًا في الدين ينبغي أن يستطيع أن يقول من أين جاء.',
    'about.how2Lead': 'يراجعها شخص مأذون له.',
    'about.how2':
      'لا تُسند إلى المراجع إلا دورة في مادّة يحمل فيها إذنًا ساريًا، وقاعدة البيانات ترفض الإسناد في غير ذلك. وتضارب المصالح المعلَن يمنعه أيضًا. ولا يستطيع المؤلّف أن يمنح دورته الموافقة العلمية التي تجيز نشرها، ولو كان يحمل ذلك الإذن.',
    'about.how3Lead': 'تُنشر، ثم تُثبَّت.',
    'about.how3':
      'مالك المنصّة هو من ينشر. ومن تلك اللحظة تُجمَّد النسخة: لا تتغيّر الدروس ولا الاختبارات ولا الملفّات. التصحيح نسخة جديدة، والمتعلّم المسجَّل من قبل يبقى على النسخة التي بدأ بها، فلا تكون الشهادة أبدًا لدورة تغيّرت في صمت من تحتها.',
    'about.childTitle': 'الأطفال متعلّمون لا حسابات',
    'about.childNotice':
      'الطفل لا ينشئ حسابًا هنا. الحساب بيد أحد الوالدين أو وليّ الأمر، وهو يضيف الطفل متعلّمًا باسم وفئة عمرية ويرى تقدّمه. والطفل دون الثانية عشرة لا يكون له أبدًا بريد إلكتروني ولا كلمة مرور ولا تسجيل دخول خاص به.',
    'about.childLogin':
      'حيث تسمح المنصّة بذلك، يجوز لوليّ أمر موثَّق أن يجعل لطفل بلغ الثانية عشرة أو أكثر تسجيل دخول خاصًّا به. وليّ الأمر يختار كلمة المرور الأولى، ويستطيع إعادة تعيينها أو سحب تسجيل الدخول. هذا فعل وليّ الأمر: الطفل لا ينشئ حسابًا وحده أبدًا.',
    'about.childBand':
      'لا يوجد تاريخ ميلاد في أيّ مكان من النظام. الفئة العمرية (من خمس إلى سبع، ومن ثمانٍ إلى عشر، وهكذا) تكفي لمعرفة ما ينبغي أن يُعرض على الطفل، وهي أقلّ بكثير ممّا يمكن أن يضيع لو وقع خلل.',
    'about.childConsent':
      'حيث يشترط القانون موافقة والدية يمكن التحقّق منها قبل أن يستخدم الطفل خدمة على الإنترنت، فالشرط هو علاقة ولاية وخطوة تحقّق وسجلّ بمن وافق. والمنصّة تستطيع أن تحفظ الثلاثة. تفعيل هذا الشرط لبلد ما قرار المالك، يُتَّخذ بمشورة قانونية. وإلى أن يُفعَّل، يضيف الطفلَ البالغُ صاحب الحساب، ولا يضيف الطفل نفسه أبدًا.',
    'about.langTitle': 'الواجهة، ومن قرأها',
    'about.langOffered': 'اللغات التي تُعرض بها الواجهة: {count}',
    'about.langWritten':
      'كلّ واحدة منها غير الإنجليزية كتبها من بنوا هذه المنصّة، ولم يقرأ أيًّا منها شخص يتكلّمها. صفحة اللغة تقول ذلك بجانب كلّ لغة لا في حاشية، لأن «مترجَم» و«قرأه شخص يتكلّم اللغة» قولان مختلفان، والأوّل وحده هو الصحيح.',
    'about.langHeld':
      'حيث لم نستطع أن نكتب لغة بما يكفي للوثوق بما كتبناه، نعرض الإنجليزية مكانها إلى أن يقرأها أحد متكلّميها.',
    'about.langWhole': 'مكتوبة لكنّها غير معروضة إطلاقًا: {languages}',
    'about.langPartly':
      'اللغات التي تُعرض فيها شاشات مواقيت الصلاة والتاريخ الهجري والعدّاد بالإنجليزية: {count}. صفحة اللغة تذكر كلًّا منها مع النسبة التي تُعرض فعلًا على القارئ.',
    'about.langFix':
      'إن بدت لك كلمة خاطئة في لغتك، فورقة التصحيح هي مكان قول ذلك. لا تطلب حسابًا، وتعرض عليك الجملة الإنجليزية والترجمة الحالية جنبًا إلى جنب، وتغيّر الأسطر الخاطئة فقط. يُطبع اسمك بجانب اللغة إن قُبل ما أرسلته. وعنوان بريدك لا يُنشر أبدًا ولا يصير تسجيل دخول.',
    'about.langSheet': 'افتح ورقة التصحيح',
    'about.teachTitle': 'من يدرّس هنا',
    'about.teachAppoint':
      'التدريس بالتعيين. لا يصير أحد معلّمًا بإنشاء حساب: يمنحه المالك أو موظّفو الحوكمة بسبب مكتوب، وكذلك سحبه. وكلّ دورة تمرّ بالمراجعة أيًّا كان كاتبها.',
    'about.teachAsk':
      'يجوز لك أن تطلب. طلب التدريس يرسل مؤهّلاتك ورابطًا إلى درس درّسته، والمالك يقرأ الاثنين. الطلب لا يمنح شيئًا: هو طلب تعيين، والجواب قرار مكتوب تستطيع قراءته.',
    'about.teachPage':
      'يجوز للمعلّم أن ينشر صفحة عن نفسه. فإن فعل، ذكرته صفحة الدورة باسمه وأحالت إليها. وإن لم يفعل، قالت صفحة الدورة إن الدورة كتبها معلّم معيَّن ووافق عليها مراجع، وتركت الاسم. غياب الاسم خيار خصوصية، لا دورة أدنى.',
    'about.keptTitle': 'ما يُحفظ، وما لا يُعاد كتابته أبدًا',
    'about.keptProgress':
      'تقدّمك لك، والدورة التي دفعت ثمنها تبقى في حسابك. الشهادة تحمل رقمًا يستطيع أيّ أحد أن يبحث عنه بلا حساب، ويبقى التحقّق منها ممكنًا ولو أُوقفت الدورة لاحقًا.',
    'about.keptPayment':
      'سجلّ الدفع لا يُعاد كتابته أبدًا: التصحيح قيد جديد بجانب القديم، لا تعديل عليه. وتقييم المتعلّم للدورة إمّا أن يُنشر كما كتبه وإمّا أن يُسحب بسبب يستطيع أن يراه. ولا يستطيع الموظّفون أن يعيدوا كتابته إلى شيء آخر.',
    'about.cost':
      'التصفّح لا يكلّف شيئًا. تُشترى الدورة لمتعلّم واحد مسمّى: الشراء الواحد يغطّي متعلّمًا واحدًا، لا أسرة.',
  },
  ur: {
    'about.title': 'AyahSpring کیوں',
    'about.description':
      'AyahSpring کیا سکھاتا ہے، کورس طالبِ علم تک کیسے پہنچتا ہے، بچہ اکاؤنٹ نہیں بلکہ طالبِ علم کیوں ہے، اور یہاں پڑھانے کی اجازت کسے ہے۔',
    'about.lede':
      '{ayah} قرآن کی آیت ہے اور لفظ کے پرانے معنی میں نشانی۔ {spring} تجدید ہے: وہ نمو جو پانی کے بعد آتی ہے۔ یہ نام وہی ہے جو یہ پلیٹ فارم بننا چاہتا ہے: آیت، اور وہ شخص جو اسے اٹھانا سیکھ رہا ہے۔',
    'about.bar':
      'نیچے جو کچھ ہے وہ بتاتا ہے کہ پلیٹ فارم کیا کرتا ہے، یہ نہیں کہ کیا کرنے کا ارادہ رکھتا ہے۔ یہ صفحہ اس طرح لکھا گیا ہے کہ سہولتیں چالو اور بند ہوتی رہیں تب بھی درست رہے، اس لیے یہ آج کی ترتیب کے بجائے اصول بتاتا ہے، اور کم کہنا پسند کرتا ہے بہ نسبت اس کے کہ ایسی بات کہے جو صرف اسی ہفتے سچ ہو۔',
    'about.catTitle': 'ایک فہرست، دو طرح کے طالبِ علم',
    'about.catAudience':
      'بچے اور بڑے مختلف قاری ہیں، اس لیے ہر کورس بتاتا ہے کہ وہ کس کے لیے ہے: بچوں کے لیے، بڑوں کے لیے، یا دونوں کے لیے۔ فہرست کو ایک گروہ تک محدود کیا جا سکتا ہے، پہلا صفحہ دونوں کے لیے الگ دروازہ دیتا ہے، اور کورس صرف اسی گروہ کے تحت دکھائی دیتا ہے جس کا اس نے اعلان کیا۔',
    'about.catAges':
      'کورس یہ بھی بتا سکتا ہے کہ کم عمر طالبِ علموں کے گروہ میں وہ کن عمروں کے لیے لکھا گیا، تاکہ چھ سال کا بچہ اور پندرہ سال کا بچہ ایک ہی خانے پر نہ پہنچیں۔ جو کورس عمریں نہیں بتاتا وہ ہر عمر کے لیے کھلا ہے: خاموشی پابندی نہیں، اور اسے کبھی پابندی نہیں سمجھا جاتا۔',
    'about.howTitle': 'کورس یہاں کیسے پہنچتا ہے',
    'about.how1Lead': 'ایک استاد اسے لکھتا ہے۔',
    'about.how1':
      'ایک مسودہ نسخہ، جس میں حصے، اسباق، ماخذ اور، اگر کورس کا امتحان ہو تو، ایک کوئز ہوتا ہے۔ ماخذ ہر سبق کے لیے لکھے جاتے ہیں، کیونکہ دین کے بارے میں سبق کو بتا سکنا چاہیے کہ وہ کہاں سے آیا۔',
    'about.how2Lead': 'کوئی مجاز شخص اسے جانچتا ہے۔',
    'about.how2':
      'جائزہ لینے والے کو صرف اسی مضمون کا کورس دیا جا سکتا ہے جس میں اس کے پاس موجودہ اجازت ہو، ورنہ ڈیٹا بیس یہ تفویض رد کر دیتا ہے۔ مفاد کا ظاہر کیا گیا ٹکراؤ بھی اسے روکتا ہے۔ مصنف اپنے کورس کو وہ علمی منظوری نہیں دے سکتا جس سے وہ شائع ہو سکے، چاہے اس کے پاس وہ اجازت ہو۔',
    'about.how3Lead': 'یہ شائع ہوتا ہے، پھر ثابت کر دیا جاتا ہے۔',
    'about.how3':
      'پلیٹ فارم کا مالک شائع کرتا ہے۔ اس لمحے سے نسخہ منجمد ہے: اسباق، کوئز اور فائلیں بدل نہیں سکتیں۔ تصحیح ایک نیا نسخہ ہے، اور پہلے سے داخل طالبِ علم اسی نسخے پر رہتا ہے جس سے اس نے شروع کیا، اس لیے سند کبھی ایسے کورس کی نہیں ہوتی جو اس کے نیچے چپ چاپ بدل گیا ہو۔',
    'about.childTitle': 'بچے طالبِ علم ہیں، اکاؤنٹ نہیں',
    'about.childNotice':
      'بچہ یہاں خود اکاؤنٹ نہیں بناتا۔ اکاؤنٹ والد، والدہ یا سرپرست کے پاس ہوتا ہے، وہی بچے کو نام اور عمر کے گروہ کے ساتھ طالبِ علم کے طور پر شامل کرتے ہیں اور اس کی پیش رفت دیکھتے ہیں۔ بارہ سال سے کم عمر بچے کا اپنا ای میل پتا، پاس ورڈ یا سائن اِن کبھی نہیں ہوتا۔',
    'about.childLogin':
      'جہاں پلیٹ فارم اجازت دیتا ہے، ایک تصدیق شدہ سرپرست بارہ سال یا اس سے بڑے بچے کو اس کا اپنا سائن اِن دے سکتا ہے۔ پہلا پاس ورڈ سرپرست چنتا ہے، اور وہ اسے دوبارہ مقرر کر سکتا ہے یا سائن اِن واپس لے سکتا ہے۔ یہ سرپرست کا عمل ہے: بچہ کبھی اکیلے اکاؤنٹ نہیں بناتا۔',
    'about.childBand':
      'نظام میں کہیں بھی تاریخِ پیدائش نہیں ہے۔ عمر کا گروہ (پانچ سے سات، آٹھ سے دس، وغیرہ) یہ جاننے کے لیے کافی ہے کہ بچے کو کیا دکھایا جائے، اور اگر کچھ غلط ہو جائے تو کھونے کو بہت کم ہے۔',
    'about.childConsent':
      'جہاں قانون یہ شرط رکھتا ہے کہ بچے کے کسی آن لائن خدمت کو استعمال کرنے سے پہلے والدین کی قابلِ تصدیق رضامندی ہو، وہاں شرط سرپرستی کا رشتہ، تصدیق کا ایک قدم اور اس بات کا ریکارڈ ہے کہ کس نے رضامندی دی۔ پلیٹ فارم تینوں رکھ سکتا ہے۔ کسی ملک کے لیے یہ شرط چالو کرنا مالک کا فیصلہ ہے، جو قانونی مشورے سے کیا جاتا ہے۔ جب تک یہ چالو نہ ہو، بچے کو وہ بالغ شامل کرتا ہے جس کے پاس اکاؤنٹ ہے، بچہ خود کبھی نہیں۔',
    'about.langTitle': 'انٹرفیس، اور اسے کس نے پڑھا ہے',
    'about.langOffered': 'وہ زبانیں جن میں انٹرفیس پیش کیا جاتا ہے: {count}',
    'about.langWritten':
      'انگریزی کے سوا ان میں سے ہر ایک ان لوگوں نے لکھی جنہوں نے یہ پلیٹ فارم بنایا، اور ایک بھی کسی ایسے شخص نے نہیں پڑھی جو وہ زبان بولتا ہو۔ زبان کا صفحہ یہ بات حاشیے میں نہیں بلکہ ہر زبان کے ساتھ کہتا ہے، کیونکہ «ترجمہ شدہ» اور «زبان بولنے والے کا پڑھا ہوا» دو الگ دعوے ہیں، اور صرف پہلا سچ ہے۔',
    'about.langHeld':
      'جہاں ہم کوئی زبان اتنی اچھی نہ لکھ سکے کہ اپنے لکھے پر بھروسا کریں، وہاں ہم اس کی جگہ انگریزی دکھاتے ہیں جب تک کوئی بولنے والا اسے پڑھ نہ لے۔',
    'about.langWhole': 'لکھی ہوئی مگر بالکل پیش نہیں کی جاتیں: {languages}',
    'about.langPartly':
      'وہ زبانیں جن میں اوقاتِ نماز، ہجری تاریخ اور شمار کرنے والی اسکرینیں انگریزی میں دکھائی جاتی ہیں: {count}۔ زبان کا صفحہ ان میں سے ہر ایک کو اس حصے کے ساتھ درج کرتا ہے جو قاری کو واقعی دکھایا جاتا ہے۔',
    'about.langFix':
      'اگر آپ کو اپنی زبان میں کوئی لفظ غلط لگے تو تصحیح کا ورق اسے کہنے کی جگہ ہے۔ یہ کوئی اکاؤنٹ نہیں مانگتا، آپ کو انگریزی جملہ اور موجودہ ترجمہ ساتھ ساتھ دکھاتا ہے، اور آپ صرف غلط سطریں بدلتے ہیں۔ جو آپ نے بھیجا وہ قبول ہو جائے تو آپ کا نام زبان کے ساتھ چھاپا جاتا ہے۔ آپ کا ای میل پتا کبھی شائع نہیں ہوتا اور کبھی سائن اِن نہیں بنتا۔',
    'about.langSheet': 'تصحیح کا ورق کھولیں',
    'about.teachTitle': 'یہاں کون پڑھاتا ہے',
    'about.teachAppoint':
      'پڑھانا تقرری سے ہے۔ کوئی اکاؤنٹ بنا کر استاد نہیں بنتا: یہ مالک یا نظم و نسق کا عملہ لکھی ہوئی وجہ کے ساتھ دیتا ہے، اور اسے واپس لینا بھی اسی طرح ہے۔ ہر کورس پھر بھی جائزے سے گزرتا ہے، چاہے کسی نے لکھا ہو۔',
    'about.teachAsk':
      'آپ درخواست کر سکتے ہیں۔ پڑھانے کی درخواست آپ کی اہلیتیں اور آپ کے پڑھائے ہوئے ایک سبق کا ربط بھیجتی ہے، اور مالک دونوں پڑھتا ہے۔ درخواست سے کچھ نہیں ملتا: یہ تقرری کی گزارش ہے، اور جواب ایک لکھا ہوا فیصلہ ہے جو آپ پڑھ سکتے ہیں۔',
    'about.teachPage':
      'استاد اپنے بارے میں ایک صفحہ شائع کر سکتا ہے۔ اگر اس نے کیا ہو تو کورس کا صفحہ اس کا نام لیتا ہے اور اس کا ربط دیتا ہے۔ اگر نہ کیا ہو تو کورس کا صفحہ کہتا ہے کہ کورس ایک مقرر استاد نے لکھا اور ایک جائزہ لینے والے نے منظور کیا، اور نام چھوڑ دیتا ہے۔ نام کا نہ ہونا رازداری کا انتخاب ہے، کم تر کورس نہیں۔',
    'about.keptTitle': 'کیا رکھا جاتا ہے، اور کیا کبھی دوبارہ نہیں لکھا جاتا',
    'about.keptProgress':
      'آپ کی پیش رفت آپ کی ہے، اور جس کورس کی آپ نے قیمت ادا کی وہ آپ کے اکاؤنٹ میں رہتا ہے۔ سند پر ایک نمبر ہوتا ہے جسے کوئی بھی بغیر اکاؤنٹ کے دیکھ سکتا ہے، اور کورس بعد میں ختم کر دیا جائے تب بھی اس کی جانچ ہو سکتی ہے۔',
    'about.keptPayment':
      'ادائیگی کا ریکارڈ کبھی دوبارہ نہیں لکھا جاتا: تصحیح پرانے کے ساتھ ایک نیا اندراج ہے، اس میں ترمیم نہیں۔ کورس پر طالبِ علم کا تبصرہ یا تو ویسا ہی شائع ہوتا ہے جیسا اس نے لکھا، یا ایسی وجہ کے ساتھ واپس لیا جاتا ہے جو وہ دیکھ سکے۔ عملہ اسے کسی اور چیز میں نہیں بدل سکتا۔',
    'about.cost':
      'دیکھنے پر کچھ خرچ نہیں ہوتا۔ کورس ایک نام زد طالبِ علم کے لیے خریدا جاتا ہے: ایک خریداری ایک طالبِ علم کے لیے ہے، گھرانے کے لیے کبھی نہیں۔',
  },
  fa: {
    'about.title': 'چرا AyahSpring',
    'about.description':
      'AyahSpring چه می‌آموزد، دوره چگونه به یادگیرنده می‌رسد، چرا کودک یادگیرنده است نه حساب، و چه کسی اجازه دارد این‌جا درس بدهد.',
    'about.lede':
      '{ayah} آیه‌ای از قرآن است و در معنای کهن واژه، نشانه. {spring} نو شدن است: رویشی که پس از آب می‌آید. این نام همان چیزی است که این سکو می‌کوشد باشد: آیه، و کسی که می‌آموزد آن را با خود ببرد.',
    'about.bar':
      'هرچه در ادامه می‌آید کاری را وصف می‌کند که سکو انجام می‌دهد، نه کاری که قصدش را دارد. این صفحه طوری نوشته شده که با روشن و خاموش شدن قابلیت‌ها درست بماند؛ پس قاعده را می‌گوید نه تنظیم امروز را، و ترجیح می‌دهد کمتر بگوید تا چیزی بگوید که فقط همین هفته درست است.',
    'about.catTitle': 'یک فهرست، دو گونه یادگیرنده',
    'about.catAudience':
      'کودکان و بزرگسالان خوانندگان متفاوتی‌اند، پس هر دوره اعلام می‌کند برای کیست: کودکان، بزرگسالان یا هر دو. فهرست را می‌توان به یک گروه محدود کرد، صفحهٔ نخست برای هر یک از دو گروه دری دارد، و دوره فقط زیر گروهی دیده می‌شود که خودش اعلام کرده است.',
    'about.catAges':
      'دوره همچنین می‌تواند بگوید در گروه یادگیرندگان خردسال برای چه سن‌هایی نوشته شده، تا کودک شش‌ساله و نوجوان پانزده‌ساله به یک قفسه نرسند. دوره‌ای که سنی نمی‌گوید برای همهٔ سن‌ها باز است: سکوت محدودیت نیست و هرگز محدودیت خوانده نمی‌شود.',
    'about.howTitle': 'دوره چگونه به این‌جا می‌رسد',
    'about.how1Lead': 'آموزگاری آن را می‌نویسد.',
    'about.how1':
      'نسخه‌ای پیش‌نویس با بخش‌ها، درس‌ها، منابع و، اگر دوره آزمون داشته باشد، یک آزمون. منابع برای هر درس آورده می‌شود، چون درسی دربارهٔ دین باید بتواند بگوید از کجا آمده است.',
    'about.how2Lead': 'کسی که مجاز است آن را بررسی می‌کند.',
    'about.how2':
      'به بازبین فقط دوره‌ای در موضوعی سپرده می‌شود که برای آن مجوز معتبر دارد، و در غیر این صورت پایگاه داده این واگذاری را رد می‌کند. تعارض منافع اعلام‌شده نیز مانع آن است. نویسنده نمی‌تواند به دورهٔ خودش آن تأیید علمی را بدهد که اجازهٔ انتشارش را می‌دهد، حتی اگر آن مجوز را داشته باشد.',
    'about.how3Lead': 'منتشر می‌شود و سپس ثابت می‌ماند.',
    'about.how3':
      'مالک سکو منتشر می‌کند. از آن لحظه نسخه منجمد است: درس‌ها، آزمون‌ها و پرونده‌ها نمی‌توانند تغییر کنند. اصلاح، نسخه‌ای تازه است و یادگیرنده‌ای که پیش‌تر ثبت‌نام کرده روی همان نسخه‌ای می‌ماند که با آن آغاز کرد؛ پس گواهی هرگز برای دوره‌ای نیست که بی‌صدا زیر آن عوض شده باشد.',
    'about.childTitle': 'کودکان یادگیرنده‌اند، نه حساب',
    'about.childNotice':
      'کودک این‌جا ثبت‌نام نمی‌کند. حساب در دست پدر، مادر یا سرپرست است؛ او کودک را با نام و گروه سنی به‌عنوان یادگیرنده می‌افزاید و پیشرفتش را می‌بیند. کودک زیر دوازده سال هرگز نشانی ایمیل، گذرواژه یا ورود جداگانه‌ای از آن خود ندارد.',
    'about.childLogin':
      'هرجا سکو اجازه دهد، سرپرستِ تأییدشده می‌تواند به کودک دوازده‌ساله یا بزرگ‌تر ورودی از آن خودش بدهد. نخستین گذرواژه را سرپرست برمی‌گزیند و می‌تواند آن را بازنشانی کند یا ورود را پس بگیرد. این کار سرپرست است: کودک هرگز به‌تنهایی حساب نمی‌سازد.',
    'about.childBand':
      'در هیچ جای سامانه تاریخ تولد نیست. گروه سنی (پنج تا هفت، هشت تا ده، و مانند آن) برای دانستن این‌که چه چیزی باید به کودک نشان داده شود بس است، و اگر مشکلی پیش بیاید چیز بسیار کمتری برای از دست رفتن هست.',
    'about.childConsent':
      'هرجا قانون پیش از استفادهٔ کودک از خدمتی برخط رضایت قابل‌تأیید والدین را لازم بداند، شرط عبارت است از رابطهٔ سرپرستی، یک گام تأیید و ثبتِ این‌که چه کسی رضایت داده است. سکو می‌تواند هر سه را نگه دارد. روشن کردن این الزام برای یک کشور تصمیم مالک است که با مشورت حقوقی گرفته می‌شود. تا روشن نشده، کودک را بزرگسالی که حساب در دست اوست می‌افزاید، نه خود کودک.',
    'about.langTitle': 'رابط کاربری، و این‌که چه کسی آن را خوانده است',
    'about.langOffered': 'زبان‌هایی که رابط به آن‌ها عرضه می‌شود: {count}',
    'about.langWritten':
      'همهٔ آن‌ها جز انگلیسی را کسانی نوشته‌اند که این سکو را ساخته‌اند، و هیچ‌کدام را کسی که به آن زبان سخن می‌گوید نخوانده است. صفحهٔ زبان این را کنار هر زبان می‌گوید نه در پانویس، چون «ترجمه‌شده» و «خوانده‌شده به دست گویشور» دو ادعای جدا هستند و فقط اولی درست است.',
    'about.langHeld':
      'هرجا نتوانستیم زبانی را آن‌قدر خوب بنویسیم که به نوشتهٔ خود اعتماد کنیم، به جایش انگلیسی نشان می‌دهیم تا گویشوری آن را بخواند.',
    'about.langWhole': 'نوشته شده ولی اصلاً عرضه نمی‌شود: {languages}',
    'about.langPartly':
      'زبان‌هایی که صفحه‌های اوقات نماز، تاریخ هجری و شمارنده در آن‌ها به انگلیسی نشان داده می‌شود: {count}. صفحهٔ زبان هر یک را با سهمی که واقعاً به خواننده نشان داده می‌شود فهرست می‌کند.',
    'about.langFix':
      'اگر واژه‌ای در زبان خودتان به نظرتان نادرست آمد، برگهٔ تصحیح جای گفتن آن است. حسابی نمی‌خواهد، جملهٔ انگلیسی و ترجمهٔ کنونی را کنار هم نشانتان می‌دهد، و فقط سطرهای نادرست را عوض می‌کنید. اگر آنچه فرستاده‌اید پذیرفته شود، نامتان کنار آن زبان چاپ می‌شود. نشانی ایمیلتان هرگز منتشر نمی‌شود و هرگز به ورود بدل نمی‌شود.',
    'about.langSheet': 'باز کردن برگهٔ تصحیح',
    'about.teachTitle': 'چه کسی این‌جا درس می‌دهد',
    'about.teachAppoint':
      'آموزگاری با انتصاب است. هیچ‌کس با ثبت‌نام آموزگار نمی‌شود: مالک یا کارکنان راهبری آن را با دلیل نوشته‌شده می‌دهند و پس گرفتنش نیز همین‌گونه است. هر دوره، هر که نوشته باشدش، باز از بازبینی می‌گذرد.',
    'about.teachAsk':
      'می‌توانید درخواست کنید. درخواست تدریس، شایستگی‌هایتان و پیوندی به درسی که داده‌اید می‌فرستد و مالک هر دو را می‌خواند. درخواست چیزی نمی‌دهد: خواهشی برای انتصاب است و پاسخ، تصمیمی نوشته‌شده است که می‌توانید بخوانید.',
    'about.teachPage':
      'آموزگار می‌تواند صفحه‌ای دربارهٔ خود منتشر کند. اگر کرده باشد، صفحهٔ دوره نامش را می‌آورد و به آن پیوند می‌دهد. اگر نکرده باشد، صفحهٔ دوره می‌گوید دوره را آموزگاری منصوب نوشته و بازبینی تأیید کرده است و نام را نمی‌آورد. نبودن نام انتخابی برای حریم خصوصی است، نه نشانهٔ دوره‌ای کم‌ارزش‌تر.',
    'about.keptTitle': 'چه چیزی نگه داشته می‌شود و چه چیزی هرگز بازنویسی نمی‌شود',
    'about.keptProgress':
      'پیشرفت شما از آن شماست و دوره‌ای که بهایش را پرداخته‌اید در حسابتان می‌ماند. گواهی شماره‌ای دارد که هر کسی بی‌نیاز به حساب می‌تواند جست‌وجویش کند، و حتی اگر دوره بعدها کنار گذاشته شود باز می‌توان آن را بررسی کرد.',
    'about.keptPayment':
      'سابقهٔ پرداخت هرگز بازنویسی نمی‌شود: اصلاح، ثبتی تازه کنار ثبت پیشین است، نه ویرایش آن. نظر یادگیرنده دربارهٔ دوره یا همان‌گونه که نوشته منتشر می‌شود یا با دلیلی که می‌تواند ببیند برداشته می‌شود. کارکنان نمی‌توانند آن را به چیز دیگری بازنویسی کنند.',
    'about.cost':
      'نگاه کردن هزینه‌ای ندارد. دوره برای یک یادگیرندهٔ نام‌برده خریده می‌شود: هر خرید یک یادگیرنده را پوشش می‌دهد، نه یک خانواده را.',
  },
  'fa-af': {
    'about.title': 'چرا AyahSpring',
    'about.description':
      'AyahSpring چه می‌آموزاند، کورس چگونه به شاگرد می‌رسد، چرا طفل شاگرد است نه حساب، و چه کسی اجازه دارد این‌جا درس بدهد.',
    'about.lede':
      '{ayah} آیتی از قرآن است و در معنای قدیمی کلمه، نشانه. {spring} تازه شدن است: رویشی که پس از آب می‌آید. این نام همان چیزی است که این پلتفرم می‌کوشد باشد: آیت، و کسی که می‌آموزد آن را با خود ببرد.',
    'about.bar':
      'هرچه در پایین می‌آید کاری را بیان می‌کند که پلتفرم انجام می‌دهد، نه کاری که قصدش را دارد. این صفحه طوری نوشته شده که با روشن و خاموش شدن امکانات درست بماند؛ پس قاعده را می‌گوید نه تنظیم امروز را، و بهتر می‌داند کمتر بگوید تا چیزی بگوید که تنها همین هفته درست است.',
    'about.catTitle': 'یک فهرست، دو نوع شاگرد',
    'about.catAudience':
      'اطفال و بزرگسالان خوانندگان متفاوت‌اند، پس هر کورس اعلام می‌کند برای کیست: اطفال، بزرگسالان یا هر دو. فهرست را می‌توان به یک گروه محدود کرد، صفحهٔ اول برای هر یک از دو گروه دروازه‌ای دارد، و کورس تنها زیر گروهی دیده می‌شود که خودش اعلام کرده است.',
    'about.catAges':
      'کورس همچنان می‌تواند بگوید در گروه شاگردان خردسال برای کدام سن‌ها نوشته شده، تا طفل شش‌ساله و نوجوان پانزده‌ساله به یک قفسه نرسند. کورسی که سن نمی‌گوید برای همهٔ سن‌ها باز است: خاموشی محدودیت نیست و هرگز محدودیت خوانده نمی‌شود.',
    'about.howTitle': 'کورس چگونه به این‌جا می‌رسد',
    'about.how1Lead': 'یک استاد آن را می‌نویسد.',
    'about.how1':
      'یک نسخهٔ مسوده با بخش‌ها، درس‌ها، منابع و، اگر کورس امتحان داشته باشد، یک آزمون. منابع برای هر درس ذکر می‌شود، چون درسی دربارهٔ دین باید بتواند بگوید از کجا آمده است.',
    'about.how2Lead': 'کسی که صلاحیت دارد آن را بررسی می‌کند.',
    'about.how2':
      'به بازبین تنها کورسی در مضمونی سپرده می‌شود که برای آن اجازهٔ معتبر دارد، و در غیر آن دیتابیس این سپردن را رد می‌کند. تضاد منافع اعلام‌شده نیز مانع آن است. نویسنده نمی‌تواند به کورس خودش آن تأیید علمی را بدهد که اجازهٔ نشرش را می‌دهد، حتی اگر آن اجازه را داشته باشد.',
    'about.how3Lead': 'نشر می‌شود و سپس ثابت می‌ماند.',
    'about.how3':
      'مالک پلتفرم نشر می‌کند. از همان لحظه نسخه منجمد است: درس‌ها، آزمون‌ها و فایل‌ها تغییر کرده نمی‌توانند. اصلاح، یک نسخهٔ نو است و شاگردی که پیش‌تر ثبت‌نام کرده روی همان نسخه‌ای می‌ماند که با آن شروع کرد؛ پس تصدیق‌نامه هرگز برای کورسی نیست که بی‌صدا زیر آن تغییر کرده باشد.',
    'about.childTitle': 'اطفال شاگرد اند، نه حساب',
    'about.childNotice':
      'طفل این‌جا ثبت‌نام نمی‌کند. حساب در دست پدر، مادر یا سرپرست است؛ او طفل را با نام و گروه سنی به حیث شاگرد اضافه می‌کند و پیشرفتش را می‌بیند. طفل زیر دوازده سال هرگز ایمیل آدرس، رمز عبور یا ورود جداگانه از خود ندارد.',
    'about.childLogin':
      'هر جا پلتفرم اجازه بدهد، سرپرستِ تأییدشده می‌تواند به طفل دوازده‌ساله یا بزرگ‌تر ورودی از خودش بدهد. اولین رمز عبور را سرپرست انتخاب می‌کند و می‌تواند آن را دوباره تنظیم کند یا ورود را پس بگیرد. این کار سرپرست است: طفل هرگز به تنهایی حساب نمی‌سازد.',
    'about.childBand':
      'در هیچ جای سیستم تاریخ تولد نیست. گروه سنی (پنج تا هفت، هشت تا ده، و مانند آن) برای دانستن این‌که چه چیزی باید به طفل نشان داده شود کافی است، و اگر مشکلی پیش بیاید چیز بسیار کمتری برای از دست رفتن است.',
    'about.childConsent':
      'هر جا قانون پیش از استفادهٔ طفل از یک خدمت آنلاین رضایت قابل‌تأیید والدین را لازم بداند، شرط عبارت است از رابطهٔ سرپرستی، یک قدم تأیید و ثبتِ این‌که چه کسی رضایت داده است. پلتفرم می‌تواند هر سه را نگه دارد. روشن کردن این شرط برای یک کشور تصمیم مالک است که با مشورهٔ حقوقی گرفته می‌شود. تا روشن نشده، طفل را بزرگسالی که حساب در دست اوست اضافه می‌کند، نه خود طفل.',
    'about.langTitle': 'صفحه‌های برنامه، و این‌که چه کسی آن را خوانده است',
    'about.langOffered': 'زبان‌هایی که برنامه به آن‌ها عرضه می‌شود: {count}',
    'about.langWritten':
      'همهٔ آن‌ها به جز انگلیسی را کسانی نوشته‌اند که این پلتفرم را ساخته‌اند، و هیچ‌کدام را کسی که به آن زبان گپ می‌زند نخوانده است. صفحهٔ زبان این را در کنار هر زبان می‌گوید نه در پاورقی، چون «ترجمه‌شده» و «خوانده‌شده توسط گوینده» دو ادعای جدا استند و تنها اولی درست است.',
    'about.langHeld':
      'هر جا نتوانستیم زبانی را آن‌قدر خوب بنویسیم که به نوشتهٔ خود اعتماد کنیم، به جایش انگلیسی نشان می‌دهیم تا گوینده‌ای آن را بخواند.',
    'about.langWhole': 'نوشته شده ولی هیچ عرضه نمی‌شود: {languages}',
    'about.langPartly':
      'زبان‌هایی که صفحه‌های اوقات نماز، تاریخ هجری و شمارنده در آن‌ها به انگلیسی نشان داده می‌شود: {count}. صفحهٔ زبان هر یک را با سهمی که واقعاً به خواننده نشان داده می‌شود فهرست می‌کند.',
    'about.langFix':
      'اگر کلمه‌ای در زبان خودتان به نظرتان نادرست آمد، ورق تصحیح جای گفتن آن است. حساب نمی‌خواهد، جملهٔ انگلیسی و ترجمهٔ فعلی را پهلوی هم نشان‌تان می‌دهد، و تنها سطرهای نادرست را تغییر می‌دهید. اگر آنچه فرستاده‌اید قبول شود، نام‌تان در کنار آن زبان چاپ می‌شود. ایمیل آدرس‌تان هرگز نشر نمی‌شود و هرگز به ورود بدل نمی‌شود.',
    'about.langSheet': 'باز کردن ورق تصحیح',
    'about.teachTitle': 'چه کسی این‌جا درس می‌دهد',
    'about.teachAppoint':
      'تدریس با تقرر است. هیچ‌کس با ثبت‌نام استاد نمی‌شود: مالک یا کارمندان اداره آن را با دلیل نوشته‌شده می‌دهند و پس گرفتنش نیز همین‌طور است. هر کورس، هر که نوشته باشدش، باز هم از بازبینی می‌گذرد.',
    'about.teachAsk':
      'می‌توانید درخواست کنید. درخواست تدریس، شایستگی‌های‌تان و لینکی به درسی که داده‌اید می‌فرستد و مالک هر دو را می‌خواند. درخواست چیزی نمی‌دهد: خواهشی برای تقرر است و جواب، تصمیمی نوشته‌شده است که می‌توانید بخوانید.',
    'about.teachPage':
      'استاد می‌تواند صفحه‌ای دربارهٔ خود نشر کند. اگر کرده باشد، صفحهٔ کورس نامش را می‌آورد و به آن لینک می‌دهد. اگر نکرده باشد، صفحهٔ کورس می‌گوید کورس را یک استاد مقررشده نوشته و یک بازبین تأیید کرده است و نام را نمی‌آورد. نبودن نام انتخابی برای حریم خصوصی است، نه نشانهٔ کورسی کم‌ارزش‌تر.',
    'about.keptTitle': 'چه چیزی نگه داشته می‌شود و چه چیزی هرگز دوباره نوشته نمی‌شود',
    'about.keptProgress':
      'پیشرفت شما از شماست و کورسی که پولش را پرداخته‌اید در حساب‌تان می‌ماند. تصدیق‌نامه شماره‌ای دارد که هر کس بدون حساب می‌تواند جست‌وجویش کند، و حتی اگر کورس بعدها کنار گذاشته شود باز هم می‌توان آن را بررسی کرد.',
    'about.keptPayment':
      'ثبت پرداخت هرگز دوباره نوشته نمی‌شود: اصلاح، ثبتی نو در کنار ثبت قبلی است، نه تغییر آن. نظر شاگرد دربارهٔ کورس یا همان‌طور که نوشته نشر می‌شود یا با دلیلی که دیده می‌تواند برداشته می‌شود. کارمندان نمی‌توانند آن را به چیز دیگری دوباره بنویسند.',
    'about.cost':
      'دیدن هزینه ندارد. کورس برای یک شاگرد نام‌برده خریده می‌شود: هر خرید یک شاگرد را پوشش می‌دهد، نه یک خانواده را.',
  },
  tr: {
    'about.title': 'Neden AyahSpring',
    'about.description':
      'AyahSpring ne öğretir, bir kurs öğrenciye nasıl ulaşır, çocuk neden bir hesap değil bir öğrencidir ve burada kimin ders vermesine izin verilir.',
    'about.lede':
      '{ayah}, Kur’an’ın bir ayetidir ve sözcüğün eski anlamıyla bir işarettir. {spring} yenilenmedir: sudan sonra gelen büyüme. Bu ad, platformun olmaya çalıştığı şeydir: ayet ve onu taşımayı öğrenen kişi.',
    'about.bar':
      'Aşağıdaki her şey platformun yaptığı bir şeyi anlatır, yapmayı düşündüğü bir şeyi değil. Bu sayfa, özellikler açılıp kapandıkça doğru kalacak biçimde yazıldı; bu yüzden bugünkü ayarı değil kuralı söyler ve yalnızca bu hafta doğru olan bir şeyi söylemektense daha azını söylemeyi yeğler.',
    'about.catTitle': 'Tek katalog, iki tür öğrenci',
    'about.catAudience':
      'Çocuklar ve yetişkinler farklı okurlardır; bu yüzden bir kurs kimin için olduğunu bildirir: çocuklar, yetişkinler ya da her ikisi. Katalog tek bir kitleye daraltılabilir, ana sayfa ikisinin her biri için bir kapı sunar ve bir kurs yalnızca bildirdiği kitlenin altında görünür.',
    'about.catAges':
      'Bir kurs, küçük öğrenciler kitlesi içinde hangi yaşlar için yazıldığını da söyleyebilir; böylece altı yaşındaki ile on beş yaşındaki aynı rafa gelmez. Yaş belirtmeyen bir kurs her yaşa açıktır: sessizlik bir kısıtlama değildir ve hiçbir zaman öyle okunmaz.',
    'about.howTitle': 'Bir kurs buraya nasıl gelir',
    'about.how1Lead': 'Bir öğretmen onu yazar.',
    'about.how1':
      'Bölümleri, dersleri, kaynakları ve kurs sınavlıysa bir testi olan bir taslak sürüm. Kaynaklar her ders için gösterilir, çünkü din hakkındaki bir ders nereden geldiğini söyleyebilmelidir.',
    'about.how2Lead': 'Yetkili biri onu denetler.',
    'about.how2':
      'Bir denetçiye yalnızca geçerli yetkisinin bulunduğu konudaki bir kurs verilebilir; aksi hâlde veritabanı bu görevlendirmeyi reddeder. Bildirilmiş bir çıkar çatışması da buna engel olur. Yazar, o yetkiye sahip olsa bile kendi kursuna yayımlanmasını sağlayan ilmî onayı veremez.',
    'about.how3Lead': 'Yayımlanır ve sonra sabitlenir.',
    'about.how3':
      'Platformun sahibi yayımlar. O andan itibaren sürüm dondurulur: dersler, testler ve dosyalar değişemez. Düzeltme yeni bir sürümdür ve daha önce kaydolmuş bir öğrenci başladığı sürümde kalır; böylece bir sertifika hiçbir zaman altında sessizce değişmiş bir kurs için olmaz.',
    'about.childTitle': 'Çocuklar hesap değil, öğrencidir',
    'about.childNotice':
      'Bir çocuk burada kayıt olmaz. Hesap bir ebeveynde ya da velide durur; çocuğu bir ad ve bir yaş grubuyla öğrenci olarak o ekler ve ilerlemesini o görür. On iki yaşından küçük bir çocuğun hiçbir zaman kendine ait bir e-posta adresi, parolası ya da oturum açma bilgisi olmaz.',
    'about.childLogin':
      'Platformun izin verdiği yerde, doğrulanmış bir veli on iki yaşında ya da daha büyük bir çocuğa kendine ait bir oturum açma bilgisi verebilir. İlk parolayı veli seçer ve onu sıfırlayabilir ya da oturum açma bilgisini geri alabilir. Bu velinin işidir: bir çocuk hiçbir zaman tek başına hesap açmaz.',
    'about.childBand':
      'Sistemin hiçbir yerinde doğum tarihi yoktur. Bir yaş grubu (beş ile yedi, sekiz ile on ve benzeri) bir çocuğa ne gösterileceğini bilmek için yeterlidir ve bir şey ters giderse kaybedilecek çok daha az şey vardır.',
    'about.childConsent':
      'Yasanın, bir çocuk çevrimiçi bir hizmeti kullanmadan önce doğrulanabilir ebeveyn onayı istediği yerde koşul; bir velilik ilişkisi, bir doğrulama adımı ve kimin onay verdiğinin kaydıdır. Platform üçünü de tutabilir. Bu koşulu bir ülke için açmak, hukuki danışmanlıkla alınan sahibin kararıdır. Açılana kadar çocuğu, hesabı elinde tutan yetişkin ekler; çocuk kendini hiçbir zaman eklemez.',
    'about.langTitle': 'Arayüz ve onu kimin okuduğu',
    'about.langOffered': 'Arayüzün sunulduğu diller: {count}',
    'about.langWritten':
      'İngilizce dışında her biri bu platformu kuranlar tarafından yazıldı ve hiçbiri o dili konuşan biri tarafından okunmadı. Dil sayfası bunu bir dipnotta değil, her dilin yanında söyler; çünkü “çevrildi” ile “o dili konuşan biri okudu” iki ayrı iddiadır ve yalnızca ilki doğrudur.',
    'about.langHeld':
      'Bir dili, yazdığımıza güvenecek kadar iyi yazamadığımız yerde, o dili konuşan biri okuyana kadar yerine İngilizce gösteririz.',
    'about.langWhole': 'Yazılmış ama hiç sunulmayan: {languages}',
    'about.langPartly':
      'Namaz vakitleri, Hicri tarih ve sayaç ekranları İngilizce gösterilen diller: {count}. Dil sayfası her birini, okura gerçekten gösterilen payla birlikte listeler.',
    'about.langFix':
      'Kendi dilinizde bir sözcük size yanlış görünüyorsa bunu söylemenin yeri düzeltme sayfasıdır. Hesap istemez, İngilizce cümleyi ve geçerli çeviriyi yan yana gösterir ve yalnızca yanlış olan satırları değiştirirsiniz. Gönderdiğiniz kabul edilirse adınız dilin yanında yazılır. E-posta adresiniz hiçbir zaman yayımlanmaz ve hiçbir zaman bir oturum açma bilgisine dönüşmez.',
    'about.langSheet': 'Düzeltme sayfasını aç',
    'about.teachTitle': 'Burada kim ders verir',
    'about.teachAppoint':
      'Öğretmenlik atamayla olur. Kimse kayıt olarak öğretmen olmaz: bunu sahip ya da yönetişim görevlileri yazılı bir gerekçeyle verir ve geri alınması da böyledir. Kim yazmış olursa olsun her kurs yine de denetimden geçer.',
    'about.teachAsk':
      'İsteyebilirsiniz. Öğretmenlik başvurusu, niteliklerinizi ve verdiğiniz bir dersin bağlantısını gönderir; sahip ikisini de okur. Başvurmak hiçbir şey kazandırmaz: bu bir atama talebidir ve yanıtı okuyabileceğiniz yazılı bir karardır.',
    'about.teachPage':
      'Bir öğretmen kendisi hakkında bir sayfa yayımlayabilir. Yayımlamışsa kurs sayfası onun adını verir ve o sayfaya bağlantı kurar. Yayımlamamışsa kurs sayfası, kursun atanmış bir öğretmen tarafından yazıldığını ve bir denetçi tarafından onaylandığını söyler ve adı vermez. Adın bulunmaması bir gizlilik tercihidir, daha değersiz bir kurs değildir.',
    'about.keptTitle': 'Neler saklanır ve neler asla yeniden yazılmaz',
    'about.keptProgress':
      'İlerlemeniz sizindir ve parasını ödediğiniz bir kurs hesabınızda kalır. Bir sertifika, herkesin hesap gerekmeden sorgulayabileceği bir numara taşır ve kurs sonradan kaldırılsa bile doğrulanabilir.',
    'about.keptPayment':
      'Bir ödeme kaydı asla yeniden yazılmaz: düzeltme, eskisinin yanına eklenen yeni bir kayıttır, onun üzerinde bir değişiklik değildir. Bir öğrencinin kurs değerlendirmesi ya yazdığı gibi yayımlanır ya da görebileceği bir gerekçeyle geri çekilir. Görevliler onu başka bir şeye dönüştüremez.',
    'about.cost':
      'Bakmak ücretsizdir. Bir kurs adı belirtilen tek bir öğrenci için satın alınır: bir satın alma bir öğrenciyi kapsar, asla bir haneyi değil.',
  },
  id: {
    'about.title': 'Mengapa AyahSpring',
    'about.description':
      'Apa yang diajarkan AyahSpring, bagaimana sebuah kursus sampai kepada pelajar, mengapa anak adalah pelajar dan bukan akun, dan siapa yang boleh mengajar di sini.',
    'about.lede':
      '{ayah} adalah ayat Al-Qur’an dan, dalam arti lama kata itu, sebuah tanda. {spring} adalah pembaruan: pertumbuhan yang datang setelah air. Nama itu adalah apa yang ingin diwujudkan platform ini: ayat, dan orang yang belajar membawanya.',
    'about.bar':
      'Semua yang ada di bawah ini menjelaskan sesuatu yang dilakukan platform, bukan sesuatu yang direncanakannya. Halaman ini ditulis agar tetap benar ketika fitur dinyalakan dan dimatikan, sehingga yang disampaikan adalah aturannya, bukan setelan hari ini, dan halaman ini lebih memilih berkata sedikit daripada mengatakan sesuatu yang hanya benar minggu ini.',
    'about.catTitle': 'Satu katalog, dua jenis pelajar',
    'about.catAudience':
      'Anak-anak dan orang dewasa adalah pembaca yang berbeda, maka setiap kursus menyatakan untuk siapa ia dibuat: anak-anak, orang dewasa, atau keduanya. Katalog dapat dipersempit ke satu kelompok, halaman depan menyediakan satu pintu untuk masing-masing, dan sebuah kursus hanya muncul di bawah kelompok yang dinyatakannya.',
    'about.catAges':
      'Sebuah kursus juga dapat menyebutkan untuk usia berapa ia ditulis di dalam kelompok pelajar muda, sehingga anak enam tahun dan remaja lima belas tahun tidak tiba di rak yang sama. Kursus yang tidak menyebut usia terbuka untuk semua usia: diam bukanlah pembatasan dan tidak pernah dibaca sebagai pembatasan.',
    'about.howTitle': 'Bagaimana sebuah kursus sampai ke sini',
    'about.how1Lead': 'Seorang pengajar menulisnya.',
    'about.how1':
      'Sebuah versi draf, dengan bagian, pelajaran, sumber, dan kuis jika kursus itu diuji. Sumber dicantumkan untuk setiap pelajaran, karena pelajaran tentang agama harus dapat mengatakan dari mana asalnya.',
    'about.how2Lead': 'Seseorang yang berwenang memeriksanya.',
    'about.how2':
      'Seorang peninjau hanya dapat diberi kursus dalam bidang yang ia pegang izinnya yang masih berlaku, dan jika tidak, basis data menolak penugasan itu. Benturan kepentingan yang dinyatakan juga menghalanginya. Penulis tidak dapat memberi kursusnya sendiri persetujuan keilmuan yang membuatnya boleh diterbitkan, meskipun ia memegang izin itu.',
    'about.how3Lead': 'Kursus diterbitkan, lalu ditetapkan.',
    'about.how3':
      'Pemilik platform yang menerbitkan. Sejak saat itu versi dibekukan: pelajaran, kuis, dan berkas tidak dapat berubah. Koreksi adalah versi baru, dan pelajar yang sudah terdaftar tetap pada versi yang ia mulai, sehingga sertifikat tidak pernah diberikan untuk kursus yang diam-diam berubah di bawahnya.',
    'about.childTitle': 'Anak adalah pelajar, bukan akun',
    'about.childNotice':
      'Seorang anak tidak mendaftar di sini. Orang tua atau wali yang memegang akun, menambahkan anak sebagai pelajar dengan nama dan kelompok usia, dan melihat kemajuannya. Anak di bawah dua belas tahun tidak pernah memiliki alamat email, kata sandi, atau cara masuk sendiri.',
    'about.childLogin':
      'Jika platform mengizinkannya, wali yang terverifikasi dapat memberi anak berusia dua belas tahun ke atas cara masuk miliknya sendiri. Wali memilih kata sandi pertama, dan dapat mengatur ulang atau mencabut cara masuk itu. Itu tindakan wali: seorang anak tidak pernah membuat akun sendirian.',
    'about.childBand':
      'Tidak ada tanggal lahir di mana pun dalam sistem. Kelompok usia (lima sampai tujuh, delapan sampai sepuluh, dan seterusnya) sudah cukup untuk mengetahui apa yang sebaiknya ditampilkan kepada anak, dan jauh lebih sedikit yang hilang jika terjadi masalah.',
    'about.childConsent':
      'Jika hukum mewajibkan persetujuan orang tua yang dapat diverifikasi sebelum anak menggunakan layanan daring, syaratnya adalah hubungan perwalian, satu langkah verifikasi, dan catatan tentang siapa yang menyetujui. Platform dapat menyimpan ketiganya. Mengaktifkan kewajiban itu untuk sebuah negara adalah keputusan pemilik, yang diambil dengan nasihat hukum. Sebelum diaktifkan, anak ditambahkan oleh orang dewasa yang memegang akun, tidak pernah oleh anak itu sendiri.',
    'about.langTitle': 'Antarmuka, dan siapa yang telah membacanya',
    'about.langOffered': 'Bahasa yang tersedia untuk antarmuka: {count}',
    'about.langWritten':
      'Semuanya kecuali bahasa Inggris ditulis oleh orang-orang yang membangun platform ini, dan tidak satu pun telah dibaca oleh penuturnya. Halaman bahasa mengatakannya di samping setiap bahasa, bukan di catatan kaki, karena “diterjemahkan” dan “dibaca oleh penuturnya” adalah dua pernyataan yang berbeda, dan hanya yang pertama yang benar.',
    'about.langHeld':
      'Jika kami tidak dapat menulis suatu bahasa dengan cukup baik untuk memercayai tulisan kami, kami menampilkan bahasa Inggris sebagai gantinya sampai seorang penutur membacanya.',
    'about.langWhole': 'Sudah ditulis tetapi tidak ditawarkan sama sekali: {languages}',
    'about.langPartly':
      'Bahasa yang layar waktu salat, tanggal Hijriah, dan penghitungnya ditampilkan dalam bahasa Inggris: {count}. Halaman bahasa mencantumkan masing-masing beserta bagian yang benar-benar ditampilkan kepada pembaca.',
    'about.langFix':
      'Jika ada kata yang tampak salah dalam bahasa Anda sendiri, lembar koreksi adalah tempat untuk mengatakannya. Lembar itu tidak meminta akun, menampilkan kalimat bahasa Inggris dan terjemahan saat ini berdampingan, dan Anda hanya mengubah baris yang salah. Nama Anda dicantumkan di samping bahasa itu jika kiriman Anda diterima. Alamat email Anda tidak pernah diterbitkan dan tidak pernah menjadi cara masuk.',
    'about.langSheet': 'Buka lembar koreksi',
    'about.teachTitle': 'Siapa yang mengajar di sini',
    'about.teachAppoint':
      'Mengajar adalah melalui penunjukan. Tidak ada yang menjadi pengajar dengan mendaftar: pemilik atau staf tata kelola yang memberikannya, dengan alasan tertulis, dan begitu pula pencabutannya. Setiap kursus tetap melewati tinjauan, siapa pun penulisnya.',
    'about.teachAsk':
      'Anda boleh meminta. Melamar untuk mengajar mengirimkan kualifikasi Anda dan tautan ke pelajaran yang pernah Anda ajarkan, dan pemilik membaca keduanya. Melamar tidak memberikan apa pun: itu adalah permintaan penunjukan, dan jawabannya adalah keputusan tertulis yang dapat Anda baca.',
    'about.teachPage':
      'Seorang pengajar boleh menerbitkan halaman tentang dirinya. Jika sudah, halaman kursus menyebut namanya dan menautkan ke sana. Jika belum, halaman kursus mengatakan bahwa kursus itu ditulis oleh pengajar yang ditunjuk dan disetujui oleh seorang peninjau, dan tidak mencantumkan nama. Nama yang tidak ada adalah pilihan privasi, bukan kursus yang lebih rendah.',
    'about.keptTitle': 'Apa yang disimpan, dan apa yang tidak pernah ditulis ulang',
    'about.keptProgress':
      'Kemajuan Anda adalah milik Anda, dan kursus yang telah Anda bayar tetap ada di akun Anda. Sertifikat memuat nomor yang dapat dicari siapa saja tanpa akun, dan tetap dapat diperiksa meskipun kursusnya kelak ditarik.',
    'about.keptPayment':
      'Catatan pembayaran tidak pernah ditulis ulang: koreksi adalah entri baru di samping yang lama, bukan suntingan atasnya. Ulasan seorang pelajar tentang kursus diterbitkan sebagaimana ia menulisnya, atau ditarik dengan alasan yang dapat ia lihat. Staf tidak dapat menulis ulang menjadi sesuatu yang lain.',
    'about.cost':
      'Melihat-lihat tidak dikenai biaya. Sebuah kursus dibeli untuk satu pelajar yang disebut namanya: satu pembelian mencakup satu pelajar, tidak pernah satu rumah tangga.',
  },
  ms: {
    'about.title': 'Mengapa AyahSpring',
    'about.description':
      'Apa yang diajar oleh AyahSpring, bagaimana sesebuah kursus sampai kepada pelajar, mengapa kanak-kanak ialah pelajar dan bukan akaun, dan siapa yang dibenarkan mengajar di sini.',
    'about.lede':
      '{ayah} ialah ayat al-Quran dan, dalam makna lama perkataan itu, suatu tanda. {spring} ialah pembaharuan: pertumbuhan yang datang selepas air. Nama itu ialah apa yang cuba dicapai oleh platform ini: ayat, dan orang yang belajar membawanya.',
    'about.bar':
      'Semua yang di bawah menerangkan sesuatu yang dilakukan oleh platform, bukan sesuatu yang dirancangnya. Halaman ini ditulis supaya kekal benar apabila ciri dihidupkan dan dimatikan, maka ia memberitahu peraturannya, bukan tetapan hari ini, dan ia lebih rela berkata sedikit daripada mengatakan sesuatu yang hanya benar minggu ini.',
    'about.catTitle': 'Satu katalog, dua jenis pelajar',
    'about.catAudience':
      'Kanak-kanak dan orang dewasa ialah pembaca yang berbeza, maka setiap kursus menyatakan untuk siapa ia dibuat: kanak-kanak, orang dewasa, atau kedua-duanya. Katalog boleh dikecilkan kepada satu kumpulan, halaman utama menyediakan satu pintu bagi setiap satu, dan sesebuah kursus hanya muncul di bawah kumpulan yang dinyatakannya.',
    'about.catAges':
      'Sesebuah kursus juga boleh menyatakan untuk umur berapa ia ditulis dalam kumpulan pelajar muda, supaya kanak-kanak enam tahun dan remaja lima belas tahun tidak tiba di rak yang sama. Kursus yang tidak menyatakan umur terbuka kepada semua umur: diam bukan sekatan dan tidak pernah dibaca sebagai sekatan.',
    'about.howTitle': 'Bagaimana sesebuah kursus sampai ke sini',
    'about.how1Lead': 'Seorang guru menulisnya.',
    'about.how1':
      'Satu versi draf, dengan bahagian, pelajaran, sumber dan kuiz jika kursus itu diuji. Sumber dinyatakan bagi setiap pelajaran, kerana pelajaran tentang agama perlu dapat mengatakan dari mana asalnya.',
    'about.how2Lead': 'Seseorang yang diberi kuasa menyemaknya.',
    'about.how2':
      'Seorang penyemak hanya boleh diberi kursus dalam subjek yang dia memegang kebenaran yang masih sah, dan jika tidak, pangkalan data menolak penugasan itu. Percanggahan kepentingan yang diisytiharkan juga menghalangnya. Penulis tidak boleh memberi kursusnya sendiri kelulusan ilmiah yang membolehkannya diterbitkan, walaupun dia memegang kebenaran itu.',
    'about.how3Lead': 'Ia diterbitkan, kemudian ditetapkan.',
    'about.how3':
      'Pemilik platform yang menerbitkan. Sejak saat itu versi dibekukan: pelajaran, kuiz dan fail tidak boleh berubah. Pembetulan ialah versi baharu, dan pelajar yang sudah mendaftar kekal pada versi yang dimulakannya, maka sijil tidak pernah diberi untuk kursus yang berubah secara senyap di bawahnya.',
    'about.childTitle': 'Kanak-kanak ialah pelajar, bukan akaun',
    'about.childNotice':
      'Seorang kanak-kanak tidak mendaftar di sini. Ibu bapa atau penjaga yang memegang akaun, menambah kanak-kanak sebagai pelajar dengan nama dan kumpulan umur, dan melihat kemajuannya. Kanak-kanak di bawah dua belas tahun tidak pernah mempunyai alamat e-mel, kata laluan atau log masuk sendiri.',
    'about.childLogin':
      'Jika platform membenarkannya, penjaga yang disahkan boleh memberi kanak-kanak berumur dua belas tahun ke atas log masuk miliknya sendiri. Penjaga memilih kata laluan pertama, dan boleh menetapkannya semula atau menarik balik log masuk itu. Itu tindakan penjaga: seorang kanak-kanak tidak pernah membuat akaun sendirian.',
    'about.childBand':
      'Tiada tarikh lahir di mana-mana dalam sistem. Kumpulan umur (lima hingga tujuh, lapan hingga sepuluh, dan seterusnya) sudah cukup untuk mengetahui apa yang patut ditunjukkan kepada kanak-kanak, dan jauh lebih sedikit yang hilang jika berlaku masalah.',
    'about.childConsent':
      'Jika undang-undang menghendaki persetujuan ibu bapa yang boleh disahkan sebelum kanak-kanak menggunakan perkhidmatan dalam talian, syaratnya ialah hubungan penjagaan, satu langkah pengesahan dan rekod tentang siapa yang bersetuju. Platform boleh menyimpan ketiga-tiganya. Menghidupkan kehendak itu untuk sesebuah negara ialah keputusan pemilik, yang dibuat dengan nasihat undang-undang. Sebelum dihidupkan, kanak-kanak ditambah oleh orang dewasa yang memegang akaun, tidak pernah oleh kanak-kanak itu sendiri.',
    'about.langTitle': 'Antara muka, dan siapa yang telah membacanya',
    'about.langOffered': 'Bahasa yang ditawarkan untuk antara muka: {count}',
    'about.langWritten':
      'Semuanya kecuali bahasa Inggeris ditulis oleh mereka yang membina platform ini, dan tiada satu pun telah dibaca oleh penuturnya. Halaman bahasa menyatakannya di sisi setiap bahasa, bukan dalam nota kaki, kerana “diterjemahkan” dan “dibaca oleh penuturnya” ialah dua dakwaan yang berbeza, dan hanya yang pertama benar.',
    'about.langHeld':
      'Jika kami tidak dapat menulis sesuatu bahasa dengan cukup baik untuk mempercayai tulisan kami, kami menunjukkan bahasa Inggeris sebagai ganti sehingga seorang penutur membacanya.',
    'about.langWhole': 'Sudah ditulis tetapi tidak ditawarkan langsung: {languages}',
    'about.langPartly':
      'Bahasa yang skrin waktu solat, tarikh Hijrah dan pembilangnya ditunjukkan dalam bahasa Inggeris: {count}. Halaman bahasa menyenaraikan setiap satu bersama bahagian yang benar-benar ditunjukkan kepada pembaca.',
    'about.langFix':
      'Jika ada perkataan yang kelihatan salah dalam bahasa anda sendiri, helaian pembetulan ialah tempat untuk menyatakannya. Ia tidak meminta akaun, menunjukkan ayat bahasa Inggeris dan terjemahan semasa bersebelahan, dan anda hanya menukar baris yang salah. Nama anda dicetak di sisi bahasa itu jika kiriman anda diterima. Alamat e-mel anda tidak pernah diterbitkan dan tidak pernah menjadi log masuk.',
    'about.langSheet': 'Buka helaian pembetulan',
    'about.teachTitle': 'Siapa yang mengajar di sini',
    'about.teachAppoint':
      'Mengajar adalah melalui pelantikan. Tiada sesiapa menjadi guru dengan mendaftar: pemilik atau kakitangan tadbir urus yang memberikannya, dengan sebab bertulis, dan begitu juga penarikannya. Setiap kursus tetap melalui semakan, sesiapa pun penulisnya.',
    'about.teachAsk':
      'Anda boleh memohon. Memohon untuk mengajar menghantar kelayakan anda dan pautan kepada pelajaran yang pernah anda ajar, dan pemilik membaca kedua-duanya. Memohon tidak memberi apa-apa: ia permintaan pelantikan, dan jawapannya ialah keputusan bertulis yang boleh anda baca.',
    'about.teachPage':
      'Seorang guru boleh menerbitkan halaman tentang dirinya. Jika sudah, halaman kursus menamakannya dan memaut ke sana. Jika belum, halaman kursus menyatakan bahawa kursus itu ditulis oleh guru yang dilantik dan diluluskan oleh seorang penyemak, dan tidak meletakkan nama. Nama yang tiada ialah pilihan privasi, bukan kursus yang lebih rendah.',
    'about.keptTitle': 'Apa yang disimpan, dan apa yang tidak pernah ditulis semula',
    'about.keptProgress':
      'Kemajuan anda milik anda, dan kursus yang telah anda bayar kekal dalam akaun anda. Sijil membawa nombor yang boleh dicari oleh sesiapa sahaja tanpa akaun, dan ia masih boleh disemak walaupun kursus itu kemudiannya ditamatkan.',
    'about.keptPayment':
      'Rekod bayaran tidak pernah ditulis semula: pembetulan ialah catatan baharu di sisi yang lama, bukan suntingan ke atasnya. Ulasan seorang pelajar tentang kursus sama ada diterbitkan seperti yang ditulisnya atau ditarik balik dengan sebab yang boleh dilihatnya. Kakitangan tidak boleh menulisnya semula menjadi sesuatu yang lain.',
    'about.cost':
      'Melihat-lihat tidak dikenakan bayaran. Sesebuah kursus dibeli untuk seorang pelajar yang dinamakan: satu pembelian meliputi seorang pelajar, tidak pernah satu isi rumah.',
  },
  bn: {
    'about.title': 'কেন AyahSpring',
    'about.description':
      'AyahSpring কী শেখায়, একটি কোর্স কীভাবে শিক্ষার্থীর কাছে পৌঁছায়, শিশু কেন একটি অ্যাকাউন্ট নয় বরং একজন শিক্ষার্থী, এবং এখানে কাকে পড়ানোর অনুমতি দেওয়া হয়।',
    'about.lede':
      '{ayah} হলো কুরআনের একটি আয়াত, আর শব্দটির পুরোনো অর্থে একটি নিদর্শন। {spring} হলো নবায়ন: পানির পরে যে বৃদ্ধি আসে। এই নামটিই সেই জিনিস, যা এই প্ল্যাটফর্ম হতে চায়: আয়াত, এবং যে মানুষটি তা বহন করতে শিখছে।',
    'about.bar':
      'নিচের সবকিছুই এমন কিছুর বর্ণনা যা প্ল্যাটফর্ম করে, যা করার ইচ্ছা রাখে তা নয়। এই পাতাটি এমনভাবে লেখা যে সুবিধাগুলো চালু ও বন্ধ হলেও এটি সত্য থাকে; তাই এটি আজকের সেটিং নয়, নিয়মটি বলে, এবং শুধু এই সপ্তাহে সত্য এমন কিছু বলার চেয়ে কম বলাই পছন্দ করে।',
    'about.catTitle': 'একটি তালিকা, দুই ধরনের শিক্ষার্থী',
    'about.catAudience':
      'শিশু ও প্রাপ্তবয়স্করা আলাদা পাঠক, তাই প্রতিটি কোর্স জানায় সেটি কার জন্য: শিশুদের, প্রাপ্তবয়স্কদের, নাকি উভয়ের। তালিকাটি এক দলে সীমিত করা যায়, প্রথম পাতায় দুই দলের জন্য আলাদা দরজা থাকে, এবং কোর্স কেবল সেই দলের অধীনেই দেখা যায় যা সে নিজে জানিয়েছে।',
    'about.catAges':
      'ছোট শিক্ষার্থীদের দলের ভেতরে কোর্সটি কোন বয়সের জন্য লেখা, তাও সে বলতে পারে, যাতে ছয় বছরের শিশু আর পনেরো বছরের কিশোর একই তাকে না পৌঁছায়। যে কোর্স বয়স বলে না, সেটি সব বয়সের জন্য খোলা: নীরবতা কোনো বিধিনিষেধ নয়, এবং কখনো তা বিধিনিষেধ হিসেবে পড়া হয় না।',
    'about.howTitle': 'একটি কোর্স এখানে কীভাবে আসে',
    'about.how1Lead': 'একজন শিক্ষক এটি লেখেন।',
    'about.how1':
      'একটি খসড়া সংস্করণ, যাতে থাকে অংশ, পাঠ, উৎস এবং কোর্সে পরীক্ষা থাকলে একটি কুইজ। প্রতিটি পাঠের জন্য উৎস উল্লেখ করা হয়, কারণ দ্বীন সম্পর্কে একটি পাঠের বলতে পারা উচিত সেটি কোথা থেকে এসেছে।',
    'about.how2Lead': 'অনুমোদিত কেউ এটি যাচাই করেন।',
    'about.how2':
      'একজন পর্যালোচককে কেবল সেই বিষয়ের কোর্স দেওয়া যায় যার জন্য তাঁর বর্তমান অনুমোদন আছে, নইলে ডেটাবেস সেই দায়িত্ব প্রত্যাখ্যান করে। ঘোষিত স্বার্থের সংঘাতও তা আটকায়। লেখক নিজের কোর্সকে সেই ইলমি অনুমোদন দিতে পারেন না যা সেটিকে প্রকাশের যোগ্য করে, সেই অনুমোদন তাঁর থাকলেও।',
    'about.how3Lead': 'এটি প্রকাশিত হয়, তারপর স্থির হয়ে যায়।',
    'about.how3':
      'প্ল্যাটফর্মের মালিক প্রকাশ করেন। সেই মুহূর্ত থেকে সংস্করণটি স্থির: পাঠ, কুইজ ও ফাইল বদলানো যায় না। সংশোধন মানে একটি নতুন সংস্করণ, আর আগে থেকে ভর্তি শিক্ষার্থী যে সংস্করণে শুরু করেছিল তাতেই থাকে; তাই সনদ কখনো এমন কোর্সের হয় না যা তার নিচে নিঃশব্দে বদলে গেছে।',
    'about.childTitle': 'শিশুরা শিক্ষার্থী, অ্যাকাউন্ট নয়',
    'about.childNotice':
      'কোনো শিশু এখানে নিবন্ধন করে না। অ্যাকাউন্টটি থাকে বাবা-মা বা অভিভাবকের হাতে; তিনিই নাম ও বয়সের দল দিয়ে শিশুকে শিক্ষার্থী হিসেবে যোগ করেন এবং তার অগ্রগতি দেখেন। বারো বছরের কম বয়সী শিশুর কখনো নিজের ইমেইল ঠিকানা, পাসওয়ার্ড বা সাইন-ইন থাকে না।',
    'about.childLogin':
      'যেখানে প্ল্যাটফর্ম অনুমতি দেয়, সেখানে একজন যাচাইকৃত অভিভাবক বারো বছর বা তার বেশি বয়সী শিশুকে তার নিজের সাইন-ইন দিতে পারেন। প্রথম পাসওয়ার্ডটি অভিভাবক বেছে নেন, এবং তিনি তা নতুন করে ঠিক করতে বা সাইন-ইনটি ফিরিয়ে নিতে পারেন। এটি অভিভাবকের কাজ: কোনো শিশু কখনো একা অ্যাকাউন্ট তৈরি করে না।',
    'about.childBand':
      'সিস্টেমের কোথাও জন্মতারিখ নেই। বয়সের দল (পাঁচ থেকে সাত, আট থেকে দশ, ইত্যাদি) একটি শিশুকে কী দেখানো উচিত তা জানার জন্য যথেষ্ট, এবং কিছু ভুল হলে হারানোর মতো জিনিস অনেক কম থাকে।',
    'about.childConsent':
      'যেখানে আইন অনুযায়ী শিশুর কোনো অনলাইন সেবা ব্যবহারের আগে বাবা-মায়ের যাচাইযোগ্য সম্মতি প্রয়োজন, সেখানে শর্ত হলো অভিভাবকত্বের সম্পর্ক, যাচাইয়ের একটি ধাপ এবং কে সম্মতি দিয়েছেন তার নথি। প্ল্যাটফর্ম তিনটিই রাখতে পারে। কোনো দেশের জন্য সেই শর্ত চালু করা মালিকের সিদ্ধান্ত, যা আইনি পরামর্শ নিয়ে নেওয়া হয়। চালু না হওয়া পর্যন্ত শিশুকে যোগ করেন অ্যাকাউন্টধারী প্রাপ্তবয়স্ক, শিশু নিজে কখনো নয়।',
    'about.langTitle': 'ইন্টারফেস, এবং কে তা পড়েছে',
    'about.langOffered': 'যেসব ভাষায় ইন্টারফেস দেওয়া হয়: {count}',
    'about.langWritten':
      'ইংরেজি ছাড়া এর প্রতিটি লিখেছেন তাঁরা, যাঁরা এই প্ল্যাটফর্ম বানিয়েছেন, এবং একটিও সেই ভাষায় কথা বলেন এমন কেউ পড়েননি। ভাষার পাতা এ কথা পাদটীকায় নয়, প্রতিটি ভাষার পাশে বলে, কারণ “অনূদিত” আর “সেই ভাষাভাষী কারও পড়া” দুটি আলাদা দাবি, এবং কেবল প্রথমটিই সত্য।',
    'about.langHeld':
      'যেখানে আমরা কোনো ভাষা এতটা ভালো লিখতে পারিনি যে নিজের লেখার ওপর ভরসা করা যায়, সেখানে কোনো ভাষাভাষী তা না পড়া পর্যন্ত আমরা তার বদলে ইংরেজি দেখাই।',
    'about.langWhole': 'লেখা হয়েছে কিন্তু একেবারেই দেওয়া হয় না: {languages}',
    'about.langPartly':
      'যেসব ভাষায় নামাজের সময়, হিজরি তারিখ ও গণনাযন্ত্রের পর্দা ইংরেজিতে দেখানো হয়: {count}। ভাষার পাতা এদের প্রতিটিকে সেই অংশসহ তালিকাভুক্ত করে যা পাঠককে সত্যিই দেখানো হয়।',
    'about.langFix':
      'আপনার নিজের ভাষায় কোনো শব্দ ভুল মনে হলে, সংশোধনের পাতাই তা বলার জায়গা। এটি কোনো অ্যাকাউন্ট চায় না, ইংরেজি বাক্য ও বর্তমান অনুবাদ পাশাপাশি দেখায়, এবং আপনি কেবল ভুল লাইনগুলো বদলান। আপনি যা পাঠিয়েছেন তা গৃহীত হলে ভাষাটির পাশে আপনার নাম ছাপা হয়। আপনার ইমেইল ঠিকানা কখনো প্রকাশ করা হয় না এবং কখনো সাইন-ইন হয়ে ওঠে না।',
    'about.langSheet': 'সংশোধনের পাতা খুলুন',
    'about.teachTitle': 'এখানে কে পড়ান',
    'about.teachAppoint':
      'পড়ানো হয় নিয়োগের মাধ্যমে। নিবন্ধন করে কেউ শিক্ষক হন না: মালিক বা পরিচালনার কর্মীরা লিখিত কারণসহ তা দেন, এবং তা ফিরিয়ে নেওয়াও একই রকম। যিনিই লিখুন, প্রতিটি কোর্স তবুও পর্যালোচনার মধ্য দিয়ে যায়।',
    'about.teachAsk':
      'আপনি চাইতে পারেন। পড়ানোর আবেদন আপনার যোগ্যতা এবং আপনার পড়ানো একটি পাঠের লিংক পাঠায়, এবং মালিক দুটিই পড়েন। আবেদন করলে কিছুই পাওয়া যায় না: এটি নিয়োগের অনুরোধ, আর উত্তর হলো একটি লিখিত সিদ্ধান্ত যা আপনি পড়তে পারেন।',
    'about.teachPage':
      'একজন শিক্ষক নিজের সম্পর্কে একটি পাতা প্রকাশ করতে পারেন। করলে কোর্সের পাতা তাঁর নাম বলে এবং সেখানে লিংক দেয়। না করলে কোর্সের পাতা বলে যে কোর্সটি একজন নিযুক্ত শিক্ষক লিখেছেন ও একজন পর্যালোচক অনুমোদন করেছেন, এবং নামটি বাদ দেয়। নাম না থাকা গোপনীয়তার একটি পছন্দ, কম মানের কোর্স নয়।',
    'about.keptTitle': 'কী রাখা হয়, এবং কী কখনো নতুন করে লেখা হয় না',
    'about.keptProgress':
      'আপনার অগ্রগতি আপনারই, এবং যে কোর্সের মূল্য আপনি দিয়েছেন তা আপনার অ্যাকাউন্টে থাকে। সনদে একটি নম্বর থাকে যা যে কেউ অ্যাকাউন্ট ছাড়াই খুঁজে দেখতে পারে, এবং কোর্সটি পরে তুলে নেওয়া হলেও তা যাচাই করা যায়।',
    'about.keptPayment':
      'অর্থপ্রদানের নথি কখনো নতুন করে লেখা হয় না: সংশোধন হলো পুরোনোটির পাশে একটি নতুন ভুক্তি, তার সম্পাদনা নয়। কোর্স সম্পর্কে শিক্ষার্থীর পর্যালোচনা হয় তিনি যেমন লিখেছেন তেমনই প্রকাশিত হয়, নয়তো এমন কারণসহ প্রত্যাহার করা হয় যা তিনি দেখতে পান। কর্মীরা তা বদলে অন্য কিছু লিখতে পারেন না।',
    'about.cost':
      'দেখতে কোনো খরচ নেই। একটি কোর্স কেনা হয় নাম উল্লেখ করা একজন শিক্ষার্থীর জন্য: একটি ক্রয় একজন শিক্ষার্থীর জন্য, কখনো একটি পরিবারের জন্য নয়।',
  },
  hi: {
    'about.title': 'AyahSpring क्यों',
    'about.description':
      'AyahSpring क्या सिखाता है, कोई कोर्स शिक्षार्थी तक कैसे पहुँचता है, बच्चा खाता नहीं बल्कि शिक्षार्थी क्यों है, और यहाँ पढ़ाने की अनुमति किसे है।',
    'about.lede':
      '{ayah} क़ुरआन की एक आयत है और शब्द के पुराने अर्थ में एक निशानी। {spring} नवीकरण है: वह बढ़त जो पानी के बाद आती है। यह नाम वही है जो यह प्लेटफ़ॉर्म बनना चाहता है: आयत, और वह व्यक्ति जो उसे धारण करना सीख रहा है।',
    'about.bar':
      'नीचे जो कुछ है वह बताता है कि प्लेटफ़ॉर्म क्या करता है, यह नहीं कि वह क्या करने का इरादा रखता है। यह पन्ना इस तरह लिखा गया है कि सुविधाएँ चालू और बंद होती रहें तब भी यह सही रहे; इसलिए यह आज की सेटिंग नहीं, नियम बताता है, और ऐसी बात कहने से जो केवल इसी हफ़्ते सच हो, कम कहना बेहतर समझता है।',
    'about.catTitle': 'एक सूची, दो तरह के शिक्षार्थी',
    'about.catAudience':
      'बच्चे और वयस्क अलग-अलग पाठक हैं, इसलिए हर कोर्स बताता है कि वह किसके लिए है: बच्चों के लिए, वयस्कों के लिए, या दोनों के लिए। सूची को एक समूह तक सीमित किया जा सकता है, पहला पन्ना दोनों के लिए एक-एक दरवाज़ा देता है, और कोर्स केवल उसी समूह के नीचे दिखता है जिसे उसने घोषित किया।',
    'about.catAges':
      'कोर्स यह भी बता सकता है कि छोटे शिक्षार्थियों के समूह में वह किन उम्रों के लिए लिखा गया, ताकि छह साल का बच्चा और पंद्रह साल का किशोर एक ही ख़ाने पर न पहुँचें। जो कोर्स उम्र नहीं बताता वह हर उम्र के लिए खुला है: चुप्पी कोई पाबंदी नहीं है, और उसे कभी पाबंदी नहीं माना जाता।',
    'about.howTitle': 'कोई कोर्स यहाँ कैसे पहुँचता है',
    'about.how1Lead': 'एक शिक्षक उसे लिखता है।',
    'about.how1':
      'एक मसौदा संस्करण, जिसमें खंड, पाठ, स्रोत और, यदि कोर्स की परीक्षा होती है, एक क्विज़ होता है। स्रोत हर पाठ के लिए दिए जाते हैं, क्योंकि दीन के बारे में पाठ को यह बता सकना चाहिए कि वह कहाँ से आया।',
    'about.how2Lead': 'कोई अधिकृत व्यक्ति उसे जाँचता है।',
    'about.how2':
      'समीक्षक को केवल उसी विषय का कोर्स दिया जा सकता है जिसके लिए उसके पास वर्तमान अनुमति हो, वरना डेटाबेस यह ज़िम्मेदारी अस्वीकार कर देता है। घोषित हितों का टकराव भी इसे रोकता है। लेखक अपने ही कोर्स को वह इल्मी स्वीकृति नहीं दे सकता जिससे वह प्रकाशित हो सके, भले ही उसके पास वह अनुमति हो।',
    'about.how3Lead': 'वह प्रकाशित होता है, और फिर स्थिर कर दिया जाता है।',
    'about.how3':
      'प्लेटफ़ॉर्म का मालिक प्रकाशित करता है। उसी क्षण से संस्करण स्थिर है: पाठ, क्विज़ और फ़ाइलें बदल नहीं सकतीं। सुधार एक नया संस्करण है, और पहले से नामांकित शिक्षार्थी उसी संस्करण पर रहता है जिससे उसने शुरू किया; इसलिए प्रमाणपत्र कभी ऐसे कोर्स का नहीं होता जो उसके नीचे चुपचाप बदल गया हो।',
    'about.childTitle': 'बच्चे शिक्षार्थी हैं, खाते नहीं',
    'about.childNotice':
      'कोई बच्चा यहाँ साइन अप नहीं करता। खाता माता-पिता या अभिभावक के पास होता है; वही बच्चे को नाम और आयु-समूह के साथ शिक्षार्थी के रूप में जोड़ते हैं और उसकी प्रगति देखते हैं। बारह साल से छोटे बच्चे का अपना ईमेल पता, पासवर्ड या साइन-इन कभी नहीं होता।',
    'about.childLogin':
      'जहाँ प्लेटफ़ॉर्म अनुमति देता है, वहाँ एक सत्यापित अभिभावक बारह साल या उससे बड़े बच्चे को उसका अपना साइन-इन दे सकता है। पहला पासवर्ड अभिभावक चुनता है, और वह उसे रीसेट कर सकता है या साइन-इन वापस ले सकता है। यह अभिभावक का काम है: कोई बच्चा कभी अकेले खाता नहीं बनाता।',
    'about.childBand':
      'सिस्टम में कहीं भी जन्मतिथि नहीं है। आयु-समूह (पाँच से सात, आठ से दस, इत्यादि) यह जानने के लिए काफ़ी है कि बच्चे को क्या दिखाया जाए, और कुछ गड़बड़ होने पर खोने को बहुत कम होता है।',
    'about.childConsent':
      'जहाँ क़ानून यह माँगता है कि बच्चे के किसी ऑनलाइन सेवा का उपयोग करने से पहले माता-पिता की सत्यापन-योग्य सहमति हो, वहाँ शर्त है अभिभावकत्व का संबंध, सत्यापन का एक चरण और इस बात का रिकॉर्ड कि सहमति किसने दी। प्लेटफ़ॉर्म तीनों रख सकता है। किसी देश के लिए यह शर्त चालू करना मालिक का निर्णय है, जो क़ानूनी सलाह के साथ लिया जाता है। जब तक यह चालू नहीं होती, बच्चे को वह वयस्क जोड़ता है जिसके पास खाता है, बच्चा स्वयं कभी नहीं।',
    'about.langTitle': 'इंटरफ़ेस, और उसे किसने पढ़ा है',
    'about.langOffered': 'वे भाषाएँ जिनमें इंटरफ़ेस उपलब्ध है: {count}',
    'about.langWritten':
      'अंग्रेज़ी को छोड़कर इनमें से हर एक उन लोगों ने लिखी जिन्होंने यह प्लेटफ़ॉर्म बनाया, और एक भी किसी ऐसे व्यक्ति ने नहीं पढ़ी जो वह भाषा बोलता हो। भाषा का पन्ना यह बात फ़ुटनोट में नहीं, हर भाषा के पास कहता है, क्योंकि “अनूदित” और “उस भाषा के बोलने वाले द्वारा पढ़ा गया” दो अलग दावे हैं, और केवल पहला सच है।',
    'about.langHeld':
      'जहाँ हम कोई भाषा इतनी अच्छी तरह नहीं लिख सके कि अपने लिखे पर भरोसा करें, वहाँ हम उसकी जगह अंग्रेज़ी दिखाते हैं जब तक कोई बोलने वाला उसे पढ़ न ले।',
    'about.langWhole': 'लिखी गई हैं पर बिल्कुल उपलब्ध नहीं हैं: {languages}',
    'about.langPartly':
      'वे भाषाएँ जिनमें नमाज़ के समय, हिजरी तारीख़ और गिनती की स्क्रीनें अंग्रेज़ी में दिखाई जाती हैं: {count}। भाषा का पन्ना इनमें से हर एक को उस हिस्से के साथ सूचीबद्ध करता है जो पाठक को वास्तव में दिखाया जाता है।',
    'about.langFix':
      'यदि आपको अपनी भाषा में कोई शब्द ग़लत लगे, तो सुधार-पत्र उसे कहने की जगह है। वह कोई खाता नहीं माँगता, आपको अंग्रेज़ी वाक्य और वर्तमान अनुवाद साथ-साथ दिखाता है, और आप केवल ग़लत पंक्तियाँ बदलते हैं। आपने जो भेजा वह स्वीकार हो जाए तो आपका नाम भाषा के पास छापा जाता है। आपका ईमेल पता कभी प्रकाशित नहीं होता और कभी साइन-इन नहीं बनता।',
    'about.langSheet': 'सुधार-पत्र खोलें',
    'about.teachTitle': 'यहाँ कौन पढ़ाता है',
    'about.teachAppoint':
      'पढ़ाना नियुक्ति से होता है। कोई साइन अप करके शिक्षक नहीं बनता: मालिक या प्रशासन के कर्मचारी इसे लिखित कारण के साथ देते हैं, और इसे वापस लेना भी ऐसा ही है। हर कोर्स फिर भी समीक्षा से गुज़रता है, चाहे किसी ने लिखा हो।',
    'about.teachAsk':
      'आप माँग सकते हैं। पढ़ाने का आवेदन आपकी योग्यताएँ और आपके पढ़ाए हुए एक पाठ का लिंक भेजता है, और मालिक दोनों पढ़ता है। आवेदन से कुछ नहीं मिलता: यह नियुक्ति का अनुरोध है, और उत्तर एक लिखित निर्णय है जिसे आप पढ़ सकते हैं।',
    'about.teachPage':
      'शिक्षक अपने बारे में एक पन्ना प्रकाशित कर सकता है। यदि उसने किया है, तो कोर्स का पन्ना उसका नाम लेता है और उसका लिंक देता है। यदि नहीं किया, तो कोर्स का पन्ना कहता है कि कोर्स एक नियुक्त शिक्षक ने लिखा और एक समीक्षक ने स्वीकृत किया, और नाम छोड़ देता है। नाम का न होना निजता का चुनाव है, कमतर कोर्स नहीं।',
    'about.keptTitle': 'क्या रखा जाता है, और क्या कभी दोबारा नहीं लिखा जाता',
    'about.keptProgress':
      'आपकी प्रगति आपकी है, और जिस कोर्स का आपने भुगतान किया वह आपके खाते में रहता है। प्रमाणपत्र पर एक नंबर होता है जिसे कोई भी बिना खाते के देख सकता है, और कोर्स बाद में हटा दिया जाए तब भी उसे जाँचा जा सकता है।',
    'about.keptPayment':
      'भुगतान का रिकॉर्ड कभी दोबारा नहीं लिखा जाता: सुधार पुराने के पास एक नई प्रविष्टि है, उसका संपादन नहीं। कोर्स पर शिक्षार्थी की समीक्षा या तो वैसी ही प्रकाशित होती है जैसी उसने लिखी, या ऐसे कारण के साथ वापस ली जाती है जिसे वह देख सके। कर्मचारी उसे बदलकर कुछ और नहीं लिख सकते।',
    'about.cost':
      'देखने का कोई ख़र्च नहीं है। कोर्स एक नामित शिक्षार्थी के लिए ख़रीदा जाता है: एक ख़रीद एक शिक्षार्थी के लिए है, परिवार के लिए कभी नहीं।',
  },
  fr: {
    'about.title': 'Pourquoi AyahSpring',
    'about.description':
      'Ce qu’AyahSpring enseigne, comment un cours parvient à un apprenant, pourquoi un enfant est un apprenant et non un compte, et qui est autorisé à enseigner ici.',
    'about.lede':
      '{ayah} désigne un verset du Coran et, au sens ancien du mot, un signe. {spring}, c’est le renouveau : la croissance qui suit l’eau. Ce nom dit ce que la plateforme cherche à être : le verset, et la personne qui apprend à le porter.',
    'about.bar':
      'Tout ce qui suit décrit ce que la plateforme fait, non ce qu’elle compte faire. Cette page est écrite pour rester vraie quand des fonctions sont activées ou désactivées : elle vous donne donc la règle plutôt que le réglage du jour, et elle préfère en dire moins que dire une chose qui n’est vraie que cette semaine.',
    'about.catTitle': 'Un seul catalogue, deux sortes d’apprenants',
    'about.catAudience':
      'Les enfants et les adultes sont des lecteurs différents ; un cours déclare donc à qui il s’adresse : aux enfants, aux adultes ou aux deux. Le catalogue peut être restreint à un seul public, la page d’accueil ouvre une porte pour chacun des deux, et un cours n’apparaît que sous un public qu’il a déclaré.',
    'about.catAges':
      'Un cours peut aussi indiquer pour quels âges il a été écrit, au sein du public des jeunes apprenants, afin qu’un enfant de six ans et un adolescent de quinze ans n’arrivent pas au même rayon. Un cours qui n’indique aucun âge est ouvert à tous les âges : le silence n’est pas une restriction, et il n’est jamais lu comme tel.',
    'about.howTitle': 'Comment un cours arrive ici',
    'about.how1Lead': 'Un enseignant l’écrit.',
    'about.how1':
      'Une version brouillon, avec des sections, des leçons, des sources et, si le cours est évalué, un quiz. Les sources sont citées pour chaque leçon, car une leçon sur la religion doit pouvoir dire d’où elle vient.',
    'about.how2Lead': 'Une personne habilitée le vérifie.',
    'about.how2':
      'Un relecteur ne peut se voir confier qu’un cours dans une matière pour laquelle il détient une habilitation en cours de validité ; sinon, la base de données refuse l’attribution. Un conflit d’intérêts déclaré l’empêche aussi. L’auteur ne peut pas donner à son propre cours l’approbation savante qui permet de le publier, même s’il détient cette habilitation.',
    'about.how3Lead': 'Il est publié, puis il est figé.',
    'about.how3':
      'C’est le propriétaire de la plateforme qui publie. Dès cet instant, la version est gelée : les leçons, les quiz et les fichiers ne peuvent plus changer. Une correction est une nouvelle version, et un apprenant déjà inscrit reste sur la version qu’il a commencée ; un certificat ne porte donc jamais sur un cours qui a changé en silence sous lui.',
    'about.childTitle': 'Les enfants sont des apprenants, pas des comptes',
    'about.childNotice':
      'Un enfant ne s’inscrit pas ici. Un parent ou un tuteur détient le compte, ajoute l’enfant comme apprenant avec un nom et une tranche d’âge, et voit ses progrès. Un enfant de moins de douze ans n’a jamais d’adresse e-mail, de mot de passe ni de connexion à lui.',
    'about.childLogin':
      'Là où la plateforme le permet, un tuteur vérifié peut donner à un enfant de douze ans ou plus une connexion à lui. Le tuteur choisit le premier mot de passe et peut le réinitialiser ou retirer la connexion. C’est l’acte du tuteur : un enfant ne crée jamais un compte seul.',
    'about.childBand':
      'Il n’y a de date de naissance nulle part dans le système. Une tranche d’âge (cinq à sept ans, huit à dix ans, et ainsi de suite) suffit pour savoir ce qu’il convient de montrer à un enfant, et c’est bien moins à perdre si quelque chose tourne mal.',
    'about.childConsent':
      'Là où la loi exige un consentement parental vérifiable avant qu’un enfant utilise un service en ligne, la condition est un lien de tutelle, une étape de vérification et une trace de qui a consenti. La plateforme peut conserver les trois. Activer cette exigence pour un pays est la décision du propriétaire, prise avec un conseil juridique. Tant qu’elle n’est pas activée, l’enfant est ajouté par l’adulte qui détient le compte, jamais par lui-même.',
    'about.langTitle': 'L’interface, et qui l’a lue',
    'about.langOffered': 'Langues dans lesquelles l’interface est proposée : {count}',
    'about.langWritten':
      'Toutes, sauf l’anglais, ont été écrites par les personnes qui ont construit cette plateforme, et aucune n’a été lue par quelqu’un qui la parle. La page des langues le dit à côté de chaque langue plutôt que dans une note, car « traduit » et « lu par une personne qui parle la langue » sont deux affirmations différentes, et seule la première est vraie.',
    'about.langHeld':
      'Là où nous n’avons pas su écrire une langue assez bien pour nous fier à ce que nous avions écrit, nous affichons l’anglais à la place jusqu’à ce qu’un locuteur l’ait lue.',
    'about.langWhole': 'Écrites mais pas proposées du tout : {languages}',
    'about.langPartly':
      'Langues dont les écrans des heures de prière, de la date hégirienne et du compteur sont affichés en anglais : {count}. La page des langues les énumère chacune avec la part réellement montrée au lecteur.',
    'about.langFix':
      'Si un mot vous semble faux dans votre propre langue, la feuille de correction est l’endroit où le dire. Elle ne demande aucun compte, elle vous montre la phrase anglaise et la traduction actuelle côte à côte, et vous ne modifiez que les lignes fautives. Votre nom est imprimé à côté de la langue si votre envoi est accepté. Votre adresse e-mail n’est jamais publiée et ne devient jamais une connexion.',
    'about.langSheet': 'Ouvrir la feuille de correction',
    'about.teachTitle': 'Qui enseigne ici',
    'about.teachAppoint':
      'On enseigne sur nomination. Personne ne devient enseignant en s’inscrivant : le propriétaire ou l’équipe de gouvernance l’accorde, avec un motif écrit, et il en va de même pour le retrait. Chaque cours passe tout de même en relecture, quel qu’en soit l’auteur.',
    'about.teachAsk':
      'Vous pouvez demander. La candidature pour enseigner envoie vos qualifications et un lien vers une leçon que vous avez donnée, et le propriétaire lit les deux. Candidater n’accorde rien : c’est une demande de nomination, et la réponse est une décision écrite que vous pouvez lire.',
    'about.teachPage':
      'Un enseignant peut publier une page sur lui-même. Quand il l’a fait, la page du cours le nomme et y renvoie. Quand il ne l’a pas fait, la page du cours indique que le cours a été écrit par un enseignant nommé et approuvé par un relecteur, et omet le nom. Un nom absent est un choix de confidentialité, pas un cours de moindre valeur.',
    'about.keptTitle': 'Ce qui est conservé, et ce qui n’est jamais réécrit',
    'about.keptProgress':
      'Vos progrès vous appartiennent, et un cours que vous avez payé reste dans votre compte. Un certificat porte un numéro que chacun peut rechercher, sans compte, et il reste vérifiable même si le cours est retiré plus tard.',
    'about.keptPayment':
      'Un enregistrement de paiement n’est jamais réécrit : une correction est une nouvelle écriture à côté de l’ancienne, non une modification de celle-ci. L’avis d’un apprenant sur un cours est soit publié tel qu’il l’a écrit, soit retiré avec un motif qu’il peut voir. L’équipe ne peut pas le réécrire en autre chose.',
    'about.cost':
      'Regarder ne coûte rien. Un cours est acheté pour un apprenant nommé : un achat couvre un apprenant, jamais un foyer.',
  },
  es: {
    'about.title': 'Por qué AyahSpring',
    'about.description':
      'Qué enseña AyahSpring, cómo llega un curso a un estudiante, por qué un niño es un estudiante y no una cuenta, y a quién se le permite enseñar aquí.',
    'about.lede':
      '{ayah} es un versículo del Corán y, en el sentido antiguo de la palabra, un signo. {spring} es renovación: el crecimiento que sigue al agua. El nombre es lo que esta plataforma intenta ser: el versículo y la persona que aprende a llevarlo.',
    'about.bar':
      'Todo lo que sigue describe algo que la plataforma hace, no algo que pretende hacer. Esta página está escrita para seguir siendo cierta cuando las funciones se activan y se desactivan; por eso le dice la regla y no el ajuste de hoy, y prefiere decir menos antes que decir algo que solo es cierto esta semana.',
    'about.catTitle': 'Un catálogo, dos tipos de estudiante',
    'about.catAudience':
      'Los niños y los adultos son lectores distintos, así que un curso declara para quién es: niños, adultos o ambos. El catálogo puede limitarse a un solo público, la página principal ofrece una puerta para cada uno de los dos, y un curso solo aparece bajo un público que haya declarado.',
    'about.catAges':
      'Un curso también puede decir para qué edades fue escrito, dentro del público de los estudiantes jóvenes, para que un niño de seis años y un adolescente de quince no lleguen al mismo estante. Un curso que no indica edades está abierto a todas: el silencio no es una restricción, y nunca se lee como tal.',
    'about.howTitle': 'Cómo llega un curso aquí',
    'about.how1Lead': 'Un profesor lo escribe.',
    'about.how1':
      'Una versión en borrador, con secciones, lecciones, fuentes y, si el curso se evalúa, un cuestionario. Las fuentes se citan en cada lección, porque una lección sobre la religión debe poder decir de dónde viene.',
    'about.how2Lead': 'Alguien autorizado lo revisa.',
    'about.how2':
      'A un revisor solo se le puede asignar un curso de una materia para la que tenga una autorización vigente; de lo contrario, la base de datos rechaza la asignación. Un conflicto de intereses declarado también lo impide. El autor no puede dar a su propio curso la aprobación académica que permite publicarlo, aunque tenga esa autorización.',
    'about.how3Lead': 'Se publica, y entonces queda fijado.',
    'about.how3':
      'Publica el propietario de la plataforma. Desde ese momento la versión queda congelada: las lecciones, los cuestionarios y los archivos no pueden cambiar. Una corrección es una versión nueva, y un estudiante ya inscrito sigue en la versión con la que empezó, de modo que un certificado nunca corresponde a un curso que cambió en silencio por debajo.',
    'about.childTitle': 'Los niños son estudiantes, no cuentas',
    'about.childNotice':
      'Un niño no se registra aquí. Un padre, una madre o un tutor tiene la cuenta, añade al niño como estudiante con un nombre y un tramo de edad, y ve su progreso. Un niño menor de doce años nunca tiene una dirección de correo, una contraseña ni un inicio de sesión propio.',
    'about.childLogin':
      'Donde la plataforma lo permite, un tutor verificado puede dar a un niño de doce años o más un inicio de sesión propio. El tutor elige la primera contraseña y puede restablecerla o retirar el inicio de sesión. Es un acto del tutor: un niño nunca crea una cuenta por sí solo.',
    'about.childBand':
      'No hay fecha de nacimiento en ninguna parte del sistema. Un tramo de edad (de cinco a siete, de ocho a diez, etcétera) basta para saber qué se le debe mostrar a un niño, y es mucho menos lo que se pierde si algo sale mal.',
    'about.childConsent':
      'Donde la ley exige un consentimiento parental verificable antes de que un niño use un servicio en línea, la condición es una relación de tutela, un paso de verificación y un registro de quién consintió. La plataforma puede conservar las tres cosas. Activar ese requisito para un país es decisión del propietario, tomada con asesoramiento jurídico. Mientras no esté activado, al niño lo añade el adulto que tiene la cuenta, nunca el propio niño.',
    'about.langTitle': 'La interfaz, y quién la ha leído',
    'about.langOffered': 'Idiomas en los que se ofrece la interfaz: {count}',
    'about.langWritten':
      'Todos, salvo el inglés, fueron escritos por las personas que construyeron esta plataforma, y ninguno ha sido leído por alguien que lo hable. La página de idiomas lo dice junto a cada idioma y no en una nota al pie, porque «traducido» y «leído por una persona que lo habla» son dos afirmaciones distintas, y solo la primera es cierta.',
    'about.langHeld':
      'Donde no pudimos escribir un idioma lo bastante bien como para fiarnos de lo escrito, mostramos el inglés en su lugar hasta que un hablante lo haya leído.',
    'about.langWhole': 'Escritos pero no ofrecidos en absoluto: {languages}',
    'about.langPartly':
      'Idiomas cuyas pantallas de horarios de oración, fecha de la Hégira y contador se muestran en inglés: {count}. La página de idiomas enumera cada uno con la parte que realmente se muestra al lector.',
    'about.langFix':
      'Si una palabra le parece incorrecta en su propio idioma, la hoja de correcciones es el lugar para decirlo. No pide cuenta, le muestra la frase en inglés y la traducción actual una junto a otra, y usted cambia solo las líneas que están mal. Su nombre se imprime junto al idioma si se acepta lo que envió. Su dirección de correo nunca se publica y nunca se convierte en un inicio de sesión.',
    'about.langSheet': 'Abrir la hoja de correcciones',
    'about.teachTitle': 'Quién enseña aquí',
    'about.teachAppoint':
      'Se enseña por nombramiento. Nadie se convierte en profesor por registrarse: lo conceden el propietario o el personal de gobernanza, con un motivo por escrito, y lo mismo vale para retirarlo. Todo curso pasa igualmente por revisión, lo haya escrito quien lo haya escrito.',
    'about.teachAsk':
      'Puede pedirlo. La solicitud para enseñar envía sus cualificaciones y un enlace a una lección que haya impartido, y el propietario lee ambas cosas. Solicitar no concede nada: es una petición de nombramiento, y la respuesta es una decisión por escrito que usted puede leer.',
    'about.teachPage':
      'Un profesor puede publicar una página sobre sí mismo. Cuando lo ha hecho, la página del curso lo nombra y enlaza a ella. Cuando no, la página del curso dice que el curso fue escrito por un profesor nombrado y aprobado por un revisor, y omite el nombre. Un nombre ausente es una elección de privacidad, no un curso de menor valor.',
    'about.keptTitle': 'Qué se conserva, y qué nunca se reescribe',
    'about.keptProgress':
      'Su progreso le pertenece, y un curso que ha pagado permanece en su cuenta. Un certificado lleva un número que cualquiera puede consultar, sin cuenta, y puede seguir comprobándose aunque el curso se retire más adelante.',
    'about.keptPayment':
      'Un registro de pago nunca se reescribe: una corrección es un asiento nuevo junto al anterior, no una modificación de este. La reseña de un estudiante sobre un curso se publica tal como la escribió o se retira con un motivo que puede ver. El personal no puede reescribirla para que diga otra cosa.',
    'about.cost':
      'Mirar no cuesta nada. Un curso se compra para un estudiante con nombre: una compra cubre a un estudiante, nunca a un hogar.',
  },
  pt: {
    'about.title': 'Porquê AyahSpring',
    'about.description':
      'O que a AyahSpring ensina, como um curso chega a um aluno, por que razão uma criança é um aluno e não uma conta, e quem tem permissão para ensinar aqui.',
    'about.lede':
      '{ayah} é um versículo do Alcorão e, no sentido antigo da palavra, um sinal. {spring} é renovação: o crescimento que vem depois da água. O nome é aquilo que esta plataforma procura ser: o versículo, e a pessoa que aprende a levá-lo consigo.',
    'about.bar':
      'Tudo o que se segue descreve algo que a plataforma faz, não algo que pretende fazer. Esta página foi escrita para continuar verdadeira quando as funcionalidades são ligadas e desligadas; por isso diz-lhe a regra e não a definição de hoje, e prefere dizer menos a dizer algo que só é verdade esta semana.',
    'about.catTitle': 'Um catálogo, dois tipos de aluno',
    'about.catAudience':
      'Crianças e adultos são leitores diferentes, por isso um curso declara a quem se destina: crianças, adultos ou ambos. O catálogo pode ser limitado a um só público, a página inicial oferece uma porta para cada um dos dois, e um curso só aparece sob um público que tenha declarado.',
    'about.catAges':
      'Um curso pode também dizer para que idades foi escrito, dentro do público dos alunos mais novos, para que uma criança de seis anos e um adolescente de quinze não cheguem à mesma prateleira. Um curso que não indica idades está aberto a todas: o silêncio não é uma restrição, e nunca é lido como tal.',
    'about.howTitle': 'Como um curso chega aqui',
    'about.how1Lead': 'Um professor escreve-o.',
    'about.how1':
      'Uma versão de rascunho, com secções, lições, fontes e, se o curso for avaliado, um questionário. As fontes são citadas em cada lição, porque uma lição sobre a religião deve poder dizer de onde veio.',
    'about.how2Lead': 'Alguém autorizado verifica-o.',
    'about.how2':
      'A um revisor só pode ser atribuído um curso de uma matéria para a qual tenha uma autorização em vigor; caso contrário, a base de dados recusa a atribuição. Um conflito de interesses declarado também a impede. O autor não pode dar ao seu próprio curso a aprovação académica que permite publicá-lo, mesmo que tenha essa autorização.',
    'about.how3Lead': 'É publicado, e depois fica fixo.',
    'about.how3':
      'Quem publica é o proprietário da plataforma. A partir desse momento a versão fica congelada: lições, questionários e ficheiros não podem mudar. Uma correção é uma versão nova, e um aluno já inscrito continua na versão em que começou; assim, um certificado nunca é de um curso que mudou em silêncio por baixo dele.',
    'about.childTitle': 'As crianças são alunos, não contas',
    'about.childNotice':
      'Uma criança não se regista aqui. Um pai, uma mãe ou um encarregado de educação detém a conta, adiciona a criança como aluno com um nome e uma faixa etária, e vê o seu progresso. Uma criança com menos de doze anos nunca tem um endereço de e-mail, uma palavra-passe ou um início de sessão próprio.',
    'about.childLogin':
      'Onde a plataforma o permite, um encarregado de educação verificado pode dar a uma criança de doze anos ou mais um início de sessão próprio. O encarregado escolhe a primeira palavra-passe e pode repô-la ou retirar o início de sessão. É um ato do encarregado: uma criança nunca cria uma conta sozinha.',
    'about.childBand':
      'Não existe data de nascimento em parte alguma do sistema. Uma faixa etária (dos cinco aos sete, dos oito aos dez, e assim por diante) basta para saber o que deve ser mostrado a uma criança, e é muito menos o que se perde se algo correr mal.',
    'about.childConsent':
      'Onde a lei exige um consentimento parental verificável antes de uma criança usar um serviço em linha, a condição é uma relação de tutela, um passo de verificação e um registo de quem consentiu. A plataforma pode guardar os três. Ativar essa exigência para um país é decisão do proprietário, tomada com aconselhamento jurídico. Enquanto não estiver ativa, a criança é adicionada pelo adulto que detém a conta, nunca por si própria.',
    'about.langTitle': 'A interface, e quem a leu',
    'about.langOffered': 'Línguas em que a interface é oferecida: {count}',
    'about.langWritten':
      'Todas, exceto o inglês, foram escritas pelas pessoas que construíram esta plataforma, e nenhuma foi lida por alguém que a fale. A página das línguas di-lo junto de cada língua e não numa nota de rodapé, porque «traduzido» e «lido por uma pessoa que fala a língua» são duas afirmações diferentes, e só a primeira é verdadeira.',
    'about.langHeld':
      'Onde não conseguimos escrever uma língua suficientemente bem para confiar no que escrevemos, mostramos o inglês em seu lugar até que um falante a tenha lido.',
    'about.langWhole': 'Escritas mas não oferecidas de todo: {languages}',
    'about.langPartly':
      'Línguas cujos ecrãs de horários de oração, data da Hégira e contador são mostrados em inglês: {count}. A página das línguas enumera cada uma com a parte que é realmente mostrada ao leitor.',
    'about.langFix':
      'Se uma palavra lhe parecer errada na sua própria língua, a folha de correções é o lugar para o dizer. Não pede conta, mostra-lhe a frase em inglês e a tradução atual lado a lado, e só altera as linhas que estão erradas. O seu nome é impresso junto da língua se o que enviou for aceite. O seu endereço de e-mail nunca é publicado e nunca se torna um início de sessão.',
    'about.langSheet': 'Abrir a folha de correções',
    'about.teachTitle': 'Quem ensina aqui',
    'about.teachAppoint':
      'Ensina-se por nomeação. Ninguém se torna professor ao registar-se: o proprietário ou a equipa de governação concede-o, com um motivo escrito, e o mesmo vale para o retirar. Cada curso passa ainda assim pela revisão, seja quem for que o tenha escrito.',
    'about.teachAsk':
      'Pode pedir. A candidatura para ensinar envia as suas qualificações e uma ligação para uma lição que tenha dado, e o proprietário lê ambas. Candidatar-se não concede nada: é um pedido de nomeação, e a resposta é uma decisão escrita que pode ler.',
    'about.teachPage':
      'Um professor pode publicar uma página sobre si. Quando o fez, a página do curso nomeia-o e liga a ela. Quando não o fez, a página do curso diz que o curso foi escrito por um professor nomeado e aprovado por um revisor, e omite o nome. Um nome em falta é uma escolha de privacidade, não um curso de menor valor.',
    'about.keptTitle': 'O que é guardado, e o que nunca é reescrito',
    'about.keptProgress':
      'O seu progresso pertence-lhe, e um curso que pagou permanece na sua conta. Um certificado tem um número que qualquer pessoa pode consultar, sem conta, e continua a poder ser verificado mesmo que o curso seja mais tarde retirado.',
    'about.keptPayment':
      'Um registo de pagamento nunca é reescrito: uma correção é um novo lançamento ao lado do antigo, não uma alteração dele. A avaliação de um aluno sobre um curso é publicada tal como a escreveu ou retirada com um motivo que ele pode ver. A equipa não pode reescrevê-la para dizer outra coisa.',
    'about.cost':
      'Ver não custa nada. Um curso é comprado para um aluno identificado pelo nome: uma compra cobre um aluno, nunca um agregado familiar.',
  },
  sw: {
    'about.title': 'Kwa nini AyahSpring',
    'about.description':
      'AyahSpring inafundisha nini, kozi inamfikiaje mwanafunzi, kwa nini mtoto ni mwanafunzi na si akaunti, na ni nani anayeruhusiwa kufundisha hapa.',
    'about.lede':
      '{ayah} ni aya ya Qur’ani na, kwa maana ya zamani ya neno hilo, ni ishara. {spring} ni kufanywa upya: ukuaji unaofuata maji. Jina hili ndilo jukwaa hili linajaribu kuwa: aya, na mtu anayejifunza kuibeba.',
    'about.bar':
      'Kila kilicho hapa chini kinaeleza jambo ambalo jukwaa linafanya, si jambo linalokusudia kufanya. Ukurasa huu umeandikwa ili ubaki kweli vipengele vinapowashwa na kuzimwa; kwa hiyo unakuambia kanuni, si mpangilio wa leo, na unapendelea kusema kidogo kuliko kusema jambo lililo kweli wiki hii tu.',
    'about.catTitle': 'Orodha moja, aina mbili za wanafunzi',
    'about.catAudience':
      'Watoto na watu wazima ni wasomaji tofauti, kwa hiyo kozi hutangaza ni ya nani: watoto, watu wazima, au wote. Orodha inaweza kupunguzwa kuwa ya kundi moja, ukurasa wa mwanzo una mlango kwa kila kundi, na kozi huonekana tu chini ya kundi ililolitangaza.',
    'about.catAges':
      'Kozi inaweza pia kusema iliandikwa kwa umri gani ndani ya kundi la wanafunzi wadogo, ili mtoto wa miaka sita na kijana wa miaka kumi na mitano wasifike kwenye rafu moja. Kozi isiyotaja umri iko wazi kwa kila umri: ukimya si kizuizi, na hausomwi kamwe kama kizuizi.',
    'about.howTitle': 'Jinsi kozi inavyofika hapa',
    'about.how1Lead': 'Mwalimu huiandika.',
    'about.how1':
      'Toleo la rasimu, lenye sehemu, masomo, vyanzo na, ikiwa kozi ina mtihani, jaribio. Vyanzo hutajwa kwa kila somo, kwa sababu somo kuhusu dini linapaswa kuweza kusema lilikotoka.',
    'about.how2Lead': 'Mtu aliyeidhinishwa huikagua.',
    'about.how2':
      'Mhakiki anaweza kupewa tu kozi ya somo ambalo ana idhini inayotumika kwa sasa, na vinginevyo hifadhidata hukataa kumpa kazi hiyo. Mgongano wa maslahi uliotangazwa pia huizuia. Mwandishi hawezi kuipa kozi yake mwenyewe idhini ya kielimu inayoiruhusu kuchapishwa, hata kama ana idhini hiyo.',
    'about.how3Lead': 'Huchapishwa, kisha hubaki ilivyo.',
    'about.how3':
      'Mmiliki wa jukwaa ndiye anayechapisha. Kuanzia wakati huo toleo limefungwa: masomo, majaribio na faili haviwezi kubadilika. Marekebisho ni toleo jipya, na mwanafunzi aliyekwisha kujiandikisha hubaki kwenye toleo aliloanza nalo; kwa hiyo cheti hakiwi kamwe cha kozi iliyobadilika kimyakimya chini yake.',
    'about.childTitle': 'Watoto ni wanafunzi, si akaunti',
    'about.childNotice':
      'Mtoto hajisajili hapa. Mzazi au mlezi ndiye mwenye akaunti, humwongeza mtoto kama mwanafunzi kwa jina na kundi la umri, na huona maendeleo yake. Mtoto aliye chini ya miaka kumi na miwili hana kamwe anwani ya barua pepe, nenosiri wala njia yake mwenyewe ya kuingia.',
    'about.childLogin':
      'Pale jukwaa linaporuhusu, mlezi aliyethibitishwa anaweza kumpa mtoto wa miaka kumi na miwili au zaidi njia yake mwenyewe ya kuingia. Mlezi huchagua nenosiri la kwanza, na anaweza kuliweka upya au kuiondoa njia hiyo ya kuingia. Hilo ni tendo la mlezi: mtoto hafungui akaunti peke yake kamwe.',
    'about.childBand':
      'Hakuna tarehe ya kuzaliwa popote katika mfumo. Kundi la umri (mitano hadi saba, minane hadi kumi, na kadhalika) linatosha kujua mtoto anapaswa kuonyeshwa nini, na ni kidogo zaidi cha kupotea iwapo jambo litaharibika.',
    'about.childConsent':
      'Pale sheria inapotaka ridhaa ya mzazi inayoweza kuthibitishwa kabla mtoto hajatumia huduma ya mtandaoni, sharti ni uhusiano wa ulezi, hatua ya uthibitisho na kumbukumbu ya aliyetoa ridhaa. Jukwaa linaweza kuhifadhi vyote vitatu. Kuwasha sharti hilo kwa nchi fulani ni uamuzi wa mmiliki, unaofanywa kwa ushauri wa kisheria. Mpaka liwashwe, mtoto huongezwa na mtu mzima mwenye akaunti, kamwe si na mtoto mwenyewe.',
    'about.langTitle': 'Kiolesura, na nani amekisoma',
    'about.langOffered': 'Lugha ambazo kiolesura kinatolewa: {count}',
    'about.langWritten':
      'Kila moja isipokuwa Kiingereza iliandikwa na watu waliojenga jukwaa hili, na hakuna hata moja iliyosomwa na mtu anayeizungumza. Ukurasa wa lugha unasema hivyo kando ya kila lugha, si kwenye tanbihi, kwa sababu “imetafsiriwa” na “imesomwa na mtu anayeizungumza” ni madai mawili tofauti, na la kwanza tu ndilo la kweli.',
    'about.langHeld':
      'Pale ambapo hatukuweza kuandika lugha vizuri kiasi cha kuamini tulichoandika, tunaonyesha Kiingereza badala yake mpaka mzungumzaji aisome.',
    'about.langWhole': 'Zimeandikwa lakini hazitolewi kabisa: {languages}',
    'about.langPartly':
      'Lugha ambazo skrini za nyakati za sala, tarehe ya Hijria na kihesabio huonyeshwa kwa Kiingereza: {count}. Ukurasa wa lugha unaorodhesha kila moja pamoja na sehemu ambayo msomaji huonyeshwa kwa kweli.',
    'about.langFix':
      'Ikiwa neno linaonekana kwako kuwa na kosa katika lugha yako mwenyewe, karatasi ya masahihisho ndipo mahali pa kusema. Haihitaji akaunti, inakuonyesha sentensi ya Kiingereza na tafsiri ya sasa kando kwa kando, na unabadilisha tu mistari yenye makosa. Jina lako huchapishwa kando ya lugha ikiwa ulichotuma kitakubaliwa. Anwani yako ya barua pepe haichapishwi kamwe na haiwi kamwe njia ya kuingia.',
    'about.langSheet': 'Fungua karatasi ya masahihisho',
    'about.teachTitle': 'Nani anafundisha hapa',
    'about.teachAppoint':
      'Kufundisha ni kwa kuteuliwa. Hakuna anayekuwa mwalimu kwa kujisajili: mmiliki au wafanyakazi wa utawala ndio wanaotoa nafasi hiyo, kwa sababu iliyoandikwa, na kuiondoa ni vivyo hivyo. Kila kozi bado hupitia uhakiki, yeyote aliyeiandika.',
    'about.teachAsk':
      'Unaweza kuomba. Ombi la kufundisha hutuma sifa zako na kiungo cha somo ulilowahi kufundisha, na mmiliki husoma vyote viwili. Kuomba hakutoi chochote: ni ombi la kuteuliwa, na jibu ni uamuzi ulioandikwa unaoweza kuusoma.',
    'about.teachPage':
      'Mwalimu anaweza kuchapisha ukurasa kuhusu yeye mwenyewe. Akiwa amefanya hivyo, ukurasa wa kozi humtaja kwa jina na kuunganisha nao. Asipofanya hivyo, ukurasa wa kozi husema kozi iliandikwa na mwalimu aliyeteuliwa na kuidhinishwa na mhakiki, na huliacha jina. Jina lisilokuwepo ni chaguo la faragha, si kozi duni.',
    'about.keptTitle': 'Kinachohifadhiwa, na kisichoandikwa upya kamwe',
    'about.keptProgress':
      'Maendeleo yako ni yako, na kozi uliyoilipia hubaki kwenye akaunti yako. Cheti kina namba ambayo yeyote anaweza kuitafuta bila akaunti, na bado kinaweza kuhakikiwa hata kozi ikiondolewa baadaye.',
    'about.keptPayment':
      'Kumbukumbu ya malipo haiandikwi upya kamwe: marekebisho ni ingizo jipya kando ya la zamani, si kulihariri. Maoni ya mwanafunzi kuhusu kozi ama huchapishwa kama alivyoyaandika ama huondolewa kwa sababu anayoweza kuiona. Wafanyakazi hawawezi kuyaandika upya kuwa kitu kingine.',
    'about.cost':
      'Kutazama hakugharimu chochote. Kozi hununuliwa kwa mwanafunzi mmoja aliyetajwa kwa jina: ununuzi mmoja ni wa mwanafunzi mmoja, kamwe si wa kaya.',
  },
  af: {
    'about.title': 'Hoekom AyahSpring',
    'about.description':
      'Wat AyahSpring leer, hoe ’n kursus by ’n leerder uitkom, hoekom ’n kind ’n leerder en nie ’n rekening is nie, en wie toegelaat word om hier te onderrig.',
    'about.lede':
      '{ayah} is ’n vers van die Koran en, in die ouer betekenis van die woord, ’n teken. {spring} is vernuwing: die groei wat op water volg. Die naam is wat hierdie platform probeer wees: die vers, en die mens wat leer om dit te dra.',
    'about.bar':
      'Alles hieronder beskryf iets wat die platform doen, nie iets wat dit beoog nie. Hierdie bladsy is geskryf om waar te bly wanneer funksies aan- en afgeskakel word; daarom vertel dit jou die reël eerder as vandag se instelling, en dit sê liewer minder as om iets te sê wat net hierdie week waar is.',
    'about.catTitle': 'Een katalogus, twee soorte leerders',
    'about.catAudience':
      'Kinders en volwassenes is verskillende lesers, dus verklaar ’n kursus vir wie dit is: kinders, volwassenes of albei. Die katalogus kan tot een gehoor verklein word, die voorblad bied ’n deur vir elk van die twee, en ’n kursus verskyn net onder ’n gehoor wat dit self verklaar het.',
    'about.catAges':
      '’n Kursus kan ook sê vir watter ouderdomme dit geskryf is, binne die gehoor van jong leerders, sodat ’n sesjarige en ’n vyftienjarige nie by dieselfde rak uitkom nie. ’n Kursus wat geen ouderdomme noem nie, is oop vir elke ouderdom: stilte is nie ’n beperking nie, en dit word nooit so gelees nie.',
    'about.howTitle': 'Hoe ’n kursus hier kom',
    'about.how1Lead': '’n Onderwyser skryf dit.',
    'about.how1':
      '’n Konsepweergawe, met afdelings, lesse, bronne en, as die kursus geëksamineer word, ’n vasvra. Bronne word vir elke les aangegee, want ’n les oor die godsdiens moet kan sê waar dit vandaan kom.',
    'about.how2Lead': 'Iemand wat gemagtig is, gaan dit na.',
    'about.how2':
      '’n Beoordelaar kan net ’n kursus kry in ’n vak waarvoor hy of sy ’n geldige magtiging het; anders weier die databasis die toewysing. ’n Verklaarde botsing van belange keer dit ook. Die skrywer kan nie aan sy of haar eie kursus die geleerde goedkeuring gee wat dit laat publiseer nie, selfs al het hy of sy daardie magtiging.',
    'about.how3Lead': 'Dit word gepubliseer, en dan staan dit vas.',
    'about.how3':
      'Die eienaar van die platform publiseer. Van daardie oomblik af is die weergawe gevries: lesse, vasvrae en lêers kan nie verander nie. ’n Regstelling is ’n nuwe weergawe, en ’n leerder wat reeds ingeskryf is, bly op die weergawe waarmee hy of sy begin het; ’n sertifikaat is dus nooit vir ’n kursus wat stilweg onder dit verander het nie.',
    'about.childTitle': 'Kinders is leerders, nie rekeninge nie',
    'about.childNotice':
      '’n Kind registreer nie hier nie. ’n Ouer of voog hou die rekening, voeg die kind as leerder by met ’n naam en ’n ouderdomsgroep, en sien die kind se vordering. ’n Kind onder twaalf het nooit ’n eie e-posadres, wagwoord of aanmelding nie.',
    'about.childLogin':
      'Waar die platform dit toelaat, kan ’n geverifieerde voog aan ’n kind van twaalf of ouer ’n eie aanmelding gee. Die voog kies die eerste wagwoord, en kan dit terugstel of die aanmelding wegneem. Dit is die voog se daad: ’n kind maak nooit alleen ’n rekening nie.',
    'about.childBand':
      'Daar is nêrens in die stelsel ’n geboortedatum nie. ’n Ouderdomsgroep (vyf tot sewe, agt tot tien, en so meer) is genoeg om te weet wat ’n kind gewys moet word, en dit is baie minder om te verloor as iets skeefloop.',
    'about.childConsent':
      'Waar die wet verifieerbare ouerlike toestemming vereis voordat ’n kind ’n aanlyn diens gebruik, is die voorwaarde ’n voogdyverhouding, ’n verifikasiestap en ’n rekord van wie toegestem het. Die platform kan al drie hou. Om daardie vereiste vir ’n land aan te skakel, is die eienaar se besluit, geneem met regsadvies. Totdat dit aan is, word ’n kind bygevoeg deur die volwassene wat die rekening hou, nooit deur die kind self nie.',
    'about.langTitle': 'Die koppelvlak, en wie dit gelees het',
    'about.langOffered': 'Tale waarin die koppelvlak aangebied word: {count}',
    'about.langWritten':
      'Elkeen behalwe Engels is geskryf deur die mense wat hierdie platform gebou het, en nie een is gelees deur iemand wat dit praat nie. Die taalbladsy sê dit langs elke taal eerder as in ’n voetnota, want “vertaal” en “gelees deur iemand wat die taal praat” is twee verskillende aansprake, en net die eerste is waar.',
    'about.langHeld':
      'Waar ons ’n taal nie goed genoeg kon skryf om te vertrou wat ons geskryf het nie, wys ons eerder Engels totdat ’n spreker dit gelees het.',
    'about.langWhole': 'Geskryf maar glad nie aangebied nie: {languages}',
    'about.langPartly':
      'Tale waarvan die skerms vir gebedstye, die Hijri-datum en die teller in Engels gewys word: {count}. Die taalbladsy lys elkeen met die deel wat ’n leser werklik gewys word.',
    'about.langFix':
      'As ’n woord vir jou verkeerd lyk in jou eie taal, is die regstellingsblad die plek om dit te sê. Dit vra geen rekening nie, dit wys jou die Engelse sin en die huidige vertaling langs mekaar, en jy verander net die reëls wat verkeerd is. Jou naam word langs die taal gedruk as dit wat jy gestuur het, aanvaar word. Jou e-posadres word nooit gepubliseer nie en word nooit ’n aanmelding nie.',
    'about.langSheet': 'Maak die regstellingsblad oop',
    'about.teachTitle': 'Wie onderrig hier',
    'about.teachAppoint':
      'Onderrig is deur aanstelling. Niemand word ’n onderwyser deur te registreer nie: die eienaar of die bestuurspersoneel ken dit toe, met ’n geskrewe rede, en dieselfde geld vir die wegneem daarvan. Elke kursus gaan steeds deur beoordeling, wie dit ook al geskryf het.',
    'about.teachAsk':
      'Jy mag vra. ’n Aansoek om te onderrig stuur jou kwalifikasies en ’n skakel na ’n les wat jy gegee het, en die eienaar lees albei. Om aansoek te doen ken niks toe nie: dit is ’n versoek om ’n aanstelling, en die antwoord is ’n geskrewe besluit wat jy kan lees.',
    'about.teachPage':
      '’n Onderwyser mag ’n bladsy oor hulself publiseer. Wanneer hulle dit gedoen het, noem die kursusbladsy hulle by die naam en skakel daarheen. Wanneer hulle dit nie gedoen het nie, sê die kursusbladsy dat die kursus deur ’n aangestelde onderwyser geskryf en deur ’n beoordelaar goedgekeur is, en laat die naam weg. ’n Naam wat ontbreek, is ’n privaatheidskeuse, nie ’n mindere kursus nie.',
    'about.keptTitle': 'Wat gehou word, en wat nooit herskryf word nie',
    'about.keptProgress':
      'Jou vordering behoort aan jou, en ’n kursus waarvoor jy betaal het, bly in jou rekening. ’n Sertifikaat dra ’n nommer wat enigiemand kan naslaan, sonder ’n rekening, en dit kan steeds nagegaan word al word die kursus later onttrek.',
    'about.keptPayment':
      '’n Betalingsrekord word nooit herskryf nie: ’n regstelling is ’n nuwe inskrywing langs die oue, nie ’n wysiging daarvan nie. ’n Leerder se resensie van ’n kursus word óf gepubliseer soos dit geskryf is, óf onttrek met ’n rede wat die leerder kan sien. Personeel kan dit nie in iets anders herskryf nie.',
    'about.cost':
      'Om te kyk kos niks. ’n Kursus word gekoop vir een leerder wat by die naam genoem word: een aankoop dek een leerder, nooit ’n huishouding nie.',
  },
  'zh-hans': {
    'about.title': '为什么是 AyahSpring',
    'about.description': 'AyahSpring 教什么，课程如何到达学习者手中，为什么孩子是学习者而不是账户，以及谁可以在这里任教。',
    'about.lede': '{ayah} 是《古兰经》的一节经文，按这个词较早的含义，也是一个迹象。{spring} 是更新：水来之后的生长。这个名字就是本平台想要成为的样子：经文，以及学习承载它的人。',
    'about.bar': '下面的每一项说的都是平台正在做的事，而不是打算做的事。这一页的写法，是要在功能开启或关闭时依然属实，所以它告诉你的是规则而不是今天的设置；宁可少说，也不说只在本周成立的话。',
    'about.catTitle': '一个目录，两类学习者',
    'about.catAudience': '儿童和成人是不同的读者，所以每门课程都会声明它面向谁：儿童、成人，或两者。目录可以只看一类人群，首页为两类人群各设一扇门，课程只会出现在它声明过的人群之下。',
    'about.catAges':
      '课程还可以说明它在少年学习者这一人群中是为哪些年龄写的，这样六岁的孩子和十五岁的少年不会走到同一个书架前。没有写明年龄的课程对所有年龄开放：不说不等于限制，也从不被当作限制。',
    'about.howTitle': '课程是怎样来到这里的',
    'about.how1Lead': '由一位教师编写。',
    'about.how1': '一个草稿版本，包含章节、课时、来源，课程若有考核则还有测验。每个课时都注明来源，因为讲宗教的课应当说得出它出自哪里。',
    'about.how2Lead': '由获得授权的人审核。',
    'about.how2': '审核人只能被分配到他持有现行授权的科目的课程，否则数据库会拒绝这次分配。已申报的利益冲突同样会阻止分配。作者不能给自己的课程作出使其得以发布的学术批准，即使他持有该授权。',
    'about.how3Lead': '发布之后就固定下来。',
    'about.how3':
      '由平台所有者发布。从那一刻起，这个版本即被冻结：课时、测验和文件都不能更改。更正是一个新版本，已经报名的学习者留在他开始学习的那个版本上，所以证书永远不会属于一门在它背后悄悄改变过的课程。',
    'about.childTitle': '儿童是学习者，不是账户',
    'about.childNotice': '儿童不在这里注册。账户由父母或监护人持有，由他们用姓名和年龄段把孩子添加为学习者，并查看孩子的进度。未满十二岁的儿童永远不会有自己的电子邮箱、密码或登录方式。',
    'about.childLogin':
      '在平台允许的情况下，经过验证的监护人可以给年满十二岁的孩子一个属于孩子自己的登录方式。第一个密码由监护人选定，监护人可以重设密码，也可以收回这个登录方式。这是监护人的行为：孩子永远不会独自创建账户。',
    'about.childBand': '系统中任何地方都没有出生日期。一个年龄段（五至七岁、八至十岁，依此类推）足以知道该给孩子看什么，而一旦出了问题，可能丢失的东西也少得多。',
    'about.childConsent':
      '在法律要求儿童使用在线服务之前须取得可验证的父母同意的地方，条件是监护关系、一个验证步骤以及谁作出同意的记录。平台可以保存这三项。是否对某个国家启用这项要求，由所有者在取得法律意见后决定。在启用之前，孩子由持有账户的成年人添加，绝不由孩子自己添加。',
    'about.langTitle': '界面，以及谁读过它',
    'about.langOffered': '提供界面的语言数量：{count}',
    'about.langWritten':
      '除英语外，每一种都是由搭建本平台的人写的，没有一种经过讲这种语言的人阅读。语言页面把这一点写在每种语言旁边，而不是写在脚注里，因为“已翻译”和“经讲这种语言的人读过”是两个不同的说法，而只有前一个是真的。',
    'about.langHeld': '凡是我们写得不够好、不足以信任自己所写内容的语言，我们就先显示英语，直到有讲这种语言的人读过为止。',
    'about.langWhole': '已写好但完全不提供：{languages}',
    'about.langPartly': '礼拜时间、伊斯兰历日期和计数器页面以英语显示的语言数量：{count}。语言页面列出了其中每一种，以及读者实际看到的比例。',
    'about.langFix':
      '如果你觉得自己语言里的某个词不对，可以在更正表上指出。它不需要账户，会把英语原句和当前译文并排显示，你只需修改有错的那几行。如果你提交的内容被采纳，你的名字会印在该语言旁边。你的电子邮箱地址绝不会公开，也绝不会变成登录方式。',
    'about.langSheet': '打开更正表',
    'about.teachTitle': '谁在这里任教',
    'about.teachAppoint': '任教须经任命。没有人能靠注册成为教师：由所有者或治理人员授予，并附书面理由，撤销时也是如此。无论作者是谁，每门课程仍须经过审核。',
    'about.teachAsk': '你可以提出申请。申请任教时会提交你的资历和你讲过的一节课的链接，所有者会阅读这两项。申请本身不授予任何东西：它是一份任命请求，答复是一份你可以阅读的书面决定。',
    'about.teachPage':
      '教师可以发布一个介绍自己的页面。发布了的，课程页面会写出其姓名并链接到该页面。没有发布的，课程页面会说明课程由一位获任命的教师编写并经一位审核人批准，不写姓名。不写姓名是一种隐私选择，并不代表课程较差。',
    'about.keptTitle': '哪些会被保留，哪些永远不会被改写',
    'about.keptProgress': '你的进度属于你，你付费购买的课程会留在你的账户里。证书上有一个编号，任何人无需账户都可以查询；即使课程日后下架，它仍然可以核验。',
    'about.keptPayment':
      '付款记录永远不会被改写：更正是在旧记录旁边新增一条，而不是修改旧记录。学习者对课程的评价，要么按其所写原样发布，要么附上其本人看得到的理由撤下。工作人员不能把它改写成别的内容。',
    'about.cost': '浏览不收费。课程是为一名具名的学习者购买的：一次购买只涵盖一名学习者，绝不涵盖一个家庭。',
  },
  'zh-hant': {
    'about.title': '為什麼是 AyahSpring',
    'about.description': 'AyahSpring 教什麼，課程如何到達學習者手中，為什麼孩子是學習者而不是帳戶，以及誰可以在這裡任教。',
    'about.lede': '{ayah} 是《古蘭經》的一節經文，按這個詞較早的含義，也是一個跡象。{spring} 是更新：水來之後的生長。這個名字就是本平台想要成為的樣子：經文，以及學習承載它的人。',
    'about.bar': '下面的每一項說的都是平台正在做的事，而不是打算做的事。這一頁的寫法，是要在功能開啟或關閉時依然屬實，所以它告訴你的是規則而不是今天的設定；寧可少說，也不說只在本週成立的話。',
    'about.catTitle': '一個目錄，兩類學習者',
    'about.catAudience': '兒童和成人是不同的讀者，所以每門課程都會聲明它面向誰：兒童、成人，或兩者。目錄可以只看一類人群，首頁為兩類人群各設一扇門，課程只會出現在它聲明過的人群之下。',
    'about.catAges':
      '課程還可以說明它在少年學習者這一人群中是為哪些年齡寫的，這樣六歲的孩子和十五歲的少年不會走到同一個書架前。沒有寫明年齡的課程對所有年齡開放：不說不等於限制，也從不被當作限制。',
    'about.howTitle': '課程是怎樣來到這裡的',
    'about.how1Lead': '由一位教師編寫。',
    'about.how1': '一個草稿版本，包含章節、課堂、來源，課程若有考核則還有測驗。每一課都註明來源，因為講宗教的課應當說得出它出自哪裡。',
    'about.how2Lead': '由獲得授權的人審核。',
    'about.how2': '審核人只能被分配到他持有現行授權的科目的課程，否則資料庫會拒絕這次分配。已申報的利益衝突同樣會阻止分配。作者不能給自己的課程作出使其得以發布的學術批准，即使他持有該授權。',
    'about.how3Lead': '發布之後就固定下來。',
    'about.how3':
      '由平台擁有者發布。從那一刻起，這個版本即被凍結：課堂、測驗和檔案都不能更改。更正是一個新版本，已經報名的學習者留在他開始學習的那個版本上，所以證書永遠不會屬於一門在它背後悄悄改變過的課程。',
    'about.childTitle': '兒童是學習者，不是帳戶',
    'about.childNotice': '兒童不在這裡註冊。帳戶由父母或監護人持有，由他們用姓名和年齡層把孩子新增為學習者，並查看孩子的進度。未滿十二歲的兒童永遠不會有自己的電子郵件地址、密碼或登入方式。',
    'about.childLogin':
      '在平台允許的情況下，經過驗證的監護人可以給年滿十二歲的孩子一個屬於孩子自己的登入方式。第一個密碼由監護人選定，監護人可以重設密碼，也可以收回這個登入方式。這是監護人的行為：孩子永遠不會獨自建立帳戶。',
    'about.childBand': '系統中任何地方都沒有出生日期。一個年齡層（五至七歲、八至十歲，依此類推）足以知道該給孩子看什麼，而一旦出了問題，可能遺失的東西也少得多。',
    'about.childConsent':
      '在法律要求兒童使用線上服務之前須取得可驗證的父母同意的地方，條件是監護關係、一個驗證步驟以及誰作出同意的紀錄。平台可以保存這三項。是否對某個國家啟用這項要求，由擁有者在取得法律意見後決定。在啟用之前，孩子由持有帳戶的成年人新增，絕不由孩子自己新增。',
    'about.langTitle': '介面，以及誰讀過它',
    'about.langOffered': '提供介面的語言數量：{count}',
    'about.langWritten':
      '除英語外，每一種都是由建置本平台的人寫的，沒有一種經過講這種語言的人閱讀。語言頁面把這一點寫在每種語言旁邊，而不是寫在註腳裡，因為「已翻譯」和「經講這種語言的人讀過」是兩個不同的說法，而只有前一個是真的。',
    'about.langHeld': '凡是我們寫得不夠好、不足以信任自己所寫內容的語言，我們就先顯示英語，直到有講這種語言的人讀過為止。',
    'about.langWhole': '已寫好但完全不提供：{languages}',
    'about.langPartly': '禮拜時間、伊斯蘭曆日期和計數器頁面以英語顯示的語言數量：{count}。語言頁面列出了其中每一種，以及讀者實際看到的比例。',
    'about.langFix':
      '如果你覺得自己語言裡的某個詞不對，可以在更正表上指出。它不需要帳戶，會把英語原句和目前的譯文並排顯示，你只需修改有錯的那幾行。如果你提交的內容被採納，你的名字會印在該語言旁邊。你的電子郵件地址絕不會公開，也絕不會變成登入方式。',
    'about.langSheet': '開啟更正表',
    'about.teachTitle': '誰在這裡任教',
    'about.teachAppoint': '任教須經任命。沒有人能靠註冊成為教師：由擁有者或治理人員授予，並附書面理由，撤銷時也是如此。無論作者是誰，每門課程仍須經過審核。',
    'about.teachAsk': '你可以提出申請。申請任教時會提交你的資歷和你講過的一堂課的連結，擁有者會閱讀這兩項。申請本身不授予任何東西：它是一份任命請求，答覆是一份你可以閱讀的書面決定。',
    'about.teachPage':
      '教師可以發布一個介紹自己的頁面。發布了的，課程頁面會寫出其姓名並連結到該頁面。沒有發布的，課程頁面會說明課程由一位獲任命的教師編寫並經一位審核人批准，不寫姓名。不寫姓名是一種隱私選擇，並不代表課程較差。',
    'about.keptTitle': '哪些會被保留，哪些永遠不會被改寫',
    'about.keptProgress': '你的進度屬於你，你付費購買的課程會留在你的帳戶裡。證書上有一個編號，任何人無需帳戶都可以查詢；即使課程日後下架，它仍然可以核驗。',
    'about.keptPayment':
      '付款紀錄永遠不會被改寫：更正是在舊紀錄旁邊新增一筆，而不是修改舊紀錄。學習者對課程的評價，要麼按其所寫原樣發布，要麼附上其本人看得到的理由撤下。工作人員不能把它改寫成別的內容。',
    'about.cost': '瀏覽不收費。課程是為一名具名的學習者購買的：一次購買只涵蓋一名學習者，絕不涵蓋一個家庭。',
  },
  vi: {
    'about.title': 'Vì sao là AyahSpring',
    'about.description':
      'AyahSpring dạy gì, một khóa học đến với người học như thế nào, vì sao trẻ em là người học chứ không phải tài khoản, và ai được phép dạy ở đây.',
    'about.lede':
      '{ayah} là một câu kinh trong Kinh Qur’an và, theo nghĩa xưa của từ này, là một dấu hiệu. {spring} là sự đổi mới: sự sinh trưởng đến sau nước. Cái tên chính là điều nền tảng này cố gắng trở thành: câu kinh, và người đang học cách mang nó theo.',
    'about.bar':
      'Mọi điều dưới đây mô tả việc nền tảng đang làm, không phải việc nền tảng dự định làm. Trang này được viết để vẫn đúng khi các tính năng được bật và tắt; vì vậy nó nói cho bạn quy tắc chứ không phải thiết lập của hôm nay, và thà nói ít còn hơn nói điều chỉ đúng trong tuần này.',
    'about.catTitle': 'Một danh mục, hai kiểu người học',
    'about.catAudience':
      'Trẻ em và người lớn là những người đọc khác nhau, nên mỗi khóa học nêu rõ nó dành cho ai: trẻ em, người lớn, hoặc cả hai. Danh mục có thể thu hẹp về một nhóm, trang đầu có một cánh cửa cho mỗi nhóm, và một khóa học chỉ xuất hiện dưới nhóm mà nó đã nêu.',
    'about.catAges':
      'Một khóa học cũng có thể cho biết nó được viết cho những độ tuổi nào trong nhóm người học nhỏ tuổi, để một em sáu tuổi và một em mười lăm tuổi không đến cùng một kệ. Khóa học không nêu độ tuổi thì mở cho mọi độ tuổi: im lặng không phải là hạn chế và không bao giờ được hiểu là hạn chế.',
    'about.howTitle': 'Một khóa học đến đây như thế nào',
    'about.how1Lead': 'Một giáo viên viết nó.',
    'about.how1':
      'Một phiên bản nháp, có các phần, bài học, nguồn và, nếu khóa học có kiểm tra, một bài trắc nghiệm. Nguồn được dẫn cho từng bài học, vì một bài học về tôn giáo phải nói được nó đến từ đâu.',
    'about.how2Lead': 'Một người được ủy quyền kiểm tra nó.',
    'about.how2':
      'Người thẩm định chỉ có thể được giao một khóa học thuộc môn mà họ đang có ủy quyền còn hiệu lực, nếu không cơ sở dữ liệu sẽ từ chối việc giao đó. Xung đột lợi ích đã khai báo cũng ngăn việc này. Tác giả không thể tự cấp cho khóa học của mình sự phê duyệt học thuật cho phép xuất bản, dù họ có ủy quyền đó.',
    'about.how3Lead': 'Nó được xuất bản, rồi được giữ nguyên.',
    'about.how3':
      'Chủ sở hữu nền tảng là người xuất bản. Từ lúc đó phiên bản bị đóng băng: bài học, bài trắc nghiệm và tệp không thể thay đổi. Sửa lỗi là một phiên bản mới, và người học đã ghi danh vẫn ở phiên bản họ bắt đầu; vì vậy chứng chỉ không bao giờ thuộc về một khóa học đã lặng lẽ thay đổi bên dưới nó.',
    'about.childTitle': 'Trẻ em là người học, không phải tài khoản',
    'about.childNotice':
      'Trẻ em không đăng ký ở đây. Cha mẹ hoặc người giám hộ giữ tài khoản, thêm trẻ làm người học với một cái tên và một nhóm tuổi, và xem tiến độ của trẻ. Trẻ dưới mười hai tuổi không bao giờ có địa chỉ email, mật khẩu hay thông tin đăng nhập riêng.',
    'about.childLogin':
      'Ở nơi nền tảng cho phép, người giám hộ đã được xác minh có thể cấp cho trẻ từ mười hai tuổi trở lên một thông tin đăng nhập riêng. Người giám hộ chọn mật khẩu đầu tiên, và có thể đặt lại mật khẩu hoặc thu hồi thông tin đăng nhập đó. Đó là việc làm của người giám hộ: trẻ không bao giờ tự mình tạo tài khoản.',
    'about.childBand':
      'Không có ngày sinh ở bất kỳ đâu trong hệ thống. Một nhóm tuổi (năm đến bảy, tám đến mười, và cứ thế) là đủ để biết nên cho trẻ xem gì, và nếu có sự cố thì thứ có thể bị mất cũng ít hơn nhiều.',
    'about.childConsent':
      'Ở nơi pháp luật yêu cầu sự đồng ý có thể xác minh của cha mẹ trước khi trẻ dùng một dịch vụ trực tuyến, điều kiện là quan hệ giám hộ, một bước xác minh và một bản ghi về người đã đồng ý. Nền tảng có thể lưu cả ba. Bật yêu cầu đó cho một quốc gia là quyết định của chủ sở hữu, được đưa ra với tư vấn pháp lý. Cho đến khi được bật, trẻ được thêm bởi người lớn giữ tài khoản, không bao giờ do chính trẻ thêm.',
    'about.langTitle': 'Giao diện, và ai đã đọc nó',
    'about.langOffered': 'Số ngôn ngữ mà giao diện được cung cấp: {count}',
    'about.langWritten':
      'Mọi ngôn ngữ trừ tiếng Anh đều do những người xây dựng nền tảng này viết, và chưa ngôn ngữ nào được một người nói ngôn ngữ đó đọc qua. Trang ngôn ngữ nói điều đó bên cạnh từng ngôn ngữ chứ không để ở chú thích, vì “đã dịch” và “đã được người nói ngôn ngữ đó đọc” là hai khẳng định khác nhau, và chỉ khẳng định đầu là đúng.',
    'about.langHeld':
      'Ở nơi chúng tôi không viết được một ngôn ngữ đủ tốt để tin vào điều mình viết, chúng tôi hiển thị tiếng Anh thay thế cho đến khi có người bản ngữ đọc qua.',
    'about.langWhole': 'Đã viết nhưng hoàn toàn không được cung cấp: {languages}',
    'about.langPartly':
      'Số ngôn ngữ có màn hình giờ cầu nguyện, ngày Hijri và bộ đếm được hiển thị bằng tiếng Anh: {count}. Trang ngôn ngữ liệt kê từng ngôn ngữ cùng phần mà người đọc thực sự được thấy.',
    'about.langFix':
      'Nếu bạn thấy một từ có vẻ sai trong ngôn ngữ của mình, bảng sửa lỗi là nơi để nói điều đó. Nó không yêu cầu tài khoản, cho bạn thấy câu tiếng Anh và bản dịch hiện tại cạnh nhau, và bạn chỉ sửa những dòng sai. Tên bạn được in bên cạnh ngôn ngữ nếu nội dung bạn gửi được chấp nhận. Địa chỉ email của bạn không bao giờ được công bố và không bao giờ trở thành thông tin đăng nhập.',
    'about.langSheet': 'Mở bảng sửa lỗi',
    'about.teachTitle': 'Ai dạy ở đây',
    'about.teachAppoint':
      'Việc giảng dạy là theo bổ nhiệm. Không ai trở thành giáo viên bằng cách đăng ký: chủ sở hữu hoặc nhân sự quản trị cấp quyền đó, kèm lý do bằng văn bản, và việc thu hồi cũng vậy. Mọi khóa học vẫn phải qua thẩm định, dù ai viết.',
    'about.teachAsk':
      'Bạn có thể xin. Đơn xin giảng dạy gửi trình độ của bạn và một liên kết đến bài học bạn đã dạy, và chủ sở hữu đọc cả hai. Nộp đơn không cấp cho bạn điều gì: đó là lời đề nghị được bổ nhiệm, và câu trả lời là một quyết định bằng văn bản mà bạn có thể đọc.',
    'about.teachPage':
      'Giáo viên có thể công bố một trang về bản thân. Khi đã công bố, trang khóa học nêu tên họ và liên kết đến trang đó. Khi chưa, trang khóa học nói rằng khóa học do một giáo viên được bổ nhiệm viết và được một người thẩm định phê duyệt, và không nêu tên. Không có tên là một lựa chọn về quyền riêng tư, không phải một khóa học kém hơn.',
    'about.keptTitle': 'Những gì được lưu giữ, và những gì không bao giờ bị viết lại',
    'about.keptProgress':
      'Tiến độ của bạn thuộc về bạn, và khóa học bạn đã trả tiền vẫn ở trong tài khoản của bạn. Chứng chỉ mang một con số mà ai cũng tra cứu được, không cần tài khoản, và vẫn kiểm tra được ngay cả khi khóa học về sau bị gỡ.',
    'about.keptPayment':
      'Bản ghi thanh toán không bao giờ bị viết lại: sửa lỗi là một mục mới bên cạnh mục cũ, không phải chỉnh sửa mục cũ. Đánh giá của người học về một khóa học hoặc được đăng đúng như họ viết, hoặc bị gỡ kèm lý do mà họ có thể thấy. Nhân viên không thể viết lại nó thành điều khác.',
    'about.cost':
      'Xem thì không tốn gì. Một khóa học được mua cho một người học có tên cụ thể: một lần mua dành cho một người học, không bao giờ cho cả hộ gia đình.',
  },
  th: {
    'about.title': 'ทำไมต้อง AyahSpring',
    'about.description':
      'AyahSpring สอนอะไร หลักสูตรไปถึงผู้เรียนได้อย่างไร ทำไมเด็กจึงเป็นผู้เรียนไม่ใช่บัญชี และใครได้รับอนุญาตให้สอนที่นี่',
    'about.lede':
      '{ayah} คืออายะฮ์หนึ่งของอัลกุรอาน และในความหมายเก่าของคำนี้คือสัญญาณ {spring} คือการเริ่มใหม่ ได้แก่การเติบโตที่ตามมาหลังน้ำ ชื่อนี้คือสิ่งที่แพลตฟอร์มนี้พยายามจะเป็น คืออายะฮ์ และผู้ที่กำลังเรียนรู้ที่จะแบกรับมัน',
    'about.bar':
      'ทุกอย่างด้านล่างอธิบายสิ่งที่แพลตฟอร์มทำ ไม่ใช่สิ่งที่ตั้งใจจะทำ หน้านี้เขียนขึ้นเพื่อให้ยังคงเป็นจริงเมื่อมีการเปิดและปิดฟีเจอร์ จึงบอกกฎแทนการตั้งค่าของวันนี้ และยอมพูดน้อยกว่าดีกว่าพูดสิ่งที่เป็นจริงแค่สัปดาห์นี้',
    'about.catTitle': 'แคตตาล็อกเดียว ผู้เรียนสองแบบ',
    'about.catAudience':
      'เด็กและผู้ใหญ่เป็นผู้อ่านที่ต่างกัน หลักสูตรจึงประกาศว่าทำมาเพื่อใคร คือเด็ก ผู้ใหญ่ หรือทั้งสอง แคตตาล็อกสามารถจำกัดให้เหลือกลุ่มเดียวได้ หน้าแรกมีประตูสำหรับแต่ละกลุ่ม และหลักสูตรจะปรากฏเฉพาะใต้กลุ่มที่ตนประกาศไว้เท่านั้น',
    'about.catAges':
      'หลักสูตรยังบอกได้ด้วยว่าเขียนขึ้นสำหรับอายุใดภายในกลุ่มผู้เรียนเยาว์วัย เพื่อให้เด็กหกขวบกับเยาวชนอายุสิบห้าไม่ไปถึงชั้นเดียวกัน หลักสูตรที่ไม่ระบุอายุเปิดสำหรับทุกวัย การไม่ระบุไม่ใช่ข้อจำกัด และไม่เคยถูกอ่านว่าเป็นข้อจำกัด',
    'about.howTitle': 'หลักสูตรมาถึงที่นี่ได้อย่างไร',
    'about.how1Lead': 'ครูเป็นผู้เขียน',
    'about.how1':
      'ฉบับร่างที่มีหมวด บทเรียน แหล่งอ้างอิง และแบบทดสอบหากหลักสูตรมีการสอบ แหล่งอ้างอิงระบุไว้สำหรับแต่ละบทเรียน เพราะบทเรียนเกี่ยวกับศาสนาควรบอกได้ว่ามาจากไหน',
    'about.how2Lead': 'ผู้ที่ได้รับอนุญาตเป็นผู้ตรวจ',
    'about.how2':
      'ผู้ตรวจจะได้รับมอบหมายหลักสูตรได้เฉพาะในวิชาที่ตนมีใบอนุญาตที่ยังมีผลอยู่ มิฉะนั้นฐานข้อมูลจะปฏิเสธการมอบหมายนั้น ผลประโยชน์ทับซ้อนที่แจ้งไว้ก็ขัดขวางเช่นกัน ผู้เขียนไม่สามารถให้การรับรองทางวิชาการที่ทำให้หลักสูตรของตนเองเผยแพร่ได้ แม้จะมีใบอนุญาตนั้นก็ตาม',
    'about.how3Lead': 'เผยแพร่แล้วจึงคงที่',
    'about.how3':
      'เจ้าของแพลตฟอร์มเป็นผู้เผยแพร่ นับจากนั้นเวอร์ชันจะถูกตรึงไว้ บทเรียน แบบทดสอบ และไฟล์เปลี่ยนไม่ได้ การแก้ไขคือเวอร์ชันใหม่ และผู้เรียนที่ลงทะเบียนแล้วจะอยู่กับเวอร์ชันที่ตนเริ่มเรียน ใบรับรองจึงไม่มีวันเป็นของหลักสูตรที่เปลี่ยนไปอย่างเงียบ ๆ อยู่เบื้องหลัง',
    'about.childTitle': 'เด็กคือผู้เรียน ไม่ใช่บัญชี',
    'about.childNotice':
      'เด็กไม่ได้สมัครสมาชิกที่นี่ พ่อแม่หรือผู้ปกครองเป็นผู้ถือบัญชี เพิ่มเด็กเป็นผู้เรียนด้วยชื่อและช่วงอายุ และดูความก้าวหน้าของเด็ก เด็กอายุต่ำกว่าสิบสองปีไม่มีวันมีที่อยู่อีเมล รหัสผ่าน หรือการเข้าสู่ระบบของตนเอง',
    'about.childLogin':
      'ในกรณีที่แพลตฟอร์มอนุญาต ผู้ปกครองที่ผ่านการยืนยันแล้วอาจให้เด็กอายุสิบสองปีขึ้นไปมีการเข้าสู่ระบบของตนเองได้ ผู้ปกครองเป็นผู้เลือกรหัสผ่านแรก และสามารถตั้งใหม่หรือถอนการเข้าสู่ระบบนั้นได้ นี่เป็นการกระทำของผู้ปกครอง เด็กไม่มีวันสร้างบัญชีด้วยตัวเองตามลำพัง',
    'about.childBand':
      'ไม่มีวันเกิดอยู่ที่ใดในระบบเลย ช่วงอายุ (ห้าถึงเจ็ด แปดถึงสิบ เป็นต้น) ก็เพียงพอที่จะรู้ว่าควรแสดงอะไรให้เด็กเห็น และหากมีอะไรผิดพลาด สิ่งที่จะสูญเสียก็น้อยกว่ามาก',
    'about.childConsent':
      'ในที่ที่กฎหมายกำหนดให้ต้องมีความยินยอมของผู้ปกครองที่ตรวจสอบได้ก่อนที่เด็กจะใช้บริการออนไลน์ เงื่อนไขคือความสัมพันธ์ของผู้ปกครอง ขั้นตอนการยืนยัน และบันทึกว่าใครเป็นผู้ยินยอม แพลตฟอร์มเก็บได้ทั้งสามอย่าง การเปิดใช้ข้อกำหนดนี้สำหรับประเทศใดเป็นการตัดสินใจของเจ้าของ โดยมีคำแนะนำทางกฎหมาย จนกว่าจะเปิดใช้ เด็กจะถูกเพิ่มโดยผู้ใหญ่ที่ถือบัญชี ไม่ใช่โดยตัวเด็กเอง',
    'about.langTitle': 'ส่วนติดต่อผู้ใช้ และใครอ่านมันแล้ว',
    'about.langOffered': 'ภาษาที่มีส่วนติดต่อผู้ใช้ให้เลือก: {count}',
    'about.langWritten':
      'ทุกภาษายกเว้นภาษาอังกฤษเขียนโดยผู้ที่สร้างแพลตฟอร์มนี้ และยังไม่มีภาษาใดที่ผู้พูดภาษานั้นได้อ่าน หน้าภาษาบอกเรื่องนี้ไว้ข้างแต่ละภาษาแทนที่จะใส่ในเชิงอรรถ เพราะ “แปลแล้ว” กับ “ผู้พูดภาษานั้นอ่านแล้ว” เป็นคำกล่าวสองอย่างที่ต่างกัน และมีเพียงอย่างแรกที่เป็นจริง',
    'about.langHeld':
      'ในกรณีที่เราเขียนภาษาใดได้ไม่ดีพอที่จะเชื่อถือสิ่งที่เขียน เราจะแสดงภาษาอังกฤษแทนจนกว่าผู้พูดภาษานั้นจะได้อ่าน',
    'about.langWhole': 'เขียนแล้วแต่ไม่เปิดให้ใช้เลย: {languages}',
    'about.langPartly':
      'ภาษาที่หน้าจอเวลาละหมาด วันที่ฮิจเราะห์ และตัวนับแสดงเป็นภาษาอังกฤษ: {count} หน้าภาษาแสดงรายการแต่ละภาษาพร้อมสัดส่วนที่ผู้อ่านได้เห็นจริง',
    'about.langFix':
      'หากมีคำใดดูผิดในภาษาของคุณเอง แผ่นแก้ไขคือที่สำหรับบอก แผ่นนี้ไม่ต้องใช้บัญชี แสดงประโยคภาษาอังกฤษและคำแปลปัจจุบันเคียงข้างกัน และคุณแก้เฉพาะบรรทัดที่ผิด ชื่อของคุณจะถูกพิมพ์ไว้ข้างภาษานั้นหากสิ่งที่คุณส่งมาได้รับการยอมรับ ที่อยู่อีเมลของคุณไม่มีวันถูกเผยแพร่และไม่มีวันกลายเป็นการเข้าสู่ระบบ',
    'about.langSheet': 'เปิดแผ่นแก้ไข',
    'about.teachTitle': 'ใครสอนที่นี่',
    'about.teachAppoint':
      'การสอนเป็นไปโดยการแต่งตั้ง ไม่มีใครเป็นครูได้ด้วยการสมัครสมาชิก เจ้าของหรือเจ้าหน้าที่กำกับดูแลเป็นผู้ให้ โดยมีเหตุผลเป็นลายลักษณ์อักษร และการถอนก็เช่นเดียวกัน ทุกหลักสูตรยังต้องผ่านการตรวจ ไม่ว่าใครจะเป็นผู้เขียน',
    'about.teachAsk':
      'คุณขอได้ การสมัครเป็นผู้สอนจะส่งคุณวุฒิของคุณและลิงก์ไปยังบทเรียนที่คุณเคยสอน และเจ้าของจะอ่านทั้งสองอย่าง การสมัครไม่ได้ให้สิทธิ์ใด เป็นเพียงคำขอรับการแต่งตั้ง และคำตอบคือคำตัดสินเป็นลายลักษณ์อักษรที่คุณอ่านได้',
    'about.teachPage':
      'ครูอาจเผยแพร่หน้าเกี่ยวกับตนเองได้ เมื่อเผยแพร่แล้ว หน้าหลักสูตรจะระบุชื่อครูและลิงก์ไปยังหน้านั้น เมื่อยังไม่ได้เผยแพร่ หน้าหลักสูตรจะบอกว่าหลักสูตรเขียนโดยครูที่ได้รับการแต่งตั้งและผ่านการรับรองจากผู้ตรวจ และเว้นชื่อไว้ การไม่มีชื่อเป็นการเลือกเรื่องความเป็นส่วนตัว ไม่ใช่หลักสูตรที่ด้อยกว่า',
    'about.keptTitle': 'อะไรที่เก็บไว้ และอะไรที่ไม่มีวันถูกเขียนทับ',
    'about.keptProgress':
      'ความก้าวหน้าของคุณเป็นของคุณ และหลักสูตรที่คุณจ่ายเงินแล้วจะอยู่ในบัญชีของคุณ ใบรับรองมีหมายเลขที่ใครก็ค้นดูได้โดยไม่ต้องมีบัญชี และยังตรวจสอบได้แม้หลักสูตรจะถูกยกเลิกในภายหลัง',
    'about.keptPayment':
      'บันทึกการชำระเงินไม่มีวันถูกเขียนทับ การแก้ไขคือรายการใหม่ข้างรายการเดิม ไม่ใช่การแก้รายการเดิม รีวิวหลักสูตรของผู้เรียนจะถูกเผยแพร่ตามที่เขาเขียน หรือถูกถอนออกพร้อมเหตุผลที่เขามองเห็นได้ เจ้าหน้าที่ไม่สามารถเขียนใหม่ให้เป็นอย่างอื่นได้',
    'about.cost':
      'การดูไม่มีค่าใช้จ่าย หลักสูตรซื้อให้ผู้เรียนที่ระบุชื่อหนึ่งคน การซื้อหนึ่งครั้งครอบคลุมผู้เรียนหนึ่งคน ไม่ใช่ทั้งครัวเรือน',
  },
  fil: {
    'about.title': 'Bakit AyahSpring',
    'about.description':
      'Kung ano ang itinuturo ng AyahSpring, paano nakararating ang kurso sa mag-aaral, bakit mag-aaral ang bata at hindi account, at sino ang pinapayagang magturo rito.',
    'about.lede':
      'Ang {ayah} ay isang talata ng Qur’an at, sa mas lumang kahulugan ng salita, isang tanda. Ang {spring} ay pagpapanibago: ang paglagong sumusunod sa tubig. Ang pangalan ang siyang sinisikap na maging ng platapormang ito: ang talata, at ang taong natututong dalhin ito.',
    'about.bar':
      'Ang lahat ng nasa ibaba ay naglalarawan ng ginagawa ng plataporma, hindi ng balak nitong gawin. Isinulat ang pahinang ito para manatiling totoo kapag binubuksan at pinapatay ang mga tampok, kaya ang sinasabi nito ay ang tuntunin at hindi ang setting ngayong araw, at mas pipiliin nitong kaunti ang sabihin kaysa magsabi ng bagay na totoo lang ngayong linggo.',
    'about.catTitle': 'Isang katalogo, dalawang uri ng mag-aaral',
    'about.catAudience':
      'Magkaibang mambabasa ang mga bata at ang matatanda, kaya ipinapahayag ng kurso kung para kanino ito: sa mga bata, sa matatanda, o sa pareho. Maaaring paliitin ang katalogo sa iisang pangkat, may pinto ang unang pahina para sa bawat isa sa dalawa, at lumilitaw lang ang kurso sa ilalim ng pangkat na ipinahayag nito.',
    'about.catAges':
      'Maaari ding sabihin ng kurso kung para sa anong mga edad ito isinulat sa loob ng pangkat ng mga batang mag-aaral, para hindi mapunta sa iisang estante ang anim na taong gulang at ang labinlimang taong gulang. Bukas sa lahat ng edad ang kursong walang binanggit na edad: hindi paghihigpit ang pananahimik, at hindi ito kailanman binabasa nang ganoon.',
    'about.howTitle': 'Paano nakararating dito ang isang kurso',
    'about.how1Lead': 'Isinusulat ito ng isang guro.',
    'about.how1':
      'Isang bersiyong burador, na may mga seksiyon, aralin, sanggunian at, kung may pagsusulit ang kurso, isang quiz. Binabanggit ang mga sanggunian sa bawat aralin, dahil dapat masabi ng araling tungkol sa relihiyon kung saan ito nagmula.',
    'about.how2Lead': 'Sinusuri ito ng isang may pahintulot.',
    'about.how2':
      'Mabibigyan lang ang tagasuri ng kurso sa paksang may kasalukuyan siyang pahintulot, at kung wala, tinatanggihan ng database ang pagtatalaga. Hinahadlangan din ito ng ipinahayag na salungatan ng interes. Hindi maibibigay ng may-akda sa sarili niyang kurso ang pag-aprobang pang-iskolar na nagpapahintulot na mailathala ito, kahit hawak niya ang pahintulot na iyon.',
    'about.how3Lead': 'Inilalathala ito, at pagkatapos ay hindi na nababago.',
    'about.how3':
      'Ang may-ari ng plataporma ang naglalathala. Mula sa sandaling iyon, nakapirmi na ang bersiyon: hindi na mababago ang mga aralin, quiz at file. Ang pagwawasto ay bagong bersiyon, at ang mag-aaral na naka-enrol na ay nananatili sa bersiyong sinimulan niya, kaya hindi kailanman para sa kursong tahimik na nagbago sa ilalim nito ang isang sertipiko.',
    'about.childTitle': 'Mga mag-aaral ang mga bata, hindi mga account',
    'about.childNotice':
      'Hindi nagsa-sign up dito ang bata. Magulang o tagapag-alaga ang may hawak ng account, siya ang nagdaragdag sa bata bilang mag-aaral na may pangalan at pangkat ng edad, at siya ang nakakakita ng pag-usad nito. Ang batang wala pang labindalawang taon ay hindi kailanman nagkakaroon ng sariling email address, password o sign-in.',
    'about.childLogin':
      'Kung pinapayagan ng plataporma, maaaring bigyan ng beripikadong tagapag-alaga ang batang labindalawang taon o higit pa ng sarili nitong sign-in. Ang tagapag-alaga ang pumipili ng unang password, at maaari niya itong i-reset o bawiin ang sign-in. Gawa iyon ng tagapag-alaga: hindi kailanman gumagawa ng account nang mag-isa ang bata.',
    'about.childBand':
      'Walang petsa ng kapanganakan saanman sa sistema. Sapat na ang pangkat ng edad (lima hanggang pito, walo hanggang sampu, at iba pa) para malaman kung ano ang dapat ipakita sa bata, at mas kaunti ang mawawala kung may magkamali.',
    'about.childConsent':
      'Kung hinihingi ng batas ang mabeberipikang pahintulot ng magulang bago gumamit ang bata ng serbisyong online, ang kondisyon ay ugnayan ng pagiging tagapag-alaga, isang hakbang ng beripikasyon at talaan kung sino ang pumayag. Kayang itago ng plataporma ang tatlo. Desisyon ng may-ari, na ginagawa nang may payong legal, ang pagbubukas ng hinihinging iyon para sa isang bansa. Hangga’t hindi ito bukas, ang nasa hustong gulang na may hawak ng account ang nagdaragdag sa bata, hindi kailanman ang bata mismo.',
    'about.langTitle': 'Ang interface, at kung sino ang nakabasa na nito',
    'about.langOffered': 'Mga wikang iniaalok ang interface: {count}',
    'about.langWritten':
      'Ang bawat isa maliban sa Ingles ay isinulat ng mga taong gumawa ng platapormang ito, at wala ni isa ang nabasa na ng taong nagsasalita nito. Sinasabi iyon ng pahina ng wika sa tabi ng bawat wika at hindi sa talababa, dahil magkaibang pahayag ang “naisalin” at “nabasa ng taong nagsasalita nito,” at ang una lang ang totoo.',
    'about.langHeld':
      'Kung hindi namin naisulat ang isang wika nang sapat na mahusay para pagkatiwalaan ang isinulat namin, Ingles ang ipinapakita namin hanggang mabasa ito ng isang nagsasalita.',
    'about.langWhole': 'Naisulat na pero hindi iniaalok kahit kaunti: {languages}',
    'about.langPartly':
      'Mga wikang nasa Ingles ang mga screen ng oras ng pagdarasal, petsang Hijri at pambilang: {count}. Inililista ng pahina ng wika ang bawat isa kasama ang bahaging talagang ipinapakita sa mambabasa.',
    'about.langFix':
      'Kung may salitang mukhang mali sa iyo sa sarili mong wika, ang pilas ng pagwawasto ang lugar para sabihin iyon. Hindi ito humihingi ng account, ipinapakita nito ang pangungusap sa Ingles at ang kasalukuyang salin nang magkatabi, at ang mga maling linya lang ang binabago mo. Inililimbag ang pangalan mo sa tabi ng wika kung tinanggap ang ipinadala mo. Hindi kailanman inilalathala ang email address mo at hindi ito kailanman nagiging sign-in.',
    'about.langSheet': 'Buksan ang pilas ng pagwawasto',
    'about.teachTitle': 'Sino ang nagtuturo rito',
    'about.teachAppoint':
      'Sa pamamagitan ng pagtatalaga ang pagtuturo. Walang nagiging guro dahil lang nag-sign up: ang may-ari o ang mga kawani ng pamamahala ang nagbibigay nito, na may nakasulat na dahilan, at ganoon din ang pagbawi nito. Dumaraan pa rin sa pagsusuri ang bawat kurso, sinuman ang sumulat.',
    'about.teachAsk':
      'Maaari kang humiling. Ipinapadala ng aplikasyon sa pagtuturo ang mga kuwalipikasyon mo at isang link sa araling itinuro mo, at binabasa ng may-ari ang dalawa. Walang ibinibigay ang pag-aaplay: kahilingan ito ng pagtatalaga, at ang sagot ay nakasulat na desisyong mababasa mo.',
    'about.teachPage':
      'Maaaring maglathala ang guro ng pahina tungkol sa sarili niya. Kapag nagawa niya, binabanggit siya ng pahina ng kurso at nagli-link doon. Kapag hindi, sinasabi ng pahina ng kurso na ang kurso ay isinulat ng itinalagang guro at inaprobahan ng isang tagasuri, at hindi isinasama ang pangalan. Pagpili sa privacy ang kawalan ng pangalan, hindi mas mababang kurso.',
    'about.keptTitle': 'Ano ang itinatago, at ano ang hindi kailanman muling isinusulat',
    'about.keptProgress':
      'Sa iyo ang pag-usad mo, at nananatili sa account mo ang kursong binayaran mo. May numero ang sertipiko na mahahanap ng sinuman nang walang account, at masusuri pa rin ito kahit alisin ang kurso sa hinaharap.',
    'about.keptPayment':
      'Hindi kailanman muling isinusulat ang talaan ng bayad: ang pagwawasto ay bagong tala sa tabi ng luma, hindi pagbabago rito. Ang rebyu ng mag-aaral sa kurso ay inilalathala ayon sa pagkakasulat niya o binabawi na may dahilang makikita niya. Hindi ito maisusulat muli ng mga kawani para maging iba.',
    'about.cost':
      'Walang bayad ang pagtingin. Binibili ang kurso para sa isang mag-aaral na may pangalan: isang mag-aaral ang sakop ng isang pagbili, hindi kailanman isang sambahayan.',
  },
  uz: {
    'about.title': 'Nega AyahSpring',
    'about.description':
      'AyahSpring nimani oʻrgatadi, kurs oʻquvchiga qanday yetib boradi, nega bola hisob emas, oʻquvchi hisoblanadi va bu yerda kimga dars berishga ruxsat etiladi.',
    'about.lede':
      '{ayah} — Qurʼon oyati va soʻzning qadimiy maʼnosida belgi. {spring} — yangilanish: suvdan keyin keladigan oʻsish. Bu nom platforma boʻlishga intilayotgan narsaning oʻzi: oyat va uni koʻtarib yurishni oʻrganayotgan inson.',
    'about.bar':
      'Quyidagi hamma narsa platforma qilmoqchi boʻlgan ishni emas, qilayotgan ishini tasvirlaydi. Bu sahifa imkoniyatlar yoqilib-oʻchirilganda ham toʻgʻri qoladigan qilib yozilgan, shuning uchun u bugungi sozlamani emas, qoidani aytadi va faqat shu hafta toʻgʻri boʻlgan gapni aytgandan koʻra kamroq aytishni afzal koʻradi.',
    'about.catTitle': 'Bitta katalog, ikki xil oʻquvchi',
    'about.catAudience':
      'Bolalar va kattalar turli oʻquvchilardir, shuning uchun kurs kim uchun ekanini eʼlon qiladi: bolalar, kattalar yoki ikkalasi. Katalogni bitta guruhga toraytirish mumkin, bosh sahifada ikkalasining har biri uchun eshik bor va kurs faqat oʻzi eʼlon qilgan guruh ostida koʻrinadi.',
    'about.catAges':
      'Kurs yosh oʻquvchilar guruhi ichida qaysi yoshlar uchun yozilganini ham aytishi mumkin, shunda olti yoshli bola bilan oʻn besh yoshli oʻsmir bitta javonga kelib qolmaydi. Yosh koʻrsatmagan kurs har qanday yoshga ochiq: sukut cheklov emas va hech qachon cheklov deb oʻqilmaydi.',
    'about.howTitle': 'Kurs bu yerga qanday keladi',
    'about.how1Lead': 'Uni oʻqituvchi yozadi.',
    'about.how1':
      'Boʻlimlar, darslar, manbalar va, agar kursda imtihon boʻlsa, test bilan birga qoralama nusxa. Manbalar har bir dars uchun koʻrsatiladi, chunki din haqidagi dars qayerdan olinganini ayta olishi kerak.',
    'about.how2Lead': 'Uni vakolatli kishi tekshiradi.',
    'about.how2':
      'Taqrizchiga faqat amaldagi ruxsati bor fan boʻyicha kurs berilishi mumkin, aks holda maʼlumotlar bazasi bu topshiriqni rad etadi. Eʼlon qilingan manfaatlar toʻqnashuvi ham bunga toʻsqinlik qiladi. Muallif oʻz kursiga uni nashr etishga yoʻl ochadigan ilmiy tasdiqni bera olmaydi, hatto oʻsha ruxsati boʻlsa ham.',
    'about.how3Lead': 'U nashr etiladi, soʻng oʻzgarmas boʻlib qoladi.',
    'about.how3':
      'Platforma egasi nashr etadi. Shu paytdan boshlab nusxa muzlatiladi: darslar, testlar va fayllar oʻzgara olmaydi. Tuzatish yangi nusxadir va allaqachon yozilgan oʻquvchi oʻzi boshlagan nusxada qoladi, shuning uchun sertifikat hech qachon ostida jimgina oʻzgarib ketgan kurs uchun boʻlmaydi.',
    'about.childTitle': 'Bolalar hisob emas, oʻquvchilardir',
    'about.childNotice':
      'Bola bu yerda roʻyxatdan oʻtmaydi. Hisob ota-ona yoki vasiyda boʻladi, u bolani ism va yosh guruhi bilan oʻquvchi sifatida qoʻshadi va uning yutuqlarini koʻradi. Oʻn ikki yoshga toʻlmagan bolaning hech qachon oʻz elektron pochta manzili, paroli yoki oʻz kirishi boʻlmaydi.',
    'about.childLogin':
      'Platforma ruxsat bergan joyda tasdiqlangan vasiy oʻn ikki yosh yoki undan katta bolaga oʻziga tegishli kirish berishi mumkin. Birinchi parolni vasiy tanlaydi va uni qayta oʻrnatishi yoki kirishni qaytarib olishi mumkin. Bu vasiyning ishi: bola hech qachon yolgʻiz oʻzi hisob ochmaydi.',
    'about.childBand':
      'Tizimning hech bir joyida tugʻilgan sana yoʻq. Yosh guruhi (besh–yetti, sakkiz–oʻn va hokazo) bolaga nima koʻrsatilishi kerakligini bilish uchun yetarli va biror narsa notoʻgʻri ketsa, yoʻqotiladigan narsa ancha kam boʻladi.',
    'about.childConsent':
      'Qonun bola onlayn xizmatdan foydalanishidan oldin ota-onaning tekshirib boʻladigan roziligini talab qilgan joyda shart — vasiylik aloqasi, tekshirish bosqichi va kim rozilik berganining yozuvi. Platforma uchalasini ham saqlay oladi. Bu talabni biror mamlakat uchun yoqish egasining qarori boʻlib, huquqiy maslahat bilan qabul qilinadi. U yoqilmaguncha bolani hisob egasi boʻlgan katta yoshli kishi qoʻshadi, bolaning oʻzi hech qachon qoʻshmaydi.',
    'about.langTitle': 'Interfeys va uni kim oʻqigani',
    'about.langOffered': 'Interfeys taklif etiladigan tillar: {count}',
    'about.langWritten':
      'Ingliz tilidan boshqa har biri shu platformani qurgan kishilar tomonidan yozilgan va birortasi ham oʻsha tilda soʻzlashadigan kishi tomonidan oʻqilmagan. Til sahifasi buni izohda emas, har bir til yonida aytadi, chunki “tarjima qilingan” va “shu tilda soʻzlashuvchi oʻqigan” — ikki boshqa daʼvo va faqat birinchisi toʻgʻri.',
    'about.langHeld':
      'Biror tilni yozganimizga ishonadigan darajada yaxshi yoza olmagan joyimizda, soʻzlashuvchi uni oʻqimaguncha oʻrniga ingliz tilini koʻrsatamiz.',
    'about.langWhole': 'Yozilgan, lekin umuman taklif etilmaydi: {languages}',
    'about.langPartly':
      'Namoz vaqtlari, hijriy sana va sanagich ekranlari ingliz tilida koʻrsatiladigan tillar: {count}. Til sahifasi ularning har birini oʻquvchiga haqiqatda koʻrsatiladigan ulushi bilan sanab beradi.',
    'about.langFix':
      'Agar oʻz tilingizda biror soʻz sizga notoʻgʻri koʻrinsa, buni aytish joyi — tuzatish varagʻi. U hisob soʻramaydi, inglizcha gap va hozirgi tarjimani yonma-yon koʻrsatadi va siz faqat notoʻgʻri satrlarni oʻzgartirasiz. Yuborganingiz qabul qilinsa, ismingiz til yonida bosiladi. Elektron pochta manzilingiz hech qachon eʼlon qilinmaydi va hech qachon kirishga aylanmaydi.',
    'about.langSheet': 'Tuzatish varagʻini ochish',
    'about.teachTitle': 'Bu yerda kim dars beradi',
    'about.teachAppoint':
      'Oʻqituvchilik tayinlash orqali boʻladi. Hech kim roʻyxatdan oʻtib oʻqituvchi boʻlmaydi: buni egasi yoki boshqaruv xodimlari yozma sabab bilan beradi va qaytarib olish ham shunday. Kim yozgan boʻlmasin, har bir kurs baribir taqrizdan oʻtadi.',
    'about.teachAsk':
      'Soʻrashingiz mumkin. Dars berishga ariza malakalaringizni va oʻzingiz oʻtgan darsga havolani yuboradi, egasi ikkalasini ham oʻqiydi. Ariza berish hech narsa bermaydi: bu tayinlash soʻrovi va javob siz oʻqiy oladigan yozma qarordir.',
    'about.teachPage':
      'Oʻqituvchi oʻzi haqida sahifa eʼlon qilishi mumkin. Qilgan boʻlsa, kurs sahifasi uning ismini aytadi va oʻsha sahifaga havola beradi. Qilmagan boʻlsa, kurs sahifasi kursni tayinlangan oʻqituvchi yozgani va taqrizchi tasdiqlaganini aytadi hamda ismni koʻrsatmaydi. Ismning yoʻqligi maxfiylik tanlovi, pastroq kurs emas.',
    'about.keptTitle': 'Nima saqlanadi va nima hech qachon qayta yozilmaydi',
    'about.keptProgress':
      'Yutuqlaringiz sizniki va pulini toʻlagan kursingiz hisobingizda qoladi. Sertifikatda har kim hisobsiz qidirib topa oladigan raqam bor va kurs keyinchalik toʻxtatilsa ham uni tekshirish mumkin.',
    'about.keptPayment':
      'Toʻlov yozuvi hech qachon qayta yozilmaydi: tuzatish eskisining yonidagi yangi yozuv, uni tahrirlash emas. Oʻquvchining kurs haqidagi fikri yo oʻzi yozganidek eʼlon qilinadi, yo oʻzi koʻra oladigan sabab bilan olib tashlanadi. Xodimlar uni boshqa narsaga aylantirib qayta yoza olmaydi.',
    'about.cost':
      'Koʻrish uchun pul olinmaydi. Kurs nomi koʻrsatilgan bitta oʻquvchi uchun sotib olinadi: bitta xarid bitta oʻquvchini qamraydi, hech qachon butun xonadonni emas.',
  },
  kk: {
    'about.title': 'Неге AyahSpring',
    'about.description':
      'AyahSpring не үйретеді, курс оқушыға қалай жетеді, бала неге тіркелгі емес, оқушы болып саналады және мұнда кімге сабақ беруге рұқсат етіледі.',
    'about.lede':
      '{ayah} — Құран аяты, ал сөздің көне мағынасында белгі. {spring} — жаңару: судан кейін келетін өсу. Бұл атау платформаның болғысы келетін нәрсесі: аят және оны арқалауды үйреніп жүрген адам.',
    'about.bar':
      'Төмендегінің бәрі платформаның істемек ойын емес, істеп жатқан ісін сипаттайды. Бұл бет мүмкіндіктер қосылып-өшірілгенде де дұрыс болып қалатындай жазылған, сондықтан ол бүгінгі баптауды емес, ережені айтады және тек осы аптада дұрыс болатын нәрсені айтқанша азырақ айтқанды жөн көреді.',
    'about.catTitle': 'Бір каталог, оқушының екі түрі',
    'about.catAudience':
      'Балалар мен ересектер әртүрлі оқырман, сондықтан курс кімге арналғанын жариялайды: балаларға, ересектерге немесе екеуіне де. Каталогты бір топқа тарылтуға болады, басты бетте екеуінің әрқайсысына есік бар және курс тек өзі жариялаған топтың астында көрінеді.',
    'about.catAges':
      'Курс жас оқушылар тобының ішінде қай жасқа жазылғанын да айта алады, сонда алты жасар бала мен он бес жасар жасөспірім бір сөреге келмейді. Жас көрсетпеген курс кез келген жасқа ашық: үнсіздік шектеу емес және ешқашан шектеу деп оқылмайды.',
    'about.howTitle': 'Курс мұнда қалай келеді',
    'about.how1Lead': 'Оны мұғалім жазады.',
    'about.how1':
      'Бөлімдері, сабақтары, дереккөздері және, егер курста емтихан болса, тесті бар жоба нұсқа. Дереккөздер әр сабаққа көрсетіледі, өйткені дін туралы сабақ өзінің қайдан алынғанын айта алуы керек.',
    'about.how2Lead': 'Оны өкілеттігі бар адам тексереді.',
    'about.how2':
      'Рецензентке тек қолданыстағы рұқсаты бар пән бойынша курс берілуі мүмкін, әйтпесе дерекқор бұл тапсырманы қабылдамайды. Жарияланған мүдделер қақтығысы да оған кедергі болады. Автор өз курсына оны жариялауға жол ашатын ғылыми мақұлдауды бере алмайды, тіпті сол рұқсаты болса да.',
    'about.how3Lead': 'Ол жарияланады, содан кейін өзгермейтін болады.',
    'about.how3':
      'Платформа иесі жариялайды. Сол сәттен бастап нұсқа қатырылады: сабақтар, тесттер мен файлдар өзгере алмайды. Түзету — жаңа нұсқа, ал бұрын жазылған оқушы өзі бастаған нұсқада қалады, сондықтан сертификат ешқашан астында үнсіз өзгеріп кеткен курсқа берілмейді.',
    'about.childTitle': 'Балалар тіркелгі емес, оқушылар',
    'about.childNotice':
      'Бала мұнда тіркелмейді. Тіркелгі ата-ананың немесе қамқоршының қолында болады, ол баланы аты мен жас тобы арқылы оқушы ретінде қосады және оның үлгерімін көреді. Он екі жасқа толмаған баланың ешқашан өз электрондық пошта мекенжайы, құпиясөзі немесе өз кіруі болмайды.',
    'about.childLogin':
      'Платформа рұқсат еткен жерде расталған қамқоршы он екі жастағы немесе одан үлкен балаға өзіне тиесілі кіру бере алады. Алғашқы құпиясөзді қамқоршы таңдайды және оны қайта орната алады немесе кіруді қайтарып ала алады. Бұл қамқоршының ісі: бала ешқашан жалғыз өзі тіркелгі ашпайды.',
    'about.childBand':
      'Жүйенің еш жерінде туған күн жоқ. Жас тобы (бес–жеті, сегіз–он және сол сияқты) балаға не көрсету керегін білуге жеткілікті, ал бірдеңе дұрыс болмай қалса, жоғалатын нәрсе әлдеқайда аз.',
    'about.childConsent':
      'Заң бала онлайн қызметті пайдаланбас бұрын ата-ананың тексеруге болатын келісімін талап ететін жерде шарт — қамқоршылық байланыс, тексеру қадамы және кім келісім бергенінің жазбасы. Платформа үшеуін де сақтай алады. Бұл талапты белгілі бір елге қосу — иесінің заңдық кеңеспен қабылдайтын шешімі. Ол қосылғанша баланы тіркелгі иесі болып отырған ересек қосады, баланың өзі ешқашан қоспайды.',
    'about.langTitle': 'Интерфейс және оны кім оқығаны',
    'about.langOffered': 'Интерфейс ұсынылатын тілдер: {count}',
    'about.langWritten':
      'Ағылшын тілінен басқасының әрқайсысын осы платформаны жасаған адамдар жазды, ал бірде-бірін сол тілде сөйлейтін адам оқыған жоқ. Тіл беті мұны сілтемеде емес, әр тілдің жанында айтады, өйткені «аударылған» және «сол тілде сөйлейтін адам оқыған» — екі бөлек мәлімдеме және тек біріншісі шын.',
    'about.langHeld':
      'Бір тілді жазғанымызға сенетіндей жақсы жаза алмаған жерімізде, сол тілде сөйлейтін адам оқығанша оның орнына ағылшын тілін көрсетеміз.',
    'about.langWhole': 'Жазылған, бірақ мүлде ұсынылмайды: {languages}',
    'about.langPartly':
      'Намаз уақыттары, хижри күні және санауыш экрандары ағылшын тілінде көрсетілетін тілдер: {count}. Тіл беті олардың әрқайсысын оқырманға шынымен көрсетілетін үлесімен бірге тізеді.',
    'about.langFix':
      'Егер өз тіліңізде бір сөз сізге қате болып көрінсе, оны айтатын жер — түзету парағы. Ол тіркелгі сұрамайды, ағылшынша сөйлем мен қазіргі аударманы қатар көрсетеді және сіз тек қате жолдарды өзгертесіз. Жібергеніңіз қабылданса, атыңыз тілдің жанында басылады. Электрондық пошта мекенжайыңыз ешқашан жарияланбайды және ешқашан кіруге айналмайды.',
    'about.langSheet': 'Түзету парағын ашу',
    'about.teachTitle': 'Мұнда кім сабақ береді',
    'about.teachAppoint':
      'Мұғалімдік тағайындау арқылы болады. Ешкім тіркеліп мұғалім болмайды: оны иесі немесе басқару қызметкерлері жазбаша себеппен береді, қайтарып алу да солай. Кім жазса да, әр курс бәрібір рецензиядан өтеді.',
    'about.teachAsk':
      'Сұрауыңызға болады. Сабақ беруге өтініш біліктіліктеріңізді және өзіңіз өткізген сабаққа сілтемені жібереді, иесі екеуін де оқиды. Өтініш беру ештеңе бермейді: бұл тағайындау туралы өтініш, ал жауап — сіз оқи алатын жазбаша шешім.',
    'about.teachPage':
      'Мұғалім өзі туралы бет жариялай алады. Жариялаған болса, курс беті оның атын атап, сол бетке сілтеме береді. Жарияламаған болса, курс беті курсты тағайындалған мұғалім жазғанын және рецензент мақұлдағанын айтады да, атын көрсетпейді. Аттың болмауы — құпиялылық таңдауы, төмен курс емес.',
    'about.keptTitle': 'Не сақталады және не ешқашан қайта жазылмайды',
    'about.keptProgress':
      'Үлгеріміңіз сіздікі, ал ақысын төлеген курсыңыз тіркелгіңізде қалады. Сертификатта кез келген адам тіркелгісіз іздеп таба алатын нөмір бар және курс кейін тоқтатылса да оны тексеруге болады.',
    'about.keptPayment':
      'Төлем жазбасы ешқашан қайта жазылмайды: түзету — ескісінің жанындағы жаңа жазба, оны өңдеу емес. Оқушының курс туралы пікірі не өзі жазғандай жарияланады, не өзі көре алатын себеппен алынып тасталады. Қызметкерлер оны басқа нәрсеге айналдырып қайта жаза алмайды.',
    'about.cost':
      'Қарау тегін. Курс аты аталған бір оқушыға сатып алынады: бір сатып алу бір оқушыны қамтиды, ешқашан бүкіл үй ішін емес.',
  },
  az: {
    'about.title': 'Niyə AyahSpring',
    'about.description':
      'AyahSpring nə öyrədir, kurs öyrənənə necə çatır, uşaq niyə hesab deyil, öyrənəndir və burada kimə dərs deməyə icazə verilir.',
    'about.lede':
      '{ayah} Quranın bir ayəsidir və sözün köhnə mənasında bir əlamətdir. {spring} yenilənmədir: sudan sonra gələn böyümə. Bu ad platformanın olmağa çalışdığı şeydir: ayə və onu daşımağı öyrənən insan.',
    'about.bar':
      'Aşağıdakıların hamısı platformanın etmək niyyətində olduğunu deyil, etdiyini təsvir edir. Bu səhifə funksiyalar yandırılıb-söndürüləndə də doğru qalsın deyə yazılıb; buna görə o, bugünkü ayarı deyil, qaydanı deyir və yalnız bu həftə doğru olan bir şeyi deməkdənsə az deməyi üstün tutur.',
    'about.catTitle': 'Bir kataloq, iki cür öyrənən',
    'about.catAudience':
      'Uşaqlar və böyüklər fərqli oxuculardır, buna görə kurs kimin üçün olduğunu bəyan edir: uşaqlar, böyüklər və ya hər ikisi. Kataloqu bir qrupa daraltmaq olar, ana səhifə ikisinin hər biri üçün bir qapı təqdim edir və kurs yalnız özünün bəyan etdiyi qrupun altında görünür.',
    'about.catAges':
      'Kurs kiçik yaşlı öyrənənlər qrupu daxilində hansı yaşlar üçün yazıldığını da deyə bilər ki, altı yaşlı uşaqla on beş yaşlı yeniyetmə eyni rəfə gəlməsin. Yaş göstərməyən kurs hər yaşa açıqdır: susmaq məhdudiyyət deyil və heç vaxt məhdudiyyət kimi oxunmur.',
    'about.howTitle': 'Kurs bura necə gəlir',
    'about.how1Lead': 'Onu müəllim yazır.',
    'about.how1':
      'Bölmələri, dərsləri, mənbələri və kurs imtahanlıdırsa, testi olan qaralama versiya. Mənbələr hər dərs üçün göstərilir, çünki din haqqında dərs haradan gəldiyini deyə bilməlidir.',
    'about.how2Lead': 'Onu səlahiyyətli şəxs yoxlayır.',
    'about.how2':
      'Rəyçiyə yalnız qüvvədə olan icazəsi olduğu fənn üzrə kurs verilə bilər, əks halda verilənlər bazası bu tapşırığı rədd edir. Bəyan edilmiş maraqlar toqquşması da buna mane olur. Müəllif öz kursuna onun dərc olunmasına imkan verən elmi təsdiqi verə bilməz, hətta o icazəsi olsa belə.',
    'about.how3Lead': 'O dərc olunur, sonra dəyişməz qalır.',
    'about.how3':
      'Platformanın sahibi dərc edir. Həmin andan versiya dondurulur: dərslər, testlər və fayllar dəyişə bilməz. Düzəliş yeni versiyadır və artıq yazılmış öyrənən başladığı versiyada qalır, buna görə sertifikat heç vaxt altında səssizcə dəyişmiş kurs üçün olmur.',
    'about.childTitle': 'Uşaqlar hesab deyil, öyrənəndir',
    'about.childNotice':
      'Uşaq burada qeydiyyatdan keçmir. Hesab valideyndə və ya qəyyumda olur, o, uşağı ad və yaş qrupu ilə öyrənən kimi əlavə edir və irəliləyişini görür. On iki yaşdan kiçik uşağın heç vaxt öz e-poçt ünvanı, parolu və ya öz girişi olmur.',
    'about.childLogin':
      'Platformanın icazə verdiyi yerdə təsdiqlənmiş qəyyum on iki yaşlı və ya daha böyük uşağa özünə məxsus giriş verə bilər. İlk parolu qəyyum seçir və onu sıfırlaya və ya girişi geri ala bilər. Bu, qəyyumun işidir: uşaq heç vaxt təkbaşına hesab açmır.',
    'about.childBand':
      'Sistemin heç bir yerində doğum tarixi yoxdur. Yaş qrupu (beş–yeddi, səkkiz–on və sair) uşağa nəyin göstərilməli olduğunu bilmək üçün kifayətdir və nəsə səhv getsə, itiriləcək şey xeyli azdır.',
    'about.childConsent':
      'Qanun uşağın onlayn xidmətdən istifadə etməsindən əvvəl valideynin yoxlanıla bilən razılığını tələb etdiyi yerdə şərt qəyyumluq əlaqəsi, yoxlama addımı və kimin razılıq verdiyinin qeydidir. Platforma üçünü də saxlaya bilər. Bu tələbi bir ölkə üçün yandırmaq sahibin hüquqi məsləhətlə verdiyi qərardır. O yandırılana qədər uşağı hesabın sahibi olan böyük əlavə edir, uşaq özü heç vaxt etmir.',
    'about.langTitle': 'İnterfeys və onu kimin oxuduğu',
    'about.langOffered': 'İnterfeysin təqdim olunduğu dillər: {count}',
    'about.langWritten':
      'İngilis dilindən başqa hər biri bu platformanı quranlar tərəfindən yazılıb və heç biri o dildə danışan biri tərəfindən oxunmayıb. Dil səhifəsi bunu haşiyədə deyil, hər dilin yanında deyir, çünki “tərcümə olunub” və “o dildə danışan biri oxuyub” iki ayrı iddiadır və yalnız birincisi doğrudur.',
    'about.langHeld':
      'Bir dili yazdığımıza güvənəcək qədər yaxşı yaza bilmədiyimiz yerdə, o dildə danışan biri oxuyana qədər əvəzində ingilis dilini göstəririk.',
    'about.langWhole': 'Yazılıb, amma ümumiyyətlə təqdim olunmur: {languages}',
    'about.langPartly':
      'Namaz vaxtları, hicri tarix və sayğac ekranları ingilis dilində göstərilən dillər: {count}. Dil səhifəsi onların hər birini oxucuya həqiqətən göstərilən payla birlikdə sadalayır.',
    'about.langFix':
      'Öz dilinizdə bir söz sizə səhv görünürsə, bunu demək yeri düzəliş vərəqidir. O, hesab istəmir, ingiliscə cümləni və hazırkı tərcüməni yan-yana göstərir və siz yalnız səhv sətirləri dəyişirsiniz. Göndərdiyiniz qəbul olunarsa, adınız dilin yanında yazılır. E-poçt ünvanınız heç vaxt dərc olunmur və heç vaxt girişə çevrilmir.',
    'about.langSheet': 'Düzəliş vərəqini aç',
    'about.teachTitle': 'Burada kim dərs deyir',
    'about.teachAppoint':
      'Müəllimlik təyinatla olur. Heç kim qeydiyyatdan keçməklə müəllim olmur: bunu sahib və ya idarəetmə əməkdaşları yazılı səbəblə verir, geri alınması da belədir. Kim yazmasından asılı olmayaraq hər kurs yenə də rəydən keçir.',
    'about.teachAsk':
      'Xahiş edə bilərsiniz. Dərs demək üçün müraciət ixtisaslarınızı və keçdiyiniz bir dərsin keçidini göndərir, sahib ikisini də oxuyur. Müraciət etmək heç nə vermir: bu, təyinat xahişidir və cavab oxuya biləcəyiniz yazılı qərardır.',
    'about.teachPage':
      'Müəllim özü haqqında səhifə dərc edə bilər. Dərc edibsə, kurs səhifəsi onun adını çəkir və həmin səhifəyə keçid verir. Dərc etməyibsə, kurs səhifəsi kursun təyin olunmuş müəllim tərəfindən yazıldığını və rəyçi tərəfindən təsdiqləndiyini deyir və adı göstərmir. Adın olmaması məxfilik seçimidir, aşağı səviyyəli kurs deyil.',
    'about.keptTitle': 'Nə saxlanılır və nə heç vaxt yenidən yazılmır',
    'about.keptProgress':
      'İrəliləyişiniz sizindir və pulunu ödədiyiniz kurs hesabınızda qalır. Sertifikatda hər kəsin hesab olmadan axtara biləcəyi nömrə var və kurs sonradan dayandırılsa belə onu yoxlamaq olur.',
    'about.keptPayment':
      'Ödəniş qeydi heç vaxt yenidən yazılmır: düzəliş köhnəsinin yanında yeni qeyddir, onun redaktəsi deyil. Öyrənənin kurs haqqında rəyi ya yazdığı kimi dərc olunur, ya da görə biləcəyi səbəblə geri götürülür. Əməkdaşlar onu başqa şeyə çevirib yenidən yaza bilməz.',
    'about.cost':
      'Baxmaq pulsuzdur. Kurs adı çəkilən bir öyrənən üçün alınır: bir alış bir öyrənəni əhatə edir, heç vaxt bütün ailəni yox.',
  },
  tg: {
    'about.title': 'Чаро AyahSpring',
    'about.description':
      'AyahSpring чиро меомӯзонад, курс ба омӯзанда чӣ гуна мерасад, чаро кӯдак ҳисоб не, балки омӯзанда аст ва дар ин ҷо ба кӣ иҷозати дарс додан дода мешавад.',
    'about.lede':
      '{ayah} ояти Қуръон аст ва ба маънои кӯҳнаи ин калима нишона. {spring} навшавӣ аст: рушде, ки аз паси об меояд. Ин ном ҳамон чизест, ки ин платформа мехоҳад бошад: оят ва шахсе, ки бардоштани онро меомӯзад.',
    'about.bar':
      'Ҳар он чи дар поён омадааст, кореро тасвир мекунад, ки платформа анҷом медиҳад, на кореро, ки ният дорад. Ин саҳифа тавре навишта шудааст, ки ҳангоми фаъол ва ғайрифаъол шудани имкониятҳо дуруст бимонад, аз ин рӯ он қоидаро мегӯяд, на танзими имрӯзаро ва беҳтар медонад, ки камтар бигӯяд, аз он ки чизеро бигӯяд, ки танҳо ҳамин ҳафта дуруст аст.',
    'about.catTitle': 'Як феҳрист, ду навъи омӯзанда',
    'about.catAudience':
      'Кӯдакон ва калонсолон хонандагони гуногунанд, аз ин рӯ курс эълон мекунад, ки барои кист: кӯдакон, калонсолон ё ҳарду. Феҳристро ба як гурӯҳ маҳдуд кардан мумкин аст, саҳифаи аввал барои ҳар яке аз ин ду даре пешниҳод мекунад ва курс танҳо зери гурӯҳе намоён мешавад, ки худаш эълон кардааст.',
    'about.catAges':
      'Курс инчунин метавонад бигӯяд, ки дар дохили гурӯҳи омӯзандагони ҷавон барои кадом синну сол навишта шудааст, то кӯдаки шашсола ва навраси понздаҳсола ба як раф нарасанд. Курсе, ки синну солро зикр намекунад, барои ҳар синну сол кушода аст: хомӯшӣ маҳдудият нест ва ҳеҷ гоҳ чунин хонда намешавад.',
    'about.howTitle': 'Курс ба ин ҷо чӣ гуна мерасад',
    'about.how1Lead': 'Онро муаллим менависад.',
    'about.how1':
      'Нусхаи пешнавис бо бахшҳо, дарсҳо, манбаъҳо ва, агар курс имтиҳон дошта бошад, санҷиш. Манбаъҳо барои ҳар дарс зикр мешаванд, зеро дарс дар бораи дин бояд гуфта тавонад, ки аз куҷо омадааст.',
    'about.how2Lead': 'Онро шахси ваколатдор месанҷад.',
    'about.how2':
      'Ба бозбин танҳо курсеро дар фанне додан мумкин аст, ки ӯ барои он иҷозати амалкунанда дорад, вагарна пойгоҳи додаҳо ин таъинотро рад мекунад. Бархӯрди манфиатҳои эълоншуда низ монеи он мешавад. Муаллиф ба курси худ тасдиқи илмиеро, ки ба нашри он роҳ медиҳад, дода наметавонад, ҳатто агар он иҷозатро дошта бошад.',
    'about.how3Lead': 'Он нашр мешавад ва сипас бетағйир мемонад.',
    'about.how3':
      'Соҳиби платформа нашр мекунад. Аз ҳамон лаҳза нусха ях баста мешавад: дарсҳо, санҷишҳо ва файлҳо тағйир ёфта наметавонанд. Ислоҳ нусхаи нав аст ва омӯзандае, ки аллакай номнавис шудааст, дар нусхае мемонад, ки оғоз кардааст, аз ин рӯ шаҳодатнома ҳеҷ гоҳ барои курсе нест, ки дар зери он оромона тағйир ёфтааст.',
    'about.childTitle': 'Кӯдакон омӯзандаанд, на ҳисоб',
    'about.childNotice':
      'Кӯдак дар ин ҷо номнавис намешавад. Ҳисоб дар дасти падар, модар ё сарпараст аст, ӯ кӯдакро бо ном ва гурӯҳи синнӣ ҳамчун омӯзанда илова мекунад ва пешрафти ӯро мебинад. Кӯдаки то дувоздаҳсола ҳеҷ гоҳ суроғаи почтаи электронӣ, рамз ё вуруди худро надорад.',
    'about.childLogin':
      'Он ҷое ки платформа иҷозат медиҳад, сарпарасти тасдиқшуда метавонад ба кӯдаки дувоздаҳсола ё калонтар вуруди худи ӯро диҳад. Рамзи аввалро сарпараст интихоб мекунад ва метавонад онро аз нав гузорад ё вурудро бозпас гирад. Ин амали сарпараст аст: кӯдак ҳеҷ гоҳ танҳо худаш ҳисоб намесозад.',
    'about.childBand':
      'Дар ҳеҷ ҷойи низом санаи таваллуд нест. Гурӯҳи синнӣ (панҷ то ҳафт, ҳашт то даҳ ва ғайра) барои донистани он ки ба кӯдак чӣ бояд нишон дода шавад, кофист ва агар чизе хато равад, он чи аз даст меравад, хеле камтар аст.',
    'about.childConsent':
      'Он ҷое ки қонун пеш аз истифодаи кӯдак аз хидмати онлайн розигии санҷидашавандаи падару модарро талаб мекунад, шарт пайванди сарпарастӣ, қадами тасдиқ ва сабти он аст, ки кӣ розигӣ додааст. Платформа ҳар серо нигоҳ дошта метавонад. Фаъол кардани ин талабот барои як кишвар қарори соҳиб аст, ки бо машварати ҳуқуқӣ гирифта мешавад. То фаъол шудани он кӯдакро калонсоле илова мекунад, ки ҳисоб дар дасти ӯст, ҳеҷ гоҳ худи кӯдак не.',
    'about.langTitle': 'Интерфейс ва кӣ онро хондааст',
    'about.langOffered': 'Забонҳое, ки интерфейс бо онҳо пешниҳод мешавад: {count}',
    'about.langWritten':
      'Ҳар яке аз онҳо ҷуз англисӣ аз ҷониби одамоне навишта шудааст, ки ин платформаро сохтаанд ва ҳеҷ якеро касе, ки бо он забон гап мезанад, нахондааст. Саҳифаи забон инро на дар поварақ, балки дар паҳлуи ҳар забон мегӯяд, зеро «тарҷума шудааст» ва «онро шахсе хондааст, ки бо ин забон гап мезанад» ду иддаои гуногунанд ва танҳо аввалӣ дуруст аст.',
    'about.langHeld':
      'Он ҷое ки натавонистем забонеро ба қадри кофӣ хуб нависем, то ба навиштаи худ бовар кунем, то хондани гӯяндаи он ба ҷояш англисиро нишон медиҳем.',
    'about.langWhole': 'Навишта шудааст, вале умуман пешниҳод намешавад: {languages}',
    'about.langPartly':
      'Забонҳое, ки экранҳои вақтҳои намоз, санаи ҳиҷрӣ ва шуморандаашон ба англисӣ нишон дода мешаванд: {count}. Саҳифаи забон ҳар яки онҳоро бо ҳиссае, ки воқеан ба хонанда нишон дода мешавад, номбар мекунад.',
    'about.langFix':
      'Агар дар забони худатон калимае ба назаратон нодуруст намояд, ҷойи гуфтани он варақи ислоҳ аст. Он ҳисоб намепурсад, ҷумлаи англисӣ ва тарҷумаи кунуниро паҳлу ба паҳлу нишон медиҳад ва шумо танҳо сатрҳои нодурустро тағйир медиҳед. Агар фиристодаи шумо пазируфта шавад, номатон дар паҳлуи забон чоп мешавад. Суроғаи почтаи электронии шумо ҳеҷ гоҳ нашр намешавад ва ҳеҷ гоҳ ба вуруд табдил намеёбад.',
    'about.langSheet': 'Кушодани варақи ислоҳ',
    'about.teachTitle': 'Дар ин ҷо кӣ дарс медиҳад',
    'about.teachAppoint':
      'Муаллимӣ бо таъинот аст. Ҳеҷ кас бо номнавис шудан муаллим намешавад: онро соҳиб ё кормандони идоракунӣ бо сабаби хаттӣ медиҳанд ва бозпас гирифтани он низ ҳамин тавр аст. Ҳар курс, кӣ ки навишта бошад, ба ҳар ҳол аз бозбинӣ мегузарад.',
    'about.teachAsk':
      'Шумо метавонед дархост кунед. Ариза барои дарс додан тахассусҳои шумо ва пайванд ба дарсеро, ки гузаронидаед, мефиристад ва соҳиб ҳардуро мехонад. Ариза додан чизе намедиҳад: ин дархости таъинот аст ва ҷавоб қарори хаттиест, ки шумо онро хонда метавонед.',
    'about.teachPage':
      'Муаллим метавонад дар бораи худ саҳифае нашр кунад. Агар нашр карда бошад, саҳифаи курс номи ӯро мегӯяд ва ба он пайванд медиҳад. Агар накарда бошад, саҳифаи курс мегӯяд, ки курсро муаллими таъиншуда навиштааст ва бозбин тасдиқ кардааст ва номро зикр намекунад. Набудани ном интихоби махфият аст, на курси пасттар.',
    'about.keptTitle': 'Чӣ нигоҳ дошта мешавад ва чӣ ҳеҷ гоҳ аз нав навишта намешавад',
    'about.keptProgress':
      'Пешрафти шумо аз они шумост ва курсе, ки пулашро додаед, дар ҳисоби шумо мемонад. Шаҳодатнома рақаме дорад, ки ҳар кас метавонад онро бе ҳисоб ҷустуҷӯ кунад ва онро ҳатто агар курс баъдтар қатъ карда шавад, боз санҷидан мумкин аст.',
    'about.keptPayment':
      'Сабти пардохт ҳеҷ гоҳ аз нав навишта намешавад: ислоҳ сабти навест дар паҳлуи кӯҳна, на таҳрири он. Тақризи омӯзанда ба курс ё ҳамон тавре ки навиштааст нашр мешавад, ё бо сабабе, ки ӯ дида метавонад, бозпас гирифта мешавад. Кормандон онро ба чизи дигар табдил дода, аз нав навишта наметавонанд.',
    'about.cost':
      'Тамошо кардан ройгон аст. Курс барои як омӯзандаи номбаршуда харида мешавад: як харид як омӯзандаро фаро мегирад, ҳеҷ гоҳ як хонаводаро не.',
  },
  ky: {
    'about.title': 'Эмне үчүн AyahSpring',
    'about.description':
      'AyahSpring эмнени үйрөтөт, курс окуучуга кантип жетет, бала эмне үчүн аккаунт эмес, окуучу болуп эсептелет жана бул жерде кимге сабак берүүгө уруксат берилет.',
    'about.lede':
      '{ayah} — Курандын аяты жана сөздүн эски маанисинде белги. {spring} — жаңылануу: суудан кийин келген өсүү. Бул ат платформа болууга аракет кылган нерсенин өзү: аят жана аны көтөрүп жүрүүнү үйрөнүп жаткан адам.',
    'about.bar':
      'Төмөндөгүнүн баары платформа кылууну ниеттенген нерсени эмес, кылып жаткан нерсени сүрөттөйт. Бул барак мүмкүнчүлүктөр күйгүзүлүп-өчүрүлгөндө да туура бойдон калгыдай жазылган, ошондуктан ал бүгүнкү жөндөөнү эмес, эрежени айтат жана ушул жумада гана туура болгон нерсени айткандан көрө азыраак айтканды жакшы көрөт.',
    'about.catTitle': 'Бир каталог, окуучунун эки түрү',
    'about.catAudience':
      'Балдар менен чоңдор ар башка окурмандар, ошондуктан курс ким үчүн экенин жарыялайт: балдар, чоңдор же экөө тең. Каталогду бир топко тарытууга болот, башкы барак экөөнүн ар бирине эшик сунуштайт жана курс өзү жарыялаган топтун астында гана көрүнөт.',
    'about.catAges':
      'Курс жаш окуучулар тобунун ичинде кайсы жаштар үчүн жазылганын да айта алат, ошондо алты жаштагы бала менен он беш жаштагы өспүрүм бир текчеге келбейт. Жаш көрсөтпөгөн курс бардык жашка ачык: унчукпоо чектөө эмес жана эч качан чектөө катары окулбайт.',
    'about.howTitle': 'Курс бул жерге кантип келет',
    'about.how1Lead': 'Аны мугалим жазат.',
    'about.how1':
      'Бөлүмдөрү, сабактары, булактары жана, эгер курста сынак болсо, тести бар долбоор версия. Булактар ар бир сабак үчүн көрсөтүлөт, анткени дин жөнүндөгү сабак кайдан алынганын айта алышы керек.',
    'about.how2Lead': 'Аны ыйгарым укугу бар адам текшерет.',
    'about.how2':
      'Рецензентке колдонуудагы уруксаты бар предмет боюнча гана курс берилиши мүмкүн, антпесе маалымат базасы бул дайындоону четке кагат. Жарыяланган кызыкчылыктардын кагылышы да ага тоскоол болот. Автор өз курсуна аны жарыялоого жол ачкан илимий жактырууну бере албайт, ал уруксаты болсо да.',
    'about.how3Lead': 'Ал жарыяланат, андан кийин өзгөрбөйт.',
    'about.how3':
      'Платформанын ээси жарыялайт. Ошол учурдан тартып версия тоңдурулат: сабактар, тесттер жана файлдар өзгөрө албайт. Оңдоо — жаңы версия, ал эми буга чейин жазылган окуучу өзү баштаган версияда калат, ошондуктан күбөлүк эч качан астында унчукпай өзгөрүп кеткен курс үчүн болбойт.',
    'about.childTitle': 'Балдар аккаунт эмес, окуучулар',
    'about.childNotice':
      'Бала бул жерде катталбайт. Аккаунт ата-эненин же камкорчунун колунда болот, ал баланы аты жана жаш тобу менен окуучу катары кошот жана анын жетишкендигин көрөт. Он эки жашка чыга элек баланын эч качан өз электрондук почта дареги, сырсөзү же өз кирүүсү болбойт.',
    'about.childLogin':
      'Платформа уруксат берген жерде ырасталган камкорчу он эки же андан улуу жаштагы балага өзүнө таандык кирүү бере алат. Биринчи сырсөздү камкорчу тандайт жана аны кайра коё алат же кирүүнү кайтарып ала алат. Бул камкорчунун иши: бала эч качан жалгыз өзү аккаунт ачпайт.',
    'about.childBand':
      'Системанын эч бир жеринде туулган күн жок. Жаш тобу (бештен жетиге, сегизден онго жана ушул сыяктуу) балага эмнени көрсөтүү керектигин билүү үчүн жетиштүү, ал эми бир нерсе туура эмес болуп калса, жоголо турган нерсе алда канча аз.',
    'about.childConsent':
      'Мыйзам бала онлайн кызматты колдонордон мурда ата-эненин текшерүүгө боло турган макулдугун талап кылган жерде шарт — камкорчулук байланыш, текшерүү кадамы жана ким макулдук бергенинин жазуусу. Платформа үчөөнү тең сактай алат. Бул талапты кайсы бир өлкө үчүн күйгүзүү — ээсинин юридикалык кеңеш менен кабыл алган чечими. Ал күйгүзүлгөнгө чейин баланы аккаунттун ээси болгон чоң киши кошот, бала өзү эч качан кошпойт.',
    'about.langTitle': 'Интерфейс жана аны ким окуганы',
    'about.langOffered': 'Интерфейс сунушталган тилдер: {count}',
    'about.langWritten':
      'Англис тилинен башкасынын ар бирин ушул платформаны курган адамдар жазган жана бирин да ошол тилде сүйлөгөн адам окуган эмес. Тил барагы муну шилтемеде эмес, ар бир тилдин жанында айтат, анткени «которулган» жана «ошол тилде сүйлөгөн адам окуган» — эки башка айтым жана биринчиси гана чын.',
    'about.langHeld':
      'Бир тилди жазганыбызга ишене тургандай жакшы жаза албаган жерибизде, ошол тилде сүйлөгөн адам окуганга чейин анын ордуна англис тилин көрсөтөбүз.',
    'about.langWhole': 'Жазылган, бирок такыр сунушталбайт: {languages}',
    'about.langPartly':
      'Намаз убактылары, хижра күнү жана эсептегич экрандары англис тилинде көрсөтүлгөн тилдер: {count}. Тил барагы алардын ар бирин окурманга чындап көрсөтүлгөн үлүшү менен кошо тизмелейт.',
    'about.langFix':
      'Эгер өз тилиңизде бир сөз сизге туура эмес көрүнсө, аны айта турган жер — оңдоо барагы. Ал аккаунт сурабайт, англисче сүйлөм менен учурдагы котормону катар көрсөтөт жана сиз туура эмес саптарды гана өзгөртөсүз. Жөнөткөнүңүз кабыл алынса, атыңыз тилдин жанында басылат. Электрондук почта дарегиңиз эч качан жарыяланбайт жана эч качан кирүүгө айланбайт.',
    'about.langSheet': 'Оңдоо барагын ачуу',
    'about.teachTitle': 'Бул жерде ким сабак берет',
    'about.teachAppoint':
      'Мугалимдик дайындоо менен болот. Эч ким катталуу менен мугалим болбойт: аны ээси же башкаруу кызматкерлери жазуу жүзүндөгү себеп менен берет, кайтарып алуу да ошондой. Ким жазса да, ар бир курс баары бир рецензиядан өтөт.',
    'about.teachAsk':
      'Сурансаңыз болот. Сабак берүүгө арыз квалификацияларыңызды жана өзүңүз өткөн сабакка шилтемени жөнөтөт, ээси экөөнү тең окуйт. Арыз берүү эч нерсе бербейт: бул дайындоо жөнүндө өтүнүч, ал эми жооп — сиз окуй ала турган жазуу жүзүндөгү чечим.',
    'about.teachPage':
      'Мугалим өзү жөнүндө барак жарыялай алат. Жарыялаган болсо, курстун барагы анын атын атап, ошол баракка шилтеме берет. Жарыялабаган болсо, курстун барагы курсту дайындалган мугалим жазганын жана рецензент жактырганын айтат да, атын көрсөтпөйт. Аттын жоктугу — купуялык тандоосу, начарыраак курс эмес.',
    'about.keptTitle': 'Эмне сакталат жана эмне эч качан кайра жазылбайт',
    'about.keptProgress':
      'Жетишкендигиңиз сиздики, ал эми акысын төлөгөн курсуңуз аккаунтуңузда калат. Күбөлүктө каалаган адам аккаунтсуз издеп таба ала турган номер бар жана курс кийин токтотулса да аны текшерүүгө болот.',
    'about.keptPayment':
      'Төлөм жазуусу эч качан кайра жазылбайт: оңдоо — эскисинин жанындагы жаңы жазуу, аны түзөтүү эмес. Окуучунун курс жөнүндөгү пикири же өзү жазгандай жарыяланат, же өзү көрө ала турган себеп менен алынып салынат. Кызматкерлер аны башка нерсеге айлантып кайра жаза албайт.',
    'about.cost':
      'Кароо акысыз. Курс аты аталган бир окуучу үчүн сатып алынат: бир сатып алуу бир окуучуну камтыйт, эч качан бүтүндөй үй-бүлөнү эмес.',
  },
  tk: {
    'about.title': 'Näme üçin AyahSpring',
    'about.description':
      'AyahSpring näme öwredýär, kurs öwrenijä nädip ýetýär, çaga näme üçin hasap däl-de, öwreniji hasaplanýar we bu ýerde kime sapak bermäge rugsat berilýär.',
    'about.lede':
      '{ayah} Kuranyň aýatydyr we sözüň köne manysynda alamatdyr. {spring} täzelenişdir: suwdan soň gelýän ösüş. Bu at platformanyň bolmaga çalyşýan zadydyr: aýat we ony göterip ýörmegi öwrenýän adam.',
    'about.bar':
      'Aşakdakylaryň hemmesi platformanyň etmek isleýän zadyny däl-de, edýän zadyny suratlandyrýar. Bu sahypa mümkinçilikler açylyp-ýapylanda hem dogry galar ýaly ýazyldy, şonuň üçin ol şu günki sazlamany däl-de, düzgüni aýdýar we diňe şu hepde dogry bolan zady aýdandan az aýtmagy gowy görýär.',
    'about.catTitle': 'Bir katalog, öwrenijiniň iki görnüşi',
    'about.catAudience':
      'Çagalar we ulular dürli okyjylardyr, şonuň üçin kurs kim üçin bolandygyny yglan edýär: çagalar, ulular ýa-da ikisi hem. Katalogy bir topara daraltmak bolýar, baş sahypa ikisiniň her biri üçin bir gapy hödürleýär we kurs diňe özüniň yglan eden toparynyň aşagynda görünýär.',
    'about.catAges':
      'Kurs ýaş öwrenijiler toparynyň içinde haýsy ýaşlar üçin ýazylandygyny hem aýdyp biler, şeýdip alty ýaşly çaga bilen on bäş ýaşly ýetginjek bir tekjä gelmez. Ýaş görkezmedik kurs her ýaşa açykdyr: dymmak çäklendirme däl we hiç haçan çäklendirme hökmünde okalmaýar.',
    'about.howTitle': 'Kurs bu ýere nädip gelýär',
    'about.how1Lead': 'Ony mugallym ýazýar.',
    'about.how1':
      'Bölümleri, sapaklary, çeşmeleri we, eger kursda synag bar bolsa, testi bolan garalama wersiýa. Çeşmeler her sapak üçin görkezilýär, sebäbi din hakyndaky sapak nireden gelendigini aýdyp bilmelidir.',
    'about.how2Lead': 'Ony ygtyýarly adam barlaýar.',
    'about.how2':
      'Synçy diňe hereket edýän rugsady bar bolan ders boýunça kurs alyp biler, ýogsam maglumat binýady bu bellemäni ret edýär. Yglan edilen bähbitleriň çaknyşmagy hem oňa päsgel berýär. Awtor öz kursuna ony çap etmäge ýol açýan ylmy tassyklamany berip bilmez, hatda şol rugsady bar bolsa-da.',
    'about.how3Lead': 'Ol çap edilýär, soňra üýtgemeýär.',
    'about.how3':
      'Platformanyň eýesi çap edýär. Şol pursatdan başlap wersiýa doňdurylýar: sapaklar, testler we faýllar üýtgäp bilmez. Düzediş täze wersiýadyr we eýýäm ýazylan öwreniji başlan wersiýasynda galýar, şonuň üçin şahadatnama hiç haçan aşagynda sessiz üýtgän kurs üçin bolmaýar.',
    'about.childTitle': 'Çagalar hasap däl-de, öwrenijilerdir',
    'about.childNotice':
      'Çaga bu ýerde hasaba durmaýar. Hasap ata-enäniň ýa-da hossaryň elinde bolýar, ol çagany at we ýaş topary bilen öwreniji hökmünde goşýar we onuň öňegidişligini görýär. On iki ýaşa ýetmedik çaganyň hiç haçan öz e-poçta salgysy, paroly ýa-da öz girişi bolmaýar.',
    'about.childLogin':
      'Platforma rugsat berýän ýerinde tassyklanan hossar on iki ýaşly ýa-da ondan uly çaga özüne degişli giriş berip biler. Ilkinji paroly hossar saýlaýar we ony täzeden goýup ýa-da girişi yzyna alyp biler. Bu hossaryň işidir: çaga hiç haçan ýeke özi hasap açmaýar.',
    'about.childBand':
      'Ulgamyň hiç bir ýerinde doglan sene ýok. Ýaş topary (bäşden ýedä, sekizden ona we şuňa meňzeş) çaga näme görkezilmelidigini bilmek üçin ýeterlikdir we bir zat nädogry bolsa, ýitiriljek zat has azdyr.',
    'about.childConsent':
      'Kanun çaganyň onlaýn hyzmatdan peýdalanmazyndan öň ata-enäniň barlap bolýan razylygyny talap edýän ýerinde şert hossarlyk gatnaşygy, barlag ädimi we kimiň razylyk berendiginiň ýazgysydyr. Platforma üçüsini hem saklap biler. Bu talaby bir ýurt üçin açmak eýesiniň hukuk maslahaty bilen kabul edýän kararydyr. Ol açylýança çagany hasabyň eýesi bolan uly adam goşýar, çaganyň özi hiç haçan goşmaýar.',
    'about.langTitle': 'Interfeýs we ony kimiň okandygy',
    'about.langOffered': 'Interfeýsiň hödürlenýän dilleri: {count}',
    'about.langWritten':
      'Iňlis dilinden başga her biri şu platformany guran adamlar tarapyndan ýazyldy we hiç birini şol dilde gepleýän adam okamady. Dil sahypasy muny çykgytda däl-de, her diliň ýanynda aýdýar, sebäbi “terjime edildi” we “şol dilde gepleýän adam okady” iki aýry tassyklamadyr we diňe birinjisi dogrudyr.',
    'about.langHeld':
      'Bir dili ýazanymyza ynanar ýaly gowy ýazyp bilmedik ýerimizde, şol dilde gepleýän adam okaýança onuň ýerine iňlis dilini görkezýäris.',
    'about.langWhole': 'Ýazyldy, ýöne asla hödürlenmeýär: {languages}',
    'about.langPartly':
      'Namaz wagtlary, hijri sene we sanaýjy ekranlary iňlis dilinde görkezilýän diller: {count}. Dil sahypasy olaryň her birini okyja hakykatdan görkezilýän paýy bilen bilelikde sanap geçýär.',
    'about.langFix':
      'Eger öz diliňizde bir söz size nädogry görünse, muny aýtmaly ýer düzediş sahypasydyr. Ol hasap soramaýar, iňlisçe sözlemi we häzirki terjimäni ýanaşyk görkezýär we siz diňe nädogry setirleri üýtgedýärsiňiz. Iberen zadyňyz kabul edilse, adyňyz diliň ýanynda çap edilýär. E-poçta salgyňyz hiç haçan çap edilmeýär we hiç haçan girişe öwrülmeýär.',
    'about.langSheet': 'Düzediş sahypasyny açmak',
    'about.teachTitle': 'Bu ýerde kim sapak berýär',
    'about.teachAppoint':
      'Mugallymçylyk bellemek arkaly bolýar. Hiç kim hasaba durmak bilen mugallym bolmaýar: ony eýesi ýa-da dolandyryş işgärleri ýazmaça sebäp bilen berýär, yzyna almak hem şeýledir. Kim ýazan bolsa-da, her kurs barybir synlamadan geçýär.',
    'about.teachAsk':
      'Siz sorap bilersiňiz. Sapak bermek üçin arza hünär derejeleriňizi we geçen sapagyňyza salgylanmany iberýär, eýesi ikisini hem okaýar. Arza bermek hiç zat bermeýär: bu bellemek haýyşydyr we jogap siziň okap biljek ýazmaça kararyňyzdyr.',
    'about.teachPage':
      'Mugallym özi hakynda sahypa çap edip biler. Çap eden bolsa, kurs sahypasy onuň adyny aýdýar we şol sahypa salgylanýar. Çap etmedik bolsa, kurs sahypasy kursy bellenen mugallymyň ýazandygyny we synçynyň tassyklandygyny aýdýar hem-de ady görkezmeýär. Adyň ýoklugy gizlinlik saýlawydyr, pes kurs däl.',
    'about.keptTitle': 'Näme saklanýar we näme hiç haçan täzeden ýazylmaýar',
    'about.keptProgress':
      'Öňegidişligiňiz siziňkidir we tölegini eden kursuňyz hasabyňyzda galýar. Şahadatnamada islendik adamyň hasapsyz gözläp tapyp biljek belgisi bar we kurs soň bes edilse-de, ony barlap bolýar.',
    'about.keptPayment':
      'Töleg ýazgysy hiç haçan täzeden ýazylmaýar: düzediş könäniň ýanyndaky täze ýazgydyr, ony redaktirlemek däl. Öwrenijiniň kurs hakyndaky synyny ýa ýazyşy ýaly çap edýärler, ýa-da onuň görüp biljek sebäbi bilen yzyna alýarlar. Işgärler ony başga zada öwrüp täzeden ýazyp bilmez.',
    'about.cost':
      'Seretmek mugt. Kurs ady görkezilen bir öwreniji üçin satyn alynýar: bir satyn alyş bir öwrenijini öz içine alýar, hiç haçan tutuş öý hojalygyny däl.',
  },
  ta: {
    'about.title': 'ஏன் AyahSpring',
    'about.description':
      'AyahSpring என்ன கற்பிக்கிறது, ஒரு பாடநெறி கற்பவரை எப்படிச் சென்றடைகிறது, ஒரு குழந்தை ஏன் கணக்கு அல்ல, கற்பவர், இங்கே கற்பிக்க யாருக்கு அனுமதி உண்டு.',
    'about.lede':
      '{ayah} என்பது குர்ஆனின் ஒரு வசனம்; அந்தச் சொல்லின் பழைய பொருளில் ஓர் அடையாளம். {spring} என்பது புதுப்பித்தல்: நீரைத் தொடர்ந்து வரும் வளர்ச்சி. இந்தப் பெயரே இந்தத் தளம் ஆக முயல்வது: வசனமும், அதைச் சுமக்கக் கற்றுக்கொள்ளும் மனிதரும்.',
    'about.bar':
      'கீழே உள்ள ஒவ்வொன்றும் தளம் செய்ய எண்ணுவதை அல்ல, செய்வதை விவரிக்கிறது. வசதிகள் இயக்கப்பட்டும் நிறுத்தப்பட்டும் வரும்போதும் உண்மையாகவே இருக்கும்படி இந்தப் பக்கம் எழுதப்பட்டுள்ளது; ஆகவே இது இன்றைய அமைப்பை அல்ல, விதியைச் சொல்கிறது; இந்த வாரம் மட்டும் உண்மையாக இருக்கும் ஒன்றைச் சொல்வதைவிடக் குறைவாகச் சொல்வதையே விரும்புகிறது.',
    'about.catTitle': 'ஒரே பட்டியல், இரண்டு வகைக் கற்பவர்கள்',
    'about.catAudience':
      'குழந்தைகளும் பெரியவர்களும் வேறுபட்ட வாசகர்கள்; ஆகவே ஒரு பாடநெறி யாருக்கானது என்பதை அறிவிக்கிறது: குழந்தைகள், பெரியவர்கள் அல்லது இருவரும். பட்டியலை ஒரு பிரிவுக்கு மட்டும் சுருக்கலாம்; முகப்புப் பக்கம் இரண்டில் ஒவ்வொன்றுக்கும் ஒரு வாசலைத் தருகிறது; ஒரு பாடநெறி தான் அறிவித்த பிரிவின் கீழ் மட்டுமே தோன்றும்.',
    'about.catAges':
      'இளம் கற்பவர்கள் பிரிவுக்குள் எந்த வயதினருக்காக எழுதப்பட்டது என்பதையும் ஒரு பாடநெறி சொல்லலாம்; அதனால் ஆறு வயதுக் குழந்தையும் பதினைந்து வயது இளையவரும் ஒரே அலமாரிக்கு வர மாட்டார்கள். வயது குறிப்பிடாத பாடநெறி எல்லா வயதினருக்கும் திறந்தது: மௌனம் ஒரு கட்டுப்பாடு அல்ல; அது ஒருபோதும் அப்படிப் படிக்கப்படுவதில்லை.',
    'about.howTitle': 'ஒரு பாடநெறி இங்கே எப்படி வருகிறது',
    'about.how1Lead': 'ஓர் ஆசிரியர் அதை எழுதுகிறார்.',
    'about.how1':
      'பிரிவுகள், பாடங்கள், மூலங்கள், பாடநெறிக்குத் தேர்வு இருந்தால் ஒரு வினாடி வினா ஆகியவற்றுடன் கூடிய வரைவுப் பதிப்பு. ஒவ்வொரு பாடத்துக்கும் மூலங்கள் குறிப்பிடப்படுகின்றன; ஏனெனில் மார்க்கம் பற்றிய பாடம் தான் எங்கிருந்து வந்தது என்பதைச் சொல்ல முடிய வேண்டும்.',
    'about.how2Lead': 'அங்கீகாரம் பெற்ற ஒருவர் அதைச் சரிபார்க்கிறார்.',
    'about.how2':
      'ஒரு மதிப்பாய்வாளருக்கு, அவரிடம் நடப்பிலுள்ள அங்கீகாரம் இருக்கும் பாடத்துறையில் மட்டுமே பாடநெறி ஒப்படைக்கப்படலாம்; இல்லையெனில் தரவுத்தளம் அந்த ஒப்படைப்பை மறுக்கிறது. அறிவிக்கப்பட்ட நலன் முரண்பாடும் அதைத் தடுக்கிறது. ஆசிரியர் தம் சொந்தப் பாடநெறியை வெளியிட அனுமதிக்கும் அறிஞர் ஒப்புதலைத் தாமே வழங்க முடியாது; அந்த அங்கீகாரம் அவரிடம் இருந்தாலும் கூட.',
    'about.how3Lead': 'அது வெளியிடப்படுகிறது; பிறகு அது மாறாது.',
    'about.how3':
      'தளத்தின் உரிமையாளர் வெளியிடுகிறார். அந்தக் கணம் முதல் பதிப்பு உறைந்துவிடுகிறது: பாடங்கள், வினாடி வினாக்கள், கோப்புகள் மாற முடியாது. திருத்தம் என்பது புதிய பதிப்பு; ஏற்கெனவே சேர்ந்த கற்பவர் தாம் தொடங்கிய பதிப்பிலேயே இருப்பார்; ஆகவே ஒரு சான்றிதழ் தனக்கு அடியில் அமைதியாக மாறிவிட்ட பாடநெறிக்கானதாக ஒருபோதும் இருக்காது.',
    'about.childTitle': 'குழந்தைகள் கற்பவர்கள், கணக்குகள் அல்ல',
    'about.childNotice':
      'ஒரு குழந்தை இங்கே பதிவு செய்வதில்லை. பெற்றோர் அல்லது பாதுகாவலர் கணக்கை வைத்திருக்கிறார்; குழந்தையைப் பெயருடனும் வயதுப் பிரிவுடனும் கற்பவராகச் சேர்க்கிறார்; அதன் முன்னேற்றத்தைப் பார்க்கிறார். பன்னிரண்டு வயதுக்குட்பட்ட குழந்தைக்கு ஒருபோதும் சொந்த மின்னஞ்சல் முகவரியோ, கடவுச்சொல்லோ, உள்நுழைவோ இருக்காது.',
    'about.childLogin':
      'தளம் அனுமதிக்கும் இடத்தில், சரிபார்க்கப்பட்ட பாதுகாவலர் பன்னிரண்டு வயது அல்லது அதற்கு மேற்பட்ட குழந்தைக்குச் சொந்த உள்நுழைவை வழங்கலாம். முதல் கடவுச்சொல்லைப் பாதுகாவலரே தேர்ந்தெடுக்கிறார்; அதை மீட்டமைக்கவோ உள்நுழைவை நீக்கவோ அவரால் முடியும். அது பாதுகாவலரின் செயல்: ஒரு குழந்தை ஒருபோதும் தனியாகக் கணக்கை உருவாக்குவதில்லை.',
    'about.childBand':
      'அமைப்பில் எங்கும் பிறந்த தேதி இல்லை. ஒரு குழந்தைக்கு என்ன காட்டப்பட வேண்டும் என்பதை அறிய வயதுப் பிரிவு (ஐந்து முதல் ஏழு, எட்டு முதல் பத்து, இப்படியே) போதுமானது; ஏதேனும் தவறாக நடந்தால் இழக்கப்படுவதும் மிகக் குறைவு.',
    'about.childConsent':
      'ஒரு குழந்தை இணையச் சேவையைப் பயன்படுத்தும் முன் சரிபார்க்கக்கூடிய பெற்றோர் ஒப்புதலைச் சட்டம் கோரும் இடத்தில், நிபந்தனை என்பது பாதுகாவலர் உறவு, ஒரு சரிபார்ப்புப் படி, யார் ஒப்புதல் அளித்தார் என்ற பதிவு ஆகியவை. தளத்தால் மூன்றையும் வைத்திருக்க முடியும். ஒரு நாட்டுக்கு அந்தத் தேவையை இயக்குவது சட்ட ஆலோசனையுடன் எடுக்கப்படும் உரிமையாளரின் முடிவு. அது இயக்கப்படும் வரை, குழந்தையைச் சேர்ப்பவர் கணக்கை வைத்திருக்கும் பெரியவரே; ஒருபோதும் குழந்தை தானாக அல்ல.',
    'about.langTitle': 'இடைமுகம், அதை யார் படித்திருக்கிறார்கள்',
    'about.langOffered': 'இடைமுகம் வழங்கப்படும் மொழிகள்: {count}',
    'about.langWritten':
      'ஆங்கிலம் தவிர அவற்றில் ஒவ்வொன்றும் இந்தத் தளத்தை உருவாக்கியவர்களால் எழுதப்பட்டது; அவற்றில் ஒன்றைக்கூட அந்த மொழியைப் பேசும் ஒருவர் படிக்கவில்லை. மொழிப் பக்கம் இதை அடிக்குறிப்பில் அல்ல, ஒவ்வொரு மொழிக்கும் அருகிலேயே சொல்கிறது; ஏனெனில் “மொழிபெயர்க்கப்பட்டது” என்பதும் “அந்த மொழியைப் பேசும் ஒருவரால் படிக்கப்பட்டது” என்பதும் இரு வேறு கூற்றுகள்; முதலாவது மட்டுமே உண்மை.',
    'about.langHeld':
      'நாங்கள் எழுதியதை நம்பும் அளவுக்கு ஒரு மொழியை நன்றாக எழுத முடியாத இடத்தில், அந்த மொழியைப் பேசுபவர் அதைப் படிக்கும் வரை அதற்குப் பதிலாக ஆங்கிலத்தைக் காட்டுகிறோம்.',
    'about.langWhole': 'எழுதப்பட்டது, ஆனால் வழங்கப்படவே இல்லை: {languages}',
    'about.langPartly':
      'தொழுகை நேரங்கள், ஹிஜ்ரி தேதி, எண்ணி ஆகிய திரைகள் ஆங்கிலத்தில் காட்டப்படும் மொழிகள்: {count}. மொழிப் பக்கம் அவை ஒவ்வொன்றையும், வாசகருக்கு உண்மையில் காட்டப்படும் பங்குடன் பட்டியலிடுகிறது.',
    'about.langFix':
      'உங்கள் சொந்த மொழியில் ஒரு சொல் உங்களுக்குத் தவறாகத் தோன்றினால், அதைச் சொல்லும் இடம் திருத்தத் தாள். அது கணக்கைக் கேட்பதில்லை; ஆங்கில வாக்கியத்தையும் தற்போதைய மொழிபெயர்ப்பையும் அருகருகே காட்டுகிறது; தவறான வரிகளை மட்டுமே நீங்கள் மாற்றுகிறீர்கள். நீங்கள் அனுப்பியது ஏற்கப்பட்டால் உங்கள் பெயர் அந்த மொழிக்கு அருகில் அச்சிடப்படும். உங்கள் மின்னஞ்சல் முகவரி ஒருபோதும் வெளியிடப்படாது; ஒருபோதும் உள்நுழைவாக மாறாது.',
    'about.langSheet': 'திருத்தத் தாளைத் திற',
    'about.teachTitle': 'இங்கே யார் கற்பிக்கிறார்கள்',
    'about.teachAppoint':
      'கற்பித்தல் நியமனத்தின் மூலம் நடக்கிறது. பதிவு செய்வதால் யாரும் ஆசிரியர் ஆவதில்லை: உரிமையாளரோ ஆளுகைப் பணியாளர்களோ எழுத்துப்பூர்வமான காரணத்துடன் அதை வழங்குகிறார்கள்; அதை நீக்குவதும் அப்படியே. யார் எழுதியிருந்தாலும் ஒவ்வொரு பாடநெறியும் மதிப்பாய்வைக் கடந்தே ஆக வேண்டும்.',
    'about.teachAsk':
      'நீங்கள் கேட்கலாம். கற்பிக்க விண்ணப்பிப்பது உங்கள் தகுதிகளையும் நீங்கள் கற்பித்த ஒரு பாடத்துக்கான இணைப்பையும் அனுப்புகிறது; உரிமையாளர் இரண்டையும் படிக்கிறார். விண்ணப்பிப்பது எதையும் வழங்குவதில்லை: அது நியமனத்துக்கான கோரிக்கை; பதில் நீங்கள் படிக்கக்கூடிய எழுத்துப்பூர்வமான முடிவு.',
    'about.teachPage':
      'ஓர் ஆசிரியர் தம்மைப் பற்றிய பக்கத்தை வெளியிடலாம். வெளியிட்டிருந்தால், பாடநெறிப் பக்கம் அவர் பெயரைக் குறிப்பிட்டு அந்தப் பக்கத்துக்கு இணைப்புத் தருகிறது. வெளியிடாவிட்டால், பாடநெறி நியமிக்கப்பட்ட ஆசிரியரால் எழுதப்பட்டு மதிப்பாய்வாளரால் ஒப்புதல் பெற்றது என்று பாடநெறிப் பக்கம் சொல்கிறது; பெயரை விட்டுவிடுகிறது. பெயர் இல்லாதது தனியுரிமைத் தேர்வு; தரம் குறைந்த பாடநெறி அல்ல.',
    'about.keptTitle': 'எது வைக்கப்படுகிறது, எது ஒருபோதும் மாற்றி எழுதப்படுவதில்லை',
    'about.keptProgress':
      'உங்கள் முன்னேற்றம் உங்களுடையது; நீங்கள் பணம் செலுத்திய பாடநெறி உங்கள் கணக்கிலேயே இருக்கும். சான்றிதழில் ஓர் எண் உள்ளது; கணக்கு இல்லாமலே யாரும் அதைத் தேடிப் பார்க்கலாம்; பாடநெறி பின்னர் நிறுத்தப்பட்டாலும் அதைச் சரிபார்க்க முடியும்.',
    'about.keptPayment':
      'பணம் செலுத்திய பதிவு ஒருபோதும் மாற்றி எழுதப்படுவதில்லை: திருத்தம் என்பது பழையதன் அருகில் ஒரு புதிய பதிவு; அதைத் திருத்துவது அல்ல. ஒரு பாடநெறி பற்றிக் கற்பவர் எழுதிய மதிப்புரை அவர் எழுதியபடியே வெளியிடப்படும், அல்லது அவரால் பார்க்கக்கூடிய காரணத்துடன் திரும்பப் பெறப்படும். பணியாளர்கள் அதை வேறொன்றாக மாற்றி எழுத முடியாது.',
    'about.cost':
      'பார்ப்பதற்குக் கட்டணம் இல்லை. ஒரு பாடநெறி பெயர் குறிப்பிடப்பட்ட ஒரு கற்பவருக்காக வாங்கப்படுகிறது: ஒரு கொள்முதல் ஒரு கற்பவரை உள்ளடக்கும்; ஒருபோதும் ஒரு குடும்பத்தை அல்ல.',
  },
  ne: {
    'about.title': 'किन AyahSpring',
    'about.description':
      'AyahSpring ले के सिकाउँछ, पाठ्यक्रम सिकारुसम्म कसरी पुग्छ, बच्चा किन खाता होइन सिकारु हो, र यहाँ कसलाई पढाउन अनुमति छ।',
    'about.lede':
      '{ayah} कुरआनको एउटा आयत हो र यस शब्दको पुरानो अर्थमा एउटा निशानी। {spring} नवीकरण हो: पानीपछि आउने वृद्धि। यो नाम नै यो प्लेटफर्म बन्न खोजेको कुरा हो: आयत, र त्यसलाई बोक्न सिक्दै गरेको मानिस।',
    'about.bar':
      'तल भएका सबै कुराले प्लेटफर्मले गर्न चाहेको होइन, गर्ने कुरा वर्णन गर्छन्। सुविधाहरू खोलिँदा र बन्द गरिँदा पनि साँचो रहोस् भनेर यो पृष्ठ लेखिएको हो, त्यसैले यसले आजको सेटिङ होइन, नियम बताउँछ, र यस हप्ता मात्र साँचो हुने कुरा भन्नुभन्दा कम भन्न रुचाउँछ।',
    'about.catTitle': 'एउटै सूची, दुई किसिमका सिकारु',
    'about.catAudience':
      'बालबालिका र वयस्क फरक पाठक हुन्, त्यसैले पाठ्यक्रमले आफू कसका लागि हो भनी घोषणा गर्छ: बालबालिका, वयस्क वा दुवै। सूचीलाई एउटा समूहमा साँघुरो पार्न सकिन्छ, पहिलो पृष्ठले दुईमध्ये प्रत्येकका लागि एउटा ढोका दिन्छ, र पाठ्यक्रम आफूले घोषणा गरेको समूहमुनि मात्र देखिन्छ।',
    'about.catAges':
      'पाठ्यक्रमले साना सिकारुहरूको समूहभित्र कुन उमेरका लागि लेखिएको हो भनेर पनि भन्न सक्छ, ताकि छ वर्षको बच्चा र पन्ध्र वर्षको किशोर एउटै तखतामा नपुगून्। उमेर नतोकेको पाठ्यक्रम हरेक उमेरका लागि खुला छ: मौनता प्रतिबन्ध होइन, र त्यसलाई कहिल्यै प्रतिबन्धका रूपमा पढिँदैन।',
    'about.howTitle': 'पाठ्यक्रम यहाँ कसरी आइपुग्छ',
    'about.how1Lead': 'शिक्षकले यसलाई लेख्छन्।',
    'about.how1':
      'खण्ड, पाठ, स्रोत र, पाठ्यक्रममा परीक्षा भए, एउटा प्रश्नोत्तरीसहितको मस्यौदा संस्करण। प्रत्येक पाठका लागि स्रोत उल्लेख गरिन्छ, किनकि धर्मसम्बन्धी पाठले आफू कहाँबाट आएको हो भनेर भन्न सक्नुपर्छ।',
    'about.how2Lead': 'अधिकार पाएको व्यक्तिले यसलाई जाँच्छन्।',
    'about.how2':
      'समीक्षकलाई उनीसँग हाल कायम अधिकार भएको विषयको पाठ्यक्रम मात्र दिन सकिन्छ, नत्र डाटाबेसले त्यो जिम्मेवारी अस्वीकार गर्छ। घोषणा गरिएको स्वार्थको द्वन्द्वले पनि त्यसलाई रोक्छ। लेखकले आफ्नै पाठ्यक्रमलाई प्रकाशित हुन दिने विद्वत् स्वीकृति दिन सक्दैनन्, उनीसँग त्यो अधिकार भए पनि।',
    'about.how3Lead': 'यो प्रकाशित हुन्छ, र त्यसपछि यो बदलिँदैन।',
    'about.how3':
      'प्लेटफर्मका मालिकले प्रकाशित गर्छन्। त्यस क्षणदेखि संस्करण स्थिर हुन्छ: पाठ, प्रश्नोत्तरी र फाइलहरू बदलिन सक्दैनन्। सुधार भनेको नयाँ संस्करण हो, र पहिले नै भर्ना भएका सिकारु आफूले सुरु गरेको संस्करणमै रहन्छन्, त्यसैले प्रमाणपत्र कहिल्यै मुनि चुपचाप बदलिएको पाठ्यक्रमको हुँदैन।',
    'about.childTitle': 'बालबालिका सिकारु हुन्, खाता होइनन्',
    'about.childNotice':
      'बच्चाले यहाँ दर्ता गर्दैन। खाता आमाबुबा वा अभिभावकसँग हुन्छ, उनले बच्चालाई नाम र उमेर समूहसहित सिकारुका रूपमा थप्छन् र उसको प्रगति हेर्छन्। बाह्र वर्षमुनिको बच्चासँग कहिल्यै आफ्नै इमेल ठेगाना, पासवर्ड वा साइन इन हुँदैन।',
    'about.childLogin':
      'प्लेटफर्मले अनुमति दिएको ठाउँमा, प्रमाणित अभिभावकले बाह्र वर्ष वा सोभन्दा माथिको बच्चालाई उसको आफ्नै साइन इन दिन सक्छन्। पहिलो पासवर्ड अभिभावकले रोज्छन्, र त्यसलाई रिसेट गर्न वा साइन इन फिर्ता लिन सक्छन्। त्यो अभिभावकको काम हो: बच्चाले कहिल्यै एक्लै खाता बनाउँदैन।',
    'about.childBand':
      'प्रणालीमा कतै पनि जन्म मिति छैन। बच्चालाई के देखाउनुपर्छ भनेर जान्न उमेर समूह (पाँचदेखि सात, आठदेखि दस, र यस्तै) पर्याप्त हुन्छ, र केही गडबड भए गुम्ने कुरा धेरै कम हुन्छ।',
    'about.childConsent':
      'बच्चाले अनलाइन सेवा प्रयोग गर्नुअघि कानुनले प्रमाणित गर्न सकिने अभिभावकीय सहमति माग्ने ठाउँमा, सर्त भनेको अभिभावकको सम्बन्ध, प्रमाणीकरणको एउटा चरण र कसले सहमति दियो भन्ने अभिलेख हो। प्लेटफर्मले तीनवटै राख्न सक्छ। कुनै देशका लागि त्यो आवश्यकता खोल्नु मालिकको निर्णय हो, जुन कानुनी सल्लाहसहित लिइन्छ। त्यो नखोलिएसम्म बच्चालाई खाता राख्ने वयस्कले थप्छन्, बच्चा आफैँले कहिल्यै होइन।',
    'about.langTitle': 'इन्टरफेस, र यसलाई कसले पढेको छ',
    'about.langOffered': 'इन्टरफेस उपलब्ध गराइएका भाषाहरू: {count}',
    'about.langWritten':
      'अङ्ग्रेजीबाहेक तीमध्ये हरेक भाषा यो प्लेटफर्म बनाउने मानिसहरूले लेखेका हुन्, र एउटा पनि त्यो भाषा बोल्ने कसैले पढेको छैन। भाषा पृष्ठले यो कुरा पादटिप्पणीमा होइन, हरेक भाषाको छेउमै भन्छ, किनकि “अनुवाद गरिएको” र “त्यो भाषा बोल्ने व्यक्तिले पढेको” दुई फरक दाबी हुन्, र पहिलो मात्र साँचो हो।',
    'about.langHeld':
      'हामीले लेखेको कुरामा भरोसा गर्न सकिने गरी कुनै भाषा राम्ररी लेख्न नसकेको ठाउँमा, त्यो भाषा बोल्ने व्यक्तिले नपढेसम्म हामी त्यसको सट्टा अङ्ग्रेजी देखाउँछौँ।',
    'about.langWhole': 'लेखिएको तर पटक्कै उपलब्ध नगराइएको: {languages}',
    'about.langPartly':
      'नमाजको समय, हिजरी मिति र गन्ती गर्ने स्क्रिनहरू अङ्ग्रेजीमा देखाइने भाषाहरू: {count}। भाषा पृष्ठले तीमध्ये प्रत्येकलाई पाठकलाई वास्तवमै देखाइने हिस्सासहित सूचीबद्ध गर्छ।',
    'about.langFix':
      'तपाईंको आफ्नै भाषामा कुनै शब्द तपाईंलाई गलत लाग्यो भने, त्यो भन्ने ठाउँ सुधार पाना हो। यसले खाता माग्दैन, अङ्ग्रेजी वाक्य र हालको अनुवाद सँगसँगै देखाउँछ, र तपाईं गलत भएका पङ्क्तिहरू मात्र बदल्नुहुन्छ। तपाईंले पठाएको कुरा स्वीकार भयो भने तपाईंको नाम भाषाको छेउमा छापिन्छ। तपाईंको इमेल ठेगाना कहिल्यै प्रकाशित हुँदैन र कहिल्यै साइन इन बन्दैन।',
    'about.langSheet': 'सुधार पाना खोल्नुहोस्',
    'about.teachTitle': 'यहाँ कसले पढाउँछ',
    'about.teachAppoint':
      'पढाउने काम नियुक्तिबाट हुन्छ। दर्ता गरेर कोही शिक्षक बन्दैन: मालिक वा सुशासन कर्मचारीले लिखित कारणसहित त्यो दिन्छन्, र त्यसलाई हटाउने कुरा पनि त्यस्तै हो। जसले लेखेको भए पनि हरेक पाठ्यक्रम समीक्षाबाट गुज्रन्छ नै।',
    'about.teachAsk':
      'तपाईं माग्न सक्नुहुन्छ। पढाउनका लागि आवेदनले तपाईंका योग्यता र तपाईंले पढाएको एउटा पाठको लिङ्क पठाउँछ, र मालिकले दुवै पढ्छन्। आवेदन दिएर केही पाइँदैन: यो नियुक्तिको अनुरोध हो, र जवाफ तपाईंले पढ्न सक्ने लिखित निर्णय हो।',
    'about.teachPage':
      'शिक्षकले आफ्नो बारेमा एउटा पृष्ठ प्रकाशित गर्न सक्छन्। गरेका छन् भने पाठ्यक्रमको पृष्ठले उनको नाम लिन्छ र त्यस पृष्ठमा लिङ्क दिन्छ। गरेका छैनन् भने पाठ्यक्रमको पृष्ठले पाठ्यक्रम नियुक्त शिक्षकले लेखेको र समीक्षकले स्वीकृत गरेको हो भन्छ, र नाम छोड्छ। नाम नहुनु गोपनीयताको रोजाइ हो, कमसल पाठ्यक्रम होइन।',
    'about.keptTitle': 'के राखिन्छ, र के कहिल्यै पुनर्लेखन गरिँदैन',
    'about.keptProgress':
      'तपाईंको प्रगति तपाईंकै हो, र तपाईंले पैसा तिरेको पाठ्यक्रम तपाईंको खातामा रहन्छ। प्रमाणपत्रमा एउटा नम्बर हुन्छ जुन जोसुकैले खाता बिना नै खोज्न सक्छ, र पाठ्यक्रम पछि हटाइए पनि त्यसलाई जाँच्न सकिन्छ।',
    'about.keptPayment':
      'भुक्तानीको अभिलेख कहिल्यै पुनर्लेखन गरिँदैन: सुधार भनेको पुरानोको छेउमा नयाँ प्रविष्टि हो, त्यसको सम्पादन होइन। सिकारुले पाठ्यक्रमबारे लेखेको समीक्षा या त उनले लेखेजस्तै प्रकाशित हुन्छ, या उनले देख्न सक्ने कारणसहित फिर्ता लिइन्छ। कर्मचारीले त्यसलाई अर्कै कुरामा पुनर्लेखन गर्न सक्दैनन्।',
    'about.cost':
      'हेर्न केही लाग्दैन। पाठ्यक्रम नाम तोकिएको एक जना सिकारुका लागि किनिन्छ: एउटा खरिदले एक जना सिकारुलाई समेट्छ, कहिल्यै एउटा घरपरिवारलाई होइन।',
  },
};
