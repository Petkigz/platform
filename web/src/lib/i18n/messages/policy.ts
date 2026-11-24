import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The policy register a visitor reads (`app/policies/page.tsx`), one
 * document's page (`app/policies/[slug]/page.tsx`) and the button that
 * records an agreement.
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts`, `reading.ts`, `restore.ts`, `phone.ts`, `merge.ts`,
 * `share.ts`, `refer.ts`, `sponsor.ts`, `orders.ts`, `billing.ts`,
 * `receipt.ts`, `notify.ts`, `plans.ts` and `subs.ts`: written for the
 * twenty-seven languages with nothing held in `held.ts`, and for no other.
 * See `UNWRITTEN_WHILE_HELD`.
 *
 * **These are the words round a document, never the document.** A policy's
 * title, summary, change note and text are typed by the owner in English and
 * are shown as written, marked as English (`asWritten` says so). A translated
 * term nobody approved would be a term nobody agreed to.
 *
 * **Nothing here says a document binds anybody.** `notYet`, `noneBody` and
 * `draftBody` say what the database does: a document with no approved
 * version is not in force and its draft is not shown.
 *
 * **Two sentences are about a version that moved.** `whyChanged` is said
 * when the live version is no longer the one the page showed and nothing was
 * recorded; `agreedNewer` when it moved between that check and the write, so
 * the agreement was recorded for a version the reader had not been shown.
 *
 * The page's heading is `footer.terms`, the words of the link that leads to
 * it; `missing.help`, `missing.home` and `export.inAccount` name its links.
 */
export const POLICY: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'policy.lede':
      'ما توافق عليه حين تتعلّم أو تعلّم هنا، وما يُفعل ببياناتك، وما يحدث إذا وقع خطأ.',
    'policy.kept':
      'كل إصدار من كل وثيقة محفوظ. التغيير إصدار جديد يسري من تاريخ محدّد، وليس تعديلًا على إصدار قديم، وإذا احتاج إلى موافقتك طُلبت منك من جديد.',
    'policy.unread':
      'تعذّرت قراءة السياسات الآن. هذا لا يعني أنه لا توجد سياسات. حاول مرة أخرى بعد قليل.',
    'policy.none': 'لم تُكتب أي سياسة بعد.',
    'policy.noneLead': 'لا شيء من هذه الوثائق سارٍ بعد.',
    'policy.noneBody':
      'لا تُنشر الوثيقة إلا بعد أن يجيب مالك المنصة عن الأسئلة التي لا يجيب عنها غيره فيها، مثل القانون الذي ينطبق ومن المسؤول عن بياناتك. وإلى ذلك الحين لا تكون سارية، ولا تُعرض مسودتها.',
    'policy.inForceCount': 'الوثائق السارية: {count}',
    'policy.othersDraft': 'الوثائق الأخرى مكتوبة ولم تُعتمد بعد.',
    'policy.forEveryone': 'للجميع',
    'policy.forChild': 'للأطفال وأولياء أمورهم',
    'policy.forTeacher': 'للمعلّمين',
    'policy.forInstitution': 'للمؤسسات',
    'policy.notYet': 'غير سارية بعد',
    'policy.versionNo': 'الإصدار: {number}',
    'policy.inForceFrom': 'سارية من: {date}',
    'policy.mustAgree': 'ستُطلب منك الموافقة عليها، ويُحفظ وقت موافقتك.',
    'policy.noSign': 'هي للقراءة. لا شيء فيها يحتاج إلى موافقة.',
    'policy.concern':
      'القلق من تصرّف شخص ما، أو على سلامة طفل، ليس سؤالًا عن سياسة. إنه يُرفع إلى إنسان.',
    'policy.draftBody':
      'هذه الوثيقة مكتوبة، لكن لم يُعتمد أي إصدار منها، فلا شيء هنا للقراءة أو للموافقة. المسودة لا تُعرض لأنها قد تتغيّر. لا شيء هنا يطلب موافقتك إلى أن يُعتمد إصدار.',
    'policy.changed': 'ما تغيّر في هذا الإصدار: {note}',
    'policy.asWritten': 'الوثيقة معروضة باللغة التي كُتبت بها.',
    'policy.agreeTitle': 'موافقتك',
    'policy.agreeSignIn':
      'هذه الوثيقة تطلب موافقتك، ويُحفظ وقت موافقتك مع حسابك. سجّل الدخول أولًا.',
    'policy.agreeSignInDo': 'سجّل الدخول للموافقة',
    'policy.agreeNote':
      'الموافقة تسجّل أنك قرأت هذا الإصدار وقبلته. يُحفظ الإصدار والوقت مع حسابك.',
    'policy.agreeDo': 'أوافق على هذا الإصدار',
    'policy.agreed': 'وافقت على هذا الإصدار في: {date}',
    'policy.agreedWhere': 'ما وافقت عليه مدرج في صفحة حسابك.',
    'policy.agreedNewer':
      'نُشر إصدار أحدث أثناء فتح هذه الصفحة، وسُجّلت موافقتك عليه هو. هذه الصفحة تعرضه الآن. اقرأه.',
    'policy.waitingCount': 'وثائق تنتظر موافقتك: {count}',
    'policy.whyChanged':
      'تغيّرت هذه الوثيقة بعد فتح هذه الصفحة، فلم يُسجّل شيء. اقرأها من جديد قبل أن توافق.',
    'policy.agreeFailed': 'تعذّر تسجيل موافقتك. لم يتغيّر شيء.',
    'policy.agreeUnsure': 'لم نتمكّن من التأكّد من تسجيل موافقتك. افتح هذه الصفحة من جديد لترى.',
    'policy.noticeChanged': 'وثائق تغيّرت بعد موافقتك عليها: {count}',
    'policy.noticeOpen': 'اقرأ ما تغيّر',
    'policy.noticeDismiss': 'أخفِ هذا التنبيه',
  },
  ur: {
    'policy.lede':
      'یہاں سیکھتے یا پڑھاتے وقت آپ کس چیز سے اتفاق کرتے ہیں، آپ کے ڈیٹا کے ساتھ کیا کیا جاتا ہے، اور کچھ غلط ہو جائے تو کیا ہوتا ہے۔',
    'policy.kept':
      'ہر دستاویز کا ہر نسخہ محفوظ رکھا جاتا ہے۔ تبدیلی ایک نیا نسخہ ہوتی ہے جو ایک تاریخ سے نافذ ہوتا ہے، پرانے نسخے میں ترمیم نہیں، اور جہاں آپ کی رضامندی درکار ہو وہاں آپ سے دوبارہ پوچھا جاتا ہے۔',
    'policy.unread':
      'پالیسیاں ابھی پڑھی نہیں جا سکیں۔ اس کا یہ مطلب نہیں کہ کوئی پالیسی نہیں ہے۔ تھوڑی دیر میں دوبارہ کوشش کریں۔',
    'policy.none': 'ابھی تک کوئی پالیسی نہیں لکھی گئی۔',
    'policy.noneLead': 'ان میں سے کوئی بھی ابھی نافذ نہیں ہے۔',
    'policy.noneBody':
      'کوئی دستاویز تبھی شائع ہوتی ہے جب پلیٹ فارم کا مالک اس میں موجود ان سوالوں کے جواب دے دے جن کا جواب صرف وہی دے سکتا ہے، جیسے کون سا قانون لاگو ہوتا ہے اور آپ کے ڈیٹا کا ذمہ دار کون ہے۔ تب تک وہ نافذ نہیں ہوتی، اور مسودہ نہیں دکھایا جاتا۔',
    'policy.inForceCount': 'نافذ دستاویزات: {count}',
    'policy.othersDraft': 'باقی لکھی جا چکی ہیں اور ابھی منظور نہیں ہوئیں۔',
    'policy.forEveryone': 'سب کے لیے',
    'policy.forChild': 'بچوں اور ان کے سرپرستوں کے لیے',
    'policy.forTeacher': 'اساتذہ کے لیے',
    'policy.forInstitution': 'اداروں کے لیے',
    'policy.notYet': 'ابھی نافذ نہیں',
    'policy.versionNo': 'نسخہ: {number}',
    'policy.inForceFrom': 'اس تاریخ سے نافذ: {date}',
    'policy.mustAgree':
      'آپ سے اس سے اتفاق کرنے کو کہا جائے گا، اور اتفاق کا وقت محفوظ رکھا جاتا ہے۔',
    'policy.noSign': 'یہ پڑھنے کے لیے ہے۔ اس میں اتفاق کرنے کو کچھ نہیں۔',
    'policy.concern':
      'کسی کے رویے یا کسی بچے کی حفاظت کے بارے میں تشویش پالیسی کا سوال نہیں ہے۔ وہ ایک انسان تک جاتی ہے۔',
    'policy.draftBody':
      'یہ دستاویز لکھی جا چکی ہے، لیکن اس کا کوئی نسخہ منظور نہیں ہوا، اس لیے یہاں پڑھنے یا اتفاق کرنے کو کچھ نہیں۔ مسودہ نہیں دکھایا جاتا کیونکہ وہ ابھی بدل سکتا ہے۔ جب تک کوئی نسخہ منظور نہ ہو، یہاں کچھ بھی آپ کی رضامندی نہیں مانگتا۔',
    'policy.changed': 'اس نسخے میں کیا بدلا: {note}',
    'policy.asWritten': 'دستاویز اسی زبان میں دکھائی گئی ہے جس میں لکھی گئی تھی۔',
    'policy.agreeTitle': 'آپ کی رضامندی',
    'policy.agreeSignIn':
      'یہ دستاویز آپ کی رضامندی مانگتی ہے، اور رضامندی کا وقت آپ کے اکاؤنٹ کے ساتھ محفوظ رکھا جاتا ہے۔ پہلے سائن اِن کریں۔',
    'policy.agreeSignInDo': 'اتفاق کرنے کے لیے سائن اِن کریں',
    'policy.agreeNote':
      'اتفاق کرنے سے یہ درج ہوتا ہے کہ آپ نے یہ نسخہ پڑھ لیا ہے اور اسے قبول کرتے ہیں۔ نسخہ اور وقت آپ کے اکاؤنٹ کے ساتھ محفوظ رکھے جاتے ہیں۔',
    'policy.agreeDo': 'اس نسخے سے اتفاق کریں',
    'policy.agreed': 'آپ نے اس نسخے سے اس وقت اتفاق کیا: {date}',
    'policy.agreedWhere': 'جن چیزوں سے آپ نے اتفاق کیا ہے وہ آپ کے اکاؤنٹ کے صفحے پر درج ہیں۔',
    'policy.agreedNewer':
      'اس صفحے کے کھلے ہونے کے دوران ایک نیا نسخہ شائع ہوا، اور آپ کی رضامندی اسی نئے نسخے کے لیے درج ہوئی۔ یہ صفحہ اب وہی دکھا رہا ہے۔ اسے پڑھ لیں۔',
    'policy.waitingCount': 'آپ کی رضامندی کی منتظر دستاویزات: {count}',
    'policy.whyChanged':
      'یہ دستاویز اس صفحے کے کھلنے کے بعد بدل گئی، اس لیے کچھ درج نہیں ہوا۔ اتفاق کرنے سے پہلے اسے دوبارہ پڑھیں۔',
    'policy.agreeFailed': 'آپ کی رضامندی درج نہیں ہو سکی۔ کچھ نہیں بدلا۔',
    'policy.agreeUnsure':
      'ہم تصدیق نہیں کر سکے کہ آپ کی رضامندی درج ہوئی۔ دیکھنے کے لیے یہ صفحہ دوبارہ کھولیں۔',
    'policy.noticeChanged': 'آپ کے اتفاق کے بعد بدلنے والی دستاویزات: {count}',
    'policy.noticeOpen': 'پڑھیں کہ کیا بدلا',
    'policy.noticeDismiss': 'یہ اطلاع چھپائیں',
  },
  fa: {
    'policy.lede':
      'آنچه هنگام یادگیری یا تدریس در اینجا با آن موافقت می‌کنید، آنچه با داده‌های شما انجام می‌شود، و آنچه در صورت بروز مشکل رخ می‌دهد.',
    'policy.kept':
      'هر نسخه از هر سند نگه داشته می‌شود. تغییر یک نسخهٔ تازه است که از تاریخی معیّن اجرا می‌شود، نه ویرایش نسخهٔ قدیمی، و هر جا به موافقت شما نیاز باشد دوباره از شما پرسیده می‌شود.',
    'policy.unread':
      'خواندن سیاست‌ها اکنون ممکن نشد. این به آن معنا نیست که سیاستی وجود ندارد. کمی بعد دوباره تلاش کنید.',
    'policy.none': 'هنوز هیچ سیاستی نوشته نشده است.',
    'policy.noneLead': 'هیچ‌یک از این‌ها هنوز لازم‌الاجرا نیست.',
    'policy.noneBody':
      'یک سند تنها زمانی منتشر می‌شود که مالک سکو به پرسش‌هایی در آن که فقط خودش می‌تواند پاسخ دهد پاسخ داده باشد، مانند اینکه کدام قانون حاکم است و چه کسی مسئول داده‌های شماست. تا آن زمان لازم‌الاجرا نیست و پیش‌نویس آن نشان داده نمی‌شود.',
    'policy.inForceCount': 'سندهای لازم‌الاجرا: {count}',
    'policy.othersDraft': 'بقیه نوشته شده‌اند و هنوز تأیید نشده‌اند.',
    'policy.forEveryone': 'برای همه',
    'policy.forChild': 'برای کودکان و سرپرستانشان',
    'policy.forTeacher': 'برای معلمان',
    'policy.forInstitution': 'برای مؤسسه‌ها',
    'policy.notYet': 'هنوز لازم‌الاجرا نیست',
    'policy.versionNo': 'نسخه: {number}',
    'policy.inForceFrom': 'لازم‌الاجرا از: {date}',
    'policy.mustAgree':
      'از شما خواسته می‌شود با آن موافقت کنید، و زمان موافقت شما نگه داشته می‌شود.',
    'policy.noSign': 'برای خواندن است. چیزی برای موافقت در آن نیست.',
    'policy.concern':
      'نگرانی دربارهٔ رفتار کسی یا ایمنی یک کودک، پرسشی دربارهٔ سیاست نیست. این نگرانی به یک انسان می‌رسد.',
    'policy.draftBody':
      'این سند نوشته شده است، اما هیچ نسخه‌ای از آن تأیید نشده، پس اینجا چیزی برای خواندن یا موافقت نیست. پیش‌نویس نشان داده نمی‌شود، چون هنوز ممکن است تغییر کند. تا وقتی نسخه‌ای تأیید نشود، اینجا چیزی موافقت شما را نمی‌خواهد.',
    'policy.changed': 'آنچه در این نسخه تغییر کرده: {note}',
    'policy.asWritten': 'سند به همان زبانی نشان داده می‌شود که به آن نوشته شده است.',
    'policy.agreeTitle': 'موافقت شما',
    'policy.agreeSignIn':
      'این سند موافقت شما را می‌خواهد، و زمان موافقت با حساب شما نگه داشته می‌شود. نخست وارد شوید.',
    'policy.agreeSignInDo': 'برای موافقت وارد شوید',
    'policy.agreeNote':
      'موافقت ثبت می‌کند که این نسخه را خوانده‌اید و آن را می‌پذیرید. نسخه و زمان با حساب شما نگه داشته می‌شود.',
    'policy.agreeDo': 'با این نسخه موافقم',
    'policy.agreed': 'شما با این نسخه در این زمان موافقت کردید: {date}',
    'policy.agreedWhere': 'آنچه با آن موافقت کرده‌اید در صفحهٔ حساب شما فهرست شده است.',
    'policy.agreedNewer':
      'هنگامی که این صفحه باز بود نسخهٔ تازه‌تری منتشر شد و موافقت شما برای همان نسخهٔ تازه ثبت شد. این صفحه اکنون آن را نشان می‌دهد. آن را بخوانید.',
    'policy.waitingCount': 'سندهای منتظر موافقت شما: {count}',
    'policy.whyChanged':
      'این سند پس از باز شدن این صفحه تغییر کرد، پس چیزی ثبت نشد. پیش از موافقت دوباره آن را بخوانید.',
    'policy.agreeFailed': 'ثبت موافقت شما ممکن نشد. چیزی تغییر نکرد.',
    'policy.agreeUnsure':
      'نتوانستیم تأیید کنیم که موافقت شما ثبت شده است. برای دیدن، این صفحه را دوباره باز کنید.',
    'policy.noticeChanged': 'سندهایی که پس از موافقت شما تغییر کرده‌اند: {count}',
    'policy.noticeOpen': 'ببینید چه تغییر کرده است',
    'policy.noticeDismiss': 'این اعلان را پنهان کنید',
  },
  'fa-af': {
    'policy.lede':
      'آنچه هنگام آموختن یا تدریس در اینجا با آن موافقت می‌کنید، آنچه با معلومات شما انجام می‌شود، و آنچه در صورت پیش آمدن مشکل رخ می‌دهد.',
    'policy.kept':
      'هر نسخه از هر سند نگهداری می‌شود. تغییر یک نسخهٔ نو است که از یک تاریخ معیّن نافذ می‌شود، نه اصلاح نسخهٔ کهنه، و هر جا به موافقت شما نیاز باشد دوباره از شما پرسیده می‌شود.',
    'policy.unread':
      'خواندن پالیسی‌ها فعلاً ممکن نشد. این به آن معنا نیست که پالیسی وجود ندارد. کمی بعد دوباره کوشش کنید.',
    'policy.none': 'هنوز هیچ پالیسی نوشته نشده است.',
    'policy.noneLead': 'هیچ‌یک از این‌ها هنوز نافذ نیست.',
    'policy.noneBody':
      'یک سند تنها زمانی نشر می‌شود که مالک پلتفرم به پرسش‌هایی در آن که فقط خودش می‌تواند پاسخ دهد پاسخ داده باشد، مانند اینکه کدام قانون تطبیق می‌شود و چه کسی مسئول معلومات شماست. تا آن وقت نافذ نیست و مسودهٔ آن نشان داده نمی‌شود.',
    'policy.inForceCount': 'سندهای نافذ: {count}',
    'policy.othersDraft': 'باقی نوشته شده‌اند و هنوز تأیید نشده‌اند.',
    'policy.forEveryone': 'برای همه',
    'policy.forChild': 'برای اطفال و سرپرستانشان',
    'policy.forTeacher': 'برای معلمان',
    'policy.forInstitution': 'برای مؤسسه‌ها',
    'policy.notYet': 'هنوز نافذ نیست',
    'policy.versionNo': 'نسخه: {number}',
    'policy.inForceFrom': 'نافذ از: {date}',
    'policy.mustAgree': 'از شما خواسته می‌شود با آن موافقت کنید، و وقت موافقت شما نگهداری می‌شود.',
    'policy.noSign': 'برای خواندن است. چیزی برای موافقت در آن نیست.',
    'policy.concern':
      'تشویش دربارهٔ رفتار کسی یا مصونیت یک طفل، پرسشی دربارهٔ پالیسی نیست. این تشویش به یک انسان می‌رسد.',
    'policy.draftBody':
      'این سند نوشته شده است، اما هیچ نسخه‌ای از آن تأیید نشده، پس اینجا چیزی برای خواندن یا موافقت نیست. مسوده نشان داده نمی‌شود، چون هنوز ممکن است تغییر کند. تا وقتی نسخه‌ای تأیید نشود، اینجا چیزی موافقت شما را نمی‌خواهد.',
    'policy.changed': 'آنچه در این نسخه تغییر کرده: {note}',
    'policy.asWritten': 'سند به همان زبانی نشان داده می‌شود که به آن نوشته شده است.',
    'policy.agreeTitle': 'موافقت شما',
    'policy.agreeSignIn':
      'این سند موافقت شما را می‌خواهد، و وقت موافقت با حساب شما نگهداری می‌شود. اول داخل شوید.',
    'policy.agreeSignInDo': 'برای موافقت داخل شوید',
    'policy.agreeNote':
      'موافقت ثبت می‌کند که این نسخه را خوانده‌اید و آن را می‌پذیرید. نسخه و وقت با حساب شما نگهداری می‌شود.',
    'policy.agreeDo': 'با این نسخه موافقم',
    'policy.agreed': 'شما با این نسخه در این وقت موافقت کردید: {date}',
    'policy.agreedWhere': 'آنچه با آن موافقت کرده‌اید در صفحهٔ حساب شما فهرست شده است.',
    'policy.agreedNewer':
      'هنگامی که این صفحه باز بود نسخهٔ نوتری نشر شد و موافقت شما برای همان نسخهٔ نو ثبت شد. این صفحه حالا آن را نشان می‌دهد. آن را بخوانید.',
    'policy.waitingCount': 'سندهای منتظر موافقت شما: {count}',
    'policy.whyChanged':
      'این سند پس از باز شدن این صفحه تغییر کرد، پس چیزی ثبت نشد. پیش از موافقت دوباره آن را بخوانید.',
    'policy.agreeFailed': 'ثبت موافقت شما ممکن نشد. چیزی تغییر نکرد.',
    'policy.agreeUnsure':
      'نتوانستیم تأیید کنیم که موافقت شما ثبت شده است. برای دیدن، این صفحه را دوباره باز کنید.',
    'policy.noticeChanged': 'سندهایی که پس از موافقت شما تغییر کرده‌اند: {count}',
    'policy.noticeOpen': 'ببینید چه چیز تغییر کرده است',
    'policy.noticeDismiss': 'این اطلاعیه را پنهان کنید',
  },
  tr: {
    'policy.lede':
      'Burada öğrenirken veya öğretirken neyi kabul ettiğiniz, verilerinizle ne yapıldığı ve bir şey ters gittiğinde ne olduğu.',
    'policy.kept':
      'Bir belgenin her sürümü saklanır. Değişiklik, belirli bir tarihte yürürlüğe giren yeni bir sürümdür; eski bir sürümün düzeltilmesi değildir ve onayınız gerekiyorsa size yeniden sorulur.',
    'policy.unread':
      'Politikalar şu anda okunamadı. Bu, hiç politika olmadığı anlamına gelmez. Biraz sonra yeniden deneyin.',
    'policy.none': 'Henüz hiçbir politika yazılmadı.',
    'policy.noneLead': 'Bunların hiçbiri henüz yürürlükte değil.',
    'policy.noneBody':
      'Bir belge, ancak platformun sahibi içindeki yalnızca kendisinin yanıtlayabileceği soruları yanıtladığında yayımlanır; örneğin hangi hukukun uygulanacağı ve verilerinizden kimin sorumlu olduğu. O zamana kadar yürürlükte değildir ve taslağı gösterilmez.',
    'policy.inForceCount': 'Yürürlükteki belgeler: {count}',
    'policy.othersDraft': 'Diğerleri yazıldı, henüz onaylanmadı.',
    'policy.forEveryone': 'Herkes için',
    'policy.forChild': 'Çocuklar ve velileri için',
    'policy.forTeacher': 'Öğretmenler için',
    'policy.forInstitution': 'Kurumlar için',
    'policy.notYet': 'Henüz yürürlükte değil',
    'policy.versionNo': 'Sürüm: {number}',
    'policy.inForceFrom': 'Yürürlük başlangıcı: {date}',
    'policy.mustAgree': 'Bunu kabul etmeniz istenecek ve kabul ettiğiniz zaman saklanır.',
    'policy.noSign': 'Okumak içindir. Kabul edilecek bir şey yoktur.',
    'policy.concern':
      'Birinin davranışıyla veya bir çocuğun güvenliğiyle ilgili bir kaygı, politika sorusu değildir. Bir insana iletilir.',
    'policy.draftBody':
      'Bu belge yazıldı, ancak hiçbir sürümü onaylanmadı; bu yüzden burada okunacak veya kabul edilecek bir şey yok. Taslak gösterilmez, çünkü hâlâ değişebilir. Bir sürüm onaylanana kadar burada hiçbir şey onayınızı istemez.',
    'policy.changed': 'Bu sürümde değişenler: {note}',
    'policy.asWritten': 'Belge, yazıldığı dilde gösterilir.',
    'policy.agreeTitle': 'Onayınız',
    'policy.agreeSignIn':
      'Bu belge onayınızı ister ve onay verdiğiniz zaman hesabınızla birlikte saklanır. Önce oturum açın.',
    'policy.agreeSignInDo': 'Onaylamak için oturum açın',
    'policy.agreeNote':
      'Onaylamak, bu sürümü okuduğunuzu ve kabul ettiğinizi kaydeder. Sürüm ve zaman hesabınızla birlikte saklanır.',
    'policy.agreeDo': 'Bu sürümü onaylıyorum',
    'policy.agreed': 'Bu sürümü şu zamanda onayladınız: {date}',
    'policy.agreedWhere': 'Onayladıklarınız hesap sayfanızda listelenir.',
    'policy.agreedNewer':
      'Bu sayfa açıkken daha yeni bir sürüm yayımlandı ve onayınız o sürüm için kaydedildi. Bu sayfa şimdi onu gösteriyor. Onu okuyun.',
    'policy.waitingCount': 'Onayınızı bekleyen belgeler: {count}',
    'policy.whyChanged':
      'Bu belge, bu sayfa açıldıktan sonra değişti; bu yüzden hiçbir şey kaydedilmedi. Onaylamadan önce yeniden okuyun.',
    'policy.agreeFailed': 'Onayınız kaydedilemedi. Hiçbir şey değişmedi.',
    'policy.agreeUnsure':
      'Onayınızın kaydedildiğini doğrulayamadık. Görmek için bu sayfayı yeniden açın.',
    'policy.noticeChanged': 'Onayınızdan sonra değişen belgeler: {count}',
    'policy.noticeOpen': 'Neyin değiştiğini okuyun',
    'policy.noticeDismiss': 'Bu bildirimi gizle',
  },
  id: {
    'policy.lede':
      'Apa yang Anda setujui saat belajar atau mengajar di sini, apa yang dilakukan terhadap data Anda, dan apa yang terjadi bila ada yang tidak beres.',
    'policy.kept':
      'Setiap versi dokumen disimpan. Perubahan adalah versi baru yang berlaku mulai suatu tanggal, bukan suntingan atas versi lama, dan bila memerlukan persetujuan Anda, Anda ditanya lagi.',
    'policy.unread':
      'Kebijakan tidak dapat dibaca saat ini. Ini tidak berarti tidak ada kebijakan. Coba lagi sebentar lagi.',
    'policy.none': 'Belum ada kebijakan yang ditulis.',
    'policy.noneLead': 'Belum ada satu pun dari dokumen ini yang berlaku.',
    'policy.noneBody':
      'Sebuah dokumen baru diterbitkan setelah pemilik platform menjawab pertanyaan di dalamnya yang hanya dapat dijawab olehnya, seperti hukum mana yang berlaku dan siapa yang bertanggung jawab atas data Anda. Sampai saat itu dokumen tersebut tidak berlaku, dan drafnya tidak ditampilkan.',
    'policy.inForceCount': 'Dokumen yang berlaku: {count}',
    'policy.othersDraft': 'Yang lain sudah ditulis dan belum disetujui.',
    'policy.forEveryone': 'Untuk semua orang',
    'policy.forChild': 'Untuk anak-anak dan wali mereka',
    'policy.forTeacher': 'Untuk guru',
    'policy.forInstitution': 'Untuk lembaga',
    'policy.notYet': 'Belum berlaku',
    'policy.versionNo': 'Versi: {number}',
    'policy.inForceFrom': 'Berlaku mulai: {date}',
    'policy.mustAgree': 'Anda akan diminta menyetujuinya, dan waktu Anda menyetujui disimpan.',
    'policy.noSign': 'Ini untuk dibaca. Tidak ada yang perlu disetujui.',
    'policy.concern':
      'Kekhawatiran tentang perilaku seseorang, atau tentang keselamatan seorang anak, bukan pertanyaan tentang kebijakan. Hal itu disampaikan kepada seorang manusia.',
    'policy.draftBody':
      'Dokumen ini sudah ditulis, tetapi belum ada versinya yang disetujui, jadi tidak ada yang dapat dibaca atau disetujui di sini. Draf tidak ditampilkan karena masih dapat berubah. Tidak ada apa pun di sini yang meminta persetujuan Anda sampai sebuah versi disetujui.',
    'policy.changed': 'Yang berubah dalam versi ini: {note}',
    'policy.asWritten': 'Dokumen ditampilkan dalam bahasa penulisannya.',
    'policy.agreeTitle': 'Persetujuan Anda',
    'policy.agreeSignIn':
      'Dokumen ini meminta persetujuan Anda, dan waktu Anda memberikannya disimpan bersama akun Anda. Masuk terlebih dahulu.',
    'policy.agreeSignInDo': 'Masuk untuk menyetujui',
    'policy.agreeNote':
      'Menyetujui berarti mencatat bahwa Anda telah membaca versi ini dan menerimanya. Versi dan waktunya disimpan bersama akun Anda.',
    'policy.agreeDo': 'Setujui versi ini',
    'policy.agreed': 'Anda menyetujui versi ini pada: {date}',
    'policy.agreedWhere': 'Apa yang telah Anda setujui tercantum di halaman akun Anda.',
    'policy.agreedNewer':
      'Versi yang lebih baru diterbitkan saat halaman ini terbuka, dan persetujuan Anda dicatat untuk versi itu. Halaman ini sekarang menampilkannya. Bacalah.',
    'policy.waitingCount': 'Dokumen yang menunggu persetujuan Anda: {count}',
    'policy.whyChanged':
      'Dokumen ini berubah setelah halaman ini dibuka, jadi tidak ada yang dicatat. Baca lagi sebelum Anda menyetujui.',
    'policy.agreeFailed': 'Persetujuan Anda tidak dapat dicatat. Tidak ada yang berubah.',
    'policy.agreeUnsure':
      'Kami tidak dapat memastikan bahwa persetujuan Anda tercatat. Buka halaman ini lagi untuk melihatnya.',
    'policy.noticeChanged': 'Dokumen yang berubah setelah Anda menyetujuinya: {count}',
    'policy.noticeOpen': 'Baca apa yang berubah',
    'policy.noticeDismiss': 'Sembunyikan pemberitahuan ini',
  },
  ms: {
    'policy.lede':
      'Apa yang anda persetujui semasa belajar atau mengajar di sini, apa yang dilakukan terhadap data anda, dan apa yang berlaku jika ada yang tidak kena.',
    'policy.kept':
      'Setiap versi dokumen disimpan. Perubahan ialah versi baharu yang berkuat kuasa pada suatu tarikh, bukan suntingan pada versi lama, dan jika memerlukan persetujuan anda, anda ditanya semula.',
    'policy.unread':
      'Dasar tidak dapat dibaca sekarang. Ini tidak bermakna tiada dasar. Cuba lagi sebentar lagi.',
    'policy.none': 'Belum ada dasar yang ditulis.',
    'policy.noneLead': 'Tiada satu pun daripada dokumen ini berkuat kuasa lagi.',
    'policy.noneBody':
      'Sesuatu dokumen hanya diterbitkan apabila pemilik platform telah menjawab soalan di dalamnya yang hanya dia boleh jawab, seperti undang-undang mana yang terpakai dan siapa yang bertanggungjawab atas data anda. Sehingga itu dokumen tersebut tidak berkuat kuasa, dan drafnya tidak dipaparkan.',
    'policy.inForceCount': 'Dokumen yang berkuat kuasa: {count}',
    'policy.othersDraft': 'Yang lain sudah ditulis dan belum diluluskan.',
    'policy.forEveryone': 'Untuk semua orang',
    'policy.forChild': 'Untuk kanak-kanak dan penjaga mereka',
    'policy.forTeacher': 'Untuk guru',
    'policy.forInstitution': 'Untuk institusi',
    'policy.notYet': 'Belum berkuat kuasa',
    'policy.versionNo': 'Versi: {number}',
    'policy.inForceFrom': 'Berkuat kuasa mulai: {date}',
    'policy.mustAgree': 'Anda akan diminta bersetuju dengannya, dan masa anda bersetuju disimpan.',
    'policy.noSign': 'Ini untuk dibaca. Tiada apa-apa yang perlu dipersetujui.',
    'policy.concern':
      'Kebimbangan tentang kelakuan seseorang, atau tentang keselamatan seorang kanak-kanak, bukan soalan tentang dasar. Perkara itu disampaikan kepada seorang manusia.',
    'policy.draftBody':
      'Dokumen ini sudah ditulis, tetapi tiada versinya yang diluluskan, jadi tiada apa-apa untuk dibaca atau dipersetujui di sini. Draf tidak dipaparkan kerana masih boleh berubah. Tiada apa-apa di sini meminta persetujuan anda sehingga satu versi diluluskan.',
    'policy.changed': 'Apa yang berubah dalam versi ini: {note}',
    'policy.asWritten': 'Dokumen dipaparkan dalam bahasa ia ditulis.',
    'policy.agreeTitle': 'Persetujuan anda',
    'policy.agreeSignIn':
      'Dokumen ini meminta persetujuan anda, dan masa anda memberikannya disimpan bersama akaun anda. Log masuk dahulu.',
    'policy.agreeSignInDo': 'Log masuk untuk bersetuju',
    'policy.agreeNote':
      'Bersetuju merekodkan bahawa anda telah membaca versi ini dan menerimanya. Versi dan masanya disimpan bersama akaun anda.',
    'policy.agreeDo': 'Setuju dengan versi ini',
    'policy.agreed': 'Anda bersetuju dengan versi ini pada: {date}',
    'policy.agreedWhere': 'Apa yang telah anda persetujui disenaraikan di halaman akaun anda.',
    'policy.agreedNewer':
      'Versi yang lebih baharu diterbitkan semasa halaman ini terbuka, dan persetujuan anda direkodkan untuk versi itu. Halaman ini kini memaparkannya. Bacalah.',
    'policy.waitingCount': 'Dokumen yang menunggu persetujuan anda: {count}',
    'policy.whyChanged':
      'Dokumen ini berubah selepas halaman ini dibuka, jadi tiada apa-apa direkodkan. Baca semula sebelum anda bersetuju.',
    'policy.agreeFailed': 'Persetujuan anda tidak dapat direkodkan. Tiada apa-apa yang berubah.',
    'policy.agreeUnsure':
      'Kami tidak dapat mengesahkan bahawa persetujuan anda telah direkodkan. Buka halaman ini semula untuk melihatnya.',
    'policy.noticeChanged': 'Dokumen yang berubah selepas anda bersetuju dengannya: {count}',
    'policy.noticeOpen': 'Baca apa yang berubah',
    'policy.noticeDismiss': 'Sembunyikan notis ini',
  },
  bn: {
    'policy.lede':
      'এখানে শেখার বা শেখানোর সময় আপনি কীসে সম্মতি দেন, আপনার তথ্য নিয়ে কী করা হয়, এবং কিছু ভুল হলে কী ঘটে।',
    'policy.kept':
      'প্রতিটি নথির প্রতিটি সংস্করণ রাখা হয়। পরিবর্তন মানে একটি নতুন সংস্করণ, যা একটি তারিখ থেকে কার্যকর হয়; পুরোনো সংস্করণের সম্পাদনা নয়, এবং যেখানে আপনার সম্মতি দরকার সেখানে আপনাকে আবার জিজ্ঞাসা করা হয়।',
    'policy.unread':
      'নীতিগুলো এখন পড়া যায়নি। এর মানে এই নয় যে কোনো নীতি নেই। একটু পরে আবার চেষ্টা করুন।',
    'policy.none': 'এখনো কোনো নীতি লেখা হয়নি।',
    'policy.noneLead': 'এগুলোর কোনোটিই এখনো কার্যকর নয়।',
    'policy.noneBody':
      'একটি নথি তখনই প্রকাশিত হয় যখন প্ল্যাটফর্মের মালিক তার ভেতরের সেই প্রশ্নগুলোর উত্তর দেন যেগুলোর উত্তর শুধু তিনিই দিতে পারেন, যেমন কোন আইন প্রযোজ্য এবং আপনার তথ্যের দায়িত্ব কার। ততদিন এটি কার্যকর নয়, এবং খসড়া দেখানো হয় না।',
    'policy.inForceCount': 'কার্যকর নথি: {count}',
    'policy.othersDraft': 'অন্যগুলো লেখা হয়েছে এবং এখনো অনুমোদিত হয়নি।',
    'policy.forEveryone': 'সবার জন্য',
    'policy.forChild': 'শিশু ও তাদের অভিভাবকদের জন্য',
    'policy.forTeacher': 'শিক্ষকদের জন্য',
    'policy.forInstitution': 'প্রতিষ্ঠানের জন্য',
    'policy.notYet': 'এখনো কার্যকর নয়',
    'policy.versionNo': 'সংস্করণ: {number}',
    'policy.inForceFrom': 'এই তারিখ থেকে কার্যকর: {date}',
    'policy.mustAgree': 'আপনাকে এতে সম্মতি দিতে বলা হবে, এবং সম্মতির সময় রাখা হয়।',
    'policy.noSign': 'এটি পড়ার জন্য। এতে সম্মতি দেওয়ার কিছু নেই।',
    'policy.concern':
      'কারও আচরণ বা কোনো শিশুর নিরাপত্তা নিয়ে উদ্বেগ নীতির প্রশ্ন নয়। তা একজন মানুষের কাছে যায়।',
    'policy.draftBody':
      'এই নথি লেখা হয়েছে, কিন্তু এর কোনো সংস্করণ অনুমোদিত হয়নি, তাই এখানে পড়ার বা সম্মতি দেওয়ার কিছু নেই। খসড়া দেখানো হয় না, কারণ তা এখনো বদলাতে পারে। কোনো সংস্করণ অনুমোদিত না হওয়া পর্যন্ত এখানে কিছুই আপনার সম্মতি চায় না।',
    'policy.changed': 'এই সংস্করণে যা বদলেছে: {note}',
    'policy.asWritten': 'নথিটি যে ভাষায় লেখা হয়েছে সেই ভাষাতেই দেখানো হয়েছে।',
    'policy.agreeTitle': 'আপনার সম্মতি',
    'policy.agreeSignIn':
      'এই নথি আপনার সম্মতি চায়, এবং সম্মতির সময় আপনার অ্যাকাউন্টের সঙ্গে রাখা হয়। আগে সাইন ইন করুন।',
    'policy.agreeSignInDo': 'সম্মতি দিতে সাইন ইন করুন',
    'policy.agreeNote':
      'সম্মতি দিলে লেখা থাকে যে আপনি এই সংস্করণ পড়েছেন এবং তা গ্রহণ করছেন। সংস্করণ ও সময় আপনার অ্যাকাউন্টের সঙ্গে রাখা হয়।',
    'policy.agreeDo': 'এই সংস্করণে সম্মতি দিন',
    'policy.agreed': 'আপনি এই সংস্করণে সম্মতি দিয়েছেন এই সময়ে: {date}',
    'policy.agreedWhere':
      'আপনি যেগুলোতে সম্মতি দিয়েছেন তা আপনার অ্যাকাউন্ট পাতায় তালিকাভুক্ত আছে।',
    'policy.agreedNewer':
      'এই পাতা খোলা থাকার সময় একটি নতুন সংস্করণ প্রকাশিত হয়েছে, এবং আপনার সম্মতি সেই সংস্করণের জন্য লেখা হয়েছে। এই পাতা এখন সেটিই দেখাচ্ছে। সেটি পড়ুন।',
    'policy.waitingCount': 'আপনার সম্মতির অপেক্ষায় থাকা নথি: {count}',
    'policy.whyChanged':
      'এই পাতা খোলার পর নথিটি বদলে গেছে, তাই কিছুই লেখা হয়নি। সম্মতি দেওয়ার আগে আবার পড়ুন।',
    'policy.agreeFailed': 'আপনার সম্মতি লেখা যায়নি। কিছুই বদলায়নি।',
    'policy.agreeUnsure':
      'আপনার সম্মতি লেখা হয়েছে কি না আমরা নিশ্চিত করতে পারিনি। দেখতে এই পাতা আবার খুলুন।',
    'policy.noticeChanged': 'আপনার সম্মতির পরে বদলে যাওয়া নথি: {count}',
    'policy.noticeOpen': 'কী বদলেছে পড়ুন',
    'policy.noticeDismiss': 'এই বিজ্ঞপ্তি লুকান',
  },
  hi: {
    'policy.lede':
      'यहाँ सीखते या सिखाते समय आप किस बात पर सहमति देते हैं, आपके डेटा के साथ क्या किया जाता है, और कुछ गलत होने पर क्या होता है।',
    'policy.kept':
      'हर दस्तावेज़ का हर संस्करण रखा जाता है। बदलाव एक नया संस्करण होता है जो एक तारीख से लागू होता है, पुराने संस्करण में संपादन नहीं, और जहाँ आपकी सहमति चाहिए वहाँ आपसे फिर पूछा जाता है।',
    'policy.unread':
      'नीतियाँ अभी पढ़ी नहीं जा सकीं। इसका यह अर्थ नहीं कि कोई नीति नहीं है। थोड़ी देर में फिर कोशिश करें।',
    'policy.none': 'अभी तक कोई नीति नहीं लिखी गई है।',
    'policy.noneLead': 'इनमें से कोई भी अभी लागू नहीं है।',
    'policy.noneBody':
      'कोई दस्तावेज़ तभी प्रकाशित होता है जब प्लेटफ़ॉर्म का मालिक उसमें मौजूद उन सवालों के जवाब दे देता है जिनका जवाब केवल वही दे सकता है, जैसे कौन सा कानून लागू होता है और आपके डेटा के लिए कौन ज़िम्मेदार है। तब तक वह लागू नहीं होता, और मसौदा नहीं दिखाया जाता।',
    'policy.inForceCount': 'लागू दस्तावेज़: {count}',
    'policy.othersDraft': 'बाकी लिखे जा चुके हैं और अभी स्वीकृत नहीं हुए हैं।',
    'policy.forEveryone': 'सबके लिए',
    'policy.forChild': 'बच्चों और उनके अभिभावकों के लिए',
    'policy.forTeacher': 'शिक्षकों के लिए',
    'policy.forInstitution': 'संस्थाओं के लिए',
    'policy.notYet': 'अभी लागू नहीं',
    'policy.versionNo': 'संस्करण: {number}',
    'policy.inForceFrom': 'इस तारीख से लागू: {date}',
    'policy.mustAgree': 'आपसे इस पर सहमति देने को कहा जाएगा, और सहमति का समय रखा जाता है।',
    'policy.noSign': 'यह पढ़ने के लिए है। इसमें सहमति देने को कुछ नहीं है।',
    'policy.concern':
      'किसी के व्यवहार या किसी बच्चे की सुरक्षा को लेकर चिंता नीति का सवाल नहीं है। वह एक इंसान के पास जाती है।',
    'policy.draftBody':
      'यह दस्तावेज़ लिखा जा चुका है, पर इसका कोई संस्करण स्वीकृत नहीं हुआ है, इसलिए यहाँ पढ़ने या सहमति देने को कुछ नहीं है। मसौदा नहीं दिखाया जाता, क्योंकि वह अभी बदल सकता है। जब तक कोई संस्करण स्वीकृत नहीं होता, यहाँ कुछ भी आपकी सहमति नहीं माँगता।',
    'policy.changed': 'इस संस्करण में क्या बदला: {note}',
    'policy.asWritten': 'दस्तावेज़ उसी भाषा में दिखाया गया है जिसमें वह लिखा गया था।',
    'policy.agreeTitle': 'आपकी सहमति',
    'policy.agreeSignIn':
      'यह दस्तावेज़ आपकी सहमति माँगता है, और सहमति का समय आपके खाते के साथ रखा जाता है। पहले साइन इन करें।',
    'policy.agreeSignInDo': 'सहमति देने के लिए साइन इन करें',
    'policy.agreeNote':
      'सहमति देने से यह दर्ज होता है कि आपने यह संस्करण पढ़ लिया है और इसे स्वीकार करते हैं। संस्करण और समय आपके खाते के साथ रखे जाते हैं।',
    'policy.agreeDo': 'इस संस्करण पर सहमति दें',
    'policy.agreed': 'आपने इस संस्करण पर इस समय सहमति दी: {date}',
    'policy.agreedWhere': 'जिन पर आपने सहमति दी है वे आपके खाते के पृष्ठ पर सूचीबद्ध हैं।',
    'policy.agreedNewer':
      'इस पृष्ठ के खुले रहते एक नया संस्करण प्रकाशित हुआ, और आपकी सहमति उसी संस्करण के लिए दर्ज हुई। यह पृष्ठ अब उसे दिखा रहा है। उसे पढ़ें।',
    'policy.waitingCount': 'आपकी सहमति की प्रतीक्षा में दस्तावेज़: {count}',
    'policy.whyChanged':
      'यह दस्तावेज़ इस पृष्ठ के खुलने के बाद बदल गया, इसलिए कुछ दर्ज नहीं हुआ। सहमति देने से पहले इसे फिर पढ़ें।',
    'policy.agreeFailed': 'आपकी सहमति दर्ज नहीं हो सकी। कुछ नहीं बदला।',
    'policy.agreeUnsure':
      'हम पुष्टि नहीं कर सके कि आपकी सहमति दर्ज हुई। देखने के लिए यह पृष्ठ फिर खोलें।',
    'policy.noticeChanged': 'आपकी सहमति के बाद बदले दस्तावेज़: {count}',
    'policy.noticeOpen': 'पढ़ें कि क्या बदला',
    'policy.noticeDismiss': 'यह सूचना छिपाएँ',
  },
  fr: {
    'policy.lede':
      'Ce que vous acceptez quand vous apprenez ou enseignez ici, ce qui est fait de vos données, et ce qui se passe quand quelque chose tourne mal.',
    'policy.kept':
      'Chaque version d’un document est conservée. Un changement est une nouvelle version qui prend effet à une date, jamais une retouche d’une ancienne, et si elle demande votre accord, il vous est redemandé.',
    'policy.unread':
      'Les politiques n’ont pas pu être lues pour le moment. Cela ne veut pas dire qu’il n’y en a pas. Réessayez dans un instant.',
    'policy.none': 'Aucune politique n’a encore été rédigée.',
    'policy.noneLead': 'Aucun de ces documents n’est encore en vigueur.',
    'policy.noneBody':
      'Un document n’est publié que lorsque le propriétaire de la plateforme a répondu aux questions qu’il contient et auxquelles lui seul peut répondre, par exemple quel droit s’applique et qui est responsable de vos données. D’ici là, il n’est pas en vigueur et son brouillon n’est pas montré.',
    'policy.inForceCount': 'Documents en vigueur : {count}',
    'policy.othersDraft': 'Les autres sont rédigés et pas encore approuvés.',
    'policy.forEveryone': 'Pour tout le monde',
    'policy.forChild': 'Pour les enfants et leurs responsables',
    'policy.forTeacher': 'Pour les enseignants',
    'policy.forInstitution': 'Pour les établissements',
    'policy.notYet': 'Pas encore en vigueur',
    'policy.versionNo': 'Version : {number}',
    'policy.inForceFrom': 'En vigueur depuis le : {date}',
    'policy.mustAgree':
      'Il vous sera demandé de l’accepter, et le moment de votre accord est conservé.',
    'policy.noSign': 'Il est à lire. Il n’y a rien à accepter.',
    'policy.concern':
      'Une inquiétude sur le comportement de quelqu’un, ou sur la sécurité d’un enfant, n’est pas une question de politique. Elle est transmise à une personne.',
    'policy.draftBody':
      'Ce document est rédigé, mais aucune de ses versions n’a été approuvée ; il n’y a donc rien à lire ni à accepter ici. Un brouillon n’est pas montré, car il peut encore changer. Rien ici ne demande votre accord tant qu’une version n’est pas approuvée.',
    'policy.changed': 'Ce qui a changé dans cette version : {note}',
    'policy.asWritten': 'Le document est montré dans la langue où il a été rédigé.',
    'policy.agreeTitle': 'Votre accord',
    'policy.agreeSignIn':
      'Ce document demande votre accord, et le moment où vous le donnez est conservé avec votre compte. Connectez-vous d’abord.',
    'policy.agreeSignInDo': 'Se connecter pour accepter',
    'policy.agreeNote':
      'Accepter enregistre que vous avez lu cette version et que vous l’acceptez. La version et le moment sont conservés avec votre compte.',
    'policy.agreeDo': 'Accepter cette version',
    'policy.agreed': 'Vous avez accepté cette version le : {date}',
    'policy.agreedWhere': 'Ce que vous avez accepté est listé sur la page de votre compte.',
    'policy.agreedNewer':
      'Une version plus récente a été publiée pendant que cette page était ouverte, et votre accord a été enregistré pour celle-là. Cette page la montre maintenant. Lisez-la.',
    'policy.waitingCount': 'Documents qui attendent votre accord : {count}',
    'policy.whyChanged':
      'Ce document a changé après l’ouverture de cette page ; rien n’a donc été enregistré. Relisez-le avant d’accepter.',
    'policy.agreeFailed': 'Votre accord n’a pas pu être enregistré. Rien n’a été modifié.',
    'policy.agreeUnsure':
      'Nous n’avons pas pu confirmer que votre accord a été enregistré. Rouvrez cette page pour le voir.',
    'policy.noticeChanged': 'Documents modifiés après votre accord : {count}',
    'policy.noticeOpen': 'Lire ce qui a changé',
    'policy.noticeDismiss': 'Masquer cet avis',
  },
  es: {
    'policy.lede':
      'Lo que acepta cuando aprende o enseña aquí, lo que se hace con sus datos y lo que ocurre cuando algo sale mal.',
    'policy.kept':
      'Se conserva cada versión de un documento. Un cambio es una versión nueva que entra en vigor en una fecha, nunca una corrección de una anterior, y si requiere su conformidad se le vuelve a pedir.',
    'policy.unread':
      'No se pudieron leer las políticas en este momento. Esto no significa que no haya ninguna. Inténtelo de nuevo en un momento.',
    'policy.none': 'Todavía no se ha escrito ninguna política.',
    'policy.noneLead': 'Ninguno de estos documentos está en vigor todavía.',
    'policy.noneBody':
      'Un documento solo se publica cuando el propietario de la plataforma ha respondido las preguntas que contiene y que solo él puede responder, como qué ley se aplica y quién es responsable de sus datos. Hasta entonces no está en vigor, y su borrador no se muestra.',
    'policy.inForceCount': 'Documentos en vigor: {count}',
    'policy.othersDraft': 'Los demás están escritos y aún no aprobados.',
    'policy.forEveryone': 'Para todos',
    'policy.forChild': 'Para niños y sus tutores',
    'policy.forTeacher': 'Para docentes',
    'policy.forInstitution': 'Para instituciones',
    'policy.notYet': 'Aún no está en vigor',
    'policy.versionNo': 'Versión: {number}',
    'policy.inForceFrom': 'En vigor desde: {date}',
    'policy.mustAgree': 'Se le pedirá que lo acepte, y se conserva el momento en que lo hace.',
    'policy.noSign': 'Es para leer. No hay nada que aceptar.',
    'policy.concern':
      'Una preocupación por el comportamiento de alguien, o por la seguridad de un niño, no es una pregunta sobre una política. Llega a una persona.',
    'policy.draftBody':
      'Este documento está escrito, pero no se ha aprobado ninguna versión, así que aquí no hay nada que leer ni que aceptar. Un borrador no se muestra, porque todavía puede cambiar. Nada aquí pide su conformidad hasta que se apruebe una versión.',
    'policy.changed': 'Lo que cambió en esta versión: {note}',
    'policy.asWritten': 'El documento se muestra en el idioma en que fue escrito.',
    'policy.agreeTitle': 'Su conformidad',
    'policy.agreeSignIn':
      'Este documento pide su conformidad, y el momento en que la da se conserva con su cuenta. Inicie sesión primero.',
    'policy.agreeSignInDo': 'Iniciar sesión para aceptar',
    'policy.agreeNote':
      'Aceptar deja constancia de que ha leído esta versión y la acepta. La versión y el momento se conservan con su cuenta.',
    'policy.agreeDo': 'Aceptar esta versión',
    'policy.agreed': 'Aceptó esta versión el: {date}',
    'policy.agreedWhere': 'Lo que ha aceptado aparece en la página de su cuenta.',
    'policy.agreedNewer':
      'Se publicó una versión más reciente mientras esta página estaba abierta, y su conformidad quedó registrada para esa. Esta página la muestra ahora. Léala.',
    'policy.waitingCount': 'Documentos que esperan su conformidad: {count}',
    'policy.whyChanged':
      'Este documento cambió después de abrirse esta página, así que no se registró nada. Vuelva a leerlo antes de aceptar.',
    'policy.agreeFailed': 'No se pudo registrar su conformidad. No se cambió nada.',
    'policy.agreeUnsure':
      'No pudimos confirmar que su conformidad quedó registrada. Abra esta página de nuevo para verlo.',
    'policy.noticeChanged': 'Documentos que cambiaron después de su conformidad: {count}',
    'policy.noticeOpen': 'Leer lo que cambió',
    'policy.noticeDismiss': 'Ocultar este aviso',
  },
  pt: {
    'policy.lede':
      'Aquilo com que concorda quando aprende ou ensina aqui, o que é feito com os seus dados e o que acontece quando algo corre mal.',
    'policy.kept':
      'Cada versão de um documento é guardada. Uma alteração é uma versão nova que entra em vigor numa data, nunca uma emenda a uma antiga, e se precisar da sua concordância ela volta a ser-lhe pedida.',
    'policy.unread':
      'Não foi possível ler as políticas neste momento. Isto não significa que não haja nenhuma. Tente de novo daqui a pouco.',
    'policy.none': 'Ainda não foi escrita nenhuma política.',
    'policy.noneLead': 'Nenhum destes documentos está ainda em vigor.',
    'policy.noneBody':
      'Um documento só é publicado quando o proprietário da plataforma tiver respondido às perguntas nele contidas a que só ele pode responder, como que lei se aplica e quem é responsável pelos seus dados. Até lá não está em vigor, e o rascunho não é mostrado.',
    'policy.inForceCount': 'Documentos em vigor: {count}',
    'policy.othersDraft': 'Os outros estão escritos e ainda não aprovados.',
    'policy.forEveryone': 'Para todos',
    'policy.forChild': 'Para crianças e os seus responsáveis',
    'policy.forTeacher': 'Para professores',
    'policy.forInstitution': 'Para instituições',
    'policy.notYet': 'Ainda não está em vigor',
    'policy.versionNo': 'Versão: {number}',
    'policy.inForceFrom': 'Em vigor desde: {date}',
    'policy.mustAgree':
      'Ser-lhe-á pedido que concorde com ele, e o momento em que concorda é guardado.',
    'policy.noSign': 'É para ler. Não há nada com que concordar.',
    'policy.concern':
      'Uma preocupação com o comportamento de alguém, ou com a segurança de uma criança, não é uma pergunta sobre uma política. Chega a uma pessoa.',
    'policy.draftBody':
      'Este documento está escrito, mas nenhuma versão foi aprovada, por isso não há aqui nada para ler nem para aceitar. Um rascunho não é mostrado, porque ainda pode mudar. Nada aqui pede a sua concordância até que uma versão seja aprovada.',
    'policy.changed': 'O que mudou nesta versão: {note}',
    'policy.asWritten': 'O documento é mostrado na língua em que foi escrito.',
    'policy.agreeTitle': 'A sua concordância',
    'policy.agreeSignIn':
      'Este documento pede a sua concordância, e o momento em que a dá é guardado com a sua conta. Inicie sessão primeiro.',
    'policy.agreeSignInDo': 'Iniciar sessão para concordar',
    'policy.agreeNote':
      'Concordar regista que leu esta versão e que a aceita. A versão e o momento são guardados com a sua conta.',
    'policy.agreeDo': 'Concordo com esta versão',
    'policy.agreed': 'Concordou com esta versão em: {date}',
    'policy.agreedWhere': 'Aquilo com que concordou está listado na página da sua conta.',
    'policy.agreedNewer':
      'Foi publicada uma versão mais recente enquanto esta página estava aberta, e a sua concordância ficou registada para essa. Esta página mostra-a agora. Leia-a.',
    'policy.waitingCount': 'Documentos à espera da sua concordância: {count}',
    'policy.whyChanged':
      'Este documento mudou depois de esta página ser aberta, por isso nada foi registado. Volte a lê-lo antes de concordar.',
    'policy.agreeFailed': 'Não foi possível registar a sua concordância. Nada foi alterado.',
    'policy.agreeUnsure':
      'Não conseguimos confirmar que a sua concordância ficou registada. Abra esta página de novo para ver.',
    'policy.noticeChanged': 'Documentos que mudaram depois da sua concordância: {count}',
    'policy.noticeOpen': 'Ler o que mudou',
    'policy.noticeDismiss': 'Ocultar este aviso',
  },
  sw: {
    'policy.lede':
      'Unachokubali unapojifunza au kufundisha hapa, kinachofanywa na data yako, na kinachotokea jambo likienda vibaya.',
    'policy.kept':
      'Kila toleo la hati huhifadhiwa. Mabadiliko ni toleo jipya linaloanza kutumika tarehe fulani, si marekebisho ya toleo la zamani, na pale linapohitaji ukubali wako unaulizwa tena.',
    'policy.unread':
      'Sera hazikuweza kusomwa sasa hivi. Hii haimaanishi kwamba hakuna sera. Jaribu tena baada ya muda mfupi.',
    'policy.none': 'Bado hakuna sera iliyoandikwa.',
    'policy.noneLead': 'Hakuna hati kati ya hizi inayotumika bado.',
    'policy.noneBody':
      'Hati huchapishwa tu baada ya mmiliki wa jukwaa kujibu maswali yaliyomo ambayo ni yeye pekee anayeweza kuyajibu, kama vile sheria ipi inatumika na nani anawajibika kwa data yako. Hadi hapo haitumiki, na rasimu yake haionyeshwi.',
    'policy.inForceCount': 'Hati zinazotumika: {count}',
    'policy.othersDraft': 'Nyingine zimeandikwa na bado hazijaidhinishwa.',
    'policy.forEveryone': 'Kwa kila mtu',
    'policy.forChild': 'Kwa watoto na walezi wao',
    'policy.forTeacher': 'Kwa walimu',
    'policy.forInstitution': 'Kwa taasisi',
    'policy.notYet': 'Bado haitumiki',
    'policy.versionNo': 'Toleo: {number}',
    'policy.inForceFrom': 'Inatumika kuanzia: {date}',
    'policy.mustAgree': 'Utaombwa kuikubali, na wakati unaokubali huhifadhiwa.',
    'policy.noSign': 'Ni ya kusoma. Hakuna cha kukubali.',
    'policy.concern':
      'Wasiwasi kuhusu tabia ya mtu, au kuhusu usalama wa mtoto, si swali kuhusu sera. Hupelekwa kwa mtu.',
    'policy.draftBody':
      'Hati hii imeandikwa, lakini hakuna toleo lake lililoidhinishwa, kwa hiyo hakuna cha kusoma wala cha kukubali hapa. Rasimu haionyeshwi kwa sababu bado inaweza kubadilika. Hakuna kitu hapa kinachoomba ukubali wako hadi toleo liidhinishwe.',
    'policy.changed': 'Kilichobadilika katika toleo hili: {note}',
    'policy.asWritten': 'Hati inaonyeshwa katika lugha iliyoandikwa.',
    'policy.agreeTitle': 'Ukubali wako',
    'policy.agreeSignIn':
      'Hati hii inaomba ukubali wako, na wakati unaoutoa huhifadhiwa pamoja na akaunti yako. Ingia kwanza.',
    'policy.agreeSignInDo': 'Ingia ili kukubali',
    'policy.agreeNote':
      'Kukubali kunarekodi kwamba umesoma toleo hili na unalikubali. Toleo na wakati huhifadhiwa pamoja na akaunti yako.',
    'policy.agreeDo': 'Nakubali toleo hili',
    'policy.agreed': 'Ulikubali toleo hili: {date}',
    'policy.agreedWhere': 'Ulichokubali kimeorodheshwa kwenye ukurasa wa akaunti yako.',
    'policy.agreedNewer':
      'Toleo jipya zaidi lilichapishwa ukurasa huu ukiwa wazi, na ukubali wako ulirekodiwa kwa toleo hilo. Ukurasa huu sasa unalionyesha. Lisome.',
    'policy.waitingCount': 'Hati zinazosubiri ukubali wako: {count}',
    'policy.whyChanged':
      'Hati hii ilibadilika baada ya ukurasa huu kufunguliwa, kwa hiyo hakuna kilichorekodiwa. Isome tena kabla ya kukubali.',
    'policy.agreeFailed': 'Ukubali wako haukuweza kurekodiwa. Hakuna kilichobadilika.',
    'policy.agreeUnsure':
      'Hatukuweza kuthibitisha kwamba ukubali wako ulirekodiwa. Fungua ukurasa huu tena ili kuona.',
    'policy.noticeChanged': 'Hati zilizobadilika baada ya wewe kuzikubali: {count}',
    'policy.noticeOpen': 'Soma kilichobadilika',
    'policy.noticeDismiss': 'Ficha taarifa hii',
  },
  af: {
    'policy.lede':
      'Waartoe jy instem wanneer jy hier leer of onderrig gee, wat met jou data gedoen word, en wat gebeur wanneer iets verkeerd loop.',
    'policy.kept':
      'Elke weergawe van ’n dokument word bewaar. ’n Verandering is ’n nuwe weergawe wat op ’n datum van krag word, nooit ’n wysiging aan ’n oue nie, en waar dit jou instemming nodig het, word jy weer gevra.',
    'policy.unread':
      'Die beleide kon nie nou gelees word nie. Dit beteken nie dat daar geen is nie. Probeer oor ’n oomblik weer.',
    'policy.none': 'Geen beleid is nog geskryf nie.',
    'policy.noneLead': 'Nie een hiervan is nog van krag nie.',
    'policy.noneBody':
      '’n Dokument word eers gepubliseer wanneer die eienaar van die platform die vrae daarin beantwoord het wat net die eienaar kan beantwoord, soos watter reg geld en wie vir jou data verantwoordelik is. Tot dan is dit nie van krag nie, en ’n konsep word nie gewys nie.',
    'policy.inForceCount': 'Dokumente van krag: {count}',
    'policy.othersDraft': 'Die ander is geskryf en nog nie goedgekeur nie.',
    'policy.forEveryone': 'Vir almal',
    'policy.forChild': 'Vir kinders en hul voogde',
    'policy.forTeacher': 'Vir onderwysers',
    'policy.forInstitution': 'Vir instellings',
    'policy.notYet': 'Nog nie van krag nie',
    'policy.versionNo': 'Weergawe: {number}',
    'policy.inForceFrom': 'Van krag vanaf: {date}',
    'policy.mustAgree':
      'Jy sal gevra word om daartoe in te stem, en die tyd waarop jy instem word bewaar.',
    'policy.noSign': 'Dit is om te lees. Daar is niks om toe in te stem nie.',
    'policy.concern':
      '’n Kommer oor hoe iemand hom of haar gedra het, of oor ’n kind se veiligheid, is nie ’n vraag oor ’n beleid nie. Dit gaan na ’n mens.',
    'policy.draftBody':
      'Hierdie dokument is geskryf, maar geen weergawe daarvan is goedgekeur nie, dus is hier niks om te lees of toe in te stem nie. ’n Konsep word nie gewys nie, omdat dit nog kan verander. Niks hier vra jou instemming totdat ’n weergawe goedgekeur is nie.',
    'policy.changed': 'Wat in hierdie weergawe verander het: {note}',
    'policy.asWritten': 'Die dokument word gewys in die taal waarin dit geskryf is.',
    'policy.agreeTitle': 'Jou instemming',
    'policy.agreeSignIn':
      'Hierdie dokument vra jou instemming, en die tyd waarop jy dit gee word saam met jou rekening bewaar. Meld eers aan.',
    'policy.agreeSignInDo': 'Meld aan om in te stem',
    'policy.agreeNote':
      'Deur in te stem word aangeteken dat jy hierdie weergawe gelees het en dit aanvaar. Die weergawe en die tyd word saam met jou rekening bewaar.',
    'policy.agreeDo': 'Stem in tot hierdie weergawe',
    'policy.agreed': 'Jy het tot hierdie weergawe ingestem op: {date}',
    'policy.agreedWhere': 'Waartoe jy ingestem het, word op jou rekeningbladsy gelys.',
    'policy.agreedNewer':
      '’n Nuwer weergawe is gepubliseer terwyl hierdie bladsy oop was, en jou instemming is vir daardie een aangeteken. Hierdie bladsy wys dit nou. Lees dit.',
    'policy.waitingCount': 'Dokumente wat op jou instemming wag: {count}',
    'policy.whyChanged':
      'Hierdie dokument het verander nadat hierdie bladsy oopgemaak is, dus is niks aangeteken nie. Lees dit weer voordat jy instem.',
    'policy.agreeFailed': 'Jou instemming kon nie aangeteken word nie. Niks is verander nie.',
    'policy.agreeUnsure':
      'Ons kon nie bevestig dat jou instemming aangeteken is nie. Maak hierdie bladsy weer oop om te sien.',
    'policy.noticeChanged': 'Dokumente wat verander het nadat jy daartoe ingestem het: {count}',
    'policy.noticeOpen': 'Lees wat verander het',
    'policy.noticeDismiss': 'Versteek hierdie kennisgewing',
  },
  'zh-hans': {
    'policy.lede': '您在这里学习或教学时同意什么、您的数据如何处理，以及出现问题时会怎样。',
    'policy.kept': '文件的每个版本都会保留。更改是在某个日期生效的新版本，而不是对旧版本的修改；如果需要您的同意，会再次向您询问。',
    'policy.unread': '暂时无法读取政策。这并不表示没有政策。请稍后再试。',
    'policy.none': '尚未编写任何政策。',
    'policy.noneLead': '这些文件都尚未生效。',
    'policy.noneBody': '只有当平台所有者回答了文件中只有其本人才能回答的问题（例如适用哪部法律、谁对您的数据负责）之后，文件才会发布。在此之前它不生效，草稿也不会显示。',
    'policy.inForceCount': '已生效的文件：{count}',
    'policy.othersDraft': '其余文件已写好，尚未批准。',
    'policy.forEveryone': '适用于所有人',
    'policy.forChild': '适用于儿童及其监护人',
    'policy.forTeacher': '适用于教师',
    'policy.forInstitution': '适用于机构',
    'policy.notYet': '尚未生效',
    'policy.versionNo': '版本：{number}',
    'policy.inForceFrom': '生效日期：{date}',
    'policy.mustAgree': '您将被要求同意此文件，您同意的时间会被保留。',
    'policy.noSign': '仅供阅读，无需同意。',
    'policy.concern': '对某人行为或儿童安全的担忧不是政策问题，而是会交由专人处理。',
    'policy.draftBody':
      '此文件已写好，但尚无任何版本获得批准，因此这里没有可阅读或可同意的内容。草稿不会显示，因为它仍可能更改。在有版本获得批准之前，这里不会要求您同意任何内容。',
    'policy.changed': '此版本的更改：{note}',
    'policy.asWritten': '文件以其编写时的语言显示。',
    'policy.agreeTitle': '您的同意',
    'policy.agreeSignIn': '此文件需要您的同意，您同意的时间会随您的账户保留。请先登录。',
    'policy.agreeSignInDo': '登录以同意',
    'policy.agreeNote': '同意即记录您已阅读并接受此版本。版本和时间会随您的账户保留。',
    'policy.agreeDo': '同意此版本',
    'policy.agreed': '您同意此版本的时间：{date}',
    'policy.agreedWhere': '您已同意的内容列在您的账户页面上。',
    'policy.agreedNewer': '此页面打开期间发布了更新的版本，您的同意被记录在那个版本上。本页现在显示的就是它。请阅读。',
    'policy.waitingCount': '等待您同意的文件：{count}',
    'policy.whyChanged': '此文件在本页打开后发生了更改，因此没有记录任何内容。请重新阅读后再同意。',
    'policy.agreeFailed': '无法记录您的同意。没有任何更改。',
    'policy.agreeUnsure': '我们无法确认您的同意是否已记录。请重新打开本页查看。',
    'policy.noticeChanged': '在您同意之后发生更改的文件：{count}',
    'policy.noticeOpen': '阅读更改内容',
    'policy.noticeDismiss': '隐藏此通知',
  },
  'zh-hant': {
    'policy.lede': '您在這裡學習或教學時同意什麼、您的資料如何處理，以及出現問題時會怎樣。',
    'policy.kept': '文件的每個版本都會保留。變更是在某個日期生效的新版本，而不是對舊版本的修改；如果需要您的同意，會再次向您詢問。',
    'policy.unread': '暫時無法讀取政策。這並不表示沒有政策。請稍後再試。',
    'policy.none': '尚未撰寫任何政策。',
    'policy.noneLead': '這些文件都尚未生效。',
    'policy.noneBody': '只有當平台擁有者回答了文件中只有其本人才能回答的問題（例如適用哪部法律、誰對您的資料負責）之後，文件才會發布。在此之前它不生效，草稿也不會顯示。',
    'policy.inForceCount': '已生效的文件：{count}',
    'policy.othersDraft': '其餘文件已寫好，尚未核准。',
    'policy.forEveryone': '適用於所有人',
    'policy.forChild': '適用於兒童及其監護人',
    'policy.forTeacher': '適用於教師',
    'policy.forInstitution': '適用於機構',
    'policy.notYet': '尚未生效',
    'policy.versionNo': '版本：{number}',
    'policy.inForceFrom': '生效日期：{date}',
    'policy.mustAgree': '您將被要求同意此文件，您同意的時間會被保留。',
    'policy.noSign': '僅供閱讀，無需同意。',
    'policy.concern': '對某人行為或兒童安全的擔憂不是政策問題，而是會交由專人處理。',
    'policy.draftBody':
      '此文件已寫好，但尚無任何版本獲得核准，因此這裡沒有可閱讀或可同意的內容。草稿不會顯示，因為它仍可能變更。在有版本獲得核准之前，這裡不會要求您同意任何內容。',
    'policy.changed': '此版本的變更：{note}',
    'policy.asWritten': '文件以其撰寫時的語言顯示。',
    'policy.agreeTitle': '您的同意',
    'policy.agreeSignIn': '此文件需要您的同意，您同意的時間會隨您的帳號保留。請先登入。',
    'policy.agreeSignInDo': '登入以同意',
    'policy.agreeNote': '同意即記錄您已閱讀並接受此版本。版本和時間會隨您的帳號保留。',
    'policy.agreeDo': '同意此版本',
    'policy.agreed': '您同意此版本的時間：{date}',
    'policy.agreedWhere': '您已同意的內容列在您的帳號頁面上。',
    'policy.agreedNewer': '此頁面開啟期間發布了更新的版本，您的同意被記錄在那個版本上。本頁現在顯示的就是它。請閱讀。',
    'policy.waitingCount': '等待您同意的文件：{count}',
    'policy.whyChanged': '此文件在本頁開啟後發生了變更，因此沒有記錄任何內容。請重新閱讀後再同意。',
    'policy.agreeFailed': '無法記錄您的同意。沒有任何變更。',
    'policy.agreeUnsure': '我們無法確認您的同意是否已記錄。請重新開啟本頁查看。',
    'policy.noticeChanged': '在您同意之後發生變更的文件：{count}',
    'policy.noticeOpen': '閱讀變更內容',
    'policy.noticeDismiss': '隱藏此通知',
  },
  vi: {
    'policy.lede':
      'Những gì bạn đồng ý khi học hoặc dạy tại đây, dữ liệu của bạn được xử lý ra sao, và điều gì xảy ra khi có sự cố.',
    'policy.kept':
      'Mọi phiên bản của một văn bản đều được lưu giữ. Thay đổi là một phiên bản mới có hiệu lực từ một ngày nhất định, không phải là sửa phiên bản cũ, và khi cần sự đồng ý của bạn thì bạn sẽ được hỏi lại.',
    'policy.unread':
      'Hiện chưa đọc được các chính sách. Điều này không có nghĩa là không có chính sách nào. Hãy thử lại sau giây lát.',
    'policy.none': 'Chưa có chính sách nào được soạn.',
    'policy.noneLead': 'Chưa có văn bản nào trong số này có hiệu lực.',
    'policy.noneBody':
      'Một văn bản chỉ được công bố khi chủ sở hữu nền tảng đã trả lời những câu hỏi trong đó mà chỉ họ mới trả lời được, chẳng hạn luật nào được áp dụng và ai chịu trách nhiệm về dữ liệu của bạn. Cho đến lúc đó văn bản chưa có hiệu lực, và bản nháp không được hiển thị.',
    'policy.inForceCount': 'Văn bản đang có hiệu lực: {count}',
    'policy.othersDraft': 'Các văn bản còn lại đã được soạn và chưa được phê duyệt.',
    'policy.forEveryone': 'Dành cho mọi người',
    'policy.forChild': 'Dành cho trẻ em và người giám hộ',
    'policy.forTeacher': 'Dành cho giáo viên',
    'policy.forInstitution': 'Dành cho tổ chức',
    'policy.notYet': 'Chưa có hiệu lực',
    'policy.versionNo': 'Phiên bản: {number}',
    'policy.inForceFrom': 'Có hiệu lực từ: {date}',
    'policy.mustAgree':
      'Bạn sẽ được yêu cầu đồng ý với văn bản này, và thời điểm bạn đồng ý được lưu lại.',
    'policy.noSign': 'Văn bản này để đọc. Không có gì cần đồng ý.',
    'policy.concern':
      'Mối lo về cách cư xử của ai đó, hoặc về sự an toàn của một đứa trẻ, không phải là câu hỏi về chính sách. Việc đó được chuyển đến một con người.',
    'policy.draftBody':
      'Văn bản này đã được soạn, nhưng chưa có phiên bản nào được phê duyệt, nên ở đây không có gì để đọc hay để đồng ý. Bản nháp không được hiển thị vì vẫn có thể thay đổi. Không có gì ở đây yêu cầu sự đồng ý của bạn cho đến khi một phiên bản được phê duyệt.',
    'policy.changed': 'Những gì thay đổi trong phiên bản này: {note}',
    'policy.asWritten': 'Văn bản được hiển thị bằng ngôn ngữ mà nó được soạn.',
    'policy.agreeTitle': 'Sự đồng ý của bạn',
    'policy.agreeSignIn':
      'Văn bản này yêu cầu sự đồng ý của bạn, và thời điểm bạn đồng ý được lưu cùng tài khoản của bạn. Hãy đăng nhập trước.',
    'policy.agreeSignInDo': 'Đăng nhập để đồng ý',
    'policy.agreeNote':
      'Đồng ý là ghi nhận rằng bạn đã đọc phiên bản này và chấp nhận nó. Phiên bản và thời điểm được lưu cùng tài khoản của bạn.',
    'policy.agreeDo': 'Đồng ý với phiên bản này',
    'policy.agreed': 'Bạn đã đồng ý với phiên bản này vào: {date}',
    'policy.agreedWhere': 'Những gì bạn đã đồng ý được liệt kê trên trang tài khoản của bạn.',
    'policy.agreedNewer':
      'Một phiên bản mới hơn đã được công bố trong khi trang này đang mở, và sự đồng ý của bạn được ghi nhận cho phiên bản đó. Trang này hiện đang hiển thị nó. Hãy đọc.',
    'policy.waitingCount': 'Văn bản đang chờ bạn đồng ý: {count}',
    'policy.whyChanged':
      'Văn bản này đã thay đổi sau khi trang này được mở, nên không có gì được ghi nhận. Hãy đọc lại trước khi đồng ý.',
    'policy.agreeFailed': 'Không ghi nhận được sự đồng ý của bạn. Không có gì thay đổi.',
    'policy.agreeUnsure':
      'Chúng tôi chưa xác nhận được rằng sự đồng ý của bạn đã được ghi nhận. Hãy mở lại trang này để xem.',
    'policy.noticeChanged': 'Văn bản đã thay đổi sau khi bạn đồng ý: {count}',
    'policy.noticeOpen': 'Đọc những gì đã thay đổi',
    'policy.noticeDismiss': 'Ẩn thông báo này',
  },
  th: {
    'policy.lede':
      'สิ่งที่คุณยอมรับเมื่อเรียนหรือสอนที่นี่ สิ่งที่ทำกับข้อมูลของคุณ และสิ่งที่เกิดขึ้นเมื่อมีบางอย่างผิดพลาด',
    'policy.kept':
      'เอกสารทุกฉบับถูกเก็บไว้ทุกฉบับแก้ไข การเปลี่ยนแปลงคือฉบับใหม่ที่มีผลตั้งแต่วันที่กำหนด ไม่ใช่การแก้ฉบับเก่า และหากต้องการการยอมรับจากคุณ คุณจะถูกถามอีกครั้ง',
    'policy.unread':
      'ขณะนี้ยังอ่านนโยบายไม่ได้ ซึ่งไม่ได้หมายความว่าไม่มีนโยบาย โปรดลองอีกครั้งในอีกสักครู่',
    'policy.none': 'ยังไม่มีการเขียนนโยบายใด',
    'policy.noneLead': 'เอกสารเหล่านี้ยังไม่มีฉบับใดมีผลบังคับใช้',
    'policy.noneBody':
      'เอกสารจะเผยแพร่ก็ต่อเมื่อเจ้าของแพลตฟอร์มได้ตอบคำถามในเอกสารที่มีเพียงเจ้าของเท่านั้นที่ตอบได้ เช่น ใช้กฎหมายใด และใครรับผิดชอบข้อมูลของคุณ จนกว่าจะถึงตอนนั้นเอกสารยังไม่มีผล และจะไม่แสดงฉบับร่าง',
    'policy.inForceCount': 'เอกสารที่มีผลบังคับใช้: {count}',
    'policy.othersDraft': 'ฉบับอื่นเขียนแล้วและยังไม่ได้รับอนุมัติ',
    'policy.forEveryone': 'สำหรับทุกคน',
    'policy.forChild': 'สำหรับเด็กและผู้ปกครอง',
    'policy.forTeacher': 'สำหรับครู',
    'policy.forInstitution': 'สำหรับสถาบัน',
    'policy.notYet': 'ยังไม่มีผลบังคับใช้',
    'policy.versionNo': 'ฉบับที่: {number}',
    'policy.inForceFrom': 'มีผลตั้งแต่: {date}',
    'policy.mustAgree': 'คุณจะถูกขอให้ยอมรับเอกสารนี้ และเวลาที่คุณยอมรับจะถูกเก็บไว้',
    'policy.noSign': 'เอกสารนี้มีไว้อ่าน ไม่มีอะไรต้องยอมรับ',
    'policy.concern':
      'ความกังวลเกี่ยวกับพฤติกรรมของใครบางคน หรือเกี่ยวกับความปลอดภัยของเด็ก ไม่ใช่คำถามเรื่องนโยบาย เรื่องนั้นจะส่งถึงคน',
    'policy.draftBody':
      'เอกสารนี้เขียนแล้ว แต่ยังไม่มีฉบับใดได้รับอนุมัติ จึงไม่มีอะไรให้อ่านหรือยอมรับที่นี่ ฉบับร่างจะไม่แสดง เพราะยังเปลี่ยนแปลงได้ ไม่มีสิ่งใดที่นี่ขอการยอมรับจากคุณจนกว่าจะมีฉบับที่ได้รับอนุมัติ',
    'policy.changed': 'สิ่งที่เปลี่ยนในฉบับนี้: {note}',
    'policy.asWritten': 'เอกสารแสดงในภาษาที่ใช้เขียน',
    'policy.agreeTitle': 'การยอมรับของคุณ',
    'policy.agreeSignIn':
      'เอกสารนี้ขอการยอมรับจากคุณ และเวลาที่คุณยอมรับจะถูกเก็บไว้กับบัญชีของคุณ โปรดลงชื่อเข้าใช้ก่อน',
    'policy.agreeSignInDo': 'ลงชื่อเข้าใช้เพื่อยอมรับ',
    'policy.agreeNote':
      'การยอมรับเป็นการบันทึกว่าคุณได้อ่านฉบับนี้และยอมรับแล้ว ฉบับและเวลาจะถูกเก็บไว้กับบัญชีของคุณ',
    'policy.agreeDo': 'ยอมรับฉบับนี้',
    'policy.agreed': 'คุณยอมรับฉบับนี้เมื่อ: {date}',
    'policy.agreedWhere': 'สิ่งที่คุณยอมรับแล้วแสดงไว้ในหน้าบัญชีของคุณ',
    'policy.agreedNewer':
      'มีการเผยแพร่ฉบับใหม่กว่าขณะที่หน้านี้เปิดอยู่ และการยอมรับของคุณถูกบันทึกไว้กับฉบับนั้น หน้านี้กำลังแสดงฉบับนั้นอยู่ โปรดอ่าน',
    'policy.waitingCount': 'เอกสารที่รอการยอมรับจากคุณ: {count}',
    'policy.whyChanged':
      'เอกสารนี้เปลี่ยนไปหลังจากเปิดหน้านี้ จึงไม่มีการบันทึกใด โปรดอ่านอีกครั้งก่อนยอมรับ',
    'policy.agreeFailed': 'บันทึกการยอมรับของคุณไม่ได้ ไม่มีอะไรเปลี่ยนแปลง',
    'policy.agreeUnsure':
      'เรายืนยันไม่ได้ว่าการยอมรับของคุณถูกบันทึกแล้ว โปรดเปิดหน้านี้อีกครั้งเพื่อดู',
    'policy.noticeChanged': 'เอกสารที่เปลี่ยนไปหลังจากคุณยอมรับ: {count}',
    'policy.noticeOpen': 'อ่านสิ่งที่เปลี่ยนไป',
    'policy.noticeDismiss': 'ซ่อนประกาศนี้',
  },
  fil: {
    'policy.lede':
      'Ang sinasang-ayunan mo kapag nag-aaral o nagtuturo ka rito, ang ginagawa sa iyong datos, at ang nangyayari kapag may nagkamali.',
    'policy.kept':
      'Iniingatan ang bawat bersyon ng isang dokumento. Ang pagbabago ay isang bagong bersyon na nagkakabisa sa isang petsa, hindi pag-edit sa luma, at kung kailangan nito ang pagsang-ayon mo ay tatanungin kang muli.',
    'policy.unread':
      'Hindi mabasa ang mga patakaran sa ngayon. Hindi ito nangangahulugang walang patakaran. Subukang muli maya-maya.',
    'policy.none': 'Wala pang naisusulat na patakaran.',
    'policy.noneLead': 'Wala pa sa mga ito ang may bisa.',
    'policy.noneBody':
      'Inilalathala lamang ang isang dokumento kapag nasagot na ng may-ari ng plataporma ang mga tanong dito na siya lamang ang makasasagot, gaya ng kung aling batas ang umiiral at kung sino ang may pananagutan sa iyong datos. Hanggang doon ay wala itong bisa, at hindi ipinapakita ang burador.',
    'policy.inForceCount': 'Mga dokumentong may bisa: {count}',
    'policy.othersDraft': 'Ang iba ay naisulat na at hindi pa naaaprubahan.',
    'policy.forEveryone': 'Para sa lahat',
    'policy.forChild': 'Para sa mga bata at kanilang tagapag-alaga',
    'policy.forTeacher': 'Para sa mga guro',
    'policy.forInstitution': 'Para sa mga institusyon',
    'policy.notYet': 'Wala pang bisa',
    'policy.versionNo': 'Bersyon: {number}',
    'policy.inForceFrom': 'May bisa mula: {date}',
    'policy.mustAgree':
      'Hihilingin sa iyong sumang-ayon dito, at iniingatan ang oras ng pagsang-ayon mo.',
    'policy.noSign': 'Para ito sa pagbabasa. Walang kailangang sang-ayunan.',
    'policy.concern':
      'Ang pag-aalala tungkol sa inasal ng isang tao, o sa kaligtasan ng isang bata, ay hindi tanong tungkol sa patakaran. Napupunta ito sa isang tao.',
    'policy.draftBody':
      'Naisulat na ang dokumentong ito, ngunit wala pang bersyon nito ang naaprubahan, kaya walang mababasa o masasang-ayunan dito. Hindi ipinapakita ang burador dahil maaari pa itong magbago. Walang anuman dito ang humihingi ng pagsang-ayon mo hanggang may maaprubahang bersyon.',
    'policy.changed': 'Ang nagbago sa bersyong ito: {note}',
    'policy.asWritten': 'Ipinapakita ang dokumento sa wikang pinagsulatan nito.',
    'policy.agreeTitle': 'Ang iyong pagsang-ayon',
    'policy.agreeSignIn':
      'Hinihingi ng dokumentong ito ang pagsang-ayon mo, at iniingatan kasama ng iyong account ang oras na ibinigay mo ito. Mag-sign in muna.',
    'policy.agreeSignInDo': 'Mag-sign in para sumang-ayon',
    'policy.agreeNote':
      'Ang pagsang-ayon ay nagtatala na nabasa mo ang bersyong ito at tinatanggap mo ito. Iniingatan kasama ng iyong account ang bersyon at ang oras.',
    'policy.agreeDo': 'Sumang-ayon sa bersyong ito',
    'policy.agreed': 'Sumang-ayon ka sa bersyong ito noong: {date}',
    'policy.agreedWhere': 'Nakalista sa pahina ng iyong account ang mga sinang-ayunan mo.',
    'policy.agreedNewer':
      'May mas bagong bersyong inilathala habang bukas ang pahinang ito, at naitala ang pagsang-ayon mo para sa bersyong iyon. Iyon na ang ipinapakita ng pahinang ito. Basahin ito.',
    'policy.waitingCount': 'Mga dokumentong naghihintay ng pagsang-ayon mo: {count}',
    'policy.whyChanged':
      'Nagbago ang dokumentong ito matapos buksan ang pahinang ito, kaya walang naitala. Basahin itong muli bago ka sumang-ayon.',
    'policy.agreeFailed': 'Hindi naitala ang pagsang-ayon mo. Walang nabago.',
    'policy.agreeUnsure':
      'Hindi namin matiyak na naitala ang pagsang-ayon mo. Buksang muli ang pahinang ito para makita.',
    'policy.noticeChanged': 'Mga dokumentong nagbago matapos kang sumang-ayon: {count}',
    'policy.noticeOpen': 'Basahin ang nagbago',
    'policy.noticeDismiss': 'Itago ang abisong ito',
  },
  uz: {
    'policy.lede':
      'Bu yerda oʻrganayotganda yoki oʻrgatayotganda nimaga rozi boʻlishingiz, maʼlumotlaringiz bilan nima qilinishi va biror narsa notoʻgʻri ketganda nima boʻlishi.',
    'policy.kept':
      'Hujjatning har bir versiyasi saqlanadi. Oʻzgarish — maʼlum sanadan kuchga kiradigan yangi versiya, eski versiyani tahrirlash emas, va roziligingiz kerak boʻlsa, sizdan qayta soʻraladi.',
    'policy.unread':
      'Siyosatlarni hozir oʻqib boʻlmadi. Bu ular yoʻq degani emas. Birozdan keyin qayta urinib koʻring.',
    'policy.none': 'Hali hech qanday siyosat yozilmagan.',
    'policy.noneLead': 'Bularning hech biri hali kuchga kirmagan.',
    'policy.noneBody':
      'Hujjat platforma egasi undagi faqat oʻzi javob bera oladigan savollarga javob berganidan keyingina eʼlon qilinadi, masalan qaysi qonun qoʻllanishi va maʼlumotlaringiz uchun kim javobgar ekani. Ungacha u kuchga kirmagan boʻladi va qoralamasi koʻrsatilmaydi.',
    'policy.inForceCount': 'Kuchdagi hujjatlar: {count}',
    'policy.othersDraft': 'Qolganlari yozilgan va hali tasdiqlanmagan.',
    'policy.forEveryone': 'Hamma uchun',
    'policy.forChild': 'Bolalar va ularning vasiylari uchun',
    'policy.forTeacher': 'Oʻqituvchilar uchun',
    'policy.forInstitution': 'Muassasalar uchun',
    'policy.notYet': 'Hali kuchga kirmagan',
    'policy.versionNo': 'Versiya: {number}',
    'policy.inForceFrom': 'Kuchga kirgan sana: {date}',
    'policy.mustAgree': 'Sizdan unga rozi boʻlish soʻraladi va rozilik bergan vaqtingiz saqlanadi.',
    'policy.noSign': 'Bu oʻqish uchun. Rozi boʻladigan narsa yoʻq.',
    'policy.concern':
      'Kimningdir xatti-harakati yoki bolaning xavfsizligi haqidagi xavotir siyosat haqidagi savol emas. U insonga yetkaziladi.',
    'policy.draftBody':
      'Bu hujjat yozilgan, lekin uning hech bir versiyasi tasdiqlanmagan, shuning uchun bu yerda oʻqish yoki rozi boʻlish uchun hech narsa yoʻq. Qoralama koʻrsatilmaydi, chunki u hali oʻzgarishi mumkin. Versiya tasdiqlanmaguncha bu yerda hech narsa roziligingizni soʻramaydi.',
    'policy.changed': 'Bu versiyada nima oʻzgardi: {note}',
    'policy.asWritten': 'Hujjat yozilgan tilida koʻrsatiladi.',
    'policy.agreeTitle': 'Sizning roziligingiz',
    'policy.agreeSignIn':
      'Bu hujjat roziligingizni soʻraydi va rozilik bergan vaqtingiz hisobingiz bilan birga saqlanadi. Avval tizimga kiring.',
    'policy.agreeSignInDo': 'Rozi boʻlish uchun kiring',
    'policy.agreeNote':
      'Rozi boʻlish bu versiyani oʻqiganingiz va qabul qilganingizni qayd etadi. Versiya va vaqt hisobingiz bilan birga saqlanadi.',
    'policy.agreeDo': 'Bu versiyaga roziman',
    'policy.agreed': 'Siz bu versiyaga rozi boʻlgan vaqt: {date}',
    'policy.agreedWhere': 'Rozi boʻlganlaringiz hisob sahifangizda koʻrsatilgan.',
    'policy.agreedNewer':
      'Bu sahifa ochiq turganda yangiroq versiya eʼlon qilindi va roziligingiz oʻsha versiya uchun qayd etildi. Bu sahifa endi uni koʻrsatmoqda. Uni oʻqing.',
    'policy.waitingCount': 'Roziligingizni kutayotgan hujjatlar: {count}',
    'policy.whyChanged':
      'Bu hujjat sahifa ochilgandan keyin oʻzgardi, shuning uchun hech narsa qayd etilmadi. Rozi boʻlishdan oldin uni qayta oʻqing.',
    'policy.agreeFailed': 'Roziligingizni qayd etib boʻlmadi. Hech narsa oʻzgarmadi.',
    'policy.agreeUnsure':
      'Roziligingiz qayd etilganini tasdiqlay olmadik. Koʻrish uchun bu sahifani qayta oching.',
    'policy.noticeChanged': 'Roziligingizdan keyin oʻzgargan hujjatlar: {count}',
    'policy.noticeOpen': 'Nima oʻzgarganini oʻqing',
    'policy.noticeDismiss': 'Bu bildirishnomani yashirish',
  },
  kk: {
    'policy.lede':
      'Осында оқығанда немесе сабақ бергенде неге келісетініңіз, деректеріңізбен не істелетіні және бірдеңе дұрыс болмағанда не болатыны.',
    'policy.kept':
      'Құжаттың әр нұсқасы сақталады. Өзгеріс — белгілі бір күннен күшіне енетін жаңа нұсқа, ескі нұсқаны түзету емес, ал келісіміңіз қажет болса, сізден қайта сұралады.',
    'policy.unread':
      'Саясаттарды қазір оқу мүмкін болмады. Бұл олар жоқ дегенді білдірмейді. Сәлден кейін қайталап көріңіз.',
    'policy.none': 'Әзірге ешбір саясат жазылмаған.',
    'policy.noneLead': 'Бұлардың ешқайсысы әлі күшіне енген жоқ.',
    'policy.noneBody':
      'Құжат платформа иесі ондағы тек өзі жауап бере алатын сұрақтарға жауап бергенде ғана жарияланады, мысалы қай заң қолданылатыны және деректеріңізге кім жауапты екені. Оған дейін ол күшіне енбейді, ал жобасы көрсетілмейді.',
    'policy.inForceCount': 'Күшіндегі құжаттар: {count}',
    'policy.othersDraft': 'Қалғандары жазылған, әлі бекітілмеген.',
    'policy.forEveryone': 'Барлығына арналған',
    'policy.forChild': 'Балалар мен олардың қамқоршыларына арналған',
    'policy.forTeacher': 'Мұғалімдерге арналған',
    'policy.forInstitution': 'Мекемелерге арналған',
    'policy.notYet': 'Әлі күшіне енген жоқ',
    'policy.versionNo': 'Нұсқа: {number}',
    'policy.inForceFrom': 'Күшіне енген күні: {date}',
    'policy.mustAgree': 'Сізден оған келісу сұралады, және келіскен уақытыңыз сақталады.',
    'policy.noSign': 'Бұл оқуға арналған. Келісетін ештеңе жоқ.',
    'policy.concern':
      'Біреудің мінез-құлқына немесе баланың қауіпсіздігіне қатысты алаңдаушылық саясат туралы сұрақ емес. Ол адамға жеткізіледі.',
    'policy.draftBody':
      'Бұл құжат жазылған, бірақ оның ешбір нұсқасы бекітілмеген, сондықтан мұнда оқитын немесе келісетін ештеңе жоқ. Жоба көрсетілмейді, өйткені ол әлі өзгеруі мүмкін. Нұсқа бекітілгенге дейін мұнда ештеңе сіздің келісіміңізді сұрамайды.',
    'policy.changed': 'Осы нұсқада не өзгерді: {note}',
    'policy.asWritten': 'Құжат жазылған тілінде көрсетіледі.',
    'policy.agreeTitle': 'Сіздің келісіміңіз',
    'policy.agreeSignIn':
      'Бұл құжат келісіміңізді сұрайды, және келісім берген уақытыңыз тіркелгіңізбен бірге сақталады. Алдымен кіріңіз.',
    'policy.agreeSignInDo': 'Келісу үшін кіріңіз',
    'policy.agreeNote':
      'Келісу осы нұсқаны оқығаныңызды және қабылдағаныңызды тіркейді. Нұсқа мен уақыт тіркелгіңізбен бірге сақталады.',
    'policy.agreeDo': 'Осы нұсқаға келісемін',
    'policy.agreed': 'Осы нұсқаға келіскен уақытыңыз: {date}',
    'policy.agreedWhere': 'Келіскендеріңіз тіркелгі бетіңізде тізімделген.',
    'policy.agreedNewer':
      'Бұл бет ашық тұрғанда жаңарақ нұсқа жарияланды, және келісіміңіз сол нұсқаға тіркелді. Бұл бет енді соны көрсетіп тұр. Оны оқыңыз.',
    'policy.waitingCount': 'Келісіміңізді күтіп тұрған құжаттар: {count}',
    'policy.whyChanged':
      'Бұл құжат бет ашылғаннан кейін өзгерді, сондықтан ештеңе тіркелмеді. Келіспес бұрын оны қайта оқыңыз.',
    'policy.agreeFailed': 'Келісіміңізді тіркеу мүмкін болмады. Ештеңе өзгерген жоқ.',
    'policy.agreeUnsure':
      'Келісіміңіздің тіркелгенін растай алмадық. Көру үшін бұл бетті қайта ашыңыз.',
    'policy.noticeChanged': 'Келісіміңізден кейін өзгерген құжаттар: {count}',
    'policy.noticeOpen': 'Не өзгергенін оқыңыз',
    'policy.noticeDismiss': 'Бұл хабарламаны жасыру',
  },
  az: {
    'policy.lede':
      'Burada öyrənərkən və ya dərs deyərkən nə ilə razılaşdığınız, məlumatlarınızla nə edildiyi və nəsə səhv getdikdə nə baş verdiyi.',
    'policy.kept':
      'Sənədin hər versiyası saxlanılır. Dəyişiklik müəyyən tarixdən qüvvəyə minən yeni versiyadır, köhnə versiyanın düzəlişi deyil, razılığınız lazım olduqda isə sizdən yenidən soruşulur.',
    'policy.unread':
      'Siyasətləri indi oxumaq mümkün olmadı. Bu, onların olmadığı demək deyil. Bir azdan yenidən cəhd edin.',
    'policy.none': 'Hələ heç bir siyasət yazılmayıb.',
    'policy.noneLead': 'Bunların heç biri hələ qüvvədə deyil.',
    'policy.noneBody':
      'Sənəd yalnız platformanın sahibi oradakı yalnız özünün cavablandıra biləcəyi suallara cavab verdikdən sonra dərc olunur, məsələn hansı qanunun tətbiq olunduğu və məlumatlarınıza kimin cavabdeh olduğu. O vaxta qədər qüvvədə deyil və qaralaması göstərilmir.',
    'policy.inForceCount': 'Qüvvədə olan sənədlər: {count}',
    'policy.othersDraft': 'Qalanları yazılıb və hələ təsdiqlənməyib.',
    'policy.forEveryone': 'Hamı üçün',
    'policy.forChild': 'Uşaqlar və onların qəyyumları üçün',
    'policy.forTeacher': 'Müəllimlər üçün',
    'policy.forInstitution': 'Qurumlar üçün',
    'policy.notYet': 'Hələ qüvvədə deyil',
    'policy.versionNo': 'Versiya: {number}',
    'policy.inForceFrom': 'Qüvvəyə minmə tarixi: {date}',
    'policy.mustAgree': 'Sizdən onunla razılaşmaq istəniləcək və razılaşdığınız vaxt saxlanılır.',
    'policy.noSign': 'Bu, oxumaq üçündür. Razılaşılacaq heç nə yoxdur.',
    'policy.concern':
      'Kiminsə davranışı və ya uşağın təhlükəsizliyi ilə bağlı narahatlıq siyasət haqqında sual deyil. O, bir insana çatdırılır.',
    'policy.draftBody':
      'Bu sənəd yazılıb, lakin heç bir versiyası təsdiqlənməyib, buna görə burada oxunacaq və ya razılaşılacaq heç nə yoxdur. Qaralama göstərilmir, çünki hələ dəyişə bilər. Versiya təsdiqlənənə qədər burada heç nə razılığınızı istəmir.',
    'policy.changed': 'Bu versiyada nə dəyişdi: {note}',
    'policy.asWritten': 'Sənəd yazıldığı dildə göstərilir.',
    'policy.agreeTitle': 'Razılığınız',
    'policy.agreeSignIn':
      'Bu sənəd razılığınızı istəyir və razılıq verdiyiniz vaxt hesabınızla birlikdə saxlanılır. Əvvəlcə daxil olun.',
    'policy.agreeSignInDo': 'Razılaşmaq üçün daxil olun',
    'policy.agreeNote':
      'Razılaşmaq bu versiyanı oxuduğunuzu və qəbul etdiyinizi qeyd edir. Versiya və vaxt hesabınızla birlikdə saxlanılır.',
    'policy.agreeDo': 'Bu versiya ilə razıyam',
    'policy.agreed': 'Bu versiya ilə razılaşdığınız vaxt: {date}',
    'policy.agreedWhere': 'Razılaşdıqlarınız hesab səhifənizdə sadalanır.',
    'policy.agreedNewer':
      'Bu səhifə açıq olarkən daha yeni versiya dərc olundu və razılığınız həmin versiya üçün qeyd edildi. Bu səhifə indi onu göstərir. Onu oxuyun.',
    'policy.waitingCount': 'Razılığınızı gözləyən sənədlər: {count}',
    'policy.whyChanged':
      'Bu sənəd səhifə açıldıqdan sonra dəyişdi, buna görə heç nə qeyd edilmədi. Razılaşmazdan əvvəl onu yenidən oxuyun.',
    'policy.agreeFailed': 'Razılığınızı qeyd etmək mümkün olmadı. Heç nə dəyişmədi.',
    'policy.agreeUnsure':
      'Razılığınızın qeyd edildiyini təsdiqləyə bilmədik. Görmək üçün bu səhifəni yenidən açın.',
    'policy.noticeChanged': 'Razılığınızdan sonra dəyişən sənədlər: {count}',
    'policy.noticeOpen': 'Nəyin dəyişdiyini oxuyun',
    'policy.noticeDismiss': 'Bu bildirişi gizlət',
  },
  tg: {
    'policy.lede':
      'Он чи шумо ҳангоми омӯхтан ё дарс додан дар ин ҷо ба он розӣ мешавед, бо маълумоти шумо чӣ карда мешавад ва агар чизе нодуруст равад, чӣ рӯй медиҳад.',
    'policy.kept':
      'Ҳар нусхаи ҳар ҳуҷҷат нигоҳ дошта мешавад. Тағйирот нусхаи навест, ки аз санаи муайян эътибор пайдо мекунад, на таҳрири нусхаи кӯҳна, ва агар розигии шумо лозим бошад, аз шумо дубора пурсида мешавад.',
    'policy.unread':
      'Сиёсатҳоро ҳоло хондан муяссар нашуд. Ин маънои онро надорад, ки онҳо вуҷуд надоранд. Каме баъдтар дубора кӯшиш кунед.',
    'policy.none': 'Ҳанӯз ягон сиёсат навишта нашудааст.',
    'policy.noneLead': 'Ҳеҷ яке аз инҳо ҳанӯз эътибор надорад.',
    'policy.noneBody':
      'Ҳуҷҷат танҳо вақте нашр мешавад, ки соҳиби платформа ба саволҳои дар он буда, ки танҳо худаш ҷавоб дода метавонад, ҷавоб дода бошад, масалан кадом қонун татбиқ мешавад ва барои маълумоти шумо кӣ масъул аст. То он вақт он эътибор надорад ва лоиҳааш нишон дода намешавад.',
    'policy.inForceCount': 'Ҳуҷҷатҳои амалкунанда: {count}',
    'policy.othersDraft': 'Боқимонда навишта шудаанд ва ҳанӯз тасдиқ нашудаанд.',
    'policy.forEveryone': 'Барои ҳама',
    'policy.forChild': 'Барои кӯдакон ва сарпарастони онҳо',
    'policy.forTeacher': 'Барои муаллимон',
    'policy.forInstitution': 'Барои муассисаҳо',
    'policy.notYet': 'Ҳанӯз эътибор надорад',
    'policy.versionNo': 'Нусха: {number}',
    'policy.inForceFrom': 'Аз ин сана амал мекунад: {date}',
    'policy.mustAgree':
      'Аз шумо хоҳиш карда мешавад, ки ба он розӣ шавед, ва вақти розигиатон нигоҳ дошта мешавад.',
    'policy.noSign': 'Ин барои хондан аст. Чизе барои розӣ шудан нест.',
    'policy.concern':
      'Нигаронӣ дар бораи рафтори касе ё бехатарии кӯдак саволи сиёсат нест. Он ба инсон мерасад.',
    'policy.draftBody':
      'Ин ҳуҷҷат навишта шудааст, аммо ягон нусхаи он тасдиқ нашудааст, бинобар ин дар ин ҷо чизе барои хондан ё розӣ шудан нест. Лоиҳа нишон дода намешавад, зеро он ҳанӯз метавонад тағйир ёбад. То нусхае тасдиқ нашавад, дар ин ҷо ҳеҷ чиз розигии шуморо намепурсад.',
    'policy.changed': 'Дар ин нусха чӣ тағйир ёфт: {note}',
    'policy.asWritten': 'Ҳуҷҷат бо забоне нишон дода мешавад, ки бо он навишта шудааст.',
    'policy.agreeTitle': 'Розигии шумо',
    'policy.agreeSignIn':
      'Ин ҳуҷҷат розигии шуморо мепурсад, ва вақти розигӣ бо ҳисоби шумо нигоҳ дошта мешавад. Аввал ворид шавед.',
    'policy.agreeSignInDo': 'Барои розӣ шудан ворид шавед',
    'policy.agreeNote':
      'Розӣ шудан сабт мекунад, ки шумо ин нусхаро хондаед ва онро қабул мекунед. Нусха ва вақт бо ҳисоби шумо нигоҳ дошта мешаванд.',
    'policy.agreeDo': 'Ба ин нусха розиям',
    'policy.agreed': 'Шумо ба ин нусха дар ин вақт розӣ шудед: {date}',
    'policy.agreedWhere': 'Он чи шумо ба он розӣ шудаед, дар саҳифаи ҳисоби шумо номбар шудааст.',
    'policy.agreedNewer':
      'Ҳангоми кушода будани ин саҳифа нусхаи навтар нашр шуд, ва розигии шумо барои ҳамон нусха сабт шуд. Ин саҳифа ҳоло онро нишон медиҳад. Онро хонед.',
    'policy.waitingCount': 'Ҳуҷҷатҳое, ки мунтазири розигии шумоянд: {count}',
    'policy.whyChanged':
      'Ин ҳуҷҷат пас аз кушода шудани ин саҳифа тағйир ёфт, бинобар ин чизе сабт нашуд. Пеш аз розӣ шудан онро дубора хонед.',
    'policy.agreeFailed': 'Розигии шуморо сабт кардан муяссар нашуд. Ҳеҷ чиз тағйир наёфт.',
    'policy.agreeUnsure':
      'Мо тасдиқ карда натавонистем, ки розигии шумо сабт шудааст. Барои дидан ин саҳифаро дубора кушоед.',
    'policy.noticeChanged': 'Ҳуҷҷатҳое, ки пас аз розигии шумо тағйир ёфтанд: {count}',
    'policy.noticeOpen': 'Хонед, ки чӣ тағйир ёфт',
    'policy.noticeDismiss': 'Ин огоҳиномаро пинҳон кунед',
  },
  ky: {
    'policy.lede':
      'Бул жерде окуганда же сабак бергенде эмнеге макул болооруңуз, маалыматтарыңыз менен эмне кылынары жана бир нерсе туура эмес болгондо эмне болору.',
    'policy.kept':
      'Документтин ар бир версиясы сакталат. Өзгөртүү — белгилүү бир күндөн күчүнө кирген жаңы версия, эски версияны оңдоо эмес, ал эми макулдугуңуз керек болсо, сизден кайра суралат.',
    'policy.unread':
      'Саясаттарды азыр окуу мүмкүн болгон жок. Бул алар жок дегенди билдирбейт. Бир аздан кийин кайра аракет кылыңыз.',
    'policy.none': 'Азырынча эч бир саясат жазыла элек.',
    'policy.noneLead': 'Булардын эч бири азырынча күчүнө кире элек.',
    'policy.noneBody':
      'Документ платформанын ээси андагы өзү гана жооп бере ала турган суроолорго жооп бергенден кийин гана жарыяланат, мисалы кайсы мыйзам колдонулары жана маалыматтарыңыз үчүн ким жооптуу экени. Ага чейин ал күчүндө эмес жана долбоору көрсөтүлбөйт.',
    'policy.inForceCount': 'Күчүндөгү документтер: {count}',
    'policy.othersDraft': 'Калгандары жазылган жана азырынча бекитиле элек.',
    'policy.forEveryone': 'Баары үчүн',
    'policy.forChild': 'Балдар жана алардын камкорчулары үчүн',
    'policy.forTeacher': 'Мугалимдер үчүн',
    'policy.forInstitution': 'Мекемелер үчүн',
    'policy.notYet': 'Азырынча күчүндө эмес',
    'policy.versionNo': 'Версия: {number}',
    'policy.inForceFrom': 'Күчүнө кирген күнү: {date}',
    'policy.mustAgree': 'Сизден ага макул болуу суралат, жана макул болгон убактыңыз сакталат.',
    'policy.noSign': 'Бул окуу үчүн. Макул боло турган эч нерсе жок.',
    'policy.concern':
      'Бирөөнүн жүрүм-туруму же баланын коопсуздугу тууралуу тынчсыздануу саясат жөнүндө суроо эмес. Ал адамга жеткирилет.',
    'policy.draftBody':
      'Бул документ жазылган, бирок анын эч бир версиясы бекитиле элек, ошондуктан бул жерде окуй турган же макул боло турган эч нерсе жок. Долбоор көрсөтүлбөйт, анткени ал дагы өзгөрүшү мүмкүн. Версия бекитилмейинче бул жерде эч нерсе макулдугуңузду сурабайт.',
    'policy.changed': 'Бул версияда эмне өзгөрдү: {note}',
    'policy.asWritten': 'Документ жазылган тилинде көрсөтүлөт.',
    'policy.agreeTitle': 'Сиздин макулдугуңуз',
    'policy.agreeSignIn':
      'Бул документ макулдугуңузду сурайт, жана макулдук берген убактыңыз аккаунтуңуз менен кошо сакталат. Адегенде кириңиз.',
    'policy.agreeSignInDo': 'Макул болуу үчүн кириңиз',
    'policy.agreeNote':
      'Макул болуу бул версияны окуганыңызды жана кабыл алганыңызды каттайт. Версия менен убакыт аккаунтуңуз менен кошо сакталат.',
    'policy.agreeDo': 'Бул версияга макулмун',
    'policy.agreed': 'Бул версияга макул болгон убактыңыз: {date}',
    'policy.agreedWhere': 'Макул болгондоруңуз аккаунт барагыңызда тизмеленген.',
    'policy.agreedNewer':
      'Бул барак ачык турганда жаңыраак версия жарыяланды, жана макулдугуңуз ошол версияга катталды. Бул барак эми ошону көрсөтүп турат. Аны окуңуз.',
    'policy.waitingCount': 'Макулдугуңузду күтүп турган документтер: {count}',
    'policy.whyChanged':
      'Бул документ барак ачылгандан кийин өзгөрдү, ошондуктан эч нерсе катталган жок. Макул болуудан мурун аны кайра окуңуз.',
    'policy.agreeFailed': 'Макулдугуңузду каттоо мүмкүн болгон жок. Эч нерсе өзгөргөн жок.',
    'policy.agreeUnsure':
      'Макулдугуңуз катталганын ырастай алган жокпуз. Көрүү үчүн бул баракты кайра ачыңыз.',
    'policy.noticeChanged': 'Макулдугуңуздан кийин өзгөргөн документтер: {count}',
    'policy.noticeOpen': 'Эмне өзгөргөнүн окуңуз',
    'policy.noticeDismiss': 'Бул билдирүүнү жашыруу',
  },
  tk: {
    'policy.lede':
      'Bu ýerde öwrenýän ýa-da okadýan wagtyňyz nämä razy bolýandygyňyz, maglumatlaryňyz bilen näme edilýändigi we bir zat nädogry bolanda näme bolýandygy.',
    'policy.kept':
      'Resminamanyň her wersiýasy saklanýar. Üýtgeşme belli bir senede güýje girýän täze wersiýadyr, köne wersiýany düzetmek däldir, razylygyňyz gerek bolsa, sizden täzeden soralýar.',
    'policy.unread':
      'Syýasatlary häzir okap bolmady. Bu olaryň ýokdugyny aňlatmaýar. Biraz wagtdan gaýtadan synanyşyň.',
    'policy.none': 'Entek hiç bir syýasat ýazylmady.',
    'policy.noneLead': 'Bularyň hiç biri entek güýje girmedi.',
    'policy.noneBody':
      'Resminama diňe platformanyň eýesi ondaky diňe özüniň jogap berip bilýän soraglaryna jogap berenden soň çap edilýär, mysal üçin haýsy kanunyň ulanylýandygy we maglumatlaryňyz üçin kimiň jogapkärdigi. Şoňa çenli ol güýjünde däl we garalamasy görkezilmeýär.',
    'policy.inForceCount': 'Güýjündäki resminamalar: {count}',
    'policy.othersDraft': 'Galanlary ýazyldy we entek tassyklanmady.',
    'policy.forEveryone': 'Hemmeler üçin',
    'policy.forChild': 'Çagalar we olaryň hossarlary üçin',
    'policy.forTeacher': 'Mugallymlar üçin',
    'policy.forInstitution': 'Edaralar üçin',
    'policy.notYet': 'Entek güýje girmedi',
    'policy.versionNo': 'Wersiýa: {number}',
    'policy.inForceFrom': 'Güýje giren senesi: {date}',
    'policy.mustAgree': 'Sizden oňa razy bolmak soralar we razy bolan wagtyňyz saklanýar.',
    'policy.noSign': 'Bu okamak üçin. Razy bolmaly zat ýok.',
    'policy.concern':
      'Kimdir biriniň özüni alyp barşy ýa-da çaganyň howpsuzlygy baradaky alada syýasat hakyndaky sorag däl. Ol adama ýetirilýär.',
    'policy.draftBody':
      'Bu resminama ýazyldy, emma onuň hiç bir wersiýasy tassyklanmady, şonuň üçin bu ýerde okara ýa-da razy bolara zat ýok. Garalama görkezilmeýär, sebäbi ol entek üýtgäp biler. Wersiýa tassyklanýança bu ýerde hiç zat razylygyňyzy soramaýar.',
    'policy.changed': 'Bu wersiýada näme üýtgedi: {note}',
    'policy.asWritten': 'Resminama ýazylan dilinde görkezilýär.',
    'policy.agreeTitle': 'Siziň razylygyňyz',
    'policy.agreeSignIn':
      'Bu resminama razylygyňyzy soraýar we razylyk beren wagtyňyz hasabyňyz bilen bile saklanýar. Ilki giriň.',
    'policy.agreeSignInDo': 'Razy bolmak üçin giriň',
    'policy.agreeNote':
      'Razy bolmak bu wersiýany okandygyňyzy we kabul edýändigiňizi ýazga alýar. Wersiýa we wagt hasabyňyz bilen bile saklanýar.',
    'policy.agreeDo': 'Bu wersiýa razy',
    'policy.agreed': 'Bu wersiýa razy bolan wagtyňyz: {date}',
    'policy.agreedWhere': 'Razy bolan zatlaryňyz hasap sahypaňyzda sanalandyr.',
    'policy.agreedNewer':
      'Bu sahypa açyk durka has täze wersiýa çap edildi we razylygyňyz şol wersiýa üçin ýazga alyndy. Bu sahypa indi şony görkezýär. Ony okaň.',
    'policy.waitingCount': 'Razylygyňyza garaşýan resminamalar: {count}',
    'policy.whyChanged':
      'Bu resminama sahypa açylandan soň üýtgedi, şonuň üçin hiç zat ýazga alynmady. Razy bolmazdan öň ony täzeden okaň.',
    'policy.agreeFailed': 'Razylygyňyzy ýazga alyp bolmady. Hiç zat üýtgemedi.',
    'policy.agreeUnsure':
      'Razylygyňyzyň ýazga alnandygyny tassyklap bilmedik. Görmek üçin bu sahypany täzeden açyň.',
    'policy.noticeChanged': 'Razylygyňyzdan soň üýtgän resminamalar: {count}',
    'policy.noticeOpen': 'Nämäniň üýtgänini okaň',
    'policy.noticeDismiss': 'Bu habarnamany gizle',
  },
  ta: {
    'policy.lede':
      'இங்கே கற்கும்போதோ கற்பிக்கும்போதோ நீங்கள் எதற்கு ஒப்புக்கொள்கிறீர்கள், உங்கள் தரவு என்ன செய்யப்படுகிறது, ஏதாவது தவறாக நடந்தால் என்ன ஆகும்.',
    'policy.kept':
      'ஒரு ஆவணத்தின் ஒவ்வொரு பதிப்பும் வைக்கப்படுகிறது. மாற்றம் என்பது ஒரு தேதியிலிருந்து நடைமுறைக்கு வரும் புதிய பதிப்பு, பழைய பதிப்பின் திருத்தம் அல்ல; உங்கள் ஒப்புதல் தேவைப்பட்டால் உங்களிடம் மீண்டும் கேட்கப்படும்.',
    'policy.unread':
      'கொள்கைகளை இப்போது படிக்க முடியவில்லை. கொள்கைகள் இல்லை என்று இதற்குப் பொருள் அல்ல. சிறிது நேரத்தில் மீண்டும் முயலுங்கள்.',
    'policy.none': 'இன்னும் எந்தக் கொள்கையும் எழுதப்படவில்லை.',
    'policy.noneLead': 'இவற்றில் எதுவும் இன்னும் நடைமுறையில் இல்லை.',
    'policy.noneBody':
      'தளத்தின் உரிமையாளர் மட்டுமே பதிலளிக்கக்கூடிய கேள்விகளுக்கு, எடுத்துக்காட்டாக எந்தச் சட்டம் பொருந்தும், உங்கள் தரவுக்கு யார் பொறுப்பு என்பவற்றுக்கு, அவர் பதிலளித்த பிறகே ஓர் ஆவணம் வெளியிடப்படும். அதுவரை அது நடைமுறையில் இல்லை, வரைவு காட்டப்படாது.',
    'policy.inForceCount': 'நடைமுறையில் உள்ள ஆவணங்கள்: {count}',
    'policy.othersDraft': 'மற்றவை எழுதப்பட்டுள்ளன, இன்னும் அங்கீகரிக்கப்படவில்லை.',
    'policy.forEveryone': 'அனைவருக்கும்',
    'policy.forChild': 'குழந்தைகளுக்கும் அவர்களின் பாதுகாவலர்களுக்கும்',
    'policy.forTeacher': 'ஆசிரியர்களுக்கு',
    'policy.forInstitution': 'நிறுவனங்களுக்கு',
    'policy.notYet': 'இன்னும் நடைமுறையில் இல்லை',
    'policy.versionNo': 'பதிப்பு: {number}',
    'policy.inForceFrom': 'நடைமுறைக்கு வந்த தேதி: {date}',
    'policy.mustAgree':
      'இதற்கு ஒப்புக்கொள்ளுமாறு உங்களிடம் கேட்கப்படும், நீங்கள் ஒப்புக்கொண்ட நேரம் வைக்கப்படும்.',
    'policy.noSign': 'இது படிப்பதற்கானது. ஒப்புக்கொள்ள எதுவும் இல்லை.',
    'policy.concern':
      'ஒருவரின் நடத்தை பற்றிய அல்லது ஒரு குழந்தையின் பாதுகாப்பு பற்றிய கவலை கொள்கை பற்றிய கேள்வி அல்ல. அது ஒரு மனிதரிடம் செல்கிறது.',
    'policy.draftBody':
      'இந்த ஆவணம் எழுதப்பட்டுள்ளது, ஆனால் அதன் எந்தப் பதிப்பும் அங்கீகரிக்கப்படவில்லை, எனவே இங்கே படிக்கவோ ஒப்புக்கொள்ளவோ எதுவும் இல்லை. வரைவு காட்டப்படாது, ஏனெனில் அது இன்னும் மாறலாம். ஒரு பதிப்பு அங்கீகரிக்கப்படும் வரை இங்கே எதுவும் உங்கள் ஒப்புதலைக் கேட்காது.',
    'policy.changed': 'இந்தப் பதிப்பில் மாறியவை: {note}',
    'policy.asWritten': 'ஆவணம் எழுதப்பட்ட மொழியிலேயே காட்டப்படுகிறது.',
    'policy.agreeTitle': 'உங்கள் ஒப்புதல்',
    'policy.agreeSignIn':
      'இந்த ஆவணம் உங்கள் ஒப்புதலைக் கேட்கிறது, நீங்கள் ஒப்புதல் அளித்த நேரம் உங்கள் கணக்குடன் வைக்கப்படும். முதலில் உள்நுழையுங்கள்.',
    'policy.agreeSignInDo': 'ஒப்புக்கொள்ள உள்நுழையுங்கள்',
    'policy.agreeNote':
      'ஒப்புக்கொள்வது நீங்கள் இந்தப் பதிப்பைப் படித்து ஏற்றுக்கொண்டீர்கள் என்பதைப் பதிவு செய்கிறது. பதிப்பும் நேரமும் உங்கள் கணக்குடன் வைக்கப்படும்.',
    'policy.agreeDo': 'இந்தப் பதிப்புக்கு ஒப்புக்கொள்கிறேன்',
    'policy.agreed': 'இந்தப் பதிப்புக்கு நீங்கள் ஒப்புக்கொண்ட நேரம்: {date}',
    'policy.agreedWhere': 'நீங்கள் ஒப்புக்கொண்டவை உங்கள் கணக்குப் பக்கத்தில் பட்டியலிடப்பட்டுள்ளன.',
    'policy.agreedNewer':
      'இந்தப் பக்கம் திறந்திருந்தபோது புதிய பதிப்பு வெளியிடப்பட்டது, உங்கள் ஒப்புதல் அந்தப் பதிப்புக்குப் பதிவானது. இந்தப் பக்கம் இப்போது அதைக் காட்டுகிறது. அதைப் படியுங்கள்.',
    'policy.waitingCount': 'உங்கள் ஒப்புதலுக்காகக் காத்திருக்கும் ஆவணங்கள்: {count}',
    'policy.whyChanged':
      'இந்தப் பக்கம் திறக்கப்பட்ட பிறகு இந்த ஆவணம் மாறியது, எனவே எதுவும் பதிவாகவில்லை. ஒப்புக்கொள்வதற்கு முன் மீண்டும் படியுங்கள்.',
    'policy.agreeFailed': 'உங்கள் ஒப்புதலைப் பதிவு செய்ய முடியவில்லை. எதுவும் மாறவில்லை.',
    'policy.agreeUnsure':
      'உங்கள் ஒப்புதல் பதிவானதா என்பதை எங்களால் உறுதிப்படுத்த முடியவில்லை. பார்க்க இந்தப் பக்கத்தை மீண்டும் திறக்கவும்.',
    'policy.noticeChanged': 'நீங்கள் ஒப்புக்கொண்ட பிறகு மாறிய ஆவணங்கள்: {count}',
    'policy.noticeOpen': 'என்ன மாறியது என்பதைப் படிக்கவும்',
    'policy.noticeDismiss': 'இந்த அறிவிப்பை மறை',
  },
  ne: {
    'policy.lede':
      'यहाँ सिक्दा वा सिकाउँदा तपाईं केमा सहमत हुनुहुन्छ, तपाईंको डेटासँग के गरिन्छ, र केही गडबड भए के हुन्छ।',
    'policy.kept':
      'कागजातको प्रत्येक संस्करण राखिन्छ। परिवर्तन भनेको एउटा मितिदेखि लागू हुने नयाँ संस्करण हो, पुरानो संस्करणको सम्पादन होइन, र तपाईंको सहमति चाहिएमा तपाईंलाई फेरि सोधिन्छ।',
    'policy.unread':
      'नीतिहरू अहिले पढ्न सकिएन। यसको अर्थ कुनै नीति छैन भन्ने होइन। केही बेरमा फेरि प्रयास गर्नुहोस्।',
    'policy.none': 'अहिलेसम्म कुनै नीति लेखिएको छैन।',
    'policy.noneLead': 'यीमध्ये कुनै पनि अझै लागू भएको छैन।',
    'policy.noneBody':
      'प्लेटफर्मका मालिकले कागजातभित्रका आफैंले मात्र जवाफ दिन सक्ने प्रश्नहरूको जवाफ दिएपछि मात्र कागजात प्रकाशित हुन्छ, जस्तै कुन कानुन लागू हुन्छ र तपाईंको डेटाको जिम्मेवार को हो। त्यतिन्जेल यो लागू हुँदैन, र मस्यौदा देखाइँदैन।',
    'policy.inForceCount': 'लागू भएका कागजात: {count}',
    'policy.othersDraft': 'अरू लेखिएका छन् र अझै स्वीकृत भएका छैनन्।',
    'policy.forEveryone': 'सबैका लागि',
    'policy.forChild': 'बालबालिका र उनीहरूका अभिभावकका लागि',
    'policy.forTeacher': 'शिक्षकहरूका लागि',
    'policy.forInstitution': 'संस्थाहरूका लागि',
    'policy.notYet': 'अझै लागू भएको छैन',
    'policy.versionNo': 'संस्करण: {number}',
    'policy.inForceFrom': 'लागू भएको मिति: {date}',
    'policy.mustAgree': 'तपाईंलाई यसमा सहमत हुन भनिनेछ, र तपाईं सहमत भएको समय राखिन्छ।',
    'policy.noSign': 'यो पढ्नका लागि हो। सहमत हुनुपर्ने केही छैन।',
    'policy.concern':
      'कसैको व्यवहार वा कुनै बालबालिकाको सुरक्षाबारेको चिन्ता नीतिको प्रश्न होइन। त्यो एक जना मानिससम्म पुग्छ।',
    'policy.draftBody':
      'यो कागजात लेखिएको छ, तर यसको कुनै संस्करण स्वीकृत भएको छैन, त्यसैले यहाँ पढ्न वा सहमत हुन केही छैन। मस्यौदा देखाइँदैन, किनभने त्यो अझै बदलिन सक्छ। कुनै संस्करण स्वीकृत नभएसम्म यहाँ केहीले पनि तपाईंको सहमति माग्दैन।',
    'policy.changed': 'यस संस्करणमा के बदलियो: {note}',
    'policy.asWritten': 'कागजात जुन भाषामा लेखिएको हो त्यही भाषामा देखाइएको छ।',
    'policy.agreeTitle': 'तपाईंको सहमति',
    'policy.agreeSignIn':
      'यो कागजातले तपाईंको सहमति माग्छ, र सहमति दिएको समय तपाईंको खातासँग राखिन्छ। पहिले साइन इन गर्नुहोस्।',
    'policy.agreeSignInDo': 'सहमत हुन साइन इन गर्नुहोस्',
    'policy.agreeNote':
      'सहमत हुँदा तपाईंले यो संस्करण पढ्नुभएको र स्वीकार गर्नुभएको कुरा अभिलेख हुन्छ। संस्करण र समय तपाईंको खातासँग राखिन्छ।',
    'policy.agreeDo': 'यस संस्करणमा सहमत छु',
    'policy.agreed': 'तपाईं यस संस्करणमा सहमत भएको समय: {date}',
    'policy.agreedWhere': 'तपाईं सहमत भएका कुराहरू तपाईंको खाता पृष्ठमा सूचीबद्ध छन्।',
    'policy.agreedNewer':
      'यो पृष्ठ खुला रहँदा नयाँ संस्करण प्रकाशित भयो, र तपाईंको सहमति त्यही संस्करणका लागि अभिलेख भयो। यो पृष्ठले अहिले त्यही देखाउँदै छ। त्यो पढ्नुहोस्।',
    'policy.waitingCount': 'तपाईंको सहमति पर्खिरहेका कागजात: {count}',
    'policy.whyChanged':
      'यो पृष्ठ खोलिएपछि यो कागजात बदलियो, त्यसैले केही अभिलेख भएन। सहमत हुनुअघि फेरि पढ्नुहोस्।',
    'policy.agreeFailed': 'तपाईंको सहमति अभिलेख गर्न सकिएन। केही बदलिएन।',
    'policy.agreeUnsure':
      'तपाईंको सहमति अभिलेख भएको हामीले पुष्टि गर्न सकेनौं। हेर्न यो पृष्ठ फेरि खोल्नुहोस्।',
    'policy.noticeChanged': 'तपाईं सहमत भएपछि बदलिएका कागजात: {count}',
    'policy.noticeOpen': 'के बदलियो पढ्नुहोस्',
    'policy.noticeDismiss': 'यो सूचना लुकाउनुहोस्',
  },
};
