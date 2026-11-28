import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The teacher's dashboard (`/teach`): what somebody who has not been
 * appointed is told, the list of the teacher's courses with their state,
 * the record of the teacher's own screening, the links to the other
 * teaching screens with the sentence beside each, and the form that
 * creates a course with its four refusals.
 *
 * Written on 2026-11-28, in the same twenty-seven languages as the staff
 * console. **Written by the people who built the site and read by no
 * speaker.** Some of these sentences say what a teacher may and may not do:
 * that copyright stays with them, that a learner who enrolled keeps access,
 * that a course for children cannot be published without a current check.
 * A wrong one misdescribes a rule. Nothing here enforces one: the database
 * decides, whatever the sentence says.
 *
 * The sentence beside a link follows a dash, so it begins small and ends
 * without a full stop. A count follows a colon ("…: 3"), so that no
 * language has to agree a noun with a number. A date is written by
 * `formatDay` in the reader's calendar and digits and dropped into `{date}`
 * or `{until}`; where a language needs a word beside a date to carry a case
 * ending ("{date} tarihinde", "{date} күні"), the word is in the sentence.
 * The sentence that ends "What the database said:" is followed by the
 * database's own sentence, and the one that ends "as it was written down:"
 * by the words a member of staff typed; both are English or whatever was
 * typed, and the page marks them.
 *
 * French puts a no-break space before `:` and `;`. Uzbek writes oʻ and gʻ
 * with U+02BB. "Screening" and "check" are said as `console.nScreenings`
 * says them in each language, "owner" as `tapply.` says it (Turkish, Uzbek,
 * Kazakh, Azerbaijani, Kyrgyz and Turkmen write "the platform's owner"),
 * and the name on the teachers' board as `board.nameTitle` does.
 *
 * Nine sentences are copies, letter for letter, of what older parts say:
 * "Teaching" (`switch.gTeaching`), "Teaching here is by appointment." (the
 * first sentence of `tapply.byAppointment`), "Apply to teach"
 * (`account.teachLink`), "Go to my learning" (`account.selfGo`), "Learning
 * paths" (`paths.title`), "Teachers’ discussion" (`board.teachers`),
 * "Creating…" (`family.creating`), "Back to my learning" (`course.back`)
 * and being signed out (`family.signedOut`). They are copied rather than
 * borrowed so that this part is whole on its own: were one of those parts
 * held for a language, a borrowed word would come out in English inside a
 * block that is not marked as English.
 *
 * Not here, and shown in English, marked as English: a takedown notice and
 * the teacher's answer to it, the conduct card, the authorisations on
 * record, the agreement about the teacher's work, and the screens these
 * links lead to. A course's title and the kind of check are what somebody
 * typed, in whatever language they typed it.
 *
 * Made by `scripts/catalogue-part/gen.py` from
 * `scripts/catalogue-part/data/teach.txt`.
 */
export const TEACH: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'teach.eyebrow': 'التدريس',
    'teach.notYetTitle': 'هذه منطقة التدريس',
    'teach.byAppointment': 'التدريس هنا بالتعيين.',
    'teach.byAppointmentBody':
      'المالك هو من يعيّن المعلّم. وإلى أن يحدث ذلك يبقى حسابك حساب متعلّم، وحساب المتعلّم لا يستطيع فتح دورة.',
    'teach.ask':
      'لك أن تطلب: أرسل مؤهلاتك ودرسًا نموذجيًا، والمالك يقرؤهما. التقدّم بالطلب ليس تعيينًا. لا يُمنح شيء حتى يقرّر أحدٌ ذلك كتابةً.',
    'teach.apply': 'التقدّم للتدريس',
    'teach.goLearning': 'اذهب إلى تعلّمي',
    'teach.title': 'دوراتي',
    'teach.lede':
      'حقوق النشر في كل ما هنا تبقى لك. ما بعتَه من قبل لا يُسترجَع: المتعلّمون الذين سجّلوا يحتفظون بوصولهم حتى لو سحبتَ الدورة لاحقًا.',
    'teach.tdDecided': 'صدر قرار في إشعار يخصّ إحدى نسخك.',
    'teach.tdHeldOne': 'إحدى دوراتك محجوبة ريثما يُنظر في مطالبة ضدها.',
    'teach.tdHeldMany': 'دوراتك المحجوبة ريثما يُنظر في المطالبات ضدها: {count}.',
    'teach.tdBelow': 'المطالبة في الأسفل بالكلمات التي أُرسلت بها، ويمكنك الرد عليها هناك.',
    'teach.lPromotions': 'العروض الترويجية',
    'teach.nPromotions':
      'قدّم عرضًا على دوراتك أنت، في البلدان التي تختارها، مع حدّ لعدد المرات التي يجوز لعائلة أن تستخدمه فيها',
    'teach.scTitle': 'التحقق',
    'teach.scStNone': 'لا يوجد تحقق محفوظ',
    'teach.scStChecked': 'تم التحقق',
    'teach.scStLapsed': 'انتهت صلاحيته',
    'teach.scStFailed': 'لم يجتز',
    'teach.scNone':
      'لا يوجد تحقق محفوظ عنك بعد. من يعيّن المعلمين هو من يسجّله: نوع التحقق، وتاريخه، وهل تنتهي صلاحيته.',
    'teach.scFailedOn':
      'تحقق سُجّل بتاريخ {date} لم يجتز. من سجّله يستطيع أن يخبرك بما يحدث بعد ذلك.',
    'teach.scFailed': 'تحقق سُجّل على حسابك لم يجتز. من سجّله يستطيع أن يخبرك بما يحدث بعد ذلك.',
    'teach.scLapsedOn': 'انتهت صلاحية آخر تحقق لك بتاريخ {date}.',
    'teach.scLapsed': 'انتهت صلاحية آخر تحقق لك.',
    'teach.scHoldsFrom': 'سُجّل تحقق بتاريخ {date} وهو سارٍ حتى {until}.',
    'teach.scHolds': 'سُجّل تحقق وهو سارٍ حتى {until}.',
    'teach.scNoExpiryFrom': 'سُجّل تحقق بتاريخ {date}، ولم يُذكر له تاريخ انتهاء.',
    'teach.scNoExpiry': 'سُجّل تحقق، ولم يُذكر له تاريخ انتهاء.',
    'teach.scKind': 'نوع التحقق، كما كُتب:',
    'teach.scBlocks': 'إلى أن يُسجَّل تحقق سارٍ، لا يمكن نشر دورة تكتبها للأطفال.',
    'teach.scNotAsked':
      'المنصة لا تطلب تحققًا اليوم، فلا شيء هنا يمنع نشر دورة لك. وإن تغيّر ذلك فهذه الصفحة تقوله أولًا.',
    'teach.scKept': 'يُحفظ هذا السجل حتى {date} ثم يُحذف.',
    'teach.empty': 'لم تنشئ أي دورة بعد.',
    'teach.stDraft': 'مسودة',
    'teach.stActive': 'نشطة',
    'teach.stRetired': 'مسحوبة',
    'teach.published': 'منشورة',
    'teach.open': 'افتح المنهج',
    'teach.lPaths': 'مسارات التعلّم',
    'teach.nPaths': 'رتّب سلسلة من الدورات النشطة',
    'teach.lProfile': 'الملف العام للمعلّم',
    'teach.nProfile': 'عرّف بنفسك واربط قنواتك على وسائل التواصل',
    'teach.lMedia': 'مكتبة الوسائط',
    'teach.nMedia': 'ارفع تسجيلات الدروس واعرف أيّها جاهز للاستخدام',
    'teach.lBoard': 'نقاش المعلمين',
    'teach.nBoard': 'منتدى خاص بالمعلمين؛ تكتب فيه باسم مستعار لا باسمك',
    'teach.lEarnings': 'الأرباح',
    'teach.nEarnings':
      'ما كسبته دوراتك، بكل عملة، والمبيعات التي وراءه؛ لم يُدفع شيء بعد، فهذا سجلّ وليس رصيدًا',
    'teach.lPayouts': 'استلام مستحقاتك',
    'teach.nPayouts':
      'اطلب المال الذي كسبته دوراتك بعد خروجه من مدة حجز الاسترداد، واعرف ما جرى لكل طلب سابق',
    'teach.create': 'إنشاء',
    'teach.ncTitle': 'دورة جديدة',
    'teach.ncField': 'عنوان الدورة',
    'teach.ncExample': 'مقدمة في التجويد',
    'teach.ncCreate': 'أنشئ الدورة',
    'teach.ncCreating': 'جارٍ الإنشاء…',
    'teach.ncETitle': 'اكتب عنوانًا للدورة.',
    'teach.ncEDuplicate': 'توجد دورة بهذا الاسم من قبل. غيّر العنوان قليلًا وحاول من جديد.',
    'teach.ncERefused': 'لم تُنشأ الدورة. وهذا ما قالته قاعدة البيانات:',
    'teach.ncEUnsure':
      'لا أحد يستطيع أن يقول هل أُنشئت الدورة. أعد تحميل الصفحة وانظر إلى دوراتك قبل أن تنشئها من جديد.',
    'teach.ncESignedOut': 'لقد سُجّل خروجك. سجّل الدخول من جديد ثم حاول مرة أخرى.',
    'teach.back': 'العودة إلى تعلّمي',
  },
  ur: {
    'teach.eyebrow': 'تدریس',
    'teach.notYetTitle': 'یہ تدریس کا حصہ ہے',
    'teach.byAppointment': 'یہاں پڑھانا تقرری سے ہوتا ہے۔',
    'teach.byAppointmentBody':
      'استاد کو مالک مقرر کرتا ہے۔ تب تک آپ کا اکاؤنٹ سیکھنے والے کا ہے، اور سیکھنے والے کا اکاؤنٹ کورس نہیں کھول سکتا۔',
    'teach.ask':
      'آپ درخواست کر سکتے ہیں: اپنی اہلیت اور نمونے کا ایک سبق بھیجیں، مالک انہیں پڑھتا ہے۔ درخواست دینا تقرری نہیں ہے۔ جب تک کوئی تحریری فیصلہ نہ کرے، کچھ نہیں دیا جاتا۔',
    'teach.apply': 'پڑھانے کی درخواست دیں',
    'teach.goLearning': 'میری تعلیم پر جائیں',
    'teach.title': 'میرے کورسز',
    'teach.lede':
      'یہاں کی ہر چیز کے حقوقِ اشاعت آپ کے پاس رہتے ہیں۔ جو آپ بیچ چکے ہیں وہ واپس نہیں لیا جاتا: داخل ہو چکے سیکھنے والوں کی رسائی برقرار رہتی ہے، چاہے آپ بعد میں کورس واپس لے لیں۔',
    'teach.tdDecided': 'آپ کے ایک ورژن سے متعلق نوٹس کا فیصلہ ہو گیا۔',
    'teach.tdHeldOne':
      'آپ کا ایک کورس اس وقت تک روکا ہوا ہے جب تک اس کے خلاف دعوے کو دیکھا جا رہا ہے۔',
    'teach.tdHeldMany': 'آپ کے کورسز جو اپنے خلاف دعووں کے دیکھے جانے تک روکے ہوئے ہیں: {count}۔',
    'teach.tdBelow':
      'دعویٰ نیچے انہی الفاظ میں ہے جن میں بھیجا گیا تھا، اور آپ وہیں اس کا جواب دے سکتے ہیں۔',
    'teach.lPromotions': 'پروموشنز',
    'teach.nPromotions':
      'اپنے کورسز پر پیشکش چلائیں، ان ملکوں میں جو آپ چنیں، اور اس حد کے ساتھ کہ ایک خاندان اسے کتنی بار استعمال کر سکتا ہے',
    'teach.scTitle': 'جانچ',
    'teach.scStNone': 'کوئی جانچ ریکارڈ پر نہیں',
    'teach.scStChecked': 'جانچ ہو گئی',
    'teach.scStLapsed': 'مدت ختم',
    'teach.scStFailed': 'پاس نہیں ہوئی',
    'teach.scNone':
      'آپ کی کوئی جانچ ابھی ریکارڈ پر نہیں۔ جو اساتذہ کو مقرر کرتا ہے وہی اسے درج کرتا ہے: جانچ کی قسم، تاریخ، اور یہ کہ اس کی مدت ختم ہوتی ہے یا نہیں۔',
    'teach.scFailedOn':
      '{date} کو درج کی گئی جانچ پاس نہیں ہوئی۔ جس نے اسے درج کیا وہ بتا سکتا ہے کہ آگے کیا ہوگا۔',
    'teach.scFailed':
      'آپ کے اکاؤنٹ پر درج کی گئی ایک جانچ پاس نہیں ہوئی۔ جس نے اسے درج کیا وہ بتا سکتا ہے کہ آگے کیا ہوگا۔',
    'teach.scLapsedOn': 'آپ کی آخری جانچ کی مدت {date} کو ختم ہو گئی۔',
    'teach.scLapsed': 'آپ کی آخری جانچ کی مدت ختم ہو چکی ہے۔',
    'teach.scHoldsFrom': 'ایک جانچ {date} کو درج کی گئی اور {until} تک برقرار ہے۔',
    'teach.scHolds': 'ایک جانچ درج کی گئی اور {until} تک برقرار ہے۔',
    'teach.scNoExpiryFrom':
      'ایک جانچ {date} کو درج کی گئی، اور ختم ہونے کی کوئی تاریخ نہیں بتائی گئی۔',
    'teach.scNoExpiry': 'ایک جانچ درج کی گئی، اور ختم ہونے کی کوئی تاریخ نہیں بتائی گئی۔',
    'teach.scKind': 'جانچ کی قسم، جیسی لکھی گئی تھی:',
    'teach.scBlocks':
      'جب تک کوئی موجودہ جانچ درج نہ ہو، بچوں کے لیے آپ کا لکھا ہوا کورس شائع نہیں ہو سکتا۔',
    'teach.scNotAsked':
      'پلیٹ فارم آج جانچ نہیں مانگ رہا، اس لیے یہاں کوئی چیز آپ کے کورس کی اشاعت نہیں روکتی۔ اگر یہ بدلا تو یہ صفحہ سب سے پہلے بتائے گا۔',
    'teach.scKept': 'یہ ریکارڈ {date} تک رکھا جاتا ہے اور پھر حذف کر دیا جاتا ہے۔',
    'teach.empty': 'آپ نے ابھی تک کوئی کورس نہیں بنایا۔',
    'teach.stDraft': 'مسودہ',
    'teach.stActive': 'فعال',
    'teach.stRetired': 'واپس لیا گیا',
    'teach.published': 'شائع شدہ',
    'teach.open': 'نصاب کھولیں',
    'teach.lPaths': 'تعلیمی راستے',
    'teach.nPaths': 'فعال کورسز کی ایک ترتیب بنائیں',
    'teach.lProfile': 'استاد کا عوامی پروفائل',
    'teach.nProfile': 'اپنا تعارف کرائیں اور اپنے سوشل چینلز کے روابط دیں',
    'teach.lMedia': 'میڈیا لائبریری',
    'teach.nMedia': 'اسباق کی ریکارڈنگز اپ لوڈ کریں اور دیکھیں کہ کون سی استعمال کے لیے تیار ہیں',
    'teach.lBoard': 'اساتذہ کی گفتگو',
    'teach.nBoard': 'صرف اساتذہ کا بورڈ؛ وہاں آپ اپنے نام سے نہیں، فرضی نام سے لکھتے ہیں',
    'teach.lEarnings': 'آمدنی',
    'teach.nEarnings':
      'آپ کے کورسز نے ہر کرنسی میں جو کمایا، اور اس کے پیچھے کی فروخت؛ ابھی کچھ ادا نہیں کیا جاتا، اس لیے یہ ریکارڈ ہے، بیلنس نہیں',
    'teach.lPayouts': 'ادائیگی لینا',
    'teach.nPayouts':
      'اپنے کورسز کی کمائی اس وقت مانگیں جب وہ رقم واپسی کی روک سے نکل آئے، اور دیکھیں کہ ہر پچھلی درخواست کا کیا ہوا',
    'teach.create': 'بنائیں',
    'teach.ncTitle': 'نیا کورس',
    'teach.ncField': 'کورس کا عنوان',
    'teach.ncExample': 'تجوید کا تعارف',
    'teach.ncCreate': 'کورس بنائیں',
    'teach.ncCreating': 'بنایا جا رہا ہے…',
    'teach.ncETitle': 'کورس کو کوئی عنوان دیں۔',
    'teach.ncEDuplicate':
      'اس نام کا کورس پہلے سے موجود ہے۔ عنوان تھوڑا بدلیں اور دوبارہ کوشش کریں۔',
    'teach.ncERefused': 'کورس نہیں بنا۔ ڈیٹا بیس نے یہ کہا:',
    'teach.ncEUnsure':
      'کوئی نہیں بتا سکتا کہ کورس بنا یا نہیں۔ صفحہ دوبارہ کھولیں اور دوبارہ بنانے سے پہلے اپنے کورسز دیکھ لیں۔',
    'teach.ncESignedOut':
      'آپ سائن آؤٹ ہو چکے ہیں۔ دوبارہ سائن اِن کریں، پھر ایک بار اور کوشش کریں۔',
    'teach.back': 'میری تعلیم پر واپس',
  },
  fa: {
    'teach.eyebrow': 'تدریس',
    'teach.notYetTitle': 'اینجا بخش تدریس است',
    'teach.byAppointment': 'تدریس در اینجا با انتصاب است.',
    'teach.byAppointmentBody':
      'معلم را مالک منصوب می‌کند. تا آن زمان حساب شما حساب یادگیرنده است، و حساب یادگیرنده نمی‌تواند دوره‌ای باز کند.',
    'teach.ask':
      'می‌توانید درخواست کنید: صلاحیت‌های خود و یک درس نمونه بفرستید و مالک آن‌ها را می‌خواند. درخواست دادن منصوب شدن نیست. تا کسی کتباً تصمیم نگیرد، چیزی داده نمی‌شود.',
    'teach.apply': 'درخواست تدریس',
    'teach.goLearning': 'رفتن به یادگیری من',
    'teach.title': 'دوره‌های من',
    'teach.lede':
      'حق نشر هر آنچه اینجاست نزد شما می‌ماند. آنچه پیش‌تر فروخته‌اید پس گرفته نمی‌شود: یادگیرندگانی که ثبت‌نام کرده‌اند دسترسی‌شان را نگه می‌دارند، حتی اگر بعداً دوره را کنار بگذارید.',
    'teach.tdDecided': 'دربارهٔ اعلامیه‌ای مربوط به یکی از نسخه‌های شما تصمیم گرفته شد.',
    'teach.tdHeldOne': 'یکی از دوره‌های شما تا وقتی ادعایی علیه آن بررسی می‌شود نگه داشته شده است.',
    'teach.tdHeldMany': 'دوره‌های شما که تا بررسی ادعاهای علیه آن‌ها نگه داشته شده‌اند: {count}.',
    'teach.tdBelow':
      'ادعا در پایین آمده است، با همان کلماتی که فرستاده شد، و همان‌جا می‌توانید به آن پاسخ دهید.',
    'teach.lPromotions': 'تخفیف‌های تبلیغی',
    'teach.nPromotions':
      'برای دوره‌های خودتان پیشنهادی بگذارید، در کشورهایی که انتخاب می‌کنید، با سقفی برای دفعاتی که یک خانواده می‌تواند از آن استفاده کند',
    'teach.scTitle': 'بررسی پیشینه',
    'teach.scStNone': 'هیچ بررسی‌ای در پرونده نیست',
    'teach.scStChecked': 'بررسی شد',
    'teach.scStLapsed': 'منقضی‌شده',
    'teach.scStFailed': 'قبول نشد',
    'teach.scNone':
      'هنوز هیچ بررسی‌ای برای شما در پرونده نیست. هر کس معلمان را منصوب می‌کند آن را ثبت می‌کند: نوع بررسی، تاریخ، و اینکه منقضی می‌شود یا نه.',
    'teach.scFailedOn':
      'بررسی‌ای که در تاریخ {date} ثبت شد قبول نشد. کسی که آن را ثبت کرده می‌تواند بگوید بعد چه می‌شود.',
    'teach.scFailed':
      'بررسی‌ای که برای حساب شما ثبت شد قبول نشد. کسی که آن را ثبت کرده می‌تواند بگوید بعد چه می‌شود.',
    'teach.scLapsedOn': 'آخرین بررسی شما در تاریخ {date} منقضی شد.',
    'teach.scLapsed': 'آخرین بررسی شما منقضی شده است.',
    'teach.scHoldsFrom': 'یک بررسی در تاریخ {date} ثبت شد و تا {until} معتبر است.',
    'teach.scHolds': 'یک بررسی ثبت شد و تا {until} معتبر است.',
    'teach.scNoExpiryFrom': 'یک بررسی در تاریخ {date} ثبت شد و تاریخ انقضایی برایش گفته نشده است.',
    'teach.scNoExpiry': 'یک بررسی ثبت شد و تاریخ انقضایی برایش گفته نشده است.',
    'teach.scKind': 'نوع بررسی، همان‌طور که نوشته شد:',
    'teach.scBlocks':
      'تا وقتی بررسیِ معتبری ثبت نشود، دوره‌ای که برای کودکان می‌نویسید نمی‌تواند منتشر شود.',
    'teach.scNotAsked':
      'سکو امروز بررسی نمی‌خواهد، پس چیزی در اینجا جلوی انتشار دورهٔ شما را نمی‌گیرد. اگر این تغییر کند، این صفحه پیش از هر جای دیگر آن را می‌گوید.',
    'teach.scKept': 'این سابقه تا {date} نگه داشته و سپس حذف می‌شود.',
    'teach.empty': 'هنوز دوره‌ای نساخته‌اید.',
    'teach.stDraft': 'پیش‌نویس',
    'teach.stActive': 'فعال',
    'teach.stRetired': 'کنارگذاشته',
    'teach.published': 'منتشرشده',
    'teach.open': 'باز کردن برنامهٔ درسی',
    'teach.lPaths': 'مسیرهای یادگیری',
    'teach.nPaths': 'رشته‌ای از دوره‌های فعال را بچینید',
    'teach.lProfile': 'نمایهٔ عمومی معلم',
    'teach.nProfile': 'خودتان را معرفی کنید و به کانال‌های اجتماعی‌تان پیوند دهید',
    'teach.lMedia': 'کتابخانهٔ رسانه',
    'teach.nMedia': 'ضبط‌های درس را بارگذاری کنید و ببینید کدام‌ها آمادهٔ استفاده‌اند',
    'teach.lBoard': 'گفت‌وگوی معلمان',
    'teach.nBoard': 'تابلویی فقط برای معلمان؛ آنجا با نام کاربری می‌نویسید، نه با نام خودتان',
    'teach.lEarnings': 'درآمد',
    'teach.nEarnings':
      'آنچه دوره‌های شما به هر ارز به دست آورده‌اند، و فروش‌های پشت آن؛ هنوز چیزی پرداخت نمی‌شود، پس این سابقه است نه موجودی',
    'teach.lPayouts': 'دریافت پول',
    'teach.nPayouts':
      'پولی را که دوره‌هایتان به دست آورده‌اند، پس از بیرون آمدن از نگه‌داشتِ بازپرداخت، بخواهید و ببینید هر درخواست پیشین چه شد',
    'teach.create': 'ساختن',
    'teach.ncTitle': 'دورهٔ تازه',
    'teach.ncField': 'عنوان دوره',
    'teach.ncExample': 'درآمدی بر تجوید',
    'teach.ncCreate': 'ساختن دوره',
    'teach.ncCreating': 'در حال ساختن…',
    'teach.ncETitle': 'برای دوره عنوانی بنویسید.',
    'teach.ncEDuplicate':
      'دوره‌ای با این نام از پیش هست. عنوان را کمی تغییر دهید و دوباره تلاش کنید.',
    'teach.ncERefused': 'دوره ساخته نشد. آنچه پایگاه داده گفت:',
    'teach.ncEUnsure':
      'هیچ‌کس نمی‌تواند بگوید دوره ساخته شد یا نه. صفحه را دوباره بار کنید و پیش از ساختن دوباره، به دوره‌هایتان نگاه کنید.',
    'teach.ncESignedOut': 'از حساب خارج شده‌اید. دوباره وارد شوید و یک بار دیگر تلاش کنید.',
    'teach.back': 'بازگشت به یادگیری من',
  },
  'fa-af': {
    'teach.eyebrow': 'تدریس',
    'teach.notYetTitle': 'اینجا بخش تدریس است',
    'teach.byAppointment': 'تدریس در اینجا با تقرر است.',
    'teach.byAppointmentBody':
      'آموزگار را مالک مقرر می‌کند. تا آن وقت حساب شما حساب شاگرد است، و حساب شاگرد نمی‌تواند کورسی باز کند.',
    'teach.ask':
      'می‌توانید درخواست کنید: شایستگی‌های خود و یک درس نمونه بفرستید و مالک آن‌ها را می‌خواند. درخواست دادن تقرر نیست. تا کسی به‌صورت نوشته تصمیم نگیرد، چیزی داده نمی‌شود.',
    'teach.apply': 'درخواست تدریس',
    'teach.goLearning': 'رفتن به آموزش من',
    'teach.title': 'کورس‌های من',
    'teach.lede':
      'حق نشر هر آنچه اینجاست نزد شما می‌ماند. آنچه پیش‌تر فروخته‌اید پس گرفته نمی‌شود: شاگردانی که شامل شده‌اند دسترسی‌شان را نگه می‌دارند، حتی اگر بعدتر کورس را کنار بگذارید.',
    'teach.tdDecided': 'دربارهٔ اطلاعیه‌ای مربوط به یکی از نسخه‌های شما تصمیم گرفته شد.',
    'teach.tdHeldOne': 'یکی از کورس‌های شما تا وقتی ادعایی علیه آن بررسی می‌شود نگه داشته شده است.',
    'teach.tdHeldMany': 'کورس‌های شما که تا بررسی ادعاهای علیه آن‌ها نگه داشته شده‌اند: {count}.',
    'teach.tdBelow':
      'ادعا در پایین آمده است، با همان کلماتی که فرستاده شد، و همان‌جا می‌توانید به آن جواب بدهید.',
    'teach.lPromotions': 'تخفیف‌های تبلیغاتی',
    'teach.nPromotions':
      'برای کورس‌های خودتان پیشنهادی بگذارید، در کشورهایی که انتخاب می‌کنید، با سقفی برای دفعاتی که یک فامیل می‌تواند از آن استفاده کند',
    'teach.scTitle': 'بررسی پیشینه',
    'teach.scStNone': 'هیچ بررسی‌ای در دوسیه نیست',
    'teach.scStChecked': 'بررسی شد',
    'teach.scStLapsed': 'مدت ختم‌شده',
    'teach.scStFailed': 'قبول نشد',
    'teach.scNone':
      'هنوز هیچ بررسی‌ای برای شما در دوسیه نیست. هر کس آموزگاران را مقرر می‌کند آن را ثبت می‌کند: نوع بررسی، تاریخ، و اینکه مدتش ختم می‌شود یا نه.',
    'teach.scFailedOn':
      'بررسی‌ای که به تاریخ {date} ثبت شد قبول نشد. کسی که آن را ثبت کرده می‌تواند بگوید بعد چه می‌شود.',
    'teach.scFailed':
      'بررسی‌ای که برای حساب شما ثبت شد قبول نشد. کسی که آن را ثبت کرده می‌تواند بگوید بعد چه می‌شود.',
    'teach.scLapsedOn': 'مدت آخرین بررسی شما به تاریخ {date} ختم شد.',
    'teach.scLapsed': 'مدت آخرین بررسی شما ختم شده است.',
    'teach.scHoldsFrom': 'یک بررسی به تاریخ {date} ثبت شد و تا {until} اعتبار دارد.',
    'teach.scHolds': 'یک بررسی ثبت شد و تا {until} اعتبار دارد.',
    'teach.scNoExpiryFrom': 'یک بررسی به تاریخ {date} ثبت شد و تاریخ ختمی برایش گفته نشده است.',
    'teach.scNoExpiry': 'یک بررسی ثبت شد و تاریخ ختمی برایش گفته نشده است.',
    'teach.scKind': 'نوع بررسی، همان‌طور که نوشته شد:',
    'teach.scBlocks':
      'تا وقتی بررسیِ معتبری ثبت نشود، کورسی که برای اطفال می‌نویسید نشر شده نمی‌تواند.',
    'teach.scNotAsked':
      'پلتفرم امروز بررسی نمی‌خواهد، پس چیزی در اینجا جلو نشر کورس شما را نمی‌گیرد. اگر این تغییر کند، این صفحه پیش از هر جای دیگر آن را می‌گوید.',
    'teach.scKept': 'این سابقه تا {date} نگه داشته و سپس حذف می‌شود.',
    'teach.empty': 'هنوز کورسی نساخته‌اید.',
    'teach.stDraft': 'پیش‌نویس',
    'teach.stActive': 'فعال',
    'teach.stRetired': 'کنارگذاشته',
    'teach.published': 'نشرشده',
    'teach.open': 'باز کردن نصاب درسی',
    'teach.lPaths': 'مسیرهای آموزش',
    'teach.nPaths': 'رشته‌ای از کورس‌های فعال را ترتیب بدهید',
    'teach.lProfile': 'پروفایل عمومی آموزگار',
    'teach.nProfile': 'خودتان را معرفی کنید و به کانال‌های اجتماعی‌تان پیوند بدهید',
    'teach.lMedia': 'کتابخانهٔ رسانه',
    'teach.nMedia': 'ثبت‌های درس را بارگذاری کنید و ببینید کدام‌ها آمادهٔ استفاده‌اند',
    'teach.lBoard': 'گفت‌وگوی استادان',
    'teach.nBoard': 'تابلویی تنها برای آموزگاران؛ آنجا با نام مستعار می‌نویسید، نه با نام خودتان',
    'teach.lEarnings': 'عاید',
    'teach.nEarnings':
      'آنچه کورس‌های شما به هر اسعار به دست آورده‌اند، و فروش‌های پشت آن؛ هنوز چیزی پرداخت نمی‌شود، پس این سابقه است نه بیلانس',
    'teach.lPayouts': 'گرفتن پول',
    'teach.nPayouts':
      'پولی را که کورس‌هایتان به دست آورده‌اند، پس از بیرون شدن از نگه‌داشتِ بازپرداخت، بخواهید و ببینید هر درخواست پیشین چه شد',
    'teach.create': 'ساختن',
    'teach.ncTitle': 'کورس نو',
    'teach.ncField': 'عنوان کورس',
    'teach.ncExample': 'مقدمه‌ای بر تجوید',
    'teach.ncCreate': 'ساختن کورس',
    'teach.ncCreating': 'در حال ساختن…',
    'teach.ncETitle': 'برای کورس عنوانی بنویسید.',
    'teach.ncEDuplicate':
      'کورسی با این نام از پیش هست. عنوان را کمی تغییر بدهید و دوباره کوشش کنید.',
    'teach.ncERefused': 'کورس ساخته نشد. آنچه دیتابیس گفت:',
    'teach.ncEUnsure':
      'هیچ‌کس گفته نمی‌تواند که کورس ساخته شد یا نه. صفحه را دوباره باز کنید و پیش از دوباره ساختن، به کورس‌هایتان نگاه کنید.',
    'teach.ncESignedOut': 'از حساب خارج شده‌اید. دوباره داخل شوید و یک بار دیگر کوشش کنید.',
    'teach.back': 'برگشت به آموزش من',
  },
  tr: {
    'teach.eyebrow': 'Öğretim',
    'teach.notYetTitle': 'Burası öğretim alanı',
    'teach.byAppointment': 'Burada öğretmenlik atamayla olur.',
    'teach.byAppointmentBody':
      'Öğretmeni platform sahibi atar. O zamana kadar hesabınız bir öğrenci hesabıdır ve bir öğrenci hesabı kurs açamaz.',
    'teach.ask':
      'Başvurabilirsiniz: yeterliliklerinizi ve örnek bir ders gönderin, platform sahibi bunları okur. Başvurmak atanmak değildir. Biri yazılı olarak karar verene kadar hiçbir şey verilmez.',
    'teach.apply': 'Öğretmek için başvur',
    'teach.goLearning': 'Öğrenimime git',
    'teach.title': 'Kurslarım',
    'teach.lede':
      'Buradaki her şeyin telif hakkı sizde kalır. Önceden sattığınız hiçbir şey geri alınmaz: kursu sonradan kullanımdan kaldırsanız bile kayıt olmuş öğrenciler erişimlerini korur.',
    'teach.tdDecided': 'Sürümlerinizden biriyle ilgili bir bildirim karara bağlandı.',
    'teach.tdHeldOne': 'Kurslarınızdan biri, hakkındaki bir talep incelenirken bekletiliyor.',
    'teach.tdHeldMany': 'Haklarındaki talepler incelenirken bekletilen kurslarınız: {count}.',
    'teach.tdBelow':
      'Talep, gönderildiği sözcüklerle aşağıda duruyor ve orada yanıtlayabilirsiniz.',
    'teach.lPromotions': 'Promosyonlar',
    'teach.nPromotions':
      'kendi kurslarınızda, seçtiğiniz ülkelerde, bir ailenin kaç kez kullanabileceğine sınır koyarak bir teklif yürütün',
    'teach.scTitle': 'Tarama',
    'teach.scStNone': 'Dosyada tarama yok',
    'teach.scStChecked': 'Tarandı',
    'teach.scStLapsed': 'Süresi doldu',
    'teach.scStFailed': 'Geçmedi',
    'teach.scNone':
      'Dosyanızda henüz bir tarama yok. Öğretmenleri kim atıyorsa taramayı o kaydeder: taramanın türü, tarihi ve süresinin dolup dolmadığı.',
    'teach.scFailedOn':
      '{date} tarihinde kaydedilen bir tarama geçmedi. Bundan sonra ne olacağını onu kaydeden kişi söyleyebilir.',
    'teach.scFailed':
      'Hesabınıza kaydedilen bir tarama geçmedi. Bundan sonra ne olacağını onu kaydeden kişi söyleyebilir.',
    'teach.scLapsedOn': 'Son taramanızın süresi {date} tarihinde doldu.',
    'teach.scLapsed': 'Son taramanızın süresi doldu.',
    'teach.scHoldsFrom':
      '{date} tarihinde bir tarama kaydedildi ve {until} tarihine kadar geçerli.',
    'teach.scHolds': 'Bir tarama kaydedildi ve {until} tarihine kadar geçerli.',
    'teach.scNoExpiryFrom': '{date} tarihinde bir tarama kaydedildi; bitiş tarihi belirtilmedi.',
    'teach.scNoExpiry': 'Bir tarama kaydedildi; bitiş tarihi belirtilmedi.',
    'teach.scKind': 'Taramanın türü, yazıldığı gibi:',
    'teach.scBlocks':
      'Geçerli bir tarama kaydedilene kadar, çocuklar için yazdığınız bir kurs yayımlanamaz.',
    'teach.scNotAsked':
      'Platform bugün tarama istemiyor; bu yüzden buradaki hiçbir şey bir kursunuzun yayımlanmasını engellemez. Bu değişirse önce bu sayfa söyler.',
    'teach.scKept': 'Bu kayıt {date} tarihine kadar saklanır, sonra silinir.',
    'teach.empty': 'Henüz bir kurs oluşturmadınız.',
    'teach.stDraft': 'Taslak',
    'teach.stActive': 'Etkin',
    'teach.stRetired': 'Kullanımdan kaldırıldı',
    'teach.published': 'Yayımlandı',
    'teach.open': 'Müfredatı aç',
    'teach.lPaths': 'Öğrenme yolları',
    'teach.nPaths': 'etkin kurslardan bir dizi oluşturun',
    'teach.lProfile': 'Herkese açık öğretmen profili',
    'teach.nProfile': 'kendinizi tanıtın ve sosyal kanallarınızın bağlantılarını ekleyin',
    'teach.lMedia': 'Medya kitaplığı',
    'teach.nMedia': 'ders kayıtlarını yükleyin ve hangilerinin kullanıma hazır olduğunu görün',
    'teach.lBoard': 'Öğretmen tartışması',
    'teach.nBoard':
      'yalnızca öğretmenlere açık pano; orada adınızla değil, bir kullanıcı adıyla yazarsınız',
    'teach.lEarnings': 'Kazançlar',
    'teach.nEarnings':
      'kurslarınızın her para biriminde kazandığı tutar ve bunun arkasındaki satışlar; henüz hiçbir ödeme yapılmıyor, yani bu bir bakiye değil, kayıttır',
    'teach.lPayouts': 'Ödeme alma',
    'teach.nPayouts':
      'kurslarınızın kazandığı parayı, iade beklemesinden çıktıktan sonra isteyin ve önceki her talebe ne olduğunu görün',
    'teach.create': 'Oluştur',
    'teach.ncTitle': 'Yeni kurs',
    'teach.ncField': 'Kurs başlığı',
    'teach.ncExample': 'Tecvide Giriş',
    'teach.ncCreate': 'Kurs oluştur',
    'teach.ncCreating': 'Oluşturuluyor…',
    'teach.ncETitle': 'Kursa bir başlık verin.',
    'teach.ncEDuplicate': 'Bu adla bir kurs zaten var. Başlığı biraz değiştirip yeniden deneyin.',
    'teach.ncERefused': 'Kurs oluşturulmadı. Veritabanının söylediği:',
    'teach.ncEUnsure':
      'Kursun oluşturulup oluşturulmadığını kimse söyleyemez. Sayfayı yeniden yükleyin ve yeniden oluşturmadan önce kurslarınıza bakın.',
    'teach.ncESignedOut': 'Oturumunuz kapanmış. Yeniden oturum açın, sonra bir kez daha deneyin.',
    'teach.back': 'Öğrenimime dön',
  },
  id: {
    'teach.eyebrow': 'Pengajaran',
    'teach.notYetTitle': 'Ini area pengajaran',
    'teach.byAppointment': 'Mengajar di sini dilakukan melalui penunjukan.',
    'teach.byAppointmentBody':
      'Pengajar ditunjuk oleh pemilik. Sampai saat itu akun Anda adalah akun pelajar, dan akun pelajar tidak dapat membuka kursus.',
    'teach.ask':
      'Anda boleh meminta: kirim kualifikasi Anda dan satu contoh pelajaran, dan pemilik membacanya. Melamar bukan berarti ditunjuk. Tidak ada yang diberikan sampai seseorang memutuskan, secara tertulis.',
    'teach.apply': 'Melamar untuk mengajar',
    'teach.goLearning': 'Buka pembelajaran saya',
    'teach.title': 'Kursus saya',
    'teach.lede':
      'Hak cipta atas semua yang ada di sini tetap milik Anda. Apa yang sudah Anda jual tidak ditarik kembali: pelajar yang sudah mendaftar tetap memiliki akses walaupun kursusnya Anda hentikan kemudian.',
    'teach.tdDecided': 'Sebuah pemberitahuan tentang salah satu versi Anda telah diputuskan.',
    'teach.tdHeldOne': 'Salah satu kursus Anda ditahan selama klaim terhadapnya diperiksa.',
    'teach.tdHeldMany': 'Kursus Anda yang ditahan selama klaim terhadapnya diperiksa: {count}.',
    'teach.tdBelow':
      'Klaimnya ada di bawah, dengan kata-kata seperti saat dikirim, dan Anda dapat menjawabnya di sana.',
    'teach.lPromotions': 'Promosi',
    'teach.nPromotions':
      'jalankan penawaran untuk kursus Anda sendiri, di negara yang Anda pilih, dengan batas berapa kali satu keluarga boleh memakainya',
    'teach.scTitle': 'Pemeriksaan latar belakang',
    'teach.scStNone': 'Tidak ada pemeriksaan yang tersimpan',
    'teach.scStChecked': 'Sudah diperiksa',
    'teach.scStLapsed': 'Kedaluwarsa',
    'teach.scStFailed': 'Tidak lulus',
    'teach.scNone':
      'Belum ada pemeriksaan yang tersimpan untuk Anda. Siapa pun yang menunjuk pengajar mencatatnya: jenis pemeriksaan, tanggalnya, dan apakah pemeriksaan itu kedaluwarsa.',
    'teach.scFailedOn':
      'Pemeriksaan yang dicatat pada {date} tidak lulus. Orang yang mencatatnya dapat memberi tahu Anda apa yang terjadi selanjutnya.',
    'teach.scFailed':
      'Pemeriksaan yang dicatat pada akun Anda tidak lulus. Orang yang mencatatnya dapat memberi tahu Anda apa yang terjadi selanjutnya.',
    'teach.scLapsedOn': 'Pemeriksaan terakhir Anda kedaluwarsa pada {date}.',
    'teach.scLapsed': 'Pemeriksaan terakhir Anda sudah kedaluwarsa.',
    'teach.scHoldsFrom': 'Sebuah pemeriksaan dicatat pada {date} dan berlaku sampai {until}.',
    'teach.scHolds': 'Sebuah pemeriksaan dicatat dan berlaku sampai {until}.',
    'teach.scNoExpiryFrom':
      'Sebuah pemeriksaan dicatat pada {date}, tanpa tanggal kedaluwarsa yang disebutkan.',
    'teach.scNoExpiry': 'Sebuah pemeriksaan dicatat, tanpa tanggal kedaluwarsa yang disebutkan.',
    'teach.scKind': 'Jenis pemeriksaan, seperti yang dituliskan:',
    'teach.scBlocks':
      'Sampai ada pemeriksaan yang masih berlaku dicatat, kursus yang Anda tulis untuk anak-anak tidak dapat diterbitkan.',
    'teach.scNotAsked':
      'Platform tidak meminta pemeriksaan hari ini, jadi tidak ada apa pun di sini yang menghalangi kursus Anda diterbitkan. Jika itu berubah, halaman ini yang pertama mengatakannya.',
    'teach.scKept': 'Catatan ini disimpan sampai {date} lalu dihapus.',
    'teach.empty': 'Anda belum membuat kursus.',
    'teach.stDraft': 'Draf',
    'teach.stActive': 'Aktif',
    'teach.stRetired': 'Dihentikan',
    'teach.published': 'Diterbitkan',
    'teach.open': 'Buka kurikulum',
    'teach.lPaths': 'Jalur belajar',
    'teach.nPaths': 'susun rangkaian kursus yang aktif',
    'teach.lProfile': 'Profil publik pengajar',
    'teach.nProfile': 'perkenalkan diri Anda dan tautkan kanal sosial Anda',
    'teach.lMedia': 'Pustaka media',
    'teach.nMedia': 'unggah rekaman pelajaran dan lihat mana yang siap dipakai',
    'teach.lBoard': 'Diskusi guru',
    'teach.nBoard':
      'papan khusus untuk pengajar; Anda menulis di sana dengan nama pengguna, bukan nama Anda',
    'teach.lEarnings': 'Pendapatan',
    'teach.nEarnings':
      'apa yang dihasilkan kursus Anda, dalam tiap mata uang, dan penjualan di baliknya; belum ada yang dibayarkan, jadi ini catatan dan bukan saldo',
    'teach.lPayouts': 'Menerima pembayaran',
    'teach.nPayouts':
      'minta uang yang dihasilkan kursus Anda setelah keluar dari masa tahan pengembalian dana, dan lihat apa yang terjadi pada setiap permintaan sebelumnya',
    'teach.create': 'Buat',
    'teach.ncTitle': 'Kursus baru',
    'teach.ncField': 'Judul kursus',
    'teach.ncExample': 'Pengantar Tajwid',
    'teach.ncCreate': 'Buat kursus',
    'teach.ncCreating': 'Membuat…',
    'teach.ncETitle': 'Beri kursus ini judul.',
    'teach.ncEDuplicate': 'Kursus dengan nama itu sudah ada. Ubah judulnya sedikit lalu coba lagi.',
    'teach.ncERefused': 'Kursus tidak dibuat. Yang dikatakan basis data:',
    'teach.ncEUnsure':
      'Tidak ada yang dapat memastikan apakah kursus itu dibuat. Muat ulang halaman dan lihat kursus Anda sebelum membuatnya lagi.',
    'teach.ncESignedOut': 'Anda sudah keluar. Masuk lagi, lalu coba sekali lagi.',
    'teach.back': 'Kembali ke pembelajaran saya',
  },
  ms: {
    'teach.eyebrow': 'Pengajaran',
    'teach.notYetTitle': 'Ini ruang pengajaran',
    'teach.byAppointment': 'Mengajar di sini adalah melalui pelantikan.',
    'teach.byAppointmentBody':
      'Guru dilantik oleh pemilik. Sehingga itu akaun anda ialah akaun pelajar, dan akaun pelajar tidak boleh membuka kursus.',
    'teach.ask':
      'Anda boleh memohon: hantar kelayakan anda dan satu contoh pelajaran, dan pemilik membacanya. Memohon bukan bermakna dilantik. Tiada apa-apa diberikan sehingga seseorang memutuskan, secara bertulis.',
    'teach.apply': 'Mohon untuk mengajar',
    'teach.goLearning': 'Pergi ke pembelajaran saya',
    'teach.title': 'Kursus saya',
    'teach.lede':
      'Hak cipta bagi semua yang ada di sini kekal milik anda. Apa yang telah anda jual tidak ditarik balik: pelajar yang telah mendaftar mengekalkan akses mereka walaupun anda menamatkan kursus itu kemudian.',
    'teach.tdDecided': 'Satu notis tentang salah satu versi anda telah diputuskan.',
    'teach.tdHeldOne': 'Salah satu kursus anda ditahan sementara tuntutan terhadapnya diteliti.',
    'teach.tdHeldMany':
      'Kursus anda yang ditahan sementara tuntutan terhadapnya diteliti: {count}.',
    'teach.tdBelow':
      'Tuntutan itu ada di bawah, dalam perkataan seperti ia dihantar, dan anda boleh menjawabnya di sana.',
    'teach.lPromotions': 'Promosi',
    'teach.nPromotions':
      'jalankan tawaran untuk kursus anda sendiri, di negara yang anda pilih, dengan had bilangan kali sesebuah keluarga boleh menggunakannya',
    'teach.scTitle': 'Saringan',
    'teach.scStNone': 'Tiada saringan dalam simpanan',
    'teach.scStChecked': 'Telah disaring',
    'teach.scStLapsed': 'Luput',
    'teach.scStFailed': 'Tidak lulus',
    'teach.scNone':
      'Belum ada saringan dalam simpanan untuk anda. Sesiapa yang melantik guru merekodkannya: jenis saringan, tarikhnya, dan sama ada ia luput.',
    'teach.scFailedOn':
      'Saringan yang direkodkan pada {date} tidak lulus. Orang yang merekodkannya boleh memberitahu anda apa yang berlaku seterusnya.',
    'teach.scFailed':
      'Saringan yang direkodkan pada akaun anda tidak lulus. Orang yang merekodkannya boleh memberitahu anda apa yang berlaku seterusnya.',
    'teach.scLapsedOn': 'Saringan terakhir anda luput pada {date}.',
    'teach.scLapsed': 'Saringan terakhir anda telah luput.',
    'teach.scHoldsFrom': 'Satu saringan direkodkan pada {date} dan sah sehingga {until}.',
    'teach.scHolds': 'Satu saringan direkodkan dan sah sehingga {until}.',
    'teach.scNoExpiryFrom': 'Satu saringan direkodkan pada {date}, tanpa tarikh luput dinyatakan.',
    'teach.scNoExpiry': 'Satu saringan direkodkan, tanpa tarikh luput dinyatakan.',
    'teach.scKind': 'Jenis saringan, seperti yang ditulis:',
    'teach.scBlocks':
      'Sehingga saringan yang masih sah direkodkan, kursus yang anda tulis untuk kanak-kanak tidak boleh diterbitkan.',
    'teach.scNotAsked':
      'Platform tidak meminta saringan hari ini, jadi tiada apa-apa di sini yang menghalang kursus anda diterbitkan. Jika itu berubah, halaman ini yang akan menyatakannya dahulu.',
    'teach.scKept': 'Rekod ini disimpan sehingga {date} dan kemudian dipadam.',
    'teach.empty': 'Anda belum mencipta kursus.',
    'teach.stDraft': 'Draf',
    'teach.stActive': 'Aktif',
    'teach.stRetired': 'Ditamatkan',
    'teach.published': 'Diterbitkan',
    'teach.open': 'Buka kurikulum',
    'teach.lPaths': 'Laluan pembelajaran',
    'teach.nPaths': 'susun satu rangkaian kursus yang aktif',
    'teach.lProfile': 'Profil awam guru',
    'teach.nProfile': 'perkenalkan diri anda dan pautkan saluran sosial anda',
    'teach.lMedia': 'Pustaka media',
    'teach.nMedia': 'muat naik rakaman pelajaran dan lihat yang mana sedia digunakan',
    'teach.lBoard': 'Perbincangan guru',
    'teach.nBoard':
      'papan untuk guru sahaja; anda menulis di sana dengan nama pengguna, bukan nama anda',
    'teach.lEarnings': 'Pendapatan',
    'teach.nEarnings':
      'apa yang diperoleh kursus anda, dalam setiap mata wang, dan jualan di sebaliknya; belum ada yang dibayar, jadi ini rekod dan bukan baki',
    'teach.lPayouts': 'Menerima bayaran',
    'teach.nPayouts':
      'minta wang yang diperoleh kursus anda setelah ia keluar daripada tempoh tahanan bayaran balik, dan lihat apa yang berlaku kepada setiap permintaan terdahulu',
    'teach.create': 'Cipta',
    'teach.ncTitle': 'Kursus baharu',
    'teach.ncField': 'Tajuk kursus',
    'teach.ncExample': 'Pengenalan kepada Tajwid',
    'teach.ncCreate': 'Cipta kursus',
    'teach.ncCreating': 'Sedang mencipta…',
    'teach.ncETitle': 'Berikan tajuk kepada kursus ini.',
    'teach.ncEDuplicate': 'Kursus dengan nama itu sudah wujud. Ubah tajuk sedikit dan cuba lagi.',
    'teach.ncERefused': 'Kursus tidak dicipta. Apa yang dikatakan oleh pangkalan data:',
    'teach.ncEUnsure':
      'Tiada sesiapa dapat memastikan sama ada kursus itu dicipta. Muat semula halaman dan lihat kursus anda sebelum menciptanya lagi.',
    'teach.ncESignedOut': 'Anda telah log keluar. Log masuk semula, kemudian cuba sekali lagi.',
    'teach.back': 'Kembali ke pembelajaran saya',
  },
  bn: {
    'teach.eyebrow': 'শিক্ষাদান',
    'teach.notYetTitle': 'এটি শিক্ষাদানের জায়গা',
    'teach.byAppointment': 'এখানে পড়ানো হয় নিয়োগের মাধ্যমে।',
    'teach.byAppointmentBody':
      'শিক্ষককে নিয়োগ দেন মালিক। ততদিন আপনার অ্যাকাউন্ট একজন শিক্ষার্থীর, আর শিক্ষার্থীর অ্যাকাউন্ট কোর্স খুলতে পারে না।',
    'teach.ask':
      'আপনি আবেদন করতে পারেন: আপনার যোগ্যতা ও একটি নমুনা পাঠ পাঠান, মালিক সেগুলো পড়েন। আবেদন করা মানে নিয়োগ পাওয়া নয়। কেউ লিখিতভাবে সিদ্ধান্ত না নেওয়া পর্যন্ত কিছুই দেওয়া হয় না।',
    'teach.apply': 'পড়ানোর জন্য আবেদন করুন',
    'teach.goLearning': 'আমার শেখায় যান',
    'teach.title': 'আমার কোর্স',
    'teach.lede':
      'এখানকার সবকিছুর কপিরাইট আপনারই থাকে। আপনি আগে যা বিক্রি করেছেন তা ফিরিয়ে নেওয়া হয় না: পরে কোর্সটি তুলে নিলেও ভর্তি হওয়া শিক্ষার্থীদের প্রবেশাধিকার থাকে।',
    'teach.tdDecided': 'আপনার একটি সংস্করণ নিয়ে আসা একটি নোটিশের সিদ্ধান্ত হয়েছে।',
    'teach.tdHeldOne':
      'আপনার একটি কোর্স আটকে রাখা হয়েছে, যতক্ষণ তার বিরুদ্ধে একটি দাবি খতিয়ে দেখা হচ্ছে।',
    'teach.tdHeldMany':
      'আপনার যে কোর্সগুলো তাদের বিরুদ্ধে দাবি খতিয়ে দেখা পর্যন্ত আটকে আছে: {count}।',
    'teach.tdBelow':
      'দাবিটি নিচে আছে, যে কথায় পাঠানো হয়েছিল সেই কথায়, এবং সেখানেই আপনি উত্তর দিতে পারেন।',
    'teach.lPromotions': 'প্রচার-অফার',
    'teach.nPromotions':
      'নিজের কোর্সে অফার চালান, আপনার বেছে নেওয়া দেশে, একটি পরিবার কতবার তা ব্যবহার করতে পারবে তার সীমাসহ',
    'teach.scTitle': 'যাচাই',
    'teach.scStNone': 'নথিতে কোনো যাচাই নেই',
    'teach.scStChecked': 'যাচাই হয়েছে',
    'teach.scStLapsed': 'মেয়াদ শেষ',
    'teach.scStFailed': 'উত্তীর্ণ হয়নি',
    'teach.scNone':
      'আপনার কোনো যাচাই এখনো নথিতে নেই। যিনি শিক্ষক নিয়োগ দেন তিনিই তা নথিভুক্ত করেন: যাচাইয়ের ধরন, তারিখ, এবং তার মেয়াদ শেষ হয় কি না।',
    'teach.scFailedOn':
      '{date} তারিখে নথিভুক্ত একটি যাচাই উত্তীর্ণ হয়নি। যিনি এটি নথিভুক্ত করেছেন তিনি বলতে পারবেন এরপর কী হবে।',
    'teach.scFailed':
      'আপনার অ্যাকাউন্টে নথিভুক্ত একটি যাচাই উত্তীর্ণ হয়নি। যিনি এটি নথিভুক্ত করেছেন তিনি বলতে পারবেন এরপর কী হবে।',
    'teach.scLapsedOn': 'আপনার শেষ যাচাইয়ের মেয়াদ {date} তারিখে শেষ হয়েছে।',
    'teach.scLapsed': 'আপনার শেষ যাচাইয়ের মেয়াদ শেষ হয়ে গেছে।',
    'teach.scHoldsFrom': '{date} তারিখে একটি যাচাই নথিভুক্ত হয়েছে এবং {until} পর্যন্ত বহাল থাকবে।',
    'teach.scHolds': 'একটি যাচাই নথিভুক্ত হয়েছে এবং {until} পর্যন্ত বহাল থাকবে।',
    'teach.scNoExpiryFrom':
      '{date} তারিখে একটি যাচাই নথিভুক্ত হয়েছে, মেয়াদ শেষের কোনো তারিখ বলা হয়নি।',
    'teach.scNoExpiry': 'একটি যাচাই নথিভুক্ত হয়েছে, মেয়াদ শেষের কোনো তারিখ বলা হয়নি।',
    'teach.scKind': 'যাচাইয়ের ধরন, যেমন লেখা হয়েছিল:',
    'teach.scBlocks':
      'চলমান কোনো যাচাই নথিভুক্ত না হওয়া পর্যন্ত, শিশুদের জন্য আপনার লেখা কোর্স প্রকাশ করা যাবে না।',
    'teach.scNotAsked':
      'প্ল্যাটফর্ম আজ কোনো যাচাই চাইছে না, তাই এখানকার কিছুই আপনার কোর্স প্রকাশে বাধা দেয় না। তা বদলালে এই পাতাই প্রথমে জানাবে।',
    'teach.scKept': 'এই নথি {date} পর্যন্ত রাখা হয়, তারপর মুছে ফেলা হয়।',
    'teach.empty': 'আপনি এখনো কোনো কোর্স তৈরি করেননি।',
    'teach.stDraft': 'খসড়া',
    'teach.stActive': 'সক্রিয়',
    'teach.stRetired': 'তুলে নেওয়া',
    'teach.published': 'প্রকাশিত',
    'teach.open': 'পাঠ্যক্রম খুলুন',
    'teach.lPaths': 'শেখার পথ',
    'teach.nPaths': 'সক্রিয় কোর্সগুলোর একটি ধারাক্রম সাজান',
    'teach.lProfile': 'শিক্ষকের প্রকাশ্য প্রোফাইল',
    'teach.nProfile': 'নিজের পরিচয় দিন এবং আপনার সামাজিক চ্যানেলগুলোর লিংক দিন',
    'teach.lMedia': 'মিডিয়া লাইব্রেরি',
    'teach.nMedia': 'পাঠের রেকর্ডিং আপলোড করুন এবং দেখুন কোনগুলো ব্যবহারের জন্য প্রস্তুত',
    'teach.lBoard': 'শিক্ষকদের আলোচনা',
    'teach.nBoard': 'শুধু শিক্ষকদের বোর্ড; সেখানে আপনি নিজের নামে নয়, একটি ব্যবহারকারী-নামে লেখেন',
    'teach.lEarnings': 'আয়',
    'teach.nEarnings':
      'আপনার কোর্সগুলো প্রতিটি মুদ্রায় যা আয় করেছে, এবং তার পেছনের বিক্রি; এখনো কিছু পরিশোধ করা হয় না, তাই এটি নথি, ব্যালান্স নয়',
    'teach.lPayouts': 'পরিশোধ নেওয়া',
    'teach.nPayouts':
      'আপনার কোর্সের আয় অর্থ ফেরতের আটক থেকে বেরোলে তা চেয়ে নিন, এবং আগের প্রতিটি অনুরোধের কী হলো তা দেখুন',
    'teach.create': 'তৈরি করুন',
    'teach.ncTitle': 'নতুন কোর্স',
    'teach.ncField': 'কোর্সের শিরোনাম',
    'teach.ncExample': 'তাজবিদ পরিচিতি',
    'teach.ncCreate': 'কোর্স তৈরি করুন',
    'teach.ncCreating': 'তৈরি হচ্ছে…',
    'teach.ncETitle': 'কোর্সটির একটি শিরোনাম দিন।',
    'teach.ncEDuplicate': 'এই নামে একটি কোর্স আগে থেকেই আছে। শিরোনাম একটু বদলে আবার চেষ্টা করুন।',
    'teach.ncERefused': 'কোর্সটি তৈরি হয়নি। ডেটাবেস যা বলেছে:',
    'teach.ncEUnsure':
      'কোর্সটি তৈরি হয়েছে কি না কেউ বলতে পারে না। পাতাটি আবার লোড করুন এবং আবার তৈরি করার আগে আপনার কোর্সগুলো দেখে নিন।',
    'teach.ncESignedOut': 'আপনি সাইন আউট হয়ে গেছেন। আবার সাইন ইন করুন, তারপর আরেকবার চেষ্টা করুন।',
    'teach.back': 'আমার শেখায় ফিরে যান',
  },
  hi: {
    'teach.eyebrow': 'अध्यापन',
    'teach.notYetTitle': 'यह अध्यापन का क्षेत्र है',
    'teach.byAppointment': 'यहाँ पढ़ाना नियुक्ति से होता है।',
    'teach.byAppointmentBody':
      'शिक्षक को मालिक नियुक्त करता है। तब तक आपका खाता एक शिक्षार्थी का है, और शिक्षार्थी का खाता कोर्स नहीं खोल सकता।',
    'teach.ask':
      'आप आवेदन कर सकते हैं: अपनी योग्यताएँ और एक नमूना पाठ भेजें, मालिक उन्हें पढ़ता है। आवेदन करना नियुक्त होना नहीं है। जब तक कोई लिखित में निर्णय न करे, कुछ नहीं दिया जाता।',
    'teach.apply': 'पढ़ाने के लिए आवेदन करें',
    'teach.goLearning': 'मेरी पढ़ाई पर जाएँ',
    'teach.title': 'मेरे कोर्स',
    'teach.lede':
      'यहाँ की हर चीज़ का प्रतिलिप्यधिकार आपके पास रहता है। जो आप पहले बेच चुके हैं वह वापस नहीं लिया जाता: नामांकित शिक्षार्थियों की पहुँच बनी रहती है, भले ही आप बाद में कोर्स हटा लें।',
    'teach.tdDecided': 'आपके एक संस्करण से जुड़े नोटिस पर निर्णय हो गया।',
    'teach.tdHeldOne':
      'आपका एक कोर्स तब तक रोका गया है जब तक उसके विरुद्ध एक दावे को देखा जा रहा है।',
    'teach.tdHeldMany': 'आपके कोर्स जो अपने विरुद्ध दावों के देखे जाने तक रोके गए हैं: {count}।',
    'teach.tdBelow':
      'दावा नीचे है, उन्हीं शब्दों में जिनमें भेजा गया था, और आप वहीं उसका उत्तर दे सकते हैं।',
    'teach.lPromotions': 'प्रमोशन',
    'teach.nPromotions':
      'अपने कोर्स पर ऑफ़र चलाएँ, उन देशों में जो आप चुनें, और इस सीमा के साथ कि एक परिवार उसे कितनी बार इस्तेमाल कर सकता है',
    'teach.scTitle': 'जाँच',
    'teach.scStNone': 'अभिलेख में कोई जाँच नहीं',
    'teach.scStChecked': 'जाँच हो गई',
    'teach.scStLapsed': 'अवधि समाप्त',
    'teach.scStFailed': 'उत्तीर्ण नहीं हुई',
    'teach.scNone':
      'आपकी कोई जाँच अभी अभिलेख में नहीं है। जो शिक्षकों को नियुक्त करता है वही इसे दर्ज करता है: जाँच का प्रकार, तारीख़, और यह कि उसकी अवधि समाप्त होती है या नहीं।',
    'teach.scFailedOn':
      '{date} को दर्ज की गई जाँच उत्तीर्ण नहीं हुई। जिसने इसे दर्ज किया वह बता सकता है कि आगे क्या होगा।',
    'teach.scFailed':
      'आपके खाते पर दर्ज की गई एक जाँच उत्तीर्ण नहीं हुई। जिसने इसे दर्ज किया वह बता सकता है कि आगे क्या होगा।',
    'teach.scLapsedOn': 'आपकी पिछली जाँच की अवधि {date} को समाप्त हो गई।',
    'teach.scLapsed': 'आपकी पिछली जाँच की अवधि समाप्त हो चुकी है।',
    'teach.scHoldsFrom': 'एक जाँच {date} को दर्ज की गई और {until} तक मान्य है।',
    'teach.scHolds': 'एक जाँच दर्ज की गई और {until} तक मान्य है।',
    'teach.scNoExpiryFrom': 'एक जाँच {date} को दर्ज की गई, और समाप्ति की कोई तारीख़ नहीं बताई गई।',
    'teach.scNoExpiry': 'एक जाँच दर्ज की गई, और समाप्ति की कोई तारीख़ नहीं बताई गई।',
    'teach.scKind': 'जाँच का प्रकार, जैसा लिखा गया था:',
    'teach.scBlocks':
      'जब तक कोई मान्य जाँच दर्ज नहीं होती, बच्चों के लिए आपका लिखा कोर्स प्रकाशित नहीं हो सकता।',
    'teach.scNotAsked':
      'मंच आज जाँच नहीं माँग रहा, इसलिए यहाँ कुछ भी आपके कोर्स के प्रकाशन को नहीं रोकता। अगर यह बदला तो यह पेज सबसे पहले बताएगा।',
    'teach.scKept': 'यह अभिलेख {date} तक रखा जाता है और फिर हटा दिया जाता है।',
    'teach.empty': 'आपने अभी तक कोई कोर्स नहीं बनाया है।',
    'teach.stDraft': 'ड्राफ़्ट',
    'teach.stActive': 'सक्रिय',
    'teach.stRetired': 'हटा लिया गया',
    'teach.published': 'प्रकाशित',
    'teach.open': 'पाठ्यक्रम खोलें',
    'teach.lPaths': 'सीखने के मार्ग',
    'teach.nPaths': 'सक्रिय कोर्सों का एक क्रम बनाएँ',
    'teach.lProfile': 'शिक्षक की सार्वजनिक प्रोफ़ाइल',
    'teach.nProfile': 'अपना परिचय दें और अपने सोशल चैनलों के लिंक जोड़ें',
    'teach.lMedia': 'मीडिया लाइब्रेरी',
    'teach.nMedia': 'पाठों की रिकॉर्डिंग अपलोड करें और देखें कि कौन-सी इस्तेमाल के लिए तैयार हैं',
    'teach.lBoard': 'शिक्षकों की चर्चा',
    'teach.nBoard': 'केवल शिक्षकों का बोर्ड; वहाँ आप अपने नाम से नहीं, उपयोगकर्ता नाम से लिखते हैं',
    'teach.lEarnings': 'कमाई',
    'teach.nEarnings':
      'आपके कोर्सों ने हर मुद्रा में जो कमाया, और उसके पीछे की बिक्री; अभी कुछ भी भुगतान नहीं किया जाता, इसलिए यह अभिलेख है, शेष राशि नहीं',
    'teach.lPayouts': 'भुगतान पाना',
    'teach.nPayouts':
      'अपने कोर्सों की कमाई तब माँगें जब वह रिफ़ंड की रोक से बाहर आ जाए, और देखें कि हर पिछले अनुरोध का क्या हुआ',
    'teach.create': 'बनाएँ',
    'teach.ncTitle': 'नया कोर्स',
    'teach.ncField': 'कोर्स का शीर्षक',
    'teach.ncExample': 'तजवीद का परिचय',
    'teach.ncCreate': 'कोर्स बनाएँ',
    'teach.ncCreating': 'बनाया जा रहा है…',
    'teach.ncETitle': 'कोर्स को एक शीर्षक दें।',
    'teach.ncEDuplicate': 'इस नाम का कोर्स पहले से मौजूद है। शीर्षक थोड़ा बदलें और फिर कोशिश करें।',
    'teach.ncERefused': 'कोर्स नहीं बना। डेटाबेस ने यह कहा:',
    'teach.ncEUnsure':
      'कोई नहीं बता सकता कि कोर्स बना या नहीं। पेज फिर से लोड करें और दोबारा बनाने से पहले अपने कोर्स देख लें।',
    'teach.ncESignedOut': 'आप साइन आउट हो चुके हैं। फिर से साइन इन करें, फिर एक बार और कोशिश करें।',
    'teach.back': 'मेरी पढ़ाई पर वापस',
  },
  fr: {
    'teach.eyebrow': 'Enseignement',
    'teach.notYetTitle': 'Voici l’espace d’enseignement',
    'teach.byAppointment': 'On enseigne ici sur nomination.',
    'teach.byAppointmentBody':
      'C’est le propriétaire qui nomme un enseignant. D’ici là, votre compte est celui d’un apprenant, et un compte d’apprenant ne peut pas ouvrir de cours.',
    'teach.ask':
      'Vous pouvez le demander : envoyez vos qualifications et une leçon d’exemple, et le propriétaire les lit. Postuler n’est pas être nommé. Rien n’est accordé tant que quelqu’un n’a pas décidé, par écrit.',
    'teach.apply': 'Postuler pour enseigner',
    'teach.goLearning': 'Aller à mon apprentissage',
    'teach.title': 'Mes cours',
    'teach.lede':
      'Vous gardez le droit d’auteur sur tout ce qui est ici. Rien de ce que vous avez déjà vendu n’est repris : les apprenants inscrits gardent leur accès même si vous retirez le cours plus tard.',
    'teach.tdDecided': 'Une notification concernant l’une de vos versions a été tranchée.',
    'teach.tdHeldOne':
      'L’un de vos cours est suspendu pendant l’examen d’une réclamation qui le vise.',
    'teach.tdHeldMany':
      'Vos cours suspendus pendant l’examen des réclamations qui les visent : {count}.',
    'teach.tdBelow':
      'La réclamation est ci-dessous, dans les mots où elle a été envoyée, et vous pouvez y répondre à cet endroit.',
    'teach.lPromotions': 'Promotions',
    'teach.nPromotions':
      'proposez une offre sur vos propres cours, dans les pays que vous choisissez, avec une limite au nombre de fois où une famille peut l’utiliser',
    'teach.scTitle': 'Vérification',
    'teach.scStNone': 'Aucune vérification au dossier',
    'teach.scStChecked': 'Vérifié',
    'teach.scStLapsed': 'Expirée',
    'teach.scStFailed': 'Non concluante',
    'teach.scNone':
      'Aucune vérification n’est encore à votre dossier. La personne qui nomme les enseignants l’enregistre : le type de vérification, la date, et si elle expire.',
    'teach.scFailedOn':
      'Une vérification enregistrée le {date} n’a pas été concluante. La personne qui l’a enregistrée peut vous dire ce qui se passe ensuite.',
    'teach.scFailed':
      'Une vérification enregistrée sur votre compte n’a pas été concluante. La personne qui l’a enregistrée peut vous dire ce qui se passe ensuite.',
    'teach.scLapsedOn': 'Votre dernière vérification a expiré le {date}.',
    'teach.scLapsed': 'Votre dernière vérification a expiré.',
    'teach.scHoldsFrom': 'Une vérification a été enregistrée le {date} et vaut jusqu’au {until}.',
    'teach.scHolds': 'Une vérification a été enregistrée et vaut jusqu’au {until}.',
    'teach.scNoExpiryFrom':
      'Une vérification a été enregistrée le {date}, sans date d’expiration indiquée.',
    'teach.scNoExpiry': 'Une vérification a été enregistrée, sans date d’expiration indiquée.',
    'teach.scKind': 'Le type de vérification, tel qu’il a été noté :',
    'teach.scBlocks':
      'Tant qu’une vérification en cours de validité n’est pas enregistrée, un cours que vous écrivez pour des enfants ne peut pas être publié.',
    'teach.scNotAsked':
      'La plateforme ne demande pas de vérification aujourd’hui ; rien ici n’empêche donc la publication d’un de vos cours. Si cela change, cette page le dira en premier.',
    'teach.scKept': 'Cet enregistrement est conservé jusqu’au {date}, puis supprimé.',
    'teach.empty': 'Vous n’avez pas encore créé de cours.',
    'teach.stDraft': 'Brouillon',
    'teach.stActive': 'Actif',
    'teach.stRetired': 'Retiré',
    'teach.published': 'Publié',
    'teach.open': 'Ouvrir le programme',
    'teach.lPaths': 'Parcours d’apprentissage',
    'teach.nPaths': 'composez une suite de cours actifs',
    'teach.lProfile': 'Profil public d’enseignant',
    'teach.nProfile': 'présentez-vous et ajoutez les liens de vos réseaux sociaux',
    'teach.lMedia': 'Médiathèque',
    'teach.nMedia': 'envoyez des enregistrements de leçons et voyez lesquels sont prêts à servir',
    'teach.lBoard': 'Discussion des enseignants',
    'teach.nBoard':
      'le forum réservé aux enseignants ; vous y écrivez sous un pseudonyme, pas sous votre nom',
    'teach.lEarnings': 'Revenus',
    'teach.nEarnings':
      'ce que vos cours ont rapporté, dans chaque devise, et les ventes correspondantes ; rien n’est encore versé, c’est donc le relevé et non un solde',
    'teach.lPayouts': 'Être payé',
    'teach.nPayouts':
      'demandez l’argent que vos cours ont rapporté une fois sorti de sa retenue pour remboursement, et voyez ce qu’il est advenu de chaque demande précédente',
    'teach.create': 'Créer',
    'teach.ncTitle': 'Nouveau cours',
    'teach.ncField': 'Titre du cours',
    'teach.ncExample': 'Introduction au tajwid',
    'teach.ncCreate': 'Créer le cours',
    'teach.ncCreating': 'Création…',
    'teach.ncETitle': 'Donnez un titre au cours.',
    'teach.ncEDuplicate':
      'Un cours portant ce nom existe déjà. Modifiez un peu le titre et réessayez.',
    'teach.ncERefused': 'Le cours n’a pas été créé. Ce qu’a dit la base de données :',
    'teach.ncEUnsure':
      'Personne ne peut dire si le cours a été créé. Rechargez la page et regardez vos cours avant de le créer à nouveau.',
    'teach.ncESignedOut': 'Votre session est fermée. Reconnectez-vous, puis réessayez une fois.',
    'teach.back': 'Retour à mon apprentissage',
  },
  es: {
    'teach.eyebrow': 'Enseñanza',
    'teach.notYetTitle': 'Esta es el área de enseñanza',
    'teach.byAppointment': 'Aquí se enseña por nombramiento.',
    'teach.byAppointmentBody':
      'Es el propietario quien nombra a un docente. Hasta entonces su cuenta es de estudiante, y una cuenta de estudiante no puede abrir un curso.',
    'teach.ask':
      'Puede solicitarlo: envíe sus cualificaciones y una lección de muestra, y el propietario las lee. Solicitar no es ser nombrado. No se concede nada hasta que alguien decide, por escrito.',
    'teach.apply': 'Solicitar enseñar',
    'teach.goLearning': 'Ir a mi aprendizaje',
    'teach.title': 'Mis cursos',
    'teach.lede':
      'Usted conserva los derechos de autor de todo lo que hay aquí. Nada de lo que ya ha vendido se retira: los estudiantes inscritos conservan su acceso aunque usted retire el curso más adelante.',
    'teach.tdDecided': 'Se ha resuelto un aviso sobre una de sus versiones.',
    'teach.tdHeldOne':
      'Uno de sus cursos está retenido mientras se examina una reclamación contra él.',
    'teach.tdHeldMany':
      'Cursos suyos retenidos mientras se examinan las reclamaciones contra ellos: {count}.',
    'teach.tdBelow':
      'La reclamación está abajo, con las palabras con que se envió, y puede responderla allí.',
    'teach.lPromotions': 'Promociones',
    'teach.nPromotions':
      'ponga una oferta en sus propios cursos, en los países que elija, con un límite de veces que una familia puede usarla',
    'teach.scTitle': 'Comprobación de antecedentes',
    'teach.scStNone': 'Ninguna comprobación archivada',
    'teach.scStChecked': 'Comprobado',
    'teach.scStLapsed': 'Caducada',
    'teach.scStFailed': 'No superada',
    'teach.scNone':
      'Todavía no hay ninguna comprobación archivada sobre usted. Quien nombra a los docentes la registra: el tipo de comprobación, la fecha y si caduca.',
    'teach.scFailedOn':
      'Una comprobación registrada el {date} no se superó. Quien la registró puede decirle qué ocurre ahora.',
    'teach.scFailed':
      'Una comprobación registrada en su cuenta no se superó. Quien la registró puede decirle qué ocurre ahora.',
    'teach.scLapsedOn': 'Su última comprobación caducó el {date}.',
    'teach.scLapsed': 'Su última comprobación ha caducado.',
    'teach.scHoldsFrom': 'Se registró una comprobación el {date} y es válida hasta el {until}.',
    'teach.scHolds': 'Se registró una comprobación y es válida hasta el {until}.',
    'teach.scNoExpiryFrom':
      'Se registró una comprobación el {date}, sin fecha de caducidad indicada.',
    'teach.scNoExpiry': 'Se registró una comprobación, sin fecha de caducidad indicada.',
    'teach.scKind': 'El tipo de comprobación, tal como se anotó:',
    'teach.scBlocks':
      'Hasta que se registre una comprobación vigente, un curso que usted escriba para niños no puede publicarse.',
    'teach.scNotAsked':
      'La plataforma no pide hoy ninguna comprobación, así que nada aquí impide que se publique un curso suyo. Si eso cambia, esta página lo dirá primero.',
    'teach.scKept': 'Este registro se conserva hasta el {date} y después se elimina.',
    'teach.empty': 'Todavía no ha creado ningún curso.',
    'teach.stDraft': 'Borrador',
    'teach.stActive': 'Activo',
    'teach.stRetired': 'Retirado',
    'teach.published': 'Publicado',
    'teach.open': 'Abrir el plan de estudios',
    'teach.lPaths': 'Rutas de aprendizaje',
    'teach.nPaths': 'organice una secuencia de cursos activos',
    'teach.lProfile': 'Perfil público de docente',
    'teach.nProfile': 'preséntese y enlace sus canales sociales',
    'teach.lMedia': 'Biblioteca multimedia',
    'teach.nMedia': 'suba grabaciones de lecciones y vea cuáles están listas para usarse',
    'teach.lBoard': 'Debate de docentes',
    'teach.nBoard':
      'el foro solo para docentes; allí escribe con un nombre de usuario, no con su nombre',
    'teach.lEarnings': 'Ingresos',
    'teach.nEarnings':
      'lo que han ganado sus cursos, en cada moneda, y las ventas que hay detrás; todavía no se paga nada, así que esto es el registro y no un saldo',
    'teach.lPayouts': 'Cobrar',
    'teach.nPayouts':
      'pida el dinero que han ganado sus cursos una vez que salga de su retención por reembolso, y vea qué pasó con cada solicitud anterior',
    'teach.create': 'Crear',
    'teach.ncTitle': 'Curso nuevo',
    'teach.ncField': 'Título del curso',
    'teach.ncExample': 'Introducción al tajwid',
    'teach.ncCreate': 'Crear curso',
    'teach.ncCreating': 'Creando…',
    'teach.ncETitle': 'Ponga un título al curso.',
    'teach.ncEDuplicate':
      'Ya existe un curso con ese nombre. Cambie un poco el título e inténtelo de nuevo.',
    'teach.ncERefused': 'El curso no se creó. Lo que dijo la base de datos:',
    'teach.ncEUnsure':
      'Nadie puede decir si el curso se creó. Vuelva a cargar la página y mire sus cursos antes de crearlo otra vez.',
    'teach.ncESignedOut':
      'Su sesión está cerrada. Inicie sesión de nuevo y vuelva a intentarlo una vez.',
    'teach.back': 'Volver a mi aprendizaje',
  },
  pt: {
    'teach.eyebrow': 'Ensino',
    'teach.notYetTitle': 'Esta é a área de ensino',
    'teach.byAppointment': 'Ensina-se aqui por nomeação.',
    'teach.byAppointmentBody':
      'É o proprietário quem nomeia um professor. Até lá, a sua conta é de aprendente, e uma conta de aprendente não pode abrir um curso.',
    'teach.ask':
      'Pode pedir: envie as suas qualificações e uma aula de exemplo, e o proprietário lê-as. Candidatar-se não é ser nomeado. Nada é concedido até alguém decidir, por escrito.',
    'teach.apply': 'Candidatar-se a ensinar',
    'teach.goLearning': 'Ir para a minha aprendizagem',
    'teach.title': 'Os meus cursos',
    'teach.lede':
      'Mantém os direitos de autor sobre tudo o que aqui está. Nada do que já vendeu é retirado: os aprendentes inscritos mantêm o acesso mesmo que retire o curso mais tarde.',
    'teach.tdDecided': 'Foi decidido um aviso sobre uma das suas versões.',
    'teach.tdHeldOne':
      'Um dos seus cursos está retido enquanto uma reclamação contra ele é analisada.',
    'teach.tdHeldMany':
      'Cursos seus retidos enquanto as reclamações contra eles são analisadas: {count}.',
    'teach.tdBelow':
      'A reclamação está abaixo, nas palavras em que foi enviada, e pode responder-lhe aí.',
    'teach.lPromotions': 'Promoções',
    'teach.nPromotions':
      'lance uma oferta nos seus próprios cursos, nos países que escolher, com um limite de vezes que uma família a pode usar',
    'teach.scTitle': 'Verificação de antecedentes',
    'teach.scStNone': 'Nenhuma verificação em arquivo',
    'teach.scStChecked': 'Verificado',
    'teach.scStLapsed': 'Caducada',
    'teach.scStFailed': 'Não aprovada',
    'teach.scNone':
      'Ainda não há nenhuma verificação em arquivo a seu respeito. Quem nomeia os professores regista-a: o tipo de verificação, a data e se caduca.',
    'teach.scFailedOn':
      'Uma verificação registada em {date} não foi aprovada. Quem a registou pode dizer-lhe o que acontece a seguir.',
    'teach.scFailed':
      'Uma verificação registada na sua conta não foi aprovada. Quem a registou pode dizer-lhe o que acontece a seguir.',
    'teach.scLapsedOn': 'A sua última verificação caducou em {date}.',
    'teach.scLapsed': 'A sua última verificação caducou.',
    'teach.scHoldsFrom': 'Foi registada uma verificação em {date}, válida até {until}.',
    'teach.scHolds': 'Foi registada uma verificação, válida até {until}.',
    'teach.scNoExpiryFrom':
      'Foi registada uma verificação em {date}, sem data de caducidade indicada.',
    'teach.scNoExpiry': 'Foi registada uma verificação, sem data de caducidade indicada.',
    'teach.scKind': 'O tipo de verificação, tal como foi escrito:',
    'teach.scBlocks':
      'Até ser registada uma verificação válida, um curso que escreva para crianças não pode ser publicado.',
    'teach.scNotAsked':
      'A plataforma não está a pedir uma verificação hoje, por isso nada aqui impede que um curso seu seja publicado. Se isso mudar, esta página di-lo primeiro.',
    'teach.scKept': 'Este registo é guardado até {date} e depois eliminado.',
    'teach.empty': 'Ainda não criou nenhum curso.',
    'teach.stDraft': 'Rascunho',
    'teach.stActive': 'Ativo',
    'teach.stRetired': 'Retirado',
    'teach.published': 'Publicado',
    'teach.open': 'Abrir o currículo',
    'teach.lPaths': 'Percursos de aprendizagem',
    'teach.nPaths': 'organize uma sequência de cursos ativos',
    'teach.lProfile': 'Perfil público de professor',
    'teach.nProfile': 'apresente-se e ligue os seus canais sociais',
    'teach.lMedia': 'Biblioteca multimédia',
    'teach.nMedia': 'carregue gravações de aulas e veja quais estão prontas a usar',
    'teach.lBoard': 'Discussão dos professores',
    'teach.nBoard':
      'o fórum só para professores; aí escreve com um nome de utilizador, não com o seu nome',
    'teach.lEarnings': 'Ganhos',
    'teach.nEarnings':
      'o que os seus cursos renderam, em cada moeda, e as vendas por trás disso; ainda nada é pago, por isso isto é o registo e não um saldo',
    'teach.lPayouts': 'Receber',
    'teach.nPayouts':
      'peça o dinheiro que os seus cursos renderam depois de sair da retenção para reembolso, e veja o que aconteceu a cada pedido anterior',
    'teach.create': 'Criar',
    'teach.ncTitle': 'Novo curso',
    'teach.ncField': 'Título do curso',
    'teach.ncExample': 'Introdução ao tajwid',
    'teach.ncCreate': 'Criar curso',
    'teach.ncCreating': 'A criar…',
    'teach.ncETitle': 'Dê um título ao curso.',
    'teach.ncEDuplicate':
      'Já existe um curso com esse nome. Altere um pouco o título e tente de novo.',
    'teach.ncERefused': 'O curso não foi criado. O que a base de dados disse:',
    'teach.ncEUnsure':
      'Ninguém pode dizer se o curso foi criado. Volte a carregar a página e veja os seus cursos antes de o criar outra vez.',
    'teach.ncESignedOut': 'A sua sessão terminou. Inicie sessão de novo e tente mais uma vez.',
    'teach.back': 'Voltar à minha aprendizagem',
  },
  sw: {
    'teach.eyebrow': 'Ufundishaji',
    'teach.notYetTitle': 'Hili ni eneo la ufundishaji',
    'teach.byAppointment': 'Kufundisha hapa ni kwa kuteuliwa.',
    'teach.byAppointmentBody':
      'Mwalimu huteuliwa na mmiliki. Hadi hapo akaunti yako ni ya mwanafunzi, na akaunti ya mwanafunzi haiwezi kufungua kozi.',
    'teach.ask':
      'Unaweza kuomba: tuma sifa zako na somo la mfano, na mmiliki atavisoma. Kuomba si kuteuliwa. Hakuna kinachotolewa hadi mtu aamue, kwa maandishi.',
    'teach.apply': 'Omba kufundisha',
    'teach.goLearning': 'Nenda kwenye masomo yangu',
    'teach.title': 'Kozi zangu',
    'teach.lede':
      'Hakimiliki ya kila kilichopo hapa inabaki kwako. Ulichokwisha kuuza hakirudishwi: wanafunzi waliojiandikisha wanabaki na ufikiaji wao hata ukiiondoa kozi baadaye.',
    'teach.tdDecided': 'Taarifa kuhusu mojawapo ya matoleo yako imeamuliwa.',
    'teach.tdHeldOne': 'Mojawapo ya kozi zako imezuiliwa wakati dai dhidi yake linachunguzwa.',
    'teach.tdHeldMany': 'Kozi zako zilizozuiliwa wakati madai dhidi yake yanachunguzwa: {count}.',
    'teach.tdBelow': 'Dai liko hapa chini, kwa maneno yaliyotumwa, na unaweza kulijibu hapo.',
    'teach.lPromotions': 'Ofa za matangazo',
    'teach.nPromotions':
      'endesha ofa kwenye kozi zako mwenyewe, katika nchi unazochagua, ukiwa na kikomo cha mara ambazo familia inaweza kuitumia',
    'teach.scTitle': 'Uchunguzi',
    'teach.scStNone': 'Hakuna uchunguzi kwenye kumbukumbu',
    'teach.scStChecked': 'Amekaguliwa',
    'teach.scStLapsed': 'Muda umeisha',
    'teach.scStFailed': 'Haukupita',
    'teach.scNone':
      'Bado hakuna uchunguzi kwenye kumbukumbu kukuhusu. Anayeteua walimu ndiye anayeurekodi: aina ya uchunguzi, tarehe, na kama muda wake unaisha.',
    'teach.scFailedOn':
      'Uchunguzi uliorekodiwa tarehe {date} haukupita. Aliyeurekodi anaweza kukuambia kinachofuata.',
    'teach.scFailed':
      'Uchunguzi uliorekodiwa kwenye akaunti yako haukupita. Aliyeurekodi anaweza kukuambia kinachofuata.',
    'teach.scLapsedOn': 'Muda wa uchunguzi wako wa mwisho uliisha tarehe {date}.',
    'teach.scLapsed': 'Muda wa uchunguzi wako wa mwisho umeisha.',
    'teach.scHoldsFrom': 'Uchunguzi ulirekodiwa tarehe {date} na unadumu hadi {until}.',
    'teach.scHolds': 'Uchunguzi ulirekodiwa na unadumu hadi {until}.',
    'teach.scNoExpiryFrom': 'Uchunguzi ulirekodiwa tarehe {date}, bila tarehe ya kuisha kutajwa.',
    'teach.scNoExpiry': 'Uchunguzi ulirekodiwa, bila tarehe ya kuisha kutajwa.',
    'teach.scKind': 'Aina ya uchunguzi, kama ilivyoandikwa:',
    'teach.scBlocks':
      'Hadi uchunguzi ambao muda wake haujaisha urekodiwe, kozi unayoandika kwa ajili ya watoto haiwezi kuchapishwa.',
    'teach.scNotAsked':
      'Jukwaa haliombi uchunguzi leo, kwa hiyo hakuna chochote hapa kinachozuia kozi yako kuchapishwa. Hilo likibadilika, ukurasa huu ndio utakaosema kwanza.',
    'teach.scKept': 'Rekodi hii inahifadhiwa hadi {date} kisha inafutwa.',
    'teach.empty': 'Bado hujaunda kozi.',
    'teach.stDraft': 'Rasimu',
    'teach.stActive': 'Inatumika',
    'teach.stRetired': 'Imeondolewa',
    'teach.published': 'Imechapishwa',
    'teach.open': 'Fungua mtaala',
    'teach.lPaths': 'Njia za kujifunza',
    'teach.nPaths': 'panga mfululizo wa kozi zinazotumika',
    'teach.lProfile': 'Wasifu wa mwalimu wa hadharani',
    'teach.nProfile': 'jitambulishe na uunganishe chaneli zako za kijamii',
    'teach.lMedia': 'Maktaba ya midia',
    'teach.nMedia': 'pakia rekodi za masomo na uone zipi ziko tayari kutumika',
    'teach.lBoard': 'Majadiliano ya walimu',
    'teach.nBoard': 'ubao wa walimu pekee; huko unaandika kwa jina la mtumiaji, si kwa jina lako',
    'teach.lEarnings': 'Mapato',
    'teach.nEarnings':
      'kile kozi zako zilichopata, kwa kila sarafu, na mauzo yaliyo nyuma yake; bado hakuna kinacholipwa, kwa hiyo hii ni rekodi, si salio',
    'teach.lPayouts': 'Kulipwa',
    'teach.nPayouts':
      'omba pesa ambazo kozi zako zimepata baada ya kutoka kwenye zuio la marejesho, na uone kilichotokea kwa kila ombi la awali',
    'teach.create': 'Unda',
    'teach.ncTitle': 'Kozi mpya',
    'teach.ncField': 'Kichwa cha kozi',
    'teach.ncExample': 'Utangulizi wa Tajwidi',
    'teach.ncCreate': 'Unda kozi',
    'teach.ncCreating': 'Inaunda…',
    'teach.ncETitle': 'Ipe kozi kichwa.',
    'teach.ncEDuplicate':
      'Kozi yenye jina hilo tayari ipo. Badilisha kichwa kidogo kisha ujaribu tena.',
    'teach.ncERefused': 'Kozi haikuundwa. Hifadhidata ilichosema:',
    'teach.ncEUnsure':
      'Hakuna anayeweza kusema kama kozi iliundwa. Pakia ukurasa upya na uangalie kozi zako kabla ya kuiunda tena.',
    'teach.ncESignedOut': 'Umetoka kwenye akaunti. Ingia tena, kisha ujaribu mara moja zaidi.',
    'teach.back': 'Rudi kwenye masomo yangu',
  },
  af: {
    'teach.eyebrow': 'Onderrig',
    'teach.notYetTitle': 'Dit is die onderrigarea',
    'teach.byAppointment': 'Onderrig hier is deur aanstelling.',
    'teach.byAppointmentBody':
      'Die eienaar stel ’n onderwyser aan. Tot dan is jou rekening ’n leerder s’n, en ’n leerder se rekening kan nie ’n kursus open nie.',
    'teach.ask':
      'Jy mag vra: stuur jou kwalifikasies en ’n voorbeeldles, en die eienaar lees dit. Om aansoek te doen is nie om aangestel te word nie. Niks word toegeken voordat iemand skriftelik besluit nie.',
    'teach.apply': 'Doen aansoek om te onderrig',
    'teach.goLearning': 'Gaan na my leer',
    'teach.title': 'My kursusse',
    'teach.lede':
      'Jy behou die kopiereg op alles hier. Niks wat jy reeds verkoop het, word teruggeneem nie: leerders wat ingeskryf het, behou hul toegang al onttrek jy die kursus later.',
    'teach.tdDecided': '’n Kennisgewing oor een van jou weergawes is beslis.',
    'teach.tdHeldOne':
      'Een van jou kursusse word teruggehou terwyl ’n eis daarteen ondersoek word.',
    'teach.tdHeldMany':
      'Kursusse van jou wat teruggehou word terwyl eise daarteen ondersoek word: {count}.',
    'teach.tdBelow':
      'Die eis is hieronder, in die woorde waarin dit gestuur is, en jy kan dit daar beantwoord.',
    'teach.lPromotions': 'Promosies',
    'teach.nPromotions':
      'bied ’n aanbod op jou eie kursusse aan, in die lande wat jy kies, met ’n perk op hoeveel keer ’n gesin dit mag gebruik',
    'teach.scTitle': 'Sifting',
    'teach.scStNone': 'Geen sifting op rekord nie',
    'teach.scStChecked': 'Gesif',
    'teach.scStLapsed': 'Verval',
    'teach.scStFailed': 'Het nie geslaag nie',
    'teach.scNone':
      'Daar is nog geen sifting oor jou op rekord nie. Wie ook al onderwysers aanstel, teken dit aan: die soort sifting, die datum, en of dit verval.',
    'teach.scFailedOn':
      '’n Sifting wat op {date} aangeteken is, het nie geslaag nie. Wie dit aangeteken het, kan jou sê wat volgende gebeur.',
    'teach.scFailed':
      '’n Sifting wat teen jou rekening aangeteken is, het nie geslaag nie. Wie dit aangeteken het, kan jou sê wat volgende gebeur.',
    'teach.scLapsedOn': 'Jou laaste sifting het op {date} verval.',
    'teach.scLapsed': 'Jou laaste sifting het verval.',
    'teach.scHoldsFrom': '’n Sifting is op {date} aangeteken en geld tot {until}.',
    'teach.scHolds': '’n Sifting is aangeteken en geld tot {until}.',
    'teach.scNoExpiryFrom':
      '’n Sifting is op {date} aangeteken, sonder dat ’n vervaldatum genoem is.',
    'teach.scNoExpiry': '’n Sifting is aangeteken, sonder dat ’n vervaldatum genoem is.',
    'teach.scKind': 'Die soort sifting, soos dit neergeskryf is:',
    'teach.scBlocks':
      'Totdat ’n geldige sifting aangeteken is, kan ’n kursus wat jy vir kinders skryf nie gepubliseer word nie.',
    'teach.scNotAsked':
      'Die platform vra nie vandag ’n sifting nie, dus keer niks hier dat ’n kursus van jou gepubliseer word nie. As dit verander, sê hierdie bladsy dit eerste.',
    'teach.scKept': 'Hierdie rekord word tot {date} bewaar en dan uitgevee.',
    'teach.empty': 'Jy het nog nie ’n kursus geskep nie.',
    'teach.stDraft': 'Konsep',
    'teach.stActive': 'Aktief',
    'teach.stRetired': 'Onttrek',
    'teach.published': 'Gepubliseer',
    'teach.open': 'Open kurrikulum',
    'teach.lPaths': 'Leerpaaie',
    'teach.nPaths': 'stel ’n reeks aktiewe kursusse saam',
    'teach.lProfile': 'Openbare onderwyserprofiel',
    'teach.nProfile': 'stel jouself bekend en skakel jou sosiale kanale',
    'teach.lMedia': 'Mediabiblioteek',
    'teach.nMedia': 'laai lesopnames op en sien watter gereed is om te gebruik',
    'teach.lBoard': 'Onderwysersbespreking',
    'teach.nBoard':
      'die bord net vir onderwysers; jy skryf daar onder ’n gebruikersnaam, nie jou naam nie',
    'teach.lEarnings': 'Verdienste',
    'teach.nEarnings':
      'wat jou kursusse verdien het, in elke geldeenheid, en die verkope daaragter; niks word nog uitbetaal nie, dus is dit die rekord en nie ’n saldo nie',
    'teach.lPayouts': 'Om betaal te word',
    'teach.nPayouts':
      'vra die geld wat jou kursusse verdien het sodra dit uit sy terugbetalingshouvas is, en sien wat met elke vorige versoek gebeur het',
    'teach.create': 'Skep',
    'teach.ncTitle': 'Nuwe kursus',
    'teach.ncField': 'Kursustitel',
    'teach.ncExample': 'Inleiding tot tadjwied',
    'teach.ncCreate': 'Skep kursus',
    'teach.ncCreating': 'Skep tans…',
    'teach.ncETitle': 'Gee die kursus ’n titel.',
    'teach.ncEDuplicate':
      '’n Kursus met daardie naam bestaan reeds. Verander die titel effens en probeer weer.',
    'teach.ncERefused': 'Die kursus is nie geskep nie. Wat die databasis gesê het:',
    'teach.ncEUnsure':
      'Niemand kan sê of die kursus geskep is nie. Laai die bladsy weer en kyk na jou kursusse voordat jy dit weer skep.',
    'teach.ncESignedOut': 'Jy is afgemeld. Meld weer aan en probeer dan nog een keer.',
    'teach.back': 'Terug na my leer',
  },
  'zh-hans': {
    'teach.eyebrow': '教学',
    'teach.notYetTitle': '这里是教学区',
    'teach.byAppointment': '在这里任教须经任命。',
    'teach.byAppointmentBody': '教师由所有者任命。在此之前，你的账户是学习者账户，而学习者账户不能开设课程。',
    'teach.ask': '你可以提出申请：提交你的资历和一节示范课，所有者会阅读。申请并不等于获得任命。在有人以书面形式作出决定之前，不会授予任何权限。',
    'teach.apply': '申请任教',
    'teach.goLearning': '前往我的学习',
    'teach.title': '我的课程',
    'teach.lede': '这里所有内容的版权都归你所有。你已经售出的内容不会被收回：即使你日后停用课程，已报名的学习者仍保留访问权限。',
    'teach.tdDecided': '关于你某个版本的一份通知已有决定。',
    'teach.tdHeldOne': '你的一门课程已被暂停，针对它的一项投诉正在审查中。',
    'teach.tdHeldMany': '因针对它们的投诉正在审查而被暂停的课程数：{count}。',
    'teach.tdBelow': '投诉内容在下方，按发送时的原文显示，你可以在那里答复。',
    'teach.lPromotions': '促销',
    'teach.nPromotions': '为你自己的课程推出优惠，在你选择的国家/地区，并限定一个家庭可以使用的次数',
    'teach.scTitle': '背景核查',
    'teach.scStNone': '没有核查记录',
    'teach.scStChecked': '已核实',
    'teach.scStLapsed': '已到期',
    'teach.scStFailed': '未通过',
    'teach.scNone': '目前还没有关于你的核查记录。由任命教师的人登记：核查的种类、日期，以及是否会到期。',
    'teach.scFailedOn': '{date}登记的一项核查未通过。登记的人可以告诉你接下来会怎样。',
    'teach.scFailed': '登记在你账户上的一项核查未通过。登记的人可以告诉你接下来会怎样。',
    'teach.scLapsedOn': '你最近的一项核查已于{date}到期。',
    'teach.scLapsed': '你最近的一项核查已到期。',
    'teach.scHoldsFrom': '一项核查已于{date}登记，有效期至{until}。',
    'teach.scHolds': '已登记一项核查，有效期至{until}。',
    'teach.scNoExpiryFrom': '一项核查已于{date}登记，未注明到期日。',
    'teach.scNoExpiry': '已登记一项核查，未注明到期日。',
    'teach.scKind': '核查的种类，按当时写下的原文：',
    'teach.scBlocks': '在登记一项有效的核查之前，你为儿童编写的课程不能发布。',
    'teach.scNotAsked': '平台目前不要求核查，所以这里没有任何事项会阻止你的课程发布。如果情况有变，本页面会最先说明。',
    'teach.scKept': '这条记录保存至{date}，之后删除。',
    'teach.empty': '你还没有创建课程。',
    'teach.stDraft': '草稿',
    'teach.stActive': '使用中',
    'teach.stRetired': '已停用',
    'teach.published': '已发布',
    'teach.open': '打开课程大纲',
    'teach.lPaths': '学习路径',
    'teach.nPaths': '把已上线的课程编排成一个序列',
    'teach.lProfile': '公开的教师资料',
    'teach.nProfile': '介绍你自己，并链接你的社交频道',
    'teach.lMedia': '媒体库',
    'teach.nMedia': '上传课程录音录像，并查看哪些已可使用',
    'teach.lBoard': '教师讨论区',
    'teach.nBoard': '仅限教师的讨论区；你在那里用用户名发言，而不是你的姓名',
    'teach.lEarnings': '收入',
    'teach.nEarnings': '你的课程在每种货币下的收入，以及背后的销售记录；目前尚未支付任何款项，所以这是记录而不是余额',
    'teach.lPayouts': '收款',
    'teach.nPayouts': '在你的课程收入过了退款保留期之后申请支付，并查看以前每一次申请的结果',
    'teach.create': '创建',
    'teach.ncTitle': '新课程',
    'teach.ncField': '课程标题',
    'teach.ncExample': '泰吉威德入门',
    'teach.ncCreate': '创建课程',
    'teach.ncCreating': '正在创建…',
    'teach.ncETitle': '请给课程起一个标题。',
    'teach.ncEDuplicate': '已有同名课程。请稍微改一下标题，然后再试一次。',
    'teach.ncERefused': '课程没有创建。数据库的说明：',
    'teach.ncEUnsure': '无法确定课程是否已创建。请重新加载页面，先看一看你的课程，再决定是否重新创建。',
    'teach.ncESignedOut': '你已退出登录。请重新登录，然后再试一次。',
    'teach.back': '返回我的学习',
  },
  'zh-hant': {
    'teach.eyebrow': '教學',
    'teach.notYetTitle': '這裡是教學區',
    'teach.byAppointment': '在這裡任教須經任命。',
    'teach.byAppointmentBody': '教師由擁有者任命。在此之前，你的帳戶是學習者帳戶，而學習者帳戶不能開設課程。',
    'teach.ask': '你可以提出申請：提交你的資歷和一節示範課，擁有者會閱讀。申請並不等於獲得任命。在有人以書面形式作出決定之前，不會授予任何權限。',
    'teach.apply': '申請任教',
    'teach.goLearning': '前往我的學習',
    'teach.title': '我的課程',
    'teach.lede': '這裡所有內容的版權都歸你所有。你已經售出的內容不會被收回：即使你日後停用課程，已報名的學習者仍保留存取權限。',
    'teach.tdDecided': '關於你某個版本的一份通知已有決定。',
    'teach.tdHeldOne': '你的一門課程已被暫停，針對它的一項投訴正在審查中。',
    'teach.tdHeldMany': '因針對它們的投訴正在審查而被暫停的課程數：{count}。',
    'teach.tdBelow': '投訴內容在下方，按發送時的原文顯示，你可以在那裡答覆。',
    'teach.lPromotions': '促銷',
    'teach.nPromotions': '為你自己的課程推出優惠，在你選擇的國家/地區，並限定一個家庭可以使用的次數',
    'teach.scTitle': '背景核查',
    'teach.scStNone': '沒有核查紀錄',
    'teach.scStChecked': '已核實',
    'teach.scStLapsed': '已到期',
    'teach.scStFailed': '未通過',
    'teach.scNone': '目前還沒有關於你的核查紀錄。由任命教師的人登記：核查的種類、日期，以及是否會到期。',
    'teach.scFailedOn': '{date}登記的一項核查未通過。登記的人可以告訴你接下來會怎樣。',
    'teach.scFailed': '登記在你帳戶上的一項核查未通過。登記的人可以告訴你接下來會怎樣。',
    'teach.scLapsedOn': '你最近的一項核查已於{date}到期。',
    'teach.scLapsed': '你最近的一項核查已到期。',
    'teach.scHoldsFrom': '一項核查已於{date}登記，有效期至{until}。',
    'teach.scHolds': '已登記一項核查，有效期至{until}。',
    'teach.scNoExpiryFrom': '一項核查已於{date}登記，未註明到期日。',
    'teach.scNoExpiry': '已登記一項核查，未註明到期日。',
    'teach.scKind': '核查的種類，按當時寫下的原文：',
    'teach.scBlocks': '在登記一項有效的核查之前，你為兒童編寫的課程不能發布。',
    'teach.scNotAsked': '平台目前不要求核查，所以這裡沒有任何事項會阻止你的課程發布。如果情況有變，本頁面會最先說明。',
    'teach.scKept': '這筆紀錄保存至{date}，之後刪除。',
    'teach.empty': '你還沒有建立課程。',
    'teach.stDraft': '草稿',
    'teach.stActive': '使用中',
    'teach.stRetired': '已停用',
    'teach.published': '已發布',
    'teach.open': '開啟課程大綱',
    'teach.lPaths': '學習路徑',
    'teach.nPaths': '把已上線的課程編排成一個序列',
    'teach.lProfile': '公開的教師資料',
    'teach.nProfile': '介紹你自己，並連結你的社群頻道',
    'teach.lMedia': '媒體庫',
    'teach.nMedia': '上傳課程錄音錄影，並查看哪些已可使用',
    'teach.lBoard': '教師討論區',
    'teach.nBoard': '僅限教師的討論區；你在那裡用使用者名稱發言，而不是你的姓名',
    'teach.lEarnings': '收入',
    'teach.nEarnings': '你的課程在每種貨幣下的收入，以及背後的銷售紀錄；目前尚未支付任何款項，所以這是紀錄而不是餘額',
    'teach.lPayouts': '收款',
    'teach.nPayouts': '在你的課程收入過了退款保留期之後申請支付，並查看以前每一次申請的結果',
    'teach.create': '建立',
    'teach.ncTitle': '新課程',
    'teach.ncField': '課程標題',
    'teach.ncExample': '泰吉威德入門',
    'teach.ncCreate': '建立課程',
    'teach.ncCreating': '正在建立…',
    'teach.ncETitle': '請給課程起一個標題。',
    'teach.ncEDuplicate': '已有同名課程。請稍微改一下標題，然後再試一次。',
    'teach.ncERefused': '課程沒有建立。資料庫的說明：',
    'teach.ncEUnsure': '無法確定課程是否已建立。請重新載入頁面，先看一看你的課程，再決定是否重新建立。',
    'teach.ncESignedOut': '你已登出。請重新登入，然後再試一次。',
    'teach.back': '返回我的學習',
  },
  vi: {
    'teach.eyebrow': 'Giảng dạy',
    'teach.notYetTitle': 'Đây là khu vực giảng dạy',
    'teach.byAppointment': 'Việc giảng dạy ở đây là theo bổ nhiệm.',
    'teach.byAppointmentBody':
      'Chủ sở hữu là người bổ nhiệm giáo viên. Cho đến lúc đó, tài khoản của bạn là tài khoản người học, và tài khoản người học không thể mở khoá học.',
    'teach.ask':
      'Bạn có thể đề nghị: gửi bằng cấp của bạn và một bài học mẫu, và chủ sở hữu sẽ đọc. Nộp đơn không phải là được bổ nhiệm. Không có gì được cấp cho đến khi có người quyết định, bằng văn bản.',
    'teach.apply': 'Đăng ký giảng dạy',
    'teach.goLearning': 'Đến việc học của tôi',
    'teach.title': 'Khoá học của tôi',
    'teach.lede':
      'Bạn giữ bản quyền đối với mọi thứ ở đây. Không có gì bạn đã bán bị lấy lại: người học đã ghi danh vẫn giữ quyền truy cập ngay cả khi sau này bạn ngừng khoá học.',
    'teach.tdDecided': 'Một thông báo về một trong các phiên bản của bạn đã được quyết định.',
    'teach.tdHeldOne':
      'Một khoá học của bạn đang bị tạm giữ trong khi một khiếu nại về nó được xem xét.',
    'teach.tdHeldMany':
      'Số khoá học của bạn đang bị tạm giữ trong khi các khiếu nại về chúng được xem xét: {count}.',
    'teach.tdBelow':
      'Khiếu nại ở bên dưới, đúng theo lời lẽ đã được gửi, và bạn có thể trả lời ở đó.',
    'teach.lPromotions': 'Khuyến mãi',
    'teach.nPromotions':
      'đưa ra ưu đãi cho các khoá học của chính bạn, ở những quốc gia bạn chọn, với giới hạn số lần một gia đình được dùng',
    'teach.scTitle': 'Thẩm tra',
    'teach.scStNone': 'Chưa có lần thẩm tra nào trong hồ sơ',
    'teach.scStChecked': 'Đã kiểm tra',
    'teach.scStLapsed': 'Đã hết hạn',
    'teach.scStFailed': 'Không đạt',
    'teach.scNone':
      'Chưa có lần thẩm tra nào về bạn trong hồ sơ. Người bổ nhiệm giáo viên sẽ ghi nhận: loại thẩm tra, ngày, và nó có hết hạn hay không.',
    'teach.scFailedOn':
      'Một lần thẩm tra được ghi nhận ngày {date} đã không đạt. Người ghi nhận có thể cho bạn biết điều gì xảy ra tiếp theo.',
    'teach.scFailed':
      'Một lần thẩm tra được ghi nhận cho tài khoản của bạn đã không đạt. Người ghi nhận có thể cho bạn biết điều gì xảy ra tiếp theo.',
    'teach.scLapsedOn': 'Lần thẩm tra gần nhất của bạn đã hết hạn ngày {date}.',
    'teach.scLapsed': 'Lần thẩm tra gần nhất của bạn đã hết hạn.',
    'teach.scHoldsFrom': 'Một lần thẩm tra được ghi nhận ngày {date} và có hiệu lực đến {until}.',
    'teach.scHolds': 'Một lần thẩm tra đã được ghi nhận và có hiệu lực đến {until}.',
    'teach.scNoExpiryFrom': 'Một lần thẩm tra được ghi nhận ngày {date}, không nêu ngày hết hạn.',
    'teach.scNoExpiry': 'Một lần thẩm tra đã được ghi nhận, không nêu ngày hết hạn.',
    'teach.scKind': 'Loại thẩm tra, đúng như đã được ghi lại:',
    'teach.scBlocks':
      'Cho đến khi một lần thẩm tra còn hiệu lực được ghi nhận, khoá học bạn viết cho trẻ em không thể được xuất bản.',
    'teach.scNotAsked':
      'Hôm nay nền tảng không yêu cầu thẩm tra, nên không có gì ở đây ngăn một khoá học của bạn được xuất bản. Nếu điều đó thay đổi, trang này sẽ nói trước tiên.',
    'teach.scKept': 'Bản ghi này được lưu đến {date} rồi bị xoá.',
    'teach.empty': 'Bạn chưa tạo khoá học nào.',
    'teach.stDraft': 'Bản nháp',
    'teach.stActive': 'Đang hoạt động',
    'teach.stRetired': 'Đã ngừng',
    'teach.published': 'Đã xuất bản',
    'teach.open': 'Mở chương trình học',
    'teach.lPaths': 'Lộ trình học tập',
    'teach.nPaths': 'sắp xếp một chuỗi các khoá học đang hoạt động',
    'teach.lProfile': 'Hồ sơ giáo viên công khai',
    'teach.nProfile': 'giới thiệu bản thân và liên kết các kênh mạng xã hội của bạn',
    'teach.lMedia': 'Thư viện phương tiện',
    'teach.nMedia': 'tải lên bản ghi bài học và xem bản nào đã sẵn sàng để dùng',
    'teach.lBoard': 'Thảo luận của giáo viên',
    'teach.nBoard':
      'diễn đàn chỉ dành cho giáo viên; ở đó bạn viết dưới một tên người dùng, không phải tên thật',
    'teach.lEarnings': 'Thu nhập',
    'teach.nEarnings':
      'những gì các khoá học của bạn đã kiếm được, theo từng loại tiền, và các lần bán đứng sau đó; chưa có gì được chi trả, nên đây là sổ ghi chứ không phải số dư',
    'teach.lPayouts': 'Nhận tiền',
    'teach.nPayouts':
      'yêu cầu số tiền các khoá học của bạn đã kiếm được sau khi nó ra khỏi khoảng giữ lại để hoàn tiền, và xem mỗi yêu cầu trước đây đã ra sao',
    'teach.create': 'Tạo',
    'teach.ncTitle': 'Khoá học mới',
    'teach.ncField': 'Tiêu đề khoá học',
    'teach.ncExample': 'Nhập môn tajwid',
    'teach.ncCreate': 'Tạo khoá học',
    'teach.ncCreating': 'Đang tạo…',
    'teach.ncETitle': 'Hãy đặt tiêu đề cho khoá học.',
    'teach.ncEDuplicate': 'Đã có một khoá học mang tên đó. Hãy đổi tiêu đề một chút rồi thử lại.',
    'teach.ncERefused': 'Khoá học chưa được tạo. Điều cơ sở dữ liệu nói:',
    'teach.ncEUnsure':
      'Không ai có thể nói khoá học đã được tạo hay chưa. Hãy tải lại trang và xem các khoá học của bạn trước khi tạo lần nữa.',
    'teach.ncESignedOut': 'Bạn đã đăng xuất. Hãy đăng nhập lại rồi thử thêm một lần nữa.',
    'teach.back': 'Quay lại việc học của tôi',
  },
  th: {
    'teach.eyebrow': 'การสอน',
    'teach.notYetTitle': 'ที่นี่คือพื้นที่การสอน',
    'teach.byAppointment': 'การสอนที่นี่เป็นไปโดยการแต่งตั้ง',
    'teach.byAppointmentBody':
      'เจ้าของเป็นผู้แต่งตั้งครู จนกว่าจะถึงตอนนั้น บัญชีของคุณเป็นบัญชีผู้เรียน และบัญชีผู้เรียนเปิดหลักสูตรไม่ได้',
    'teach.ask':
      'คุณขอได้: ส่งคุณวุฒิของคุณและบทเรียนตัวอย่าง แล้วเจ้าของจะอ่าน การสมัครไม่ใช่การได้รับแต่งตั้ง จะไม่มีการให้สิทธิ์ใดจนกว่าจะมีผู้ตัดสินใจเป็นลายลักษณ์อักษร',
    'teach.apply': 'สมัครเป็นผู้สอน',
    'teach.goLearning': 'ไปที่การเรียนของฉัน',
    'teach.title': 'หลักสูตรของฉัน',
    'teach.lede':
      'ลิขสิทธิ์ของทุกอย่างที่นี่ยังเป็นของคุณ สิ่งที่คุณขายไปแล้วจะไม่ถูกเรียกคืน: ผู้เรียนที่ลงทะเบียนแล้วยังเข้าถึงได้ แม้คุณจะยุติหลักสูตรในภายหลัง',
    'teach.tdDecided': 'มีการตัดสินเรื่องการแจ้งเกี่ยวกับเวอร์ชันหนึ่งของคุณแล้ว',
    'teach.tdHeldOne':
      'หลักสูตรหนึ่งของคุณถูกพักไว้ระหว่างที่มีการพิจารณาข้อร้องเรียนต่อหลักสูตรนั้น',
    'teach.tdHeldMany': 'หลักสูตรของคุณที่ถูกพักไว้ระหว่างที่มีการพิจารณาข้อร้องเรียน: {count}',
    'teach.tdBelow': 'ข้อร้องเรียนอยู่ด้านล่าง ตามถ้อยคำที่ส่งมา และคุณตอบได้ที่นั่น',
    'teach.lPromotions': 'โปรโมชัน',
    'teach.nPromotions':
      'จัดข้อเสนอสำหรับหลักสูตรของคุณเอง ในประเทศที่คุณเลือก โดยจำกัดจำนวนครั้งที่ครอบครัวหนึ่งใช้ได้',
    'teach.scTitle': 'การตรวจสอบประวัติ',
    'teach.scStNone': 'ไม่มีการตรวจสอบในแฟ้ม',
    'teach.scStChecked': 'ตรวจสอบแล้ว',
    'teach.scStLapsed': 'หมดอายุ',
    'teach.scStFailed': 'ไม่ผ่าน',
    'teach.scNone':
      'ยังไม่มีการตรวจสอบเกี่ยวกับคุณในแฟ้ม ผู้ที่แต่งตั้งครูเป็นผู้บันทึก: ประเภทของการตรวจสอบ วันที่ และหมดอายุหรือไม่',
    'teach.scFailedOn':
      'การตรวจสอบที่บันทึกเมื่อ {date} ไม่ผ่าน ผู้ที่บันทึกบอกคุณได้ว่าจะเกิดอะไรขึ้นต่อไป',
    'teach.scFailed':
      'การตรวจสอบที่บันทึกไว้กับบัญชีของคุณไม่ผ่าน ผู้ที่บันทึกบอกคุณได้ว่าจะเกิดอะไรขึ้นต่อไป',
    'teach.scLapsedOn': 'การตรวจสอบครั้งล่าสุดของคุณหมดอายุเมื่อ {date}',
    'teach.scLapsed': 'การตรวจสอบครั้งล่าสุดของคุณหมดอายุแล้ว',
    'teach.scHoldsFrom': 'มีการบันทึกการตรวจสอบเมื่อ {date} และใช้ได้ถึง {until}',
    'teach.scHolds': 'มีการบันทึกการตรวจสอบ และใช้ได้ถึง {until}',
    'teach.scNoExpiryFrom': 'มีการบันทึกการตรวจสอบเมื่อ {date} โดยไม่ได้ระบุวันหมดอายุ',
    'teach.scNoExpiry': 'มีการบันทึกการตรวจสอบ โดยไม่ได้ระบุวันหมดอายุ',
    'teach.scKind': 'ประเภทของการตรวจสอบ ตามที่เขียนไว้:',
    'teach.scBlocks':
      'จนกว่าจะมีการบันทึกการตรวจสอบที่ยังไม่หมดอายุ หลักสูตรที่คุณเขียนสำหรับเด็กจะเผยแพร่ไม่ได้',
    'teach.scNotAsked':
      'วันนี้แพลตฟอร์มไม่ได้ขอการตรวจสอบ จึงไม่มีอะไรที่นี่ขวางการเผยแพร่หลักสูตรของคุณ หากเรื่องนี้เปลี่ยนไป หน้านี้จะบอกก่อน',
    'teach.scKept': 'บันทึกนี้จะเก็บไว้ถึง {date} แล้วจึงลบ',
    'teach.empty': 'คุณยังไม่ได้สร้างหลักสูตร',
    'teach.stDraft': 'ฉบับร่าง',
    'teach.stActive': 'ใช้งานอยู่',
    'teach.stRetired': 'ยุติแล้ว',
    'teach.published': 'เผยแพร่แล้ว',
    'teach.open': 'เปิดเนื้อหาหลักสูตร',
    'teach.lPaths': 'เส้นทางการเรียนรู้',
    'teach.nPaths': 'จัดลำดับหลักสูตรที่ใช้งานอยู่ให้เป็นชุด',
    'teach.lProfile': 'โปรไฟล์ครูแบบสาธารณะ',
    'teach.nProfile': 'แนะนำตัวและใส่ลิงก์ช่องทางโซเชียลของคุณ',
    'teach.lMedia': 'คลังสื่อ',
    'teach.nMedia': 'อัปโหลดไฟล์บันทึกบทเรียนและดูว่ารายการใดพร้อมใช้',
    'teach.lBoard': 'การสนทนาของครู',
    'teach.nBoard': 'กระดานสำหรับครูเท่านั้น คุณเขียนที่นั่นด้วยชื่อผู้ใช้ ไม่ใช่ชื่อจริง',
    'teach.lEarnings': 'รายได้',
    'teach.nEarnings':
      'สิ่งที่หลักสูตรของคุณทำรายได้ ในแต่ละสกุลเงิน และรายการขายที่อยู่เบื้องหลัง ยังไม่มีการจ่ายเงินออก นี่จึงเป็นบันทึก ไม่ใช่ยอดคงเหลือ',
    'teach.lPayouts': 'การรับเงิน',
    'teach.nPayouts':
      'ขอรับเงินที่หลักสูตรของคุณทำรายได้เมื่อพ้นช่วงพักเงินไว้เผื่อคืนเงินแล้ว และดูว่าคำขอก่อนหน้าแต่ละครั้งเป็นอย่างไร',
    'teach.create': 'สร้าง',
    'teach.ncTitle': 'หลักสูตรใหม่',
    'teach.ncField': 'ชื่อหลักสูตร',
    'teach.ncExample': 'ตัจวีดเบื้องต้น',
    'teach.ncCreate': 'สร้างหลักสูตร',
    'teach.ncCreating': 'กำลังสร้าง…',
    'teach.ncETitle': 'โปรดตั้งชื่อหลักสูตร',
    'teach.ncEDuplicate': 'มีหลักสูตรชื่อนั้นอยู่แล้ว โปรดเปลี่ยนชื่อเล็กน้อยแล้วลองอีกครั้ง',
    'teach.ncERefused': 'ไม่ได้สร้างหลักสูตร สิ่งที่ฐานข้อมูลบอก:',
    'teach.ncEUnsure':
      'ไม่มีใครบอกได้ว่าหลักสูตรถูกสร้างแล้วหรือไม่ โปรดโหลดหน้านี้ใหม่และดูหลักสูตรของคุณก่อนสร้างอีกครั้ง',
    'teach.ncESignedOut': 'คุณออกจากระบบแล้ว โปรดเข้าสู่ระบบอีกครั้ง แล้วลองอีกหนึ่งครั้ง',
    'teach.back': 'กลับไปที่การเรียนของฉัน',
  },
  fil: {
    'teach.eyebrow': 'Pagtuturo',
    'teach.notYetTitle': 'Ito ang lugar ng pagtuturo',
    'teach.byAppointment': 'Ang pagtuturo rito ay sa pamamagitan ng paghirang.',
    'teach.byAppointmentBody':
      'Ang may-ari ang humihirang ng guro. Hangga’t wala pa iyon, account ng mag-aaral ang account mo, at hindi makapagbubukas ng kurso ang account ng mag-aaral.',
    'teach.ask':
      'Maaari kang humiling: ipadala ang iyong mga kuwalipikasyon at isang halimbawang aralin, at babasahin ng may-ari ang mga ito. Ang pag-apply ay hindi pagkahirang. Walang ibinibigay hangga’t walang nagpapasya, nang nakasulat.',
    'teach.apply': 'Mag-apply para magturo',
    'teach.goLearning': 'Pumunta sa aking pag-aaral',
    'teach.title': 'Aking mga kurso',
    'teach.lede':
      'Sa iyo pa rin ang karapatang-ari ng lahat ng narito. Walang binabawi sa anumang naibenta mo na: nananatili ang access ng mga mag-aaral na nag-enrol kahit iretiro mo ang kurso sa hinaharap.',
    'teach.tdDecided': 'Napagpasyahan na ang isang abiso tungkol sa isa sa iyong mga bersyon.',
    'teach.tdHeldOne':
      'Nakabinbin ang isa sa iyong mga kurso habang sinusuri ang isang reklamo laban dito.',
    'teach.tdHeldMany':
      'Mga kurso mong nakabinbin habang sinusuri ang mga reklamo laban sa mga ito: {count}.',
    'teach.tdBelow': 'Nasa ibaba ang reklamo, sa mga salitang ipinadala, at masasagot mo ito roon.',
    'teach.lPromotions': 'Mga promosyon',
    'teach.nPromotions':
      'magpatakbo ng alok sa sarili mong mga kurso, sa mga bansang pipiliin mo, na may limitasyon kung ilang beses ito magagamit ng isang pamilya',
    'teach.scTitle': 'Pagsisiyasat',
    'teach.scStNone': 'Walang nakatalang pagsisiyasat',
    'teach.scStChecked': 'Nasuri na',
    'teach.scStLapsed': 'Nag-expire',
    'teach.scStFailed': 'Hindi pumasa',
    'teach.scNone':
      'Wala pang nakatalang pagsisiyasat tungkol sa iyo. Ang humihirang ng mga guro ang nagtatala nito: ang uri ng pagsisiyasat, ang petsa, at kung nawawalan ito ng bisa.',
    'teach.scFailedOn':
      'Hindi pumasa ang isang pagsisiyasat na itinala noong {date}. Masasabi sa iyo ng nagtala nito kung ano ang susunod na mangyayari.',
    'teach.scFailed':
      'Hindi pumasa ang isang pagsisiyasat na itinala sa account mo. Masasabi sa iyo ng nagtala nito kung ano ang susunod na mangyayari.',
    'teach.scLapsedOn': 'Nawalan ng bisa ang huli mong pagsisiyasat noong {date}.',
    'teach.scLapsed': 'Nawalan na ng bisa ang huli mong pagsisiyasat.',
    'teach.scHoldsFrom':
      'May pagsisiyasat na itinala noong {date} at may bisa ito hanggang {until}.',
    'teach.scHolds': 'May pagsisiyasat na itinala at may bisa ito hanggang {until}.',
    'teach.scNoExpiryFrom':
      'May pagsisiyasat na itinala noong {date}, na walang sinabing petsa ng pagkawala ng bisa.',
    'teach.scNoExpiry':
      'May pagsisiyasat na itinala, na walang sinabing petsa ng pagkawala ng bisa.',
    'teach.scKind': 'Ang uri ng pagsisiyasat, ayon sa pagkakasulat:',
    'teach.scBlocks':
      'Hangga’t walang naitatalang pagsisiyasat na may bisa pa, hindi mailalathala ang kursong isinusulat mo para sa mga bata.',
    'teach.scNotAsked':
      'Hindi humihingi ng pagsisiyasat ang platform ngayon, kaya walang anuman dito ang pumipigil sa paglalathala ng kurso mo. Kung magbago iyon, ang pahinang ito ang unang magsasabi.',
    'teach.scKept': 'Iniingatan ang talang ito hanggang {date} at saka buburahin.',
    'teach.empty': 'Wala ka pang nagagawang kurso.',
    'teach.stDraft': 'Draft',
    'teach.stActive': 'Aktibo',
    'teach.stRetired': 'Iniretiro',
    'teach.published': 'Nailathala',
    'teach.open': 'Buksan ang kurikulum',
    'teach.lPaths': 'Mga landas ng pag-aaral',
    'teach.nPaths': 'bumuo ng pagkakasunod-sunod ng mga aktibong kurso',
    'teach.lProfile': 'Pampublikong profile ng guro',
    'teach.nProfile': 'ipakilala ang sarili at i-link ang iyong mga social channel',
    'teach.lMedia': 'Aklatan ng media',
    'teach.nMedia':
      'mag-upload ng mga recording ng aralin at tingnan kung alin ang handa nang gamitin',
    'teach.lBoard': 'Talakayan ng mga guro',
    'teach.nBoard':
      'ang board na para lamang sa mga guro; sumusulat ka roon sa ilalim ng username, hindi ng pangalan mo',
    'teach.lEarnings': 'Kita',
    'teach.nEarnings':
      'ang kinita ng iyong mga kurso, sa bawat pera, at ang mga bentang nasa likod nito; wala pang ibinabayad, kaya ito ang talaan at hindi balanse',
    'teach.lPayouts': 'Pagtanggap ng bayad',
    'teach.nPayouts':
      'hingin ang perang kinita ng iyong mga kurso kapag wala na ito sa pagpigil para sa refund, at tingnan kung ano ang nangyari sa bawat naunang hiling',
    'teach.create': 'Gumawa',
    'teach.ncTitle': 'Bagong kurso',
    'teach.ncField': 'Pamagat ng kurso',
    'teach.ncExample': 'Panimula sa tajwid',
    'teach.ncCreate': 'Gumawa ng kurso',
    'teach.ncCreating': 'Ginagawa…',
    'teach.ncETitle': 'Bigyan ng pamagat ang kurso.',
    'teach.ncEDuplicate':
      'May kurso nang ganoon ang pangalan. Baguhin nang kaunti ang pamagat at subukang muli.',
    'teach.ncERefused': 'Hindi nagawa ang kurso. Ang sinabi ng database:',
    'teach.ncEUnsure':
      'Walang makapagsasabi kung nagawa ang kurso. I-load muli ang pahina at tingnan ang iyong mga kurso bago ito gawin ulit.',
    'teach.ncESignedOut':
      'Naka-sign out ka na. Mag-sign in muli, saka subukan nang isa pang beses.',
    'teach.back': 'Bumalik sa aking pag-aaral',
  },
  uz: {
    'teach.eyebrow': 'Oʻqitish',
    'teach.notYetTitle': 'Bu yer oʻqitish boʻlimi',
    'teach.byAppointment': 'Bu yerda dars berish tayinlov asosida boʻladi.',
    'teach.byAppointmentBody':
      'Oʻqituvchini platforma egasi tayinlaydi. Ungacha hisobingiz oʻquvchi hisobi boʻlib turadi, oʻquvchi hisobi esa kurs ocha olmaydi.',
    'teach.ask':
      'Soʻrashingiz mumkin: malakalaringizni va namunaviy darsni yuboring, platforma egasi ularni oʻqiydi. Ariza topshirish tayinlanish degani emas. Kimdir yozma ravishda qaror qilmaguncha hech narsa berilmaydi.',
    'teach.apply': 'Dars berishga ariza topshirish',
    'teach.goLearning': 'Taʼlimimga oʻtish',
    'teach.title': 'Kurslarim',
    'teach.lede':
      'Bu yerdagi hamma narsaning mualliflik huquqi sizda qoladi. Sotib boʻlganlaringizdan hech narsa qaytarib olinmaydi: keyinchalik kursni toʻxtatsangiz ham, yozilgan oʻquvchilar undan foydalanishda davom etadi.',
    'teach.tdDecided': 'Versiyalaringizdan biri haqidagi xabarnoma boʻyicha qaror qabul qilindi.',
    'teach.tdHeldOne':
      'Kurslaringizdan biri unga qarshi daʼvo koʻrib chiqilayotgan paytda toʻxtatib turilibdi.',
    'teach.tdHeldMany':
      'Ularga qarshi daʼvolar koʻrib chiqilayotgan paytda toʻxtatib turilgan kurslaringiz: {count}.',
    'teach.tdBelow':
      'Daʼvo quyida, qanday yuborilgan boʻlsa, shu soʻzlarda turibdi va unga oʻsha yerda javob berishingiz mumkin.',
    'teach.lPromotions': 'Aksiyalar',
    'teach.nPromotions':
      'oʻz kurslaringizga, oʻzingiz tanlagan mamlakatlarda, bir oila necha marta foydalanishi mumkinligi cheklangan taklif eʼlon qiling',
    'teach.scTitle': 'Tekshiruv',
    'teach.scStNone': 'Qayd etilgan tekshiruv yoʻq',
    'teach.scStChecked': 'Tekshirilgan',
    'teach.scStLapsed': 'Muddati tugagan',
    'teach.scStFailed': 'Oʻtmadi',
    'teach.scNone':
      'Siz haqingizda hali tekshiruv qayd etilmagan. Uni oʻqituvchilarni tayinlaydigan kishi qayd etadi: tekshiruv turi, sanasi va muddati tugaydimi.',
    'teach.scFailedOn':
      '{date} sanasida qayd etilgan tekshiruv oʻtmadi. Keyin nima boʻlishini uni qayd etgan kishi aytib bera oladi.',
    'teach.scFailed':
      'Hisobingizga qayd etilgan tekshiruv oʻtmadi. Keyin nima boʻlishini uni qayd etgan kishi aytib bera oladi.',
    'teach.scLapsedOn': 'Oxirgi tekshiruvingiz muddati {date} sanasida tugagan.',
    'teach.scLapsed': 'Oxirgi tekshiruvingiz muddati tugagan.',
    'teach.scHoldsFrom':
      'Tekshiruv {date} sanasida qayd etilgan va {until} sanasigacha amal qiladi.',
    'teach.scHolds': 'Tekshiruv qayd etilgan va {until} sanasigacha amal qiladi.',
    'teach.scNoExpiryFrom':
      'Tekshiruv {date} sanasida qayd etilgan, tugash muddati koʻrsatilmagan.',
    'teach.scNoExpiry': 'Tekshiruv qayd etilgan, tugash muddati koʻrsatilmagan.',
    'teach.scKind': 'Tekshiruv turi, qanday yozib qoʻyilgan boʻlsa:',
    'teach.scBlocks':
      'Amaldagi tekshiruv qayd etilmaguncha, bolalar uchun yozgan kursingizni nashr etib boʻlmaydi.',
    'teach.scNotAsked':
      'Platforma bugun tekshiruv talab qilmayapti, shuning uchun bu yerda kursingiz nashr etilishiga hech narsa toʻsqinlik qilmaydi. Agar bu oʻzgarsa, birinchi boʻlib shu sahifa aytadi.',
    'teach.scKept': 'Bu yozuv {date} sanasigacha saqlanadi, soʻng oʻchiriladi.',
    'teach.empty': 'Hali kurs yaratmagansiz.',
    'teach.stDraft': 'Qoralama',
    'teach.stActive': 'Faol',
    'teach.stRetired': 'Toʻxtatilgan',
    'teach.published': 'Nashr etilgan',
    'teach.open': 'Oʻquv dasturini ochish',
    'teach.lPaths': 'Oʻquv yoʻllari',
    'teach.nPaths': 'faol kurslardan ketma-ketlik tuzing',
    'teach.lProfile': 'Oʻqituvchining ochiq profili',
    'teach.nProfile':
      'oʻzingizni tanishtiring va ijtimoiy tarmoqlardagi kanallaringizga havola qoʻying',
    'teach.lMedia': 'Media kutubxonasi',
    'teach.nMedia': 'dars yozuvlarini yuklang va qaysilari foydalanishga tayyorligini koʻring',
    'teach.lBoard': 'Oʻqituvchilar muhokamasi',
    'teach.nBoard':
      'faqat oʻqituvchilar uchun muhokama maydoni; u yerda ismingiz bilan emas, foydalanuvchi nomi bilan yozasiz',
    'teach.lEarnings': 'Daromad',
    'teach.nEarnings':
      'kurslaringiz har bir valyutada topgan daromad va uning ortidagi savdolar; hali hech narsa toʻlanmagan, shuning uchun bu qoldiq emas, qayd',
    'teach.lPayouts': 'Toʻlov olish',
    'teach.nPayouts':
      'kurslaringiz topgan pul qaytarish uchun ushlab turishdan chiqqach, uni soʻrang va oldingi har bir soʻrov nima boʻlganini koʻring',
    'teach.create': 'Yaratish',
    'teach.ncTitle': 'Yangi kurs',
    'teach.ncField': 'Kurs sarlavhasi',
    'teach.ncExample': 'Tajvidga kirish',
    'teach.ncCreate': 'Kurs yaratish',
    'teach.ncCreating': 'Yaratilmoqda…',
    'teach.ncETitle': 'Kursga sarlavha bering.',
    'teach.ncEDuplicate':
      'Shu nomli kurs allaqachon bor. Sarlavhani biroz oʻzgartirib, qayta urinib koʻring.',
    'teach.ncERefused': 'Kurs yaratilmadi. Maʼlumotlar bazasi aytgan gap:',
    'teach.ncEUnsure':
      'Kurs yaratilgan-yaratilmaganini hech kim ayta olmaydi. Sahifani qayta yuklang va qayta yaratishdan oldin kurslaringizga qarang.',
    'teach.ncESignedOut': 'Hisobdan chiqqansiz. Qayta kiring, soʻng yana bir marta urinib koʻring.',
    'teach.back': 'Taʼlimimga qaytish',
  },
  kk: {
    'teach.eyebrow': 'Оқыту',
    'teach.notYetTitle': 'Бұл — оқыту бөлімі',
    'teach.byAppointment': 'Мұнда сабақ беру тағайындау арқылы жүреді.',
    'teach.byAppointmentBody':
      'Мұғалімді платформа иесі тағайындайды. Оған дейін тіркелгіңіз оқушы тіркелгісі болады, ал оқушы тіркелгісі курс аша алмайды.',
    'teach.ask':
      'Сұрауыңызға болады: біліктілігіңізді және үлгі сабақты жіберіңіз, платформа иесі оларды оқиды. Өтінім беру тағайындалу емес. Біреу жазбаша шешім қабылдамайынша ештеңе берілмейді.',
    'teach.apply': 'Сабақ беруге өтінім беру',
    'teach.goLearning': 'Оқуыма өту',
    'teach.title': 'Менің курстарым',
    'teach.lede':
      'Мұндағының бәріне авторлық құқық өзіңізде қалады. Сатып қойғаныңыздан ештеңе қайтарып алынбайды: кейін курсты тоқтатсаңыз да, жазылған оқушылардың қолжетімділігі сақталады.',
    'teach.tdDecided': 'Нұсқаларыңыздың бірі туралы хабарлама бойынша шешім қабылданды.',
    'teach.tdHeldOne': 'Курстарыңыздың бірі оған қарсы шағым қаралып жатқанда тоқтатылып тұр.',
    'teach.tdHeldMany':
      'Өздеріне қарсы шағымдар қаралып жатқанда тоқтатылып тұрған курстарыңыз: {count}.',
    'teach.tdBelow':
      'Шағым төменде, қалай жіберілсе, сол сөздермен тұр, оған сол жерде жауап бере аласыз.',
    'teach.lPromotions': 'Науқандар',
    'teach.nPromotions':
      'өз курстарыңызға, өзіңіз таңдаған елдерде, бір отбасы неше рет пайдалана алатыны шектелген ұсыныс жариялаңыз',
    'teach.scTitle': 'Тексеру',
    'teach.scStNone': 'Тіркелген тексеру жоқ',
    'teach.scStChecked': 'Тексерілді',
    'teach.scStLapsed': 'Мерзімі өткен',
    'teach.scStFailed': 'Өтпеді',
    'teach.scNone':
      'Сіз туралы әзірге тексеру тіркелмеген. Оны мұғалімдерді тағайындайтын адам тіркейді: тексерудің түрі, күні және мерзімі бітетін-бітпейтіні.',
    'teach.scFailedOn':
      '{date} күні тіркелген тексеру өтпеді. Әрі қарай не болатынын оны тіркеген адам айта алады.',
    'teach.scFailed':
      'Тіркелгіңізге тіркелген тексеру өтпеді. Әрі қарай не болатынын оны тіркеген адам айта алады.',
    'teach.scLapsedOn': 'Соңғы тексеруіңіздің мерзімі {date} күні бітті.',
    'teach.scLapsed': 'Соңғы тексеруіңіздің мерзімі бітті.',
    'teach.scHoldsFrom': 'Тексеру {date} күні тіркелген және {until} күніне дейін жарамды.',
    'teach.scHolds': 'Тексеру тіркелген және {until} күніне дейін жарамды.',
    'teach.scNoExpiryFrom': 'Тексеру {date} күні тіркелген, аяқталу мерзімі көрсетілмеген.',
    'teach.scNoExpiry': 'Тексеру тіркелген, аяқталу мерзімі көрсетілмеген.',
    'teach.scKind': 'Тексерудің түрі, қалай жазылса, солай:',
    'teach.scBlocks':
      'Жарамды тексеру тіркелмейінше, балаларға арнап жазған курсыңызды жариялау мүмкін емес.',
    'teach.scNotAsked':
      'Платформа бүгін тексеруді талап етіп отырған жоқ, сондықтан мұнда курсыңыздың жариялануына ештеңе кедергі болмайды. Егер бұл өзгерсе, алдымен осы бет айтады.',
    'teach.scKept': 'Бұл жазба {date} күніне дейін сақталады, содан кейін жойылады.',
    'teach.empty': 'Әзірге курс жасаған жоқсыз.',
    'teach.stDraft': 'Жоба',
    'teach.stActive': 'Белсенді',
    'teach.stRetired': 'Тоқтатылған',
    'teach.published': 'Жарияланған',
    'teach.open': 'Оқу бағдарламасын ашу',
    'teach.lPaths': 'Оқу жолдары',
    'teach.nPaths': 'белсенді курстардан тізбек құрастырыңыз',
    'teach.lProfile': 'Мұғалімнің ашық профилі',
    'teach.nProfile': 'өзіңізді таныстырып, әлеуметтік желідегі арналарыңызға сілтеме қойыңыз',
    'teach.lMedia': 'Медиа кітапханасы',
    'teach.nMedia': 'сабақ жазбаларын жүктеп, қайсысы пайдалануға дайын екенін көріңіз',
    'teach.lBoard': 'Мұғалімдер талқылауы',
    'teach.nBoard':
      'тек мұғалімдерге арналған талқылау алаңы; онда өз атыңызбен емес, пайдаланушы атымен жазасыз',
    'teach.lEarnings': 'Табыс',
    'teach.nEarnings':
      'курстарыңыздың әр валютада тапқан табысы және оның артындағы сатылымдар; әзірге ештеңе төленген жоқ, сондықтан бұл қалдық емес, жазба',
    'teach.lPayouts': 'Төлем алу',
    'teach.nPayouts':
      'курстарыңыз тапқан ақша қайтаруға арналған ұстап тұрудан шыққан соң оны сұраңыз және бұрынғы әр сұраудың не болғанын көріңіз',
    'teach.create': 'Жасау',
    'teach.ncTitle': 'Жаңа курс',
    'teach.ncField': 'Курс атауы',
    'teach.ncExample': 'Тәжуидке кіріспе',
    'teach.ncCreate': 'Курс жасау',
    'teach.ncCreating': 'Жасалуда…',
    'teach.ncETitle': 'Курсқа атау беріңіз.',
    'teach.ncEDuplicate':
      'Мұндай атаулы курс бұрыннан бар. Атауын сәл өзгертіп, қайта байқап көріңіз.',
    'teach.ncERefused': 'Курс жасалмады. Дерекқордың айтқаны:',
    'teach.ncEUnsure':
      'Курстың жасалған-жасалмағанын ешкім айта алмайды. Бетті қайта жүктеп, қайта жасамас бұрын курстарыңызға қараңыз.',
    'teach.ncESignedOut': 'Тіркелгіден шығып кеткенсіз. Қайта кіріп, тағы бір рет байқап көріңіз.',
    'teach.back': 'Оқуыма оралу',
  },
  az: {
    'teach.eyebrow': 'Tədris',
    'teach.notYetTitle': 'Bura tədris bölməsidir',
    'teach.byAppointment': 'Burada dərs demək təyinatla olur.',
    'teach.byAppointmentBody':
      'Müəllimi platformanın sahibi təyin edir. O vaxta qədər hesabınız öyrənən hesabıdır və öyrənən hesabı kurs aça bilməz.',
    'teach.ask':
      'Xahiş edə bilərsiniz: ixtisas sənədlərinizi və nümunə dərsi göndərin, platformanın sahibi onları oxuyur. Müraciət etmək təyin olunmaq deyil. Kimsə yazılı şəkildə qərar verməyincə heç nə verilmir.',
    'teach.apply': 'Dərs demək üçün müraciət et',
    'teach.goLearning': 'Təhsilimə keç',
    'teach.title': 'Kurslarım',
    'teach.lede':
      'Buradakı hər şeyin müəllif hüququ sizdə qalır. Artıq satdıqlarınızdan heç nə geri alınmır: kursu sonradan dayandırsanız belə, yazılmış öyrənənlərin girişi qalır.',
    'teach.tdDecided': 'Versiyalarınızdan biri haqqında bildiriş üzrə qərar verildi.',
    'teach.tdHeldOne': 'Kurslarınızdan biri ona qarşı iddiaya baxılarkən saxlanılıb.',
    'teach.tdHeldMany': 'Onlara qarşı iddialara baxılarkən saxlanılan kurslarınız: {count}.',
    'teach.tdBelow': 'İddia aşağıdadır, göndərildiyi sözlərlə, və ona orada cavab verə bilərsiniz.',
    'teach.lPromotions': 'Kampaniyalar',
    'teach.nPromotions':
      'öz kurslarınıza, seçdiyiniz ölkələrdə, bir ailənin neçə dəfə istifadə edə biləcəyinə məhdudiyyət qoyulmuş təklif elan edin',
    'teach.scTitle': 'Yoxlama',
    'teach.scStNone': 'Qeydə alınmış yoxlama yoxdur',
    'teach.scStChecked': 'Yoxlanılıb',
    'teach.scStLapsed': 'Müddəti bitib',
    'teach.scStFailed': 'Keçmədi',
    'teach.scNone':
      'Sizin barənizdə hələ yoxlama qeydə alınmayıb. Onu müəllimləri təyin edən şəxs qeydə alır: yoxlamanın növü, tarixi və müddətinin bitib-bitmədiyi.',
    'teach.scFailedOn':
      '{date} tarixində qeydə alınmış yoxlama keçmədi. Bundan sonra nə olacağını onu qeydə alan şəxs sizə deyə bilər.',
    'teach.scFailed':
      'Hesabınıza qeydə alınmış yoxlama keçmədi. Bundan sonra nə olacağını onu qeydə alan şəxs sizə deyə bilər.',
    'teach.scLapsedOn': 'Son yoxlamanızın müddəti {date} tarixində bitib.',
    'teach.scLapsed': 'Son yoxlamanızın müddəti bitib.',
    'teach.scHoldsFrom': 'Yoxlama {date} tarixində qeydə alınıb və {until} tarixinədək qüvvədədir.',
    'teach.scHolds': 'Yoxlama qeydə alınıb və {until} tarixinədək qüvvədədir.',
    'teach.scNoExpiryFrom': 'Yoxlama {date} tarixində qeydə alınıb, bitmə tarixi göstərilməyib.',
    'teach.scNoExpiry': 'Yoxlama qeydə alınıb, bitmə tarixi göstərilməyib.',
    'teach.scKind': 'Yoxlamanın növü, necə yazılıbsa, elə:',
    'teach.scBlocks':
      'Qüvvədə olan yoxlama qeydə alınmayınca, uşaqlar üçün yazdığınız kurs dərc oluna bilməz.',
    'teach.scNotAsked':
      'Platforma bu gün yoxlama tələb etmir, ona görə burada kursunuzun dərc olunmasına heç nə mane olmur. Bu dəyişsə, ilk olaraq bu səhifə deyəcək.',
    'teach.scKept': 'Bu qeyd {date} tarixinədək saxlanılır, sonra silinir.',
    'teach.empty': 'Hələ kurs yaratmamısınız.',
    'teach.stDraft': 'Qaralama',
    'teach.stActive': 'Aktiv',
    'teach.stRetired': 'Dayandırılıb',
    'teach.published': 'Dərc olunub',
    'teach.open': 'Tədris proqramını aç',
    'teach.lPaths': 'Öyrənmə yolları',
    'teach.nPaths': 'aktiv kurslardan ardıcıllıq qurun',
    'teach.lProfile': 'Müəllimin açıq profili',
    'teach.nProfile': 'özünüzü təqdim edin və sosial kanallarınıza keçid əlavə edin',
    'teach.lMedia': 'Media kitabxanası',
    'teach.nMedia': 'dərs yazılarını yükləyin və hansılarının istifadəyə hazır olduğuna baxın',
    'teach.lBoard': 'Müəllimlərin müzakirəsi',
    'teach.nBoard':
      'yalnız müəllimlər üçün müzakirə lövhəsi; orada adınızla deyil, istifadəçi adı ilə yazırsınız',
    'teach.lEarnings': 'Qazanc',
    'teach.nEarnings':
      'kurslarınızın hər valyutada qazandığı məbləğ və onun arxasındakı satışlar; hələ heç nə ödənilmir, ona görə bu qalıq deyil, qeyddir',
    'teach.lPayouts': 'Ödəniş almaq',
    'teach.nPayouts':
      'kurslarınızın qazandığı pul geri qaytarma üçün saxlamadan çıxandan sonra onu istəyin və əvvəlki hər sorğunun nə olduğuna baxın',
    'teach.create': 'Yarat',
    'teach.ncTitle': 'Yeni kurs',
    'teach.ncField': 'Kursun başlığı',
    'teach.ncExample': 'Təcvidə giriş',
    'teach.ncCreate': 'Kurs yarat',
    'teach.ncCreating': 'Yaradılır…',
    'teach.ncETitle': 'Kursa başlıq verin.',
    'teach.ncEDuplicate': 'Bu adda kurs artıq var. Başlığı bir az dəyişib yenidən cəhd edin.',
    'teach.ncERefused': 'Kurs yaradılmadı. Verilənlər bazasının dediyi:',
    'teach.ncEUnsure':
      'Kursun yaradılıb-yaradılmadığını heç kim deyə bilməz. Səhifəni yenidən yükləyin və onu yenidən yaratmazdan əvvəl kurslarınıza baxın.',
    'teach.ncESignedOut': 'Hesabdan çıxmısınız. Yenidən daxil olun, sonra bir dəfə də cəhd edin.',
    'teach.back': 'Təhsilimə qayıt',
  },
  tg: {
    'teach.eyebrow': 'Таълим',
    'teach.notYetTitle': 'Ин ҷо бахши таълим аст',
    'teach.byAppointment': 'Дар ин ҷо дарс додан бо таъинот аст.',
    'teach.byAppointmentBody':
      'Муаллимро соҳиб таъин мекунад. То он вақт ҳисоби шумо ҳисоби омӯзанда аст, ва ҳисоби омӯзанда курс кушода наметавонад.',
    'teach.ask':
      'Шумо метавонед хоҳиш кунед: тахассусҳои худ ва як дарси намунавиро фиристед, ва соҳиб онҳоро мехонад. Ариза додан таъин шудан нест. То даме ки касе хаттӣ қарор накунад, ҳеҷ чиз дода намешавад.',
    'teach.apply': 'Барои дарс додан ариза додан',
    'teach.goLearning': 'Ба таълими ман гузаштан',
    'teach.title': 'Курсҳои ман',
    'teach.lede':
      'Ҳуқуқи муаллиф ба ҳар чизе, ки дар ин ҷост, дар дасти шумо мемонад. Аз он чи аллакай фурӯхтаед, ҳеҷ чиз пас гирифта намешавад: омӯзандагоне, ки номнавис шудаанд, дастрасии худро нигоҳ медоранд, ҳатто агар баъдтар курсро қатъ кунед.',
    'teach.tdDecided': 'Оид ба огоҳинома дар бораи яке аз версияҳои шумо қарор қабул шуд.',
    'teach.tdHeldOne': 'Яке аз курсҳои шумо то баррасии даъво бар зидди он боздошта шудааст.',
    'teach.tdHeldMany':
      'Курсҳои шумо, ки то баррасии даъвоҳо бар зидди онҳо боздошта шудаанд: {count}.',
    'teach.tdBelow':
      'Даъво дар поён аст, бо ҳамон суханоне, ки фиристода шуд, ва шумо метавонед дар ҳамон ҷо ба он ҷавоб диҳед.',
    'teach.lPromotions': 'Аксияҳо',
    'teach.nPromotions':
      'барои курсҳои худ, дар кишварҳое, ки интихоб мекунед, пешниҳоде эълон кунед, ки як оила чанд бор истифода карда метавонад, маҳдуд аст',
    'teach.scTitle': 'Санҷиш',
    'teach.scStNone': 'Санҷиши сабтшуда нест',
    'teach.scStChecked': 'Тафтиш шуд',
    'teach.scStLapsed': 'Мӯҳлаташ гузашта',
    'teach.scStFailed': 'Нагузашт',
    'teach.scNone':
      'Дар бораи шумо ҳанӯз санҷише сабт нашудааст. Онро шахсе, ки муаллимонро таъин мекунад, сабт мекунад: навъи санҷиш, сана ва оё мӯҳлаташ тамом мешавад.',
    'teach.scFailedOn':
      'Санҷише, ки {date} сабт шуда буд, нагузашт. Шахсе, ки онро сабт кардааст, метавонад ба шумо гӯяд, ки баъд чӣ мешавад.',
    'teach.scFailed':
      'Санҷише, ки ба ҳисоби шумо сабт шуда буд, нагузашт. Шахсе, ки онро сабт кардааст, метавонад ба шумо гӯяд, ки баъд чӣ мешавад.',
    'teach.scLapsedOn': 'Мӯҳлати санҷиши охирини шумо {date} тамом шуд.',
    'teach.scLapsed': 'Мӯҳлати санҷиши охирини шумо тамом шудааст.',
    'teach.scHoldsFrom': 'Санҷиш {date} сабт шуд ва то {until} эътибор дорад.',
    'teach.scHolds': 'Санҷиш сабт шуд ва то {until} эътибор дорад.',
    'teach.scNoExpiryFrom': 'Санҷиш {date} сабт шуд, санаи анҷоми мӯҳлат зикр нашудааст.',
    'teach.scNoExpiry': 'Санҷиш сабт шуд, санаи анҷоми мӯҳлат зикр нашудааст.',
    'teach.scKind': 'Навъи санҷиш, ҳамон тавре ки навишта шуда буд:',
    'teach.scBlocks':
      'То даме ки санҷиши боэътибор сабт нашавад, курсе, ки барои кӯдакон менависед, нашр шуда наметавонад.',
    'teach.scNotAsked':
      'Платформа имрӯз санҷиш талаб намекунад, бинобар ин дар ин ҷо ҳеҷ чиз ба нашри курси шумо монеъ намешавад. Агар ин тағйир ёбад, аввал ҳамин саҳифа мегӯяд.',
    'teach.scKept': 'Ин сабт то {date} нигоҳ дошта мешавад ва баъд нест карда мешавад.',
    'teach.empty': 'Шумо ҳанӯз курсе насохтаед.',
    'teach.stDraft': 'Сиёҳнавис',
    'teach.stActive': 'Фаъол',
    'teach.stRetired': 'Қатъшуда',
    'teach.published': 'Нашршуда',
    'teach.open': 'Кушодани барномаи таълимӣ',
    'teach.lPaths': 'Роҳҳои омӯзиш',
    'teach.nPaths': 'аз курсҳои фаъол пайдарпаие тартиб диҳед',
    'teach.lProfile': 'Профили оммавии муаллим',
    'teach.nProfile': 'худро муаррифӣ кунед ва ба каналҳои иҷтимоии худ пайванд гузоред',
    'teach.lMedia': 'Китобхонаи медиа',
    'teach.nMedia': 'сабтҳои дарсро бор кунед ва бинед, ки кадомашон барои истифода тайёр аст',
    'teach.lBoard': 'Муҳокимаи муаллимон',
    'teach.nBoard':
      'майдони муҳокима танҳо барои муаллимон; дар он ҷо шумо бо номи корбарӣ менависед, на бо номи худ',
    'teach.lEarnings': 'Даромад',
    'teach.nEarnings':
      'он чи курсҳои шумо бо ҳар асъор ба даст овардаанд ва фурӯшҳое, ки дар паси он ҳастанд; ҳанӯз ҳеҷ чиз пардохт намешавад, пас ин сабт аст, на бақия',
    'teach.lPayouts': 'Гирифтани пардохт',
    'teach.nPayouts':
      'пулеро, ки курсҳои шумо ба даст овардаанд, пас аз баромадан аз нигоҳдорӣ барои баргардонидани маблағ талаб кунед ва бинед, ки бо ҳар дархости пешина чӣ шуд',
    'teach.create': 'Сохтан',
    'teach.ncTitle': 'Курси нав',
    'teach.ncField': 'Сарлавҳаи курс',
    'teach.ncExample': 'Муқаддима ба таҷвид',
    'teach.ncCreate': 'Сохтани курс',
    'teach.ncCreating': 'Сохта мешавад…',
    'teach.ncETitle': 'Ба курс сарлавҳа диҳед.',
    'teach.ncEDuplicate':
      'Курсе бо чунин ном аллакай ҳаст. Сарлавҳаро каме тағйир диҳед ва дубора кӯшиш кунед.',
    'teach.ncERefused': 'Курс сохта нашуд. Он чи пойгоҳи додаҳо гуфт:',
    'teach.ncEUnsure':
      'Ҳеҷ кас гуфта наметавонад, ки курс сохта шуд ё не. Саҳифаро аз нав бор кунед ва пеш аз дубора сохтан ба курсҳои худ нигаред.',
    'teach.ncESignedOut':
      'Шумо аз ҳисоб баромадаед. Дубора ворид шавед, сипас як бори дигар кӯшиш кунед.',
    'teach.back': 'Бозгашт ба таълими ман',
  },
  ky: {
    'teach.eyebrow': 'Окутуу',
    'teach.notYetTitle': 'Бул — окутуу бөлүмү',
    'teach.byAppointment': 'Бул жерде сабак берүү дайындоо аркылуу болот.',
    'teach.byAppointmentBody':
      'Мугалимди платформанын ээси дайындайт. Ага чейин аккаунтуңуз окуучунун аккаунту болот, ал эми окуучунун аккаунту курс ача албайт.',
    'teach.ask':
      'Сурансаңыз болот: квалификацияңызды жана үлгү сабакты жөнөтүңүз, платформанын ээси аларды окуйт. Арыз берүү дайындалуу эмес. Кимдир бирөө жазуу жүзүндө чечмейинче эч нерсе берилбейт.',
    'teach.apply': 'Сабак берүүгө арыз берүү',
    'teach.goLearning': 'Окуума өтүү',
    'teach.title': 'Менин курстарым',
    'teach.lede':
      'Бул жердегинин баарына автордук укук өзүңүздө калат. Сатып койгонуңуздан эч нерсе кайтарылып алынбайт: кийин курсту токтотсоңуз да, жазылган окуучулардын кирүү мүмкүнчүлүгү сакталат.',
    'teach.tdDecided': 'Версияларыңыздын бири тууралуу билдирүү боюнча чечим кабыл алынды.',
    'teach.tdHeldOne': 'Курстарыңыздын бири ага каршы доо каралып жатканда кармалып турат.',
    'teach.tdHeldMany':
      'Аларга каршы доолор каралып жатканда кармалып турган курстарыңыз: {count}.',
    'teach.tdBelow':
      'Доо төмөндө, кандай жөнөтүлсө, ошол сөздөр менен турат, ага ошол жерден жооп бере аласыз.',
    'teach.lPromotions': 'Акциялар',
    'teach.nPromotions':
      'өз курстарыңызга, өзүңүз тандаган өлкөлөрдө, бир үй-бүлө канча жолу колдоно алары чектелген сунуш жарыялаңыз',
    'teach.scTitle': 'Текшерүү',
    'teach.scStNone': 'Катталган текшерүү жок',
    'teach.scStChecked': 'Текшерилди',
    'teach.scStLapsed': 'Мөөнөтү бүткөн',
    'teach.scStFailed': 'Өткөн жок',
    'teach.scNone':
      'Сиз тууралуу азырынча текшерүү каттала элек. Аны мугалимдерди дайындаган адам каттайт: текшерүүнүн түрү, күнү жана мөөнөтү бүтөр-бүтпөсү.',
    'teach.scFailedOn':
      '{date} күнү катталган текшерүү өткөн жок. Андан ары эмне болорун аны каттаган адам айтып бере алат.',
    'teach.scFailed':
      'Аккаунтуңузга катталган текшерүү өткөн жок. Андан ары эмне болорун аны каттаган адам айтып бере алат.',
    'teach.scLapsedOn': 'Акыркы текшерүүңүздүн мөөнөтү {date} күнү бүттү.',
    'teach.scLapsed': 'Акыркы текшерүүңүздүн мөөнөтү бүттү.',
    'teach.scHoldsFrom': 'Текшерүү {date} күнү катталган жана {until} күнүнө чейин жарактуу.',
    'teach.scHolds': 'Текшерүү катталган жана {until} күнүнө чейин жарактуу.',
    'teach.scNoExpiryFrom': 'Текшерүү {date} күнү катталган, бүтүү мөөнөтү көрсөтүлгөн эмес.',
    'teach.scNoExpiry': 'Текшерүү катталган, бүтүү мөөнөтү көрсөтүлгөн эмес.',
    'teach.scKind': 'Текшерүүнүн түрү, кандай жазылса, ошондой:',
    'teach.scBlocks':
      'Жарактуу текшерүү катталмайынча, балдар үчүн жазган курсуңузду жарыялоого болбойт.',
    'teach.scNotAsked':
      'Платформа бүгүн текшерүүнү талап кылбайт, ошондуктан бул жерде курсуңуздун жарыяланышына эч нерсе тоскоол болбойт. Эгер бул өзгөрсө, биринчи болуп ушул барак айтат.',
    'teach.scKept': 'Бул жазуу {date} күнүнө чейин сакталат, андан кийин өчүрүлөт.',
    'teach.empty': 'Азырынча курс түзө элексиз.',
    'teach.stDraft': 'Каралама',
    'teach.stActive': 'Активдүү',
    'teach.stRetired': 'Токтотулган',
    'teach.published': 'Жарыяланган',
    'teach.open': 'Окуу программасын ачуу',
    'teach.lPaths': 'Окуу жолдору',
    'teach.nPaths': 'активдүү курстардан ырааттуулук түзүңүз',
    'teach.lProfile': 'Мугалимдин ачык профили',
    'teach.nProfile': 'өзүңүздү тааныштырып, социалдык каналдарыңызга шилтеме коюңуз',
    'teach.lMedia': 'Медиа китепканасы',
    'teach.nMedia': 'сабак жазууларын жүктөп, кайсынысы колдонууга даяр экенин көрүңүз',
    'teach.lBoard': 'Мугалимдердин талкуусу',
    'teach.nBoard':
      'мугалимдер үчүн гана талкуу аянты; ал жерде өз атыңыз менен эмес, колдонуучу аты менен жазасыз',
    'teach.lEarnings': 'Киреше',
    'teach.nEarnings':
      'курстарыңыздын ар бир валютада тапканы жана анын артындагы сатуулар; азырынча эч нерсе төлөнө элек, ошондуктан бул калдык эмес, жазуу',
    'teach.lPayouts': 'Төлөм алуу',
    'teach.nPayouts':
      'курстарыңыз тапкан акча кайтаруу үчүн кармап туруудан чыккандан кийин аны сураңыз жана мурунку ар бир сурамдын эмне болгонун көрүңүз',
    'teach.create': 'Түзүү',
    'teach.ncTitle': 'Жаңы курс',
    'teach.ncField': 'Курстун аталышы',
    'teach.ncExample': 'Тажвидге киришүү',
    'teach.ncCreate': 'Курс түзүү',
    'teach.ncCreating': 'Түзүлүүдө…',
    'teach.ncETitle': 'Курска аталыш бериңиз.',
    'teach.ncEDuplicate':
      'Мындай аталыштагы курс мурунтан эле бар. Аталышын бир аз өзгөртүп, кайра аракет кылыңыз.',
    'teach.ncERefused': 'Курс түзүлгөн жок. Маалымат базасынын айтканы:',
    'teach.ncEUnsure':
      'Курс түзүлгөнүн же түзүлбөгөнүн эч ким айта албайт. Баракты кайра жүктөп, кайра түзөрдөн мурда курстарыңызды караңыз.',
    'teach.ncESignedOut': 'Аккаунттан чыгып кеткенсиз. Кайра кирип, дагы бир жолу аракет кылыңыз.',
    'teach.back': 'Менин окуума кайтуу',
  },
  tk: {
    'teach.eyebrow': 'Okatmak',
    'teach.notYetTitle': 'Bu ýer okatmak bölümidir',
    'teach.byAppointment': 'Bu ýerde sapak bermek bellenilmek arkaly bolýar.',
    'teach.byAppointmentBody':
      'Mugallymy platformanyň eýesi belleýär. Şoňa çenli hasabyňyz okuwçynyň hasabydyr, okuwçynyň hasaby bolsa kurs açyp bilmeýär.',
    'teach.ask':
      'Haýyş edip bilersiňiz: hünär derejeleriňizi we nusga sapagy iberiň, platformanyň eýesi olary okaýar. Ýüz tutmak bellenilmek däldir. Kimdir biri ýazmaça karar berýänçä hiç zat berilmeýär.',
    'teach.apply': 'Sapak bermek üçin ýüz tut',
    'teach.goLearning': 'Okuwyma geç',
    'teach.title': 'Kurslarym',
    'teach.lede':
      'Bu ýerdäki ähli zadyň awtorlyk hukugy sizde galýar. Eýýäm satan zatlaryňyzdan hiç zat yzyna alynmaýar: kursy soň bes etseňiz-de, ýazylan okuwçylaryň elýeterliligi galýar.',
    'teach.tdDecided': 'Wersiýalaryňyzyň biri barada habarnama boýunça karar berildi.',
    'teach.tdHeldOne': 'Kurslaryňyzyň biri oňa garşy talap seredilýärkä saklanyp dur.',
    'teach.tdHeldMany': 'Olara garşy talaplar seredilýärkä saklanyp duran kurslaryňyz: {count}.',
    'teach.tdBelow':
      'Talap aşakda, nähili iberilen bolsa, şol sözler bilen dur, oňa şol ýerde jogap berip bilersiňiz.',
    'teach.lPromotions': 'Aksiýalar',
    'teach.nPromotions':
      'öz kurslaryňyza, özüňiz saýlan ýurtlarda, bir maşgalanyň näçe gezek ulanyp biljekdigi çäklendirilen teklip yglan ediň',
    'teach.scTitle': 'Barlag',
    'teach.scStNone': 'Ýazga geçirilen barlag ýok',
    'teach.scStChecked': 'Barlandy',
    'teach.scStLapsed': 'Möhleti geçen',
    'teach.scStFailed': 'Geçmedi',
    'teach.scNone':
      'Siz barada entek barlag ýazga geçirilmedi. Ony mugallymlary belleýän adam ýazga geçirýär: barlagyň görnüşi, senesi we möhletiniň gutarýandygy ýa-da gutarmaýandygy.',
    'teach.scFailedOn':
      '{date} senesinde ýazga geçirilen barlag geçmedi. Mundan soň näme boljakdygyny ony ýazga geçiren adam aýdyp biler.',
    'teach.scFailed':
      'Hasabyňyza ýazga geçirilen barlag geçmedi. Mundan soň näme boljakdygyny ony ýazga geçiren adam aýdyp biler.',
    'teach.scLapsedOn': 'Soňky barlagyňyzyň möhleti {date} senesinde gutardy.',
    'teach.scLapsed': 'Soňky barlagyňyzyň möhleti gutardy.',
    'teach.scHoldsFrom':
      'Barlag {date} senesinde ýazga geçirildi we {until} senesine çenli güýjünde.',
    'teach.scHolds': 'Barlag ýazga geçirildi we {until} senesine çenli güýjünde.',
    'teach.scNoExpiryFrom':
      'Barlag {date} senesinde ýazga geçirildi, gutarýan möhleti görkezilmedi.',
    'teach.scNoExpiry': 'Barlag ýazga geçirildi, gutarýan möhleti görkezilmedi.',
    'teach.scKind': 'Barlagyň görnüşi, nähili ýazylan bolsa, şeýle:',
    'teach.scBlocks':
      'Güýjündäki barlag ýazga geçirilýänçä, çagalar üçin ýazan kursuňyzy çap edip bolmaýar.',
    'teach.scNotAsked':
      'Platforma şu gün barlag talap etmeýär, şonuň üçin bu ýerde kursuňyzyň çap edilmegine hiç zat päsgel bermeýär. Eger bu üýtgese, ilki şu sahypa aýdar.',
    'teach.scKept': 'Bu ýazgy {date} senesine çenli saklanýar, soňra pozulýar.',
    'teach.empty': 'Entek kurs döretmediňiz.',
    'teach.stDraft': 'Garalama',
    'teach.stActive': 'Işjeň',
    'teach.stRetired': 'Bes edilen',
    'teach.published': 'Çap edilen',
    'teach.open': 'Okuw meýilnamasyny aç',
    'teach.lPaths': 'Okuw ýollary',
    'teach.nPaths': 'işjeň kurslardan yzygiderlilik düzüň',
    'teach.lProfile': 'Mugallymyň açyk profili',
    'teach.nProfile': 'özüňizi tanyşdyryň we sosial kanallaryňyza salgylanma goýuň',
    'teach.lMedia': 'Media kitaphanasy',
    'teach.nMedia': 'sapak ýazgylaryny ýükläň we haýsylarynyň ulanmaga taýýardygyny görüň',
    'teach.lBoard': 'Mugallymlaryň maslahaty',
    'teach.nBoard':
      'diňe mugallymlar üçin maslahat meýdançasy; ol ýerde öz adyňyz bilen däl-de, ulanyjy ady bilen ýazýarsyňyz',
    'teach.lEarnings': 'Girdeji',
    'teach.nEarnings':
      'kurslaryňyzyň her walýutada gazanany we onuň arkasyndaky satuwlar; entek hiç zat tölenmeýär, şonuň üçin bu galyndy däl-de, ýazgydyr',
    'teach.lPayouts': 'Töleg almak',
    'teach.nPayouts':
      'kurslaryňyzyň gazanan puly gaýtarylmak üçin saklawdan çykandan soň ony soraň we öňki her haýyşyň näme bolandygyny görüň',
    'teach.create': 'Döret',
    'teach.ncTitle': 'Täze kurs',
    'teach.ncField': 'Kursuň sözbaşysy',
    'teach.ncExample': 'Tejwide giriş',
    'teach.ncCreate': 'Kurs döret',
    'teach.ncCreating': 'Döredilýär…',
    'teach.ncETitle': 'Kursa sözbaşy beriň.',
    'teach.ncEDuplicate': 'Şeýle atly kurs eýýäm bar. Sözbaşyny biraz üýtgedip, täzeden synanyşyň.',
    'teach.ncERefused': 'Kurs döredilmedi. Maglumat bazasynyň aýdany:',
    'teach.ncEUnsure':
      'Kursuň döredilendigini ýa-da döredilmändigini hiç kim aýdyp bilmez. Sahypany täzeden ýükläň we täzeden döretmezden öň kurslaryňyza serediň.',
    'teach.ncESignedOut': 'Hasapdan çykypsyňyz. Täzeden giriň, soňra ýene bir gezek synanyşyň.',
    'teach.back': 'Okuwyma dolanmak',
  },
  ta: {
    'teach.eyebrow': 'கற்பித்தல்',
    'teach.notYetTitle': 'இது கற்பித்தல் பகுதி',
    'teach.byAppointment': 'இங்கே கற்பித்தல் நியமனத்தின் மூலமே நடக்கிறது.',
    'teach.byAppointmentBody':
      'ஆசிரியரை உரிமையாளர் நியமிக்கிறார். அதுவரை உங்கள் கணக்கு கற்பவரின் கணக்கு; கற்பவரின் கணக்கால் பாடநெறியைத் திறக்க முடியாது.',
    'teach.ask':
      'நீங்கள் கேட்கலாம்: உங்கள் தகுதிகளையும் ஒரு மாதிரிப் பாடத்தையும் அனுப்புங்கள்; உரிமையாளர் அவற்றைப் படிக்கிறார். விண்ணப்பிப்பது நியமிக்கப்படுவது அல்ல. யாராவது எழுத்து மூலம் முடிவு செய்யும் வரை எதுவும் வழங்கப்படாது.',
    'teach.apply': 'கற்பிக்க விண்ணப்பிக்க',
    'teach.goLearning': 'என் கற்றலுக்குச் செல்',
    'teach.title': 'என் பாடநெறிகள்',
    'teach.lede':
      'இங்குள்ள அனைத்தின் பதிப்புரிமையும் உங்களிடமே இருக்கும். நீங்கள் ஏற்கெனவே விற்றது எதுவும் திரும்பப் பெறப்படாது: பின்னர் நீங்கள் பாடநெறியை நிறுத்தினாலும், சேர்ந்த கற்பவர்களின் அணுகல் தொடரும்.',
    'teach.tdDecided': 'உங்கள் பதிப்புகளில் ஒன்றைப் பற்றிய அறிவிப்பில் முடிவு எடுக்கப்பட்டது.',
    'teach.tdHeldOne':
      'உங்கள் பாடநெறிகளில் ஒன்று, அதற்கு எதிரான ஒரு கோரல் பரிசீலிக்கப்படும் வரை நிறுத்திவைக்கப்பட்டுள்ளது.',
    'teach.tdHeldMany':
      'எதிரான கோரல்கள் பரிசீலிக்கப்படும் வரை நிறுத்திவைக்கப்பட்டுள்ள உங்கள் பாடநெறிகள்: {count}.',
    'teach.tdBelow': 'கோரல் கீழே உள்ளது, அனுப்பப்பட்ட சொற்களிலேயே; அங்கேயே நீங்கள் பதிலளிக்கலாம்.',
    'teach.lPromotions': 'விளம்பரச் சலுகைகள்',
    'teach.nPromotions':
      'உங்கள் சொந்தப் பாடநெறிகளுக்கு, நீங்கள் தேர்ந்தெடுக்கும் நாடுகளில், ஒரு குடும்பம் எத்தனை முறை பயன்படுத்தலாம் என்ற வரம்புடன் ஒரு சலுகையை நடத்துங்கள்',
    'teach.scTitle': 'பின்னணிச் சரிபார்ப்பு',
    'teach.scStNone': 'பதிவில் சரிபார்ப்பு இல்லை',
    'teach.scStChecked': 'சரிபார்க்கப்பட்டது',
    'teach.scStLapsed': 'காலாவதியானது',
    'teach.scStFailed': 'தேறவில்லை',
    'teach.scNone':
      'உங்களைப் பற்றிய சரிபார்ப்பு இன்னும் பதிவில் இல்லை. ஆசிரியர்களை நியமிப்பவரே அதைப் பதிவு செய்கிறார்: சரிபார்ப்பின் வகை, தேதி, அது காலாவதியாகுமா என்பது.',
    'teach.scFailedOn':
      '{date} அன்று பதிவு செய்யப்பட்ட சரிபார்ப்பு தேறவில்லை. அடுத்து என்ன நடக்கும் என்பதை அதைப் பதிவு செய்தவர் உங்களுக்குச் சொல்லலாம்.',
    'teach.scFailed':
      'உங்கள் கணக்கில் பதிவு செய்யப்பட்ட சரிபார்ப்பு தேறவில்லை. அடுத்து என்ன நடக்கும் என்பதை அதைப் பதிவு செய்தவர் உங்களுக்குச் சொல்லலாம்.',
    'teach.scLapsedOn': 'உங்கள் கடைசிச் சரிபார்ப்பு {date} அன்று காலாவதியானது.',
    'teach.scLapsed': 'உங்கள் கடைசிச் சரிபார்ப்பு காலாவதியாகிவிட்டது.',
    'teach.scHoldsFrom':
      '{date} அன்று ஒரு சரிபார்ப்பு பதிவு செய்யப்பட்டது; அது {until} வரை செல்லுபடியாகும்.',
    'teach.scHolds': 'ஒரு சரிபார்ப்பு பதிவு செய்யப்பட்டது; அது {until} வரை செல்லுபடியாகும்.',
    'teach.scNoExpiryFrom':
      '{date} அன்று ஒரு சரிபார்ப்பு பதிவு செய்யப்பட்டது; காலாவதித் தேதி குறிப்பிடப்படவில்லை.',
    'teach.scNoExpiry': 'ஒரு சரிபார்ப்பு பதிவு செய்யப்பட்டது; காலாவதித் தேதி குறிப்பிடப்படவில்லை.',
    'teach.scKind': 'சரிபார்ப்பின் வகை, எழுதி வைக்கப்பட்டபடியே:',
    'teach.scBlocks':
      'நடப்பிலுள்ள சரிபார்ப்பு பதிவு செய்யப்படும் வரை, குழந்தைகளுக்காக நீங்கள் எழுதும் பாடநெறியை வெளியிட முடியாது.',
    'teach.scNotAsked':
      'தளம் இன்று சரிபார்ப்பைக் கேட்கவில்லை; எனவே உங்கள் பாடநெறி வெளியிடப்படுவதை இங்கே எதுவும் தடுக்கவில்லை. அது மாறினால், இந்தப் பக்கமே முதலில் சொல்லும்.',
    'teach.scKept': 'இந்தப் பதிவு {date} வரை வைத்திருக்கப்பட்டு, பின்னர் நீக்கப்படும்.',
    'teach.empty': 'நீங்கள் இன்னும் பாடநெறி எதையும் உருவாக்கவில்லை.',
    'teach.stDraft': 'வரைவு',
    'teach.stActive': 'செயலில் உள்ளது',
    'teach.stRetired': 'நிறுத்தப்பட்டது',
    'teach.published': 'வெளியிடப்பட்டது',
    'teach.open': 'பாடத்திட்டத்தைத் திற',
    'teach.lPaths': 'கற்றல் பாதைகள்',
    'teach.nPaths': 'செயலிலுள்ள பாடநெறிகளை ஒரு வரிசையாக அமையுங்கள்',
    'teach.lProfile': 'பொது ஆசிரியர் சுயவிவரம்',
    'teach.nProfile': 'உங்களை அறிமுகப்படுத்தி, உங்கள் சமூக ஊடகச் சேனல்களை இணையுங்கள்',
    'teach.lMedia': 'ஊடக நூலகம்',
    'teach.nMedia': 'பாடப் பதிவுகளைப் பதிவேற்றி, எவை பயன்படுத்தத் தயாராக உள்ளன என்று பாருங்கள்',
    'teach.lBoard': 'ஆசிரியர் கலந்துரையாடல்',
    'teach.nBoard':
      'ஆசிரியர்களுக்கு மட்டுமான பலகை; அங்கே உங்கள் பெயரில் அல்ல, பயனர்பெயரில் எழுதுகிறீர்கள்',
    'teach.lEarnings': 'வருமானம்',
    'teach.nEarnings':
      'உங்கள் பாடநெறிகள் ஒவ்வொரு நாணயத்திலும் ஈட்டியதும் அதன் பின்னாலுள்ள விற்பனைகளும்; இன்னும் எதுவும் செலுத்தப்படவில்லை, எனவே இது பதிவேடு, இருப்புத் தொகை அல்ல',
    'teach.lPayouts': 'பணம் பெறுதல்',
    'teach.nPayouts':
      'உங்கள் பாடநெறிகள் ஈட்டிய பணம் பணத்திருப்புக்கான நிறுத்திவைப்பிலிருந்து வெளிவந்ததும் அதைக் கேளுங்கள்; முந்தைய ஒவ்வொரு கோரிக்கைக்கும் என்ன ஆனது என்று பாருங்கள்',
    'teach.create': 'உருவாக்கு',
    'teach.ncTitle': 'புதிய பாடநெறி',
    'teach.ncField': 'பாடநெறித் தலைப்பு',
    'teach.ncExample': 'தஜ்வீத் அறிமுகம்',
    'teach.ncCreate': 'பாடநெறியை உருவாக்கு',
    'teach.ncCreating': 'உருவாக்கப்படுகிறது…',
    'teach.ncETitle': 'பாடநெறிக்கு ஒரு தலைப்பைக் கொடுங்கள்.',
    'teach.ncEDuplicate':
      'அந்தப் பெயரில் ஒரு பாடநெறி ஏற்கெனவே உள்ளது. தலைப்பைச் சற்று மாற்றி மீண்டும் முயலுங்கள்.',
    'teach.ncERefused': 'பாடநெறி உருவாக்கப்படவில்லை. தரவுத்தளம் சொன்னது:',
    'teach.ncEUnsure':
      'பாடநெறி உருவாக்கப்பட்டதா என்று யாராலும் சொல்ல முடியாது. பக்கத்தை மீண்டும் ஏற்றி, மீண்டும் உருவாக்குவதற்கு முன் உங்கள் பாடநெறிகளைப் பாருங்கள்.',
    'teach.ncESignedOut':
      'நீங்கள் வெளியேறியுள்ளீர்கள். மீண்டும் உள்நுழைந்து, இன்னொரு முறை முயலுங்கள்.',
    'teach.back': 'என் கற்றலுக்குத் திரும்பு',
  },
  ne: {
    'teach.eyebrow': 'शिक्षण',
    'teach.notYetTitle': 'यो शिक्षण क्षेत्र हो',
    'teach.byAppointment': 'यहाँ पढाउने काम नियुक्तिबाट हुन्छ।',
    'teach.byAppointmentBody':
      'शिक्षकलाई मालिकले नियुक्त गर्छन्। त्यतिन्जेल तपाईंको खाता सिकारुको खाता हो, र सिकारुको खाताले कोर्स खोल्न सक्दैन।',
    'teach.ask':
      'तपाईं अनुरोध गर्न सक्नुहुन्छ: आफ्ना योग्यता र एउटा नमुना पाठ पठाउनुहोस्, र मालिकले ती पढ्छन्। आवेदन दिनु नियुक्त हुनु होइन। कसैले लिखित रूपमा निर्णय नगरेसम्म केही पनि दिइँदैन।',
    'teach.apply': 'पढाउन आवेदन दिनुहोस्',
    'teach.goLearning': 'मेरो सिकाइमा जानुहोस्',
    'teach.title': 'मेरा कोर्सहरू',
    'teach.lede':
      'यहाँ भएका सबै कुराको प्रतिलिपि अधिकार तपाईंसँगै रहन्छ। तपाईंले पहिले नै बेचिसकेको कुनै पनि कुरा फिर्ता लिइँदैन: तपाईंले पछि कोर्स हटाए पनि भर्ना भएका सिकारुहरूको पहुँच कायम रहन्छ।',
    'teach.tdDecided': 'तपाईंको एउटा संस्करणबारेको सूचनामा निर्णय भयो।',
    'teach.tdHeldOne': 'तपाईंको एउटा कोर्स त्यसविरुद्धको दाबी हेरिँदै गर्दा रोकिएको छ।',
    'teach.tdHeldMany': 'तिनका विरुद्धका दाबीहरू हेरिँदै गर्दा रोकिएका तपाईंका कोर्सहरू: {count}।',
    'teach.tdBelow':
      'दाबी तल छ, जुन शब्दमा पठाइएको थियो त्यही शब्दमा, र तपाईं त्यहीँ जवाफ दिन सक्नुहुन्छ।',
    'teach.lPromotions': 'प्रवर्द्धनहरू',
    'teach.nPromotions':
      'आफ्नै कोर्सहरूमा, आफूले रोजेका देशहरूमा, एउटा परिवारले कति पटक प्रयोग गर्न पाउने भन्ने सीमासहित अफर चलाउनुहोस्',
    'teach.scTitle': 'जाँच',
    'teach.scStNone': 'अभिलेखमा कुनै जाँच छैन',
    'teach.scStChecked': 'जाँच भयो',
    'teach.scStLapsed': 'म्याद सकिएको',
    'teach.scStFailed': 'पास भएन',
    'teach.scNone':
      'तपाईंबारे अझै कुनै जाँच अभिलेखमा छैन। शिक्षक नियुक्त गर्ने व्यक्तिले त्यो दर्ता गर्छन्: जाँचको प्रकार, मिति, र त्यसको म्याद सकिन्छ कि सकिँदैन।',
    'teach.scFailedOn':
      '{date} मा दर्ता गरिएको जाँच पास भएन। अब के हुन्छ भनेर त्यो दर्ता गर्ने व्यक्तिले तपाईंलाई बताउन सक्छन्।',
    'teach.scFailed':
      'तपाईंको खातामा दर्ता गरिएको जाँच पास भएन। अब के हुन्छ भनेर त्यो दर्ता गर्ने व्यक्तिले तपाईंलाई बताउन सक्छन्।',
    'teach.scLapsedOn': 'तपाईंको पछिल्लो जाँचको म्याद {date} मा सकियो।',
    'teach.scLapsed': 'तपाईंको पछिल्लो जाँचको म्याद सकिएको छ।',
    'teach.scHoldsFrom': '{date} मा एउटा जाँच दर्ता गरियो र त्यो {until} सम्म मान्य छ।',
    'teach.scHolds': 'एउटा जाँच दर्ता गरियो र त्यो {until} सम्म मान्य छ।',
    'teach.scNoExpiryFrom': '{date} मा एउटा जाँच दर्ता गरियो, म्याद सकिने मिति उल्लेख गरिएको छैन।',
    'teach.scNoExpiry': 'एउटा जाँच दर्ता गरियो, म्याद सकिने मिति उल्लेख गरिएको छैन।',
    'teach.scKind': 'जाँचको प्रकार, जसरी लेखिएको थियो त्यसरी नै:',
    'teach.scBlocks':
      'म्याद बाँकी रहेको जाँच दर्ता नभएसम्म, तपाईंले बालबालिकाका लागि लेखेको कोर्स प्रकाशित हुन सक्दैन।',
    'teach.scNotAsked':
      'प्लेटफर्मले आज जाँच मागिरहेको छैन, त्यसैले यहाँ कुनै पनि कुराले तपाईंको कोर्स प्रकाशित हुन रोक्दैन। त्यो बदलियो भने, यो पृष्ठले नै पहिले भन्छ।',
    'teach.scKept': 'यो अभिलेख {date} सम्म राखिन्छ र त्यसपछि मेटाइन्छ।',
    'teach.empty': 'तपाईंले अझै कुनै कोर्स बनाउनुभएको छैन।',
    'teach.stDraft': 'मस्यौदा',
    'teach.stActive': 'सक्रिय',
    'teach.stRetired': 'हटाइएको',
    'teach.published': 'प्रकाशित',
    'teach.open': 'पाठ्यक्रम खोल्नुहोस्',
    'teach.lPaths': 'सिकाइका मार्गहरू',
    'teach.nPaths': 'सक्रिय कोर्सहरूको एउटा क्रम मिलाउनुहोस्',
    'teach.lProfile': 'सार्वजनिक शिक्षक प्रोफाइल',
    'teach.nProfile': 'आफ्नो परिचय दिनुहोस् र आफ्ना सामाजिक च्यानलहरू जोड्नुहोस्',
    'teach.lMedia': 'मिडिया पुस्तकालय',
    'teach.nMedia': 'पाठका रेकर्डिङहरू अपलोड गर्नुहोस् र कुन-कुन प्रयोग गर्न तयार छन् हेर्नुहोस्',
    'teach.lBoard': 'शिक्षकहरूको छलफल',
    'teach.nBoard':
      'शिक्षकहरूका लागि मात्र छलफल बोर्ड; त्यहाँ तपाईं आफ्नो नाममा होइन, प्रयोगकर्ता नाममा लेख्नुहुन्छ',
    'teach.lEarnings': 'आम्दानी',
    'teach.nEarnings':
      'तपाईंका कोर्सहरूले हरेक मुद्रामा कमाएको रकम र त्यसका पछाडिका बिक्रीहरू; अझै केही पनि भुक्तानी गरिएको छैन, त्यसैले यो अभिलेख हो, मौज्दात होइन',
    'teach.lPayouts': 'भुक्तानी पाउने',
    'teach.nPayouts':
      'तपाईंका कोर्सहरूले कमाएको पैसा रकम फिर्ताका लागि रोक्काबाट बाहिर आएपछि माग्नुहोस्, र अघिल्लो हरेक अनुरोधको के भयो हेर्नुहोस्',
    'teach.create': 'बनाउनुहोस्',
    'teach.ncTitle': 'नयाँ कोर्स',
    'teach.ncField': 'कोर्सको शीर्षक',
    'teach.ncExample': 'तजवीदको परिचय',
    'teach.ncCreate': 'कोर्स बनाउनुहोस्',
    'teach.ncCreating': 'बनाइँदै छ…',
    'teach.ncETitle': 'कोर्सलाई शीर्षक दिनुहोस्।',
    'teach.ncEDuplicate': 'त्यो नामको कोर्स पहिले नै छ। शीर्षक अलिकति बदलेर फेरि प्रयास गर्नुहोस्।',
    'teach.ncERefused': 'कोर्स बनेन। डाटाबेसले भनेको कुरा:',
    'teach.ncEUnsure':
      'कोर्स बन्यो कि बनेन कसैले भन्न सक्दैन। पृष्ठ फेरि लोड गर्नुहोस् र फेरि बनाउनुअघि आफ्ना कोर्सहरू हेर्नुहोस्।',
    'teach.ncESignedOut':
      'तपाईं साइन आउट हुनुभएको छ। फेरि साइन इन गर्नुहोस्, अनि अर्को एक पटक प्रयास गर्नुहोस्।',
    'teach.back': 'मेरो सिकाइमा फर्कनुहोस्',
  },
};
