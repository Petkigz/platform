import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The players on the lesson page, and everything they say about a saved
 * place: `app/_shared/media-resume.tsx`, `position-status.tsx`,
 * `rendition-player.tsx` and the hook `use-media-position.ts`.
 *
 * Same rule as `lesson.ts`: written for the twenty-seven languages with
 * nothing held in `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Sent only where a player is.** These sentences are for the browser, so
 * they cannot be server-only; they are also too many to send with every
 * page. `shellMessagesFor` leaves `player.` out, and the lesson page hands
 * `playerMessagesFor(code)` to a provider of its own around the materials
 * list, and only when the lesson has something to play. A player anywhere
 * else (the review page, the staff's master player) reads English.
 *
 * **Unreviewed, and this part matters more than most.** No speaker has read
 * any of these. `player.recoveryNotice` is the notice a learner reads before
 * allowing this browser to keep a temporary place: it is what their consent
 * rests on. It says who can see what is kept (anyone with this browser
 * profile, across accounts), what turning it off removes, that the account
 * must be confirmed online first, and that the seven-day limit is cleared on
 * a later visit and not at the moment it passes. A translation that softens
 * any of those four is a wrong translation, whatever else it gets right. The
 * owner chose to translate it and not to leave it English until a speaker had
 * read it (2026-11-18); it is the first thing a reviewer should be shown.
 *
 * **What no sentence may say.** A place is saved about every ten seconds and
 * when the page is left; nothing here promises that nothing was lost, and
 * "saved place" never becomes "your progress".
 *
 * `{at}`, `{from}` and `{to}` are a place such as 12:34; `{when}` is a date
 * and time already written for the reader's language. "480p", "360p" and
 * "Plus" stay as they are. In Uzbek the marks are U+02BB and U+02BC only.
 */
export const PLAYER: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'player.videoUnsupported': 'متصفحك لا يستطيع تشغيل هذا الفيديو.',
    'player.audioUnsupported': 'متصفحك لا يستطيع تشغيل هذا الملف الصوتي.',
    'player.openVideo': 'افتح الفيديو مباشرة',
    'player.openAudio': 'افتح الملف الصوتي مباشرة',
    'player.speed': 'السرعة',
    'player.slower': 'أبطأ',
    'player.faster': 'أسرع',
    'player.loopFrom': 'كرِّر من هنا',
    'player.loopTo': 'إلى هنا',
    'player.loopStop': 'أوقف التكرار',
    'player.loopOpenEnd': 'التكرار يبدأ من {from} — حدِّد أين ينتهي.',
    'player.loopOpenStart': 'التكرار ينتهي عند {to} — حدِّد أين يبدأ.',
    'player.loopBackwards': 'هذا المقطع ينتهي قبل أن يبدأ. حدِّده من جديد.',
    'player.loopBoth': 'تكرار المقطع {from} – {to}.',
    'player.resuming': 'المتابعة من {at}.',
    'player.checking': 'جارٍ التحقق من موضعك المحفوظ…',
    'player.legacyGroup': 'موضع سابق محفوظ للدرس كله',
    'player.legacyPlace':
      'يوجد موضع سابق محفوظ للدرس كله عند {at}. قد يكون تابعًا لتسجيل آخر. يمكنك مراجعته هنا، ولن يحل محل الموضع المحفوظ لهذا التسجيل دون اختيارك.',
    'player.limit': 'المشغّل لا يتجاوز 24 ساعة.',
    'player.legacyReview': 'راجع الموضع السابق',
    'player.notNow': 'ليس الآن',
    'player.recoveryToggle': 'احتفظ بموضع استرداد مؤقت على هذا المتصفح',
    'player.recoveryNotice':
      'اختياري. أي شخص يستطيع الوصول إلى ملف تعريف هذا المتصفح قد يرى معرّفات الحساب والتسجيل في الدورة والدرس والتسجيل الصوتي أو المرئي، ومعرّفات الجلسات، والمواضع والأوقات، ومنها ما يخص حسابات أخرى تستخدمه. إيقاف هذا الخيار يزيل مواضع الاسترداد لجميع الحسابات على هذا المتصفح. يجب تأكيد حسابك عبر الاتصال بالإنترنت قبل تخزين أي موضع. تنتهي صلاحية السجلات بعد سبعة أيام وتُمسح عند زيارة لاحقة، وقد يكون التخزين غير متاح أو يُمسح قبل ذلك.',
    'player.earlierGroup': 'مواضع سابقة على الجهاز محفوظة للدرس كله',
    'player.earlierIntro':
      'هذه المواضع الأقدم حُفظت على الجهاز للدرس كله لا لتسجيل بعينه، وقد تكون تابعة لتسجيل آخر. راجع أحدها هنا أو تجاهله؛ المراجعة لا تستبدل موضع الحساب دون اختيار آخر منك.',
    'player.earlierReview': 'راجع الموضع السابق على الجهاز',
    'player.earlierReviewLabel': 'راجع الموضع السابق على الجهاز {at} بتاريخ {when}',
    'player.earlierDiscard': 'تجاهل الموضع السابق',
    'player.earlierDiscardLabel': 'تجاهل الموضع السابق على الجهاز {at} بتاريخ {when}',
    'player.deviceGroup': 'مواضع الاسترداد على الجهاز',
    'player.deviceIntro':
      'ربما لم يصل موضع من هذا المتصفح إلى حسابك. راجع كل موضع أو تجاهله قبل أن يستمر الحفظ التلقائي. اختيار أحدها يُبقي المواضع الأخرى لزيارة لاحقة.',
    'player.deviceReview': 'راجع هذا الموضع',
    'player.deviceReviewLabel': 'راجع موضع الجهاز {at} بتاريخ {when}',
    'player.deviceDiscard': 'تجاهل',
    'player.deviceDiscardLabel': 'تجاهل موضع الجهاز {at} بتاريخ {when}',
    'player.conflictGroup': 'اختر موضعك المحفوظ',
    'player.conflictIntro': 'قد يختلف الموضع المحفوظ في الحساب عن موضع هذا المشغّل.',
    'player.conflictNone': 'لا يوجد موضع محفوظ.',
    'player.conflictSaved': 'الموضع المحفوظ: {at}.',
    'player.conflictLocal': 'هذا المشغّل: {at}. أيهما تريد الاحتفاظ به؟',
    'player.useSaved': 'استخدم الموضع المحفوظ',
    'player.keepLocal': 'احتفظ بموضع هذا المشغّل',
    'player.storeClearFailed': 'تعذّر مسح التخزين على الجهاز. تحقق من إعدادات التخزين في متصفحك.',
    'player.storeSaveFailed': 'تعذّر حفظ موضع استرداد على هذا الجهاز.',
    'player.storeUnavailable': 'تخزين الاسترداد غير متاح في هذا المتصفح.',
    'player.storeReadFailed':
      'تعذّرت قراءة المواضع السابقة على الجهاز. تحقق من إعدادات التخزين في متصفحك.',
    'player.earlierClearFailed':
      'تعذّر مسح الموضع السابق على الجهاز. تحقق من إعدادات التخزين في متصفحك.',
    'player.unconfirmed': 'تعذّر تأكيد موضعك المحفوظ. أعد تحميل الدرس للتحقق قبل متابعة الحفظ.',
    'player.loadFailed':
      'تعذّر تحميل موضعك المحفوظ. يمكنك تشغيل هذا الدرس، لكن الحفظ غير متاح حتى تعيد التحميل.',
    'player.turnedOff': 'أُوقف الاسترداد أو مُسح من مكان آخر في هذا المتصفح.',
    'player.storeCheckFailed': 'تعذّر التحقق من تخزين الاسترداد في هذا المتصفح.',
    'player.legacyBusy': 'أنهِ اختيار الحفظ أو الاسترداد الحالي قبل مراجعة الموضع القديم.',
    'player.legacyWait': 'انتظر حتى يُحمَّل التسجيل قبل مراجعة الموضع القديم.',
    'player.legacyBeyond': 'الموضع القديم يتجاوز نهاية هذا التسجيل. قد يكون تابعًا لتسجيل آخر.',
    'player.legacySeekFailed':
      'تعذّر الانتقال إلى الموضع القديم. حاول مرة أخرى عندما يصبح التسجيل جاهزًا.',
    'player.earlierRemoveFailed': 'تعذّرت إزالة الموضع السابق على الجهاز.',
    'player.earlierBusy': 'أنهِ اختيار الحفظ أو الاسترداد الحالي قبل مراجعة موضع سابق على الجهاز.',
    'player.earlierWait': 'انتظر حتى يُحمَّل التسجيل قبل مراجعة الموضع السابق على الجهاز.',
    'player.earlierChanged': 'تغيّر الموضع السابق على الجهاز. راجع القائمة المحدَّثة.',
    'player.earlierBeyond':
      'الموضع السابق على الجهاز يتجاوز نهاية هذا التسجيل. قد يكون تابعًا لتسجيل آخر.',
    'player.earlierSeekFailed': 'تعذّر الانتقال إلى الموضع السابق على الجهاز.',
    'player.earlierReadFailed': 'تعذّرت قراءة الموضع السابق على الجهاز.',
    'player.needConfirmed':
      'لا يمكن للاسترداد تسجيل موضع قبل تأكيد حسابك. أعد التحميل عند الاتصال بالإنترنت.',
    'player.storeChangeFailed':
      'تعذّر تغيير التخزين على الجهاز أو مسحه كاملًا. تحقق من إعدادات التخزين في متصفحك.',
    'player.deviceRemoveFailed': 'تعذّرت إزالة موضع الاسترداد هذا من الجهاز.',
    'player.deviceChanged': 'تغيّر موضع الجهاز. راجع القائمة المحدَّثة.',
    'player.othersRemain':
      'مواضع الاسترداد الأخرى على الجهاز، إن وُجدت، تبقى متاحة عند إعادة فتح هذا الدرس.',
    'player.deviceUseFailed': 'تعذّر استخدام موضع الجهاز هذا. حاول مرة أخرى بعد تحميل الوسائط.',
    'player.quality': 'الجودة',
    'player.qualityStandard': '480p — عادية',
    'player.qualitySmall': '360p — صغيرة',
    'player.qualityAudio': 'صوت فقط',
    'player.saving': 'جارٍ الحفظ…',
    'player.saveDevice': 'احفظ على هذا الجهاز',
    'player.onDevice': 'على هذا الجهاز',
    'player.seePlus': 'اطّلع على ما تتضمنه Plus',
    'player.plusNote': 'حفظ الدرس على الجهاز جزء من خطة Plus.',
    'player.tryAgain': 'حاول مرة أخرى',
    'player.preparing': 'جارٍ تجهيز المشغّل…',
    'player.linksNote': 'روابط التشغيل قصيرة الأجل ومرتبطة بصلاحية وصولك إلى هذا الدرس.',
    'player.savedNote':
      'الدرس المحفوظ يبقى داخل التطبيق، لكنه يحتاج حاليًا إلى اتصال للتحقق من صلاحية الوصول في كل مرة تفتحه.',
    'player.playFailed': 'تعذّر تشغيل هذا الدرس.',
    'player.saveRefused': 'لا يمكن حفظ هذا الدرس ضمن هذه الخطة.',
    'player.fetchFailed': 'تعذّر جلب هذا الدرس لحفظه.',
    'player.saveFailed': 'تعذّر حفظ هذا الدرس.',
    'player.noCopy': 'لا توجد لهذا التسجيل نسخة يمكن تشغيلها بعد.',
  },
  ur: {
    'player.videoUnsupported': 'آپ کا براؤزر یہ ویڈیو نہیں چلا سکتا۔',
    'player.audioUnsupported': 'آپ کا براؤزر یہ آڈیو نہیں چلا سکتا۔',
    'player.openVideo': 'ویڈیو براہِ راست کھولیں',
    'player.openAudio': 'آڈیو براہِ راست کھولیں',
    'player.speed': 'رفتار',
    'player.slower': 'آہستہ',
    'player.faster': 'تیز',
    'player.loopFrom': 'یہاں سے دہرائیں',
    'player.loopTo': 'یہاں تک',
    'player.loopStop': 'دہرانا بند کریں',
    'player.loopOpenEnd': '{from} سے دہرایا جا رہا ہے — نشان لگائیں کہ کہاں ختم ہو۔',
    'player.loopOpenStart': '{to} تک دہرایا جا رہا ہے — نشان لگائیں کہ کہاں سے شروع ہو۔',
    'player.loopBackwards': 'یہ حصہ شروع ہونے سے پہلے ختم ہو رہا ہے۔ دوبارہ نشان لگائیں۔',
    'player.loopBoth': '{from} – {to} دہرایا جا رہا ہے۔',
    'player.resuming': '{at} سے دوبارہ شروع ہو رہا ہے۔',
    'player.checking': 'آپ کا محفوظ مقام دیکھا جا رہا ہے…',
    'player.legacyGroup': 'پورے سبق کا پہلے والا محفوظ مقام',
    'player.legacyPlace':
      'پورے سبق کے لیے پہلے محفوظ کیا گیا ایک مقام {at} ہے۔ ممکن ہے یہ کسی اور ریکارڈنگ کا ہو۔ آپ اسے یہاں دیکھ سکتے ہیں؛ آپ کے انتخاب کے بغیر یہ اس ریکارڈنگ کے محفوظ مقام کی جگہ نہیں لے گا۔',
    'player.limit': 'پلیئر 24 گھنٹے سے آگے نہیں جا سکتا۔',
    'player.legacyReview': 'پہلے والا مقام دیکھیں',
    'player.notNow': 'ابھی نہیں',
    'player.recoveryToggle': 'اس براؤزر پر عارضی بحالی کا مقام رکھیں',
    'player.recoveryNotice':
      'اختیاری۔ جس کسی کو اس براؤزر پروفائل تک رسائی ہو وہ اکاؤنٹ، اندراج، سبق اور ریکارڈنگ کے شناخت کنندہ، سیشن کے شناخت کنندہ، مقامات اور اوقات دیکھ سکتا ہے، اس براؤزر کو استعمال کرنے والے دوسرے اکاؤنٹس کے بھی۔ اسے بند کرنے سے اس براؤزر پر تمام اکاؤنٹس کے بحالی کے مقامات ہٹ جاتے ہیں۔ کوئی مقام محفوظ ہونے سے پہلے آپ کے اکاؤنٹ کی آن لائن تصدیق ضروری ہے۔ ریکارڈ سات دن بعد ختم ہو جاتے ہیں اور بعد کی کسی آمد پر صاف کر دیے جاتے ہیں؛ ممکن ہے اسٹوریج دستیاب نہ ہو یا اس سے پہلے صاف ہو جائے۔',
    'player.earlierGroup': 'آلے پر پورے سبق کے پہلے والے مقامات',
    'player.earlierIntro':
      'آلے کے یہ پرانے مقامات پورے سبق کے لیے محفوظ کیے گئے تھے، کسی خاص ریکارڈنگ کے لیے نہیں۔ ممکن ہے یہ کسی اور ریکارڈنگ کے ہوں۔ کسی ایک کو یہاں دیکھیں یا رد کر دیں؛ دیکھنے سے اکاؤنٹ کا مقام آپ کے مزید انتخاب کے بغیر نہیں بدلتا۔',
    'player.earlierReview': 'آلے کا پہلے والا مقام دیکھیں',
    'player.earlierReviewLabel': 'آلے کا پہلے والا مقام {at} دیکھیں، بتاریخ {when}',
    'player.earlierDiscard': 'پہلے والا مقام رد کریں',
    'player.earlierDiscardLabel': 'آلے کا پہلے والا مقام {at} رد کریں، بتاریخ {when}',
    'player.deviceGroup': 'آلے پر بحالی کے مقامات',
    'player.deviceIntro':
      'ممکن ہے اس براؤزر کا کوئی مقام آپ کے اکاؤنٹ تک نہ پہنچا ہو۔ خودکار محفوظ کاری جاری ہونے سے پہلے ہر مقام کو دیکھیں یا رد کریں۔ ایک کو چننے سے باقی مقامات بعد کی آمد کے لیے رہ جاتے ہیں۔',
    'player.deviceReview': 'یہ مقام دیکھیں',
    'player.deviceReviewLabel': 'آلے کا مقام {at} دیکھیں، بتاریخ {when}',
    'player.deviceDiscard': 'رد کریں',
    'player.deviceDiscardLabel': 'آلے کا مقام {at} رد کریں، بتاریخ {when}',
    'player.conflictGroup': 'اپنا محفوظ مقام چنیں',
    'player.conflictIntro': 'ممکن ہے اکاؤنٹ کا محفوظ مقام اس پلیئر سے مختلف ہو۔',
    'player.conflictNone': 'کوئی محفوظ مقام نہیں۔',
    'player.conflictSaved': 'محفوظ مقام: {at}۔',
    'player.conflictLocal': 'یہ پلیئر: {at}۔ کون سا رکھا جائے؟',
    'player.useSaved': 'محفوظ مقام استعمال کریں',
    'player.keepLocal': 'اس پلیئر کا مقام رکھیں',
    'player.storeClearFailed':
      'آلے کی اسٹوریج صاف نہیں ہو سکی۔ اپنے براؤزر کی اسٹوریج کی ترتیبات دیکھیں۔',
    'player.storeSaveFailed': 'اس آلے پر بحالی کا مقام محفوظ نہیں ہو سکا۔',
    'player.storeUnavailable': 'اس براؤزر میں بحالی کی اسٹوریج دستیاب نہیں۔',
    'player.storeReadFailed':
      'آلے کے پہلے والے مقامات پڑھے نہیں جا سکے۔ اپنے براؤزر کی اسٹوریج کی ترتیبات دیکھیں۔',
    'player.earlierClearFailed':
      'آلے کا پہلے والا مقام صاف نہیں ہو سکا۔ اپنے براؤزر کی اسٹوریج کی ترتیبات دیکھیں۔',
    'player.unconfirmed':
      'آپ کے محفوظ مقام کی تصدیق نہیں ہو سکی۔ محفوظ کاری جاری رکھنے سے پہلے جانچنے کے لیے سبق دوبارہ لوڈ کریں۔',
    'player.loadFailed':
      'آپ کا محفوظ مقام لوڈ نہیں ہو سکا۔ آپ یہ سبق چلا سکتے ہیں، لیکن دوبارہ لوڈ کرنے تک محفوظ کاری دستیاب نہیں۔',
    'player.turnedOff': 'بحالی اس براؤزر میں کسی اور جگہ سے بند یا صاف کر دی گئی۔',
    'player.storeCheckFailed': 'اس براؤزر میں بحالی کی اسٹوریج کی جانچ نہیں ہو سکی۔',
    'player.legacyBusy':
      'پرانا مقام دیکھنے سے پہلے موجودہ محفوظ کاری یا بحالی کا انتخاب مکمل کریں۔',
    'player.legacyWait': 'پرانا مقام دیکھنے سے پہلے ریکارڈنگ لوڈ ہونے کا انتظار کریں۔',
    'player.legacyBeyond':
      'پرانا مقام اس ریکارڈنگ کے اختتام سے آگے ہے۔ ممکن ہے یہ کسی اور ریکارڈنگ کا ہو۔',
    'player.legacySeekFailed':
      'پرانے مقام پر نہیں جایا جا سکا۔ ریکارڈنگ تیار ہونے پر دوبارہ کوشش کریں۔',
    'player.earlierRemoveFailed': 'آلے کا پہلے والا مقام ہٹایا نہیں جا سکا۔',
    'player.earlierBusy':
      'آلے کا پہلے والا مقام دیکھنے سے پہلے موجودہ محفوظ کاری یا بحالی کا انتخاب مکمل کریں۔',
    'player.earlierWait': 'آلے کا پہلے والا مقام دیکھنے سے پہلے ریکارڈنگ لوڈ ہونے کا انتظار کریں۔',
    'player.earlierChanged': 'آلے کا پہلے والا مقام بدل گیا ہے۔ تازہ فہرست دیکھیں۔',
    'player.earlierBeyond':
      'آلے کا پہلے والا مقام اس ریکارڈنگ کے اختتام سے آگے ہے۔ ممکن ہے یہ کسی اور ریکارڈنگ کا ہو۔',
    'player.earlierSeekFailed': 'آلے کے پہلے والے مقام پر نہیں جایا جا سکا۔',
    'player.earlierReadFailed': 'آلے کا پہلے والا مقام پڑھا نہیں جا سکا۔',
    'player.needConfirmed':
      'آپ کے اکاؤنٹ کی تصدیق ہونے تک بحالی کوئی مقام محفوظ نہیں کر سکتی۔ انٹرنیٹ سے جڑنے پر دوبارہ لوڈ کریں۔',
    'player.storeChangeFailed':
      'آلے کی اسٹوریج بدلی یا پوری طرح صاف نہیں ہو سکی۔ اپنے براؤزر کی اسٹوریج کی ترتیبات دیکھیں۔',
    'player.deviceRemoveFailed': 'بحالی کا یہ مقام آلے سے ہٹایا نہیں جا سکا۔',
    'player.deviceChanged': 'آلے کا مقام بدل گیا ہے۔ تازہ فہرست دیکھیں۔',
    'player.othersRemain':
      'آلے پر بحالی کے دوسرے مقامات، اگر ہوں، یہ سبق دوبارہ کھولنے پر دستیاب رہتے ہیں۔',
    'player.deviceUseFailed':
      'آلے کا یہ مقام استعمال نہیں ہو سکا۔ میڈیا لوڈ ہونے کے بعد دوبارہ کوشش کریں۔',
    'player.quality': 'معیار',
    'player.qualityStandard': '480p — معیاری',
    'player.qualitySmall': '360p — چھوٹا',
    'player.qualityAudio': 'صرف آڈیو',
    'player.saving': 'محفوظ ہو رہا ہے…',
    'player.saveDevice': 'اس آلے پر محفوظ کریں',
    'player.onDevice': 'اس آلے پر موجود',
    'player.seePlus': 'دیکھیں Plus میں کیا شامل ہے',
    'player.plusNote': 'سبق کو آلے پر محفوظ کرنا Plus پلان کا حصہ ہے۔',
    'player.tryAgain': 'دوبارہ کوشش کریں',
    'player.preparing': 'پلیئر تیار ہو رہا ہے…',
    'player.linksNote':
      'چلانے کے لنک تھوڑی دیر کے لیے ہوتے ہیں اور اس سبق تک آپ کی رسائی سے جڑے ہوتے ہیں۔',
    'player.savedNote':
      'محفوظ کیا گیا سبق ایپ کے اندر رہتا ہے، لیکن فی الحال ہر بار کھولنے پر رسائی جانچنے کے لیے کنکشن درکار ہے۔',
    'player.playFailed': 'یہ سبق چلایا نہیں جا سکا۔',
    'player.saveRefused': 'یہ سبق اس پلان پر محفوظ نہیں کیا جا سکتا۔',
    'player.fetchFailed': 'یہ سبق محفوظ کرنے کے لیے حاصل نہیں ہو سکا۔',
    'player.saveFailed': 'یہ سبق محفوظ نہیں ہو سکا۔',
    'player.noCopy': 'اس ریکارڈنگ کی ابھی کوئی ایسی نقل نہیں جو چلائی جا سکے۔',
  },
  fa: {
    'player.videoUnsupported': 'مرورگر شما نمی‌تواند این ویدیو را پخش کند.',
    'player.audioUnsupported': 'مرورگر شما نمی‌تواند این فایل صوتی را پخش کند.',
    'player.openVideo': 'ویدیو را مستقیم باز کنید',
    'player.openAudio': 'فایل صوتی را مستقیم باز کنید',
    'player.speed': 'سرعت',
    'player.slower': 'آهسته‌تر',
    'player.faster': 'تندتر',
    'player.loopFrom': 'تکرار از اینجا',
    'player.loopTo': 'تا اینجا',
    'player.loopStop': 'توقف تکرار',
    'player.loopOpenEnd': 'تکرار از {from} — مشخص کنید کجا تمام شود.',
    'player.loopOpenStart': 'تکرار تا {to} — مشخص کنید از کجا شروع شود.',
    'player.loopBackwards': 'این بخش پیش از شروعش تمام می‌شود. دوباره مشخصش کنید.',
    'player.loopBoth': 'تکرار {from} – {to}.',
    'player.resuming': 'ادامه از {at}.',
    'player.checking': 'در حال بررسی جای ذخیره‌شدهٔ شما…',
    'player.legacyGroup': 'جای قبلی ذخیره‌شده برای کل درس',
    'player.legacyPlace':
      'یک جای قبلی که برای کل درس ذخیره شده {at} است. شاید مربوط به ضبط دیگری باشد. می‌توانید آن را اینجا بررسی کنید؛ بدون انتخاب شما جایگزین جای ذخیره‌شدهٔ این ضبط نمی‌شود.',
    'player.limit': 'پخش‌کننده از ۲۴ ساعت فراتر نمی‌رود.',
    'player.legacyReview': 'بررسی جای قبلی',
    'player.notNow': 'فعلاً نه',
    'player.recoveryToggle': 'یک جای بازیابی موقت در این مرورگر نگه دار',
    'player.recoveryNotice':
      'اختیاری. هر کسی که به نمایهٔ این مرورگر دسترسی دارد ممکن است شناسه‌های حساب، ثبت‌نام، درس و ضبط، شناسه‌های نشست، جاها و زمان‌ها را ببیند، از جمله برای حساب‌های دیگری که از آن استفاده می‌کنند. خاموش کردن این گزینه جاهای بازیابی همهٔ حساب‌ها را در این مرورگر حذف می‌کند. پیش از ذخیرهٔ هر جا، حساب شما باید به‌صورت آنلاین تأیید شود. سوابق پس از هفت روز منقضی می‌شوند و در بازدیدی بعدی پاک می‌شوند؛ ممکن است فضای ذخیره‌سازی در دسترس نباشد یا زودتر پاک شود.',
    'player.earlierGroup': 'جاهای قبلی روی دستگاه برای کل درس',
    'player.earlierIntro':
      'این جاهای قدیمی‌تر روی دستگاه برای کل درس ذخیره شده‌اند، نه برای یک ضبط مشخص. شاید مربوط به ضبط دیگری باشند. یکی را اینجا بررسی کنید یا کنار بگذارید؛ بررسی کردن، بدون انتخابی دیگر، جای حساب را عوض نمی‌کند.',
    'player.earlierReview': 'بررسی جای قبلی روی دستگاه',
    'player.earlierReviewLabel': 'بررسی جای قبلی روی دستگاه {at} مربوط به {when}',
    'player.earlierDiscard': 'کنار گذاشتن جای قبلی',
    'player.earlierDiscardLabel': 'کنار گذاشتن جای قبلی روی دستگاه {at} مربوط به {when}',
    'player.deviceGroup': 'جاهای بازیابی روی دستگاه',
    'player.deviceIntro':
      'ممکن است جایی از این مرورگر به حساب شما نرسیده باشد. پیش از ادامهٔ ذخیرهٔ خودکار، هر جا را بررسی کنید یا کنار بگذارید. با انتخاب یکی، بقیه برای بازدیدی بعدی می‌مانند.',
    'player.deviceReview': 'بررسی این جا',
    'player.deviceReviewLabel': 'بررسی جای دستگاه {at} مربوط به {when}',
    'player.deviceDiscard': 'کنار گذاشتن',
    'player.deviceDiscardLabel': 'کنار گذاشتن جای دستگاه {at} مربوط به {when}',
    'player.conflictGroup': 'جای ذخیره‌شدهٔ خود را انتخاب کنید',
    'player.conflictIntro': 'ممکن است جای ذخیره‌شدهٔ حساب با این پخش‌کننده فرق داشته باشد.',
    'player.conflictNone': 'جای ذخیره‌شده‌ای نیست.',
    'player.conflictSaved': 'جای ذخیره‌شده: {at}.',
    'player.conflictLocal': 'این پخش‌کننده: {at}. کدام نگه داشته شود؟',
    'player.useSaved': 'استفاده از جای ذخیره‌شده',
    'player.keepLocal': 'جای این پخش‌کننده را نگه دار',
    'player.storeClearFailed':
      'فضای ذخیره‌سازی دستگاه پاک نشد. تنظیمات ذخیره‌سازی مرورگرتان را بررسی کنید.',
    'player.storeSaveFailed': 'ذخیرهٔ جای بازیابی در این دستگاه ممکن نشد.',
    'player.storeUnavailable': 'ذخیره‌سازی بازیابی در این مرورگر در دسترس نیست.',
    'player.storeReadFailed':
      'خواندن جاهای قبلی روی دستگاه ممکن نشد. تنظیمات ذخیره‌سازی مرورگرتان را بررسی کنید.',
    'player.earlierClearFailed':
      'پاک کردن جای قبلی روی دستگاه ممکن نشد. تنظیمات ذخیره‌سازی مرورگرتان را بررسی کنید.',
    'player.unconfirmed':
      'تأیید جای ذخیره‌شدهٔ شما ممکن نشد. پیش از ادامهٔ ذخیره، درس را دوباره بارگذاری کنید تا بررسی شود.',
    'player.loadFailed':
      'بارگذاری جای ذخیره‌شدهٔ شما ممکن نشد. می‌توانید این درس را پخش کنید، اما تا بارگذاری دوباره، ذخیره در دسترس نیست.',
    'player.turnedOff': 'بازیابی از جای دیگری در این مرورگر خاموش یا پاک شد.',
    'player.storeCheckFailed': 'بررسی ذخیره‌سازی بازیابی در این مرورگر ممکن نشد.',
    'player.legacyBusy': 'پیش از بررسی جای قدیمی، انتخاب فعلی ذخیره یا بازیابی را تمام کنید.',
    'player.legacyWait': 'پیش از بررسی جای قدیمی، صبر کنید تا ضبط بارگذاری شود.',
    'player.legacyBeyond': 'جای قدیمی فراتر از پایان این ضبط است. شاید مربوط به ضبط دیگری باشد.',
    'player.legacySeekFailed': 'رفتن به جای قدیمی ممکن نشد. وقتی ضبط آماده شد دوباره تلاش کنید.',
    'player.earlierRemoveFailed': 'حذف جای قبلی روی دستگاه ممکن نشد.',
    'player.earlierBusy':
      'پیش از بررسی یک جای قبلی روی دستگاه، انتخاب فعلی ذخیره یا بازیابی را تمام کنید.',
    'player.earlierWait': 'پیش از بررسی جای قبلی روی دستگاه، صبر کنید تا ضبط بارگذاری شود.',
    'player.earlierChanged': 'جای قبلی روی دستگاه تغییر کرد. فهرست به‌روزشده را بررسی کنید.',
    'player.earlierBeyond':
      'جای قبلی روی دستگاه فراتر از پایان این ضبط است. شاید مربوط به ضبط دیگری باشد.',
    'player.earlierSeekFailed': 'رفتن به جای قبلی روی دستگاه ممکن نشد.',
    'player.earlierReadFailed': 'خواندن جای قبلی روی دستگاه ممکن نشد.',
    'player.needConfirmed':
      'تا حساب شما تأیید نشود، بازیابی نمی‌تواند جایی را ثبت کند. هنگام اتصال دوباره بارگذاری کنید.',
    'player.storeChangeFailed':
      'تغییر یا پاک کردن کامل فضای ذخیره‌سازی دستگاه ممکن نشد. تنظیمات ذخیره‌سازی مرورگرتان را بررسی کنید.',
    'player.deviceRemoveFailed': 'حذف این جای بازیابی از دستگاه ممکن نشد.',
    'player.deviceChanged': 'جای دستگاه تغییر کرد. فهرست به‌روزشده را بررسی کنید.',
    'player.othersRemain':
      'دیگر جاهای بازیابی روی دستگاه، اگر باشند، با باز کردن دوبارهٔ این درس در دسترس می‌مانند.',
    'player.deviceUseFailed':
      'استفاده از این جای دستگاه ممکن نشد. پس از بارگذاری رسانه دوباره تلاش کنید.',
    'player.quality': 'کیفیت',
    'player.qualityStandard': '480p — معمولی',
    'player.qualitySmall': '360p — کوچک',
    'player.qualityAudio': 'فقط صدا',
    'player.saving': 'در حال ذخیره…',
    'player.saveDevice': 'ذخیره در این دستگاه',
    'player.onDevice': 'در این دستگاه',
    'player.seePlus': 'ببینید Plus شامل چه چیزهایی است',
    'player.plusNote': 'ذخیرهٔ درس روی دستگاه بخشی از طرح Plus است.',
    'player.tryAgain': 'دوباره تلاش کنید',
    'player.preparing': 'در حال آماده‌سازی پخش‌کننده…',
    'player.linksNote': 'پیوندهای پخش کوتاه‌مدت‌اند و به دسترسی شما به این درس وابسته‌اند.',
    'player.savedNote':
      'درس ذخیره‌شده درون برنامه می‌ماند، اما فعلاً هر بار که بازش می‌کنید برای بررسی دسترسی به اتصال نیاز دارد.',
    'player.playFailed': 'پخش این درس ممکن نشد.',
    'player.saveRefused': 'این درس را در این طرح نمی‌توان ذخیره کرد.',
    'player.fetchFailed': 'دریافت این درس برای ذخیره ممکن نشد.',
    'player.saveFailed': 'ذخیرهٔ این درس ممکن نشد.',
    'player.noCopy': 'این ضبط هنوز نسخه‌ای ندارد که بتوان پخشش کرد.',
  },
  'fa-af': {
    'player.videoUnsupported': 'مرورگر شما نمی‌تواند این ویدیو را پخش کند.',
    'player.audioUnsupported': 'مرورگر شما نمی‌تواند این فایل صوتی را پخش کند.',
    'player.openVideo': 'ویدیو را مستقیم باز کنید',
    'player.openAudio': 'فایل صوتی را مستقیم باز کنید',
    'player.speed': 'سرعت',
    'player.slower': 'آهسته‌تر',
    'player.faster': 'تندتر',
    'player.loopFrom': 'تکرار از اینجا',
    'player.loopTo': 'تا اینجا',
    'player.loopStop': 'توقف تکرار',
    'player.loopOpenEnd': 'تکرار از {from} — مشخص کنید کجا تمام شود.',
    'player.loopOpenStart': 'تکرار تا {to} — مشخص کنید از کجا شروع شود.',
    'player.loopBackwards': 'این بخش پیش از شروعش تمام می‌شود. دوباره مشخصش کنید.',
    'player.loopBoth': 'تکرار {from} – {to}.',
    'player.resuming': 'ادامه از {at}.',
    'player.checking': 'در حال بررسی جای ذخیره‌شدهٔ شما…',
    'player.legacyGroup': 'جای قبلی ذخیره‌شده برای کل درس',
    'player.legacyPlace':
      'یک جای قبلی که برای کل درس ذخیره شده {at} است. شاید مربوط به ثبت دیگری باشد. می‌توانید آن را اینجا بررسی کنید؛ بدون انتخاب شما جایگزین جای ذخیره‌شدهٔ این ثبت نمی‌شود.',
    'player.limit': 'پخش‌کننده از ۲۴ ساعت فراتر نمی‌رود.',
    'player.legacyReview': 'بررسی جای قبلی',
    'player.notNow': 'فعلاً نه',
    'player.recoveryToggle': 'یک جای بازیابی موقت در این مرورگر نگه دار',
    'player.recoveryNotice':
      'اختیاری. هر کسی که به نمایهٔ این مرورگر دسترسی دارد ممکن است شناسه‌های حساب، ثبت‌نام، درس و ثبت، شناسه‌های نشست، جاها و زمان‌ها را ببیند، از جمله برای حساب‌های دیگری که از آن استفاده می‌کنند. خاموش کردن این گزینه جاهای بازیابی همهٔ حساب‌ها را در این مرورگر حذف می‌کند. پیش از ذخیرهٔ هر جا، حساب شما باید به‌صورت آنلاین تصدیق شود. سوابق پس از هفت روز منقضی می‌شوند و در بازدیدی بعدی پاک می‌شوند؛ ممکن است فضای ذخیره‌سازی در دسترس نباشد یا زودتر پاک شود.',
    'player.earlierGroup': 'جاهای قبلی روی وسیله برای کل درس',
    'player.earlierIntro':
      'این جاهای قدیمی‌تر روی وسیله برای کل درس ذخیره شده‌اند، نه برای یک ثبت مشخص. شاید مربوط به ثبت دیگری باشند. یکی را اینجا بررسی کنید یا کنار بگذارید؛ بررسی کردن، بدون انتخابی دیگر، جای حساب را عوض نمی‌کند.',
    'player.earlierReview': 'بررسی جای قبلی روی وسیله',
    'player.earlierReviewLabel': 'بررسی جای قبلی روی وسیله {at} مربوط به {when}',
    'player.earlierDiscard': 'کنار گذاشتن جای قبلی',
    'player.earlierDiscardLabel': 'کنار گذاشتن جای قبلی روی وسیله {at} مربوط به {when}',
    'player.deviceGroup': 'جاهای بازیابی روی وسیله',
    'player.deviceIntro':
      'ممکن است جایی از این مرورگر به حساب شما نرسیده باشد. پیش از ادامهٔ ذخیرهٔ خودکار، هر جا را بررسی کنید یا کنار بگذارید. با انتخاب یکی، بقیه برای بازدیدی بعدی می‌مانند.',
    'player.deviceReview': 'بررسی این جا',
    'player.deviceReviewLabel': 'بررسی جای وسیله {at} مربوط به {when}',
    'player.deviceDiscard': 'کنار گذاشتن',
    'player.deviceDiscardLabel': 'کنار گذاشتن جای وسیله {at} مربوط به {when}',
    'player.conflictGroup': 'جای ذخیره‌شدهٔ خود را انتخاب کنید',
    'player.conflictIntro': 'ممکن است جای ذخیره‌شدهٔ حساب با این پخش‌کننده فرق داشته باشد.',
    'player.conflictNone': 'جای ذخیره‌شده‌ای نیست.',
    'player.conflictSaved': 'جای ذخیره‌شده: {at}.',
    'player.conflictLocal': 'این پخش‌کننده: {at}. کدام نگه داشته شود؟',
    'player.useSaved': 'استفاده از جای ذخیره‌شده',
    'player.keepLocal': 'جای این پخش‌کننده را نگه دار',
    'player.storeClearFailed':
      'فضای ذخیره‌سازی وسیله پاک نشد. تنظیمات ذخیره‌سازی مرورگرتان را بررسی کنید.',
    'player.storeSaveFailed': 'ذخیرهٔ جای بازیابی در این وسیله ممکن نشد.',
    'player.storeUnavailable': 'ذخیره‌سازی بازیابی در این مرورگر در دسترس نیست.',
    'player.storeReadFailed':
      'خواندن جاهای قبلی روی وسیله ممکن نشد. تنظیمات ذخیره‌سازی مرورگرتان را بررسی کنید.',
    'player.earlierClearFailed':
      'پاک کردن جای قبلی روی وسیله ممکن نشد. تنظیمات ذخیره‌سازی مرورگرتان را بررسی کنید.',
    'player.unconfirmed':
      'تصدیق جای ذخیره‌شدهٔ شما ممکن نشد. پیش از ادامهٔ ذخیره، درس را دوباره بارگذاری کنید تا بررسی شود.',
    'player.loadFailed':
      'بارگذاری جای ذخیره‌شدهٔ شما ممکن نشد. می‌توانید این درس را پخش کنید، اما تا بارگذاری دوباره، ذخیره در دسترس نیست.',
    'player.turnedOff': 'بازیابی از جای دیگری در این مرورگر خاموش یا پاک شد.',
    'player.storeCheckFailed': 'بررسی ذخیره‌سازی بازیابی در این مرورگر ممکن نشد.',
    'player.legacyBusy': 'پیش از بررسی جای قدیمی، انتخاب فعلی ذخیره یا بازیابی را تمام کنید.',
    'player.legacyWait': 'پیش از بررسی جای قدیمی، صبر کنید تا ثبت بارگذاری شود.',
    'player.legacyBeyond': 'جای قدیمی فراتر از پایان این ثبت است. شاید مربوط به ثبت دیگری باشد.',
    'player.legacySeekFailed': 'رفتن به جای قدیمی ممکن نشد. وقتی ثبت آماده شد دوباره کوشش کنید.',
    'player.earlierRemoveFailed': 'حذف جای قبلی روی وسیله ممکن نشد.',
    'player.earlierBusy':
      'پیش از بررسی یک جای قبلی روی وسیله، انتخاب فعلی ذخیره یا بازیابی را تمام کنید.',
    'player.earlierWait': 'پیش از بررسی جای قبلی روی وسیله، صبر کنید تا ثبت بارگذاری شود.',
    'player.earlierChanged': 'جای قبلی روی وسیله تغییر کرد. فهرست به‌روزشده را بررسی کنید.',
    'player.earlierBeyond':
      'جای قبلی روی وسیله فراتر از پایان این ثبت است. شاید مربوط به ثبت دیگری باشد.',
    'player.earlierSeekFailed': 'رفتن به جای قبلی روی وسیله ممکن نشد.',
    'player.earlierReadFailed': 'خواندن جای قبلی روی وسیله ممکن نشد.',
    'player.needConfirmed':
      'تا حساب شما تصدیق نشود، بازیابی نمی‌تواند جایی را ثبت کند. هنگام اتصال دوباره بارگذاری کنید.',
    'player.storeChangeFailed':
      'تغییر یا پاک کردن کامل فضای ذخیره‌سازی وسیله ممکن نشد. تنظیمات ذخیره‌سازی مرورگرتان را بررسی کنید.',
    'player.deviceRemoveFailed': 'حذف این جای بازیابی از وسیله ممکن نشد.',
    'player.deviceChanged': 'جای وسیله تغییر کرد. فهرست به‌روزشده را بررسی کنید.',
    'player.othersRemain':
      'دیگر جاهای بازیابی روی وسیله، اگر باشند، با باز کردن دوبارهٔ این درس در دسترس می‌مانند.',
    'player.deviceUseFailed':
      'استفاده از این جای وسیله ممکن نشد. پس از بارگذاری رسانه دوباره کوشش کنید.',
    'player.quality': 'کیفیت',
    'player.qualityStandard': '480p — معمولی',
    'player.qualitySmall': '360p — کوچک',
    'player.qualityAudio': 'فقط صدا',
    'player.saving': 'در حال ذخیره…',
    'player.saveDevice': 'ذخیره در این وسیله',
    'player.onDevice': 'در این وسیله',
    'player.seePlus': 'ببینید Plus شامل چه چیزهایی است',
    'player.plusNote': 'ذخیرهٔ درس روی وسیله بخشی از طرح Plus است.',
    'player.tryAgain': 'دوباره کوشش کنید',
    'player.preparing': 'در حال آماده‌سازی پخش‌کننده…',
    'player.linksNote': 'لینک‌های پخش کوتاه‌مدت‌اند و به دسترسی شما به این درس وابسته‌اند.',
    'player.savedNote':
      'درس ذخیره‌شده درون برنامه می‌ماند، اما فعلاً هر بار که بازش می‌کنید برای بررسی دسترسی به اتصال نیاز دارد.',
    'player.playFailed': 'پخش این درس ممکن نشد.',
    'player.saveRefused': 'این درس را در این طرح نمی‌توان ذخیره کرد.',
    'player.fetchFailed': 'دریافت این درس برای ذخیره ممکن نشد.',
    'player.saveFailed': 'ذخیرهٔ این درس ممکن نشد.',
    'player.noCopy': 'این ثبت هنوز نسخه‌ای ندارد که بتوان پخشش کرد.',
  },
  tr: {
    'player.videoUnsupported': 'Tarayıcınız bu videoyu oynatamıyor.',
    'player.audioUnsupported': 'Tarayıcınız bu ses kaydını oynatamıyor.',
    'player.openVideo': 'Videoyu doğrudan aç',
    'player.openAudio': 'Ses kaydını doğrudan aç',
    'player.speed': 'Hız',
    'player.slower': 'Daha yavaş',
    'player.faster': 'Daha hızlı',
    'player.loopFrom': 'Buradan tekrarla',
    'player.loopTo': 'Buraya kadar',
    'player.loopStop': 'Tekrarı durdur',
    'player.loopOpenEnd': '{from} noktasından tekrarlanıyor — nerede biteceğini işaretleyin.',
    'player.loopOpenStart':
      '{to} noktasına kadar tekrarlanıyor — nerede başlayacağını işaretleyin.',
    'player.loopBackwards': 'Bu bölüm başlamadan bitiyor. Yeniden işaretleyin.',
    'player.loopBoth': '{from} – {to} tekrarlanıyor.',
    'player.resuming': '{at} noktasından devam ediliyor.',
    'player.checking': 'Kayıtlı yeriniz kontrol ediliyor…',
    'player.legacyGroup': 'Dersin tamamı için kaydedilmiş önceki yer',
    'player.legacyPlace':
      'Dersin tamamı için kaydedilmiş önceki bir yer var: {at}. Başka bir kayda ait olabilir. Onu burada inceleyebilirsiniz; siz seçmeden bu kaydın kayıtlı yerinin yerini almaz.',
    'player.limit': 'Oynatıcı 24 saatin ötesine geçemez.',
    'player.legacyReview': 'Önceki yeri incele',
    'player.notNow': 'Şimdi değil',
    'player.recoveryToggle': 'Bu tarayıcıda geçici bir kurtarma yeri tut',
    'player.recoveryNotice':
      'İsteğe bağlı. Bu tarayıcı profiline erişebilen herkes hesap, kurs kaydı, ders ve ses ya da video kaydı tanımlayıcılarını, oturum tanımlayıcılarını, konumları ve zaman damgalarını görebilir; bu tarayıcıyı kullanan başka hesaplarınkiler de buna dahildir. Bunu kapatmak, bu tarayıcıdaki tüm hesapların kurtarma yerlerini kaldırır. Bir yer saklanmadan önce hesabınızın çevrimiçi olarak doğrulanması gerekir. Kayıtların süresi yedi gün sonra dolar ve sonraki bir ziyarette silinir; depolama kullanılamayabilir veya daha erken silinebilir.',
    'player.earlierGroup': 'Cihazda dersin tamamı için kaydedilmiş önceki yerler',
    'player.earlierIntro':
      'Cihazdaki bu eski yerler belirli bir kayıt için değil, dersin tamamı için kaydedilmişti. Başka bir kayda ait olabilirler. Birini burada inceleyin veya atın; incelemek, siz bir seçim daha yapmadan hesaptaki yeri değiştirmez.',
    'player.earlierReview': 'Cihazdaki önceki yeri incele',
    'player.earlierReviewLabel': 'Cihazdaki önceki yeri incele: {at}, {when}',
    'player.earlierDiscard': 'Önceki yeri at',
    'player.earlierDiscardLabel': 'Cihazdaki önceki yeri at: {at}, {when}',
    'player.deviceGroup': 'Cihazdaki kurtarma yerleri',
    'player.deviceIntro':
      'Bu tarayıcıdaki bir yer hesabınıza ulaşmamış olabilir. Otomatik kaydetme sürmeden önce her yeri inceleyin veya atın. Birini seçtiğinizde diğerleri sonraki bir ziyarete kalır.',
    'player.deviceReview': 'Bu yeri incele',
    'player.deviceReviewLabel': 'Cihazdaki yeri incele: {at}, {when}',
    'player.deviceDiscard': 'At',
    'player.deviceDiscardLabel': 'Cihazdaki yeri at: {at}, {when}',
    'player.conflictGroup': 'Kayıtlı yerinizi seçin',
    'player.conflictIntro': 'Hesaptaki kayıtlı yer bu oynatıcıdakinden farklı olabilir.',
    'player.conflictNone': 'Kayıtlı yer yok.',
    'player.conflictSaved': 'Kayıtlı yer: {at}.',
    'player.conflictLocal': 'Bu oynatıcı: {at}. Hangisi tutulsun?',
    'player.useSaved': 'Kayıtlı yeri kullan',
    'player.keepLocal': 'Bu oynatıcının yerini tut',
    'player.storeClearFailed':
      'Cihaz depolaması temizlenemedi. Tarayıcınızın depolama ayarlarını kontrol edin.',
    'player.storeSaveFailed': 'Bu cihaza kurtarma yeri kaydedilemedi.',
    'player.storeUnavailable': 'Bu tarayıcıda kurtarma depolaması kullanılamıyor.',
    'player.storeReadFailed':
      'Cihazdaki önceki yerler okunamadı. Tarayıcınızın depolama ayarlarını kontrol edin.',
    'player.earlierClearFailed':
      'Cihazdaki önceki yer temizlenemedi. Tarayıcınızın depolama ayarlarını kontrol edin.',
    'player.unconfirmed':
      'Kayıtlı yeriniz doğrulanamadı. Kaydetmeyi sürdürmeden önce kontrol etmek için dersi yeniden yükleyin.',
    'player.loadFailed':
      'Kayıtlı yeriniz yüklenemedi. Bu dersi oynatabilirsiniz, ancak yeniden yükleyene kadar kaydetme kullanılamaz.',
    'player.turnedOff': 'Kurtarma, bu tarayıcıda başka bir yerden kapatıldı veya temizlendi.',
    'player.storeCheckFailed': 'Bu tarayıcıda kurtarma depolaması kontrol edilemedi.',
    'player.legacyBusy':
      'Eski yeri incelemeden önce şu anki kaydetme veya kurtarma seçimini tamamlayın.',
    'player.legacyWait': 'Eski yeri incelemeden önce kaydın yüklenmesini bekleyin.',
    'player.legacyBeyond': 'Eski yer bu kaydın sonunu aşıyor. Başka bir kayda ait olabilir.',
    'player.legacySeekFailed': 'Eski yere gidilemedi. Kayıt hazır olduğunda yeniden deneyin.',
    'player.earlierRemoveFailed': 'Cihazdaki önceki yer kaldırılamadı.',
    'player.earlierBusy':
      'Cihazdaki önceki bir yeri incelemeden önce şu anki kaydetme veya kurtarma seçimini tamamlayın.',
    'player.earlierWait': 'Cihazdaki önceki yeri incelemeden önce kaydın yüklenmesini bekleyin.',
    'player.earlierChanged': 'Cihazdaki önceki yer değişti. Güncellenen listeyi inceleyin.',
    'player.earlierBeyond':
      'Cihazdaki önceki yer bu kaydın sonunu aşıyor. Başka bir kayda ait olabilir.',
    'player.earlierSeekFailed': 'Cihazdaki önceki yere gidilemedi.',
    'player.earlierReadFailed': 'Cihazdaki önceki yer okunamadı.',
    'player.needConfirmed':
      'Hesabınız doğrulanana kadar kurtarma bir yer kaydedemez. Bağlandığınızda yeniden yükleyin.',
    'player.storeChangeFailed':
      'Cihaz depolaması değiştirilemedi veya tamamen temizlenemedi. Tarayıcınızın depolama ayarlarını kontrol edin.',
    'player.deviceRemoveFailed': 'Bu kurtarma yeri cihazdan kaldırılamadı.',
    'player.deviceChanged': 'Cihazdaki yer değişti. Güncellenen listeyi inceleyin.',
    'player.othersRemain':
      'Cihazdaki diğer kurtarma yerleri, varsa, bu dersi yeniden açtığınızda kullanılabilir kalır.',
    'player.deviceUseFailed':
      'Cihazdaki bu yer kullanılamadı. Medya yüklendikten sonra yeniden deneyin.',
    'player.quality': 'Kalite',
    'player.qualityStandard': '480p — standart',
    'player.qualitySmall': '360p — küçük',
    'player.qualityAudio': 'Yalnızca ses',
    'player.saving': 'Kaydediliyor…',
    'player.saveDevice': 'Bu cihaza kaydet',
    'player.onDevice': 'Bu cihazda',
    'player.seePlus': 'Plus’ın neler içerdiğine bakın',
    'player.plusNote': 'Bir dersi cihaza kaydetmek Plus planının parçasıdır.',
    'player.tryAgain': 'Yeniden dene',
    'player.preparing': 'Oynatıcı hazırlanıyor…',
    'player.linksNote': 'Oynatma bağlantıları kısa ömürlüdür ve bu derse erişiminize bağlıdır.',
    'player.savedNote':
      'Kaydedilen ders uygulamanın içinde kalır, ancak şimdilik her açışınızda erişimi kontrol etmek için bağlantı gerekir.',
    'player.playFailed': 'Bu ders oynatılamadı.',
    'player.saveRefused': 'Bu ders bu planda kaydedilemez.',
    'player.fetchFailed': 'Bu ders kaydetmek için alınamadı.',
    'player.saveFailed': 'Bu ders kaydedilemedi.',
    'player.noCopy': 'Bu kaydın henüz oynatılabilecek bir kopyası yok.',
  },
  id: {
    'player.videoUnsupported': 'Peramban Anda tidak dapat memutar video ini.',
    'player.audioUnsupported': 'Peramban Anda tidak dapat memutar audio ini.',
    'player.openVideo': 'Buka video secara langsung',
    'player.openAudio': 'Buka audio secara langsung',
    'player.speed': 'Kecepatan',
    'player.slower': 'Lebih lambat',
    'player.faster': 'Lebih cepat',
    'player.loopFrom': 'Ulangi dari sini',
    'player.loopTo': 'Sampai sini',
    'player.loopStop': 'Berhenti mengulang',
    'player.loopOpenEnd': 'Mengulang dari {from} — tandai di mana berakhirnya.',
    'player.loopOpenStart': 'Mengulang sampai {to} — tandai di mana mulainya.',
    'player.loopBackwards': 'Bagian itu berakhir sebelum dimulai. Tandai lagi.',
    'player.loopBoth': 'Mengulang {from} – {to}.',
    'player.resuming': 'Melanjutkan dari {at}.',
    'player.checking': 'Memeriksa posisi tersimpan Anda…',
    'player.legacyGroup': 'Posisi lama untuk seluruh pelajaran',
    'player.legacyPlace':
      'Ada posisi lama yang disimpan untuk seluruh pelajaran, yaitu {at}. Mungkin posisi itu milik rekaman lain. Anda dapat meninjaunya di sini; posisi itu tidak akan menggantikan posisi tersimpan rekaman ini tanpa pilihan Anda.',
    'player.limit': 'Pemutar tidak dapat melewati 24 jam.',
    'player.legacyReview': 'Tinjau posisi lama',
    'player.notNow': 'Nanti saja',
    'player.recoveryToggle': 'Simpan posisi pemulihan sementara di peramban ini',
    'player.recoveryNotice':
      'Opsional. Siapa pun yang dapat mengakses profil peramban ini mungkin dapat melihat pengenal akun, pendaftaran, pelajaran, dan rekaman, pengenal sesi, posisi, dan cap waktu, termasuk milik akun lain yang memakainya. Mematikan pilihan ini menghapus posisi pemulihan semua akun di peramban ini. Akun Anda harus dikonfirmasi secara daring sebelum posisi dapat disimpan. Catatan kedaluwarsa setelah tujuh hari dan dihapus pada kunjungan berikutnya; penyimpanan mungkin tidak tersedia atau dihapus lebih cepat.',
    'player.earlierGroup': 'Posisi lama di perangkat untuk seluruh pelajaran',
    'player.earlierIntro':
      'Posisi lama di perangkat ini disimpan untuk seluruh pelajaran, bukan untuk rekaman tertentu. Mungkin posisi itu milik rekaman lain. Tinjau salah satunya di sini atau buang; meninjau tidak menggantikan posisi di akun tanpa pilihan lain dari Anda.',
    'player.earlierReview': 'Tinjau posisi lama di perangkat',
    'player.earlierReviewLabel': 'Tinjau posisi lama di perangkat {at} dari {when}',
    'player.earlierDiscard': 'Buang posisi lama',
    'player.earlierDiscardLabel': 'Buang posisi lama di perangkat {at} dari {when}',
    'player.deviceGroup': 'Posisi pemulihan di perangkat',
    'player.deviceIntro':
      'Sebuah posisi dari peramban ini mungkin belum sampai ke akun Anda. Tinjau atau buang setiap posisi sebelum penyimpanan otomatis berlanjut. Memilih satu posisi membiarkan yang lain untuk kunjungan berikutnya.',
    'player.deviceReview': 'Tinjau posisi ini',
    'player.deviceReviewLabel': 'Tinjau posisi perangkat {at} dari {when}',
    'player.deviceDiscard': 'Buang',
    'player.deviceDiscardLabel': 'Buang posisi perangkat {at} dari {when}',
    'player.conflictGroup': 'Pilih posisi tersimpan Anda',
    'player.conflictIntro': 'Posisi tersimpan di akun mungkin berbeda dari pemutar ini.',
    'player.conflictNone': 'Tidak ada posisi tersimpan.',
    'player.conflictSaved': 'Posisi tersimpan: {at}.',
    'player.conflictLocal': 'Pemutar ini: {at}. Mana yang dipertahankan?',
    'player.useSaved': 'Pakai posisi tersimpan',
    'player.keepLocal': 'Pertahankan posisi pemutar ini',
    'player.storeClearFailed':
      'Penyimpanan perangkat tidak dapat dihapus. Periksa pengaturan penyimpanan peramban Anda.',
    'player.storeSaveFailed': 'Tidak dapat menyimpan posisi pemulihan di perangkat ini.',
    'player.storeUnavailable': 'Penyimpanan pemulihan tidak tersedia di peramban ini.',
    'player.storeReadFailed':
      'Tidak dapat membaca posisi lama di perangkat. Periksa pengaturan penyimpanan peramban Anda.',
    'player.earlierClearFailed':
      'Tidak dapat menghapus posisi lama di perangkat. Periksa pengaturan penyimpanan peramban Anda.',
    'player.unconfirmed':
      'Tidak dapat memastikan posisi tersimpan Anda. Muat ulang pelajaran untuk memeriksanya sebelum lanjut menyimpan.',
    'player.loadFailed':
      'Tidak dapat memuat posisi tersimpan Anda. Anda dapat memutar pelajaran ini, tetapi penyimpanan tidak tersedia sampai Anda memuat ulang.',
    'player.turnedOff': 'Pemulihan dimatikan atau dihapus dari tempat lain di peramban ini.',
    'player.storeCheckFailed': 'Tidak dapat memeriksa penyimpanan pemulihan di peramban ini.',
    'player.legacyBusy':
      'Selesaikan pilihan penyimpanan atau pemulihan yang sedang berjalan sebelum meninjau posisi lama.',
    'player.legacyWait': 'Tunggu rekaman dimuat sebelum meninjau posisi lama.',
    'player.legacyBeyond':
      'Posisi lama melampaui akhir rekaman ini. Mungkin posisi itu milik rekaman lain.',
    'player.legacySeekFailed':
      'Tidak dapat berpindah ke posisi lama. Coba lagi setelah rekaman siap.',
    'player.earlierRemoveFailed': 'Tidak dapat membuang posisi lama di perangkat.',
    'player.earlierBusy':
      'Selesaikan pilihan penyimpanan atau pemulihan yang sedang berjalan sebelum meninjau posisi lama di perangkat.',
    'player.earlierWait': 'Tunggu rekaman dimuat sebelum meninjau posisi lama di perangkat.',
    'player.earlierChanged': 'Posisi lama di perangkat berubah. Tinjau daftar yang diperbarui.',
    'player.earlierBeyond':
      'Posisi lama di perangkat melampaui akhir rekaman ini. Mungkin posisi itu milik rekaman lain.',
    'player.earlierSeekFailed': 'Tidak dapat berpindah ke posisi lama di perangkat.',
    'player.earlierReadFailed': 'Tidak dapat membaca posisi lama di perangkat.',
    'player.needConfirmed':
      'Pemulihan tidak dapat mencatat posisi sampai akun Anda dikonfirmasi. Muat ulang saat terhubung.',
    'player.storeChangeFailed':
      'Penyimpanan perangkat tidak dapat diubah atau dihapus seluruhnya. Periksa pengaturan penyimpanan peramban Anda.',
    'player.deviceRemoveFailed': 'Tidak dapat membuang posisi pemulihan ini dari perangkat.',
    'player.deviceChanged': 'Posisi perangkat berubah. Tinjau daftar yang diperbarui.',
    'player.othersRemain':
      'Posisi pemulihan lain di perangkat, jika ada, tetap tersedia saat Anda membuka kembali pelajaran ini.',
    'player.deviceUseFailed':
      'Tidak dapat memakai posisi perangkat ini. Coba lagi setelah media dimuat.',
    'player.quality': 'Kualitas',
    'player.qualityStandard': '480p — standar',
    'player.qualitySmall': '360p — kecil',
    'player.qualityAudio': 'Audio saja',
    'player.saving': 'Menyimpan…',
    'player.saveDevice': 'Simpan di perangkat ini',
    'player.onDevice': 'Di perangkat ini',
    'player.seePlus': 'Lihat apa saja isi Plus',
    'player.plusNote': 'Menyimpan pelajaran di perangkat adalah bagian dari paket Plus.',
    'player.tryAgain': 'Coba lagi',
    'player.preparing': 'Menyiapkan pemutar…',
    'player.linksNote':
      'Tautan pemutaran berumur pendek dan terikat pada akses Anda ke pelajaran ini.',
    'player.savedNote':
      'Pelajaran yang disimpan tetap berada di dalam aplikasi, tetapi saat ini memerlukan koneksi untuk memeriksa akses setiap kali Anda membukanya.',
    'player.playFailed': 'Pelajaran itu tidak dapat diputar.',
    'player.saveRefused': 'Pelajaran ini tidak dapat disimpan dengan paket ini.',
    'player.fetchFailed': 'Pelajaran itu tidak dapat diambil untuk disimpan.',
    'player.saveFailed': 'Pelajaran itu tidak dapat disimpan.',
    'player.noCopy': 'Rekaman ini belum memiliki salinan yang dapat diputar.',
  },
  ms: {
    'player.videoUnsupported': 'Pelayar anda tidak dapat memainkan video ini.',
    'player.audioUnsupported': 'Pelayar anda tidak dapat memainkan audio ini.',
    'player.openVideo': 'Buka video secara terus',
    'player.openAudio': 'Buka audio secara terus',
    'player.speed': 'Kelajuan',
    'player.slower': 'Lebih perlahan',
    'player.faster': 'Lebih laju',
    'player.loopFrom': 'Ulang dari sini',
    'player.loopTo': 'Hingga sini',
    'player.loopStop': 'Berhenti mengulang',
    'player.loopOpenEnd': 'Mengulang dari {from} — tandakan tempat ia berakhir.',
    'player.loopOpenStart': 'Mengulang hingga {to} — tandakan tempat ia bermula.',
    'player.loopBackwards': 'Petikan itu berakhir sebelum ia bermula. Tandakan semula.',
    'player.loopBoth': 'Mengulang {from} – {to}.',
    'player.resuming': 'Menyambung dari {at}.',
    'player.checking': 'Menyemak kedudukan tersimpan anda…',
    'player.legacyGroup': 'Kedudukan lama bagi seluruh pelajaran',
    'player.legacyPlace':
      'Terdapat kedudukan lama yang disimpan bagi seluruh pelajaran, iaitu {at}. Ia mungkin milik rakaman lain. Anda boleh menyemaknya di sini; ia tidak akan menggantikan kedudukan tersimpan rakaman ini tanpa pilihan anda.',
    'player.limit': 'Pemain tidak boleh melepasi 24 jam.',
    'player.legacyReview': 'Semak kedudukan lama',
    'player.notNow': 'Bukan sekarang',
    'player.recoveryToggle': 'Simpan kedudukan pemulihan sementara pada pelayar ini',
    'player.recoveryNotice':
      'Pilihan. Sesiapa yang mempunyai akses kepada profil pelayar ini mungkin dapat melihat pengecam akaun, pendaftaran, pelajaran dan rakaman, pengecam sesi, kedudukan dan cap masa, termasuk bagi akaun lain yang menggunakannya. Mematikan pilihan ini membuang kedudukan pemulihan semua akaun pada pelayar ini. Akaun anda mesti disahkan dalam talian sebelum sesuatu kedudukan boleh disimpan. Rekod luput selepas tujuh hari dan dipadamkan pada lawatan kemudian; storan mungkin tidak tersedia atau dipadamkan lebih awal.',
    'player.earlierGroup': 'Kedudukan lama pada peranti bagi seluruh pelajaran',
    'player.earlierIntro':
      'Kedudukan lama pada peranti ini disimpan bagi seluruh pelajaran, bukan bagi rakaman tertentu. Ia mungkin milik rakaman lain. Semak salah satu di sini atau buang; menyemak tidak menggantikan kedudukan akaun tanpa pilihan lain daripada anda.',
    'player.earlierReview': 'Semak kedudukan lama pada peranti',
    'player.earlierReviewLabel': 'Semak kedudukan lama pada peranti {at} dari {when}',
    'player.earlierDiscard': 'Buang kedudukan lama',
    'player.earlierDiscardLabel': 'Buang kedudukan lama pada peranti {at} dari {when}',
    'player.deviceGroup': 'Kedudukan pemulihan pada peranti',
    'player.deviceIntro':
      'Satu kedudukan daripada pelayar ini mungkin belum sampai ke akaun anda. Semak atau buang setiap kedudukan sebelum penyimpanan automatik diteruskan. Memilih satu membiarkan yang lain untuk lawatan kemudian.',
    'player.deviceReview': 'Semak kedudukan ini',
    'player.deviceReviewLabel': 'Semak kedudukan peranti {at} dari {when}',
    'player.deviceDiscard': 'Buang',
    'player.deviceDiscardLabel': 'Buang kedudukan peranti {at} dari {when}',
    'player.conflictGroup': 'Pilih kedudukan tersimpan anda',
    'player.conflictIntro': 'Kedudukan tersimpan akaun mungkin berbeza daripada pemain ini.',
    'player.conflictNone': 'Tiada kedudukan tersimpan.',
    'player.conflictSaved': 'Kedudukan tersimpan: {at}.',
    'player.conflictLocal': 'Pemain ini: {at}. Yang mana patut dikekalkan?',
    'player.useSaved': 'Guna kedudukan tersimpan',
    'player.keepLocal': 'Kekalkan kedudukan pemain ini',
    'player.storeClearFailed':
      'Storan peranti tidak dapat dikosongkan. Semak tetapan storan pelayar anda.',
    'player.storeSaveFailed': 'Tidak dapat menyimpan kedudukan pemulihan pada peranti ini.',
    'player.storeUnavailable': 'Storan pemulihan tidak tersedia dalam pelayar ini.',
    'player.storeReadFailed':
      'Tidak dapat membaca kedudukan lama pada peranti. Semak tetapan storan pelayar anda.',
    'player.earlierClearFailed':
      'Tidak dapat mengosongkan kedudukan lama pada peranti. Semak tetapan storan pelayar anda.',
    'player.unconfirmed':
      'Tidak dapat mengesahkan kedudukan tersimpan anda. Muat semula pelajaran untuk menyemaknya sebelum terus menyimpan.',
    'player.loadFailed':
      'Tidak dapat memuatkan kedudukan tersimpan anda. Anda boleh memainkan pelajaran ini, tetapi penyimpanan tidak tersedia sehingga anda memuat semula.',
    'player.turnedOff':
      'Pemulihan telah dimatikan atau dikosongkan dari tempat lain dalam pelayar ini.',
    'player.storeCheckFailed': 'Tidak dapat menyemak storan pemulihan dalam pelayar ini.',
    'player.legacyBusy':
      'Selesaikan pilihan penyimpanan atau pemulihan semasa sebelum menyemak kedudukan lama.',
    'player.legacyWait': 'Tunggu rakaman dimuatkan sebelum menyemak kedudukan lama.',
    'player.legacyBeyond':
      'Kedudukan lama melepasi penghujung rakaman ini. Ia mungkin milik rakaman lain.',
    'player.legacySeekFailed':
      'Tidak dapat beralih ke kedudukan lama. Cuba lagi apabila rakaman sudah sedia.',
    'player.earlierRemoveFailed': 'Tidak dapat membuang kedudukan lama pada peranti.',
    'player.earlierBusy':
      'Selesaikan pilihan penyimpanan atau pemulihan semasa sebelum menyemak kedudukan lama pada peranti.',
    'player.earlierWait': 'Tunggu rakaman dimuatkan sebelum menyemak kedudukan lama pada peranti.',
    'player.earlierChanged':
      'Kedudukan lama pada peranti telah berubah. Semak senarai yang dikemas kini.',
    'player.earlierBeyond':
      'Kedudukan lama pada peranti melepasi penghujung rakaman ini. Ia mungkin milik rakaman lain.',
    'player.earlierSeekFailed': 'Tidak dapat beralih ke kedudukan lama pada peranti.',
    'player.earlierReadFailed': 'Tidak dapat membaca kedudukan lama pada peranti.',
    'player.needConfirmed':
      'Pemulihan tidak dapat merekodkan kedudukan sehingga akaun anda disahkan. Muat semula apabila bersambung.',
    'player.storeChangeFailed':
      'Storan peranti tidak dapat diubah atau dikosongkan sepenuhnya. Semak tetapan storan pelayar anda.',
    'player.deviceRemoveFailed': 'Tidak dapat membuang kedudukan pemulihan ini daripada peranti.',
    'player.deviceChanged': 'Kedudukan peranti telah berubah. Semak senarai yang dikemas kini.',
    'player.othersRemain':
      'Kedudukan pemulihan lain pada peranti, jika ada, kekal tersedia apabila anda membuka semula pelajaran ini.',
    'player.deviceUseFailed':
      'Tidak dapat menggunakan kedudukan peranti ini. Cuba lagi selepas media dimuatkan.',
    'player.quality': 'Kualiti',
    'player.qualityStandard': '480p — standard',
    'player.qualitySmall': '360p — kecil',
    'player.qualityAudio': 'Audio sahaja',
    'player.saving': 'Menyimpan…',
    'player.saveDevice': 'Simpan pada peranti ini',
    'player.onDevice': 'Pada peranti ini',
    'player.seePlus': 'Lihat kandungan Plus',
    'player.plusNote': 'Menyimpan pelajaran pada peranti ialah sebahagian daripada pelan Plus.',
    'player.tryAgain': 'Cuba lagi',
    'player.preparing': 'Menyediakan pemain…',
    'player.linksNote':
      'Pautan main balik berjangka pendek dan terikat pada akses anda kepada pelajaran ini.',
    'player.savedNote':
      'Pelajaran yang disimpan kekal di dalam aplikasi, tetapi buat masa ini memerlukan sambungan untuk menyemak akses setiap kali anda membukanya.',
    'player.playFailed': 'Pelajaran itu tidak dapat dimainkan.',
    'player.saveRefused': 'Pelajaran ini tidak boleh disimpan dengan pelan ini.',
    'player.fetchFailed': 'Pelajaran itu tidak dapat diambil untuk disimpan.',
    'player.saveFailed': 'Pelajaran itu tidak dapat disimpan.',
    'player.noCopy': 'Rakaman ini belum mempunyai salinan yang boleh dimainkan.',
  },
  bn: {
    'player.videoUnsupported': 'আপনার ব্রাউজার এই ভিডিওটি চালাতে পারছে না।',
    'player.audioUnsupported': 'আপনার ব্রাউজার এই অডিওটি চালাতে পারছে না।',
    'player.openVideo': 'ভিডিওটি সরাসরি খুলুন',
    'player.openAudio': 'অডিওটি সরাসরি খুলুন',
    'player.speed': 'গতি',
    'player.slower': 'আরও ধীরে',
    'player.faster': 'আরও দ্রুত',
    'player.loopFrom': 'এখান থেকে পুনরাবৃত্তি করুন',
    'player.loopTo': 'এই পর্যন্ত',
    'player.loopStop': 'পুনরাবৃত্তি বন্ধ করুন',
    'player.loopOpenEnd': '{from} থেকে পুনরাবৃত্তি হচ্ছে — কোথায় শেষ হবে চিহ্নিত করুন।',
    'player.loopOpenStart': '{to} পর্যন্ত পুনরাবৃত্তি হচ্ছে — কোথায় শুরু হবে চিহ্নিত করুন।',
    'player.loopBackwards': 'এই অংশটি শুরুর আগেই শেষ হচ্ছে। আবার চিহ্নিত করুন।',
    'player.loopBoth': '{from} – {to} পুনরাবৃত্তি হচ্ছে।',
    'player.resuming': '{at} থেকে আবার শুরু হচ্ছে।',
    'player.checking': 'আপনার সংরক্ষিত জায়গা যাচাই করা হচ্ছে…',
    'player.legacyGroup': 'পুরো পাঠের জন্য আগের সংরক্ষিত জায়গা',
    'player.legacyPlace':
      'পুরো পাঠের জন্য আগে সংরক্ষিত একটি জায়গা হলো {at}। এটি অন্য কোনো রেকর্ডিংয়ের হতে পারে। আপনি এখানে এটি দেখে নিতে পারেন; আপনি বেছে না নিলে এটি এই রেকর্ডিংয়ের সংরক্ষিত জায়গার বদলে বসবে না।',
    'player.limit': 'প্লেয়ার ২৪ ঘণ্টার বেশি যেতে পারে না।',
    'player.legacyReview': 'আগের জায়গাটি দেখুন',
    'player.notNow': 'এখন নয়',
    'player.recoveryToggle': 'এই ব্রাউজারে একটি সাময়িক পুনরুদ্ধারের জায়গা রাখুন',
    'player.recoveryNotice':
      'ঐচ্ছিক। এই ব্রাউজার প্রোফাইলে যার প্রবেশাধিকার আছে সে অ্যাকাউন্ট, ভর্তি, পাঠ ও রেকর্ডিংয়ের শনাক্তকারী, সেশনের শনাক্তকারী, জায়গা ও সময়চিহ্ন দেখতে পারে, এটি ব্যবহারকারী অন্য অ্যাকাউন্টগুলোরও। এটি বন্ধ করলে এই ব্রাউজারের সব অ্যাকাউন্টের পুনরুদ্ধারের জায়গা মুছে যায়। কোনো জায়গা সংরক্ষণের আগে আপনার অ্যাকাউন্ট অনলাইনে নিশ্চিত হতে হবে। রেকর্ডগুলোর মেয়াদ সাত দিন পর শেষ হয় এবং পরের কোনো ভিজিটে মুছে ফেলা হয়; স্টোরেজ অনুপলব্ধ থাকতে পারে বা আগেই মুছে যেতে পারে।',
    'player.earlierGroup': 'ডিভাইসে পুরো পাঠের জন্য আগের জায়গাগুলো',
    'player.earlierIntro':
      'ডিভাইসের এই পুরোনো জায়গাগুলো পুরো পাঠের জন্য সংরক্ষিত হয়েছিল, নির্দিষ্ট কোনো রেকর্ডিংয়ের জন্য নয়। এগুলো অন্য রেকর্ডিংয়ের হতে পারে। একটি এখানে দেখে নিন অথবা বাদ দিন; দেখে নিলে আপনার আরেকটি পছন্দ ছাড়া অ্যাকাউন্টের জায়গা বদলায় না।',
    'player.earlierReview': 'ডিভাইসের আগের জায়গাটি দেখুন',
    'player.earlierReviewLabel': 'ডিভাইসের আগের জায়গা {at} দেখুন, {when} তারিখের',
    'player.earlierDiscard': 'আগের জায়গাটি বাদ দিন',
    'player.earlierDiscardLabel': 'ডিভাইসের আগের জায়গা {at} বাদ দিন, {when} তারিখের',
    'player.deviceGroup': 'ডিভাইসে পুনরুদ্ধারের জায়গা',
    'player.deviceIntro':
      'এই ব্রাউজারের কোনো জায়গা হয়তো আপনার অ্যাকাউন্টে পৌঁছায়নি। স্বয়ংক্রিয় সংরক্ষণ চলার আগে প্রতিটি জায়গা দেখে নিন বা বাদ দিন। একটি বেছে নিলে বাকিগুলো পরের ভিজিটের জন্য থেকে যায়।',
    'player.deviceReview': 'এই জায়গাটি দেখুন',
    'player.deviceReviewLabel': 'ডিভাইসের জায়গা {at} দেখুন, {when} তারিখের',
    'player.deviceDiscard': 'বাদ দিন',
    'player.deviceDiscardLabel': 'ডিভাইসের জায়গা {at} বাদ দিন, {when} তারিখের',
    'player.conflictGroup': 'আপনার সংরক্ষিত জায়গা বেছে নিন',
    'player.conflictIntro': 'অ্যাকাউন্টের সংরক্ষিত জায়গা এই প্লেয়ারের থেকে আলাদা হতে পারে।',
    'player.conflictNone': 'কোনো সংরক্ষিত জায়গা নেই।',
    'player.conflictSaved': 'সংরক্ষিত জায়গা: {at}।',
    'player.conflictLocal': 'এই প্লেয়ার: {at}। কোনটি রাখা হবে?',
    'player.useSaved': 'সংরক্ষিত জায়গা ব্যবহার করুন',
    'player.keepLocal': 'এই প্লেয়ারের জায়গা রাখুন',
    'player.storeClearFailed':
      'ডিভাইসের স্টোরেজ মোছা যায়নি। আপনার ব্রাউজারের স্টোরেজ সেটিংস দেখুন।',
    'player.storeSaveFailed': 'এই ডিভাইসে পুনরুদ্ধারের জায়গা সংরক্ষণ করা যায়নি।',
    'player.storeUnavailable': 'এই ব্রাউজারে পুনরুদ্ধারের স্টোরেজ পাওয়া যাচ্ছে না।',
    'player.storeReadFailed':
      'ডিভাইসের আগের জায়গাগুলো পড়া যায়নি। আপনার ব্রাউজারের স্টোরেজ সেটিংস দেখুন।',
    'player.earlierClearFailed':
      'ডিভাইসের আগের জায়গাটি মোছা যায়নি। আপনার ব্রাউজারের স্টোরেজ সেটিংস দেখুন।',
    'player.unconfirmed':
      'আপনার সংরক্ষিত জায়গা নিশ্চিত করা যায়নি। সংরক্ষণ চালিয়ে যাওয়ার আগে যাচাই করতে পাঠটি আবার লোড করুন।',
    'player.loadFailed':
      'আপনার সংরক্ষিত জায়গা লোড করা যায়নি। আপনি এই পাঠ চালাতে পারেন, তবে আবার লোড না করা পর্যন্ত সংরক্ষণ পাওয়া যাবে না।',
    'player.turnedOff': 'এই ব্রাউজারের অন্য জায়গা থেকে পুনরুদ্ধার বন্ধ করা বা মুছে ফেলা হয়েছে।',
    'player.storeCheckFailed': 'এই ব্রাউজারে পুনরুদ্ধারের স্টোরেজ যাচাই করা যায়নি।',
    'player.legacyBusy':
      'পুরোনো জায়গাটি দেখার আগে চলমান সংরক্ষণ বা পুনরুদ্ধারের পছন্দটি শেষ করুন।',
    'player.legacyWait': 'পুরোনো জায়গাটি দেখার আগে রেকর্ডিং লোড হওয়া পর্যন্ত অপেক্ষা করুন।',
    'player.legacyBeyond':
      'পুরোনো জায়গাটি এই রেকর্ডিংয়ের শেষ ছাড়িয়ে গেছে। এটি অন্য রেকর্ডিংয়ের হতে পারে।',
    'player.legacySeekFailed':
      'পুরোনো জায়গায় যাওয়া যায়নি। রেকর্ডিং প্রস্তুত হলে আবার চেষ্টা করুন।',
    'player.earlierRemoveFailed': 'ডিভাইসের আগের জায়গাটি সরানো যায়নি।',
    'player.earlierBusy':
      'ডিভাইসের আগের কোনো জায়গা দেখার আগে চলমান সংরক্ষণ বা পুনরুদ্ধারের পছন্দটি শেষ করুন।',
    'player.earlierWait':
      'ডিভাইসের আগের জায়গাটি দেখার আগে রেকর্ডিং লোড হওয়া পর্যন্ত অপেক্ষা করুন।',
    'player.earlierChanged': 'ডিভাইসের আগের জায়গাটি বদলে গেছে। হালনাগাদ তালিকাটি দেখুন।',
    'player.earlierBeyond':
      'ডিভাইসের আগের জায়গাটি এই রেকর্ডিংয়ের শেষ ছাড়িয়ে গেছে। এটি অন্য রেকর্ডিংয়ের হতে পারে।',
    'player.earlierSeekFailed': 'ডিভাইসের আগের জায়গায় যাওয়া যায়নি।',
    'player.earlierReadFailed': 'ডিভাইসের আগের জায়গাটি পড়া যায়নি।',
    'player.needConfirmed':
      'আপনার অ্যাকাউন্ট নিশ্চিত না হওয়া পর্যন্ত পুনরুদ্ধার কোনো জায়গা লিখে রাখতে পারে না। সংযুক্ত হলে আবার লোড করুন।',
    'player.storeChangeFailed':
      'ডিভাইসের স্টোরেজ বদলানো বা পুরোপুরি মোছা যায়নি। আপনার ব্রাউজারের স্টোরেজ সেটিংস দেখুন।',
    'player.deviceRemoveFailed': 'এই পুনরুদ্ধারের জায়গাটি ডিভাইস থেকে সরানো যায়নি।',
    'player.deviceChanged': 'ডিভাইসের জায়গাটি বদলে গেছে। হালনাগাদ তালিকাটি দেখুন।',
    'player.othersRemain':
      'ডিভাইসের অন্য পুনরুদ্ধারের জায়গাগুলো, যদি থাকে, এই পাঠ আবার খুললে পাওয়া যাবে।',
    'player.deviceUseFailed':
      'ডিভাইসের এই জায়গাটি ব্যবহার করা যায়নি। মিডিয়া লোড হওয়ার পর আবার চেষ্টা করুন।',
    'player.quality': 'মান',
    'player.qualityStandard': '480p — সাধারণ',
    'player.qualitySmall': '360p — ছোট',
    'player.qualityAudio': 'শুধু অডিও',
    'player.saving': 'সংরক্ষণ হচ্ছে…',
    'player.saveDevice': 'এই ডিভাইসে সংরক্ষণ করুন',
    'player.onDevice': 'এই ডিভাইসে আছে',
    'player.seePlus': 'Plus-এ কী কী আছে দেখুন',
    'player.plusNote': 'ডিভাইসে পাঠ সংরক্ষণ করা Plus প্ল্যানের অংশ।',
    'player.tryAgain': 'আবার চেষ্টা করুন',
    'player.preparing': 'প্লেয়ার প্রস্তুত করা হচ্ছে…',
    'player.linksNote':
      'চালানোর লিংকগুলো অল্প সময়ের জন্য কার্যকর থাকে এবং এই পাঠে আপনার প্রবেশাধিকারের সঙ্গে বাঁধা।',
    'player.savedNote':
      'সংরক্ষিত পাঠ অ্যাপের ভেতরেই থাকে, তবে আপাতত প্রতিবার খোলার সময় প্রবেশাধিকার যাচাইয়ের জন্য সংযোগ লাগে।',
    'player.playFailed': 'পাঠটি চালানো যায়নি।',
    'player.saveRefused': 'এই প্ল্যানে এই পাঠ সংরক্ষণ করা যায় না।',
    'player.fetchFailed': 'সংরক্ষণের জন্য পাঠটি আনা যায়নি।',
    'player.saveFailed': 'পাঠটি সংরক্ষণ করা যায়নি।',
    'player.noCopy': 'এই রেকর্ডিংয়ের এখনো চালানোর মতো কোনো কপি নেই।',
  },
  hi: {
    'player.videoUnsupported': 'आपका ब्राउज़र यह वीडियो नहीं चला सकता।',
    'player.audioUnsupported': 'आपका ब्राउज़र यह ऑडियो नहीं चला सकता।',
    'player.openVideo': 'वीडियो सीधे खोलें',
    'player.openAudio': 'ऑडियो सीधे खोलें',
    'player.speed': 'गति',
    'player.slower': 'धीमा',
    'player.faster': 'तेज़',
    'player.loopFrom': 'यहाँ से दोहराएँ',
    'player.loopTo': 'यहाँ तक',
    'player.loopStop': 'दोहराना बंद करें',
    'player.loopOpenEnd': '{from} से दोहराया जा रहा है — निशान लगाएँ कि कहाँ ख़त्म हो।',
    'player.loopOpenStart': '{to} तक दोहराया जा रहा है — निशान लगाएँ कि कहाँ से शुरू हो।',
    'player.loopBackwards': 'यह हिस्सा शुरू होने से पहले ख़त्म हो रहा है। फिर से निशान लगाएँ।',
    'player.loopBoth': '{from} – {to} दोहराया जा रहा है।',
    'player.resuming': '{at} से फिर शुरू हो रहा है।',
    'player.checking': 'आपकी सहेजी गई जगह जाँची जा रही है…',
    'player.legacyGroup': 'पूरे पाठ के लिए पहले सहेजी गई जगह',
    'player.legacyPlace':
      'पूरे पाठ के लिए पहले सहेजी गई एक जगह {at} है। हो सकता है यह किसी दूसरी रिकॉर्डिंग की हो। आप इसे यहाँ देख सकते हैं; आपके चुने बिना यह इस रिकॉर्डिंग की सहेजी गई जगह को नहीं बदलेगी।',
    'player.limit': 'प्लेयर 24 घंटे से आगे नहीं जा सकता।',
    'player.legacyReview': 'पहले वाली जगह देखें',
    'player.notNow': 'अभी नहीं',
    'player.recoveryToggle': 'इस ब्राउज़र पर एक अस्थायी रिकवरी जगह रखें',
    'player.recoveryNotice':
      'वैकल्पिक। जिस किसी की इस ब्राउज़र प्रोफ़ाइल तक पहुँच है, वह खाते, नामांकन, पाठ और रिकॉर्डिंग के पहचानकर्ता, सत्र के पहचानकर्ता, जगहें और समय देख सकता है, इसे इस्तेमाल करने वाले दूसरे खातों के भी। इसे बंद करने पर इस ब्राउज़र के सभी खातों की रिकवरी जगहें हट जाती हैं। कोई जगह सहेजे जाने से पहले आपके खाते की ऑनलाइन पुष्टि ज़रूरी है। रिकॉर्ड सात दिन बाद समाप्त हो जाते हैं और बाद की किसी विज़िट पर मिटा दिए जाते हैं; हो सकता है स्टोरेज उपलब्ध न हो या पहले ही मिट जाए।',
    'player.earlierGroup': 'डिवाइस पर पूरे पाठ के लिए पहले वाली जगहें',
    'player.earlierIntro':
      'डिवाइस की ये पुरानी जगहें पूरे पाठ के लिए सहेजी गई थीं, किसी ख़ास रिकॉर्डिंग के लिए नहीं। हो सकता है ये किसी दूसरी रिकॉर्डिंग की हों। किसी एक को यहाँ देखें या हटा दें; देखने से आपके एक और चुनाव के बिना खाते की जगह नहीं बदलती।',
    'player.earlierReview': 'डिवाइस की पहले वाली जगह देखें',
    'player.earlierReviewLabel': 'डिवाइस की पहले वाली जगह {at} देखें, {when} की',
    'player.earlierDiscard': 'पहले वाली जगह हटाएँ',
    'player.earlierDiscardLabel': 'डिवाइस की पहले वाली जगह {at} हटाएँ, {when} की',
    'player.deviceGroup': 'डिवाइस पर रिकवरी जगहें',
    'player.deviceIntro':
      'हो सकता है इस ब्राउज़र की कोई जगह आपके खाते तक न पहुँची हो। अपने-आप सहेजना जारी होने से पहले हर जगह को देखें या हटाएँ। एक को चुनने पर बाक़ी जगहें बाद की विज़िट के लिए रह जाती हैं।',
    'player.deviceReview': 'यह जगह देखें',
    'player.deviceReviewLabel': 'डिवाइस की जगह {at} देखें, {when} की',
    'player.deviceDiscard': 'हटाएँ',
    'player.deviceDiscardLabel': 'डिवाइस की जगह {at} हटाएँ, {when} की',
    'player.conflictGroup': 'अपनी सहेजी गई जगह चुनें',
    'player.conflictIntro': 'हो सकता है खाते की सहेजी गई जगह इस प्लेयर से अलग हो।',
    'player.conflictNone': 'कोई सहेजी गई जगह नहीं।',
    'player.conflictSaved': 'सहेजी गई जगह: {at}।',
    'player.conflictLocal': 'यह प्लेयर: {at}। कौन-सी रखी जाए?',
    'player.useSaved': 'सहेजी गई जगह इस्तेमाल करें',
    'player.keepLocal': 'इस प्लेयर की जगह रखें',
    'player.storeClearFailed':
      'डिवाइस का स्टोरेज साफ़ नहीं हो सका। अपने ब्राउज़र की स्टोरेज सेटिंग देखें।',
    'player.storeSaveFailed': 'इस डिवाइस पर रिकवरी जगह सहेजी नहीं जा सकी।',
    'player.storeUnavailable': 'इस ब्राउज़र में रिकवरी स्टोरेज उपलब्ध नहीं है।',
    'player.storeReadFailed':
      'डिवाइस की पहले वाली जगहें पढ़ी नहीं जा सकीं। अपने ब्राउज़र की स्टोरेज सेटिंग देखें।',
    'player.earlierClearFailed':
      'डिवाइस की पहले वाली जगह साफ़ नहीं हो सकी। अपने ब्राउज़र की स्टोरेज सेटिंग देखें।',
    'player.unconfirmed':
      'आपकी सहेजी गई जगह की पुष्टि नहीं हो सकी। सहेजना जारी रखने से पहले जाँचने के लिए पाठ फिर से लोड करें।',
    'player.loadFailed':
      'आपकी सहेजी गई जगह लोड नहीं हो सकी। आप यह पाठ चला सकते हैं, लेकिन फिर से लोड करने तक सहेजना उपलब्ध नहीं है।',
    'player.turnedOff': 'रिकवरी इस ब्राउज़र में कहीं और से बंद या साफ़ कर दी गई।',
    'player.storeCheckFailed': 'इस ब्राउज़र में रिकवरी स्टोरेज की जाँच नहीं हो सकी।',
    'player.legacyBusy': 'पुरानी जगह देखने से पहले मौजूदा सहेजने या रिकवरी का चुनाव पूरा करें।',
    'player.legacyWait': 'पुरानी जगह देखने से पहले रिकॉर्डिंग लोड होने का इंतज़ार करें।',
    'player.legacyBeyond':
      'पुरानी जगह इस रिकॉर्डिंग के अंत से आगे है। हो सकता है यह किसी दूसरी रिकॉर्डिंग की हो।',
    'player.legacySeekFailed':
      'पुरानी जगह पर नहीं जाया जा सका। रिकॉर्डिंग तैयार होने पर फिर कोशिश करें।',
    'player.earlierRemoveFailed': 'डिवाइस की पहले वाली जगह हटाई नहीं जा सकी।',
    'player.earlierBusy':
      'डिवाइस की पहले वाली कोई जगह देखने से पहले मौजूदा सहेजने या रिकवरी का चुनाव पूरा करें।',
    'player.earlierWait':
      'डिवाइस की पहले वाली जगह देखने से पहले रिकॉर्डिंग लोड होने का इंतज़ार करें।',
    'player.earlierChanged': 'डिवाइस की पहले वाली जगह बदल गई है। अपडेट की गई सूची देखें।',
    'player.earlierBeyond':
      'डिवाइस की पहले वाली जगह इस रिकॉर्डिंग के अंत से आगे है। हो सकता है यह किसी दूसरी रिकॉर्डिंग की हो।',
    'player.earlierSeekFailed': 'डिवाइस की पहले वाली जगह पर नहीं जाया जा सका।',
    'player.earlierReadFailed': 'डिवाइस की पहले वाली जगह पढ़ी नहीं जा सकी।',
    'player.needConfirmed':
      'आपके खाते की पुष्टि होने तक रिकवरी कोई जगह दर्ज नहीं कर सकती। कनेक्ट होने पर फिर से लोड करें।',
    'player.storeChangeFailed':
      'डिवाइस का स्टोरेज बदला या पूरी तरह साफ़ नहीं किया जा सका। अपने ब्राउज़र की स्टोरेज सेटिंग देखें।',
    'player.deviceRemoveFailed': 'यह रिकवरी जगह डिवाइस से हटाई नहीं जा सकी।',
    'player.deviceChanged': 'डिवाइस की जगह बदल गई है। अपडेट की गई सूची देखें।',
    'player.othersRemain':
      'डिवाइस की दूसरी रिकवरी जगहें, अगर हों, यह पाठ दोबारा खोलने पर उपलब्ध रहती हैं।',
    'player.deviceUseFailed':
      'डिवाइस की यह जगह इस्तेमाल नहीं हो सकी। मीडिया लोड होने के बाद फिर कोशिश करें।',
    'player.quality': 'क्वालिटी',
    'player.qualityStandard': '480p — सामान्य',
    'player.qualitySmall': '360p — छोटा',
    'player.qualityAudio': 'सिर्फ़ ऑडियो',
    'player.saving': 'सहेजा जा रहा है…',
    'player.saveDevice': 'इस डिवाइस पर सहेजें',
    'player.onDevice': 'इस डिवाइस पर है',
    'player.seePlus': 'देखें Plus में क्या शामिल है',
    'player.plusNote': 'पाठ को डिवाइस पर सहेजना Plus प्लान का हिस्सा है।',
    'player.tryAgain': 'फिर कोशिश करें',
    'player.preparing': 'प्लेयर तैयार हो रहा है…',
    'player.linksNote':
      'चलाने के लिंक थोड़ी देर के लिए होते हैं और इस पाठ तक आपकी पहुँच से जुड़े होते हैं।',
    'player.savedNote':
      'सहेजा गया पाठ ऐप के अंदर रहता है, लेकिन फ़िलहाल हर बार खोलने पर पहुँच जाँचने के लिए कनेक्शन चाहिए।',
    'player.playFailed': 'वह पाठ चलाया नहीं जा सका।',
    'player.saveRefused': 'यह पाठ इस प्लान पर सहेजा नहीं जा सकता।',
    'player.fetchFailed': 'वह पाठ सहेजने के लिए लाया नहीं जा सका।',
    'player.saveFailed': 'वह पाठ सहेजा नहीं जा सका।',
    'player.noCopy': 'इस रिकॉर्डिंग की अभी कोई ऐसी प्रति नहीं है जो चलाई जा सके।',
  },
  fr: {
    'player.videoUnsupported': 'Votre navigateur ne peut pas lire cette vidéo.',
    'player.audioUnsupported': 'Votre navigateur ne peut pas lire cet enregistrement audio.',
    'player.openVideo': 'Ouvrir la vidéo directement',
    'player.openAudio': 'Ouvrir l’audio directement',
    'player.speed': 'Vitesse',
    'player.slower': 'Plus lent',
    'player.faster': 'Plus rapide',
    'player.loopFrom': 'Répéter à partir d’ici',
    'player.loopTo': 'Jusqu’ici',
    'player.loopStop': 'Arrêter la répétition',
    'player.loopOpenEnd': 'Répétition à partir de {from} — marquez l’endroit où elle se termine.',
    'player.loopOpenStart': 'Répétition jusqu’à {to} — marquez l’endroit où elle commence.',
    'player.loopBackwards': 'Ce passage se termine avant de commencer. Marquez-le de nouveau.',
    'player.loopBoth': 'Répétition de {from} à {to}.',
    'player.resuming': 'Reprise à {at}.',
    'player.checking': 'Vérification de votre position enregistrée…',
    'player.legacyGroup': 'Ancienne position pour toute la leçon',
    'player.legacyPlace':
      'Une ancienne position enregistrée pour toute la leçon se trouve à {at}. Elle appartient peut-être à un autre enregistrement. Vous pouvez l’examiner ici ; elle ne remplacera pas la position enregistrée de cet enregistrement sans votre choix.',
    'player.limit': 'Le lecteur ne peut pas dépasser 24 heures.',
    'player.legacyReview': 'Examiner l’ancienne position',
    'player.notNow': 'Pas maintenant',
    'player.recoveryToggle': 'Garder une position de récupération temporaire dans ce navigateur',
    'player.recoveryNotice':
      'Facultatif. Toute personne ayant accès à ce profil de navigateur peut voir les identifiants de compte, d’inscription, de leçon et d’enregistrement, les identifiants de session, les positions et les horodatages, y compris ceux d’autres comptes qui l’utilisent. Désactiver cette option supprime les positions de récupération de tous les comptes dans ce navigateur. Votre compte doit être confirmé en ligne avant qu’une position puisse être stockée. Les données expirent après sept jours et sont effacées lors d’une visite ultérieure ; le stockage peut être indisponible ou effacé plus tôt.',
    'player.earlierGroup': 'Anciennes positions sur l’appareil pour toute la leçon',
    'player.earlierIntro':
      'Ces anciennes positions sur l’appareil ont été enregistrées pour toute la leçon, et non pour un enregistrement précis. Elles appartiennent peut-être à un autre enregistrement. Examinez-en une ici ou écartez-la ; l’examiner ne remplace pas la position du compte sans un autre choix de votre part.',
    'player.earlierReview': 'Examiner l’ancienne position sur l’appareil',
    'player.earlierReviewLabel': 'Examiner l’ancienne position sur l’appareil {at} du {when}',
    'player.earlierDiscard': 'Écarter l’ancienne position',
    'player.earlierDiscardLabel': 'Écarter l’ancienne position sur l’appareil {at} du {when}',
    'player.deviceGroup': 'Positions de récupération sur l’appareil',
    'player.deviceIntro':
      'Une position de ce navigateur n’a peut-être pas atteint votre compte. Examinez ou écartez chaque position avant que l’enregistrement automatique ne reprenne. En choisir une laisse les autres pour une visite ultérieure.',
    'player.deviceReview': 'Examiner cette position',
    'player.deviceReviewLabel': 'Examiner la position sur l’appareil {at} du {when}',
    'player.deviceDiscard': 'Écarter',
    'player.deviceDiscardLabel': 'Écarter la position sur l’appareil {at} du {when}',
    'player.conflictGroup': 'Choisissez votre position enregistrée',
    'player.conflictIntro':
      'La position enregistrée du compte diffère peut-être de celle de ce lecteur.',
    'player.conflictNone': 'Aucune position enregistrée.',
    'player.conflictSaved': 'Position enregistrée : {at}.',
    'player.conflictLocal': 'Ce lecteur : {at}. Laquelle faut-il garder ?',
    'player.useSaved': 'Utiliser la position enregistrée',
    'player.keepLocal': 'Garder la position de ce lecteur',
    'player.storeClearFailed':
      'Le stockage de l’appareil n’a pas pu être effacé. Vérifiez les réglages de stockage de votre navigateur.',
    'player.storeSaveFailed':
      'Impossible d’enregistrer une position de récupération sur cet appareil.',
    'player.storeUnavailable': 'Le stockage de récupération est indisponible dans ce navigateur.',
    'player.storeReadFailed':
      'Impossible de lire les anciennes positions sur l’appareil. Vérifiez les réglages de stockage de votre navigateur.',
    'player.earlierClearFailed':
      'Impossible d’effacer l’ancienne position sur l’appareil. Vérifiez les réglages de stockage de votre navigateur.',
    'player.unconfirmed':
      'Impossible de confirmer votre position enregistrée. Rechargez la leçon pour vérifier avant de continuer à enregistrer.',
    'player.loadFailed':
      'Impossible de charger votre position enregistrée. Vous pouvez lire cette leçon, mais l’enregistrement de la position est indisponible jusqu’au rechargement.',
    'player.turnedOff': 'La récupération a été désactivée ou effacée ailleurs dans ce navigateur.',
    'player.storeCheckFailed':
      'Impossible de vérifier le stockage de récupération dans ce navigateur.',
    'player.legacyBusy':
      'Terminez le choix d’enregistrement ou de récupération en cours avant d’examiner l’ancienne position.',
    'player.legacyWait':
      'Attendez le chargement de l’enregistrement avant d’examiner l’ancienne position.',
    'player.legacyBeyond':
      'L’ancienne position dépasse la fin de cet enregistrement. Elle appartient peut-être à un autre enregistrement.',
    'player.legacySeekFailed':
      'Impossible d’aller à l’ancienne position. Réessayez quand l’enregistrement sera prêt.',
    'player.earlierRemoveFailed': 'Impossible de supprimer l’ancienne position sur l’appareil.',
    'player.earlierBusy':
      'Terminez le choix d’enregistrement ou de récupération en cours avant d’examiner une ancienne position sur l’appareil.',
    'player.earlierWait':
      'Attendez le chargement de l’enregistrement avant d’examiner l’ancienne position sur l’appareil.',
    'player.earlierChanged':
      'L’ancienne position sur l’appareil a changé. Examinez la liste mise à jour.',
    'player.earlierBeyond':
      'L’ancienne position sur l’appareil dépasse la fin de cet enregistrement. Elle appartient peut-être à un autre enregistrement.',
    'player.earlierSeekFailed': 'Impossible d’aller à l’ancienne position sur l’appareil.',
    'player.earlierReadFailed': 'Impossible de lire l’ancienne position sur l’appareil.',
    'player.needConfirmed':
      'La récupération ne peut pas noter de position tant que votre compte n’est pas confirmé. Rechargez une fois connecté.',
    'player.storeChangeFailed':
      'Le stockage de l’appareil n’a pas pu être modifié ou entièrement effacé. Vérifiez les réglages de stockage de votre navigateur.',
    'player.deviceRemoveFailed':
      'Impossible de supprimer cette position de récupération de l’appareil.',
    'player.deviceChanged': 'La position sur l’appareil a changé. Examinez la liste mise à jour.',
    'player.othersRemain':
      'Les autres positions de récupération sur l’appareil, s’il y en a, restent disponibles à la réouverture de cette leçon.',
    'player.deviceUseFailed':
      'Impossible d’utiliser cette position sur l’appareil. Réessayez après le chargement du média.',
    'player.quality': 'Qualité',
    'player.qualityStandard': '480p — standard',
    'player.qualitySmall': '360p — petite',
    'player.qualityAudio': 'Audio seul',
    'player.saving': 'Enregistrement…',
    'player.saveDevice': 'Enregistrer sur cet appareil',
    'player.onDevice': 'Sur cet appareil',
    'player.seePlus': 'Voir ce que Plus comprend',
    'player.plusNote': 'Enregistrer une leçon sur un appareil fait partie de la formule Plus.',
    'player.tryAgain': 'Réessayer',
    'player.preparing': 'Préparation du lecteur…',
    'player.linksNote':
      'Les liens de lecture sont de courte durée et liés à votre accès à cette leçon.',
    'player.savedNote':
      'Une leçon enregistrée reste dans l’application, mais nécessite pour l’instant une connexion pour vérifier l’accès à chaque ouverture.',
    'player.playFailed': 'Cette leçon n’a pas pu être lue.',
    'player.saveRefused': 'Cette leçon ne peut pas être enregistrée avec cette formule.',
    'player.fetchFailed': 'Cette leçon n’a pas pu être récupérée pour l’enregistrement.',
    'player.saveFailed': 'Cette leçon n’a pas pu être enregistrée.',
    'player.noCopy': 'Cet enregistrement n’a pas encore de copie lisible.',
  },
  es: {
    'player.videoUnsupported': 'Tu navegador no puede reproducir este vídeo.',
    'player.audioUnsupported': 'Tu navegador no puede reproducir este audio.',
    'player.openVideo': 'Abrir el vídeo directamente',
    'player.openAudio': 'Abrir el audio directamente',
    'player.speed': 'Velocidad',
    'player.slower': 'Más lento',
    'player.faster': 'Más rápido',
    'player.loopFrom': 'Repetir desde aquí',
    'player.loopTo': 'Hasta aquí',
    'player.loopStop': 'Dejar de repetir',
    'player.loopOpenEnd': 'Repitiendo desde {from}: marca dónde termina.',
    'player.loopOpenStart': 'Repitiendo hasta {to}: marca dónde empieza.',
    'player.loopBackwards': 'Ese pasaje termina antes de empezar. Márcalo de nuevo.',
    'player.loopBoth': 'Repitiendo de {from} a {to}.',
    'player.resuming': 'Reanudando en {at}.',
    'player.checking': 'Comprobando tu posición guardada…',
    'player.legacyGroup': 'Posición anterior de toda la lección',
    'player.legacyPlace':
      'Hay una posición anterior guardada para toda la lección: {at}. Puede pertenecer a otra grabación. Puedes revisarla aquí; no sustituirá la posición guardada de esta grabación sin que tú lo elijas.',
    'player.limit': 'El reproductor no puede pasar de 24 horas.',
    'player.legacyReview': 'Revisar la posición anterior',
    'player.notNow': 'Ahora no',
    'player.recoveryToggle': 'Mantener una posición de recuperación temporal en este navegador',
    'player.recoveryNotice':
      'Opcional. Cualquier persona con acceso a este perfil del navegador puede ver identificadores de cuenta, de inscripción, de lección y de grabación, identificadores de sesión, posiciones y marcas de tiempo, incluidos los de otras cuentas que lo usen. Desactivar esta opción elimina las posiciones de recuperación de todas las cuentas en este navegador. Tu cuenta debe confirmarse en línea antes de que se pueda almacenar una posición. Los registros caducan a los siete días y se borran en una visita posterior; el almacenamiento puede no estar disponible o borrarse antes.',
    'player.earlierGroup': 'Posiciones anteriores del dispositivo para toda la lección',
    'player.earlierIntro':
      'Estas posiciones antiguas del dispositivo se guardaron para toda la lección, no para una grabación concreta. Pueden pertenecer a otra grabación. Revisa una aquí o descártala; revisarla no sustituye la posición de la cuenta sin otra elección tuya.',
    'player.earlierReview': 'Revisar la posición anterior del dispositivo',
    'player.earlierReviewLabel': 'Revisar la posición anterior del dispositivo {at} del {when}',
    'player.earlierDiscard': 'Descartar la posición anterior',
    'player.earlierDiscardLabel': 'Descartar la posición anterior del dispositivo {at} del {when}',
    'player.deviceGroup': 'Posiciones de recuperación del dispositivo',
    'player.deviceIntro':
      'Puede que una posición de este navegador no haya llegado a tu cuenta. Revisa o descarta cada posición antes de que continúe el guardado automático. Al elegir una, las demás quedan para una visita posterior.',
    'player.deviceReview': 'Revisar esta posición',
    'player.deviceReviewLabel': 'Revisar la posición del dispositivo {at} del {when}',
    'player.deviceDiscard': 'Descartar',
    'player.deviceDiscardLabel': 'Descartar la posición del dispositivo {at} del {when}',
    'player.conflictGroup': 'Elige tu posición guardada',
    'player.conflictIntro':
      'La posición guardada de la cuenta puede ser distinta de la de este reproductor.',
    'player.conflictNone': 'No hay posición guardada.',
    'player.conflictSaved': 'Posición guardada: {at}.',
    'player.conflictLocal': 'Este reproductor: {at}. ¿Cuál debe conservarse?',
    'player.useSaved': 'Usar la posición guardada',
    'player.keepLocal': 'Conservar la posición de este reproductor',
    'player.storeClearFailed':
      'No se pudo borrar el almacenamiento del dispositivo. Revisa los ajustes de almacenamiento de tu navegador.',
    'player.storeSaveFailed':
      'No se pudo guardar una posición de recuperación en este dispositivo.',
    'player.storeUnavailable':
      'El almacenamiento de recuperación no está disponible en este navegador.',
    'player.storeReadFailed':
      'No se pudieron leer las posiciones anteriores del dispositivo. Revisa los ajustes de almacenamiento de tu navegador.',
    'player.earlierClearFailed':
      'No se pudo borrar la posición anterior del dispositivo. Revisa los ajustes de almacenamiento de tu navegador.',
    'player.unconfirmed':
      'No se pudo confirmar tu posición guardada. Recarga la lección para comprobarla antes de seguir guardando.',
    'player.loadFailed':
      'No se pudo cargar tu posición guardada. Puedes reproducir esta lección, pero el guardado no estará disponible hasta que recargues.',
    'player.turnedOff':
      'La recuperación se desactivó o se borró desde otro lugar de este navegador.',
    'player.storeCheckFailed':
      'No se pudo comprobar el almacenamiento de recuperación en este navegador.',
    'player.legacyBusy':
      'Termina la elección de guardado o recuperación en curso antes de revisar la posición antigua.',
    'player.legacyWait': 'Espera a que cargue la grabación antes de revisar la posición antigua.',
    'player.legacyBeyond':
      'La posición antigua queda más allá del final de esta grabación. Puede pertenecer a otra grabación.',
    'player.legacySeekFailed':
      'No se pudo ir a la posición antigua. Inténtalo de nuevo cuando la grabación esté lista.',
    'player.earlierRemoveFailed': 'No se pudo eliminar la posición anterior del dispositivo.',
    'player.earlierBusy':
      'Termina la elección de guardado o recuperación en curso antes de revisar una posición anterior del dispositivo.',
    'player.earlierWait':
      'Espera a que cargue la grabación antes de revisar la posición anterior del dispositivo.',
    'player.earlierChanged':
      'La posición anterior del dispositivo ha cambiado. Revisa la lista actualizada.',
    'player.earlierBeyond':
      'La posición anterior del dispositivo queda más allá del final de esta grabación. Puede pertenecer a otra grabación.',
    'player.earlierSeekFailed': 'No se pudo ir a la posición anterior del dispositivo.',
    'player.earlierReadFailed': 'No se pudo leer la posición anterior del dispositivo.',
    'player.needConfirmed':
      'La recuperación no puede registrar una posición hasta que se confirme tu cuenta. Recarga cuando tengas conexión.',
    'player.storeChangeFailed':
      'No se pudo cambiar o borrar por completo el almacenamiento del dispositivo. Revisa los ajustes de almacenamiento de tu navegador.',
    'player.deviceRemoveFailed':
      'No se pudo eliminar esta posición de recuperación del dispositivo.',
    'player.deviceChanged': 'La posición del dispositivo ha cambiado. Revisa la lista actualizada.',
    'player.othersRemain':
      'Las demás posiciones de recuperación del dispositivo, si las hay, seguirán disponibles cuando vuelvas a abrir esta lección.',
    'player.deviceUseFailed':
      'No se pudo usar esta posición del dispositivo. Inténtalo de nuevo cuando cargue el contenido.',
    'player.quality': 'Calidad',
    'player.qualityStandard': '480p — estándar',
    'player.qualitySmall': '360p — pequeña',
    'player.qualityAudio': 'Solo audio',
    'player.saving': 'Guardando…',
    'player.saveDevice': 'Guardar en este dispositivo',
    'player.onDevice': 'En este dispositivo',
    'player.seePlus': 'Ver qué incluye Plus',
    'player.plusNote': 'Guardar una lección en un dispositivo forma parte del plan Plus.',
    'player.tryAgain': 'Intentar de nuevo',
    'player.preparing': 'Preparando el reproductor…',
    'player.linksNote':
      'Los enlaces de reproducción duran poco y están ligados a tu acceso a esta lección.',
    'player.savedNote':
      'Una lección guardada permanece dentro de la aplicación, pero por ahora necesita conexión para comprobar el acceso cada vez que la abres.',
    'player.playFailed': 'No se pudo reproducir esa lección.',
    'player.saveRefused': 'Esta lección no se puede guardar con este plan.',
    'player.fetchFailed': 'No se pudo obtener esa lección para guardarla.',
    'player.saveFailed': 'No se pudo guardar esa lección.',
    'player.noCopy': 'Esta grabación todavía no tiene una copia que se pueda reproducir.',
  },
  pt: {
    'player.videoUnsupported': 'O seu navegador não consegue reproduzir este vídeo.',
    'player.audioUnsupported': 'O seu navegador não consegue reproduzir este áudio.',
    'player.openVideo': 'Abrir o vídeo diretamente',
    'player.openAudio': 'Abrir o áudio diretamente',
    'player.speed': 'Velocidade',
    'player.slower': 'Mais lento',
    'player.faster': 'Mais rápido',
    'player.loopFrom': 'Repetir a partir daqui',
    'player.loopTo': 'Até aqui',
    'player.loopStop': 'Parar de repetir',
    'player.loopOpenEnd': 'A repetir a partir de {from} — marque onde termina.',
    'player.loopOpenStart': 'A repetir até {to} — marque onde começa.',
    'player.loopBackwards': 'Esse trecho termina antes de começar. Marque-o de novo.',
    'player.loopBoth': 'A repetir de {from} a {to}.',
    'player.resuming': 'A retomar em {at}.',
    'player.checking': 'A verificar a sua posição guardada…',
    'player.legacyGroup': 'Posição anterior de toda a aula',
    'player.legacyPlace':
      'Há uma posição anterior guardada para toda a aula: {at}. Pode pertencer a outra gravação. Pode revê-la aqui; não substituirá a posição guardada desta gravação sem a sua escolha.',
    'player.limit': 'O leitor não pode ir além de 24 horas.',
    'player.legacyReview': 'Rever a posição anterior',
    'player.notNow': 'Agora não',
    'player.recoveryToggle': 'Manter uma posição de recuperação temporária neste navegador',
    'player.recoveryNotice':
      'Opcional. Qualquer pessoa com acesso a este perfil do navegador pode ver identificadores de conta, de inscrição, de aula e de gravação, identificadores de sessão, posições e marcas de data e hora, incluindo os de outras contas que o utilizem. Desativar esta opção remove as posições de recuperação de todas as contas neste navegador. A sua conta tem de ser confirmada online antes de se poder armazenar uma posição. Os registos expiram ao fim de sete dias e são apagados numa visita posterior; o armazenamento pode estar indisponível ou ser apagado mais cedo.',
    'player.earlierGroup': 'Posições anteriores no dispositivo para toda a aula',
    'player.earlierIntro':
      'Estas posições antigas no dispositivo foram guardadas para toda a aula, não para uma gravação específica. Podem pertencer a outra gravação. Reveja uma aqui ou descarte-a; revê-la não substitui a posição da conta sem outra escolha sua.',
    'player.earlierReview': 'Rever a posição anterior no dispositivo',
    'player.earlierReviewLabel': 'Rever a posição anterior no dispositivo {at} de {when}',
    'player.earlierDiscard': 'Descartar a posição anterior',
    'player.earlierDiscardLabel': 'Descartar a posição anterior no dispositivo {at} de {when}',
    'player.deviceGroup': 'Posições de recuperação no dispositivo',
    'player.deviceIntro':
      'Uma posição deste navegador pode não ter chegado à sua conta. Reveja ou descarte cada posição antes de a gravação automática continuar. Escolher uma deixa as outras para uma visita posterior.',
    'player.deviceReview': 'Rever esta posição',
    'player.deviceReviewLabel': 'Rever a posição no dispositivo {at} de {when}',
    'player.deviceDiscard': 'Descartar',
    'player.deviceDiscardLabel': 'Descartar a posição no dispositivo {at} de {when}',
    'player.conflictGroup': 'Escolha a sua posição guardada',
    'player.conflictIntro': 'A posição guardada na conta pode ser diferente da deste leitor.',
    'player.conflictNone': 'Não há posição guardada.',
    'player.conflictSaved': 'Posição guardada: {at}.',
    'player.conflictLocal': 'Este leitor: {at}. Qual deve ser mantida?',
    'player.useSaved': 'Usar a posição guardada',
    'player.keepLocal': 'Manter a posição deste leitor',
    'player.storeClearFailed':
      'Não foi possível limpar o armazenamento do dispositivo. Verifique as definições de armazenamento do seu navegador.',
    'player.storeSaveFailed':
      'Não foi possível guardar uma posição de recuperação neste dispositivo.',
    'player.storeUnavailable':
      'O armazenamento de recuperação não está disponível neste navegador.',
    'player.storeReadFailed':
      'Não foi possível ler as posições anteriores no dispositivo. Verifique as definições de armazenamento do seu navegador.',
    'player.earlierClearFailed':
      'Não foi possível limpar a posição anterior no dispositivo. Verifique as definições de armazenamento do seu navegador.',
    'player.unconfirmed':
      'Não foi possível confirmar a sua posição guardada. Recarregue a aula para verificar antes de continuar a guardar.',
    'player.loadFailed':
      'Não foi possível carregar a sua posição guardada. Pode reproduzir esta aula, mas a gravação da posição fica indisponível até recarregar.',
    'player.turnedOff': 'A recuperação foi desativada ou limpa noutro local deste navegador.',
    'player.storeCheckFailed':
      'Não foi possível verificar o armazenamento de recuperação neste navegador.',
    'player.legacyBusy':
      'Conclua a escolha de gravação ou de recuperação em curso antes de rever a posição antiga.',
    'player.legacyWait': 'Aguarde que a gravação carregue antes de rever a posição antiga.',
    'player.legacyBeyond':
      'A posição antiga fica para além do fim desta gravação. Pode pertencer a outra gravação.',
    'player.legacySeekFailed':
      'Não foi possível ir para a posição antiga. Tente de novo quando a gravação estiver pronta.',
    'player.earlierRemoveFailed': 'Não foi possível remover a posição anterior no dispositivo.',
    'player.earlierBusy':
      'Conclua a escolha de gravação ou de recuperação em curso antes de rever uma posição anterior no dispositivo.',
    'player.earlierWait':
      'Aguarde que a gravação carregue antes de rever a posição anterior no dispositivo.',
    'player.earlierChanged': 'A posição anterior no dispositivo mudou. Reveja a lista atualizada.',
    'player.earlierBeyond':
      'A posição anterior no dispositivo fica para além do fim desta gravação. Pode pertencer a outra gravação.',
    'player.earlierSeekFailed': 'Não foi possível ir para a posição anterior no dispositivo.',
    'player.earlierReadFailed': 'Não foi possível ler a posição anterior no dispositivo.',
    'player.needConfirmed':
      'A recuperação não pode registar uma posição enquanto a sua conta não for confirmada. Recarregue quando tiver ligação.',
    'player.storeChangeFailed':
      'Não foi possível alterar ou limpar por completo o armazenamento do dispositivo. Verifique as definições de armazenamento do seu navegador.',
    'player.deviceRemoveFailed':
      'Não foi possível remover esta posição de recuperação do dispositivo.',
    'player.deviceChanged': 'A posição no dispositivo mudou. Reveja a lista atualizada.',
    'player.othersRemain':
      'As outras posições de recuperação no dispositivo, se existirem, continuam disponíveis quando reabrir esta aula.',
    'player.deviceUseFailed':
      'Não foi possível usar esta posição do dispositivo. Tente de novo depois de o conteúdo carregar.',
    'player.quality': 'Qualidade',
    'player.qualityStandard': '480p — padrão',
    'player.qualitySmall': '360p — pequena',
    'player.qualityAudio': 'Só áudio',
    'player.saving': 'A guardar…',
    'player.saveDevice': 'Guardar neste dispositivo',
    'player.onDevice': 'Neste dispositivo',
    'player.seePlus': 'Ver o que o Plus inclui',
    'player.plusNote': 'Guardar uma aula num dispositivo faz parte do plano Plus.',
    'player.tryAgain': 'Tentar de novo',
    'player.preparing': 'A preparar o leitor…',
    'player.linksNote':
      'As ligações de reprodução duram pouco e estão associadas ao seu acesso a esta aula.',
    'player.savedNote':
      'Uma aula guardada fica dentro da aplicação, mas por agora precisa de ligação para verificar o acesso sempre que a abre.',
    'player.playFailed': 'Não foi possível reproduzir essa aula.',
    'player.saveRefused': 'Esta aula não pode ser guardada com este plano.',
    'player.fetchFailed': 'Não foi possível obter essa aula para a guardar.',
    'player.saveFailed': 'Não foi possível guardar essa aula.',
    'player.noCopy': 'Esta gravação ainda não tem uma cópia que possa ser reproduzida.',
  },
  sw: {
    'player.videoUnsupported': 'Kivinjari chako hakiwezi kucheza video hii.',
    'player.audioUnsupported': 'Kivinjari chako hakiwezi kucheza sauti hii.',
    'player.openVideo': 'Fungua video moja kwa moja',
    'player.openAudio': 'Fungua sauti moja kwa moja',
    'player.speed': 'Kasi',
    'player.slower': 'Polepole zaidi',
    'player.faster': 'Haraka zaidi',
    'player.loopFrom': 'Rudia kuanzia hapa',
    'player.loopTo': 'Hadi hapa',
    'player.loopStop': 'Acha kurudia',
    'player.loopOpenEnd': 'Inarudia kuanzia {from} — weka alama inapoishia.',
    'player.loopOpenStart': 'Inarudia hadi {to} — weka alama inapoanzia.',
    'player.loopBackwards': 'Kifungu hicho kinaisha kabla ya kuanza. Kiwekee alama tena.',
    'player.loopBoth': 'Inarudia {from} – {to}.',
    'player.resuming': 'Inaendelea kuanzia {at}.',
    'player.checking': 'Inakagua mahali pako palipohifadhiwa…',
    'player.legacyGroup': 'Mahali pa awali pa somo zima',
    'player.legacyPlace':
      'Kuna mahali pa awali palipohifadhiwa kwa somo zima, napo ni {at}. Huenda ni pa rekodi nyingine. Unaweza kupakagua hapa; hapatachukua nafasi ya mahali palipohifadhiwa pa rekodi hii bila chaguo lako.',
    'player.limit': 'Kichezaji hakiwezi kupita saa 24.',
    'player.legacyReview': 'Kagua mahali pa awali',
    'player.notNow': 'Si sasa',
    'player.recoveryToggle': 'Weka mahali pa muda pa urejeshaji kwenye kivinjari hiki',
    'player.recoveryNotice':
      'Si lazima. Mtu yeyote mwenye ufikiaji wa wasifu wa kivinjari hiki anaweza kuona vitambulisho vya akaunti, usajili, somo na rekodi, vitambulisho vya vipindi, mahali na nyakati, vikiwemo vya akaunti nyingine zinazokitumia. Kuzima chaguo hili huondoa mahali pa urejeshaji pa akaunti zote kwenye kivinjari hiki. Akaunti yako lazima ithibitishwe mtandaoni kabla ya mahali kuhifadhiwa. Rekodi huisha muda baada ya siku saba na hufutwa katika ziara ya baadaye; hifadhi inaweza kutopatikana au kufutwa mapema.',
    'player.earlierGroup': 'Mahali pa awali kwenye kifaa pa somo zima',
    'player.earlierIntro':
      'Mahali hapa pa zamani kwenye kifaa palihifadhiwa kwa somo zima, si kwa rekodi mahususi. Huenda ni pa rekodi nyingine. Kagua mojawapo hapa au patupe; kukagua hakubadilishi mahali pa akaunti bila chaguo lingine kutoka kwako.',
    'player.earlierReview': 'Kagua mahali pa awali kwenye kifaa',
    'player.earlierReviewLabel': 'Kagua mahali pa awali kwenye kifaa {at} pa {when}',
    'player.earlierDiscard': 'Tupa mahali pa awali',
    'player.earlierDiscardLabel': 'Tupa mahali pa awali kwenye kifaa {at} pa {when}',
    'player.deviceGroup': 'Mahali pa urejeshaji kwenye kifaa',
    'player.deviceIntro':
      'Huenda mahali kutoka kivinjari hiki hapakufika kwenye akaunti yako. Kagua au tupa kila mahali kabla ya uhifadhi wa kiotomatiki kuendelea. Kuchagua mojawapo huacha pengine kwa ziara ya baadaye.',
    'player.deviceReview': 'Kagua mahali hapa',
    'player.deviceReviewLabel': 'Kagua mahali pa kifaa {at} pa {when}',
    'player.deviceDiscard': 'Tupa',
    'player.deviceDiscardLabel': 'Tupa mahali pa kifaa {at} pa {when}',
    'player.conflictGroup': 'Chagua mahali pako palipohifadhiwa',
    'player.conflictIntro':
      'Mahali palipohifadhiwa pa akaunti huenda pakatofautiana na pa kichezaji hiki.',
    'player.conflictNone': 'Hakuna mahali palipohifadhiwa.',
    'player.conflictSaved': 'Mahali palipohifadhiwa: {at}.',
    'player.conflictLocal': 'Kichezaji hiki: {at}. Ni papi pabaki?',
    'player.useSaved': 'Tumia mahali palipohifadhiwa',
    'player.keepLocal': 'Bakiza mahali pa kichezaji hiki',
    'player.storeClearFailed':
      'Hifadhi ya kifaa haikuweza kufutwa. Angalia mipangilio ya hifadhi ya kivinjari chako.',
    'player.storeSaveFailed': 'Imeshindikana kuhifadhi mahali pa urejeshaji kwenye kifaa hiki.',
    'player.storeUnavailable': 'Hifadhi ya urejeshaji haipatikani katika kivinjari hiki.',
    'player.storeReadFailed':
      'Imeshindikana kusoma mahali pa awali kwenye kifaa. Angalia mipangilio ya hifadhi ya kivinjari chako.',
    'player.earlierClearFailed':
      'Imeshindikana kufuta mahali pa awali kwenye kifaa. Angalia mipangilio ya hifadhi ya kivinjari chako.',
    'player.unconfirmed':
      'Imeshindikana kuthibitisha mahali pako palipohifadhiwa. Pakia somo upya ili kukagua kabla ya kuendelea kuhifadhi.',
    'player.loadFailed':
      'Imeshindikana kupakia mahali pako palipohifadhiwa. Unaweza kucheza somo hili, lakini uhifadhi haupatikani hadi upakie upya.',
    'player.turnedOff': 'Urejeshaji ulizimwa au kufutwa mahali pengine katika kivinjari hiki.',
    'player.storeCheckFailed': 'Imeshindikana kukagua hifadhi ya urejeshaji katika kivinjari hiki.',
    'player.legacyBusy':
      'Maliza chaguo la sasa la kuhifadhi au urejeshaji kabla ya kukagua mahali pa zamani.',
    'player.legacyWait': 'Subiri rekodi ipakie kabla ya kukagua mahali pa zamani.',
    'player.legacyBeyond':
      'Mahali pa zamani pamepita mwisho wa rekodi hii. Huenda ni pa rekodi nyingine.',
    'player.legacySeekFailed':
      'Imeshindikana kwenda mahali pa zamani. Jaribu tena rekodi ikiwa tayari.',
    'player.earlierRemoveFailed': 'Imeshindikana kuondoa mahali pa awali kwenye kifaa.',
    'player.earlierBusy':
      'Maliza chaguo la sasa la kuhifadhi au urejeshaji kabla ya kukagua mahali pa awali kwenye kifaa.',
    'player.earlierWait': 'Subiri rekodi ipakie kabla ya kukagua mahali pa awali kwenye kifaa.',
    'player.earlierChanged':
      'Mahali pa awali kwenye kifaa pamebadilika. Kagua orodha iliyosasishwa.',
    'player.earlierBeyond':
      'Mahali pa awali kwenye kifaa pamepita mwisho wa rekodi hii. Huenda ni pa rekodi nyingine.',
    'player.earlierSeekFailed': 'Imeshindikana kwenda mahali pa awali kwenye kifaa.',
    'player.earlierReadFailed': 'Imeshindikana kusoma mahali pa awali kwenye kifaa.',
    'player.needConfirmed':
      'Urejeshaji hauwezi kurekodi mahali hadi akaunti yako ithibitishwe. Pakia upya ukiwa umeunganishwa.',
    'player.storeChangeFailed':
      'Hifadhi ya kifaa haikuweza kubadilishwa au kufutwa kabisa. Angalia mipangilio ya hifadhi ya kivinjari chako.',
    'player.deviceRemoveFailed': 'Imeshindikana kuondoa mahali hapa pa urejeshaji kwenye kifaa.',
    'player.deviceChanged': 'Mahali pa kifaa pamebadilika. Kagua orodha iliyosasishwa.',
    'player.othersRemain':
      'Mahali pengine pa urejeshaji kwenye kifaa, kama papo, hubaki panapatikana unapofungua somo hili tena.',
    'player.deviceUseFailed':
      'Imeshindikana kutumia mahali hapa pa kifaa. Jaribu tena baada ya maudhui kupakia.',
    'player.quality': 'Ubora',
    'player.qualityStandard': '480p — wa kawaida',
    'player.qualitySmall': '360p — mdogo',
    'player.qualityAudio': 'Sauti pekee',
    'player.saving': 'Inahifadhi…',
    'player.saveDevice': 'Hifadhi kwenye kifaa hiki',
    'player.onDevice': 'Kwenye kifaa hiki',
    'player.seePlus': 'Tazama Plus inajumuisha nini',
    'player.plusNote': 'Kuhifadhi somo kwenye kifaa ni sehemu ya mpango wa Plus.',
    'player.tryAgain': 'Jaribu tena',
    'player.preparing': 'Inaandaa kichezaji…',
    'player.linksNote':
      'Viungo vya kucheza hudumu kwa muda mfupi na vimefungamana na ufikiaji wako wa somo hili.',
    'player.savedNote':
      'Somo lililohifadhiwa hubaki ndani ya programu, lakini kwa sasa linahitaji muunganisho ili kukagua ufikiaji kila unapolifungua.',
    'player.playFailed': 'Somo hilo halikuweza kuchezwa.',
    'player.saveRefused': 'Somo hili haliwezi kuhifadhiwa kwa mpango huu.',
    'player.fetchFailed': 'Somo hilo halikuweza kuchukuliwa ili kuhifadhiwa.',
    'player.saveFailed': 'Somo hilo halikuweza kuhifadhiwa.',
    'player.noCopy': 'Rekodi hii bado haina nakala inayoweza kuchezwa.',
  },
  af: {
    'player.videoUnsupported': 'Jou blaaier kan nie hierdie video speel nie.',
    'player.audioUnsupported': 'Jou blaaier kan nie hierdie oudio speel nie.',
    'player.openVideo': 'Maak die video direk oop',
    'player.openAudio': 'Maak die oudio direk oop',
    'player.speed': 'Spoed',
    'player.slower': 'Stadiger',
    'player.faster': 'Vinniger',
    'player.loopFrom': 'Herhaal van hier af',
    'player.loopTo': 'Tot hier',
    'player.loopStop': 'Hou op herhaal',
    'player.loopOpenEnd': 'Herhaal van {from} af — merk waar dit eindig.',
    'player.loopOpenStart': 'Herhaal tot by {to} — merk waar dit begin.',
    'player.loopBackwards': 'Daardie gedeelte eindig voordat dit begin. Merk dit weer.',
    'player.loopBoth': 'Herhaal {from} – {to}.',
    'player.resuming': 'Hervat by {at}.',
    'player.checking': 'Kontroleer tans jou gestoorde plek…',
    'player.legacyGroup': 'Vroeëre plek vir die hele les',
    'player.legacyPlace':
      '’n Vroeëre plek wat vir die hele les gestoor is, is {at}. Dit behoort dalk aan ’n ander opname. Jy kan dit hier nagaan; dit sal nie hierdie opname se gestoorde plek vervang sonder jou keuse nie.',
    'player.limit': 'Die speler kan nie verby 24 uur gaan nie.',
    'player.legacyReview': 'Gaan vroeëre plek na',
    'player.notNow': 'Nie nou nie',
    'player.recoveryToggle': 'Hou ’n tydelike herstelplek in hierdie blaaier',
    'player.recoveryNotice':
      'Opsioneel. Enigiemand met toegang tot hierdie blaaierprofiel kan rekening-, inskrywings-, les- en opname-identifiseerders, sessie-identifiseerders, plekke en tydstempels sien, ook dié van ander rekeninge wat dit gebruik. As jy dit afskakel, word herstelplekke vir alle rekeninge in hierdie blaaier verwyder. Jou rekening moet aanlyn bevestig word voordat ’n plek gestoor kan word. Rekords verval ná sewe dae en word met ’n latere besoek uitgevee; berging is dalk nie beskikbaar nie of word dalk vroeër uitgevee.',
    'player.earlierGroup': 'Vroeëre plekke op die toestel vir die hele les',
    'player.earlierIntro':
      'Hierdie ouer plekke op die toestel is vir die hele les gestoor, nie vir ’n spesifieke opname nie. Hulle behoort dalk aan ’n ander opname. Gaan een hier na of gooi dit weg; om dit na te gaan vervang nie die rekening se plek sonder nog ’n keuse van jou nie.',
    'player.earlierReview': 'Gaan vroeëre plek op toestel na',
    'player.earlierReviewLabel': 'Gaan vroeëre plek op toestel na: {at} van {when}',
    'player.earlierDiscard': 'Gooi vroeëre plek weg',
    'player.earlierDiscardLabel': 'Gooi vroeëre plek op toestel weg: {at} van {when}',
    'player.deviceGroup': 'Herstelplekke op die toestel',
    'player.deviceIntro':
      '’n Plek uit hierdie blaaier het dalk nie jou rekening bereik nie. Gaan elke plek na of gooi dit weg voordat outomatiese stoor voortgaan. As jy een kies, bly die ander vir ’n latere besoek.',
    'player.deviceReview': 'Gaan hierdie plek na',
    'player.deviceReviewLabel': 'Gaan toestelplek na: {at} van {when}',
    'player.deviceDiscard': 'Gooi weg',
    'player.deviceDiscardLabel': 'Gooi toestelplek weg: {at} van {when}',
    'player.conflictGroup': 'Kies jou gestoorde plek',
    'player.conflictIntro': 'Die rekening se gestoorde plek verskil dalk van hierdie speler s’n.',
    'player.conflictNone': 'Geen gestoorde plek nie.',
    'player.conflictSaved': 'Gestoorde plek: {at}.',
    'player.conflictLocal': 'Hierdie speler: {at}. Watter een moet gehou word?',
    'player.useSaved': 'Gebruik gestoorde plek',
    'player.keepLocal': 'Hou hierdie speler se plek',
    'player.storeClearFailed':
      'Toestelberging kon nie uitgevee word nie. Kontroleer jou blaaier se bergingsinstellings.',
    'player.storeSaveFailed': 'Kon nie ’n herstelplek op hierdie toestel stoor nie.',
    'player.storeUnavailable': 'Herstelberging is nie in hierdie blaaier beskikbaar nie.',
    'player.storeReadFailed':
      'Kon nie vroeëre plekke op die toestel lees nie. Kontroleer jou blaaier se bergingsinstellings.',
    'player.earlierClearFailed':
      'Kon nie die vroeëre plek op die toestel uitvee nie. Kontroleer jou blaaier se bergingsinstellings.',
    'player.unconfirmed':
      'Kon nie jou gestoorde plek bevestig nie. Herlaai die les om te kontroleer voordat jy verder stoor.',
    'player.loadFailed':
      'Kon nie jou gestoorde plek laai nie. Jy kan hierdie les speel, maar stoor is nie beskikbaar totdat jy herlaai nie.',
    'player.turnedOff': 'Herstel is elders in hierdie blaaier afgeskakel of uitgevee.',
    'player.storeCheckFailed': 'Kon nie herstelberging in hierdie blaaier kontroleer nie.',
    'player.legacyBusy':
      'Handel die huidige stoor- of herstelkeuse af voordat jy die ou plek nagaan.',
    'player.legacyWait': 'Wag dat die opname laai voordat jy die ou plek nagaan.',
    'player.legacyBeyond':
      'Die ou plek is verby die einde van hierdie opname. Dit behoort dalk aan ’n ander opname.',
    'player.legacySeekFailed':
      'Kon nie na die ou plek gaan nie. Probeer weer wanneer die opname gereed is.',
    'player.earlierRemoveFailed': 'Kon nie die vroeëre plek op die toestel verwyder nie.',
    'player.earlierBusy':
      'Handel die huidige stoor- of herstelkeuse af voordat jy ’n vroeëre plek op die toestel nagaan.',
    'player.earlierWait':
      'Wag dat die opname laai voordat jy die vroeëre plek op die toestel nagaan.',
    'player.earlierChanged':
      'Die vroeëre plek op die toestel het verander. Gaan die bygewerkte lys na.',
    'player.earlierBeyond':
      'Die vroeëre plek op die toestel is verby die einde van hierdie opname. Dit behoort dalk aan ’n ander opname.',
    'player.earlierSeekFailed': 'Kon nie na die vroeëre plek op die toestel gaan nie.',
    'player.earlierReadFailed': 'Kon nie die vroeëre plek op die toestel lees nie.',
    'player.needConfirmed':
      'Herstel kan nie ’n plek aanteken voordat jou rekening bevestig is nie. Herlaai wanneer jy gekoppel is.',
    'player.storeChangeFailed':
      'Toestelberging kon nie verander of heeltemal uitgevee word nie. Kontroleer jou blaaier se bergingsinstellings.',
    'player.deviceRemoveFailed': 'Kon nie hierdie herstelplek van die toestel verwyder nie.',
    'player.deviceChanged': 'Die toestelplek het verander. Gaan die bygewerkte lys na.',
    'player.othersRemain':
      'Ander herstelplekke op die toestel, as daar is, bly beskikbaar wanneer jy hierdie les weer oopmaak.',
    'player.deviceUseFailed':
      'Kon nie hierdie toestelplek gebruik nie. Probeer weer nadat die media gelaai het.',
    'player.quality': 'Gehalte',
    'player.qualityStandard': '480p — standaard',
    'player.qualitySmall': '360p — klein',
    'player.qualityAudio': 'Slegs oudio',
    'player.saving': 'Stoor tans…',
    'player.saveDevice': 'Stoor op hierdie toestel',
    'player.onDevice': 'Op hierdie toestel',
    'player.seePlus': 'Kyk wat Plus insluit',
    'player.plusNote': 'Om ’n les op ’n toestel te stoor is deel van die Plus-plan.',
    'player.tryAgain': 'Probeer weer',
    'player.preparing': 'Berei die speler voor…',
    'player.linksNote':
      'Speelskakels is van korte duur en is gekoppel aan jou toegang tot hierdie les.',
    'player.savedNote':
      '’n Gestoorde les bly binne die toepassing, maar het tans ’n verbinding nodig om toegang te kontroleer elke keer wanneer jy dit oopmaak.',
    'player.playFailed': 'Daardie les kon nie gespeel word nie.',
    'player.saveRefused': 'Hierdie les kan nie met hierdie plan gestoor word nie.',
    'player.fetchFailed': 'Daardie les kon nie gehaal word om te stoor nie.',
    'player.saveFailed': 'Daardie les kon nie gestoor word nie.',
    'player.noCopy': 'Hierdie opname het nog nie ’n kopie wat gespeel kan word nie.',
  },
  'zh-hans': {
    'player.videoUnsupported': '您的浏览器无法播放此视频。',
    'player.audioUnsupported': '您的浏览器无法播放此音频。',
    'player.openVideo': '直接打开视频',
    'player.openAudio': '直接打开音频',
    'player.speed': '速度',
    'player.slower': '慢一些',
    'player.faster': '快一些',
    'player.loopFrom': '从这里开始重复',
    'player.loopTo': '到这里为止',
    'player.loopStop': '停止重复',
    'player.loopOpenEnd': '正在从 {from} 开始重复——请标记结束的位置。',
    'player.loopOpenStart': '正在重复到 {to} 为止——请标记开始的位置。',
    'player.loopBackwards': '这一段的结束位置早于开始位置。请重新标记。',
    'player.loopBoth': '正在重复 {from} – {to}。',
    'player.resuming': '正在从 {at} 继续播放。',
    'player.checking': '正在检查您保存的位置…',
    'player.legacyGroup': '较早保存的整节课位置',
    'player.legacyPlace': '有一个较早为整节课保存的位置：{at}。它可能属于另一段录制内容。您可以在这里查看；未经您选择，它不会取代这段录制内容已保存的位置。',
    'player.limit': '播放器无法超过 24 小时。',
    'player.legacyReview': '查看较早的位置',
    'player.notNow': '暂不',
    'player.recoveryToggle': '在此浏览器上保留一个临时恢复位置',
    'player.recoveryNotice':
      '可选。任何能够访问此浏览器配置文件的人都可能看到账户、报名、课程和录制内容的标识符、会话标识符、位置和时间戳，包括使用此浏览器的其他账户的这些信息。关闭此选项会移除此浏览器上所有账户的恢复位置。必须先在线确认您的账户，才能存储位置。记录在七天后过期，并在之后的访问中清除；存储可能不可用，也可能更早被清除。',
    'player.earlierGroup': '设备上较早保存的整节课位置',
    'player.earlierIntro':
      '设备上这些较旧的位置是为整节课保存的，而不是为某一段录制内容保存的。它们可能属于另一段录制内容。请在这里查看其中一个，或将其舍弃；查看并不会取代账户中的位置，除非您再作一次选择。',
    'player.earlierReview': '查看设备上较早的位置',
    'player.earlierReviewLabel': '查看设备上较早的位置 {at}，保存于 {when}',
    'player.earlierDiscard': '舍弃较早的位置',
    'player.earlierDiscardLabel': '舍弃设备上较早的位置 {at}，保存于 {when}',
    'player.deviceGroup': '设备上的恢复位置',
    'player.deviceIntro': '此浏览器中的某个位置可能没有传到您的账户。请先查看或舍弃每个位置，自动保存才会继续。选择其中一个后，其余位置会留到以后访问时处理。',
    'player.deviceReview': '查看此位置',
    'player.deviceReviewLabel': '查看设备位置 {at}，保存于 {when}',
    'player.deviceDiscard': '舍弃',
    'player.deviceDiscardLabel': '舍弃设备位置 {at}，保存于 {when}',
    'player.conflictGroup': '选择您保存的位置',
    'player.conflictIntro': '账户中保存的位置可能与此播放器不同。',
    'player.conflictNone': '没有保存的位置。',
    'player.conflictSaved': '保存的位置：{at}。',
    'player.conflictLocal': '此播放器：{at}。应保留哪一个？',
    'player.useSaved': '使用保存的位置',
    'player.keepLocal': '保留此播放器的位置',
    'player.storeClearFailed': '无法清除设备存储。请检查浏览器的存储设置。',
    'player.storeSaveFailed': '无法在此设备上保存恢复位置。',
    'player.storeUnavailable': '此浏览器中无法使用恢复存储。',
    'player.storeReadFailed': '无法读取设备上较早的位置。请检查浏览器的存储设置。',
    'player.earlierClearFailed': '无法清除设备上较早的位置。请检查浏览器的存储设置。',
    'player.unconfirmed': '无法确认您保存的位置。请重新加载课程进行检查，然后再继续保存。',
    'player.loadFailed': '无法加载您保存的位置。您可以播放这节课，但在重新加载之前无法保存。',
    'player.turnedOff': '恢复功能已在此浏览器的其他地方被关闭或清除。',
    'player.storeCheckFailed': '无法检查此浏览器中的恢复存储。',
    'player.legacyBusy': '请先完成当前的保存或恢复选择，再查看旧位置。',
    'player.legacyWait': '请等录制内容加载完成后，再查看旧位置。',
    'player.legacyBeyond': '旧位置超出了这段录制内容的结尾。它可能属于另一段录制内容。',
    'player.legacySeekFailed': '无法跳转到旧位置。请在录制内容就绪后重试。',
    'player.earlierRemoveFailed': '无法移除设备上较早的位置。',
    'player.earlierBusy': '请先完成当前的保存或恢复选择，再查看设备上较早的位置。',
    'player.earlierWait': '请等录制内容加载完成后，再查看设备上较早的位置。',
    'player.earlierChanged': '设备上较早的位置已更改。请查看更新后的列表。',
    'player.earlierBeyond': '设备上较早的位置超出了这段录制内容的结尾。它可能属于另一段录制内容。',
    'player.earlierSeekFailed': '无法跳转到设备上较早的位置。',
    'player.earlierReadFailed': '无法读取设备上较早的位置。',
    'player.needConfirmed': '在您的账户得到确认之前，恢复功能无法记录位置。请在联网后重新加载。',
    'player.storeChangeFailed': '无法更改或完全清除设备存储。请检查浏览器的存储设置。',
    'player.deviceRemoveFailed': '无法从设备上移除此恢复位置。',
    'player.deviceChanged': '设备位置已更改。请查看更新后的列表。',
    'player.othersRemain': '设备上的其他恢复位置（如果有）会在您重新打开这节课时仍然可用。',
    'player.deviceUseFailed': '无法使用此设备位置。请在媒体加载后重试。',
    'player.quality': '画质',
    'player.qualityStandard': '480p — 标清',
    'player.qualitySmall': '360p — 小',
    'player.qualityAudio': '仅音频',
    'player.saving': '正在保存…',
    'player.saveDevice': '保存到此设备',
    'player.onDevice': '已在此设备上',
    'player.seePlus': '查看 Plus 包含的内容',
    'player.plusNote': '将课程保存到设备属于 Plus 方案的内容。',
    'player.tryAgain': '重试',
    'player.preparing': '正在准备播放器…',
    'player.linksNote': '播放链接的有效期很短，并与您对这节课的访问权限绑定。',
    'player.savedNote': '已保存的课程留在应用内，但目前每次打开时都需要联网检查访问权限。',
    'player.playFailed': '无法播放该课程。',
    'player.saveRefused': '此方案无法保存这节课。',
    'player.fetchFailed': '无法获取该课程以进行保存。',
    'player.saveFailed': '无法保存该课程。',
    'player.noCopy': '这段录制内容还没有可以播放的副本。',
  },
  'zh-hant': {
    'player.videoUnsupported': '您的瀏覽器無法播放此影片。',
    'player.audioUnsupported': '您的瀏覽器無法播放此音訊。',
    'player.openVideo': '直接開啟影片',
    'player.openAudio': '直接開啟音訊',
    'player.speed': '速度',
    'player.slower': '慢一些',
    'player.faster': '快一些',
    'player.loopFrom': '從這裡開始重複',
    'player.loopTo': '到這裡為止',
    'player.loopStop': '停止重複',
    'player.loopOpenEnd': '正在從 {from} 開始重複——請標記結束的位置。',
    'player.loopOpenStart': '正在重複到 {to} 為止——請標記開始的位置。',
    'player.loopBackwards': '這一段的結束位置早於開始位置。請重新標記。',
    'player.loopBoth': '正在重複 {from} – {to}。',
    'player.resuming': '正在從 {at} 繼續播放。',
    'player.checking': '正在檢查您儲存的位置…',
    'player.legacyGroup': '較早儲存的整堂課位置',
    'player.legacyPlace': '有一個較早為整堂課儲存的位置：{at}。它可能屬於另一段錄製內容。您可以在這裡檢視；未經您選擇，它不會取代這段錄製內容已儲存的位置。',
    'player.limit': '播放器無法超過 24 小時。',
    'player.legacyReview': '檢視較早的位置',
    'player.notNow': '暫不',
    'player.recoveryToggle': '在此瀏覽器上保留一個暫時的復原位置',
    'player.recoveryNotice':
      '選用。任何能夠存取此瀏覽器設定檔的人都可能看到帳戶、報名、課程和錄製內容的識別碼、工作階段識別碼、位置和時間戳記，包括使用此瀏覽器的其他帳戶的這些資訊。關閉此選項會移除此瀏覽器上所有帳戶的復原位置。必須先在線上確認您的帳戶，才能儲存位置。記錄在七天後到期，並在之後的造訪中清除；儲存空間可能無法使用，也可能更早被清除。',
    'player.earlierGroup': '裝置上較早儲存的整堂課位置',
    'player.earlierIntro':
      '裝置上這些較舊的位置是為整堂課儲存的，而不是為某一段錄製內容儲存的。它們可能屬於另一段錄製內容。請在這裡檢視其中一個，或將其捨棄；檢視並不會取代帳戶中的位置，除非您再作一次選擇。',
    'player.earlierReview': '檢視裝置上較早的位置',
    'player.earlierReviewLabel': '檢視裝置上較早的位置 {at}，儲存於 {when}',
    'player.earlierDiscard': '捨棄較早的位置',
    'player.earlierDiscardLabel': '捨棄裝置上較早的位置 {at}，儲存於 {when}',
    'player.deviceGroup': '裝置上的復原位置',
    'player.deviceIntro': '此瀏覽器中的某個位置可能沒有傳到您的帳戶。請先檢視或捨棄每個位置，自動儲存才會繼續。選擇其中一個後，其餘位置會留到以後造訪時處理。',
    'player.deviceReview': '檢視此位置',
    'player.deviceReviewLabel': '檢視裝置位置 {at}，儲存於 {when}',
    'player.deviceDiscard': '捨棄',
    'player.deviceDiscardLabel': '捨棄裝置位置 {at}，儲存於 {when}',
    'player.conflictGroup': '選擇您儲存的位置',
    'player.conflictIntro': '帳戶中儲存的位置可能與此播放器不同。',
    'player.conflictNone': '沒有儲存的位置。',
    'player.conflictSaved': '儲存的位置：{at}。',
    'player.conflictLocal': '此播放器：{at}。應保留哪一個？',
    'player.useSaved': '使用儲存的位置',
    'player.keepLocal': '保留此播放器的位置',
    'player.storeClearFailed': '無法清除裝置儲存空間。請檢查瀏覽器的儲存設定。',
    'player.storeSaveFailed': '無法在此裝置上儲存復原位置。',
    'player.storeUnavailable': '此瀏覽器中無法使用復原儲存空間。',
    'player.storeReadFailed': '無法讀取裝置上較早的位置。請檢查瀏覽器的儲存設定。',
    'player.earlierClearFailed': '無法清除裝置上較早的位置。請檢查瀏覽器的儲存設定。',
    'player.unconfirmed': '無法確認您儲存的位置。請重新載入課程進行檢查，然後再繼續儲存。',
    'player.loadFailed': '無法載入您儲存的位置。您可以播放這堂課，但在重新載入之前無法儲存。',
    'player.turnedOff': '復原功能已在此瀏覽器的其他地方被關閉或清除。',
    'player.storeCheckFailed': '無法檢查此瀏覽器中的復原儲存空間。',
    'player.legacyBusy': '請先完成目前的儲存或復原選擇，再檢視舊位置。',
    'player.legacyWait': '請等錄製內容載入完成後，再檢視舊位置。',
    'player.legacyBeyond': '舊位置超出了這段錄製內容的結尾。它可能屬於另一段錄製內容。',
    'player.legacySeekFailed': '無法跳至舊位置。請在錄製內容就緒後重試。',
    'player.earlierRemoveFailed': '無法移除裝置上較早的位置。',
    'player.earlierBusy': '請先完成目前的儲存或復原選擇，再檢視裝置上較早的位置。',
    'player.earlierWait': '請等錄製內容載入完成後，再檢視裝置上較早的位置。',
    'player.earlierChanged': '裝置上較早的位置已變更。請檢視更新後的清單。',
    'player.earlierBeyond': '裝置上較早的位置超出了這段錄製內容的結尾。它可能屬於另一段錄製內容。',
    'player.earlierSeekFailed': '無法跳至裝置上較早的位置。',
    'player.earlierReadFailed': '無法讀取裝置上較早的位置。',
    'player.needConfirmed': '在您的帳戶獲得確認之前，復原功能無法記錄位置。請在連線後重新載入。',
    'player.storeChangeFailed': '無法變更或完全清除裝置儲存空間。請檢查瀏覽器的儲存設定。',
    'player.deviceRemoveFailed': '無法從裝置上移除此復原位置。',
    'player.deviceChanged': '裝置位置已變更。請檢視更新後的清單。',
    'player.othersRemain': '裝置上的其他復原位置（如果有）會在您重新開啟這堂課時仍然可用。',
    'player.deviceUseFailed': '無法使用此裝置位置。請在媒體載入後重試。',
    'player.quality': '畫質',
    'player.qualityStandard': '480p — 標準',
    'player.qualitySmall': '360p — 小',
    'player.qualityAudio': '僅音訊',
    'player.saving': '正在儲存…',
    'player.saveDevice': '儲存到此裝置',
    'player.onDevice': '已在此裝置上',
    'player.seePlus': '查看 Plus 包含的內容',
    'player.plusNote': '將課程儲存到裝置屬於 Plus 方案的內容。',
    'player.tryAgain': '重試',
    'player.preparing': '正在準備播放器…',
    'player.linksNote': '播放連結的有效期很短，並與您對這堂課的存取權限綁定。',
    'player.savedNote': '已儲存的課程留在應用程式內，但目前每次開啟時都需要連線檢查存取權限。',
    'player.playFailed': '無法播放該課程。',
    'player.saveRefused': '此方案無法儲存這堂課。',
    'player.fetchFailed': '無法取得該課程以進行儲存。',
    'player.saveFailed': '無法儲存該課程。',
    'player.noCopy': '這段錄製內容還沒有可以播放的副本。',
  },
  vi: {
    'player.videoUnsupported': 'Trình duyệt của bạn không phát được video này.',
    'player.audioUnsupported': 'Trình duyệt của bạn không phát được âm thanh này.',
    'player.openVideo': 'Mở trực tiếp video',
    'player.openAudio': 'Mở trực tiếp âm thanh',
    'player.speed': 'Tốc độ',
    'player.slower': 'Chậm hơn',
    'player.faster': 'Nhanh hơn',
    'player.loopFrom': 'Lặp lại từ đây',
    'player.loopTo': 'Đến đây',
    'player.loopStop': 'Dừng lặp lại',
    'player.loopOpenEnd': 'Đang lặp lại từ {from} — hãy đánh dấu chỗ kết thúc.',
    'player.loopOpenStart': 'Đang lặp lại đến {to} — hãy đánh dấu chỗ bắt đầu.',
    'player.loopBackwards': 'Đoạn đó kết thúc trước khi bắt đầu. Hãy đánh dấu lại.',
    'player.loopBoth': 'Đang lặp lại {from} – {to}.',
    'player.resuming': 'Đang tiếp tục từ {at}.',
    'player.checking': 'Đang kiểm tra vị trí đã lưu của bạn…',
    'player.legacyGroup': 'Vị trí cũ lưu cho cả bài học',
    'player.legacyPlace':
      'Có một vị trí cũ được lưu cho cả bài học là {at}. Vị trí này có thể thuộc về một bản ghi khác. Bạn có thể xem lại nó ở đây; nó sẽ không thay thế vị trí đã lưu của bản ghi này nếu bạn không chọn.',
    'player.limit': 'Trình phát không thể vượt quá 24 giờ.',
    'player.legacyReview': 'Xem lại vị trí cũ',
    'player.notNow': 'Để sau',
    'player.recoveryToggle': 'Giữ một vị trí khôi phục tạm thời trên trình duyệt này',
    'player.recoveryNotice':
      'Tùy chọn. Bất kỳ ai truy cập được vào hồ sơ trình duyệt này đều có thể thấy mã định danh của tài khoản, lượt ghi danh, bài học và bản ghi, mã định danh phiên, các vị trí và dấu thời gian, kể cả của những tài khoản khác dùng trình duyệt này. Tắt tùy chọn này sẽ xóa vị trí khôi phục của mọi tài khoản trên trình duyệt này. Tài khoản của bạn phải được xác nhận trực tuyến trước khi một vị trí có thể được lưu trữ. Dữ liệu đã lưu hết hạn sau bảy ngày và được xóa trong một lần truy cập sau; bộ nhớ có thể không khả dụng hoặc bị xóa sớm hơn.',
    'player.earlierGroup': 'Các vị trí cũ trên thiết bị lưu cho cả bài học',
    'player.earlierIntro':
      'Những vị trí cũ này trên thiết bị được lưu cho cả bài học, không phải cho một bản ghi cụ thể. Chúng có thể thuộc về một bản ghi khác. Hãy xem lại một vị trí ở đây hoặc bỏ đi; việc xem lại không thay thế vị trí trong tài khoản nếu bạn không chọn thêm lần nữa.',
    'player.earlierReview': 'Xem lại vị trí cũ trên thiết bị',
    'player.earlierReviewLabel': 'Xem lại vị trí cũ trên thiết bị {at}, lưu lúc {when}',
    'player.earlierDiscard': 'Bỏ vị trí cũ',
    'player.earlierDiscardLabel': 'Bỏ vị trí cũ trên thiết bị {at}, lưu lúc {when}',
    'player.deviceGroup': 'Các vị trí khôi phục trên thiết bị',
    'player.deviceIntro':
      'Một vị trí từ trình duyệt này có thể chưa đến được tài khoản của bạn. Hãy xem lại hoặc bỏ từng vị trí trước khi việc lưu tự động tiếp tục. Chọn một vị trí thì các vị trí khác được để lại cho lần truy cập sau.',
    'player.deviceReview': 'Xem lại vị trí này',
    'player.deviceReviewLabel': 'Xem lại vị trí trên thiết bị {at}, lưu lúc {when}',
    'player.deviceDiscard': 'Bỏ',
    'player.deviceDiscardLabel': 'Bỏ vị trí trên thiết bị {at}, lưu lúc {when}',
    'player.conflictGroup': 'Chọn vị trí đã lưu của bạn',
    'player.conflictIntro': 'Vị trí đã lưu trong tài khoản có thể khác với trình phát này.',
    'player.conflictNone': 'Không có vị trí đã lưu.',
    'player.conflictSaved': 'Vị trí đã lưu: {at}.',
    'player.conflictLocal': 'Trình phát này: {at}. Nên giữ vị trí nào?',
    'player.useSaved': 'Dùng vị trí đã lưu',
    'player.keepLocal': 'Giữ vị trí của trình phát này',
    'player.storeClearFailed':
      'Không thể xóa bộ nhớ của thiết bị. Hãy kiểm tra cài đặt bộ nhớ của trình duyệt.',
    'player.storeSaveFailed': 'Không thể lưu vị trí khôi phục trên thiết bị này.',
    'player.storeUnavailable': 'Bộ nhớ khôi phục không khả dụng trong trình duyệt này.',
    'player.storeReadFailed':
      'Không thể đọc các vị trí cũ trên thiết bị. Hãy kiểm tra cài đặt bộ nhớ của trình duyệt.',
    'player.earlierClearFailed':
      'Không thể xóa vị trí cũ trên thiết bị. Hãy kiểm tra cài đặt bộ nhớ của trình duyệt.',
    'player.unconfirmed':
      'Không thể xác nhận vị trí đã lưu của bạn. Hãy tải lại bài học để kiểm tra trước khi tiếp tục lưu.',
    'player.loadFailed':
      'Không thể tải vị trí đã lưu của bạn. Bạn có thể phát bài học này, nhưng việc lưu sẽ không khả dụng cho đến khi bạn tải lại.',
    'player.turnedOff':
      'Tính năng khôi phục đã bị tắt hoặc bị xóa ở nơi khác trong trình duyệt này.',
    'player.storeCheckFailed': 'Không thể kiểm tra bộ nhớ khôi phục trong trình duyệt này.',
    'player.legacyBusy':
      'Hãy hoàn tất lựa chọn lưu hoặc khôi phục hiện tại trước khi xem lại vị trí cũ.',
    'player.legacyWait': 'Hãy chờ bản ghi tải xong trước khi xem lại vị trí cũ.',
    'player.legacyBeyond':
      'Vị trí cũ nằm ngoài phần cuối của bản ghi này. Nó có thể thuộc về một bản ghi khác.',
    'player.legacySeekFailed':
      'Không thể chuyển đến vị trí cũ. Hãy thử lại khi bản ghi đã sẵn sàng.',
    'player.earlierRemoveFailed': 'Không thể gỡ vị trí cũ trên thiết bị.',
    'player.earlierBusy':
      'Hãy hoàn tất lựa chọn lưu hoặc khôi phục hiện tại trước khi xem lại một vị trí cũ trên thiết bị.',
    'player.earlierWait': 'Hãy chờ bản ghi tải xong trước khi xem lại vị trí cũ trên thiết bị.',
    'player.earlierChanged':
      'Vị trí cũ trên thiết bị đã thay đổi. Hãy xem lại danh sách đã cập nhật.',
    'player.earlierBeyond':
      'Vị trí cũ trên thiết bị nằm ngoài phần cuối của bản ghi này. Nó có thể thuộc về một bản ghi khác.',
    'player.earlierSeekFailed': 'Không thể chuyển đến vị trí cũ trên thiết bị.',
    'player.earlierReadFailed': 'Không thể đọc vị trí cũ trên thiết bị.',
    'player.needConfirmed':
      'Tính năng khôi phục không thể ghi lại vị trí cho đến khi tài khoản của bạn được xác nhận. Hãy tải lại khi có kết nối.',
    'player.storeChangeFailed':
      'Không thể thay đổi hoặc xóa hoàn toàn bộ nhớ của thiết bị. Hãy kiểm tra cài đặt bộ nhớ của trình duyệt.',
    'player.deviceRemoveFailed': 'Không thể gỡ vị trí khôi phục này khỏi thiết bị.',
    'player.deviceChanged': 'Vị trí trên thiết bị đã thay đổi. Hãy xem lại danh sách đã cập nhật.',
    'player.othersRemain':
      'Các vị trí khôi phục khác trên thiết bị, nếu có, vẫn khả dụng khi bạn mở lại bài học này.',
    'player.deviceUseFailed':
      'Không thể dùng vị trí này trên thiết bị. Hãy thử lại sau khi nội dung tải xong.',
    'player.quality': 'Chất lượng',
    'player.qualityStandard': '480p — tiêu chuẩn',
    'player.qualitySmall': '360p — nhỏ',
    'player.qualityAudio': 'Chỉ âm thanh',
    'player.saving': 'Đang lưu…',
    'player.saveDevice': 'Lưu trên thiết bị này',
    'player.onDevice': 'Đã có trên thiết bị này',
    'player.seePlus': 'Xem Plus gồm những gì',
    'player.plusNote': 'Lưu bài học trên thiết bị là một phần của gói Plus.',
    'player.tryAgain': 'Thử lại',
    'player.preparing': 'Đang chuẩn bị trình phát…',
    'player.linksNote':
      'Liên kết phát chỉ có hiệu lực trong thời gian ngắn và gắn với quyền truy cập của bạn vào bài học này.',
    'player.savedNote':
      'Bài học đã lưu nằm trong ứng dụng, nhưng hiện cần có kết nối để kiểm tra quyền truy cập mỗi lần bạn mở.',
    'player.playFailed': 'Không thể phát bài học đó.',
    'player.saveRefused': 'Không thể lưu bài học này với gói này.',
    'player.fetchFailed': 'Không thể lấy bài học đó để lưu.',
    'player.saveFailed': 'Không thể lưu bài học đó.',
    'player.noCopy': 'Bản ghi này chưa có bản sao nào phát được.',
  },
  th: {
    'player.videoUnsupported': 'เบราว์เซอร์ของคุณเล่นวิดีโอนี้ไม่ได้',
    'player.audioUnsupported': 'เบราว์เซอร์ของคุณเล่นเสียงนี้ไม่ได้',
    'player.openVideo': 'เปิดวิดีโอโดยตรง',
    'player.openAudio': 'เปิดเสียงโดยตรง',
    'player.speed': 'ความเร็ว',
    'player.slower': 'ช้าลง',
    'player.faster': 'เร็วขึ้น',
    'player.loopFrom': 'เล่นซ้ำจากตรงนี้',
    'player.loopTo': 'ถึงตรงนี้',
    'player.loopStop': 'หยุดเล่นซ้ำ',
    'player.loopOpenEnd': 'กำลังเล่นซ้ำจาก {from} — โปรดทำเครื่องหมายจุดสิ้นสุด',
    'player.loopOpenStart': 'กำลังเล่นซ้ำจนถึง {to} — โปรดทำเครื่องหมายจุดเริ่มต้น',
    'player.loopBackwards': 'ช่วงนั้นสิ้นสุดก่อนที่จะเริ่ม โปรดทำเครื่องหมายใหม่',
    'player.loopBoth': 'กำลังเล่นซ้ำ {from} – {to}',
    'player.resuming': 'กำลังเล่นต่อจาก {at}',
    'player.checking': 'กำลังตรวจสอบตำแหน่งที่บันทึกไว้ของคุณ…',
    'player.legacyGroup': 'ตำแหน่งเดิมที่บันทึกไว้สำหรับทั้งบทเรียน',
    'player.legacyPlace':
      'มีตำแหน่งเดิมที่บันทึกไว้สำหรับทั้งบทเรียนอยู่ที่ {at} ตำแหน่งนี้อาจเป็นของสื่อบันทึกอื่น คุณตรวจดูได้ที่นี่ และจะไม่แทนที่ตำแหน่งที่บันทึกไว้ของสื่อบันทึกนี้หากคุณไม่ได้เลือก',
    'player.limit': 'ตัวเล่นไปเกิน 24 ชั่วโมงไม่ได้',
    'player.legacyReview': 'ตรวจดูตำแหน่งเดิม',
    'player.notNow': 'ไว้ก่อน',
    'player.recoveryToggle': 'เก็บตำแหน่งกู้คืนชั่วคราวไว้ในเบราว์เซอร์นี้',
    'player.recoveryNotice':
      'ไม่บังคับ ผู้ใดก็ตามที่เข้าถึงโปรไฟล์เบราว์เซอร์นี้ได้อาจเห็นตัวระบุของบัญชี การลงทะเบียนเรียน บทเรียน และสื่อบันทึก ตัวระบุเซสชัน ตำแหน่ง และเวลาที่บันทึก รวมถึงของบัญชีอื่นที่ใช้เบราว์เซอร์นี้ด้วย การปิดตัวเลือกนี้จะลบตำแหน่งกู้คืนของทุกบัญชีในเบราว์เซอร์นี้ บัญชีของคุณต้องได้รับการยืนยันทางออนไลน์ก่อนจึงจะจัดเก็บตำแหน่งได้ ข้อมูลจะหมดอายุหลังเจ็ดวันและถูกล้างเมื่อเข้ามาครั้งถัดไป พื้นที่จัดเก็บอาจใช้งานไม่ได้หรือถูกล้างก่อนหน้านั้น',
    'player.earlierGroup': 'ตำแหน่งเดิมในอุปกรณ์ที่บันทึกไว้สำหรับทั้งบทเรียน',
    'player.earlierIntro':
      'ตำแหน่งเก่าในอุปกรณ์เหล่านี้บันทึกไว้สำหรับทั้งบทเรียน ไม่ใช่สำหรับสื่อบันทึกรายการใดรายการหนึ่ง จึงอาจเป็นของสื่อบันทึกอื่น ตรวจดูรายการหนึ่งที่นี่หรือทิ้งไป การตรวจดูจะไม่แทนที่ตำแหน่งของบัญชีหากคุณไม่ได้เลือกอีกครั้ง',
    'player.earlierReview': 'ตรวจดูตำแหน่งเดิมในอุปกรณ์',
    'player.earlierReviewLabel': 'ตรวจดูตำแหน่งเดิมในอุปกรณ์ {at} เมื่อ {when}',
    'player.earlierDiscard': 'ทิ้งตำแหน่งเดิม',
    'player.earlierDiscardLabel': 'ทิ้งตำแหน่งเดิมในอุปกรณ์ {at} เมื่อ {when}',
    'player.deviceGroup': 'ตำแหน่งกู้คืนในอุปกรณ์',
    'player.deviceIntro':
      'ตำแหน่งหนึ่งจากเบราว์เซอร์นี้อาจยังไปไม่ถึงบัญชีของคุณ โปรดตรวจดูหรือทิ้งแต่ละตำแหน่งก่อนที่การบันทึกอัตโนมัติจะทำงานต่อ เมื่อเลือกตำแหน่งหนึ่ง ตำแหน่งอื่นจะเก็บไว้สำหรับการเข้ามาครั้งถัดไป',
    'player.deviceReview': 'ตรวจดูตำแหน่งนี้',
    'player.deviceReviewLabel': 'ตรวจดูตำแหน่งในอุปกรณ์ {at} เมื่อ {when}',
    'player.deviceDiscard': 'ทิ้ง',
    'player.deviceDiscardLabel': 'ทิ้งตำแหน่งในอุปกรณ์ {at} เมื่อ {when}',
    'player.conflictGroup': 'เลือกตำแหน่งที่บันทึกไว้ของคุณ',
    'player.conflictIntro': 'ตำแหน่งที่บันทึกไว้ในบัญชีอาจต่างจากตัวเล่นนี้',
    'player.conflictNone': 'ไม่มีตำแหน่งที่บันทึกไว้',
    'player.conflictSaved': 'ตำแหน่งที่บันทึกไว้: {at}',
    'player.conflictLocal': 'ตัวเล่นนี้: {at} ควรเก็บตำแหน่งใดไว้',
    'player.useSaved': 'ใช้ตำแหน่งที่บันทึกไว้',
    'player.keepLocal': 'เก็บตำแหน่งของตัวเล่นนี้',
    'player.storeClearFailed':
      'ล้างพื้นที่จัดเก็บของอุปกรณ์ไม่ได้ โปรดตรวจสอบการตั้งค่าพื้นที่จัดเก็บของเบราว์เซอร์',
    'player.storeSaveFailed': 'บันทึกตำแหน่งกู้คืนในอุปกรณ์นี้ไม่ได้',
    'player.storeUnavailable': 'พื้นที่จัดเก็บสำหรับการกู้คืนใช้งานไม่ได้ในเบราว์เซอร์นี้',
    'player.storeReadFailed':
      'อ่านตำแหน่งเดิมในอุปกรณ์ไม่ได้ โปรดตรวจสอบการตั้งค่าพื้นที่จัดเก็บของเบราว์เซอร์',
    'player.earlierClearFailed':
      'ล้างตำแหน่งเดิมในอุปกรณ์ไม่ได้ โปรดตรวจสอบการตั้งค่าพื้นที่จัดเก็บของเบราว์เซอร์',
    'player.unconfirmed':
      'ยืนยันตำแหน่งที่บันทึกไว้ของคุณไม่ได้ โปรดโหลดบทเรียนใหม่เพื่อตรวจสอบก่อนบันทึกต่อ',
    'player.loadFailed':
      'โหลดตำแหน่งที่บันทึกไว้ของคุณไม่ได้ คุณเล่นบทเรียนนี้ได้ แต่จะบันทึกไม่ได้จนกว่าจะโหลดใหม่',
    'player.turnedOff': 'การกู้คืนถูกปิดหรือถูกล้างจากที่อื่นในเบราว์เซอร์นี้',
    'player.storeCheckFailed': 'ตรวจสอบพื้นที่จัดเก็บสำหรับการกู้คืนในเบราว์เซอร์นี้ไม่ได้',
    'player.legacyBusy': 'โปรดเลือกการบันทึกหรือการกู้คืนที่ค้างอยู่ให้เสร็จก่อนตรวจดูตำแหน่งเก่า',
    'player.legacyWait': 'โปรดรอให้สื่อบันทึกโหลดเสร็จก่อนตรวจดูตำแหน่งเก่า',
    'player.legacyBeyond':
      'ตำแหน่งเก่าอยู่เลยจุดสิ้นสุดของสื่อบันทึกนี้ จึงอาจเป็นของสื่อบันทึกอื่น',
    'player.legacySeekFailed': 'ไปยังตำแหน่งเก่าไม่ได้ โปรดลองอีกครั้งเมื่อสื่อบันทึกพร้อม',
    'player.earlierRemoveFailed': 'นำตำแหน่งเดิมในอุปกรณ์ออกไม่ได้',
    'player.earlierBusy':
      'โปรดเลือกการบันทึกหรือการกู้คืนที่ค้างอยู่ให้เสร็จก่อนตรวจดูตำแหน่งเดิมในอุปกรณ์',
    'player.earlierWait': 'โปรดรอให้สื่อบันทึกโหลดเสร็จก่อนตรวจดูตำแหน่งเดิมในอุปกรณ์',
    'player.earlierChanged': 'ตำแหน่งเดิมในอุปกรณ์เปลี่ยนไปแล้ว โปรดตรวจดูรายการที่อัปเดต',
    'player.earlierBeyond':
      'ตำแหน่งเดิมในอุปกรณ์อยู่เลยจุดสิ้นสุดของสื่อบันทึกนี้ จึงอาจเป็นของสื่อบันทึกอื่น',
    'player.earlierSeekFailed': 'ไปยังตำแหน่งเดิมในอุปกรณ์ไม่ได้',
    'player.earlierReadFailed': 'อ่านตำแหน่งเดิมในอุปกรณ์ไม่ได้',
    'player.needConfirmed':
      'การกู้คืนจดตำแหน่งไม่ได้จนกว่าบัญชีของคุณจะได้รับการยืนยัน โปรดโหลดใหม่เมื่อเชื่อมต่อแล้ว',
    'player.storeChangeFailed':
      'เปลี่ยนหรือล้างพื้นที่จัดเก็บของอุปกรณ์ทั้งหมดไม่ได้ โปรดตรวจสอบการตั้งค่าพื้นที่จัดเก็บของเบราว์เซอร์',
    'player.deviceRemoveFailed': 'นำตำแหน่งกู้คืนนี้ออกจากอุปกรณ์ไม่ได้',
    'player.deviceChanged': 'ตำแหน่งในอุปกรณ์เปลี่ยนไปแล้ว โปรดตรวจดูรายการที่อัปเดต',
    'player.othersRemain':
      'ตำแหน่งกู้คืนอื่นในอุปกรณ์ หากมี จะยังใช้ได้เมื่อคุณเปิดบทเรียนนี้อีกครั้ง',
    'player.deviceUseFailed': 'ใช้ตำแหน่งในอุปกรณ์นี้ไม่ได้ โปรดลองอีกครั้งหลังจากสื่อโหลดเสร็จ',
    'player.quality': 'คุณภาพ',
    'player.qualityStandard': '480p — มาตรฐาน',
    'player.qualitySmall': '360p — เล็ก',
    'player.qualityAudio': 'เสียงเท่านั้น',
    'player.saving': 'กำลังบันทึก…',
    'player.saveDevice': 'บันทึกไว้ในอุปกรณ์นี้',
    'player.onDevice': 'อยู่ในอุปกรณ์นี้แล้ว',
    'player.seePlus': 'ดูว่า Plus มีอะไรบ้าง',
    'player.plusNote': 'การบันทึกบทเรียนไว้ในอุปกรณ์เป็นส่วนหนึ่งของแพ็กเกจ Plus',
    'player.tryAgain': 'ลองอีกครั้ง',
    'player.preparing': 'กำลังเตรียมตัวเล่น…',
    'player.linksNote': 'ลิงก์สำหรับเล่นมีอายุสั้นและผูกกับสิทธิ์เข้าถึงบทเรียนนี้ของคุณ',
    'player.savedNote':
      'บทเรียนที่บันทึกไว้จะอยู่ภายในแอป แต่ขณะนี้ต้องมีการเชื่อมต่อเพื่อตรวจสอบสิทธิ์เข้าถึงทุกครั้งที่เปิด',
    'player.playFailed': 'เล่นบทเรียนนั้นไม่ได้',
    'player.saveRefused': 'บันทึกบทเรียนนี้ด้วยแพ็กเกจนี้ไม่ได้',
    'player.fetchFailed': 'ดึงบทเรียนนั้นมาเพื่อบันทึกไม่ได้',
    'player.saveFailed': 'บันทึกบทเรียนนั้นไม่ได้',
    'player.noCopy': 'สื่อบันทึกนี้ยังไม่มีสำเนาที่เล่นได้',
  },
  fil: {
    'player.videoUnsupported': 'Hindi ma-play ng iyong browser ang video na ito.',
    'player.audioUnsupported': 'Hindi ma-play ng iyong browser ang audio na ito.',
    'player.openVideo': 'Buksan nang direkta ang video',
    'player.openAudio': 'Buksan nang direkta ang audio',
    'player.speed': 'Bilis',
    'player.slower': 'Mas mabagal',
    'player.faster': 'Mas mabilis',
    'player.loopFrom': 'Ulitin mula rito',
    'player.loopTo': 'Hanggang dito',
    'player.loopStop': 'Ihinto ang pag-uulit',
    'player.loopOpenEnd': 'Inuulit mula {from} — markahan kung saan ito magtatapos.',
    'player.loopOpenStart': 'Inuulit hanggang {to} — markahan kung saan ito magsisimula.',
    'player.loopBackwards':
      'Nagtatapos ang bahaging iyon bago pa ito magsimula. Markahan itong muli.',
    'player.loopBoth': 'Inuulit ang {from} – {to}.',
    'player.resuming': 'Itinutuloy sa {at}.',
    'player.checking': 'Sinusuri ang iyong naka-save na puwesto…',
    'player.legacyGroup': 'Naunang puwesto para sa buong aralin',
    'player.legacyPlace':
      'May naunang puwestong na-save para sa buong aralin, at ito ay {at}. Maaaring sa ibang recording ito. Maaari mo itong tingnan dito; hindi nito papalitan ang naka-save na puwesto ng recording na ito kung hindi mo pipiliin.',
    'player.limit': 'Hindi maaaring lumampas ng 24 na oras ang player.',
    'player.legacyReview': 'Tingnan ang naunang puwesto',
    'player.notNow': 'Hindi muna',
    'player.recoveryToggle': 'Magtago ng pansamantalang puwesto para sa pagbawi sa browser na ito',
    'player.recoveryNotice':
      'Opsyonal. Maaaring makita ng sinumang may access sa profile ng browser na ito ang mga identifier ng akawnt, enrolment, aralin at recording, mga identifier ng session, mga puwesto at mga oras ng pagtatala, kasama ang sa ibang mga akawnt na gumagamit nito. Kapag in-off ito, aalisin ang mga puwesto para sa pagbawi ng lahat ng akawnt sa browser na ito. Kailangang makumpirma online ang iyong akawnt bago makapag-imbak ng puwesto. Nag-e-expire ang mga tala pagkalipas ng pitong araw at binubura sa susunod na pagbisita; maaaring hindi available ang storage o mabura ito nang mas maaga.',
    'player.earlierGroup': 'Mga naunang puwesto sa device para sa buong aralin',
    'player.earlierIntro':
      'Ang mga lumang puwestong ito sa device ay na-save para sa buong aralin, hindi para sa isang partikular na recording. Maaaring sa ibang recording ang mga ito. Tingnan ang isa rito o itapon ito; hindi pinapalitan ng pagtingin ang puwesto sa akawnt kung wala kang isa pang pagpili.',
    'player.earlierReview': 'Tingnan ang naunang puwesto sa device',
    'player.earlierReviewLabel': 'Tingnan ang naunang puwesto sa device na {at} mula {when}',
    'player.earlierDiscard': 'Itapon ang naunang puwesto',
    'player.earlierDiscardLabel': 'Itapon ang naunang puwesto sa device na {at} mula {when}',
    'player.deviceGroup': 'Mga puwesto para sa pagbawi sa device',
    'player.deviceIntro':
      'Maaaring hindi nakarating sa iyong akawnt ang isang puwesto mula sa browser na ito. Tingnan o itapon ang bawat puwesto bago magpatuloy ang awtomatikong pag-save. Kapag pumili ka ng isa, maiiwan ang iba para sa susunod na pagbisita.',
    'player.deviceReview': 'Tingnan ang puwestong ito',
    'player.deviceReviewLabel': 'Tingnan ang puwesto sa device na {at} mula {when}',
    'player.deviceDiscard': 'Itapon',
    'player.deviceDiscardLabel': 'Itapon ang puwesto sa device na {at} mula {when}',
    'player.conflictGroup': 'Piliin ang iyong naka-save na puwesto',
    'player.conflictIntro':
      'Maaaring iba ang naka-save na puwesto ng akawnt sa puwesto ng player na ito.',
    'player.conflictNone': 'Walang naka-save na puwesto.',
    'player.conflictSaved': 'Naka-save na puwesto: {at}.',
    'player.conflictLocal': 'Ang player na ito: {at}. Alin ang dapat panatilihin?',
    'player.useSaved': 'Gamitin ang naka-save na puwesto',
    'player.keepLocal': 'Panatilihin ang puwesto ng player na ito',
    'player.storeClearFailed':
      'Hindi mabura ang storage ng device. Tingnan ang mga setting ng storage ng iyong browser.',
    'player.storeSaveFailed': 'Hindi ma-save ang puwesto para sa pagbawi sa device na ito.',
    'player.storeUnavailable': 'Hindi available ang storage para sa pagbawi sa browser na ito.',
    'player.storeReadFailed':
      'Hindi mabasa ang mga naunang puwesto sa device. Tingnan ang mga setting ng storage ng iyong browser.',
    'player.earlierClearFailed':
      'Hindi mabura ang naunang puwesto sa device. Tingnan ang mga setting ng storage ng iyong browser.',
    'player.unconfirmed':
      'Hindi makumpirma ang iyong naka-save na puwesto. I-reload ang aralin upang suriin bago magpatuloy sa pag-save.',
    'player.loadFailed':
      'Hindi ma-load ang iyong naka-save na puwesto. Maaari mong i-play ang araling ito, ngunit hindi available ang pag-save hangga’t hindi ka nagre-reload.',
    'player.turnedOff': 'In-off o binura ang pagbawi mula sa ibang bahagi ng browser na ito.',
    'player.storeCheckFailed': 'Hindi masuri ang storage para sa pagbawi sa browser na ito.',
    'player.legacyBusy':
      'Tapusin muna ang kasalukuyang pagpili sa pag-save o pagbawi bago tingnan ang lumang puwesto.',
    'player.legacyWait': 'Hintaying mag-load ang recording bago tingnan ang lumang puwesto.',
    'player.legacyBeyond':
      'Lampas sa dulo ng recording na ito ang lumang puwesto. Maaaring sa ibang recording ito.',
    'player.legacySeekFailed':
      'Hindi makapunta sa lumang puwesto. Subukang muli kapag handa na ang recording.',
    'player.earlierRemoveFailed': 'Hindi maalis ang naunang puwesto sa device.',
    'player.earlierBusy':
      'Tapusin muna ang kasalukuyang pagpili sa pag-save o pagbawi bago tumingin ng naunang puwesto sa device.',
    'player.earlierWait':
      'Hintaying mag-load ang recording bago tingnan ang naunang puwesto sa device.',
    'player.earlierChanged':
      'Nagbago ang naunang puwesto sa device. Tingnan ang na-update na listahan.',
    'player.earlierBeyond':
      'Lampas sa dulo ng recording na ito ang naunang puwesto sa device. Maaaring sa ibang recording ito.',
    'player.earlierSeekFailed': 'Hindi makapunta sa naunang puwesto sa device.',
    'player.earlierReadFailed': 'Hindi mabasa ang naunang puwesto sa device.',
    'player.needConfirmed':
      'Hindi makapagtala ng puwesto ang pagbawi hangga’t hindi nakukumpirma ang iyong akawnt. Mag-reload kapag may koneksyon ka na.',
    'player.storeChangeFailed':
      'Hindi mabago o lubusang mabura ang storage ng device. Tingnan ang mga setting ng storage ng iyong browser.',
    'player.deviceRemoveFailed': 'Hindi maalis sa device ang puwestong ito para sa pagbawi.',
    'player.deviceChanged': 'Nagbago ang puwesto sa device. Tingnan ang na-update na listahan.',
    'player.othersRemain':
      'Ang iba pang puwesto para sa pagbawi sa device, kung mayroon, ay mananatiling available kapag binuksan mong muli ang araling ito.',
    'player.deviceUseFailed':
      'Hindi magamit ang puwestong ito sa device. Subukang muli pagkatapos mag-load ng media.',
    'player.quality': 'Kalidad',
    'player.qualityStandard': '480p — karaniwan',
    'player.qualitySmall': '360p — maliit',
    'player.qualityAudio': 'Audio lang',
    'player.saving': 'Sine-save…',
    'player.saveDevice': 'I-save sa device na ito',
    'player.onDevice': 'Nasa device na ito',
    'player.seePlus': 'Tingnan ang kasama sa Plus',
    'player.plusNote': 'Ang pag-save ng aralin sa device ay bahagi ng planong Plus.',
    'player.tryAgain': 'Subukang muli',
    'player.preparing': 'Inihahanda ang player…',
    'player.linksNote':
      'Maikli lang ang bisa ng mga link sa pag-play at nakatali ang mga ito sa iyong access sa araling ito.',
    'player.savedNote':
      'Nananatili sa loob ng app ang naka-save na aralin, ngunit sa ngayon kailangan nito ng koneksyon upang suriin ang access tuwing bubuksan mo ito.',
    'player.playFailed': 'Hindi ma-play ang araling iyon.',
    'player.saveRefused': 'Hindi mase-save ang araling ito sa planong ito.',
    'player.fetchFailed': 'Hindi makuha ang araling iyon para i-save.',
    'player.saveFailed': 'Hindi ma-save ang araling iyon.',
    'player.noCopy': 'Wala pang kopya ang recording na ito na maaaring i-play.',
  },
  uz: {
    'player.videoUnsupported': 'Brauzeringiz bu videoni ijro eta olmaydi.',
    'player.audioUnsupported': 'Brauzeringiz bu audioni ijro eta olmaydi.',
    'player.openVideo': 'Videoni toʻgʻridan toʻgʻri ochish',
    'player.openAudio': 'Audioni toʻgʻridan toʻgʻri ochish',
    'player.speed': 'Tezlik',
    'player.slower': 'Sekinroq',
    'player.faster': 'Tezroq',
    'player.loopFrom': 'Shu yerdan takrorlash',
    'player.loopTo': 'Shu yergacha',
    'player.loopStop': 'Takrorlashni toʻxtatish',
    'player.loopOpenEnd': '{from} dan takrorlanmoqda — qayerda tugashini belgilang.',
    'player.loopOpenStart': '{to} gacha takrorlanmoqda — qayerdan boshlanishini belgilang.',
    'player.loopBackwards': 'Bu parcha boshlanishidan oldin tugayapti. Qayta belgilang.',
    'player.loopBoth': '{from} – {to} takrorlanmoqda.',
    'player.resuming': '{at} dan davom ettirilmoqda.',
    'player.checking': 'Saqlangan joyingiz tekshirilmoqda…',
    'player.legacyGroup': 'Butun dars uchun avvalgi joy',
    'player.legacyPlace':
      'Butun dars uchun avval saqlangan joy: {at}. U boshqa yozuvga tegishli boʻlishi mumkin. Uni shu yerda koʻrib chiqishingiz mumkin; oʻzingiz tanlamaguningizcha u bu yozuvning saqlangan joyini almashtirmaydi.',
    'player.limit': 'Pleyer 24 soatdan oʻta olmaydi.',
    'player.legacyReview': 'Avvalgi joyni koʻrib chiqish',
    'player.notNow': 'Hozir emas',
    'player.recoveryToggle': 'Bu brauzerda vaqtinchalik tiklash joyini saqlash',
    'player.recoveryNotice':
      'Ixtiyoriy. Bu brauzer profiliga kira oladigan har kim hisob, roʻyxatdan oʻtish, dars va yozuv identifikatorlarini, seans identifikatorlarini, joylarni va vaqt belgilarini koʻrishi mumkin, jumladan undan foydalanadigan boshqa hisoblarnikini ham. Buni oʻchirsangiz, bu brauzerdagi barcha hisoblarning tiklash joylari olib tashlanadi. Joy saqlanishidan oldin hisobingiz onlayn tasdiqlanishi kerak. Saqlangan maʼlumotlar muddati yetti kundan keyin tugaydi va keyingi tashrifda tozalanadi; xotira mavjud boʻlmasligi yoki ertaroq tozalanishi mumkin.',
    'player.earlierGroup': 'Qurilmadagi butun dars uchun avvalgi joylar',
    'player.earlierIntro':
      'Qurilmadagi bu eski joylar muayyan yozuv uchun emas, butun dars uchun saqlangan. Ular boshqa yozuvga tegishli boʻlishi mumkin. Birini shu yerda koʻrib chiqing yoki tashlab yuboring; koʻrib chiqish sizning yana bir tanlovingizsiz hisobdagi joyni almashtirmaydi.',
    'player.earlierReview': 'Qurilmadagi avvalgi joyni koʻrib chiqish',
    'player.earlierReviewLabel': 'Qurilmadagi avvalgi joyni koʻrib chiqish: {at}, {when}',
    'player.earlierDiscard': 'Avvalgi joyni tashlab yuborish',
    'player.earlierDiscardLabel': 'Qurilmadagi avvalgi joyni tashlab yuborish: {at}, {when}',
    'player.deviceGroup': 'Qurilmadagi tiklash joylari',
    'player.deviceIntro':
      'Bu brauzerdagi joy hisobingizga yetib bormagan boʻlishi mumkin. Avtomatik saqlash davom etishidan oldin har bir joyni koʻrib chiqing yoki tashlab yuboring. Birini tanlasangiz, qolganlari keyingi tashrifga qoladi.',
    'player.deviceReview': 'Bu joyni koʻrib chiqish',
    'player.deviceReviewLabel': 'Qurilmadagi joyni koʻrib chiqish: {at}, {when}',
    'player.deviceDiscard': 'Tashlab yuborish',
    'player.deviceDiscardLabel': 'Qurilmadagi joyni tashlab yuborish: {at}, {when}',
    'player.conflictGroup': 'Saqlangan joyingizni tanlang',
    'player.conflictIntro': 'Hisobdagi saqlangan joy bu pleyerdagidan farq qilishi mumkin.',
    'player.conflictNone': 'Saqlangan joy yoʻq.',
    'player.conflictSaved': 'Saqlangan joy: {at}.',
    'player.conflictLocal': 'Bu pleyer: {at}. Qaysi biri qolsin?',
    'player.useSaved': 'Saqlangan joydan foydalanish',
    'player.keepLocal': 'Bu pleyerdagi joyni qoldirish',
    'player.storeClearFailed':
      'Qurilma xotirasini tozalab boʻlmadi. Brauzeringizning xotira sozlamalarini tekshiring.',
    'player.storeSaveFailed': 'Bu qurilmada tiklash joyini saqlab boʻlmadi.',
    'player.storeUnavailable': 'Bu brauzerda tiklash xotirasi mavjud emas.',
    'player.storeReadFailed':
      'Qurilmadagi avvalgi joylarni oʻqib boʻlmadi. Brauzeringizning xotira sozlamalarini tekshiring.',
    'player.earlierClearFailed':
      'Qurilmadagi avvalgi joyni tozalab boʻlmadi. Brauzeringizning xotira sozlamalarini tekshiring.',
    'player.unconfirmed':
      'Saqlangan joyingizni tasdiqlab boʻlmadi. Saqlashni davom ettirishdan oldin tekshirish uchun darsni qayta yuklang.',
    'player.loadFailed':
      'Saqlangan joyingizni yuklab boʻlmadi. Bu darsni ijro etishingiz mumkin, lekin qayta yuklamaguningizcha saqlash ishlamaydi.',
    'player.turnedOff': 'Tiklash bu brauzerning boshqa joyidan oʻchirildi yoki tozalandi.',
    'player.storeCheckFailed': 'Bu brauzerda tiklash xotirasini tekshirib boʻlmadi.',
    'player.legacyBusy':
      'Eski joyni koʻrib chiqishdan oldin joriy saqlash yoki tiklash tanlovini yakunlang.',
    'player.legacyWait': 'Eski joyni koʻrib chiqishdan oldin yozuv yuklanishini kuting.',
    'player.legacyBeyond':
      'Eski joy bu yozuvning oxiridan keyinda. U boshqa yozuvga tegishli boʻlishi mumkin.',
    'player.legacySeekFailed':
      'Eski joyga oʻtib boʻlmadi. Yozuv tayyor boʻlganda yana urinib koʻring.',
    'player.earlierRemoveFailed': 'Qurilmadagi avvalgi joyni olib tashlab boʻlmadi.',
    'player.earlierBusy':
      'Qurilmadagi avvalgi joyni koʻrib chiqishdan oldin joriy saqlash yoki tiklash tanlovini yakunlang.',
    'player.earlierWait':
      'Qurilmadagi avvalgi joyni koʻrib chiqishdan oldin yozuv yuklanishini kuting.',
    'player.earlierChanged':
      'Qurilmadagi avvalgi joy oʻzgardi. Yangilangan roʻyxatni koʻrib chiqing.',
    'player.earlierBeyond':
      'Qurilmadagi avvalgi joy bu yozuvning oxiridan keyinda. U boshqa yozuvga tegishli boʻlishi mumkin.',
    'player.earlierSeekFailed': 'Qurilmadagi avvalgi joyga oʻtib boʻlmadi.',
    'player.earlierReadFailed': 'Qurilmadagi avvalgi joyni oʻqib boʻlmadi.',
    'player.needConfirmed':
      'Hisobingiz tasdiqlanmaguncha tiklash joyni qayd eta olmaydi. Ulanganingizda qayta yuklang.',
    'player.storeChangeFailed':
      'Qurilma xotirasini oʻzgartirib yoki toʻliq tozalab boʻlmadi. Brauzeringizning xotira sozlamalarini tekshiring.',
    'player.deviceRemoveFailed': 'Bu tiklash joyini qurilmadan olib tashlab boʻlmadi.',
    'player.deviceChanged': 'Qurilmadagi joy oʻzgardi. Yangilangan roʻyxatni koʻrib chiqing.',
    'player.othersRemain':
      'Qurilmadagi boshqa tiklash joylari, agar boʻlsa, bu darsni qayta ochganingizda mavjud boʻlib qoladi.',
    'player.deviceUseFailed':
      'Qurilmadagi bu joydan foydalanib boʻlmadi. Media yuklangandan keyin yana urinib koʻring.',
    'player.quality': 'Sifat',
    'player.qualityStandard': '480p — standart',
    'player.qualitySmall': '360p — kichik',
    'player.qualityAudio': 'Faqat audio',
    'player.saving': 'Saqlanmoqda…',
    'player.saveDevice': 'Bu qurilmaga saqlash',
    'player.onDevice': 'Bu qurilmada',
    'player.seePlus': 'Plus nimalarni oʻz ichiga olishini koʻring',
    'player.plusNote': 'Darsni qurilmaga saqlash Plus tarifining bir qismidir.',
    'player.tryAgain': 'Yana urinib koʻring',
    'player.preparing': 'Pleyer tayyorlanmoqda…',
    'player.linksNote':
      'Ijro havolalari qisqa muddatli va sizning bu darsga kirish huquqingizga bogʻlangan.',
    'player.savedNote':
      'Saqlangan dars ilova ichida qoladi, lekin hozircha har safar ochganingizda kirish huquqini tekshirish uchun aloqa kerak.',
    'player.playFailed': 'Bu darsni ijro etib boʻlmadi.',
    'player.saveRefused': 'Bu darsni ushbu tarifda saqlab boʻlmaydi.',
    'player.fetchFailed': 'Bu darsni saqlash uchun olib boʻlmadi.',
    'player.saveFailed': 'Bu darsni saqlab boʻlmadi.',
    'player.noCopy': 'Bu yozuvning hali ijro etsa boʻladigan nusxasi yoʻq.',
  },
  kk: {
    'player.videoUnsupported': 'Браузеріңіз бұл бейнені ойната алмайды.',
    'player.audioUnsupported': 'Браузеріңіз бұл аудионы ойната алмайды.',
    'player.openVideo': 'Бейнені тікелей ашу',
    'player.openAudio': 'Аудионы тікелей ашу',
    'player.speed': 'Жылдамдық',
    'player.slower': 'Баяуырақ',
    'player.faster': 'Жылдамырақ',
    'player.loopFrom': 'Осы жерден қайталау',
    'player.loopTo': 'Осы жерге дейін',
    'player.loopStop': 'Қайталауды тоқтату',
    'player.loopOpenEnd': '{from} тұсынан қайталануда — қай жерде аяқталатынын белгілеңіз.',
    'player.loopOpenStart': '{to} тұсына дейін қайталануда — қай жерден басталатынын белгілеңіз.',
    'player.loopBackwards': 'Бұл үзінді басталмай тұрып аяқталады. Қайта белгілеңіз.',
    'player.loopBoth': '{from} – {to} қайталануда.',
    'player.resuming': '{at} тұсынан жалғасуда.',
    'player.checking': 'Сақталған орныңыз тексерілуде…',
    'player.legacyGroup': 'Бүкіл сабақ үшін бұрынғы орын',
    'player.legacyPlace':
      'Бүкіл сабақ үшін бұрын сақталған орын: {at}. Ол басқа жазбаға тиесілі болуы мүмкін. Оны осы жерде қарап шыға аласыз; өзіңіз таңдамайынша ол осы жазбаның сақталған орнын алмастырмайды.',
    'player.limit': 'Ойнатқыш 24 сағаттан аса алмайды.',
    'player.legacyReview': 'Бұрынғы орынды қарап шығу',
    'player.notNow': 'Қазір емес',
    'player.recoveryToggle': 'Осы браузерде уақытша қалпына келтіру орнын сақтау',
    'player.recoveryNotice':
      'Міндетті емес. Осы браузер профиліне кіре алатын кез келген адам аккаунт, тіркелу, сабақ және жазба идентификаторларын, сеанс идентификаторларын, орындарды және уақыт белгілерін көре алады, оны пайдаланатын басқа аккаунттардікін де. Мұны өшірсеңіз, осы браузердегі барлық аккаунттың қалпына келтіру орындары жойылады. Орын сақталмас бұрын аккаунтыңыз онлайн расталуы керек. Сақталған деректердің мерзімі жеті күннен кейін бітеді және кейінгі кіргенде тазаланады; жад қолжетімсіз болуы немесе ертерек тазалануы мүмкін.',
    'player.earlierGroup': 'Құрылғыдағы бүкіл сабақ үшін бұрынғы орындар',
    'player.earlierIntro':
      'Құрылғыдағы бұл ескі орындар нақты бір жазба үшін емес, бүкіл сабақ үшін сақталған. Олар басқа жазбаға тиесілі болуы мүмкін. Біреуін осы жерде қарап шығыңыз немесе алып тастаңыз; қарап шығу сіздің тағы бір таңдауыңызсыз аккаунттағы орынды алмастырмайды.',
    'player.earlierReview': 'Құрылғыдағы бұрынғы орынды қарап шығу',
    'player.earlierReviewLabel': 'Құрылғыдағы бұрынғы орынды қарап шығу: {at}, {when}',
    'player.earlierDiscard': 'Бұрынғы орынды алып тастау',
    'player.earlierDiscardLabel': 'Құрылғыдағы бұрынғы орынды алып тастау: {at}, {when}',
    'player.deviceGroup': 'Құрылғыдағы қалпына келтіру орындары',
    'player.deviceIntro':
      'Осы браузердегі орын аккаунтыңызға жетпеген болуы мүмкін. Автоматты сақтау жалғаспас бұрын әр орынды қарап шығыңыз немесе алып тастаңыз. Біреуін таңдасаңыз, қалғандары кейінгі кіруге қалады.',
    'player.deviceReview': 'Осы орынды қарап шығу',
    'player.deviceReviewLabel': 'Құрылғыдағы орынды қарап шығу: {at}, {when}',
    'player.deviceDiscard': 'Алып тастау',
    'player.deviceDiscardLabel': 'Құрылғыдағы орынды алып тастау: {at}, {when}',
    'player.conflictGroup': 'Сақталған орныңызды таңдаңыз',
    'player.conflictIntro': 'Аккаунттағы сақталған орын осы ойнатқыштағыдан өзгеше болуы мүмкін.',
    'player.conflictNone': 'Сақталған орын жоқ.',
    'player.conflictSaved': 'Сақталған орын: {at}.',
    'player.conflictLocal': 'Осы ойнатқыш: {at}. Қайсысы қалсын?',
    'player.useSaved': 'Сақталған орынды пайдалану',
    'player.keepLocal': 'Осы ойнатқыштың орнын қалдыру',
    'player.storeClearFailed':
      'Құрылғы жадын тазалау мүмкін болмады. Браузеріңіздің жад параметрлерін тексеріңіз.',
    'player.storeSaveFailed': 'Осы құрылғыда қалпына келтіру орнын сақтау мүмкін болмады.',
    'player.storeUnavailable': 'Осы браузерде қалпына келтіру жады қолжетімсіз.',
    'player.storeReadFailed':
      'Құрылғыдағы бұрынғы орындарды оқу мүмкін болмады. Браузеріңіздің жад параметрлерін тексеріңіз.',
    'player.earlierClearFailed':
      'Құрылғыдағы бұрынғы орынды тазалау мүмкін болмады. Браузеріңіздің жад параметрлерін тексеріңіз.',
    'player.unconfirmed':
      'Сақталған орныңызды растау мүмкін болмады. Сақтауды жалғастырмас бұрын тексеру үшін сабақты қайта жүктеңіз.',
    'player.loadFailed':
      'Сақталған орныңызды жүктеу мүмкін болмады. Бұл сабақты ойната аласыз, бірақ қайта жүктегенше сақтау қолжетімсіз.',
    'player.turnedOff': 'Қалпына келтіру осы браузердің басқа жерінен өшірілді немесе тазаланды.',
    'player.storeCheckFailed': 'Осы браузерде қалпына келтіру жадын тексеру мүмкін болмады.',
    'player.legacyBusy':
      'Ескі орынды қарап шықпас бұрын ағымдағы сақтау немесе қалпына келтіру таңдауын аяқтаңыз.',
    'player.legacyWait': 'Ескі орынды қарап шықпас бұрын жазбаның жүктелуін күтіңіз.',
    'player.legacyBeyond':
      'Ескі орын осы жазбаның соңынан әрі жатыр. Ол басқа жазбаға тиесілі болуы мүмкін.',
    'player.legacySeekFailed':
      'Ескі орынға өту мүмкін болмады. Жазба дайын болғанда қайталап көріңіз.',
    'player.earlierRemoveFailed': 'Құрылғыдағы бұрынғы орынды жою мүмкін болмады.',
    'player.earlierBusy':
      'Құрылғыдағы бұрынғы орынды қарап шықпас бұрын ағымдағы сақтау немесе қалпына келтіру таңдауын аяқтаңыз.',
    'player.earlierWait':
      'Құрылғыдағы бұрынғы орынды қарап шықпас бұрын жазбаның жүктелуін күтіңіз.',
    'player.earlierChanged': 'Құрылғыдағы бұрынғы орын өзгерді. Жаңартылған тізімді қарап шығыңыз.',
    'player.earlierBeyond':
      'Құрылғыдағы бұрынғы орын осы жазбаның соңынан әрі жатыр. Ол басқа жазбаға тиесілі болуы мүмкін.',
    'player.earlierSeekFailed': 'Құрылғыдағы бұрынғы орынға өту мүмкін болмады.',
    'player.earlierReadFailed': 'Құрылғыдағы бұрынғы орынды оқу мүмкін болмады.',
    'player.needConfirmed':
      'Аккаунтыңыз расталғанша қалпына келтіру орынды тіркей алмайды. Қосылған кезде қайта жүктеңіз.',
    'player.storeChangeFailed':
      'Құрылғы жадын өзгерту немесе толық тазалау мүмкін болмады. Браузеріңіздің жад параметрлерін тексеріңіз.',
    'player.deviceRemoveFailed': 'Бұл қалпына келтіру орнын құрылғыдан жою мүмкін болмады.',
    'player.deviceChanged': 'Құрылғыдағы орын өзгерді. Жаңартылған тізімді қарап шығыңыз.',
    'player.othersRemain':
      'Құрылғыдағы басқа қалпына келтіру орындары, егер болса, бұл сабақты қайта ашқанда қолжетімді болып қалады.',
    'player.deviceUseFailed':
      'Құрылғыдағы бұл орынды пайдалану мүмкін болмады. Медиа жүктелгеннен кейін қайталап көріңіз.',
    'player.quality': 'Сапа',
    'player.qualityStandard': '480p — стандартты',
    'player.qualitySmall': '360p — шағын',
    'player.qualityAudio': 'Тек аудио',
    'player.saving': 'Сақталуда…',
    'player.saveDevice': 'Осы құрылғыға сақтау',
    'player.onDevice': 'Осы құрылғыда',
    'player.seePlus': 'Plus-қа не кіретінін қараңыз',
    'player.plusNote': 'Сабақты құрылғыға сақтау Plus жоспарының бір бөлігі.',
    'player.tryAgain': 'Қайталап көріңіз',
    'player.preparing': 'Ойнатқыш дайындалуда…',
    'player.linksNote':
      'Ойнату сілтемелері қысқа мерзімді және сіздің осы сабаққа қол жеткізу құқығыңызға байланған.',
    'player.savedNote':
      'Сақталған сабақ қолданбаның ішінде қалады, бірақ әзірге әр ашқан сайын қол жеткізу құқығын тексеру үшін байланыс қажет.',
    'player.playFailed': 'Ол сабақты ойнату мүмкін болмады.',
    'player.saveRefused': 'Бұл сабақты осы жоспармен сақтау мүмкін емес.',
    'player.fetchFailed': 'Ол сабақты сақтау үшін алу мүмкін болмады.',
    'player.saveFailed': 'Ол сабақты сақтау мүмкін болмады.',
    'player.noCopy': 'Бұл жазбаның әзірге ойнатуға болатын көшірмесі жоқ.',
  },
  az: {
    'player.videoUnsupported': 'Brauzeriniz bu videonu oxuda bilmir.',
    'player.audioUnsupported': 'Brauzeriniz bu audionu oxuda bilmir.',
    'player.openVideo': 'Videonu birbaşa açın',
    'player.openAudio': 'Audionu birbaşa açın',
    'player.speed': 'Sürət',
    'player.slower': 'Daha yavaş',
    'player.faster': 'Daha sürətli',
    'player.loopFrom': 'Buradan təkrarla',
    'player.loopTo': 'Buraya qədər',
    'player.loopStop': 'Təkrarı dayandır',
    'player.loopOpenEnd': '{from} nöqtəsindən təkrarlanır — harada bitdiyini işarələyin.',
    'player.loopOpenStart': '{to} nöqtəsinə qədər təkrarlanır — harada başladığını işarələyin.',
    'player.loopBackwards': 'Bu hissə başlamazdan əvvəl bitir. Yenidən işarələyin.',
    'player.loopBoth': '{from} – {to} təkrarlanır.',
    'player.resuming': '{at} nöqtəsindən davam edir.',
    'player.checking': 'Yadda saxlanılmış yeriniz yoxlanılır…',
    'player.legacyGroup': 'Bütün dərs üçün əvvəlki yer',
    'player.legacyPlace':
      'Bütün dərs üçün əvvəl yadda saxlanılmış yer: {at}. O, başqa yazılışa aid ola bilər. Ona burada baxa bilərsiniz; siz seçmədən o, bu yazılışın yadda saxlanılmış yerini əvəz etməyəcək.',
    'player.limit': 'Pleyer 24 saatdan o yana keçə bilmir.',
    'player.legacyReview': 'Əvvəlki yerə baxın',
    'player.notNow': 'İndi yox',
    'player.recoveryToggle': 'Bu brauzerdə müvəqqəti bərpa yeri saxla',
    'player.recoveryNotice':
      'İstəyə bağlıdır. Bu brauzer profilinə girişi olan hər kəs hesab, qeydiyyat, dərs və yazılış identifikatorlarını, sessiya identifikatorlarını, yerləri və vaxt nişanlarını görə bilər, ondan istifadə edən başqa hesablarınkını da. Bunu söndürdükdə bu brauzerdəki bütün hesabların bərpa yerləri silinir. Yer saxlanılmazdan əvvəl hesabınız onlayn təsdiqlənməlidir. Qeydlərin müddəti yeddi gündən sonra bitir və sonrakı ziyarətdə təmizlənir; yaddaş əlçatmaz ola və ya daha tez təmizlənə bilər.',
    'player.earlierGroup': 'Cihazda bütün dərs üçün əvvəlki yerlər',
    'player.earlierIntro':
      'Cihazdakı bu köhnə yerlər konkret yazılış üçün deyil, bütün dərs üçün yadda saxlanılıb. Onlar başqa yazılışa aid ola bilər. Birinə burada baxın və ya onu atın; baxmaq sizin daha bir seçiminiz olmadan hesabdakı yeri əvəz etmir.',
    'player.earlierReview': 'Cihazdakı əvvəlki yerə baxın',
    'player.earlierReviewLabel': 'Cihazdakı əvvəlki yerə baxın: {at}, {when}',
    'player.earlierDiscard': 'Əvvəlki yeri atın',
    'player.earlierDiscardLabel': 'Cihazdakı əvvəlki yeri atın: {at}, {when}',
    'player.deviceGroup': 'Cihazdakı bərpa yerləri',
    'player.deviceIntro':
      'Bu brauzerdəki yer hesabınıza çatmamış ola bilər. Avtomatik yadda saxlama davam etməzdən əvvəl hər yerə baxın və ya onu atın. Birini seçdikdə qalanları sonrakı ziyarətə qalır.',
    'player.deviceReview': 'Bu yerə baxın',
    'player.deviceReviewLabel': 'Cihazdakı yerə baxın: {at}, {when}',
    'player.deviceDiscard': 'Atın',
    'player.deviceDiscardLabel': 'Cihazdakı yeri atın: {at}, {when}',
    'player.conflictGroup': 'Yadda saxlanılmış yerinizi seçin',
    'player.conflictIntro': 'Hesabda yadda saxlanılmış yer bu pleyerdəkindən fərqli ola bilər.',
    'player.conflictNone': 'Yadda saxlanılmış yer yoxdur.',
    'player.conflictSaved': 'Yadda saxlanılmış yer: {at}.',
    'player.conflictLocal': 'Bu pleyer: {at}. Hansı saxlanılsın?',
    'player.useSaved': 'Yadda saxlanılmış yerdən istifadə et',
    'player.keepLocal': 'Bu pleyerin yerini saxla',
    'player.storeClearFailed':
      'Cihazın yaddaşını təmizləmək mümkün olmadı. Brauzerinizin yaddaş ayarlarını yoxlayın.',
    'player.storeSaveFailed': 'Bu cihazda bərpa yerini yadda saxlamaq mümkün olmadı.',
    'player.storeUnavailable': 'Bu brauzerdə bərpa yaddaşı əlçatan deyil.',
    'player.storeReadFailed':
      'Cihazdakı əvvəlki yerləri oxumaq mümkün olmadı. Brauzerinizin yaddaş ayarlarını yoxlayın.',
    'player.earlierClearFailed':
      'Cihazdakı əvvəlki yeri təmizləmək mümkün olmadı. Brauzerinizin yaddaş ayarlarını yoxlayın.',
    'player.unconfirmed':
      'Yadda saxlanılmış yerinizi təsdiqləmək mümkün olmadı. Yadda saxlamağa davam etməzdən əvvəl yoxlamaq üçün dərsi yenidən yükləyin.',
    'player.loadFailed':
      'Yadda saxlanılmış yerinizi yükləmək mümkün olmadı. Bu dərsi oxuda bilərsiniz, lakin yenidən yükləyənə qədər yadda saxlama işləmir.',
    'player.turnedOff': 'Bərpa bu brauzerin başqa yerindən söndürülüb və ya təmizlənib.',
    'player.storeCheckFailed': 'Bu brauzerdə bərpa yaddaşını yoxlamaq mümkün olmadı.',
    'player.legacyBusy':
      'Köhnə yerə baxmazdan əvvəl cari yadda saxlama və ya bərpa seçimini tamamlayın.',
    'player.legacyWait': 'Köhnə yerə baxmazdan əvvəl yazılışın yüklənməsini gözləyin.',
    'player.legacyBeyond':
      'Köhnə yer bu yazılışın sonundan o yanadır. O, başqa yazılışa aid ola bilər.',
    'player.legacySeekFailed':
      'Köhnə yerə keçmək mümkün olmadı. Yazılış hazır olanda yenidən cəhd edin.',
    'player.earlierRemoveFailed': 'Cihazdakı əvvəlki yeri silmək mümkün olmadı.',
    'player.earlierBusy':
      'Cihazdakı əvvəlki yerə baxmazdan əvvəl cari yadda saxlama və ya bərpa seçimini tamamlayın.',
    'player.earlierWait': 'Cihazdakı əvvəlki yerə baxmazdan əvvəl yazılışın yüklənməsini gözləyin.',
    'player.earlierChanged': 'Cihazdakı əvvəlki yer dəyişib. Yenilənmiş siyahıya baxın.',
    'player.earlierBeyond':
      'Cihazdakı əvvəlki yer bu yazılışın sonundan o yanadır. O, başqa yazılışa aid ola bilər.',
    'player.earlierSeekFailed': 'Cihazdakı əvvəlki yerə keçmək mümkün olmadı.',
    'player.earlierReadFailed': 'Cihazdakı əvvəlki yeri oxumaq mümkün olmadı.',
    'player.needConfirmed':
      'Hesabınız təsdiqlənənə qədər bərpa yer qeyd edə bilmir. Qoşulanda yenidən yükləyin.',
    'player.storeChangeFailed':
      'Cihazın yaddaşını dəyişmək və ya tam təmizləmək mümkün olmadı. Brauzerinizin yaddaş ayarlarını yoxlayın.',
    'player.deviceRemoveFailed': 'Bu bərpa yerini cihazdan silmək mümkün olmadı.',
    'player.deviceChanged': 'Cihazdakı yer dəyişib. Yenilənmiş siyahıya baxın.',
    'player.othersRemain':
      'Cihazdakı digər bərpa yerləri, əgər varsa, bu dərsi yenidən açanda əlçatan qalır.',
    'player.deviceUseFailed':
      'Cihazdakı bu yerdən istifadə etmək mümkün olmadı. Media yükləndikdən sonra yenidən cəhd edin.',
    'player.quality': 'Keyfiyyət',
    'player.qualityStandard': '480p — standart',
    'player.qualitySmall': '360p — kiçik',
    'player.qualityAudio': 'Yalnız audio',
    'player.saving': 'Yadda saxlanılır…',
    'player.saveDevice': 'Bu cihazda yadda saxla',
    'player.onDevice': 'Bu cihazdadır',
    'player.seePlus': 'Plus-a nələrin daxil olduğuna baxın',
    'player.plusNote': 'Dərsi cihazda yadda saxlamaq Plus planının bir hissəsidir.',
    'player.tryAgain': 'Yenidən cəhd edin',
    'player.preparing': 'Pleyer hazırlanır…',
    'player.linksNote': 'Oxutma keçidləri qısamüddətlidir və bu dərsə girişinizə bağlıdır.',
    'player.savedNote':
      'Yadda saxlanılmış dərs tətbiqin içində qalır, lakin hələlik hər dəfə açanda girişi yoxlamaq üçün bağlantı lazımdır.',
    'player.playFailed': 'Həmin dərsi oxutmaq mümkün olmadı.',
    'player.saveRefused': 'Bu dərsi bu planla yadda saxlamaq olmur.',
    'player.fetchFailed': 'Həmin dərsi yadda saxlamaq üçün götürmək mümkün olmadı.',
    'player.saveFailed': 'Həmin dərsi yadda saxlamaq mümkün olmadı.',
    'player.noCopy': 'Bu yazılışın hələ oxudula bilən surəti yoxdur.',
  },
  tg: {
    'player.videoUnsupported': 'Браузери шумо ин видеоро пахш карда наметавонад.',
    'player.audioUnsupported': 'Браузери шумо ин аудиоро пахш карда наметавонад.',
    'player.openVideo': 'Видеоро мустақиман кушоед',
    'player.openAudio': 'Аудиоро мустақиман кушоед',
    'player.speed': 'Суръат',
    'player.slower': 'Оҳистатар',
    'player.faster': 'Тезтар',
    'player.loopFrom': 'Такрор аз ҳамин ҷо',
    'player.loopTo': 'То ҳамин ҷо',
    'player.loopStop': 'Қатъи такрор',
    'player.loopOpenEnd': 'Аз {from} такрор мешавад — ҷои анҷомро нишона кунед.',
    'player.loopOpenStart': 'То {to} такрор мешавад — ҷои оғозро нишона кунед.',
    'player.loopBackwards': 'Ин порча пеш аз оғоз ба анҷом мерасад. Аз нав нишона кунед.',
    'player.loopBoth': '{from} – {to} такрор мешавад.',
    'player.resuming': 'Аз {at} идома меёбад.',
    'player.checking': 'Ҷои нигоҳдошташудаи шумо санҷида мешавад…',
    'player.legacyGroup': 'Ҷои пештара барои тамоми дарс',
    'player.legacyPlace':
      'Ҷои пештар барои тамоми дарс нигоҳдошташуда: {at}. Он метавонад ба сабти дигар тааллуқ дошта бошад. Шумо онро дар ин ҷо аз назар гузаронда метавонед; бе интихоби шумо он ҷои нигоҳдошташудаи ин сабтро иваз намекунад.',
    'player.limit': 'Плеер аз 24 соат гузашта наметавонад.',
    'player.legacyReview': 'Аз назар гузарондани ҷои пештара',
    'player.notNow': 'Ҳоло не',
    'player.recoveryToggle': 'Нигоҳ доштани ҷои муваққатии барқарорсозӣ дар ин браузер',
    'player.recoveryNotice':
      'Ихтиёрӣ. Ҳар касе, ки ба профили ин браузер дастрасӣ дорад, метавонад идентификаторҳои ҳисоб, номнависӣ, дарс ва сабт, идентификаторҳои сеанс, ҷойҳо ва нишонаҳои вақтро бубинад, аз ҷумла аз они ҳисобҳои дигаре, ки онро истифода мебаранд. Хомӯш кардани ин ҷойҳои барқарорсозии ҳамаи ҳисобҳоро дар ин браузер нест мекунад. Пеш аз нигоҳ доштани ҷой ҳисоби шумо бояд онлайн тасдиқ шавад. Мӯҳлати маълумоти нигоҳдошташуда пас аз ҳафт рӯз ба охир мерасад ва он ҳангоми ташрифи баъдӣ тоза мешавад; хотира метавонад дастнорас бошад ё барвақттар тоза шавад.',
    'player.earlierGroup': 'Ҷойҳои пештара дар дастгоҳ барои тамоми дарс',
    'player.earlierIntro':
      'Ин ҷойҳои кӯҳна дар дастгоҳ на барои сабти муайян, балки барои тамоми дарс нигоҳ дошта шудаанд. Онҳо метавонанд ба сабти дигар тааллуқ дошта бошанд. Якеро дар ин ҷо аз назар гузаронед ё партоед; аз назар гузарондан бе интихоби дигари шумо ҷои ҳисобро иваз намекунад.',
    'player.earlierReview': 'Аз назар гузарондани ҷои пештара дар дастгоҳ',
    'player.earlierReviewLabel': 'Аз назар гузарондани ҷои пештара дар дастгоҳ: {at}, {when}',
    'player.earlierDiscard': 'Партофтани ҷои пештара',
    'player.earlierDiscardLabel': 'Партофтани ҷои пештара дар дастгоҳ: {at}, {when}',
    'player.deviceGroup': 'Ҷойҳои барқарорсозӣ дар дастгоҳ',
    'player.deviceIntro':
      'Мумкин аст ҷое аз ин браузер ба ҳисоби шумо нарасида бошад. Пеш аз идомаи нигоҳдории худкор ҳар ҷойро аз назар гузаронед ё партоед. Агар якеро интихоб кунед, дигарон барои ташрифи баъдӣ мемонанд.',
    'player.deviceReview': 'Аз назар гузарондани ин ҷо',
    'player.deviceReviewLabel': 'Аз назар гузарондани ҷои дастгоҳ: {at}, {when}',
    'player.deviceDiscard': 'Партофтан',
    'player.deviceDiscardLabel': 'Партофтани ҷои дастгоҳ: {at}, {when}',
    'player.conflictGroup': 'Ҷои нигоҳдошташудаи худро интихоб кунед',
    'player.conflictIntro': 'Ҷои нигоҳдошташудаи ҳисоб метавонад аз ҷои ин плеер фарқ кунад.',
    'player.conflictNone': 'Ҷои нигоҳдошташуда нест.',
    'player.conflictSaved': 'Ҷои нигоҳдошташуда: {at}.',
    'player.conflictLocal': 'Ин плеер: {at}. Кадомаш бимонад?',
    'player.useSaved': 'Истифодаи ҷои нигоҳдошташуда',
    'player.keepLocal': 'Нигоҳ доштани ҷои ин плеер',
    'player.storeClearFailed':
      'Хотираи дастгоҳро тоза кардан муяссар нашуд. Танзимоти хотираи браузери худро тафтиш кунед.',
    'player.storeSaveFailed': 'Ҷои барқарорсозиро дар ин дастгоҳ нигоҳ доштан муяссар нашуд.',
    'player.storeUnavailable': 'Хотираи барқарорсозӣ дар ин браузер дастрас нест.',
    'player.storeReadFailed':
      'Ҷойҳои пештараи дастгоҳро хондан муяссар нашуд. Танзимоти хотираи браузери худро тафтиш кунед.',
    'player.earlierClearFailed':
      'Ҷои пештараи дастгоҳро тоза кардан муяссар нашуд. Танзимоти хотираи браузери худро тафтиш кунед.',
    'player.unconfirmed':
      'Ҷои нигоҳдошташудаи шуморо тасдиқ кардан муяссар нашуд. Пеш аз идомаи нигоҳдорӣ барои санҷиш дарсро аз нав бор кунед.',
    'player.loadFailed':
      'Ҷои нигоҳдошташудаи шуморо бор кардан муяссар нашуд. Шумо ин дарсро пахш карда метавонед, вале то аз нав бор кардан нигоҳдорӣ дастрас нест.',
    'player.turnedOff': 'Барқарорсозӣ аз ҷои дигари ин браузер хомӯш ё тоза карда шуд.',
    'player.storeCheckFailed': 'Хотираи барқарорсозиро дар ин браузер санҷидан муяссар нашуд.',
    'player.legacyBusy':
      'Пеш аз дидани ҷои кӯҳна интихоби ҷории нигоҳдорӣ ё барқарорсозиро ба анҷом расонед.',
    'player.legacyWait': 'Пеш аз дидани ҷои кӯҳна мунтазир шавед, ки сабт бор шавад.',
    'player.legacyBeyond':
      'Ҷои кӯҳна аз охири ин сабт берун аст. Он метавонад ба сабти дигар тааллуқ дошта бошад.',
    'player.legacySeekFailed':
      'Ба ҷои кӯҳна гузаштан муяссар нашуд. Вақте ки сабт омода шуд, боз кӯшиш кунед.',
    'player.earlierRemoveFailed': 'Ҷои пештараи дастгоҳро нест кардан муяссар нашуд.',
    'player.earlierBusy':
      'Пеш аз дидани ҷои пештараи дастгоҳ интихоби ҷории нигоҳдорӣ ё барқарорсозиро ба анҷом расонед.',
    'player.earlierWait': 'Пеш аз дидани ҷои пештараи дастгоҳ мунтазир шавед, ки сабт бор шавад.',
    'player.earlierChanged':
      'Ҷои пештараи дастгоҳ тағйир ёфт. Рӯйхати навшударо аз назар гузаронед.',
    'player.earlierBeyond':
      'Ҷои пештараи дастгоҳ аз охири ин сабт берун аст. Он метавонад ба сабти дигар тааллуқ дошта бошад.',
    'player.earlierSeekFailed': 'Ба ҷои пештараи дастгоҳ гузаштан муяссар нашуд.',
    'player.earlierReadFailed': 'Ҷои пештараи дастгоҳро хондан муяссар нашуд.',
    'player.needConfirmed':
      'То тасдиқ шудани ҳисоби шумо барқарорсозӣ ҷойро қайд карда наметавонад. Ҳангоми пайваст будан аз нав бор кунед.',
    'player.storeChangeFailed':
      'Хотираи дастгоҳро тағйир додан ё пурра тоза кардан муяссар нашуд. Танзимоти хотираи браузери худро тафтиш кунед.',
    'player.deviceRemoveFailed': 'Ин ҷои барқарорсозиро аз дастгоҳ нест кардан муяссар нашуд.',
    'player.deviceChanged': 'Ҷои дастгоҳ тағйир ёфт. Рӯйхати навшударо аз назар гузаронед.',
    'player.othersRemain':
      'Ҷойҳои дигари барқарорсозӣ дар дастгоҳ, агар бошанд, ҳангоми аз нав кушодани ин дарс дастрас мемонанд.',
    'player.deviceUseFailed':
      'Ин ҷои дастгоҳро истифода бурдан муяссар нашуд. Пас аз бор шудани медиа боз кӯшиш кунед.',
    'player.quality': 'Сифат',
    'player.qualityStandard': '480p — стандартӣ',
    'player.qualitySmall': '360p — хурд',
    'player.qualityAudio': 'Танҳо аудио',
    'player.saving': 'Нигоҳ дошта мешавад…',
    'player.saveDevice': 'Нигоҳ доштан дар ин дастгоҳ',
    'player.onDevice': 'Дар ин дастгоҳ',
    'player.seePlus': 'Бубинед, ки Plus чиро дар бар мегирад',
    'player.plusNote': 'Нигоҳ доштани дарс дар дастгоҳ қисми нақшаи Plus аст.',
    'player.tryAgain': 'Боз кӯшиш кунед',
    'player.preparing': 'Плеер омода мешавад…',
    'player.linksNote':
      'Пайвандҳои пахш кӯтоҳмуддатанд ва ба дастрасии шумо ба ин дарс вобастаанд.',
    'player.savedNote':
      'Дарси нигоҳдошташуда дар дохили барнома мемонад, вале ҳоло ҳар бор ҳангоми кушодан барои санҷиши дастрасӣ пайвастшавӣ лозим аст.',
    'player.playFailed': 'Он дарсро пахш кардан муяссар нашуд.',
    'player.saveRefused': 'Ин дарсро бо ин нақша нигоҳ доштан мумкин нест.',
    'player.fetchFailed': 'Он дарсро барои нигоҳ доштан гирифтан муяссар нашуд.',
    'player.saveFailed': 'Он дарсро нигоҳ доштан муяссар нашуд.',
    'player.noCopy': 'Ин сабт ҳанӯз нусхае надорад, ки пахш карда шавад.',
  },
  ky: {
    'player.videoUnsupported': 'Браузериңиз бул видеону ойното албайт.',
    'player.audioUnsupported': 'Браузериңиз бул аудиону ойното албайт.',
    'player.openVideo': 'Видеону түз ачуу',
    'player.openAudio': 'Аудиону түз ачуу',
    'player.speed': 'Ылдамдык',
    'player.slower': 'Жайыраак',
    'player.faster': 'Тезирээк',
    'player.loopFrom': 'Ушул жерден кайталоо',
    'player.loopTo': 'Ушул жерге чейин',
    'player.loopStop': 'Кайталоону токтотуу',
    'player.loopOpenEnd': '{from} жеринен кайталанууда — кайсы жерде бүтөрүн белгилеңиз.',
    'player.loopOpenStart': '{to} жерине чейин кайталанууда — кайсы жерден башталарын белгилеңиз.',
    'player.loopBackwards': 'Бул үзүндү баштала электе бүтүп жатат. Кайра белгилеңиз.',
    'player.loopBoth': '{from} – {to} кайталанууда.',
    'player.resuming': '{at} жеринен улантылууда.',
    'player.checking': 'Сакталган ордуңуз текшерилүүдө…',
    'player.legacyGroup': 'Бүтүндөй сабак үчүн мурунку орун',
    'player.legacyPlace':
      'Бүтүндөй сабак үчүн мурун сакталган орун: {at}. Ал башка жазууга таандык болушу мүмкүн. Аны ушул жерден карап чыксаңыз болот; өзүңүз тандамайынча ал бул жазуунун сакталган ордун алмаштырбайт.',
    'player.limit': 'Ойноткуч 24 сааттан ашып кете албайт.',
    'player.legacyReview': 'Мурунку орунду карап чыгуу',
    'player.notNow': 'Азыр эмес',
    'player.recoveryToggle': 'Бул браузерде убактылуу калыбына келтирүү ордун сактоо',
    'player.recoveryNotice':
      'Милдеттүү эмес. Бул браузер профилине кире алган ар бир адам аккаунт, катталуу, сабак жана жазуу идентификаторлорун, сеанс идентификаторлорун, орундарды жана убакыт белгилерин көрө алат, аны колдонгон башка аккаунттардыкын да. Муну өчүрсөңүз, бул браузердеги бардык аккаунттардын калыбына келтирүү орундары алынып салынат. Орун сактала электе аккаунтуңуз онлайн ырасталышы керек. Сакталган маалыматтардын мөөнөтү жети күндөн кийин бүтөт жана кийинки киргенде тазаланат; сактагыч жеткиликсиз болушу же эртерээк тазаланышы мүмкүн.',
    'player.earlierGroup': 'Түзмөктөгү бүтүндөй сабак үчүн мурунку орундар',
    'player.earlierIntro':
      'Түзмөктөгү бул эски орундар белгилүү бир жазуу үчүн эмес, бүтүндөй сабак үчүн сакталган. Алар башка жазууга таандык болушу мүмкүн. Бирөөнү ушул жерден карап чыгыңыз же алып салыңыз; карап чыгуу сиздин дагы бир тандооңуз болмоюнча аккаунттагы орунду алмаштырбайт.',
    'player.earlierReview': 'Түзмөктөгү мурунку орунду карап чыгуу',
    'player.earlierReviewLabel': 'Түзмөктөгү мурунку орунду карап чыгуу: {at}, {when}',
    'player.earlierDiscard': 'Мурунку орунду алып салуу',
    'player.earlierDiscardLabel': 'Түзмөктөгү мурунку орунду алып салуу: {at}, {when}',
    'player.deviceGroup': 'Түзмөктөгү калыбына келтирүү орундары',
    'player.deviceIntro':
      'Бул браузердеги орун аккаунтуңузга жетпей калышы мүмкүн. Автоматтык сактоо уланардан мурун ар бир орунду карап чыгыңыз же алып салыңыз. Бирөөнү тандасаңыз, калгандары кийинки кирүүгө калат.',
    'player.deviceReview': 'Бул орунду карап чыгуу',
    'player.deviceReviewLabel': 'Түзмөктөгү орунду карап чыгуу: {at}, {when}',
    'player.deviceDiscard': 'Алып салуу',
    'player.deviceDiscardLabel': 'Түзмөктөгү орунду алып салуу: {at}, {when}',
    'player.conflictGroup': 'Сакталган ордуңузду тандаңыз',
    'player.conflictIntro': 'Аккаунттагы сакталган орун бул ойноткучтагыдан айырмаланышы мүмкүн.',
    'player.conflictNone': 'Сакталган орун жок.',
    'player.conflictSaved': 'Сакталган орун: {at}.',
    'player.conflictLocal': 'Бул ойноткуч: {at}. Кайсынысы калсын?',
    'player.useSaved': 'Сакталган орунду колдонуу',
    'player.keepLocal': 'Бул ойноткучтун ордун калтыруу',
    'player.storeClearFailed':
      'Түзмөктүн сактагычын тазалоо мүмкүн болгон жок. Браузериңиздин сактагыч жөндөөлөрүн текшериңиз.',
    'player.storeSaveFailed': 'Бул түзмөктө калыбына келтирүү ордун сактоо мүмкүн болгон жок.',
    'player.storeUnavailable': 'Бул браузерде калыбына келтирүү сактагычы жеткиликсиз.',
    'player.storeReadFailed':
      'Түзмөктөгү мурунку орундарды окуу мүмкүн болгон жок. Браузериңиздин сактагыч жөндөөлөрүн текшериңиз.',
    'player.earlierClearFailed':
      'Түзмөктөгү мурунку орунду тазалоо мүмкүн болгон жок. Браузериңиздин сактагыч жөндөөлөрүн текшериңиз.',
    'player.unconfirmed':
      'Сакталган ордуңузду ырастоо мүмкүн болгон жок. Сактоону улантуудан мурун текшерүү үчүн сабакты кайра жүктөңүз.',
    'player.loadFailed':
      'Сакталган ордуңузду жүктөө мүмкүн болгон жок. Бул сабакты ойното аласыз, бирок кайра жүктөмөйүнчө сактоо жеткиликсиз.',
    'player.turnedOff': 'Калыбына келтирүү бул браузердин башка жеринен өчүрүлдү же тазаланды.',
    'player.storeCheckFailed':
      'Бул браузерде калыбына келтирүү сактагычын текшерүү мүмкүн болгон жок.',
    'player.legacyBusy':
      'Эски орунду карап чыгуудан мурун учурдагы сактоо же калыбына келтирүү тандоосун бүтүрүңүз.',
    'player.legacyWait': 'Эски орунду карап чыгуудан мурун жазуунун жүктөлүшүн күтүңүз.',
    'player.legacyBeyond':
      'Эски орун бул жазуунун аягынан ары жатат. Ал башка жазууга таандык болушу мүмкүн.',
    'player.legacySeekFailed':
      'Эски орунга өтүү мүмкүн болгон жок. Жазуу даяр болгондо дагы аракет кылыңыз.',
    'player.earlierRemoveFailed': 'Түзмөктөгү мурунку орунду алып салуу мүмкүн болгон жок.',
    'player.earlierBusy':
      'Түзмөктөгү мурунку орунду карап чыгуудан мурун учурдагы сактоо же калыбына келтирүү тандоосун бүтүрүңүз.',
    'player.earlierWait':
      'Түзмөктөгү мурунку орунду карап чыгуудан мурун жазуунун жүктөлүшүн күтүңүз.',
    'player.earlierChanged': 'Түзмөктөгү мурунку орун өзгөрдү. Жаңыртылган тизмени карап чыгыңыз.',
    'player.earlierBeyond':
      'Түзмөктөгү мурунку орун бул жазуунун аягынан ары жатат. Ал башка жазууга таандык болушу мүмкүн.',
    'player.earlierSeekFailed': 'Түзмөктөгү мурунку орунга өтүү мүмкүн болгон жок.',
    'player.earlierReadFailed': 'Түзмөктөгү мурунку орунду окуу мүмкүн болгон жок.',
    'player.needConfirmed':
      'Аккаунтуңуз ырасталмайынча калыбына келтирүү орунду каттай албайт. Туташканда кайра жүктөңүз.',
    'player.storeChangeFailed':
      'Түзмөктүн сактагычын өзгөртүү же толук тазалоо мүмкүн болгон жок. Браузериңиздин сактагыч жөндөөлөрүн текшериңиз.',
    'player.deviceRemoveFailed':
      'Бул калыбына келтирүү ордун түзмөктөн алып салуу мүмкүн болгон жок.',
    'player.deviceChanged': 'Түзмөктөгү орун өзгөрдү. Жаңыртылган тизмени карап чыгыңыз.',
    'player.othersRemain':
      'Түзмөктөгү башка калыбына келтирүү орундары, эгер болсо, бул сабакты кайра ачканда жеткиликтүү бойдон калат.',
    'player.deviceUseFailed':
      'Түзмөктөгү бул орунду колдонуу мүмкүн болгон жок. Медиа жүктөлгөндөн кийин дагы аракет кылыңыз.',
    'player.quality': 'Сапат',
    'player.qualityStandard': '480p — стандарттык',
    'player.qualitySmall': '360p — кичине',
    'player.qualityAudio': 'Аудио гана',
    'player.saving': 'Сакталууда…',
    'player.saveDevice': 'Бул түзмөккө сактоо',
    'player.onDevice': 'Бул түзмөктө',
    'player.seePlus': 'Plus эмнелерди камтыганын көрүңүз',
    'player.plusNote': 'Сабакты түзмөккө сактоо Plus планынын бир бөлүгү.',
    'player.tryAgain': 'Дагы аракет кылыңыз',
    'player.preparing': 'Ойноткуч даярдалууда…',
    'player.linksNote':
      'Ойнотуу шилтемелери кыска мөөнөттүү жана сиздин бул сабакка кирүү укугуңузга байланган.',
    'player.savedNote':
      'Сакталган сабак колдонмонун ичинде калат, бирок азырынча ар бир ачкан сайын кирүү укугун текшерүү үчүн байланыш керек.',
    'player.playFailed': 'Ал сабакты ойнотуу мүмкүн болгон жок.',
    'player.saveRefused': 'Бул сабакты ушул план менен сактоого болбойт.',
    'player.fetchFailed': 'Ал сабакты сактоо үчүн алуу мүмкүн болгон жок.',
    'player.saveFailed': 'Ал сабакты сактоо мүмкүн болгон жок.',
    'player.noCopy': 'Бул жазуунун азырынча ойнотууга боло турган көчүрмөсү жок.',
  },
  tk: {
    'player.videoUnsupported': 'Brauzeriňiz bu wideony oýnadyp bilmeýär.',
    'player.audioUnsupported': 'Brauzeriňiz bu sesi oýnadyp bilmeýär.',
    'player.openVideo': 'Wideony göni açyň',
    'player.openAudio': 'Sesi göni açyň',
    'player.speed': 'Tizlik',
    'player.slower': 'Haýalrak',
    'player.faster': 'Çaltrak',
    'player.loopFrom': 'Şu ýerden gaýtalamak',
    'player.loopTo': 'Şu ýere çenli',
    'player.loopStop': 'Gaýtalamagy bes etmek',
    'player.loopOpenEnd': '{from} ýerinden gaýtalanýar — nirede gutarýandygyny belläň.',
    'player.loopOpenStart': '{to} ýerine çenli gaýtalanýar — nireden başlanýandygyny belläň.',
    'player.loopBackwards': 'Bu bölek başlamazdan öň gutarýar. Täzeden belläň.',
    'player.loopBoth': '{from} – {to} gaýtalanýar.',
    'player.resuming': '{at} ýerinden dowam edýär.',
    'player.checking': 'Saklanan ýeriňiz barlanýar…',
    'player.legacyGroup': 'Tutuş sapak üçin öňki ýer',
    'player.legacyPlace':
      'Tutuş sapak üçin öň saklanan ýer: {at}. Ol başga ýazga degişli bolup biler. Ony şu ýerde gözden geçirip bilersiňiz; siz saýlamasaňyz, ol bu ýazgynyň saklanan ýeriniň ornuny tutmaz.',
    'player.limit': 'Pleýer 24 sagatdan aňry geçip bilmeýär.',
    'player.legacyReview': 'Öňki ýeri gözden geçirmek',
    'player.notNow': 'Häzir däl',
    'player.recoveryToggle': 'Bu brauzerde wagtlaýyn dikeldiş ýerini saklamak',
    'player.recoveryNotice':
      'Hökmany däl. Bu brauzer profiline girip bilýän her kim hasap, ýazylyş, sapak we ýazgy kesgitleýjilerini, sessiýa kesgitleýjilerini, ýerleri we wagt belliklerini görüp biler, ony ulanýan beýleki hasaplaryňkyny hem. Muny öçürseňiz, bu brauzerdäki ähli hasaplaryň dikeldiş ýerleri aýrylýar. Ýer saklanmazdan öň hasabyňyz onlaýn tassyklanmaly. Saklanan maglumatlaryň möhleti ýedi günden soň gutarýar we soňraky gelişde arassalanýar; ammar elýeterli bolman ýa-da ir arassalanyp biler.',
    'player.earlierGroup': 'Enjamdaky tutuş sapak üçin öňki ýerler',
    'player.earlierIntro':
      'Enjamdaky bu köne ýerler belli bir ýazgy üçin däl-de, tutuş sapak üçin saklanypdy. Olar başga ýazga degişli bolup biler. Birini şu ýerde gözden geçiriň ýa-da taşlaň; gözden geçirmek siziň ýene bir saýlawyňyz bolmasa hasapdaky ýeriň ornuny tutmaýar.',
    'player.earlierReview': 'Enjamdaky öňki ýeri gözden geçirmek',
    'player.earlierReviewLabel': 'Enjamdaky öňki ýeri gözden geçirmek: {at}, {when}',
    'player.earlierDiscard': 'Öňki ýeri taşlamak',
    'player.earlierDiscardLabel': 'Enjamdaky öňki ýeri taşlamak: {at}, {when}',
    'player.deviceGroup': 'Enjamdaky dikeldiş ýerleri',
    'player.deviceIntro':
      'Bu brauzerdäki ýer hasabyňyza ýetmedik bolup biler. Awtomatik saklamak dowam etmezden öň her ýeri gözden geçiriň ýa-da taşlaň. Birini saýlasaňyz, galanlary soňraky gelişe galýar.',
    'player.deviceReview': 'Bu ýeri gözden geçirmek',
    'player.deviceReviewLabel': 'Enjamdaky ýeri gözden geçirmek: {at}, {when}',
    'player.deviceDiscard': 'Taşlamak',
    'player.deviceDiscardLabel': 'Enjamdaky ýeri taşlamak: {at}, {when}',
    'player.conflictGroup': 'Saklanan ýeriňizi saýlaň',
    'player.conflictIntro': 'Hasapdaky saklanan ýer bu pleýerdäkiden tapawutly bolup biler.',
    'player.conflictNone': 'Saklanan ýer ýok.',
    'player.conflictSaved': 'Saklanan ýer: {at}.',
    'player.conflictLocal': 'Bu pleýer: {at}. Haýsysy galsyn?',
    'player.useSaved': 'Saklanan ýeri ulanmak',
    'player.keepLocal': 'Bu pleýeriň ýerini galdyrmak',
    'player.storeClearFailed':
      'Enjamyň ammaryny arassalap bolmady. Brauzeriňiziň ammar sazlamalaryny barlaň.',
    'player.storeSaveFailed': 'Bu enjamda dikeldiş ýerini saklap bolmady.',
    'player.storeUnavailable': 'Bu brauzerde dikeldiş ammary elýeterli däl.',
    'player.storeReadFailed':
      'Enjamdaky öňki ýerleri okap bolmady. Brauzeriňiziň ammar sazlamalaryny barlaň.',
    'player.earlierClearFailed':
      'Enjamdaky öňki ýeri arassalap bolmady. Brauzeriňiziň ammar sazlamalaryny barlaň.',
    'player.unconfirmed':
      'Saklanan ýeriňizi tassyklap bolmady. Saklamagy dowam etdirmezden öň barlamak üçin sapagy täzeden ýükläň.',
    'player.loadFailed':
      'Saklanan ýeriňizi ýükläp bolmady. Bu sapagy oýnadyp bilersiňiz, ýöne täzeden ýükleýänçäňiz saklamak elýeterli däl.',
    'player.turnedOff': 'Dikeldiş bu brauzeriň başga ýerinden öçürildi ýa-da arassalandy.',
    'player.storeCheckFailed': 'Bu brauzerde dikeldiş ammaryny barlap bolmady.',
    'player.legacyBusy':
      'Köne ýeri gözden geçirmezden öň häzirki saklamak ýa-da dikeldiş saýlawyny tamamlaň.',
    'player.legacyWait': 'Köne ýeri gözden geçirmezden öň ýazgynyň ýüklenmegine garaşyň.',
    'player.legacyBeyond':
      'Köne ýer bu ýazgynyň ahyryndan aňryda. Ol başga ýazga degişli bolup biler.',
    'player.legacySeekFailed': 'Köne ýere geçip bolmady. Ýazgy taýýar bolanda ýene synanyşyň.',
    'player.earlierRemoveFailed': 'Enjamdaky öňki ýeri aýryp bolmady.',
    'player.earlierBusy':
      'Enjamdaky öňki ýeri gözden geçirmezden öň häzirki saklamak ýa-da dikeldiş saýlawyny tamamlaň.',
    'player.earlierWait':
      'Enjamdaky öňki ýeri gözden geçirmezden öň ýazgynyň ýüklenmegine garaşyň.',
    'player.earlierChanged': 'Enjamdaky öňki ýer üýtgedi. Täzelenen sanawy gözden geçiriň.',
    'player.earlierBeyond':
      'Enjamdaky öňki ýer bu ýazgynyň ahyryndan aňryda. Ol başga ýazga degişli bolup biler.',
    'player.earlierSeekFailed': 'Enjamdaky öňki ýere geçip bolmady.',
    'player.earlierReadFailed': 'Enjamdaky öňki ýeri okap bolmady.',
    'player.needConfirmed':
      'Hasabyňyz tassyklanýança dikeldiş ýeri belläp bilmeýär. Birikdirilen wagtyňyz täzeden ýükläň.',
    'player.storeChangeFailed':
      'Enjamyň ammaryny üýtgedip ýa-da doly arassalap bolmady. Brauzeriňiziň ammar sazlamalaryny barlaň.',
    'player.deviceRemoveFailed': 'Bu dikeldiş ýerini enjamdan aýryp bolmady.',
    'player.deviceChanged': 'Enjamdaky ýer üýtgedi. Täzelenen sanawy gözden geçiriň.',
    'player.othersRemain':
      'Enjamdaky beýleki dikeldiş ýerleri, bar bolsa, bu sapagy täzeden açanyňyzda elýeterli bolup galýar.',
    'player.deviceUseFailed':
      'Enjamdaky bu ýeri ulanyp bolmady. Media ýüklenenden soň ýene synanyşyň.',
    'player.quality': 'Hil',
    'player.qualityStandard': '480p — adaty',
    'player.qualitySmall': '360p — kiçi',
    'player.qualityAudio': 'Diňe ses',
    'player.saving': 'Saklanýar…',
    'player.saveDevice': 'Bu enjamda saklamak',
    'player.onDevice': 'Bu enjamda',
    'player.seePlus': 'Plus-a nämeleriň girýändigini görüň',
    'player.plusNote': 'Sapagy enjamda saklamak Plus meýilnamasynyň bir bölegidir.',
    'player.tryAgain': 'Ýene synanyşyň',
    'player.preparing': 'Pleýer taýýarlanýar…',
    'player.linksNote':
      'Oýnatmak baglanyşyklary gysga möhletli we siziň bu sapaga elýeterliligiňize baglydyr.',
    'player.savedNote':
      'Saklanan sapak programmanyň içinde galýar, ýöne häzirlikçe her gezek açanyňyzda elýeterliligi barlamak üçin birikme gerek.',
    'player.playFailed': 'Ol sapagy oýnadyp bolmady.',
    'player.saveRefused': 'Bu sapagy şu meýilnama bilen saklap bolmaýar.',
    'player.fetchFailed': 'Ol sapagy saklamak üçin alyp bolmady.',
    'player.saveFailed': 'Ol sapagy saklap bolmady.',
    'player.noCopy': 'Bu ýazgynyň entek oýnadyp bolýan nusgasy ýok.',
  },
  ta: {
    'player.videoUnsupported': 'உங்கள் உலாவியால் இந்தக் காணொளியை இயக்க முடியவில்லை.',
    'player.audioUnsupported': 'உங்கள் உலாவியால் இந்த ஒலியை இயக்க முடியவில்லை.',
    'player.openVideo': 'காணொளியை நேரடியாகத் திறக்கவும்',
    'player.openAudio': 'ஒலியை நேரடியாகத் திறக்கவும்',
    'player.speed': 'வேகம்',
    'player.slower': 'மெதுவாக',
    'player.faster': 'வேகமாக',
    'player.loopFrom': 'இங்கிருந்து திரும்பத் திரும்ப இயக்கு',
    'player.loopTo': 'இதுவரை',
    'player.loopStop': 'திரும்ப இயக்குவதை நிறுத்து',
    'player.loopOpenEnd':
      '{from} இலிருந்து திரும்பத் திரும்ப இயங்குகிறது — எங்கு முடிகிறது என்பதைக் குறிக்கவும்.',
    'player.loopOpenStart':
      '{to} வரை திரும்பத் திரும்ப இயங்குகிறது — எங்கு தொடங்குகிறது என்பதைக் குறிக்கவும்.',
    'player.loopBackwards': 'அந்தப் பகுதி தொடங்குவதற்கு முன்பே முடிகிறது. மீண்டும் குறிக்கவும்.',
    'player.loopBoth': '{from} – {to} திரும்பத் திரும்ப இயங்குகிறது.',
    'player.resuming': '{at} இலிருந்து தொடர்கிறது.',
    'player.checking': 'நீங்கள் சேமித்த இடம் சரிபார்க்கப்படுகிறது…',
    'player.legacyGroup': 'முழுப் பாடத்திற்கான முந்தைய இடம்',
    'player.legacyPlace':
      'முழுப் பாடத்திற்காக முன்பு சேமிக்கப்பட்ட ஓர் இடம் {at}. அது வேறொரு ஒலி-ஒளிப் பதிவுக்குரியதாக இருக்கலாம். அதை இங்கே பார்த்துக்கொள்ளலாம்; நீங்கள் தேர்ந்தெடுக்காமல் அது இந்தப் பதிவின் சேமித்த இடத்தை மாற்றாது.',
    'player.limit': 'இயக்கி 24 மணிநேரத்தைத் தாண்ட முடியாது.',
    'player.legacyReview': 'முந்தைய இடத்தைப் பார்க்கவும்',
    'player.notNow': 'இப்போது வேண்டாம்',
    'player.recoveryToggle': 'இந்த உலாவியில் தற்காலிக மீட்பு இடத்தை வைத்திரு',
    'player.recoveryNotice':
      'விருப்பத்திற்குரியது. இந்த உலாவி சுயவிவரத்தை அணுகக்கூடிய எவரும் கணக்கு, பாடநெறிச் சேர்க்கை, பாடம் மற்றும் ஒலி-ஒளிப் பதிவு ஆகியவற்றின் அடையாளங்காட்டிகள், அமர்வு அடையாளங்காட்டிகள், இடங்கள் மற்றும் நேரமுத்திரைகளைப் பார்க்கலாம்; இதைப் பயன்படுத்தும் பிற கணக்குகளுடையவையும் இதில் அடங்கும். இதை அணைத்தால் இந்த உலாவியிலுள்ள எல்லாக் கணக்குகளின் மீட்பு இடங்களும் நீக்கப்படும். ஓர் இடத்தைச் சேமிப்பதற்கு முன் உங்கள் கணக்கு இணையத்தில் உறுதிப்படுத்தப்பட வேண்டும். சேமித்த தகவல்கள் ஏழு நாட்களுக்குப் பிறகு காலாவதியாகி, பின்னர் வரும்போது அழிக்கப்படும்; சேமிப்பகம் கிடைக்காமல் போகலாம் அல்லது முன்னதாகவே அழிக்கப்படலாம்.',
    'player.earlierGroup': 'சாதனத்தில் முழுப் பாடத்திற்கான முந்தைய இடங்கள்',
    'player.earlierIntro':
      'சாதனத்திலுள்ள இந்தப் பழைய இடங்கள் ஒரு குறிப்பிட்ட ஒலி-ஒளிப் பதிவுக்காக அல்ல, முழுப் பாடத்திற்காகச் சேமிக்கப்பட்டவை. அவை வேறொரு பதிவுக்குரியவையாக இருக்கலாம். ஒன்றை இங்கே பார்க்கவும் அல்லது கைவிடவும்; பார்ப்பதால் உங்கள் இன்னொரு தேர்வு இல்லாமல் கணக்கின் இடம் மாறாது.',
    'player.earlierReview': 'சாதனத்தின் முந்தைய இடத்தைப் பார்க்கவும்',
    'player.earlierReviewLabel': 'சாதனத்தின் முந்தைய இடம் {at} ஐப் பார்க்கவும், {when}',
    'player.earlierDiscard': 'முந்தைய இடத்தைக் கைவிடவும்',
    'player.earlierDiscardLabel': 'சாதனத்தின் முந்தைய இடம் {at} ஐக் கைவிடவும், {when}',
    'player.deviceGroup': 'சாதனத்திலுள்ள மீட்பு இடங்கள்',
    'player.deviceIntro':
      'இந்த உலாவியிலுள்ள ஓர் இடம் உங்கள் கணக்கைச் சென்றடையாமல் இருக்கலாம். தானியங்கிச் சேமிப்பு தொடர்வதற்கு முன் ஒவ்வோர் இடத்தையும் பார்க்கவும் அல்லது கைவிடவும். ஒன்றைத் தேர்ந்தெடுத்தால் மற்றவை பின்னர் வரும்போது பார்ப்பதற்காக இருக்கும்.',
    'player.deviceReview': 'இந்த இடத்தைப் பார்க்கவும்',
    'player.deviceReviewLabel': 'சாதன இடம் {at} ஐப் பார்க்கவும், {when}',
    'player.deviceDiscard': 'கைவிடு',
    'player.deviceDiscardLabel': 'சாதன இடம் {at} ஐக் கைவிடவும், {when}',
    'player.conflictGroup': 'நீங்கள் சேமித்த இடத்தைத் தேர்ந்தெடுக்கவும்',
    'player.conflictIntro': 'கணக்கில் சேமித்த இடம் இந்த இயக்கியிலிருந்து வேறுபடலாம்.',
    'player.conflictNone': 'சேமித்த இடம் இல்லை.',
    'player.conflictSaved': 'சேமித்த இடம்: {at}.',
    'player.conflictLocal': 'இந்த இயக்கி: {at}. எதை வைத்திருக்க வேண்டும்?',
    'player.useSaved': 'சேமித்த இடத்தைப் பயன்படுத்து',
    'player.keepLocal': 'இந்த இயக்கியின் இடத்தை வைத்திரு',
    'player.storeClearFailed':
      'சாதனச் சேமிப்பகத்தை அழிக்க முடியவில்லை. உங்கள் உலாவியின் சேமிப்பக அமைப்புகளைப் பார்க்கவும்.',
    'player.storeSaveFailed': 'இந்தச் சாதனத்தில் மீட்பு இடத்தைச் சேமிக்க முடியவில்லை.',
    'player.storeUnavailable': 'இந்த உலாவியில் மீட்புச் சேமிப்பகம் கிடைக்கவில்லை.',
    'player.storeReadFailed':
      'சாதனத்தின் முந்தைய இடங்களைப் படிக்க முடியவில்லை. உங்கள் உலாவியின் சேமிப்பக அமைப்புகளைப் பார்க்கவும்.',
    'player.earlierClearFailed':
      'சாதனத்தின் முந்தைய இடத்தை அழிக்க முடியவில்லை. உங்கள் உலாவியின் சேமிப்பக அமைப்புகளைப் பார்க்கவும்.',
    'player.unconfirmed':
      'நீங்கள் சேமித்த இடத்தை உறுதிப்படுத்த முடியவில்லை. சேமிப்பைத் தொடர்வதற்கு முன் சரிபார்க்க, பாடத்தை மீண்டும் ஏற்றவும்.',
    'player.loadFailed':
      'நீங்கள் சேமித்த இடத்தை ஏற்ற முடியவில்லை. இந்தப் பாடத்தை இயக்கலாம், ஆனால் மீண்டும் ஏற்றும் வரை சேமிப்பு கிடைக்காது.',
    'player.turnedOff':
      'மீட்பு இந்த உலாவியின் வேறோர் இடத்திலிருந்து அணைக்கப்பட்டது அல்லது அழிக்கப்பட்டது.',
    'player.storeCheckFailed': 'இந்த உலாவியில் மீட்புச் சேமிப்பகத்தைச் சரிபார்க்க முடியவில்லை.',
    'player.legacyBusy':
      'பழைய இடத்தைப் பார்ப்பதற்கு முன், தற்போதைய சேமிப்பு அல்லது மீட்புத் தேர்வை முடிக்கவும்.',
    'player.legacyWait': 'பழைய இடத்தைப் பார்ப்பதற்கு முன், பதிவு ஏறும் வரை காத்திருக்கவும்.',
    'player.legacyBeyond':
      'பழைய இடம் இந்தப் பதிவின் முடிவைத் தாண்டி உள்ளது. அது வேறொரு பதிவுக்குரியதாக இருக்கலாம்.',
    'player.legacySeekFailed':
      'பழைய இடத்திற்குச் செல்ல முடியவில்லை. பதிவு தயாரானதும் மீண்டும் முயலுங்கள்.',
    'player.earlierRemoveFailed': 'சாதனத்தின் முந்தைய இடத்தை நீக்க முடியவில்லை.',
    'player.earlierBusy':
      'சாதனத்தின் முந்தைய இடத்தைப் பார்ப்பதற்கு முன், தற்போதைய சேமிப்பு அல்லது மீட்புத் தேர்வை முடிக்கவும்.',
    'player.earlierWait':
      'சாதனத்தின் முந்தைய இடத்தைப் பார்ப்பதற்கு முன், பதிவு ஏறும் வரை காத்திருக்கவும்.',
    'player.earlierChanged':
      'சாதனத்தின் முந்தைய இடம் மாறிவிட்டது. புதுப்பிக்கப்பட்ட பட்டியலைப் பார்க்கவும்.',
    'player.earlierBeyond':
      'சாதனத்தின் முந்தைய இடம் இந்தப் பதிவின் முடிவைத் தாண்டி உள்ளது. அது வேறொரு பதிவுக்குரியதாக இருக்கலாம்.',
    'player.earlierSeekFailed': 'சாதனத்தின் முந்தைய இடத்திற்குச் செல்ல முடியவில்லை.',
    'player.earlierReadFailed': 'சாதனத்தின் முந்தைய இடத்தைப் படிக்க முடியவில்லை.',
    'player.needConfirmed':
      'உங்கள் கணக்கு உறுதிப்படுத்தப்படும் வரை மீட்பு ஓர் இடத்தைக் குறித்துவைக்க முடியாது. இணைப்பு கிடைத்ததும் மீண்டும் ஏற்றவும்.',
    'player.storeChangeFailed':
      'சாதனச் சேமிப்பகத்தை மாற்றவோ முழுமையாக அழிக்கவோ முடியவில்லை. உங்கள் உலாவியின் சேமிப்பக அமைப்புகளைப் பார்க்கவும்.',
    'player.deviceRemoveFailed': 'இந்த மீட்பு இடத்தைச் சாதனத்திலிருந்து நீக்க முடியவில்லை.',
    'player.deviceChanged': 'சாதன இடம் மாறிவிட்டது. புதுப்பிக்கப்பட்ட பட்டியலைப் பார்க்கவும்.',
    'player.othersRemain':
      'சாதனத்திலுள்ள பிற மீட்பு இடங்கள் இருந்தால், இந்தப் பாடத்தை மீண்டும் திறக்கும்போது அவை கிடைக்கும்.',
    'player.deviceUseFailed':
      'இந்தச் சாதன இடத்தைப் பயன்படுத்த முடியவில்லை. ஊடகம் ஏறிய பிறகு மீண்டும் முயலுங்கள்.',
    'player.quality': 'தரம்',
    'player.qualityStandard': '480p — வழக்கமான',
    'player.qualitySmall': '360p — சிறிய',
    'player.qualityAudio': 'ஒலி மட்டும்',
    'player.saving': 'சேமிக்கப்படுகிறது…',
    'player.saveDevice': 'இந்தச் சாதனத்தில் சேமி',
    'player.onDevice': 'இந்தச் சாதனத்தில் உள்ளது',
    'player.seePlus': 'Plus இல் என்ன அடங்கும் என்று பார்க்கவும்',
    'player.plusNote': 'பாடத்தைச் சாதனத்தில் சேமிப்பது Plus திட்டத்தின் ஒரு பகுதி.',
    'player.tryAgain': 'மீண்டும் முயலுங்கள்',
    'player.preparing': 'இயக்கி தயாராகிறது…',
    'player.linksNote':
      'இயக்க இணைப்புகள் குறுகிய காலத்திற்கு மட்டுமே செல்லும்; அவை இந்தப் பாடத்திற்கான உங்கள் அணுகலுடன் பிணைக்கப்பட்டவை.',
    'player.savedNote':
      'சேமித்த பாடம் செயலிக்குள்ளேயே இருக்கும், ஆனால் தற்போது ஒவ்வொரு முறை திறக்கும்போதும் அணுகலைச் சரிபார்க்க இணைப்பு தேவை.',
    'player.playFailed': 'அந்தப் பாடத்தை இயக்க முடியவில்லை.',
    'player.saveRefused': 'இந்தத் திட்டத்தில் இந்தப் பாடத்தைச் சேமிக்க முடியாது.',
    'player.fetchFailed': 'சேமிப்பதற்காக அந்தப் பாடத்தைப் பெற முடியவில்லை.',
    'player.saveFailed': 'அந்தப் பாடத்தைச் சேமிக்க முடியவில்லை.',
    'player.noCopy': 'இந்தப் பதிவுக்கு இயக்கக்கூடிய நகல் இன்னும் இல்லை.',
  },
  ne: {
    'player.videoUnsupported': 'तपाईंको ब्राउजरले यो भिडियो चलाउन सक्दैन।',
    'player.audioUnsupported': 'तपाईंको ब्राउजरले यो अडियो चलाउन सक्दैन।',
    'player.openVideo': 'भिडियो सिधै खोल्नुहोस्',
    'player.openAudio': 'अडियो सिधै खोल्नुहोस्',
    'player.speed': 'गति',
    'player.slower': 'अझ ढिलो',
    'player.faster': 'अझ छिटो',
    'player.loopFrom': 'यहाँबाट दोहोर्‍याउनुहोस्',
    'player.loopTo': 'यहाँसम्म',
    'player.loopStop': 'दोहोर्‍याउन रोक्नुहोस्',
    'player.loopOpenEnd': '{from} बाट दोहोरिँदै छ — कहाँ सकिन्छ चिनो लगाउनुहोस्।',
    'player.loopOpenStart': '{to} सम्म दोहोरिँदै छ — कहाँबाट सुरु हुन्छ चिनो लगाउनुहोस्।',
    'player.loopBackwards': 'त्यो अंश सुरु हुनुअघि नै सकिन्छ। फेरि चिनो लगाउनुहोस्।',
    'player.loopBoth': '{from} – {to} दोहोरिँदै छ।',
    'player.resuming': '{at} बाट फेरि सुरु हुँदै छ।',
    'player.checking': 'तपाईंको सुरक्षित गरिएको ठाउँ जाँचिँदै छ…',
    'player.legacyGroup': 'पूरै पाठका लागि पहिले सुरक्षित गरिएको ठाउँ',
    'player.legacyPlace':
      'पूरै पाठका लागि पहिले सुरक्षित गरिएको एउटा ठाउँ {at} हो। यो अर्कै रेकर्डिङको हुन सक्छ। तपाईं यसलाई यहाँ हेर्न सक्नुहुन्छ; तपाईंले नरोजेसम्म यसले यस रेकर्डिङको सुरक्षित ठाउँलाई प्रतिस्थापन गर्दैन।',
    'player.limit': 'प्लेयर २४ घण्टाभन्दा अगाडि जान सक्दैन।',
    'player.legacyReview': 'पहिलेको ठाउँ हेर्नुहोस्',
    'player.notNow': 'अहिले होइन',
    'player.recoveryToggle': 'यस ब्राउजरमा अस्थायी रिकभरी ठाउँ राख्नुहोस्',
    'player.recoveryNotice':
      'ऐच्छिक। यस ब्राउजर प्रोफाइलमा पहुँच भएको जोसुकैले खाता, भर्ना, पाठ र रेकर्डिङका पहिचानकर्ता, सत्रका पहिचानकर्ता, ठाउँहरू र समय देख्न सक्छ, यसलाई प्रयोग गर्ने अन्य खाताका पनि। यो बन्द गर्दा यस ब्राउजरका सबै खाताका रिकभरी ठाउँहरू हट्छन्। कुनै ठाउँ सुरक्षित गर्नुअघि तपाईंको खाता अनलाइन पुष्टि हुनुपर्छ। रेकर्डहरूको म्याद सात दिनपछि सकिन्छ र पछिको कुनै भ्रमणमा मेटिन्छन्; भण्डारण उपलब्ध नहुन सक्छ वा चाँडै मेटिन सक्छ।',
    'player.earlierGroup': 'डिभाइसमा पूरै पाठका लागि पहिलेका ठाउँहरू',
    'player.earlierIntro':
      'डिभाइसका यी पुराना ठाउँहरू कुनै खास रेकर्डिङका लागि होइन, पूरै पाठका लागि सुरक्षित गरिएका थिए। यी अर्कै रेकर्डिङका हुन सक्छन्। एउटालाई यहाँ हेर्नुहोस् वा हटाउनुहोस्; हेर्दैमा तपाईंको अर्को रोजाइबिना खाताको ठाउँ बदलिँदैन।',
    'player.earlierReview': 'डिभाइसको पहिलेको ठाउँ हेर्नुहोस्',
    'player.earlierReviewLabel': 'डिभाइसको पहिलेको ठाउँ {at} हेर्नुहोस्, {when} को',
    'player.earlierDiscard': 'पहिलेको ठाउँ हटाउनुहोस्',
    'player.earlierDiscardLabel': 'डिभाइसको पहिलेको ठाउँ {at} हटाउनुहोस्, {when} को',
    'player.deviceGroup': 'डिभाइसमा रिकभरी ठाउँहरू',
    'player.deviceIntro':
      'यस ब्राउजरको कुनै ठाउँ तपाईंको खातामा नपुगेको हुन सक्छ। स्वचालित सुरक्षण जारी हुनुअघि प्रत्येक ठाउँ हेर्नुहोस् वा हटाउनुहोस्। एउटा रोज्दा अरू ठाउँहरू पछिको भ्रमणका लागि रहन्छन्।',
    'player.deviceReview': 'यो ठाउँ हेर्नुहोस्',
    'player.deviceReviewLabel': 'डिभाइसको ठाउँ {at} हेर्नुहोस्, {when} को',
    'player.deviceDiscard': 'हटाउनुहोस्',
    'player.deviceDiscardLabel': 'डिभाइसको ठाउँ {at} हटाउनुहोस्, {when} को',
    'player.conflictGroup': 'आफ्नो सुरक्षित ठाउँ रोज्नुहोस्',
    'player.conflictIntro': 'खाताको सुरक्षित ठाउँ यस प्लेयरको भन्दा फरक हुन सक्छ।',
    'player.conflictNone': 'कुनै सुरक्षित ठाउँ छैन।',
    'player.conflictSaved': 'सुरक्षित ठाउँ: {at}।',
    'player.conflictLocal': 'यो प्लेयर: {at}। कुन राख्ने?',
    'player.useSaved': 'सुरक्षित ठाउँ प्रयोग गर्नुहोस्',
    'player.keepLocal': 'यस प्लेयरको ठाउँ राख्नुहोस्',
    'player.storeClearFailed':
      'डिभाइसको भण्डारण खाली गर्न सकिएन। आफ्नो ब्राउजरको भण्डारण सेटिङ जाँच्नुहोस्।',
    'player.storeSaveFailed': 'यस डिभाइसमा रिकभरी ठाउँ सुरक्षित गर्न सकिएन।',
    'player.storeUnavailable': 'यस ब्राउजरमा रिकभरी भण्डारण उपलब्ध छैन।',
    'player.storeReadFailed':
      'डिभाइसका पहिलेका ठाउँहरू पढ्न सकिएन। आफ्नो ब्राउजरको भण्डारण सेटिङ जाँच्नुहोस्।',
    'player.earlierClearFailed':
      'डिभाइसको पहिलेको ठाउँ खाली गर्न सकिएन। आफ्नो ब्राउजरको भण्डारण सेटिङ जाँच्नुहोस्।',
    'player.unconfirmed':
      'तपाईंको सुरक्षित ठाउँ पुष्टि गर्न सकिएन। सुरक्षण जारी राख्नुअघि जाँच्न पाठ फेरि लोड गर्नुहोस्।',
    'player.loadFailed':
      'तपाईंको सुरक्षित ठाउँ लोड गर्न सकिएन। तपाईं यो पाठ चलाउन सक्नुहुन्छ, तर फेरि लोड नगरेसम्म सुरक्षण उपलब्ध हुँदैन।',
    'player.turnedOff': 'रिकभरी यस ब्राउजरको अन्यत्रबाट बन्द गरियो वा मेटियो।',
    'player.storeCheckFailed': 'यस ब्राउजरमा रिकभरी भण्डारण जाँच्न सकिएन।',
    'player.legacyBusy': 'पुरानो ठाउँ हेर्नुअघि हालको सुरक्षण वा रिकभरीको रोजाइ पूरा गर्नुहोस्।',
    'player.legacyWait': 'पुरानो ठाउँ हेर्नुअघि रेकर्डिङ लोड हुन्जेल पर्खनुहोस्।',
    'player.legacyBeyond':
      'पुरानो ठाउँ यस रेकर्डिङको अन्त्यभन्दा पर छ। यो अर्कै रेकर्डिङको हुन सक्छ।',
    'player.legacySeekFailed':
      'पुरानो ठाउँमा जान सकिएन। रेकर्डिङ तयार भएपछि फेरि प्रयास गर्नुहोस्।',
    'player.earlierRemoveFailed': 'डिभाइसको पहिलेको ठाउँ हटाउन सकिएन।',
    'player.earlierBusy':
      'डिभाइसको पहिलेको कुनै ठाउँ हेर्नुअघि हालको सुरक्षण वा रिकभरीको रोजाइ पूरा गर्नुहोस्।',
    'player.earlierWait': 'डिभाइसको पहिलेको ठाउँ हेर्नुअघि रेकर्डिङ लोड हुन्जेल पर्खनुहोस्।',
    'player.earlierChanged': 'डिभाइसको पहिलेको ठाउँ बदलियो। अद्यावधिक सूची हेर्नुहोस्।',
    'player.earlierBeyond':
      'डिभाइसको पहिलेको ठाउँ यस रेकर्डिङको अन्त्यभन्दा पर छ। यो अर्कै रेकर्डिङको हुन सक्छ।',
    'player.earlierSeekFailed': 'डिभाइसको पहिलेको ठाउँमा जान सकिएन।',
    'player.earlierReadFailed': 'डिभाइसको पहिलेको ठाउँ पढ्न सकिएन।',
    'player.needConfirmed':
      'तपाईंको खाता पुष्टि नभएसम्म रिकभरीले ठाउँ टिप्न सक्दैन। जडान भएपछि फेरि लोड गर्नुहोस्।',
    'player.storeChangeFailed':
      'डिभाइसको भण्डारण बदल्न वा पूरै खाली गर्न सकिएन। आफ्नो ब्राउजरको भण्डारण सेटिङ जाँच्नुहोस्।',
    'player.deviceRemoveFailed': 'यो रिकभरी ठाउँ डिभाइसबाट हटाउन सकिएन।',
    'player.deviceChanged': 'डिभाइसको ठाउँ बदलियो। अद्यावधिक सूची हेर्नुहोस्।',
    'player.othersRemain': 'डिभाइसका अन्य रिकभरी ठाउँहरू, भएमा, यो पाठ फेरि खोल्दा उपलब्ध रहन्छन्।',
    'player.deviceUseFailed':
      'डिभाइसको यो ठाउँ प्रयोग गर्न सकिएन। मिडिया लोड भएपछि फेरि प्रयास गर्नुहोस्।',
    'player.quality': 'गुणस्तर',
    'player.qualityStandard': '480p — सामान्य',
    'player.qualitySmall': '360p — सानो',
    'player.qualityAudio': 'अडियो मात्र',
    'player.saving': 'सुरक्षित गरिँदै छ…',
    'player.saveDevice': 'यस डिभाइसमा सुरक्षित गर्नुहोस्',
    'player.onDevice': 'यस डिभाइसमा छ',
    'player.seePlus': 'Plus मा के-के छ हेर्नुहोस्',
    'player.plusNote': 'पाठलाई डिभाइसमा सुरक्षित गर्नु Plus योजनाको हिस्सा हो।',
    'player.tryAgain': 'फेरि प्रयास गर्नुहोस्',
    'player.preparing': 'प्लेयर तयार हुँदै छ…',
    'player.linksNote':
      'चलाउने लिङ्कहरू छोटो समयका हुन्छन् र यस पाठमा तपाईंको पहुँचसँग जोडिएका हुन्छन्।',
    'player.savedNote':
      'सुरक्षित गरिएको पाठ एपभित्रै रहन्छ, तर अहिले हरेक पटक खोल्दा पहुँच जाँच्न जडान चाहिन्छ।',
    'player.playFailed': 'त्यो पाठ चलाउन सकिएन।',
    'player.saveRefused': 'यो पाठ यस योजनामा सुरक्षित गर्न सकिँदैन।',
    'player.fetchFailed': 'सुरक्षित गर्नका लागि त्यो पाठ ल्याउन सकिएन।',
    'player.saveFailed': 'त्यो पाठ सुरक्षित गर्न सकिएन।',
    'player.noCopy': 'यस रेकर्डिङको अहिलेसम्म चलाउन मिल्ने प्रति छैन।',
  },
};
