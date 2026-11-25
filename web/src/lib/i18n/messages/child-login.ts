import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * A child's own login, on the child's card on `/family`
 * (`app/family/child-login-card.tsx`): making it, setting a new password,
 * detaching it, and every refusal the card can show.
 *
 * The keys are `family.login*`: the card belongs to the family page and is
 * handed its words by it. They are in a file of their own only because they
 * were written later than `family.ts`, on 2026-11-25.
 *
 * Three sentences must not be softened. `loginConfirmTwelve` is what a
 * guardian declares, and it says two more things: no date of birth is asked
 * for, and the answer is recorded. `loginDetachMeans` says what detaching
 * does not do: the sign-in is not deleted and open sessions are not ended.
 * The three `loginUnconfirmed*` sentences say that we do not know whether
 * the change happened; a translation that says it failed would send a
 * guardian to make a second login.
 *
 * A username is letters a to z, digits, dots, dashes and underscores.
 * Where a language writes in another script, or has letters beyond those
 * twenty-six, the two sentences about it say English or Latin letters.
 *
 * Same rule as `learn.ts` and every part after it: written for the
 * twenty-seven languages with nothing held in `held.ts`, and for no other.
 * See `UNWRITTEN_WHILE_HELD`.
 *
 * `{name}` is the child's name, `{username}` the username, `{date}` the day
 * the login was made and `{email}` the address to write to; the card puts
 * them in. No speaker has read any of these yet.
 */
export const CHILD_LOGIN: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'family.loginLinked': 'تم ربط ملف المتعلّم الخاص بـ {name}.',
    'family.loginUsernameIs': 'اسم المستخدم هو {username}.',
    'family.loginRecovered':
      'استُعيد هذا من محاولة سابقة. كلمة المرور التي وُضعت في تلك المحاولة ما زالت سارية، وكلمة المرور التي أدخلتها في هذه المحاولة لم تحلّ محلّها.',
    'family.loginHandOver':
      'أعطِ الطفل كلمة المرور التي اخترتها. عند أول تسجيل دخول سيُطلب منه أن يختار كلمة مرور خاصة به، ولن تراها أنت.',
    'family.loginNotMailbox':
      'اسم المستخدم معرّف لتسجيل الدخول وليس صندوق بريد إلكتروني. راسل {email} إن احتجت إلى مساعدة في كلمة المرور.',
    'family.loginDone': 'تم',
    'family.loginTitle': 'تسجيل دخول خاص بالطفل',
    'family.loginSignsIn': 'اسم المستخدم الذي يُسجَّل به دخول {name} هو {username}.',
    'family.loginSignsInSince':
      'اسم المستخدم الذي يُسجَّل به دخول {name} هو {username}، وقد أُنشئ في {date}.',
    'family.loginCanReset':
      'يستطيع وليّ أمر موثَّق أن يطلب كلمة مرور جديدة لتسجيل دخول طفل موثوق. قد تبقى الجلسات المفتوحة نشطة.',
    'family.loginNoReset': 'استعادة كلمة المرور غير متاحة هنا الآن.',
    'family.loginOwnYes': 'كلمة مرور {name} الآن من اختيار الطفل نفسه. لا يمكنك رؤيتها.',
    'family.loginOwnNo':
      'ما زالت كلمة مرور {name} هي التي وضعها وليّ الأمر. عند تسجيل الدخول القادم سيُطلب من الطفل أن يختار كلمة مرور خاصة به.',
    'family.loginSetNew': 'وضع كلمة مرور جديدة',
    'family.loginNewPassword': 'كلمة المرور الجديدة',
    'family.loginResetNote':
      'استخدم ثمانية أحرف على الأقل. قد تحتاج تسجيلات الدخول المشتركة أو القديمة إلى مراجعة. قد تبقى الجلسات المفتوحة نشطة.',
    'family.loginChecking': 'جارٍ التحقق…',
    'family.loginChange': 'تغيير كلمة المرور',
    'family.loginResetDone': 'سُجّل تغيير كلمة المرور. قد تبقى الجلسات المفتوحة نشطة.',
    'family.loginDetach': 'فصل هذا المتعلّم',
    'family.loginDetachMeans':
      'هذا يفصل ملف المتعلّم، لكنه لا يحذف تسجيل الدخول ولا يُنهي الجلسات المفتوحة لدى خدمة تسجيل الدخول. قد تُحظر الهوية الموثوقة أيضًا في مسارات قاعدة البيانات التي تستخدم فحص الهوية في المنصة، وقد يبقى غير ذلك من الوصول. راسل {email} لترتيب إزالة تسجيل الدخول نفسه. الدروس والتقدّم والشهادات تبقى مع المتعلّم.',
    'family.loginWhy': 'السبب (اختياري، ويُحفظ في السجل)',
    'family.loginDetaching': 'جارٍ الفصل…',
    'family.loginDetachYes': 'فصل المتعلّم',
    'family.loginKeep': 'إبقاؤه',
    'family.loginUnderTwelve':
      'تعلُّم {name} يجري عبر تسجيل دخولك أنت. يمكن أن يكون للطفل تسجيل دخول خاص به من سنّ الثانية عشرة.',
    'family.loginNotOffered':
      'لا يتاح تسجيل دخول جديد لطفل في هذا الملف. قد يكون ذلك متوقفًا أو قد يحتاج تسجيل دخول سابق إلى مراجعة. راسل {email} للمساعدة.',
    'family.loginGive': 'إنشاء تسجيل دخول خاص لـ {name}',
    'family.loginUsername': 'اسم المستخدم',
    'family.loginFirstPassword':
      'كلمة المرور الأولى هذه تسلّمها أنت إلى {name}. تُرسل مباشرة إلى خدمة تسجيل الدخول ولا يستطيع أحد، ولا نحن، قراءتها بعد ذلك. عند تسجيل الدخول سيُطلب من الطفل أن يختار كلمة مرور خاصة به.',
    'family.loginConfirmTwelve':
      'أؤكّد أن عمر {name} اثنتا عشرة سنة أو أكثر. لا نطلب تاريخ الميلاد، وإجابتك تُسجَّل.',
    'family.loginMaking': 'جارٍ إنشاء تسجيل الدخول…',
    'family.loginMake': 'إنشاء تسجيل دخول {name}',
    'family.loginTickFirst': 'أكّد أولًا أن عمر هذا الطفل اثنتا عشرة سنة أو أكثر. لم يُنشأ شيء.',
    'family.loginTooYoung':
      'الطفل دون الثانية عشرة ليس له تسجيل دخول خاص به. يتعلّم عبر تسجيل دخولك أنت. لم يُنشأ شيء.',
    'family.loginUnconfirmedMake':
      'لم نتمكّن من التأكّد من تسجيل الدخول هذا. أعد تحميل صفحة العائلة أو راسل {email} قبل أن تعيد المحاولة. وإن أعدت المحاولة فاستخدم كلمة المرور الأصلية.',
    'family.loginUnconfirmedReset':
      'لم نتمكّن من التأكّد من تغيير كلمة المرور. جرّب تسجيل الدخول بكلمة المرور الجديدة قبل أن تحاول مرة أخرى. قد يكتمل الطلب خلال بضع دقائق.',
    'family.loginUnconfirmedDetach':
      'لم نتمكّن من التأكّد من الفصل. أعد تحميل الصفحة أو راسل {email} قبل أن تحاول مرة أخرى.',
    'family.loginUsernameMissing': 'اختر اسم مستخدم لطفلك.',
    'family.loginUsernameShort': 'اسم المستخدم يحتاج إلى ثلاثة أحرف على الأقل.',
    'family.loginUsernameLong': 'اسم المستخدم لا يزيد على ثلاثين حرفًا.',
    'family.loginUsernameStart': 'يبدأ اسم المستخدم بحرف لاتيني من a إلى z أو برقم.',
    'family.loginUsernameChars':
      'استخدم فقط الأحرف اللاتينية من a إلى z والأرقام والنقطة والشرطة والشرطة السفلية، بلا مسافات.',
    'family.loginPasswordMissing': 'ضع كلمة مرور لطفلك.',
    'family.loginPasswordShort': 'كلمة المرور تحتاج إلى ثمانية أحرف على الأقل.',
    'family.loginUnavailable':
      'لا يمكن إنشاء تسجيلات دخول للأطفال في هذا الموقع بعد: مفتاح الخادم الذي يُنشئ الحسابات غير مضبوط. لم يتغيّر شيء.',
    'family.loginNoChild': 'تعذّر تحديد هذا الطفل.',
    'family.loginGuardianRequired':
      'يلزم وليّ أمر موثَّق حاليًا وله صلاحية إدارة هذا الطفل. راسل {email} للمساعدة.',
    'family.loginNotYourChild': 'لا يستطيع تغيير تسجيل دخول هذا الطفل إلا بالغ من عائلته.',
    'family.loginNoLogin': 'ليس لهذا الطفل تسجيل دخول ليُزال.',
    'family.loginMalformed': 'تعذّرت قراءة هذا الطلب. لم يتغيّر شيء.',
  },
  ur: {
    'family.loginLinked': '{name} کا سیکھنے والے کا پروفائل جوڑ دیا گیا ہے۔',
    'family.loginUsernameIs': 'صارف نام {username} ہے۔',
    'family.loginRecovered':
      'یہ ایک پہلے کی کوشش سے بحال ہوا ہے۔ اس پہلی کوشش میں رکھا گیا پاس ورڈ ہی نافذ ہے؛ اس بار درج کیا گیا پاس ورڈ اس کی جگہ نہیں لے سکا۔',
    'family.loginHandOver':
      'بچے کو وہ پاس ورڈ دے دیں جو آپ نے چنا ہے۔ پہلی بار سائن اِن کرنے پر بچے سے اپنا پاس ورڈ چننے کو کہا جائے گا، جو آپ نہیں دیکھ سکیں گے۔',
    'family.loginNotMailbox':
      'صارف نام سائن اِن کی شناخت ہے، ای میل کا ڈبہ نہیں۔ پاس ورڈ میں مدد درکار ہو تو {email} پر لکھیں۔',
    'family.loginDone': 'ٹھیک ہے',
    'family.loginTitle': 'بچے کا اپنا لاگ اِن',
    'family.loginSignsIn': '{name} کے سائن اِن کا صارف نام {username} ہے۔',
    'family.loginSignsInSince':
      '{name} کے سائن اِن کا صارف نام {username} ہے، جو {date} کو بنایا گیا۔',
    'family.loginCanReset':
      'تصدیق شدہ سرپرست بچے کے قابلِ اعتماد لاگ اِن کے لیے نیا پاس ورڈ مانگ سکتا ہے۔ پہلے سے کھلے سیشن فعال رہ سکتے ہیں۔',
    'family.loginNoReset': 'پاس ورڈ کی بحالی ابھی یہاں دستیاب نہیں۔',
    'family.loginOwnYes': '{name} نے اپنا پاس ورڈ خود چن لیا ہے۔ آپ اسے نہیں دیکھ سکتے۔',
    'family.loginOwnNo':
      '{name} کے پاس ابھی وہی پاس ورڈ ہے جو سرپرست نے رکھا تھا۔ اگلی بار سائن اِن پر بچے سے اپنا پاس ورڈ چننے کو کہا جائے گا۔',
    'family.loginSetNew': 'نیا پاس ورڈ رکھیں',
    'family.loginNewPassword': 'نیا پاس ورڈ',
    'family.loginResetNote':
      'کم از کم آٹھ حروف استعمال کریں۔ مشترکہ یا پرانے سائن اِن کا جائزہ درکار ہو سکتا ہے۔ پہلے سے کھلے سیشن فعال رہ سکتے ہیں۔',
    'family.loginChecking': 'جانچ ہو رہی ہے…',
    'family.loginChange': 'پاس ورڈ بدلیں',
    'family.loginResetDone': 'پاس ورڈ کی تبدیلی درج ہو گئی۔ پہلے سے کھلے سیشن فعال رہ سکتے ہیں۔',
    'family.loginDetach': 'اس سیکھنے والے کو الگ کریں',
    'family.loginDetachMeans':
      'اس سے سیکھنے والے کا پروفائل الگ ہو جاتا ہے، مگر سائن اِن حذف نہیں ہوتا اور سائن اِن سروس کے کھلے سیشن ختم نہیں ہوتے۔ قابلِ اعتماد شناخت ڈیٹا بیس کے ان راستوں پر بھی روکی جا سکتی ہے جو پلیٹ فارم کی شناختی جانچ استعمال کرتے ہیں؛ باقی رسائی برقرار رہ سکتی ہے۔ سائن اِن کو الگ سے ہٹوانے کے لیے {email} پر لکھیں۔ اسباق، پیش رفت اور اسناد سیکھنے والے کے پاس رہتی ہیں۔',
    'family.loginWhy': 'وجہ (اختیاری، ریکارڈ میں رکھی جاتی ہے)',
    'family.loginDetaching': 'الگ کیا جا رہا ہے…',
    'family.loginDetachYes': 'سیکھنے والے کو الگ کریں',
    'family.loginKeep': 'رہنے دیں',
    'family.loginUnderTwelve':
      '{name} کا سیکھنا آپ کے سائن اِن کے ذریعے ہوتا ہے۔ بچے کا اپنا لاگ اِن بارہ سال کی عمر سے ہو سکتا ہے۔',
    'family.loginNotOffered':
      'اس پروفائل کے لیے بچے کا نیا لاگ اِن دستیاب نہیں۔ ممکن ہے یہ بند ہو یا کسی پہلے لاگ اِن کا جائزہ درکار ہو۔ مدد کے لیے {email} پر لکھیں۔',
    'family.loginGive': '{name} کے لیے اپنا لاگ اِن بنائیں',
    'family.loginUsername': 'صارف نام',
    'family.loginFirstPassword':
      'یہ پہلا پاس ورڈ آپ کو {name} کے حوالے کرنا ہے۔ یہ سیدھا سائن اِن سروس کو بھیجا جاتا ہے اور اس کے بعد کوئی بھی، ہم سمیت، اسے پڑھ نہیں سکتا۔ سائن اِن کرنے پر بچے سے اپنا پاس ورڈ چننے کو کہا جاتا ہے۔',
    'family.loginConfirmTwelve':
      'میری طرف سے تصدیق ہے کہ {name} کی عمر بارہ سال یا اس سے زیادہ ہے۔ ہم تاریخِ پیدائش نہیں پوچھتے؛ آپ کا جواب درج کیا جاتا ہے۔',
    'family.loginMaking': 'لاگ اِن بنایا جا رہا ہے…',
    'family.loginMake': '{name} کا لاگ اِن بنائیں',
    'family.loginTickFirst':
      'پہلے تصدیق کریں کہ اس بچے کی عمر بارہ سال یا اس سے زیادہ ہے۔ کچھ نہیں بنایا گیا۔',
    'family.loginTooYoung':
      'بارہ سال سے کم عمر بچے کا اپنا لاگ اِن نہیں ہوتا۔ ایسا بچہ آپ کے سائن اِن کے ذریعے سیکھتا ہے۔ کچھ نہیں بنایا گیا۔',
    'family.loginUnconfirmedMake':
      'ہم اس لاگ اِن کی تصدیق نہیں کر سکے۔ دوبارہ کوشش سے پہلے خاندان کا صفحہ دوبارہ لوڈ کریں یا {email} پر لکھیں۔ اگر دوبارہ کوشش کریں تو اصل پاس ورڈ ہی استعمال کریں۔',
    'family.loginUnconfirmedReset':
      'ہم پاس ورڈ کی تبدیلی کی تصدیق نہیں کر سکے۔ دوبارہ کوشش سے پہلے نئے پاس ورڈ سے سائن اِن کر کے دیکھیں۔ درخواست چند منٹ میں مکمل ہو سکتی ہے۔',
    'family.loginUnconfirmedDetach':
      'ہم الگ ہونے کی تصدیق نہیں کر سکے۔ دوبارہ کوشش سے پہلے صفحہ دوبارہ لوڈ کریں یا {email} پر لکھیں۔',
    'family.loginUsernameMissing': 'اپنے بچے کے لیے صارف نام چنیں۔',
    'family.loginUsernameShort': 'صارف نام میں کم از کم تین حروف ہونے چاہییں۔',
    'family.loginUsernameLong': 'صارف نام زیادہ سے زیادہ تیس حروف کا ہو سکتا ہے۔',
    'family.loginUsernameStart':
      'صارف نام a سے z تک کے کسی لاطینی حرف یا کسی ہندسے سے شروع ہوتا ہے۔',
    'family.loginUsernameChars':
      'صرف a سے z تک کے لاطینی حروف، ہندسے، نقطہ، ڈیش اور انڈر اسکور استعمال کریں، خالی جگہ کے بغیر۔',
    'family.loginPasswordMissing': 'اپنے بچے کے لیے پاس ورڈ رکھیں۔',
    'family.loginPasswordShort': 'پاس ورڈ میں کم از کم آٹھ حروف ہونے چاہییں۔',
    'family.loginUnavailable':
      'اس تنصیب پر ابھی بچوں کے لاگ اِن نہیں بنائے جا سکتے: اکاؤنٹ بنانے والی سرور کلید ترتیب نہیں دی گئی۔ کچھ نہیں بدلا۔',
    'family.loginNoChild': 'اس بچے کی شناخت نہیں ہو سکی۔',
    'family.loginGuardianRequired':
      'ایسا موجودہ تصدیق شدہ سرپرست درکار ہے جسے اس بچے کے انتظام کی اجازت ہو۔ مدد کے لیے {email} پر لکھیں۔',
    'family.loginNotYourChild': 'اس بچے کا لاگ اِن صرف اس کے خاندان کا کوئی بالغ بدل سکتا ہے۔',
    'family.loginNoLogin': 'اس بچے کا کوئی لاگ اِن نہیں جسے ہٹایا جائے۔',
    'family.loginMalformed': 'یہ درخواست پڑھی نہیں جا سکی۔ کچھ نہیں بدلا۔',
  },
  fa: {
    'family.loginLinked': 'نمایهٔ یادگیرندهٔ {name} پیوند داده شد.',
    'family.loginUsernameIs': 'نام کاربری {username} است.',
    'family.loginRecovered':
      'این از تلاشی پیشین بازیابی شد. گذرواژه‌ای که در آن تلاش گذاشته شده بود همچنان معتبر است؛ گذرواژه‌ای که این بار وارد کردید جای آن را نگرفت.',
    'family.loginHandOver':
      'گذرواژه‌ای را که انتخاب کرده‌اید به کودک بدهید. نخستین بار که وارد شود از او خواسته می‌شود گذرواژهٔ خودش را انتخاب کند و شما آن را نخواهید دید.',
    'family.loginNotMailbox':
      'نام کاربری شناسه‌ای برای ورود است، نه صندوق ایمیل. اگر دربارهٔ گذرواژه کمک لازم دارید به {email} بنویسید.',
    'family.loginDone': 'انجام شد',
    'family.loginTitle': 'ورود جداگانهٔ کودک',
    'family.loginSignsIn': '{name} با نام کاربری {username} وارد می‌شود.',
    'family.loginSignsInSince': '{name} با نام کاربری {username} وارد می‌شود؛ ساخته‌شده در {date}.',
    'family.loginCanReset':
      'سرپرستِ تأییدشده می‌تواند برای ورودِ مورد اعتمادِ کودک گذرواژهٔ تازه درخواست کند. نشست‌های باز ممکن است فعال بمانند.',
    'family.loginNoReset': 'بازیابی گذرواژه اکنون در اینجا در دسترس نیست.',
    'family.loginOwnYes': '{name} گذرواژهٔ خودش را انتخاب کرده است. شما نمی‌توانید آن را ببینید.',
    'family.loginOwnNo':
      '{name} هنوز از گذرواژه‌ای استفاده می‌کند که سرپرست گذاشته است. بار بعد که وارد شود از او خواسته می‌شود گذرواژهٔ خودش را انتخاب کند.',
    'family.loginSetNew': 'گذاشتن گذرواژهٔ تازه',
    'family.loginNewPassword': 'گذرواژهٔ تازه',
    'family.loginResetNote':
      'دست‌کم هشت نویسه به کار ببرید. ورودهای مشترک یا قدیمی ممکن است به بازبینی نیاز داشته باشند. نشست‌های باز ممکن است فعال بمانند.',
    'family.loginChecking': 'در حال بررسی…',
    'family.loginChange': 'تغییر گذرواژه',
    'family.loginResetDone': 'تغییر گذرواژه ثبت شد. نشست‌های باز ممکن است فعال بمانند.',
    'family.loginDetach': 'جدا کردن این یادگیرنده',
    'family.loginDetachMeans':
      'این کار نمایهٔ یادگیرنده را جدا می‌کند، اما ورود را حذف نمی‌کند و نشست‌های باز در سرویس ورود را پایان نمی‌دهد. هویتِ مورد اعتماد ممکن است در مسیرهایی از پایگاه داده که از بررسی هویتِ سکو استفاده می‌کنند نیز مسدود شود؛ دسترسی‌های دیگر ممکن است بمانند. برای حذف جداگانهٔ خودِ ورود به {email} بنویسید. درس‌ها، پیشرفت و گواهی‌نامه‌ها نزد یادگیرنده می‌مانند.',
    'family.loginWhy': 'چرا (اختیاری؛ در پرونده نگه داشته می‌شود)',
    'family.loginDetaching': 'در حال جدا کردن…',
    'family.loginDetachYes': 'جدا کردن یادگیرنده',
    'family.loginKeep': 'بماند',
    'family.loginUnderTwelve':
      '{name} از راه ورود شما یاد می‌گیرد. کودک از دوازده‌سالگی می‌تواند ورود جداگانهٔ خودش را داشته باشد.',
    'family.loginNotOffered':
      'ورود تازهٔ کودک برای این نمایه در دسترس نیست. شاید خاموش باشد یا ورودی پیشین به بازبینی نیاز داشته باشد. برای کمک به {email} بنویسید.',
    'family.loginGive': 'ساختن ورود جداگانه برای {name}',
    'family.loginUsername': 'نام کاربری',
    'family.loginFirstPassword':
      'این نخستین گذرواژه را شما به {name} می‌دهید. یک‌راست به سرویس ورود فرستاده می‌شود و پس از آن هیچ‌کس، حتی ما، نمی‌تواند آن را بخواند. هنگام ورود از کودک خواسته می‌شود گذرواژهٔ خودش را انتخاب کند.',
    'family.loginConfirmTwelve':
      'تأیید می‌کنم که {name} دوازده‌ساله یا بزرگ‌تر است. ما تاریخ تولد نمی‌پرسیم؛ پاسخ شما ثبت می‌شود.',
    'family.loginMaking': 'در حال ساختن ورود…',
    'family.loginMake': 'ساختن ورود {name}',
    'family.loginTickFirst':
      'نخست تأیید کنید که این کودک دوازده‌ساله یا بزرگ‌تر است. چیزی ساخته نشد.',
    'family.loginTooYoung':
      'کودکِ زیر دوازده سال ورود جداگانهٔ خودش را ندارد. او از راه ورود شما یاد می‌گیرد. چیزی ساخته نشد.',
    'family.loginUnconfirmedMake':
      'نتوانستیم این ورود را تأیید کنیم. پیش از تلاش دوباره، صفحهٔ خانواده را بازبارگذاری کنید یا به {email} بنویسید. اگر دوباره تلاش می‌کنید، همان گذرواژهٔ نخست را به کار ببرید.',
    'family.loginUnconfirmedReset':
      'نتوانستیم تغییر گذرواژه را تأیید کنیم. پیش از تلاش دوباره، با گذرواژهٔ تازه وارد شوید و ببینید. درخواست ممکن است تا چند دقیقهٔ دیگر کامل شود.',
    'family.loginUnconfirmedDetach':
      'نتوانستیم جدا شدن را تأیید کنیم. پیش از تلاش دوباره، صفحه را بازبارگذاری کنید یا به {email} بنویسید.',
    'family.loginUsernameMissing': 'برای کودکتان نام کاربری انتخاب کنید.',
    'family.loginUsernameShort': 'نام کاربری دست‌کم سه نویسه می‌خواهد.',
    'family.loginUsernameLong': 'نام کاربری حداکثر سی نویسه می‌تواند باشد.',
    'family.loginUsernameStart': 'نام کاربری با یکی از حروف لاتین a تا z یا با یک رقم آغاز می‌شود.',
    'family.loginUsernameChars':
      'فقط حروف لاتین a تا z، رقم، نقطه، خط تیره و زیرخط به کار ببرید؛ بدون فاصله.',
    'family.loginPasswordMissing': 'برای کودکتان گذرواژه بگذارید.',
    'family.loginPasswordShort': 'گذرواژه دست‌کم هشت نویسه می‌خواهد.',
    'family.loginUnavailable':
      'در این استقرار هنوز نمی‌توان برای کودکان ورود ساخت: کلید سروری که حساب می‌سازد تنظیم نشده است. چیزی تغییر نکرد.',
    'family.loginNoChild': 'این کودک شناسایی نشد.',
    'family.loginGuardianRequired':
      'سرپرستی لازم است که هم‌اکنون تأییدشده باشد و اجازهٔ مدیریت این کودک را داشته باشد. برای کمک به {email} بنویسید.',
    'family.loginNotYourChild': 'فقط بزرگسالی از خانوادهٔ این کودک می‌تواند ورود او را تغییر دهد.',
    'family.loginNoLogin': 'این کودک ورودی ندارد که برداشته شود.',
    'family.loginMalformed': 'این درخواست خوانده نشد. چیزی تغییر نکرد.',
  },
  'fa-af': {
    'family.loginLinked': 'پروفایل شاگردِ {name} وصل شد.',
    'family.loginUsernameIs': 'نام کاربری {username} است.',
    'family.loginRecovered':
      'این از یک کوشش پیشین بازیابی شد. رمزی که در آن کوشش گذاشته شده بود هنوز معتبر است؛ رمزی که این بار وارد کردید جای آن را نگرفت.',
    'family.loginHandOver':
      'رمزی را که انتخاب کرده‌اید به طفل بدهید. بار اول که داخل شود از او خواسته می‌شود رمز خودش را انتخاب کند و شما آن را نخواهید دید.',
    'family.loginNotMailbox':
      'نام کاربری یک شناسه برای ورود است، نه صندوق ایمیل. اگر دربارهٔ رمز به کمک نیاز دارید به {email} بنویسید.',
    'family.loginDone': 'انجام شد',
    'family.loginTitle': 'ورود جداگانهٔ طفل',
    'family.loginSignsIn': '{name} با نام کاربری {username} داخل می‌شود.',
    'family.loginSignsInSince': '{name} با نام کاربری {username} داخل می‌شود؛ ساخته‌شده در {date}.',
    'family.loginCanReset':
      'سرپرستِ تأییدشده می‌تواند برای ورودِ مورد اعتمادِ طفل رمز نو درخواست کند. نشست‌های باز ممکن است فعال بمانند.',
    'family.loginNoReset': 'بازیابی رمز همین حالا در اینجا در دسترس نیست.',
    'family.loginOwnYes': '{name} رمز خودش را انتخاب کرده است. شما نمی‌توانید آن را ببینید.',
    'family.loginOwnNo':
      '{name} هنوز از رمزی استفاده می‌کند که سرپرست گذاشته است. بار دیگر که داخل شود از او خواسته می‌شود رمز خودش را انتخاب کند.',
    'family.loginSetNew': 'گذاشتن رمز نو',
    'family.loginNewPassword': 'رمز نو',
    'family.loginResetNote':
      'کم از کم هشت حرف به کار ببرید. ورودهای مشترک یا کهنه ممکن است به بازبینی نیاز داشته باشند. نشست‌های باز ممکن است فعال بمانند.',
    'family.loginChecking': 'در حال بررسی…',
    'family.loginChange': 'تغییر رمز',
    'family.loginResetDone': 'تغییر رمز ثبت شد. نشست‌های باز ممکن است فعال بمانند.',
    'family.loginDetach': 'جدا کردن این شاگرد',
    'family.loginDetachMeans':
      'این کار پروفایل شاگرد را جدا می‌کند، اما ورود را حذف نمی‌کند و نشست‌های باز در خدمت ورود را ختم نمی‌کند. هویتِ مورد اعتماد ممکن است در مسیرهایی از دیتابیس که از بررسی هویتِ پلتفرم استفاده می‌کنند نیز مسدود شود؛ دسترسی‌های دیگر ممکن است بمانند. برای حذف جداگانهٔ خودِ ورود به {email} بنویسید. درس‌ها، پیشرفت و اسناد نزد شاگرد می‌مانند.',
    'family.loginWhy': 'چرا (اختیاری؛ در ثبت نگه داشته می‌شود)',
    'family.loginDetaching': 'در حال جدا کردن…',
    'family.loginDetachYes': 'جدا کردن شاگرد',
    'family.loginKeep': 'بماند',
    'family.loginUnderTwelve':
      '{name} از راه ورود شما می‌آموزد. طفل از دوازده‌سالگی می‌تواند ورود جداگانهٔ خودش را داشته باشد.',
    'family.loginNotOffered':
      'ورود نو برای طفل در این پروفایل در دسترس نیست. شاید خاموش باشد یا یک ورود پیشین به بازبینی نیاز داشته باشد. برای کمک به {email} بنویسید.',
    'family.loginGive': 'ساختن ورود جداگانه برای {name}',
    'family.loginUsername': 'نام کاربری',
    'family.loginFirstPassword':
      'این رمز اول را شما به {name} می‌دهید. مستقیم به خدمت ورود فرستاده می‌شود و پس از آن هیچ‌کس، حتی ما، نمی‌تواند آن را بخواند. هنگام داخل شدن از طفل خواسته می‌شود رمز خودش را انتخاب کند.',
    'family.loginConfirmTwelve':
      'تأیید می‌کنم که {name} دوازده‌ساله یا کلان‌تر است. ما تاریخ تولد نمی‌پرسیم؛ پاسخ شما ثبت می‌شود.',
    'family.loginMaking': 'در حال ساختن ورود…',
    'family.loginMake': 'ساختن ورود {name}',
    'family.loginTickFirst':
      'اول تأیید کنید که این طفل دوازده‌ساله یا کلان‌تر است. چیزی ساخته نشد.',
    'family.loginTooYoung':
      'طفلِ زیر دوازده سال ورود جداگانهٔ خودش را ندارد. او از راه ورود شما می‌آموزد. چیزی ساخته نشد.',
    'family.loginUnconfirmedMake':
      'نتوانستیم این ورود را تأیید کنیم. پیش از کوشش دوباره، صفحهٔ فامیل را دوباره باز کنید یا به {email} بنویسید. اگر دوباره کوشش می‌کنید، همان رمز اول را به کار ببرید.',
    'family.loginUnconfirmedReset':
      'نتوانستیم تغییر رمز را تأیید کنیم. پیش از کوشش دوباره، با رمز نو داخل شوید و ببینید. درخواست ممکن است تا چند دقیقهٔ دیگر تکمیل شود.',
    'family.loginUnconfirmedDetach':
      'نتوانستیم جدا شدن را تأیید کنیم. پیش از کوشش دوباره، صفحه را دوباره باز کنید یا به {email} بنویسید.',
    'family.loginUsernameMissing': 'برای طفل‌تان نام کاربری انتخاب کنید.',
    'family.loginUsernameShort': 'نام کاربری کم از کم سه حرف می‌خواهد.',
    'family.loginUsernameLong': 'نام کاربری حداکثر سی حرف می‌تواند باشد.',
    'family.loginUsernameStart': 'نام کاربری با یکی از حروف لاتین a تا z یا با یک عدد آغاز می‌شود.',
    'family.loginUsernameChars':
      'تنها حروف لاتین a تا z، عدد، نقطه، خط تیره و زیرخط به کار ببرید؛ بدون فاصله.',
    'family.loginPasswordMissing': 'برای طفل‌تان رمز بگذارید.',
    'family.loginPasswordShort': 'رمز کم از کم هشت حرف می‌خواهد.',
    'family.loginUnavailable':
      'در این نصب هنوز نمی‌توان برای اطفال ورود ساخت: کلید سروری که حساب می‌سازد تنظیم نشده است. چیزی تغییر نکرد.',
    'family.loginNoChild': 'این طفل شناسایی نشد.',
    'family.loginGuardianRequired':
      'سرپرستی لازم است که همین حالا تأییدشده باشد و اجازهٔ مدیریت این طفل را داشته باشد. برای کمک به {email} بنویسید.',
    'family.loginNotYourChild': 'تنها یک کلان‌سال از فامیل این طفل می‌تواند ورود او را تغییر دهد.',
    'family.loginNoLogin': 'این طفل ورودی ندارد که برداشته شود.',
    'family.loginMalformed': 'این درخواست خوانده نشد. چیزی تغییر نکرد.',
  },
  tr: {
    'family.loginLinked': '{name} için öğrenci profili bağlandı.',
    'family.loginUsernameIs': 'Kullanıcı adı: {username}.',
    'family.loginRecovered':
      'Bu, önceki bir denemeden kurtarıldı. O denemede belirlenen parola geçerli kalıyor; bu denemede girilen parola onun yerini almadı.',
    'family.loginHandOver':
      'Seçtiğiniz parolayı çocuğa verin. İlk oturum açışında kendi parolasını seçmesi istenir; o parolayı siz görmezsiniz.',
    'family.loginNotMailbox':
      'Kullanıcı adı bir oturum açma kimliğidir, e-posta kutusu değildir. Parolayla ilgili yardım için {email} adresine yazın.',
    'family.loginDone': 'Tamam',
    'family.loginTitle': 'Çocuğun kendi girişi',
    'family.loginSignsIn': '{name}, {username} kullanıcı adıyla oturum açar.',
    'family.loginSignsInSince':
      '{name}, {username} kullanıcı adıyla oturum açar. Oluşturulma tarihi: {date}.',
    'family.loginCanReset':
      'Doğrulanmış bir veli, güvenilen bir çocuk girişi için yeni parola isteyebilir. Açık oturumlar etkin kalabilir.',
    'family.loginNoReset': 'Parola kurtarma şu anda burada kullanılamıyor.',
    'family.loginOwnYes': '{name} kendi parolasını seçti. Siz onu göremezsiniz.',
    'family.loginOwnNo':
      '{name} hâlâ bir velinin belirlediği parolayı kullanıyor. Bir sonraki oturum açışında kendi parolasını seçmesi istenir.',
    'family.loginSetNew': 'Yeni parola belirle',
    'family.loginNewPassword': 'Yeni parola',
    'family.loginResetNote':
      'En az sekiz karakter kullanın. Paylaşılan ya da eski girişler inceleme gerektirebilir. Açık oturumlar etkin kalabilir.',
    'family.loginChecking': 'Denetleniyor…',
    'family.loginChange': 'Parolayı değiştir',
    'family.loginResetDone': 'Parola değişikliği kaydedildi. Açık oturumlar etkin kalabilir.',
    'family.loginDetach': 'Bu öğrenciyi ayır',
    'family.loginDetachMeans':
      'Bu işlem öğrenci profilini ayırır, ancak girişi silmez ve oturum açma hizmetindeki açık oturumları sonlandırmaz. Güvenilen kimlik, platformun kimlik denetimini kullanan veritabanı yollarında da engellenebilir; başka erişimler sürebilir. Girişin ayrıca kaldırılması için {email} adresine yazın. Dersler, ilerleme ve sertifikalar öğrencide kalır.',
    'family.loginWhy': 'Neden (isteğe bağlı; kayıtta tutulur)',
    'family.loginDetaching': 'Ayrılıyor…',
    'family.loginDetachYes': 'Öğrenciyi ayır',
    'family.loginKeep': 'Kalsın',
    'family.loginUnderTwelve':
      '{name} sizin oturumunuzla öğrenir. Bir çocuğun kendi girişi on iki yaşından itibaren olabilir.',
    'family.loginNotOffered':
      'Bu profil için yeni bir çocuk girişi kullanılamıyor. Kapalı olabilir ya da önceki bir girişin incelenmesi gerekebilir. Yardım için {email} adresine yazın.',
    'family.loginGive': '{name} için kendi girişini oluştur',
    'family.loginUsername': 'Kullanıcı adı',
    'family.loginFirstPassword':
      'Bu ilk parolayı {name} için siz belirleyip ona verirsiniz. Doğrudan oturum açma hizmetine gönderilir ve sonrasında biz dahil hiç kimse onu okuyamaz. Çocuk oturum açtığında kendi parolasını seçmesi istenir.',
    'family.loginConfirmTwelve':
      '{name} adlı çocuğun on iki yaşında ya da daha büyük olduğunu onaylıyorum. Doğum tarihi sormuyoruz; yanıtınız kaydedilir.',
    'family.loginMaking': 'Giriş oluşturuluyor…',
    'family.loginMake': '{name} için girişi oluştur',
    'family.loginTickFirst':
      'Önce bu çocuğun on iki yaşında ya da daha büyük olduğunu onaylayın. Hiçbir şey oluşturulmadı.',
    'family.loginTooYoung':
      'On iki yaşından küçük bir çocuğun kendi girişi olmaz. Sizin oturumunuzla öğrenir. Hiçbir şey oluşturulmadı.',
    'family.loginUnconfirmedMake':
      'Bu girişi doğrulayamadık. Yeniden denemeden önce aile sayfasını yenileyin ya da {email} adresine yazın. Yeniden denerseniz ilk parolayı kullanın.',
    'family.loginUnconfirmedReset':
      'Parola değişikliğini doğrulayamadık. Yeniden denemeden önce yeni parolayla oturum açmayı deneyin. İstek birkaç dakika içinde tamamlanabilir.',
    'family.loginUnconfirmedDetach':
      'Ayırma işlemini doğrulayamadık. Yeniden denemeden önce sayfayı yenileyin ya da {email} adresine yazın.',
    'family.loginUsernameMissing': 'Çocuğunuz için bir kullanıcı adı seçin.',
    'family.loginUsernameShort': 'Kullanıcı adı en az üç karakter olmalıdır.',
    'family.loginUsernameLong': 'Kullanıcı adı en çok otuz karakter olabilir.',
    'family.loginUsernameStart':
      'Kullanıcı adı a ile z arasındaki bir İngilizce harfle ya da bir rakamla başlar.',
    'family.loginUsernameChars':
      'Yalnızca a ile z arasındaki İngilizce harfleri, rakamları, noktayı, kısa çizgiyi ve alt çizgiyi kullanın; boşluk olmaz.',
    'family.loginPasswordMissing': 'Çocuğunuz için bir parola belirleyin.',
    'family.loginPasswordShort': 'Parola en az sekiz karakter olmalıdır.',
    'family.loginUnavailable':
      'Bu kurulumda henüz çocuk girişi oluşturulamıyor: hesap oluşturan sunucu anahtarı yapılandırılmamış. Hiçbir şey değişmedi.',
    'family.loginNoChild': 'Bu çocuk belirlenemedi.',
    'family.loginGuardianRequired':
      'Bu çocuğu yönetme izni olan, hâlen doğrulanmış bir veli gerekir. Yardım için {email} adresine yazın.',
    'family.loginNotYourChild':
      'Bu çocuğun girişini yalnızca ailesindeki bir yetişkin değiştirebilir.',
    'family.loginNoLogin': 'Bu çocuğun kaldırılacak bir girişi yok.',
    'family.loginMalformed': 'Bu istek okunamadı. Hiçbir şey değişmedi.',
  },
  id: {
    'family.loginLinked': 'Profil peserta didik {name} sudah ditautkan.',
    'family.loginUsernameIs': 'Nama penggunanya {username}.',
    'family.loginRecovered':
      'Ini dipulihkan dari percobaan sebelumnya. Kata sandi yang dibuat pada percobaan itu tetap berlaku; kata sandi yang dimasukkan pada percobaan ini tidak menggantikannya.',
    'family.loginHandOver':
      'Berikan kepada anak kata sandi yang Anda pilih. Saat pertama kali masuk, anak diminta memilih kata sandinya sendiri, yang tidak akan Anda lihat.',
    'family.loginNotMailbox':
      'Nama pengguna adalah pengenal untuk masuk, bukan kotak surat email. Hubungi {email} jika Anda perlu bantuan soal kata sandi.',
    'family.loginDone': 'Selesai',
    'family.loginTitle': 'Login anak sendiri',
    'family.loginSignsIn': '{name} masuk dengan nama pengguna {username}.',
    'family.loginSignsInSince': '{name} masuk dengan nama pengguna {username}, dibuat pada {date}.',
    'family.loginCanReset':
      'Wali yang terverifikasi dapat meminta kata sandi baru untuk login anak yang tepercaya. Sesi yang sudah terbuka mungkin tetap aktif.',
    'family.loginNoReset': 'Pemulihan kata sandi belum tersedia di sini saat ini.',
    'family.loginOwnYes':
      '{name} sudah memilih kata sandinya sendiri. Anda tidak dapat melihatnya.',
    'family.loginOwnNo':
      '{name} masih memakai kata sandi yang dibuat wali. Saat masuk berikutnya, anak diminta memilih kata sandinya sendiri.',
    'family.loginSetNew': 'Buat kata sandi baru',
    'family.loginNewPassword': 'Kata sandi baru',
    'family.loginResetNote':
      'Gunakan sedikitnya delapan karakter. Login bersama atau login lama mungkin perlu ditinjau. Sesi yang sudah terbuka mungkin tetap aktif.',
    'family.loginChecking': 'Memeriksa…',
    'family.loginChange': 'Ubah kata sandi',
    'family.loginResetDone':
      'Perubahan kata sandi sudah dicatat. Sesi yang sudah terbuka mungkin tetap aktif.',
    'family.loginDetach': 'Lepaskan peserta didik ini',
    'family.loginDetachMeans':
      'Ini melepaskan profil peserta didik, tetapi tidak menghapus login dan tidak mengakhiri sesi yang terbuka di layanan masuk. Identitas tepercaya juga dapat diblokir pada jalur basis data yang memakai pemeriksaan identitas platform; akses lain bisa tetap ada. Hubungi {email} untuk mengatur penghapusan login itu sendiri. Pelajaran, kemajuan, dan sertifikat tetap bersama peserta didik.',
    'family.loginWhy': 'Alasan (opsional, disimpan dalam catatan)',
    'family.loginDetaching': 'Melepaskan…',
    'family.loginDetachYes': 'Lepaskan peserta didik',
    'family.loginKeep': 'Biarkan',
    'family.loginUnderTwelve':
      '{name} belajar melalui login Anda. Seorang anak dapat memiliki login sendiri sejak usia dua belas tahun.',
    'family.loginNotOffered':
      'Login anak yang baru tidak tersedia untuk profil ini. Mungkin dimatikan, atau login sebelumnya perlu ditinjau. Hubungi {email} untuk bantuan.',
    'family.loginGive': 'Buatkan {name} login sendiri',
    'family.loginUsername': 'Nama pengguna',
    'family.loginFirstPassword':
      'Kata sandi pertama ini Anda yang menyerahkannya kepada {name}. Kata sandi dikirim langsung ke layanan masuk dan sesudahnya tidak seorang pun, termasuk kami, dapat membacanya. Saat masuk, anak diminta memilih kata sandinya sendiri.',
    'family.loginConfirmTwelve':
      'Saya menyatakan bahwa {name} berusia dua belas tahun atau lebih. Kami tidak menanyakan tanggal lahir; jawaban Anda dicatat.',
    'family.loginMaking': 'Membuat login…',
    'family.loginMake': 'Buat login {name}',
    'family.loginTickFirst':
      'Nyatakan dahulu bahwa anak ini berusia dua belas tahun atau lebih. Tidak ada yang dibuat.',
    'family.loginTooYoung':
      'Anak di bawah dua belas tahun tidak memiliki login sendiri. Anak belajar melalui login Anda. Tidak ada yang dibuat.',
    'family.loginUnconfirmedMake':
      'Kami tidak dapat memastikan login ini. Muat ulang halaman keluarga atau hubungi {email} sebelum mencoba lagi. Jika mencoba lagi, gunakan kata sandi yang semula.',
    'family.loginUnconfirmedReset':
      'Kami tidak dapat memastikan perubahan kata sandi. Coba masuk dengan kata sandi baru sebelum mencoba lagi. Permintaan masih bisa selesai dalam beberapa menit.',
    'family.loginUnconfirmedDetach':
      'Kami tidak dapat memastikan pelepasan. Muat ulang halaman atau hubungi {email} sebelum mencoba lagi.',
    'family.loginUsernameMissing': 'Pilih nama pengguna untuk anak Anda.',
    'family.loginUsernameShort': 'Nama pengguna memerlukan sedikitnya tiga karakter.',
    'family.loginUsernameLong': 'Nama pengguna paling banyak tiga puluh karakter.',
    'family.loginUsernameStart': 'Nama pengguna diawali huruf a sampai z atau angka.',
    'family.loginUsernameChars':
      'Gunakan hanya huruf a sampai z, angka, titik, tanda hubung, dan garis bawah, tanpa spasi.',
    'family.loginPasswordMissing': 'Buat kata sandi untuk anak Anda.',
    'family.loginPasswordShort': 'Kata sandi memerlukan sedikitnya delapan karakter.',
    'family.loginUnavailable':
      'Login anak belum dapat dibuat di pemasangan ini: kunci server yang membuat akun belum diatur. Tidak ada yang berubah.',
    'family.loginNoChild': 'Anak itu tidak dapat dikenali.',
    'family.loginGuardianRequired':
      'Diperlukan wali yang saat ini terverifikasi dan berizin mengelola anak ini. Hubungi {email} untuk bantuan.',
    'family.loginNotYourChild':
      'Hanya orang dewasa dalam keluarga anak ini yang dapat mengubah loginnya.',
    'family.loginNoLogin': 'Anak ini tidak memiliki login untuk dihapus.',
    'family.loginMalformed': 'Permintaan itu tidak dapat dibaca. Tidak ada yang berubah.',
  },
  ms: {
    'family.loginLinked': 'Profil pelajar {name} telah dipautkan.',
    'family.loginUsernameIs': 'Nama penggunanya ialah {username}.',
    'family.loginRecovered':
      'Ini dipulihkan daripada percubaan terdahulu. Kata laluan yang ditetapkan dalam percubaan itu masih berkuat kuasa; kata laluan yang dimasukkan dalam percubaan ini tidak menggantikannya.',
    'family.loginHandOver':
      'Berikan kata laluan yang anda pilih kepada kanak-kanak itu. Kali pertama log masuk, mereka diminta memilih kata laluan sendiri, yang tidak akan anda lihat.',
    'family.loginNotMailbox':
      'Nama pengguna ialah pengenal log masuk, bukan peti mel e-mel. Hubungi {email} jika anda perlukan bantuan tentang kata laluan.',
    'family.loginDone': 'Selesai',
    'family.loginTitle': 'Log masuk kanak-kanak sendiri',
    'family.loginSignsIn': '{name} log masuk dengan nama pengguna {username}.',
    'family.loginSignsInSince':
      '{name} log masuk dengan nama pengguna {username}, dibuat pada {date}.',
    'family.loginCanReset':
      'Penjaga yang disahkan boleh meminta kata laluan baharu untuk log masuk kanak-kanak yang dipercayai. Sesi sedia ada mungkin kekal aktif.',
    'family.loginNoReset': 'Pemulihan kata laluan tidak tersedia di sini sekarang.',
    'family.loginOwnYes': '{name} telah memilih kata laluan sendiri. Anda tidak dapat melihatnya.',
    'family.loginOwnNo':
      '{name} masih menggunakan kata laluan yang ditetapkan oleh penjaga. Pada log masuk seterusnya, mereka diminta memilih kata laluan sendiri.',
    'family.loginSetNew': 'Tetapkan kata laluan baharu',
    'family.loginNewPassword': 'Kata laluan baharu',
    'family.loginResetNote':
      'Gunakan sekurang-kurangnya lapan aksara. Log masuk yang dikongsi atau lama mungkin perlu disemak. Sesi sedia ada mungkin kekal aktif.',
    'family.loginChecking': 'Menyemak…',
    'family.loginChange': 'Tukar kata laluan',
    'family.loginResetDone':
      'Pertukaran kata laluan telah direkodkan. Sesi sedia ada mungkin kekal aktif.',
    'family.loginDetach': 'Tanggalkan pelajar ini',
    'family.loginDetachMeans':
      'Ini menanggalkan profil pelajar tetapi tidak memadam log masuk dan tidak menamatkan sesi yang terbuka pada perkhidmatan log masuk. Identiti yang dipercayai juga mungkin disekat pada laluan pangkalan data yang menggunakan semakan identiti platform; akses lain boleh kekal. Hubungi {email} untuk mengatur pembuangan log masuk itu sendiri. Pelajaran, kemajuan dan sijil kekal bersama pelajar.',
    'family.loginWhy': 'Sebab (pilihan, disimpan dalam rekod)',
    'family.loginDetaching': 'Menanggalkan…',
    'family.loginDetachYes': 'Tanggalkan pelajar',
    'family.loginKeep': 'Kekalkan',
    'family.loginUnderTwelve':
      '{name} belajar melalui log masuk anda. Seorang kanak-kanak boleh mempunyai log masuk sendiri dari umur dua belas tahun.',
    'family.loginNotOffered':
      'Log masuk kanak-kanak yang baharu tidak tersedia untuk profil ini. Mungkin ia dimatikan atau log masuk terdahulu perlu disemak. Hubungi {email} untuk bantuan.',
    'family.loginGive': 'Beri {name} log masuk sendiri',
    'family.loginUsername': 'Nama pengguna',
    'family.loginFirstPassword':
      'Kata laluan pertama ini anda sendiri yang serahkan kepada {name}. Ia dihantar terus kepada perkhidmatan log masuk dan selepas itu tiada sesiapa, termasuk kami, dapat membacanya. Apabila log masuk, mereka diminta memilih kata laluan sendiri.',
    'family.loginConfirmTwelve':
      'Saya mengesahkan bahawa {name} berumur dua belas tahun atau lebih. Kami tidak meminta tarikh lahir; jawapan anda direkodkan.',
    'family.loginMaking': 'Membuat log masuk…',
    'family.loginMake': 'Buat log masuk {name}',
    'family.loginTickFirst':
      'Sahkan dahulu bahawa kanak-kanak ini berumur dua belas tahun atau lebih. Tiada apa-apa dibuat.',
    'family.loginTooYoung':
      'Kanak-kanak di bawah dua belas tahun tidak mempunyai log masuk sendiri. Mereka belajar melalui log masuk anda. Tiada apa-apa dibuat.',
    'family.loginUnconfirmedMake':
      'Kami tidak dapat mengesahkan log masuk ini. Muat semula halaman keluarga atau hubungi {email} sebelum mencuba lagi. Jika mencuba lagi, gunakan kata laluan yang asal.',
    'family.loginUnconfirmedReset':
      'Kami tidak dapat mengesahkan pertukaran kata laluan. Cuba log masuk dengan kata laluan baharu sebelum mencuba lagi. Permintaan mungkin masih selesai dalam beberapa minit.',
    'family.loginUnconfirmedDetach':
      'Kami tidak dapat mengesahkan penanggalan. Muat semula halaman atau hubungi {email} sebelum mencuba lagi.',
    'family.loginUsernameMissing': 'Pilih nama pengguna untuk anak anda.',
    'family.loginUsernameShort': 'Nama pengguna memerlukan sekurang-kurangnya tiga aksara.',
    'family.loginUsernameLong': 'Nama pengguna boleh mengandungi paling banyak tiga puluh aksara.',
    'family.loginUsernameStart': 'Nama pengguna bermula dengan huruf a hingga z atau nombor.',
    'family.loginUsernameChars':
      'Gunakan hanya huruf a hingga z, nombor, titik, sengkang dan garis bawah, tanpa ruang.',
    'family.loginPasswordMissing': 'Tetapkan kata laluan untuk anak anda.',
    'family.loginPasswordShort': 'Kata laluan memerlukan sekurang-kurangnya lapan aksara.',
    'family.loginUnavailable':
      'Log masuk kanak-kanak belum boleh dibuat pada pemasangan ini: kunci pelayan yang membuat akaun belum ditetapkan. Tiada apa-apa berubah.',
    'family.loginNoChild': 'Kanak-kanak itu tidak dapat dikenal pasti.',
    'family.loginGuardianRequired':
      'Penjaga yang kini disahkan dan dibenarkan menguruskan kanak-kanak ini diperlukan. Hubungi {email} untuk bantuan.',
    'family.loginNotYourChild':
      'Hanya orang dewasa dalam keluarga kanak-kanak ini boleh menukar log masuknya.',
    'family.loginNoLogin': 'Kanak-kanak ini tiada log masuk untuk dibuang.',
    'family.loginMalformed': 'Permintaan itu tidak dapat dibaca. Tiada apa-apa berubah.',
  },
  bn: {
    'family.loginLinked': '{name}-এর শিক্ষার্থী প্রোফাইল যুক্ত হয়েছে।',
    'family.loginUsernameIs': 'ব্যবহারকারীর নাম {username}।',
    'family.loginRecovered':
      'এটি আগের একটি চেষ্টা থেকে পুনরুদ্ধার করা হয়েছে। সেই চেষ্টায় ঠিক করা পাসওয়ার্ডই বহাল আছে; এবার যে পাসওয়ার্ড দেওয়া হয়েছে সেটি তার জায়গা নেয়নি।',
    'family.loginHandOver':
      'আপনার বেছে নেওয়া পাসওয়ার্ডটি শিশুকে দিন। প্রথমবার সাইন ইন করার সময় তাকে নিজের পাসওয়ার্ড বেছে নিতে বলা হবে, যা আপনি দেখতে পাবেন না।',
    'family.loginNotMailbox':
      'ব্যবহারকারীর নাম সাইন ইনের একটি পরিচয়, ইমেইলের ডাকবাক্স নয়। পাসওয়ার্ড নিয়ে সাহায্য লাগলে {email} ঠিকানায় লিখুন।',
    'family.loginDone': 'ঠিক আছে',
    'family.loginTitle': 'শিশুর নিজের লগইন',
    'family.loginSignsIn': '{name} সাইন ইন করে {username} ব্যবহারকারীর নাম দিয়ে।',
    'family.loginSignsInSince':
      '{name} সাইন ইন করে {username} ব্যবহারকারীর নাম দিয়ে; তৈরি হয়েছে {date} তারিখে।',
    'family.loginCanReset':
      'একজন যাচাইকৃত অভিভাবক শিশুর বিশ্বস্ত লগইনের জন্য নতুন পাসওয়ার্ড চাইতে পারেন। আগে থেকে খোলা সেশনগুলো সক্রিয় থাকতে পারে।',
    'family.loginNoReset': 'পাসওয়ার্ড পুনরুদ্ধার এই মুহূর্তে এখানে পাওয়া যাচ্ছে না।',
    'family.loginOwnYes': '{name} নিজের পাসওয়ার্ড বেছে নিয়েছে। আপনি সেটি দেখতে পারবেন না।',
    'family.loginOwnNo':
      '{name} এখনো অভিভাবকের ঠিক করা পাসওয়ার্ড ব্যবহার করছে। পরেরবার সাইন ইন করার সময় তাকে নিজের পাসওয়ার্ড বেছে নিতে বলা হবে।',
    'family.loginSetNew': 'নতুন পাসওয়ার্ড ঠিক করুন',
    'family.loginNewPassword': 'নতুন পাসওয়ার্ড',
    'family.loginResetNote':
      'অন্তত আটটি অক্ষর ব্যবহার করুন। ভাগ করে নেওয়া বা পুরোনো সাইন-ইন পর্যালোচনার দরকার হতে পারে। আগে থেকে খোলা সেশনগুলো সক্রিয় থাকতে পারে।',
    'family.loginChecking': 'যাচাই করা হচ্ছে…',
    'family.loginChange': 'পাসওয়ার্ড বদলান',
    'family.loginResetDone':
      'পাসওয়ার্ড বদলের কথা নথিভুক্ত হয়েছে। আগে থেকে খোলা সেশনগুলো সক্রিয় থাকতে পারে।',
    'family.loginDetach': 'এই শিক্ষার্থীকে বিচ্ছিন্ন করুন',
    'family.loginDetachMeans':
      'এতে শিক্ষার্থী প্রোফাইল বিচ্ছিন্ন হয়, কিন্তু সাইন-ইন মুছে যায় না এবং সাইন-ইন পরিষেবায় খোলা সেশনগুলো শেষ হয় না। প্ল্যাটফর্মের পরিচয় যাচাই ব্যবহার করে এমন ডেটাবেস পথগুলোতে বিশ্বস্ত পরিচয়টিও আটকে দেওয়া হতে পারে; অন্য প্রবেশাধিকার থেকে যেতে পারে। সাইন-ইনটি আলাদা করে সরানোর ব্যবস্থা করতে {email} ঠিকানায় লিখুন। পাঠ, অগ্রগতি ও সনদ শিক্ষার্থীর কাছেই থাকে।',
    'family.loginWhy': 'কারণ (ঐচ্ছিক, নথিতে রাখা হয়)',
    'family.loginDetaching': 'বিচ্ছিন্ন করা হচ্ছে…',
    'family.loginDetachYes': 'শিক্ষার্থীকে বিচ্ছিন্ন করুন',
    'family.loginKeep': 'থাক',
    'family.loginUnderTwelve':
      '{name} আপনার সাইন-ইনের মাধ্যমে শেখে। বারো বছর বয়স থেকে একটি শিশুর নিজের লগইন থাকতে পারে।',
    'family.loginNotOffered':
      'এই প্রোফাইলের জন্য শিশুর নতুন লগইন পাওয়া যাচ্ছে না। এটি বন্ধ থাকতে পারে, অথবা আগের কোনো লগইন পর্যালোচনার দরকার হতে পারে। সাহায্যের জন্য {email} ঠিকানায় লিখুন।',
    'family.loginGive': '{name}-কে নিজের লগইন দিন',
    'family.loginUsername': 'ব্যবহারকারীর নাম',
    'family.loginFirstPassword':
      'এই প্রথম পাসওয়ার্ডটি আপনিই {name}-এর হাতে দেবেন। এটি সরাসরি সাইন-ইন পরিষেবায় পাঠানো হয় এবং এরপর কেউ, আমরাও নয়, সেটি পড়তে পারে না। সাইন ইন করলে শিশুকে নিজের পাসওয়ার্ড বেছে নিতে বলা হয়।',
    'family.loginConfirmTwelve':
      'আমি নিশ্চিত করছি যে {name}-এর বয়স বারো বছর বা তার বেশি। আমরা জন্মতারিখ জানতে চাই না; আপনার উত্তর নথিভুক্ত করা হয়।',
    'family.loginMaking': 'লগইন তৈরি হচ্ছে…',
    'family.loginMake': '{name}-এর লগইন তৈরি করুন',
    'family.loginTickFirst':
      'আগে নিশ্চিত করুন যে এই শিশুর বয়স বারো বছর বা তার বেশি। কিছুই তৈরি হয়নি।',
    'family.loginTooYoung':
      'বারো বছরের কম বয়সী শিশুর নিজের লগইন থাকে না। সে আপনার সাইন-ইনের মাধ্যমে শেখে। কিছুই তৈরি হয়নি।',
    'family.loginUnconfirmedMake':
      'আমরা এই লগইন নিশ্চিত করতে পারিনি। আবার চেষ্টা করার আগে পরিবারের পাতাটি আবার লোড করুন অথবা {email} ঠিকানায় লিখুন। আবার চেষ্টা করলে প্রথম পাসওয়ার্ডটিই ব্যবহার করুন।',
    'family.loginUnconfirmedReset':
      'আমরা পাসওয়ার্ড বদল নিশ্চিত করতে পারিনি। আবার চেষ্টা করার আগে নতুন পাসওয়ার্ড দিয়ে সাইন ইন করে দেখুন। অনুরোধটি কয়েক মিনিটের মধ্যে সম্পন্ন হতে পারে।',
    'family.loginUnconfirmedDetach':
      'আমরা বিচ্ছিন্ন হওয়া নিশ্চিত করতে পারিনি। আবার চেষ্টা করার আগে পাতাটি আবার লোড করুন অথবা {email} ঠিকানায় লিখুন।',
    'family.loginUsernameMissing': 'আপনার সন্তানের জন্য একটি ব্যবহারকারীর নাম বেছে নিন।',
    'family.loginUsernameShort': 'ব্যবহারকারীর নামে অন্তত তিনটি অক্ষর লাগে।',
    'family.loginUsernameLong': 'ব্যবহারকারীর নাম সর্বোচ্চ ত্রিশ অক্ষরের হতে পারে।',
    'family.loginUsernameStart':
      'ব্যবহারকারীর নাম শুরু হয় a থেকে z পর্যন্ত কোনো ইংরেজি অক্ষর অথবা কোনো সংখ্যা দিয়ে।',
    'family.loginUsernameChars':
      'শুধু a থেকে z পর্যন্ত ইংরেজি অক্ষর, সংখ্যা, ডট, ড্যাশ ও আন্ডারস্কোর ব্যবহার করুন; ফাঁকা জায়গা নয়।',
    'family.loginPasswordMissing': 'আপনার সন্তানের জন্য একটি পাসওয়ার্ড ঠিক করুন।',
    'family.loginPasswordShort': 'পাসওয়ার্ডে অন্তত আটটি অক্ষর লাগে।',
    'family.loginUnavailable':
      'এই স্থাপনায় এখনো শিশুদের লগইন তৈরি করা যায় না: যে সার্ভার-চাবি অ্যাকাউন্ট তৈরি করে সেটি ঠিক করা নেই। কিছুই বদলায়নি।',
    'family.loginNoChild': 'ওই শিশুকে শনাক্ত করা যায়নি।',
    'family.loginGuardianRequired':
      'এই শিশুকে পরিচালনার অনুমতি আছে এমন একজন বর্তমানে যাচাইকৃত অভিভাবক দরকার। সাহায্যের জন্য {email} ঠিকানায় লিখুন।',
    'family.loginNotYourChild': 'কেবল এই শিশুর পরিবারের একজন প্রাপ্তবয়স্কই তার লগইন বদলাতে পারেন।',
    'family.loginNoLogin': 'এই শিশুর সরানোর মতো কোনো লগইন নেই।',
    'family.loginMalformed': 'অনুরোধটি পড়া যায়নি। কিছুই বদলায়নি।',
  },
  hi: {
    'family.loginLinked': '{name} की शिक्षार्थी प्रोफ़ाइल जोड़ दी गई है।',
    'family.loginUsernameIs': 'उपयोगकर्ता नाम {username} है।',
    'family.loginRecovered':
      'यह एक पिछली कोशिश से बहाल हुआ है। उस पिछली कोशिश में रखा गया पासवर्ड ही लागू है; इस बार डाला गया पासवर्ड उसकी जगह नहीं ले सका।',
    'family.loginHandOver':
      'बच्चे को वह पासवर्ड दे दें जो आपने चुना है। पहली बार साइन इन करने पर बच्चे से अपना पासवर्ड चुनने को कहा जाएगा, जिसे आप नहीं देख सकेंगे।',
    'family.loginNotMailbox':
      'उपयोगकर्ता नाम साइन इन की पहचान है, ईमेल का डिब्बा नहीं। पासवर्ड में मदद चाहिए तो {email} पर लिखें।',
    'family.loginDone': 'ठीक है',
    'family.loginTitle': 'बच्चे का अपना लॉगिन',
    'family.loginSignsIn': '{name} के साइन इन का उपयोगकर्ता नाम {username} है।',
    'family.loginSignsInSince':
      '{name} के साइन इन का उपयोगकर्ता नाम {username} है, जो {date} को बनाया गया।',
    'family.loginCanReset':
      'सत्यापित अभिभावक बच्चे के भरोसेमंद लॉगिन के लिए नया पासवर्ड माँग सकता है। पहले से खुले सत्र सक्रिय रह सकते हैं।',
    'family.loginNoReset': 'पासवर्ड की बहाली अभी यहाँ उपलब्ध नहीं है।',
    'family.loginOwnYes': '{name} ने अपना पासवर्ड ख़ुद चुन लिया है। आप उसे नहीं देख सकते।',
    'family.loginOwnNo':
      '{name} के पास अभी वही पासवर्ड है जो अभिभावक ने रखा था। अगली बार साइन इन पर बच्चे से अपना पासवर्ड चुनने को कहा जाएगा।',
    'family.loginSetNew': 'नया पासवर्ड रखें',
    'family.loginNewPassword': 'नया पासवर्ड',
    'family.loginResetNote':
      'कम से कम आठ अक्षर इस्तेमाल करें। साझा या पुराने साइन-इन की समीक्षा ज़रूरी हो सकती है। पहले से खुले सत्र सक्रिय रह सकते हैं।',
    'family.loginChecking': 'जाँच हो रही है…',
    'family.loginChange': 'पासवर्ड बदलें',
    'family.loginResetDone': 'पासवर्ड का बदलाव दर्ज हो गया। पहले से खुले सत्र सक्रिय रह सकते हैं।',
    'family.loginDetach': 'इस शिक्षार्थी को अलग करें',
    'family.loginDetachMeans':
      'इससे शिक्षार्थी प्रोफ़ाइल अलग हो जाती है, पर साइन-इन मिटता नहीं और साइन-इन सेवा के खुले सत्र ख़त्म नहीं होते। भरोसेमंद पहचान डेटाबेस के उन रास्तों पर भी रोकी जा सकती है जो प्लेटफ़ॉर्म की पहचान-जाँच इस्तेमाल करते हैं; बाक़ी पहुँच बनी रह सकती है। साइन-इन को अलग से हटवाने के लिए {email} पर लिखें। पाठ, प्रगति और प्रमाणपत्र शिक्षार्थी के पास रहते हैं।',
    'family.loginWhy': 'कारण (वैकल्पिक, रिकॉर्ड में रखा जाता है)',
    'family.loginDetaching': 'अलग किया जा रहा है…',
    'family.loginDetachYes': 'शिक्षार्थी को अलग करें',
    'family.loginKeep': 'रहने दें',
    'family.loginUnderTwelve':
      '{name} का सीखना आपके साइन-इन के ज़रिए होता है। बच्चे का अपना लॉगिन बारह साल की उम्र से हो सकता है।',
    'family.loginNotOffered':
      'इस प्रोफ़ाइल के लिए बच्चे का नया लॉगिन उपलब्ध नहीं है। हो सकता है यह बंद हो या किसी पिछले लॉगिन की समीक्षा ज़रूरी हो। मदद के लिए {email} पर लिखें।',
    'family.loginGive': '{name} के लिए अपना लॉगिन बनाएँ',
    'family.loginUsername': 'उपयोगकर्ता नाम',
    'family.loginFirstPassword':
      'यह पहला पासवर्ड आपको {name} के हाथ में देना है। यह सीधे साइन-इन सेवा को भेजा जाता है और उसके बाद कोई भी, हम भी नहीं, इसे पढ़ नहीं सकता। साइन इन करने पर बच्चे से अपना पासवर्ड चुनने को कहा जाता है।',
    'family.loginConfirmTwelve':
      'मेरी ओर से पुष्टि है कि {name} की उम्र बारह साल या उससे ज़्यादा है। हम जन्मतिथि नहीं पूछते; आपका उत्तर दर्ज किया जाता है।',
    'family.loginMaking': 'लॉगिन बनाया जा रहा है…',
    'family.loginMake': '{name} का लॉगिन बनाएँ',
    'family.loginTickFirst':
      'पहले पुष्टि करें कि इस बच्चे की उम्र बारह साल या उससे ज़्यादा है। कुछ नहीं बनाया गया।',
    'family.loginTooYoung':
      'बारह साल से कम उम्र के बच्चे का अपना लॉगिन नहीं होता। ऐसा बच्चा आपके साइन-इन के ज़रिए सीखता है। कुछ नहीं बनाया गया।',
    'family.loginUnconfirmedMake':
      'हम इस लॉगिन की पुष्टि नहीं कर सके। दोबारा कोशिश से पहले परिवार का पृष्ठ फिर से लोड करें या {email} पर लिखें। दोबारा कोशिश करें तो मूल पासवर्ड ही इस्तेमाल करें।',
    'family.loginUnconfirmedReset':
      'हम पासवर्ड के बदलाव की पुष्टि नहीं कर सके। दोबारा कोशिश से पहले नए पासवर्ड से साइन इन करके देखें। अनुरोध कुछ मिनट में पूरा हो सकता है।',
    'family.loginUnconfirmedDetach':
      'हम अलग होने की पुष्टि नहीं कर सके। दोबारा कोशिश से पहले पृष्ठ फिर से लोड करें या {email} पर लिखें।',
    'family.loginUsernameMissing': 'अपने बच्चे के लिए उपयोगकर्ता नाम चुनें।',
    'family.loginUsernameShort': 'उपयोगकर्ता नाम में कम से कम तीन अक्षर चाहिए।',
    'family.loginUsernameLong': 'उपयोगकर्ता नाम ज़्यादा से ज़्यादा तीस अक्षरों का हो सकता है।',
    'family.loginUsernameStart':
      'उपयोगकर्ता नाम a से z तक के किसी अंग्रेज़ी अक्षर या किसी अंक से शुरू होता है।',
    'family.loginUsernameChars':
      'केवल a से z तक के अंग्रेज़ी अक्षर, अंक, बिंदु, डैश और अंडरस्कोर इस्तेमाल करें; ख़ाली जगह नहीं।',
    'family.loginPasswordMissing': 'अपने बच्चे के लिए पासवर्ड रखें।',
    'family.loginPasswordShort': 'पासवर्ड में कम से कम आठ अक्षर चाहिए।',
    'family.loginUnavailable':
      'इस स्थापना पर अभी बच्चों के लॉगिन नहीं बनाए जा सकते: खाता बनाने वाली सर्वर कुंजी सेट नहीं है। कुछ नहीं बदला।',
    'family.loginNoChild': 'उस बच्चे की पहचान नहीं हो सकी।',
    'family.loginGuardianRequired':
      'ऐसा मौजूदा सत्यापित अभिभावक चाहिए जिसे इस बच्चे के प्रबंधन की अनुमति हो। मदद के लिए {email} पर लिखें।',
    'family.loginNotYourChild': 'इस बच्चे का लॉगिन केवल उसके परिवार का कोई वयस्क बदल सकता है।',
    'family.loginNoLogin': 'इस बच्चे का कोई लॉगिन नहीं है जिसे हटाया जाए।',
    'family.loginMalformed': 'वह अनुरोध पढ़ा नहीं जा सका। कुछ नहीं बदला।',
  },
  fr: {
    'family.loginLinked': 'Le profil d’apprenant de {name} est relié.',
    'family.loginUsernameIs': 'Le nom d’utilisateur est {username}.',
    'family.loginRecovered':
      'Ceci a été récupéré d’une tentative précédente. Le mot de passe choisi lors de cette tentative reste en vigueur ; celui saisi cette fois-ci ne l’a pas remplacé.',
    'family.loginHandOver':
      'Donnez à l’enfant le mot de passe que vous avez choisi. À sa première connexion, il lui sera demandé de choisir le sien, que vous ne verrez pas.',
    'family.loginNotMailbox':
      'Le nom d’utilisateur est un identifiant de connexion, pas une boîte e-mail. Écrivez à {email} si vous avez besoin d’aide pour le mot de passe.',
    'family.loginDone': 'Terminé',
    'family.loginTitle': 'Sa propre connexion',
    'family.loginSignsIn': '{name} se connecte avec le nom d’utilisateur {username}.',
    'family.loginSignsInSince':
      '{name} se connecte avec le nom d’utilisateur {username}, créé le {date}.',
    'family.loginCanReset':
      'Un tuteur vérifié peut demander un nouveau mot de passe pour la connexion de confiance d’un enfant. Les sessions déjà ouvertes peuvent rester actives.',
    'family.loginNoReset':
      'La récupération du mot de passe n’est pas disponible ici pour l’instant.',
    'family.loginOwnYes': '{name} a choisi son propre mot de passe. Vous ne pouvez pas le voir.',
    'family.loginOwnNo':
      '{name} utilise encore un mot de passe choisi par un tuteur. À sa prochaine connexion, il lui sera demandé de choisir le sien.',
    'family.loginSetNew': 'Définir un nouveau mot de passe',
    'family.loginNewPassword': 'Nouveau mot de passe',
    'family.loginResetNote':
      'Utilisez au moins huit caractères. Les connexions partagées ou anciennes peuvent nécessiter un examen. Les sessions déjà ouvertes peuvent rester actives.',
    'family.loginChecking': 'Vérification…',
    'family.loginChange': 'Changer le mot de passe',
    'family.loginResetDone':
      'Le changement de mot de passe a été enregistré. Les sessions déjà ouvertes peuvent rester actives.',
    'family.loginDetach': 'Détacher cet apprenant',
    'family.loginDetachMeans':
      'Ceci détache le profil d’apprenant, mais ne supprime pas la connexion et ne ferme pas les sessions ouvertes auprès du service de connexion. Une identité de confiance peut aussi être bloquée sur les chemins de la base de données qui utilisent le contrôle d’identité de la plateforme ; d’autres accès peuvent subsister. Écrivez à {email} pour faire retirer la connexion elle-même. Les leçons, la progression et les certificats restent à l’apprenant.',
    'family.loginWhy': 'Pourquoi (facultatif, conservé au dossier)',
    'family.loginDetaching': 'Détachement…',
    'family.loginDetachYes': 'Détacher l’apprenant',
    'family.loginKeep': 'Le garder',
    'family.loginUnderTwelve':
      '{name} apprend avec votre connexion. Un enfant peut avoir sa propre connexion à partir de douze ans.',
    'family.loginNotOffered':
      'Une nouvelle connexion d’enfant n’est pas disponible pour ce profil. Elle est peut-être désactivée, ou une connexion antérieure demande un examen. Écrivez à {email} pour obtenir de l’aide.',
    'family.loginGive': 'Donner à {name} sa propre connexion',
    'family.loginUsername': 'Nom d’utilisateur',
    'family.loginFirstPassword':
      'Ce premier mot de passe, c’est vous qui le remettez à {name}. Il est envoyé directement au service de connexion et personne, pas même nous, ne peut le relire ensuite. À la connexion, on demande à l’enfant de choisir le sien.',
    'family.loginConfirmTwelve':
      'Je confirme que {name} a douze ans ou plus. Nous ne demandons pas de date de naissance ; votre réponse est enregistrée.',
    'family.loginMaking': 'Création de la connexion…',
    'family.loginMake': 'Créer la connexion de {name}',
    'family.loginTickFirst':
      'Confirmez d’abord que cet enfant a douze ans ou plus. Rien n’a été créé.',
    'family.loginTooYoung':
      'Un enfant de moins de douze ans n’a pas de connexion à lui. Il apprend avec votre connexion. Rien n’a été créé.',
    'family.loginUnconfirmedMake':
      'Nous n’avons pas pu confirmer cette connexion. Rechargez la page de la famille ou écrivez à {email} avant de réessayer. Si vous réessayez, utilisez le mot de passe d’origine.',
    'family.loginUnconfirmedReset':
      'Nous n’avons pas pu confirmer le changement de mot de passe. Essayez de vous connecter avec le nouveau mot de passe avant de réessayer. Une demande peut encore aboutir pendant quelques minutes.',
    'family.loginUnconfirmedDetach':
      'Nous n’avons pas pu confirmer le détachement. Rechargez la page ou écrivez à {email} avant de réessayer.',
    'family.loginUsernameMissing': 'Choisissez un nom d’utilisateur pour votre enfant.',
    'family.loginUsernameShort': 'Un nom d’utilisateur compte au moins trois caractères.',
    'family.loginUsernameLong': 'Un nom d’utilisateur compte au plus trente caractères.',
    'family.loginUsernameStart':
      'Un nom d’utilisateur commence par une lettre sans accent, de a à z, ou par un chiffre.',
    'family.loginUsernameChars':
      'N’utilisez que des lettres sans accent de a à z, des chiffres, des points, des tirets et des tirets bas, sans espace.',
    'family.loginPasswordMissing': 'Choisissez un mot de passe pour votre enfant.',
    'family.loginPasswordShort': 'Un mot de passe compte au moins huit caractères.',
    'family.loginUnavailable':
      'Les connexions d’enfant ne peuvent pas encore être créées sur cette installation : la clé du serveur qui crée un compte n’est pas configurée. Rien n’a été modifié.',
    'family.loginNoChild': 'Cet enfant n’a pas pu être identifié.',
    'family.loginGuardianRequired':
      'Il faut un tuteur actuellement vérifié et autorisé à gérer cet enfant. Écrivez à {email} pour obtenir de l’aide.',
    'family.loginNotYourChild':
      'Seul un adulte de la famille de cet enfant peut modifier sa connexion.',
    'family.loginNoLogin': 'Cet enfant n’a pas de connexion à retirer.',
    'family.loginMalformed': 'Cette demande n’a pas pu être lue. Rien n’a été modifié.',
  },
  es: {
    'family.loginLinked': 'El perfil de alumno de {name} está vinculado.',
    'family.loginUsernameIs': 'El nombre de usuario es {username}.',
    'family.loginRecovered':
      'Esto se recuperó de un intento anterior. La contraseña fijada en aquel intento sigue en vigor; la que se introdujo en este intento no la sustituyó.',
    'family.loginHandOver':
      'Dele al niño la contraseña que usted eligió. La primera vez que inicie sesión se le pedirá que elija la suya, que usted no verá.',
    'family.loginNotMailbox':
      'El nombre de usuario es un identificador para iniciar sesión, no un buzón de correo. Escriba a {email} si necesita ayuda con la contraseña.',
    'family.loginDone': 'Listo',
    'family.loginTitle': 'Su propio inicio de sesión',
    'family.loginSignsIn': '{name} inicia sesión con el nombre de usuario {username}.',
    'family.loginSignsInSince':
      '{name} inicia sesión con el nombre de usuario {username}, creado el {date}.',
    'family.loginCanReset':
      'Un tutor verificado puede pedir una contraseña nueva para un inicio de sesión infantil de confianza. Las sesiones ya abiertas pueden seguir activas.',
    'family.loginNoReset':
      'La recuperación de la contraseña no está disponible aquí en este momento.',
    'family.loginOwnYes': '{name} ha elegido su propia contraseña. Usted no puede verla.',
    'family.loginOwnNo':
      '{name} sigue usando una contraseña que puso un tutor. La próxima vez que inicie sesión se le pedirá que elija la suya.',
    'family.loginSetNew': 'Poner una contraseña nueva',
    'family.loginNewPassword': 'Contraseña nueva',
    'family.loginResetNote':
      'Use al menos ocho caracteres. Los inicios de sesión compartidos o antiguos pueden requerir revisión. Las sesiones ya abiertas pueden seguir activas.',
    'family.loginChecking': 'Comprobando…',
    'family.loginChange': 'Cambiar la contraseña',
    'family.loginResetDone':
      'El cambio de contraseña quedó registrado. Las sesiones ya abiertas pueden seguir activas.',
    'family.loginDetach': 'Desvincular a este alumno',
    'family.loginDetachMeans':
      'Esto desvincula el perfil de alumno, pero no elimina el inicio de sesión ni cierra las sesiones abiertas en el servicio de inicio de sesión. Una identidad de confianza también puede quedar bloqueada en las rutas de la base de datos que usan la comprobación de identidad de la plataforma; otros accesos pueden mantenerse. Escriba a {email} para gestionar la eliminación del inicio de sesión en sí. Las lecciones, el progreso y los certificados se quedan con el alumno.',
    'family.loginWhy': 'Motivo (opcional; se guarda en el registro)',
    'family.loginDetaching': 'Desvinculando…',
    'family.loginDetachYes': 'Desvincular al alumno',
    'family.loginKeep': 'Conservarlo',
    'family.loginUnderTwelve':
      '{name} aprende a través del inicio de sesión de usted. Un niño puede tener su propio inicio de sesión a partir de los doce años.',
    'family.loginNotOffered':
      'No hay disponible un nuevo inicio de sesión infantil para este perfil. Puede estar desactivado o puede que un inicio de sesión anterior necesite revisión. Escriba a {email} para recibir ayuda.',
    'family.loginGive': 'Dar a {name} su propio inicio de sesión',
    'family.loginUsername': 'Nombre de usuario',
    'family.loginFirstPassword':
      'Esta primera contraseña la entrega usted a {name}. Se envía directamente al servicio de inicio de sesión y después nadie, ni siquiera nosotros, puede volver a leerla. Al iniciar sesión, al niño se le pide que elija la suya.',
    'family.loginConfirmTwelve':
      'Confirmo que {name} tiene doce años o más. No pedimos fecha de nacimiento; su respuesta queda registrada.',
    'family.loginMaking': 'Creando el inicio de sesión…',
    'family.loginMake': 'Crear el inicio de sesión de {name}',
    'family.loginTickFirst':
      'Confirme primero que este niño tiene doce años o más. No se creó nada.',
    'family.loginTooYoung':
      'Un niño menor de doce años no tiene inicio de sesión propio. Aprende a través del inicio de sesión de usted. No se creó nada.',
    'family.loginUnconfirmedMake':
      'No pudimos confirmar este inicio de sesión. Recargue la página de la familia o escriba a {email} antes de volver a intentarlo. Si lo intenta de nuevo, use la contraseña original.',
    'family.loginUnconfirmedReset':
      'No pudimos confirmar el cambio de contraseña. Pruebe a iniciar sesión con la contraseña nueva antes de intentarlo de nuevo. Una solicitud aún puede completarse durante unos minutos.',
    'family.loginUnconfirmedDetach':
      'No pudimos confirmar la desvinculación. Recargue la página o escriba a {email} antes de intentarlo de nuevo.',
    'family.loginUsernameMissing': 'Elija un nombre de usuario para el niño.',
    'family.loginUsernameShort': 'Un nombre de usuario necesita al menos tres caracteres.',
    'family.loginUsernameLong': 'Un nombre de usuario puede tener como máximo treinta caracteres.',
    'family.loginUsernameStart':
      'Un nombre de usuario empieza por una letra sin tilde, de la a a la z, o por un número.',
    'family.loginUsernameChars':
      'Use solo letras sin tilde de la a a la z (sin ñ), números, puntos, guiones y guiones bajos, sin espacios.',
    'family.loginPasswordMissing': 'Ponga una contraseña para el niño.',
    'family.loginPasswordShort': 'Una contraseña necesita al menos ocho caracteres.',
    'family.loginUnavailable':
      'Todavía no se pueden crear inicios de sesión infantiles en esta instalación: la clave del servidor que crea una cuenta no está configurada. No se cambió nada.',
    'family.loginNoChild': 'No se pudo identificar a ese niño.',
    'family.loginGuardianRequired':
      'Hace falta un tutor verificado actualmente y con permiso para gestionar a este niño. Escriba a {email} para recibir ayuda.',
    'family.loginNotYourChild':
      'Solo un adulto de la familia de este niño puede cambiar su inicio de sesión.',
    'family.loginNoLogin': 'Este niño no tiene un inicio de sesión que quitar.',
    'family.loginMalformed': 'No se pudo leer esa solicitud. No se cambió nada.',
  },
  pt: {
    'family.loginLinked': 'O perfil de aluno de {name} está ligado.',
    'family.loginUsernameIs': 'O nome de utilizador é {username}.',
    'family.loginRecovered':
      'Isto foi recuperado de uma tentativa anterior. A palavra-passe definida nessa tentativa continua em vigor; a que foi introduzida nesta tentativa não a substituiu.',
    'family.loginHandOver':
      'Dê à criança a palavra-passe que escolheu. Na primeira vez que a criança iniciar sessão, é-lhe pedido que escolha uma só dela, que o adulto não vê.',
    'family.loginNotMailbox':
      'O nome de utilizador é um identificador para iniciar sessão, não uma caixa de correio. Escreva para {email} se precisar de ajuda com a palavra-passe.',
    'family.loginDone': 'Concluído',
    'family.loginTitle': 'Início de sessão próprio',
    'family.loginSignsIn': '{name} inicia sessão com o nome de utilizador {username}.',
    'family.loginSignsInSince':
      '{name} inicia sessão com o nome de utilizador {username}, criado em {date}.',
    'family.loginCanReset':
      'Um tutor verificado pode pedir uma nova palavra-passe para um início de sessão de criança de confiança. As sessões já abertas podem continuar ativas.',
    'family.loginNoReset': 'A recuperação da palavra-passe não está disponível aqui neste momento.',
    'family.loginOwnYes': '{name} escolheu a sua própria palavra-passe. Não a pode ver.',
    'family.loginOwnNo':
      '{name} ainda usa uma palavra-passe definida por um tutor. Da próxima vez que iniciar sessão, é-lhe pedido que escolha a sua.',
    'family.loginSetNew': 'Definir uma nova palavra-passe',
    'family.loginNewPassword': 'Nova palavra-passe',
    'family.loginResetNote':
      'Use pelo menos oito caracteres. Inícios de sessão partilhados ou antigos podem exigir revisão. As sessões já abertas podem continuar ativas.',
    'family.loginChecking': 'A verificar…',
    'family.loginChange': 'Alterar a palavra-passe',
    'family.loginResetDone':
      'A alteração da palavra-passe ficou registada. As sessões já abertas podem continuar ativas.',
    'family.loginDetach': 'Desligar este aluno',
    'family.loginDetachMeans':
      'Isto desliga o perfil de aluno, mas não elimina o início de sessão nem termina as sessões abertas no serviço de início de sessão. Uma identidade de confiança também pode ser bloqueada nos caminhos da base de dados que usam a verificação de identidade da plataforma; outros acessos podem manter-se. Escreva para {email} para tratar da remoção do próprio início de sessão. As lições, o progresso e os certificados ficam com o aluno.',
    'family.loginWhy': 'Porquê (opcional; fica guardado no registo)',
    'family.loginDetaching': 'A desligar…',
    'family.loginDetachYes': 'Desligar o aluno',
    'family.loginKeep': 'Manter',
    'family.loginUnderTwelve':
      '{name} aprende através do seu início de sessão de adulto. Uma criança pode ter o seu próprio início de sessão a partir dos doze anos.',
    'family.loginNotOffered':
      'Não está disponível um novo início de sessão de criança para este perfil. Pode estar desligado ou um início de sessão anterior pode precisar de revisão. Escreva para {email} para obter ajuda.',
    'family.loginGive': 'Dar a {name} um início de sessão próprio',
    'family.loginUsername': 'Nome de utilizador',
    'family.loginFirstPassword':
      'Esta primeira palavra-passe é para entregar a {name}. É enviada diretamente ao serviço de início de sessão e depois ninguém, nem nós, a consegue voltar a ler. Ao iniciar sessão, é pedido à criança que escolha a sua.',
    'family.loginConfirmTwelve':
      'Confirmo que {name} tem doze anos ou mais. Não pedimos a data de nascimento; a sua resposta fica registada.',
    'family.loginMaking': 'A criar o início de sessão…',
    'family.loginMake': 'Criar o início de sessão de {name}',
    'family.loginTickFirst':
      'Confirme primeiro que esta criança tem doze anos ou mais. Nada foi criado.',
    'family.loginTooYoung':
      'Uma criança com menos de doze anos não tem início de sessão próprio. Aprende através do seu início de sessão de adulto. Nada foi criado.',
    'family.loginUnconfirmedMake':
      'Não conseguimos confirmar este início de sessão. Recarregue a página da família ou escreva para {email} antes de tentar de novo. Se tentar de novo, use a palavra-passe original.',
    'family.loginUnconfirmedReset':
      'Não conseguimos confirmar a alteração da palavra-passe. Experimente iniciar sessão com a nova palavra-passe antes de tentar de novo. Um pedido ainda pode concluir-se durante alguns minutos.',
    'family.loginUnconfirmedDetach':
      'Não conseguimos confirmar o desligamento. Recarregue a página ou escreva para {email} antes de tentar de novo.',
    'family.loginUsernameMissing': 'Escolha um nome de utilizador para a criança.',
    'family.loginUsernameShort': 'Um nome de utilizador precisa de pelo menos três caracteres.',
    'family.loginUsernameLong': 'Um nome de utilizador pode ter no máximo trinta caracteres.',
    'family.loginUsernameStart':
      'Um nome de utilizador começa por uma letra sem acento, de a a z, ou por um número.',
    'family.loginUsernameChars':
      'Use apenas letras sem acento de a a z, números, pontos, hífenes e sublinhados, sem espaços.',
    'family.loginPasswordMissing': 'Defina uma palavra-passe para a criança.',
    'family.loginPasswordShort': 'Uma palavra-passe precisa de pelo menos oito caracteres.',
    'family.loginUnavailable':
      'Ainda não é possível criar inícios de sessão de criança nesta instalação: a chave do servidor que cria uma conta não está configurada. Nada foi alterado.',
    'family.loginNoChild': 'Não foi possível identificar essa criança.',
    'family.loginGuardianRequired':
      'É necessário um tutor atualmente verificado e com permissão para gerir esta criança. Escreva para {email} para obter ajuda.',
    'family.loginNotYourChild':
      'Só um adulto da família desta criança pode alterar o início de sessão dela.',
    'family.loginNoLogin': 'Esta criança não tem início de sessão para remover.',
    'family.loginMalformed': 'Não foi possível ler esse pedido. Nada foi alterado.',
  },
  sw: {
    'family.loginLinked': 'Wasifu wa mwanafunzi wa {name} umeunganishwa.',
    'family.loginUsernameIs': 'Jina la mtumiaji ni {username}.',
    'family.loginRecovered':
      'Hii imerejeshwa kutoka jaribio la awali. Nenosiri lililowekwa katika jaribio hilo bado linatumika; nenosiri lililoingizwa katika jaribio hili halikulibadilisha.',
    'family.loginHandOver':
      'Mpe mtoto nenosiri ulilochagua. Mara ya kwanza atakapoingia ataombwa achague lake mwenyewe, ambalo hutaliona.',
    'family.loginNotMailbox':
      'Jina la mtumiaji ni kitambulisho cha kuingia, si sanduku la barua pepe. Andika kwa {email} ukihitaji msaada kuhusu nenosiri.',
    'family.loginDone': 'Sawa',
    'family.loginTitle': 'Akaunti yake ya kuingia',
    'family.loginSignsIn': '{name} huingia kwa jina la mtumiaji {username}.',
    'family.loginSignsInSince':
      '{name} huingia kwa jina la mtumiaji {username}, lililoundwa tarehe {date}.',
    'family.loginCanReset':
      'Mlezi aliyethibitishwa anaweza kuomba nenosiri jipya kwa akaunti ya kuingia ya mtoto inayoaminika. Vipindi vilivyo wazi vinaweza kubaki hai.',
    'family.loginNoReset': 'Urejeshaji wa nenosiri haupatikani hapa kwa sasa.',
    'family.loginOwnYes': '{name} amechagua nenosiri lake mwenyewe. Huwezi kuliona.',
    'family.loginOwnNo':
      '{name} bado anatumia nenosiri lililowekwa na mlezi. Atakapoingia tena ataombwa achague lake mwenyewe.',
    'family.loginSetNew': 'Weka nenosiri jipya',
    'family.loginNewPassword': 'Nenosiri jipya',
    'family.loginResetNote':
      'Tumia angalau herufi nane. Akaunti za kuingia zinazoshirikiwa au za zamani zinaweza kuhitaji kukaguliwa. Vipindi vilivyo wazi vinaweza kubaki hai.',
    'family.loginChecking': 'Inakagua…',
    'family.loginChange': 'Badilisha nenosiri',
    'family.loginResetDone':
      'Mabadiliko ya nenosiri yamerekodiwa. Vipindi vilivyo wazi vinaweza kubaki hai.',
    'family.loginDetach': 'Tenganisha mwanafunzi huyu',
    'family.loginDetachMeans':
      'Hii inatenganisha wasifu wa mwanafunzi lakini haifuti akaunti ya kuingia wala haimalizi vipindi vilivyo wazi kwenye huduma ya kuingia. Utambulisho unaoaminika unaweza pia kuzuiwa kwenye njia za hifadhidata zinazotumia ukaguzi wa utambulisho wa jukwaa; ufikiaji mwingine unaweza kubaki. Andika kwa {email} ili kupanga kuondolewa kwa akaunti ya kuingia yenyewe. Masomo, maendeleo na vyeti vinabaki kwa mwanafunzi.',
    'family.loginWhy': 'Sababu (si lazima; huwekwa kwenye kumbukumbu)',
    'family.loginDetaching': 'Inatenganisha…',
    'family.loginDetachYes': 'Tenganisha mwanafunzi',
    'family.loginKeep': 'Iache',
    'family.loginUnderTwelve':
      '{name} hujifunza kupitia kuingia kwako. Mtoto anaweza kuwa na akaunti yake ya kuingia kuanzia umri wa miaka kumi na miwili.',
    'family.loginNotOffered':
      'Akaunti mpya ya kuingia ya mtoto haipatikani kwa wasifu huu. Huenda imezimwa au akaunti ya awali inahitaji kukaguliwa. Andika kwa {email} kupata msaada.',
    'family.loginGive': 'Mpe {name} akaunti yake ya kuingia',
    'family.loginUsername': 'Jina la mtumiaji',
    'family.loginFirstPassword':
      'Nenosiri hili la kwanza ni lako kumkabidhi {name}. Hutumwa moja kwa moja kwa huduma ya kuingia na baada ya hapo hakuna mtu, hata sisi, anayeweza kulisoma tena. Mtoto anapoingia huombwa achague lake mwenyewe.',
    'family.loginConfirmTwelve':
      'Ninathibitisha kwamba {name} ana umri wa miaka kumi na miwili au zaidi. Hatuulizi tarehe ya kuzaliwa; jibu lako hurekodiwa.',
    'family.loginMaking': 'Inaunda akaunti ya kuingia…',
    'family.loginMake': 'Unda akaunti ya kuingia ya {name}',
    'family.loginTickFirst':
      'Thibitisha kwanza kwamba mtoto huyu ana umri wa miaka kumi na miwili au zaidi. Hakuna kilichoundwa.',
    'family.loginTooYoung':
      'Mtoto aliye chini ya miaka kumi na miwili hana akaunti yake ya kuingia. Hujifunza kupitia kuingia kwako. Hakuna kilichoundwa.',
    'family.loginUnconfirmedMake':
      'Hatukuweza kuthibitisha akaunti hii ya kuingia. Pakia upya ukurasa wa familia au andika kwa {email} kabla ya kujaribu tena. Ukijaribu tena, tumia nenosiri la awali.',
    'family.loginUnconfirmedReset':
      'Hatukuweza kuthibitisha mabadiliko ya nenosiri. Jaribu kuingia kwa nenosiri jipya kabla ya kujaribu tena. Ombi linaweza bado kukamilika ndani ya dakika chache.',
    'family.loginUnconfirmedDetach':
      'Hatukuweza kuthibitisha utenganishaji. Pakia upya ukurasa au andika kwa {email} kabla ya kujaribu tena.',
    'family.loginUsernameMissing': 'Chagua jina la mtumiaji kwa ajili ya mtoto wako.',
    'family.loginUsernameShort': 'Jina la mtumiaji linahitaji angalau herufi tatu.',
    'family.loginUsernameLong': 'Jina la mtumiaji linaweza kuwa na herufi thelathini tu.',
    'family.loginUsernameStart': 'Jina la mtumiaji huanza kwa herufi kati ya a na z au kwa namba.',
    'family.loginUsernameChars':
      'Tumia herufi a hadi z, namba, nukta, vistari na vistari vya chini pekee, bila nafasi.',
    'family.loginPasswordMissing': 'Weka nenosiri kwa ajili ya mtoto wako.',
    'family.loginPasswordShort': 'Nenosiri linahitaji angalau herufi nane.',
    'family.loginUnavailable':
      'Akaunti za kuingia za watoto haziwezi kuundwa bado kwenye usakinishaji huu: ufunguo wa seva unaounda akaunti haujasanidiwa. Hakuna kilichobadilika.',
    'family.loginNoChild': 'Mtoto huyo hakuweza kutambuliwa.',
    'family.loginGuardianRequired':
      'Anahitajika mlezi aliyethibitishwa kwa sasa na mwenye ruhusa ya kumsimamia mtoto huyu. Andika kwa {email} kupata msaada.',
    'family.loginNotYourChild':
      'Ni mtu mzima wa familia ya mtoto huyu pekee anayeweza kubadilisha akaunti yake ya kuingia.',
    'family.loginNoLogin': 'Mtoto huyu hana akaunti ya kuingia ya kuondoa.',
    'family.loginMalformed': 'Ombi hilo halikuweza kusomwa. Hakuna kilichobadilika.',
  },
  af: {
    'family.loginLinked': '{name} se leerderprofiel is gekoppel.',
    'family.loginUsernameIs': 'Die gebruikersnaam is {username}.',
    'family.loginRecovered':
      'Dit is uit ’n vroeër poging herwin. Die wagwoord wat in daardie poging gestel is, bly van krag; die wagwoord wat in hierdie poging ingevoer is, het dit nie vervang nie.',
    'family.loginHandOver':
      'Gee vir hulle die wagwoord wat jy gekies het. Die eerste keer dat hulle aanmeld, word hulle gevra om hul eie te kies, wat jy nie sal sien nie.',
    'family.loginNotMailbox':
      'Die gebruikersnaam is ’n aanmeld-identifiseerder, nie ’n e-posbus nie. Skryf aan {email} as jy hulp met die wagwoord nodig het.',
    'family.loginDone': 'Klaar',
    'family.loginTitle': 'Hul eie aanmelding',
    'family.loginSignsIn': '{name} meld aan met die gebruikersnaam {username}.',
    'family.loginSignsInSince':
      '{name} meld aan met die gebruikersnaam {username}, geskep op {date}.',
    'family.loginCanReset':
      '’n Geverifieerde voog kan ’n nuwe wagwoord vir ’n vertroude kinderaanmelding aanvra. Bestaande sessies kan aktief bly.',
    'family.loginNoReset': 'Wagwoordherwinning is nie nou hier beskikbaar nie.',
    'family.loginOwnYes': '{name} het hul eie wagwoord gekies. Jy kan dit nie sien nie.',
    'family.loginOwnNo':
      '{name} gebruik nog ’n wagwoord wat ’n voog gestel het. Wanneer hulle weer aanmeld, word hulle gevra om hul eie te kies.',
    'family.loginSetNew': 'Stel ’n nuwe wagwoord',
    'family.loginNewPassword': 'Nuwe wagwoord',
    'family.loginResetNote':
      'Gebruik minstens agt karakters. Gedeelde of ouer aanmeldings kan hersiening vereis. Bestaande sessies kan aktief bly.',
    'family.loginChecking': 'Kontroleer tans…',
    'family.loginChange': 'Verander wagwoord',
    'family.loginResetDone':
      'Die wagwoordverandering is aangeteken. Bestaande sessies kan aktief bly.',
    'family.loginDetach': 'Ontkoppel hierdie leerder',
    'family.loginDetachMeans':
      'Dit ontkoppel die leerderprofiel, maar skrap nie die aanmelding nie en beëindig nie oop sessies by die aanmelddiens nie. ’n Vertroude identiteit kan ook geblokkeer word op databasispaaie wat die platform se identiteitskontrole gebruik; ander toegang kan bly. Skryf aan {email} om die verwydering van die aanmelding self te reël. Lesse, vordering en sertifikate bly by die leerder.',
    'family.loginWhy': 'Waarom (opsioneel; word op rekord gehou)',
    'family.loginDetaching': 'Ontkoppel tans…',
    'family.loginDetachYes': 'Ontkoppel die leerder',
    'family.loginKeep': 'Hou dit',
    'family.loginUnderTwelve':
      '{name} leer deur jou aanmelding. ’n Kind kan van twaalfjarige ouderdom af hul eie aanmelding hê.',
    'family.loginNotOffered':
      '’n Nuwe kinderaanmelding is nie vir hierdie profiel beskikbaar nie. Dit is dalk afgeskakel, of ’n vroeër aanmelding het dalk hersiening nodig. Skryf aan {email} vir hulp.',
    'family.loginGive': 'Gee vir {name} hul eie aanmelding',
    'family.loginUsername': 'Gebruikersnaam',
    'family.loginFirstPassword':
      'Hierdie eerste wagwoord is joune om aan {name} te gee. Dit word direk na die aanmelddiens gestuur en niemand, ook nie ons nie, kan dit daarna teruglees nie. Wanneer hulle aanmeld, word hulle gevra om hul eie te kies.',
    'family.loginConfirmTwelve':
      'Ek bevestig dat {name} twaalf jaar of ouer is. Ons vra nie ’n geboortedatum nie; jou antwoord word aangeteken.',
    'family.loginMaking': 'Skep tans die aanmelding…',
    'family.loginMake': 'Skep {name} se aanmelding',
    'family.loginTickFirst':
      'Bevestig eers dat hierdie kind twaalf jaar of ouer is. Niks is geskep nie.',
    'family.loginTooYoung':
      '’n Kind onder twaalf het nie ’n eie aanmelding nie. Hulle leer deur jou aanmelding. Niks is geskep nie.',
    'family.loginUnconfirmedMake':
      'Ons kon nie hierdie aanmelding bevestig nie. Herlaai die familiebladsy of skryf aan {email} voordat jy weer probeer. As jy weer probeer, gebruik die oorspronklike wagwoord.',
    'family.loginUnconfirmedReset':
      'Ons kon nie die wagwoordverandering bevestig nie. Probeer met die nuwe wagwoord aanmeld voordat jy weer probeer. ’n Versoek kan nog ’n paar minute lank voltooi word.',
    'family.loginUnconfirmedDetach':
      'Ons kon nie die ontkoppeling bevestig nie. Herlaai die bladsy of skryf aan {email} voordat jy weer probeer.',
    'family.loginUsernameMissing': 'Kies ’n gebruikersnaam vir jou kind.',
    'family.loginUsernameShort': '’n Gebruikersnaam het minstens drie karakters nodig.',
    'family.loginUsernameLong': '’n Gebruikersnaam kan hoogstens dertig karakters hê.',
    'family.loginUsernameStart': '’n Gebruikersnaam begin met ’n letter van a tot z of ’n syfer.',
    'family.loginUsernameChars':
      'Gebruik net die letters a tot z, syfers, punte, koppeltekens en onderstrepe, sonder spasies.',
    'family.loginPasswordMissing': 'Stel ’n wagwoord vir jou kind.',
    'family.loginPasswordShort': '’n Wagwoord het minstens agt karakters nodig.',
    'family.loginUnavailable':
      'Kinderaanmeldings kan nog nie op hierdie installasie geskep word nie: die bedienersleutel wat ’n rekening skep, is nie opgestel nie. Niks is verander nie.',
    'family.loginNoChild': 'Daardie kind kon nie geïdentifiseer word nie.',
    'family.loginGuardianRequired':
      '’n Voog wat tans geverifieer is en toestemming het om hierdie kind te bestuur, is nodig. Skryf aan {email} vir hulp.',
    'family.loginNotYourChild':
      'Net ’n volwassene in hierdie kind se familie kan hul aanmelding verander.',
    'family.loginNoLogin': 'Hierdie kind het geen aanmelding om te verwyder nie.',
    'family.loginMalformed': 'Daardie versoek kon nie gelees word nie. Niks is verander nie.',
  },
  'zh-hans': {
    'family.loginLinked': '{name} 的学习者资料已关联。',
    'family.loginUsernameIs': '用户名是 {username}。',
    'family.loginRecovered': '这是从之前的一次尝试中恢复的。那次尝试中设置的密码仍然有效；这次输入的密码没有取代它。',
    'family.loginHandOver': '把你选的密码交给孩子。第一次登录时，会请孩子设置自己的密码，你不会看到那个密码。',
    'family.loginNotMailbox': '用户名是登录用的标识，不是电子邮箱。如果需要密码方面的帮助，请联系 {email}。',
    'family.loginDone': '完成',
    'family.loginTitle': '孩子自己的登录',
    'family.loginSignsIn': '{name} 用用户名 {username} 登录。',
    'family.loginSignsInSince': '{name} 用用户名 {username} 登录，创建于 {date}。',
    'family.loginCanReset': '已验证的监护人可以为受信任的儿童登录申请新密码。已打开的会话可能仍然有效。',
    'family.loginNoReset': '目前这里无法找回密码。',
    'family.loginOwnYes': '{name} 已设置自己的密码。你无法看到它。',
    'family.loginOwnNo': '{name} 仍在使用监护人设置的密码。下次登录时，会请孩子设置自己的密码。',
    'family.loginSetNew': '设置新密码',
    'family.loginNewPassword': '新密码',
    'family.loginResetNote': '请至少使用八个字符。共用的或较早的登录可能需要审核。已打开的会话可能仍然有效。',
    'family.loginChecking': '正在检查…',
    'family.loginChange': '更改密码',
    'family.loginResetDone': '密码更改已记录。已打开的会话可能仍然有效。',
    'family.loginDetach': '解除这位学习者的关联',
    'family.loginDetachMeans':
      '这会解除学习者资料的关联，但不会删除登录，也不会结束登录服务中已打开的会话。在使用平台身份检查的数据库路径上，受信任的身份也可能被阻止；其他访问可能保留。如需另行移除登录本身，请联系 {email}。课程、进度和证书仍归学习者所有。',
    'family.loginWhy': '原因（选填，会记录在案）',
    'family.loginDetaching': '正在解除关联…',
    'family.loginDetachYes': '解除学习者的关联',
    'family.loginKeep': '保留',
    'family.loginUnderTwelve': '{name} 通过你的登录来学习。孩子从十二岁起可以有自己的登录。',
    'family.loginNotOffered': '此资料暂时无法新建儿童登录。它可能已关闭，或者之前的登录需要审核。请联系 {email} 获取帮助。',
    'family.loginGive': '给 {name} 一个自己的登录',
    'family.loginUsername': '用户名',
    'family.loginFirstPassword':
      '这第一个密码由你交给 {name}。它会直接发送到登录服务，之后任何人（包括我们）都无法再读取。孩子登录时会被要求设置自己的密码。',
    'family.loginConfirmTwelve': '我确认 {name} 已满十二岁。我们不询问出生日期；你的回答会被记录。',
    'family.loginMaking': '正在创建登录…',
    'family.loginMake': '创建 {name} 的登录',
    'family.loginTickFirst': '请先确认这个孩子已满十二岁。没有创建任何内容。',
    'family.loginTooYoung': '未满十二岁的孩子没有自己的登录，而是通过你的登录来学习。没有创建任何内容。',
    'family.loginUnconfirmedMake': '我们无法确认这个登录。再试之前，请刷新家庭页面或联系 {email}。如果再试，请使用原来的密码。',
    'family.loginUnconfirmedReset': '我们无法确认密码更改。再试之前，请先尝试用新密码登录。请求可能在几分钟内完成。',
    'family.loginUnconfirmedDetach': '我们无法确认解除关联。再试之前，请刷新页面或联系 {email}。',
    'family.loginUsernameMissing': '请为你的孩子选择一个用户名。',
    'family.loginUsernameShort': '用户名至少需要三个字符。',
    'family.loginUsernameLong': '用户名最多三十个字符。',
    'family.loginUsernameStart': '用户名以 a 到 z 的英文字母或数字开头。',
    'family.loginUsernameChars': '只能使用 a 到 z 的英文字母、数字、点、短横线和下划线，不能有空格。',
    'family.loginPasswordMissing': '请为你的孩子设置密码。',
    'family.loginPasswordShort': '密码至少需要八个字符。',
    'family.loginUnavailable': '此部署尚不能创建儿童登录：用于创建账户的服务器密钥尚未配置。没有任何更改。',
    'family.loginNoChild': '无法识别这个孩子。',
    'family.loginGuardianRequired': '需要一位当前已验证并有权管理这个孩子的监护人。请联系 {email} 获取帮助。',
    'family.loginNotYourChild': '只有这个孩子家庭中的成年人可以更改其登录。',
    'family.loginNoLogin': '这个孩子没有可移除的登录。',
    'family.loginMalformed': '无法读取该请求。没有任何更改。',
  },
  'zh-hant': {
    'family.loginLinked': '{name} 的學習者個人資料已連結。',
    'family.loginUsernameIs': '使用者名稱是 {username}。',
    'family.loginRecovered': '這是從先前的一次嘗試中復原的。那次嘗試中設定的密碼仍然有效；這次輸入的密碼沒有取代它。',
    'family.loginHandOver': '把你選的密碼交給孩子。第一次登入時，會請孩子設定自己的密碼，你不會看到那個密碼。',
    'family.loginNotMailbox': '使用者名稱是登入用的識別碼，不是電子郵件信箱。如果需要密碼方面的協助，請聯絡 {email}。',
    'family.loginDone': '完成',
    'family.loginTitle': '孩子自己的登入',
    'family.loginSignsIn': '{name} 用使用者名稱 {username} 登入。',
    'family.loginSignsInSince': '{name} 用使用者名稱 {username} 登入，建立於 {date}。',
    'family.loginCanReset': '已驗證的監護人可以為受信任的兒童登入申請新密碼。已開啟的工作階段可能仍然有效。',
    'family.loginNoReset': '目前這裡無法找回密碼。',
    'family.loginOwnYes': '{name} 已設定自己的密碼。你無法看到它。',
    'family.loginOwnNo': '{name} 仍在使用監護人設定的密碼。下次登入時，會請孩子設定自己的密碼。',
    'family.loginSetNew': '設定新密碼',
    'family.loginNewPassword': '新密碼',
    'family.loginResetNote': '請至少使用八個字元。共用的或較早的登入可能需要審查。已開啟的工作階段可能仍然有效。',
    'family.loginChecking': '正在檢查…',
    'family.loginChange': '變更密碼',
    'family.loginResetDone': '密碼變更已記錄。已開啟的工作階段可能仍然有效。',
    'family.loginDetach': '解除這位學習者的連結',
    'family.loginDetachMeans':
      '這會解除學習者個人資料的連結，但不會刪除登入，也不會結束登入服務中已開啟的工作階段。在使用平台身分檢查的資料庫路徑上，受信任的身分也可能被封鎖；其他存取可能保留。如需另行移除登入本身，請聯絡 {email}。課程、進度和證書仍歸學習者所有。',
    'family.loginWhy': '原因（選填，會留存紀錄）',
    'family.loginDetaching': '正在解除連結…',
    'family.loginDetachYes': '解除學習者的連結',
    'family.loginKeep': '保留',
    'family.loginUnderTwelve': '{name} 透過你的登入來學習。孩子從十二歲起可以有自己的登入。',
    'family.loginNotOffered': '此個人資料暫時無法新建兒童登入。它可能已關閉，或者先前的登入需要審查。請聯絡 {email} 取得協助。',
    'family.loginGive': '給 {name} 一個自己的登入',
    'family.loginUsername': '使用者名稱',
    'family.loginFirstPassword':
      '這第一個密碼由你交給 {name}。它會直接傳送到登入服務，之後任何人（包括我們）都無法再讀取。孩子登入時會被要求設定自己的密碼。',
    'family.loginConfirmTwelve': '我確認 {name} 已滿十二歲。我們不詢問出生日期；你的回答會被記錄。',
    'family.loginMaking': '正在建立登入…',
    'family.loginMake': '建立 {name} 的登入',
    'family.loginTickFirst': '請先確認這個孩子已滿十二歲。沒有建立任何內容。',
    'family.loginTooYoung': '未滿十二歲的孩子沒有自己的登入，而是透過你的登入來學習。沒有建立任何內容。',
    'family.loginUnconfirmedMake': '我們無法確認這個登入。再試之前，請重新整理家庭頁面或聯絡 {email}。如果再試，請使用原來的密碼。',
    'family.loginUnconfirmedReset': '我們無法確認密碼變更。再試之前，請先嘗試用新密碼登入。請求可能在幾分鐘內完成。',
    'family.loginUnconfirmedDetach': '我們無法確認解除連結。再試之前，請重新整理頁面或聯絡 {email}。',
    'family.loginUsernameMissing': '請為你的孩子選擇一個使用者名稱。',
    'family.loginUsernameShort': '使用者名稱至少需要三個字元。',
    'family.loginUsernameLong': '使用者名稱最多三十個字元。',
    'family.loginUsernameStart': '使用者名稱以 a 到 z 的英文字母或數字開頭。',
    'family.loginUsernameChars': '只能使用 a 到 z 的英文字母、數字、句點、連字號和底線，不能有空格。',
    'family.loginPasswordMissing': '請為你的孩子設定密碼。',
    'family.loginPasswordShort': '密碼至少需要八個字元。',
    'family.loginUnavailable': '此部署尚不能建立兒童登入：用於建立帳號的伺服器金鑰尚未設定。沒有任何變更。',
    'family.loginNoChild': '無法識別這個孩子。',
    'family.loginGuardianRequired': '需要一位目前已驗證並有權管理這個孩子的監護人。請聯絡 {email} 取得協助。',
    'family.loginNotYourChild': '只有這個孩子家庭中的成年人可以變更其登入。',
    'family.loginNoLogin': '這個孩子沒有可移除的登入。',
    'family.loginMalformed': '無法讀取該請求。沒有任何變更。',
  },
  vi: {
    'family.loginLinked': 'Hồ sơ học viên của {name} đã được liên kết.',
    'family.loginUsernameIs': 'Tên đăng nhập là {username}.',
    'family.loginRecovered':
      'Mục này được khôi phục từ một lần thử trước. Mật khẩu đặt trong lần thử đó vẫn có hiệu lực; mật khẩu nhập trong lần này không thay thế nó.',
    'family.loginHandOver':
      'Hãy đưa cho trẻ mật khẩu bạn đã chọn. Lần đầu đăng nhập, trẻ được yêu cầu chọn mật khẩu riêng, và bạn sẽ không thấy mật khẩu đó.',
    'family.loginNotMailbox':
      'Tên đăng nhập là định danh để đăng nhập, không phải hộp thư email. Hãy liên hệ {email} nếu bạn cần trợ giúp về mật khẩu.',
    'family.loginDone': 'Xong',
    'family.loginTitle': 'Đăng nhập riêng của trẻ',
    'family.loginSignsIn': '{name} đăng nhập bằng tên đăng nhập {username}.',
    'family.loginSignsInSince':
      '{name} đăng nhập bằng tên đăng nhập {username}, được tạo ngày {date}.',
    'family.loginCanReset':
      'Người giám hộ đã được xác minh có thể yêu cầu mật khẩu mới cho đăng nhập của trẻ đã được tin cậy. Các phiên đang mở có thể vẫn hoạt động.',
    'family.loginNoReset': 'Hiện chưa thể khôi phục mật khẩu tại đây.',
    'family.loginOwnYes': '{name} đã chọn mật khẩu riêng. Bạn không thể xem mật khẩu đó.',
    'family.loginOwnNo':
      '{name} vẫn đang dùng mật khẩu do người giám hộ đặt. Lần đăng nhập tới, trẻ được yêu cầu chọn mật khẩu riêng.',
    'family.loginSetNew': 'Đặt mật khẩu mới',
    'family.loginNewPassword': 'Mật khẩu mới',
    'family.loginResetNote':
      'Dùng ít nhất tám ký tự. Các đăng nhập dùng chung hoặc đã cũ có thể cần được xem xét. Các phiên đang mở có thể vẫn hoạt động.',
    'family.loginChecking': 'Đang kiểm tra…',
    'family.loginChange': 'Đổi mật khẩu',
    'family.loginResetDone':
      'Việc đổi mật khẩu đã được ghi nhận. Các phiên đang mở có thể vẫn hoạt động.',
    'family.loginDetach': 'Tách học viên này',
    'family.loginDetachMeans':
      'Thao tác này tách hồ sơ học viên nhưng không xoá đăng nhập và không kết thúc các phiên đang mở ở dịch vụ đăng nhập. Danh tính được tin cậy cũng có thể bị chặn trên các đường dẫn cơ sở dữ liệu dùng bước kiểm tra danh tính của nền tảng; quyền truy cập khác có thể vẫn còn. Hãy liên hệ {email} để sắp xếp gỡ riêng chính đăng nhập đó. Bài học, tiến độ và chứng chỉ vẫn thuộc về học viên.',
    'family.loginWhy': 'Lý do (không bắt buộc, được lưu trong hồ sơ)',
    'family.loginDetaching': 'Đang tách…',
    'family.loginDetachYes': 'Tách học viên',
    'family.loginKeep': 'Giữ lại',
    'family.loginUnderTwelve':
      '{name} học qua đăng nhập của bạn. Trẻ có thể có đăng nhập riêng từ mười hai tuổi.',
    'family.loginNotOffered':
      'Chưa thể tạo đăng nhập mới của trẻ cho hồ sơ này. Có thể tính năng đang tắt hoặc một đăng nhập trước đó cần được xem xét. Hãy liên hệ {email} để được trợ giúp.',
    'family.loginGive': 'Tạo đăng nhập riêng cho {name}',
    'family.loginUsername': 'Tên đăng nhập',
    'family.loginFirstPassword':
      'Mật khẩu đầu tiên này do bạn trao cho {name}. Mật khẩu được gửi thẳng đến dịch vụ đăng nhập và sau đó không ai, kể cả chúng tôi, đọc lại được. Khi đăng nhập, trẻ được yêu cầu chọn mật khẩu riêng.',
    'family.loginConfirmTwelve':
      'Tôi xác nhận {name} từ mười hai tuổi trở lên. Chúng tôi không hỏi ngày sinh; câu trả lời của bạn được ghi lại.',
    'family.loginMaking': 'Đang tạo đăng nhập…',
    'family.loginMake': 'Tạo đăng nhập của {name}',
    'family.loginTickFirst':
      'Trước hết hãy xác nhận trẻ này từ mười hai tuổi trở lên. Chưa có gì được tạo.',
    'family.loginTooYoung':
      'Trẻ dưới mười hai tuổi không có đăng nhập riêng. Trẻ học qua đăng nhập của bạn. Chưa có gì được tạo.',
    'family.loginUnconfirmedMake':
      'Chúng tôi không xác nhận được đăng nhập này. Hãy tải lại trang gia đình hoặc liên hệ {email} trước khi thử lại. Nếu thử lại, hãy dùng mật khẩu ban đầu.',
    'family.loginUnconfirmedReset':
      'Chúng tôi không xác nhận được việc đổi mật khẩu. Hãy thử đăng nhập bằng mật khẩu mới trước khi thử lại. Yêu cầu vẫn có thể hoàn tất trong vài phút.',
    'family.loginUnconfirmedDetach':
      'Chúng tôi không xác nhận được việc tách. Hãy tải lại trang hoặc liên hệ {email} trước khi thử lại.',
    'family.loginUsernameMissing': 'Hãy chọn tên đăng nhập cho con bạn.',
    'family.loginUsernameShort': 'Tên đăng nhập cần ít nhất ba ký tự.',
    'family.loginUsernameLong': 'Tên đăng nhập có nhiều nhất ba mươi ký tự.',
    'family.loginUsernameStart':
      'Tên đăng nhập bắt đầu bằng một chữ cái không dấu từ a đến z hoặc một chữ số.',
    'family.loginUsernameChars':
      'Chỉ dùng chữ cái không dấu từ a đến z, chữ số, dấu chấm, dấu gạch ngang và dấu gạch dưới, không có khoảng trắng.',
    'family.loginPasswordMissing': 'Hãy đặt mật khẩu cho con bạn.',
    'family.loginPasswordShort': 'Mật khẩu cần ít nhất tám ký tự.',
    'family.loginUnavailable':
      'Chưa thể tạo đăng nhập của trẻ trên bản triển khai này: khoá máy chủ dùng để tạo tài khoản chưa được thiết lập. Không có gì thay đổi.',
    'family.loginNoChild': 'Không xác định được trẻ đó.',
    'family.loginGuardianRequired':
      'Cần một người giám hộ hiện đã được xác minh và có quyền quản lý trẻ này. Hãy liên hệ {email} để được trợ giúp.',
    'family.loginNotYourChild':
      'Chỉ người lớn trong gia đình của trẻ này mới có thể thay đổi đăng nhập của trẻ.',
    'family.loginNoLogin': 'Trẻ này không có đăng nhập nào để gỡ.',
    'family.loginMalformed': 'Không đọc được yêu cầu đó. Không có gì thay đổi.',
  },
  th: {
    'family.loginLinked': 'เชื่อมโยงโปรไฟล์ผู้เรียนของ {name} แล้ว',
    'family.loginUsernameIs': 'ชื่อผู้ใช้คือ {username}',
    'family.loginRecovered':
      'รายการนี้กู้คืนมาจากความพยายามครั้งก่อน รหัสผ่านที่ตั้งไว้ในครั้งนั้นยังมีผลอยู่ รหัสผ่านที่ป้อนในครั้งนี้ไม่ได้แทนที่รหัสเดิม',
    'family.loginHandOver':
      'มอบรหัสผ่านที่คุณเลือกให้เด็ก เมื่อเข้าสู่ระบบครั้งแรก เด็กจะถูกขอให้ตั้งรหัสผ่านของตนเอง ซึ่งคุณจะไม่เห็น',
    'family.loginNotMailbox':
      'ชื่อผู้ใช้เป็นตัวระบุสำหรับเข้าสู่ระบบ ไม่ใช่กล่องอีเมล โปรดติดต่อ {email} หากต้องการความช่วยเหลือเรื่องรหัสผ่าน',
    'family.loginDone': 'เสร็จสิ้น',
    'family.loginTitle': 'การเข้าสู่ระบบของเด็กเอง',
    'family.loginSignsIn': '{name} เข้าสู่ระบบด้วยชื่อผู้ใช้ {username}',
    'family.loginSignsInSince': '{name} เข้าสู่ระบบด้วยชื่อผู้ใช้ {username} สร้างเมื่อ {date}',
    'family.loginCanReset':
      'ผู้ปกครองที่ยืนยันตัวแล้วขอรหัสผ่านใหม่สำหรับการเข้าสู่ระบบของเด็กที่เชื่อถือได้ได้ เซสชันที่เปิดอยู่อาจยังใช้งานได้ต่อ',
    'family.loginNoReset': 'ขณะนี้ยังกู้คืนรหัสผ่านที่นี่ไม่ได้',
    'family.loginOwnYes': '{name} ตั้งรหัสผ่านของตนเองแล้ว คุณดูรหัสผ่านนั้นไม่ได้',
    'family.loginOwnNo':
      '{name} ยังใช้รหัสผ่านที่ผู้ปกครองตั้งให้อยู่ เมื่อเข้าสู่ระบบครั้งถัดไป เด็กจะถูกขอให้ตั้งรหัสผ่านของตนเอง',
    'family.loginSetNew': 'ตั้งรหัสผ่านใหม่',
    'family.loginNewPassword': 'รหัสผ่านใหม่',
    'family.loginResetNote':
      'ใช้อย่างน้อยแปดอักขระ การเข้าสู่ระบบที่ใช้ร่วมกันหรือที่เก่าแล้วอาจต้องได้รับการตรวจสอบ เซสชันที่เปิดอยู่อาจยังใช้งานได้ต่อ',
    'family.loginChecking': 'กำลังตรวจสอบ…',
    'family.loginChange': 'เปลี่ยนรหัสผ่าน',
    'family.loginResetDone': 'บันทึกการเปลี่ยนรหัสผ่านแล้ว เซสชันที่เปิดอยู่อาจยังใช้งานได้ต่อ',
    'family.loginDetach': 'แยกผู้เรียนคนนี้ออก',
    'family.loginDetachMeans':
      'การทำเช่นนี้จะแยกโปรไฟล์ผู้เรียนออก แต่ไม่ลบการเข้าสู่ระบบและไม่ยุติเซสชันที่เปิดอยู่ในบริการเข้าสู่ระบบ ตัวตนที่เชื่อถือได้อาจถูกปิดกั้นในเส้นทางของฐานข้อมูลที่ใช้การตรวจสอบตัวตนของแพลตฟอร์มด้วย ส่วนการเข้าถึงอื่นอาจยังคงอยู่ โปรดติดต่อ {email} เพื่อจัดการนำการเข้าสู่ระบบนั้นออกต่างหาก บทเรียน ความคืบหน้า และประกาศนียบัตรยังอยู่กับผู้เรียน',
    'family.loginWhy': 'เหตุผล (ไม่บังคับ และเก็บไว้ในบันทึก)',
    'family.loginDetaching': 'กำลังแยกออก…',
    'family.loginDetachYes': 'แยกผู้เรียนออก',
    'family.loginKeep': 'เก็บไว้',
    'family.loginUnderTwelve':
      '{name} เรียนผ่านการเข้าสู่ระบบของคุณ เด็กมีการเข้าสู่ระบบของตนเองได้ตั้งแต่อายุสิบสองปี',
    'family.loginNotOffered':
      'ยังสร้างการเข้าสู่ระบบใหม่ของเด็กสำหรับโปรไฟล์นี้ไม่ได้ อาจปิดอยู่ หรือการเข้าสู่ระบบก่อนหน้าอาจต้องได้รับการตรวจสอบ โปรดติดต่อ {email} เพื่อขอความช่วยเหลือ',
    'family.loginGive': 'สร้างการเข้าสู่ระบบของตนเองให้ {name}',
    'family.loginUsername': 'ชื่อผู้ใช้',
    'family.loginFirstPassword':
      'รหัสผ่านแรกนี้คุณเป็นผู้มอบให้ {name} รหัสผ่านถูกส่งตรงไปยังบริการเข้าสู่ระบบ และหลังจากนั้นไม่มีใคร รวมทั้งเรา อ่านรหัสผ่านนั้นได้อีก เมื่อเข้าสู่ระบบ เด็กจะถูกขอให้ตั้งรหัสผ่านของตนเอง',
    'family.loginConfirmTwelve':
      'ข้าพเจ้ายืนยันว่า {name} อายุสิบสองปีขึ้นไป เราไม่ถามวันเกิด คำตอบของคุณจะถูกบันทึกไว้',
    'family.loginMaking': 'กำลังสร้างการเข้าสู่ระบบ…',
    'family.loginMake': 'สร้างการเข้าสู่ระบบของ {name}',
    'family.loginTickFirst': 'โปรดยืนยันก่อนว่าเด็กคนนี้อายุสิบสองปีขึ้นไป ยังไม่มีการสร้างสิ่งใด',
    'family.loginTooYoung':
      'เด็กอายุต่ำกว่าสิบสองปีไม่มีการเข้าสู่ระบบของตนเอง เด็กเรียนผ่านการเข้าสู่ระบบของคุณ ยังไม่มีการสร้างสิ่งใด',
    'family.loginUnconfirmedMake':
      'เรายืนยันการเข้าสู่ระบบนี้ไม่ได้ โปรดโหลดหน้าครอบครัวใหม่หรือติดต่อ {email} ก่อนลองอีกครั้ง หากลองอีกครั้ง โปรดใช้รหัสผ่านเดิม',
    'family.loginUnconfirmedReset':
      'เรายืนยันการเปลี่ยนรหัสผ่านไม่ได้ โปรดลองเข้าสู่ระบบด้วยรหัสผ่านใหม่ก่อนลองอีกครั้ง คำขออาจเสร็จสิ้นได้ภายในไม่กี่นาที',
    'family.loginUnconfirmedDetach':
      'เรายืนยันการแยกออกไม่ได้ โปรดโหลดหน้านี้ใหม่หรือติดต่อ {email} ก่อนลองอีกครั้ง',
    'family.loginUsernameMissing': 'เลือกชื่อผู้ใช้ให้บุตรหลานของคุณ',
    'family.loginUsernameShort': 'ชื่อผู้ใช้ต้องมีอย่างน้อยสามอักขระ',
    'family.loginUsernameLong': 'ชื่อผู้ใช้มีได้ไม่เกินสามสิบอักขระ',
    'family.loginUsernameStart': 'ชื่อผู้ใช้ขึ้นต้นด้วยตัวอักษรภาษาอังกฤษ a ถึง z หรือตัวเลข',
    'family.loginUsernameChars':
      'ใช้ได้เฉพาะตัวอักษรภาษาอังกฤษ a ถึง z ตัวเลข จุด ขีดกลาง และขีดล่าง โดยไม่มีช่องว่าง',
    'family.loginPasswordMissing': 'ตั้งรหัสผ่านให้บุตรหลานของคุณ',
    'family.loginPasswordShort': 'รหัสผ่านต้องมีอย่างน้อยแปดอักขระ',
    'family.loginUnavailable':
      'ยังสร้างการเข้าสู่ระบบของเด็กในการติดตั้งนี้ไม่ได้ เพราะยังไม่ได้ตั้งค่ากุญแจของเซิร์ฟเวอร์ที่ใช้สร้างบัญชี ไม่มีสิ่งใดเปลี่ยนแปลง',
    'family.loginNoChild': 'ระบุตัวเด็กคนนั้นไม่ได้',
    'family.loginGuardianRequired':
      'ต้องมีผู้ปกครองที่ยืนยันตัวแล้วในขณะนี้และมีสิทธิ์จัดการเด็กคนนี้ โปรดติดต่อ {email} เพื่อขอความช่วยเหลือ',
    'family.loginNotYourChild':
      'เฉพาะผู้ใหญ่ในครอบครัวของเด็กคนนี้เท่านั้นที่เปลี่ยนการเข้าสู่ระบบของเด็กได้',
    'family.loginNoLogin': 'เด็กคนนี้ไม่มีการเข้าสู่ระบบให้นำออก',
    'family.loginMalformed': 'อ่านคำขอนั้นไม่ได้ ไม่มีสิ่งใดเปลี่ยนแปลง',
  },
  fil: {
    'family.loginLinked': 'Naiugnay na ang profile ng mag-aaral ni {name}.',
    'family.loginUsernameIs': 'Ang username ay {username}.',
    'family.loginRecovered':
      'Nabawi ito mula sa naunang pagsubok. May bisa pa rin ang password na itinakda sa pagsubok na iyon; hindi ito napalitan ng password na inilagay sa pagsubok na ito.',
    'family.loginHandOver':
      'Ibigay sa bata ang password na pinili mo. Sa unang pag-sign in, hihilingin sa kanya na pumili ng sarili niyang password, na hindi mo makikita.',
    'family.loginNotMailbox':
      'Ang username ay pagkakakilanlan sa pag-sign in, hindi email na mailbox. Sumulat sa {email} kung kailangan mo ng tulong sa password.',
    'family.loginDone': 'Tapos na',
    'family.loginTitle': 'Sariling login ng bata',
    'family.loginSignsIn': 'Nagsa-sign in si {name} gamit ang username na {username}.',
    'family.loginSignsInSince':
      'Nagsa-sign in si {name} gamit ang username na {username}, na ginawa noong {date}.',
    'family.loginCanReset':
      'Makahihiling ang beripikadong tagapag-alaga ng bagong password para sa pinagkakatiwalaang login ng bata. Maaaring manatiling aktibo ang mga bukas nang session.',
    'family.loginNoReset': 'Hindi magagamit dito ngayon ang pagbawi ng password.',
    'family.loginOwnYes': 'Pumili na si {name} ng sarili niyang password. Hindi mo ito makikita.',
    'family.loginOwnNo':
      'Ginagamit pa rin ni {name} ang password na itinakda ng tagapag-alaga. Sa susunod na pag-sign in, hihilingin sa kanya na pumili ng sarili niya.',
    'family.loginSetNew': 'Magtakda ng bagong password',
    'family.loginNewPassword': 'Bagong password',
    'family.loginResetNote':
      'Gumamit ng hindi bababa sa walong character. Maaaring kailanganing suriin ang mga login na pinagsasaluhan o luma na. Maaaring manatiling aktibo ang mga bukas nang session.',
    'family.loginChecking': 'Sinusuri…',
    'family.loginChange': 'Palitan ang password',
    'family.loginResetDone':
      'Naitala ang pagpapalit ng password. Maaaring manatiling aktibo ang mga bukas nang session.',
    'family.loginDetach': 'Ihiwalay ang mag-aaral na ito',
    'family.loginDetachMeans':
      'Inihihiwalay nito ang profile ng mag-aaral pero hindi nito binubura ang login at hindi nito tinatapos ang mga bukas na session sa serbisyo ng pag-sign in. Maaari ring maharang ang pinagkakatiwalaang pagkakakilanlan sa mga daan ng database na gumagamit ng pagsusuri ng pagkakakilanlan ng plataporma; maaaring manatili ang ibang access. Sumulat sa {email} para maisaayos ang hiwalay na pag-alis ng login mismo. Nananatili sa mag-aaral ang mga aralin, pag-usad at sertipiko.',
    'family.loginWhy': 'Dahilan (opsiyonal; itinatago sa talaan)',
    'family.loginDetaching': 'Inihihiwalay…',
    'family.loginDetachYes': 'Ihiwalay ang mag-aaral',
    'family.loginKeep': 'Panatilihin',
    'family.loginUnderTwelve':
      'Nag-aaral si {name} sa pamamagitan ng iyong pag-sign in. Maaaring magkaroon ang bata ng sarili niyang login mula edad labindalawa.',
    'family.loginNotOffered':
      'Hindi magagamit ang bagong login ng bata para sa profile na ito. Maaaring naka-off ito o may naunang login na kailangang suriin. Sumulat sa {email} para sa tulong.',
    'family.loginGive': 'Bigyan si {name} ng sarili niyang login',
    'family.loginUsername': 'Username',
    'family.loginFirstPassword':
      'Ikaw ang mag-aabot ng unang password na ito kay {name}. Diretso itong ipinapadala sa serbisyo ng pag-sign in at pagkatapos ay walang sinuman, kahit kami, ang makababasa nito. Kapag nag-sign in ang bata, hihilingin sa kanya na pumili ng sarili niya.',
    'family.loginConfirmTwelve':
      'Pinatutunayan kong labindalawang taong gulang o higit pa si {name}. Hindi kami humihingi ng petsa ng kapanganakan; itinatala ang iyong sagot.',
    'family.loginMaking': 'Ginagawa ang login…',
    'family.loginMake': 'Gawin ang login ni {name}',
    'family.loginTickFirst':
      'Patunayan muna na labindalawang taong gulang o higit pa ang batang ito. Walang nagawa.',
    'family.loginTooYoung':
      'Walang sariling login ang batang wala pang labindalawang taong gulang. Nag-aaral siya sa pamamagitan ng iyong pag-sign in. Walang nagawa.',
    'family.loginUnconfirmedMake':
      'Hindi namin makumpirma ang login na ito. I-reload ang pahina ng pamilya o sumulat sa {email} bago subukan muli. Kung susubukan muli, gamitin ang orihinal na password.',
    'family.loginUnconfirmedReset':
      'Hindi namin makumpirma ang pagpapalit ng password. Subukang mag-sign in gamit ang bagong password bago subukan muli. Maaari pang matapos ang kahilingan sa loob ng ilang minuto.',
    'family.loginUnconfirmedDetach':
      'Hindi namin makumpirma ang paghihiwalay. I-reload ang pahina o sumulat sa {email} bago subukan muli.',
    'family.loginUsernameMissing': 'Pumili ng username para sa iyong anak.',
    'family.loginUsernameShort': 'Kailangan ng username ng hindi bababa sa tatlong character.',
    'family.loginUsernameLong': 'Hanggang tatlumpung character lang ang username.',
    'family.loginUsernameStart': 'Nagsisimula ang username sa titik mula a hanggang z o sa numero.',
    'family.loginUsernameChars':
      'Mga titik na a hanggang z (walang ñ), numero, tuldok, gitling at underscore lang ang gamitin, walang puwang.',
    'family.loginPasswordMissing': 'Magtakda ng password para sa iyong anak.',
    'family.loginPasswordShort': 'Kailangan ng password ng hindi bababa sa walong character.',
    'family.loginUnavailable':
      'Hindi pa makagagawa ng mga login ng bata sa deployment na ito: hindi pa naitatakda ang susi ng server na gumagawa ng account. Walang nabago.',
    'family.loginNoChild': 'Hindi matukoy ang batang iyon.',
    'family.loginGuardianRequired':
      'Kailangan ang tagapag-alagang beripikado sa kasalukuyan at may pahintulot na pamahalaan ang batang ito. Sumulat sa {email} para sa tulong.',
    'family.loginNotYourChild':
      'Tanging nasa hustong gulang sa pamilya ng batang ito ang makapagpapalit ng kanyang login.',
    'family.loginNoLogin': 'Walang login ang batang ito na maaalis.',
    'family.loginMalformed': 'Hindi mabasa ang kahilingang iyon. Walang nabago.',
  },
  uz: {
    'family.loginLinked': '{name} uchun oʻquvchi profili bogʻlandi.',
    'family.loginUsernameIs': 'Foydalanuvchi nomi: {username}.',
    'family.loginRecovered':
      'Bu avvalgi urinishdan tiklandi. Oʻsha urinishda qoʻyilgan parol kuchda qoladi; bu safar kiritilgan parol uning oʻrnini egallamadi.',
    'family.loginHandOver':
      'Oʻzingiz tanlagan parolni bolaga bering. Birinchi marta kirganda undan oʻz parolini tanlash soʻraladi, siz uni koʻrmaysiz.',
    'family.loginNotMailbox':
      'Foydalanuvchi nomi kirish uchun belgi, elektron pochta qutisi emas. Parol boʻyicha yordam kerak boʻlsa, {email} manziliga yozing.',
    'family.loginDone': 'Tayyor',
    'family.loginTitle': 'Bolaning oʻz kirishi',
    'family.loginSignsIn': '{name} tizimga {username} foydalanuvchi nomi bilan kiradi.',
    'family.loginSignsInSince':
      '{name} tizimga {username} foydalanuvchi nomi bilan kiradi. Yaratilgan sana: {date}.',
    'family.loginCanReset':
      'Tasdiqlangan vasiy bolaning ishonchli kirishi uchun yangi parol soʻrashi mumkin. Ochiq seanslar faol qolishi mumkin.',
    'family.loginNoReset': 'Parolni tiklash hozir bu yerda mavjud emas.',
    'family.loginOwnYes': '{name} oʻz parolini tanlagan. Siz uni koʻra olmaysiz.',
    'family.loginOwnNo':
      '{name} hali ham vasiy qoʻygan paroldan foydalanmoqda. Keyingi safar kirganda undan oʻz parolini tanlash soʻraladi.',
    'family.loginSetNew': 'Yangi parol qoʻyish',
    'family.loginNewPassword': 'Yangi parol',
    'family.loginResetNote':
      'Kamida sakkizta belgi ishlating. Umumiy yoki eski kirishlar koʻrib chiqishni talab qilishi mumkin. Ochiq seanslar faol qolishi mumkin.',
    'family.loginChecking': 'Tekshirilmoqda…',
    'family.loginChange': 'Parolni oʻzgartirish',
    'family.loginResetDone': 'Parol oʻzgarishi qayd etildi. Ochiq seanslar faol qolishi mumkin.',
    'family.loginDetach': 'Bu oʻquvchini ajratish',
    'family.loginDetachMeans':
      'Bu oʻquvchi profilini ajratadi, lekin kirishni oʻchirmaydi va kirish xizmatidagi ochiq seanslarni tugatmaydi. Ishonchli shaxs platformaning shaxsni tekshirishidan foydalanadigan maʼlumotlar bazasi yoʻllarida ham bloklanishi mumkin; boshqa kirish huquqlari qolishi mumkin. Kirishning oʻzini alohida olib tashlash uchun {email} manziliga yozing. Darslar, natijalar va sertifikatlar oʻquvchida qoladi.',
    'family.loginWhy': 'Sabab (ixtiyoriy; qaydda saqlanadi)',
    'family.loginDetaching': 'Ajratilmoqda…',
    'family.loginDetachYes': 'Oʻquvchini ajratish',
    'family.loginKeep': 'Qolsin',
    'family.loginUnderTwelve':
      '{name} sizning kirishingiz orqali oʻqiydi. Bola oʻn ikki yoshdan boshlab oʻz kirishiga ega boʻlishi mumkin.',
    'family.loginNotOffered':
      'Bu profil uchun bolaning yangi kirishi mavjud emas. U oʻchirilgan boʻlishi yoki avvalgi kirish koʻrib chiqishni talab qilishi mumkin. Yordam uchun {email} manziliga yozing.',
    'family.loginGive': '{name} uchun oʻz kirishini yaratish',
    'family.loginUsername': 'Foydalanuvchi nomi',
    'family.loginFirstPassword':
      'Bu birinchi parolni {name} uchun siz topshirasiz. U toʻgʻridan-toʻgʻri kirish xizmatiga yuboriladi va shundan keyin hech kim, hatto biz ham, uni qayta oʻqiy olmaydi. Bola kirganda undan oʻz parolini tanlash soʻraladi.',
    'family.loginConfirmTwelve':
      '{name} oʻn ikki yoshda yoki undan katta ekanini tasdiqlayman. Biz tugʻilgan sanani soʻramaymiz; javobingiz qayd etiladi.',
    'family.loginMaking': 'Kirish yaratilmoqda…',
    'family.loginMake': '{name} uchun kirishni yaratish',
    'family.loginTickFirst':
      'Avval bu bola oʻn ikki yoshda yoki undan katta ekanini tasdiqlang. Hech narsa yaratilmadi.',
    'family.loginTooYoung':
      'Oʻn ikki yoshga toʻlmagan bolaning oʻz kirishi boʻlmaydi. U sizning kirishingiz orqali oʻqiydi. Hech narsa yaratilmadi.',
    'family.loginUnconfirmedMake':
      'Bu kirishni tasdiqlay olmadik. Qayta urinishdan oldin oila sahifasini qayta yuklang yoki {email} manziliga yozing. Qayta urinsangiz, dastlabki paroldan foydalaning.',
    'family.loginUnconfirmedReset':
      'Parol oʻzgarishini tasdiqlay olmadik. Qayta urinishdan oldin yangi parol bilan kirib koʻring. Soʻrov bir necha daqiqa ichida yakunlanishi mumkin.',
    'family.loginUnconfirmedDetach':
      'Ajratishni tasdiqlay olmadik. Qayta urinishdan oldin sahifani qayta yuklang yoki {email} manziliga yozing.',
    'family.loginUsernameMissing': 'Bolangiz uchun foydalanuvchi nomini tanlang.',
    'family.loginUsernameShort': 'Foydalanuvchi nomida kamida uchta belgi boʻlishi kerak.',
    'family.loginUsernameLong': 'Foydalanuvchi nomi koʻpi bilan oʻttizta belgidan iborat boʻladi.',
    'family.loginUsernameStart':
      'Foydalanuvchi nomi a dan z gacha boʻlgan inglizcha harf yoki raqam bilan boshlanadi.',
    'family.loginUsernameChars':
      'Faqat a dan z gacha boʻlgan inglizcha harflar, raqamlar, nuqta, chiziqcha va pastki chiziqdan foydalaning; boʻsh joy boʻlmasin.',
    'family.loginPasswordMissing': 'Bolangiz uchun parol qoʻying.',
    'family.loginPasswordShort': 'Parolda kamida sakkizta belgi boʻlishi kerak.',
    'family.loginUnavailable':
      'Bu oʻrnatmada bolalar uchun kirish hali yaratib boʻlmaydi: hisob yaratadigan server kaliti sozlanmagan. Hech narsa oʻzgarmadi.',
    'family.loginNoChild': 'Bu bolani aniqlab boʻlmadi.',
    'family.loginGuardianRequired':
      'Hozir tasdiqlangan va bu bolani boshqarishga ruxsati bor vasiy kerak. Yordam uchun {email} manziliga yozing.',
    'family.loginNotYourChild':
      'Bu bolaning kirishini faqat uning oilasidagi katta yoshli kishi oʻzgartira oladi.',
    'family.loginNoLogin': 'Bu bolaning olib tashlanadigan kirishi yoʻq.',
    'family.loginMalformed': 'Bu soʻrovni oʻqib boʻlmadi. Hech narsa oʻzgarmadi.',
  },
  kk: {
    'family.loginLinked': '{name} үшін оқушы профилі байланыстырылды.',
    'family.loginUsernameIs': 'Пайдаланушы аты: {username}.',
    'family.loginRecovered':
      'Бұл алдыңғы әрекеттен қалпына келтірілді. Сол әрекетте қойылған құпиясөз күшінде қалады; бұл жолы енгізілген құпиясөз оны алмастырған жоқ.',
    'family.loginHandOver':
      'Өзіңіз таңдаған құпиясөзді балаға беріңіз. Алғаш кіргенде одан өз құпиясөзін таңдау сұралады, оны сіз көрмейсіз.',
    'family.loginNotMailbox':
      'Пайдаланушы аты — кіруге арналған белгі, электрондық пошта жәшігі емес. Құпиясөз бойынша көмек керек болса, {email} мекенжайына жазыңыз.',
    'family.loginDone': 'Дайын',
    'family.loginTitle': 'Баланың өз кіруі',
    'family.loginSignsIn': '{name} жүйеге {username} пайдаланушы атымен кіреді.',
    'family.loginSignsInSince':
      '{name} жүйеге {username} пайдаланушы атымен кіреді. Жасалған күні: {date}.',
    'family.loginCanReset':
      'Расталған қамқоршы баланың сенімді кіруі үшін жаңа құпиясөз сұрай алады. Ашық сеанстар белсенді болып қалуы мүмкін.',
    'family.loginNoReset': 'Құпиясөзді қалпына келтіру дәл қазір мұнда қолжетімді емес.',
    'family.loginOwnYes': '{name} өз құпиясөзін таңдады. Сіз оны көре алмайсыз.',
    'family.loginOwnNo':
      '{name} әлі қамқоршы қойған құпиясөзді қолданып жүр. Келесі жолы кіргенде одан өз құпиясөзін таңдау сұралады.',
    'family.loginSetNew': 'Жаңа құпиясөз қою',
    'family.loginNewPassword': 'Жаңа құпиясөз',
    'family.loginResetNote':
      'Кемінде сегіз таңба қолданыңыз. Ортақ немесе ескі кірулер қарап шығуды қажет етуі мүмкін. Ашық сеанстар белсенді болып қалуы мүмкін.',
    'family.loginChecking': 'Тексерілуде…',
    'family.loginChange': 'Құпиясөзді өзгерту',
    'family.loginResetDone':
      'Құпиясөздің өзгергені тіркелді. Ашық сеанстар белсенді болып қалуы мүмкін.',
    'family.loginDetach': 'Бұл оқушыны ажырату',
    'family.loginDetachMeans':
      'Бұл оқушы профилін ажыратады, бірақ кіруді жоймайды және кіру қызметіндегі ашық сеанстарды аяқтамайды. Сенімді тұлға платформаның тұлғаны тексеруін қолданатын дерекқор жолдарында да бұғатталуы мүмкін; басқа қолжетімділік қалуы мүмкін. Кірудің өзін бөлек алып тастау үшін {email} мекенжайына жазыңыз. Сабақтар, үлгерім және сертификаттар оқушыда қалады.',
    'family.loginWhy': 'Себебі (міндетті емес; жазбада сақталады)',
    'family.loginDetaching': 'Ажыратылуда…',
    'family.loginDetachYes': 'Оқушыны ажырату',
    'family.loginKeep': 'Қала берсін',
    'family.loginUnderTwelve':
      '{name} сіздің кіруіңіз арқылы оқиды. Бала он екі жастан бастап өз кіруіне ие бола алады.',
    'family.loginNotOffered':
      'Бұл профиль үшін баланың жаңа кіруі қолжетімді емес. Ол өшірулі болуы немесе алдыңғы кіру қарап шығуды қажет етуі мүмкін. Көмек алу үшін {email} мекенжайына жазыңыз.',
    'family.loginGive': '{name} үшін өз кіруін жасау',
    'family.loginUsername': 'Пайдаланушы аты',
    'family.loginFirstPassword':
      'Бұл алғашқы құпиясөзді {name} үшін сіз табыстайсыз. Ол тікелей кіру қызметіне жіберіледі және содан кейін ешкім, тіпті біз де, оны қайта оқи алмайды. Бала кіргенде одан өз құпиясөзін таңдау сұралады.',
    'family.loginConfirmTwelve':
      '{name} он екі жаста немесе одан үлкен екенін растаймын. Біз туған күнді сұрамаймыз; жауабыңыз тіркеледі.',
    'family.loginMaking': 'Кіру жасалуда…',
    'family.loginMake': '{name} үшін кіруді жасау',
    'family.loginTickFirst':
      'Алдымен бұл баланың он екі жаста немесе одан үлкен екенін растаңыз. Ештеңе жасалған жоқ.',
    'family.loginTooYoung':
      'Он екі жасқа толмаған баланың өз кіруі болмайды. Ол сіздің кіруіңіз арқылы оқиды. Ештеңе жасалған жоқ.',
    'family.loginUnconfirmedMake':
      'Бұл кіруді растай алмадық. Қайта байқамас бұрын отбасы бетін қайта жүктеңіз немесе {email} мекенжайына жазыңыз. Қайта байқасаңыз, бастапқы құпиясөзді қолданыңыз.',
    'family.loginUnconfirmedReset':
      'Құпиясөздің өзгергенін растай алмадық. Қайта байқамас бұрын жаңа құпиясөзбен кіріп көріңіз. Сұрау бірнеше минут ішінде аяқталуы мүмкін.',
    'family.loginUnconfirmedDetach':
      'Ажыратуды растай алмадық. Қайта байқамас бұрын бетті қайта жүктеңіз немесе {email} мекенжайына жазыңыз.',
    'family.loginUsernameMissing': 'Балаңызға пайдаланушы атын таңдаңыз.',
    'family.loginUsernameShort': 'Пайдаланушы атында кемінде үш таңба болуы керек.',
    'family.loginUsernameLong': 'Пайдаланушы аты ең көбі отыз таңбадан тұрады.',
    'family.loginUsernameStart':
      'Пайдаланушы аты a-дан z-ке дейінгі ағылшын әрпінен немесе цифрдан басталады.',
    'family.loginUsernameChars':
      'Тек a-дан z-ке дейінгі ағылшын әріптерін, цифрларды, нүктені, сызықшаны және астыңғы сызықты қолданыңыз; бос орын болмасын.',
    'family.loginPasswordMissing': 'Балаңызға құпиясөз қойыңыз.',
    'family.loginPasswordShort': 'Құпиясөзде кемінде сегіз таңба болуы керек.',
    'family.loginUnavailable':
      'Бұл орнатылымда балалардың кіруін әлі жасау мүмкін емес: тіркелгі жасайтын сервер кілті бапталмаған. Ештеңе өзгерген жоқ.',
    'family.loginNoChild': 'Бұл баланы анықтау мүмкін болмады.',
    'family.loginGuardianRequired':
      'Қазір расталған және осы баланы басқаруға рұқсаты бар қамқоршы қажет. Көмек алу үшін {email} мекенжайына жазыңыз.',
    'family.loginNotYourChild':
      'Бұл баланың кіруін тек оның отбасындағы ересек адам өзгерте алады.',
    'family.loginNoLogin': 'Бұл баланың алып тасталатын кіруі жоқ.',
    'family.loginMalformed': 'Бұл сұрауды оқу мүмкін болмады. Ештеңе өзгерген жоқ.',
  },
  az: {
    'family.loginLinked': '{name} üçün öyrənən profili bağlandı.',
    'family.loginUsernameIs': 'İstifadəçi adı: {username}.',
    'family.loginRecovered':
      'Bu, əvvəlki cəhddən bərpa olundu. Həmin cəhddə qoyulan şifrə qüvvədə qalır; bu dəfə daxil edilən şifrə onu əvəz etmədi.',
    'family.loginHandOver':
      'Seçdiyiniz şifrəni uşağa verin. İlk dəfə daxil olanda ondan öz şifrəsini seçmək istənəcək; siz onu görməyəcəksiniz.',
    'family.loginNotMailbox':
      'İstifadəçi adı giriş üçün tanıdıcıdır, e-poçt qutusu deyil. Şifrə ilə bağlı kömək lazımdırsa, {email} ünvanına yazın.',
    'family.loginDone': 'Hazırdır',
    'family.loginTitle': 'Uşağın öz girişi',
    'family.loginSignsIn': '{name} sistemə {username} istifadəçi adı ilə daxil olur.',
    'family.loginSignsInSince':
      '{name} sistemə {username} istifadəçi adı ilə daxil olur. Yaradılma tarixi: {date}.',
    'family.loginCanReset':
      'Təsdiqlənmiş qəyyum uşağın etibarlı girişi üçün yeni şifrə istəyə bilər. Açıq sessiyalar aktiv qala bilər.',
    'family.loginNoReset': 'Şifrənin bərpası hazırda burada mümkün deyil.',
    'family.loginOwnYes': '{name} öz şifrəsini seçib. Siz onu görə bilməzsiniz.',
    'family.loginOwnNo':
      '{name} hələ də qəyyumun qoyduğu şifrədən istifadə edir. Növbəti dəfə daxil olanda ondan öz şifrəsini seçmək istənəcək.',
    'family.loginSetNew': 'Yeni şifrə qoy',
    'family.loginNewPassword': 'Yeni şifrə',
    'family.loginResetNote':
      'Ən azı səkkiz simvol istifadə edin. Ortaq və ya köhnə girişlər yoxlama tələb edə bilər. Açıq sessiyalar aktiv qala bilər.',
    'family.loginChecking': 'Yoxlanılır…',
    'family.loginChange': 'Şifrəni dəyiş',
    'family.loginResetDone':
      'Şifrənin dəyişdirilməsi qeydə alındı. Açıq sessiyalar aktiv qala bilər.',
    'family.loginDetach': 'Bu öyrənəni ayır',
    'family.loginDetachMeans':
      'Bu, öyrənən profilini ayırır, lakin girişi silmir və giriş xidmətindəki açıq sessiyaları bitirmir. Etibarlı kimlik platformanın kimlik yoxlamasından istifadə edən verilənlər bazası yollarında da bloklana bilər; başqa girişlər qala bilər. Girişin özünün ayrıca silinməsi üçün {email} ünvanına yazın. Dərslər, irəliləyiş və sertifikatlar öyrənəndə qalır.',
    'family.loginWhy': 'Səbəb (istəyə bağlı; qeyddə saxlanılır)',
    'family.loginDetaching': 'Ayrılır…',
    'family.loginDetachYes': 'Öyrənəni ayır',
    'family.loginKeep': 'Qalsın',
    'family.loginUnderTwelve':
      '{name} sizin girişinizlə öyrənir. Uşağın öz girişi on iki yaşından ola bilər.',
    'family.loginNotOffered':
      'Bu profil üçün uşağın yeni girişi mümkün deyil. O, söndürülmüş ola bilər və ya əvvəlki giriş yoxlama tələb edə bilər. Kömək üçün {email} ünvanına yazın.',
    'family.loginGive': '{name} üçün öz girişini yarat',
    'family.loginUsername': 'İstifadəçi adı',
    'family.loginFirstPassword':
      'Bu ilk şifrəni {name} üçün siz təhvil verirsiniz. O, birbaşa giriş xidmətinə göndərilir və bundan sonra heç kim, hətta biz də, onu yenidən oxuya bilmir. Uşaq daxil olanda ondan öz şifrəsini seçmək istənir.',
    'family.loginConfirmTwelve':
      'Təsdiq edirəm ki, {name} on iki yaşındadır və ya daha böyükdür. Biz doğum tarixini soruşmuruq; cavabınız qeydə alınır.',
    'family.loginMaking': 'Giriş yaradılır…',
    'family.loginMake': '{name} üçün girişi yarat',
    'family.loginTickFirst':
      'Əvvəlcə bu uşağın on iki yaşında və ya daha böyük olduğunu təsdiqləyin. Heç nə yaradılmadı.',
    'family.loginTooYoung':
      'On iki yaşdan kiçik uşağın öz girişi olmur. O, sizin girişinizlə öyrənir. Heç nə yaradılmadı.',
    'family.loginUnconfirmedMake':
      'Bu girişi təsdiqləyə bilmədik. Yenidən cəhd etməzdən əvvəl ailə səhifəsini yenidən yükləyin və ya {email} ünvanına yazın. Yenidən cəhd etsəniz, ilkin şifrədən istifadə edin.',
    'family.loginUnconfirmedReset':
      'Şifrənin dəyişdirilməsini təsdiqləyə bilmədik. Yenidən cəhd etməzdən əvvəl yeni şifrə ilə daxil olmağa çalışın. Sorğu bir neçə dəqiqə ərzində tamamlana bilər.',
    'family.loginUnconfirmedDetach':
      'Ayrılmanı təsdiqləyə bilmədik. Yenidən cəhd etməzdən əvvəl səhifəni yenidən yükləyin və ya {email} ünvanına yazın.',
    'family.loginUsernameMissing': 'Uşağınız üçün istifadəçi adı seçin.',
    'family.loginUsernameShort': 'İstifadəçi adında ən azı üç simvol olmalıdır.',
    'family.loginUsernameLong': 'İstifadəçi adı ən çoxu otuz simvol ola bilər.',
    'family.loginUsernameStart':
      'İstifadəçi adı a-dan z-yə qədər ingilis hərfi və ya rəqəmlə başlayır.',
    'family.loginUsernameChars':
      'Yalnız a-dan z-yə qədər ingilis hərflərindən, rəqəmlərdən, nöqtədən, tiredən və alt xətdən istifadə edin; boşluq olmasın.',
    'family.loginPasswordMissing': 'Uşağınız üçün şifrə qoyun.',
    'family.loginPasswordShort': 'Şifrədə ən azı səkkiz simvol olmalıdır.',
    'family.loginUnavailable':
      'Bu quraşdırmada uşaq girişləri hələ yaradıla bilmir: hesab yaradan server açarı tənzimlənməyib. Heç nə dəyişmədi.',
    'family.loginNoChild': 'Həmin uşağı müəyyən etmək mümkün olmadı.',
    'family.loginGuardianRequired':
      'Hazırda təsdiqlənmiş və bu uşağı idarə etməyə icazəsi olan qəyyum lazımdır. Kömək üçün {email} ünvanına yazın.',
    'family.loginNotYourChild':
      'Bu uşağın girişini yalnız onun ailəsindəki yetkin şəxs dəyişə bilər.',
    'family.loginNoLogin': 'Bu uşağın silinəcək girişi yoxdur.',
    'family.loginMalformed': 'Bu sorğunu oxumaq mümkün olmadı. Heç nə dəyişmədi.',
  },
  tg: {
    'family.loginLinked': 'Профили хонанда барои {name} пайваст шуд.',
    'family.loginUsernameIs': 'Номи корбар: {username}.',
    'family.loginRecovered':
      'Ин аз кӯшиши пештара барқарор шуд. Рамзе, ки дар он кӯшиш гузошта шуда буд, эътибор дорад; рамзе, ки ин дафъа ворид шуд, ҷойи онро нагирифт.',
    'family.loginHandOver':
      'Рамзеро, ки интихоб кардед, ба кӯдак диҳед. Бори аввал, ки ворид мешавад, аз ӯ хоҳиш мешавад, ки рамзи худашро интихоб кунад ва шумо онро намебинед.',
    'family.loginNotMailbox':
      'Номи корбар нишона барои воридшавӣ аст, на қуттии почтаи электронӣ. Агар дар бораи рамз кумак лозим бошад, ба {email} нависед.',
    'family.loginDone': 'Тайёр',
    'family.loginTitle': 'Воридшавии худи кӯдак',
    'family.loginSignsIn': '{name} бо номи корбари {username} ворид мешавад.',
    'family.loginSignsInSince':
      '{name} бо номи корбари {username} ворид мешавад. Санаи сохта шудан: {date}.',
    'family.loginCanReset':
      'Сарпарасти тасдиқшуда метавонад барои воридшавии боэътимоди кӯдак рамзи нав дархост кунад. Сессияҳои кушода метавонанд фаъол бимонанд.',
    'family.loginNoReset': 'Барқарор кардани рамз ҳозир дар ин ҷо дастрас нест.',
    'family.loginOwnYes': '{name} рамзи худашро интихоб кардааст. Шумо онро дида наметавонед.',
    'family.loginOwnNo':
      '{name} ҳанӯз рамзеро истифода мебарад, ки сарпараст гузоштааст. Дафъаи оянда, ки ворид мешавад, аз ӯ хоҳиш мешавад, ки рамзи худашро интихоб кунад.',
    'family.loginSetNew': 'Гузоштани рамзи нав',
    'family.loginNewPassword': 'Рамзи нав',
    'family.loginResetNote':
      'Камаш ҳашт аломат истифода баред. Воридшавиҳои муштарак ё кӯҳна метавонанд баррасиро талаб кунанд. Сессияҳои кушода метавонанд фаъол бимонанд.',
    'family.loginChecking': 'Санҷида мешавад…',
    'family.loginChange': 'Иваз кардани рамз',
    'family.loginResetDone': 'Ивази рамз сабт шуд. Сессияҳои кушода метавонанд фаъол бимонанд.',
    'family.loginDetach': 'Ҷудо кардани ин хонанда',
    'family.loginDetachMeans':
      'Ин профили хонандаро ҷудо мекунад, вале воридшавиро нест намекунад ва сессияҳои кушодаро дар хидмати воридшавӣ хотима намедиҳад. Шахсияти боэътимод метавонад дар он роҳҳои пойгоҳи додаҳо, ки санҷиши шахсияти платформаро истифода мебаранд, низ баста шавад; дастрасиҳои дигар метавонанд боқӣ монанд. Барои алоҳида бардоштани худи воридшавӣ ба {email} нависед. Дарсҳо, пешрафт ва шаҳодатномаҳо дар хонанда мемонанд.',
    'family.loginWhy': 'Сабаб (ихтиёрӣ; дар сабт нигоҳ дошта мешавад)',
    'family.loginDetaching': 'Ҷудо карда мешавад…',
    'family.loginDetachYes': 'Ҷудо кардани хонанда',
    'family.loginKeep': 'Бимонад',
    'family.loginUnderTwelve':
      '{name} тавассути воридшавии шумо меомӯзад. Кӯдак аз синни дувоздаҳ метавонад воридшавии худашро дошта бошад.',
    'family.loginNotOffered':
      'Воридшавии нави кӯдак барои ин профил дастрас нест. Шояд он хомӯш бошад ё воридшавии пештара баррасиро талаб кунад. Барои кумак ба {email} нависед.',
    'family.loginGive': 'Сохтани воридшавии худӣ барои {name}',
    'family.loginUsername': 'Номи корбар',
    'family.loginFirstPassword':
      'Ин рамзи аввалро шумо ба {name} месупоред. Он мустақиман ба хидмати воридшавӣ фиристода мешавад ва баъд аз он ҳеҷ кас, ҳатто мо, онро дубора хонда наметавонад. Вақте ки кӯдак ворид мешавад, аз ӯ хоҳиш мешавад, ки рамзи худашро интихоб кунад.',
    'family.loginConfirmTwelve':
      'Тасдиқ мекунам, ки {name} дувоздаҳсола ё калонтар аст. Мо санаи таваллудро намепурсем; ҷавоби шумо сабт мешавад.',
    'family.loginMaking': 'Воридшавӣ сохта мешавад…',
    'family.loginMake': 'Сохтани воридшавӣ барои {name}',
    'family.loginTickFirst':
      'Аввал тасдиқ кунед, ки ин кӯдак дувоздаҳсола ё калонтар аст. Ҳеҷ чиз сохта нашуд.',
    'family.loginTooYoung':
      'Кӯдаки аз дувоздаҳ хурд воридшавии худашро надорад. Ӯ тавассути воридшавии шумо меомӯзад. Ҳеҷ чиз сохта нашуд.',
    'family.loginUnconfirmedMake':
      'Мо ин воридшавиро тасдиқ карда натавонистем. Пеш аз кӯшиши дубора саҳифаи оиларо аз нав бор кунед ё ба {email} нависед. Агар дубора кӯшиш кунед, рамзи аввалро истифода баред.',
    'family.loginUnconfirmedReset':
      'Мо ивази рамзро тасдиқ карда натавонистем. Пеш аз кӯшиши дубора бо рамзи нав ворид шуда бинед. Дархост метавонад дар давоми чанд дақиқа анҷом ёбад.',
    'family.loginUnconfirmedDetach':
      'Мо ҷудо шуданро тасдиқ карда натавонистем. Пеш аз кӯшиши дубора саҳифаро аз нав бор кунед ё ба {email} нависед.',
    'family.loginUsernameMissing': 'Барои кӯдакатон номи корбар интихоб кунед.',
    'family.loginUsernameShort': 'Номи корбар камаш се аломат мехоҳад.',
    'family.loginUsernameLong': 'Номи корбар ҳадди аксар сӣ аломат дошта метавонад.',
    'family.loginUsernameStart': 'Номи корбар бо ҳарфи лотинии аз a то z ё бо рақам оғоз мешавад.',
    'family.loginUsernameChars':
      'Танҳо ҳарфҳои лотинии аз a то z, рақамҳо, нуқта, тире ва зерхатро истифода баред; бе фосила.',
    'family.loginPasswordMissing': 'Барои кӯдакатон рамз гузоред.',
    'family.loginPasswordShort': 'Рамз камаш ҳашт аломат мехоҳад.',
    'family.loginUnavailable':
      'Дар ин насб ҳанӯз воридшавии кӯдаконро сохтан мумкин нест: калиди сервере, ки ҳисоб месозад, танзим нашудааст. Ҳеҷ чиз тағйир наёфт.',
    'family.loginNoChild': 'Ин кӯдакро муайян кардан муяссар нашуд.',
    'family.loginGuardianRequired':
      'Сарпарасте лозим аст, ки ҳозир тасдиқшуда бошад ва иҷозати идора кардани ин кӯдакро дошта бошад. Барои кумак ба {email} нависед.',
    'family.loginNotYourChild':
      'Воридшавии ин кӯдакро танҳо калонсоле аз оилаи ӯ иваз карда метавонад.',
    'family.loginNoLogin': 'Ин кӯдак воридшавие надорад, ки бардошта шавад.',
    'family.loginMalformed': 'Ин дархостро хондан муяссар нашуд. Ҳеҷ чиз тағйир наёфт.',
  },
  ky: {
    'family.loginLinked': '{name} үчүн окуучу профили байланыштырылды.',
    'family.loginUsernameIs': 'Колдонуучу аты: {username}.',
    'family.loginRecovered':
      'Бул мурунку аракеттен калыбына келтирилди. Ошол аракетте коюлган сырсөз күчүндө калат; бул жолу киргизилген сырсөз анын ордун баскан жок.',
    'family.loginHandOver':
      'Өзүңүз тандаган сырсөздү балага бериңиз. Биринчи жолу киргенде андан өз сырсөзүн тандоо суралат, аны сиз көрбөйсүз.',
    'family.loginNotMailbox':
      'Колдонуучу аты — кирүү үчүн белги, электрондук почта кутусу эмес. Сырсөз боюнча жардам керек болсо, {email} дарегине жазыңыз.',
    'family.loginDone': 'Даяр',
    'family.loginTitle': 'Баланын өз кирүүсү',
    'family.loginSignsIn': '{name} тутумга {username} колдонуучу аты менен кирет.',
    'family.loginSignsInSince':
      '{name} тутумга {username} колдонуучу аты менен кирет. Түзүлгөн күнү: {date}.',
    'family.loginCanReset':
      'Ырасталган камкорчу баланын ишенимдүү кирүүсү үчүн жаңы сырсөз сурай алат. Ачык сеанстар активдүү бойдон калышы мүмкүн.',
    'family.loginNoReset': 'Сырсөздү калыбына келтирүү азыр бул жерде жеткиликтүү эмес.',
    'family.loginOwnYes': '{name} өз сырсөзүн тандады. Сиз аны көрө албайсыз.',
    'family.loginOwnNo':
      '{name} дагы эле камкорчу койгон сырсөздү колдонуп жатат. Кийинки жолу киргенде андан өз сырсөзүн тандоо суралат.',
    'family.loginSetNew': 'Жаңы сырсөз коюу',
    'family.loginNewPassword': 'Жаңы сырсөз',
    'family.loginResetNote':
      'Кеминде сегиз белги колдонуңуз. Орток же эски кирүүлөр кароону талап кылышы мүмкүн. Ачык сеанстар активдүү бойдон калышы мүмкүн.',
    'family.loginChecking': 'Текшерилүүдө…',
    'family.loginChange': 'Сырсөздү өзгөртүү',
    'family.loginResetDone':
      'Сырсөздүн өзгөргөнү катталды. Ачык сеанстар активдүү бойдон калышы мүмкүн.',
    'family.loginDetach': 'Бул окуучуну ажыратуу',
    'family.loginDetachMeans':
      'Бул окуучу профилин ажыратат, бирок кирүүнү өчүрбөйт жана кирүү кызматындагы ачык сеанстарды аяктабайт. Ишенимдүү инсандык платформанын инсандыкты текшерүүсүн колдонгон маалымат базасынын жолдорунда да бөгөттөлүшү мүмкүн; башка жеткиликтүүлүк калышы мүмкүн. Кирүүнүн өзүн өзүнчө алып салуу үчүн {email} дарегине жазыңыз. Сабактар, жетишкендик жана сертификаттар окуучуда калат.',
    'family.loginWhy': 'Себеби (милдеттүү эмес; жазууда сакталат)',
    'family.loginDetaching': 'Ажыратылууда…',
    'family.loginDetachYes': 'Окуучуну ажыратуу',
    'family.loginKeep': 'Кала берсин',
    'family.loginUnderTwelve':
      '{name} сиздин кирүүңүз аркылуу окуйт. Бала он эки жаштан баштап өз кирүүсүнө ээ боло алат.',
    'family.loginNotOffered':
      'Бул профиль үчүн баланын жаңы кирүүсү жеткиликтүү эмес. Ал өчүрүлгөн болушу же мурунку кирүү кароону талап кылышы мүмкүн. Жардам алуу үчүн {email} дарегине жазыңыз.',
    'family.loginGive': '{name} үчүн өз кирүүсүн түзүү',
    'family.loginUsername': 'Колдонуучу аты',
    'family.loginFirstPassword':
      'Бул биринчи сырсөздү {name} үчүн сиз тапшырасыз. Ал түз эле кирүү кызматына жөнөтүлөт жана андан кийин эч ким, жада калса биз да, аны кайра окуй албайт. Бала киргенде андан өз сырсөзүн тандоо суралат.',
    'family.loginConfirmTwelve':
      '{name} он эки жашта же андан улуу экенин ырастайм. Биз туулган күндү сурабайбыз; жообуңуз катталат.',
    'family.loginMaking': 'Кирүү түзүлүүдө…',
    'family.loginMake': '{name} үчүн кирүүнү түзүү',
    'family.loginTickFirst':
      'Адегенде бул бала он эки жашта же андан улуу экенин ырастаңыз. Эч нерсе түзүлгөн жок.',
    'family.loginTooYoung':
      'Он эки жашка толо элек баланын өз кирүүсү болбойт. Ал сиздин кирүүңүз аркылуу окуйт. Эч нерсе түзүлгөн жок.',
    'family.loginUnconfirmedMake':
      'Бул кирүүнү ырастай алган жокпуз. Кайра аракет кылардан мурун үй-бүлө барагын кайра жүктөңүз же {email} дарегине жазыңыз. Кайра аракет кылсаңыз, баштапкы сырсөздү колдонуңуз.',
    'family.loginUnconfirmedReset':
      'Сырсөздүн өзгөргөнүн ырастай алган жокпуз. Кайра аракет кылардан мурун жаңы сырсөз менен кирип көрүңүз. Суроо-талап бир нече мүнөттүн ичинде аякташы мүмкүн.',
    'family.loginUnconfirmedDetach':
      'Ажыратууну ырастай алган жокпуз. Кайра аракет кылардан мурун баракты кайра жүктөңүз же {email} дарегине жазыңыз.',
    'family.loginUsernameMissing': 'Балаңыз үчүн колдонуучу атын тандаңыз.',
    'family.loginUsernameShort': 'Колдонуучу атында кеминде үч белги болушу керек.',
    'family.loginUsernameLong': 'Колдонуучу аты эң көп отуз белгиден турат.',
    'family.loginUsernameStart':
      'Колдонуучу аты a дан z ге чейинки англис тамгасы же цифра менен башталат.',
    'family.loginUsernameChars':
      'a дан z ге чейинки англис тамгаларын, цифраларды, чекитти, сызыкчаны жана астыңкы сызыкты гана колдонуңуз; боштук болбосун.',
    'family.loginPasswordMissing': 'Балаңыз үчүн сырсөз коюңуз.',
    'family.loginPasswordShort': 'Сырсөздө кеминде сегиз белги болушу керек.',
    'family.loginUnavailable':
      'Бул орнотууда балдардын кирүүсүн азырынча түзүү мүмкүн эмес: аккаунт түзгөн сервер ачкычы жөндөлгөн эмес. Эч нерсе өзгөргөн жок.',
    'family.loginNoChild': 'Бул баланы аныктоо мүмкүн болгон жок.',
    'family.loginGuardianRequired':
      'Азыр ырасталган жана бул баланы башкарууга уруксаты бар камкорчу керек. Жардам алуу үчүн {email} дарегине жазыңыз.',
    'family.loginNotYourChild':
      'Бул баланын кирүүсүн анын үй-бүлөсүндөгү чоң киши гана өзгөртө алат.',
    'family.loginNoLogin': 'Бул баланын алып салына турган кирүүсү жок.',
    'family.loginMalformed': 'Бул суроо-талапты окуу мүмкүн болгон жок. Эч нерсе өзгөргөн жок.',
  },
  tk: {
    'family.loginLinked': '{name} üçin okuwçy profili baglandy.',
    'family.loginUsernameIs': 'Ulanyjy ady: {username}.',
    'family.loginRecovered':
      'Bu öňki synanyşykdan dikeldildi. Şol synanyşykda goýlan açar söz güýjünde galýar; bu gezek girizilen açar söz onuň ornuny tutmady.',
    'family.loginHandOver':
      'Saýlan açar sözüňizi çaga beriň. Ilkinji gezek girende ondan öz açar sözüni saýlamak soralar; siz ony görmersiňiz.',
    'family.loginNotMailbox':
      'Ulanyjy ady giriş üçin belgidir, e-poçta gutusy däl. Açar söz barada kömek gerek bolsa, {email} salgysyna ýazyň.',
    'family.loginDone': 'Taýýar',
    'family.loginTitle': 'Çaganyň öz girişi',
    'family.loginSignsIn': '{name} ulgama {username} ulanyjy ady bilen girýär.',
    'family.loginSignsInSince':
      '{name} ulgama {username} ulanyjy ady bilen girýär. Döredilen senesi: {date}.',
    'family.loginCanReset':
      'Tassyklanan howandar çaganyň ynamdar girişi üçin täze açar söz sorap biler. Açyk sessiýalar işjeň galyp biler.',
    'family.loginNoReset': 'Açar sözi dikeltmek häzir bu ýerde elýeterli däl.',
    'family.loginOwnYes': '{name} öz açar sözüni saýlady. Siz ony görüp bilmersiňiz.',
    'family.loginOwnNo':
      '{name} henizem howandaryň goýan açar sözüni ulanýar. Indiki gezek girende ondan öz açar sözüni saýlamak soralar.',
    'family.loginSetNew': 'Täze açar söz goý',
    'family.loginNewPassword': 'Täze açar söz',
    'family.loginResetNote':
      'Azyndan sekiz nyşan ulanyň. Umumy ýa-da köne girişler gözden geçirmegi talap edip biler. Açyk sessiýalar işjeň galyp biler.',
    'family.loginChecking': 'Barlanýar…',
    'family.loginChange': 'Açar sözi üýtget',
    'family.loginResetDone':
      'Açar sözüň üýtgedilmegi hasaba alyndy. Açyk sessiýalar işjeň galyp biler.',
    'family.loginDetach': 'Bu okuwçyny aýyr',
    'family.loginDetachMeans':
      'Bu okuwçy profilini aýyrýar, emma girişi pozmaýar we giriş hyzmatyndaky açyk sessiýalary tamamlamaýar. Ynamdar şahsyýet platformanyň şahsyýet barlagyny ulanýan maglumat bazasynyň ýollarynda hem petiklenip biler; beýleki elýeterlilik galyp biler. Girişiň özüni aýratyn aýyrmak üçin {email} salgysyna ýazyň. Sapaklar, öňegidişlik we şahadatnamalar okuwçyda galýar.',
    'family.loginWhy': 'Sebäbi (hökman däl; ýazgyda saklanýar)',
    'family.loginDetaching': 'Aýrylýar…',
    'family.loginDetachYes': 'Okuwçyny aýyr',
    'family.loginKeep': 'Galsyn',
    'family.loginUnderTwelve':
      '{name} siziň girişiňiz arkaly okaýar. Çaganyň öz girişi on iki ýaşdan bolup biler.',
    'family.loginNotOffered':
      'Bu profil üçin çaganyň täze girişi elýeterli däl. Ol öçürilen bolmagy ýa-da öňki giriş gözden geçirmegi talap etmegi mümkin. Kömek üçin {email} salgysyna ýazyň.',
    'family.loginGive': '{name} üçin öz girişini döret',
    'family.loginUsername': 'Ulanyjy ady',
    'family.loginFirstPassword':
      'Bu ilkinji açar sözi {name} üçin siz gowşurýarsyňyz. Ol göni giriş hyzmatyna iberilýär we şondan soň hiç kim, hatda biz hem, ony täzeden okap bilmeýär. Çaga girende ondan öz açar sözüni saýlamak soralýar.',
    'family.loginConfirmTwelve':
      '{name} on iki ýaşynda ýa-da ondan uludygyny tassyklaýaryn. Biz doglan senäni soramaýarys; jogabyňyz hasaba alynýar.',
    'family.loginMaking': 'Giriş döredilýär…',
    'family.loginMake': '{name} üçin girişi döret',
    'family.loginTickFirst':
      'Ilki bu çaganyň on iki ýaşynda ýa-da ondan uludygyny tassyklaň. Hiç zat döredilmedi.',
    'family.loginTooYoung':
      'On iki ýaşa ýetmedik çaganyň öz girişi bolmaýar. Ol siziň girişiňiz arkaly okaýar. Hiç zat döredilmedi.',
    'family.loginUnconfirmedMake':
      'Bu girişi tassyklap bilmedik. Täzeden synanyşmazdan öň maşgala sahypasyny täzeden ýükläň ýa-da {email} salgysyna ýazyň. Täzeden synanyşsaňyz, başdaky açar sözi ulanyň.',
    'family.loginUnconfirmedReset':
      'Açar sözüň üýtgedilmegini tassyklap bilmedik. Täzeden synanyşmazdan öň täze açar söz bilen girip görüň. Haýyş birnäçe minudyň içinde tamamlanyp biler.',
    'family.loginUnconfirmedDetach':
      'Aýrylmagy tassyklap bilmedik. Täzeden synanyşmazdan öň sahypany täzeden ýükläň ýa-da {email} salgysyna ýazyň.',
    'family.loginUsernameMissing': 'Çagaňyz üçin ulanyjy adyny saýlaň.',
    'family.loginUsernameShort': 'Ulanyjy adynda azyndan üç nyşan bolmaly.',
    'family.loginUsernameLong': 'Ulanyjy ady iň köp otuz nyşandan ybarat bolup biler.',
    'family.loginUsernameStart':
      'Ulanyjy ady a-dan z-e çenli iňlis harpy ýa-da san bilen başlanýar.',
    'family.loginUsernameChars':
      'Diňe a-dan z-e çenli iňlis harplaryny, sanlary, nokady, kese çyzygy we aşaky çyzygy ulanyň; boşluk bolmasyn.',
    'family.loginPasswordMissing': 'Çagaňyz üçin açar söz goýuň.',
    'family.loginPasswordShort': 'Açar sözde azyndan sekiz nyşan bolmaly.',
    'family.loginUnavailable':
      'Bu gurnamada çagalaryň girişini entek döredip bolmaýar: hasap döredýän serwer açary sazlanmadyk. Hiç zat üýtgemedi.',
    'family.loginNoChild': 'Bu çagany anyklap bolmady.',
    'family.loginGuardianRequired':
      'Häzir tassyklanan we bu çagany dolandyrmaga rugsady bolan howandar gerek. Kömek üçin {email} salgysyna ýazyň.',
    'family.loginNotYourChild':
      'Bu çaganyň girişini diňe onuň maşgalasyndaky uly ýaşly adam üýtgedip biler.',
    'family.loginNoLogin': 'Bu çaganyň aýrylmaly girişi ýok.',
    'family.loginMalformed': 'Bu haýyşy okap bolmady. Hiç zat üýtgemedi.',
  },
  ta: {
    'family.loginLinked': '{name} என்பவரின் கற்பவர் சுயவிவரம் இணைக்கப்பட்டது.',
    'family.loginUsernameIs': 'பயனர்பெயர்: {username}.',
    'family.loginRecovered':
      'இது முந்தைய முயற்சியிலிருந்து மீட்கப்பட்டது. அந்த முயற்சியில் அமைத்த கடவுச்சொல்லே நடைமுறையில் உள்ளது; இந்த முறை உள்ளிட்ட கடவுச்சொல் அதை மாற்றவில்லை.',
    'family.loginHandOver':
      'நீங்கள் தேர்ந்தெடுத்த கடவுச்சொல்லைக் குழந்தையிடம் கொடுங்கள். முதல் முறை உள்நுழையும்போது, தனக்கென ஒரு கடவுச்சொல்லைத் தேர்ந்தெடுக்குமாறு குழந்தையிடம் கேட்கப்படும்; அதை நீங்கள் பார்க்க மாட்டீர்கள்.',
    'family.loginNotMailbox':
      'பயனர்பெயர் என்பது உள்நுழைவதற்கான அடையாளம், மின்னஞ்சல் பெட்டி அல்ல. கடவுச்சொல் குறித்து உதவி தேவைப்பட்டால் {email} முகவரிக்கு எழுதுங்கள்.',
    'family.loginDone': 'முடிந்தது',
    'family.loginTitle': 'குழந்தையின் சொந்த உள்நுழைவு',
    'family.loginSignsIn': '{name} உள்நுழையும் பயனர்பெயர் {username}.',
    'family.loginSignsInSince':
      '{name} உள்நுழையும் பயனர்பெயர் {username}. உருவாக்கிய நாள்: {date}.',
    'family.loginCanReset':
      'சரிபார்க்கப்பட்ட பாதுகாவலர், நம்பகமான குழந்தை உள்நுழைவுக்குப் புதிய கடவுச்சொல்லைக் கோரலாம். ஏற்கனவே திறந்திருக்கும் அமர்வுகள் தொடர்ந்து இயங்கலாம்.',
    'family.loginNoReset': 'கடவுச்சொல் மீட்பு இப்போது இங்கே கிடைக்கவில்லை.',
    'family.loginOwnYes':
      '{name} தனக்கென ஒரு கடவுச்சொல்லைத் தேர்ந்தெடுத்தாயிற்று. அதை நீங்கள் பார்க்க முடியாது.',
    'family.loginOwnNo':
      '{name} இன்னும் பாதுகாவலர் அமைத்த கடவுச்சொல்லையே பயன்படுத்துகிறார். அடுத்த முறை உள்நுழையும்போது, தனக்கென ஒன்றைத் தேர்ந்தெடுக்குமாறு கேட்கப்படும்.',
    'family.loginSetNew': 'புதிய கடவுச்சொல்லை அமை',
    'family.loginNewPassword': 'புதிய கடவுச்சொல்',
    'family.loginResetNote':
      'குறைந்தது எட்டு எழுத்துக்குறிகளைப் பயன்படுத்துங்கள். பகிரப்பட்ட அல்லது பழைய உள்நுழைவுகளுக்கு மறுஆய்வு தேவைப்படலாம். ஏற்கனவே திறந்திருக்கும் அமர்வுகள் தொடர்ந்து இயங்கலாம்.',
    'family.loginChecking': 'சரிபார்க்கிறது…',
    'family.loginChange': 'கடவுச்சொல்லை மாற்று',
    'family.loginResetDone':
      'கடவுச்சொல் மாற்றம் பதிவு செய்யப்பட்டது. ஏற்கனவே திறந்திருக்கும் அமர்வுகள் தொடர்ந்து இயங்கலாம்.',
    'family.loginDetach': 'இந்தக் கற்பவரைப் பிரி',
    'family.loginDetachMeans':
      'இது கற்பவர் சுயவிவரத்தைப் பிரிக்கிறது; ஆனால் உள்நுழைவை நீக்குவதில்லை, உள்நுழைவுச் சேவையில் திறந்திருக்கும் அமர்வுகளையும் முடிப்பதில்லை. தளத்தின் அடையாளச் சரிபார்ப்பைப் பயன்படுத்தும் தரவுத்தளப் பாதைகளில் நம்பகமான அடையாளமும் தடுக்கப்படலாம்; மற்ற அணுகல் தொடரலாம். உள்நுழைவையே தனியாக நீக்க ஏற்பாடு செய்ய {email} முகவரிக்கு எழுதுங்கள். பாடங்கள், முன்னேற்றம், சான்றிதழ்கள் ஆகியவை கற்பவரிடமே இருக்கும்.',
    'family.loginWhy': 'காரணம் (விருப்பத்தேர்வு; பதிவில் வைக்கப்படும்)',
    'family.loginDetaching': 'பிரிக்கிறது…',
    'family.loginDetachYes': 'கற்பவரைப் பிரி',
    'family.loginKeep': 'அப்படியே வை',
    'family.loginUnderTwelve':
      '{name} உங்கள் உள்நுழைவின் வழியாகக் கற்கிறார். பன்னிரண்டு வயது முதல் ஒரு குழந்தைக்குச் சொந்த உள்நுழைவு இருக்கலாம்.',
    'family.loginNotOffered':
      'இந்தச் சுயவிவரத்துக்குப் புதிய குழந்தை உள்நுழைவு கிடைக்கவில்லை. அது அணைக்கப்பட்டிருக்கலாம் அல்லது முந்தைய உள்நுழைவுக்கு மறுஆய்வு தேவைப்படலாம். உதவிக்கு {email} முகவரிக்கு எழுதுங்கள்.',
    'family.loginGive': '{name} என்பவருக்குச் சொந்த உள்நுழைவை உருவாக்கு',
    'family.loginUsername': 'பயனர்பெயர்',
    'family.loginFirstPassword':
      'இந்த முதல் கடவுச்சொல்லை {name} என்பவரிடம் ஒப்படைப்பது நீங்கள்தான். அது நேரடியாக உள்நுழைவுச் சேவைக்கு அனுப்பப்படுகிறது; அதன் பிறகு யாராலும், எங்களாலும்கூட, அதை மீண்டும் படிக்க முடியாது. உள்நுழையும்போது, தனக்கென ஒன்றைத் தேர்ந்தெடுக்குமாறு குழந்தையிடம் கேட்கப்படும்.',
    'family.loginConfirmTwelve':
      '{name} பன்னிரண்டு வயது அல்லது அதற்கு மேற்பட்டவர் என்பதை உறுதிப்படுத்துகிறேன். நாங்கள் பிறந்த தேதியைக் கேட்பதில்லை; உங்கள் பதில் பதிவு செய்யப்படுகிறது.',
    'family.loginMaking': 'உள்நுழைவை உருவாக்குகிறது…',
    'family.loginMake': '{name} என்பவரின் உள்நுழைவை உருவாக்கு',
    'family.loginTickFirst':
      'இந்தக் குழந்தை பன்னிரண்டு வயது அல்லது அதற்கு மேற்பட்டவர் என்பதை முதலில் உறுதிப்படுத்துங்கள். எதுவும் உருவாக்கப்படவில்லை.',
    'family.loginTooYoung':
      'பன்னிரண்டு வயதுக்குட்பட்ட குழந்தைக்குச் சொந்த உள்நுழைவு இல்லை. அந்தக் குழந்தை உங்கள் உள்நுழைவின் வழியாகக் கற்கிறது. எதுவும் உருவாக்கப்படவில்லை.',
    'family.loginUnconfirmedMake':
      'இந்த உள்நுழைவை எங்களால் உறுதிப்படுத்த முடியவில்லை. மீண்டும் முயலும் முன் குடும்பப் பக்கத்தை மீண்டும் ஏற்றுங்கள் அல்லது {email} முகவரிக்கு எழுதுங்கள். மீண்டும் முயன்றால், முதலில் அமைத்த கடவுச்சொல்லையே பயன்படுத்துங்கள்.',
    'family.loginUnconfirmedReset':
      'கடவுச்சொல் மாற்றத்தை எங்களால் உறுதிப்படுத்த முடியவில்லை. மீண்டும் முயலும் முன் புதிய கடவுச்சொல்லுடன் உள்நுழைந்து பாருங்கள். கோரிக்கை சில நிமிடங்களில் நிறைவடையக்கூடும்.',
    'family.loginUnconfirmedDetach':
      'பிரிப்பை எங்களால் உறுதிப்படுத்த முடியவில்லை. மீண்டும் முயலும் முன் பக்கத்தை மீண்டும் ஏற்றுங்கள் அல்லது {email} முகவரிக்கு எழுதுங்கள்.',
    'family.loginUsernameMissing': 'உங்கள் குழந்தைக்கு ஒரு பயனர்பெயரைத் தேர்ந்தெடுங்கள்.',
    'family.loginUsernameShort': 'பயனர்பெயரில் குறைந்தது மூன்று எழுத்துக்குறிகள் தேவை.',
    'family.loginUsernameLong': 'பயனர்பெயரில் அதிகபட்சம் முப்பது எழுத்துக்குறிகள் இருக்கலாம்.',
    'family.loginUsernameStart':
      'பயனர்பெயர் a முதல் z வரையிலான ஆங்கில எழுத்து அல்லது எண்ணுடன் தொடங்கும்.',
    'family.loginUsernameChars':
      'a முதல் z வரையிலான ஆங்கில எழுத்துகள், எண்கள், புள்ளி, இடைக்கோடு, அடிக்கோடு ஆகியவற்றை மட்டும் பயன்படுத்துங்கள்; இடைவெளி கூடாது.',
    'family.loginPasswordMissing': 'உங்கள் குழந்தைக்கு ஒரு கடவுச்சொல்லை அமையுங்கள்.',
    'family.loginPasswordShort': 'கடவுச்சொல்லில் குறைந்தது எட்டு எழுத்துக்குறிகள் தேவை.',
    'family.loginUnavailable':
      'இந்த நிறுவலில் குழந்தை உள்நுழைவுகளை இன்னும் உருவாக்க முடியாது: கணக்கை உருவாக்கும் சேவையக விசை அமைக்கப்படவில்லை. எதுவும் மாறவில்லை.',
    'family.loginNoChild': 'அந்தக் குழந்தையை அடையாளம் காண முடியவில்லை.',
    'family.loginGuardianRequired':
      'தற்போது சரிபார்க்கப்பட்ட, இந்தக் குழந்தையை நிர்வகிக்க அனுமதி உள்ள பாதுகாவலர் தேவை. உதவிக்கு {email} முகவரிக்கு எழுதுங்கள்.',
    'family.loginNotYourChild':
      'இந்தக் குழந்தையின் குடும்பத்திலுள்ள பெரியவர் மட்டுமே இந்தக் குழந்தையின் உள்நுழைவை மாற்ற முடியும்.',
    'family.loginNoLogin': 'நீக்குவதற்கு இந்தக் குழந்தைக்கு உள்நுழைவு எதுவும் இல்லை.',
    'family.loginMalformed': 'அந்தக் கோரிக்கையைப் படிக்க முடியவில்லை. எதுவும் மாறவில்லை.',
  },
  ne: {
    'family.loginLinked': '{name}को सिकारु प्रोफाइल जोडिएको छ।',
    'family.loginUsernameIs': 'प्रयोगकर्ता नाम {username} हो।',
    'family.loginRecovered':
      'यो अघिल्लो प्रयासबाट पुनःप्राप्त गरिएको हो। त्यस प्रयासमा राखिएको पासवर्ड नै लागू छ; यस पटक हालिएको पासवर्डले त्यसलाई बदलेन।',
    'family.loginHandOver':
      'तपाईंले रोजेको पासवर्ड बालबालिकालाई दिनुहोस्। पहिलो पटक साइन इन गर्दा उनलाई आफ्नै पासवर्ड रोज्न भनिनेछ, जुन तपाईंले देख्नुहुने छैन।',
    'family.loginNotMailbox':
      'प्रयोगकर्ता नाम साइन इनको पहिचान हो, इमेल बाकस होइन। पासवर्डबारे सहयोग चाहिएमा {email} मा लेख्नुहोस्।',
    'family.loginDone': 'भयो',
    'family.loginTitle': 'बालबालिकाको आफ्नै लगइन',
    'family.loginSignsIn': '{name}को साइन इनको प्रयोगकर्ता नाम {username} हो।',
    'family.loginSignsInSince':
      '{name}को साइन इनको प्रयोगकर्ता नाम {username} हो, {date} मा बनाइएको।',
    'family.loginCanReset':
      'प्रमाणित अभिभावकले बालबालिकाको विश्वसनीय लगइनका लागि नयाँ पासवर्ड माग्न सक्छन्। पहिल्यै खुलेका सत्रहरू सक्रिय रहन सक्छन्।',
    'family.loginNoReset': 'पासवर्ड पुनःप्राप्ति अहिले यहाँ उपलब्ध छैन।',
    'family.loginOwnYes': '{name}को पासवर्ड अब आफ्नै रोजाइको हो। तपाईं त्यो देख्न सक्नुहुन्न।',
    'family.loginOwnNo':
      '{name}सँग अझै अभिभावकले राखेको पासवर्ड नै छ। अर्को पटक साइन इन गर्दा आफ्नै पासवर्ड रोज्न भनिनेछ।',
    'family.loginSetNew': 'नयाँ पासवर्ड राख्नुहोस्',
    'family.loginNewPassword': 'नयाँ पासवर्ड',
    'family.loginResetNote':
      'कम्तीमा आठ वर्ण प्रयोग गर्नुहोस्। साझा वा पुराना साइन-इनको समीक्षा आवश्यक पर्न सक्छ। पहिल्यै खुलेका सत्रहरू सक्रिय रहन सक्छन्।',
    'family.loginChecking': 'जाँच हुँदै छ…',
    'family.loginChange': 'पासवर्ड बदल्नुहोस्',
    'family.loginResetDone':
      'पासवर्ड परिवर्तन अभिलेख गरियो। पहिल्यै खुलेका सत्रहरू सक्रिय रहन सक्छन्।',
    'family.loginDetach': 'यो सिकारुलाई अलग गर्नुहोस्',
    'family.loginDetachMeans':
      'यसले सिकारु प्रोफाइल अलग गर्छ, तर साइन-इन मेट्दैन र साइन-इन सेवामा खुलेका सत्रहरू अन्त्य गर्दैन। प्लेटफर्मको पहिचान जाँच प्रयोग गर्ने डेटाबेसका बाटाहरूमा विश्वसनीय पहिचान पनि रोकिन सक्छ; अन्य पहुँच रहन सक्छ। साइन-इन नै छुट्टै हटाउने व्यवस्था गर्न {email} मा लेख्नुहोस्। पाठ, प्रगति र प्रमाणपत्रहरू सिकारुसँगै रहन्छन्।',
    'family.loginWhy': 'कारण (ऐच्छिक; अभिलेखमा राखिन्छ)',
    'family.loginDetaching': 'अलग गरिँदै छ…',
    'family.loginDetachYes': 'सिकारुलाई अलग गर्नुहोस्',
    'family.loginKeep': 'रहन दिनुहोस्',
    'family.loginUnderTwelve':
      '{name}को सिकाइ तपाईंको साइन-इनमार्फत हुन्छ। बालबालिकाको आफ्नै लगइन बाह्र वर्षको उमेरदेखि हुन सक्छ।',
    'family.loginNotOffered':
      'यो प्रोफाइलका लागि बालबालिकाको नयाँ लगइन उपलब्ध छैन। यो बन्द हुन सक्छ वा अघिल्लो लगइनको समीक्षा आवश्यक हुन सक्छ। सहयोगका लागि {email} मा लेख्नुहोस्।',
    'family.loginGive': '{name}का लागि आफ्नै लगइन बनाउनुहोस्',
    'family.loginUsername': 'प्रयोगकर्ता नाम',
    'family.loginFirstPassword':
      'यो पहिलो पासवर्ड तपाईंले नै {name}लाई हस्तान्तरण गर्ने हो। यो सिधै साइन-इन सेवामा पठाइन्छ र त्यसपछि कसैले पनि, हामीले समेत, फेरि पढ्न सक्दैन। साइन इन गर्दा बालबालिकालाई आफ्नै पासवर्ड रोज्न भनिन्छ।',
    'family.loginConfirmTwelve':
      'म पुष्टि गर्छु कि {name}को उमेर बाह्र वर्ष वा सोभन्दा बढी छ। हामी जन्म मिति सोध्दैनौँ; तपाईंको उत्तर अभिलेख गरिन्छ।',
    'family.loginMaking': 'लगइन बनाइँदै छ…',
    'family.loginMake': '{name}को लगइन बनाउनुहोस्',
    'family.loginTickFirst':
      'पहिले यो बालबालिकाको उमेर बाह्र वर्ष वा सोभन्दा बढी छ भनी पुष्टि गर्नुहोस्। केही पनि बनाइएन।',
    'family.loginTooYoung':
      'बाह्र वर्षमुनिका बालबालिकाको आफ्नै लगइन हुँदैन। उनीहरू तपाईंको साइन-इनमार्फत सिक्छन्। केही पनि बनाइएन।',
    'family.loginUnconfirmedMake':
      'हामीले यो लगइन पुष्टि गर्न सकेनौँ। फेरि प्रयास गर्नुअघि परिवारको पृष्ठ पुनः लोड गर्नुहोस् वा {email} मा लेख्नुहोस्। फेरि प्रयास गर्नुभयो भने सुरुकै पासवर्ड प्रयोग गर्नुहोस्।',
    'family.loginUnconfirmedReset':
      'हामीले पासवर्ड परिवर्तन पुष्टि गर्न सकेनौँ। फेरि प्रयास गर्नुअघि नयाँ पासवर्डले साइन इन गरेर हेर्नुहोस्। अनुरोध केही मिनेटभित्र पूरा हुन सक्छ।',
    'family.loginUnconfirmedDetach':
      'हामीले अलग गरिएको पुष्टि गर्न सकेनौँ। फेरि प्रयास गर्नुअघि पृष्ठ पुनः लोड गर्नुहोस् वा {email} मा लेख्नुहोस्।',
    'family.loginUsernameMissing': 'आफ्नो बालबालिकाका लागि प्रयोगकर्ता नाम रोज्नुहोस्।',
    'family.loginUsernameShort': 'प्रयोगकर्ता नाममा कम्तीमा तीन वर्ण चाहिन्छ।',
    'family.loginUsernameLong': 'प्रयोगकर्ता नाम बढीमा तीस वर्णको हुन सक्छ।',
    'family.loginUsernameStart':
      'प्रयोगकर्ता नाम a देखि z सम्मको अङ्ग्रेजी अक्षर वा अङ्कबाट सुरु हुन्छ।',
    'family.loginUsernameChars':
      'a देखि z सम्मका अङ्ग्रेजी अक्षर, अङ्क, थोप्लो, ड्यास र अन्डरस्कोर मात्र प्रयोग गर्नुहोस्; खाली ठाउँ नराख्नुहोस्।',
    'family.loginPasswordMissing': 'आफ्नो बालबालिकाका लागि पासवर्ड राख्नुहोस्।',
    'family.loginPasswordShort': 'पासवर्डमा कम्तीमा आठ वर्ण चाहिन्छ।',
    'family.loginUnavailable':
      'यस स्थापनामा अहिलेसम्म बालबालिकाका लगइन बनाउन सकिँदैन: खाता बनाउने सर्भर कुञ्जी मिलाइएको छैन। केही पनि बदलिएन।',
    'family.loginNoChild': 'त्यो बालबालिका पहिचान गर्न सकिएन।',
    'family.loginGuardianRequired':
      'हाल प्रमाणित भएका र यो बालबालिकाको व्यवस्थापन गर्न अनुमति पाएका अभिभावक चाहिन्छ। सहयोगका लागि {email} मा लेख्नुहोस्।',
    'family.loginNotYourChild': 'यो बालबालिकाको लगइन उनको परिवारका वयस्कले मात्र बदल्न सक्छन्।',
    'family.loginNoLogin': 'यो बालबालिकाको हटाउनुपर्ने कुनै लगइन छैन।',
    'family.loginMalformed': 'त्यो अनुरोध पढ्न सकिएन। केही पनि बदलिएन।',
  },
};
