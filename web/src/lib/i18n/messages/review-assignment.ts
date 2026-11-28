import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * One assignment (`/review/[assignmentId]`): what a learner would get from
 * the version under review, its outline, the answer to an offer, the
 * decision, and standing aside.
 *
 * Written on 2026-11-28, in the same twenty-seven languages as the
 * dashboard. **Written by the people who built the site and read by no
 * speaker.** A decision recorded here moves a course towards publication
 * and is the record a teacher appeals against, and a declaration made here
 * bars its reviewer at once, so a speaker's reading matters here more than
 * on most pages.
 *
 * A review, a conflict, a decision and the queue are named with the words
 * `/review` uses in each language (`messages/review.ts`), so that one thing
 * has one name; the page also says some of that part's sentences, and
 * "Sections", "Lessons", "Free preview" and "Transcript" are the keys other
 * pages already had. "Approve", "Reject" and "Decline" are this page's own:
 * the board's `panel.approve` and `panel.reject` are a vote ("for" and
 * "against" in most of these languages), and `merge.decline` is in many the
 * word for rejecting, which here is a decision about a course and not the
 * turning down of an offer. The two forms run in
 * the browser and are handed their words by the page; none is in a script.
 * A count follows a colon and is already in the reader's digits, so that no
 * word has to agree with it. French puts a no-break space before `:`, `;`
 * and `?`.
 *
 * `{lesson}` in the three `ra.next…` sentences is where the lesson's title
 * goes, in its own direction, and `{name}` in `ra.noCopy` is a file's name.
 */
export const REVIEW_ASSIGNMENT: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'ra.decisions': 'القرارات',
    'ra.gistHead': 'ما يحصل عليه المتعلّم',
    'ra.allOpen': 'كل درس يقدّم للمتعلّم شيئًا يفتحه. الدروس: {n}',
    'ra.someOpen': 'الدروس التي تقدّم للمتعلّم شيئًا يفتحه: {some} من {all}',
    'ra.nothing': 'الدروس التي لا تقدّم للمتعلّم شيئًا على الإطلاق: {n}',
    'ra.trouble': 'الدروس التي فيها ما يحسن معرفته قبل أن تصل إلى المتعلّم: {n}',
    'ra.nextEmpty':
      'يحسن فتحه أولًا: {lesson}. ليس فيه شيء على الإطلاق، فلا يجد المتعلّم إلا عنوانًا وصفحة فارغة.',
    'ra.nextSilent':
      'يبدو مكتملًا وليس كذلك: {lesson}. أُرفق به شيء، ولا يستطيع المتعلّم أن يفتح شيئًا منه.',
    'ra.nextNoted':
      'يستحق نظرة: {lesson}. يستطيع المتعلّم أن يستفيد منه، وفيه ما يحسن معرفته أولًا.',
    'ra.nextAlso': 'دروس أخرى في المرحلة نفسها: {n}',
    'ra.asLearner': 'شاهده كما يراه المتعلّم',
    'ra.deliveryUnknown':
      'تعذّرت الآن قراءة حالة ترميز الملفات المرفوعة، فالملف الذي يظهر بلا مشغّل قد يكون ملفًا لم يُسأل عنه أحد، لا ملفًا فشل ترميزه.',
    'ra.notVerdict':
      'هذا يبيّن ما سيجده المتعلّم، لا ما ينبغي أن تقرّره. القرار قرارك، وليس في شيء مما هنا سبب كافٍ وحده للقبول أو للاعتذار: المراجعة العلمية تنظر في ما يُدرَّس، وهذا ينظر في ما يصل.',
    'ra.outline': 'المخطط',
    'ra.noSections': 'ليس في هذه النسخة أقسام. لا يوجد ما يُراجَع، ولا يمكن نشرها.',
    'ra.noLessons': 'لا دروس.',
    'ra.bEmpty': 'لا شيء فيه',
    'ra.bSilent': 'لا شيء يُشغَّل',
    'ra.bNoted': 'يستحق نظرة',
    'ra.bReady': 'جاهز',
    'ra.noCopy':
      '{name}: لم تُرمَّز بعدُ نسخة للعرض، فلا يوجد ما يُشاهَد، وسيجد المتعلّم جملة في مكان المشغّل.',
    'ra.watchable':
      'يمكنك مشاهدة نسخ العرض لهذه الدروس ما دامت هذه المراجعة مفتوحة. لا يمكنك حفظها، والملف الذي رفعه المعلّم لا يُقدَّم لك: الذي يُراجَع هو ما سيراه المتعلّم.',
    'ra.notWatchable':
      'يمكن تشغيل الدروس من لحظة قبول المراجعة إلى أن تُغلق، ولذلك لا يمكن تشغيلها هنا الآن.',
    'ra.needsHead': 'ما تحتاج إليه هذه النسخة، وما جرى التحقق منه',
    'ra.english': 'اللوحتان التاليتان بالإنجليزية في الوقت الحاضر.',
    'ra.decisionHead': 'قرارك',
    'ra.backQueue': 'العودة إلى القائمة',
    'ra.unread': 'تعذّرت قراءة هذه المراجعة الآن. حاول مرة أخرى بعد قليل.',
    'ra.outlineUnread':
      'تعذّرت الآن قراءة مخطط هذه الدورة، ولذلك لا يُعرض. أعد تحميل الصفحة قبل أن تقرّر.',
    'ra.partUnread':
      'تعذّرت الآن قراءة جزء من هذه الصفحة، فهي غير مكتملة. أعد تحميلها قبل أن تقرّر.',
    'ra.offerHead': 'هذه المراجعة معروضة عليك',
    'ra.offerNote': 'لا يُنتظر منك شيء حتى تقبلها.',
    'ra.accept': 'اقبل هذه المراجعة',
    'ra.decline': 'اعتذر عنها',
    'ra.recordHead': 'سجّل قرارك',
    'ra.reason': 'السبب',
    'ra.reasonHint': 'ما الذي تحققت منه، وماذا وجدت؟ هذا هو السجل الذي قد يتظلّم منه المعلّم.',
    'ra.approve': 'وافق',
    'ra.revise': 'اطلب تعديلات',
    'ra.reject': 'ارفض',
    'ra.approveNote':
      'الموافقة تنقل النسخة إلى حالة «تمت الموافقة»، وعندها يستطيع فريق المنصة نشرها. لا يمكنك نشرها بنفسك، ولا الموافقة على دورة كتبتها أنت.',
    'ra.decided': 'لقد سجّلت قرارًا في هذه المراجعة من قبل.',
    'ra.closedNote': 'هذه المراجعة مغلقة، فلا يمكن تسجيل قرار فيها.',
    'ra.notMoved':
      'سُجّل قرارك. أما الدورة نفسها فتعذّر نقلها من هنا؛ فريق المنصة يرى قرارك ويستطيع نقلها. لا تحتاج إلى أن تقرّر مرة أخرى.',
    'ra.eNotYours': 'هذه المراجعة ليست لك.',
    'ra.eNotOpen': 'لم تعد هذه المراجعة مفتوحة لذلك. أعد تحميل الصفحة لترى أين وصلت.',
    'ra.eConflict': 'تعارض أفصحت عنه يمنعك من البتّ في هذه المراجعة.',
    'ra.eReason': 'اذكر سببًا للقرار.',
    'ra.eRefused': 'لم يُسجَّل. أعد تحميل الصفحة لترى أين وصلت المراجعة.',
    'ra.standHead': 'لا تستطيع مراجعتها بحياد؟',
    'ra.declared': 'أُفصح عنه',
    'ra.declareOpen': 'أفصح عن تعارض يخص هذه الدورة',
    'ra.declareNote':
      'الإفصاح يمنعك فورًا من البتّ في هذه المراجعة، ويبقى المنع قائمًا إلى أن ينظر فيه فريق المنصة. وهو لا يغلق المراجعة: إن كانت ما تزال عرضًا فاعتذر عنها أيضًا؛ وإلا فالفريق هو من يغلقها.',
  },
  ur: {
    'ra.decisions': 'فیصلے',
    'ra.gistHead': 'متعلم کو کیا ملتا ہے',
    'ra.allOpen': 'ہر سبق متعلم کو کھولنے کے لیے کچھ دیتا ہے۔ اسباق: {n}',
    'ra.someOpen': 'وہ اسباق جو متعلم کو کھولنے کے لیے کچھ دیتے ہیں: {all} میں سے {some}',
    'ra.nothing': 'وہ اسباق جو متعلم کو کچھ بھی نہیں دیتے: {n}',
    'ra.trouble': 'وہ اسباق جن کے بارے میں متعلم تک پہنچنے سے پہلے کچھ جان لینا بہتر ہے: {n}',
    'ra.nextEmpty':
      'پہلے اسے کھولنا بہتر ہے: {lesson}۔ اس میں کچھ بھی نہیں، اس لیے متعلم کو صرف ایک عنوان اور خالی صفحہ ملتا ہے۔',
    'ra.nextSilent':
      'مکمل لگتا ہے، مگر ہے نہیں: {lesson}۔ اس کے ساتھ کچھ منسلک ہے، اور متعلم اس میں سے کچھ بھی نہیں کھول سکتا۔',
    'ra.nextNoted':
      'ایک نظر ڈالنے کے لائق: {lesson}۔ متعلم اسے استعمال کر سکتا ہے، اور اس کے بارے میں پہلے کچھ جان لینا بہتر ہے۔',
    'ra.nextAlso': 'اسی مرحلے پر دوسرے اسباق: {n}',
    'ra.asLearner': 'اسے متعلم کی طرح دیکھیں',
    'ra.deliveryUnknown':
      'اپ لوڈ کی گئی فائلوں کی انکوڈنگ کی حالت ابھی نہیں پڑھی جا سکی، اس لیے جو فائل پلیئر کے بغیر دکھائی دے وہ ایسی بھی ہو سکتی ہے جس کے بارے میں کسی نے پوچھا ہی نہیں، نہ کہ ایسی جو ناکام ہوئی۔',
    'ra.notVerdict':
      'یہ بتاتا ہے کہ متعلم کو کیا ملے گا، یہ نہیں کہ کیا فیصلہ کیا جائے۔ فیصلہ آپ کا ہے، اور یہاں کی کوئی بات اکیلی قبول یا معذرت کرنے کی وجہ نہیں: علمی جائزہ اس بارے میں ہے کہ کیا پڑھایا جاتا ہے، اور یہ اس بارے میں کہ کیا پہنچتا ہے۔',
    'ra.outline': 'خاکہ',
    'ra.noSections':
      'اس نسخے میں کوئی حصہ نہیں۔ جائزہ لینے کو کچھ نہیں، اور اسے شائع نہیں کیا جا سکتا۔',
    'ra.noLessons': 'کوئی سبق نہیں۔',
    'ra.bEmpty': 'اس میں کچھ نہیں',
    'ra.bSilent': 'چلانے کو کچھ نہیں',
    'ra.bNoted': 'ایک نظر ڈالنے کے لائق',
    'ra.bReady': 'تیار',
    'ra.noCopy':
      '{name}: ابھی تک دکھانے کی کوئی نقل انکوڈ نہیں ہوئی، اس لیے دیکھنے کو کچھ نہیں، اور متعلم کو پلیئر کی جگہ ایک جملہ ملے گا۔',
    'ra.watchable':
      'جب تک یہ جائزہ کھلا ہے آپ ان اسباق کی دکھانے والی نقلیں دیکھ سکتے ہیں۔ آپ انہیں محفوظ نہیں کر سکتے، اور استاد کی اپ لوڈ کی ہوئی فائل آپ کو نہیں دی جاتی: جائزہ اسی چیز کا ہے جو متعلم دیکھے گا۔',
    'ra.notWatchable':
      'اسباق جائزہ قبول ہونے کے لمحے سے اس کے بند ہونے تک چلائے جا سکتے ہیں، اس لیے وہ ابھی یہاں نہیں چلائے جا سکتے۔',
    'ra.needsHead': 'اس نسخے کو کیا درکار ہے، اور کیا جانچا جا چکا ہے',
    'ra.english': 'نیچے کے دونوں خانے فی الحال انگریزی میں ہیں۔',
    'ra.decisionHead': 'آپ کا فیصلہ',
    'ra.backQueue': 'قطار پر واپس',
    'ra.unread': 'یہ جائزہ ابھی نہیں پڑھا جا سکا۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    'ra.outlineUnread':
      'اس کورس کا خاکہ ابھی نہیں پڑھا جا سکا، اس لیے وہ نہیں دکھایا گیا۔ فیصلہ کرنے سے پہلے صفحہ دوبارہ کھولیں۔',
    'ra.partUnread':
      'اس صفحے کا کچھ حصہ ابھی نہیں پڑھا جا سکا، اس لیے یہ نامکمل ہے۔ فیصلہ کرنے سے پہلے اسے دوبارہ کھولیں۔',
    'ra.offerHead': 'یہ جائزہ آپ کو پیش کیا گیا ہے',
    'ra.offerNote': 'جب تک آپ اسے قبول نہ کریں، آپ سے کچھ متوقع نہیں۔',
    'ra.accept': 'یہ جائزہ قبول کریں',
    'ra.decline': 'معذرت کریں',
    'ra.recordHead': 'اپنا فیصلہ درج کریں',
    'ra.reason': 'وجہ',
    'ra.reasonHint':
      'آپ نے کیا جانچا، اور کیا پایا؟ یہی وہ ریکارڈ ہے جس کے خلاف استاد اپیل کر سکتا ہے۔',
    'ra.approve': 'منظور کریں',
    'ra.revise': 'ترامیم طلب کریں',
    'ra.reject': 'مسترد کریں',
    'ra.approveNote':
      'منظوری نسخے کو «منظور شدہ» حالت میں لے جاتی ہے، جہاں پلیٹ فارم کا عملہ اسے شائع کر سکتا ہے۔ آپ اسے خود شائع نہیں کر سکتے، اور نہ اپنے لکھے ہوئے کورس کو منظور کر سکتے ہیں۔',
    'ra.decided': 'آپ اس جائزے پر پہلے ہی فیصلہ درج کر چکے ہیں۔',
    'ra.closedNote': 'یہ جائزہ بند ہے، اس لیے اس پر کوئی فیصلہ درج نہیں ہو سکتا۔',
    'ra.notMoved':
      'آپ کا فیصلہ درج ہو گیا۔ خود کورس کو یہاں سے آگے نہیں بڑھایا جا سکا؛ پلیٹ فارم کا عملہ آپ کا فیصلہ دیکھ سکتا ہے اور اسے آگے بڑھا سکتا ہے۔ آپ کو دوبارہ فیصلہ کرنے کی ضرورت نہیں۔',
    'ra.eNotYours': 'یہ جائزہ آپ کا نہیں۔',
    'ra.eNotOpen':
      'یہ جائزہ اب اس کام کے لیے کھلا نہیں۔ صفحہ دوبارہ کھولیں اور دیکھیں کہ یہ کہاں کھڑا ہے۔',
    'ra.eConflict': 'آپ کا اعلان کردہ ایک تعارض آپ کو اس جائزے کا فیصلہ کرنے سے روکتا ہے۔',
    'ra.eReason': 'فیصلے کی وجہ بتائیں۔',
    'ra.eRefused': 'یہ درج نہیں ہوا۔ صفحہ دوبارہ کھولیں اور دیکھیں کہ جائزہ کہاں کھڑا ہے۔',
    'ra.standHead': 'اس کا غیر جانب دارانہ جائزہ نہیں لے سکتے؟',
    'ra.declared': 'اعلان ہو گیا',
    'ra.declareOpen': 'اس کورس کے بارے میں تعارض کا اعلان کریں',
    'ra.declareNote':
      'اعلان آپ کو فوراً اس جائزے کا فیصلہ کرنے سے روک دیتا ہے، اور تب تک روکے رکھتا ہے جب تک پلیٹ فارم کا عملہ اسے سن نہ لے۔ یہ جائزے کو بند نہیں کرتا: اگر یہ ابھی پیشکش ہے تو اس سے معذرت بھی کریں؛ ورنہ عملہ اسے بند کرتا ہے۔',
  },
  fa: {
    'ra.decisions': 'تصمیم‌ها',
    'ra.gistHead': 'آنچه به یادگیرنده می‌رسد',
    'ra.allOpen': 'هر درس چیزی برای باز کردن به یادگیرنده می‌دهد. درس‌ها: {n}',
    'ra.someOpen': 'درس‌هایی که چیزی برای باز کردن به یادگیرنده می‌دهند: {some} از {all}',
    'ra.nothing': 'درس‌هایی که هیچ چیزی به یادگیرنده نمی‌دهند: {n}',
    'ra.trouble': 'درس‌هایی که بهتر است پیش از رسیدن به یادگیرنده چیزی درباره‌شان دانسته شود: {n}',
    'ra.nextEmpty':
      'بهتر است اول این باز شود: {lesson}. هیچ چیزی در آن نیست، پس یادگیرنده فقط یک عنوان و یک صفحهٔ خالی می‌بیند.',
    'ra.nextSilent':
      'تمام‌شده به نظر می‌رسد و نیست: {lesson}. چیزی به آن پیوست شده است و یادگیرنده هیچ‌کدام را نمی‌تواند باز کند.',
    'ra.nextNoted':
      'ارزش یک نگاه را دارد: {lesson}. یادگیرنده می‌تواند از آن استفاده کند، و چیزی درباره‌اش هست که بهتر است اول دانسته شود.',
    'ra.nextAlso': 'درس‌های دیگر در همین مرحله: {n}',
    'ra.asLearner': 'آن را مثل یادگیرنده ببینید',
    'ra.deliveryUnknown':
      'وضعیت رمزگذاری فایل‌های بارگذاری‌شده اکنون خوانده نشد، پس فایلی که بدون پخش‌کننده دیده می‌شود ممکن است فایلی باشد که کسی درباره‌اش نپرسیده، نه فایلی که ناموفق بوده است.',
    'ra.notVerdict':
      'این می‌گوید یادگیرنده با چه روبه‌رو می‌شود، نه اینکه چه تصمیمی بگیرید. تصمیم با شماست، و هیچ‌چیز در اینجا به‌تنهایی دلیلی برای پذیرفتن یا نپذیرفتن نیست: بازبینی علمی دربارهٔ چیزی است که آموزش داده می‌شود، و این دربارهٔ چیزی است که می‌رسد.',
    'ra.outline': 'طرح کلی',
    'ra.noSections': 'این نسخه هیچ بخشی ندارد. چیزی برای بازبینی نیست، و نمی‌توان آن را منتشر کرد.',
    'ra.noLessons': 'درسی نیست.',
    'ra.bEmpty': 'چیزی در آن نیست',
    'ra.bSilent': 'چیزی برای پخش نیست',
    'ra.bNoted': 'ارزش یک نگاه را دارد',
    'ra.bReady': 'آماده',
    'ra.noCopy':
      '{name}: هنوز نسخهٔ نمایشی رمزگذاری نشده است، پس چیزی برای تماشا نیست و یادگیرنده به‌جای پخش‌کننده یک جمله می‌بیند.',
    'ra.watchable':
      'تا وقتی این بازبینی باز است می‌توانید نسخه‌های نمایشی این درس‌ها را تماشا کنید. نمی‌توانید آن‌ها را ذخیره کنید، و فایلی که معلم بارگذاری کرده به شما داده نمی‌شود: آنچه بازبینی می‌شود همان است که یادگیرنده خواهد دید.',
    'ra.notWatchable':
      'درس‌ها از لحظهٔ پذیرفتن بازبینی تا بسته شدن آن قابل پخش‌اند، پس اکنون در اینجا پخش نمی‌شوند.',
    'ra.needsHead': 'آنچه این نسخه لازم دارد، و آنچه بررسی شده است',
    'ra.english': 'دو بخش زیر فعلاً به انگلیسی است.',
    'ra.decisionHead': 'تصمیم شما',
    'ra.backQueue': 'بازگشت به صف',
    'ra.unread': 'این بازبینی اکنون خوانده نشد. کمی بعد دوباره تلاش کنید.',
    'ra.outlineUnread':
      'طرح کلی این دوره اکنون خوانده نشد، پس نشان داده نمی‌شود. پیش از تصمیم‌گیری صفحه را دوباره بار کنید.',
    'ra.partUnread':
      'بخشی از این صفحه اکنون خوانده نشد، پس کامل نیست. پیش از تصمیم‌گیری آن را دوباره بار کنید.',
    'ra.offerHead': 'این بازبینی به شما پیشنهاد شده است',
    'ra.offerNote': 'تا آن را نپذیرید، چیزی از شما انتظار نمی‌رود.',
    'ra.accept': 'این بازبینی را بپذیرید',
    'ra.decline': 'نپذیرفتن',
    'ra.recordHead': 'تصمیم خود را ثبت کنید',
    'ra.reason': 'دلیل',
    'ra.reasonHint':
      'چه چیزی را بررسی کردید و چه یافتید؟ این همان سابقه‌ای است که معلم می‌تواند به آن اعتراض کند.',
    'ra.approve': 'تأیید',
    'ra.revise': 'درخواست اصلاح',
    'ra.reject': 'رد',
    'ra.approveNote':
      'تأیید، نسخه را به وضعیت «تأییدشده» می‌برد و آنجا کارکنان سکو می‌توانند منتشرش کنند. خودتان نمی‌توانید آن را منتشر کنید، و نمی‌توانید دوره‌ای را که خودتان نوشته‌اید تأیید کنید.',
    'ra.decided': 'شما پیش‌تر دربارهٔ این بازبینی تصمیمی ثبت کرده‌اید.',
    'ra.closedNote': 'این بازبینی بسته است، پس نمی‌توان تصمیمی برای آن ثبت کرد.',
    'ra.notMoved':
      'تصمیم شما ثبت شد. خودِ دوره از اینجا جلو برده نشد؛ کارکنان سکو تصمیم شما را می‌بینند و می‌توانند آن را جلو ببرند. لازم نیست دوباره تصمیم بگیرید.',
    'ra.eNotYours': 'این بازبینی از آنِ شما نیست.',
    'ra.eNotOpen':
      'این بازبینی دیگر برای این کار باز نیست. صفحه را دوباره بار کنید تا ببینید در چه وضعی است.',
    'ra.eConflict': 'تعارضی که اعلام کرده‌اید مانع تصمیم‌گیری شما دربارهٔ این بازبینی است.',
    'ra.eReason': 'برای تصمیم دلیلی بنویسید.',
    'ra.eRefused': 'ثبت نشد. صفحه را دوباره بار کنید تا ببینید بازبینی در چه وضعی است.',
    'ra.standHead': 'نمی‌توانید بی‌طرفانه بازبینی کنید؟',
    'ra.declared': 'اعلام شد',
    'ra.declareOpen': 'اعلام تعارض دربارهٔ این دوره',
    'ra.declareNote':
      'اعلام، بی‌درنگ مانع تصمیم‌گیری شما دربارهٔ این بازبینی می‌شود و تا وقتی کارکنان سکو به آن رسیدگی کنند مانع می‌ماند. بازبینی را نمی‌بندد: اگر هنوز پیشنهاد است، آن را هم نپذیرید؛ وگرنه کارکنان آن را می‌بندند.',
  },
  'fa-af': {
    'ra.decisions': 'تصمیم‌ها',
    'ra.gistHead': 'آنچه به یادگیرنده می‌رسد',
    'ra.allOpen': 'هر درس چیزی برای باز کردن به یادگیرنده می‌دهد. درس‌ها: {n}',
    'ra.someOpen': 'درس‌هایی که چیزی برای باز کردن به یادگیرنده می‌دهند: {some} از {all}',
    'ra.nothing': 'درس‌هایی که هیچ چیزی به یادگیرنده نمی‌دهند: {n}',
    'ra.trouble': 'درس‌هایی که بهتر است پیش از رسیدن به یادگیرنده چیزی درباره‌شان دانسته شود: {n}',
    'ra.nextEmpty':
      'بهتر است اول این باز شود: {lesson}. هیچ چیزی در آن نیست، پس یادگیرنده تنها یک عنوان و یک صفحهٔ خالی می‌بیند.',
    'ra.nextSilent':
      'تمام‌شده معلوم می‌شود و نیست: {lesson}. چیزی به آن ضمیمه شده است و یادگیرنده هیچ‌کدام را باز کرده نمی‌تواند.',
    'ra.nextNoted':
      'به یک نگاه می‌ارزد: {lesson}. یادگیرنده می‌تواند از آن استفاده کند، و چیزی درباره‌اش است که بهتر است اول دانسته شود.',
    'ra.nextAlso': 'درس‌های دیگر در همین مرحله: {n}',
    'ra.asLearner': 'آن را مانند یادگیرنده ببینید',
    'ra.deliveryUnknown':
      'حالت رمزگذاری فایل‌های بارشده فعلاً خوانده نشد، پس فایلی که بدون پخش‌کننده دیده می‌شود شاید فایلی باشد که کسی درباره‌اش نپرسیده، نه فایلی که ناکام شده است.',
    'ra.notVerdict':
      'این می‌گوید یادگیرنده با چه روبه‌رو می‌شود، نه اینکه چه تصمیم بگیرید. تصمیم از شماست، و هیچ‌چیز در اینجا به تنهایی دلیلی برای پذیرفتن یا رد کردن نیست: بازبینی علمی دربارهٔ چیزی است که تدریس می‌شود، و این دربارهٔ چیزی است که می‌رسد.',
    'ra.outline': 'طرح کلی',
    'ra.noSections': 'این نسخه هیچ بخشی ندارد. چیزی برای بازبینی نیست، و نشر شده نمی‌تواند.',
    'ra.noLessons': 'درسی نیست.',
    'ra.bEmpty': 'چیزی در آن نیست',
    'ra.bSilent': 'چیزی برای پخش نیست',
    'ra.bNoted': 'به یک نگاه می‌ارزد',
    'ra.bReady': 'آماده',
    'ra.noCopy':
      '{name}: هنوز نسخهٔ نمایشی رمزگذاری نشده است، پس چیزی برای تماشا نیست و یادگیرنده به جای پخش‌کننده یک جمله می‌بیند.',
    'ra.watchable':
      'تا وقتی این بازبینی باز است می‌توانید نسخه‌های نمایشی این درس‌ها را تماشا کنید. آن‌ها را ذخیره کرده نمی‌توانید، و فایلی که استاد بار کرده به شما داده نمی‌شود: آنچه بازبینی می‌شود همان است که یادگیرنده خواهد دید.',
    'ra.notWatchable':
      'درس‌ها از لحظهٔ پذیرفتن بازبینی تا بسته شدن آن پخش شده می‌توانند، پس فعلاً در اینجا پخش نمی‌شوند.',
    'ra.needsHead': 'آنچه این نسخه ضرورت دارد، و آنچه بررسی شده است',
    'ra.english': 'دو بخش زیر فعلاً به انگلیسی است.',
    'ra.decisionHead': 'تصمیم شما',
    'ra.backQueue': 'بازگشت به صف',
    'ra.unread': 'این بازبینی فعلاً خوانده نشد. کمی بعد دوباره کوشش کنید.',
    'ra.outlineUnread':
      'طرح کلی این دوره فعلاً خوانده نشد، پس نشان داده نمی‌شود. پیش از تصمیم‌گیری صفحه را دوباره باز کنید.',
    'ra.partUnread':
      'بخشی از این صفحه فعلاً خوانده نشد، پس کامل نیست. پیش از تصمیم‌گیری آن را دوباره باز کنید.',
    'ra.offerHead': 'این بازبینی به شما پیشنهاد شده است',
    'ra.offerNote': 'تا آن را نپذیرید، چیزی از شما توقع نمی‌رود.',
    'ra.accept': 'این بازبینی را بپذیرید',
    'ra.decline': 'نپذیرفتن',
    'ra.recordHead': 'تصمیم خود را ثبت کنید',
    'ra.reason': 'دلیل',
    'ra.reasonHint':
      'چه چیزی را بررسی کردید و چه یافتید؟ این همان سابقه‌ای است که استاد می‌تواند بر آن اعتراض کند.',
    'ra.approve': 'تأیید',
    'ra.revise': 'درخواست اصلاح',
    'ra.reject': 'رد',
    'ra.approveNote':
      'تأیید، نسخه را به حالت «تأییدشده» می‌برد و آنجا کارمندان پلتفرم می‌توانند نشرش کنند. خودتان آن را نشر کرده نمی‌توانید، و دوره‌ای را که خودتان نوشته‌اید تأیید کرده نمی‌توانید.',
    'ra.decided': 'شما پیش‌تر دربارهٔ این بازبینی تصمیمی ثبت کرده‌اید.',
    'ra.closedNote': 'این بازبینی بسته است، پس تصمیمی برای آن ثبت شده نمی‌تواند.',
    'ra.notMoved':
      'تصمیم شما ثبت شد. خودِ دوره از اینجا پیش برده نشد؛ کارمندان پلتفرم تصمیم شما را می‌بینند و می‌توانند آن را پیش ببرند. لازم نیست دوباره تصمیم بگیرید.',
    'ra.eNotYours': 'این بازبینی از شما نیست.',
    'ra.eNotOpen':
      'این بازبینی دیگر برای این کار باز نیست. صفحه را دوباره باز کنید تا ببینید در چه حالت است.',
    'ra.eConflict': 'تعارضی که اعلام کرده‌اید مانع تصمیم‌گیری شما دربارهٔ این بازبینی است.',
    'ra.eReason': 'برای تصمیم دلیلی بنویسید.',
    'ra.eRefused': 'ثبت نشد. صفحه را دوباره باز کنید تا ببینید بازبینی در چه حالت است.',
    'ra.standHead': 'بی‌طرفانه بازبینی کرده نمی‌توانید؟',
    'ra.declared': 'اعلام شد',
    'ra.declareOpen': 'اعلام تعارض دربارهٔ این دوره',
    'ra.declareNote':
      'اعلام، فوراً مانع تصمیم‌گیری شما دربارهٔ این بازبینی می‌شود و تا وقتی کارمندان پلتفرم به آن رسیدگی کنند مانع می‌ماند. بازبینی را نمی‌بندد: اگر هنوز پیشنهاد است، آن را هم رد کنید؛ ورنه کارمندان آن را می‌بندند.',
  },
  tr: {
    'ra.decisions': 'Kararlar',
    'ra.gistHead': 'Öğrenenin eline ne geçiyor',
    'ra.allOpen': 'Her ders öğrenene açabileceği bir şey veriyor. Dersler: {n}',
    'ra.someOpen': 'Öğrenene açabileceği bir şey veren dersler: {some} / {all}',
    'ra.nothing': 'Öğrenene hiçbir şey vermeyen dersler: {n}',
    'ra.trouble': 'Öğrenene ulaşmadan önce bilinmesinde yarar olan bir şeyi bulunan dersler: {n}',
    'ra.nextEmpty':
      'Önce bunu açmakta yarar var: {lesson}. İçinde hiçbir şey yok; öğrenen bir başlık ve boş bir sayfa görüyor.',
    'ra.nextSilent':
      'Bitmiş görünüyor ama değil: {lesson}. Ona bir şey eklenmiş, ama öğrenen bunların hiçbirini açamıyor.',
    'ra.nextNoted':
      'Bir göz atmaya değer: {lesson}. Öğrenen onu kullanabiliyor, ama önce bilinmesinde yarar olan bir şey var.',
    'ra.nextAlso': 'Aynı aşamadaki diğer dersler: {n}',
    'ra.asLearner': 'Öğrenen gibi gör',
    'ra.deliveryUnknown':
      'Yüklenen dosyaların kodlama durumu şu anda okunamadı; bu yüzden oynatıcısız görünen bir dosya, başarısız olmuş bir dosya değil, hakkında kimsenin soru sormadığı bir dosya olabilir.',
    'ra.notVerdict':
      'Bu, öğrenenin neyle karşılaşacağını söyler, neye karar verileceğini değil. Karar sizindir ve buradaki hiçbir şey tek başına kabul etmek ya da geri çevirmek için bir neden değildir: ilmî değerlendirme neyin öğretildiğiyle, bu ise neyin ulaştığıyla ilgilidir.',
    'ra.outline': 'Ana hat',
    'ra.noSections': 'Bu sürümde hiç bölüm yok. Değerlendirilecek bir şey yok ve yayımlanamaz.',
    'ra.noLessons': 'Ders yok.',
    'ra.bEmpty': 'İçinde bir şey yok',
    'ra.bSilent': 'Oynatılacak bir şey yok',
    'ra.bNoted': 'Bir göz atmaya değer',
    'ra.bReady': 'Hazır',
    'ra.noCopy':
      '{name}: henüz bir gösterim kopyası kodlanmadı; bu yüzden izlenecek bir şey yok ve öğrenen oynatıcının yerinde bir cümle görür.',
    'ra.watchable':
      'Bu değerlendirme açık olduğu sürece bu derslerin gösterim kopyalarını izleyebilirsiniz. Onları kaydedemezsiniz ve öğretmenin yüklediği dosya size sunulmaz: değerlendirilen şey, öğrenenin göreceği şeydir.',
    'ra.notWatchable':
      'Dersler, değerlendirmenin kabul edildiği andan kapatıldığı ana kadar oynatılabilir; bu yüzden şu anda burada oynatılamaz.',
    'ra.needsHead': 'Bu sürümün neye ihtiyacı var ve neler denetlendi',
    'ra.english': 'Aşağıdaki iki bölüm şimdilik İngilizce.',
    'ra.decisionHead': 'Kararınız',
    'ra.backQueue': 'Sıraya dön',
    'ra.unread': 'Bu değerlendirme şu anda okunamadı. Biraz sonra yeniden deneyin.',
    'ra.outlineUnread':
      'Bu kursun ana hattı şu anda okunamadı; bu yüzden gösterilmiyor. Karar vermeden önce sayfayı yeniden yükleyin.',
    'ra.partUnread':
      'Bu sayfanın bir kısmı şu anda okunamadı; bu yüzden eksik. Karar vermeden önce yeniden yükleyin.',
    'ra.offerHead': 'Bu değerlendirme size teklif edildi',
    'ra.offerNote': 'Kabul edene kadar sizden bir şey beklenmiyor.',
    'ra.accept': 'Bu değerlendirmeyi kabul et',
    'ra.decline': 'Geri çevir',
    'ra.recordHead': 'Kararınızı kaydedin',
    'ra.reason': 'Gerekçe',
    'ra.reasonHint': 'Neyi denetlediniz ve ne buldunuz? Bu, öğretmenin itiraz edeceği kayıttır.',
    'ra.approve': 'Onayla',
    'ra.revise': 'Düzeltme iste',
    'ra.reject': 'Reddet',
    'ra.approveNote':
      'Onaylamak sürümü “onaylandı” durumuna taşır; orada platform görevlileri onu yayımlayabilir. Onu kendiniz yayımlayamazsınız ve kendi yazdığınız bir kursu onaylayamazsınız.',
    'ra.decided': 'Bu değerlendirme için zaten bir karar kaydettiniz.',
    'ra.closedNote': 'Bu değerlendirme kapalı; bu yüzden ona karar kaydedilemez.',
    'ra.notMoved':
      'Kararınız kaydedildi. Kursun kendisi buradan ilerletilemedi; platform görevlileri kararınızı görebilir ve kursu ilerletebilir. Yeniden karar vermeniz gerekmez.',
    'ra.eNotYours': 'Bu değerlendirme sizin değil.',
    'ra.eNotOpen':
      'Bu değerlendirme artık buna açık değil. Ne durumda olduğunu görmek için sayfayı yeniden yükleyin.',
    'ra.eConflict':
      'Beyan ettiğiniz bir çıkar çatışması bu değerlendirmede karar vermenize engel oluyor.',
    'ra.eReason': 'Karar için bir gerekçe yazın.',
    'ra.eRefused':
      'Kaydedilmedi. Değerlendirmenin ne durumda olduğunu görmek için sayfayı yeniden yükleyin.',
    'ra.standHead': 'Bunu tarafsızca değerlendiremiyor musunuz?',
    'ra.declared': 'Beyan edildi',
    'ra.declareOpen': 'Bu kursla ilgili bir çıkar çatışması beyan et',
    'ra.declareNote':
      'Beyan, bu değerlendirmede karar vermenizi hemen engeller ve platform görevlileri onu ele alana kadar engellemeyi sürdürür. Değerlendirmeyi kapatmaz: hâlâ bir teklifse onu ayrıca geri çevirin; değilse görevliler kapatır.',
  },
  id: {
    'ra.decisions': 'Keputusan',
    'ra.gistHead': 'Apa yang didapat pelajar',
    'ra.allOpen': 'Setiap pelajaran memberi pelajar sesuatu untuk dibuka. Pelajaran: {n}',
    'ra.someOpen': 'Pelajaran yang memberi pelajar sesuatu untuk dibuka: {some} dari {all}',
    'ra.nothing': 'Pelajaran yang tidak memberi pelajar apa pun: {n}',
    'ra.trouble': 'Pelajaran dengan hal yang perlu diketahui sebelum sampai ke pelajar: {n}',
    'ra.nextEmpty':
      'Sebaiknya dibuka lebih dulu: {lesson}. Tidak ada isinya sama sekali, jadi pelajar hanya mendapat judul dan halaman kosong.',
    'ra.nextSilent':
      'Tampak selesai, padahal belum: {lesson}. Ada sesuatu yang dilampirkan, dan pelajar tidak dapat membuka satu pun.',
    'ra.nextNoted':
      'Layak dilihat: {lesson}. Pelajar dapat memakainya, dan ada hal tentangnya yang perlu diketahui lebih dulu.',
    'ra.nextAlso': 'Pelajaran lain pada tahap yang sama: {n}',
    'ra.asLearner': 'Lihat sebagai pelajar',
    'ra.deliveryUnknown':
      'Status pengodean berkas yang diunggah tidak dapat dibaca saat ini, jadi berkas yang tampil tanpa pemutar mungkin berkas yang belum ditanyakan siapa pun, bukan berkas yang gagal.',
    'ra.notVerdict':
      'Ini menyatakan apa yang akan ditemui pelajar, bukan apa yang harus diputuskan. Keputusan ada di tangan Anda, dan tidak ada hal di sini yang dengan sendirinya menjadi alasan untuk menerima atau menolak: tinjauan keilmuan adalah tentang apa yang diajarkan, sedangkan ini tentang apa yang sampai.',
    'ra.outline': 'Kerangka',
    'ra.noSections':
      'Versi ini tidak memiliki bagian. Tidak ada yang dapat ditinjau, dan versi ini tidak dapat diterbitkan.',
    'ra.noLessons': 'Tidak ada pelajaran.',
    'ra.bEmpty': 'Tidak ada isinya',
    'ra.bSilent': 'Tidak ada yang dapat diputar',
    'ra.bNoted': 'Layak dilihat',
    'ra.bReady': 'Siap',
    'ra.noCopy':
      '{name}: belum ada salinan tayang yang dikodekan, jadi tidak ada yang dapat ditonton, dan pelajar akan mendapat sebuah kalimat di tempat pemutar.',
    'ra.watchable':
      'Anda dapat menonton salinan tayang pelajaran-pelajaran ini selama tinjauan ini terbuka. Anda tidak dapat menyimpannya, dan berkas yang diunggah guru tidak disajikan kepada Anda: yang ditinjau adalah apa yang akan dilihat pelajar.',
    'ra.notWatchable':
      'Pelajaran dapat diputar sejak tinjauan diterima sampai tinjauan ditutup, jadi sekarang tidak dapat diputar di sini.',
    'ra.needsHead': 'Apa yang dibutuhkan versi ini, dan apa yang sudah diperiksa',
    'ra.english': 'Dua panel di bawah ini untuk sementara berbahasa Inggris.',
    'ra.decisionHead': 'Keputusan Anda',
    'ra.backQueue': 'Kembali ke antrean',
    'ra.unread': 'Tinjauan ini tidak dapat dibaca saat ini. Coba lagi sebentar lagi.',
    'ra.outlineUnread':
      'Kerangka kursus ini tidak dapat dibaca saat ini, jadi tidak ditampilkan. Muat ulang halaman sebelum Anda memutuskan.',
    'ra.partUnread':
      'Sebagian halaman ini tidak dapat dibaca saat ini, jadi belum lengkap. Muat ulang sebelum Anda memutuskan.',
    'ra.offerHead': 'Tinjauan ini ditawarkan kepada Anda',
    'ra.offerNote': 'Tidak ada yang diharapkan dari Anda sampai Anda menerimanya.',
    'ra.accept': 'Terima tinjauan ini',
    'ra.decline': 'Tolak tawaran',
    'ra.recordHead': 'Catat keputusan Anda',
    'ra.reason': 'Alasan',
    'ra.reasonHint':
      'Apa yang Anda periksa, dan apa yang Anda temukan? Inilah catatan yang dapat digugat oleh guru.',
    'ra.approve': 'Setujui',
    'ra.revise': 'Minta revisi',
    'ra.reject': 'Tolak',
    'ra.approveNote':
      'Menyetujui memindahkan versi ke status “disetujui”, dan di sana staf platform dapat menerbitkannya. Anda tidak dapat menerbitkannya sendiri, dan Anda tidak dapat menyetujui kursus yang Anda tulis.',
    'ra.decided': 'Anda sudah mencatat keputusan untuk tinjauan ini.',
    'ra.closedNote': 'Tinjauan ini sudah ditutup, jadi keputusan tidak dapat dicatat padanya.',
    'ra.notMoved':
      'Keputusan Anda sudah dicatat. Kursusnya sendiri tidak dapat dipindahkan dari sini; staf platform dapat melihat keputusan Anda dan memindahkannya. Anda tidak perlu memutuskan lagi.',
    'ra.eNotYours': 'Tinjauan itu bukan milik Anda.',
    'ra.eNotOpen':
      'Tinjauan ini tidak lagi terbuka untuk hal itu. Muat ulang halaman untuk melihat keadaannya.',
    'ra.eConflict':
      'Benturan kepentingan yang Anda nyatakan menghalangi Anda memutuskan tinjauan ini.',
    'ra.eReason': 'Berikan alasan untuk keputusan itu.',
    'ra.eRefused': 'Tidak dicatat. Muat ulang halaman untuk melihat keadaan tinjauan ini.',
    'ra.standHead': 'Tidak dapat meninjau ini secara tidak memihak?',
    'ra.declared': 'Dinyatakan',
    'ra.declareOpen': 'Nyatakan benturan kepentingan tentang kursus ini',
    'ra.declareNote':
      'Pernyataan langsung menghalangi Anda memutuskan tinjauan ini, dan terus menghalangi sampai staf platform menanganinya. Pernyataan tidak menutup tinjauan: jika masih berupa tawaran, tolak juga tawaran itu; jika tidak, staf yang menutupnya.',
  },
  ms: {
    'ra.decisions': 'Keputusan',
    'ra.gistHead': 'Apa yang pelajar dapat',
    'ra.allOpen': 'Setiap pelajaran memberi pelajar sesuatu untuk dibuka. Pelajaran: {n}',
    'ra.someOpen': 'Pelajaran yang memberi pelajar sesuatu untuk dibuka: {some} daripada {all}',
    'ra.nothing': 'Pelajaran yang tidak memberi pelajar apa-apa langsung: {n}',
    'ra.trouble':
      'Pelajaran dengan perkara yang wajar diketahui sebelum sampai kepada pelajar: {n}',
    'ra.nextEmpty':
      'Elok dibuka dahulu: {lesson}. Tiada apa-apa langsung di dalamnya, jadi pelajar hanya mendapat tajuk dan halaman kosong.',
    'ra.nextSilent':
      'Nampak siap, tetapi belum: {lesson}. Ada sesuatu yang dilampirkan, dan pelajar tidak dapat membuka satu pun.',
    'ra.nextNoted':
      'Wajar dilihat: {lesson}. Pelajar boleh menggunakannya, dan ada perkara tentangnya yang wajar diketahui dahulu.',
    'ra.nextAlso': 'Pelajaran lain pada peringkat yang sama: {n}',
    'ra.asLearner': 'Lihat sebagai pelajar',
    'ra.deliveryUnknown':
      'Status pengekodan fail yang dimuat naik tidak dapat dibaca sekarang, jadi fail yang dipaparkan tanpa pemain mungkin fail yang belum ditanya oleh sesiapa, bukan fail yang gagal.',
    'ra.notVerdict':
      'Ini menyatakan apa yang akan ditemui pelajar, bukan apa yang perlu diputuskan. Keputusan itu milik anda, dan tiada apa-apa di sini yang dengan sendirinya menjadi sebab untuk menerima atau menolak: semakan ilmiah adalah tentang apa yang diajar, dan ini tentang apa yang sampai.',
    'ra.outline': 'Rangka',
    'ra.noSections':
      'Versi ini tidak mempunyai bahagian. Tiada apa-apa untuk disemak, dan versi ini tidak boleh diterbitkan.',
    'ra.noLessons': 'Tiada pelajaran.',
    'ra.bEmpty': 'Tiada apa-apa di dalamnya',
    'ra.bSilent': 'Tiada apa-apa untuk dimainkan',
    'ra.bNoted': 'Wajar dilihat',
    'ra.bReady': 'Sedia',
    'ra.noCopy':
      '{name}: belum ada salinan tayangan yang dikodkan, jadi tiada apa-apa untuk ditonton, dan pelajar akan mendapat satu ayat di tempat pemain.',
    'ra.watchable':
      'Anda boleh menonton salinan tayangan pelajaran ini selagi semakan ini terbuka. Anda tidak boleh menyimpannya, dan fail yang dimuat naik oleh guru tidak dihidangkan kepada anda: yang disemak ialah apa yang akan dilihat oleh pelajar.',
    'ra.notWatchable':
      'Pelajaran boleh dimainkan dari saat semakan diterima hingga semakan ditutup, jadi pelajaran tidak boleh dimainkan di sini sekarang.',
    'ra.needsHead': 'Apa yang diperlukan oleh versi ini, dan apa yang telah diperiksa',
    'ra.english': 'Dua panel di bawah buat masa ini dalam bahasa Inggeris.',
    'ra.decisionHead': 'Keputusan anda',
    'ra.backQueue': 'Kembali ke barisan',
    'ra.unread': 'Semakan ini tidak dapat dibaca sekarang. Cuba lagi sebentar lagi.',
    'ra.outlineUnread':
      'Rangka kursus ini tidak dapat dibaca sekarang, jadi rangka itu tidak dipaparkan. Muat semula halaman sebelum anda membuat keputusan.',
    'ra.partUnread':
      'Sebahagian halaman ini tidak dapat dibaca sekarang, jadi halaman ini tidak lengkap. Muat semula sebelum anda membuat keputusan.',
    'ra.offerHead': 'Semakan ini ditawarkan kepada anda',
    'ra.offerNote': 'Tiada apa-apa yang diharapkan sehingga anda menerimanya.',
    'ra.accept': 'Terima semakan ini',
    'ra.decline': 'Tolak tawaran',
    'ra.recordHead': 'Rekodkan keputusan anda',
    'ra.reason': 'Sebab',
    'ra.reasonHint':
      'Apa yang anda periksa, dan apa yang anda dapati? Inilah rekod yang boleh dirayu oleh guru.',
    'ra.approve': 'Luluskan',
    'ra.revise': 'Minta semakan semula',
    'ra.reject': 'Tolak',
    'ra.approveNote':
      'Meluluskan memindahkan versi kepada status “diluluskan”, dan di situ kakitangan platform boleh menerbitkannya. Anda tidak boleh menerbitkannya sendiri, dan anda tidak boleh meluluskan kursus yang anda tulis.',
    'ra.decided': 'Anda sudah merekodkan keputusan untuk semakan ini.',
    'ra.closedNote': 'Semakan ini sudah ditutup, jadi keputusan tidak boleh direkodkan padanya.',
    'ra.notMoved':
      'Keputusan anda telah direkodkan. Kursus itu sendiri tidak dapat dipindahkan dari sini; kakitangan platform boleh melihat keputusan anda dan memindahkannya. Anda tidak perlu membuat keputusan sekali lagi.',
    'ra.eNotYours': 'Semakan itu bukan milik anda.',
    'ra.eNotOpen':
      'Semakan ini tidak lagi terbuka untuk itu. Muat semula halaman untuk melihat kedudukannya.',
    'ra.eConflict':
      'Konflik yang anda isytiharkan menghalang anda daripada memutuskan semakan ini.',
    'ra.eReason': 'Berikan sebab bagi keputusan itu.',
    'ra.eRefused': 'Tidak direkodkan. Muat semula halaman untuk melihat kedudukan semakan ini.',
    'ra.standHead': 'Tidak dapat menyemak ini secara saksama?',
    'ra.declared': 'Diisytiharkan',
    'ra.declareOpen': 'Isytiharkan konflik tentang kursus ini',
    'ra.declareNote':
      'Pengisytiharan serta-merta menghalang anda daripada memutuskan semakan ini, dan terus menghalang sehingga kakitangan platform mendengarnya. Pengisytiharan tidak menutup semakan: jika masih tawaran, tolak juga tawaran itu; jika tidak, kakitangan yang menutupnya.',
  },
  bn: {
    'ra.decisions': 'সিদ্ধান্ত',
    'ra.gistHead': 'শিক্ষার্থী কী পায়',
    'ra.allOpen': 'প্রতিটি পাঠ শিক্ষার্থীকে খোলার মতো কিছু দেয়। পাঠ: {n}',
    'ra.someOpen': 'যে পাঠগুলো শিক্ষার্থীকে খোলার মতো কিছু দেয়: {all}টির মধ্যে {some}',
    'ra.nothing': 'যে পাঠগুলো শিক্ষার্থীকে কিছুই দেয় না: {n}',
    'ra.trouble': 'যে পাঠগুলো সম্পর্কে শিক্ষার্থীর কাছে পৌঁছানোর আগে কিছু জেনে নেওয়া ভালো: {n}',
    'ra.nextEmpty':
      'আগে এটি খোলা ভালো: {lesson}। এতে কিছুই নেই, তাই শিক্ষার্থী শুধু একটি শিরোনাম আর একটি ফাঁকা পাতা পায়।',
    'ra.nextSilent':
      'শেষ হয়েছে মনে হয়, কিন্তু হয়নি: {lesson}। এতে কিছু সংযুক্ত আছে, আর শিক্ষার্থী তার কোনোটিই খুলতে পারে না।',
    'ra.nextNoted':
      'একবার দেখার মতো: {lesson}। শিক্ষার্থী এটি ব্যবহার করতে পারে, তবে এ সম্পর্কে আগে কিছু জেনে নেওয়া ভালো।',
    'ra.nextAlso': 'একই পর্যায়ে থাকা অন্য পাঠ: {n}',
    'ra.asLearner': 'শিক্ষার্থীর মতো করে দেখুন',
    'ra.deliveryUnknown':
      'আপলোড করা ফাইলগুলোর এনকোডিংয়ের অবস্থা এখন পড়া যায়নি, তাই প্লেয়ার ছাড়া দেখানো কোনো ফাইল ব্যর্থ হওয়া ফাইল না হয়ে এমন ফাইলও হতে পারে যার কথা কেউ জিজ্ঞেস করেনি।',
    'ra.notVerdict':
      'এটি বলে শিক্ষার্থী কী পাবে, কী সিদ্ধান্ত নিতে হবে তা নয়। সিদ্ধান্ত আপনার, আর এখানকার কোনো কিছুই একা গ্রহণ বা প্রত্যাখ্যানের কারণ নয়: ইলমি পর্যালোচনা কী শেখানো হচ্ছে তা নিয়ে, আর এটি কী পৌঁছায় তা নিয়ে।',
    'ra.outline': 'রূপরেখা',
    'ra.noSections':
      'এই সংস্করণে কোনো অংশ নেই। পর্যালোচনা করার কিছু নেই, আর এটি প্রকাশ করা যাবে না।',
    'ra.noLessons': 'কোনো পাঠ নেই।',
    'ra.bEmpty': 'এতে কিছু নেই',
    'ra.bSilent': 'চালানোর মতো কিছু নেই',
    'ra.bNoted': 'একবার দেখার মতো',
    'ra.bReady': 'প্রস্তুত',
    'ra.noCopy':
      '{name}: দেখানোর কোনো কপি এখনো এনকোড হয়নি, তাই দেখার কিছু নেই, আর শিক্ষার্থী প্লেয়ারের জায়গায় একটি বাক্য পাবে।',
    'ra.watchable':
      'এই পর্যালোচনা খোলা থাকা পর্যন্ত আপনি এই পাঠগুলোর দেখানোর কপি দেখতে পারেন। আপনি সেগুলো সংরক্ষণ করতে পারবেন না, আর শিক্ষকের আপলোড করা ফাইল আপনাকে দেওয়া হয় না: শিক্ষার্থী যা দেখবে, পর্যালোচনা তারই।',
    'ra.notWatchable':
      'পর্যালোচনা গ্রহণ করার মুহূর্ত থেকে তা বন্ধ হওয়া পর্যন্ত পাঠগুলো চালানো যায়, তাই এখন এখানে চালানো যাবে না।',
    'ra.needsHead': 'এই সংস্করণের কী দরকার, আর কী যাচাই করা হয়েছে',
    'ra.english': 'নিচের দুটি প্যানেল আপাতত ইংরেজিতে।',
    'ra.decisionHead': 'আপনার সিদ্ধান্ত',
    'ra.backQueue': 'সারিতে ফিরে যান',
    'ra.unread': 'এই পর্যালোচনাটি এখন পড়া যায়নি। একটু পরে আবার চেষ্টা করুন।',
    'ra.outlineUnread':
      'এই কোর্সের রূপরেখা এখন পড়া যায়নি, তাই দেখানো হচ্ছে না। সিদ্ধান্ত নেওয়ার আগে পাতাটি আবার লোড করুন।',
    'ra.partUnread':
      'এই পাতার কিছু অংশ এখন পড়া যায়নি, তাই এটি অসম্পূর্ণ। সিদ্ধান্ত নেওয়ার আগে আবার লোড করুন।',
    'ra.offerHead': 'এই পর্যালোচনাটি আপনাকে প্রস্তাব করা হয়েছে',
    'ra.offerNote': 'আপনি গ্রহণ না করা পর্যন্ত আপনার কাছে কিছু আশা করা হচ্ছে না।',
    'ra.accept': 'এই পর্যালোচনা গ্রহণ করুন',
    'ra.decline': 'ফিরিয়ে দিন',
    'ra.recordHead': 'আপনার সিদ্ধান্ত নথিভুক্ত করুন',
    'ra.reason': 'কারণ',
    'ra.reasonHint': 'আপনি কী যাচাই করেছেন, আর কী পেয়েছেন? শিক্ষক এই নথির বিরুদ্ধেই আপিল করবেন।',
    'ra.approve': 'অনুমোদন করুন',
    'ra.revise': 'সংশোধন চান',
    'ra.reject': 'প্রত্যাখ্যান করুন',
    'ra.approveNote':
      'অনুমোদন করলে সংস্করণটি “অনুমোদিত” অবস্থায় যায়, সেখানে প্ল্যাটফর্মের কর্মীরা এটি প্রকাশ করতে পারেন। আপনি নিজে এটি প্রকাশ করতে পারবেন না, আর নিজের লেখা কোর্স অনুমোদন করতে পারবেন না।',
    'ra.decided': 'আপনি এই পর্যালোচনায় আগেই একটি সিদ্ধান্ত নথিভুক্ত করেছেন।',
    'ra.closedNote': 'এই পর্যালোচনাটি বন্ধ, তাই এতে কোনো সিদ্ধান্ত নথিভুক্ত করা যাবে না।',
    'ra.notMoved':
      'আপনার সিদ্ধান্ত নথিভুক্ত হয়েছে। কোর্সটিকে এখান থেকে এগিয়ে নেওয়া যায়নি; প্ল্যাটফর্মের কর্মীরা আপনার সিদ্ধান্ত দেখতে পারেন এবং কোর্সটি এগিয়ে নিতে পারেন। আপনাকে আবার সিদ্ধান্ত নিতে হবে না।',
    'ra.eNotYours': 'ওই পর্যালোচনাটি আপনার নয়।',
    'ra.eNotOpen':
      'এই পর্যালোচনাটি আর এ কাজের জন্য খোলা নেই। এটি কোন অবস্থায় আছে দেখতে পাতাটি আবার লোড করুন।',
    'ra.eConflict': 'আপনার ঘোষণা করা একটি সংঘাত আপনাকে এই পর্যালোচনায় সিদ্ধান্ত দিতে বাধা দিচ্ছে।',
    'ra.eReason': 'সিদ্ধান্তের একটি কারণ লিখুন।',
    'ra.eRefused': 'এটি নথিভুক্ত হয়নি। পর্যালোচনাটি কোন অবস্থায় আছে দেখতে পাতাটি আবার লোড করুন।',
    'ra.standHead': 'নিরপেক্ষভাবে পর্যালোচনা করতে পারছেন না?',
    'ra.declared': 'ঘোষণা করা হয়েছে',
    'ra.declareOpen': 'এই কোর্স সম্পর্কে স্বার্থের সংঘাত ঘোষণা করুন',
    'ra.declareNote':
      'ঘোষণা করলে সঙ্গে সঙ্গে আপনি এই পর্যালোচনায় সিদ্ধান্ত দিতে পারবেন না, আর প্ল্যাটফর্মের কর্মীরা তা না শোনা পর্যন্ত এই বাধা থাকবে। এতে পর্যালোচনা বন্ধ হয় না: এটি এখনো প্রস্তাব হলে সেটিও প্রত্যাখ্যান করুন; নইলে কর্মীরা এটি বন্ধ করবেন।',
  },
  hi: {
    'ra.decisions': 'फ़ैसले',
    'ra.gistHead': 'सीखने वाले को क्या मिलता है',
    'ra.allOpen': 'हर पाठ सीखने वाले को खोलने के लिए कुछ देता है। पाठ: {n}',
    'ra.someOpen': 'वे पाठ जो सीखने वाले को खोलने के लिए कुछ देते हैं: {all} में से {some}',
    'ra.nothing': 'वे पाठ जो सीखने वाले को कुछ भी नहीं देते: {n}',
    'ra.trouble': 'वे पाठ जिनके बारे में सीखने वाले तक पहुँचने से पहले कुछ जान लेना अच्छा है: {n}',
    'ra.nextEmpty':
      'पहले इसे खोलना अच्छा रहेगा: {lesson}। इसमें कुछ भी नहीं है, इसलिए सीखने वाले को बस एक शीर्षक और खाली पेज मिलता है।',
    'ra.nextSilent':
      'पूरा लगता है, पर है नहीं: {lesson}। इसके साथ कुछ जुड़ा है, और सीखने वाला उसमें से कुछ भी नहीं खोल सकता।',
    'ra.nextNoted':
      'एक नज़र डालने लायक़: {lesson}। सीखने वाला इसे इस्तेमाल कर सकता है, और इसके बारे में पहले कुछ जान लेना अच्छा है।',
    'ra.nextAlso': 'इसी चरण के दूसरे पाठ: {n}',
    'ra.asLearner': 'इसे सीखने वाले की तरह देखें',
    'ra.deliveryUnknown':
      'अपलोड की गई फ़ाइलों की एन्कोडिंग की स्थिति अभी पढ़ी नहीं जा सकी, इसलिए बिना प्लेयर के दिखने वाली फ़ाइल ऐसी भी हो सकती है जिसके बारे में किसी ने पूछा ही नहीं, न कि ऐसी जो नाकाम हुई।',
    'ra.notVerdict':
      'यह बताता है कि सीखने वाले को क्या मिलेगा, यह नहीं कि क्या फ़ैसला किया जाए। फ़ैसला आपका है, और यहाँ की कोई बात अकेले स्वीकार करने या मना करने की वजह नहीं है: इल्मी समीक्षा इस बारे में है कि क्या पढ़ाया जाता है, और यह इस बारे में कि क्या पहुँचता है।',
    'ra.outline': 'रूपरेखा',
    'ra.noSections':
      'इस संस्करण में कोई खंड नहीं है। समीक्षा करने को कुछ नहीं है, और इसे प्रकाशित नहीं किया जा सकता।',
    'ra.noLessons': 'कोई पाठ नहीं।',
    'ra.bEmpty': 'इसमें कुछ नहीं',
    'ra.bSilent': 'चलाने को कुछ नहीं',
    'ra.bNoted': 'एक नज़र डालने लायक़',
    'ra.bReady': 'तैयार',
    'ra.noCopy':
      '{name}: दिखाने वाली कोई प्रति अभी तक एन्कोड नहीं हुई है, इसलिए देखने को कुछ नहीं है, और सीखने वाले को प्लेयर की जगह एक वाक्य मिलेगा।',
    'ra.watchable':
      'जब तक यह समीक्षा खुली है, आप इन पाठों की दिखाने वाली प्रतियाँ देख सकते हैं। आप उन्हें सहेज नहीं सकते, और शिक्षक की अपलोड की हुई फ़ाइल आपको नहीं दी जाती: समीक्षा उसी की है जो सीखने वाला देखेगा।',
    'ra.notWatchable':
      'पाठ समीक्षा स्वीकार होने के पल से उसके बंद होने तक चलाए जा सकते हैं, इसलिए वे अभी यहाँ नहीं चलाए जा सकते।',
    'ra.needsHead': 'इस संस्करण को क्या चाहिए, और क्या जाँचा जा चुका है',
    'ra.english': 'नीचे के दोनों पैनल फ़िलहाल अंग्रेज़ी में हैं।',
    'ra.decisionHead': 'आपका फ़ैसला',
    'ra.backQueue': 'कतार पर वापस',
    'ra.unread': 'यह समीक्षा अभी पढ़ी नहीं जा सकी। थोड़ी देर में फिर कोशिश करें।',
    'ra.outlineUnread':
      'इस कोर्स की रूपरेखा अभी पढ़ी नहीं जा सकी, इसलिए वह नहीं दिखाई गई है। फ़ैसला करने से पहले पेज फिर से लोड करें।',
    'ra.partUnread':
      'इस पेज का कुछ हिस्सा अभी पढ़ा नहीं जा सका, इसलिए यह अधूरा है। फ़ैसला करने से पहले इसे फिर से लोड करें।',
    'ra.offerHead': 'यह समीक्षा आपको प्रस्तावित की गई है',
    'ra.offerNote': 'जब तक आप इसे स्वीकार नहीं करते, आपसे कुछ अपेक्षित नहीं है।',
    'ra.accept': 'यह समीक्षा स्वीकार करें',
    'ra.decline': 'मना करें',
    'ra.recordHead': 'अपना फ़ैसला दर्ज करें',
    'ra.reason': 'कारण',
    'ra.reasonHint':
      'आपने क्या जाँचा, और क्या पाया? यही वह रिकॉर्ड है जिसके ख़िलाफ़ शिक्षक अपील करेगा।',
    'ra.approve': 'मंज़ूर करें',
    'ra.revise': 'संशोधन माँगें',
    'ra.reject': 'नामंज़ूर करें',
    'ra.approveNote':
      'मंज़ूरी संस्करण को “मंज़ूर” स्थिति में ले जाती है, जहाँ प्लैटफ़ॉर्म के कर्मचारी उसे प्रकाशित कर सकते हैं। आप उसे ख़ुद प्रकाशित नहीं कर सकते, और अपने लिखे कोर्स को मंज़ूर नहीं कर सकते।',
    'ra.decided': 'आप इस समीक्षा पर पहले ही फ़ैसला दर्ज कर चुके हैं।',
    'ra.closedNote': 'यह समीक्षा बंद है, इसलिए इस पर कोई फ़ैसला दर्ज नहीं किया जा सकता।',
    'ra.notMoved':
      'आपका फ़ैसला दर्ज हो गया। कोर्स को यहाँ से आगे नहीं बढ़ाया जा सका; प्लैटफ़ॉर्म के कर्मचारी आपका फ़ैसला देख सकते हैं और उसे आगे बढ़ा सकते हैं। आपको दोबारा फ़ैसला करने की ज़रूरत नहीं है।',
    'ra.eNotYours': 'वह समीक्षा आपकी नहीं है।',
    'ra.eNotOpen':
      'यह समीक्षा अब इस काम के लिए खुली नहीं है। यह कहाँ खड़ी है, देखने के लिए पेज फिर से लोड करें।',
    'ra.eConflict': 'आपका घोषित किया हुआ एक टकराव आपको इस समीक्षा का फ़ैसला करने से रोकता है।',
    'ra.eReason': 'फ़ैसले का कारण लिखें।',
    'ra.eRefused': 'यह दर्ज नहीं हुआ। समीक्षा कहाँ खड़ी है, देखने के लिए पेज फिर से लोड करें।',
    'ra.standHead': 'इसकी निष्पक्ष समीक्षा नहीं कर सकते?',
    'ra.declared': 'घोषित',
    'ra.declareOpen': 'इस कोर्स के बारे में हितों के टकराव की घोषणा करें',
    'ra.declareNote':
      'घोषणा आपको तुरंत इस समीक्षा का फ़ैसला करने से रोक देती है, और तब तक रोके रखती है जब तक प्लैटफ़ॉर्म के कर्मचारी उसे सुन न लें। इससे समीक्षा बंद नहीं होती: अगर यह अभी प्रस्ताव है, तो उसे भी मना करें; नहीं तो कर्मचारी उसे बंद करते हैं।',
  },
  fr: {
    'ra.decisions': 'Décisions',
    'ra.gistHead': 'Ce que reçoit un apprenant',
    'ra.allOpen': 'Chaque leçon donne à l’apprenant quelque chose à ouvrir. Leçons : {n}',
    'ra.someOpen': 'Leçons qui donnent à l’apprenant quelque chose à ouvrir : {some} sur {all}',
    'ra.nothing': 'Leçons qui ne donnent rien du tout à l’apprenant : {n}',
    'ra.trouble':
      'Leçons comportant un point à connaître avant qu’elles n’atteignent un apprenant : {n}',
    'ra.nextEmpty':
      'À ouvrir en premier : {lesson}. Elle ne contient rien du tout, si bien que l’apprenant obtient un titre et une page vide.',
    'ra.nextSilent':
      'Semble terminée, et ne l’est pas : {lesson}. Quelque chose y est joint, et l’apprenant ne peut rien en ouvrir.',
    'ra.nextNoted':
      'Mérite un coup d’œil : {lesson}. L’apprenant peut s’en servir, et il y a un point à connaître d’abord à son sujet.',
    'ra.nextAlso': 'Autres leçons au même stade : {n}',
    'ra.asLearner': 'La voir comme un apprenant',
    'ra.deliveryUnknown':
      'L’état d’encodage des fichiers téléversés n’a pas pu être lu pour l’instant ; un fichier affiché sans lecteur peut donc être un fichier sur lequel personne n’a posé la question, et non un fichier en échec.',
    'ra.notVerdict':
      'Ceci dit ce qu’un apprenant trouverait, non ce qu’il faut décider. La décision vous appartient, et rien ici n’est à lui seul une raison d’accepter ou de décliner : une relecture savante porte sur ce qui est enseigné, et ceci porte sur ce qui arrive.',
    'ra.outline': 'Plan',
    'ra.noSections':
      'Cette version n’a aucune section. Il n’y a rien à relire, et elle ne peut pas être publiée.',
    'ra.noLessons': 'Aucune leçon.',
    'ra.bEmpty': 'Rien dedans',
    'ra.bSilent': 'Rien à lire',
    'ra.bNoted': 'Mérite un coup d’œil',
    'ra.bReady': 'Prête',
    'ra.noCopy':
      '{name} : aucune copie de diffusion n’a encore été encodée ; il n’y a donc rien à regarder, et un apprenant obtiendrait une phrase à la place du lecteur.',
    'ra.watchable':
      'Vous pouvez regarder les copies de diffusion de ces leçons tant que cette relecture est ouverte. Vous ne pouvez pas les enregistrer, et le fichier téléversé par l’enseignant ne vous est pas servi : ce qui est relu est ce que verra un apprenant.',
    'ra.notWatchable':
      'Les leçons peuvent être lues à partir du moment où une relecture est acceptée et jusqu’à sa clôture ; elles ne peuvent donc pas être lues ici pour l’instant.',
    'ra.needsHead': 'Ce dont cette version a besoin, et ce qui a été vérifié',
    'ra.english': 'Les deux panneaux ci-dessous sont en anglais pour l’instant.',
    'ra.decisionHead': 'Votre décision',
    'ra.backQueue': 'Retour à la file',
    'ra.unread': 'Cette relecture n’a pas pu être lue pour l’instant. Réessayez dans un instant.',
    'ra.outlineUnread':
      'Le plan de ce cours n’a pas pu être lu pour l’instant ; il n’est donc pas affiché. Rechargez la page avant de décider.',
    'ra.partUnread':
      'Une partie de cette page n’a pas pu être lue pour l’instant ; elle est donc incomplète. Rechargez-la avant de décider.',
    'ra.offerHead': 'Cette relecture vous est proposée',
    'ra.offerNote': 'Rien n’est attendu de vous tant que vous ne l’avez pas acceptée.',
    'ra.accept': 'Accepter cette relecture',
    'ra.decline': 'Décliner',
    'ra.recordHead': 'Consigner votre décision',
    'ra.reason': 'Motif',
    'ra.reasonHint':
      'Qu’avez-vous vérifié, et qu’avez-vous constaté ? C’est la trace contre laquelle un enseignant ferait appel.',
    'ra.approve': 'Approuver',
    'ra.revise': 'Demander des révisions',
    'ra.reject': 'Rejeter',
    'ra.approveNote':
      'Approuver fait passer la version à l’état « approuvée », où l’équipe de la plateforme peut la publier. Vous ne pouvez pas la publier vous-même, et vous ne pouvez pas approuver un cours que vous avez écrit.',
    'ra.decided': 'Vous avez déjà consigné une décision pour cette relecture.',
    'ra.closedNote': 'Cette relecture est close ; aucune décision ne peut donc y être consignée.',
    'ra.notMoved':
      'Votre décision a été consignée. Le cours lui-même n’a pas pu être avancé d’ici ; l’équipe de la plateforme peut voir votre décision et le faire avancer. Vous n’avez pas à décider de nouveau.',
    'ra.eNotYours': 'Cette relecture n’est pas la vôtre.',
    'ra.eNotOpen':
      'Cette relecture n’est plus ouverte à cela. Rechargez la page pour voir où elle en est.',
    'ra.eConflict': 'Un conflit que vous avez déclaré vous empêche de trancher cette relecture.',
    'ra.eReason': 'Donnez un motif à la décision.',
    'ra.eRefused': 'Rien n’a été consigné. Rechargez la page pour voir où en est la relecture.',
    'ra.standHead': 'Vous ne pouvez pas relire ceci de façon impartiale ?',
    'ra.declared': 'Déclaré',
    'ra.declareOpen': 'Déclarer un conflit d’intérêts au sujet de ce cours',
    'ra.declareNote':
      'La déclaration vous empêche aussitôt de trancher cette relecture, et continue de vous en empêcher jusqu’à ce que l’équipe de la plateforme l’ait examinée. Elle ne clôt pas la relecture : si c’est encore une proposition, déclinez-la aussi ; sinon, c’est l’équipe qui la clôt.',
  },
  es: {
    'ra.decisions': 'Decisiones',
    'ra.gistHead': 'Lo que recibe un estudiante',
    'ra.allOpen': 'Cada lección le da al estudiante algo que abrir. Lecciones: {n}',
    'ra.someOpen': 'Lecciones que le dan al estudiante algo que abrir: {some} de {all}',
    'ra.nothing': 'Lecciones que no le dan nada en absoluto al estudiante: {n}',
    'ra.trouble': 'Lecciones con algo que conviene saber antes de que lleguen a un estudiante: {n}',
    'ra.nextEmpty':
      'Conviene abrirla primero: {lesson}. No contiene nada en absoluto, así que el estudiante recibe un título y una página vacía.',
    'ra.nextSilent':
      'Parece terminada, y no lo está: {lesson}. Tiene algo adjunto, y el estudiante no puede abrir nada de ello.',
    'ra.nextNoted':
      'Merece un vistazo: {lesson}. El estudiante puede usarla, y hay algo sobre ella que conviene saber antes.',
    'ra.nextAlso': 'Otras lecciones en la misma etapa: {n}',
    'ra.asLearner': 'Verla como un estudiante',
    'ra.deliveryUnknown':
      'El estado de codificación de los archivos subidos no pudo leerse ahora, así que un archivo mostrado sin reproductor puede ser uno por el que nadie preguntó y no uno que falló.',
    'ra.notVerdict':
      'Esto dice lo que encontraría un estudiante, no lo que hay que decidir. La decisión es suya, y nada de lo que hay aquí es por sí solo una razón para aceptar o declinar: una revisión académica trata de lo que se enseña, y esto trata de lo que llega.',
    'ra.outline': 'Esquema',
    'ra.noSections':
      'Esta versión no tiene secciones. No hay nada que revisar, y no puede publicarse.',
    'ra.noLessons': 'Sin lecciones.',
    'ra.bEmpty': 'Nada dentro',
    'ra.bSilent': 'Nada que reproducir',
    'ra.bNoted': 'Merece un vistazo',
    'ra.bReady': 'Lista',
    'ra.noCopy':
      '{name}: todavía no se ha codificado ninguna copia de entrega, así que no hay nada que ver, y un estudiante recibiría una frase donde debería estar el reproductor.',
    'ra.watchable':
      'Puede ver las copias de entrega de estas lecciones mientras esta revisión esté abierta. No puede guardarlas, y el archivo que subió el docente no se le sirve: lo que se revisa es lo que verá un estudiante.',
    'ra.notWatchable':
      'Las lecciones pueden reproducirse desde el momento en que se acepta una revisión hasta que se cierra, así que ahora no pueden reproducirse aquí.',
    'ra.needsHead': 'Lo que necesita esta versión, y lo que se ha comprobado',
    'ra.english': 'Los dos paneles de abajo están en inglés por ahora.',
    'ra.decisionHead': 'Su decisión',
    'ra.backQueue': 'Volver a la cola',
    'ra.unread': 'Esta revisión no pudo leerse ahora. Inténtelo de nuevo en un momento.',
    'ra.outlineUnread':
      'El esquema de este curso no pudo leerse ahora, así que no se muestra. Vuelva a cargar la página antes de decidir.',
    'ra.partUnread':
      'Parte de esta página no pudo leerse ahora, así que está incompleta. Vuelva a cargarla antes de decidir.',
    'ra.offerHead': 'Esta revisión se le ofrece a usted',
    'ra.offerNote': 'No se espera nada de usted hasta que la acepte.',
    'ra.accept': 'Aceptar esta revisión',
    'ra.decline': 'Declinar',
    'ra.recordHead': 'Registrar su decisión',
    'ra.reason': 'Motivo',
    'ra.reasonHint':
      '¿Qué comprobó y qué encontró? Este es el registro contra el que un docente apelaría.',
    'ra.approve': 'Aprobar',
    'ra.revise': 'Pedir cambios',
    'ra.reject': 'Rechazar',
    'ra.approveNote':
      'Aprobar pasa la versión al estado «aprobada», donde el personal de la plataforma puede publicarla. Usted no puede publicarla, y no puede aprobar un curso que haya escrito.',
    'ra.decided': 'Ya ha registrado una decisión en esta revisión.',
    'ra.closedNote':
      'Esta revisión está cerrada, así que no puede registrarse ninguna decisión en ella.',
    'ra.notMoved':
      'Su decisión quedó registrada. El curso en sí no pudo avanzarse desde aquí; el personal de la plataforma puede ver su decisión y hacerlo avanzar. No necesita decidir de nuevo.',
    'ra.eNotYours': 'Esa revisión no es suya.',
    'ra.eNotOpen':
      'Esta revisión ya no está abierta para eso. Vuelva a cargar la página para ver en qué punto está.',
    'ra.eConflict': 'Un conflicto que usted declaró le impide decidir esta revisión.',
    'ra.eReason': 'Dé un motivo para la decisión.',
    'ra.eRefused':
      'No se registró. Vuelva a cargar la página para ver en qué punto está la revisión.',
    'ra.standHead': '¿No puede revisar esto con imparcialidad?',
    'ra.declared': 'Declarado',
    'ra.declareOpen': 'Declarar un conflicto de intereses sobre este curso',
    'ra.declareNote':
      'Declararlo le impide de inmediato decidir esta revisión, y se lo sigue impidiendo hasta que el personal de la plataforma lo haya examinado. No cierra la revisión: si todavía es una oferta, declínela también; si no, la cierra el personal.',
  },
  pt: {
    'ra.decisions': 'Decisões',
    'ra.gistHead': 'O que um aluno recebe',
    'ra.allOpen': 'Cada lição dá ao aluno algo para abrir. Lições: {n}',
    'ra.someOpen': 'Lições que dão ao aluno algo para abrir: {some} de {all}',
    'ra.nothing': 'Lições que não dão absolutamente nada ao aluno: {n}',
    'ra.trouble': 'Lições com algo que convém saber antes de chegarem a um aluno: {n}',
    'ra.nextEmpty':
      'Convém abrir primeiro: {lesson}. Não tem absolutamente nada, por isso o aluno recebe um título e uma página vazia.',
    'ra.nextSilent':
      'Parece concluída, e não está: {lesson}. Tem algo anexado, e o aluno não consegue abrir nada disso.',
    'ra.nextNoted':
      'Merece uma vista de olhos: {lesson}. O aluno pode usá-la, e há algo sobre ela que convém saber primeiro.',
    'ra.nextAlso': 'Outras lições na mesma fase: {n}',
    'ra.asLearner': 'Ver como um aluno',
    'ra.deliveryUnknown':
      'O estado de codificação dos ficheiros carregados não pôde ser lido agora, por isso um ficheiro mostrado sem leitor pode ser um sobre o qual ninguém perguntou, e não um que falhou.',
    'ra.notVerdict':
      'Isto diz o que um aluno encontraria, não o que decidir. A decisão é sua, e nada do que aqui está é, por si só, uma razão para aceitar ou recusar: uma revisão académica é sobre o que se ensina, e isto é sobre o que chega.',
    'ra.outline': 'Estrutura',
    'ra.noSections':
      'Esta versão não tem secções. Não há nada para rever, e não pode ser publicada.',
    'ra.noLessons': 'Sem lições.',
    'ra.bEmpty': 'Nada lá dentro',
    'ra.bSilent': 'Nada para reproduzir',
    'ra.bNoted': 'Merece uma vista de olhos',
    'ra.bReady': 'Pronta',
    'ra.noCopy':
      '{name}: ainda não foi codificada nenhuma cópia de entrega, por isso não há nada para ver, e um aluno receberia uma frase no lugar do leitor.',
    'ra.watchable':
      'Pode ver as cópias de entrega destas lições enquanto esta revisão estiver aberta. Não pode guardá-las, e o ficheiro que o professor carregou não lhe é servido: o que está em revisão é o que um aluno vai ver.',
    'ra.notWatchable':
      'As lições podem ser reproduzidas desde o momento em que uma revisão é aceite até ser fechada, por isso não podem ser reproduzidas aqui agora.',
    'ra.needsHead': 'O que esta versão precisa, e o que foi verificado',
    'ra.english': 'Os dois painéis abaixo estão em inglês por agora.',
    'ra.decisionHead': 'A sua decisão',
    'ra.backQueue': 'Voltar à fila',
    'ra.unread': 'Não foi possível ler esta revisão agora. Tente de novo dentro de momentos.',
    'ra.outlineUnread':
      'Não foi possível ler agora a estrutura deste curso, por isso não é mostrada. Volte a carregar a página antes de decidir.',
    'ra.partUnread':
      'Não foi possível ler agora parte desta página, por isso está incompleta. Volte a carregá-la antes de decidir.',
    'ra.offerHead': 'Esta revisão é-lhe proposta',
    'ra.offerNote': 'Nada é esperado de si até a aceitar.',
    'ra.accept': 'Aceitar esta revisão',
    'ra.decline': 'Recusar',
    'ra.recordHead': 'Registar a sua decisão',
    'ra.reason': 'Motivo',
    'ra.reasonHint':
      'O que verificou, e o que encontrou? Este é o registo contra o qual um professor recorreria.',
    'ra.approve': 'Aprovar',
    'ra.revise': 'Pedir alterações',
    'ra.reject': 'Rejeitar',
    'ra.approveNote':
      'Aprovar passa a versão para o estado «aprovada», onde a equipa da plataforma a pode publicar. Não pode publicá-la por si, e não pode aprovar um curso que tenha escrito.',
    'ra.decided': 'Já registou uma decisão nesta revisão.',
    'ra.closedNote':
      'Esta revisão está fechada, por isso não pode ser registada nela nenhuma decisão.',
    'ra.notMoved':
      'A sua decisão foi registada. O curso em si não pôde ser avançado a partir daqui; a equipa da plataforma pode ver a sua decisão e fazê-lo avançar. Não precisa de decidir de novo.',
    'ra.eNotYours': 'Essa revisão não é sua.',
    'ra.eNotOpen':
      'Esta revisão já não está aberta para isso. Volte a carregar a página para ver em que ponto está.',
    'ra.eConflict': 'Um conflito que declarou impede-o de decidir esta revisão.',
    'ra.eReason': 'Indique um motivo para a decisão.',
    'ra.eRefused':
      'Não foi registado. Volte a carregar a página para ver em que ponto está a revisão.',
    'ra.standHead': 'Não consegue rever isto com imparcialidade?',
    'ra.declared': 'Declarado',
    'ra.declareOpen': 'Declarar um conflito de interesses sobre este curso',
    'ra.declareNote':
      'Declarar impede-o de imediato de decidir esta revisão, e continua a impedi-lo até a equipa da plataforma o ter apreciado. Não fecha a revisão: se ainda for uma proposta, recuse-a também; caso contrário, é a equipa que a fecha.',
  },
  sw: {
    'ra.decisions': 'Maamuzi',
    'ra.gistHead': 'Anachopata mwanafunzi',
    'ra.allOpen': 'Kila somo linampa mwanafunzi kitu cha kufungua. Masomo: {n}',
    'ra.someOpen': 'Masomo yanayompa mwanafunzi kitu cha kufungua: {some} kati ya {all}',
    'ra.nothing': 'Masomo yasiyompa mwanafunzi chochote kabisa: {n}',
    'ra.trouble': 'Masomo yenye jambo linalofaa kujulikana kabla hayajamfikia mwanafunzi: {n}',
    'ra.nextEmpty':
      'Linafaa kufunguliwa kwanza: {lesson}. Halina chochote kabisa ndani yake, kwa hiyo mwanafunzi anapata kichwa na ukurasa mtupu.',
    'ra.nextSilent':
      'Linaonekana limekamilika, na halijakamilika: {lesson}. Kuna kitu kilichoambatishwa, na mwanafunzi hawezi kufungua chochote kati yake.',
    'ra.nextNoted':
      'Linafaa kutazamwa: {lesson}. Mwanafunzi anaweza kulitumia, na kuna jambo kulihusu linalofaa kujulikana kwanza.',
    'ra.nextAlso': 'Masomo mengine katika hatua hiyo hiyo: {n}',
    'ra.asLearner': 'Litazame kama mwanafunzi',
    'ra.deliveryUnknown':
      'Hali ya usimbaji wa faili zilizopakiwa haikuweza kusomwa sasa hivi, kwa hiyo faili inayoonyeshwa bila kichezaji inaweza kuwa faili ambayo hakuna aliyeiulizia, si faili iliyoshindikana.',
    'ra.notVerdict':
      'Hii inasema mwanafunzi atakutana na nini, si nini cha kuamua. Uamuzi ni wako, na hakuna chochote hapa ambacho peke yake ni sababu ya kukubali au kukataa: ukaguzi wa kielimu unahusu kinachofundishwa, na hii inahusu kinachofika.',
    'ra.outline': 'Muhtasari',
    'ra.noSections': 'Toleo hili halina sehemu. Hakuna cha kukagua, na haliwezi kuchapishwa.',
    'ra.noLessons': 'Hakuna masomo.',
    'ra.bEmpty': 'Halina kitu ndani',
    'ra.bSilent': 'Hakuna cha kucheza',
    'ra.bNoted': 'Linafaa kutazamwa',
    'ra.bReady': 'Tayari',
    'ra.noCopy':
      '{name}: hakuna nakala ya kuonyesha iliyosimbwa bado, kwa hiyo hakuna cha kutazama, na mwanafunzi angepata sentensi mahali pa kichezaji.',
    'ra.watchable':
      'Unaweza kutazama nakala za kuonyesha za masomo haya ukaguzi huu ukiwa wazi. Huwezi kuzihifadhi, na faili aliyopakia mwalimu haitolewi kwako: kinachokaguliwa ni kile atakachoona mwanafunzi.',
    'ra.notWatchable':
      'Masomo yanaweza kuchezwa tangu ukaguzi unapokubaliwa hadi unapofungwa, kwa hiyo hayawezi kuchezwa hapa sasa.',
    'ra.needsHead': 'Toleo hili linahitaji nini, na nini kimehakikiwa',
    'ra.english': 'Paneli mbili zilizo hapa chini ziko kwa Kiingereza kwa sasa.',
    'ra.decisionHead': 'Uamuzi wako',
    'ra.backQueue': 'Rudi kwenye foleni',
    'ra.unread': 'Ukaguzi huu haukuweza kusomwa sasa hivi. Jaribu tena baada ya muda mfupi.',
    'ra.outlineUnread':
      'Muhtasari wa kozi hii haukuweza kusomwa sasa hivi, kwa hiyo hauonyeshwi. Pakia ukurasa upya kabla ya kuamua.',
    'ra.partUnread':
      'Sehemu ya ukurasa huu haikuweza kusomwa sasa hivi, kwa hiyo haujakamilika. Upakie upya kabla ya kuamua.',
    'ra.offerHead': 'Ukaguzi huu umetolewa kwako',
    'ra.offerNote': 'Hakuna kinachotarajiwa mpaka uukubali.',
    'ra.accept': 'Kubali ukaguzi huu',
    'ra.decline': 'Kataa ombi',
    'ra.recordHead': 'Andika uamuzi wako',
    'ra.reason': 'Sababu',
    'ra.reasonHint':
      'Ulihakiki nini, na ulikuta nini? Hii ndiyo kumbukumbu ambayo mwalimu angeikatia rufaa.',
    'ra.approve': 'Idhinisha',
    'ra.revise': 'Omba marekebisho',
    'ra.reject': 'Kataa',
    'ra.approveNote':
      'Kuidhinisha kunapeleka toleo kwenye hali ya “limeidhinishwa”, ambapo wafanyakazi wa jukwaa wanaweza kulichapisha. Huwezi kulichapisha wewe mwenyewe, na huwezi kuidhinisha kozi uliyoiandika.',
    'ra.decided': 'Tayari umeandika uamuzi kwenye ukaguzi huu.',
    'ra.closedNote': 'Ukaguzi huu umefungwa, kwa hiyo hakuna uamuzi unaoweza kuandikwa juu yake.',
    'ra.notMoved':
      'Uamuzi wako umeandikwa. Kozi yenyewe haikuweza kusogezwa mbele kutoka hapa; wafanyakazi wa jukwaa wanaweza kuona uamuzi wako na kuisogeza. Huhitaji kuamua tena.',
    'ra.eNotYours': 'Ukaguzi huo si wako.',
    'ra.eNotOpen':
      'Ukaguzi huu hauko wazi tena kwa jambo hilo. Pakia ukurasa upya uone ulipofikia.',
    'ra.eConflict': 'Mgongano uliotamka unakuzuia kuamua ukaguzi huu.',
    'ra.eReason': 'Toa sababu ya uamuzi.',
    'ra.eRefused': 'Haukuandikwa. Pakia ukurasa upya uone ukaguzi ulipofikia.',
    'ra.standHead': 'Huwezi kukagua hii bila upendeleo?',
    'ra.declared': 'Umetamkwa',
    'ra.declareOpen': 'Tamka mgongano wa maslahi kuhusu kozi hii',
    'ra.declareNote':
      'Kutamka kunakuzuia mara moja kuamua ukaguzi huu, na kunaendelea kukuzuia mpaka wafanyakazi wa jukwaa waushughulikie. Hakufungi ukaguzi: ikiwa bado ni ombi, likatae pia; vinginevyo wafanyakazi ndio wanaoufunga.',
  },
  af: {
    'ra.decisions': 'Besluite',
    'ra.gistHead': 'Wat ’n leerder kry',
    'ra.allOpen': 'Elke les gee die leerder iets om oop te maak. Lesse: {n}',
    'ra.someOpen': 'Lesse wat die leerder iets gee om oop te maak: {some} van {all}',
    'ra.nothing': 'Lesse wat die leerder hoegenaamd niks gee nie: {n}',
    'ra.trouble':
      'Lesse met iets wat die moeite werd is om te weet voordat hulle ’n leerder bereik: {n}',
    'ra.nextEmpty':
      'Die moeite werd om eerste oop te maak: {lesson}. Daar is hoegenaamd niks in nie, dus kry die leerder ’n titel en ’n leë bladsy.',
    'ra.nextSilent':
      'Lyk klaar, en is nie: {lesson}. Iets is daaraan geheg, en die leerder kan niks daarvan oopmaak nie.',
    'ra.nextNoted':
      'Die moeite werd om na te kyk: {lesson}. Die leerder kan dit gebruik, en daar is iets daaroor wat eers geweet moet word.',
    'ra.nextAlso': 'Ander lesse op dieselfde stadium: {n}',
    'ra.asLearner': 'Sien dit soos ’n leerder',
    'ra.deliveryUnknown':
      'Die enkoderingstoestand van opgelaaide lêers kon nie nou gelees word nie, dus kan ’n lêer wat sonder ’n speler gewys word een wees waaroor niemand gevra het nie, eerder as een wat misluk het.',
    'ra.notVerdict':
      'Dit sê wat ’n leerder sou teëkom, nie wat om te besluit nie. Die besluit is joune, en niks hier is op sy eie ’n rede om te aanvaar of van die hand te wys nie: ’n vakkundige beoordeling gaan oor wat onderrig word, en dit gaan oor wat aankom.',
    'ra.outline': 'Uiteensetting',
    'ra.noSections':
      'Hierdie weergawe het geen afdelings nie. Daar is niks om te beoordeel nie, en dit kan nie gepubliseer word nie.',
    'ra.noLessons': 'Geen lesse nie.',
    'ra.bEmpty': 'Niks daarin nie',
    'ra.bSilent': 'Niks om te speel nie',
    'ra.bNoted': 'Die moeite werd om na te kyk',
    'ra.bReady': 'Gereed',
    'ra.noCopy':
      '{name}: geen afleweringskopie is nog geënkodeer nie, dus is daar niks om na te kyk nie, en ’n leerder sou ’n sin kry waar die speler moes wees.',
    'ra.watchable':
      'Jy kan na die afleweringskopieë van hierdie lesse kyk terwyl hierdie beoordeling oop is. Jy kan hulle nie stoor nie, en die lêer wat ’n onderwyser opgelaai het, word nie aan jou bedien nie: wat beoordeel word, is wat ’n leerder sal sien.',
    'ra.notWatchable':
      'Die lesse kan gespeel word van die oomblik dat ’n beoordeling aanvaar word totdat dit gesluit word, dus kan hulle nie nou hier gespeel word nie.',
    'ra.needsHead': 'Wat hierdie weergawe nodig het, en wat nagegaan is',
    'ra.english': 'Die twee panele hieronder is vir eers in Engels.',
    'ra.decisionHead': 'Jou besluit',
    'ra.backQueue': 'Terug na die tou',
    'ra.unread': 'Hierdie beoordeling kon nie nou gelees word nie. Probeer oor ’n oomblik weer.',
    'ra.outlineUnread':
      'Die uiteensetting van hierdie kursus kon nie nou gelees word nie, dus word dit nie gewys nie. Laai die bladsy weer voordat jy besluit.',
    'ra.partUnread':
      '’n Deel van hierdie bladsy kon nie nou gelees word nie, dus is dit onvolledig. Laai dit weer voordat jy besluit.',
    'ra.offerHead': 'Hierdie beoordeling word aan jou aangebied',
    'ra.offerNote': 'Niks word verwag totdat jy dit aanvaar nie.',
    'ra.accept': 'Aanvaar hierdie beoordeling',
    'ra.decline': 'Wys van die hand',
    'ra.recordHead': 'Teken jou besluit aan',
    'ra.reason': 'Rede',
    'ra.reasonHint':
      'Wat het jy nagegaan, en wat het jy gevind? Dit is die rekord waarteen ’n onderwyser sou appelleer.',
    'ra.approve': 'Keur goed',
    'ra.revise': 'Vra hersienings',
    'ra.reject': 'Keur af',
    'ra.approveNote':
      'Goedkeuring skuif die weergawe na “goedgekeur”, waar platformpersoneel dit kan publiseer. Jy kan dit nie self publiseer nie, en jy kan nie ’n kursus goedkeur wat jy geskryf het nie.',
    'ra.decided': 'Jy het reeds ’n besluit oor hierdie beoordeling aangeteken.',
    'ra.closedNote':
      'Hierdie beoordeling is gesluit, dus kan geen besluit daarop aangeteken word nie.',
    'ra.notMoved':
      'Jou besluit is aangeteken. Die kursus self kon nie van hier af aangeskuif word nie; platformpersoneel kan jou besluit sien en dit aanskuif. Jy hoef nie weer te besluit nie.',
    'ra.eNotYours': 'Daardie beoordeling is nie joune nie.',
    'ra.eNotOpen':
      'Hierdie beoordeling is nie meer daarvoor oop nie. Laai die bladsy weer om te sien waar dit staan.',
    'ra.eConflict':
      '’n Botsing wat jy verklaar het, verhinder jou om oor hierdie beoordeling te besluit.',
    'ra.eReason': 'Gee ’n rede vir die besluit.',
    'ra.eRefused':
      'Dit is nie aangeteken nie. Laai die bladsy weer om te sien waar die beoordeling staan.',
    'ra.standHead': 'Kan jy dit nie onpartydig beoordeel nie?',
    'ra.declared': 'Verklaar',
    'ra.declareOpen': 'Verklaar ’n botsing van belange oor hierdie kursus',
    'ra.declareNote':
      'Die verklaring verhinder jou dadelik om oor hierdie beoordeling te besluit, en hou aan om jou te verhinder totdat platformpersoneel dit aangehoor het. Dit sluit nie die beoordeling nie: as dit nog ’n aanbod is, wys dit ook van die hand; anders sluit die personeel dit.',
  },
  'zh-hans': {
    'ra.decisions': '决定',
    'ra.gistHead': '学习者能得到什么',
    'ra.allOpen': '每一课都有可供学习者打开的内容。课数：{n}',
    'ra.someOpen': '有内容可供学习者打开的课：{all} 课中的 {some} 课',
    'ra.nothing': '完全没有内容给学习者的课：{n}',
    'ra.trouble': '在到达学习者之前有事项值得了解的课：{n}',
    'ra.nextEmpty': '值得先打开：{lesson}。里面什么都没有，学习者只会看到一个标题和一张空白页。',
    'ra.nextSilent': '看起来已完成，其实没有：{lesson}。它附有内容，但学习者一样也打不开。',
    'ra.nextNoted': '值得看一眼：{lesson}。学习者可以使用它，但有一件事值得先了解。',
    'ra.nextAlso': '处于同一阶段的其他课：{n}',
    'ra.asLearner': '以学习者的视角查看',
    'ra.deliveryUnknown': '上传文件的编码状态暂时无法读取，因此没有播放器的文件可能只是没有人查询过，而不是编码失败。',
    'ra.notVerdict':
      '这里说的是学习者会遇到什么，而不是该作出什么决定。决定由你作出，这里的任何一项都不能单独成为接受或谢绝的理由：学术审阅关乎所教的内容，这里关乎送达的内容。',
    'ra.outline': '大纲',
    'ra.noSections': '这个版本没有任何章节。没有可审阅的内容，也无法发布。',
    'ra.noLessons': '没有课。',
    'ra.bEmpty': '里面没有内容',
    'ra.bSilent': '没有可播放的内容',
    'ra.bNoted': '值得看一眼',
    'ra.bReady': '就绪',
    'ra.noCopy': '{name}：尚未编码出播放副本，因此没有可观看的内容，学习者会在播放器的位置看到一句话。',
    'ra.watchable': '在这次审阅开放期间，你可以观看这些课的播放副本。你不能保存它们，教师上传的原文件也不会提供给你：受审阅的是学习者将看到的内容。',
    'ra.notWatchable': '从审阅被接受起到关闭为止，课可以播放，因此现在无法在这里播放。',
    'ra.needsHead': '这个版本需要什么，以及已检查了什么',
    'ra.english': '下面两个面板暂时为英文。',
    'ra.decisionHead': '你的决定',
    'ra.backQueue': '返回队列',
    'ra.unread': '暂时无法读取这次审阅。请稍后再试。',
    'ra.outlineUnread': '暂时无法读取这门课程的大纲，因此没有显示。请在作出决定前重新加载页面。',
    'ra.partUnread': '本页有一部分暂时无法读取，因此内容不完整。请在作出决定前重新加载。',
    'ra.offerHead': '这次审阅是向你发出的邀请',
    'ra.offerNote': '在你接受之前，不要求你做任何事。',
    'ra.accept': '接受这次审阅',
    'ra.decline': '谢绝',
    'ra.recordHead': '记录你的决定',
    'ra.reason': '理由',
    'ra.reasonHint': '你检查了什么，发现了什么？教师提出申诉时依据的就是这份记录。',
    'ra.approve': '通过',
    'ra.revise': '要求修改',
    'ra.reject': '否决',
    'ra.approveNote': '通过会把版本转为“已通过”状态，平台工作人员可在该状态下发布它。你不能自己发布，也不能通过自己撰写的课程。',
    'ra.decided': '你已经为这次审阅记录过决定。',
    'ra.closedNote': '这次审阅已关闭，因此无法为它记录决定。',
    'ra.notMoved': '你的决定已记录。课程本身未能从这里向前推进；平台工作人员可以看到你的决定并推进课程。你不需要再次作出决定。',
    'ra.eNotYours': '那次审阅不属于你。',
    'ra.eNotOpen': '这次审阅已不再接受该操作。请重新加载页面，查看它的现状。',
    'ra.eConflict': '你申报的一项利益冲突使你不能对这次审阅作出决定。',
    'ra.eReason': '请为决定写明理由。',
    'ra.eRefused': '没有记录。请重新加载页面，查看这次审阅的现状。',
    'ra.standHead': '无法公正地审阅它？',
    'ra.declared': '已申报',
    'ra.declareOpen': '申报与这门课程有关的利益冲突',
    'ra.declareNote': '申报会立即使你不能对这次审阅作出决定，并且在平台工作人员处理之前一直如此。申报不会关闭这次审阅：如果它仍是邀请，请同时谢绝；否则由工作人员关闭。',
  },
  'zh-hant': {
    'ra.decisions': '決定',
    'ra.gistHead': '學習者能得到什麼',
    'ra.allOpen': '每一課都有可供學習者打開的內容。課數：{n}',
    'ra.someOpen': '有內容可供學習者打開的課：{all} 課中的 {some} 課',
    'ra.nothing': '完全沒有內容給學習者的課：{n}',
    'ra.trouble': '在到達學習者之前有事項值得了解的課：{n}',
    'ra.nextEmpty': '值得先打開：{lesson}。裡面什麼都沒有，學習者只會看到一個標題和一張空白頁。',
    'ra.nextSilent': '看起來已完成，其實沒有：{lesson}。它附有內容，但學習者一樣也打不開。',
    'ra.nextNoted': '值得看一眼：{lesson}。學習者可以使用它，但有一件事值得先了解。',
    'ra.nextAlso': '處於同一階段的其他課：{n}',
    'ra.asLearner': '以學習者的視角查看',
    'ra.deliveryUnknown': '上傳檔案的編碼狀態暫時無法讀取，因此沒有播放器的檔案可能只是沒有人查詢過，而不是編碼失敗。',
    'ra.notVerdict':
      '這裡說的是學習者會遇到什麼，而不是該作出什麼決定。決定由你作出，這裡的任何一項都不能單獨成為接受或婉拒的理由：學術審閱關乎所教的內容，這裡關乎送達的內容。',
    'ra.outline': '大綱',
    'ra.noSections': '這個版本沒有任何章節。沒有可審閱的內容，也無法發布。',
    'ra.noLessons': '沒有課。',
    'ra.bEmpty': '裡面沒有內容',
    'ra.bSilent': '沒有可播放的內容',
    'ra.bNoted': '值得看一眼',
    'ra.bReady': '就緒',
    'ra.noCopy': '{name}：尚未編碼出播放副本，因此沒有可觀看的內容，學習者會在播放器的位置看到一句話。',
    'ra.watchable': '在這次審閱開放期間，你可以觀看這些課的播放副本。你不能儲存它們，教師上傳的原檔案也不會提供給你：受審閱的是學習者將看到的內容。',
    'ra.notWatchable': '從審閱被接受起到關閉為止，課可以播放，因此現在無法在這裡播放。',
    'ra.needsHead': '這個版本需要什麼，以及已檢查了什麼',
    'ra.english': '下面兩個面板暫時為英文。',
    'ra.decisionHead': '你的決定',
    'ra.backQueue': '返回佇列',
    'ra.unread': '暫時無法讀取這次審閱。請稍後再試。',
    'ra.outlineUnread': '暫時無法讀取這門課程的大綱，因此沒有顯示。請在作出決定前重新載入頁面。',
    'ra.partUnread': '本頁有一部分暫時無法讀取，因此內容不完整。請在作出決定前重新載入。',
    'ra.offerHead': '這次審閱是向你發出的邀請',
    'ra.offerNote': '在你接受之前，不要求你做任何事。',
    'ra.accept': '接受這次審閱',
    'ra.decline': '婉拒',
    'ra.recordHead': '記錄你的決定',
    'ra.reason': '理由',
    'ra.reasonHint': '你檢查了什麼，發現了什麼？教師提出申訴時依據的就是這份記錄。',
    'ra.approve': '通過',
    'ra.revise': '要求修改',
    'ra.reject': '否決',
    'ra.approveNote': '通過會把版本轉為「已通過」狀態，平台工作人員可在該狀態下發布它。你不能自己發布，也不能通過自己撰寫的課程。',
    'ra.decided': '你已經為這次審閱記錄過決定。',
    'ra.closedNote': '這次審閱已關閉，因此無法為它記錄決定。',
    'ra.notMoved': '你的決定已記錄。課程本身未能從這裡向前推進；平台工作人員可以看到你的決定並推進課程。你不需要再次作出決定。',
    'ra.eNotYours': '那次審閱不屬於你。',
    'ra.eNotOpen': '這次審閱已不再接受該操作。請重新載入頁面，查看它的現狀。',
    'ra.eConflict': '你申報的一項利益衝突使你不能對這次審閱作出決定。',
    'ra.eReason': '請為決定寫明理由。',
    'ra.eRefused': '沒有記錄。請重新載入頁面，查看這次審閱的現狀。',
    'ra.standHead': '無法公正地審閱它？',
    'ra.declared': '已申報',
    'ra.declareOpen': '申報與這門課程有關的利益衝突',
    'ra.declareNote': '申報會立即使你不能對這次審閱作出決定，並且在平台工作人員處理之前一直如此。申報不會關閉這次審閱：如果它仍是邀請，請同時婉拒；否則由工作人員關閉。',
  },
  vi: {
    'ra.decisions': 'Quyết định',
    'ra.gistHead': 'Người học nhận được gì',
    'ra.allOpen': 'Bài học nào cũng cho người học một thứ để mở. Số bài học: {n}',
    'ra.someOpen': 'Bài học cho người học một thứ để mở: {some} trên {all}',
    'ra.nothing': 'Bài học không cho người học bất cứ thứ gì: {n}',
    'ra.trouble': 'Bài học có điều nên biết trước khi đến với người học: {n}',
    'ra.nextEmpty':
      'Nên mở trước: {lesson}. Trong đó không có gì cả, nên người học chỉ nhận được một tiêu đề và một trang trống.',
    'ra.nextSilent':
      'Trông như đã xong, nhưng chưa: {lesson}. Có thứ được đính kèm, và người học không mở được thứ nào.',
    'ra.nextNoted':
      'Đáng xem qua: {lesson}. Người học dùng được bài này, và có một điều về nó nên biết trước.',
    'ra.nextAlso': 'Bài học khác ở cùng giai đoạn: {n}',
    'ra.asLearner': 'Xem như người học',
    'ra.deliveryUnknown':
      'Hiện chưa đọc được trạng thái mã hóa của các tệp đã tải lên, nên một tệp hiện ra không có trình phát có thể là tệp chưa ai hỏi đến chứ không phải tệp bị lỗi.',
    'ra.notVerdict':
      'Phần này cho biết người học sẽ gặp gì, không phải nên quyết định thế nào. Quyết định là của bạn, và không điều gì ở đây tự nó là lý do để nhận hay từ chối: duyệt học thuật là về điều được dạy, còn phần này là về điều đến được nơi.',
    'ra.outline': 'Dàn bài',
    'ra.noSections':
      'Phiên bản này không có phần nào. Không có gì để duyệt, và không thể xuất bản.',
    'ra.noLessons': 'Không có bài học.',
    'ra.bEmpty': 'Không có gì bên trong',
    'ra.bSilent': 'Không có gì để phát',
    'ra.bNoted': 'Đáng xem qua',
    'ra.bReady': 'Sẵn sàng',
    'ra.noCopy':
      '{name}: chưa có bản phát nào được mã hóa, nên không có gì để xem, và người học sẽ nhận được một câu ở chỗ lẽ ra là trình phát.',
    'ra.watchable':
      'Bạn có thể xem các bản phát của những bài học này trong lúc lượt duyệt này còn mở. Bạn không thể lưu chúng, và tệp giáo viên tải lên không được gửi cho bạn: thứ được duyệt là thứ người học sẽ thấy.',
    'ra.notWatchable':
      'Bài học phát được từ lúc lượt duyệt được nhận cho đến khi nó đóng, nên bây giờ không phát được ở đây.',
    'ra.needsHead': 'Phiên bản này cần gì, và những gì đã được kiểm tra',
    'ra.english': 'Hai bảng bên dưới hiện bằng tiếng Anh.',
    'ra.decisionHead': 'Quyết định của bạn',
    'ra.backQueue': 'Quay lại hàng chờ',
    'ra.unread': 'Hiện chưa đọc được lượt duyệt này. Hãy thử lại sau giây lát.',
    'ra.outlineUnread':
      'Hiện chưa đọc được dàn bài của khóa học này nên nó không được hiển thị. Hãy tải lại trang trước khi quyết định.',
    'ra.partUnread':
      'Hiện chưa đọc được một phần của trang này nên trang chưa đầy đủ. Hãy tải lại trước khi quyết định.',
    'ra.offerHead': 'Lượt duyệt này được mời đến bạn',
    'ra.offerNote': 'Chưa ai chờ đợi gì ở bạn cho đến khi bạn nhận.',
    'ra.accept': 'Nhận lượt duyệt này',
    'ra.decline': 'Từ chối nhận',
    'ra.recordHead': 'Ghi nhận quyết định của bạn',
    'ra.reason': 'Lý do',
    'ra.reasonHint': 'Bạn đã kiểm tra gì, và thấy gì? Đây là bản ghi mà giáo viên sẽ khiếu nại.',
    'ra.approve': 'Chấp thuận',
    'ra.revise': 'Yêu cầu chỉnh sửa',
    'ra.reject': 'Bác bỏ',
    'ra.approveNote':
      'Chấp thuận sẽ chuyển phiên bản sang trạng thái “đã chấp thuận”, ở đó nhân viên nền tảng có thể xuất bản nó. Bạn không thể tự xuất bản, và không thể chấp thuận khóa học do chính bạn viết.',
    'ra.decided': 'Bạn đã ghi nhận một quyết định cho lượt duyệt này rồi.',
    'ra.closedNote': 'Lượt duyệt này đã đóng nên không thể ghi nhận quyết định cho nó.',
    'ra.notMoved':
      'Quyết định của bạn đã được ghi nhận. Riêng khóa học thì chưa chuyển tiếp được từ đây; nhân viên nền tảng thấy được quyết định của bạn và có thể chuyển nó. Bạn không cần quyết định lại.',
    'ra.eNotYours': 'Lượt duyệt đó không phải của bạn.',
    'ra.eNotOpen':
      'Lượt duyệt này không còn mở cho việc đó. Hãy tải lại trang để xem nó đang ở đâu.',
    'ra.eConflict': 'Một xung đột bạn đã khai báo ngăn bạn quyết định lượt duyệt này.',
    'ra.eReason': 'Hãy nêu lý do cho quyết định.',
    'ra.eRefused': 'Chưa được ghi nhận. Hãy tải lại trang để xem lượt duyệt đang ở đâu.',
    'ra.standHead': 'Không thể duyệt một cách vô tư?',
    'ra.declared': 'Đã khai báo',
    'ra.declareOpen': 'Khai báo xung đột lợi ích về khóa học này',
    'ra.declareNote':
      'Khai báo sẽ lập tức ngăn bạn quyết định lượt duyệt này, và tiếp tục ngăn cho đến khi nhân viên nền tảng xem xét. Nó không đóng lượt duyệt: nếu đây vẫn là lời mời, hãy từ chối cả lời mời; nếu không, nhân viên sẽ đóng.',
  },
  th: {
    'ra.decisions': 'คำตัดสิน',
    'ra.gistHead': 'สิ่งที่ผู้เรียนได้รับ',
    'ra.allOpen': 'ทุกบทเรียนมีบางอย่างให้ผู้เรียนเปิด บทเรียน: {n}',
    'ra.someOpen': 'บทเรียนที่มีบางอย่างให้ผู้เรียนเปิด: {some} จาก {all}',
    'ra.nothing': 'บทเรียนที่ไม่มีอะไรให้ผู้เรียนเลย: {n}',
    'ra.trouble': 'บทเรียนที่มีเรื่องควรรู้ก่อนจะไปถึงผู้เรียน: {n}',
    'ra.nextEmpty':
      'ควรเปิดดูก่อน: {lesson} ข้างในไม่มีอะไรเลย ผู้เรียนจึงได้เพียงชื่อบทเรียนกับหน้าว่าง',
    'ra.nextSilent':
      'ดูเหมือนเสร็จแล้ว แต่ยังไม่เสร็จ: {lesson} มีบางอย่างแนบอยู่ แต่ผู้เรียนเปิดไม่ได้สักอย่าง',
    'ra.nextNoted':
      'ควรดูสักหน่อย: {lesson} ผู้เรียนใช้งานได้ และมีเรื่องเกี่ยวกับบทเรียนนี้ที่ควรรู้ก่อน',
    'ra.nextAlso': 'บทเรียนอื่นที่อยู่ในขั้นเดียวกัน: {n}',
    'ra.asLearner': 'ดูแบบที่ผู้เรียนเห็น',
    'ra.deliveryUnknown':
      'ขณะนี้อ่านสถานะการเข้ารหัสของไฟล์ที่อัปโหลดไม่ได้ ไฟล์ที่แสดงโดยไม่มีตัวเล่นจึงอาจเป็นไฟล์ที่ยังไม่มีใครถามถึง ไม่ใช่ไฟล์ที่ล้มเหลว',
    'ra.notVerdict':
      'ส่วนนี้บอกว่าผู้เรียนจะพบอะไร ไม่ได้บอกว่าควรตัดสินอย่างไร การตัดสินเป็นของคุณ และไม่มีสิ่งใดในนี้ที่เป็นเหตุผลให้รับหรือปฏิเสธได้โดยลำพัง: การตรวจทานทางวิชาการว่าด้วยสิ่งที่สอน ส่วนนี้ว่าด้วยสิ่งที่ไปถึง',
    'ra.outline': 'โครงร่าง',
    'ra.noSections': 'เวอร์ชันนี้ไม่มีหมวดใดเลย ไม่มีอะไรให้ตรวจทาน และเผยแพร่ไม่ได้',
    'ra.noLessons': 'ไม่มีบทเรียน',
    'ra.bEmpty': 'ข้างในไม่มีอะไร',
    'ra.bSilent': 'ไม่มีอะไรให้เล่น',
    'ra.bNoted': 'ควรดูสักหน่อย',
    'ra.bReady': 'พร้อม',
    'ra.noCopy':
      '{name}: ยังไม่มีสำเนาสำหรับแสดงที่เข้ารหัสแล้ว จึงไม่มีอะไรให้ดู และผู้เรียนจะได้เห็นประโยคหนึ่งแทนตัวเล่น',
    'ra.watchable':
      'คุณดูสำเนาสำหรับแสดงของบทเรียนเหล่านี้ได้ตลอดเวลาที่งานตรวจทานนี้ยังเปิดอยู่ คุณบันทึกสำเนาไว้ไม่ได้ และไฟล์ที่ผู้สอนอัปโหลดจะไม่ถูกส่งให้คุณ: สิ่งที่ถูกตรวจทานคือสิ่งที่ผู้เรียนจะเห็น',
    'ra.notWatchable':
      'บทเรียนเล่นได้ตั้งแต่ตอนที่รับงานตรวจทานจนถึงตอนที่งานปิด ตอนนี้จึงเล่นที่นี่ไม่ได้',
    'ra.needsHead': 'เวอร์ชันนี้ต้องการอะไร และตรวจอะไรไปแล้ว',
    'ra.english': 'สองแผงด้านล่างยังเป็นภาษาอังกฤษอยู่ในตอนนี้',
    'ra.decisionHead': 'คำตัดสินของคุณ',
    'ra.backQueue': 'กลับไปที่คิว',
    'ra.unread': 'ขณะนี้อ่านงานตรวจทานนี้ไม่ได้ โปรดลองอีกครั้งในอีกสักครู่',
    'ra.outlineUnread':
      'ขณะนี้อ่านโครงร่างของคอร์สนี้ไม่ได้ จึงไม่ได้แสดงไว้ โปรดโหลดหน้านี้ใหม่ก่อนตัดสิน',
    'ra.partUnread': 'ขณะนี้อ่านบางส่วนของหน้านี้ไม่ได้ หน้านี้จึงไม่ครบ โปรดโหลดใหม่ก่อนตัดสิน',
    'ra.offerHead': 'งานตรวจทานนี้ถูกเสนอให้คุณ',
    'ra.offerNote': 'ยังไม่มีใครคาดหวังอะไรจนกว่าคุณจะรับงาน',
    'ra.accept': 'รับงานตรวจทานนี้',
    'ra.decline': 'ไม่รับงานนี้',
    'ra.recordHead': 'บันทึกคำตัดสินของคุณ',
    'ra.reason': 'เหตุผล',
    'ra.reasonHint': 'คุณตรวจอะไร และพบอะไร นี่คือบันทึกที่ผู้สอนจะใช้อุทธรณ์',
    'ra.approve': 'อนุมัติ',
    'ra.revise': 'ขอการแก้ไข',
    'ra.reject': 'ไม่อนุมัติหลักสูตรนี้',
    'ra.approveNote':
      'การอนุมัติจะย้ายเวอร์ชันไปยังสถานะ “อนุมัติแล้ว” ซึ่งเจ้าหน้าที่ของแพลตฟอร์มเผยแพร่ได้ คุณเผยแพร่เองไม่ได้ และอนุมัติคอร์สที่คุณเขียนเองไม่ได้',
    'ra.decided': 'คุณบันทึกคำตัดสินของงานตรวจทานนี้ไว้แล้ว',
    'ra.closedNote': 'งานตรวจทานนี้ปิดแล้ว จึงบันทึกคำตัดสินไม่ได้',
    'ra.notMoved':
      'บันทึกคำตัดสินของคุณแล้ว ส่วนตัวคอร์สยังย้ายต่อจากตรงนี้ไม่ได้ เจ้าหน้าที่ของแพลตฟอร์มเห็นคำตัดสินของคุณและย้ายคอร์สได้ คุณไม่ต้องตัดสินอีกครั้ง',
    'ra.eNotYours': 'งานตรวจทานนั้นไม่ใช่ของคุณ',
    'ra.eNotOpen':
      'งานตรวจทานนี้ไม่เปิดให้ทำเช่นนั้นแล้ว โปรดโหลดหน้านี้ใหม่เพื่อดูว่างานอยู่ในสถานะใด',
    'ra.eConflict': 'ผลประโยชน์ทับซ้อนที่คุณแจ้งไว้ทำให้คุณตัดสินงานตรวจทานนี้ไม่ได้',
    'ra.eReason': 'โปรดให้เหตุผลของคำตัดสิน',
    'ra.eRefused': 'ไม่ได้บันทึก โปรดโหลดหน้านี้ใหม่เพื่อดูว่างานตรวจทานอยู่ในสถานะใด',
    'ra.standHead': 'ตรวจทานงานนี้อย่างเป็นกลางไม่ได้ใช่ไหม',
    'ra.declared': 'แจ้งแล้ว',
    'ra.declareOpen': 'แจ้งผลประโยชน์ทับซ้อนเกี่ยวกับคอร์สนี้',
    'ra.declareNote':
      'การแจ้งจะทำให้คุณตัดสินงานตรวจทานนี้ไม่ได้ในทันที และจะเป็นเช่นนั้นจนกว่าเจ้าหน้าที่ของแพลตฟอร์มจะพิจารณา การแจ้งไม่ได้ปิดงานตรวจทาน: หากยังเป็นข้อเสนออยู่ โปรดปฏิเสธข้อเสนอด้วย มิฉะนั้นเจ้าหน้าที่จะเป็นผู้ปิด',
  },
  fil: {
    'ra.decisions': 'Mga pasya',
    'ra.gistHead': 'Ang natatanggap ng mag-aaral',
    'ra.allOpen': 'Bawat aralin ay may naibibigay sa mag-aaral na mabubuksan. Mga aralin: {n}',
    'ra.someOpen': 'Mga araling may naibibigay sa mag-aaral na mabubuksan: {some} sa {all}',
    'ra.nothing': 'Mga araling walang kahit anong naibibigay sa mag-aaral: {n}',
    'ra.trouble': 'Mga araling may dapat malaman bago makarating sa mag-aaral: {n}',
    'ra.nextEmpty':
      'Mainam na unahing buksan: {lesson}. Wala itong kahit anong laman, kaya pamagat at blangkong pahina lang ang makukuha ng mag-aaral.',
    'ra.nextSilent':
      'Mukhang tapos na, pero hindi pa: {lesson}. May nakakabit dito, at wala ni isa roon ang mabubuksan ng mag-aaral.',
    'ra.nextNoted':
      'Mainam na tingnan: {lesson}. Magagamit ito ng mag-aaral, at may isang bagay tungkol dito na dapat munang malaman.',
    'ra.nextAlso': 'Iba pang aralin sa parehong yugto: {n}',
    'ra.asLearner': 'Tingnan gaya ng mag-aaral',
    'ra.deliveryUnknown':
      'Hindi mabasa ngayon ang kalagayan ng pag-encode ng mga in-upload na file, kaya ang file na ipinapakitang walang player ay maaaring file na wala pang nagtanong tungkol dito, hindi file na pumalya.',
    'ra.notVerdict':
      'Sinasabi nito kung ano ang madaratnan ng mag-aaral, hindi kung ano ang ipapasya. Sa iyo ang pasya, at wala rito ang sapat na dahilan nang mag-isa para tanggapin o tanggihan: ang pagsusuring pang-iskolar ay tungkol sa itinuturo, at ito ay tungkol sa nakararating.',
    'ra.outline': 'Balangkas',
    'ra.noSections':
      'Walang seksiyon ang bersiyong ito. Walang masusuri, at hindi ito mailalathala.',
    'ra.noLessons': 'Walang aralin.',
    'ra.bEmpty': 'Walang laman',
    'ra.bSilent': 'Walang mapapatugtog',
    'ra.bNoted': 'Mainam na tingnan',
    'ra.bReady': 'Handa',
    'ra.noCopy':
      '{name}: wala pang kopyang pampalabas na na-encode, kaya walang mapapanood, at isang pangungusap ang makukuha ng mag-aaral sa dapat sana ay kinalalagyan ng player.',
    'ra.watchable':
      'Mapapanood mo ang mga kopyang pampalabas ng mga araling ito habang bukas ang pagsusuring ito. Hindi mo sila mase-save, at hindi ibinibigay sa iyo ang file na in-upload ng guro: ang sinusuri ay ang makikita ng mag-aaral.',
    'ra.notWatchable':
      'Mapapatugtog ang mga aralin mula sa sandaling tanggapin ang pagsusuri hanggang sa isara ito, kaya hindi sila mapapatugtog dito ngayon.',
    'ra.needsHead': 'Ang kailangan ng bersiyong ito, at ang nasuri na',
    'ra.english': 'Nasa Ingles muna ang dalawang panel sa ibaba.',
    'ra.decisionHead': 'Ang pasya mo',
    'ra.backQueue': 'Bumalik sa pila',
    'ra.unread': 'Hindi mabasa ngayon ang pagsusuring ito. Subukan muli maya-maya.',
    'ra.outlineUnread':
      'Hindi mabasa ngayon ang balangkas ng kursong ito, kaya hindi ito ipinapakita. I-load muli ang pahina bago ka magpasya.',
    'ra.partUnread':
      'Hindi mabasa ngayon ang bahagi ng pahinang ito, kaya kulang ito. I-load ito muli bago ka magpasya.',
    'ra.offerHead': 'Iniaalok sa iyo ang pagsusuring ito',
    'ra.offerNote': 'Walang inaasahan sa iyo hangga’t hindi mo ito tinatanggap.',
    'ra.accept': 'Tanggapin ang pagsusuring ito',
    'ra.decline': 'Tanggihan ang alok',
    'ra.recordHead': 'Itala ang pasya mo',
    'ra.reason': 'Dahilan',
    'ra.reasonHint': 'Ano ang sinuri mo, at ano ang nakita mo? Ito ang talang iaapela ng guro.',
    'ra.approve': 'Aprubahan',
    'ra.revise': 'Humiling ng mga rebisyon',
    'ra.reject': 'Huwag aprubahan',
    'ra.approveNote':
      'Inililipat ng pag-apruba ang bersiyon sa kalagayang “naaprubahan”, kung saan mailalathala ito ng mga kawani ng platform. Hindi mo ito mailalathala nang ikaw mismo, at hindi mo maaaprubahan ang kursong isinulat mo.',
    'ra.decided': 'Nakapagtala ka na ng pasya sa pagsusuring ito.',
    'ra.closedNote': 'Sarado na ang pagsusuring ito, kaya walang pasyang maitatala rito.',
    'ra.notMoved':
      'Naitala ang pasya mo. Ang kurso mismo ay hindi naisulong mula rito; nakikita ng mga kawani ng platform ang pasya mo at maisusulong nila ito. Hindi mo kailangang magpasya muli.',
    'ra.eNotYours': 'Hindi sa iyo ang pagsusuring iyon.',
    'ra.eNotOpen':
      'Hindi na bukas ang pagsusuring ito para diyan. I-load muli ang pahina para makita kung nasaan na ito.',
    'ra.eConflict':
      'Isang salungatang idineklara mo ang pumipigil sa iyong pagpasyahan ang pagsusuring ito.',
    'ra.eReason': 'Magbigay ng dahilan para sa pasya.',
    'ra.eRefused':
      'Hindi ito naitala. I-load muli ang pahina para makita kung nasaan na ang pagsusuri.',
    'ra.standHead': 'Hindi mo ito masusuri nang walang kinikilingan?',
    'ra.declared': 'Naideklara',
    'ra.declareOpen': 'Magdeklara ng salungatan ng interes tungkol sa kursong ito',
    'ra.declareNote':
      'Agad kang pinipigilan ng deklarasyon na pagpasyahan ang pagsusuring ito, at patuloy kang pipigilan hanggang sa dinggin ito ng mga kawani ng platform. Hindi nito isinasara ang pagsusuri: kung alok pa ito, tanggihan mo rin; kung hindi, ang mga kawani ang magsasara.',
  },
  uz: {
    'ra.decisions': 'Qarorlar',
    'ra.gistHead': 'Oʻquvchi nima oladi',
    'ra.allOpen': 'Har bir dars oʻquvchiga ochish uchun biror narsa beradi. Darslar: {n}',
    'ra.someOpen': 'Oʻquvchiga ochish uchun biror narsa beradigan darslar: {all} tadan {some} tasi',
    'ra.nothing': 'Oʻquvchiga umuman hech narsa bermaydigan darslar: {n}',
    'ra.trouble':
      'Oʻquvchiga yetib borishidan oldin bilib qoʻyishga arziydigan jihati bor darslar: {n}',
    'ra.nextEmpty':
      'Avval shuni ochgan maʼqul: {lesson}. Unda umuman hech narsa yoʻq, shuning uchun oʻquvchi faqat sarlavha va boʻsh sahifani koʻradi.',
    'ra.nextSilent':
      'Tugagandek koʻrinadi, lekin tugamagan: {lesson}. Unga nimadir biriktirilgan, ammo oʻquvchi ulardan hech birini ocha olmaydi.',
    'ra.nextNoted':
      'Bir koʻz tashlashga arziydi: {lesson}. Oʻquvchi undan foydalana oladi, lekin u haqda avval bilib qoʻyishga arziydigan narsa bor.',
    'ra.nextAlso': 'Shu bosqichdagi boshqa darslar: {n}',
    'ra.asLearner': 'Oʻquvchi koʻzi bilan koʻrish',
    'ra.deliveryUnknown':
      'Yuklangan fayllarning kodlash holatini hozir oʻqib boʻlmadi, shuning uchun pleyersiz koʻrsatilgan fayl muvaffaqiyatsiz tugagan fayl emas, balki hech kim soʻramagan fayl boʻlishi mumkin.',
    'ra.notVerdict':
      'Bu oʻquvchi nimaga duch kelishini aytadi, qanday qaror qilishni emas. Qaror sizniki, va bu yerdagi hech narsa oʻzicha qabul qilish yoki rad etish uchun sabab emas: ilmiy taqriz nima oʻrgatilayotgani haqida, bu esa nima yetib borishi haqida.',
    'ra.outline': 'Reja',
    'ra.noSections':
      'Bu versiyada boʻlimlar yoʻq. Taqriz qilinadigan narsa yoʻq va uni nashr etib boʻlmaydi.',
    'ra.noLessons': 'Darslar yoʻq.',
    'ra.bEmpty': 'Ichida hech narsa yoʻq',
    'ra.bSilent': 'Ijro etiladigan narsa yoʻq',
    'ra.bNoted': 'Bir koʻz tashlashga arziydi',
    'ra.bReady': 'Tayyor',
    'ra.noCopy':
      '{name}: koʻrsatish nusxasi hali kodlanmagan, shuning uchun tomosha qiladigan narsa yoʻq va oʻquvchi pleyer oʻrnida bitta gapni koʻradi.',
    'ra.watchable':
      'Bu taqriz ochiq turgan paytda shu darslarning koʻrsatish nusxalarini tomosha qilishingiz mumkin. Ularni saqlab ololmaysiz va oʻqituvchi yuklagan fayl sizga berilmaydi: taqriz qilinayotgan narsa oʻquvchi koʻradigan narsadir.',
    'ra.notWatchable':
      'Darslarni taqriz qabul qilingan paytdan u yopilgunga qadar ijro etish mumkin, shuning uchun hozir bu yerda ijro etib boʻlmaydi.',
    'ra.needsHead': 'Bu versiyaga nima kerak va nimalar tekshirilgan',
    'ra.english': 'Quyidagi ikki panel hozircha ingliz tilida.',
    'ra.decisionHead': 'Qaroringiz',
    'ra.backQueue': 'Navbatga qaytish',
    'ra.unread': 'Bu taqrizni hozir oʻqib boʻlmadi. Birozdan soʻng qayta urinib koʻring.',
    'ra.outlineUnread':
      'Bu kursning rejasini hozir oʻqib boʻlmadi, shuning uchun u koʻrsatilmayapti. Qaror qilishdan oldin sahifani qayta yuklang.',
    'ra.partUnread':
      'Bu sahifaning bir qismini hozir oʻqib boʻlmadi, shuning uchun u toʻliq emas. Qaror qilishdan oldin uni qayta yuklang.',
    'ra.offerHead': 'Bu taqriz sizga taklif qilingan',
    'ra.offerNote': 'Qabul qilmaguningizcha sizdan hech narsa kutilmaydi.',
    'ra.accept': 'Bu taqrizni qabul qilish',
    'ra.decline': 'Taklifni rad etish',
    'ra.recordHead': 'Qaroringizni qayd eting',
    'ra.reason': 'Sabab',
    'ra.reasonHint':
      'Nimani tekshirdingiz va nimani topdingiz? Oʻqituvchi aynan shu yozuv ustidan shikoyat qiladi.',
    'ra.approve': 'Maʼqullash',
    'ra.revise': 'Tuzatishlar soʻrash',
    'ra.reject': 'Rad etish',
    'ra.approveNote':
      'Maʼqullash versiyani “maʼqullangan” holatiga oʻtkazadi, u yerda platforma xodimlari uni nashr eta oladi. Uni oʻzingiz nashr eta olmaysiz va oʻzingiz yozgan kursni maʼqullay olmaysiz.',
    'ra.decided': 'Siz bu taqriz boʻyicha qarorni allaqachon qayd etgansiz.',
    'ra.closedNote': 'Bu taqriz yopilgan, shuning uchun unga qaror qayd etib boʻlmaydi.',
    'ra.notMoved':
      'Qaroringiz qayd etildi. Kursning oʻzini bu yerdan oldinga surib boʻlmadi; platforma xodimlari qaroringizni koʻradi va uni oldinga sura oladi. Qayta qaror qilishingiz shart emas.',
    'ra.eNotYours': 'U taqriz sizniki emas.',
    'ra.eNotOpen':
      'Bu taqriz endi buning uchun ochiq emas. Uning qay holatda ekanini koʻrish uchun sahifani qayta yuklang.',
    'ra.eConflict':
      'Siz bayon qilgan toʻqnashuv bu taqriz boʻyicha qaror qilishingizga toʻsqinlik qiladi.',
    'ra.eReason': 'Qaror uchun sabab yozing.',
    'ra.eRefused':
      'Qayd etilmadi. Taqriz qay holatda ekanini koʻrish uchun sahifani qayta yuklang.',
    'ra.standHead': 'Buni xolis taqriz qila olmaysizmi?',
    'ra.declared': 'Bayon qilindi',
    'ra.declareOpen': 'Bu kurs boʻyicha manfaatlar toʻqnashuvini bayon qilish',
    'ra.declareNote':
      'Bayonot sizni bu taqriz boʻyicha qaror qilishdan darhol toʻsadi va platforma xodimlari uni koʻrib chiqmaguncha toʻsib turadi. U taqrizni yopmaydi: agar u hali taklif boʻlsa, uni ham rad eting; aks holda uni xodimlar yopadi.',
  },
  kk: {
    'ra.decisions': 'Шешімдер',
    'ra.gistHead': 'Оқушы не алады',
    'ra.allOpen': 'Әр сабақ оқушыға ашатын бірдеңе береді. Сабақтар: {n}',
    'ra.someOpen': 'Оқушыға ашатын бірдеңе беретін сабақтар: {all} ішінен {some}',
    'ra.nothing': 'Оқушыға мүлде ештеңе бермейтін сабақтар: {n}',
    'ra.trouble': 'Оқушыға жеткенге дейін біліп алған жөн жайы бар сабақтар: {n}',
    'ra.nextEmpty':
      'Алдымен осыны ашқан жөн: {lesson}. Ішінде мүлде ештеңе жоқ, сондықтан оқушы тек тақырып пен бос бетті көреді.',
    'ra.nextSilent':
      'Аяқталған сияқты көрінеді, бірақ аяқталмаған: {lesson}. Оған бірдеңе тіркелген, бірақ оқушы оның ешқайсысын аша алмайды.',
    'ra.nextNoted':
      'Бір қарап шығуға тұрарлық: {lesson}. Оқушы оны пайдалана алады, бірақ ол туралы алдымен біліп алған жөн нәрсе бар.',
    'ra.nextAlso': 'Осы кезеңдегі басқа сабақтар: {n}',
    'ra.asLearner': 'Оқушы көзімен қарау',
    'ra.deliveryUnknown':
      'Жүктелген файлдардың кодталу күйі қазір оқылмады, сондықтан ойнатқышсыз көрсетілген файл сәтсіз аяқталған файл емес, ешкім сұрамаған файл болуы мүмкін.',
    'ra.notVerdict':
      'Бұл оқушының неге тап болатынын айтады, қандай шешім қабылдау керегін емес. Шешім сіздікі, және мұндағы ешнәрсе өздігінен қабылдауға не бас тартуға себеп емес: ғылыми рецензия не оқытылатыны туралы, ал бұл не жететіні туралы.',
    'ra.outline': 'Жоспар',
    'ra.noSections':
      'Бұл нұсқада бөлімдер жоқ. Рецензиялайтын ештеңе жоқ, және оны жариялау мүмкін емес.',
    'ra.noLessons': 'Сабақтар жоқ.',
    'ra.bEmpty': 'Ішінде ештеңе жоқ',
    'ra.bSilent': 'Ойнататын ештеңе жоқ',
    'ra.bNoted': 'Бір қарап шығуға тұрарлық',
    'ra.bReady': 'Дайын',
    'ra.noCopy':
      '{name}: көрсету көшірмесі әлі кодталмаған, сондықтан көретін ештеңе жоқ, ал оқушы ойнатқыштың орнында бір сөйлемді көреді.',
    'ra.watchable':
      'Осы рецензия ашық тұрғанда осы сабақтардың көрсету көшірмелерін көре аласыз. Оларды сақтай алмайсыз, және мұғалім жүктеген файл сізге берілмейді: рецензияланатын нәрсе — оқушы көретін нәрсе.',
    'ra.notWatchable':
      'Сабақтарды рецензия қабылданған сәттен ол жабылғанға дейін ойнатуға болады, сондықтан қазір мұнда ойнатылмайды.',
    'ra.needsHead': 'Бұл нұсқаға не керек және не тексерілген',
    'ra.english': 'Төмендегі екі панель әзірге ағылшын тілінде.',
    'ra.decisionHead': 'Шешіміңіз',
    'ra.backQueue': 'Кезекке оралу',
    'ra.unread': 'Бұл рецензия қазір оқылмады. Сәлден соң қайталап көріңіз.',
    'ra.outlineUnread':
      'Бұл курстың жоспары қазір оқылмады, сондықтан ол көрсетілмейді. Шешім қабылдамас бұрын бетті қайта жүктеңіз.',
    'ra.partUnread':
      'Бұл беттің бір бөлігі қазір оқылмады, сондықтан ол толық емес. Шешім қабылдамас бұрын оны қайта жүктеңіз.',
    'ra.offerHead': 'Бұл рецензия сізге ұсынылды',
    'ra.offerNote': 'Оны қабылдағанша сізден ештеңе күтілмейді.',
    'ra.accept': 'Осы рецензияны қабылдау',
    'ra.decline': 'Бас тарту',
    'ra.recordHead': 'Шешіміңізді тіркеңіз',
    'ra.reason': 'Себеп',
    'ra.reasonHint': 'Нені тексердіңіз және не таптыңыз? Мұғалім дәл осы жазбаға шағымданады.',
    'ra.approve': 'Мақұлдау',
    'ra.revise': 'Түзетулер сұрау',
    'ra.reject': 'Қабылдамау',
    'ra.approveNote':
      'Мақұлдау нұсқаны «мақұлданған» күйіне көшіреді, сонда платформа қызметкерлері оны жариялай алады. Оны өзіңіз жариялай алмайсыз және өзіңіз жазған курсты мақұлдай алмайсыз.',
    'ra.decided': 'Сіз бұл рецензия бойынша шешімді әлдеқашан тіркегенсіз.',
    'ra.closedNote': 'Бұл рецензия жабық, сондықтан оған шешім тіркеу мүмкін емес.',
    'ra.notMoved':
      'Шешіміңіз тіркелді. Курстың өзін осы жерден ілгері жылжыту мүмкін болмады; платформа қызметкерлері шешіміңізді көреді және оны жылжыта алады. Қайта шешім қабылдаудың қажеті жоқ.',
    'ra.eNotYours': 'Ол рецензия сіздікі емес.',
    'ra.eNotOpen':
      'Бұл рецензия енді бұған ашық емес. Оның қандай күйде екенін көру үшін бетті қайта жүктеңіз.',
    'ra.eConflict':
      'Сіз мәлімдеген қақтығыс осы рецензия бойынша шешім қабылдауыңызға кедергі болады.',
    'ra.eReason': 'Шешімнің себебін жазыңыз.',
    'ra.eRefused': 'Тіркелмеді. Рецензияның қандай күйде екенін көру үшін бетті қайта жүктеңіз.',
    'ra.standHead': 'Мұны бейтарап рецензиялай алмайсыз ба?',
    'ra.declared': 'Мәлімделді',
    'ra.declareOpen': 'Осы курс бойынша мүдделер қақтығысын мәлімдеу',
    'ra.declareNote':
      'Мәлімдеме сізді осы рецензия бойынша шешім қабылдаудан бірден тосады және платформа қызметкерлері оны қарағанша тосып тұрады. Ол рецензияны жаппайды: егер ол әлі ұсыныс болса, одан да бас тартыңыз; әйтпесе оны қызметкерлер жабады.',
  },
  az: {
    'ra.decisions': 'Qərarlar',
    'ra.gistHead': 'Öyrənən nə alır',
    'ra.allOpen': 'Hər dərs öyrənənə açmaq üçün nəsə verir. Dərslər: {n}',
    'ra.someOpen': 'Öyrənənə açmaq üçün nəsə verən dərslər: {all} dərsdən {some}',
    'ra.nothing': 'Öyrənənə ümumiyyətlə heç nə verməyən dərslər: {n}',
    'ra.trouble': 'Öyrənənə çatmazdan əvvəl bilinməsi yaxşı olan cəhəti olan dərslər: {n}',
    'ra.nextEmpty':
      'Əvvəlcə bunu açmaq yaxşıdır: {lesson}. İçində ümumiyyətlə heç nə yoxdur, ona görə öyrənən yalnız başlıq və boş səhifə görür.',
    'ra.nextSilent':
      'Bitmiş kimi görünür, amma bitməyib: {lesson}. Ona nəsə əlavə olunub, amma öyrənən onların heç birini aça bilmir.',
    'ra.nextNoted':
      'Bir nəzər salmağa dəyər: {lesson}. Öyrənən ondan istifadə edə bilir, amma onun haqqında əvvəlcə bilinməsi yaxşı olan bir şey var.',
    'ra.nextAlso': 'Eyni mərhələdəki digər dərslər: {n}',
    'ra.asLearner': 'Öyrənən kimi bax',
    'ra.deliveryUnknown':
      'Yüklənmiş faylların kodlaşdırma vəziyyəti indi oxuna bilmədi, ona görə pleyersiz göstərilən fayl uğursuz olmuş fayl yox, heç kimin soruşmadığı fayl ola bilər.',
    'ra.notVerdict':
      'Bu, öyrənənin nə ilə qarşılaşacağını deyir, nəyə qərar veriləcəyini yox. Qərar sizindir və buradakı heç nə təkbaşına qəbul etmək və ya imtina etmək üçün səbəb deyil: elmi rəy nəyin öyrədildiyi barədədir, bu isə nəyin çatdığı barədə.',
    'ra.outline': 'Plan',
    'ra.noSections':
      'Bu versiyada bölmə yoxdur. Rəy veriləcək heç nə yoxdur və onu dərc etmək olmaz.',
    'ra.noLessons': 'Dərs yoxdur.',
    'ra.bEmpty': 'İçində heç nə yoxdur',
    'ra.bSilent': 'Oxudulacaq heç nə yoxdur',
    'ra.bNoted': 'Bir nəzər salmağa dəyər',
    'ra.bReady': 'Hazırdır',
    'ra.noCopy':
      '{name}: nümayiş nüsxəsi hələ kodlaşdırılmayıb, ona görə baxılası heç nə yoxdur və öyrənən pleyerin yerində bir cümlə görəcək.',
    'ra.watchable':
      'Bu rəy açıq olduğu müddətdə bu dərslərin nümayiş nüsxələrinə baxa bilərsiniz. Onları yadda saxlaya bilməzsiniz və müəllimin yüklədiyi fayl sizə verilmir: rəy verilən şey öyrənənin görəcəyi şeydir.',
    'ra.notWatchable':
      'Dərsləri rəy qəbul edildiyi andan bağlanana qədər oxutmaq olar, ona görə indi burada oxutmaq olmur.',
    'ra.needsHead': 'Bu versiyaya nə lazımdır və nələr yoxlanılıb',
    'ra.english': 'Aşağıdakı iki panel hələlik ingilis dilindədir.',
    'ra.decisionHead': 'Qərarınız',
    'ra.backQueue': 'Növbəyə qayıt',
    'ra.unread': 'Bu rəy indi oxuna bilmədi. Bir azdan yenidən cəhd edin.',
    'ra.outlineUnread':
      'Bu kursun planı indi oxuna bilmədi, ona görə göstərilmir. Qərar verməzdən əvvəl səhifəni yenidən yükləyin.',
    'ra.partUnread':
      'Bu səhifənin bir hissəsi indi oxuna bilmədi, ona görə natamamdır. Qərar verməzdən əvvəl onu yenidən yükləyin.',
    'ra.offerHead': 'Bu rəy sizə təklif olunub',
    'ra.offerNote': 'Onu qəbul edənə qədər sizdən heç nə gözlənilmir.',
    'ra.accept': 'Bu rəyi qəbul et',
    'ra.decline': 'İmtina et',
    'ra.recordHead': 'Qərarınızı qeyd edin',
    'ra.reason': 'Səbəb',
    'ra.reasonHint': 'Nəyi yoxladınız və nə tapdınız? Müəllim məhz bu qeyddən şikayət edəcək.',
    'ra.approve': 'Təsdiqlə',
    'ra.revise': 'Düzəliş istə',
    'ra.reject': 'Rədd et',
    'ra.approveNote':
      'Təsdiq versiyanı “təsdiqlənib” vəziyyətinə keçirir, orada platforma əməkdaşları onu dərc edə bilər. Onu özünüz dərc edə bilməzsiniz və özünüzün yazdığınız kursu təsdiq edə bilməzsiniz.',
    'ra.decided': 'Siz bu rəy üzrə artıq qərar qeyd etmisiniz.',
    'ra.closedNote': 'Bu rəy bağlıdır, ona görə ona qərar qeyd etmək olmaz.',
    'ra.notMoved':
      'Qərarınız qeyd olundu. Kursun özünü buradan irəli aparmaq mümkün olmadı; platforma əməkdaşları qərarınızı görür və onu irəli apara bilər. Yenidən qərar verməyinizə ehtiyac yoxdur.',
    'ra.eNotYours': 'O rəy sizin deyil.',
    'ra.eNotOpen':
      'Bu rəy artıq bunun üçün açıq deyil. Onun hansı vəziyyətdə olduğunu görmək üçün səhifəni yenidən yükləyin.',
    'ra.eConflict': 'Bəyan etdiyiniz toqquşma bu rəy üzrə qərar verməyinizə mane olur.',
    'ra.eReason': 'Qərar üçün səbəb yazın.',
    'ra.eRefused':
      'Qeyd olunmadı. Rəyin hansı vəziyyətdə olduğunu görmək üçün səhifəni yenidən yükləyin.',
    'ra.standHead': 'Buna qərəzsiz rəy verə bilmirsiniz?',
    'ra.declared': 'Bəyan olundu',
    'ra.declareOpen': 'Bu kursla bağlı maraqlar toqquşmasını bəyan et',
    'ra.declareNote':
      'Bəyanat bu rəy üzrə qərar verməyinizə dərhal mane olur və platforma əməkdaşları ona baxana qədər mane olmaqda davam edir. O, rəyi bağlamır: əgər o hələ təklifdirsə, ondan da imtina edin; əks halda onu əməkdaşlar bağlayır.',
  },
  tg: {
    'ra.decisions': 'Қарорҳо',
    'ra.gistHead': 'Омӯзанда чӣ мегирад',
    'ra.allOpen': 'Ҳар дарс ба омӯзанда чизе медиҳад, ки онро кушояд. Дарсҳо: {n}',
    'ra.someOpen': 'Дарсҳое, ки ба омӯзанда чизе барои кушодан медиҳанд: {some} аз {all}',
    'ra.nothing': 'Дарсҳое, ки ба омӯзанда тамоман чизе намедиҳанд: {n}',
    'ra.trouble': 'Дарсҳое, ки пеш аз расидан ба омӯзанда чизе дар борааш донистан меарзад: {n}',
    'ra.nextEmpty':
      'Беҳтар аст аввал ҳаминро кушоед: {lesson}. Дар он тамоман чизе нест, бинобар ин омӯзанда танҳо унвон ва саҳифаи холиро мебинад.',
    'ra.nextSilent':
      'Тайёр менамояд, вале нест: {lesson}. Ба он чизе замима шудааст, аммо омӯзанда ҳеҷ кадомашро кушода наметавонад.',
    'ra.nextNoted':
      'Ба як нигоҳ меарзад: {lesson}. Омӯзанда онро истифода бурда метавонад, вале дар борааш чизе ҳаст, ки аввал донистан меарзад.',
    'ra.nextAlso': 'Дарсҳои дигар дар ҳамин марҳила: {n}',
    'ra.asLearner': 'Чун омӯзанда дидан',
    'ra.deliveryUnknown':
      'Ҳолати рамзгузории файлҳои боршуда ҳоло хонда нашуд, бинобар ин файле, ки бе плеер нишон дода мешавад, шояд файле бошад, ки касе дар борааш напурсидааст, на файле, ки ноком шудааст.',
    'ra.notVerdict':
      'Ин мегӯяд, ки омӯзанда бо чӣ рӯ ба рӯ мешавад, на ин ки чӣ қарор бояд кард. Қарор аз они шумост, ва ҳеҷ чиз дар ин ҷо худ ба худ сабаби қабул ё рад кардан нест: бознигарии илмӣ дар бораи он аст, ки чӣ таълим дода мешавад, ва ин дар бораи он аст, ки чӣ мерасад.',
    'ra.outline': 'Нақша',
    'ra.noSections':
      'Ин нусха ягон бахш надорад. Чизе барои бознигарӣ нест, ва онро нашр кардан мумкин нест.',
    'ra.noLessons': 'Дарс нест.',
    'ra.bEmpty': 'Дар он чизе нест',
    'ra.bSilent': 'Чизе барои пахш нест',
    'ra.bNoted': 'Ба як нигоҳ меарзад',
    'ra.bReady': 'Тайёр',
    'ra.noCopy':
      '{name}: нусхаи намоишӣ ҳанӯз рамзгузорӣ нашудааст, бинобар ин чизе барои тамошо нест, ва омӯзанда ба ҷойи плеер як ҷумларо мебинад.',
    'ra.watchable':
      'То вақте ки ин бознигарӣ кушода аст, шумо нусхаҳои намоишии ин дарсҳоро тамошо карда метавонед. Онҳоро захира карда наметавонед, ва файле, ки муаллим бор кардааст, ба шумо дода намешавад: он чи бознигарӣ мешавад, ҳамон аст, ки омӯзанда хоҳад дид.',
    'ra.notWatchable':
      'Дарсҳоро аз лаҳзаи қабул шудани бознигарӣ то баста шуданаш пахш кардан мумкин аст, бинобар ин ҳоло дар ин ҷо пахш намешаванд.',
    'ra.needsHead': 'Ба ин нусха чӣ лозим аст ва чӣ тафтиш шудааст',
    'ra.english': 'Ду панели поён ҳоло ба забони англисӣ мебошанд.',
    'ra.decisionHead': 'Қарори шумо',
    'ra.backQueue': 'Бозгашт ба навбат',
    'ra.unread': 'Ин бознигарӣ ҳоло хонда нашуд. Каме баъдтар боз кӯшиш кунед.',
    'ra.outlineUnread':
      'Нақшаи ин курс ҳоло хонда нашуд, бинобар ин нишон дода намешавад. Пеш аз қарор саҳифаро аз нав бор кунед.',
    'ra.partUnread':
      'Як қисми ин саҳифа ҳоло хонда нашуд, бинобар ин он нопурра аст. Пеш аз қарор онро аз нав бор кунед.',
    'ra.offerHead': 'Ин бознигарӣ ба шумо пешниҳод шудааст',
    'ra.offerNote': 'То онро қабул накунед, аз шумо чизе интизор нест.',
    'ra.accept': 'Ин бознигариро қабул кунед',
    'ra.decline': 'Даст кашидан',
    'ra.recordHead': 'Қарори худро сабт кунед',
    'ra.reason': 'Сабаб',
    'ra.reasonHint': 'Чиро тафтиш кардед ва чӣ ёфтед? Муаллим маҳз аз ҳамин сабт шикоят мекунад.',
    'ra.approve': 'Тасдиқ',
    'ra.revise': 'Дархости ислоҳ',
    'ra.reject': 'Рад',
    'ra.approveNote':
      'Тасдиқ нусхаро ба ҳолати «тасдиқшуда» мегузаронад, ки он ҷо кормандони платформа онро нашр карда метавонанд. Шумо онро худатон нашр карда наметавонед ва курсеро, ки худатон навиштаед, тасдиқ карда наметавонед.',
    'ra.decided': 'Шумо аллакай оид ба ин бознигарӣ қарор сабт кардаед.',
    'ra.closedNote': 'Ин бознигарӣ баста аст, бинобар ин ба он қарор сабт кардан мумкин нест.',
    'ra.notMoved':
      'Қарори шумо сабт шуд. Худи курсро аз ин ҷо пеш бурдан муяссар нашуд; кормандони платформа қарори шуморо мебинанд ва онро пеш бурда метавонанд. Аз нав қарор кардан лозим нест.',
    'ra.eNotYours': 'Он бознигарӣ аз они шумо нест.',
    'ra.eNotOpen':
      'Ин бознигарӣ дигар барои ин кор кушода нест. Саҳифаро аз нав бор кунед, то бинед, ки он дар чӣ ҳолат аст.',
    'ra.eConflict':
      'Бархӯрде, ки шумо изҳор кардаед, ба шумо имкон намедиҳад, ки оид ба ин бознигарӣ қарор кунед.',
    'ra.eReason': 'Сабаби қарорро нависед.',
    'ra.eRefused':
      'Сабт нашуд. Саҳифаро аз нав бор кунед, то бинед, ки бознигарӣ дар чӣ ҳолат аст.',
    'ra.standHead': 'Инро беғаразона бознигарӣ карда наметавонед?',
    'ra.declared': 'Изҳор шуд',
    'ra.declareOpen': 'Изҳори бархӯрди манфиатҳо оид ба ин курс',
    'ra.declareNote':
      'Изҳорот фавран шуморо аз қарор кардан оид ба ин бознигарӣ бозмедорад ва то он даме ки кормандони платформа онро баррасӣ кунанд, бозмедорад. Он бознигариро намебандад: агар он ҳанӯз пешниҳод бошад, онро низ рад кунед; вагарна онро кормандон мебанданд.',
  },
  ky: {
    'ra.decisions': 'Чечимдер',
    'ra.gistHead': 'Окуучу эмне алат',
    'ra.allOpen': 'Ар бир сабак окуучуга ача турган бир нерсе берет. Сабактар: {n}',
    'ra.someOpen': 'Окуучуга ача турган бир нерсе берген сабактар: {all} ичинен {some}',
    'ra.nothing': 'Окуучуга такыр эч нерсе бербеген сабактар: {n}',
    'ra.trouble': 'Окуучуга жеткенге чейин билип алуу керек болгон жагы бар сабактар: {n}',
    'ra.nextEmpty':
      'Адегенде ушуну ачкан оң: {lesson}. Ичинде такыр эч нерсе жок, ошондуктан окуучу аталыш менен бош баракты гана көрөт.',
    'ra.nextSilent':
      'Бүткөндөй көрүнөт, бирок бүтө элек: {lesson}. Ага бир нерсе тиркелген, бирок окуучу алардын бирин да ача албайт.',
    'ra.nextNoted':
      'Бир карап коюуга арзыйт: {lesson}. Окуучу аны колдоно алат, бирок ал тууралуу адегенде билип алуу керек болгон нерсе бар.',
    'ra.nextAlso': 'Ушул эле баскычтагы башка сабактар: {n}',
    'ra.asLearner': 'Окуучунун көзү менен көрүү',
    'ra.deliveryUnknown':
      'Жүктөлгөн файлдардын коддолуу абалы азыр окулган жок, ошондуктан ойноткучсуз көрсөтүлгөн файл ишке ашпай калган файл эмес, эч ким сурабаган файл болушу мүмкүн.',
    'ra.notVerdict':
      'Бул окуучу эмнеге туш болорун айтат, кандай чечим кабыл алуу керектигин эмес. Чечим сиздики, жана бул жердеги эч нерсе өзүнчө кабыл алууга же баш тартууга себеп эмес: илимий рецензия эмне окутулары жөнүндө, ал эми бул эмне жетери жөнүндө.',
    'ra.outline': 'План',
    'ra.noSections':
      'Бул версияда бөлүмдөр жок. Рецензиялай турган эч нерсе жок, жана аны жарыялоо мүмкүн эмес.',
    'ra.noLessons': 'Сабактар жок.',
    'ra.bEmpty': 'Ичинде эч нерсе жок',
    'ra.bSilent': 'Ойното турган эч нерсе жок',
    'ra.bNoted': 'Бир карап коюуга арзыйт',
    'ra.bReady': 'Даяр',
    'ra.noCopy':
      '{name}: көрсөтүү көчүрмөсү али коддоло элек, ошондуктан көрө турган эч нерсе жок, жана окуучу ойноткучтун ордунан бир сүйлөмдү көрөт.',
    'ra.watchable':
      'Бул рецензия ачык турганда ушул сабактардын көрсөтүү көчүрмөлөрүн көрө аласыз. Аларды сактай албайсыз, жана мугалим жүктөгөн файл сизге берилбейт: рецензияланып жаткан нерсе окуучу көрө турган нерсе.',
    'ra.notWatchable':
      'Сабактарды рецензия кабыл алынган учурдан ал жабылганга чейин ойнотууга болот, ошондуктан азыр бул жерде ойнотулбайт.',
    'ra.needsHead': 'Бул версияга эмне керек жана эмнелер текшерилген',
    'ra.english': 'Төмөндөгү эки панель азырынча англис тилинде.',
    'ra.decisionHead': 'Чечимиңиз',
    'ra.backQueue': 'Кезекке кайтуу',
    'ra.unread': 'Бул рецензия азыр окулган жок. Бир аздан кийин кайра аракет кылыңыз.',
    'ra.outlineUnread':
      'Бул курстун планы азыр окулган жок, ошондуктан ал көрсөтүлгөн жок. Чечим кабыл алардан мурун баракты кайра жүктөңүз.',
    'ra.partUnread':
      'Бул барактын бир бөлүгү азыр окулган жок, ошондуктан ал толук эмес. Чечим кабыл алардан мурун аны кайра жүктөңүз.',
    'ra.offerHead': 'Бул рецензия сизге сунушталды',
    'ra.offerNote': 'Аны кабыл алмайынча сизден эч нерсе күтүлбөйт.',
    'ra.accept': 'Бул рецензияны кабыл алуу',
    'ra.decline': 'Баш тартуу',
    'ra.recordHead': 'Чечимиңизди каттаңыз',
    'ra.reason': 'Себеп',
    'ra.reasonHint': 'Эмнени текшердиңиз жана эмне таптыңыз? Мугалим дал ушул жазууга даттанат.',
    'ra.approve': 'Жактыруу',
    'ra.revise': 'Оңдоолорду суроо',
    'ra.reject': 'Четке кагуу',
    'ra.approveNote':
      'Жактыруу версияны «жактырылган» абалына өткөрөт, ал жерде платформанын кызматкерлери аны жарыялай алат. Аны өзүңүз жарыялай албайсыз жана өзүңүз жазган курсту жактыра албайсыз.',
    'ra.decided': 'Сиз бул рецензия боюнча чечимди мурун эле каттагансыз.',
    'ra.closedNote': 'Бул рецензия жабык, ошондуктан ага чечим каттоо мүмкүн эмес.',
    'ra.notMoved':
      'Чечимиңиз катталды. Курстун өзүн бул жерден алдыга жылдыруу мүмкүн болгон жок; платформанын кызматкерлери чечимиңизди көрөт жана аны жылдыра алат. Кайра чечим кабыл алуунун кереги жок.',
    'ra.eNotYours': 'Ал рецензия сиздики эмес.',
    'ra.eNotOpen':
      'Бул рецензия эми буга ачык эмес. Анын кандай абалда экенин көрүү үчүн баракты кайра жүктөңүз.',
    'ra.eConflict':
      'Сиз билдирген кагылыш бул рецензия боюнча чечим кабыл алууңузга тоскоол болот.',
    'ra.eReason': 'Чечимдин себебин жазыңыз.',
    'ra.eRefused':
      'Катталган жок. Рецензиянын кандай абалда экенин көрүү үчүн баракты кайра жүктөңүз.',
    'ra.standHead': 'Муну калыс рецензиялай албайсызбы?',
    'ra.declared': 'Билдирилди',
    'ra.declareOpen': 'Ушул курс боюнча кызыкчылыктардын кагылышын билдирүү',
    'ra.declareNote':
      'Билдирүү сизди бул рецензия боюнча чечим кабыл алуудан дароо тосот жана платформанын кызматкерлери аны караганга чейин тосуп турат. Ал рецензияны жаппайт: эгер ал али сунуш болсо, андан да баш тартыңыз; болбосо аны кызматкерлер жабат.',
  },
  tk: {
    'ra.decisions': 'Kararlar',
    'ra.gistHead': 'Okuwçy näme alýar',
    'ra.allOpen': 'Her sapak okuwça açar ýaly bir zat berýär. Sapaklar: {n}',
    'ra.someOpen': 'Okuwça açar ýaly bir zat berýän sapaklar: {all} sapakdan {some}',
    'ra.nothing': 'Okuwça asla hiç zat bermeýän sapaklar: {n}',
    'ra.trouble': 'Okuwça ýetmezden öň bilinmegi peýdaly bolan zady bar sapaklar: {n}',
    'ra.nextEmpty':
      'Ilki şuny açmak gowy: {lesson}. Onuň içinde asla hiç zat ýok, şonuň üçin okuwçy diňe at bilen boş sahypany görýär.',
    'ra.nextSilent':
      'Taýýar ýaly görünýär, ýöne taýýar däl: {lesson}. Oňa bir zat goşulypdyr, ýöne okuwçy olaryň hiç birini açyp bilmeýär.',
    'ra.nextNoted':
      'Bir göz aýlamaga degýär: {lesson}. Okuwçy ony ulanyp bilýär, ýöne ol barada ilki bilinmegi peýdaly bir zat bar.',
    'ra.nextAlso': 'Şol bir tapgyrdaky beýleki sapaklar: {n}',
    'ra.asLearner': 'Okuwçynyň gözi bilen görmek',
    'ra.deliveryUnknown':
      'Ýüklenen faýllaryň kodlaşdyryş ýagdaýyny häzir okap bolmady, şonuň üçin pleýersiz görkezilýän faýl şowsuz bolan faýl däl-de, hiç kimiň soramadyk faýly bolup biler.',
    'ra.notVerdict':
      'Bu okuwçynyň näme bilen ýüzbe-ýüz boljakdygyny aýdýar, nähili karar bermelidigini däl. Karar siziňki, we bu ýerdäki hiç zat özbaşyna kabul etmäge ýa-da ret etmäge sebäp däl: ylmy syn nämäniň öwredilýändigi barada, bu bolsa nämäniň ýetýändigi barada.',
    'ra.outline': 'Meýilnama',
    'ra.noSections': 'Bu wersiýada bölüm ýok. Syn berer ýaly zat ýok, we ony çap edip bolmaýar.',
    'ra.noLessons': 'Sapak ýok.',
    'ra.bEmpty': 'Içinde hiç zat ýok',
    'ra.bSilent': 'Oýnadar ýaly zat ýok',
    'ra.bNoted': 'Bir göz aýlamaga degýär',
    'ra.bReady': 'Taýýar',
    'ra.noCopy':
      '{name}: görkeziş nusgasy entek kodlaşdyrylmandyr, şonuň üçin tomaşa eder ýaly zat ýok, we okuwçy pleýeriň ýerinde bir sözlemi görer.',
    'ra.watchable':
      'Bu syn açyk durka şu sapaklaryň görkeziş nusgalaryna tomaşa edip bilersiňiz. Olary saklap bilmersiňiz, we mugallymyň ýüklän faýly size berilmeýär: syn berilýän zat okuwçynyň görjek zadydyr.',
    'ra.notWatchable':
      'Sapaklary syn kabul edilen pursatdan ol ýapylýança oýnadyp bolýar, şonuň üçin häzir bu ýerde oýnadyp bolmaýar.',
    'ra.needsHead': 'Bu wersiýa näme gerek we nämeler barlandy',
    'ra.english': 'Aşakdaky iki panel häzirlikçe iňlis dilinde.',
    'ra.decisionHead': 'Kararyňyz',
    'ra.backQueue': 'Nobata dolanmak',
    'ra.unread': 'Bu syny häzir okap bolmady. Birazdan täzeden synanyşyň.',
    'ra.outlineUnread':
      'Bu kursuň meýilnamasyny häzir okap bolmady, şonuň üçin ol görkezilmeýär. Karar bermezden öň sahypany täzeden ýükläň.',
    'ra.partUnread':
      'Bu sahypanyň bir bölegini häzir okap bolmady, şonuň üçin ol doly däl. Karar bermezden öň ony täzeden ýükläň.',
    'ra.offerHead': 'Bu syn size teklip edildi',
    'ra.offerNote': 'Ony kabul edýänçäňiz sizden hiç zat garaşylmaýar.',
    'ra.accept': 'Bu syny kabul etmek',
    'ra.decline': 'Teklibi ret etmek',
    'ra.recordHead': 'Kararyňyzy ýazga geçiriň',
    'ra.reason': 'Sebäp',
    'ra.reasonHint': 'Nämäni barladyňyz we näme tapdyňyz? Mugallym hut şu ýazgydan şikaýat eder.',
    'ra.approve': 'Tassyklamak',
    'ra.revise': 'Düzedişleri soramak',
    'ra.reject': 'Ret etmek',
    'ra.approveNote':
      'Tassyklamak wersiýany «tassyklanan» ýagdaýyna geçirýär, şol ýerde platformanyň işgärleri ony çap edip bilýär. Ony özüňiz çap edip bilmersiňiz we öz ýazan kursuňyzy tassyklap bilmersiňiz.',
    'ra.decided': 'Siz bu syn boýunça karary eýýäm ýazga geçirdiňiz.',
    'ra.closedNote': 'Bu syn ýapyk, şonuň üçin oňa karar ýazga geçirip bolmaýar.',
    'ra.notMoved':
      'Kararyňyz ýazga geçirildi. Kursuň özüni bu ýerden öňe süýşürip bolmady; platformanyň işgärleri kararyňyzy görýär we ony süýşürip bilýär. Täzeden karar bermegiňiz gerek däl.',
    'ra.eNotYours': 'Ol syn siziňki däl.',
    'ra.eNotOpen':
      'Bu syn indi munuň üçin açyk däl. Onuň nähili ýagdaýdadygyny görmek üçin sahypany täzeden ýükläň.',
    'ra.eConflict':
      'Siziň beýan eden çaknyşmagyňyz bu syn boýunça karar bermegiňize päsgel berýär.',
    'ra.eReason': 'Kararyň sebäbini ýazyň.',
    'ra.eRefused':
      'Ýazga geçirilmedi. Synyň nähili ýagdaýdadygyny görmek üçin sahypany täzeden ýükläň.',
    'ra.standHead': 'Muňa bitarap syn berip bilmeýärsiňizmi?',
    'ra.declared': 'Beýan edildi',
    'ra.declareOpen': 'Şu kurs boýunça bähbitleriň çaknyşmagyny beýan etmek',
    'ra.declareNote':
      'Beýannama sizi bu syn boýunça karar bermekden derrew saklaýar we platformanyň işgärleri oňa seredýänçä saklap durýar. Ol syny ýapmaýar: eger ol entek teklip bolsa, ony hem ret ediň; ýogsam ony işgärler ýapýar.',
  },
  ta: {
    'ra.decisions': 'முடிவுகள்',
    'ra.gistHead': 'கற்பவருக்கு என்ன கிடைக்கிறது',
    'ra.allOpen': 'ஒவ்வொரு பாடமும் கற்பவர் திறக்க ஏதாவது ஒன்றைத் தருகிறது. பாடங்கள்: {n}',
    'ra.someOpen': 'கற்பவர் திறக்க ஏதாவது தரும் பாடங்கள்: {all} இல் {some}',
    'ra.nothing': 'கற்பவருக்கு எதுவுமே தராத பாடங்கள்: {n}',
    'ra.trouble': 'கற்பவரைச் சென்றடையும் முன் தெரிந்துகொள்ள வேண்டிய ஒன்று உள்ள பாடங்கள்: {n}',
    'ra.nextEmpty':
      'முதலில் இதைத் திறப்பது நல்லது: {lesson}. இதில் எதுவுமே இல்லை, எனவே கற்பவருக்கு ஒரு தலைப்பும் வெற்றுப் பக்கமும் மட்டுமே கிடைக்கும்.',
    'ra.nextSilent':
      'முடிந்தது போலத் தெரிகிறது, ஆனால் முடியவில்லை: {lesson}. இதில் ஏதோ இணைக்கப்பட்டுள்ளது, ஆனால் கற்பவரால் அதில் எதையும் திறக்க முடியாது.',
    'ra.nextNoted':
      'ஒரு முறை பார்க்கத் தக்கது: {lesson}. கற்பவர் இதைப் பயன்படுத்த முடியும், ஆனால் இதைப் பற்றி முதலில் தெரிந்துகொள்ள வேண்டிய ஒன்று உள்ளது.',
    'ra.nextAlso': 'அதே நிலையில் உள்ள பிற பாடங்கள்: {n}',
    'ra.asLearner': 'கற்பவர் பார்ப்பது போலப் பார்',
    'ra.deliveryUnknown':
      'பதிவேற்றிய கோப்புகளின் குறியாக்க நிலையை இப்போது படிக்க முடியவில்லை, எனவே இயக்கி இல்லாமல் காட்டப்படும் கோப்பு தோல்வியடைந்த கோப்பாக இல்லாமல், யாரும் கேட்டிராத கோப்பாகவும் இருக்கலாம்.',
    'ra.notVerdict':
      'இது கற்பவர் எதைச் சந்திப்பார் என்பதைச் சொல்கிறது, என்ன முடிவு செய்ய வேண்டும் என்பதை அல்ல. முடிவு உங்களுடையது, இங்குள்ள எதுவும் தனியாக ஏற்கவோ மறுக்கவோ காரணம் அல்ல: அறிவுசார் மதிப்பாய்வு என்ன கற்பிக்கப்படுகிறது என்பதைப் பற்றியது, இது என்ன சென்றடைகிறது என்பதைப் பற்றியது.',
    'ra.outline': 'சுருக்க வரைவு',
    'ra.noSections':
      'இந்தப் பதிப்பில் பிரிவுகள் இல்லை. மதிப்பாய்வு செய்ய எதுவும் இல்லை, இதை வெளியிடவும் முடியாது.',
    'ra.noLessons': 'பாடங்கள் இல்லை.',
    'ra.bEmpty': 'இதில் எதுவும் இல்லை',
    'ra.bSilent': 'இயக்க எதுவும் இல்லை',
    'ra.bNoted': 'ஒரு முறை பார்க்கத் தக்கது',
    'ra.bReady': 'தயார்',
    'ra.noCopy':
      '{name}: காட்டுவதற்கான நகல் இன்னும் குறியாக்கப்படவில்லை, எனவே பார்க்க எதுவும் இல்லை, கற்பவருக்கு இயக்கியின் இடத்தில் ஒரு வாக்கியம் கிடைக்கும்.',
    'ra.watchable':
      'இந்த மதிப்பாய்வு திறந்திருக்கும் வரை இந்தப் பாடங்களின் காட்டுவதற்கான நகல்களை நீங்கள் பார்க்கலாம். அவற்றைச் சேமிக்க முடியாது, ஆசிரியர் பதிவேற்றிய கோப்பு உங்களுக்கு வழங்கப்படாது: மதிப்பாய்வு செய்யப்படுவது கற்பவர் பார்க்கப்போவதே.',
    'ra.notWatchable':
      'மதிப்பாய்வு ஏற்கப்பட்ட நொடி முதல் அது மூடப்படும் வரை பாடங்களை இயக்கலாம், எனவே இப்போது இங்கே இயக்க முடியாது.',
    'ra.needsHead': 'இந்தப் பதிப்புக்கு என்ன தேவை, என்ன சரிபார்க்கப்பட்டுள்ளது',
    'ra.english': 'கீழே உள்ள இரண்டு பலகங்களும் தற்போது ஆங்கிலத்தில் உள்ளன.',
    'ra.decisionHead': 'உங்கள் முடிவு',
    'ra.backQueue': 'வரிசைக்குத் திரும்பு',
    'ra.unread':
      'இந்த மதிப்பாய்வை இப்போது படிக்க முடியவில்லை. சிறிது நேரத்தில் மீண்டும் முயலுங்கள்.',
    'ra.outlineUnread':
      'இந்தப் பாடநெறியின் சுருக்க வரைவை இப்போது படிக்க முடியவில்லை, எனவே அது காட்டப்படவில்லை. முடிவு செய்யும் முன் பக்கத்தை மீண்டும் ஏற்றுங்கள்.',
    'ra.partUnread':
      'இந்தப் பக்கத்தின் ஒரு பகுதியை இப்போது படிக்க முடியவில்லை, எனவே இது முழுமையாக இல்லை. முடிவு செய்யும் முன் மீண்டும் ஏற்றுங்கள்.',
    'ra.offerHead': 'இந்த மதிப்பாய்வு உங்களுக்கு முன்வைக்கப்பட்டுள்ளது',
    'ra.offerNote': 'நீங்கள் ஏற்கும் வரை உங்களிடம் எதுவும் எதிர்பார்க்கப்படவில்லை.',
    'ra.accept': 'இந்த மதிப்பாய்வை ஏற்கவும்',
    'ra.decline': 'மறுக்கவும்',
    'ra.recordHead': 'உங்கள் முடிவைப் பதிவு செய்யுங்கள்',
    'ra.reason': 'காரணம்',
    'ra.reasonHint':
      'எதைச் சரிபார்த்தீர்கள், என்ன கண்டீர்கள்? ஆசிரியர் மேல்முறையீடு செய்வது இந்தப் பதிவுக்கு எதிராகத்தான்.',
    'ra.approve': 'ஒப்புதல் அளி',
    'ra.revise': 'திருத்தங்களைக் கோரு',
    'ra.reject': 'நிராகரி',
    'ra.approveNote':
      'ஒப்புதல் அளிப்பது பதிப்பை “ஒப்புதல் பெற்றது” என்ற நிலைக்கு நகர்த்தும்; அங்கே தளத்தின் பணியாளர்கள் அதை வெளியிடலாம். நீங்களே அதை வெளியிட முடியாது, நீங்கள் எழுதிய பாடநெறிக்கு ஒப்புதல் அளிக்கவும் முடியாது.',
    'ra.decided': 'இந்த மதிப்பாய்வில் நீங்கள் ஏற்கெனவே ஒரு முடிவைப் பதிவு செய்துள்ளீர்கள்.',
    'ra.closedNote': 'இந்த மதிப்பாய்வு மூடப்பட்டுள்ளது, எனவே இதில் முடிவைப் பதிவு செய்ய முடியாது.',
    'ra.notMoved':
      'உங்கள் முடிவு பதிவாகியது. பாடநெறியை இங்கிருந்து முன்னே நகர்த்த முடியவில்லை; தளத்தின் பணியாளர்கள் உங்கள் முடிவைப் பார்க்கலாம், அதை நகர்த்தலாம். நீங்கள் மீண்டும் முடிவு செய்யத் தேவையில்லை.',
    'ra.eNotYours': 'அந்த மதிப்பாய்வு உங்களுடையது அல்ல.',
    'ra.eNotOpen':
      'இந்த மதிப்பாய்வு இனி அதற்குத் திறந்திருக்கவில்லை. இது எந்த நிலையில் உள்ளது என்று பார்க்கப் பக்கத்தை மீண்டும் ஏற்றுங்கள்.',
    'ra.eConflict':
      'நீங்கள் அறிவித்த ஒரு முரண் இந்த மதிப்பாய்வில் முடிவு செய்வதிலிருந்து உங்களைத் தடுக்கிறது.',
    'ra.eReason': 'முடிவுக்கு ஒரு காரணம் எழுதுங்கள்.',
    'ra.eRefused':
      'இது பதிவாகவில்லை. மதிப்பாய்வு எந்த நிலையில் உள்ளது என்று பார்க்கப் பக்கத்தை மீண்டும் ஏற்றுங்கள்.',
    'ra.standHead': 'இதை நடுநிலையாக மதிப்பாய்வு செய்ய முடியவில்லையா?',
    'ra.declared': 'அறிவிக்கப்பட்டது',
    'ra.declareOpen': 'இந்தப் பாடநெறி குறித்து நலன் முரணை அறிவி',
    'ra.declareNote':
      'அறிவிப்பு உடனே இந்த மதிப்பாய்வில் முடிவு செய்வதிலிருந்து உங்களைத் தடுக்கும்; தளத்தின் பணியாளர்கள் அதைக் கேட்கும் வரை தடுத்துக்கொண்டே இருக்கும். அது மதிப்பாய்வை மூடாது: இது இன்னும் அழைப்பாக இருந்தால் அதையும் மறுத்துவிடுங்கள்; இல்லையெனில் பணியாளர்கள் அதை மூடுவார்கள்.',
  },
  ne: {
    'ra.decisions': 'निर्णयहरू',
    'ra.gistHead': 'सिकारुले के पाउँछ',
    'ra.allOpen': 'हरेक पाठले सिकारुलाई खोल्ने केही दिन्छ। पाठहरू: {n}',
    'ra.someOpen': 'सिकारुलाई खोल्ने केही दिने पाठहरू: {all} मध्ये {some}',
    'ra.nothing': 'सिकारुलाई केही पनि नदिने पाठहरू: {n}',
    'ra.trouble': 'सिकारुसम्म पुग्नुअघि जान्न लायक कुरा भएका पाठहरू: {n}',
    'ra.nextEmpty':
      'पहिले यो खोल्नु राम्रो: {lesson}। यसमा केही पनि छैन, त्यसैले सिकारुले एउटा शीर्षक र खाली पृष्ठ मात्र पाउँछ।',
    'ra.nextSilent':
      'सकिएको जस्तो देखिन्छ, तर सकिएको छैन: {lesson}। यसमा केही जोडिएको छ, तर सिकारुले त्यसमध्ये केही पनि खोल्न सक्दैन।',
    'ra.nextNoted':
      'एक पटक हेर्न लायक: {lesson}। सिकारुले यो प्रयोग गर्न सक्छ, तर यसबारे पहिले जान्न लायक एउटा कुरा छ।',
    'ra.nextAlso': 'उही चरणका अरू पाठहरू: {n}',
    'ra.asLearner': 'सिकारुले जस्तै हेर्नुहोस्',
    'ra.deliveryUnknown':
      'अपलोड गरिएका फाइलहरूको इन्कोडिङको अवस्था अहिले पढ्न सकिएन, त्यसैले प्लेयरबिना देखाइएको फाइल असफल भएको फाइल नभई कसैले नसोधेको फाइल पनि हुन सक्छ।',
    'ra.notVerdict':
      'यसले सिकारुले के भेट्छ भन्ने बताउँछ, के निर्णय गर्ने भन्ने होइन। निर्णय तपाईंको हो, र यहाँको कुनै पनि कुरा एक्लैले स्वीकार गर्ने वा अस्वीकार गर्ने कारण होइन: विद्वत् समीक्षा के सिकाइन्छ भन्नेबारे हो, र यो के पुग्छ भन्नेबारे हो।',
    'ra.outline': 'रूपरेखा',
    'ra.noSections':
      'यो संस्करणमा कुनै खण्ड छैन। समीक्षा गर्ने केही छैन, र यसलाई प्रकाशित गर्न सकिँदैन।',
    'ra.noLessons': 'पाठ छैन।',
    'ra.bEmpty': 'यसमा केही छैन',
    'ra.bSilent': 'चलाउने केही छैन',
    'ra.bNoted': 'एक पटक हेर्न लायक',
    'ra.bReady': 'तयार',
    'ra.noCopy':
      '{name}: देखाउने प्रति अझै इन्कोड भएको छैन, त्यसैले हेर्ने केही छैन, र सिकारुले प्लेयरको ठाउँमा एउटा वाक्य पाउँछ।',
    'ra.watchable':
      'यो समीक्षा खुला रहुन्जेल तपाईं यी पाठहरूका देखाउने प्रतिहरू हेर्न सक्नुहुन्छ। तपाईं तिनलाई सुरक्षित गर्न सक्नुहुन्न, र शिक्षकले अपलोड गरेको फाइल तपाईंलाई दिइँदैन: समीक्षा हुने कुरा सिकारुले देख्ने कुरा नै हो।',
    'ra.notWatchable':
      'समीक्षा स्वीकार भएको क्षणदेखि बन्द नभएसम्म पाठहरू चलाउन सकिन्छ, त्यसैले अहिले यहाँ चलाउन सकिँदैन।',
    'ra.needsHead': 'यो संस्करणलाई के चाहिन्छ, र के जाँचिएको छ',
    'ra.english': 'तलका दुई प्यानल अहिलेका लागि अङ्ग्रेजीमा छन्।',
    'ra.decisionHead': 'तपाईंको निर्णय',
    'ra.backQueue': 'लाममा फर्कनुहोस्',
    'ra.unread': 'यो समीक्षा अहिले पढ्न सकिएन। केही बेरमा फेरि प्रयास गर्नुहोस्।',
    'ra.outlineUnread':
      'यो कोर्सको रूपरेखा अहिले पढ्न सकिएन, त्यसैले देखाइएको छैन। निर्णय गर्नुअघि पृष्ठ फेरि लोड गर्नुहोस्।',
    'ra.partUnread':
      'यो पृष्ठको केही भाग अहिले पढ्न सकिएन, त्यसैले यो अधुरो छ। निर्णय गर्नुअघि फेरि लोड गर्नुहोस्।',
    'ra.offerHead': 'यो समीक्षा तपाईंलाई प्रस्ताव गरिएको छ',
    'ra.offerNote': 'तपाईंले स्वीकार नगरुन्जेल तपाईंबाट केही अपेक्षा गरिएको छैन।',
    'ra.accept': 'यो समीक्षा स्वीकार गर्नुहोस्',
    'ra.decline': 'अस्वीकार गर्नुहोस्',
    'ra.recordHead': 'आफ्नो निर्णय दर्ता गर्नुहोस्',
    'ra.reason': 'कारण',
    'ra.reasonHint':
      'तपाईंले के जाँच्नुभयो, र के पाउनुभयो? शिक्षकले पुनरावेदन गर्ने अभिलेख यही हो।',
    'ra.approve': 'स्वीकृत गर्नुहोस्',
    'ra.revise': 'संशोधन माग्नुहोस्',
    'ra.reject': 'अस्वीकृत गर्नुहोस्',
    'ra.approveNote':
      'स्वीकृतिले संस्करणलाई “स्वीकृत” अवस्थामा सार्छ, जहाँ प्लेटफर्मका कर्मचारीले यसलाई प्रकाशित गर्न सक्छन्। तपाईं आफैँ प्रकाशित गर्न सक्नुहुन्न, र आफूले लेखेको कोर्स स्वीकृत गर्न सक्नुहुन्न।',
    'ra.decided': 'तपाईंले यो समीक्षामा पहिले नै निर्णय दर्ता गरिसक्नुभएको छ।',
    'ra.closedNote': 'यो समीक्षा बन्द छ, त्यसैले यसमा निर्णय दर्ता गर्न सकिँदैन।',
    'ra.notMoved':
      'तपाईंको निर्णय दर्ता भयो। कोर्सलाई भने यहाँबाट अगाडि सार्न सकिएन; प्लेटफर्मका कर्मचारीले तपाईंको निर्णय देख्न र कोर्स अगाडि सार्न सक्छन्। तपाईंले फेरि निर्णय गर्नु पर्दैन।',
    'ra.eNotYours': 'त्यो समीक्षा तपाईंको होइन।',
    'ra.eNotOpen':
      'यो समीक्षा अब त्यसका लागि खुला छैन। यो कुन अवस्थामा छ हेर्न पृष्ठ फेरि लोड गर्नुहोस्।',
    'ra.eConflict':
      'तपाईंले घोषणा गरेको एउटा द्वन्द्वले तपाईंलाई यो समीक्षाको निर्णय गर्नबाट रोक्छ।',
    'ra.eReason': 'निर्णयको कारण लेख्नुहोस्।',
    'ra.eRefused': 'यो दर्ता भएन। समीक्षा कुन अवस्थामा छ हेर्न पृष्ठ फेरि लोड गर्नुहोस्।',
    'ra.standHead': 'यसको निष्पक्ष समीक्षा गर्न सक्नुहुन्न?',
    'ra.declared': 'घोषणा गरियो',
    'ra.declareOpen': 'यो कोर्सबारे स्वार्थको द्वन्द्व घोषणा गर्नुहोस्',
    'ra.declareNote':
      'घोषणाले तपाईंलाई तुरुन्तै यो समीक्षाको निर्णय गर्नबाट रोक्छ, र प्लेटफर्मका कर्मचारीले सुनुवाइ नगरुन्जेल रोकिरहन्छ। यसले समीक्षा बन्द गर्दैन: यो अझै प्रस्ताव हो भने त्यसलाई पनि अस्वीकार गर्नुहोस्; नत्र कर्मचारीले बन्द गर्छन्।',
  },
};
