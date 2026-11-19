import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Inviting a friend (`app/account/referrals/page.tsx` and its two buttons) and
 * the page a friend opens (`app/referral/[code]/page.tsx`).
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts`, `reading.ts`, `restore.ts`, `phone.ts`, `merge.ts`
 * and `share.ts`: written for the twenty-seven languages with nothing held in
 * `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Nothing here is money.** Both sides get a discount code. No language
 * below says anything is paid, earned as cash or withdrawn.
 *
 * **What is put in comes after a colon wherever a language would have to
 * inflect it.** A count or a number of days in the reader's own digits
 * (`{count}`, `{days}`, `{max}`), a percentage formatted for the language
 * (`{percent}`, `{friend}`, `{you}`), a date and time with its zone said
 * (`{date}`). `{name}` is a first name somebody typed; the page sets it apart.
 * `{link}` is an address and closes the message that carries it.
 *
 * **Nobody is given a gender.** Where a language marks one on "invited" or on
 * "bought", the sentence is turned so that it does not ("an invitation from
 * {name}", "purchase of a course").
 *
 * **Some sentences on these screens are borrowed.** The title and the heading
 * over the code are the account page's (`account.inviteHeading`,
 * `account.inviteLink`) and the way back is the merge screen's (`merge.back`).
 *
 * **Served to the server only.** `refer.` is in `SERVER_ONLY_PREFIXES`: both
 * pages are drawn on the server and the two buttons are handed their words.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const REFER: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'refer.lede':
      'الصديق الجديد هنا يحصل على خصم على دورته الأولى، وتحصل أنت على خصم على دورتك التالية. كلاهما خصم على دورة لا مال، فلا شيء يُسحب ولا حاجة إلى بيانات مصرفية.',
    'refer.off':
      'دعوة الأصدقاء متوقفة حاليًا، فلا يوجد رمز يُعطى بعد. عند تشغيلها تعرض هذه الصفحة رمزك وما نتج عنه.',
    'refer.unread':
      'تعذّرت قراءة تفاصيل الدعوة الآن. لم يُخصم أي مبلغ ولم يُستخدم أي رمز. إعادة التحميل آمنة.',
    'refer.terms':
      'يحصل صديقك على خصم {friend} على دورته الأولى. وعند وصول دفعه تحصل على رمز بخصم {you} على دورتك التالية، ويبدأ العمل به بعد انقضاء مهلة الاسترداد.',
    'refer.copyLink': 'انسخ رابط الدعوة',
    'refer.linkCopied': 'تم نسخ الرابط',
    'refer.copyMessage': 'انسخ رسالة',
    'refer.messageCopied': 'تم نسخ الرسالة',
    'refer.copyRefused': 'لم يسمح هذا المتصفح بالنسخ. الرابط مكتوب في الأسفل ويمكن تحديده يدويًا.',
    'refer.noCode':
      'يُنشأ رمزك عند أول فتح لهذه الصفحة ويبقى كما هو دائمًا. إن كان ما زال مفقودًا فأعد تحميل الصفحة مرة واحدة.',
    'refer.msgNamed': 'دعوة من {name} إلى AyahSpring. خصم {percent} على دورتك الأولى: {link}',
    'refer.msgPlain': 'لديك دعوة إلى AyahSpring. خصم {percent} على دورتك الأولى: {link}',
    'refer.rewardsHeading': 'المكافآت التي حصلت عليها',
    'refer.rewardCount': 'المكافآت: {count}',
    'refer.noRewards': 'لا شيء بعد. تظهر المكافأة هنا عندما يستخدم أحدهم رمزك ويصل دفعه.',
    'refer.rewardWorth': 'خصم {percent} على دورة',
    'refer.rwEarned': 'تم الحصول عليها',
    'refer.rwReversed': 'سُحبت: الشراء الذي نتجت عنه استُرد مبلغه',
    'refer.rwOther': 'مسجَّل',
    'refer.rwFrom': 'يمكن استخدامه ابتداءً من {date}',
    'refer.rwBy': 'استخدمه قبل {date}',
    'refer.rwUse': 'اكتبه في خانة الرمز في صفحة الدفع لأي دورة تشتريها.',
    'refer.invitedHeading': 'من دعوتهم',
    'refer.invitedCount': 'الأشخاص: {count}',
    'refer.nobodyInvited': 'لا أحد بعد. يظهر الأشخاص هنا بعد أن يستخدموا رمزك في عملية شراء.',
    'refer.pnPending': 'بدء عملية شراء',
    'refer.pnBought': 'شراء دورة',
    'refer.pnRefunded': 'استُرد مبلغ الشراء',
    'refer.friend': 'صديق',
    'refer.onlyFirstName':
      'يظهر الاسم الأول فقط. ما يتعلمه غيرك، ومع من، ليس لك أن تراه لمجرد أنك دعوته.',
    'refer.howHeading': 'كيف تعمل الدعوة',
    'refer.how1': 'ترسل الرابط. يفتحه صديقك ويرى قيمة الرمز قبل أن يقرر أي شيء.',
    'refer.how2': 'يكتبه عند شراء دورته الأولى، ويظهر الخصم في الإيصال الذي يحتفظ به.',
    'refer.how3':
      'عند وصول دفعه يُنشأ رمز مكافأتك. يبدأ العمل به بعد انقضاء مهلة الاسترداد، ثم يبقى صالحًا هذا العدد من الأيام: {days}. وإذا استُرد مبلغه سُحبت المكافأة.',
    'refer.how4':
      'المكافآت التي يمكنك الحصول عليها في اثني عشر شهرًا: {max}. كل واحدة منها خصم عادي على طلب عادي بإيصال عادي.',
    'refer.honesty':
      'المكافأتان خصمان على دورة لا مال. لا يُصرف شيء لأحد، ولهذا لا تحتاج دعوة صديق إلى بيانات مصرفية.',
    'refer.lnEyebrow': 'دعوة',
    'refer.lnBadTitle': 'هذا الرابط لا يعمل',
    'refer.lnBadBody':
      'الرمز الذي فيه مكتوب خطأ أو لم يكن موجودًا قط. لم يُخصم أي مبلغ ولم يُسجَّل اشتراك في شيء. أنت زائر في هذه الصفحة لا أكثر.',
    'refer.lnOffTitle': 'الدعوات غير مفتوحة حاليًا',
    'refer.lnUnreadTitle': 'تعذّرت قراءة هذه الدعوة الآن',
    'refer.lnStill': 'لم يُخصم أي مبلغ، والدورات ما زالت هنا.',
    'refer.lnBrowse': 'تصفّح الدورات',
    'refer.lnTitleNamed': 'دعوة من {name}',
    'refer.lnTitlePlain': 'لديك دعوة',
    'refer.lnWorth': 'رمز صديقك يخصم {percent} من دورتك الأولى هنا.',
    'refer.lnNotMoney': 'هو خصم على الدورة لا مال، فلا شيء يُسحب.',
    'refer.lnCardHeading': 'دعوتك',
    'refer.lnKeep': 'احتفظ بهذا الرمز وتصفّح',
    'refer.lnKept':
      'استخدم الزر فيتذكر هذا المتصفح الرمز ويملؤه في صفحة الدفع. عدد أيام تذكّره: {days}. ويمكنك أيضًا كتابته هناك بنفسك.',
    'refer.lnAbout':
      'AyahSpring يعلّم الدين الإسلامي للأطفال والكبار، بوتيرة تناسب مشاغل الحياة. تُراجَع الدورات قبل نشرها، وكل معلّم تعيّنه المنصة.',
  },
  ur: {
    'refer.lede':
      'یہاں نئے آنے والے دوست کو اپنے پہلے کورس پر رعایت ملتی ہے، اور آپ کو اپنے اگلے کورس پر۔ دونوں کورس پر رعایتیں ہیں، رقم نہیں، اس لیے نکلوانے کو کچھ نہیں اور بینک کی تفصیل دینے کی ضرورت نہیں۔',
    'refer.off':
      'دوست کو دعوت دینا اس وقت بند ہے، اس لیے ابھی دینے کو کوئی کوڈ نہیں۔ جب یہ کھلے گا تو یہ صفحہ آپ کا کوڈ اور اس کا نتیجہ دکھائے گا۔',
    'refer.unread':
      'دعوت کی تفصیل اس وقت پڑھی نہ جا سکی۔ کوئی رقم نہیں لی گئی اور کوئی کوڈ استعمال نہیں ہوا۔ صفحہ دوبارہ کھولنا محفوظ ہے۔',
    'refer.terms':
      'آپ کے دوست کو اپنے پہلے کورس پر {friend} رعایت ملتی ہے۔ جب اس کی ادائیگی پہنچتی ہے تو آپ کو اپنے اگلے کورس پر {you} رعایت کا کوڈ ملتا ہے، جو رقم واپسی کی مدت گزرنے کے بعد کام کرنا شروع کرتا ہے۔',
    'refer.copyLink': 'دعوت کا لنک نقل کریں',
    'refer.linkCopied': 'لنک نقل ہو گیا',
    'refer.copyMessage': 'پیغام نقل کریں',
    'refer.messageCopied': 'پیغام نقل ہو گیا',
    'refer.copyRefused':
      'اس براؤزر نے نقل کرنے کی اجازت نہیں دی۔ لنک نیچے لکھا ہے اور ہاتھ سے منتخب کیا جا سکتا ہے۔',
    'refer.noCode':
      'آپ کا کوڈ اس صفحے کے پہلی بار کھلنے پر بنتا ہے اور ہمیشہ وہی رہتا ہے۔ اگر اب بھی نہیں ہے تو صفحہ ایک بار دوبارہ کھولیں۔',
    'refer.msgNamed':
      '{name} نے آپ کو AyahSpring پر دعوت دی ہے۔ آپ کے پہلے کورس پر {percent} رعایت: {link}',
    'refer.msgPlain':
      'آپ کو AyahSpring پر دعوت دی گئی ہے۔ آپ کے پہلے کورس پر {percent} رعایت: {link}',
    'refer.rewardsHeading': 'آپ کے حاصل کردہ انعامات',
    'refer.rewardCount': 'انعامات: {count}',
    'refer.noRewards':
      'ابھی کچھ نہیں۔ انعام یہاں تب آتا ہے جب کوئی آپ کا کوڈ استعمال کرے اور اس کی ادائیگی پہنچ جائے۔',
    'refer.rewardWorth': 'ایک کورس پر {percent} رعایت',
    'refer.rwEarned': 'حاصل ہو گیا',
    'refer.rwReversed': 'واپس لے لیا گیا: جس خریداری سے یہ ملا تھا اس کی رقم واپس کر دی گئی',
    'refer.rwOther': 'درج ہے',
    'refer.rwFrom': '{date} سے قابلِ استعمال',
    'refer.rwBy': '{date} تک استعمال کریں',
    'refer.rwUse':
      'جو بھی کورس آپ خرید رہے ہوں، اس کے ادائیگی کے صفحے پر کوڈ کے خانے میں اسے لکھیں۔',
    'refer.invitedHeading': 'آپ نے کسے دعوت دی',
    'refer.invitedCount': 'افراد: {count}',
    'refer.nobodyInvited':
      'ابھی کوئی نہیں۔ لوگ یہاں تب آتے ہیں جب وہ کسی خریداری پر آپ کا کوڈ استعمال کر لیں۔',
    'refer.pnPending': 'خریداری شروع کی',
    'refer.pnBought': 'ایک کورس خریدا',
    'refer.pnRefunded': 'ان کی خریداری کی رقم واپس کر دی گئی',
    'refer.friend': 'ایک دوست',
    'refer.onlyFirstName':
      'صرف پہلا نام دکھایا جاتا ہے۔ کوئی دوسرا کیا سیکھتا ہے اور کس کے ساتھ، یہ دیکھنا آپ کا حق نہیں بنتا صرف اس لیے کہ آپ نے اسے دعوت دی۔',
    'refer.howHeading': 'یہ کیسے کام کرتا ہے',
    'refer.how1':
      'آپ لنک بھیجتے ہیں۔ وہ اسے کھولتے ہیں اور کچھ طے کرنے سے پہلے دیکھتے ہیں کہ کوڈ کی قدر کیا ہے۔',
    'refer.how2':
      'وہ اپنا پہلا کورس خریدتے وقت اسے لکھتے ہیں، اور رعایت اس رسید پر نظر آتی ہے جو ان کے پاس رہتی ہے۔',
    'refer.how3':
      'جب ان کی ادائیگی پہنچتی ہے تو آپ کے انعام کا کوڈ بن جاتا ہے۔ یہ رقم واپسی کی مدت گزرنے کے بعد کام کرنا شروع کرتا ہے، اور پھر اتنے دن چلتا ہے: {days}۔ اگر انہیں رقم واپس کی جائے تو انعام واپس لے لیا جاتا ہے۔',
    'refer.how4':
      'بارہ مہینوں میں آپ اتنے انعامات حاصل کر سکتے ہیں: {max}۔ ہر ایک عام آرڈر پر عام رعایت ہے، عام رسید کے ساتھ۔',
    'refer.honesty':
      'دونوں انعامات کورس پر رعایتیں ہیں، رقم نہیں۔ کسی کو کچھ ادا نہیں کیا جاتا، اسی لیے دوست کو دعوت دینے کے لیے بینک کی تفصیل درکار نہیں۔',
    'refer.lnEyebrow': 'ایک دعوت',
    'refer.lnBadTitle': 'یہ لنک کام نہیں کرتا',
    'refer.lnBadBody':
      'اس میں موجود کوڈ غلط لکھا گیا ہے یا کبھی تھا ہی نہیں۔ کوئی رقم نہیں لی گئی اور کسی چیز کے لیے اندراج نہیں ہوا۔ آپ اس صفحے پر صرف ایک مہمان ہیں۔',
    'refer.lnOffTitle': 'دعوتیں اس وقت کھلی نہیں ہیں',
    'refer.lnUnreadTitle': 'یہ دعوت اس وقت پڑھی نہ جا سکی',
    'refer.lnStill': 'کوئی رقم نہیں لی گئی، اور کورس اب بھی یہیں ہیں۔',
    'refer.lnBrowse': 'کورس دیکھیں',
    'refer.lnTitleNamed': '{name} نے آپ کو دعوت دی ہے',
    'refer.lnTitlePlain': 'آپ کو دعوت دی گئی ہے',
    'refer.lnWorth': 'ان کا کوڈ یہاں آپ کے پہلے کورس پر {percent} رعایت دیتا ہے۔',
    'refer.lnNotMoney': 'یہ کورس پر رعایت ہے، رقم نہیں، اس لیے نکلوانے کو کچھ نہیں۔',
    'refer.lnCardHeading': 'آپ کی دعوت',
    'refer.lnKeep': 'یہ کوڈ رکھیں اور کورس دیکھیں',
    'refer.lnKept':
      'بٹن استعمال کریں تو یہ براؤزر کوڈ یاد رکھتا ہے اور ادائیگی کے صفحے پر خود بھر دیتا ہے۔ اتنے دن یاد رہتا ہے: {days}۔ آپ اسے وہاں خود بھی لکھ سکتے ہیں۔',
    'refer.lnAbout':
      'AyahSpring بچوں اور بڑوں کو دینِ اسلام سکھاتا ہے، ایسی رفتار سے جو زندگی کے ساتھ چل سکے۔ کورس شائع ہونے سے پہلے جانچے جاتے ہیں، اور ہر استاد کو پلیٹ فارم مقرر کرتا ہے۔',
  },
  fa: {
    'refer.lede':
      'دوستی که تازه به اینجا آمده برای نخستین دوره‌اش تخفیف می‌گیرد، و شما برای دورهٔ بعدی خود. هر دو تخفیف دوره‌اند نه پول، پس چیزی برای برداشت نیست و به اطلاعات بانکی نیازی نیست.',
    'refer.off':
      'دعوت از دوست اکنون خاموش است، پس هنوز کدی برای دادن نیست. وقتی روشن شود، این صفحه کد شما و نتیجهٔ آن را نشان می‌دهد.',
    'refer.unread':
      'جزئیات دعوت اکنون خوانده نشد. هیچ مبلغی برداشت نشد و هیچ کدی به کار نرفت. بارگذاری دوباره بی‌خطر است.',
    'refer.terms':
      'دوست شما برای نخستین دوره‌اش {friend} تخفیف می‌گیرد. وقتی پرداخت او برسد، شما کدی با {you} تخفیف برای دورهٔ بعدی خود می‌گیرید که پس از گذشتن مهلت بازپرداخت به کار می‌افتد.',
    'refer.copyLink': 'پیوند دعوت را رونوشت کنید',
    'refer.linkCopied': 'پیوند رونوشت شد',
    'refer.copyMessage': 'یک پیام را رونوشت کنید',
    'refer.messageCopied': 'پیام رونوشت شد',
    'refer.copyRefused':
      'این مرورگر اجازهٔ رونوشت نداد. پیوند در پایین نوشته شده و می‌توان آن را با دست برگزید.',
    'refer.noCode':
      'کد شما نخستین بار که این صفحه باز می‌شود ساخته می‌شود و همیشه همان می‌ماند. اگر هنوز نیست، صفحه را یک بار دوباره بارگذاری کنید.',
    'refer.msgNamed':
      '{name} شما را به AyahSpring دعوت کرده است. {percent} تخفیف برای نخستین دورهٔ شما: {link}',
    'refer.msgPlain':
      'شما به AyahSpring دعوت شده‌اید. {percent} تخفیف برای نخستین دورهٔ شما: {link}',
    'refer.rewardsHeading': 'پاداش‌هایی که گرفته‌اید',
    'refer.rewardCount': 'پاداش‌ها: {count}',
    'refer.noRewards':
      'هنوز چیزی نیست. پاداش وقتی اینجا می‌آید که کسی کد شما را به کار ببرد و پرداختش برسد.',
    'refer.rewardWorth': '{percent} تخفیف برای یک دوره',
    'refer.rwEarned': 'گرفته شد',
    'refer.rwReversed': 'پس گرفته شد: مبلغ خریدی که از آن آمده بود بازگردانده شد',
    'refer.rwOther': 'ثبت شده',
    'refer.rwFrom': 'از {date} قابل استفاده است',
    'refer.rwBy': 'تا {date} از آن استفاده کنید',
    'refer.rwUse': 'آن را در کادر کد در صفحهٔ پرداخت هر دوره‌ای که می‌خرید بنویسید.',
    'refer.invitedHeading': 'کسانی که دعوت کرده‌اید',
    'refer.invitedCount': 'افراد: {count}',
    'refer.nobodyInvited':
      'هنوز کسی نیست. افراد وقتی اینجا می‌آیند که کد شما را در خریدی به کار برده باشند.',
    'refer.pnPending': 'خریدی را آغاز کرد',
    'refer.pnBought': 'یک دوره خرید',
    'refer.pnRefunded': 'مبلغ خریدش بازگردانده شد',
    'refer.friend': 'یک دوست',
    'refer.onlyFirstName':
      'تنها نام کوچک نشان داده می‌شود. اینکه دیگری چه می‌آموزد و با چه کسی، چیزی نیست که چون او را دعوت کرده‌اید حق دیدنش را داشته باشید.',
    'refer.howHeading': 'چگونه کار می‌کند',
    'refer.how1':
      'شما پیوند را می‌فرستید. او آن را باز می‌کند و پیش از هر تصمیمی می‌بیند کد چه ارزشی دارد.',
    'refer.how2':
      'او هنگام خرید نخستین دوره‌اش آن را می‌نویسد، و تخفیف در رسیدی که نزدش می‌ماند دیده می‌شود.',
    'refer.how3':
      'وقتی پرداخت او برسد، کد پاداش شما ساخته می‌شود. پس از گذشتن مهلت بازپرداخت به کار می‌افتد و سپس این تعداد روز کار می‌کند: {days}. اگر مبلغش بازگردانده شود، پاداش پس گرفته می‌شود.',
    'refer.how4':
      'پاداش‌هایی که در دوازده ماه می‌توانید بگیرید: {max}. هر کدام تخفیفی معمولی برای سفارشی معمولی است، با رسیدی معمولی.',
    'refer.honesty':
      'هر دو پاداش تخفیف دوره‌اند نه پول. به هیچ‌کس چیزی پرداخت نمی‌شود، و برای همین دعوت از دوست به اطلاعات بانکی نیاز ندارد.',
    'refer.lnEyebrow': 'یک دعوت',
    'refer.lnBadTitle': 'این پیوند کار نمی‌کند',
    'refer.lnBadBody':
      'کدی که در آن است اشتباه نوشته شده یا هرگز وجود نداشته است. هیچ مبلغی برداشت نشد و در چیزی ثبت‌نام نشد. شما در این صفحه تنها یک بازدیدکننده‌اید.',
    'refer.lnOffTitle': 'دعوت‌ها اکنون باز نیستند',
    'refer.lnUnreadTitle': 'این دعوت اکنون خوانده نشد',
    'refer.lnStill': 'هیچ مبلغی برداشت نشد، و دوره‌ها همچنان اینجا هستند.',
    'refer.lnBrowse': 'دوره‌ها را ببینید',
    'refer.lnTitleNamed': '{name} شما را دعوت کرده است',
    'refer.lnTitlePlain': 'شما دعوت شده‌اید',
    'refer.lnWorth': 'کد او {percent} از نخستین دورهٔ شما در اینجا کم می‌کند.',
    'refer.lnNotMoney': 'این تخفیف دوره است نه پول، پس چیزی برای برداشت نیست.',
    'refer.lnCardHeading': 'دعوت شما',
    'refer.lnKeep': 'این کد را نگه دارید و دوره‌ها را ببینید',
    'refer.lnKept':
      'اگر از دکمه استفاده کنید، این مرورگر کد را به یاد می‌سپارد و در صفحهٔ پرداخت پر می‌کند. تعداد روزهایی که به یاد می‌ماند: {days}. خودتان هم می‌توانید آن را آنجا بنویسید.',
    'refer.lnAbout':
      'AyahSpring دین اسلام را به کودکان و بزرگسالان می‌آموزد، با آهنگی که با زندگی جور درمی‌آید. دوره‌ها پیش از انتشار بازبینی می‌شوند، و هر آموزگار را سکو می‌گمارد.',
  },
  'fa-af': {
    'refer.lede':
      'دوستی که تازه به اینجا آمده برای نخستین کورس خود تخفیف می‌گیرد، و شما برای کورس بعدی خود. هر دو تخفیف کورس است نه پول، پس چیزی برای برداشت نیست و به معلومات بانکی ضرورت نیست.',
    'refer.off':
      'دعوت از دوست فعلاً خاموش است، پس هنوز کدی برای دادن نیست. وقتی روشن شود، این صفحه کد شما و نتیجهٔ آن را نشان می‌دهد.',
    'refer.unread':
      'جزئیات دعوت فعلاً خوانده نشد. هیچ مبلغی گرفته نشد و هیچ کدی استفاده نشد. دوباره باز کردن صفحه بی‌خطر است.',
    'refer.terms':
      'دوست شما برای نخستین کورس خود {friend} تخفیف می‌گیرد. وقتی پرداخت او برسد، شما کدی با {you} تخفیف برای کورس بعدی خود می‌گیرید که پس از گذشتن مهلت بازپرداخت به کار می‌افتد.',
    'refer.copyLink': 'لینک دعوت را کاپی کنید',
    'refer.linkCopied': 'لینک کاپی شد',
    'refer.copyMessage': 'یک پیام را کاپی کنید',
    'refer.messageCopied': 'پیام کاپی شد',
    'refer.copyRefused':
      'این مرورگر اجازهٔ کاپی نداد. لینک در پایین نوشته شده و می‌توان آن را با دست انتخاب کرد.',
    'refer.noCode':
      'کد شما نخستین بار که این صفحه باز می‌شود ساخته می‌شود و همیشه همان می‌ماند. اگر هنوز نیست، صفحه را یک بار دوباره باز کنید.',
    'refer.msgNamed':
      '{name} شما را به AyahSpring دعوت کرده است. {percent} تخفیف برای نخستین کورس شما: {link}',
    'refer.msgPlain':
      'شما به AyahSpring دعوت شده‌اید. {percent} تخفیف برای نخستین کورس شما: {link}',
    'refer.rewardsHeading': 'پاداش‌هایی که گرفته‌اید',
    'refer.rewardCount': 'پاداش‌ها: {count}',
    'refer.noRewards':
      'هنوز چیزی نیست. پاداش وقتی اینجا می‌آید که کسی کد شما را استفاده کند و پرداختش برسد.',
    'refer.rewardWorth': '{percent} تخفیف برای یک کورس',
    'refer.rwEarned': 'گرفته شد',
    'refer.rwReversed': 'پس گرفته شد: مبلغ خریدی که از آن آمده بود بازگردانده شد',
    'refer.rwOther': 'ثبت شده',
    'refer.rwFrom': 'از {date} قابل استفاده است',
    'refer.rwBy': 'تا {date} از آن استفاده کنید',
    'refer.rwUse': 'آن را در خانهٔ کد در صفحهٔ پرداخت هر کورسی که می‌خرید بنویسید.',
    'refer.invitedHeading': 'کسانی که دعوت کرده‌اید',
    'refer.invitedCount': 'اشخاص: {count}',
    'refer.nobodyInvited':
      'هنوز کسی نیست. اشخاص وقتی اینجا می‌آیند که کد شما را در خریدی استفاده کرده باشند.',
    'refer.pnPending': 'خریدی را آغاز کرد',
    'refer.pnBought': 'یک کورس خرید',
    'refer.pnRefunded': 'مبلغ خریدش بازگردانده شد',
    'refer.friend': 'یک دوست',
    'refer.onlyFirstName':
      'تنها نام اول نشان داده می‌شود. اینکه دیگری چه می‌آموزد و با کی، چیزی نیست که چون او را دعوت کرده‌اید حق دیدنش را داشته باشید.',
    'refer.howHeading': 'چگونه کار می‌کند',
    'refer.how1':
      'شما لینک را می‌فرستید. او آن را باز می‌کند و پیش از هر تصمیمی می‌بیند کد چه ارزشی دارد.',
    'refer.how2':
      'او هنگام خرید نخستین کورس خود آن را می‌نویسد، و تخفیف در رسیدی که نزدش می‌ماند دیده می‌شود.',
    'refer.how3':
      'وقتی پرداخت او برسد، کد پاداش شما ساخته می‌شود. پس از گذشتن مهلت بازپرداخت به کار می‌افتد و سپس این تعداد روز کار می‌کند: {days}. اگر مبلغش بازگردانده شود، پاداش پس گرفته می‌شود.',
    'refer.how4':
      'پاداش‌هایی که در دوازده ماه می‌توانید بگیرید: {max}. هر کدام تخفیفی عادی برای فرمایشی عادی است، با رسیدی عادی.',
    'refer.honesty':
      'هر دو پاداش تخفیف کورس است نه پول. به هیچ‌کس چیزی پرداخت نمی‌شود، و برای همین دعوت از دوست به معلومات بانکی ضرورت ندارد.',
    'refer.lnEyebrow': 'یک دعوت',
    'refer.lnBadTitle': 'این لینک کار نمی‌کند',
    'refer.lnBadBody':
      'کدی که در آن است غلط نوشته شده یا هرگز وجود نداشته است. هیچ مبلغی گرفته نشد و در چیزی ثبت نام نشد. شما در این صفحه تنها یک بازدیدکننده هستید.',
    'refer.lnOffTitle': 'دعوت‌ها فعلاً باز نیستند',
    'refer.lnUnreadTitle': 'این دعوت فعلاً خوانده نشد',
    'refer.lnStill': 'هیچ مبلغی گرفته نشد، و کورس‌ها هنوز اینجا هستند.',
    'refer.lnBrowse': 'کورس‌ها را ببینید',
    'refer.lnTitleNamed': '{name} شما را دعوت کرده است',
    'refer.lnTitlePlain': 'شما دعوت شده‌اید',
    'refer.lnWorth': 'کد او {percent} از نخستین کورس شما در اینجا کم می‌کند.',
    'refer.lnNotMoney': 'این تخفیف کورس است نه پول، پس چیزی برای برداشت نیست.',
    'refer.lnCardHeading': 'دعوت شما',
    'refer.lnKeep': 'این کد را نگه دارید و کورس‌ها را ببینید',
    'refer.lnKept':
      'اگر از دکمه استفاده کنید، این مرورگر کد را به یاد می‌سپارد و در صفحهٔ پرداخت پر می‌کند. تعداد روزهایی که به یاد می‌ماند: {days}. خودتان هم می‌توانید آن را آنجا بنویسید.',
    'refer.lnAbout':
      'AyahSpring دین اسلام را به کودکان و بزرگسالان می‌آموزد، با سرعتی که با زندگی جور می‌آید. کورس‌ها پیش از نشر بازبینی می‌شوند، و هر استاد را پلتفرم تعیین می‌کند.',
  },
  tr: {
    'refer.lede':
      'Buraya yeni gelen bir arkadaşınız ilk kursunda indirim alır, siz de sonraki kursunuzda. İkisi de kurs indirimidir, para değildir; yani çekilecek bir şey yoktur ve banka bilgisi vermek gerekmez.',
    'refer.off':
      'Arkadaş davet etme şu anda kapalı, bu yüzden henüz verilecek bir kod yok. Açıldığında bu sayfa kodunuzu ve ondan ne çıktığını gösterir.',
    'refer.unread':
      'Davet bilgileri şu anda okunamadı. Hiçbir ücret alınmadı ve hiçbir kod kullanılmadı. Sayfayı yeniden yüklemek güvenlidir.',
    'refer.terms':
      'Arkadaşınız ilk kursunda {friend} indirim alır. Ödemesi ulaştığında siz de sonraki kursunuz için {you} indirimli bir kod alırsınız; bu kod iade süresi geçtikten sonra çalışmaya başlar.',
    'refer.copyLink': 'Davet bağlantısını kopyala',
    'refer.linkCopied': 'Bağlantı kopyalandı',
    'refer.copyMessage': 'Bir mesaj kopyala',
    'refer.messageCopied': 'Mesaj kopyalandı',
    'refer.copyRefused':
      'Bu tarayıcı kopyalamaya izin vermedi. Bağlantı aşağıda yazılı; elle seçilebilir.',
    'refer.noCode':
      'Kodunuz bu sayfa ilk açıldığında oluşturulur ve hep aynı kalır. Hâlâ yoksa sayfayı bir kez yeniden yükleyin.',
    'refer.msgNamed':
      '{name} sizi AyahSpring’e davet etti. İlk kursunuzda {percent} indirim: {link}',
    'refer.msgPlain': 'AyahSpring’e davet edildiniz. İlk kursunuzda {percent} indirim: {link}',
    'refer.rewardsHeading': 'Kazandığınız ödüller',
    'refer.rewardCount': 'Ödüller: {count}',
    'refer.noRewards':
      'Henüz bir şey yok. Biri kodunuzu kullanıp ödemesi ulaştığında ödül burada görünür.',
    'refer.rewardWorth': 'Bir kursta {percent} indirim',
    'refer.rwEarned': 'Kazanıldı',
    'refer.rwReversed': 'Geri alındı: kaynağı olan satın almanın ücreti iade edildi',
    'refer.rwOther': 'Kaydedildi',
    'refer.rwFrom': 'Şu tarihten itibaren kullanılabilir: {date}',
    'refer.rwBy': 'Şu tarihe kadar kullanın: {date}',
    'refer.rwUse': 'Satın aldığınız herhangi bir kursun ödeme sayfasındaki kod kutusuna yazın.',
    'refer.invitedHeading': 'Davet ettikleriniz',
    'refer.invitedCount': 'Kişi sayısı: {count}',
    'refer.nobodyInvited':
      'Henüz kimse yok. Kişiler, kodunuzu bir satın almada kullandıktan sonra burada görünür.',
    'refer.pnPending': 'Bir satın alma başlattı',
    'refer.pnBought': 'Bir kurs satın aldı',
    'refer.pnRefunded': 'Satın almasının ücreti iade edildi',
    'refer.friend': 'Bir arkadaş',
    'refer.onlyFirstName':
      'Yalnızca ad gösterilir. Başka birinin ne öğrendiğini ve kiminle öğrendiğini, onu davet ettiniz diye görme hakkınız olmaz.',
    'refer.howHeading': 'Nasıl işler',
    'refer.how1':
      'Bağlantıyı siz gönderirsiniz. Onlar açar ve bir karar vermeden önce kodun değerini görür.',
    'refer.how2':
      'İlk kurslarını satın alırken kodu yazarlar; indirim, kendilerinde kalan makbuzda görünür.',
    'refer.how3':
      'Ödemeleri ulaştığında ödül kodunuz oluşturulur. İade süresi geçtikten sonra çalışmaya başlar ve ardından şu kadar gün geçerlidir: {days}. Ücretleri iade edilirse ödül geri alınır.',
    'refer.how4':
      'On iki ayda kazanabileceğiniz ödül sayısı: {max}. Her biri sıradan bir siparişte, sıradan bir makbuzla verilen sıradan bir indirimdir.',
    'refer.honesty':
      'İki ödül de kurs indirimidir, para değildir. Kimseye ödeme yapılmaz; arkadaş davet etmek için banka bilgisi gerekmemesinin nedeni budur.',
    'refer.lnEyebrow': 'Bir davet',
    'refer.lnBadTitle': 'Bu bağlantı çalışmıyor',
    'refer.lnBadBody':
      'İçindeki kod yanlış yazılmış ya da hiç var olmamış. Hiçbir ücret alınmadı ve hiçbir şeye kaydolunmadı. Bu sayfada yalnızca bir ziyaretçisiniz.',
    'refer.lnOffTitle': 'Davetler şu anda açık değil',
    'refer.lnUnreadTitle': 'Bu davet şu anda okunamadı',
    'refer.lnStill': 'Hiçbir ücret alınmadı ve kurslar hâlâ burada.',
    'refer.lnBrowse': 'Kurslara göz atın',
    'refer.lnTitleNamed': '{name} sizi davet etti',
    'refer.lnTitlePlain': 'Davet edildiniz',
    'refer.lnWorth': 'Onun kodu buradaki ilk kursunuzda {percent} indirim sağlar.',
    'refer.lnNotMoney': 'Bu bir kurs indirimidir, para değildir; yani çekilecek bir şey yoktur.',
    'refer.lnCardHeading': 'Davetiniz',
    'refer.lnKeep': 'Bu kodu sakla ve göz at',
    'refer.lnKept':
      'Düğmeyi kullanırsanız bu tarayıcı kodu hatırlar ve ödeme sayfasında doldurur. Hatırlandığı gün sayısı: {days}. Oraya kendiniz de yazabilirsiniz.',
    'refer.lnAbout':
      'AyahSpring, İslam dinini çocuklara ve yetişkinlere hayatın akışına uyan bir hızda öğretir. Kurslar yayımlanmadan önce incelenir ve her öğretmeni platform atar.',
  },
  id: {
    'refer.lede':
      'Teman yang baru di sini mendapat diskon untuk kursus pertamanya, dan Anda mendapat diskon untuk kursus berikutnya. Keduanya diskon kursus, bukan uang, jadi tidak ada yang ditarik dan tidak perlu memberikan data rekening bank.',
    'refer.off':
      'Mengundang teman sedang dimatikan, jadi belum ada kode untuk diberikan. Saat dinyalakan, halaman ini menampilkan kode Anda dan hasilnya.',
    'refer.unread':
      'Rincian undangan tidak dapat dibaca saat ini. Tidak ada yang ditagih dan tidak ada kode yang terpakai. Memuat ulang aman.',
    'refer.terms':
      'Teman Anda mendapat diskon {friend} untuk kursus pertamanya. Saat pembayarannya masuk, Anda mendapat kode diskon {you} untuk kursus berikutnya, yang mulai berlaku setelah masa pengembalian dana lewat.',
    'refer.copyLink': 'Salin tautan undangan',
    'refer.linkCopied': 'Tautan disalin',
    'refer.copyMessage': 'Salin pesan',
    'refer.messageCopied': 'Pesan disalin',
    'refer.copyRefused':
      'Peramban ini tidak mengizinkan penyalinan. Tautan tertulis di bawah dan dapat dipilih secara manual.',
    'refer.noCode':
      'Kode Anda dibuat saat halaman ini pertama kali dibuka dan tetap sama selamanya. Jika masih belum ada, muat ulang halaman sekali.',
    'refer.msgNamed':
      '{name} mengundang Anda ke AyahSpring. Diskon {percent} untuk kursus pertama Anda: {link}',
    'refer.msgPlain':
      'Anda diundang ke AyahSpring. Diskon {percent} untuk kursus pertama Anda: {link}',
    'refer.rewardsHeading': 'Hadiah yang telah Anda peroleh',
    'refer.rewardCount': 'Hadiah: {count}',
    'refer.noRewards':
      'Belum ada. Hadiah muncul di sini setelah seseorang memakai kode Anda dan pembayarannya masuk.',
    'refer.rewardWorth': 'Diskon {percent} untuk satu kursus',
    'refer.rwEarned': 'Diperoleh',
    'refer.rwReversed': 'Ditarik: pembelian yang menjadi asalnya telah dikembalikan dananya',
    'refer.rwOther': 'Tercatat',
    'refer.rwFrom': 'Dapat dipakai mulai {date}',
    'refer.rwBy': 'Pakai sebelum {date}',
    'refer.rwUse': 'Ketik di kotak kode pada halaman pembayaran kursus mana pun yang Anda beli.',
    'refer.invitedHeading': 'Siapa yang Anda undang',
    'refer.invitedCount': 'Orang: {count}',
    'refer.nobodyInvited':
      'Belum ada. Orang muncul di sini setelah memakai kode Anda pada sebuah pembelian.',
    'refer.pnPending': 'Memulai pembelian',
    'refer.pnBought': 'Membeli kursus',
    'refer.pnRefunded': 'Pembeliannya dikembalikan dananya',
    'refer.friend': 'Seorang teman',
    'refer.onlyFirstName':
      'Hanya nama depan yang ditampilkan. Apa yang dipelajari orang lain, dan bersama siapa, bukan hak Anda untuk melihatnya hanya karena Anda mengundangnya.',
    'refer.howHeading': 'Cara kerjanya',
    'refer.how1':
      'Anda mengirim tautan. Mereka membukanya dan melihat nilai kode itu sebelum memutuskan apa pun.',
    'refer.how2':
      'Mereka mengetiknya saat membeli kursus pertama, dan diskonnya tampak pada tanda terima yang mereka simpan.',
    'refer.how3':
      'Saat pembayaran mereka masuk, kode hadiah Anda dibuat. Kode itu mulai berlaku setelah masa pengembalian dana lewat, lalu berlaku selama jumlah hari ini: {days}. Jika dana mereka dikembalikan, hadiahnya ditarik.',
    'refer.how4':
      'Hadiah yang dapat Anda peroleh dalam dua belas bulan: {max}. Masing-masing adalah diskon biasa untuk pesanan biasa, dengan tanda terima biasa.',
    'refer.honesty':
      'Kedua hadiah adalah diskon kursus, bukan uang. Tidak ada yang dibayarkan kepada siapa pun, itulah sebabnya mengundang teman tidak memerlukan data rekening bank.',
    'refer.lnEyebrow': 'Sebuah undangan',
    'refer.lnBadTitle': 'Tautan ini tidak berfungsi',
    'refer.lnBadBody':
      'Kode di dalamnya salah ketik atau tidak pernah ada. Tidak ada yang ditagih dan tidak ada pendaftaran apa pun. Anda hanya pengunjung di halaman ini.',
    'refer.lnOffTitle': 'Undangan sedang tidak dibuka',
    'refer.lnUnreadTitle': 'Undangan ini tidak dapat dibaca saat ini',
    'refer.lnStill': 'Tidak ada yang ditagih, dan kursus-kursusnya masih ada di sini.',
    'refer.lnBrowse': 'Lihat kursus',
    'refer.lnTitleNamed': '{name} mengundang Anda',
    'refer.lnTitlePlain': 'Anda diundang',
    'refer.lnWorth': 'Kodenya memberi diskon {percent} untuk kursus pertama Anda di sini.',
    'refer.lnNotMoney': 'Ini diskon kursus, bukan uang, jadi tidak ada yang ditarik.',
    'refer.lnCardHeading': 'Undangan Anda',
    'refer.lnKeep': 'Simpan kode ini dan lihat-lihat',
    'refer.lnKept':
      'Gunakan tombol itu, lalu peramban ini mengingat kodenya dan mengisikannya di halaman pembayaran. Jumlah hari kode diingat: {days}. Anda juga dapat mengetiknya sendiri di sana.',
    'refer.lnAbout':
      'AyahSpring mengajarkan agama Islam kepada anak-anak dan orang dewasa, dengan kecepatan yang sesuai dengan kehidupan sehari-hari. Kursus ditinjau sebelum diterbitkan, dan setiap pengajar ditunjuk oleh platform.',
  },
  ms: {
    'refer.lede':
      'Rakan yang baharu di sini mendapat diskaun untuk kursus pertamanya, dan anda mendapat diskaun untuk kursus seterusnya. Kedua-duanya diskaun kursus, bukan wang, jadi tiada apa-apa untuk dikeluarkan dan butiran bank tidak diperlukan.',
    'refer.off':
      'Menjemput rakan dimatikan buat masa ini, jadi belum ada kod untuk diberikan. Apabila dihidupkan, halaman ini menunjukkan kod anda dan hasilnya.',
    'refer.unread':
      'Butiran jemputan tidak dapat dibaca sekarang. Tiada caj dikenakan dan tiada kod digunakan. Memuat semula adalah selamat.',
    'refer.terms':
      'Rakan anda mendapat diskaun {friend} untuk kursus pertamanya. Apabila bayarannya tiba, anda mendapat kod diskaun {you} untuk kursus seterusnya, yang mula berfungsi selepas tempoh bayaran balik berlalu.',
    'refer.copyLink': 'Salin pautan jemputan',
    'refer.linkCopied': 'Pautan disalin',
    'refer.copyMessage': 'Salin mesej',
    'refer.messageCopied': 'Mesej disalin',
    'refer.copyRefused':
      'Pelayar ini tidak membenarkan penyalinan. Pautan ditulis di bawah dan boleh dipilih dengan tangan.',
    'refer.noCode':
      'Kod anda dibuat kali pertama halaman ini dibuka dan kekal sama selama-lamanya. Jika masih tiada, muat semula halaman sekali.',
    'refer.msgNamed':
      '{name} menjemput anda ke AyahSpring. Diskaun {percent} untuk kursus pertama anda: {link}',
    'refer.msgPlain':
      'Anda dijemput ke AyahSpring. Diskaun {percent} untuk kursus pertama anda: {link}',
    'refer.rewardsHeading': 'Ganjaran yang anda peroleh',
    'refer.rewardCount': 'Ganjaran: {count}',
    'refer.noRewards':
      'Belum ada. Ganjaran muncul di sini selepas seseorang menggunakan kod anda dan bayarannya tiba.',
    'refer.rewardWorth': 'Diskaun {percent} untuk satu kursus',
    'refer.rwEarned': 'Diperoleh',
    'refer.rwReversed': 'Ditarik balik: pembelian asalnya telah dibayar balik',
    'refer.rwOther': 'Direkodkan',
    'refer.rwFrom': 'Boleh digunakan mulai {date}',
    'refer.rwBy': 'Gunakan sebelum {date}',
    'refer.rwUse':
      'Taipkannya di kotak kod pada halaman pembayaran mana-mana kursus yang anda beli.',
    'refer.invitedHeading': 'Siapa yang anda jemput',
    'refer.invitedCount': 'Orang: {count}',
    'refer.nobodyInvited':
      'Belum ada sesiapa. Orang muncul di sini selepas menggunakan kod anda pada satu pembelian.',
    'refer.pnPending': 'Memulakan pembelian',
    'refer.pnBought': 'Membeli kursus',
    'refer.pnRefunded': 'Pembeliannya telah dibayar balik',
    'refer.friend': 'Seorang rakan',
    'refer.onlyFirstName':
      'Hanya nama pertama ditunjukkan. Apa yang dipelajari orang lain, dan bersama siapa, bukan hak anda untuk melihatnya hanya kerana anda menjemputnya.',
    'refer.howHeading': 'Cara ia berfungsi',
    'refer.how1':
      'Anda menghantar pautan. Mereka membukanya dan melihat nilai kod itu sebelum memutuskan apa-apa.',
    'refer.how2':
      'Mereka menaipnya semasa membeli kursus pertama, dan diskaun itu kelihatan pada resit yang mereka simpan.',
    'refer.how3':
      'Apabila bayaran mereka tiba, kod ganjaran anda dibuat. Kod itu mula berfungsi selepas tempoh bayaran balik berlalu, kemudian berfungsi selama bilangan hari ini: {days}. Jika mereka dibayar balik, ganjaran itu ditarik balik.',
    'refer.how4':
      'Ganjaran yang boleh anda peroleh dalam dua belas bulan: {max}. Setiap satu ialah diskaun biasa untuk pesanan biasa, dengan resit biasa.',
    'refer.honesty':
      'Kedua-dua ganjaran ialah diskaun kursus, bukan wang. Tiada apa-apa dibayar kepada sesiapa, sebab itulah menjemput rakan tidak memerlukan butiran bank.',
    'refer.lnEyebrow': 'Satu jemputan',
    'refer.lnBadTitle': 'Pautan ini tidak berfungsi',
    'refer.lnBadBody':
      'Kod di dalamnya tersalah taip atau tidak pernah wujud. Tiada caj dikenakan dan tiada pendaftaran dibuat. Anda hanya pelawat di halaman ini.',
    'refer.lnOffTitle': 'Jemputan tidak dibuka buat masa ini',
    'refer.lnUnreadTitle': 'Jemputan ini tidak dapat dibaca sekarang',
    'refer.lnStill': 'Tiada caj dikenakan, dan kursus-kursus masih ada di sini.',
    'refer.lnBrowse': 'Lihat kursus',
    'refer.lnTitleNamed': '{name} menjemput anda',
    'refer.lnTitlePlain': 'Anda dijemput',
    'refer.lnWorth': 'Kodnya memberi diskaun {percent} untuk kursus pertama anda di sini.',
    'refer.lnNotMoney': 'Ini diskaun kursus, bukan wang, jadi tiada apa-apa untuk dikeluarkan.',
    'refer.lnCardHeading': 'Jemputan anda',
    'refer.lnKeep': 'Simpan kod ini dan lihat-lihat',
    'refer.lnKept':
      'Gunakan butang itu dan pelayar ini mengingati kod tersebut serta mengisinya di halaman pembayaran. Bilangan hari kod diingati: {days}. Anda juga boleh menaipnya sendiri di sana.',
    'refer.lnAbout':
      'AyahSpring mengajar agama Islam kepada kanak-kanak dan orang dewasa, pada kadar yang sesuai dengan kehidupan. Kursus disemak sebelum diterbitkan, dan setiap guru dilantik oleh platform.',
  },
  bn: {
    'refer.lede':
      'এখানে নতুন কোনো বন্ধু তাঁর প্রথম কোর্সে ছাড় পান, আর আপনি পান আপনার পরের কোর্সে। দুটোই কোর্সের ছাড়, টাকা নয়, তাই তোলার কিছু নেই এবং ব্যাংকের তথ্য দিতে হয় না।',
    'refer.off':
      'বন্ধুকে আমন্ত্রণ জানানো এই মুহূর্তে বন্ধ আছে, তাই দেওয়ার মতো কোনো কোড এখনো নেই। চালু হলে এই পাতায় আপনার কোড এবং তার ফল দেখা যাবে।',
    'refer.unread':
      'আমন্ত্রণের বিবরণ এই মুহূর্তে পড়া যায়নি। কোনো টাকা কাটা হয়নি এবং কোনো কোড ব্যবহৃত হয়নি। পাতাটি আবার লোড করা নিরাপদ।',
    'refer.terms':
      'আপনার বন্ধু তাঁর প্রথম কোর্সে {friend} ছাড় পান। তাঁর পেমেন্ট পৌঁছালে আপনি আপনার পরের কোর্সের জন্য {you} ছাড়ের একটি কোড পান, যা ফেরতের সময়সীমা পার হওয়ার পর কাজ শুরু করে।',
    'refer.copyLink': 'আমন্ত্রণের লিংক কপি করুন',
    'refer.linkCopied': 'লিংক কপি হয়েছে',
    'refer.copyMessage': 'একটি বার্তা কপি করুন',
    'refer.messageCopied': 'বার্তা কপি হয়েছে',
    'refer.copyRefused':
      'এই ব্রাউজার কপি করতে দেয়নি। লিংকটি নিচে লেখা আছে, হাতে বেছে নেওয়া যায়।',
    'refer.noCode':
      'এই পাতা প্রথমবার খোলার সময় আপনার কোড তৈরি হয় এবং সবসময় একই থাকে। এখনো না থাকলে পাতাটি একবার আবার লোড করুন।',
    'refer.msgNamed':
      '{name} আপনাকে AyahSpring-এ আমন্ত্রণ জানিয়েছেন। আপনার প্রথম কোর্সে {percent} ছাড়: {link}',
    'refer.msgPlain':
      'আপনাকে AyahSpring-এ আমন্ত্রণ জানানো হয়েছে। আপনার প্রথম কোর্সে {percent} ছাড়: {link}',
    'refer.rewardsHeading': 'আপনি যে পুরস্কার পেয়েছেন',
    'refer.rewardCount': 'পুরস্কার: {count}',
    'refer.noRewards':
      'এখনো কিছু নেই। কেউ আপনার কোড ব্যবহার করলে এবং তাঁর পেমেন্ট পৌঁছালে পুরস্কার এখানে দেখা যায়।',
    'refer.rewardWorth': 'একটি কোর্সে {percent} ছাড়',
    'refer.rwEarned': 'পাওয়া গেছে',
    'refer.rwReversed':
      'ফিরিয়ে নেওয়া হয়েছে: যে কেনাকাটা থেকে এটি এসেছিল তার টাকা ফেরত দেওয়া হয়েছে',
    'refer.rwOther': 'নথিভুক্ত',
    'refer.rwFrom': '{date} থেকে ব্যবহার করা যাবে',
    'refer.rwBy': '{date}-এর আগে ব্যবহার করুন',
    'refer.rwUse': 'আপনি যে কোর্সই কিনুন, তার পেমেন্ট পাতার কোডের ঘরে এটি লিখুন।',
    'refer.invitedHeading': 'আপনি যাঁদের আমন্ত্রণ জানিয়েছেন',
    'refer.invitedCount': 'মানুষ: {count}',
    'refer.nobodyInvited':
      'এখনো কেউ নেই। কেউ কোনো কেনাকাটায় আপনার কোড ব্যবহার করলে তাঁকে এখানে দেখা যায়।',
    'refer.pnPending': 'একটি কেনাকাটা শুরু করেছেন',
    'refer.pnBought': 'একটি কোর্স কিনেছেন',
    'refer.pnRefunded': 'তাঁর কেনাকাটার টাকা ফেরত দেওয়া হয়েছে',
    'refer.friend': 'একজন বন্ধু',
    'refer.onlyFirstName':
      'শুধু নামের প্রথম অংশ দেখানো হয়। অন্য কেউ কী শেখেন এবং কার সঙ্গে, আপনি আমন্ত্রণ জানিয়েছেন বলেই তা দেখার অধিকার আপনার হয় না।',
    'refer.howHeading': 'এটি কীভাবে কাজ করে',
    'refer.how1': 'আপনি লিংক পাঠান। তাঁরা সেটি খোলেন এবং কিছু ঠিক করার আগে দেখেন কোডের মূল্য কত।',
    'refer.how2':
      'তাঁরা প্রথম কোর্স কেনার সময় কোডটি লেখেন, আর ছাড়টি তাঁদের কাছে থাকা রসিদে দেখা যায়।',
    'refer.how3':
      'তাঁদের পেমেন্ট পৌঁছালে আপনার পুরস্কারের কোড তৈরি হয়। ফেরতের সময়সীমা পার হওয়ার পর এটি কাজ শুরু করে এবং তারপর এত দিন কাজ করে: {days}। তাঁদের টাকা ফেরত দেওয়া হলে পুরস্কার ফিরিয়ে নেওয়া হয়।',
    'refer.how4':
      'বারো মাসে আপনি যতগুলো পুরস্কার পেতে পারেন: {max}। প্রতিটি একটি সাধারণ অর্ডারে সাধারণ ছাড়, সাধারণ রসিদসহ।',
    'refer.honesty':
      'দুটি পুরস্কারই কোর্সের ছাড়, টাকা নয়। কাউকে কিছু পরিশোধ করা হয় না, আর সে কারণেই বন্ধুকে আমন্ত্রণ জানাতে ব্যাংকের তথ্য লাগে না।',
    'refer.lnEyebrow': 'একটি আমন্ত্রণ',
    'refer.lnBadTitle': 'এই লিংক কাজ করে না',
    'refer.lnBadBody':
      'এর ভেতরের কোডটি ভুল লেখা হয়েছে অথবা কখনো ছিলই না। কোনো টাকা কাটা হয়নি এবং কিছুতে নিবন্ধন হয়নি। এই পাতায় আপনি কেবল একজন দর্শক।',
    'refer.lnOffTitle': 'আমন্ত্রণ এই মুহূর্তে খোলা নেই',
    'refer.lnUnreadTitle': 'এই আমন্ত্রণ এই মুহূর্তে পড়া যায়নি',
    'refer.lnStill': 'কোনো টাকা কাটা হয়নি, আর কোর্সগুলো এখনো এখানেই আছে।',
    'refer.lnBrowse': 'কোর্সগুলো দেখুন',
    'refer.lnTitleNamed': '{name} আপনাকে আমন্ত্রণ জানিয়েছেন',
    'refer.lnTitlePlain': 'আপনাকে আমন্ত্রণ জানানো হয়েছে',
    'refer.lnWorth': 'তাঁর কোড এখানে আপনার প্রথম কোর্সে {percent} ছাড় দেয়।',
    'refer.lnNotMoney': 'এটি কোর্সের ছাড়, টাকা নয়, তাই তোলার কিছু নেই।',
    'refer.lnCardHeading': 'আপনার আমন্ত্রণ',
    'refer.lnKeep': 'এই কোড রেখে কোর্স দেখুন',
    'refer.lnKept':
      'বোতামটি ব্যবহার করলে এই ব্রাউজার কোডটি মনে রাখে এবং পেমেন্ট পাতায় বসিয়ে দেয়। যত দিন মনে রাখা হয়: {days}। আপনি নিজেও সেখানে লিখতে পারেন।',
    'refer.lnAbout':
      'AyahSpring শিশু ও প্রাপ্তবয়স্কদের ইসলাম ধর্ম শেখায়, জীবনের সঙ্গে মানানসই গতিতে। প্রকাশের আগে কোর্স পর্যালোচনা করা হয়, আর প্রত্যেক শিক্ষককে প্ল্যাটফর্ম নিয়োগ দেয়।',
  },
  hi: {
    'refer.lede':
      'यहाँ नए आए मित्र को अपने पहले कोर्स पर छूट मिलती है, और आपको अपने अगले कोर्स पर। दोनों कोर्स पर छूट हैं, पैसा नहीं, इसलिए निकालने को कुछ नहीं है और बैंक का विवरण देना नहीं पड़ता।',
    'refer.off':
      'मित्र को आमंत्रित करना इस समय बंद है, इसलिए अभी देने के लिए कोई कोड नहीं है। चालू होने पर यह पृष्ठ आपका कोड और उसका परिणाम दिखाएगा।',
    'refer.unread':
      'आमंत्रण का विवरण अभी पढ़ा नहीं जा सका। कोई राशि नहीं ली गई और कोई कोड इस्तेमाल नहीं हुआ। पृष्ठ फिर से लोड करना सुरक्षित है।',
    'refer.terms':
      'आपके मित्र को अपने पहले कोर्स पर {friend} छूट मिलती है। उसका भुगतान पहुँचने पर आपको अपने अगले कोर्स के लिए {you} छूट का कोड मिलता है, जो रिफ़ंड की अवधि बीतने के बाद काम करना शुरू करता है।',
    'refer.copyLink': 'आमंत्रण लिंक कॉपी करें',
    'refer.linkCopied': 'लिंक कॉपी हो गया',
    'refer.copyMessage': 'संदेश कॉपी करें',
    'refer.messageCopied': 'संदेश कॉपी हो गया',
    'refer.copyRefused':
      'इस ब्राउज़र ने कॉपी करने की अनुमति नहीं दी। लिंक नीचे लिखा है और हाथ से चुना जा सकता है।',
    'refer.noCode':
      'आपका कोड इस पृष्ठ के पहली बार खुलने पर बनता है और हमेशा वही रहता है। अगर अब भी नहीं है, तो पृष्ठ एक बार फिर से लोड करें।',
    'refer.msgNamed':
      '{name} ने आपको AyahSpring पर आमंत्रित किया है। आपके पहले कोर्स पर {percent} छूट: {link}',
    'refer.msgPlain':
      'आपको AyahSpring पर आमंत्रित किया गया है। आपके पहले कोर्स पर {percent} छूट: {link}',
    'refer.rewardsHeading': 'आपके अर्जित पुरस्कार',
    'refer.rewardCount': 'पुरस्कार: {count}',
    'refer.noRewards':
      'अभी कुछ नहीं। जब कोई आपका कोड इस्तेमाल करता है और उसका भुगतान पहुँच जाता है, तब पुरस्कार यहाँ दिखता है।',
    'refer.rewardWorth': 'एक कोर्स पर {percent} छूट',
    'refer.rwEarned': 'अर्जित',
    'refer.rwReversed': 'वापस लिया गया: जिस ख़रीद से यह मिला था उसका रिफ़ंड हो गया',
    'refer.rwOther': 'दर्ज',
    'refer.rwFrom': '{date} से इस्तेमाल किया जा सकता है',
    'refer.rwBy': '{date} तक इस्तेमाल करें',
    'refer.rwUse':
      'आप जो भी कोर्स ख़रीद रहे हों, उसके भुगतान पृष्ठ पर कोड वाले खाने में इसे लिखें।',
    'refer.invitedHeading': 'आपने किसे आमंत्रित किया',
    'refer.invitedCount': 'लोग: {count}',
    'refer.nobodyInvited':
      'अभी कोई नहीं। लोग यहाँ तब दिखते हैं जब वे किसी ख़रीद पर आपका कोड इस्तेमाल कर लेते हैं।',
    'refer.pnPending': 'ख़रीद शुरू की',
    'refer.pnBought': 'एक कोर्स ख़रीदा',
    'refer.pnRefunded': 'उनकी ख़रीद का रिफ़ंड हो गया',
    'refer.friend': 'एक मित्र',
    'refer.onlyFirstName':
      'केवल पहला नाम दिखाया जाता है। कोई और क्या सीखता है और किसके साथ, यह देखना आपका अधिकार नहीं बन जाता केवल इसलिए कि आपने उसे आमंत्रित किया।',
    'refer.howHeading': 'यह कैसे काम करता है',
    'refer.how1':
      'आप लिंक भेजते हैं। वे उसे खोलते हैं और कुछ भी तय करने से पहले देखते हैं कि कोड का मूल्य क्या है।',
    'refer.how2':
      'वे अपना पहला कोर्स ख़रीदते समय इसे लिखते हैं, और छूट उस रसीद पर दिखती है जो उनके पास रहती है।',
    'refer.how3':
      'उनका भुगतान पहुँचने पर आपका पुरस्कार कोड बन जाता है। यह रिफ़ंड की अवधि बीतने के बाद काम करना शुरू करता है, और फिर इतने दिन चलता है: {days}। अगर उन्हें रिफ़ंड मिलता है, तो पुरस्कार वापस ले लिया जाता है।',
    'refer.how4':
      'बारह महीनों में आप इतने पुरस्कार अर्जित कर सकते हैं: {max}। हर एक साधारण ऑर्डर पर साधारण छूट है, साधारण रसीद के साथ।',
    'refer.honesty':
      'दोनों पुरस्कार कोर्स पर छूट हैं, पैसा नहीं। किसी को कुछ चुकाया नहीं जाता, इसी कारण मित्र को आमंत्रित करने के लिए बैंक का विवरण नहीं चाहिए।',
    'refer.lnEyebrow': 'एक आमंत्रण',
    'refer.lnBadTitle': 'यह लिंक काम नहीं करता',
    'refer.lnBadBody':
      'इसमें लिखा कोड ग़लत टाइप हुआ है या कभी था ही नहीं। कोई राशि नहीं ली गई और किसी चीज़ के लिए पंजीकरण नहीं हुआ। आप इस पृष्ठ पर केवल एक आगंतुक हैं।',
    'refer.lnOffTitle': 'आमंत्रण इस समय खुले नहीं हैं',
    'refer.lnUnreadTitle': 'यह आमंत्रण अभी पढ़ा नहीं जा सका',
    'refer.lnStill': 'कोई राशि नहीं ली गई, और कोर्स अब भी यहीं हैं।',
    'refer.lnBrowse': 'कोर्स देखें',
    'refer.lnTitleNamed': '{name} ने आपको आमंत्रित किया है',
    'refer.lnTitlePlain': 'आपको आमंत्रित किया गया है',
    'refer.lnWorth': 'उनका कोड यहाँ आपके पहले कोर्स पर {percent} छूट देता है।',
    'refer.lnNotMoney': 'यह कोर्स पर छूट है, पैसा नहीं, इसलिए निकालने को कुछ नहीं है।',
    'refer.lnCardHeading': 'आपका आमंत्रण',
    'refer.lnKeep': 'यह कोड रखें और कोर्स देखें',
    'refer.lnKept':
      'बटन इस्तेमाल करें तो यह ब्राउज़र कोड याद रखता है और भुगतान पृष्ठ पर भर देता है। इतने दिन याद रहता है: {days}। आप उसे वहाँ ख़ुद भी लिख सकते हैं।',
    'refer.lnAbout':
      'AyahSpring बच्चों और वयस्कों को इस्लाम धर्म सिखाता है, ऐसी गति से जो जीवन के साथ चल सके। कोर्स प्रकाशित होने से पहले जाँचे जाते हैं, और हर शिक्षक को प्लैटफ़ॉर्म नियुक्त करता है।',
  },
  fr: {
    'refer.lede':
      'Un ami qui découvre le site obtient une réduction sur son premier cours, et vous en obtenez une sur votre prochain cours. Ce sont des réductions sur un cours, pas de l’argent : il n’y a donc rien à retirer ni de coordonnées bancaires à donner.',
    'refer.off':
      'L’invitation d’amis est désactivée pour le moment, il n’y a donc pas encore de code à donner. Une fois activée, cette page affiche votre code et ce qu’il a apporté.',
    'refer.unread':
      'Les détails de l’invitation n’ont pas pu être lus pour le moment. Rien n’a été débité et aucun code n’a été utilisé. Vous pouvez recharger la page sans risque.',
    'refer.terms':
      'Votre ami obtient {friend} de réduction sur son premier cours. Quand son paiement arrive, vous recevez un code de {you} de réduction sur votre prochain cours, qui commence à fonctionner une fois le délai de remboursement passé.',
    'refer.copyLink': 'Copier le lien d’invitation',
    'refer.linkCopied': 'Lien copié',
    'refer.copyMessage': 'Copier un message',
    'refer.messageCopied': 'Message copié',
    'refer.copyRefused':
      'Ce navigateur n’a pas autorisé la copie. Le lien est écrit ci-dessous et peut être sélectionné à la main.',
    'refer.noCode':
      'Votre code est créé à la première ouverture de cette page et reste le même pour toujours. S’il manque encore, rechargez la page une fois.',
    'refer.msgNamed':
      '{name} vous invite sur AyahSpring. {percent} de réduction sur votre premier cours : {link}',
    'refer.msgPlain':
      'Vous avez une invitation sur AyahSpring. {percent} de réduction sur votre premier cours : {link}',
    'refer.rewardsHeading': 'Les récompenses que vous avez obtenues',
    'refer.rewardCount': 'Récompenses : {count}',
    'refer.noRewards':
      'Rien pour l’instant. Une récompense apparaît ici quand quelqu’un utilise votre code et que son paiement est arrivé.',
    'refer.rewardWorth': '{percent} de réduction sur un cours',
    'refer.rwEarned': 'Obtenue',
    'refer.rwReversed': 'Retirée : l’achat dont elle provenait a été remboursé',
    'refer.rwOther': 'Enregistré',
    'refer.rwFrom': 'Utilisable à partir du {date}',
    'refer.rwBy': 'À utiliser avant le {date}',
    'refer.rwUse':
      'Saisissez-le dans la case du code, sur la page de paiement de n’importe quel cours que vous achetez.',
    'refer.invitedHeading': 'Les personnes que vous avez invitées',
    'refer.invitedCount': 'Personnes : {count}',
    'refer.nobodyInvited':
      'Personne pour l’instant. Les personnes apparaissent ici après avoir utilisé votre code lors d’un achat.',
    'refer.pnPending': 'A commencé un achat',
    'refer.pnBought': 'A acheté un cours',
    'refer.pnRefunded': 'Son achat a été remboursé',
    'refer.friend': 'Un ami',
    'refer.onlyFirstName':
      'Seul un prénom est affiché. Ce qu’une autre personne apprend, et avec qui, ne vous regarde pas du seul fait que vous l’avez invitée.',
    'refer.howHeading': 'Comment cela fonctionne',
    'refer.how1':
      'Vous envoyez le lien. La personne l’ouvre et voit ce que vaut le code avant de décider quoi que ce soit.',
    'refer.how2':
      'Elle le saisit en achetant son premier cours, et la réduction figure sur le reçu qu’elle conserve.',
    'refer.how3':
      'Quand son paiement arrive, votre code de récompense est créé. Il commence à fonctionner une fois le délai de remboursement passé, puis fonctionne pendant ce nombre de jours : {days}. Si elle est remboursée, la récompense est retirée.',
    'refer.how4':
      'Récompenses que vous pouvez obtenir en douze mois : {max}. Chacune est une réduction ordinaire sur une commande ordinaire, avec un reçu ordinaire.',
    'refer.honesty':
      'Les deux récompenses sont des réductions sur un cours, pas de l’argent. Rien n’est versé à personne, et c’est pourquoi inviter un ami ne demande aucune coordonnée bancaire.',
    'refer.lnEyebrow': 'Une invitation',
    'refer.lnBadTitle': 'Ce lien ne fonctionne pas',
    'refer.lnBadBody':
      'Le code qu’il contient est mal saisi ou n’a jamais existé. Rien n’a été débité et aucune inscription n’a été faite. Vous n’êtes qu’un visiteur sur cette page.',
    'refer.lnOffTitle': 'Les invitations ne sont pas ouvertes pour le moment',
    'refer.lnUnreadTitle': 'Cette invitation n’a pas pu être lue pour le moment',
    'refer.lnStill': 'Rien n’a été débité, et les cours sont toujours là.',
    'refer.lnBrowse': 'Parcourir les cours',
    'refer.lnTitleNamed': '{name} vous invite',
    'refer.lnTitlePlain': 'Vous avez reçu une invitation',
    'refer.lnWorth': 'Son code retire {percent} du prix de votre premier cours ici.',
    'refer.lnNotMoney':
      'C’est une réduction sur le cours, pas de l’argent : il n’y a donc rien à retirer.',
    'refer.lnCardHeading': 'Votre invitation',
    'refer.lnKeep': 'Garder ce code et parcourir',
    'refer.lnKept':
      'Utilisez le bouton : ce navigateur retient le code et le remplit sur la page de paiement. Nombre de jours pendant lesquels il est retenu : {days}. Vous pouvez aussi le saisir vous-même.',
    'refer.lnAbout':
      'AyahSpring enseigne la religion musulmane aux enfants et aux adultes, à un rythme qui s’accorde avec la vie de chacun. Les cours sont relus avant d’être publiés, et chaque enseignant est nommé par la plateforme.',
  },
  es: {
    'refer.lede':
      'Un amigo que es nuevo aquí obtiene un descuento en su primer curso, y usted obtiene uno en el siguiente. Ambos son descuentos en un curso, no dinero, así que no hay nada que retirar ni datos bancarios que dar.',
    'refer.off':
      'Invitar a un amigo está desactivado por el momento, así que todavía no hay código que dar. Cuando se active, esta página mostrará su código y lo que resultó de él.',
    'refer.unread':
      'Los detalles de la invitación no se pudieron leer ahora. No se cobró nada y no se usó ningún código. Puede recargar la página sin riesgo.',
    'refer.terms':
      'Su amigo obtiene {friend} de descuento en su primer curso. Cuando llega su pago, usted recibe un código de {you} de descuento para su siguiente curso, que empieza a funcionar una vez pasado el plazo de reembolso.',
    'refer.copyLink': 'Copiar el enlace de invitación',
    'refer.linkCopied': 'Enlace copiado',
    'refer.copyMessage': 'Copiar un mensaje',
    'refer.messageCopied': 'Mensaje copiado',
    'refer.copyRefused':
      'Este navegador no permitió copiar. El enlace está escrito abajo y se puede seleccionar a mano.',
    'refer.noCode':
      'Su código se crea la primera vez que se abre esta página y es el mismo para siempre. Si todavía falta, recargue la página una vez.',
    'refer.msgNamed':
      '{name} le invita a AyahSpring. {percent} de descuento en su primer curso: {link}',
    'refer.msgPlain':
      'Tiene una invitación a AyahSpring. {percent} de descuento en su primer curso: {link}',
    'refer.rewardsHeading': 'Recompensas que ha obtenido',
    'refer.rewardCount': 'Recompensas: {count}',
    'refer.noRewards':
      'Nada todavía. Una recompensa aparece aquí cuando alguien usa su código y su pago ha llegado.',
    'refer.rewardWorth': '{percent} de descuento en un curso',
    'refer.rwEarned': 'Obtenida',
    'refer.rwReversed': 'Retirada: la compra de la que procedía fue reembolsada',
    'refer.rwOther': 'Registrado',
    'refer.rwFrom': 'Se puede usar a partir del {date}',
    'refer.rwBy': 'Úselo antes del {date}',
    'refer.rwUse':
      'Escríbalo en la casilla del código, en la página de pago de cualquier curso que compre.',
    'refer.invitedHeading': 'A quién ha invitado',
    'refer.invitedCount': 'Personas: {count}',
    'refer.nobodyInvited':
      'Nadie todavía. Las personas aparecen aquí después de usar su código en una compra.',
    'refer.pnPending': 'Empezó una compra',
    'refer.pnBought': 'Compró un curso',
    'refer.pnRefunded': 'Su compra fue reembolsada',
    'refer.friend': 'Un amigo',
    'refer.onlyFirstName':
      'Solo se muestra un nombre de pila. Lo que otra persona aprende, y con quién, no es algo que le corresponda ver por haberla invitado.',
    'refer.howHeading': 'Cómo funciona',
    'refer.how1':
      'Usted envía el enlace. La otra persona lo abre y ve lo que vale el código antes de decidir nada.',
    'refer.how2':
      'Lo escribe al comprar su primer curso, y el descuento figura en el recibo que conserva.',
    'refer.how3':
      'Cuando llega su pago, se crea el código de recompensa de usted. Empieza a funcionar una vez pasado el plazo de reembolso y después funciona durante este número de días: {days}. Si se le reembolsa, la recompensa se retira.',
    'refer.how4':
      'Recompensas que puede obtener en doce meses: {max}. Cada una es un descuento corriente en un pedido corriente, con un recibo corriente.',
    'refer.honesty':
      'Las dos recompensas son descuentos en un curso, no dinero. No se paga nada a nadie, y por eso invitar a un amigo no requiere datos bancarios.',
    'refer.lnEyebrow': 'Una invitación',
    'refer.lnBadTitle': 'Este enlace no funciona',
    'refer.lnBadBody':
      'El código que contiene está mal escrito o nunca existió. No se cobró nada y no se hizo ninguna inscripción. Usted es solo un visitante en esta página.',
    'refer.lnOffTitle': 'Las invitaciones no están abiertas por el momento',
    'refer.lnUnreadTitle': 'Esta invitación no se pudo leer ahora',
    'refer.lnStill': 'No se cobró nada, y los cursos siguen aquí.',
    'refer.lnBrowse': 'Ver los cursos',
    'refer.lnTitleNamed': '{name} le invita',
    'refer.lnTitlePlain': 'Ha recibido una invitación',
    'refer.lnWorth': 'Su código descuenta {percent} de su primer curso aquí.',
    'refer.lnNotMoney': 'Es un descuento en el curso, no dinero, así que no hay nada que retirar.',
    'refer.lnCardHeading': 'Su invitación',
    'refer.lnKeep': 'Guardar este código y ver los cursos',
    'refer.lnKept':
      'Use el botón y este navegador recordará el código y lo rellenará en la página de pago. Número de días que se recuerda: {days}. También puede escribirlo allí usted mismo.',
    'refer.lnAbout':
      'AyahSpring enseña la fe islámica a niños y adultos, a un ritmo que se ajusta a la vida de cada uno. Los cursos se revisan antes de publicarse, y a cada docente lo nombra la plataforma.',
  },
  pt: {
    'refer.lede':
      'Um amigo que seja novo aqui recebe um desconto no primeiro curso, e recebe um no seu próximo curso. Ambos são descontos num curso, não dinheiro, por isso não há nada a levantar nem dados bancários a indicar.',
    'refer.off':
      'Convidar um amigo está desativado de momento, por isso ainda não há código para dar. Quando for ativado, esta página mostra o seu código e o que resultou dele.',
    'refer.unread':
      'Não foi possível ler os detalhes do convite neste momento. Nada foi cobrado e nenhum código foi usado. Pode recarregar a página sem risco.',
    'refer.terms':
      'O seu amigo recebe {friend} de desconto no primeiro curso. Quando o pagamento dele chega, recebe um código de {you} de desconto para o seu próximo curso, que começa a funcionar depois de passado o prazo de reembolso.',
    'refer.copyLink': 'Copiar a ligação do convite',
    'refer.linkCopied': 'Ligação copiada',
    'refer.copyMessage': 'Copiar uma mensagem',
    'refer.messageCopied': 'Mensagem copiada',
    'refer.copyRefused':
      'Este navegador não permitiu copiar. A ligação está escrita abaixo e pode ser selecionada à mão.',
    'refer.noCode':
      'O seu código é criado na primeira vez que esta página é aberta e fica igual para sempre. Se ainda faltar, recarregue a página uma vez.',
    'refer.msgNamed':
      '{name} enviou-lhe um convite para o AyahSpring. {percent} de desconto no seu primeiro curso: {link}',
    'refer.msgPlain':
      'Tem um convite para o AyahSpring. {percent} de desconto no seu primeiro curso: {link}',
    'refer.rewardsHeading': 'Recompensas que obteve',
    'refer.rewardCount': 'Recompensas: {count}',
    'refer.noRewards':
      'Ainda nada. Uma recompensa aparece aqui quando alguém usa o seu código e o pagamento dessa pessoa chegou.',
    'refer.rewardWorth': '{percent} de desconto num curso',
    'refer.rwEarned': 'Obtida',
    'refer.rwReversed': 'Retirada: a compra de que provinha foi reembolsada',
    'refer.rwOther': 'Registado',
    'refer.rwFrom': 'Pode ser usado a partir de {date}',
    'refer.rwBy': 'Use-o antes de {date}',
    'refer.rwUse':
      'Escreva-o na caixa do código, na página de pagamento de qualquer curso que esteja a comprar.',
    'refer.invitedHeading': 'Quem convidou',
    'refer.invitedCount': 'Pessoas: {count}',
    'refer.nobodyInvited':
      'Ainda ninguém. As pessoas aparecem aqui depois de usarem o seu código numa compra.',
    'refer.pnPending': 'Começou uma compra',
    'refer.pnBought': 'Comprou um curso',
    'refer.pnRefunded': 'A compra dessa pessoa foi reembolsada',
    'refer.friend': 'Um amigo',
    'refer.onlyFirstName':
      'Só é mostrado um primeiro nome. O que outra pessoa aprende, e com quem, não lhe cabe ver só por a ter convidado.',
    'refer.howHeading': 'Como funciona',
    'refer.how1':
      'Envia a ligação. A outra pessoa abre-a e vê quanto vale o código antes de decidir seja o que for.',
    'refer.how2':
      'Escreve-o ao comprar o primeiro curso, e o desconto aparece no recibo que guarda.',
    'refer.how3':
      'Quando o pagamento dessa pessoa chega, o seu código de recompensa é criado. Começa a funcionar depois de passado o prazo de reembolso e funciona então durante este número de dias: {days}. Se ela for reembolsada, a recompensa é retirada.',
    'refer.how4':
      'Recompensas que pode obter em doze meses: {max}. Cada uma é um desconto normal numa encomenda normal, com um recibo normal.',
    'refer.honesty':
      'As duas recompensas são descontos num curso, não dinheiro. Nada é pago a ninguém, e é por isso que convidar um amigo não exige dados bancários.',
    'refer.lnEyebrow': 'Um convite',
    'refer.lnBadTitle': 'Esta ligação não funciona',
    'refer.lnBadBody':
      'O código que contém está mal escrito ou nunca existiu. Nada foi cobrado e não foi feita nenhuma inscrição. É apenas um visitante nesta página.',
    'refer.lnOffTitle': 'Os convites não estão abertos de momento',
    'refer.lnUnreadTitle': 'Não foi possível ler este convite neste momento',
    'refer.lnStill': 'Nada foi cobrado, e os cursos continuam aqui.',
    'refer.lnBrowse': 'Ver os cursos',
    'refer.lnTitleNamed': '{name} enviou-lhe um convite',
    'refer.lnTitlePlain': 'Recebeu um convite',
    'refer.lnWorth': 'O código dessa pessoa desconta {percent} no seu primeiro curso aqui.',
    'refer.lnNotMoney': 'É um desconto no curso, não dinheiro, por isso não há nada a levantar.',
    'refer.lnCardHeading': 'O seu convite',
    'refer.lnKeep': 'Guardar este código e ver os cursos',
    'refer.lnKept':
      'Use o botão e este navegador memoriza o código e preenche-o na página de pagamento. Número de dias em que fica memorizado: {days}. Também pode escrevê-lo lá.',
    'refer.lnAbout':
      'O AyahSpring ensina a fé islâmica a crianças e adultos, a um ritmo que se ajusta à vida de cada um. Os cursos são revistos antes de serem publicados, e cada professor é nomeado pela plataforma.',
  },
  sw: {
    'refer.lede':
      'Rafiki ambaye ni mgeni hapa hupata punguzo kwenye kozi yake ya kwanza, nawe hupata punguzo kwenye kozi yako inayofuata. Zote mbili ni punguzo za kozi, si pesa, kwa hiyo hakuna cha kutoa wala taarifa za benki za kutoa.',
    'refer.off':
      'Kumwalika rafiki kumezimwa kwa sasa, kwa hiyo bado hakuna msimbo wa kutoa. Kukiwashwa, ukurasa huu utaonyesha msimbo wako na kilichotokana nao.',
    'refer.unread':
      'Maelezo ya mwaliko hayakuweza kusomwa sasa hivi. Hakuna kilichotozwa na hakuna msimbo uliotumika. Ni salama kupakia upya.',
    'refer.terms':
      'Rafiki yako hupata punguzo la {friend} kwenye kozi yake ya kwanza. Malipo yake yakifika, unapata msimbo wa punguzo la {you} kwa kozi yako inayofuata, ambao huanza kufanya kazi baada ya muda wa kurejeshewa pesa kupita.',
    'refer.copyLink': 'Nakili kiungo cha mwaliko',
    'refer.linkCopied': 'Kiungo kimenakiliwa',
    'refer.copyMessage': 'Nakili ujumbe',
    'refer.messageCopied': 'Ujumbe umenakiliwa',
    'refer.copyRefused':
      'Kivinjari hiki hakikuruhusu kunakili. Kiungo kimeandikwa hapa chini na kinaweza kuchaguliwa kwa mkono.',
    'refer.noCode':
      'Msimbo wako hutengenezwa mara ya kwanza ukurasa huu unapofunguliwa na hubaki uleule daima. Kama bado haupo, pakia upya ukurasa mara moja.',
    'refer.msgNamed':
      '{name} amekualika AyahSpring. Punguzo la {percent} kwenye kozi yako ya kwanza: {link}',
    'refer.msgPlain':
      'Umealikwa AyahSpring. Punguzo la {percent} kwenye kozi yako ya kwanza: {link}',
    'refer.rewardsHeading': 'Zawadi ulizopata',
    'refer.rewardCount': 'Zawadi: {count}',
    'refer.noRewards':
      'Bado hakuna. Zawadi huonekana hapa mtu anapotumia msimbo wako na malipo yake kufika.',
    'refer.rewardWorth': 'Punguzo la {percent} kwenye kozi moja',
    'refer.rwEarned': 'Imepatikana',
    'refer.rwReversed': 'Imeondolewa: ununuzi uliotokana nao ulirejeshewa pesa',
    'refer.rwOther': 'Imerekodiwa',
    'refer.rwFrom': 'Inaweza kutumika kuanzia {date}',
    'refer.rwBy': 'Itumie kabla ya {date}',
    'refer.rwUse':
      'Uandike kwenye kisanduku cha msimbo katika ukurasa wa malipo wa kozi yoyote unayonunua.',
    'refer.invitedHeading': 'Uliowaalika',
    'refer.invitedCount': 'Watu: {count}',
    'refer.nobodyInvited':
      'Bado hakuna mtu. Watu huonekana hapa baada ya kutumia msimbo wako kwenye ununuzi.',
    'refer.pnPending': 'Alianza ununuzi',
    'refer.pnBought': 'Alinunua kozi',
    'refer.pnRefunded': 'Ununuzi wake ulirejeshewa pesa',
    'refer.friend': 'Rafiki',
    'refer.onlyFirstName':
      'Ni jina la kwanza tu linaloonyeshwa. Anachojifunza mtu mwingine, na pamoja na nani, si chako kuona kwa sababu tu ulimwalika.',
    'refer.howHeading': 'Jinsi inavyofanya kazi',
    'refer.how1': 'Unatuma kiungo. Wanakifungua na kuona thamani ya msimbo kabla ya kuamua lolote.',
    'refer.how2':
      'Wanauandika wanaponunua kozi yao ya kwanza, na punguzo linaonekana kwenye risiti wanayobaki nayo.',
    'refer.how3':
      'Malipo yao yakifika, msimbo wako wa zawadi hutengenezwa. Huanza kufanya kazi baada ya muda wa kurejeshewa pesa kupita, kisha hufanya kazi kwa idadi hii ya siku: {days}. Wakirejeshewa pesa, zawadi huondolewa.',
    'refer.how4':
      'Zawadi unazoweza kupata katika miezi kumi na miwili: {max}. Kila moja ni punguzo la kawaida kwenye oda ya kawaida, yenye risiti ya kawaida.',
    'refer.honesty':
      'Zawadi zote mbili ni punguzo za kozi, si pesa. Hakuna anayelipwa chochote, na ndiyo sababu kumwalika rafiki hakuhitaji taarifa za benki.',
    'refer.lnEyebrow': 'Mwaliko',
    'refer.lnBadTitle': 'Kiungo hiki hakifanyi kazi',
    'refer.lnBadBody':
      'Msimbo uliomo umeandikwa vibaya au haujawahi kuwepo. Hakuna kilichotozwa na hakuna usajili uliofanyika. Wewe ni mgeni tu kwenye ukurasa huu.',
    'refer.lnOffTitle': 'Mialiko haijafunguliwa kwa sasa',
    'refer.lnUnreadTitle': 'Mwaliko huu haukuweza kusomwa sasa hivi',
    'refer.lnStill': 'Hakuna kilichotozwa, na kozi bado zipo hapa.',
    'refer.lnBrowse': 'Tazama kozi',
    'refer.lnTitleNamed': '{name} amekualika',
    'refer.lnTitlePlain': 'Umealikwa',
    'refer.lnWorth': 'Msimbo wake unapunguza {percent} kwenye kozi yako ya kwanza hapa.',
    'refer.lnNotMoney': 'Ni punguzo la kozi, si pesa, kwa hiyo hakuna cha kutoa.',
    'refer.lnCardHeading': 'Mwaliko wako',
    'refer.lnKeep': 'Hifadhi msimbo huu na utazame kozi',
    'refer.lnKept':
      'Tumia kitufe, na kivinjari hiki kitakumbuka msimbo na kuujaza kwenye ukurasa wa malipo. Idadi ya siku unazokumbukwa: {days}. Unaweza pia kuuandika huko mwenyewe.',
    'refer.lnAbout':
      'AyahSpring hufundisha dini ya Kiislamu kwa watoto na watu wazima, kwa mwendo unaoendana na maisha. Kozi hukaguliwa kabla ya kuchapishwa, na kila mwalimu huteuliwa na jukwaa.',
  },
  af: {
    'refer.lede':
      '’n Vriend wat nuut hier is, kry afslag op sy of haar eerste kursus, en jy kry afslag op jou volgende een. Albei is afslag op ’n kursus, nie geld nie, so daar is niks om te onttrek nie en geen bankbesonderhede om te gee nie.',
    'refer.off':
      'Om ’n vriend te nooi is tans afgeskakel, so daar is nog nie ’n kode om te gee nie. Wanneer dit aangeskakel word, wys hierdie bladsy jou kode en wat daarvan gekom het.',
    'refer.unread':
      'Die besonderhede van die uitnodiging kon nie nou gelees word nie. Niks is gehef nie en geen kode is gebruik nie. Dit is veilig om te herlaai.',
    'refer.terms':
      'Jou vriend kry {friend} afslag op sy of haar eerste kursus. Wanneer daardie betaling aankom, kry jy ’n kode vir {you} afslag op jou volgende kursus, wat begin werk sodra die terugbetalingstydperk verby is.',
    'refer.copyLink': 'Kopieer die uitnodigingskakel',
    'refer.linkCopied': 'Skakel gekopieer',
    'refer.copyMessage': 'Kopieer ’n boodskap',
    'refer.messageCopied': 'Boodskap gekopieer',
    'refer.copyRefused':
      'Hierdie blaaier het nie kopiëring toegelaat nie. Die skakel staan hieronder en kan met die hand gekies word.',
    'refer.noCode':
      'Jou kode word gemaak die eerste keer dat hierdie bladsy oopgaan en bly vir altyd dieselfde. As dit nog ontbreek, herlaai die bladsy een keer.',
    'refer.msgNamed':
      '{name} nooi jou na AyahSpring. {percent} afslag op jou eerste kursus: {link}',
    'refer.msgPlain':
      'Jy het ’n uitnodiging na AyahSpring. {percent} afslag op jou eerste kursus: {link}',
    'refer.rewardsHeading': 'Belonings wat jy verdien het',
    'refer.rewardCount': 'Belonings: {count}',
    'refer.noRewards':
      'Nog niks nie. ’n Beloning verskyn hier sodra iemand jou kode gebruik en daardie betaling aangekom het.',
    'refer.rewardWorth': '{percent} afslag op ’n kursus',
    'refer.rwEarned': 'Verdien',
    'refer.rwReversed': 'Teruggetrek: die aankoop waaruit dit gekom het, is terugbetaal',
    'refer.rwOther': 'Aangeteken',
    'refer.rwFrom': 'Bruikbaar vanaf {date}',
    'refer.rwBy': 'Gebruik dit voor {date}',
    'refer.rwUse': 'Tik dit in die kodeblokkie op die betaalbladsy van enige kursus wat jy koop.',
    'refer.invitedHeading': 'Wie jy genooi het',
    'refer.invitedCount': 'Mense: {count}',
    'refer.nobodyInvited':
      'Nog niemand nie. Mense verskyn hier nadat hulle jou kode by ’n aankoop gebruik het.',
    'refer.pnPending': 'Het ’n aankoop begin',
    'refer.pnBought': 'Het ’n kursus gekoop',
    'refer.pnRefunded': 'Daardie aankoop is terugbetaal',
    'refer.friend': '’n Vriend',
    'refer.onlyFirstName':
      'Net ’n voornaam word gewys. Wat iemand anders leer, en saam met wie, is nie joune om te sien bloot omdat jy hulle genooi het nie.',
    'refer.howHeading': 'Hoe dit werk',
    'refer.how1':
      'Jy stuur die skakel. Hulle maak dit oop en sien wat die kode werd is voordat hulle enigiets besluit.',
    'refer.how2':
      'Hulle tik dit in wanneer hulle hul eerste kursus koop, en die afslag wys op die kwitansie wat hulle hou.',
    'refer.how3':
      'Wanneer hul betaling aankom, word jou beloningskode gemaak. Dit begin werk sodra die terugbetalingstydperk verby is, en werk dan vir hierdie getal dae: {days}. As hulle terugbetaal word, word die beloning teruggetrek.',
    'refer.how4':
      'Belonings wat jy in twaalf maande kan verdien: {max}. Elkeen is ’n gewone afslag op ’n gewone bestelling, met ’n gewone kwitansie.',
    'refer.honesty':
      'Albei belonings is afslag op ’n kursus, nie geld nie. Niks word aan enigiemand uitbetaal nie, en daarom het jy geen bankbesonderhede nodig om ’n vriend te nooi nie.',
    'refer.lnEyebrow': '’n Uitnodiging',
    'refer.lnBadTitle': 'Hierdie skakel werk nie',
    'refer.lnBadBody':
      'Die kode daarin is verkeerd getik of het nooit bestaan nie. Niks is gehef nie en daar is vir niks ingeskryf nie. Jy is net ’n besoeker op hierdie bladsy.',
    'refer.lnOffTitle': 'Uitnodigings is tans nie oop nie',
    'refer.lnUnreadTitle': 'Hierdie uitnodiging kon nie nou gelees word nie',
    'refer.lnStill': 'Niks is gehef nie, en die kursusse is steeds hier.',
    'refer.lnBrowse': 'Blaai deur die kursusse',
    'refer.lnTitleNamed': '{name} het jou genooi',
    'refer.lnTitlePlain': 'Jy is genooi',
    'refer.lnWorth': 'Hul kode neem {percent} af van jou eerste kursus hier.',
    'refer.lnNotMoney':
      'Dit is afslag op die kursus, nie geld nie, so daar is niks om te onttrek nie.',
    'refer.lnCardHeading': 'Jou uitnodiging',
    'refer.lnKeep': 'Hou hierdie kode en blaai',
    'refer.lnKept':
      'Gebruik die knoppie, dan onthou hierdie blaaier die kode en vul dit op die betaalbladsy in. Getal dae wat dit onthou word: {days}. Jy kan dit ook self daar tik.',
    'refer.lnAbout':
      'AyahSpring leer die Islamitiese geloof aan kinders en volwassenes, teen ’n pas wat by die lewe inpas. Kursusse word nagegaan voordat hulle gepubliseer word, en elke onderwyser word deur die platform aangestel.',
  },
  'zh-hans': {
    'refer.lede': '新来的朋友在第一门课程上享受折扣，你在下一门课程上也享受折扣。两者都是课程折扣而不是现金，因此没有可提取的款项，也不需要提供银行信息。',
    'refer.off': '邀请朋友目前已关闭，所以还没有可以给出的邀请码。开启后，本页会显示你的邀请码及其结果。',
    'refer.unread': '暂时无法读取邀请详情。没有扣款，也没有使用任何优惠码。可以放心重新加载。',
    'refer.terms': '你的朋友在第一门课程上享受 {friend} 的折扣。对方的付款到账后，你会得到一个用于下一门课程、折扣为 {you} 的优惠码，过了退款期之后开始生效。',
    'refer.copyLink': '复制邀请链接',
    'refer.linkCopied': '链接已复制',
    'refer.copyMessage': '复制一条消息',
    'refer.messageCopied': '消息已复制',
    'refer.copyRefused': '此浏览器不允许复制。链接写在下方，可以手动选取。',
    'refer.noCode': '你的邀请码在第一次打开本页时生成，并且永远不变。如果仍然没有，请重新加载一次页面。',
    'refer.msgNamed': '{name} 邀请你加入 AyahSpring。第一门课程享受 {percent} 的折扣：{link}',
    'refer.msgPlain': '你收到了 AyahSpring 的邀请。第一门课程享受 {percent} 的折扣：{link}',
    'refer.rewardsHeading': '你获得的奖励',
    'refer.rewardCount': '奖励：{count}',
    'refer.noRewards': '暂时没有。有人使用你的邀请码并且付款到账后，奖励会出现在这里。',
    'refer.rewardWorth': '一门课程享受 {percent} 的折扣',
    'refer.rwEarned': '已获得',
    'refer.rwReversed': '已撤回：带来这项奖励的购买已退款',
    'refer.rwOther': '已记录',
    'refer.rwFrom': '自 {date} 起可用',
    'refer.rwBy': '请在 {date} 之前使用',
    'refer.rwUse': '在你购买的任何课程的付款页面上，把它填入优惠码一栏。',
    'refer.invitedHeading': '你邀请的人',
    'refer.invitedCount': '人数：{count}',
    'refer.nobodyInvited': '暂时没有人。有人在购买时使用了你的邀请码之后，会出现在这里。',
    'refer.pnPending': '已开始购买',
    'refer.pnBought': '已购买一门课程',
    'refer.pnRefunded': '对方的购买已退款',
    'refer.friend': '一位朋友',
    'refer.onlyFirstName': '只显示名字的第一部分。别人学什么、跟谁学，并不因为你邀请了对方就可以让你看到。',
    'refer.howHeading': '如何运作',
    'refer.how1': '你发送链接。对方打开后，在做任何决定之前先看到这个邀请码值多少。',
    'refer.how2': '对方在购买第一门课程时填入邀请码，折扣会显示在对方保留的收据上。',
    'refer.how3': '对方的付款到账后，你的奖励优惠码就会生成。过了退款期之后开始生效，之后可使用的天数：{days}。如果对方获得退款，奖励会被撤回。',
    'refer.how4': '你在十二个月内最多可获得的奖励数：{max}。每一项都是普通订单上的普通折扣，并附普通收据。',
    'refer.honesty': '两项奖励都是课程折扣而不是现金。不会向任何人支付款项，所以邀请朋友不需要银行信息。',
    'refer.lnEyebrow': '一份邀请',
    'refer.lnBadTitle': '这个链接无效',
    'refer.lnBadBody': '链接中的邀请码输入有误，或者从未存在过。没有扣款，也没有注册任何内容。你只是本页的访客。',
    'refer.lnOffTitle': '目前未开放邀请',
    'refer.lnUnreadTitle': '暂时无法读取这份邀请',
    'refer.lnStill': '没有扣款，课程仍然在这里。',
    'refer.lnBrowse': '浏览课程',
    'refer.lnTitleNamed': '{name} 邀请了你',
    'refer.lnTitlePlain': '你收到了邀请',
    'refer.lnWorth': '对方的邀请码让你在这里的第一门课程享受 {percent} 的折扣。',
    'refer.lnNotMoney': '这是课程折扣而不是现金，因此没有可提取的款项。',
    'refer.lnCardHeading': '你的邀请',
    'refer.lnKeep': '保留这个邀请码并浏览课程',
    'refer.lnKept': '使用这个按钮，此浏览器会记住邀请码，并在付款页面自动填入。记住的天数：{days}。你也可以在那里自己输入。',
    'refer.lnAbout': 'AyahSpring 以适合生活节奏的进度，向儿童和成人教授伊斯兰信仰。课程在发布前经过审核，每位教师都由平台任命。',
  },
  'zh-hant': {
    'refer.lede': '新來的朋友在第一門課程上享有折扣，你在下一門課程上也享有折扣。兩者都是課程折扣而不是現金，因此沒有可提領的款項，也不需要提供銀行資料。',
    'refer.off': '邀請朋友目前已關閉，所以還沒有可以給出的邀請碼。開啟後，本頁會顯示你的邀請碼及其結果。',
    'refer.unread': '暫時無法讀取邀請詳情。沒有扣款，也沒有使用任何優惠碼。可以放心重新載入。',
    'refer.terms': '你的朋友在第一門課程上享有 {friend} 的折扣。對方的付款入帳後，你會得到一個用於下一門課程、折扣為 {you} 的優惠碼，過了退款期之後開始生效。',
    'refer.copyLink': '複製邀請連結',
    'refer.linkCopied': '連結已複製',
    'refer.copyMessage': '複製一則訊息',
    'refer.messageCopied': '訊息已複製',
    'refer.copyRefused': '此瀏覽器不允許複製。連結寫在下方，可以手動選取。',
    'refer.noCode': '你的邀請碼在第一次開啟本頁時產生，並且永遠不變。如果仍然沒有，請重新載入一次頁面。',
    'refer.msgNamed': '{name} 邀請你加入 AyahSpring。第一門課程享有 {percent} 的折扣：{link}',
    'refer.msgPlain': '你收到了 AyahSpring 的邀請。第一門課程享有 {percent} 的折扣：{link}',
    'refer.rewardsHeading': '你獲得的獎勵',
    'refer.rewardCount': '獎勵：{count}',
    'refer.noRewards': '暫時沒有。有人使用你的邀請碼並且付款入帳後，獎勵會出現在這裡。',
    'refer.rewardWorth': '一門課程享有 {percent} 的折扣',
    'refer.rwEarned': '已獲得',
    'refer.rwReversed': '已撤回：帶來這項獎勵的購買已退款',
    'refer.rwOther': '已記錄',
    'refer.rwFrom': '自 {date} 起可用',
    'refer.rwBy': '請在 {date} 之前使用',
    'refer.rwUse': '在你購買的任何課程的付款頁面上，把它填入優惠碼一欄。',
    'refer.invitedHeading': '你邀請的人',
    'refer.invitedCount': '人數：{count}',
    'refer.nobodyInvited': '暫時沒有人。有人在購買時使用了你的邀請碼之後，會出現在這裡。',
    'refer.pnPending': '已開始購買',
    'refer.pnBought': '已購買一門課程',
    'refer.pnRefunded': '對方的購買已退款',
    'refer.friend': '一位朋友',
    'refer.onlyFirstName': '只顯示名字的第一部分。別人學什麼、跟誰學，並不因為你邀請了對方就可以讓你看到。',
    'refer.howHeading': '如何運作',
    'refer.how1': '你傳送連結。對方開啟後，在做任何決定之前先看到這個邀請碼值多少。',
    'refer.how2': '對方在購買第一門課程時填入邀請碼，折扣會顯示在對方保留的收據上。',
    'refer.how3': '對方的付款入帳後，你的獎勵優惠碼就會產生。過了退款期之後開始生效，之後可使用的天數：{days}。如果對方獲得退款，獎勵會被撤回。',
    'refer.how4': '你在十二個月內最多可獲得的獎勵數：{max}。每一項都是普通訂單上的普通折扣，並附普通收據。',
    'refer.honesty': '兩項獎勵都是課程折扣而不是現金。不會向任何人支付款項，所以邀請朋友不需要銀行資料。',
    'refer.lnEyebrow': '一份邀請',
    'refer.lnBadTitle': '這個連結無效',
    'refer.lnBadBody': '連結中的邀請碼輸入有誤，或者從未存在過。沒有扣款，也沒有註冊任何內容。你只是本頁的訪客。',
    'refer.lnOffTitle': '目前未開放邀請',
    'refer.lnUnreadTitle': '暫時無法讀取這份邀請',
    'refer.lnStill': '沒有扣款，課程仍然在這裡。',
    'refer.lnBrowse': '瀏覽課程',
    'refer.lnTitleNamed': '{name} 邀請了你',
    'refer.lnTitlePlain': '你收到了邀請',
    'refer.lnWorth': '對方的邀請碼讓你在這裡的第一門課程享有 {percent} 的折扣。',
    'refer.lnNotMoney': '這是課程折扣而不是現金，因此沒有可提領的款項。',
    'refer.lnCardHeading': '你的邀請',
    'refer.lnKeep': '保留這個邀請碼並瀏覽課程',
    'refer.lnKept': '使用這個按鈕，此瀏覽器會記住邀請碼，並在付款頁面自動填入。記住的天數：{days}。你也可以在那裡自己輸入。',
    'refer.lnAbout': 'AyahSpring 以適合生活節奏的進度，向兒童和成人教授伊斯蘭信仰。課程在發布前經過審核，每位教師都由平台任命。',
  },
  vi: {
    'refer.lede':
      'Một người bạn mới đến đây được giảm giá cho khoá học đầu tiên, và bạn được giảm giá cho khoá tiếp theo. Cả hai đều là giảm giá khoá học, không phải tiền, nên không có gì để rút và không cần cung cấp thông tin ngân hàng.',
    'refer.off':
      'Việc mời bạn bè hiện đang tắt, nên chưa có mã nào để đưa. Khi được bật, trang này sẽ hiện mã của bạn và kết quả từ mã đó.',
    'refer.unread':
      'Hiện chưa đọc được chi tiết lời mời. Không có khoản nào bị tính và không có mã nào bị dùng. Tải lại trang là an toàn.',
    'refer.terms':
      'Bạn của bạn được giảm {friend} cho khoá học đầu tiên. Khi khoản thanh toán của họ đến, bạn nhận một mã giảm {you} cho khoá tiếp theo, mã này bắt đầu có hiệu lực sau khi hết thời hạn hoàn tiền.',
    'refer.copyLink': 'Sao chép đường dẫn mời',
    'refer.linkCopied': 'Đã sao chép đường dẫn',
    'refer.copyMessage': 'Sao chép một tin nhắn',
    'refer.messageCopied': 'Đã sao chép tin nhắn',
    'refer.copyRefused':
      'Trình duyệt này không cho phép sao chép. Đường dẫn được ghi bên dưới và có thể chọn bằng tay.',
    'refer.noCode':
      'Mã của bạn được tạo khi trang này mở lần đầu và giữ nguyên mãi mãi. Nếu vẫn chưa có, hãy tải lại trang một lần.',
    'refer.msgNamed':
      '{name} mời bạn đến AyahSpring. Giảm {percent} cho khoá học đầu tiên của bạn: {link}',
    'refer.msgPlain':
      'Bạn có một lời mời đến AyahSpring. Giảm {percent} cho khoá học đầu tiên của bạn: {link}',
    'refer.rewardsHeading': 'Phần thưởng bạn đã nhận',
    'refer.rewardCount': 'Phần thưởng: {count}',
    'refer.noRewards':
      'Chưa có gì. Phần thưởng hiện ở đây khi có người dùng mã của bạn và khoản thanh toán của họ đã đến.',
    'refer.rewardWorth': 'Giảm {percent} cho một khoá học',
    'refer.rwEarned': 'Đã nhận',
    'refer.rwReversed': 'Đã thu hồi: lần mua tạo ra nó đã được hoàn tiền',
    'refer.rwOther': 'Đã ghi nhận',
    'refer.rwFrom': 'Dùng được từ {date}',
    'refer.rwBy': 'Hãy dùng trước {date}',
    'refer.rwUse': 'Nhập mã vào ô mã trên trang thanh toán của bất kỳ khoá học nào bạn đang mua.',
    'refer.invitedHeading': 'Những người bạn đã mời',
    'refer.invitedCount': 'Số người: {count}',
    'refer.nobodyInvited':
      'Chưa có ai. Mọi người hiện ở đây sau khi họ dùng mã của bạn cho một lần mua.',
    'refer.pnPending': 'Đã bắt đầu một lần mua',
    'refer.pnBought': 'Đã mua một khoá học',
    'refer.pnRefunded': 'Lần mua của họ đã được hoàn tiền',
    'refer.friend': 'Một người bạn',
    'refer.onlyFirstName':
      'Chỉ hiện tên gọi. Người khác học gì và học với ai không phải là điều bạn được xem chỉ vì bạn đã mời họ.',
    'refer.howHeading': 'Cách hoạt động',
    'refer.how1':
      'Bạn gửi đường dẫn. Họ mở ra và thấy mã có giá trị bao nhiêu trước khi quyết định bất cứ điều gì.',
    'refer.how2':
      'Họ nhập mã khi mua khoá học đầu tiên, và khoản giảm giá hiện trên biên nhận họ giữ.',
    'refer.how3':
      'Khi khoản thanh toán của họ đến, mã thưởng của bạn được tạo. Mã bắt đầu có hiệu lực sau khi hết thời hạn hoàn tiền, rồi dùng được trong số ngày này: {days}. Nếu họ được hoàn tiền, phần thưởng bị thu hồi.',
    'refer.how4':
      'Số phần thưởng bạn có thể nhận trong mười hai tháng: {max}. Mỗi phần thưởng là một khoản giảm giá thông thường cho một đơn hàng thông thường, kèm biên nhận thông thường.',
    'refer.honesty':
      'Cả hai phần thưởng đều là giảm giá khoá học, không phải tiền. Không ai được chi trả gì, vì vậy mời bạn bè không cần thông tin ngân hàng.',
    'refer.lnEyebrow': 'Một lời mời',
    'refer.lnBadTitle': 'Đường dẫn này không hoạt động',
    'refer.lnBadBody':
      'Mã trong đường dẫn bị gõ sai hoặc chưa từng tồn tại. Không có khoản nào bị tính và không có gì được đăng ký. Bạn chỉ là khách ghé xem trang này.',
    'refer.lnOffTitle': 'Hiện chưa mở lời mời',
    'refer.lnUnreadTitle': 'Hiện chưa đọc được lời mời này',
    'refer.lnStill': 'Không có khoản nào bị tính, và các khoá học vẫn ở đây.',
    'refer.lnBrowse': 'Xem các khoá học',
    'refer.lnTitleNamed': '{name} đã mời bạn',
    'refer.lnTitlePlain': 'Bạn đã được mời',
    'refer.lnWorth': 'Mã của họ giảm {percent} cho khoá học đầu tiên của bạn ở đây.',
    'refer.lnNotMoney': 'Đây là giảm giá khoá học, không phải tiền, nên không có gì để rút.',
    'refer.lnCardHeading': 'Lời mời của bạn',
    'refer.lnKeep': 'Giữ mã này và xem các khoá học',
    'refer.lnKept':
      'Hãy dùng nút này, trình duyệt sẽ ghi nhớ mã và điền vào trang thanh toán. Số ngày mã được ghi nhớ: {days}. Bạn cũng có thể tự nhập mã ở đó.',
    'refer.lnAbout':
      'AyahSpring dạy đạo Hồi cho trẻ em và người lớn, theo nhịp độ phù hợp với cuộc sống. Các khoá học được duyệt trước khi xuất bản, và mỗi giáo viên đều do nền tảng bổ nhiệm.',
  },
  th: {
    'refer.lede':
      'เพื่อนที่เพิ่งมาใหม่จะได้ส่วนลดสำหรับหลักสูตรแรก และคุณจะได้ส่วนลดสำหรับหลักสูตรถัดไป ทั้งสองอย่างเป็นส่วนลดของหลักสูตร ไม่ใช่เงิน จึงไม่มีอะไรให้ถอนและไม่ต้องให้ข้อมูลธนาคาร',
    'refer.off':
      'การเชิญเพื่อนปิดอยู่ในขณะนี้ จึงยังไม่มีรหัสให้ เมื่อเปิดแล้ว หน้านี้จะแสดงรหัสของคุณและผลที่เกิดจากรหัสนั้น',
    'refer.unread':
      'ยังอ่านรายละเอียดคำเชิญไม่ได้ในขณะนี้ ไม่มีการเรียกเก็บเงินและไม่มีรหัสใดถูกใช้ โหลดหน้าใหม่ได้อย่างปลอดภัย',
    'refer.terms':
      'เพื่อนของคุณได้ส่วนลด {friend} สำหรับหลักสูตรแรก เมื่อการชำระเงินของเพื่อนมาถึง คุณจะได้รหัสส่วนลด {you} สำหรับหลักสูตรถัดไป ซึ่งเริ่มใช้ได้เมื่อพ้นช่วงขอคืนเงินแล้ว',
    'refer.copyLink': 'คัดลอกลิงก์คำเชิญ',
    'refer.linkCopied': 'คัดลอกลิงก์แล้ว',
    'refer.copyMessage': 'คัดลอกข้อความ',
    'refer.messageCopied': 'คัดลอกข้อความแล้ว',
    'refer.copyRefused':
      'เบราว์เซอร์นี้ไม่อนุญาตให้คัดลอก ลิงก์เขียนอยู่ด้านล่างและเลือกด้วยมือได้',
    'refer.noCode':
      'รหัสของคุณถูกสร้างเมื่อเปิดหน้านี้ครั้งแรกและคงเดิมตลอดไป หากยังไม่มี ให้โหลดหน้าใหม่หนึ่งครั้ง',
    'refer.msgNamed':
      '{name} เชิญคุณมาที่ AyahSpring ส่วนลด {percent} สำหรับหลักสูตรแรกของคุณ: {link}',
    'refer.msgPlain':
      'คุณได้รับคำเชิญมาที่ AyahSpring ส่วนลด {percent} สำหรับหลักสูตรแรกของคุณ: {link}',
    'refer.rewardsHeading': 'รางวัลที่คุณได้รับ',
    'refer.rewardCount': 'รางวัล: {count}',
    'refer.noRewards':
      'ยังไม่มี รางวัลจะปรากฏที่นี่เมื่อมีคนใช้รหัสของคุณและการชำระเงินของเขามาถึงแล้ว',
    'refer.rewardWorth': 'ส่วนลด {percent} สำหรับหนึ่งหลักสูตร',
    'refer.rwEarned': 'ได้รับแล้ว',
    'refer.rwReversed': 'ถูกเพิกถอน: การซื้อที่เป็นที่มาของรางวัลได้รับเงินคืนแล้ว',
    'refer.rwOther': 'บันทึกแล้ว',
    'refer.rwFrom': 'ใช้ได้ตั้งแต่ {date}',
    'refer.rwBy': 'ใช้ก่อน {date}',
    'refer.rwUse': 'พิมพ์รหัสในช่องรหัสบนหน้าชำระเงินของหลักสูตรใดก็ได้ที่คุณกำลังซื้อ',
    'refer.invitedHeading': 'คนที่คุณเชิญ',
    'refer.invitedCount': 'จำนวนคน: {count}',
    'refer.nobodyInvited': 'ยังไม่มีใคร ผู้คนจะปรากฏที่นี่หลังจากใช้รหัสของคุณในการซื้อ',
    'refer.pnPending': 'เริ่มการซื้อแล้ว',
    'refer.pnBought': 'ซื้อหลักสูตรแล้ว',
    'refer.pnRefunded': 'การซื้อของเขาได้รับเงินคืนแล้ว',
    'refer.friend': 'เพื่อนคนหนึ่ง',
    'refer.onlyFirstName':
      'แสดงเฉพาะชื่อต้นเท่านั้น สิ่งที่คนอื่นเรียนและเรียนกับใคร ไม่ใช่เรื่องที่คุณจะดูได้เพียงเพราะคุณเชิญเขามา',
    'refer.howHeading': 'วิธีการทำงาน',
    'refer.how1': 'คุณส่งลิงก์ เขาเปิดลิงก์และเห็นว่ารหัสมีค่าเท่าใดก่อนตัดสินใจสิ่งใด',
    'refer.how2': 'เขาพิมพ์รหัสขณะซื้อหลักสูตรแรก และส่วนลดจะแสดงในใบเสร็จที่เขาเก็บไว้',
    'refer.how3':
      'เมื่อการชำระเงินของเขามาถึง รหัสรางวัลของคุณจะถูกสร้าง รหัสเริ่มใช้ได้เมื่อพ้นช่วงขอคืนเงินแล้ว จากนั้นใช้ได้เป็นจำนวนวันดังนี้: {days} หากเขาได้รับเงินคืน รางวัลจะถูกเพิกถอน',
    'refer.how4':
      'จำนวนรางวัลที่คุณรับได้ในสิบสองเดือน: {max} แต่ละรางวัลเป็นส่วนลดปกติของคำสั่งซื้อปกติ พร้อมใบเสร็จปกติ',
    'refer.honesty':
      'รางวัลทั้งสองเป็นส่วนลดของหลักสูตร ไม่ใช่เงิน ไม่มีการจ่ายเงินให้ใคร การเชิญเพื่อนจึงไม่ต้องใช้ข้อมูลธนาคาร',
    'refer.lnEyebrow': 'คำเชิญ',
    'refer.lnBadTitle': 'ลิงก์นี้ใช้ไม่ได้',
    'refer.lnBadBody':
      'รหัสในลิงก์พิมพ์ผิดหรือไม่เคยมีอยู่จริง ไม่มีการเรียกเก็บเงินและไม่มีการสมัครสิ่งใด คุณเป็นเพียงผู้เข้าชมหน้านี้',
    'refer.lnOffTitle': 'ยังไม่เปิดรับคำเชิญในขณะนี้',
    'refer.lnUnreadTitle': 'ยังอ่านคำเชิญนี้ไม่ได้ในขณะนี้',
    'refer.lnStill': 'ไม่มีการเรียกเก็บเงิน และหลักสูตรยังอยู่ที่นี่',
    'refer.lnBrowse': 'ดูหลักสูตร',
    'refer.lnTitleNamed': '{name} เชิญคุณ',
    'refer.lnTitlePlain': 'คุณได้รับคำเชิญ',
    'refer.lnWorth': 'รหัสของเขาลด {percent} จากหลักสูตรแรกของคุณที่นี่',
    'refer.lnNotMoney': 'นี่เป็นส่วนลดของหลักสูตร ไม่ใช่เงิน จึงไม่มีอะไรให้ถอน',
    'refer.lnCardHeading': 'คำเชิญของคุณ',
    'refer.lnKeep': 'เก็บรหัสนี้ไว้แล้วดูหลักสูตร',
    'refer.lnKept':
      'ใช้ปุ่มนี้ แล้วเบราว์เซอร์นี้จะจำรหัสและกรอกให้ในหน้าชำระเงิน จำนวนวันที่จำไว้: {days} คุณพิมพ์รหัสที่นั่นเองก็ได้',
    'refer.lnAbout':
      'AyahSpring สอนศาสนาอิสลามแก่เด็กและผู้ใหญ่ ในจังหวะที่เข้ากับชีวิต หลักสูตรได้รับการตรวจทานก่อนเผยแพร่ และครูทุกคนได้รับการแต่งตั้งโดยแพลตฟอร์ม',
  },
  fil: {
    'refer.lede':
      'Ang kaibigang bago rito ay may diskuwento sa una niyang kurso, at may diskuwento ka sa susunod mong kurso. Parehong diskuwento sa kurso ang mga ito, hindi pera, kaya walang ilalabas at walang detalye ng bangko na kailangang ibigay.',
    'refer.off':
      'Nakapatay sa ngayon ang pag-imbita ng kaibigan, kaya wala pang code na maibibigay. Kapag binuksan ito, ipapakita ng pahinang ito ang code mo at ang kinalabasan nito.',
    'refer.unread':
      'Hindi mabasa sa ngayon ang mga detalye ng imbitasyon. Walang siningil at walang code na nagamit. Ligtas na i-reload ang pahina.',
    'refer.terms':
      'May {friend} na diskuwento ang kaibigan mo sa una niyang kurso. Kapag dumating ang bayad niya, makakakuha ka ng code na may {you} na diskuwento sa susunod mong kurso, na magsisimulang gumana kapag lumampas na ang palugit ng refund.',
    'refer.copyLink': 'Kopyahin ang link ng imbitasyon',
    'refer.linkCopied': 'Nakopya ang link',
    'refer.copyMessage': 'Kopyahin ang isang mensahe',
    'refer.messageCopied': 'Nakopya ang mensahe',
    'refer.copyRefused':
      'Hindi pinayagan ng browser na ito ang pagkopya. Nakasulat ang link sa ibaba at mapipili ito nang mano-mano.',
    'refer.noCode':
      'Ginagawa ang code mo sa unang pagbukas ng pahinang ito at hindi na ito nagbabago. Kung wala pa rin, i-reload ang pahina nang isang beses.',
    'refer.msgNamed':
      'Inimbitahan ka ni {name} sa AyahSpring. {percent} na diskuwento sa una mong kurso: {link}',
    'refer.msgPlain':
      'May imbitasyon ka sa AyahSpring. {percent} na diskuwento sa una mong kurso: {link}',
    'refer.rewardsHeading': 'Mga gantimpalang nakuha mo',
    'refer.rewardCount': 'Mga gantimpala: {count}',
    'refer.noRewards':
      'Wala pa. Lalabas dito ang gantimpala kapag may gumamit ng code mo at dumating na ang bayad niya.',
    'refer.rewardWorth': '{percent} na diskuwento sa isang kurso',
    'refer.rwEarned': 'Nakuha',
    'refer.rwReversed': 'Binawi: na-refund ang pagbiling pinagmulan nito',
    'refer.rwOther': 'Naitala',
    'refer.rwFrom': 'Magagamit simula {date}',
    'refer.rwBy': 'Gamitin bago ang {date}',
    'refer.rwUse':
      'I-type ito sa kahon ng code sa pahina ng pagbabayad ng alinmang kursong binibili mo.',
    'refer.invitedHeading': 'Mga inimbitahan mo',
    'refer.invitedCount': 'Mga tao: {count}',
    'refer.nobodyInvited':
      'Wala pa. Lalabas dito ang mga tao kapag nagamit na nila ang code mo sa isang pagbili.',
    'refer.pnPending': 'Nagsimula ng pagbili',
    'refer.pnBought': 'Bumili ng kurso',
    'refer.pnRefunded': 'Na-refund ang pagbili niya',
    'refer.friend': 'Isang kaibigan',
    'refer.onlyFirstName':
      'Unang pangalan lang ang ipinapakita. Ang pinag-aaralan ng iba, at kung sino ang kasama nila, ay hindi mo dapat makita dahil lang inimbitahan mo sila.',
    'refer.howHeading': 'Paano ito gumagana',
    'refer.how1':
      'Ipapadala mo ang link. Bubuksan nila ito at makikita ang halaga ng code bago sila magpasya ng anuman.',
    'refer.how2':
      'Ita-type nila ito habang binibili ang una nilang kurso, at makikita ang diskuwento sa resibong itatago nila.',
    'refer.how3':
      'Kapag dumating ang bayad nila, gagawin ang code ng gantimpala mo. Magsisimula itong gumana kapag lumampas na ang palugit ng refund, at gagana pagkatapos nang ganito karaming araw: {days}. Kapag na-refund sila, babawiin ang gantimpala.',
    'refer.how4':
      'Mga gantimpalang puwede mong makuha sa loob ng labindalawang buwan: {max}. Bawat isa ay karaniwang diskuwento sa karaniwang order, na may karaniwang resibo.',
    'refer.honesty':
      'Parehong diskuwento sa kurso ang dalawang gantimpala, hindi pera. Walang ibinabayad kaninuman, kaya hindi kailangan ng detalye ng bangko para mag-imbita ng kaibigan.',
    'refer.lnEyebrow': 'Isang imbitasyon',
    'refer.lnBadTitle': 'Hindi gumagana ang link na ito',
    'refer.lnBadBody':
      'Mali ang pagkaka-type ng code na nasa loob nito o hindi ito kailanman umiral. Walang siningil at walang pinagparehistruhan. Bisita ka lang sa pahinang ito.',
    'refer.lnOffTitle': 'Hindi bukas ang mga imbitasyon sa ngayon',
    'refer.lnUnreadTitle': 'Hindi mabasa sa ngayon ang imbitasyong ito',
    'refer.lnStill': 'Walang siningil, at narito pa rin ang mga kurso.',
    'refer.lnBrowse': 'Tingnan ang mga kurso',
    'refer.lnTitleNamed': 'Inimbitahan ka ni {name}',
    'refer.lnTitlePlain': 'Inimbitahan ka',
    'refer.lnWorth': 'Ang code niya ay nagbabawas ng {percent} sa una mong kurso rito.',
    'refer.lnNotMoney': 'Diskuwento ito sa kurso, hindi pera, kaya walang ilalabas.',
    'refer.lnCardHeading': 'Ang imbitasyon mo',
    'refer.lnKeep': 'Itago ang code na ito at tumingin-tingin',
    'refer.lnKept':
      'Gamitin ang button at tatandaan ng browser na ito ang code at ilalagay ito sa pahina ng pagbabayad. Bilang ng araw na tatandaan ito: {days}. Puwede mo rin itong i-type doon mismo.',
    'refer.lnAbout':
      'Itinuturo ng AyahSpring ang pananampalatayang Islam sa mga bata at matatanda, sa bilis na bumabagay sa buhay. Sinusuri ang mga kurso bago ilathala, at itinatalaga ng platform ang bawat guro.',
  },
  uz: {
    'refer.lede':
      'Bu yerga yangi kelgan doʻstingiz birinchi kursiga chegirma oladi, siz esa keyingi kursingizga. Ikkalasi ham pul emas, kurs chegirmasi, shuning uchun yechib olinadigan narsa yoʻq va bank maʼlumotlarini berish kerak emas.',
    'refer.off':
      'Doʻstni taklif qilish hozir oʻchirilgan, shuning uchun beriladigan kod hali yoʻq. Yoqilganda bu sahifa kodingizni va undan nima chiqqanini koʻrsatadi.',
    'refer.unread':
      'Taklif tafsilotlarini hozir oʻqib boʻlmadi. Hech qanday pul yechilmadi va hech qanday kod ishlatilmadi. Sahifani qayta yuklash xavfsiz.',
    'refer.terms':
      'Doʻstingiz birinchi kursiga {friend} chegirma oladi. Uning toʻlovi kelganda siz keyingi kursingiz uchun {you} chegirmali kod olasiz, u pulni qaytarish muddati oʻtgach ishlay boshlaydi.',
    'refer.copyLink': 'Taklif havolasidan nusxa olish',
    'refer.linkCopied': 'Havoladan nusxa olindi',
    'refer.copyMessage': 'Xabardan nusxa olish',
    'refer.messageCopied': 'Xabardan nusxa olindi',
    'refer.copyRefused':
      'Bu brauzer nusxa olishga ruxsat bermadi. Havola quyida yozilgan, uni qoʻlda belgilash mumkin.',
    'refer.noCode':
      'Kodingiz bu sahifa birinchi marta ochilganda yaratiladi va doim oʻsha boʻlib qoladi. Agar hali ham yoʻq boʻlsa, sahifani bir marta qayta yuklang.',
    'refer.msgNamed':
      '{name} sizni AyahSpringga taklif qildi. Birinchi kursingizga {percent} chegirma: {link}',
    'refer.msgPlain':
      'Siz AyahSpringga taklif qilindingiz. Birinchi kursingizga {percent} chegirma: {link}',
    'refer.rewardsHeading': 'Siz olgan mukofotlar',
    'refer.rewardCount': 'Mukofotlar: {count}',
    'refer.noRewards':
      'Hali hech narsa yoʻq. Kimdir kodingizdan foydalanib, toʻlovi kelganda mukofot shu yerda paydo boʻladi.',
    'refer.rewardWorth': 'Bitta kursga {percent} chegirma',
    'refer.rwEarned': 'Olingan',
    'refer.rwReversed': 'Qaytarib olindi: unga sabab boʻlgan xaridning puli qaytarildi',
    'refer.rwOther': 'Qayd etilgan',
    'refer.rwFrom': 'Shu sanadan ishlatish mumkin: {date}',
    'refer.rwBy': 'Shu sanagacha ishlating: {date}',
    'refer.rwUse':
      'Sotib olayotgan istalgan kursingizning toʻlov sahifasidagi kod katagiga yozing.',
    'refer.invitedHeading': 'Kimlarni taklif qilgansiz',
    'refer.invitedCount': 'Odamlar: {count}',
    'refer.nobodyInvited':
      'Hali hech kim yoʻq. Odamlar kodingizni xaridda ishlatganlaridan keyin shu yerda paydo boʻladi.',
    'refer.pnPending': 'Xaridni boshladi',
    'refer.pnBought': 'Kurs sotib oldi',
    'refer.pnRefunded': 'Xaridining puli qaytarildi',
    'refer.friend': 'Doʻst',
    'refer.onlyFirstName':
      'Faqat ism koʻrsatiladi. Boshqa birov nimani va kim bilan oʻrganayotganini uni taklif qilganingiz uchungina koʻrishga haqqingiz yoʻq.',
    'refer.howHeading': 'Bu qanday ishlaydi',
    'refer.how1':
      'Siz havolani yuborasiz. Ular uni ochib, biror qarorga kelishdan oldin kodning qiymatini koʻradi.',
    'refer.how2':
      'Ular birinchi kursini sotib olayotganda kodni yozadi va chegirma oʻzlarida qoladigan chekda koʻrinadi.',
    'refer.how3':
      'Ularning toʻlovi kelganda mukofot kodingiz yaratiladi. U pulni qaytarish muddati oʻtgach ishlay boshlaydi va keyin shuncha kun ishlaydi: {days}. Agar ularga pul qaytarilsa, mukofot qaytarib olinadi.',
    'refer.how4':
      'Oʻn ikki oyda olishingiz mumkin boʻlgan mukofotlar soni: {max}. Har biri oddiy buyurtmadagi oddiy chegirma, oddiy chek bilan.',
    'refer.honesty':
      'Ikkala mukofot ham pul emas, kurs chegirmasi. Hech kimga hech narsa toʻlanmaydi, shu sababli doʻstni taklif qilish uchun bank maʼlumotlari kerak emas.',
    'refer.lnEyebrow': 'Taklif',
    'refer.lnBadTitle': 'Bu havola ishlamaydi',
    'refer.lnBadBody':
      'Undagi kod xato yozilgan yoki hech qachon boʻlmagan. Hech qanday pul yechilmadi va hech narsaga yozilinmadi. Siz bu sahifada faqat mehmonsiz.',
    'refer.lnOffTitle': 'Takliflar hozir ochiq emas',
    'refer.lnUnreadTitle': 'Bu taklifni hozir oʻqib boʻlmadi',
    'refer.lnStill': 'Hech qanday pul yechilmadi va kurslar hali ham shu yerda.',
    'refer.lnBrowse': 'Kurslarni koʻrish',
    'refer.lnTitleNamed': '{name} sizni taklif qildi',
    'refer.lnTitlePlain': 'Siz taklif qilindingiz',
    'refer.lnWorth': 'Uning kodi bu yerdagi birinchi kursingizdan {percent} chegiradi.',
    'refer.lnNotMoney': 'Bu pul emas, kurs chegirmasi, shuning uchun yechib olinadigan narsa yoʻq.',
    'refer.lnCardHeading': 'Sizning taklifingiz',
    'refer.lnKeep': 'Bu kodni saqlab, kurslarni koʻrish',
    'refer.lnKept':
      'Tugmadan foydalansangiz, bu brauzer kodni eslab qoladi va toʻlov sahifasida toʻldiradi. Eslab qolinadigan kunlar soni: {days}. Uni oʻsha yerda oʻzingiz ham yozishingiz mumkin.',
    'refer.lnAbout':
      'AyahSpring bolalar va kattalarga islom dinini hayot bilan uygʻunlashadigan surʼatda oʻrgatadi. Kurslar eʼlon qilinishidan oldin koʻrib chiqiladi va har bir oʻqituvchini platforma tayinlaydi.',
  },
  kk: {
    'refer.lede':
      'Мұнда жаңадан келген досыңыз алғашқы курсына жеңілдік алады, ал сіз келесі курсыңызға аласыз. Екеуі де ақша емес, курсқа жеңілдік, сондықтан шығарып алатын ештеңе жоқ және банк деректерін берудің қажеті жоқ.',
    'refer.off':
      'Досты шақыру қазір өшірулі, сондықтан беретін код әлі жоқ. Қосылған кезде бұл бет кодыңызды және одан не шыққанын көрсетеді.',
    'refer.unread':
      'Шақыру мәліметтерін қазір оқу мүмкін болмады. Ешқандай ақша алынған жоқ және ешқандай код қолданылған жоқ. Бетті қайта жүктеу қауіпсіз.',
    'refer.terms':
      'Досыңыз алғашқы курсына {friend} жеңілдік алады. Оның төлемі келгенде сіз келесі курсыңызға {you} жеңілдік беретін код аласыз, ол ақшаны қайтару мерзімі өткен соң жұмыс істей бастайды.',
    'refer.copyLink': 'Шақыру сілтемесін көшіру',
    'refer.linkCopied': 'Сілтеме көшірілді',
    'refer.copyMessage': 'Хабарды көшіру',
    'refer.messageCopied': 'Хабар көшірілді',
    'refer.copyRefused':
      'Бұл браузер көшіруге рұқсат бермеді. Сілтеме төменде жазылған, оны қолмен белгілеуге болады.',
    'refer.noCode':
      'Кодыңыз бұл бет алғаш ашылғанда жасалады және әрдайым сол күйінде қалады. Әлі де жоқ болса, бетті бір рет қайта жүктеңіз.',
    'refer.msgNamed':
      '{name} сізді AyahSpring-ке шақырды. Алғашқы курсыңызға {percent} жеңілдік: {link}',
    'refer.msgPlain':
      'Сіз AyahSpring-ке шақырылдыңыз. Алғашқы курсыңызға {percent} жеңілдік: {link}',
    'refer.rewardsHeading': 'Сіз алған сыйақылар',
    'refer.rewardCount': 'Сыйақылар: {count}',
    'refer.noRewards':
      'Әзірге ештеңе жоқ. Біреу кодыңызды қолданып, төлемі келгенде сыйақы осы жерде пайда болады.',
    'refer.rewardWorth': 'Бір курсқа {percent} жеңілдік',
    'refer.rwEarned': 'Алынды',
    'refer.rwReversed': 'Қайтарып алынды: оған себеп болған сатып алудың ақшасы қайтарылды',
    'refer.rwOther': 'Тіркелген',
    'refer.rwFrom': 'Мына күннен бастап қолдануға болады: {date}',
    'refer.rwBy': 'Мына күнге дейін қолданыңыз: {date}',
    'refer.rwUse': 'Сатып алып жатқан кез келген курсыңыздың төлем бетіндегі код ұяшығына жазыңыз.',
    'refer.invitedHeading': 'Кімді шақырдыңыз',
    'refer.invitedCount': 'Адамдар: {count}',
    'refer.nobodyInvited':
      'Әзірге ешкім жоқ. Адамдар кодыңызды сатып алуда қолданғаннан кейін осы жерде пайда болады.',
    'refer.pnPending': 'Сатып алуды бастады',
    'refer.pnBought': 'Курс сатып алды',
    'refer.pnRefunded': 'Сатып алуының ақшасы қайтарылды',
    'refer.friend': 'Дос',
    'refer.onlyFirstName':
      'Тек есімі көрсетіледі. Басқа біреудің не үйреніп жатқанын және кіммен үйреніп жатқанын оны шақырғаныңыз үшін ғана көруге құқығыңыз жоқ.',
    'refer.howHeading': 'Бұл қалай жұмыс істейді',
    'refer.how1':
      'Сіз сілтемені жібересіз. Олар оны ашып, бір шешімге келмес бұрын кодтың құнын көреді.',
    'refer.how2':
      'Олар алғашқы курсын сатып алғанда кодты жазады, ал жеңілдік өздерінде қалатын түбіртекте көрінеді.',
    'refer.how3':
      'Олардың төлемі келгенде сыйақы кодыңыз жасалады. Ол ақшаны қайтару мерзімі өткен соң жұмыс істей бастайды, содан кейін осынша күн жұмыс істейді: {days}. Егер оларға ақша қайтарылса, сыйақы қайтарып алынады.',
    'refer.how4':
      'Он екі айда алуға болатын сыйақылар саны: {max}. Әрқайсысы қарапайым тапсырыстағы қарапайым жеңілдік, қарапайым түбіртегімен.',
    'refer.honesty':
      'Екі сыйақы да ақша емес, курсқа жеңілдік. Ешкімге ештеңе төленбейді, сондықтан досты шақыру үшін банк деректері қажет емес.',
    'refer.lnEyebrow': 'Шақыру',
    'refer.lnBadTitle': 'Бұл сілтеме жұмыс істемейді',
    'refer.lnBadBody':
      'Ондағы код қате жазылған немесе ешқашан болмаған. Ешқандай ақша алынған жоқ және ештеңеге тіркелген жоқсыз. Сіз бұл бетте тек қонақсыз.',
    'refer.lnOffTitle': 'Шақырулар қазір ашық емес',
    'refer.lnUnreadTitle': 'Бұл шақыруды қазір оқу мүмкін болмады',
    'refer.lnStill': 'Ешқандай ақша алынған жоқ, ал курстар әлі де осында.',
    'refer.lnBrowse': 'Курстарды қарау',
    'refer.lnTitleNamed': '{name} сізді шақырды',
    'refer.lnTitlePlain': 'Сіз шақырылдыңыз',
    'refer.lnWorth': 'Оның коды осындағы алғашқы курсыңыздан {percent} шегереді.',
    'refer.lnNotMoney': 'Бұл ақша емес, курсқа жеңілдік, сондықтан шығарып алатын ештеңе жоқ.',
    'refer.lnCardHeading': 'Сіздің шақыруыңыз',
    'refer.lnKeep': 'Бұл кодты сақтап, курстарды қарау',
    'refer.lnKept':
      'Түймені қолдансаңыз, бұл браузер кодты есте сақтап, төлем бетінде толтырады. Есте сақталатын күндер саны: {days}. Оны сол жерде өзіңіз де жаза аласыз.',
    'refer.lnAbout':
      'AyahSpring балалар мен ересектерге ислам дінін өмір ырғағына сай қарқынмен үйретеді. Курстар жарияланар алдында тексеріледі, ал әр мұғалімді платформа тағайындайды.',
  },
  az: {
    'refer.lede':
      'Buraya yeni gələn dostunuz ilk kursuna endirim alır, siz isə növbəti kursunuza. Hər ikisi pul deyil, kurs endirimidir, ona görə çıxarılacaq heç nə yoxdur və bank məlumatı vermək lazım deyil.',
    'refer.off':
      'Dostu dəvət etmək hazırda söndürülüb, ona görə hələ veriləcək kod yoxdur. Yandırılanda bu səhifə kodunuzu və ondan nə çıxdığını göstərəcək.',
    'refer.unread':
      'Dəvət təfərrüatlarını indi oxumaq mümkün olmadı. Heç bir məbləğ tutulmadı və heç bir kod istifadə olunmadı. Səhifəni yenidən yükləmək təhlükəsizdir.',
    'refer.terms':
      'Dostunuz ilk kursuna {friend} endirim alır. Onun ödənişi çatanda siz növbəti kursunuz üçün {you} endirimli kod alırsınız; bu kod geri qaytarma müddəti keçdikdən sonra işləməyə başlayır.',
    'refer.copyLink': 'Dəvət keçidini kopyala',
    'refer.linkCopied': 'Keçid kopyalandı',
    'refer.copyMessage': 'Mesajı kopyala',
    'refer.messageCopied': 'Mesaj kopyalandı',
    'refer.copyRefused':
      'Bu brauzer kopyalamağa icazə vermədi. Keçid aşağıda yazılıb və əl ilə seçilə bilər.',
    'refer.noCode':
      'Kodunuz bu səhifə ilk dəfə açılanda yaradılır və həmişə eyni qalır. Hələ də yoxdursa, səhifəni bir dəfə yenidən yükləyin.',
    'refer.msgNamed':
      '{name} sizi AyahSpring-ə dəvət etdi. İlk kursunuza {percent} endirim: {link}',
    'refer.msgPlain': 'Siz AyahSpring-ə dəvət olunmusunuz. İlk kursunuza {percent} endirim: {link}',
    'refer.rewardsHeading': 'Qazandığınız mükafatlar',
    'refer.rewardCount': 'Mükafatlar: {count}',
    'refer.noRewards':
      'Hələ heç nə yoxdur. Kimsə kodunuzdan istifadə edib ödənişi çatanda mükafat burada görünür.',
    'refer.rewardWorth': 'Bir kursa {percent} endirim',
    'refer.rwEarned': 'Qazanılıb',
    'refer.rwReversed': 'Geri götürüldü: ona səbəb olan alışın pulu qaytarıldı',
    'refer.rwOther': 'Qeyd olunub',
    'refer.rwFrom': 'Bu tarixdən istifadə etmək olar: {date}',
    'refer.rwBy': 'Bu tarixədək istifadə edin: {date}',
    'refer.rwUse': 'Aldığınız istənilən kursun ödəniş səhifəsindəki kod xanasına yazın.',
    'refer.invitedHeading': 'Kimləri dəvət etmisiniz',
    'refer.invitedCount': 'Adamlar: {count}',
    'refer.nobodyInvited':
      'Hələ heç kim yoxdur. Adamlar kodunuzdan bir alışda istifadə etdikdən sonra burada görünür.',
    'refer.pnPending': 'Alışa başladı',
    'refer.pnBought': 'Kurs aldı',
    'refer.pnRefunded': 'Alışının pulu qaytarıldı',
    'refer.friend': 'Bir dost',
    'refer.onlyFirstName':
      'Yalnız ad göstərilir. Başqasının nə öyrəndiyini və kiminlə öyrəndiyini onu dəvət etdiyinizə görə görmək haqqınız yoxdur.',
    'refer.howHeading': 'Bu necə işləyir',
    'refer.how1':
      'Siz keçidi göndərirsiniz. Onlar onu açır və nəyəsə qərar verməzdən əvvəl kodun dəyərini görürlər.',
    'refer.how2':
      'Onlar ilk kurslarını alarkən kodu yazırlar və endirim özlərində qalan qəbzdə görünür.',
    'refer.how3':
      'Onların ödənişi çatanda mükafat kodunuz yaradılır. O, geri qaytarma müddəti keçdikdən sonra işləməyə başlayır və sonra bu qədər gün işləyir: {days}. Onlara pul qaytarılarsa, mükafat geri götürülür.',
    'refer.how4':
      'On iki ayda qazana biləcəyiniz mükafatların sayı: {max}. Hər biri adi sifarişdə adi endirimdir, adi qəbzlə.',
    'refer.honesty':
      'Hər iki mükafat pul deyil, kurs endirimidir. Heç kimə heç nə ödənilmir, buna görə dostu dəvət etmək üçün bank məlumatı tələb olunmur.',
    'refer.lnEyebrow': 'Dəvət',
    'refer.lnBadTitle': 'Bu keçid işləmir',
    'refer.lnBadBody':
      'İçindəki kod səhv yazılıb və ya heç vaxt olmayıb. Heç bir məbləğ tutulmadı və heç nəyə qeydiyyat olunmadı. Siz bu səhifədə yalnız qonaqsınız.',
    'refer.lnOffTitle': 'Dəvətlər hazırda açıq deyil',
    'refer.lnUnreadTitle': 'Bu dəvəti indi oxumaq mümkün olmadı',
    'refer.lnStill': 'Heç bir məbləğ tutulmadı və kurslar hələ də buradadır.',
    'refer.lnBrowse': 'Kurslara baxın',
    'refer.lnTitleNamed': '{name} sizi dəvət etdi',
    'refer.lnTitlePlain': 'Siz dəvət olunmusunuz',
    'refer.lnWorth': 'Onun kodu buradakı ilk kursunuzdan {percent} endirir.',
    'refer.lnNotMoney': 'Bu pul deyil, kurs endirimidir, ona görə çıxarılacaq heç nə yoxdur.',
    'refer.lnCardHeading': 'Dəvətiniz',
    'refer.lnKeep': 'Bu kodu saxla və kurslara bax',
    'refer.lnKept':
      'Düymədən istifadə etsəniz, bu brauzer kodu yadda saxlayır və ödəniş səhifəsində doldurur. Yadda saxlanılan günlərin sayı: {days}. Onu orada özünüz də yaza bilərsiniz.',
    'refer.lnAbout':
      'AyahSpring uşaqlara və böyüklərə İslam dinini həyatın axarına uyğun sürətlə öyrədir. Kurslar dərc olunmazdan əvvəl yoxlanılır və hər müəllimi platforma təyin edir.',
  },
  tg: {
    'refer.lede':
      'Дӯсте, ки ба ин ҷо нав омадааст, барои курси аввалаш тахфиф мегирад ва шумо барои курси навбатии худ. Ҳар ду тахфифи курс аст, на пул, бинобар ин чизе барои гирифтан нест ва маълумоти бонкӣ додан лозим нест.',
    'refer.off':
      'Даъват кардани дӯст ҳоло хомӯш аст, бинобар ин ҳанӯз рамзе барои додан нест. Вақте ки фурӯзон мешавад, ин саҳифа рамзи шумо ва натиҷаи онро нишон медиҳад.',
    'refer.unread':
      'Ҷузъиёти даъватро ҳоло хондан муяссар нашуд. Ҳеҷ маблағе гирифта нашуд ва ҳеҷ рамзе истифода нашуд. Аз нав бор кардани саҳифа бехатар аст.',
    'refer.terms':
      'Дӯсти шумо барои курси аввалаш {friend} тахфиф мегирад. Вақте ки пардохти ӯ мерасад, шумо барои курси навбатии худ рамзи дорои {you} тахфиф мегиред, ки пас аз гузаштани мӯҳлати баргардонидани маблағ ба кор медарояд.',
    'refer.copyLink': 'Нусхабардории пайванди даъват',
    'refer.linkCopied': 'Пайванд нусхабардорӣ шуд',
    'refer.copyMessage': 'Нусхабардории паём',
    'refer.messageCopied': 'Паём нусхабардорӣ шуд',
    'refer.copyRefused':
      'Ин браузер ба нусхабардорӣ иҷозат надод. Пайванд дар поён навишта шудааст ва онро бо даст интихоб кардан мумкин аст.',
    'refer.noCode':
      'Рамзи шумо бори аввал, ки ин саҳифа кушода мешавад, сохта мешавад ва ҳамеша ҳамон мемонад. Агар ҳанӯз набошад, саҳифаро як бор аз нав бор кунед.',
    'refer.msgNamed':
      '{name} шуморо ба AyahSpring даъват кард. Барои курси аввали шумо {percent} тахфиф: {link}',
    'refer.msgPlain':
      'Шумо ба AyahSpring даъват шудаед. Барои курси аввали шумо {percent} тахфиф: {link}',
    'refer.rewardsHeading': 'Мукофотҳое, ки гирифтаед',
    'refer.rewardCount': 'Мукофотҳо: {count}',
    'refer.noRewards':
      'Ҳанӯз чизе нест. Мукофот ин ҷо вақте пайдо мешавад, ки касе рамзи шуморо истифода барад ва пардохташ расад.',
    'refer.rewardWorth': 'Барои як курс {percent} тахфиф',
    'refer.rwEarned': 'Гирифта шуд',
    'refer.rwReversed': 'Бозпас гирифта шуд: маблағи хариде, ки аз он омада буд, баргардонида шуд',
    'refer.rwOther': 'Сабт шудааст',
    'refer.rwFrom': 'Аз ин сана истифода бурдан мумкин аст: {date}',
    'refer.rwBy': 'То ин сана истифода баред: {date}',
    'refer.rwUse': 'Онро дар чорчӯбаи рамз дар саҳифаи пардохти ҳар курсе, ки мехаред, нависед.',
    'refer.invitedHeading': 'Киро даъват кардаед',
    'refer.invitedCount': 'Одамон: {count}',
    'refer.nobodyInvited':
      'Ҳанӯз ҳеҷ кас нест. Одамон ин ҷо пас аз он пайдо мешаванд, ки рамзи шуморо дар хариде истифода бурданд.',
    'refer.pnPending': 'Харидро оғоз кард',
    'refer.pnBought': 'Курс харид',
    'refer.pnRefunded': 'Маблағи харидаш баргардонида шуд',
    'refer.friend': 'Як дӯст',
    'refer.onlyFirstName':
      'Танҳо ном нишон дода мешавад. Он чи дигаре меомӯзад ва бо кӣ меомӯзад, танҳо барои он ки ӯро даъват кардаед, ба шумо барои дидан тааллуқ надорад.',
    'refer.howHeading': 'Ин чӣ гуна кор мекунад',
    'refer.how1':
      'Шумо пайвандро мефиристед. Онҳо онро мекушоянд ва пеш аз ҳар қароре мебинанд, ки рамз чӣ арзиш дорад.',
    'refer.how2':
      'Онҳо ҳангоми хариди курси аввали худ онро менависанд ва тахфиф дар расиде, ки дар дасташон мемонад, дида мешавад.',
    'refer.how3':
      'Вақте ки пардохти онҳо мерасад, рамзи мукофоти шумо сохта мешавад. Он пас аз гузаштани мӯҳлати баргардонидани маблағ ба кор медарояд ва сипас ин қадар рӯз кор мекунад: {days}. Агар маблағи онҳо баргардонида шавад, мукофот бозпас гирифта мешавад.',
    'refer.how4':
      'Шумораи мукофотҳое, ки дар дувоздаҳ моҳ гирифта метавонед: {max}. Ҳар яке тахфифи оддӣ барои фармоиши оддӣ аст, бо расиди оддӣ.',
    'refer.honesty':
      'Ҳар ду мукофот тахфифи курс аст, на пул. Ба ҳеҷ кас чизе пардохта намешавад, аз ин рӯ даъват кардани дӯст маълумоти бонкӣ талаб намекунад.',
    'refer.lnEyebrow': 'Даъват',
    'refer.lnBadTitle': 'Ин пайванд кор намекунад',
    'refer.lnBadBody':
      'Рамзи дар он буда хато навишта шудааст ё ҳеҷ гоҳ вуҷуд надошт. Ҳеҷ маблағе гирифта нашуд ва ба чизе номнавис нашудед. Шумо дар ин саҳифа танҳо меҳмонед.',
    'refer.lnOffTitle': 'Даъватҳо ҳоло кушода нестанд',
    'refer.lnUnreadTitle': 'Ин даъватро ҳоло хондан муяссар нашуд',
    'refer.lnStill': 'Ҳеҷ маблағе гирифта нашуд ва курсҳо ҳанӯз ин ҷо ҳастанд.',
    'refer.lnBrowse': 'Дидани курсҳо',
    'refer.lnTitleNamed': '{name} шуморо даъват кард',
    'refer.lnTitlePlain': 'Шумо даъват шудаед',
    'refer.lnWorth': 'Рамзи ӯ аз курси аввали шумо дар ин ҷо {percent} кам мекунад.',
    'refer.lnNotMoney': 'Ин тахфифи курс аст, на пул, бинобар ин чизе барои гирифтан нест.',
    'refer.lnCardHeading': 'Даъвати шумо',
    'refer.lnKeep': 'Ин рамзро нигоҳ доред ва курсҳоро бинед',
    'refer.lnKept':
      'Агар тугмаро истифода баред, ин браузер рамзро дар ёд медорад ва дар саҳифаи пардохт пур мекунад. Шумораи рӯзҳое, ки дар ёд мемонад: {days}. Онро дар он ҷо худатон ҳам навишта метавонед.',
    'refer.lnAbout':
      'AyahSpring ба кӯдакон ва калонсолон дини исломро бо суръате меомӯзонад, ки ба зиндагӣ мувофиқ аст. Курсҳо пеш аз нашр баррасӣ мешаванд ва ҳар муаллимро платформа таъин мекунад.',
  },
  ky: {
    'refer.lede':
      'Бул жерге жаңы келген досуңуз биринчи курсуна арзандатуу алат, ал эми сиз кийинки курсуңузга аласыз. Экөө тең акча эмес, курска арзандатуу, ошондуктан чыгарып ала турган эч нерсе жок жана банк маалыматын берүүнүн кереги жок.',
    'refer.off':
      'Досту чакыруу азыр өчүрүлгөн, ошондуктан бере турган код азырынча жок. Күйгүзүлгөндө бул барак кодуңузду жана андан эмне чыкканын көрсөтөт.',
    'refer.unread':
      'Чакыруунун чоо-жайын азыр окуу мүмкүн болгон жок. Эч кандай акча алынган жок жана эч бир код колдонулган жок. Баракты кайра жүктөө коопсуз.',
    'refer.terms':
      'Досуңуз биринчи курсуна {friend} арзандатуу алат. Анын төлөмү келгенде сиз кийинки курсуңузга {you} арзандатуу берген код аласыз, ал акчаны кайтаруу мөөнөтү өткөндөн кийин иштей баштайт.',
    'refer.copyLink': 'Чакыруу шилтемесин көчүрүү',
    'refer.linkCopied': 'Шилтеме көчүрүлдү',
    'refer.copyMessage': 'Билдирүүнү көчүрүү',
    'refer.messageCopied': 'Билдирүү көчүрүлдү',
    'refer.copyRefused':
      'Бул браузер көчүрүүгө уруксат берген жок. Шилтеме төмөндө жазылган, аны кол менен белгилөөгө болот.',
    'refer.noCode':
      'Кодуңуз бул барак биринчи жолу ачылганда түзүлөт жана дайыма ошол бойдон калат. Дагы эле жок болсо, баракты бир жолу кайра жүктөңүз.',
    'refer.msgNamed':
      '{name} сизди AyahSpring-ге чакырды. Биринчи курсуңузга {percent} арзандатуу: {link}',
    'refer.msgPlain':
      'Сиз AyahSpring-ге чакырылдыңыз. Биринчи курсуңузга {percent} арзандатуу: {link}',
    'refer.rewardsHeading': 'Сиз алган сыйлыктар',
    'refer.rewardCount': 'Сыйлыктар: {count}',
    'refer.noRewards':
      'Азырынча эч нерсе жок. Кимдир бирөө кодуңузду колдонуп, төлөмү келгенде сыйлык ушул жерде пайда болот.',
    'refer.rewardWorth': 'Бир курска {percent} арзандатуу',
    'refer.rwEarned': 'Алынды',
    'refer.rwReversed': 'Кайтарып алынды: ага себеп болгон сатып алуунун акчасы кайтарылды',
    'refer.rwOther': 'Катталган',
    'refer.rwFrom': 'Ушул күндөн тартып колдонууга болот: {date}',
    'refer.rwBy': 'Ушул күнгө чейин колдонуңуз: {date}',
    'refer.rwUse': 'Сатып алып жаткан каалаган курсуңуздун төлөм барагындагы код уячасына жазыңыз.',
    'refer.invitedHeading': 'Кимдерди чакырдыңыз',
    'refer.invitedCount': 'Адамдар: {count}',
    'refer.nobodyInvited':
      'Азырынча эч ким жок. Адамдар кодуңузду сатып алууда колдонгондон кийин ушул жерде пайда болот.',
    'refer.pnPending': 'Сатып алууну баштады',
    'refer.pnBought': 'Курс сатып алды',
    'refer.pnRefunded': 'Сатып алуусунун акчасы кайтарылды',
    'refer.friend': 'Дос',
    'refer.onlyFirstName':
      'Аты гана көрсөтүлөт. Башка бирөөнүн эмнени жана ким менен үйрөнүп жатканын аны чакырганыңыз үчүн эле көрүүгө укугуңуз жок.',
    'refer.howHeading': 'Бул кантип иштейт',
    'refer.how1':
      'Сиз шилтемени жибересиз. Алар аны ачып, бир чечимге келерден мурда коддун баасын көрүшөт.',
    'refer.how2':
      'Алар биринчи курсун сатып алып жатканда кодду жазышат, ал эми арзандатуу өздөрүндө кала турган дүмүрчөктө көрүнөт.',
    'refer.how3':
      'Алардын төлөмү келгенде сыйлык кодуңуз түзүлөт. Ал акчаны кайтаруу мөөнөтү өткөндөн кийин иштей баштайт, андан кийин ушунча күн иштейт: {days}. Эгер аларга акча кайтарылса, сыйлык кайтарып алынат.',
    'refer.how4':
      'Он эки айда ала турган сыйлыктарыңыздын саны: {max}. Ар бири кадимки буйрутмадагы кадимки арзандатуу, кадимки дүмүрчөгү менен.',
    'refer.honesty':
      'Эки сыйлык тең акча эмес, курска арзандатуу. Эч кимге эч нерсе төлөнбөйт, ошондуктан досту чакыруу үчүн банк маалыматы талап кылынбайт.',
    'refer.lnEyebrow': 'Чакыруу',
    'refer.lnBadTitle': 'Бул шилтеме иштебейт',
    'refer.lnBadBody':
      'Андагы код ката жазылган же эч качан болгон эмес. Эч кандай акча алынган жок жана эч нерсеге катталган жоксуз. Сиз бул баракта жөн гана коноксуз.',
    'refer.lnOffTitle': 'Чакыруулар азыр ачык эмес',
    'refer.lnUnreadTitle': 'Бул чакырууну азыр окуу мүмкүн болгон жок',
    'refer.lnStill': 'Эч кандай акча алынган жок, ал эми курстар дагы эле ушул жерде.',
    'refer.lnBrowse': 'Курстарды көрүү',
    'refer.lnTitleNamed': '{name} сизди чакырды',
    'refer.lnTitlePlain': 'Сиз чакырылдыңыз',
    'refer.lnWorth': 'Анын коду бул жердеги биринчи курсуңуздан {percent} кемитет.',
    'refer.lnNotMoney':
      'Бул акча эмес, курска арзандатуу, ошондуктан чыгарып ала турган эч нерсе жок.',
    'refer.lnCardHeading': 'Сиздин чакырууңуз',
    'refer.lnKeep': 'Бул кодду сактап, курстарды көрүү',
    'refer.lnKept':
      'Баскычты колдонсоңуз, бул браузер кодду эстеп калат жана төлөм барагында толтурат. Эсте сактала турган күндөрдүн саны: {days}. Аны ошол жерде өзүңүз да жаза аласыз.',
    'refer.lnAbout':
      'AyahSpring балдарга жана чоңдорго ислам динин жашоого ылайыктуу темп менен үйрөтөт. Курстар жарыяланар алдында текшерилет, ал эми ар бир мугалимди платформа дайындайт.',
  },
  tk: {
    'refer.lede':
      'Bu ýere täze gelen dostuňyz ilkinji kursuna arzanladyş alýar, siz bolsa indiki kursuňyza. Ikisi hem pul däl-de, kurs arzanladyşydyr, şonuň üçin çykaryp aljak zat ýok we bank maglumatlaryny bermek gerek däl.',
    'refer.off':
      'Dosty çagyrmak häzir öçürilen, şonuň üçin berjek kod entek ýok. Açylanda bu sahypa koduňyzy we ondan näme çykandygyny görkezer.',
    'refer.unread':
      'Çakylygyň jikme-jikliklerini häzir okap bolmady. Hiç hili pul alynmady we hiç bir kod ulanylmady. Sahypany täzeden ýüklemek howpsuz.',
    'refer.terms':
      'Dostuňyz ilkinji kursuna {friend} arzanladyş alýar. Onuň tölegi gelende siz indiki kursuňyz üçin {you} arzanladyşly kod alýarsyňyz, ol puly yzyna gaýtarmak möhleti geçenden soň işläp başlaýar.',
    'refer.copyLink': 'Çakylyk salgysyny göçürmek',
    'refer.linkCopied': 'Salgy göçürildi',
    'refer.copyMessage': 'Haty göçürmek',
    'refer.messageCopied': 'Hat göçürildi',
    'refer.copyRefused':
      'Bu brauzer göçürmäge rugsat bermedi. Salgy aşakda ýazylan, ony el bilen saýlap bolýar.',
    'refer.noCode':
      'Koduňyz bu sahypa ilkinji gezek açylanda döredilýär we hemişe şol durşuna galýar. Entek hem ýok bolsa, sahypany bir gezek täzeden ýükläň.',
    'refer.msgNamed':
      '{name} sizi AyahSpring-e çagyrdy. Ilkinji kursuňyza {percent} arzanladyş: {link}',
    'refer.msgPlain':
      'Siz AyahSpring-e çagyryldyňyz. Ilkinji kursuňyza {percent} arzanladyş: {link}',
    'refer.rewardsHeading': 'Gazanan sylaglaryňyz',
    'refer.rewardCount': 'Sylaglar: {count}',
    'refer.noRewards':
      'Entek zat ýok. Kimdir biri koduňyzy ulanyp, tölegi gelende sylag şu ýerde peýda bolýar.',
    'refer.rewardWorth': 'Bir kursa {percent} arzanladyş',
    'refer.rwEarned': 'Gazanyldy',
    'refer.rwReversed': 'Yzyna alyndy: oňa sebäp bolan satyn alşyň puly gaýtaryldy',
    'refer.rwOther': 'Bellige alnan',
    'refer.rwFrom': 'Şu seneden ulanyp bolýar: {date}',
    'refer.rwBy': 'Şu senä çenli ulanyň: {date}',
    'refer.rwUse': 'Satyn alýan islendik kursuňyzyň töleg sahypasyndaky kod öýjügine ýazyň.',
    'refer.invitedHeading': 'Kimleri çagyrdyňyz',
    'refer.invitedCount': 'Adamlar: {count}',
    'refer.nobodyInvited':
      'Entek hiç kim ýok. Adamlar koduňyzy satyn alyşda ulananlaryndan soň şu ýerde peýda bolýar.',
    'refer.pnPending': 'Satyn alşa başlady',
    'refer.pnBought': 'Kurs satyn aldy',
    'refer.pnRefunded': 'Satyn alşynyň puly gaýtaryldy',
    'refer.friend': 'Bir dost',
    'refer.onlyFirstName':
      'Diňe ady görkezilýär. Başga biriniň näme öwrenýändigini we kim bilen öwrenýändigini, ony çagyranyňyz üçin görmäge hakyňyz ýok.',
    'refer.howHeading': 'Bu nähili işleýär',
    'refer.how1':
      'Siz salgyny iberýärsiňiz. Olar ony açýarlar we bir karara gelmezden öň koduň gymmatyny görýärler.',
    'refer.how2':
      'Olar ilkinji kursuny satyn alanda kody ýazýarlar, arzanladyş bolsa özlerinde galýan kwitansiýada görünýär.',
    'refer.how3':
      'Olaryň tölegi gelende sylag koduňyz döredilýär. Ol puly yzyna gaýtarmak möhleti geçenden soň işläp başlaýar, soňra şunça gün işleýär: {days}. Eger olara pul gaýtarylsa, sylag yzyna alynýar.',
    'refer.how4':
      'On iki aýda gazanyp biljek sylaglaryňyzyň sany: {max}. Her biri adaty sargytdaky adaty arzanladyşdyr, adaty kwitansiýasy bilen.',
    'refer.honesty':
      'Iki sylag hem pul däl-de, kurs arzanladyşydyr. Hiç kime hiç zat tölenmeýär, şonuň üçin dosty çagyrmak üçin bank maglumatlary talap edilmeýär.',
    'refer.lnEyebrow': 'Çakylyk',
    'refer.lnBadTitle': 'Bu salgy işlemeýär',
    'refer.lnBadBody':
      'Ondaky kod ýalňyş ýazylan ýa-da hiç haçan bolmandyr. Hiç hili pul alynmady we hiç zada ýazylmadyňyz. Siz bu sahypada diňe myhman.',
    'refer.lnOffTitle': 'Çakylyklar häzir açyk däl',
    'refer.lnUnreadTitle': 'Bu çakylygy häzir okap bolmady',
    'refer.lnStill': 'Hiç hili pul alynmady, kurslar bolsa henizem şu ýerde.',
    'refer.lnBrowse': 'Kurslara göz aýlamak',
    'refer.lnTitleNamed': '{name} sizi çagyrdy',
    'refer.lnTitlePlain': 'Siz çagyryldyňyz',
    'refer.lnWorth': 'Onuň kody şu ýerdäki ilkinji kursuňyzdan {percent} aýyrýar.',
    'refer.lnNotMoney': 'Bu pul däl-de, kurs arzanladyşydyr, şonuň üçin çykaryp aljak zat ýok.',
    'refer.lnCardHeading': 'Siziň çakylygyňyz',
    'refer.lnKeep': 'Bu kody saklap, kurslara göz aýlamak',
    'refer.lnKept':
      'Düwmäni ulansaňyz, bu brauzer kody ýatda saklaýar we töleg sahypasynda doldurýar. Ýatda saklanýan günleriň sany: {days}. Ony şol ýerde özüňiz hem ýazyp bilersiňiz.',
    'refer.lnAbout':
      'AyahSpring çagalara we ululara yslam dinini durmuşa laýyk depginde öwredýär. Kurslar çap edilmezden öň gözden geçirilýär we her mugallymy platforma belleýär.',
  },
  ta: {
    'refer.lede':
      'இங்கே புதிதாக வரும் நண்பருக்கு அவரது முதல் பாடநெறியில் தள்ளுபடி கிடைக்கும்; உங்களுக்கு உங்கள் அடுத்த பாடநெறியில் கிடைக்கும். இரண்டும் பாடநெறித் தள்ளுபடிகளே, பணம் அல்ல; எனவே எடுக்க வேண்டியது எதுவும் இல்லை, வங்கி விவரங்களும் தேவையில்லை.',
    'refer.off':
      'நண்பரை அழைப்பது தற்போது நிறுத்தப்பட்டுள்ளது; எனவே கொடுக்க இன்னும் குறியீடு இல்லை. அது இயக்கப்படும்போது, இந்தப் பக்கம் உங்கள் குறியீட்டையும் அதன் விளைவையும் காட்டும்.',
    'refer.unread':
      'அழைப்பின் விவரங்களை இப்போது படிக்க முடியவில்லை. எந்தக் கட்டணமும் வசூலிக்கப்படவில்லை, எந்தக் குறியீடும் பயன்படுத்தப்படவில்லை. பக்கத்தை மீண்டும் ஏற்றுவது பாதுகாப்பானது.',
    'refer.terms':
      'உங்கள் நண்பருக்கு அவரது முதல் பாடநெறியில் {friend} தள்ளுபடி கிடைக்கும். அவரது கட்டணம் வந்து சேர்ந்ததும், உங்கள் அடுத்த பாடநெறிக்கு {you} தள்ளுபடி தரும் குறியீடு உங்களுக்குக் கிடைக்கும்; பணம் திரும்பப்பெறும் காலம் கடந்த பிறகு அது செயல்படத் தொடங்கும்.',
    'refer.copyLink': 'அழைப்பு இணைப்பை நகலெடு',
    'refer.linkCopied': 'இணைப்பு நகலெடுக்கப்பட்டது',
    'refer.copyMessage': 'ஒரு செய்தியை நகலெடு',
    'refer.messageCopied': 'செய்தி நகலெடுக்கப்பட்டது',
    'refer.copyRefused':
      'இந்த உலாவி நகலெடுக்க அனுமதிக்கவில்லை. இணைப்பு கீழே எழுதப்பட்டுள்ளது; அதைக் கையால் தேர்ந்தெடுக்கலாம்.',
    'refer.noCode':
      'இந்தப் பக்கம் முதன்முறை திறக்கப்படும்போது உங்கள் குறியீடு உருவாக்கப்படுகிறது; அது எப்போதும் அதுவாகவே இருக்கும். இன்னும் இல்லையெனில், பக்கத்தை ஒருமுறை மீண்டும் ஏற்றவும்.',
    'refer.msgNamed':
      '{name} உங்களை AyahSpring-க்கு அழைத்துள்ளார். உங்கள் முதல் பாடநெறியில் {percent} தள்ளுபடி: {link}',
    'refer.msgPlain':
      'உங்களுக்கு AyahSpring-க்கு அழைப்பு வந்துள்ளது. உங்கள் முதல் பாடநெறியில் {percent} தள்ளுபடி: {link}',
    'refer.rewardsHeading': 'நீங்கள் பெற்ற வெகுமதிகள்',
    'refer.rewardCount': 'வெகுமதிகள்: {count}',
    'refer.noRewards':
      'இன்னும் எதுவும் இல்லை. யாராவது உங்கள் குறியீட்டைப் பயன்படுத்தி, அவரது கட்டணம் வந்து சேர்ந்ததும் வெகுமதி இங்கே தோன்றும்.',
    'refer.rewardWorth': 'ஒரு பாடநெறியில் {percent} தள்ளுபடி',
    'refer.rwEarned': 'பெறப்பட்டது',
    'refer.rwReversed':
      'திரும்பப் பெறப்பட்டது: இதற்குக் காரணமான வாங்குதலுக்குப் பணம் திருப்பியளிக்கப்பட்டது',
    'refer.rwOther': 'பதிவு செய்யப்பட்டது',
    'refer.rwFrom': 'இந்தத் தேதியிலிருந்து பயன்படுத்தலாம்: {date}',
    'refer.rwBy': 'இந்தத் தேதிக்கு முன் பயன்படுத்தவும்: {date}',
    'refer.rwUse':
      'நீங்கள் வாங்கும் எந்தப் பாடநெறியின் கட்டணப் பக்கத்திலும் உள்ள குறியீட்டுப் பெட்டியில் இதைத் தட்டச்சிடவும்.',
    'refer.invitedHeading': 'நீங்கள் அழைத்தவர்கள்',
    'refer.invitedCount': 'நபர்கள்: {count}',
    'refer.nobodyInvited':
      'இன்னும் யாரும் இல்லை. ஒரு வாங்குதலில் உங்கள் குறியீட்டைப் பயன்படுத்திய பிறகு நபர்கள் இங்கே தோன்றுவார்கள்.',
    'refer.pnPending': 'வாங்குதலைத் தொடங்கினார்',
    'refer.pnBought': 'ஒரு பாடநெறியை வாங்கினார்',
    'refer.pnRefunded': 'அவரது வாங்குதலுக்குப் பணம் திருப்பியளிக்கப்பட்டது',
    'refer.friend': 'ஒரு நண்பர்',
    'refer.onlyFirstName':
      'முதல் பெயர் மட்டுமே காட்டப்படும். வேறொருவர் என்ன கற்கிறார், யாருடன் கற்கிறார் என்பதை, நீங்கள் அவரை அழைத்தீர்கள் என்பதற்காக மட்டும் பார்க்க உங்களுக்கு உரிமை இல்லை.',
    'refer.howHeading': 'இது எப்படிச் செயல்படுகிறது',
    'refer.how1':
      'நீங்கள் இணைப்பை அனுப்புகிறீர்கள். அவர்கள் அதைத் திறந்து, எதையும் முடிவு செய்வதற்கு முன் குறியீட்டின் மதிப்பைப் பார்க்கிறார்கள்.',
    'refer.how2':
      'அவர்கள் தங்கள் முதல் பாடநெறியை வாங்கும்போது அதைத் தட்டச்சிடுகிறார்கள்; தள்ளுபடி அவர்கள் வைத்திருக்கும் ரசீதில் தெரியும்.',
    'refer.how3':
      'அவர்களின் கட்டணம் வந்து சேர்ந்ததும் உங்கள் வெகுமதிக் குறியீடு உருவாக்கப்படும். பணம் திரும்பப்பெறும் காலம் கடந்த பிறகு அது செயல்படத் தொடங்கும்; அதன் பிறகு இத்தனை நாட்கள் செயல்படும்: {days}. அவர்களுக்குப் பணம் திருப்பியளிக்கப்பட்டால், வெகுமதி திரும்பப் பெறப்படும்.',
    'refer.how4':
      'பன்னிரண்டு மாதங்களில் நீங்கள் பெறக்கூடிய வெகுமதிகளின் எண்ணிக்கை: {max}. ஒவ்வொன்றும் சாதாரண ஆர்டரில் சாதாரண தள்ளுபடி, சாதாரண ரசீதுடன்.',
    'refer.honesty':
      'இரண்டு வெகுமதிகளும் பாடநெறித் தள்ளுபடிகளே, பணம் அல்ல. யாருக்கும் எதுவும் வழங்கப்படுவதில்லை; அதனால்தான் நண்பரை அழைக்க வங்கி விவரங்கள் தேவையில்லை.',
    'refer.lnEyebrow': 'ஓர் அழைப்பு',
    'refer.lnBadTitle': 'இந்த இணைப்பு செயல்படவில்லை',
    'refer.lnBadBody':
      'இதிலுள்ள குறியீடு தவறாகத் தட்டச்சிடப்பட்டுள்ளது அல்லது ஒருபோதும் இருந்ததில்லை. எந்தக் கட்டணமும் வசூலிக்கப்படவில்லை, எதற்கும் பதிவு செய்யப்படவில்லை. இந்தப் பக்கத்தில் நீங்கள் ஒரு பார்வையாளர் மட்டுமே.',
    'refer.lnOffTitle': 'அழைப்புகள் தற்போது திறக்கப்படவில்லை',
    'refer.lnUnreadTitle': 'இந்த அழைப்பை இப்போது படிக்க முடியவில்லை',
    'refer.lnStill': 'எந்தக் கட்டணமும் வசூலிக்கப்படவில்லை; பாடநெறிகள் இன்னும் இங்கேயே உள்ளன.',
    'refer.lnBrowse': 'பாடநெறிகளைப் பார்க்கவும்',
    'refer.lnTitleNamed': '{name} உங்களை அழைத்துள்ளார்',
    'refer.lnTitlePlain': 'உங்களுக்கு அழைப்பு வந்துள்ளது',
    'refer.lnWorth': 'அவரது குறியீடு இங்கே உங்கள் முதல் பாடநெறியில் {percent} குறைக்கிறது.',
    'refer.lnNotMoney': 'இது பாடநெறித் தள்ளுபடி, பணம் அல்ல; எனவே எடுக்க வேண்டியது எதுவும் இல்லை.',
    'refer.lnCardHeading': 'உங்கள் அழைப்பு',
    'refer.lnKeep': 'இந்தக் குறியீட்டை வைத்துக்கொண்டு பாடநெறிகளைப் பார்க்கவும்',
    'refer.lnKept':
      'பொத்தானைப் பயன்படுத்தினால், இந்த உலாவி குறியீட்டை நினைவில் வைத்து, கட்டணப் பக்கத்தில் நிரப்பும். நினைவில் வைக்கப்படும் நாட்களின் எண்ணிக்கை: {days}. நீங்களே அங்கே தட்டச்சிடவும் செய்யலாம்.',
    'refer.lnAbout':
      'AyahSpring குழந்தைகளுக்கும் பெரியவர்களுக்கும் இஸ்லாமிய மார்க்கத்தை, வாழ்க்கைக்குப் பொருந்தும் வேகத்தில் கற்பிக்கிறது. பாடநெறிகள் வெளியிடப்படுவதற்கு முன் மதிப்பாய்வு செய்யப்படுகின்றன; ஒவ்வொரு ஆசிரியரையும் தளமே நியமிக்கிறது.',
  },
  ne: {
    'refer.lede':
      'यहाँ नयाँ आएको साथीले आफ्नो पहिलो कोर्समा छुट पाउँछ, र तपाईंले आफ्नो अर्को कोर्समा पाउनुहुन्छ। दुवै कोर्सको छुट हुन्, पैसा होइन, त्यसैले निकाल्नुपर्ने केही छैन र बैंक विवरण दिनु पर्दैन।',
    'refer.off':
      'साथीलाई निम्तो दिने सुविधा अहिले बन्द छ, त्यसैले दिनका लागि अझै कोड छैन। खुला भएपछि यो पृष्ठले तपाईंको कोड र त्यसको नतिजा देखाउँछ।',
    'refer.unread':
      'निम्तोको विवरण अहिले पढ्न सकिएन। कुनै रकम काटिएको छैन र कुनै कोड प्रयोग भएको छैन। पृष्ठ फेरि लोड गर्नु सुरक्षित छ।',
    'refer.terms':
      'तपाईंको साथीले आफ्नो पहिलो कोर्समा {friend} छुट पाउँछ। उसको भुक्तानी आइपुगेपछि तपाईंले आफ्नो अर्को कोर्सका लागि {you} छुटको कोड पाउनुहुन्छ, जुन रकम फिर्ताको अवधि बितेपछि काम गर्न थाल्छ।',
    'refer.copyLink': 'निम्तोको लिङ्क प्रतिलिपि गर्नुहोस्',
    'refer.linkCopied': 'लिङ्क प्रतिलिपि भयो',
    'refer.copyMessage': 'सन्देश प्रतिलिपि गर्नुहोस्',
    'refer.messageCopied': 'सन्देश प्रतिलिपि भयो',
    'refer.copyRefused':
      'यो ब्राउजरले प्रतिलिपि गर्न दिएन। लिङ्क तल लेखिएको छ र हातैले छान्न सकिन्छ।',
    'refer.noCode':
      'यो पृष्ठ पहिलो पटक खुल्दा तपाईंको कोड बन्छ र सधैँ उही रहन्छ। अझै छैन भने पृष्ठ एक पटक फेरि लोड गर्नुहोस्।',
    'refer.msgNamed':
      '{name} ले तपाईंलाई AyahSpring मा निम्तो दिनुभएको छ। तपाईंको पहिलो कोर्समा {percent} छुट: {link}',
    'refer.msgPlain':
      'तपाईंलाई AyahSpring मा निम्तो छ। तपाईंको पहिलो कोर्समा {percent} छुट: {link}',
    'refer.rewardsHeading': 'तपाईंले पाएका पुरस्कार',
    'refer.rewardCount': 'पुरस्कार: {count}',
    'refer.noRewards':
      'अहिलेसम्म केही छैन। कसैले तपाईंको कोड प्रयोग गरेपछि र उसको भुक्तानी आइपुगेपछि पुरस्कार यहाँ देखिन्छ।',
    'refer.rewardWorth': 'एउटा कोर्समा {percent} छुट',
    'refer.rwEarned': 'प्राप्त भयो',
    'refer.rwReversed': 'फिर्ता लिइयो: जुन खरिदबाट यो आएको थियो, त्यसको रकम फिर्ता गरियो',
    'refer.rwOther': 'दर्ता भएको',
    'refer.rwFrom': '{date} देखि प्रयोग गर्न सकिन्छ',
    'refer.rwBy': '{date} अघि प्रयोग गर्नुहोस्',
    'refer.rwUse':
      'तपाईंले किन्दै गरेको जुनसुकै कोर्सको भुक्तानी पृष्ठमा रहेको कोडको कोठामा यो लेख्नुहोस्।',
    'refer.invitedHeading': 'तपाईंले कसलाई निम्तो दिनुभयो',
    'refer.invitedCount': 'मानिस: {count}',
    'refer.nobodyInvited':
      'अहिलेसम्म कोही छैन। मानिसहरू कुनै खरिदमा तपाईंको कोड प्रयोग गरेपछि यहाँ देखिन्छन्।',
    'refer.pnPending': 'खरिद सुरु गर्नुभयो',
    'refer.pnBought': 'एउटा कोर्स किन्नुभयो',
    'refer.pnRefunded': 'उहाँको खरिदको रकम फिर्ता गरियो',
    'refer.friend': 'एक जना साथी',
    'refer.onlyFirstName':
      'पहिलो नाम मात्र देखाइन्छ। अरू कसैले के सिक्छ र कोसँग सिक्छ भन्ने कुरा तपाईंले निम्तो दिनुभएकै कारणले हेर्न पाउने कुरा होइन।',
    'refer.howHeading': 'यो कसरी काम गर्छ',
    'refer.how1':
      'तपाईं लिङ्क पठाउनुहुन्छ। उहाँहरूले त्यो खोल्नुहुन्छ र केही निर्णय गर्नुअघि कोडको मूल्य कति हो भनेर हेर्नुहुन्छ।',
    'refer.how2':
      'उहाँहरूले आफ्नो पहिलो कोर्स किन्दा त्यो लेख्नुहुन्छ, र छुट उहाँहरूसँग रहने रसिदमा देखिन्छ।',
    'refer.how3':
      'उहाँहरूको भुक्तानी आइपुगेपछि तपाईंको पुरस्कार कोड बन्छ। रकम फिर्ताको अवधि बितेपछि यसले काम गर्न थाल्छ, र त्यसपछि यति दिन काम गर्छ: {days}। उहाँहरूलाई रकम फिर्ता गरियो भने पुरस्कार फिर्ता लिइन्छ।',
    'refer.how4':
      'बाह्र महिनामा तपाईंले पाउन सक्ने पुरस्कारको सङ्ख्या: {max}। प्रत्येक पुरस्कार साधारण अर्डरमा साधारण छुट हो, साधारण रसिदसहित।',
    'refer.honesty':
      'दुवै पुरस्कार कोर्सको छुट हुन्, पैसा होइन। कसैलाई केही भुक्तानी गरिँदैन, त्यसैले साथीलाई निम्तो दिन बैंक विवरण चाहिँदैन।',
    'refer.lnEyebrow': 'एउटा निम्तो',
    'refer.lnBadTitle': 'यो लिङ्कले काम गर्दैन',
    'refer.lnBadBody':
      'यसभित्रको कोड गलत टाइप भएको छ वा कहिल्यै थिएन। कुनै रकम काटिएको छैन र केहीमा दर्ता भएको छैन। तपाईं यो पृष्ठमा आगन्तुक मात्र हुनुहुन्छ।',
    'refer.lnOffTitle': 'निम्तोहरू अहिले खुला छैनन्',
    'refer.lnUnreadTitle': 'यो निम्तो अहिले पढ्न सकिएन',
    'refer.lnStill': 'कुनै रकम काटिएको छैन, र कोर्सहरू अझै यहीँ छन्।',
    'refer.lnBrowse': 'कोर्सहरू हेर्नुहोस्',
    'refer.lnTitleNamed': '{name} ले तपाईंलाई निम्तो दिनुभएको छ',
    'refer.lnTitlePlain': 'तपाईंलाई निम्तो छ',
    'refer.lnWorth': 'उहाँको कोडले यहाँ तपाईंको पहिलो कोर्समा {percent} घटाउँछ।',
    'refer.lnNotMoney': 'यो कोर्सको छुट हो, पैसा होइन, त्यसैले निकाल्नुपर्ने केही छैन।',
    'refer.lnCardHeading': 'तपाईंको निम्तो',
    'refer.lnKeep': 'यो कोड राखेर कोर्सहरू हेर्नुहोस्',
    'refer.lnKept':
      'बटन प्रयोग गर्नुभयो भने यो ब्राउजरले कोड सम्झन्छ र भुक्तानी पृष्ठमा भरिदिन्छ। सम्झिने दिनको सङ्ख्या: {days}। तपाईं आफैँ पनि त्यहाँ लेख्न सक्नुहुन्छ।',
    'refer.lnAbout':
      'AyahSpring ले बालबालिका र वयस्कहरूलाई इस्लाम धर्म सिकाउँछ, जीवनसँग मिल्ने गतिमा। कोर्सहरू प्रकाशन अघि जाँचिन्छन्, र प्रत्येक शिक्षकलाई प्लेटफर्मले नियुक्त गर्छ।',
  },
};
