import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The account page (`app/account/page.tsx`) and its profile form.
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts` and `player.ts`: written for the twenty-seven
 * languages with nothing held in `held.ts`, and for no other. See
 * `UNWRITTEN_WHILE_HELD`.
 *
 * **Who reads it.** Somebody who came to change something about their own
 * account: their name, how they sign in, what they are told, what is kept
 * about them, and whether to close it. Several of these sentences are the
 * only place a promise is made — that progress is private even from family,
 * that an institution sees counts and never a name, that closing keeps
 * orders and certificates without the name on them. Those are the ones to
 * get right, and no speaker has checked them.
 *
 * **What is not here.** The page borrows what already has a name: its title
 * is the dashboard's link to it (`learn.account`), "Signed in as" is the
 * dashboard's (`learn.signedInAs`), the learner-profile button is the
 * dashboard's (`learn.claim…`), and the links to the learning page, the
 * family page, the language page, the terms and the notifications use the
 * navigation's own words, so no page calls them by a second name.
 *
 * **Counts.** `owedOne`/`owedOther` and `toldUnreadOne`/`toldUnreadOther`
 * both carry `{count}`: in several languages the singular form is used for
 * more numbers than one, so neither may spell the number out. Arabic says
 * "number of …: N" in both, which needs no agreement with the noun.
 *
 * **Served to the server only.** `account.` is in `SERVER_ONLY_PREFIXES`:
 * the page is drawn on the server and hands the profile form its words.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const ACCOUNT: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'account.lede':
      'تحكّم في طريقة ظهور حسابك. عنوان تسجيل الدخول معروض للعلم فقط ولا يُغيَّر من هنا.',
    'account.status': 'حالة الحساب: {status}',
    'account.statusActive': 'نشط',
    'account.statusSuspended': 'موقوف',
    'account.statusClosed': 'مغلق',
    'account.owedHeading': 'قبل أن تتابع',
    'account.owedOne': 'عدد المستندات التي تنتظر موافقتك: {count}.',
    'account.owedOther': 'عدد المستندات التي تنتظر موافقتك: {count}.',
    'account.owedBody':
      'اقرأ ثم وافق، ويُحفظ وقت موافقتك في حسابك. لا يُحجب عنك شيء آخر في هذه الصفحة في أثناء ذلك.',
    'account.owedVersion': '{title} — الإصدار {number}',
    'account.selfHeading': 'التعلّم باسمك',
    'account.selfLearnsAs':
      'يتعلّم هذا الحساب باسم {name}. الدورات التي تسجّل فيها أو تشتريها تخصّ هذا المتعلّم، ولا يختلط بها تقدّم أي شخص آخر.',
    'account.selfInFamily':
      'تعلّمك داخل حساب عائلي، فتستطيع خطة عائلية واحدة أن تشملك مع أطفال العائلة. تدير ذلك من صفحة العائلة.',
    'account.selfOnOwn':
      'تعلّمك قائم بذاته. إن كنت تدير حسابًا عائليًا، يمكنك نقله إلى جانب الأطفال لتشمل خطة واحدة الجميع — الملف نفسه والتقدّم نفسه.',
    'account.selfGo': 'اذهب إلى تعلّمي',
    'account.selfJoinFamily': 'التعلّم ضمن عائلتي',
    'account.selfWhoSees': 'من يستطيع رؤية تقدّمي',
    'account.selfNone':
      'ليس لديك ملف متعلّم بعد. تحتاج إلى ملف قبل أن تسجّل في دورة أو تشتري دورة أو تشارك تقدّمك — فالدورة تكون دائمًا لمتعلّم مسمّى، وبهذا تصبح متعلّمًا.',
    'account.selfFamilyInstead':
      'إن كنت تدير حسابًا عائليًا، يمكنك أن تصبح متعلّمًا هناك بدلًا من ذلك، وأن تكون جزءًا من العائلة من البداية.',
    'account.selfClaimNote': 'هذا لا ينشئ حسابًا ثانيًا، بل يضيفك متعلّمًا إلى هذا الحساب.',
    'account.formName': 'الاسم المعروض',
    'account.formLanguage': 'رمز اللغة المفضّلة',
    'account.formLanguageNote':
      'يُحفظ هذا مع ملفك الشخصي، ولا يستخدمه شيء بعد. لغة هذه الصفحات تُختار من صفحة اللغة وتُحفظ في هذا المتصفّح.',
    'account.formZone': 'المنطقة الزمنية',
    'account.formSave': 'حفظ الملف الشخصي',
    'account.formSaved': 'تم تحديث ملفك الشخصي.',
    'account.formFailed': 'تعذّر حفظ ملفك الشخصي. حاول مرة أخرى.',
    'account.formNameMissing': 'أضف الاسم الذي تريد أن يراه الناس.',
    'account.formNameLong': 'اجعل الاسم المعروض لا يزيد على {count} حرفًا.',
    'account.formLanguageBad': 'استخدم رمز لغة مثل en أو en-GB.',
    'account.formZoneLong': 'اجعل المنطقة الزمنية لا تزيد على {count} حرف.',
    'account.formZoneBad': 'استخدم منطقة زمنية صحيحة من IANA، مثل Africa/Kampala.',
    'account.formSignedOut': 'لقد سُجّل خروجك. سجّل الدخول من جديد ثم احفظ.',
    'account.formNotFound': 'تعذّر العثور على ملفك الشخصي. سجّل الخروج ثم الدخول، وحاول مرة أخرى.',
    'account.signInHeading': 'كيف تسجّل الدخول',
    'account.signInBoth': 'يمكنك تسجيل الدخول بكلمة مرور أو عبر Google.',
    'account.signInPassword': 'تسجّل الدخول بعنوان بريدك الإلكتروني وكلمة مرور.',
    'account.signInGoogle': 'تسجّل الدخول عبر Google. لا توجد كلمة مرور لهذا الحساب.',
    'account.signInPhone': 'تسجّل الدخول برمز يُرسل إلى هاتفك.',
    'account.signInOther': 'تسجّل الدخول عبر: {methods}.',
    'account.signInNone': 'لا توجد طريقة تسجيل دخول مسجّلة لهذا الحساب.',
    'account.signInUnread': 'تعذّرت قراءة طرق تسجيل الدخول الآن.',
    'account.resetBody':
      'أرسل رابطًا آمنًا لإعادة تعيين كلمة المرور إلى بريد تسجيل الدخول. تنتهي صلاحية الرابط بحسب إعدادات مزوّد المصادقة.',
    'account.resetLink': 'إرسال رابط إعادة التعيين',
    'account.noPasswordGoogle':
      'لا توجد كلمة مرور لهذا الحساب، فلا شيء يُعاد تعيينه — واصل تسجيل الدخول عبر Google.',
    'account.noPasswordPhone':
      'يسجّل هذا الحساب الدخول برمز الهاتف، فلا توجد كلمة مرور لإعادة تعيينها.',
    'account.mergeHeading': 'حسابان لشخص واحد',
    'account.mergeBody':
      'إن كنت قد سجّلت مرتين، يمكن ضمّ الحسابين معًا. يبقى الحساب الذي تحتفظ به ويُغلق الآخر، ولا بدّ أن يوافق الحسابان قبل أن ينتقل أي شيء.',
    'account.mergeWaiting': 'هناك من يطلب دمج حساب في هذا الحساب.',
    'account.mergeNone': 'لا شيء ينتظر هذا الحساب.',
    'account.mergeLink': 'دمج الحسابات',
    'account.mergeLinkWaiting': 'دمج الحسابات (بالانتظار: {count})',
    'account.sponsorHeading': 'المقاعد المكفولة',
    'account.sponsorBody':
      'يمكن أن يدفع شخص آخر ثمن دورة. اطلب مقعدًا إن لم تكن الدورة في متناولك، أو ادفع ثمن مقعد ينتظر — ولا يعرف أيٌّ من الطرفين من هو الآخر.',
    'account.sponsorMine': 'ما طلبتُه وما كفلتُه',
    'account.sponsorWaiting': 'المقاعد المنتظرة',
    'account.teachHeading': 'التدريس هنا',
    'account.teachBody':
      'التدريس بالتعيين — لا يصبح أحد معلّمًا بمجرد التسجيل. إن رغبت في التدريس، يمكنك إرسال مؤهلاتك ورابط درس قدّمته، ويقرؤه المالك.',
    'account.teachLink': 'التقدّم للتدريس',
    'account.inviteHeading': 'ادعُ صديقًا',
    'account.inviteBody':
      'الصديق الجديد هنا يحصل على خصم على دورته الأولى، وتحصل أنت على خصم على دورتك التالية بعد أن يتجاوز دفعه مهلة الاسترداد. كلاهما خصم لا مال، فلا شيء يُصرف.',
    'account.inviteLink': 'رمز دعوتك',
    'account.shareHeading': 'مشاركة تعلّمي',
    'account.shareBody':
      'تقدّمك وشهاداتك خاصة، حتى عن عائلتك. ادعُ شخصًا بالبريد الإلكتروني فيقبل الدعوة بنفسه؛ أنت تختار ما يراه ومدّة ذلك، ويمكنك إنهاء المشاركة متى شئت.',
    'account.shareLink': 'من يستطيع رؤية تعلّمي',
    'account.readHeading': 'طريقة العرض',
    'account.readBody':
      'حجم النص والتباين والحركة — تُطبّق لحظة اختيارك، لهذا المتصفّح. لا شيء هنا يحتاج إلى حفظ، ولا يتغيّر شيء آخر في الصفحة.',
    'account.readLink': 'تفضيلات القراءة',
    'account.termsBody': 'الشروط، وإشعار الخصوصية، وشروط المعلّمين، ولكلٍّ منها إصدارات مرقّمة.',
    'account.termsAgreed': 'الإصدارات التي وافقت عليها مدرجة مع وقت موافقتك.',
    'account.termsNone': 'لا شيء ينتظر موافقتك.',
    'account.termsLink': 'اقرأها',
    'account.instHeading': 'مؤسستي',
    'account.instBody':
      'مدرسة دينية أو مدرسة أو منظمة تنتمي إليها. إن كان بريدك الإلكتروني على نطاق تحقّقت منه إحداها، يمكنك الانضمام إليها؛ وبعد انضمامك ترى أعداد أفرادها فقط، ولا ترى اسمك ولا ما درسته أبدًا.',
    'account.instLink': 'أين أنتمي',
    'account.paidHeading': 'ما دفعتُه',
    'account.paidBody':
      'كل دفعة تمّت على حساب الفوترة الخاص بك، وكل مبلغ مستردّ عاد إليك، مع مجموع جارٍ لكل عملة. الاسترداد الذي طلبته يُدرج منفصلًا إلى أن يتمّ فعلًا، لأن الطلب ليس استلامًا.',
    'account.paidLink': 'عرض ما دفعتُه',
    'account.toldHeading': 'ما أُبلَّغ به',
    'account.toldBody':
      'تظهر رسائل المنصّة في مركز الإشعارات، لا في بريد وارد ولا في رسالة نصية — لم يُضبط مزوّد إرسال بعد.',
    'account.toldUnreadOne': 'عدد الرسائل غير المقروءة: {count}.',
    'account.toldUnreadOther': 'عدد الرسائل غير المقروءة: {count}.',
    'account.toldNone': 'لا شيء ينتظرك.',
    'account.toldChoice':
      'أنت تختار الأنواع التي تريدها، إلا الإشعارات بأن مالًا مستحقًّا لك لم يصل: فهذه تأتي دائمًا.',
    'account.toldLinkUnread': 'الإشعارات (غير مقروءة: {count})',
    'account.toldPrefs': 'اختر ما تُبلَّغ به',
    'account.dataHeading': 'بياناتي',
    'account.dataBody':
      'نزّل كل ما نحتفظ به عن هذا الحساب في ملف واحد: ملفك الشخصي، والمتعلّمون الذين أنت مسؤول عنهم، وما درسوه وأتمّوه، وشهاداتك، وطلباتك وإيصالاتك، وملاحظاتك، ومن شاركت تعلّمك معهم.',
    'account.dataDownload': 'تنزيل بياناتي',
    'account.dataSheet': 'كجدول بيانات',
    'account.dataPrint': 'قراءتها أو طباعتها',
    'account.dataMore':
      'صار الملف يحمل أكثر من ذي قبل: مشاركات النقاش، والمراجعات والأعمال المصحّحة، وحالات الدعم، والرسائل المرسلة إليك، و— إن كنت تدرّس — أرباحك ومدفوعاتك.',
    'account.dataWhat': 'ما فيه وما تُرك خارجه',
    'account.dataRestore':
      'لديك ملف من قبل؟ يمكن إعادة ملفك الشخصي وملاحظاتك وإشاراتك المرجعية إلى الدروس التي أنت مسجّل فيها؛ أما التسجيلات في الدورات والشهادات والطلبات فلا يمكن، وتلك الصفحة تبيّن السبب.',
    'account.dataRestoreLink': 'أعِده',
    'account.closeHeading': 'إغلاق هذا الحساب',
    'account.closeBody':
      'الإغلاق يغيّر ملفك الشخصي ويزيل بعض المعلومات الشخصية ويحاول تسجيل خروجك. تُحفظ الطلبات والمدفوعات والتسجيلات والشهادات، لأن الاسترداد أو التحقّق من شهادة ما زال يحتاج إليها، وتبقى سجلات أخرى أيضًا. تعرض الصفحة الجانبين قبل أن يحدث أي شيء.',
    'account.closeLink': 'إغلاق هذا الحساب',
  },
  ur: {
    'account.lede':
      'یہاں طے کریں کہ آپ کا اکاؤنٹ کیسا نظر آئے۔ آپ کا سائن اِن پتہ صرف حوالے کے لیے دکھایا گیا ہے اور یہاں تبدیل نہیں ہوتا۔',
    'account.status': 'اکاؤنٹ کی حالت: {status}',
    'account.statusActive': 'فعال',
    'account.statusSuspended': 'معطل',
    'account.statusClosed': 'بند',
    'account.owedHeading': 'آگے بڑھنے سے پہلے',
    'account.owedOne': '{count} دستاویز آپ کی رضامندی کی منتظر ہے۔',
    'account.owedOther': '{count} دستاویزات آپ کی رضامندی کی منتظر ہیں۔',
    'account.owedBody':
      'پڑھیں اور رضامندی دیں، اور رضامندی کا وقت آپ کے اکاؤنٹ میں محفوظ رہتا ہے۔ اس دوران اس صفحے کی کوئی اور چیز نہیں روکی جاتی۔',
    'account.owedVersion': '{title} — نسخہ {number}',
    'account.selfHeading': 'اپنے نام سے سیکھنا',
    'account.selfLearnsAs':
      'یہ اکاؤنٹ {name} کے نام سے سیکھتا ہے۔ جن کورسوں میں آپ اندراج کرتے یا جنہیں خریدتے ہیں وہ اسی سیکھنے والے کے ہیں، اور کسی اور کی پیش رفت اس میں نہیں ملتی۔',
    'account.selfInFamily':
      'آپ کی تعلیم ایک خاندانی اکاؤنٹ کے اندر ہے، اس لیے ایک ہی خاندانی پلان بچوں کے ساتھ آپ کو بھی شامل کر سکتا ہے۔ اس کا انتظام آپ خاندان کے صفحے پر کرتے ہیں۔',
    'account.selfOnOwn':
      'آپ کی تعلیم الگ ہے۔ اگر آپ خاندانی اکاؤنٹ چلاتے ہیں تو اسے بچوں کے ساتھ منتقل کر سکتے ہیں تاکہ ایک ہی پلان سب کو شامل کرے — وہی پروفائل، وہی پیش رفت۔',
    'account.selfGo': 'میری تعلیم پر جائیں',
    'account.selfJoinFamily': 'اپنے خاندان کے اندر سیکھیں',
    'account.selfWhoSees': 'میری پیش رفت کون دیکھ سکتا ہے',
    'account.selfNone':
      'آپ کا ابھی سیکھنے والے کا پروفائل نہیں ہے۔ کسی کورس میں اندراج، کورس خریدنے یا اپنی پیش رفت شیئر کرنے سے پہلے یہ ضروری ہے — کورس ہمیشہ کسی نامزد سیکھنے والے کے لیے ہوتا ہے، اور آپ اسی طرح سیکھنے والے بنتے ہیں۔',
    'account.selfFamilyInstead':
      'اگر آپ خاندانی اکاؤنٹ چلاتے ہیں تو اس کے بجائے وہاں سیکھنے والے بن سکتے ہیں اور شروع ہی سے خاندان کا حصہ ہو سکتے ہیں۔',
    'account.selfClaimNote':
      'اس سے دوسرا اکاؤنٹ نہیں بنتا۔ یہ آپ کو اسی اکاؤنٹ میں سیکھنے والے کے طور پر شامل کرتا ہے۔',
    'account.formName': 'ظاہر ہونے والا نام',
    'account.formLanguage': 'پسندیدہ زبان کا کوڈ',
    'account.formLanguageNote':
      'یہ آپ کے پروفائل کے ساتھ محفوظ رہتا ہے، اور ابھی کوئی چیز اسے استعمال نہیں کرتی۔ ان صفحات کی زبان زبان کے صفحے پر چنی جاتی ہے اور اسی براؤزر میں محفوظ رہتی ہے۔',
    'account.formZone': 'ٹائم زون',
    'account.formSave': 'پروفائل محفوظ کریں',
    'account.formSaved': 'آپ کا پروفائل اپ ڈیٹ ہو گیا ہے۔',
    'account.formFailed': 'آپ کا پروفائل محفوظ نہیں ہو سکا۔ دوبارہ کوشش کریں۔',
    'account.formNameMissing': 'وہ نام لکھیں جو آپ چاہتے ہیں کہ لوگ دیکھیں۔',
    'account.formNameLong': 'ظاہر ہونے والا نام {count} حروف یا اس سے کم رکھیں۔',
    'account.formLanguageBad': 'زبان کا کوڈ استعمال کریں، جیسے en یا en-GB۔',
    'account.formZoneLong': 'ٹائم زون {count} حروف یا اس سے کم رکھیں۔',
    'account.formZoneBad': 'درست IANA ٹائم زون استعمال کریں، جیسے Africa/Kampala۔',
    'account.formSignedOut': 'آپ سائن آؤٹ ہو چکے ہیں۔ دوبارہ سائن اِن کریں، پھر محفوظ کریں۔',
    'account.formNotFound':
      'آپ کا پروفائل نہیں ملا۔ سائن آؤٹ کر کے دوبارہ سائن اِن کریں، پھر کوشش کریں۔',
    'account.signInHeading': 'آپ سائن اِن کیسے کرتے ہیں',
    'account.signInBoth': 'آپ پاس ورڈ سے یا Google سے سائن اِن کر سکتے ہیں۔',
    'account.signInPassword': 'آپ اپنے ای میل پتے اور پاس ورڈ سے سائن اِن کرتے ہیں۔',
    'account.signInGoogle': 'آپ Google سے سائن اِن کرتے ہیں۔ اس اکاؤنٹ کا کوئی پاس ورڈ نہیں ہے۔',
    'account.signInPhone': 'آپ اپنے فون پر بھیجے گئے کوڈ سے سائن اِن کرتے ہیں۔',
    'account.signInOther': 'آپ اس طریقے سے سائن اِن کرتے ہیں: {methods}۔',
    'account.signInNone': 'اس اکاؤنٹ کے لیے سائن اِن کا کوئی طریقہ درج نہیں ہے۔',
    'account.signInUnread': 'آپ کے سائن اِن کے طریقے ابھی پڑھے نہیں جا سکے۔',
    'account.resetBody':
      'اپنے سائن اِن ای میل پر پاس ورڈ دوبارہ ترتیب دینے کا محفوظ لنک بھیجیں۔ لنک کی میعاد آپ کے تصدیقی فراہم کنندہ کی ترتیبات کے مطابق ختم ہوتی ہے۔',
    'account.resetLink': 'ری سیٹ لنک بھیجیں',
    'account.noPasswordGoogle':
      'اس اکاؤنٹ کا کوئی پاس ورڈ نہیں ہے، اس لیے دوبارہ ترتیب دینے کو کچھ نہیں — Google سے سائن اِن کرتے رہیں۔',
    'account.noPasswordPhone':
      'یہ اکاؤنٹ فون کوڈ سے سائن اِن کرتا ہے، اس لیے دوبارہ ترتیب دینے کو کوئی پاس ورڈ نہیں۔',
    'account.mergeHeading': 'دو اکاؤنٹ، ایک شخص',
    'account.mergeBody':
      'اگر آپ نے دو بار اندراج کیا ہے تو دونوں اکاؤنٹ ملائے جا سکتے ہیں۔ جو آپ رکھتے ہیں وہ باقی رہتا ہے؛ دوسرا بند ہو جاتا ہے، اور کچھ بھی منتقل ہونے سے پہلے دونوں کی رضامندی ضروری ہے۔',
    'account.mergeWaiting': 'کوئی اس اکاؤنٹ میں ایک اکاؤنٹ ضم کرنے کی درخواست کر رہا ہے۔',
    'account.mergeNone': 'اس اکاؤنٹ پر کچھ منتظر نہیں ہے۔',
    'account.mergeLink': 'اکاؤنٹ ضم کرنا',
    'account.mergeLinkWaiting': 'اکاؤنٹ ضم کرنا (منتظر: {count})',
    'account.sponsorHeading': 'کفالت والی نشستیں',
    'account.sponsorBody':
      'کسی کورس کی قیمت کوئی اور ادا کر سکتا ہے۔ اگر کورس آپ کی پہنچ سے باہر ہے تو نشست مانگیں، یا کسی منتظر نشست کی قیمت ادا کریں — دونوں فریق کبھی نہیں جانتے کہ دوسرا کون ہے۔',
    'account.sponsorMine': 'جو میں نے مانگا اور جس کی کفالت کی',
    'account.sponsorWaiting': 'منتظر نشستیں',
    'account.teachHeading': 'یہاں پڑھانا',
    'account.teachBody':
      'پڑھانا تقرری سے ہوتا ہے — صرف اندراج کرنے سے کوئی استاد نہیں بنتا۔ اگر آپ پڑھانا چاہتے ہیں تو اپنی اہلیتیں اور اپنے دیے ہوئے کسی سبق کا لنک بھیج سکتے ہیں، اور مالک اسے پڑھتا ہے۔',
    'account.teachLink': 'پڑھانے کی درخواست دیں',
    'account.inviteHeading': 'دوست کو دعوت دیں',
    'account.inviteBody':
      'یہاں نئے آنے والے دوست کو اپنے پہلے کورس پر رعایت ملتی ہے، اور جب اس کی ادائیگی رقم واپسی کی مدت سے گزر جائے تو آپ کو اپنے اگلے کورس پر رعایت ملتی ہے۔ دونوں رعایتیں ہیں، رقم نہیں، اس لیے ادا کرنے کو کچھ نہیں۔',
    'account.inviteLink': 'آپ کا دعوتی کوڈ',
    'account.shareHeading': 'اپنی تعلیم شیئر کرنا',
    'account.shareBody':
      'آپ کی پیش رفت اور اسناد نجی ہیں، آپ کے خاندان سے بھی۔ کسی کو ای میل سے دعوت دیں اور وہ خود اسے قبول کرتا ہے؛ آپ طے کرتے ہیں کہ وہ کیا دیکھے اور کب تک، اور آپ جب چاہیں اسے ختم کر سکتے ہیں۔',
    'account.shareLink': 'میری تعلیم کون دیکھ سکتا ہے',
    'account.readHeading': 'یہ کیسا دکھتا ہے',
    'account.readBody':
      'متن کا سائز، تضاد اور حرکت — چنتے ہی لاگو ہو جاتے ہیں، اسی براؤزر کے لیے۔ یہاں کچھ محفوظ کرنے کی ضرورت نہیں، اور صفحے میں کچھ اور نہیں بدلتا۔',
    'account.readLink': 'پڑھنے کی ترجیحات',
    'account.termsBody': 'شرائط، رازداری کا نوٹس اور اساتذہ کی شرائط، ہر ایک نسخہ وار۔',
    'account.termsAgreed': 'جن نسخوں سے آپ نے اتفاق کیا ہے وہ اتفاق کے وقت کے ساتھ درج ہیں۔',
    'account.termsNone': 'آپ کی رضامندی کا کچھ منتظر نہیں ہے۔',
    'account.termsLink': 'انہیں پڑھیں',
    'account.instHeading': 'میرا ادارہ',
    'account.instBody':
      'کوئی مدرسہ، اسکول یا تنظیم جس سے آپ وابستہ ہیں۔ اگر آپ کا ای میل پتہ ایسے ڈومین پر ہے جس کی ان میں سے کسی نے تصدیق کی ہے تو آپ اس میں شامل ہو سکتے ہیں؛ شامل ہونے کے بعد وہ صرف اپنے لوگوں کی تعداد دیکھتا ہے، آپ کا نام یا جو آپ نے پڑھا وہ کبھی نہیں۔',
    'account.instLink': 'میں کہاں وابستہ ہوں',
    'account.paidHeading': 'میں نے کیا ادا کیا',
    'account.paidBody':
      'آپ کے بلنگ اکاؤنٹ پر ہونے والی ہر ادائیگی، اور واپس آنے والی ہر رقم، ہر کرنسی کے جاری مجموعے کے ساتھ۔ جس رقم واپسی کی آپ نے درخواست کی ہے وہ اس وقت تک الگ درج رہتی ہے جب تک وہ واقعی منتقل نہ ہو، کیونکہ مانگنا وصول کرنا نہیں ہے۔',
    'account.paidLink': 'دیکھیں میں نے کیا ادا کیا',
    'account.toldHeading': 'مجھے کیا بتایا جاتا ہے',
    'account.toldBody':
      'پلیٹ فارم کے پیغامات آپ کے اطلاعاتی مرکز میں آتے ہیں، کسی اِن باکس یا ٹیکسٹ پیغام میں نہیں — ابھی بھیجنے والا کوئی فراہم کنندہ ترتیب نہیں دیا گیا۔',
    'account.toldUnreadOne': 'آپ کا {count} پیغام بغیر پڑھا ہے۔',
    'account.toldUnreadOther': 'آپ کے {count} پیغامات بغیر پڑھے ہیں۔',
    'account.toldNone': 'آپ کا کچھ منتظر نہیں ہے۔',
    'account.toldChoice':
      'آپ چنتے ہیں کہ کون سی قسمیں چاہییں، سوائے ان اطلاعات کے کہ آپ کی واجب الادا رقم نہیں پہنچی: وہ ہمیشہ آتی ہیں۔',
    'account.toldLinkUnread': 'اطلاعات (بغیر پڑھی: {count})',
    'account.toldPrefs': 'چنیں کہ آپ کو کیا بتایا جائے',
    'account.dataHeading': 'میرا ڈیٹا',
    'account.dataBody':
      'اس اکاؤنٹ کے بارے میں ہمارے پاس جو کچھ ہے اسے ایک فائل میں ڈاؤن لوڈ کریں: آپ کا پروفائل، وہ سیکھنے والے جن کے آپ ذمہ دار ہیں، انہوں نے کیا پڑھا اور مکمل کیا، آپ کی اسناد، آرڈر اور رسیدیں، آپ کے نوٹس، اور وہ لوگ جن سے آپ نے اپنی تعلیم شیئر کی ہے۔',
    'account.dataDownload': 'میرا ڈیٹا ڈاؤن لوڈ کریں',
    'account.dataSheet': 'اسپریڈ شیٹ کے طور پر',
    'account.dataPrint': 'پڑھیں یا پرنٹ کریں',
    'account.dataMore':
      'اب اس میں پہلے سے زیادہ ہے: مباحثے کی تحریریں، جائزے اور جانچا ہوا کام، سپورٹ کیس، آپ کو بھیجے گئے پیغامات، اور — اگر آپ پڑھاتے ہیں — آپ کی آمدنی اور ادائیگیاں۔',
    'account.dataWhat': 'اس میں کیا ہے اور کیا چھوڑا گیا ہے',
    'account.dataRestore':
      'پہلے سے فائل موجود ہے؟ آپ کا پروفائل، نوٹس اور بُک مارکس ان اسباق پر واپس رکھے جا سکتے ہیں جن میں آپ کا اندراج ہے؛ اندراجات، اسناد اور آرڈر نہیں رکھے جا سکتے، اور وہ صفحہ وجہ بتاتا ہے۔',
    'account.dataRestoreLink': 'واپس رکھیں',
    'account.closeHeading': 'اس اکاؤنٹ کو بند کرنا',
    'account.closeBody':
      'بند کرنے سے آپ کا پروفائل بدل جاتا ہے، کچھ ذاتی معلومات ہٹ جاتی ہیں اور آپ کو سائن آؤٹ کرنے کی کوشش کی جاتی ہے۔ آرڈر، ادائیگیاں، اندراجات اور اسناد رکھی جاتی ہیں، کیونکہ رقم واپسی یا سند کی جانچ کو اب بھی ان کی ضرورت ہے، اور کچھ دوسرے ریکارڈ بھی باقی رہتے ہیں۔ کچھ ہونے سے پہلے صفحہ دونوں پہلو دکھاتا ہے۔',
    'account.closeLink': 'یہ اکاؤنٹ بند کریں',
  },
  fa: {
    'account.lede':
      'نحوهٔ نمایش حساب خود را مدیریت کنید. نشانی ورود شما فقط برای اطلاع نشان داده شده و اینجا تغییر نمی‌کند.',
    'account.status': 'وضعیت حساب: {status}',
    'account.statusActive': 'فعال',
    'account.statusSuspended': 'تعلیق‌شده',
    'account.statusClosed': 'بسته',
    'account.owedHeading': 'پیش از ادامه',
    'account.owedOne': '{count} سند منتظر موافقت شماست.',
    'account.owedOther': '{count} سند منتظر موافقت شماست.',
    'account.owedBody':
      'بخوانید و موافقت کنید؛ زمان موافقت در حساب شما نگه داشته می‌شود. در این میان هیچ چیز دیگری در این صفحه از شما بازداشته نمی‌شود.',
    'account.owedVersion': '{title} — نسخهٔ {number}',
    'account.selfHeading': 'یادگیری به نام خودتان',
    'account.selfLearnsAs':
      'این حساب به نام {name} یاد می‌گیرد. دوره‌هایی که در آن‌ها ثبت‌نام می‌کنید یا می‌خرید متعلق به همین یادگیرنده است و پیشرفت هیچ‌کس دیگری با آن آمیخته نمی‌شود.',
    'account.selfInFamily':
      'یادگیری شما درون یک حساب خانوادگی است، پس یک طرح خانوادگی می‌تواند شما را در کنار فرزندان پوشش دهد. آن را در صفحهٔ خانواده مدیریت می‌کنید.',
    'account.selfOnOwn':
      'یادگیری شما جداگانه است. اگر حساب خانوادگی دارید، می‌توانید آن را کنار فرزندان ببرید تا یک طرح همه را پوشش دهد — همان نمایه، همان پیشرفت.',
    'account.selfGo': 'رفتن به یادگیری من',
    'account.selfJoinFamily': 'یادگیری درون خانواده‌ام',
    'account.selfWhoSees': 'چه کسی می‌تواند پیشرفت مرا ببیند',
    'account.selfNone':
      'هنوز نمایهٔ یادگیرنده ندارید. پیش از ثبت‌نام در دوره، خرید دوره یا به اشتراک گذاشتن پیشرفتتان به آن نیاز دارید — دوره همیشه برای یادگیرنده‌ای با نام مشخص است و این‌گونه یادگیرنده می‌شوید.',
    'account.selfFamilyInstead':
      'اگر حساب خانوادگی دارید، می‌توانید به‌جای آن همان‌جا یادگیرنده شوید و از آغاز عضو خانواده باشید.',
    'account.selfClaimNote':
      'این کار حساب دومی نمی‌سازد؛ شما را به‌عنوان یادگیرنده به همین حساب اضافه می‌کند.',
    'account.formName': 'نام نمایشی',
    'account.formLanguage': 'کد زبان دلخواه',
    'account.formLanguageNote':
      'این با نمایهٔ شما نگه داشته می‌شود و هنوز چیزی از آن استفاده نمی‌کند. زبان این صفحه‌ها در صفحهٔ زبان انتخاب می‌شود و در همین مرورگر می‌ماند.',
    'account.formZone': 'منطقهٔ زمانی',
    'account.formSave': 'ذخیرهٔ نمایه',
    'account.formSaved': 'نمایهٔ شما به‌روز شد.',
    'account.formFailed': 'نمایهٔ شما ذخیره نشد. دوباره تلاش کنید.',
    'account.formNameMissing': 'نامی را که می‌خواهید دیگران ببینند وارد کنید.',
    'account.formNameLong': 'نام نمایشی را حداکثر {count} نویسه نگه دارید.',
    'account.formLanguageBad': 'از کد زبانی مانند en یا en-GB استفاده کنید.',
    'account.formZoneLong': 'منطقهٔ زمانی را حداکثر {count} نویسه نگه دارید.',
    'account.formZoneBad': 'از یک منطقهٔ زمانی معتبر IANA مانند Africa/Kampala استفاده کنید.',
    'account.formSignedOut': 'از حساب خارج شده‌اید. دوباره وارد شوید و سپس ذخیره کنید.',
    'account.formNotFound': 'نمایهٔ شما پیدا نشد. خارج شوید و دوباره وارد شوید، سپس تلاش کنید.',
    'account.signInHeading': 'چگونه وارد می‌شوید',
    'account.signInBoth': 'می‌توانید با گذرواژه یا با Google وارد شوید.',
    'account.signInPassword': 'با نشانی ایمیل و گذرواژه وارد می‌شوید.',
    'account.signInGoogle': 'با Google وارد می‌شوید. این حساب گذرواژه ندارد.',
    'account.signInPhone': 'با کدی که به تلفن شما فرستاده می‌شود وارد می‌شوید.',
    'account.signInOther': 'از این راه وارد می‌شوید: {methods}.',
    'account.signInNone': 'هیچ روش ورودی برای این حساب ثبت نشده است.',
    'account.signInUnread': 'روش‌های ورود شما اکنون خوانده نشد.',
    'account.resetBody':
      'پیوند امن بازنشانی گذرواژه را به ایمیل ورودتان بفرستید. پیوند طبق تنظیمات ارائه‌دهندهٔ احراز هویت شما منقضی می‌شود.',
    'account.resetLink': 'فرستادن پیوند بازنشانی',
    'account.noPasswordGoogle':
      'این حساب گذرواژه ندارد، پس چیزی برای بازنشانی نیست — همچنان با Google وارد شوید.',
    'account.noPasswordPhone': 'این حساب با کد تلفن وارد می‌شود، پس گذرواژه‌ای برای بازنشانی نیست.',
    'account.mergeHeading': 'دو حساب، یک نفر',
    'account.mergeBody':
      'اگر دو بار ثبت‌نام کرده‌اید، می‌توان حساب‌ها را یکی کرد. حسابی که نگه می‌دارید می‌ماند؛ دیگری بسته می‌شود، و پیش از هر جابه‌جایی هر دو باید موافقت کنند.',
    'account.mergeWaiting': 'کسی درخواست کرده حسابی در این حساب ادغام شود.',
    'account.mergeNone': 'چیزی منتظر این حساب نیست.',
    'account.mergeLink': 'ادغام حساب‌ها',
    'account.mergeLinkWaiting': 'ادغام حساب‌ها (در انتظار: {count})',
    'account.sponsorHeading': 'جایگاه‌های حمایت‌شده',
    'account.sponsorBody':
      'هزینهٔ دوره را کس دیگری می‌تواند بپردازد. اگر دوره‌ای از توان شما بیرون است درخواست جایگاه کنید، یا هزینهٔ جایگاهی را که در انتظار است بپردازید — هیچ‌یک از دو طرف هرگز نمی‌فهمد دیگری کیست.',
    'account.sponsorMine': 'آنچه درخواست کرده‌ام و آنچه حمایت کرده‌ام',
    'account.sponsorWaiting': 'جایگاه‌های در انتظار',
    'account.teachHeading': 'تدریس در اینجا',
    'account.teachBody':
      'تدریس با انتصاب است — کسی با ثبت‌نام معلم نمی‌شود. اگر می‌خواهید تدریس کنید، می‌توانید مدارک خود و پیوند درسی را که داده‌اید بفرستید و مالک آن را می‌خواند.',
    'account.teachLink': 'درخواست تدریس',
    'account.inviteHeading': 'دعوت از دوست',
    'account.inviteBody':
      'دوستی که تازه به اینجا آمده برای نخستین دوره‌اش تخفیف می‌گیرد، و شما پس از گذشتن پرداخت او از مهلت بازپرداخت، برای دورهٔ بعدی خود تخفیف می‌گیرید. هر دو تخفیف‌اند نه پول، پس چیزی برای پرداخت نیست.',
    'account.inviteLink': 'کد دعوت شما',
    'account.shareHeading': 'اشتراک‌گذاری یادگیری من',
    'account.shareBody':
      'پیشرفت و گواهی‌نامه‌های شما خصوصی است، حتی برای خانواده‌تان. کسی را با ایمیل دعوت کنید و او خودش می‌پذیرد؛ شما انتخاب می‌کنید چه ببیند و تا چه زمانی، و هر وقت بخواهید می‌توانید آن را پایان دهید.',
    'account.shareLink': 'چه کسی می‌تواند یادگیری مرا ببیند',
    'account.readHeading': 'شیوهٔ نمایش',
    'account.readBody':
      'اندازهٔ متن، تضاد رنگ و حرکت — همان لحظه که انتخاب کنید برای این مرورگر اعمال می‌شود. اینجا چیزی نیاز به ذخیره ندارد و چیز دیگری در صفحه تغییر نمی‌کند.',
    'account.readLink': 'ترجیحات خواندن',
    'account.termsBody': 'شرایط، اطلاعیهٔ حریم خصوصی و شرایط معلمان، هر یک با شمارهٔ نسخه.',
    'account.termsAgreed': 'نسخه‌هایی که با آن‌ها موافقت کرده‌اید با زمان موافقت فهرست شده‌اند.',
    'account.termsNone': 'چیزی منتظر موافقت شما نیست.',
    'account.termsLink': 'خواندن آن‌ها',
    'account.instHeading': 'مؤسسهٔ من',
    'account.instBody':
      'مدرسهٔ دینی، مدرسه یا سازمانی که عضو آن هستید. اگر نشانی ایمیل شما در دامنه‌ای باشد که یکی از آن‌ها تأیید کرده، می‌توانید به آن بپیوندید؛ پس از پیوستن، آن مؤسسه فقط شمار افرادش را می‌بیند و هرگز نام شما یا آنچه خوانده‌اید را نمی‌بیند.',
    'account.instLink': 'جایی که عضو آن هستم',
    'account.paidHeading': 'آنچه پرداخته‌ام',
    'account.paidBody':
      'هر پرداختی که در حساب صورت‌حساب شما انجام شده و هر بازپرداختی که برگشته، با جمع جاری برای هر ارز. بازپرداختی که درخواست کرده‌اید تا زمانی که واقعاً انجام نشود جداگانه فهرست می‌شود، چون درخواست کردن دریافت کردن نیست.',
    'account.paidLink': 'دیدن آنچه پرداخته‌ام',
    'account.toldHeading': 'آنچه به من گفته می‌شود',
    'account.toldBody':
      'پیام‌های سکو در مرکز اعلان‌های شما نمایش داده می‌شود، نه در صندوق ایمیل یا پیامک — هنوز هیچ ارائه‌دهندهٔ ارسالی تنظیم نشده است.',
    'account.toldUnreadOne': '{count} پیام خوانده‌نشده دارید.',
    'account.toldUnreadOther': '{count} پیام خوانده‌نشده دارید.',
    'account.toldNone': 'چیزی منتظر شما نیست.',
    'account.toldChoice':
      'شما انتخاب می‌کنید کدام نوع‌ها را می‌خواهید، مگر اعلان‌هایی که می‌گویند پولی که به شما بدهکاریم نرسیده است: آن‌ها همیشه می‌آیند.',
    'account.toldLinkUnread': 'اعلان‌ها ({count} خوانده‌نشده)',
    'account.toldPrefs': 'انتخاب کنید چه چیزی به شما گفته شود',
    'account.dataHeading': 'داده‌های من',
    'account.dataBody':
      'هر آنچه دربارهٔ این حساب نگه می‌داریم را در یک پرونده بارگیری کنید: نمایهٔ شما، یادگیرندگانی که مسئولشان هستید، آنچه خوانده و تمام کرده‌اند، گواهی‌نامه‌ها، سفارش‌ها و رسیدهایتان، یادداشت‌هایتان و کسانی که یادگیری خود را با آن‌ها به اشتراک گذاشته‌اید.',
    'account.dataDownload': 'بارگیری داده‌های من',
    'account.dataSheet': 'به‌صورت صفحه‌گسترده',
    'account.dataPrint': 'خواندن یا چاپ',
    'account.dataMore':
      'اکنون بیش از پیش در آن هست: نوشته‌های گفت‌وگو، بازبینی‌ها و کارهای نمره‌داده‌شده، پرونده‌های پشتیبانی، پیام‌های فرستاده‌شده به شما، و — اگر تدریس می‌کنید — درآمدها و پرداخت‌های شما.',
    'account.dataWhat': 'چه چیزی در آن هست و چه چیزی کنار گذاشته شده',
    'account.dataRestore':
      'از پیش پرونده‌ای دارید؟ نمایه، یادداشت‌ها و نشانک‌های شما را می‌توان به درس‌هایی که در آن‌ها ثبت‌نام کرده‌اید برگرداند؛ ثبت‌نام‌ها، گواهی‌نامه‌ها و سفارش‌ها را نمی‌توان، و آن صفحه دلیلش را می‌گوید.',
    'account.dataRestoreLink': 'برگرداندن',
    'account.closeHeading': 'بستن این حساب',
    'account.closeBody':
      'بستن حساب نمایهٔ شما را تغییر می‌دهد، برخی اطلاعات شخصی را برمی‌دارد و می‌کوشد شما را خارج کند. سفارش‌ها، پرداخت‌ها، ثبت‌نام‌ها و گواهی‌نامه‌ها نگه داشته می‌شوند، چون بازپرداخت یا بررسی گواهی‌نامه هنوز به آن‌ها نیاز دارد، و برخی سوابق دیگر نیز باقی می‌مانند. صفحه پیش از هر اتفاقی هر دو سو را فهرست می‌کند.',
    'account.closeLink': 'بستن این حساب',
  },
  'fa-af': {
    'account.lede':
      'طرز نمایش حساب خود را مدیریت کنید. نشانی ورود شما تنها برای معلومات نشان داده شده و اینجا تغییر نمی‌کند.',
    'account.status': 'وضعیت حساب: {status}',
    'account.statusActive': 'فعال',
    'account.statusSuspended': 'تعلیق‌شده',
    'account.statusClosed': 'بسته',
    'account.owedHeading': 'پیش از ادامه',
    'account.owedOne': '{count} سند منتظر موافقت شماست.',
    'account.owedOther': '{count} سند منتظر موافقت شماست.',
    'account.owedBody':
      'بخوانید و موافقت کنید؛ وقت موافقت در حساب شما نگه‌داری می‌شود. در این میان هیچ چیز دیگر این صفحه از شما گرفته نمی‌شود.',
    'account.owedVersion': '{title} — نسخهٔ {number}',
    'account.selfHeading': 'آموزش به نام خودتان',
    'account.selfLearnsAs':
      'این حساب به نام {name} می‌آموزد. کورس‌هایی که در آن‌ها ثبت‌نام می‌کنید یا می‌خرید از همین شاگرد است و پیشرفت هیچ کس دیگر با آن یکجا نمی‌شود.',
    'account.selfInFamily':
      'آموزش شما در داخل یک حساب فامیلی است، پس یک پلان فامیلی می‌تواند شما را در کنار اطفال شامل سازد. آن را در صفحهٔ فامیل مدیریت می‌کنید.',
    'account.selfOnOwn':
      'آموزش شما جداگانه است. اگر حساب فامیلی دارید، می‌توانید آن را در کنار اطفال ببرید تا یک پلان همه را شامل سازد — همان پروفایل، همان پیشرفت.',
    'account.selfGo': 'رفتن به آموزش من',
    'account.selfJoinFamily': 'آموزش در داخل فامیل من',
    'account.selfWhoSees': 'کی می‌تواند پیشرفت مرا ببیند',
    'account.selfNone':
      'شما هنوز پروفایل شاگرد ندارید. پیش از ثبت‌نام در کورس، خرید کورس یا شریک ساختن پیشرفت‌تان به آن نیاز است — کورس همیشه برای شاگردی با نام مشخص است و به همین ترتیب شاگرد می‌شوید.',
    'account.selfFamilyInstead':
      'اگر حساب فامیلی دارید، می‌توانید به جای آن همان‌جا شاگرد شوید و از آغاز عضو فامیل باشید.',
    'account.selfClaimNote':
      'این کار حساب دوم نمی‌سازد؛ شما را به حیث شاگرد به همین حساب اضافه می‌کند.',
    'account.formName': 'نام نمایشی',
    'account.formLanguage': 'کود زبان دلخواه',
    'account.formLanguageNote':
      'این با پروفایل شما نگه‌داری می‌شود و هنوز هیچ چیز از آن استفاده نمی‌کند. زبان این صفحه‌ها در صفحهٔ زبان انتخاب می‌شود و در همین مرورگر می‌ماند.',
    'account.formZone': 'ساحهٔ زمانی',
    'account.formSave': 'ذخیرهٔ پروفایل',
    'account.formSaved': 'پروفایل شما تازه شد.',
    'account.formFailed': 'پروفایل شما ذخیره نشد. دوباره کوشش کنید.',
    'account.formNameMissing': 'نامی را که می‌خواهید دیگران ببینند بنویسید.',
    'account.formNameLong': 'نام نمایشی را حد اکثر {count} حرف نگه دارید.',
    'account.formLanguageBad': 'از کود زبان مانند en یا en-GB استفاده کنید.',
    'account.formZoneLong': 'ساحهٔ زمانی را حد اکثر {count} حرف نگه دارید.',
    'account.formZoneBad': 'از یک ساحهٔ زمانی معتبر IANA مانند Africa/Kampala استفاده کنید.',
    'account.formSignedOut': 'از حساب بیرون شده‌اید. دوباره داخل شوید و بعد ذخیره کنید.',
    'account.formNotFound': 'پروفایل شما پیدا نشد. بیرون شوید و دوباره داخل شوید، بعد کوشش کنید.',
    'account.signInHeading': 'چگونه داخل می‌شوید',
    'account.signInBoth': 'می‌توانید با رمز یا با Google داخل شوید.',
    'account.signInPassword': 'با نشانی ایمیل و رمز داخل می‌شوید.',
    'account.signInGoogle': 'با Google داخل می‌شوید. این حساب رمز ندارد.',
    'account.signInPhone': 'با کودی که به تلیفون شما فرستاده می‌شود داخل می‌شوید.',
    'account.signInOther': 'از این راه داخل می‌شوید: {methods}.',
    'account.signInNone': 'هیچ روش ورود برای این حساب ثبت نشده است.',
    'account.signInUnread': 'روش‌های ورود شما همین حالا خوانده نشد.',
    'account.resetBody':
      'لینک مصؤن تنظیم دوبارهٔ رمز را به ایمیل ورودتان بفرستید. لینک مطابق تنظیمات فراهم‌کنندهٔ تصدیق هویت شما منقضی می‌شود.',
    'account.resetLink': 'فرستادن لینک تنظیم دوباره',
    'account.noPasswordGoogle':
      'این حساب رمز ندارد، پس چیزی برای تنظیم دوباره نیست — همچنان با Google داخل شوید.',
    'account.noPasswordPhone':
      'این حساب با کود تلیفون داخل می‌شود، پس رمزی برای تنظیم دوباره نیست.',
    'account.mergeHeading': 'دو حساب، یک نفر',
    'account.mergeBody':
      'اگر دو بار ثبت‌نام کرده‌اید، می‌شود حساب‌ها را یکجا کرد. حسابی که نگه می‌دارید می‌ماند؛ دیگرش بسته می‌شود، و پیش از هر انتقال هر دو باید موافقت کنند.',
    'account.mergeWaiting': 'کسی خواسته است حسابی با این حساب یکجا شود.',
    'account.mergeNone': 'چیزی منتظر این حساب نیست.',
    'account.mergeLink': 'یکجا کردن حساب‌ها',
    'account.mergeLinkWaiting': 'یکجا کردن حساب‌ها (در انتظار: {count})',
    'account.sponsorHeading': 'چوکی‌های حمایت‌شده',
    'account.sponsorBody':
      'پول کورس را کس دیگری می‌تواند بپردازد. اگر کورسی از توان شما بیرون است چوکی بخواهید، یا پول چوکی‌ای را که در انتظار است بپردازید — هیچ یک از دو طرف هرگز نمی‌داند دیگری کیست.',
    'account.sponsorMine': 'آنچه خواسته‌ام و آنچه حمایت کرده‌ام',
    'account.sponsorWaiting': 'چوکی‌های در انتظار',
    'account.teachHeading': 'تدریس در اینجا',
    'account.teachBody':
      'تدریس با تقرر است — کسی با ثبت‌نام معلم نمی‌شود. اگر می‌خواهید تدریس کنید، می‌توانید اسناد تحصیلی خود و لینک درسی را که داده‌اید بفرستید و مالک آن را می‌خواند.',
    'account.teachLink': 'درخواست تدریس',
    'account.inviteHeading': 'دعوت از دوست',
    'account.inviteBody':
      'دوستی که تازه به اینجا آمده برای نخستین کورس خود تخفیف می‌گیرد، و شما پس از آنکه پرداخت او از مهلت بازپرداخت گذشت، برای کورس بعدی خود تخفیف می‌گیرید. هر دو تخفیف است نه پول، پس چیزی برای پرداخت نیست.',
    'account.inviteLink': 'کود دعوت شما',
    'account.shareHeading': 'شریک ساختن آموزش من',
    'account.shareBody':
      'پیشرفت و اسناد شما خصوصی است، حتی برای فامیل‌تان. کسی را با ایمیل دعوت کنید و او خودش آن را می‌پذیرد؛ شما انتخاب می‌کنید چه ببیند و تا چه وقت، و هر وقت بخواهید می‌توانید آن را ختم کنید.',
    'account.shareLink': 'کی می‌تواند آموزش مرا ببیند',
    'account.readHeading': 'طرز نمایش',
    'account.readBody':
      'اندازهٔ متن، تضاد رنگ و حرکت — همان لحظه که انتخاب کنید برای این مرورگر عملی می‌شود. اینجا چیزی به ذخیره نیاز ندارد و چیز دیگری در صفحه تغییر نمی‌کند.',
    'account.readLink': 'ترجیحات خواندن',
    'account.termsBody': 'شرایط، اطلاعیهٔ محرمیت و شرایط معلمان، هر یک با شمارهٔ نسخه.',
    'account.termsAgreed': 'نسخه‌هایی که با آن‌ها موافقت کرده‌اید با وقت موافقت فهرست شده‌اند.',
    'account.termsNone': 'چیزی منتظر موافقت شما نیست.',
    'account.termsLink': 'خواندن آن‌ها',
    'account.instHeading': 'مؤسسهٔ من',
    'account.instBody':
      'مدرسهٔ دینی، مکتب یا سازمانی که عضو آن هستید. اگر نشانی ایمیل شما در دومینی باشد که یکی از آن‌ها تصدیق کرده، می‌توانید به آن بپیوندید؛ پس از پیوستن، آن مؤسسه تنها شمار افراد خود را می‌بیند و هرگز نام شما یا آنچه خوانده‌اید را نمی‌بیند.',
    'account.instLink': 'جایی که عضو آن هستم',
    'account.paidHeading': 'آنچه پرداخته‌ام',
    'account.paidBody':
      'هر پرداختی که در حساب بل شما انجام شده و هر بازپرداختی که برگشته، با مجموع جاری برای هر واحد پولی. بازپرداختی که خواسته‌اید تا وقتی واقعاً انجام نشود جداگانه فهرست می‌شود، زیرا خواستن گرفتن نیست.',
    'account.paidLink': 'دیدن آنچه پرداخته‌ام',
    'account.toldHeading': 'آنچه به من گفته می‌شود',
    'account.toldBody':
      'پیام‌های پلتفرم در مرکز اطلاعیه‌های شما نمایش داده می‌شود، نه در صندوق ایمیل یا پیام متنی — هنوز هیچ فراهم‌کنندهٔ ارسال تنظیم نشده است.',
    'account.toldUnreadOne': '{count} پیام ناخوانده دارید.',
    'account.toldUnreadOther': '{count} پیام ناخوانده دارید.',
    'account.toldNone': 'چیزی منتظر شما نیست.',
    'account.toldChoice':
      'شما انتخاب می‌کنید کدام نوع‌ها را می‌خواهید، مگر اطلاعیه‌هایی که می‌گویند پولی که از شماست نرسیده است: آن‌ها همیشه می‌آیند.',
    'account.toldLinkUnread': 'اطلاعیه‌ها ({count} ناخوانده)',
    'account.toldPrefs': 'انتخاب کنید چه به شما گفته شود',
    'account.dataHeading': 'معلومات من',
    'account.dataBody':
      'هر آنچه دربارهٔ این حساب نگه می‌داریم را در یک فایل داونلود کنید: پروفایل شما، شاگردانی که مسئول‌شان هستید، آنچه خوانده و تمام کرده‌اند، اسناد، فرمایش‌ها و رسیدهای‌تان، یادداشت‌های‌تان و کسانی که آموزش خود را با آن‌ها شریک ساخته‌اید.',
    'account.dataDownload': 'داونلود معلومات من',
    'account.dataSheet': 'به شکل صفحهٔ جدولی',
    'account.dataPrint': 'خواندن یا چاپ',
    'account.dataMore':
      'حالا بیشتر از پیش در آن است: نوشته‌های گفت‌وگو، بازبینی‌ها و کارهای نمره‌داده‌شده، دوسیه‌های پشتیبانی، پیام‌های فرستاده‌شده به شما، و — اگر تدریس می‌کنید — عواید و پرداخت‌های شما.',
    'account.dataWhat': 'چه چیز در آن است و چه چیز بیرون مانده',
    'account.dataRestore':
      'از پیش فایل دارید؟ پروفایل، یادداشت‌ها و نشانی‌های شما را می‌شود به درس‌هایی که در آن‌ها ثبت‌نام هستید برگرداند؛ ثبت‌نام‌ها، اسناد و فرمایش‌ها را نمی‌شود، و آن صفحه دلیلش را می‌گوید.',
    'account.dataRestoreLink': 'برگرداندن',
    'account.closeHeading': 'بستن این حساب',
    'account.closeBody':
      'بستن حساب پروفایل شما را تغییر می‌دهد، برخی معلومات شخصی را برمی‌دارد و می‌کوشد شما را بیرون کند. فرمایش‌ها، پرداخت‌ها، ثبت‌نام‌ها و اسناد نگه‌داری می‌شوند، زیرا بازپرداخت یا بررسی یک سند هنوز به آن‌ها نیاز دارد، و برخی سوابق دیگر نیز باقی می‌مانند. صفحه پیش از هر رویدادی هر دو طرف را فهرست می‌کند.',
    'account.closeLink': 'بستن این حساب',
  },
  tr: {
    'account.lede':
      'Hesabınızın nasıl göründüğünü yönetin. Oturum açma adresiniz bilgi için gösterilir ve buradan değiştirilmez.',
    'account.status': 'Hesap durumu: {status}',
    'account.statusActive': 'etkin',
    'account.statusSuspended': 'askıya alındı',
    'account.statusClosed': 'kapalı',
    'account.owedHeading': 'Devam etmeden önce',
    'account.owedOne': '{count} belge onayınızı bekliyor.',
    'account.owedOther': '{count} belge onayınızı bekliyor.',
    'account.owedBody':
      'Okuyup onaylayın; onayladığınız zaman hesabınıza kaydedilir. Bu sırada bu sayfadaki başka hiçbir şey sizden esirgenmez.',
    'account.owedVersion': '{title} — sürüm {number}',
    'account.selfHeading': 'Kendi adınıza öğrenmek',
    'account.selfLearnsAs':
      'Bu hesap {name} adıyla öğreniyor. Kaydolduğunuz veya satın aldığınız kurslar bu öğrenciye aittir ve başka kimsenin ilerlemesi buna karışmaz.',
    'account.selfInFamily':
      'Öğreniminiz bir aile hesabının içinde, bu yüzden tek bir aile planı sizi çocuklarla birlikte kapsayabilir. Bunu aile sayfasından yönetirsiniz.',
    'account.selfOnOwn':
      'Öğreniminiz tek başına duruyor. Bir aile hesabı yönetiyorsanız, tek planın herkesi kapsaması için onu çocukların yanına taşıyabilirsiniz — aynı profil, aynı ilerleme.',
    'account.selfGo': 'Öğrenimime git',
    'account.selfJoinFamily': 'Ailemin içinde öğren',
    'account.selfWhoSees': 'İlerlememi kimler görebilir',
    'account.selfNone':
      'Henüz bir öğrenci profiliniz yok. Bir kursa kaydolmadan, kurs satın almadan veya ilerlemenizi paylaşmadan önce bir profil gerekir — kurs her zaman adı belli bir öğrenci içindir ve öğrenci olmanın yolu budur.',
    'account.selfFamilyInstead':
      'Bir aile hesabı yönetiyorsanız, bunun yerine orada öğrenci olabilir ve baştan ailenin parçası olabilirsiniz.',
    'account.selfClaimNote':
      'Bu, ikinci bir hesap oluşturmaz. Sizi bu hesaba öğrenci olarak ekler.',
    'account.formName': 'Görünen ad',
    'account.formLanguage': 'Tercih edilen dil kodu',
    'account.formLanguageNote':
      'Bu, profilinizle birlikte saklanır ve henüz hiçbir şey onu kullanmıyor. Bu sayfaların dili Dil sayfasından seçilir ve bu tarayıcıda saklanır.',
    'account.formZone': 'Saat dilimi',
    'account.formSave': 'Profili kaydet',
    'account.formSaved': 'Profiliniz güncellendi.',
    'account.formFailed': 'Profiliniz kaydedilemedi. Yeniden deneyin.',
    'account.formNameMissing': 'İnsanların görmesini istediğiniz adı ekleyin.',
    'account.formNameLong': 'Görünen adınız en fazla {count} karakter olsun.',
    'account.formLanguageBad': 'en veya en-GB gibi bir dil kodu kullanın.',
    'account.formZoneLong': 'Saat dilimi en fazla {count} karakter olsun.',
    'account.formZoneBad': 'Africa/Kampala gibi geçerli bir IANA saat dilimi kullanın.',
    'account.formSignedOut': 'Oturumunuz kapanmış. Yeniden oturum açın, sonra kaydedin.',
    'account.formNotFound':
      'Profiliniz bulunamadı. Oturumu kapatıp yeniden açın, sonra tekrar deneyin.',
    'account.signInHeading': 'Nasıl oturum açıyorsunuz',
    'account.signInBoth': 'Parolayla veya Google ile oturum açabilirsiniz.',
    'account.signInPassword': 'E-posta adresiniz ve bir parolayla oturum açıyorsunuz.',
    'account.signInGoogle': 'Google ile oturum açıyorsunuz. Bu hesapta parola yok.',
    'account.signInPhone': 'Telefonunuza gönderilen bir kodla oturum açıyorsunuz.',
    'account.signInOther': 'Şununla oturum açıyorsunuz: {methods}.',
    'account.signInNone': 'Bu hesap için kayıtlı bir oturum açma yöntemi yok.',
    'account.signInUnread': 'Oturum açma yöntemleriniz şu anda okunamadı.',
    'account.resetBody':
      'Oturum açma e-postanıza güvenli bir parola sıfırlama bağlantısı gönderin. Bağlantının süresi, kimlik doğrulama sağlayıcınızın ayarlarına göre dolar.',
    'account.resetLink': 'Sıfırlama bağlantısı gönder',
    'account.noPasswordGoogle':
      'Bu hesapta parola yok, dolayısıyla sıfırlanacak bir şey de yok — oturum açmak için Google’ı kullanmaya devam edin.',
    'account.noPasswordPhone':
      'Bu hesap telefon koduyla oturum açıyor, bu yüzden sıfırlanacak bir parola yok.',
    'account.mergeHeading': 'İki hesap, tek kişi',
    'account.mergeBody':
      'İki kez kaydolduysanız hesaplar birleştirilebilir. Sizde kalan hesap yaşar; diğeri kapatılır ve herhangi bir şey taşınmadan önce ikisinin de onaylaması gerekir.',
    'account.mergeWaiting': 'Biri, bir hesabı bu hesapla birleştirmek istiyor.',
    'account.mergeNone': 'Bu hesapta bekleyen bir şey yok.',
    'account.mergeLink': 'Hesapları birleştirme',
    'account.mergeLinkWaiting': 'Hesapları birleştirme (bekleyen: {count})',
    'account.sponsorHeading': 'Destekli yerler',
    'account.sponsorBody':
      'Bir kursun ücretini başka biri ödeyebilir. Kurs gücünüzü aşıyorsa bir yer isteyin ya da bekleyen bir yerin ücretini ödeyin — iki taraf birbirinin kim olduğunu asla öğrenmez.',
    'account.sponsorMine': 'İstediklerim ve desteklediklerim',
    'account.sponsorWaiting': 'Bekleyen yerler',
    'account.teachHeading': 'Burada öğretmek',
    'account.teachBody':
      'Öğretmenlik atamayla olur — kimse kaydolarak öğretmen olmaz. Öğretmek isterseniz yeterliliklerinizi ve verdiğiniz bir dersin bağlantısını gönderebilirsiniz; sahibi bunu okur.',
    'account.teachLink': 'Öğretmek için başvur',
    'account.inviteHeading': 'Bir arkadaşını davet et',
    'account.inviteBody':
      'Buraya yeni gelen bir arkadaşınız ilk kursunda indirim alır; onun ödemesi iade süresini geçtikten sonra siz de sonraki kursunuzda indirim alırsınız. İkisi de indirimdir, para değildir; yani ödenecek bir şey yoktur.',
    'account.inviteLink': 'Davet kodunuz',
    'account.shareHeading': 'Öğrenimimi paylaşmak',
    'account.shareBody':
      'İlerlemeniz ve sertifikalarınız özeldir, ailenize karşı bile. Birini e-postayla davet edin, daveti kendisi kabul eder; neyi göreceğini ve ne kadar süreceğini siz seçersiniz ve istediğiniz zaman sona erdirebilirsiniz.',
    'account.shareLink': 'Öğrenimimi kimler görebilir',
    'account.readHeading': 'Bu nasıl okunur',
    'account.readBody':
      'Metin boyutu, karşıtlık ve hareket — seçtiğiniz anda bu tarayıcı için uygulanır. Burada hiçbir şeyin kaydedilmesi gerekmez ve sayfada başka hiçbir şey değişmez.',
    'account.readLink': 'Okuma tercihleri',
    'account.termsBody':
      'Koşullar, gizlilik bildirimi ve öğretmen koşulları; her biri sürüm numaralı.',
    'account.termsAgreed': 'Onayladığınız sürümler, onayladığınız zamanla birlikte listelenir.',
    'account.termsNone': 'Onayınızı bekleyen bir şey yok.',
    'account.termsLink': 'Onları oku',
    'account.instHeading': 'Kurumum',
    'account.instBody':
      'Bağlı olduğunuz bir medrese, okul veya kuruluş. E-posta adresiniz bunlardan birinin doğruladığı bir alan adındaysa ona katılabilirsiniz; katıldıktan sonra kurum yalnızca kişi sayılarını görür, adınızı veya ne çalıştığınızı asla görmez.',
    'account.instLink': 'Nereye bağlıyım',
    'account.paidHeading': 'Ödediklerim',
    'account.paidBody':
      'Fatura hesabınızda gerçekleşen her ödeme ve geri gelen her iade, para birimi başına güncel toplamla birlikte. Talep ettiğiniz bir iade gerçekten gerçekleşene kadar ayrı listelenir, çünkü istemek almak değildir.',
    'account.paidLink': 'Ödediklerimi gör',
    'account.toldHeading': 'Bana bildirilenler',
    'account.toldBody':
      'Platformdan gelen mesajlar bir gelen kutusunda veya kısa mesajda değil, bildirim merkezinizde görünür — henüz bir gönderim sağlayıcısı yapılandırılmadı.',
    'account.toldUnreadOne': '{count} okunmamış mesajınız var.',
    'account.toldUnreadOther': '{count} okunmamış mesajınız var.',
    'account.toldNone': 'Sizi bekleyen bir şey yok.',
    'account.toldChoice':
      'Hangi türleri istediğinizi siz seçersiniz; size borçlu olunan paranın ulaşmadığına dair bildirimler bunun dışındadır: onlar her zaman gelir.',
    'account.toldLinkUnread': 'Bildirimler ({count} okunmamış)',
    'account.toldPrefs': 'Size ne bildirileceğini seçin',
    'account.dataHeading': 'Verilerim',
    'account.dataBody':
      'Bu hesap hakkında tuttuğumuz her şeyi tek dosya olarak indirin: profiliniz, sorumlu olduğunuz öğrenciler, onların çalıştıkları ve bitirdikleri, sertifikalarınız, siparişleriniz ve makbuzlarınız, notlarınız ve öğreniminizi paylaştığınız kişiler.',
    'account.dataDownload': 'Verilerimi indir',
    'account.dataSheet': 'Elektronik tablo olarak',
    'account.dataPrint': 'Oku veya yazdır',
    'account.dataMore':
      'Artık eskisinden fazlasını içeriyor: tartışma gönderileri, değerlendirmeler ve notlandırılmış çalışmalar, destek kayıtları, size gönderilen mesajlar ve — öğretiyorsanız — kazançlarınız ve ödemeleriniz.',
    'account.dataWhat': 'İçinde ne var, ne dışarıda bırakıldı',
    'account.dataRestore':
      'Elinizde zaten bir dosya mı var? Profiliniz, notlarınız ve yer imleriniz kayıtlı olduğunuz derslere geri konabilir; kayıtlar, sertifikalar ve siparişler geri konamaz ve o sayfa nedenini söyler.',
    'account.dataRestoreLink': 'Geri koy',
    'account.closeHeading': 'Bu hesabı kapatmak',
    'account.closeBody':
      'Kapatmak profilinizi değiştirir, bazı kişisel bilgileri kaldırır ve oturumunuzu kapatmaya çalışır. Siparişler, ödemeler, kayıtlar ve sertifikalar saklanır, çünkü bir iade veya bir sertifikanın doğrulanması hâlâ onlara ihtiyaç duyar; başka bazı kayıtlar da kalır. Sayfa, herhangi bir şey olmadan önce iki tarafı da listeler.',
    'account.closeLink': 'Bu hesabı kapat',
  },
  id: {
    'account.lede':
      'Atur bagaimana akun Anda ditampilkan. Alamat masuk Anda ditampilkan sebagai rujukan dan tidak diubah di sini.',
    'account.status': 'Status akun: {status}',
    'account.statusActive': 'aktif',
    'account.statusSuspended': 'ditangguhkan',
    'account.statusClosed': 'ditutup',
    'account.owedHeading': 'Sebelum Anda melanjutkan',
    'account.owedOne': '{count} dokumen menunggu persetujuan Anda.',
    'account.owedOther': '{count} dokumen menunggu persetujuan Anda.',
    'account.owedBody':
      'Baca lalu setujui, dan waktu Anda menyetujuinya disimpan pada akun Anda. Sementara itu, tidak ada hal lain di halaman ini yang ditahan.',
    'account.owedVersion': '{title} — versi {number}',
    'account.selfHeading': 'Belajar atas nama sendiri',
    'account.selfLearnsAs':
      'Akun ini belajar sebagai {name}. Kursus yang Anda ikuti atau beli menjadi milik peserta didik itu, dan kemajuan orang lain tidak tercampur ke dalamnya.',
    'account.selfInFamily':
      'Pembelajaran Anda berada di dalam akun keluarga, sehingga satu paket keluarga dapat mencakup Anda bersama anak-anaknya. Anda mengaturnya di halaman keluarga.',
    'account.selfOnOwn':
      'Pembelajaran Anda berdiri sendiri. Jika Anda mengelola akun keluarga, Anda dapat memindahkannya ke samping anak-anak agar satu paket mencakup semuanya — profil yang sama, kemajuan yang sama.',
    'account.selfGo': 'Buka pembelajaran saya',
    'account.selfJoinFamily': 'Belajar di dalam keluarga saya',
    'account.selfWhoSees': 'Siapa yang dapat melihat kemajuan saya',
    'account.selfNone':
      'Anda belum memiliki profil peserta didik. Profil diperlukan sebelum Anda dapat mendaftar kursus, membeli kursus, atau membagikan kemajuan Anda — kursus selalu untuk peserta didik yang bernama, dan beginilah Anda menjadi peserta didik.',
    'account.selfFamilyInstead':
      'Jika Anda mengelola akun keluarga, Anda dapat menjadi peserta didik di sana saja, dan menjadi bagian dari keluarga sejak awal.',
    'account.selfClaimNote':
      'Ini tidak membuat akun kedua. Ini menambahkan Anda sebagai peserta didik pada akun ini.',
    'account.formName': 'Nama tampilan',
    'account.formLanguage': 'Kode bahasa pilihan',
    'account.formLanguageNote':
      'Ini disimpan bersama profil Anda, dan belum ada yang memakainya. Bahasa halaman-halaman ini dipilih di halaman Bahasa dan disimpan di peramban ini.',
    'account.formZone': 'Zona waktu',
    'account.formSave': 'Simpan profil',
    'account.formSaved': 'Profil Anda telah diperbarui.',
    'account.formFailed': 'Profil Anda tidak dapat disimpan. Coba lagi.',
    'account.formNameMissing': 'Tambahkan nama yang ingin Anda perlihatkan kepada orang lain.',
    'account.formNameLong': 'Buat nama tampilan Anda paling banyak {count} karakter.',
    'account.formLanguageBad': 'Gunakan kode bahasa seperti en atau en-GB.',
    'account.formZoneLong': 'Buat zona waktu paling banyak {count} karakter.',
    'account.formZoneBad': 'Gunakan zona waktu IANA yang sah, seperti Africa/Kampala.',
    'account.formSignedOut': 'Anda sudah keluar. Masuk lagi, lalu simpan.',
    'account.formNotFound':
      'Profil Anda tidak ditemukan. Keluar lalu masuk kembali, kemudian coba lagi.',
    'account.signInHeading': 'Cara Anda masuk',
    'account.signInBoth': 'Anda dapat masuk dengan kata sandi atau dengan Google.',
    'account.signInPassword': 'Anda masuk dengan alamat email dan kata sandi.',
    'account.signInGoogle': 'Anda masuk dengan Google. Akun ini tidak memiliki kata sandi.',
    'account.signInPhone': 'Anda masuk dengan kode yang dikirim ke ponsel Anda.',
    'account.signInOther': 'Anda masuk dengan: {methods}.',
    'account.signInNone': 'Tidak ada cara masuk yang tercatat untuk akun ini.',
    'account.signInUnread': 'Cara masuk Anda tidak dapat dibaca saat ini.',
    'account.resetBody':
      'Kirim tautan aman untuk mengatur ulang kata sandi ke email masuk Anda. Tautan kedaluwarsa sesuai pengaturan penyedia autentikasi Anda.',
    'account.resetLink': 'Kirim tautan atur ulang',
    'account.noPasswordGoogle':
      'Akun ini tidak memiliki kata sandi, jadi tidak ada yang perlu diatur ulang — teruslah masuk dengan Google.',
    'account.noPasswordPhone':
      'Akun ini masuk dengan kode ponsel, jadi tidak ada kata sandi untuk diatur ulang.',
    'account.mergeHeading': 'Dua akun, satu orang',
    'account.mergeBody':
      'Jika Anda mendaftar dua kali, kedua akun dapat digabungkan. Akun yang Anda pertahankan tetap ada; yang lain ditutup, dan keduanya harus setuju sebelum ada yang dipindahkan.',
    'account.mergeWaiting': 'Seseorang meminta agar sebuah akun digabungkan ke akun ini.',
    'account.mergeNone': 'Tidak ada yang menunggu pada akun ini.',
    'account.mergeLink': 'Menggabungkan akun',
    'account.mergeLinkWaiting': 'Menggabungkan akun ({count} menunggu)',
    'account.sponsorHeading': 'Kursi bersponsor',
    'account.sponsorBody':
      'Sebuah kursus dapat dibayar oleh orang lain. Mintalah kursi jika kursus itu tidak terjangkau, atau bayarlah kursi yang sedang menunggu — kedua pihak tidak pernah tahu siapa pihak lainnya.',
    'account.sponsorMine': 'Yang saya minta dan yang saya sponsori',
    'account.sponsorWaiting': 'Kursi yang menunggu',
    'account.teachHeading': 'Mengajar di sini',
    'account.teachBody':
      'Mengajar dilakukan melalui penunjukan — tidak ada yang menjadi guru hanya dengan mendaftar. Jika Anda ingin mengajar, Anda dapat mengirim kualifikasi dan tautan ke pelajaran yang pernah Anda berikan, dan pemilik membacanya.',
    'account.teachLink': 'Melamar untuk mengajar',
    'account.inviteHeading': 'Undang teman',
    'account.inviteBody':
      'Teman yang baru di sini mendapat diskon untuk kursus pertamanya, dan Anda mendapat diskon untuk kursus berikutnya setelah pembayarannya melewati masa pengembalian dana. Keduanya diskon, bukan uang, jadi tidak ada yang dibayarkan.',
    'account.inviteLink': 'Kode undangan Anda',
    'account.shareHeading': 'Membagikan pembelajaran saya',
    'account.shareBody':
      'Kemajuan dan sertifikat Anda bersifat pribadi, termasuk bagi keluarga Anda. Undang seseorang lewat email dan ia menerimanya sendiri; Anda memilih apa yang ia lihat dan berapa lama, dan Anda dapat mengakhirinya kapan saja.',
    'account.shareLink': 'Siapa yang dapat melihat pembelajaran saya',
    'account.readHeading': 'Tampilan bacaan',
    'account.readBody':
      'Ukuran teks, kontras, dan gerakan — diterapkan begitu Anda memilih, untuk peramban ini. Tidak ada yang perlu disimpan di sini, dan tidak ada hal lain di halaman yang berubah.',
    'account.readLink': 'Preferensi membaca',
    'account.termsBody':
      'Ketentuan, pemberitahuan privasi, dan ketentuan untuk guru, masing-masing bernomor versi.',
    'account.termsAgreed':
      'Versi yang telah Anda setujui tercantum beserta waktu Anda menyetujuinya.',
    'account.termsNone': 'Tidak ada yang menunggu persetujuan Anda.',
    'account.termsLink': 'Baca semuanya',
    'account.instHeading': 'Lembaga saya',
    'account.instBody':
      'Madrasah, sekolah, atau organisasi tempat Anda bernaung. Jika alamat email Anda berada pada domain yang telah diverifikasi salah satunya, Anda dapat bergabung; setelah bergabung, lembaga itu hanya melihat jumlah orangnya dan tidak pernah nama Anda atau apa yang Anda pelajari.',
    'account.instLink': 'Tempat saya bernaung',
    'account.paidHeading': 'Yang telah saya bayar',
    'account.paidBody':
      'Setiap pembayaran yang terjadi pada akun penagihan Anda, dan setiap pengembalian dana yang kembali, dengan jumlah berjalan per mata uang. Pengembalian dana yang Anda minta dicantumkan terpisah sampai benar-benar terjadi, karena meminta belum berarti menerima.',
    'account.paidLink': 'Lihat yang telah saya bayar',
    'account.toldHeading': 'Yang diberitahukan kepada saya',
    'account.toldBody':
      'Pesan dari platform muncul di pusat notifikasi Anda, bukan di kotak masuk atau pesan teks — belum ada penyedia pengiriman yang dikonfigurasi.',
    'account.toldUnreadOne': 'Anda memiliki {count} pesan yang belum dibaca.',
    'account.toldUnreadOther': 'Anda memiliki {count} pesan yang belum dibaca.',
    'account.toldNone': 'Tidak ada yang menunggu Anda.',
    'account.toldChoice':
      'Anda memilih jenis mana yang Anda inginkan, kecuali pemberitahuan bahwa uang yang menjadi hak Anda tidak sampai: yang itu selalu datang.',
    'account.toldLinkUnread': 'Notifikasi ({count} belum dibaca)',
    'account.toldPrefs': 'Pilih apa yang diberitahukan kepada Anda',
    'account.dataHeading': 'Data saya',
    'account.dataBody':
      'Unduh semua yang kami simpan tentang akun ini dalam satu berkas: profil Anda, peserta didik yang menjadi tanggung jawab Anda, apa yang telah mereka pelajari dan selesaikan, sertifikat, pesanan dan tanda terima Anda, catatan Anda, dan dengan siapa Anda membagikan pembelajaran Anda.',
    'account.dataDownload': 'Unduh data saya',
    'account.dataSheet': 'Sebagai lembar kerja',
    'account.dataPrint': 'Baca atau cetak',
    'account.dataMore':
      'Kini isinya lebih banyak daripada sebelumnya: kiriman diskusi, ulasan dan tugas yang dinilai, kasus dukungan, pesan yang dikirim kepada Anda, dan — jika Anda mengajar — penghasilan dan pembayaran Anda.',
    'account.dataWhat': 'Apa isinya, dan apa yang tidak disertakan',
    'account.dataRestore':
      'Sudah punya berkasnya? Profil, catatan, dan penanda Anda dapat dikembalikan ke pelajaran yang Anda ikuti; pendaftaran, sertifikat, dan pesanan tidak dapat, dan halaman itu menjelaskan alasannya.',
    'account.dataRestoreLink': 'Kembalikan',
    'account.closeHeading': 'Menutup akun ini',
    'account.closeBody':
      'Menutup akun mengubah profil Anda, menghapus sebagian informasi pribadi, dan berusaha mengeluarkan Anda. Pesanan, pembayaran, pendaftaran, dan sertifikat disimpan, karena pengembalian dana atau pemeriksaan sertifikat masih memerlukannya, dan sebagian catatan lain juga tetap ada. Halaman itu mencantumkan kedua sisi sebelum apa pun terjadi.',
    'account.closeLink': 'Tutup akun ini',
  },
  ms: {
    'account.lede':
      'Urus cara akaun anda dipaparkan. Alamat log masuk anda ditunjukkan sebagai rujukan dan tidak diubah di sini.',
    'account.status': 'Status akaun: {status}',
    'account.statusActive': 'aktif',
    'account.statusSuspended': 'digantung',
    'account.statusClosed': 'ditutup',
    'account.owedHeading': 'Sebelum anda meneruskan',
    'account.owedOne': '{count} dokumen sedang menunggu persetujuan anda.',
    'account.owedOther': '{count} dokumen sedang menunggu persetujuan anda.',
    'account.owedBody':
      'Baca dan setuju, dan masa anda bersetuju disimpan pada akaun anda. Sementara itu, tiada perkara lain di halaman ini yang ditahan.',
    'account.owedVersion': '{title} — versi {number}',
    'account.selfHeading': 'Belajar atas nama sendiri',
    'account.selfLearnsAs':
      'Akaun ini belajar sebagai {name}. Kursus yang anda daftar atau beli menjadi milik pelajar itu, dan kemajuan orang lain tidak bercampur dengannya.',
    'account.selfInFamily':
      'Pembelajaran anda berada dalam akaun keluarga, jadi satu pelan keluarga boleh meliputi anda bersama anak-anaknya. Anda menguruskannya di halaman keluarga.',
    'account.selfOnOwn':
      'Pembelajaran anda berdiri sendiri. Jika anda mengurus akaun keluarga, anda boleh memindahkannya ke sisi anak-anak supaya satu pelan meliputi semua orang — profil yang sama, kemajuan yang sama.',
    'account.selfGo': 'Pergi ke pembelajaran saya',
    'account.selfJoinFamily': 'Belajar dalam keluarga saya',
    'account.selfWhoSees': 'Siapa yang boleh melihat kemajuan saya',
    'account.selfNone':
      'Anda belum mempunyai profil pelajar. Profil diperlukan sebelum anda boleh mendaftar kursus, membeli kursus, atau berkongsi kemajuan anda — kursus sentiasa untuk pelajar yang bernama, dan beginilah anda menjadi pelajar.',
    'account.selfFamilyInstead':
      'Jika anda mengurus akaun keluarga, anda boleh menjadi pelajar di sana sahaja, dan menjadi sebahagian daripada keluarga sejak awal.',
    'account.selfClaimNote':
      'Ini tidak mewujudkan akaun kedua. Ia menambah anda sebagai pelajar pada akaun ini.',
    'account.formName': 'Nama paparan',
    'account.formLanguage': 'Kod bahasa pilihan',
    'account.formLanguageNote':
      'Ini disimpan bersama profil anda, dan belum ada apa-apa yang menggunakannya. Bahasa halaman-halaman ini dipilih di halaman Bahasa dan disimpan pada pelayar ini.',
    'account.formZone': 'Zon waktu',
    'account.formSave': 'Simpan profil',
    'account.formSaved': 'Profil anda telah dikemas kini.',
    'account.formFailed': 'Profil anda tidak dapat disimpan. Cuba lagi.',
    'account.formNameMissing': 'Tambah nama yang anda mahu orang lihat.',
    'account.formNameLong': 'Pastikan nama paparan anda tidak melebihi {count} aksara.',
    'account.formLanguageBad': 'Gunakan kod bahasa seperti en atau en-GB.',
    'account.formZoneLong': 'Pastikan zon waktu tidak melebihi {count} aksara.',
    'account.formZoneBad': 'Gunakan zon waktu IANA yang sah, seperti Africa/Kampala.',
    'account.formSignedOut': 'Anda telah log keluar. Log masuk semula, kemudian simpan.',
    'account.formNotFound':
      'Profil anda tidak dijumpai. Log keluar dan log masuk semula, kemudian cuba lagi.',
    'account.signInHeading': 'Cara anda log masuk',
    'account.signInBoth': 'Anda boleh log masuk dengan kata laluan atau dengan Google.',
    'account.signInPassword': 'Anda log masuk dengan alamat e-mel dan kata laluan.',
    'account.signInGoogle': 'Anda log masuk dengan Google. Akaun ini tiada kata laluan.',
    'account.signInPhone': 'Anda log masuk dengan kod yang dihantar ke telefon anda.',
    'account.signInOther': 'Anda log masuk dengan: {methods}.',
    'account.signInNone': 'Tiada kaedah log masuk direkodkan untuk akaun ini.',
    'account.signInUnread': 'Kaedah log masuk anda tidak dapat dibaca sekarang.',
    'account.resetBody':
      'Hantar pautan selamat untuk menetapkan semula kata laluan ke e-mel log masuk anda. Pautan itu tamat tempoh mengikut tetapan penyedia pengesahan anda.',
    'account.resetLink': 'Hantar pautan tetapan semula',
    'account.noPasswordGoogle':
      'Akaun ini tiada kata laluan, jadi tiada apa-apa untuk ditetapkan semula — teruskan log masuk dengan Google.',
    'account.noPasswordPhone':
      'Akaun ini log masuk dengan kod telefon, jadi tiada kata laluan untuk ditetapkan semula.',
    'account.mergeHeading': 'Dua akaun, seorang',
    'account.mergeBody':
      'Jika anda mendaftar dua kali, akaun-akaun itu boleh digabungkan. Akaun yang anda simpan kekal; yang satu lagi ditutup, dan kedua-duanya perlu bersetuju sebelum apa-apa dipindahkan.',
    'account.mergeWaiting': 'Seseorang meminta supaya sebuah akaun digabungkan ke dalam akaun ini.',
    'account.mergeNone': 'Tiada apa-apa yang menunggu pada akaun ini.',
    'account.mergeLink': 'Menggabungkan akaun',
    'account.mergeLinkWaiting': 'Menggabungkan akaun ({count} menunggu)',
    'account.sponsorHeading': 'Tempat tajaan',
    'account.sponsorBody':
      'Sesebuah kursus boleh dibayar oleh orang lain. Mohon satu tempat jika kursus itu di luar kemampuan anda, atau bayar untuk tempat yang sedang menunggu — kedua-dua pihak tidak akan tahu siapa pihak yang satu lagi.',
    'account.sponsorMine': 'Apa yang saya mohon dan taja',
    'account.sponsorWaiting': 'Tempat yang menunggu',
    'account.teachHeading': 'Mengajar di sini',
    'account.teachBody':
      'Mengajar adalah melalui pelantikan — tiada sesiapa menjadi guru dengan hanya mendaftar. Jika anda ingin mengajar, anda boleh menghantar kelayakan anda dan pautan kepada pelajaran yang pernah anda berikan, dan pemilik akan membacanya.',
    'account.teachLink': 'Mohon untuk mengajar',
    'account.inviteHeading': 'Jemput rakan',
    'account.inviteBody':
      'Rakan yang baharu di sini mendapat diskaun untuk kursus pertamanya, dan anda mendapat diskaun untuk kursus seterusnya selepas bayarannya melepasi tempoh bayaran balik. Kedua-duanya diskaun, bukan wang, jadi tiada apa-apa yang dibayar keluar.',
    'account.inviteLink': 'Kod jemputan anda',
    'account.shareHeading': 'Berkongsi pembelajaran saya',
    'account.shareBody':
      'Kemajuan dan sijil anda adalah peribadi, termasuk daripada keluarga anda. Jemput seseorang melalui e-mel dan dia menerimanya sendiri; anda memilih apa yang dilihatnya dan berapa lama, dan anda boleh menamatkannya pada bila-bila masa.',
    'account.shareLink': 'Siapa yang boleh melihat pembelajaran saya',
    'account.readHeading': 'Cara paparan dibaca',
    'account.readBody':
      'Saiz teks, kontras dan gerakan — digunakan sebaik sahaja anda memilih, untuk pelayar ini. Tiada apa-apa di sini yang perlu disimpan, dan tiada perkara lain di halaman yang berubah.',
    'account.readLink': 'Pilihan bacaan',
    'account.termsBody': 'Terma, notis privasi dan terma untuk guru, setiap satu bernombor versi.',
    'account.termsAgreed':
      'Versi yang telah anda persetujui disenaraikan bersama masa anda bersetuju.',
    'account.termsNone': 'Tiada apa-apa yang menunggu persetujuan anda.',
    'account.termsLink': 'Baca semuanya',
    'account.instHeading': 'Institusi saya',
    'account.instBody':
      'Madrasah, sekolah atau organisasi yang anda sertai. Jika alamat e-mel anda berada pada domain yang telah disahkan oleh salah satu daripadanya, anda boleh menyertainya; setelah menyertai, institusi itu hanya melihat bilangan orangnya dan tidak sekali-kali nama anda atau apa yang anda pelajari.',
    'account.instLink': 'Tempat saya bernaung',
    'account.paidHeading': 'Apa yang telah saya bayar',
    'account.paidBody':
      'Setiap bayaran yang berlaku pada akaun pengebilan anda, dan setiap bayaran balik yang telah kembali, dengan jumlah semasa bagi setiap mata wang. Bayaran balik yang anda minta disenaraikan berasingan sehingga ia benar-benar berlaku, kerana meminta bukan menerima.',
    'account.paidLink': 'Lihat apa yang telah saya bayar',
    'account.toldHeading': 'Apa yang dimaklumkan kepada saya',
    'account.toldBody':
      'Mesej daripada platform muncul di pusat pemberitahuan anda, bukan dalam peti masuk atau mesej teks — belum ada penyedia penghantaran yang dikonfigurasikan.',
    'account.toldUnreadOne': 'Anda mempunyai {count} mesej yang belum dibaca.',
    'account.toldUnreadOther': 'Anda mempunyai {count} mesej yang belum dibaca.',
    'account.toldNone': 'Tiada apa-apa yang menunggu anda.',
    'account.toldChoice':
      'Anda memilih jenis yang anda mahu, kecuali notis bahawa wang yang terhutang kepada anda tidak sampai: yang itu sentiasa datang.',
    'account.toldLinkUnread': 'Pemberitahuan ({count} belum dibaca)',
    'account.toldPrefs': 'Pilih apa yang dimaklumkan kepada anda',
    'account.dataHeading': 'Data saya',
    'account.dataBody':
      'Muat turun semua yang kami simpan tentang akaun ini sebagai satu fail: profil anda, pelajar di bawah tanggungjawab anda, apa yang telah mereka pelajari dan selesaikan, sijil, pesanan dan resit anda, nota anda, dan dengan siapa anda berkongsi pembelajaran anda.',
    'account.dataDownload': 'Muat turun data saya',
    'account.dataSheet': 'Sebagai hamparan',
    'account.dataPrint': 'Baca atau cetak',
    'account.dataMore':
      'Kini kandungannya lebih banyak daripada dahulu: hantaran perbincangan, ulasan dan kerja yang telah ditanda, kes sokongan, mesej yang dihantar kepada anda, dan — jika anda mengajar — pendapatan dan bayaran anda.',
    'account.dataWhat': 'Apa yang ada di dalamnya, dan apa yang ditinggalkan',
    'account.dataRestore':
      'Sudah ada fail? Profil, nota dan penanda anda boleh dikembalikan ke pelajaran yang anda daftar; pendaftaran, sijil dan pesanan tidak boleh, dan halaman itu menerangkan sebabnya.',
    'account.dataRestoreLink': 'Kembalikan',
    'account.closeHeading': 'Menutup akaun ini',
    'account.closeBody':
      'Menutup akaun mengubah profil anda, membuang sesetengah maklumat peribadi dan cuba melog keluar anda. Pesanan, bayaran, pendaftaran dan sijil disimpan, kerana bayaran balik atau semakan sijil masih memerlukannya, dan sesetengah rekod lain juga kekal. Halaman itu menyenaraikan kedua-dua bahagian sebelum apa-apa berlaku.',
    'account.closeLink': 'Tutup akaun ini',
  },
  bn: {
    'account.lede':
      'আপনার অ্যাকাউন্ট কীভাবে দেখায় তা ঠিক করুন। আপনার সাইন-ইন ঠিকানা শুধু জানার জন্য দেখানো হয়েছে, এখানে তা বদলানো যায় না।',
    'account.status': 'অ্যাকাউন্টের অবস্থা: {status}',
    'account.statusActive': 'সক্রিয়',
    'account.statusSuspended': 'স্থগিত',
    'account.statusClosed': 'বন্ধ',
    'account.owedHeading': 'এগোনোর আগে',
    'account.owedOne': '{count}টি নথি আপনার সম্মতির অপেক্ষায় আছে।',
    'account.owedOther': '{count}টি নথি আপনার সম্মতির অপেক্ষায় আছে।',
    'account.owedBody':
      'পড়ুন ও সম্মতি দিন; সম্মতি দেওয়ার সময়টি আপনার অ্যাকাউন্টে রাখা হয়। এর মধ্যে এই পাতার আর কিছুই আটকে রাখা হয় না।',
    'account.owedVersion': '{title} — সংস্করণ {number}',
    'account.selfHeading': 'নিজের নামে শেখা',
    'account.selfLearnsAs':
      'এই অ্যাকাউন্ট {name} নামে শেখে। আপনি যেসব কোর্সে ভর্তি হন বা কেনেন সেগুলো ওই শিক্ষার্থীর, আর অন্য কারও অগ্রগতি তাতে মেশে না।',
    'account.selfInFamily':
      'আপনার শেখা একটি পারিবারিক অ্যাকাউন্টের ভেতরে আছে, তাই একটি পারিবারিক প্ল্যান সন্তানদের সঙ্গে আপনাকেও অন্তর্ভুক্ত করতে পারে। এটি আপনি পরিবারের পাতায় পরিচালনা করেন।',
    'account.selfOnOwn':
      'আপনার শেখা আলাদাভাবে আছে। আপনি পারিবারিক অ্যাকাউন্ট চালালে এটিকে সন্তানদের পাশে সরিয়ে নিতে পারেন, যাতে একটি প্ল্যানই সবাইকে অন্তর্ভুক্ত করে — একই প্রোফাইল, একই অগ্রগতি।',
    'account.selfGo': 'আমার শেখায় যান',
    'account.selfJoinFamily': 'আমার পরিবারের ভেতরে শিখুন',
    'account.selfWhoSees': 'কে আমার অগ্রগতি দেখতে পারে',
    'account.selfNone':
      'আপনার এখনো শিক্ষার্থী প্রোফাইল নেই। কোনো কোর্সে ভর্তি হতে, কোর্স কিনতে বা নিজের অগ্রগতি শেয়ার করতে আগে এটি লাগে — কোর্স সব সময় একজন নামধারী শিক্ষার্থীর জন্য, আর এভাবেই আপনি শিক্ষার্থী হন।',
    'account.selfFamilyInstead':
      'আপনি পারিবারিক অ্যাকাউন্ট চালালে তার বদলে সেখানেই শিক্ষার্থী হতে পারেন, এবং শুরু থেকেই পরিবারের অংশ হতে পারেন।',
    'account.selfClaimNote':
      'এতে দ্বিতীয় কোনো অ্যাকাউন্ট তৈরি হয় না। এটি আপনাকে এই অ্যাকাউন্টেই শিক্ষার্থী হিসেবে যোগ করে।',
    'account.formName': 'প্রদর্শিত নাম',
    'account.formLanguage': 'পছন্দের ভাষার কোড',
    'account.formLanguageNote':
      'এটি আপনার প্রোফাইলের সঙ্গে রাখা হয়, আর এখনো কিছুই এটি ব্যবহার করে না। এই পাতাগুলোর ভাষা ভাষার পাতায় বেছে নেওয়া হয় এবং এই ব্রাউজারে রাখা হয়।',
    'account.formZone': 'সময় অঞ্চল',
    'account.formSave': 'প্রোফাইল সংরক্ষণ করুন',
    'account.formSaved': 'আপনার প্রোফাইল হালনাগাদ হয়েছে।',
    'account.formFailed': 'আপনার প্রোফাইল সংরক্ষণ করা যায়নি। আবার চেষ্টা করুন।',
    'account.formNameMissing': 'যে নামটি অন্যদের দেখাতে চান তা লিখুন।',
    'account.formNameLong': 'প্রদর্শিত নাম {count} অক্ষর বা তার কম রাখুন।',
    'account.formLanguageBad': 'en বা en-GB-এর মতো একটি ভাষার কোড ব্যবহার করুন।',
    'account.formZoneLong': 'সময় অঞ্চল {count} অক্ষর বা তার কম রাখুন।',
    'account.formZoneBad': 'Africa/Kampala-এর মতো একটি বৈধ IANA সময় অঞ্চল ব্যবহার করুন।',
    'account.formSignedOut': 'আপনি সাইন আউট হয়ে গেছেন। আবার সাইন ইন করুন, তারপর সংরক্ষণ করুন।',
    'account.formNotFound':
      'আপনার প্রোফাইল পাওয়া যায়নি। সাইন আউট করে আবার সাইন ইন করুন, তারপর চেষ্টা করুন।',
    'account.signInHeading': 'আপনি কীভাবে সাইন ইন করেন',
    'account.signInBoth': 'আপনি পাসওয়ার্ড দিয়ে বা Google দিয়ে সাইন ইন করতে পারেন।',
    'account.signInPassword': 'আপনি আপনার ইমেইল ঠিকানা ও পাসওয়ার্ড দিয়ে সাইন ইন করেন।',
    'account.signInGoogle': 'আপনি Google দিয়ে সাইন ইন করেন। এই অ্যাকাউন্টে কোনো পাসওয়ার্ড নেই।',
    'account.signInPhone': 'আপনি আপনার ফোনে পাঠানো কোড দিয়ে সাইন ইন করেন।',
    'account.signInOther': 'আপনি এভাবে সাইন ইন করেন: {methods}।',
    'account.signInNone': 'এই অ্যাকাউন্টের জন্য কোনো সাইন-ইন পদ্ধতি নথিভুক্ত নেই।',
    'account.signInUnread': 'আপনার সাইন-ইন পদ্ধতিগুলো এই মুহূর্তে পড়া যায়নি।',
    'account.resetBody':
      'আপনার সাইন-ইন ইমেইলে পাসওয়ার্ড রিসেটের একটি নিরাপদ লিংক পাঠান। লিংকটির মেয়াদ আপনার প্রমাণীকরণ প্রদানকারীর সেটিংস অনুযায়ী শেষ হয়।',
    'account.resetLink': 'রিসেট লিংক পাঠান',
    'account.noPasswordGoogle':
      'এই অ্যাকাউন্টে কোনো পাসওয়ার্ড নেই, তাই রিসেট করার কিছু নেই — Google দিয়েই সাইন ইন করতে থাকুন।',
    'account.noPasswordPhone':
      'এই অ্যাকাউন্ট ফোন কোড দিয়ে সাইন ইন করে, তাই রিসেট করার মতো কোনো পাসওয়ার্ড নেই।',
    'account.mergeHeading': 'দুটি অ্যাকাউন্ট, একজন মানুষ',
    'account.mergeBody':
      'আপনি দুবার নিবন্ধন করে থাকলে অ্যাকাউন্ট দুটি একত্র করা যায়। যেটি আপনি রাখেন সেটি থাকে; অন্যটি বন্ধ হয়, আর কিছু সরানোর আগে দুটিকেই সম্মতি দিতে হয়।',
    'account.mergeWaiting': 'কেউ একটি অ্যাকাউন্ট এই অ্যাকাউন্টের সঙ্গে একত্র করতে চাইছেন।',
    'account.mergeNone': 'এই অ্যাকাউন্টে কিছুই অপেক্ষায় নেই।',
    'account.mergeLink': 'অ্যাকাউন্ট একত্র করা',
    'account.mergeLinkWaiting': 'অ্যাকাউন্ট একত্র করা (অপেক্ষায়: {count})',
    'account.sponsorHeading': 'পৃষ্ঠপোষকতার আসন',
    'account.sponsorBody':
      'কোনো কোর্সের খরচ অন্য কেউ দিতে পারেন। কোর্সটি নাগালের বাইরে হলে একটি আসন চান, অথবা অপেক্ষায় থাকা কোনো আসনের খরচ দিন — দুই পক্ষ কখনোই জানতে পারে না অপরজন কে।',
    'account.sponsorMine': 'আমি যা চেয়েছি ও যার পৃষ্ঠপোষকতা করেছি',
    'account.sponsorWaiting': 'অপেক্ষমাণ আসন',
    'account.teachHeading': 'এখানে পড়ানো',
    'account.teachBody':
      'পড়ানো হয় নিয়োগের মাধ্যমে — শুধু নিবন্ধন করে কেউ শিক্ষক হন না। আপনি পড়াতে চাইলে আপনার যোগ্যতা এবং আপনার দেওয়া কোনো পাঠের লিংক পাঠাতে পারেন, আর মালিক তা পড়েন।',
    'account.teachLink': 'পড়ানোর জন্য আবেদন করুন',
    'account.inviteHeading': 'বন্ধুকে আমন্ত্রণ জানান',
    'account.inviteBody':
      'এখানে নতুন কোনো বন্ধু তাঁর প্রথম কোর্সে ছাড় পান, আর তাঁর পেমেন্ট ফেরতের সময়সীমা পার হলে আপনি আপনার পরের কোর্সে ছাড় পান। দুটোই ছাড়, টাকা নয়, তাই পরিশোধ করার কিছু নেই।',
    'account.inviteLink': 'আপনার আমন্ত্রণ কোড',
    'account.shareHeading': 'আমার শেখা শেয়ার করা',
    'account.shareBody':
      'আপনার অগ্রগতি ও সনদ ব্যক্তিগত, আপনার পরিবারের কাছেও। কাউকে ইমেইলে আমন্ত্রণ জানান, তিনি নিজেই তা গ্রহণ করেন; তিনি কী দেখবেন ও কত দিন, তা আপনি ঠিক করেন, আর যখন খুশি তা শেষ করতে পারেন।',
    'account.shareLink': 'কে আমার শেখা দেখতে পারে',
    'account.readHeading': 'এটি কেমন দেখায়',
    'account.readBody':
      'লেখার আকার, কনট্রাস্ট ও গতি — বেছে নেওয়ার সঙ্গে সঙ্গে এই ব্রাউজারের জন্য প্রয়োগ হয়। এখানে কিছু সংরক্ষণ করতে হয় না, আর পাতার অন্য কিছু বদলায় না।',
    'account.readLink': 'পড়ার পছন্দ',
    'account.termsBody':
      'শর্তাবলি, গোপনীয়তা বিজ্ঞপ্তি এবং শিক্ষকদের শর্তাবলি, প্রতিটি সংস্করণ নম্বরসহ।',
    'account.termsAgreed':
      'যেসব সংস্করণে আপনি সম্মতি দিয়েছেন সেগুলো সম্মতির সময়সহ তালিকাভুক্ত আছে।',
    'account.termsNone': 'আপনার সম্মতির অপেক্ষায় কিছু নেই।',
    'account.termsLink': 'সেগুলো পড়ুন',
    'account.instHeading': 'আমার প্রতিষ্ঠান',
    'account.instBody':
      'আপনি যে মাদ্রাসা, স্কুল বা সংগঠনের সদস্য। আপনার ইমেইল ঠিকানা যদি এমন ডোমেইনে থাকে যা এদের কোনো একটি যাচাই করেছে, তবে আপনি তাতে যোগ দিতে পারেন; যোগ দেওয়ার পর প্রতিষ্ঠানটি শুধু তার সদস্যসংখ্যা দেখে, কখনোই আপনার নাম বা আপনি কী পড়েছেন তা নয়।',
    'account.instLink': 'আমি কোথায় যুক্ত',
    'account.paidHeading': 'আমি যা পরিশোধ করেছি',
    'account.paidBody':
      'আপনার বিলিং অ্যাকাউন্টে হওয়া প্রতিটি পেমেন্ট এবং ফিরে আসা প্রতিটি ফেরত, প্রতি মুদ্রায় চলতি মোটসহ। আপনি যে ফেরত চেয়েছেন তা সত্যিই সম্পন্ন না হওয়া পর্যন্ত আলাদাভাবে তালিকাভুক্ত থাকে, কারণ চাওয়া মানে পাওয়া নয়।',
    'account.paidLink': 'আমি যা পরিশোধ করেছি দেখুন',
    'account.toldHeading': 'আমাকে যা জানানো হয়',
    'account.toldBody':
      'প্ল্যাটফর্মের বার্তা আপনার বিজ্ঞপ্তি কেন্দ্রে দেখা যায়, কোনো ইনবক্সে বা টেক্সট বার্তায় নয় — এখনো কোনো পাঠানোর সেবাদাতা ঠিক করা হয়নি।',
    'account.toldUnreadOne': 'আপনার {count}টি বার্তা পড়া হয়নি।',
    'account.toldUnreadOther': 'আপনার {count}টি বার্তা পড়া হয়নি।',
    'account.toldNone': 'আপনার জন্য কিছু অপেক্ষায় নেই।',
    'account.toldChoice':
      'কোন ধরনগুলো চান তা আপনি বেছে নেন, তবে আপনার পাওনা টাকা পৌঁছায়নি এমন বিজ্ঞপ্তি বাদে: সেগুলো সব সময় আসে।',
    'account.toldLinkUnread': 'বিজ্ঞপ্তি ({count}টি অপঠিত)',
    'account.toldPrefs': 'আপনাকে কী জানানো হবে তা বেছে নিন',
    'account.dataHeading': 'আমার তথ্য',
    'account.dataBody':
      'এই অ্যাকাউন্ট সম্পর্কে আমাদের কাছে যা আছে সব একটি ফাইলে ডাউনলোড করুন: আপনার প্রোফাইল, যেসব শিক্ষার্থীর দায়িত্ব আপনার, তারা যা পড়েছে ও শেষ করেছে, আপনার সনদ, অর্ডার ও রসিদ, আপনার নোট, এবং যাদের সঙ্গে আপনি আপনার শেখা শেয়ার করেছেন।',
    'account.dataDownload': 'আমার তথ্য ডাউনলোড করুন',
    'account.dataSheet': 'স্প্রেডশিট হিসেবে',
    'account.dataPrint': 'পড়ুন বা প্রিন্ট করুন',
    'account.dataMore':
      'এখন এতে আগের চেয়ে বেশি আছে: আলোচনার পোস্ট, পর্যালোচনা ও মূল্যায়িত কাজ, সহায়তার কেস, আপনাকে পাঠানো বার্তা, এবং — আপনি পড়ালে — আপনার আয় ও পরিশোধ।',
    'account.dataWhat': 'এতে কী আছে, আর কী বাদ রাখা হয়েছে',
    'account.dataRestore':
      'আগে থেকেই ফাইল আছে? আপনার প্রোফাইল, নোট ও বুকমার্ক আপনি যেসব পাঠে ভর্তি আছেন সেখানে ফিরিয়ে রাখা যায়; ভর্তি, সনদ ও অর্ডার যায় না, আর ওই পাতায় কারণ বলা আছে।',
    'account.dataRestoreLink': 'ফিরিয়ে রাখুন',
    'account.closeHeading': 'এই অ্যাকাউন্ট বন্ধ করা',
    'account.closeBody':
      'বন্ধ করলে আপনার প্রোফাইল বদলায়, কিছু ব্যক্তিগত তথ্য সরে যায় এবং আপনাকে সাইন আউট করার চেষ্টা করা হয়। অর্ডার, পেমেন্ট, ভর্তি ও সনদ রাখা হয়, কারণ কোনো ফেরত বা সনদ যাচাইয়ে এখনো সেগুলো লাগে, আর কিছু অন্য রেকর্ডও থেকে যায়। কিছু ঘটার আগে পাতাটি দুই দিকই তালিকা করে দেখায়।',
    'account.closeLink': 'এই অ্যাকাউন্ট বন্ধ করুন',
  },
  hi: {
    'account.lede':
      'तय करें कि आपका खाता कैसा दिखे। आपका साइन-इन पता केवल जानकारी के लिए दिखाया गया है और यहाँ बदला नहीं जाता।',
    'account.status': 'खाते की स्थिति: {status}',
    'account.statusActive': 'सक्रिय',
    'account.statusSuspended': 'निलंबित',
    'account.statusClosed': 'बंद',
    'account.owedHeading': 'आगे बढ़ने से पहले',
    'account.owedOne': '{count} दस्तावेज़ आपकी सहमति की प्रतीक्षा में है।',
    'account.owedOther': '{count} दस्तावेज़ आपकी सहमति की प्रतीक्षा में हैं।',
    'account.owedBody':
      'पढ़ें और सहमति दें; सहमति का समय आपके खाते में रखा जाता है। इस बीच इस पृष्ठ की और कोई चीज़ नहीं रोकी जाती।',
    'account.owedVersion': '{title} — संस्करण {number}',
    'account.selfHeading': 'अपने नाम से सीखना',
    'account.selfLearnsAs':
      'यह खाता {name} के नाम से सीखता है। जिन कोर्सों में आप नामांकन करते या जिन्हें ख़रीदते हैं वे उसी शिक्षार्थी के हैं, और किसी और की प्रगति उसमें नहीं मिलती।',
    'account.selfInFamily':
      'आपकी पढ़ाई एक पारिवारिक खाते के भीतर है, इसलिए एक ही पारिवारिक प्लान बच्चों के साथ आपको भी शामिल कर सकता है। इसे आप परिवार वाले पृष्ठ पर सँभालते हैं।',
    'account.selfOnOwn':
      'आपकी पढ़ाई अलग है। अगर आप पारिवारिक खाता चलाते हैं, तो इसे बच्चों के साथ ले जा सकते हैं ताकि एक ही प्लान सबको शामिल करे — वही प्रोफ़ाइल, वही प्रगति।',
    'account.selfGo': 'मेरी पढ़ाई पर जाएँ',
    'account.selfJoinFamily': 'अपने परिवार के भीतर सीखें',
    'account.selfWhoSees': 'मेरी प्रगति कौन देख सकता है',
    'account.selfNone':
      'आपकी अभी शिक्षार्थी प्रोफ़ाइल नहीं है। किसी कोर्स में नामांकन करने, कोर्स ख़रीदने या अपनी प्रगति साझा करने से पहले यह ज़रूरी है — कोर्स हमेशा किसी नामित शिक्षार्थी के लिए होता है, और आप इसी तरह शिक्षार्थी बनते हैं।',
    'account.selfFamilyInstead':
      'अगर आप पारिवारिक खाता चलाते हैं, तो इसके बजाय वहीं शिक्षार्थी बन सकते हैं और शुरू से ही परिवार का हिस्सा हो सकते हैं।',
    'account.selfClaimNote':
      'इससे दूसरा खाता नहीं बनता। यह आपको इसी खाते में शिक्षार्थी के रूप में जोड़ता है।',
    'account.formName': 'प्रदर्शित नाम',
    'account.formLanguage': 'पसंदीदा भाषा का कोड',
    'account.formLanguageNote':
      'यह आपकी प्रोफ़ाइल के साथ रखा जाता है, और अभी कोई चीज़ इसका उपयोग नहीं करती। इन पृष्ठों की भाषा भाषा वाले पृष्ठ पर चुनी जाती है और इसी ब्राउज़र में रखी जाती है।',
    'account.formZone': 'समय क्षेत्र',
    'account.formSave': 'प्रोफ़ाइल सहेजें',
    'account.formSaved': 'आपकी प्रोफ़ाइल अपडेट हो गई है।',
    'account.formFailed': 'आपकी प्रोफ़ाइल सहेजी नहीं जा सकी। फिर कोशिश करें।',
    'account.formNameMissing': 'वह नाम लिखें जो आप चाहते हैं कि लोग देखें।',
    'account.formNameLong': 'प्रदर्शित नाम {count} अक्षरों या उससे कम का रखें।',
    'account.formLanguageBad': 'en या en-GB जैसा भाषा कोड इस्तेमाल करें।',
    'account.formZoneLong': 'समय क्षेत्र {count} अक्षरों या उससे कम का रखें।',
    'account.formZoneBad': 'Africa/Kampala जैसा कोई मान्य IANA समय क्षेत्र इस्तेमाल करें।',
    'account.formSignedOut': 'आप साइन आउट हो चुके हैं। फिर से साइन इन करें, फिर सहेजें।',
    'account.formNotFound':
      'आपकी प्रोफ़ाइल नहीं मिली। साइन आउट करके दोबारा साइन इन करें, फिर कोशिश करें।',
    'account.signInHeading': 'आप साइन इन कैसे करते हैं',
    'account.signInBoth': 'आप पासवर्ड से या Google से साइन इन कर सकते हैं।',
    'account.signInPassword': 'आप अपने ईमेल पते और पासवर्ड से साइन इन करते हैं।',
    'account.signInGoogle': 'आप Google से साइन इन करते हैं। इस खाते का कोई पासवर्ड नहीं है।',
    'account.signInPhone': 'आप अपने फ़ोन पर भेजे गए कोड से साइन इन करते हैं।',
    'account.signInOther': 'आप इससे साइन इन करते हैं: {methods}।',
    'account.signInNone': 'इस खाते के लिए साइन-इन का कोई तरीक़ा दर्ज नहीं है।',
    'account.signInUnread': 'आपके साइन-इन के तरीक़े अभी पढ़े नहीं जा सके।',
    'account.resetBody':
      'अपने साइन-इन ईमेल पर पासवर्ड रीसेट का सुरक्षित लिंक भेजें। लिंक की अवधि आपके प्रमाणीकरण प्रदाता की सेटिंग के अनुसार समाप्त होती है।',
    'account.resetLink': 'रीसेट लिंक भेजें',
    'account.noPasswordGoogle':
      'इस खाते का कोई पासवर्ड नहीं है, इसलिए रीसेट करने को कुछ नहीं — साइन इन के लिए Google का ही उपयोग करते रहें।',
    'account.noPasswordPhone':
      'यह खाता फ़ोन कोड से साइन इन करता है, इसलिए रीसेट करने को कोई पासवर्ड नहीं है।',
    'account.mergeHeading': 'दो खाते, एक व्यक्ति',
    'account.mergeBody':
      'अगर आपने दो बार साइन अप किया है, तो खातों को मिलाया जा सकता है। जो खाता आप रखते हैं वह बना रहता है; दूसरा बंद हो जाता है, और कुछ भी स्थानांतरित होने से पहले दोनों की सहमति ज़रूरी है।',
    'account.mergeWaiting': 'कोई इस खाते में एक खाता मिलाने का अनुरोध कर रहा है।',
    'account.mergeNone': 'इस खाते पर कुछ प्रतीक्षा में नहीं है।',
    'account.mergeLink': 'खाते मिलाना',
    'account.mergeLinkWaiting': 'खाते मिलाना (प्रतीक्षा में: {count})',
    'account.sponsorHeading': 'प्रायोजित सीटें',
    'account.sponsorBody':
      'किसी कोर्स का भुगतान कोई और कर सकता है। कोर्स आपकी पहुँच से बाहर हो तो एक सीट माँगें, या प्रतीक्षा कर रही किसी सीट का भुगतान करें — दोनों पक्ष कभी नहीं जानते कि दूसरा कौन है।',
    'account.sponsorMine': 'मैंने जो माँगा और जो प्रायोजित किया',
    'account.sponsorWaiting': 'प्रतीक्षारत सीटें',
    'account.teachHeading': 'यहाँ पढ़ाना',
    'account.teachBody':
      'पढ़ाना नियुक्ति से होता है — केवल साइन अप करने से कोई शिक्षक नहीं बनता। अगर आप पढ़ाना चाहते हैं, तो अपनी योग्यताएँ और अपने दिए किसी पाठ का लिंक भेज सकते हैं, और मालिक उसे पढ़ता है।',
    'account.teachLink': 'पढ़ाने के लिए आवेदन करें',
    'account.inviteHeading': 'किसी मित्र को आमंत्रित करें',
    'account.inviteBody':
      'यहाँ नए आए मित्र को अपने पहले कोर्स पर छूट मिलती है, और जब उसका भुगतान रिफ़ंड की अवधि पार कर ले तो आपको अपने अगले कोर्स पर छूट मिलती है। दोनों छूट हैं, पैसा नहीं, इसलिए चुकाने को कुछ नहीं है।',
    'account.inviteLink': 'आपका आमंत्रण कोड',
    'account.shareHeading': 'अपनी पढ़ाई साझा करना',
    'account.shareBody':
      'आपकी प्रगति और प्रमाणपत्र निजी हैं, आपके परिवार से भी। किसी को ईमेल से आमंत्रित करें और वह स्वयं उसे स्वीकार करता है; आप चुनते हैं कि वह क्या देखे और कब तक, और आप जब चाहें इसे समाप्त कर सकते हैं।',
    'account.shareLink': 'मेरी पढ़ाई कौन देख सकता है',
    'account.readHeading': 'यह कैसा दिखता है',
    'account.readBody':
      'पाठ का आकार, कंट्रास्ट और गति — चुनते ही इस ब्राउज़र के लिए लागू हो जाते हैं। यहाँ कुछ सहेजने की ज़रूरत नहीं, और पृष्ठ में और कुछ नहीं बदलता।',
    'account.readLink': 'पढ़ने की प्राथमिकताएँ',
    'account.termsBody':
      'शर्तें, गोपनीयता सूचना और शिक्षकों की शर्तें, हर एक संस्करण संख्या के साथ।',
    'account.termsAgreed': 'जिन संस्करणों पर आपने सहमति दी है वे सहमति के समय के साथ सूचीबद्ध हैं।',
    'account.termsNone': 'आपकी सहमति की प्रतीक्षा में कुछ नहीं है।',
    'account.termsLink': 'उन्हें पढ़ें',
    'account.instHeading': 'मेरी संस्था',
    'account.instBody':
      'कोई मदरसा, स्कूल या संगठन जिससे आप जुड़े हैं। अगर आपका ईमेल पता ऐसे डोमेन पर है जिसे इनमें से किसी ने सत्यापित किया है, तो आप उसमें शामिल हो सकते हैं; शामिल होने के बाद वह केवल अपने लोगों की गिनती देखती है, आपका नाम या आपने क्या पढ़ा, यह कभी नहीं।',
    'account.instLink': 'मेरा जुड़ाव कहाँ है',
    'account.paidHeading': 'मैंने क्या भुगतान किया',
    'account.paidBody':
      'आपके बिलिंग खाते पर हुआ हर भुगतान, और वापस आया हर रिफ़ंड, हर मुद्रा के चालू योग के साथ। जो रिफ़ंड आपने माँगा है वह वास्तव में होने तक अलग सूचीबद्ध रहता है, क्योंकि माँगना पाना नहीं है।',
    'account.paidLink': 'देखें मैंने क्या भुगतान किया',
    'account.toldHeading': 'मुझे क्या बताया जाता है',
    'account.toldBody':
      'प्लेटफ़ॉर्म के संदेश आपके सूचना केंद्र में दिखते हैं, किसी इनबॉक्स या टेक्स्ट संदेश में नहीं — अभी कोई भेजने वाला प्रदाता कॉन्फ़िगर नहीं है।',
    'account.toldUnreadOne': 'आपका {count} संदेश अपठित है।',
    'account.toldUnreadOther': 'आपके {count} संदेश अपठित हैं।',
    'account.toldNone': 'आपके लिए कुछ प्रतीक्षा में नहीं है।',
    'account.toldChoice':
      'आप चुनते हैं कि कौन-से प्रकार चाहिए, सिवाय उन सूचनाओं के कि आपका बकाया पैसा नहीं पहुँचा: वे हमेशा आती हैं।',
    'account.toldLinkUnread': 'सूचनाएँ ({count} अपठित)',
    'account.toldPrefs': 'चुनें कि आपको क्या बताया जाए',
    'account.dataHeading': 'मेरा डेटा',
    'account.dataBody':
      'इस खाते के बारे में हमारे पास जो कुछ है उसे एक फ़ाइल में डाउनलोड करें: आपकी प्रोफ़ाइल, वे शिक्षार्थी जिनके आप ज़िम्मेदार हैं, उन्होंने क्या पढ़ा और पूरा किया, आपके प्रमाणपत्र, ऑर्डर और रसीदें, आपके नोट्स, और वे लोग जिनसे आपने अपनी पढ़ाई साझा की है।',
    'account.dataDownload': 'मेरा डेटा डाउनलोड करें',
    'account.dataSheet': 'स्प्रेडशीट के रूप में',
    'account.dataPrint': 'पढ़ें या प्रिंट करें',
    'account.dataMore':
      'अब इसमें पहले से अधिक है: चर्चा की पोस्ट, समीक्षाएँ और जाँचा गया काम, सहायता के मामले, आपको भेजे गए संदेश, और — अगर आप पढ़ाते हैं — आपकी कमाई और भुगतान।',
    'account.dataWhat': 'इसमें क्या है, और क्या छोड़ा गया है',
    'account.dataRestore':
      'पहले से फ़ाइल है? आपकी प्रोफ़ाइल, नोट्स और बुकमार्क उन पाठों पर वापस रखे जा सकते हैं जिनमें आपका नामांकन है; नामांकन, प्रमाणपत्र और ऑर्डर नहीं रखे जा सकते, और वह पृष्ठ कारण बताता है।',
    'account.dataRestoreLink': 'वापस रखें',
    'account.closeHeading': 'यह खाता बंद करना',
    'account.closeBody':
      'बंद करने से आपकी प्रोफ़ाइल बदल जाती है, कुछ निजी जानकारी हट जाती है और आपको साइन आउट करने की कोशिश की जाती है। ऑर्डर, भुगतान, नामांकन और प्रमाणपत्र रखे जाते हैं, क्योंकि किसी रिफ़ंड या प्रमाणपत्र की जाँच को अब भी उनकी ज़रूरत है, और कुछ दूसरे रिकॉर्ड भी बचे रहते हैं। कुछ भी होने से पहले पृष्ठ दोनों पक्ष सूचीबद्ध करता है।',
    'account.closeLink': 'यह खाता बंद करें',
  },
  fr: {
    'account.lede':
      'Gérez la façon dont votre compte apparaît. Votre adresse de connexion est indiquée pour information et ne se modifie pas ici.',
    'account.status': 'État du compte : {status}',
    'account.statusActive': 'actif',
    'account.statusSuspended': 'suspendu',
    'account.statusClosed': 'fermé',
    'account.owedHeading': 'Avant de continuer',
    'account.owedOne': '{count} document attend votre accord.',
    'account.owedOther': '{count} documents attendent votre accord.',
    'account.owedBody':
      'Lisez et acceptez ; la date de votre accord est conservée avec votre compte. En attendant, rien d’autre sur cette page ne vous est retiré.',
    'account.owedVersion': '{title} — version {number}',
    'account.selfHeading': 'Apprendre en votre nom',
    'account.selfLearnsAs':
      'Ce compte apprend sous le nom de {name}. Les cours auxquels vous vous inscrivez ou que vous achetez appartiennent à cet apprenant, et la progression de personne d’autre ne s’y mêle.',
    'account.selfInFamily':
      'Votre apprentissage se trouve dans un compte familial, si bien qu’une seule formule familiale peut vous couvrir avec ses enfants. Vous gérez cela sur la page de la famille.',
    'account.selfOnOwn':
      'Votre apprentissage est à part. Si vous gérez un compte familial, vous pouvez le placer auprès des enfants pour qu’une seule formule couvre tout le monde — même profil, même progression.',
    'account.selfGo': 'Aller à mon apprentissage',
    'account.selfJoinFamily': 'Apprendre au sein de ma famille',
    'account.selfWhoSees': 'Qui peut voir ma progression',
    'account.selfNone':
      'Vous n’avez pas encore de profil d’apprenant. Il en faut un avant de vous inscrire à un cours, d’en acheter un ou de partager votre progression — un cours est toujours destiné à un apprenant nommé, et c’est ainsi que vous en devenez un.',
    'account.selfFamilyInstead':
      'Si vous gérez un compte familial, vous pouvez plutôt y devenir apprenant et faire partie de la famille dès le départ.',
    'account.selfClaimNote':
      'Cela ne crée pas de second compte. Cela vous ajoute comme apprenant à celui-ci.',
    'account.formName': 'Nom affiché',
    'account.formLanguage': 'Code de la langue préférée',
    'account.formLanguageNote':
      'Ce code est conservé avec votre profil, et rien ne l’utilise encore. La langue de ces pages se choisit sur la page Langue et reste dans ce navigateur.',
    'account.formZone': 'Fuseau horaire',
    'account.formSave': 'Enregistrer le profil',
    'account.formSaved': 'Votre profil a été mis à jour.',
    'account.formFailed': 'Votre profil n’a pas pu être enregistré. Réessayez.',
    'account.formNameMissing': 'Ajoutez le nom que vous voulez montrer aux autres.',
    'account.formNameLong': 'Votre nom affiché ne doit pas dépasser {count} caractères.',
    'account.formLanguageBad': 'Utilisez un code de langue tel que en ou en-GB.',
    'account.formZoneLong': 'Le fuseau horaire ne doit pas dépasser {count} caractères.',
    'account.formZoneBad': 'Utilisez un fuseau horaire IANA valide, par exemple Africa/Kampala.',
    'account.formSignedOut': 'Votre session est fermée. Reconnectez-vous, puis enregistrez.',
    'account.formNotFound':
      'Votre profil est introuvable. Déconnectez-vous, reconnectez-vous, puis réessayez.',
    'account.signInHeading': 'Comment vous vous connectez',
    'account.signInBoth': 'Vous pouvez vous connecter avec un mot de passe ou avec Google.',
    'account.signInPassword': 'Vous vous connectez avec votre adresse e-mail et un mot de passe.',
    'account.signInGoogle': 'Vous vous connectez avec Google. Ce compte n’a pas de mot de passe.',
    'account.signInPhone': 'Vous vous connectez avec un code envoyé sur votre téléphone.',
    'account.signInOther': 'Vous vous connectez avec : {methods}.',
    'account.signInNone': 'Aucun moyen de connexion n’est enregistré pour ce compte.',
    'account.signInUnread': 'Vos moyens de connexion n’ont pas pu être lus pour l’instant.',
    'account.resetBody':
      'Envoyez un lien sécurisé de réinitialisation du mot de passe à votre e-mail de connexion. Le lien expire selon les réglages de votre fournisseur d’authentification.',
    'account.resetLink': 'Envoyer le lien de réinitialisation',
    'account.noPasswordGoogle':
      'Ce compte n’a pas de mot de passe, il n’y a donc rien à réinitialiser — continuez à vous connecter avec Google.',
    'account.noPasswordPhone':
      'Ce compte se connecte avec un code reçu par téléphone, il n’y a donc pas de mot de passe à réinitialiser.',
    'account.mergeHeading': 'Deux comptes, une seule personne',
    'account.mergeBody':
      'Si vous vous êtes inscrit deux fois, les comptes peuvent être réunis. Celui que vous gardez subsiste ; l’autre est fermé, et les deux doivent donner leur accord avant que quoi que ce soit ne bouge.',
    'account.mergeWaiting': 'Quelqu’un demande à fusionner un compte avec celui-ci.',
    'account.mergeNone': 'Rien n’est en attente sur ce compte.',
    'account.mergeLink': 'Fusion de comptes',
    'account.mergeLinkWaiting': 'Fusion de comptes (en attente : {count})',
    'account.sponsorHeading': 'Places parrainées',
    'account.sponsorBody':
      'Un cours peut être payé par quelqu’un d’autre. Demandez une place s’il est hors de portée, ou payez une place en attente — aucune des deux parties n’apprend jamais qui est l’autre.',
    'account.sponsorMine': 'Ce que j’ai demandé et parrainé',
    'account.sponsorWaiting': 'Places en attente',
    'account.teachHeading': 'Enseigner ici',
    'account.teachBody':
      'On enseigne ici sur nomination — personne ne devient enseignant en s’inscrivant. Si vous souhaitez enseigner, vous pouvez envoyer vos qualifications et un lien vers une leçon que vous avez donnée, et le propriétaire les lit.',
    'account.teachLink': 'Postuler pour enseigner',
    'account.inviteHeading': 'Inviter un ami',
    'account.inviteBody':
      'Un ami qui découvre le site obtient une réduction sur son premier cours, et vous en obtenez une sur votre prochain cours une fois que son paiement a dépassé le délai de remboursement. Ce sont des réductions, pas de l’argent : il n’y a donc rien à verser.',
    'account.inviteLink': 'Votre code d’invitation',
    'account.shareHeading': 'Partager mon apprentissage',
    'account.shareBody':
      'Votre progression et vos certificats sont privés, y compris pour votre famille. Invitez quelqu’un par e-mail et cette personne accepte elle-même ; vous choisissez ce qu’elle voit et pour combien de temps, et vous pouvez y mettre fin quand vous voulez.',
    'account.shareLink': 'Qui peut voir mon apprentissage',
    'account.readHeading': 'Confort de lecture',
    'account.readBody':
      'Taille du texte, contraste et mouvement — appliqués dès que vous en choisissez un, pour ce navigateur. Rien ici n’a besoin d’être enregistré, et rien d’autre ne change sur la page.',
    'account.readLink': 'Préférences de lecture',
    'account.termsBody':
      'Les conditions, l’avis de confidentialité et les conditions pour les enseignants, chacun avec son numéro de version.',
    'account.termsAgreed':
      'Les versions que vous avez acceptées sont listées avec la date de votre accord.',
    'account.termsNone': 'Rien n’attend votre accord.',
    'account.termsLink': 'Les lire',
    'account.instHeading': 'Mon établissement',
    'account.instBody':
      'Une madrasa, une école ou une organisation à laquelle vous appartenez. Si votre adresse e-mail relève d’un domaine que l’une d’elles a vérifié, vous pouvez la rejoindre ; une fois membre, elle ne voit que des effectifs, jamais votre nom ni ce que vous avez étudié.',
    'account.instLink': 'Mes appartenances',
    'account.paidHeading': 'Ce que j’ai payé',
    'account.paidBody':
      'Chaque paiement passé sur votre compte de facturation et chaque remboursement revenu, avec un total cumulé par devise. Un remboursement que vous avez demandé est listé à part jusqu’à ce qu’il soit réellement effectué, car demander n’est pas recevoir.',
    'account.paidLink': 'Voir ce que j’ai payé',
    'account.toldHeading': 'Ce dont on m’informe',
    'account.toldBody':
      'Les messages de la plateforme apparaissent dans votre centre de notifications, pas dans une boîte de réception ni par SMS — aucun service d’envoi n’est encore configuré.',
    'account.toldUnreadOne': 'Vous avez {count} message non lu.',
    'account.toldUnreadOther': 'Vous avez {count} messages non lus.',
    'account.toldNone': 'Rien ne vous attend.',
    'account.toldChoice':
      'Vous choisissez les types que vous voulez, sauf les avis indiquant qu’une somme qui vous est due n’est pas arrivée : ceux-là arrivent toujours.',
    'account.toldLinkUnread': 'Notifications (non lues : {count})',
    'account.toldPrefs': 'Choisir ce dont on vous informe',
    'account.dataHeading': 'Mes données',
    'account.dataBody':
      'Téléchargez en un seul fichier tout ce que nous conservons sur ce compte : votre profil, les apprenants dont vous êtes responsable, ce qu’ils ont étudié et terminé, vos certificats, commandes et reçus, vos notes, et les personnes avec qui vous avez partagé votre apprentissage.',
    'account.dataDownload': 'Télécharger mes données',
    'account.dataSheet': 'Sous forme de tableur',
    'account.dataPrint': 'Les lire ou les imprimer',
    'account.dataMore':
      'Le fichier contient désormais davantage : les messages de discussion, les évaluations et les travaux corrigés, les demandes d’assistance, les messages qui vous ont été envoyés et — si vous enseignez — vos revenus et vos versements.',
    'account.dataWhat': 'Ce qu’il contient et ce qui en est exclu',
    'account.dataRestore':
      'Vous avez déjà un fichier ? Votre profil, vos notes et vos signets peuvent être remis sur les leçons auxquelles vous êtes inscrit ; les inscriptions, les certificats et les commandes ne le peuvent pas, et cette page explique pourquoi.',
    'account.dataRestoreLink': 'Le remettre',
    'account.closeHeading': 'Fermer ce compte',
    'account.closeBody':
      'La fermeture modifie votre profil, supprime certaines informations personnelles et tente de vous déconnecter. Les commandes, paiements, inscriptions et certificats sont conservés, car un remboursement ou la vérification d’un certificat en a encore besoin, et d’autres enregistrements subsistent aussi. La page présente les deux côtés avant que quoi que ce soit ne se produise.',
    'account.closeLink': 'Fermer ce compte',
  },
  es: {
    'account.lede':
      'Gestione cómo aparece su cuenta. Su dirección de inicio de sesión se muestra como referencia y no se cambia aquí.',
    'account.status': 'Estado de la cuenta: {status}',
    'account.statusActive': 'activa',
    'account.statusSuspended': 'suspendida',
    'account.statusClosed': 'cerrada',
    'account.owedHeading': 'Antes de continuar',
    'account.owedOne': '{count} documento espera su conformidad.',
    'account.owedOther': '{count} documentos esperan su conformidad.',
    'account.owedBody':
      'Léalos y acéptelos; la fecha en que lo hizo queda guardada en su cuenta. Mientras tanto, no se le retiene nada más en esta página.',
    'account.owedVersion': '{title} — versión {number}',
    'account.selfHeading': 'Aprender en su propio nombre',
    'account.selfLearnsAs':
      'Esta cuenta aprende como {name}. Los cursos en los que se inscribe o que compra pertenecen a ese alumno, y el progreso de nadie más se mezcla con el suyo.',
    'account.selfInFamily':
      'Su aprendizaje está dentro de una cuenta familiar, de modo que un solo plan familiar puede cubrirle junto con los niños. Eso se gestiona en la página de la familia.',
    'account.selfOnOwn':
      'Su aprendizaje va por separado. Si administra una cuenta familiar, puede trasladarlo junto a los niños para que un solo plan cubra a todos: el mismo perfil, el mismo progreso.',
    'account.selfGo': 'Ir a mi aprendizaje',
    'account.selfJoinFamily': 'Aprender dentro de mi familia',
    'account.selfWhoSees': 'Quién puede ver mi progreso',
    'account.selfNone':
      'Todavía no tiene un perfil de alumno. Hace falta uno antes de inscribirse en un curso, comprar uno o compartir su progreso: un curso es siempre para un alumno con nombre, y así es como usted pasa a serlo.',
    'account.selfFamilyInstead':
      'Si administra una cuenta familiar, puede hacerse alumno allí en su lugar y formar parte de la familia desde el principio.',
    'account.selfClaimNote': 'Esto no crea una segunda cuenta. Le añade como alumno a esta.',
    'account.formName': 'Nombre visible',
    'account.formLanguage': 'Código del idioma preferido',
    'account.formLanguageNote':
      'Se guarda con su perfil y todavía nada lo utiliza. El idioma de estas páginas se elige en la página Idioma y se conserva en este navegador.',
    'account.formZone': 'Zona horaria',
    'account.formSave': 'Guardar perfil',
    'account.formSaved': 'Su perfil se ha actualizado.',
    'account.formFailed': 'No se pudo guardar su perfil. Inténtelo de nuevo.',
    'account.formNameMissing': 'Añada el nombre que quiere que vean los demás.',
    'account.formNameLong': 'Su nombre visible no debe superar los {count} caracteres.',
    'account.formLanguageBad': 'Use un código de idioma como en o en-GB.',
    'account.formZoneLong': 'La zona horaria no debe superar los {count} caracteres.',
    'account.formZoneBad': 'Use una zona horaria IANA válida, como Africa/Kampala.',
    'account.formSignedOut': 'Se ha cerrado su sesión. Vuelva a iniciar sesión y luego guarde.',
    'account.formNotFound':
      'No se encontró su perfil. Cierre sesión, vuelva a iniciarla e inténtelo de nuevo.',
    'account.signInHeading': 'Cómo inicia sesión',
    'account.signInBoth': 'Puede iniciar sesión con una contraseña o con Google.',
    'account.signInPassword': 'Inicia sesión con su dirección de correo y una contraseña.',
    'account.signInGoogle': 'Inicia sesión con Google. Esta cuenta no tiene contraseña.',
    'account.signInPhone': 'Inicia sesión con un código enviado a su teléfono.',
    'account.signInOther': 'Inicia sesión con: {methods}.',
    'account.signInNone': 'No hay ningún método de inicio de sesión registrado para esta cuenta.',
    'account.signInUnread': 'Ahora mismo no se pudieron leer sus métodos de inicio de sesión.',
    'account.resetBody':
      'Envíe un enlace seguro para restablecer la contraseña a su correo de inicio de sesión. El enlace caduca según la configuración de su proveedor de autenticación.',
    'account.resetLink': 'Enviar enlace de restablecimiento',
    'account.noPasswordGoogle':
      'Esta cuenta no tiene contraseña, así que no hay nada que restablecer: siga iniciando sesión con Google.',
    'account.noPasswordPhone':
      'Esta cuenta inicia sesión con un código de teléfono, así que no hay contraseña que restablecer.',
    'account.mergeHeading': 'Dos cuentas, una persona',
    'account.mergeBody':
      'Si se registró dos veces, las cuentas pueden unirse. La que conserve sobrevive; la otra se cierra, y ambas deben aceptar antes de que se mueva nada.',
    'account.mergeWaiting': 'Alguien solicita fusionar una cuenta con esta.',
    'account.mergeNone': 'No hay nada pendiente en esta cuenta.',
    'account.mergeLink': 'Fusión de cuentas',
    'account.mergeLinkWaiting': 'Fusión de cuentas (pendientes: {count})',
    'account.sponsorHeading': 'Plazas patrocinadas',
    'account.sponsorBody':
      'Un curso puede pagarlo otra persona. Solicite una plaza si el curso está fuera de su alcance, o pague una plaza que está esperando: ninguna de las dos partes llega a saber quién es la otra.',
    'account.sponsorMine': 'Lo que he solicitado y patrocinado',
    'account.sponsorWaiting': 'Plazas en espera',
    'account.teachHeading': 'Enseñar aquí',
    'account.teachBody':
      'Aquí se enseña por nombramiento: nadie se convierte en docente por registrarse. Si desea enseñar, puede enviar sus titulaciones y un enlace a una lección que haya impartido, y el propietario lo lee.',
    'account.teachLink': 'Solicitar enseñar',
    'account.inviteHeading': 'Invitar a un amigo',
    'account.inviteBody':
      'Un amigo que es nuevo aquí obtiene un descuento en su primer curso, y usted obtiene uno en el siguiente cuando el pago de su amigo haya superado el plazo de reembolso. Ambos son descuentos, no dinero, así que no hay nada que abonar.',
    'account.inviteLink': 'Su código de invitación',
    'account.shareHeading': 'Compartir mi aprendizaje',
    'account.shareBody':
      'Su progreso y sus certificados son privados, también para su familia. Invite a alguien por correo y esa persona lo acepta por sí misma; usted elige qué ve y durante cuánto tiempo, y puede ponerle fin cuando quiera.',
    'account.shareLink': 'Quién puede ver mi aprendizaje',
    'account.readHeading': 'Cómo se lee esto',
    'account.readBody':
      'Tamaño del texto, contraste y movimiento: se aplican en cuanto elige uno, para este navegador. Aquí no hay nada que guardar, y nada más cambia en la página.',
    'account.readLink': 'Preferencias de lectura',
    'account.termsBody':
      'Los términos, el aviso de privacidad y los términos para docentes, cada uno con su número de versión.',
    'account.termsAgreed': 'Las versiones que ha aceptado aparecen con la fecha en que las aceptó.',
    'account.termsNone': 'No hay nada que espere su conformidad.',
    'account.termsLink': 'Leerlos',
    'account.instHeading': 'Mi institución',
    'account.instBody':
      'Una madrasa, escuela u organización a la que pertenece. Si su dirección de correo está en un dominio que alguna de ellas ha verificado, puede unirse; una vez dentro, la institución ve recuentos de sus miembros y nunca su nombre ni lo que usted estudió.',
    'account.instLink': 'A dónde pertenezco',
    'account.paidHeading': 'Lo que he pagado',
    'account.paidBody':
      'Cada pago realizado en su cuenta de facturación y cada reembolso devuelto, con un total acumulado por moneda. Un reembolso que haya solicitado aparece por separado hasta que se haga efectivo, porque pedir no es recibir.',
    'account.paidLink': 'Ver lo que he pagado',
    'account.toldHeading': 'Lo que se me comunica',
    'account.toldBody':
      'Los mensajes de la plataforma aparecen en su centro de notificaciones, no en una bandeja de entrada ni en un mensaje de texto: todavía no hay configurado ningún proveedor de envío.',
    'account.toldUnreadOne': 'Tiene {count} mensaje sin leer.',
    'account.toldUnreadOther': 'Tiene {count} mensajes sin leer.',
    'account.toldNone': 'No hay nada esperándole.',
    'account.toldChoice':
      'Usted elige qué tipos quiere, salvo los avisos de que un dinero que se le debe no llegó: esos llegan siempre.',
    'account.toldLinkUnread': 'Notificaciones ({count} sin leer)',
    'account.toldPrefs': 'Elegir qué se le comunica',
    'account.dataHeading': 'Mis datos',
    'account.dataBody':
      'Descargue en un solo archivo todo lo que conservamos sobre esta cuenta: su perfil, los alumnos de los que es responsable, lo que han estudiado y terminado, sus certificados, pedidos y recibos, sus notas y las personas con quienes ha compartido su aprendizaje.',
    'account.dataDownload': 'Descargar mis datos',
    'account.dataSheet': 'Como hoja de cálculo',
    'account.dataPrint': 'Leerlos o imprimirlos',
    'account.dataMore':
      'Ahora incluye más que antes: las publicaciones del debate, las reseñas y los trabajos corregidos, los casos de asistencia, los mensajes que se le enviaron y, si enseña, sus ingresos y pagos.',
    'account.dataWhat': 'Qué contiene y qué se deja fuera',
    'account.dataRestore':
      '¿Ya tiene un archivo? Su perfil, sus notas y sus marcadores pueden volver a ponerse en las lecciones en las que está inscrito; las inscripciones, los certificados y los pedidos no, y esa página explica por qué.',
    'account.dataRestoreLink': 'Volver a ponerlo',
    'account.closeHeading': 'Cerrar esta cuenta',
    'account.closeBody':
      'Cerrar la cuenta modifica su perfil, elimina parte de la información personal e intenta cerrar su sesión. Los pedidos, pagos, inscripciones y certificados se conservan, porque un reembolso o la comprobación de un certificado todavía los necesita, y también quedan algunos otros registros. La página enumera ambas partes antes de que ocurra nada.',
    'account.closeLink': 'Cerrar esta cuenta',
  },
  pt: {
    'account.lede':
      'Gira a forma como a sua conta aparece. O seu endereço de início de sessão é mostrado para referência e não se altera aqui.',
    'account.status': 'Estado da conta: {status}',
    'account.statusActive': 'ativa',
    'account.statusSuspended': 'suspensa',
    'account.statusClosed': 'encerrada',
    'account.owedHeading': 'Antes de continuar',
    'account.owedOne': '{count} documento aguarda a sua concordância.',
    'account.owedOther': '{count} documentos aguardam a sua concordância.',
    'account.owedBody':
      'Leia e concorde; a data em que o fez fica guardada na sua conta. Entretanto, nada mais nesta página lhe é retido.',
    'account.owedVersion': '{title} — versão {number}',
    'account.selfHeading': 'Aprender em nome próprio',
    'account.selfLearnsAs':
      'Esta conta aprende como {name}. Os cursos em que se inscreve ou que compra pertencem a esse aluno, e o progresso de mais ninguém se mistura com ele.',
    'account.selfInFamily':
      'A sua aprendizagem está dentro de uma conta familiar, pelo que um único plano familiar pode abrangê-lo juntamente com as crianças. Isso gere-se na página da família.',
    'account.selfOnOwn':
      'A sua aprendizagem está à parte. Se gere uma conta familiar, pode passá-la para junto das crianças para que um único plano abranja todos — o mesmo perfil, o mesmo progresso.',
    'account.selfGo': 'Ir para a minha aprendizagem',
    'account.selfJoinFamily': 'Aprender dentro da minha família',
    'account.selfWhoSees': 'Quem pode ver o meu progresso',
    'account.selfNone':
      'Ainda não tem um perfil de aluno. É preciso um antes de se inscrever num curso, comprar um ou partilhar o seu progresso — um curso é sempre para um aluno com nome, e é assim que passa a sê-lo.',
    'account.selfFamilyInstead':
      'Se gere uma conta familiar, pode antes tornar-se aluno lá e fazer parte da família desde o início.',
    'account.selfClaimNote': 'Isto não cria uma segunda conta. Acrescenta-o como aluno a esta.',
    'account.formName': 'Nome a apresentar',
    'account.formLanguage': 'Código do idioma preferido',
    'account.formLanguageNote':
      'Fica guardado com o seu perfil e ainda nada o utiliza. O idioma destas páginas escolhe-se na página Idioma e fica guardado neste navegador.',
    'account.formZone': 'Fuso horário',
    'account.formSave': 'Guardar perfil',
    'account.formSaved': 'O seu perfil foi atualizado.',
    'account.formFailed': 'Não foi possível guardar o seu perfil. Tente novamente.',
    'account.formNameMissing': 'Acrescente o nome que quer que as pessoas vejam.',
    'account.formNameLong': 'O nome a apresentar não deve ter mais de {count} caracteres.',
    'account.formLanguageBad': 'Use um código de idioma como en ou en-GB.',
    'account.formZoneLong': 'O fuso horário não deve ter mais de {count} caracteres.',
    'account.formZoneBad': 'Use um fuso horário IANA válido, como Africa/Kampala.',
    'account.formSignedOut': 'A sua sessão terminou. Inicie sessão novamente e depois guarde.',
    'account.formNotFound':
      'Não foi possível encontrar o seu perfil. Termine a sessão, volte a iniciá-la e tente novamente.',
    'account.signInHeading': 'Como inicia sessão',
    'account.signInBoth': 'Pode iniciar sessão com uma palavra-passe ou com o Google.',
    'account.signInPassword': 'Inicia sessão com o seu endereço de e-mail e uma palavra-passe.',
    'account.signInGoogle': 'Inicia sessão com o Google. Esta conta não tem palavra-passe.',
    'account.signInPhone': 'Inicia sessão com um código enviado para o seu telemóvel.',
    'account.signInOther': 'Inicia sessão com: {methods}.',
    'account.signInNone': 'Não há nenhum método de início de sessão registado para esta conta.',
    'account.signInUnread': 'Não foi possível ler agora os seus métodos de início de sessão.',
    'account.resetBody':
      'Envie uma ligação segura de reposição da palavra-passe para o seu e-mail de início de sessão. A ligação expira de acordo com as definições do seu fornecedor de autenticação.',
    'account.resetLink': 'Enviar ligação de reposição',
    'account.noPasswordGoogle':
      'Esta conta não tem palavra-passe, por isso não há nada para repor — continue a iniciar sessão com o Google.',
    'account.noPasswordPhone':
      'Esta conta inicia sessão com um código de telemóvel, por isso não há palavra-passe para repor.',
    'account.mergeHeading': 'Duas contas, uma pessoa',
    'account.mergeBody':
      'Se se registou duas vezes, as contas podem ser reunidas. A que mantiver continua; a outra é encerrada, e ambas têm de concordar antes de qualquer coisa ser movida.',
    'account.mergeWaiting': 'Alguém está a pedir para fundir uma conta com esta.',
    'account.mergeNone': 'Não há nada pendente nesta conta.',
    'account.mergeLink': 'Fusão de contas',
    'account.mergeLinkWaiting': 'Fusão de contas (pendentes: {count})',
    'account.sponsorHeading': 'Lugares patrocinados',
    'account.sponsorBody':
      'Um curso pode ser pago por outra pessoa. Peça um lugar se o curso estiver fora do seu alcance, ou pague um lugar que está à espera — nenhuma das partes chega a saber quem é a outra.',
    'account.sponsorMine': 'O que pedi e o que patrocinei',
    'account.sponsorWaiting': 'Lugares à espera',
    'account.teachHeading': 'Ensinar aqui',
    'account.teachBody':
      'Ensina-se aqui por nomeação — ninguém se torna professor por se registar. Se quiser ensinar, pode enviar as suas qualificações e uma ligação para uma aula que tenha dado, e o proprietário lê.',
    'account.teachLink': 'Candidatar-se a ensinar',
    'account.inviteHeading': 'Convidar um amigo',
    'account.inviteBody':
      'Um amigo que seja novo aqui recebe um desconto no primeiro curso, e recebe um no seu próximo curso depois de o pagamento dele ter ultrapassado o prazo de reembolso. Ambos são descontos, não dinheiro, por isso não há nada a pagar.',
    'account.inviteLink': 'O seu código de convite',
    'account.shareHeading': 'Partilhar a minha aprendizagem',
    'account.shareBody':
      'O seu progresso e os seus certificados são privados, incluindo para a sua família. Convide alguém por e-mail e essa pessoa aceita por si própria; escolhe o que ela vê e durante quanto tempo, e pode terminar quando quiser.',
    'account.shareLink': 'Quem pode ver a minha aprendizagem',
    'account.readHeading': 'Como isto se lê',
    'account.readBody':
      'Tamanho do texto, contraste e movimento — aplicados no momento em que escolhe, para este navegador. Aqui nada precisa de ser guardado, e nada mais muda na página.',
    'account.readLink': 'Preferências de leitura',
    'account.termsBody':
      'Os termos, o aviso de privacidade e os termos para professores, cada um com número de versão.',
    'account.termsAgreed':
      'As versões com que concordou estão listadas com a data em que concordou.',
    'account.termsNone': 'Nada aguarda a sua concordância.',
    'account.termsLink': 'Lê-los',
    'account.instHeading': 'A minha instituição',
    'account.instBody':
      'Uma madraça, escola ou organização a que pertence. Se o seu endereço de e-mail estiver num domínio que uma delas verificou, pode aderir; depois de aderir, a instituição vê contagens das suas pessoas e nunca o seu nome nem o que estudou.',
    'account.instLink': 'Onde pertenço',
    'account.paidHeading': 'O que paguei',
    'account.paidBody':
      'Cada pagamento efetuado na sua conta de faturação e cada reembolso devolvido, com um total acumulado por moeda. Um reembolso que tenha pedido aparece em separado até ser realmente efetuado, porque pedir não é receber.',
    'account.paidLink': 'Ver o que paguei',
    'account.toldHeading': 'O que me é comunicado',
    'account.toldBody':
      'As mensagens da plataforma aparecem no seu centro de notificações, não numa caixa de entrada nem numa mensagem de texto — ainda não está configurado nenhum fornecedor de envio.',
    'account.toldUnreadOne': 'Tem {count} mensagem por ler.',
    'account.toldUnreadOther': 'Tem {count} mensagens por ler.',
    'account.toldNone': 'Nada está à sua espera.',
    'account.toldChoice':
      'Escolhe os tipos que quer, exceto os avisos de que dinheiro que lhe é devido não chegou: esses chegam sempre.',
    'account.toldLinkUnread': 'Notificações ({count} por ler)',
    'account.toldPrefs': 'Escolher o que lhe é comunicado',
    'account.dataHeading': 'Os meus dados',
    'account.dataBody':
      'Descarregue num único ficheiro tudo o que guardamos sobre esta conta: o seu perfil, os alunos por quem é responsável, o que estudaram e concluíram, os seus certificados, encomendas e recibos, as suas notas e as pessoas com quem partilhou a sua aprendizagem.',
    'account.dataDownload': 'Descarregar os meus dados',
    'account.dataSheet': 'Como folha de cálculo',
    'account.dataPrint': 'Ler ou imprimir',
    'account.dataMore':
      'Agora inclui mais do que antes: as publicações de discussão, as avaliações e os trabalhos corrigidos, os pedidos de apoio, as mensagens que lhe foram enviadas e — se ensina — os seus rendimentos e pagamentos.',
    'account.dataWhat': 'O que contém e o que fica de fora',
    'account.dataRestore':
      'Já tem um ficheiro? O seu perfil, as suas notas e os seus marcadores podem ser repostos nas aulas em que está inscrito; as inscrições, os certificados e as encomendas não podem, e essa página explica porquê.',
    'account.dataRestoreLink': 'Repô-lo',
    'account.closeHeading': 'Encerrar esta conta',
    'account.closeBody':
      'Encerrar a conta altera o seu perfil, remove algumas informações pessoais e tenta terminar a sua sessão. As encomendas, os pagamentos, as inscrições e os certificados são mantidos, porque um reembolso ou a verificação de um certificado ainda precisa deles, e alguns outros registos também permanecem. A página enumera os dois lados antes de acontecer seja o que for.',
    'account.closeLink': 'Encerrar esta conta',
  },
  sw: {
    'account.lede':
      'Simamia jinsi akaunti yako inavyoonekana. Anwani yako ya kuingia inaonyeshwa kwa marejeleo tu na haibadilishwi hapa.',
    'account.status': 'Hali ya akaunti: {status}',
    'account.statusActive': 'inatumika',
    'account.statusSuspended': 'imesimamishwa',
    'account.statusClosed': 'imefungwa',
    'account.owedHeading': 'Kabla ya kuendelea',
    'account.owedOne': 'Hati {count} inasubiri kukubaliwa nawe.',
    'account.owedOther': 'Hati {count} zinasubiri kukubaliwa nawe.',
    'account.owedBody':
      'Soma kisha ukubali, na wakati uliokubali huhifadhiwa kwenye akaunti yako. Wakati huo, hakuna kitu kingine kwenye ukurasa huu kinachozuiwa.',
    'account.owedVersion': '{title} — toleo {number}',
    'account.selfHeading': 'Kujifunza kwa jina lako',
    'account.selfLearnsAs':
      'Akaunti hii inajifunza kama {name}. Kozi unazojisajili au kununua ni za mwanafunzi huyo, na maendeleo ya mtu mwingine hayachanganywi nayo.',
    'account.selfInFamily':
      'Masomo yako yako ndani ya akaunti ya familia, kwa hiyo mpango mmoja wa familia unaweza kukujumuisha pamoja na watoto wake. Unasimamia hilo kwenye ukurasa wa familia.',
    'account.selfOnOwn':
      'Masomo yako yako peke yake. Ukiendesha akaunti ya familia, unaweza kuyahamishia kando ya watoto ili mpango mmoja umjumuishe kila mtu — wasifu uleule, maendeleo yaleyale.',
    'account.selfGo': 'Nenda kwenye masomo yangu',
    'account.selfJoinFamily': 'Jifunze ndani ya familia yangu',
    'account.selfWhoSees': 'Nani anaweza kuona maendeleo yangu',
    'account.selfNone':
      'Bado huna wasifu wa mwanafunzi. Unahitajika kabla ya kujisajili kwenye kozi, kununua kozi, au kushiriki maendeleo yako — kozi huwa ya mwanafunzi mwenye jina kila mara, na hivi ndivyo unavyokuwa mwanafunzi.',
    'account.selfFamilyInstead':
      'Ukiendesha akaunti ya familia, unaweza kuwa mwanafunzi huko badala yake, na kuwa sehemu ya familia tangu mwanzo.',
    'account.selfClaimNote':
      'Hii haitengenezi akaunti ya pili. Inakuongeza kama mwanafunzi kwenye akaunti hii.',
    'account.formName': 'Jina la kuonyeshwa',
    'account.formLanguage': 'Msimbo wa lugha unayopendelea',
    'account.formLanguageNote':
      'Hii huhifadhiwa pamoja na wasifu wako, na bado hakuna kinachoitumia. Lugha ya kurasa hizi huchaguliwa kwenye ukurasa wa Lugha na huhifadhiwa kwenye kivinjari hiki.',
    'account.formZone': 'Saa za eneo',
    'account.formSave': 'Hifadhi wasifu',
    'account.formSaved': 'Wasifu wako umesasishwa.',
    'account.formFailed': 'Wasifu wako haukuweza kuhifadhiwa. Jaribu tena.',
    'account.formNameMissing': 'Ongeza jina unalotaka watu walione.',
    'account.formNameLong': 'Jina la kuonyeshwa lisizidi herufi {count}.',
    'account.formLanguageBad': 'Tumia msimbo wa lugha kama en au en-GB.',
    'account.formZoneLong': 'Saa za eneo zisizidi herufi {count}.',
    'account.formZoneBad': 'Tumia saa za eneo halali za IANA, kama Africa/Kampala.',
    'account.formSignedOut': 'Umetoka kwenye akaunti. Ingia tena, kisha uhifadhi.',
    'account.formNotFound':
      'Wasifu wako haukupatikana. Toka kisha uingie tena, halafu ujaribu tena.',
    'account.signInHeading': 'Jinsi unavyoingia',
    'account.signInBoth': 'Unaweza kuingia kwa nenosiri au kwa Google.',
    'account.signInPassword': 'Unaingia kwa anwani yako ya barua pepe na nenosiri.',
    'account.signInGoogle': 'Unaingia kwa Google. Akaunti hii haina nenosiri.',
    'account.signInPhone': 'Unaingia kwa msimbo unaotumwa kwenye simu yako.',
    'account.signInOther': 'Unaingia kwa: {methods}.',
    'account.signInNone': 'Hakuna njia ya kuingia iliyorekodiwa kwa akaunti hii.',
    'account.signInUnread': 'Njia zako za kuingia hazikuweza kusomwa sasa hivi.',
    'account.resetBody':
      'Tuma kiungo salama cha kuweka upya nenosiri kwenye barua pepe yako ya kuingia. Kiungo huisha muda kulingana na mipangilio ya mtoa huduma wako wa uthibitishaji.',
    'account.resetLink': 'Tuma kiungo cha kuweka upya',
    'account.noPasswordGoogle':
      'Akaunti hii haina nenosiri, kwa hiyo hakuna cha kuweka upya — endelea kutumia Google kuingia.',
    'account.noPasswordPhone':
      'Akaunti hii huingia kwa msimbo wa simu, kwa hiyo hakuna nenosiri la kuweka upya.',
    'account.mergeHeading': 'Akaunti mbili, mtu mmoja',
    'account.mergeBody':
      'Ikiwa ulijisajili mara mbili, akaunti zinaweza kuunganishwa. Ile unayoibakiza inabaki; nyingine inafungwa, na zote mbili lazima zikubali kabla ya chochote kuhamishwa.',
    'account.mergeWaiting': 'Mtu anaomba kuunganisha akaunti na hii.',
    'account.mergeNone': 'Hakuna kinachosubiri kwenye akaunti hii.',
    'account.mergeLink': 'Kuunganisha akaunti',
    'account.mergeLinkWaiting': 'Kuunganisha akaunti (zinazosubiri: {count})',
    'account.sponsorHeading': 'Nafasi zilizofadhiliwa',
    'account.sponsorBody':
      'Kozi inaweza kulipiwa na mtu mwingine. Omba nafasi ikiwa kozi iko nje ya uwezo wako, au lipia nafasi inayosubiri — pande hizo mbili hazijui kamwe upande mwingine ni nani.',
    'account.sponsorMine': 'Nilichoomba na nilichofadhili',
    'account.sponsorWaiting': 'Nafasi zinazosubiri',
    'account.teachHeading': 'Kufundisha hapa',
    'account.teachBody':
      'Kufundisha ni kwa kuteuliwa — hakuna anayekuwa mwalimu kwa kujisajili tu. Ukitaka kufundisha, unaweza kutuma sifa zako na kiungo cha somo ulilowahi kutoa, na mmiliki hukisoma.',
    'account.teachLink': 'Omba kufundisha',
    'account.inviteHeading': 'Mwalike rafiki',
    'account.inviteBody':
      'Rafiki ambaye ni mgeni hapa hupata punguzo kwenye kozi yake ya kwanza, nawe hupata punguzo kwenye kozi yako inayofuata baada ya malipo yake kupita muda wa kurejeshewa pesa. Zote mbili ni punguzo, si pesa, kwa hiyo hakuna cha kulipwa.',
    'account.inviteLink': 'Msimbo wako wa mwaliko',
    'account.shareHeading': 'Kushiriki masomo yangu',
    'account.shareBody':
      'Maendeleo na vyeti vyako ni vya faragha, hata kwa familia yako. Mwalike mtu kwa barua pepe naye hukubali mwenyewe; wewe unachagua anachokiona na kwa muda gani, na unaweza kusitisha wakati wowote upendao.',
    'account.shareLink': 'Nani anaweza kuona masomo yangu',
    'account.readHeading': 'Jinsi ukurasa unavyosomeka',
    'account.readBody':
      'Ukubwa wa maandishi, utofautishaji wa rangi na mwendo — hutumika mara tu unapochagua, kwa kivinjari hiki. Hakuna kinachohitaji kuhifadhiwa hapa, na hakuna kingine kinachobadilika kwenye ukurasa.',
    'account.readLink': 'Mapendeleo ya usomaji',
    'account.termsBody':
      'Masharti, taarifa ya faragha na masharti ya walimu, kila moja ikiwa na namba ya toleo.',
    'account.termsAgreed': 'Matoleo uliyoyakubali yameorodheshwa pamoja na wakati uliokubali.',
    'account.termsNone': 'Hakuna kinachosubiri kukubaliwa nawe.',
    'account.termsLink': 'Yasome',
    'account.instHeading': 'Taasisi yangu',
    'account.instBody':
      'Madrasa, shule au shirika ambalo wewe ni mwanachama wake. Ikiwa anwani yako ya barua pepe iko kwenye kikoa ambacho mojawapo imekithibitisha, unaweza kujiunga; ukishajiunga, taasisi huona idadi ya watu wake tu, na kamwe haioni jina lako wala ulichosoma.',
    'account.instLink': 'Ninakohusika',
    'account.paidHeading': 'Nilicholipa',
    'account.paidBody':
      'Kila malipo yaliyofanyika kwenye akaunti yako ya malipo, na kila pesa iliyorejeshwa, pamoja na jumla inayoendelea kwa kila sarafu. Marejesho uliyoyaomba huorodheshwa kando hadi yatakapofanyika kweli, kwa sababu kuomba si kupokea.',
    'account.paidLink': 'Tazama nilicholipa',
    'account.toldHeading': 'Ninachoarifiwa',
    'account.toldBody':
      'Ujumbe kutoka kwenye jukwaa huonekana kwenye kituo chako cha arifa, si kwenye kikasha cha barua pepe wala ujumbe mfupi — bado hakuna mtoa huduma wa kutuma aliyewekwa.',
    'account.toldUnreadOne': 'Una ujumbe {count} ambao haujasomwa.',
    'account.toldUnreadOther': 'Una jumbe {count} ambazo hazijasomwa.',
    'account.toldNone': 'Hakuna kinachokusubiri.',
    'account.toldChoice':
      'Wewe unachagua aina unazotaka, isipokuwa arifa kwamba pesa unazodaiwa kulipwa hazikufika: hizo huja kila mara.',
    'account.toldLinkUnread': 'Arifa ({count} hazijasomwa)',
    'account.toldPrefs': 'Chagua unachoarifiwa',
    'account.dataHeading': 'Data yangu',
    'account.dataBody':
      'Pakua kila kitu tunachohifadhi kuhusu akaunti hii kama faili moja: wasifu wako, wanafunzi unaowajibika kwao, walichosoma na kumaliza, vyeti vyako, maagizo na risiti, madokezo yako, na watu ulioshiriki nao masomo yako.',
    'account.dataDownload': 'Pakua data yangu',
    'account.dataSheet': 'Kama jedwali',
    'account.dataPrint': 'Isome au ichapishe',
    'account.dataMore':
      'Sasa inabeba zaidi ya awali: machapisho ya majadiliano, mapitio na kazi zilizosahihishwa, kesi za usaidizi, ujumbe uliotumiwa, na — ikiwa unafundisha — mapato na malipo yako.',
    'account.dataWhat': 'Kilichomo ndani yake, na kilichoachwa nje',
    'account.dataRestore':
      'Tayari una faili? Wasifu wako, madokezo na alamisho vinaweza kurudishwa kwenye masomo uliyojisajili; usajili, vyeti na maagizo haviwezi, na ukurasa huo unaeleza sababu.',
    'account.dataRestoreLink': 'Irudishe',
    'account.closeHeading': 'Kufunga akaunti hii',
    'account.closeBody':
      'Kufunga hubadilisha wasifu wako, huondoa baadhi ya taarifa binafsi na hujaribu kukutoa. Maagizo, malipo, usajili na vyeti huhifadhiwa, kwa sababu urejeshaji wa pesa au ukaguzi wa cheti bado unavihitaji, na kumbukumbu nyingine pia hubaki. Ukurasa huorodhesha pande zote mbili kabla ya chochote kutokea.',
    'account.closeLink': 'Funga akaunti hii',
  },
  af: {
    'account.lede':
      'Bestuur hoe jou rekening vertoon word. Jou aantekenadres word ter verwysing gewys en word nie hier verander nie.',
    'account.status': 'Rekeningstatus: {status}',
    'account.statusActive': 'aktief',
    'account.statusSuspended': 'opgeskort',
    'account.statusClosed': 'gesluit',
    'account.owedHeading': 'Voordat jy voortgaan',
    'account.owedOne': '{count} dokument wag op jou instemming.',
    'account.owedOther': '{count} dokumente wag op jou instemming.',
    'account.owedBody':
      'Lees en stem in, en die tyd waarop jy dit gedoen het, word by jou rekening gehou. Intussen word niks anders op hierdie bladsy teruggehou nie.',
    'account.owedVersion': '{title} — weergawe {number}',
    'account.selfHeading': 'Leer as jouself',
    'account.selfLearnsAs':
      'Hierdie rekening leer as {name}. Kursusse waarvoor jy inskryf of wat jy koop, behoort aan daardie leerder, en niemand anders se vordering word daarmee vermeng nie.',
    'account.selfInFamily':
      'Jou leer is binne ’n familierekening, so een familieplan kan jou saam met die kinders dek. Jy bestuur dit op die familiebladsy.',
    'account.selfOnOwn':
      'Jou leer staan op sy eie. As jy ’n familierekening bestuur, kan jy dit langs die kinders inskuif sodat een plan almal dek — dieselfde profiel, dieselfde vordering.',
    'account.selfGo': 'Gaan na my leer',
    'account.selfJoinFamily': 'Leer binne my familie',
    'account.selfWhoSees': 'Wie my vordering kan sien',
    'account.selfNone':
      'Jy het nog nie ’n leerderprofiel nie. Een is nodig voordat jy vir ’n kursus kan inskryf, een kan koop of jou vordering kan deel — ’n kursus is altyd vir ’n leerder met ’n naam, en so word jy een.',
    'account.selfFamilyInstead':
      'As jy ’n familierekening bestuur, kan jy eerder daar ’n leerder word en van die begin af deel van die familie wees.',
    'account.selfClaimNote':
      'Dit skep nie ’n tweede rekening nie. Dit voeg jou as leerder by hierdie een.',
    'account.formName': 'Vertoonnaam',
    'account.formLanguage': 'Voorkeurtaalkode',
    'account.formLanguageNote':
      'Dit word by jou profiel gehou, en niks gebruik dit nog nie. Die taal van hierdie bladsye word op die Taal-bladsy gekies en word in hierdie blaaier gehou.',
    'account.formZone': 'Tydsone',
    'account.formSave': 'Stoor profiel',
    'account.formSaved': 'Jou profiel is bygewerk.',
    'account.formFailed': 'Jou profiel kon nie gestoor word nie. Probeer weer.',
    'account.formNameMissing': 'Voeg die naam by wat jy wil hê mense moet sien.',
    'account.formNameLong': 'Hou jou vertoonnaam by {count} karakters of minder.',
    'account.formLanguageBad': 'Gebruik ’n taalkode soos en of en-GB.',
    'account.formZoneLong': 'Hou die tydsone by {count} karakters of minder.',
    'account.formZoneBad': 'Gebruik ’n geldige IANA-tydsone, soos Africa/Kampala.',
    'account.formSignedOut': 'Jy is afgeteken. Teken weer aan en stoor dan.',
    'account.formNotFound':
      'Jou profiel kon nie gevind word nie. Teken af en weer aan, en probeer dan weer.',
    'account.signInHeading': 'Hoe jy aanteken',
    'account.signInBoth': 'Jy kan met ’n wagwoord of met Google aanteken.',
    'account.signInPassword': 'Jy teken aan met jou e-posadres en ’n wagwoord.',
    'account.signInGoogle':
      'Jy teken aan met Google. Daar is geen wagwoord op hierdie rekening nie.',
    'account.signInPhone': 'Jy teken aan met ’n kode wat na jou foon gestuur word.',
    'account.signInOther': 'Jy teken aan met: {methods}.',
    'account.signInNone': 'Geen aantekenmetode is vir hierdie rekening aangeteken nie.',
    'account.signInUnread': 'Jou aantekenmetodes kon nie nou gelees word nie.',
    'account.resetBody':
      'Stuur ’n veilige skakel om jou wagwoord terug te stel na jou aanteken-e-pos. Die skakel verval volgens die instellings van jou verifikasieverskaffer.',
    'account.resetLink': 'Stuur terugstelskakel',
    'account.noPasswordGoogle':
      'Daar is geen wagwoord op hierdie rekening nie, so daar is niks om terug te stel nie — hou aan om met Google aan te teken.',
    'account.noPasswordPhone':
      'Hierdie rekening teken aan met ’n foonkode, so daar is geen wagwoord om terug te stel nie.',
    'account.mergeHeading': 'Twee rekeninge, een persoon',
    'account.mergeBody':
      'As jy twee keer geregistreer het, kan die rekeninge saamgevoeg word. Die een wat jy hou, bly bestaan; die ander word gesluit, en albei moet instem voordat enigiets skuif.',
    'account.mergeWaiting': 'Iemand vra om ’n rekening by hierdie een saam te voeg.',
    'account.mergeNone': 'Niks wag op hierdie rekening nie.',
    'account.mergeLink': 'Samevoeging van rekeninge',
    'account.mergeLinkWaiting': 'Samevoeging van rekeninge (wagtend: {count})',
    'account.sponsorHeading': 'Geborgde plekke',
    'account.sponsorBody':
      '’n Kursus kan deur iemand anders betaal word. Vra een aan as dit buite jou bereik is, of betaal vir ’n plek wat wag — die twee kante kom nooit agter wie die ander is nie.',
    'account.sponsorMine': 'Wat ek aangevra en geborg het',
    'account.sponsorWaiting': 'Plekke wat wag',
    'account.teachHeading': 'Onderrig hier',
    'account.teachBody':
      'Onderrig is deur aanstelling — niemand word ’n onderwyser deur te registreer nie. As jy wil onderrig gee, kan jy jou kwalifikasies en ’n skakel na ’n les wat jy gegee het, stuur, en die eienaar lees dit.',
    'account.teachLink': 'Doen aansoek om te onderrig',
    'account.inviteHeading': 'Nooi ’n vriend',
    'account.inviteBody':
      '’n Vriend wat nuut hier is, kry afslag op sy of haar eerste kursus, en jy kry afslag op jou volgende een sodra daardie betaling verby die terugbetalingstydperk is. Albei is afslag, nie geld nie, so daar is niks om uit te betaal nie.',
    'account.inviteLink': 'Jou uitnodigingskode',
    'account.shareHeading': 'Deel my leer',
    'account.shareBody':
      'Jou vordering en sertifikate is privaat, ook vir jou familie. Nooi iemand per e-pos en hulle aanvaar dit self; jy kies wat hulle sien en hoe lank dit duur, en jy kan dit beëindig wanneer jy wil.',
    'account.shareLink': 'Wie my leer kan sien',
    'account.readHeading': 'Hoe dit lees',
    'account.readBody':
      'Teksgrootte, kontras en beweging — toegepas die oomblik wat jy een kies, vir hierdie blaaier. Niks hier hoef gestoor te word nie, en niks anders aan die bladsy verander nie.',
    'account.readLink': 'Leesvoorkeure',
    'account.termsBody':
      'Die bepalings, die privaatheidskennisgewing en die bepalings vir onderwysers, elk met ’n weergawenommer.',
    'account.termsAgreed':
      'Die weergawes waartoe jy ingestem het, word gelys saam met die tyd waarop jy ingestem het.',
    'account.termsNone': 'Niks wag op jou instemming nie.',
    'account.termsLink': 'Lees hulle',
    'account.instHeading': 'My instelling',
    'account.instBody':
      '’n Madrasa, skool of organisasie waaraan jy behoort. As jou e-posadres by ’n domein is wat een van hulle geverifieer het, kan jy aansluit; sodra jy in is, sien dit tellings van sy mense en nooit jou naam of wat jy bestudeer het nie.',
    'account.instLink': 'Waar ek behoort',
    'account.paidHeading': 'Wat ek betaal het',
    'account.paidBody':
      'Elke betaling wat op jou faktuurrekening plaasgevind het, en elke terugbetaling wat teruggekom het, met ’n lopende totaal per geldeenheid. ’n Terugbetaling wat jy aangevra het, word afsonderlik gelys totdat dit werklik plaasvind, want vra is nie ontvang nie.',
    'account.paidLink': 'Sien wat ek betaal het',
    'account.toldHeading': 'Wat ek vertel word',
    'account.toldBody':
      'Boodskappe van die platform verskyn in jou kennisgewingsentrum, nie in ’n inkassie of ’n teksboodskap nie — geen afleweringsverskaffer is nog opgestel nie.',
    'account.toldUnreadOne': 'Jy het {count} ongeleesde boodskap.',
    'account.toldUnreadOther': 'Jy het {count} ongeleesde boodskappe.',
    'account.toldNone': 'Niks wag vir jou nie.',
    'account.toldChoice':
      'Jy kies watter soorte jy wil hê, behalwe kennisgewings dat geld wat aan jou verskuldig is, nie aangekom het nie: daardie kom altyd.',
    'account.toldLinkUnread': 'Kennisgewings ({count} ongelees)',
    'account.toldPrefs': 'Kies wat jy vertel word',
    'account.dataHeading': 'My data',
    'account.dataBody':
      'Laai alles wat ons oor hierdie rekening hou as een lêer af: jou profiel, die leerders vir wie jy verantwoordelik is, wat hulle bestudeer en voltooi het, jou sertifikate, bestellings en kwitansies, jou notas, en met wie jy jou leer gedeel het.',
    'account.dataDownload': 'Laai my data af',
    'account.dataSheet': 'As ’n sigblad',
    'account.dataPrint': 'Lees of druk dit',
    'account.dataMore':
      'Dit bevat nou meer as voorheen: die besprekingsplasings, resensies en nagesiende werk, die ondersteuningsake, die boodskappe wat aan jou gestuur is, en — as jy onderrig gee — jou verdienste en uitbetalings.',
    'account.dataWhat': 'Wat daarin is, en wat uitgelaat is',
    'account.dataRestore':
      'Het jy reeds ’n lêer? Jou profiel, notas en boekmerke kan teruggesit word op die lesse waarvoor jy ingeskryf is; inskrywings, sertifikate en bestellings kan nie, en daardie bladsy sê hoekom.',
    'account.dataRestoreLink': 'Sit dit terug',
    'account.closeHeading': 'Sluit hierdie rekening',
    'account.closeBody':
      'Sluiting verander jou profiel, verwyder sommige persoonlike inligting en probeer jou afmeld. Bestellings, betalings, inskrywings en sertifikate word gehou, want ’n terugbetaling of die nagaan van ’n sertifikaat het hulle steeds nodig, en sommige ander rekords bly ook oor. Die bladsy lys albei kante voordat enigiets gebeur.',
    'account.closeLink': 'Sluit hierdie rekening',
  },
  'zh-hans': {
    'account.lede': '管理账户的显示方式。登录地址仅供参考，不能在这里更改。',
    'account.status': '账户状态：{status}',
    'account.statusActive': '正常',
    'account.statusSuspended': '已暂停',
    'account.statusClosed': '已关闭',
    'account.owedHeading': '继续之前',
    'account.owedOne': '有 {count} 份文件等待你同意。',
    'account.owedOther': '有 {count} 份文件等待你同意。',
    'account.owedBody': '请阅读并同意，你同意的时间会记录在账户中。在此期间，本页的其他内容不会受到限制。',
    'account.owedVersion': '{title}——第 {number} 版',
    'account.selfHeading': '以自己的身份学习',
    'account.selfLearnsAs': '此账户以 {name} 的身份学习。你报名或购买的课程都属于这位学习者，不会混入其他人的学习进度。',
    'account.selfInFamily': '你的学习在一个家庭账户内，因此一份家庭套餐可以同时涵盖你和其中的孩子。可在家庭页面管理。',
    'account.selfOnOwn': '你的学习是独立的。如果你管理着家庭账户，可以把它移到孩子们旁边，让一份套餐涵盖所有人——资料不变，进度不变。',
    'account.selfGo': '前往我的学习',
    'account.selfJoinFamily': '在我的家庭内学习',
    'account.selfWhoSees': '谁能看到我的进度',
    'account.selfNone': '你还没有学习者资料。报名课程、购买课程或分享进度之前都需要它——课程总是属于一位具名的学习者，这就是成为学习者的方式。',
    'account.selfFamilyInstead': '如果你管理着家庭账户，也可以改为在那里成为学习者，从一开始就是家庭的一员。',
    'account.selfClaimNote': '这不会创建第二个账户，只是把你作为学习者加入此账户。',
    'account.formName': '显示名称',
    'account.formLanguage': '首选语言代码',
    'account.formLanguageNote': '它随你的资料一起保存，目前还没有任何功能使用它。这些页面的语言在“语言”页面选择，并保存在此浏览器中。',
    'account.formZone': '时区',
    'account.formSave': '保存资料',
    'account.formSaved': '你的资料已更新。',
    'account.formFailed': '无法保存你的资料。请重试。',
    'account.formNameMissing': '请填写你希望别人看到的名称。',
    'account.formNameLong': '显示名称请不要超过 {count} 个字符。',
    'account.formLanguageBad': '请使用 en 或 en-GB 这样的语言代码。',
    'account.formZoneLong': '时区请不要超过 {count} 个字符。',
    'account.formZoneBad': '请使用有效的 IANA 时区，例如 Africa/Kampala。',
    'account.formSignedOut': '你已退出登录。请重新登录后再保存。',
    'account.formNotFound': '找不到你的资料。请退出后重新登录，然后重试。',
    'account.signInHeading': '你的登录方式',
    'account.signInBoth': '你可以用密码登录，也可以用 Google 登录。',
    'account.signInPassword': '你用电子邮件地址和密码登录。',
    'account.signInGoogle': '你用 Google 登录。此账户没有密码。',
    'account.signInPhone': '你用发送到手机的验证码登录。',
    'account.signInOther': '你的登录方式：{methods}。',
    'account.signInNone': '此账户没有记录任何登录方式。',
    'account.signInUnread': '暂时无法读取你的登录方式。',
    'account.resetBody': '向你的登录邮箱发送安全的密码重置链接。链接的有效期取决于身份验证服务商的设置。',
    'account.resetLink': '发送重置链接',
    'account.noPasswordGoogle': '此账户没有密码，因此无需重置——请继续使用 Google 登录。',
    'account.noPasswordPhone': '此账户用手机验证码登录，因此没有可重置的密码。',
    'account.mergeHeading': '两个账户，同一个人',
    'account.mergeBody': '如果你注册了两次，可以把两个账户合并。你保留的账户继续存在，另一个将被关闭；在任何内容移动之前，双方都必须同意。',
    'account.mergeWaiting': '有人请求把一个账户合并到此账户。',
    'account.mergeNone': '此账户没有待处理的事项。',
    'account.mergeLink': '合并账户',
    'account.mergeLinkWaiting': '合并账户（{count} 项待处理）',
    'account.sponsorHeading': '资助名额',
    'account.sponsorBody': '课程可以由别人付费。如果负担不起，可以申请一个名额；也可以为等待中的名额付费——双方永远不会知道对方是谁。',
    'account.sponsorMine': '我申请和资助过的名额',
    'account.sponsorWaiting': '等待中的名额',
    'account.teachHeading': '在这里任教',
    'account.teachBody': '任教须经任命——没有人能靠注册成为教师。如果你想任教，可以提交你的资历和一节你讲过的课的链接，由所有者审阅。',
    'account.teachLink': '申请任教',
    'account.inviteHeading': '邀请朋友',
    'account.inviteBody': '新来的朋友在第一门课程上享受折扣；在对方的付款过了退款期之后，你的下一门课程也享受折扣。两者都是折扣而不是现金，因此不会有任何款项支付。',
    'account.inviteLink': '你的邀请码',
    'account.shareHeading': '分享我的学习',
    'account.shareBody': '你的进度和证书是私密的，对家人也是如此。通过电子邮件邀请某人，由对方自己接受；对方能看到什么、能看多久由你决定，你随时可以终止。',
    'account.shareLink': '谁能看到我的学习',
    'account.readHeading': '阅读显示',
    'account.readBody': '文字大小、对比度和动态效果——选择后立即对此浏览器生效。这里无需保存，页面的其他部分也不会改变。',
    'account.readLink': '阅读偏好',
    'account.termsBody': '条款、隐私声明和教师条款，各有版本号。',
    'account.termsAgreed': '你已同意的版本连同同意时间一并列出。',
    'account.termsNone': '没有等待你同意的内容。',
    'account.termsLink': '阅读这些文件',
    'account.instHeading': '我的机构',
    'account.instBody':
      '你所属的经学院、学校或组织。如果你的电子邮件地址属于其中某个机构已验证的域名，你就可以加入；加入后，机构只能看到成员人数，绝不会看到你的姓名或你学过什么。',
    'account.instLink': '我所属的机构',
    'account.paidHeading': '我的付款记录',
    'account.paidBody': '你的账单账户上发生的每一笔付款和退回的每一笔退款，并按币种列出累计金额。你申请的退款在实际到账之前会单独列出，因为申请不等于收到。',
    'account.paidLink': '查看我的付款记录',
    'account.toldHeading': '我收到的通知',
    'account.toldBody': '平台的消息显示在你的通知中心，而不是邮箱或短信——目前尚未配置任何发送服务商。',
    'account.toldUnreadOne': '你有 {count} 条未读消息。',
    'account.toldUnreadOther': '你有 {count} 条未读消息。',
    'account.toldNone': '没有等待你处理的内容。',
    'account.toldChoice': '你可以选择想要哪些类型，但“应付给你的款项未到账”的通知除外：这类通知总会发送。',
    'account.toldLinkUnread': '通知（{count} 条未读）',
    'account.toldPrefs': '选择接收哪些通知',
    'account.dataHeading': '我的数据',
    'account.dataBody':
      '把我们保存的有关此账户的全部内容下载为一个文件：你的资料、你负责的学习者、他们学过和完成的内容、你的证书、订单和收据、你的笔记，以及你与谁分享了学习情况。',
    'account.dataDownload': '下载我的数据',
    'account.dataSheet': '电子表格格式',
    'account.dataPrint': '阅读或打印',
    'account.dataMore': '现在包含的内容比以前更多：讨论帖、评价和已批改的作业、支持个案、发给你的消息，以及——如果你任教——你的收入和付款。',
    'account.dataWhat': '包含什么，不包含什么',
    'account.dataRestore': '已经有文件了？你的资料、笔记和书签可以恢复到你已报名的课时中；报名记录、证书和订单则不能，该页面会说明原因。',
    'account.dataRestoreLink': '恢复数据',
    'account.closeHeading': '关闭此账户',
    'account.closeBody':
      '关闭账户会更改你的个人资料、移除部分个人信息，并尝试让你退出登录。订单、付款、报名记录和证书会保留，因为退款或证书核验仍然需要它们，另有一些记录也会保留。在任何事情发生之前，页面会列出这两方面。',
    'account.closeLink': '关闭此账户',
  },
  'zh-hant': {
    'account.lede': '管理帳號的顯示方式。登入地址僅供參考，無法在這裡更改。',
    'account.status': '帳號狀態：{status}',
    'account.statusActive': '正常',
    'account.statusSuspended': '已停用',
    'account.statusClosed': '已關閉',
    'account.owedHeading': '繼續之前',
    'account.owedOne': '有 {count} 份文件等待你同意。',
    'account.owedOther': '有 {count} 份文件等待你同意。',
    'account.owedBody': '請閱讀並同意，你同意的時間會記錄在帳號中。在此期間，本頁的其他內容不會受到限制。',
    'account.owedVersion': '{title}——第 {number} 版',
    'account.selfHeading': '以自己的身分學習',
    'account.selfLearnsAs': '此帳號以 {name} 的身分學習。你報名或購買的課程都屬於這位學習者，不會混入其他人的學習進度。',
    'account.selfInFamily': '你的學習在一個家庭帳號內，因此一份家庭方案可以同時涵蓋你和其中的孩子。可在家庭頁面管理。',
    'account.selfOnOwn': '你的學習是獨立的。如果你管理著家庭帳號，可以把它移到孩子們旁邊，讓一份方案涵蓋所有人——資料不變，進度不變。',
    'account.selfGo': '前往我的學習',
    'account.selfJoinFamily': '在我的家庭內學習',
    'account.selfWhoSees': '誰能看到我的進度',
    'account.selfNone': '你還沒有學習者資料。報名課程、購買課程或分享進度之前都需要它——課程總是屬於一位具名的學習者，這就是成為學習者的方式。',
    'account.selfFamilyInstead': '如果你管理著家庭帳號，也可以改為在那裡成為學習者，從一開始就是家庭的一員。',
    'account.selfClaimNote': '這不會建立第二個帳號，只是把你以學習者身分加入此帳號。',
    'account.formName': '顯示名稱',
    'account.formLanguage': '偏好語言代碼',
    'account.formLanguageNote': '它隨你的資料一起儲存，目前還沒有任何功能使用它。這些頁面的語言在「語言」頁面選擇，並儲存在此瀏覽器中。',
    'account.formZone': '時區',
    'account.formSave': '儲存資料',
    'account.formSaved': '你的資料已更新。',
    'account.formFailed': '無法儲存你的資料。請再試一次。',
    'account.formNameMissing': '請填寫你希望別人看到的名稱。',
    'account.formNameLong': '顯示名稱請不要超過 {count} 個字元。',
    'account.formLanguageBad': '請使用 en 或 en-GB 這樣的語言代碼。',
    'account.formZoneLong': '時區請不要超過 {count} 個字元。',
    'account.formZoneBad': '請使用有效的 IANA 時區，例如 Africa/Kampala。',
    'account.formSignedOut': '你已登出。請重新登入後再儲存。',
    'account.formNotFound': '找不到你的資料。請登出後重新登入，然後再試一次。',
    'account.signInHeading': '你的登入方式',
    'account.signInBoth': '你可以用密碼登入，也可以用 Google 登入。',
    'account.signInPassword': '你用電子郵件地址和密碼登入。',
    'account.signInGoogle': '你用 Google 登入。此帳號沒有密碼。',
    'account.signInPhone': '你用傳送到手機的驗證碼登入。',
    'account.signInOther': '你的登入方式：{methods}。',
    'account.signInNone': '此帳號沒有記錄任何登入方式。',
    'account.signInUnread': '暫時無法讀取你的登入方式。',
    'account.resetBody': '向你的登入信箱傳送安全的密碼重設連結。連結的有效期限取決於身分驗證服務商的設定。',
    'account.resetLink': '傳送重設連結',
    'account.noPasswordGoogle': '此帳號沒有密碼，因此無需重設——請繼續使用 Google 登入。',
    'account.noPasswordPhone': '此帳號用手機驗證碼登入，因此沒有可重設的密碼。',
    'account.mergeHeading': '兩個帳號，同一個人',
    'account.mergeBody': '如果你註冊了兩次，可以把兩個帳號合併。你保留的帳號繼續存在，另一個將被關閉；在任何內容移動之前，雙方都必須同意。',
    'account.mergeWaiting': '有人請求把一個帳號合併到此帳號。',
    'account.mergeNone': '此帳號沒有待處理的事項。',
    'account.mergeLink': '合併帳號',
    'account.mergeLinkWaiting': '合併帳號（{count} 項待處理）',
    'account.sponsorHeading': '贊助名額',
    'account.sponsorBody': '課程可以由別人付費。如果負擔不起，可以申請一個名額；也可以為等待中的名額付費——雙方永遠不會知道對方是誰。',
    'account.sponsorMine': '我申請和贊助過的名額',
    'account.sponsorWaiting': '等待中的名額',
    'account.teachHeading': '在這裡任教',
    'account.teachBody': '任教須經任命——沒有人能靠註冊成為教師。如果你想任教，可以提交你的資歷和一堂你講過的課的連結，由擁有者審閱。',
    'account.teachLink': '申請任教',
    'account.inviteHeading': '邀請朋友',
    'account.inviteBody': '新來的朋友在第一門課程上享有折扣；在對方的付款過了退款期之後，你的下一門課程也享有折扣。兩者都是折扣而不是現金，因此不會有任何款項支付。',
    'account.inviteLink': '你的邀請碼',
    'account.shareHeading': '分享我的學習',
    'account.shareBody': '你的進度和證書是私密的，對家人也是如此。透過電子郵件邀請某人，由對方自己接受；對方能看到什麼、能看多久由你決定，你隨時可以終止。',
    'account.shareLink': '誰能看到我的學習',
    'account.readHeading': '閱讀顯示',
    'account.readBody': '文字大小、對比度和動態效果——選擇後立即對此瀏覽器生效。這裡無需儲存，頁面的其他部分也不會改變。',
    'account.readLink': '閱讀偏好',
    'account.termsBody': '條款、隱私權聲明和教師條款，各有版本號。',
    'account.termsAgreed': '你已同意的版本連同同意時間一併列出。',
    'account.termsNone': '沒有等待你同意的內容。',
    'account.termsLink': '閱讀這些文件',
    'account.instHeading': '我的機構',
    'account.instBody':
      '你所屬的經學院、學校或組織。如果你的電子郵件地址屬於其中某個機構已驗證的網域，你就可以加入；加入後，機構只能看到成員人數，絕不會看到你的姓名或你學過什麼。',
    'account.instLink': '我所屬的機構',
    'account.paidHeading': '我的付款紀錄',
    'account.paidBody': '你的帳單帳號上發生的每一筆付款和退回的每一筆退款，並依幣別列出累計金額。你申請的退款在實際入帳之前會單獨列出，因為申請不等於收到。',
    'account.paidLink': '查看我的付款紀錄',
    'account.toldHeading': '我收到的通知',
    'account.toldBody': '平台的訊息顯示在你的通知中心，而不是信箱或簡訊——目前尚未設定任何傳送服務商。',
    'account.toldUnreadOne': '你有 {count} 則未讀訊息。',
    'account.toldUnreadOther': '你有 {count} 則未讀訊息。',
    'account.toldNone': '沒有等待你處理的內容。',
    'account.toldChoice': '你可以選擇想要哪些類型，但「應付給你的款項未入帳」的通知除外：這類通知一定會傳送。',
    'account.toldLinkUnread': '通知（{count} 則未讀）',
    'account.toldPrefs': '選擇接收哪些通知',
    'account.dataHeading': '我的資料',
    'account.dataBody':
      '把我們保存的有關此帳號的全部內容下載為一個檔案：你的個人資料、你負責的學習者、他們學過和完成的內容、你的證書、訂單和收據、你的筆記，以及你與誰分享了學習情況。',
    'account.dataDownload': '下載我的資料',
    'account.dataSheet': '試算表格式',
    'account.dataPrint': '閱讀或列印',
    'account.dataMore': '現在包含的內容比以前更多：討論貼文、評價和已批改的作業、支援個案、傳給你的訊息，以及——如果你任教——你的收入和付款。',
    'account.dataWhat': '包含什麼，不包含什麼',
    'account.dataRestore': '已經有檔案了？你的個人資料、筆記和書籤可以還原到你已報名的課堂中；報名紀錄、證書和訂單則不能，該頁面會說明原因。',
    'account.dataRestoreLink': '還原資料',
    'account.closeHeading': '關閉此帳號',
    'account.closeBody':
      '關閉帳號會變更你的個人資料、移除部分個人資訊，並嘗試讓你登出。訂單、付款、報名紀錄和證書會保留，因為退款或證書查驗仍然需要它們，另有一些紀錄也會保留。在任何事情發生之前，頁面會列出這兩方面。',
    'account.closeLink': '關閉此帳號',
  },
  vi: {
    'account.lede':
      'Quản lý cách tài khoản của bạn hiển thị. Địa chỉ đăng nhập được hiển thị để tham khảo và không thay đổi được ở đây.',
    'account.status': 'Trạng thái tài khoản: {status}',
    'account.statusActive': 'đang hoạt động',
    'account.statusSuspended': 'bị tạm ngưng',
    'account.statusClosed': 'đã đóng',
    'account.owedHeading': 'Trước khi bạn tiếp tục',
    'account.owedOne': 'Có {count} tài liệu đang chờ bạn đồng ý.',
    'account.owedOther': 'Có {count} tài liệu đang chờ bạn đồng ý.',
    'account.owedBody':
      'Hãy đọc và đồng ý; thời điểm bạn đồng ý được lưu cùng tài khoản. Trong lúc đó, không có gì khác trên trang này bị giữ lại.',
    'account.owedVersion': '{title} — phiên bản {number}',
    'account.selfHeading': 'Học với tư cách chính mình',
    'account.selfLearnsAs':
      'Tài khoản này học dưới tên {name}. Các khoá học bạn ghi danh hoặc mua thuộc về học viên đó, và tiến độ của người khác không lẫn vào.',
    'account.selfInFamily':
      'Việc học của bạn nằm trong một tài khoản gia đình, nên một gói gia đình có thể bao gồm cả bạn cùng các con. Bạn quản lý việc đó ở trang gia đình.',
    'account.selfOnOwn':
      'Việc học của bạn đang đứng riêng. Nếu bạn quản lý một tài khoản gia đình, bạn có thể chuyển nó vào cạnh các con để một gói bao gồm tất cả — cùng hồ sơ, cùng tiến độ.',
    'account.selfGo': 'Đến việc học của tôi',
    'account.selfJoinFamily': 'Học trong gia đình tôi',
    'account.selfWhoSees': 'Ai có thể xem tiến độ của tôi',
    'account.selfNone':
      'Bạn chưa có hồ sơ học viên. Cần có hồ sơ trước khi bạn ghi danh một khoá học, mua một khoá, hoặc chia sẻ tiến độ — khoá học luôn dành cho một học viên có tên, và đây là cách bạn trở thành học viên.',
    'account.selfFamilyInstead':
      'Nếu bạn quản lý một tài khoản gia đình, bạn có thể trở thành học viên ở đó, và là một phần của gia đình ngay từ đầu.',
    'account.selfClaimNote':
      'Việc này không tạo tài khoản thứ hai. Nó thêm bạn làm học viên vào tài khoản này.',
    'account.formName': 'Tên hiển thị',
    'account.formLanguage': 'Mã ngôn ngữ ưa dùng',
    'account.formLanguageNote':
      'Mã này được lưu cùng hồ sơ của bạn, và hiện chưa có gì dùng đến nó. Ngôn ngữ của các trang này được chọn ở trang Ngôn ngữ và được lưu trên trình duyệt này.',
    'account.formZone': 'Múi giờ',
    'account.formSave': 'Lưu hồ sơ',
    'account.formSaved': 'Hồ sơ của bạn đã được cập nhật.',
    'account.formFailed': 'Không lưu được hồ sơ của bạn. Hãy thử lại.',
    'account.formNameMissing': 'Hãy thêm tên bạn muốn mọi người nhìn thấy.',
    'account.formNameLong': 'Tên hiển thị không được quá {count} ký tự.',
    'account.formLanguageBad': 'Hãy dùng mã ngôn ngữ như en hoặc en-GB.',
    'account.formZoneLong': 'Múi giờ không được quá {count} ký tự.',
    'account.formZoneBad': 'Hãy dùng một múi giờ IANA hợp lệ, chẳng hạn Africa/Kampala.',
    'account.formSignedOut': 'Bạn đã bị đăng xuất. Hãy đăng nhập lại rồi lưu.',
    'account.formNotFound':
      'Không tìm thấy hồ sơ của bạn. Hãy đăng xuất, đăng nhập lại rồi thử lại.',
    'account.signInHeading': 'Cách bạn đăng nhập',
    'account.signInBoth': 'Bạn có thể đăng nhập bằng mật khẩu hoặc bằng Google.',
    'account.signInPassword': 'Bạn đăng nhập bằng địa chỉ email và mật khẩu.',
    'account.signInGoogle': 'Bạn đăng nhập bằng Google. Tài khoản này không có mật khẩu.',
    'account.signInPhone': 'Bạn đăng nhập bằng mã được gửi đến điện thoại.',
    'account.signInOther': 'Bạn đăng nhập bằng: {methods}.',
    'account.signInNone': 'Không có phương thức đăng nhập nào được ghi nhận cho tài khoản này.',
    'account.signInUnread': 'Hiện chưa đọc được các phương thức đăng nhập của bạn.',
    'account.resetBody':
      'Gửi liên kết đặt lại mật khẩu an toàn đến email đăng nhập của bạn. Liên kết hết hạn theo cài đặt của nhà cung cấp xác thực.',
    'account.resetLink': 'Gửi liên kết đặt lại',
    'account.noPasswordGoogle':
      'Tài khoản này không có mật khẩu, nên không có gì để đặt lại — hãy tiếp tục đăng nhập bằng Google.',
    'account.noPasswordPhone':
      'Tài khoản này đăng nhập bằng mã điện thoại, nên không có mật khẩu để đặt lại.',
    'account.mergeHeading': 'Hai tài khoản, một người',
    'account.mergeBody':
      'Nếu bạn đã đăng ký hai lần, các tài khoản có thể được gộp lại. Tài khoản bạn giữ sẽ tồn tại; tài khoản kia bị đóng, và cả hai phải đồng ý trước khi có gì được chuyển.',
    'account.mergeWaiting': 'Có người đang yêu cầu gộp một tài khoản vào tài khoản này.',
    'account.mergeNone': 'Không có gì đang chờ trên tài khoản này.',
    'account.mergeLink': 'Gộp tài khoản',
    'account.mergeLinkWaiting': 'Gộp tài khoản ({count} đang chờ)',
    'account.sponsorHeading': 'Suất được tài trợ',
    'account.sponsorBody':
      'Một khoá học có thể do người khác trả tiền. Hãy xin một suất nếu khoá học ngoài khả năng của bạn, hoặc trả tiền cho một suất đang chờ — hai bên không bao giờ biết bên kia là ai.',
    'account.sponsorMine': 'Những gì tôi đã xin và đã tài trợ',
    'account.sponsorWaiting': 'Các suất đang chờ',
    'account.teachHeading': 'Giảng dạy tại đây',
    'account.teachBody':
      'Việc giảng dạy là theo bổ nhiệm — không ai trở thành giáo viên chỉ bằng cách đăng ký. Nếu bạn muốn dạy, bạn có thể gửi trình độ chuyên môn và liên kết đến một bài bạn đã dạy, và chủ sở hữu sẽ đọc.',
    'account.teachLink': 'Đăng ký giảng dạy',
    'account.inviteHeading': 'Mời một người bạn',
    'account.inviteBody':
      'Một người bạn mới đến đây được giảm giá cho khoá học đầu tiên, và bạn được giảm giá cho khoá tiếp theo khi khoản thanh toán của họ đã qua thời hạn hoàn tiền. Cả hai đều là giảm giá, không phải tiền, nên không có gì để chi trả.',
    'account.inviteLink': 'Mã mời của bạn',
    'account.shareHeading': 'Chia sẻ việc học của tôi',
    'account.shareBody':
      'Tiến độ và chứng chỉ của bạn là riêng tư, kể cả với gia đình bạn. Hãy mời ai đó qua email và họ tự chấp nhận; bạn chọn họ thấy gì và trong bao lâu, và bạn có thể kết thúc bất cứ lúc nào.',
    'account.shareLink': 'Ai có thể xem việc học của tôi',
    'account.readHeading': 'Cách hiển thị để đọc',
    'account.readBody':
      'Cỡ chữ, độ tương phản và chuyển động — được áp dụng ngay khi bạn chọn, cho trình duyệt này. Ở đây không có gì cần lưu, và không có gì khác trên trang thay đổi.',
    'account.readLink': 'Tuỳ chọn đọc',
    'account.termsBody':
      'Điều khoản, thông báo về quyền riêng tư và điều khoản dành cho giáo viên, mỗi văn bản đều có số phiên bản.',
    'account.termsAgreed': 'Các phiên bản bạn đã đồng ý được liệt kê cùng thời điểm bạn đồng ý.',
    'account.termsNone': 'Không có gì đang chờ bạn đồng ý.',
    'account.termsLink': 'Đọc các văn bản',
    'account.instHeading': 'Tổ chức của tôi',
    'account.instBody':
      'Một madrasah, trường học hoặc tổ chức mà bạn thuộc về. Nếu địa chỉ email của bạn thuộc một tên miền mà một trong số đó đã xác minh, bạn có thể tham gia; khi đã tham gia, tổ chức chỉ thấy số lượng người của mình và không bao giờ thấy tên bạn hay những gì bạn đã học.',
    'account.instLink': 'Nơi tôi thuộc về',
    'account.paidHeading': 'Những gì tôi đã trả',
    'account.paidBody':
      'Mọi khoản thanh toán đã thực hiện trên tài khoản thanh toán của bạn, và mọi khoản hoàn tiền đã trả về, kèm tổng luỹ kế theo từng loại tiền. Khoản hoàn tiền bạn đã yêu cầu được liệt kê riêng cho đến khi thực sự được chuyển, vì yêu cầu chưa phải là nhận được.',
    'account.paidLink': 'Xem những gì tôi đã trả',
    'account.toldHeading': 'Những gì tôi được thông báo',
    'account.toldBody':
      'Tin nhắn từ nền tảng xuất hiện trong trung tâm thông báo của bạn, không phải trong hộp thư hay tin nhắn văn bản — hiện chưa có nhà cung cấp dịch vụ gửi nào được cấu hình.',
    'account.toldUnreadOne': 'Bạn có {count} tin nhắn chưa đọc.',
    'account.toldUnreadOther': 'Bạn có {count} tin nhắn chưa đọc.',
    'account.toldNone': 'Không có gì đang chờ bạn.',
    'account.toldChoice':
      'Bạn chọn những loại mình muốn, trừ các thông báo rằng khoản tiền phải trả cho bạn đã không đến: những thông báo đó luôn được gửi.',
    'account.toldLinkUnread': 'Thông báo ({count} chưa đọc)',
    'account.toldPrefs': 'Chọn những gì bạn được thông báo',
    'account.dataHeading': 'Dữ liệu của tôi',
    'account.dataBody':
      'Tải xuống mọi thứ chúng tôi lưu về tài khoản này trong một tệp: hồ sơ của bạn, các học viên bạn chịu trách nhiệm, những gì họ đã học và hoàn thành, chứng chỉ, đơn hàng và biên nhận của bạn, ghi chú của bạn, và những người bạn đã chia sẻ việc học.',
    'account.dataDownload': 'Tải xuống dữ liệu của tôi',
    'account.dataSheet': 'Dưới dạng bảng tính',
    'account.dataPrint': 'Đọc hoặc in',
    'account.dataMore':
      'Giờ tệp chứa nhiều hơn trước: các bài đăng thảo luận, đánh giá và bài đã chấm, các yêu cầu hỗ trợ, tin nhắn đã gửi cho bạn, và — nếu bạn giảng dạy — thu nhập và các khoản chi trả của bạn.',
    'account.dataWhat': 'Trong đó có gì, và những gì bị bỏ ra',
    'account.dataRestore':
      'Đã có tệp sẵn? Hồ sơ, ghi chú và dấu trang của bạn có thể được đưa trở lại các bài học bạn đang ghi danh; việc ghi danh, chứng chỉ và đơn hàng thì không, và trang đó giải thích lý do.',
    'account.dataRestoreLink': 'Đưa trở lại',
    'account.closeHeading': 'Đóng tài khoản này',
    'account.closeBody':
      'Việc đóng sẽ thay đổi hồ sơ của bạn, gỡ bỏ một số thông tin cá nhân và cố gắng đăng xuất bạn. Đơn hàng, thanh toán, ghi danh và chứng chỉ được giữ lại, vì việc hoàn tiền hay kiểm tra chứng chỉ vẫn cần đến chúng, và một số bản ghi khác cũng vẫn còn. Trang đó liệt kê cả hai phía trước khi bất cứ điều gì xảy ra.',
    'account.closeLink': 'Đóng tài khoản này',
  },
  th: {
    'account.lede':
      'จัดการวิธีแสดงบัญชีของคุณ ที่อยู่สำหรับเข้าสู่ระบบแสดงไว้เพื่ออ้างอิงและเปลี่ยนที่นี่ไม่ได้',
    'account.status': 'สถานะบัญชี: {status}',
    'account.statusActive': 'ใช้งานอยู่',
    'account.statusSuspended': 'ถูกระงับ',
    'account.statusClosed': 'ปิดแล้ว',
    'account.owedHeading': 'ก่อนดำเนินการต่อ',
    'account.owedOne': 'มีเอกสาร {count} ฉบับรอการยอมรับจากคุณ',
    'account.owedOther': 'มีเอกสาร {count} ฉบับรอการยอมรับจากคุณ',
    'account.owedBody':
      'อ่านแล้วกดยอมรับ เวลาที่คุณยอมรับจะถูกเก็บไว้กับบัญชีของคุณ ระหว่างนี้ไม่มีสิ่งอื่นในหน้านี้ถูกระงับไว้',
    'account.owedVersion': '{title} — ฉบับที่ {number}',
    'account.selfHeading': 'เรียนในนามของคุณเอง',
    'account.selfLearnsAs':
      'บัญชีนี้เรียนในชื่อ {name} หลักสูตรที่คุณลงทะเบียนหรือซื้อเป็นของผู้เรียนคนนั้น และความคืบหน้าของคนอื่นจะไม่ปะปนเข้ามา',
    'account.selfInFamily':
      'การเรียนของคุณอยู่ในบัญชีครอบครัว แพ็กเกจครอบครัวเดียวจึงครอบคลุมคุณไปพร้อมกับเด็ก ๆ ได้ คุณจัดการเรื่องนี้ได้ที่หน้าครอบครัว',
    'account.selfOnOwn':
      'การเรียนของคุณแยกอยู่ต่างหาก หากคุณดูแลบัญชีครอบครัว คุณย้ายมันไปอยู่ข้างเด็ก ๆ ได้ เพื่อให้แพ็กเกจเดียวครอบคลุมทุกคน — โปรไฟล์เดิม ความคืบหน้าเดิม',
    'account.selfGo': 'ไปที่การเรียนของฉัน',
    'account.selfJoinFamily': 'เรียนภายในครอบครัวของฉัน',
    'account.selfWhoSees': 'ใครเห็นความคืบหน้าของฉันได้บ้าง',
    'account.selfNone':
      'คุณยังไม่มีโปรไฟล์ผู้เรียน ต้องมีก่อนจึงจะลงทะเบียนหลักสูตร ซื้อหลักสูตร หรือแชร์ความคืบหน้าได้ — หลักสูตรเป็นของผู้เรียนที่มีชื่อเสมอ และนี่คือวิธีที่คุณจะเป็นผู้เรียน',
    'account.selfFamilyInstead':
      'หากคุณดูแลบัญชีครอบครัว คุณเป็นผู้เรียนที่นั่นแทนได้ และเป็นส่วนหนึ่งของครอบครัวตั้งแต่ต้น',
    'account.selfClaimNote': 'การทำเช่นนี้ไม่ได้สร้างบัญชีที่สอง แต่เพิ่มคุณเป็นผู้เรียนในบัญชีนี้',
    'account.formName': 'ชื่อที่แสดง',
    'account.formLanguage': 'รหัสภาษาที่ต้องการ',
    'account.formLanguageNote':
      'ค่านี้เก็บไว้กับโปรไฟล์ของคุณ และยังไม่มีส่วนใดนำไปใช้ ภาษาของหน้าเหล่านี้เลือกได้ที่หน้าภาษาและเก็บไว้ในเบราว์เซอร์นี้',
    'account.formZone': 'เขตเวลา',
    'account.formSave': 'บันทึกโปรไฟล์',
    'account.formSaved': 'อัปเดตโปรไฟล์ของคุณแล้ว',
    'account.formFailed': 'บันทึกโปรไฟล์ของคุณไม่ได้ ลองอีกครั้ง',
    'account.formNameMissing': 'เพิ่มชื่อที่คุณต้องการให้คนอื่นเห็น',
    'account.formNameLong': 'ชื่อที่แสดงต้องไม่เกิน {count} อักขระ',
    'account.formLanguageBad': 'ใช้รหัสภาษา เช่น en หรือ en-GB',
    'account.formZoneLong': 'เขตเวลาต้องไม่เกิน {count} อักขระ',
    'account.formZoneBad': 'ใช้เขตเวลา IANA ที่ถูกต้อง เช่น Africa/Kampala',
    'account.formSignedOut': 'คุณออกจากระบบแล้ว เข้าสู่ระบบอีกครั้งแล้วจึงบันทึก',
    'account.formNotFound': 'ไม่พบโปรไฟล์ของคุณ ออกจากระบบแล้วเข้าใหม่ จากนั้นลองอีกครั้ง',
    'account.signInHeading': 'วิธีที่คุณเข้าสู่ระบบ',
    'account.signInBoth': 'คุณเข้าสู่ระบบด้วยรหัสผ่านหรือด้วย Google ก็ได้',
    'account.signInPassword': 'คุณเข้าสู่ระบบด้วยที่อยู่อีเมลและรหัสผ่าน',
    'account.signInGoogle': 'คุณเข้าสู่ระบบด้วย Google บัญชีนี้ไม่มีรหัสผ่าน',
    'account.signInPhone': 'คุณเข้าสู่ระบบด้วยรหัสที่ส่งไปยังโทรศัพท์ของคุณ',
    'account.signInOther': 'คุณเข้าสู่ระบบด้วย: {methods}',
    'account.signInNone': 'ไม่มีวิธีเข้าสู่ระบบที่บันทึกไว้สำหรับบัญชีนี้',
    'account.signInUnread': 'ขณะนี้อ่านวิธีเข้าสู่ระบบของคุณไม่ได้',
    'account.resetBody':
      'ส่งลิงก์รีเซ็ตรหัสผ่านที่ปลอดภัยไปยังอีเมลที่ใช้เข้าสู่ระบบ ลิงก์จะหมดอายุตามการตั้งค่าของผู้ให้บริการยืนยันตัวตนของคุณ',
    'account.resetLink': 'ส่งลิงก์รีเซ็ต',
    'account.noPasswordGoogle':
      'บัญชีนี้ไม่มีรหัสผ่าน จึงไม่มีอะไรให้รีเซ็ต — ใช้ Google เข้าสู่ระบบต่อไป',
    'account.noPasswordPhone': 'บัญชีนี้เข้าสู่ระบบด้วยรหัสทางโทรศัพท์ จึงไม่มีรหัสผ่านให้รีเซ็ต',
    'account.mergeHeading': 'สองบัญชี คนเดียว',
    'account.mergeBody':
      'หากคุณสมัครสองครั้ง สามารถรวมบัญชีเข้าด้วยกันได้ บัญชีที่คุณเก็บไว้จะอยู่ต่อ อีกบัญชีจะถูกปิด และทั้งสองต้องยินยอมก่อนที่จะมีการย้ายสิ่งใด',
    'account.mergeWaiting': 'มีคนขอรวมบัญชีหนึ่งเข้ากับบัญชีนี้',
    'account.mergeNone': 'ไม่มีอะไรรออยู่ในบัญชีนี้',
    'account.mergeLink': 'การรวมบัญชี',
    'account.mergeLinkWaiting': 'การรวมบัญชี (รออยู่ {count})',
    'account.sponsorHeading': 'ที่นั่งที่มีผู้อุปถัมภ์',
    'account.sponsorBody':
      'หลักสูตรอาจมีผู้อื่นจ่ายให้ได้ ขอที่นั่งหากหลักสูตรเกินกำลังของคุณ หรือจ่ายให้ที่นั่งที่กำลังรออยู่ — ทั้งสองฝ่ายจะไม่มีวันรู้ว่าอีกฝ่ายเป็นใคร',
    'account.sponsorMine': 'สิ่งที่ฉันขอและที่ฉันอุปถัมภ์',
    'account.sponsorWaiting': 'ที่นั่งที่รออยู่',
    'account.teachHeading': 'การสอนที่นี่',
    'account.teachBody':
      'การสอนเป็นไปโดยการแต่งตั้ง — ไม่มีใครเป็นครูได้ด้วยการสมัครเท่านั้น หากคุณต้องการสอน คุณส่งคุณวุฒิและลิงก์ไปยังบทเรียนที่คุณเคยสอนได้ และเจ้าของจะอ่าน',
    'account.teachLink': 'สมัครเป็นผู้สอน',
    'account.inviteHeading': 'ชวนเพื่อน',
    'account.inviteBody':
      'เพื่อนที่เพิ่งมาใหม่จะได้ส่วนลดสำหรับหลักสูตรแรก และคุณจะได้ส่วนลดสำหรับหลักสูตรถัดไปเมื่อการชำระเงินของเพื่อนพ้นช่วงขอคืนเงินแล้ว ทั้งสองอย่างเป็นส่วนลด ไม่ใช่เงิน จึงไม่มีการจ่ายเงินออก',
    'account.inviteLink': 'รหัสเชิญของคุณ',
    'account.shareHeading': 'การแชร์การเรียนของฉัน',
    'account.shareBody':
      'ความคืบหน้าและประกาศนียบัตรของคุณเป็นส่วนตัว แม้แต่กับครอบครัวของคุณ เชิญใครสักคนทางอีเมลแล้วเขาจะตอบรับด้วยตัวเอง คุณเลือกว่าเขาจะเห็นอะไรและนานเท่าใด และยุติได้ทุกเมื่อ',
    'account.shareLink': 'ใครเห็นการเรียนของฉันได้บ้าง',
    'account.readHeading': 'การแสดงผลสำหรับอ่าน',
    'account.readBody':
      'ขนาดตัวอักษร ความคมชัดของสี และการเคลื่อนไหว — มีผลทันทีที่คุณเลือก สำหรับเบราว์เซอร์นี้ ไม่มีอะไรที่นี่ต้องบันทึก และไม่มีสิ่งอื่นในหน้าเปลี่ยนไป',
    'account.readLink': 'การตั้งค่าการอ่าน',
    'account.termsBody': 'ข้อกำหนด ประกาศความเป็นส่วนตัว และข้อกำหนดสำหรับครู แต่ละฉบับมีเลขฉบับ',
    'account.termsAgreed': 'ฉบับที่คุณยอมรับแล้วแสดงไว้พร้อมเวลาที่คุณยอมรับ',
    'account.termsNone': 'ไม่มีอะไรรอการยอมรับจากคุณ',
    'account.termsLink': 'อ่านเอกสาร',
    'account.instHeading': 'สถาบันของฉัน',
    'account.instBody':
      'มัดรอซะฮ์ โรงเรียน หรือองค์กรที่คุณสังกัด หากที่อยู่อีเมลของคุณอยู่ในโดเมนที่สถาบันใดสถาบันหนึ่งยืนยันแล้ว คุณเข้าร่วมได้ เมื่อเข้าร่วมแล้ว สถาบันจะเห็นเพียงจำนวนคนของตน และไม่เห็นชื่อของคุณหรือสิ่งที่คุณเรียนเลย',
    'account.instLink': 'ที่ที่ฉันสังกัด',
    'account.paidHeading': 'สิ่งที่ฉันจ่ายไป',
    'account.paidBody':
      'การชำระเงินทุกรายการที่เกิดขึ้นในบัญชีเรียกเก็บเงินของคุณ และเงินคืนทุกรายการที่กลับมา พร้อมยอดรวมสะสมแยกตามสกุลเงิน เงินคืนที่คุณขอไว้จะแสดงแยกจนกว่าจะโอนจริง เพราะการขอยังไม่ใช่การได้รับ',
    'account.paidLink': 'ดูสิ่งที่ฉันจ่ายไป',
    'account.toldHeading': 'สิ่งที่ฉันได้รับแจ้ง',
    'account.toldBody':
      'ข้อความจากแพลตฟอร์มแสดงในศูนย์การแจ้งเตือนของคุณ ไม่ใช่ในกล่องจดหมายหรือข้อความ SMS — ยังไม่มีการตั้งค่าผู้ให้บริการจัดส่ง',
    'account.toldUnreadOne': 'คุณมี {count} ข้อความที่ยังไม่ได้อ่าน',
    'account.toldUnreadOther': 'คุณมี {count} ข้อความที่ยังไม่ได้อ่าน',
    'account.toldNone': 'ไม่มีอะไรรอคุณอยู่',
    'account.toldChoice':
      'คุณเลือกได้ว่าต้องการประเภทใด ยกเว้นการแจ้งว่าเงินที่ค้างจ่ายให้คุณไปไม่ถึง: การแจ้งนั้นจะมาเสมอ',
    'account.toldLinkUnread': 'การแจ้งเตือน (ยังไม่ได้อ่าน {count})',
    'account.toldPrefs': 'เลือกสิ่งที่คุณจะได้รับแจ้ง',
    'account.dataHeading': 'ข้อมูลของฉัน',
    'account.dataBody':
      'ดาวน์โหลดทุกอย่างที่เราเก็บไว้เกี่ยวกับบัญชีนี้เป็นไฟล์เดียว: โปรไฟล์ของคุณ ผู้เรียนที่คุณรับผิดชอบ สิ่งที่พวกเขาเรียนและเรียนจบ ประกาศนียบัตร คำสั่งซื้อและใบเสร็จของคุณ บันทึกของคุณ และผู้ที่คุณแชร์การเรียนด้วย',
    'account.dataDownload': 'ดาวน์โหลดข้อมูลของฉัน',
    'account.dataSheet': 'เป็นสเปรดชีต',
    'account.dataPrint': 'อ่านหรือพิมพ์',
    'account.dataMore':
      'ตอนนี้ไฟล์มีมากกว่าเดิม: โพสต์ในการสนทนา รีวิวและงานที่ตรวจแล้ว เคสขอความช่วยเหลือ ข้อความที่ส่งถึงคุณ และ — หากคุณสอน — รายได้และการจ่ายเงินของคุณ',
    'account.dataWhat': 'มีอะไรอยู่ในไฟล์ และอะไรที่ไม่ได้รวมไว้',
    'account.dataRestore':
      'มีไฟล์อยู่แล้วหรือ โปรไฟล์ บันทึก และบุ๊กมาร์กของคุณนำกลับไปใส่ในบทเรียนที่คุณลงทะเบียนอยู่ได้ ส่วนการลงทะเบียน ประกาศนียบัตร และคำสั่งซื้อทำไม่ได้ และหน้านั้นบอกเหตุผลไว้',
    'account.dataRestoreLink': 'นำกลับมาใส่',
    'account.closeHeading': 'การปิดบัญชีนี้',
    'account.closeBody':
      'การปิดบัญชีจะเปลี่ยนโปรไฟล์ของคุณ นำข้อมูลส่วนบุคคลบางส่วนออก และพยายามออกจากระบบให้คุณ คำสั่งซื้อ การชำระเงิน การลงทะเบียน และประกาศนียบัตรจะเก็บไว้ เพราะการคืนเงินหรือการตรวจสอบประกาศนียบัตรยังต้องใช้ และบันทึกอื่นบางส่วนก็ยังคงอยู่ หน้านั้นแสดงทั้งสองด้านก่อนที่จะเกิดอะไรขึ้น',
    'account.closeLink': 'ปิดบัญชีนี้',
  },
  fil: {
    'account.lede':
      'Pamahalaan kung paano lumalabas ang iyong account. Ipinapakita ang iyong address sa pag-sign in bilang sanggunian at hindi ito binabago rito.',
    'account.status': 'Katayuan ng account: {status}',
    'account.statusActive': 'aktibo',
    'account.statusSuspended': 'suspendido',
    'account.statusClosed': 'sarado',
    'account.owedHeading': 'Bago ka magpatuloy',
    'account.owedOne': '{count} dokumento ang naghihintay ng iyong pagsang-ayon.',
    'account.owedOther': '{count} dokumento ang naghihintay ng iyong pagsang-ayon.',
    'account.owedBody':
      'Basahin at sumang-ayon, at itatago sa iyong account ang oras ng pagsang-ayon mo. Samantala, walang ibang bahagi ng pahinang ito ang ipinagkakait.',
    'account.owedVersion': '{title} — bersyon {number}',
    'account.selfHeading': 'Pag-aaral bilang ikaw mismo',
    'account.selfLearnsAs':
      'Nag-aaral ang account na ito bilang si {name}. Sa mag-aaral na iyon ang mga kursong ine-enrol o binibili mo, at walang progreso ng iba na nahahalo rito.',
    'account.selfInFamily':
      'Nasa loob ng isang account ng pamilya ang iyong pag-aaral, kaya masasaklaw ka ng iisang plano ng pamilya kasama ang mga anak nito. Pinamamahalaan mo iyon sa pahina ng pamilya.',
    'account.selfOnOwn':
      'Nakahiwalay ang iyong pag-aaral. Kung may pinamamahalaan kang account ng pamilya, maililipat mo ito sa tabi ng mga anak para iisang plano ang sumaklaw sa lahat — parehong profile, parehong progreso.',
    'account.selfGo': 'Pumunta sa aking pag-aaral',
    'account.selfJoinFamily': 'Mag-aral sa loob ng aking pamilya',
    'account.selfWhoSees': 'Sino ang makakakita ng aking progreso',
    'account.selfNone':
      'Wala ka pang profile ng mag-aaral. Kailangan ito bago ka makapag-enrol sa kurso, makabili ng kurso, o makapagbahagi ng iyong progreso — laging para sa isang pinangalanang mag-aaral ang kurso, at ganito ka nagiging mag-aaral.',
    'account.selfFamilyInstead':
      'Kung may pinamamahalaan kang account ng pamilya, maaari kang maging mag-aaral doon sa halip, at maging bahagi ng pamilya mula sa simula.',
    'account.selfClaimNote':
      'Hindi ito gumagawa ng pangalawang account. Idinadagdag ka nito bilang mag-aaral sa account na ito.',
    'account.formName': 'Pangalang ipinapakita',
    'account.formLanguage': 'Code ng gustong wika',
    'account.formLanguageNote':
      'Itinatago ito kasama ng iyong profile, at wala pang gumagamit nito. Pinipili ang wika ng mga pahinang ito sa pahina ng Wika at itinatago sa browser na ito.',
    'account.formZone': 'Time zone',
    'account.formSave': 'I-save ang profile',
    'account.formSaved': 'Na-update na ang iyong profile.',
    'account.formFailed': 'Hindi na-save ang iyong profile. Subukan muli.',
    'account.formNameMissing': 'Idagdag ang pangalang gusto mong makita ng iba.',
    'account.formNameLong': 'Panatilihing {count} karakter o mas kaunti ang pangalang ipinapakita.',
    'account.formLanguageBad': 'Gumamit ng code ng wika gaya ng en o en-GB.',
    'account.formZoneLong': 'Panatilihing {count} karakter o mas kaunti ang time zone.',
    'account.formZoneBad': 'Gumamit ng wastong IANA time zone, gaya ng Africa/Kampala.',
    'account.formSignedOut': 'Naka-sign out ka na. Mag-sign in muli, saka i-save.',
    'account.formNotFound':
      'Hindi nahanap ang iyong profile. Mag-sign out at mag-sign in muli, saka subukan muli.',
    'account.signInHeading': 'Paano ka nagsa-sign in',
    'account.signInBoth': 'Maaari kang mag-sign in gamit ang pasword o gamit ang Google.',
    'account.signInPassword': 'Nagsa-sign in ka gamit ang iyong email address at pasword.',
    'account.signInGoogle': 'Nagsa-sign in ka gamit ang Google. Walang pasword ang account na ito.',
    'account.signInPhone': 'Nagsa-sign in ka gamit ang code na ipinapadala sa iyong telepono.',
    'account.signInOther': 'Nagsa-sign in ka gamit ang: {methods}.',
    'account.signInNone': 'Walang nakatalang paraan ng pag-sign in para sa account na ito.',
    'account.signInUnread': 'Hindi mabasa ngayon ang iyong mga paraan ng pag-sign in.',
    'account.resetBody':
      'Magpadala ng ligtas na link para i-reset ang pasword sa iyong email sa pag-sign in. Nag-e-expire ang link ayon sa mga setting ng iyong tagapagbigay ng authentication.',
    'account.resetLink': 'Ipadala ang link sa pag-reset',
    'account.noPasswordGoogle':
      'Walang pasword ang account na ito, kaya walang ire-reset — ipagpatuloy ang paggamit ng Google sa pag-sign in.',
    'account.noPasswordPhone':
      'Nagsa-sign in ang account na ito gamit ang code sa telepono, kaya walang pasword na ire-reset.',
    'account.mergeHeading': 'Dalawang account, iisang tao',
    'account.mergeBody':
      'Kung dalawang beses kang nag-sign up, maaaring pagsamahin ang mga account. Mananatili ang account na itatago mo; isasara ang isa, at kailangang sumang-ayon ang dalawa bago may mailipat.',
    'account.mergeWaiting': 'May humihiling na isama ang isang account sa account na ito.',
    'account.mergeNone': 'Walang naghihintay sa account na ito.',
    'account.mergeLink': 'Pagsasama ng mga account',
    'account.mergeLinkWaiting': 'Pagsasama ng mga account ({count} naghihintay)',
    'account.sponsorHeading': 'Mga puwestong may sponsor',
    'account.sponsorBody':
      'Maaaring bayaran ng ibang tao ang isang kurso. Humiling ng puwesto kung hindi mo ito abot, o bayaran ang isang puwestong naghihintay — hindi kailanman malalaman ng dalawang panig kung sino ang isa.',
    'account.sponsorMine': 'Ang hiniling ko at ang in-sponsor ko',
    'account.sponsorWaiting': 'Mga puwestong naghihintay',
    'account.teachHeading': 'Pagtuturo rito',
    'account.teachBody':
      'Ang pagtuturo ay sa pamamagitan ng paghirang — walang nagiging guro sa pag-sign up lamang. Kung gusto mong magturo, maaari mong ipadala ang iyong mga kuwalipikasyon at link sa isang araling naituro mo, at babasahin ito ng may-ari.',
    'account.teachLink': 'Mag-apply para magturo',
    'account.inviteHeading': 'Mag-imbita ng kaibigan',
    'account.inviteBody':
      'Ang kaibigang bago rito ay may diskuwento sa una niyang kurso, at may diskuwento ka sa susunod mong kurso kapag lumampas na sa palugit ng refund ang bayad niya. Parehong diskuwento ang mga ito, hindi pera, kaya walang ibabayad palabas.',
    'account.inviteLink': 'Ang iyong code ng imbitasyon',
    'account.shareHeading': 'Pagbabahagi ng aking pag-aaral',
    'account.shareBody':
      'Pribado ang iyong progreso at mga sertipiko, pati sa iyong pamilya. Mag-imbita ng tao sa pamamagitan ng email at siya mismo ang tatanggap nito; ikaw ang pipili kung ano ang makikita niya at kung gaano katagal, at maaari mo itong tapusin kahit kailan.',
    'account.shareLink': 'Sino ang makakakita ng aking pag-aaral',
    'account.readHeading': 'Paano ito binabasa',
    'account.readBody':
      'Laki ng teksto, contrast at galaw — inilalapat sa sandaling pumili ka, para sa browser na ito. Walang kailangang i-save dito, at walang ibang nagbabago sa pahina.',
    'account.readLink': 'Mga kagustuhan sa pagbasa',
    'account.termsBody':
      'Ang mga tuntunin, ang abiso sa privacy at ang mga tuntunin para sa mga guro, bawat isa ay may numero ng bersyon.',
    'account.termsAgreed':
      'Nakalista ang mga bersyong sinang-ayunan mo kasama ang oras ng pagsang-ayon mo.',
    'account.termsNone': 'Walang naghihintay ng iyong pagsang-ayon.',
    'account.termsLink': 'Basahin ang mga ito',
    'account.instHeading': 'Aking institusyon',
    'account.instBody':
      'Isang madrasah, paaralan o organisasyong kinabibilangan mo. Kung ang iyong email address ay nasa domain na na-verify ng isa sa mga ito, maaari kang sumali; kapag kasali ka na, bilang lamang ng mga tao nito ang nakikita ng institusyon at hindi kailanman ang pangalan mo o ang pinag-aralan mo.',
    'account.instLink': 'Kung saan ako kabilang',
    'account.paidHeading': 'Ang nabayaran ko',
    'account.paidBody':
      'Bawat bayad na naganap sa iyong billing account, at bawat refund na naibalik, na may tumatakbong kabuuan sa bawat pera. Ang refund na hiniling mo ay nakalista nang hiwalay hanggang sa talagang maganap ito, dahil ang paghiling ay hindi pagtanggap.',
    'account.paidLink': 'Tingnan ang nabayaran ko',
    'account.toldHeading': 'Ang ipinaaalam sa akin',
    'account.toldBody':
      'Lumalabas ang mga mensahe mula sa platform sa iyong sentro ng mga abiso, hindi sa inbox o text message — wala pang naka-configure na tagapaghatid.',
    'account.toldUnreadOne': 'Mayroon kang {count} mensaheng hindi pa nababasa.',
    'account.toldUnreadOther': 'Mayroon kang {count} mensaheng hindi pa nababasa.',
    'account.toldNone': 'Walang naghihintay sa iyo.',
    'account.toldChoice':
      'Ikaw ang pumipili kung aling mga uri ang gusto mo, maliban sa mga abisong hindi dumating ang perang dapat mapunta sa iyo: laging dumarating ang mga iyon.',
    'account.toldLinkUnread': 'Mga abiso ({count} hindi pa nababasa)',
    'account.toldPrefs': 'Piliin kung ano ang ipaaalam sa iyo',
    'account.dataHeading': 'Aking data',
    'account.dataBody':
      'I-download bilang isang file ang lahat ng hawak namin tungkol sa account na ito: ang iyong profile, ang mga mag-aaral na pananagutan mo, ang napag-aralan at natapos nila, ang iyong mga sertipiko, order at resibo, ang iyong mga tala, at kung kanino mo ibinahagi ang iyong pag-aaral.',
    'account.dataDownload': 'I-download ang aking data',
    'account.dataSheet': 'Bilang spreadsheet',
    'account.dataPrint': 'Basahin o i-print',
    'account.dataMore':
      'Mas marami na itong laman kaysa dati: ang mga post sa talakayan, mga review at gawaing namarkahan, ang mga kaso ng suporta, ang mga mensaheng ipinadala sa iyo, at — kung nagtuturo ka — ang iyong kita at mga bayad.',
    'account.dataWhat': 'Ano ang laman nito, at ano ang hindi isinama',
    'account.dataRestore':
      'May file ka na? Maibabalik ang iyong profile, mga tala at bookmark sa mga araling naka-enrol ka; hindi maibabalik ang mga enrolment, sertipiko at order, at sinasabi ng pahinang iyon kung bakit.',
    'account.dataRestoreLink': 'Ibalik ito',
    'account.closeHeading': 'Pagsasara ng account na ito',
    'account.closeBody':
      'Binabago ng pagsasara ang profile mo, inaalis ang ilang personal na impormasyon at sinisikap kang i-sign out. Itinatago ang mga order, bayad, enrolment at sertipiko, dahil kailangan pa ang mga ito sa refund o sa pagsusuri ng sertipiko, at may ilan pang rekord na nananatili. Inililista ng pahina ang dalawang panig bago may mangyari.',
    'account.closeLink': 'Isara ang account na ito',
  },
  uz: {
    'account.lede':
      'Hisobingiz qanday koʻrinishini boshqaring. Kirish manzilingiz maʼlumot uchun koʻrsatilgan va bu yerda oʻzgartirilmaydi.',
    'account.status': 'Hisob holati: {status}',
    'account.statusActive': 'faol',
    'account.statusSuspended': 'toʻxtatib qoʻyilgan',
    'account.statusClosed': 'yopilgan',
    'account.owedHeading': 'Davom etishdan oldin',
    'account.owedOne': '{count} ta hujjat roziligingizni kutmoqda.',
    'account.owedOther': '{count} ta hujjat roziligingizni kutmoqda.',
    'account.owedBody':
      'Oʻqing va rozilik bering; rozilik bergan vaqtingiz hisobingizda saqlanadi. Bu orada ushbu sahifadagi boshqa hech narsa cheklanmaydi.',
    'account.owedVersion': '{title} — {number}-versiya',
    'account.selfHeading': 'Oʻz nomingizdan oʻqish',
    'account.selfLearnsAs':
      'Bu hisob {name} nomi bilan oʻqiydi. Siz yozilgan yoki sotib olgan kurslar shu oʻquvchiga tegishli boʻladi va boshqa hech kimning natijasi unga aralashmaydi.',
    'account.selfInFamily':
      'Taʼlimingiz oilaviy hisob ichida, shuning uchun bitta oilaviy reja sizni bolalar bilan birga qamrab olishi mumkin. Buni oila sahifasida boshqarasiz.',
    'account.selfOnOwn':
      'Taʼlimingiz alohida turibdi. Agar oilaviy hisobni boshqarsangiz, bitta reja hammani qamrashi uchun uni bolalar yoniga koʻchirishingiz mumkin — oʻsha profil, oʻsha natija.',
    'account.selfGo': 'Taʼlimimga oʻtish',
    'account.selfJoinFamily': 'Oilam ichida oʻqish',
    'account.selfWhoSees': 'Natijamni kim koʻra oladi',
    'account.selfNone':
      'Sizda hali oʻquvchi profili yoʻq. Kursga yozilish, kurs sotib olish yoki natijangizni ulashishdan oldin u kerak — kurs har doim nomi koʻrsatilgan oʻquvchi uchun boʻladi va siz shu yoʻl bilan oʻquvchiga aylanasiz.',
    'account.selfFamilyInstead':
      'Agar oilaviy hisobni boshqarsangiz, buning oʻrniga oʻsha yerda oʻquvchi boʻlishingiz va boshidanoq oilaning bir qismi boʻlishingiz mumkin.',
    'account.selfClaimNote':
      'Bu ikkinchi hisob yaratmaydi. U sizni shu hisobga oʻquvchi sifatida qoʻshadi.',
    'account.formName': 'Koʻrinadigan ism',
    'account.formLanguage': 'Afzal koʻrilgan til kodi',
    'account.formLanguageNote':
      'Bu profilingiz bilan saqlanadi va hozircha hech narsa undan foydalanmaydi. Ushbu sahifalarning tili Til sahifasida tanlanadi va shu brauzerda saqlanadi.',
    'account.formZone': 'Vaqt mintaqasi',
    'account.formSave': 'Profilni saqlash',
    'account.formSaved': 'Profilingiz yangilandi.',
    'account.formFailed': 'Profilingizni saqlab boʻlmadi. Qayta urinib koʻring.',
    'account.formNameMissing': 'Odamlar koʻrishini istagan ismingizni yozing.',
    'account.formNameLong': 'Koʻrinadigan ism {count} ta belgidan oshmasin.',
    'account.formLanguageBad': 'en yoki en-GB kabi til kodidan foydalaning.',
    'account.formZoneLong': 'Vaqt mintaqasi {count} ta belgidan oshmasin.',
    'account.formZoneBad': 'Africa/Kampala kabi toʻgʻri IANA vaqt mintaqasidan foydalaning.',
    'account.formSignedOut': 'Siz hisobdan chiqqansiz. Qayta kiring, soʻng saqlang.',
    'account.formNotFound':
      'Profilingiz topilmadi. Hisobdan chiqib, qayta kiring, soʻng yana urinib koʻring.',
    'account.signInHeading': 'Qanday kirasiz',
    'account.signInBoth': 'Parol bilan yoki Google orqali kirishingiz mumkin.',
    'account.signInPassword': 'Siz elektron pochta manzili va parol bilan kirasiz.',
    'account.signInGoogle': 'Siz Google orqali kirasiz. Bu hisobda parol yoʻq.',
    'account.signInPhone': 'Siz telefoningizga yuborilgan kod bilan kirasiz.',
    'account.signInOther': 'Siz quyidagi orqali kirasiz: {methods}.',
    'account.signInNone': 'Bu hisob uchun hech qanday kirish usuli qayd etilmagan.',
    'account.signInUnread': 'Kirish usullaringizni hozir oʻqib boʻlmadi.',
    'account.resetBody':
      'Kirish elektron pochtangizga parolni tiklash uchun xavfsiz havola yuboring. Havola muddati autentifikatsiya provayderingiz sozlamalariga koʻra tugaydi.',
    'account.resetLink': 'Tiklash havolasini yuborish',
    'account.noPasswordGoogle':
      'Bu hisobda parol yoʻq, shuning uchun tiklanadigan narsa ham yoʻq — Google orqali kirishda davom eting.',
    'account.noPasswordPhone':
      'Bu hisob telefon kodi bilan kiradi, shuning uchun tiklanadigan parol yoʻq.',
    'account.mergeHeading': 'Ikki hisob, bir kishi',
    'account.mergeBody':
      'Agar ikki marta roʻyxatdan oʻtgan boʻlsangiz, hisoblarni birlashtirish mumkin. Siz saqlab qolgan hisob qoladi; ikkinchisi yopiladi va biror narsa koʻchirilishidan oldin ikkalasi ham rozi boʻlishi kerak.',
    'account.mergeWaiting': 'Kimdir bir hisobni shu hisobga birlashtirishni soʻramoqda.',
    'account.mergeNone': 'Bu hisobda hech narsa kutilmayapti.',
    'account.mergeLink': 'Hisoblarni birlashtirish',
    'account.mergeLinkWaiting': 'Hisoblarni birlashtirish (kutmoqda: {count})',
    'account.sponsorHeading': 'Homiylik oʻrinlari',
    'account.sponsorBody':
      'Kurs uchun boshqa kishi toʻlashi mumkin. Agar kurs qurbingiz yetmaydigan boʻlsa, oʻrin soʻrang yoki kutayotgan oʻrin uchun toʻlang — ikki tomon hech qachon bir-birining kimligini bilmaydi.',
    'account.sponsorMine': 'Men soʻragan va homiylik qilgan oʻrinlar',
    'account.sponsorWaiting': 'Kutayotgan oʻrinlar',
    'account.teachHeading': 'Bu yerda dars berish',
    'account.teachBody':
      'Dars berish tayinlov asosida boʻladi — hech kim roʻyxatdan oʻtish bilan oʻqituvchi boʻlib qolmaydi. Dars berishni istasangiz, malakangiz va oʻzingiz oʻtgan dars havolasini yuborishingiz mumkin, egasi uni oʻqiydi.',
    'account.teachLink': 'Dars berishga ariza topshirish',
    'account.inviteHeading': 'Doʻstni taklif qilish',
    'account.inviteBody':
      'Bu yerga yangi kelgan doʻstingiz birinchi kursiga chegirma oladi, uning toʻlovi pulni qaytarish muddatidan oʻtgach esa siz keyingi kursingizga chegirma olasiz. Ikkalasi ham pul emas, chegirma, shuning uchun toʻlab beriladigan narsa yoʻq.',
    'account.inviteLink': 'Taklif kodingiz',
    'account.shareHeading': 'Taʼlimimni ulashish',
    'account.shareBody':
      'Natijangiz va sertifikatlaringiz maxfiy, hatto oilangiz uchun ham. Kimnidir elektron pochta orqali taklif qiling, u taklifni oʻzi qabul qiladi; u nimani va qancha vaqt koʻrishini siz tanlaysiz va istagan paytda toʻxtatishingiz mumkin.',
    'account.shareLink': 'Taʼlimimni kim koʻra oladi',
    'account.readHeading': 'Oʻqish koʻrinishi',
    'account.readBody':
      'Matn oʻlchami, kontrast va harakat — tanlashingiz bilanoq shu brauzer uchun qoʻllanadi. Bu yerda hech narsani saqlash shart emas va sahifada boshqa hech narsa oʻzgarmaydi.',
    'account.readLink': 'Oʻqish sozlamalari',
    'account.termsBody':
      'Shartlar, maxfiylik bildirishnomasi va oʻqituvchilar uchun shartlar, har biri versiya raqami bilan.',
    'account.termsAgreed':
      'Siz rozi boʻlgan versiyalar rozilik bergan vaqtingiz bilan birga koʻrsatilgan.',
    'account.termsNone': 'Roziligingizni kutayotgan hech narsa yoʻq.',
    'account.termsLink': 'Ularni oʻqish',
    'account.instHeading': 'Mening muassasam',
    'account.instBody':
      'Siz mansub boʻlgan madrasa, maktab yoki tashkilot. Agar elektron pochta manzilingiz ulardan biri tasdiqlagan domenda boʻlsa, unga qoʻshilishingiz mumkin; qoʻshilganingizdan soʻng muassasa faqat oʻz odamlari sonini koʻradi, ismingizni yoki nimani oʻqiganingizni esa hech qachon koʻrmaydi.',
    'account.instLink': 'Men qayerga mansubman',
    'account.paidHeading': 'Men toʻlagan summalar',
    'account.paidBody':
      'Hisob-kitob hisobingizda amalga oshgan har bir toʻlov va qaytgan har bir pul, har bir valyuta boʻyicha joriy jami bilan. Siz soʻragan pul qaytarish amalda bajarilmaguncha alohida koʻrsatiladi, chunki soʻrash — olish degani emas.',
    'account.paidLink': 'Toʻlaganlarimni koʻrish',
    'account.toldHeading': 'Menga nima xabar qilinadi',
    'account.toldBody':
      'Platformadan kelgan xabarlar kiruvchi pochta yoki SMS orqali emas, bildirishnomalar markazingizda koʻrinadi — hozircha hech qanday yetkazib berish provayderi sozlanmagan.',
    'account.toldUnreadOne': 'Sizda {count} ta oʻqilmagan xabar bor.',
    'account.toldUnreadOther': 'Sizda {count} ta oʻqilmagan xabar bor.',
    'account.toldNone': 'Sizni kutayotgan hech narsa yoʻq.',
    'account.toldChoice':
      'Qaysi turlarini olishni oʻzingiz tanlaysiz, sizga tegishli pul yetib kelmagani haqidagi bildirishnomalar bundan mustasno: ular har doim keladi.',
    'account.toldLinkUnread': 'Bildirishnomalar ({count} ta oʻqilmagan)',
    'account.toldPrefs': 'Sizga nima xabar qilinishini tanlang',
    'account.dataHeading': 'Mening maʼlumotlarim',
    'account.dataBody':
      'Bu hisob haqida bizda saqlanayotgan hamma narsani bitta fayl qilib yuklab oling: profilingiz, siz masʼul boʻlgan oʻquvchilar, ular oʻqigan va tugatgan narsalar, sertifikatlaringiz, buyurtma va kvitansiyalaringiz, qaydlaringiz hamda taʼlimingizni kimlar bilan ulashganingiz.',
    'account.dataDownload': 'Maʼlumotlarimni yuklab olish',
    'account.dataSheet': 'Elektron jadval sifatida',
    'account.dataPrint': 'Oʻqish yoki chop etish',
    'account.dataMore':
      'Endi unda avvalgidan koʻproq narsa bor: muhokama xabarlari, sharhlar va tekshirilgan ishlar, yordam murojaatlari, sizga yuborilgan xabarlar va — agar dars bersangiz — daromadingiz va toʻlovlaringiz.',
    'account.dataWhat': 'Unda nima bor va nima kiritilmagan',
    'account.dataRestore':
      'Faylingiz allaqachon bormi? Profilingiz, qaydlaringiz va xatchoʻplaringizni siz yozilgan darslarga qaytarib qoʻyish mumkin; yozilishlar, sertifikatlar va buyurtmalarni esa mumkin emas, sababi oʻsha sahifada aytilgan.',
    'account.dataRestoreLink': 'Qaytarib qoʻyish',
    'account.closeHeading': 'Bu hisobni yopish',
    'account.closeBody':
      'Yopish profilingizni oʻzgartiradi, ayrim shaxsiy maʼlumotlarni olib tashlaydi va sizni hisobdan chiqarishga harakat qiladi. Buyurtmalar, toʻlovlar, yozilishlar va sertifikatlar saqlanadi, chunki pulni qaytarish yoki sertifikatni tekshirish uchun ular hali ham kerak, ayrim boshqa yozuvlar ham qoladi. Biror narsa sodir boʻlishidan oldin sahifa ikkala tomonni ham koʻrsatadi.',
    'account.closeLink': 'Bu hisobni yopish',
  },
  kk: {
    'account.lede':
      'Тіркелгіңіздің қалай көрінетінін басқарыңыз. Кіру мекенжайыңыз анықтама үшін көрсетілген және мұнда өзгертілмейді.',
    'account.status': 'Тіркелгі күйі: {status}',
    'account.statusActive': 'белсенді',
    'account.statusSuspended': 'тоқтатылған',
    'account.statusClosed': 'жабық',
    'account.owedHeading': 'Жалғастырмас бұрын',
    'account.owedOne': '{count} құжат келісіміңізді күтіп тұр.',
    'account.owedOther': '{count} құжат келісіміңізді күтіп тұр.',
    'account.owedBody':
      'Оқып, келісім беріңіз; келісім берген уақытыңыз тіркелгіңізде сақталады. Осы аралықта бұл беттегі басқа ештеңе шектелмейді.',
    'account.owedVersion': '{title} — {number}-нұсқа',
    'account.selfHeading': 'Өз атыңыздан оқу',
    'account.selfLearnsAs':
      'Бұл тіркелгі {name} атымен оқиды. Сіз тіркелген немесе сатып алған курстар сол оқушыға тиесілі, оған басқа ешкімнің ілгерілеуі араласпайды.',
    'account.selfInFamily':
      'Оқуыңыз отбасылық тіркелгінің ішінде, сондықтан бір отбасылық жоспар сізді балалармен бірге қамти алады. Мұны отбасы бетінде басқарасыз.',
    'account.selfOnOwn':
      'Оқуыңыз бөлек тұр. Отбасылық тіркелгіні басқарсаңыз, бір жоспар барлығын қамтуы үшін оны балалардың қасына көшіре аласыз — сол профиль, сол ілгерілеу.',
    'account.selfGo': 'Оқуыма өту',
    'account.selfJoinFamily': 'Отбасымның ішінде оқу',
    'account.selfWhoSees': 'Ілгерілеуімді кім көре алады',
    'account.selfNone':
      'Сізде әлі оқушы профилі жоқ. Курсқа тіркелу, курс сатып алу немесе ілгерілеуіңізбен бөлісу үшін алдымен ол қажет — курс әрқашан аты аталған оқушыға арналады, сіз оқушы осылай боласыз.',
    'account.selfFamilyInstead':
      'Отбасылық тіркелгіні басқарсаңыз, оның орнына сол жерде оқушы болып, басынан-ақ отбасының бір бөлігі бола аласыз.',
    'account.selfClaimNote':
      'Бұл екінші тіркелгі жасамайды. Сізді осы тіркелгіге оқушы ретінде қосады.',
    'account.formName': 'Көрсетілетін ат',
    'account.formLanguage': 'Қалаулы тіл коды',
    'account.formLanguageNote':
      'Бұл профиліңізбен бірге сақталады, әзірге оны ештеңе пайдаланбайды. Бұл беттердің тілі Тіл бетінде таңдалады және осы браузерде сақталады.',
    'account.formZone': 'Уақыт белдеуі',
    'account.formSave': 'Профильді сақтау',
    'account.formSaved': 'Профиліңіз жаңартылды.',
    'account.formFailed': 'Профиліңізді сақтау мүмкін болмады. Қайталап көріңіз.',
    'account.formNameMissing': 'Адамдар көрсін деген атыңызды жазыңыз.',
    'account.formNameLong': 'Көрсетілетін ат {count} таңбадан аспасын.',
    'account.formLanguageBad': 'en немесе en-GB сияқты тіл кодын пайдаланыңыз.',
    'account.formZoneLong': 'Уақыт белдеуі {count} таңбадан аспасын.',
    'account.formZoneBad': 'Africa/Kampala сияқты жарамды IANA уақыт белдеуін пайдаланыңыз.',
    'account.formSignedOut': 'Сіз жүйеден шығып кеткенсіз. Қайта кіріп, содан кейін сақтаңыз.',
    'account.formNotFound':
      'Профиліңіз табылмады. Шығып, қайта кіріңіз, содан кейін қайталап көріңіз.',
    'account.signInHeading': 'Қалай кіресіз',
    'account.signInBoth': 'Құпия сөзбен немесе Google арқылы кіре аласыз.',
    'account.signInPassword': 'Сіз электрондық пошта мекенжайы және құпия сөзбен кіресіз.',
    'account.signInGoogle': 'Сіз Google арқылы кіресіз. Бұл тіркелгіде құпия сөз жоқ.',
    'account.signInPhone': 'Сіз телефоныңызға жіберілген кодпен кіресіз.',
    'account.signInOther': 'Сіз мына арқылы кіресіз: {methods}.',
    'account.signInNone': 'Бұл тіркелгі үшін ешқандай кіру тәсілі тіркелмеген.',
    'account.signInUnread': 'Кіру тәсілдеріңізді дәл қазір оқу мүмкін болмады.',
    'account.resetBody':
      'Кіру электрондық поштаңызға құпия сөзді қалпына келтірудің қауіпсіз сілтемесін жіберіңіз. Сілтеменің мерзімі аутентификация провайдеріңіздің баптауларына сай аяқталады.',
    'account.resetLink': 'Қалпына келтіру сілтемесін жіберу',
    'account.noPasswordGoogle':
      'Бұл тіркелгіде құпия сөз жоқ, сондықтан қалпына келтіретін ештеңе жоқ — кіру үшін Google-ды пайдалана беріңіз.',
    'account.noPasswordPhone':
      'Бұл тіркелгі телефон кодымен кіреді, сондықтан қалпына келтіретін құпия сөз жоқ.',
    'account.mergeHeading': 'Екі тіркелгі, бір адам',
    'account.mergeBody':
      'Егер екі рет тіркелген болсаңыз, тіркелгілерді біріктіруге болады. Сіз қалдырған тіркелгі сақталады; екіншісі жабылады, және бірдеңе көшірілмес бұрын екеуі де келісуі керек.',
    'account.mergeWaiting': 'Біреу бір тіркелгіні осы тіркелгіге біріктіруді сұрап отыр.',
    'account.mergeNone': 'Бұл тіркелгіде күтіп тұрған ештеңе жоқ.',
    'account.mergeLink': 'Тіркелгілерді біріктіру',
    'account.mergeLinkWaiting': 'Тіркелгілерді біріктіру (күтуде: {count})',
    'account.sponsorHeading': 'Демеушілік орындар',
    'account.sponsorBody':
      'Курс ақысын басқа біреу төлей алады. Курс қолыңыз жетпейтін болса, орын сұраңыз немесе күтіп тұрған орынның ақысын төлеңіз — екі тарап бір-бірінің кім екенін ешқашан білмейді.',
    'account.sponsorMine': 'Мен сұраған және демеушілік жасаған орындар',
    'account.sponsorWaiting': 'Күтіп тұрған орындар',
    'account.teachHeading': 'Осында сабақ беру',
    'account.teachBody':
      'Сабақ беру тағайындау арқылы жүреді — ешкім тіркелу арқылы мұғалім болмайды. Сабақ бергіңіз келсе, біліктілігіңізді және өзіңіз өткізген сабақтың сілтемесін жібере аласыз, иесі оны оқиды.',
    'account.teachLink': 'Сабақ беруге өтінім беру',
    'account.inviteHeading': 'Досыңызды шақыру',
    'account.inviteBody':
      'Мұнда жаңадан келген досыңыз алғашқы курсына жеңілдік алады, ал оның төлемі ақшаны қайтару мерзімінен өткен соң сіз келесі курсыңызға жеңілдік аласыз. Екеуі де ақша емес, жеңілдік, сондықтан төленетін ештеңе жоқ.',
    'account.inviteLink': 'Шақыру кодыңыз',
    'account.shareHeading': 'Оқуыммен бөлісу',
    'account.shareBody':
      'Ілгерілеуіңіз бен сертификаттарыңыз жеке, тіпті отбасыңыз үшін де. Біреуді электрондық пошта арқылы шақырыңыз, ол шақыруды өзі қабылдайды; оның нені және қанша уақыт көретінін сіз таңдайсыз, және кез келген уақытта тоқтата аласыз.',
    'account.shareLink': 'Оқуымды кім көре алады',
    'account.readHeading': 'Оқу көрінісі',
    'account.readBody':
      'Мәтін өлшемі, контраст және қозғалыс — таңдаған сәтте осы браузер үшін қолданылады. Мұнда ештеңені сақтаудың қажеті жоқ, бетте басқа ештеңе өзгермейді.',
    'account.readLink': 'Оқу баптаулары',
    'account.termsBody':
      'Шарттар, құпиялылық хабарламасы және мұғалімдерге арналған шарттар, әрқайсысы нұсқа нөмірімен.',
    'account.termsAgreed': 'Сіз келіскен нұсқалар келісім берген уақытыңызбен бірге тізімделген.',
    'account.termsNone': 'Келісіміңізді күтіп тұрған ештеңе жоқ.',
    'account.termsLink': 'Оларды оқу',
    'account.instHeading': 'Менің мекемем',
    'account.instBody':
      'Сіз мүше болып табылатын медресе, мектеп немесе ұйым. Егер электрондық пошта мекенжайыңыз солардың бірі растаған доменде болса, оған қосыла аласыз; қосылғаннан кейін мекеме тек өз адамдарының санын көреді, ал атыңызды немесе не оқығаныңызды ешқашан көрмейді.',
    'account.instLink': 'Мен қайда мүшемін',
    'account.paidHeading': 'Менің төлегендерім',
    'account.paidBody':
      'Төлем тіркелгіңізде жасалған әрбір төлем және қайтарылған әрбір ақша, әр валюта бойынша ағымдағы жиынтығымен. Сіз сұраған ақша қайтару нақты орындалғанша бөлек тізімделеді, өйткені сұрау — алу емес.',
    'account.paidLink': 'Төлегендерімді көру',
    'account.toldHeading': 'Маған не хабарланады',
    'account.toldBody':
      'Платформадан келген хабарлар кіріс поштасында немесе SMS-те емес, хабарламалар орталығыңызда көрінеді — әзірге ешқандай жеткізу провайдері бапталмаған.',
    'account.toldUnreadOne': 'Сізде {count} оқылмаған хабар бар.',
    'account.toldUnreadOther': 'Сізде {count} оқылмаған хабар бар.',
    'account.toldNone': 'Сізді күтіп тұрған ештеңе жоқ.',
    'account.toldChoice':
      'Қай түрлерін алғыңыз келетінін өзіңіз таңдайсыз, тек сізге тиесілі ақшаның жетпегені туралы хабарламалардан басқа: олар әрқашан келеді.',
    'account.toldLinkUnread': 'Хабарламалар ({count} оқылмаған)',
    'account.toldPrefs': 'Сізге не хабарланатынын таңдаңыз',
    'account.dataHeading': 'Менің деректерім',
    'account.dataBody':
      'Осы тіркелгі туралы бізде сақталғанның бәрін бір файл етіп жүктеп алыңыз: профиліңіз, сіз жауапты оқушылар, олардың оқығаны мен аяқтағаны, сертификаттарыңыз, тапсырыстарыңыз бен түбіртектеріңіз, жазбаларыңыз және оқуыңызбен кіммен бөліскеніңіз.',
    'account.dataDownload': 'Деректерімді жүктеп алу',
    'account.dataSheet': 'Электрондық кесте ретінде',
    'account.dataPrint': 'Оқу немесе басып шығару',
    'account.dataMore':
      'Енді онда бұрынғыдан көбірек нәрсе бар: талқылау жазбалары, пікірлер мен тексерілген жұмыстар, қолдау өтініштері, сізге жіберілген хабарлар және — егер сабақ берсеңіз — табысыңыз бен төлемдеріңіз.',
    'account.dataWhat': 'Онда не бар және не қосылмаған',
    'account.dataRestore':
      'Файлыңыз бар ма? Профиліңізді, жазбаларыңыз бен бетбелгілеріңізді сіз тіркелген сабақтарға қайта қоюға болады; тіркелулерді, сертификаттар мен тапсырыстарды қоюға болмайды, себебі сол бетте айтылған.',
    'account.dataRestoreLink': 'Қайта қою',
    'account.closeHeading': 'Осы тіркелгіні жабу',
    'account.closeBody':
      'Жабу профиліңізді өзгертеді, кейбір жеке деректерді жояды және сізді жүйеден шығаруға тырысады. Тапсырыстар, төлемдер, тіркелулер мен сертификаттар сақталады, өйткені ақшаны қайтару немесе сертификатты тексеру үшін олар әлі де қажет, кейбір басқа жазбалар да қалады. Бірдеңе болмас бұрын бет екі жағын да тізіп көрсетеді.',
    'account.closeLink': 'Осы тіркелгіні жабу',
  },
  az: {
    'account.lede':
      'Hesabınızın necə göründüyünü idarə edin. Giriş ünvanınız məlumat üçün göstərilir və burada dəyişdirilmir.',
    'account.status': 'Hesabın vəziyyəti: {status}',
    'account.statusActive': 'aktiv',
    'account.statusSuspended': 'dayandırılıb',
    'account.statusClosed': 'bağlı',
    'account.owedHeading': 'Davam etməzdən əvvəl',
    'account.owedOne': '{count} sənəd razılığınızı gözləyir.',
    'account.owedOther': '{count} sənəd razılığınızı gözləyir.',
    'account.owedBody':
      'Oxuyun və razılaşın; razılaşdığınız vaxt hesabınızda saxlanılır. Bu müddətdə bu səhifədəki başqa heç nə məhdudlaşdırılmır.',
    'account.owedVersion': '{title} — versiya {number}',
    'account.selfHeading': 'Öz adınızdan öyrənmək',
    'account.selfLearnsAs':
      'Bu hesab {name} adı ilə öyrənir. Yazıldığınız və ya aldığınız kurslar həmin öyrənənə məxsusdur və başqa heç kimin irəliləyişi ona qarışmır.',
    'account.selfInFamily':
      'Təhsiliniz ailə hesabının içindədir, ona görə bir ailə planı sizi uşaqlarla birlikdə əhatə edə bilər. Bunu ailə səhifəsində idarə edirsiniz.',
    'account.selfOnOwn':
      'Təhsiliniz ayrıca dayanır. Ailə hesabını idarə edirsinizsə, bir planın hamını əhatə etməsi üçün onu uşaqların yanına köçürə bilərsiniz — eyni profil, eyni irəliləyiş.',
    'account.selfGo': 'Təhsilimə keç',
    'account.selfJoinFamily': 'Ailəmin içində öyrən',
    'account.selfWhoSees': 'İrəliləyişimi kim görə bilər',
    'account.selfNone':
      'Hələ öyrənən profiliniz yoxdur. Kursa yazılmaq, kurs almaq və ya irəliləyişinizi paylaşmaq üçün əvvəlcə o lazımdır — kurs həmişə adı məlum olan öyrənən üçündür və siz belə öyrənən olursunuz.',
    'account.selfFamilyInstead':
      'Ailə hesabını idarə edirsinizsə, bunun əvəzinə orada öyrənən ola və əvvəldən ailənin bir hissəsi ola bilərsiniz.',
    'account.selfClaimNote': 'Bu, ikinci hesab yaratmır. Sizi bu hesaba öyrənən kimi əlavə edir.',
    'account.formName': 'Görünən ad',
    'account.formLanguage': 'Üstünlük verilən dilin kodu',
    'account.formLanguageNote':
      'Bu, profilinizlə birlikdə saxlanılır və hələ heç nə ondan istifadə etmir. Bu səhifələrin dili Dil səhifəsində seçilir və bu brauzerdə saxlanılır.',
    'account.formZone': 'Saat qurşağı',
    'account.formSave': 'Profili yadda saxla',
    'account.formSaved': 'Profiliniz yeniləndi.',
    'account.formFailed': 'Profilinizi yadda saxlamaq mümkün olmadı. Yenidən cəhd edin.',
    'account.formNameMissing': 'İnsanların görməsini istədiyiniz adı əlavə edin.',
    'account.formNameLong': 'Görünən ad {count} simvoldan çox olmasın.',
    'account.formLanguageBad': 'en və ya en-GB kimi dil kodundan istifadə edin.',
    'account.formZoneLong': 'Saat qurşağı {count} simvoldan çox olmasın.',
    'account.formZoneBad': 'Africa/Kampala kimi etibarlı IANA saat qurşağından istifadə edin.',
    'account.formSignedOut': 'Hesabdan çıxmısınız. Yenidən daxil olun, sonra yadda saxlayın.',
    'account.formNotFound':
      'Profiliniz tapılmadı. Çıxıb yenidən daxil olun, sonra bir daha cəhd edin.',
    'account.signInHeading': 'Necə daxil olursunuz',
    'account.signInBoth': 'Şifrə ilə və ya Google ilə daxil ola bilərsiniz.',
    'account.signInPassword': 'E-poçt ünvanınız və şifrə ilə daxil olursunuz.',
    'account.signInGoogle': 'Google ilə daxil olursunuz. Bu hesabda şifrə yoxdur.',
    'account.signInPhone': 'Telefonunuza göndərilən kodla daxil olursunuz.',
    'account.signInOther': 'Bununla daxil olursunuz: {methods}.',
    'account.signInNone': 'Bu hesab üçün heç bir giriş üsulu qeyd olunmayıb.',
    'account.signInUnread': 'Giriş üsullarınızı indi oxumaq mümkün olmadı.',
    'account.resetBody':
      'Giriş e-poçtunuza şifrəni sıfırlamaq üçün təhlükəsiz keçid göndərin. Keçidin müddəti autentifikasiya provayderinizin ayarlarına uyğun bitir.',
    'account.resetLink': 'Sıfırlama keçidini göndər',
    'account.noPasswordGoogle':
      'Bu hesabda şifrə yoxdur, ona görə sıfırlanacaq bir şey də yoxdur — daxil olmaq üçün Google-dan istifadə etməyə davam edin.',
    'account.noPasswordPhone':
      'Bu hesab telefon kodu ilə daxil olur, ona görə sıfırlanacaq şifrə yoxdur.',
    'account.mergeHeading': 'İki hesab, bir nəfər',
    'account.mergeBody':
      'İki dəfə qeydiyyatdan keçmisinizsə, hesabları birləşdirmək olar. Saxladığınız hesab qalır; digəri bağlanır və nəsə köçürülməzdən əvvəl hər ikisi razılaşmalıdır.',
    'account.mergeWaiting': 'Kimsə bir hesabı bu hesabla birləşdirməyi xahiş edir.',
    'account.mergeNone': 'Bu hesabda heç nə gözləmir.',
    'account.mergeLink': 'Hesabların birləşdirilməsi',
    'account.mergeLinkWaiting': 'Hesabların birləşdirilməsi (gözləyən: {count})',
    'account.sponsorHeading': 'Sponsorlu yerlər',
    'account.sponsorBody':
      'Kursun haqqını başqa biri ödəyə bilər. Kurs imkanınızdan kənardırsa, yer istəyin və ya gözləyən bir yerin haqqını ödəyin — iki tərəf heç vaxt bir-birinin kim olduğunu bilmir.',
    'account.sponsorMine': 'İstədiklərim və sponsorluq etdiklərim',
    'account.sponsorWaiting': 'Gözləyən yerlər',
    'account.teachHeading': 'Burada dərs demək',
    'account.teachBody':
      'Dərs demək təyinatla olur — heç kim qeydiyyatdan keçməklə müəllim olmur. Dərs demək istəyirsinizsə, ixtisas sənədlərinizi və keçdiyiniz bir dərsin keçidini göndərə bilərsiniz, sahib onu oxuyur.',
    'account.teachLink': 'Dərs demək üçün müraciət et',
    'account.inviteHeading': 'Dost dəvət et',
    'account.inviteBody':
      'Buraya yeni gələn dostunuz ilk kursuna endirim alır, onun ödənişi geri qaytarma müddətini keçdikdən sonra isə siz növbəti kursunuza endirim alırsınız. Hər ikisi pul deyil, endirimdir, ona görə ödəniləcək heç nə yoxdur.',
    'account.inviteLink': 'Dəvət kodunuz',
    'account.shareHeading': 'Təhsilimi paylaşmaq',
    'account.shareBody':
      'İrəliləyişiniz və sertifikatlarınız məxfidir, hətta ailəniz üçün də. Kimisə e-poçtla dəvət edin, o, dəvəti özü qəbul edir; onun nəyi və nə qədər müddətə görəcəyini siz seçirsiniz və istədiyiniz vaxt bitirə bilərsiniz.',
    'account.shareLink': 'Təhsilimi kim görə bilər',
    'account.readHeading': 'Oxu görünüşü',
    'account.readBody':
      'Mətnin ölçüsü, kontrast və hərəkət — seçdiyiniz anda bu brauzer üçün tətbiq olunur. Burada heç nəyi yadda saxlamaq lazım deyil və səhifədə başqa heç nə dəyişmir.',
    'account.readLink': 'Oxu seçimləri',
    'account.termsBody':
      'Şərtlər, məxfilik bildirişi və müəllimlər üçün şərtlər, hər biri versiya nömrəsi ilə.',
    'account.termsAgreed': 'Razılaşdığınız versiyalar razılaşdığınız vaxtla birlikdə sadalanır.',
    'account.termsNone': 'Razılığınızı gözləyən heç nə yoxdur.',
    'account.termsLink': 'Onları oxu',
    'account.instHeading': 'Mənim qurumum',
    'account.instBody':
      'Mənsub olduğunuz mədrəsə, məktəb və ya təşkilat. E-poçt ünvanınız onlardan birinin təsdiqlədiyi domendədirsə, ona qoşula bilərsiniz; qoşulduqdan sonra qurum yalnız öz adamlarının sayını görür, adınızı və ya nə oxuduğunuzu isə heç vaxt görmür.',
    'account.instLink': 'Hara mənsubam',
    'account.paidHeading': 'Ödədiklərim',
    'account.paidBody':
      'Ödəniş hesabınızda baş vermiş hər ödəniş və geri qayıtmış hər məbləğ, hər valyuta üzrə cari cəmlə birlikdə. İstədiyiniz geri qaytarma həqiqətən baş verənə qədər ayrıca sadalanır, çünki istəmək almaq deyil.',
    'account.paidLink': 'Ödədiklərimə bax',
    'account.toldHeading': 'Mənə nə bildirilir',
    'account.toldBody':
      'Platformadan gələn mesajlar gələnlər qutusunda və ya SMS-də deyil, bildiriş mərkəzinizdə görünür — hələ heç bir çatdırılma provayderi qurulmayıb.',
    'account.toldUnreadOne': '{count} oxunmamış mesajınız var.',
    'account.toldUnreadOther': '{count} oxunmamış mesajınız var.',
    'account.toldNone': 'Sizi gözləyən heç nə yoxdur.',
    'account.toldChoice':
      'Hansı növləri istədiyinizi özünüz seçirsiniz, sizə çatmalı olan pulun gəlmədiyi barədə bildirişlər istisnadır: onlar həmişə gəlir.',
    'account.toldLinkUnread': 'Bildirişlər ({count} oxunmamış)',
    'account.toldPrefs': 'Sizə nə bildiriləcəyini seçin',
    'account.dataHeading': 'Məlumatlarım',
    'account.dataBody':
      'Bu hesab haqqında saxladığımız hər şeyi bir fayl kimi endirin: profiliniz, cavabdeh olduğunuz öyrənənlər, onların oxuduqları və bitirdikləri, sertifikatlarınız, sifarişləriniz və qəbzləriniz, qeydləriniz və təhsilinizi kimlərlə paylaşdığınız.',
    'account.dataDownload': 'Məlumatlarımı endir',
    'account.dataSheet': 'Cədvəl kimi',
    'account.dataPrint': 'Oxu və ya çap et',
    'account.dataMore':
      'İndi orada əvvəlkindən daha çox şey var: müzakirə yazıları, rəylər və yoxlanılmış işlər, dəstək müraciətləri, sizə göndərilən mesajlar və — dərs deyirsinizsə — qazancınız və ödənişləriniz.',
    'account.dataWhat': 'Orada nə var və nə kənarda qalıb',
    'account.dataRestore':
      'Artıq faylınız var? Profiliniz, qeydləriniz və əlfəcinləriniz yazıldığınız dərslərə geri qoyula bilər; yazılışlar, sertifikatlar və sifarişlər isə qoyula bilməz və həmin səhifə səbəbini deyir.',
    'account.dataRestoreLink': 'Geri qoy',
    'account.closeHeading': 'Bu hesabı bağlamaq',
    'account.closeBody':
      'Bağlamaq profilinizi dəyişdirir, bəzi şəxsi məlumatları silir və sizi hesabdan çıxarmağa çalışır. Sifarişlər, ödənişlər, yazılışlar və sertifikatlar saxlanılır, çünki geri qaytarma və ya sertifikatın yoxlanması hələ də onlara ehtiyac duyur, bəzi başqa qeydlər də qalır. Nəsə baş verməzdən əvvəl səhifə hər iki tərəfi sadalayır.',
    'account.closeLink': 'Bu hesabı bağla',
  },
  tg: {
    'account.lede':
      'Тарзи намоиши ҳисоби худро идора кунед. Суроғаи воридшавии шумо танҳо барои маълумот нишон дода шудааст ва дар ин ҷо тағйир дода намешавад.',
    'account.status': 'Ҳолати ҳисоб: {status}',
    'account.statusActive': 'фаъол',
    'account.statusSuspended': 'боздошта',
    'account.statusClosed': 'баста',
    'account.owedHeading': 'Пеш аз идома',
    'account.owedOne': '{count} ҳуҷҷат мунтазири розигии шумост.',
    'account.owedOther': '{count} ҳуҷҷат мунтазири розигии шумост.',
    'account.owedBody':
      'Хонед ва розӣ шавед; вақти розигии шумо дар ҳисобатон нигоҳ дошта мешавад. Дар ин миён ҳеҷ чизи дигари ин саҳифа маҳдуд намешавад.',
    'account.owedVersion': '{title} — нусхаи {number}',
    'account.selfHeading': 'Омӯзиш аз номи худ',
    'account.selfLearnsAs':
      'Ин ҳисоб бо номи {name} меомӯзад. Курсҳое, ки шумо ба онҳо номнавис мешавед ё мехаред, ба ҳамин хонанда тааллуқ доранд ва пешрафти ҳеҷ каси дигар ба он омехта намешавад.',
    'account.selfInFamily':
      'Таълими шумо дар дохили ҳисоби оилавӣ аст, бинобар ин як нақшаи оилавӣ метавонад шуморо ҳамроҳи фарзандон фаро гирад. Инро дар саҳифаи оила идора мекунед.',
    'account.selfOnOwn':
      'Таълими шумо алоҳида аст. Агар ҳисоби оилавиро идора кунед, метавонед онро ба паҳлуи фарзандон гузаронед, то як нақша ҳамаро фаро гирад — ҳамон профил, ҳамон пешрафт.',
    'account.selfGo': 'Ба таълими ман гузаштан',
    'account.selfJoinFamily': 'Дар дохили оилаи ман омӯхтан',
    'account.selfWhoSees': 'Пешрафти маро кӣ дида метавонад',
    'account.selfNone':
      'Шумо ҳоло профили хонанда надоред. Пеш аз номнавис шудан ба курс, харидани курс ё мубодилаи пешрафти худ он лозим аст — курс ҳамеша барои хонандаи номбаршуда аст ва шумо ҳамин тавр хонанда мешавед.',
    'account.selfFamilyInstead':
      'Агар ҳисоби оилавиро идора кунед, метавонед ба ҷои ин дар он ҷо хонанда шавед ва аз аввал узви оила бошед.',
    'account.selfClaimNote':
      'Ин ҳисоби дуюм намесозад. Он шуморо ба ҳамин ҳисоб ҳамчун хонанда илова мекунад.',
    'account.formName': 'Номи намоишӣ',
    'account.formLanguage': 'Рамзи забони дилхоҳ',
    'account.formLanguageNote':
      'Ин бо профили шумо нигоҳ дошта мешавад ва ҳоло ҳеҷ чиз онро истифода намебарад. Забони ин саҳифаҳо дар саҳифаи Забон интихоб мешавад ва дар ҳамин браузер нигоҳ дошта мешавад.',
    'account.formZone': 'Минтақаи вақт',
    'account.formSave': 'Нигоҳ доштани профил',
    'account.formSaved': 'Профили шумо нав карда шуд.',
    'account.formFailed': 'Профили шуморо нигоҳ доштан муяссар нашуд. Аз нав кӯшиш кунед.',
    'account.formNameMissing': 'Номеро нависед, ки мехоҳед дигарон бубинанд.',
    'account.formNameLong': 'Номи намоишӣ аз {count} аломат зиёд набошад.',
    'account.formLanguageBad': 'Рамзи забонро ба мисли en ё en-GB истифода баред.',
    'account.formZoneLong': 'Минтақаи вақт аз {count} аломат зиёд набошад.',
    'account.formZoneBad': 'Минтақаи вақти дурусти IANA-ро истифода баред, масалан Africa/Kampala.',
    'account.formSignedOut': 'Шумо аз ҳисоб баромадаед. Аз нав ворид шавед, баъд нигоҳ доред.',
    'account.formNotFound':
      'Профили шумо ёфт нашуд. Аз ҳисоб бароед ва дубора ворид шавед, баъд аз нав кӯшиш кунед.',
    'account.signInHeading': 'Шумо чӣ тавр ворид мешавед',
    'account.signInBoth': 'Шумо метавонед бо рамз ё тавассути Google ворид шавед.',
    'account.signInPassword': 'Шумо бо суроғаи почтаи электронӣ ва рамз ворид мешавед.',
    'account.signInGoogle': 'Шумо тавассути Google ворид мешавед. Дар ин ҳисоб рамз нест.',
    'account.signInPhone': 'Шумо бо коде, ки ба телефонатон фиристода мешавад, ворид мешавед.',
    'account.signInOther': 'Шумо тавассути ин ворид мешавед: {methods}.',
    'account.signInNone': 'Барои ин ҳисоб ягон усули воридшавӣ сабт нашудааст.',
    'account.signInUnread': 'Усулҳои воридшавии шуморо ҳозир хондан муяссар нашуд.',
    'account.resetBody':
      'Ба почтаи электронии воридшавии худ пайванди бехатари барқарорсозии рамзро фиристед. Мӯҳлати пайванд мувофиқи танзимоти провайдери тасдиқи ҳувияти шумо ба охир мерасад.',
    'account.resetLink': 'Фиристодани пайванди барқарорсозӣ',
    'account.noPasswordGoogle':
      'Дар ин ҳисоб рамз нест, бинобар ин чизе барои барқарор кардан нест — воридшавиро тавассути Google идома диҳед.',
    'account.noPasswordPhone':
      'Ин ҳисоб бо коди телефон ворид мешавад, бинобар ин рамзе барои барқарор кардан нест.',
    'account.mergeHeading': 'Ду ҳисоб, як шахс',
    'account.mergeBody':
      'Агар ду бор сабти ном карда бошед, ҳисобҳоро якҷоя кардан мумкин аст. Ҳисобе, ки нигоҳ медоред, боқӣ мемонад; дигараш баста мешавад ва пеш аз интиқоли ягон чиз ҳар ду бояд розӣ шаванд.',
    'account.mergeWaiting': 'Касе хоҳиш дорад, ки як ҳисоб бо ин ҳисоб якҷоя карда шавад.',
    'account.mergeNone': 'Дар ин ҳисоб ҳеҷ чиз мунтазир нест.',
    'account.mergeLink': 'Якҷоя кардани ҳисобҳо',
    'account.mergeLinkWaiting': 'Якҷоя кардани ҳисобҳо (мунтазир: {count})',
    'account.sponsorHeading': 'Ҷойҳои сарпарастӣ',
    'account.sponsorBody':
      'Ҳаққи курсро каси дигар пардохта метавонад. Агар курс аз имкони шумо берун бошад, ҷой дархост кунед ё ҳаққи ҷойи мунтазирро пардозед — ду тараф ҳеҷ гоҳ намедонанд, ки тарафи дигар кист.',
    'account.sponsorMine': 'Он чи ман дархост кардам ва сарпарастӣ кардам',
    'account.sponsorWaiting': 'Ҷойҳои мунтазир',
    'account.teachHeading': 'Дар ин ҷо дарс додан',
    'account.teachBody':
      'Дарс додан бо таъинот аст — ҳеҷ кас бо сабти ном муаллим намешавад. Агар дарс додан хоҳед, метавонед тахассуси худ ва пайванди дарсеро, ки додаед, фиристед ва соҳиб онро мехонад.',
    'account.teachLink': 'Барои дарс додан ариза додан',
    'account.inviteHeading': 'Даъвати дӯст',
    'account.inviteBody':
      'Дӯсте, ки ба ин ҷо нав омадааст, барои курси аввалаш тахфиф мегирад ва шумо пас аз он ки пардохти ӯ аз мӯҳлати баргардонидани маблағ гузашт, барои курси навбатии худ тахфиф мегиред. Ҳар ду тахфиф аст, на пул, бинобар ин чизе пардохта намешавад.',
    'account.inviteLink': 'Рамзи даъвати шумо',
    'account.shareHeading': 'Мубодилаи таълими ман',
    'account.shareBody':
      'Пешрафт ва шаҳодатномаҳои шумо хусусӣ мебошанд, ҳатто барои оилаатон. Касеро тавассути почтаи электронӣ даъват кунед ва ӯ худаш онро қабул мекунад; шумо интихоб мекунед, ки ӯ чиро ва то кай бубинад, ва ҳар вақте хоҳед, метавонед онро қатъ кунед.',
    'account.shareLink': 'Таълими маро кӣ дида метавонад',
    'account.readHeading': 'Намуди хониш',
    'account.readBody':
      'Андозаи матн, тазод ва ҳаракат — ҳамон лаҳзае, ки интихоб мекунед, барои ин браузер татбиқ мешавад. Дар ин ҷо ҳеҷ чизро нигоҳ доштан лозим нест ва дар саҳифа чизи дигаре тағйир намеёбад.',
    'account.readLink': 'Танзимоти хониш',
    'account.termsBody':
      'Шартҳо, огоҳиномаи махфият ва шартҳо барои муаллимон, ҳар кадом бо рақами нусха.',
    'account.termsAgreed':
      'Нусхаҳое, ки шумо бо онҳо розӣ шудаед, бо вақти розигиатон номбар шудаанд.',
    'account.termsNone': 'Ҳеҷ чиз мунтазири розигии шумо нест.',
    'account.termsLink': 'Хондани онҳо',
    'account.instHeading': 'Муассисаи ман',
    'account.instBody':
      'Мадраса, мактаб ё ташкилоте, ки шумо ба он тааллуқ доред. Агар суроғаи почтаи электронии шумо дар домене бошад, ки яке аз онҳо тасдиқ кардааст, метавонед ба он ҳамроҳ шавед; пас аз ҳамроҳ шудан муассиса танҳо шумораи одамони худро мебинад ва ҳеҷ гоҳ номи шумо ё он чиро, ки омӯхтаед, намебинад.',
    'account.instLink': 'Ман ба куҷо тааллуқ дорам',
    'account.paidHeading': 'Он чи ман пардохтаам',
    'account.paidBody':
      'Ҳар пардохте, ки дар ҳисоби пардохти шумо анҷом ёфтааст, ва ҳар маблағе, ки баргаштааст, бо ҷамъи ҷорӣ барои ҳар асъор. Баргардонидани маблағе, ки шумо дархост кардаед, то воқеан анҷом ёфтанаш алоҳида номбар мешавад, зеро дархост кардан гирифтан нест.',
    'account.paidLink': 'Дидани он чи ман пардохтаам',
    'account.toldHeading': 'Ба ман чӣ хабар дода мешавад',
    'account.toldBody':
      'Паёмҳои платформа дар маркази огоҳиномаҳои шумо пайдо мешаванд, на дар қуттии почта ё паёми матнӣ — ҳоло ягон провайдери расонидан танзим нашудааст.',
    'account.toldUnreadOne': 'Шумо {count} паёми нохонда доред.',
    'account.toldUnreadOther': 'Шумо {count} паёми нохонда доред.',
    'account.toldNone': 'Ҳеҷ чиз мунтазири шумо нест.',
    'account.toldChoice':
      'Шумо интихоб мекунед, ки кадом навъҳоро мехоҳед, ба ҷуз огоҳиномаҳо дар бораи он ки пули ба шумо тааллуқдошта нарасид: онҳо ҳамеша меоянд.',
    'account.toldLinkUnread': 'Огоҳиномаҳо ({count} нохонда)',
    'account.toldPrefs': 'Интихоб кунед, ки ба шумо чӣ хабар дода шавад',
    'account.dataHeading': 'Маълумоти ман',
    'account.dataBody':
      'Ҳама чизеро, ки мо дар бораи ин ҳисоб нигоҳ медорем, ҳамчун як файл боргирӣ кунед: профили шумо, хонандагоне, ки шумо барояшон масъул ҳастед, он чи онҳо омӯхтаанд ва ба анҷом расонидаанд, шаҳодатномаҳо, фармоишҳо ва расидҳои шумо, қайдҳои шумо ва онҳое, ки таълими худро бо онҳо мубодила кардаед.',
    'account.dataDownload': 'Боргирии маълумоти ман',
    'account.dataSheet': 'Ҳамчун ҷадвали электронӣ',
    'account.dataPrint': 'Хондан ё чоп кардан',
    'account.dataMore':
      'Акнун дар он аз пештара бештар чиз ҳаст: навиштаҳои муҳокима, тақризҳо ва корҳои санҷидашуда, муроҷиатҳои дастгирӣ, паёмҳои ба шумо фиристодашуда ва — агар дарс диҳед — даромад ва пардохтҳои шумо.',
    'account.dataWhat': 'Дар он чӣ ҳаст ва чӣ берун мондааст',
    'account.dataRestore':
      'Аллакай файл доред? Профил, қайдҳо ва хатчӯбҳои шуморо ба дарсҳое, ки ба онҳо номнавис ҳастед, баргардондан мумкин аст; номнависиҳо, шаҳодатномаҳо ва фармоишҳоро мумкин нест ва он саҳифа сабабашро мегӯяд.',
    'account.dataRestoreLink': 'Баргардондан',
    'account.closeHeading': 'Бастани ин ҳисоб',
    'account.closeBody':
      'Бастан профили шуморо тағйир медиҳад, баъзе маълумоти шахсиро мебардорад ва мекӯшад шуморо аз ҳисоб барорад. Фармоишҳо, пардохтҳо, номнависиҳо ва шаҳодатномаҳо нигоҳ дошта мешаванд, зеро баргардонидани маблағ ё санҷиши шаҳодатнома ҳанӯз ба онҳо ниёз дорад, баъзе сабтҳои дигар низ боқӣ мемонанд. Саҳифа пеш аз рух додани ягон чиз ҳар ду тарафро номбар мекунад.',
    'account.closeLink': 'Бастани ин ҳисоб',
  },
  ky: {
    'account.lede':
      'Аккаунтуңуздун кандай көрүнөрүн башкарыңыз. Кирүү дарегиңиз маалымат үчүн көрсөтүлгөн жана бул жерде өзгөртүлбөйт.',
    'account.status': 'Аккаунттун абалы: {status}',
    'account.statusActive': 'активдүү',
    'account.statusSuspended': 'токтотулган',
    'account.statusClosed': 'жабык',
    'account.owedHeading': 'Улантуудан мурун',
    'account.owedOne': '{count} документ макулдугуңузду күтүп турат.',
    'account.owedOther': '{count} документ макулдугуңузду күтүп турат.',
    'account.owedBody':
      'Окуп, макулдук бериңиз; макулдук берген убактыңыз аккаунтуңузда сакталат. Ал арада бул барактагы башка эч нерсе чектелбейт.',
    'account.owedVersion': '{title} — {number}-версия',
    'account.selfHeading': 'Өз атыңыздан окуу',
    'account.selfLearnsAs':
      'Бул аккаунт {name} аты менен окуйт. Сиз катталган же сатып алган курстар ошол окуучуга таандык жана ага башка эч кимдин жылышы аралашпайт.',
    'account.selfInFamily':
      'Окууңуз үй-бүлөлүк аккаунттун ичинде, ошондуктан бир үй-бүлөлүк план сизди балдар менен кошо камтый алат. Муну үй-бүлө барагында башкарасыз.',
    'account.selfOnOwn':
      'Окууңуз өзүнчө турат. Үй-бүлөлүк аккаунтту башкарсаңыз, бир план баарын камтышы үчүн аны балдардын жанына көчүрө аласыз — ошол эле профиль, ошол эле жылыш.',
    'account.selfGo': 'Окуума өтүү',
    'account.selfJoinFamily': 'Үй-бүлөмдүн ичинде окуу',
    'account.selfWhoSees': 'Жылышымды ким көрө алат',
    'account.selfNone':
      'Сизде азырынча окуучунун профили жок. Курска катталуу, курс сатып алуу же жылышыңыз менен бөлүшүү үчүн алгач ал керек — курс ар дайым аты аталган окуучу үчүн болот жана сиз ушинтип окуучу болосуз.',
    'account.selfFamilyInstead':
      'Үй-бүлөлүк аккаунтту башкарсаңыз, анын ордуна ошол жерде окуучу болуп, башынан эле үй-бүлөнүн бир бөлүгү боло аласыз.',
    'account.selfClaimNote':
      'Бул экинчи аккаунт түзбөйт. Ал сизди ушул аккаунтка окуучу катары кошот.',
    'account.formName': 'Көрсөтүлүүчү ат',
    'account.formLanguage': 'Тандалган тилдин коду',
    'account.formLanguageNote':
      'Бул профилиңиз менен кошо сакталат жана азырынча аны эч нерсе колдонбойт. Бул барактардын тили Тил барагында тандалат жана ушул браузерде сакталат.',
    'account.formZone': 'Убакыт алкагы',
    'account.formSave': 'Профилди сактоо',
    'account.formSaved': 'Профилиңиз жаңыртылды.',
    'account.formFailed': 'Профилиңизди сактоо мүмкүн болгон жок. Кайра аракет кылыңыз.',
    'account.formNameMissing': 'Адамдар көрүшүн каалаган атыңызды жазыңыз.',
    'account.formNameLong': 'Көрсөтүлүүчү ат {count} белгиден ашпасын.',
    'account.formLanguageBad': 'en же en-GB сыяктуу тил кодун колдонуңуз.',
    'account.formZoneLong': 'Убакыт алкагы {count} белгиден ашпасын.',
    'account.formZoneBad': 'Africa/Kampala сыяктуу жарактуу IANA убакыт алкагын колдонуңуз.',
    'account.formSignedOut': 'Сиз аккаунттан чыгып калгансыз. Кайра кирип, анан сактаңыз.',
    'account.formNotFound':
      'Профилиңиз табылган жок. Чыгып, кайра кириңиз, анан дагы аракет кылыңыз.',
    'account.signInHeading': 'Кантип киресиз',
    'account.signInBoth': 'Сырсөз менен же Google аркылуу кире аласыз.',
    'account.signInPassword': 'Сиз электрондук почта дареги жана сырсөз менен киресиз.',
    'account.signInGoogle': 'Сиз Google аркылуу киресиз. Бул аккаунтта сырсөз жок.',
    'account.signInPhone': 'Сиз телефонуңузга жөнөтүлгөн код менен киресиз.',
    'account.signInOther': 'Сиз муну менен киресиз: {methods}.',
    'account.signInNone': 'Бул аккаунт үчүн эч кандай кирүү ыкмасы катталган эмес.',
    'account.signInUnread': 'Кирүү ыкмаларыңызды азыр окуу мүмкүн болгон жок.',
    'account.resetBody':
      'Кирүү электрондук почтаңызга сырсөздү калыбына келтирүүнүн коопсуз шилтемесин жөнөтүңүз. Шилтеменин мөөнөтү аутентификация провайдериңиздин жөндөөлөрүнө ылайык бүтөт.',
    'account.resetLink': 'Калыбына келтирүү шилтемесин жөнөтүү',
    'account.noPasswordGoogle':
      'Бул аккаунтта сырсөз жок, ошондуктан калыбына келтире турган эч нерсе жок — Google аркылуу кире бериңиз.',
    'account.noPasswordPhone':
      'Бул аккаунт телефон коду менен кирет, ошондуктан калыбына келтире турган сырсөз жок.',
    'account.mergeHeading': 'Эки аккаунт, бир адам',
    'account.mergeBody':
      'Эгер эки жолу катталган болсоңуз, аккаунттарды бириктирүүгө болот. Сиз калтырган аккаунт сакталат; экинчиси жабылат жана бир нерсе көчүрүлөрдөн мурун экөө тең макул болушу керек.',
    'account.mergeWaiting': 'Кимдир бирөө бир аккаунтту ушул аккаунтка бириктирүүнү суранып жатат.',
    'account.mergeNone': 'Бул аккаунтта эч нерсе күтүп турган жок.',
    'account.mergeLink': 'Аккаунттарды бириктирүү',
    'account.mergeLinkWaiting': 'Аккаунттарды бириктирүү (күтүүдө: {count})',
    'account.sponsorHeading': 'Демөөрчүлүк орундар',
    'account.sponsorBody':
      'Курстун акысын башка бирөө төлөй алат. Курс колуңуздан келбесе, орун сураңыз же күтүп турган орундун акысын төлөңүз — эки тарап бири-биринин ким экенин эч качан билбейт.',
    'account.sponsorMine': 'Мен сураган жана демөөрчүлүк кылган орундар',
    'account.sponsorWaiting': 'Күтүп турган орундар',
    'account.teachHeading': 'Бул жерде сабак берүү',
    'account.teachBody':
      'Сабак берүү дайындоо аркылуу болот — эч ким катталуу менен мугалим болуп калбайт. Сабак бергиңиз келсе, квалификацияңызды жана өзүңүз өткөн сабактын шилтемесин жөнөтө аласыз, ээси аны окуйт.',
    'account.teachLink': 'Сабак берүүгө арыз берүү',
    'account.inviteHeading': 'Досуңузду чакыруу',
    'account.inviteBody':
      'Бул жерге жаңы келген досуңуз биринчи курсуна арзандатуу алат, ал эми анын төлөмү акчаны кайтаруу мөөнөтүнөн өткөндөн кийин сиз кийинки курсуңузга арзандатуу аласыз. Экөө тең акча эмес, арзандатуу, ошондуктан төлөнө турган эч нерсе жок.',
    'account.inviteLink': 'Чакыруу кодуңуз',
    'account.shareHeading': 'Окуум менен бөлүшүү',
    'account.shareBody':
      'Жылышыңыз жана сертификаттарыңыз купуя, жада калса үй-бүлөңүз үчүн да. Кимдир бирөөнү электрондук почта аркылуу чакырыңыз, ал чакырууну өзү кабыл алат; анын эмнени жана канча убакыт көрөрүн сиз тандайсыз жана каалаган убакта токтото аласыз.',
    'account.shareLink': 'Окуумду ким көрө алат',
    'account.readHeading': 'Окуу көрүнүшү',
    'account.readBody':
      'Тексттин өлчөмү, контраст жана кыймыл — тандаган заматта ушул браузер үчүн колдонулат. Бул жерде эч нерсени сактоонун кереги жок жана баракта башка эч нерсе өзгөрбөйт.',
    'account.readLink': 'Окуу жөндөөлөрү',
    'account.termsBody':
      'Шарттар, купуялык билдирүүсү жана мугалимдер үчүн шарттар, ар бири версия номери менен.',
    'account.termsAgreed':
      'Сиз макул болгон версиялар макулдук берген убактыңыз менен кошо тизмеленген.',
    'account.termsNone': 'Макулдугуңузду күтүп турган эч нерсе жок.',
    'account.termsLink': 'Аларды окуу',
    'account.instHeading': 'Менин мекемем',
    'account.instBody':
      'Сиз таандык болгон медресе, мектеп же уюм. Эгер электрондук почта дарегиңиз алардын бири ырастаган доменде болсо, ага кошула аласыз; кошулгандан кийин мекеме өз адамдарынын санын гана көрөт, ал эми атыңызды же эмнени окуганыңызды эч качан көрбөйт.',
    'account.instLink': 'Мен кайда таандыкмын',
    'account.paidHeading': 'Мен төлөгөндөр',
    'account.paidBody':
      'Төлөм аккаунтуңузда жасалган ар бир төлөм жана кайтарылган ар бир акча, ар бир валюта боюнча учурдагы жыйынтыгы менен. Сиз сураган акча кайтаруу чындап аткарылганга чейин өзүнчө тизмеленет, анткени суроо — алуу эмес.',
    'account.paidLink': 'Төлөгөндөрүмдү көрүү',
    'account.toldHeading': 'Мага эмне кабарланат',
    'account.toldBody':
      'Платформадан келген билдирүүлөр кирүүчү почтада же SMS аркылуу эмес, билдирүүлөр борборуңузда көрүнөт — азырынча эч кандай жеткирүү провайдери жөндөлгөн эмес.',
    'account.toldUnreadOne': 'Сизде {count} окула элек билдирүү бар.',
    'account.toldUnreadOther': 'Сизде {count} окула элек билдирүү бар.',
    'account.toldNone': 'Сизди күтүп турган эч нерсе жок.',
    'account.toldChoice':
      'Кайсы түрлөрүн каалаганыңызды өзүңүз тандайсыз, сизге тиешелүү акча жетпей калганы тууралуу билдирүүлөрдөн башкасын: алар ар дайым келет.',
    'account.toldLinkUnread': 'Билдирүүлөр ({count} окула элек)',
    'account.toldPrefs': 'Сизге эмне кабарланарын тандаңыз',
    'account.dataHeading': 'Менин маалыматтарым',
    'account.dataBody':
      'Бул аккаунт тууралуу бизде сакталгандын баарын бир файл кылып жүктөп алыңыз: профилиңиз, сиз жооптуу болгон окуучулар, алардын окугандары жана бүтүргөндөрү, сертификаттарыңыз, буйрутмаларыңыз жана дүмүрчөктөрүңүз, жазууларыңыз жана окууңуз менен ким менен бөлүшкөнүңүз.',
    'account.dataDownload': 'Маалыматтарымды жүктөп алуу',
    'account.dataSheet': 'Электрондук жадыбал катары',
    'account.dataPrint': 'Окуу же басып чыгаруу',
    'account.dataMore':
      'Эми анда мурдагыдан көбүрөөк нерсе бар: талкуу жазуулары, пикирлер жана текшерилген иштер, колдоо кайрылуулары, сизге жөнөтүлгөн билдирүүлөр жана — эгер сабак берсеңиз — кирешеңиз жана төлөмдөрүңүз.',
    'account.dataWhat': 'Анда эмне бар жана эмне кошулган эмес',
    'account.dataRestore':
      'Файлыңыз барбы? Профилиңизди, жазууларыңызды жана кыстармаларыңызды сиз катталган сабактарга кайра коюуга болот; катталууларды, сертификаттарды жана буйрутмаларды коюуга болбойт, себеби ошол баракта айтылган.',
    'account.dataRestoreLink': 'Кайра коюу',
    'account.closeHeading': 'Бул аккаунтту жабуу',
    'account.closeBody':
      'Жабуу профилиңизди өзгөртөт, айрым жеке маалыматтарды алып салат жана сизди аккаунттан чыгарууга аракет кылат. Буйрутмалар, төлөмдөр, катталуулар жана сертификаттар сакталат, анткени акчаны кайтаруу же сертификатты текшерүү үчүн алар дагы эле керек, айрым башка жазуулар да калат. Бир нерсе болордон мурун барак эки тарабын тең тизмелеп көрсөтөт.',
    'account.closeLink': 'Бул аккаунтту жабуу',
  },
  tk: {
    'account.lede':
      'Hasabyňyzyň nähili görünýändigini dolandyryň. Giriş salgyňyz diňe maglumat üçin görkezilýär we bu ýerde üýtgedilmeýär.',
    'account.status': 'Hasabyň ýagdaýy: {status}',
    'account.statusActive': 'işjeň',
    'account.statusSuspended': 'togtadylan',
    'account.statusClosed': 'ýapyk',
    'account.owedHeading': 'Dowam etmezden öň',
    'account.owedOne': '{count} resminama razylygyňyza garaşýar.',
    'account.owedOther': '{count} resminama razylygyňyza garaşýar.',
    'account.owedBody':
      'Okaň we razylyk beriň; razylyk beren wagtyňyz hasabyňyzda saklanýar. Şol aralykda bu sahypadaky başga hiç zat çäklendirilmeýär.',
    'account.owedVersion': '{title} — {number}-nji wersiýa',
    'account.selfHeading': 'Öz adyňyzdan okamak',
    'account.selfLearnsAs':
      'Bu hasap {name} ady bilen okaýar. Ýazylan ýa-da satyn alan kurslaryňyz şol okuwça degişlidir we oňa başga hiç kimiň ösüşi garyşmaýar.',
    'account.selfInFamily':
      'Okuwyňyz maşgala hasabynyň içinde, şonuň üçin bir maşgala meýilnamasy sizi çagalar bilen bilelikde öz içine alyp biler. Muny maşgala sahypasynda dolandyrýarsyňyz.',
    'account.selfOnOwn':
      'Okuwyňyz aýratyn dur. Maşgala hasabyny dolandyrýan bolsaňyz, bir meýilnamanyň hemmäni öz içine almagy üçin ony çagalaryň ýanyna geçirip bilersiňiz — şol bir profil, şol bir ösüş.',
    'account.selfGo': 'Okuwyma geç',
    'account.selfJoinFamily': 'Maşgalamyň içinde oka',
    'account.selfWhoSees': 'Ösüşimi kim görüp bilýär',
    'account.selfNone':
      'Sizde entek okuwçy profili ýok. Kursa ýazylmak, kurs satyn almak ýa-da ösüşiňizi paýlaşmak üçin ilki şol gerek — kurs hemişe ady görkezilen okuwçy üçindir we siz şeýdip okuwçy bolýarsyňyz.',
    'account.selfFamilyInstead':
      'Maşgala hasabyny dolandyrýan bolsaňyz, munuň ýerine şol ýerde okuwçy bolup, başdan maşgalanyň bir bölegi bolup bilersiňiz.',
    'account.selfClaimNote':
      'Bu ikinji hasap döretmeýär. Ol sizi şu hasaba okuwçy hökmünde goşýar.',
    'account.formName': 'Görkezilýän at',
    'account.formLanguage': 'Saýlanan diliň kody',
    'account.formLanguageNote':
      'Bu profiliňiz bilen bile saklanýar we entek hiç zat ony ulanmaýar. Bu sahypalaryň dili Dil sahypasynda saýlanýar we şu brauzerde saklanýar.',
    'account.formZone': 'Wagt guşaklygy',
    'account.formSave': 'Profili ýatda sakla',
    'account.formSaved': 'Profiliňiz täzelendi.',
    'account.formFailed': 'Profiliňizi ýatda saklap bolmady. Täzeden synanyşyň.',
    'account.formNameMissing': 'Adamlaryň görmegini isleýän adyňyzy ýazyň.',
    'account.formNameLong': 'Görkezilýän at {count} nyşandan geçmesin.',
    'account.formLanguageBad': 'en ýa-da en-GB ýaly dil koduny ulanyň.',
    'account.formZoneLong': 'Wagt guşaklygy {count} nyşandan geçmesin.',
    'account.formZoneBad': 'Africa/Kampala ýaly dogry IANA wagt guşaklygyny ulanyň.',
    'account.formSignedOut': 'Siz hasapdan çykypsyňyz. Täzeden giriň, soň ýatda saklaň.',
    'account.formNotFound': 'Profiliňiz tapylmady. Çykyp, täzeden giriň, soň ýene synanyşyň.',
    'account.signInHeading': 'Nähili girýärsiňiz',
    'account.signInBoth': 'Açar söz bilen ýa-da Google arkaly girip bilersiňiz.',
    'account.signInPassword': 'Siz e-poçta salgyňyz we açar söz bilen girýärsiňiz.',
    'account.signInGoogle': 'Siz Google arkaly girýärsiňiz. Bu hasapda açar söz ýok.',
    'account.signInPhone': 'Siz telefonyňyza iberilýän kod bilen girýärsiňiz.',
    'account.signInOther': 'Siz şu arkaly girýärsiňiz: {methods}.',
    'account.signInNone': 'Bu hasap üçin hiç hili giriş usuly bellige alynmandyr.',
    'account.signInUnread': 'Giriş usullaryňyzy häzir okap bolmady.',
    'account.resetBody':
      'Giriş e-poçtaňyza açar sözi täzeden düzmek üçin howpsuz baglanyşyk iberiň. Baglanyşygyň möhleti tassyklaýyş üpjünçiňiziň sazlamalaryna görä gutarýar.',
    'account.resetLink': 'Täzeden düzmek baglanyşygyny iber',
    'account.noPasswordGoogle':
      'Bu hasapda açar söz ýok, şonuň üçin täzeden düzer ýaly zat ýok — Google arkaly girmegi dowam ediň.',
    'account.noPasswordPhone':
      'Bu hasap telefon kody bilen girýär, şonuň üçin täzeden düzer ýaly açar söz ýok.',
    'account.mergeHeading': 'Iki hasap, bir adam',
    'account.mergeBody':
      'Iki gezek hasaba alnan bolsaňyz, hasaplary birleşdirip bolýar. Saklap galan hasabyňyz galýar; beýlekisi ýapylýar we bir zat geçirilmezden öň ikisi hem razy bolmaly.',
    'account.mergeWaiting': 'Kimdir biri bir hasaby şu hasap bilen birleşdirmegi soraýar.',
    'account.mergeNone': 'Bu hasapda garaşýan zat ýok.',
    'account.mergeLink': 'Hasaplary birleşdirmek',
    'account.mergeLinkWaiting': 'Hasaplary birleşdirmek (garaşýan: {count})',
    'account.sponsorHeading': 'Howandarlyk orunlary',
    'account.sponsorBody':
      'Kursuň tölegini başga biri töläp biler. Kurs eliňizden gelmeýän bolsa, orun soraň ýa-da garaşýan ornuň tölegini töläň — iki tarap biri-biriniň kimdigini hiç haçan bilmeýär.',
    'account.sponsorMine': 'Meniň soranlarym we howandarlyk edenlerim',
    'account.sponsorWaiting': 'Garaşýan orunlar',
    'account.teachHeading': 'Bu ýerde sapak bermek',
    'account.teachBody':
      'Sapak bermek bellenilmek arkaly bolýar — hiç kim hasaba alynmak bilen mugallym bolmaýar. Sapak bermek isleseňiz, hünär derejeleriňizi we beren sapagyňyzyň baglanyşygyny iberip bilersiňiz, eýesi ony okaýar.',
    'account.teachLink': 'Sapak bermek üçin ýüz tut',
    'account.inviteHeading': 'Dostuňy çagyr',
    'account.inviteBody':
      'Bu ýere täze gelen dostuňyz ilkinji kursuna arzanladyş alýar, onuň tölegi puly yzyna gaýtarmak möhletinden geçenden soň bolsa siz indiki kursuňyza arzanladyş alýarsyňyz. Ikisi hem pul däl-de, arzanladyşdyr, şonuň üçin tölenjek zat ýok.',
    'account.inviteLink': 'Çakylyk koduňyz',
    'account.shareHeading': 'Okuwymy paýlaşmak',
    'account.shareBody':
      'Ösüşiňiz we şahadatnamalaryňyz gizlindir, hatda maşgalaňyz üçin hem. Birini e-poçta arkaly çagyryň, ol çakylygy özi kabul edýär; onuň nämäni we näçe wagt görjekdigini siz saýlaýarsyňyz we islän wagtyňyz bes edip bilersiňiz.',
    'account.shareLink': 'Okuwymy kim görüp bilýär',
    'account.readHeading': 'Okalyş görnüşi',
    'account.readBody':
      'Tekstiň ölçegi, kontrast we hereket — saýlan badyňyza şu brauzer üçin ulanylýar. Bu ýerde hiç zady ýatda saklamak gerek däl we sahypada başga hiç zat üýtgemeýär.',
    'account.readLink': 'Okamak sazlamalary',
    'account.termsBody':
      'Şertler, gizlinlik habarnamasy we mugallymlar üçin şertler, her biri wersiýa belgisi bilen.',
    'account.termsAgreed':
      'Razy bolan wersiýalaryňyz razylyk beren wagtyňyz bilen bile sanalandyr.',
    'account.termsNone': 'Razylygyňyza garaşýan zat ýok.',
    'account.termsLink': 'Olary oka',
    'account.instHeading': 'Meniň edaram',
    'account.instBody':
      'Siziň degişli bolan medresäňiz, mekdebiňiz ýa-da guramaňyz. E-poçta salgyňyz olaryň biriniň tassyklan domeninde bolsa, oňa goşulyp bilersiňiz; goşulanyňyzdan soň edara diňe öz adamlarynyň sanyny görýär, adyňyzy ýa-da näme okandygyňyzy bolsa hiç haçan görmeýär.',
    'account.instLink': 'Men nirä degişli',
    'account.paidHeading': 'Meniň tölänlerim',
    'account.paidBody':
      'Töleg hasabyňyzda amala aşan her bir töleg we yzyna gaýdyp gelen her bir pul, her walýuta boýunça häzirki jemi bilen. Soran pul gaýtarmagyňyz hakykatdan amala aşýança aýratyn sanalýar, sebäbi soramak almak däldir.',
    'account.paidLink': 'Tölänlerimi gör',
    'account.toldHeading': 'Maňa näme habar berilýär',
    'account.toldBody':
      'Platformadan gelýän habarlar gelen hatlar gutusynda ýa-da SMS arkaly däl-de, bildirişler merkeziňizde görünýär — entek hiç hili eltip beriş üpjünçisi sazlanmandyr.',
    'account.toldUnreadOne': 'Sizde {count} okalmadyk habar bar.',
    'account.toldUnreadOther': 'Sizde {count} okalmadyk habar bar.',
    'account.toldNone': 'Size garaşýan zat ýok.',
    'account.toldChoice':
      'Haýsy görnüşleri isleýändigiňizi özüňiz saýlaýarsyňyz, size degişli puluň gelmändigi baradaky bildirişlerden başgasyny: olar hemişe gelýär.',
    'account.toldLinkUnread': 'Bildirişler ({count} okalmadyk)',
    'account.toldPrefs': 'Size näme habar beriljekdigini saýlaň',
    'account.dataHeading': 'Meniň maglumatlarym',
    'account.dataBody':
      'Bu hasap barada bizde saklanýan ähli zady bir faýl hökmünde göçürip alyň: profiliňiz, jogapkär bolan okuwçylaryňyz, olaryň okan we tamamlan zatlary, şahadatnamalaryňyz, sargytlaryňyz we kwitansiýalaryňyz, bellikleriňiz we okuwyňyzy kimler bilen paýlaşandygyňyz.',
    'account.dataDownload': 'Maglumatlarymy göçürip al',
    'account.dataSheet': 'Elektron tablisa hökmünde',
    'account.dataPrint': 'Oka ýa-da çap et',
    'account.dataMore':
      'Indi onda öňküsinden köp zat bar: ara alyp maslahatlaşma ýazgylary, synlar we barlanan işler, goldaw ýüzlenmeleri, size iberilen habarlar we — sapak berýän bolsaňyz — girdejiňiz we tölegleriňiz.',
    'account.dataWhat': 'Onda näme bar we näme goşulmadyk',
    'account.dataRestore':
      'Eýýäm faýlyňyz barmy? Profiliňizi, bellikleriňizi we sahypa belliklerini ýazylan sapaklaryňyza yzyna goýup bolýar; ýazylyşlary, şahadatnamalary we sargytlary goýup bolmaýar, sebäbi şol sahypada aýdylýar.',
    'account.dataRestoreLink': 'Yzyna goý',
    'account.closeHeading': 'Bu hasaby ýapmak',
    'account.closeBody':
      'Ýapmak profiliňizi üýtgedýär, käbir şahsy maglumatlary aýyrýar we sizi hasapdan çykarmaga çalyşýar. Sargytlar, tölegler, ýazylyşlar we şahadatnamalar saklanýar, sebäbi pul gaýtarmak ýa-da şahadatnamany barlamak üçin olar entek hem gerek, käbir beýleki ýazgylar hem galýar. Bir zat bolmazdan öň sahypa iki tarapy hem sanap görkezýär.',
    'account.closeLink': 'Bu hasaby ýap',
  },
  ta: {
    'account.lede':
      'உங்கள் கணக்கு எப்படித் தோன்றுகிறது என்பதை நிர்வகியுங்கள். உங்கள் உள்நுழைவு முகவரி தகவலுக்காக மட்டும் காட்டப்படுகிறது; அதை இங்கே மாற்ற முடியாது.',
    'account.status': 'கணக்கின் நிலை: {status}',
    'account.statusActive': 'செயலில் உள்ளது',
    'account.statusSuspended': 'இடைநிறுத்தப்பட்டது',
    'account.statusClosed': 'மூடப்பட்டது',
    'account.owedHeading': 'தொடர்வதற்கு முன்',
    'account.owedOne': '{count} ஆவணம் உங்கள் ஒப்புதலுக்காகக் காத்திருக்கிறது.',
    'account.owedOther': '{count} ஆவணங்கள் உங்கள் ஒப்புதலுக்காகக் காத்திருக்கின்றன.',
    'account.owedBody':
      'படித்து ஒப்புக்கொள்ளுங்கள்; நீங்கள் ஒப்புக்கொண்ட நேரம் உங்கள் கணக்கில் வைக்கப்படும். இதற்கிடையில் இந்தப் பக்கத்தில் வேறு எதுவும் தடுக்கப்படாது.',
    'account.owedVersion': '{title} — பதிப்பு {number}',
    'account.selfHeading': 'உங்கள் பெயரிலேயே கற்றல்',
    'account.selfLearnsAs':
      'இந்தக் கணக்கு {name} என்ற பெயரில் கற்கிறது. நீங்கள் பதிவு செய்யும் அல்லது வாங்கும் பாடநெறிகள் அந்தக் கற்பவருக்கே உரியவை; வேறு யாருடைய முன்னேற்றமும் அதில் கலக்காது.',
    'account.selfInFamily':
      'உங்கள் கற்றல் ஒரு குடும்பக் கணக்கிற்குள் உள்ளது; எனவே ஒரே குடும்பத் திட்டம் குழந்தைகளுடன் உங்களையும் உள்ளடக்க முடியும். அதை நீங்கள் குடும்பப் பக்கத்தில் நிர்வகிக்கிறீர்கள்.',
    'account.selfOnOwn':
      'உங்கள் கற்றல் தனியாக உள்ளது. நீங்கள் குடும்பக் கணக்கை நடத்தினால், ஒரே திட்டம் அனைவரையும் உள்ளடக்கும்படி அதைக் குழந்தைகளின் அருகில் நகர்த்தலாம் — அதே சுயவிவரம், அதே முன்னேற்றம்.',
    'account.selfGo': 'என் கற்றலுக்குச் செல்',
    'account.selfJoinFamily': 'என் குடும்பத்திற்குள் கற்க',
    'account.selfWhoSees': 'என் முன்னேற்றத்தை யார் பார்க்கலாம்',
    'account.selfNone':
      'உங்களுக்கு இன்னும் கற்பவர் சுயவிவரம் இல்லை. ஒரு பாடநெறியில் பதிவு செய்ய, ஒன்றை வாங்க அல்லது உங்கள் முன்னேற்றத்தைப் பகிர அது முதலில் தேவை — பாடநெறி எப்போதும் பெயர் குறிப்பிட்ட ஒரு கற்பவருக்கானது; இப்படித்தான் நீங்கள் கற்பவராகிறீர்கள்.',
    'account.selfFamilyInstead':
      'நீங்கள் குடும்பக் கணக்கை நடத்தினால், அதற்குப் பதிலாக அங்கேயே கற்பவராகி, தொடக்கத்திலிருந்தே குடும்பத்தின் பகுதியாக இருக்கலாம்.',
    'account.selfClaimNote':
      'இது இரண்டாவது கணக்கை உருவாக்காது. இது உங்களை இந்தக் கணக்கிலேயே கற்பவராகச் சேர்க்கிறது.',
    'account.formName': 'காட்சிப் பெயர்',
    'account.formLanguage': 'விருப்ப மொழிக் குறியீடு',
    'account.formLanguageNote':
      'இது உங்கள் சுயவிவரத்துடன் வைக்கப்படுகிறது; இதுவரை எதுவும் இதைப் பயன்படுத்தவில்லை. இந்தப் பக்கங்களின் மொழி மொழிப் பக்கத்தில் தேர்ந்தெடுக்கப்பட்டு இந்த உலாவியில் வைக்கப்படுகிறது.',
    'account.formZone': 'நேர மண்டலம்',
    'account.formSave': 'சுயவிவரத்தைச் சேமி',
    'account.formSaved': 'உங்கள் சுயவிவரம் புதுப்பிக்கப்பட்டது.',
    'account.formFailed': 'உங்கள் சுயவிவரத்தைச் சேமிக்க முடியவில்லை. மீண்டும் முயலுங்கள்.',
    'account.formNameMissing':
      'மற்றவர்கள் பார்க்க வேண்டும் என்று நீங்கள் விரும்பும் பெயரைச் சேர்க்கவும்.',
    'account.formNameLong': 'காட்சிப் பெயர் {count} எழுத்துகளுக்கு மிகாமல் இருக்கட்டும்.',
    'account.formLanguageBad': 'en அல்லது en-GB போன்ற மொழிக் குறியீட்டைப் பயன்படுத்தவும்.',
    'account.formZoneLong': 'நேர மண்டலம் {count} எழுத்துகளுக்கு மிகாமல் இருக்கட்டும்.',
    'account.formZoneBad': 'Africa/Kampala போன்ற சரியான IANA நேர மண்டலத்தைப் பயன்படுத்தவும்.',
    'account.formSignedOut':
      'நீங்கள் வெளியேறிவிட்டீர்கள். மீண்டும் உள்நுழைந்து, பிறகு சேமிக்கவும்.',
    'account.formNotFound':
      'உங்கள் சுயவிவரம் கிடைக்கவில்லை. வெளியேறி மீண்டும் உள்நுழைந்து, பிறகு முயலுங்கள்.',
    'account.signInHeading': 'நீங்கள் எப்படி உள்நுழைகிறீர்கள்',
    'account.signInBoth': 'நீங்கள் கடவுச்சொல் மூலமாகவோ Google மூலமாகவோ உள்நுழையலாம்.',
    'account.signInPassword':
      'நீங்கள் உங்கள் மின்னஞ்சல் முகவரி மற்றும் கடவுச்சொல் மூலம் உள்நுழைகிறீர்கள்.',
    'account.signInGoogle':
      'நீங்கள் Google மூலம் உள்நுழைகிறீர்கள். இந்தக் கணக்கில் கடவுச்சொல் இல்லை.',
    'account.signInPhone':
      'உங்கள் தொலைபேசிக்கு அனுப்பப்படும் குறியீட்டின் மூலம் நீங்கள் உள்நுழைகிறீர்கள்.',
    'account.signInOther': 'நீங்கள் இதன் மூலம் உள்நுழைகிறீர்கள்: {methods}.',
    'account.signInNone': 'இந்தக் கணக்கிற்கு எந்த உள்நுழைவு முறையும் பதிவாகவில்லை.',
    'account.signInUnread': 'உங்கள் உள்நுழைவு முறைகளை இப்போது படிக்க முடியவில்லை.',
    'account.resetBody':
      'உங்கள் உள்நுழைவு மின்னஞ்சலுக்குக் கடவுச்சொல்லை மீட்டமைக்கும் பாதுகாப்பான இணைப்பை அனுப்புங்கள். உங்கள் அங்கீகார வழங்குநரின் அமைப்புகளின்படி இணைப்பு காலாவதியாகும்.',
    'account.resetLink': 'மீட்டமைப்பு இணைப்பை அனுப்பு',
    'account.noPasswordGoogle':
      'இந்தக் கணக்கில் கடவுச்சொல் இல்லை; எனவே மீட்டமைக்க எதுவும் இல்லை — உள்நுழைய Google-ஐயே தொடர்ந்து பயன்படுத்துங்கள்.',
    'account.noPasswordPhone':
      'இந்தக் கணக்கு தொலைபேசிக் குறியீட்டின் மூலம் உள்நுழைகிறது; எனவே மீட்டமைக்கக் கடவுச்சொல் இல்லை.',
    'account.mergeHeading': 'இரண்டு கணக்குகள், ஒரே நபர்',
    'account.mergeBody':
      'நீங்கள் இருமுறை பதிவு செய்திருந்தால், கணக்குகளை ஒன்றாக்கலாம். நீங்கள் வைத்துக்கொள்ளும் கணக்கு நீடிக்கும்; மற்றொன்று மூடப்படும், எதுவும் நகர்வதற்கு முன் இரண்டும் ஒப்புக்கொள்ள வேண்டும்.',
    'account.mergeWaiting': 'ஒரு கணக்கை இந்தக் கணக்குடன் இணைக்க யாரோ கேட்கிறார்.',
    'account.mergeNone': 'இந்தக் கணக்கில் எதுவும் காத்திருக்கவில்லை.',
    'account.mergeLink': 'கணக்குகளை இணைத்தல்',
    'account.mergeLinkWaiting': 'கணக்குகளை இணைத்தல் (காத்திருப்பவை: {count})',
    'account.sponsorHeading': 'நிதியுதவி பெற்ற இடங்கள்',
    'account.sponsorBody':
      'ஒரு பாடநெறிக்கான கட்டணத்தை வேறொருவர் செலுத்தலாம். பாடநெறி உங்கள் சக்திக்கு மீறியதாக இருந்தால் ஓர் இடத்தைக் கேளுங்கள், அல்லது காத்திருக்கும் ஓர் இடத்திற்குக் கட்டணம் செலுத்துங்கள் — இரு தரப்பினரும் மற்றவர் யார் என்பதை ஒருபோதும் அறிவதில்லை.',
    'account.sponsorMine': 'நான் கேட்டவையும் நிதியுதவி செய்தவையும்',
    'account.sponsorWaiting': 'காத்திருக்கும் இடங்கள்',
    'account.teachHeading': 'இங்கே கற்பித்தல்',
    'account.teachBody':
      'கற்பித்தல் நியமனத்தின் மூலமே நடக்கிறது — பதிவு செய்வதால் மட்டும் யாரும் ஆசிரியராவதில்லை. நீங்கள் கற்பிக்க விரும்பினால், உங்கள் தகுதிகளையும் நீங்கள் நடத்திய ஒரு பாடத்தின் இணைப்பையும் அனுப்பலாம்; உரிமையாளர் அதைப் படிப்பார்.',
    'account.teachLink': 'கற்பிக்க விண்ணப்பிக்க',
    'account.inviteHeading': 'ஒரு நண்பரை அழைக்க',
    'account.inviteBody':
      'இங்கே புதிதாக வரும் நண்பருக்கு அவரது முதல் பாடநெறியில் தள்ளுபடி கிடைக்கும்; அவரது கட்டணம் பணம் திரும்பப்பெறும் காலத்தைக் கடந்த பிறகு உங்கள் அடுத்த பாடநெறியில் உங்களுக்குத் தள்ளுபடி கிடைக்கும். இரண்டும் தள்ளுபடிகளே, பணம் அல்ல; எனவே வழங்க வேண்டியது எதுவும் இல்லை.',
    'account.inviteLink': 'உங்கள் அழைப்புக் குறியீடு',
    'account.shareHeading': 'என் கற்றலைப் பகிர்தல்',
    'account.shareBody':
      'உங்கள் முன்னேற்றமும் சான்றிதழ்களும் தனிப்பட்டவை, உங்கள் குடும்பத்திற்கும் கூட. ஒருவரை மின்னஞ்சல் மூலம் அழையுங்கள்; அவரே அதை ஏற்றுக்கொள்வார்; அவர் எதைப் பார்க்கலாம், எவ்வளவு காலம் என்பதை நீங்களே தேர்ந்தெடுக்கிறீர்கள், விரும்பும்போது அதை முடிக்கலாம்.',
    'account.shareLink': 'என் கற்றலை யார் பார்க்கலாம்',
    'account.readHeading': 'வாசிப்புத் தோற்றம்',
    'account.readBody':
      'எழுத்தின் அளவு, நிற வேறுபாடு மற்றும் அசைவு — தேர்ந்தெடுத்த உடனே இந்த உலாவிக்குப் பொருந்தும். இங்கே எதையும் சேமிக்க வேண்டியதில்லை; பக்கத்தில் வேறு எதுவும் மாறாது.',
    'account.readLink': 'வாசிப்பு விருப்பங்கள்',
    'account.termsBody':
      'விதிமுறைகள், தனியுரிமை அறிவிப்பு மற்றும் ஆசிரியர்களுக்கான விதிமுறைகள், ஒவ்வொன்றும் பதிப்பு எண்ணுடன்.',
    'account.termsAgreed':
      'நீங்கள் ஒப்புக்கொண்ட பதிப்புகள் ஒப்புக்கொண்ட நேரத்துடன் பட்டியலிடப்பட்டுள்ளன.',
    'account.termsNone': 'உங்கள் ஒப்புதலுக்காக எதுவும் காத்திருக்கவில்லை.',
    'account.termsLink': 'அவற்றைப் படிக்க',
    'account.instHeading': 'என் நிறுவனம்',
    'account.instBody':
      'நீங்கள் சேர்ந்துள்ள ஒரு மதரசா, பள்ளி அல்லது அமைப்பு. உங்கள் மின்னஞ்சல் முகவரி அவற்றில் ஒன்று சரிபார்த்த டொமைனில் இருந்தால், நீங்கள் அதில் சேரலாம்; சேர்ந்த பிறகு அந்நிறுவனம் தன் உறுப்பினர்களின் எண்ணிக்கையை மட்டுமே பார்க்கும்; உங்கள் பெயரையோ நீங்கள் படித்ததையோ ஒருபோதும் பார்க்காது.',
    'account.instLink': 'நான் எங்கு சேர்ந்துள்ளேன்',
    'account.paidHeading': 'நான் செலுத்தியவை',
    'account.paidBody':
      'உங்கள் கட்டணக் கணக்கில் நடந்த ஒவ்வொரு கட்டணமும், திரும்பி வந்த ஒவ்வொரு தொகையும், ஒவ்வொரு நாணயத்திற்கும் நடப்பு மொத்தத்துடன். நீங்கள் கேட்ட பணம் திரும்பப்பெறுதல் உண்மையில் நடக்கும் வரை தனியாகப் பட்டியலிடப்படும்; ஏனெனில் கேட்பது பெறுவது அல்ல.',
    'account.paidLink': 'நான் செலுத்தியவற்றைப் பார்க்க',
    'account.toldHeading': 'எனக்குத் தெரிவிக்கப்படுபவை',
    'account.toldBody':
      'தளத்திலிருந்து வரும் செய்திகள் உங்கள் அறிவிப்பு மையத்தில் தோன்றும்; அஞ்சல்பெட்டியிலோ குறுஞ்செய்தியிலோ அல்ல — அனுப்பும் சேவை வழங்குநர் எவரும் இன்னும் அமைக்கப்படவில்லை.',
    'account.toldUnreadOne': 'உங்களுக்குப் படிக்காத {count} செய்தி உள்ளது.',
    'account.toldUnreadOther': 'உங்களுக்குப் படிக்காத {count} செய்திகள் உள்ளன.',
    'account.toldNone': 'உங்களுக்காக எதுவும் காத்திருக்கவில்லை.',
    'account.toldChoice':
      'எந்த வகைகள் வேண்டும் என்பதை நீங்களே தேர்ந்தெடுக்கிறீர்கள்; உங்களுக்குச் சேர வேண்டிய பணம் வந்து சேரவில்லை என்ற அறிவிப்புகள் மட்டும் விதிவிலக்கு: அவை எப்போதும் வரும்.',
    'account.toldLinkUnread': 'அறிவிப்புகள் (படிக்காதவை: {count})',
    'account.toldPrefs': 'உங்களுக்கு என்ன தெரிவிக்கப்பட வேண்டும் என்பதைத் தேர்ந்தெடுக்க',
    'account.dataHeading': 'என் தரவு',
    'account.dataBody':
      'இந்தக் கணக்கைப் பற்றி நாங்கள் வைத்திருக்கும் அனைத்தையும் ஒரே கோப்பாகப் பதிவிறக்குங்கள்: உங்கள் சுயவிவரம், நீங்கள் பொறுப்பேற்றுள்ள கற்பவர்கள், அவர்கள் படித்தவையும் முடித்தவையும், உங்கள் சான்றிதழ்கள், ஆர்டர்கள் மற்றும் ரசீதுகள், உங்கள் குறிப்புகள், மேலும் உங்கள் கற்றலை யாருடன் பகிர்ந்துள்ளீர்கள் என்பது.',
    'account.dataDownload': 'என் தரவைப் பதிவிறக்கு',
    'account.dataSheet': 'விரிதாளாக',
    'account.dataPrint': 'படிக்க அல்லது அச்சிட',
    'account.dataMore':
      'இப்போது இதில் முன்பை விட அதிகம் உள்ளது: விவாதப் பதிவுகள், மதிப்புரைகள் மற்றும் திருத்தப்பட்ட பணிகள், உதவிக் கோரிக்கைகள், உங்களுக்கு அனுப்பப்பட்ட செய்திகள், மேலும் — நீங்கள் கற்பித்தால் — உங்கள் வருமானமும் கொடுப்பனவுகளும்.',
    'account.dataWhat': 'இதில் என்ன உள்ளது, என்ன விடப்பட்டுள்ளது',
    'account.dataRestore':
      'ஏற்கெனவே கோப்பு உள்ளதா? உங்கள் சுயவிவரம், குறிப்புகள் மற்றும் புக்மார்க்குகளை நீங்கள் பதிவு செய்துள்ள பாடங்களில் மீண்டும் வைக்கலாம்; பதிவுகள், சான்றிதழ்கள் மற்றும் ஆர்டர்களை வைக்க முடியாது; அதற்கான காரணத்தை அந்தப் பக்கம் சொல்கிறது.',
    'account.dataRestoreLink': 'மீண்டும் வைக்க',
    'account.closeHeading': 'இந்தக் கணக்கை மூடுதல்',
    'account.closeBody':
      'மூடுவது உங்கள் சுயவிவரத்தை மாற்றுகிறது, சில தனிப்பட்ட தகவல்களை நீக்குகிறது, உங்களை வெளியேற்ற முயல்கிறது. ஆர்டர்கள், கட்டணங்கள், பதிவுகள் மற்றும் சான்றிதழ்கள் வைக்கப்படும்; ஏனெனில் பணம் திரும்பப்பெறுதலுக்கோ சான்றிதழ் சரிபார்ப்புக்கோ அவை இன்னும் தேவை; வேறு சில பதிவுகளும் எஞ்சியிருக்கும். எதுவும் நடப்பதற்கு முன் பக்கம் இரு பக்கங்களையும் பட்டியலிடுகிறது.',
    'account.closeLink': 'இந்தக் கணக்கை மூடு',
  },
  ne: {
    'account.lede':
      'तपाईंको खाता कसरी देखिन्छ भन्ने व्यवस्थापन गर्नुहोस्। तपाईंको साइन-इन ठेगाना जानकारीका लागि मात्र देखाइएको हो र यहाँ परिवर्तन हुँदैन।',
    'account.status': 'खाताको अवस्था: {status}',
    'account.statusActive': 'सक्रिय',
    'account.statusSuspended': 'निलम्बित',
    'account.statusClosed': 'बन्द',
    'account.owedHeading': 'अगाडि बढ्नुअघि',
    'account.owedOne': '{count} कागजात तपाईंको सहमतिको प्रतीक्षामा छ।',
    'account.owedOther': '{count} कागजातहरू तपाईंको सहमतिको प्रतीक्षामा छन्।',
    'account.owedBody':
      'पढ्नुहोस् र सहमति दिनुहोस्; सहमति दिएको समय तपाईंको खातामा राखिन्छ। यस बीचमा यो पृष्ठको अरू केही पनि रोकिँदैन।',
    'account.owedVersion': '{title} — संस्करण {number}',
    'account.selfHeading': 'आफ्नै नाममा सिक्ने',
    'account.selfLearnsAs':
      'यो खाता {name} को नाममा सिक्छ। तपाईं भर्ना हुने वा किन्ने कोर्सहरू त्यही सिकारुका हुन्, र अरू कसैको प्रगति त्यसमा मिसिँदैन।',
    'account.selfInFamily':
      'तपाईंको सिकाइ पारिवारिक खाताभित्र छ, त्यसैले एउटै पारिवारिक योजनाले बालबालिकासँगै तपाईंलाई पनि समेट्न सक्छ। यो तपाईं परिवारको पृष्ठमा व्यवस्थापन गर्नुहुन्छ।',
    'account.selfOnOwn':
      'तपाईंको सिकाइ छुट्टै छ। तपाईं पारिवारिक खाता चलाउनुहुन्छ भने, एउटै योजनाले सबैलाई समेटोस् भनेर यसलाई बालबालिकासँगै सार्न सक्नुहुन्छ — उही प्रोफाइल, उही प्रगति।',
    'account.selfGo': 'मेरो सिकाइमा जानुहोस्',
    'account.selfJoinFamily': 'मेरो परिवारभित्र सिक्नुहोस्',
    'account.selfWhoSees': 'मेरो प्रगति कसले देख्न सक्छ',
    'account.selfNone':
      'तपाईंसँग अहिलेसम्म सिकारु प्रोफाइल छैन। कोर्समा भर्ना हुन, कोर्स किन्न वा आफ्नो प्रगति साझा गर्न पहिले यो चाहिन्छ — कोर्स सधैँ नाम तोकिएको सिकारुका लागि हुन्छ, र तपाईं यसरी नै सिकारु बन्नुहुन्छ।',
    'account.selfFamilyInstead':
      'तपाईं पारिवारिक खाता चलाउनुहुन्छ भने, त्यसको सट्टा त्यहीँ सिकारु बन्न र सुरुदेखि नै परिवारको हिस्सा हुन सक्नुहुन्छ।',
    'account.selfClaimNote':
      'यसले दोस्रो खाता बनाउँदैन। यसले तपाईंलाई यही खातामा सिकारुका रूपमा थप्छ।',
    'account.formName': 'देखिने नाम',
    'account.formLanguage': 'रोजाइको भाषाको कोड',
    'account.formLanguageNote':
      'यो तपाईंको प्रोफाइलसँगै राखिन्छ, र अहिलेसम्म कुनै कुराले यसलाई प्रयोग गर्दैन। यी पृष्ठहरूको भाषा भाषा पृष्ठमा छानिन्छ र यही ब्राउजरमा राखिन्छ।',
    'account.formZone': 'समय क्षेत्र',
    'account.formSave': 'प्रोफाइल सुरक्षित गर्नुहोस्',
    'account.formSaved': 'तपाईंको प्रोफाइल अद्यावधिक भयो।',
    'account.formFailed': 'तपाईंको प्रोफाइल सुरक्षित गर्न सकिएन। फेरि प्रयास गर्नुहोस्।',
    'account.formNameMissing': 'अरूले देखून् भन्ने चाहेको नाम लेख्नुहोस्।',
    'account.formNameLong': 'देखिने नाम {count} अक्षर वा सोभन्दा कम राख्नुहोस्।',
    'account.formLanguageBad': 'en वा en-GB जस्तो भाषा कोड प्रयोग गर्नुहोस्।',
    'account.formZoneLong': 'समय क्षेत्र {count} अक्षर वा सोभन्दा कम राख्नुहोस्।',
    'account.formZoneBad': 'Africa/Kampala जस्तो मान्य IANA समय क्षेत्र प्रयोग गर्नुहोस्।',
    'account.formSignedOut':
      'तपाईं साइन आउट हुनुभएको छ। फेरि साइन इन गर्नुहोस्, अनि सुरक्षित गर्नुहोस्।',
    'account.formNotFound':
      'तपाईंको प्रोफाइल भेटिएन। साइन आउट गरी फेरि साइन इन गर्नुहोस्, अनि प्रयास गर्नुहोस्।',
    'account.signInHeading': 'तपाईं कसरी साइन इन गर्नुहुन्छ',
    'account.signInBoth': 'तपाईं पासवर्डबाट वा Google बाट साइन इन गर्न सक्नुहुन्छ।',
    'account.signInPassword': 'तपाईं आफ्नो इमेल ठेगाना र पासवर्डबाट साइन इन गर्नुहुन्छ।',
    'account.signInGoogle': 'तपाईं Google बाट साइन इन गर्नुहुन्छ। यो खातामा पासवर्ड छैन।',
    'account.signInPhone': 'तपाईं आफ्नो फोनमा पठाइएको कोडबाट साइन इन गर्नुहुन्छ।',
    'account.signInOther': 'तपाईं यसबाट साइन इन गर्नुहुन्छ: {methods}।',
    'account.signInNone': 'यो खाताका लागि कुनै साइन-इन विधि दर्ता छैन।',
    'account.signInUnread': 'तपाईंका साइन-इन विधिहरू अहिले पढ्न सकिएन।',
    'account.resetBody':
      'आफ्नो साइन-इन इमेलमा पासवर्ड रिसेट गर्ने सुरक्षित लिङ्क पठाउनुहोस्। लिङ्कको म्याद तपाईंको प्रमाणीकरण प्रदायकको सेटिङअनुसार सकिन्छ।',
    'account.resetLink': 'रिसेट लिङ्क पठाउनुहोस्',
    'account.noPasswordGoogle':
      'यो खातामा पासवर्ड छैन, त्यसैले रिसेट गर्ने केही छैन — साइन इन गर्न Google नै प्रयोग गरिरहनुहोस्।',
    'account.noPasswordPhone': 'यो खाता फोन कोडबाट साइन इन गर्छ, त्यसैले रिसेट गर्ने पासवर्ड छैन।',
    'account.mergeHeading': 'दुई खाता, एक व्यक्ति',
    'account.mergeBody':
      'तपाईंले दुई पटक साइन अप गर्नुभएको छ भने, खाताहरू गाभ्न सकिन्छ। तपाईंले राख्ने खाता रहन्छ; अर्को बन्द हुन्छ, र केही पनि सर्नुअघि दुवैले सहमति दिनुपर्छ।',
    'account.mergeWaiting': 'कसैले यो खातामा एउटा खाता गाभ्न अनुरोध गरिरहेको छ।',
    'account.mergeNone': 'यो खातामा केही पनि प्रतीक्षामा छैन।',
    'account.mergeLink': 'खाताहरू गाभ्ने',
    'account.mergeLinkWaiting': 'खाताहरू गाभ्ने (प्रतीक्षामा: {count})',
    'account.sponsorHeading': 'प्रायोजित सिटहरू',
    'account.sponsorBody':
      'कोर्सको शुल्क अरू कसैले तिरिदिन सक्छ। कोर्स तपाईंको पहुँचबाहिर छ भने सिट माग्नुहोस्, वा प्रतीक्षामा रहेको सिटको शुल्क तिर्नुहोस् — दुवै पक्षले अर्को को हो भनेर कहिल्यै थाहा पाउँदैनन्।',
    'account.sponsorMine': 'मैले मागेको र प्रायोजन गरेको',
    'account.sponsorWaiting': 'प्रतीक्षामा रहेका सिटहरू',
    'account.teachHeading': 'यहाँ पढाउने',
    'account.teachBody':
      'पढाउने काम नियुक्तिबाट हुन्छ — साइन अप गरेर मात्र कोही शिक्षक बन्दैन। तपाईं पढाउन चाहनुहुन्छ भने, आफ्ना योग्यता र आफूले पढाएको कुनै पाठको लिङ्क पठाउन सक्नुहुन्छ, र मालिकले त्यो पढ्छन्।',
    'account.teachLink': 'पढाउन आवेदन दिनुहोस्',
    'account.inviteHeading': 'साथीलाई निम्तो दिनुहोस्',
    'account.inviteBody':
      'यहाँ नयाँ आएको साथीले आफ्नो पहिलो कोर्समा छुट पाउँछ, र उसको भुक्तानीले रकम फिर्ताको अवधि पार गरेपछि तपाईंले आफ्नो अर्को कोर्समा छुट पाउनुहुन्छ। दुवै छुट हुन्, पैसा होइन, त्यसैले तिर्नुपर्ने केही छैन।',
    'account.inviteLink': 'तपाईंको निम्तो कोड',
    'account.shareHeading': 'मेरो सिकाइ साझा गर्ने',
    'account.shareBody':
      'तपाईंको प्रगति र प्रमाणपत्रहरू निजी हुन्, तपाईंको परिवारका लागि पनि। कसैलाई इमेलबाट निम्तो दिनुहोस् र उसले आफैँ स्वीकार गर्छ; उसले के देख्ने र कति समयसम्म भन्ने तपाईं छान्नुहुन्छ, र चाहेको बेला अन्त्य गर्न सक्नुहुन्छ।',
    'account.shareLink': 'मेरो सिकाइ कसले देख्न सक्छ',
    'account.readHeading': 'पढ्ने देखावट',
    'account.readBody':
      'पाठको आकार, कन्ट्रास्ट र गति — छान्नेबित्तिकै यो ब्राउजरका लागि लागू हुन्छ। यहाँ केही सुरक्षित गर्नुपर्दैन, र पृष्ठमा अरू केही बदलिँदैन।',
    'account.readLink': 'पढाइका रोजाइहरू',
    'account.termsBody':
      'सर्तहरू, गोपनीयता सूचना र शिक्षकहरूका लागि सर्तहरू, प्रत्येक संस्करण नम्बरसहित।',
    'account.termsAgreed': 'तपाईंले सहमति दिएका संस्करणहरू सहमति दिएको समयसहित सूचीबद्ध छन्।',
    'account.termsNone': 'तपाईंको सहमतिको प्रतीक्षामा केही छैन।',
    'account.termsLink': 'तिनलाई पढ्नुहोस्',
    'account.instHeading': 'मेरो संस्था',
    'account.instBody':
      'तपाईं आबद्ध भएको मदरसा, विद्यालय वा संगठन। तपाईंको इमेल ठेगाना तीमध्ये कुनैले प्रमाणित गरेको डोमेनमा छ भने, तपाईं त्यसमा सामेल हुन सक्नुहुन्छ; सामेल भएपछि संस्थाले आफ्ना मानिसहरूको सङ्ख्या मात्र देख्छ, तपाईंको नाम वा तपाईंले के पढ्नुभयो भन्ने कहिल्यै देख्दैन।',
    'account.instLink': 'म कहाँ आबद्ध छु',
    'account.paidHeading': 'मैले तिरेको',
    'account.paidBody':
      'तपाईंको बिलिङ खातामा भएको प्रत्येक भुक्तानी, र फिर्ता आएको प्रत्येक रकम, प्रत्येक मुद्राको चालु जोडसहित। तपाईंले मागेको रकम फिर्ता वास्तवमै नभएसम्म छुट्टै सूचीबद्ध हुन्छ, किनभने माग्नु भनेको पाउनु होइन।',
    'account.paidLink': 'मैले तिरेको हेर्नुहोस्',
    'account.toldHeading': 'मलाई के जानकारी दिइन्छ',
    'account.toldBody':
      'प्लेटफर्मका सन्देशहरू तपाईंको सूचना केन्द्रमा देखिन्छन्, इनबक्स वा टेक्स्ट सन्देशमा होइन — अहिलेसम्म कुनै पठाउने सेवा प्रदायक मिलाइएको छैन।',
    'account.toldUnreadOne': 'तपाईंसँग {count} नपढिएको सन्देश छ।',
    'account.toldUnreadOther': 'तपाईंसँग {count} नपढिएका सन्देशहरू छन्।',
    'account.toldNone': 'तपाईंका लागि केही प्रतीक्षामा छैन।',
    'account.toldChoice':
      'कुन प्रकार चाहिन्छ भन्ने तपाईं छान्नुहुन्छ, तपाईंले पाउनुपर्ने पैसा आइपुगेन भन्ने सूचनाबाहेक: ती सधैँ आउँछन्।',
    'account.toldLinkUnread': 'सूचनाहरू ({count} नपढिएका)',
    'account.toldPrefs': 'तपाईंलाई के जानकारी दिइने छान्नुहोस्',
    'account.dataHeading': 'मेरो डेटा',
    'account.dataBody':
      'यो खाताबारे हामीसँग भएको सबै कुरा एउटै फाइलमा डाउनलोड गर्नुहोस्: तपाईंको प्रोफाइल, तपाईं जिम्मेवार भएका सिकारुहरू, उनीहरूले पढेका र पूरा गरेका कुरा, तपाईंका प्रमाणपत्र, अर्डर र रसिदहरू, तपाईंका नोटहरू, र तपाईंले आफ्नो सिकाइ कोसँग साझा गर्नुभएको छ।',
    'account.dataDownload': 'मेरो डेटा डाउनलोड गर्नुहोस्',
    'account.dataSheet': 'स्प्रेडसिटका रूपमा',
    'account.dataPrint': 'पढ्नुहोस् वा छाप्नुहोस्',
    'account.dataMore':
      'अब यसमा पहिलेभन्दा बढी छ: छलफलका पोस्टहरू, समीक्षा र जाँचिएका काम, सहायताका केसहरू, तपाईंलाई पठाइएका सन्देशहरू, र — तपाईं पढाउनुहुन्छ भने — तपाईंको आम्दानी र भुक्तानीहरू।',
    'account.dataWhat': 'यसमा के छ, र के छुटाइएको छ',
    'account.dataRestore':
      'पहिले नै फाइल छ? तपाईंको प्रोफाइल, नोट र बुकमार्कहरू तपाईं भर्ना भएका पाठहरूमा फेरि राख्न सकिन्छ; भर्ना, प्रमाणपत्र र अर्डरहरू सकिँदैन, र त्यो पृष्ठले कारण बताउँछ।',
    'account.dataRestoreLink': 'फेरि राख्नुहोस्',
    'account.closeHeading': 'यो खाता बन्द गर्ने',
    'account.closeBody':
      'बन्द गर्दा तपाईंको प्रोफाइल परिवर्तन हुन्छ, केही व्यक्तिगत जानकारी हट्छ र तपाईंलाई साइन आउट गर्ने प्रयास गरिन्छ। अर्डर, भुक्तानी, भर्ना र प्रमाणपत्रहरू राखिन्छन्, किनभने रकम फिर्ता वा प्रमाणपत्र जाँचलाई ती अझै चाहिन्छ, र केही अन्य अभिलेख पनि बाँकी रहन्छन्। केही हुनुअघि पृष्ठले दुवै पक्ष सूचीबद्ध गर्छ।',
    'account.closeLink': 'यो खाता बन्द गर्नुहोस्',
  },
};
