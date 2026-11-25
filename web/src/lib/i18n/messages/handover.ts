import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Turning eighteen: the page at `/handover`, where a learner's record
 * becomes their own account or is not kept.
 *
 * Written on 2026-11-25, on the owner's ruling that what is not a
 * declaration is to be in the reader's language.
 *
 * **The statement that is ticked is not here.** It is a declaration, it
 * has one wording, and it is English on every page
 * (`HANDOVER_DECLARATION` in `lib/handover.ts`); `handover.declNote` says
 * so to a reader of another language.
 *
 * "They" and "theirs" are one learner, of either sex, who is eighteen or
 * about to be. Where a language has to choose, the sentence is turned so
 * that it does not. `{name}` is the learner's name as the family wrote it.
 * `handover.doneDropOn` takes a date already written in the reader's
 * calendar. The refusal about a seat on the family plan is
 * `family.seatHeld`.
 */
export const HANDOVER: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'handover.crumb': 'بلوغ الثامنة عشرة',
    'handover.eyebrow': 'سجلّ خاصّ بصاحبه',
    'handover.title': 'سجلّ يصير لصاحبه',
    'handover.explainer':
      'المنصّة لا تخزّن تاريخ الميلاد أبدًا، فلا يمكنها أن تنتبه إلى بلوغ الثامنة عشرة. هنا يقول ذلك أحدهم — المتعلّم من تسجيل دخوله الخاص، أو البالغ الذي كان يتولّى السجلّ.',
    'handover.decidesLead': 'ما الذي يُقرَّر هنا.',
    'handover.decides':
      'هل يصير سجلّ المتعلّم حسابًا خاصًّا به، أم لا يُحتفظ به. الاحتفاظ به لا ينقل شيئًا: تقدّمه وما سلّمه من أعمال وشهاداته كانت له دائمًا، والحساب يتوقّف فقط عن كونه شيئًا يديره وليّ الأمر. وعدم الاحتفاظ به يحذف السجلّ بعد ثلاثين يومًا من اليوم.',
    'handover.none':
      'لا يوجد ملفّ طفل في هذا الحساب، فلا شيء يُسلَّم. والمتعلّم الذي يملك سجلّه كبالغ لا شيء عليه هنا.',
    'handover.hasLogin': 'لهذا المتعلّم تسجيل دخول خاص به. تسليم السجلّ يجعل ذلك الحساب له.',
    'handover.noLogin': 'يُوصَل إلى هذا المتعلّم عبر حساب العائلة، وليس له تسجيل دخول خاص به.',
    'handover.keep': 'الاحتفاظ به، حسابًا خاصًّا بصاحبه',
    'handover.keepMeans':
      'يصير السجلّ لصاحبه: تقدّمه وما سلّمه من أعمال وشهاداته تبقى في مكانها تمامًا، ويتوقّف حسابه عن كونه شيئًا يديره وليّ الأمر، ويخرج من العائلة. يتطلّب هذا حسابًا خاصًّا به؛ فإن لم يكن له حساب فأنشئ له تسجيل دخول أوّلًا.',
    'handover.drop': 'عدم الاحتفاظ به',
    'handover.dropMeans':
      'يُحذف سجلّ التعلّم بعد ثلاثين يومًا من اليوم — وهي المدّة نفسها التي تصفها سياسة الأطفال. الشهادة التي صدرت تحتفظ برقمها ويبقى التحقّق منها ممكنًا، لأنّ شهادة ربّما عُرضت على صاحب عمل يجب أن تبقى ذات معنى.',
    'handover.keepRefused':
      'ليس لهذا المتعلّم تسجيل دخول بعد، فسيُرفض هذا الخيار إلى أن يصير له واحد. أنشئ له تسجيل دخول من صفحة العائلة أوّلًا.',
    'handover.declNote': 'الإقرار الذي تؤشّر عليه يبقى بالإنجليزية: له صيغة واحدة لأسباب قانونية.',
    'handover.confirmKeep':
      'يصير {name} متعلّمًا بالغًا على هذه المنصّة. لا تستطيع المنصّة التراجع عن ذلك؛ وينتهي وصول وليّ الأمر.',
    'handover.confirmDrop':
      'سيُحذف سجلّ تعلّم {name} بعد ثلاثين يومًا من اليوم. والشهادة التي صدرت يبقى التحقّق منها ممكنًا.',
    'handover.working': 'جارٍ التنفيذ…',
    'handover.doKeep': 'اجعل السجلّ لصاحبه',
    'handover.doDrop': 'قرّر عدم الاحتفاظ به',
    'handover.doneKeepLeft':
      'صار السجلّ لصاحبه. خرج من حساب العائلة، والحساب الذي هو فيه صار حسابه الخاص.',
    'handover.doneKeep': 'صار السجلّ لصاحبه. والحساب الذي هو فيه صار حسابه الخاص.',
    'handover.doneDropOn': 'سيُحذف السجلّ في {date}. حتى ذلك الحين لا يتغيّر شيء، والقرار محفوظ.',
    'handover.doneDrop': 'سيُحذف السجلّ بعد ثلاثين يومًا من اليوم. حتى ذلك الحين لا يتغيّر شيء.',
    'handover.errDeclaration':
      'الإقرار هو السجلّ كلّه: أشّر على المربّع الذي يؤكّد أنّ هذا المتعلّم بلغ 18 عامًا أو أكثر.',
    'handover.errNeedsAccount':
      'لا يصير هذا السجلّ حسابًا خاصًّا بصاحبه إلا بعد أن يكون له حساب. أنشئ له تسجيل دخول أوّلًا ثم سلّمه.',
    'handover.errNotChild': 'هذا المتعلّم يملك سجلّه بالفعل؛ لا شيء يُسلَّم.',
    'handover.errNotAllowed': 'لا يسلّم السجلّ إلا المتعلّم نفسه أو بالغ من عائلته.',
    'handover.errNotActive': 'هذا السجلّ في طريقه إلى الحذف بالفعل.',
    'handover.errAlready': 'يوجد بالفعل طلب على هذا السجلّ لم يُنفَّذ بعد.',
    'handover.errRefused': 'لم يتمّ ذلك. أعد تحميل الصفحة وحاول مجدّدًا — لم يتغيّر شيء.',
    'handover.errUnconfirmed':
      'لم نتمكّن من التأكّد ممّا إذا كان ذلك قد تمّ. أعد تحميل الصفحة لترى ما يقوله السجلّ قبل أن تحاول مجدّدًا.',
    'handover.policy': 'سياسة الأطفال',
    'handover.family': 'العائلة والأطفال',
  },
  ur: {
    'handover.crumb': 'اٹھارہ سال کا ہونا',
    'handover.eyebrow': 'اپنا ریکارڈ',
    'handover.title': 'ایک ریکارڈ جو ان کا اپنا ہو جاتا ہے',
    'handover.explainer':
      'پلیٹ فارم کبھی تاریخِ پیدائش محفوظ نہیں کرتا، اس لیے اسے اٹھارہویں سالگرہ کا پتا نہیں چل سکتا۔ یہاں کوئی یہ بات کہتا ہے — سیکھنے والا اپنے لاگ اِن سے، یا وہ بالغ جو ریکارڈ سنبھالے ہوئے تھا۔',
    'handover.decidesLead': 'یہاں کیا طے ہوتا ہے۔',
    'handover.decides':
      'یہ کہ سیکھنے والے کا ریکارڈ اس کا اپنا اکاؤنٹ بنے، یا رکھا نہ جائے۔ رکھنے سے کچھ منتقل نہیں ہوتا: اس کی پیش رفت، جمع کرایا ہوا کام اور اسناد ہمیشہ اسی کے تھے، اور اکاؤنٹ بس سرپرست کے زیرِ انتظام نہیں رہتا۔ نہ رکھنے سے ریکارڈ آج سے تیس دن بعد حذف ہو جاتا ہے۔',
    'handover.none':
      'اس اکاؤنٹ پر کسی بچے کا پروفائل نہیں، اس لیے حوالے کرنے کو کچھ نہیں۔ جس سیکھنے والے کے پاس پہلے سے اپنا بالغ ریکارڈ ہے اسے یہاں کچھ نہیں کرنا۔',
    'handover.hasLogin':
      'اس سیکھنے والے کا اپنا لاگ اِن ہے۔ ریکارڈ حوالے کرنے سے وہ اکاؤنٹ اس کا اپنا ہو جاتا ہے۔',
    'handover.noLogin':
      'اس سیکھنے والے تک خاندان کے اکاؤنٹ کے ذریعے پہنچا جاتا ہے اور اس کا اپنا لاگ اِن نہیں۔',
    'handover.keep': 'اسے رکھیں، ان کے اپنے اکاؤنٹ کے طور پر',
    'handover.keepMeans':
      'ریکارڈ ان کا اپنا ہو جاتا ہے: ان کی پیش رفت، جمع کرایا ہوا کام اور اسناد بالکل وہیں رہتی ہیں، ان کا اکاؤنٹ سرپرست کے زیرِ انتظام نہیں رہتا، اور وہ خاندان سے نکل جاتا ہے۔ اس کے لیے ان کا اپنا اکاؤنٹ ضروری ہے؛ اگر نہیں ہے تو پہلے ان کا لاگ اِن بنائیں۔',
    'handover.drop': 'اسے نہ رکھیں',
    'handover.dropMeans':
      'پڑھائی کا ریکارڈ آج سے تیس دن بعد حذف ہو جاتا ہے — وہی مدت جو بچوں کی پالیسی میں پہلے سے درج ہے۔ جو سند جاری ہو چکی ہے اس کا نمبر برقرار رہتا ہے اور اس کی تصدیق اب بھی ہو سکتی ہے، کیونکہ جو سند شاید کسی آجر کو دکھائی جا چکی ہو اس کا مطلب باقی رہنا چاہیے۔',
    'handover.keepRefused':
      'اس سیکھنے والے کا ابھی کوئی لاگ اِن نہیں، اس لیے جب تک لاگ اِن نہ ہو یہ انتخاب رد ہوگا۔ پہلے خاندان والے صفحے پر ان کا لاگ اِن بنائیں۔',
    'handover.declNote':
      'جس بیان پر آپ نشان لگاتے ہیں وہ انگریزی میں رکھا گیا ہے: قانونی وجوہ سے اس کے الفاظ ایک ہی ہیں۔',
    'handover.confirmKeep':
      '{name} اس پلیٹ فارم پر بالغ سیکھنے والے بن جاتے ہیں۔ پلیٹ فارم اسے واپس نہیں کر سکتا؛ سرپرست کی رسائی ختم ہو جاتی ہے۔',
    'handover.confirmDrop':
      '{name} کی پڑھائی کا ریکارڈ آج سے تیس دن بعد حذف ہو جائے گا۔ جو سند جاری ہو چکی ہے اس کی تصدیق پھر بھی ہوتی رہے گی۔',
    'handover.working': 'کام جاری ہے…',
    'handover.doKeep': 'ریکارڈ ان کا اپنا بنائیں',
    'handover.doDrop': 'نہ رکھنے کا فیصلہ کریں',
    'handover.doneKeepLeft':
      'ریکارڈ اب ان کا اپنا ہے۔ وہ خاندان کے اکاؤنٹ سے نکل چکا ہے، اور جس اکاؤنٹ میں ہے وہ ان کا اپنا ہے۔',
    'handover.doneKeep': 'ریکارڈ اب ان کا اپنا ہے۔ جس اکاؤنٹ میں وہ ہے وہ ان کا اپنا ہے۔',
    'handover.doneDropOn':
      'ریکارڈ {date} کو حذف ہو جائے گا۔ تب تک کچھ نہیں بدلتا، اور فیصلہ درج ہے۔',
    'handover.doneDrop': 'ریکارڈ آج سے تیس دن بعد حذف ہو جائے گا۔ تب تک کچھ نہیں بدلتا۔',
    'handover.errDeclaration':
      'بیان ہی پورا ریکارڈ ہے: اس خانے پر نشان لگائیں جو تصدیق کرتا ہے کہ یہ سیکھنے والا 18 سال یا اس سے زیادہ کا ہے۔',
    'handover.errNeedsAccount':
      'یہ ریکارڈ ان کا اپنا اکاؤنٹ تبھی بن سکتا ہے جب ان کا اکاؤنٹ ہو۔ پہلے ان کا لاگ اِن بنائیں، پھر حوالے کریں۔',
    'handover.errNotChild': 'اس سیکھنے والے کے پاس پہلے سے اپنا ریکارڈ ہے؛ حوالے کرنے کو کچھ نہیں۔',
    'handover.errNotAllowed':
      'ریکارڈ صرف سیکھنے والا خود یا اس کے خاندان کا کوئی بالغ حوالے کر سکتا ہے۔',
    'handover.errNotActive': 'یہ ریکارڈ پہلے ہی ختم ہونے کے مرحلے میں ہے۔',
    'handover.errAlready': 'اس ریکارڈ پر پہلے سے ایک درخواست موجود ہے جس پر ابھی عمل نہیں ہوا۔',
    'handover.errRefused':
      'یہ نہیں ہو سکا۔ صفحہ دوبارہ لوڈ کریں اور پھر کوشش کریں — کچھ نہیں بدلا۔',
    'handover.errUnconfirmed':
      'ہم تصدیق نہیں کر سکے کہ یہ ہوا یا نہیں۔ دوبارہ کوشش سے پہلے صفحہ دوبارہ لوڈ کر کے دیکھیں کہ ریکارڈ کیا کہتا ہے۔',
    'handover.policy': 'بچوں کی پالیسی',
    'handover.family': 'خاندان اور بچے',
  },
  fa: {
    'handover.crumb': 'هجده‌ساله شدن',
    'handover.eyebrow': 'سابقه‌ای از آنِ خود',
    'handover.title': 'سابقه‌ای که از آنِ خودش می‌شود',
    'handover.explainer':
      'این سکو هرگز تاریخ تولد ذخیره نمی‌کند، پس نمی‌تواند متوجه هجده‌سالگی شود. اینجا جایی است که کسی این را می‌گوید — یادگیرنده با ورود خودش، یا بزرگسالی که سابقه را نگه داشته است.',
    'handover.decidesLead': 'اینجا چه چیزی تعیین می‌شود.',
    'handover.decides':
      'اینکه سابقهٔ یک یادگیرنده حساب خودِ او شود، یا نگه داشته نشود. نگه‌داشتنش چیزی را جابه‌جا نمی‌کند: پیشرفت، کارهای تحویل‌شده و گواهی‌نامه‌هایش همیشه از آنِ خودش بوده‌اند و حساب فقط دیگر چیزی نیست که سرپرست اداره‌اش کند. نگه‌نداشتنش سابقه را سی روز پس از امروز حذف می‌کند.',
    'handover.none':
      'در این حساب نمایهٔ کودکی نیست، پس چیزی برای واگذاری وجود ندارد. یادگیرنده‌ای که از پیش سابقهٔ بزرگسال خودش را دارد اینجا کاری ندارد.',
    'handover.hasLogin':
      'این یادگیرنده ورود جداگانهٔ خودش را دارد. واگذاری سابقه آن حساب را از آنِ او می‌کند.',
    'handover.noLogin': 'به این یادگیرنده از راه حساب خانواده دسترسی هست و ورود جداگانه‌ای ندارد.',
    'handover.keep': 'نگه داشته شود، به‌عنوان حساب خودش',
    'handover.keepMeans':
      'سابقه از آنِ خودش می‌شود: پیشرفت، کارهای تحویل‌شده و گواهی‌نامه‌هایش دقیقاً همان‌جا می‌مانند، حسابش دیگر چیزی نیست که سرپرست اداره کند، و از خانواده بیرون می‌رود. این کار به حسابی از آنِ خودش نیاز دارد؛ اگر ندارد، نخست برایش ورود بسازید.',
    'handover.drop': 'نگه داشته نشود',
    'handover.dropMeans':
      'سابقهٔ یادگیری سی روز پس از امروز حذف می‌شود — همان مهلتی که سیاست کودکان از پیش شرح داده است. گواهی‌نامه‌ای که صادر شده شماره‌اش را نگه می‌دارد و همچنان قابل درستی‌سنجی است، چون گواهی‌نامه‌ای که شاید به کارفرمایی نشان داده شده باید همچنان معنا داشته باشد.',
    'handover.keepRefused':
      'این یادگیرنده هنوز ورودی ندارد، پس تا وقتی نداشته باشد این گزینه رد می‌شود. نخست در صفحهٔ خانواده برایش ورود بسازید.',
    'handover.declNote':
      'اظهاری که تیک می‌زنید به انگلیسی نگه داشته شده است: به دلایل حقوقی یک عبارت دارد.',
    'handover.confirmKeep':
      '{name} در این سکو یادگیرندهٔ بزرگسال می‌شود. سکو نمی‌تواند این را برگرداند؛ دسترسی سرپرست پایان می‌یابد.',
    'handover.confirmDrop':
      'سابقهٔ یادگیری {name} سی روز پس از امروز حذف خواهد شد. گواهی‌نامه‌ای که صادر شده همچنان درستی‌سنجی می‌شود.',
    'handover.working': 'در حال انجام…',
    'handover.doKeep': 'سابقه از آنِ خودش شود',
    'handover.doDrop': 'تصمیم به نگه‌نداشتن',
    'handover.doneKeepLeft':
      'سابقه از آنِ خودش است. از حساب خانواده بیرون رفته و حسابی که در آن است حساب خودِ اوست.',
    'handover.doneKeep': 'سابقه از آنِ خودش است. حسابی که در آن است حساب خودِ اوست.',
    'handover.doneDropOn':
      'سابقه در {date} حذف خواهد شد. تا آن زمان چیزی تغییر نمی‌کند و تصمیم ثبت شده است.',
    'handover.doneDrop': 'سابقه سی روز پس از امروز حذف خواهد شد. تا آن زمان چیزی تغییر نمی‌کند.',
    'handover.errDeclaration':
      'همهٔ سابقه همین اظهار است: خانه‌ای را که تأیید می‌کند این یادگیرنده ۱۸ سال یا بیشتر دارد تیک بزنید.',
    'handover.errNeedsAccount':
      'این سابقه فقط وقتی حساب خودش می‌شود که حسابی داشته باشد. نخست برایش ورود بسازید، سپس واگذار کنید.',
    'handover.errNotChild': 'آن یادگیرنده از پیش سابقهٔ خودش را دارد؛ چیزی برای واگذاری نیست.',
    'handover.errNotAllowed':
      'فقط خودِ یادگیرنده یا بزرگسالی از خانواده‌اش می‌تواند سابقه را واگذار کند.',
    'handover.errNotActive': 'آن سابقه از پیش در راه حذف است.',
    'handover.errAlready': 'از پیش درخواستی روی این سابقه هست که هنوز به آن عمل نشده است.',
    'handover.errRefused':
      'انجام نشد. صفحه را دوباره بار کنید و باز تلاش کنید — چیزی تغییر نکرده است.',
    'handover.errUnconfirmed':
      'نتوانستیم مطمئن شویم که انجام شد یا نه. پیش از تلاش دوباره، صفحه را دوباره بار کنید تا ببینید سابقه چه می‌گوید.',
    'handover.policy': 'سیاست کودکان',
    'handover.family': 'خانواده و کودکان',
  },
  'fa-af': {
    'handover.crumb': 'هجده‌ساله شدن',
    'handover.eyebrow': 'سابقه‌ای از خود',
    'handover.title': 'سابقه‌ای که از خودش می‌شود',
    'handover.explainer':
      'این پلتفرم هیچ‌گاه تاریخ تولد را ذخیره نمی‌کند، پس متوجه هجده‌سالگی شده نمی‌تواند. اینجا جایی است که کسی این را می‌گوید — شاگرد با ورود خودش، یا بزرگسالی که سابقه را نگه داشته است.',
    'handover.decidesLead': 'اینجا چه چیز تعیین می‌شود.',
    'handover.decides':
      'اینکه سابقهٔ یک شاگرد حساب خودش شود، یا نگه داشته نشود. نگه داشتن آن چیزی را انتقال نمی‌دهد: پیشرفت، کارهای تسلیم‌شده و اسنادش همیشه از خودش بوده‌اند و حساب فقط دیگر چیزی نیست که سرپرست آن را اداره کند. نگه نداشتن آن سابقه را سی روز بعد از امروز حذف می‌کند.',
    'handover.none':
      'در این حساب پروفایل طفلی نیست، پس چیزی برای سپردن وجود ندارد. شاگردی که از قبل سابقهٔ بزرگسال خودش را دارد اینجا کاری ندارد.',
    'handover.hasLogin':
      'این شاگرد ورود جداگانهٔ خودش را دارد. سپردن سابقه آن حساب را از خودش می‌سازد.',
    'handover.noLogin': 'به این شاگرد از راه حساب فامیل دسترسی است و ورود جداگانه ندارد.',
    'handover.keep': 'نگه داشته شود، به حیث حساب خودش',
    'handover.keepMeans':
      'سابقه از خودش می‌شود: پیشرفت، کارهای تسلیم‌شده و اسنادش دقیقاً در همان‌جا می‌مانند، حسابش دیگر چیزی نیست که سرپرست اداره کند، و از فامیل بیرون می‌شود. این کار به حساب خودش ضرورت دارد؛ اگر ندارد، اول برایش ورود بسازید.',
    'handover.drop': 'نگه داشته نشود',
    'handover.dropMeans':
      'سابقهٔ آموزش سی روز بعد از امروز حذف می‌شود — همان مهلتی که پالیسی اطفال از قبل شرح داده است. سندی که صادر شده شماره‌اش را نگه می‌دارد و هنوز هم تصدیق شده می‌تواند، چون سندی که شاید به کارفرمایی نشان داده شده باید هنوز هم معنا داشته باشد.',
    'handover.keepRefused':
      'این شاگرد هنوز ورود ندارد، پس تا وقتی نداشته باشد این گزینه رد می‌شود. اول در صفحهٔ فامیل برایش ورود بسازید.',
    'handover.declNote':
      'اظهاری که نشانی می‌کنید به انگلیسی نگه داشته شده است: به دلایل حقوقی یک عبارت دارد.',
    'handover.confirmKeep':
      '{name} در این پلتفرم شاگرد بزرگسال می‌شود. پلتفرم این را برگردانده نمی‌تواند؛ دسترسی سرپرست ختم می‌شود.',
    'handover.confirmDrop':
      'سابقهٔ آموزش {name} سی روز بعد از امروز حذف خواهد شد. سندی که صادر شده هنوز هم تصدیق می‌شود.',
    'handover.working': 'در حال اجرا…',
    'handover.doKeep': 'سابقه از خودش شود',
    'handover.doDrop': 'تصمیم به نگه نداشتن',
    'handover.doneKeepLeft':
      'سابقه از خودش است. از حساب فامیل بیرون شده و حسابی که در آن است حساب خودش است.',
    'handover.doneKeep': 'سابقه از خودش است. حسابی که در آن است حساب خودش است.',
    'handover.doneDropOn':
      'سابقه به تاریخ {date} حذف خواهد شد. تا آن وقت چیزی تغییر نمی‌کند و تصمیم ثبت شده است.',
    'handover.doneDrop': 'سابقه سی روز بعد از امروز حذف خواهد شد. تا آن وقت چیزی تغییر نمی‌کند.',
    'handover.errDeclaration':
      'تمام سابقه همین اظهار است: خانه‌ای را که تأیید می‌کند این شاگرد ۱۸ سال یا بیشتر دارد نشانی کنید.',
    'handover.errNeedsAccount':
      'این سابقه فقط وقتی حساب خودش می‌شود که حساب داشته باشد. اول برایش ورود بسازید، بعد بسپارید.',
    'handover.errNotChild': 'آن شاگرد از قبل سابقهٔ خودش را دارد؛ چیزی برای سپردن نیست.',
    'handover.errNotAllowed': 'فقط خود شاگرد یا بزرگسالی از فامیلش سابقه را سپرده می‌تواند.',
    'handover.errNotActive': 'آن سابقه از قبل در راه حذف است.',
    'handover.errAlready': 'از قبل درخواستی روی این سابقه است که هنوز به آن عمل نشده است.',
    'handover.errRefused':
      'انجام نشد. صفحه را دوباره باز کنید و باز کوشش کنید — چیزی تغییر نکرده است.',
    'handover.errUnconfirmed':
      'نتوانستیم مطمئن شویم که انجام شد یا نه. پیش از کوشش دوباره، صفحه را دوباره باز کنید تا ببینید سابقه چه می‌گوید.',
    'handover.policy': 'پالیسی اطفال',
    'handover.family': 'فامیل و اطفال',
  },
  tr: {
    'handover.crumb': 'On sekiz yaşına girmek',
    'handover.eyebrow': 'Kendine ait bir kayıt',
    'handover.title': 'Sahibine geçen bir kayıt',
    'handover.explainer':
      'Platform hiçbir zaman doğum tarihi saklamaz, bu yüzden on sekizinci yaş gününü fark edemez. Bunu birinin söylediği yer burasıdır — kendi girişiyle öğrenci ya da kaydı o güne kadar tutan yetişkin.',
    'handover.decidesLead': 'Burada neye karar verilir.',
    'handover.decides':
      'Bir öğrencinin kaydının kendi hesabı mı olacağına, yoksa saklanmayacağına. Saklamak hiçbir şeyi taşımaz: ilerlemesi, teslim ettikleri ve sertifikaları her zaman onundu; hesap yalnızca bir velinin yönettiği bir şey olmaktan çıkar. Saklamamak kaydı bugünden otuz gün sonra siler.',
    'handover.none':
      'Bu hesapta çocuk profili yok, dolayısıyla devredilecek bir şey de yok. Zaten kendi yetişkin kaydına sahip bir öğrencinin burada yapacağı bir şey yoktur.',
    'handover.hasLogin': 'Bu öğrencinin kendi girişi var. Kaydı devretmek o hesabı onun yapar.',
    'handover.noLogin': 'Bu öğrenciye aile hesabı üzerinden ulaşılıyor ve kendi girişi yok.',
    'handover.keep': 'Saklansın, kendi hesabı olarak',
    'handover.keepMeans':
      'Kayıt onun olur: ilerlemesi, teslim ettikleri ve sertifikaları tam olarak oldukları yerde kalır, hesabı bir velinin yönettiği bir şey olmaktan çıkar ve aileden ayrılır. Bunun için kendi hesabı gerekir; yoksa önce ona bir giriş oluşturun.',
    'handover.drop': 'Saklanmasın',
    'handover.dropMeans':
      'Öğrenme kaydı bugünden otuz gün sonra silinir — çocuk politikasının zaten anlattığı süre budur. Verilmiş bir sertifika numarasını korur ve doğrulanmaya devam eder, çünkü birinin bir işverene göstermiş olabileceği sertifikanın bir anlamı kalmalıdır.',
    'handover.keepRefused':
      'Bu öğrencinin henüz girişi yok, bu yüzden girişi olana kadar bu seçenek reddedilir. Önce aile sayfasında ona bir giriş oluşturun.',
    'handover.declNote':
      'İşaretlediğiniz beyan İngilizce bırakılmıştır: hukuki nedenlerle tek bir metni vardır.',
    'handover.confirmKeep':
      '{name} bu platformda yetişkin öğrenci olur. Platform bunu geri alamaz; velinin erişimi sona erer.',
    'handover.confirmDrop':
      '{name} adlı öğrencinin öğrenme kaydı bugünden otuz gün sonra silinecek. Verilmiş bir sertifika yine doğrulanır.',
    'handover.working': 'İşleniyor…',
    'handover.doKeep': 'Kaydı onun yap',
    'handover.doDrop': 'Saklamamaya karar ver',
    'handover.doneKeepLeft':
      'Kayıt artık onun. Aile hesabından ayrıldı ve içinde bulunduğu hesap kendi hesabı.',
    'handover.doneKeep': 'Kayıt artık onun. İçinde bulunduğu hesap kendi hesabı.',
    'handover.doneDropOn':
      'Kayıt {date} tarihinde silinecek. O zamana kadar hiçbir şey değişmez ve karar kayıtlıdır.',
    'handover.doneDrop':
      'Kayıt bugünden otuz gün sonra silinecek. O zamana kadar hiçbir şey değişmez.',
    'handover.errDeclaration':
      'Kaydın tamamı bu beyandır: bu öğrencinin 18 yaşında veya daha büyük olduğunu doğrulayan kutuyu işaretleyin.',
    'handover.errNeedsAccount':
      'Bu kayıt ancak bir hesabı olduğunda kendi hesabı olabilir. Önce ona bir giriş oluşturun, sonra devredin.',
    'handover.errNotChild': 'O öğrenci zaten kendi kaydına sahip; devredilecek bir şey yok.',
    'handover.errNotAllowed':
      'Bir kaydı yalnızca öğrencinin kendisi veya ailesindeki bir yetişkin devredebilir.',
    'handover.errNotActive': 'O kayıt zaten silinme yolunda.',
    'handover.errAlready': 'Bu kayıt için henüz işleme alınmamış bir istek zaten var.',
    'handover.errRefused':
      'İşlem gerçekleşmedi. Sayfayı yeniden yükleyip tekrar deneyin — hiçbir şey değişmedi.',
    'handover.errUnconfirmed':
      'İşlemin gerçekleşip gerçekleşmediğini doğrulayamadık. Yeniden denemeden önce sayfayı yeniden yükleyip kaydın ne dediğine bakın.',
    'handover.policy': 'Çocuk politikası',
    'handover.family': 'Aile ve çocuklar',
  },
  id: {
    'handover.crumb': 'Menginjak delapan belas tahun',
    'handover.eyebrow': 'Catatan milik sendiri',
    'handover.title': 'Catatan yang menjadi miliknya',
    'handover.explainer':
      'Platform tidak pernah menyimpan tanggal lahir, sehingga tidak dapat mengetahui ulang tahun kedelapan belas. Di sinilah seseorang menyatakannya — peserta didik dengan login miliknya sendiri, atau orang dewasa yang selama ini memegang catatan itu.',
    'handover.decidesLead': 'Apa yang diputuskan di sini.',
    'handover.decides':
      'Apakah catatan seorang peserta didik menjadi akun miliknya sendiri, atau tidak disimpan. Menyimpannya tidak memindahkan apa pun: kemajuan, tugas yang dikumpulkan, dan sertifikatnya memang selalu miliknya, dan akun itu hanya berhenti menjadi sesuatu yang dikelola wali. Tidak menyimpannya menghapus catatan itu tiga puluh hari dari hari ini.',
    'handover.none':
      'Tidak ada profil anak di akun ini, jadi tidak ada yang perlu diserahkan. Peserta didik yang sudah memegang catatan dewasanya sendiri tidak perlu melakukan apa pun di sini.',
    'handover.hasLogin':
      'Peserta didik ini punya login sendiri. Menyerahkan catatan menjadikan akun itu miliknya.',
    'handover.noLogin':
      'Peserta didik ini dijangkau melalui akun keluarga dan tidak punya login sendiri.',
    'handover.keep': 'Simpan, sebagai akun miliknya sendiri',
    'handover.keepMeans':
      'Catatan itu menjadi miliknya: kemajuan, tugas yang dikumpulkan, dan sertifikatnya tetap persis di tempatnya, akunnya berhenti menjadi sesuatu yang dikelola wali, dan keluar dari keluarga. Ini memerlukan akun miliknya sendiri; jika belum ada, buatkan login terlebih dahulu.',
    'handover.drop': 'Jangan disimpan',
    'handover.dropMeans':
      'Catatan pembelajaran dihapus tiga puluh hari dari hari ini — tenggat yang sama dengan yang sudah dijelaskan kebijakan anak. Sertifikat yang sudah diterbitkan tetap memiliki nomornya dan masih dapat diverifikasi, karena sertifikat yang mungkin pernah ditunjukkan kepada pemberi kerja harus tetap bermakna.',
    'handover.keepRefused':
      'Peserta didik ini belum punya login, jadi pilihan ini akan ditolak sampai ia memilikinya. Buatkan login di halaman keluarga terlebih dahulu.',
    'handover.declNote':
      'Pernyataan yang Anda centang tetap dalam bahasa Inggris: susunan katanya hanya satu, karena alasan hukum.',
    'handover.confirmKeep':
      '{name} menjadi peserta didik dewasa di platform ini. Platform tidak dapat membatalkannya; akses wali berakhir.',
    'handover.confirmDrop':
      'Catatan pembelajaran {name} akan dihapus tiga puluh hari dari hari ini. Sertifikat yang sudah diterbitkan tetap dapat diverifikasi.',
    'handover.working': 'Sedang diproses…',
    'handover.doKeep': 'Jadikan catatan itu miliknya',
    'handover.doDrop': 'Putuskan untuk tidak menyimpannya',
    'handover.doneKeepLeft':
      'Catatan itu kini miliknya. Catatan itu telah keluar dari akun keluarga, dan akun tempatnya berada adalah akunnya sendiri.',
    'handover.doneKeep': 'Catatan itu kini miliknya. Akun tempatnya berada adalah akunnya sendiri.',
    'handover.doneDropOn':
      'Catatan akan dihapus pada {date}. Sampai saat itu tidak ada yang berubah, dan keputusannya tercatat.',
    'handover.doneDrop':
      'Catatan akan dihapus tiga puluh hari dari hari ini. Sampai saat itu tidak ada yang berubah.',
    'handover.errDeclaration':
      'Pernyataan itulah seluruh catatannya: centang kotak yang menegaskan bahwa peserta didik ini berusia 18 tahun atau lebih.',
    'handover.errNeedsAccount':
      'Catatan ini baru bisa menjadi akun miliknya setelah ia punya akun. Buatkan login terlebih dahulu, lalu serahkan.',
    'handover.errNotChild':
      'Peserta didik itu sudah memegang catatannya sendiri; tidak ada yang perlu diserahkan.',
    'handover.errNotAllowed':
      'Hanya peserta didik itu sendiri, atau orang dewasa di keluarganya, yang dapat menyerahkan catatan.',
    'handover.errNotActive': 'Catatan itu sudah dalam proses dihapus.',
    'handover.errAlready': 'Sudah ada permintaan atas catatan ini yang belum ditindaklanjuti.',
    'handover.errRefused':
      'Tidak berhasil. Muat ulang halaman dan coba lagi — tidak ada yang berubah.',
    'handover.errUnconfirmed':
      'Kami tidak dapat memastikan apakah itu berhasil. Muat ulang halaman untuk melihat apa yang tertulis di catatan sebelum mencoba lagi.',
    'handover.policy': 'Kebijakan anak',
    'handover.family': 'Keluarga dan anak-anak',
  },
  ms: {
    'handover.crumb': 'Mencapai umur lapan belas',
    'handover.eyebrow': 'Rekod milik sendiri',
    'handover.title': 'Rekod yang menjadi miliknya',
    'handover.explainer':
      'Platform ini tidak pernah menyimpan tarikh lahir, jadi ia tidak dapat mengetahui hari jadi kelapan belas. Di sinilah seseorang menyatakannya — pelajar dengan log masuknya sendiri, atau orang dewasa yang selama ini memegang rekod itu.',
    'handover.decidesLead': 'Apa yang diputuskan di sini.',
    'handover.decides':
      'Sama ada rekod seorang pelajar menjadi akaunnya sendiri, atau tidak disimpan. Menyimpannya tidak memindahkan apa-apa: kemajuan, kerja yang dihantar dan sijilnya memang sentiasa miliknya, dan akaun itu hanya berhenti menjadi sesuatu yang diurus oleh penjaga. Tidak menyimpannya memadamkan rekod itu tiga puluh hari dari hari ini.',
    'handover.none':
      'Tiada profil kanak-kanak pada akaun ini, jadi tiada apa-apa untuk diserahkan. Pelajar yang sudah memegang rekod dewasanya sendiri tidak perlu berbuat apa-apa di sini.',
    'handover.hasLogin':
      'Pelajar ini mempunyai log masuk sendiri. Menyerahkan rekod menjadikan akaun itu miliknya.',
    'handover.noLogin':
      'Pelajar ini dicapai melalui akaun keluarga dan tidak mempunyai log masuk sendiri.',
    'handover.keep': 'Simpan, sebagai akaunnya sendiri',
    'handover.keepMeans':
      'Rekod itu menjadi miliknya: kemajuan, kerja yang dihantar dan sijilnya kekal tepat di tempatnya, akaunnya berhenti menjadi sesuatu yang diurus oleh penjaga, dan ia keluar daripada keluarga. Ini memerlukan akaun miliknya sendiri; jika belum ada, buatkan log masuk untuknya dahulu.',
    'handover.drop': 'Jangan simpan',
    'handover.dropMeans':
      'Rekod pembelajaran dipadamkan tiga puluh hari dari hari ini — tempoh yang sama seperti yang sudah diterangkan dalam dasar kanak-kanak. Sijil yang telah dikeluarkan mengekalkan nombornya dan masih boleh disahkan, kerana sijil yang mungkin pernah ditunjukkan kepada majikan mesti terus membawa makna.',
    'handover.keepRefused':
      'Pelajar ini belum mempunyai log masuk, jadi pilihan ini akan ditolak sehingga dia mempunyainya. Buatkan log masuk untuknya di halaman keluarga dahulu.',
    'handover.declNote':
      'Pernyataan yang anda tandakan dikekalkan dalam bahasa Inggeris: ia mempunyai satu susunan kata sahaja, atas sebab undang-undang.',
    'handover.confirmKeep':
      '{name} menjadi pelajar dewasa di platform ini. Platform tidak dapat membatalkannya; akses penjaga berakhir.',
    'handover.confirmDrop':
      'Rekod pembelajaran {name} akan dipadamkan tiga puluh hari dari hari ini. Sijil yang telah dikeluarkan masih boleh disahkan.',
    'handover.working': 'Sedang diproses…',
    'handover.doKeep': 'Jadikan rekod itu miliknya',
    'handover.doDrop': 'Putuskan untuk tidak menyimpannya',
    'handover.doneKeepLeft':
      'Rekod itu kini miliknya. Ia telah keluar daripada akaun keluarga, dan akaun tempat ia berada ialah akaunnya sendiri.',
    'handover.doneKeep': 'Rekod itu kini miliknya. Akaun tempat ia berada ialah akaunnya sendiri.',
    'handover.doneDropOn':
      'Rekod akan dipadamkan pada {date}. Sehingga itu tiada apa-apa yang berubah, dan keputusan itu direkodkan.',
    'handover.doneDrop':
      'Rekod akan dipadamkan tiga puluh hari dari hari ini. Sehingga itu tiada apa-apa yang berubah.',
    'handover.errDeclaration':
      'Pernyataan itulah keseluruhan rekodnya: tandakan kotak yang mengesahkan bahawa pelajar ini berumur 18 tahun atau lebih.',
    'handover.errNeedsAccount':
      'Rekod ini hanya boleh menjadi akaunnya sendiri setelah dia mempunyai akaun. Buatkan log masuk untuknya dahulu, kemudian serahkan.',
    'handover.errNotChild':
      'Pelajar itu sudah memegang rekodnya sendiri; tiada apa-apa untuk diserahkan.',
    'handover.errNotAllowed':
      'Hanya pelajar itu sendiri, atau orang dewasa dalam keluarganya, boleh menyerahkan rekod.',
    'handover.errNotActive': 'Rekod itu sudah dalam proses dipadamkan.',
    'handover.errAlready': 'Sudah ada permintaan terhadap rekod ini yang belum diambil tindakan.',
    'handover.errRefused':
      'Tidak berjaya. Muat semula halaman dan cuba lagi — tiada apa-apa yang berubah.',
    'handover.errUnconfirmed':
      'Kami tidak dapat memastikan sama ada ia berjaya. Muat semula halaman untuk melihat apa yang tertulis pada rekod sebelum mencuba lagi.',
    'handover.policy': 'Dasar kanak-kanak',
    'handover.family': 'Keluarga dan kanak-kanak',
  },
  bn: {
    'handover.crumb': 'আঠারো বছর হওয়া',
    'handover.eyebrow': 'নিজের একটি রেকর্ড',
    'handover.title': 'যে রেকর্ড তার নিজের হয়ে যায়',
    'handover.explainer':
      'প্ল্যাটফর্ম কখনও জন্মতারিখ সংরক্ষণ করে না, তাই আঠারোতম জন্মদিন সে টের পায় না। এখানেই কেউ সে কথা বলেন — শিক্ষার্থী নিজের লগইন থেকে, অথবা যে প্রাপ্তবয়স্ক এতদিন রেকর্ডটি রেখেছেন।',
    'handover.decidesLead': 'এখানে কী ঠিক হয়।',
    'handover.decides':
      'একজন শিক্ষার্থীর রেকর্ড তার নিজের অ্যাকাউন্ট হবে, নাকি রাখা হবে না। রাখলে কিছুই সরে না: তার অগ্রগতি, জমা দেওয়া কাজ ও সনদ সব সময় তারই ছিল, আর অ্যাকাউন্টটি কেবল অভিভাবকের পরিচালনার বিষয় থাকে না। না রাখলে রেকর্ডটি আজ থেকে ত্রিশ দিন পরে মুছে যায়।',
    'handover.none':
      'এই অ্যাকাউন্টে কোনো শিশুর প্রোফাইল নেই, তাই হস্তান্তর করার কিছু নেই। যে শিক্ষার্থীর আগে থেকেই নিজের প্রাপ্তবয়স্ক রেকর্ড আছে, তার এখানে কিছু করার নেই।',
    'handover.hasLogin':
      'এই শিক্ষার্থীর নিজের লগইন আছে। রেকর্ড হস্তান্তর করলে সেই অ্যাকাউন্ট তার হয়ে যায়।',
    'handover.noLogin':
      'এই শিক্ষার্থীর কাছে পরিবারের অ্যাকাউন্ট দিয়ে পৌঁছানো হয় এবং তার নিজের কোনো লগইন নেই।',
    'handover.keep': 'রাখুন, তার নিজের অ্যাকাউন্ট হিসেবে',
    'handover.keepMeans':
      'রেকর্ডটি তার হয়ে যায়: তার অগ্রগতি, জমা দেওয়া কাজ ও সনদ ঠিক যেখানে আছে সেখানেই থাকে, তার অ্যাকাউন্ট আর অভিভাবকের পরিচালনার বিষয় থাকে না, এবং সেটি পরিবার থেকে বেরিয়ে যায়। এর জন্য তার নিজের অ্যাকাউন্ট লাগে; না থাকলে আগে তার জন্য লগইন তৈরি করুন।',
    'handover.drop': 'রাখবেন না',
    'handover.dropMeans':
      'শেখার রেকর্ড আজ থেকে ত্রিশ দিন পরে মুছে যায় — শিশুদের নীতিতে যে সময়সীমার কথা আগে থেকেই বলা আছে, সেটিই। যে সনদ দেওয়া হয়ে গেছে তার নম্বর থাকে এবং তা তখনও যাচাই করা যায়, কারণ যে সনদ হয়তো কোনো নিয়োগকর্তাকে দেখানো হয়েছে তার অর্থ থেকে যাওয়া দরকার।',
    'handover.keepRefused':
      'এই শিক্ষার্থীর এখনও লগইন নেই, তাই লগইন না হওয়া পর্যন্ত এই বিকল্প প্রত্যাখ্যাত হবে। আগে পরিবারের পাতায় তার জন্য লগইন তৈরি করুন।',
    'handover.declNote':
      'যে বিবৃতিতে আপনি টিক দেন তা ইংরেজিতেই রাখা হয়েছে: আইনি কারণে এর একটিই ভাষ্য।',
    'handover.confirmKeep':
      '{name} এই প্ল্যাটফর্মে প্রাপ্তবয়স্ক শিক্ষার্থী হয়ে যায়। প্ল্যাটফর্ম এটি ফিরিয়ে নিতে পারে না; অভিভাবকের প্রবেশাধিকার শেষ হয়।',
    'handover.confirmDrop':
      '{name}-এর শেখার রেকর্ড আজ থেকে ত্রিশ দিন পরে মুছে যাবে। যে সনদ দেওয়া হয়ে গেছে তা তখনও যাচাই হবে।',
    'handover.working': 'কাজ চলছে…',
    'handover.doKeep': 'রেকর্ডটি তার করে দিন',
    'handover.doDrop': 'না রাখার সিদ্ধান্ত নিন',
    'handover.doneKeepLeft':
      'রেকর্ডটি এখন তার। এটি পরিবারের অ্যাকাউন্ট থেকে বেরিয়ে গেছে, আর যে অ্যাকাউন্টে আছে সেটি তার নিজের।',
    'handover.doneKeep': 'রেকর্ডটি এখন তার। যে অ্যাকাউন্টে এটি আছে সেটি তার নিজের।',
    'handover.doneDropOn':
      'রেকর্ডটি {date} তারিখে মুছে যাবে। তার আগে কিছুই বদলায় না, আর সিদ্ধান্তটি নথিভুক্ত আছে।',
    'handover.doneDrop': 'রেকর্ডটি আজ থেকে ত্রিশ দিন পরে মুছে যাবে। তার আগে কিছুই বদলায় না।',
    'handover.errDeclaration':
      'বিবৃতিটিই পুরো রেকর্ড: যে ঘরটি নিশ্চিত করে যে এই শিক্ষার্থীর বয়স ১৮ বা তার বেশি, তাতে টিক দিন।',
    'handover.errNeedsAccount':
      'এই রেকর্ড তার নিজের অ্যাকাউন্ট হতে পারে কেবল তার একটি অ্যাকাউন্ট থাকলে। আগে তার জন্য লগইন তৈরি করুন, তারপর হস্তান্তর করুন।',
    'handover.errNotChild': 'ওই শিক্ষার্থীর আগে থেকেই নিজের রেকর্ড আছে; হস্তান্তর করার কিছু নেই।',
    'handover.errNotAllowed':
      'কেবল শিক্ষার্থী নিজে, অথবা তার পরিবারের কোনো প্রাপ্তবয়স্ক, রেকর্ড হস্তান্তর করতে পারেন।',
    'handover.errNotActive': 'ওই রেকর্ড আগে থেকেই মুছে যাওয়ার পথে।',
    'handover.errAlready':
      'এই রেকর্ডের ওপর আগে থেকেই একটি অনুরোধ আছে যার ওপর এখনও ব্যবস্থা নেওয়া হয়নি।',
    'handover.errRefused':
      'এটি সম্পন্ন হয়নি। পাতাটি আবার লোড করে আবার চেষ্টা করুন — কিছুই বদলায়নি।',
    'handover.errUnconfirmed':
      'এটি সম্পন্ন হয়েছে কি না আমরা নিশ্চিত করতে পারিনি। আবার চেষ্টা করার আগে পাতাটি আবার লোড করে দেখুন রেকর্ড কী বলছে।',
    'handover.policy': 'শিশুদের নীতি',
    'handover.family': 'পরিবার ও শিশু',
  },
  hi: {
    'handover.crumb': 'अठारह वर्ष का होना',
    'handover.eyebrow': 'अपना रिकॉर्ड',
    'handover.title': 'एक रिकॉर्ड जो उनका अपना हो जाता है',
    'handover.explainer':
      'प्लेटफ़ॉर्म कभी जन्मतिथि नहीं रखता, इसलिए उसे अठारहवें जन्मदिन का पता नहीं चल सकता। यहीं कोई यह बात कहता है — शिक्षार्थी अपने लॉगिन से, या वह वयस्क जो अब तक रिकॉर्ड सँभाले हुए था।',
    'handover.decidesLead': 'यहाँ क्या तय होता है।',
    'handover.decides':
      'यह कि शिक्षार्थी का रिकॉर्ड उसका अपना खाता बने, या रखा न जाए। रखने से कुछ भी इधर-उधर नहीं होता: उसकी प्रगति, जमा किया गया काम और प्रमाणपत्र हमेशा उसी के थे, और खाता बस अभिभावक के प्रबंधन में नहीं रहता। न रखने पर रिकॉर्ड आज से तीस दिन बाद हटा दिया जाता है।',
    'handover.none':
      'इस खाते पर किसी बच्चे की प्रोफ़ाइल नहीं है, इसलिए सौंपने को कुछ नहीं है। जिस शिक्षार्थी के पास पहले से अपना वयस्क रिकॉर्ड है, उसे यहाँ कुछ नहीं करना।',
    'handover.hasLogin':
      'इस शिक्षार्थी का अपना लॉगिन है। रिकॉर्ड सौंपने से वह खाता उसका अपना हो जाता है।',
    'handover.noLogin':
      'इस शिक्षार्थी तक परिवार के खाते से पहुँचा जाता है और उसका अपना लॉगिन नहीं है।',
    'handover.keep': 'रखें, उनके अपने खाते के रूप में',
    'handover.keepMeans':
      'रिकॉर्ड उनका अपना हो जाता है: उनकी प्रगति, जमा किया गया काम और प्रमाणपत्र ठीक वहीं रहते हैं, उनका खाता अभिभावक के प्रबंधन में नहीं रहता, और वह परिवार से निकल जाता है। इसके लिए उनका अपना खाता ज़रूरी है; न हो तो पहले उनका लॉगिन बनाएँ।',
    'handover.drop': 'न रखें',
    'handover.dropMeans':
      'पढ़ाई का रिकॉर्ड आज से तीस दिन बाद हटा दिया जाता है — वही अवधि जो बच्चों की नीति में पहले से बताई गई है। जो प्रमाणपत्र जारी हो चुका है उसका नंबर बना रहता है और उसकी जाँच तब भी हो सकती है, क्योंकि जो प्रमाणपत्र शायद किसी नियोक्ता को दिखाया जा चुका हो उसका अर्थ बना रहना चाहिए।',
    'handover.keepRefused':
      'इस शिक्षार्थी का अभी कोई लॉगिन नहीं है, इसलिए लॉगिन बनने तक यह विकल्प अस्वीकार होगा। पहले परिवार वाले पन्ने पर उनका लॉगिन बनाएँ।',
    'handover.declNote':
      'जिस कथन पर आप निशान लगाते हैं वह अंग्रेज़ी में ही रखा गया है: कानूनी कारणों से उसके शब्द एक ही हैं।',
    'handover.confirmKeep':
      '{name} इस प्लेटफ़ॉर्म पर वयस्क शिक्षार्थी बन जाते हैं। प्लेटफ़ॉर्म इसे वापस नहीं कर सकता; अभिभावक की पहुँच समाप्त हो जाती है।',
    'handover.confirmDrop':
      '{name} की पढ़ाई का रिकॉर्ड आज से तीस दिन बाद हटा दिया जाएगा। जो प्रमाणपत्र जारी हो चुका है उसकी जाँच तब भी होती रहेगी।',
    'handover.working': 'काम चल रहा है…',
    'handover.doKeep': 'रिकॉर्ड उनका अपना करें',
    'handover.doDrop': 'न रखने का निर्णय लें',
    'handover.doneKeepLeft':
      'रिकॉर्ड अब उनका है। वह परिवार के खाते से निकल चुका है, और जिस खाते में है वह उनका अपना है।',
    'handover.doneKeep': 'रिकॉर्ड अब उनका है। जिस खाते में वह है वह उनका अपना है।',
    'handover.doneDropOn':
      'रिकॉर्ड {date} को हटा दिया जाएगा। तब तक कुछ नहीं बदलता, और निर्णय दर्ज है।',
    'handover.doneDrop': 'रिकॉर्ड आज से तीस दिन बाद हटा दिया जाएगा। तब तक कुछ नहीं बदलता।',
    'handover.errDeclaration':
      'कथन ही पूरा रिकॉर्ड है: उस खाने पर निशान लगाएँ जो पुष्टि करता है कि यह शिक्षार्थी 18 वर्ष या उससे अधिक का है।',
    'handover.errNeedsAccount':
      'यह रिकॉर्ड उनका अपना खाता तभी बन सकता है जब उनका कोई खाता हो। पहले उनका लॉगिन बनाएँ, फिर सौंपें।',
    'handover.errNotChild': 'उस शिक्षार्थी के पास पहले से अपना रिकॉर्ड है; सौंपने को कुछ नहीं है।',
    'handover.errNotAllowed':
      'रिकॉर्ड केवल शिक्षार्थी स्वयं या उसके परिवार का कोई वयस्क सौंप सकता है।',
    'handover.errNotActive': 'वह रिकॉर्ड पहले से ही हटाए जाने की राह पर है।',
    'handover.errAlready': 'इस रिकॉर्ड पर पहले से एक अनुरोध है जिस पर अभी कार्रवाई नहीं हुई।',
    'handover.errRefused':
      'यह नहीं हो पाया। पन्ना दोबारा लोड करें और फिर कोशिश करें — कुछ नहीं बदला।',
    'handover.errUnconfirmed':
      'हम पुष्टि नहीं कर सके कि यह हुआ या नहीं। फिर कोशिश करने से पहले पन्ना दोबारा लोड करके देखें कि रिकॉर्ड क्या कहता है।',
    'handover.policy': 'बच्चों की नीति',
    'handover.family': 'परिवार और बच्चे',
  },
  fr: {
    'handover.crumb': 'Avoir dix-huit ans',
    'handover.eyebrow': 'Un dossier à soi',
    'handover.title': 'Un dossier qui devient le sien',
    'handover.explainer':
      'La plateforme n’enregistre jamais de date de naissance ; elle ne peut donc pas remarquer un dix-huitième anniversaire. C’est ici que quelqu’un le dit : l’apprenant avec sa propre connexion, ou l’adulte qui tenait le dossier jusque-là.',
    'handover.decidesLead': 'Ce qui se décide ici.',
    'handover.decides':
      'Si le dossier d’un apprenant devient son propre compte, ou s’il n’est pas conservé. Le conserver ne déplace rien : sa progression, ses travaux rendus et ses certificats ont toujours été les siens, et le compte cesse simplement d’être géré par un tuteur. Ne pas le conserver supprime le dossier dans trente jours à compter d’aujourd’hui.',
    'handover.none':
      'Il n’y a aucun profil d’enfant sur ce compte ; il n’y a donc rien à transmettre. Un apprenant qui détient déjà son propre dossier d’adulte n’a rien à faire ici.',
    'handover.hasLogin':
      'Cet apprenant a sa propre connexion. Transmettre le dossier fait de ce compte le sien.',
    'handover.noLogin':
      'On accède à cet apprenant par le compte de la famille ; il n’a pas de connexion à lui.',
    'handover.keep': 'Le conserver, comme son propre compte',
    'handover.keepMeans':
      'Le dossier devient le sien : sa progression, ses travaux rendus et ses certificats restent exactement où ils sont, son compte cesse d’être géré par un tuteur et il quitte la famille. Il lui faut pour cela un compte à lui ; s’il n’en a pas, créez-lui d’abord une connexion.',
    'handover.drop': 'Ne pas le conserver',
    'handover.dropMeans':
      'Le dossier d’apprentissage est supprimé dans trente jours à compter d’aujourd’hui — le même délai que celui que décrit déjà la politique relative aux enfants. Un certificat déjà délivré garde son numéro et peut toujours être vérifié, car un certificat que quelqu’un a peut-être montré à un employeur doit continuer de signifier quelque chose.',
    'handover.keepRefused':
      'Cet apprenant n’a pas encore de connexion ; cette option sera donc refusée tant qu’il n’en aura pas. Créez-lui d’abord une connexion sur la page de la famille.',
    'handover.declNote':
      'La déclaration que vous cochez reste en anglais : elle n’a qu’une seule formulation, pour des raisons juridiques.',
    'handover.confirmKeep':
      '{name} devient un apprenant adulte sur cette plateforme. La plateforme ne peut pas revenir en arrière ; l’accès du tuteur prend fin.',
    'handover.confirmDrop':
      'Le dossier d’apprentissage de {name} sera supprimé dans trente jours à compter d’aujourd’hui. Un certificat déjà délivré reste vérifiable.',
    'handover.working': 'En cours…',
    'handover.doKeep': 'Faire du dossier le sien',
    'handover.doDrop': 'Décider de ne pas le conserver',
    'handover.doneKeepLeft':
      'Le dossier est le sien. Il a quitté le compte de la famille, et le compte où il se trouve est le sien.',
    'handover.doneKeep': 'Le dossier est le sien. Le compte où il se trouve est le sien.',
    'handover.doneDropOn':
      'Le dossier sera supprimé le {date}. D’ici là rien ne change, et la décision est consignée.',
    'handover.doneDrop':
      'Le dossier sera supprimé dans trente jours à compter d’aujourd’hui. D’ici là rien ne change.',
    'handover.errDeclaration':
      'La déclaration est tout ce qui est consigné : cochez la case confirmant que cet apprenant a 18 ans ou plus.',
    'handover.errNeedsAccount':
      'Ce dossier ne peut devenir son propre compte que lorsqu’il en a un. Créez-lui d’abord une connexion, puis transmettez-le.',
    'handover.errNotChild':
      'Cet apprenant détient déjà son propre dossier ; il n’y a rien à transmettre.',
    'handover.errNotAllowed':
      'Seul l’apprenant, ou un adulte de sa famille, peut transmettre un dossier.',
    'handover.errNotActive': 'Ce dossier est déjà en voie de suppression.',
    'handover.errAlready':
      'Il existe déjà une demande sur ce dossier qui n’a pas encore été traitée.',
    'handover.errRefused':
      'Cela n’a pas abouti. Rechargez la page et réessayez — rien n’a été modifié.',
    'handover.errUnconfirmed':
      'Nous n’avons pas pu confirmer si cela avait abouti. Rechargez la page pour voir ce qu’indique le dossier avant de réessayer.',
    'handover.policy': 'La politique relative aux enfants',
    'handover.family': 'Famille et enfants',
  },
  es: {
    'handover.crumb': 'Cumplir dieciocho años',
    'handover.eyebrow': 'Un registro propio',
    'handover.title': 'Un registro que pasa a ser suyo',
    'handover.explainer':
      'La plataforma nunca guarda una fecha de nacimiento, así que no puede advertir un decimoctavo cumpleaños. Aquí es donde alguien lo dice: el alumno con su propio inicio de sesión, o el adulto que ha tenido el registro a su cargo.',
    'handover.decidesLead': 'Qué se decide aquí.',
    'handover.decides':
      'Si el registro de un alumno pasa a ser su propia cuenta o no se conserva. Conservarlo no mueve nada: su progreso, sus entregas y sus certificados siempre fueron suyos, y la cuenta simplemente deja de ser algo que gestiona un tutor. No conservarlo elimina el registro dentro de treinta días a partir de hoy.',
    'handover.none':
      'No hay ningún perfil infantil en esta cuenta, así que no hay nada que traspasar. Un alumno que ya tiene su propio registro de adulto no tiene nada que hacer aquí.',
    'handover.hasLogin':
      'Este alumno tiene su propio inicio de sesión. Traspasar el registro hace que esa cuenta sea suya.',
    'handover.noLogin':
      'A este alumno se llega a través de la cuenta familiar y no tiene inicio de sesión propio.',
    'handover.keep': 'Conservarlo, como su propia cuenta',
    'handover.keepMeans':
      'El registro pasa a ser suyo: su progreso, sus entregas y sus certificados se quedan exactamente donde están, su cuenta deja de ser algo que gestiona un tutor y sale de la familia. Para ello necesita una cuenta propia; si no la tiene, créele antes un inicio de sesión.',
    'handover.drop': 'No conservarlo',
    'handover.dropMeans':
      'El registro de aprendizaje se elimina dentro de treinta días a partir de hoy: el mismo plazo que ya describe la política de menores. Un certificado ya emitido conserva su número y puede seguir verificándose, porque un certificado que alguien quizá mostró a un empleador tiene que seguir significando algo.',
    'handover.keepRefused':
      'Este alumno aún no tiene inicio de sesión, así que esta opción se rechazará hasta que lo tenga. Créele antes un inicio de sesión en la página de la familia.',
    'handover.declNote':
      'La declaración que marca se mantiene en inglés: tiene una única redacción, por motivos legales.',
    'handover.confirmKeep':
      '{name} pasa a ser un alumno adulto en esta plataforma. La plataforma no puede deshacerlo; el acceso del tutor termina.',
    'handover.confirmDrop':
      'El registro de aprendizaje de {name} se eliminará dentro de treinta días a partir de hoy. Un certificado ya emitido se sigue verificando.',
    'handover.working': 'Procesando…',
    'handover.doKeep': 'Hacer suyo el registro',
    'handover.doDrop': 'Decidir no conservarlo',
    'handover.doneKeepLeft':
      'El registro es suyo. Ha salido de la cuenta familiar, y la cuenta en la que está es la suya.',
    'handover.doneKeep': 'El registro es suyo. La cuenta en la que está es la suya.',
    'handover.doneDropOn':
      'El registro se eliminará el {date}. Hasta entonces no cambia nada, y la decisión queda registrada.',
    'handover.doneDrop':
      'El registro se eliminará dentro de treinta días a partir de hoy. Hasta entonces no cambia nada.',
    'handover.errDeclaration':
      'La declaración es todo lo que queda registrado: marque la casilla que confirma que este alumno tiene 18 años o más.',
    'handover.errNeedsAccount':
      'Este registro solo puede pasar a ser su propia cuenta cuando tenga una. Créele antes un inicio de sesión y después traspáselo.',
    'handover.errNotChild': 'Ese alumno ya tiene su propio registro; no hay nada que traspasar.',
    'handover.errNotAllowed':
      'Solo el alumno, o un adulto de su familia, puede traspasar un registro.',
    'handover.errNotActive': 'Ese registro ya está en proceso de eliminación.',
    'handover.errAlready':
      'Ya hay una solicitud sobre este registro que todavía no se ha atendido.',
    'handover.errRefused':
      'No se ha completado. Recargue la página e inténtelo de nuevo: no se ha cambiado nada.',
    'handover.errUnconfirmed':
      'No hemos podido confirmar si se completó. Recargue la página para ver qué dice el registro antes de volver a intentarlo.',
    'handover.policy': 'La política de menores',
    'handover.family': 'Familia y niños',
  },
  pt: {
    'handover.crumb': 'Fazer dezoito anos',
    'handover.eyebrow': 'Um registo próprio',
    'handover.title': 'Um registo que passa a ser seu',
    'handover.explainer':
      'A plataforma nunca guarda uma data de nascimento, por isso não consegue dar por um décimo oitavo aniversário. É aqui que alguém o diz: o aluno com o seu próprio início de sessão, ou o adulto que tem tido o registo a seu cargo.',
    'handover.decidesLead': 'O que se decide aqui.',
    'handover.decides':
      'Se o registo de um aluno passa a ser a sua própria conta ou se não é conservado. Conservá-lo não move nada: o progresso, os trabalhos entregues e os certificados sempre foram dele, e a conta deixa simplesmente de ser algo que um tutor gere. Não o conservar elimina o registo daqui a trinta dias a contar de hoje.',
    'handover.none':
      'Não há nenhum perfil de criança nesta conta, por isso não há nada a transmitir. Um aluno que já tem o seu próprio registo de adulto não tem nada a fazer aqui.',
    'handover.hasLogin':
      'Este aluno tem um início de sessão próprio. Transmitir o registo faz com que essa conta seja dele.',
    'handover.noLogin':
      'Chega-se a este aluno através da conta da família e ele não tem início de sessão próprio.',
    'handover.keep': 'Conservá-lo, como a sua própria conta',
    'handover.keepMeans':
      'O registo passa a ser dele: o progresso, os trabalhos entregues e os certificados ficam exatamente onde estão, a conta deixa de ser algo que um tutor gere e sai da família. Para isso precisa de uma conta própria; se não tiver, crie-lhe primeiro um início de sessão.',
    'handover.drop': 'Não o conservar',
    'handover.dropMeans':
      'O registo de aprendizagem é eliminado daqui a trinta dias a contar de hoje — o mesmo prazo que a política relativa a crianças já descreve. Um certificado já emitido mantém o seu número e pode continuar a ser verificado, porque um certificado que alguém talvez tenha mostrado a um empregador tem de continuar a significar alguma coisa.',
    'handover.keepRefused':
      'Este aluno ainda não tem início de sessão, por isso esta opção será recusada até que tenha um. Crie-lhe primeiro um início de sessão na página da família.',
    'handover.declNote':
      'A declaração que assinala mantém-se em inglês: tem uma única redação, por razões legais.',
    'handover.confirmKeep':
      '{name} passa a ser um aluno adulto nesta plataforma. A plataforma não pode desfazer isto; o acesso do tutor termina.',
    'handover.confirmDrop':
      'O registo de aprendizagem de {name} será eliminado daqui a trinta dias a contar de hoje. Um certificado já emitido continua a poder ser verificado.',
    'handover.working': 'A processar…',
    'handover.doKeep': 'Tornar o registo dele',
    'handover.doDrop': 'Decidir não o conservar',
    'handover.doneKeepLeft':
      'O registo é dele. Saiu da conta da família, e a conta onde está é a sua própria.',
    'handover.doneKeep': 'O registo é dele. A conta onde está é a sua própria.',
    'handover.doneDropOn':
      'O registo será eliminado em {date}. Até lá nada muda, e a decisão fica registada.',
    'handover.doneDrop':
      'O registo será eliminado daqui a trinta dias a contar de hoje. Até lá nada muda.',
    'handover.errDeclaration':
      'A declaração é tudo o que fica registado: assinale a caixa que confirma que este aluno tem 18 anos ou mais.',
    'handover.errNeedsAccount':
      'Este registo só pode passar a ser a sua própria conta quando ele tiver uma. Crie-lhe primeiro um início de sessão e depois transmita-o.',
    'handover.errNotChild': 'Esse aluno já tem o seu próprio registo; não há nada a transmitir.',
    'handover.errNotAllowed':
      'Só o aluno, ou um adulto da sua família, pode transmitir um registo.',
    'handover.errNotActive': 'Esse registo já está em vias de ser eliminado.',
    'handover.errAlready': 'Já existe um pedido sobre este registo que ainda não foi tratado.',
    'handover.errRefused':
      'Não foi concluído. Recarregue a página e tente de novo — nada foi alterado.',
    'handover.errUnconfirmed':
      'Não conseguimos confirmar se foi concluído. Recarregue a página para ver o que diz o registo antes de tentar de novo.',
    'handover.policy': 'A política relativa a crianças',
    'handover.family': 'Família e crianças',
  },
  sw: {
    'handover.crumb': 'Kutimiza miaka kumi na minane',
    'handover.eyebrow': 'Rekodi yako mwenyewe',
    'handover.title': 'Rekodi inayokuwa yake mwenyewe',
    'handover.explainer':
      'Jukwaa halihifadhi kamwe tarehe ya kuzaliwa, kwa hiyo haliwezi kutambua siku ya kutimiza miaka kumi na minane. Hapa ndipo mtu husema hivyo — mwanafunzi kwa akaunti yake ya kuingia, au mtu mzima ambaye amekuwa akiishikilia rekodi hiyo.',
    'handover.decidesLead': 'Kinachoamuliwa hapa.',
    'handover.decides':
      'Iwapo rekodi ya mwanafunzi inakuwa akaunti yake mwenyewe, au haihifadhiwi. Kuihifadhi hakuhamishi chochote: maendeleo yake, kazi alizowasilisha na vyeti vyake vilikuwa vyake siku zote, na akaunti inaacha tu kuwa kitu kinachosimamiwa na mlezi. Kutoihifadhi kunafuta rekodi siku thelathini kuanzia leo.',
    'handover.none':
      'Hakuna wasifu wa mtoto kwenye akaunti hii, kwa hiyo hakuna cha kukabidhi. Mwanafunzi ambaye tayari ana rekodi yake ya mtu mzima hana la kufanya hapa.',
    'handover.hasLogin':
      'Mwanafunzi huyu ana akaunti yake ya kuingia. Kukabidhi rekodi kunaifanya akaunti hiyo kuwa yake.',
    'handover.noLogin':
      'Mwanafunzi huyu hufikiwa kupitia akaunti ya familia na hana akaunti yake ya kuingia.',
    'handover.keep': 'Ihifadhiwe, kama akaunti yake mwenyewe',
    'handover.keepMeans':
      'Rekodi inakuwa yake: maendeleo yake, kazi alizowasilisha na vyeti vyake vinabaki pale pale vilipo, akaunti yake inaacha kuwa kitu kinachosimamiwa na mlezi, na inaondoka kwenye familia. Hili linahitaji akaunti yake mwenyewe; kama hana, mtengenezee kwanza akaunti ya kuingia.',
    'handover.drop': 'Isihifadhiwe',
    'handover.dropMeans':
      'Rekodi ya masomo hufutwa siku thelathini kuanzia leo — muda uleule ambao sera ya watoto tayari inaueleza. Cheti kilichokwisha kutolewa hubaki na namba yake na bado kinaweza kuthibitishwa, kwa sababu cheti ambacho huenda mtu amemwonyesha mwajiri lazima kiendelee kuwa na maana.',
    'handover.keepRefused':
      'Mwanafunzi huyu bado hana akaunti ya kuingia, kwa hiyo chaguo hili litakataliwa hadi awe nayo. Mtengenezee kwanza akaunti ya kuingia kwenye ukurasa wa familia.',
    'handover.declNote':
      'Tamko unaloweka alama limeachwa kwa Kiingereza: lina maneno ya aina moja tu, kwa sababu za kisheria.',
    'handover.confirmKeep':
      '{name} anakuwa mwanafunzi mtu mzima kwenye jukwaa hili. Jukwaa haliwezi kulitengua hili; ufikiaji wa mlezi unaisha.',
    'handover.confirmDrop':
      'Rekodi ya masomo ya {name} itafutwa siku thelathini kuanzia leo. Cheti kilichokwisha kutolewa bado kinathibitishwa.',
    'handover.working': 'Inashughulikiwa…',
    'handover.doKeep': 'Ifanye rekodi kuwa yake',
    'handover.doDrop': 'Amua kutoihifadhi',
    'handover.doneKeepLeft':
      'Rekodi ni yake. Imeondoka kwenye akaunti ya familia, na akaunti iliyomo ni yake mwenyewe.',
    'handover.doneKeep': 'Rekodi ni yake. Akaunti iliyomo ni yake mwenyewe.',
    'handover.doneDropOn':
      'Rekodi itafutwa tarehe {date}. Hadi hapo hakuna kinachobadilika, na uamuzi umehifadhiwa.',
    'handover.doneDrop':
      'Rekodi itafutwa siku thelathini kuanzia leo. Hadi hapo hakuna kinachobadilika.',
    'handover.errDeclaration':
      'Tamko ndilo rekodi nzima: weka alama kwenye kisanduku kinachothibitisha kwamba mwanafunzi huyu ana miaka 18 au zaidi.',
    'handover.errNeedsAccount':
      'Rekodi hii inaweza kuwa akaunti yake mwenyewe pale tu atakapokuwa na akaunti. Mtengenezee kwanza akaunti ya kuingia, kisha ikabidhi.',
    'handover.errNotChild':
      'Mwanafunzi huyo tayari ana rekodi yake mwenyewe; hakuna cha kukabidhi.',
    'handover.errNotAllowed':
      'Ni mwanafunzi mwenyewe tu, au mtu mzima katika familia yake, anayeweza kukabidhi rekodi.',
    'handover.errNotActive': 'Rekodi hiyo tayari iko njiani kufutwa.',
    'handover.errAlready': 'Tayari kuna ombi kuhusu rekodi hii ambalo bado halijashughulikiwa.',
    'handover.errRefused':
      'Haikufanikiwa. Pakia ukurasa upya na ujaribu tena — hakuna kilichobadilishwa.',
    'handover.errUnconfirmed':
      'Hatukuweza kuthibitisha kama ilifanikiwa. Pakia ukurasa upya uone rekodi inasema nini kabla ya kujaribu tena.',
    'handover.policy': 'Sera ya watoto',
    'handover.family': 'Familia na watoto',
  },
  af: {
    'handover.crumb': 'Om agtien te word',
    'handover.eyebrow': '’n Rekord van jou eie',
    'handover.title': '’n Rekord wat hulle s’n word',
    'handover.explainer':
      'Die platform stoor nooit ’n geboortedatum nie, dus kan dit nie ’n agtiende verjaardag opmerk nie. Dit is hier waar iemand dit sê — die leerder met hul eie aanmelding, of die volwassene wat die rekord tot nou toe gehou het.',
    'handover.decidesLead': 'Wat hier besluit word.',
    'handover.decides':
      'Of ’n leerder se rekord hul eie rekening word, of nie gehou word nie. Om dit te hou, skuif niks: hul vordering, ingehandigde werk en sertifikate was altyd hulle s’n, en die rekening hou eenvoudig op om iets te wees wat ’n voog bestuur. Om dit nie te hou nie, skrap die rekord dertig dae van vandag af.',
    'handover.none':
      'Daar is geen kinderprofiel op hierdie rekening nie, dus is daar niks om oor te dra nie. ’n Leerder wat reeds hul eie volwasse rekord het, hoef niks hier te doen nie.',
    'handover.hasLogin':
      'Hierdie leerder het ’n eie aanmelding. Om die rekord oor te dra, maak daardie rekening hulle s’n.',
    'handover.noLogin':
      'Hierdie leerder word deur die familierekening bereik en het geen eie aanmelding nie.',
    'handover.keep': 'Hou dit, as hul eie rekening',
    'handover.keepMeans':
      'Die rekord word hulle s’n: hul vordering, ingehandigde werk en sertifikate bly presies waar dit is, hul rekening hou op om iets te wees wat ’n voog bestuur, en dit verlaat die familie. Dit vereis ’n rekening van hul eie; as hulle nie een het nie, skep eers vir hulle ’n aanmelding.',
    'handover.drop': 'Moenie dit hou nie',
    'handover.dropMeans':
      'Die leerrekord word dertig dae van vandag af geskrap — dieselfde tydperk wat die kinderbeleid reeds beskryf. ’n Sertifikaat wat reeds uitgereik is, behou sy nommer en kan steeds geverifieer word, want ’n sertifikaat wat iemand dalk vir ’n werkgewer gewys het, moet iets bly beteken.',
    'handover.keepRefused':
      'Hierdie leerder het nog geen aanmelding nie, dus sal hierdie opsie geweier word totdat hulle een het. Skep eers vir hulle ’n aanmelding op die familieblad.',
    'handover.declNote':
      'Die verklaring wat jy merk, word in Engels gehou: dit het een bewoording, om regsredes.',
    'handover.confirmKeep':
      '{name} word ’n volwasse leerder op hierdie platform. Die platform kan dit nie ongedaan maak nie; die voog se toegang eindig.',
    'handover.confirmDrop':
      '{name} se leerrekord sal dertig dae van vandag af geskrap word. ’n Sertifikaat wat reeds uitgereik is, kan steeds geverifieer word.',
    'handover.working': 'Besig…',
    'handover.doKeep': 'Maak die rekord hulle s’n',
    'handover.doDrop': 'Besluit om dit nie te hou nie',
    'handover.doneKeepLeft':
      'Die rekord is hulle s’n. Dit het die familierekening verlaat, en die rekening waarin dit is, is hul eie.',
    'handover.doneKeep': 'Die rekord is hulle s’n. Die rekening waarin dit is, is hul eie.',
    'handover.doneDropOn':
      'Die rekord sal op {date} geskrap word. Tot dan verander niks, en die besluit is op rekord.',
    'handover.doneDrop':
      'Die rekord sal dertig dae van vandag af geskrap word. Tot dan verander niks.',
    'handover.errDeclaration':
      'Die verklaring is die hele rekord: merk die blokkie wat bevestig dat hierdie leerder 18 of ouer is.',
    'handover.errNeedsAccount':
      'Hierdie rekord kan eers hul eie rekening word wanneer hulle een het. Skep eers vir hulle ’n aanmelding en dra dit dan oor.',
    'handover.errNotChild':
      'Daardie leerder het reeds hul eie rekord; daar is niks om oor te dra nie.',
    'handover.errNotAllowed':
      'Slegs die leerder, of ’n volwassene in hul familie, kan ’n rekord oordra.',
    'handover.errNotActive': 'Daardie rekord is reeds op pad uit.',
    'handover.errAlready':
      'Daar is reeds ’n versoek oor hierdie rekord waarop nog nie gehandel is nie.',
    'handover.errRefused':
      'Dit het nie deurgegaan nie. Herlaai die bladsy en probeer weer — niks is verander nie.',
    'handover.errUnconfirmed':
      'Ons kon nie bevestig of dit deurgegaan het nie. Herlaai die bladsy om te sien wat die rekord sê voordat jy weer probeer.',
    'handover.policy': 'Die kinderbeleid',
    'handover.family': 'Familie en kinders',
  },
  'zh-hans': {
    'handover.crumb': '年满十八岁',
    'handover.eyebrow': '属于自己的记录',
    'handover.title': '一份归本人所有的记录',
    'handover.explainer': '平台从不保存出生日期，因此无法察觉十八岁生日。这里就是由人来说明这件事的地方——学习者用自己的登录，或者一直保管这份记录的成年人。',
    'handover.decidesLead': '这里决定什么。',
    'handover.decides':
      '决定学习者的记录是成为其本人的账户，还是不予保留。保留并不移动任何东西：其进度、提交的作业和证书一直都属于本人，账户只是不再由监护人管理。不保留，则记录将在今天起三十天后删除。',
    'handover.none': '此账户上没有儿童档案，因此没有可移交的内容。已持有自己成人记录的学习者在这里无需做任何事。',
    'handover.hasLogin': '这位学习者有自己的登录。移交记录会让该账户归其本人所有。',
    'handover.noLogin': '这位学习者是通过家庭账户访问的，没有自己的登录。',
    'handover.keep': '保留，作为本人的账户',
    'handover.keepMeans': '记录归本人所有：其进度、提交的作业和证书原样留在原处，其账户不再由监护人管理，并离开家庭。这需要本人拥有账户；如果没有，请先为其创建登录。',
    'handover.drop': '不保留',
    'handover.dropMeans':
      '学习记录将在今天起三十天后删除——与儿童政策已说明的期限相同。已颁发的证书保留其编号，仍可验证，因为一张可能已向雇主出示过的证书必须继续有意义。',
    'handover.keepRefused': '这位学习者还没有登录，因此在其拥有登录之前，此选项会被拒绝。请先在家庭页面为其创建登录。',
    'handover.declNote': '你勾选的声明保留英文：出于法律原因，它只有一种措辞。',
    'handover.confirmKeep': '{name} 将成为本平台上的成年学习者。平台无法撤销此操作；监护人的访问权限随之结束。',
    'handover.confirmDrop': '{name} 的学习记录将在今天起三十天后删除。已颁发的证书仍可验证。',
    'handover.working': '处理中…',
    'handover.doKeep': '将记录归本人所有',
    'handover.doDrop': '决定不保留',
    'handover.doneKeepLeft': '记录已归本人所有。它已离开家庭账户，所在的账户就是其本人的账户。',
    'handover.doneKeep': '记录已归本人所有。所在的账户就是其本人的账户。',
    'handover.doneDropOn': '记录将于 {date} 删除。在此之前一切不变，该决定已存档。',
    'handover.doneDrop': '记录将在今天起三十天后删除。在此之前一切不变。',
    'handover.errDeclaration': '这份声明就是全部记录：请勾选确认这位学习者已年满 18 岁的方框。',
    'handover.errNeedsAccount': '只有本人拥有账户后，这份记录才能成为其自己的账户。请先为其创建登录，再进行移交。',
    'handover.errNotChild': '那位学习者已持有自己的记录；没有可移交的内容。',
    'handover.errNotAllowed': '只有学习者本人或其家庭中的成年人可以移交记录。',
    'handover.errNotActive': '那份记录已在删除流程中。',
    'handover.errAlready': '这份记录上已有一项尚未处理的请求。',
    'handover.errRefused': '操作未完成。请重新加载页面后再试——没有任何更改。',
    'handover.errUnconfirmed': '我们无法确认操作是否完成。再次尝试之前，请重新加载页面查看记录的状态。',
    'handover.policy': '儿童政策',
    'handover.family': '家庭与儿童',
  },
  'zh-hant': {
    'handover.crumb': '年滿十八歲',
    'handover.eyebrow': '屬於自己的紀錄',
    'handover.title': '一份歸本人所有的紀錄',
    'handover.explainer': '平台從不儲存出生日期，因此無法察覺十八歲生日。這裡就是由人來說明這件事的地方——學習者用自己的登入，或者一直保管這份紀錄的成年人。',
    'handover.decidesLead': '這裡決定什麼。',
    'handover.decides':
      '決定學習者的紀錄是成為其本人的帳戶，還是不予保留。保留並不移動任何東西：其進度、繳交的作業和證書一直都屬於本人，帳戶只是不再由監護人管理。不保留，則紀錄將在今天起三十天後刪除。',
    'handover.none': '此帳戶上沒有兒童檔案，因此沒有可移交的內容。已持有自己成人紀錄的學習者在這裡無需做任何事。',
    'handover.hasLogin': '這位學習者有自己的登入。移交紀錄會讓該帳戶歸其本人所有。',
    'handover.noLogin': '這位學習者是透過家庭帳戶存取的，沒有自己的登入。',
    'handover.keep': '保留，作為本人的帳戶',
    'handover.keepMeans': '紀錄歸本人所有：其進度、繳交的作業和證書原樣留在原處，其帳戶不再由監護人管理，並離開家庭。這需要本人擁有帳戶；如果沒有，請先為其建立登入。',
    'handover.drop': '不保留',
    'handover.dropMeans':
      '學習紀錄將在今天起三十天後刪除——與兒童政策已說明的期限相同。已頒發的證書保留其編號，仍可驗證，因為一張可能已向雇主出示過的證書必須繼續有意義。',
    'handover.keepRefused': '這位學習者還沒有登入，因此在其擁有登入之前，此選項會被拒絕。請先在家庭頁面為其建立登入。',
    'handover.declNote': '你勾選的聲明保留英文：基於法律原因，它只有一種措辭。',
    'handover.confirmKeep': '{name} 將成為本平台上的成年學習者。平台無法復原此操作；監護人的存取權限隨之結束。',
    'handover.confirmDrop': '{name} 的學習紀錄將在今天起三十天後刪除。已頒發的證書仍可驗證。',
    'handover.working': '處理中…',
    'handover.doKeep': '將紀錄歸本人所有',
    'handover.doDrop': '決定不保留',
    'handover.doneKeepLeft': '紀錄已歸本人所有。它已離開家庭帳戶，所在的帳戶就是其本人的帳戶。',
    'handover.doneKeep': '紀錄已歸本人所有。所在的帳戶就是其本人的帳戶。',
    'handover.doneDropOn': '紀錄將於 {date} 刪除。在此之前一切不變，該決定已存檔。',
    'handover.doneDrop': '紀錄將在今天起三十天後刪除。在此之前一切不變。',
    'handover.errDeclaration': '這份聲明就是全部紀錄：請勾選確認這位學習者已年滿 18 歲的方框。',
    'handover.errNeedsAccount': '只有本人擁有帳戶後，這份紀錄才能成為其自己的帳戶。請先為其建立登入，再進行移交。',
    'handover.errNotChild': '那位學習者已持有自己的紀錄；沒有可移交的內容。',
    'handover.errNotAllowed': '只有學習者本人或其家庭中的成年人可以移交紀錄。',
    'handover.errNotActive': '那份紀錄已在刪除流程中。',
    'handover.errAlready': '這份紀錄上已有一項尚未處理的請求。',
    'handover.errRefused': '操作未完成。請重新載入頁面後再試——沒有任何變更。',
    'handover.errUnconfirmed': '我們無法確認操作是否完成。再次嘗試之前，請重新載入頁面查看紀錄的狀態。',
    'handover.policy': '兒童政策',
    'handover.family': '家庭與兒童',
  },
  vi: {
    'handover.crumb': 'Tròn mười tám tuổi',
    'handover.eyebrow': 'Một hồ sơ của riêng mình',
    'handover.title': 'Một hồ sơ trở thành của chính họ',
    'handover.explainer':
      'Nền tảng không bao giờ lưu ngày sinh, nên không thể nhận biết sinh nhật thứ mười tám. Đây là nơi ai đó nói ra điều đó — học viên bằng đăng nhập riêng của mình, hoặc người lớn lâu nay giữ hồ sơ.',
    'handover.decidesLead': 'Điều được quyết định ở đây.',
    'handover.decides':
      'Hồ sơ của một học viên sẽ trở thành tài khoản của chính họ, hay không được giữ lại. Giữ lại thì không di chuyển gì cả: tiến độ, bài đã nộp và chứng chỉ vốn luôn là của họ, và tài khoản chỉ thôi là thứ do người giám hộ quản lý. Không giữ lại thì hồ sơ sẽ bị xoá sau ba mươi ngày kể từ hôm nay.',
    'handover.none':
      'Tài khoản này không có hồ sơ trẻ em nào, nên không có gì để bàn giao. Học viên đã giữ hồ sơ người lớn của riêng mình thì không cần làm gì ở đây.',
    'handover.hasLogin':
      'Học viên này có đăng nhập riêng. Bàn giao hồ sơ sẽ khiến tài khoản đó thành của họ.',
    'handover.noLogin':
      'Học viên này được truy cập qua tài khoản gia đình và không có đăng nhập riêng.',
    'handover.keep': 'Giữ lại, làm tài khoản của chính họ',
    'handover.keepMeans':
      'Hồ sơ trở thành của họ: tiến độ, bài đã nộp và chứng chỉ vẫn ở nguyên chỗ cũ, tài khoản của họ thôi là thứ do người giám hộ quản lý, và rời khỏi gia đình. Việc này cần một tài khoản của riêng họ; nếu chưa có, hãy tạo đăng nhập cho họ trước.',
    'handover.drop': 'Không giữ lại',
    'handover.dropMeans':
      'Hồ sơ học tập sẽ bị xoá sau ba mươi ngày kể từ hôm nay — đúng thời hạn mà chính sách về trẻ em đã mô tả. Chứng chỉ đã cấp vẫn giữ số của nó và vẫn xác minh được, vì một chứng chỉ có thể đã được đưa cho nhà tuyển dụng xem thì phải tiếp tục có ý nghĩa.',
    'handover.keepRefused':
      'Học viên này chưa có đăng nhập, nên lựa chọn này sẽ bị từ chối cho đến khi họ có. Hãy tạo đăng nhập cho họ ở trang gia đình trước.',
    'handover.declNote':
      'Lời khai bạn đánh dấu được giữ bằng tiếng Anh: vì lý do pháp lý, nó chỉ có một cách diễn đạt.',
    'handover.confirmKeep':
      '{name} trở thành học viên người lớn trên nền tảng này. Nền tảng không thể hoàn tác việc này; quyền truy cập của người giám hộ chấm dứt.',
    'handover.confirmDrop':
      'Hồ sơ học tập của {name} sẽ bị xoá sau ba mươi ngày kể từ hôm nay. Chứng chỉ đã cấp vẫn xác minh được.',
    'handover.working': 'Đang xử lý…',
    'handover.doKeep': 'Chuyển hồ sơ thành của họ',
    'handover.doDrop': 'Quyết định không giữ lại',
    'handover.doneKeepLeft':
      'Hồ sơ đã là của họ. Nó đã rời khỏi tài khoản gia đình, và tài khoản chứa nó là của chính họ.',
    'handover.doneKeep': 'Hồ sơ đã là của họ. Tài khoản chứa nó là của chính họ.',
    'handover.doneDropOn':
      'Hồ sơ sẽ bị xoá vào ngày {date}. Cho đến lúc đó không có gì thay đổi, và quyết định đã được lưu lại.',
    'handover.doneDrop':
      'Hồ sơ sẽ bị xoá sau ba mươi ngày kể từ hôm nay. Cho đến lúc đó không có gì thay đổi.',
    'handover.errDeclaration':
      'Lời khai chính là toàn bộ hồ sơ: hãy đánh dấu vào ô xác nhận học viên này từ 18 tuổi trở lên.',
    'handover.errNeedsAccount':
      'Hồ sơ này chỉ có thể trở thành tài khoản của chính họ khi họ đã có tài khoản. Hãy tạo đăng nhập cho họ trước, rồi bàn giao.',
    'handover.errNotChild': 'Học viên đó đã giữ hồ sơ của riêng mình; không có gì để bàn giao.',
    'handover.errNotAllowed':
      'Chỉ chính học viên, hoặc một người lớn trong gia đình họ, mới có thể bàn giao hồ sơ.',
    'handover.errNotActive': 'Hồ sơ đó đã đang trong quá trình bị xoá.',
    'handover.errAlready': 'Đã có một yêu cầu đối với hồ sơ này chưa được xử lý.',
    'handover.errRefused':
      'Thao tác chưa được thực hiện. Hãy tải lại trang và thử lại — không có gì bị thay đổi.',
    'handover.errUnconfirmed':
      'Chúng tôi không xác nhận được thao tác đã thực hiện hay chưa. Hãy tải lại trang để xem hồ sơ ghi gì trước khi thử lại.',
    'handover.policy': 'Chính sách về trẻ em',
    'handover.family': 'Gia đình và trẻ em',
  },
  th: {
    'handover.crumb': 'อายุครบสิบแปดปี',
    'handover.eyebrow': 'บันทึกที่เป็นของตัวเอง',
    'handover.title': 'บันทึกที่กลายเป็นของเจ้าตัว',
    'handover.explainer':
      'แพลตฟอร์มไม่เคยเก็บวันเกิด จึงไม่อาจรู้ได้ว่าใครอายุครบสิบแปดปี ที่นี่คือที่ที่มีคนบอกเรื่องนั้น — ผู้เรียนด้วยการเข้าสู่ระบบของตัวเอง หรือผู้ใหญ่ที่ดูแลบันทึกนี้มาตลอด',
    'handover.decidesLead': 'สิ่งที่ตัดสินใจที่นี่',
    'handover.decides':
      'บันทึกของผู้เรียนจะกลายเป็นบัญชีของเจ้าตัวเอง หรือจะไม่เก็บไว้ การเก็บไว้ไม่ได้ย้ายอะไรเลย: ความก้าวหน้า งานที่ส่ง และประกาศนียบัตรเป็นของเจ้าตัวมาตลอด และบัญชีเพียงเลิกเป็นสิ่งที่ผู้ปกครองจัดการ การไม่เก็บไว้จะลบบันทึกในอีกสามสิบวันนับจากวันนี้',
    'handover.none':
      'บัญชีนี้ไม่มีโปรไฟล์ของเด็ก จึงไม่มีอะไรให้ส่งมอบ ผู้เรียนที่มีบันทึกแบบผู้ใหญ่ของตัวเองอยู่แล้วไม่ต้องทำอะไรที่นี่',
    'handover.hasLogin':
      'ผู้เรียนคนนี้มีการเข้าสู่ระบบของตัวเอง การส่งมอบบันทึกทำให้บัญชีนั้นเป็นของเจ้าตัว',
    'handover.noLogin': 'ผู้เรียนคนนี้เข้าถึงผ่านบัญชีครอบครัว และไม่มีการเข้าสู่ระบบของตัวเอง',
    'handover.keep': 'เก็บไว้ เป็นบัญชีของเจ้าตัวเอง',
    'handover.keepMeans':
      'บันทึกกลายเป็นของเจ้าตัว: ความก้าวหน้า งานที่ส่ง และประกาศนียบัตรอยู่ที่เดิมทุกประการ บัญชีเลิกเป็นสิ่งที่ผู้ปกครองจัดการ และออกจากครอบครัว เรื่องนี้ต้องมีบัญชีของเจ้าตัวเอง หากยังไม่มี ให้สร้างการเข้าสู่ระบบให้ก่อน',
    'handover.drop': 'ไม่เก็บไว้',
    'handover.dropMeans':
      'บันทึกการเรียนจะถูกลบในอีกสามสิบวันนับจากวันนี้ — ระยะเวลาเดียวกับที่นโยบายสำหรับเด็กระบุไว้อยู่แล้ว ประกาศนียบัตรที่ออกไปแล้วยังคงหมายเลขเดิมและยังตรวจสอบได้ เพราะประกาศนียบัตรที่อาจเคยแสดงต่อนายจ้างต้องยังคงมีความหมาย',
    'handover.keepRefused':
      'ผู้เรียนคนนี้ยังไม่มีการเข้าสู่ระบบ ตัวเลือกนี้จึงจะถูกปฏิเสธจนกว่าจะมี ให้สร้างการเข้าสู่ระบบให้ในหน้าครอบครัวก่อน',
    'handover.declNote':
      'คำแถลงที่คุณทำเครื่องหมายคงไว้เป็นภาษาอังกฤษ: มีถ้อยคำแบบเดียว ด้วยเหตุผลทางกฎหมาย',
    'handover.confirmKeep':
      '{name} จะเป็นผู้เรียนที่เป็นผู้ใหญ่บนแพลตฟอร์มนี้ แพลตฟอร์มย้อนกลับเรื่องนี้ไม่ได้ และสิทธิ์เข้าถึงของผู้ปกครองสิ้นสุดลง',
    'handover.confirmDrop':
      'บันทึกการเรียนของ {name} จะถูกลบในอีกสามสิบวันนับจากวันนี้ ประกาศนียบัตรที่ออกไปแล้วยังตรวจสอบได้',
    'handover.working': 'กำลังดำเนินการ…',
    'handover.doKeep': 'ทำให้บันทึกเป็นของเจ้าตัว',
    'handover.doDrop': 'ตัดสินใจไม่เก็บไว้',
    'handover.doneKeepLeft':
      'บันทึกเป็นของเจ้าตัวแล้ว บันทึกออกจากบัญชีครอบครัวแล้ว และบัญชีที่บันทึกอยู่เป็นของเจ้าตัวเอง',
    'handover.doneKeep': 'บันทึกเป็นของเจ้าตัวแล้ว บัญชีที่บันทึกอยู่เป็นของเจ้าตัวเอง',
    'handover.doneDropOn':
      'บันทึกจะถูกลบในวันที่ {date} จนกว่าจะถึงวันนั้นไม่มีอะไรเปลี่ยน และการตัดสินใจถูกบันทึกไว้แล้ว',
    'handover.doneDrop':
      'บันทึกจะถูกลบในอีกสามสิบวันนับจากวันนี้ จนกว่าจะถึงวันนั้นไม่มีอะไรเปลี่ยน',
    'handover.errDeclaration':
      'คำแถลงคือบันทึกทั้งหมด: ทำเครื่องหมายในช่องที่ยืนยันว่าผู้เรียนคนนี้อายุ 18 ปีขึ้นไป',
    'handover.errNeedsAccount':
      'บันทึกนี้จะเป็นบัญชีของเจ้าตัวเองได้ก็ต่อเมื่อเจ้าตัวมีบัญชีแล้ว ให้สร้างการเข้าสู่ระบบให้ก่อน แล้วจึงส่งมอบ',
    'handover.errNotChild': 'ผู้เรียนคนนั้นมีบันทึกของตัวเองอยู่แล้ว ไม่มีอะไรให้ส่งมอบ',
    'handover.errNotAllowed':
      'มีเพียงผู้เรียนเอง หรือผู้ใหญ่ในครอบครัวของผู้เรียน ที่ส่งมอบบันทึกได้',
    'handover.errNotActive': 'บันทึกนั้นอยู่ระหว่างการถูกลบอยู่แล้ว',
    'handover.errAlready': 'มีคำขอเกี่ยวกับบันทึกนี้อยู่แล้วซึ่งยังไม่ได้ดำเนินการ',
    'handover.errRefused':
      'ดำเนินการไม่สำเร็จ โหลดหน้านี้ใหม่แล้วลองอีกครั้ง — ไม่มีอะไรถูกเปลี่ยน',
    'handover.errUnconfirmed':
      'เราไม่สามารถยืนยันได้ว่าดำเนินการสำเร็จหรือไม่ โหลดหน้านี้ใหม่เพื่อดูว่าบันทึกระบุว่าอย่างไรก่อนลองอีกครั้ง',
    'handover.policy': 'นโยบายสำหรับเด็ก',
    'handover.family': 'ครอบครัวและเด็ก',
  },
  fil: {
    'handover.crumb': 'Pagtuntong sa labingwalong taon',
    'handover.eyebrow': 'Sariling rekord',
    'handover.title': 'Isang rekord na nagiging kanila',
    'handover.explainer':
      'Hindi kailanman nag-iimbak ang plataporma ng petsa ng kapanganakan, kaya hindi nito mapapansin ang ikalabingwalong kaarawan. Dito ito sinasabi ng isang tao — ang mag-aaral gamit ang sarili niyang login, o ang nasa hustong gulang na humahawak ng rekord.',
    'handover.decidesLead': 'Ang pinagpapasyahan dito.',
    'handover.decides':
      'Kung ang rekord ng mag-aaral ay magiging sarili niyang account, o hindi itatago. Walang inililipat ang pagtatago nito: ang kanyang progreso, mga ipinasang gawa at mga sertipiko ay sa kanya noon pa man, at ang account ay titigil lang na maging bagay na pinamamahalaan ng tagapag-alaga. Kapag hindi itinago, buburahin ang rekord tatlumpung araw mula ngayon.',
    'handover.none':
      'Walang profile ng bata sa account na ito, kaya walang maililipat. Ang mag-aaral na may hawak na ng sarili niyang rekord bilang nasa hustong gulang ay walang kailangang gawin dito.',
    'handover.hasLogin':
      'May sariling login ang mag-aaral na ito. Kapag inilipat ang rekord, magiging kanya ang account na iyon.',
    'handover.noLogin':
      'Naaabot ang mag-aaral na ito sa pamamagitan ng account ng pamilya at wala siyang sariling login.',
    'handover.keep': 'Itago, bilang sarili nilang account',
    'handover.keepMeans':
      'Nagiging kanila ang rekord: ang kanilang progreso, mga ipinasang gawa at mga sertipiko ay nananatili sa mismong kinalalagyan, ang kanilang account ay tumitigil na maging bagay na pinamamahalaan ng tagapag-alaga, at umaalis ito sa pamilya. Kailangan nito ng sarili nilang account; kung wala pa, igawa muna sila ng login.',
    'handover.drop': 'Huwag itago',
    'handover.dropMeans':
      'Buburahin ang rekord ng pag-aaral tatlumpung araw mula ngayon — ang parehong takdang inilalarawan na ng patakaran para sa mga bata. Ang sertipikong naibigay na ay nananatili ang numero at mabe-verify pa rin, dahil ang sertipikong maaaring naipakita na sa isang employer ay kailangang manatiling may kahulugan.',
    'handover.keepRefused':
      'Wala pang login ang mag-aaral na ito, kaya tatanggihan ang opsyong ito hangga’t wala. Igawa muna sila ng login sa pahina ng pamilya.',
    'handover.declNote':
      'Ang pahayag na tsine-tsekan mo ay nananatili sa Ingles: iisa ang pananalita nito, sa mga dahilang legal.',
    'handover.confirmKeep':
      'Si {name} ay nagiging mag-aaral na nasa hustong gulang sa platapormang ito. Hindi ito mababawi ng plataporma; nagtatapos ang access ng tagapag-alaga.',
    'handover.confirmDrop':
      'Buburahin ang rekord ng pag-aaral ni {name} tatlumpung araw mula ngayon. Mabe-verify pa rin ang sertipikong naibigay na.',
    'handover.working': 'Ginagawa…',
    'handover.doKeep': 'Gawing kanila ang rekord',
    'handover.doDrop': 'Pasyahang huwag itago',
    'handover.doneKeepLeft':
      'Kanila na ang rekord. Umalis na ito sa account ng pamilya, at ang account na kinalalagyan nito ay sarili nila.',
    'handover.doneKeep': 'Kanila na ang rekord. Ang account na kinalalagyan nito ay sarili nila.',
    'handover.doneDropOn':
      'Buburahin ang rekord sa {date}. Hanggang doon ay walang nagbabago, at nakatala ang pasya.',
    'handover.doneDrop':
      'Buburahin ang rekord tatlumpung araw mula ngayon. Hanggang doon ay walang nagbabago.',
    'handover.errDeclaration':
      'Ang pahayag ang buong rekord: tsekan ang kahong nagpapatunay na 18 taong gulang pataas ang mag-aaral na ito.',
    'handover.errNeedsAccount':
      'Magiging sarili nilang account lang ang rekord na ito kapag may account na sila. Igawa muna sila ng login, saka ilipat.',
    'handover.errNotChild':
      'Hawak na ng mag-aaral na iyon ang sarili niyang rekord; walang maililipat.',
    'handover.errNotAllowed':
      'Ang mag-aaral lang, o isang nasa hustong gulang sa kanyang pamilya, ang makapaglilipat ng rekord.',
    'handover.errNotActive': 'Papunta na sa pagbura ang rekord na iyon.',
    'handover.errAlready': 'Mayroon nang kahilingan sa rekord na ito na hindi pa naaaksyunan.',
    'handover.errRefused':
      'Hindi iyon natuloy. I-reload ang pahina at subukang muli — walang nabago.',
    'handover.errUnconfirmed':
      'Hindi namin matiyak kung natuloy iyon. I-reload ang pahina para makita ang sinasabi ng rekord bago subukang muli.',
    'handover.policy': 'Ang patakaran para sa mga bata',
    'handover.family': 'Pamilya at mga bata',
  },
  uz: {
    'handover.crumb': 'Oʻn sakkiz yoshga toʻlish',
    'handover.eyebrow': 'Oʻziga tegishli yozuv',
    'handover.title': 'Oʻziniki boʻladigan yozuv',
    'handover.explainer':
      'Platforma hech qachon tugʻilgan sanani saqlamaydi, shuning uchun oʻn sakkiz yoshga toʻlganini seza olmaydi. Buni kimdir shu yerda aytadi — oʻquvchi oʻz kirishi orqali yoki yozuvni shu paytgacha yuritib kelgan katta yoshli kishi.',
    'handover.decidesLead': 'Bu yerda nima hal qilinadi.',
    'handover.decides':
      'Oʻquvchining yozuvi oʻz hisobiga aylanadimi yoki saqlanmaydimi. Saqlash hech narsani koʻchirmaydi: uning yutuqlari, topshirgan ishlari va sertifikatlari doim oʻziniki edi, hisob esa shunchaki vasiy boshqaradigan narsa boʻlmay qoladi. Saqlamaslik yozuvni bugundan oʻttiz kun oʻtgach oʻchiradi.',
    'handover.none':
      'Bu hisobda bola profili yoʻq, shuning uchun topshiradigan narsa yoʻq. Oʻzining katta yoshli yozuviga ega oʻquvchi bu yerda hech narsa qilishi shart emas.',
    'handover.hasLogin':
      'Bu oʻquvchining oʻz kirishi bor. Yozuvni topshirish oʻsha hisobni uniki qiladi.',
    'handover.noLogin': 'Bu oʻquvchiga oila hisobi orqali kiriladi va uning oʻz kirishi yoʻq.',
    'handover.keep': 'Saqlansin, oʻz hisobi sifatida',
    'handover.keepMeans':
      'Yozuv uniki boʻladi: yutuqlari, topshirgan ishlari va sertifikatlari aynan oʻz joyida qoladi, hisobi vasiy boshqaradigan narsa boʻlmay qoladi va oiladan chiqadi. Buning uchun oʻz hisobi kerak; agar yoʻq boʻlsa, avval unga kirish yarating.',
    'handover.drop': 'Saqlanmasin',
    'handover.dropMeans':
      'Oʻquv yozuvi bugundan oʻttiz kun oʻtgach oʻchiriladi — bolalar siyosatida allaqachon aytilgan muddatning oʻzi. Berilgan sertifikat raqamini saqlab qoladi va uni hali ham tekshirish mumkin, chunki kimdir ish beruvchiga koʻrsatgan boʻlishi mumkin boʻlgan sertifikat oʻz maʼnosini saqlashi kerak.',
    'handover.keepRefused':
      'Bu oʻquvchining hali kirishi yoʻq, shuning uchun kirishi boʻlmaguncha bu tanlov rad etiladi. Avval oila sahifasida unga kirish yarating.',
    'handover.declNote':
      'Siz belgilaydigan bayonot ingliz tilida qoldirilgan: huquqiy sabablarga koʻra uning matni bitta.',
    'handover.confirmKeep':
      '{name} bu platformada katta yoshli oʻquvchi boʻladi. Platforma buni ortga qaytara olmaydi; vasiyning kirish huquqi tugaydi.',
    'handover.confirmDrop':
      '{name}ning oʻquv yozuvi bugundan oʻttiz kun oʻtgach oʻchiriladi. Berilgan sertifikat baribir tekshiriladi.',
    'handover.working': 'Bajarilmoqda…',
    'handover.doKeep': 'Yozuvni uniki qilish',
    'handover.doDrop': 'Saqlamaslikka qaror qilish',
    'handover.doneKeepLeft':
      'Yozuv endi uniki. U oila hisobidan chiqdi va u joylashgan hisob oʻziniki.',
    'handover.doneKeep': 'Yozuv endi uniki. U joylashgan hisob oʻziniki.',
    'handover.doneDropOn':
      'Yozuv {date} kuni oʻchiriladi. Ungacha hech narsa oʻzgarmaydi va qaror qayd etilgan.',
    'handover.doneDrop':
      'Yozuv bugundan oʻttiz kun oʻtgach oʻchiriladi. Ungacha hech narsa oʻzgarmaydi.',
    'handover.errDeclaration':
      'Bayonotning oʻzi butun yozuvdir: bu oʻquvchi 18 yoshda yoki undan katta ekanini tasdiqlovchi katakchani belgilang.',
    'handover.errNeedsAccount':
      'Bu yozuv uning hisobi boʻlgandagina oʻz hisobiga aylanishi mumkin. Avval unga kirish yarating, soʻng topshiring.',
    'handover.errNotChild': 'U oʻquvchi allaqachon oʻz yozuviga ega; topshiradigan narsa yoʻq.',
    'handover.errNotAllowed':
      'Yozuvni faqat oʻquvchining oʻzi yoki oilasidagi katta yoshli kishi topshira oladi.',
    'handover.errNotActive': 'U yozuv allaqachon oʻchirilish yoʻlida.',
    'handover.errAlready': 'Bu yozuv boʻyicha hali bajarilmagan soʻrov allaqachon bor.',
    'handover.errRefused':
      'Bu amalga oshmadi. Sahifani qayta yuklab, yana urinib koʻring — hech narsa oʻzgarmadi.',
    'handover.errUnconfirmed':
      'Bu amalga oshgan-oshmaganini tasdiqlay olmadik. Yana urinishdan oldin sahifani qayta yuklab, yozuvda nima deyilganini koʻring.',
    'handover.policy': 'Bolalar siyosati',
    'handover.family': 'Oila va bolalar',
  },
  kk: {
    'handover.crumb': 'Он сегізге толу',
    'handover.eyebrow': 'Өзіне тиесілі жазба',
    'handover.title': 'Өзінікі болатын жазба',
    'handover.explainer':
      'Платформа ешқашан туған күнді сақтамайды, сондықтан он сегізге толғанын байқай алмайды. Мұны біреу осы жерде айтады — оқушы өз кіруі арқылы немесе жазбаны осы уақытқа дейін жүргізіп келген ересек адам.',
    'handover.decidesLead': 'Мұнда не шешіледі.',
    'handover.decides':
      'Оқушының жазбасы өз аккаунтына айнала ма, әлде сақталмай ма. Сақтау ештеңені көшірмейді: оның үлгерімі, тапсырған жұмыстары мен сертификаттары әрқашан өзінікі болған, ал аккаунт тек қамқоршы басқаратын нәрсе болудан қалады. Сақтамау жазбаны бүгіннен бастап отыз күннен кейін жояды.',
    'handover.none':
      'Бұл аккаунтта бала профилі жоқ, сондықтан тапсыратын ештеңе жоқ. Өзінің ересек жазбасы бар оқушыға мұнда ештеңе істеудің қажеті жоқ.',
    'handover.hasLogin': 'Бұл оқушының өз кіруі бар. Жазбаны тапсыру сол аккаунтты оныкі етеді.',
    'handover.noLogin':
      'Бұл оқушыға отбасы аккаунты арқылы қол жеткізіледі және оның өз кіруі жоқ.',
    'handover.keep': 'Сақталсын, өз аккаунты ретінде',
    'handover.keepMeans':
      'Жазба оныкі болады: үлгерімі, тапсырған жұмыстары мен сертификаттары дәл өз орнында қалады, аккаунты қамқоршы басқаратын нәрсе болудан қалады және отбасынан шығады. Бұл үшін өз аккаунты керек; егер жоқ болса, алдымен оған кіру жасаңыз.',
    'handover.drop': 'Сақталмасын',
    'handover.dropMeans':
      'Оқу жазбасы бүгіннен бастап отыз күннен кейін жойылады — балалар саясатында бұрыннан сипатталған мерзімнің өзі. Берілген сертификат нөмірін сақтайды және оны әлі де тексеруге болады, өйткені біреу жұмыс берушіге көрсеткен болуы мүмкін сертификат мағынасын жоғалтпауы керек.',
    'handover.keepRefused':
      'Бұл оқушының әлі кіруі жоқ, сондықтан кіруі болғанша бұл таңдау қабылданбайды. Алдымен отбасы бетінде оған кіру жасаңыз.',
    'handover.declNote':
      'Сіз белгілейтін мәлімдеме ағылшын тілінде қалдырылған: құқықтық себептерге байланысты оның мәтіні біреу.',
    'handover.confirmKeep':
      '{name} осы платформада ересек оқушы болады. Платформа мұны кері қайтара алмайды; қамқоршының қол жеткізуі аяқталады.',
    'handover.confirmDrop':
      '{name} оқушысының оқу жазбасы бүгіннен бастап отыз күннен кейін жойылады. Берілген сертификат бәрібір тексеріледі.',
    'handover.working': 'Орындалуда…',
    'handover.doKeep': 'Жазбаны оныкі ету',
    'handover.doDrop': 'Сақтамауға шешім қабылдау',
    'handover.doneKeepLeft':
      'Жазба енді оныкі. Ол отбасы аккаунтынан шықты, ал ол тұрған аккаунт — өзінікі.',
    'handover.doneKeep': 'Жазба енді оныкі. Ол тұрған аккаунт — өзінікі.',
    'handover.doneDropOn':
      'Жазба {date} күні жойылады. Оған дейін ештеңе өзгермейді, ал шешім тіркелген.',
    'handover.doneDrop':
      'Жазба бүгіннен бастап отыз күннен кейін жойылады. Оған дейін ештеңе өзгермейді.',
    'handover.errDeclaration':
      'Мәлімдеменің өзі — бүкіл жазба: осы оқушының 18 жаста немесе одан үлкен екенін растайтын ұяшықты белгілеңіз.',
    'handover.errNeedsAccount':
      'Бұл жазба оның аккаунты болғанда ғана өз аккаунтына айнала алады. Алдымен оған кіру жасаңыз, содан кейін тапсырыңыз.',
    'handover.errNotChild': 'Ол оқушының өз жазбасы бұрыннан бар; тапсыратын ештеңе жоқ.',
    'handover.errNotAllowed':
      'Жазбаны тек оқушының өзі немесе оның отбасындағы ересек адам тапсыра алады.',
    'handover.errNotActive': 'Ол жазба онсыз да жойылу жолында.',
    'handover.errAlready': 'Бұл жазба бойынша әлі орындалмаған сұрау бұрыннан бар.',
    'handover.errRefused':
      'Бұл орындалмады. Бетті қайта жүктеп, қайталап көріңіз — ештеңе өзгерген жоқ.',
    'handover.errUnconfirmed':
      'Мұның орындалған-орындалмағанын растай алмадық. Қайталамас бұрын бетті қайта жүктеп, жазбада не айтылғанын қараңыз.',
    'handover.policy': 'Балалар саясаты',
    'handover.family': 'Отбасы және балалар',
  },
  az: {
    'handover.crumb': 'On səkkiz yaşın tamam olması',
    'handover.eyebrow': 'Özünə məxsus qeyd',
    'handover.title': 'Özününkü olan qeyd',
    'handover.explainer':
      'Platforma heç vaxt doğum tarixini saxlamır, ona görə də on səkkiz yaşın tamam olduğunu hiss edə bilmir. Bunu kimsə burada deyir — öyrənən öz girişi ilə və ya qeydi indiyədək saxlayan yetkin şəxs.',
    'handover.decidesLead': 'Burada nə həll olunur.',
    'handover.decides':
      'Öyrənənin qeydinin öz hesabına çevrilməsi, yoxsa saxlanılmaması. Saxlamaq heç nəyi köçürmür: onun irəliləyişi, təhvil verdiyi işlər və sertifikatları həmişə onun olub, hesab isə sadəcə qəyyumun idarə etdiyi bir şey olmaqdan çıxır. Saxlamamaq qeydi bu gündən otuz gün sonra silir.',
    'handover.none':
      'Bu hesabda uşaq profili yoxdur, ona görə də təhvil veriləsi bir şey yoxdur. Artıq öz yetkin qeydinə sahib olan öyrənənin burada edəcəyi bir şey yoxdur.',
    'handover.hasLogin': 'Bu öyrənənin öz girişi var. Qeydi təhvil vermək həmin hesabı onun edir.',
    'handover.noLogin': 'Bu öyrənənə ailə hesabı vasitəsilə çatılır və onun öz girişi yoxdur.',
    'handover.keep': 'Saxlanılsın, öz hesabı kimi',
    'handover.keepMeans':
      'Qeyd onun olur: irəliləyişi, təhvil verdiyi işlər və sertifikatları olduğu yerdə qalır, hesabı qəyyumun idarə etdiyi bir şey olmaqdan çıxır və ailədən ayrılır. Bunun üçün onun öz hesabı lazımdır; yoxdursa, əvvəlcə ona giriş yaradın.',
    'handover.drop': 'Saxlanılmasın',
    'handover.dropMeans':
      'Təlim qeydi bu gündən otuz gün sonra silinir — uşaqlar üzrə siyasətdə artıq təsvir edilmiş müddətin özü. Verilmiş sertifikat nömrəsini saxlayır və hələ də yoxlanıla bilər, çünki kiminsə işəgötürənə göstərmiş ola biləcəyi sertifikat mənasını saxlamalıdır.',
    'handover.keepRefused':
      'Bu öyrənənin hələ girişi yoxdur, ona görə də girişi olana qədər bu seçim rədd ediləcək. Əvvəlcə ailə səhifəsində ona giriş yaradın.',
    'handover.declNote':
      'İşarələdiyiniz bəyanat ingilis dilində saxlanılıb: hüquqi səbəblərə görə onun bir mətni var.',
    'handover.confirmKeep':
      '{name} bu platformada yetkin öyrənən olur. Platforma bunu geri qaytara bilməz; qəyyumun girişi başa çatır.',
    'handover.confirmDrop':
      '{name} adlı öyrənənin təlim qeydi bu gündən otuz gün sonra silinəcək. Verilmiş sertifikat yenə də yoxlanılır.',
    'handover.working': 'İcra olunur…',
    'handover.doKeep': 'Qeydi onun et',
    'handover.doDrop': 'Saxlamamağa qərar ver',
    'handover.doneKeepLeft':
      'Qeyd artıq onundur. O, ailə hesabından ayrılıb və yerləşdiyi hesab onun özünündür.',
    'handover.doneKeep': 'Qeyd artıq onundur. Yerləşdiyi hesab onun özünündür.',
    'handover.doneDropOn':
      'Qeyd {date} tarixində silinəcək. O vaxta qədər heç nə dəyişmir və qərar qeydə alınıb.',
    'handover.doneDrop': 'Qeyd bu gündən otuz gün sonra silinəcək. O vaxta qədər heç nə dəyişmir.',
    'handover.errDeclaration':
      'Bəyanatın özü bütün qeyddir: bu öyrənənin 18 və ya daha yuxarı yaşda olduğunu təsdiqləyən xananı işarələyin.',
    'handover.errNeedsAccount':
      'Bu qeyd yalnız onun hesabı olduqda öz hesabına çevrilə bilər. Əvvəlcə ona giriş yaradın, sonra təhvil verin.',
    'handover.errNotChild':
      'Həmin öyrənən artıq öz qeydinə sahibdir; təhvil veriləsi bir şey yoxdur.',
    'handover.errNotAllowed':
      'Qeydi yalnız öyrənənin özü və ya ailəsindəki yetkin şəxs təhvil verə bilər.',
    'handover.errNotActive': 'Həmin qeyd artıq silinmə yolundadır.',
    'handover.errAlready': 'Bu qeyd üzrə hələ icra olunmamış sorğu artıq var.',
    'handover.errRefused':
      'Bu baş tutmadı. Səhifəni yenidən yükləyib bir daha cəhd edin — heç nə dəyişməyib.',
    'handover.errUnconfirmed':
      'Bunun baş tutub-tutmadığını təsdiqləyə bilmədik. Yenidən cəhd etməzdən əvvəl səhifəni yenidən yükləyib qeyddə nə yazıldığına baxın.',
    'handover.policy': 'Uşaqlar üzrə siyasət',
    'handover.family': 'Ailə və uşaqlar',
  },
  tg: {
    'handover.crumb': 'Ҳаждаҳсола шудан',
    'handover.eyebrow': 'Сабти худӣ',
    'handover.title': 'Сабте, ки аз они худаш мешавад',
    'handover.explainer':
      'Платформа ҳеҷ гоҳ санаи таваллудро нигоҳ намедорад, бинобар ин ҳаждаҳсола шуданро пай бурда наметавонад. Инро касе дар ҳамин ҷо мегӯяд — хонанда бо воридшавии худаш ё калонсоле, ки то ҳол сабтро нигоҳ медошт.',
    'handover.decidesLead': 'Дар ин ҷо чӣ ҳал мешавад.',
    'handover.decides':
      'Оё сабти хонанда ба ҳисоби худи ӯ табдил меёбад ё нигоҳ дошта намешавад. Нигоҳ доштан чизеро намекӯчонад: пешрафт, корҳои супурда ва шаҳодатномаҳояш ҳамеша аз они худаш буданд ва ҳисоб танҳо чизе буданро бас мекунад, ки сарпараст идора мекунад. Нигоҳ надоштан сабтро сӣ рӯз пас аз имрӯз нест мекунад.',
    'handover.none':
      'Дар ин ҳисоб профили кӯдак нест, бинобар ин чизе барои супурдан нест. Хонандае, ки аллакай сабти калонсолии худро дорад, дар ин ҷо коре надорад.',
    'handover.hasLogin':
      'Ин хонанда воридшавии худро дорад. Супурдани сабт он ҳисобро аз они ӯ мекунад.',
    'handover.noLogin':
      'Ба ин хонанда тавассути ҳисоби оила дастрасӣ ҳаст ва ӯ воридшавии худро надорад.',
    'handover.keep': 'Нигоҳ дошта шавад, ҳамчун ҳисоби худаш',
    'handover.keepMeans':
      'Сабт аз они ӯ мешавад: пешрафт, корҳои супурда ва шаҳодатномаҳояш айнан дар ҷои худ мемонанд, ҳисобаш дигар чизе нест, ки сарпараст идора кунад, ва аз оила мебарояд. Барои ин ҳисоби худаш лозим аст; агар надошта бошад, аввал барояш воридшавӣ созед.',
    'handover.drop': 'Нигоҳ дошта нашавад',
    'handover.dropMeans':
      'Сабти омӯзиш сӣ рӯз пас аз имрӯз нест карда мешавад — ҳамон мӯҳлате, ки сиёсати кӯдакон аллакай тавсиф кардааст. Шаҳодатномаи додашуда рақами худро нигоҳ медорад ва онро ҳанӯз тафтиш кардан мумкин аст, зеро шаҳодатномае, ки шояд касе ба корфармо нишон дода бошад, бояд маънои худро нигоҳ дорад.',
    'handover.keepRefused':
      'Ин хонанда ҳанӯз воридшавӣ надорад, бинобар ин то он даме ки надошта бошад, ин интихоб рад мешавад. Аввал дар саҳифаи оила барояш воридшавӣ созед.',
    'handover.declNote':
      'Изҳороте, ки шумо қайд мекунед, ба забони англисӣ мондааст: бо сабабҳои ҳуқуқӣ он як матн дорад.',
    'handover.confirmKeep':
      '{name} дар ин платформа хонандаи калонсол мешавад. Платформа инро баргардонда наметавонад; дастрасии сарпараст ба охир мерасад.',
    'handover.confirmDrop':
      'Сабти омӯзиши {name} сӣ рӯз пас аз имрӯз нест карда мешавад. Шаҳодатномаи додашуда ба ҳар ҳол тафтиш мешавад.',
    'handover.working': 'Иҷро шуда истодааст…',
    'handover.doKeep': 'Сабтро аз они ӯ кардан',
    'handover.doDrop': 'Қарор додан, ки нигоҳ дошта нашавад',
    'handover.doneKeepLeft':
      'Сабт акнун аз они ӯст. Он аз ҳисоби оила баромад ва ҳисобе, ки дар он аст, аз они худи ӯст.',
    'handover.doneKeep': 'Сабт акнун аз они ӯст. Ҳисобе, ки дар он аст, аз они худи ӯст.',
    'handover.doneDropOn':
      'Сабт {date} нест карда мешавад. То он вақт ҳеҷ чиз тағйир намеёбад ва қарор сабт шудааст.',
    'handover.doneDrop':
      'Сабт сӣ рӯз пас аз имрӯз нест карда мешавад. То он вақт ҳеҷ чиз тағйир намеёбад.',
    'handover.errDeclaration':
      'Худи изҳорот тамоми сабт аст: катакеро қайд кунед, ки тасдиқ мекунад ин хонанда 18-сола ё калонтар аст.',
    'handover.errNeedsAccount':
      'Ин сабт танҳо вақте ба ҳисоби худи ӯ табдил ёфта метавонад, ки ӯ ҳисоб дошта бошад. Аввал барояш воридшавӣ созед, баъд супоред.',
    'handover.errNotChild': 'Он хонанда аллакай сабти худро дорад; чизе барои супурдан нест.',
    'handover.errNotAllowed': 'Сабтро танҳо худи хонанда ё калонсоле аз оилааш супурда метавонад.',
    'handover.errNotActive': 'Он сабт аллакай дар роҳи нест шудан аст.',
    'handover.errAlready': 'Аллакай дархосте оид ба ин сабт ҳаст, ки ҳанӯз иҷро нашудааст.',
    'handover.errRefused':
      'Ин иҷро нашуд. Саҳифаро аз нав бор кунед ва боз кӯшиш кунед — ҳеҷ чиз тағйир наёфтааст.',
    'handover.errUnconfirmed':
      'Мо тасдиқ карда натавонистем, ки ин иҷро шуд ё не. Пеш аз кӯшиши дубора саҳифаро аз нав бор кунед, то бубинед сабт чӣ мегӯяд.',
    'handover.policy': 'Сиёсати кӯдакон',
    'handover.family': 'Оила ва кӯдакон',
  },
  ky: {
    'handover.crumb': 'Он сегизге толуу',
    'handover.eyebrow': 'Өзүнө таандык жазуу',
    'handover.title': 'Өзүнүкү боло турган жазуу',
    'handover.explainer':
      'Платформа эч качан туулган күндү сактабайт, ошондуктан он сегизге толгонун байкай албайт. Муну кимдир бирөө ушул жерде айтат — окуучу өз кирүүсү менен же жазууну ушул убакка чейин жүргүзүп келген чоң киши.',
    'handover.decidesLead': 'Бул жерде эмне чечилет.',
    'handover.decides':
      'Окуучунун жазуусу өз аккаунтуна айланабы же сакталбайбы. Сактоо эч нерсени көчүрбөйт: анын жетишкендиги, тапшырган иштери жана сертификаттары дайыма өзүнүкү болгон, ал эми аккаунт жөн гана камкорчу башкарган нерсе болбой калат. Сактабоо жазууну бүгүндөн тартып отуз күндөн кийин өчүрөт.',
    'handover.none':
      'Бул аккаунтта баланын профили жок, ошондуктан өткөрүп бере турган эч нерсе жок. Өзүнүн чоң кишилик жазуусу бар окуучунун бул жерде кыла турган иши жок.',
    'handover.hasLogin':
      'Бул окуучунун өз кирүүсү бар. Жазууну өткөрүп берүү ошол аккаунтту аныкы кылат.',
    'handover.noLogin':
      'Бул окуучуга үй-бүлөнүн аккаунту аркылуу жетишет жана анын өз кирүүсү жок.',
    'handover.keep': 'Сакталсын, өз аккаунту катары',
    'handover.keepMeans':
      'Жазуу аныкы болот: жетишкендиги, тапшырган иштери жана сертификаттары так ошол жеринде калат, аккаунту камкорчу башкарган нерсе болбой калат жана үй-бүлөдөн чыгат. Бул үчүн өз аккаунту керек; эгер жок болсо, адегенде ага кирүү түзүңүз.',
    'handover.drop': 'Сакталбасын',
    'handover.dropMeans':
      'Окуу жазуусу бүгүндөн тартып отуз күндөн кийин өчүрүлөт — балдар саясатында мурунтан эле сүрөттөлгөн мөөнөттүн өзү. Берилген сертификат номерин сактайт жана аны дагы эле текшерүүгө болот, анткени кимдир бирөө иш берүүчүгө көрсөткөн болушу мүмкүн болгон сертификат маанисин жоготпошу керек.',
    'handover.keepRefused':
      'Бул окуучунун азырынча кирүүсү жок, ошондуктан кирүүсү болмоюнча бул тандоо четке кагылат. Адегенде үй-бүлө барагында ага кирүү түзүңүз.',
    'handover.declNote':
      'Сиз белгилеген билдирүү англис тилинде калтырылган: укуктук себептерден улам анын тексти бирөө гана.',
    'handover.confirmKeep':
      '{name} бул платформада чоң киши окуучу болот. Платформа муну артка кайтара албайт; камкорчунун кирүү укугу аяктайт.',
    'handover.confirmDrop':
      '{name} окуучусунун окуу жазуусу бүгүндөн тартып отуз күндөн кийин өчүрүлөт. Берилген сертификат баары бир текшерилет.',
    'handover.working': 'Аткарылууда…',
    'handover.doKeep': 'Жазууну аныкы кылуу',
    'handover.doDrop': 'Сактабоону чечүү',
    'handover.doneKeepLeft':
      'Жазуу эми аныкы. Ал үй-бүлөнүн аккаунтунан чыкты, ал турган аккаунт өзүнүкү.',
    'handover.doneKeep': 'Жазуу эми аныкы. Ал турган аккаунт өзүнүкү.',
    'handover.doneDropOn':
      'Жазуу {date} күнү өчүрүлөт. Ага чейин эч нерсе өзгөрбөйт, чечим катталган.',
    'handover.doneDrop':
      'Жазуу бүгүндөн тартып отуз күндөн кийин өчүрүлөт. Ага чейин эч нерсе өзгөрбөйт.',
    'handover.errDeclaration':
      'Билдирүүнүн өзү — бүт жазуу: бул окуучу 18 жашта же андан улуу экенин ырастаган кутучаны белгилеңиз.',
    'handover.errNeedsAccount':
      'Бул жазуу анын аккаунту болгондо гана өз аккаунтуна айлана алат. Адегенде ага кирүү түзүп, анан өткөрүп бериңиз.',
    'handover.errNotChild':
      'Ал окуучунун өз жазуусу мурунтан эле бар; өткөрүп бере турган эч нерсе жок.',
    'handover.errNotAllowed':
      'Жазууну окуучунун өзү же анын үй-бүлөсүндөгү чоң киши гана өткөрүп бере алат.',
    'handover.errNotActive': 'Ал жазуу ансыз деле өчүрүлүү жолунда.',
    'handover.errAlready': 'Бул жазуу боюнча али аткарыла элек суроо-талап мурунтан эле бар.',
    'handover.errRefused':
      'Бул ишке ашкан жок. Баракты кайра жүктөп, дагы аракет кылыңыз — эч нерсе өзгөргөн жок.',
    'handover.errUnconfirmed':
      'Мунун ишке ашкан-ашпаганын ырастай алган жокпуз. Кайра аракет кылаардан мурун баракты кайра жүктөп, жазууда эмне деп айтылганын караңыз.',
    'handover.policy': 'Балдар саясаты',
    'handover.family': 'Үй-бүлө жана балдар',
  },
  tk: {
    'handover.crumb': 'On sekiz ýaşa ýetmek',
    'handover.eyebrow': 'Özüne degişli ýazgy',
    'handover.title': 'Özüniňki bolýan ýazgy',
    'handover.explainer':
      'Platforma hiç haçan doglan senäni saklamaýar, şonuň üçin on sekiz ýaşa ýetilendigini duýup bilmeýär. Muny kimdir biri şu ýerde aýdýar — okuwçy öz girişi bilen ýa-da ýazgyny şu wagta çenli saklap gelen uly ýaşly adam.',
    'handover.decidesLead': 'Bu ýerde näme çözülýär.',
    'handover.decides':
      'Okuwçynyň ýazgysy öz hasabyna öwrülýärmi ýa-da saklanmaýarmy. Saklamak hiç zady göçürmeýär: onuň öňegidişligi, tabşyran işleri we şahadatnamalary hemişe özüniňkidi, hasap bolsa diňe howandaryň dolandyrýan zady bolmagyny bes edýär. Saklamazlyk ýazgyny şu günden otuz gün soň pozýar.',
    'handover.none':
      'Bu hasapda çaga profili ýok, şonuň üçin tabşyrjak zat ýok. Eýýäm öz uly ýaşly ýazgysy bar okuwçynyň bu ýerde etjek işi ýok.',
    'handover.hasLogin': 'Bu okuwçynyň öz girişi bar. Ýazgyny tabşyrmak şol hasaby onuňky edýär.',
    'handover.noLogin': 'Bu okuwça maşgala hasaby arkaly ýetilýär we onuň öz girişi ýok.',
    'handover.keep': 'Saklansyn, öz hasaby hökmünde',
    'handover.keepMeans':
      'Ýazgy onuňky bolýar: öňegidişligi, tabşyran işleri we şahadatnamalary edil öz ýerinde galýar, hasaby howandaryň dolandyrýan zady bolmagyny bes edýär we maşgaladan çykýar. Munuň üçin öz hasaby gerek; ýok bolsa, ilki oňa giriş dörediň.',
    'handover.drop': 'Saklanmasyn',
    'handover.dropMeans':
      'Okuw ýazgysy şu günden otuz gün soň pozulýar — çagalar syýasatynda eýýäm beýan edilen möhletiň özi. Berlen şahadatnama belgisini saklaýar we ony henizem barlap bolýar, sebäbi kimdir biriniň iş berijä görkezen bolmagy mümkin şahadatnama manysyny ýitirmeli däl.',
    'handover.keepRefused':
      'Bu okuwçynyň entek girişi ýok, şonuň üçin girişi bolýança bu saýlaw ret ediler. Ilki maşgala sahypasynda oňa giriş dörediň.',
    'handover.declNote':
      'Siziň bellik edýän beýanyňyz iňlis dilinde galdyrylan: hukuk sebäplere görä onuň bir ýazgysy bar.',
    'handover.confirmKeep':
      '{name} bu platformada uly ýaşly okuwçy bolýar. Platforma muny yzyna gaýtaryp bilmeýär; howandaryň elýeterliligi gutarýar.',
    'handover.confirmDrop':
      '{name} atly okuwçynyň okuw ýazgysy şu günden otuz gün soň pozular. Berlen şahadatnama barybir barlanýar.',
    'handover.working': 'Ýerine ýetirilýär…',
    'handover.doKeep': 'Ýazgyny onuňky etmek',
    'handover.doDrop': 'Saklamazlygy karar etmek',
    'handover.doneKeepLeft':
      'Ýazgy indi onuňky. Ol maşgala hasabyndan çykdy we duran hasaby öz hasabydyr.',
    'handover.doneKeep': 'Ýazgy indi onuňky. Onuň duran hasaby öz hasabydyr.',
    'handover.doneDropOn':
      'Ýazgy {date} güni pozular. Şoňa çenli hiç zat üýtgemeýär we karar bellige alnan.',
    'handover.doneDrop': 'Ýazgy şu günden otuz gün soň pozular. Şoňa çenli hiç zat üýtgemeýär.',
    'handover.errDeclaration':
      'Beýanyň özi tutuş ýazgydyr: bu okuwçynyň 18 ýaşynda ýa-da ondan uludygyny tassyklaýan gutujygy belläň.',
    'handover.errNeedsAccount':
      'Bu ýazgy diňe onuň hasaby bolanda öz hasabyna öwrülip biler. Ilki oňa giriş dörediň, soň tabşyryň.',
    'handover.errNotChild': 'Ol okuwçynyň eýýäm öz ýazgysy bar; tabşyrjak zat ýok.',
    'handover.errNotAllowed':
      'Ýazgyny diňe okuwçynyň özi ýa-da maşgalasyndaky uly ýaşly adam tabşyryp bilýär.',
    'handover.errNotActive': 'Ol ýazgy eýýäm pozulmak ýolunda.',
    'handover.errAlready': 'Bu ýazgy boýunça entek ýerine ýetirilmedik haýyş eýýäm bar.',
    'handover.errRefused':
      'Bu amala aşmady. Sahypany täzeden ýükläp, ýene synanyşyň — hiç zat üýtgedilmedi.',
    'handover.errUnconfirmed':
      'Munuň amala aşandygyny ýa-da aşmandygyny tassyklap bilmedik. Ýene synanyşmazdan öň sahypany täzeden ýükläp, ýazgyda näme diýilýändigine serediň.',
    'handover.policy': 'Çagalar syýasaty',
    'handover.family': 'Maşgala we çagalar',
  },
  ta: {
    'handover.crumb': 'பதினெட்டு வயது நிறைவடைதல்',
    'handover.eyebrow': 'தமக்கே உரிய பதிவு',
    'handover.title': 'அவருக்கே உரியதாகும் பதிவு',
    'handover.explainer':
      'இந்தத் தளம் பிறந்த தேதியை ஒருபோதும் சேமிப்பதில்லை; ஆகவே பதினெட்டாவது பிறந்தநாளை அதனால் கவனிக்க முடியாது. அதை ஒருவர் சொல்லும் இடம் இதுதான் — கற்பவர் தம் சொந்த உள்நுழைவில், அல்லது இதுவரை பதிவை வைத்திருந்த பெரியவர்.',
    'handover.decidesLead': 'இங்கு தீர்மானிக்கப்படுவது.',
    'handover.decides':
      'கற்பவரின் பதிவு அவரது சொந்தக் கணக்காக மாறுமா, அல்லது வைத்திருக்கப்படாதா என்பது. வைத்திருப்பது எதையும் நகர்த்தாது: அவரது முன்னேற்றம், சமர்ப்பித்த பணிகள், சான்றிதழ்கள் எப்போதும் அவருடையவையே; கணக்கு பாதுகாவலர் நிர்வகிக்கும் ஒன்றாக இருப்பது மட்டும் நின்றுவிடும். வைத்திருக்காவிட்டால் பதிவு இன்றிலிருந்து முப்பது நாட்களில் நீக்கப்படும்.',
    'handover.none':
      'இந்தக் கணக்கில் குழந்தைச் சுயவிவரம் இல்லை; ஆகவே ஒப்படைக்க எதுவும் இல்லை. ஏற்கெனவே தம் சொந்த வயதுவந்தோர் பதிவை வைத்திருக்கும் கற்பவர் இங்கு செய்ய வேண்டியது எதுவும் இல்லை.',
    'handover.hasLogin':
      'இந்தக் கற்பவருக்குச் சொந்த உள்நுழைவு உள்ளது. பதிவை ஒப்படைத்தால் அந்தக் கணக்கு அவருடையதாகிவிடும்.',
    'handover.noLogin':
      'இந்தக் கற்பவரைக் குடும்பக் கணக்கின் வழியாகவே அணுக முடியும்; அவருக்குச் சொந்த உள்நுழைவு இல்லை.',
    'handover.keep': 'வைத்திருக்க, அவரது சொந்தக் கணக்காக',
    'handover.keepMeans':
      'பதிவு அவருடையதாகிறது: அவரது முன்னேற்றம், சமர்ப்பித்த பணிகள், சான்றிதழ்கள் இருந்த இடத்திலேயே இருக்கும்; அவரது கணக்கு பாதுகாவலர் நிர்வகிக்கும் ஒன்றாக இருப்பது நின்றுவிடும்; அது குடும்பத்திலிருந்து வெளியேறும். இதற்கு அவருக்குச் சொந்தக் கணக்கு தேவை; இல்லையெனில் முதலில் அவருக்கு உள்நுழைவை உருவாக்குங்கள்.',
    'handover.drop': 'வைத்திருக்க வேண்டாம்',
    'handover.dropMeans':
      'கற்றல் பதிவு இன்றிலிருந்து முப்பது நாட்களில் நீக்கப்படும் — குழந்தைகள் கொள்கை ஏற்கெனவே விவரிக்கும் அதே காலக்கெடு. ஏற்கெனவே வழங்கப்பட்ட சான்றிதழ் தன் எண்ணைத் தக்கவைத்துக்கொள்ளும்; அதை இன்னும் சரிபார்க்கலாம், ஏனெனில் ஒருவர் வேலை வழங்குபவரிடம் காட்டியிருக்கக்கூடிய சான்றிதழ் தொடர்ந்து பொருள் கொண்டிருக்க வேண்டும்.',
    'handover.keepRefused':
      'இந்தக் கற்பவருக்கு இன்னும் உள்நுழைவு இல்லை; ஆகவே அது கிடைக்கும் வரை இந்தத் தேர்வு மறுக்கப்படும். முதலில் குடும்பப் பக்கத்தில் அவருக்கு உள்நுழைவை உருவாக்குங்கள்.',
    'handover.declNote':
      'நீங்கள் குறியிடும் அறிவிப்பு ஆங்கிலத்திலேயே வைக்கப்பட்டுள்ளது: சட்டக் காரணங்களுக்காக அதற்கு ஒரே சொல்லமைப்புதான்.',
    'handover.confirmKeep':
      '{name} இந்தத் தளத்தில் வயதுவந்த கற்பவராகிறார். தளத்தால் இதைத் திரும்பப்பெற முடியாது; பாதுகாவலரின் அணுகல் முடிவடைகிறது.',
    'handover.confirmDrop':
      '{name} என்பவரின் கற்றல் பதிவு இன்றிலிருந்து முப்பது நாட்களில் நீக்கப்படும். ஏற்கெனவே வழங்கப்பட்ட சான்றிதழ் தொடர்ந்து சரிபார்க்கப்படும்.',
    'handover.working': 'செயல்படுகிறது…',
    'handover.doKeep': 'பதிவை அவருடையதாக்குக',
    'handover.doDrop': 'வைத்திருக்க வேண்டாம் எனத் தீர்மானிக்க',
    'handover.doneKeepLeft':
      'பதிவு இப்போது அவருடையது. அது குடும்பக் கணக்கிலிருந்து வெளியேறிவிட்டது; அது இருக்கும் கணக்கு அவரது சொந்தக் கணக்கு.',
    'handover.doneKeep': 'பதிவு இப்போது அவருடையது. அது இருக்கும் கணக்கு அவரது சொந்தக் கணக்கு.',
    'handover.doneDropOn':
      'பதிவு {date} அன்று நீக்கப்படும். அதுவரை எதுவும் மாறாது; முடிவு பதிவில் உள்ளது.',
    'handover.doneDrop':
      'பதிவு இன்றிலிருந்து முப்பது நாட்களில் நீக்கப்படும். அதுவரை எதுவும் மாறாது.',
    'handover.errDeclaration':
      'அறிவிப்பே முழுப் பதிவு: இந்தக் கற்பவருக்கு 18 வயது அல்லது அதற்கு மேல் என்பதை உறுதிப்படுத்தும் பெட்டியைக் குறியிடுங்கள்.',
    'handover.errNeedsAccount':
      'அவருக்குக் கணக்கு இருந்தால் மட்டுமே இந்தப் பதிவு அவரது சொந்தக் கணக்காக முடியும். முதலில் அவருக்கு உள்நுழைவை உருவாக்கி, பிறகு ஒப்படையுங்கள்.',
    'handover.errNotChild':
      'அந்தக் கற்பவர் ஏற்கெனவே தம் சொந்தப் பதிவை வைத்திருக்கிறார்; ஒப்படைக்க எதுவும் இல்லை.',
    'handover.errNotAllowed':
      'கற்பவர் தாமே, அல்லது அவரது குடும்பத்திலுள்ள ஒரு பெரியவர் மட்டுமே பதிவை ஒப்படைக்க முடியும்.',
    'handover.errNotActive': 'அந்தப் பதிவு ஏற்கெனவே நீக்கப்படும் வழியில் உள்ளது.',
    'handover.errAlready':
      'இந்தப் பதிவின் மீது இன்னும் நடவடிக்கை எடுக்கப்படாத ஒரு கோரிக்கை ஏற்கெனவே உள்ளது.',
    'handover.errRefused':
      'அது நிறைவேறவில்லை. பக்கத்தை மீண்டும் ஏற்றி மறுபடி முயலுங்கள் — எதுவும் மாற்றப்படவில்லை.',
    'handover.errUnconfirmed':
      'அது நிறைவேறியதா என்பதை எங்களால் உறுதிப்படுத்த முடியவில்லை. மறுபடி முயலும் முன் பக்கத்தை மீண்டும் ஏற்றி, பதிவு என்ன சொல்கிறது என்று பாருங்கள்.',
    'handover.policy': 'குழந்தைகள் கொள்கை',
    'handover.family': 'குடும்பமும் குழந்தைகளும்',
  },
  ne: {
    'handover.crumb': 'अठार वर्ष पुग्नु',
    'handover.eyebrow': 'आफ्नै अभिलेख',
    'handover.title': 'उहाँको आफ्नै हुने अभिलेख',
    'handover.explainer':
      'यो प्लेटफर्मले जन्म मिति कहिल्यै राख्दैन, त्यसैले अठारौँ जन्मदिन थाहा पाउन सक्दैन। कसैले त्यो कुरा भन्ने ठाउँ यही हो — सिकारुले आफ्नै लगइनबाट, वा अहिलेसम्म अभिलेख सम्हाल्दै आएका वयस्कले।',
    'handover.decidesLead': 'यहाँ के निर्णय हुन्छ।',
    'handover.decides':
      'सिकारुको अभिलेख उहाँको आफ्नै खाता बन्छ कि राखिँदैन भन्ने। राख्दा केही पनि सर्दैन: उहाँको प्रगति, बुझाएका काम र प्रमाणपत्रहरू सधैँ उहाँकै थिए, र खाता अभिभावकले सम्हाल्ने कुरा मात्र रहँदैन। नराख्दा अभिलेख आजदेखि तीस दिनपछि मेटिन्छ।',
    'handover.none':
      'यो खातामा कुनै बालबालिकाको प्रोफाइल छैन, त्यसैले हस्तान्तरण गर्ने केही छैन। पहिले नै आफ्नै वयस्क अभिलेख भएका सिकारुले यहाँ केही गर्नुपर्दैन।',
    'handover.hasLogin':
      'यी सिकारुको आफ्नै लगइन छ। अभिलेख हस्तान्तरण गर्दा त्यो खाता उहाँको हुन्छ।',
    'handover.noLogin': 'यी सिकारुसम्म परिवारको खाताबाट पुगिन्छ र उहाँको आफ्नै लगइन छैन।',
    'handover.keep': 'राख्नुहोस्, उहाँको आफ्नै खाताका रूपमा',
    'handover.keepMeans':
      'अभिलेख उहाँको हुन्छ: उहाँको प्रगति, बुझाएका काम र प्रमाणपत्रहरू जहाँ छन् त्यहीँ रहन्छन्, उहाँको खाता अभिभावकले सम्हाल्ने कुरा रहँदैन, र त्यो परिवारबाट बाहिरिन्छ। यसका लागि उहाँको आफ्नै खाता चाहिन्छ; छैन भने पहिले उहाँका लागि लगइन बनाउनुहोस्।',
    'handover.drop': 'नराख्नुहोस्',
    'handover.dropMeans':
      'सिकाइको अभिलेख आजदेखि तीस दिनपछि मेटिन्छ — बालबालिकासम्बन्धी नीतिले पहिले नै बताएको उही अवधि। जारी भइसकेको प्रमाणपत्रको नम्बर रहिरहन्छ र त्यसलाई अझै जाँच्न सकिन्छ, किनभने कसैले रोजगारदातालाई देखाएको हुन सक्ने प्रमाणपत्रको अर्थ रहिरहनुपर्छ।',
    'handover.keepRefused':
      'यी सिकारुको अझै लगइन छैन, त्यसैले लगइन नभएसम्म यो विकल्प अस्वीकार हुन्छ। पहिले परिवारको पृष्ठमा उहाँका लागि लगइन बनाउनुहोस्।',
    'handover.declNote':
      'तपाईंले चिनो लगाउने कथन अङ्ग्रेजीमै राखिएको छ: कानुनी कारणले यसको एउटै शब्दावली छ।',
    'handover.confirmKeep':
      '{name} यस प्लेटफर्ममा वयस्क सिकारु बन्नुहुन्छ। प्लेटफर्मले यो फिर्ता गर्न सक्दैन; अभिभावकको पहुँच अन्त्य हुन्छ।',
    'handover.confirmDrop':
      '{name} को सिकाइको अभिलेख आजदेखि तीस दिनपछि मेटिनेछ। जारी भइसकेको प्रमाणपत्र अझै जाँच्न सकिन्छ।',
    'handover.working': 'काम हुँदै छ…',
    'handover.doKeep': 'अभिलेख उहाँको बनाउनुहोस्',
    'handover.doDrop': 'नराख्ने निर्णय गर्नुहोस्',
    'handover.doneKeepLeft':
      'अभिलेख अब उहाँको हो। यो परिवारको खाताबाट बाहिरिएको छ, र यो रहेको खाता उहाँको आफ्नै हो।',
    'handover.doneKeep': 'अभिलेख अब उहाँको हो। यो रहेको खाता उहाँको आफ्नै हो।',
    'handover.doneDropOn':
      'अभिलेख {date} मा मेटिनेछ। त्यति बेलासम्म केही फेरिँदैन, र निर्णय अभिलेखमा छ।',
    'handover.doneDrop': 'अभिलेख आजदेखि तीस दिनपछि मेटिनेछ। त्यति बेलासम्म केही फेरिँदैन।',
    'handover.errDeclaration':
      'कथन नै पूरा अभिलेख हो: यी सिकारु १८ वर्ष वा सोभन्दा माथिका हुन् भनी पुष्टि गर्ने कोठामा चिनो लगाउनुहोस्।',
    'handover.errNeedsAccount':
      'उहाँको खाता भएपछि मात्र यो अभिलेख उहाँको आफ्नै खाता बन्न सक्छ। पहिले उहाँका लागि लगइन बनाउनुहोस्, अनि हस्तान्तरण गर्नुहोस्।',
    'handover.errNotChild': 'ती सिकारुसँग पहिले नै आफ्नै अभिलेख छ; हस्तान्तरण गर्ने केही छैन।',
    'handover.errNotAllowed':
      'सिकारु आफैँले वा उहाँको परिवारका वयस्कले मात्र अभिलेख हस्तान्तरण गर्न सक्छन्।',
    'handover.errNotActive': 'त्यो अभिलेख पहिले नै मेटिने क्रममा छ।',
    'handover.errAlready': 'यो अभिलेखमा अझै कारबाही नभएको अनुरोध पहिले नै छ।',
    'handover.errRefused':
      'त्यो सम्पन्न भएन। पृष्ठ फेरि लोड गरेर फेरि प्रयास गर्नुहोस् — केही फेरिएको छैन।',
    'handover.errUnconfirmed':
      'त्यो सम्पन्न भयो कि भएन भनी हामीले पुष्टि गर्न सकेनौँ। फेरि प्रयास गर्नुअघि पृष्ठ फेरि लोड गरेर अभिलेखले के भन्छ हेर्नुहोस्।',
    'handover.policy': 'बालबालिकासम्बन्धी नीति',
    'handover.family': 'परिवार र बालबालिका',
  },
};
