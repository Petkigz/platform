import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The staff console (`/admin`), second part: the word for the console in
 * the main navigation, and the sentence beside each of its 43 links.
 *
 * Written on 2026-11-28, in the same twenty-seven languages as the
 * dashboard. **Written by the people who built the site and read by no
 * speaker.** A sentence here says what a screen is for and what it will
 * not do ("approving is an agreement, not a transfer"), and a member of
 * staff reads it before opening the screen. A wrong one misdescribes a
 * rule; nothing here enforces one.
 *
 * A sentence follows the screen's name and a dash, so it begins small and
 * ends without a full stop. The word in the navigation is the word the
 * page's own eyebrow uses. The sentence beside "Payment disputes" is the
 * sentence the queue of the same name uses, and a board, a reviewer, the
 * register, a panel, its quorum and chair, a sponsored seat and a
 * certificate keep the words the older parts gave them.
 *
 * Three things stay in Latin letters in every language, because they are
 * what a member of staff types or looks up: the flag keys
 * `platform.safeguarding` and `governance.panel_required`, and `DNS`.
 * "Recorded" and "verified" on the ijazah register are in each language's
 * own quotation marks; the register says the first and never the second.
 * French puts a no-break space before `:`, `;` and `?` and inside « ».
 *
 * Not here: the owner's switchboard (a flag's description, the revenue
 * share form) and what the database says a flag still needs. The page says
 * those in English and marks them as English.
 *
 * Made by `scripts/catalogue-part/gen.py` from
 * `scripts/catalogue-part/data/console.txt`.
 */
export const CONSOLE: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'console.nav': 'الإدارة',
    'console.nOrders':
      'الطلبات الوحيدة التي ما زال مجموعها قابلًا للتغيير: سجِّل على الطلب خصمًا أو ضريبة أو رسمًا أو تقريبًا، أو اسحبه',
    'console.nRefunds': 'مال يخرج عائدًا إلى أصحابه. الموافقة اتفاق وليست تحويلًا',
    'console.nAdjustments': 'تصحيحات محاسبية تُضاف ولا تُعدَّل، واستعادة أرباح سبق احتسابها',
    'console.nReconciliation': 'أسطر كشوف موقَّعة تُقابَل بالدفتر الداخلي',
    'console.nDisputes': 'للاعتراض على الدفع مهلة؛ ومزوّد الدفع هو من يقرر ما يحدث إن انقضت',
    'console.nTax': 'ما يُحصَّل من المشتري فوق السعر، بحسب البلد الذي يشتري منه',
    'console.nRates': 'كم كانت تساوي عملة بعملة أخرى، ومتى، ومن قال ذلك',
    'console.nRevenue':
      'ما بيع في فترة بحسب العملة والدورة والخطة والمعلم، والمبالغ المستردة ظاهرة بجانب البيع ولا تُطرح منه في الخفاء أبدًا',
    'console.nMoneyReport':
      'ما تحرَّك من مال في فترة، بالعملة الواحدة التي تُقرأ بها المنصة، وسعر الصرف بجانب كل رقم',
    'console.nRenewals':
      'كل اشتراك سارٍ ممدودًا إلى المستقبل بالسعر الذي بيع به. مبالغ مُلتزَم بها لا مبالغ وصلت — لا شيء يحصِّل تجديدًا بعد',
    'console.nPayouts':
      'ما طلب المعلمون أن يُدفع لهم، ومدة الحجز التي تمنع خروج مال بيعٍ ما دام استرداده ممكنًا',
    'console.nCourses':
      'كل دورة، ولمن هي مفتوحة، وكم متعلّمًا فيها. تغيير جمهور دورة يُسجَّل باسمك، مع ما كان وما صار',
    'console.nTeachers':
      'من يطلبون التدريس، وكل من يجوز له التدريس هنا مع ما نشره وعدد المتعلّمين في دوراته. الموافقة على طلب هي التعيين نفسه: تمنح الدور، ويُسجَّل سببك على صاحب الطلب',
    'console.nAssign': 'دورات تنتظر مراجعًا',
    'console.nSubjects':
      'مفردات الفهرس: ما يستطيع المتعلّم أن يصفّي به، وما يجوز أن تقوله شارة على بطاقة دورة. المادة التي تستعملها دورة منشورة لا يمكن إيقافها',
    'console.nReviewers':
      'من تقدّم ليراجع، ومن جرى التحقق منه، وما يجوز لكل واحد أن يحكم فيه. لا يُنشر شيء حتى يُوثَّق أحد هنا',
    'console.nScreenings':
      'كل معلم معيَّن وهل له تحقق محفوظ: نوعه، وتاريخه، ومتى ينتهي، ومن سجّله. مرجع الوثيقة يُحفظ ولا يُعرض مرة أخرى، والسجل لا يُعدَّل — بل يحل محله تحقق جديد. ما دام platform.safeguarding مفعَّلًا، لا يمكن نشر دورة قد تُعرض على طفل إلا إذا كان لمؤلفها تحقق ناجح غير منتهٍ وكان قد أقرّ بسياسة السلوك',
    'console.nIjazah':
      'من أجاز من، وفي ماذا، وما الذي عُرض عليك. تسجيلها لك وحدك: سلسلة الإسناد ليست مما تملك هذه المنصة أهلية التحقق منه، فالسجل يقول «مسجَّلة» ولا يقول «موثَّقة» أبدًا، ولا يرى المتعلّم شيئًا مما هنا',
    'console.nTranslations':
      'تصحيحات يرسلها من يتكلمون اللغة، كل واحد منها معروض مقابل السطر الذي يستبدله ومقابل نصوص الموقع المبنية فعلًا. القرار لك وحدك: قبول سطر لا يغيّر الموقع — الذي يغيّره هو المقطع الذي يُلصق في الشيفرة — ولا توصف لغة بأنها مقروءة إلا إذا كان لكل جزء منها قراءة منشورة — أو نشر شخص واحد قراءة للنصوص كلها — مع البتّ في كل تصحيح',
    'console.nInstitutions':
      'مدارس قرآنية ومدارس ومؤسسات لكل منها صفحتها: افتح واحدة جديدة، وتحقق من سجل DNS وراء ادعاء ملكية نطاق، وغيّر من يديرها. المؤسسة ترى أعداد أعضائها ولا ترى اسم متعلّم أبدًا، ولا تستطيع شراء مقاعد — فالفوترة تحتاج إلى شروط وإلى مزوّد ليسا عند أحد',
    'console.nSponsorships':
      'متعلّمون يطلبون دورة، ومتبرعون يدفعون ثمن دورة. البتّ يحتاج إلى سبب مكتوب، وتسجيل دفعة يحتاج إلى مرجع؛ والمقعد المكفول ليس طلب شراء، فلا ضريبة عليه ولا ربح لمعلم منه',
    'console.nInvitations':
      'من دعا من، وما الذي كسبته الدعوة، وما الذي أوقفه الحد السنوي أو استرداد. المكافأتان كلتاهما خصم على دورة — لا يُدفع شيء نقدًا، فلا رصيد هنا',
    'console.nSupport':
      'طلبات فتحها الناس من صفحة المساعدة. إطفاء الميزة يوقف الطلبات الجديدة ولا يغلق ما هو مفتوح',
    'console.nUsers': 'كل حساب على المنصة، يُبحث عنه بالاسم أو البريد الإلكتروني — حسابات لا أطفال',
    'console.nControls':
      'الأرقام التي تعمل بها ميزات مفعَّلة أصلًا. لا يظهر إلا ما يملكه دورك، وكل تغيير يحتاج إلى سبب',
    'console.nReports':
      'مشكلات أبلغ عنها القراء في درس أو إجابة. إغلاق البلاغ يحتاج إلى ملاحظة مكتوبة',
    'console.nMedia': 'كل ملف أصلي رفعه أي شخص. العزل والسحب كلاهما يحتاج إلى سبب مكتوب',
    'console.nCourseReviews': 'تقييمات متعلّمين فيها كلام مكتوب، محجوزة حتى يقرأها أحد',
    'console.nDiscussion': 'أسئلة المتعلّمين وإجابات زملائهم المحجوزة للمراجعة',
    'console.nBoards':
      'منشورات في نقاش الطلاب ونقاش المعلمين بلّغ عنها أحد. المنشور هناك يظهر فورًا، فهنا يُزال. رؤية من وراء اسم مستخدم تحتاج إلى سبب وتُسجَّل',
    'console.nAssistant':
      'ما سُئل عنه وما فعلته الحدود الموضوعة له: إجابات استشهدت بدرس، وأسئلة أُحيلت إلى معلم، والعبارات التي يُرفض بها',
    'console.nConnections':
      'الحسابات الخارجية التي يستعملها هذا الموقع (قاعدة البيانات، البريد الإلكتروني، المجدوِل، التخزين، المدفوعات) وما لم يُربط منها بعد. للمالك وحده؛ أسماء الإعدادات الناقصة ولا قيمة منها أبدًا',
    'console.nMessages':
      'ما كانت المنصة سترسله، معروضًا ومسجَّلًا. لا يُرسل شيء فعلًا حتى يُهيَّأ مزوّد',
    'console.nPlans': 'شروط ذات إصدارات، واستحقاقات، وأسعار متكررة',
    'console.nPanels':
      'المالك يشكّل هيئة ويحدد نصابها؛ والطاقم يفتح قضية على إصدار غير منشور؛ والأعضاء يصوّتون والرئيس يسجّل القرار. لا تُغلق قضية دون النصاب، وإذا كان governance.panel_required مُطفأً فلا شيء ينتظرها',
    'console.nTakedowns':
      'الإشعار يحجز الإصدار الذي يسمّيه عن التوزيع لحظة إدخاله — لا يُحذف شيء، فيبقى للقرار دليله. المعلم يردّ من صفحته، ويبتّ فيه شخص غير من استلم الإشعار، والحجز لا يغيّر شيئًا في المال',
    'console.nIncidents':
      'ما حدث، ومن يجب إبلاغه وقبل متى، والتسلسل الزمني وهو يجري. أعداد لا قائمة أسماء أبدًا؛ وكل مهلة يكتبها إنسان لأن القاعدة تختلف من سوق إلى سوق. لا شيء هنا يكشف اختراقًا ولا شيء يرسل إشعارًا',
    'console.nPolicies':
      'كل وثيقة مع الإصدارات التي كانت نافذة والمسودة المنتظرة الآن. النشر يحتاج إلى تاريخ وسبب مكتوب، ويُرفض ما دام في النص سؤال معلَّم لا يجيب عنه غيرك',
    'console.nCertificates': 'إصدار شهادات الإتمام وتسجيل إلغائها مع السبب',
    'console.nAnalytics': 'ما يفعله الناس، محفوظًا إلى الأبد، بحسب الحدث وبحسب اليوم. مجاميع فقط',
    'console.nGuardians': 'بالغون يطلبون الاعتراف بهم أولياء أمور لطفل',
    'console.nAppeals': 'معلمون يعترضون على رفض. لا يمكنك البتّ في تظلّم من قرارك أنت',
    'console.nRoles': 'من يجوز له ماذا. كل تحقق في قاعدة البيانات يقرأ هذه',
  },
  ur: {
    'console.nav': 'انتظامیہ',
    'console.nOrders':
      'صرف وہ آرڈر جن کی کل رقم ابھی بدل سکتی ہے: کسی آرڈر پر رعایت، ٹیکس، فیس یا راؤنڈنگ درج کریں، یا آرڈر واپس لیں',
    'console.nRefunds': 'وہ رقم جو واپس جا رہی ہے۔ منظوری ایک رضامندی ہے، منتقلی نہیں',
    'console.nAdjustments':
      'حساب کی وہ تصحیحات جو صرف شامل ہوتی ہیں، بدلی نہیں جاتیں، اور کمائی کی واپسی',
    'console.nReconciliation': 'دستخط شدہ گوشوارے کی سطریں اندرونی کھاتے کے مقابل',
    'console.nDisputes':
      'چارج بیک کی ایک آخری تاریخ ہوتی ہے؛ وہ گزر جائے تو کیا ہوگا، یہ فراہم کنندہ طے کرتا ہے',
    'console.nTax':
      'خریدار سے قیمت کے اوپر کیا لیا جاتا ہے، اس ملک کے حساب سے جہاں سے وہ خریدتا ہے',
    'console.nRates': 'ایک کرنسی دوسری میں کتنے کی تھی، کب، اور کس نے بتایا',
    'console.nRevenue':
      'کسی مدت میں کیا بکا، کرنسی، کورس، پلان اور استاد کے حساب سے؛ رقم واپسی فروخت کے ساتھ دکھائی جاتی ہے اور کبھی نظر سے اوجھل کر کے منہا نہیں کی جاتی',
    'console.nMoneyReport':
      'کسی مدت میں کتنی رقم حرکت میں آئی، اس ایک کرنسی میں جس میں پلیٹ فارم پڑھا جاتا ہے، ہر عدد کے ساتھ شرح',
    'console.nRenewals':
      'ہر جاری سبسکرپشن، اسی قیمت پر آگے بڑھا کر دکھائی گئی جس پر وہ بکی تھی۔ یہ وعدہ شدہ رقم ہے، وصول شدہ نہیں — ابھی کوئی چیز تجدید کی رقم وصول نہیں کرتی',
    'console.nPayouts':
      'اساتذہ نے جو ادائیگی مانگی ہے، اور رقم واپسی کی وہ روک جو کسی فروخت کی رقم کو اس وقت تک جانے نہیں دیتی جب تک وہ واپس ہو سکتی ہے',
    'console.nCourses':
      'ہر کورس، وہ کن کے لیے کھلا ہے اور اس میں کتنے سیکھنے والے ہیں۔ کورس کے مخاطبین بدلنا آپ کے نام کے ساتھ درج ہوتا ہے، پہلے اور بعد کی دونوں حالتوں سمیت',
    'console.nTeachers':
      'وہ لوگ جو پڑھانے کی درخواست کر رہے ہیں، اور ہر وہ شخص جو یہاں پڑھا سکتا ہے، ساتھ یہ کہ اس نے کیا شائع کیا اور اس کے کورسوں میں کتنے سیکھنے والے ہیں۔ درخواست منظور کرنا ہی تقرر ہے: اس سے کردار ملتا ہے، اور آپ کی وجہ درخواست گزار کے ساتھ درج ہوتی ہے',
    'console.nAssign': 'وہ کورس جو جائزہ لینے والے کے منتظر ہیں',
    'console.nSubjects':
      'کیٹلاگ کی لغت: سیکھنے والا کس چیز سے چھانٹ سکتا ہے، اور کورس کے کارڈ پر بیج کیا کہہ سکتا ہے۔ جو مضمون کسی شائع شدہ کورس میں استعمال ہو رہا ہو اسے ختم نہیں کیا جا سکتا',
    'console.nReviewers':
      'کس نے جائزہ لینے کی درخواست دی، کس کی جانچ ہو چکی، اور ہر ایک کس چیز پر فیصلہ دے سکتا ہے۔ جب تک یہاں کسی کی تصدیق نہ ہو، کچھ شائع نہیں ہوتا',
    'console.nScreenings':
      'ہر مقرر کردہ استاد اور یہ کہ اس کی جانچ ریکارڈ پر ہے یا نہیں: کس قسم کی، کب، کب ختم ہوتی ہے، کس نے درج کی۔ دستاویز کا حوالہ محفوظ رہتا ہے اور دوبارہ کبھی نہیں دکھایا جاتا، اور ریکارڈ میں ترمیم نہیں ہو سکتی — نئی جانچ اس کی جگہ لیتی ہے۔ جب تک platform.safeguarding آن ہے، وہ کورس جو کسی بچے کو دکھایا جا سکتا ہو شائع نہیں ہو سکتا جب تک اس کے مصنف کے پاس کامیاب، غیر ختم شدہ جانچ نہ ہو اور اس نے ضابطۂ اخلاق تسلیم نہ کیا ہو',
    'console.nIjazah':
      'کس نے کس کو اجازت دی، کس چیز کی، اور آپ کو کیا دکھایا گیا۔ اسے درج کرنا صرف آپ کا کام ہے: سلسلۂ سند کی جانچ اس پلیٹ فارم کے اختیار کی چیز نہیں، اس لیے رجسٹر ”درج شدہ“ کہتا ہے، ”تصدیق شدہ“ کبھی نہیں، اور یہاں کی کوئی چیز سیکھنے والے کو نظر نہیں آتی',
    'console.nTranslations':
      'وہ تصحیحات جو زبان بولنے والوں نے بھیجیں، ہر ایک اس سطر کے مقابل جسے وہ بدلتی ہے اور سائٹ کے اس متن کے مقابل جو واقعی بنا ہوا ہے۔ فیصلہ صرف آپ کا ہے: کسی سطر کو قبول کرنے سے سائٹ نہیں بدلتی — وہ کوڈ میں چسپاں کیے جانے والے حصے سے بدلتی ہے — اور کسی زبان کو پڑھا ہوا تبھی کہا جاتا ہے جب اس کے ہر حصے کی شائع شدہ پڑھت ہو — یا کسی ایک شخص نے پورے متن کی پڑھت شائع کی ہو — اور ہر تصحیح پر فیصلہ ہو چکا ہو',
    'console.nInstitutions':
      'مدرسے، اسکول اور تنظیمیں جن کا اپنا صفحہ ہے: نیا کھولیں، ڈومین کے دعوے کے پیچھے DNS ریکارڈ جانچیں، اور بدلیں کہ اسے کون چلاتا ہے۔ ادارہ اپنے ارکان کی گنتی دیکھتا ہے، کسی سیکھنے والے کا نام کبھی نہیں، اور وہ نشستیں نہیں خرید سکتا — انوائس کے لیے شرائط اور ایک فراہم کنندہ چاہیے جو کسی کے پاس نہیں',
    'console.nSponsorships':
      'سیکھنے والے جو کورس مانگ رہے ہیں، اور عطیہ دینے والے جو کسی کورس کی قیمت ادا کر رہے ہیں۔ فیصلے کے لیے تحریری وجہ درکار ہے اور ادائیگی درج کرنے کے لیے حوالہ؛ کفالت والی نشست آرڈر نہیں، اس لیے اس پر نہ ٹیکس ہے نہ استاد کی کمائی',
    'console.nInvitations':
      'کس نے کس کو دعوت دی، اس سے کیا ملا، اور سالانہ حد یا رقم واپسی نے کیا روکا۔ دونوں انعام کورس پر رعایت ہیں — کچھ ادا نہیں کیا جاتا، اس لیے یہاں کوئی بیلنس نہیں',
    'console.nSupport':
      'وہ درخواستیں جو لوگوں نے مدد کے صفحے سے کھولیں۔ سہولت بند کرنے سے نئی درخواستیں رک جاتی ہیں؛ جو کھلی ہیں وہ بند نہیں ہوتیں',
    'console.nUsers': 'پلیٹ فارم کا ہر اکاؤنٹ، نام یا ای میل سے تلاش کے قابل — اکاؤنٹ، بچے نہیں',
    'console.nControls':
      'ان سہولتوں کے پیچھے کے اعداد جو پہلے سے آن ہیں۔ صرف وہی دکھائے جاتے ہیں جو آپ کے کردار کے ہیں، اور ہر تبدیلی کے لیے وجہ درکار ہے',
    'console.nReports':
      'وہ مسائل جن کی نشاندہی پڑھنے والوں نے کسی سبق یا جواب میں کی۔ رپورٹ بند کرنے کے لیے تحریری نوٹ درکار ہے',
    'console.nMedia':
      'ہر اصل فائل جو کسی نے بھی اپ لوڈ کی۔ قرنطینہ اور واپسی دونوں کے لیے تحریری وجہ درکار ہے',
    'console.nCourseReviews':
      'سیکھنے والوں کی وہ درجہ بندیاں جن میں الفاظ بھی ہیں، اس وقت تک روکی ہوئی جب تک کوئی انہیں پڑھ نہ لے',
    'console.nDiscussion': 'سیکھنے والوں کے سوال اور ساتھیوں کے جواب جو جائزے کے لیے روکے گئے ہیں',
    'console.nBoards':
      'طلبہ کی گفتگو اور اساتذہ کی گفتگو کی وہ پوسٹیں جن کی کسی نے رپورٹ کی۔ وہاں پوسٹ فوراً دکھائی جاتی ہے، اس لیے اسے یہیں سے ہٹایا جاتا ہے۔ یہ دیکھنے کے لیے کہ صارف نام کے پیچھے کون ہے وجہ درکار ہے اور یہ درج ہوتا ہے',
    'console.nAssistant':
      'اس سے کیا پوچھا گیا اور اس کے لیے مقرر حدود نے کیا کیا: وہ جواب جنہوں نے کسی سبق کا حوالہ دیا، وہ سوال جو استاد کو بھیجے گئے، اور وہ جملے جن سے انکار کیا جاتا ہے',
    'console.nConnections':
      'وہ بیرونی اکاؤنٹ جو یہ سائٹ استعمال کرتی ہے (ڈیٹا بیس، ای میل، شیڈیولر، اسٹوریج، ادائیگیاں) اور کون سے ابھی جوڑنے باقی ہیں۔ صرف مالک کے لیے؛ غائب سیٹنگز کے نام، قدر کبھی نہیں',
    'console.nMessages':
      'پلیٹ فارم جو کچھ بھیجتا، تیار شدہ شکل میں اور درج شدہ۔ جب تک فراہم کنندہ ترتیب نہ دیا جائے، حقیقت میں کچھ نہیں بھیجا جاتا',
    'console.nPlans': 'ورژن والی شرائط، استحقاق اور بار بار کی قیمتیں',
    'console.nPanels':
      'مالک بورڈ بناتا ہے اور اس کا کورم طے کرتا ہے؛ عملہ کسی غیر شائع شدہ ورژن پر معاملہ کھولتا ہے؛ ارکان ووٹ دیتے ہیں اور صدر فیصلہ درج کرتا ہے۔ کورم سے کم پر معاملہ بند نہیں ہو سکتا، اور governance.panel_required بند ہو تو کوئی چیز اس کی منتظر نہیں رہتی',
    'console.nTakedowns':
      'نوٹس درج ہوتے ہی اس ورژن کو تقسیم سے روک دیتا ہے جس کا وہ نام لیتا ہے — کچھ حذف نہیں ہوتا، اس لیے فیصلے کے پاس اس کا ثبوت رہتا ہے۔ استاد اپنے صفحے پر جواب دیتا ہے، فیصلہ وہ شخص کرتا ہے جس نے نوٹس وصول نہیں کیا تھا، اور روک سے رقم میں کچھ نہیں بدلتا',
    'console.nIncidents':
      'کیا ہوا، کسے بتانا ہے اور کب تک، اور واقعات کی ترتیب جیسے جیسے وہ ہو رہے ہیں۔ گنتیاں، ناموں کی فہرست کبھی نہیں؛ ہر آخری تاریخ ایک انسان لکھتا ہے کیونکہ قاعدہ ہر منڈی میں الگ ہے۔ یہاں کوئی چیز خلاف ورزی کا پتا نہیں لگاتی اور کوئی چیز اطلاع نہیں بھیجتی',
    'console.nPolicies':
      'ہر دستاویز، ان ورژنز کے ساتھ جو نافذ رہے اور وہ مسودہ جو ابھی منتظر ہے۔ اشاعت کے لیے تاریخ اور تحریری وجہ درکار ہے، اور وہ اس وقت تک رد ہوتی ہے جب تک متن میں کوئی ایسا سوال نشان زد ہے جس کا جواب صرف آپ دے سکتے ہیں',
    'console.nCertificates': 'تکمیل کے سرٹیفکیٹ جاری کریں اور منسوخی وجہ کے ساتھ درج کریں',
    'console.nAnalytics':
      'لوگ کیا کرتے ہیں، ہمیشہ کے لیے محفوظ، واقعے اور دن کے حساب سے۔ صرف مجموعے',
    'console.nGuardians': 'بالغ افراد جو کسی بچے کے والدین تسلیم کیے جانے کی درخواست کر رہے ہیں',
    'console.nAppeals':
      'اساتذہ جو کسی رد پر اعتراض کر رہے ہیں۔ آپ اپنے ہی فیصلے کے خلاف اپیل کا فیصلہ نہیں کر سکتے',
    'console.nRoles': 'کون کیا کر سکتا ہے۔ ڈیٹا بیس کی ہر جانچ انہی کو پڑھتی ہے',
  },
  fa: {
    'console.nav': 'مدیریت',
    'console.nOrders':
      'تنها سفارش‌هایی که جمعشان هنوز می‌تواند تغییر کند: برای سفارش تخفیف، مالیات، کارمزد یا گردکردن ثبت کنید، یا آن را پس بگیرید',
    'console.nRefunds': 'پولی که برمی‌گردد. تأیید یک توافق است، نه انتقال پول',
    'console.nAdjustments':
      'اصلاح‌های حسابداری که فقط افزوده می‌شوند و ویرایش نمی‌شوند، و پس‌گرفتن درآمدها',
    'console.nReconciliation': 'ردیف‌های صورت‌حساب امضاشده در برابر دفتر داخلی',
    'console.nDisputes': 'برگشت وجه مهلت دارد؛ اگر بگذرد، ارائه‌دهنده تصمیم می‌گیرد چه شود',
    'console.nTax': 'آنچه افزون بر قیمت از خریدار گرفته می‌شود، بر پایهٔ کشوری که از آن می‌خرد',
    'console.nRates': 'یک ارز به ارز دیگر چقدر می‌ارزید، چه زمانی، و به گفتهٔ چه کسی',
    'console.nRevenue':
      'آنچه در یک بازهٔ زمانی فروخته شد، به تفکیک ارز، دوره، طرح و معلم؛ بازپرداخت‌ها کنار فروش دیده می‌شوند و هرگز پنهانی از آن کم نمی‌شوند',
    'console.nMoneyReport':
      'آنچه در یک بازهٔ زمانی جابه‌جا شد، به همان یک ارزی که سکو با آن خوانده می‌شود، با نرخ کنار هر رقم',
    'console.nRenewals':
      'هر اشتراک فعال، با همان قیمتی که فروخته شد رو به آینده گسترده شده است. تعهدشده است، نه رسیده — هنوز هیچ چیز پول تمدید را نمی‌گیرد',
    'console.nPayouts':
      'آنچه معلمان خواسته‌اند به آنان پرداخت شود، و نگه‌داشتِ بازپرداخت که نمی‌گذارد پول یک فروش پیش از آنکه برگرداندنش ممکن باشد بیرون برود',
    'console.nCourses':
      'هر دوره، اینکه به روی چه کسانی باز است و چند یادگیرنده دارد. تغییر مخاطبان یک دوره به نام شما ثبت می‌شود، با هر دو سوی تغییر',
    'console.nTeachers':
      'کسانی که می‌خواهند تدریس کنند، و هر کس که اینجا اجازهٔ تدریس دارد، همراه با آنچه منتشر کرده و شمار یادگیرندگان دوره‌هایش. تأیید یک درخواست همان انتصاب است: نقش را می‌دهد و دلیل شما کنار نام درخواست‌کننده ثبت می‌شود',
    'console.nAssign': 'دوره‌هایی که منتظر بازبین‌اند',
    'console.nSubjects':
      'واژگان فهرست دوره‌ها: آنچه یادگیرنده می‌تواند با آن فیلتر کند، و آنچه نشانِ روی کارت یک دوره می‌تواند بگوید. موضوعی را که دوره‌ای منتشرشده به کار می‌برد نمی‌توان کنار گذاشت',
    'console.nReviewers':
      'چه کسی برای بازبینی درخواست داده، چه کسی بررسی شده، و هر کدام دربارهٔ چه چیزی می‌تواند داوری کند. تا کسی در اینجا تأیید نشود، هیچ چیزی منتشر نمی‌شود',
    'console.nScreenings':
      'هر معلمِ منصوب و اینکه بررسی‌ای برایش در پرونده هست یا نه: از چه نوع، چه زمانی، کی منقضی می‌شود، چه کسی ثبتش کرده. نشانیِ سند نگه داشته می‌شود و دیگر هرگز نشان داده نمی‌شود، و سابقه را نمی‌توان ویرایش کرد — بررسی تازه جای آن را می‌گیرد. تا وقتی platform.safeguarding روشن است، دوره‌ای که ممکن است به کودکی نشان داده شود منتشر نمی‌شود مگر آنکه نویسنده‌اش بررسیِ قبول‌شده و منقضی‌نشده داشته باشد و سیاست رفتار را پذیرفته باشد',
    'console.nIjazah':
      'چه کسی به چه کسی اجازه داده، برای چه، و چه چیزی به شما نشان داده شد. ثبتش فقط با شماست: این سکو در جایگاهی نیست که سلسلهٔ سند را بیازماید، پس این فهرست می‌گوید «ثبت‌شده» و هرگز نمی‌گوید «تأییدشده»، و هیچ چیزِ اینجا برای یادگیرنده دیده نمی‌شود',
    'console.nTranslations':
      'اصلاح‌هایی که گویشوران زبان فرستاده‌اند، هر کدام در برابر سطری که جایش را می‌گیرد و در برابر متن‌های سایت آن‌گونه که واقعاً ساخته شده است. تصمیم فقط با شماست: پذیرفتن یک سطر سایت را تغییر نمی‌دهد — این کار را تکه‌ای می‌کند که در کد چسبانده می‌شود — و یک زبان تنها زمانی خوانده‌شده نامیده می‌شود که هر بخش آن خوانشِ منتشرشده داشته باشد — یا یک نفر خوانشِ همهٔ متن‌ها را منتشر کرده باشد — و دربارهٔ هر اصلاح تصمیم گرفته شده باشد',
    'console.nInstitutions':
      'مدرسه‌های دینی، مدرسه‌ها و سازمان‌هایی که صفحهٔ خودشان را دارند: یکی تازه باز کنید، رکورد DNS پشتِ ادعای یک دامنه را بیازمایید، و تغییر دهید چه کسی اداره‌اش می‌کند. مؤسسه شمار اعضای خودش را می‌بیند و هرگز نام یک یادگیرنده را نمی‌بیند، و نمی‌تواند جایگاه بخرد — صدور صورت‌حساب شرایط و ارائه‌دهنده‌ای می‌خواهد که هیچ‌کس ندارد',
    'console.nSponsorships':
      'یادگیرندگانی که دوره‌ای می‌خواهند، و اهداکنندگانی که هزینهٔ دوره‌ای را می‌پردازند. تصمیم دلیل نوشته می‌خواهد و ثبت پرداخت شمارهٔ مرجع؛ جایگاهِ حمایت‌شده سفارش نیست، پس نه مالیات دارد و نه درآمدی برای معلم',
    'console.nInvitations':
      'چه کسی چه کسی را دعوت کرد، چه به دست آمد و سقف سالانه یا یک بازپرداخت جلوی چه چیزی را گرفت. هر دو پاداش تخفیف روی دوره‌اند — پولی پرداخت نمی‌شود، پس اینجا موجودی‌ای نیست',
    'console.nSupport':
      'درخواست‌هایی که مردم از صفحهٔ راهنما باز کرده‌اند. خاموش کردن این قابلیت جلوی درخواست‌های تازه را می‌گیرد؛ آنچه باز است را نمی‌بندد',
    'console.nUsers': 'هر حساب روی سکو، قابل جست‌وجو با نام یا ایمیل — حساب‌ها، نه کودکان',
    'console.nControls':
      'عددهای پشتِ قابلیت‌هایی که از پیش روشن‌اند. فقط آن‌هایی که از آنِ نقش شماست نشان داده می‌شود، و هر تغییر دلیل می‌خواهد',
    'console.nReports':
      'مشکل‌هایی که خوانندگان در یک درس یا پاسخ گزارش کرده‌اند. بستن هر گزارش یادداشت نوشته می‌خواهد',
    'console.nMedia':
      'هر پروندهٔ اصلی که هر کسی بارگذاری کرده است. قرنطینه و پس‌گرفتن هر دو دلیل نوشته می‌خواهند',
    'console.nCourseReviews':
      'امتیازهای یادگیرندگان که نوشته هم دارند، نگه‌داشته‌شده تا کسی آن‌ها را بخواند',
    'console.nDiscussion':
      'پرسش‌های یادگیرندگان و پاسخ‌های هم‌درسان که برای بازبینی نگه داشته شده‌اند',
    'console.nBoards':
      'نوشته‌هایی در گفت‌وگوی دانش‌آموزان و گفت‌وگوی معلمان که کسی گزارششان کرده است. نوشته در آنجا بی‌درنگ نشان داده می‌شود، پس همین‌جاست که برداشته می‌شود. دیدن اینکه پشت یک نام کاربری کیست دلیل می‌خواهد و ثبت می‌شود',
    'console.nAssistant':
      'آنچه از آن پرسیده شد و آنچه مرزهای تعیین‌شده برایش کردند: پاسخ‌هایی که به درسی استناد کردند، پرسش‌هایی که برای معلم فرستاده شد، و عبارت‌هایی که با آن‌ها رد می‌کند',
    'console.nConnections':
      'حساب‌های بیرونی که این سایت به کار می‌برد (پایگاه داده، ایمیل، زمان‌بند، ذخیره‌سازی، پرداخت‌ها) و اینکه کدام‌ها هنوز وصل نشده‌اند. فقط برای مالک؛ نام تنظیم‌های جاافتاده، و هرگز مقدارشان نه',
    'console.nMessages':
      'آنچه سکو می‌فرستاد، به شکل نهایی و ثبت‌شده. تا ارائه‌دهنده‌ای پیکربندی نشود، هیچ چیز واقعاً فرستاده نمی‌شود',
    'console.nPlans': 'شرایط نسخه‌دار، حق‌های دسترسی و قیمت‌های دوره‌ای',
    'console.nPanels':
      'مالک هیئتی تشکیل می‌دهد و حد نصابش را تعیین می‌کند؛ کارکنان برای نسخه‌ای منتشرنشده پرونده باز می‌کنند؛ اعضا رأی می‌دهند و رئیس تصمیم را ثبت می‌کند. پرونده زیر حد نصاب بسته نمی‌شود، و اگر governance.panel_required خاموش باشد هیچ چیز منتظر آن نمی‌ماند',
    'console.nTakedowns':
      'اعلامیه همان لحظه که وارد می‌شود نسخه‌ای را که نام می‌برد از توزیع بازمی‌دارد — چیزی حذف نمی‌شود، پس تصمیم همچنان مدرکش را دارد. معلم در صفحهٔ خودش پاسخ می‌دهد، کسی جز آن که اعلامیه را گرفته دربارهٔ آن تصمیم می‌گیرد، و بازداشتن هیچ پولی را تغییر نمی‌دهد',
    'console.nIncidents':
      'چه رخ داد، به چه کسی باید خبر داد و تا کی، و خط زمانی همان‌طور که پیش می‌رود. شمارها، و هرگز فهرست نام‌ها نه؛ هر مهلت را یک انسان می‌نویسد چون قاعده در هر بازار فرق دارد. هیچ چیز در اینجا رخنه‌ای را کشف نمی‌کند و هیچ چیز اعلانی نمی‌فرستد',
    'console.nPolicies':
      'هر سند با نسخه‌هایی که نافذ بوده‌اند و پیش‌نویسی که اکنون منتظر است. انتشار تاریخ و دلیل نوشته می‌خواهد، و تا وقتی پرسشی که فقط شما می‌توانید پاسخ دهید هنوز در متن نشانه‌گذاری شده است رد می‌شود',
    'console.nCertificates': 'صدور گواهی‌نامه‌های پایان دوره و ثبت ابطال‌ها همراه با دلیل',
    'console.nAnalytics':
      'آنچه مردم انجام می‌دهند، برای همیشه نگه‌داشته، به تفکیک رویداد و روز. فقط جمع‌ها',
    'console.nGuardians': 'بزرگسالانی که می‌خواهند به‌عنوان والد یک کودک شناخته شوند',
    'console.nAppeals':
      'معلمانی که به یک رد اعتراض دارند. نمی‌توانید دربارهٔ اعتراض به تصمیم خودتان تصمیم بگیرید',
    'console.nRoles': 'چه کسی چه کاری می‌تواند بکند. هر وارسی در پایگاه داده این‌ها را می‌خواند',
  },
  'fa-af': {
    'console.nav': 'اداره',
    'console.nOrders':
      'تنها فرمایش‌هایی که مجموع‌شان هنوز می‌تواند تغییر کند: برای فرمایش تخفیف، مالیه، فیس یا گردکردن ثبت کنید، یا آن را پس بگیرید',
    'console.nRefunds': 'پولی که برمی‌گردد. تأیید یک توافق است، نه انتقال پول',
    'console.nAdjustments':
      'اصلاح‌های حسابداری که تنها افزوده می‌شوند و ویرایش نمی‌شوند، و پس‌گرفتن عایدها',
    'console.nReconciliation': 'ردیف‌های صورت‌حساب امضاشده در برابر دفتر داخلی',
    'console.nDisputes': 'برگشت پول مهلت دارد؛ اگر بگذرد، ارائه‌کننده تصمیم می‌گیرد چه شود',
    'console.nTax': 'آنچه افزون بر قیمت از خریدار گرفته می‌شود، بر اساس کشوری که از آن می‌خرد',
    'console.nRates': 'یک اسعار به اسعار دیگر چقدر می‌ارزید، چه وقت، و به گفتهٔ چه کسی',
    'console.nRevenue':
      'آنچه در یک بازهٔ زمانی فروخته شد، به تفکیک اسعار، کورس، پلان و آموزگار؛ بازپرداخت‌ها کنار فروش دیده می‌شوند و هرگز پنهانی از آن کم نمی‌شوند',
    'console.nMoneyReport':
      'آنچه در یک بازهٔ زمانی جابه‌جا شد، به همان یک اسعاری که پلتفرم با آن خوانده می‌شود، با نرخ کنار هر رقم',
    'console.nRenewals':
      'هر اشتراک فعال، با همان قیمتی که فروخته شد رو به آینده گسترده شده است. تعهدشده است، نه رسیده — هنوز هیچ چیز پول تمدید را نمی‌گیرد',
    'console.nPayouts':
      'آنچه آموزگاران خواسته‌اند به آنان پرداخت شود، و نگه‌داشتِ بازپرداخت که نمی‌گذارد پول یک فروش پیش از آنکه برگرداندنش ممکن باشد بیرون برود',
    'console.nCourses':
      'هر کورس، اینکه به روی چه کسانی باز است و چند شاگرد دارد. تغییر مخاطبان یک کورس به نام شما ثبت می‌شود، با هر دو طرف تغییر',
    'console.nTeachers':
      'کسانی که می‌خواهند تدریس کنند، و هر کس که این‌جا اجازهٔ تدریس دارد، همراه با آنچه نشر کرده و شمار شاگردان کورس‌هایش. تأیید یک درخواست همان تعیین است: نقش را می‌دهد و دلیل شما کنار نام درخواست‌کننده ثبت می‌شود',
    'console.nAssign': 'کورس‌هایی که منتظر بازبین‌اند',
    'console.nSubjects':
      'واژگان فهرست: آنچه شاگرد می‌تواند با آن فلتر کند، و آنچه نشانِ روی کارت یک کورس می‌تواند بگوید. مضمونی را که کورسی نشرشده به کار می‌برد نمی‌توان کنار گذاشت',
    'console.nReviewers':
      'چه کسی برای بازبینی درخواست داده، چه کسی بررسی شده، و هر کدام دربارهٔ چه چیزی می‌تواند داوری کند. تا کسی در این‌جا تأیید نشود، هیچ چیزی نشر نمی‌شود',
    'console.nScreenings':
      'هر آموزگارِ تعیین‌شده و اینکه بررسی‌ای برایش در دوسیه هست یا نه: از چه نوع، چه وقت، کی ختم می‌شود، چه کسی ثبتش کرده. نشانیِ سند نگه داشته می‌شود و دیگر هرگز نشان داده نمی‌شود، و سابقه را نمی‌توان ویرایش کرد — بررسی تازه جای آن را می‌گیرد. تا وقتی platform.safeguarding روشن است، کورسی که ممکن است به طفلی نشان داده شود نشر نمی‌شود مگر آنکه نویسنده‌اش بررسیِ قبول‌شده و ختم‌نشده داشته باشد و پالیسی رفتار را پذیرفته باشد',
    'console.nIjazah':
      'چه کسی به چه کسی اجازه داده، برای چه، و چه چیزی به شما نشان داده شد. ثبتش تنها با شماست: این پلتفرم در جایگاهی نیست که سلسلهٔ سند را بیازماید، پس این فهرست می‌گوید «ثبت‌شده» و هرگز نمی‌گوید «تأییدشده»، و هیچ چیزِ این‌جا برای شاگرد دیده نمی‌شود',
    'console.nTranslations':
      'اصلاح‌هایی که گویندگان زبان فرستاده‌اند، هر کدام در برابر سطری که جایش را می‌گیرد و در برابر متن‌های سایت آن‌گونه که واقعاً ساخته شده است. تصمیم تنها با شماست: پذیرفتن یک سطر سایت را تغییر نمی‌دهد — این کار را تکه‌ای می‌کند که در کود چسپانده می‌شود — و یک زبان تنها وقتی خوانده‌شده نامیده می‌شود که هر بخش آن خوانشِ نشرشده داشته باشد — یا یک نفر خوانشِ همهٔ متن‌ها را نشر کرده باشد — و دربارهٔ هر اصلاح تصمیم گرفته شده باشد',
    'console.nInstitutions':
      'مدرسه‌های دینی، مکتب‌ها و سازمان‌هایی که صفحهٔ خودشان را دارند: یکی تازه باز کنید، ریکارد DNS پشتِ ادعای یک دامنه را بیازمایید، و تغییر دهید چه کسی اداره‌اش می‌کند. مؤسسه شمار اعضای خودش را می‌بیند و هرگز نام یک شاگرد را نمی‌بیند، و نمی‌تواند چوکی بخرد — صدور بل شرایط و ارائه‌کننده‌ای می‌خواهد که هیچ‌کس ندارد',
    'console.nSponsorships':
      'شاگردانی که کورسی می‌خواهند، و اهداکنندگانی که هزینهٔ کورسی را می‌پردازند. تصمیم دلیل نوشته می‌خواهد و ثبت پرداخت شمارهٔ مرجع؛ چوکیِ حمایت‌شده فرمایش نیست، پس نه مالیه دارد و نه عایدی برای آموزگار',
    'console.nInvitations':
      'چه کسی چه کسی را دعوت کرد، چه به دست آمد و سقف سالانه یا یک بازپرداخت پیش چه چیزی را گرفت. هر دو پاداش تخفیف روی کورس‌اند — پولی پرداخت نمی‌شود، پس این‌جا بیلانسی نیست',
    'console.nSupport':
      'درخواست‌هایی که مردم از صفحهٔ کمک باز کرده‌اند. خاموش کردن این قابلیت پیش درخواست‌های تازه را می‌گیرد؛ آنچه باز است را نمی‌بندد',
    'console.nUsers': 'هر حساب روی پلتفرم، قابل جست‌وجو با نام یا ایمیل — حساب‌ها، نه اطفال',
    'console.nControls':
      'عددهای پشتِ قابلیت‌هایی که از پیش روشن‌اند. تنها آن‌هایی که از آنِ نقش شماست نشان داده می‌شود، و هر تغییر دلیل می‌خواهد',
    'console.nReports':
      'مشکل‌هایی که خوانندگان در یک درس یا پاسخ گزارش کرده‌اند. بستن هر گزارش یادداشت نوشته می‌خواهد',
    'console.nMedia':
      'هر فایل اصلی که هر کسی بارگذاری کرده است. قرنطین و پس‌گرفتن هر دو دلیل نوشته می‌خواهند',
    'console.nCourseReviews':
      'نمره‌های شاگردان که نوشته هم دارند، نگه‌داشته‌شده تا کسی آن‌ها را بخواند',
    'console.nDiscussion': 'پرسش‌های شاگردان و پاسخ‌های هم‌صنفان که برای بازبینی نگه داشته شده‌اند',
    'console.nBoards':
      'نوشته‌هایی در گفت‌وگوی شاگردان و گفت‌وگوی استادان که کسی گزارش‌شان کرده است. نوشته در آن‌جا فوراً نشان داده می‌شود، پس همین‌جاست که برداشته می‌شود. دیدن اینکه پشت یک نام کاربری کیست دلیل می‌خواهد و ثبت می‌شود',
    'console.nAssistant':
      'آنچه از آن پرسیده شد و آنچه مرزهای تعیین‌شده برایش کردند: پاسخ‌هایی که به درسی استناد کردند، پرسش‌هایی که برای آموزگار فرستاده شد، و عبارت‌هایی که با آن‌ها رد می‌کند',
    'console.nConnections':
      'حساب‌های بیرونی که این سایت به کار می‌برد (دیتابیس، ایمیل، زمان‌بند، ذخیره‌سازی، پرداخت‌ها) و اینکه کدام‌ها هنوز وصل نشده‌اند. تنها برای مالک؛ نام تنظیم‌های جاافتاده، و هرگز مقدارشان نه',
    'console.nMessages':
      'آنچه پلتفرم می‌فرستاد، به شکل نهایی و ثبت‌شده. تا ارائه‌کننده‌ای تنظیم نشود، هیچ چیز واقعاً فرستاده نمی‌شود',
    'console.nPlans': 'شرایط نسخه‌دار، حق‌های دسترسی و قیمت‌های تکرارشونده',
    'console.nPanels':
      'مالک هیئتی تشکیل می‌دهد و نصابش را تعیین می‌کند؛ کارمندان برای نسخه‌ای نشرنشده دوسیه باز می‌کنند؛ اعضا رأی می‌دهند و رئیس تصمیم را ثبت می‌کند. دوسیه زیر نصاب بسته نمی‌شود، و اگر governance.panel_required خاموش باشد هیچ چیز منتظر آن نمی‌ماند',
    'console.nTakedowns':
      'اطلاعیه همان لحظه که وارد می‌شود نسخه‌ای را که نام می‌برد از توزیع بازمی‌دارد — چیزی حذف نمی‌شود، پس تصمیم همچنان مدرکش را دارد. آموزگار در صفحهٔ خودش پاسخ می‌دهد، کسی جز آن که اطلاعیه را گرفته دربارهٔ آن تصمیم می‌گیرد، و بازداشتن هیچ پولی را تغییر نمی‌دهد',
    'console.nIncidents':
      'چه رخ داد، به چه کسی باید خبر داد و تا کی، و خط زمانی همان‌طور که پیش می‌رود. شمارها، و هرگز فهرست نام‌ها نه؛ هر مهلت را یک انسان می‌نویسد چون قاعده در هر بازار فرق دارد. هیچ چیز در این‌جا رخنه‌ای را کشف نمی‌کند و هیچ چیز اعلانی نمی‌فرستد',
    'console.nPolicies':
      'هر سند با نسخه‌هایی که نافذ بوده‌اند و مسوده‌ای که اکنون منتظر است. نشر تاریخ و دلیل نوشته می‌خواهد، و تا وقتی پرسشی که تنها شما می‌توانید پاسخ دهید هنوز در متن نشانی شده است رد می‌شود',
    'console.nCertificates': 'صدور اسناد ختم کورس و ثبت ابطال‌ها همراه با دلیل',
    'console.nAnalytics':
      'آنچه مردم انجام می‌دهند، برای همیشه نگه‌داشته، به تفکیک رویداد و روز. تنها مجموع‌ها',
    'console.nGuardians': 'بزرگسالانی که می‌خواهند به‌حیث والد یک طفل شناخته شوند',
    'console.nAppeals':
      'آموزگارانی که به یک رد اعتراض دارند. نمی‌توانید دربارهٔ اعتراض به تصمیم خودتان تصمیم بگیرید',
    'console.nRoles': 'چه کسی چه کاری می‌تواند بکند. هر وارسی در دیتابیس این‌ها را می‌خواند',
  },
  tr: {
    'console.nav': 'Yönetim',
    'console.nOrders':
      'toplamı hâlâ değişebilen tek siparişler: birine indirim, vergi, ücret veya yuvarlama kaydedin ya da siparişi geri çekin',
    'console.nRefunds': 'geri giden para. Onaylamak bir anlaşmadır, havale değil',
    'console.nAdjustments':
      'yalnızca eklenen, değiştirilmeyen muhasebe düzeltmeleri ve kazançların geri alınması',
    'console.nReconciliation': 'imzalı ekstre satırlarının iç defterle karşılaştırılması',
    'console.nDisputes':
      'ters ibrazın bir son tarihi vardır; geçerse ne olacağına sağlayıcı karar verir',
    'console.nTax': 'alıcıdan fiyatın üstüne ne alındığı, satın aldığı ülkeye göre',
    'console.nRates':
      'bir para biriminin başka bir para birimi cinsinden ne ettiği, ne zaman ve bunu kimin söylediği',
    'console.nRevenue':
      'bir dönemde ne satıldığı: para birimine, kursa, plana ve öğretmene göre; iadeler satışın yanında gösterilir, asla gözden uzakta düşülmez',
    'console.nMoneyReport':
      'bir dönemde ne kadar para hareket ettiği: platformun okunduğu tek para biriminde, her rakamın yanında kuruyla',
    'console.nRenewals':
      'süren her abonelik, satıldığı fiyatla ileriye doğru açılmış olarak. Taahhüt edilmiş para, gelmiş para değil — şimdilik hiçbir şey yenileme ücreti tahsil etmiyor',
    'console.nPayouts':
      'öğretmenlerin ödenmesini istedikleri tutarlar ve bir satışın parasının, iade edilebileceği süre dolmadan çıkmasını önleyen iade beklemesi',
    'console.nCourses':
      'her kurs, kimlere açık olduğu ve kaç öğrencisi olduğu. Bir kursun hedef kitlesini değiştirmek, değişikliğin iki yanıyla birlikte adınıza kaydedilir',
    'console.nTeachers':
      'öğretmek için başvuranlar ve burada öğretebilen herkes; her birinin ne yayımladığı ve kurslarında kaç öğrenci olduğu ile birlikte. Bir başvuruyu onaylamak atamanın kendisidir: rolü verir ve gerekçeniz başvuranın kaydına yazılır',
    'console.nAssign': 'değerlendirici bekleyen kurslar',
    'console.nSubjects':
      'kataloğun söz dağarcığı: bir öğrencinin neye göre süzebileceği ve bir kurs kartındaki rozetin ne diyebileceği. Yayındaki bir kursun kullandığı konu alanı kullanımdan kaldırılamaz',
    'console.nReviewers':
      'kimin değerlendirici olmak için başvurduğu, kimin kontrol edildiği ve her birinin neyi değerlendirebileceği. Burada biri doğrulanana kadar hiçbir şey yayımlanmaz',
    'console.nScreenings':
      'atanmış her öğretmen ve dosyasında bir tarama olup olmadığı: türü, tarihi, ne zaman geçersiz olacağı, kimin kaydettiği. Belgenin referansı saklanır ve bir daha gösterilmez; kayıt düzenlenemez — yerini yeni bir tarama alır. platform.safeguarding açıkken, bir çocuğa gösterilebilecek bir kurs, yazarının başarıyla sonuçlanmış ve süresi dolmamış bir taraması yoksa ve davranış politikasını kabul etmemişse yayımlanamaz',
    'console.nIjazah':
      'kimin kime, ne için icazet verdiği ve size neyin gösterildiği. Kaydetmek yalnızca size aittir: bir sened zincirini denetlemek bu platformun yetkisinde değildir; bu yüzden kütük “kaydedildi” der, asla “doğrulandı” demez ve buradaki hiçbir şeyi öğrenci göremez',
    'console.nTranslations':
      'dili konuşanların gönderdiği düzeltmeler; her biri, yerini aldığı satırın ve gerçekten derlenmiş site metinlerinin karşısında gösterilir. Karar yalnızca sizindir: bir satırı kabul etmek siteyi değiştirmez — bunu koda yapıştırılan blok yapar — ve bir dil ancak her bölümünün yayımlanmış bir okuması olduğunda — ya da tek bir kişi bütün metinlerin okumasını yayımladığında — ve her düzeltme karara bağlandığında okunmuş sayılır',
    'console.nInstitutions':
      'kendi sayfası olan medreseler, okullar ve kuruluşlar: yenisini açın, bir alan adı talebinin ardındaki DNS kaydını denetleyin ve kimin yönettiğini değiştirin. Bir kurum kendi üyelerinin sayılarını görür, asla bir öğrencinin adını görmez; yer satın alamaz — faturalama için kimsede olmayan koşullar ve bir sağlayıcı gerekir',
    'console.nSponsorships':
      'kurs isteyen öğrenciler ve bir kursun ücretini ödeyen bağışçılar. Karar vermek yazılı bir gerekçe, ödeme kaydetmek bir referans ister; destekli yer bir sipariş değildir, bu yüzden vergisi de öğretmen kazancı da olmaz',
    'console.nInvitations':
      'kimin kimi davet ettiği, davetin ne kazandırdığı ve yıllık sınırın ya da bir iadenin neyi durdurduğu. İki ödül de kurs indirimidir — hiçbir şey ödenmez, bu yüzden burada bakiye yoktur',
    'console.nSupport':
      'insanların Yardım sayfasından açtığı talepler. Özelliği kapatmak yenilerini durdurur; açık olanları kapatmaz',
    'console.nUsers':
      'platformdaki her hesap, ada veya e-postaya göre aranabilir — hesaplar, çocuklar değil',
    'console.nControls':
      'zaten açık olan özelliklerin ardındaki sayılar. Yalnızca rolünüze ait olanlar gösterilir ve her değişiklik bir gerekçe ister',
    'console.nReports':
      'okurların bir derste veya yanıtta bildirdiği sorunlar. Birini kapatmak için yazılı bir not gerekir',
    'console.nMedia':
      'herhangi birinin yüklediği her asıl dosya. Karantina da geri çekme de yazılı bir gerekçe ister',
    'console.nCourseReviews': 'söz içeren öğrenci puanlamaları; biri okuyana kadar bekletilir',
    'console.nDiscussion': 'inceleme için bekletilen öğrenci soruları ve akran yanıtları',
    'console.nBoards':
      'öğrenci tartışmasında ve öğretmen tartışmasında birinin bildirdiği gönderiler. Orada bir gönderi hemen gösterilir, bu yüzden kaldırıldığı yer burasıdır. Bir kullanıcı adının ardında kimin olduğunu görmek gerekçe ister ve kaydedilir',
    'console.nAssistant':
      'ona ne sorulduğu ve konulan sınırların ne yaptığı: bir dersi kaynak gösteren yanıtlar, bir öğretmene gönderilen sorular ve reddederken kullanılan ifadeler',
    'console.nConnections':
      'bu sitenin kullandığı dış hesaplar (veritabanı, e-posta, zamanlayıcı, depolama, ödemeler) ve hangilerinin henüz bağlanmadığı. Yalnızca sahip için; eksik ayarların adları, asla bir değer değil',
    'console.nMessages':
      'platformun göndereceği şeyler, son hâliyle ve kayıtlı olarak. Bir sağlayıcı yapılandırılana kadar gerçekte hiçbir şey gönderilmez',
    'console.nPlans': 'sürümlü koşullar, haklar ve yinelenen fiyatlar',
    'console.nPanels':
      'sahip bir kurul toplar ve yeter sayısını belirler; personel yayımlanmamış bir sürüm için dosya açar; üyeler oy verir ve başkan kararı kaydeder. Yeter sayının altında bir dosya kapatılamaz ve governance.panel_required kapalıyken hiçbir şey onu beklemez',
    'console.nTakedowns':
      'bir bildirim, adını verdiği sürümü girildiği anda dağıtımdan alıkoyar — hiçbir şey silinmez, bu yüzden kararın kanıtı durur. Öğretmen kendi sayfasında yanıt verir, bildirimi alan kişiden başka biri karar verir ve alıkoyma hiçbir parayı değiştirmez',
    'console.nIncidents':
      'ne olduğu, kime ve ne zamana kadar haber verilmesi gerektiği ve olaylar sürerken zaman çizelgesi. Sayılar, asla bir ad listesi değil; kural pazara göre değiştiği için her son tarihi bir insan yazar. Buradaki hiçbir şey bir ihlali saptamaz ve hiçbir şey bildirim göndermez',
    'console.nPolicies':
      'her belge, yürürlükte olmuş sürümleri ve şimdi bekleyen taslağıyla. Yayımlamak bir tarih ve yazılı bir gerekçe ister; metinde yalnızca sizin yanıtlayabileceğiniz bir soru hâlâ işaretliyken reddedilir',
    'console.nCertificates':
      'tamamlama sertifikaları düzenleyin ve iptalleri gerekçesiyle kaydedin',
    'console.nAnalytics':
      'insanların ne yaptığı; süresiz saklanır, olaya ve güne göre. Yalnızca toplamlar',
    'console.nGuardians': 'bir çocuğun ebeveyni olarak tanınmak isteyen yetişkinler',
    'console.nAppeals':
      'bir redde itiraz eden öğretmenler. Kendi kararınıza yapılan bir itirazı siz karara bağlayamazsınız',
    'console.nRoles': 'kimin ne yapabileceği. Veritabanındaki her denetim bunları okur',
  },
  id: {
    'console.nav': 'Administrasi',
    'console.nOrders':
      'satu-satunya pesanan yang totalnya masih bisa berubah: catat diskon, pajak, biaya, atau pembulatan pada sebuah pesanan, atau tarik pesanan itu',
    'console.nRefunds': 'uang yang keluar kembali. Menyetujui adalah kesepakatan, bukan transfer',
    'console.nAdjustments':
      'koreksi akuntansi yang hanya ditambahkan, tidak diubah, dan penarikan kembali pendapatan',
    'console.nReconciliation':
      'baris laporan yang ditandatangani dibandingkan dengan buku besar internal',
    'console.nDisputes':
      'tolak bayar punya tenggat; penyedia yang menentukan apa yang terjadi bila tenggat lewat',
    'console.nTax':
      'apa yang dikenakan kepada pembeli di atas harga, menurut negara tempat ia membeli',
    'console.nRates':
      'berapa nilai satu mata uang dalam mata uang lain, kapan, dan siapa yang mengatakannya',
    'console.nRevenue':
      'apa yang terjual dalam satu periode menurut mata uang, kursus, paket, dan pengajar, dengan pengembalian dana di samping penjualan dan tidak pernah dikurangkan tanpa terlihat',
    'console.nMoneyReport':
      'apa yang bergerak dalam satu periode, dalam satu mata uang yang dipakai untuk membaca platform, dengan kurs di samping setiap angka',
    'console.nRenewals':
      'setiap langganan aktif yang dibentangkan ke depan dengan harga saat dijual. Sudah dijanjikan, belum diterima — belum ada yang menagih perpanjangan',
    'console.nPayouts':
      'apa yang diminta para pengajar untuk dibayarkan, dan masa tahan pengembalian dana yang mencegah uang sebuah penjualan keluar selagi masih bisa dibatalkan',
    'console.nCourses':
      'setiap kursus, untuk siapa kursus itu dibuka, dan berapa peserta didiknya. Mengubah sasaran sebuah kursus dicatat atas nama Anda, beserta keadaan sebelum dan sesudahnya',
    'console.nTeachers':
      'orang-orang yang meminta untuk mengajar, dan semua yang boleh mengajar di sini beserta apa yang telah diterbitkan masing-masing dan berapa peserta didik di kursusnya. Menyetujui sebuah permohonan adalah penunjukan itu sendiri: peran diberikan, dan alasan Anda dicatat pada pemohon',
    'console.nAssign': 'kursus yang menunggu peninjau',
    'console.nSubjects':
      'kosakata katalog: apa yang bisa dipakai peserta didik untuk menyaring, dan apa yang boleh dikatakan lencana pada kartu kursus. Bidang yang dipakai kursus yang sedang terbit tidak dapat dipensiunkan',
    'console.nReviewers':
      'siapa yang melamar untuk meninjau, siapa yang sudah diperiksa, dan apa yang boleh dinilai masing-masing. Tidak ada yang terbit sampai seseorang di sini diverifikasi',
    'console.nScreenings':
      'setiap pengajar yang ditunjuk dan apakah ada pemeriksaan yang tersimpan: jenisnya, kapan, kapan kedaluwarsa, siapa yang mencatatnya. Rujukan ke dokumen disimpan dan tidak pernah ditampilkan lagi, dan catatan tidak dapat diubah — pemeriksaan baru menggantikannya. Selama platform.safeguarding menyala, kursus yang mungkin ditampilkan kepada anak tidak dapat diterbitkan kecuali penulisnya memiliki pemeriksaan yang lulus dan belum kedaluwarsa serta telah menyatakan menerima kebijakan perilaku',
    'console.nIjazah':
      'siapa yang memberi ijazah kepada siapa, untuk apa, dan apa yang diperlihatkan kepada Anda. Hanya Anda yang mencatatnya: mata rantai sanad bukan hal yang berhak diperiksa platform ini, jadi daftar ini mengatakan “dicatat”, tidak pernah “diverifikasi”, dan tidak ada apa pun di sini yang terlihat oleh peserta didik',
    'console.nTranslations':
      'koreksi yang dikirim para penutur bahasa, masing-masing ditampilkan berhadapan dengan baris yang digantikannya dan dengan teks situs yang benar-benar dibangun. Hanya Anda yang memutuskan: menerima sebuah baris tidak mengubah situs — blok yang ditempelkan ke dalam kode yang melakukannya — dan sebuah bahasa baru disebut sudah dibaca bila setiap bagiannya memiliki pembacaan yang diterbitkan — atau bila satu orang telah menerbitkan pembacaan seluruh teks — dengan setiap koreksi sudah diputuskan',
    'console.nInstitutions':
      'madrasah, sekolah, dan organisasi yang punya halaman sendiri: buka yang baru, periksa catatan DNS di balik klaim sebuah domain, dan ubah siapa yang mengelolanya. Sebuah lembaga melihat jumlah anggotanya sendiri dan tidak pernah nama seorang peserta didik, dan tidak dapat membeli kursi — penagihan memerlukan ketentuan dan penyedia yang belum dimiliki siapa pun',
    'console.nSponsorships':
      'peserta didik yang meminta kursus, dan donatur yang membayar sebuah kursus. Memutuskan memerlukan alasan tertulis dan mencatat pembayaran memerlukan nomor rujukan; kursi bersponsor bukan pesanan, jadi tidak ada pajak dan tidak ada pendapatan pengajar padanya',
    'console.nInvitations':
      'siapa mengundang siapa, apa yang dihasilkan, dan apa yang dihentikan oleh batas tahunan atau sebuah pengembalian dana. Kedua hadiah adalah diskon kursus — tidak ada yang dibayarkan, jadi tidak ada saldo di sini',
    'console.nSupport':
      'permintaan yang dibuka orang dari halaman Bantuan. Mematikan fitur ini menghentikan permintaan baru; yang sedang berjalan tidak ditutup',
    'console.nUsers':
      'setiap akun di platform, dapat dicari dengan nama atau email — akun, bukan anak',
    'console.nControls':
      'angka-angka di balik fitur yang sudah menyala. Hanya yang dimiliki peran Anda yang ditampilkan, dan setiap perubahan memerlukan alasan',
    'console.nReports':
      'masalah yang ditandai pembaca dalam sebuah pelajaran atau jawaban. Menutupnya memerlukan catatan tertulis',
    'console.nMedia':
      'setiap berkas asli yang diunggah siapa pun. Karantina dan penarikan sama-sama memerlukan alasan tertulis',
    'console.nCourseReviews':
      'penilaian peserta didik yang disertai kata-kata, ditahan sampai seseorang membacanya',
    'console.nDiscussion':
      'pertanyaan peserta didik dan jawaban sesama peserta yang ditahan untuk ditinjau',
    'console.nBoards':
      'kiriman di diskusi siswa dan diskusi guru yang dilaporkan seseorang. Kiriman di sana langsung ditampilkan, jadi di sinilah kiriman diturunkan. Melihat siapa di balik sebuah nama pengguna memerlukan alasan dan dicatat',
    'console.nAssistant':
      'apa yang ditanyakan kepadanya dan apa yang dilakukan batas yang dipasang untuknya: jawaban yang merujuk sebuah pelajaran, pertanyaan yang diteruskan kepada pengajar, dan frasa yang dipakai untuk menolak',
    'console.nConnections':
      'akun luar yang dipakai situs ini (basis data, email, penjadwal, penyimpanan, pembayaran) dan mana yang belum dihubungkan. Hanya untuk pemilik; nama pengaturan yang belum ada, tidak pernah nilainya',
    'console.nMessages':
      'apa yang akan dikirim platform, dalam bentuk jadinya dan tercatat. Tidak ada yang benar-benar terkirim sampai sebuah penyedia dikonfigurasi',
    'console.nPlans': 'ketentuan berversi, hak akses, dan harga berulang',
    'console.nPanels':
      'pemilik membentuk dewan dan menetapkan kuorumnya; staf membuka kasus atas versi yang belum terbit; para anggota memberi suara dan ketua mencatat keputusan. Kasus tidak dapat ditutup di bawah kuorum, dan bila governance.panel_required mati tidak ada yang menunggunya',
    'console.nTakedowns':
      'sebuah pemberitahuan menahan versi yang disebutnya dari peredaran begitu dimasukkan — tidak ada yang dihapus, jadi keputusan tetap punya buktinya. Pengajar menjawab di halamannya sendiri, yang memutuskan adalah orang selain penerima pemberitahuan, dan penahanan tidak mengubah uang sedikit pun',
    'console.nIncidents':
      'apa yang terjadi, siapa yang harus diberi tahu dan paling lambat kapan, dan lini masa selagi kejadian berlangsung. Jumlah, tidak pernah daftar nama; setiap tenggat diketik oleh manusia karena aturannya berbeda di tiap pasar. Tidak ada apa pun di sini yang mendeteksi pelanggaran data dan tidak ada yang mengirim pemberitahuan',
    'console.nPolicies':
      'setiap dokumen beserta versi yang pernah berlaku dan draf yang kini menunggu. Menerbitkan memerlukan tanggal dan alasan tertulis, dan ditolak selama masih ada pertanyaan dalam teks yang hanya bisa Anda jawab',
    'console.nCertificates':
      'terbitkan sertifikat kelulusan dan catat pencabutan beserta alasannya',
    'console.nAnalytics':
      'apa yang dilakukan orang, disimpan selamanya, menurut peristiwa dan menurut hari. Hanya agregat',
    'console.nGuardians': 'orang dewasa yang meminta diakui sebagai orang tua seorang anak',
    'console.nAppeals':
      'pengajar yang menggugat sebuah penolakan. Anda tidak dapat memutus banding atas keputusan Anda sendiri',
    'console.nRoles': 'siapa boleh melakukan apa. Setiap pemeriksaan di basis data membaca ini',
  },
  ms: {
    'console.nav': 'Pentadbiran',
    'console.nOrders':
      'satu-satunya pesanan yang jumlahnya masih boleh berubah: rekodkan diskaun, cukai, yuran atau pembundaran pada sesuatu pesanan, atau tarik balik pesanan itu',
    'console.nRefunds':
      'wang yang keluar semula. Meluluskan ialah satu persetujuan, bukan pemindahan',
    'console.nAdjustments':
      'pembetulan perakaunan yang hanya ditambah, tidak diubah, dan penarikan balik pendapatan',
    'console.nReconciliation':
      'baris penyata yang ditandatangani dibandingkan dengan lejar dalaman',
    'console.nDisputes':
      'caj balik ada tarikh akhir; penyedia yang menentukan apa yang berlaku jika tarikh itu berlalu',
    'console.nTax':
      'apa yang dikenakan kepada pembeli di atas harga, mengikut negara tempat dia membeli',
    'console.nRates':
      'berapa nilai satu mata wang dalam mata wang lain, bila, dan siapa yang mengatakannya',
    'console.nRevenue':
      'apa yang terjual dalam satu tempoh mengikut mata wang, kursus, pelan dan guru, dengan bayaran balik di sisi jualan dan tidak sekali-kali ditolak tanpa kelihatan',
    'console.nMoneyReport':
      'apa yang bergerak dalam satu tempoh, dalam satu mata wang yang digunakan untuk membaca platform, dengan kadar di sisi setiap angka',
    'console.nRenewals':
      'setiap langganan aktif yang dibentangkan ke hadapan pada harga ia dijual. Sudah dijanjikan, belum diterima — belum ada apa-apa yang mengenakan caj pembaharuan',
    'console.nPayouts':
      'apa yang diminta oleh guru untuk dibayar, dan tempoh tahanan bayaran balik yang menghalang wang sesuatu jualan keluar selagi ia masih boleh dibatalkan',
    'console.nCourses':
      'setiap kursus, kepada siapa ia dibuka dan berapa ramai pelajarnya. Menukar sasaran sesuatu kursus direkodkan atas nama anda, dengan keadaan sebelum dan selepasnya',
    'console.nTeachers':
      'mereka yang memohon untuk mengajar, dan semua yang boleh mengajar di sini berserta apa yang telah diterbitkan oleh setiap seorang dan berapa ramai pelajar dalam kursus mereka. Meluluskan sesuatu permohonan ialah pelantikan itu sendiri: peranan diberikan, dan sebab anda direkodkan pada pemohon',
    'console.nAssign': 'kursus yang menunggu penyemak',
    'console.nSubjects':
      'perbendaharaan kata katalog: apa yang boleh digunakan pelajar untuk menapis, dan apa yang boleh dikatakan oleh lencana pada kad kursus. Subjek yang digunakan oleh kursus yang sedang diterbitkan tidak boleh dibersarakan',
    'console.nReviewers':
      'siapa yang memohon untuk menyemak, siapa yang telah diperiksa, dan apa yang boleh dinilai oleh setiap seorang. Tiada apa yang diterbitkan sehingga seseorang di sini disahkan',
    'console.nScreenings':
      'setiap guru yang dilantik dan sama ada saringan ada dalam simpanan: jenisnya, bila, bila ia luput, siapa yang merekodkannya. Rujukan kepada dokumen disimpan dan tidak dipaparkan lagi, dan rekod tidak boleh disunting — saringan baharu menggantikannya. Selagi platform.safeguarding dihidupkan, kursus yang mungkin dipaparkan kepada kanak-kanak tidak boleh diterbitkan melainkan pengarangnya mempunyai saringan yang lulus dan belum luput serta telah mengakui dasar tatalaku',
    'console.nIjazah':
      'siapa yang memberi ijazah kepada siapa, untuk apa, dan apa yang ditunjukkan kepada anda. Hanya anda yang merekodkannya: rantaian sanad bukan sesuatu yang layak diperiksa oleh platform ini, jadi daftar ini mengatakan “direkodkan”, tidak sekali-kali “disahkan”, dan tiada apa-apa di sini yang kelihatan kepada pelajar',
    'console.nTranslations':
      'pembetulan yang dihantar oleh penutur bahasa, setiap satu dipaparkan bersebelahan baris yang digantikannya dan teks laman yang benar-benar dibina. Hanya anda yang memutuskan: menerima sesuatu baris tidak mengubah laman — blok yang ditampal ke dalam kod yang melakukannya — dan sesuatu bahasa hanya disebut sudah dibaca apabila setiap bahagiannya mempunyai bacaan yang diterbitkan — atau apabila seorang telah menerbitkan bacaan seluruh teks — dengan setiap pembetulan sudah diputuskan',
    'console.nInstitutions':
      'madrasah, sekolah dan organisasi yang mempunyai halaman sendiri: buka yang baharu, periksa rekod DNS di sebalik tuntutan sesuatu domain, dan tukar siapa yang mentadbirnya. Sesebuah institusi melihat bilangan ahlinya sendiri dan tidak sekali-kali nama seorang pelajar, dan ia tidak boleh membeli tempat — pengebilan memerlukan terma dan penyedia yang tiada pada sesiapa',
    'console.nSponsorships':
      'pelajar yang meminta kursus, dan penderma yang membayar sesuatu kursus. Memutuskan memerlukan sebab bertulis dan merekodkan bayaran memerlukan nombor rujukan; tempat tajaan bukan pesanan, jadi tiada cukai dan tiada pendapatan guru padanya',
    'console.nInvitations':
      'siapa menjemput siapa, apa yang diperoleh, dan apa yang dihentikan oleh had tahunan atau sesuatu bayaran balik. Kedua-dua ganjaran ialah diskaun kursus — tiada apa yang dibayar, jadi tiada baki di sini',
    'console.nSupport':
      'permintaan yang dibuka orang dari halaman Bantuan. Mematikan ciri ini menghentikan permintaan baharu; yang sedang berjalan tidak ditutup',
    'console.nUsers':
      'setiap akaun di platform, boleh dicari mengikut nama atau e-mel — akaun, bukan kanak-kanak',
    'console.nControls':
      'angka-angka di sebalik ciri yang sudah dihidupkan. Hanya yang dimiliki peranan anda dipaparkan, dan setiap perubahan memerlukan sebab',
    'console.nReports':
      'masalah yang ditandakan pembaca dalam sesuatu pelajaran atau jawapan. Menutupnya memerlukan catatan bertulis',
    'console.nMedia':
      'setiap fail asal yang dimuat naik oleh sesiapa. Kuarantin dan penarikan balik kedua-duanya memerlukan sebab bertulis',
    'console.nCourseReviews':
      'penilaian pelajar yang disertai kata-kata, ditahan sehingga seseorang membacanya',
    'console.nDiscussion': 'soalan pelajar dan jawapan rakan sebaya yang ditahan untuk semakan',
    'console.nBoards':
      'kiriman di perbincangan pelajar dan perbincangan guru yang dilaporkan seseorang. Kiriman di sana dipaparkan serta-merta, jadi di sinilah ia diturunkan. Melihat siapa di sebalik sesuatu nama pengguna memerlukan sebab dan direkodkan',
    'console.nAssistant':
      'apa yang ditanya kepadanya dan apa yang dilakukan oleh batas yang ditetapkan untuknya: jawapan yang merujuk sesuatu pelajaran, soalan yang dihantar kepada guru, dan frasa yang digunakan untuk menolak',
    'console.nConnections':
      'akaun luar yang digunakan laman ini (pangkalan data, e-mel, penjadual, storan, bayaran) dan yang mana belum disambungkan. Untuk pemilik sahaja; nama tetapan yang belum ada, tidak sekali-kali nilainya',
    'console.nMessages':
      'apa yang akan dihantar oleh platform, dalam bentuk akhirnya dan direkodkan. Tiada apa yang benar-benar dihantar sehingga sesuatu penyedia dikonfigurasikan',
    'console.nPlans': 'terma berversi, kelayakan akses dan harga berulang',
    'console.nPanels':
      'pemilik menubuhkan lembaga dan menetapkan kuorumnya; kakitangan membuka kes terhadap versi yang belum diterbitkan; ahli mengundi dan pengerusi merekodkan keputusan. Kes tidak boleh ditutup di bawah kuorum, dan apabila governance.panel_required dimatikan tiada apa yang menunggunya',
    'console.nTakedowns':
      'sesuatu notis menahan versi yang disebutnya daripada edaran sebaik sahaja dimasukkan — tiada apa yang dipadam, jadi keputusan masih mempunyai buktinya. Guru menjawab di halamannya sendiri, orang selain penerima notis yang memutuskannya, dan tahanan tidak mengubah sebarang wang',
    'console.nIncidents':
      'apa yang berlaku, siapa yang mesti diberitahu dan selewat-lewatnya bila, dan garis masa semasa ia berlaku. Bilangan, tidak sekali-kali senarai nama; setiap tarikh akhir ditaip oleh manusia kerana peraturannya berbeza mengikut pasaran. Tiada apa-apa di sini yang mengesan pelanggaran data dan tiada apa yang menghantar pemberitahuan',
    'console.nPolicies':
      'setiap dokumen dengan versi yang pernah berkuat kuasa dan draf yang sedang menunggu. Menerbitkan memerlukan tarikh dan sebab bertulis, dan ditolak selagi masih ada soalan dalam teks yang hanya anda boleh jawab',
    'console.nCertificates':
      'keluarkan sijil tamat kursus dan rekodkan pembatalan berserta sebabnya',
    'console.nAnalytics':
      'apa yang dilakukan orang, disimpan selama-lamanya, mengikut peristiwa dan mengikut hari. Agregat sahaja',
    'console.nGuardians':
      'orang dewasa yang meminta diiktiraf sebagai ibu atau bapa seorang kanak-kanak',
    'console.nAppeals':
      'guru yang mempertikaikan sesuatu penolakan. Anda tidak boleh memutuskan rayuan terhadap keputusan anda sendiri',
    'console.nRoles': 'siapa boleh melakukan apa. Setiap semakan dalam pangkalan data membaca ini',
  },
  bn: {
    'console.nav': 'প্রশাসন',
    'console.nOrders':
      'একমাত্র সেই অর্ডারগুলো যেগুলোর মোট অঙ্ক এখনো বদলাতে পারে: কোনো অর্ডারে ছাড়, কর, ফি বা রাউন্ডিং নথিভুক্ত করুন, অথবা অর্ডারটি প্রত্যাহার করুন',
    'console.nRefunds': 'যে অর্থ ফেরত যাচ্ছে। অনুমোদন একটি সম্মতি, স্থানান্তর নয়',
    'console.nAdjustments': 'হিসাবের সংশোধন যা কেবল যোগ হয়, বদলানো হয় না, এবং আয় ফিরিয়ে নেওয়া',
    'console.nReconciliation': 'স্বাক্ষরিত বিবরণীর সারি, অভ্যন্তরীণ খতিয়ানের বিপরীতে',
    'console.nDisputes':
      'চার্জব্যাকের একটি সময়সীমা আছে; তা পেরিয়ে গেলে কী হবে তা প্রদানকারী ঠিক করে',
    'console.nTax':
      'ক্রেতার কাছ থেকে দামের ওপরে কী নেওয়া হয়, তিনি যে দেশ থেকে কেনেন সেই অনুযায়ী',
    'console.nRates': 'এক মুদ্রার মূল্য অন্য মুদ্রায় কত ছিল, কখন, এবং কে তা বলেছে',
    'console.nRevenue':
      'একটি সময়কালে কী বিক্রি হয়েছে, মুদ্রা, কোর্স, প্ল্যান ও শিক্ষক অনুযায়ী; অর্থ ফেরত বিক্রির পাশেই দেখানো হয়, কখনো চোখের আড়ালে বাদ দেওয়া হয় না',
    'console.nMoneyReport':
      'একটি সময়কালে কত অর্থ নড়েছে, যে একটি মুদ্রায় প্ল্যাটফর্ম পড়া হয় সেই মুদ্রায়, প্রতিটি অঙ্কের পাশে বিনিময় হারসহ',
    'console.nRenewals':
      'প্রতিটি চালু সাবস্ক্রিপশন, যে দামে বিক্রি হয়েছিল সেই দামে সামনের দিকে বিস্তৃত করে দেখানো। প্রতিশ্রুত অর্থ, পাওয়া অর্থ নয় — এখনো কোনো কিছু নবায়নের অর্থ আদায় করে না',
    'console.nPayouts':
      'শিক্ষকেরা যে পরিশোধ চেয়েছেন, এবং অর্থ ফেরতের সেই আটক যা কোনো বিক্রির অর্থ ফেরত দেওয়া সম্ভব থাকা পর্যন্ত বেরিয়ে যেতে দেয় না',
    'console.nCourses':
      'প্রতিটি কোর্স, সেটি কাদের জন্য খোলা এবং তাতে কতজন শিক্ষার্থী আছে। কোনো কোর্সের শ্রোতা বদলালে তা আপনার নামে নথিভুক্ত হয়, আগের ও পরের দুই অবস্থাসহ',
    'console.nTeachers':
      'যাঁরা পড়াতে চাইছেন, এবং যাঁরা এখানে পড়াতে পারেন তাঁদের সবাই, প্রত্যেকে কী প্রকাশ করেছেন ও তাঁদের কোর্সে কতজন শিক্ষার্থী আছে তা সহ। কোনো আবেদন অনুমোদন করাই নিয়োগ: এতে ভূমিকা দেওয়া হয়, এবং আপনার কারণ আবেদনকারীর নামে নথিভুক্ত হয়',
    'console.nAssign': 'পর্যালোচকের অপেক্ষায় থাকা কোর্স',
    'console.nSubjects':
      'কোর্স তালিকার শব্দভান্ডার: শিক্ষার্থী কী দিয়ে ছাঁকতে পারে, এবং কোর্স কার্ডের ব্যাজ কী বলতে পারে। প্রকাশিত কোনো কোর্স যে বিষয় ব্যবহার করছে তা অবসরে পাঠানো যায় না',
    'console.nReviewers':
      'কে পর্যালোচনার জন্য আবেদন করেছেন, কার যাচাই হয়েছে, এবং প্রত্যেকে কী বিচার করতে পারেন। এখানে কেউ যাচাইকৃত না হওয়া পর্যন্ত কিছুই প্রকাশিত হয় না',
    'console.nScreenings':
      'প্রতিটি নিযুক্ত শিক্ষক এবং তাঁর কোনো যাচাই নথিতে আছে কি না: কী ধরনের, কখন, কখন মেয়াদ শেষ হয়, কে নথিভুক্ত করেছেন। দলিলের সূত্র সংরক্ষিত থাকে এবং আর কখনো দেখানো হয় না, আর নথি সম্পাদনা করা যায় না — নতুন যাচাই তার জায়গা নেয়। platform.safeguarding চালু থাকা অবস্থায়, কোনো শিশুকে দেখানো হতে পারে এমন কোর্স প্রকাশ করা যায় না, যদি না তার লেখকের উত্তীর্ণ ও মেয়াদ থাকা যাচাই থাকে এবং তিনি আচরণ নীতি স্বীকার করে থাকেন',
    'console.nIjazah':
      'কে কাকে ইজাযত দিয়েছেন, কীসের জন্য, এবং আপনাকে কী দেখানো হয়েছে। নথিভুক্ত করা কেবল আপনার কাজ: সনদের ধারা যাচাই করার অবস্থান এই প্ল্যাটফর্মের নেই, তাই তালিকা বলে “নথিভুক্ত”, কখনো “যাচাইকৃত” নয়, এবং এখানকার কিছুই শিক্ষার্থী দেখতে পায় না',
    'console.nTranslations':
      'ভাষাটির ভাষীদের পাঠানো সংশোধন, প্রতিটি দেখানো হয় যে লাইনের জায়গা নেবে তার পাশে এবং সাইটের প্রকৃতপক্ষে তৈরি লেখার পাশে। সিদ্ধান্ত কেবল আপনার: কোনো লাইন গ্রহণ করলে সাইট বদলায় না — কোডে পেস্ট করা ব্লকটি তা করে — এবং কোনো ভাষাকে পড়া হয়েছে বলা হয় কেবল তখন, যখন তার প্রতিটি অংশের প্রকাশিত পাঠ আছে — অথবা একজন ব্যক্তি পুরো লেখার পাঠ প্রকাশ করেছেন — এবং প্রতিটি সংশোধনের সিদ্ধান্ত হয়ে গেছে',
    'console.nInstitutions':
      'নিজস্ব পাতা থাকা মাদ্রাসা, স্কুল ও সংগঠন: নতুন একটি খুলুন, কোনো ডোমেইন দাবির পেছনের DNS রেকর্ড যাচাই করুন, এবং কে এটি পরিচালনা করে তা বদলান। প্রতিষ্ঠান তার নিজের সদস্যদের সংখ্যা দেখে, কখনো কোনো শিক্ষার্থীর নাম নয়, এবং আসন কিনতে পারে না — ইনভয়েসের জন্য এমন শর্ত ও প্রদানকারী দরকার যা কারও নেই',
    'console.nSponsorships':
      'যে শিক্ষার্থীরা কোর্স চাইছে, এবং যে দাতারা কোনো কোর্সের খরচ দিচ্ছেন। সিদ্ধান্তের জন্য লিখিত কারণ দরকার এবং পরিশোধ নথিভুক্ত করতে সূত্র দরকার; পৃষ্ঠপোষকতার আসন কোনো অর্ডার নয়, তাই এতে কর নেই, শিক্ষকের আয়ও নেই',
    'console.nInvitations':
      'কে কাকে আমন্ত্রণ জানিয়েছে, তাতে কী অর্জিত হয়েছে, এবং বার্ষিক সীমা বা কোনো অর্থ ফেরত কী থামিয়েছে। দুটি পুরস্কারই কোর্সে ছাড় — কিছুই পরিশোধ করা হয় না, তাই এখানে কোনো ব্যালান্স নেই',
    'console.nSupport':
      'সহায়তা পাতা থেকে মানুষের খোলা অনুরোধ। ফিচারটি বন্ধ করলে নতুন অনুরোধ থামে; যা চলমান তা বন্ধ হয় না',
    'console.nUsers':
      'প্ল্যাটফর্মের প্রতিটি অ্যাকাউন্ট, নাম বা ইমেইল দিয়ে খোঁজা যায় — অ্যাকাউন্ট, শিশু নয়',
    'console.nControls':
      'যে ফিচারগুলো আগে থেকেই চালু সেগুলোর পেছনের সংখ্যা। কেবল আপনার ভূমিকার অধীনগুলো দেখানো হয়, এবং প্রতিটি পরিবর্তনে কারণ দরকার',
    'console.nReports':
      'কোনো পাঠ বা উত্তরে পাঠকদের চিহ্নিত করা সমস্যা। একটি বন্ধ করতে লিখিত নোট দরকার',
    'console.nMedia':
      'যে কারও আপলোড করা প্রতিটি মূল ফাইল। কোয়ারেন্টিন ও প্রত্যাহার দুটিতেই লিখিত কারণ দরকার',
    'console.nCourseReviews': 'শিক্ষার্থীদের যে রেটিংয়ে লেখাও আছে, কেউ না পড়া পর্যন্ত আটকে রাখা',
    'console.nDiscussion': 'শিক্ষার্থীদের প্রশ্ন ও সহপাঠীদের উত্তর, পর্যালোচনার জন্য আটকে রাখা',
    'console.nBoards':
      'শিক্ষার্থীদের আলোচনা ও শিক্ষকদের আলোচনার যে পোস্টগুলো কেউ রিপোর্ট করেছে। সেখানে পোস্ট সঙ্গে সঙ্গে দেখানো হয়, তাই এখান থেকেই তা সরানো হয়। কোনো ব্যবহারকারী নামের পেছনে কে আছে তা দেখতে কারণ দরকার এবং তা নথিভুক্ত হয়',
    'console.nAssistant':
      'তাকে কী জিজ্ঞাসা করা হয়েছে এবং তার জন্য ঠিক করা সীমা কী করেছে: যে উত্তরগুলো কোনো পাঠের উদ্ধৃতি দিয়েছে, যে প্রশ্নগুলো শিক্ষকের কাছে পাঠানো হয়েছে, এবং যে বাক্যাংশ দিয়ে প্রত্যাখ্যান করা হয়',
    'console.nConnections':
      'এই সাইট যে বাইরের অ্যাকাউন্টগুলো ব্যবহার করে (ডেটাবেস, ইমেইল, শিডিউলার, স্টোরেজ, পরিশোধ) এবং কোনগুলো এখনো সংযুক্ত হয়নি। কেবল মালিকের জন্য; অনুপস্থিত সেটিংসের নাম, কখনো কোনো মান নয়',
    'console.nMessages':
      'প্ল্যাটফর্ম যা পাঠাত, চূড়ান্ত রূপে ও নথিভুক্ত। কোনো প্রদানকারী কনফিগার না হওয়া পর্যন্ত বাস্তবে কিছুই পাঠানো হয় না',
    'console.nPlans': 'সংস্করণযুক্ত শর্ত, প্রাপ্য সুবিধা ও পুনরাবৃত্ত মূল্য',
    'console.nPanels':
      'মালিক একটি বোর্ড গঠন করেন ও তার কোরাম ঠিক করেন; কর্মীরা অপ্রকাশিত কোনো সংস্করণের বিরুদ্ধে মামলা খোলেন; সদস্যরা ভোট দেন এবং সভাপতি সিদ্ধান্ত নথিভুক্ত করেন। কোরামের নিচে কোনো মামলা বন্ধ হতে পারে না, এবং governance.panel_required বন্ধ থাকলে কিছুই এর অপেক্ষায় থাকে না',
    'console.nTakedowns':
      'কোনো নোটিশ প্রবেশ করানোর মুহূর্তেই সেটি যে সংস্করণের নাম করে তাকে বিতরণের বাইরে আটকে রাখে — কিছুই মুছে ফেলা হয় না, তাই সিদ্ধান্তের কাছে তার প্রমাণ থাকে। শিক্ষক নিজের পাতায় জবাব দেন, নোটিশ যিনি গ্রহণ করেছেন তিনি ছাড়া অন্য কেউ সিদ্ধান্ত নেন, এবং আটকে রাখা কোনো অর্থ বদলায় না',
    'console.nIncidents':
      'কী ঘটেছে, কাকে জানাতে হবে ও কখনের মধ্যে, এবং ঘটনা চলাকালীন সময়রেখা। সংখ্যা, কখনো নামের তালিকা নয়; প্রতিটি সময়সীমা একজন মানুষ লেখেন কারণ নিয়ম বাজারভেদে আলাদা। এখানকার কিছুই কোনো লঙ্ঘন শনাক্ত করে না এবং কিছুই বিজ্ঞপ্তি পাঠায় না',
    'console.nPolicies':
      'প্রতিটি দলিল, যে সংস্করণগুলো কার্যকর ছিল এবং এখন অপেক্ষমাণ খসড়াসহ। প্রকাশের জন্য তারিখ ও লিখিত কারণ দরকার, এবং লেখায় এমন কোনো প্রশ্ন চিহ্নিত থাকলে যা কেবল আপনি উত্তর দিতে পারেন, তা প্রত্যাখ্যাত হয়',
    'console.nCertificates': 'সমাপ্তির সনদ ইস্যু করুন এবং বাতিলকরণ কারণসহ নথিভুক্ত করুন',
    'console.nAnalytics': 'মানুষ কী করে, চিরকালের জন্য রাখা, ঘটনা ও দিন অনুযায়ী। কেবল সমষ্টি',
    'console.nGuardians': 'প্রাপ্তবয়স্করা, যাঁরা একটি শিশুর অভিভাবক হিসেবে স্বীকৃতি চাইছেন',
    'console.nAppeals':
      'যে শিক্ষকেরা কোনো প্রত্যাখ্যানের বিরুদ্ধে আপত্তি তুলছেন। নিজের সিদ্ধান্তের বিরুদ্ধে আপিলের সিদ্ধান্ত আপনি দিতে পারেন না',
    'console.nRoles': 'কে কী করতে পারে। ডেটাবেসের প্রতিটি যাচাই এগুলো পড়ে',
  },
  hi: {
    'console.nav': 'प्रशासन',
    'console.nOrders':
      'केवल वे ऑर्डर जिनका कुल अब भी बदल सकता है: किसी ऑर्डर पर छूट, कर, शुल्क या राउंडिंग दर्ज करें, या ऑर्डर वापस लें',
    'console.nRefunds': 'वह पैसा जो वापस जा रहा है। स्वीकृति एक सहमति है, अंतरण नहीं',
    'console.nAdjustments':
      'लेखा के वे सुधार जो केवल जोड़े जाते हैं, बदले नहीं जाते, और आय की वापसी',
    'console.nReconciliation': 'हस्ताक्षरित विवरण की पंक्तियाँ, आंतरिक बही के सामने',
    'console.nDisputes':
      'चार्जबैक की एक समय-सीमा होती है; वह बीत जाए तो क्या होगा, यह प्रदाता तय करता है',
    'console.nTax':
      'ख़रीदार से मूल्य के ऊपर क्या लिया जाता है, उस देश के अनुसार जहाँ से वह ख़रीदता है',
    'console.nRates': 'एक मुद्रा दूसरी मुद्रा में कितने की थी, कब, और किसने बताया',
    'console.nRevenue':
      'किसी अवधि में क्या बिका, मुद्रा, पाठ्यक्रम, योजना और शिक्षक के अनुसार; रिफ़ंड बिक्री के साथ दिखते हैं और कभी नज़र से हटाकर घटाए नहीं जाते',
    'console.nMoneyReport':
      'किसी अवधि में कितना पैसा चला, उस एक मुद्रा में जिसमें मंच पढ़ा जाता है, हर अंक के साथ दर',
    'console.nRenewals':
      'हर चालू सदस्यता, जिस मूल्य पर बिकी थी उसी पर आगे तक फैलाकर दिखाई गई। यह वचनबद्ध राशि है, प्राप्त राशि नहीं — अभी कुछ भी नवीकरण का शुल्क नहीं लेता',
    'console.nPayouts':
      'शिक्षकों ने जो भुगतान माँगा है, और रिफ़ंड की वह रोक जो किसी बिक्री का पैसा तब तक बाहर नहीं जाने देती जब तक उसे लौटाया जा सकता है',
    'console.nCourses':
      'हर पाठ्यक्रम, वह किनके लिए खुला है और उसमें कितने शिक्षार्थी हैं। किसी पाठ्यक्रम के पाठक-वर्ग को बदलना आपके नाम के साथ दर्ज होता है, बदलाव के दोनों पक्षों सहित',
    'console.nTeachers':
      'वे लोग जो पढ़ाने का अनुरोध कर रहे हैं, और हर वह व्यक्ति जो यहाँ पढ़ा सकता है, साथ में यह कि उसने क्या प्रकाशित किया और उसके पाठ्यक्रमों में कितने शिक्षार्थी हैं। आवेदन स्वीकार करना ही नियुक्ति है: इससे भूमिका मिलती है, और आपका कारण आवेदक के नाम दर्ज होता है',
    'console.nAssign': 'समीक्षक की प्रतीक्षा में पाठ्यक्रम',
    'console.nSubjects':
      'कैटलॉग की शब्दावली: शिक्षार्थी किससे छाँट सकता है, और पाठ्यक्रम के कार्ड पर बैज क्या कह सकता है। जिस विषय को कोई प्रकाशित पाठ्यक्रम काम में ले रहा हो उसे हटाया नहीं जा सकता',
    'console.nReviewers':
      'किसने समीक्षा के लिए आवेदन किया, किसकी जाँच हो चुकी, और हर एक क्या परख सकता है। जब तक यहाँ कोई सत्यापित न हो, कुछ भी प्रकाशित नहीं होता',
    'console.nScreenings':
      'हर नियुक्त शिक्षक और यह कि उसकी जाँच अभिलेख में है या नहीं: किस प्रकार की, कब, कब समाप्त होती है, किसने दर्ज की। दस्तावेज़ का संदर्भ सुरक्षित रहता है और दोबारा कभी नहीं दिखाया जाता, और अभिलेख संपादित नहीं हो सकता — नई जाँच उसकी जगह लेती है। जब तक platform.safeguarding चालू है, वह पाठ्यक्रम जो किसी बच्चे को दिखाया जा सकता है प्रकाशित नहीं हो सकता जब तक उसके लेखक के पास उत्तीर्ण और असमाप्त जाँच न हो और उसने आचरण नीति स्वीकार न की हो',
    'console.nIjazah':
      'किसने किसे इजाज़त दी, किस चीज़ की, और आपको क्या दिखाया गया। दर्ज करना केवल आपका काम है: सनद की शृंखला जाँचना इस मंच के अधिकार की बात नहीं, इसलिए पंजी “दर्ज” कहती है, “सत्यापित” कभी नहीं, और यहाँ का कुछ भी शिक्षार्थी को नहीं दिखता',
    'console.nTranslations':
      'भाषा बोलने वालों के भेजे सुधार, हर एक उस पंक्ति के सामने जिसकी जगह वह लेता है और साइट के उस पाठ के सामने जो वास्तव में बना हुआ है। निर्णय केवल आपका है: किसी पंक्ति को स्वीकार करने से साइट नहीं बदलती — वह कोड में चिपकाए जाने वाले खंड से बदलती है — और किसी भाषा को पढ़ी हुई तभी कहा जाता है जब उसके हर भाग का प्रकाशित पठन हो — या किसी एक व्यक्ति ने पूरे पाठ का पठन प्रकाशित किया हो — और हर सुधार पर निर्णय हो चुका हो',
    'console.nInstitutions':
      'मदरसे, विद्यालय और संगठन जिनका अपना पृष्ठ है: नया खोलें, किसी डोमेन दावे के पीछे का DNS रिकॉर्ड जाँचें, और बदलें कि उसे कौन चलाता है। संस्था अपने सदस्यों की गिनती देखती है, किसी शिक्षार्थी का नाम कभी नहीं, और वह सीटें नहीं ख़रीद सकती — बिल बनाने के लिए शर्तें और एक प्रदाता चाहिए जो किसी के पास नहीं',
    'console.nSponsorships':
      'शिक्षार्थी जो पाठ्यक्रम माँग रहे हैं, और दाता जो किसी पाठ्यक्रम का मूल्य चुका रहे हैं। निर्णय के लिए लिखित कारण चाहिए और भुगतान दर्ज करने के लिए संदर्भ; प्रायोजित सीट ऑर्डर नहीं है, इसलिए उस पर न कर है न शिक्षक की आय',
    'console.nInvitations':
      'किसने किसे आमंत्रित किया, उससे क्या मिला, और वार्षिक सीमा या किसी रिफ़ंड ने क्या रोका। दोनों पुरस्कार पाठ्यक्रम पर छूट हैं — कुछ भी चुकाया नहीं जाता, इसलिए यहाँ कोई शेष राशि नहीं',
    'console.nSupport':
      'वे अनुरोध जो लोगों ने सहायता पृष्ठ से खोले। सुविधा बंद करने से नए अनुरोध रुकते हैं; जो चल रहे हैं वे बंद नहीं होते',
    'console.nUsers': 'मंच का हर खाता, नाम या ईमेल से खोजने योग्य — खाते, बच्चे नहीं',
    'console.nControls':
      'उन सुविधाओं के पीछे की संख्याएँ जो पहले से चालू हैं। केवल वही दिखाई जाती हैं जो आपकी भूमिका की हैं, और हर बदलाव के लिए कारण चाहिए',
    'console.nReports':
      'वे समस्याएँ जिनकी ओर पाठकों ने किसी पाठ या उत्तर में ध्यान दिलाया। किसी को बंद करने के लिए लिखित टिप्पणी चाहिए',
    'console.nMedia':
      'हर मूल फ़ाइल जो किसी ने भी अपलोड की। क्वारंटीन और वापसी दोनों के लिए लिखित कारण चाहिए',
    'console.nCourseReviews':
      'शिक्षार्थियों की वे रेटिंग जिनमें शब्द भी हैं, तब तक रोकी हुई जब तक कोई उन्हें पढ़ न ले',
    'console.nDiscussion':
      'शिक्षार्थियों के प्रश्न और सहपाठियों के उत्तर जो समीक्षा के लिए रोके गए हैं',
    'console.nBoards':
      'विद्यार्थियों की चर्चा और शिक्षकों की चर्चा की वे पोस्ट जिनकी किसी ने रिपोर्ट की। वहाँ पोस्ट तुरंत दिखती है, इसलिए उसे यहीं से हटाया जाता है। यह देखने के लिए कि किसी उपयोगकर्ता नाम के पीछे कौन है कारण चाहिए और यह दर्ज होता है',
    'console.nAssistant':
      'उससे क्या पूछा गया और उसके लिए तय सीमाओं ने क्या किया: वे उत्तर जिन्होंने किसी पाठ का हवाला दिया, वे प्रश्न जो शिक्षक को भेजे गए, और वे वाक्यांश जिनसे मना किया जाता है',
    'console.nConnections':
      'वे बाहरी खाते जिन्हें यह साइट काम में लेती है (डेटाबेस, ईमेल, शेड्यूलर, भंडारण, भुगतान) और कौन-से अभी जोड़ने बाकी हैं। केवल स्वामी के लिए; अनुपस्थित सेटिंग के नाम, मान कभी नहीं',
    'console.nMessages':
      'मंच जो कुछ भेजता, अंतिम रूप में और दर्ज किया हुआ। जब तक कोई प्रदाता कॉन्फ़िगर न हो, वास्तव में कुछ नहीं भेजा जाता',
    'console.nPlans': 'संस्करण वाली शर्तें, अधिकार और आवर्ती मूल्य',
    'console.nPanels':
      'स्वामी बोर्ड गठित करता है और उसका कोरम तय करता है; कर्मचारी किसी अप्रकाशित संस्करण पर मामला खोलते हैं; सदस्य मत देते हैं और अध्यक्ष निर्णय दर्ज करता है। कोरम से कम पर मामला बंद नहीं हो सकता, और governance.panel_required बंद हो तो कुछ भी उसकी प्रतीक्षा नहीं करता',
    'console.nTakedowns':
      'कोई नोटिस दर्ज होते ही उस संस्करण को वितरण से रोक देता है जिसका वह नाम लेता है — कुछ भी मिटाया नहीं जाता, इसलिए निर्णय के पास उसका प्रमाण रहता है। शिक्षक अपने पृष्ठ पर उत्तर देता है, निर्णय वह व्यक्ति करता है जिसने नोटिस नहीं लिया था, और रोक से पैसे में कुछ नहीं बदलता',
    'console.nIncidents':
      'क्या हुआ, किसे बताना है और कब तक, और घटनाक्रम जैसे-जैसे वह चलता है। गिनतियाँ, नामों की सूची कभी नहीं; हर समय-सीमा एक व्यक्ति लिखता है क्योंकि नियम हर बाज़ार में अलग है। यहाँ कुछ भी उल्लंघन का पता नहीं लगाता और कुछ भी सूचना नहीं भेजता',
    'console.nPolicies':
      'हर दस्तावेज़, उन संस्करणों के साथ जो लागू रहे और वह मसौदा जो अभी प्रतीक्षा में है। प्रकाशन के लिए तारीख़ और लिखित कारण चाहिए, और वह तब तक अस्वीकार होता है जब तक पाठ में ऐसा कोई प्रश्न चिह्नित है जिसका उत्तर केवल आप दे सकते हैं',
    'console.nCertificates': 'पूर्णता के प्रमाणपत्र जारी करें और निरस्तीकरण कारण सहित दर्ज करें',
    'console.nAnalytics': 'लोग क्या करते हैं, सदा के लिए सुरक्षित, घटना और दिन के अनुसार। केवल योग',
    'console.nGuardians': 'वयस्क जो किसी बच्चे के माता-पिता के रूप में मान्यता माँग रहे हैं',
    'console.nAppeals':
      'शिक्षक जो किसी अस्वीकृति को चुनौती दे रहे हैं। आप अपने ही निर्णय के विरुद्ध अपील का निर्णय नहीं कर सकते',
    'console.nRoles': 'कौन क्या कर सकता है। डेटाबेस की हर जाँच इन्हीं को पढ़ती है',
  },
  fr: {
    'console.nav': 'Administration',
    'console.nOrders':
      'les seules commandes dont le total peut encore changer : enregistrez-y une remise, une taxe, des frais ou un arrondi, ou retirez la commande',
    'console.nRefunds': 'de l’argent qui repart. Approuver est un accord, pas un virement',
    'console.nAdjustments':
      'des corrections comptables qui s’ajoutent sans rien modifier, et des reprises de gains',
    'console.nReconciliation': 'les lignes de relevés signés face au grand livre interne',
    'console.nDisputes':
      'une rétrofacturation a une échéance ; si elle passe, c’est le prestataire qui décide de la suite',
    'console.nTax': 'ce qui est facturé à l’acheteur en plus du prix, selon le pays d’où il achète',
    'console.nRates': 'ce que valait une monnaie dans une autre, quand, et selon qui',
    'console.nRevenue':
      'ce qui s’est vendu sur une période par monnaie, cours, formule et enseignant, les remboursements à côté de la vente et jamais déduits hors de vue',
    'console.nMoneyReport':
      'ce qui a bougé sur une période, dans la seule monnaie où la plateforme se lit, avec le taux à côté de chaque chiffre',
    'console.nRenewals':
      'chaque abonnement en cours, projeté dans l’avenir au prix auquel il a été vendu. Engagé, pas encaissé — rien ne prélève encore un renouvellement',
    'console.nPayouts':
      'ce que les enseignants ont demandé à se faire verser, et la retenue pour remboursement qui empêche l’argent d’une vente de partir tant qu’elle peut être annulée',
    'console.nCourses':
      'chaque cours, à qui il est ouvert et combien d’apprenants il compte. Changer le public d’un cours est enregistré à votre nom, avec l’avant et l’après',
    'console.nTeachers':
      'les personnes qui demandent à enseigner, et toutes celles qui peuvent enseigner ici, avec ce que chacune a publié et le nombre d’apprenants de ses cours. Approuver une candidature, c’est nommer : cela donne le rôle, et votre motif est consigné en face du candidat',
    'console.nAssign': 'les cours qui attendent un relecteur',
    'console.nSubjects':
      'le vocabulaire du catalogue : ce par quoi un apprenant peut filtrer, et ce qu’un badge peut dire sur la carte d’un cours. Une matière utilisée par un cours en ligne ne peut pas être retirée',
    'console.nReviewers':
      'qui a demandé à relire, qui a été vérifié, et ce que chacun peut juger. Rien n’est publié tant que personne ici n’est vérifié',
    'console.nScreenings':
      'chaque enseignant nommé et s’il existe une vérification au dossier : de quel type, quand, quand elle expire, qui l’a enregistrée. La référence du document est conservée et n’est plus jamais affichée, et un enregistrement ne peut pas être modifié — une nouvelle vérification le remplace. Tant que platform.safeguarding est activé, un cours qui peut être montré à un enfant ne peut pas être publié si son auteur n’a pas une vérification réussie et non expirée et n’a pas pris acte de la politique de conduite',
    'console.nIjazah':
      'qui a autorisé qui, pour quoi, et ce qu’on vous a montré. À vous seul de l’enregistrer : une chaîne de transmission n’est pas une chose que cette plateforme a qualité pour vérifier, le registre dit donc « enregistrée », jamais « vérifiée », et rien ici n’est visible d’un apprenant',
    'console.nTranslations':
      'des corrections envoyées par des personnes qui parlent la langue, chacune montrée face à la ligne qu’elle remplace et face aux textes du site tels qu’ils sont réellement construits. À vous seul de décider : accepter une ligne ne change pas le site — c’est le bloc à coller dans le code qui le fait — et une langue n’est dite relue que lorsque chacune de ses parties a une lecture publiée — ou qu’une seule personne a publié une lecture de tous les textes — et que chaque correction a été tranchée',
    'console.nInstitutions':
      'des madrasas, des écoles et des organisations qui ont leur propre page : ouvrez-en une, vérifiez l’enregistrement DNS derrière la revendication d’un domaine, et changez qui l’administre. Un établissement voit le nombre de ses membres et jamais le nom d’un apprenant, et il ne peut pas acheter de places — la facturation exige des conditions et un prestataire que personne n’a',
    'console.nSponsorships':
      'des apprenants qui demandent un cours, et des donateurs qui en paient un. Décider exige un motif écrit et enregistrer un paiement exige une référence ; une place parrainée n’est pas une commande, elle ne porte donc ni taxe ni gain pour l’enseignant',
    'console.nInvitations':
      'qui a invité qui, ce que cela a rapporté et ce que le plafond annuel ou un remboursement a arrêté. Les deux récompenses sont des remises sur un cours — rien n’est versé, il n’y a donc pas de solde ici',
    'console.nSupport':
      'les demandes que des personnes ont ouvertes depuis l’Aide. Désactiver la fonction arrête les nouvelles ; cela ne clôt pas celles qui sont en cours',
    'console.nUsers':
      'chaque compte de la plateforme, à chercher par nom ou par e-mail — des comptes, pas des enfants',
    'console.nControls':
      'les chiffres derrière les fonctions déjà activées. Seuls ceux qui relèvent de votre rôle sont affichés, et chaque changement exige un motif',
    'console.nReports':
      'des problèmes que des lecteurs ont signalés dans une leçon ou une réponse. Clore un signalement exige une note écrite',
    'console.nMedia':
      'chaque fichier d’origine envoyé par qui que ce soit. La quarantaine comme le retrait exigent un motif écrit',
    'console.nCourseReviews':
      'des notes d’apprenants accompagnées de mots, retenues jusqu’à ce que quelqu’un les lise',
    'console.nDiscussion':
      'des questions d’apprenants et des réponses de pairs retenues pour relecture',
    'console.nBoards':
      'des messages de la discussion des élèves et de la discussion des enseignants que quelqu’un a signalés. Un message y est affiché tout de suite, c’est donc ici qu’on le retire. Voir qui se trouve derrière un nom d’utilisateur exige un motif et est enregistré',
    'console.nAssistant':
      'ce qu’on lui a demandé et ce que les limites qu’on lui a fixées ont fait : les réponses qui citaient une leçon, les questions envoyées à un enseignant, et les formules qui servent à refuser',
    'console.nConnections':
      'les comptes extérieurs dont ce site se sert (base de données, e-mail, planificateur, stockage, paiements) et ceux qui restent à connecter. Pour le propriétaire seulement ; les noms des réglages manquants, jamais une valeur',
    'console.nMessages':
      'ce que la plateforme enverrait, mis en forme et enregistré. Rien ne part réellement tant qu’un prestataire n’est pas configuré',
    'console.nPlans': 'des conditions versionnées, des droits d’accès et des prix récurrents',
    'console.nPanels':
      'le propriétaire réunit un conseil et fixe son quorum ; l’équipe ouvre un dossier sur une version non publiée ; les membres votent et la présidence enregistre la décision. Un dossier ne peut pas être clos sous le quorum, et quand governance.panel_required est désactivé rien ne l’attend',
    'console.nTakedowns':
      'un avis retient hors de la distribution la version qu’il désigne dès qu’il est saisi — rien n’est supprimé, la décision garde donc ses preuves. L’enseignant répond sur sa propre page, quelqu’un d’autre que la personne qui a reçu l’avis en décide, et une retenue ne change rien à l’argent',
    'console.nIncidents':
      'ce qui s’est passé, qui doit être prévenu et pour quand, et la chronologie au fil des faits. Des nombres, jamais une liste de noms ; chaque échéance est saisie par une personne parce que la règle diffère selon le marché. Rien ici ne détecte une violation de données et rien n’envoie de notification',
    'console.nPolicies':
      'chaque document avec les versions qui ont été en vigueur et le brouillon qui attend. Publier exige une date et un motif écrit, et c’est refusé tant qu’une question à laquelle vous seul pouvez répondre est encore marquée dans le texte',
    'console.nCertificates':
      'délivrez des certificats d’achèvement et enregistrez les révocations avec un motif',
    'console.nAnalytics':
      'ce que font les gens, conservé pour toujours, par événement et par jour. Des agrégats seulement',
    'console.nGuardians': 'des adultes qui demandent à être reconnus comme parent d’un enfant',
    'console.nAppeals':
      'des enseignants qui contestent un refus. Vous ne pouvez pas trancher un recours contre votre propre décision',
    'console.nRoles': 'qui peut faire quoi. Chaque contrôle de la base de données lit ceci',
  },
  es: {
    'console.nav': 'Administración',
    'console.nOrders':
      'los únicos pedidos cuyo total aún puede cambiar: registre en uno un descuento, impuesto, comisión o redondeo, o retire el pedido',
    'console.nRefunds': 'dinero que vuelve a salir. Aprobar es un acuerdo, no una transferencia',
    'console.nAdjustments':
      'correcciones contables que solo se añaden, sin modificar nada, y recuperaciones de ganancias',
    'console.nReconciliation': 'filas de extractos firmados frente al libro mayor interno',
    'console.nDisputes':
      'una devolución de cargo tiene un plazo; si vence, el proveedor decide lo que ocurre',
    'console.nTax':
      'lo que se cobra al comprador además del precio, según el país desde el que compra',
    'console.nRates': 'cuánto valía una moneda en otra, cuándo y quién lo dijo',
    'console.nRevenue':
      'lo que se vendió en un periodo por moneda, curso, plan y docente, con los reembolsos junto a la venta y nunca restados fuera de la vista',
    'console.nMoneyReport':
      'lo que se movió en un periodo, en la única moneda en que se lee la plataforma, con el tipo de cambio junto a cada cifra',
    'console.nRenewals':
      'cada suscripción activa proyectada hacia delante al precio al que se vendió. Comprometido, no ingresado — nada cobra todavía una renovación',
    'console.nPayouts':
      'lo que los docentes han pedido que se les pague, y la retención por reembolso que impide que el dinero de una venta salga mientras aún puede revertirse',
    'console.nCourses':
      'cada curso, para quién está abierto y cuántos alumnos tiene. Cambiar el público de un curso queda registrado a su nombre, con el antes y el después',
    'console.nTeachers':
      'las personas que piden enseñar, y todas las que pueden enseñar aquí con lo que cada una ha publicado y cuántos alumnos tienen sus cursos. Aprobar una solicitud es el nombramiento: concede el rol, y su motivo queda registrado junto al solicitante',
    'console.nAssign': 'cursos que esperan un revisor',
    'console.nSubjects':
      'el vocabulario del catálogo: por qué puede filtrar un alumno y qué puede decir una insignia en la tarjeta de un curso. Una materia que usa un curso publicado no puede retirarse',
    'console.nReviewers':
      'quién solicitó revisar, quién ha sido comprobado y qué puede juzgar cada uno. Nada se publica hasta que alguien aquí esté verificado',
    'console.nScreenings':
      'cada docente nombrado y si hay una comprobación archivada: de qué tipo, cuándo, cuándo caduca, quién la registró. La referencia al documento se guarda y no vuelve a mostrarse, y un registro no puede editarse — una comprobación nueva lo sustituye. Mientras platform.safeguarding esté activado, un curso que pueda mostrarse a un menor no puede publicarse a menos que su autor tenga una comprobación superada y no caducada y haya aceptado la política de conducta',
    'console.nIjazah':
      'quién autorizó a quién, para qué y qué se le mostró a usted. Solo usted lo registra: una cadena de transmisión no es algo que esta plataforma tenga autoridad para comprobar, así que el registro dice «registrada», nunca «verificada», y nada de esto es visible para un alumno',
    'console.nTranslations':
      'correcciones enviadas por personas que hablan el idioma, cada una mostrada frente a la línea que sustituye y frente a los textos del sitio tal como están realmente construidos. Solo usted decide: aceptar una línea no cambia el sitio — eso lo hace el bloque que se pega en el código — y de un idioma solo se dice que está leído cuando cada una de sus partes tiene una lectura publicada — o cuando una sola persona ha publicado una lectura de todos los textos — con todas las correcciones decididas',
    'console.nInstitutions':
      'madrasas, escuelas y organizaciones con página propia: abra una, compruebe el registro DNS que respalda la reclamación de un dominio y cambie quién la administra. Una institución ve el recuento de sus propios miembros y nunca el nombre de un alumno, y no puede comprar plazas — la facturación necesita condiciones y un proveedor que nadie tiene',
    'console.nSponsorships':
      'alumnos que piden un curso y donantes que pagan uno. Decidir necesita un motivo escrito y registrar un pago necesita una referencia; una plaza patrocinada no es un pedido, así que no lleva impuesto ni ganancia para el docente',
    'console.nInvitations':
      'quién invitó a quién, qué se ganó y qué detuvo el tope anual o un reembolso. Las dos recompensas son descuentos en un curso — no se paga nada, así que aquí no hay saldo',
    'console.nSupport':
      'solicitudes que la gente abrió desde Ayuda. Desactivar la función detiene las nuevas; no cierra las que están en curso',
    'console.nUsers':
      'todas las cuentas de la plataforma, con búsqueda por nombre o correo electrónico — cuentas, no menores',
    'console.nControls':
      'los números que hay detrás de las funciones ya activadas. Solo se muestran los que pertenecen a su rol, y cada cambio necesita un motivo',
    'console.nReports':
      'problemas que los lectores marcaron en una lección o una respuesta. Cerrar uno necesita una nota escrita',
    'console.nMedia':
      'cada archivo original que alguien ha subido. Tanto la cuarentena como la retirada necesitan un motivo escrito',
    'console.nCourseReviews':
      'puntuaciones de alumnos que incluyen palabras, retenidas hasta que alguien las lea',
    'console.nDiscussion':
      'preguntas de alumnos y respuestas de compañeros retenidas para revisión',
    'console.nBoards':
      'mensajes del debate de estudiantes y del debate de docentes que alguien denunció. Allí un mensaje se muestra al instante, así que es aquí donde se retira. Ver quién está detrás de un nombre de usuario necesita un motivo y queda registrado',
    'console.nAssistant':
      'qué se le preguntó y qué hicieron los límites que tiene fijados: respuestas que citaron una lección, preguntas enviadas a un docente y las frases con las que se niega',
    'console.nConnections':
      'las cuentas externas que usa este sitio (base de datos, correo electrónico, planificador, almacenamiento, pagos) y cuáles faltan por conectar. Solo para el propietario; nombres de los ajustes que faltan, nunca un valor',
    'console.nMessages':
      'lo que la plataforma enviaría, con su forma final y registrado. Nada sale de verdad hasta que se configure un proveedor',
    'console.nPlans': 'condiciones con versiones, derechos de acceso y precios recurrentes',
    'console.nPanels':
      'el propietario convoca un consejo y fija su cuórum; el personal abre un caso sobre una versión no publicada; los miembros votan y la presidencia registra la decisión. Un caso no puede cerrarse por debajo del cuórum, y con governance.panel_required desactivado nada lo espera',
    'console.nTakedowns':
      'un aviso retiene fuera de la distribución la versión que nombra en el momento en que se introduce — no se borra nada, así que la decisión conserva sus pruebas. El docente responde en su propia página, decide alguien distinto de quien recibió el aviso, y una retención no cambia ningún dinero',
    'console.nIncidents':
      'qué ocurrió, a quién hay que avisar y para cuándo, y la cronología a medida que sucede. Recuentos, nunca una lista de nombres; cada plazo lo escribe una persona porque la norma cambia según el mercado. Nada aquí detecta una brecha de datos y nada envía una notificación',
    'console.nPolicies':
      'cada documento con las versiones que han estado en vigor y el borrador que espera ahora. Publicar necesita una fecha y un motivo escrito, y se rechaza mientras siga marcada en el texto una pregunta que solo usted puede responder',
    'console.nCertificates':
      'emita certificados de finalización y registre las revocaciones con un motivo',
    'console.nAnalytics':
      'lo que hace la gente, conservado para siempre, por evento y por día. Solo agregados',
    'console.nGuardians': 'adultos que piden ser reconocidos como progenitores de un menor',
    'console.nAppeals':
      'docentes que impugnan un rechazo. Usted no puede resolver un recurso contra su propia decisión',
    'console.nRoles': 'quién puede hacer qué. Cada comprobación de la base de datos lee esto',
  },
  pt: {
    'console.nav': 'Administração',
    'console.nOrders':
      'as únicas encomendas cujo total ainda pode mudar: registe numa um desconto, imposto, taxa ou arredondamento, ou retire a encomenda',
    'console.nRefunds': 'dinheiro que volta a sair. Aprovar é um acordo, não uma transferência',
    'console.nAdjustments':
      'correções contabilísticas que só se acrescentam, sem alterar nada, e recuperações de ganhos',
    'console.nReconciliation': 'linhas de extratos assinados face ao livro-razão interno',
    'console.nDisputes':
      'um estorno tem um prazo; se passar, é o fornecedor que decide o que acontece',
    'console.nTax': 'o que é cobrado ao comprador além do preço, conforme o país de onde compra',
    'console.nRates': 'quanto valia uma moeda noutra, quando, e quem o disse',
    'console.nRevenue':
      'o que se vendeu num período por moeda, curso, plano e professor, com os reembolsos ao lado da venda e nunca descontados fora da vista',
    'console.nMoneyReport':
      'o que se movimentou num período, na única moeda em que a plataforma é lida, com a taxa ao lado de cada valor',
    'console.nRenewals':
      'cada subscrição ativa projetada para a frente ao preço a que foi vendida. Comprometido, não recebido — nada cobra ainda uma renovação',
    'console.nPayouts':
      'o que os professores pediram que lhes fosse pago, e a retenção para reembolso que impede o dinheiro de uma venda de sair enquanto ainda pode ser revertida',
    'console.nCourses':
      'cada curso, para quem está aberto e quantos alunos tem. Mudar o público de um curso fica registado em seu nome, com o antes e o depois',
    'console.nTeachers':
      'as pessoas que pedem para ensinar, e todas as que podem ensinar aqui com o que cada uma publicou e quantos alunos têm os seus cursos. Aprovar uma candidatura é a nomeação: concede a função, e o seu motivo fica registado junto do candidato',
    'console.nAssign': 'cursos à espera de um revisor',
    'console.nSubjects':
      'o vocabulário do catálogo: aquilo por que um aluno pode filtrar, e o que um distintivo pode dizer no cartão de um curso. Uma matéria usada por um curso publicado não pode ser retirada',
    'console.nReviewers':
      'quem se candidatou a rever, quem foi verificado, e o que cada um pode julgar. Nada é publicado até alguém aqui estar verificado',
    'console.nScreenings':
      'cada professor nomeado e se há uma verificação em arquivo: de que tipo, quando, quando caduca, quem a registou. A referência ao documento é guardada e nunca mais é mostrada, e um registo não pode ser editado — uma nova verificação substitui-o. Enquanto platform.safeguarding estiver ligado, um curso que possa ser mostrado a uma criança não pode ser publicado a menos que o seu autor tenha uma verificação aprovada e não caducada e tenha tomado conhecimento da política de conduta',
    'console.nIjazah':
      'quem autorizou quem, para quê, e o que lhe foi mostrado. Só a si cabe registar: uma cadeia de transmissão não é algo que esta plataforma tenha autoridade para verificar, por isso o registo diz «registada», nunca «verificada», e nada aqui é visível para um aluno',
    'console.nTranslations':
      'correções enviadas por pessoas que falam a língua, cada uma mostrada face à linha que substitui e face aos textos do site tal como estão realmente construídos. Só a si cabe decidir: aceitar uma linha não muda o site — é o bloco que se cola no código que o faz — e uma língua só é dada como lida quando cada uma das suas partes tem uma leitura publicada — ou quando uma só pessoa publicou uma leitura de todos os textos — com todas as correções decididas',
    'console.nInstitutions':
      'madraças, escolas e organizações com página própria: abra uma, verifique o registo DNS por trás da reivindicação de um domínio, e mude quem a administra. Uma instituição vê as contagens dos seus próprios membros e nunca o nome de um aluno, e não pode comprar lugares — a faturação precisa de termos e de um fornecedor que ninguém tem',
    'console.nSponsorships':
      'alunos que pedem um curso, e doadores que pagam um. Decidir precisa de um motivo escrito e registar um pagamento precisa de uma referência; um lugar patrocinado não é uma encomenda, por isso não leva imposto nem ganho para o professor',
    'console.nInvitations':
      'quem convidou quem, o que isso rendeu e o que o limite anual ou um reembolso travou. As duas recompensas são descontos num curso — nada é pago, por isso não há saldo aqui',
    'console.nSupport':
      'pedidos que as pessoas abriram a partir da Ajuda. Desligar a funcionalidade trava os novos; não fecha os que estão em curso',
    'console.nUsers':
      'todas as contas da plataforma, pesquisáveis por nome ou e-mail — contas, não crianças',
    'console.nControls':
      'os números por trás das funcionalidades já ligadas. Só são mostrados os que pertencem à sua função, e cada alteração precisa de um motivo',
    'console.nReports':
      'problemas que os leitores assinalaram numa lição ou numa resposta. Fechar um precisa de uma nota escrita',
    'console.nMedia':
      'cada ficheiro original que alguém carregou. Tanto a quarentena como a retirada precisam de um motivo escrito',
    'console.nCourseReviews':
      'classificações de alunos que incluem palavras, retidas até alguém as ler',
    'console.nDiscussion': 'perguntas de alunos e respostas de colegas retidas para revisão',
    'console.nBoards':
      'publicações da discussão dos alunos e da discussão dos professores que alguém denunciou. Ali uma publicação é mostrada de imediato, por isso é aqui que se retira. Ver quem está por trás de um nome de utilizador precisa de um motivo e fica registado',
    'console.nAssistant':
      'o que lhe foi perguntado e o que fizeram os limites que lhe foram fixados: respostas que citaram uma lição, perguntas enviadas a um professor, e as frases com que recusa',
    'console.nConnections':
      'as contas externas que este site usa (base de dados, e-mail, agendador, armazenamento, pagamentos) e quais faltam ligar. Só para o proprietário; nomes das definições em falta, nunca um valor',
    'console.nMessages':
      'o que a plataforma enviaria, na sua forma final e registado. Nada sai de facto até um fornecedor estar configurado',
    'console.nPlans': 'termos com versões, direitos de acesso e preços recorrentes',
    'console.nPanels':
      'o proprietário convoca um conselho e fixa o seu quórum; a equipa abre um caso sobre uma versão não publicada; os membros votam e a presidência regista a decisão. Um caso não pode ser fechado abaixo do quórum, e com governance.panel_required desligado nada fica à espera dele',
    'console.nTakedowns':
      'um aviso retém fora da distribuição a versão que nomeia no momento em que é introduzido — nada é apagado, por isso a decisão mantém as suas provas. O professor responde na sua própria página, decide alguém que não a pessoa que recebeu o aviso, e uma retenção não muda dinheiro nenhum',
    'console.nIncidents':
      'o que aconteceu, quem tem de ser avisado e até quando, e a cronologia à medida que acontece. Contagens, nunca uma lista de nomes; cada prazo é escrito por uma pessoa porque a regra difere conforme o mercado. Nada aqui deteta uma violação de dados e nada envia uma notificação',
    'console.nPolicies':
      'cada documento com as versões que estiveram em vigor e o rascunho que espera agora. Publicar precisa de uma data e de um motivo escrito, e é recusado enquanto uma pergunta a que só o proprietário pode responder ainda estiver marcada no texto',
    'console.nCertificates':
      'emita certificados de conclusão e registe as revogações com um motivo',
    'console.nAnalytics':
      'o que as pessoas fazem, guardado para sempre, por evento e por dia. Só agregados',
    'console.nGuardians':
      'adultos que pedem para ser reconhecidos como progenitores de uma criança',
    'console.nAppeals':
      'professores que contestam uma rejeição. Não pode decidir um recurso contra a sua própria decisão',
    'console.nRoles': 'quem pode fazer o quê. Cada verificação na base de dados lê isto',
  },
  sw: {
    'console.nav': 'Usimamizi',
    'console.nOrders':
      'oda pekee ambazo jumla yake bado inaweza kubadilika: rekodi punguzo, kodi, ada au ukadiriaji kwenye oda, au ondoa oda hiyo',
    'console.nRefunds': 'pesa inayorudi nje. Kuidhinisha ni makubaliano, si uhamisho',
    'console.nAdjustments':
      'masahihisho ya uhasibu yanayoongezwa tu bila kubadilisha kilichopo, na kurejeshwa kwa mapato',
    'console.nReconciliation':
      'mistari ya taarifa zilizotiwa saini ikilinganishwa na daftari la ndani',
    'console.nDisputes':
      'dai la kurejeshewa malipo lina tarehe ya mwisho; ikipita, mtoa huduma ndiye anayeamua kinachotokea',
    'console.nTax': 'kile mnunuzi anachotozwa juu ya bei, kulingana na nchi anakonunulia',
    'console.nRates':
      'sarafu moja ilikuwa na thamani gani katika nyingine, lini, na nani alisema hivyo',
    'console.nRevenue':
      'kilichouzwa katika kipindi kwa sarafu, kozi, mpango na mwalimu, marejesho yakiwa kando ya mauzo na kamwe hayapunguzwi pasipo kuonekana',
    'console.nMoneyReport':
      'kilichohama katika kipindi, katika sarafu moja ambayo jukwaa husomwa nayo, na kiwango cha ubadilishaji kando ya kila takwimu',
    'console.nRenewals':
      'kila usajili ulio hai ukiwa umepanuliwa mbele kwa bei uliyouzwa. Imeahidiwa, haijafika — bado hakuna kinachotoza usasishaji',
    'console.nPayouts':
      'kile walimu walichoomba kulipwa, na zuio la marejesho linalozuia pesa ya mauzo isitoke wakati bado inaweza kurejeshwa',
    'console.nCourses':
      'kila kozi, iko wazi kwa nani na ina wanafunzi wangapi. Kubadilisha hadhira ya kozi hurekodiwa kwa jina lako, pamoja na hali ya kabla na ya baada',
    'console.nTeachers':
      'watu wanaoomba kufundisha, na kila anayeruhusiwa kufundisha hapa pamoja na alichochapisha kila mmoja na idadi ya wanafunzi katika kozi zake. Kuidhinisha ombi ndiko kuteua: kunatoa jukumu, na sababu yako hurekodiwa kwa mwombaji',
    'console.nAssign': 'kozi zinazosubiri mkaguzi',
    'console.nSubjects':
      'msamiati wa orodha ya kozi: kile mwanafunzi anachoweza kuchuja nacho, na kile beji kwenye kadi ya kozi inachoweza kusema. Somo linalotumiwa na kozi iliyochapishwa haliwezi kustaafishwa',
    'console.nReviewers':
      'nani aliomba kukagua, nani amekaguliwa, na kila mmoja anaweza kuhukumu nini. Hakuna kinachochapishwa hadi mtu hapa athibitishwe',
    'console.nScreenings':
      'kila mwalimu aliyeteuliwa na kama kuna uchunguzi kwenye kumbukumbu: wa aina gani, lini, unaisha lini, nani aliurekodi. Rejeo la hati huhifadhiwa na halionyeshwi tena, na rekodi haiwezi kuhaririwa — uchunguzi mpya huichukua nafasi yake. Wakati platform.safeguarding imewashwa, kozi inayoweza kuonyeshwa kwa mtoto haiwezi kuchapishwa isipokuwa mwandishi wake ana uchunguzi uliofaulu ambao haujaisha na amekiri sera ya mwenendo',
    'console.nIjazah':
      'nani alimpa nani ijaza, ya nini, na ulionyeshwa nini. Ni wewe pekee wa kurekodi: mnyororo wa sanad si jambo ambalo jukwaa hili lina mamlaka ya kulikagua, kwa hiyo rejista husema “imerekodiwa”, kamwe si “imethibitishwa”, na hakuna chochote hapa kinachoonekana kwa mwanafunzi',
    'console.nTranslations':
      'masahihisho yaliyotumwa na watu wanaozungumza lugha, kila moja likionyeshwa kando ya mstari linaoubadilisha na kando ya maandishi ya tovuti jinsi yalivyojengwa kwa kweli. Ni wewe pekee wa kuamua: kukubali mstari hakubadilishi tovuti — kipande kinachobandikwa kwenye msimbo ndicho hufanya hivyo — na lugha husemwa imesomwa tu pale kila sehemu yake ina usomaji uliochapishwa — au mtu mmoja amechapisha usomaji wa maandishi yote — na kila sahihisho limeamuliwa',
    'console.nInstitutions':
      'madrasa, shule na mashirika yenye ukurasa wake: fungua mpya, kagua rekodi ya DNS iliyo nyuma ya dai la kikoa, na badilisha anayeisimamia. Taasisi huona idadi za wanachama wake na kamwe si jina la mwanafunzi, na haiwezi kununua nafasi — ankara zinahitaji masharti na mtoa huduma ambaye hakuna aliye naye',
    'console.nSponsorships':
      'wanafunzi wanaoomba kozi, na wafadhili wanaolipia kozi. Kuamua kunahitaji sababu iliyoandikwa na kurekodi malipo kunahitaji namba ya rejeo; nafasi iliyofadhiliwa si oda, kwa hiyo haina kodi wala mapato ya mwalimu',
    'console.nInvitations':
      'nani alimwalika nani, mwaliko ulipata nini na kikomo cha mwaka au marejesho vilisimamisha nini. Zawadi zote mbili ni punguzo la kozi — hakuna kinacholipwa, kwa hiyo hakuna salio hapa',
    'console.nSupport':
      'maombi ambayo watu walifungua kutoka Msaada. Kuzima kipengele husimamisha mapya; hakufungi yaliyo njiani',
    'console.nUsers':
      'kila akaunti kwenye jukwaa, inayotafutika kwa jina au barua pepe — akaunti, si watoto',
    'console.nControls':
      'namba zilizo nyuma ya vipengele ambavyo tayari vimewashwa. Zinaonyeshwa zile tu ambazo jukumu lako linazimiliki, na kila badiliko linahitaji sababu',
    'console.nReports':
      'matatizo ambayo wasomaji waliashiria katika somo au jibu. Kufunga moja kunahitaji maelezo yaliyoandikwa',
    'console.nMedia':
      'kila faili asili ambayo mtu yeyote amepakia. Karantini na kuondoa vyote vinahitaji sababu iliyoandikwa',
    'console.nCourseReviews': 'alama za wanafunzi zenye maneno, zilizozuiliwa hadi mtu azisome',
    'console.nDiscussion': 'maswali ya wanafunzi na majibu ya wenzao yaliyozuiliwa kwa ukaguzi',
    'console.nBoards':
      'machapisho katika majadiliano ya wanafunzi na majadiliano ya walimu ambayo mtu aliyaripoti. Chapisho huko huonyeshwa mara moja, kwa hiyo hapa ndipo linapoondolewa. Kuona ni nani aliye nyuma ya jina la mtumiaji kunahitaji sababu na hurekodiwa',
    'console.nAssistant':
      'kile kilichoulizwa na kile mipaka kiliyowekewa ilifanya: majibu yaliyonukuu somo, maswali yaliyotumwa kwa mwalimu, na maneno yanayotumika kukataa',
    'console.nConnections':
      'akaunti za nje ambazo tovuti hii hutumia (hifadhidata, barua pepe, kipanga ratiba, hifadhi, malipo) na zipi bado hazijaunganishwa. Ni kwa mmiliki pekee; majina ya mipangilio inayokosekana, kamwe si thamani',
    'console.nMessages':
      'kile ambacho jukwaa lingetuma, kikiwa katika umbo lake la mwisho na kimerekodiwa. Hakuna kinachotumwa kwa kweli hadi mtoa huduma asanidiwe',
    'console.nPlans': 'masharti yenye matoleo, stahiki na bei zinazojirudia',
    'console.nPanels':
      'mmiliki huitisha bodi na kuweka akidi yake; wafanyakazi hufungua shauri dhidi ya toleo ambalo halijachapishwa; wajumbe hupiga kura na mwenyekiti hurekodi uamuzi. Shauri haliwezi kufungwa chini ya akidi, na governance.panel_required ikiwa imezimwa hakuna kinachoisubiri',
    'console.nTakedowns':
      'notisi huzuia toleo inalolitaja lisisambazwe mara tu inapoingizwa — hakuna kinachofutwa, kwa hiyo uamuzi bado una ushahidi wake. Mwalimu hujibu kwenye ukurasa wake mwenyewe, anayeamua ni mtu mwingine asiye yule aliyepokea notisi, na zuio halibadilishi pesa yoyote',
    'console.nIncidents':
      'kilichotokea, nani lazima aambiwe na kufikia lini, na mfuatano wa matukio jinsi yanavyotokea. Idadi, kamwe si orodha ya majina; kila tarehe ya mwisho huandikwa na mtu kwa sababu kanuni hutofautiana kwa soko. Hakuna chochote hapa kinachogundua uvunjaji wa data na hakuna kinachotuma arifa',
    'console.nPolicies':
      'kila hati pamoja na matoleo yaliyowahi kutumika na rasimu inayosubiri sasa. Kuchapisha kunahitaji tarehe na sababu iliyoandikwa, na hukataliwa wakati swali ambalo ni wewe tu unaweza kulijibu bado limewekwa alama kwenye maandishi',
    'console.nCertificates': 'toa vyeti vya kuhitimu na rekodi ubatilishaji pamoja na sababu',
    'console.nAnalytics':
      'kile watu wanachofanya, kikihifadhiwa milele, kwa tukio na kwa siku. Jumla tu',
    'console.nGuardians': 'watu wazima wanaoomba kutambuliwa kama mzazi wa mtoto',
    'console.nAppeals':
      'walimu wanaopinga kukataliwa. Huwezi kuamua rufaa dhidi ya uamuzi wako mwenyewe',
    'console.nRoles': 'nani anaweza kufanya nini. Kila ukaguzi katika hifadhidata husoma haya',
  },
  af: {
    'console.nav': 'Administrasie',
    'console.nOrders':
      'die enigste bestellings waarvan die totaal nog kan verander: teken ’n afslag, belasting, fooi of afronding teen een aan, of trek die bestelling terug',
    'console.nRefunds':
      'geld wat weer uitgaan. Om goed te keur is ’n ooreenkoms, nie ’n oordrag nie',
    'console.nAdjustments':
      'rekeningkundige regstellings wat net bygevoeg word en niks wysig nie, en terugvorderings van verdienste',
    'console.nReconciliation': 'rye van getekende state teenoor die interne grootboek',
    'console.nDisputes':
      '’n terugvordering het ’n sperdatum; as dit verbygaan, besluit die verskaffer wat gebeur',
    'console.nTax': 'wat ’n koper bo-op die prys betaal, volgens die land waaruit hy of sy koop',
    'console.nRates': 'wat een geldeenheid in ’n ander werd was, wanneer, en wie dit gesê het',
    'console.nRevenue':
      'wat in ’n tydperk verkoop is volgens geldeenheid, kursus, plan en onderwyser, met terugbetalings langs die verkoop en nooit buite sig afgetrek nie',
    'console.nMoneyReport':
      'wat in ’n tydperk beweeg het, in die een geldeenheid waarin die platform gelees word, met die koers langs elke syfer',
    'console.nRenewals':
      'elke lopende subskripsie vorentoe uitgebrei teen die prys waarteen dit verkoop is. Toegesê, nie ontvang nie — niks vorder nog ’n hernuwing in nie',
    'console.nPayouts':
      'wat onderwysers gevra het om betaal te word, en die terugbetalingshouvas wat keer dat ’n verkoop se geld uitgaan terwyl dit nog omgekeer kan word',
    'console.nCourses':
      'elke kursus, vir wie dit oop is en hoeveel leerders dit het. Om ’n kursus se gehoor te verander, word teen jou naam aangeteken, met die voor en die ná',
    'console.nTeachers':
      'die mense wat vra om te onderrig, en almal wat hier mag onderrig, met wat elkeen gepubliseer het en hoeveel leerders hulle kursusse het. Om ’n aansoek goed te keur, is die aanstelling: dit ken die rol toe, en jou rede word teen die aansoeker aangeteken',
    'console.nAssign': 'kursusse wat op ’n beoordelaar wag',
    'console.nSubjects':
      'die woordeskat van die katalogus: waarvolgens ’n leerder kan filtreer, en wat ’n kenteken op ’n kursuskaart mag sê. ’n Vak wat deur ’n gepubliseerde kursus gebruik word, kan nie afgetree word nie',
    'console.nReviewers':
      'wie aansoek gedoen het om te beoordeel, wie nagegaan is, en wat elkeen mag beoordeel. Niks word gepubliseer voordat iemand hier geverifieer is nie',
    'console.nScreenings':
      'elke aangestelde onderwyser en of daar ’n sifting op rekord is: watter soort, wanneer, wanneer dit verval, wie dit aangeteken het. Die verwysing na die dokument word bewaar en nooit weer gewys nie, en ’n rekord kan nie gewysig word nie — ’n nuwe sifting vervang dit. Terwyl platform.safeguarding aan is, kan ’n kursus wat aan ’n kind gewys mag word nie gepubliseer word nie, tensy die outeur ’n geslaagde, onverstreke sifting het en die gedragsbeleid erken het',
    'console.nIjazah':
      'wie wie gemagtig het, waarvoor, en wat aan jou gewys is. Net jy teken dit aan: ’n ketting van oorlewering is nie iets wat hierdie platform die aansien het om na te gaan nie, dus sê die register “aangeteken”, nooit “geverifieer” nie, en niks hier is vir ’n leerder sigbaar nie',
    'console.nTranslations':
      'regstellings gestuur deur mense wat die taal praat, elkeen gewys teenoor die reël wat dit vervang en teenoor die werf se teks soos dit werklik gebou is. Net jy besluit: om ’n reël te aanvaar verander nie die werf nie — die blok wat in die kode geplak word, doen dit — en ’n taal word eers as gelees beskryf wanneer elke deel daarvan ’n gepubliseerde lesing het — of wanneer een persoon ’n lesing van al die teks gepubliseer het — met elke regstelling beslis',
    'console.nInstitutions':
      'madrassas, skole en organisasies met hulle eie bladsy: open ’n nuwe een, gaan die DNS-rekord agter ’n domeinaanspraak na, en verander wie dit administreer. ’n Instelling sien tellings van sy eie lede en nooit ’n leerder se naam nie, en dit kan nie plekke koop nie — fakturering verg voorwaardes en ’n verskaffer wat niemand het nie',
    'console.nSponsorships':
      'leerders wat ’n kursus vra, en skenkers wat vir een betaal. Om te besluit verg ’n geskrewe rede en om ’n betaling aan te teken verg ’n verwysing; ’n geborgde plek is nie ’n bestelling nie, dus dra dit geen belasting en geen onderwyserverdienste nie',
    'console.nInvitations':
      'wie wie genooi het, wat dit verdien het en wat die jaarlikse perk of ’n terugbetaling gestuit het. Albei belonings is afslag op ’n kursus — niks word uitbetaal nie, dus is hier geen saldo nie',
    'console.nSupport':
      'versoeke wat mense vanuit Hulp geopen het. Om die funksie af te skakel, stuit nuwes; dit sluit nie wat reeds loop nie',
    'console.nUsers':
      'elke rekening op die platform, soekbaar volgens naam of e-pos — rekeninge, nie kinders nie',
    'console.nControls':
      'die getalle agter funksies wat reeds aan is. Net dié wat aan jou rol behoort, word gewys, en elke verandering verg ’n rede',
    'console.nReports':
      'probleme wat lesers in ’n les of ’n antwoord aangemeld het. Om een te sluit, verg ’n geskrewe nota',
    'console.nMedia':
      'elke oorspronklike lêer wat enigiemand opgelaai het. Kwarantyn en onttrekking verg albei ’n geskrewe rede',
    'console.nCourseReviews':
      'leerdergraderings wat woorde insluit, teruggehou totdat iemand dit lees',
    'console.nDiscussion':
      'leerders se vrae en maats se antwoorde wat vir beoordeling teruggehou word',
    'console.nBoards':
      'plasings in die studentebespreking en die onderwysersbespreking wat iemand aangemeld het. ’n Plasing daar word dadelik gewys, dus is dit hier waar een afgehaal word. Om te sien wie agter ’n gebruikersnaam is, verg ’n rede en word aangeteken',
    'console.nAssistant':
      'wat dit gevra is en wat die grense wat daarvoor gestel is, gedoen het: antwoorde wat ’n les aangehaal het, vrae wat na ’n onderwyser gestuur is, en die frases waarmee dit weier',
    'console.nConnections':
      'die buiterekeninge wat hierdie werf gebruik (databasis, e-pos, skeduleerder, berging, betalings) en watter nog gekoppel moet word. Net vir die eienaar; name van ontbrekende instellings, nooit ’n waarde nie',
    'console.nMessages':
      'wat die platform sou stuur, in sy finale vorm en aangeteken. Niks gaan werklik uit voordat ’n verskaffer opgestel is nie',
    'console.nPlans': 'voorwaardes met weergawes, toegangsregte en herhalende pryse',
    'console.nPanels':
      'die eienaar roep ’n raad byeen en stel sy kworum; personeel open ’n saak teen ’n ongepubliseerde weergawe; lede stem en die voorsitter teken die besluit aan. ’n Saak kan nie onder kworum gesluit word nie, en met governance.panel_required af wag niks daarop nie',
    'console.nTakedowns':
      '’n kennisgewing hou die weergawe wat dit noem uit verspreiding die oomblik dat dit ingevoer word — niks word uitgevee nie, dus het die besluit steeds sy bewyse. Die onderwyser antwoord op sy of haar eie bladsy, iemand anders as die persoon wat die kennisgewing ontvang het, besluit daaroor, en ’n terughouding verander geen geld nie',
    'console.nIncidents':
      'wat gebeur het, wie ingelig moet word en teen wanneer, en die tydlyn soos dit gebeur. Tellings, nooit ’n lys name nie; elke sperdatum word deur ’n mens getik omdat die reël per mark verskil. Niks hier bespeur ’n data-oortreding nie en niks stuur ’n kennisgewing nie',
    'console.nPolicies':
      'elke dokument met die weergawes wat van krag was en die konsep wat nou wag. Om te publiseer verg ’n datum en ’n geskrewe rede, en word geweier solank ’n vraag wat net jy kan beantwoord nog in die teks gemerk is',
    'console.nCertificates': 'reik voltooiingsertifikate uit en teken herroepings met ’n rede aan',
    'console.nAnalytics':
      'wat mense doen, vir altyd bewaar, volgens gebeurtenis en volgens dag. Net totale',
    'console.nGuardians': 'volwassenes wat vra om as ’n kind se ouer erken te word',
    'console.nAppeals':
      'onderwysers wat ’n afwysing betwis. Jy kan nie oor ’n appèl teen jou eie besluit beslis nie',
    'console.nRoles': 'wie wat mag doen. Elke kontrole in die databasis lees hierdie',
  },
  'zh-hans': {
    'console.nav': '管理',
    'console.nOrders': '仅有的总额仍可变动的订单：为订单登记折扣、税费、手续费或舍入，或者撤回订单',
    'console.nRefunds': '往回退的钱。批准是一项约定，而不是转账',
    'console.nAdjustments': '只追加、不改动的账务更正，以及收益追回',
    'console.nReconciliation': '已签署的对账单各行与内部账本的核对',
    'console.nDisputes': '拒付有期限；如果过期，由支付服务商决定结果',
    'console.nTax': '在价格之外向买家收取的费用，按其购买所在的国家计算',
    'console.nRates': '一种货币折合另一种货币的价值、时间，以及由谁给出',
    'console.nRevenue': '一段时期内按货币、课程、方案和教师统计的销售，退款列在销售旁边，绝不在看不见的地方抵扣',
    'console.nMoneyReport': '一段时期内的资金变动，以平台统一读数所用的那一种货币表示，每个数字旁边都列出汇率',
    'console.nRenewals': '每一份有效订阅按售出时的价格向后展开。这是已承诺的金额，不是已到账的金额——目前还没有任何功能会扣取续订费用',
    'console.nPayouts': '教师申请支付的款项，以及退款保留期：在一笔销售仍可能被撤销期间，这笔钱不会付出',
    'console.nCourses': '每一门课程、它向哪些人开放以及有多少学习者。更改课程的受众会记在你的名下，并同时记录更改前后的情况',
    'console.nTeachers': '申请任教的人，以及所有可以在这里任教的人，附带各自已发布的内容和其课程的学习者人数。批准一份申请即为任命：它授予角色，你的理由会记在申请人名下',
    'console.nAssign': '等待审阅者的课程',
    'console.nSubjects': '课程目录的词汇：学习者可以按什么筛选，以及课程卡片上的徽章可以写什么。正在被已发布课程使用的学科不能停用',
    'console.nReviewers': '谁申请了审阅、谁已通过核查，以及各自可以评判什么。在这里有人通过核实之前，任何内容都不会发布',
    'console.nScreenings':
      '每一位获任命的教师以及是否有核查记录在案：哪一类、何时、何时失效、由谁登记。文件的引用会被保存且不再显示，记录不能编辑——新的核查会取代它。只要 platform.safeguarding 处于开启状态，可能向儿童展示的课程就不能发布，除非其作者持有已通过且未过期的核查，并已确认行为准则',
    'console.nIjazah':
      '谁授权了谁、授权什么，以及向你出示了什么。只能由你登记：传承链不是本平台有资格核查的事项，所以名册写的是“已登记”，绝不写“已核实”，这里的任何内容学习者都看不到',
    'console.nTranslations':
      '由讲该语言的人发来的更正，每一条都与它要替换的那一行以及实际构建出的网站文字并排显示。只能由你决定：接受一行并不会改变网站——要粘贴进代码的那一段才会——而一种语言只有在它的每个部分都有已发布的通读——或者有一个人发布了全部文字的通读——并且每条更正都已作出决定时，才被称为已读过',
    'console.nInstitutions':
      '拥有自己页面的经学院、学校和组织：新开一个，核查域名声明背后的 DNS 记录，并更改由谁管理。机构能看到自己成员的数量，绝看不到任何学习者的姓名，也不能购买名额——开具发票需要条款和服务商，而这些目前谁都没有',
    'console.nSponsorships': '申请课程的学习者，以及为课程付费的捐助者。作出决定需要书面理由，登记付款需要凭证编号；资助名额不是订单，所以不含税，也不产生教师收益',
    'console.nInvitations': '谁邀请了谁、带来了什么，以及年度上限或一笔退款拦下了什么。两种奖励都是课程折扣——不会支付任何款项，所以这里没有余额',
    'console.nSupport': '人们从“帮助”页面发起的请求。关闭这项功能会停止新的请求，但不会关闭进行中的请求',
    'console.nUsers': '平台上的每一个账户，可按姓名或电子邮件搜索——是账户，不是儿童',
    'console.nControls': '已开启功能背后的数值。只显示你的角色所管辖的那些，每次更改都需要理由',
    'console.nReports': '读者在课时或回答中标记的问题。关闭一条需要书面说明',
    'console.nMedia': '任何人上传的每一份原始文件。隔离和撤回都需要书面理由',
    'console.nCourseReviews': '带有文字的学习者评分，在有人读过之前先扣留',
    'console.nDiscussion': '被扣留待审的学习者提问和同伴回答',
    'console.nBoards': '学生讨论区和教师讨论区中被人举报的帖子。那里的帖子会立即显示，所以要在这里把它撤下。查看用户名背后是谁需要理由，并会被记录',
    'console.nAssistant': '它被问了什么，以及为它设定的界限做了什么：引用了课时的回答、转给教师的问题，以及用来拒绝的措辞',
    'console.nConnections': '本网站使用的外部账户（数据库、电子邮件、调度器、存储、支付），以及哪些尚未连接。仅限所有者；只列出缺失设置的名称，绝不显示任何值',
    'console.nMessages': '平台本来会发送的内容，已排版并已记录。在配置好服务商之前，实际上不会发出任何东西',
    'console.nPlans': '带版本的条款、权益和周期性价格',
    'console.nPanels':
      '所有者召集委员会并设定其法定人数；工作人员针对未发布的版本立案；委员投票，由主席登记决定。未达法定人数时案件不能结案，而在 governance.panel_required 关闭时，没有任何事项等待它',
    'console.nTakedowns':
      '通知一经录入，它所指明的版本就立即被扣在发行之外——不会删除任何内容，所以决定仍然有据可查。教师在自己的页面上答复，由受理通知者以外的人作出决定，扣留不会改变任何款项',
    'console.nIncidents':
      '发生了什么、必须告知谁以及最迟何时，以及随事态发展的时间线。只有数量，绝没有姓名列表；每个期限都由人填写，因为各个市场的规定不同。这里没有任何功能会检测数据泄露，也没有任何功能会发送通知',
    'console.nPolicies': '每一份文件及其曾经生效的版本和目前等待中的草稿。发布需要日期和书面理由；只要文中仍标有只有你能回答的问题，就会被拒绝',
    'console.nCertificates': '签发结业证书，并登记撤销及其理由',
    'console.nAnalytics': '人们做了什么，永久保存，按事件和按天统计。只有汇总数据',
    'console.nGuardians': '申请被认定为某个孩子家长的成年人',
    'console.nAppeals': '对驳回提出异议的教师。你不能对针对你自己决定的申诉作出裁决',
    'console.nRoles': '谁可以做什么。数据库中的每一项检查都读取这些',
  },
  'zh-hant': {
    'console.nav': '管理',
    'console.nOrders': '僅有的總額仍可變動的訂單：為訂單登記折扣、稅費、手續費或捨入，或者撤回訂單',
    'console.nRefunds': '往回退的錢。核准是一項約定，而不是轉帳',
    'console.nAdjustments': '只追加、不改動的帳務更正，以及收益追回',
    'console.nReconciliation': '已簽署的對帳單各列與內部帳本的核對',
    'console.nDisputes': '拒付有期限；如果過期，由支付服務商決定結果',
    'console.nTax': '在價格之外向買家收取的費用，依其購買所在的國家計算',
    'console.nRates': '一種貨幣折合另一種貨幣的價值、時間，以及由誰提供',
    'console.nRevenue': '一段期間內依貨幣、課程、方案和教師統計的銷售，退款列在銷售旁邊，絕不在看不見的地方抵扣',
    'console.nMoneyReport': '一段期間內的資金變動，以平台統一讀數所用的那一種貨幣表示，每個數字旁邊都列出匯率',
    'console.nRenewals': '每一份有效訂閱依售出時的價格向後展開。這是已承諾的金額，不是已入帳的金額——目前還沒有任何功能會扣取續訂費用',
    'console.nPayouts': '教師申請支付的款項，以及退款保留期：在一筆銷售仍可能被撤銷期間，這筆錢不會付出',
    'console.nCourses': '每一門課程、它向哪些人開放以及有多少學習者。更改課程的對象會記在你的名下，並同時記錄更改前後的情況',
    'console.nTeachers': '申請任教的人，以及所有可以在這裡任教的人，附帶各自已發布的內容和其課程的學習者人數。核准一份申請即為任命：它授予角色，你的理由會記在申請人名下',
    'console.nAssign': '等待審閱者的課程',
    'console.nSubjects': '課程目錄的詞彙：學習者可以依什麼篩選，以及課程卡片上的徽章可以寫什麼。正在被已發布課程使用的學科不能停用',
    'console.nReviewers': '誰申請了審閱、誰已通過核查，以及各自可以評判什麼。在這裡有人通過核實之前，任何內容都不會發布',
    'console.nScreenings':
      '每一位獲任命的教師以及是否有核查紀錄在案：哪一類、何時、何時失效、由誰登記。文件的參照會被保存且不再顯示，紀錄不能編輯——新的核查會取代它。只要 platform.safeguarding 處於開啟狀態，可能向兒童展示的課程就不能發布，除非其作者持有已通過且未過期的核查，並已確認行為準則',
    'console.nIjazah':
      '誰授權了誰、授權什麼，以及向你出示了什麼。只能由你登記：傳承鏈不是本平台有資格核查的事項，所以名冊寫的是「已登記」，絕不寫「已核實」，這裡的任何內容學習者都看不到',
    'console.nTranslations':
      '由講該語言的人送來的更正，每一條都與它要取代的那一行以及實際建置出的網站文字並排顯示。只能由你決定：接受一行並不會改變網站——要貼進程式碼的那一段才會——而一種語言只有在它的每個部分都有已發布的通讀——或者有一個人發布了全部文字的通讀——並且每條更正都已作出決定時，才被稱為已讀過',
    'console.nInstitutions':
      '擁有自己頁面的經學院、學校和組織：新開一個，核查網域聲明背後的 DNS 紀錄，並更改由誰管理。機構能看到自己成員的數量，絕看不到任何學習者的姓名，也不能購買名額——開立發票需要條款和服務商，而這些目前誰都沒有',
    'console.nSponsorships': '申請課程的學習者，以及為課程付費的捐助者。作出決定需要書面理由，登記付款需要憑證編號；贊助名額不是訂單，所以不含稅，也不產生教師收益',
    'console.nInvitations': '誰邀請了誰、帶來了什麼，以及年度上限或一筆退款攔下了什麼。兩種獎勵都是課程折扣——不會支付任何款項，所以這裡沒有餘額',
    'console.nSupport': '人們從「說明」頁面發起的請求。關閉這項功能會停止新的請求，但不會關閉進行中的請求',
    'console.nUsers': '平台上的每一個帳號，可依姓名或電子郵件搜尋——是帳號，不是兒童',
    'console.nControls': '已開啟功能背後的數值。只顯示你的角色所管轄的那些，每次更改都需要理由',
    'console.nReports': '讀者在課堂或回答中標記的問題。關閉一條需要書面說明',
    'console.nMedia': '任何人上傳的每一份原始檔案。隔離和撤回都需要書面理由',
    'console.nCourseReviews': '帶有文字的學習者評分，在有人讀過之前先扣留',
    'console.nDiscussion': '被扣留待審的學習者提問和同儕回答',
    'console.nBoards': '學生討論區和教師討論區中被人檢舉的貼文。那裡的貼文會立即顯示，所以要在這裡把它撤下。查看使用者名稱背後是誰需要理由，並會被記錄',
    'console.nAssistant': '它被問了什麼，以及為它設定的界限做了什麼：引用了課堂的回答、轉給教師的問題，以及用來拒絕的措辭',
    'console.nConnections': '本網站使用的外部帳號（資料庫、電子郵件、排程器、儲存空間、付款），以及哪些尚未連接。僅限擁有者；只列出缺少設定的名稱，絕不顯示任何值',
    'console.nMessages': '平台本來會發送的內容，已排版並已記錄。在設定好服務商之前，實際上不會發出任何東西',
    'console.nPlans': '帶版本的條款、權益和週期性價格',
    'console.nPanels':
      '擁有者召集委員會並設定其法定人數；工作人員針對未發布的版本立案；委員投票，由主席登記決定。未達法定人數時案件不能結案，而在 governance.panel_required 關閉時，沒有任何事項等待它',
    'console.nTakedowns':
      '通知一經輸入，它所指明的版本就立即被扣在發行之外——不會刪除任何內容，所以決定仍然有據可查。教師在自己的頁面上答覆，由受理通知者以外的人作出決定，扣留不會改變任何款項',
    'console.nIncidents':
      '發生了什麼、必須告知誰以及最遲何時，以及隨事態發展的時間軸。只有數量，絕沒有姓名清單；每個期限都由人填寫，因為各個市場的規定不同。這裡沒有任何功能會偵測資料外洩，也沒有任何功能會發送通知',
    'console.nPolicies': '每一份文件及其曾經生效的版本和目前等待中的草稿。發布需要日期和書面理由；只要文中仍標有只有你能回答的問題，就會被拒絕',
    'console.nCertificates': '簽發結業證書，並登記撤銷及其理由',
    'console.nAnalytics': '人們做了什麼，永久保存，依事件和依天統計。只有彙總資料',
    'console.nGuardians': '申請被認定為某個孩子家長的成年人',
    'console.nAppeals': '對駁回提出異議的教師。你不能對針對你自己決定的申訴作出裁決',
    'console.nRoles': '誰可以做什麼。資料庫中的每一項檢查都讀取這些',
  },
  vi: {
    'console.nav': 'Quản trị',
    'console.nOrders':
      'những đơn hàng duy nhất mà tổng tiền còn có thể thay đổi: ghi nhận giảm giá, thuế, phí hoặc làm tròn cho một đơn, hoặc rút đơn đó lại',
    'console.nRefunds':
      'tiền đi ngược trở ra. Phê duyệt là một thỏa thuận, không phải một lệnh chuyển tiền',
    'console.nAdjustments':
      'các bút toán điều chỉnh chỉ được thêm vào, không sửa cái cũ, và các khoản thu hồi thu nhập',
    'console.nReconciliation': 'các dòng sao kê đã ký được đối chiếu với sổ cái nội bộ',
    'console.nDisputes':
      'yêu cầu bồi hoàn có thời hạn; nếu quá hạn, nhà cung cấp quyết định điều gì xảy ra',
    'console.nTax': 'những gì người mua bị tính thêm ngoài giá, theo quốc gia nơi họ mua',
    'console.nRates':
      'một đồng tiền đáng giá bao nhiêu theo đồng tiền khác, vào lúc nào, và ai đã nói vậy',
    'console.nRevenue':
      'những gì đã bán trong một kỳ theo đồng tiền, khóa học, gói và giáo viên, với các khoản hoàn tiền nằm cạnh doanh số và không bao giờ bị trừ khuất mắt',
    'console.nMoneyReport':
      'những gì đã dịch chuyển trong một kỳ, theo một đồng tiền duy nhất mà nền tảng dùng để đọc số, với tỷ giá bên cạnh mỗi con số',
    'console.nRenewals':
      'mỗi gói đăng ký còn hiệu lực được trải về phía trước theo giá lúc bán. Là tiền đã cam kết, chưa phải tiền đã về — hiện chưa có gì thu phí gia hạn',
    'console.nPayouts':
      'những gì giáo viên đã yêu cầu được trả, và khoảng giữ lại để hoàn tiền, thứ ngăn tiền của một lần bán rời đi khi lần bán đó còn có thể bị đảo ngược',
    'console.nCourses':
      'mọi khóa học, khóa đó mở cho ai và có bao nhiêu học viên. Việc đổi đối tượng của một khóa học được ghi dưới tên bạn, kèm cả trước và sau khi đổi',
    'console.nTeachers':
      'những người xin được dạy, và mọi người được phép dạy ở đây cùng những gì mỗi người đã xuất bản và số học viên trong các khóa của họ. Phê duyệt một đơn chính là bổ nhiệm: việc đó cấp vai trò, và lý do của bạn được ghi kèm người nộp đơn',
    'console.nAssign': 'các khóa học đang chờ người duyệt',
    'console.nSubjects':
      'từ vựng của danh mục: học viên có thể lọc theo gì, và huy hiệu trên thẻ khóa học được phép nói gì. Một môn học đang được khóa học đã xuất bản sử dụng thì không thể cho ngừng dùng',
    'console.nReviewers':
      'ai đã xin làm người duyệt, ai đã được kiểm tra, và mỗi người được thẩm định những gì. Không gì được xuất bản cho đến khi có ai đó ở đây được xác minh',
    'console.nScreenings':
      'mọi giáo viên được bổ nhiệm và việc có lần thẩm tra nào được lưu hay không: loại gì, khi nào, khi nào hết hạn, ai ghi nhận. Tham chiếu tới tài liệu được lưu và không bao giờ hiển thị lại, và một bản ghi không thể sửa — lần thẩm tra mới sẽ thay thế nó. Khi platform.safeguarding đang bật, một khóa học có thể được hiển thị cho trẻ em không thể xuất bản trừ khi tác giả có lần thẩm tra đạt, chưa hết hạn và đã xác nhận chính sách ứng xử',
    'console.nIjazah':
      'ai đã cấp ijazah cho ai, về điều gì, và bạn đã được cho xem những gì. Chỉ mình bạn được ghi nhận: chuỗi truyền thừa không phải là thứ nền tảng này có tư cách kiểm tra, nên sổ ghi là “đã ghi nhận”, không bao giờ là “đã xác minh”, và không gì ở đây hiển thị cho học viên',
    'console.nTranslations':
      'các chỉnh sửa do người nói ngôn ngữ đó gửi, mỗi chỉnh sửa được hiển thị cạnh dòng mà nó thay thế và cạnh văn bản của trang web đúng như đã được dựng. Chỉ mình bạn quyết định: chấp nhận một dòng không làm thay đổi trang web — khối văn bản dán vào mã nguồn mới làm việc đó — và một ngôn ngữ chỉ được mô tả là đã được đọc khi mọi phần của nó có một lượt đọc đã công bố — hoặc khi một người đã công bố lượt đọc toàn bộ văn bản — với mọi chỉnh sửa đã được quyết định',
    'console.nInstitutions':
      'các madrasa, trường học và tổ chức có trang riêng: mở một trang mới, kiểm tra bản ghi DNS đứng sau yêu cầu xác nhận tên miền, và đổi người quản trị. Một tổ chức thấy số lượng thành viên của chính mình và không bao giờ thấy tên một học viên, và không thể mua suất — việc xuất hóa đơn cần điều khoản và một nhà cung cấp mà chưa ai có',
    'console.nSponsorships':
      'học viên xin một khóa học, và nhà tài trợ trả tiền cho một khóa. Quyết định cần lý do bằng văn bản và ghi nhận một khoản thanh toán cần số tham chiếu; suất được tài trợ không phải là đơn hàng, nên không có thuế và không có thu nhập cho giáo viên',
    'console.nInvitations':
      'ai đã mời ai, lời mời mang lại gì và hạn mức hằng năm hay một lần hoàn tiền đã chặn điều gì. Cả hai phần thưởng đều là giảm giá khóa học — không có gì được chi trả, nên ở đây không có số dư',
    'console.nSupport':
      'các yêu cầu mọi người đã mở từ trang Trợ giúp. Tắt tính năng này sẽ dừng các yêu cầu mới; không đóng những yêu cầu đang xử lý',
    'console.nUsers':
      'mọi tài khoản trên nền tảng, tìm được theo tên hoặc email — tài khoản, không phải trẻ em',
    'console.nControls':
      'các con số đứng sau những tính năng đã bật. Chỉ hiển thị những con số thuộc vai trò của bạn, và mỗi thay đổi cần một lý do',
    'console.nReports':
      'các vấn đề người đọc đã gắn cờ trong một bài học hoặc một câu trả lời. Đóng một báo cáo cần ghi chú bằng văn bản',
    'console.nMedia':
      'mọi tệp gốc mà bất kỳ ai đã tải lên. Cách ly và rút lại đều cần lý do bằng văn bản',
    'console.nCourseReviews':
      'các đánh giá của học viên có kèm lời viết, được giữ lại cho đến khi có người đọc',
    'console.nDiscussion': 'câu hỏi của học viên và câu trả lời của bạn học được giữ lại để duyệt',
    'console.nBoards':
      'các bài đăng ở thảo luận của học viên và thảo luận của giáo viên mà ai đó đã báo cáo. Bài đăng ở đó hiển thị ngay, nên đây là nơi gỡ bài xuống. Xem ai đứng sau một tên người dùng cần có lý do và được ghi lại',
    'console.nAssistant':
      'nó đã được hỏi gì và các giới hạn đặt ra cho nó đã làm gì: những câu trả lời có dẫn một bài học, những câu hỏi được chuyển cho giáo viên, và những câu dùng để từ chối',
    'console.nConnections':
      'các tài khoản bên ngoài mà trang web này dùng (cơ sở dữ liệu, email, bộ lập lịch, lưu trữ, thanh toán) và những tài khoản nào còn chưa được kết nối. Chỉ dành cho chủ sở hữu; tên của các thiết lập còn thiếu, không bao giờ là giá trị',
    'console.nMessages':
      'những gì nền tảng lẽ ra sẽ gửi, ở dạng hoàn chỉnh và đã được ghi lại. Không có gì thực sự được gửi đi cho đến khi một nhà cung cấp được cấu hình',
    'console.nPlans': 'điều khoản có phiên bản, quyền lợi và giá định kỳ',
    'console.nPanels':
      'chủ sở hữu triệu tập một hội đồng và đặt số phiếu tối thiểu; nhân viên mở một vụ việc đối với một phiên bản chưa xuất bản; các thành viên biểu quyết và chủ tịch ghi nhận quyết định. Một vụ việc không thể đóng khi chưa đủ số phiếu tối thiểu, và khi governance.panel_required đang tắt thì không có gì phải chờ nó',
    'console.nTakedowns':
      'một thông báo giữ phiên bản mà nó nêu tên khỏi việc phân phối ngay khi được nhập — không gì bị xóa, nên quyết định vẫn còn bằng chứng. Giáo viên trả lời trên trang của chính mình, người quyết định là người khác với người đã tiếp nhận thông báo, và việc giữ lại không làm thay đổi khoản tiền nào',
    'console.nIncidents':
      'điều gì đã xảy ra, ai phải được báo và chậm nhất khi nào, và dòng thời gian theo diễn biến. Số lượng, không bao giờ là danh sách tên; mỗi thời hạn do một người nhập vì quy định khác nhau theo thị trường. Không gì ở đây phát hiện một vụ lộ dữ liệu và không gì gửi thông báo',
    'console.nPolicies':
      'mọi tài liệu cùng các phiên bản đã từng có hiệu lực và bản nháp đang chờ. Xuất bản cần ngày và lý do bằng văn bản, và bị từ chối khi trong văn bản còn đánh dấu một câu hỏi mà chỉ bạn trả lời được',
    'console.nCertificates': 'cấp chứng chỉ hoàn thành và ghi nhận việc thu hồi kèm lý do',
    'console.nAnalytics':
      'những gì mọi người làm, được lưu mãi mãi, theo sự kiện và theo ngày. Chỉ số liệu tổng hợp',
    'console.nGuardians': 'những người lớn xin được công nhận là cha mẹ của một đứa trẻ',
    'console.nAppeals':
      'giáo viên phản đối một quyết định từ chối. Bạn không thể quyết định khiếu nại đối với quyết định của chính mình',
    'console.nRoles':
      'ai được làm gì. Mọi phép kiểm tra trong cơ sở dữ liệu đều đọc những điều này',
  },
  th: {
    'console.nav': 'การดูแลระบบ',
    'console.nOrders':
      'คำสั่งซื้อเพียงกลุ่มเดียวที่ยอดรวมยังเปลี่ยนได้: บันทึกส่วนลด ภาษี ค่าธรรมเนียม หรือการปัดเศษให้คำสั่งซื้อ หรือถอนคำสั่งซื้อนั้น',
    'console.nRefunds': 'เงินที่ไหลกลับออกไป การอนุมัติคือข้อตกลง ไม่ใช่การโอนเงิน',
    'console.nAdjustments':
      'รายการแก้ไขทางบัญชีที่เพิ่มได้อย่างเดียวโดยไม่แก้ของเดิม และการเรียกคืนรายได้',
    'console.nReconciliation': 'แถวของรายการเดินบัญชีที่ลงนามแล้วเทียบกับบัญชีแยกประเภทภายใน',
    'console.nDisputes':
      'การปฏิเสธการชำระเงินมีกำหนดเวลา หากเลยกำหนด ผู้ให้บริการเป็นผู้ตัดสินว่าจะเกิดอะไรขึ้น',
    'console.nTax': 'สิ่งที่เรียกเก็บจากผู้ซื้อเพิ่มจากราคา ตามประเทศที่ผู้ซื้อซื้อ',
    'console.nRates': 'สกุลเงินหนึ่งมีค่าเท่าใดในอีกสกุลหนึ่ง เมื่อใด และใครเป็นผู้ระบุ',
    'console.nRevenue':
      'สิ่งที่ขายได้ในช่วงเวลาหนึ่ง แยกตามสกุลเงิน หลักสูตร แพ็กเกจ และครู โดยแสดงการคืนเงินไว้ข้างยอดขายและไม่หักออกแบบมองไม่เห็นเด็ดขาด',
    'console.nMoneyReport':
      'สิ่งที่เคลื่อนไหวในช่วงเวลาหนึ่ง ในสกุลเงินเดียวที่ใช้อ่านตัวเลขของแพลตฟอร์ม พร้อมอัตราแลกเปลี่ยนข้างตัวเลขทุกตัว',
    'console.nRenewals':
      'การสมัครสมาชิกที่ยังใช้งานอยู่ทุกรายการ ขยายไปข้างหน้าตามราคาที่ขายไว้ เป็นยอดที่ผูกพันไว้ ไม่ใช่ยอดที่ได้รับแล้ว — ตอนนี้ยังไม่มีสิ่งใดเรียกเก็บเงินค่าต่ออายุ',
    'console.nPayouts':
      'สิ่งที่ครูขอให้จ่าย และการพักเงินไว้เผื่อคืนเงิน ซึ่งกันไม่ให้เงินจากการขายออกไปในขณะที่ยังย้อนรายการได้',
    'console.nCourses':
      'ทุกหลักสูตร เปิดให้ใครบ้าง และมีผู้เรียนกี่คน การเปลี่ยนกลุ่มผู้เรียนของหลักสูตรจะถูกบันทึกในชื่อของคุณ พร้อมทั้งก่อนและหลังการเปลี่ยน',
    'console.nTeachers':
      'ผู้ที่ขอเป็นผู้สอน และทุกคนที่สอนที่นี่ได้ พร้อมสิ่งที่แต่ละคนเผยแพร่แล้วและจำนวนผู้เรียนในหลักสูตรของตน การอนุมัติคำขอคือการแต่งตั้ง: เป็นการมอบบทบาท และเหตุผลของคุณจะถูกบันทึกไว้กับผู้ขอ',
    'console.nAssign': 'หลักสูตรที่รอผู้ตรวจทาน',
    'console.nSubjects':
      'คำศัพท์ของรายการหลักสูตร: ผู้เรียนกรองตามอะไรได้ และป้ายบนการ์ดหลักสูตรบอกอะไรได้ วิชาที่หลักสูตรซึ่งเผยแพร่อยู่ใช้งานอยู่จะเลิกใช้ไม่ได้',
    'console.nReviewers':
      'ใครสมัครเป็นผู้ตรวจทาน ใครผ่านการตรวจสอบแล้ว และแต่ละคนตัดสินอะไรได้ จะไม่มีสิ่งใดเผยแพร่จนกว่าจะมีคนในนี้ได้รับการยืนยัน',
    'console.nScreenings':
      'ครูที่ได้รับแต่งตั้งทุกคน และมีการตรวจสอบเก็บไว้ในแฟ้มหรือไม่: ประเภทใด เมื่อใด หมดอายุเมื่อใด ใครบันทึก ข้อมูลอ้างอิงถึงเอกสารจะถูกเก็บไว้และไม่แสดงอีกเลย และแก้ไขบันทึกไม่ได้ — การตรวจสอบครั้งใหม่จะเข้ามาแทน ขณะที่ platform.safeguarding เปิดอยู่ หลักสูตรที่อาจแสดงให้เด็กเห็นจะเผยแพร่ไม่ได้ เว้นแต่ผู้เขียนมีการตรวจสอบที่ผ่านและยังไม่หมดอายุ และได้รับทราบนโยบายความประพฤติแล้ว',
    'console.nIjazah':
      'ใครอนุญาตใคร ในเรื่องใด และคุณได้เห็นอะไร คุณเท่านั้นที่เป็นผู้บันทึก: สายการถ่ายทอดไม่ใช่สิ่งที่แพลตฟอร์มนี้มีฐานะจะตรวจสอบได้ ทะเบียนจึงเขียนว่า “บันทึกแล้ว” ไม่เคยเขียนว่า “ยืนยันแล้ว” และไม่มีสิ่งใดในนี้ที่ผู้เรียนมองเห็น',
    'console.nTranslations':
      'การแก้ไขที่ผู้พูดภาษานั้นส่งมา แต่ละรายการแสดงเทียบกับบรรทัดที่จะถูกแทนและเทียบกับข้อความของเว็บไซต์ตามที่สร้างขึ้นจริง คุณเท่านั้นที่ตัดสิน: การรับบรรทัดหนึ่งไม่ได้เปลี่ยนเว็บไซต์ — ส่วนที่นำไปวางในโค้ดต่างหากที่เปลี่ยน — และจะเรียกว่าภาษาหนึ่งผ่านการอ่านแล้วก็ต่อเมื่อทุกส่วนของภาษานั้นมีการอ่านที่เผยแพร่แล้ว — หรือเมื่อมีคนหนึ่งเผยแพร่การอ่านข้อความทั้งหมด — โดยตัดสินการแก้ไขครบทุกรายการแล้ว',
    'console.nInstitutions':
      'มัดรอซะฮ์ โรงเรียน และองค์กรที่มีหน้าของตนเอง: เปิดแห่งใหม่ ตรวจสอบระเบียน DNS เบื้องหลังการอ้างสิทธิ์โดเมน และเปลี่ยนผู้ดูแล สถาบันเห็นจำนวนสมาชิกของตนเองและไม่เคยเห็นชื่อผู้เรียน และซื้อที่นั่งไม่ได้ — การออกใบแจ้งหนี้ต้องมีข้อกำหนดและผู้ให้บริการซึ่งยังไม่มีใครมี',
    'console.nSponsorships':
      'ผู้เรียนที่ขอหลักสูตร และผู้บริจาคที่จ่ายค่าหลักสูตร การตัดสินต้องมีเหตุผลเป็นลายลักษณ์อักษร และการบันทึกการชำระเงินต้องมีเลขอ้างอิง ที่นั่งที่มีผู้อุปถัมภ์ไม่ใช่คำสั่งซื้อ จึงไม่มีภาษีและไม่มีรายได้ของครู',
    'console.nInvitations':
      'ใครเชิญใคร ได้อะไรมา และเพดานรายปีหรือการคืนเงินหยุดอะไรไว้ รางวัลทั้งสองเป็นส่วนลดค่าหลักสูตร — ไม่มีการจ่ายเงินออก จึงไม่มียอดคงเหลือที่นี่',
    'console.nSupport':
      'คำขอที่ผู้คนเปิดจากหน้าช่วยเหลือ การปิดฟีเจอร์นี้หยุดคำขอใหม่ แต่ไม่ได้ปิดคำขอที่ค้างอยู่',
    'console.nUsers': 'ทุกบัญชีบนแพลตฟอร์ม ค้นหาได้ด้วยชื่อหรืออีเมล — เป็นบัญชี ไม่ใช่เด็ก',
    'console.nControls':
      'ตัวเลขเบื้องหลังฟีเจอร์ที่เปิดอยู่แล้ว แสดงเฉพาะรายการที่บทบาทของคุณเป็นเจ้าของ และทุกการเปลี่ยนแปลงต้องมีเหตุผล',
    'console.nReports':
      'ปัญหาที่ผู้อ่านแจ้งไว้ในบทเรียนหรือคำตอบ การปิดแต่ละเรื่องต้องมีบันทึกเป็นลายลักษณ์อักษร',
    'console.nMedia':
      'ไฟล์ต้นฉบับทุกไฟล์ที่ใครก็ตามอัปโหลด การกักกันและการถอนต่างต้องมีเหตุผลเป็นลายลักษณ์อักษร',
    'console.nCourseReviews': 'คะแนนจากผู้เรียนที่มีข้อความประกอบ กักไว้จนกว่าจะมีคนอ่าน',
    'console.nDiscussion': 'คำถามของผู้เรียนและคำตอบของเพื่อนผู้เรียนที่กักไว้รอตรวจ',
    'console.nBoards':
      'โพสต์ในการสนทนาของนักเรียนและการสนทนาของครูที่มีคนรายงาน โพสต์ที่นั่นแสดงทันที ที่นี่จึงเป็นที่ที่นำโพสต์ออก การดูว่าใครอยู่เบื้องหลังชื่อผู้ใช้ต้องมีเหตุผลและจะถูกบันทึก',
    'console.nAssistant':
      'มันถูกถามอะไร และขอบเขตที่กำหนดให้มันทำอะไรไป: คำตอบที่อ้างอิงบทเรียน คำถามที่ส่งต่อให้ครู และถ้อยคำที่ใช้ปฏิเสธ',
    'console.nConnections':
      'บัญชีภายนอกที่เว็บไซต์นี้ใช้ (ฐานข้อมูล อีเมล ตัวตั้งเวลา ที่เก็บข้อมูล การชำระเงิน) และบัญชีใดยังไม่ได้เชื่อมต่อ สำหรับเจ้าของเท่านั้น แสดงชื่อของการตั้งค่าที่ขาด ไม่แสดงค่าเด็ดขาด',
    'console.nMessages':
      'สิ่งที่แพลตฟอร์มจะส่ง ในรูปแบบสำเร็จและบันทึกไว้แล้ว จะไม่มีสิ่งใดถูกส่งออกจริงจนกว่าจะตั้งค่าผู้ให้บริการ',
    'console.nPlans': 'ข้อกำหนดที่มีเวอร์ชัน สิทธิ์การใช้งาน และราคาแบบเรียกเก็บซ้ำ',
    'console.nPanels':
      'เจ้าของตั้งคณะกรรมการและกำหนดองค์ประชุม เจ้าหน้าที่เปิดเรื่องต่อเวอร์ชันที่ยังไม่เผยแพร่ กรรมการลงคะแนนและประธานบันทึกมติ เรื่องจะปิดไม่ได้หากไม่ครบองค์ประชุม และเมื่อ governance.panel_required ปิดอยู่ จะไม่มีสิ่งใดรอเรื่องนี้',
    'console.nTakedowns':
      'หนังสือแจ้งจะกักเวอร์ชันที่ระบุไว้ไม่ให้เผยแพร่ทันทีที่บันทึกเข้า — ไม่มีสิ่งใดถูกลบ การตัดสินจึงยังมีหลักฐาน ครูตอบในหน้าของตนเอง ผู้ตัดสินเป็นคนอื่นที่ไม่ใช่ผู้รับหนังสือแจ้ง และการกักไว้ไม่เปลี่ยนแปลงเงินใด ๆ',
    'console.nIncidents':
      'เกิดอะไรขึ้น ต้องแจ้งใครและภายในเมื่อใด และลำดับเวลาตามที่เหตุการณ์ดำเนินไป เป็นจำนวน ไม่ใช่รายชื่อเด็ดขาด ทุกกำหนดเวลาพิมพ์โดยคน เพราะกฎต่างกันไปตามตลาด ไม่มีสิ่งใดในนี้ตรวจจับการรั่วไหลของข้อมูลและไม่มีสิ่งใดส่งการแจ้งเตือน',
    'console.nPolicies':
      'เอกสารทุกฉบับ พร้อมเวอร์ชันที่เคยมีผลบังคับใช้และฉบับร่างที่รออยู่ตอนนี้ การเผยแพร่ต้องมีวันที่และเหตุผลเป็นลายลักษณ์อักษร และจะถูกปฏิเสธตราบที่ในข้อความยังมีคำถามที่ทำเครื่องหมายไว้ซึ่งมีเพียงคุณที่ตอบได้',
    'console.nCertificates': 'ออกประกาศนียบัตรการเรียนจบ และบันทึกการเพิกถอนพร้อมเหตุผล',
    'console.nAnalytics':
      'สิ่งที่ผู้คนทำ เก็บไว้ตลอดไป แยกตามเหตุการณ์และตามวัน เป็นยอดรวมเท่านั้น',
    'console.nGuardians': 'ผู้ใหญ่ที่ขอให้ยอมรับว่าเป็นพ่อแม่ของเด็กคนหนึ่ง',
    'console.nAppeals': 'ครูที่โต้แย้งการปฏิเสธ คุณตัดสินคำอุทธรณ์ต่อคำตัดสินของคุณเองไม่ได้',
    'console.nRoles': 'ใครทำอะไรได้ การตรวจสอบทุกครั้งในฐานข้อมูลอ่านข้อมูลเหล่านี้',
  },
  fil: {
    'console.nav': 'Pangangasiwa',
    'console.nOrders':
      'ang tanging mga order na maaari pang magbago ang kabuuan: magtala ng diskwento, buwis, bayarin o pag-round sa isang order, o bawiin ang order',
    'console.nRefunds':
      'perang lumalabas pabalik. Ang pag-apruba ay isang kasunduan, hindi paglilipat ng pera',
    'console.nAdjustments':
      'mga pagwawasto sa accounting na idinadagdag lamang at walang binabago, at mga pagbawi ng kita',
    'console.nReconciliation':
      'mga hanay ng pinirmahang statement na itinatapat sa panloob na ledger',
    'console.nDisputes':
      'may takdang araw ang chargeback; kapag lumampas ito, ang provider ang magpapasya sa mangyayari',
    'console.nTax':
      'ang sinisingil sa mamimili bukod sa presyo, ayon sa bansang pinagbibilhan niya',
    'console.nRates':
      'kung magkano ang halaga ng isang pera sa iba pang pera, kailan, at sino ang nagsabi nito',
    'console.nRevenue':
      'ang naibenta sa isang panahon ayon sa pera, kurso, plano at guro, na katabi ng benta ang mga refund at hindi kailanman ibinabawas nang hindi nakikita',
    'console.nMoneyReport':
      'ang gumalaw sa isang panahon, sa iisang perang ginagamit sa pagbasa ng plataporma, na may palitan sa tabi ng bawat bilang',
    'console.nRenewals':
      'bawat aktibong subskripsyon na pinahaba pasulong sa presyong pinagbentahan nito. Ipinangako, hindi pa natatanggap — wala pang sumisingil ng renewal',
    'console.nPayouts':
      'ang hiniling ng mga guro na ibayad sa kanila, at ang pagpigil para sa refund na humahadlang sa paglabas ng pera ng isang benta habang maaari pa itong baligtarin',
    'console.nCourses':
      'bawat kurso, kung kanino ito bukas at kung ilan ang mag-aaral nito. Ang pagbabago ng audience ng isang kurso ay itinatala sa pangalan mo, kasama ang dati at ang bago',
    'console.nTeachers':
      'ang mga taong humihiling na magturo, at ang lahat ng maaaring magturo rito kasama ang nailathala ng bawat isa at kung ilan ang mag-aaral sa mga kurso nila. Ang pag-apruba ng aplikasyon ang mismong paghirang: ibinibigay nito ang tungkulin, at itinatala ang dahilan mo sa aplikante',
    'console.nAssign': 'mga kursong naghihintay ng tagasuri',
    'console.nSubjects':
      'ang bokabularyo ng katalogo: kung ano ang maaaring gamiting filter ng mag-aaral, at kung ano ang maaaring sabihin ng badge sa card ng kurso. Hindi maireretiro ang paksang ginagamit ng isang nailathalang kurso',
    'console.nReviewers':
      'kung sino ang nag-apply na magsuri, sino ang nasiyasat na, at kung ano ang maaaring hatulan ng bawat isa. Walang maiilathala hangga\'t walang napapatunayan dito',
    'console.nScreenings':
      'bawat hinirang na guro at kung may nakatalang pagsisiyasat: anong uri, kailan, kailan ito mawawalan ng bisa, sino ang nagtala. Iniingatan ang sanggunian sa dokumento at hindi na muling ipinapakita, at hindi mae-edit ang isang tala — pinapalitan ito ng bagong pagsisiyasat. Habang naka-on ang platform.safeguarding, hindi maiilathala ang kursong maaaring ipakita sa bata maliban kung ang may-akda nito ay may pumasa at hindi pa lipas na pagsisiyasat at kinilala na ang patakaran sa asal',
    'console.nIjazah':
      'kung sino ang nagbigay ng ijazah kanino, para saan, at kung ano ang ipinakita sa iyo. Ikaw lamang ang magtatala: ang kawing ng pagsasalin ay hindi bagay na may katayuan ang platapormang ito na suriin, kaya “naitala” ang sinasabi ng talaan, hindi kailanman “napatunayan”, at walang anuman dito ang nakikita ng mag-aaral',
    'console.nTranslations':
      'mga pagwawastong ipinadala ng mga taong nagsasalita ng wika, bawat isa ay ipinapakita katapat ng linyang papalitan nito at katapat ng teksto ng site ayon sa aktuwal na pagkakabuo. Ikaw lamang ang magpapasya: hindi binabago ng pagtanggap sa isang linya ang site — ang bloke na idinidikit sa code ang gumagawa niyon — at sinasabing nabasa na ang isang wika kapag lamang may nailathalang pagbasa ang bawat bahagi nito — o kapag naglathala ang isang tao ng pagbasa ng buong teksto — at napagpasyahan na ang bawat pagwawasto',
    'console.nInstitutions':
      'mga madrasa, paaralan at organisasyong may sariling pahina: magbukas ng bago, suriin ang DNS record sa likod ng pag-angkin ng domain, at palitan kung sino ang nangangasiwa nito. Nakikita ng institusyon ang bilang ng sarili nitong mga kasapi at hindi kailanman ang pangalan ng mag-aaral, at hindi ito makabibili ng mga puwesto — kailangan ng pag-iinvoice ng mga tuntunin at ng provider na wala pa kaninuman',
    'console.nSponsorships':
      'mga mag-aaral na humihiling ng kurso, at mga donor na nagbabayad para sa isang kurso. Kailangan ng nakasulat na dahilan ang pagpapasya at kailangan ng sanggunian ang pagtatala ng bayad; hindi order ang puwestong may sponsor, kaya wala itong buwis at walang kita ng guro',
    'console.nInvitations':
      'kung sino ang nag-imbita kanino, ano ang nakamit nito at ano ang pinigil ng taunang hangganan o ng isang refund. Parehong diskwento sa kurso ang dalawang gantimpala — walang ibinabayad palabas, kaya walang balanse rito',
    'console.nSupport':
      'mga hiling na binuksan ng mga tao mula sa Tulong. Pinipigil ng pag-off ng feature ang mga bago; hindi nito isinasara ang mga kasalukuyang inaasikaso',
    'console.nUsers':
      'bawat account sa plataporma, mahahanap ayon sa pangalan o email — mga account, hindi mga bata',
    'console.nControls':
      'ang mga bilang sa likod ng mga feature na naka-on na. Ang ipinapakita lamang ay ang mga sakop ng tungkulin mo, at kailangan ng dahilan ang bawat pagbabago',
    'console.nReports':
      'mga problemang minarkahan ng mga mambabasa sa isang aralin o sagot. Kailangan ng nakasulat na tala para isara ang isa',
    'console.nMedia':
      'bawat orihinal na file na in-upload ninuman. Kapwa nangangailangan ng nakasulat na dahilan ang quarantine at ang pagbawi',
    'console.nCourseReviews':
      'mga rating ng mag-aaral na may kasamang mga salita, pinipigil hanggang may makabasa',
    'console.nDiscussion':
      'mga tanong ng mag-aaral at mga sagot ng kapwa mag-aaral na pinipigil para masuri',
    'console.nBoards':
      'mga post sa talakayan ng mga mag-aaral at talakayan ng mga guro na may nag-ulat. Agad na ipinapakita ang post doon, kaya dito ito inaalis. Kailangan ng dahilan ang pagtingin kung sino ang nasa likod ng isang username, at itinatala ito',
    'console.nAssistant':
      'kung ano ang itinanong dito at kung ano ang ginawa ng mga hangganang itinakda para rito: mga sagot na sumipi ng aralin, mga tanong na ipinasa sa guro, at ang mga pariralang ginagamit sa pagtanggi',
    'console.nConnections':
      'ang mga panlabas na account na ginagamit ng site na ito (database, email, scheduler, storage, mga bayad) at kung alin ang hindi pa nakakonekta. Para sa may-ari lamang; mga pangalan ng kulang na setting, hindi kailanman halaga',
    'console.nMessages':
      'ang ipapadala sana ng plataporma, nasa huling anyo at naitala. Walang aktuwal na lumalabas hangga\'t walang naka-configure na provider',
    'console.nPlans':
      'mga tuntuning may bersyon, mga karapatan sa paggamit at paulit-ulit na presyo',
    'console.nPanels':
      'ang may-ari ang bumubuo ng lupon at nagtatakda ng korum nito; ang mga kawani ay nagbubukas ng kaso laban sa bersyong hindi pa nailalathala; bumoboto ang mga kasapi at itinatala ng tagapangulo ang pasya. Hindi maisasara ang kaso kapag kulang sa korum, at kapag naka-off ang governance.panel_required ay walang naghihintay rito',
    'console.nTakedowns':
      'pinipigil ng abiso ang bersyong binanggit nito mula sa pamamahagi sa sandaling maipasok ito — walang binubura, kaya may ebidensiya pa rin ang pasya. Sumasagot ang guro sa sarili niyang pahina, ibang tao sa tumanggap ng abiso ang nagpapasya, at walang binabagong pera ang pagpigil',
    'console.nIncidents':
      'kung ano ang nangyari, sino ang dapat sabihan at hanggang kailan, at ang takbo ng mga pangyayari habang nagaganap. Mga bilang, hindi kailanman listahan ng mga pangalan; tao ang nagta-type ng bawat takdang araw dahil nag-iiba ang tuntunin sa bawat merkado. Walang anuman dito ang nakatutuklas ng paglabag sa datos at walang nagpapadala ng abiso',
    'console.nPolicies':
      'bawat dokumento kasama ang mga bersyong naging may bisa at ang burador na naghihintay ngayon. Kailangan ng petsa at nakasulat na dahilan ang paglalathala, at tinatanggihan ito habang may tanong pang nakamarka sa teksto na ikaw lamang ang makasasagot',
    'console.nCertificates':
      'mag-isyu ng mga sertipiko ng pagtatapos at itala ang mga pagbawi nang may dahilan',
    'console.nAnalytics':
      'ang ginagawa ng mga tao, iniingatan magpakailanman, ayon sa pangyayari at ayon sa araw. Mga kabuuan lamang',
    'console.nGuardians':
      'mga nasa hustong gulang na humihiling na kilalanin bilang magulang ng isang bata',
    'console.nAppeals':
      'mga gurong tumututol sa isang pagtanggi. Hindi ka makapagpapasya sa apela laban sa sarili mong pasya',
    'console.nRoles':
      'kung sino ang maaaring gumawa ng ano. Ito ang binabasa ng bawat pagsusuri sa database',
  },
  uz: {
    'console.nav': 'Boshqaruv',
    'console.nOrders':
      'umumiy summasi hali oʻzgarishi mumkin boʻlgan yagona buyurtmalar: buyurtmaga chegirma, soliq, toʻlov haqi yoki yaxlitlashni qayd eting yoki buyurtmani qaytarib oling',
    'console.nRefunds':
      'tashqariga qaytib ketayotgan pul. Tasdiqlash — kelishuv, pul oʻtkazmasi emas',
    'console.nAdjustments':
      'faqat qoʻshiladigan, hech narsani oʻzgartirmaydigan buxgalteriya tuzatishlari va daromadni qaytarib olishlar',
    'console.nReconciliation':
      'imzolangan koʻchirma satrlarini ichki hisob daftari bilan solishtirish',
    'console.nDisputes':
      'toʻlovni qaytarib olish talabining muddati bor; u oʻtib ketsa, nima boʻlishini provayder hal qiladi',
    'console.nTax':
      'xaridordan narx ustiga olinadigan summa, u qaysi mamlakatdan xarid qilayotganiga qarab',
    'console.nRates': 'bir valyuta boshqasida qancha turgani, qachon va buni kim aytgani',
    'console.nRevenue':
      'davr ichida valyuta, kurs, tarif va oʻqituvchi boʻyicha nima sotilgani; qaytarilgan pullar savdo yonida turadi va hech qachon koʻzdan yashirin ayirilmaydi',
    'console.nMoneyReport':
      'davr ichida nima harakatlangani, platforma oʻqiladigan yagona valyutada, har bir raqam yonida kurs bilan',
    'console.nRenewals':
      'har bir amaldagi obuna, sotilgan narxida oldinga choʻzilgan. Vaʼda qilingan, olingan emas — hozircha hech narsa obunani yangilash uchun pul yechmaydi',
    'console.nPayouts':
      'oʻqituvchilar toʻlashni soʻragan summalar va pul qaytarish uchun ushlab turish: savdoni hali bekor qilish mumkin ekan, uning puli chiqib ketmaydi',
    'console.nCourses':
      'har bir kurs, u kimlarga ochiq va unda nechta oʻquvchi bor. Kurs auditoriyasini oʻzgartirish sizning nomingizga, oldingi va keyingi holati bilan qayd etiladi',
    'console.nTeachers':
      'dars berishni soʻrayotganlar va bu yerda dars bera oladigan har bir kishi, har biri nima nashr qilgani va kurslarida nechta oʻquvchi borligi bilan. Arizani tasdiqlash — tayinlashning oʻzi: u rolni beradi va sababingiz ariza beruvchi yonida qayd etiladi',
    'console.nAssign': 'taqrizchini kutayotgan kurslar',
    'console.nSubjects':
      'katalog lugʻati: oʻquvchi nima boʻyicha saralashi mumkinligi va kurs kartasidagi nishon nima deyishi mumkinligi. Nashr qilingan kurs foydalanayotgan fanni isteʼfoga chiqarib boʻlmaydi',
    'console.nReviewers':
      'kim taqriz qilishga ariza bergani, kim tekshirilgani va har biri nimani baholashi mumkinligi. Bu yerda kimdir tasdiqlanmaguncha hech narsa nashr qilinmaydi',
    'console.nScreenings':
      'har bir tayinlangan oʻqituvchi va tekshiruv qayd etilgan-etilmagani: qaysi turdagi, qachon, qachon muddati tugaydi, kim qayd etgan. Hujjatga havola saqlanadi va boshqa hech qachon koʻrsatilmaydi, yozuvni esa tahrirlab boʻlmaydi — yangi tekshiruv uning oʻrnini egallaydi. platform.safeguarding yoqilgan paytda, bolaga koʻrsatilishi mumkin boʻlgan kursni nashr qilib boʻlmaydi, agar muallifida oʻtgan, muddati tugamagan tekshiruv boʻlmasa va u odob siyosatini tan olmagan boʻlsa',
    'console.nIjazah':
      'kim kimga ijozat bergani, nima uchun va sizga nima koʻrsatilgani. Faqat siz qayd etasiz: rivoyat zanjiri bu platforma tekshirishga haqli boʻlgan narsa emas, shuning uchun roʻyxatda “qayd etilgan” deyiladi, hech qachon “tasdiqlangan” deyilmaydi va bu yerdagi hech narsa oʻquvchiga koʻrinmaydi',
    'console.nTranslations':
      'shu tilda gapiradigan odamlar yuborgan tuzatishlar, har biri oʻzi almashtiradigan satr va saytning haqiqatda yigʻilgan matni yonida koʻrsatiladi. Faqat siz hal qilasiz: satrni qabul qilish saytni oʻzgartirmaydi — buni kodga qoʻyiladigan blok qiladi — va til oʻqilgan deb faqat uning har bir qismida nashr etilgan oʻqish boʻlganda — yoki bir kishi butun matnning oʻqishini nashr etganda — va har bir tuzatish hal qilinganda aytiladi',
    'console.nInstitutions':
      'oʻz sahifasiga ega madrasalar, maktablar va tashkilotlar: yangisini oching, domen daʼvosi ortidagi DNS yozuvini tekshiring va uni kim boshqarishini oʻzgartiring. Muassasa oʻz aʼzolarining sonini koʻradi, hech qachon oʻquvchining ismini emas, va u oʻrin sotib ola olmaydi — hisob-faktura uchun shartlar va hech kimda yoʻq provayder kerak',
    'console.nSponsorships':
      'kurs soʻrayotgan oʻquvchilar va kurs uchun pul toʻlayotgan homiylar. Qaror uchun yozma sabab, toʻlovni qayd etish uchun esa maʼlumotnoma raqami kerak; homiylik oʻrni buyurtma emas, shuning uchun unda soliq ham, oʻqituvchi daromadi ham yoʻq',
    'console.nInvitations':
      'kim kimni taklif qilgani, bu nima bergani va yillik chegara yoki pul qaytarish nimani toʻxtatgani. Ikkala mukofot ham kursga chegirma — hech narsa toʻlab berilmaydi, shuning uchun bu yerda qoldiq yoʻq',
    'console.nSupport':
      'odamlar Yordam sahifasidan ochgan soʻrovlar. Funksiyani oʻchirish yangilarini toʻxtatadi; jarayondagilarini yopmaydi',
    'console.nUsers':
      'platformadagi har bir hisob, ism yoki email boʻyicha qidiriladi — hisoblar, bolalar emas',
    'console.nControls':
      'allaqachon yoqilgan funksiyalar ortidagi raqamlar. Faqat sizning rolingizga tegishlilari koʻrsatiladi va har bir oʻzgarish uchun sabab kerak',
    'console.nReports':
      'oʻquvchilar dars yoki javobda belgilagan muammolar. Birini yopish uchun yozma izoh kerak',
    'console.nMedia':
      'kimdir yuklagan har bir asl fayl. Karantin ham, qaytarib olish ham yozma sabab talab qiladi',
    'console.nCourseReviews': 'soʻzlari bor oʻquvchi baholari, kimdir oʻqimaguncha ushlab turiladi',
    'console.nDiscussion':
      'koʻrib chiqish uchun ushlab turilgan oʻquvchi savollari va tengdoshlar javoblari',
    'console.nBoards':
      'oʻquvchilar muhokamasi va oʻqituvchilar muhokamasidagi kimdir shikoyat qilgan postlar. U yerdagi post darhol koʻrsatiladi, shuning uchun post aynan shu yerda olib tashlanadi. Foydalanuvchi nomi ortida kim turganini koʻrish uchun sabab kerak va bu qayd etiladi',
    'console.nAssistant':
      'undan nima soʻralgani va unga qoʻyilgan chegaralar nima qilgani: darsdan iqtibos keltirgan javoblar, oʻqituvchiga yoʻnaltirilgan savollar va rad etish uchun ishlatiladigan iboralar',
    'console.nConnections':
      'bu sayt foydalanadigan tashqi hisoblar (maʼlumotlar bazasi, email, rejalashtiruvchi, saqlash joyi, toʻlovlar) va qaysilari hali ulanmagani. Faqat ega uchun; yetishmayotgan sozlamalarning nomlari, hech qachon qiymati emas',
    'console.nMessages':
      'platforma yuborishi kerak boʻlgan narsa, tayyor koʻrinishda va qayd etilgan. Provayder sozlanmaguncha haqiqatda hech narsa chiqib ketmaydi',
    'console.nPlans': 'versiyali shartlar, foydalanish huquqlari va takrorlanuvchi narxlar',
    'console.nPanels':
      'ega kengashni chaqiradi va uning kvorumini belgilaydi; xodimlar nashr qilinmagan versiya boʻyicha ish ochadi; aʼzolar ovoz beradi va rais qarorni qayd etadi. Kvorumsiz ishni yopib boʻlmaydi, governance.panel_required oʻchiq boʻlganda esa hech narsa uni kutmaydi',
    'console.nTakedowns':
      'bildirishnoma kiritilishi bilanoq unda koʻrsatilgan versiyani tarqatishdan ushlab qoladi — hech narsa oʻchirilmaydi, shuning uchun qarorning dalillari saqlanib qoladi. Oʻqituvchi oʻz sahifasida javob beradi, qarorni bildirishnomani qabul qilgan kishidan boshqa odam chiqaradi va ushlab turish hech qanday pulni oʻzgartirmaydi',
    'console.nIncidents':
      'nima boʻlgani, kimga va qachongacha xabar berish kerakligi hamda voqealarning borishi. Sonlar, hech qachon ismlar roʻyxati emas; har bir muddatni odam kiritadi, chunki qoida bozorga qarab farq qiladi. Bu yerdagi hech narsa maʼlumotlar sizib chiqishini aniqlamaydi va hech narsa bildirishnoma yubormaydi',
    'console.nPolicies':
      'har bir hujjat, amalda boʻlgan versiyalari va hozir kutayotgan qoralamasi bilan. Nashr qilish uchun sana va yozma sabab kerak, va matnda faqat siz javob bera oladigan savol hali belgilangan boʻlsa, u rad etiladi',
    'console.nCertificates':
      'kursni tugatganlik sertifikatlarini bering va bekor qilishlarni sababi bilan qayd eting',
    'console.nAnalytics':
      'odamlar nima qilayotgani, abadiy saqlanadi, hodisa va kun boʻyicha. Faqat jami sonlar',
    'console.nGuardians': 'bolaning ota-onasi deb tan olinishni soʻrayotgan kattalar',
    'console.nAppeals':
      'rad etishga eʼtiroz bildirayotgan oʻqituvchilar. Oʻz qaroringizga qarshi apellyatsiya boʻyicha qaror chiqara olmaysiz',
    'console.nRoles':
      'kim nima qila olishi. Maʼlumotlar bazasidagi har bir tekshiruv shularni oʻqiydi',
  },
  kk: {
    'console.nav': 'Әкімшілік',
    'console.nOrders':
      'жалпы сомасы әлі өзгеруі мүмкін жалғыз тапсырыстар: тапсырысқа жеңілдік, салық, алым немесе дөңгелектеуді тіркеңіз немесе тапсырысты кері алыңыз',
    'console.nRefunds': 'сыртқа қайта шығып жатқан ақша. Мақұлдау — келісім, ақша аударымы емес',
    'console.nAdjustments':
      'тек қосылатын, ештеңені өзгертпейтін бухгалтерлік түзетулер және табысты кері қайтарып алулар',
    'console.nReconciliation': 'қол қойылған үзінді көшірме жолдарын ішкі бас кітаппен салыстыру',
    'console.nDisputes':
      'төлемді кері қайтару талабының мерзімі бар; ол өтіп кетсе, не болатынын провайдер шешеді',
    'console.nTax':
      'сатып алушыдан бағаның үстіне алынатын сома, оның қай елден сатып алып жатқанына қарай',
    'console.nRates': 'бір валютаның басқа валютада қанша тұрғаны, қашан және оны кім айтқаны',
    'console.nRevenue':
      'кезең ішінде валюта, курс, тариф және мұғалім бойынша не сатылғаны; қайтарылған ақша сатылымның жанында тұрады және ешқашан көзден таса шегерілмейді',
    'console.nMoneyReport':
      'кезең ішінде не қозғалғаны, платформа оқылатын жалғыз валютада, әр санның жанында бағамымен',
    'console.nRenewals':
      'әрбір қолданыстағы жазылым, сатылған бағасымен алға қарай созылған. Уәде етілген, алынған емес — әзірге ештеңе жазылымды жаңарту үшін ақша алмайды',
    'console.nPayouts':
      'мұғалімдер төлеуді сұраған сомалар және ақшаны қайтаруға арналған ұстап тұру: сатылымды әлі кері қайтаруға болатын кезде оның ақшасы шығып кетпейді',
    'console.nCourses':
      'әрбір курс, ол кімдерге ашық және онда қанша оқушы бар. Курстың аудиториясын өзгерту сіздің атыңызға, бұрынғы және кейінгі күйімен бірге тіркеледі',
    'console.nTeachers':
      'сабақ беруді сұрап жатқан адамдар және осында сабақ бере алатын әрбір адам, әрқайсысының не жариялағаны және курстарында қанша оқушы бары көрсетіледі. Өтінімді мақұлдау — тағайындаудың өзі: ол рөлді береді, ал себебіңіз өтініш берушінің жанына тіркеледі',
    'console.nAssign': 'рецензентті күтіп тұрған курстар',
    'console.nSubjects':
      'каталогтың сөздігі: оқушы не бойынша сүзе алатыны және курс карточкасындағы белгі не айта алатыны. Жарияланған курс пайдаланып тұрған пәнді қолданыстан шығаруға болмайды',
    'console.nReviewers':
      'кім рецензиялауға өтініш бергені, кім тексерілгені және әрқайсысы нені бағалай алатыны. Осында біреу расталмайынша ештеңе жарияланбайды',
    'console.nScreenings':
      'әрбір тағайындалған мұғалім және тексеру тіркелген-тіркелмегені: қандай түрі, қашан, мерзімі қашан бітеді, кім тіркеген. Құжатқа сілтеме сақталады және ешқашан қайта көрсетілмейді, ал жазбаны өңдеуге болмайды — жаңа тексеру оның орнын басады. platform.safeguarding қосулы кезде, балаға көрсетілуі мүмкін курсты жариялауға болмайды, егер авторында өткен, мерзімі бітпеген тексеру болмаса және ол мінез-құлық саясатын мойындамаған болса',
    'console.nIjazah':
      'кім кімге иджаза бергені, не үшін және сізге не көрсетілгені. Тек сіз тіркейсіз: жеткізу тізбегі — бұл платформаның тексеруге құқығы бар нәрсе емес, сондықтан тізілімде «тіркелген» деп жазылады, ешқашан «расталған» деп жазылмайды, және мұндағы ештеңе оқушыға көрінбейді',
    'console.nTranslations':
      'сол тілде сөйлейтін адамдар жіберген түзетулер, әрқайсысы өзі алмастыратын жолдың және сайттың іс жүзінде құрастырылған мәтінінің жанында көрсетіледі. Тек сіз шешесіз: жолды қабылдау сайтты өзгертпейді — мұны кодқа қойылатын блок жасайды — және тіл оқылған деп тек оның әр бөлігінде жарияланған оқу болғанда — немесе бір адам бүкіл мәтіннің оқуын жариялағанда — және әр түзету шешілгенде айтылады',
    'console.nInstitutions':
      'өз беті бар медреселер, мектептер және ұйымдар: жаңасын ашыңыз, домен талабының артындағы DNS жазбасын тексеріңіз және оны кім басқаратынын өзгертіңіз. Мекеме өз мүшелерінің санын көреді, ешқашан оқушының атын емес, және ол орын сатып ала алмайды — шот-фактура үшін шарттар мен ешкімде жоқ провайдер керек',
    'console.nSponsorships':
      'курс сұрап жатқан оқушылар және курс үшін төлейтін демеушілер. Шешім қабылдау үшін жазбаша себеп, ал төлемді тіркеу үшін анықтама нөмірі керек; демеушілік орын тапсырыс емес, сондықтан онда салық та, мұғалім табысы да жоқ',
    'console.nInvitations':
      'кім кімді шақырғаны, ол не бергені және жылдық шек немесе ақшаны қайтару нені тоқтатқаны. Екі сыйақы да курсқа жеңілдік — ештеңе төленбейді, сондықтан мұнда қалдық жоқ',
    'console.nSupport':
      'адамдар Көмек бетінен ашқан сұраулар. Функцияны өшіру жаңаларын тоқтатады; қаралып жатқандарын жаппайды',
    'console.nUsers':
      'платформадағы әрбір тіркелгі, аты немесе email бойынша ізделеді — тіркелгілер, балалар емес',
    'console.nControls':
      'әлдеқашан қосулы функциялардың артындағы сандар. Тек сіздің рөліңізге тиесілілері көрсетіледі, және әр өзгеріс үшін себеп керек',
    'console.nReports':
      'оқырмандар сабақта немесе жауапта белгілеген мәселелер. Біреуін жабу үшін жазбаша ескертпе керек',
    'console.nMedia':
      'кез келген адам жүктеген әрбір түпнұсқа файл. Карантин де, кері алу да жазбаша себепті талап етеді',
    'console.nCourseReviews': 'сөздері бар оқушы бағалары, біреу оқығанша ұсталып тұрады',
    'console.nDiscussion': 'қарау үшін ұсталып тұрған оқушы сұрақтары мен құрдастардың жауаптары',
    'console.nBoards':
      'оқушылар талқылауы мен мұғалімдер талқылауындағы біреу шағымданған жазбалар. Ондағы жазба бірден көрсетіледі, сондықтан жазба дәл осы жерде алып тасталады. Пайдаланушы атының артында кім тұрғанын көру үшін себеп керек және ол тіркеледі',
    'console.nAssistant':
      'одан не сұралғаны және оған қойылған шектер не істегені: сабақтан дәйексөз келтірген жауаптар, мұғалімге жолданған сұрақтар және бас тарту үшін қолданылатын сөз тіркестері',
    'console.nConnections':
      'бұл сайт пайдаланатын сыртқы тіркелгілер (дерекқор, email, жоспарлағыш, сақтау орны, төлемдер) және қайсысы әлі қосылмағаны. Тек иесі үшін; жетіспейтін баптаулардың атаулары, ешқашан мәні емес',
    'console.nMessages':
      'платформа жіберетін нәрсе, дайын күйінде және тіркелген. Провайдер бапталмайынша іс жүзінде ештеңе шықпайды',
    'console.nPlans': 'нұсқалары бар шарттар, пайдалану құқықтары және қайталанатын бағалар',
    'console.nPanels':
      'иесі кеңесті шақырады және оның кворумын белгілейді; қызметкерлер жарияланбаған нұсқа бойынша іс ашады; мүшелер дауыс береді, ал төраға шешімді тіркейді. Кворумсыз істі жабуға болмайды, ал governance.panel_required өшірулі кезде оны ештеңе күтпейді',
    'console.nTakedowns':
      'хабарлама енгізілген сәтте-ақ онда аталған нұсқаны таратудан ұстап қалады — ештеңе жойылмайды, сондықтан шешімнің дәлелдері сақталады. Мұғалім өз бетінде жауап береді, шешімді хабарламаны қабылдаған адамнан басқа біреу шығарады, және ұстап тұру ешқандай ақшаны өзгертпейді',
    'console.nIncidents':
      'не болғаны, кімге және қашанға дейін хабарлау керектігі және оқиғалардың барысы. Сандар, ешқашан аттар тізімі емес; әр мерзімді адам енгізеді, өйткені ереже нарыққа қарай өзгереді. Мұндағы ештеңе деректердің таралып кетуін анықтамайды және ештеңе хабарлама жібермейді',
    'console.nPolicies':
      'әрбір құжат, күшінде болған нұсқаларымен және қазір күтіп тұрған жобасымен бірге. Жариялау үшін күн мен жазбаша себеп керек, және мәтінде тек сіз жауап бере алатын сұрақ әлі белгіленіп тұрса, ол қабылданбайды',
    'console.nCertificates':
      'курсты аяқтау сертификаттарын беріңіз және күшін жоюларды себебімен тіркеңіз',
    'console.nAnalytics':
      'адамдар не істейтіні, мәңгі сақталады, оқиға бойынша және күн бойынша. Тек жиынтық сандар',
    'console.nGuardians': 'баланың ата-анасы деп танылуды сұрап жатқан ересектер',
    'console.nAppeals':
      'бас тартуға қарсылық білдірген мұғалімдер. Өз шешіміңізге қарсы апелляция бойынша шешім шығара алмайсыз',
    'console.nRoles': 'кім не істей алатыны. Дерекқордағы әрбір тексеру осыларды оқиды',
  },
  az: {
    'console.nav': 'İdarəetmə',
    'console.nOrders':
      'yekun məbləği hələ dəyişə bilən yeganə sifarişlər: sifarişə endirim, vergi, haqq və ya yuvarlaqlaşdırma qeyd edin və ya sifarişi geri götürün',
    'console.nRefunds': 'geriyə, xaricə gedən pul. Təsdiq etmək razılaşmadır, köçürmə deyil',
    'console.nAdjustments':
      'yalnız əlavə olunan, heç nəyi dəyişməyən mühasibat düzəlişləri və qazancın geri alınması',
    'console.nReconciliation': 'imzalanmış çıxarış sətirlərinin daxili kitabla tutuşdurulması',
    'console.nDisputes':
      'ödənişin geri çağırılmasının son tarixi var; o keçərsə, nə olacağına provayder qərar verir',
    'console.nTax': 'alıcıdan qiymətin üstünə tutulan məbləğ, onun hansı ölkədən aldığına görə',
    'console.nRates':
      'bir valyutanın başqasında nə qədər dəyəri olduğu, nə vaxt və bunu kimin dediyi',
    'console.nRevenue':
      'dövr ərzində valyuta, kurs, tarif və müəllim üzrə nə satıldığı; geri qaytarılan pullar satışın yanında göstərilir və heç vaxt gözdən kənarda çıxılmır',
    'console.nMoneyReport':
      'dövr ərzində nəyin hərəkət etdiyi, platformanın oxunduğu tək valyutada, hər rəqəmin yanında məzənnə ilə',
    'console.nRenewals':
      'hər bir qüvvədə olan abunə, satıldığı qiymətlə irəliyə uzadılıb. Vəd olunub, alınmayıb — hələ heç nə abunənin yenilənməsi üçün pul tutmur',
    'console.nPayouts':
      'müəllimlərin ödənilməsini istədikləri məbləğlər və pulun qaytarılması üçün saxlama: satış hələ geri çevrilə bildiyi müddətdə onun pulu çıxmır',
    'console.nCourses':
      'hər bir kurs, kimlərə açıq olduğu və neçə öyrənəni olduğu. Kursun auditoriyasını dəyişmək sizin adınıza, əvvəlki və sonrakı vəziyyəti ilə birlikdə qeydə alınır',
    'console.nTeachers':
      'dərs demək istəyənlər və burada dərs deyə bilən hər kəs, hər birinin nə dərc etdiyi və kurslarında neçə öyrənən olduğu ilə birlikdə. Müraciəti təsdiq etmək elə təyinatın özüdür: o, rolu verir və səbəbiniz müraciət edənin yanında qeydə alınır',
    'console.nAssign': 'rəyçi gözləyən kurslar',
    'console.nSubjects':
      'kataloqun lüğəti: öyrənənin nəyə görə süzə biləcəyi və kurs kartındakı nişanın nə deyə biləcəyi. Dərc olunmuş kursun istifadə etdiyi fənni istifadədən çıxarmaq olmaz',
    'console.nReviewers':
      'kimin rəy vermək üçün müraciət etdiyi, kimin yoxlanıldığı və hər birinin nəyi qiymətləndirə biləcəyi. Burada kimsə təsdiqlənməyincə heç nə dərc olunmur',
    'console.nScreenings':
      'hər bir təyin olunmuş müəllim və yoxlamanın qeydə alınıb-alınmadığı: hansı növ, nə vaxt, nə vaxt bitir, kim qeydə alıb. Sənədə istinad saxlanılır və bir daha göstərilmir, qeydi isə redaktə etmək olmaz — yeni yoxlama onu əvəz edir. platform.safeguarding açıq olduğu müddətdə, uşağa göstərilə bilən kurs yalnız müəllifinin keçmiş, vaxtı bitməmiş yoxlaması olduqda və davranış siyasətini qəbul etdiyini bildirdikdə dərc oluna bilər',
    'console.nIjazah':
      'kimin kimə icazə verdiyi, nə üçün və sizə nəyin göstərildiyi. Yalnız siz qeydə alırsınız: nəqletmə silsiləsi bu platformanın yoxlamağa səlahiyyəti çatan bir şey deyil, ona görə reyestrdə “qeydə alınıb” yazılır, heç vaxt “təsdiqlənib” yazılmır və buradakı heç nə öyrənənə görünmür',
    'console.nTranslations':
      'həmin dildə danışan insanların göndərdiyi düzəlişlər, hər biri əvəz edəcəyi sətrin və saytın həqiqətən yığılmış mətninin yanında göstərilir. Yalnız siz qərar verirsiniz: sətri qəbul etmək saytı dəyişmir — bunu koda yapışdırılan blok edir — və dil yalnız onun hər hissəsinin dərc olunmuş oxunuşu olduqda — və ya bir nəfər bütün mətnin oxunuşunu dərc etdikdə — və hər düzəliş barədə qərar verildikdə oxunmuş sayılır',
    'console.nInstitutions':
      'öz səhifəsi olan mədrəsələr, məktəblər və təşkilatlar: yenisini açın, domen iddiasının arxasındakı DNS qeydini yoxlayın və onu kimin idarə etdiyini dəyişin. Qurum öz üzvlərinin sayını görür, heç vaxt öyrənənin adını yox, və yer ala bilmir — hesab-faktura üçün şərtlər və heç kimdə olmayan provayder lazımdır',
    'console.nSponsorships':
      'kurs istəyən öyrənənlər və kurs üçün ödəyən ianəçilər. Qərar vermək üçün yazılı səbəb, ödənişi qeydə almaq üçün isə istinad nömrəsi lazımdır; sponsorlu yer sifariş deyil, ona görə onda nə vergi, nə də müəllim qazancı var',
    'console.nInvitations':
      'kimin kimi dəvət etdiyi, bunun nə qazandırdığı və illik həddin və ya pulun qaytarılmasının nəyi dayandırdığı. Hər iki mükafat kursa endirimdir — heç nə ödənilmir, ona görə burada balans yoxdur',
    'console.nSupport':
      'insanların Kömək səhifəsindən açdığı sorğular. Funksiyanı söndürmək yenilərini dayandırır; icrada olanları bağlamır',
    'console.nUsers':
      'platformadakı hər bir hesab, ada və ya e-poçta görə axtarılır — hesablar, uşaqlar yox',
    'console.nControls':
      'artıq açıq olan funksiyaların arxasındakı rəqəmlər. Yalnız sizin rolunuza aid olanlar göstərilir və hər dəyişiklik üçün səbəb lazımdır',
    'console.nReports':
      'oxucuların dərsdə və ya cavabda qeyd etdiyi problemlər. Birini bağlamaq üçün yazılı qeyd lazımdır',
    'console.nMedia':
      'hər kəsin yüklədiyi hər bir orijinal fayl. Karantin də, geri götürmə də yazılı səbəb tələb edir',
    'console.nCourseReviews': 'sözləri olan öyrənən qiymətləri, kimsə oxuyana qədər saxlanılır',
    'console.nDiscussion': 'yoxlama üçün saxlanılan öyrənən sualları və yoldaş cavabları',
    'console.nBoards':
      'tələbələrin müzakirəsində və müəllimlərin müzakirəsində kiminsə şikayət etdiyi yazılar. Oradakı yazı dərhal göstərilir, ona görə yazı məhz burada götürülür. İstifadəçi adının arxasında kimin olduğunu görmək üçün səbəb lazımdır və bu qeydə alınır',
    'console.nAssistant':
      'ondan nə soruşulduğu və ona qoyulmuş hədlərin nə etdiyi: dərsdən sitat gətirən cavablar, müəllimə yönləndirilən suallar və imtina üçün istifadə olunan ifadələr',
    'console.nConnections':
      'bu saytın istifadə etdiyi kənar hesablar (verilənlər bazası, e-poçt, planlaşdırıcı, yaddaş, ödənişlər) və hansıların hələ qoşulmadığı. Yalnız sahib üçün; çatışmayan ayarların adları, heç vaxt dəyəri yox',
    'console.nMessages':
      'platformanın göndərəcəyi şey, hazır şəkildə və qeydə alınmış. Provayder qurulmayınca həqiqətdə heç nə çıxmır',
    'console.nPlans': 'versiyalı şərtlər, istifadə hüquqları və təkrarlanan qiymətlər',
    'console.nPanels':
      'sahib şuranı çağırır və onun yetərsayını müəyyən edir; əməkdaşlar dərc olunmamış versiyaya qarşı iş açır; üzvlər səs verir və sədr qərarı qeydə alır. Yetərsay olmadan iş bağlana bilməz, governance.panel_required söndürülmüş olduqda isə onu heç nə gözləmir',
    'console.nTakedowns':
      'bildiriş daxil edildiyi an onda adı çəkilən versiyanı yayımdan saxlayır — heç nə silinmir, ona görə qərarın sübutları qalır. Müəllim öz səhifəsində cavab verir, qərarı bildirişi qəbul edəndən başqa bir nəfər verir və saxlama heç bir pulu dəyişmir',
    'console.nIncidents':
      'nə baş verdiyi, kimə və nə vaxtadək xəbər verilməli olduğu və hadisələrin gedişi. Saylar, heç vaxt adlar siyahısı yox; hər son tarixi insan yazır, çünki qayda bazara görə dəyişir. Buradakı heç nə məlumat sızmasını aşkar etmir və heç nə bildiriş göndərmir',
    'console.nPolicies':
      'hər bir sənəd, qüvvədə olmuş versiyaları və indi gözləyən layihəsi ilə birlikdə. Dərc etmək üçün tarix və yazılı səbəb lazımdır və mətndə yalnız sizin cavab verə biləcəyiniz sual hələ işarələnmişdirsə, rədd edilir',
    'console.nCertificates': 'kursu bitirmə sertifikatları verin və ləğvləri səbəbi ilə qeydə alın',
    'console.nAnalytics':
      'insanların nə etdiyi, həmişəlik saxlanılır, hadisə və gün üzrə. Yalnız yekun rəqəmlər',
    'console.nGuardians': 'uşağın valideyni kimi tanınmasını istəyən böyüklər',
    'console.nAppeals':
      'imtinaya etiraz edən müəllimlər. Öz qərarınıza qarşı apellyasiya üzrə qərar verə bilməzsiniz',
    'console.nRoles': 'kimin nə edə biləcəyi. Verilənlər bazasındakı hər yoxlama bunları oxuyur',
  },
  tg: {
    'console.nav': 'Маъмурият',
    'console.nOrders':
      'ягона фармоишҳое, ки маблағи умумиашон ҳанӯз метавонад тағйир ёбад: ба фармоиш тахфиф, андоз, ҳаққи хизмат ё яклухткуниро сабт кунед ё фармоишро бозпас гиред',
    'console.nRefunds': 'пуле, ки бозпас берун меравад. Тасдиқ кардан созиш аст, на интиқоли пул',
    'console.nAdjustments':
      'ислоҳҳои муҳосибӣ, ки танҳо илова мешаванд ва чизеро тағйир намедиҳанд, ва бозпасгирии даромад',
    'console.nReconciliation': 'сатрҳои иқтибосҳои имзошуда дар муқоиса бо дафтари дохилии ҳисоб',
    'console.nDisputes':
      'талаби бозпас гирифтани пардохт мӯҳлат дорад; агар он гузарад, провайдер ҳал мекунад, ки чӣ мешавад',
    'console.nTax':
      'он чи аз харидор болои нарх гирифта мешавад, вобаста ба кишваре, ки аз он харид мекунад',
    'console.nRates': 'як асъор бо асъори дигар чӣ қадар арзиш дошт, кай ва инро кӣ гуфт',
    'console.nRevenue':
      'он чи дар давра аз рӯи асъор, курс, нақша ва муаллим фурӯхта шуд; маблағҳои баргардонидашуда дар паҳлӯи фурӯш меистанд ва ҳеҷ гоҳ пинҳонӣ тарҳ карда намешаванд',
    'console.nMoneyReport':
      'он чи дар давра ҳаракат кард, бо ягона асъоре, ки платформа бо он хонда мешавад, бо қурб дар паҳлӯи ҳар рақам',
    'console.nRenewals':
      'ҳар обунаи амалкунанда, ки бо нархи фурӯхташудааш ба пеш дароз карда шудааст. Ваъда шудааст, гирифта нашудааст — ҳоло ҳеҷ чиз барои таҷдиди обуна пул намегирад',
    'console.nPayouts':
      'он чи муаллимон пардохташро хостаанд ва нигоҳдорӣ барои баргардонидани маблағ: то даме ки фурӯшро ҳанӯз бекор кардан мумкин аст, пули он берун намеравад',
    'console.nCourses':
      'ҳар курс, барои кӣ кушода аст ва чанд омӯзанда дорад. Тағйир додани шунавандагони курс ба номи шумо, бо ҳолати пеш ва пас, сабт мешавад',
    'console.nTeachers':
      'одамоне, ки дарс доданро мехоҳанд, ва ҳар касе, ки ин ҷо дарс дода метавонад, бо он чи ҳар кадом нашр кардааст ва чанд омӯзанда дар курсҳояшон ҳаст. Тасдиқи дархост худи таъинот аст: он нақшро медиҳад ва сабаби шумо дар назди дархосткунанда сабт мешавад',
    'console.nAssign': 'курсҳое, ки бознигарро интизоранд',
    'console.nSubjects':
      'луғати феҳристи курсҳо: омӯзанда аз рӯи чӣ филтр карда метавонад ва нишон дар корти курс чӣ гуфта метавонад. Фанеро, ки курси нашршуда истифода мебарад, аз истифода баровардан мумкин нест',
    'console.nReviewers':
      'кӣ барои бознигарӣ дархост додааст, кӣ санҷида шудааст ва ҳар кадом чиро баҳо дода метавонад. То даме ки ин ҷо касе тасдиқ нашавад, ҳеҷ чиз нашр намешавад',
    'console.nScreenings':
      'ҳар муаллими таъиншуда ва оё санҷиш сабт шудааст: кадом навъ, кай, кай мӯҳлаташ тамом мешавад, кӣ сабт кардааст. Истинод ба ҳуҷҷат нигоҳ дошта мешавад ва дигар ҳеҷ гоҳ нишон дода намешавад, ва сабтро таҳрир кардан мумкин нест — санҷиши нав ҷои онро мегирад. То даме ки platform.safeguarding фаъол аст, курсеро, ки ба кӯдак нишон додан мумкин аст, нашр кардан мумкин нест, магар ин ки муаллифи он санҷиши гузашта ва мӯҳлаташ тамомнашуда дошта бошад ва сиёсати рафторро эътироф карда бошад',
    'console.nIjazah':
      'кӣ ба кӣ иҷозат додааст, барои чӣ ва ба шумо чӣ нишон дода шуд. Танҳо шумо сабт мекунед: силсилаи ривоят чизе нест, ки ин платформа салоҳияти санҷидани онро дошта бошад, бинобар ин дар феҳрист «сабт шудааст» навишта мешавад, ҳеҷ гоҳ «тасдиқ шудааст» навишта намешавад, ва ҳеҷ чизи ин ҷо ба омӯзанда намоён нест',
    'console.nTranslations':
      'ислоҳҳое, ки гӯяндагони забон фиристодаанд, ҳар кадом дар баробари сатре, ки иваз мекунад, ва дар баробари матни сомона, чунон ки воқеан сохта шудааст, нишон дода мешавад. Танҳо шумо қарор медиҳед: қабули сатр сомонаро тағйир намедиҳад — инро блоке, ки ба код гузошта мешавад, мекунад — ва забон танҳо вақте хондашуда номида мешавад, ки ҳар қисми он хониши нашршуда дошта бошад — ё як кас хониши тамоми матнро нашр карда бошад — ва дар бораи ҳар ислоҳ қарор қабул шуда бошад',
    'console.nInstitutions':
      'мадрасаҳо, мактабҳо ва ташкилотҳое, ки саҳифаи худро доранд: навашро кушоед, сабти DNS-ро, ки дар паси даъвои домен аст, санҷед ва иваз кунед, ки онро кӣ идора мекунад. Муассиса шумораи аъзои худро мебинад ва ҳеҷ гоҳ номи омӯзандаро не, ва ҷой харида наметавонад — барои ҳисобнома-фактура шартҳо ва провайдере лозим аст, ки ҳеҷ кас надорад',
    'console.nSponsorships':
      'омӯзандагоне, ки курс мепурсанд, ва хайрхоҳоне, ки барои курс пардохт мекунанд. Барои қарор сабаби хаттӣ ва барои сабти пардохт рақами истинод лозим аст; ҷойи сарпарастӣ фармоиш нест, бинобар ин на андоз дорад ва на даромади муаллим',
    'console.nInvitations':
      'кӣ киро даъват кард, он чӣ ба даст овард ва ҳадди солона ё баргардонидани маблағ чиро боздошт. Ҳар ду мукофот тахфиф ба курс аст — ҳеҷ чиз пардохта намешавад, бинобар ин ин ҷо бақия нест',
    'console.nSupport':
      'дархостҳое, ки одамон аз саҳифаи Кумак кушодаанд. Хомӯш кардани хусусият дархостҳои навро бозмедорад; онҳоеро, ки дар ҷараёнанд, намебандад',
    'console.nUsers':
      'ҳар ҳисоб дар платформа, ки аз рӯи ном ё почтаи электронӣ ҷустуҷӯ мешавад — ҳисобҳо, на кӯдакон',
    'console.nControls':
      'рақамҳое, ки дар паси хусусиятҳои аллакай фаъол ҳастанд. Танҳо онҳое нишон дода мешаванд, ки ба нақши шумо тааллуқ доранд, ва ҳар тағйир сабаб мехоҳад',
    'console.nReports':
      'мушкилоте, ки хонандагон дар дарс ё ҷавоб қайд кардаанд. Барои бастани яке қайди хаттӣ лозим аст',
    'console.nMedia':
      'ҳар файли аслие, ки касе бор кардааст. Ҳам карантин ва ҳам бозпасгирӣ сабаби хаттӣ мехоҳанд',
    'console.nCourseReviews':
      'баҳоҳои омӯзандагон, ки калима доранд, то хондани касе нигоҳ дошта мешаванд',
    'console.nDiscussion':
      'саволҳои омӯзандагон ва ҷавобҳои ҳамсабақон, ки барои баррасӣ нигоҳ дошта шудаанд',
    'console.nBoards':
      'навиштаҳо дар муҳокимаи донишомӯзон ва муҳокимаи муаллимон, ки касе аз онҳо шикоят кардааст. Навишта он ҷо дарҳол нишон дода мешавад, бинобар ин маҳз ин ҷо бардошта мешавад. Барои дидани он ки дар паси номи корбар кӣ ҳаст, сабаб лозим аст ва ин сабт мешавад',
    'console.nAssistant':
      'аз он чӣ пурсида шуд ва ҳудудҳои барояш гузошташуда чӣ карданд: ҷавобҳое, ки аз дарс иқтибос оварданд, саволҳое, ки ба муаллим равона шуданд, ва ибораҳое, ки барои рад кардан истифода мешаванд',
    'console.nConnections':
      'ҳисобҳои берунае, ки ин сомона истифода мебарад (пойгоҳи додаҳо, почтаи электронӣ, банақшагир, анбор, пардохтҳо) ва кадомашон ҳанӯз пайваст нашудаанд. Танҳо барои соҳиб; номҳои танзимоти намерасида, ҳеҷ гоҳ қимат не',
    'console.nMessages':
      'он чи платформа мефиристод, дар шакли тайёр ва сабтшуда. То танзим шудани провайдер воқеан ҳеҷ чиз берун намеравад',
    'console.nPlans': 'шартҳои дорои версия, ҳуқуқҳои истифода ва нархҳои такроршаванда',
    'console.nPanels':
      'соҳиб шӯроро даъват мекунад ва кворуми онро муайян мекунад; кормандон нисбат ба версияи нашрнашуда парванда мекушоянд; аъзо овоз медиҳанд ва раис қарорро сабт мекунад. Парвандаро бе кворум бастан мумкин нест, ва ҳангоме ки governance.panel_required хомӯш аст, ҳеҷ чиз онро интизор намешавад',
    'console.nTakedowns':
      'огоҳинома версияи дар он номбаршударо аз паҳнкунӣ ҳамон лаҳзае, ки ворид мешавад, боз медорад — ҳеҷ чиз нест карда намешавад, бинобар ин қарор ҳанӯз далелҳои худро дорад. Муаллим дар саҳифаи худ ҷавоб медиҳад, қарорро шахси дигаре ғайр аз қабулкунандаи огоҳинома мебарорад, ва нигоҳдорӣ ҳеҷ пулеро тағйир намедиҳад',
    'console.nIncidents':
      'чӣ рӯй дод, ба кӣ ва то кай бояд хабар дода шавад, ва ҷараёни рӯйдодҳо, чунон ки мегузаранд. Шумораҳо, ҳеҷ гоҳ рӯйхати номҳо не; ҳар мӯҳлатро одам менависад, зеро қоида вобаста ба бозор фарқ мекунад. Ҳеҷ чизи ин ҷо ифшои додаҳоро ошкор намекунад ва ҳеҷ чиз огоҳинома намефиристад',
    'console.nPolicies':
      'ҳар ҳуҷҷат бо версияҳое, ки дар амал буданд, ва лоиҳае, ки ҳоло интизор аст. Барои нашр сана ва сабаби хаттӣ лозим аст, ва то даме ки дар матн саволе, ки танҳо шумо ҷавоб дода метавонед, ҳанӯз қайд шудааст, он рад мешавад',
    'console.nCertificates':
      'шаҳодатномаҳои хатми курсро диҳед ва бекоркуниҳоро бо сабаб сабт кунед',
    'console.nAnalytics':
      'он чи одамон мекунанд, ҳамеша нигоҳ дошта мешавад, аз рӯи рӯйдод ва аз рӯи рӯз. Танҳо ҷамъбастҳо',
    'console.nGuardians': 'калонсолоне, ки мехоҳанд ҳамчун волидайни кӯдак эътироф шаванд',
    'console.nAppeals':
      'муаллимоне, ки ба радкунӣ эътироз мекунанд. Шумо наметавонед дар бораи эътироз ба қарори худатон қарор диҳед',
    'console.nRoles': 'кӣ чӣ карда метавонад. Ҳар санҷиш дар пойгоҳи додаҳо инҳоро мехонад',
  },
  ky: {
    'console.nav': 'Башкаруу',
    'console.nOrders':
      'жалпы суммасы дагы эле өзгөрүшү мүмкүн болгон жалгыз буйрутмалар: буйрутмага арзандатуу, салык, акы же тегеректөөнү каттаңыз же буйрутманы кайра алыңыз',
    'console.nRefunds': 'сыртка кайра чыгып жаткан акча. Бекитүү — макулдашуу, акча которуу эмес',
    'console.nAdjustments':
      'жөн гана кошула турган, эч нерсени өзгөртпөгөн бухгалтердик оңдоолор жана кирешени кайра кайтарып алуулар',
    'console.nReconciliation':
      'кол коюлган көчүрмөлөрдүн саптарын ички эсеп китеби менен салыштыруу',
    'console.nDisputes':
      'төлөмдү кайра талап кылуунун мөөнөтү бар; ал өтүп кетсе, эмне болорун провайдер чечет',
    'console.nTax':
      'сатып алуучудан баанын үстүнө алынуучу сумма, ал кайсы өлкөдөн сатып алып жатканына жараша',
    'console.nRates': 'бир валюта башкасында канча турганы, качан жана аны ким айтканы',
    'console.nRevenue':
      'мезгил ичинде валюта, курс, тариф жана мугалим боюнча эмне сатылганы; кайтарылган акчалар сатуунун жанында турат жана эч качан көзгө көрүнбөй кемитилбейт',
    'console.nMoneyReport':
      'мезгил ичинде эмне жылганы, платформа окула турган бирден-бир валютада, ар бир сандын жанында курсу менен',
    'console.nRenewals':
      'ар бир күчүндөгү жазылуу, сатылган баасы менен алдыга созулган. Убада кылынган, алынган эмес — азырынча эч нерсе жазылууну жаңыртуу үчүн акча албайт',
    'console.nPayouts':
      'мугалимдер төлөп берүүнү сураган суммалар жана акчаны кайтаруу үчүн кармап туруу: сатууну дагы эле артка кайтарууга мүмкүн болуп турганда анын акчасы чыгып кетпейт',
    'console.nCourses':
      'ар бир курс, ал кимдерге ачык жана анда канча окуучу бар. Курстун аудиториясын өзгөртүү сиздин атыңызга, мурунку жана кийинки абалы менен катталат',
    'console.nTeachers':
      'сабак берүүнү сурап жаткан адамдар жана бул жерде сабак бере алган ар бир адам, ар бири эмне жарыялаганы жана курстарында канча окуучу бары менен. Арызды бекитүү — дайындоонун өзү: ал ролду берет, ал эми себебиңиз арыз берүүчүнүн жанына катталат',
    'console.nAssign': 'рецензентти күтүп жаткан курстар',
    'console.nSubjects':
      'каталогдун сөздүгү: окуучу эмне боюнча чыпкалай алары жана курстун карточкасындагы белги эмне айта алары. Жарыяланган курс колдонуп жаткан предметти колдонуудан чыгарууга болбойт',
    'console.nReviewers':
      'ким рецензиялоого арыз бергени, ким текшерилгени жана ар бири эмнени баалай алары. Бул жерде кимдир бирөө ырасталмайынча эч нерсе жарыяланбайт',
    'console.nScreenings':
      'ар бир дайындалган мугалим жана текшерүү катталганбы: кайсы түрү, качан, мөөнөтү качан бүтөт, ким каттаган. Документке шилтеме сакталат жана эч качан кайра көрсөтүлбөйт, ал эми жазууну оңдоого болбойт — жаңы текшерүү анын ордун ээлейт. platform.safeguarding күйүп турганда, балага көрсөтүлүшү мүмкүн болгон курсту жарыялоого болбойт, эгер авторунда өткөн, мөөнөтү бүтө элек текшерүү болбосо жана ал жүрүм-турум саясатын тааныбаса',
    'console.nIjazah':
      'ким кимге ижаза бергени, эмне үчүн жана сизге эмне көрсөтүлгөнү. Жалгыз сиз каттайсыз: жеткирүү чынжыры бул платформанын текшерүүгө акысы бар нерсе эмес, ошондуктан реестрде «катталган» деп жазылат, эч качан «ырасталган» деп жазылбайт, жана бул жердеги эч нерсе окуучуга көрүнбөйт',
    'console.nTranslations':
      'ошол тилде сүйлөгөн адамдар жөнөткөн оңдоолор, ар бири өзү алмаштыра турган саптын жана сайттын иш жүзүндө курулган текстинин жанында көрсөтүлөт. Жалгыз сиз чечесиз: сапты кабыл алуу сайтты өзгөртпөйт — муну кодго коюла турган блок жасайт — жана тил анын ар бир бөлүгүндө жарыяланган окуу болгондо гана — же бир адам бүт тексттин окуусун жарыялаганда гана — жана ар бир оңдоо чечилгенде окулган деп айтылат',
    'console.nInstitutions':
      'өз барагы бар медреселер, мектептер жана уюмдар: жаңысын ачыңыз, домен талабынын артындагы DNS жазуусун текшериңиз жана аны ким башкарарын өзгөртүңүз. Мекеме өз мүчөлөрүнүн санын көрөт, эч качан окуучунун атын эмес, жана ал орун сатып ала албайт — эсеп-фактура үчүн шарттар жана эч кимде жок провайдер керек',
    'console.nSponsorships':
      'курс сурап жаткан окуучулар жана курс үчүн төлөгөн демөөрчүлөр. Чечим чыгаруу үчүн жазуу жүзүндөгү себеп, ал эми төлөмдү каттоо үчүн маалымдама номери керек; демөөрчүлүк орун буйрутма эмес, ошондуктан анда салык да, мугалимдин кирешеси да жок',
    'console.nInvitations':
      'ким кимди чакырганы, ал эмне бергени жана жылдык чек же акчаны кайтаруу эмнени токтоткону. Эки сыйлык тең курска арзандатуу — эч нерсе төлөнүп берилбейт, ошондуктан бул жерде калдык жок',
    'console.nSupport':
      'адамдар Жардам барагынан ачкан сурамдар. Функцияны өчүрүү жаңыларын токтотот; каралып жаткандарын жаппайт',
    'console.nUsers':
      'платформадагы ар бир аккаунт, аты же email боюнча изделет — аккаунттар, балдар эмес',
    'console.nControls':
      'эчак күйүп турган функциялардын артындагы сандар. Сиздин ролуңузга тиешелүүлөрү гана көрсөтүлөт, жана ар бир өзгөртүү үчүн себеп керек',
    'console.nReports':
      'окурмандар сабакта же жоопто белгилеген көйгөйлөр. Бирөөнү жабуу үчүн жазуу жүзүндөгү эскертме керек',
    'console.nMedia':
      'кимдир бирөө жүктөгөн ар бир түпнуска файл. Карантин да, кайра алуу да жазуу жүзүндөгү себепти талап кылат',
    'console.nCourseReviews':
      'сөздөрү бар окуучу баалары, кимдир бирөө окуганга чейин кармалып турат',
    'console.nDiscussion':
      'кароо үчүн кармалып турган окуучулардын суроолору жана курдаштардын жооптору',
    'console.nBoards':
      'окуучулардын талкуусундагы жана мугалимдердин талкуусундагы кимдир бирөө арызданган жазуулар. Ал жактагы жазуу дароо көрсөтүлөт, ошондуктан жазуу дал ушул жерде алынып салынат. Колдонуучу атынын артында ким турганын көрүү үчүн себеп керек жана ал катталат',
    'console.nAssistant':
      'андан эмне суралганы жана ага коюлган чектер эмне кылганы: сабактан цитата келтирген жооптор, мугалимге жөнөтүлгөн суроолор жана баш тартуу үчүн колдонулган сөз айкаштары',
    'console.nConnections':
      'бул сайт колдонгон сырткы аккаунттар (маалымат базасы, email, пландагыч, сактагыч, төлөмдөр) жана кайсынысы али туташтырыла элек. Ээси үчүн гана; жетишпеген жөндөөлөрдүн аттары, эч качан мааниси эмес',
    'console.nMessages':
      'платформа жөнөтө турган нерсе, даяр түрүндө жана катталган. Провайдер жөндөлмөйүнчө иш жүзүндө эч нерсе чыкпайт',
    'console.nPlans': 'версиялары бар шарттар, пайдалануу укуктары жана кайталануучу баалар',
    'console.nPanels':
      'ээси кеңешти чакырат жана анын кворумун белгилейт; кызматкерлер жарыялана элек версия боюнча иш ачат; мүчөлөр добуш берет, ал эми төрага чечимди каттайт. Кворумсуз ишти жабууга болбойт, ал эми governance.panel_required өчүк болгондо аны эч нерсе күтпөйт',
    'console.nTakedowns':
      'билдирүү киргизилген заматта эле анда аталган версияны таратуудан кармап калат — эч нерсе өчүрүлбөйт, ошондуктан чечимдин далилдери сакталат. Мугалим өз барагында жооп берет, чечимди билдирүүнү кабыл алган адамдан башка бирөө чыгарат, жана кармап туруу эч кандай акчаны өзгөртпөйт',
    'console.nIncidents':
      'эмне болгону, кимге жана качанга чейин кабарлоо керектиги жана окуялардын жүрүшү. Сандар, эч качан аттардын тизмеси эмес; ар бир мөөнөттү адам киргизет, анткени эреже рынокко жараша айырмаланат. Бул жердеги эч нерсе маалыматтардын чыгып кетишин аныктабайт жана эч нерсе билдирүү жөнөтпөйт',
    'console.nPolicies':
      'ар бир документ, күчүндө болгон версиялары жана азыр күтүп турган долбоору менен. Жарыялоо үчүн дата жана жазуу жүзүндөгү себеп керек, жана текстте сиз гана жооп бере ала турган суроо дагы эле белгиленип турса, ал четке кагылат',
    'console.nCertificates':
      'курсту бүтүрүү сертификаттарын бериңиз жана жокко чыгарууларды себеби менен каттаңыз',
    'console.nAnalytics':
      'адамдар эмне кылары, түбөлүк сакталат, окуя боюнча жана күн боюнча. Жыйынтык сандар гана',
    'console.nGuardians': 'баланын ата-энеси катары таанылууну сурап жаткан чоңдор',
    'console.nAppeals':
      'баш тартууга каршы чыккан мугалимдер. Өз чечимиңизге каршы апелляция боюнча чечим чыгара албайсыз',
    'console.nRoles': 'ким эмне кыла алары. Маалымат базасындагы ар бир текшерүү ушуларды окуйт',
  },
  tk: {
    'console.nav': 'Dolandyryş',
    'console.nOrders':
      'jemi henizem üýtgäp bilýän ýeke-täk sargytlar: sargyda arzanladyş, salgyt, töleg haky ýa-da tegelekleme ýazga geçiriň ýa-da sargydy yzyna alyň',
    'console.nRefunds': 'yzyna, daşaryk gidýän pul. Tassyklamak ylalaşykdyr, pul geçirimi däl',
    'console.nAdjustments':
      'diňe goşulýan, hiç zady üýtgetmeýän hasapçylyk düzedişleri we girdejiniň yzyna alynmagy',
    'console.nReconciliation':
      'gol çekilen göçürmeleriň setirlerini içerki hasap kitaby bilen deňeşdirmek',
    'console.nDisputes':
      'tölegi yzyna talap etmegiň möhleti bar; ol geçse, näme boljagyny üpjün ediji çözýär',
    'console.nTax':
      'alyjydan bahanyň üstüne alynýan pul, onuň haýsy ýurtdan satyn alýandygyna görä',
    'console.nRates': 'bir puluň beýleki pulda näçe durandygy, haçan we muny kimiň aýdandygy',
    'console.nRevenue':
      'döwrüň içinde pul birligi, kurs, meýilnama we mugallym boýunça näme satylandygy; gaýtarylan pullar satuwyň ýanynda durýar we hiç haçan gözden gizlin aýrylmaýar',
    'console.nMoneyReport':
      'döwrüň içinde nämäniň hereket edendigi, platformanyň okalýan ýeke-täk pul birliginde, her sanyň ýanynda kurs bilen',
    'console.nRenewals':
      'her bir güýjündäki abuna, satylan bahasy bilen öňe uzaldylan. Wada berlen, alnan däl — häzirlikçe hiç zat abunany täzelemek üçin pul almaýar',
    'console.nPayouts':
      'mugallymlaryň tölenmegini soran pullary we puluň gaýtarylmagy üçin saklaw: satuwy henizem yzyna öwrüp bolýarka, onuň puly çykmaýar',
    'console.nCourses':
      'her bir kurs, onuň kimlere açykdygy we näçe öwrenijisiniň bardygy. Kursuň diňleýjilerini üýtgetmek siziň adyňyza, öňki we soňky ýagdaýy bilen ýazga geçirilýär',
    'console.nTeachers':
      'sapak bermegi soraýan adamlar we şu ýerde sapak berip bilýän her bir adam, her biriniň näme çap edendigi we kurslarynda näçe öwrenijiniň bardygy bilen. Arzany tassyklamak bellemegiň hut özüdir: ol roly berýär we sebäbiňiz arza berijiniň ýanynda ýazga geçirilýär',
    'console.nAssign': 'synça garaşýan kurslar',
    'console.nSubjects':
      'katalogyň sözlügi: öwrenijiniň näme boýunça süzüp bilýändigi we kurs kartyndaky nyşanyň näme aýdyp bilýändigi. Çap edilen kursuň ulanýan dersini ulanyşdan aýryp bolmaýar',
    'console.nReviewers':
      'kimiň syn bermäge arza berendigi, kimiň barlanandygy we her biriniň nämä baha berip bilýändigi. Şu ýerde kimdir biri tassyklanýança hiç zat çap edilmeýär',
    'console.nScreenings':
      'her bir bellenen mugallym we barlagyň ýazga geçirilendigi ýa-da geçirilmändigi: haýsy görnüş, haçan, möhleti haçan gutarýar, kim ýazga geçirdi. Resminama salgylanma saklanýar we gaýdyp hiç haçan görkezilmeýär, ýazgyny bolsa redaktirläp bolmaýar — täze barlag onuň ornuny tutýar. platform.safeguarding açyk wagty, çaga görkezilip bilinjek kursy çap edip bolmaýar, eger awtorynyň geçen, möhleti gutarmadyk barlagy bolmasa we ol özüni alyp baryş syýasatyny ykrar etmedik bolsa',
    'console.nIjazah':
      'kimiň kime yjazat berendigi, näme üçin we size nämäniň görkezilendigi. Diňe siz ýazga geçirýärsiňiz: rowaýat zynjyry bu platformanyň barlamaga haky bolan zat däl, şonuň üçin sanawda “ýazga geçirildi” diýilýär, hiç haçan “tassyklandy” diýilmeýär we şu ýerdäki hiç zat öwrenijä görünmeýär',
    'console.nTranslations':
      'şol dilde gürleýän adamlaryň iberen düzedişleri, her biri özüniň çalyşjak setiriniň we saýtyň hakykatda gurlan tekstiniň ýanynda görkezilýär. Diňe siz çözýärsiňiz: setiri kabul etmek saýty üýtgetmeýär — muny koda goýulýan blok edýär — we dil diňe onuň her böleginiň çap edilen okalyşy bolanda — ýa-da bir adam tutuş tekstiň okalyşyny çap edende — we her düzediş çözülende okalan diýlip atlandyrylýar',
    'console.nInstitutions':
      'öz sahypasy bolan medreseler, mekdepler we guramalar: täzesini açyň, domen talabynyň arkasyndaky DNS ýazgysyny barlaň we ony kimiň dolandyrýandygyny üýtgediň. Edara öz agzalarynyň sanyny görýär, hiç haçan öwrenijiniň adyny däl, we ol orun satyn alyp bilmeýär — hasap-faktura üçin şertler we hiç kimde ýok üpjün ediji gerek',
    'console.nSponsorships':
      'kurs soraýan öwrenijiler we kurs üçin töleýän haýyr-sahawatçylar. Çözgüt üçin ýazmaça sebäp, tölegi ýazga geçirmek üçin bolsa salgylanma belgisi gerek; howandarlyk orny sargyt däl, şonuň üçin onda ne salgyt, ne-de mugallymyň girdejisi bar',
    'console.nInvitations':
      'kimiň kimi çagyrandygy, munuň näme gazandyrandygy we ýyllyk çägiň ýa-da puluň gaýtarylmagynyň nämäni saklandygy. Iki sylag hem kursa arzanladyşdyr — hiç zat tölenip berilmeýär, şonuň üçin bu ýerde galyndy ýok',
    'console.nSupport':
      'adamlaryň Kömek sahypasyndan açan haýyşlary. Aýratynlygy öçürmek täzelerini togtadýar; işlenip duranlaryny ýapmaýar',
    'console.nUsers':
      'platformadaky her bir hasap, at ýa-da e-poçta boýunça gözlenýär — hasaplar, çagalar däl',
    'console.nControls':
      'eýýäm açyk aýratynlyklaryň arkasyndaky sanlar. Diňe siziň roluňyza degişlileri görkezilýär we her üýtgeşme üçin sebäp gerek',
    'console.nReports':
      'okyjylaryň sapakda ýa-da jogapda belläp geçen meseleleri. Birini ýapmak üçin ýazmaça bellik gerek',
    'console.nMedia':
      'islendik adamyň ýüklän her bir asyl faýly. Karantin hem, yzyna almak hem ýazmaça sebäp talap edýär',
    'console.nCourseReviews': 'sözleri bolan öwreniji bahalary, kimdir biri okaýança saklanýar',
    'console.nDiscussion':
      'gözden geçirmek üçin saklanýan öwreniji soraglary we deň-duşlaryň jogaplary',
    'console.nBoards':
      'okuwçylaryň maslahatyndaky we mugallymlaryň maslahatyndaky kimdir biriniň habar beren ýazgylary. Ol ýerdäki ýazgy derrew görkezilýär, şonuň üçin ýazgy hut şu ýerde aýrylýar. Ulanyjy adynyň arkasynda kimiň durandygyny görmek üçin sebäp gerek we bu ýazga geçirilýär',
    'console.nAssistant':
      'ondan näme soralandygy we oňa goýlan çäkleriň näme edendigi: sapakdan sitata getiren jogaplar, mugallyma ugradylan soraglar we ret etmek üçin ulanylýan jümleler',
    'console.nConnections':
      'bu saýtyň ulanýan daşarky hasaplary (maglumat binýady, e-poçta, meýilleşdiriji, ammar, tölegler) we haýsylarynyň entek birikdirilmändigi. Diňe eýesi üçin; ýetmeýän sazlamalaryň atlary, hiç haçan bahasy däl',
    'console.nMessages':
      'platformanyň iberjek zady, taýýar görnüşde we ýazga geçirilen. Üpjün ediji sazlanýança hakykatda hiç zat çykmaýar',
    'console.nPlans': 'wersiýaly şertler, ulanyş hukuklary we gaýtalanýan bahalar',
    'console.nPanels':
      'eýesi geňeşi çagyrýar we onuň kworumyny kesgitleýär; işgärler çap edilmedik wersiýa garşy iş açýar; agzalar ses berýär we başlyk çözgüdi ýazga geçirýär. Kworumsyz işi ýapyp bolmaýar, governance.panel_required öçük wagty bolsa oňa hiç zat garaşmaýar',
    'console.nTakedowns':
      'habarnama girizilen badyna onda atlandyrylan wersiýany ýaýratmakdan saklaýar — hiç zat pozulmaýar, şonuň üçin çözgüdiň subutnamalary galýar. Mugallym öz sahypasynda jogap berýär, çözgüdi habarnamany kabul eden adamdan başga biri çykarýar we saklaw hiç bir puly üýtgetmeýär',
    'console.nIncidents':
      'näme bolandygy, kime we haçana çenli habar berilmelidigi we wakalaryň barşy. Sanlar, hiç haçan atlaryň sanawy däl; her möhleti adam ýazýar, sebäbi düzgün bazara görä tapawutlanýar. Şu ýerdäki hiç zat maglumatlaryň syzmagyny ýüze çykarmaýar we hiç zat habarnama ibermeýär',
    'console.nPolicies':
      'her bir resminama, güýjünde bolan wersiýalary we häzir garaşýan taslamasy bilen. Çap etmek üçin sene we ýazmaça sebäp gerek, we tekstde diňe siziň jogap berip biljek soragyňyz henizem bellenen bolsa, ol ret edilýär',
    'console.nCertificates':
      'kursy tamamlamak şahadatnamalaryny beriň we ýatyrmalary sebäbi bilen ýazga geçiriň',
    'console.nAnalytics':
      'adamlaryň näme edýändigi, hemişelik saklanýar, waka boýunça we gün boýunça. Diňe jemler',
    'console.nGuardians': 'çaganyň ene-atasy hökmünde ykrar edilmegini soraýan ulular',
    'console.nAppeals':
      'ret edilmegine garşy çykýan mugallymlar. Öz çözgüdiňize garşy şikaýat boýunça çözgüt çykaryp bilmersiňiz',
    'console.nRoles': 'kimiň näme edip bilýändigi. Maglumat binýadyndaky her barlag şulary okaýar',
  },
  ta: {
    'console.nav': 'நிர்வாகம்',
    'console.nOrders':
      'மொத்தத் தொகை இன்னும் மாறக்கூடிய ஆர்டர்கள் இவை மட்டுமே: ஓர் ஆர்டருக்குத் தள்ளுபடி, வரி, கட்டணம் அல்லது முழுமையாக்கலைப் பதிவு செய்யவும், அல்லது ஆர்டரைத் திரும்பப் பெறவும்',
    'console.nRefunds':
      'திரும்ப வெளியே செல்லும் பணம். அங்கீகரிப்பது ஓர் ஒப்புதல், பணப் பரிமாற்றம் அல்ல',
    'console.nAdjustments':
      'எதையும் மாற்றாமல் சேர்க்க மட்டுமே முடியும் கணக்கியல் திருத்தங்கள், மற்றும் வருமானத் திரும்பப்பெறல்கள்',
    'console.nReconciliation': 'கையொப்பமிடப்பட்ட அறிக்கை வரிகளை உள் பேரேட்டுடன் ஒப்பிடுதல்',
    'console.nDisputes':
      'கட்டணத் திருப்பக் கோரிக்கைக்கு ஒரு கெடு உண்டு; அது கடந்தால் என்ன நடக்கும் என்பதைச் சேவை வழங்குநர் முடிவு செய்கிறார்',
    'console.nTax': 'விலைக்கு மேல் வாங்குபவரிடம் வசூலிக்கப்படுவது, அவர் வாங்கும் நாட்டின்படி',
    'console.nRates':
      'ஒரு நாணயம் மற்றொன்றில் எவ்வளவு மதிப்புடையதாக இருந்தது, எப்போது, அதை யார் சொன்னார்',
    'console.nRevenue':
      'ஒரு காலப்பகுதியில் நாணயம், பாடநெறி, திட்டம், ஆசிரியர் வாரியாக விற்றவை; பணத்திருப்புகள் விற்பனைக்கு அருகிலேயே காட்டப்படும், கண்ணுக்குத் தெரியாமல் ஒருபோதும் கழிக்கப்படாது',
    'console.nMoneyReport':
      'ஒரு காலப்பகுதியில் நகர்ந்தவை, தளம் படிக்கப்படும் ஒரே நாணயத்தில், ஒவ்வோர் எண்ணுக்கும் அருகில் மாற்று விகிதத்துடன்',
    'console.nRenewals':
      'நடப்பிலுள்ள ஒவ்வொரு சந்தாவும், அது விற்கப்பட்ட விலையில் முன்னோக்கி நீட்டிக்கப்பட்டது. உறுதியளிக்கப்பட்டது, பெறப்பட்டது அல்ல — புதுப்பிப்புக்கு இன்னும் எதுவும் கட்டணம் வசூலிப்பதில்லை',
    'console.nPayouts':
      'ஆசிரியர்கள் தங்களுக்குச் செலுத்தக் கேட்டவை, மற்றும் பணத்திருப்புக்கான நிறுத்திவைப்பு: ஒரு விற்பனையை இன்னும் மாற்றியமைக்க முடியும் வரை அதன் பணம் வெளியேறாது',
    'console.nCourses':
      'ஒவ்வொரு பாடநெறியும், அது யாருக்குத் திறந்துள்ளது, அதில் எத்தனை கற்பவர்கள் உள்ளனர். ஒரு பாடநெறியின் பார்வையாளர்களை மாற்றுவது, முன்பும் பின்பும் இருந்த நிலையுடன், உங்கள் பெயரில் பதிவாகும்',
    'console.nTeachers':
      'கற்பிக்கக் கேட்பவர்கள், மற்றும் இங்கே கற்பிக்கக்கூடிய ஒவ்வொருவரும், ஒவ்வொருவர் வெளியிட்டவையும் அவர்களின் பாடநெறிகளில் உள்ள கற்பவர் எண்ணிக்கையும் சேர்த்து. ஒரு விண்ணப்பத்தை அங்கீகரிப்பதே நியமனம்: அது பொறுப்பை வழங்குகிறது, உங்கள் காரணம் விண்ணப்பதாரருடன் பதிவாகும்',
    'console.nAssign': 'மதிப்பாய்வாளருக்காகக் காத்திருக்கும் பாடநெறிகள்',
    'console.nSubjects':
      'பாடத்திட்டத்தின் சொற்கள்: கற்பவர் எதன்படி வடிகட்டலாம், பாடநெறி அட்டையில் உள்ள அடையாளம் என்ன சொல்லலாம். வெளியிடப்பட்ட பாடநெறி பயன்படுத்தும் பாடப் பிரிவை ஓய்வு பெறச் செய்ய முடியாது',
    'console.nReviewers':
      'மதிப்பாய்வு செய்ய யார் விண்ணப்பித்தார், யார் சரிபார்க்கப்பட்டார், ஒவ்வொருவரும் எதை மதிப்பிடலாம். இங்கே ஒருவர் சரிபார்க்கப்படும் வரை எதுவும் வெளியிடப்படாது',
    'console.nScreenings':
      'நியமிக்கப்பட்ட ஒவ்வோர் ஆசிரியரும், பின்னணிச் சரிபார்ப்பு பதிவில் உள்ளதா என்பதும்: எந்த வகை, எப்போது, எப்போது காலாவதியாகும், யார் பதிவு செய்தார். ஆவணத்தின் குறிப்பு வைத்திருக்கப்படும், மீண்டும் ஒருபோதும் காட்டப்படாது; ஒரு பதிவைத் திருத்த முடியாது — புதிய சரிபார்ப்பு அதன் இடத்தைப் பிடிக்கும். platform.safeguarding இயக்கத்தில் இருக்கும்போது, ஒரு குழந்தைக்குக் காட்டப்படக்கூடிய பாடநெறியை, அதன் ஆசிரியருக்குத் தேர்ச்சி பெற்ற, காலாவதியாகாத சரிபார்ப்பு இருந்து, நடத்தைக் கொள்கையை அவர் ஏற்றுக்கொண்டிருந்தால் மட்டுமே வெளியிட முடியும்',
    'console.nIjazah':
      'யார் யாருக்கு இஜாஸா வழங்கினார், எதற்காக, உங்களுக்கு என்ன காட்டப்பட்டது. நீங்கள் மட்டுமே பதிவு செய்ய வேண்டும்: அறிவிப்புத் தொடரைச் சரிபார்க்கும் தகுதி இந்தத் தளத்துக்கு இல்லை; எனவே பதிவேடு “பதிவு செய்யப்பட்டது” என்றே சொல்கிறது, ஒருபோதும் “சரிபார்க்கப்பட்டது” என்று அல்ல, இங்குள்ள எதுவும் கற்பவருக்குத் தெரியாது',
    'console.nTranslations':
      'அந்த மொழியைப் பேசுபவர்கள் அனுப்பிய திருத்தங்கள்; ஒவ்வொன்றும் அது மாற்றும் வரியுடனும், தளம் உண்மையில் கட்டமைக்கப்பட்டபடி உள்ள அதன் உரையுடனும் ஒப்பிட்டுக் காட்டப்படும். நீங்கள் மட்டுமே முடிவு செய்ய வேண்டும்: ஒரு வரியை ஏற்பது தளத்தை மாற்றாது — குறியீட்டில் ஒட்டப்படும் தொகுதியே அதைச் செய்கிறது — ஒரு மொழியின் ஒவ்வொரு பகுதிக்கும் வெளியிடப்பட்ட வாசிப்பு இருக்கும்போது — அல்லது ஒருவர் முழு உரையின் வாசிப்பையும் வெளியிட்டிருக்கும்போது — ஒவ்வொரு திருத்தமும் முடிவு செய்யப்பட்டிருந்தால் மட்டுமே அந்த மொழி படிக்கப்பட்டது என்று விவரிக்கப்படும்',
    'console.nInstitutions':
      'தங்களுக்கென்று பக்கம் உள்ள மதரஸாக்கள், பள்ளிகள், அமைப்புகள்: புதியதைத் திறக்கவும், டொமைன் உரிமைக்கோரலுக்குப் பின்னால் உள்ள DNS பதிவைச் சரிபார்க்கவும், அதை யார் நிர்வகிக்கிறார் என்பதை மாற்றவும். ஒரு நிறுவனம் தன் உறுப்பினர்களின் எண்ணிக்கைகளைப் பார்க்கும், கற்பவரின் பெயரை ஒருபோதும் பார்க்காது; அதனால் இடங்களை வாங்க முடியாது — விலைப்பட்டியலுக்கு விதிமுறைகளும் யாரிடமும் இல்லாத ஒரு சேவை வழங்குநரும் தேவை',
    'console.nSponsorships':
      'பாடநெறி கேட்கும் கற்பவர்கள், மற்றும் ஒரு பாடநெறிக்குப் பணம் செலுத்தும் நன்கொடையாளர்கள். முடிவு செய்ய எழுத்துப்பூர்வக் காரணம் தேவை, ஒரு கட்டணத்தைப் பதிவு செய்ய ஒரு குறிப்பெண் தேவை; நிதியுதவி பெற்ற இடம் ஓர் ஆர்டர் அல்ல, எனவே அதற்கு வரியும் இல்லை, ஆசிரியர் வருமானமும் இல்லை',
    'console.nInvitations':
      'யார் யாரை அழைத்தார், அது என்ன ஈட்டியது, ஆண்டு வரம்பு அல்லது ஒரு பணத்திருப்பு எதை நிறுத்தியது. இரண்டு வெகுமதிகளும் பாடநெறித் தள்ளுபடியே — எதுவும் வெளியே செலுத்தப்படுவதில்லை, எனவே இங்கே இருப்பு இல்லை',
    'console.nSupport':
      'உதவிப் பக்கத்திலிருந்து மக்கள் திறந்த கோரிக்கைகள். அம்சத்தை அணைப்பது புதியவற்றை நிறுத்தும்; நடப்பில் உள்ளவற்றை மூடாது',
    'console.nUsers':
      'தளத்தில் உள்ள ஒவ்வொரு கணக்கும், பெயர் அல்லது மின்னஞ்சல் மூலம் தேடலாம் — கணக்குகள், குழந்தைகள் அல்ல',
    'console.nControls':
      'ஏற்கனவே இயக்கத்தில் உள்ள அம்சங்களுக்குப் பின்னால் உள்ள எண்கள். உங்கள் பொறுப்புக்கு உரியவை மட்டுமே காட்டப்படும், ஒவ்வொரு மாற்றத்துக்கும் ஒரு காரணம் தேவை',
    'console.nReports':
      'ஒரு பாடத்திலோ ஒரு பதிலிலோ வாசகர்கள் குறித்த சிக்கல்கள். ஒன்றை மூட எழுத்துப்பூர்வக் குறிப்பு தேவை',
    'console.nMedia':
      'எவரும் பதிவேற்றிய ஒவ்வொரு மூலக் கோப்பும். தனிமைப்படுத்தல், திரும்பப்பெறல் இரண்டுக்கும் எழுத்துப்பூர்வக் காரணம் தேவை',
    'console.nCourseReviews':
      'சொற்கள் அடங்கிய கற்பவர் மதிப்பீடுகள், யாராவது படிக்கும் வரை நிறுத்தி வைக்கப்படும்',
    'console.nDiscussion':
      'மதிப்பாய்வுக்காக நிறுத்தி வைக்கப்பட்ட கற்பவர் கேள்விகளும் சக கற்பவர்களின் பதில்களும்',
    'console.nBoards':
      'மாணவர் கலந்துரையாடலிலும் ஆசிரியர் கலந்துரையாடலிலும் யாரோ புகாரளித்த பதிவுகள். அங்கே ஒரு பதிவு உடனே காட்டப்படும், எனவே அது அகற்றப்படுவது இங்கேதான். ஒரு பயனர்பெயருக்குப் பின்னால் யார் இருக்கிறார் என்று பார்க்க ஒரு காரணம் தேவை, அது பதிவாகும்',
    'console.nAssistant':
      'அதனிடம் என்ன கேட்கப்பட்டது, அதற்கு விதிக்கப்பட்ட வரம்புகள் என்ன செய்தன: ஒரு பாடத்தை மேற்கோள் காட்டிய பதில்கள், ஆசிரியருக்கு அனுப்பப்பட்ட கேள்விகள், மறுப்பதற்குப் பயன்படுத்தப்படும் சொற்றொடர்கள்',
    'console.nConnections':
      'இந்தத் தளம் பயன்படுத்தும் வெளிக் கணக்குகள் (தரவுத்தளம், மின்னஞ்சல், அட்டவணையாளர், சேமிப்பகம், கட்டணங்கள்) மற்றும் எவை இன்னும் இணைக்கப்படவில்லை. உரிமையாளருக்கு மட்டும்; விடுபட்ட அமைப்புகளின் பெயர்கள், ஒருபோதும் மதிப்பு அல்ல',
    'console.nMessages':
      'தளம் அனுப்பியிருக்கக்கூடியவை, இறுதி வடிவில், பதிவு செய்யப்பட்டு. ஒரு சேவை வழங்குநர் அமைக்கப்படும் வரை உண்மையில் எதுவும் வெளியே செல்லாது',
    'console.nPlans': 'பதிப்புகள் கொண்ட விதிமுறைகள், பயன்பாட்டு உரிமைகள், தொடர் விலைகள்',
    'console.nPanels':
      'உரிமையாளர் ஒரு குழுவைக் கூட்டி அதன் குறைந்தபட்ச வருகையை நிர்ணயிக்கிறார்; பணியாளர்கள் வெளியிடப்படாத பதிப்பின் மீது ஒரு வழக்கைத் திறக்கிறார்கள்; உறுப்பினர்கள் வாக்களிக்கிறார்கள், தலைவர் முடிவைப் பதிவு செய்கிறார். குறைந்தபட்ச வருகை இல்லாமல் ஒரு வழக்கை மூட முடியாது; governance.panel_required அணைந்திருக்கும்போது எதுவும் அதற்காகக் காத்திருக்காது',
    'console.nTakedowns':
      'ஓர் அறிவிப்பு உள்ளிடப்பட்ட கணமே, அது குறிப்பிடும் பதிப்பை விநியோகத்திலிருந்து நிறுத்தி வைக்கிறது — எதுவும் நீக்கப்படுவதில்லை, எனவே முடிவுக்கு இன்னும் சான்று இருக்கும். ஆசிரியர் தம் சொந்தப் பக்கத்தில் பதிலளிக்கிறார், அறிவிப்பைப் பெற்றவர் அல்லாத வேறொருவர் முடிவு செய்கிறார், நிறுத்திவைப்பு எந்தப் பணத்தையும் மாற்றாது',
    'console.nIncidents':
      'என்ன நடந்தது, யாருக்கு எப்போதுக்குள் தெரிவிக்க வேண்டும், நிகழ்வுகள் நடக்க நடக்க அவற்றின் காலவரிசை. எண்ணிக்கைகள், ஒருபோதும் பெயர்ப் பட்டியல் அல்ல; விதி சந்தைக்குச் சந்தை மாறுவதால் ஒவ்வொரு கெடுவையும் ஒரு மனிதர் தட்டச்சு செய்கிறார். இங்குள்ள எதுவும் தரவு மீறலைக் கண்டறிவதில்லை, எதுவும் அறிவிப்பு அனுப்புவதில்லை',
    'console.nPolicies':
      'ஒவ்வோர் ஆவணமும், நடைமுறையில் இருந்த பதிப்புகளுடனும் இப்போது காத்திருக்கும் வரைவுடனும். வெளியிட ஒரு தேதியும் எழுத்துப்பூர்வக் காரணமும் தேவை; நீங்கள் மட்டுமே பதிலளிக்கக்கூடிய ஒரு கேள்வி உரையில் இன்னும் குறிக்கப்பட்டிருக்கும் வரை அது மறுக்கப்படும்',
    'console.nCertificates':
      'நிறைவுச் சான்றிதழ்களை வழங்கவும், ரத்துகளைக் காரணத்துடன் பதிவு செய்யவும்',
    'console.nAnalytics':
      'மக்கள் செய்வது, என்றென்றும் வைத்திருக்கப்படும், நிகழ்வு வாரியாகவும் நாள் வாரியாகவும். மொத்தங்கள் மட்டுமே',
    'console.nGuardians': 'ஒரு குழந்தையின் பெற்றோராக அங்கீகரிக்கப்படக் கேட்கும் பெரியவர்கள்',
    'console.nAppeals':
      'ஒரு நிராகரிப்பை எதிர்க்கும் ஆசிரியர்கள். உங்கள் சொந்த முடிவுக்கு எதிரான மேல்முறையீட்டை நீங்கள் முடிவு செய்ய முடியாது',
    'console.nRoles':
      'யார் என்ன செய்யலாம். தரவுத்தளத்தில் உள்ள ஒவ்வொரு சரிபார்ப்பும் இவற்றைப் படிக்கிறது',
  },
  ne: {
    'console.nav': 'प्रशासन',
    'console.nOrders':
      'जम्मा रकम अझै बदलिन सक्ने अर्डरहरू यी मात्र हुन्: कुनै अर्डरमा छुट, कर, शुल्क वा राउन्डिङ दर्ता गर्नुहोस्, वा अर्डर फिर्ता लिनुहोस्',
    'console.nRefunds': 'फिर्ता बाहिर जाने पैसा। स्वीकृत गर्नु भनेको सहमति हो, रकमान्तर होइन',
    'console.nAdjustments':
      'केही नबदली थप्न मात्र मिल्ने लेखा सच्याइहरू, र आम्दानी फिर्ता लिने कामहरू',
    'console.nReconciliation': 'हस्ताक्षर गरिएका विवरणका पङ्क्तिहरूलाई आन्तरिक खातासँग भिडाउने',
    'console.nDisputes':
      'चार्जब्याकको म्याद हुन्छ; त्यो नाघेमा के हुन्छ भन्ने प्रदायकले निर्णय गर्छ',
    'console.nTax': 'खरिदकर्ताबाट मूल्यमाथि लिइने रकम, उनले जुन देशबाट किन्छन् त्यसअनुसार',
    'console.nRates': 'एउटा मुद्राको मूल्य अर्कोमा कति थियो, कहिले, र त्यो कसले भन्यो',
    'console.nRevenue':
      'कुनै अवधिमा मुद्रा, कोर्स, योजना र शिक्षकअनुसार के बिक्यो; रकम फिर्ताहरू बिक्रीकै छेउमा देखाइन्छन् र कहिल्यै नदेखिने गरी घटाइँदैनन्',
    'console.nMoneyReport':
      'कुनै अवधिमा के चल्यो, प्लेटफर्म पढिने एउटै मुद्रामा, हरेक अङ्कको छेउमा विनिमय दरसहित',
    'console.nRenewals':
      'हरेक चालु सदस्यता, बिक्री भएको मूल्यमा अगाडि तन्काइएको। प्रतिबद्ध गरिएको, प्राप्त भएको होइन — अहिलेसम्म कुनै कुराले नवीकरणको शुल्क लिँदैन',
    'console.nPayouts':
      'शिक्षकहरूले भुक्तानी माग गरेको रकम, र रकम फिर्ताका लागि रोक्का: बिक्री अझै उल्टिन सक्ने बेलासम्म त्यसको पैसा बाहिर जाँदैन',
    'console.nCourses':
      'हरेक कोर्स, त्यो कसका लागि खुला छ र त्यसमा कति सिकारु छन्। कोर्सको दर्शकवर्ग बदल्दा अघि र पछिको अवस्थासहित तपाईंको नाममा दर्ता हुन्छ',
    'console.nTeachers':
      'पढाउन अनुरोध गर्ने मानिसहरू, र यहाँ पढाउन पाउने हरेक व्यक्ति, प्रत्येकले के प्रकाशित गरेको छ र उनका कोर्समा कति सिकारु छन् भन्नेसहित। आवेदन स्वीकृत गर्नु नै नियुक्ति हो: यसले भूमिका दिन्छ, र तपाईंको कारण आवेदकसँगै दर्ता हुन्छ',
    'console.nAssign': 'समीक्षक पर्खिरहेका कोर्सहरू',
    'console.nSubjects':
      'पाठ्यक्रमको शब्दावली: सिकारुले केका आधारमा छान्न सक्छ, र कोर्स कार्डको ब्याजले के भन्न सक्छ। प्रकाशित कोर्सले प्रयोग गरिरहेको विषयलाई हटाउन सकिँदैन',
    'console.nReviewers':
      'कसले समीक्षा गर्न आवेदन दियो, को जाँचिएको छ, र प्रत्येकले के मूल्याङ्कन गर्न सक्छ। यहाँ कोही प्रमाणित नभएसम्म केही पनि प्रकाशित हुँदैन',
    'console.nScreenings':
      'हरेक नियुक्त शिक्षक र जाँच अभिलेखमा छ कि छैन: कुन प्रकारको, कहिले, कहिले म्याद सकिन्छ, कसले दर्ता गर्‍यो। कागजातको सन्दर्भ राखिन्छ र फेरि कहिल्यै देखाइँदैन, र अभिलेख सम्पादन गर्न सकिँदैन — नयाँ जाँचले त्यसको ठाउँ लिन्छ। platform.safeguarding खुला रहँदा, बालबालिकालाई देखाइन सक्ने कोर्स प्रकाशित गर्न सकिँदैन, जबसम्म त्यसको लेखकसँग उत्तीर्ण र म्याद नसकिएको जाँच हुँदैन र उनले आचरण नीति स्वीकार गरेका हुँदैनन्',
    'console.nIjazah':
      'कसले कसलाई इजाजा दियो, केका लागि, र तपाईंलाई के देखाइयो। तपाईंले मात्र दर्ता गर्ने हो: प्रसारणको शृङ्खला यो प्लेटफर्मले जाँच्ने हैसियत राख्ने कुरा होइन, त्यसैले दर्ताले “दर्ता गरिएको” भन्छ, कहिल्यै “प्रमाणित” भन्दैन, र यहाँको कुनै पनि कुरा सिकारुले देख्दैन',
    'console.nTranslations':
      'भाषा बोल्ने मानिसहरूले पठाएका सच्याइहरू, प्रत्येकलाई त्यसले बदल्ने पङ्क्ति र साइट वास्तवमा जसरी बनाइएको छ त्यही पाठसँगै देखाइन्छ। तपाईंले मात्र निर्णय गर्ने हो: पङ्क्ति स्वीकार गर्दा साइट बदलिँदैन — कोडमा टाँसिने खण्डले मात्र त्यो गर्छ — र कुनै भाषालाई पढिएको भनेर तब मात्र भनिन्छ, जब त्यसको हरेक भागको प्रकाशित पठन हुन्छ — वा एक जनाले सम्पूर्ण पाठको पठन प्रकाशित गरेको हुन्छ — र हरेक सच्याइको निर्णय भइसकेको हुन्छ',
    'console.nInstitutions':
      'आफ्नै पृष्ठ भएका मदरसा, विद्यालय र संस्थाहरू: नयाँ खोल्नुहोस्, डोमेन दाबीको पछाडिको DNS रेकर्ड जाँच्नुहोस्, र त्यसलाई कसले व्यवस्थापन गर्छ भन्ने बदल्नुहोस्। संस्थाले आफ्ना सदस्यहरूको गन्ती देख्छ र कहिल्यै सिकारुको नाम देख्दैन, र त्यसले सिट किन्न सक्दैन — बिजक जारी गर्न सर्तहरू र कसैसँग नभएको प्रदायक चाहिन्छ',
    'console.nSponsorships':
      'कोर्स माग्ने सिकारुहरू, र कोर्सका लागि तिर्ने दाताहरू। निर्णय गर्न लिखित कारण चाहिन्छ र भुक्तानी दर्ता गर्न सन्दर्भ नम्बर चाहिन्छ; प्रायोजित सिट अर्डर होइन, त्यसैले त्यसमा न कर हुन्छ न शिक्षकको आम्दानी',
    'console.nInvitations':
      'कसले कसलाई निम्तो दियो, त्यसले के कमायो र वार्षिक सीमा वा रकम फिर्ताले के रोक्यो। दुवै पुरस्कार कोर्समा छुट हुन् — केही पनि भुक्तान गरिँदैन, त्यसैले यहाँ कुनै मौज्दात छैन',
    'console.nSupport':
      'मानिसहरूले मद्दत पृष्ठबाट खोलेका अनुरोधहरू। सुविधा बन्द गर्दा नयाँ अनुरोध रोकिन्छन्; चलिरहेका अनुरोध बन्द हुँदैनन्',
    'console.nUsers':
      'प्लेटफर्मको हरेक खाता, नाम वा इमेलबाट खोज्न मिल्ने — खाताहरू, बालबालिका होइनन्',
    'console.nControls':
      'पहिले नै खुला भएका सुविधाहरूको पछाडिका अङ्कहरू। तपाईंको भूमिकाले स्वामित्व राख्ने मात्र देखाइन्छन्, र हरेक परिवर्तनलाई कारण चाहिन्छ',
    'console.nReports':
      'पाठकहरूले कुनै पाठ वा उत्तरमा औँल्याएका समस्याहरू। एउटालाई बन्द गर्न लिखित टिप्पणी चाहिन्छ',
    'console.nMedia':
      'कसैले अपलोड गरेको हरेक मूल फाइल। क्वारेन्टिन र फिर्ता लिने दुवैलाई लिखित कारण चाहिन्छ',
    'console.nCourseReviews':
      'शब्दहरू समावेश भएका सिकारुका मूल्याङ्कनहरू, कसैले नपढेसम्म रोकिन्छन्',
    'console.nDiscussion': 'समीक्षाका लागि रोकिएका सिकारुका प्रश्नहरू र साथीहरूका उत्तरहरू',
    'console.nBoards':
      'विद्यार्थीहरूको छलफल र शिक्षकहरूको छलफलमा कसैले रिपोर्ट गरेका पोस्टहरू। त्यहाँको पोस्ट तुरुन्तै देखाइन्छ, त्यसैले पोस्ट हटाइने ठाउँ यही हो। प्रयोगकर्ता नामको पछाडि को छ भनेर हेर्न कारण चाहिन्छ र त्यो दर्ता हुन्छ',
    'console.nAssistant':
      'यसलाई के सोधियो र यसका लागि तोकिएका सीमाहरूले के गरे: पाठ उद्धृत गर्ने उत्तरहरू, शिक्षककहाँ पठाइएका प्रश्नहरू, र अस्वीकार गर्न प्रयोग हुने वाक्यांशहरू',
    'console.nConnections':
      'यो साइटले प्रयोग गर्ने बाहिरी खाताहरू (डाटाबेस, इमेल, समयतालिका चलाउने सेवा, भण्डारण, भुक्तानी) र कुन-कुन अझै जोडिन बाँकी छन्। स्वामीका लागि मात्र; नपुग सेटिङका नामहरू, कहिल्यै मान होइन',
    'console.nMessages':
      'प्लेटफर्मले पठाउने थियो भन्ने कुरा, अन्तिम रूपमा र दर्ता गरिएको। प्रदायक कन्फिगर नभएसम्म वास्तवमा केही पनि बाहिर जाँदैन',
    'console.nPlans': 'संस्करणसहितका सर्तहरू, प्रयोगका अधिकार र आवर्ती मूल्यहरू',
    'console.nPanels':
      'स्वामीले बोर्ड गठन गर्छन् र त्यसको गणपूरक सङ्ख्या तोक्छन्; कर्मचारीले अप्रकाशित संस्करणविरुद्ध मामिला खोल्छन्; सदस्यहरूले मत दिन्छन् र अध्यक्षले निर्णय दर्ता गर्छन्। गणपूरक सङ्ख्या नपुगी मामिला बन्द गर्न सकिँदैन, र governance.panel_required बन्द हुँदा कुनै कुराले त्यसलाई पर्खँदैन',
    'console.nTakedowns':
      'सूचना प्रविष्ट हुनेबित्तिकै त्यसले नाम लिएको संस्करणलाई वितरणबाट रोक्छ — केही पनि मेटिँदैन, त्यसैले निर्णयसँग अझै प्रमाण रहन्छ। शिक्षकले आफ्नै पृष्ठमा जवाफ दिन्छन्, सूचना बुझ्ने व्यक्तिभन्दा अर्कै कसैले निर्णय गर्छ, र रोक्काले कुनै पैसा बदल्दैन',
    'console.nIncidents':
      'के भयो, कसलाई र कहिलेसम्म भन्नुपर्छ, र घटनाक्रम जसरी अघि बढ्छ त्यसको समयरेखा। गन्तीहरू, कहिल्यै नामको सूची होइन; हरेक म्याद मानिसले टाइप गर्छ किनभने नियम बजारअनुसार फरक हुन्छ। यहाँको कुनै पनि कुराले डाटा चुहावट पत्ता लगाउँदैन र कुनै पनि कुराले सूचना पठाउँदैन',
    'console.nPolicies':
      'हरेक कागजात, लागू भएका संस्करणहरू र अहिले पर्खिरहेको मस्यौदासहित। प्रकाशित गर्न मिति र लिखित कारण चाहिन्छ, र तपाईंले मात्र जवाफ दिन सक्ने प्रश्न पाठमा अझै चिह्न लगाइएको छ भने त्यो अस्वीकार हुन्छ',
    'console.nCertificates':
      'समापन प्रमाणपत्रहरू जारी गर्नुहोस् र रद्दहरू कारणसहित दर्ता गर्नुहोस्',
    'console.nAnalytics':
      'मानिसहरूले के गर्छन्, सधैँका लागि राखिन्छ, घटनाअनुसार र दिनअनुसार। कुल सङ्ख्या मात्र',
    'console.nGuardians': 'बालबालिकाको आमाबुबाको रूपमा मान्यता पाउन अनुरोध गर्ने वयस्कहरू',
    'console.nAppeals':
      'अस्वीकृतिको विरोध गर्ने शिक्षकहरू। आफ्नै निर्णयविरुद्धको पुनरावेदनमा तपाईंले निर्णय गर्न सक्नुहुन्न',
    'console.nRoles': 'कसले के गर्न सक्छ। डाटाबेसको हरेक जाँचले यिनै पढ्छ',
  },
};
