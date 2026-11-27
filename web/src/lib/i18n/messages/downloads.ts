import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The lessons kept on this device: the list a browser reads from its own
 * storage, the player's refusals, and the devices that hold saved lessons.
 *
 * Written on 2026-11-27, in the same twenty-seven languages as the
 * dashboard. **Written by the people who built the site and read by no
 * speaker.**
 *
 * Most of these are said by the browser, from words the page hands it; none
 * is in a script. `{count}` and `{days}` are numbers already in the reader's
 * digits and each follows a colon, so no language has to agree a noun with
 * one. `{size}` is a number with KB, MB or GB after it, and `{day}` is a
 * date. "Plus" is the plan's name and stays as it is written.
 */
export const DOWNLOADS: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'downloads.title': 'على هذا الجهاز',
    'downloads.lede':
      'الدروس التي حفظتها لاستخدامها بلا اتصال. تبقى داخل هذا التطبيق، لا في مدير الملفات على جهازك. في الوقت الحالي يلزم اتصال لفتح هذه الصفحة وللتحقق من صلاحية الوصول قبل كل تشغيل؛ أما التسجيل نفسه فمخزَّن هنا.',
    'downloads.paused':
      'الحفظ الجديد غير متاح الآن. الدرس المحفوظ من قبل يمكن فتحه ما دامت دورته وخطة Plus وتاريخ النسخة المحفوظة كلها سارية.',
    'downloads.plusNote':
      'الحفظ يحتاج إلى خطة Plus. الدرس المحفوظ ليس نسخة تملكها: يبقى ما بقيت الخطة، ثم يطلب التحديث.',
    'downloads.back': 'العودة إلى تعلّمي',
    'downloads.storageRefused': 'لم يفتح هذا المتصفح مساحة التخزين الخاصة بالتطبيق.',
    'downloads.looking': 'جارٍ النظر في ما على هذا الجهاز…',
    'downloads.empty':
      'لا شيء محفوظ على هذا الجهاز. الدرس الذي تحفظه يظهر هنا لا في مكان آخر: ليس في مجلد التنزيلات على هاتفك.',
    'downloads.count': 'الدروس على هذا الجهاز: {count}',
    'downloads.space': 'المساحة المستخدمة: {size}',
    'downloads.closePlayer': 'إغلاق المشغّل',
    'downloads.badgeLapsed': 'يحتاج إلى تحديث',
    'downloads.badgeSaved': 'محفوظ على هذا الجهاز',
    'downloads.lapsed': 'انتهت صلاحية هذه النسخة المحفوظة. افتح الدرس وأنت متصل لتحفظه من جديد.',
    'downloads.daysLeft': 'الأيام المتبقية: {days}',
    'downloads.play': 'تشغيل',
    'downloads.opening': 'جارٍ الفتح…',
    'downloads.remove': 'إزالة',
    'downloads.removing': 'جارٍ الإزالة…',
    'downloads.removeLocal': 'إزالة النسخة التي على هذا الجهاز فقط',
    'downloads.gone': 'لم يعد ذلك الدرس على هذا الجهاز.',
    'downloads.openFailed': 'تعذّر فتح ذلك الدرس المحفوظ.',
    'downloads.needConnection': 'اتصل بالإنترنت لفتح هذا الدرس المحفوظ والتحقق من صلاحية الوصول.',
    'downloads.notAllowed': 'لم يعد هذا الدرس المحفوظ متاحًا لهذا الحساب أو لهذه الخطة.',
    'downloads.removedCopy': 'أُزيلت هذه النسخة المحفوظة ولم يعد فتحها ممكنًا.',
    'downloads.signIn': 'سجّل الدخول لفتح درس محفوظ.',
    'downloads.removeUnconfirmed':
      'تعذّر تأكيد الإزالة مع الخادم. أعد الاتصال وحاول مرة أخرى؛ النسخة التي على هذا الجهاز ما زالت هنا.',
    'downloads.removeLocalFailed':
      'سجّل الخادم الإزالة، لكن هذا المتصفح لم يستطع إزالة نسخته. حاول مرة أخرى، أو أزل النسخة التي على هذا الجهاز فقط.',
    'downloads.confirmLocal':
      'هل تزيل النسخة التي على هذا الجهاز فقط؟ يبقى سجل الخادم، ولا يُفرَّغ مكان أي جهاز.',
    'downloads.localRemoved': 'أُزيلت النسخة التي على هذا الجهاز. قد يبقى سجل الخادم ومكان الجهاز.',
    'downloads.localFailed': 'لم يستطع هذا المتصفح إزالة النسخة التي على هذا الجهاز.',
    'downloads.devTitle': 'الأجهزة التي فيها دروس محفوظة',
    'downloads.devLede':
      'أزل جهازًا لتفريغ مكانه وإنهاء ما حُفظ له على الخادم. لا يمكن من هنا حذف النسخ أو المفاتيح التي بقيت على ذلك الجهاز.',
    'downloads.devLoading': 'جارٍ تحميل الأجهزة…',
    'downloads.devUnread': 'تعذّر تحميل قائمة الأجهزة. لا تعدّها فارغة.',
    'downloads.devRefresh': 'تحديث',
    'downloads.devNone': 'لا توجد أجهزة في القائمة الآن.',
    'downloads.devUnnamed': 'جهاز بلا اسم',
    'downloads.devSaved': 'الدروس المحفوظة: {count}',
    'downloads.devSeen': 'آخر ظهور: {day}',
    'downloads.devRemove': 'إزالة الجهاز',
    'downloads.devConfirm':
      'هل تزيل هذا الجهاز؟ ستتوقف دروسه المحفوظة عن الفتح عبر التطبيق. لا يمكن بذلك محو النسخ التي على الجهاز ولا استرجاع المفاتيح التي يحتفظ بها.',
    'downloads.devUnconfirmed':
      'تعذّر تأكيد إزالة الجهاز. حدّث القائمة وحاول مرة أخرى؛ ربما أزاله ردّ لم يصل.',
    'downloads.devRemoved': 'سجّل الخادم إزالة الجهاز. النسخ والمفاتيح التي على ذلك الجهاز لم تُمحَ من هنا.',
    'downloads.devRemovedUnrefreshed': 'سجّل الخادم الإزالة، لكن تعذّر تحديث قائمة الأجهزة.',
  },
  ur: {
    'downloads.title': 'اس آلے پر',
    'downloads.lede':
      'وہ اسباق جو آپ نے آف لائن استعمال کے لیے محفوظ کیے۔ یہ اسی ایپ کے اندر رہتے ہیں، آپ کے آلے کے فائل مینیجر میں نہیں۔ فی الحال اس صفحے کو کھولنے اور ہر بار چلانے سے پہلے رسائی جانچنے کے لیے کنکشن درکار ہے؛ ریکارڈنگ خود یہیں محفوظ ہے۔',
    'downloads.paused':
      'نئے اسباق محفوظ کرنا اس وقت کھلا نہیں۔ پہلے سے محفوظ سبق تب تک کھولا جا سکتا ہے جب تک اس کا کورس، Plus پلان اور محفوظ نقل کی تاریخ سب برقرار ہیں۔',
    'downloads.plusNote':
      'محفوظ کرنے کے لیے Plus پلان ضروری ہے۔ محفوظ سبق ایسی نقل نہیں جس کے آپ مالک ہوں: یہ پلان کے رہنے تک رہتا ہے، پھر تازہ کرنے کو کہتا ہے۔',
    'downloads.back': 'میری تعلیم پر واپس',
    'downloads.storageRefused': 'اس براؤزر نے ایپ کا اسٹوریج نہیں کھولا۔',
    'downloads.looking': 'دیکھا جا رہا ہے کہ اس آلے پر کیا ہے…',
    'downloads.empty':
      'اس آلے پر کچھ محفوظ نہیں۔ جو سبق آپ محفوظ کریں وہ یہیں نظر آتا ہے اور کہیں نہیں: وہ آپ کے فون کے ڈاؤن لوڈز فولڈر میں نہیں ہوتا۔',
    'downloads.count': 'اس آلے پر اسباق: {count}',
    'downloads.space': 'استعمال شدہ جگہ: {size}',
    'downloads.closePlayer': 'پلیئر بند کریں',
    'downloads.badgeLapsed': 'تازہ کرنا ضروری ہے',
    'downloads.badgeSaved': 'اس آلے پر محفوظ',
    'downloads.lapsed':
      'اس محفوظ نقل کی مدت ختم ہو گئی ہے۔ دوبارہ محفوظ کرنے کے لیے آن لائن ہو کر سبق کھولیں۔',
    'downloads.daysLeft': 'باقی دن: {days}',
    'downloads.play': 'چلائیں',
    'downloads.opening': 'کھل رہا ہے…',
    'downloads.remove': 'ہٹائیں',
    'downloads.removing': 'ہٹایا جا رہا ہے…',
    'downloads.removeLocal': 'صرف اس آلے والی نقل ہٹائیں',
    'downloads.gone': 'وہ سبق اب اس آلے پر نہیں رہا۔',
    'downloads.openFailed': 'وہ محفوظ سبق کھولا نہیں جا سکا۔',
    'downloads.needConnection': 'اس محفوظ سبق کو کھولنے اور رسائی جانچنے کے لیے انٹرنیٹ سے جڑیں۔',
    'downloads.notAllowed': 'یہ محفوظ سبق اب اس اکاؤنٹ یا پلان کے لیے دستیاب نہیں۔',
    'downloads.removedCopy': 'یہ محفوظ نقل ہٹا دی گئی تھی اور اب کھولی نہیں جا سکتی۔',
    'downloads.signIn': 'محفوظ سبق کھولنے کے لیے سائن اِن کریں۔',
    'downloads.removeUnconfirmed':
      'سرور کے ساتھ ہٹانے کی تصدیق نہیں ہو سکی۔ دوبارہ جڑیں اور پھر کوشش کریں؛ اس آلے والی نقل ابھی یہیں ہے۔',
    'downloads.removeLocalFailed':
      'سرور نے ہٹانا درج کر لیا، مگر یہ براؤزر اپنی نقل نہیں ہٹا سکا۔ دوبارہ کوشش کریں، یا صرف اس آلے والی نقل ہٹائیں۔',
    'downloads.confirmLocal':
      'کیا صرف اس آلے والی نقل ہٹائی جائے؟ سرور کا ریکارڈ باقی رہتا ہے، اور کسی آلے کی جگہ خالی نہیں ہوتی۔',
    'downloads.localRemoved': 'اس آلے والی نقل ہٹا دی گئی۔ سرور کا ریکارڈ اور آلے کی جگہ باقی رہ سکتی ہے۔',
    'downloads.localFailed': 'یہ براؤزر اس آلے والی نقل نہیں ہٹا سکا۔',
    'downloads.devTitle': 'وہ آلات جن میں محفوظ اسباق ہیں',
    'downloads.devLede':
      'کسی آلے کو ہٹائیں تاکہ اس کی جگہ خالی ہو اور سرور پر اس کے محفوظ اسباق ختم ہوں۔ اس آلے پر پہلے سے رکھی نقلیں یا کنجیاں یہاں سے حذف نہیں کی جا سکتیں۔',
    'downloads.devLoading': 'آلات لوڈ ہو رہے ہیں…',
    'downloads.devUnread': 'آلات کی فہرست لوڈ نہیں ہو سکی۔ اسے خالی نہ سمجھیں۔',
    'downloads.devRefresh': 'تازہ کریں',
    'downloads.devNone': 'اس وقت فہرست میں کوئی آلہ نہیں۔',
    'downloads.devUnnamed': 'بے نام آلہ',
    'downloads.devSaved': 'محفوظ اسباق: {count}',
    'downloads.devSeen': 'آخری بار دیکھا گیا: {day}',
    'downloads.devRemove': 'آلہ ہٹائیں',
    'downloads.devConfirm':
      'کیا یہ آلہ ہٹایا جائے؟ اس کے محفوظ اسباق ایپ کے ذریعے کھلنا بند ہو جائیں گے۔ اس سے آلے پر موجود نقلیں مٹ نہیں سکتیں اور نہ وہ کنجیاں واپس لی جا سکتی ہیں جو اس کے پاس ہیں۔',
    'downloads.devUnconfirmed':
      'آلہ ہٹانے کی تصدیق نہیں ہو سکی۔ فہرست تازہ کریں اور دوبارہ کوشش کریں؛ ممکن ہے گم ہونے والے جواب نے اسے ہٹا دیا ہو۔',
    'downloads.devRemoved':
      'سرور نے آلے کا ہٹانا درج کر لیا۔ اس آلے پر رکھی نقلیں اور کنجیاں یہاں سے نہیں مٹائی گئیں۔',
    'downloads.devRemovedUnrefreshed': 'سرور نے ہٹانا درج کر لیا، مگر آلات کی فہرست تازہ نہیں ہو سکی۔',
  },
  fa: {
    'downloads.title': 'روی این دستگاه',
    'downloads.lede':
      'درس‌هایی که برای استفادهٔ آفلاین ذخیره کرده‌اید. این‌ها درون همین برنامه نگه داشته می‌شوند، نه در مدیر فایل دستگاه شما. فعلاً برای باز کردن این صفحه و بررسی دسترسی پیش از هر پخش، اتصال لازم است؛ خودِ ضبط همین‌جا ذخیره شده است.',
    'downloads.paused':
      'ذخیرهٔ تازه اکنون باز نیست. درسی که از پیش ذخیره شده تا وقتی دوره‌اش، طرح Plus و تاریخ نسخهٔ ذخیره‌شده همه معتبرند باز می‌شود.',
    'downloads.plusNote':
      'ذخیره کردن به طرح Plus نیاز دارد. درس ذخیره‌شده نسخه‌ای نیست که مالکش باشید: تا وقتی طرح هست می‌ماند و سپس تازه‌سازی می‌خواهد.',
    'downloads.back': 'بازگشت به یادگیری من',
    'downloads.storageRefused': 'این مرورگر فضای ذخیره‌سازی برنامه را باز نکرد.',
    'downloads.looking': 'در حال نگاه کردن به آنچه روی این دستگاه است…',
    'downloads.empty':
      'چیزی روی این دستگاه ذخیره نشده است. درسی که ذخیره کنید همین‌جا دیده می‌شود و نه جای دیگر: در پوشهٔ دانلودهای گوشی شما نیست.',
    'downloads.count': 'درس‌های روی این دستگاه: {count}',
    'downloads.space': 'فضای استفاده‌شده: {size}',
    'downloads.closePlayer': 'بستن پخش‌کننده',
    'downloads.badgeLapsed': 'نیاز به تازه‌سازی دارد',
    'downloads.badgeSaved': 'روی این دستگاه ذخیره شده',
    'downloads.lapsed':
      'مهلت این نسخهٔ ذخیره‌شده گذشته است. برای ذخیرهٔ دوباره، درس را هنگام اتصال باز کنید.',
    'downloads.daysLeft': 'روزهای باقی‌مانده: {days}',
    'downloads.play': 'پخش',
    'downloads.opening': 'در حال باز شدن…',
    'downloads.remove': 'برداشتن',
    'downloads.removing': 'در حال برداشتن…',
    'downloads.removeLocal': 'فقط نسخهٔ روی این دستگاه برداشته شود',
    'downloads.gone': 'آن درس دیگر روی این دستگاه نیست.',
    'downloads.openFailed': 'آن درس ذخیره‌شده باز نشد.',
    'downloads.needConnection': 'برای باز کردن این درس ذخیره‌شده و بررسی دسترسی به اینترنت وصل شوید.',
    'downloads.notAllowed': 'این درس ذخیره‌شده دیگر برای این حساب یا این طرح در دسترس نیست.',
    'downloads.removedCopy': 'این نسخهٔ ذخیره‌شده برداشته شده و دیگر باز نمی‌شود.',
    'downloads.signIn': 'برای باز کردن درس ذخیره‌شده وارد شوید.',
    'downloads.removeUnconfirmed':
      'برداشتن با سرور تأیید نشد. دوباره وصل شوید و باز تلاش کنید؛ نسخهٔ روی این دستگاه هنوز همین‌جاست.',
    'downloads.removeLocalFailed':
      'سرور برداشتن را ثبت کرد، اما این مرورگر نتوانست نسخهٔ خودش را بردارد. دوباره تلاش کنید، یا فقط نسخهٔ روی این دستگاه را بردارید.',
    'downloads.confirmLocal':
      'فقط نسخهٔ روی این دستگاه برداشته شود؟ سابقهٔ سرور می‌ماند و جای هیچ دستگاهی آزاد نمی‌شود.',
    'downloads.localRemoved': 'نسخهٔ روی این دستگاه برداشته شد. سابقهٔ سرور و جای دستگاه ممکن است بمانند.',
    'downloads.localFailed': 'این مرورگر نتوانست نسخهٔ روی این دستگاه را بردارد.',
    'downloads.devTitle': 'دستگاه‌هایی که درس ذخیره‌شده دارند',
    'downloads.devLede':
      'دستگاهی را بردارید تا جایش آزاد شود و ذخیره‌هایش روی سرور پایان یابد. نسخه‌ها یا کلیدهایی که از پیش روی آن دستگاه مانده‌اند از این‌جا پاک‌شدنی نیستند.',
    'downloads.devLoading': 'در حال بارگیری دستگاه‌ها…',
    'downloads.devUnread': 'فهرست دستگاه‌ها بارگیری نشد. آن را خالی نپندارید.',
    'downloads.devRefresh': 'تازه‌سازی',
    'downloads.devNone': 'اکنون دستگاهی در فهرست نیست.',
    'downloads.devUnnamed': 'دستگاه بی‌نام',
    'downloads.devSaved': 'درس‌های ذخیره‌شده: {count}',
    'downloads.devSeen': 'آخرین بار دیده شد: {day}',
    'downloads.devRemove': 'برداشتن دستگاه',
    'downloads.devConfirm':
      'این دستگاه برداشته شود؟ درس‌های ذخیره‌شده‌اش دیگر از راه برنامه باز نمی‌شوند. با این کار نسخه‌های روی دستگاه پاک نمی‌شوند و کلیدهایی که نزد آن است پس گرفته نمی‌شوند.',
    'downloads.devUnconfirmed':
      'برداشتن دستگاه تأیید نشد. فهرست را تازه کنید و دوباره تلاش کنید؛ شاید پاسخی که نرسید آن را برداشته باشد.',
    'downloads.devRemoved':
      'سرور برداشتن دستگاه را ثبت کرد. نسخه‌ها و کلیدهای مانده روی آن دستگاه از این‌جا پاک نشدند.',
    'downloads.devRemovedUnrefreshed': 'سرور برداشتن را ثبت کرد، اما فهرست دستگاه‌ها تازه نشد.',
  },
  'fa-af': {
    'downloads.title': 'روی این دستگاه',
    'downloads.lede':
      'درس‌هایی که برای استفادهٔ بدون انترنت ذخیره کرده‌اید. این‌ها در داخل همین برنامه نگهداری می‌شوند، نه در مدیر فایل دستگاه شما. فعلاً برای باز کردن این صفحه و بررسی دسترسی پیش از هر بار پخش، اتصال لازم است؛ خودِ ثبت در همین‌جا ذخیره است.',
    'downloads.paused':
      'ذخیرهٔ نو فعلاً باز نیست. درسی که قبلاً ذخیره شده تا وقتی کورس آن، پلان Plus و تاریخ نسخهٔ ذخیره‌شده همه اعتبار دارند باز می‌شود.',
    'downloads.plusNote':
      'ذخیره کردن به پلان Plus ضرورت دارد. درس ذخیره‌شده نسخه‌ای نیست که مالک آن باشید: تا وقتی پلان است می‌ماند و بعد تازه‌سازی می‌خواهد.',
    'downloads.back': 'برگشت به آموزش من',
    'downloads.storageRefused': 'این مرورگر فضای ذخیرهٔ برنامه را باز نکرد.',
    'downloads.looking': 'دیده می‌شود که روی این دستگاه چه است…',
    'downloads.empty':
      'چیزی روی این دستگاه ذخیره نشده است. درسی که ذخیره کنید در همین‌جا دیده می‌شود و نه در جای دیگر: در پوشهٔ دانلودهای تلفون شما نیست.',
    'downloads.count': 'درس‌های روی این دستگاه: {count}',
    'downloads.space': 'فضای استفاده‌شده: {size}',
    'downloads.closePlayer': 'بستن پخش‌کننده',
    'downloads.badgeLapsed': 'به تازه‌سازی ضرورت دارد',
    'downloads.badgeSaved': 'روی این دستگاه ذخیره است',
    'downloads.lapsed':
      'مهلت این نسخهٔ ذخیره‌شده تیر شده است. برای ذخیرهٔ دوباره، درس را هنگام وصل بودن باز کنید.',
    'downloads.daysLeft': 'روزهای باقی‌مانده: {days}',
    'downloads.play': 'پخش',
    'downloads.opening': 'در حال باز شدن…',
    'downloads.remove': 'دور کردن',
    'downloads.removing': 'در حال دور کردن…',
    'downloads.removeLocal': 'تنها نسخهٔ روی این دستگاه دور شود',
    'downloads.gone': 'آن درس دیگر روی این دستگاه نیست.',
    'downloads.openFailed': 'آن درس ذخیره‌شده باز نشد.',
    'downloads.needConnection': 'برای باز کردن این درس ذخیره‌شده و بررسی دسترسی به انترنت وصل شوید.',
    'downloads.notAllowed': 'این درس ذخیره‌شده دیگر برای این حساب یا این پلان در دسترس نیست.',
    'downloads.removedCopy': 'این نسخهٔ ذخیره‌شده دور شده و دیگر باز نمی‌شود.',
    'downloads.signIn': 'برای باز کردن درس ذخیره‌شده داخل شوید.',
    'downloads.removeUnconfirmed':
      'دور کردن با سرور تأیید نشد. دوباره وصل شوید و باز کوشش کنید؛ نسخهٔ روی این دستگاه هنوز همین‌جاست.',
    'downloads.removeLocalFailed':
      'سرور دور کردن را ثبت کرد، اما این مرورگر نتوانست نسخهٔ خودش را دور کند. دوباره کوشش کنید، یا تنها نسخهٔ روی این دستگاه را دور کنید.',
    'downloads.confirmLocal':
      'تنها نسخهٔ روی این دستگاه دور شود؟ سابقهٔ سرور می‌ماند و جای هیچ دستگاهی خالی نمی‌شود.',
    'downloads.localRemoved': 'نسخهٔ روی این دستگاه دور شد. سابقهٔ سرور و جای دستگاه شاید بمانند.',
    'downloads.localFailed': 'این مرورگر نتوانست نسخهٔ روی این دستگاه را دور کند.',
    'downloads.devTitle': 'دستگاه‌هایی که درس ذخیره‌شده دارند',
    'downloads.devLede':
      'دستگاهی را دور کنید تا جایش خالی شود و ذخیره‌هایش در سرور پایان یابد. نسخه‌ها یا کلیدهایی که قبلاً روی آن دستگاه مانده‌اند از این‌جا پاک شده نمی‌توانند.',
    'downloads.devLoading': 'دستگاه‌ها بارگیری می‌شوند…',
    'downloads.devUnread': 'فهرست دستگاه‌ها بارگیری نشد. آن را خالی فکر نکنید.',
    'downloads.devRefresh': 'تازه کردن',
    'downloads.devNone': 'فعلاً دستگاهی در فهرست نیست.',
    'downloads.devUnnamed': 'دستگاه بی‌نام',
    'downloads.devSaved': 'درس‌های ذخیره‌شده: {count}',
    'downloads.devSeen': 'آخرین بار دیده شد: {day}',
    'downloads.devRemove': 'دور کردن دستگاه',
    'downloads.devConfirm':
      'این دستگاه دور شود؟ درس‌های ذخیره‌شدهٔ آن دیگر از راه برنامه باز نمی‌شوند. با این کار نسخه‌های روی دستگاه پاک نمی‌شوند و کلیدهایی که نزد آن است پس گرفته نمی‌شوند.',
    'downloads.devUnconfirmed':
      'دور کردن دستگاه تأیید نشد. فهرست را تازه کنید و دوباره کوشش کنید؛ شاید جوابی که نرسید آن را دور کرده باشد.',
    'downloads.devRemoved':
      'سرور دور کردن دستگاه را ثبت کرد. نسخه‌ها و کلیدهای مانده روی آن دستگاه از این‌جا پاک نشدند.',
    'downloads.devRemovedUnrefreshed': 'سرور دور کردن را ثبت کرد، اما فهرست دستگاه‌ها تازه نشد.',
  },
  tr: {
    'downloads.title': 'Bu cihazda',
    'downloads.lede':
      'Çevrimdışı kullanmak için kaydettiğiniz dersler. Cihazınızın dosya yöneticisinde değil, bu uygulamanın içinde tutulur. Şimdilik bu sayfayı açmak ve her oynatmadan önce erişimi denetlemek için bağlantı gerekir; kaydın kendisi burada saklanır.',
    'downloads.paused':
      'Yeni kayıtlar şu anda açık değil. Önceden kaydedilmiş bir ders; kursu, Plus planı ve kayıtlı kopyanın tarihi geçerli kaldıkça açılabilir.',
    'downloads.plusNote':
      'Kaydetmek için Plus planı gerekir. Kaydedilen ders sahip olduğunuz bir kopya değildir: plan sürdükçe kalır, sonra yenilenmek ister.',
    'downloads.back': 'Öğrenimime dön',
    'downloads.storageRefused': 'Bu tarayıcı uygulamanın depolama alanını açmadı.',
    'downloads.looking': 'Bu cihazda ne olduğuna bakılıyor…',
    'downloads.empty':
      'Bu cihazda kayıtlı bir şey yok. Kaydettiğiniz ders yalnızca burada görünür: telefonunuzun indirilenler klasöründe değildir.',
    'downloads.count': 'Bu cihazdaki dersler: {count}',
    'downloads.space': 'Kullanılan alan: {size}',
    'downloads.closePlayer': 'Oynatıcıyı kapat',
    'downloads.badgeLapsed': 'Yenilenmesi gerekiyor',
    'downloads.badgeSaved': 'Bu cihaza kaydedildi',
    'downloads.lapsed': 'Bu kayıtlı kopyanın süresi doldu. Yeniden kaydetmek için dersi çevrimiçiyken açın.',
    'downloads.daysLeft': 'Kalan gün: {days}',
    'downloads.play': 'Oynat',
    'downloads.opening': 'Açılıyor…',
    'downloads.remove': 'Kaldır',
    'downloads.removing': 'Kaldırılıyor…',
    'downloads.removeLocal': 'Yalnızca bu cihazdaki kopyayı kaldır',
    'downloads.gone': 'O ders artık bu cihazda değil.',
    'downloads.openFailed': 'O kayıtlı ders açılamadı.',
    'downloads.needConnection': 'Bu kayıtlı dersi açmak ve erişimi denetlemek için internete bağlanın.',
    'downloads.notAllowed': 'Bu kayıtlı ders artık bu hesap ya da plan için kullanılamıyor.',
    'downloads.removedCopy': 'Bu kayıtlı kopya kaldırıldı ve artık açılamaz.',
    'downloads.signIn': 'Kayıtlı bir dersi açmak için oturum açın.',
    'downloads.removeUnconfirmed':
      'Kaldırma işlemi sunucuyla doğrulanamadı. Yeniden bağlanıp tekrar deneyin; bu cihazdaki kopya hâlâ burada.',
    'downloads.removeLocalFailed':
      'Sunucu kaldırmayı kaydetti, ancak bu tarayıcı kendi kopyasını kaldıramadı. Tekrar deneyin ya da yalnızca bu cihazdaki kopyayı kaldırın.',
    'downloads.confirmLocal':
      'Yalnızca bu cihazdaki kopya kaldırılsın mı? Sunucudaki kayıt kalır ve hiçbir cihaz yeri boşalmaz.',
    'downloads.localRemoved':
      'Bu cihazdaki kopya kaldırıldı. Sunucudaki kayıt ve cihaz yeri kalmış olabilir.',
    'downloads.localFailed': 'Bu tarayıcı bu cihazdaki kopyayı kaldıramadı.',
    'downloads.devTitle': 'Kayıtlı ders bulunan cihazlar',
    'downloads.devLede':
      'Yerini boşaltmak ve sunucudaki kayıtlarını sona erdirmek için bir cihazı kaldırın. O cihazda zaten duran kopyalar ya da anahtarlar buradan silinemez.',
    'downloads.devLoading': 'Cihazlar yükleniyor…',
    'downloads.devUnread': 'Cihaz listesi yüklenemedi. Boş olduğunu varsaymayın.',
    'downloads.devRefresh': 'Yenile',
    'downloads.devNone': 'Şu anda listede cihaz yok.',
    'downloads.devUnnamed': 'Adsız cihaz',
    'downloads.devSaved': 'Kayıtlı dersler: {count}',
    'downloads.devSeen': 'Son görülme: {day}',
    'downloads.devRemove': 'Cihazı kaldır',
    'downloads.devConfirm':
      'Bu cihaz kaldırılsın mı? Kayıtlı dersleri uygulama üzerinden açılmaz olur. Bu işlem cihazdaki kopyaları silemez, cihazın elindeki anahtarları da geri alamaz.',
    'downloads.devUnconfirmed':
      'Cihazın kaldırılması doğrulanamadı. Listeyi yenileyip tekrar deneyin; ulaşmayan bir yanıt onu yine de kaldırmış olabilir.',
    'downloads.devRemoved':
      'Sunucu cihazın kaldırılmasını kaydetti. O cihazda duran kopyalar ve anahtarlar buradan silinmedi.',
    'downloads.devRemovedUnrefreshed': 'Sunucu kaldırmayı kaydetti, ancak cihaz listesi yenilenemedi.',
  },
  id: {
    'downloads.title': 'Di perangkat ini',
    'downloads.lede':
      'Pelajaran yang Anda simpan untuk dipakai tanpa internet. Semuanya disimpan di dalam aplikasi ini, bukan di pengelola berkas perangkat Anda. Untuk saat ini koneksi diperlukan untuk membuka halaman ini dan memeriksa akses sebelum setiap pemutaran; rekamannya sendiri tersimpan di sini.',
    'downloads.paused':
      'Penyimpanan baru sedang tidak dibuka. Pelajaran yang sudah tersimpan masih bisa dibuka selama kursusnya, paket Plus, dan tanggal salinan tersimpannya masih berlaku.',
    'downloads.plusNote':
      'Menyimpan memerlukan paket Plus. Pelajaran tersimpan bukan salinan yang Anda miliki: ia bertahan selama paket berjalan, lalu meminta diperbarui.',
    'downloads.back': 'Kembali ke pembelajaran saya',
    'downloads.storageRefused': 'Peramban ini tidak mau membuka penyimpanan aplikasinya.',
    'downloads.looking': 'Melihat apa yang ada di perangkat ini…',
    'downloads.empty':
      'Tidak ada yang tersimpan di perangkat ini. Pelajaran yang Anda simpan muncul di sini dan tidak di tempat lain: tidak ada di folder unduhan ponsel Anda.',
    'downloads.count': 'Pelajaran di perangkat ini: {count}',
    'downloads.space': 'Ruang terpakai: {size}',
    'downloads.closePlayer': 'Tutup pemutar',
    'downloads.badgeLapsed': 'Perlu diperbarui',
    'downloads.badgeSaved': 'Tersimpan di perangkat ini',
    'downloads.lapsed':
      'Salinan tersimpan ini sudah lewat masanya. Buka pelajarannya saat daring untuk menyimpannya lagi.',
    'downloads.daysLeft': 'Hari tersisa: {days}',
    'downloads.play': 'Putar',
    'downloads.opening': 'Membuka…',
    'downloads.remove': 'Hapus',
    'downloads.removing': 'Menghapus…',
    'downloads.removeLocal': 'Hapus hanya salinan di perangkat ini',
    'downloads.gone': 'Pelajaran itu sudah tidak ada di perangkat ini.',
    'downloads.openFailed': 'Pelajaran tersimpan itu tidak dapat dibuka.',
    'downloads.needConnection':
      'Sambungkan ke internet untuk membuka pelajaran tersimpan ini dan memeriksa akses.',
    'downloads.notAllowed': 'Pelajaran tersimpan ini tidak lagi tersedia untuk akun atau paket ini.',
    'downloads.removedCopy': 'Salinan tersimpan ini telah dihapus dan tidak dapat dibuka lagi.',
    'downloads.signIn': 'Masuk untuk membuka pelajaran tersimpan.',
    'downloads.removeUnconfirmed':
      'Penghapusan tidak dapat dipastikan dengan server. Sambungkan kembali lalu coba lagi; salinan di perangkat ini masih ada.',
    'downloads.removeLocalFailed':
      'Server mencatat penghapusan, tetapi peramban ini tidak dapat menghapus salinannya sendiri. Coba lagi, atau hapus hanya salinan di perangkat ini.',
    'downloads.confirmLocal':
      'Hapus hanya salinan di perangkat ini? Catatan di server tetap ada, dan tidak ada tempat perangkat yang dibebaskan.',
    'downloads.localRemoved':
      'Salinan di perangkat ini telah dihapus. Catatan di server dan tempat perangkat mungkin masih ada.',
    'downloads.localFailed': 'Peramban ini tidak dapat menghapus salinan di perangkat ini.',
    'downloads.devTitle': 'Perangkat yang menyimpan pelajaran',
    'downloads.devLede':
      'Hapus sebuah perangkat untuk membebaskan tempatnya dan mengakhiri simpanannya di server. Salinan atau kunci yang sudah ada di perangkat itu tidak dapat dihapus dari sini.',
    'downloads.devLoading': 'Memuat perangkat…',
    'downloads.devUnread': 'Daftar perangkat tidak dapat dimuat. Jangan anggap daftarnya kosong.',
    'downloads.devRefresh': 'Muat ulang',
    'downloads.devNone': 'Saat ini tidak ada perangkat dalam daftar.',
    'downloads.devUnnamed': 'Perangkat tanpa nama',
    'downloads.devSaved': 'Pelajaran tersimpan: {count}',
    'downloads.devSeen': 'Terakhir terlihat: {day}',
    'downloads.devRemove': 'Hapus perangkat',
    'downloads.devConfirm':
      'Hapus perangkat ini? Pelajaran tersimpannya tidak akan bisa dibuka lagi lewat aplikasi. Ini tidak dapat menghapus salinan di perangkat itu atau menarik kembali kunci yang sudah dipegangnya.',
    'downloads.devUnconfirmed':
      'Penghapusan perangkat tidak dapat dipastikan. Muat ulang daftar lalu coba lagi; balasan yang hilang mungkin tetap sudah menghapusnya.',
    'downloads.devRemoved':
      'Server mencatat penghapusan perangkat. Salinan dan kunci yang ada di perangkat itu tidak dihapus dari sini.',
    'downloads.devRemovedUnrefreshed':
      'Server mencatat penghapusan, tetapi daftar perangkat tidak dapat dimuat ulang.',
  },
  ms: {
    'downloads.title': 'Pada peranti ini',
    'downloads.lede':
      'Pelajaran yang anda simpan untuk digunakan tanpa internet. Semuanya disimpan di dalam aplikasi ini, bukan dalam pengurus fail peranti anda. Buat masa ini sambungan diperlukan untuk membuka halaman ini dan menyemak akses sebelum setiap main balik; rakaman itu sendiri disimpan di sini.',
    'downloads.paused':
      'Simpanan baharu tidak dibuka sekarang. Pelajaran yang sudah disimpan masih boleh dibuka selagi kursusnya, pelan Plus dan tarikh salinan simpanannya masih sah.',
    'downloads.plusNote':
      'Menyimpan memerlukan pelan Plus. Pelajaran yang disimpan bukan salinan milik anda: ia kekal selagi pelan berjalan, kemudian minta diperbaharui.',
    'downloads.back': 'Kembali ke pembelajaran saya',
    'downloads.storageRefused': 'Pelayar ini enggan membuka storan aplikasinya.',
    'downloads.looking': 'Melihat apa yang ada pada peranti ini…',
    'downloads.empty':
      'Tiada apa-apa disimpan pada peranti ini. Pelajaran yang anda simpan muncul di sini dan bukan di tempat lain: ia tiada dalam folder muat turun telefon anda.',
    'downloads.count': 'Pelajaran pada peranti ini: {count}',
    'downloads.space': 'Ruang digunakan: {size}',
    'downloads.closePlayer': 'Tutup pemain',
    'downloads.badgeLapsed': 'Perlu diperbaharui',
    'downloads.badgeSaved': 'Disimpan pada peranti ini',
    'downloads.lapsed':
      'Salinan simpanan ini sudah luput. Buka pelajaran itu semasa dalam talian untuk menyimpannya semula.',
    'downloads.daysLeft': 'Hari berbaki: {days}',
    'downloads.play': 'Main',
    'downloads.opening': 'Membuka…',
    'downloads.remove': 'Buang',
    'downloads.removing': 'Membuang…',
    'downloads.removeLocal': 'Buang salinan pada peranti ini sahaja',
    'downloads.gone': 'Pelajaran itu tiada lagi pada peranti ini.',
    'downloads.openFailed': 'Pelajaran yang disimpan itu tidak dapat dibuka.',
    'downloads.needConnection':
      'Sambung ke internet untuk membuka pelajaran yang disimpan ini dan menyemak akses.',
    'downloads.notAllowed': 'Pelajaran yang disimpan ini tidak lagi tersedia untuk akaun atau pelan ini.',
    'downloads.removedCopy': 'Salinan simpanan ini telah dibuang dan tidak boleh dibuka lagi.',
    'downloads.signIn': 'Log masuk untuk membuka pelajaran yang disimpan.',
    'downloads.removeUnconfirmed':
      'Pembuangan tidak dapat disahkan dengan pelayan. Sambung semula dan cuba lagi; salinan pada peranti ini masih ada.',
    'downloads.removeLocalFailed':
      'Pelayan merekodkan pembuangan, tetapi pelayar ini tidak dapat membuang salinannya sendiri. Cuba lagi, atau buang salinan pada peranti ini sahaja.',
    'downloads.confirmLocal':
      'Buang salinan pada peranti ini sahaja? Rekod di pelayan kekal, dan tiada tempat peranti dikosongkan.',
    'downloads.localRemoved':
      'Salinan pada peranti ini telah dibuang. Rekod di pelayan dan tempat peranti mungkin masih ada.',
    'downloads.localFailed': 'Pelayar ini tidak dapat membuang salinan pada peranti ini.',
    'downloads.devTitle': 'Peranti yang menyimpan pelajaran',
    'downloads.devLede':
      'Buang sesebuah peranti untuk mengosongkan tempatnya dan menamatkan simpanannya di pelayan. Salinan atau kunci yang sudah ada pada peranti itu tidak boleh dipadam dari sini.',
    'downloads.devLoading': 'Memuatkan peranti…',
    'downloads.devUnread': 'Senarai peranti tidak dapat dimuatkan. Jangan anggap ia kosong.',
    'downloads.devRefresh': 'Muat semula',
    'downloads.devNone': 'Tiada peranti dalam senarai sekarang.',
    'downloads.devUnnamed': 'Peranti tanpa nama',
    'downloads.devSaved': 'Pelajaran disimpan: {count}',
    'downloads.devSeen': 'Kali terakhir dilihat: {day}',
    'downloads.devRemove': 'Buang peranti',
    'downloads.devConfirm':
      'Buang peranti ini? Pelajaran simpanannya tidak akan dapat dibuka lagi melalui aplikasi. Ini tidak boleh memadam salinan pada peranti itu atau menarik balik kunci yang sudah dipegangnya.',
    'downloads.devUnconfirmed':
      'Pembuangan peranti tidak dapat disahkan. Muat semula senarai dan cuba lagi; balasan yang hilang mungkin telah membuangnya juga.',
    'downloads.devRemoved':
      'Pelayan merekodkan pembuangan peranti. Salinan dan kunci pada peranti itu tidak dipadam dari sini.',
    'downloads.devRemovedUnrefreshed':
      'Pelayan merekodkan pembuangan, tetapi senarai peranti tidak dapat dimuat semula.',
  },
  bn: {
    'downloads.title': 'এই ডিভাইসে',
    'downloads.lede':
      'অফলাইনে ব্যবহারের জন্য আপনি যে পাঠগুলো সংরক্ষণ করেছেন। এগুলো এই অ্যাপের ভেতরেই থাকে, আপনার ডিভাইসের ফাইল ম্যানেজারে নয়। আপাতত এই পাতা খুলতে এবং প্রতিবার চালানোর আগে প্রবেশাধিকার যাচাই করতে সংযোগ লাগে; রেকর্ডিংটি নিজে এখানেই রাখা আছে।',
    'downloads.paused':
      'নতুন করে সংরক্ষণ এখন খোলা নেই। আগে সংরক্ষিত পাঠ ততদিন খোলা যাবে, যতদিন তার কোর্স, Plus প্ল্যান ও সংরক্ষিত কপির তারিখ সবই বহাল থাকে।',
    'downloads.plusNote':
      'সংরক্ষণের জন্য Plus প্ল্যান লাগে। সংরক্ষিত পাঠ আপনার মালিকানার কপি নয়: প্ল্যান যতদিন থাকে ততদিন থাকে, তারপর নতুন করে নিতে বলে।',
    'downloads.back': 'আমার শেখায় ফিরে যান',
    'downloads.storageRefused': 'এই ব্রাউজার অ্যাপের স্টোরেজ খুলতে দেয়নি।',
    'downloads.looking': 'এই ডিভাইসে কী আছে দেখা হচ্ছে…',
    'downloads.empty':
      'এই ডিভাইসে কিছু সংরক্ষিত নেই। আপনি যে পাঠ সংরক্ষণ করবেন তা এখানেই দেখা যাবে, অন্য কোথাও নয়: এটি আপনার ফোনের ডাউনলোড ফোল্ডারে থাকে না।',
    'downloads.count': 'এই ডিভাইসে পাঠ: {count}',
    'downloads.space': 'ব্যবহৃত জায়গা: {size}',
    'downloads.closePlayer': 'প্লেয়ার বন্ধ করুন',
    'downloads.badgeLapsed': 'নতুন করে নিতে হবে',
    'downloads.badgeSaved': 'এই ডিভাইসে সংরক্ষিত',
    'downloads.lapsed':
      'এই সংরক্ষিত কপির মেয়াদ শেষ হয়েছে। আবার সংরক্ষণ করতে অনলাইনে থাকা অবস্থায় পাঠটি খুলুন।',
    'downloads.daysLeft': 'বাকি দিন: {days}',
    'downloads.play': 'চালান',
    'downloads.opening': 'খোলা হচ্ছে…',
    'downloads.remove': 'সরান',
    'downloads.removing': 'সরানো হচ্ছে…',
    'downloads.removeLocal': 'শুধু এই ডিভাইসের কপি সরান',
    'downloads.gone': 'সেই পাঠ আর এই ডিভাইসে নেই।',
    'downloads.openFailed': 'সেই সংরক্ষিত পাঠ খোলা যায়নি।',
    'downloads.needConnection': 'এই সংরক্ষিত পাঠ খুলতে ও প্রবেশাধিকার যাচাই করতে ইন্টারনেটে যুক্ত হোন।',
    'downloads.notAllowed': 'এই সংরক্ষিত পাঠ আর এই অ্যাকাউন্ট বা প্ল্যানের জন্য পাওয়া যায় না।',
    'downloads.removedCopy': 'এই সংরক্ষিত কপি সরানো হয়েছে এবং আর খোলা যাবে না।',
    'downloads.signIn': 'সংরক্ষিত পাঠ খুলতে সাইন ইন করুন।',
    'downloads.removeUnconfirmed':
      'সরানোর বিষয়টি সার্ভারের সঙ্গে নিশ্চিত করা যায়নি। আবার যুক্ত হয়ে চেষ্টা করুন; এই ডিভাইসের কপি এখনও এখানে আছে।',
    'downloads.removeLocalFailed':
      'সার্ভার সরানোর কথা লিখে রেখেছে, কিন্তু এই ব্রাউজার নিজের কপি সরাতে পারেনি। আবার চেষ্টা করুন, অথবা শুধু এই ডিভাইসের কপি সরান।',
    'downloads.confirmLocal':
      'শুধু এই ডিভাইসের কপি সরাবেন? সার্ভারের রেকর্ড থেকে যায়, আর কোনো ডিভাইসের জায়গা খালি হয় না।',
    'downloads.localRemoved':
      'এই ডিভাইসের কপি সরানো হয়েছে। সার্ভারের রেকর্ড ও ডিভাইসের জায়গা থেকে যেতে পারে।',
    'downloads.localFailed': 'এই ব্রাউজার এই ডিভাইসের কপি সরাতে পারেনি।',
    'downloads.devTitle': 'যেসব ডিভাইসে সংরক্ষিত পাঠ আছে',
    'downloads.devLede':
      'কোনো ডিভাইস সরালে তার জায়গা খালি হয় এবং সার্ভারে তার সংরক্ষণ শেষ হয়। ওই ডিভাইসে আগে থেকে থাকা কপি বা চাবি এখান থেকে মোছা যায় না।',
    'downloads.devLoading': 'ডিভাইসগুলো লোড হচ্ছে…',
    'downloads.devUnread': 'ডিভাইসের তালিকা লোড করা যায়নি। এটিকে খালি ধরে নেবেন না।',
    'downloads.devRefresh': 'নতুন করে দেখুন',
    'downloads.devNone': 'এখন তালিকায় কোনো ডিভাইস নেই।',
    'downloads.devUnnamed': 'নামহীন ডিভাইস',
    'downloads.devSaved': 'সংরক্ষিত পাঠ: {count}',
    'downloads.devSeen': 'শেষ দেখা গেছে: {day}',
    'downloads.devRemove': 'ডিভাইস সরান',
    'downloads.devConfirm':
      'এই ডিভাইস সরাবেন? এর সংরক্ষিত পাঠগুলো অ্যাপ দিয়ে আর খুলবে না। এতে ডিভাইসে থাকা কপি মোছা যায় না, তার কাছে থাকা চাবিও ফেরত নেওয়া যায় না।',
    'downloads.devUnconfirmed':
      'ডিভাইস সরানোর বিষয়টি নিশ্চিত করা যায়নি। তালিকা নতুন করে দেখে আবার চেষ্টা করুন; হারিয়ে যাওয়া উত্তরটি হয়তো তবু সেটি সরিয়ে দিয়েছে।',
    'downloads.devRemoved':
      'সার্ভার ডিভাইস সরানোর কথা লিখে রেখেছে। ওই ডিভাইসে থাকা কপি ও চাবি এখান থেকে মোছা হয়নি।',
    'downloads.devRemovedUnrefreshed':
      'সার্ভার সরানোর কথা লিখে রেখেছে, কিন্তু ডিভাইসের তালিকা নতুন করে দেখা যায়নি।',
  },
  hi: {
    'downloads.title': 'इस डिवाइस पर',
    'downloads.lede':
      'वे पाठ जो आपने ऑफ़लाइन इस्तेमाल के लिए सहेजे हैं। ये इसी ऐप के भीतर रहते हैं, आपके डिवाइस के फ़ाइल मैनेजर में नहीं। फ़िलहाल इस पन्ने को खोलने और हर बार चलाने से पहले पहुँच जाँचने के लिए कनेक्शन चाहिए; रिकॉर्डिंग ख़ुद यहीं रखी है।',
    'downloads.paused':
      'नए पाठ सहेजना अभी खुला नहीं है। पहले से सहेजा गया पाठ तब तक खोला जा सकता है जब तक उसका कोर्स, Plus प्लान और सहेजी गई प्रति की तारीख़ सब मान्य हैं।',
    'downloads.plusNote':
      'सहेजने के लिए Plus प्लान चाहिए। सहेजा गया पाठ ऐसी प्रति नहीं जिसके आप मालिक हों: यह प्लान रहने तक रहता है, फिर ताज़ा करने को कहता है।',
    'downloads.back': 'मेरी पढ़ाई पर वापस',
    'downloads.storageRefused': 'इस ब्राउज़र ने ऐप का स्टोरेज नहीं खोला।',
    'downloads.looking': 'देखा जा रहा है कि इस डिवाइस पर क्या है…',
    'downloads.empty':
      'इस डिवाइस पर कुछ सहेजा नहीं गया है। जो पाठ आप सहेजते हैं वह यहीं दिखता है और कहीं नहीं: वह आपके फ़ोन के डाउनलोड फ़ोल्डर में नहीं होता।',
    'downloads.count': 'इस डिवाइस पर पाठ: {count}',
    'downloads.space': 'इस्तेमाल हुई जगह: {size}',
    'downloads.closePlayer': 'प्लेयर बंद करें',
    'downloads.badgeLapsed': 'ताज़ा करना ज़रूरी है',
    'downloads.badgeSaved': 'इस डिवाइस पर सहेजा गया',
    'downloads.lapsed':
      'इस सहेजी गई प्रति की अवधि बीत चुकी है। इसे फिर से सहेजने के लिए ऑनलाइन रहते हुए पाठ खोलें।',
    'downloads.daysLeft': 'बचे हुए दिन: {days}',
    'downloads.play': 'चलाएँ',
    'downloads.opening': 'खुल रहा है…',
    'downloads.remove': 'हटाएँ',
    'downloads.removing': 'हटाया जा रहा है…',
    'downloads.removeLocal': 'केवल इस डिवाइस की प्रति हटाएँ',
    'downloads.gone': 'वह पाठ अब इस डिवाइस पर नहीं है।',
    'downloads.openFailed': 'वह सहेजा गया पाठ खोला नहीं जा सका।',
    'downloads.needConnection': 'इस सहेजे गए पाठ को खोलने और पहुँच जाँचने के लिए इंटरनेट से जुड़ें।',
    'downloads.notAllowed': 'यह सहेजा गया पाठ अब इस खाते या प्लान के लिए उपलब्ध नहीं है।',
    'downloads.removedCopy': 'यह सहेजी गई प्रति हटा दी गई थी और अब खोली नहीं जा सकती।',
    'downloads.signIn': 'सहेजा गया पाठ खोलने के लिए साइन इन करें।',
    'downloads.removeUnconfirmed':
      'हटाने की पुष्टि सर्वर से नहीं हो सकी। फिर से जुड़ें और दोबारा कोशिश करें; इस डिवाइस की प्रति अभी यहीं है।',
    'downloads.removeLocalFailed':
      'सर्वर ने हटाना दर्ज कर लिया, पर यह ब्राउज़र अपनी प्रति नहीं हटा सका। दोबारा कोशिश करें, या केवल इस डिवाइस की प्रति हटाएँ।',
    'downloads.confirmLocal':
      'केवल इस डिवाइस की प्रति हटाएँ? सर्वर का रिकॉर्ड बना रहता है, और किसी डिवाइस की जगह ख़ाली नहीं होती।',
    'downloads.localRemoved':
      'इस डिवाइस की प्रति हटा दी गई। सर्वर का रिकॉर्ड और डिवाइस की जगह बनी रह सकती है।',
    'downloads.localFailed': 'यह ब्राउज़र इस डिवाइस की प्रति नहीं हटा सका।',
    'downloads.devTitle': 'वे डिवाइस जिनमें सहेजे गए पाठ हैं',
    'downloads.devLede':
      'किसी डिवाइस को हटाएँ ताकि उसकी जगह ख़ाली हो और सर्वर पर उसके सहेजे गए पाठ समाप्त हों। उस डिवाइस पर पहले से रखी प्रतियाँ या कुंजियाँ यहाँ से मिटाई नहीं जा सकतीं।',
    'downloads.devLoading': 'डिवाइस लोड हो रहे हैं…',
    'downloads.devUnread': 'डिवाइसों की सूची लोड नहीं हो सकी। इसे ख़ाली न मानें।',
    'downloads.devRefresh': 'ताज़ा करें',
    'downloads.devNone': 'अभी सूची में कोई डिवाइस नहीं है।',
    'downloads.devUnnamed': 'बिना नाम का डिवाइस',
    'downloads.devSaved': 'सहेजे गए पाठ: {count}',
    'downloads.devSeen': 'आख़िरी बार देखा गया: {day}',
    'downloads.devRemove': 'डिवाइस हटाएँ',
    'downloads.devConfirm':
      'क्या यह डिवाइस हटाया जाए? इसके सहेजे गए पाठ ऐप से खुलना बंद हो जाएँगे। इससे डिवाइस पर रखी प्रतियाँ नहीं मिटतीं और उसके पास की कुंजियाँ वापस नहीं ली जा सकतीं।',
    'downloads.devUnconfirmed':
      'डिवाइस हटाने की पुष्टि नहीं हो सकी। सूची ताज़ा करें और दोबारा कोशिश करें; हो सकता है खो गए उत्तर ने उसे फिर भी हटा दिया हो।',
    'downloads.devRemoved':
      'सर्वर ने डिवाइस का हटाना दर्ज कर लिया। उस डिवाइस पर रखी प्रतियाँ और कुंजियाँ यहाँ से नहीं मिटाई गईं।',
    'downloads.devRemovedUnrefreshed': 'सर्वर ने हटाना दर्ज कर लिया, पर डिवाइसों की सूची ताज़ा नहीं हो सकी।',
  },
  fr: {
    'downloads.title': 'Sur cet appareil',
    'downloads.lede':
      'Les leçons que vous avez enregistrées pour les utiliser hors ligne. Elles sont gardées dans cette application, pas dans le gestionnaire de fichiers de votre appareil. Pour l’instant, une connexion est nécessaire pour ouvrir cette page et vérifier l’accès avant chaque lecture ; l’enregistrement lui-même est stocké ici.',
    'downloads.paused':
      'Les nouveaux enregistrements ne sont pas ouverts pour le moment. Une leçon déjà enregistrée peut encore être ouverte tant que son cours, la formule Plus et la date de la copie enregistrée restent valables.',
    'downloads.plusNote':
      'L’enregistrement demande une formule Plus. Une leçon enregistrée n’est pas une copie qui vous appartient : elle dure autant que la formule, puis demande à être actualisée.',
    'downloads.back': 'Retour à mon apprentissage',
    'downloads.storageRefused': 'Ce navigateur n’a pas voulu ouvrir le stockage de l’application.',
    'downloads.looking': 'Recherche de ce qui se trouve sur cet appareil…',
    'downloads.empty':
      'Rien n’est enregistré sur cet appareil. Une leçon que vous enregistrez apparaît ici et nulle part ailleurs : elle n’est pas dans le dossier des téléchargements de votre téléphone.',
    'downloads.count': 'Leçons sur cet appareil : {count}',
    'downloads.space': 'Espace utilisé : {size}',
    'downloads.closePlayer': 'Fermer le lecteur',
    'downloads.badgeLapsed': 'À actualiser',
    'downloads.badgeSaved': 'Enregistrée sur cet appareil',
    'downloads.lapsed':
      'Cette copie enregistrée a expiré. Ouvrez la leçon en étant en ligne pour l’enregistrer de nouveau.',
    'downloads.daysLeft': 'Jours restants : {days}',
    'downloads.play': 'Lire',
    'downloads.opening': 'Ouverture…',
    'downloads.remove': 'Retirer',
    'downloads.removing': 'Retrait…',
    'downloads.removeLocal': 'Retirer seulement la copie de cet appareil',
    'downloads.gone': 'Cette leçon n’est plus sur cet appareil.',
    'downloads.openFailed': 'Cette leçon enregistrée n’a pas pu être ouverte.',
    'downloads.needConnection':
      'Connectez-vous à Internet pour ouvrir cette leçon enregistrée et vérifier l’accès.',
    'downloads.notAllowed': 'Cette leçon enregistrée n’est plus disponible pour ce compte ou cette formule.',
    'downloads.removedCopy': 'Cette copie enregistrée a été retirée et ne peut plus être ouverte.',
    'downloads.signIn': 'Identifiez-vous pour ouvrir une leçon enregistrée.',
    'downloads.removeUnconfirmed':
      'Le retrait n’a pas pu être confirmé auprès du serveur. Reconnectez-vous et réessayez ; la copie de cet appareil est toujours là.',
    'downloads.removeLocalFailed':
      'Le serveur a noté le retrait, mais ce navigateur n’a pas pu retirer sa propre copie. Réessayez, ou retirez seulement la copie de cet appareil.',
    'downloads.confirmLocal':
      'Retirer seulement la copie de cet appareil ? La trace côté serveur reste, et aucune place d’appareil n’est libérée.',
    'downloads.localRemoved':
      'La copie de cet appareil a été retirée. La trace côté serveur et la place d’appareil peuvent subsister.',
    'downloads.localFailed': 'Ce navigateur n’a pas pu retirer la copie de cet appareil.',
    'downloads.devTitle': 'Appareils qui gardent des leçons enregistrées',
    'downloads.devLede':
      'Retirez un appareil pour libérer sa place et mettre fin à ses enregistrements côté serveur. Les copies ou les clés déjà gardées sur cet appareil ne peuvent pas être supprimées d’ici.',
    'downloads.devLoading': 'Chargement des appareils…',
    'downloads.devUnread': 'La liste des appareils n’a pas pu être chargée. Ne la tenez pas pour vide.',
    'downloads.devRefresh': 'Actualiser',
    'downloads.devNone': 'Aucun appareil n’est dans la liste pour le moment.',
    'downloads.devUnnamed': 'Appareil sans nom',
    'downloads.devSaved': 'Leçons enregistrées : {count}',
    'downloads.devSeen': 'Vu pour la dernière fois : {day}',
    'downloads.devRemove': 'Retirer l’appareil',
    'downloads.devConfirm':
      'Retirer cet appareil ? Ses leçons enregistrées ne s’ouvriront plus par l’application. Cela ne peut ni effacer les copies sur l’appareil ni reprendre les clés qu’il détient déjà.',
    'downloads.devUnconfirmed':
      'Le retrait de l’appareil n’a pas pu être confirmé. Actualisez la liste et réessayez ; une réponse perdue l’a peut-être retiré malgré tout.',
    'downloads.devRemoved':
      'Le serveur a noté le retrait de l’appareil. Les copies et les clés gardées sur cet appareil n’ont pas été effacées d’ici.',
    'downloads.devRemovedUnrefreshed':
      'Le serveur a noté le retrait, mais la liste des appareils n’a pas pu être actualisée.',
  },
  es: {
    'downloads.title': 'En este dispositivo',
    'downloads.lede':
      'Las lecciones que guardaste para usarlas sin conexión. Se guardan dentro de esta aplicación, no en el gestor de archivos de tu dispositivo. Por ahora hace falta conexión para abrir esta página y comprobar el acceso antes de cada reproducción; la grabación en sí está almacenada aquí.',
    'downloads.paused':
      'Ahora no se pueden guardar lecciones nuevas. Una lección ya guardada se puede seguir abriendo mientras su curso, el plan Plus y la fecha de la copia guardada sigan vigentes.',
    'downloads.plusNote':
      'Guardar requiere un plan Plus. Una lección guardada no es una copia tuya: dura lo que dure el plan y después pide que se actualice.',
    'downloads.back': 'Volver a mi aprendizaje',
    'downloads.storageRefused': 'Este navegador no quiso abrir el almacenamiento de la aplicación.',
    'downloads.looking': 'Mirando lo que hay en este dispositivo…',
    'downloads.empty':
      'No hay nada guardado en este dispositivo. Una lección que guardas aparece aquí y en ningún otro sitio: no está en la carpeta de descargas de tu teléfono.',
    'downloads.count': 'Lecciones en este dispositivo: {count}',
    'downloads.space': 'Espacio usado: {size}',
    'downloads.closePlayer': 'Cerrar el reproductor',
    'downloads.badgeLapsed': 'Hay que actualizarla',
    'downloads.badgeSaved': 'Guardada en este dispositivo',
    'downloads.lapsed':
      'Esta copia guardada ha caducado. Abre la lección con conexión para guardarla de nuevo.',
    'downloads.daysLeft': 'Días restantes: {days}',
    'downloads.play': 'Reproducir',
    'downloads.opening': 'Abriendo…',
    'downloads.remove': 'Quitar',
    'downloads.removing': 'Quitando…',
    'downloads.removeLocal': 'Quitar solo la copia de este dispositivo',
    'downloads.gone': 'Esa lección ya no está en este dispositivo.',
    'downloads.openFailed': 'No se pudo abrir esa lección guardada.',
    'downloads.needConnection':
      'Conéctate a internet para abrir esta lección guardada y comprobar el acceso.',
    'downloads.notAllowed': 'Esta lección guardada ya no está disponible para esta cuenta o este plan.',
    'downloads.removedCopy': 'Esta copia guardada se quitó y ya no se puede abrir.',
    'downloads.signIn': 'Inicia sesión para abrir una lección guardada.',
    'downloads.removeUnconfirmed':
      'No se pudo confirmar con el servidor que se quitó. Vuelve a conectarte e inténtalo otra vez; la copia de este dispositivo sigue aquí.',
    'downloads.removeLocalFailed':
      'El servidor registró que se quitó, pero este navegador no pudo quitar su propia copia. Inténtalo otra vez, o quita solo la copia de este dispositivo.',
    'downloads.confirmLocal':
      '¿Quitar solo la copia de este dispositivo? El registro del servidor se queda, y no se libera ningún puesto de dispositivo.',
    'downloads.localRemoved':
      'Se quitó la copia de este dispositivo. Puede que el registro del servidor y el puesto de dispositivo sigan ahí.',
    'downloads.localFailed': 'Este navegador no pudo quitar la copia de este dispositivo.',
    'downloads.devTitle': 'Dispositivos con lecciones guardadas',
    'downloads.devLede':
      'Quita un dispositivo para liberar su puesto y terminar sus guardados en el servidor. Las copias o las claves que ya estén en ese dispositivo no se pueden borrar desde aquí.',
    'downloads.devLoading': 'Cargando los dispositivos…',
    'downloads.devUnread': 'No se pudo cargar la lista de dispositivos. No des por hecho que está vacía.',
    'downloads.devRefresh': 'Actualizar',
    'downloads.devNone': 'Ahora no hay dispositivos en la lista.',
    'downloads.devUnnamed': 'Dispositivo sin nombre',
    'downloads.devSaved': 'Lecciones guardadas: {count}',
    'downloads.devSeen': 'Visto por última vez: {day}',
    'downloads.devRemove': 'Quitar el dispositivo',
    'downloads.devConfirm':
      '¿Quitar este dispositivo? Sus lecciones guardadas dejarán de abrirse desde la aplicación. Esto no puede borrar las copias del dispositivo ni recuperar las claves que ya tiene.',
    'downloads.devUnconfirmed':
      'No se pudo confirmar que el dispositivo se quitó. Actualiza la lista e inténtalo otra vez; una respuesta que se perdió puede haberlo quitado igualmente.',
    'downloads.devRemoved':
      'El servidor registró que se quitó el dispositivo. Las copias y las claves de ese dispositivo no se borraron desde aquí.',
    'downloads.devRemovedUnrefreshed':
      'El servidor registró que se quitó, pero no se pudo actualizar la lista de dispositivos.',
  },
  pt: {
    'downloads.title': 'Neste dispositivo',
    'downloads.lede':
      'As aulas que você guardou para usar sem conexão. Elas ficam dentro deste aplicativo, não no gerenciador de arquivos do seu dispositivo. Por enquanto é preciso conexão para abrir esta página e verificar o acesso antes de cada reprodução; a gravação em si fica armazenada aqui.',
    'downloads.paused':
      'Novos salvamentos não estão abertos agora. Uma aula já guardada ainda pode ser aberta enquanto o curso dela, o plano Plus e a data da cópia guardada continuarem válidos.',
    'downloads.plusNote':
      'Guardar exige um plano Plus. Uma aula guardada não é uma cópia sua: dura enquanto durar o plano e depois pede para ser atualizada.',
    'downloads.back': 'Voltar ao meu aprendizado',
    'downloads.storageRefused': 'Este navegador não quis abrir o armazenamento do aplicativo.',
    'downloads.looking': 'Vendo o que há neste dispositivo…',
    'downloads.empty':
      'Não há nada guardado neste dispositivo. Uma aula que você guarda aparece aqui e em nenhum outro lugar: não está na pasta de downloads do seu telefone.',
    'downloads.count': 'Aulas neste dispositivo: {count}',
    'downloads.space': 'Espaço usado: {size}',
    'downloads.closePlayer': 'Fechar o reprodutor',
    'downloads.badgeLapsed': 'Precisa ser atualizada',
    'downloads.badgeSaved': 'Guardada neste dispositivo',
    'downloads.lapsed': 'Esta cópia guardada expirou. Abra a aula com conexão para guardá-la de novo.',
    'downloads.daysLeft': 'Dias restantes: {days}',
    'downloads.play': 'Reproduzir',
    'downloads.opening': 'Abrindo…',
    'downloads.remove': 'Remover',
    'downloads.removing': 'Removendo…',
    'downloads.removeLocal': 'Remover só a cópia deste dispositivo',
    'downloads.gone': 'Essa aula não está mais neste dispositivo.',
    'downloads.openFailed': 'Não foi possível abrir essa aula guardada.',
    'downloads.needConnection': 'Conecte-se à internet para abrir esta aula guardada e verificar o acesso.',
    'downloads.notAllowed': 'Esta aula guardada não está mais disponível para esta conta ou este plano.',
    'downloads.removedCopy': 'Esta cópia guardada foi removida e não pode mais ser aberta.',
    'downloads.signIn': 'Entre para abrir uma aula guardada.',
    'downloads.removeUnconfirmed':
      'Não foi possível confirmar a remoção com o servidor. Reconecte-se e tente de novo; a cópia deste dispositivo continua aqui.',
    'downloads.removeLocalFailed':
      'O servidor registrou a remoção, mas este navegador não conseguiu remover a própria cópia. Tente de novo, ou remova só a cópia deste dispositivo.',
    'downloads.confirmLocal':
      'Remover só a cópia deste dispositivo? O registro no servidor permanece, e nenhuma vaga de dispositivo é liberada.',
    'downloads.localRemoved':
      'A cópia deste dispositivo foi removida. O registro no servidor e a vaga de dispositivo podem continuar.',
    'downloads.localFailed': 'Este navegador não conseguiu remover a cópia deste dispositivo.',
    'downloads.devTitle': 'Dispositivos com aulas guardadas',
    'downloads.devLede':
      'Remova um dispositivo para liberar a vaga dele e encerrar o que ele guardou no servidor. As cópias ou chaves que já estão nesse dispositivo não podem ser apagadas daqui.',
    'downloads.devLoading': 'Carregando os dispositivos…',
    'downloads.devUnread':
      'Não foi possível carregar a lista de dispositivos. Não presuma que ela está vazia.',
    'downloads.devRefresh': 'Atualizar',
    'downloads.devNone': 'Não há dispositivos na lista agora.',
    'downloads.devUnnamed': 'Dispositivo sem nome',
    'downloads.devSaved': 'Aulas guardadas: {count}',
    'downloads.devSeen': 'Visto pela última vez: {day}',
    'downloads.devRemove': 'Remover o dispositivo',
    'downloads.devConfirm':
      'Remover este dispositivo? As aulas guardadas nele deixarão de abrir pelo aplicativo. Isso não apaga as cópias no dispositivo nem recupera as chaves que ele já tem.',
    'downloads.devUnconfirmed':
      'Não foi possível confirmar a remoção do dispositivo. Atualize a lista e tente de novo; uma resposta que se perdeu pode tê-lo removido mesmo assim.',
    'downloads.devRemoved':
      'O servidor registrou a remoção do dispositivo. As cópias e chaves que estão nesse dispositivo não foram apagadas daqui.',
    'downloads.devRemovedUnrefreshed':
      'O servidor registrou a remoção, mas não foi possível atualizar a lista de dispositivos.',
  },
  sw: {
    'downloads.title': 'Kwenye kifaa hiki',
    'downloads.lede':
      'Masomo uliyohifadhi ili kuyatumia bila mtandao. Yanawekwa ndani ya programu hii, si kwenye kidhibiti cha faili cha kifaa chako. Kwa sasa muunganisho unahitajika ili kufungua ukurasa huu na kukagua ruhusa kabla ya kila uchezaji; rekodi yenyewe imehifadhiwa hapa.',
    'downloads.paused':
      'Kuhifadhi masomo mapya hakujafunguliwa kwa sasa. Somo lililokwisha hifadhiwa bado linaweza kufunguliwa maadamu kozi yake, mpango wa Plus na tarehe ya nakala iliyohifadhiwa bado ni halali.',
    'downloads.plusNote':
      'Kuhifadhi kunahitaji mpango wa Plus. Somo lililohifadhiwa si nakala unayoimiliki: linadumu kadiri mpango unavyodumu, kisha linaomba kusasishwa.',
    'downloads.back': 'Rudi kwenye masomo yangu',
    'downloads.storageRefused': 'Kivinjari hiki kilikataa kufungua hifadhi ya programu.',
    'downloads.looking': 'Inaangalia kilichopo kwenye kifaa hiki…',
    'downloads.empty':
      'Hakuna kilichohifadhiwa kwenye kifaa hiki. Somo unalohifadhi huonekana hapa tu na si mahali pengine: halipo kwenye folda ya vipakuliwa ya simu yako.',
    'downloads.count': 'Masomo kwenye kifaa hiki: {count}',
    'downloads.space': 'Nafasi iliyotumika: {size}',
    'downloads.closePlayer': 'Funga kichezaji',
    'downloads.badgeLapsed': 'Linahitaji kusasishwa',
    'downloads.badgeSaved': 'Limehifadhiwa kwenye kifaa hiki',
    'downloads.lapsed':
      'Nakala hii iliyohifadhiwa imepitwa na muda. Fungua somo ukiwa mtandaoni ili kulihifadhi tena.',
    'downloads.daysLeft': 'Siku zilizobaki: {days}',
    'downloads.play': 'Cheza',
    'downloads.opening': 'Inafungua…',
    'downloads.remove': 'Ondoa',
    'downloads.removing': 'Inaondoa…',
    'downloads.removeLocal': 'Ondoa nakala ya kifaa hiki pekee',
    'downloads.gone': 'Somo hilo halipo tena kwenye kifaa hiki.',
    'downloads.openFailed': 'Somo hilo lililohifadhiwa halikuweza kufunguliwa.',
    'downloads.needConnection':
      'Unganisha kwenye intaneti ili kufungua somo hili lililohifadhiwa na kukagua ruhusa.',
    'downloads.notAllowed': 'Somo hili lililohifadhiwa halipatikani tena kwa akaunti hii au mpango huu.',
    'downloads.removedCopy': 'Nakala hii iliyohifadhiwa iliondolewa na haiwezi kufunguliwa tena.',
    'downloads.signIn': 'Ingia ili kufungua somo lililohifadhiwa.',
    'downloads.removeUnconfirmed':
      'Kuondolewa hakukuweza kuthibitishwa na seva. Unganisha tena kisha ujaribu tena; nakala ya kifaa hiki bado ipo hapa.',
    'downloads.removeLocalFailed':
      'Seva ilirekodi kuondolewa, lakini kivinjari hiki hakikuweza kuondoa nakala yake. Jaribu tena, au ondoa nakala ya kifaa hiki pekee.',
    'downloads.confirmLocal':
      'Ondoa nakala ya kifaa hiki pekee? Rekodi ya seva inabaki, na hakuna nafasi ya kifaa inayoachiliwa.',
    'downloads.localRemoved':
      'Nakala ya kifaa hiki imeondolewa. Rekodi ya seva na nafasi ya kifaa huenda bado zipo.',
    'downloads.localFailed': 'Kivinjari hiki hakikuweza kuondoa nakala ya kifaa hiki.',
    'downloads.devTitle': 'Vifaa vyenye masomo yaliyohifadhiwa',
    'downloads.devLede':
      'Ondoa kifaa ili kuachilia nafasi yake na kumaliza hifadhi zake kwenye seva. Nakala au funguo zilizokwisha kuwekwa kwenye kifaa hicho haziwezi kufutwa kutoka hapa.',
    'downloads.devLoading': 'Inapakia vifaa…',
    'downloads.devUnread': 'Orodha ya vifaa haikuweza kupakiwa. Usidhani kuwa ni tupu.',
    'downloads.devRefresh': 'Onyesha upya',
    'downloads.devNone': 'Hakuna vifaa kwenye orodha kwa sasa.',
    'downloads.devUnnamed': 'Kifaa kisicho na jina',
    'downloads.devSaved': 'Masomo yaliyohifadhiwa: {count}',
    'downloads.devSeen': 'Kilionekana mara ya mwisho: {day}',
    'downloads.devRemove': 'Ondoa kifaa',
    'downloads.devConfirm':
      'Ondoa kifaa hiki? Masomo yake yaliyohifadhiwa yataacha kufunguka kupitia programu. Hili haliwezi kufuta nakala zilizo kwenye kifaa wala kurudisha funguo ambazo tayari kinazo.',
    'downloads.devUnconfirmed':
      'Kuondolewa kwa kifaa hakukuweza kuthibitishwa. Onyesha upya orodha kisha ujaribu tena; jibu lililopotea huenda limekiondoa hata hivyo.',
    'downloads.devRemoved':
      'Seva ilirekodi kuondolewa kwa kifaa. Nakala na funguo zilizo kwenye kifaa hicho hazikufutwa kutoka hapa.',
    'downloads.devRemovedUnrefreshed':
      'Seva ilirekodi kuondolewa, lakini orodha ya vifaa haikuweza kuonyeshwa upya.',
  },
  af: {
    'downloads.title': 'Op hierdie toestel',
    'downloads.lede':
      'Lesse wat jy gestoor het om vanlyn te gebruik. Hulle word binne hierdie toepassing gehou, nie in jou toestel se lêerbestuurder nie. Vir eers is ’n verbinding nodig om hierdie bladsy oop te maak en toegang voor elke afspeel na te gaan; die opname self is hier gestoor.',
    'downloads.paused':
      'Nuwe stoorwerk is nie nou oop nie. ’n Les wat reeds gestoor is, kan nog oopgemaak word solank sy kursus, die Plus-plan en die datum op die gestoorde kopie almal geldig bly.',
    'downloads.plusNote':
      'Stoor vereis ’n Plus-plan. ’n Gestoorde les is nie ’n kopie wat aan jou behoort nie: dit hou so lank as die plan, en vra dan om verfris te word.',
    'downloads.back': 'Terug na my leerwerk',
    'downloads.storageRefused': 'Hierdie blaaier wou nie die toepassing se stoorplek oopmaak nie.',
    'downloads.looking': 'Kyk wat op hierdie toestel is…',
    'downloads.empty':
      'Niks is op hierdie toestel gestoor nie. ’n Les wat jy stoor, verskyn hier en nêrens anders nie: dit is nie in jou foon se aflaaie-vouer nie.',
    'downloads.count': 'Lesse op hierdie toestel: {count}',
    'downloads.space': 'Spasie gebruik: {size}',
    'downloads.closePlayer': 'Maak die speler toe',
    'downloads.badgeLapsed': 'Moet verfris word',
    'downloads.badgeSaved': 'Op hierdie toestel gestoor',
    'downloads.lapsed':
      'Hierdie gestoorde kopie het verval. Maak die les oop terwyl jy aanlyn is om dit weer te stoor.',
    'downloads.daysLeft': 'Dae oor: {days}',
    'downloads.play': 'Speel',
    'downloads.opening': 'Maak oop…',
    'downloads.remove': 'Verwyder',
    'downloads.removing': 'Verwyder tans…',
    'downloads.removeLocal': 'Verwyder net die kopie op hierdie toestel',
    'downloads.gone': 'Daardie les is nie meer op hierdie toestel nie.',
    'downloads.openFailed': 'Daardie gestoorde les kon nie oopgemaak word nie.',
    'downloads.needConnection':
      'Koppel aan die internet om hierdie gestoorde les oop te maak en toegang na te gaan.',
    'downloads.notAllowed': 'Hierdie gestoorde les is nie meer vir hierdie rekening of plan beskikbaar nie.',
    'downloads.removedCopy': 'Hierdie gestoorde kopie is verwyder en kan nie meer oopgemaak word nie.',
    'downloads.signIn': 'Meld aan om ’n gestoorde les oop te maak.',
    'downloads.removeUnconfirmed':
      'Die verwydering kon nie met die bediener bevestig word nie. Koppel weer en probeer weer; die kopie op hierdie toestel is nog hier.',
    'downloads.removeLocalFailed':
      'Die bediener het die verwydering aangeteken, maar hierdie blaaier kon nie sy eie kopie verwyder nie. Probeer weer, of verwyder net die kopie op hierdie toestel.',
    'downloads.confirmLocal':
      'Verwyder net die kopie op hierdie toestel? Die bediener se rekord bly, en geen toestelplek word vrygemaak nie.',
    'downloads.localRemoved':
      'Die kopie op hierdie toestel is verwyder. Die bediener se rekord en die toestelplek kan nog bly.',
    'downloads.localFailed': 'Hierdie blaaier kon nie die kopie op hierdie toestel verwyder nie.',
    'downloads.devTitle': 'Toestelle wat gestoorde lesse hou',
    'downloads.devLede':
      'Verwyder ’n toestel om sy plek vry te maak en sy stoorwerk op die bediener te beëindig. Kopieë of sleutels wat reeds op daardie toestel is, kan nie van hier af uitgevee word nie.',
    'downloads.devLoading': 'Laai tans die toestelle…',
    'downloads.devUnread': 'Die lys toestelle kon nie gelaai word nie. Moenie aanvaar dat dit leeg is nie.',
    'downloads.devRefresh': 'Verfris',
    'downloads.devNone': 'Geen toestelle is nou in die lys nie.',
    'downloads.devUnnamed': 'Toestel sonder naam',
    'downloads.devSaved': 'Gestoorde lesse: {count}',
    'downloads.devSeen': 'Laas gesien: {day}',
    'downloads.devRemove': 'Verwyder die toestel',
    'downloads.devConfirm':
      'Verwyder hierdie toestel? Sy gestoorde lesse sal nie meer deur die toepassing oopmaak nie. Dit kan nie kopieë op die toestel uitvee of sleutels terugneem wat dit reeds het nie.',
    'downloads.devUnconfirmed':
      'Die verwydering van die toestel kon nie bevestig word nie. Verfris die lys en probeer weer; ’n antwoord wat verlore geraak het, het dit dalk tog verwyder.',
    'downloads.devRemoved':
      'Die bediener het die verwydering van die toestel aangeteken. Kopieë en sleutels op daardie toestel is nie van hier af uitgevee nie.',
    'downloads.devRemovedUnrefreshed':
      'Die bediener het die verwydering aangeteken, maar die lys toestelle kon nie verfris word nie.',
  },
  'zh-hans': {
    'downloads.title': '在这台设备上',
    'downloads.lede': '你为离线使用而保存的课。它们保存在本应用内，不在设备的文件管理器里。目前打开此页面以及每次播放前核对访问权限都需要联网；录制内容本身存放在这里。',
    'downloads.paused': '现在不开放新的保存。已保存的课，只要其课程、Plus 套餐和保存副本的日期都仍然有效，就还能打开。',
    'downloads.plusNote': '保存需要 Plus 套餐。保存的课不是归你所有的副本：套餐有效期间它一直保留，之后会要求刷新。',
    'downloads.back': '返回我的学习',
    'downloads.storageRefused': '此浏览器不肯打开应用的存储空间。',
    'downloads.looking': '正在查看这台设备上有什么…',
    'downloads.empty': '这台设备上没有保存任何内容。你保存的课只出现在这里，不在别处：它不在手机的下载文件夹里。',
    'downloads.count': '这台设备上的课：{count}',
    'downloads.space': '已用空间：{size}',
    'downloads.closePlayer': '关闭播放器',
    'downloads.badgeLapsed': '需要刷新',
    'downloads.badgeSaved': '已保存到这台设备',
    'downloads.lapsed': '这份保存的副本已过期。请在联网时打开这节课重新保存。',
    'downloads.daysLeft': '剩余天数：{days}',
    'downloads.play': '播放',
    'downloads.opening': '正在打开…',
    'downloads.remove': '移除',
    'downloads.removing': '正在移除…',
    'downloads.removeLocal': '只移除这台设备上的副本',
    'downloads.gone': '那节课已不在这台设备上。',
    'downloads.openFailed': '那节保存的课无法打开。',
    'downloads.needConnection': '请连接互联网，以打开这节保存的课并核对访问权限。',
    'downloads.notAllowed': '这节保存的课已不再对此账户或此套餐开放。',
    'downloads.removedCopy': '这份保存的副本已被移除，无法再打开。',
    'downloads.signIn': '请登录以打开保存的课。',
    'downloads.removeUnconfirmed': '无法向服务器确认移除。请重新联网后再试；这台设备上的副本还在。',
    'downloads.removeLocalFailed': '服务器已记录移除，但此浏览器未能移除自己的副本。请再试一次，或只移除这台设备上的副本。',
    'downloads.confirmLocal': '只移除这台设备上的副本吗？服务器上的记录会保留，也不会腾出设备名额。',
    'downloads.localRemoved': '这台设备上的副本已移除。服务器上的记录和设备名额可能仍然保留。',
    'downloads.localFailed': '此浏览器未能移除这台设备上的副本。',
    'downloads.devTitle': '存有已保存课的设备',
    'downloads.devLede': '移除一台设备可腾出它的名额，并结束它在服务器上的保存。已留在那台设备上的副本或密钥无法从这里删除。',
    'downloads.devLoading': '正在加载设备…',
    'downloads.devUnread': '设备列表未能加载。不要当作它是空的。',
    'downloads.devRefresh': '刷新',
    'downloads.devNone': '列表中现在没有设备。',
    'downloads.devUnnamed': '未命名的设备',
    'downloads.devSaved': '已保存的课：{count}',
    'downloads.devSeen': '上次出现：{day}',
    'downloads.devRemove': '移除设备',
    'downloads.devConfirm': '移除这台设备吗？它保存的课将不再能通过应用打开。这无法抹去设备上的副本，也收不回它已持有的密钥。',
    'downloads.devUnconfirmed': '无法确认设备已移除。请刷新列表后再试；丢失的那次回复也许已经把它移除了。',
    'downloads.devRemoved': '服务器已记录设备的移除。留在那台设备上的副本和密钥并未从这里抹去。',
    'downloads.devRemovedUnrefreshed': '服务器已记录移除，但设备列表未能刷新。',
  },
  'zh-hant': {
    'downloads.title': '在這台裝置上',
    'downloads.lede': '你為離線使用而儲存的課。它們存放在本應用程式內，不在裝置的檔案管理員裡。目前開啟此頁面以及每次播放前核對存取權限都需要連線；錄製內容本身存放在這裡。',
    'downloads.paused': '現在不開放新的儲存。已儲存的課，只要其課程、Plus 方案和儲存副本的日期都仍然有效，就還能開啟。',
    'downloads.plusNote': '儲存需要 Plus 方案。儲存的課不是歸你所有的副本：方案有效期間它一直保留，之後會要求重新整理。',
    'downloads.back': '返回我的學習',
    'downloads.storageRefused': '此瀏覽器不肯開啟應用程式的儲存空間。',
    'downloads.looking': '正在查看這台裝置上有什麼…',
    'downloads.empty': '這台裝置上沒有儲存任何內容。你儲存的課只出現在這裡，不在別處：它不在手機的下載資料夾裡。',
    'downloads.count': '這台裝置上的課：{count}',
    'downloads.space': '已用空間：{size}',
    'downloads.closePlayer': '關閉播放器',
    'downloads.badgeLapsed': '需要重新整理',
    'downloads.badgeSaved': '已儲存到這台裝置',
    'downloads.lapsed': '這份儲存的副本已過期。請在連線時開啟這堂課重新儲存。',
    'downloads.daysLeft': '剩餘天數：{days}',
    'downloads.play': '播放',
    'downloads.opening': '正在開啟…',
    'downloads.remove': '移除',
    'downloads.removing': '正在移除…',
    'downloads.removeLocal': '只移除這台裝置上的副本',
    'downloads.gone': '那堂課已不在這台裝置上。',
    'downloads.openFailed': '那堂儲存的課無法開啟。',
    'downloads.needConnection': '請連上網際網路，以開啟這堂儲存的課並核對存取權限。',
    'downloads.notAllowed': '這堂儲存的課已不再對此帳戶或此方案開放。',
    'downloads.removedCopy': '這份儲存的副本已被移除，無法再開啟。',
    'downloads.signIn': '請登入以開啟儲存的課。',
    'downloads.removeUnconfirmed': '無法向伺服器確認移除。請重新連線後再試；這台裝置上的副本還在。',
    'downloads.removeLocalFailed': '伺服器已記錄移除，但此瀏覽器未能移除自己的副本。請再試一次，或只移除這台裝置上的副本。',
    'downloads.confirmLocal': '只移除這台裝置上的副本嗎？伺服器上的紀錄會保留，也不會騰出裝置名額。',
    'downloads.localRemoved': '這台裝置上的副本已移除。伺服器上的紀錄和裝置名額可能仍然保留。',
    'downloads.localFailed': '此瀏覽器未能移除這台裝置上的副本。',
    'downloads.devTitle': '存有已儲存課的裝置',
    'downloads.devLede': '移除一台裝置可騰出它的名額，並結束它在伺服器上的儲存。已留在那台裝置上的副本或金鑰無法從這裡刪除。',
    'downloads.devLoading': '正在載入裝置…',
    'downloads.devUnread': '裝置清單未能載入。不要當作它是空的。',
    'downloads.devRefresh': '重新整理',
    'downloads.devNone': '清單中現在沒有裝置。',
    'downloads.devUnnamed': '未命名的裝置',
    'downloads.devSaved': '已儲存的課：{count}',
    'downloads.devSeen': '上次出現：{day}',
    'downloads.devRemove': '移除裝置',
    'downloads.devConfirm': '移除這台裝置嗎？它儲存的課將不再能透過應用程式開啟。這無法抹去裝置上的副本，也收不回它已持有的金鑰。',
    'downloads.devUnconfirmed': '無法確認裝置已移除。請重新整理清單後再試；遺失的那次回覆也許已經把它移除了。',
    'downloads.devRemoved': '伺服器已記錄裝置的移除。留在那台裝置上的副本和金鑰並未從這裡抹去。',
    'downloads.devRemovedUnrefreshed': '伺服器已記錄移除，但裝置清單未能重新整理。',
  },
  vi: {
    'downloads.title': 'Trên thiết bị này',
    'downloads.lede':
      'Các bài học bạn đã lưu để dùng khi không có mạng. Chúng được giữ bên trong ứng dụng này, không nằm trong trình quản lý tệp của thiết bị. Hiện tại cần có kết nối để mở trang này và kiểm tra quyền truy cập trước mỗi lần phát; bản ghi thì được lưu ngay tại đây.',
    'downloads.paused':
      'Hiện chưa mở việc lưu mới. Bài học đã lưu vẫn mở được chừng nào khóa học của nó, gói Plus và ngày của bản lưu đều còn hiệu lực.',
    'downloads.plusNote':
      'Việc lưu cần gói Plus. Bài học đã lưu không phải là bản sao thuộc về bạn: nó tồn tại chừng nào gói còn, rồi sẽ yêu cầu làm mới.',
    'downloads.back': 'Quay lại việc học của tôi',
    'downloads.storageRefused': 'Trình duyệt này không chịu mở bộ nhớ của ứng dụng.',
    'downloads.looking': 'Đang xem trên thiết bị này có gì…',
    'downloads.empty':
      'Chưa có gì được lưu trên thiết bị này. Bài học bạn lưu chỉ hiện ở đây, không ở nơi nào khác: nó không nằm trong thư mục tải xuống của điện thoại.',
    'downloads.count': 'Bài học trên thiết bị này: {count}',
    'downloads.space': 'Dung lượng đã dùng: {size}',
    'downloads.closePlayer': 'Đóng trình phát',
    'downloads.badgeLapsed': 'Cần làm mới',
    'downloads.badgeSaved': 'Đã lưu trên thiết bị này',
    'downloads.lapsed': 'Bản lưu này đã hết hạn. Hãy mở bài học khi có mạng để lưu lại.',
    'downloads.daysLeft': 'Số ngày còn lại: {days}',
    'downloads.play': 'Phát',
    'downloads.opening': 'Đang mở…',
    'downloads.remove': 'Gỡ',
    'downloads.removing': 'Đang gỡ…',
    'downloads.removeLocal': 'Chỉ gỡ bản lưu trên thiết bị này',
    'downloads.gone': 'Bài học đó không còn trên thiết bị này.',
    'downloads.openFailed': 'Không mở được bài học đã lưu đó.',
    'downloads.needConnection': 'Hãy kết nối internet để mở bài học đã lưu này và kiểm tra quyền truy cập.',
    'downloads.notAllowed': 'Bài học đã lưu này không còn dành cho tài khoản hoặc gói này.',
    'downloads.removedCopy': 'Bản lưu này đã bị gỡ và không mở được nữa.',
    'downloads.signIn': 'Hãy đăng nhập để mở bài học đã lưu.',
    'downloads.removeUnconfirmed':
      'Không xác nhận được việc gỡ với máy chủ. Hãy kết nối lại rồi thử lại; bản lưu trên thiết bị này vẫn còn đây.',
    'downloads.removeLocalFailed':
      'Máy chủ đã ghi nhận việc gỡ, nhưng trình duyệt này không gỡ được bản lưu của chính nó. Hãy thử lại, hoặc chỉ gỡ bản lưu trên thiết bị này.',
    'downloads.confirmLocal':
      'Chỉ gỡ bản lưu trên thiết bị này? Ghi nhận trên máy chủ vẫn còn, và không có chỗ thiết bị nào được giải phóng.',
    'downloads.localRemoved':
      'Bản lưu trên thiết bị này đã được gỡ. Ghi nhận trên máy chủ và chỗ của thiết bị có thể vẫn còn.',
    'downloads.localFailed': 'Trình duyệt này không gỡ được bản lưu trên thiết bị này.',
    'downloads.devTitle': 'Các thiết bị đang giữ bài học đã lưu',
    'downloads.devLede':
      'Gỡ một thiết bị để giải phóng chỗ của nó và chấm dứt các bản lưu của nó trên máy chủ. Các bản sao hoặc khóa đã nằm trên thiết bị đó thì không xóa được từ đây.',
    'downloads.devLoading': 'Đang tải các thiết bị…',
    'downloads.devUnread': 'Không tải được danh sách thiết bị. Đừng coi như danh sách trống.',
    'downloads.devRefresh': 'Làm mới',
    'downloads.devNone': 'Hiện không có thiết bị nào trong danh sách.',
    'downloads.devUnnamed': 'Thiết bị chưa có tên',
    'downloads.devSaved': 'Bài học đã lưu: {count}',
    'downloads.devSeen': 'Lần cuối thấy: {day}',
    'downloads.devRemove': 'Gỡ thiết bị',
    'downloads.devConfirm':
      'Gỡ thiết bị này? Các bài học đã lưu của nó sẽ không còn mở được qua ứng dụng. Việc này không xóa được các bản sao trên thiết bị, cũng không thu lại được các khóa mà nó đang giữ.',
    'downloads.devUnconfirmed':
      'Không xác nhận được việc gỡ thiết bị. Hãy làm mới danh sách rồi thử lại; một phản hồi bị mất có thể vẫn đã gỡ nó.',
    'downloads.devRemoved':
      'Máy chủ đã ghi nhận việc gỡ thiết bị. Các bản sao và khóa nằm trên thiết bị đó không bị xóa từ đây.',
    'downloads.devRemovedUnrefreshed':
      'Máy chủ đã ghi nhận việc gỡ, nhưng không làm mới được danh sách thiết bị.',
  },
  th: {
    'downloads.title': 'บนอุปกรณ์นี้',
    'downloads.lede':
      'บทเรียนที่คุณบันทึกไว้เพื่อใช้แบบออฟไลน์ บทเรียนเหล่านี้เก็บอยู่ภายในแอปนี้ ไม่ได้อยู่ในตัวจัดการไฟล์ของอุปกรณ์ ในตอนนี้ยังต้องมีการเชื่อมต่อเพื่อเปิดหน้านี้และตรวจสอบสิทธิ์ก่อนเล่นทุกครั้ง ส่วนตัวบันทึกเองเก็บไว้ที่นี่',
    'downloads.paused':
      'ตอนนี้ยังไม่เปิดให้บันทึกใหม่ บทเรียนที่บันทึกไว้แล้วยังเปิดได้ ตราบใดที่คอร์สของบทเรียน แผน Plus และวันที่ของสำเนาที่บันทึกยังใช้ได้ทั้งหมด',
    'downloads.plusNote':
      'การบันทึกต้องใช้แผน Plus บทเรียนที่บันทึกไว้ไม่ใช่สำเนาที่คุณเป็นเจ้าของ: จะอยู่ตราบเท่าที่แผนยังอยู่ แล้วจะขอให้รีเฟรช',
    'downloads.back': 'กลับไปที่การเรียนของฉัน',
    'downloads.storageRefused': 'เบราว์เซอร์นี้ไม่ยอมเปิดพื้นที่จัดเก็บของแอป',
    'downloads.looking': 'กำลังดูว่ามีอะไรอยู่บนอุปกรณ์นี้…',
    'downloads.empty':
      'ไม่มีอะไรบันทึกไว้บนอุปกรณ์นี้ บทเรียนที่คุณบันทึกจะปรากฏที่นี่เท่านั้น ไม่ได้อยู่ในโฟลเดอร์ดาวน์โหลดของโทรศัพท์',
    'downloads.count': 'บทเรียนบนอุปกรณ์นี้: {count}',
    'downloads.space': 'พื้นที่ที่ใช้: {size}',
    'downloads.closePlayer': 'ปิดตัวเล่น',
    'downloads.badgeLapsed': 'ต้องรีเฟรช',
    'downloads.badgeSaved': 'บันทึกไว้บนอุปกรณ์นี้',
    'downloads.lapsed': 'สำเนาที่บันทึกนี้หมดอายุแล้ว เปิดบทเรียนขณะออนไลน์เพื่อบันทึกอีกครั้ง',
    'downloads.daysLeft': 'จำนวนวันที่เหลือ: {days}',
    'downloads.play': 'เล่น',
    'downloads.opening': 'กำลังเปิด…',
    'downloads.remove': 'นำออก',
    'downloads.removing': 'กำลังนำออก…',
    'downloads.removeLocal': 'นำออกเฉพาะสำเนาบนอุปกรณ์นี้',
    'downloads.gone': 'บทเรียนนั้นไม่อยู่บนอุปกรณ์นี้แล้ว',
    'downloads.openFailed': 'เปิดบทเรียนที่บันทึกไว้นั้นไม่ได้',
    'downloads.needConnection': 'เชื่อมต่ออินเทอร์เน็ตเพื่อเปิดบทเรียนที่บันทึกไว้นี้และตรวจสอบสิทธิ์',
    'downloads.notAllowed': 'บทเรียนที่บันทึกไว้นี้ไม่เปิดให้บัญชีนี้หรือแผนนี้อีกแล้ว',
    'downloads.removedCopy': 'สำเนาที่บันทึกนี้ถูกนำออกแล้วและเปิดไม่ได้อีก',
    'downloads.signIn': 'ลงชื่อเข้าใช้เพื่อเปิดบทเรียนที่บันทึกไว้',
    'downloads.removeUnconfirmed':
      'ยืนยันการนำออกกับเซิร์ฟเวอร์ไม่ได้ เชื่อมต่อใหม่แล้วลองอีกครั้ง สำเนาบนอุปกรณ์นี้ยังอยู่ที่นี่',
    'downloads.removeLocalFailed':
      'เซิร์ฟเวอร์บันทึกการนำออกแล้ว แต่เบราว์เซอร์นี้นำสำเนาของตัวเองออกไม่ได้ ลองอีกครั้ง หรือนำออกเฉพาะสำเนาบนอุปกรณ์นี้',
    'downloads.confirmLocal':
      'นำออกเฉพาะสำเนาบนอุปกรณ์นี้ใช่ไหม บันทึกบนเซิร์ฟเวอร์ยังอยู่ และไม่มีที่ของอุปกรณ์ใดว่างลง',
    'downloads.localRemoved': 'นำสำเนาบนอุปกรณ์นี้ออกแล้ว บันทึกบนเซิร์ฟเวอร์และที่ของอุปกรณ์อาจยังอยู่',
    'downloads.localFailed': 'เบราว์เซอร์นี้นำสำเนาบนอุปกรณ์นี้ออกไม่ได้',
    'downloads.devTitle': 'อุปกรณ์ที่เก็บบทเรียนที่บันทึกไว้',
    'downloads.devLede':
      'นำอุปกรณ์ออกเพื่อให้ที่ของอุปกรณ์นั้นว่างและยุติการบันทึกของอุปกรณ์นั้นบนเซิร์ฟเวอร์ สำเนาหรือกุญแจที่อยู่ในอุปกรณ์นั้นแล้วลบจากที่นี่ไม่ได้',
    'downloads.devLoading': 'กำลังโหลดอุปกรณ์…',
    'downloads.devUnread': 'โหลดรายการอุปกรณ์ไม่ได้ อย่าถือว่ารายการว่าง',
    'downloads.devRefresh': 'รีเฟรช',
    'downloads.devNone': 'ตอนนี้ไม่มีอุปกรณ์ในรายการ',
    'downloads.devUnnamed': 'อุปกรณ์ที่ไม่มีชื่อ',
    'downloads.devSaved': 'บทเรียนที่บันทึกไว้: {count}',
    'downloads.devSeen': 'เห็นครั้งล่าสุด: {day}',
    'downloads.devRemove': 'นำอุปกรณ์ออก',
    'downloads.devConfirm':
      'นำอุปกรณ์นี้ออกใช่ไหม บทเรียนที่บันทึกไว้ในอุปกรณ์นี้จะเปิดผ่านแอปไม่ได้อีก การทำเช่นนี้ลบสำเนาบนอุปกรณ์ไม่ได้ และเรียกคืนกุญแจที่อุปกรณ์ถืออยู่แล้วไม่ได้',
    'downloads.devUnconfirmed':
      'ยืนยันการนำอุปกรณ์ออกไม่ได้ รีเฟรชรายการแล้วลองอีกครั้ง คำตอบที่หายไปอาจนำอุปกรณ์ออกไปแล้วก็ได้',
    'downloads.devRemoved':
      'เซิร์ฟเวอร์บันทึกการนำอุปกรณ์ออกแล้ว สำเนาและกุญแจที่อยู่ในอุปกรณ์นั้นไม่ได้ถูกลบจากที่นี่',
    'downloads.devRemovedUnrefreshed': 'เซิร์ฟเวอร์บันทึกการนำออกแล้ว แต่รีเฟรชรายการอุปกรณ์ไม่ได้',
  },
  fil: {
    'downloads.title': 'Sa device na ito',
    'downloads.lede':
      'Mga araling na-save mo para magamit nang offline. Nasa loob ng app na ito ang mga iyon, wala sa file manager ng device mo. Sa ngayon, kailangan ng koneksyon para mabuksan ang pahinang ito at masuri ang access bago ang bawat pag-play; ang mismong recording ay nakatago rito.',
    'downloads.paused':
      'Hindi bukas ngayon ang mga bagong pag-save. Mabubuksan pa rin ang araling na-save na hangga’t may bisa pa ang kurso nito, ang Plus na plano at ang petsa ng naka-save na kopya.',
    'downloads.plusNote':
      'Kailangan ng Plus na plano para makapag-save. Ang naka-save na aralin ay hindi kopyang pag-aari mo: tumatagal ito habang may plano, at pagkatapos ay hihilinging i-refresh.',
    'downloads.back': 'Bumalik sa aking pag-aaral',
    'downloads.storageRefused': 'Ayaw buksan ng browser na ito ang storage ng app.',
    'downloads.looking': 'Tinitingnan kung ano ang nasa device na ito…',
    'downloads.empty':
      'Walang naka-save sa device na ito. Dito lang lumalabas ang araling sine-save mo at wala nang iba: wala ito sa downloads folder ng telepono mo.',
    'downloads.count': 'Mga aralin sa device na ito: {count}',
    'downloads.space': 'Espasyong gamit: {size}',
    'downloads.closePlayer': 'Isara ang player',
    'downloads.badgeLapsed': 'Kailangang i-refresh',
    'downloads.badgeSaved': 'Naka-save sa device na ito',
    'downloads.lapsed':
      'Lumipas na ang naka-save na kopyang ito. Buksan ang aralin habang online para ma-save itong muli.',
    'downloads.daysLeft': 'Mga araw na natitira: {days}',
    'downloads.play': 'I-play',
    'downloads.opening': 'Binubuksan…',
    'downloads.remove': 'Alisin',
    'downloads.removing': 'Inaalis…',
    'downloads.removeLocal': 'Alisin lang ang kopya sa device na ito',
    'downloads.gone': 'Wala na sa device na ito ang araling iyon.',
    'downloads.openFailed': 'Hindi mabuksan ang naka-save na araling iyon.',
    'downloads.needConnection':
      'Kumonekta sa internet para mabuksan ang naka-save na araling ito at masuri ang access.',
    'downloads.notAllowed': 'Hindi na available ang naka-save na araling ito para sa account o planong ito.',
    'downloads.removedCopy': 'Inalis na ang naka-save na kopyang ito at hindi na mabubuksan.',
    'downloads.signIn': 'Mag-sign in para mabuksan ang naka-save na aralin.',
    'downloads.removeUnconfirmed':
      'Hindi nakumpirma sa server ang pag-alis. Kumonekta muli at subukan ulit; narito pa ang kopya sa device na ito.',
    'downloads.removeLocalFailed':
      'Naitala ng server ang pag-alis, pero hindi naalis ng browser na ito ang sarili nitong kopya. Subukan ulit, o alisin lang ang kopya sa device na ito.',
    'downloads.confirmLocal':
      'Alisin lang ang kopya sa device na ito? Mananatili ang tala sa server, at walang puwesto ng device na mababakante.',
    'downloads.localRemoved':
      'Naalis ang kopya sa device na ito. Maaaring nananatili pa ang tala sa server at ang puwesto ng device.',
    'downloads.localFailed': 'Hindi naalis ng browser na ito ang kopya sa device na ito.',
    'downloads.devTitle': 'Mga device na may naka-save na aralin',
    'downloads.devLede':
      'Alisin ang isang device para mabakante ang puwesto nito at matapos ang mga save nito sa server. Hindi mabubura mula rito ang mga kopya o susi na nasa device na iyon na.',
    'downloads.devLoading': 'Nilo-load ang mga device…',
    'downloads.devUnread': 'Hindi na-load ang listahan ng mga device. Huwag ipagpalagay na wala itong laman.',
    'downloads.devRefresh': 'I-refresh',
    'downloads.devNone': 'Walang device sa listahan ngayon.',
    'downloads.devUnnamed': 'Device na walang pangalan',
    'downloads.devSaved': 'Mga naka-save na aralin: {count}',
    'downloads.devSeen': 'Huling nakita: {day}',
    'downloads.devRemove': 'Alisin ang device',
    'downloads.devConfirm':
      'Alisin ang device na ito? Hindi na mabubuksan sa app ang mga naka-save nitong aralin. Hindi nito mabubura ang mga kopya sa device o mababawi ang mga susing hawak na nito.',
    'downloads.devUnconfirmed':
      'Hindi nakumpirma ang pag-alis ng device. I-refresh ang listahan at subukan ulit; maaaring naalis pa rin ito ng sagot na nawala.',
    'downloads.devRemoved':
      'Naitala ng server ang pag-alis ng device. Hindi nabura mula rito ang mga kopya at susi na nasa device na iyon.',
    'downloads.devRemovedUnrefreshed':
      'Naitala ng server ang pag-alis, pero hindi na-refresh ang listahan ng mga device.',
  },
  uz: {
    'downloads.title': 'Shu qurilmada',
    'downloads.lede':
      'Oflayn foydalanish uchun saqlagan darslaringiz. Ular qurilmangizning fayl boshqaruvchisida emas, shu ilova ichida turadi. Hozircha bu sahifani ochish va har bir ijrodan oldin ruxsatni tekshirish uchun ulanish kerak; yozuvning oʻzi shu yerda saqlanadi.',
    'downloads.paused':
      'Yangi saqlash hozir ochiq emas. Avval saqlangan dars uning kursi, Plus tarifi va saqlangan nusxaning sanasi amalda boʻlgan paytgacha ochilaveradi.',
    'downloads.plusNote':
      'Saqlash uchun Plus tarifi kerak. Saqlangan dars sizga tegishli nusxa emas: u tarif amal qilguncha turadi, keyin yangilashni soʻraydi.',
    'downloads.back': 'Oʻqishimga qaytish',
    'downloads.storageRefused': 'Bu brauzer ilova xotirasini ochmadi.',
    'downloads.looking': 'Shu qurilmada nima borligi koʻrilmoqda…',
    'downloads.empty':
      'Bu qurilmada hech narsa saqlanmagan. Saqlagan darsingiz faqat shu yerda koʻrinadi, boshqa joyda emas: u telefoningizning yuklamalar jildida boʻlmaydi.',
    'downloads.count': 'Shu qurilmadagi darslar: {count}',
    'downloads.space': 'Band joy: {size}',
    'downloads.closePlayer': 'Pleyerni yopish',
    'downloads.badgeLapsed': 'Yangilash kerak',
    'downloads.badgeSaved': 'Shu qurilmada saqlangan',
    'downloads.lapsed':
      'Bu saqlangan nusxaning muddati oʻtgan. Qayta saqlash uchun darsni onlayn paytda oching.',
    'downloads.daysLeft': 'Qolgan kunlar: {days}',
    'downloads.play': 'Ijro etish',
    'downloads.opening': 'Ochilmoqda…',
    'downloads.remove': 'Olib tashlash',
    'downloads.removing': 'Olib tashlanmoqda…',
    'downloads.removeLocal': 'Faqat shu qurilmadagi nusxani olib tashlash',
    'downloads.gone': 'U dars endi bu qurilmada yoʻq.',
    'downloads.openFailed': 'U saqlangan darsni ochib boʻlmadi.',
    'downloads.needConnection': 'Bu saqlangan darsni ochish va ruxsatni tekshirish uchun internetga ulaning.',
    'downloads.notAllowed': 'Bu saqlangan dars endi shu hisob yoki tarif uchun mavjud emas.',
    'downloads.removedCopy': 'Bu saqlangan nusxa olib tashlangan va endi ochilmaydi.',
    'downloads.signIn': 'Saqlangan darsni ochish uchun tizimga kiring.',
    'downloads.removeUnconfirmed':
      'Olib tashlashni server bilan tasdiqlab boʻlmadi. Qayta ulanib, yana urinib koʻring; shu qurilmadagi nusxa hali shu yerda.',
    'downloads.removeLocalFailed':
      'Server olib tashlashni qayd etdi, lekin bu brauzer oʻz nusxasini olib tashlay olmadi. Yana urinib koʻring yoki faqat shu qurilmadagi nusxani olib tashlang.',
    'downloads.confirmLocal':
      'Faqat shu qurilmadagi nusxa olib tashlansinmi? Serverdagi yozuv qoladi va hech bir qurilma oʻrni boʻshamaydi.',
    'downloads.localRemoved':
      'Shu qurilmadagi nusxa olib tashlandi. Serverdagi yozuv va qurilma oʻrni qolgan boʻlishi mumkin.',
    'downloads.localFailed': 'Bu brauzer shu qurilmadagi nusxani olib tashlay olmadi.',
    'downloads.devTitle': 'Saqlangan darslari bor qurilmalar',
    'downloads.devLede':
      'Oʻrnini boʻshatish va serverdagi saqlashlarini tugatish uchun qurilmani olib tashlang. Oʻsha qurilmada allaqachon turgan nusxalar yoki kalitlarni bu yerdan oʻchirib boʻlmaydi.',
    'downloads.devLoading': 'Qurilmalar yuklanmoqda…',
    'downloads.devUnread': 'Qurilmalar roʻyxatini yuklab boʻlmadi. Uni boʻsh deb hisoblamang.',
    'downloads.devRefresh': 'Yangilash',
    'downloads.devNone': 'Hozir roʻyxatda qurilma yoʻq.',
    'downloads.devUnnamed': 'Nomsiz qurilma',
    'downloads.devSaved': 'Saqlangan darslar: {count}',
    'downloads.devSeen': 'Oxirgi marta koʻrilgan: {day}',
    'downloads.devRemove': 'Qurilmani olib tashlash',
    'downloads.devConfirm':
      'Bu qurilma olib tashlansinmi? Uning saqlangan darslari ilova orqali ochilmay qoladi. Bu qurilmadagi nusxalarni oʻchira olmaydi va unda bor kalitlarni qaytarib ololmaydi.',
    'downloads.devUnconfirmed':
      'Qurilmaning olib tashlanganini tasdiqlab boʻlmadi. Roʻyxatni yangilab, yana urinib koʻring; yoʻqolgan javob uni baribir olib tashlagan boʻlishi mumkin.',
    'downloads.devRemoved':
      'Server qurilmaning olib tashlanganini qayd etdi. Oʻsha qurilmadagi nusxalar va kalitlar bu yerdan oʻchirilmadi.',
    'downloads.devRemovedUnrefreshed':
      'Server olib tashlashni qayd etdi, lekin qurilmalar roʻyxatini yangilab boʻlmadi.',
  },
  kk: {
    'downloads.title': 'Осы құрылғыда',
    'downloads.lede':
      'Офлайн пайдалану үшін сақтаған сабақтарыңыз. Олар құрылғыңыздың файл басқарушысында емес, осы қолданбаның ішінде тұрады. Әзірге бұл бетті ашу және әр ойнату алдында рұқсатты тексеру үшін байланыс қажет; жазбаның өзі осы жерде сақталған.',
    'downloads.paused':
      'Жаңа сақтау қазір ашық емес. Бұрын сақталған сабақ оның курсы, Plus жоспары және сақталған көшірменің күні жарамды болып тұрғанда ашыла береді.',
    'downloads.plusNote':
      'Сақтау үшін Plus жоспары керек. Сақталған сабақ сізге тиесілі көшірме емес: ол жоспар жүріп тұрғанда сақталады, содан кейін жаңартуды сұрайды.',
    'downloads.back': 'Оқуыма оралу',
    'downloads.storageRefused': 'Бұл браузер қолданбаның жадын ашпады.',
    'downloads.looking': 'Осы құрылғыда не бар екені қаралып жатыр…',
    'downloads.empty':
      'Бұл құрылғыда ештеңе сақталмаған. Сақтаған сабағыңыз тек осы жерде көрінеді, басқа жерде емес: ол телефоныңыздың жүктеулер қалтасында болмайды.',
    'downloads.count': 'Осы құрылғыдағы сабақтар: {count}',
    'downloads.space': 'Пайдаланылған орын: {size}',
    'downloads.closePlayer': 'Ойнатқышты жабу',
    'downloads.badgeLapsed': 'Жаңарту қажет',
    'downloads.badgeSaved': 'Осы құрылғыда сақталған',
    'downloads.lapsed':
      'Бұл сақталған көшірменің мерзімі өтті. Қайта сақтау үшін сабақты желіге қосулы кезде ашыңыз.',
    'downloads.daysLeft': 'Қалған күндер: {days}',
    'downloads.play': 'Ойнату',
    'downloads.opening': 'Ашылып жатыр…',
    'downloads.remove': 'Алып тастау',
    'downloads.removing': 'Алып тасталып жатыр…',
    'downloads.removeLocal': 'Тек осы құрылғыдағы көшірмені алып тастау',
    'downloads.gone': 'Ол сабақ енді бұл құрылғыда жоқ.',
    'downloads.openFailed': 'Ол сақталған сабақты ашу мүмкін болмады.',
    'downloads.needConnection': 'Бұл сақталған сабақты ашу және рұқсатты тексеру үшін интернетке қосылыңыз.',
    'downloads.notAllowed': 'Бұл сақталған сабақ енді осы тіркелгіге немесе жоспарға қолжетімді емес.',
    'downloads.removedCopy': 'Бұл сақталған көшірме алып тасталған, енді ашылмайды.',
    'downloads.signIn': 'Сақталған сабақты ашу үшін кіріңіз.',
    'downloads.removeUnconfirmed':
      'Алып тастауды сервермен растау мүмкін болмады. Қайта қосылып, тағы байқап көріңіз; осы құрылғыдағы көшірме әлі осында.',
    'downloads.removeLocalFailed':
      'Сервер алып тастауды тіркеді, бірақ бұл браузер өз көшірмесін алып тастай алмады. Тағы байқап көріңіз немесе тек осы құрылғыдағы көшірмені алып тастаңыз.',
    'downloads.confirmLocal':
      'Тек осы құрылғыдағы көшірме алып тасталсын ба? Сервердегі жазба қалады, ешбір құрылғы орны босамайды.',
    'downloads.localRemoved':
      'Осы құрылғыдағы көшірме алып тасталды. Сервердегі жазба мен құрылғы орны қалуы мүмкін.',
    'downloads.localFailed': 'Бұл браузер осы құрылғыдағы көшірмені алып тастай алмады.',
    'downloads.devTitle': 'Сақталған сабақтары бар құрылғылар',
    'downloads.devLede':
      'Орнын босату және сервердегі сақтауларын аяқтау үшін құрылғыны алып тастаңыз. Сол құрылғыда бұрыннан тұрған көшірмелерді немесе кілттерді бұл жерден жою мүмкін емес.',
    'downloads.devLoading': 'Құрылғылар жүктеліп жатыр…',
    'downloads.devUnread': 'Құрылғылар тізімін жүктеу мүмкін болмады. Оны бос деп санамаңыз.',
    'downloads.devRefresh': 'Жаңарту',
    'downloads.devNone': 'Қазір тізімде құрылғы жоқ.',
    'downloads.devUnnamed': 'Атауы жоқ құрылғы',
    'downloads.devSaved': 'Сақталған сабақтар: {count}',
    'downloads.devSeen': 'Соңғы рет көрінген: {day}',
    'downloads.devRemove': 'Құрылғыны алып тастау',
    'downloads.devConfirm':
      'Бұл құрылғы алып тасталсын ба? Оның сақталған сабақтары қолданба арқылы ашылмайтын болады. Бұл құрылғыдағы көшірмелерді жоя алмайды және ондағы кілттерді қайтарып ала алмайды.',
    'downloads.devUnconfirmed':
      'Құрылғының алып тасталғанын растау мүмкін болмады. Тізімді жаңартып, тағы байқап көріңіз; жоғалған жауап оны бәрібір алып тастаған болуы мүмкін.',
    'downloads.devRemoved':
      'Сервер құрылғының алып тасталғанын тіркеді. Сол құрылғыдағы көшірмелер мен кілттер бұл жерден жойылмады.',
    'downloads.devRemovedUnrefreshed':
      'Сервер алып тастауды тіркеді, бірақ құрылғылар тізімін жаңарту мүмкін болмады.',
  },
  az: {
    'downloads.title': 'Bu cihazda',
    'downloads.lede':
      'Oflayn istifadə üçün saxladığınız dərslər. Onlar cihazınızın fayl menecerində deyil, bu tətbiqin içində saxlanılır. Hələlik bu səhifəni açmaq və hər oxutmadan əvvəl girişi yoxlamaq üçün bağlantı lazımdır; yazının özü burada saxlanılır.',
    'downloads.paused':
      'Yeni saxlama hazırda açıq deyil. Əvvəl saxlanmış dərs onun kursu, Plus planı və saxlanmış nüsxənin tarixi qüvvədə olduqca açıla bilər.',
    'downloads.plusNote':
      'Saxlamaq üçün Plus planı lazımdır. Saxlanmış dərs sizə məxsus nüsxə deyil: plan davam etdikcə qalır, sonra yenilənməsini istəyir.',
    'downloads.back': 'Təhsilimə qayıt',
    'downloads.storageRefused': 'Bu brauzer tətbiqin yaddaşını açmadı.',
    'downloads.looking': 'Bu cihazda nə olduğuna baxılır…',
    'downloads.empty':
      'Bu cihazda heç nə saxlanmayıb. Saxladığınız dərs yalnız burada görünür, başqa yerdə yox: o, telefonunuzun yükləmələr qovluğunda olmur.',
    'downloads.count': 'Bu cihazdakı dərslər: {count}',
    'downloads.space': 'İstifadə olunan yer: {size}',
    'downloads.closePlayer': 'Pleyeri bağla',
    'downloads.badgeLapsed': 'Yenilənməlidir',
    'downloads.badgeSaved': 'Bu cihazda saxlanıb',
    'downloads.lapsed': 'Bu saxlanmış nüsxənin vaxtı keçib. Yenidən saxlamaq üçün dərsi onlayn olarkən açın.',
    'downloads.daysLeft': 'Qalan günlər: {days}',
    'downloads.play': 'Oxut',
    'downloads.opening': 'Açılır…',
    'downloads.remove': 'Sil',
    'downloads.removing': 'Silinir…',
    'downloads.removeLocal': 'Yalnız bu cihazdakı nüsxəni sil',
    'downloads.gone': 'O dərs artıq bu cihazda deyil.',
    'downloads.openFailed': 'O saxlanmış dərsi açmaq mümkün olmadı.',
    'downloads.needConnection': 'Bu saxlanmış dərsi açmaq və girişi yoxlamaq üçün internetə qoşulun.',
    'downloads.notAllowed': 'Bu saxlanmış dərs artıq bu hesab və ya plan üçün əlçatan deyil.',
    'downloads.removedCopy': 'Bu saxlanmış nüsxə silinib və artıq açıla bilməz.',
    'downloads.signIn': 'Saxlanmış dərsi açmaq üçün daxil olun.',
    'downloads.removeUnconfirmed':
      'Silinməni serverlə təsdiqləmək mümkün olmadı. Yenidən qoşulub bir də cəhd edin; bu cihazdakı nüsxə hələ buradadır.',
    'downloads.removeLocalFailed':
      'Server silinməni qeyd etdi, lakin bu brauzer öz nüsxəsini silə bilmədi. Bir də cəhd edin və ya yalnız bu cihazdakı nüsxəni silin.',
    'downloads.confirmLocal':
      'Yalnız bu cihazdakı nüsxə silinsin? Serverdəki qeyd qalır və heç bir cihaz yeri boşalmır.',
    'downloads.localRemoved': 'Bu cihazdakı nüsxə silindi. Serverdəki qeyd və cihaz yeri qala bilər.',
    'downloads.localFailed': 'Bu brauzer bu cihazdakı nüsxəni silə bilmədi.',
    'downloads.devTitle': 'Saxlanmış dərsləri olan cihazlar',
    'downloads.devLede':
      'Yerini boşaltmaq və serverdəki saxlamalarını bitirmək üçün cihazı silin. Həmin cihazda artıq qalan nüsxələri və ya açarları buradan silmək olmur.',
    'downloads.devLoading': 'Cihazlar yüklənir…',
    'downloads.devUnread': 'Cihazların siyahısını yükləmək mümkün olmadı. Onu boş saymayın.',
    'downloads.devRefresh': 'Yenilə',
    'downloads.devNone': 'Hazırda siyahıda cihaz yoxdur.',
    'downloads.devUnnamed': 'Adsız cihaz',
    'downloads.devSaved': 'Saxlanmış dərslər: {count}',
    'downloads.devSeen': 'Son dəfə görünüb: {day}',
    'downloads.devRemove': 'Cihazı sil',
    'downloads.devConfirm':
      'Bu cihaz silinsin? Onun saxlanmış dərsləri tətbiq vasitəsilə açılmayacaq. Bu, cihazdakı nüsxələri silə bilməz və cihazda artıq olan açarları geri ala bilməz.',
    'downloads.devUnconfirmed':
      'Cihazın silinməsini təsdiqləmək mümkün olmadı. Siyahını yeniləyib bir də cəhd edin; itmiş cavab onu yenə də silmiş ola bilər.',
    'downloads.devRemoved':
      'Server cihazın silinməsini qeyd etdi. Həmin cihazdakı nüsxələr və açarlar buradan silinmədi.',
    'downloads.devRemovedUnrefreshed':
      'Server silinməni qeyd etdi, lakin cihazların siyahısını yeniləmək mümkün olmadı.',
  },
  tg: {
    'downloads.title': 'Дар ин дастгоҳ',
    'downloads.lede':
      'Дарсҳое, ки барои истифодаи офлайн нигоҳ доштаед. Онҳо дар дохили ҳамин барнома нигоҳ дошта мешаванд, на дар мудири файлҳои дастгоҳи шумо. Ҳоло барои кушодани ин саҳифа ва санҷидани дастрасӣ пеш аз ҳар пахш пайвастшавӣ лозим аст; худи сабт дар ҳамин ҷо нигоҳ дошта шудааст.',
    'downloads.paused':
      'Нигоҳдории нав ҳоло кушода нест. Дарси пештар нигоҳдошташуда то он даме кушода мешавад, ки курси он, нақшаи Plus ва санаи нусхаи нигоҳдошташуда эътибор доранд.',
    'downloads.plusNote':
      'Барои нигоҳ доштан нақшаи Plus лозим аст. Дарси нигоҳдошташуда нусхаи моликияти шумо нест: то нақша амал мекунад, мемонад ва баъд навсозӣ мехоҳад.',
    'downloads.back': 'Бозгашт ба омӯзиши ман',
    'downloads.storageRefused': 'Ин браузер анбори барномаро накушод.',
    'downloads.looking': 'Дида мешавад, ки дар ин дастгоҳ чӣ ҳаст…',
    'downloads.empty':
      'Дар ин дастгоҳ чизе нигоҳ дошта нашудааст. Дарсе, ки нигоҳ медоред, танҳо дар ҳамин ҷо пайдо мешавад, на дар ҷои дигар: он дар ҷузвдони боргириҳои телефони шумо нест.',
    'downloads.count': 'Дарсҳо дар ин дастгоҳ: {count}',
    'downloads.space': 'Ҷойи истифодашуда: {size}',
    'downloads.closePlayer': 'Пӯшидани плеер',
    'downloads.badgeLapsed': 'Навсозӣ лозим аст',
    'downloads.badgeSaved': 'Дар ин дастгоҳ нигоҳ дошта шудааст',
    'downloads.lapsed':
      'Мӯҳлати ин нусхаи нигоҳдошташуда гузаштааст. Барои аз нав нигоҳ доштан дарсро ҳангоми онлайн будан кушоед.',
    'downloads.daysLeft': 'Рӯзҳои боқимонда: {days}',
    'downloads.play': 'Пахш',
    'downloads.opening': 'Кушода мешавад…',
    'downloads.remove': 'Бардоштан',
    'downloads.removing': 'Бардошта мешавад…',
    'downloads.removeLocal': 'Танҳо нусхаи ин дастгоҳро бардоштан',
    'downloads.gone': 'Он дарс дигар дар ин дастгоҳ нест.',
    'downloads.openFailed': 'Он дарси нигоҳдошташуда кушода нашуд.',
    'downloads.needConnection':
      'Барои кушодани ин дарси нигоҳдошташуда ва санҷидани дастрасӣ ба интернет пайваст шавед.',
    'downloads.notAllowed': 'Ин дарси нигоҳдошташуда дигар барои ин ҳисоб ё ин нақша дастрас нест.',
    'downloads.removedCopy': 'Ин нусхаи нигоҳдошташуда бардошта шудааст ва дигар кушода намешавад.',
    'downloads.signIn': 'Барои кушодани дарси нигоҳдошташуда ворид шавед.',
    'downloads.removeUnconfirmed':
      'Бардоштанро бо сервер тасдиқ кардан муяссар нашуд. Аз нав пайваст шавед ва боз кӯшиш кунед; нусхаи ин дастгоҳ ҳанӯз ҳамин ҷост.',
    'downloads.removeLocalFailed':
      'Сервер бардоштанро сабт кард, аммо ин браузер нусхаи худро бардошта натавонист. Боз кӯшиш кунед ё танҳо нусхаи ин дастгоҳро бардоред.',
    'downloads.confirmLocal':
      'Танҳо нусхаи ин дастгоҳ бардошта шавад? Сабти сервер мемонад ва ҷойи ягон дастгоҳ холӣ намешавад.',
    'downloads.localRemoved':
      'Нусхаи ин дастгоҳ бардошта шуд. Сабти сервер ва ҷойи дастгоҳ шояд боқӣ монанд.',
    'downloads.localFailed': 'Ин браузер нусхаи ин дастгоҳро бардошта натавонист.',
    'downloads.devTitle': 'Дастгоҳҳое, ки дарсҳои нигоҳдошташуда доранд',
    'downloads.devLede':
      'Дастгоҳеро бардоред, то ҷояш холӣ шавад ва нигоҳдориҳояш дар сервер анҷом ёбанд. Нусхаҳо ё калидҳоеро, ки аллакай дар он дастгоҳ мондаанд, аз ин ҷо нест кардан имкон надорад.',
    'downloads.devLoading': 'Дастгоҳҳо бор мешаванд…',
    'downloads.devUnread': 'Рӯйхати дастгоҳҳо бор нашуд. Онро холӣ напиндоред.',
    'downloads.devRefresh': 'Навсозӣ',
    'downloads.devNone': 'Ҳоло дар рӯйхат дастгоҳе нест.',
    'downloads.devUnnamed': 'Дастгоҳи беном',
    'downloads.devSaved': 'Дарсҳои нигоҳдошташуда: {count}',
    'downloads.devSeen': 'Бори охир дида шуд: {day}',
    'downloads.devRemove': 'Бардоштани дастгоҳ',
    'downloads.devConfirm':
      'Ин дастгоҳ бардошта шавад? Дарсҳои нигоҳдошташудаи он дигар тавассути барнома кушода намешаванд. Ин кор нусхаҳои дар дастгоҳ бударо нест карда наметавонад ва калидҳои дар он бударо бозпас гирифта наметавонад.',
    'downloads.devUnconfirmed':
      'Бардоштани дастгоҳро тасдиқ кардан муяссар нашуд. Рӯйхатро навсозӣ кунед ва боз кӯшиш кунед; шояд ҷавоби гумшуда онро ба ҳар ҳол бардошта бошад.',
    'downloads.devRemoved':
      'Сервер бардоштани дастгоҳро сабт кард. Нусхаҳо ва калидҳои дар он дастгоҳ буда аз ин ҷо нест карда нашуданд.',
    'downloads.devRemovedUnrefreshed': 'Сервер бардоштанро сабт кард, аммо рӯйхати дастгоҳҳо навсозӣ нашуд.',
  },
  ky: {
    'downloads.title': 'Ушул түзмөктө',
    'downloads.lede':
      'Оффлайн колдонуу үчүн сактаган сабактарыңыз. Алар түзмөгүңүздүн файл башкаргычында эмес, ушул колдонмонун ичинде турат. Азырынча бул баракты ачуу жана ар бир ойнотуунун алдында кирүү укугун текшерүү үчүн байланыш керек; жазуунун өзү ушул жерде сакталган.',
    'downloads.paused':
      'Жаңы сактоо азыр ачык эмес. Мурда сакталган сабак анын курсу, Plus планы жана сакталган көчүрмөнүн күнү күчүндө турганда ачыла берет.',
    'downloads.plusNote':
      'Сактоо үчүн Plus планы керек. Сакталган сабак сизге таандык көчүрмө эмес: ал план жүрүп турганда сакталат, анан жаңыртууну суранат.',
    'downloads.back': 'Окуума кайтуу',
    'downloads.storageRefused': 'Бул серепчи колдонмонун сактагычын ачкан жок.',
    'downloads.looking': 'Ушул түзмөктө эмне бар экени каралып жатат…',
    'downloads.empty':
      'Бул түзмөктө эч нерсе сакталган эмес. Сактаган сабагыңыз ушул жерде гана көрүнөт, башка жерде эмес: ал телефонуңуздун жүктөөлөр папкасында болбойт.',
    'downloads.count': 'Ушул түзмөктөгү сабактар: {count}',
    'downloads.space': 'Колдонулган орун: {size}',
    'downloads.closePlayer': 'Ойноткучту жабуу',
    'downloads.badgeLapsed': 'Жаңыртуу керек',
    'downloads.badgeSaved': 'Ушул түзмөктө сакталган',
    'downloads.lapsed':
      'Бул сакталган көчүрмөнүн мөөнөтү өттү. Кайра сактоо үчүн сабакты онлайн кезде ачыңыз.',
    'downloads.daysLeft': 'Калган күндөр: {days}',
    'downloads.play': 'Ойнотуу',
    'downloads.opening': 'Ачылып жатат…',
    'downloads.remove': 'Алып салуу',
    'downloads.removing': 'Алынып жатат…',
    'downloads.removeLocal': 'Ушул түзмөктөгү көчүрмөнү гана алып салуу',
    'downloads.gone': 'Ал сабак эми бул түзмөктө жок.',
    'downloads.openFailed': 'Ал сакталган сабакты ачуу мүмкүн болгон жок.',
    'downloads.needConnection':
      'Бул сакталган сабакты ачуу жана кирүү укугун текшерүү үчүн интернетке туташыңыз.',
    'downloads.notAllowed': 'Бул сакталган сабак эми ушул аккаунтка же планга жеткиликтүү эмес.',
    'downloads.removedCopy': 'Бул сакталган көчүрмө алынып салынган, эми ачылбайт.',
    'downloads.signIn': 'Сакталган сабакты ачуу үчүн кириңиз.',
    'downloads.removeUnconfirmed':
      'Алып салууну сервер менен ырастоо мүмкүн болгон жок. Кайра туташып, дагы аракет кылыңыз; ушул түзмөктөгү көчүрмө дагы эле ушул жерде.',
    'downloads.removeLocalFailed':
      'Сервер алып салууну каттады, бирок бул серепчи өз көчүрмөсүн алып сала алган жок. Дагы аракет кылыңыз же ушул түзмөктөгү көчүрмөнү гана алып салыңыз.',
    'downloads.confirmLocal':
      'Ушул түзмөктөгү көчүрмө гана алынып салынсынбы? Сервердеги жазуу калат, эч бир түзмөктүн орду бошобойт.',
    'downloads.localRemoved':
      'Ушул түзмөктөгү көчүрмө алынып салынды. Сервердеги жазуу менен түзмөктүн орду калышы мүмкүн.',
    'downloads.localFailed': 'Бул серепчи ушул түзмөктөгү көчүрмөнү алып сала алган жок.',
    'downloads.devTitle': 'Сакталган сабактары бар түзмөктөр',
    'downloads.devLede':
      'Ордун бошотуу жана сервердеги сактоолорун бүтүрүү үчүн түзмөктү алып салыңыз. Ал түзмөктө мурунтан турган көчүрмөлөрдү же ачкычтарды бул жерден өчүрүү мүмкүн эмес.',
    'downloads.devLoading': 'Түзмөктөр жүктөлүп жатат…',
    'downloads.devUnread': 'Түзмөктөрдүн тизмесин жүктөө мүмкүн болгон жок. Аны бош деп эсептебеңиз.',
    'downloads.devRefresh': 'Жаңыртуу',
    'downloads.devNone': 'Азыр тизмеде түзмөк жок.',
    'downloads.devUnnamed': 'Аты жок түзмөк',
    'downloads.devSaved': 'Сакталган сабактар: {count}',
    'downloads.devSeen': 'Акыркы жолу көрүнгөн: {day}',
    'downloads.devRemove': 'Түзмөктү алып салуу',
    'downloads.devConfirm':
      'Бул түзмөк алынып салынсынбы? Анын сакталган сабактары колдонмо аркылуу ачылбай калат. Бул түзмөктөгү көчүрмөлөрдү өчүрө албайт жана андагы ачкычтарды кайтарып ала албайт.',
    'downloads.devUnconfirmed':
      'Түзмөктүн алынып салынганын ырастоо мүмкүн болгон жок. Тизмени жаңыртып, дагы аракет кылыңыз; жоголгон жооп аны баары бир алып салган болушу мүмкүн.',
    'downloads.devRemoved':
      'Сервер түзмөктүн алынып салынганын каттады. Ал түзмөктөгү көчүрмөлөр менен ачкычтар бул жерден өчүрүлгөн жок.',
    'downloads.devRemovedUnrefreshed':
      'Сервер алып салууну каттады, бирок түзмөктөрдүн тизмесин жаңыртуу мүмкүн болгон жок.',
  },
  tk: {
    'downloads.title': 'Şu enjamda',
    'downloads.lede':
      'Oflaýn ulanmak üçin saklan sapaklaryňyz. Olar enjamyňyzyň faýl dolandyryjysynda däl-de, şu programmanyň içinde saklanýar. Häzirlikçe bu sahypany açmak we her gezek oýnatmazdan öň rugsady barlamak üçin baglanyşyk gerek; ýazgynyň özi şu ýerde saklanýar.',
    'downloads.paused':
      'Täze saklamak häzir açyk däl. Öň saklanan sapak onuň kursy, Plus meýilnamasy we saklanan nusganyň senesi güýjünde durýança açylyp bilner.',
    'downloads.plusNote':
      'Saklamak üçin Plus meýilnamasy gerek. Saklanan sapak size degişli nusga däl: ol meýilnama dowam edýänçä durýar, soňra täzelemegi soraýar.',
    'downloads.back': 'Okuwyma dolanmak',
    'downloads.storageRefused': 'Bu brauzer programmanyň ammaryny açmady.',
    'downloads.looking': 'Şu enjamda näme bardygyna seredilýär…',
    'downloads.empty':
      'Bu enjamda hiç zat saklanmandyr. Saklan sapagyňyz diňe şu ýerde görünýär, başga ýerde däl: ol telefonyňyzyň ýüklemeler bukjasynda bolmaýar.',
    'downloads.count': 'Şu enjamdaky sapaklar: {count}',
    'downloads.space': 'Ulanylan ýer: {size}',
    'downloads.closePlayer': 'Pleýeri ýapmak',
    'downloads.badgeLapsed': 'Täzelemek gerek',
    'downloads.badgeSaved': 'Şu enjamda saklanan',
    'downloads.lapsed':
      'Bu saklanan nusganyň möhleti geçdi. Täzeden saklamak üçin sapagy onlaýn wagtyňyz açyň.',
    'downloads.daysLeft': 'Galan günler: {days}',
    'downloads.play': 'Oýnatmak',
    'downloads.opening': 'Açylýar…',
    'downloads.remove': 'Aýyrmak',
    'downloads.removing': 'Aýrylýar…',
    'downloads.removeLocal': 'Diňe şu enjamdaky nusgany aýyrmak',
    'downloads.gone': 'Ol sapak indi bu enjamda ýok.',
    'downloads.openFailed': 'Ol saklanan sapagy açyp bolmady.',
    'downloads.needConnection': 'Bu saklanan sapagy açmak we rugsady barlamak üçin internete birigiň.',
    'downloads.notAllowed': 'Bu saklanan sapak indi şu hasap ýa-da meýilnama üçin elýeterli däl.',
    'downloads.removedCopy': 'Bu saklanan nusga aýryldy we indi açylmaýar.',
    'downloads.signIn': 'Saklanan sapagy açmak üçin giriň.',
    'downloads.removeUnconfirmed':
      'Aýyrmagy serwer bilen tassyklap bolmady. Täzeden birigip, ýene synanyşyň; şu enjamdaky nusga entek şu ýerde.',
    'downloads.removeLocalFailed':
      'Serwer aýyrmagy belledi, ýöne bu brauzer öz nusgasyny aýryp bilmedi. Ýene synanyşyň ýa-da diňe şu enjamdaky nusgany aýryň.',
    'downloads.confirmLocal':
      'Diňe şu enjamdaky nusga aýrylsynmy? Serwerdäki ýazgy galýar we hiç bir enjamyň orny boşamaýar.',
    'downloads.localRemoved':
      'Şu enjamdaky nusga aýryldy. Serwerdäki ýazgy we enjamyň orny galan bolmagy mümkin.',
    'downloads.localFailed': 'Bu brauzer şu enjamdaky nusgany aýryp bilmedi.',
    'downloads.devTitle': 'Saklanan sapaklary bar enjamlar',
    'downloads.devLede':
      'Ornuny boşatmak we serwerdäki saklamalaryny gutarmak üçin enjamy aýryň. Şol enjamda eýýäm duran nusgalary ýa-da açarlary bu ýerden pozup bolmaýar.',
    'downloads.devLoading': 'Enjamlar ýüklenýär…',
    'downloads.devUnread': 'Enjamlaryň sanawyny ýükläp bolmady. Ony boş diýip hasaplamaň.',
    'downloads.devRefresh': 'Täzelemek',
    'downloads.devNone': 'Häzir sanawda enjam ýok.',
    'downloads.devUnnamed': 'Atsyz enjam',
    'downloads.devSaved': 'Saklanan sapaklar: {count}',
    'downloads.devSeen': 'Soňky gezek görlen: {day}',
    'downloads.devRemove': 'Enjamy aýyrmak',
    'downloads.devConfirm':
      'Bu enjam aýrylsynmy? Onuň saklanan sapaklary programma arkaly açylmaz. Bu enjamdaky nusgalary pozup bilmeýär we ondaky açarlary yzyna alyp bilmeýär.',
    'downloads.devUnconfirmed':
      'Enjamyň aýrylandygyny tassyklap bolmady. Sanawy täzeläp, ýene synanyşyň; ýiten jogap ony barybir aýran bolmagy mümkin.',
    'downloads.devRemoved':
      'Serwer enjamyň aýrylandygyny belledi. Şol enjamdaky nusgalar we açarlar bu ýerden pozulmady.',
    'downloads.devRemovedUnrefreshed': 'Serwer aýyrmagy belledi, ýöne enjamlaryň sanawyny täzeläp bolmady.',
  },
  ta: {
    'downloads.title': 'இந்தச் சாதனத்தில்',
    'downloads.lede':
      'இணையம் இல்லாமல் பயன்படுத்த நீங்கள் சேமித்த பாடங்கள். அவை உங்கள் சாதனத்தின் கோப்பு மேலாளரில் அல்ல, இந்தச் செயலிக்குள்ளேயே வைக்கப்படுகின்றன. இப்போதைக்கு இந்தப் பக்கத்தைத் திறக்கவும் ஒவ்வொரு முறை இயக்குவதற்கு முன் அணுகலைச் சரிபார்க்கவும் இணைப்பு தேவை; பதிவு இங்கேயே சேமிக்கப்பட்டுள்ளது.',
    'downloads.paused':
      'புதிதாகச் சேமிப்பது இப்போது திறக்கப்படவில்லை. முன்பே சேமித்த பாடத்தை, அதன் பாடநெறி, Plus திட்டம், சேமித்த நகலின் தேதி ஆகியவை செல்லுபடியாக இருக்கும் வரை திறக்கலாம்.',
    'downloads.plusNote':
      'சேமிக்க Plus திட்டம் தேவை. சேமித்த பாடம் உங்களுக்குச் சொந்தமான நகல் அல்ல: திட்டம் இருக்கும் வரை அது இருக்கும், பிறகு புதுப்பிக்கக் கேட்கும்.',
    'downloads.back': 'என் கற்றலுக்குத் திரும்பு',
    'downloads.storageRefused': 'இந்த உலாவி செயலியின் சேமிப்பகத்தைத் திறக்கவில்லை.',
    'downloads.looking': 'இந்தச் சாதனத்தில் என்ன இருக்கிறது என்று பார்க்கப்படுகிறது…',
    'downloads.empty':
      'இந்தச் சாதனத்தில் எதுவும் சேமிக்கப்படவில்லை. நீங்கள் சேமிக்கும் பாடம் இங்கே மட்டுமே தோன்றும், வேறெங்கும் இல்லை: அது உங்கள் தொலைபேசியின் பதிவிறக்கக் கோப்புறையில் இருக்காது.',
    'downloads.count': 'இந்தச் சாதனத்திலுள்ள பாடங்கள்: {count}',
    'downloads.space': 'பயன்படுத்திய இடம்: {size}',
    'downloads.closePlayer': 'இயக்கியை மூடு',
    'downloads.badgeLapsed': 'புதுப்பிக்க வேண்டும்',
    'downloads.badgeSaved': 'இந்தச் சாதனத்தில் சேமிக்கப்பட்டது',
    'downloads.lapsed':
      'இந்தச் சேமித்த நகலின் காலம் முடிந்துவிட்டது. மீண்டும் சேமிக்க, இணையத்தில் இருக்கும்போது பாடத்தைத் திறக்கவும்.',
    'downloads.daysLeft': 'மீதமுள்ள நாட்கள்: {days}',
    'downloads.play': 'இயக்கு',
    'downloads.opening': 'திறக்கிறது…',
    'downloads.remove': 'அகற்று',
    'downloads.removing': 'அகற்றப்படுகிறது…',
    'downloads.removeLocal': 'இந்தச் சாதனத்திலுள்ள நகலை மட்டும் அகற்று',
    'downloads.gone': 'அந்தப் பாடம் இனி இந்தச் சாதனத்தில் இல்லை.',
    'downloads.openFailed': 'அந்தச் சேமித்த பாடத்தைத் திறக்க முடியவில்லை.',
    'downloads.needConnection':
      'இந்தச் சேமித்த பாடத்தைத் திறக்கவும் அணுகலைச் சரிபார்க்கவும் இணையத்துடன் இணையுங்கள்.',
    'downloads.notAllowed': 'இந்தச் சேமித்த பாடம் இனி இந்தக் கணக்குக்கோ திட்டத்துக்கோ கிடைக்காது.',
    'downloads.removedCopy': 'இந்தச் சேமித்த நகல் அகற்றப்பட்டது, இனி திறக்க முடியாது.',
    'downloads.signIn': 'சேமித்த பாடத்தைத் திறக்க உள்நுழையுங்கள்.',
    'downloads.removeUnconfirmed':
      'அகற்றியதைச் சேவையகத்துடன் உறுதிப்படுத்த முடியவில்லை. மீண்டும் இணைந்து மறுபடி முயலுங்கள்; இந்தச் சாதனத்திலுள்ள நகல் இன்னும் இங்கே உள்ளது.',
    'downloads.removeLocalFailed':
      'சேவையகம் அகற்றியதைப் பதிவு செய்தது, ஆனால் இந்த உலாவியால் தன் நகலை அகற்ற முடியவில்லை. மறுபடி முயலுங்கள், அல்லது இந்தச் சாதனத்திலுள்ள நகலை மட்டும் அகற்றுங்கள்.',
    'downloads.confirmLocal':
      'இந்தச் சாதனத்திலுள்ள நகலை மட்டும் அகற்றவா? சேவையகத்தின் பதிவு அப்படியே இருக்கும், எந்தச் சாதன இடமும் காலியாகாது.',
    'downloads.localRemoved':
      'இந்தச் சாதனத்திலுள்ள நகல் அகற்றப்பட்டது. சேவையகத்தின் பதிவும் சாதன இடமும் இன்னும் இருக்கலாம்.',
    'downloads.localFailed': 'இந்த உலாவியால் இந்தச் சாதனத்திலுள்ள நகலை அகற்ற முடியவில்லை.',
    'downloads.devTitle': 'சேமித்த பாடங்களை வைத்திருக்கும் சாதனங்கள்',
    'downloads.devLede':
      'ஒரு சாதனத்தின் இடத்தைக் காலியாக்கவும் சேவையகத்தில் அதன் சேமிப்புகளை முடிக்கவும் அதை அகற்றுங்கள். அந்தச் சாதனத்தில் ஏற்கெனவே உள்ள நகல்களையோ திறவுகோல்களையோ இங்கிருந்து அழிக்க முடியாது.',
    'downloads.devLoading': 'சாதனங்கள் ஏற்றப்படுகின்றன…',
    'downloads.devUnread': 'சாதனங்களின் பட்டியலை ஏற்ற முடியவில்லை. அது காலியாக இருப்பதாகக் கருத வேண்டாம்.',
    'downloads.devRefresh': 'புதுப்பி',
    'downloads.devNone': 'இப்போது பட்டியலில் சாதனம் எதுவும் இல்லை.',
    'downloads.devUnnamed': 'பெயரில்லாத சாதனம்',
    'downloads.devSaved': 'சேமித்த பாடங்கள்: {count}',
    'downloads.devSeen': 'கடைசியாகக் காணப்பட்டது: {day}',
    'downloads.devRemove': 'சாதனத்தை அகற்று',
    'downloads.devConfirm':
      'இந்தச் சாதனத்தை அகற்றவா? அதில் சேமித்த பாடங்கள் செயலி வழியாக இனி திறக்காது. இது சாதனத்திலுள்ள நகல்களை அழிக்காது, அது ஏற்கெனவே வைத்திருக்கும் திறவுகோல்களைத் திரும்பப் பெறவும் முடியாது.',
    'downloads.devUnconfirmed':
      'சாதனம் அகற்றப்பட்டதை உறுதிப்படுத்த முடியவில்லை. பட்டியலைப் புதுப்பித்து மறுபடி முயலுங்கள்; தொலைந்த பதில் அதை அகற்றியிருக்கவும் கூடும்.',
    'downloads.devRemoved':
      'சேவையகம் சாதனம் அகற்றப்பட்டதைப் பதிவு செய்தது. அந்தச் சாதனத்திலுள்ள நகல்களும் திறவுகோல்களும் இங்கிருந்து அழிக்கப்படவில்லை.',
    'downloads.devRemovedUnrefreshed':
      'சேவையகம் அகற்றியதைப் பதிவு செய்தது, ஆனால் சாதனங்களின் பட்டியலைப் புதுப்பிக்க முடியவில்லை.',
  },
  ne: {
    'downloads.title': 'यो यन्त्रमा',
    'downloads.lede':
      'अफलाइन प्रयोग गर्न तपाईंले सुरक्षित गरेका पाठहरू। ती तपाईंको यन्त्रको फाइल म्यानेजरमा होइन, यही एपभित्र राखिन्छन्। अहिलेका लागि यो पृष्ठ खोल्न र हरेक पटक बजाउनुअघि पहुँच जाँच्न जडान चाहिन्छ; रेकर्डिङ आफैँ भने यहीँ राखिएको छ।',
    'downloads.paused':
      'नयाँ पाठ सुरक्षित गर्ने काम अहिले खुला छैन। पहिले नै सुरक्षित गरिएको पाठ त्यसको कोर्स, Plus योजना र सुरक्षित प्रतिको मिति मान्य रहुन्जेल खोल्न सकिन्छ।',
    'downloads.plusNote':
      'सुरक्षित गर्न Plus योजना चाहिन्छ। सुरक्षित गरिएको पाठ तपाईंको आफ्नै प्रति होइन: योजना रहुन्जेल रहन्छ, त्यसपछि ताजा गर्न भन्छ।',
    'downloads.back': 'मेरो सिकाइमा फर्कनुहोस्',
    'downloads.storageRefused': 'यो ब्राउजरले एपको भण्डारण खोलेन।',
    'downloads.looking': 'यो यन्त्रमा के छ भनेर हेरिँदै छ…',
    'downloads.empty':
      'यो यन्त्रमा केही सुरक्षित गरिएको छैन। तपाईंले सुरक्षित गरेको पाठ यहीँ मात्र देखिन्छ, अन्त कतै होइन: त्यो तपाईंको फोनको डाउनलोड फोल्डरमा हुँदैन।',
    'downloads.count': 'यो यन्त्रमा भएका पाठ: {count}',
    'downloads.space': 'प्रयोग भएको ठाउँ: {size}',
    'downloads.closePlayer': 'प्लेयर बन्द गर्नुहोस्',
    'downloads.badgeLapsed': 'ताजा गर्नुपर्छ',
    'downloads.badgeSaved': 'यो यन्त्रमा सुरक्षित',
    'downloads.lapsed': 'यो सुरक्षित प्रतिको म्याद सकिएको छ। फेरि सुरक्षित गर्न अनलाइन हुँदा पाठ खोल्नुहोस्।',
    'downloads.daysLeft': 'बाँकी दिन: {days}',
    'downloads.play': 'बजाउनुहोस्',
    'downloads.opening': 'खुल्दै छ…',
    'downloads.remove': 'हटाउनुहोस्',
    'downloads.removing': 'हटाइँदै छ…',
    'downloads.removeLocal': 'यो यन्त्रको प्रति मात्र हटाउनुहोस्',
    'downloads.gone': 'त्यो पाठ अब यो यन्त्रमा छैन।',
    'downloads.openFailed': 'त्यो सुरक्षित पाठ खोल्न सकिएन।',
    'downloads.needConnection': 'यो सुरक्षित पाठ खोल्न र पहुँच जाँच्न इन्टरनेटमा जोडिनुहोस्।',
    'downloads.notAllowed': 'यो सुरक्षित पाठ अब यो खाता वा योजनाका लागि उपलब्ध छैन।',
    'downloads.removedCopy': 'यो सुरक्षित प्रति हटाइएको छ र अब खोल्न सकिँदैन।',
    'downloads.signIn': 'सुरक्षित पाठ खोल्न साइन इन गर्नुहोस्।',
    'downloads.removeUnconfirmed':
      'हटाइएको कुरा सर्भरसँग पुष्टि गर्न सकिएन। फेरि जोडिएर पुनः प्रयास गर्नुहोस्; यो यन्त्रको प्रति अझै यहीँ छ।',
    'downloads.removeLocalFailed':
      'सर्भरले हटाइएको कुरा टिप्यो, तर यो ब्राउजरले आफ्नो प्रति हटाउन सकेन। पुनः प्रयास गर्नुहोस्, वा यो यन्त्रको प्रति मात्र हटाउनुहोस्।',
    'downloads.confirmLocal':
      'यो यन्त्रको प्रति मात्र हटाउने हो? सर्भरको अभिलेख रहन्छ, र कुनै यन्त्रको ठाउँ खाली हुँदैन।',
    'downloads.localRemoved': 'यो यन्त्रको प्रति हटाइयो। सर्भरको अभिलेख र यन्त्रको ठाउँ बाँकी रहन सक्छ।',
    'downloads.localFailed': 'यो ब्राउजरले यो यन्त्रको प्रति हटाउन सकेन।',
    'downloads.devTitle': 'सुरक्षित पाठ भएका यन्त्रहरू',
    'downloads.devLede':
      'कुनै यन्त्रको ठाउँ खाली गर्न र सर्भरमा त्यसका सुरक्षित पाठ अन्त्य गर्न त्यसलाई हटाउनुहोस्। त्यो यन्त्रमा पहिले नै रहेका प्रति वा साँचाहरू यहाँबाट मेट्न सकिँदैन।',
    'downloads.devLoading': 'यन्त्रहरू लोड हुँदै छन्…',
    'downloads.devUnread': 'यन्त्रहरूको सूची लोड गर्न सकिएन। यसलाई खाली नठान्नुहोस्।',
    'downloads.devRefresh': 'ताजा गर्नुहोस्',
    'downloads.devNone': 'अहिले सूचीमा कुनै यन्त्र छैन।',
    'downloads.devUnnamed': 'नाम नभएको यन्त्र',
    'downloads.devSaved': 'सुरक्षित पाठ: {count}',
    'downloads.devSeen': 'अन्तिम पटक देखिएको: {day}',
    'downloads.devRemove': 'यन्त्र हटाउनुहोस्',
    'downloads.devConfirm':
      'यो यन्त्र हटाउने हो? यसका सुरक्षित पाठहरू एपबाट खुल्न छाड्नेछन्। यसले यन्त्रमा भएका प्रति मेट्न सक्दैन र त्यससँग भइसकेका साँचाहरू फिर्ता लिन सक्दैन।',
    'downloads.devUnconfirmed':
      'यन्त्र हटाइएको पुष्टि गर्न सकिएन। सूची ताजा गरेर पुनः प्रयास गर्नुहोस्; हराएको जवाफले त्यसलाई हटाइसकेको पनि हुन सक्छ।',
    'downloads.devRemoved':
      'सर्भरले यन्त्र हटाइएको कुरा टिप्यो। त्यो यन्त्रमा रहेका प्रति र साँचाहरू यहाँबाट मेटिएनन्।',
    'downloads.devRemovedUnrefreshed': 'सर्भरले हटाइएको कुरा टिप्यो, तर यन्त्रहरूको सूची ताजा गर्न सकिएन।',
  },
};
