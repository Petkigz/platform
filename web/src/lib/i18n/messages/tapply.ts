import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The page somebody opens to ask to teach (`app/teach/apply/page.tsx`), with
 * its form and the button that takes an application back.
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts`, `reading.ts`, `restore.ts`, `phone.ts`, `merge.ts`,
 * `share.ts`, `refer.ts`, `sponsor.ts`, `orders.ts`, `billing.ts`,
 * `receipt.ts`, `notify.ts`, `plans.ts`, `subs.ts`, `policy.ts` and `inst.ts`:
 * written for the twenty-seven languages with nothing held in `held.ts`, and
 * for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Applying is not being appointed**, and `byAppointment` says so before
 * the form: no teacher, no course and no page is made by sending it.
 *
 * **What the applicant writes is not translated**, and `asWritten` says so.
 * The owner reads it as it was typed. The note the owner leaves on a refusal
 * is shown the same way, under `noteLeft`.
 *
 * **Nobody is told when the answer comes.** Deciding an application writes
 * no notification, so `answerHere` says to look at this page again.
 *
 * **A refusal is a name with a sentence**: `whyTeach`, `whyKnow`,
 * `whySample` and `whyLong` for what was typed, `whyClosed`, `whyApplied`
 * and `whyNothing` for what the database refuses. No sentence here contains
 * a number or a web address; the limits are the form's own.
 *
 * What is put into a sentence comes last, after a colon, so no language has
 * to inflect it. No speaker has read any of these yet.
 */
export const TAPPLY: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'tapply.byAppointment':
      'التدريس هنا بالتعيين. إرسال هذا الطلب يطلب من المالك أن ينظر في أمرك. لا يجعلك معلّمًا، ولا ينشئ دورة ولا صفحة. لا يُنشر شيء مما تكتبه هنا. وإن قُبل طلبك، فكل دورة تكتبها تُراجَع قبل أن يراها أي متعلّم.',
    'tapply.asWritten': 'يقرأ المالك ما تكتبه كما كتبته. لا يُترجَم.',
    'tapply.unread': 'تعذّرت قراءة طلبك. هذه الصفحة لم ترسل شيئًا ولم تغيّر شيئًا.',
    'tapply.teachesAlready': 'أنت تدرّس هنا بالفعل، فلا شيء تتقدّم له.',
    'tapply.toCourses': 'انتقل إلى دوراتك',
    'tapply.approved': 'قُبل طلبك.',
    'tapply.noteLeft': 'الملاحظة التي تُركت لك، كما كُتبت:',
    'tapply.yours': 'طلبك',
    'tapply.waiting': 'لدى المالك، بانتظار القراءة',
    'tapply.sentOn': 'أُرسل في: {date}',
    'tapply.answerHere': 'سيظهر الرد في هذه الصفحة. لا تُرسَل رسالة عند وصوله، فعُد إلى هنا لتراه.',
    'tapply.sampleLink': 'الدرس النموذجي الذي أرسلته',
    'tapply.withdrawDo': 'اسحب هذا الطلب',
    'tapply.withdrawNote': 'يمكنك سحبه في أي وقت قبل الرد عليه. ولا يلزمك ذكر السبب.',
    'tapply.declined': 'لم يُقبل هذه المرة.',
    'tapply.again': 'يمكنك إرسال طلب آخر.',
    'tapply.withdrawn': 'سحبت طلبك. يمكنك إرسال طلب جديد.',
    'tapply.closed':
      'التقدّم للتدريس مغلق حاليًا، فلا يمكن إرسال شيء من هذه الصفحة. إن رغبت في التدريس هنا، فاسأل المالك.',
    'tapply.formTitle': 'ما يقرؤه المالك',
    'tapply.fieldTeach': 'ماذا ستدرّس، في سطر واحد؟',
    'tapply.hintTeach': 'مثلًا: التجويد وتلاوة القرآن للأطفال.',
    'tapply.fieldKnow': 'ما تعرفه، وعمّن تعلّمته',
    'tapply.hintKnow':
      'بكلماتك أنت. مؤهلات المعلّم هنا يتحقق منها إنسان، فاكتب ما كنت ستقوله لمعلّم آخر: مثلًا إجازة ومن منحها، وسنوات تدريسك، وأين درّست.',
    'tapply.fieldSample': 'رابط درس نموذجي',
    'tapply.hintSample':
      'رابط درس سجّلته أو بثثته. يجب أن يتمكن المالك من مشاهدته. لا يمكن رفع ملف هنا.',
    'tapply.fieldElse': 'أي شيء آخر',
    'tapply.hintElse':
      'مثلًا الساعات التي تستطيع التدريس فيها، ومنطقتك الزمنية، واللغات التي تدرّس بها.',
    'tapply.sendDo': 'أرسل إلى المالك',
    'tapply.whyTeach': 'اذكر ما ستدرّسه في بضع كلمات.',
    'tapply.whyKnow': 'اكتب جملة أو جملتين عمّا تعرفه وعمّن تعلّمته.',
    'tapply.whySample': 'هذا ليس رابطًا يستطيع المالك فتحه. الصق عنوان الدرس كاملًا، بلا مسافات.',
    'tapply.whyLong': 'أحد الحقول فيه أكثر مما يتّسع له. اختصره ثم أرسل من جديد.',
    'tapply.whyClosed': 'التقدّم للتدريس مغلق حاليًا. لم يُرسل شيء.',
    'tapply.whyApplied': 'لديك طلب عند المالك بالفعل. انتظر الرد.',
    'tapply.whyNothing': 'لا يوجد طلب قيد الانتظار لتسحبه. ربما تم الرد عليه بالفعل.',
  },
  ur: {
    'tapply.byAppointment':
      'یہاں پڑھانا تقرری سے ہوتا ہے۔ یہ بھیجنے سے مالک سے درخواست کی جاتی ہے کہ وہ آپ پر غور کرے۔ اس سے آپ استاد نہیں بنتے، اور نہ کوئی کورس بنتا ہے نہ کوئی صفحہ۔ آپ یہاں جو لکھتے ہیں وہ شائع نہیں ہوتا۔ اگر درخواست منظور ہو جائے تب بھی آپ کا لکھا ہر کورس کسی طالب علم کے دیکھنے سے پہلے جانچا جاتا ہے۔',
    'tapply.asWritten':
      'مالک آپ کی تحریر ویسے ہی پڑھتا ہے جیسے آپ نے لکھی۔ اس کا ترجمہ نہیں کیا جاتا۔',
    'tapply.unread': 'آپ کی درخواست پڑھی نہیں جا سکی۔ اس صفحے نے نہ کچھ بھیجا اور نہ کچھ بدلا۔',
    'tapply.teachesAlready': 'آپ یہاں پہلے ہی پڑھاتے ہیں، اس لیے درخواست دینے کی ضرورت نہیں۔',
    'tapply.toCourses': 'اپنے کورسز پر جائیں',
    'tapply.approved': 'آپ کی درخواست منظور ہو گئی۔',
    'tapply.noteLeft': 'آپ کے لیے چھوڑا گیا نوٹ، جیسا لکھا گیا تھا:',
    'tapply.yours': 'آپ کی درخواست',
    'tapply.waiting': 'مالک کے پاس ہے، پڑھے جانے کی منتظر',
    'tapply.sentOn': 'بھیجی گئی: {date}',
    'tapply.answerHere':
      'جواب اسی صفحے پر دکھایا جائے گا۔ جواب آنے پر کوئی پیغام نہیں بھیجا جاتا، اس لیے یہاں دوبارہ دیکھیں۔',
    'tapply.sampleLink': 'آپ کا بھیجا ہوا نمونے کا سبق',
    'tapply.withdrawDo': 'یہ درخواست واپس لیں',
    'tapply.withdrawNote':
      'جواب آنے سے پہلے آپ اسے کسی بھی وقت واپس لے سکتے ہیں۔ وجہ بتانا ضروری نہیں۔',
    'tapply.declined': 'اس بار منظور نہیں ہوئی۔',
    'tapply.again': 'آپ ایک اور درخواست بھیج سکتے ہیں۔',
    'tapply.withdrawn': 'آپ نے اپنی درخواست واپس لے لی۔ آپ نئی درخواست بھیج سکتے ہیں۔',
    'tapply.closed':
      'درخواستیں اس وقت بند ہیں، اس لیے اس صفحے سے کچھ نہیں بھیجا جا سکتا۔ اگر آپ یہاں پڑھانا چاہتے ہیں تو مالک سے پوچھیں۔',
    'tapply.formTitle': 'مالک کیا پڑھتا ہے',
    'tapply.fieldTeach': 'آپ کیا پڑھائیں گے، ایک سطر میں؟',
    'tapply.hintTeach': 'مثلاً: بچوں کے لیے تجوید اور تلاوتِ قرآن۔',
    'tapply.fieldKnow': 'آپ کیا جانتے ہیں، اور کس سے سیکھا',
    'tapply.hintKnow':
      'اپنے الفاظ میں۔ یہاں استاد کی اہلیتیں ایک انسان جانچتا ہے، اس لیے وہ لکھیں جو آپ کسی دوسرے استاد کو بتاتے: مثلاً اجازہ اور کس نے دیا، کتنے سال پڑھایا، اور کہاں۔',
    'tapply.fieldSample': 'نمونے کے سبق کا لنک',
    'tapply.hintSample':
      'کسی ایسے سبق کا لنک جو آپ نے ریکارڈ یا نشر کیا ہو۔ ضروری ہے کہ مالک اسے دیکھ سکے۔ یہاں فائل اپ لوڈ نہیں کی جا سکتی۔',
    'tapply.fieldElse': 'کچھ اور',
    'tapply.hintElse':
      'مثلاً وہ اوقات جن میں آپ پڑھا سکتے ہیں، آپ کا ٹائم زون، اور وہ زبانیں جن میں آپ پڑھاتے ہیں۔',
    'tapply.sendDo': 'مالک کو بھیجیں',
    'tapply.whyTeach': 'چند لفظوں میں بتائیں کہ آپ کیا پڑھائیں گے۔',
    'tapply.whyKnow': 'ایک دو جملے لکھیں کہ آپ کیا جانتے ہیں اور کس سے سیکھا۔',
    'tapply.whySample':
      'یہ ایسا لنک نہیں جسے مالک کھول سکے۔ سبق کا پورا پتا چسپاں کریں، بغیر کسی خالی جگہ کے۔',
    'tapply.whyLong': 'کسی ایک خانے میں گنجائش سے زیادہ لکھا ہے۔ اسے مختصر کریں اور دوبارہ بھیجیں۔',
    'tapply.whyClosed': 'پڑھانے کی درخواستیں اس وقت بند ہیں۔ کچھ نہیں بھیجا گیا۔',
    'tapply.whyApplied': 'آپ کی ایک درخواست پہلے ہی مالک کے پاس ہے۔ جواب کا انتظار کریں۔',
    'tapply.whyNothing': 'واپس لینے کے لیے کوئی منتظر درخواست نہیں۔ ممکن ہے اس کا جواب آ چکا ہو۔',
  },
  fa: {
    'tapply.byAppointment':
      'تدریس در اینجا با انتصاب است. فرستادن این درخواست از مالک می‌خواهد شما را در نظر بگیرد. شما را معلم نمی‌کند و هیچ دوره یا صفحه‌ای نمی‌سازد. هیچ‌چیز از آنچه اینجا می‌نویسید منتشر نمی‌شود. اگر پذیرفته شوید، هر دوره‌ای که بنویسید پیش از آنکه یادگیرنده‌ای آن را ببیند بازبینی می‌شود.',
    'tapply.asWritten': 'مالک نوشتهٔ شما را همان‌طور که نوشته‌اید می‌خواند. ترجمه نمی‌شود.',
    'tapply.unread': 'درخواست شما خوانده نشد. این صفحه چیزی نفرستاد و چیزی را تغییر نداد.',
    'tapply.teachesAlready': 'شما همین حالا اینجا تدریس می‌کنید، پس چیزی برای درخواست نیست.',
    'tapply.toCourses': 'رفتن به دوره‌های شما',
    'tapply.approved': 'درخواست شما پذیرفته شد.',
    'tapply.noteLeft': 'یادداشتی که برای شما گذاشته شده، همان‌طور که نوشته شده است:',
    'tapply.yours': 'درخواست شما',
    'tapply.waiting': 'نزد مالک، در انتظار خوانده شدن',
    'tapply.sentOn': 'فرستاده شده در: {date}',
    'tapply.answerHere':
      'پاسخ در همین صفحه نشان داده می‌شود. هنگام رسیدن پاسخ پیامی فرستاده نمی‌شود، پس دوباره به اینجا سر بزنید.',
    'tapply.sampleLink': 'درس نمونه‌ای که فرستادید',
    'tapply.withdrawDo': 'پس گرفتن این درخواست',
    'tapply.withdrawNote':
      'تا پیش از پاسخ، هر زمان می‌توانید آن را پس بگیرید. لازم نیست دلیلش را بگویید.',
    'tapply.declined': 'این بار پذیرفته نشد.',
    'tapply.again': 'می‌توانید درخواست دیگری بفرستید.',
    'tapply.withdrawn': 'درخواست خود را پس گرفتید. می‌توانید درخواست تازه‌ای بفرستید.',
    'tapply.closed':
      'درخواست‌ها فعلاً بسته است، پس از این صفحه چیزی نمی‌توان فرستاد. اگر می‌خواهید اینجا تدریس کنید، از مالک بپرسید.',
    'tapply.formTitle': 'آنچه مالک می‌خواند',
    'tapply.fieldTeach': 'چه چیزی تدریس می‌کنید، در یک سطر؟',
    'tapply.hintTeach': 'برای نمونه: تجوید و تلاوت قرآن برای کودکان.',
    'tapply.fieldKnow': 'آنچه می‌دانید، و از چه کسی آموخته‌اید',
    'tapply.hintKnow':
      'به زبان خودتان. اینجا مدارک معلم را یک انسان بررسی می‌کند، پس همان را بنویسید که به معلم دیگری می‌گفتید: برای نمونه اجازه و اینکه چه کسی آن را داده، سال‌هایی که تدریس کرده‌اید، و کجا.',
    'tapply.fieldSample': 'پیوند یک درس نمونه',
    'tapply.hintSample':
      'پیوند درسی که ضبط یا پخش کرده‌اید. مالک باید بتواند آن را ببیند. اینجا نمی‌توان فایل بارگذاری کرد.',
    'tapply.fieldElse': 'هر چیز دیگر',
    'tapply.hintElse':
      'برای نمونه ساعت‌هایی که می‌توانید تدریس کنید، منطقهٔ زمانی شما و زبان‌هایی که به آن‌ها تدریس می‌کنید.',
    'tapply.sendDo': 'فرستادن برای مالک',
    'tapply.whyTeach': 'در چند کلمه بگویید چه چیزی تدریس می‌کنید.',
    'tapply.whyKnow': 'یکی دو جمله بنویسید که چه می‌دانید و از چه کسی آموخته‌اید.',
    'tapply.whySample':
      'این پیوندی نیست که مالک بتواند باز کند. نشانی کامل درس را بدون فاصله بچسبانید.',
    'tapply.whyLong':
      'در یکی از کادرها بیش از گنجایش آن نوشته شده است. کوتاهش کنید و دوباره بفرستید.',
    'tapply.whyClosed': 'درخواست تدریس فعلاً بسته است. چیزی فرستاده نشد.',
    'tapply.whyApplied': 'شما هم‌اکنون یک درخواست نزد مالک دارید. منتظر پاسخ بمانید.',
    'tapply.whyNothing':
      'درخواستی در انتظار نیست که پس بگیرید. شاید پیش‌تر به آن پاسخ داده شده باشد.',
  },
  'fa-af': {
    'tapply.byAppointment':
      'تدریس در اینجا با تقرر است. فرستادن این درخواست از مالک می‌خواهد شما را در نظر بگیرد. شما را معلم نمی‌سازد و هیچ کورس یا صفحه‌ای ایجاد نمی‌کند. هیچ‌چیز از آنچه اینجا می‌نویسید نشر نمی‌شود. اگر پذیرفته شوید، هر کورسی که بنویسید پیش از آنکه شاگردی آن را ببیند بررسی می‌شود.',
    'tapply.asWritten': 'مالک نوشتهٔ شما را همان‌طور که نوشته‌اید می‌خواند. ترجمه نمی‌شود.',
    'tapply.unread': 'درخواست شما خوانده نشد. این صفحه چیزی نفرستاد و چیزی را تغییر نداد.',
    'tapply.teachesAlready': 'شما همین حالا اینجا تدریس می‌کنید، پس چیزی برای درخواست نیست.',
    'tapply.toCourses': 'رفتن به کورس‌های شما',
    'tapply.approved': 'درخواست شما پذیرفته شد.',
    'tapply.noteLeft': 'یادداشتی که برای شما گذاشته شده، همان‌طور که نوشته شده است:',
    'tapply.yours': 'درخواست شما',
    'tapply.waiting': 'نزد مالک، در انتظار خوانده شدن',
    'tapply.sentOn': 'فرستاده شده در: {date}',
    'tapply.answerHere':
      'پاسخ در همین صفحه نشان داده می‌شود. هنگام رسیدن پاسخ پیامی فرستاده نمی‌شود، پس دوباره اینجا را ببینید.',
    'tapply.sampleLink': 'درس نمونه‌ای که فرستادید',
    'tapply.withdrawDo': 'پس گرفتن این درخواست',
    'tapply.withdrawNote':
      'تا پیش از پاسخ، هر وقت می‌توانید آن را پس بگیرید. لازم نیست دلیلش را بگویید.',
    'tapply.declined': 'این بار پذیرفته نشد.',
    'tapply.again': 'می‌توانید درخواست دیگری بفرستید.',
    'tapply.withdrawn': 'درخواست خود را پس گرفتید. می‌توانید درخواست نوی بفرستید.',
    'tapply.closed':
      'درخواست‌ها فعلاً بسته است، پس از این صفحه چیزی فرستاده نمی‌تواند. اگر می‌خواهید اینجا تدریس کنید، از مالک بپرسید.',
    'tapply.formTitle': 'آنچه مالک می‌خواند',
    'tapply.fieldTeach': 'چه چیزی را تدریس می‌کنید، در یک سطر؟',
    'tapply.hintTeach': 'به طور مثال: تجوید و تلاوت قرآن برای اطفال.',
    'tapply.fieldKnow': 'آنچه می‌دانید، و از کی آموخته‌اید',
    'tapply.hintKnow':
      'به زبان خودتان. اینجا اسناد تحصیلی معلم را یک انسان بررسی می‌کند، پس همان را بنویسید که به معلم دیگری می‌گفتید: به طور مثال اجازه و اینکه کی آن را داده، سال‌هایی که تدریس کرده‌اید، و کجا.',
    'tapply.fieldSample': 'لینک یک درس نمونه',
    'tapply.hintSample':
      'لینک درسی که ثبت یا نشر کرده‌اید. مالک باید بتواند آن را ببیند. اینجا فایل آپلود شده نمی‌تواند.',
    'tapply.fieldElse': 'هر چیز دیگر',
    'tapply.hintElse':
      'به طور مثال ساعت‌هایی که تدریس کرده می‌توانید، ساحهٔ زمانی شما و زبان‌هایی که به آن‌ها تدریس می‌کنید.',
    'tapply.sendDo': 'فرستادن به مالک',
    'tapply.whyTeach': 'در چند کلمه بگویید چه چیزی را تدریس می‌کنید.',
    'tapply.whyKnow': 'یکی دو جمله بنویسید که چه می‌دانید و از کی آموخته‌اید.',
    'tapply.whySample':
      'این لینکی نیست که مالک آن را باز کرده بتواند. آدرس کامل درس را بدون فاصله بچسبانید.',
    'tapply.whyLong':
      'در یکی از خانه‌ها بیشتر از گنجایش آن نوشته شده است. کوتاهش کنید و دوباره بفرستید.',
    'tapply.whyClosed': 'درخواست تدریس فعلاً بسته است. چیزی فرستاده نشد.',
    'tapply.whyApplied': 'شما همین حالا یک درخواست نزد مالک دارید. منتظر پاسخ بمانید.',
    'tapply.whyNothing':
      'درخواستی در انتظار نیست که پس بگیرید. شاید پیش از این به آن پاسخ داده شده باشد.',
  },
  tr: {
    'tapply.byAppointment':
      'Burada öğretmenlik atamayla olur. Bunu göndermek, platform sahibinden sizi değerlendirmesini ister. Sizi öğretmen yapmaz, bir kurs ya da sayfa da oluşturmaz. Buraya yazdıklarınızın hiçbiri yayımlanmaz. Onaylanırsanız, yazdığınız her kurs bir öğrenci görmeden önce yine incelenir.',
    'tapply.asWritten': 'Platform sahibi yazdıklarınızı yazdığınız gibi okur. Çevrilmez.',
    'tapply.unread':
      'Başvurunuz okunamadı. Bu sayfa hiçbir şey göndermedi ve hiçbir şeyi değiştirmedi.',
    'tapply.teachesAlready': 'Burada zaten öğretiyorsunuz, bu yüzden başvuracak bir şey yok.',
    'tapply.toCourses': 'Kurslarınıza gidin',
    'tapply.approved': 'Başvurunuz onaylandı.',
    'tapply.noteLeft': 'Size bırakılan not, yazıldığı gibi:',
    'tapply.yours': 'Başvurunuz',
    'tapply.waiting': 'Platform sahibinde, okunmayı bekliyor',
    'tapply.sentOn': 'Gönderildiği tarih: {date}',
    'tapply.answerHere':
      'Yanıt bu sayfada gösterilecek. Yanıt geldiğinde bir ileti gönderilmez, bu yüzden buraya yeniden bakın.',
    'tapply.sampleLink': 'Gönderdiğiniz örnek ders',
    'tapply.withdrawDo': 'Bu başvuruyu geri al',
    'tapply.withdrawNote':
      'Yanıtlanmadan önce istediğiniz zaman geri alabilirsiniz. Nedenini söylemeniz gerekmez.',
    'tapply.declined': 'Bu kez onaylanmadı.',
    'tapply.again': 'Başka bir başvuru gönderebilirsiniz.',
    'tapply.withdrawn': 'Başvurunuzu geri aldınız. Yeni bir başvuru gönderebilirsiniz.',
    'tapply.closed':
      'Başvurular şu anda kapalı, bu yüzden bu sayfadan hiçbir şey gönderilemez. Burada öğretmek isterseniz platform sahibine sorun.',
    'tapply.formTitle': 'Platform sahibinin okudukları',
    'tapply.fieldTeach': 'Ne öğretirdiniz, tek satırda?',
    'tapply.hintTeach': 'Örneğin: çocuklar için tecvit ve Kuran tilaveti.',
    'tapply.fieldKnow': 'Ne bildiğiniz ve kimden öğrendiğiniz',
    'tapply.hintKnow':
      'Kendi sözlerinizle. Burada bir öğretmenin yeterliliklerini bir insan inceler; bu yüzden başka bir öğretmene ne söyleyecekseniz onu yazın: örneğin bir icazet ve onu kimin verdiği, kaç yıl öğrettiğiniz ve nerede.',
    'tapply.fieldSample': 'Örnek bir dersin bağlantısı',
    'tapply.hintSample':
      'Kaydettiğiniz ya da yayınladığınız bir dersin bağlantısı. Platform sahibinin onu izleyebilmesi gerekir. Buraya dosya yüklenemez.',
    'tapply.fieldElse': 'Başka bir şey',
    'tapply.hintElse':
      'Örneğin ders verebileceğiniz saatler, saat diliminiz ve hangi dillerde öğrettiğiniz.',
    'tapply.sendDo': 'Platform sahibine gönder',
    'tapply.whyTeach': 'Ne öğreteceğinizi birkaç sözcükle söyleyin.',
    'tapply.whyKnow': 'Ne bildiğinizi ve kimden öğrendiğinizi bir iki cümleyle yazın.',
    'tapply.whySample':
      'Bu, platform sahibinin açabileceği bir bağlantı değil. Dersin tam adresini, içinde boşluk olmadan yapıştırın.',
    'tapply.whyLong': 'Kutulardan birinde alabileceğinden fazlası var. Kısaltıp yeniden gönderin.',
    'tapply.whyClosed': 'Öğretmenlik başvuruları şu anda kapalı. Hiçbir şey gönderilmedi.',
    'tapply.whyApplied': 'Platform sahibinde zaten bir başvurunuz var. Yanıtı bekleyin.',
    'tapply.whyNothing': 'Geri alınacak, bekleyen bir başvuru yok. Yanıtlanmış olabilir.',
  },
  id: {
    'tapply.byAppointment':
      'Mengajar di sini dilakukan melalui penunjukan. Mengirim ini meminta pemilik untuk mempertimbangkan Anda. Ini tidak menjadikan Anda guru, dan tidak membuat kursus maupun halaman. Tidak ada yang Anda tulis di sini yang diterbitkan. Jika Anda disetujui, setiap kursus yang Anda tulis tetap ditinjau sebelum dilihat pelajar.',
    'tapply.asWritten':
      'Pemilik membaca tulisan Anda sebagaimana Anda menulisnya. Tulisan itu tidak diterjemahkan.',
    'tapply.unread':
      'Lamaran Anda tidak dapat dibaca. Halaman ini tidak mengirim apa pun dan tidak mengubah apa pun.',
    'tapply.teachesAlready': 'Anda sudah mengajar di sini, jadi tidak ada yang perlu dilamar.',
    'tapply.toCourses': 'Buka kursus Anda',
    'tapply.approved': 'Lamaran Anda disetujui.',
    'tapply.noteLeft': 'Catatan yang ditinggalkan untuk Anda, sebagaimana ditulis:',
    'tapply.yours': 'Lamaran Anda',
    'tapply.waiting': 'Ada pada pemilik, menunggu dibaca',
    'tapply.sentOn': 'Dikirim pada: {date}',
    'tapply.answerHere':
      'Jawabannya akan ditampilkan di halaman ini. Tidak ada pesan yang dikirim saat jawaban datang, jadi lihatlah kembali di sini.',
    'tapply.sampleLink': 'Contoh pelajaran yang Anda kirim',
    'tapply.withdrawDo': 'Tarik kembali lamaran ini',
    'tapply.withdrawNote':
      'Anda dapat menariknya kapan saja sebelum dijawab. Anda tidak perlu menyebutkan alasannya.',
    'tapply.declined': 'Kali ini tidak disetujui.',
    'tapply.again': 'Anda dapat mengirim lamaran lain.',
    'tapply.withdrawn': 'Anda menarik kembali lamaran Anda. Anda dapat mengirim yang baru.',
    'tapply.closed':
      'Lamaran sedang ditutup, jadi tidak ada yang dapat dikirim dari halaman ini. Jika Anda ingin mengajar di sini, tanyakan kepada pemilik.',
    'tapply.formTitle': 'Yang dibaca pemilik',
    'tapply.fieldTeach': 'Apa yang akan Anda ajarkan, dalam satu baris?',
    'tapply.hintTeach': 'Misalnya: tajwid dan tilawah Al-Quran untuk anak-anak.',
    'tapply.fieldKnow': 'Apa yang Anda kuasai, dan dari siapa Anda mempelajarinya',
    'tapply.hintKnow':
      'Dengan kata-kata Anda sendiri. Di sini kualifikasi seorang guru diperiksa oleh manusia, jadi tulislah apa yang akan Anda sampaikan kepada guru lain: misalnya ijazah dan siapa yang memberikannya, berapa tahun Anda mengajar, dan di mana.',
    'tapply.fieldSample': 'Tautan ke contoh pelajaran',
    'tapply.hintSample':
      'Tautan ke pelajaran yang pernah Anda rekam atau siarkan. Pemilik harus dapat menontonnya. Berkas tidak dapat diunggah di sini.',
    'tapply.fieldElse': 'Hal lain',
    'tapply.hintElse':
      'Misalnya jam Anda dapat mengajar, zona waktu Anda, dan bahasa yang Anda gunakan untuk mengajar.',
    'tapply.sendDo': 'Kirim kepada pemilik',
    'tapply.whyTeach': 'Sebutkan apa yang akan Anda ajarkan, dalam beberapa kata.',
    'tapply.whyKnow':
      'Tulis satu atau dua kalimat tentang apa yang Anda kuasai dan dari siapa Anda mempelajarinya.',
    'tapply.whySample':
      'Itu bukan tautan yang dapat dibuka pemilik. Tempelkan alamat lengkap pelajaran itu, tanpa spasi.',
    'tapply.whyLong':
      'Salah satu kotak berisi lebih banyak daripada yang dapat ditampungnya. Persingkat lalu kirim lagi.',
    'tapply.whyClosed': 'Lamaran untuk mengajar sedang ditutup. Tidak ada yang dikirim.',
    'tapply.whyApplied': 'Anda sudah mempunyai lamaran pada pemilik. Tunggu jawabannya.',
    'tapply.whyNothing':
      'Tidak ada lamaran yang sedang menunggu untuk ditarik kembali. Mungkin sudah dijawab.',
  },
  ms: {
    'tapply.byAppointment':
      'Mengajar di sini adalah melalui pelantikan. Menghantar ini meminta pemilik menimbangkan anda. Ia tidak menjadikan anda guru, dan tidak mewujudkan kursus atau halaman. Tiada apa yang anda tulis di sini diterbitkan. Jika anda diluluskan, setiap kursus yang anda tulis tetap disemak sebelum pelajar melihatnya.',
    'tapply.asWritten':
      'Pemilik membaca tulisan anda seperti yang anda tulis. Ia tidak diterjemahkan.',
    'tapply.unread':
      'Permohonan anda tidak dapat dibaca. Halaman ini tidak menghantar apa-apa dan tidak mengubah apa-apa.',
    'tapply.teachesAlready': 'Anda sudah mengajar di sini, jadi tiada apa yang perlu dimohon.',
    'tapply.toCourses': 'Pergi ke kursus anda',
    'tapply.approved': 'Permohonan anda diluluskan.',
    'tapply.noteLeft': 'Nota yang ditinggalkan untuk anda, seperti yang ditulis:',
    'tapply.yours': 'Permohonan anda',
    'tapply.waiting': 'Dengan pemilik, menunggu untuk dibaca',
    'tapply.sentOn': 'Dihantar pada: {date}',
    'tapply.answerHere':
      'Jawapan akan ditunjukkan di halaman ini. Tiada mesej dihantar apabila jawapan tiba, jadi lihat di sini semula.',
    'tapply.sampleLink': 'Contoh pelajaran yang anda hantar',
    'tapply.withdrawDo': 'Tarik balik permohonan ini',
    'tapply.withdrawNote':
      'Anda boleh menariknya balik pada bila-bila masa sebelum ia dijawab. Anda tidak perlu menyatakan sebabnya.',
    'tapply.declined': 'Tidak diluluskan kali ini.',
    'tapply.again': 'Anda boleh menghantar permohonan lain.',
    'tapply.withdrawn':
      'Anda telah menarik balik permohonan anda. Anda boleh menghantar yang baharu.',
    'tapply.closed':
      'Permohonan ditutup buat masa ini, jadi tiada apa yang boleh dihantar dari halaman ini. Jika anda ingin mengajar di sini, tanya pemilik.',
    'tapply.formTitle': 'Apa yang dibaca oleh pemilik',
    'tapply.fieldTeach': 'Apa yang akan anda ajar, dalam satu baris?',
    'tapply.hintTeach': 'Contohnya: tajwid dan tilawah Al-Quran untuk kanak-kanak.',
    'tapply.fieldKnow': 'Apa yang anda tahu, dan daripada siapa anda mempelajarinya',
    'tapply.hintKnow':
      'Dengan kata-kata anda sendiri. Di sini kelayakan seorang guru disemak oleh manusia, jadi tulislah apa yang akan anda beritahu guru lain: contohnya ijazah dan siapa yang memberikannya, berapa tahun anda mengajar, dan di mana.',
    'tapply.fieldSample': 'Pautan kepada contoh pelajaran',
    'tapply.hintSample':
      'Pautan kepada pelajaran yang pernah anda rakam atau siarkan. Pemilik mesti dapat menontonnya. Fail tidak boleh dimuat naik di sini.',
    'tapply.fieldElse': 'Perkara lain',
    'tapply.hintElse':
      'Contohnya waktu anda boleh mengajar, zon waktu anda dan bahasa yang anda gunakan untuk mengajar.',
    'tapply.sendDo': 'Hantar kepada pemilik',
    'tapply.whyTeach': 'Nyatakan apa yang akan anda ajar, dalam beberapa perkataan.',
    'tapply.whyKnow':
      'Tulis satu atau dua ayat tentang apa yang anda tahu dan daripada siapa anda mempelajarinya.',
    'tapply.whySample':
      'Itu bukan pautan yang boleh dibuka oleh pemilik. Tampal alamat penuh pelajaran itu, tanpa ruang kosong.',
    'tapply.whyLong':
      'Salah satu kotak mengandungi lebih daripada yang boleh dimuatkan. Pendekkan dan hantar semula.',
    'tapply.whyClosed': 'Permohonan untuk mengajar ditutup buat masa ini. Tiada apa yang dihantar.',
    'tapply.whyApplied': 'Anda sudah mempunyai permohonan dengan pemilik. Tunggu jawapannya.',
    'tapply.whyNothing':
      'Tiada permohonan yang sedang menunggu untuk ditarik balik. Mungkin ia sudah dijawab.',
  },
  bn: {
    'tapply.byAppointment':
      'এখানে পড়ানো হয় নিয়োগের মাধ্যমে। এটি পাঠালে মালিককে আপনাকে বিবেচনা করতে অনুরোধ করা হয়। এতে আপনি শিক্ষক হয়ে যান না, কোনো কোর্স বা পাতাও তৈরি হয় না। এখানে আপনি যা লেখেন তার কিছুই প্রকাশিত হয় না। আপনি অনুমোদন পেলেও আপনার লেখা প্রতিটি কোর্স কোনো শিক্ষার্থী দেখার আগে পর্যালোচিত হয়।',
    'tapply.asWritten': 'আপনি যেভাবে লিখেছেন মালিক সেভাবেই তা পড়েন। এটি অনুবাদ করা হয় না।',
    'tapply.unread': 'আপনার আবেদন পড়া যায়নি। এই পাতা কিছু পাঠায়নি এবং কিছু বদলায়নি।',
    'tapply.teachesAlready': 'আপনি ইতিমধ্যে এখানে পড়ান, তাই আবেদন করার কিছু নেই।',
    'tapply.toCourses': 'আপনার কোর্সগুলোতে যান',
    'tapply.approved': 'আপনার আবেদন অনুমোদিত হয়েছে।',
    'tapply.noteLeft': 'আপনার জন্য রেখে যাওয়া মন্তব্য, যেভাবে লেখা হয়েছিল:',
    'tapply.yours': 'আপনার আবেদন',
    'tapply.waiting': 'মালিকের কাছে আছে, পড়ার অপেক্ষায়',
    'tapply.sentOn': 'পাঠানো হয়েছে: {date}',
    'tapply.answerHere':
      'উত্তর এই পাতায় দেখানো হবে। উত্তর এলে কোনো বার্তা পাঠানো হয় না, তাই এখানে আবার দেখুন।',
    'tapply.sampleLink': 'আপনার পাঠানো নমুনা পাঠ',
    'tapply.withdrawDo': 'এই আবেদন ফিরিয়ে নিন',
    'tapply.withdrawNote':
      'উত্তর দেওয়ার আগে যেকোনো সময় আপনি এটি ফিরিয়ে নিতে পারেন। কারণ বলতে হবে না।',
    'tapply.declined': 'এবার অনুমোদিত হয়নি।',
    'tapply.again': 'আপনি আরেকটি আবেদন পাঠাতে পারেন।',
    'tapply.withdrawn': 'আপনি আপনার আবেদন ফিরিয়ে নিয়েছেন। আপনি নতুন একটি পাঠাতে পারেন।',
    'tapply.closed':
      'আবেদন এই মুহূর্তে বন্ধ আছে, তাই এই পাতা থেকে কিছু পাঠানো যাবে না। আপনি এখানে পড়াতে চাইলে মালিককে জিজ্ঞাসা করুন।',
    'tapply.formTitle': 'মালিক যা পড়েন',
    'tapply.fieldTeach': 'আপনি কী পড়াবেন, এক লাইনে?',
    'tapply.hintTeach': 'যেমন: শিশুদের জন্য তাজবিদ ও কুরআন তিলাওয়াত।',
    'tapply.fieldKnow': 'আপনি কী জানেন, এবং কার কাছে শিখেছেন',
    'tapply.hintKnow':
      'আপনার নিজের ভাষায়। এখানে শিক্ষকের যোগ্যতা একজন মানুষ যাচাই করেন, তাই অন্য একজন শিক্ষককে যা বলতেন তা-ই লিখুন: যেমন ইজাজা ও কে তা দিয়েছেন, কত বছর পড়িয়েছেন, এবং কোথায়।',
    'tapply.fieldSample': 'একটি নমুনা পাঠের লিংক',
    'tapply.hintSample':
      'আপনার রেকর্ড করা বা সম্প্রচার করা কোনো পাঠের লিংক। মালিক যেন তা দেখতে পারেন। এখানে ফাইল আপলোড করা যায় না।',
    'tapply.fieldElse': 'অন্য কিছু',
    'tapply.hintElse':
      'যেমন কোন সময়ে আপনি পড়াতে পারেন, আপনার সময় অঞ্চল এবং কোন কোন ভাষায় পড়ান।',
    'tapply.sendDo': 'মালিকের কাছে পাঠান',
    'tapply.whyTeach': 'আপনি কী পড়াবেন তা কয়েকটি শব্দে বলুন।',
    'tapply.whyKnow': 'আপনি কী জানেন এবং কার কাছে শিখেছেন তা নিয়ে এক-দুটি বাক্য লিখুন।',
    'tapply.whySample':
      'এটি এমন লিংক নয় যা মালিক খুলতে পারবেন। পাঠটির পুরো ঠিকানা কোনো ফাঁকা জায়গা ছাড়া বসান।',
    'tapply.whyLong': 'একটি ঘরে ধারণক্ষমতার চেয়ে বেশি লেখা আছে। ছোট করে আবার পাঠান।',
    'tapply.whyClosed': 'পড়ানোর আবেদন এই মুহূর্তে বন্ধ আছে। কিছুই পাঠানো হয়নি।',
    'tapply.whyApplied': 'মালিকের কাছে আপনার একটি আবেদন ইতিমধ্যে আছে। উত্তরের জন্য অপেক্ষা করুন।',
    'tapply.whyNothing':
      'ফিরিয়ে নেওয়ার মতো অপেক্ষমাণ কোনো আবেদন নেই। হয়তো এর উত্তর ইতিমধ্যে দেওয়া হয়েছে।',
  },
  hi: {
    'tapply.byAppointment':
      'यहाँ पढ़ाना नियुक्ति से होता है। इसे भेजने से मालिक से आप पर विचार करने का अनुरोध किया जाता है। इससे आप शिक्षक नहीं बनते, और न कोई कोर्स बनता है न कोई पृष्ठ। आप यहाँ जो लिखते हैं उसमें से कुछ भी प्रकाशित नहीं होता। अगर आपको स्वीकृति मिलती है, तब भी आपका लिखा हर कोर्स किसी शिक्षार्थी के देखने से पहले जाँचा जाता है।',
    'tapply.asWritten':
      'मालिक आपका लिखा वैसा ही पढ़ता है जैसा आपने लिखा। उसका अनुवाद नहीं किया जाता।',
    'tapply.unread': 'आपका आवेदन पढ़ा नहीं जा सका। इस पृष्ठ ने न कुछ भेजा और न कुछ बदला।',
    'tapply.teachesAlready': 'आप यहाँ पहले से पढ़ाते हैं, इसलिए आवेदन करने को कुछ नहीं है।',
    'tapply.toCourses': 'अपने कोर्स पर जाएँ',
    'tapply.approved': 'आपका आवेदन स्वीकृत हो गया।',
    'tapply.noteLeft': 'आपके लिए छोड़ी गई टिप्पणी, जैसी लिखी गई थी:',
    'tapply.yours': 'आपका आवेदन',
    'tapply.waiting': 'मालिक के पास है, पढ़े जाने की प्रतीक्षा में',
    'tapply.sentOn': 'भेजा गया: {date}',
    'tapply.answerHere':
      'उत्तर इसी पृष्ठ पर दिखाया जाएगा। उत्तर आने पर कोई संदेश नहीं भेजा जाता, इसलिए यहाँ दोबारा देखें।',
    'tapply.sampleLink': 'आपका भेजा हुआ नमूना पाठ',
    'tapply.withdrawDo': 'यह आवेदन वापस लें',
    'tapply.withdrawNote':
      'उत्तर मिलने से पहले आप इसे कभी भी वापस ले सकते हैं। कारण बताना ज़रूरी नहीं है।',
    'tapply.declined': 'इस बार स्वीकृत नहीं हुआ।',
    'tapply.again': 'आप एक और आवेदन भेज सकते हैं।',
    'tapply.withdrawn': 'आपने अपना आवेदन वापस ले लिया। आप नया आवेदन भेज सकते हैं।',
    'tapply.closed':
      'आवेदन इस समय बंद हैं, इसलिए इस पृष्ठ से कुछ भी भेजा नहीं जा सकता। अगर आप यहाँ पढ़ाना चाहते हैं, तो मालिक से पूछें।',
    'tapply.formTitle': 'मालिक क्या पढ़ता है',
    'tapply.fieldTeach': 'आप क्या पढ़ाएँगे, एक पंक्ति में?',
    'tapply.hintTeach': 'उदाहरण के लिए: बच्चों के लिए तजवीद और क़ुरआन की तिलावत।',
    'tapply.fieldKnow': 'आप क्या जानते हैं, और किससे सीखा',
    'tapply.hintKnow':
      'अपने शब्दों में। यहाँ शिक्षक की योग्यताएँ एक इंसान जाँचता है, इसलिए वही लिखें जो आप किसी दूसरे शिक्षक को बताते: उदाहरण के लिए इजाज़ा और किसने दिया, कितने साल पढ़ाया, और कहाँ।',
    'tapply.fieldSample': 'नमूना पाठ का लिंक',
    'tapply.hintSample':
      'किसी ऐसे पाठ का लिंक जिसे आपने रिकॉर्ड या प्रसारित किया हो। ज़रूरी है कि मालिक उसे देख सके। यहाँ फ़ाइल अपलोड नहीं की जा सकती।',
    'tapply.fieldElse': 'कुछ और',
    'tapply.hintElse':
      'उदाहरण के लिए किन घंटों में आप पढ़ा सकते हैं, आपका समय क्षेत्र और किन भाषाओं में आप पढ़ाते हैं।',
    'tapply.sendDo': 'मालिक को भेजें',
    'tapply.whyTeach': 'कुछ शब्दों में बताएँ कि आप क्या पढ़ाएँगे।',
    'tapply.whyKnow': 'एक-दो वाक्य लिखें कि आप क्या जानते हैं और किससे सीखा।',
    'tapply.whySample':
      'यह ऐसा लिंक नहीं है जिसे मालिक खोल सके। पाठ का पूरा पता बिना किसी खाली जगह के चिपकाएँ।',
    'tapply.whyLong':
      'किसी एक खाने में उसकी क्षमता से ज़्यादा लिखा है। उसे छोटा करके दोबारा भेजें।',
    'tapply.whyClosed': 'पढ़ाने के आवेदन इस समय बंद हैं। कुछ भी नहीं भेजा गया।',
    'tapply.whyApplied': 'आपका एक आवेदन पहले से मालिक के पास है। उत्तर की प्रतीक्षा करें।',
    'tapply.whyNothing':
      'वापस लेने के लिए कोई प्रतीक्षारत आवेदन नहीं है। हो सकता है उसका उत्तर दिया जा चुका हो।',
  },
  fr: {
    'tapply.byAppointment':
      'On enseigne ici sur nomination. Envoyer ceci demande au propriétaire d’étudier votre candidature. Cela ne fait pas de vous un enseignant et ne crée ni cours ni page. Rien de ce que vous écrivez ici n’est publié. Si vous êtes accepté, chaque cours que vous écrivez est tout de même relu avant qu’un apprenant le voie.',
    'tapply.asWritten':
      'Le propriétaire lit ce que vous écrivez tel que vous l’avez écrit. Ce n’est pas traduit.',
    'tapply.unread':
      'Votre candidature n’a pas pu être lue. Cette page n’a rien envoyé et n’a rien modifié.',
    'tapply.teachesAlready': 'Vous enseignez déjà ici, il n’y a donc rien à demander.',
    'tapply.toCourses': 'Aller à vos cours',
    'tapply.approved': 'Votre candidature a été acceptée.',
    'tapply.noteLeft': 'La note laissée pour vous, telle qu’elle a été écrite :',
    'tapply.yours': 'Votre candidature',
    'tapply.waiting': 'Chez le propriétaire, en attente de lecture',
    'tapply.sentOn': 'Envoyée le : {date}',
    'tapply.answerHere':
      'La réponse sera affichée sur cette page. Aucun message n’est envoyé quand elle arrive, alors revenez la voir ici.',
    'tapply.sampleLink': 'La leçon d’exemple que vous avez envoyée',
    'tapply.withdrawDo': 'Retirer cette candidature',
    'tapply.withdrawNote':
      'Vous pouvez la retirer à tout moment avant qu’elle reçoive une réponse. Vous n’avez pas à dire pourquoi.',
    'tapply.declined': 'Pas acceptée cette fois.',
    'tapply.again': 'Vous pouvez envoyer une autre candidature.',
    'tapply.withdrawn': 'Vous avez retiré votre candidature. Vous pouvez en envoyer une nouvelle.',
    'tapply.closed':
      'Les candidatures sont fermées pour le moment, donc rien ne peut être envoyé depuis cette page. Si vous souhaitez enseigner ici, demandez au propriétaire.',
    'tapply.formTitle': 'Ce que lit le propriétaire',
    'tapply.fieldTeach': 'Qu’enseigneriez-vous, en une ligne ?',
    'tapply.hintTeach': 'Par exemple : le tajwid et la récitation du Coran pour les enfants.',
    'tapply.fieldKnow': 'Ce que vous savez, et de qui vous l’avez appris',
    'tapply.hintKnow':
      'Avec vos propres mots. Ici, c’est une personne qui vérifie les qualifications d’un enseignant, alors écrivez ce que vous diriez à un autre enseignant : par exemple une ijaza et qui l’a délivrée, vos années d’enseignement, et où.',
    'tapply.fieldSample': 'Un lien vers une leçon d’exemple',
    'tapply.hintSample':
      'Un lien vers une leçon que vous avez enregistrée ou diffusée. Le propriétaire doit pouvoir la regarder. Aucun fichier ne peut être envoyé ici.',
    'tapply.fieldElse': 'Autre chose',
    'tapply.hintElse':
      'Par exemple les heures où vous pouvez enseigner, votre fuseau horaire et les langues dans lesquelles vous enseignez.',
    'tapply.sendDo': 'Envoyer au propriétaire',
    'tapply.whyTeach': 'Dites en quelques mots ce que vous enseigneriez.',
    'tapply.whyKnow':
      'Écrivez une ou deux phrases sur ce que vous savez et de qui vous l’avez appris.',
    'tapply.whySample':
      'Ce n’est pas un lien que le propriétaire peut ouvrir. Collez l’adresse complète de la leçon, sans espace.',
    'tapply.whyLong':
      'L’une des cases contient plus qu’elle ne peut recevoir. Raccourcissez-la puis envoyez de nouveau.',
    'tapply.whyClosed':
      'Les candidatures pour enseigner sont fermées pour le moment. Rien n’a été envoyé.',
    'tapply.whyApplied':
      'Vous avez déjà une candidature chez le propriétaire. Attendez la réponse.',
    'tapply.whyNothing':
      'Aucune candidature en attente ne peut être retirée. Elle a peut-être déjà reçu une réponse.',
  },
  es: {
    'tapply.byAppointment':
      'Aquí se enseña por nombramiento. Enviar esto pide al propietario que le tenga en cuenta. No le convierte en docente y no crea ningún curso ni ninguna página. Nada de lo que escriba aquí se publica. Si se le aprueba, cada curso que escriba se revisa igualmente antes de que lo vea un estudiante.',
    'tapply.asWritten':
      'El propietario lee lo que usted escribe tal como lo escribió. No se traduce.',
    'tapply.unread': 'No se pudo leer su solicitud. Esta página no envió nada ni cambió nada.',
    'tapply.teachesAlready': 'Usted ya enseña aquí, así que no hay nada que solicitar.',
    'tapply.toCourses': 'Ir a sus cursos',
    'tapply.approved': 'Su solicitud fue aprobada.',
    'tapply.noteLeft': 'La nota que se le dejó, tal como fue escrita:',
    'tapply.yours': 'Su solicitud',
    'tapply.waiting': 'En manos del propietario, a la espera de ser leída',
    'tapply.sentOn': 'Enviada el: {date}',
    'tapply.answerHere':
      'La respuesta se mostrará en esta página. No se envía ningún mensaje cuando llega, así que vuelva a mirar aquí.',
    'tapply.sampleLink': 'La lección de muestra que envió',
    'tapply.withdrawDo': 'Retirar esta solicitud',
    'tapply.withdrawNote':
      'Puede retirarla en cualquier momento antes de que se responda. No tiene que decir por qué.',
    'tapply.declined': 'No aprobada esta vez.',
    'tapply.again': 'Puede enviar otra solicitud.',
    'tapply.withdrawn': 'Retiró su solicitud. Puede enviar una nueva.',
    'tapply.closed':
      'Las solicitudes están cerradas por ahora, así que no se puede enviar nada desde esta página. Si desea enseñar aquí, pregunte al propietario.',
    'tapply.formTitle': 'Lo que lee el propietario',
    'tapply.fieldTeach': '¿Qué enseñaría, en una línea?',
    'tapply.hintTeach': 'Por ejemplo: tajwid y recitación del Corán para niños.',
    'tapply.fieldKnow': 'Lo que sabe y de quién lo aprendió',
    'tapply.hintKnow':
      'Con sus propias palabras. Aquí las titulaciones de un docente las comprueba una persona, así que escriba lo que le diría a otro docente: por ejemplo una iyaza y quién la otorgó, los años que ha enseñado y dónde.',
    'tapply.fieldSample': 'Un enlace a una lección de muestra',
    'tapply.hintSample':
      'Un enlace a una lección que haya grabado o transmitido. El propietario tiene que poder verla. Aquí no se puede subir un archivo.',
    'tapply.fieldElse': 'Algo más',
    'tapply.hintElse':
      'Por ejemplo las horas en que puede enseñar, su zona horaria y los idiomas en los que enseña.',
    'tapply.sendDo': 'Enviar al propietario',
    'tapply.whyTeach': 'Diga en pocas palabras qué enseñaría.',
    'tapply.whyKnow': 'Escriba una o dos frases sobre lo que sabe y de quién lo aprendió.',
    'tapply.whySample':
      'Ese no es un enlace que el propietario pueda abrir. Pegue la dirección completa de la lección, sin espacios.',
    'tapply.whyLong':
      'Una de las casillas contiene más de lo que admite. Acórtela y envíe de nuevo.',
    'tapply.whyClosed': 'Las solicitudes para enseñar están cerradas por ahora. No se envió nada.',
    'tapply.whyApplied': 'Ya tiene una solicitud en manos del propietario. Espere la respuesta.',
    'tapply.whyNothing':
      'No hay ninguna solicitud en espera que retirar. Puede que ya haya sido respondida.',
  },
  pt: {
    'tapply.byAppointment':
      'Ensina-se aqui por nomeação. Enviar isto pede ao proprietário que o considere. Não faz de si professor e não cria nenhum curso nem nenhuma página. Nada do que escrever aqui é publicado. Se for aprovado, cada curso que escrever é ainda assim revisto antes de um aluno o ver.',
    'tapply.asWritten': 'O proprietário lê o que escreve tal como o escreveu. Não é traduzido.',
    'tapply.unread':
      'Não foi possível ler a sua candidatura. Esta página não enviou nada e não alterou nada.',
    'tapply.teachesAlready': 'Já ensina aqui, por isso não há nada a que se candidatar.',
    'tapply.toCourses': 'Ir para os seus cursos',
    'tapply.approved': 'A sua candidatura foi aprovada.',
    'tapply.noteLeft': 'A nota deixada para si, tal como foi escrita:',
    'tapply.yours': 'A sua candidatura',
    'tapply.waiting': 'Com o proprietário, à espera de ser lida',
    'tapply.sentOn': 'Enviada em: {date}',
    'tapply.answerHere':
      'A resposta será mostrada nesta página. Não é enviada nenhuma mensagem quando ela chega, por isso volte a ver aqui.',
    'tapply.sampleLink': 'A aula de exemplo que enviou',
    'tapply.withdrawDo': 'Retirar esta candidatura',
    'tapply.withdrawNote':
      'Pode retirá-la a qualquer momento antes de ser respondida. Não tem de dizer porquê.',
    'tapply.declined': 'Não aprovada desta vez.',
    'tapply.again': 'Pode enviar outra candidatura.',
    'tapply.withdrawn': 'Retirou a sua candidatura. Pode enviar uma nova.',
    'tapply.closed':
      'As candidaturas estão fechadas de momento, por isso nada pode ser enviado a partir desta página. Se quiser ensinar aqui, pergunte ao proprietário.',
    'tapply.formTitle': 'O que o proprietário lê',
    'tapply.fieldTeach': 'O que ensinaria, numa linha?',
    'tapply.hintTeach': 'Por exemplo: tajwid e recitação do Alcorão para crianças.',
    'tapply.fieldKnow': 'O que sabe e com quem o aprendeu',
    'tapply.hintKnow':
      'Por palavras suas. Aqui as qualificações de um professor são verificadas por uma pessoa, por isso escreva o que diria a outro professor: por exemplo uma ijaza e quem a concedeu, os anos em que ensinou e onde.',
    'tapply.fieldSample': 'Uma ligação para uma aula de exemplo',
    'tapply.hintSample':
      'Uma ligação para uma aula que tenha gravado ou transmitido. O proprietário tem de conseguir vê-la. Não é possível enviar um ficheiro aqui.',
    'tapply.fieldElse': 'Mais alguma coisa',
    'tapply.hintElse':
      'Por exemplo as horas em que pode ensinar, o seu fuso horário e as línguas em que ensina.',
    'tapply.sendDo': 'Enviar ao proprietário',
    'tapply.whyTeach': 'Diga em poucas palavras o que ensinaria.',
    'tapply.whyKnow': 'Escreva uma ou duas frases sobre o que sabe e com quem o aprendeu.',
    'tapply.whySample':
      'Essa não é uma ligação que o proprietário consiga abrir. Cole o endereço completo da aula, sem espaços.',
    'tapply.whyLong': 'Uma das caixas tem mais do que consegue conter. Encurte-a e envie de novo.',
    'tapply.whyClosed': 'As candidaturas para ensinar estão fechadas de momento. Nada foi enviado.',
    'tapply.whyApplied': 'Já tem uma candidatura com o proprietário. Aguarde a resposta.',
    'tapply.whyNothing':
      'Não há nenhuma candidatura à espera para retirar. Pode já ter sido respondida.',
  },
  sw: {
    'tapply.byAppointment':
      'Kufundisha hapa ni kwa kuteuliwa. Kutuma hili kunamwomba mmiliki akufikirie. Hakukufanyi kuwa mwalimu, wala hakuundi kozi wala ukurasa. Hakuna unachoandika hapa kinachochapishwa. Ukikubaliwa, kila kozi unayoandika bado hupitiwa kabla mwanafunzi hajaiona.',
    'tapply.asWritten': 'Mmiliki husoma ulichoandika kama ulivyokiandika. Hakitafsiriwi.',
    'tapply.unread':
      'Ombi lako halikuweza kusomwa. Ukurasa huu haukutuma chochote wala haukubadilisha chochote.',
    'tapply.teachesAlready': 'Tayari unafundisha hapa, kwa hiyo hakuna cha kuomba.',
    'tapply.toCourses': 'Nenda kwenye kozi zako',
    'tapply.approved': 'Ombi lako limekubaliwa.',
    'tapply.noteLeft': 'Dokezo uliloachiwa, kama lilivyoandikwa:',
    'tapply.yours': 'Ombi lako',
    'tapply.waiting': 'Liko kwa mmiliki, linasubiri kusomwa',
    'tapply.sentOn': 'Lilitumwa: {date}',
    'tapply.answerHere':
      'Jibu litaonyeshwa kwenye ukurasa huu. Hakuna ujumbe unaotumwa jibu linapofika, kwa hiyo angalia hapa tena.',
    'tapply.sampleLink': 'Somo la mfano ulilotuma',
    'tapply.withdrawDo': 'Ondoa ombi hili',
    'tapply.withdrawNote':
      'Unaweza kuliondoa wakati wowote kabla halijajibiwa. Huhitaji kusema sababu.',
    'tapply.declined': 'Halikukubaliwa safari hii.',
    'tapply.again': 'Unaweza kutuma ombi jingine.',
    'tapply.withdrawn': 'Umeondoa ombi lako. Unaweza kutuma jipya.',
    'tapply.closed':
      'Maombi yamefungwa kwa sasa, kwa hiyo hakuna kinachoweza kutumwa kutoka ukurasa huu. Ukitaka kufundisha hapa, muulize mmiliki.',
    'tapply.formTitle': 'Anachosoma mmiliki',
    'tapply.fieldTeach': 'Ungefundisha nini, kwa mstari mmoja?',
    'tapply.hintTeach': 'Kwa mfano: tajwidi na usomaji wa Kurani kwa watoto.',
    'tapply.fieldKnow': 'Unachokijua, na ulijifunza kwa nani',
    'tapply.hintKnow':
      'Kwa maneno yako mwenyewe. Hapa sifa za mwalimu hukaguliwa na mtu, kwa hiyo andika kile ambacho ungemwambia mwalimu mwingine: kwa mfano ijaza na aliyeitoa, miaka uliyofundisha, na wapi.',
    'tapply.fieldSample': 'Kiungo cha somo la mfano',
    'tapply.hintSample':
      'Kiungo cha somo ulilorekodi au kurusha. Lazima mmiliki aweze kulitazama. Faili haiwezi kupakiwa hapa.',
    'tapply.fieldElse': 'Jambo jingine lolote',
    'tapply.hintElse':
      'Kwa mfano saa unazoweza kufundisha, saa za eneo lako na lugha unazofundishia.',
    'tapply.sendDo': 'Tuma kwa mmiliki',
    'tapply.whyTeach': 'Sema ungefundisha nini, kwa maneno machache.',
    'tapply.whyKnow': 'Andika sentensi moja au mbili kuhusu unachokijua na ulijifunza kwa nani.',
    'tapply.whySample':
      'Hicho si kiungo ambacho mmiliki anaweza kufungua. Bandika anwani kamili ya somo, bila nafasi.',
    'tapply.whyLong':
      'Kisanduku kimojawapo kina zaidi ya kinachoweza kubeba. Kifupishe kisha utume tena.',
    'tapply.whyClosed': 'Maombi ya kufundisha yamefungwa kwa sasa. Hakuna kilichotumwa.',
    'tapply.whyApplied': 'Tayari una ombi kwa mmiliki. Subiri jibu.',
    'tapply.whyNothing': 'Hakuna ombi linalosubiri la kuondoa. Huenda limeshajibiwa.',
  },
  af: {
    'tapply.byAppointment':
      'Onderrig hier is deur aanstelling. Deur dit te stuur, vra jy die eienaar om jou te oorweeg. Dit maak jou nie ’n onderwyser nie, en dit skep geen kursus en geen bladsy nie. Niks wat jy hier skryf, word gepubliseer nie. As jy goedgekeur word, word elke kursus wat jy skryf steeds nagegaan voordat ’n leerder dit sien.',
    'tapply.asWritten':
      'Die eienaar lees wat jy skryf soos jy dit geskryf het. Dit word nie vertaal nie.',
    'tapply.unread':
      'Jou aansoek kon nie gelees word nie. Hierdie bladsy het niks gestuur en niks verander nie.',
    'tapply.teachesAlready':
      'Jy gee reeds hier onderrig, so daar is niks om voor aansoek te doen nie.',
    'tapply.toCourses': 'Gaan na jou kursusse',
    'tapply.approved': 'Jou aansoek is goedgekeur.',
    'tapply.noteLeft': 'Die nota wat vir jou gelaat is, soos dit geskryf is:',
    'tapply.yours': 'Jou aansoek',
    'tapply.waiting': 'By die eienaar, wag om gelees te word',
    'tapply.sentOn': 'Gestuur op: {date}',
    'tapply.answerHere':
      'Die antwoord sal op hierdie bladsy gewys word. Geen boodskap word gestuur wanneer dit kom nie, so kyk weer hier.',
    'tapply.sampleLink': 'Die voorbeeldles wat jy gestuur het',
    'tapply.withdrawDo': 'Trek hierdie aansoek terug',
    'tapply.withdrawNote':
      'Jy kan dit enige tyd terugtrek voordat dit beantwoord word. Jy hoef nie te sê hoekom nie.',
    'tapply.declined': 'Hierdie keer nie goedgekeur nie.',
    'tapply.again': 'Jy kan nog ’n aansoek stuur.',
    'tapply.withdrawn': 'Jy het jou aansoek teruggetrek. Jy kan ’n nuwe een stuur.',
    'tapply.closed':
      'Aansoeke is op die oomblik gesluit, so niks kan van hierdie bladsy af gestuur word nie. As jy hier wil onderrig gee, vra die eienaar.',
    'tapply.formTitle': 'Wat die eienaar lees',
    'tapply.fieldTeach': 'Wat sou jy onderrig, in een reël?',
    'tapply.hintTeach': 'Byvoorbeeld: tadjwied en Koranvoordrag vir kinders.',
    'tapply.fieldKnow': 'Wat jy weet, en by wie jy dit geleer het',
    'tapply.hintKnow':
      'In jou eie woorde. Hier gaan ’n mens ’n onderwyser se kwalifikasies na, so skryf wat jy vir ’n ander onderwyser sou sê: byvoorbeeld ’n idjaza en wie dit gegee het, hoeveel jaar jy onderrig gegee het, en waar.',
    'tapply.fieldSample': '’n Skakel na ’n voorbeeldles',
    'tapply.hintSample':
      '’n Skakel na ’n les wat jy opgeneem of uitgesaai het. Die eienaar moet daarna kan kyk. ’n Lêer kan nie hier opgelaai word nie.',
    'tapply.fieldElse': 'Enigiets anders',
    'tapply.hintElse':
      'Byvoorbeeld die ure waarin jy kan onderrig gee, jou tydsone en die tale waarin jy onderrig gee.',
    'tapply.sendDo': 'Stuur aan die eienaar',
    'tapply.whyTeach': 'Sê in ’n paar woorde wat jy sou onderrig.',
    'tapply.whyKnow': 'Skryf ’n sin of twee oor wat jy weet en by wie jy dit geleer het.',
    'tapply.whySample':
      'Dit is nie ’n skakel wat die eienaar kan oopmaak nie. Plak die volledige adres van die les, sonder spasies.',
    'tapply.whyLong':
      'Een van die blokkies bevat meer as wat dit kan hou. Verkort dit en stuur weer.',
    'tapply.whyClosed': 'Aansoeke om te onderrig is op die oomblik gesluit. Niks is gestuur nie.',
    'tapply.whyApplied': 'Jy het reeds ’n aansoek by die eienaar. Wag vir die antwoord.',
    'tapply.whyNothing':
      'Daar is geen aansoek wat wag om teruggetrek te word nie. Dit is dalk reeds beantwoord.',
  },
  'zh-hans': {
    'tapply.byAppointment':
      '在这里任教须经任命。提交本申请只是请所有者考虑你。它不会让你成为教师，也不会创建任何课程或页面。你在这里写的内容都不会公开。即使获得批准，你写的每门课程在学习者看到之前仍须经过审核。',
    'tapply.asWritten': '所有者会按你写的原样阅读，不会翻译。',
    'tapply.unread': '无法读取你的申请。本页面没有发送任何内容，也没有更改任何内容。',
    'tapply.teachesAlready': '你已经在这里任教，所以无需申请。',
    'tapply.toCourses': '前往你的课程',
    'tapply.approved': '你的申请已获批准。',
    'tapply.noteLeft': '留给你的说明，按原文显示：',
    'tapply.yours': '你的申请',
    'tapply.waiting': '已交给所有者，等待阅读',
    'tapply.sentOn': '提交时间：{date}',
    'tapply.answerHere': '答复会显示在本页面。答复到来时不会发送消息，所以请回到这里查看。',
    'tapply.sampleLink': '你提交的示范课',
    'tapply.withdrawDo': '撤回这份申请',
    'tapply.withdrawNote': '在得到答复之前，你可以随时撤回，不必说明原因。',
    'tapply.declined': '这次未获批准。',
    'tapply.again': '你可以再提交一份申请。',
    'tapply.withdrawn': '你已撤回申请。你可以提交一份新的。',
    'tapply.closed': '目前不接受申请，所以无法从本页面提交任何内容。如果你想在这里任教，请询问所有者。',
    'tapply.formTitle': '所有者会读到的内容',
    'tapply.fieldTeach': '用一行说明你想教什么',
    'tapply.hintTeach': '例如：面向儿童的泰吉威德和古兰经诵读。',
    'tapply.fieldKnow': '你掌握什么，以及师从何人',
    'tapply.hintKnow': '用你自己的话写。这里的教师资历由人来核实，所以请写下你会对另一位教师说的话：例如一份伊扎泽及其授予者、你任教的年数和地点。',
    'tapply.fieldSample': '示范课的链接',
    'tapply.hintSample': '一节你录制或直播过的课的链接。所有者必须能够观看。这里不能上传文件。',
    'tapply.fieldElse': '其他内容',
    'tapply.hintElse': '例如你可以授课的时间、你的时区和你授课使用的语言。',
    'tapply.sendDo': '提交给所有者',
    'tapply.whyTeach': '请用几个词说明你想教什么。',
    'tapply.whyKnow': '请用一两句话写下你掌握什么以及师从何人。',
    'tapply.whySample': '这不是所有者能够打开的链接。请粘贴这节课的完整地址，中间不要有空格。',
    'tapply.whyLong': '有一个输入框里的内容超出了它能容纳的长度。请缩短后重新提交。',
    'tapply.whyClosed': '目前不接受任教申请。没有提交任何内容。',
    'tapply.whyApplied': '你已有一份申请在所有者那里。请等待答复。',
    'tapply.whyNothing': '没有等待中的申请可以撤回。它可能已经得到答复。',
  },
  'zh-hant': {
    'tapply.byAppointment':
      '在這裡任教須經任命。提交本申請只是請擁有者考慮你。它不會讓你成為教師，也不會建立任何課程或頁面。你在這裡寫的內容都不會公開。即使獲得批准，你寫的每門課程在學習者看到之前仍須經過審核。',
    'tapply.asWritten': '擁有者會按你寫的原樣閱讀，不會翻譯。',
    'tapply.unread': '無法讀取你的申請。本頁面沒有傳送任何內容，也沒有更改任何內容。',
    'tapply.teachesAlready': '你已經在這裡任教，所以無需申請。',
    'tapply.toCourses': '前往你的課程',
    'tapply.approved': '你的申請已獲批准。',
    'tapply.noteLeft': '留給你的說明，按原文顯示：',
    'tapply.yours': '你的申請',
    'tapply.waiting': '已交給擁有者，等待閱讀',
    'tapply.sentOn': '提交時間：{date}',
    'tapply.answerHere': '答覆會顯示在本頁面。答覆到來時不會傳送訊息，所以請回到這裡查看。',
    'tapply.sampleLink': '你提交的示範課',
    'tapply.withdrawDo': '撤回這份申請',
    'tapply.withdrawNote': '在得到答覆之前，你可以隨時撤回，不必說明原因。',
    'tapply.declined': '這次未獲批准。',
    'tapply.again': '你可以再提交一份申請。',
    'tapply.withdrawn': '你已撤回申請。你可以提交一份新的。',
    'tapply.closed': '目前不接受申請，所以無法從本頁面提交任何內容。如果你想在這裡任教，請詢問擁有者。',
    'tapply.formTitle': '擁有者會讀到的內容',
    'tapply.fieldTeach': '用一行說明你想教什麼',
    'tapply.hintTeach': '例如：面向兒童的泰吉威德和古蘭經誦讀。',
    'tapply.fieldKnow': '你掌握什麼，以及師從何人',
    'tapply.hintKnow': '用你自己的話寫。這裡的教師資歷由人來核實，所以請寫下你會對另一位教師說的話：例如一份伊扎澤及其授予者、你任教的年數和地點。',
    'tapply.fieldSample': '示範課的連結',
    'tapply.hintSample': '一堂你錄製或直播過的課的連結。擁有者必須能夠觀看。這裡不能上傳檔案。',
    'tapply.fieldElse': '其他內容',
    'tapply.hintElse': '例如你可以授課的時間、你的時區和你授課使用的語言。',
    'tapply.sendDo': '提交給擁有者',
    'tapply.whyTeach': '請用幾個詞說明你想教什麼。',
    'tapply.whyKnow': '請用一兩句話寫下你掌握什麼以及師從何人。',
    'tapply.whySample': '這不是擁有者能夠打開的連結。請貼上這堂課的完整網址，中間不要有空格。',
    'tapply.whyLong': '有一個輸入框裡的內容超出了它能容納的長度。請縮短後重新提交。',
    'tapply.whyClosed': '目前不接受任教申請。沒有提交任何內容。',
    'tapply.whyApplied': '你已有一份申請在擁有者那裡。請等待答覆。',
    'tapply.whyNothing': '沒有等待中的申請可以撤回。它可能已經得到答覆。',
  },
  vi: {
    'tapply.byAppointment':
      'Việc giảng dạy ở đây là theo bổ nhiệm. Gửi đơn này là đề nghị chủ sở hữu xem xét bạn. Việc đó không biến bạn thành giáo viên, cũng không tạo ra khoá học hay trang nào. Không có gì bạn viết ở đây được công bố. Nếu bạn được chấp thuận, mỗi khoá học bạn viết vẫn được thẩm định trước khi người học nhìn thấy.',
    'tapply.asWritten':
      'Chủ sở hữu đọc những gì bạn viết đúng như bạn đã viết. Nội dung không được dịch.',
    'tapply.unread': 'Không đọc được đơn của bạn. Trang này không gửi gì và không thay đổi gì.',
    'tapply.teachesAlready': 'Bạn đã giảng dạy ở đây rồi, nên không có gì để đăng ký.',
    'tapply.toCourses': 'Đến các khoá học của bạn',
    'tapply.approved': 'Đơn của bạn đã được chấp thuận.',
    'tapply.noteLeft': 'Ghi chú để lại cho bạn, đúng như đã được viết:',
    'tapply.yours': 'Đơn của bạn',
    'tapply.waiting': 'Đang ở chỗ chủ sở hữu, chờ được đọc',
    'tapply.sentOn': 'Đã gửi vào: {date}',
    'tapply.answerHere':
      'Câu trả lời sẽ được hiển thị trên trang này. Không có tin nhắn nào được gửi khi có câu trả lời, nên hãy quay lại đây để xem.',
    'tapply.sampleLink': 'Bài học mẫu bạn đã gửi',
    'tapply.withdrawDo': 'Rút lại đơn này',
    'tapply.withdrawNote':
      'Bạn có thể rút lại bất cứ lúc nào trước khi đơn được trả lời. Bạn không cần nêu lý do.',
    'tapply.declined': 'Lần này chưa được chấp thuận.',
    'tapply.again': 'Bạn có thể gửi một đơn khác.',
    'tapply.withdrawn': 'Bạn đã rút lại đơn của mình. Bạn có thể gửi đơn mới.',
    'tapply.closed':
      'Hiện không nhận đơn, nên không thể gửi gì từ trang này. Nếu bạn muốn giảng dạy ở đây, hãy hỏi chủ sở hữu.',
    'tapply.formTitle': 'Những gì chủ sở hữu đọc',
    'tapply.fieldTeach': 'Bạn sẽ dạy gì, trong một dòng?',
    'tapply.hintTeach': 'Ví dụ: tajwid và đọc Kinh Quran cho trẻ em.',
    'tapply.fieldKnow': 'Bạn biết gì, và đã học từ ai',
    'tapply.hintKnow':
      'Bằng lời của chính bạn. Ở đây trình độ của giáo viên do một con người kiểm tra, nên hãy viết điều bạn sẽ nói với một giáo viên khác: ví dụ một ijazah và ai đã cấp, số năm bạn đã dạy, và ở đâu.',
    'tapply.fieldSample': 'Liên kết đến một bài học mẫu',
    'tapply.hintSample':
      'Liên kết đến một bài học bạn đã ghi hình hoặc phát trực tiếp. Chủ sở hữu phải xem được bài đó. Không thể tải tệp lên ở đây.',
    'tapply.fieldElse': 'Điều gì khác',
    'tapply.hintElse':
      'Ví dụ những giờ bạn có thể dạy, múi giờ của bạn và các ngôn ngữ bạn dùng để dạy.',
    'tapply.sendDo': 'Gửi cho chủ sở hữu',
    'tapply.whyTeach': 'Hãy nói bạn sẽ dạy gì, bằng vài từ.',
    'tapply.whyKnow': 'Hãy viết một hai câu về điều bạn biết và bạn đã học từ ai.',
    'tapply.whySample':
      'Đó không phải là liên kết mà chủ sở hữu mở được. Hãy dán toàn bộ địa chỉ của bài học, không có khoảng trắng.',
    'tapply.whyLong':
      'Một trong các ô chứa nhiều hơn mức ô đó nhận được. Hãy rút ngắn rồi gửi lại.',
    'tapply.whyClosed': 'Hiện không nhận đơn đăng ký giảng dạy. Không có gì được gửi.',
    'tapply.whyApplied': 'Bạn đã có một đơn ở chỗ chủ sở hữu. Hãy chờ câu trả lời.',
    'tapply.whyNothing': 'Không có đơn nào đang chờ để rút lại. Có thể đơn đã được trả lời.',
  },
  th: {
    'tapply.byAppointment':
      'การสอนที่นี่เป็นไปโดยการแต่งตั้ง การส่งคำขอนี้เป็นการขอให้เจ้าของพิจารณาคุณ ไม่ได้ทำให้คุณเป็นครู และไม่ได้สร้างหลักสูตรหรือหน้าใด ๆ สิ่งที่คุณเขียนที่นี่จะไม่ถูกเผยแพร่ หากคุณได้รับอนุมัติ ทุกหลักสูตรที่คุณเขียนยังคงต้องผ่านการตรวจประเมินก่อนที่ผู้เรียนจะเห็น',
    'tapply.asWritten': 'เจ้าของจะอ่านสิ่งที่คุณเขียนตามที่คุณเขียนไว้ โดยไม่มีการแปล',
    'tapply.unread': 'อ่านคำขอของคุณไม่ได้ หน้านี้ไม่ได้ส่งอะไรและไม่ได้เปลี่ยนแปลงอะไร',
    'tapply.teachesAlready': 'คุณสอนที่นี่อยู่แล้ว จึงไม่มีอะไรให้สมัคร',
    'tapply.toCourses': 'ไปที่หลักสูตรของคุณ',
    'tapply.approved': 'คำขอของคุณได้รับอนุมัติแล้ว',
    'tapply.noteLeft': 'บันทึกที่ฝากไว้ให้คุณ ตามที่เขียนไว้:',
    'tapply.yours': 'คำขอของคุณ',
    'tapply.waiting': 'อยู่ที่เจ้าของ รอการอ่าน',
    'tapply.sentOn': 'ส่งเมื่อ: {date}',
    'tapply.answerHere':
      'คำตอบจะแสดงในหน้านี้ จะไม่มีข้อความส่งมาเมื่อมีคำตอบ โปรดกลับมาดูที่นี่อีกครั้ง',
    'tapply.sampleLink': 'บทเรียนตัวอย่างที่คุณส่ง',
    'tapply.withdrawDo': 'ถอนคำขอนี้',
    'tapply.withdrawNote': 'คุณถอนได้ทุกเมื่อก่อนที่จะได้รับคำตอบ และไม่จำเป็นต้องบอกเหตุผล',
    'tapply.declined': 'ครั้งนี้ยังไม่ได้รับอนุมัติ',
    'tapply.again': 'คุณส่งคำขออีกฉบับได้',
    'tapply.withdrawn': 'คุณถอนคำขอของคุณแล้ว คุณส่งฉบับใหม่ได้',
    'tapply.closed':
      'ขณะนี้ปิดรับคำขอ จึงส่งอะไรจากหน้านี้ไม่ได้ หากคุณต้องการสอนที่นี่ โปรดสอบถามเจ้าของ',
    'tapply.formTitle': 'สิ่งที่เจ้าของจะอ่าน',
    'tapply.fieldTeach': 'คุณจะสอนอะไร ในหนึ่งบรรทัด',
    'tapply.hintTeach': 'ตัวอย่างเช่น: ตัจวีดและการอ่านอัลกุรอานสำหรับเด็ก',
    'tapply.fieldKnow': 'สิ่งที่คุณรู้ และคุณเรียนมาจากใคร',
    'tapply.hintKnow':
      'เขียนด้วยคำของคุณเอง ที่นี่คุณวุฒิของครูตรวจสอบโดยคน จึงขอให้เขียนสิ่งที่คุณจะบอกครูอีกคนหนึ่ง: เช่น อิญาซะฮ์และผู้ที่มอบให้ จำนวนปีที่คุณสอน และสอนที่ใด',
    'tapply.fieldSample': 'ลิงก์ไปยังบทเรียนตัวอย่าง',
    'tapply.hintSample':
      'ลิงก์ไปยังบทเรียนที่คุณเคยบันทึกหรือถ่ายทอดสด เจ้าของต้องรับชมได้ ที่นี่อัปโหลดไฟล์ไม่ได้',
    'tapply.fieldElse': 'เรื่องอื่น ๆ',
    'tapply.hintElse': 'เช่น ช่วงเวลาที่คุณสอนได้ เขตเวลาของคุณ และภาษาที่คุณใช้สอน',
    'tapply.sendDo': 'ส่งถึงเจ้าของ',
    'tapply.whyTeach': 'โปรดบอกสั้น ๆ ว่าคุณจะสอนอะไร',
    'tapply.whyKnow': 'โปรดเขียนหนึ่งหรือสองประโยคว่าคุณรู้อะไรและเรียนมาจากใคร',
    'tapply.whySample':
      'นี่ไม่ใช่ลิงก์ที่เจ้าของเปิดได้ โปรดวางที่อยู่เต็มของบทเรียนโดยไม่มีช่องว่าง',
    'tapply.whyLong': 'มีช่องหนึ่งที่ใส่ข้อความเกินกว่าที่รับได้ โปรดย่อให้สั้นลงแล้วส่งอีกครั้ง',
    'tapply.whyClosed': 'ขณะนี้ปิดรับคำขอเป็นผู้สอน ยังไม่มีการส่งอะไร',
    'tapply.whyApplied': 'คุณมีคำขออยู่ที่เจ้าของแล้ว โปรดรอคำตอบ',
    'tapply.whyNothing': 'ไม่มีคำขอที่รออยู่ให้ถอน อาจได้รับคำตอบไปแล้ว',
  },
  fil: {
    'tapply.byAppointment':
      'Ang pagtuturo rito ay sa pamamagitan ng paghirang. Ang pagpapadala nito ay humihiling sa may-ari na isaalang-alang ka. Hindi ka nito ginagawang guro, at wala itong ginagawang kurso o pahina. Walang nailalathala sa anumang isinusulat mo rito. Kung maaprubahan ka, sinusuri pa rin ang bawat kursong isusulat mo bago ito makita ng mag-aaral.',
    'tapply.asWritten':
      'Binabasa ng may-ari ang isinulat mo ayon sa pagkakasulat mo. Hindi ito isinasalin.',
    'tapply.unread':
      'Hindi mabasa ang iyong aplikasyon. Walang ipinadala at walang binago ang pahinang ito.',
    'tapply.teachesAlready': 'Nagtuturo ka na rito, kaya wala nang kailangang i-apply.',
    'tapply.toCourses': 'Pumunta sa iyong mga kurso',
    'tapply.approved': 'Naaprubahan ang iyong aplikasyon.',
    'tapply.noteLeft': 'Ang talang iniwan para sa iyo, ayon sa pagkakasulat:',
    'tapply.yours': 'Ang iyong aplikasyon',
    'tapply.waiting': 'Nasa may-ari, naghihintay na mabasa',
    'tapply.sentOn': 'Ipinadala noong: {date}',
    'tapply.answerHere':
      'Ipapakita ang sagot sa pahinang ito. Walang mensaheng ipinapadala kapag dumating ito, kaya tumingin ulit dito.',
    'tapply.sampleLink': 'Ang halimbawang aralin na ipinadala mo',
    'tapply.withdrawDo': 'Bawiin ang aplikasyong ito',
    'tapply.withdrawNote':
      'Maaari mo itong bawiin anumang oras bago ito masagot. Hindi mo kailangang sabihin kung bakit.',
    'tapply.declined': 'Hindi naaprubahan sa pagkakataong ito.',
    'tapply.again': 'Maaari kang magpadala ng isa pang aplikasyon.',
    'tapply.withdrawn': 'Binawi mo ang iyong aplikasyon. Maaari kang magpadala ng bago.',
    'tapply.closed':
      'Sarado ang mga aplikasyon sa ngayon, kaya walang maipapadala mula sa pahinang ito. Kung gusto mong magturo rito, tanungin ang may-ari.',
    'tapply.formTitle': 'Ang binabasa ng may-ari',
    'tapply.fieldTeach': 'Ano ang ituturo mo, sa isang linya?',
    'tapply.hintTeach': 'Halimbawa: tajwid at pagbigkas ng Quran para sa mga bata.',
    'tapply.fieldKnow': 'Ang nalalaman mo, at kung kanino mo ito natutuhan',
    'tapply.hintKnow':
      'Sa sarili mong mga salita. Dito, tao ang sumusuri sa mga kuwalipikasyon ng guro, kaya isulat ang sasabihin mo sa kapwa guro: halimbawa isang ijazah at kung sino ang nagbigay nito, ilang taon ka nang nagtuturo, at kung saan.',
    'tapply.fieldSample': 'Link sa isang halimbawang aralin',
    'tapply.hintSample':
      'Link sa isang araling nai-record o nai-stream mo. Kailangang mapanood ito ng may-ari. Hindi maaaring mag-upload ng file dito.',
    'tapply.fieldElse': 'Iba pang nais sabihin',
    'tapply.hintElse':
      'Halimbawa ang mga oras na maaari kang magturo, ang iyong time zone at ang mga wikang ginagamit mo sa pagtuturo.',
    'tapply.sendDo': 'Ipadala sa may-ari',
    'tapply.whyTeach': 'Sabihin sa ilang salita kung ano ang ituturo mo.',
    'tapply.whyKnow':
      'Sumulat ng isa o dalawang pangungusap tungkol sa nalalaman mo at kung kanino mo ito natutuhan.',
    'tapply.whySample':
      'Hindi iyan link na mabubuksan ng may-ari. I-paste ang buong address ng aralin, nang walang puwang.',
    'tapply.whyLong':
      'Ang isa sa mga kahon ay may lamang higit sa kaya nito. Paikliin ito at ipadala ulit.',
    'tapply.whyClosed': 'Sarado ang mga aplikasyon sa pagtuturo sa ngayon. Walang ipinadala.',
    'tapply.whyApplied': 'May aplikasyon ka na sa may-ari. Hintayin ang sagot.',
    'tapply.whyNothing': 'Walang naghihintay na aplikasyong mababawi. Maaaring nasagot na ito.',
  },
  uz: {
    'tapply.byAppointment':
      'Bu yerda dars berish tayinlov asosida boʻladi. Buni yuborish platforma egasidan sizni koʻrib chiqishni soʻraydi. U sizni oʻqituvchi qilmaydi, hech qanday kurs ham, sahifa ham yaratmaydi. Bu yerda yozganlaringizning hech biri eʼlon qilinmaydi. Tasdiqlansangiz ham, yozgan har bir kursingiz oʻquvchi koʻrishidan oldin taqriz qilinadi.',
    'tapply.asWritten':
      'Platforma egasi yozganingizni qanday yozgan boʻlsangiz, shunday oʻqiydi. U tarjima qilinmaydi.',
    'tapply.unread':
      'Arizangizni oʻqib boʻlmadi. Bu sahifa hech narsa yubormadi va hech narsani oʻzgartirmadi.',
    'tapply.teachesAlready':
      'Siz bu yerda allaqachon dars berasiz, shuning uchun ariza topshirishga hojat yoʻq.',
    'tapply.toCourses': 'Kurslaringizga oʻtish',
    'tapply.approved': 'Arizangiz tasdiqlandi.',
    'tapply.noteLeft': 'Sizga qoldirilgan izoh, qanday yozilgan boʻlsa, shunday:',
    'tapply.yours': 'Arizangiz',
    'tapply.waiting': 'Platforma egasida, oʻqilishini kutmoqda',
    'tapply.sentOn': 'Yuborilgan sana: {date}',
    'tapply.answerHere':
      'Javob shu sahifada koʻrsatiladi. Javob kelganda xabar yuborilmaydi, shuning uchun bu yerga yana qarang.',
    'tapply.sampleLink': 'Siz yuborgan namunaviy dars',
    'tapply.withdrawDo': 'Bu arizani qaytarib olish',
    'tapply.withdrawNote':
      'Javob berilgunga qadar uni istalgan vaqtda qaytarib olishingiz mumkin. Sababini aytish shart emas.',
    'tapply.declined': 'Bu safar tasdiqlanmadi.',
    'tapply.again': 'Yana bir ariza yuborishingiz mumkin.',
    'tapply.withdrawn': 'Arizangizni qaytarib oldingiz. Yangisini yuborishingiz mumkin.',
    'tapply.closed':
      'Arizalar hozircha yopiq, shuning uchun bu sahifadan hech narsa yuborib boʻlmaydi. Bu yerda dars berishni istasangiz, platforma egasidan soʻrang.',
    'tapply.formTitle': 'Platforma egasi nimani oʻqiydi',
    'tapply.fieldTeach': 'Nimani oʻrgatardingiz, bir satrda?',
    'tapply.hintTeach': 'Masalan: bolalar uchun tajvid va Qurʼon tilovati.',
    'tapply.fieldKnow': 'Nimani bilasiz va kimdan oʻrgangansiz',
    'tapply.hintKnow':
      'Oʻz soʻzlaringiz bilan. Bu yerda oʻqituvchining malakasini inson tekshiradi, shuning uchun boshqa oʻqituvchiga nima degan boʻlsangiz, shuni yozing: masalan ijoza va uni kim bergani, necha yil dars berganingiz va qayerda.',
    'tapply.fieldSample': 'Namunaviy dars havolasi',
    'tapply.hintSample':
      'Oʻzingiz yozib olgan yoki jonli efirga uzatgan dars havolasi. Platforma egasi uni tomosha qila olishi kerak. Bu yerga fayl yuklab boʻlmaydi.',
    'tapply.fieldElse': 'Boshqa gaplar',
    'tapply.hintElse':
      'Masalan dars bera oladigan soatlaringiz, vaqt mintaqangiz va qaysi tillarda dars berishingiz.',
    'tapply.sendDo': 'Platforma egasiga yuborish',
    'tapply.whyTeach': 'Nimani oʻrgatishingizni bir necha soʻz bilan ayting.',
    'tapply.whyKnow': 'Nimani bilishingiz va kimdan oʻrganganingiz haqida bir-ikki gap yozing.',
    'tapply.whySample':
      'Bu platforma egasi ocha oladigan havola emas. Darsning toʻliq manzilini boʻsh joylarsiz qoʻying.',
    'tapply.whyLong':
      'Maydonlardan birida sigʻadiganidan koʻp yozilgan. Uni qisqartirib, qayta yuboring.',
    'tapply.whyClosed': 'Dars berishga arizalar hozircha yopiq. Hech narsa yuborilmadi.',
    'tapply.whyApplied': 'Platforma egasida allaqachon arizangiz bor. Javobni kuting.',
    'tapply.whyNothing':
      'Qaytarib olinadigan, kutayotgan ariza yoʻq. Unga allaqachon javob berilgan boʻlishi mumkin.',
  },
  kk: {
    'tapply.byAppointment':
      'Мұнда сабақ беру тағайындау арқылы жүреді. Мұны жіберу платформа иесінен сізді қарастыруды сұрайды. Ол сізді мұғалім етпейді, ешқандай курс та, бет те жасамайды. Мұнда жазғаныңыздың ешқайсысы жарияланбайды. Мақұлдансаңыз да, жазған әр курсыңыз оқушы көрмес бұрын сарапталады.',
    'tapply.asWritten': 'Платформа иесі жазғаныңызды қалай жазсаңыз, солай оқиды. Ол аударылмайды.',
    'tapply.unread':
      'Өтініміңізді оқу мүмкін болмады. Бұл бет ештеңе жіберген жоқ және ештеңені өзгерткен жоқ.',
    'tapply.teachesAlready':
      'Сіз мұнда онсыз да сабақ бересіз, сондықтан өтінім берудің қажеті жоқ.',
    'tapply.toCourses': 'Курстарыңызға өту',
    'tapply.approved': 'Өтініміңіз мақұлданды.',
    'tapply.noteLeft': 'Сізге қалдырылған ескертпе, қалай жазылса, солай:',
    'tapply.yours': 'Өтініміңіз',
    'tapply.waiting': 'Платформа иесінде, оқылуын күтіп тұр',
    'tapply.sentOn': 'Жіберілген күні: {date}',
    'tapply.answerHere':
      'Жауап осы бетте көрсетіледі. Жауап келгенде хабар жіберілмейді, сондықтан мұнда қайта қараңыз.',
    'tapply.sampleLink': 'Сіз жіберген үлгі сабақ',
    'tapply.withdrawDo': 'Бұл өтінімді қайтарып алу',
    'tapply.withdrawNote':
      'Жауап берілгенге дейін оны кез келген уақытта қайтарып ала аласыз. Себебін айту міндетті емес.',
    'tapply.declined': 'Бұл жолы мақұлданбады.',
    'tapply.again': 'Тағы бір өтінім жібере аласыз.',
    'tapply.withdrawn': 'Өтініміңізді қайтарып алдыңыз. Жаңасын жібере аласыз.',
    'tapply.closed':
      'Өтінімдер қазір жабық, сондықтан бұл беттен ештеңе жіберу мүмкін емес. Мұнда сабақ бергіңіз келсе, платформа иесінен сұраңыз.',
    'tapply.formTitle': 'Платформа иесі нені оқиды',
    'tapply.fieldTeach': 'Нені үйретер едіңіз, бір жолмен?',
    'tapply.hintTeach': 'Мысалы: балаларға арналған тәжуид және Құран оқу.',
    'tapply.fieldKnow': 'Нені білесіз және кімнен үйрендіңіз',
    'tapply.hintKnow':
      'Өз сөзіңізбен. Мұнда мұғалімнің біліктілігін адам тексереді, сондықтан басқа мұғалімге не айтар болсаңыз, соны жазыңыз: мысалы ижаза және оны кім бергені, неше жыл сабақ бергеніңіз және қайда.',
    'tapply.fieldSample': 'Үлгі сабақтың сілтемесі',
    'tapply.hintSample':
      'Өзіңіз жазып алған немесе тікелей эфирде өткізген сабақтың сілтемесі. Платформа иесі оны көре алуы керек. Мұнда файл жүктеу мүмкін емес.',
    'tapply.fieldElse': 'Басқа айтарыңыз',
    'tapply.hintElse':
      'Мысалы сабақ бере алатын сағаттарыңыз, уақыт белдеуіңіз және қай тілдерде сабақ беретініңіз.',
    'tapply.sendDo': 'Платформа иесіне жіберу',
    'tapply.whyTeach': 'Нені үйрететініңізді бірнеше сөзбен айтыңыз.',
    'tapply.whyKnow': 'Нені білетініңіз және кімнен үйренгеніңіз туралы бір-екі сөйлем жазыңыз.',
    'tapply.whySample':
      'Бұл платформа иесі аша алатын сілтеме емес. Сабақтың толық мекенжайын бос орынсыз қойыңыз.',
    'tapply.whyLong': 'Өрістердің бірінде сыятынынан көп жазылған. Оны қысқартып, қайта жіберіңіз.',
    'tapply.whyClosed': 'Сабақ беруге өтінімдер қазір жабық. Ештеңе жіберілген жоқ.',
    'tapply.whyApplied': 'Платформа иесінде өтініміңіз онсыз да бар. Жауапты күтіңіз.',
    'tapply.whyNothing':
      'Қайтарып алатын, күтіп тұрған өтінім жоқ. Оған жауап берілген болуы мүмкін.',
  },
  az: {
    'tapply.byAppointment':
      'Burada dərs demək təyinatla olur. Bunu göndərmək platformanın sahibindən sizi nəzərdən keçirməsini xahiş edir. Bu sizi müəllim etmir, heç bir kurs və ya səhifə də yaratmır. Burada yazdıqlarınızın heç biri dərc olunmur. Təsdiqlənsəniz belə, yazdığınız hər kurs öyrənən onu görməzdən əvvəl yenə rəy alır.',
    'tapply.asWritten':
      'Platformanın sahibi yazdıqlarınızı necə yazmısınızsa, elə oxuyur. Tərcümə olunmur.',
    'tapply.unread':
      'Müraciətinizi oxumaq mümkün olmadı. Bu səhifə heç nə göndərmədi və heç nəyi dəyişmədi.',
    'tapply.teachesAlready':
      'Siz artıq burada dərs deyirsiniz, ona görə müraciət etməyə ehtiyac yoxdur.',
    'tapply.toCourses': 'Kurslarınıza keçin',
    'tapply.approved': 'Müraciətiniz təsdiqləndi.',
    'tapply.noteLeft': 'Sizin üçün qoyulmuş qeyd, necə yazılıbsa, elə:',
    'tapply.yours': 'Müraciətiniz',
    'tapply.waiting': 'Platformanın sahibindədir, oxunmağı gözləyir',
    'tapply.sentOn': 'Göndərilmə tarixi: {date}',
    'tapply.answerHere':
      'Cavab bu səhifədə göstəriləcək. Cavab gələndə mesaj göndərilmir, ona görə buraya yenidən baxın.',
    'tapply.sampleLink': 'Göndərdiyiniz nümunə dərs',
    'tapply.withdrawDo': 'Bu müraciəti geri götür',
    'tapply.withdrawNote':
      'Cavab verilənə qədər onu istənilən vaxt geri götürə bilərsiniz. Səbəbini deməyiniz lazım deyil.',
    'tapply.declined': 'Bu dəfə təsdiqlənmədi.',
    'tapply.again': 'Başqa bir müraciət göndərə bilərsiniz.',
    'tapply.withdrawn': 'Müraciətinizi geri götürdünüz. Yenisini göndərə bilərsiniz.',
    'tapply.closed':
      'Müraciətlər hazırda bağlıdır, ona görə bu səhifədən heç nə göndərmək olmur. Burada dərs demək istəyirsinizsə, platformanın sahibindən soruşun.',
    'tapply.formTitle': 'Platformanın sahibi nəyi oxuyur',
    'tapply.fieldTeach': 'Nəyi öyrədərdiniz, bir sətirdə?',
    'tapply.hintTeach': 'Məsələn: uşaqlar üçün təcvid və Quran tilavəti.',
    'tapply.fieldKnow': 'Nəyi bilirsiniz və kimdən öyrənmisiniz',
    'tapply.hintKnow':
      'Öz sözlərinizlə. Burada müəllimin ixtisas sənədlərini insan yoxlayır, ona görə başqa bir müəllimə nə deyərdinizsə, onu yazın: məsələn icazə və onu kimin verdiyi, neçə il dərs dediyiniz və harada.',
    'tapply.fieldSample': 'Nümunə dərsin keçidi',
    'tapply.hintSample':
      'Yazdığınız və ya canlı yayımladığınız bir dərsin keçidi. Platformanın sahibi ona baxa bilməlidir. Buraya fayl yükləmək olmur.',
    'tapply.fieldElse': 'Başqa bir şey',
    'tapply.hintElse':
      'Məsələn dərs deyə biləcəyiniz saatlar, saat qurşağınız və hansı dillərdə dərs dediyiniz.',
    'tapply.sendDo': 'Platformanın sahibinə göndər',
    'tapply.whyTeach': 'Nəyi öyrədəcəyinizi bir neçə sözlə deyin.',
    'tapply.whyKnow': 'Nəyi bildiyiniz və kimdən öyrəndiyiniz barədə bir-iki cümlə yazın.',
    'tapply.whySample':
      'Bu, platformanın sahibinin aça biləcəyi keçid deyil. Dərsin tam ünvanını boşluqsuz yapışdırın.',
    'tapply.whyLong': 'Xanalardan birində tutduğundan çox yazılıb. Onu qısaldıb yenidən göndərin.',
    'tapply.whyClosed': 'Dərs demək üçün müraciətlər hazırda bağlıdır. Heç nə göndərilmədi.',
    'tapply.whyApplied': 'Platformanın sahibində artıq müraciətiniz var. Cavabı gözləyin.',
    'tapply.whyNothing':
      'Geri götürüləcək, gözləyən müraciət yoxdur. Ola bilsin, ona artıq cavab verilib.',
  },
  tg: {
    'tapply.byAppointment':
      'Дар ин ҷо дарс додан бо таъинот аст. Фиристодани ин аз соҳиб хоҳиш мекунад, ки шуморо баррасӣ кунад. Ин шуморо муаллим намекунад ва ҳеҷ курс ё саҳифае намесозад. Ҳеҷ чизе, ки дар ин ҷо менависед, нашр намешавад. Агар тасдиқ шавед, ҳар курсе, ки менависед, пеш аз он ки омӯзанда онро бинад, боз баррасӣ мешавад.',
    'tapply.asWritten':
      'Соҳиб навиштаи шуморо ҳамон тавре ки навиштаед, мехонад. Он тарҷума намешавад.',
    'tapply.unread':
      'Аризаи шуморо хондан муяссар нашуд. Ин саҳифа чизе нафиристод ва чизеро тағйир надод.',
    'tapply.teachesAlready':
      'Шумо аллакай дар ин ҷо дарс медиҳед, бинобар ин барои ариза додан чизе нест.',
    'tapply.toCourses': 'Ба курсҳои худ гузаред',
    'tapply.approved': 'Аризаи шумо тасдиқ шуд.',
    'tapply.noteLeft': 'Ёддоште, ки барои шумо гузошта шудааст, ҳамон тавре ки навишта шудааст:',
    'tapply.yours': 'Аризаи шумо',
    'tapply.waiting': 'Назди соҳиб аст, мунтазири хонда шудан',
    'tapply.sentOn': 'Фиристода шуд: {date}',
    'tapply.answerHere':
      'Ҷавоб дар ҳамин саҳифа нишон дода мешавад. Ҳангоми омадани ҷавоб паём фиристода намешавад, бинобар ин ба ин ҷо боз нигаред.',
    'tapply.sampleLink': 'Дарси намунавие, ки фиристодед',
    'tapply.withdrawDo': 'Ин аризаро бозпас гиред',
    'tapply.withdrawNote':
      'То ҷавоб дода шудан онро ҳар вақт бозпас гирифта метавонед. Гуфтани сабаб шарт нест.',
    'tapply.declined': 'Ин дафъа тасдиқ нашуд.',
    'tapply.again': 'Шумо метавонед аризаи дигар фиристед.',
    'tapply.withdrawn': 'Шумо аризаи худро бозпас гирифтед. Метавонед аризаи нав фиристед.',
    'tapply.closed':
      'Аризаҳо ҳоло бастаанд, бинобар ин аз ин саҳифа чизе фиристода намешавад. Агар дар ин ҷо дарс додан хоҳед, аз соҳиб пурсед.',
    'tapply.formTitle': 'Он чи соҳиб мехонад',
    'tapply.fieldTeach': 'Чиро меомӯзондед, дар як сатр?',
    'tapply.hintTeach': 'Масалан: таҷвид ва тиловати Қуръон барои кӯдакон.',
    'tapply.fieldKnow': 'Чиро медонед ва аз кӣ омӯхтаед',
    'tapply.hintKnow':
      'Бо суханони худатон. Дар ин ҷо тахассуси муаллимро инсон месанҷад, бинобар ин ҳамон чизеро нависед, ки ба муаллими дигар мегуфтед: масалан иҷоза ва кӣ онро додааст, чанд сол дарс додаед ва дар куҷо.',
    'tapply.fieldSample': 'Пайванди дарси намунавӣ',
    'tapply.hintSample':
      'Пайванди дарсе, ки сабт ё мустақиман пахш кардаед. Соҳиб бояд онро тамошо карда тавонад. Дар ин ҷо файл боргузорӣ кардан мумкин нест.',
    'tapply.fieldElse': 'Чизи дигар',
    'tapply.hintElse':
      'Масалан соатҳое, ки дарс дода метавонед, минтақаи вақти шумо ва забонҳое, ки бо онҳо дарс медиҳед.',
    'tapply.sendDo': 'Ба соҳиб фиристед',
    'tapply.whyTeach': 'Бо чанд калима гӯед, ки чиро меомӯзонед.',
    'tapply.whyKnow': 'Як-ду ҷумла нависед, ки чиро медонед ва аз кӣ омӯхтаед.',
    'tapply.whySample':
      'Ин пайванде нест, ки соҳиб кушода тавонад. Суроғаи пурраи дарсро бе фосила гузоред.',
    'tapply.whyLong':
      'Дар яке аз майдонҳо аз ғунҷоишаш бештар навишта шудааст. Онро кӯтоҳ карда, дубора фиристед.',
    'tapply.whyClosed': 'Аризаҳо барои дарс додан ҳоло бастаанд. Чизе фиристода нашуд.',
    'tapply.whyApplied': 'Шумо аллакай назди соҳиб ариза доред. Мунтазири ҷавоб шавед.',
    'tapply.whyNothing':
      'Аризаи мунтазире нест, ки бозпас гиред. Шояд ба он аллакай ҷавоб дода шуда бошад.',
  },
  ky: {
    'tapply.byAppointment':
      'Бул жерде сабак берүү дайындоо аркылуу болот. Муну жөнөтүү платформанын ээсинен сизди карап чыгууну суранат. Ал сизди мугалим кылбайт, эч кандай курс да, барак да түзбөйт. Бул жерде жазгандарыңыздын эч бири жарыяланбайт. Жактырылсаңыз да, жазган ар бир курсуңуз окуучу көргөнгө чейин рецензияланат.',
    'tapply.asWritten':
      'Платформанын ээси жазганыңызды кандай жазсаңыз, ошондой окуйт. Ал которулбайт.',
    'tapply.unread':
      'Арызыңызды окуу мүмкүн болгон жок. Бул барак эч нерсе жөнөткөн жок жана эч нерсени өзгөрткөн жок.',
    'tapply.teachesAlready':
      'Сиз бул жерде ансыз да сабак бересиз, ошондуктан арыз берүүнүн кереги жок.',
    'tapply.toCourses': 'Курстарыңызга өтүү',
    'tapply.approved': 'Арызыңыз жактырылды.',
    'tapply.noteLeft': 'Сизге калтырылган эскертме, кандай жазылса, ошондой:',
    'tapply.yours': 'Арызыңыз',
    'tapply.waiting': 'Платформанын ээсинде, окулушун күтүп турат',
    'tapply.sentOn': 'Жөнөтүлгөн күнү: {date}',
    'tapply.answerHere':
      'Жооп ушул баракта көрсөтүлөт. Жооп келгенде билдирүү жөнөтүлбөйт, ошондуктан бул жерди кайра караңыз.',
    'tapply.sampleLink': 'Сиз жөнөткөн үлгү сабак',
    'tapply.withdrawDo': 'Бул арызды кайтарып алуу',
    'tapply.withdrawNote':
      'Жооп берилгенге чейин аны каалаган убакта кайтарып ала аласыз. Себебин айтуу милдеттүү эмес.',
    'tapply.declined': 'Бул жолу жактырылган жок.',
    'tapply.again': 'Дагы бир арыз жөнөтө аласыз.',
    'tapply.withdrawn': 'Арызыңызды кайтарып алдыңыз. Жаңысын жөнөтө аласыз.',
    'tapply.closed':
      'Арыздар азыр жабык, ошондуктан бул барактан эч нерсе жөнөтүү мүмкүн эмес. Бул жерде сабак бергиңиз келсе, платформанын ээсинен сураңыз.',
    'tapply.formTitle': 'Платформанын ээси эмнени окуйт',
    'tapply.fieldTeach': 'Эмнени үйрөтмөксүз, бир сап менен?',
    'tapply.hintTeach': 'Мисалы: балдар үчүн тажвид жана Куран окуу.',
    'tapply.fieldKnow': 'Эмнени билесиз жана кимден үйрөндүңүз',
    'tapply.hintKnow':
      'Өз сөзүңүз менен. Бул жерде мугалимдин квалификациясын адам текшерет, ошондуктан башка мугалимге эмне айтмаксыз, ошону жазыңыз: мисалы ижаза жана аны ким бергени, канча жыл сабак бергениңиз жана кайда.',
    'tapply.fieldSample': 'Үлгү сабактын шилтемеси',
    'tapply.hintSample':
      'Өзүңүз жаздырган же түз эфирде өткөргөн сабактын шилтемеси. Платформанын ээси аны көрө алышы керек. Бул жерге файл жүктөө мүмкүн эмес.',
    'tapply.fieldElse': 'Башка айтарыңыз',
    'tapply.hintElse':
      'Мисалы сабак бере ала турган сааттарыңыз, убакыт алкагыңыз жана кайсы тилдерде сабак бересиз.',
    'tapply.sendDo': 'Платформанын ээсине жөнөтүү',
    'tapply.whyTeach': 'Эмнени үйрөтөрүңүздү бир нече сөз менен айтыңыз.',
    'tapply.whyKnow': 'Эмнени билериңиз жана кимден үйрөнгөнүңүз тууралуу бир-эки сүйлөм жазыңыз.',
    'tapply.whySample':
      'Бул платформанын ээси ача ала турган шилтеме эмес. Сабактын толук дарегин боштуксуз коюңуз.',
    'tapply.whyLong':
      'Талаалардын биринде бата турганынан көп жазылган. Аны кыскартып, кайра жөнөтүңүз.',
    'tapply.whyClosed': 'Сабак берүүгө арыздар азыр жабык. Эч нерсе жөнөтүлгөн жок.',
    'tapply.whyApplied': 'Платформанын ээсинде арызыңыз ансыз да бар. Жоопту күтүңүз.',
    'tapply.whyNothing':
      'Кайтарып ала турган, күтүп турган арыз жок. Ага жооп берилген болушу мүмкүн.',
  },
  tk: {
    'tapply.byAppointment':
      'Bu ýerde sapak bermek bellenilmek arkaly bolýar. Muny ibermek platformanyň eýesinden size garamagyny haýyş edýär. Ol sizi mugallym etmeýär, hiç hili kurs-da, sahypa-da döretmeýär. Bu ýerde ýazanlaryňyzyň hiç biri çap edilmeýär. Tassyklansaňyz-da, ýazan her kursuňyz okuwçy görmezden öň ýene barlanýar.',
    'tapply.asWritten':
      'Platformanyň eýesi ýazanyňyzy nähili ýazan bolsaňyz, şeýle okaýar. Ol terjime edilmeýär.',
    'tapply.unread':
      'Ýüz tutmaňyzy okap bolmady. Bu sahypa hiç zat ibermedi we hiç zady üýtgetmedi.',
    'tapply.teachesAlready':
      'Siz bu ýerde eýýäm sapak berýärsiňiz, şonuň üçin ýüz tutmagyň zerurlygy ýok.',
    'tapply.toCourses': 'Kurslaryňyza geçiň',
    'tapply.approved': 'Ýüz tutmaňyz tassyklandy.',
    'tapply.noteLeft': 'Size galdyrylan bellik, nähili ýazylan bolsa, şeýle:',
    'tapply.yours': 'Ýüz tutmaňyz',
    'tapply.waiting': 'Platformanyň eýesinde, okalmagyna garaşýar',
    'tapply.sentOn': 'Iberilen senesi: {date}',
    'tapply.answerHere':
      'Jogap şu sahypada görkeziler. Jogap gelende habar iberilmeýär, şonuň üçin bu ýere ýene serediň.',
    'tapply.sampleLink': 'Iberen nusga sapagyňyz',
    'tapply.withdrawDo': 'Bu ýüz tutmany yzyna al',
    'tapply.withdrawNote':
      'Jogap berilýänçä ony islän wagtyňyz yzyna alyp bilersiňiz. Sebäbini aýtmak hökman däl.',
    'tapply.declined': 'Bu gezek tassyklanmady.',
    'tapply.again': 'Ýene bir ýüz tutma iberip bilersiňiz.',
    'tapply.withdrawn': 'Ýüz tutmaňyzy yzyna aldyňyz. Täzesini iberip bilersiňiz.',
    'tapply.closed':
      'Ýüz tutmalar häzirlikçe ýapyk, şonuň üçin bu sahypadan hiç zat iberip bolmaýar. Bu ýerde sapak bermek isleseňiz, platformanyň eýesinden soraň.',
    'tapply.formTitle': 'Platformanyň eýesi nämäni okaýar',
    'tapply.fieldTeach': 'Nämäni öwrederdiňiz, bir setirde?',
    'tapply.hintTeach': 'Mysal üçin: çagalar üçin tejwit we Gurhan okamak.',
    'tapply.fieldKnow': 'Nämäni bilýärsiňiz we kimden öwrendiňiz',
    'tapply.hintKnow':
      'Öz sözleriňiz bilen. Bu ýerde mugallymyň hünär derejelerini adam barlaýar, şonuň üçin başga bir mugallyma näme diýjek bolsaňyz, şony ýazyň: mysal üçin yjazat we ony kimiň berendigi, näçe ýyl sapak berendigiňiz we nirede.',
    'tapply.fieldSample': 'Nusga sapagyň baglanyşygy',
    'tapply.hintSample':
      'Özüňiz ýazgy eden ýa-da göni ýaýlymda geçiren sapagyňyzyň baglanyşygy. Platformanyň eýesi oňa tomaşa edip bilmelidir. Bu ýere faýl ýükläp bolmaýar.',
    'tapply.fieldElse': 'Başga bir zat',
    'tapply.hintElse':
      'Mysal üçin sapak berip biljek sagatlaryňyz, wagt guşaklygyňyz we haýsy dillerde sapak berýändigiňiz.',
    'tapply.sendDo': 'Platformanyň eýesine iber',
    'tapply.whyTeach': 'Nämäni öwretjekdigiňizi birnäçe söz bilen aýdyň.',
    'tapply.whyKnow': 'Nämäni bilýändigiňiz we kimden öwrenendigiňiz barada bir-iki sözlem ýazyň.',
    'tapply.whySample':
      'Bu platformanyň eýesiniň açyp biljek baglanyşygy däl. Sapagyň doly salgysyny boşluksyz goýuň.',
    'tapply.whyLong':
      'Meýdançalaryň birinde sygýanyndan köp ýazylypdyr. Ony gysgaldyp, täzeden iberiň.',
    'tapply.whyClosed': 'Sapak bermek üçin ýüz tutmalar häzirlikçe ýapyk. Hiç zat iberilmedi.',
    'tapply.whyApplied': 'Platformanyň eýesinde eýýäm ýüz tutmaňyz bar. Jogaba garaşyň.',
    'tapply.whyNothing':
      'Yzyna alar ýaly garaşýan ýüz tutma ýok. Oňa eýýäm jogap berlen bolmagy mümkin.',
  },
  ta: {
    'tapply.byAppointment':
      'இங்கே கற்பித்தல் நியமனத்தின் மூலமே நடக்கிறது. இதை அனுப்புவது உங்களைப் பரிசீலிக்குமாறு உரிமையாளரிடம் கேட்கிறது. இது உங்களை ஆசிரியராக்காது; எந்தப் பாடநெறியையும் பக்கத்தையும் உருவாக்காது. நீங்கள் இங்கே எழுதும் எதுவும் வெளியிடப்படாது. நீங்கள் அங்கீகரிக்கப்பட்டாலும், நீங்கள் எழுதும் ஒவ்வொரு பாடநெறியும் கற்பவர் பார்ப்பதற்கு முன் மதிப்பாய்வு செய்யப்படும்.',
    'tapply.asWritten':
      'நீங்கள் எழுதியதை எழுதியபடியே உரிமையாளர் படிக்கிறார். அது மொழிபெயர்க்கப்படாது.',
    'tapply.unread':
      'உங்கள் விண்ணப்பத்தைப் படிக்க முடியவில்லை. இந்தப் பக்கம் எதையும் அனுப்பவில்லை, எதையும் மாற்றவில்லை.',
    'tapply.teachesAlready':
      'நீங்கள் ஏற்கனவே இங்கே கற்பிக்கிறீர்கள், எனவே விண்ணப்பிக்க எதுவும் இல்லை.',
    'tapply.toCourses': 'உங்கள் பாடநெறிகளுக்குச் செல்க',
    'tapply.approved': 'உங்கள் விண்ணப்பம் அங்கீகரிக்கப்பட்டது.',
    'tapply.noteLeft': 'உங்களுக்காக விடப்பட்ட குறிப்பு, எழுதப்பட்டபடியே:',
    'tapply.yours': 'உங்கள் விண்ணப்பம்',
    'tapply.waiting': 'உரிமையாளரிடம் உள்ளது, படிக்கப்படக் காத்திருக்கிறது',
    'tapply.sentOn': 'அனுப்பிய நாள்: {date}',
    'tapply.answerHere':
      'பதில் இந்தப் பக்கத்தில் காட்டப்படும். பதில் வரும்போது எந்தச் செய்தியும் அனுப்பப்படாது, எனவே இங்கே மீண்டும் பாருங்கள்.',
    'tapply.sampleLink': 'நீங்கள் அனுப்பிய மாதிரிப் பாடம்',
    'tapply.withdrawDo': 'இந்த விண்ணப்பத்தைத் திரும்பப் பெறுக',
    'tapply.withdrawNote':
      'பதில் அளிக்கப்படும் முன் எப்போது வேண்டுமானாலும் இதைத் திரும்பப் பெறலாம். காரணம் சொல்ல வேண்டியதில்லை.',
    'tapply.declined': 'இந்த முறை அங்கீகரிக்கப்படவில்லை.',
    'tapply.again': 'நீங்கள் மற்றொரு விண்ணப்பத்தை அனுப்பலாம்.',
    'tapply.withdrawn':
      'உங்கள் விண்ணப்பத்தைத் திரும்பப் பெற்றுவிட்டீர்கள். புதிய ஒன்றை அனுப்பலாம்.',
    'tapply.closed':
      'விண்ணப்பங்கள் தற்போது மூடப்பட்டுள்ளன, எனவே இந்தப் பக்கத்திலிருந்து எதையும் அனுப்ப முடியாது. நீங்கள் இங்கே கற்பிக்க விரும்பினால், உரிமையாளரிடம் கேளுங்கள்.',
    'tapply.formTitle': 'உரிமையாளர் படிப்பது',
    'tapply.fieldTeach': 'நீங்கள் என்ன கற்பிப்பீர்கள், ஒரே வரியில்?',
    'tapply.hintTeach': 'எடுத்துக்காட்டாக: குழந்தைகளுக்கான தஜ்வீத் மற்றும் குர்ஆன் ஓதுதல்.',
    'tapply.fieldKnow': 'உங்களுக்குத் தெரிந்தது, அதை யாரிடம் கற்றீர்கள்',
    'tapply.hintKnow':
      'உங்கள் சொந்த வார்த்தைகளில். இங்கே ஆசிரியரின் தகுதிகளை ஒரு மனிதர் சரிபார்க்கிறார், எனவே மற்றொரு ஆசிரியரிடம் நீங்கள் சொல்வதை எழுதுங்கள்: எடுத்துக்காட்டாக ஓர் இஜாஸா, அதை வழங்கியவர், நீங்கள் கற்பித்த ஆண்டுகள், எங்கே என்பன.',
    'tapply.fieldSample': 'மாதிரிப் பாடத்தின் இணைப்பு',
    'tapply.hintSample':
      'நீங்கள் பதிவு செய்த அல்லது நேரலையில் நடத்திய ஒரு பாடத்தின் இணைப்பு. உரிமையாளர் அதைப் பார்க்க முடிய வேண்டும். இங்கே கோப்பைப் பதிவேற்ற முடியாது.',
    'tapply.fieldElse': 'வேறு ஏதேனும்',
    'tapply.hintElse':
      'எடுத்துக்காட்டாக நீங்கள் கற்பிக்கக்கூடிய நேரங்கள், உங்கள் நேர மண்டலம், நீங்கள் கற்பிக்கும் மொழிகள்.',
    'tapply.sendDo': 'உரிமையாளருக்கு அனுப்புக',
    'tapply.whyTeach': 'நீங்கள் என்ன கற்பிப்பீர்கள் என்பதைச் சில சொற்களில் சொல்லுங்கள்.',
    'tapply.whyKnow':
      'உங்களுக்குத் தெரிந்தது பற்றியும் அதை யாரிடம் கற்றீர்கள் என்பது பற்றியும் ஓரிரு வாக்கியங்கள் எழுதுங்கள்.',
    'tapply.whySample':
      'இது உரிமையாளர் திறக்கக்கூடிய இணைப்பு அல்ல. பாடத்தின் முழு முகவரியை இடைவெளி இல்லாமல் ஒட்டுங்கள்.',
    'tapply.whyLong':
      'பெட்டிகளில் ஒன்றில் அது கொள்ளக்கூடியதை விட அதிகம் உள்ளது. அதைச் சுருக்கி மீண்டும் அனுப்புங்கள்.',
    'tapply.whyClosed':
      'கற்பிப்பதற்கான விண்ணப்பங்கள் தற்போது மூடப்பட்டுள்ளன. எதுவும் அனுப்பப்படவில்லை.',
    'tapply.whyApplied':
      'உங்கள் விண்ணப்பம் ஒன்று ஏற்கனவே உரிமையாளரிடம் உள்ளது. பதிலுக்காகக் காத்திருங்கள்.',
    'tapply.whyNothing':
      'திரும்பப் பெறக் காத்திருக்கும் விண்ணப்பம் எதுவும் இல்லை. அதற்கு ஏற்கனவே பதில் அளிக்கப்பட்டிருக்கலாம்.',
  },
  ne: {
    'tapply.byAppointment':
      'यहाँ पढाउने काम नियुक्तिबाट हुन्छ। यो पठाउँदा मालिकलाई तपाईंबारे विचार गर्न अनुरोध गरिन्छ। यसले तपाईंलाई शिक्षक बनाउँदैन, र कुनै कोर्स वा पृष्ठ पनि बनाउँदैन। तपाईंले यहाँ लेखेको कुनै पनि कुरा प्रकाशित हुँदैन। तपाईं स्वीकृत हुनुभयो भने पनि, तपाईंले लेखेको हरेक कोर्स कुनै सिकारुले देख्नुअघि समीक्षा गरिन्छ।',
    'tapply.asWritten': 'मालिकले तपाईंले लेखेको कुरा जस्ताको तस्तै पढ्छन्। त्यसको अनुवाद गरिँदैन।',
    'tapply.unread': 'तपाईंको आवेदन पढ्न सकिएन। यो पृष्ठले केही पठाएन र केही बदलेन।',
    'tapply.teachesAlready': 'तपाईं यहाँ पहिले नै पढाउनुहुन्छ, त्यसैले आवेदन दिनुपर्ने केही छैन।',
    'tapply.toCourses': 'आफ्ना कोर्सहरूमा जानुहोस्',
    'tapply.approved': 'तपाईंको आवेदन स्वीकृत भयो।',
    'tapply.noteLeft': 'तपाईंका लागि छोडिएको टिप्पणी, जस्तो लेखिएको थियो:',
    'tapply.yours': 'तपाईंको आवेदन',
    'tapply.waiting': 'मालिकसँग छ, पढिने प्रतीक्षामा',
    'tapply.sentOn': 'पठाइएको मिति: {date}',
    'tapply.answerHere':
      'जवाफ यही पृष्ठमा देखाइनेछ। जवाफ आउँदा कुनै सन्देश पठाइँदैन, त्यसैले यहाँ फेरि हेर्नुहोस्।',
    'tapply.sampleLink': 'तपाईंले पठाएको नमुना पाठ',
    'tapply.withdrawDo': 'यो आवेदन फिर्ता लिनुहोस्',
    'tapply.withdrawNote':
      'जवाफ आउनुअघि तपाईं यसलाई जुनसुकै बेला फिर्ता लिन सक्नुहुन्छ। कारण भन्नु पर्दैन।',
    'tapply.declined': 'यस पटक स्वीकृत भएन।',
    'tapply.again': 'तपाईं अर्को आवेदन पठाउन सक्नुहुन्छ।',
    'tapply.withdrawn': 'तपाईंले आफ्नो आवेदन फिर्ता लिनुभयो। तपाईं नयाँ आवेदन पठाउन सक्नुहुन्छ।',
    'tapply.closed':
      'आवेदनहरू अहिले बन्द छन्, त्यसैले यो पृष्ठबाट केही पठाउन सकिँदैन। तपाईं यहाँ पढाउन चाहनुहुन्छ भने, मालिकलाई सोध्नुहोस्।',
    'tapply.formTitle': 'मालिकले के पढ्छन्',
    'tapply.fieldTeach': 'तपाईं के पढाउनुहुन्छ, एक पङ्क्तिमा?',
    'tapply.hintTeach': 'उदाहरणका लागि: बालबालिकाका लागि तजवीद र कुरआन तिलावत।',
    'tapply.fieldKnow': 'तपाईं के जान्नुहुन्छ, र कोबाट सिक्नुभयो',
    'tapply.hintKnow':
      'आफ्नै शब्दमा। यहाँ शिक्षकको योग्यता एक जना मानिसले जाँच्छन्, त्यसैले अर्को शिक्षकलाई तपाईंले भन्ने कुरा नै लेख्नुहोस्: उदाहरणका लागि इजाजा र कसले दिएको, कति वर्ष पढाउनुभयो, र कहाँ।',
    'tapply.fieldSample': 'नमुना पाठको लिङ्क',
    'tapply.hintSample':
      'तपाईंले रेकर्ड वा प्रत्यक्ष प्रसारण गरेको कुनै पाठको लिङ्क। मालिकले त्यो हेर्न सक्नुपर्छ। यहाँ फाइल अपलोड गर्न सकिँदैन।',
    'tapply.fieldElse': 'अरू केही',
    'tapply.hintElse':
      'उदाहरणका लागि तपाईं पढाउन सक्ने समय, तपाईंको समय क्षेत्र र तपाईंले पढाउने भाषाहरू।',
    'tapply.sendDo': 'मालिकलाई पठाउनुहोस्',
    'tapply.whyTeach': 'तपाईं के पढाउनुहुन्छ भनेर केही शब्दमा भन्नुहोस्।',
    'tapply.whyKnow': 'तपाईं के जान्नुहुन्छ र कोबाट सिक्नुभयो भन्नेबारे एक-दुई वाक्य लेख्नुहोस्।',
    'tapply.whySample':
      'यो मालिकले खोल्न सक्ने लिङ्क होइन। पाठको पूरा ठेगाना खाली ठाउँबिना टाँस्नुहोस्।',
    'tapply.whyLong':
      'एउटा बाकसमा त्यसले अटाउनेभन्दा बढी लेखिएको छ। त्यसलाई छोटो बनाएर फेरि पठाउनुहोस्।',
    'tapply.whyClosed': 'पढाउने आवेदनहरू अहिले बन्द छन्। केही पठाइएन।',
    'tapply.whyApplied': 'तपाईंको एउटा आवेदन पहिले नै मालिकसँग छ। जवाफको प्रतीक्षा गर्नुहोस्।',
    'tapply.whyNothing':
      'फिर्ता लिन प्रतीक्षामा रहेको कुनै आवेदन छैन। त्यसको जवाफ पहिले नै दिइएको हुन सक्छ।',
  },
};
