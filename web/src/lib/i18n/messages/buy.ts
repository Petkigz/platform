import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The buy page (`app/courses/[slug]/buy/page.tsx`) and its form.
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts` and `family.ts`: written
 * for the twenty-seven languages with nothing held in `held.ts`, and for no
 * other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Who reads it.** Somebody about to pay. Every sentence here is either what
 * they will be charged, why they cannot be, or what happened to their money.
 * "Nothing has been charged" is said only where no order was written or the
 * provider was never called; where nobody can say, the sentence sends the
 * buyer to their orders instead. No speaker has checked any of it, and this
 * is the part where a wrong sentence costs somebody the most.
 *
 * **What is not here.** The catalogue link (`nav.catalogue`), the
 * learner-profile button's four states (`learn.claim…`), "(optional)"
 * (`family.optional`), the orders link (`broke.orders`) and the sentence for
 * no connection (`auth.offline`) already had names.
 *
 * **What is not written at all.** The 14-day withdrawal box. Its paragraph
 * comes from the database, is the paragraph of the published refunds policy,
 * and is what the buyer's choice is recorded against, by policy version. It
 * has one wording, and the two sentences under it stay in the language of the
 * paragraph they explain. On a page that is not English the box is marked as
 * English.
 *
 * **A country's name sits after a colon** (`noPriceLead`, `pricedFor`) in
 * every language but English. The name comes from the reader's own browser
 * tables in the nominative, and a sentence that needed it in another case
 * would be wrong in every language that has cases.
 *
 * **The price line is fragments** (`quoteList` … `quotePay`), joined with a
 * middle dot in the order list price, discount, tax, fee, total. Each is a
 * label and an amount, so no fragment depends on the one before it.
 *
 * **Served to the server only.** `buy.` is in `SERVER_ONLY_PREFIXES`: the
 * page is drawn on the server and hands the form its words.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const BUY: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'buy.crumb': 'الشراء',
    'buy.eyebrow': 'إتمام الشراء',
    'buy.nobodyLead': 'لا يوجد بعدُ من تُشترى له هذه الدورة.',
    'buy.nobodyBody':
      'شراء الدورة يكون لمتعلّم واحد، فلا بدّ من متعلّم يُسمّى: أنت على هذا الحساب، أو ملف طفل في عائلتك.',
    'buy.claim': 'أشتريها لنفسي',
    'buy.claimNote': 'بهذا تصبح متعلّمًا على هذا الحساب. وليس هذا حسابًا ثانيًا.',
    'buy.addChild': 'أضف طفلًا بدلًا من ذلك',
    'buy.backCourse': 'العودة إلى الدورة',
    'buy.subLead': 'هذه الدورة تُباع باشتراك، لا بشراء لمرة واحدة.',
    'buy.subBody': 'الاشتراكات غير معروضة للبيع من هذه الصفحة بعد. لم يُخصم أي مبلغ.',
    'buy.ambiguousLead': 'لهذه الدورة أكثر من سعر واحد في بلدك.',
    'buy.ambiguousBody':
      'لن نختار عملة نيابةً عنك. تواصل معنا لنحدّد العملة الصحيحة، ثم يمكنك شراؤها.',
    'buy.noPriceLead': 'لم يُحدَّد بعدُ سعر لهذه الدورة في هذا البلد: {country}.',
    'buy.noPriceAny': 'لم يُحدَّد بعدُ سعر لهذه الدورة في بلدك.',
    'buy.noPriceBody': 'لم يُخصم أي مبلغ. تواصل معنا لنفتح البيع في بلدك، ثم يمكنك شراؤها.',
    'buy.hasAlready': 'هذه الدورة موجودة من قبل لدى {name}. هذا الشراء لمتعلّم آخر.',
    'buy.noProviderLead': 'لم تُربط أي جهة دفع بعد.',
    'buy.noProviderBody':
      'يمكنك تقديم هذا الطلب وسيُحفظ، لكن لا يمكن دفعه حتى تُربط جهة دفع. لا يُخصم أي مبلغ، ولا تُفتح الدورة حتى يتأكّد الدفع.',
    'buy.closedLead': 'الشراء غير مفتوح بعد.',
    'buy.closedBody':
      'هذه المنصّة لا تستقبل حاليًا مدفوعات للدورات، فلا يمكن تقديم أي طلب ولم يُخصم أي مبلغ. ما زال الانضمام إلى الدورات المجانية ممكنًا من صفحة الدورة.',
    'buy.notOnSale': 'هذه الدورة غير معروضة للبيع لك حاليًا، فلا شيء تدفعه.',
    'buy.payHeading': 'ما ستدفعه',
    'buy.pricedFor': 'السعر الخاص بهذا البلد: {country}.',
    'buy.standardPrice': 'السعر الأساسي.',
    'buy.oneOff': 'شراء لمرة واحدة، لا اشتراك.',
    'buy.accessNote':
      'يبدأ الوصول عند تأكّد الدفع، لا عند الضغط على الزر. وفي الحالتين يظهر الطلب في صفحة طلباتك.',
    'buy.whoFor': 'لمن هذه الدورة؟',
    'buy.choose': 'اختر متعلّمًا',
    'buy.learnerChild': '{name} (طفل)',
    'buy.whoNote': 'الشراء الواحد لمتعلّم واحد. للشراء لطفلين، اشترِها مرتين.',
    'buy.forOne': 'هذا الشراء لـ {name}.',
    'buy.codeLabel': 'رمز الخصم',
    'buy.checkPrice': 'تحقّق من السعر',
    'buy.checking': 'جارٍ التحقّق…',
    'buy.codeNote':
      'لديك رمز؟ أدخله هنا. إن لم يكن صالحًا لهذه الدورة فستُخبَر بذلك قبل خصم أي مبلغ.',
    'buy.quoteFailed': 'تعذّر حساب السعر. حاول مرة أخرى.',
    'buy.quoteSimple': 'ستدفع {amount}.',
    'buy.quoteList': 'السعر المعلن {amount}',
    'buy.quoteOffCode': 'الرمز {code} يخصم {amount}',
    'buy.quoteOff': 'الخصم {amount}',
    'buy.quoteTax': 'الضريبة {amount}',
    'buy.quoteFee': 'الرسوم {amount}',
    'buy.quotePay': 'تدفع {amount}.',
    'buy.quoteTaxNote': 'تُحسب الضريبة والرسوم على السعر بعد أي خصم.',
    'buy.quoteHolds': 'لا يُحجز شيء حتى تقدّم الطلب.',
    'buy.payWith': 'ادفع عبر',
    'buy.phoneLabel': 'رقم محفظة الهاتف المحمول',
    'buy.phoneNote': 'الرقم الذي سيُطلب منه الموافقة على الدفع.',
    'buy.continue': 'المتابعة إلى الدفع',
    'buy.starting': 'جارٍ البدء…',
    'buy.noProviderNote': 'سيُسجَّل هذا الطلب، لكن لا يمكن دفعه بعد.',
    'buy.approve': 'وافق على الدفع من هاتفك. تُفتح دورتك عند تأكّد الدفع. قد يستغرق ذلك لحظات.',
    'buy.orderSaved': 'حُفظ طلبك.',
    'buy.signedOut': 'لقد سُجّل خروجك. سجّل الدخول من جديد ثم أعد المحاولة.',
    'buy.whyClosed': 'الشراء غير مفتوح بعد، فلم يُقدَّم أي طلب. لم يُخصم أي مبلغ.',
    'buy.whyNoCourse': 'لا يمكن شراء هذه الدورة حاليًا.',
    'buy.whyNoPrice': 'هذه الدورة غير معروضة للبيع حاليًا. أعد تحميل الصفحة للتحقّق.',
    'buy.whyOwned': 'هذا المتعلّم لديه هذه الدورة من قبل، فشراؤها مرة أخرى لا يضيف شيئًا.',
    'buy.whyChoose': 'اختر من تكون له هذه الدورة.',
    'buy.whyNotYours': 'هذا المتعلّم ليس على حسابك. أعد تحميل الصفحة واختر من جديد.',
    'buy.codeUnknown': 'هذا الرمز غير معروف لدينا. تحقّق منه وحاول مرة أخرى.',
    'buy.codeNotNow': 'هذا الرمز غير سارٍ حاليًا: إما أنه انتهى أو لم يبدأ بعد.',
    'buy.codeNotHere': 'هذا الرمز غير متاح في بلدك.',
    'buy.codeNotCourse': 'هذا الرمز ليس لهذه الدورة.',
    'buy.codeOwn': 'هذا رمز دعوتك أنت، فلا يمكن استخدامه في شرائك. هو للصديق الذي ترسله إليه.',
    'buy.codeNewOnly': 'هذا الرمز لمن لم يشترِ شيئًا من قبل فقط.',
    'buy.codeUsedUp': 'استُنفد هذا الرمز.',
    'buy.codeUsedYou': 'لقد استخدمت هذا الرمز بالقدر الذي يسمح به.',
    'buy.codeUsedFamily': 'لقد استخدمت عائلتك هذا الرمز بالقدر الذي يسمح به.',
    'buy.codeFree':
      'هذا الرمز يجعل الدورة مجانية تمامًا، وهذا ما لا تقبله صفحة الشراء. تواصل معنا وسنسجّلك مباشرة.',
    'buy.codeCurrency': 'هذا الرمز بعملة غير عملة هذه الدورة، فلا يمكن استخدامه هنا.',
    'buy.codeNothing': 'هذا الرمز لا يخصم شيئًا من هذا الطلب.',
    'buy.whyFree': 'هذه الدورة مجانية. انضمّ إليها من صفحة الدورة.',
    'buy.whyWithdrawal':
      'تعذّر تسجيل اختيارك بشأن حق التراجع خلال 14 يومًا، فلم يبدأ الدفع. لم يُخصم أي مبلغ.',
    'buy.whyNoProvider': 'لم تُربط أي جهة دفع بعد، فلا يمكن دفع هذا الطلب.',
    'buy.whyPhone': 'رقم الهاتف هذا غير صحيح. تحقّق منه وحاول مرة أخرى.',
    'buy.whyProvider': 'تعذّر بدء الدفع. راجع طلباتك قبل المحاولة مرة أخرى.',
    'buy.refused': 'تعذّر تقديم الطلب. لم يُخصم أي مبلغ.',
    'buy.unconfirmed': 'لم نتمكّن من التأكّد من تقديم طلبك. راجع طلباتك قبل المحاولة مرة أخرى.',
  },
  ur: {
    'buy.crumb': 'خریدیں',
    'buy.eyebrow': 'چیک آؤٹ',
    'buy.nobodyLead': 'ابھی کوئی نہیں ہے جس کے لیے یہ خریدا جائے۔',
    'buy.nobodyBody':
      'کورس کی خریداری ایک سیکھنے والے کے لیے ہوتی ہے، اس لیے کسی ایک کا نام ضروری ہے: اس اکاؤنٹ پر آپ خود، یا آپ کے خاندان میں کسی بچے کا پروفائل۔',
    'buy.claim': 'اپنے لیے خریدیں',
    'buy.claimNote': 'اس سے آپ اس اکاؤنٹ پر سیکھنے والے بن جاتے ہیں۔ یہ دوسرا اکاؤنٹ نہیں ہے۔',
    'buy.addChild': 'اس کے بجائے بچہ شامل کریں',
    'buy.backCourse': 'کورس پر واپس جائیں',
    'buy.subLead': 'یہ کورس سبسکرپشن کے طور پر فروخت ہوتا ہے، ایک بار کی خریداری کے طور پر نہیں۔',
    'buy.subBody': 'اس چیک آؤٹ سے سبسکرپشن ابھی فروخت نہیں ہو رہیں۔ کوئی رقم نہیں لی گئی۔',
    'buy.ambiguousLead': 'آپ کے ملک کے لیے اس کورس کی ایک سے زیادہ قیمتیں ہیں۔',
    'buy.ambiguousBody':
      'ہم آپ کی طرف سے کرنسی نہیں چنیں گے۔ ہم سے رابطہ کریں، ہم درست کرنسی مقرر کر دیں گے، پھر آپ اسے خرید سکیں گے۔',
    'buy.noPriceLead': 'اس ملک کے لیے اس کورس کی قیمت ابھی مقرر نہیں ہوئی: {country}۔',
    'buy.noPriceAny': 'آپ کے ملک کے لیے اس کورس کی قیمت ابھی مقرر نہیں ہوئی۔',
    'buy.noPriceBody':
      'کوئی رقم نہیں لی گئی۔ ہم سے رابطہ کریں، ہم آپ کے ملک میں فروخت کھول دیں گے، پھر آپ اسے خرید سکیں گے۔',
    'buy.hasAlready':
      '{name} کے پاس یہ کورس پہلے سے ہے۔ یہ خریداری کسی دوسرے سیکھنے والے کے لیے ہے۔',
    'buy.noProviderLead': 'ابھی کوئی ادائیگی فراہم کنندہ منسلک نہیں ہے۔',
    'buy.noProviderBody':
      'آپ یہ آرڈر دے سکتے ہیں اور یہ محفوظ ہو جائے گا، لیکن جب تک کوئی فراہم کنندہ منسلک نہ ہو اس کی ادائیگی نہیں ہو سکتی۔ کوئی رقم نہیں لی جاتی، اور ادائیگی کی تصدیق تک کورس نہیں کھلتا۔',
    'buy.closedLead': 'چیک آؤٹ ابھی کھلا نہیں ہے۔',
    'buy.closedBody':
      'یہ پلیٹ فارم فی الحال کورسز کی ادائیگی نہیں لے رہا، اس لیے کوئی آرڈر نہیں دیا جا سکتا اور کوئی رقم نہیں لی گئی۔ مفت کورسز میں کورس کے صفحے سے اب بھی شامل ہوا جا سکتا ہے۔',
    'buy.notOnSale': 'یہ کورس فی الحال آپ کے لیے فروخت پر نہیں ہے، اس لیے ادا کرنے کو کچھ نہیں۔',
    'buy.payHeading': 'آپ کیا ادا کریں گے',
    'buy.pricedFor': 'اس ملک کے لیے قیمت: {country}۔',
    'buy.standardPrice': 'معیاری قیمت۔',
    'buy.oneOff': 'ایک بار کی خریداری، سبسکرپشن نہیں۔',
    'buy.accessNote':
      'رسائی ادائیگی کی تصدیق پر شروع ہوتی ہے، بٹن دبانے پر نہیں۔ دونوں صورتوں میں آرڈر آپ کے آرڈرز کے صفحے پر درج ہوتا ہے۔',
    'buy.whoFor': 'یہ کس کے لیے ہے؟',
    'buy.choose': 'سیکھنے والا منتخب کریں',
    'buy.learnerChild': '{name} (بچہ)',
    'buy.whoNote':
      'ایک خریداری ایک سیکھنے والے کے لیے ہوتی ہے۔ دو بچوں کے لیے خریدنا ہو تو دو بار خریدیں۔',
    'buy.forOne': 'یہ خریداری {name} کے لیے ہے۔',
    'buy.codeLabel': 'رعایتی کوڈ',
    'buy.checkPrice': 'قیمت دیکھیں',
    'buy.checking': 'دیکھا جا رہا ہے…',
    'buy.codeNote':
      'کوڈ ہے؟ یہاں درج کریں۔ اگر یہ اس کورس پر لاگو نہیں ہوتا تو کوئی رقم لینے سے پہلے آپ کو بتا دیا جائے گا۔',
    'buy.quoteFailed': 'قیمت کا حساب نہیں لگ سکا۔ دوبارہ کوشش کریں۔',
    'buy.quoteSimple': 'آپ {amount} ادا کریں گے۔',
    'buy.quoteList': 'درج قیمت {amount}',
    'buy.quoteOffCode': 'کوڈ {code} سے {amount} کم',
    'buy.quoteOff': 'رعایت {amount}',
    'buy.quoteTax': 'ٹیکس {amount}',
    'buy.quoteFee': 'فیس {amount}',
    'buy.quotePay': 'آپ {amount} ادا کریں گے۔',
    'buy.quoteTaxNote': 'ٹیکس اور فیس رعایت کے بعد کی قیمت پر لگائے جاتے ہیں۔',
    'buy.quoteHolds': 'آرڈر دینے تک کچھ محفوظ نہیں کیا جاتا۔',
    'buy.payWith': 'ادائیگی کا ذریعہ',
    'buy.phoneLabel': 'موبائل منی نمبر',
    'buy.phoneNote': 'وہ نمبر جس سے ادائیگی کی منظوری مانگی جائے گی۔',
    'buy.continue': 'ادائیگی کی طرف بڑھیں',
    'buy.starting': 'شروع ہو رہا ہے…',
    'buy.noProviderNote': 'یہ آرڈر درج ہو جائے گا لیکن ابھی اس کی ادائیگی نہیں ہو سکتی۔',
    'buy.approve':
      'اپنے فون پر ادائیگی منظور کریں۔ ادائیگی کی تصدیق ہوتے ہی آپ کا کورس کھل جائے گا۔ اس میں کچھ وقت لگ سکتا ہے۔',
    'buy.orderSaved': 'آپ کا آرڈر محفوظ ہو گیا۔',
    'buy.signedOut': 'آپ سائن آؤٹ ہو چکے ہیں۔ دوبارہ سائن اِن کریں، پھر ایک بار اور کوشش کریں۔',
    'buy.whyClosed':
      'چیک آؤٹ ابھی کھلا نہیں ہے، اس لیے کوئی آرڈر نہیں دیا گیا۔ کوئی رقم نہیں لی گئی۔',
    'buy.whyNoCourse': 'یہ کورس فی الحال خریدا نہیں جا سکتا۔',
    'buy.whyNoPrice': 'یہ کورس فی الحال فروخت پر نہیں ہے۔ دیکھنے کے لیے صفحہ دوبارہ لوڈ کریں۔',
    'buy.whyOwned':
      'اس سیکھنے والے کے پاس یہ کورس پہلے سے ہے، اس لیے دوبارہ خریدنے سے کچھ اضافہ نہیں ہوگا۔',
    'buy.whyChoose': 'منتخب کریں کہ یہ کورس کس کے لیے ہے۔',
    'buy.whyNotYours':
      'یہ سیکھنے والا آپ کے اکاؤنٹ پر نہیں ہے۔ صفحہ دوبارہ لوڈ کریں اور پھر سے منتخب کریں۔',
    'buy.codeUnknown': 'ہم اس کوڈ کو نہیں پہچانتے۔ اسے جانچیں اور دوبارہ کوشش کریں۔',
    'buy.codeNotNow': 'یہ کوڈ فی الحال فعال نہیں ہے: یہ ختم ہو چکا ہے یا ابھی شروع نہیں ہوا۔',
    'buy.codeNotHere': 'یہ کوڈ آپ کے ملک میں دستیاب نہیں ہے۔',
    'buy.codeNotCourse': 'یہ کوڈ اس کورس کے لیے نہیں ہے۔',
    'buy.codeOwn':
      'یہ آپ کا اپنا دعوتی کوڈ ہے، اس لیے آپ کی اپنی خریداری پر استعمال نہیں ہو سکتا۔ یہ اس دوست کے لیے ہے جسے آپ بھیجتے ہیں۔',
    'buy.codeNewOnly': 'یہ کوڈ صرف ان لوگوں کے لیے ہے جنہوں نے پہلے کچھ نہیں خریدا۔',
    'buy.codeUsedUp': 'یہ کوڈ پورا استعمال ہو چکا ہے۔',
    'buy.codeUsedYou': 'آپ اس کوڈ کو اتنی بار استعمال کر چکے ہیں جتنی اس کی اجازت ہے۔',
    'buy.codeUsedFamily': 'آپ کا خاندان اس کوڈ کو اتنی بار استعمال کر چکا ہے جتنی اس کی اجازت ہے۔',
    'buy.codeFree':
      'اس کوڈ سے کورس بالکل مفت ہو جائے گا، جو یہ چیک آؤٹ قبول نہیں کر سکتا۔ ہم سے رابطہ کریں، ہم آپ کا براہِ راست اندراج کر دیں گے۔',
    'buy.codeCurrency': 'یہ کوڈ اس کورس سے مختلف کرنسی میں ہے، اس لیے یہاں استعمال نہیں ہو سکتا۔',
    'buy.codeNothing': 'یہ کوڈ اس آرڈر سے کچھ کم نہیں کرتا۔',
    'buy.whyFree': 'یہ کورس مفت ہے۔ کورس کے صفحے سے اس میں شامل ہوں۔',
    'buy.whyWithdrawal':
      '14 دن کے حقِ دستبرداری کے بارے میں آپ کا انتخاب درج نہیں ہو سکا، اس لیے ادائیگی شروع نہیں ہوئی۔ کوئی رقم نہیں لی گئی۔',
    'buy.whyNoProvider':
      'ابھی کوئی ادائیگی فراہم کنندہ منسلک نہیں ہے، اس لیے اس آرڈر کی ادائیگی نہیں ہو سکتی۔',
    'buy.whyPhone': 'یہ فون نمبر درست نہیں ہے۔ اسے جانچیں اور دوبارہ کوشش کریں۔',
    'buy.whyProvider': 'ادائیگی شروع نہیں ہو سکی۔ دوبارہ کوشش کرنے سے پہلے اپنے آرڈرز دیکھیں۔',
    'buy.refused': 'آرڈر نہیں دیا جا سکا۔ کوئی رقم نہیں لی گئی۔',
    'buy.unconfirmed':
      'ہم تصدیق نہیں کر سکے کہ آپ کا آرڈر دیا گیا یا نہیں۔ دوبارہ کوشش کرنے سے پہلے اپنے آرڈرز دیکھیں۔',
  },
  fa: {
    'buy.crumb': 'خرید',
    'buy.eyebrow': 'تسویه‌حساب',
    'buy.nobodyLead': 'هنوز کسی نیست که این دوره برایش خریده شود.',
    'buy.nobodyBody':
      'خرید دوره برای یک یادگیرنده است، پس باید یک نفر نام برده شود: خود شما در این حساب، یا نمایهٔ یک کودک در خانواده‌تان.',
    'buy.claim': 'برای خودم می‌خرم',
    'buy.claimNote': 'با این کار شما در این حساب یادگیرنده می‌شوید. این حساب دومی نیست.',
    'buy.addChild': 'به‌جای آن کودکی اضافه کنید',
    'buy.backCourse': 'بازگشت به دوره',
    'buy.subLead': 'این دوره به‌صورت اشتراک فروخته می‌شود، نه خرید یک‌باره.',
    'buy.subBody': 'اشتراک‌ها هنوز از این صفحه فروخته نمی‌شوند. هیچ مبلغی برداشت نشده است.',
    'buy.ambiguousLead': 'این دوره برای کشور شما بیش از یک قیمت دارد.',
    'buy.ambiguousBody':
      'ما به‌جای شما واحد پول انتخاب نمی‌کنیم. با ما تماس بگیرید تا واحد درست را تعیین کنیم، سپس می‌توانید آن را بخرید.',
    'buy.noPriceLead': 'این دوره هنوز برای این کشور قیمت ندارد: {country}.',
    'buy.noPriceAny': 'این دوره هنوز برای کشور شما قیمت ندارد.',
    'buy.noPriceBody':
      'هیچ مبلغی برداشت نشده است. با ما تماس بگیرید تا فروش را در کشور شما باز کنیم، سپس می‌توانید آن را بخرید.',
    'buy.hasAlready': '{name} از قبل این دوره را دارد. این خرید برای یادگیرندهٔ دیگری است.',
    'buy.noProviderLead': 'هنوز هیچ ارائه‌دهندهٔ پرداختی متصل نشده است.',
    'buy.noProviderBody':
      'می‌توانید این سفارش را ثبت کنید و ذخیره می‌شود، اما تا وقتی ارائه‌دهنده‌ای متصل نشود قابل پرداخت نیست. هیچ مبلغی برداشت نمی‌شود و دوره تا تأیید پرداخت باز نمی‌شود.',
    'buy.closedLead': 'تسویه‌حساب هنوز باز نیست.',
    'buy.closedBody':
      'این سکو در حال حاضر برای دوره‌ها پرداخت نمی‌پذیرد، پس هیچ سفارشی نمی‌توان ثبت کرد و هیچ مبلغی برداشت نشده است. همچنان می‌توان از صفحهٔ دوره به دوره‌های رایگان پیوست.',
    'buy.notOnSale': 'این دوره در حال حاضر برای شما به فروش نمی‌رسد، پس چیزی برای پرداخت نیست.',
    'buy.payHeading': 'آنچه می‌پردازید',
    'buy.pricedFor': 'قیمت برای این کشور: {country}.',
    'buy.standardPrice': 'قیمت استاندارد.',
    'buy.oneOff': 'خرید یک‌باره، نه اشتراک.',
    'buy.accessNote':
      'دسترسی با تأیید پرداخت آغاز می‌شود، نه با فشردن دکمه. در هر دو حالت، سفارش در صفحهٔ سفارش‌های شما فهرست می‌شود.',
    'buy.whoFor': 'این برای چه کسی است؟',
    'buy.choose': 'یک یادگیرنده انتخاب کنید',
    'buy.learnerChild': '{name} (کودک)',
    'buy.whoNote': 'هر خرید برای یک یادگیرنده است. برای خرید برای دو کودک، دو بار بخرید.',
    'buy.forOne': 'این خرید برای {name} است.',
    'buy.codeLabel': 'کد تخفیف',
    'buy.checkPrice': 'بررسی قیمت',
    'buy.checking': 'در حال بررسی…',
    'buy.codeNote':
      'کد دارید؟ اینجا وارد کنید. اگر برای این دوره معتبر نباشد، پیش از برداشت هر مبلغی به شما گفته می‌شود.',
    'buy.quoteFailed': 'قیمت محاسبه نشد. دوباره تلاش کنید.',
    'buy.quoteSimple': 'شما {amount} می‌پردازید.',
    'buy.quoteList': 'قیمت اعلام‌شده {amount}',
    'buy.quoteOffCode': 'کد {code} به اندازهٔ {amount} کم می‌کند',
    'buy.quoteOff': 'تخفیف {amount}',
    'buy.quoteTax': 'مالیات {amount}',
    'buy.quoteFee': 'کارمزد {amount}',
    'buy.quotePay': 'شما {amount} می‌پردازید.',
    'buy.quoteTaxNote': 'مالیات و کارمزد بر پایهٔ قیمت پس از تخفیف محاسبه می‌شود.',
    'buy.quoteHolds': 'تا وقتی سفارش را ثبت نکنید چیزی نگه داشته نمی‌شود.',
    'buy.payWith': 'پرداخت با',
    'buy.phoneLabel': 'شمارهٔ پول همراه',
    'buy.phoneNote': 'شماره‌ای که از آن خواسته می‌شود پرداخت را تأیید کند.',
    'buy.continue': 'ادامه به پرداخت',
    'buy.starting': 'در حال شروع…',
    'buy.noProviderNote': 'این سفارش ثبت می‌شود اما هنوز قابل پرداخت نیست.',
    'buy.approve':
      'پرداخت را در تلفن خود تأیید کنید. دورهٔ شما با تأیید پرداخت باز می‌شود. ممکن است کمی طول بکشد.',
    'buy.orderSaved': 'سفارش شما ذخیره شد.',
    'buy.signedOut': 'از حساب خارج شده‌اید. دوباره وارد شوید و یک بار دیگر تلاش کنید.',
    'buy.whyClosed': 'تسویه‌حساب هنوز باز نیست، پس سفارشی ثبت نشد. هیچ مبلغی برداشت نشده است.',
    'buy.whyNoCourse': 'این دوره در حال حاضر قابل خرید نیست.',
    'buy.whyNoPrice': 'این دوره در حال حاضر به فروش نمی‌رسد. برای بررسی، صفحه را دوباره بار کنید.',
    'buy.whyOwned': 'آن یادگیرنده از قبل این دوره را دارد، پس خرید دوباره چیزی اضافه نمی‌کند.',
    'buy.whyChoose': 'انتخاب کنید این دوره برای چه کسی است.',
    'buy.whyNotYours':
      'آن یادگیرنده در حساب شما نیست. صفحه را دوباره بار کنید و از نو انتخاب کنید.',
    'buy.codeUnknown': 'این کد را نمی‌شناسیم. آن را بررسی کنید و دوباره تلاش کنید.',
    'buy.codeNotNow': 'این کد در حال حاضر فعال نیست: یا پایان یافته یا هنوز شروع نشده است.',
    'buy.codeNotHere': 'این کد در کشور شما در دسترس نیست.',
    'buy.codeNotCourse': 'این کد برای این دوره نیست.',
    'buy.codeOwn':
      'این کد دعوت خود شماست، پس نمی‌توان آن را در خرید خودتان به کار برد. این کد برای دوستی است که برایش می‌فرستید.',
    'buy.codeNewOnly': 'این کد فقط برای کسانی است که پیش‌تر چیزی نخریده‌اند.',
    'buy.codeUsedUp': 'ظرفیت این کد تمام شده است.',
    'buy.codeUsedYou': 'شما این کد را به اندازه‌ای که مجاز است به کار برده‌اید.',
    'buy.codeUsedFamily': 'خانوادهٔ شما این کد را به اندازه‌ای که مجاز است به کار برده است.',
    'buy.codeFree':
      'این کد دوره را کاملاً رایگان می‌کند و این صفحه نمی‌تواند آن را بپذیرد. با ما تماس بگیرید تا شما را مستقیم ثبت‌نام کنیم.',
    'buy.codeCurrency':
      'این کد به واحد پولی غیر از واحد پول این دوره است، پس اینجا قابل استفاده نیست.',
    'buy.codeNothing': 'این کد چیزی از این سفارش کم نمی‌کند.',
    'buy.whyFree': 'این دوره رایگان است. از صفحهٔ دوره به آن بپیوندید.',
    'buy.whyWithdrawal':
      'انتخاب شما دربارهٔ حق انصراف ۱۴روزه ثبت نشد، پس پرداخت آغاز نشد. هیچ مبلغی برداشت نشده است.',
    'buy.whyNoProvider':
      'هنوز هیچ ارائه‌دهندهٔ پرداختی متصل نشده است، پس این سفارش قابل پرداخت نیست.',
    'buy.whyPhone': 'این شمارهٔ تلفن معتبر نیست. آن را بررسی کنید و دوباره تلاش کنید.',
    'buy.whyProvider': 'پرداخت آغاز نشد. پیش از تلاش دوباره، سفارش‌های خود را ببینید.',
    'buy.refused': 'سفارش ثبت نشد. هیچ مبلغی برداشت نشده است.',
    'buy.unconfirmed':
      'نتوانستیم تأیید کنیم که سفارش شما ثبت شده است یا نه. پیش از تلاش دوباره، سفارش‌های خود را ببینید.',
  },
  'fa-af': {
    'buy.crumb': 'خرید',
    'buy.eyebrow': 'پرداخت و خرید',
    'buy.nobodyLead': 'هنوز کسی نیست که این کورس برایش خریده شود.',
    'buy.nobodyBody':
      'خرید کورس برای یک شاگرد است، پس باید یک نفر نام برده شود: خود شما در این حساب، یا پروفایل یک طفل در خانوادهٔ‌تان.',
    'buy.claim': 'برای خودم می‌خرم',
    'buy.claimNote': 'با این کار شما در این حساب شاگرد می‌شوید. این حساب دومی نیست.',
    'buy.addChild': 'به‌جای آن طفلی را اضافه کنید',
    'buy.backCourse': 'برگشت به کورس',
    'buy.subLead': 'این کورس به‌شکل اشتراک فروخته می‌شود، نه خرید یک‌باره.',
    'buy.subBody': 'اشتراک‌ها هنوز از این صفحه فروخته نمی‌شوند. هیچ مبلغی گرفته نشده است.',
    'buy.ambiguousLead': 'این کورس برای کشور شما بیشتر از یک قیمت دارد.',
    'buy.ambiguousBody':
      'ما به‌جای شما واحد پول انتخاب نمی‌کنیم. با ما به تماس شوید تا واحد درست را تعیین کنیم، بعد می‌توانید آن را بخرید.',
    'buy.noPriceLead': 'این کورس هنوز برای این کشور قیمت ندارد: {country}.',
    'buy.noPriceAny': 'این کورس هنوز برای کشور شما قیمت ندارد.',
    'buy.noPriceBody':
      'هیچ مبلغی گرفته نشده است. با ما به تماس شوید تا فروش را در کشور شما باز کنیم، بعد می‌توانید آن را بخرید.',
    'buy.hasAlready': '{name} از قبل این کورس را دارد. این خرید برای شاگرد دیگری است.',
    'buy.noProviderLead': 'هنوز هیچ ارائه‌کنندهٔ پرداخت وصل نشده است.',
    'buy.noProviderBody':
      'می‌توانید این فرمایش را بدهید و ذخیره می‌شود، اما تا وقتی ارائه‌کننده‌ای وصل نشود قابل پرداخت نیست. هیچ مبلغی گرفته نمی‌شود و کورس تا تأیید پرداخت باز نمی‌شود.',
    'buy.closedLead': 'خرید هنوز باز نیست.',
    'buy.closedBody':
      'این پلتفرم فعلاً برای کورس‌ها پرداخت نمی‌پذیرد، پس هیچ فرمایشی داده نمی‌شود و هیچ مبلغی گرفته نشده است. هنوز هم می‌توان از صفحهٔ کورس به کورس‌های رایگان یکجا شد.',
    'buy.notOnSale': 'این کورس فعلاً برای شما به فروش نمی‌رسد، پس چیزی برای پرداخت نیست.',
    'buy.payHeading': 'آنچه می‌پردازید',
    'buy.pricedFor': 'قیمت برای این کشور: {country}.',
    'buy.standardPrice': 'قیمت معیاری.',
    'buy.oneOff': 'خرید یک‌باره، نه اشتراک.',
    'buy.accessNote':
      'دسترسی با تأیید پرداخت شروع می‌شود، نه با فشار دادن دکمه. در هر دو حالت، فرمایش در صفحهٔ فرمایش‌های شما لست می‌شود.',
    'buy.whoFor': 'این برای کیست؟',
    'buy.choose': 'یک شاگرد را انتخاب کنید',
    'buy.learnerChild': '{name} (طفل)',
    'buy.whoNote': 'هر خرید برای یک شاگرد است. برای خرید به دو طفل، دو بار بخرید.',
    'buy.forOne': 'این خرید برای {name} است.',
    'buy.codeLabel': 'کد تخفیف',
    'buy.checkPrice': 'بررسی قیمت',
    'buy.checking': 'در حال بررسی…',
    'buy.codeNote':
      'کد دارید؟ اینجا وارد کنید. اگر برای این کورس معتبر نباشد، پیش از گرفتن هر مبلغی به شما گفته می‌شود.',
    'buy.quoteFailed': 'قیمت محاسبه نشد. دوباره کوشش کنید.',
    'buy.quoteSimple': 'شما {amount} می‌پردازید.',
    'buy.quoteList': 'قیمت اعلام‌شده {amount}',
    'buy.quoteOffCode': 'کد {code} به اندازهٔ {amount} کم می‌کند',
    'buy.quoteOff': 'تخفیف {amount}',
    'buy.quoteTax': 'مالیه {amount}',
    'buy.quoteFee': 'فیس {amount}',
    'buy.quotePay': 'شما {amount} می‌پردازید.',
    'buy.quoteTaxNote': 'مالیه و فیس بر اساس قیمت بعد از تخفیف محاسبه می‌شود.',
    'buy.quoteHolds': 'تا وقتی فرمایش ندهید چیزی نگه داشته نمی‌شود.',
    'buy.payWith': 'پرداخت با',
    'buy.phoneLabel': 'شمارهٔ پول موبایل',
    'buy.phoneNote': 'شماره‌ای که از آن خواسته می‌شود پرداخت را تأیید کند.',
    'buy.continue': 'ادامه به پرداخت',
    'buy.starting': 'در حال شروع…',
    'buy.noProviderNote': 'این فرمایش ثبت می‌شود اما هنوز قابل پرداخت نیست.',
    'buy.approve':
      'پرداخت را در تلفون خود تأیید کنید. کورس شما با تأیید پرداخت باز می‌شود. شاید کمی وقت بگیرد.',
    'buy.orderSaved': 'فرمایش شما ذخیره شد.',
    'buy.signedOut': 'از حساب خارج شده‌اید. دوباره داخل شوید و یک بار دیگر کوشش کنید.',
    'buy.whyClosed': 'خرید هنوز باز نیست، پس فرمایشی داده نشد. هیچ مبلغی گرفته نشده است.',
    'buy.whyNoCourse': 'این کورس فعلاً قابل خرید نیست.',
    'buy.whyNoPrice': 'این کورس فعلاً به فروش نمی‌رسد. برای بررسی، صفحه را دوباره بار کنید.',
    'buy.whyOwned': 'آن شاگرد از قبل این کورس را دارد، پس خرید دوباره چیزی اضافه نمی‌کند.',
    'buy.whyChoose': 'انتخاب کنید این کورس برای کیست.',
    'buy.whyNotYours': 'آن شاگرد در حساب شما نیست. صفحه را دوباره بار کنید و از نو انتخاب کنید.',
    'buy.codeUnknown': 'این کد را نمی‌شناسیم. آن را بررسی کنید و دوباره کوشش کنید.',
    'buy.codeNotNow': 'این کد فعلاً فعال نیست: یا ختم شده یا هنوز شروع نشده است.',
    'buy.codeNotHere': 'این کد در کشور شما در دسترس نیست.',
    'buy.codeNotCourse': 'این کد برای این کورس نیست.',
    'buy.codeOwn':
      'این کد دعوت خود شماست، پس نمی‌توان آن را در خرید خودتان استفاده کرد. این کد برای دوستی است که برایش می‌فرستید.',
    'buy.codeNewOnly': 'این کد تنها برای کسانی است که پیش از این چیزی نخریده‌اند.',
    'buy.codeUsedUp': 'ظرفیت این کد تمام شده است.',
    'buy.codeUsedYou': 'شما این کد را به اندازه‌ای که اجازه دارد استفاده کرده‌اید.',
    'buy.codeUsedFamily': 'خانوادهٔ شما این کد را به اندازه‌ای که اجازه دارد استفاده کرده است.',
    'buy.codeFree':
      'این کد کورس را کاملاً رایگان می‌سازد و این صفحه نمی‌تواند آن را بپذیرد. با ما به تماس شوید تا شما را مستقیم ثبت‌نام کنیم.',
    'buy.codeCurrency':
      'این کد به واحد پولی غیر از واحد پول این کورس است، پس اینجا قابل استفاده نیست.',
    'buy.codeNothing': 'این کد چیزی از این فرمایش کم نمی‌کند.',
    'buy.whyFree': 'این کورس رایگان است. از صفحهٔ کورس به آن یکجا شوید.',
    'buy.whyWithdrawal':
      'انتخاب شما دربارهٔ حق انصراف ۱۴روزه ثبت نشد، پس پرداخت شروع نشد. هیچ مبلغی گرفته نشده است.',
    'buy.whyNoProvider':
      'هنوز هیچ ارائه‌کنندهٔ پرداخت وصل نشده است، پس این فرمایش قابل پرداخت نیست.',
    'buy.whyPhone': 'این شمارهٔ تلفون درست نیست. آن را بررسی کنید و دوباره کوشش کنید.',
    'buy.whyProvider': 'پرداخت شروع نشد. پیش از کوشش دوباره، فرمایش‌های خود را ببینید.',
    'buy.refused': 'فرمایش داده نشد. هیچ مبلغی گرفته نشده است.',
    'buy.unconfirmed':
      'نتوانستیم تأیید کنیم که فرمایش شما داده شده است یا نه. پیش از کوشش دوباره، فرمایش‌های خود را ببینید.',
  },
  tr: {
    'buy.crumb': 'Satın al',
    'buy.eyebrow': 'Ödeme',
    'buy.nobodyLead': 'Bunun satın alınacağı kimse henüz yok.',
    'buy.nobodyBody':
      'Bir kurs satın alımı tek bir öğrenciyi kapsar; bu yüzden adı verilecek biri olmalıdır: bu hesapta siz ya da ailenizdeki bir çocuğun profili.',
    'buy.claim': 'Kendim için satın al',
    'buy.claimNote': 'Bu işlem sizi bu hesapta öğrenci yapar. İkinci bir hesap değildir.',
    'buy.addChild': 'Bunun yerine çocuk ekle',
    'buy.backCourse': 'Kursa dön',
    'buy.subLead': 'Bu kurs tek seferlik satın alma olarak değil, abonelik olarak satılıyor.',
    'buy.subBody': 'Abonelikler henüz bu ödeme sayfasından satılmıyor. Hiçbir ücret alınmadı.',
    'buy.ambiguousLead': 'Bu kursun ülkeniz için birden fazla fiyatı var.',
    'buy.ambiguousBody':
      'Sizin adınıza para birimi seçmeyiz. Bize ulaşın, doğrusunu belirleyelim; sonra satın alabilirsiniz.',
    'buy.noPriceLead': 'Bu kursun şu ülke için henüz fiyatı yok: {country}.',
    'buy.noPriceAny': 'Bu kursun ülkeniz için henüz fiyatı yok.',
    'buy.noPriceBody':
      'Hiçbir ücret alınmadı. Bize ulaşın, ülkenizde satışı açalım; sonra satın alabilirsiniz.',
    'buy.hasAlready':
      'Bu kurs şu öğrencide zaten var: {name}. Bu satın alma başka bir öğrenci içindir.',
    'buy.noProviderLead': 'Henüz bağlı bir ödeme sağlayıcısı yok.',
    'buy.noProviderBody':
      'Bu siparişi verebilirsiniz ve kaydedilir, ancak bir sağlayıcı bağlanana kadar ödenemez. Hiçbir ücret alınmaz ve ödeme onaylanana kadar kurs açılmaz.',
    'buy.closedLead': 'Ödeme sayfası henüz açık değil.',
    'buy.closedBody':
      'Bu platform şu anda kurslar için ödeme almıyor; bu yüzden sipariş verilemez ve hiçbir ücret alınmadı. Ücretsiz kurslara kurs sayfasından yine katılabilirsiniz.',
    'buy.notOnSale': 'Bu kurs şu anda size satışta değil, dolayısıyla ödenecek bir şey yok.',
    'buy.payHeading': 'Ödeyeceğiniz tutar',
    'buy.pricedFor': 'Şu ülkenin fiyatı: {country}.',
    'buy.standardPrice': 'Standart fiyat.',
    'buy.oneOff': 'Tek seferlik satın alma, abonelik değil.',
    'buy.accessNote':
      'Erişim, düğmeye bastığınızda değil, ödeme onaylandığında başlar. Her iki durumda da sipariş, siparişleriniz sayfasında listelenir.',
    'buy.whoFor': 'Bu kimin için?',
    'buy.choose': 'Bir öğrenci seçin',
    'buy.learnerChild': '{name} (çocuk)',
    'buy.whoNote':
      'Bir satın alma tek bir öğrenciyi kapsar. İki çocuk için almak istiyorsanız iki kez satın alın.',
    'buy.forOne': 'Bu satın alma şu öğrenci içindir: {name}.',
    'buy.codeLabel': 'İndirim kodu',
    'buy.checkPrice': 'Fiyatı kontrol et',
    'buy.checking': 'Kontrol ediliyor…',
    'buy.codeNote':
      'Kodunuz mu var? Buraya girin. Bu kurs için geçerli değilse, herhangi bir ücret alınmadan önce size bildirilir.',
    'buy.quoteFailed': 'Fiyat hesaplanamadı. Yeniden deneyin.',
    'buy.quoteSimple': 'Ödeyeceğiniz tutar: {amount}.',
    'buy.quoteList': 'Liste fiyatı {amount}',
    'buy.quoteOffCode': '{code} kodu ile indirim {amount}',
    'buy.quoteOff': 'indirim {amount}',
    'buy.quoteTax': 'vergi {amount}',
    'buy.quoteFee': 'ücret {amount}',
    'buy.quotePay': 'ödeyeceğiniz tutar {amount}.',
    'buy.quoteTaxNote': 'Vergi ve ücretler, indirimden sonraki fiyat üzerinden hesaplanır.',
    'buy.quoteHolds': 'Siparişi verene kadar hiçbir şey ayrılmaz.',
    'buy.payWith': 'Ödeme yöntemi',
    'buy.phoneLabel': 'Mobil para numarası',
    'buy.phoneNote': 'Ödemeyi onaylaması istenecek numara.',
    'buy.continue': 'Ödemeye devam et',
    'buy.starting': 'Başlatılıyor…',
    'buy.noProviderNote': 'Bu sipariş kaydedilecek ama henüz ödenemez.',
    'buy.approve':
      'Ödemeyi telefonunuzdan onaylayın. Ödeme onaylanınca kursunuz açılır. Bu biraz zaman alabilir.',
    'buy.orderSaved': 'Siparişiniz kaydedildi.',
    'buy.signedOut': 'Oturumunuz kapanmış. Yeniden oturum açın, sonra bir kez daha deneyin.',
    'buy.whyClosed':
      'Ödeme sayfası henüz açık değil, bu yüzden sipariş verilmedi. Hiçbir ücret alınmadı.',
    'buy.whyNoCourse': 'Bu kurs şu anda satın alınamıyor.',
    'buy.whyNoPrice': 'Bu kurs şu anda satışta değil. Kontrol etmek için sayfayı yeniden yükleyin.',
    'buy.whyOwned': 'O öğrencide bu kurs zaten var; yeniden satın almak hiçbir şey eklemez.',
    'buy.whyChoose': 'Bu kursun kimin için olduğunu seçin.',
    'buy.whyNotYours': 'O öğrenci hesabınızda değil. Sayfayı yeniden yükleyip tekrar seçin.',
    'buy.codeUnknown': 'Bu kodu tanımıyoruz. Kontrol edip yeniden deneyin.',
    'buy.codeNotNow': 'Bu kod şu anda geçerli değil: süresi dolmuş ya da henüz başlamamış.',
    'buy.codeNotHere': 'Bu kod ülkenizde kullanılamıyor.',
    'buy.codeNotCourse': 'Bu kod bu kurs için değil.',
    'buy.codeOwn':
      'Bu sizin kendi davet kodunuz; bu yüzden kendi satın almanızda kullanılamaz. Kodu gönderdiğiniz arkadaşınız içindir.',
    'buy.codeNewOnly': 'Bu kod yalnızca daha önce hiçbir şey satın almamış kişiler içindir.',
    'buy.codeUsedUp': 'Bu kodun kullanım hakkı dolmuş.',
    'buy.codeUsedYou': 'Bu kodu izin verdiği kadar kullandınız.',
    'buy.codeUsedFamily': 'Aileniz bu kodu izin verdiği kadar kullandı.',
    'buy.codeFree':
      'Bu kod kursu tamamen ücretsiz yapar; bu ödeme sayfası bunu kabul edemez. Bize ulaşın, sizi doğrudan kaydedelim.',
    'buy.codeCurrency':
      'Bu kod, bu kurstan farklı bir para biriminde; bu yüzden burada kullanılamaz.',
    'buy.codeNothing': 'Bu kod bu siparişten hiçbir şey düşmüyor.',
    'buy.whyFree': 'Bu kurs ücretsiz. Kurs sayfasından katılın.',
    'buy.whyWithdrawal':
      '14 günlük cayma hakkına ilişkin seçiminiz kaydedilemedi, bu yüzden ödeme başlatılmadı. Hiçbir ücret alınmadı.',
    'buy.whyNoProvider': 'Henüz bağlı bir ödeme sağlayıcısı yok, bu yüzden bu sipariş ödenemez.',
    'buy.whyPhone': 'Bu telefon numarası geçerli değil. Kontrol edip yeniden deneyin.',
    'buy.whyProvider': 'Ödeme başlatılamadı. Yeniden denemeden önce siparişlerinize bakın.',
    'buy.refused': 'Sipariş verilemedi. Hiçbir ücret alınmadı.',
    'buy.unconfirmed':
      'Siparişinizin verilip verilmediğini doğrulayamadık. Yeniden denemeden önce siparişlerinize bakın.',
  },
  id: {
    'buy.crumb': 'Beli',
    'buy.eyebrow': 'Pembayaran',
    'buy.nobodyLead': 'Belum ada orang yang dapat dibelikan kursus ini.',
    'buy.nobodyBody':
      'Pembelian kursus berlaku untuk satu peserta didik, jadi harus ada satu yang disebutkan: Anda di akun ini, atau profil anak di keluarga Anda.',
    'buy.claim': 'Beli untuk saya sendiri',
    'buy.claimNote': 'Ini menjadikan Anda peserta didik di akun ini. Ini bukan akun kedua.',
    'buy.addChild': 'Tambahkan anak saja',
    'buy.backCourse': 'Kembali ke kursus',
    'buy.subLead': 'Kursus ini dijual sebagai langganan, bukan pembelian sekali bayar.',
    'buy.subBody': 'Langganan belum dijual melalui halaman pembayaran ini. Tidak ada yang ditagih.',
    'buy.ambiguousLead': 'Kursus ini memiliki lebih dari satu harga untuk negara Anda.',
    'buy.ambiguousBody':
      'Kami tidak akan memilih mata uang atas nama Anda. Hubungi kami dan kami akan menetapkan yang benar, lalu Anda dapat membelinya.',
    'buy.noPriceLead': 'Kursus ini belum memiliki harga untuk negara ini: {country}.',
    'buy.noPriceAny': 'Kursus ini belum memiliki harga untuk negara Anda.',
    'buy.noPriceBody':
      'Tidak ada yang ditagih. Hubungi kami dan kami akan membuka penjualan di negara Anda, lalu Anda dapat membelinya.',
    'buy.hasAlready': '{name} sudah memiliki kursus ini. Pembelian ini untuk peserta didik lain.',
    'buy.noProviderLead': 'Belum ada penyedia pembayaran yang terhubung.',
    'buy.noProviderBody':
      'Anda dapat membuat pesanan ini dan pesanan akan disimpan, tetapi belum dapat dibayar sampai ada penyedia yang terhubung. Tidak ada yang ditagih, dan kursus tidak terbuka sampai pembayaran dikonfirmasi.',
    'buy.closedLead': 'Pembayaran belum dibuka.',
    'buy.closedBody':
      'Platform ini sedang tidak menerima pembayaran untuk kursus, jadi pesanan tidak dapat dibuat dan tidak ada yang ditagih. Kursus gratis tetap dapat diikuti dari halaman kursus.',
    'buy.notOnSale':
      'Kursus ini sedang tidak dijual kepada Anda, jadi tidak ada yang perlu dibayar.',
    'buy.payHeading': 'Yang akan Anda bayar',
    'buy.pricedFor': 'Harga untuk negara ini: {country}.',
    'buy.standardPrice': 'Harga standar.',
    'buy.oneOff': 'Pembelian sekali bayar, bukan langganan.',
    'buy.accessNote':
      'Akses dimulai saat pembayaran dikonfirmasi, bukan saat Anda menekan tombol. Dalam kedua keadaan, pesanan tercantum di halaman pesanan Anda.',
    'buy.whoFor': 'Untuk siapa ini?',
    'buy.choose': 'Pilih peserta didik',
    'buy.learnerChild': '{name} (anak)',
    'buy.whoNote':
      'Satu pembelian berlaku untuk satu peserta didik. Untuk membelikan dua anak, belilah dua kali.',
    'buy.forOne': 'Pembelian ini untuk {name}.',
    'buy.codeLabel': 'Kode diskon',
    'buy.checkPrice': 'Periksa harga',
    'buy.checking': 'Memeriksa…',
    'buy.codeNote':
      'Punya kode? Masukkan di sini. Jika tidak berlaku untuk kursus ini, Anda akan diberi tahu sebelum ada yang ditagih.',
    'buy.quoteFailed': 'Harga tidak dapat dihitung. Coba lagi.',
    'buy.quoteSimple': 'Anda akan membayar {amount}.',
    'buy.quoteList': 'Harga daftar {amount}',
    'buy.quoteOffCode': 'kode {code} memotong {amount}',
    'buy.quoteOff': 'diskon {amount}',
    'buy.quoteTax': 'pajak {amount}',
    'buy.quoteFee': 'biaya {amount}',
    'buy.quotePay': 'Anda membayar {amount}.',
    'buy.quoteTaxNote': 'Pajak dan biaya dihitung dari harga setelah diskon.',
    'buy.quoteHolds': 'Tidak ada yang dicadangkan sampai Anda membuat pesanan.',
    'buy.payWith': 'Bayar dengan',
    'buy.phoneLabel': 'Nomor uang seluler',
    'buy.phoneNote': 'Nomor yang akan diminta menyetujui pembayaran.',
    'buy.continue': 'Lanjutkan ke pembayaran',
    'buy.starting': 'Memulai…',
    'buy.noProviderNote': 'Pesanan ini akan dicatat tetapi belum dapat dibayar.',
    'buy.approve':
      'Setujui pembayaran di ponsel Anda. Kursus Anda terbuka setelah pembayaran dikonfirmasi. Ini mungkin memerlukan waktu sebentar.',
    'buy.orderSaved': 'Pesanan Anda telah disimpan.',
    'buy.signedOut': 'Anda sudah keluar. Masuk lagi, lalu coba sekali lagi.',
    'buy.whyClosed':
      'Pembayaran belum dibuka, jadi tidak ada pesanan yang dibuat. Tidak ada yang ditagih.',
    'buy.whyNoCourse': 'Kursus ini sedang tidak dapat dibeli.',
    'buy.whyNoPrice': 'Kursus ini sedang tidak dijual. Muat ulang halaman untuk memeriksa.',
    'buy.whyOwned':
      'Peserta didik itu sudah memiliki kursus ini, jadi membelinya lagi tidak menambah apa pun.',
    'buy.whyChoose': 'Pilih untuk siapa kursus ini.',
    'buy.whyNotYours':
      'Peserta didik itu tidak ada di akun Anda. Muat ulang halaman dan pilih lagi.',
    'buy.codeUnknown': 'Kode itu tidak kami kenali. Periksa lalu coba lagi.',
    'buy.codeNotNow': 'Kode itu sedang tidak berlaku: sudah berakhir atau belum dimulai.',
    'buy.codeNotHere': 'Kode itu tidak tersedia di negara Anda.',
    'buy.codeNotCourse': 'Kode itu bukan untuk kursus ini.',
    'buy.codeOwn':
      'Itu kode undangan Anda sendiri, jadi tidak dapat dipakai untuk pembelian Anda sendiri. Kode itu untuk teman yang Anda kirimi.',
    'buy.codeNewOnly': 'Kode itu hanya untuk orang yang belum pernah membeli apa pun.',
    'buy.codeUsedUp': 'Kode itu sudah habis dipakai.',
    'buy.codeUsedYou': 'Anda sudah memakai kode itu sebanyak yang diizinkan.',
    'buy.codeUsedFamily': 'Keluarga Anda sudah memakai kode itu sebanyak yang diizinkan.',
    'buy.codeFree':
      'Kode itu akan membuat kursus sepenuhnya gratis, dan halaman pembayaran ini tidak dapat menerimanya. Hubungi kami dan kami akan mendaftarkan Anda secara langsung.',
    'buy.codeCurrency':
      'Kode itu dalam mata uang yang berbeda dari kursus ini, jadi tidak dapat dipakai di sini.',
    'buy.codeNothing': 'Kode itu tidak mengurangi apa pun dari pesanan ini.',
    'buy.whyFree': 'Kursus ini gratis. Ikuti dari halaman kursus.',
    'buy.whyWithdrawal':
      'Pilihan Anda tentang hak pembatalan 14 hari tidak dapat dicatat, jadi pembayaran tidak dimulai. Tidak ada yang ditagih.',
    'buy.whyNoProvider':
      'Belum ada penyedia pembayaran yang terhubung, jadi pesanan ini tidak dapat dibayar.',
    'buy.whyPhone': 'Nomor telepon itu tidak valid. Periksa lalu coba lagi.',
    'buy.whyProvider': 'Pembayaran tidak dapat dimulai. Lihat pesanan Anda sebelum mencoba lagi.',
    'buy.refused': 'Pesanan tidak dapat dibuat. Tidak ada yang ditagih.',
    'buy.unconfirmed':
      'Kami tidak dapat memastikan apakah pesanan Anda telah dibuat. Lihat pesanan Anda sebelum mencoba lagi.',
  },
  ms: {
    'buy.crumb': 'Beli',
    'buy.eyebrow': 'Pembayaran',
    'buy.nobodyLead': 'Belum ada sesiapa untuk dibelikan kursus ini.',
    'buy.nobodyBody':
      'Pembelian kursus meliputi seorang pelajar, jadi mesti ada seorang yang dinamakan: anda pada akaun ini, atau profil anak dalam keluarga anda.',
    'buy.claim': 'Beli untuk diri saya',
    'buy.claimNote': 'Ini menjadikan anda pelajar pada akaun ini. Ini bukan akaun kedua.',
    'buy.addChild': 'Tambah anak sebagai ganti',
    'buy.backCourse': 'Kembali ke kursus',
    'buy.subLead': 'Kursus ini dijual sebagai langganan, bukan pembelian sekali sahaja.',
    'buy.subBody':
      'Langganan belum dijual melalui halaman pembayaran ini. Tiada apa-apa yang dicaj.',
    'buy.ambiguousLead': 'Kursus ini mempunyai lebih daripada satu harga untuk negara anda.',
    'buy.ambiguousBody':
      'Kami tidak akan memilih mata wang bagi pihak anda. Hubungi kami dan kami akan menetapkan yang betul, kemudian anda boleh membelinya.',
    'buy.noPriceLead': 'Kursus ini belum mempunyai harga untuk negara ini: {country}.',
    'buy.noPriceAny': 'Kursus ini belum mempunyai harga untuk negara anda.',
    'buy.noPriceBody':
      'Tiada apa-apa yang dicaj. Hubungi kami dan kami akan membuka jualan di negara anda, kemudian anda boleh membelinya.',
    'buy.hasAlready': '{name} sudah mempunyai kursus ini. Pembelian ini untuk pelajar lain.',
    'buy.noProviderLead': 'Belum ada penyedia pembayaran yang disambungkan.',
    'buy.noProviderBody':
      'Anda boleh membuat pesanan ini dan ia akan disimpan, tetapi ia tidak boleh dibayar sehingga penyedia disambungkan. Tiada apa-apa yang dicaj, dan kursus tidak dibuka sehingga pembayaran disahkan.',
    'buy.closedLead': 'Pembayaran belum dibuka.',
    'buy.closedBody':
      'Platform ini tidak menerima bayaran untuk kursus buat masa ini, jadi pesanan tidak boleh dibuat dan tiada apa-apa yang dicaj. Kursus percuma masih boleh disertai dari halaman kursus.',
    'buy.notOnSale':
      'Kursus ini tidak dijual kepada anda buat masa ini, jadi tiada apa-apa untuk dibayar.',
    'buy.payHeading': 'Apa yang anda akan bayar',
    'buy.pricedFor': 'Harga untuk negara ini: {country}.',
    'buy.standardPrice': 'Harga standard.',
    'buy.oneOff': 'Pembelian sekali sahaja, bukan langganan.',
    'buy.accessNote':
      'Akses bermula apabila pembayaran disahkan, bukan apabila anda menekan butang. Dalam kedua-dua keadaan, pesanan disenaraikan pada halaman pesanan anda.',
    'buy.whoFor': 'Ini untuk siapa?',
    'buy.choose': 'Pilih pelajar',
    'buy.learnerChild': '{name} (anak)',
    'buy.whoNote':
      'Satu pembelian meliputi seorang pelajar. Untuk membeli bagi dua orang anak, beli dua kali.',
    'buy.forOne': 'Pembelian ini untuk {name}.',
    'buy.codeLabel': 'Kod diskaun',
    'buy.checkPrice': 'Semak harga',
    'buy.checking': 'Sedang menyemak…',
    'buy.codeNote':
      'Ada kod? Masukkan di sini. Jika ia tidak sah untuk kursus ini, anda akan dimaklumkan sebelum apa-apa dicaj.',
    'buy.quoteFailed': 'Harga itu tidak dapat dikira. Cuba lagi.',
    'buy.quoteSimple': 'Anda akan membayar {amount}.',
    'buy.quoteList': 'Harga senarai {amount}',
    'buy.quoteOffCode': 'kod {code} menolak {amount}',
    'buy.quoteOff': 'diskaun {amount}',
    'buy.quoteTax': 'cukai {amount}',
    'buy.quoteFee': 'yuran {amount}',
    'buy.quotePay': 'anda membayar {amount}.',
    'buy.quoteTaxNote': 'Cukai dan yuran dikira daripada harga selepas sebarang diskaun.',
    'buy.quoteHolds': 'Tiada apa-apa yang ditempah sehingga anda membuat pesanan.',
    'buy.payWith': 'Bayar dengan',
    'buy.phoneLabel': 'Nombor wang mudah alih',
    'buy.phoneNote': 'Nombor yang akan diminta meluluskan pembayaran.',
    'buy.continue': 'Teruskan ke pembayaran',
    'buy.starting': 'Sedang bermula…',
    'buy.noProviderNote': 'Pesanan ini akan direkodkan tetapi belum boleh dibayar.',
    'buy.approve':
      'Luluskan pembayaran pada telefon anda. Kursus anda dibuka sebaik sahaja pembayaran disahkan. Ini mungkin mengambil sedikit masa.',
    'buy.orderSaved': 'Pesanan anda telah disimpan.',
    'buy.signedOut': 'Anda telah log keluar. Log masuk semula, kemudian cuba sekali lagi.',
    'buy.whyClosed':
      'Pembayaran belum dibuka, jadi tiada pesanan dibuat. Tiada apa-apa yang dicaj.',
    'buy.whyNoCourse': 'Kursus ini tidak boleh dibeli buat masa ini.',
    'buy.whyNoPrice': 'Kursus ini tidak dijual buat masa ini. Muat semula halaman untuk menyemak.',
    'buy.whyOwned':
      'Pelajar itu sudah mempunyai kursus ini, jadi membelinya lagi tidak menambah apa-apa.',
    'buy.whyChoose': 'Pilih untuk siapa kursus ini.',
    'buy.whyNotYours': 'Pelajar itu tiada pada akaun anda. Muat semula halaman dan pilih semula.',
    'buy.codeUnknown': 'Kod itu tidak kami kenali. Semak dan cuba lagi.',
    'buy.codeNotNow': 'Kod itu tidak berjalan buat masa ini: ia telah tamat atau belum bermula.',
    'buy.codeNotHere': 'Kod itu tidak tersedia di negara anda.',
    'buy.codeNotCourse': 'Kod itu bukan untuk kursus ini.',
    'buy.codeOwn':
      'Itu kod jemputan anda sendiri, jadi ia tidak boleh digunakan untuk pembelian anda sendiri. Ia untuk rakan yang anda hantarkan.',
    'buy.codeNewOnly': 'Kod itu hanya untuk orang yang belum pernah membeli apa-apa.',
    'buy.codeUsedUp': 'Kod itu telah habis digunakan.',
    'buy.codeUsedYou': 'Anda telah menggunakan kod itu sebanyak yang dibenarkan.',
    'buy.codeUsedFamily': 'Keluarga anda telah menggunakan kod itu sebanyak yang dibenarkan.',
    'buy.codeFree':
      'Kod itu akan menjadikan kursus percuma sepenuhnya, dan halaman pembayaran ini tidak dapat menerimanya. Hubungi kami dan kami akan mendaftarkan anda secara terus.',
    'buy.codeCurrency':
      'Kod itu dalam mata wang yang berbeza daripada kursus ini, jadi ia tidak boleh digunakan di sini.',
    'buy.codeNothing': 'Kod itu tidak menolak apa-apa daripada pesanan ini.',
    'buy.whyFree': 'Kursus ini percuma. Sertai dari halaman kursus.',
    'buy.whyWithdrawal':
      'Pilihan anda tentang hak penarikan balik 14 hari tidak dapat direkodkan, jadi pembayaran tidak dimulakan. Tiada apa-apa yang dicaj.',
    'buy.whyNoProvider':
      'Belum ada penyedia pembayaran yang disambungkan, jadi pesanan ini tidak boleh dibayar.',
    'buy.whyPhone': 'Nombor telefon itu tidak sah. Semak dan cuba lagi.',
    'buy.whyProvider': 'Pembayaran tidak dapat dimulakan. Lihat pesanan anda sebelum mencuba lagi.',
    'buy.refused': 'Pesanan tidak dapat dibuat. Tiada apa-apa yang dicaj.',
    'buy.unconfirmed':
      'Kami tidak dapat mengesahkan sama ada pesanan anda telah dibuat. Lihat pesanan anda sebelum mencuba lagi.',
  },
  bn: {
    'buy.crumb': 'কিনুন',
    'buy.eyebrow': 'চেকআউট',
    'buy.nobodyLead': 'এটি কার জন্য কেনা হবে, এমন কেউ এখনও নেই।',
    'buy.nobodyBody':
      'একটি কোর্স কেনা একজন শিক্ষার্থীর জন্য, তাই একজনের নাম থাকতে হবে: এই অ্যাকাউন্টে আপনি নিজে, অথবা আপনার পরিবারের কোনো শিশুর প্রোফাইল।',
    'buy.claim': 'নিজের জন্য কিনুন',
    'buy.claimNote':
      'এতে আপনি এই অ্যাকাউন্টে শিক্ষার্থী হয়ে যাবেন। এটি দ্বিতীয় কোনো অ্যাকাউন্ট নয়।',
    'buy.addChild': 'এর বদলে একটি শিশু যোগ করুন',
    'buy.backCourse': 'কোর্সে ফিরে যান',
    'buy.subLead': 'এই কোর্সটি একবারের কেনাকাটা হিসেবে নয়, সাবস্ক্রিপশন হিসেবে বিক্রি হয়।',
    'buy.subBody': 'এই চেকআউট থেকে এখনও সাবস্ক্রিপশন বিক্রি হচ্ছে না। কোনো টাকা নেওয়া হয়নি।',
    'buy.ambiguousLead': 'আপনার দেশের জন্য এই কোর্সের একাধিক মূল্য রয়েছে।',
    'buy.ambiguousBody':
      'আমরা আপনার হয়ে মুদ্রা বেছে নেব না। আমাদের সঙ্গে যোগাযোগ করুন, আমরা সঠিকটি ঠিক করে দেব, তারপর আপনি এটি কিনতে পারবেন।',
    'buy.noPriceLead': 'এই দেশের জন্য এই কোর্সের মূল্য এখনও ঠিক হয়নি: {country}।',
    'buy.noPriceAny': 'আপনার দেশের জন্য এই কোর্সের মূল্য এখনও ঠিক হয়নি।',
    'buy.noPriceBody':
      'কোনো টাকা নেওয়া হয়নি। আমাদের সঙ্গে যোগাযোগ করুন, আমরা আপনার দেশে বিক্রি চালু করব, তারপর আপনি এটি কিনতে পারবেন।',
    'buy.hasAlready':
      '{name}-এর কাছে এই কোর্সটি আগে থেকেই আছে। এই কেনাকাটা অন্য একজন শিক্ষার্থীর জন্য।',
    'buy.noProviderLead': 'এখনও কোনো পেমেন্ট প্রদানকারী সংযুক্ত হয়নি।',
    'buy.noProviderBody':
      'আপনি এই অর্ডারটি দিতে পারেন এবং এটি সংরক্ষিত হবে, কিন্তু কোনো প্রদানকারী সংযুক্ত না হওয়া পর্যন্ত এর মূল্য পরিশোধ করা যাবে না। কোনো টাকা নেওয়া হয় না, এবং পেমেন্ট নিশ্চিত না হওয়া পর্যন্ত কোর্স খোলে না।',
    'buy.closedLead': 'চেকআউট এখনও খোলা হয়নি।',
    'buy.closedBody':
      'এই প্ল্যাটফর্ম এই মুহূর্তে কোর্সের জন্য পেমেন্ট নিচ্ছে না, তাই কোনো অর্ডার দেওয়া যাবে না এবং কোনো টাকা নেওয়া হয়নি। বিনামূল্যের কোর্সে এখনও কোর্সের পৃষ্ঠা থেকে যোগ দেওয়া যায়।',
    'buy.notOnSale':
      'এই কোর্সটি এই মুহূর্তে আপনার কাছে বিক্রির জন্য নেই, তাই পরিশোধ করার কিছু নেই।',
    'buy.payHeading': 'আপনি যা পরিশোধ করবেন',
    'buy.pricedFor': 'এই দেশের জন্য মূল্য: {country}।',
    'buy.standardPrice': 'সাধারণ মূল্য।',
    'buy.oneOff': 'একবারের কেনাকাটা, সাবস্ক্রিপশন নয়।',
    'buy.accessNote':
      'বোতাম চাপলে নয়, পেমেন্ট নিশ্চিত হলে প্রবেশাধিকার শুরু হয়। উভয় ক্ষেত্রেই অর্ডারটি আপনার অর্ডারের পৃষ্ঠায় তালিকাভুক্ত থাকে।',
    'buy.whoFor': 'এটি কার জন্য?',
    'buy.choose': 'একজন শিক্ষার্থী বেছে নিন',
    'buy.learnerChild': '{name} (শিশু)',
    'buy.whoNote': 'একটি কেনাকাটা একজন শিক্ষার্থীর জন্য। দুই শিশুর জন্য কিনতে হলে দুবার কিনুন।',
    'buy.forOne': 'এই কেনাকাটা {name}-এর জন্য।',
    'buy.codeLabel': 'ডিসকাউন্ট কোড',
    'buy.checkPrice': 'মূল্য দেখুন',
    'buy.checking': 'দেখা হচ্ছে…',
    'buy.codeNote':
      'কোড আছে? এখানে লিখুন। এটি এই কোর্সে প্রযোজ্য না হলে, কোনো টাকা নেওয়ার আগেই আপনাকে জানানো হবে।',
    'buy.quoteFailed': 'মূল্য হিসাব করা যায়নি। আবার চেষ্টা করুন।',
    'buy.quoteSimple': 'আপনি {amount} পরিশোধ করবেন।',
    'buy.quoteList': 'তালিকা মূল্য {amount}',
    'buy.quoteOffCode': 'কোড {code} দিয়ে {amount} কম',
    'buy.quoteOff': 'ছাড় {amount}',
    'buy.quoteTax': 'কর {amount}',
    'buy.quoteFee': 'ফি {amount}',
    'buy.quotePay': 'আপনি পরিশোধ করবেন {amount}।',
    'buy.quoteTaxNote': 'কর ও ফি ছাড়ের পরের মূল্যের ওপর হিসাব করা হয়।',
    'buy.quoteHolds': 'আপনি অর্ডার না দেওয়া পর্যন্ত কিছুই সংরক্ষিত রাখা হয় না।',
    'buy.payWith': 'যা দিয়ে পরিশোধ করবেন',
    'buy.phoneLabel': 'মোবাইল মানি নম্বর',
    'buy.phoneNote': 'যে নম্বরে পেমেন্ট অনুমোদন করতে বলা হবে।',
    'buy.continue': 'পেমেন্টে এগিয়ে যান',
    'buy.starting': 'শুরু হচ্ছে…',
    'buy.noProviderNote': 'এই অর্ডারটি নথিভুক্ত হবে, কিন্তু এখনও এর মূল্য পরিশোধ করা যাবে না।',
    'buy.approve':
      'আপনার ফোনে পেমেন্ট অনুমোদন করুন। পেমেন্ট নিশ্চিত হলেই আপনার কোর্স খুলে যাবে। এতে কিছুটা সময় লাগতে পারে।',
    'buy.orderSaved': 'আপনার অর্ডার সংরক্ষিত হয়েছে।',
    'buy.signedOut': 'আপনি সাইন আউট হয়ে গেছেন। আবার সাইন ইন করুন, তারপর আরেকবার চেষ্টা করুন।',
    'buy.whyClosed':
      'চেকআউট এখনও খোলা হয়নি, তাই কোনো অর্ডার দেওয়া হয়নি। কোনো টাকা নেওয়া হয়নি।',
    'buy.whyNoCourse': 'এই কোর্সটি এই মুহূর্তে কেনা যাচ্ছে না।',
    'buy.whyNoPrice': 'এই কোর্সটি এই মুহূর্তে বিক্রির জন্য নেই। দেখতে পৃষ্ঠাটি আবার লোড করুন।',
    'buy.whyOwned':
      'ওই শিক্ষার্থীর কাছে এই কোর্সটি আগে থেকেই আছে, তাই আবার কিনলে কিছুই যোগ হবে না।',
    'buy.whyChoose': 'এই কোর্সটি কার জন্য, তা বেছে নিন।',
    'buy.whyNotYours':
      'ওই শিক্ষার্থী আপনার অ্যাকাউন্টে নেই। পৃষ্ঠাটি আবার লোড করে নতুন করে বেছে নিন।',
    'buy.codeUnknown': 'এই কোডটি আমরা চিনতে পারছি না। যাচাই করে আবার চেষ্টা করুন।',
    'buy.codeNotNow': 'এই কোডটি এই মুহূর্তে চালু নেই: এটি শেষ হয়ে গেছে, অথবা এখনও শুরু হয়নি।',
    'buy.codeNotHere': 'এই কোডটি আপনার দেশে প্রযোজ্য নয়।',
    'buy.codeNotCourse': 'এই কোডটি এই কোর্সের জন্য নয়।',
    'buy.codeOwn':
      'এটি আপনার নিজের আমন্ত্রণ কোড, তাই নিজের কেনাকাটায় ব্যবহার করা যাবে না। এটি সেই বন্ধুর জন্য, যাকে আপনি পাঠান।',
    'buy.codeNewOnly': 'এই কোডটি শুধু তাদের জন্য, যারা আগে কিছু কেনেননি।',
    'buy.codeUsedUp': 'এই কোডটির ব্যবহার শেষ হয়ে গেছে।',
    'buy.codeUsedYou': 'এই কোডটি যতবার ব্যবহার করা যায়, আপনি ততবার ব্যবহার করে ফেলেছেন।',
    'buy.codeUsedFamily': 'এই কোডটি যতবার ব্যবহার করা যায়, আপনার পরিবার ততবার ব্যবহার করে ফেলেছে।',
    'buy.codeFree':
      'এই কোডে কোর্সটি পুরোপুরি বিনামূল্যের হয়ে যায়, যা এই চেকআউট নিতে পারে না। আমাদের সঙ্গে যোগাযোগ করুন, আমরা আপনাকে সরাসরি ভর্তি করে দেব।',
    'buy.codeCurrency':
      'এই কোডটি এই কোর্সের মুদ্রা থেকে ভিন্ন মুদ্রায়, তাই এখানে ব্যবহার করা যাবে না।',
    'buy.codeNothing': 'এই কোডটি এই অর্ডার থেকে কিছুই কমায় না।',
    'buy.whyFree': 'এই কোর্সটি বিনামূল্যের। কোর্সের পৃষ্ঠা থেকে এতে যোগ দিন।',
    'buy.whyWithdrawal':
      '১৪ দিনের প্রত্যাহারের অধিকার নিয়ে আপনার সিদ্ধান্ত নথিভুক্ত করা যায়নি, তাই পেমেন্ট শুরু হয়নি। কোনো টাকা নেওয়া হয়নি।',
    'buy.whyNoProvider':
      'এখনও কোনো পেমেন্ট প্রদানকারী সংযুক্ত হয়নি, তাই এই অর্ডারের মূল্য পরিশোধ করা যাবে না।',
    'buy.whyPhone': 'এই ফোন নম্বরটি সঠিক নয়। যাচাই করে আবার চেষ্টা করুন।',
    'buy.whyProvider': 'পেমেন্ট শুরু করা যায়নি। আবার চেষ্টা করার আগে আপনার অর্ডারগুলো দেখুন।',
    'buy.refused': 'অর্ডারটি দেওয়া যায়নি। কোনো টাকা নেওয়া হয়নি।',
    'buy.unconfirmed':
      'আপনার অর্ডার দেওয়া হয়েছে কি না, আমরা নিশ্চিত করতে পারিনি। আবার চেষ্টা করার আগে আপনার অর্ডারগুলো দেখুন।',
  },
  hi: {
    'buy.crumb': 'ख़रीदें',
    'buy.eyebrow': 'चेकआउट',
    'buy.nobodyLead': 'अभी ऐसा कोई नहीं है जिसके लिए यह ख़रीदा जाए।',
    'buy.nobodyBody':
      'कोर्स की ख़रीद एक शिक्षार्थी के लिए होती है, इसलिए किसी एक का नाम होना ज़रूरी है: इस खाते पर आप स्वयं, या आपके परिवार में किसी बच्चे की प्रोफ़ाइल।',
    'buy.claim': 'अपने लिए ख़रीदें',
    'buy.claimNote': 'इससे आप इस खाते पर शिक्षार्थी बन जाते हैं। यह दूसरा खाता नहीं है।',
    'buy.addChild': 'इसके बजाय बच्चा जोड़ें',
    'buy.backCourse': 'कोर्स पर वापस जाएँ',
    'buy.subLead': 'यह कोर्स सदस्यता के रूप में बिकता है, एक बार की ख़रीद के रूप में नहीं।',
    'buy.subBody': 'इस चेकआउट से सदस्यताएँ अभी नहीं बिक रही हैं। कोई राशि नहीं ली गई है।',
    'buy.ambiguousLead': 'आपके देश के लिए इस कोर्स की एक से अधिक क़ीमतें हैं।',
    'buy.ambiguousBody':
      'हम आपकी ओर से मुद्रा नहीं चुनेंगे। हमसे संपर्क करें, हम सही मुद्रा तय कर देंगे, फिर आप इसे ख़रीद सकेंगे।',
    'buy.noPriceLead': 'इस देश के लिए इस कोर्स की क़ीमत अभी तय नहीं है: {country}।',
    'buy.noPriceAny': 'आपके देश के लिए इस कोर्स की क़ीमत अभी तय नहीं है।',
    'buy.noPriceBody':
      'कोई राशि नहीं ली गई है। हमसे संपर्क करें, हम आपके देश में बिक्री खोल देंगे, फिर आप इसे ख़रीद सकेंगे।',
    'buy.hasAlready':
      '{name} के पास यह कोर्स पहले से है। यह ख़रीद किसी दूसरे शिक्षार्थी के लिए है।',
    'buy.noProviderLead': 'अभी कोई भुगतान प्रदाता जुड़ा नहीं है।',
    'buy.noProviderBody':
      'आप यह ऑर्डर दे सकते हैं और यह सहेज लिया जाएगा, लेकिन जब तक कोई प्रदाता नहीं जुड़ता, इसका भुगतान नहीं हो सकता। कोई राशि नहीं ली जाती, और भुगतान की पुष्टि होने तक कोर्स नहीं खुलता।',
    'buy.closedLead': 'चेकआउट अभी खुला नहीं है।',
    'buy.closedBody':
      'यह प्लैटफ़ॉर्म फ़िलहाल कोर्सों के लिए भुगतान नहीं ले रहा है, इसलिए कोई ऑर्डर नहीं दिया जा सकता और कोई राशि नहीं ली गई है। निःशुल्क कोर्सों में कोर्स के पृष्ठ से अब भी शामिल हुआ जा सकता है।',
    'buy.notOnSale': 'यह कोर्स फ़िलहाल आपके लिए बिक्री पर नहीं है, इसलिए चुकाने को कुछ नहीं है।',
    'buy.payHeading': 'आप क्या चुकाएँगे',
    'buy.pricedFor': 'इस देश के लिए क़ीमत: {country}।',
    'buy.standardPrice': 'मानक क़ीमत।',
    'buy.oneOff': 'एक बार की ख़रीद, सदस्यता नहीं।',
    'buy.accessNote':
      'पहुँच भुगतान की पुष्टि होने पर शुरू होती है, बटन दबाने पर नहीं। दोनों स्थितियों में ऑर्डर आपके ऑर्डर वाले पृष्ठ पर दर्ज रहता है।',
    'buy.whoFor': 'यह किसके लिए है?',
    'buy.choose': 'शिक्षार्थी चुनें',
    'buy.learnerChild': '{name} (बच्चा)',
    'buy.whoNote':
      'एक ख़रीद एक शिक्षार्थी के लिए होती है। दो बच्चों के लिए ख़रीदना हो तो दो बार ख़रीदें।',
    'buy.forOne': 'यह ख़रीद {name} के लिए है।',
    'buy.codeLabel': 'छूट कोड',
    'buy.checkPrice': 'क़ीमत जाँचें',
    'buy.checking': 'जाँच हो रही है…',
    'buy.codeNote':
      'कोड है? यहाँ दर्ज करें। अगर यह इस कोर्स पर लागू नहीं होता, तो कोई राशि लेने से पहले आपको बता दिया जाएगा।',
    'buy.quoteFailed': 'क़ीमत की गणना नहीं हो सकी। फिर कोशिश करें।',
    'buy.quoteSimple': 'आप {amount} चुकाएँगे।',
    'buy.quoteList': 'सूची क़ीमत {amount}',
    'buy.quoteOffCode': 'कोड {code} से {amount} कम',
    'buy.quoteOff': 'छूट {amount}',
    'buy.quoteTax': 'कर {amount}',
    'buy.quoteFee': 'शुल्क {amount}',
    'buy.quotePay': 'आप {amount} चुकाएँगे।',
    'buy.quoteTaxNote': 'कर और शुल्क छूट के बाद की क़ीमत पर लगाए जाते हैं।',
    'buy.quoteHolds': 'जब तक आप ऑर्डर नहीं देते, कुछ भी आरक्षित नहीं होता।',
    'buy.payWith': 'भुगतान का तरीक़ा',
    'buy.phoneLabel': 'मोबाइल मनी नंबर',
    'buy.phoneNote': 'वह नंबर जिससे भुगतान स्वीकृत करने को कहा जाएगा।',
    'buy.continue': 'भुगतान की ओर बढ़ें',
    'buy.starting': 'शुरू हो रहा है…',
    'buy.noProviderNote': 'यह ऑर्डर दर्ज हो जाएगा, लेकिन अभी इसका भुगतान नहीं हो सकता।',
    'buy.approve':
      'अपने फ़ोन पर भुगतान स्वीकृत करें। भुगतान की पुष्टि होते ही आपका कोर्स खुल जाएगा। इसमें थोड़ा समय लग सकता है।',
    'buy.orderSaved': 'आपका ऑर्डर सहेज लिया गया है।',
    'buy.signedOut': 'आप साइन आउट हो चुके हैं। फिर से साइन इन करें, फिर एक बार और कोशिश करें।',
    'buy.whyClosed':
      'चेकआउट अभी खुला नहीं है, इसलिए कोई ऑर्डर नहीं दिया गया। कोई राशि नहीं ली गई है।',
    'buy.whyNoCourse': 'यह कोर्स फ़िलहाल ख़रीदा नहीं जा सकता।',
    'buy.whyNoPrice': 'यह कोर्स फ़िलहाल बिक्री पर नहीं है। जाँचने के लिए पृष्ठ फिर से लोड करें।',
    'buy.whyOwned':
      'उस शिक्षार्थी के पास यह कोर्स पहले से है, इसलिए दोबारा ख़रीदने से कुछ नहीं जुड़ेगा।',
    'buy.whyChoose': 'चुनें कि यह कोर्स किसके लिए है।',
    'buy.whyNotYours': 'वह शिक्षार्थी आपके खाते पर नहीं है। पृष्ठ फिर से लोड करें और दोबारा चुनें।',
    'buy.codeUnknown': 'हम इस कोड को नहीं पहचानते। इसे जाँचें और फिर कोशिश करें।',
    'buy.codeNotNow': 'यह कोड फ़िलहाल चालू नहीं है: यह समाप्त हो चुका है, या अभी शुरू नहीं हुआ है।',
    'buy.codeNotHere': 'यह कोड आपके देश में उपलब्ध नहीं है।',
    'buy.codeNotCourse': 'यह कोड इस कोर्स के लिए नहीं है।',
    'buy.codeOwn':
      'यह आपका अपना आमंत्रण कोड है, इसलिए आपकी अपनी ख़रीद पर इस्तेमाल नहीं हो सकता। यह उस मित्र के लिए है जिसे आप इसे भेजते हैं।',
    'buy.codeNewOnly': 'यह कोड केवल उन लोगों के लिए है जिन्होंने पहले कुछ नहीं ख़रीदा है।',
    'buy.codeUsedUp': 'यह कोड पूरा इस्तेमाल हो चुका है।',
    'buy.codeUsedYou': 'आप इस कोड का उतनी बार इस्तेमाल कर चुके हैं जितनी इसकी अनुमति है।',
    'buy.codeUsedFamily':
      'आपका परिवार इस कोड का उतनी बार इस्तेमाल कर चुका है जितनी इसकी अनुमति है।',
    'buy.codeFree':
      'इस कोड से कोर्स पूरी तरह निःशुल्क हो जाएगा, जिसे यह चेकआउट स्वीकार नहीं कर सकता। हमसे संपर्क करें, हम आपका सीधे नामांकन कर देंगे।',
    'buy.codeCurrency': 'यह कोड इस कोर्स से अलग मुद्रा में है, इसलिए यहाँ इस्तेमाल नहीं हो सकता।',
    'buy.codeNothing': 'यह कोड इस ऑर्डर से कुछ भी कम नहीं करता।',
    'buy.whyFree': 'यह कोर्स निःशुल्क है। कोर्स के पृष्ठ से इसमें शामिल हों।',
    'buy.whyWithdrawal':
      '14 दिन के वापसी अधिकार के बारे में आपका चुनाव दर्ज नहीं हो सका, इसलिए भुगतान शुरू नहीं हुआ। कोई राशि नहीं ली गई है।',
    'buy.whyNoProvider':
      'अभी कोई भुगतान प्रदाता जुड़ा नहीं है, इसलिए इस ऑर्डर का भुगतान नहीं हो सकता।',
    'buy.whyPhone': 'यह फ़ोन नंबर मान्य नहीं है। इसे जाँचें और फिर कोशिश करें।',
    'buy.whyProvider': 'भुगतान शुरू नहीं हो सका। फिर कोशिश करने से पहले अपने ऑर्डर देखें।',
    'buy.refused': 'ऑर्डर नहीं दिया जा सका। कोई राशि नहीं ली गई है।',
    'buy.unconfirmed':
      'हम पुष्टि नहीं कर सके कि आपका ऑर्डर दिया गया या नहीं। फिर कोशिश करने से पहले अपने ऑर्डर देखें।',
  },
  fr: {
    'buy.crumb': 'Acheter',
    'buy.eyebrow': 'Paiement',
    'buy.nobodyLead': 'Il n’y a encore personne pour qui acheter ce cours.',
    'buy.nobodyBody':
      'L’achat d’un cours vaut pour un seul apprenant ; il faut donc en désigner un : vous-même sur ce compte, ou le profil d’un enfant de votre famille.',
    'buy.claim': 'L’acheter pour moi-même',
    'buy.claimNote': 'Ceci fait de vous un apprenant sur ce compte. Ce n’est pas un second compte.',
    'buy.addChild': 'Ajouter plutôt un enfant',
    'buy.backCourse': 'Retour au cours',
    'buy.subLead': 'Ce cours est vendu par abonnement, et non par achat unique.',
    'buy.subBody':
      'Les abonnements ne sont pas encore en vente sur cette page de paiement. Rien n’a été débité.',
    'buy.ambiguousLead': 'Ce cours a plusieurs prix pour votre pays.',
    'buy.ambiguousBody':
      'Nous ne choisirons pas une devise à votre place. Contactez-nous et nous fixerons la bonne ; vous pourrez ensuite l’acheter.',
    'buy.noPriceLead': 'Ce cours n’a pas encore de prix pour ce pays : {country}.',
    'buy.noPriceAny': 'Ce cours n’a pas encore de prix pour votre pays.',
    'buy.noPriceBody':
      'Rien n’a été débité. Contactez-nous et nous ouvrirons la vente dans votre pays ; vous pourrez ensuite l’acheter.',
    'buy.hasAlready':
      'Ce cours figure déjà au profil de {name}. Cet achat est destiné à un autre apprenant.',
    'buy.noProviderLead': 'Aucun prestataire de paiement n’est encore connecté.',
    'buy.noProviderBody':
      'Vous pouvez passer cette commande et elle sera enregistrée, mais elle ne pourra pas être payée tant qu’aucun prestataire n’est connecté. Rien n’est débité, et le cours ne s’ouvre pas avant la confirmation du paiement.',
    'buy.closedLead': 'Le paiement n’est pas encore ouvert.',
    'buy.closedBody':
      'Cette plateforme n’accepte pas de paiement pour les cours en ce moment ; aucune commande ne peut donc être passée et rien n’a été débité. Il reste possible de rejoindre les cours gratuits depuis la page du cours.',
    'buy.notOnSale':
      'Ce cours ne vous est pas proposé à la vente en ce moment ; il n’y a donc rien à payer.',
    'buy.payHeading': 'Ce que vous paierez',
    'buy.pricedFor': 'Prix pour ce pays : {country}.',
    'buy.standardPrice': 'Le prix standard.',
    'buy.oneOff': 'Achat unique, et non un abonnement.',
    'buy.accessNote':
      'L’accès commence à la confirmation du paiement, et non lorsque vous appuyez sur le bouton. Dans les deux cas, la commande figure sur la page de vos commandes.',
    'buy.whoFor': 'Pour qui est-ce ?',
    'buy.choose': 'Choisissez un apprenant',
    'buy.learnerChild': '{name} (enfant)',
    'buy.whoNote':
      'Un achat vaut pour un seul apprenant. Pour deux enfants, achetez le cours deux fois.',
    'buy.forOne': 'Cet achat est destiné à {name}.',
    'buy.codeLabel': 'Code de réduction',
    'buy.checkPrice': 'Vérifier le prix',
    'buy.checking': 'Vérification…',
    'buy.codeNote':
      'Vous avez un code ? Saisissez-le ici. S’il ne s’applique pas à ce cours, vous en serez informé avant tout débit.',
    'buy.quoteFailed': 'Ce prix n’a pas pu être calculé. Veuillez réessayer.',
    'buy.quoteSimple': 'Vous paieriez {amount}.',
    'buy.quoteList': 'Prix affiché {amount}',
    'buy.quoteOffCode': 'le code {code} retire {amount}',
    'buy.quoteOff': 'réduction {amount}',
    'buy.quoteTax': 'taxe {amount}',
    'buy.quoteFee': 'frais {amount}',
    'buy.quotePay': 'vous payez {amount}.',
    'buy.quoteTaxNote': 'Les taxes et les frais sont calculés sur le prix après réduction.',
    'buy.quoteHolds': 'Rien n’est réservé tant que vous n’avez pas passé la commande.',
    'buy.payWith': 'Payer avec',
    'buy.phoneLabel': 'Numéro de paiement mobile',
    'buy.phoneNote': 'Le numéro auquel il sera demandé d’approuver le paiement.',
    'buy.continue': 'Continuer vers le paiement',
    'buy.starting': 'Démarrage…',
    'buy.noProviderNote': 'Cette commande sera enregistrée, mais ne peut pas encore être payée.',
    'buy.approve':
      'Approuvez le paiement sur votre téléphone. Votre cours s’ouvre dès que le paiement est confirmé. Cela peut prendre un moment.',
    'buy.orderSaved': 'Votre commande a été enregistrée.',
    'buy.signedOut': 'Vous êtes déconnecté. Reconnectez-vous, puis réessayez une fois.',
    'buy.whyClosed':
      'Le paiement n’est pas encore ouvert ; aucune commande n’a donc été passée. Rien n’a été débité.',
    'buy.whyNoCourse': 'Ce cours ne peut pas être acheté en ce moment.',
    'buy.whyNoPrice': 'Ce cours n’est pas en vente en ce moment. Rechargez la page pour vérifier.',
    'buy.whyOwned': 'Cet apprenant a déjà ce cours ; l’acheter de nouveau n’ajouterait rien.',
    'buy.whyChoose': 'Choisissez pour qui est ce cours.',
    'buy.whyNotYours':
      'Cet apprenant n’est pas sur votre compte. Rechargez la page et choisissez de nouveau.',
    'buy.codeUnknown': 'Nous ne reconnaissons pas ce code. Vérifiez-le et réessayez.',
    'buy.codeNotNow':
      'Ce code n’est pas en cours en ce moment : il est terminé, ou n’a pas encore commencé.',
    'buy.codeNotHere': 'Ce code n’est pas disponible dans votre pays.',
    'buy.codeNotCourse': 'Ce code n’est pas valable pour ce cours.',
    'buy.codeOwn':
      'C’est votre propre code d’invitation ; il ne peut donc pas servir à votre propre achat. Il est destiné à l’ami à qui vous l’envoyez.',
    'buy.codeNewOnly': 'Ce code est réservé aux personnes qui n’ont encore rien acheté.',
    'buy.codeUsedUp': 'Ce code est épuisé.',
    'buy.codeUsedYou': 'Vous avez déjà utilisé ce code autant de fois qu’il le permet.',
    'buy.codeUsedFamily': 'Votre famille a déjà utilisé ce code autant de fois qu’il le permet.',
    'buy.codeFree':
      'Ce code rendrait le cours entièrement gratuit, ce que cette page de paiement ne peut pas accepter. Contactez-nous et nous vous inscrirons directement.',
    'buy.codeCurrency':
      'Ce code est dans une autre devise que ce cours ; il ne peut donc pas être utilisé ici.',
    'buy.codeNothing': 'Ce code ne retire rien à cette commande.',
    'buy.whyFree': 'Ce cours est gratuit. Rejoignez-le depuis la page du cours.',
    'buy.whyWithdrawal':
      'Votre choix concernant le droit de rétractation de 14 jours n’a pas pu être enregistré ; le paiement n’a donc pas été lancé. Rien n’a été débité.',
    'buy.whyNoProvider':
      'Aucun prestataire de paiement n’est encore connecté ; cette commande ne peut donc pas être payée.',
    'buy.whyPhone': 'Ce numéro de téléphone n’est pas valide. Vérifiez-le et réessayez.',
    'buy.whyProvider':
      'Le paiement n’a pas pu être lancé. Consultez vos commandes avant de réessayer.',
    'buy.refused': 'La commande n’a pas pu être passée. Rien n’a été débité.',
    'buy.unconfirmed':
      'Nous n’avons pas pu confirmer que votre commande a été passée. Consultez vos commandes avant de réessayer.',
  },
  es: {
    'buy.crumb': 'Comprar',
    'buy.eyebrow': 'Pago',
    'buy.nobodyLead': 'Todavía no hay nadie para quien comprar este curso.',
    'buy.nobodyBody':
      'La compra de un curso cubre a un solo alumno, así que tiene que haber uno al que nombrar: usted en esta cuenta, o el perfil de un niño de su familia.',
    'buy.claim': 'Comprarlo para mí',
    'buy.claimNote': 'Esto le convierte en alumno en esta cuenta. No es una segunda cuenta.',
    'buy.addChild': 'Añadir un niño en su lugar',
    'buy.backCourse': 'Volver al curso',
    'buy.subLead': 'Este curso se vende como suscripción, no como compra única.',
    'buy.subBody':
      'Las suscripciones todavía no se venden desde esta página de pago. No se ha cobrado nada.',
    'buy.ambiguousLead': 'Este curso tiene más de un precio para su país.',
    'buy.ambiguousBody':
      'No elegiremos una moneda en su nombre. Póngase en contacto con nosotros y fijaremos la correcta; después podrá comprarlo.',
    'buy.noPriceLead': 'Este curso todavía no tiene precio para este país: {country}.',
    'buy.noPriceAny': 'Este curso todavía no tiene precio para su país.',
    'buy.noPriceBody':
      'No se ha cobrado nada. Póngase en contacto con nosotros y abriremos la venta en su país; después podrá comprarlo.',
    'buy.hasAlready':
      'Este curso ya figura en el perfil de {name}. Esta compra es para otro alumno.',
    'buy.noProviderLead': 'Todavía no hay ningún proveedor de pagos conectado.',
    'buy.noProviderBody':
      'Puede hacer este pedido y quedará guardado, pero no podrá pagarse hasta que se conecte un proveedor. No se cobra nada, y el curso no se abre hasta que se confirme el pago.',
    'buy.closedLead': 'El pago todavía no está abierto.',
    'buy.closedBody':
      'Esta plataforma no acepta pagos por cursos en este momento, así que no se puede hacer ningún pedido y no se ha cobrado nada. Sigue siendo posible unirse a los cursos gratuitos desde la página del curso.',
    'buy.notOnSale':
      'Este curso no está a la venta para usted en este momento, así que no hay nada que pagar.',
    'buy.payHeading': 'Lo que pagará',
    'buy.pricedFor': 'Precio para este país: {country}.',
    'buy.standardPrice': 'El precio estándar.',
    'buy.oneOff': 'Compra única, no una suscripción.',
    'buy.accessNote':
      'El acceso empieza cuando se confirma el pago, no cuando pulsa el botón. En ambos casos, el pedido aparece en la página de sus pedidos.',
    'buy.whoFor': '¿Para quién es?',
    'buy.choose': 'Elija un alumno',
    'buy.learnerChild': '{name} (niño)',
    'buy.whoNote':
      'Una compra cubre a un solo alumno. Para comprarlo para dos niños, cómprelo dos veces.',
    'buy.forOne': 'Esta compra es para {name}.',
    'buy.codeLabel': 'Código de descuento',
    'buy.checkPrice': 'Comprobar el precio',
    'buy.checking': 'Comprobando…',
    'buy.codeNote':
      '¿Tiene un código? Introdúzcalo aquí. Si no se aplica a este curso, se le avisará antes de cobrar nada.',
    'buy.quoteFailed': 'No se pudo calcular ese precio. Inténtelo de nuevo.',
    'buy.quoteSimple': 'Pagaría {amount}.',
    'buy.quoteList': 'Precio de lista {amount}',
    'buy.quoteOffCode': 'el código {code} descuenta {amount}',
    'buy.quoteOff': 'descuento {amount}',
    'buy.quoteTax': 'impuesto {amount}',
    'buy.quoteFee': 'comisión {amount}',
    'buy.quotePay': 'usted paga {amount}.',
    'buy.quoteTaxNote':
      'Los impuestos y las comisiones se calculan sobre el precio después de cualquier descuento.',
    'buy.quoteHolds': 'No se reserva nada hasta que haga el pedido.',
    'buy.payWith': 'Pagar con',
    'buy.phoneLabel': 'Número de dinero móvil',
    'buy.phoneNote': 'El número al que se pedirá que apruebe el pago.',
    'buy.continue': 'Continuar al pago',
    'buy.starting': 'Iniciando…',
    'buy.noProviderNote': 'Este pedido quedará registrado, pero todavía no puede pagarse.',
    'buy.approve':
      'Apruebe el pago en su teléfono. Su curso se abre cuando se confirma el pago. Puede tardar un momento.',
    'buy.orderSaved': 'Su pedido se ha guardado.',
    'buy.signedOut': 'Su sesión se ha cerrado. Vuelva a iniciar sesión e inténtelo una vez más.',
    'buy.whyClosed':
      'El pago todavía no está abierto, así que no se hizo ningún pedido. No se ha cobrado nada.',
    'buy.whyNoCourse': 'Este curso no puede comprarse en este momento.',
    'buy.whyNoPrice':
      'Este curso no está a la venta en este momento. Recargue la página para comprobarlo.',
    'buy.whyOwned': 'Ese alumno ya tiene este curso, así que comprarlo de nuevo no añadiría nada.',
    'buy.whyChoose': 'Elija para quién es este curso.',
    'buy.whyNotYours': 'Ese alumno no está en su cuenta. Recargue la página y elija de nuevo.',
    'buy.codeUnknown': 'No reconocemos ese código. Compruébelo e inténtelo de nuevo.',
    'buy.codeNotNow':
      'Ese código no está en vigor en este momento: ha terminado o todavía no ha empezado.',
    'buy.codeNotHere': 'Ese código no está disponible en su país.',
    'buy.codeNotCourse': 'Ese código no es para este curso.',
    'buy.codeOwn':
      'Ese es su propio código de invitación, así que no puede usarse en su propia compra. Es para el amigo a quien se lo envía.',
    'buy.codeNewOnly': 'Ese código es solo para personas que no han comprado nada antes.',
    'buy.codeUsedUp': 'Ese código se ha agotado.',
    'buy.codeUsedYou': 'Ya ha usado ese código tantas veces como permite.',
    'buy.codeUsedFamily': 'Su familia ya ha usado ese código tantas veces como permite.',
    'buy.codeFree':
      'Ese código haría el curso totalmente gratuito, algo que esta página de pago no puede aceptar. Póngase en contacto con nosotros y le inscribiremos directamente.',
    'buy.codeCurrency':
      'Ese código está en una moneda distinta de la de este curso, así que no puede usarse aquí.',
    'buy.codeNothing': 'Ese código no descuenta nada de este pedido.',
    'buy.whyFree': 'Este curso es gratuito. Únase desde la página del curso.',
    'buy.whyWithdrawal':
      'No se pudo registrar su elección sobre el derecho de desistimiento de 14 días, así que el pago no se inició. No se ha cobrado nada.',
    'buy.whyNoProvider':
      'Todavía no hay ningún proveedor de pagos conectado, así que este pedido no puede pagarse.',
    'buy.whyPhone': 'Ese número de teléfono no es válido. Compruébelo e inténtelo de nuevo.',
    'buy.whyProvider':
      'No se pudo iniciar el pago. Consulte sus pedidos antes de intentarlo de nuevo.',
    'buy.refused': 'No se pudo hacer el pedido. No se ha cobrado nada.',
    'buy.unconfirmed':
      'No pudimos confirmar si su pedido se hizo. Consulte sus pedidos antes de intentarlo de nuevo.',
  },
  pt: {
    'buy.crumb': 'Comprar',
    'buy.eyebrow': 'Pagamento',
    'buy.nobodyLead': 'Ainda não há ninguém para quem comprar este curso.',
    'buy.nobodyBody':
      'A compra de um curso abrange um só aluno, por isso tem de haver um para indicar: o próprio utilizador desta conta, ou o perfil de uma criança da sua família.',
    'buy.claim': 'Comprar para mim',
    'buy.claimNote': 'Isto faz de si um aluno nesta conta. Não é uma segunda conta.',
    'buy.addChild': 'Adicionar antes uma criança',
    'buy.backCourse': 'Voltar ao curso',
    'buy.subLead': 'Este curso é vendido por subscrição, e não como compra única.',
    'buy.subBody':
      'As subscrições ainda não estão à venda nesta página de pagamento. Nada foi cobrado.',
    'buy.ambiguousLead': 'Este curso tem mais de um preço para o seu país.',
    'buy.ambiguousBody':
      'Não escolheremos uma moeda em seu nome. Contacte-nos e definiremos a correta; depois poderá comprá-lo.',
    'buy.noPriceLead': 'Este curso ainda não tem preço para este país: {country}.',
    'buy.noPriceAny': 'Este curso ainda não tem preço para o seu país.',
    'buy.noPriceBody':
      'Nada foi cobrado. Contacte-nos e abriremos a venda no seu país; depois poderá comprá-lo.',
    'buy.hasAlready':
      'Este curso já consta do perfil de {name}. Esta compra destina-se a outro aluno.',
    'buy.noProviderLead': 'Ainda não está ligado nenhum prestador de pagamentos.',
    'buy.noProviderBody':
      'Pode fazer esta encomenda e ela ficará guardada, mas não poderá ser paga enquanto não estiver ligado um prestador. Nada é cobrado, e o curso não abre até o pagamento ser confirmado.',
    'buy.closedLead': 'O pagamento ainda não está aberto.',
    'buy.closedBody':
      'Esta plataforma não está a aceitar pagamentos de cursos neste momento, por isso não é possível fazer nenhuma encomenda e nada foi cobrado. Continua a ser possível aderir aos cursos gratuitos a partir da página do curso.',
    'buy.notOnSale':
      'Este curso não está à venda para si neste momento, por isso não há nada a pagar.',
    'buy.payHeading': 'O que vai pagar',
    'buy.pricedFor': 'Preço para este país: {country}.',
    'buy.standardPrice': 'O preço normal.',
    'buy.oneOff': 'Compra única, e não uma subscrição.',
    'buy.accessNote':
      'O acesso começa quando o pagamento é confirmado, e não quando carrega no botão. Em ambos os casos, a encomenda fica listada na página das suas encomendas.',
    'buy.whoFor': 'Para quem é?',
    'buy.choose': 'Escolha um aluno',
    'buy.learnerChild': '{name} (criança)',
    'buy.whoNote':
      'Uma compra abrange um só aluno. Para comprar para duas crianças, compre duas vezes.',
    'buy.forOne': 'Esta compra destina-se a {name}.',
    'buy.codeLabel': 'Código de desconto',
    'buy.checkPrice': 'Verificar o preço',
    'buy.checking': 'A verificar…',
    'buy.codeNote':
      'Tem um código? Introduza-o aqui. Se não se aplicar a este curso, será avisado antes de qualquer cobrança.',
    'buy.quoteFailed': 'Não foi possível calcular esse preço. Tente novamente.',
    'buy.quoteSimple': 'Pagaria {amount}.',
    'buy.quoteList': 'Preço de tabela {amount}',
    'buy.quoteOffCode': 'o código {code} retira {amount}',
    'buy.quoteOff': 'desconto {amount}',
    'buy.quoteTax': 'imposto {amount}',
    'buy.quoteFee': 'taxa {amount}',
    'buy.quotePay': 'paga {amount}.',
    'buy.quoteTaxNote':
      'Os impostos e as taxas são calculados sobre o preço depois de qualquer desconto.',
    'buy.quoteHolds': 'Nada fica reservado até fazer a encomenda.',
    'buy.payWith': 'Pagar com',
    'buy.phoneLabel': 'Número de dinheiro móvel',
    'buy.phoneNote': 'O número ao qual será pedido que aprove o pagamento.',
    'buy.continue': 'Continuar para o pagamento',
    'buy.starting': 'A iniciar…',
    'buy.noProviderNote': 'Esta encomenda ficará registada, mas ainda não pode ser paga.',
    'buy.approve':
      'Aprove o pagamento no seu telemóvel. O seu curso abre assim que o pagamento for confirmado. Pode demorar um momento.',
    'buy.orderSaved': 'A sua encomenda foi guardada.',
    'buy.signedOut': 'A sua sessão terminou. Inicie sessão novamente e tente mais uma vez.',
    'buy.whyClosed':
      'O pagamento ainda não está aberto, por isso nenhuma encomenda foi feita. Nada foi cobrado.',
    'buy.whyNoCourse': 'Este curso não pode ser comprado neste momento.',
    'buy.whyNoPrice':
      'Este curso não está à venda neste momento. Recarregue a página para verificar.',
    'buy.whyOwned':
      'Esse aluno já tem este curso, por isso comprá-lo outra vez não acrescentaria nada.',
    'buy.whyChoose': 'Escolha para quem é este curso.',
    'buy.whyNotYours': 'Esse aluno não está na sua conta. Recarregue a página e escolha de novo.',
    'buy.codeUnknown': 'Não reconhecemos esse código. Verifique-o e tente novamente.',
    'buy.codeNotNow': 'Esse código não está em vigor neste momento: terminou ou ainda não começou.',
    'buy.codeNotHere': 'Esse código não está disponível no seu país.',
    'buy.codeNotCourse': 'Esse código não é para este curso.',
    'buy.codeOwn':
      'Esse é o seu próprio código de convite, por isso não pode ser usado na sua própria compra. É para o amigo a quem o envia.',
    'buy.codeNewOnly': 'Esse código é só para quem ainda não comprou nada.',
    'buy.codeUsedUp': 'Esse código esgotou-se.',
    'buy.codeUsedYou': 'Já usou esse código tantas vezes quantas ele permite.',
    'buy.codeUsedFamily': 'A sua família já usou esse código tantas vezes quantas ele permite.',
    'buy.codeFree':
      'Esse código tornaria o curso totalmente gratuito, o que esta página de pagamento não pode aceitar. Contacte-nos e inscrevê-lo-emos diretamente.',
    'buy.codeCurrency':
      'Esse código está numa moeda diferente da deste curso, por isso não pode ser usado aqui.',
    'buy.codeNothing': 'Esse código não retira nada a esta encomenda.',
    'buy.whyFree': 'Este curso é gratuito. Adira a partir da página do curso.',
    'buy.whyWithdrawal':
      'Não foi possível registar a sua escolha sobre o direito de livre resolução de 14 dias, por isso o pagamento não foi iniciado. Nada foi cobrado.',
    'buy.whyNoProvider':
      'Ainda não está ligado nenhum prestador de pagamentos, por isso esta encomenda não pode ser paga.',
    'buy.whyPhone': 'Esse número de telefone não é válido. Verifique-o e tente novamente.',
    'buy.whyProvider':
      'Não foi possível iniciar o pagamento. Consulte as suas encomendas antes de tentar novamente.',
    'buy.refused': 'Não foi possível fazer a encomenda. Nada foi cobrado.',
    'buy.unconfirmed':
      'Não conseguimos confirmar se a sua encomenda foi feita. Consulte as suas encomendas antes de tentar novamente.',
  },
  sw: {
    'buy.crumb': 'Nunua',
    'buy.eyebrow': 'Malipo',
    'buy.nobodyLead': 'Bado hakuna mtu wa kununuliwa kozi hii.',
    'buy.nobodyBody':
      'Ununuzi wa kozi ni wa mwanafunzi mmoja, kwa hiyo lazima awepo mmoja wa kutajwa: wewe kwenye akaunti hii, au wasifu wa mtoto katika familia yako.',
    'buy.claim': 'Ninunue kwa ajili yangu',
    'buy.claimNote': 'Hatua hii inakufanya mwanafunzi kwenye akaunti hii. Si akaunti ya pili.',
    'buy.addChild': 'Ongeza mtoto badala yake',
    'buy.backCourse': 'Rudi kwenye kozi',
    'buy.subLead': 'Kozi hii inauzwa kwa usajili wa kulipia, si kwa ununuzi wa mara moja.',
    'buy.subBody':
      'Usajili wa kulipia bado hauuzwi kupitia ukurasa huu wa malipo. Hakuna kiasi kilichotozwa.',
    'buy.ambiguousLead': 'Kozi hii ina bei zaidi ya moja kwa nchi yako.',
    'buy.ambiguousBody':
      'Hatutachagua sarafu kwa niaba yako. Wasiliana nasi nasi tutaweka iliyo sahihi, kisha utaweza kuinunua.',
    'buy.noPriceLead': 'Kozi hii bado haina bei kwa nchi hii: {country}.',
    'buy.noPriceAny': 'Kozi hii bado haina bei kwa nchi yako.',
    'buy.noPriceBody':
      'Hakuna kiasi kilichotozwa. Wasiliana nasi nasi tutafungua mauzo katika nchi yako, kisha utaweza kuinunua.',
    'buy.hasAlready': '{name} tayari ana kozi hii. Ununuzi huu ni wa mwanafunzi mwingine.',
    'buy.noProviderLead': 'Bado hakuna mtoa huduma wa malipo aliyeunganishwa.',
    'buy.noProviderBody':
      'Unaweza kuweka agizo hili nalo litahifadhiwa, lakini haliwezi kulipiwa hadi mtoa huduma aunganishwe. Hakuna kiasi kinachotozwa, na kozi haifunguki hadi malipo yathibitishwe.',
    'buy.closedLead': 'Malipo bado hayajafunguliwa.',
    'buy.closedBody':
      'Jukwaa hili halipokei malipo ya kozi kwa sasa, kwa hiyo hakuna agizo linaloweza kuwekwa na hakuna kiasi kilichotozwa. Bado unaweza kujiunga na kozi za bure kutoka kwenye ukurasa wa kozi.',
    'buy.notOnSale': 'Kozi hii haiuzwi kwako kwa sasa, kwa hiyo hakuna cha kulipa.',
    'buy.payHeading': 'Utakacholipa',
    'buy.pricedFor': 'Bei ya nchi hii: {country}.',
    'buy.standardPrice': 'Bei ya kawaida.',
    'buy.oneOff': 'Ununuzi wa mara moja, si usajili wa kulipia.',
    'buy.accessNote':
      'Ufikiaji huanza malipo yanapothibitishwa, si unapobonyeza kitufe. Kwa hali zote mbili, agizo huorodheshwa kwenye ukurasa wa maagizo yako.',
    'buy.whoFor': 'Hii ni ya nani?',
    'buy.choose': 'Chagua mwanafunzi',
    'buy.learnerChild': '{name} (mtoto)',
    'buy.whoNote':
      'Ununuzi mmoja ni wa mwanafunzi mmoja. Kununua kwa watoto wawili, nunua mara mbili.',
    'buy.forOne': 'Ununuzi huu ni wa {name}.',
    'buy.codeLabel': 'Msimbo wa punguzo',
    'buy.checkPrice': 'Angalia bei',
    'buy.checking': 'Inaangalia…',
    'buy.codeNote':
      'Una msimbo? Uweke hapa. Ikiwa hautumiki kwa kozi hii, utaambiwa kabla ya kiasi chochote kutozwa.',
    'buy.quoteFailed': 'Bei hiyo haikuweza kukokotolewa. Jaribu tena.',
    'buy.quoteSimple': 'Ungelipa {amount}.',
    'buy.quoteList': 'Bei iliyotangazwa {amount}',
    'buy.quoteOffCode': 'msimbo {code} unapunguza {amount}',
    'buy.quoteOff': 'punguzo {amount}',
    'buy.quoteTax': 'kodi {amount}',
    'buy.quoteFee': 'ada {amount}',
    'buy.quotePay': 'unalipa {amount}.',
    'buy.quoteTaxNote': 'Kodi na ada hukokotolewa kutoka kwenye bei baada ya punguzo lolote.',
    'buy.quoteHolds': 'Hakuna kinachotengwa hadi uweke agizo.',
    'buy.payWith': 'Lipa kwa',
    'buy.phoneLabel': 'Namba ya pesa za simu',
    'buy.phoneNote': 'Namba itakayoombwa kuidhinisha malipo.',
    'buy.continue': 'Endelea kwenye malipo',
    'buy.starting': 'Inaanza…',
    'buy.noProviderNote': 'Agizo hili litarekodiwa lakini bado haliwezi kulipiwa.',
    'buy.approve':
      'Idhinisha malipo kwenye simu yako. Kozi yako hufunguka malipo yanapothibitishwa. Hii inaweza kuchukua muda kidogo.',
    'buy.orderSaved': 'Agizo lako limehifadhiwa.',
    'buy.signedOut': 'Umeondoka kwenye akaunti. Ingia tena, kisha ujaribu mara moja zaidi.',
    'buy.whyClosed':
      'Malipo bado hayajafunguliwa, kwa hiyo hakuna agizo lililowekwa. Hakuna kiasi kilichotozwa.',
    'buy.whyNoCourse': 'Kozi hii haiwezi kununuliwa kwa sasa.',
    'buy.whyNoPrice': 'Kozi hii haiuzwi kwa sasa. Pakia ukurasa upya ili kuangalia.',
    'buy.whyOwned':
      'Mwanafunzi huyo tayari ana kozi hii, kwa hiyo kuinunua tena hakutaongeza chochote.',
    'buy.whyChoose': 'Chagua kozi hii ni ya nani.',
    'buy.whyNotYours':
      'Mwanafunzi huyo hayupo kwenye akaunti yako. Pakia ukurasa upya kisha uchague tena.',
    'buy.codeUnknown': 'Msimbo huo hatuutambui. Uangalie kisha ujaribu tena.',
    'buy.codeNotNow': 'Msimbo huo hautumiki kwa sasa: umekwisha, au bado haujaanza.',
    'buy.codeNotHere': 'Msimbo huo haupatikani katika nchi yako.',
    'buy.codeNotCourse': 'Msimbo huo si wa kozi hii.',
    'buy.codeOwn':
      'Huo ni msimbo wako mwenyewe wa mwaliko, kwa hiyo hauwezi kutumika kwenye ununuzi wako mwenyewe. Ni wa rafiki unayemtumia.',
    'buy.codeNewOnly': 'Msimbo huo ni wa watu ambao hawajawahi kununua chochote tu.',
    'buy.codeUsedUp': 'Msimbo huo umetumika wote.',
    'buy.codeUsedYou': 'Tayari umetumia msimbo huo mara zote unazoruhusu.',
    'buy.codeUsedFamily': 'Familia yako tayari imetumia msimbo huo mara zote unazoruhusu.',
    'buy.codeFree':
      'Msimbo huo ungeifanya kozi iwe bure kabisa, jambo ambalo ukurasa huu wa malipo hauwezi kulipokea. Wasiliana nasi nasi tutakuandikisha moja kwa moja.',
    'buy.codeCurrency':
      'Msimbo huo uko katika sarafu tofauti na ya kozi hii, kwa hiyo hauwezi kutumika hapa.',
    'buy.codeNothing': 'Msimbo huo haupunguzi chochote kwenye agizo hili.',
    'buy.whyFree': 'Kozi hii ni ya bure. Jiunge nayo kutoka kwenye ukurasa wa kozi.',
    'buy.whyWithdrawal':
      'Chaguo lako kuhusu haki ya kujiondoa ndani ya siku 14 halikuweza kurekodiwa, kwa hiyo malipo hayakuanzishwa. Hakuna kiasi kilichotozwa.',
    'buy.whyNoProvider':
      'Bado hakuna mtoa huduma wa malipo aliyeunganishwa, kwa hiyo agizo hili haliwezi kulipiwa.',
    'buy.whyPhone': 'Namba hiyo ya simu si sahihi. Iangalie kisha ujaribu tena.',
    'buy.whyProvider': 'Malipo hayakuweza kuanzishwa. Angalia maagizo yako kabla ya kujaribu tena.',
    'buy.refused': 'Agizo halikuweza kuwekwa. Hakuna kiasi kilichotozwa.',
    'buy.unconfirmed':
      'Hatukuweza kuthibitisha kama agizo lako liliwekwa. Angalia maagizo yako kabla ya kujaribu tena.',
  },
  af: {
    'buy.crumb': 'Koop',
    'buy.eyebrow': 'Betaling',
    'buy.nobodyLead': 'Daar is nog niemand vir wie dit gekoop kan word nie.',
    'buy.nobodyBody':
      '’n Kursusaankoop dek een leerder, dus moet daar een wees om te noem: jy op hierdie rekening, of ’n kind se profiel in jou gesin.',
    'buy.claim': 'Koop dit vir myself',
    'buy.claimNote':
      'Dit maak jou ’n leerder op hierdie rekening. Dit is nie ’n tweede rekening nie.',
    'buy.addChild': 'Voeg eerder ’n kind by',
    'buy.backCourse': 'Terug na die kursus',
    'buy.subLead': 'Hierdie kursus word as ’n intekening verkoop, nie as ’n eenmalige aankoop nie.',
    'buy.subBody':
      'Intekeninge word nog nie deur hierdie betaalblad verkoop nie. Niks is gehef nie.',
    'buy.ambiguousLead': 'Hierdie kursus het meer as een prys vir jou land.',
    'buy.ambiguousBody':
      'Ons sal nie namens jou ’n geldeenheid kies nie. Kontak ons en ons sal die regte een vasstel; dan kan jy dit koop.',
    'buy.noPriceLead': 'Hierdie kursus het nog nie ’n prys vir hierdie land nie: {country}.',
    'buy.noPriceAny': 'Hierdie kursus het nog nie ’n prys vir jou land nie.',
    'buy.noPriceBody':
      'Niks is gehef nie. Kontak ons en ons sal verkope in jou land oopmaak; dan kan jy dit koop.',
    'buy.hasAlready': '{name} het reeds hierdie kursus. Hierdie aankoop is vir ’n ander leerder.',
    'buy.noProviderLead': 'Geen betalingsverskaffer is nog gekoppel nie.',
    'buy.noProviderBody':
      'Jy kan hierdie bestelling plaas en dit sal gestoor word, maar dit kan nie betaal word voordat ’n verskaffer gekoppel is nie. Niks word gehef nie, en die kursus gaan nie oop voordat betaling bevestig is nie.',
    'buy.closedLead': 'Betaling is nog nie oop nie.',
    'buy.closedBody':
      'Hierdie platform neem tans nie betaling vir kursusse nie, dus kan geen bestelling geplaas word nie en niks is gehef nie. Daar kan steeds vanaf die kursusblad by gratis kursusse aangesluit word.',
    'buy.notOnSale':
      'Hierdie kursus is tans nie vir jou te koop nie, dus is daar niks om te betaal nie.',
    'buy.payHeading': 'Wat jy sal betaal',
    'buy.pricedFor': 'Prys vir hierdie land: {country}.',
    'buy.standardPrice': 'Die standaardprys.',
    'buy.oneOff': 'Eenmalige aankoop, nie ’n intekening nie.',
    'buy.accessNote':
      'Toegang begin wanneer betaling bevestig is, nie wanneer jy die knoppie druk nie. In albei gevalle word die bestelling op jou bestellingsblad gelys.',
    'buy.whoFor': 'Vir wie is dit?',
    'buy.choose': 'Kies ’n leerder',
    'buy.learnerChild': '{name} (kind)',
    'buy.whoNote': 'Een aankoop dek een leerder. Om vir twee kinders te koop, koop dit twee keer.',
    'buy.forOne': 'Hierdie aankoop is vir {name}.',
    'buy.codeLabel': 'Afslagkode',
    'buy.checkPrice': 'Kontroleer die prys',
    'buy.checking': 'Kontroleer tans…',
    'buy.codeNote':
      'Het jy ’n kode? Voer dit hier in. As dit nie op hierdie kursus van toepassing is nie, sal jy ingelig word voordat enigiets gehef word.',
    'buy.quoteFailed': 'Daardie prys kon nie bereken word nie. Probeer weer.',
    'buy.quoteSimple': 'Jy sou {amount} betaal.',
    'buy.quoteList': 'Lysprys {amount}',
    'buy.quoteOffCode': 'kode {code} neem {amount} af',
    'buy.quoteOff': 'afslag {amount}',
    'buy.quoteTax': 'belasting {amount}',
    'buy.quoteFee': 'fooi {amount}',
    'buy.quotePay': 'jy betaal {amount}.',
    'buy.quoteTaxNote': 'Belasting en fooie word bereken op die prys ná enige afslag.',
    'buy.quoteHolds': 'Niks word gereserveer voordat jy die bestelling plaas nie.',
    'buy.payWith': 'Betaal met',
    'buy.phoneLabel': 'Mobielegeldnommer',
    'buy.phoneNote': 'Die nommer wat gevra sal word om die betaling goed te keur.',
    'buy.continue': 'Gaan voort na betaling',
    'buy.starting': 'Begin tans…',
    'buy.noProviderNote':
      'Hierdie bestelling sal aangeteken word, maar kan nog nie betaal word nie.',
    'buy.approve':
      'Keur die betaling op jou foon goed. Jou kursus gaan oop sodra die betaling bevestig is. Dit kan ’n oomblik neem.',
    'buy.orderSaved': 'Jou bestelling is gestoor.',
    'buy.signedOut': 'Jy is afgemeld. Meld weer aan en probeer dan nog een keer.',
    'buy.whyClosed':
      'Betaling is nog nie oop nie, dus is geen bestelling geplaas nie. Niks is gehef nie.',
    'buy.whyNoCourse': 'Hierdie kursus kan tans nie gekoop word nie.',
    'buy.whyNoPrice':
      'Hierdie kursus is tans nie te koop nie. Herlaai die bladsy om te kontroleer.',
    'buy.whyOwned':
      'Daardie leerder het reeds hierdie kursus, dus sal dit niks byvoeg om dit weer te koop nie.',
    'buy.whyChoose': 'Kies vir wie hierdie kursus is.',
    'buy.whyNotYours':
      'Daardie leerder is nie op jou rekening nie. Herlaai die bladsy en kies weer.',
    'buy.codeUnknown': 'Ons herken nie daardie kode nie. Kontroleer dit en probeer weer.',
    'buy.codeNotNow':
      'Daardie kode is tans nie geldig nie: dit het geëindig, of het nog nie begin nie.',
    'buy.codeNotHere': 'Daardie kode is nie in jou land beskikbaar nie.',
    'buy.codeNotCourse': 'Daardie kode is nie vir hierdie kursus nie.',
    'buy.codeOwn':
      'Dit is jou eie uitnodigingskode, dus kan dit nie op jou eie aankoop gebruik word nie. Dit is vir die vriend aan wie jy dit stuur.',
    'buy.codeNewOnly': 'Daardie kode is net vir mense wat nog niks gekoop het nie.',
    'buy.codeUsedUp': 'Daardie kode is opgebruik.',
    'buy.codeUsedYou': 'Jy het daardie kode reeds soveel keer gebruik as wat dit toelaat.',
    'buy.codeUsedFamily':
      'Jou gesin het daardie kode reeds soveel keer gebruik as wat dit toelaat.',
    'buy.codeFree':
      'Daardie kode sou die kursus heeltemal gratis maak, wat hierdie betaalblad nie kan aanvaar nie. Kontak ons en ons sal jou direk inskryf.',
    'buy.codeCurrency':
      'Daardie kode is in ’n ander geldeenheid as hierdie kursus, dus kan dit nie hier gebruik word nie.',
    'buy.codeNothing': 'Daardie kode neem niks van hierdie bestelling af nie.',
    'buy.whyFree': 'Hierdie kursus is gratis. Sluit vanaf die kursusblad daarby aan.',
    'buy.whyWithdrawal':
      'Jou keuse oor die terugtrekkingsreg van 14 dae kon nie aangeteken word nie, dus is betaling nie begin nie. Niks is gehef nie.',
    'buy.whyNoProvider':
      'Geen betalingsverskaffer is nog gekoppel nie, dus kan hierdie bestelling nie betaal word nie.',
    'buy.whyPhone': 'Daardie telefoonnommer is nie geldig nie. Kontroleer dit en probeer weer.',
    'buy.whyProvider':
      'Die betaling kon nie begin word nie. Kyk na jou bestellings voordat jy weer probeer.',
    'buy.refused': 'Die bestelling kon nie geplaas word nie. Niks is gehef nie.',
    'buy.unconfirmed':
      'Ons kon nie bevestig of jou bestelling geplaas is nie. Kyk na jou bestellings voordat jy weer probeer.',
  },
  'zh-hans': {
    'buy.crumb': '购买',
    'buy.eyebrow': '结账',
    'buy.nobodyLead': '目前还没有可以为其购买的人。',
    'buy.nobodyBody': '一次课程购买只对应一位学习者，因此必须指明一位：此账户上的您本人，或您家庭中某个孩子的档案。',
    'buy.claim': '为我自己购买',
    'buy.claimNote': '这会让您成为此账户上的学习者。这不是第二个账户。',
    'buy.addChild': '改为添加一个孩子',
    'buy.backCourse': '返回课程',
    'buy.subLead': '此课程以订阅方式出售，而不是一次性购买。',
    'buy.subBody': '此结账页面尚未出售订阅。未收取任何费用。',
    'buy.ambiguousLead': '此课程在您所在的国家或地区有不止一个价格。',
    'buy.ambiguousBody': '我们不会替您选择货币。请联系我们，我们会设定正确的货币，之后您即可购买。',
    'buy.noPriceLead': '此课程尚未为该国家或地区定价：{country}。',
    'buy.noPriceAny': '此课程尚未为您所在的国家或地区定价。',
    'buy.noPriceBody': '未收取任何费用。请联系我们，我们会在您所在的国家或地区开放销售，之后您即可购买。',
    'buy.hasAlready': '{name} 已拥有此课程。本次购买是为另一位学习者。',
    'buy.noProviderLead': '尚未接入任何支付服务商。',
    'buy.noProviderBody': '您可以下此订单，订单会被保存，但在接入支付服务商之前无法付款。不会收取任何费用，在付款确认之前课程不会开放。',
    'buy.closedLead': '结账尚未开放。',
    'buy.closedBody': '本平台目前不接受课程付款，因此无法下单，也未收取任何费用。免费课程仍可从课程页面加入。',
    'buy.notOnSale': '此课程目前不向您出售，因此无需付款。',
    'buy.payHeading': '您将支付',
    'buy.pricedFor': '该国家或地区的价格：{country}。',
    'buy.standardPrice': '标准价格。',
    'buy.oneOff': '一次性购买，不是订阅。',
    'buy.accessNote': '访问权限在付款确认后开始，而不是在您按下按钮时。无论哪种情况，订单都会列在您的订单页面上。',
    'buy.whoFor': '这是为谁购买的？',
    'buy.choose': '请选择一位学习者',
    'buy.learnerChild': '{name}（儿童）',
    'buy.whoNote': '一次购买只对应一位学习者。要为两个孩子购买，请购买两次。',
    'buy.forOne': '本次购买是为 {name}。',
    'buy.codeLabel': '优惠码',
    'buy.checkPrice': '查看价格',
    'buy.checking': '正在查看…',
    'buy.codeNote': '有优惠码吗？请在此输入。如果它不适用于此课程，我们会在收取任何费用之前告知您。',
    'buy.quoteFailed': '无法算出该价格。请重试。',
    'buy.quoteSimple': '您将支付 {amount}。',
    'buy.quoteList': '标价 {amount}',
    'buy.quoteOffCode': '优惠码 {code} 减免 {amount}',
    'buy.quoteOff': '折扣 {amount}',
    'buy.quoteTax': '税费 {amount}',
    'buy.quoteFee': '手续费 {amount}',
    'buy.quotePay': '您支付 {amount}。',
    'buy.quoteTaxNote': '税费和手续费按折扣后的价格计算。',
    'buy.quoteHolds': '在您下单之前，不会为您保留任何内容。',
    'buy.payWith': '支付方式',
    'buy.phoneLabel': '移动支付号码',
    'buy.phoneNote': '将被要求批准付款的号码。',
    'buy.continue': '继续付款',
    'buy.starting': '正在开始…',
    'buy.noProviderNote': '此订单会被记录，但目前还无法付款。',
    'buy.approve': '请在您的手机上批准付款。付款确认后，您的课程即会开放。这可能需要一点时间。',
    'buy.orderSaved': '您的订单已保存。',
    'buy.signedOut': '您已退出登录。请重新登录，然后再试一次。',
    'buy.whyClosed': '结账尚未开放，因此没有下单。未收取任何费用。',
    'buy.whyNoCourse': '此课程目前无法购买。',
    'buy.whyNoPrice': '此课程目前不在出售。请重新加载页面查看。',
    'buy.whyOwned': '该学习者已拥有此课程，再次购买不会增加任何内容。',
    'buy.whyChoose': '请选择此课程是为谁购买的。',
    'buy.whyNotYours': '该学习者不在您的账户上。请重新加载页面并重新选择。',
    'buy.codeUnknown': '我们无法识别该优惠码。请检查后重试。',
    'buy.codeNotNow': '该优惠码目前未在生效：它已结束，或尚未开始。',
    'buy.codeNotHere': '该优惠码在您所在的国家或地区不可用。',
    'buy.codeNotCourse': '该优惠码不适用于此课程。',
    'buy.codeOwn': '这是您自己的邀请码，因此不能用于您自己的购买。它是给您发送邀请的朋友用的。',
    'buy.codeNewOnly': '该优惠码仅供此前从未购买过的人使用。',
    'buy.codeUsedUp': '该优惠码已用完。',
    'buy.codeUsedYou': '您使用该优惠码的次数已达到它允许的上限。',
    'buy.codeUsedFamily': '您的家庭使用该优惠码的次数已达到它允许的上限。',
    'buy.codeFree': '该优惠码会让课程完全免费，而此结账页面无法受理。请联系我们，我们会直接为您报名。',
    'buy.codeCurrency': '该优惠码的货币与此课程不同，因此不能在这里使用。',
    'buy.codeNothing': '该优惠码不会为此订单减免任何金额。',
    'buy.whyFree': '此课程是免费的。请从课程页面加入。',
    'buy.whyWithdrawal': '您关于 14 天撤回权的选择未能记录，因此付款没有开始。未收取任何费用。',
    'buy.whyNoProvider': '尚未接入任何支付服务商，因此此订单无法付款。',
    'buy.whyPhone': '该电话号码无效。请检查后重试。',
    'buy.whyProvider': '无法开始付款。请先查看您的订单，再重试。',
    'buy.refused': '无法下单。未收取任何费用。',
    'buy.unconfirmed': '我们无法确认您的订单是否已下。请先查看您的订单，再重试。',
  },
  'zh-hant': {
    'buy.crumb': '購買',
    'buy.eyebrow': '結帳',
    'buy.nobodyLead': '目前還沒有可以為其購買的人。',
    'buy.nobodyBody': '一次課程購買只對應一位學習者，因此必須指明一位：此帳號上的您本人，或您家庭中某個孩子的檔案。',
    'buy.claim': '為我自己購買',
    'buy.claimNote': '這會讓您成為此帳號上的學習者。這不是第二個帳號。',
    'buy.addChild': '改為新增一個孩子',
    'buy.backCourse': '返回課程',
    'buy.subLead': '此課程以訂閱方式販售，而不是一次性購買。',
    'buy.subBody': '此結帳頁面尚未販售訂閱。未收取任何費用。',
    'buy.ambiguousLead': '此課程在您所在的國家或地區有不只一個價格。',
    'buy.ambiguousBody': '我們不會替您選擇貨幣。請聯絡我們，我們會設定正確的貨幣，之後您即可購買。',
    'buy.noPriceLead': '此課程尚未為該國家或地區定價：{country}。',
    'buy.noPriceAny': '此課程尚未為您所在的國家或地區定價。',
    'buy.noPriceBody': '未收取任何費用。請聯絡我們，我們會在您所在的國家或地區開放販售，之後您即可購買。',
    'buy.hasAlready': '{name} 已擁有此課程。本次購買是為另一位學習者。',
    'buy.noProviderLead': '尚未串接任何付款服務商。',
    'buy.noProviderBody': '您可以下此訂單，訂單會被儲存，但在串接付款服務商之前無法付款。不會收取任何費用，在付款確認之前課程不會開放。',
    'buy.closedLead': '結帳尚未開放。',
    'buy.closedBody': '本平台目前不接受課程付款，因此無法下單，也未收取任何費用。免費課程仍可從課程頁面加入。',
    'buy.notOnSale': '此課程目前不向您販售，因此無需付款。',
    'buy.payHeading': '您將支付',
    'buy.pricedFor': '該國家或地區的價格：{country}。',
    'buy.standardPrice': '標準價格。',
    'buy.oneOff': '一次性購買，不是訂閱。',
    'buy.accessNote': '存取權在付款確認後開始，而不是在您按下按鈕時。無論哪種情況，訂單都會列在您的訂單頁面上。',
    'buy.whoFor': '這是為誰購買的？',
    'buy.choose': '請選擇一位學習者',
    'buy.learnerChild': '{name}（兒童）',
    'buy.whoNote': '一次購買只對應一位學習者。要為兩個孩子購買，請購買兩次。',
    'buy.forOne': '本次購買是為 {name}。',
    'buy.codeLabel': '優惠碼',
    'buy.checkPrice': '查看價格',
    'buy.checking': '正在查看…',
    'buy.codeNote': '有優惠碼嗎？請在此輸入。如果它不適用於此課程，我們會在收取任何費用之前告知您。',
    'buy.quoteFailed': '無法算出該價格。請重試。',
    'buy.quoteSimple': '您將支付 {amount}。',
    'buy.quoteList': '定價 {amount}',
    'buy.quoteOffCode': '優惠碼 {code} 折抵 {amount}',
    'buy.quoteOff': '折扣 {amount}',
    'buy.quoteTax': '稅金 {amount}',
    'buy.quoteFee': '手續費 {amount}',
    'buy.quotePay': '您支付 {amount}。',
    'buy.quoteTaxNote': '稅金和手續費按折扣後的價格計算。',
    'buy.quoteHolds': '在您下單之前，不會為您保留任何內容。',
    'buy.payWith': '付款方式',
    'buy.phoneLabel': '行動支付號碼',
    'buy.phoneNote': '將被要求核准付款的號碼。',
    'buy.continue': '繼續付款',
    'buy.starting': '正在開始…',
    'buy.noProviderNote': '此訂單會被記錄，但目前還無法付款。',
    'buy.approve': '請在您的手機上核准付款。付款確認後，您的課程即會開放。這可能需要一點時間。',
    'buy.orderSaved': '您的訂單已儲存。',
    'buy.signedOut': '您已登出。請重新登入，然後再試一次。',
    'buy.whyClosed': '結帳尚未開放，因此沒有下單。未收取任何費用。',
    'buy.whyNoCourse': '此課程目前無法購買。',
    'buy.whyNoPrice': '此課程目前不在販售。請重新載入頁面查看。',
    'buy.whyOwned': '該學習者已擁有此課程，再次購買不會增加任何內容。',
    'buy.whyChoose': '請選擇此課程是為誰購買的。',
    'buy.whyNotYours': '該學習者不在您的帳號上。請重新載入頁面並重新選擇。',
    'buy.codeUnknown': '我們無法辨識該優惠碼。請檢查後重試。',
    'buy.codeNotNow': '該優惠碼目前未在生效：它已結束，或尚未開始。',
    'buy.codeNotHere': '該優惠碼在您所在的國家或地區無法使用。',
    'buy.codeNotCourse': '該優惠碼不適用於此課程。',
    'buy.codeOwn': '這是您自己的邀請碼，因此不能用於您自己的購買。它是給您寄送邀請的朋友用的。',
    'buy.codeNewOnly': '該優惠碼僅供先前從未購買過的人使用。',
    'buy.codeUsedUp': '該優惠碼已用完。',
    'buy.codeUsedYou': '您使用該優惠碼的次數已達到它允許的上限。',
    'buy.codeUsedFamily': '您的家庭使用該優惠碼的次數已達到它允許的上限。',
    'buy.codeFree': '該優惠碼會讓課程完全免費，而此結帳頁面無法受理。請聯絡我們，我們會直接為您報名。',
    'buy.codeCurrency': '該優惠碼的貨幣與此課程不同，因此不能在這裡使用。',
    'buy.codeNothing': '該優惠碼不會為此訂單折抵任何金額。',
    'buy.whyFree': '此課程是免費的。請從課程頁面加入。',
    'buy.whyWithdrawal': '您關於 14 天撤回權的選擇未能記錄，因此付款沒有開始。未收取任何費用。',
    'buy.whyNoProvider': '尚未串接任何付款服務商，因此此訂單無法付款。',
    'buy.whyPhone': '該電話號碼無效。請檢查後重試。',
    'buy.whyProvider': '無法開始付款。請先查看您的訂單，再重試。',
    'buy.refused': '無法下單。未收取任何費用。',
    'buy.unconfirmed': '我們無法確認您的訂單是否已下。請先查看您的訂單，再重試。',
  },
  vi: {
    'buy.crumb': 'Mua',
    'buy.eyebrow': 'Thanh toán',
    'buy.nobodyLead': 'Chưa có ai để mua khoá học này cho.',
    'buy.nobodyBody':
      'Một lần mua khoá học dành cho một học viên, vì vậy phải có một người được nêu tên: chính bạn trên tài khoản này, hoặc hồ sơ của một trẻ trong gia đình bạn.',
    'buy.claim': 'Mua cho chính tôi',
    'buy.claimNote':
      'Thao tác này biến bạn thành học viên trên tài khoản này. Đây không phải là tài khoản thứ hai.',
    'buy.addChild': 'Thêm một trẻ thay vào đó',
    'buy.backCourse': 'Quay lại khoá học',
    'buy.subLead': 'Khoá học này được bán theo hình thức đăng ký định kỳ, không phải mua một lần.',
    'buy.subBody': 'Trang thanh toán này chưa bán gói đăng ký định kỳ. Chưa có khoản nào bị thu.',
    'buy.ambiguousLead': 'Khoá học này có nhiều hơn một mức giá cho quốc gia của bạn.',
    'buy.ambiguousBody':
      'Chúng tôi sẽ không chọn loại tiền thay bạn. Hãy liên hệ với chúng tôi, chúng tôi sẽ đặt đúng loại tiền, sau đó bạn có thể mua.',
    'buy.noPriceLead': 'Khoá học này chưa có giá cho quốc gia này: {country}.',
    'buy.noPriceAny': 'Khoá học này chưa có giá cho quốc gia của bạn.',
    'buy.noPriceBody':
      'Chưa có khoản nào bị thu. Hãy liên hệ với chúng tôi, chúng tôi sẽ mở bán tại quốc gia của bạn, sau đó bạn có thể mua.',
    'buy.hasAlready': '{name} đã có khoá học này. Lần mua này dành cho một học viên khác.',
    'buy.noProviderLead': 'Chưa có nhà cung cấp thanh toán nào được kết nối.',
    'buy.noProviderBody':
      'Bạn có thể đặt đơn hàng này và đơn sẽ được lưu, nhưng chưa thể thanh toán cho đến khi có nhà cung cấp được kết nối. Không có khoản nào bị thu, và khoá học không mở cho đến khi khoản thanh toán được xác nhận.',
    'buy.closedLead': 'Trang thanh toán chưa mở.',
    'buy.closedBody':
      'Nền tảng này hiện không nhận thanh toán cho khoá học, vì vậy không thể đặt đơn hàng và chưa có khoản nào bị thu. Bạn vẫn có thể tham gia các khoá học miễn phí từ trang khoá học.',
    'buy.notOnSale': 'Khoá học này hiện không được bán cho bạn, vì vậy không có gì phải trả.',
    'buy.payHeading': 'Số tiền bạn sẽ trả',
    'buy.pricedFor': 'Giá cho quốc gia này: {country}.',
    'buy.standardPrice': 'Giá tiêu chuẩn.',
    'buy.oneOff': 'Mua một lần, không phải đăng ký định kỳ.',
    'buy.accessNote':
      'Quyền truy cập bắt đầu khi khoản thanh toán được xác nhận, không phải khi bạn nhấn nút. Trong cả hai trường hợp, đơn hàng đều được liệt kê trên trang đơn hàng của bạn.',
    'buy.whoFor': 'Khoá học này dành cho ai?',
    'buy.choose': 'Chọn một học viên',
    'buy.learnerChild': '{name} (trẻ em)',
    'buy.whoNote': 'Một lần mua dành cho một học viên. Để mua cho hai trẻ, hãy mua hai lần.',
    'buy.forOne': 'Lần mua này dành cho {name}.',
    'buy.codeLabel': 'Mã giảm giá',
    'buy.checkPrice': 'Kiểm tra giá',
    'buy.checking': 'Đang kiểm tra…',
    'buy.codeNote':
      'Bạn có mã? Hãy nhập vào đây. Nếu mã không áp dụng cho khoá học này, bạn sẽ được báo trước khi bất kỳ khoản nào bị thu.',
    'buy.quoteFailed': 'Không tính được mức giá đó. Hãy thử lại.',
    'buy.quoteSimple': 'Bạn sẽ trả {amount}.',
    'buy.quoteList': 'Giá niêm yết {amount}',
    'buy.quoteOffCode': 'mã {code} giảm {amount}',
    'buy.quoteOff': 'giảm giá {amount}',
    'buy.quoteTax': 'thuế {amount}',
    'buy.quoteFee': 'phí {amount}',
    'buy.quotePay': 'bạn trả {amount}.',
    'buy.quoteTaxNote': 'Thuế và phí được tính trên giá sau khi đã giảm.',
    'buy.quoteHolds': 'Không có gì được giữ chỗ cho đến khi bạn đặt đơn hàng.',
    'buy.payWith': 'Thanh toán bằng',
    'buy.phoneLabel': 'Số ví tiền di động',
    'buy.phoneNote': 'Số điện thoại sẽ được yêu cầu chấp thuận khoản thanh toán.',
    'buy.continue': 'Tiếp tục đến thanh toán',
    'buy.starting': 'Đang bắt đầu…',
    'buy.noProviderNote': 'Đơn hàng này sẽ được ghi lại nhưng chưa thể thanh toán.',
    'buy.approve':
      'Hãy chấp thuận khoản thanh toán trên điện thoại của bạn. Khoá học sẽ mở khi khoản thanh toán được xác nhận. Việc này có thể mất một lúc.',
    'buy.orderSaved': 'Đơn hàng của bạn đã được lưu.',
    'buy.signedOut': 'Bạn đã đăng xuất. Hãy đăng nhập lại rồi thử thêm một lần.',
    'buy.whyClosed':
      'Trang thanh toán chưa mở, vì vậy chưa có đơn hàng nào được đặt. Chưa có khoản nào bị thu.',
    'buy.whyNoCourse': 'Hiện không thể mua khoá học này.',
    'buy.whyNoPrice': 'Khoá học này hiện không được bán. Hãy tải lại trang để kiểm tra.',
    'buy.whyOwned': 'Học viên đó đã có khoá học này, vì vậy mua lại sẽ không thêm được gì.',
    'buy.whyChoose': 'Hãy chọn khoá học này dành cho ai.',
    'buy.whyNotYours':
      'Học viên đó không có trên tài khoản của bạn. Hãy tải lại trang và chọn lại.',
    'buy.codeUnknown': 'Chúng tôi không nhận ra mã đó. Hãy kiểm tra rồi thử lại.',
    'buy.codeNotNow': 'Mã đó hiện không có hiệu lực: mã đã kết thúc, hoặc chưa bắt đầu.',
    'buy.codeNotHere': 'Mã đó không dùng được tại quốc gia của bạn.',
    'buy.codeNotCourse': 'Mã đó không dành cho khoá học này.',
    'buy.codeOwn':
      'Đó là mã mời của chính bạn, vì vậy không thể dùng cho lần mua của chính bạn. Mã này dành cho người bạn mà bạn gửi đến.',
    'buy.codeNewOnly': 'Mã đó chỉ dành cho người chưa từng mua gì.',
    'buy.codeUsedUp': 'Mã đó đã hết lượt dùng.',
    'buy.codeUsedYou': 'Bạn đã dùng mã đó đủ số lần được phép.',
    'buy.codeUsedFamily': 'Gia đình bạn đã dùng mã đó đủ số lần được phép.',
    'buy.codeFree':
      'Mã đó sẽ khiến khoá học hoàn toàn miễn phí, điều mà trang thanh toán này không thể nhận. Hãy liên hệ với chúng tôi, chúng tôi sẽ ghi danh trực tiếp cho bạn.',
    'buy.codeCurrency': 'Mã đó dùng loại tiền khác với khoá học này, vì vậy không thể dùng ở đây.',
    'buy.codeNothing': 'Mã đó không giảm được gì cho đơn hàng này.',
    'buy.whyFree': 'Khoá học này miễn phí. Hãy tham gia từ trang khoá học.',
    'buy.whyWithdrawal':
      'Không ghi lại được lựa chọn của bạn về quyền rút lại trong 14 ngày, vì vậy việc thanh toán chưa bắt đầu. Chưa có khoản nào bị thu.',
    'buy.whyNoProvider':
      'Chưa có nhà cung cấp thanh toán nào được kết nối, vì vậy không thể thanh toán đơn hàng này.',
    'buy.whyPhone': 'Số điện thoại đó không hợp lệ. Hãy kiểm tra rồi thử lại.',
    'buy.whyProvider':
      'Không bắt đầu được việc thanh toán. Hãy xem đơn hàng của bạn trước khi thử lại.',
    'buy.refused': 'Không đặt được đơn hàng. Chưa có khoản nào bị thu.',
    'buy.unconfirmed':
      'Chúng tôi không xác nhận được đơn hàng của bạn đã được đặt hay chưa. Hãy xem đơn hàng của bạn trước khi thử lại.',
  },
  th: {
    'buy.crumb': 'ซื้อ',
    'buy.eyebrow': 'ชำระเงิน',
    'buy.nobodyLead': 'ยังไม่มีผู้ที่จะซื้อหลักสูตรนี้ให้',
    'buy.nobodyBody':
      'การซื้อหลักสูตรหนึ่งครั้งเป็นของผู้เรียนหนึ่งคน จึงต้องมีผู้เรียนที่ระบุชื่อได้หนึ่งคน: ตัวคุณเองในบัญชีนี้ หรือโปรไฟล์ของเด็กในครอบครัวของคุณ',
    'buy.claim': 'ซื้อให้ตัวฉันเอง',
    'buy.claimNote': 'การกดปุ่มนี้ทำให้คุณเป็นผู้เรียนในบัญชีนี้ ไม่ใช่บัญชีที่สอง',
    'buy.addChild': 'เพิ่มเด็กแทน',
    'buy.backCourse': 'กลับไปที่หลักสูตร',
    'buy.subLead': 'หลักสูตรนี้ขายแบบสมัครสมาชิก ไม่ใช่การซื้อครั้งเดียว',
    'buy.subBody': 'หน้าชำระเงินนี้ยังไม่ขายแบบสมัครสมาชิก ยังไม่มีการเรียกเก็บเงินใด ๆ',
    'buy.ambiguousLead': 'หลักสูตรนี้มีราคามากกว่าหนึ่งราคาสำหรับประเทศของคุณ',
    'buy.ambiguousBody':
      'เราจะไม่เลือกสกุลเงินแทนคุณ โปรดติดต่อเรา แล้วเราจะกำหนดสกุลเงินที่ถูกต้อง จากนั้นคุณจึงซื้อได้',
    'buy.noPriceLead': 'หลักสูตรนี้ยังไม่มีราคาสำหรับประเทศนี้: {country}',
    'buy.noPriceAny': 'หลักสูตรนี้ยังไม่มีราคาสำหรับประเทศของคุณ',
    'buy.noPriceBody':
      'ยังไม่มีการเรียกเก็บเงินใด ๆ โปรดติดต่อเรา แล้วเราจะเปิดขายในประเทศของคุณ จากนั้นคุณจึงซื้อได้',
    'buy.hasAlready': '{name} มีหลักสูตรนี้อยู่แล้ว การซื้อครั้งนี้เป็นของผู้เรียนอีกคนหนึ่ง',
    'buy.noProviderLead': 'ยังไม่มีผู้ให้บริการชำระเงินที่เชื่อมต่อไว้',
    'buy.noProviderBody':
      'คุณสั่งซื้อรายการนี้ได้และรายการจะถูกบันทึกไว้ แต่จะชำระเงินไม่ได้จนกว่าจะมีผู้ให้บริการเชื่อมต่อ ไม่มีการเรียกเก็บเงินใด ๆ และหลักสูตรจะไม่เปิดจนกว่าจะยืนยันการชำระเงิน',
    'buy.closedLead': 'การชำระเงินยังไม่เปิด',
    'buy.closedBody':
      'ขณะนี้แพลตฟอร์มนี้ยังไม่รับชำระเงินค่าหลักสูตร จึงสั่งซื้อไม่ได้และยังไม่มีการเรียกเก็บเงินใด ๆ คุณยังเข้าร่วมหลักสูตรฟรีได้จากหน้าหลักสูตร',
    'buy.notOnSale': 'ขณะนี้หลักสูตรนี้ไม่ได้ขายให้คุณ จึงไม่มีอะไรต้องชำระ',
    'buy.payHeading': 'จำนวนเงินที่คุณจะชำระ',
    'buy.pricedFor': 'ราคาสำหรับประเทศนี้: {country}',
    'buy.standardPrice': 'ราคามาตรฐาน',
    'buy.oneOff': 'การซื้อครั้งเดียว ไม่ใช่การสมัครสมาชิก',
    'buy.accessNote':
      'สิทธิ์เข้าเรียนเริ่มเมื่อยืนยันการชำระเงินแล้ว ไม่ใช่เมื่อคุณกดปุ่ม ไม่ว่ากรณีใด คำสั่งซื้อจะแสดงอยู่ในหน้าคำสั่งซื้อของคุณ',
    'buy.whoFor': 'ซื้อให้ใคร',
    'buy.choose': 'เลือกผู้เรียน',
    'buy.learnerChild': '{name} (เด็ก)',
    'buy.whoNote': 'การซื้อหนึ่งครั้งเป็นของผู้เรียนหนึ่งคน หากจะซื้อให้เด็กสองคน โปรดซื้อสองครั้ง',
    'buy.forOne': 'การซื้อครั้งนี้เป็นของ {name}',
    'buy.codeLabel': 'รหัสส่วนลด',
    'buy.checkPrice': 'ตรวจสอบราคา',
    'buy.checking': 'กำลังตรวจสอบ…',
    'buy.codeNote':
      'มีรหัสหรือไม่ กรอกที่นี่ หากรหัสใช้กับหลักสูตรนี้ไม่ได้ คุณจะได้รับแจ้งก่อนมีการเรียกเก็บเงินใด ๆ',
    'buy.quoteFailed': 'คำนวณราคานั้นไม่ได้ โปรดลองอีกครั้ง',
    'buy.quoteSimple': 'คุณจะชำระ {amount}',
    'buy.quoteList': 'ราคาตั้ง {amount}',
    'buy.quoteOffCode': 'รหัส {code} ลด {amount}',
    'buy.quoteOff': 'ส่วนลด {amount}',
    'buy.quoteTax': 'ภาษี {amount}',
    'buy.quoteFee': 'ค่าธรรมเนียม {amount}',
    'buy.quotePay': 'คุณชำระ {amount}',
    'buy.quoteTaxNote': 'ภาษีและค่าธรรมเนียมคำนวณจากราคาหลังหักส่วนลดแล้ว',
    'buy.quoteHolds': 'จะไม่มีการจองสิ่งใดไว้จนกว่าคุณจะสั่งซื้อ',
    'buy.payWith': 'ชำระด้วย',
    'buy.phoneLabel': 'หมายเลขโมบายมันนี่',
    'buy.phoneNote': 'หมายเลขที่จะได้รับคำขอให้อนุมัติการชำระเงิน',
    'buy.continue': 'ไปยังการชำระเงิน',
    'buy.starting': 'กำลังเริ่ม…',
    'buy.noProviderNote': 'คำสั่งซื้อนี้จะถูกบันทึกไว้ แต่ยังชำระเงินไม่ได้',
    'buy.approve':
      'โปรดอนุมัติการชำระเงินบนโทรศัพท์ของคุณ หลักสูตรของคุณจะเปิดเมื่อยืนยันการชำระเงินแล้ว อาจใช้เวลาสักครู่',
    'buy.orderSaved': 'บันทึกคำสั่งซื้อของคุณแล้ว',
    'buy.signedOut': 'คุณออกจากระบบแล้ว โปรดเข้าสู่ระบบอีกครั้ง แล้วลองอีกหนึ่งครั้ง',
    'buy.whyClosed': 'การชำระเงินยังไม่เปิด จึงไม่มีการสั่งซื้อ ยังไม่มีการเรียกเก็บเงินใด ๆ',
    'buy.whyNoCourse': 'ขณะนี้ยังซื้อหลักสูตรนี้ไม่ได้',
    'buy.whyNoPrice': 'ขณะนี้หลักสูตรนี้ไม่ได้วางขาย โปรดโหลดหน้านี้ใหม่เพื่อตรวจสอบ',
    'buy.whyOwned': 'ผู้เรียนคนนั้นมีหลักสูตรนี้อยู่แล้ว การซื้อซ้ำจึงไม่เพิ่มสิ่งใด',
    'buy.whyChoose': 'โปรดเลือกว่าหลักสูตรนี้ซื้อให้ใคร',
    'buy.whyNotYours': 'ผู้เรียนคนนั้นไม่ได้อยู่ในบัญชีของคุณ โปรดโหลดหน้านี้ใหม่แล้วเลือกอีกครั้ง',
    'buy.codeUnknown': 'เราไม่รู้จักรหัสนั้น โปรดตรวจสอบแล้วลองอีกครั้ง',
    'buy.codeNotNow': 'ขณะนี้รหัสนั้นไม่ได้เปิดใช้: รหัสสิ้นสุดแล้ว หรือยังไม่เริ่ม',
    'buy.codeNotHere': 'รหัสนั้นใช้ไม่ได้ในประเทศของคุณ',
    'buy.codeNotCourse': 'รหัสนั้นไม่ได้ใช้กับหลักสูตรนี้',
    'buy.codeOwn':
      'นั่นคือรหัสเชิญของคุณเอง จึงใช้กับการซื้อของคุณเองไม่ได้ รหัสนี้มีไว้สำหรับเพื่อนที่คุณส่งให้',
    'buy.codeNewOnly': 'รหัสนั้นใช้ได้เฉพาะผู้ที่ยังไม่เคยซื้อสิ่งใดมาก่อน',
    'buy.codeUsedUp': 'รหัสนั้นถูกใช้ครบแล้ว',
    'buy.codeUsedYou': 'คุณใช้รหัสนั้นครบจำนวนครั้งที่อนุญาตแล้ว',
    'buy.codeUsedFamily': 'ครอบครัวของคุณใช้รหัสนั้นครบจำนวนครั้งที่อนุญาตแล้ว',
    'buy.codeFree':
      'รหัสนั้นจะทำให้หลักสูตรฟรีทั้งหมด ซึ่งหน้าชำระเงินนี้รับไม่ได้ โปรดติดต่อเรา แล้วเราจะลงทะเบียนให้คุณโดยตรง',
    'buy.codeCurrency': 'รหัสนั้นเป็นสกุลเงินที่ต่างจากหลักสูตรนี้ จึงใช้ที่นี่ไม่ได้',
    'buy.codeNothing': 'รหัสนั้นไม่ได้ลดสิ่งใดจากคำสั่งซื้อนี้',
    'buy.whyFree': 'หลักสูตรนี้ฟรี โปรดเข้าร่วมจากหน้าหลักสูตร',
    'buy.whyWithdrawal':
      'บันทึกการเลือกของคุณเกี่ยวกับสิทธิ์ยกเลิกภายใน 14 วันไม่ได้ จึงยังไม่ได้เริ่มการชำระเงิน ยังไม่มีการเรียกเก็บเงินใด ๆ',
    'buy.whyNoProvider':
      'ยังไม่มีผู้ให้บริการชำระเงินที่เชื่อมต่อไว้ จึงชำระเงินคำสั่งซื้อนี้ไม่ได้',
    'buy.whyPhone': 'หมายเลขโทรศัพท์นั้นไม่ถูกต้อง โปรดตรวจสอบแล้วลองอีกครั้ง',
    'buy.whyProvider': 'เริ่มการชำระเงินไม่ได้ โปรดดูคำสั่งซื้อของคุณก่อนลองอีกครั้ง',
    'buy.refused': 'สั่งซื้อไม่ได้ ยังไม่มีการเรียกเก็บเงินใด ๆ',
    'buy.unconfirmed':
      'เรายืนยันไม่ได้ว่าคำสั่งซื้อของคุณถูกส่งแล้วหรือไม่ โปรดดูคำสั่งซื้อของคุณก่อนลองอีกครั้ง',
  },
  fil: {
    'buy.crumb': 'Bumili',
    'buy.eyebrow': 'Pagbabayad',
    'buy.nobodyLead': 'Wala pang mapagbibilhan nito.',
    'buy.nobodyBody':
      'Ang pagbili ng kurso ay para sa isang mag-aaral, kaya kailangang may isang pangangalanan: ikaw sa account na ito, o ang profile ng isang bata sa iyong pamilya.',
    'buy.claim': 'Bilhin para sa aking sarili',
    'buy.claimNote':
      'Ginagawa ka nitong mag-aaral sa account na ito. Hindi ito pangalawang account.',
    'buy.addChild': 'Magdagdag na lang ng bata',
    'buy.backCourse': 'Bumalik sa kurso',
    'buy.subLead':
      'Ibinebenta ang kursong ito bilang subscription, hindi bilang minsanang pagbili.',
    'buy.subBody':
      'Hindi pa ibinebenta ang mga subscription sa pahinang ito ng pagbabayad. Walang siningil.',
    'buy.ambiguousLead': 'May higit sa isang presyo ang kursong ito para sa iyong bansa.',
    'buy.ambiguousBody':
      'Hindi kami pipili ng salapi para sa iyo. Makipag-ugnayan sa amin at itatakda namin ang tama, saka mo ito mabibili.',
    'buy.noPriceLead': 'Wala pang presyo ang kursong ito para sa bansang ito: {country}.',
    'buy.noPriceAny': 'Wala pang presyo ang kursong ito para sa iyong bansa.',
    'buy.noPriceBody':
      'Walang siningil. Makipag-ugnayan sa amin at bubuksan namin ang bentahan sa iyong bansa, saka mo ito mabibili.',
    'buy.hasAlready':
      'Mayroon na ng kursong ito si {name}. Ang pagbiling ito ay para sa ibang mag-aaral.',
    'buy.noProviderLead': 'Wala pang nakakonektang tagapagbigay ng pagbabayad.',
    'buy.noProviderBody':
      'Maaari mong ilagay ang order na ito at mase-save ito, pero hindi ito mababayaran hangga’t walang nakakonektang tagapagbigay. Walang sinisingil, at hindi magbubukas ang kurso hangga’t hindi nakukumpirma ang bayad.',
    'buy.closedLead': 'Hindi pa bukas ang pagbabayad.',
    'buy.closedBody':
      'Hindi tumatanggap ng bayad para sa mga kurso ang platapormang ito sa ngayon, kaya walang order na mailalagay at walang siningil. Maaari pa ring sumali sa mga libreng kurso mula sa pahina ng kurso.',
    'buy.notOnSale': 'Hindi ibinebenta sa iyo ang kursong ito sa ngayon, kaya walang babayaran.',
    'buy.payHeading': 'Ang babayaran mo',
    'buy.pricedFor': 'Presyo para sa bansang ito: {country}.',
    'buy.standardPrice': 'Ang karaniwang presyo.',
    'buy.oneOff': 'Minsanang pagbili, hindi subscription.',
    'buy.accessNote':
      'Nagsisimula ang access kapag nakumpirma ang bayad, hindi kapag pinindot mo ang button. Alinman doon, nakalista ang order sa pahina ng iyong mga order.',
    'buy.whoFor': 'Para kanino ito?',
    'buy.choose': 'Pumili ng mag-aaral',
    'buy.learnerChild': '{name} (bata)',
    'buy.whoNote':
      'Ang isang pagbili ay para sa isang mag-aaral. Para bumili para sa dalawang bata, bilhin ito nang dalawang beses.',
    'buy.forOne': 'Ang pagbiling ito ay para kay {name}.',
    'buy.codeLabel': 'Code ng diskwento',
    'buy.checkPrice': 'Tingnan ang presyo',
    'buy.checking': 'Tinitingnan…',
    'buy.codeNote':
      'May code ka ba? Ilagay ito rito. Kung hindi ito para sa kursong ito, sasabihan ka bago maningil ng anuman.',
    'buy.quoteFailed': 'Hindi nakuwenta ang presyong iyon. Subukan muli.',
    'buy.quoteSimple': 'Magbabayad ka ng {amount}.',
    'buy.quoteList': 'Nakalistang presyo {amount}',
    'buy.quoteOffCode': 'bawas ng code na {code}: {amount}',
    'buy.quoteOff': 'diskwento {amount}',
    'buy.quoteTax': 'buwis {amount}',
    'buy.quoteFee': 'bayarin {amount}',
    'buy.quotePay': 'babayaran mo {amount}.',
    'buy.quoteTaxNote':
      'Kinukuwenta ang buwis at mga bayarin mula sa presyo matapos ang anumang diskwento.',
    'buy.quoteHolds': 'Walang inirereserba hangga’t hindi mo inilalagay ang order.',
    'buy.payWith': 'Magbayad gamit ang',
    'buy.phoneLabel': 'Numero ng mobile money',
    'buy.phoneNote': 'Ang numerong hihilingang aprubahan ang bayad.',
    'buy.continue': 'Magpatuloy sa pagbabayad',
    'buy.starting': 'Nagsisimula…',
    'buy.noProviderNote': 'Itatala ang order na ito pero hindi pa ito mababayaran.',
    'buy.approve':
      'Aprubahan ang bayad sa iyong telepono. Magbubukas ang iyong kurso kapag nakumpirma ang bayad. Maaaring tumagal ito nang sandali.',
    'buy.orderSaved': 'Na-save ang iyong order.',
    'buy.signedOut': 'Naka-sign out ka na. Mag-sign in muli, saka subukan nang isa pang beses.',
    'buy.whyClosed':
      'Hindi pa bukas ang pagbabayad, kaya walang order na nailagay. Walang siningil.',
    'buy.whyNoCourse': 'Hindi mabibili ang kursong ito sa ngayon.',
    'buy.whyNoPrice':
      'Hindi ibinebenta ang kursong ito sa ngayon. I-reload ang pahina para tingnan.',
    'buy.whyOwned':
      'Mayroon na ng kursong ito ang mag-aaral na iyon, kaya walang maidaragdag ang muling pagbili.',
    'buy.whyChoose': 'Piliin kung para kanino ang kursong ito.',
    'buy.whyNotYours':
      'Wala sa iyong account ang mag-aaral na iyon. I-reload ang pahina at pumili muli.',
    'buy.codeUnknown': 'Hindi namin kilala ang code na iyon. Suriin ito at subukan muli.',
    'buy.codeNotNow':
      'Hindi umiiral ang code na iyon sa ngayon: natapos na ito, o hindi pa nagsisimula.',
    'buy.codeNotHere': 'Hindi magagamit ang code na iyon sa iyong bansa.',
    'buy.codeNotCourse': 'Hindi para sa kursong ito ang code na iyon.',
    'buy.codeOwn':
      'Sarili mong code ng imbitasyon iyon, kaya hindi ito magagamit sa sarili mong pagbili. Para ito sa kaibigang pinadadalhan mo.',
    'buy.codeNewOnly': 'Para lang ang code na iyon sa mga taong hindi pa nakabibili ng anuman.',
    'buy.codeUsedUp': 'Naubos na ang code na iyon.',
    'buy.codeUsedYou': 'Nagamit mo na ang code na iyon nang kasindalas ng pinapayagan nito.',
    'buy.codeUsedFamily':
      'Nagamit na ng iyong pamilya ang code na iyon nang kasindalas ng pinapayagan nito.',
    'buy.codeFree':
      'Gagawing ganap na libre ng code na iyon ang kurso, na hindi matatanggap ng pahinang ito ng pagbabayad. Makipag-ugnayan sa amin at direkta ka naming ie-enroll.',
    'buy.codeCurrency':
      'Nasa ibang salapi ang code na iyon kaysa sa kursong ito, kaya hindi ito magagamit dito.',
    'buy.codeNothing': 'Walang ibinabawas ang code na iyon sa order na ito.',
    'buy.whyFree': 'Libre ang kursong ito. Sumali mula sa pahina ng kurso.',
    'buy.whyWithdrawal':
      'Hindi naitala ang pinili mo tungkol sa 14 na araw na karapatang umatras, kaya hindi sinimulan ang pagbabayad. Walang siningil.',
    'buy.whyNoProvider':
      'Wala pang nakakonektang tagapagbigay ng pagbabayad, kaya hindi mababayaran ang order na ito.',
    'buy.whyPhone': 'Hindi wasto ang numero ng teleponong iyon. Suriin ito at subukan muli.',
    'buy.whyProvider':
      'Hindi nasimulan ang pagbabayad. Tingnan ang iyong mga order bago subukan muli.',
    'buy.refused': 'Hindi nailagay ang order. Walang siningil.',
    'buy.unconfirmed':
      'Hindi namin nakumpirma kung nailagay ang iyong order. Tingnan ang iyong mga order bago subukan muli.',
  },
  uz: {
    'buy.crumb': 'Sotib olish',
    'buy.eyebrow': 'Toʻlov',
    'buy.nobodyLead': 'Buni kim uchun sotib olish mumkinligi hali yoʻq.',
    'buy.nobodyBody':
      'Kursni sotib olish bitta oʻquvchi uchun boʻladi, shuning uchun bir kishi koʻrsatilishi kerak: shu hisobdagi oʻzingiz yoki oilangizdagi bolaning profili.',
    'buy.claim': 'Oʻzim uchun sotib olaman',
    'buy.claimNote': 'Bu sizni shu hisobda oʻquvchiga aylantiradi. Bu ikkinchi hisob emas.',
    'buy.addChild': 'Buning oʻrniga bola qoʻshish',
    'buy.backCourse': 'Kursga qaytish',
    'buy.subLead': 'Bu kurs bir martalik xarid sifatida emas, obuna sifatida sotiladi.',
    'buy.subBody':
      'Obunalar bu toʻlov sahifasi orqali hali sotilmaydi. Hech qanday pul yechilmadi.',
    'buy.ambiguousLead': 'Bu kursning mamlakatingiz uchun bittadan ortiq narxi bor.',
    'buy.ambiguousBody':
      'Biz siz uchun valyuta tanlamaymiz. Biz bilan bogʻlaning, toʻgʻrisini belgilaymiz, shundan soʻng sotib olishingiz mumkin.',
    'buy.noPriceLead': 'Bu kursning ushbu mamlakat uchun hali narxi yoʻq: {country}.',
    'buy.noPriceAny': 'Bu kursning mamlakatingiz uchun hali narxi yoʻq.',
    'buy.noPriceBody':
      'Hech qanday pul yechilmadi. Biz bilan bogʻlaning, mamlakatingizda sotuvni ochamiz, shundan soʻng sotib olishingiz mumkin.',
    'buy.hasAlready':
      'Bu kurs ushbu oʻquvchida allaqachon bor: {name}. Bu xarid boshqa oʻquvchi uchun.',
    'buy.noProviderLead': 'Hali hech qanday toʻlov provayderi ulanmagan.',
    'buy.noProviderBody':
      'Bu buyurtmani berishingiz mumkin va u saqlanadi, lekin provayder ulanmaguncha uni toʻlab boʻlmaydi. Hech qanday pul yechilmaydi va toʻlov tasdiqlanmaguncha kurs ochilmaydi.',
    'buy.closedLead': 'Toʻlov hali ochilmagan.',
    'buy.closedBody':
      'Bu platforma hozircha kurslar uchun toʻlov qabul qilmayapti, shuning uchun buyurtma berib boʻlmaydi va hech qanday pul yechilmadi. Bepul kurslarga kurs sahifasidan hali ham qoʻshilish mumkin.',
    'buy.notOnSale': 'Bu kurs hozircha sizga sotilmayapti, shuning uchun toʻlanadigan narsa yoʻq.',
    'buy.payHeading': 'Siz toʻlaydigan summa',
    'buy.pricedFor': 'Ushbu mamlakat uchun narx: {country}.',
    'buy.standardPrice': 'Standart narx.',
    'buy.oneOff': 'Bir martalik xarid, obuna emas.',
    'buy.accessNote':
      'Kirish tugmani bosganingizda emas, toʻlov tasdiqlanganda boshlanadi. Har ikki holatda ham buyurtma buyurtmalaringiz sahifasida koʻrsatiladi.',
    'buy.whoFor': 'Bu kim uchun?',
    'buy.choose': 'Oʻquvchini tanlang',
    'buy.learnerChild': '{name} (bola)',
    'buy.whoNote':
      'Bitta xarid bitta oʻquvchi uchun. Ikki bola uchun sotib olish uchun ikki marta sotib oling.',
    'buy.forOne': 'Bu xarid ushbu oʻquvchi uchun: {name}.',
    'buy.codeLabel': 'Chegirma kodi',
    'buy.checkPrice': 'Narxni tekshirish',
    'buy.checking': 'Tekshirilmoqda…',
    'buy.codeNote':
      'Kodingiz bormi? Shu yerga kiriting. Agar u bu kursga taalluqli boʻlmasa, biror pul yechilishidan oldin sizga aytiladi.',
    'buy.quoteFailed': 'Bu narxni hisoblab boʻlmadi. Qayta urinib koʻring.',
    'buy.quoteSimple': 'Siz toʻlaydigan summa: {amount}.',
    'buy.quoteList': 'Eʼlon qilingan narx {amount}',
    'buy.quoteOffCode': '{code} kodi boʻyicha chegirma {amount}',
    'buy.quoteOff': 'chegirma {amount}',
    'buy.quoteTax': 'soliq {amount}',
    'buy.quoteFee': 'toʻlov yigʻimi {amount}',
    'buy.quotePay': 'siz toʻlaysiz: {amount}.',
    'buy.quoteTaxNote': 'Soliq va yigʻimlar chegirmadan keyingi narxdan hisoblanadi.',
    'buy.quoteHolds': 'Buyurtma bermaguningizcha hech narsa band qilinmaydi.',
    'buy.payWith': 'Toʻlov usuli',
    'buy.phoneLabel': 'Mobil pul raqami',
    'buy.phoneNote': 'Toʻlovni tasdiqlash soʻraladigan raqam.',
    'buy.continue': 'Toʻlovga oʻtish',
    'buy.starting': 'Boshlanmoqda…',
    'buy.noProviderNote': 'Bu buyurtma qayd etiladi, lekin uni hali toʻlab boʻlmaydi.',
    'buy.approve':
      'Toʻlovni telefoningizda tasdiqlang. Toʻlov tasdiqlangach kursingiz ochiladi. Bu biroz vaqt olishi mumkin.',
    'buy.orderSaved': 'Buyurtmangiz saqlandi.',
    'buy.signedOut': 'Siz hisobdan chiqqansiz. Qayta kiring, soʻng yana bir marta urinib koʻring.',
    'buy.whyClosed':
      'Toʻlov hali ochilmagan, shuning uchun buyurtma berilmadi. Hech qanday pul yechilmadi.',
    'buy.whyNoCourse': 'Bu kursni hozircha sotib olib boʻlmaydi.',
    'buy.whyNoPrice': 'Bu kurs hozircha sotuvda emas. Tekshirish uchun sahifani qayta yuklang.',
    'buy.whyOwned':
      'Oʻsha oʻquvchida bu kurs allaqachon bor, shuning uchun uni qayta sotib olish hech narsa qoʻshmaydi.',
    'buy.whyChoose': 'Bu kurs kim uchun ekanini tanlang.',
    'buy.whyNotYours': 'Oʻsha oʻquvchi hisobingizda yoʻq. Sahifani qayta yuklab, yana tanlang.',
    'buy.codeUnknown': 'Bu kodni tanimaymiz. Tekshirib, qayta urinib koʻring.',
    'buy.codeNotNow': 'Bu kod hozir amal qilmayapti: u tugagan yoki hali boshlanmagan.',
    'buy.codeNotHere': 'Bu kod mamlakatingizda mavjud emas.',
    'buy.codeNotCourse': 'Bu kod bu kurs uchun emas.',
    'buy.codeOwn':
      'Bu oʻzingizning taklif kodingiz, shuning uchun uni oʻz xaridingizda ishlatib boʻlmaydi. U siz yuborgan doʻstingiz uchun.',
    'buy.codeNewOnly': 'Bu kod faqat ilgari hech narsa sotib olmagan kishilar uchun.',
    'buy.codeUsedUp': 'Bu kod toʻliq ishlatib boʻlingan.',
    'buy.codeUsedYou': 'Siz bu kodni ruxsat etilgan miqdorda ishlatib boʻlgansiz.',
    'buy.codeUsedFamily': 'Oilangiz bu kodni ruxsat etilgan miqdorda ishlatib boʻlgan.',
    'buy.codeFree':
      'Bu kod kursni butunlay bepul qiladi, bu toʻlov sahifasi esa buni qabul qila olmaydi. Biz bilan bogʻlaning, sizni toʻgʻridan-toʻgʻri roʻyxatga olamiz.',
    'buy.codeCurrency':
      'Bu kod ushbu kursdan boshqa valyutada, shuning uchun uni bu yerda ishlatib boʻlmaydi.',
    'buy.codeNothing': 'Bu kod bu buyurtmadan hech narsa kamaytirmaydi.',
    'buy.whyFree': 'Bu kurs bepul. Unga kurs sahifasidan qoʻshiling.',
    'buy.whyWithdrawal':
      '14 kunlik voz kechish huquqi boʻyicha tanlovingizni qayd etib boʻlmadi, shuning uchun toʻlov boshlanmadi. Hech qanday pul yechilmadi.',
    'buy.whyNoProvider':
      'Hali hech qanday toʻlov provayderi ulanmagan, shuning uchun bu buyurtmani toʻlab boʻlmaydi.',
    'buy.whyPhone': 'Bu telefon raqami yaroqsiz. Tekshirib, qayta urinib koʻring.',
    'buy.whyProvider':
      'Toʻlovni boshlab boʻlmadi. Qayta urinishdan oldin buyurtmalaringizni koʻring.',
    'buy.refused': 'Buyurtma berib boʻlmadi. Hech qanday pul yechilmadi.',
    'buy.unconfirmed':
      'Buyurtmangiz berilgan-berilmaganini tasdiqlay olmadik. Qayta urinishdan oldin buyurtmalaringizni koʻring.',
  },
  kk: {
    'buy.crumb': 'Сатып алу',
    'buy.eyebrow': 'Төлем',
    'buy.nobodyLead': 'Мұны кімге сатып алуға болатыны әзірге жоқ.',
    'buy.nobodyBody':
      'Курсты сатып алу бір оқушыға арналады, сондықтан бір адам көрсетілуі керек: осы тіркелгідегі өзіңіз немесе отбасыңыздағы баланың профилі.',
    'buy.claim': 'Өзім үшін сатып аламын',
    'buy.claimNote': 'Бұл сізді осы тіркелгіде оқушы етеді. Бұл екінші тіркелгі емес.',
    'buy.addChild': 'Оның орнына бала қосу',
    'buy.backCourse': 'Курсқа оралу',
    'buy.subLead': 'Бұл курс бір реттік сатып алу ретінде емес, жазылым ретінде сатылады.',
    'buy.subBody': 'Жазылымдар әзірге осы төлем беті арқылы сатылмайды. Ешқандай ақы алынған жоқ.',
    'buy.ambiguousLead': 'Бұл курстың еліңіз үшін бірнеше бағасы бар.',
    'buy.ambiguousBody':
      'Біз сіздің атыңыздан валюта таңдамаймыз. Бізге хабарласыңыз, дұрысын белгілейміз, содан кейін сатып ала аласыз.',
    'buy.noPriceLead': 'Бұл курстың мына ел үшін бағасы әзірге жоқ: {country}.',
    'buy.noPriceAny': 'Бұл курстың еліңіз үшін бағасы әзірге жоқ.',
    'buy.noPriceBody':
      'Ешқандай ақы алынған жоқ. Бізге хабарласыңыз, еліңізде сатуды ашамыз, содан кейін сатып ала аласыз.',
    'buy.hasAlready':
      'Бұл курс мына оқушыда бұрыннан бар: {name}. Бұл сатып алу басқа оқушыға арналған.',
    'buy.noProviderLead': 'Әзірге ешқандай төлем провайдері қосылмаған.',
    'buy.noProviderBody':
      'Бұл тапсырысты бере аласыз және ол сақталады, бірақ провайдер қосылғанша оны төлеу мүмкін емес. Ешқандай ақы алынбайды және төлем расталғанша курс ашылмайды.',
    'buy.closedLead': 'Төлем әзірге ашылмаған.',
    'buy.closedBody':
      'Бұл платформа қазір курстар үшін төлем қабылдамайды, сондықтан тапсырыс беру мүмкін емес және ешқандай ақы алынған жоқ. Тегін курстарға курс бетінен әлі де қосылуға болады.',
    'buy.notOnSale': 'Бұл курс қазір сізге сатылмайды, сондықтан төлейтін ештеңе жоқ.',
    'buy.payHeading': 'Сіз төлейтін сома',
    'buy.pricedFor': 'Мына елге арналған баға: {country}.',
    'buy.standardPrice': 'Стандартты баға.',
    'buy.oneOff': 'Бір реттік сатып алу, жазылым емес.',
    'buy.accessNote':
      'Қолжетімділік түймені басқанда емес, төлем расталғанда басталады. Екі жағдайда да тапсырыс тапсырыстарыңыз бетінде көрсетіледі.',
    'buy.whoFor': 'Бұл кімге арналған?',
    'buy.choose': 'Оқушыны таңдаңыз',
    'buy.learnerChild': '{name} (бала)',
    'buy.whoNote':
      'Бір сатып алу бір оқушыға арналады. Екі балаға сатып алу үшін екі рет сатып алыңыз.',
    'buy.forOne': 'Бұл сатып алу мына оқушыға арналған: {name}.',
    'buy.codeLabel': 'Жеңілдік коды',
    'buy.checkPrice': 'Бағаны тексеру',
    'buy.checking': 'Тексерілуде…',
    'buy.codeNote':
      'Кодыңыз бар ма? Осы жерге енгізіңіз. Егер ол бұл курсқа қолданылмаса, қандай да бір ақы алынбас бұрын сізге айтылады.',
    'buy.quoteFailed': 'Бұл бағаны есептеу мүмкін болмады. Қайталап көріңіз.',
    'buy.quoteSimple': 'Сіз төлейтін сома: {amount}.',
    'buy.quoteList': 'Жарияланған баға {amount}',
    'buy.quoteOffCode': '{code} коды бойынша жеңілдік {amount}',
    'buy.quoteOff': 'жеңілдік {amount}',
    'buy.quoteTax': 'салық {amount}',
    'buy.quoteFee': 'алым {amount}',
    'buy.quotePay': 'сіз төлейсіз: {amount}.',
    'buy.quoteTaxNote': 'Салық пен алымдар жеңілдіктен кейінгі бағадан есептеледі.',
    'buy.quoteHolds': 'Тапсырыс бергенше ештеңе сақталып қойылмайды.',
    'buy.payWith': 'Төлем тәсілі',
    'buy.phoneLabel': 'Мобильді ақша нөмірі',
    'buy.phoneNote': 'Төлемді мақұлдау сұралатын нөмір.',
    'buy.continue': 'Төлемге өту',
    'buy.starting': 'Басталуда…',
    'buy.noProviderNote': 'Бұл тапсырыс тіркеледі, бірақ оны әзірге төлеу мүмкін емес.',
    'buy.approve':
      'Төлемді телефоныңызда мақұлдаңыз. Төлем расталғаннан кейін курсыңыз ашылады. Бұл біраз уақыт алуы мүмкін.',
    'buy.orderSaved': 'Тапсырысыңыз сақталды.',
    'buy.signedOut': 'Сіз жүйеден шығып кеткенсіз. Қайта кіріп, тағы бір рет көріңіз.',
    'buy.whyClosed':
      'Төлем әзірге ашылмаған, сондықтан тапсырыс берілген жоқ. Ешқандай ақы алынған жоқ.',
    'buy.whyNoCourse': 'Бұл курсты қазір сатып алу мүмкін емес.',
    'buy.whyNoPrice': 'Бұл курс қазір сатылымда жоқ. Тексеру үшін бетті қайта жүктеңіз.',
    'buy.whyOwned':
      'Ол оқушыда бұл курс бұрыннан бар, сондықтан оны қайта сатып алу ештеңе қоспайды.',
    'buy.whyChoose': 'Бұл курс кімге арналғанын таңдаңыз.',
    'buy.whyNotYours': 'Ол оқушы сіздің тіркелгіңізде жоқ. Бетті қайта жүктеп, қайтадан таңдаңыз.',
    'buy.codeUnknown': 'Бұл кодты танымаймыз. Тексеріп, қайталап көріңіз.',
    'buy.codeNotNow': 'Бұл код қазір жұмыс істемейді: ол аяқталған немесе әлі басталмаған.',
    'buy.codeNotHere': 'Бұл код еліңізде қолжетімді емес.',
    'buy.codeNotCourse': 'Бұл код осы курсқа арналмаған.',
    'buy.codeOwn':
      'Бұл өзіңіздің шақыру кодыңыз, сондықтан оны өз сатып алуыңызға қолдануға болмайды. Ол сіз жіберетін досыңызға арналған.',
    'buy.codeNewOnly': 'Бұл код бұрын ештеңе сатып алмаған адамдарға ғана арналған.',
    'buy.codeUsedUp': 'Бұл код толық қолданылып біткен.',
    'buy.codeUsedYou': 'Сіз бұл кодты рұқсат етілген мөлшерде қолданып қойдыңыз.',
    'buy.codeUsedFamily': 'Отбасыңыз бұл кодты рұқсат етілген мөлшерде қолданып қойды.',
    'buy.codeFree':
      'Бұл код курсты толығымен тегін етеді, ал бұл төлем беті оны қабылдай алмайды. Бізге хабарласыңыз, сізді тікелей тіркейміз.',
    'buy.codeCurrency':
      'Бұл код осы курстан басқа валютада, сондықтан оны мұнда қолдануға болмайды.',
    'buy.codeNothing': 'Бұл код осы тапсырыстан ештеңе шегермейді.',
    'buy.whyFree': 'Бұл курс тегін. Оған курс бетінен қосылыңыз.',
    'buy.whyWithdrawal':
      '14 күндік бас тарту құқығы туралы таңдауыңызды тіркеу мүмкін болмады, сондықтан төлем басталған жоқ. Ешқандай ақы алынған жоқ.',
    'buy.whyNoProvider':
      'Әзірге ешқандай төлем провайдері қосылмаған, сондықтан бұл тапсырысты төлеу мүмкін емес.',
    'buy.whyPhone': 'Бұл телефон нөмірі жарамсыз. Тексеріп, қайталап көріңіз.',
    'buy.whyProvider':
      'Төлемді бастау мүмкін болмады. Қайталап көрмес бұрын тапсырыстарыңызды қараңыз.',
    'buy.refused': 'Тапсырыс беру мүмкін болмады. Ешқандай ақы алынған жоқ.',
    'buy.unconfirmed':
      'Тапсырысыңыздың берілген-берілмегенін растай алмадық. Қайталап көрмес бұрын тапсырыстарыңызды қараңыз.',
  },
  az: {
    'buy.crumb': 'Satın al',
    'buy.eyebrow': 'Ödəniş',
    'buy.nobodyLead': 'Bunu kimin üçün almaq olar, hələ belə bir kəs yoxdur.',
    'buy.nobodyBody':
      'Kursun alınması bir öyrənən üçündür, ona görə bir nəfər göstərilməlidir: bu hesabda özünüz və ya ailənizdəki uşağın profili.',
    'buy.claim': 'Özüm üçün alıram',
    'buy.claimNote': 'Bu, sizi bu hesabda öyrənən edir. Bu, ikinci hesab deyil.',
    'buy.addChild': 'Əvəzində uşaq əlavə et',
    'buy.backCourse': 'Kursa qayıt',
    'buy.subLead': 'Bu kurs birdəfəlik alış kimi deyil, abunəlik kimi satılır.',
    'buy.subBody': 'Abunəliklər hələ bu ödəniş səhifəsindən satılmır. Heç bir məbləğ tutulmayıb.',
    'buy.ambiguousLead': 'Bu kursun ölkəniz üçün birdən çox qiyməti var.',
    'buy.ambiguousBody':
      'Sizin adınızdan valyuta seçməyəcəyik. Bizimlə əlaqə saxlayın, düzgününü təyin edək, sonra ala bilərsiniz.',
    'buy.noPriceLead': 'Bu kursun bu ölkə üçün hələ qiyməti yoxdur: {country}.',
    'buy.noPriceAny': 'Bu kursun ölkəniz üçün hələ qiyməti yoxdur.',
    'buy.noPriceBody':
      'Heç bir məbləğ tutulmayıb. Bizimlə əlaqə saxlayın, ölkənizdə satışı açaq, sonra ala bilərsiniz.',
    'buy.hasAlready': 'Bu kurs bu öyrənəndə artıq var: {name}. Bu alış başqa öyrənən üçündür.',
    'buy.noProviderLead': 'Hələ heç bir ödəniş provayderi qoşulmayıb.',
    'buy.noProviderBody':
      'Bu sifarişi verə bilərsiniz və o, yadda saxlanılacaq, lakin provayder qoşulana qədər ödənilə bilməz. Heç bir məbləğ tutulmur və ödəniş təsdiqlənənə qədər kurs açılmır.',
    'buy.closedLead': 'Ödəniş hələ açıq deyil.',
    'buy.closedBody':
      'Bu platforma hazırda kurslar üçün ödəniş qəbul etmir, ona görə sifariş vermək mümkün deyil və heç bir məbləğ tutulmayıb. Pulsuz kurslara kurs səhifəsindən yenə də qoşulmaq olar.',
    'buy.notOnSale': 'Bu kurs hazırda sizə satılmır, ona görə ödəniləcək bir şey yoxdur.',
    'buy.payHeading': 'Ödəyəcəyiniz məbləğ',
    'buy.pricedFor': 'Bu ölkə üçün qiymət: {country}.',
    'buy.standardPrice': 'Standart qiymət.',
    'buy.oneOff': 'Birdəfəlik alış, abunəlik deyil.',
    'buy.accessNote':
      'Giriş düyməni basanda deyil, ödəniş təsdiqlənəndə başlayır. Hər iki halda sifariş sifarişləriniz səhifəsində göstərilir.',
    'buy.whoFor': 'Bu kimin üçündür?',
    'buy.choose': 'Öyrənən seçin',
    'buy.learnerChild': '{name} (uşaq)',
    'buy.whoNote':
      'Bir alış bir öyrənən üçündür. İki uşaq üçün almaq istəyirsinizsə, iki dəfə alın.',
    'buy.forOne': 'Bu alış bu öyrənən üçündür: {name}.',
    'buy.codeLabel': 'Endirim kodu',
    'buy.checkPrice': 'Qiyməti yoxla',
    'buy.checking': 'Yoxlanılır…',
    'buy.codeNote':
      'Kodunuz var? Bura daxil edin. Bu kursa aid deyilsə, hər hansı məbləğ tutulmazdan əvvəl sizə bildiriləcək.',
    'buy.quoteFailed': 'Həmin qiyməti hesablamaq mümkün olmadı. Yenidən cəhd edin.',
    'buy.quoteSimple': 'Ödəyəcəyiniz məbləğ: {amount}.',
    'buy.quoteList': 'Elan olunmuş qiymət {amount}',
    'buy.quoteOffCode': '{code} kodu ilə endirim {amount}',
    'buy.quoteOff': 'endirim {amount}',
    'buy.quoteTax': 'vergi {amount}',
    'buy.quoteFee': 'rüsum {amount}',
    'buy.quotePay': 'ödəyəcəyiniz məbləğ {amount}.',
    'buy.quoteTaxNote': 'Vergi və rüsumlar endirimdən sonrakı qiymətdən hesablanır.',
    'buy.quoteHolds': 'Sifariş verənə qədər heç nə ayrılmır.',
    'buy.payWith': 'Ödəniş üsulu',
    'buy.phoneLabel': 'Mobil pul nömrəsi',
    'buy.phoneNote': 'Ödənişi təsdiqləməsi istəniləcək nömrə.',
    'buy.continue': 'Ödənişə davam et',
    'buy.starting': 'Başlanır…',
    'buy.noProviderNote': 'Bu sifariş qeydə alınacaq, lakin hələ ödənilə bilməz.',
    'buy.approve':
      'Ödənişi telefonunuzda təsdiqləyin. Ödəniş təsdiqlənən kimi kursunuz açılır. Bu, bir az vaxt apara bilər.',
    'buy.orderSaved': 'Sifarişiniz yadda saxlanıldı.',
    'buy.signedOut': 'Hesabdan çıxmısınız. Yenidən daxil olun, sonra bir dəfə də cəhd edin.',
    'buy.whyClosed':
      'Ödəniş hələ açıq deyil, ona görə sifariş verilmədi. Heç bir məbləğ tutulmayıb.',
    'buy.whyNoCourse': 'Bu kursu hazırda almaq mümkün deyil.',
    'buy.whyNoPrice': 'Bu kurs hazırda satışda deyil. Yoxlamaq üçün səhifəni yenidən yükləyin.',
    'buy.whyOwned':
      'Həmin öyrənəndə bu kurs artıq var, ona görə onu yenidən almaq heç nə əlavə etməz.',
    'buy.whyChoose': 'Bu kursun kimin üçün olduğunu seçin.',
    'buy.whyNotYours': 'Həmin öyrənən hesabınızda deyil. Səhifəni yenidən yükləyib təzədən seçin.',
    'buy.codeUnknown': 'Bu kodu tanımırıq. Yoxlayıb yenidən cəhd edin.',
    'buy.codeNotNow': 'Bu kod hazırda qüvvədə deyil: ya bitib, ya da hələ başlamayıb.',
    'buy.codeNotHere': 'Bu kod ölkənizdə əlçatan deyil.',
    'buy.codeNotCourse': 'Bu kod bu kurs üçün deyil.',
    'buy.codeOwn':
      'Bu, sizin öz dəvət kodunuzdur, ona görə öz alışınızda istifadə edilə bilməz. O, göndərdiyiniz dostunuz üçündür.',
    'buy.codeNewOnly': 'Bu kod yalnız əvvəllər heç nə almamış şəxslər üçündür.',
    'buy.codeUsedUp': 'Bu kodun istifadə həddi bitib.',
    'buy.codeUsedYou': 'Siz bu koddan icazə verilən sayda istifadə etmisiniz.',
    'buy.codeUsedFamily': 'Ailəniz bu koddan icazə verilən sayda istifadə edib.',
    'buy.codeFree':
      'Bu kod kursu tamamilə pulsuz edər, bu ödəniş səhifəsi isə bunu qəbul edə bilmir. Bizimlə əlaqə saxlayın, sizi birbaşa qeydiyyata alaq.',
    'buy.codeCurrency':
      'Bu kod bu kursdan fərqli valyutadadır, ona görə burada istifadə edilə bilməz.',
    'buy.codeNothing': 'Bu kod bu sifarişdən heç nə azaltmır.',
    'buy.whyFree': 'Bu kurs pulsuzdur. Ona kurs səhifəsindən qoşulun.',
    'buy.whyWithdrawal':
      '14 günlük imtina hüququ ilə bağlı seçiminizi qeydə almaq mümkün olmadı, ona görə ödəniş başlamadı. Heç bir məbləğ tutulmayıb.',
    'buy.whyNoProvider':
      'Hələ heç bir ödəniş provayderi qoşulmayıb, ona görə bu sifariş ödənilə bilməz.',
    'buy.whyPhone': 'Bu telefon nömrəsi düzgün deyil. Yoxlayıb yenidən cəhd edin.',
    'buy.whyProvider':
      'Ödənişi başlamaq mümkün olmadı. Yenidən cəhd etməzdən əvvəl sifarişlərinizə baxın.',
    'buy.refused': 'Sifariş vermək mümkün olmadı. Heç bir məbləğ tutulmayıb.',
    'buy.unconfirmed':
      'Sifarişinizin verilib-verilmədiyini təsdiqləyə bilmədik. Yenidən cəhd etməzdən əvvəl sifarişlərinizə baxın.',
  },
  tg: {
    'buy.crumb': 'Харидан',
    'buy.eyebrow': 'Пардохт',
    'buy.nobodyLead': 'Ҳанӯз касе нест, ки инро барояш харидан мумкин бошад.',
    'buy.nobodyBody':
      'Хариди курс барои як хонанда аст, бинобар ин бояд як нафар номбар шавад: худи шумо дар ин ҳисоб ё профили кӯдаке дар оилаи шумо.',
    'buy.claim': 'Барои худам мехарам',
    'buy.claimNote': 'Ин шуморо дар ин ҳисоб хонанда мекунад. Ин ҳисоби дуюм нест.',
    'buy.addChild': 'Ба ҷойи он кӯдак илова кардан',
    'buy.backCourse': 'Бозгашт ба курс',
    'buy.subLead': 'Ин курс на ҳамчун хариди якдафъаина, балки ҳамчун обуна фурӯхта мешавад.',
    'buy.subBody':
      'Обунаҳо ҳанӯз аз ин саҳифаи пардохт фурӯхта намешаванд. Ҳеҷ маблағе гирифта нашудааст.',
    'buy.ambiguousLead': 'Ин курс барои кишвари шумо беш аз як нарх дорад.',
    'buy.ambiguousBody':
      'Мо аз номи шумо асъор интихоб намекунем. Бо мо тамос гиред, дурусташро муайян мекунем, сипас метавонед онро харед.',
    'buy.noPriceLead': 'Ин курс барои ин кишвар ҳанӯз нарх надорад: {country}.',
    'buy.noPriceAny': 'Ин курс барои кишвари шумо ҳанӯз нарх надорад.',
    'buy.noPriceBody':
      'Ҳеҷ маблағе гирифта нашудааст. Бо мо тамос гиред, фурӯшро дар кишвари шумо мекушоем, сипас метавонед онро харед.',
    'buy.hasAlready':
      'Ин курс дар ин хонанда аллакай ҳаст: {name}. Ин харид барои хонандаи дигар аст.',
    'buy.noProviderLead': 'Ҳанӯз ягон провайдери пардохт пайваст нашудааст.',
    'buy.noProviderBody':
      'Шумо метавонед ин фармоишро диҳед ва он нигоҳ дошта мешавад, вале то пайваст шудани провайдер онро пардохт кардан мумкин нест. Ҳеҷ маблағе гирифта намешавад ва то тасдиқи пардохт курс кушода намешавад.',
    'buy.closedLead': 'Пардохт ҳанӯз кушода нест.',
    'buy.closedBody':
      'Ин платформа ҳоло барои курсҳо пардохт қабул намекунад, бинобар ин фармоиш додан мумкин нест ва ҳеҷ маблағе гирифта нашудааст. Ба курсҳои ройгон аз саҳифаи курс ҳамоно пайвастан мумкин аст.',
    'buy.notOnSale': 'Ин курс ҳоло ба шумо фурӯхта намешавад, бинобар ин чизе барои пардохт нест.',
    'buy.payHeading': 'Маблағе, ки мепардозед',
    'buy.pricedFor': 'Нарх барои ин кишвар: {country}.',
    'buy.standardPrice': 'Нархи стандартӣ.',
    'buy.oneOff': 'Хариди якдафъаина, на обуна.',
    'buy.accessNote':
      'Дастрасӣ на ҳангоми пахши тугма, балки ҳангоми тасдиқи пардохт оғоз мешавад. Дар ҳар ду ҳолат фармоиш дар саҳифаи фармоишҳои шумо нишон дода мешавад.',
    'buy.whoFor': 'Ин барои кист?',
    'buy.choose': 'Хонандаро интихоб кунед',
    'buy.learnerChild': '{name} (кӯдак)',
    'buy.whoNote': 'Як харид барои як хонанда аст. Барои ду кӯдак харидан, ду маротиба харед.',
    'buy.forOne': 'Ин харид барои ин хонанда аст: {name}.',
    'buy.codeLabel': 'Рамзи тахфиф',
    'buy.checkPrice': 'Санҷидани нарх',
    'buy.checking': 'Санҷида мешавад…',
    'buy.codeNote':
      'Рамз доред? Ин ҷо ворид кунед. Агар он ба ин курс дахл надошта бошад, пеш аз гирифтани ягон маблағ ба шумо гуфта мешавад.',
    'buy.quoteFailed': 'Он нархро ҳисоб кардан муяссар нашуд. Аз нав кӯшиш кунед.',
    'buy.quoteSimple': 'Маблағе, ки мепардозед: {amount}.',
    'buy.quoteList': 'Нархи эълоншуда {amount}',
    'buy.quoteOffCode': 'тахфиф бо рамзи {code}: {amount}',
    'buy.quoteOff': 'тахфиф {amount}',
    'buy.quoteTax': 'андоз {amount}',
    'buy.quoteFee': 'ҳаққи хизмат {amount}',
    'buy.quotePay': 'шумо мепардозед: {amount}.',
    'buy.quoteTaxNote': 'Андоз ва ҳаққи хизмат аз нархи баъди тахфиф ҳисоб карда мешавад.',
    'buy.quoteHolds': 'То фармоиш надиҳед, ҳеҷ чиз банд карда намешавад.',
    'buy.payWith': 'Тарзи пардохт',
    'buy.phoneLabel': 'Рақами пули мобилӣ',
    'buy.phoneNote': 'Рақаме, ки аз он тасдиқи пардохт пурсида мешавад.',
    'buy.continue': 'Гузаштан ба пардохт',
    'buy.starting': 'Оғоз мешавад…',
    'buy.noProviderNote': 'Ин фармоиш сабт мешавад, вале онро ҳанӯз пардохт кардан мумкин нест.',
    'buy.approve':
      'Пардохтро дар телефони худ тасдиқ кунед. Курси шумо пас аз тасдиқи пардохт кушода мешавад. Ин метавонад каме вақт гирад.',
    'buy.orderSaved': 'Фармоиши шумо нигоҳ дошта шуд.',
    'buy.signedOut': 'Шумо аз ҳисоб баромадаед. Аз нав ворид шавед, сипас боз як бор кӯшиш кунед.',
    'buy.whyClosed':
      'Пардохт ҳанӯз кушода нест, бинобар ин фармоиш дода нашуд. Ҳеҷ маблағе гирифта нашудааст.',
    'buy.whyNoCourse': 'Ин курсро ҳоло харидан мумкин нест.',
    'buy.whyNoPrice': 'Ин курс ҳоло дар фурӯш нест. Барои санҷидан саҳифаро аз нав бор кунед.',
    'buy.whyOwned':
      'Он хонанда ин курсро аллакай дорад, бинобар ин аз нав харидани он чизе илова намекунад.',
    'buy.whyChoose': 'Интихоб кунед, ки ин курс барои кист.',
    'buy.whyNotYours':
      'Он хонанда дар ҳисоби шумо нест. Саҳифаро аз нав бор карда, дубора интихоб кунед.',
    'buy.codeUnknown': 'Мо ин рамзро намешиносем. Онро санҷед ва аз нав кӯшиш кунед.',
    'buy.codeNotNow':
      'Ин рамз ҳоло амал намекунад: он ё ба охир расидааст, ё ҳанӯз оғоз нашудааст.',
    'buy.codeNotHere': 'Ин рамз дар кишвари шумо дастрас нест.',
    'buy.codeNotCourse': 'Ин рамз барои ин курс нест.',
    'buy.codeOwn':
      'Ин рамзи даъвати худи шумост, бинобар ин онро дар хариди худатон истифода бурдан мумкин нест. Он барои дӯстест, ки ба ӯ мефиристед.',
    'buy.codeNewOnly': 'Ин рамз танҳо барои касонест, ки пештар чизе нахаридаанд.',
    'buy.codeUsedUp': 'Ин рамз пурра истифода шудааст.',
    'buy.codeUsedYou': 'Шумо ин рамзро ба андозаи иҷозатдодашуда истифода бурдаед.',
    'buy.codeUsedFamily': 'Оилаи шумо ин рамзро ба андозаи иҷозатдодашуда истифода бурдааст.',
    'buy.codeFree':
      'Ин рамз курсро комилан ройгон мекунад, ки ин саҳифаи пардохт онро қабул карда наметавонад. Бо мо тамос гиред, шуморо мустақиман ба қайд мегирем.',
    'buy.codeCurrency':
      'Ин рамз бо асъори дигар аз асъори ин курс аст, бинобар ин онро ин ҷо истифода бурдан мумкин нест.',
    'buy.codeNothing': 'Ин рамз аз ин фармоиш чизе кам намекунад.',
    'buy.whyFree': 'Ин курс ройгон аст. Ба он аз саҳифаи курс пайваст шавед.',
    'buy.whyWithdrawal':
      'Интихоби шумо дар бораи ҳуқуқи даст кашидан дар давоми 14 рӯз сабт нашуд, бинобар ин пардохт оғоз нашуд. Ҳеҷ маблағе гирифта нашудааст.',
    'buy.whyNoProvider':
      'Ҳанӯз ягон провайдери пардохт пайваст нашудааст, бинобар ин ин фармоишро пардохт кардан мумкин нест.',
    'buy.whyPhone': 'Ин рақами телефон дуруст нест. Онро санҷед ва аз нав кӯшиш кунед.',
    'buy.whyProvider':
      'Пардохтро оғоз кардан муяссар нашуд. Пеш аз кӯшиши дубора фармоишҳои худро бинед.',
    'buy.refused': 'Фармоишро додан муяссар нашуд. Ҳеҷ маблағе гирифта нашудааст.',
    'buy.unconfirmed':
      'Мо тасдиқ карда натавонистем, ки фармоиши шумо дода шудааст ё не. Пеш аз кӯшиши дубора фармоишҳои худро бинед.',
  },
  ky: {
    'buy.crumb': 'Сатып алуу',
    'buy.eyebrow': 'Төлөм',
    'buy.nobodyLead': 'Муну кимге сатып алууга боло турган киши азырынча жок.',
    'buy.nobodyBody':
      'Курсту сатып алуу бир окуучу үчүн болот, ошондуктан бир киши көрсөтүлүшү керек: ушул аккаунттагы өзүңүз же үй-бүлөңүздөгү баланын профили.',
    'buy.claim': 'Өзүм үчүн сатып алам',
    'buy.claimNote': 'Бул сизди ушул аккаунтта окуучу кылат. Бул экинчи аккаунт эмес.',
    'buy.addChild': 'Анын ордуна бала кошуу',
    'buy.backCourse': 'Курска кайтуу',
    'buy.subLead': 'Бул курс бир жолку сатып алуу катары эмес, жазылуу катары сатылат.',
    'buy.subBody':
      'Жазылуулар азырынча бул төлөм барагы аркылуу сатылбайт. Эч кандай акча алынган жок.',
    'buy.ambiguousLead': 'Бул курстун өлкөңүз үчүн бирден ашык баасы бар.',
    'buy.ambiguousBody':
      'Биз сиздин атыңыздан валюта тандабайбыз. Биз менен байланышыңыз, туурасын белгилейбиз, андан кийин сатып ала аласыз.',
    'buy.noPriceLead': 'Бул курстун ушул өлкө үчүн азырынча баасы жок: {country}.',
    'buy.noPriceAny': 'Бул курстун өлкөңүз үчүн азырынча баасы жок.',
    'buy.noPriceBody':
      'Эч кандай акча алынган жок. Биз менен байланышыңыз, өлкөңүздө сатууну ачабыз, андан кийин сатып ала аласыз.',
    'buy.hasAlready':
      'Бул курс ушул окуучуда мурунтан эле бар: {name}. Бул сатып алуу башка окуучу үчүн.',
    'buy.noProviderLead': 'Азырынча эч бир төлөм провайдери туташтырылган эмес.',
    'buy.noProviderBody':
      'Бул буйрутманы бере аласыз жана ал сакталат, бирок провайдер туташтырылмайынча аны төлөө мүмкүн эмес. Эч кандай акча алынбайт жана төлөм ырасталмайынча курс ачылбайт.',
    'buy.closedLead': 'Төлөм азырынча ачыла элек.',
    'buy.closedBody':
      'Бул платформа азыр курстар үчүн төлөм кабыл албайт, ошондуктан буйрутма берүү мүмкүн эмес жана эч кандай акча алынган жок. Акысыз курстарга курстун барагынан дагы эле кошулууга болот.',
    'buy.notOnSale': 'Бул курс азыр сизге сатылбайт, ошондуктан төлөй турган эч нерсе жок.',
    'buy.payHeading': 'Сиз төлөй турган сумма',
    'buy.pricedFor': 'Ушул өлкө үчүн баа: {country}.',
    'buy.standardPrice': 'Стандарттык баа.',
    'buy.oneOff': 'Бир жолку сатып алуу, жазылуу эмес.',
    'buy.accessNote':
      'Кирүү мүмкүнчүлүгү баскычты басканда эмес, төлөм ырасталганда башталат. Эки учурда тең буйрутма буйрутмаларыңыз барагында көрсөтүлөт.',
    'buy.whoFor': 'Бул ким үчүн?',
    'buy.choose': 'Окуучуну тандаңыз',
    'buy.learnerChild': '{name} (бала)',
    'buy.whoNote':
      'Бир сатып алуу бир окуучу үчүн. Эки балага сатып алуу үчүн эки жолу сатып алыңыз.',
    'buy.forOne': 'Бул сатып алуу ушул окуучу үчүн: {name}.',
    'buy.codeLabel': 'Арзандатуу коду',
    'buy.checkPrice': 'Бааны текшерүү',
    'buy.checking': 'Текшерилүүдө…',
    'buy.codeNote':
      'Кодуңуз барбы? Ушул жерге киргизиңиз. Эгер ал бул курска тиешелүү болбосо, кандайдыр бир акча алынардан мурун сизге айтылат.',
    'buy.quoteFailed': 'Ал бааны эсептөө мүмкүн болгон жок. Кайра аракет кылыңыз.',
    'buy.quoteSimple': 'Сиз төлөй турган сумма: {amount}.',
    'buy.quoteList': 'Жарыяланган баа {amount}',
    'buy.quoteOffCode': '{code} коду боюнча арзандатуу {amount}',
    'buy.quoteOff': 'арзандатуу {amount}',
    'buy.quoteTax': 'салык {amount}',
    'buy.quoteFee': 'жыйым {amount}',
    'buy.quotePay': 'сиз төлөйсүз: {amount}.',
    'buy.quoteTaxNote': 'Салык жана жыйымдар арзандатуудан кийинки баадан эсептелет.',
    'buy.quoteHolds': 'Буйрутма бермейинче эч нерсе ээлеп коюлбайт.',
    'buy.payWith': 'Төлөм ыкмасы',
    'buy.phoneLabel': 'Мобилдик акча номери',
    'buy.phoneNote': 'Төлөмдү жактыруу суралган номер.',
    'buy.continue': 'Төлөмгө өтүү',
    'buy.starting': 'Башталууда…',
    'buy.noProviderNote': 'Бул буйрутма катталат, бирок аны азырынча төлөө мүмкүн эмес.',
    'buy.approve':
      'Төлөмдү телефонуңузда жактырыңыз. Төлөм ырасталгандан кийин курсуңуз ачылат. Бул бир аз убакыт алышы мүмкүн.',
    'buy.orderSaved': 'Буйрутмаңыз сакталды.',
    'buy.signedOut': 'Сиз аккаунттан чыгып калгансыз. Кайра кирип, дагы бир жолу аракет кылыңыз.',
    'buy.whyClosed':
      'Төлөм азырынча ачыла элек, ошондуктан буйрутма берилген жок. Эч кандай акча алынган жок.',
    'buy.whyNoCourse': 'Бул курсту азыр сатып алуу мүмкүн эмес.',
    'buy.whyNoPrice': 'Бул курс азыр сатыкта жок. Текшерүү үчүн баракты кайра жүктөңүз.',
    'buy.whyOwned':
      'Ал окуучуда бул курс мурунтан эле бар, ошондуктан аны кайра сатып алуу эч нерсе кошпойт.',
    'buy.whyChoose': 'Бул курс ким үчүн экенин тандаңыз.',
    'buy.whyNotYours':
      'Ал окуучу сиздин аккаунтуңузда жок. Баракты кайра жүктөп, кайрадан тандаңыз.',
    'buy.codeUnknown': 'Бул кодду тааныбайбыз. Текшерип, кайра аракет кылыңыз.',
    'buy.codeNotNow': 'Бул код азыр иштебейт: ал аяктаган же азырынча баштала элек.',
    'buy.codeNotHere': 'Бул код өлкөңүздө жеткиликтүү эмес.',
    'buy.codeNotCourse': 'Бул код ушул курс үчүн эмес.',
    'buy.codeOwn':
      'Бул өзүңүздүн чакыруу кодуңуз, ошондуктан аны өз сатып алууңузга колдонууга болбойт. Ал сиз жөнөткөн досуңуз үчүн.',
    'buy.codeNewOnly': 'Бул код мурун эч нерсе сатып албаган адамдар үчүн гана.',
    'buy.codeUsedUp': 'Бул код толугу менен колдонулуп бүткөн.',
    'buy.codeUsedYou': 'Сиз бул кодду уруксат берилген өлчөмдө колдонуп бүттүңүз.',
    'buy.codeUsedFamily': 'Үй-бүлөңүз бул кодду уруксат берилген өлчөмдө колдонуп бүттү.',
    'buy.codeFree':
      'Бул код курсту толугу менен акысыз кылат, ал эми бул төлөм барагы аны кабыл ала албайт. Биз менен байланышыңыз, сизди түздөн-түз каттайбыз.',
    'buy.codeCurrency':
      'Бул код ушул курстан башка валютада, ошондуктан аны бул жерде колдонууга болбойт.',
    'buy.codeNothing': 'Бул код ушул буйрутмадан эч нерсе кемитпейт.',
    'buy.whyFree': 'Бул курс акысыз. Ага курстун барагынан кошулуңуз.',
    'buy.whyWithdrawal':
      '14 күндүк баш тартуу укугу боюнча тандооңузду каттоо мүмкүн болгон жок, ошондуктан төлөм башталган жок. Эч кандай акча алынган жок.',
    'buy.whyNoProvider':
      'Азырынча эч бир төлөм провайдери туташтырылган эмес, ошондуктан бул буйрутманы төлөө мүмкүн эмес.',
    'buy.whyPhone': 'Бул телефон номери жараксыз. Текшерип, кайра аракет кылыңыз.',
    'buy.whyProvider':
      'Төлөмдү баштоо мүмкүн болгон жок. Кайра аракет кылардан мурун буйрутмаларыңызды караңыз.',
    'buy.refused': 'Буйрутма берүү мүмкүн болгон жок. Эч кандай акча алынган жок.',
    'buy.unconfirmed':
      'Буйрутмаңыз берилген-берилбегенин ырастай алган жокпуз. Кайра аракет кылардан мурун буйрутмаларыңызды караңыз.',
  },
  tk: {
    'buy.crumb': 'Satyn almak',
    'buy.eyebrow': 'Töleg',
    'buy.nobodyLead': 'Muny kim üçin satyn alyp boljak adam entek ýok.',
    'buy.nobodyBody':
      'Kursy satyn almak bir okuwçy üçin bolýar, şonuň üçin bir adam görkezilmeli: şu hasapdaky özüňiz ýa-da maşgalaňyzdaky çaganyň profili.',
    'buy.claim': 'Özüm üçin satyn alýaryn',
    'buy.claimNote': 'Bu sizi şu hasapda okuwçy edýär. Bu ikinji hasap däl.',
    'buy.addChild': 'Onuň ýerine çaga goşmak',
    'buy.backCourse': 'Kursa dolanmak',
    'buy.subLead': 'Bu kurs bir gezeklik satyn alyş hökmünde däl-de, abunalyk hökmünde satylýar.',
    'buy.subBody': 'Abunalyklar entek bu töleg sahypasy arkaly satylmaýar. Hiç hili pul alynmady.',
    'buy.ambiguousLead': 'Bu kursuň ýurduňyz üçin birden köp bahasy bar.',
    'buy.ambiguousBody':
      'Biz siziň adyňyzdan walýuta saýlamarys. Biziň bilen habarlaşyň, dogrusyny kesgitläris, şondan soň satyn alyp bilersiňiz.',
    'buy.noPriceLead': 'Bu kursuň şu ýurt üçin entek bahasy ýok: {country}.',
    'buy.noPriceAny': 'Bu kursuň ýurduňyz üçin entek bahasy ýok.',
    'buy.noPriceBody':
      'Hiç hili pul alynmady. Biziň bilen habarlaşyň, ýurduňyzda satuwy açarys, şondan soň satyn alyp bilersiňiz.',
    'buy.hasAlready': 'Bu kurs şu okuwçyda eýýäm bar: {name}. Bu satyn alyş başga okuwçy üçin.',
    'buy.noProviderLead': 'Entek hiç bir töleg üpjün edijisi birikdirilmedi.',
    'buy.noProviderBody':
      'Bu sargydy edip bilersiňiz we ol saklanar, ýöne üpjün ediji birikdirilýänçä ony töläp bolmaýar. Hiç hili pul alynmaýar we töleg tassyklanýança kurs açylmaýar.',
    'buy.closedLead': 'Töleg entek açyk däl.',
    'buy.closedBody':
      'Bu platforma häzir kurslar üçin töleg kabul etmeýär, şonuň üçin sargyt edip bolmaýar we hiç hili pul alynmady. Mugt kurslara kurs sahypasyndan henizem goşulyp bolýar.',
    'buy.notOnSale': 'Bu kurs häzir size satylmaýar, şonuň üçin tölemeli zat ýok.',
    'buy.payHeading': 'Siziň töljek möçberiňiz',
    'buy.pricedFor': 'Şu ýurt üçin baha: {country}.',
    'buy.standardPrice': 'Adaty baha.',
    'buy.oneOff': 'Bir gezeklik satyn alyş, abunalyk däl.',
    'buy.accessNote':
      'Elýeterlilik düwmä basanyňyzda däl-de, töleg tassyklananda başlanýar. Iki ýagdaýda-da sargyt sargytlaryňyz sahypasynda görkezilýär.',
    'buy.whoFor': 'Bu kim üçin?',
    'buy.choose': 'Okuwçyny saýlaň',
    'buy.learnerChild': '{name} (çaga)',
    'buy.whoNote':
      'Bir satyn alyş bir okuwçy üçin. Iki çaga üçin satyn almak üçin iki gezek satyn alyň.',
    'buy.forOne': 'Bu satyn alyş şu okuwçy üçin: {name}.',
    'buy.codeLabel': 'Arzanladyş kody',
    'buy.checkPrice': 'Bahany barlamak',
    'buy.checking': 'Barlanýar…',
    'buy.codeNote':
      'Kodyňyz barmy? Şu ýere giriziň. Eger ol bu kursa degişli bolmasa, haýsydyr bir pul alynmazdan öň size aýdylar.',
    'buy.quoteFailed': 'Şol bahany hasaplap bolmady. Gaýtadan synanyşyň.',
    'buy.quoteSimple': 'Siziň töljek möçberiňiz: {amount}.',
    'buy.quoteList': 'Yglan edilen baha {amount}',
    'buy.quoteOffCode': '{code} kody boýunça arzanladyş {amount}',
    'buy.quoteOff': 'arzanladyş {amount}',
    'buy.quoteTax': 'salgyt {amount}',
    'buy.quoteFee': 'ýygym {amount}',
    'buy.quotePay': 'siz töleýärsiňiz: {amount}.',
    'buy.quoteTaxNote': 'Salgyt we ýygymlar arzanladyşdan soňky bahadan hasaplanýar.',
    'buy.quoteHolds': 'Sargyt edýänçäňiz hiç zat saklanyp goýulmaýar.',
    'buy.payWith': 'Töleg usuly',
    'buy.phoneLabel': 'Mobil pul belgisi',
    'buy.phoneNote': 'Tölegi tassyklamagy soraljak belgi.',
    'buy.continue': 'Tölege geçmek',
    'buy.starting': 'Başlanýar…',
    'buy.noProviderNote': 'Bu sargyt hasaba alnar, ýöne ony entek töläp bolmaýar.',
    'buy.approve':
      'Tölegi telefonyňyzda tassyklaň. Töleg tassyklanandan soň kursuňyz açylýar. Bu biraz wagt alyp biler.',
    'buy.orderSaved': 'Sargydyňyz saklandy.',
    'buy.signedOut': 'Siz hasapdan çykypsyňyz. Gaýtadan giriň, soňra ýene bir gezek synanyşyň.',
    'buy.whyClosed': 'Töleg entek açyk däl, şonuň üçin sargyt edilmedi. Hiç hili pul alynmady.',
    'buy.whyNoCourse': 'Bu kursy häzir satyn alyp bolmaýar.',
    'buy.whyNoPrice': 'Bu kurs häzir satuwda däl. Barlamak üçin sahypany gaýtadan ýükläň.',
    'buy.whyOwned':
      'Şol okuwçyda bu kurs eýýäm bar, şonuň üçin ony gaýtadan satyn almak hiç zat goşmaýar.',
    'buy.whyChoose': 'Bu kursuň kim üçindigini saýlaň.',
    'buy.whyNotYours':
      'Şol okuwçy siziň hasabyňyzda ýok. Sahypany gaýtadan ýükläp, täzeden saýlaň.',
    'buy.codeUnknown': 'Bu kody tanamaýarys. Barlap, gaýtadan synanyşyň.',
    'buy.codeNotNow': 'Bu kod häzir hereket etmeýär: ol tamamlanypdyr ýa-da entek başlanmandyr.',
    'buy.codeNotHere': 'Bu kod ýurduňyzda elýeterli däl.',
    'buy.codeNotCourse': 'Bu kod şu kurs üçin däl.',
    'buy.codeOwn':
      'Bu siziň öz çakylyk kodyňyz, şonuň üçin ony öz satyn alşyňyzda ulanyp bolmaýar. Ol siziň iberýän dostuňyz üçin.',
    'buy.codeNewOnly': 'Bu kod diňe öň hiç zat satyn almadyk adamlar üçin.',
    'buy.codeUsedUp': 'Bu kod doly ulanylyp gutardy.',
    'buy.codeUsedYou': 'Siz bu kody rugsat berlen möçberde ulanyp gutardyňyz.',
    'buy.codeUsedFamily': 'Maşgalaňyz bu kody rugsat berlen möçberde ulanyp gutardy.',
    'buy.codeFree':
      'Bu kod kursy düýbünden mugt edýär, bu töleg sahypasy bolsa ony kabul edip bilmeýär. Biziň bilen habarlaşyň, sizi göni hasaba alarys.',
    'buy.codeCurrency':
      'Bu kod şu kursdan başga walýutada, şonuň üçin ony bu ýerde ulanyp bolmaýar.',
    'buy.codeNothing': 'Bu kod şu sargytdan hiç zat aýyrmaýar.',
    'buy.whyFree': 'Bu kurs mugt. Oňa kurs sahypasyndan goşulyň.',
    'buy.whyWithdrawal':
      '14 günlük ýüz öwürmek hukugy baradaky saýlawyňyzy hasaba alyp bolmady, şonuň üçin töleg başlanmady. Hiç hili pul alynmady.',
    'buy.whyNoProvider':
      'Entek hiç bir töleg üpjün edijisi birikdirilmedi, şonuň üçin bu sargydy töläp bolmaýar.',
    'buy.whyPhone': 'Bu telefon belgisi nädogry. Barlap, gaýtadan synanyşyň.',
    'buy.whyProvider': 'Tölegi başlap bolmady. Gaýtadan synanyşmazdan öň sargytlaryňyza serediň.',
    'buy.refused': 'Sargyt edip bolmady. Hiç hili pul alynmady.',
    'buy.unconfirmed':
      'Sargydyňyzyň edilendigini ýa-da edilmändigini tassyklap bilmedik. Gaýtadan synanyşmazdan öň sargytlaryňyza serediň.',
  },
  ta: {
    'buy.crumb': 'வாங்கு',
    'buy.eyebrow': 'கட்டணம் செலுத்தல்',
    'buy.nobodyLead': 'இதை யாருக்காக வாங்குவது என்று குறிப்பிட இன்னும் யாரும் இல்லை.',
    'buy.nobodyBody':
      'ஒரு பாடநெறி வாங்குதல் ஒரு கற்பவருக்கானது, ஆகவே ஒருவரைக் குறிப்பிட வேண்டும்: இந்தக் கணக்கில் நீங்களே, அல்லது உங்கள் குடும்பத்திலுள்ள ஒரு குழந்தையின் சுயவிவரம்.',
    'buy.claim': 'எனக்காக வாங்குகிறேன்',
    'buy.claimNote': 'இது உங்களை இந்தக் கணக்கில் கற்பவராக்குகிறது. இது இரண்டாவது கணக்கு அல்ல.',
    'buy.addChild': 'அதற்குப் பதிலாக ஒரு குழந்தையைச் சேர்க்கவும்',
    'buy.backCourse': 'பாடநெறிக்குத் திரும்பு',
    'buy.subLead': 'இந்தப் பாடநெறி ஒருமுறை வாங்குதலாக அல்ல, சந்தாவாக விற்கப்படுகிறது.',
    'buy.subBody':
      'இந்தக் கட்டணப் பக்கத்தின் வழியாகச் சந்தாக்கள் இன்னும் விற்கப்படவில்லை. எந்தத் தொகையும் வசூலிக்கப்படவில்லை.',
    'buy.ambiguousLead': 'உங்கள் நாட்டுக்கு இந்தப் பாடநெறிக்கு ஒன்றுக்கு மேற்பட்ட விலைகள் உள்ளன.',
    'buy.ambiguousBody':
      'உங்கள் சார்பாக நாங்கள் நாணயத்தைத் தேர்ந்தெடுக்க மாட்டோம். எங்களைத் தொடர்பு கொள்ளுங்கள், சரியானதை நாங்கள் அமைப்போம், பிறகு நீங்கள் வாங்கலாம்.',
    'buy.noPriceLead': 'இந்த நாட்டுக்கு இந்தப் பாடநெறிக்கு இன்னும் விலை இல்லை: {country}.',
    'buy.noPriceAny': 'உங்கள் நாட்டுக்கு இந்தப் பாடநெறிக்கு இன்னும் விலை இல்லை.',
    'buy.noPriceBody':
      'எந்தத் தொகையும் வசூலிக்கப்படவில்லை. எங்களைத் தொடர்பு கொள்ளுங்கள், உங்கள் நாட்டில் விற்பனையைத் திறப்போம், பிறகு நீங்கள் வாங்கலாம்.',
    'buy.hasAlready':
      'இந்தப் பாடநெறி இந்தக் கற்பவரிடம் ஏற்கெனவே உள்ளது: {name}. இந்த வாங்குதல் வேறொரு கற்பவருக்கானது.',
    'buy.noProviderLead': 'இன்னும் எந்தக் கட்டணச் சேவை வழங்குநரும் இணைக்கப்படவில்லை.',
    'buy.noProviderBody':
      'இந்த ஆர்டரை நீங்கள் செய்யலாம், அது சேமிக்கப்படும்; ஆனால் ஒரு வழங்குநர் இணைக்கப்படும் வரை அதற்குக் கட்டணம் செலுத்த முடியாது. எந்தத் தொகையும் வசூலிக்கப்படாது, கட்டணம் உறுதிப்படுத்தப்படும் வரை பாடநெறி திறக்காது.',
    'buy.closedLead': 'கட்டணம் செலுத்தல் இன்னும் திறக்கப்படவில்லை.',
    'buy.closedBody':
      'இந்தத் தளம் தற்போது பாடநெறிகளுக்குக் கட்டணம் பெறுவதில்லை; ஆகவே ஆர்டர் எதுவும் செய்ய முடியாது, எந்தத் தொகையும் வசூலிக்கப்படவில்லை. இலவசப் பாடநெறிகளில் பாடநெறிப் பக்கத்திலிருந்து இப்போதும் சேரலாம்.',
    'buy.notOnSale':
      'இந்தப் பாடநெறி தற்போது உங்களுக்கு விற்பனையில் இல்லை; ஆகவே செலுத்த வேண்டியது எதுவும் இல்லை.',
    'buy.payHeading': 'நீங்கள் செலுத்தவிருப்பது',
    'buy.pricedFor': 'இந்த நாட்டுக்கான விலை: {country}.',
    'buy.standardPrice': 'வழக்கமான விலை.',
    'buy.oneOff': 'ஒருமுறை வாங்குதல், சந்தா அல்ல.',
    'buy.accessNote':
      'அணுகல் நீங்கள் பொத்தானை அழுத்தும்போது அல்ல, கட்டணம் உறுதிப்படுத்தப்படும்போது தொடங்குகிறது. எப்படியாயினும், ஆர்டர் உங்கள் ஆர்டர்கள் பக்கத்தில் பட்டியலிடப்படும்.',
    'buy.whoFor': 'இது யாருக்கானது?',
    'buy.choose': 'ஒரு கற்பவரைத் தேர்ந்தெடுக்கவும்',
    'buy.learnerChild': '{name} (குழந்தை)',
    'buy.whoNote':
      'ஒரு வாங்குதல் ஒரு கற்பவருக்கானது. இரண்டு குழந்தைகளுக்கு வாங்க, இருமுறை வாங்கவும்.',
    'buy.forOne': 'இந்த வாங்குதல் இந்தக் கற்பவருக்கானது: {name}.',
    'buy.codeLabel': 'தள்ளுபடிக் குறியீடு',
    'buy.checkPrice': 'விலையைச் சரிபார்',
    'buy.checking': 'சரிபார்க்கப்படுகிறது…',
    'buy.codeNote':
      'குறியீடு உள்ளதா? இங்கே உள்ளிடவும். அது இந்தப் பாடநெறிக்குப் பொருந்தாவிட்டால், எந்தத் தொகையும் வசூலிக்கப்படும் முன் உங்களுக்குத் தெரிவிக்கப்படும்.',
    'buy.quoteFailed': 'அந்த விலையைக் கணக்கிட முடியவில்லை. மீண்டும் முயலவும்.',
    'buy.quoteSimple': 'நீங்கள் செலுத்தவிருப்பது: {amount}.',
    'buy.quoteList': 'பட்டியல் விலை {amount}',
    'buy.quoteOffCode': '{code} குறியீட்டின் கழிவு {amount}',
    'buy.quoteOff': 'தள்ளுபடி {amount}',
    'buy.quoteTax': 'வரி {amount}',
    'buy.quoteFee': 'கட்டணம் {amount}',
    'buy.quotePay': 'நீங்கள் செலுத்துவது {amount}.',
    'buy.quoteTaxNote':
      'வரியும் கட்டணங்களும் தள்ளுபடிக்குப் பிந்தைய விலையின் மீது கணக்கிடப்படுகின்றன.',
    'buy.quoteHolds': 'நீங்கள் ஆர்டர் செய்யும் வரை எதுவும் ஒதுக்கி வைக்கப்படாது.',
    'buy.payWith': 'செலுத்தும் முறை',
    'buy.phoneLabel': 'மொபைல் பண எண்',
    'buy.phoneNote': 'கட்டணத்தை அங்கீகரிக்குமாறு கேட்கப்படும் எண்.',
    'buy.continue': 'கட்டணம் செலுத்தத் தொடரவும்',
    'buy.starting': 'தொடங்குகிறது…',
    'buy.noProviderNote':
      'இந்த ஆர்டர் பதிவு செய்யப்படும், ஆனால் இன்னும் அதற்குக் கட்டணம் செலுத்த முடியாது.',
    'buy.approve':
      'உங்கள் தொலைபேசியில் கட்டணத்தை அங்கீகரிக்கவும். கட்டணம் உறுதிப்படுத்தப்பட்டதும் உங்கள் பாடநெறி திறக்கும். இதற்குச் சற்று நேரம் ஆகலாம்.',
    'buy.orderSaved': 'உங்கள் ஆர்டர் சேமிக்கப்பட்டது.',
    'buy.signedOut': 'நீங்கள் வெளியேறிவிட்டீர்கள். மீண்டும் உள்நுழைந்து, இன்னொரு முறை முயலவும்.',
    'buy.whyClosed':
      'கட்டணம் செலுத்தல் இன்னும் திறக்கப்படவில்லை; ஆகவே ஆர்டர் எதுவும் செய்யப்படவில்லை. எந்தத் தொகையும் வசூலிக்கப்படவில்லை.',
    'buy.whyNoCourse': 'இந்தப் பாடநெறியைத் தற்போது வாங்க முடியாது.',
    'buy.whyNoPrice':
      'இந்தப் பாடநெறி தற்போது விற்பனையில் இல்லை. சரிபார்க்கப் பக்கத்தை மீண்டும் ஏற்றவும்.',
    'buy.whyOwned':
      'அந்தக் கற்பவரிடம் இந்தப் பாடநெறி ஏற்கெனவே உள்ளது; ஆகவே மீண்டும் வாங்குவது எதையும் சேர்க்காது.',
    'buy.whyChoose': 'இந்தப் பாடநெறி யாருக்கானது என்பதைத் தேர்ந்தெடுக்கவும்.',
    'buy.whyNotYours':
      'அந்தக் கற்பவர் உங்கள் கணக்கில் இல்லை. பக்கத்தை மீண்டும் ஏற்றி, மறுபடி தேர்ந்தெடுக்கவும்.',
    'buy.codeUnknown': 'அந்தக் குறியீட்டை நாங்கள் அறியவில்லை. சரிபார்த்து மீண்டும் முயலவும்.',
    'buy.codeNotNow':
      'அந்தக் குறியீடு தற்போது நடைமுறையில் இல்லை: அது முடிந்துவிட்டது, அல்லது இன்னும் தொடங்கவில்லை.',
    'buy.codeNotHere': 'அந்தக் குறியீடு உங்கள் நாட்டில் கிடைக்காது.',
    'buy.codeNotCourse': 'அந்தக் குறியீடு இந்தப் பாடநெறிக்கானது அல்ல.',
    'buy.codeOwn':
      'அது உங்கள் சொந்த அழைப்புக் குறியீடு; ஆகவே உங்கள் சொந்த வாங்குதலில் அதைப் பயன்படுத்த முடியாது. அது நீங்கள் அனுப்பும் நண்பருக்கானது.',
    'buy.codeNewOnly': 'அந்தக் குறியீடு இதற்கு முன் எதையும் வாங்காதவர்களுக்கு மட்டுமே.',
    'buy.codeUsedUp': 'அந்தக் குறியீடு முழுவதும் பயன்படுத்தப்பட்டுவிட்டது.',
    'buy.codeUsedYou':
      'அந்தக் குறியீடு அனுமதிக்கும் அளவுக்கு நீங்கள் ஏற்கெனவே பயன்படுத்திவிட்டீர்கள்.',
    'buy.codeUsedFamily':
      'அந்தக் குறியீடு அனுமதிக்கும் அளவுக்கு உங்கள் குடும்பம் ஏற்கெனவே பயன்படுத்திவிட்டது.',
    'buy.codeFree':
      'அந்தக் குறியீடு பாடநெறியை முழுவதும் இலவசமாக்கிவிடும்; இந்தக் கட்டணப் பக்கத்தால் அதை ஏற்க முடியாது. எங்களைத் தொடர்பு கொள்ளுங்கள், உங்களை நேரடியாகச் சேர்த்துவிடுவோம்.',
    'buy.codeCurrency':
      'அந்தக் குறியீடு இந்தப் பாடநெறியிலிருந்து வேறுபட்ட நாணயத்தில் உள்ளது; ஆகவே இங்கே பயன்படுத்த முடியாது.',
    'buy.codeNothing': 'அந்தக் குறியீடு இந்த ஆர்டரிலிருந்து எதையும் குறைக்கவில்லை.',
    'buy.whyFree': 'இந்தப் பாடநெறி இலவசம். பாடநெறிப் பக்கத்திலிருந்து சேரவும்.',
    'buy.whyWithdrawal':
      '14 நாள் விலகல் உரிமை குறித்த உங்கள் தேர்வைப் பதிவு செய்ய முடியவில்லை; ஆகவே கட்டணம் தொடங்கப்படவில்லை. எந்தத் தொகையும் வசூலிக்கப்படவில்லை.',
    'buy.whyNoProvider':
      'இன்னும் எந்தக் கட்டணச் சேவை வழங்குநரும் இணைக்கப்படவில்லை; ஆகவே இந்த ஆர்டருக்குக் கட்டணம் செலுத்த முடியாது.',
    'buy.whyPhone': 'அந்தத் தொலைபேசி எண் செல்லாது. சரிபார்த்து மீண்டும் முயலவும்.',
    'buy.whyProvider':
      'கட்டணத்தைத் தொடங்க முடியவில்லை. மீண்டும் முயலும் முன் உங்கள் ஆர்டர்களைப் பார்க்கவும்.',
    'buy.refused': 'ஆர்டரைச் செய்ய முடியவில்லை. எந்தத் தொகையும் வசூலிக்கப்படவில்லை.',
    'buy.unconfirmed':
      'உங்கள் ஆர்டர் செய்யப்பட்டதா என்பதை எங்களால் உறுதிப்படுத்த முடியவில்லை. மீண்டும் முயலும் முன் உங்கள் ஆர்டர்களைப் பார்க்கவும்.',
  },
  ne: {
    'buy.crumb': 'किन्नुहोस्',
    'buy.eyebrow': 'भुक्तानी',
    'buy.nobodyLead': 'यो कसका लागि किन्ने भन्ने कोही अझै छैन।',
    'buy.nobodyBody':
      'कोर्सको खरिद एक जना सिकारुका लागि हुन्छ, त्यसैले एक जनाको नाम हुनैपर्छ: यो खातामा तपाईं आफैँ, वा तपाईंको परिवारको कुनै बच्चाको प्रोफाइल।',
    'buy.claim': 'आफ्नै लागि किन्छु',
    'buy.claimNote': 'यसले तपाईंलाई यो खातामा सिकारु बनाउँछ। यो दोस्रो खाता होइन।',
    'buy.addChild': 'त्यसको सट्टा बच्चा थप्नुहोस्',
    'buy.backCourse': 'कोर्समा फर्कनुहोस्',
    'buy.subLead': 'यो कोर्स एक पटकको खरिदका रूपमा होइन, सदस्यताका रूपमा बेचिन्छ।',
    'buy.subBody': 'यो भुक्तानी पृष्ठबाट सदस्यताहरू अझै बेचिँदैनन्। कुनै रकम लिइएको छैन।',
    'buy.ambiguousLead': 'तपाईंको देशका लागि यो कोर्सका एकभन्दा बढी मूल्य छन्।',
    'buy.ambiguousBody':
      'हामी तपाईंको तर्फबाट मुद्रा छान्दैनौँ। हामीलाई सम्पर्क गर्नुहोस्, हामी सही मुद्रा तोक्छौँ, त्यसपछि तपाईं किन्न सक्नुहुन्छ।',
    'buy.noPriceLead': 'यो देशका लागि यो कोर्सको मूल्य अझै तोकिएको छैन: {country}।',
    'buy.noPriceAny': 'तपाईंको देशका लागि यो कोर्सको मूल्य अझै तोकिएको छैन।',
    'buy.noPriceBody':
      'कुनै रकम लिइएको छैन। हामीलाई सम्पर्क गर्नुहोस्, हामी तपाईंको देशमा बिक्री खोल्छौँ, त्यसपछि तपाईं किन्न सक्नुहुन्छ।',
    'buy.hasAlready': '{name} सँग यो कोर्स पहिल्यै छ। यो खरिद अर्को सिकारुका लागि हो।',
    'buy.noProviderLead': 'अझै कुनै भुक्तानी प्रदायक जोडिएको छैन।',
    'buy.noProviderBody':
      'तपाईं यो अर्डर गर्न सक्नुहुन्छ र यो सुरक्षित हुनेछ, तर प्रदायक नजोडिएसम्म यसको भुक्तानी गर्न सकिँदैन। कुनै रकम लिइँदैन, र भुक्तानी पुष्टि नभएसम्म कोर्स खुल्दैन।',
    'buy.closedLead': 'भुक्तानी अझै खुलेको छैन।',
    'buy.closedBody':
      'यो प्लेटफर्मले अहिले कोर्सका लागि भुक्तानी लिइरहेको छैन, त्यसैले कुनै अर्डर गर्न सकिँदैन र कुनै रकम लिइएको छैन। निःशुल्क कोर्सहरूमा कोर्सको पृष्ठबाट अझै सहभागी हुन सकिन्छ।',
    'buy.notOnSale': 'यो कोर्स अहिले तपाईंका लागि बिक्रीमा छैन, त्यसैले तिर्नुपर्ने केही छैन।',
    'buy.payHeading': 'तपाईंले तिर्ने रकम',
    'buy.pricedFor': 'यो देशका लागि मूल्य: {country}।',
    'buy.standardPrice': 'मानक मूल्य।',
    'buy.oneOff': 'एक पटकको खरिद, सदस्यता होइन।',
    'buy.accessNote':
      'पहुँच तपाईंले बटन थिच्दा होइन, भुक्तानी पुष्टि भएपछि सुरु हुन्छ। दुवै अवस्थामा अर्डर तपाईंका अर्डरहरूको पृष्ठमा सूचीबद्ध हुन्छ।',
    'buy.whoFor': 'यो कसका लागि हो?',
    'buy.choose': 'सिकारु छान्नुहोस्',
    'buy.learnerChild': '{name} (बच्चा)',
    'buy.whoNote':
      'एउटा खरिद एक जना सिकारुका लागि हुन्छ। दुई बच्चाका लागि किन्न, दुई पटक किन्नुहोस्।',
    'buy.forOne': 'यो खरिद {name} का लागि हो।',
    'buy.codeLabel': 'छुट कोड',
    'buy.checkPrice': 'मूल्य जाँच्नुहोस्',
    'buy.checking': 'जाँच हुँदै छ…',
    'buy.codeNote':
      'कोड छ? यहाँ राख्नुहोस्। यो कोर्समा लागू नभए, कुनै रकम लिनुअघि तपाईंलाई जानकारी दिइनेछ।',
    'buy.quoteFailed': 'त्यो मूल्य हिसाब गर्न सकिएन। फेरि प्रयास गर्नुहोस्।',
    'buy.quoteSimple': 'तपाईंले {amount} तिर्नुहुनेछ।',
    'buy.quoteList': 'सूचीकृत मूल्य {amount}',
    'buy.quoteOffCode': 'कोड {code} बाट {amount} घट्छ',
    'buy.quoteOff': 'छुट {amount}',
    'buy.quoteTax': 'कर {amount}',
    'buy.quoteFee': 'शुल्क {amount}',
    'buy.quotePay': 'तपाईंले {amount} तिर्नुहुन्छ।',
    'buy.quoteTaxNote': 'कर र शुल्क छुटपछिको मूल्यमा हिसाब गरिन्छ।',
    'buy.quoteHolds': 'तपाईंले अर्डर नगरेसम्म केही पनि आरक्षित हुँदैन।',
    'buy.payWith': 'भुक्तानी गर्ने माध्यम',
    'buy.phoneLabel': 'मोबाइल मनी नम्बर',
    'buy.phoneNote': 'भुक्तानी स्वीकृत गर्न भनिने नम्बर।',
    'buy.continue': 'भुक्तानीतर्फ अघि बढ्नुहोस्',
    'buy.starting': 'सुरु हुँदै छ…',
    'buy.noProviderNote': 'यो अर्डर दर्ता हुनेछ तर अहिले यसको भुक्तानी गर्न सकिँदैन।',
    'buy.approve':
      'आफ्नो फोनमा भुक्तानी स्वीकृत गर्नुहोस्। भुक्तानी पुष्टि भएपछि तपाईंको कोर्स खुल्छ। यसमा केही समय लाग्न सक्छ।',
    'buy.orderSaved': 'तपाईंको अर्डर सुरक्षित भयो।',
    'buy.signedOut':
      'तपाईं साइन आउट हुनुभएको छ। फेरि साइन इन गर्नुहोस्, त्यसपछि एक पटक फेरि प्रयास गर्नुहोस्।',
    'buy.whyClosed': 'भुक्तानी अझै खुलेको छैन, त्यसैले कुनै अर्डर गरिएन। कुनै रकम लिइएको छैन।',
    'buy.whyNoCourse': 'यो कोर्स अहिले किन्न सकिँदैन।',
    'buy.whyNoPrice': 'यो कोर्स अहिले बिक्रीमा छैन। जाँच्न पृष्ठ फेरि लोड गर्नुहोस्।',
    'buy.whyOwned': 'त्यो सिकारुसँग यो कोर्स पहिल्यै छ, त्यसैले फेरि किन्दा केही थपिँदैन।',
    'buy.whyChoose': 'यो कोर्स कसका लागि हो, छान्नुहोस्।',
    'buy.whyNotYours': 'त्यो सिकारु तपाईंको खातामा छैन। पृष्ठ फेरि लोड गरी फेरि छान्नुहोस्।',
    'buy.codeUnknown': 'त्यो कोड हामी चिन्दैनौँ। जाँचेर फेरि प्रयास गर्नुहोस्।',
    'buy.codeNotNow': 'त्यो कोड अहिले चालु छैन: यो सकिएको छ, वा अझै सुरु भएको छैन।',
    'buy.codeNotHere': 'त्यो कोड तपाईंको देशमा उपलब्ध छैन।',
    'buy.codeNotCourse': 'त्यो कोड यो कोर्सका लागि होइन।',
    'buy.codeOwn':
      'त्यो तपाईंको आफ्नै निमन्त्रणा कोड हो, त्यसैले तपाईंको आफ्नै खरिदमा प्रयोग गर्न सकिँदैन। यो तपाईंले पठाउने साथीका लागि हो।',
    'buy.codeNewOnly': 'त्यो कोड पहिले केही नकिनेका मानिसहरूका लागि मात्र हो।',
    'buy.codeUsedUp': 'त्यो कोड पूरै प्रयोग भइसकेको छ।',
    'buy.codeUsedYou': 'तपाईंले त्यो कोड अनुमति भएजति पटक प्रयोग गरिसक्नुभएको छ।',
    'buy.codeUsedFamily': 'तपाईंको परिवारले त्यो कोड अनुमति भएजति पटक प्रयोग गरिसकेको छ।',
    'buy.codeFree':
      'त्यो कोडले कोर्स पूरै निःशुल्क बनाउँछ, जुन यो भुक्तानी पृष्ठले लिन सक्दैन। हामीलाई सम्पर्क गर्नुहोस्, हामी तपाईंलाई सिधै भर्ना गर्छौँ।',
    'buy.codeCurrency': 'त्यो कोड यो कोर्सभन्दा फरक मुद्रामा छ, त्यसैले यहाँ प्रयोग गर्न सकिँदैन।',
    'buy.codeNothing': 'त्यो कोडले यो अर्डरबाट केही घटाउँदैन।',
    'buy.whyFree': 'यो कोर्स निःशुल्क छ। कोर्सको पृष्ठबाट सहभागी हुनुहोस्।',
    'buy.whyWithdrawal':
      '१४ दिने फिर्ता लिने अधिकारबारे तपाईंको रोजाइ दर्ता गर्न सकिएन, त्यसैले भुक्तानी सुरु भएन। कुनै रकम लिइएको छैन।',
    'buy.whyNoProvider':
      'अझै कुनै भुक्तानी प्रदायक जोडिएको छैन, त्यसैले यो अर्डरको भुक्तानी गर्न सकिँदैन।',
    'buy.whyPhone': 'त्यो फोन नम्बर मान्य छैन। जाँचेर फेरि प्रयास गर्नुहोस्।',
    'buy.whyProvider': 'भुक्तानी सुरु गर्न सकिएन। फेरि प्रयास गर्नुअघि आफ्ना अर्डरहरू हेर्नुहोस्।',
    'buy.refused': 'अर्डर गर्न सकिएन। कुनै रकम लिइएको छैन।',
    'buy.unconfirmed':
      'तपाईंको अर्डर गरिएको हो कि होइन, हामीले पुष्टि गर्न सकेनौँ। फेरि प्रयास गर्नुअघि आफ्ना अर्डरहरू हेर्नुहोस्।',
  },
};
