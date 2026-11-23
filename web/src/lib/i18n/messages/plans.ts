import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The plans page (`app/plans/page.tsx`) and the page a plan is paid for on
 * (`app/plans/[id]/page.tsx`).
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts`, `reading.ts`, `restore.ts`, `phone.ts`, `merge.ts`,
 * `share.ts`, `refer.ts`, `sponsor.ts`, `orders.ts`, `billing.ts`,
 * `receipt.ts` and `notify.ts`: written for the twenty-seven languages with
 * nothing held in `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **A price is said with what it pays for** (`forWeek` … `forOnce`): one
 * week, one month, three months, one year, or once. Never "per month" and
 * never "monthly": nothing on this platform takes a second payment by
 * itself, and `noRenew` says so. When something does, that sentence and
 * these five are the ones to change.
 *
 * **A plan's name, its description and a subject's name are not here.** They
 * are whatever whoever made the plan wrote, and are shown as written.
 *
 * **What a refusal says about an order is exact.** `whyGone`, `whyPrice`,
 * `whySlot`, `whyAccount`, `whyLearner` and `whyClosed` are refusals by the
 * writer, which wrote nothing, and say that no order was placed.
 * `whyNoService` and `whyFailed` can come after the order is written, so
 * they say nothing about one; the form adds `waiting` when there is one.
 * `waiting` is the only instruction that works: a plan with an order
 * waiting cannot be ordered again until that one is cancelled.
 *
 * The number, the service and the button are the buy page's sentences
 * (`buy.ts`), as on the page a pledge is paid for.
 */
export const PLANS: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'plans.title': 'اختر خطة تعلّم',
    'plans.lede':
      'الخطة تفتح الدورات للمتعلّمين الذين تشملهم، للمدة المدفوعة. تبدأ عند تأكّد الدفع، لا عند تقديم الطلب.',
    'plans.shelves':
      '{basic} تفتح الدروس. {plus} هي باقة VIP: الدروس نفسها وزيادة عليها. كل خطة تذكر ما تفتحه.',
    'plans.noRenew':
      'لا يُخصم أي مبلغ مرة أخرى تلقائيًا. عند انتهاء المدة تنتهي الخطة ما لم تُدفع من جديد.',
    'plans.closedLead': 'الخطط غير معروضة للبيع بعد.',
    'plans.closedBody': 'عند عرضها ستُدرج هنا كل خطة وسعرها. لا يمكن شراء شيء قبل ذلك.',
    'plans.unread': 'تعذّرت قراءة الخطط الآن. هذا لا يعني أنه لا توجد خطط. حاول مرة أخرى بعد قليل.',
    'plans.none': 'لا توجد خطة معروضة للبيع حاليًا.',
    'plans.forWeek': 'لأسبوع واحد: {amount}',
    'plans.forMonth': 'لشهر واحد: {amount}',
    'plans.forQuarter': 'لثلاثة أشهر: {amount}',
    'plans.forYear': 'لسنة واحدة: {amount}',
    'plans.forOnce': 'دفعة واحدة: {amount}',
    'plans.adults': 'أماكن للبالغين: {count}',
    'plans.children': 'أماكن للأطفال: {count}',
    'plans.opens': 'ما الذي تفتحه',
    'plans.subject': 'كل دورة في هذا المجال: {name}',
    'plans.offline': 'حفظ الدروس داخل التطبيق لمشاهدتها بلا اتصال',
    'plans.noPrice': 'ليس لهذه الخطة سعر لحسابك بعد، فلا يمكن شراؤها هنا.',
    'plans.choose': 'اختر هذه الخطة',
    'plans.payLede': 'اختر لمن هذه الخطة وكيف تدفع. تبدأ الخطة عند تأكّد الدفع.',
    'plans.notHere': 'هذه الخطة غير معروضة للبيع، أو لا توجد خطة كهذه.',
    'plans.whichPrice': 'أيّ سعر؟',
    'plans.whoFor': 'لمن هذه الخطة؟',
    'plans.forOne': 'هذه الخطة لـ: {name}',
    'plans.nobodyLead': 'لا يوجد في حسابك بعد مَن يمكن أن تشمله هذه الخطة.',
    'plans.nobodyBody':
      'مكان البالغ لك أنت، متى صرت متعلّمًا على هذا الحساب. ومكان الطفل لطفل في عائلتك.',
    'plans.noService': 'لذلك لا يمكن شراء خطة بعد. لم يُقدَّم أي طلب.',
    'plans.noServiceHere':
      'لا توجد جهة دفع مربوطة بهذه المنصة تحصّل العملة التي سُعّرت بها هذه الخطة هنا: {currency}',
    'plans.approve': 'وافق على الدفع من هاتفك. تبدأ الخطة عند تأكّد الدفع. قد يستغرق ذلك لحظات.',
    'plans.waiting': 'يوجد طلب لهذه الخطة ينتظر الدفع. للبدء من جديد، ألغِه أولًا من اشتراكاتك.',
    'plans.haveLive': 'هذا الحساب لديه هذه الخطة بالفعل. تستمر حتى: {date}',
    'plans.whyGone': 'هذه الخطة لم تعد معروضة للبيع. لم يُقدَّم أي طلب.',
    'plans.whyPrice':
      'هذا السعر لم يعد متاحًا لحسابك. لم يُقدَّم أي طلب. افتح الخطط من جديد لترى السعر الحالي.',
    'plans.whySlot': 'ليس في هذه الخطة مكان لذلك المتعلّم. لم يُقدَّم أي طلب.',
    'plans.whyAlready':
      'هذا الحساب لديه هذه الخطة بالفعل، أو طلب لها ما زال ينتظر. انظر في اشتراكاتك.',
    'plans.whyAccount': 'موقعك في حساب الفوترة هذا لا يسمح لك بالدفع منه. لم يُقدَّم أي طلب.',
    'plans.whyLearner': 'لا يمكن اختيار ذلك المتعلّم من هذا الحساب. لم يُقدَّم أي طلب.',
    'plans.whyClosed': 'الخطط غير معروضة للبيع بعد، فلم يُقدَّم أي طلب. لم يُخصم أي مبلغ.',
    'plans.whyChoose': 'اختر لمن هذه الخطة.',
    'plans.whyNoService': 'لا توجد جهة دفع تستطيع استلام هذه الدفعة حاليًا.',
    'plans.whyFailed': 'تعذّر بدء الدفع.',
  },
  ur: {
    'plans.title': 'سیکھنے کا پلان منتخب کریں',
    'plans.lede':
      'پلان ان سیکھنے والوں کے لیے کورس کھولتا ہے جو اس میں شامل ہیں، اس مدت کے لیے جس کی ادائیگی کی گئی ہو۔ یہ ادائیگی کی تصدیق پر شروع ہوتا ہے، آرڈر دینے پر نہیں۔',
    'plans.shelves':
      '{basic} اسباق کھولتا ہے۔ {plus} VIP پیکج ہے: وہی اسباق اور ان کے ساتھ مزید۔ ہر پلان میں لکھا ہے کہ وہ کیا کھولتا ہے۔',
    'plans.noRenew':
      'کوئی رقم خودکار طور پر دوبارہ نہیں لی جاتی۔ مدت ختم ہونے پر پلان ختم ہو جاتا ہے، جب تک دوبارہ ادائیگی نہ کی جائے۔',
    'plans.closedLead': 'پلان ابھی فروخت کے لیے نہیں ہیں۔',
    'plans.closedBody':
      'جب ہوں گے تو ہر پلان اور اس کی قیمت یہاں درج ہوگی۔ اس سے پہلے کچھ نہیں خریدا جا سکتا۔',
    'plans.unread':
      'پلان ابھی پڑھے نہیں جا سکے۔ اس کا یہ مطلب نہیں کہ کوئی پلان نہیں ہے۔ تھوڑی دیر بعد دوبارہ کوشش کریں۔',
    'plans.none': 'اس وقت کوئی پلان فروخت کے لیے نہیں ہے۔',
    'plans.forWeek': 'ایک ہفتے کے لیے: {amount}',
    'plans.forMonth': 'ایک مہینے کے لیے: {amount}',
    'plans.forQuarter': 'تین مہینوں کے لیے: {amount}',
    'plans.forYear': 'ایک سال کے لیے: {amount}',
    'plans.forOnce': 'ایک ہی ادائیگی: {amount}',
    'plans.adults': 'بالغوں کے لیے جگہیں: {count}',
    'plans.children': 'بچوں کے لیے جگہیں: {count}',
    'plans.opens': 'یہ کیا کھولتا ہے',
    'plans.subject': 'اس مضمون کا ہر کورس: {name}',
    'plans.offline': 'اسباق ایپ میں محفوظ کرنا، تاکہ کنکشن کے بغیر دیکھے جا سکیں',
    'plans.noPrice':
      'اس پلان کی آپ کے اکاؤنٹ کے لیے ابھی کوئی قیمت نہیں ہے، اس لیے یہ یہاں نہیں خریدا جا سکتا۔',
    'plans.choose': 'یہ پلان منتخب کریں',
    'plans.payLede':
      'منتخب کریں کہ یہ پلان کس کے لیے ہے اور ادائیگی کیسے ہوگی۔ پلان ادائیگی کی تصدیق ہوتے ہی شروع ہوتا ہے۔',
    'plans.notHere': 'یہ پلان فروخت کے لیے نہیں ہے، یا ایسا کوئی پلان نہیں ہے۔',
    'plans.whichPrice': 'کون سی قیمت؟',
    'plans.whoFor': 'یہ پلان کس کے لیے ہے؟',
    'plans.forOne': 'یہ پلان اس کے لیے ہے: {name}',
    'plans.nobodyLead': 'آپ کے اکاؤنٹ پر ابھی کوئی ایسا نہیں جسے یہ پلان شامل کر سکے۔',
    'plans.nobodyBody':
      'بالغ کی جگہ آپ کے لیے ہے، جب آپ اس اکاؤنٹ پر سیکھنے والے بن جائیں۔ بچے کی جگہ آپ کے خاندان کے کسی بچے کے لیے ہے۔',
    'plans.noService': 'اس لیے ابھی کوئی پلان نہیں خریدا جا سکتا۔ کوئی آرڈر نہیں دیا گیا۔',
    'plans.noServiceHere':
      'اس پلیٹ فارم سے منسلک کوئی ادائیگی سروس وہ کرنسی وصول نہیں کرتی جس میں یہاں اس پلان کی قیمت رکھی گئی ہے: {currency}',
    'plans.approve':
      'اپنے فون پر ادائیگی منظور کریں۔ ادائیگی کی تصدیق ہوتے ہی پلان شروع ہو جائے گا۔ اس میں کچھ وقت لگ سکتا ہے۔',
    'plans.waiting':
      'اس پلان کا ایک آرڈر ادائیگی کا منتظر ہے۔ نئے سرے سے شروع کرنے کے لیے پہلے اسے اپنی سبسکرپشن میں منسوخ کریں۔',
    'plans.haveLive': 'اس اکاؤنٹ کے پاس یہ پلان پہلے سے ہے۔ یہ اس وقت تک چلے گا: {date}',
    'plans.whyGone': 'یہ پلان اب فروخت کے لیے نہیں ہے۔ کوئی آرڈر نہیں دیا گیا۔',
    'plans.whyPrice':
      'وہ قیمت اب آپ کے اکاؤنٹ کے لیے دستیاب نہیں ہے۔ کوئی آرڈر نہیں دیا گیا۔ موجودہ قیمت دیکھنے کے لیے پلان دوبارہ کھولیں۔',
    'plans.whySlot': 'اس پلان میں اس سیکھنے والے کے لیے کوئی جگہ نہیں ہے۔ کوئی آرڈر نہیں دیا گیا۔',
    'plans.whyAlready':
      'اس اکاؤنٹ کے پاس یہ پلان پہلے سے ہے، یا اس کا کوئی آرڈر ابھی منتظر ہے۔ اپنی سبسکرپشن دیکھیں۔',
    'plans.whyAccount':
      'اس بلنگ اکاؤنٹ میں آپ کی حیثیت آپ کو اس سے ادائیگی کی اجازت نہیں دیتی۔ کوئی آرڈر نہیں دیا گیا۔',
    'plans.whyLearner':
      'اس سیکھنے والے کو اس اکاؤنٹ سے منتخب نہیں کیا جا سکتا۔ کوئی آرڈر نہیں دیا گیا۔',
    'plans.whyClosed':
      'پلان ابھی فروخت کے لیے نہیں ہیں، اس لیے کوئی آرڈر نہیں دیا گیا۔ کوئی رقم نہیں لی گئی۔',
    'plans.whyChoose': 'منتخب کریں کہ یہ پلان کس کے لیے ہے۔',
    'plans.whyNoService': 'اس وقت کوئی ادائیگی سروس یہ ادائیگی نہیں لے سکتی۔',
    'plans.whyFailed': 'ادائیگی شروع نہیں ہو سکی۔',
  },
  fa: {
    'plans.title': 'یک طرح یادگیری انتخاب کنید',
    'plans.lede':
      'طرح، دوره‌ها را برای یادگیرنده‌هایی که پوشش می‌دهد باز می‌کند، برای مدتی که هزینه‌اش پرداخت شده است. با تأیید پرداخت آغاز می‌شود، نه با ثبت سفارش.',
    'plans.shelves':
      '{basic} درس‌ها را باز می‌کند. {plus} بستهٔ VIP است: همان درس‌ها و چیزهایی بیشتر. هر طرح می‌گوید چه چیزی را باز می‌کند.',
    'plans.noRenew':
      'هیچ مبلغی دوباره به‌طور خودکار برداشت نمی‌شود. با پایان مدت، طرح پایان می‌یابد مگر آنکه دوباره پرداخت شود.',
    'plans.closedLead': 'طرح‌ها هنوز برای فروش عرضه نشده‌اند.',
    'plans.closedBody':
      'هر وقت عرضه شوند، هر طرح و قیمتش اینجا فهرست می‌شود. پیش از آن چیزی نمی‌توان خرید.',
    'plans.unread':
      'طرح‌ها اکنون خوانده نشدند. این به آن معنا نیست که طرحی وجود ندارد. کمی بعد دوباره امتحان کنید.',
    'plans.none': 'در حال حاضر هیچ طرحی برای فروش عرضه نشده است.',
    'plans.forWeek': 'برای یک هفته: {amount}',
    'plans.forMonth': 'برای یک ماه: {amount}',
    'plans.forQuarter': 'برای سه ماه: {amount}',
    'plans.forYear': 'برای یک سال: {amount}',
    'plans.forOnce': 'یک پرداخت: {amount}',
    'plans.adults': 'جا برای بزرگسالان: {count}',
    'plans.children': 'جا برای کودکان: {count}',
    'plans.opens': 'چه چیزی را باز می‌کند',
    'plans.subject': 'همهٔ دوره‌های این موضوع: {name}',
    'plans.offline': 'ذخیرهٔ درس‌ها در برنامه، برای تماشا بدون اتصال',
    'plans.noPrice': 'این طرح هنوز برای حساب شما قیمتی ندارد، پس اینجا نمی‌توان آن را خرید.',
    'plans.choose': 'این طرح را انتخاب کنید',
    'plans.payLede':
      'انتخاب کنید این طرح برای چه کسی است و چگونه پرداخت می‌شود. طرح با تأیید پرداخت آغاز می‌شود.',
    'plans.notHere': 'این طرح برای فروش عرضه نشده است، یا چنین طرحی وجود ندارد.',
    'plans.whichPrice': 'کدام قیمت؟',
    'plans.whoFor': 'این طرح برای چه کسی است؟',
    'plans.forOne': 'این طرح برای این یادگیرنده است: {name}',
    'plans.nobodyLead': 'هنوز کسی در حساب شما نیست که این طرح بتواند پوشش دهد.',
    'plans.nobodyBody':
      'جای بزرگسال برای خود شماست، وقتی در این حساب یادگیرنده شوید. جای کودک برای کودکی در خانوادهٔ شماست.',
    'plans.noService': 'پس هنوز نمی‌توان طرحی خرید. سفارشی ثبت نشده است.',
    'plans.noServiceHere':
      'هیچ سرویس پرداختی که به این سکو متصل است ارزی را که این طرح در اینجا با آن قیمت‌گذاری شده دریافت نمی‌کند: {currency}',
    'plans.approve':
      'پرداخت را در تلفن خود تأیید کنید. طرح با تأیید پرداخت آغاز می‌شود. ممکن است کمی طول بکشد.',
    'plans.waiting':
      'سفارشی برای این طرح در انتظار پرداخت است. برای شروع دوباره، نخست آن را در اشتراک‌های خود لغو کنید.',
    'plans.haveLive': 'این حساب هم‌اکنون این طرح را دارد. تا این زمان ادامه دارد: {date}',
    'plans.whyGone': 'این طرح دیگر برای فروش عرضه نمی‌شود. سفارشی ثبت نشد.',
    'plans.whyPrice':
      'آن قیمت دیگر برای حساب شما در دسترس نیست. سفارشی ثبت نشد. برای دیدن قیمت کنونی، طرح‌ها را دوباره باز کنید.',
    'plans.whySlot': 'این طرح برای آن یادگیرنده جایی ندارد. سفارشی ثبت نشد.',
    'plans.whyAlready':
      'این حساب هم‌اکنون این طرح را دارد، یا سفارشی برای آن هنوز در انتظار است. اشتراک‌های خود را ببینید.',
    'plans.whyAccount':
      'جایگاه شما در این حساب صورت‌حساب اجازهٔ پرداخت از آن را نمی‌دهد. سفارشی ثبت نشد.',
    'plans.whyLearner': 'آن یادگیرنده را نمی‌توان از این حساب انتخاب کرد. سفارشی ثبت نشد.',
    'plans.whyClosed':
      'طرح‌ها هنوز برای فروش عرضه نشده‌اند، پس سفارشی ثبت نشد. هیچ مبلغی برداشت نشده است.',
    'plans.whyChoose': 'انتخاب کنید این طرح برای چه کسی است.',
    'plans.whyNoService': 'در حال حاضر هیچ سرویس پرداختی نمی‌تواند این پرداخت را بگیرد.',
    'plans.whyFailed': 'پرداخت آغاز نشد.',
  },
  'fa-af': {
    'plans.title': 'یک پلان آموزش انتخاب کنید',
    'plans.lede':
      'پلان، کورس‌ها را برای شاگردانی که زیر پوشش دارد باز می‌کند، برای مدتی که پول آن پرداخت شده است. با تأیید پرداخت آغاز می‌شود، نه با دادن فرمایش.',
    'plans.shelves':
      '{basic} درس‌ها را باز می‌کند. {plus} بستهٔ VIP است: همان درس‌ها و چیزهای بیشتر. هر پلان می‌گوید چه چیزی را باز می‌کند.',
    'plans.noRenew':
      'هیچ مبلغی دوباره به‌گونهٔ خودکار گرفته نمی‌شود. با ختم مدت، پلان ختم می‌شود مگر اینکه دوباره پرداخت شود.',
    'plans.closedLead': 'پلان‌ها هنوز برای فروش گذاشته نشده‌اند.',
    'plans.closedBody':
      'هر وقت گذاشته شوند، هر پلان و قیمت آن اینجا فهرست می‌شود. پیش از آن چیزی خریده نمی‌تواند.',
    'plans.unread':
      'پلان‌ها فعلاً خوانده نشدند. این به آن معنا نیست که پلانی وجود ندارد. کمی بعد دوباره کوشش کنید.',
    'plans.none': 'فعلاً هیچ پلانی برای فروش گذاشته نشده است.',
    'plans.forWeek': 'برای یک هفته: {amount}',
    'plans.forMonth': 'برای یک ماه: {amount}',
    'plans.forQuarter': 'برای سه ماه: {amount}',
    'plans.forYear': 'برای یک سال: {amount}',
    'plans.forOnce': 'یک پرداخت: {amount}',
    'plans.adults': 'جای برای بزرگسالان: {count}',
    'plans.children': 'جای برای اطفال: {count}',
    'plans.opens': 'چه چیزی را باز می‌کند',
    'plans.subject': 'هر کورس در این مضمون: {name}',
    'plans.offline': 'ذخیرهٔ درس‌ها در اپلیکیشن، برای دیدن بدون اتصال',
    'plans.noPrice': 'این پلان هنوز برای حساب شما قیمتی ندارد، پس اینجا خریده نمی‌تواند.',
    'plans.choose': 'این پلان را انتخاب کنید',
    'plans.payLede':
      'انتخاب کنید این پلان برای کیست و چگونه پرداخت می‌شود. پلان با تأیید پرداخت آغاز می‌شود.',
    'plans.notHere': 'این پلان برای فروش گذاشته نشده است، یا چنین پلانی وجود ندارد.',
    'plans.whichPrice': 'کدام قیمت؟',
    'plans.whoFor': 'این پلان برای کیست؟',
    'plans.forOne': 'این پلان برای این شاگرد است: {name}',
    'plans.nobodyLead': 'هنوز کسی در حساب شما نیست که این پلان او را زیر پوشش بگیرد.',
    'plans.nobodyBody':
      'جای بزرگسال برای خود شماست، وقتی در این حساب شاگرد شوید. جای طفل برای طفلی در خانوادهٔ شماست.',
    'plans.noService': 'پس هنوز پلانی خریده نمی‌تواند. فرمایشی داده نشده است.',
    'plans.noServiceHere':
      'هیچ خدمت پرداختی که به این پلتفرم وصل است اسعاری را که این پلان در اینجا با آن قیمت‌گذاری شده نمی‌گیرد: {currency}',
    'plans.approve':
      'پرداخت را در تلفون خود تأیید کنید. پلان با تأیید پرداخت آغاز می‌شود. شاید کمی وقت بگیرد.',
    'plans.waiting':
      'فرمایشی برای این پلان منتظر پرداخت است. برای شروع دوباره، نخست آن را در اشتراک‌های خود لغو کنید.',
    'plans.haveLive': 'این حساب همین حالا این پلان را دارد. تا این وقت دوام دارد: {date}',
    'plans.whyGone': 'این پلان دیگر برای فروش گذاشته نمی‌شود. فرمایشی داده نشد.',
    'plans.whyPrice':
      'آن قیمت دیگر برای حساب شما در دسترس نیست. فرمایشی داده نشد. برای دیدن قیمت فعلی، پلان‌ها را دوباره باز کنید.',
    'plans.whySlot': 'این پلان برای آن شاگرد جای ندارد. فرمایشی داده نشد.',
    'plans.whyAlready':
      'این حساب همین حالا این پلان را دارد، یا فرمایشی برای آن هنوز منتظر است. اشتراک‌های خود را ببینید.',
    'plans.whyAccount':
      'جایگاه شما در این حساب بل اجازهٔ پرداخت از آن را نمی‌دهد. فرمایشی داده نشد.',
    'plans.whyLearner': 'آن شاگرد از این حساب انتخاب شده نمی‌تواند. فرمایشی داده نشد.',
    'plans.whyClosed':
      'پلان‌ها هنوز برای فروش گذاشته نشده‌اند، پس فرمایشی داده نشد. هیچ مبلغی گرفته نشده است.',
    'plans.whyChoose': 'انتخاب کنید این پلان برای کیست.',
    'plans.whyNoService': 'فعلاً هیچ خدمت پرداختی نمی‌تواند این پرداخت را بگیرد.',
    'plans.whyFailed': 'پرداخت آغاز نشد.',
  },
  tr: {
    'plans.title': 'Bir öğrenme planı seçin',
    'plans.lede':
      'Plan, kapsadığı öğrenciler için kursları, ödemesi yapılan süre boyunca açar. Sipariş verildiğinde değil, ödeme onaylandığında başlar.',
    'plans.shelves':
      '{basic} dersleri açar. {plus} VIP paketidir: aynı dersler ve fazlası. Her plan neyi açtığını listeler.',
    'plans.noRenew':
      'Hiçbir tutar kendiliğinden yeniden alınmaz. Süre bitince plan da biter; devam etmesi için yeniden ödenmesi gerekir.',
    'plans.closedLead': 'Planlar henüz satışta değil.',
    'plans.closedBody':
      'Satışa çıktıklarında her plan ve fiyatı burada listelenecek. O zamana kadar hiçbir şey satın alınamaz.',
    'plans.unread':
      'Planlar şu anda okunamadı. Bu, plan olmadığı anlamına gelmez. Biraz sonra yeniden deneyin.',
    'plans.none': 'Şu anda satışta plan yok.',
    'plans.forWeek': 'Bir hafta için: {amount}',
    'plans.forMonth': 'Bir ay için: {amount}',
    'plans.forQuarter': 'Üç ay için: {amount}',
    'plans.forYear': 'Bir yıl için: {amount}',
    'plans.forOnce': 'Tek ödeme: {amount}',
    'plans.adults': 'Yetişkinler için yer: {count}',
    'plans.children': 'Çocuklar için yer: {count}',
    'plans.opens': 'Neleri açar',
    'plans.subject': 'Şu konudaki her kurs: {name}',
    'plans.offline': 'Dersleri uygulamaya kaydedip bağlantı olmadan izleme',
    'plans.noPrice':
      'Bu planın hesabınız için henüz bir fiyatı yok, bu yüzden buradan satın alınamaz.',
    'plans.choose': 'Bu planı seç',
    'plans.payLede':
      'Bu planın kimin için olduğunu ve nasıl ödeneceğini seçin. Plan, ödeme onaylanınca başlar.',
    'plans.notHere': 'Bu plan satışta değil ya da böyle bir plan yok.',
    'plans.whichPrice': 'Hangi fiyat?',
    'plans.whoFor': 'Bu plan kimin için?',
    'plans.forOne': 'Bu plan şu öğrenci içindir: {name}',
    'plans.nobodyLead': 'Hesabınızda bu planın kapsayabileceği kimse henüz yok.',
    'plans.nobodyBody':
      'Yetişkin yeri, bu hesapta öğrenci olduğunuzda sizin içindir. Çocuk yeri, ailenizdeki bir çocuk içindir.',
    'plans.noService': 'Bu yüzden henüz plan satın alınamaz. Sipariş verilmedi.',
    'plans.noServiceHere':
      'Bu platforma bağlı hiçbir ödeme hizmeti, bu planın burada fiyatlandırıldığı para birimini tahsil etmiyor: {currency}',
    'plans.approve':
      'Ödemeyi telefonunuzdan onaylayın. Ödeme onaylanınca plan başlar. Bu biraz zaman alabilir.',
    'plans.waiting':
      'Bu plan için bir sipariş ödeme bekliyor. Yeniden başlamak için önce onu aboneliklerinizden iptal edin.',
    'plans.haveLive': 'Bu hesapta bu plan zaten var. Şu tarihe kadar sürer: {date}',
    'plans.whyGone': 'Bu plan artık satışta değil. Sipariş verilmedi.',
    'plans.whyPrice':
      'O fiyat artık hesabınız için geçerli değil. Sipariş verilmedi. Güncel fiyatı görmek için planları yeniden açın.',
    'plans.whySlot': 'Bu planda o öğrenci için yer yok. Sipariş verilmedi.',
    'plans.whyAlready':
      'Bu hesapta bu plan zaten var ya da onun için hâlâ bekleyen bir sipariş var. Aboneliklerinize bakın.',
    'plans.whyAccount':
      'Bu fatura hesabındaki yeriniz, ondan ödeme yapmanıza izin vermiyor. Sipariş verilmedi.',
    'plans.whyLearner': 'O öğrenci bu hesaptan seçilemez. Sipariş verilmedi.',
    'plans.whyClosed':
      'Planlar henüz satışta değil, bu yüzden sipariş verilmedi. Hiçbir ücret alınmadı.',
    'plans.whyChoose': 'Bu planın kimin için olduğunu seçin.',
    'plans.whyNoService': 'Şu anda hiçbir ödeme hizmeti bu ödemeyi alamıyor.',
    'plans.whyFailed': 'Ödeme başlatılamadı.',
  },
  id: {
    'plans.title': 'Pilih paket belajar',
    'plans.lede':
      'Paket membuka kursus bagi peserta didik yang dicakupnya, selama masa yang dibayar. Paket dimulai saat pembayaran dikonfirmasi, bukan saat pesanan dibuat.',
    'plans.shelves':
      '{basic} membuka pelajaran. {plus} adalah paket VIP: pelajaran yang sama, ditambah yang lain. Setiap paket menyebutkan apa yang dibukanya.',
    'plans.noRenew':
      'Tidak ada yang ditagih lagi secara otomatis. Saat masanya habis, paket berakhir kecuali dibayar lagi.',
    'plans.closedLead': 'Paket belum dijual.',
    'plans.closedBody':
      'Saat sudah dijual, setiap paket dan harganya akan tercantum di sini. Sebelum itu tidak ada yang bisa dibeli.',
    'plans.unread':
      'Paket tidak dapat dibaca saat ini. Ini tidak berarti tidak ada paket. Coba lagi sebentar lagi.',
    'plans.none': 'Saat ini tidak ada paket yang dijual.',
    'plans.forWeek': 'Untuk satu minggu: {amount}',
    'plans.forMonth': 'Untuk satu bulan: {amount}',
    'plans.forQuarter': 'Untuk tiga bulan: {amount}',
    'plans.forYear': 'Untuk satu tahun: {amount}',
    'plans.forOnce': 'Satu kali bayar: {amount}',
    'plans.adults': 'Tempat untuk orang dewasa: {count}',
    'plans.children': 'Tempat untuk anak: {count}',
    'plans.opens': 'Apa yang dibukanya',
    'plans.subject': 'Setiap kursus dalam bidang ini: {name}',
    'plans.offline': 'Menyimpan pelajaran di aplikasi untuk ditonton tanpa koneksi',
    'plans.noPrice': 'Paket ini belum punya harga untuk akun Anda, jadi tidak bisa dibeli di sini.',
    'plans.choose': 'Pilih paket ini',
    'plans.payLede':
      'Pilih untuk siapa paket ini dan cara membayarnya. Paket dimulai setelah pembayaran dikonfirmasi.',
    'plans.notHere': 'Paket ini tidak dijual, atau tidak ada paket seperti itu.',
    'plans.whichPrice': 'Harga yang mana?',
    'plans.whoFor': 'Paket ini untuk siapa?',
    'plans.forOne': 'Paket ini untuk: {name}',
    'plans.nobodyLead': 'Belum ada siapa pun di akun Anda yang bisa dicakup paket ini.',
    'plans.nobodyBody':
      'Tempat untuk orang dewasa adalah untuk Anda, setelah Anda menjadi peserta didik di akun ini. Tempat untuk anak adalah untuk anak dalam keluarga Anda.',
    'plans.noService': 'Jadi paket belum bisa dibeli. Tidak ada pesanan yang dibuat.',
    'plans.noServiceHere':
      'Tidak ada layanan pembayaran yang terhubung ke platform ini yang menerima mata uang harga paket ini di sini: {currency}',
    'plans.approve':
      'Setujui pembayaran di ponsel Anda. Paket dimulai setelah pembayaran dikonfirmasi. Ini mungkin memerlukan waktu sebentar.',
    'plans.waiting':
      'Ada pesanan untuk paket ini yang menunggu pembayaran. Untuk memulai lagi, batalkan dulu pesanan itu di langganan Anda.',
    'plans.haveLive': 'Akun ini sudah memiliki paket ini. Berlaku sampai: {date}',
    'plans.whyGone': 'Paket ini sudah tidak dijual. Tidak ada pesanan yang dibuat.',
    'plans.whyPrice':
      'Harga itu sudah tidak tersedia untuk akun Anda. Tidak ada pesanan yang dibuat. Buka lagi daftar paket untuk melihat harga saat ini.',
    'plans.whySlot':
      'Paket ini tidak punya tempat untuk peserta didik itu. Tidak ada pesanan yang dibuat.',
    'plans.whyAlready':
      'Akun ini sudah memiliki paket ini, atau ada pesanan untuknya yang masih menunggu. Lihat langganan Anda.',
    'plans.whyAccount':
      'Kedudukan Anda di akun penagihan ini tidak mengizinkan Anda membayar darinya. Tidak ada pesanan yang dibuat.',
    'plans.whyLearner':
      'Peserta didik itu tidak dapat dipilih dari akun ini. Tidak ada pesanan yang dibuat.',
    'plans.whyClosed':
      'Paket belum dijual, jadi tidak ada pesanan yang dibuat. Tidak ada yang ditagih.',
    'plans.whyChoose': 'Pilih untuk siapa paket ini.',
    'plans.whyNoService':
      'Saat ini tidak ada layanan pembayaran yang dapat menerima pembayaran ini.',
    'plans.whyFailed': 'Pembayaran tidak dapat dimulai.',
  },
  ms: {
    'plans.title': 'Pilih pelan pembelajaran',
    'plans.lede':
      'Pelan membuka kursus untuk pelajar yang diliputinya, sepanjang tempoh yang dibayar. Pelan bermula apabila pembayaran disahkan, bukan apabila pesanan dibuat.',
    'plans.shelves':
      '{basic} membuka pelajaran. {plus} ialah pakej VIP: pelajaran yang sama, dan lebih lagi. Setiap pelan menyenaraikan apa yang dibukanya.',
    'plans.noRenew':
      'Tiada apa-apa yang dicaj semula secara automatik. Apabila tempoh tamat, pelan tamat melainkan dibayar semula.',
    'plans.closedLead': 'Pelan belum dijual.',
    'plans.closedBody':
      'Apabila dijual, setiap pelan dan harganya akan disenaraikan di sini. Sebelum itu tiada apa-apa yang boleh dibeli.',
    'plans.unread':
      'Pelan tidak dapat dibaca sekarang. Ini tidak bermakna tiada pelan. Cuba lagi sebentar lagi.',
    'plans.none': 'Tiada pelan dijual pada masa ini.',
    'plans.forWeek': 'Untuk satu minggu: {amount}',
    'plans.forMonth': 'Untuk satu bulan: {amount}',
    'plans.forQuarter': 'Untuk tiga bulan: {amount}',
    'plans.forYear': 'Untuk satu tahun: {amount}',
    'plans.forOnce': 'Satu bayaran: {amount}',
    'plans.adults': 'Tempat untuk dewasa: {count}',
    'plans.children': 'Tempat untuk kanak-kanak: {count}',
    'plans.opens': 'Apa yang dibukanya',
    'plans.subject': 'Setiap kursus dalam subjek ini: {name}',
    'plans.offline': 'Menyimpan pelajaran dalam aplikasi untuk ditonton tanpa sambungan',
    'plans.noPrice':
      'Pelan ini belum mempunyai harga untuk akaun anda, jadi ia tidak boleh dibeli di sini.',
    'plans.choose': 'Pilih pelan ini',
    'plans.payLede':
      'Pilih untuk siapa pelan ini dan cara membayarnya. Pelan bermula sebaik sahaja pembayaran disahkan.',
    'plans.notHere': 'Pelan ini tidak dijual, atau tiada pelan sedemikian.',
    'plans.whichPrice': 'Harga yang mana?',
    'plans.whoFor': 'Pelan ini untuk siapa?',
    'plans.forOne': 'Pelan ini untuk: {name}',
    'plans.nobodyLead': 'Belum ada sesiapa pada akaun anda yang boleh diliputi pelan ini.',
    'plans.nobodyBody':
      'Tempat untuk dewasa adalah untuk anda, setelah anda menjadi pelajar pada akaun ini. Tempat untuk kanak-kanak adalah untuk anak dalam keluarga anda.',
    'plans.noService': 'Jadi pelan belum boleh dibeli. Tiada pesanan dibuat.',
    'plans.noServiceHere':
      'Tiada perkhidmatan pembayaran yang disambungkan ke platform ini menerima mata wang harga pelan ini di sini: {currency}',
    'plans.approve':
      'Luluskan pembayaran pada telefon anda. Pelan bermula sebaik sahaja pembayaran disahkan. Ini mungkin mengambil sedikit masa.',
    'plans.waiting':
      'Ada pesanan untuk pelan ini yang menunggu pembayaran. Untuk bermula semula, batalkan dahulu pesanan itu dalam langganan anda.',
    'plans.haveLive': 'Akaun ini sudah mempunyai pelan ini. Ia berjalan hingga: {date}',
    'plans.whyGone': 'Pelan ini tidak lagi dijual. Tiada pesanan dibuat.',
    'plans.whyPrice':
      'Harga itu tidak lagi tersedia untuk akaun anda. Tiada pesanan dibuat. Buka semula senarai pelan untuk melihat harga semasa.',
    'plans.whySlot': 'Pelan ini tiada tempat untuk pelajar itu. Tiada pesanan dibuat.',
    'plans.whyAlready':
      'Akaun ini sudah mempunyai pelan ini, atau ada pesanan untuknya yang masih menunggu. Lihat langganan anda.',
    'plans.whyAccount':
      'Kedudukan anda dalam akaun pengebilan ini tidak membenarkan anda membayar daripadanya. Tiada pesanan dibuat.',
    'plans.whyLearner': 'Pelajar itu tidak boleh dipilih daripada akaun ini. Tiada pesanan dibuat.',
    'plans.whyClosed': 'Pelan belum dijual, jadi tiada pesanan dibuat. Tiada apa-apa yang dicaj.',
    'plans.whyChoose': 'Pilih untuk siapa pelan ini.',
    'plans.whyNoService':
      'Tiada perkhidmatan pembayaran yang dapat menerima pembayaran ini pada masa ini.',
    'plans.whyFailed': 'Pembayaran tidak dapat dimulakan.',
  },
  bn: {
    'plans.title': 'একটি শেখার প্ল্যান বেছে নিন',
    'plans.lede':
      'প্ল্যান যে শিক্ষার্থীদের অন্তর্ভুক্ত করে তাদের জন্য কোর্স খুলে দেয়, যে মেয়াদের টাকা দেওয়া হয়েছে সেই মেয়াদের জন্য। এটি পেমেন্ট নিশ্চিত হলে শুরু হয়, অর্ডার দেওয়ার সময় নয়।',
    'plans.shelves':
      '{basic} পাঠগুলো খুলে দেয়। {plus} হলো VIP প্যাকেজ: একই পাঠ, সঙ্গে আরও কিছু। প্রতিটি প্ল্যানে লেখা আছে সেটি কী খুলে দেয়।',
    'plans.noRenew':
      'কোনো টাকা আপনা থেকে আবার নেওয়া হয় না। মেয়াদ শেষ হলে প্ল্যান শেষ হয়, যদি না আবার টাকা দেওয়া হয়।',
    'plans.closedLead': 'প্ল্যান এখনও বিক্রির জন্য খোলা হয়নি।',
    'plans.closedBody':
      'খোলা হলে প্রতিটি প্ল্যান ও তার মূল্য এখানে তালিকাভুক্ত হবে। তার আগে কিছুই কেনা যাবে না।',
    'plans.unread':
      'প্ল্যানগুলো এখন পড়া যায়নি। এর মানে এই নয় যে কোনো প্ল্যান নেই। একটু পরে আবার চেষ্টা করুন।',
    'plans.none': 'এই মুহূর্তে কোনো প্ল্যান বিক্রির জন্য নেই।',
    'plans.forWeek': 'এক সপ্তাহের জন্য: {amount}',
    'plans.forMonth': 'এক মাসের জন্য: {amount}',
    'plans.forQuarter': 'তিন মাসের জন্য: {amount}',
    'plans.forYear': 'এক বছরের জন্য: {amount}',
    'plans.forOnce': 'একবারের পেমেন্ট: {amount}',
    'plans.adults': 'প্রাপ্তবয়স্কদের জন্য জায়গা: {count}',
    'plans.children': 'শিশুদের জন্য জায়গা: {count}',
    'plans.opens': 'এটি কী খুলে দেয়',
    'plans.subject': 'এই বিষয়ের প্রতিটি কোর্স: {name}',
    'plans.offline': 'পাঠ অ্যাপে সংরক্ষণ করা, যাতে সংযোগ ছাড়াই দেখা যায়',
    'plans.noPrice':
      'আপনার অ্যাকাউন্টের জন্য এই প্ল্যানের এখনও কোনো মূল্য নেই, তাই এটি এখানে কেনা যাবে না।',
    'plans.choose': 'এই প্ল্যানটি বেছে নিন',
    'plans.payLede':
      'এই প্ল্যান কার জন্য এবং কীভাবে পেমেন্ট হবে তা বেছে নিন। পেমেন্ট নিশ্চিত হলেই প্ল্যান শুরু হয়।',
    'plans.notHere': 'এই প্ল্যান বিক্রির জন্য নেই, অথবা এমন কোনো প্ল্যান নেই।',
    'plans.whichPrice': 'কোন মূল্য?',
    'plans.whoFor': 'এই প্ল্যান কার জন্য?',
    'plans.forOne': 'এই প্ল্যান যার জন্য: {name}',
    'plans.nobodyLead': 'আপনার অ্যাকাউন্টে এখনও এমন কেউ নেই যাকে এই প্ল্যান অন্তর্ভুক্ত করতে পারে।',
    'plans.nobodyBody':
      'প্রাপ্তবয়স্কের জায়গাটি আপনার জন্য, আপনি এই অ্যাকাউন্টে শিক্ষার্থী হলে। শিশুর জায়গাটি আপনার পরিবারের কোনো শিশুর জন্য।',
    'plans.noService': 'তাই এখনও কোনো প্ল্যান কেনা যাবে না। কোনো অর্ডার দেওয়া হয়নি।',
    'plans.noServiceHere':
      'এই প্ল্যাটফর্মে সংযুক্ত কোনো পেমেন্ট সেবা সেই মুদ্রা গ্রহণ করে না যে মুদ্রায় এখানে এই প্ল্যানের মূল্য ধরা হয়েছে: {currency}',
    'plans.approve':
      'আপনার ফোনে পেমেন্ট অনুমোদন করুন। পেমেন্ট নিশ্চিত হলেই প্ল্যান শুরু হবে। এতে কিছুটা সময় লাগতে পারে।',
    'plans.waiting':
      'এই প্ল্যানের একটি অর্ডার পেমেন্টের অপেক্ষায় আছে। নতুন করে শুরু করতে আগে সেটি আপনার সাবস্ক্রিপশন থেকে বাতিল করুন।',
    'plans.haveLive': 'এই অ্যাকাউন্টে এই প্ল্যান আগে থেকেই আছে। এটি চলবে এই সময় পর্যন্ত: {date}',
    'plans.whyGone': 'এই প্ল্যান আর বিক্রির জন্য নেই। কোনো অর্ডার দেওয়া হয়নি।',
    'plans.whyPrice':
      'ওই মূল্য আর আপনার অ্যাকাউন্টের জন্য নেই। কোনো অর্ডার দেওয়া হয়নি। বর্তমান মূল্য দেখতে প্ল্যানগুলো আবার খুলুন।',
    'plans.whySlot': 'এই প্ল্যানে ওই শিক্ষার্থীর জন্য কোনো জায়গা নেই। কোনো অর্ডার দেওয়া হয়নি।',
    'plans.whyAlready':
      'এই অ্যাকাউন্টে এই প্ল্যান আগে থেকেই আছে, অথবা এর একটি অর্ডার এখনও অপেক্ষায় আছে। আপনার সাবস্ক্রিপশন দেখুন।',
    'plans.whyAccount':
      'এই বিলিং অ্যাকাউন্টে আপনার অবস্থান আপনাকে এখান থেকে পেমেন্ট করার অনুমতি দেয় না। কোনো অর্ডার দেওয়া হয়নি।',
    'plans.whyLearner':
      'ওই শিক্ষার্থীকে এই অ্যাকাউন্ট থেকে বেছে নেওয়া যাবে না। কোনো অর্ডার দেওয়া হয়নি।',
    'plans.whyClosed':
      'প্ল্যান এখনও বিক্রির জন্য খোলা হয়নি, তাই কোনো অর্ডার দেওয়া হয়নি। কোনো টাকা নেওয়া হয়নি।',
    'plans.whyChoose': 'এই প্ল্যান কার জন্য তা বেছে নিন।',
    'plans.whyNoService': 'এই মুহূর্তে কোনো পেমেন্ট সেবা এই পেমেন্ট নিতে পারছে না।',
    'plans.whyFailed': 'পেমেন্ট শুরু করা যায়নি।',
  },
  hi: {
    'plans.title': 'सीखने की योजना चुनें',
    'plans.lede':
      'योजना उन शिक्षार्थियों के लिए कोर्स खोलती है जो उसमें शामिल हैं, उस अवधि के लिए जिसका भुगतान किया गया है। यह भुगतान की पुष्टि होने पर शुरू होती है, ऑर्डर देने पर नहीं।',
    'plans.shelves':
      '{basic} पाठ खोलता है। {plus} VIP पैकेज है: वही पाठ, और उनके साथ कुछ और भी। हर योजना बताती है कि वह क्या खोलती है।',
    'plans.noRenew':
      'कोई राशि अपने आप दोबारा नहीं ली जाती। अवधि समाप्त होने पर योजना समाप्त हो जाती है, जब तक दोबारा भुगतान न किया जाए।',
    'plans.closedLead': 'योजनाएँ अभी बिक्री के लिए नहीं हैं।',
    'plans.closedBody':
      'जब होंगी, तो हर योजना और उसकी क़ीमत यहाँ सूचीबद्ध होगी। उससे पहले कुछ नहीं ख़रीदा जा सकता।',
    'plans.unread':
      'योजनाएँ अभी पढ़ी नहीं जा सकीं। इसका यह अर्थ नहीं कि कोई योजना नहीं है। थोड़ी देर में फिर कोशिश करें।',
    'plans.none': 'इस समय कोई योजना बिक्री के लिए नहीं है।',
    'plans.forWeek': 'एक सप्ताह के लिए: {amount}',
    'plans.forMonth': 'एक महीने के लिए: {amount}',
    'plans.forQuarter': 'तीन महीनों के लिए: {amount}',
    'plans.forYear': 'एक साल के लिए: {amount}',
    'plans.forOnce': 'एक ही भुगतान: {amount}',
    'plans.adults': 'वयस्कों के लिए स्थान: {count}',
    'plans.children': 'बच्चों के लिए स्थान: {count}',
    'plans.opens': 'यह क्या खोलती है',
    'plans.subject': 'इस विषय का हर कोर्स: {name}',
    'plans.offline': 'पाठ ऐप में सहेजना, ताकि बिना कनेक्शन के देखे जा सकें',
    'plans.noPrice':
      'इस योजना की आपके खाते के लिए अभी कोई क़ीमत नहीं है, इसलिए इसे यहाँ नहीं ख़रीदा जा सकता।',
    'plans.choose': 'यह योजना चुनें',
    'plans.payLede':
      'चुनें कि यह योजना किसके लिए है और भुगतान कैसे होगा। भुगतान की पुष्टि होते ही योजना शुरू होती है।',
    'plans.notHere': 'यह योजना बिक्री के लिए नहीं है, या ऐसी कोई योजना नहीं है।',
    'plans.whichPrice': 'कौन-सी क़ीमत?',
    'plans.whoFor': 'यह योजना किसके लिए है?',
    'plans.forOne': 'यह योजना इनके लिए है: {name}',
    'plans.nobodyLead': 'आपके खाते पर अभी कोई ऐसा नहीं है जिसे यह योजना शामिल कर सके।',
    'plans.nobodyBody':
      'वयस्क का स्थान आपके लिए है, जब आप इस खाते पर शिक्षार्थी बन जाएँ। बच्चे का स्थान आपके परिवार के किसी बच्चे के लिए है।',
    'plans.noService': 'इसलिए अभी कोई योजना नहीं ख़रीदी जा सकती। कोई ऑर्डर नहीं दिया गया है।',
    'plans.noServiceHere':
      'इस प्लेटफ़ॉर्म से जुड़ी कोई भुगतान सेवा वह मुद्रा नहीं लेती जिसमें यहाँ इस योजना की क़ीमत रखी गई है: {currency}',
    'plans.approve':
      'अपने फ़ोन पर भुगतान स्वीकृत करें। भुगतान की पुष्टि होते ही योजना शुरू हो जाएगी। इसमें थोड़ा समय लग सकता है।',
    'plans.waiting':
      'इस योजना का एक ऑर्डर भुगतान की प्रतीक्षा में है। नए सिरे से शुरू करने के लिए पहले उसे अपनी सदस्यताओं में रद्द करें।',
    'plans.haveLive': 'इस खाते के पास यह योजना पहले से है। यह इस समय तक चलेगी: {date}',
    'plans.whyGone': 'यह योजना अब बिक्री के लिए नहीं है। कोई ऑर्डर नहीं दिया गया।',
    'plans.whyPrice':
      'वह क़ीमत अब आपके खाते के लिए उपलब्ध नहीं है। कोई ऑर्डर नहीं दिया गया। मौजूदा क़ीमत देखने के लिए योजनाएँ फिर से खोलें।',
    'plans.whySlot':
      'इस योजना में उस शिक्षार्थी के लिए कोई स्थान नहीं है। कोई ऑर्डर नहीं दिया गया।',
    'plans.whyAlready':
      'इस खाते के पास यह योजना पहले से है, या इसका कोई ऑर्डर अभी प्रतीक्षा में है। अपनी सदस्यताएँ देखें।',
    'plans.whyAccount':
      'इस बिलिंग खाते में आपकी स्थिति आपको इससे भुगतान करने की अनुमति नहीं देती। कोई ऑर्डर नहीं दिया गया।',
    'plans.whyLearner': 'उस शिक्षार्थी को इस खाते से नहीं चुना जा सकता। कोई ऑर्डर नहीं दिया गया।',
    'plans.whyClosed':
      'योजनाएँ अभी बिक्री के लिए नहीं हैं, इसलिए कोई ऑर्डर नहीं दिया गया। कोई राशि नहीं ली गई है।',
    'plans.whyChoose': 'चुनें कि यह योजना किसके लिए है।',
    'plans.whyNoService': 'इस समय कोई भुगतान सेवा यह भुगतान नहीं ले सकती।',
    'plans.whyFailed': 'भुगतान शुरू नहीं हो सका।',
  },
  fr: {
    'plans.title': 'Choisissez une formule d’apprentissage',
    'plans.lede':
      'Une formule ouvre des cours aux apprenants qu’elle couvre, pour la période payée. Elle commence quand le paiement est confirmé, et non quand la commande est passée.',
    'plans.shelves':
      '{basic} ouvre les leçons. {plus} est la formule VIP : les mêmes leçons, et davantage. Chaque formule indique ce qu’elle ouvre.',
    'plans.noRenew':
      'Rien n’est prélevé de nouveau automatiquement. À la fin de la période, la formule prend fin, sauf si elle est payée de nouveau.',
    'plans.closedLead': 'Les formules ne sont pas encore en vente.',
    'plans.closedBody':
      'Quand elles le seront, chaque formule et son prix figureront ici. Rien ne peut être acheté avant.',
    'plans.unread':
      'Les formules n’ont pas pu être lues pour le moment. Cela ne veut pas dire qu’il n’y en a pas. Réessayez dans un instant.',
    'plans.none': 'Aucune formule n’est en vente pour le moment.',
    'plans.forWeek': 'Pour une semaine : {amount}',
    'plans.forMonth': 'Pour un mois : {amount}',
    'plans.forQuarter': 'Pour trois mois : {amount}',
    'plans.forYear': 'Pour un an : {amount}',
    'plans.forOnce': 'Un seul paiement : {amount}',
    'plans.adults': 'Places pour adultes : {count}',
    'plans.children': 'Places pour enfants : {count}',
    'plans.opens': 'Ce qu’elle ouvre',
    'plans.subject': 'Tous les cours de cette matière : {name}',
    'plans.offline': 'Enregistrer des leçons dans l’application, pour les regarder sans connexion',
    'plans.noPrice':
      'Cette formule n’a pas encore de prix pour votre compte ; elle ne peut donc pas être achetée ici.',
    'plans.choose': 'Choisir cette formule',
    'plans.payLede':
      'Choisissez à qui cette formule est destinée et comment payer. La formule commence dès que le paiement est confirmé.',
    'plans.notHere': 'Cette formule n’est pas en vente, ou elle n’existe pas.',
    'plans.whichPrice': 'Quel prix ?',
    'plans.whoFor': 'À qui cette formule est-elle destinée ?',
    'plans.forOne': 'Cette formule est destinée à : {name}',
    'plans.nobodyLead':
      'Il n’y a encore personne sur votre compte que cette formule puisse couvrir.',
    'plans.nobodyBody':
      'Une place pour adulte est pour vous, une fois que vous êtes apprenant sur ce compte. Une place pour enfant est pour un enfant de votre famille.',
    'plans.noService':
      'Aucune formule ne peut donc encore être achetée. Aucune commande n’a été passée.',
    'plans.noServiceHere':
      'Aucun service de paiement connecté à cette plateforme n’encaisse la devise dans laquelle cette formule est tarifée ici : {currency}',
    'plans.approve':
      'Approuvez le paiement sur votre téléphone. La formule commence dès que le paiement est confirmé. Cela peut prendre un moment.',
    'plans.waiting':
      'Une commande pour cette formule attend son paiement. Pour recommencer, annulez-la d’abord dans vos abonnements.',
    'plans.haveLive': 'Ce compte a déjà cette formule. Elle court jusqu’au : {date}',
    'plans.whyGone': 'Cette formule n’est plus en vente. Aucune commande n’a été passée.',
    'plans.whyPrice':
      'Ce prix n’est plus disponible pour votre compte. Aucune commande n’a été passée. Rouvrez les formules pour voir le prix actuel.',
    'plans.whySlot':
      'Cette formule n’a pas de place pour cet apprenant. Aucune commande n’a été passée.',
    'plans.whyAlready':
      'Ce compte a déjà cette formule, ou une commande pour elle attend encore. Consultez vos abonnements.',
    'plans.whyAccount':
      'Votre place sur ce compte de facturation ne vous permet pas de payer depuis celui-ci. Aucune commande n’a été passée.',
    'plans.whyLearner':
      'Cet apprenant ne peut pas être choisi depuis ce compte. Aucune commande n’a été passée.',
    'plans.whyClosed':
      'Les formules ne sont pas encore en vente ; aucune commande n’a donc été passée. Rien n’a été débité.',
    'plans.whyChoose': 'Choisissez à qui cette formule est destinée.',
    'plans.whyNoService': 'Aucun service de paiement ne peut encaisser ce paiement pour le moment.',
    'plans.whyFailed': 'Le paiement n’a pas pu être lancé.',
  },
  es: {
    'plans.title': 'Elija un plan de aprendizaje',
    'plans.lede':
      'Un plan abre cursos para los alumnos que cubre, durante el periodo pagado. Empieza cuando se confirma el pago, no cuando se hace el pedido.',
    'plans.shelves':
      '{basic} abre las lecciones. {plus} es el paquete VIP: las mismas lecciones y algo más. Cada plan indica lo que abre.',
    'plans.noRenew':
      'No se cobra nada de nuevo automáticamente. Cuando termina el periodo, el plan termina, salvo que se pague otra vez.',
    'plans.closedLead': 'Los planes todavía no están a la venta.',
    'plans.closedBody':
      'Cuando lo estén, cada plan y su precio aparecerán aquí. Antes no se puede comprar nada.',
    'plans.unread':
      'No se pudieron leer los planes en este momento. Esto no significa que no haya ninguno. Inténtelo de nuevo en un momento.',
    'plans.none': 'No hay ningún plan a la venta en este momento.',
    'plans.forWeek': 'Por una semana: {amount}',
    'plans.forMonth': 'Por un mes: {amount}',
    'plans.forQuarter': 'Por tres meses: {amount}',
    'plans.forYear': 'Por un año: {amount}',
    'plans.forOnce': 'Un solo pago: {amount}',
    'plans.adults': 'Plazas para adultos: {count}',
    'plans.children': 'Plazas para niños: {count}',
    'plans.opens': 'Lo que abre',
    'plans.subject': 'Todos los cursos de esta materia: {name}',
    'plans.offline': 'Guardar lecciones en la aplicación para verlas sin conexión',
    'plans.noPrice':
      'Este plan todavía no tiene precio para su cuenta, así que no se puede comprar aquí.',
    'plans.choose': 'Elegir este plan',
    'plans.payLede':
      'Elija para quién es este plan y cómo pagar. El plan empieza cuando se confirma el pago.',
    'plans.notHere': 'Este plan no está a la venta, o no existe.',
    'plans.whichPrice': '¿Qué precio?',
    'plans.whoFor': '¿Para quién es este plan?',
    'plans.forOne': 'Este plan es para: {name}',
    'plans.nobodyLead': 'Todavía no hay nadie en su cuenta a quien este plan pueda cubrir.',
    'plans.nobodyBody':
      'Una plaza de adulto es para usted, cuando sea alumno en esta cuenta. Una plaza de niño es para un niño de su familia.',
    'plans.noService': 'Así que todavía no se puede comprar un plan. No se ha hecho ningún pedido.',
    'plans.noServiceHere':
      'Ningún servicio de pagos conectado a esta plataforma cobra en la moneda en la que este plan tiene precio aquí: {currency}',
    'plans.approve':
      'Apruebe el pago en su teléfono. El plan empieza cuando se confirma el pago. Puede tardar un momento.',
    'plans.waiting':
      'Hay un pedido de este plan a la espera de pago. Para empezar de nuevo, cancélelo primero en sus suscripciones.',
    'plans.haveLive': 'Esta cuenta ya tiene este plan. Dura hasta: {date}',
    'plans.whyGone': 'Este plan ya no está a la venta. No se hizo ningún pedido.',
    'plans.whyPrice':
      'Ese precio ya no está disponible para su cuenta. No se hizo ningún pedido. Abra de nuevo los planes para ver el precio actual.',
    'plans.whySlot': 'Este plan no tiene plaza para ese alumno. No se hizo ningún pedido.',
    'plans.whyAlready':
      'Esta cuenta ya tiene este plan, o un pedido de él que sigue a la espera. Consulte sus suscripciones.',
    'plans.whyAccount':
      'Su lugar en esta cuenta de facturación no le permite pagar desde ella. No se hizo ningún pedido.',
    'plans.whyLearner':
      'Ese alumno no se puede elegir desde esta cuenta. No se hizo ningún pedido.',
    'plans.whyClosed':
      'Los planes todavía no están a la venta, así que no se hizo ningún pedido. No se ha cobrado nada.',
    'plans.whyChoose': 'Elija para quién es este plan.',
    'plans.whyNoService': 'Ningún servicio de pagos puede cobrar este pago en este momento.',
    'plans.whyFailed': 'No se pudo iniciar el pago.',
  },
  pt: {
    'plans.title': 'Escolha um plano de aprendizagem',
    'plans.lede':
      'Um plano abre cursos aos alunos que abrange, durante o período pago. Começa quando o pagamento é confirmado, e não quando a encomenda é feita.',
    'plans.shelves':
      '{basic} abre as lições. {plus} é o pacote VIP: as mesmas lições e algo mais. Cada plano indica o que abre.',
    'plans.noRenew':
      'Nada volta a ser cobrado automaticamente. Quando o período termina, o plano termina, a menos que seja pago de novo.',
    'plans.closedLead': 'Os planos ainda não estão à venda.',
    'plans.closedBody':
      'Quando estiverem, cada plano e o seu preço aparecerão aqui. Antes disso nada pode ser comprado.',
    'plans.unread':
      'Não foi possível ler os planos neste momento. Isto não significa que não exista nenhum. Tente de novo daqui a pouco.',
    'plans.none': 'Não há nenhum plano à venda neste momento.',
    'plans.forWeek': 'Por uma semana: {amount}',
    'plans.forMonth': 'Por um mês: {amount}',
    'plans.forQuarter': 'Por três meses: {amount}',
    'plans.forYear': 'Por um ano: {amount}',
    'plans.forOnce': 'Um só pagamento: {amount}',
    'plans.adults': 'Lugares para adultos: {count}',
    'plans.children': 'Lugares para crianças: {count}',
    'plans.opens': 'O que abre',
    'plans.subject': 'Todos os cursos desta área: {name}',
    'plans.offline': 'Guardar lições na aplicação, para ver sem ligação',
    'plans.noPrice':
      'Este plano ainda não tem preço para a sua conta, por isso não pode ser comprado aqui.',
    'plans.choose': 'Escolher este plano',
    'plans.payLede':
      'Escolha a quem se destina este plano e como pagar. O plano começa assim que o pagamento for confirmado.',
    'plans.notHere': 'Este plano não está à venda, ou não existe.',
    'plans.whichPrice': 'Que preço?',
    'plans.whoFor': 'A quem se destina este plano?',
    'plans.forOne': 'Este plano destina-se a: {name}',
    'plans.nobodyLead': 'Ainda não há ninguém na sua conta que este plano possa abranger.',
    'plans.nobodyBody':
      'Um lugar de adulto é para si, quando for aluno nesta conta. Um lugar de criança é para uma criança da sua família.',
    'plans.noService':
      'Por isso ainda não é possível comprar um plano. Nenhuma encomenda foi feita.',
    'plans.noServiceHere':
      'Nenhum serviço de pagamentos ligado a esta plataforma cobra na moeda em que este plano tem preço aqui: {currency}',
    'plans.approve':
      'Aprove o pagamento no seu telemóvel. O plano começa assim que o pagamento for confirmado. Pode demorar um momento.',
    'plans.waiting':
      'Há uma encomenda deste plano à espera de pagamento. Para recomeçar, cancele-a primeiro nas suas subscrições.',
    'plans.haveLive': 'Esta conta já tem este plano. Dura até: {date}',
    'plans.whyGone': 'Este plano já não está à venda. Nenhuma encomenda foi feita.',
    'plans.whyPrice':
      'Esse preço já não está disponível para a sua conta. Nenhuma encomenda foi feita. Abra de novo os planos para ver o preço atual.',
    'plans.whySlot': 'Este plano não tem lugar para esse aluno. Nenhuma encomenda foi feita.',
    'plans.whyAlready':
      'Esta conta já tem este plano, ou uma encomenda dele que continua à espera. Consulte as suas subscrições.',
    'plans.whyAccount':
      'O seu lugar nesta conta de faturação não lhe permite pagar a partir dela. Nenhuma encomenda foi feita.',
    'plans.whyLearner':
      'Esse aluno não pode ser escolhido a partir desta conta. Nenhuma encomenda foi feita.',
    'plans.whyClosed':
      'Os planos ainda não estão à venda, por isso nenhuma encomenda foi feita. Nada foi cobrado.',
    'plans.whyChoose': 'Escolha a quem se destina este plano.',
    'plans.whyNoService': 'Nenhum serviço de pagamentos pode receber este pagamento neste momento.',
    'plans.whyFailed': 'Não foi possível iniciar o pagamento.',
  },
  sw: {
    'plans.title': 'Chagua mpango wa kujifunza',
    'plans.lede':
      'Mpango hufungua kozi kwa wanafunzi unaowahusu, kwa kipindi kilicholipiwa. Huanza malipo yanapothibitishwa, si agizo linapowekwa.',
    'plans.shelves':
      '{basic} hufungua masomo. {plus} ni kifurushi cha VIP: masomo yaleyale na zaidi. Kila mpango hutaja kile unachofungua.',
    'plans.noRenew':
      'Hakuna kiasi kinachotozwa tena chenyewe. Kipindi kinapoisha, mpango huisha isipokuwa ukilipiwa tena.',
    'plans.closedLead': 'Mipango bado haiuzwi.',
    'plans.closedBody':
      'Itakapoanza kuuzwa, kila mpango na bei yake vitaorodheshwa hapa. Kabla ya hapo hakuna kinachoweza kununuliwa.',
    'plans.unread':
      'Mipango haikuweza kusomwa sasa hivi. Hii haimaanishi kwamba hakuna mpango. Jaribu tena baada ya muda mfupi.',
    'plans.none': 'Hakuna mpango unaouzwa kwa sasa.',
    'plans.forWeek': 'Kwa wiki moja: {amount}',
    'plans.forMonth': 'Kwa mwezi mmoja: {amount}',
    'plans.forQuarter': 'Kwa miezi mitatu: {amount}',
    'plans.forYear': 'Kwa mwaka mmoja: {amount}',
    'plans.forOnce': 'Malipo ya mara moja: {amount}',
    'plans.adults': 'Nafasi za watu wazima: {count}',
    'plans.children': 'Nafasi za watoto: {count}',
    'plans.opens': 'Unachofungua',
    'plans.subject': 'Kila kozi katika somo hili: {name}',
    'plans.offline': 'Kuhifadhi masomo ndani ya programu, ili kuyatazama bila mtandao',
    'plans.noPrice':
      'Mpango huu bado hauna bei kwa akaunti yako, kwa hiyo hauwezi kununuliwa hapa.',
    'plans.choose': 'Chagua mpango huu',
    'plans.payLede':
      'Chagua mpango huu ni wa nani na jinsi ya kulipa. Mpango huanza malipo yanapothibitishwa.',
    'plans.notHere': 'Mpango huu hauuzwi, au hakuna mpango kama huo.',
    'plans.whichPrice': 'Bei ipi?',
    'plans.whoFor': 'Mpango huu ni wa nani?',
    'plans.forOne': 'Mpango huu ni wa: {name}',
    'plans.nobodyLead': 'Bado hakuna mtu kwenye akaunti yako ambaye mpango huu unaweza kumhusu.',
    'plans.nobodyBody':
      'Nafasi ya mtu mzima ni yako, ukishakuwa mwanafunzi kwenye akaunti hii. Nafasi ya mtoto ni ya mtoto katika familia yako.',
    'plans.noService': 'Kwa hiyo mpango hauwezi kununuliwa bado. Hakuna agizo lililowekwa.',
    'plans.noServiceHere':
      'Hakuna huduma ya malipo iliyounganishwa na jukwaa hili inayopokea sarafu ambayo mpango huu umewekewa bei hapa: {currency}',
    'plans.approve':
      'Idhinisha malipo kwenye simu yako. Mpango huanza malipo yanapothibitishwa. Hii inaweza kuchukua muda kidogo.',
    'plans.waiting':
      'Kuna agizo la mpango huu linalosubiri malipo. Ili kuanza upya, lifute kwanza kwenye usajili wako.',
    'plans.haveLive': 'Akaunti hii tayari ina mpango huu. Unaendelea hadi: {date}',
    'plans.whyGone': 'Mpango huu hauuzwi tena. Hakuna agizo lililowekwa.',
    'plans.whyPrice':
      'Bei hiyo haipatikani tena kwa akaunti yako. Hakuna agizo lililowekwa. Fungua mipango tena uone bei ya sasa.',
    'plans.whySlot': 'Mpango huu hauna nafasi kwa mwanafunzi huyo. Hakuna agizo lililowekwa.',
    'plans.whyAlready':
      'Akaunti hii tayari ina mpango huu, au agizo lake ambalo bado linasubiri. Angalia usajili wako.',
    'plans.whyAccount':
      'Nafasi yako kwenye akaunti hii ya malipo haikuruhusu kulipa kutoka kwayo. Hakuna agizo lililowekwa.',
    'plans.whyLearner':
      'Mwanafunzi huyo hawezi kuchaguliwa kutoka akaunti hii. Hakuna agizo lililowekwa.',
    'plans.whyClosed':
      'Mipango bado haiuzwi, kwa hiyo hakuna agizo lililowekwa. Hakuna kiasi kilichotozwa.',
    'plans.whyChoose': 'Chagua mpango huu ni wa nani.',
    'plans.whyNoService': 'Hakuna huduma ya malipo inayoweza kupokea malipo haya kwa sasa.',
    'plans.whyFailed': 'Malipo hayakuweza kuanzishwa.',
  },
  af: {
    'plans.title': 'Kies ’n leerplan',
    'plans.lede':
      '’n Plan maak kursusse oop vir die leerders wat dit dek, vir die tydperk waarvoor betaal is. Dit begin wanneer die betaling bevestig is, nie wanneer die bestelling geplaas word nie.',
    'plans.shelves':
      '{basic} maak die lesse oop. {plus} is die VIP-pakket: dieselfde lesse, en meer. Elke plan noem wat dit oopmaak.',
    'plans.noRenew':
      'Niks word outomaties weer gehef nie. Wanneer die tydperk eindig, eindig die plan, tensy daar weer daarvoor betaal word.',
    'plans.closedLead': 'Planne is nog nie te koop nie.',
    'plans.closedBody':
      'Wanneer hulle is, sal elke plan en sy prys hier gelys word. Voor dit kan niks gekoop word nie.',
    'plans.unread':
      'Die planne kon nie nou gelees word nie. Dit beteken nie dat daar geen is nie. Probeer oor ’n oomblik weer.',
    'plans.none': 'Geen plan is op die oomblik te koop nie.',
    'plans.forWeek': 'Vir een week: {amount}',
    'plans.forMonth': 'Vir een maand: {amount}',
    'plans.forQuarter': 'Vir drie maande: {amount}',
    'plans.forYear': 'Vir een jaar: {amount}',
    'plans.forOnce': 'Een betaling: {amount}',
    'plans.adults': 'Plekke vir volwassenes: {count}',
    'plans.children': 'Plekke vir kinders: {count}',
    'plans.opens': 'Wat dit oopmaak',
    'plans.subject': 'Elke kursus in hierdie vak: {name}',
    'plans.offline': 'Lesse in die toepassing stoor, om sonder verbinding te kyk',
    'plans.noPrice':
      'Hierdie plan het nog nie ’n prys vir jou rekening nie, dus kan dit nie hier gekoop word nie.',
    'plans.choose': 'Kies hierdie plan',
    'plans.payLede':
      'Kies vir wie hierdie plan is en hoe om te betaal. Die plan begin sodra die betaling bevestig is.',
    'plans.notHere': 'Hierdie plan is nie te koop nie, of daar is nie so ’n plan nie.',
    'plans.whichPrice': 'Watter prys?',
    'plans.whoFor': 'Vir wie is hierdie plan?',
    'plans.forOne': 'Hierdie plan is vir: {name}',
    'plans.nobodyLead': 'Daar is nog niemand op jou rekening wat hierdie plan kan dek nie.',
    'plans.nobodyBody':
      '’n Plek vir ’n volwassene is vir jou, sodra jy ’n leerder op hierdie rekening is. ’n Plek vir ’n kind is vir ’n kind in jou gesin.',
    'plans.noService': 'Dus kan ’n plan nog nie gekoop word nie. Geen bestelling is geplaas nie.',
    'plans.noServiceHere':
      'Geen betalingsdiens wat aan hierdie platform gekoppel is, vorder die geldeenheid in waarin hierdie plan hier geprys is nie: {currency}',
    'plans.approve':
      'Keur die betaling op jou foon goed. Die plan begin sodra die betaling bevestig is. Dit kan ’n oomblik neem.',
    'plans.waiting':
      '’n Bestelling vir hierdie plan wag op betaling. Om weer te begin, kanselleer dit eers onder jou subskripsies.',
    'plans.haveLive': 'Hierdie rekening het reeds hierdie plan. Dit loop tot: {date}',
    'plans.whyGone': 'Hierdie plan is nie meer te koop nie. Geen bestelling is geplaas nie.',
    'plans.whyPrice':
      'Daardie prys is nie meer vir jou rekening beskikbaar nie. Geen bestelling is geplaas nie. Maak die planne weer oop om die huidige prys te sien.',
    'plans.whySlot':
      'Hierdie plan het geen plek vir daardie leerder nie. Geen bestelling is geplaas nie.',
    'plans.whyAlready':
      'Hierdie rekening het reeds hierdie plan, of ’n bestelling daarvoor wat nog wag. Kyk na jou subskripsies.',
    'plans.whyAccount':
      'Jou plek op hierdie faktuurrekening laat jou nie toe om daaruit te betaal nie. Geen bestelling is geplaas nie.',
    'plans.whyLearner':
      'Daardie leerder kan nie vanaf hierdie rekening gekies word nie. Geen bestelling is geplaas nie.',
    'plans.whyClosed':
      'Planne is nog nie te koop nie, dus is geen bestelling geplaas nie. Niks is gehef nie.',
    'plans.whyChoose': 'Kies vir wie hierdie plan is.',
    'plans.whyNoService': 'Geen betalingsdiens kan hierdie betaling op die oomblik neem nie.',
    'plans.whyFailed': 'Die betaling kon nie begin word nie.',
  },
  'zh-hans': {
    'plans.title': '选择学习方案',
    'plans.lede': '方案在已付费的期限内，为它所涵盖的学习者开放课程。它在付款确认时开始，而不是在下单时。',
    'plans.shelves':
      '{basic}开放课程内容。{plus}是 VIP 套餐：课程相同，另有更多内容。每个方案都会列出它开放的内容。',
    'plans.noRenew': '不会自动再次扣款。期限结束时方案即结束，除非再次付款。',
    'plans.closedLead': '方案尚未开售。',
    'plans.closedBody': '开售后，每个方案及其价格会列在这里。在此之前无法购买任何内容。',
    'plans.unread': '暂时无法读取方案。这并不表示没有方案。请稍后再试。',
    'plans.none': '目前没有在售的方案。',
    'plans.forWeek': '一周：{amount}',
    'plans.forMonth': '一个月：{amount}',
    'plans.forQuarter': '三个月：{amount}',
    'plans.forYear': '一年：{amount}',
    'plans.forOnce': '一次性付款：{amount}',
    'plans.adults': '成人名额：{count}',
    'plans.children': '儿童名额：{count}',
    'plans.opens': '它开放的内容',
    'plans.subject': '此科目的全部课程：{name}',
    'plans.offline': '将课程保存在应用内，无需联网即可观看',
    'plans.noPrice': '此方案尚未为您的账户定价，因此无法在这里购买。',
    'plans.choose': '选择此方案',
    'plans.payLede': '请选择此方案为谁购买以及如何付款。付款确认后方案即开始。',
    'plans.notHere': '此方案未在售，或没有这样的方案。',
    'plans.whichPrice': '选择哪个价格？',
    'plans.whoFor': '此方案为谁购买？',
    'plans.forOne': '此方案的使用者：{name}',
    'plans.nobodyLead': '您的账户上还没有此方案可以涵盖的人。',
    'plans.nobodyBody': '成人名额属于您本人，前提是您已成为此账户上的学习者。儿童名额属于您家庭中的一位儿童。',
    'plans.noService': '因此目前还不能购买方案。没有下单。',
    'plans.noServiceHere': '接入本平台的支付服务中，没有一个收取此方案在这里定价所用的货币：{currency}',
    'plans.approve': '请在您的手机上批准付款。付款确认后方案即开始。这可能需要一点时间。',
    'plans.waiting': '此方案有一笔订单正在等待付款。若要重新开始，请先在您的订阅中取消它。',
    'plans.haveLive': '此账户已有此方案。有效期至：{date}',
    'plans.whyGone': '此方案已不再出售。没有下单。',
    'plans.whyPrice': '该价格已不再适用于您的账户。没有下单。请重新打开方案页面查看当前价格。',
    'plans.whySlot': '此方案没有适合该学习者的名额。没有下单。',
    'plans.whyAlready': '此账户已有此方案，或有一笔它的订单仍在等待。请查看您的订阅。',
    'plans.whyAccount': '您在此账单账户中的身份不允许您用它付款。没有下单。',
    'plans.whyLearner': '无法从此账户选择该学习者。没有下单。',
    'plans.whyClosed': '方案尚未开售，因此没有下单。未收取任何费用。',
    'plans.whyChoose': '请选择此方案为谁购买。',
    'plans.whyNoService': '目前没有支付服务可以收取这笔付款。',
    'plans.whyFailed': '无法发起付款。',
  },
  'zh-hant': {
    'plans.title': '選擇學習方案',
    'plans.lede': '方案在已付費的期間內，為它所涵蓋的學習者開放課程。它在付款確認時開始，而不是在下單時。',
    'plans.shelves':
      '{basic}開放課程內容。{plus}是 VIP 套餐：課程相同，另有更多內容。每個方案都會列出它開放的內容。',
    'plans.noRenew': '不會自動再次扣款。期間結束時方案即結束，除非再次付款。',
    'plans.closedLead': '方案尚未開賣。',
    'plans.closedBody': '開賣後，每個方案及其價格會列在這裡。在此之前無法購買任何內容。',
    'plans.unread': '暫時無法讀取方案。這並不表示沒有方案。請稍後再試。',
    'plans.none': '目前沒有販售中的方案。',
    'plans.forWeek': '一週：{amount}',
    'plans.forMonth': '一個月：{amount}',
    'plans.forQuarter': '三個月：{amount}',
    'plans.forYear': '一年：{amount}',
    'plans.forOnce': '一次性付款：{amount}',
    'plans.adults': '成人名額：{count}',
    'plans.children': '兒童名額：{count}',
    'plans.opens': '它開放的內容',
    'plans.subject': '此科目的全部課程：{name}',
    'plans.offline': '將課程儲存在應用程式內，無需連線即可觀看',
    'plans.noPrice': '此方案尚未為您的帳號定價，因此無法在這裡購買。',
    'plans.choose': '選擇此方案',
    'plans.payLede': '請選擇此方案為誰購買以及如何付款。付款確認後方案即開始。',
    'plans.notHere': '此方案未在販售，或沒有這樣的方案。',
    'plans.whichPrice': '選擇哪個價格？',
    'plans.whoFor': '此方案為誰購買？',
    'plans.forOne': '此方案的使用者：{name}',
    'plans.nobodyLead': '您的帳號上還沒有此方案可以涵蓋的人。',
    'plans.nobodyBody': '成人名額屬於您本人，前提是您已成為此帳號上的學習者。兒童名額屬於您家庭中的一位兒童。',
    'plans.noService': '因此目前還不能購買方案。沒有下單。',
    'plans.noServiceHere': '串接本平台的付款服務中，沒有一個收取此方案在這裡定價所用的貨幣：{currency}',
    'plans.approve': '請在您的手機上核准付款。付款確認後方案即開始。這可能需要一點時間。',
    'plans.waiting': '此方案有一筆訂單正在等待付款。若要重新開始，請先在您的訂閱中取消它。',
    'plans.haveLive': '此帳號已有此方案。有效期至：{date}',
    'plans.whyGone': '此方案已不再販售。沒有下單。',
    'plans.whyPrice': '該價格已不再適用於您的帳號。沒有下單。請重新開啟方案頁面查看目前價格。',
    'plans.whySlot': '此方案沒有適合該學習者的名額。沒有下單。',
    'plans.whyAlready': '此帳號已有此方案，或有一筆它的訂單仍在等待。請查看您的訂閱。',
    'plans.whyAccount': '您在此帳單帳號中的身分不允許您用它付款。沒有下單。',
    'plans.whyLearner': '無法從此帳號選擇該學習者。沒有下單。',
    'plans.whyClosed': '方案尚未開賣，因此沒有下單。未收取任何費用。',
    'plans.whyChoose': '請選擇此方案為誰購買。',
    'plans.whyNoService': '目前沒有付款服務可以收取這筆付款。',
    'plans.whyFailed': '無法發起付款。',
  },
  vi: {
    'plans.title': 'Chọn một gói học',
    'plans.lede':
      'Gói mở các khoá học cho những học viên mà gói bao gồm, trong thời hạn đã thanh toán. Gói bắt đầu khi khoản thanh toán được xác nhận, không phải khi đặt đơn hàng.',
    'plans.shelves':
      '{basic} mở các bài học. {plus} là gói VIP: vẫn các bài học đó và thêm nhiều thứ khác. Mỗi gói đều ghi rõ những gì nó mở.',
    'plans.noRenew':
      'Không có khoản nào tự động bị thu lại. Khi hết thời hạn, gói kết thúc trừ khi được thanh toán lại.',
    'plans.closedLead': 'Các gói chưa được mở bán.',
    'plans.closedBody':
      'Khi mở bán, từng gói và giá của gói sẽ được liệt kê ở đây. Trước đó không thể mua gì.',
    'plans.unread':
      'Hiện chưa đọc được các gói. Điều này không có nghĩa là không có gói nào. Hãy thử lại sau giây lát.',
    'plans.none': 'Hiện không có gói nào đang bán.',
    'plans.forWeek': 'Cho một tuần: {amount}',
    'plans.forMonth': 'Cho một tháng: {amount}',
    'plans.forQuarter': 'Cho ba tháng: {amount}',
    'plans.forYear': 'Cho một năm: {amount}',
    'plans.forOnce': 'Thanh toán một lần: {amount}',
    'plans.adults': 'Chỗ cho người lớn: {count}',
    'plans.children': 'Chỗ cho trẻ em: {count}',
    'plans.opens': 'Gói mở những gì',
    'plans.subject': 'Mọi khoá học trong môn này: {name}',
    'plans.offline': 'Lưu bài học trong ứng dụng để xem khi không có kết nối',
    'plans.noPrice': 'Gói này chưa có giá cho tài khoản của bạn, vì vậy không thể mua ở đây.',
    'plans.choose': 'Chọn gói này',
    'plans.payLede':
      'Hãy chọn gói này dành cho ai và cách thanh toán. Gói bắt đầu ngay khi khoản thanh toán được xác nhận.',
    'plans.notHere': 'Gói này không được bán, hoặc không có gói nào như vậy.',
    'plans.whichPrice': 'Giá nào?',
    'plans.whoFor': 'Gói này dành cho ai?',
    'plans.forOne': 'Gói này dành cho: {name}',
    'plans.nobodyLead': 'Tài khoản của bạn chưa có ai mà gói này có thể bao gồm.',
    'plans.nobodyBody':
      'Chỗ cho người lớn là của bạn, khi bạn đã là học viên trên tài khoản này. Chỗ cho trẻ em là của một trẻ trong gia đình bạn.',
    'plans.noService': 'Vì vậy chưa thể mua gói. Chưa có đơn hàng nào được đặt.',
    'plans.noServiceHere':
      'Không có dịch vụ thanh toán nào kết nối với nền tảng này thu loại tiền mà gói này được định giá ở đây: {currency}',
    'plans.approve':
      'Hãy chấp thuận khoản thanh toán trên điện thoại của bạn. Gói bắt đầu khi khoản thanh toán được xác nhận. Việc này có thể mất một lúc.',
    'plans.waiting':
      'Có một đơn hàng cho gói này đang chờ thanh toán. Để bắt đầu lại, trước hết hãy huỷ đơn đó trong phần đăng ký của bạn.',
    'plans.haveLive': 'Tài khoản này đã có gói này. Gói có hiệu lực đến: {date}',
    'plans.whyGone': 'Gói này không còn được bán. Chưa có đơn hàng nào được đặt.',
    'plans.whyPrice':
      'Giá đó không còn áp dụng cho tài khoản của bạn. Chưa có đơn hàng nào được đặt. Hãy mở lại danh sách gói để xem giá hiện tại.',
    'plans.whySlot': 'Gói này không có chỗ cho học viên đó. Chưa có đơn hàng nào được đặt.',
    'plans.whyAlready':
      'Tài khoản này đã có gói này, hoặc một đơn hàng cho gói vẫn đang chờ. Hãy xem phần đăng ký của bạn.',
    'plans.whyAccount':
      'Vai trò của bạn trong tài khoản thanh toán này không cho phép bạn trả tiền từ đó. Chưa có đơn hàng nào được đặt.',
    'plans.whyLearner':
      'Không thể chọn học viên đó từ tài khoản này. Chưa có đơn hàng nào được đặt.',
    'plans.whyClosed':
      'Các gói chưa được mở bán, vì vậy chưa có đơn hàng nào được đặt. Chưa có khoản nào bị thu.',
    'plans.whyChoose': 'Hãy chọn gói này dành cho ai.',
    'plans.whyNoService': 'Hiện không có dịch vụ thanh toán nào có thể nhận khoản thanh toán này.',
    'plans.whyFailed': 'Không thể bắt đầu thanh toán.',
  },
  th: {
    'plans.title': 'เลือกแพ็กเกจการเรียน',
    'plans.lede':
      'แพ็กเกจเปิดหลักสูตรให้ผู้เรียนที่แพ็กเกจครอบคลุม ตลอดช่วงเวลาที่ชำระเงินไว้ แพ็กเกจเริ่มเมื่อยืนยันการชำระเงินแล้ว ไม่ใช่เมื่อสั่งซื้อ',
    'plans.shelves':
      '{basic} เปิดบทเรียน {plus} คือแพ็กเกจ VIP: บทเรียนเดียวกันและมีมากกว่านั้น แต่ละแพ็กเกจระบุสิ่งที่เปิดให้',
    'plans.noRenew':
      'ไม่มีการเรียกเก็บเงินซ้ำโดยอัตโนมัติ เมื่อครบช่วงเวลา แพ็กเกจจะสิ้นสุด เว้นแต่จะชำระเงินอีกครั้ง',
    'plans.closedLead': 'แพ็กเกจยังไม่เปิดขาย',
    'plans.closedBody':
      'เมื่อเปิดขาย แพ็กเกจแต่ละรายการและราคาจะแสดงที่นี่ ก่อนหน้านั้นยังซื้ออะไรไม่ได้',
    'plans.unread':
      'ขณะนี้ยังอ่านแพ็กเกจไม่ได้ ซึ่งไม่ได้หมายความว่าไม่มีแพ็กเกจ โปรดลองอีกครั้งในอีกสักครู่',
    'plans.none': 'ขณะนี้ไม่มีแพ็กเกจที่เปิดขาย',
    'plans.forWeek': 'สำหรับหนึ่งสัปดาห์: {amount}',
    'plans.forMonth': 'สำหรับหนึ่งเดือน: {amount}',
    'plans.forQuarter': 'สำหรับสามเดือน: {amount}',
    'plans.forYear': 'สำหรับหนึ่งปี: {amount}',
    'plans.forOnce': 'ชำระครั้งเดียว: {amount}',
    'plans.adults': 'ที่สำหรับผู้ใหญ่: {count}',
    'plans.children': 'ที่สำหรับเด็ก: {count}',
    'plans.opens': 'สิ่งที่แพ็กเกจเปิดให้',
    'plans.subject': 'ทุกหลักสูตรในวิชานี้: {name}',
    'plans.offline': 'บันทึกบทเรียนไว้ในแอปเพื่อดูโดยไม่ต้องเชื่อมต่อ',
    'plans.noPrice': 'แพ็กเกจนี้ยังไม่มีราคาสำหรับบัญชีของคุณ จึงซื้อที่นี่ไม่ได้',
    'plans.choose': 'เลือกแพ็กเกจนี้',
    'plans.payLede':
      'เลือกว่าแพ็กเกจนี้เป็นของใครและจะชำระเงินอย่างไร แพ็กเกจเริ่มเมื่อยืนยันการชำระเงินแล้ว',
    'plans.notHere': 'แพ็กเกจนี้ไม่ได้เปิดขาย หรือไม่มีแพ็กเกจดังกล่าว',
    'plans.whichPrice': 'ราคาใด',
    'plans.whoFor': 'แพ็กเกจนี้เป็นของใคร',
    'plans.forOne': 'แพ็กเกจนี้เป็นของ: {name}',
    'plans.nobodyLead': 'ยังไม่มีใครในบัญชีของคุณที่แพ็กเกจนี้ครอบคลุมได้',
    'plans.nobodyBody':
      'ที่สำหรับผู้ใหญ่เป็นของคุณ เมื่อคุณเป็นผู้เรียนในบัญชีนี้แล้ว ที่สำหรับเด็กเป็นของเด็กในครอบครัวของคุณ',
    'plans.noService': 'จึงยังซื้อแพ็กเกจไม่ได้ ไม่มีการสั่งซื้อ',
    'plans.noServiceHere':
      'ไม่มีบริการชำระเงินที่เชื่อมต่อกับแพลตฟอร์มนี้รับสกุลเงินที่ใช้ตั้งราคาแพ็กเกจนี้ที่นี่: {currency}',
    'plans.approve':
      'โปรดอนุมัติการชำระเงินบนโทรศัพท์ของคุณ แพ็กเกจจะเริ่มเมื่อยืนยันการชำระเงินแล้ว อาจใช้เวลาสักครู่',
    'plans.waiting':
      'มีคำสั่งซื้อของแพ็กเกจนี้รอการชำระเงินอยู่ หากต้องการเริ่มใหม่ โปรดยกเลิกคำสั่งซื้อนั้นในการสมัครสมาชิกของคุณก่อน',
    'plans.haveLive': 'บัญชีนี้มีแพ็กเกจนี้อยู่แล้ว ใช้ได้ถึง: {date}',
    'plans.whyGone': 'แพ็กเกจนี้ไม่ได้เปิดขายแล้ว ไม่มีการสั่งซื้อ',
    'plans.whyPrice':
      'ราคานั้นใช้กับบัญชีของคุณไม่ได้แล้ว ไม่มีการสั่งซื้อ โปรดเปิดหน้าแพ็กเกจอีกครั้งเพื่อดูราคาปัจจุบัน',
    'plans.whySlot': 'แพ็กเกจนี้ไม่มีที่สำหรับผู้เรียนคนนั้น ไม่มีการสั่งซื้อ',
    'plans.whyAlready':
      'บัญชีนี้มีแพ็กเกจนี้อยู่แล้ว หรือมีคำสั่งซื้อของแพ็กเกจนี้ที่ยังรออยู่ โปรดดูการสมัครสมาชิกของคุณ',
    'plans.whyAccount':
      'สถานะของคุณในบัญชีเรียกเก็บเงินนี้ไม่อนุญาตให้ชำระเงินจากบัญชีนี้ ไม่มีการสั่งซื้อ',
    'plans.whyLearner': 'เลือกผู้เรียนคนนั้นจากบัญชีนี้ไม่ได้ ไม่มีการสั่งซื้อ',
    'plans.whyClosed': 'แพ็กเกจยังไม่เปิดขาย จึงไม่มีการสั่งซื้อ ยังไม่มีการเรียกเก็บเงินใด ๆ',
    'plans.whyChoose': 'เลือกว่าแพ็กเกจนี้เป็นของใคร',
    'plans.whyNoService': 'ขณะนี้ไม่มีบริการชำระเงินใดรับการชำระเงินนี้ได้',
    'plans.whyFailed': 'เริ่มการชำระเงินไม่ได้',
  },
  fil: {
    'plans.title': 'Pumili ng plano sa pag-aaral',
    'plans.lede':
      'Binubuksan ng plano ang mga kurso para sa mga mag-aaral na saklaw nito, sa loob ng panahong binayaran. Nagsisimula ito kapag nakumpirma ang bayad, hindi kapag inilagay ang order.',
    'plans.shelves':
      'Binubuksan ng {basic} ang mga aralin. Ang {plus} ang VIP package: ang parehong mga aralin, at may dagdag pa. Nakalista sa bawat plano kung ano ang binubuksan nito.',
    'plans.noRenew':
      'Walang sinisingil muli nang kusa. Kapag natapos ang panahon, natatapos ang plano maliban kung bayaran itong muli.',
    'plans.closedLead': 'Hindi pa ibinebenta ang mga plano.',
    'plans.closedBody':
      'Kapag ibinebenta na, nakalista rito ang bawat plano at ang presyo nito. Bago noon, walang mabibili.',
    'plans.unread':
      'Hindi mabasa ang mga plano sa ngayon. Hindi ito nangangahulugang wala. Subukan muli maya-maya.',
    'plans.none': 'Walang planong ibinebenta sa ngayon.',
    'plans.forWeek': 'Para sa isang linggo: {amount}',
    'plans.forMonth': 'Para sa isang buwan: {amount}',
    'plans.forQuarter': 'Para sa tatlong buwan: {amount}',
    'plans.forYear': 'Para sa isang taon: {amount}',
    'plans.forOnce': 'Isang beses na bayad: {amount}',
    'plans.adults': 'Puwesto para sa nasa hustong gulang: {count}',
    'plans.children': 'Puwesto para sa mga bata: {count}',
    'plans.opens': 'Ang binubuksan nito',
    'plans.subject': 'Bawat kurso sa asignaturang ito: {name}',
    'plans.offline': 'Pag-save ng mga aralin sa app, para mapanood nang walang koneksyon',
    'plans.noPrice':
      'Wala pang presyo ang planong ito para sa iyong account, kaya hindi ito mabibili rito.',
    'plans.choose': 'Piliin ang planong ito',
    'plans.payLede':
      'Piliin kung para kanino ang planong ito at kung paano magbabayad. Nagsisimula ang plano kapag nakumpirma ang bayad.',
    'plans.notHere': 'Hindi ibinebenta ang planong ito, o walang ganoong plano.',
    'plans.whichPrice': 'Aling presyo?',
    'plans.whoFor': 'Para kanino ang planong ito?',
    'plans.forOne': 'Ang planong ito ay para kay: {name}',
    'plans.nobodyLead': 'Wala pang sinuman sa iyong account na masasaklaw ng planong ito.',
    'plans.nobodyBody':
      'Ang puwesto para sa nasa hustong gulang ay para sa iyo, kapag mag-aaral ka na sa account na ito. Ang puwesto para sa bata ay para sa isang bata sa iyong pamilya.',
    'plans.noService': 'Kaya hindi pa mabibili ang plano. Walang order na nailagay.',
    'plans.noServiceHere':
      'Walang serbisyo sa pagbabayad na nakakonekta sa platapormang ito ang tumatanggap ng salaping ginamit sa presyo ng planong ito rito: {currency}',
    'plans.approve':
      'Aprubahan ang bayad sa iyong telepono. Magsisimula ang plano kapag nakumpirma ang bayad. Maaaring tumagal ito nang sandali.',
    'plans.waiting':
      'May order para sa planong ito na naghihintay ng bayad. Para makapagsimulang muli, kanselahin muna ito sa iyong mga subskripsyon.',
    'plans.haveLive': 'Mayroon na ng planong ito ang account na ito. Tatagal ito hanggang: {date}',
    'plans.whyGone': 'Hindi na ibinebenta ang planong ito. Walang order na nailagay.',
    'plans.whyPrice':
      'Hindi na available ang presyong iyon para sa iyong account. Walang order na nailagay. Buksan muli ang mga plano para makita ang kasalukuyang presyo.',
    'plans.whySlot':
      'Walang puwesto ang planong ito para sa mag-aaral na iyon. Walang order na nailagay.',
    'plans.whyAlready':
      'Mayroon na ng planong ito ang account na ito, o may order para rito na naghihintay pa. Tingnan ang iyong mga subskripsyon.',
    'plans.whyAccount':
      'Hindi ka pinapayagan ng iyong katayuan sa billing account na ito na magbayad mula rito. Walang order na nailagay.',
    'plans.whyLearner':
      'Hindi mapipili ang mag-aaral na iyon mula sa account na ito. Walang order na nailagay.',
    'plans.whyClosed':
      'Hindi pa ibinebenta ang mga plano, kaya walang order na nailagay. Walang siningil.',
    'plans.whyChoose': 'Piliin kung para kanino ang planong ito.',
    'plans.whyNoService':
      'Walang serbisyo sa pagbabayad na makatatanggap ng bayad na ito sa ngayon.',
    'plans.whyFailed': 'Hindi nasimulan ang pagbabayad.',
  },
  uz: {
    'plans.title': 'Oʻqish tarifini tanlang',
    'plans.lede':
      'Tarif oʻzi qamrab olgan oʻquvchilar uchun kurslarni toʻlangan muddatga ochadi. U buyurtma berilganda emas, toʻlov tasdiqlanganda boshlanadi.',
    'plans.shelves':
      '{basic} darslarni ochadi. {plus} VIP toʻplamidir: oʻsha darslar va undan ortigʻi. Har bir tarifda u nimani ochishi yozilgan.',
    'plans.noRenew':
      'Hech qanday pul oʻz-oʻzidan qayta yechilmaydi. Muddat tugagach, qayta toʻlanmasa, tarif tugaydi.',
    'plans.closedLead': 'Tariflar hali sotuvda emas.',
    'plans.closedBody':
      'Sotuvga chiqqach, har bir tarif va uning narxi shu yerda koʻrsatiladi. Ungacha hech narsa sotib olib boʻlmaydi.',
    'plans.unread':
      'Tariflarni hozir oʻqib boʻlmadi. Bu tarif yoʻq degani emas. Birozdan soʻng qayta urinib koʻring.',
    'plans.none': 'Hozir sotuvda tarif yoʻq.',
    'plans.forWeek': 'Bir hafta uchun: {amount}',
    'plans.forMonth': 'Bir oy uchun: {amount}',
    'plans.forQuarter': 'Uch oy uchun: {amount}',
    'plans.forYear': 'Bir yil uchun: {amount}',
    'plans.forOnce': 'Bir martalik toʻlov: {amount}',
    'plans.adults': 'Kattalar uchun oʻrinlar: {count}',
    'plans.children': 'Bolalar uchun oʻrinlar: {count}',
    'plans.opens': 'U nimalarni ochadi',
    'plans.subject': 'Ushbu fandagi har bir kurs: {name}',
    'plans.offline': 'Darslarni ilovada saqlab, aloqasiz tomosha qilish',
    'plans.noPrice':
      'Bu tarifning hisobingiz uchun hali narxi yoʻq, shuning uchun uni bu yerda sotib olib boʻlmaydi.',
    'plans.choose': 'Shu tarifni tanlash',
    'plans.payLede':
      'Bu tarif kim uchun ekanini va qanday toʻlashni tanlang. Tarif toʻlov tasdiqlangach boshlanadi.',
    'plans.notHere': 'Bu tarif sotuvda emas yoki bunday tarif yoʻq.',
    'plans.whichPrice': 'Qaysi narx?',
    'plans.whoFor': 'Bu tarif kim uchun?',
    'plans.forOne': 'Bu tarif ushbu oʻquvchi uchun: {name}',
    'plans.nobodyLead': 'Hisobingizda bu tarif qamrab oladigan hech kim hali yoʻq.',
    'plans.nobodyBody':
      'Kattalar oʻrni siz uchun, shu hisobda oʻquvchi boʻlganingizdan keyin. Bola oʻrni oilangizdagi bola uchun.',
    'plans.noService': 'Shuning uchun hali tarif sotib olib boʻlmaydi. Buyurtma berilmadi.',
    'plans.noServiceHere':
      'Bu platformaga ulangan hech bir toʻlov xizmati ushbu tarif bu yerda narxlangan valyutani qabul qilmaydi: {currency}',
    'plans.approve':
      'Toʻlovni telefoningizda tasdiqlang. Toʻlov tasdiqlangach tarif boshlanadi. Bu biroz vaqt olishi mumkin.',
    'plans.waiting':
      'Bu tarif uchun bir buyurtma toʻlovni kutmoqda. Qaytadan boshlash uchun avval uni obunalaringizda bekor qiling.',
    'plans.haveLive': 'Bu hisobda ushbu tarif allaqachon bor. U shu vaqtgacha amal qiladi: {date}',
    'plans.whyGone': 'Bu tarif endi sotuvda emas. Buyurtma berilmadi.',
    'plans.whyPrice':
      'U narx endi hisobingiz uchun mavjud emas. Buyurtma berilmadi. Joriy narxni koʻrish uchun tariflarni qayta oching.',
    'plans.whySlot': 'Bu tarifda oʻsha oʻquvchi uchun oʻrin yoʻq. Buyurtma berilmadi.',
    'plans.whyAlready':
      'Bu hisobda ushbu tarif allaqachon bor yoki uning buyurtmasi hali kutmoqda. Obunalaringizga qarang.',
    'plans.whyAccount':
      'Ushbu toʻlov hisobidagi oʻrningiz undan toʻlashga ruxsat bermaydi. Buyurtma berilmadi.',
    'plans.whyLearner': 'Oʻsha oʻquvchini bu hisobdan tanlab boʻlmaydi. Buyurtma berilmadi.',
    'plans.whyClosed':
      'Tariflar hali sotuvda emas, shuning uchun buyurtma berilmadi. Hech qanday pul yechilmadi.',
    'plans.whyChoose': 'Bu tarif kim uchun ekanini tanlang.',
    'plans.whyNoService': 'Hozir hech bir toʻlov xizmati bu toʻlovni qabul qila olmaydi.',
    'plans.whyFailed': 'Toʻlovni boshlab boʻlmadi.',
  },
  kk: {
    'plans.title': 'Оқу тарифін таңдаңыз',
    'plans.lede':
      'Тариф өзі қамтитын оқушыларға курстарды төленген мерзімге ашады. Ол тапсырыс берілгенде емес, төлем расталғанда басталады.',
    'plans.shelves':
      '{basic} сабақтарды ашады. {plus} — VIP топтамасы: сол сабақтар және одан да көп. Әр тарифте оның нені ашатыны жазылған.',
    'plans.noRenew':
      'Ешқандай ақы өздігінен қайта алынбайды. Мерзім біткенде, қайта төленбесе, тариф аяқталады.',
    'plans.closedLead': 'Тарифтер әзірге сатылымда жоқ.',
    'plans.closedBody':
      'Сатылымға шыққанда әр тариф пен оның бағасы осында көрсетіледі. Оған дейін ештеңе сатып алу мүмкін емес.',
    'plans.unread':
      'Тарифтерді қазір оқу мүмкін болмады. Бұл тариф жоқ дегенді білдірмейді. Сәлден соң қайталап көріңіз.',
    'plans.none': 'Қазір сатылымда тариф жоқ.',
    'plans.forWeek': 'Бір аптаға: {amount}',
    'plans.forMonth': 'Бір айға: {amount}',
    'plans.forQuarter': 'Үш айға: {amount}',
    'plans.forYear': 'Бір жылға: {amount}',
    'plans.forOnce': 'Бір реттік төлем: {amount}',
    'plans.adults': 'Ересектерге арналған орындар: {count}',
    'plans.children': 'Балаларға арналған орындар: {count}',
    'plans.opens': 'Ол нені ашады',
    'plans.subject': 'Осы пәндегі әр курс: {name}',
    'plans.offline': 'Сабақтарды қолданбада сақтап, байланыссыз көру',
    'plans.noPrice':
      'Бұл тарифтің тіркелгіңіз үшін әзірге бағасы жоқ, сондықтан оны осы жерден сатып алу мүмкін емес.',
    'plans.choose': 'Осы тарифті таңдау',
    'plans.payLede':
      'Бұл тариф кімге арналғанын және қалай төлейтініңізді таңдаңыз. Тариф төлем расталғаннан кейін басталады.',
    'plans.notHere': 'Бұл тариф сатылымда жоқ немесе мұндай тариф жоқ.',
    'plans.whichPrice': 'Қай баға?',
    'plans.whoFor': 'Бұл тариф кімге арналған?',
    'plans.forOne': 'Бұл тариф мына оқушыға арналған: {name}',
    'plans.nobodyLead': 'Тіркелгіңізде бұл тариф қамти алатын ешкім әзірге жоқ.',
    'plans.nobodyBody':
      'Ересек орны сізге арналған, осы тіркелгіде оқушы болғаннан кейін. Бала орны отбасыңыздағы балаға арналған.',
    'plans.noService': 'Сондықтан тарифті әзірге сатып алу мүмкін емес. Тапсырыс берілген жоқ.',
    'plans.noServiceHere':
      'Осы платформаға қосылған ешбір төлем қызметі бұл тарифтің мұндағы бағасы қойылған валютаны қабылдамайды: {currency}',
    'plans.approve':
      'Төлемді телефоныңызда мақұлдаңыз. Төлем расталғаннан кейін тариф басталады. Бұл біраз уақыт алуы мүмкін.',
    'plans.waiting':
      'Осы тарифке берілген бір тапсырыс төлемді күтіп тұр. Қайта бастау үшін алдымен оны жазылымдарыңызда тоқтатыңыз.',
    'plans.haveLive':
      'Бұл тіркелгіде осы тариф бұрыннан бар. Ол мына уақытқа дейін жарамды: {date}',
    'plans.whyGone': 'Бұл тариф енді сатылымда жоқ. Тапсырыс берілген жоқ.',
    'plans.whyPrice':
      'Ол баға енді тіркелгіңіз үшін қолжетімді емес. Тапсырыс берілген жоқ. Қазіргі бағаны көру үшін тарифтерді қайта ашыңыз.',
    'plans.whySlot': 'Бұл тарифте сол оқушыға орын жоқ. Тапсырыс берілген жоқ.',
    'plans.whyAlready':
      'Бұл тіркелгіде осы тариф бұрыннан бар немесе оның тапсырысы әлі күтіп тұр. Жазылымдарыңызды қараңыз.',
    'plans.whyAccount':
      'Осы төлем тіркелгісіндегі орныңыз одан төлеуге рұқсат бермейді. Тапсырыс берілген жоқ.',
    'plans.whyLearner': 'Сол оқушыны бұл тіркелгіден таңдау мүмкін емес. Тапсырыс берілген жоқ.',
    'plans.whyClosed':
      'Тарифтер әзірге сатылымда жоқ, сондықтан тапсырыс берілген жоқ. Ешқандай ақы алынған жоқ.',
    'plans.whyChoose': 'Бұл тариф кімге арналғанын таңдаңыз.',
    'plans.whyNoService': 'Қазір ешбір төлем қызметі бұл төлемді қабылдай алмайды.',
    'plans.whyFailed': 'Төлемді бастау мүмкін болмады.',
  },
  az: {
    'plans.title': 'Öyrənmə tarifi seçin',
    'plans.lede':
      'Tarif əhatə etdiyi öyrənənlər üçün kursları ödənilmiş müddətə açır. O, sifariş veriləndə deyil, ödəniş təsdiqlənəndə başlayır.',
    'plans.shelves':
      '{basic} dərsləri açır. {plus} VIP paketidir: eyni dərslər və daha çoxu. Hər tarifdə onun nəyi açdığı yazılıb.',
    'plans.noRenew':
      'Heç bir məbləğ öz-özünə yenidən tutulmur. Müddət bitəndə, yenidən ödənilməsə, tarif bitir.',
    'plans.closedLead': 'Tariflər hələ satışda deyil.',
    'plans.closedBody':
      'Satışa çıxanda hər tarif və onun qiyməti burada göstəriləcək. O vaxta qədər heç nə almaq olmaz.',
    'plans.unread':
      'Tarifləri indi oxumaq mümkün olmadı. Bu, tarif olmadığı demək deyil. Bir azdan yenidən cəhd edin.',
    'plans.none': 'Hazırda satışda tarif yoxdur.',
    'plans.forWeek': 'Bir həftə üçün: {amount}',
    'plans.forMonth': 'Bir ay üçün: {amount}',
    'plans.forQuarter': 'Üç ay üçün: {amount}',
    'plans.forYear': 'Bir il üçün: {amount}',
    'plans.forOnce': 'Birdəfəlik ödəniş: {amount}',
    'plans.adults': 'Böyüklər üçün yerlər: {count}',
    'plans.children': 'Uşaqlar üçün yerlər: {count}',
    'plans.opens': 'Nələri açır',
    'plans.subject': 'Bu fəndəki hər kurs: {name}',
    'plans.offline': 'Dərsləri tətbiqdə saxlayıb bağlantısız izləmək',
    'plans.noPrice':
      'Bu tarifin hesabınız üçün hələ qiyməti yoxdur, ona görə onu buradan almaq olmaz.',
    'plans.choose': 'Bu tarifi seç',
    'plans.payLede':
      'Bu tarifin kim üçün olduğunu və necə ödəyəcəyinizi seçin. Tarif ödəniş təsdiqlənən kimi başlayır.',
    'plans.notHere': 'Bu tarif satışda deyil və ya belə tarif yoxdur.',
    'plans.whichPrice': 'Hansı qiymət?',
    'plans.whoFor': 'Bu tarif kim üçündür?',
    'plans.forOne': 'Bu tarif bu öyrənən üçündür: {name}',
    'plans.nobodyLead': 'Hesabınızda bu tarifin əhatə edə biləcəyi heç kim hələ yoxdur.',
    'plans.nobodyBody':
      'Böyük üçün yer sizin üçündür, bu hesabda öyrənən olduqdan sonra. Uşaq üçün yer ailənizdəki bir uşaq üçündür.',
    'plans.noService': 'Ona görə hələ tarif almaq olmaz. Sifariş verilməyib.',
    'plans.noServiceHere':
      'Bu platformaya qoşulmuş heç bir ödəniş xidməti bu tarifin burada qiymətləndirildiyi valyutanı qəbul etmir: {currency}',
    'plans.approve':
      'Ödənişi telefonunuzda təsdiqləyin. Ödəniş təsdiqlənən kimi tarif başlayır. Bu, bir az vaxt apara bilər.',
    'plans.waiting':
      'Bu tarif üçün bir sifariş ödəniş gözləyir. Yenidən başlamaq üçün əvvəlcə onu abunələrinizdə ləğv edin.',
    'plans.haveLive': 'Bu hesabda bu tarif artıq var. Bu vaxta qədər davam edir: {date}',
    'plans.whyGone': 'Bu tarif artıq satışda deyil. Sifariş verilmədi.',
    'plans.whyPrice':
      'O qiymət artıq hesabınız üçün əlçatan deyil. Sifariş verilmədi. Cari qiyməti görmək üçün tarifləri yenidən açın.',
    'plans.whySlot': 'Bu tarifdə həmin öyrənən üçün yer yoxdur. Sifariş verilmədi.',
    'plans.whyAlready':
      'Bu hesabda bu tarif artıq var və ya onun sifarişi hələ gözləyir. Abunələrinizə baxın.',
    'plans.whyAccount':
      'Bu ödəniş hesabındakı yeriniz ondan ödəməyə icazə vermir. Sifariş verilmədi.',
    'plans.whyLearner': 'Həmin öyrənəni bu hesabdan seçmək olmaz. Sifariş verilmədi.',
    'plans.whyClosed':
      'Tariflər hələ satışda deyil, ona görə sifariş verilmədi. Heç bir məbləğ tutulmayıb.',
    'plans.whyChoose': 'Bu tarifin kim üçün olduğunu seçin.',
    'plans.whyNoService': 'Hazırda heç bir ödəniş xidməti bu ödənişi qəbul edə bilmir.',
    'plans.whyFailed': 'Ödənişi başlatmaq mümkün olmadı.',
  },
  tg: {
    'plans.title': 'Нақшаи омӯзишро интихоб кунед',
    'plans.lede':
      'Нақша курсҳоро барои хонандагоне, ки фаро мегирад, ба муҳлати пардохтшуда мекушояд. Он ҳангоми тасдиқи пардохт оғоз мешавад, на ҳангоми додани фармоиш.',
    'plans.shelves':
      '{basic} дарсҳоро мекушояд. {plus} бастаи VIP аст: ҳамон дарсҳо ва бештар аз он. Дар ҳар нақша навишта шудааст, ки он чиро мекушояд.',
    'plans.noRenew':
      'Ҳеҷ маблағе худкор дубора гирифта намешавад. Вақте муҳлат тамом мешавад, нақша анҷом меёбад, агар дубора пардохт нашавад.',
    'plans.closedLead': 'Нақшаҳо ҳанӯз ба фурӯш нестанд.',
    'plans.closedBody':
      'Вақте ба фурӯш мебароянд, ҳар нақша ва нархи он дар ин ҷо номбар мешавад. То он вақт чизе харидан мумкин нест.',
    'plans.unread':
      'Нақшаҳоро ҳозир хондан муяссар нашуд. Ин маънои онро надорад, ки нақша нест. Каме баъд дубора кӯшиш кунед.',
    'plans.none': 'Ҳоло ягон нақша ба фурӯш нест.',
    'plans.forWeek': 'Барои як ҳафта: {amount}',
    'plans.forMonth': 'Барои як моҳ: {amount}',
    'plans.forQuarter': 'Барои се моҳ: {amount}',
    'plans.forYear': 'Барои як сол: {amount}',
    'plans.forOnce': 'Як пардохт: {amount}',
    'plans.adults': 'Ҷойҳо барои калонсолон: {count}',
    'plans.children': 'Ҷойҳо барои кӯдакон: {count}',
    'plans.opens': 'Он чиро мекушояд',
    'plans.subject': 'Ҳар курс дар ин фан: {name}',
    'plans.offline': 'Нигоҳ доштани дарсҳо дар барнома барои тамошо бе пайвастшавӣ',
    'plans.noPrice':
      'Ин нақша барои ҳисоби шумо ҳанӯз нарх надорад, бинобар ин онро дар ин ҷо харидан мумкин нест.',
    'plans.choose': 'Интихоби ин нақша',
    'plans.payLede':
      'Интихоб кунед, ки ин нақша барои кист ва чӣ гуна пардохт мешавад. Нақша пас аз тасдиқи пардохт оғоз мешавад.',
    'plans.notHere': 'Ин нақша ба фурӯш нест ё чунин нақша вуҷуд надорад.',
    'plans.whichPrice': 'Кадом нарх?',
    'plans.whoFor': 'Ин нақша барои кист?',
    'plans.forOne': 'Ин нақша барои ин хонанда аст: {name}',
    'plans.nobodyLead': 'Дар ҳисоби шумо ҳанӯз касе нест, ки ин нақша фаро гирифта тавонад.',
    'plans.nobodyBody':
      'Ҷойи калонсол барои шумост, вақте дар ин ҳисоб хонанда мешавед. Ҷойи кӯдак барои кӯдаке дар оилаи шумост.',
    'plans.noService': 'Бинобар ин ҳанӯз нақша харидан мумкин нест. Фармоиш дода нашудааст.',
    'plans.noServiceHere':
      'Ягон хидмати пардохте, ки ба ин платформа пайваст аст, асъореро, ки ин нақша дар ин ҷо бо он нархгузорӣ шудааст, қабул намекунад: {currency}',
    'plans.approve':
      'Пардохтро дар телефони худ тасдиқ кунед. Нақша пас аз тасдиқи пардохт оғоз мешавад. Ин метавонад каме вақт гирад.',
    'plans.waiting':
      'Як фармоиш барои ин нақша мунтазири пардохт аст. Барои аз нав оғоз кардан аввал онро дар обунаҳои худ бекор кунед.',
    'plans.haveLive': 'Ин ҳисоб аллакай ин нақшаро дорад. Он то ин вақт идома дорад: {date}',
    'plans.whyGone': 'Ин нақша дигар ба фурӯш нест. Фармоиш дода нашуд.',
    'plans.whyPrice':
      'Он нарх дигар барои ҳисоби шумо дастрас нест. Фармоиш дода нашуд. Барои дидани нархи ҷорӣ нақшаҳоро дубора кушоед.',
    'plans.whySlot': 'Дар ин нақша барои он хонанда ҷой нест. Фармоиш дода нашуд.',
    'plans.whyAlready':
      'Ин ҳисоб аллакай ин нақшаро дорад ё фармоиши он ҳанӯз мунтазир аст. Ба обунаҳои худ нигаред.',
    'plans.whyAccount':
      'Мавқеи шумо дар ин ҳисоби пардохт иҷозат намедиҳад, ки аз он пардохт кунед. Фармоиш дода нашуд.',
    'plans.whyLearner': 'Он хонандаро аз ин ҳисоб интихоб кардан мумкин нест. Фармоиш дода нашуд.',
    'plans.whyClosed':
      'Нақшаҳо ҳанӯз ба фурӯш нестанд, бинобар ин фармоиш дода нашуд. Ҳеҷ маблағе гирифта нашудааст.',
    'plans.whyChoose': 'Интихоб кунед, ки ин нақша барои кист.',
    'plans.whyNoService': 'Ҳоло ягон хидмати пардохт ин пардохтро қабул карда наметавонад.',
    'plans.whyFailed': 'Пардохтро оғоз кардан муяссар нашуд.',
  },
  ky: {
    'plans.title': 'Окуу тарифин тандаңыз',
    'plans.lede':
      'Тариф өзү камтыган окуучулар үчүн курстарды төлөнгөн мөөнөткө ачат. Ал буйрутма берилгенде эмес, төлөм ырасталганда башталат.',
    'plans.shelves':
      '{basic} сабактарды ачат. {plus} — VIP топтому: ошол эле сабактар жана андан да көп. Ар бир тарифте анын эмнени ачары жазылган.',
    'plans.noRenew':
      'Эч кандай акча өзүнөн-өзү кайра алынбайт. Мөөнөт бүткөндө, кайра төлөнбөсө, тариф аяктайт.',
    'plans.closedLead': 'Тарифтер азырынча сатыкта жок.',
    'plans.closedBody':
      'Сатыкка чыкканда ар бир тариф жана анын баасы ушул жерде көрсөтүлөт. Ага чейин эч нерсе сатып алууга болбойт.',
    'plans.unread':
      'Тарифтерди азыр окуу мүмкүн болгон жок. Бул тариф жок дегенди билдирбейт. Бир аздан кийин кайра аракет кылыңыз.',
    'plans.none': 'Азыр сатыкта тариф жок.',
    'plans.forWeek': 'Бир жумага: {amount}',
    'plans.forMonth': 'Бир айга: {amount}',
    'plans.forQuarter': 'Үч айга: {amount}',
    'plans.forYear': 'Бир жылга: {amount}',
    'plans.forOnce': 'Бир жолку төлөм: {amount}',
    'plans.adults': 'Чоңдор үчүн орундар: {count}',
    'plans.children': 'Балдар үчүн орундар: {count}',
    'plans.opens': 'Ал эмнелерди ачат',
    'plans.subject': 'Ушул предметтеги ар бир курс: {name}',
    'plans.offline': 'Сабактарды колдонмодо сактап, байланышсыз көрүү',
    'plans.noPrice':
      'Бул тарифтин аккаунтуңуз үчүн азырынча баасы жок, ошондуктан аны бул жерден сатып алууга болбойт.',
    'plans.choose': 'Ушул тарифти тандоо',
    'plans.payLede':
      'Бул тариф ким үчүн экенин жана кантип төлөөрүңүздү тандаңыз. Тариф төлөм ырасталгандан кийин башталат.',
    'plans.notHere': 'Бул тариф сатыкта жок же мындай тариф жок.',
    'plans.whichPrice': 'Кайсы баа?',
    'plans.whoFor': 'Бул тариф ким үчүн?',
    'plans.forOne': 'Бул тариф ушул окуучу үчүн: {name}',
    'plans.nobodyLead': 'Аккаунтуңузда бул тариф камтый ала турган эч ким азырынча жок.',
    'plans.nobodyBody':
      'Чоң кишинин орду сиз үчүн, ушул аккаунтта окуучу болгондон кийин. Баланын орду үй-бүлөңүздөгү бала үчүн.',
    'plans.noService': 'Ошондуктан тарифти азырынча сатып алууга болбойт. Буйрутма берилген жок.',
    'plans.noServiceHere':
      'Бул платформага туташтырылган эч бир төлөм кызматы бул тарифтин бул жердеги баасы коюлган валютаны кабыл албайт: {currency}',
    'plans.approve':
      'Төлөмдү телефонуңузда жактырыңыз. Төлөм ырасталгандан кийин тариф башталат. Бул бир аз убакыт алышы мүмкүн.',
    'plans.waiting':
      'Бул тариф үчүн бир буйрутма төлөмдү күтүп турат. Кайра баштоо үчүн адегенде аны жазылууларыңыздан жокко чыгарыңыз.',
    'plans.haveLive':
      'Бул аккаунтта ушул тариф мурунтан бар. Ал ушул убакка чейин жарактуу: {date}',
    'plans.whyGone': 'Бул тариф эми сатыкта жок. Буйрутма берилген жок.',
    'plans.whyPrice':
      'Ал баа эми аккаунтуңуз үчүн жеткиликтүү эмес. Буйрутма берилген жок. Учурдагы бааны көрүү үчүн тарифтерди кайра ачыңыз.',
    'plans.whySlot': 'Бул тарифте ал окуучу үчүн орун жок. Буйрутма берилген жок.',
    'plans.whyAlready':
      'Бул аккаунтта ушул тариф мурунтан бар же анын буйрутмасы дагы эле күтүп турат. Жазылууларыңызды караңыз.',
    'plans.whyAccount':
      'Бул төлөм аккаунтундагы ордуңуз андан төлөөгө уруксат бербейт. Буйрутма берилген жок.',
    'plans.whyLearner': 'Ал окуучуну бул аккаунттан тандоого болбойт. Буйрутма берилген жок.',
    'plans.whyClosed':
      'Тарифтер азырынча сатыкта жок, ошондуктан буйрутма берилген жок. Эч кандай акча алынган жок.',
    'plans.whyChoose': 'Бул тариф ким үчүн экенин тандаңыз.',
    'plans.whyNoService': 'Азыр эч бир төлөм кызматы бул төлөмдү кабыл ала албайт.',
    'plans.whyFailed': 'Төлөмдү баштоо мүмкүн болгон жок.',
  },
  tk: {
    'plans.title': 'Okuw meýilnamasyny saýlaň',
    'plans.lede':
      'Meýilnama öz içine alýan okuwçylary üçin kurslary tölenen möhlete açýar. Ol sargyt edilende däl-de, töleg tassyklananda başlanýar.',
    'plans.shelves':
      '{basic} sapaklary açýar. {plus} VIP toplumydyr: şol sapaklar we ondan-da köp zat. Her meýilnamada onuň nämäni açýandygy ýazylan.',
    'plans.noRenew':
      'Hiç hili pul öz-özünden gaýtadan alynmaýar. Möhlet gutaranda, gaýtadan tölenmese, meýilnama tamamlanýar.',
    'plans.closedLead': 'Meýilnamalar entek satuwda däl.',
    'plans.closedBody':
      'Satuwa çykanda her meýilnama we onuň bahasy şu ýerde görkeziler. Oňa çenli hiç zat satyn alyp bolmaýar.',
    'plans.unread':
      'Meýilnamalary häzir okap bolmady. Bu meýilnama ýok diýmek däl. Biraz wagtdan gaýtadan synanyşyň.',
    'plans.none': 'Häzir satuwda meýilnama ýok.',
    'plans.forWeek': 'Bir hepde üçin: {amount}',
    'plans.forMonth': 'Bir aý üçin: {amount}',
    'plans.forQuarter': 'Üç aý üçin: {amount}',
    'plans.forYear': 'Bir ýyl üçin: {amount}',
    'plans.forOnce': 'Bir gezeklik töleg: {amount}',
    'plans.adults': 'Ulular üçin orunlar: {count}',
    'plans.children': 'Çagalar üçin orunlar: {count}',
    'plans.opens': 'Ol nämeleri açýar',
    'plans.subject': 'Şu dersdäki her kurs: {name}',
    'plans.offline': 'Sapaklary programmada saklap, baglanyşyksyz görmek',
    'plans.noPrice':
      'Bu meýilnamanyň hasabyňyz üçin entek bahasy ýok, şonuň üçin ony şu ýerden satyn alyp bolmaýar.',
    'plans.choose': 'Şu meýilnamany saýla',
    'plans.payLede':
      'Bu meýilnamanyň kim üçindigini we nähili tölejekdigiňizi saýlaň. Meýilnama töleg tassyklanandan soň başlanýar.',
    'plans.notHere': 'Bu meýilnama satuwda däl ýa-da beýle meýilnama ýok.',
    'plans.whichPrice': 'Haýsy baha?',
    'plans.whoFor': 'Bu meýilnama kim üçin?',
    'plans.forOne': 'Bu meýilnama şu okuwçy üçin: {name}',
    'plans.nobodyLead': 'Hasabyňyzda bu meýilnamanyň öz içine alyp biljek hiç kimi entek ýok.',
    'plans.nobodyBody':
      'Uly adamyň orny siziň üçin, şu hasapda okuwçy bolanyňyzdan soň. Çaganyň orny maşgalaňyzdaky çaga üçin.',
    'plans.noService': 'Şonuň üçin entek meýilnama satyn alyp bolmaýar. Sargyt edilmedi.',
    'plans.noServiceHere':
      'Bu platforma birikdirilen hiç bir töleg hyzmaty bu meýilnamanyň şu ýerdäki bahasynyň goýlan pul birligini kabul etmeýär: {currency}',
    'plans.approve':
      'Tölegi telefonyňyzda tassyklaň. Töleg tassyklanandan soň meýilnama başlanýar. Bu biraz wagt alyp biler.',
    'plans.waiting':
      'Bu meýilnama üçin bir sargyt tölege garaşýar. Täzeden başlamak üçin ilki ony abunalaryňyzda ýatyryň.',
    'plans.haveLive': 'Bu hasapda şu meýilnama eýýäm bar. Ol şu wagta çenli dowam edýär: {date}',
    'plans.whyGone': 'Bu meýilnama indi satuwda däl. Sargyt edilmedi.',
    'plans.whyPrice':
      'Ol baha indi hasabyňyz üçin elýeterli däl. Sargyt edilmedi. Häzirki bahany görmek üçin meýilnamalary täzeden açyň.',
    'plans.whySlot': 'Bu meýilnamada şol okuwçy üçin orun ýok. Sargyt edilmedi.',
    'plans.whyAlready':
      'Bu hasapda şu meýilnama eýýäm bar ýa-da onuň sargydy henizem garaşýar. Abunalaryňyza serediň.',
    'plans.whyAccount':
      'Şu töleg hasabyndaky ornuňyz ondan tölemäge rugsat bermeýär. Sargyt edilmedi.',
    'plans.whyLearner': 'Şol okuwçyny bu hasapdan saýlap bolmaýar. Sargyt edilmedi.',
    'plans.whyClosed':
      'Meýilnamalar entek satuwda däl, şonuň üçin sargyt edilmedi. Hiç hili pul alynmady.',
    'plans.whyChoose': 'Bu meýilnamanyň kim üçindigini saýlaň.',
    'plans.whyNoService': 'Häzir hiç bir töleg hyzmaty bu tölegi kabul edip bilmeýär.',
    'plans.whyFailed': 'Tölegi başlap bolmady.',
  },
  ta: {
    'plans.title': 'ஒரு கற்றல் திட்டத்தைத் தேர்ந்தெடுக்கவும்',
    'plans.lede':
      'திட்டம் அது உள்ளடக்கும் கற்பவர்களுக்கு, கட்டணம் செலுத்தப்பட்ட காலத்திற்குப் பாடநெறிகளைத் திறக்கிறது. அது ஆர்டர் செய்யப்படும்போது அல்ல, கட்டணம் உறுதிப்படுத்தப்படும்போது தொடங்குகிறது.',
    'plans.shelves':
      '{basic} பாடங்களைத் திறக்கிறது. {plus} என்பது VIP தொகுப்பு: அதே பாடங்கள், அவற்றுடன் மேலும் சில. ஒவ்வொரு திட்டமும் அது எதைத் திறக்கிறது என்பதைப் பட்டியலிடுகிறது.',
    'plans.noRenew':
      'எந்தத் தொகையும் தானாக மீண்டும் வசூலிக்கப்படாது. காலம் முடிந்ததும், மீண்டும் கட்டணம் செலுத்தப்படாவிட்டால் திட்டம் முடிவடையும்.',
    'plans.closedLead': 'திட்டங்கள் இன்னும் விற்பனைக்கு வரவில்லை.',
    'plans.closedBody':
      'விற்பனைக்கு வரும்போது, ஒவ்வொரு திட்டமும் அதன் விலையும் இங்கே பட்டியலிடப்படும். அதற்கு முன் எதையும் வாங்க முடியாது.',
    'plans.unread':
      'திட்டங்களை இப்போது படிக்க முடியவில்லை. இதற்குத் திட்டங்கள் இல்லை என்று பொருள் அல்ல. சிறிது நேரத்தில் மீண்டும் முயலவும்.',
    'plans.none': 'தற்போது எந்தத் திட்டமும் விற்பனையில் இல்லை.',
    'plans.forWeek': 'ஒரு வாரத்திற்கு: {amount}',
    'plans.forMonth': 'ஒரு மாதத்திற்கு: {amount}',
    'plans.forQuarter': 'மூன்று மாதங்களுக்கு: {amount}',
    'plans.forYear': 'ஓர் ஆண்டிற்கு: {amount}',
    'plans.forOnce': 'ஒரே கட்டணம்: {amount}',
    'plans.adults': 'பெரியவர்களுக்கான இடங்கள்: {count}',
    'plans.children': 'குழந்தைகளுக்கான இடங்கள்: {count}',
    'plans.opens': 'அது திறப்பவை',
    'plans.subject': 'இந்தப் பாடத்தின் ஒவ்வொரு பாடநெறியும்: {name}',
    'plans.offline': 'பாடங்களைச் செயலியில் சேமித்து, இணைப்பின்றிப் பார்த்தல்',
    'plans.noPrice':
      'இந்தத் திட்டத்திற்கு உங்கள் கணக்கிற்கான விலை இன்னும் இல்லை; ஆகவே இதை இங்கே வாங்க முடியாது.',
    'plans.choose': 'இந்தத் திட்டத்தைத் தேர்ந்தெடு',
    'plans.payLede':
      'இந்தத் திட்டம் யாருக்கானது, எப்படிச் செலுத்துவது என்பதைத் தேர்ந்தெடுக்கவும். கட்டணம் உறுதிப்படுத்தப்பட்டதும் திட்டம் தொடங்கும்.',
    'plans.notHere': 'இந்தத் திட்டம் விற்பனையில் இல்லை, அல்லது அப்படி ஒரு திட்டம் இல்லை.',
    'plans.whichPrice': 'எந்த விலை?',
    'plans.whoFor': 'இந்தத் திட்டம் யாருக்கானது?',
    'plans.forOne': 'இந்தத் திட்டம் இந்தக் கற்பவருக்கானது: {name}',
    'plans.nobodyLead': 'இந்தத் திட்டம் உள்ளடக்கக்கூடிய எவரும் உங்கள் கணக்கில் இன்னும் இல்லை.',
    'plans.nobodyBody':
      'பெரியவருக்கான இடம் உங்களுக்கானது, நீங்கள் இந்தக் கணக்கில் கற்பவரான பிறகு. குழந்தைக்கான இடம் உங்கள் குடும்பத்திலுள்ள ஒரு குழந்தைக்கானது.',
    'plans.noService': 'ஆகவே இன்னும் திட்டத்தை வாங்க முடியாது. ஆர்டர் எதுவும் செய்யப்படவில்லை.',
    'plans.noServiceHere':
      'இந்தத் தளத்துடன் இணைக்கப்பட்ட எந்தக் கட்டணச் சேவையும், இந்தத் திட்டத்திற்கு இங்கே விலை குறிக்கப்பட்டுள்ள நாணயத்தை வசூலிப்பதில்லை: {currency}',
    'plans.approve':
      'உங்கள் தொலைபேசியில் கட்டணத்தை அங்கீகரிக்கவும். கட்டணம் உறுதிப்படுத்தப்பட்டதும் திட்டம் தொடங்கும். இதற்குச் சிறிது நேரம் ஆகலாம்.',
    'plans.waiting':
      'இந்தத் திட்டத்திற்கான ஓர் ஆர்டர் கட்டணத்திற்காகக் காத்திருக்கிறது. மீண்டும் தொடங்க, முதலில் அதை உங்கள் சந்தாக்களில் ரத்து செய்யவும்.',
    'plans.haveLive':
      'இந்தக் கணக்கில் இந்தத் திட்டம் ஏற்கனவே உள்ளது. அது இதுவரை நீடிக்கும்: {date}',
    'plans.whyGone': 'இந்தத் திட்டம் இனி விற்பனையில் இல்லை. ஆர்டர் எதுவும் செய்யப்படவில்லை.',
    'plans.whyPrice':
      'அந்த விலை இனி உங்கள் கணக்கிற்குக் கிடைக்காது. ஆர்டர் எதுவும் செய்யப்படவில்லை. தற்போதைய விலையைப் பார்க்கத் திட்டங்களை மீண்டும் திறக்கவும்.',
    'plans.whySlot':
      'இந்தத் திட்டத்தில் அந்தக் கற்பவருக்கு இடம் இல்லை. ஆர்டர் எதுவும் செய்யப்படவில்லை.',
    'plans.whyAlready':
      'இந்தக் கணக்கில் இந்தத் திட்டம் ஏற்கனவே உள்ளது, அல்லது அதற்கான ஆர்டர் இன்னும் காத்திருக்கிறது. உங்கள் சந்தாக்களைப் பார்க்கவும்.',
    'plans.whyAccount':
      'இந்தப் பில்லிங் கணக்கில் உங்கள் நிலை, அதிலிருந்து செலுத்த உங்களை அனுமதிக்காது. ஆர்டர் எதுவும் செய்யப்படவில்லை.',
    'plans.whyLearner':
      'அந்தக் கற்பவரை இந்தக் கணக்கிலிருந்து தேர்ந்தெடுக்க முடியாது. ஆர்டர் எதுவும் செய்யப்படவில்லை.',
    'plans.whyClosed':
      'திட்டங்கள் இன்னும் விற்பனைக்கு வரவில்லை; ஆகவே ஆர்டர் எதுவும் செய்யப்படவில்லை. எந்தத் தொகையும் வசூலிக்கப்படவில்லை.',
    'plans.whyChoose': 'இந்தத் திட்டம் யாருக்கானது என்பதைத் தேர்ந்தெடுக்கவும்.',
    'plans.whyNoService': 'தற்போது எந்தக் கட்டணச் சேவையாலும் இந்தக் கட்டணத்தைப் பெற முடியாது.',
    'plans.whyFailed': 'கட்டணத்தைத் தொடங்க முடியவில்லை.',
  },
  ne: {
    'plans.title': 'सिकाइ योजना छान्नुहोस्',
    'plans.lede':
      'योजनाले आफूले समेट्ने सिकारुहरूका लागि, भुक्तानी गरिएको अवधिभर कोर्सहरू खोल्छ। यो अर्डर गर्दा होइन, भुक्तानी पुष्टि भएपछि सुरु हुन्छ।',
    'plans.shelves':
      '{basic} ले पाठहरू खोल्छ। {plus} VIP प्याकेज हो: उही पाठहरू, र थप कुराहरू। हरेक योजनाले के खोल्छ भनेर उल्लेख गर्छ।',
    'plans.noRenew': 'कुनै रकम आफैं फेरि लिइँदैन। अवधि सकिएपछि, फेरि भुक्तानी नगरिए योजना सकिन्छ।',
    'plans.closedLead': 'योजनाहरू अझै बिक्रीमा छैनन्।',
    'plans.closedBody':
      'बिक्रीमा आएपछि प्रत्येक योजना र त्यसको मूल्य यहाँ सूचीबद्ध हुनेछ। त्यसअघि केही पनि किन्न सकिँदैन।',
    'plans.unread':
      'योजनाहरू अहिले पढ्न सकिएन। यसको अर्थ योजना छैन भन्ने होइन। केही बेरमा फेरि प्रयास गर्नुहोस्।',
    'plans.none': 'अहिले कुनै योजना बिक्रीमा छैन।',
    'plans.forWeek': 'एक हप्ताका लागि: {amount}',
    'plans.forMonth': 'एक महिनाका लागि: {amount}',
    'plans.forQuarter': 'तीन महिनाका लागि: {amount}',
    'plans.forYear': 'एक वर्षका लागि: {amount}',
    'plans.forOnce': 'एकपटकको भुक्तानी: {amount}',
    'plans.adults': 'वयस्कका लागि स्थान: {count}',
    'plans.children': 'बालबालिकाका लागि स्थान: {count}',
    'plans.opens': 'यसले के खोल्छ',
    'plans.subject': 'यस विषयका हरेक कोर्स: {name}',
    'plans.offline': 'पाठहरू एपमा सुरक्षित गरेर जडानबिना हेर्ने',
    'plans.noPrice': 'यस योजनाको तपाईंको खाताका लागि अझै मूल्य छैन, त्यसैले यो यहाँ किन्न सकिँदैन।',
    'plans.choose': 'यो योजना छान्नुहोस्',
    'plans.payLede':
      'यो योजना कसका लागि हो र कसरी भुक्तानी गर्ने भनी छान्नुहोस्। भुक्तानी पुष्टि भएपछि योजना सुरु हुन्छ।',
    'plans.notHere': 'यो योजना बिक्रीमा छैन, वा यस्तो योजना छैन।',
    'plans.whichPrice': 'कुन मूल्य?',
    'plans.whoFor': 'यो योजना कसका लागि हो?',
    'plans.forOne': 'यो योजना यी सिकारुका लागि हो: {name}',
    'plans.nobodyLead': 'तपाईंको खातामा यो योजनाले समेट्न सक्ने कोही अझै छैन।',
    'plans.nobodyBody':
      'वयस्कको स्थान तपाईंका लागि हो, तपाईं यो खातामा सिकारु भएपछि। बालबालिकाको स्थान तपाईंको परिवारको कुनै बालबालिकाका लागि हो।',
    'plans.noService': 'त्यसैले अझै योजना किन्न सकिँदैन। कुनै अर्डर गरिएको छैन।',
    'plans.noServiceHere':
      'यस प्लेटफर्ममा जोडिएको कुनै पनि भुक्तानी सेवाले यहाँ यस योजनाको मूल्य राखिएको मुद्रा लिँदैन: {currency}',
    'plans.approve':
      'आफ्नो फोनमा भुक्तानी स्वीकृत गर्नुहोस्। भुक्तानी पुष्टि भएपछि योजना सुरु हुन्छ। यसमा केही समय लाग्न सक्छ।',
    'plans.waiting':
      'यस योजनाको एउटा अर्डर भुक्तानीको प्रतीक्षामा छ। फेरि सुरु गर्न पहिले त्यसलाई आफ्ना सदस्यताहरूमा रद्द गर्नुहोस्।',
    'plans.haveLive': 'यो खातामा यो योजना पहिल्यै छ। यो यस समयसम्म चल्छ: {date}',
    'plans.whyGone': 'यो योजना अब बिक्रीमा छैन। कुनै अर्डर गरिएन।',
    'plans.whyPrice':
      'त्यो मूल्य अब तपाईंको खाताका लागि उपलब्ध छैन। कुनै अर्डर गरिएन। हालको मूल्य हेर्न योजनाहरू फेरि खोल्नुहोस्।',
    'plans.whySlot': 'यस योजनामा ती सिकारुका लागि स्थान छैन। कुनै अर्डर गरिएन।',
    'plans.whyAlready':
      'यो खातामा यो योजना पहिल्यै छ, वा यसको अर्डर अझै प्रतीक्षामा छ। आफ्ना सदस्यताहरू हेर्नुहोस्।',
    'plans.whyAccount':
      'यस बिलिङ खातामा तपाईंको स्थानले यसबाट भुक्तानी गर्न दिँदैन। कुनै अर्डर गरिएन।',
    'plans.whyLearner': 'ती सिकारुलाई यो खाताबाट छान्न सकिँदैन। कुनै अर्डर गरिएन।',
    'plans.whyClosed':
      'योजनाहरू अझै बिक्रीमा छैनन्, त्यसैले कुनै अर्डर गरिएन। कुनै रकम लिइएको छैन।',
    'plans.whyChoose': 'यो योजना कसका लागि हो भनी छान्नुहोस्।',
    'plans.whyNoService': 'अहिले कुनै पनि भुक्तानी सेवाले यो भुक्तानी लिन सक्दैन।',
    'plans.whyFailed': 'भुक्तानी सुरु गर्न सकिएन।',
  },
};
