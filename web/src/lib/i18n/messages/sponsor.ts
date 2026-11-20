import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Sponsored seats, both sides on one page
 * (`app/account/sponsorship/page.tsx`).
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts`, `reading.ts`, `restore.ts`, `phone.ts`, `merge.ts`,
 * `share.ts` and `refer.ts`: written for the twenty-seven languages with
 * nothing held in `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Neither side is told who the other is, and no sentence guesses.** The
 * person who paid is "whoever paid" or "the giver"; the person learning is
 * "the learner". No language below gives either of them a gender it could
 * avoid.
 *
 * **No sentence says a payment can be made where it cannot.** A pledge is
 * not a payment. Where a pledge cannot be paid on the site,
 * `sponsor.nextPledged` says that staff record what arrives and does not say
 * how to pay. Where it can (2026-11-19: both switches on, and a payment
 * service that collects exactly its amount), `sponsor.nextPay` says nothing
 * is taken until the sponsor pays, and `sponsor.pay`, `payLede`,
 * `payApprove` and `payNot` are the page that takes the payment. `payNot` is
 * one sentence for a pledge that is paid, called off or somebody else's, and
 * must stay one: it must not say which.
 *
 * **`sponsor.zakat` makes no ruling and must not be made to.** It says that
 * whether a seat counts as zakat, sadaqah or neither is a scholar's ruling,
 * that the platform does not make it, and to ask somebody trusted. A
 * translation that drops "or neither", or that reads as the platform
 * answering, is wrong. Zakat and sadaqah are written as each language
 * already writes them.
 *
 * **What is put in comes after a colon wherever a language would have to
 * inflect it**: a name somebody typed (`{name}`), a seat code (`{code}`), an
 * amount as a currency code and Latin digits (`{amount}`), a reference
 * (`{reference}`), and a date and time with its zone said (`{date}`). The
 * page sets each apart from the sentence.
 *
 * **What staff wrote is not translated.** `sponsor.staffNote` introduces it
 * and says whose words they are.
 *
 * **Some sentences on this page are borrowed.** The title is the account
 * page's (`account.sponsorHeading`), with its link to the seats waiting
 * (`account.sponsorWaiting`) and to the reader's learning
 * (`account.selfGo`); the way back is the merge screen's (`merge.back`); a
 * state this page has no word for is the invitation page's "Recorded"
 * (`refer.rwOther`).
 *
 * **Served to the server only.** `sponsor.` is in `SERVER_ONLY_PREFIXES`: the
 * page is drawn on the server and has no script of its own.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const SPONSOR: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'sponsor.lede':
      'دورات دفع ثمنها شخص آخر، ودورات دفعت أنت ثمنها ليتعلّمها غيرك. لا يعرف أيٌّ من الطرفين من هو الآخر.',
    'sponsor.off':
      'كفالة المقاعد متوقفة حاليًا، فلا يمكن طلب مقعد جديد ولا كفالة مقعد جديد. ما طُلب أو كُفل من قبل ما زال معروضًا هنا.',
    'sponsor.askedHeading': 'ما طلبتُه',
    'sponsor.askedUnread': 'تعذّرت قراءة طلباتك الآن. لم يتغير شيء: هذه الصفحة تقرأ فقط.',
    'sponsor.askedNone': 'لم تطلب مقعدًا مكفولًا.',
    'sponsor.askedHow':
      'إن لم تكن دورة في متناولك فيمكنك أن تطلب. الطلب لا يكلّف شيئًا ولا يُلزم أحدًا.',
    'sponsor.askLink': 'اطلب مقعدًا مكفولًا',
    'sponsor.aCourse': 'دورة',
    'sponsor.forWhom': 'لأجل: {name}',
    'sponsor.apSubmitted': 'بانتظار من يقرؤه',
    'sponsor.apApproved': 'تمت الموافقة، وبانتظار كفيل',
    'sponsor.apFunded': 'مكفول: دفع أحدهم ثمن هذا المقعد',
    'sponsor.apDeclined': 'لم تتم الموافقة',
    'sponsor.apWithdrawn': 'سُحب الطلب',
    'sponsor.seat': 'المقعد: {code}',
    'sponsor.staffNote': 'ما كتبه فريق العمل، بكلماتهم:',
    'sponsor.askedOn': 'تاريخ الطلب: {date}',
    'sponsor.decidedOn': 'تاريخ القرار: {date}',
    'sponsor.coveredLead': 'تمت كفالة مقعد طلبتَه.',
    'sponsor.coveredBody':
      'الدورة مفتوحة الآن للمتعلّم. من دفع غير مذكور هنا، وذلك مقصود: من أعطى فأمره بين المعطي وبين الله.',
    'sponsor.gaveHeading': 'ما كفلتُه',
    'sponsor.gaveUnread': 'تعذّرت قراءة كفالاتك الآن. لم يتغير شيء: هذه الصفحة تقرأ فقط.',
    'sponsor.gaveNone': 'لم تكفل مقعدًا.',
    'sponsor.gaveHow': 'كل مقعد منتظر هو دورة طلبها شخص ما.',
    'sponsor.spPledged': 'تعهّد: بانتظار تسجيل الدفعة',
    'sponsor.spPaid': 'مدفوع، والمقعد مفتوح',
    'sponsor.spWithdrawn': 'أُلغي',
    'sponsor.amount': 'المبلغ: {amount}',
    'sponsor.reference': 'المرجع: {reference}',
    'sponsor.nextPledged':
      'لا يُؤخذ شيء تلقائيًا: هذه الصفحة لا تحصّل أي دفعة. يسجّل فريق العمل الدفعة هنا عندما تصل إلى المنصة، ويُفتح المقعد عند تسجيلها.',
    'sponsor.nextPaid': 'تم التسجيل. المقعد مفتوح للمتعلّم، ولم يُخبَر المتعلّم بمن دفع.',
    'sponsor.nextWithdrawn': 'أُلغي هذا التعهّد، فلا يُنتظر عنه أي مال.',
    'sponsor.pledgedOn': 'تاريخ التعهّد: {date}',
    'sponsor.recordedOn': 'تاريخ تسجيل الدفعة: {date}',
    'sponsor.zakat':
      'هل يُعدّ المقعد المكفول زكاة أو صدقة أو لا يُعدّ أيًّا منهما؟ هذا حكم يقوله أهل العلم، وهذه المنصة لا تحكم فيه. اسأل من تثق به قبل أن تعطي.',
    'sponsor.pay': 'ادفع هذا التعهّد',
    'sponsor.payLede':
      'يُفتح المقعد للمتعلّم فور تأكّد الدفع. لا يعرف أيٌّ من الطرفين من هو الآخر.',
    'sponsor.payApprove':
      'وافق على الدفع من هاتفك. يُفتح المقعد للمتعلّم عند تأكّد الدفع. قد يستغرق ذلك لحظات.',
    'sponsor.payNot':
      'لا يمكن دفع هذا التعهّد هنا: إمّا أنه دُفع أو أُلغي، أو أنه ليس من تعهّداتك.',
    'sponsor.nextPay': 'لا يُؤخذ شيء حتى تدفع. يُفتح المقعد عند تأكّد الدفع.',
    'sponsor.plEyebrow': 'الكفالة',
    'sponsor.plTitle': 'ادفع ثمن دورة لغيرك',
    'sponsor.plLede':
      'متعلّم لا يقدر على ثمن دورة يطلبها، وفريق العمل يقرّر. الطلب الموافَق عليه يظهر هنا مقعدًا له رمز وثمن الدورة، ولا يظهر معه اسم أبدًا. أنت تختار مقعدًا، والمتعلّم يحصل على الدورة.',
    'sponsor.plSeeHeading': 'ما تراه وما لا تراه',
    'sponsor.plSeeBody':
      'رمز المقعد، والدورة، وهل هي لطفل أم لبالغ، والثمن في بلدك. لا اسم المتعلّم ولا عمره ولا عائلته، ولا كلمة ممّا كتبه. ما كتبه يقرؤه من يقرّر من فريق العمل، ولا يقرؤه غيرهم.',
    'sponsor.plPayHeading': 'ما تدفعه ومتى',
    'sponsor.plPayBody':
      'ثمن الدورة في بلدك، محسوبًا كما يُحسب عند الشراء. أخذ المقعد تعهّد ولا يُؤخذ به مال. صفحة مقاعدك المكفولة تبيّن كيف يُدفع التعهّد، ويُفتح المقعد للمتعلّم عند تأكّد الدفع.',
    'sponsor.plListHeading': 'مقاعد بانتظار كفيل',
    'sponsor.plSignIn': 'المقاعد تُعرض لمن سجّل الدخول.',
    'sponsor.plUnread': 'تعذّرت قراءة المقاعد. لم يُحصَّل شيء ولم يُؤخذ أي مقعد.',
    'sponsor.plOff': 'كفالة المقاعد متوقفة حاليًا، فلا يمكن أخذ مقعد ولا طلب مقعد.',
    'sponsor.plNone':
      'لا يوجد مقعد بانتظار كفيل الآن. يظهر الطلب هنا بعد أن يوافق عليه فريق العمل.',
    'sponsor.plForChild': 'لطفل',
    'sponsor.plForAdult': 'لبالغ',
    'sponsor.plPriceNote': 'ثمن هذه الدورة في بلدك. المكفول هو المقعد، وليس بطاقة هدية.',
    'sponsor.plNoPrice': 'ليس لهذه الدورة ثمن في بلدك، فلا يمكن أخذ هذا المقعد من هنا.',
    'sponsor.plPriceUnread': 'تعذّرت قراءة ثمن هذا المقعد، فلا يمكن أخذه الآن.',
    'sponsor.plNoteLabel': 'ملاحظة لفريق العمل، إن أردت',
    'sponsor.plTake': 'اكفل هذا المقعد',
    'sponsor.plTaken': 'هذا المقعد لك لتدفع ثمنه: {amount}',
    'sponsor.plTakenNext': 'لم يُؤخذ شيء. صفحة مقاعدك المكفولة تبيّن كيف تدفع.',
    'sponsor.plWhyGone': 'أُخذ هذا المقعد للتوّ، أو لم يعد متاحًا. اختر مقعدًا آخر.',
    'sponsor.plWhyOwn': 'هذا هو المقعد الذي طلبته أنت. لا يمكنك أن تكفل طلبك.',
    'sponsor.tooLong': 'هذا أطول ممّا يتّسع له هذا الحقل.',
    'sponsor.plWhyFailed': 'لم ينجح ذلك. لم يُحصَّل شيء ولم يتغيّر شيء.',
    'sponsor.unconfirmed':
      'لم نتمكّن من التأكّد من أن ذلك سُجّل. راجع مقاعدك المكفولة قبل أن تحاول مجددًا.',
    'sponsor.plAskHeading': 'طلب مقعد',
    'sponsor.rqLede':
      'إن لم تكن دورة في متناولك فاكتب بضع جمل عن الحال. يقرؤها فريق العمل ويجيب في الحالين مع ذكر السبب. الطلب لا يكلّف شيئًا ولا يُلزم أحدًا.',
    'sponsor.rqCourse': 'أي دورة؟',
    'sponsor.rqChoose': 'اختر دورة',
    'sponsor.rqReason': 'ما الحال؟',
    'sponsor.rqReasonNote':
      'يقرؤه من يقرّر من فريق العمل، ولا يقرؤه غيرهم. لا يُعرض على من يدفع ثمن المقعد.',
    'sponsor.rqSubmit': 'اطلب هذا المقعد',
    'sponsor.rqDone':
      'تم الطلب. سيقرؤه فريق العمل، وسيكون الجواب مع سببه في صفحة مقاعدك المكفولة.',
    'sponsor.rqNoLearner': 'لا يوجد متعلّم في هذا الحساب بعد، فليس هناك من يُطلب له.',
    'sponsor.rqNoCourse': 'لا توجد دورة معروضة للبيع الآن، فليس هناك ما يُطلب.',
    'sponsor.rqPrivacy':
      'إذا وُوفق على الطلب رأى الكفيل رمز المقعد، والدورة، وهل هي لطفل أم لبالغ، والثمن. ولا يرى أبدًا اسمك ولا عائلتك ولا ما كتبته هنا.',
    'sponsor.rqWhyReason': 'اكتب جملة عن الحال. هي ما يقرؤه من يقرّر.',
    'sponsor.rqWhyHas': 'هذا المتعلّم لديه هذه الدورة بالفعل، فليس هناك ما يُطلب.',
    'sponsor.rqWhyAsked': 'يوجد طلب مفتوح لهذه الدورة بالفعل.',
  },
  ur: {
    'sponsor.lede':
      'وہ کورس جن کی قیمت کسی اور نے ادا کی، اور وہ کورس جن کی قیمت آپ نے کسی اور کے پڑھنے کے لیے ادا کی۔ دونوں فریق نہیں جانتے کہ دوسرا کون ہے۔',
    'sponsor.off':
      'نشست کی کفالت اس وقت بند ہے، اس لیے نہ کوئی نئی نشست مانگی جا سکتی ہے اور نہ کسی نئی نشست کی کفالت ہو سکتی ہے۔ جو پہلے مانگا گیا یا جس کی کفالت ہوئی وہ اب بھی یہاں دکھایا جاتا ہے۔',
    'sponsor.askedHeading': 'جو میں نے مانگا',
    'sponsor.askedUnread':
      'آپ کی درخواستیں ابھی پڑھی نہ جا سکیں۔ کچھ نہیں بدلا: یہ صفحہ صرف پڑھتا ہے۔',
    'sponsor.askedNone': 'آپ نے کفالت والی کوئی نشست نہیں مانگی۔',
    'sponsor.askedHow':
      'اگر کوئی کورس آپ کی پہنچ سے باہر ہے تو آپ مانگ سکتے ہیں۔ اس پر کچھ خرچ نہیں آتا اور کوئی کسی بات کا پابند نہیں ہوتا۔',
    'sponsor.askLink': 'کفالت والی نشست مانگیں',
    'sponsor.aCourse': 'ایک کورس',
    'sponsor.forWhom': 'کس کے لیے: {name}',
    'sponsor.apSubmitted': 'کسی کے پڑھنے کا انتظار ہے',
    'sponsor.apApproved': 'منظور، اور کفیل کا انتظار ہے',
    'sponsor.apFunded': 'کفالت ہو گئی: کسی نے اس نشست کی قیمت ادا کر دی',
    'sponsor.apDeclined': 'منظور نہیں ہوئی',
    'sponsor.apWithdrawn': 'درخواست واپس لے لی گئی',
    'sponsor.seat': 'نشست: {code}',
    'sponsor.staffNote': 'عملے نے اپنے الفاظ میں جو لکھا:',
    'sponsor.askedOn': 'درخواست کی تاریخ: {date}',
    'sponsor.decidedOn': 'فیصلے کی تاریخ: {date}',
    'sponsor.coveredLead': 'آپ کی مانگی ہوئی ایک نشست کی کفالت ہو گئی ہے۔',
    'sponsor.coveredBody':
      'کورس اب سیکھنے والے کے لیے کھلا ہے۔ جس نے ادائیگی کی اس کا نام یہاں نہیں ہے، اور یہ جان بوجھ کر ہے: کس نے دیا، یہ دینے والے اور اللہ کے درمیان ہے۔',
    'sponsor.gaveHeading': 'جس کی میں نے کفالت کی',
    'sponsor.gaveUnread':
      'آپ کی کفالتیں ابھی پڑھی نہ جا سکیں۔ کچھ نہیں بدلا: یہ صفحہ صرف پڑھتا ہے۔',
    'sponsor.gaveNone': 'آپ نے کسی نشست کی کفالت نہیں کی۔',
    'sponsor.gaveHow': 'ہر منتظر نشست ایک کورس ہے جو کسی نے مانگا ہے۔',
    'sponsor.spPledged': 'وعدہ کیا گیا: ادائیگی کے اندراج کا انتظار ہے',
    'sponsor.spPaid': 'ادا ہو گئی، اور نشست کھلی ہے',
    'sponsor.spWithdrawn': 'منسوخ',
    'sponsor.amount': 'رقم: {amount}',
    'sponsor.reference': 'حوالہ: {reference}',
    'sponsor.nextPledged':
      'کچھ بھی خودکار طور پر نہیں لیا جاتا: یہ صفحہ کوئی ادائیگی وصول نہیں کرتا۔ جب ادائیگی پلیٹ فارم تک پہنچتی ہے تو عملہ اسے یہاں درج کرتا ہے، اور درج ہوتے ہی نشست کھل جاتی ہے۔',
    'sponsor.nextPaid':
      'درج ہو گیا۔ نشست سیکھنے والے کے لیے کھلی ہے، اور سیکھنے والے کو نہیں بتایا گیا کہ کس نے ادا کیا۔',
    'sponsor.nextWithdrawn': 'یہ وعدہ منسوخ کر دیا گیا، اس لیے اس کے لیے کسی رقم کی توقع نہیں۔',
    'sponsor.pledgedOn': 'وعدے کی تاریخ: {date}',
    'sponsor.recordedOn': 'ادائیگی کے اندراج کی تاریخ: {date}',
    'sponsor.zakat':
      'کفالت والی نشست زکوٰۃ شمار ہوتی ہے، صدقہ، یا دونوں میں سے کچھ نہیں، یہ ایک عالم کا فیصلہ ہے، اور یہ پلیٹ فارم یہ فیصلہ نہیں کرتا۔ دینے سے پہلے کسی ایسے شخص سے پوچھیں جس پر آپ کو اعتماد ہو۔',
    'sponsor.pay': 'یہ وعدہ ادا کریں',
    'sponsor.payLede':
      'ادائیگی کی تصدیق ہوتے ہی نشست سیکھنے والے کے لیے کھل جاتی ہے۔ دونوں فریق نہیں جانتے کہ دوسرا کون ہے۔',
    'sponsor.payApprove':
      'اپنے فون پر ادائیگی منظور کریں۔ ادائیگی کی تصدیق ہوتے ہی نشست سیکھنے والے کے لیے کھل جائے گی۔ اس میں کچھ وقت لگ سکتا ہے۔',
    'sponsor.payNot':
      'یہ وعدہ یہاں ادا نہیں کیا جا سکتا: یہ ادا ہو چکا ہے یا منسوخ کر دیا گیا ہے، یا یہ آپ کے وعدوں میں سے نہیں ہے۔',
    'sponsor.nextPay':
      'جب تک آپ ادائیگی نہ کریں کچھ نہیں لیا جاتا۔ ادائیگی کی تصدیق ہوتے ہی نشست کھل جاتی ہے۔',
    'sponsor.plEyebrow': 'کفالت',
    'sponsor.plTitle': 'کسی اور کے کورس کی قیمت ادا کریں',
    'sponsor.plLede':
      'جو سیکھنے والا کسی کورس کی قیمت ادا نہیں کر سکتا وہ اسے مانگتا ہے، اور عملہ فیصلہ کرتا ہے۔ منظور شدہ درخواست یہاں ایک نشست کے طور پر آتی ہے جس کے ساتھ ایک کوڈ اور کورس کی قیمت ہوتی ہے، نام کبھی نہیں۔ آپ نشست چنتے ہیں؛ کورس سیکھنے والے کو ملتا ہے۔',
    'sponsor.plSeeHeading': 'آپ کیا دیکھتے ہیں اور کیا نہیں',
    'sponsor.plSeeBody':
      'نشست کا کوڈ، کورس، یہ کہ وہ بچے کے لیے ہے یا بالغ کے لیے، اور آپ کے ملک میں قیمت۔ سیکھنے والے کا نام، عمر یا خاندان نہیں، اور ان کے لکھے ہوئے کا ایک لفظ بھی نہیں۔ وہ صرف فیصلہ کرنے والا عملہ پڑھتا ہے، کوئی اور نہیں۔',
    'sponsor.plPayHeading': 'آپ کیا ادا کرتے ہیں اور کب',
    'sponsor.plPayBody':
      'آپ کے ملک میں کورس کی قیمت، اسی طرح نکالی گئی جیسے خریداری کے لیے۔ نشست لینا ایک وعدہ ہے اور اس سے کوئی رقم نہیں لی جاتی۔ آپ کا کفالت والی نشستوں کا صفحہ بتاتا ہے کہ وعدہ کیسے ادا ہوتا ہے، اور ادائیگی کی تصدیق ہوتے ہی نشست سیکھنے والے کے لیے کھل جاتی ہے۔',
    'sponsor.plListHeading': 'کفیل کی منتظر نشستیں',
    'sponsor.plSignIn': 'نشستیں انہیں دکھائی جاتی ہیں جو سائن اِن ہیں۔',
    'sponsor.plUnread':
      'نشستیں پڑھی نہیں جا سکیں۔ کچھ وصول نہیں کیا گیا اور کوئی نشست نہیں لی گئی۔',
    'sponsor.plOff':
      'نشست کی کفالت اس وقت بند ہے، اس لیے نہ کوئی نشست لی جا سکتی ہے نہ مانگی جا سکتی ہے۔',
    'sponsor.plNone':
      'اس وقت کوئی نشست کفیل کی منتظر نہیں۔ عملے کی منظوری کے بعد درخواست یہاں آتی ہے۔',
    'sponsor.plForChild': 'بچے کے لیے',
    'sponsor.plForAdult': 'بالغ کے لیے',
    'sponsor.plPriceNote':
      'آپ کے ملک میں اس کورس کی قیمت۔ کفالت نشست کی ہوتی ہے، یہ گفٹ کارڈ نہیں۔',
    'sponsor.plNoPrice':
      'آپ کے ملک میں اس کورس کی کوئی قیمت نہیں، اس لیے یہ نشست یہاں سے نہیں لی جا سکتی۔',
    'sponsor.plPriceUnread': 'اس نشست کی قیمت پڑھی نہیں جا سکی، اس لیے ابھی یہ نہیں لی جا سکتی۔',
    'sponsor.plNoteLabel': 'عملے کے لیے نوٹ، اگر آپ چاہیں',
    'sponsor.plTake': 'اس نشست کی کفالت کریں',
    'sponsor.plTaken': 'یہ نشست اب آپ کے ادا کرنے کے لیے ہے: {amount}',
    'sponsor.plTakenNext':
      'کچھ نہیں لیا گیا۔ آپ کا کفالت والی نشستوں کا صفحہ بتاتا ہے کہ ادائیگی کیسے کرنی ہے۔',
    'sponsor.plWhyGone': 'یہ نشست ابھی ابھی لے لی گئی ہے، یا اب کھلی نہیں۔ کوئی اور چنیں۔',
    'sponsor.plWhyOwn':
      'یہ وہی نشست ہے جو آپ نے مانگی تھی۔ آپ اپنی درخواست کی کفالت نہیں کر سکتے۔',
    'sponsor.tooLong': 'یہ اس خانے کی گنجائش سے زیادہ لمبا ہے۔',
    'sponsor.plWhyFailed': 'یہ نہیں ہو سکا۔ نہ کچھ وصول کیا گیا اور نہ کچھ بدلا۔',
    'sponsor.unconfirmed':
      'ہم تصدیق نہیں کر سکے کہ یہ درج ہوا یا نہیں۔ دوبارہ کوشش سے پہلے اپنی کفالت والی نشستیں دیکھ لیں۔',
    'sponsor.plAskHeading': 'نشست مانگنا',
    'sponsor.rqLede':
      'اگر کوئی کورس آپ کی پہنچ سے باہر ہے تو صورتِ حال کے بارے میں چند جملے لکھیں۔ عملہ اسے پڑھتا ہے اور ہر صورت میں وجہ کے ساتھ جواب دیتا ہے۔ مانگنے پر کچھ خرچ نہیں آتا اور کوئی کسی بات کا پابند نہیں ہوتا۔',
    'sponsor.rqCourse': 'کون سا کورس؟',
    'sponsor.rqChoose': 'کورس چنیں',
    'sponsor.rqReason': 'صورتِ حال کیا ہے؟',
    'sponsor.rqReasonNote':
      'اسے صرف فیصلہ کرنے والا عملہ پڑھتا ہے، کوئی اور نہیں۔ نشست کی قیمت ادا کرنے والے کو نہیں دکھایا جاتا۔',
    'sponsor.rqSubmit': 'یہ نشست مانگیں',
    'sponsor.rqDone':
      'مانگ لیا گیا۔ عملہ اسے پڑھے گا، اور جواب اپنی وجہ کے ساتھ آپ کے کفالت والی نشستوں کے صفحے پر ہوگا۔',
    'sponsor.rqNoLearner':
      'اس اکاؤنٹ پر ابھی کوئی سیکھنے والا نہیں، اس لیے کسی کے لیے مانگا نہیں جا سکتا۔',
    'sponsor.rqNoCourse': 'اس وقت کوئی کورس فروخت پر نہیں، اس لیے مانگنے کو کچھ نہیں۔',
    'sponsor.rqPrivacy':
      'اگر درخواست منظور ہو جائے تو کفیل کو نشست کا کوڈ، کورس، یہ کہ وہ بچے کے لیے ہے یا بالغ کے لیے، اور قیمت دکھائی دیتی ہے۔ آپ کا نام، آپ کا خاندان یا جو آپ نے یہاں لکھا وہ کبھی نہیں۔',
    'sponsor.rqWhyReason': 'صورتِ حال کے بارے میں ایک جملہ لکھیں۔ فیصلہ کرنے والا یہی پڑھتا ہے۔',
    'sponsor.rqWhyHas': 'اس سیکھنے والے کے پاس یہ کورس پہلے سے ہے، اس لیے مانگنے کو کچھ نہیں۔',
    'sponsor.rqWhyAsked': 'اس کورس کے لیے ایک درخواست پہلے سے کھلی ہے۔',
  },
  fa: {
    'sponsor.lede':
      'دوره‌هایی که کس دیگری هزینه‌شان را پرداخته، و دوره‌هایی که شما هزینه‌شان را پرداخته‌اید تا کس دیگری بیاموزد. هیچ‌یک از دو طرف نمی‌فهمد دیگری کیست.',
    'sponsor.off':
      'حمایت از جایگاه اکنون خاموش است، پس نه می‌توان جایگاه تازه‌ای درخواست کرد و نه از جایگاه تازه‌ای حمایت کرد. آنچه پیش‌تر درخواست یا حمایت شده هنوز اینجا نشان داده می‌شود.',
    'sponsor.askedHeading': 'آنچه درخواست کرده‌ام',
    'sponsor.askedUnread':
      'درخواست‌های شما اکنون خوانده نشد. چیزی تغییر نکرده است: این صفحه فقط می‌خواند.',
    'sponsor.askedNone': 'شما جایگاه حمایت‌شده‌ای درخواست نکرده‌اید.',
    'sponsor.askedHow':
      'اگر دوره‌ای از توان شما بیرون است، می‌توانید درخواست کنید. هزینه‌ای ندارد و کسی را به چیزی ملزم نمی‌کند.',
    'sponsor.askLink': 'درخواست جایگاه حمایت‌شده',
    'sponsor.aCourse': 'یک دوره',
    'sponsor.forWhom': 'برای: {name}',
    'sponsor.apSubmitted': 'در انتظار اینکه کسی آن را بخواند',
    'sponsor.apApproved': 'پذیرفته شد، و در انتظار حامی است',
    'sponsor.apFunded': 'تأمین شد: کسی هزینهٔ این جایگاه را پرداخت',
    'sponsor.apDeclined': 'پذیرفته نشد',
    'sponsor.apWithdrawn': 'درخواست پس گرفته شد',
    'sponsor.seat': 'جایگاه: {code}',
    'sponsor.staffNote': 'آنچه کارکنان نوشته‌اند، به واژه‌های خودشان:',
    'sponsor.askedOn': 'تاریخ درخواست: {date}',
    'sponsor.decidedOn': 'تاریخ تصمیم: {date}',
    'sponsor.coveredLead': 'جایگاهی که درخواست کرده بودید تأمین شده است.',
    'sponsor.coveredBody':
      'دوره اکنون برای یادگیرنده باز است. نام کسی که پرداخته اینجا نیامده، و این عمدی است: اینکه چه کسی بخشیده، میان بخشنده و خداست.',
    'sponsor.gaveHeading': 'آنچه حمایت کرده‌ام',
    'sponsor.gaveUnread':
      'حمایت‌های شما اکنون خوانده نشد. چیزی تغییر نکرده است: این صفحه فقط می‌خواند.',
    'sponsor.gaveNone': 'شما از جایگاهی حمایت نکرده‌اید.',
    'sponsor.gaveHow': 'هر جایگاهِ در انتظار، دوره‌ای است که کسی درخواست کرده است.',
    'sponsor.spPledged': 'تعهد شده: در انتظار ثبت پرداخت',
    'sponsor.spPaid': 'پرداخت شد، و جایگاه باز است',
    'sponsor.spWithdrawn': 'لغو شد',
    'sponsor.amount': 'مبلغ: {amount}',
    'sponsor.reference': 'شمارهٔ مرجع: {reference}',
    'sponsor.nextPledged':
      'چیزی خودکار برداشت نمی‌شود: این صفحه هیچ پرداختی نمی‌گیرد. کارکنان پرداخت را وقتی به سکو برسد اینجا ثبت می‌کنند، و با ثبت آن جایگاه باز می‌شود.',
    'sponsor.nextPaid':
      'ثبت شد. جایگاه برای یادگیرنده باز است، و به یادگیرنده گفته نشده چه کسی پرداخته است.',
    'sponsor.nextWithdrawn': 'این تعهد لغو شد، پس پولی برای آن انتظار نمی‌رود.',
    'sponsor.pledgedOn': 'تاریخ تعهد: {date}',
    'sponsor.recordedOn': 'تاریخ ثبت پرداخت: {date}',
    'sponsor.zakat':
      'اینکه جایگاه حمایت‌شده زکات به شمار می‌آید، صدقه، یا هیچ‌کدام، حکمی است که عالِم دین می‌دهد، و این سکو چنین حکمی نمی‌دهد. پیش از بخشیدن از کسی که به او اعتماد دارید بپرسید.',
    'sponsor.pay': 'پرداخت این تعهد',
    'sponsor.payLede':
      'جایگاه به‌محض تأیید پرداخت برای یادگیرنده باز می‌شود. هیچ‌یک از دو طرف نمی‌فهمد دیگری کیست.',
    'sponsor.payApprove':
      'پرداخت را در تلفن خود تأیید کنید. جایگاه با تأیید پرداخت برای یادگیرنده باز می‌شود. ممکن است کمی طول بکشد.',
    'sponsor.payNot':
      'این تعهد را نمی‌توان اینجا پرداخت: یا پرداخت شده یا لغو شده است، یا از تعهدهای شما نیست.',
    'sponsor.nextPay':
      'تا وقتی پرداخت نکنید چیزی برداشت نمی‌شود. جایگاه با تأیید پرداخت باز می‌شود.',
    'sponsor.plEyebrow': 'حمایت',
    'sponsor.plTitle': 'هزینهٔ دورهٔ کس دیگری را بپردازید',
    'sponsor.plLede':
      'یادگیرنده‌ای که توان پرداخت دوره‌ای را ندارد آن را درخواست می‌کند و کارکنان تصمیم می‌گیرند. درخواستِ پذیرفته‌شده اینجا به شکل جایگاهی با یک کد و قیمت دوره می‌آید و هرگز نامی همراهش نیست. شما جایگاهی را برمی‌گزینید؛ دوره به یادگیرنده می‌رسد.',
    'sponsor.plSeeHeading': 'آنچه می‌بینید و آنچه نمی‌بینید',
    'sponsor.plSeeBody':
      'کد جایگاه، دوره، اینکه برای کودک است یا بزرگسال، و قیمت در کشور شما. نه نام یادگیرنده، نه سن و نه خانواده‌اش، و نه کلمه‌ای از آنچه نوشته است. آن را فقط کارکنانی که تصمیم می‌گیرند می‌خوانند و هیچ‌کس دیگر.',
    'sponsor.plPayHeading': 'چه می‌پردازید و چه زمانی',
    'sponsor.plPayBody':
      'قیمت دوره در کشور شما، همان‌گونه که برای خرید حساب می‌شود. برداشتن جایگاه یک تعهد است و پولی با آن برداشت نمی‌شود. صفحهٔ جایگاه‌های حمایت‌شدهٔ شما می‌گوید تعهد چگونه پرداخت می‌شود، و جایگاه با تأیید پرداخت برای یادگیرنده باز می‌شود.',
    'sponsor.plListHeading': 'جایگاه‌های در انتظار حامی',
    'sponsor.plSignIn': 'جایگاه‌ها به کسانی نشان داده می‌شود که وارد شده‌اند.',
    'sponsor.plUnread':
      'جایگاه‌ها خوانده نشد. چیزی برداشت نشده و هیچ جایگاهی برداشته نشده است.',
    'sponsor.plOff':
      'حمایت از جایگاه در حال حاضر خاموش است؛ پس نه می‌توان جایگاهی برداشت و نه درخواست کرد.',
    'sponsor.plNone':
      'اکنون هیچ جایگاهی در انتظار حامی نیست. درخواست پس از پذیرش کارکنان اینجا می‌آید.',
    'sponsor.plForChild': 'برای کودک',
    'sponsor.plForAdult': 'برای بزرگسال',
    'sponsor.plPriceNote':
      'قیمت این دوره در کشور شما. آنچه حمایت می‌شود جایگاه است، نه کارت هدیه.',
    'sponsor.plNoPrice':
      'این دوره در کشور شما قیمتی ندارد، پس این جایگاه را از اینجا نمی‌توان برداشت.',
    'sponsor.plPriceUnread': 'قیمت این جایگاه خوانده نشد، پس فعلاً نمی‌توان آن را برداشت.',
    'sponsor.plNoteLabel': 'یادداشتی برای کارکنان، اگر بخواهید',
    'sponsor.plTake': 'از این جایگاه حمایت کنید',
    'sponsor.plTaken': 'این جایگاه اکنون برای پرداخت از آنِ شماست: {amount}',
    'sponsor.plTakenNext':
      'چیزی برداشت نشده است. صفحهٔ جایگاه‌های حمایت‌شدهٔ شما می‌گوید چگونه بپردازید.',
    'sponsor.plWhyGone':
      'این جایگاه همین حالا برداشته شد، یا دیگر باز نیست. جایگاه دیگری برگزینید.',
    'sponsor.plWhyOwn':
      'این همان جایگاهی است که خودتان درخواست کرده‌اید. نمی‌توانید از درخواست خودتان حمایت کنید.',
    'sponsor.tooLong': 'این از گنجایش این کادر بلندتر است.',
    'sponsor.plWhyFailed': 'انجام نشد. نه چیزی برداشت شد و نه چیزی تغییر کرد.',
    'sponsor.unconfirmed':
      'نتوانستیم تأیید کنیم که ثبت شده است یا نه. پیش از تلاش دوباره، جایگاه‌های حمایت‌شدهٔ خود را ببینید.',
    'sponsor.plAskHeading': 'درخواست جایگاه',
    'sponsor.rqLede':
      'اگر دوره‌ای از توان شما بیرون است، چند جمله دربارهٔ وضعیت بنویسید. کارکنان آن را می‌خوانند و در هر دو حالت با ذکر دلیل پاسخ می‌دهند. درخواست هزینه‌ای ندارد و کسی را به چیزی ملزم نمی‌کند.',
    'sponsor.rqCourse': 'کدام دوره؟',
    'sponsor.rqChoose': 'دوره‌ای برگزینید',
    'sponsor.rqReason': 'وضعیت چیست؟',
    'sponsor.rqReasonNote':
      'فقط کارکنانی که تصمیم می‌گیرند آن را می‌خوانند و هیچ‌کس دیگر. به کسی که هزینهٔ جایگاه را می‌پردازد نشان داده نمی‌شود.',
    'sponsor.rqSubmit': 'این جایگاه را درخواست کنید',
    'sponsor.rqDone':
      'درخواست ثبت شد. کارکنان آن را می‌خوانند و پاسخ، همراه با دلیلش، در صفحهٔ جایگاه‌های حمایت‌شدهٔ شما خواهد بود.',
    'sponsor.rqNoLearner': 'هنوز یادگیرنده‌ای در این حساب نیست، پس کسی نیست که برایش درخواست شود.',
    'sponsor.rqNoCourse': 'در حال حاضر دوره‌ای برای فروش نیست، پس چیزی برای درخواست نیست.',
    'sponsor.rqPrivacy':
      'اگر درخواست پذیرفته شود، حامی کد جایگاه، دوره، اینکه برای کودک است یا بزرگسال، و قیمت را می‌بیند. هرگز نام شما، خانوادهٔ شما یا آنچه اینجا نوشته‌اید را نمی‌بیند.',
    'sponsor.rqWhyReason':
      'جمله‌ای دربارهٔ وضعیت بنویسید. این همان چیزی است که تصمیم‌گیرنده می‌خواند.',
    'sponsor.rqWhyHas': 'این یادگیرنده از پیش این دوره را دارد، پس چیزی برای درخواست نیست.',
    'sponsor.rqWhyAsked': 'برای این دوره از پیش یک درخواست باز هست.',
  },
  'fa-af': {
    'sponsor.lede':
      'کورس‌هایی که کس دیگری پول‌شان را پرداخته، و کورس‌هایی که شما پول‌شان را پرداخته‌اید تا کس دیگری بیاموزد. هیچ یک از دو طرف نمی‌داند دیگری کیست.',
    'sponsor.off':
      'حمایت از چوکی فعلاً خاموش است، پس نه می‌توان چوکی تازه‌ای خواست و نه از چوکی تازه‌ای حمایت کرد. آنچه پیش‌تر خواسته یا حمایت شده هنوز اینجا نشان داده می‌شود.',
    'sponsor.askedHeading': 'آنچه خواسته‌ام',
    'sponsor.askedUnread':
      'درخواست‌های شما فعلاً خوانده نشد. چیزی تغییر نکرده است: این صفحه فقط می‌خواند.',
    'sponsor.askedNone': 'شما چوکی حمایت‌شده‌ای نخواسته‌اید.',
    'sponsor.askedHow':
      'اگر کورسی از توان شما بیرون است، می‌توانید بخواهید. مصرفی ندارد و کسی را به چیزی مکلف نمی‌سازد.',
    'sponsor.askLink': 'چوکی حمایت‌شده بخواهید',
    'sponsor.aCourse': 'یک کورس',
    'sponsor.forWhom': 'برای: {name}',
    'sponsor.apSubmitted': 'در انتظار اینکه کسی آن را بخواند',
    'sponsor.apApproved': 'منظور شد، و در انتظار حامی است',
    'sponsor.apFunded': 'تأمین شد: کسی پول این چوکی را پرداخت',
    'sponsor.apDeclined': 'منظور نشد',
    'sponsor.apWithdrawn': 'درخواست پس گرفته شد',
    'sponsor.seat': 'چوکی: {code}',
    'sponsor.staffNote': 'آنچه کارمندان نوشته‌اند، به کلمات خودشان:',
    'sponsor.askedOn': 'تاریخ درخواست: {date}',
    'sponsor.decidedOn': 'تاریخ تصمیم: {date}',
    'sponsor.coveredLead': 'چوکی‌ای که خواسته بودید تأمین شده است.',
    'sponsor.coveredBody':
      'کورس حالا برای شاگرد باز است. نام کسی که پرداخته اینجا نیامده، و این قصدی است: اینکه چه کسی بخشیده، میان بخشنده و خداوند است.',
    'sponsor.gaveHeading': 'آنچه حمایت کرده‌ام',
    'sponsor.gaveUnread':
      'حمایت‌های شما فعلاً خوانده نشد. چیزی تغییر نکرده است: این صفحه فقط می‌خواند.',
    'sponsor.gaveNone': 'شما از چوکی‌ای حمایت نکرده‌اید.',
    'sponsor.gaveHow': 'هر چوکیِ در انتظار، کورسی است که کسی خواسته است.',
    'sponsor.spPledged': 'تعهد شده: در انتظار ثبت پرداخت',
    'sponsor.spPaid': 'پرداخت شد، و چوکی باز است',
    'sponsor.spWithdrawn': 'لغو شد',
    'sponsor.amount': 'مبلغ: {amount}',
    'sponsor.reference': 'شمارهٔ مرجع: {reference}',
    'sponsor.nextPledged':
      'چیزی خودکار گرفته نمی‌شود: این صفحه هیچ پرداختی نمی‌گیرد. کارمندان پرداخت را وقتی به پلتفرم برسد اینجا ثبت می‌کنند، و با ثبت آن چوکی باز می‌شود.',
    'sponsor.nextPaid': 'ثبت شد. چوکی برای شاگرد باز است، و به شاگرد گفته نشده چه کسی پرداخته است.',
    'sponsor.nextWithdrawn': 'این تعهد لغو شد، پس پولی برای آن انتظار نمی‌رود.',
    'sponsor.pledgedOn': 'تاریخ تعهد: {date}',
    'sponsor.recordedOn': 'تاریخ ثبت پرداخت: {date}',
    'sponsor.zakat':
      'اینکه چوکی حمایت‌شده زکات شمرده می‌شود، صدقه، یا هیچ‌کدام، حکمی است که عالِم دین می‌دهد، و این پلتفرم چنین حکمی نمی‌دهد. پیش از بخشیدن از کسی که به او اعتماد دارید بپرسید.',
    'sponsor.pay': 'پرداخت این تعهد',
    'sponsor.payLede':
      'چوکی به محض تأیید پرداخت برای شاگرد باز می‌شود. هیچ یک از دو طرف نمی‌داند دیگری کیست.',
    'sponsor.payApprove':
      'پرداخت را در تلفون خود تأیید کنید. چوکی با تأیید پرداخت برای شاگرد باز می‌شود. شاید کمی وقت بگیرد.',
    'sponsor.payNot':
      'این تعهد را نمی‌توان اینجا پرداخت: یا پرداخت شده یا لغو شده است، یا از تعهدهای شما نیست.',
    'sponsor.nextPay':
      'تا وقتی پرداخت نکنید چیزی گرفته نمی‌شود. چوکی با تأیید پرداخت باز می‌شود.',
    'sponsor.plEyebrow': 'حمایت',
    'sponsor.plTitle': 'پول کورس کس دیگری را بپردازید',
    'sponsor.plLede':
      'شاگردی که توان پرداخت کورسی را ندارد آن را می‌خواهد و کارمندان تصمیم می‌گیرند. درخواستِ منظورشده اینجا به شکل چوکی‌ای با یک کد و قیمت کورس می‌آید و هرگز نامی همراهش نیست. شما چوکی را انتخاب می‌کنید؛ کورس به شاگرد می‌رسد.',
    'sponsor.plSeeHeading': 'آنچه می‌بینید و آنچه نمی‌بینید',
    'sponsor.plSeeBody':
      'کد چوکی، کورس، اینکه برای طفل است یا بزرگسال، و قیمت در کشور شما. نه نام شاگرد، نه سن و نه فامیلش، و نه کلمه‌ای از آنچه نوشته است. آن را تنها کارمندانی که تصمیم می‌گیرند می‌خوانند و هیچ کس دیگر.',
    'sponsor.plPayHeading': 'چه می‌پردازید و چه وقت',
    'sponsor.plPayBody':
      'قیمت کورس در کشور شما، همان طور که برای خرید حساب می‌شود. گرفتن چوکی یک تعهد است و پولی با آن گرفته نمی‌شود. صفحهٔ چوکی‌های حمایت‌شدهٔ شما می‌گوید تعهد چگونه پرداخت می‌شود، و چوکی با تأیید پرداخت برای شاگرد باز می‌شود.',
    'sponsor.plListHeading': 'چوکی‌های در انتظار حامی',
    'sponsor.plSignIn': 'چوکی‌ها به کسانی نشان داده می‌شود که داخل شده‌اند.',
    'sponsor.plUnread': 'چوکی‌ها خوانده نشد. چیزی گرفته نشده و هیچ چوکی گرفته نشده است.',
    'sponsor.plOff': 'حمایت از چوکی فعلاً خاموش است؛ پس نه می‌توان چوکی گرفت و نه خواست.',
    'sponsor.plNone':
      'حالا هیچ چوکی در انتظار حامی نیست. درخواست پس از منظوری کارمندان اینجا می‌آید.',
    'sponsor.plForChild': 'برای طفل',
    'sponsor.plForAdult': 'برای بزرگسال',
    'sponsor.plPriceNote': 'قیمت این کورس در کشور شما. آنچه حمایت می‌شود چوکی است، نه کارت تحفه.',
    'sponsor.plNoPrice':
      'این کورس در کشور شما قیمتی ندارد، پس این چوکی را از اینجا نمی‌توان گرفت.',
    'sponsor.plPriceUnread': 'قیمت این چوکی خوانده نشد، پس فعلاً نمی‌توان آن را گرفت.',
    'sponsor.plNoteLabel': 'یادداشتی برای کارمندان، اگر بخواهید',
    'sponsor.plTake': 'از این چوکی حمایت کنید',
    'sponsor.plTaken': 'این چوکی حالا برای پرداخت از شماست: {amount}',
    'sponsor.plTakenNext':
      'چیزی گرفته نشده است. صفحهٔ چوکی‌های حمایت‌شدهٔ شما می‌گوید چگونه بپردازید.',
    'sponsor.plWhyGone':
      'این چوکی همین حالا گرفته شد، یا دیگر باز نیست. چوکی دیگری انتخاب کنید.',
    'sponsor.plWhyOwn':
      'این همان چوکی است که خودتان خواسته‌اید. نمی‌توانید از درخواست خودتان حمایت کنید.',
    'sponsor.tooLong': 'این از گنجایش این خانه درازتر است.',
    'sponsor.plWhyFailed': 'نشد. نه چیزی گرفته شد و نه چیزی تغییر کرد.',
    'sponsor.unconfirmed':
      'نتوانستیم تأیید کنیم که ثبت شده است یا نه. پیش از کوشش دوباره، چوکی‌های حمایت‌شدهٔ خود را ببینید.',
    'sponsor.plAskHeading': 'خواستن چوکی',
    'sponsor.rqLede':
      'اگر کورسی از توان شما بیرون است، چند جمله دربارهٔ وضعیت بنویسید. کارمندان آن را می‌خوانند و در هر دو حالت با ذکر دلیل جواب می‌دهند. خواستن مصرفی ندارد و کسی را به چیزی مکلف نمی‌سازد.',
    'sponsor.rqCourse': 'کدام کورس؟',
    'sponsor.rqChoose': 'کورسی را انتخاب کنید',
    'sponsor.rqReason': 'وضعیت چیست؟',
    'sponsor.rqReasonNote':
      'تنها کارمندانی که تصمیم می‌گیرند آن را می‌خوانند و هیچ کس دیگر. به کسی که پول چوکی را می‌پردازد نشان داده نمی‌شود.',
    'sponsor.rqSubmit': 'این چوکی را بخواهید',
    'sponsor.rqDone':
      'درخواست ثبت شد. کارمندان آن را می‌خوانند و جواب، همراه با دلیلش، در صفحهٔ چوکی‌های حمایت‌شدهٔ شما خواهد بود.',
    'sponsor.rqNoLearner': 'هنوز شاگردی در این حساب نیست، پس کسی نیست که برایش خواسته شود.',
    'sponsor.rqNoCourse': 'فعلاً کورسی برای فروش نیست، پس چیزی برای خواستن نیست.',
    'sponsor.rqPrivacy':
      'اگر درخواست منظور شود، حامی کد چوکی، کورس، اینکه برای طفل است یا بزرگسال، و قیمت را می‌بیند. هرگز نام شما، فامیل شما یا آنچه اینجا نوشته‌اید را نمی‌بیند.',
    'sponsor.rqWhyReason':
      'جمله‌ای دربارهٔ وضعیت بنویسید. این همان چیزی است که تصمیم‌گیرنده می‌خواند.',
    'sponsor.rqWhyHas': 'این شاگرد از پیش این کورس را دارد، پس چیزی برای خواستن نیست.',
    'sponsor.rqWhyAsked': 'برای این کورس از پیش یک درخواست باز است.',
  },
  tr: {
    'sponsor.lede':
      'Ücretini başka birinin ödediği kurslar ve başka biri öğrensin diye ücretini sizin ödediğiniz kurslar. İki taraf da diğerinin kim olduğunu öğrenmez.',
    'sponsor.off':
      'Yer desteklemek şu anda kapalı; bu yüzden yeni bir yer istenemez ve yeni bir yer desteklenemez. Daha önce istenen ya da desteklenen yerler burada gösterilmeye devam eder.',
    'sponsor.askedHeading': 'İstediklerim',
    'sponsor.askedUnread':
      'İstekleriniz şu anda okunamadı. Hiçbir şey değişmedi: bu sayfa yalnızca okur.',
    'sponsor.askedNone': 'Destekli bir yer istemediniz.',
    'sponsor.askedHow':
      'Bir kurs gücünüzü aşıyorsa isteyebilirsiniz. Hiçbir ücreti yoktur ve kimseyi bir şeye mecbur etmez.',
    'sponsor.askLink': 'Destekli bir yer isteyin',
    'sponsor.aCourse': 'Bir kurs',
    'sponsor.forWhom': 'Kimin için: {name}',
    'sponsor.apSubmitted': 'Birinin okuması bekleniyor',
    'sponsor.apApproved': 'Onaylandı, destekleyen bekleniyor',
    'sponsor.apFunded': 'Karşılandı: biri bu yerin ücretini ödedi',
    'sponsor.apDeclined': 'Onaylanmadı',
    'sponsor.apWithdrawn': 'İstek geri alındı',
    'sponsor.seat': 'Yer: {code}',
    'sponsor.staffNote': 'Görevlilerin kendi sözleriyle yazdığı:',
    'sponsor.askedOn': 'İstek tarihi: {date}',
    'sponsor.decidedOn': 'Karar tarihi: {date}',
    'sponsor.coveredLead': 'İstediğiniz bir yer karşılandı.',
    'sponsor.coveredBody':
      'Kurs artık öğrenciye açık. Ödeyen kişinin adı burada yazmaz ve bu bilerek böyledir: kimin verdiği, verenle Allah arasındadır.',
    'sponsor.gaveHeading': 'Desteklediklerim',
    'sponsor.gaveUnread':
      'Destekleriniz şu anda okunamadı. Hiçbir şey değişmedi: bu sayfa yalnızca okur.',
    'sponsor.gaveNone': 'Bir yer desteklemediniz.',
    'sponsor.gaveHow': 'Bekleyen her yer, birinin istediği bir kurstur.',
    'sponsor.spPledged': 'Söz verildi: ödemenin kaydedilmesi bekleniyor',
    'sponsor.spPaid': 'Ödendi ve yer açık',
    'sponsor.spWithdrawn': 'İptal edildi',
    'sponsor.amount': 'Tutar: {amount}',
    'sponsor.reference': 'Referans: {reference}',
    'sponsor.nextPledged':
      'Hiçbir şey otomatik olarak alınmaz: bu sayfa ödeme tahsil etmez. Ödeme platforma ulaştığında görevliler onu buraya kaydeder ve kaydedildiğinde yer açılır.',
    'sponsor.nextPaid': 'Kaydedildi. Yer öğrenciye açık ve öğrenciye kimin ödediği söylenmedi.',
    'sponsor.nextWithdrawn': 'Bu söz iptal edildi; bu yüzden onun için para beklenmiyor.',
    'sponsor.pledgedOn': 'Söz verilen tarih: {date}',
    'sponsor.recordedOn': 'Ödemenin kaydedildiği tarih: {date}',
    'sponsor.zakat':
      'Destekli bir yerin zekât mı, sadaka mı sayılacağı yoksa hiçbiri mi olduğu bir âlimin vereceği hükümdür ve bu platform o hükmü vermez. Vermeden önce güvendiğiniz birine sorun.',
    'sponsor.pay': 'Bu sözü ödeyin',
    'sponsor.payLede':
      'Ödeme onaylanır onaylanmaz yer öğrenciye açılır. İki taraf da diğerinin kim olduğunu öğrenmez.',
    'sponsor.payApprove':
      'Ödemeyi telefonunuzdan onaylayın. Ödeme onaylanınca yer öğrenciye açılır. Bu biraz zaman alabilir.',
    'sponsor.payNot':
      'Bu söz burada ödenemez: ya ödenmiş ya iptal edilmiştir ya da sizin sözlerinizden biri değildir.',
    'sponsor.nextPay': 'Siz ödeyene kadar hiçbir şey alınmaz. Ödeme onaylanınca yer açılır.',
    'sponsor.plEyebrow': 'Destek',
    'sponsor.plTitle': 'Başka birinin kursunun ücretini ödeyin',
    'sponsor.plLede':
      'Bir kursun ücretini karşılayamayan öğrenci onu ister, görevliler de karar verir. Onaylanan istek burada bir kodu ve kursun fiyatı olan bir yer olarak görünür; yanında asla bir ad olmaz. Siz bir yer seçersiniz, kursu öğrenci alır.',
    'sponsor.plSeeHeading': 'Ne görürsünüz, ne görmezsiniz',
    'sponsor.plSeeBody':
      'Yerin kodu, kurs, çocuk için mi yetişkin için mi olduğu ve bulunduğunuz ülkedeki fiyat. Öğrencinin adı, yaşı ya da ailesi yoktur; yazdıklarından tek kelime de yoktur. Onu yalnızca karar veren görevliler okur, başka kimse okumaz.',
    'sponsor.plPayHeading': 'Ne ödersiniz ve ne zaman',
    'sponsor.plPayBody':
      'Kursun bulunduğunuz ülkedeki fiyatı; satın almada olduğu gibi hesaplanır. Yer almak bir sözdür ve para alınmaz. Destekli yerler sayfanız sözün nasıl ödeneceğini söyler; ödeme onaylanınca yer öğrenciye açılır.',
    'sponsor.plListHeading': 'Destekleyen bekleyen yerler',
    'sponsor.plSignIn': 'Yerler oturum açmış kişilere gösterilir.',
    'sponsor.plUnread': 'Yerler okunamadı. Hiçbir ücret alınmadı ve hiçbir yer alınmadı.',
    'sponsor.plOff':
      'Yer destekleme şu anda kapalı; bu yüzden ne yer alınabilir ne de istenebilir.',
    'sponsor.plNone':
      'Şu anda destekleyen bekleyen yer yok. İstek, görevliler onaylayınca burada görünür.',
    'sponsor.plForChild': 'Çocuk için',
    'sponsor.plForAdult': 'Yetişkin için',
    'sponsor.plPriceNote':
      'Bu kursun bulunduğunuz ülkedeki fiyatı. Desteklenen şey yerdir, hediye kartı değildir.',
    'sponsor.plNoPrice':
      'Bu kursun bulunduğunuz ülkede fiyatı yok; bu yüzden bu yer buradan alınamaz.',
    'sponsor.plPriceUnread': 'Bu yerin fiyatı okunamadı; bu yüzden şimdilik alınamaz.',
    'sponsor.plNoteLabel': 'İsterseniz görevlilere bir not',
    'sponsor.plTake': 'Bu yeri destekleyin',
    'sponsor.plTaken': 'Bu yer artık ödemeniz için sizin: {amount}',
    'sponsor.plTakenNext':
      'Hiçbir şey alınmadı. Destekli yerler sayfanız nasıl ödeyeceğinizi söyler.',
    'sponsor.plWhyGone': 'Bu yer az önce alındı ya da artık açık değil. Başka bir yer seçin.',
    'sponsor.plWhyOwn': 'Bu, sizin istediğiniz yer. Kendi isteğinizi destekleyemezsiniz.',
    'sponsor.tooLong': 'Bu, kutunun alabileceğinden uzun.',
    'sponsor.plWhyFailed': 'Olmadı. Hiçbir ücret alınmadı ve hiçbir şey değişmedi.',
    'sponsor.unconfirmed':
      'Kaydedilip kaydedilmediğini doğrulayamadık. Yeniden denemeden önce destekli yerlerinize bakın.',
    'sponsor.plAskHeading': 'Yer istemek',
    'sponsor.rqLede':
      'Bir kurs gücünüzü aşıyorsa durum hakkında birkaç cümle yazın. Görevliler okur ve her iki durumda da gerekçesiyle yanıt verir. İstemenin hiçbir ücreti yoktur ve kimseyi bir şeye mecbur etmez.',
    'sponsor.rqCourse': 'Hangi kurs?',
    'sponsor.rqChoose': 'Bir kurs seçin',
    'sponsor.rqReason': 'Durum nedir?',
    'sponsor.rqReasonNote':
      'Yalnızca karar veren görevliler okur, başka kimse okumaz. Yerin ücretini ödeyen kişiye gösterilmez.',
    'sponsor.rqSubmit': 'Bu yeri isteyin',
    'sponsor.rqDone':
      'İstendi. Görevliler okuyacak; yanıt, gerekçesiyle birlikte destekli yerler sayfanızda olacak.',
    'sponsor.rqNoLearner':
      'Bu hesapta henüz bir öğrenci yok; bu yüzden adına istenecek kimse yok.',
    'sponsor.rqNoCourse': 'Şu anda satışta kurs yok; bu yüzden istenecek bir şey yok.',
    'sponsor.rqPrivacy':
      'İstek onaylanırsa destekleyen kişi yerin kodunu, kursu, çocuk için mi yetişkin için mi olduğunu ve fiyatı görür. Adınızı, ailenizi ya da burada yazdıklarınızı asla görmez.',
    'sponsor.rqWhyReason': 'Durum hakkında bir cümle yazın. Karar veren kişi onu okur.',
    'sponsor.rqWhyHas': 'Bu öğrencide bu kurs zaten var; bu yüzden istenecek bir şey yok.',
    'sponsor.rqWhyAsked': 'Bu kurs için zaten açık bir istek var.',
  },
  id: {
    'sponsor.lede':
      'Kursus yang dibayar orang lain, dan kursus yang Anda bayar agar orang lain dapat mengikutinya. Kedua pihak tidak tahu siapa pihak lainnya.',
    'sponsor.off':
      'Sponsor kursi sedang dimatikan, jadi tidak ada kursi baru yang dapat diminta atau disponsori. Yang sudah diminta atau disponsori sebelumnya tetap ditampilkan di sini.',
    'sponsor.askedHeading': 'Yang saya minta',
    'sponsor.askedUnread':
      'Permintaan Anda tidak dapat dibaca saat ini. Tidak ada yang berubah: halaman ini hanya membaca.',
    'sponsor.askedNone': 'Anda belum meminta kursi bersponsor.',
    'sponsor.askedHow':
      'Jika sebuah kursus tidak terjangkau, Anda dapat meminta. Tidak ada biayanya dan tidak mewajibkan siapa pun.',
    'sponsor.askLink': 'Minta kursi bersponsor',
    'sponsor.aCourse': 'Sebuah kursus',
    'sponsor.forWhom': 'Untuk: {name}',
    'sponsor.apSubmitted': 'Menunggu dibaca seseorang',
    'sponsor.apApproved': 'Disetujui, dan menunggu sponsor',
    'sponsor.apFunded': 'Tertanggung: seseorang membayar kursi ini',
    'sponsor.apDeclined': 'Tidak disetujui',
    'sponsor.apWithdrawn': 'Permintaan ditarik',
    'sponsor.seat': 'Kursi: {code}',
    'sponsor.staffNote': 'Yang ditulis staf, dengan kata-kata mereka sendiri:',
    'sponsor.askedOn': 'Diminta pada {date}',
    'sponsor.decidedOn': 'Diputuskan pada {date}',
    'sponsor.coveredLead': 'Kursi yang Anda minta sudah ditanggung.',
    'sponsor.coveredBody':
      'Kursus ini sekarang terbuka bagi peserta didik. Yang membayar tidak disebutkan di sini, dan itu disengaja: siapa yang memberi adalah urusan antara pemberi dan Allah.',
    'sponsor.gaveHeading': 'Yang saya sponsori',
    'sponsor.gaveUnread':
      'Sponsor Anda tidak dapat dibaca saat ini. Tidak ada yang berubah: halaman ini hanya membaca.',
    'sponsor.gaveNone': 'Anda belum mensponsori kursi.',
    'sponsor.gaveHow': 'Setiap kursi yang menunggu adalah kursus yang diminta seseorang.',
    'sponsor.spPledged': 'Dijanjikan: menunggu pembayaran dicatat',
    'sponsor.spPaid': 'Dibayar, dan kursi terbuka',
    'sponsor.spWithdrawn': 'Dibatalkan',
    'sponsor.amount': 'Jumlah: {amount}',
    'sponsor.reference': 'Referensi: {reference}',
    'sponsor.nextPledged':
      'Tidak ada yang diambil secara otomatis: halaman ini tidak memungut pembayaran. Staf mencatat pembayaran di sini ketika sampai ke platform, dan kursi dibuka saat dicatat.',
    'sponsor.nextPaid':
      'Tercatat. Kursi terbuka bagi peserta didik, dan peserta didik tidak diberi tahu siapa yang membayar.',
    'sponsor.nextWithdrawn': 'Janji ini dibatalkan, jadi tidak ada uang yang diharapkan untuknya.',
    'sponsor.pledgedOn': 'Dijanjikan pada {date}',
    'sponsor.recordedOn': 'Pembayaran dicatat pada {date}',
    'sponsor.zakat':
      'Apakah kursi bersponsor terhitung zakat, sedekah, atau bukan keduanya adalah ketetapan seorang ulama, dan platform ini tidak menetapkannya. Tanyakan kepada orang yang Anda percaya sebelum memberi.',
    'sponsor.pay': 'Bayar janji ini',
    'sponsor.payLede':
      'Kursi dibuka bagi peserta didik segera setelah pembayaran dikonfirmasi. Kedua pihak tidak tahu siapa pihak lainnya.',
    'sponsor.payApprove':
      'Setujui pembayaran di ponsel Anda. Kursi dibuka bagi peserta didik setelah pembayaran dikonfirmasi. Ini mungkin memerlukan waktu sebentar.',
    'sponsor.payNot':
      'Janji ini tidak dapat dibayar di sini: sudah dibayar atau dibatalkan, atau bukan salah satu janji Anda.',
    'sponsor.nextPay':
      'Tidak ada yang diambil sampai Anda membayar. Kursi dibuka saat pembayaran dikonfirmasi.',
    'sponsor.plEyebrow': 'Sponsor',
    'sponsor.plTitle': 'Bayarkan kursus untuk orang lain',
    'sponsor.plLede':
      'Peserta didik yang tidak mampu membayar sebuah kursus memintanya, dan staf memutuskan. Permintaan yang disetujui muncul di sini sebagai kursi dengan kode dan harga kursus, dan tidak pernah dengan nama. Anda memilih kursi; peserta didik mendapat kursusnya.',
    'sponsor.plSeeHeading': 'Yang Anda lihat, dan yang tidak',
    'sponsor.plSeeBody':
      'Kode kursi, kursus, apakah untuk anak atau orang dewasa, dan harga di negara Anda. Bukan nama, usia, atau keluarga peserta didik, dan tidak sepatah kata pun dari yang ditulisnya. Itu dibaca oleh staf yang memutuskan, dan tidak oleh orang lain.',
    'sponsor.plPayHeading': 'Yang Anda bayar, dan kapan',
    'sponsor.plPayBody':
      'Harga kursus di negara Anda, dihitung seperti untuk pembelian. Mengambil kursi adalah janji dan tidak mengambil uang. Halaman kursi bersponsor Anda menjelaskan cara janji itu dibayar, dan kursi dibuka bagi peserta didik saat pembayaran dikonfirmasi.',
    'sponsor.plListHeading': 'Kursi yang menunggu sponsor',
    'sponsor.plSignIn': 'Kursi ditampilkan kepada orang yang sudah masuk.',
    'sponsor.plUnread':
      'Kursi tidak dapat dibaca. Tidak ada yang ditagih dan tidak ada kursi yang diambil.',
    'sponsor.plOff':
      'Sponsor kursi sedang dimatikan, jadi tidak ada kursi yang dapat diambil atau diminta.',
    'sponsor.plNone':
      'Saat ini tidak ada kursi yang menunggu sponsor. Permintaan muncul di sini setelah disetujui staf.',
    'sponsor.plForChild': 'Untuk anak',
    'sponsor.plForAdult': 'Untuk orang dewasa',
    'sponsor.plPriceNote':
      'Harga kursus ini di negara Anda. Yang disponsori adalah kursinya, bukan kartu hadiah.',
    'sponsor.plNoPrice':
      'Kursus ini tidak punya harga di negara Anda, jadi kursi ini tidak dapat diambil dari sini.',
    'sponsor.plPriceUnread':
      'Harga kursi ini tidak dapat dibaca, jadi belum dapat diambil sekarang.',
    'sponsor.plNoteLabel': 'Catatan untuk staf, jika Anda mau',
    'sponsor.plTake': 'Sponsori kursi ini',
    'sponsor.plTaken': 'Kursi ini kini milik Anda untuk dibayar: {amount}',
    'sponsor.plTakenNext':
      'Tidak ada yang diambil. Halaman kursi bersponsor Anda menjelaskan cara membayar.',
    'sponsor.plWhyGone':
      'Kursi itu baru saja diambil, atau tidak lagi terbuka. Pilih yang lain.',
    'sponsor.plWhyOwn':
      'Itu kursi yang Anda minta sendiri. Anda tidak dapat mensponsori permintaan Anda sendiri.',
    'sponsor.tooLong': 'Itu lebih panjang daripada yang dapat ditampung kotak ini.',
    'sponsor.plWhyFailed':
      'Itu tidak berhasil. Tidak ada yang ditagih dan tidak ada yang berubah.',
    'sponsor.unconfirmed':
      'Kami tidak dapat memastikan apakah itu tercatat. Lihat kursi bersponsor Anda sebelum mencoba lagi.',
    'sponsor.plAskHeading': 'Meminta kursi',
    'sponsor.rqLede':
      'Jika sebuah kursus tidak terjangkau, tulis beberapa kalimat tentang keadaannya. Staf membacanya dan menjawab apa pun keputusannya, dengan alasan. Meminta tidak ada biayanya dan tidak mewajibkan siapa pun.',
    'sponsor.rqCourse': 'Kursus yang mana?',
    'sponsor.rqChoose': 'Pilih kursus',
    'sponsor.rqReason': 'Bagaimana keadaannya?',
    'sponsor.rqReasonNote':
      'Dibaca oleh staf yang memutuskan, dan tidak oleh orang lain. Tidak ditampilkan kepada orang yang membayar kursi itu.',
    'sponsor.rqSubmit': 'Minta kursi ini',
    'sponsor.rqDone':
      'Sudah diminta. Staf akan membacanya, dan jawabannya, beserta alasannya, akan ada di halaman kursi bersponsor Anda.',
    'sponsor.rqNoLearner':
      'Belum ada peserta didik di akun ini, jadi belum ada yang dapat dimintakan.',
    'sponsor.rqNoCourse':
      'Saat ini tidak ada kursus yang dijual, jadi tidak ada yang dapat diminta.',
    'sponsor.rqPrivacy':
      'Jika permintaan disetujui, sponsor melihat kode kursi, kursus, apakah untuk anak atau orang dewasa, dan harganya. Tidak pernah nama Anda, keluarga Anda, atau yang Anda tulis di sini.',
    'sponsor.rqWhyReason':
      'Tulis satu kalimat tentang keadaannya. Itulah yang dibaca orang yang memutuskan.',
    'sponsor.rqWhyHas':
      'Peserta didik itu sudah memiliki kursus ini, jadi tidak ada yang perlu diminta.',
    'sponsor.rqWhyAsked': 'Sudah ada permintaan yang terbuka untuk kursus ini.',
  },
  ms: {
    'sponsor.lede':
      'Kursus yang dibayar oleh orang lain, dan kursus yang anda bayar supaya orang lain dapat mengikutinya. Kedua-dua pihak tidak tahu siapa pihak yang satu lagi.',
    'sponsor.off':
      'Tajaan tempat dimatikan buat masa ini, jadi tiada tempat baharu boleh dimohon atau ditaja. Apa yang dimohon atau ditaja sebelum ini masih ditunjukkan di sini.',
    'sponsor.askedHeading': 'Yang saya mohon',
    'sponsor.askedUnread':
      'Permohonan anda tidak dapat dibaca sekarang. Tiada apa-apa yang berubah: halaman ini hanya membaca.',
    'sponsor.askedNone': 'Anda belum memohon tempat tajaan.',
    'sponsor.askedHow':
      'Jika sesebuah kursus di luar kemampuan, anda boleh memohon. Ia percuma dan tidak mewajibkan sesiapa.',
    'sponsor.askLink': 'Mohon tempat tajaan',
    'sponsor.aCourse': 'Sebuah kursus',
    'sponsor.forWhom': 'Untuk: {name}',
    'sponsor.apSubmitted': 'Menunggu seseorang membacanya',
    'sponsor.apApproved': 'Diluluskan, dan menunggu penaja',
    'sponsor.apFunded': 'Ditanggung: seseorang telah membayar tempat ini',
    'sponsor.apDeclined': 'Tidak diluluskan',
    'sponsor.apWithdrawn': 'Permohonan ditarik balik',
    'sponsor.seat': 'Tempat: {code}',
    'sponsor.staffNote': 'Apa yang ditulis oleh kakitangan, dengan kata-kata mereka sendiri:',
    'sponsor.askedOn': 'Dimohon pada {date}',
    'sponsor.decidedOn': 'Diputuskan pada {date}',
    'sponsor.coveredLead': 'Tempat yang anda mohon telah ditanggung.',
    'sponsor.coveredBody':
      'Kursus ini kini dibuka untuk pelajar. Orang yang membayar tidak dinamakan di sini, dan itu disengajakan: siapa yang memberi ialah urusan antara pemberi dengan Allah.',
    'sponsor.gaveHeading': 'Yang saya taja',
    'sponsor.gaveUnread':
      'Tajaan anda tidak dapat dibaca sekarang. Tiada apa-apa yang berubah: halaman ini hanya membaca.',
    'sponsor.gaveNone': 'Anda belum menaja mana-mana tempat.',
    'sponsor.gaveHow': 'Setiap tempat yang menunggu ialah kursus yang dimohon oleh seseorang.',
    'sponsor.spPledged': 'Dijanjikan: menunggu bayaran direkodkan',
    'sponsor.spPaid': 'Dibayar, dan tempat dibuka',
    'sponsor.spWithdrawn': 'Dibatalkan',
    'sponsor.amount': 'Jumlah: {amount}',
    'sponsor.reference': 'Rujukan: {reference}',
    'sponsor.nextPledged':
      'Tiada apa-apa diambil secara automatik: halaman ini tidak mengutip bayaran. Kakitangan merekodkan bayaran di sini apabila ia sampai ke platform, dan tempat dibuka apabila direkodkan.',
    'sponsor.nextPaid':
      'Direkodkan. Tempat dibuka untuk pelajar, dan pelajar tidak diberitahu siapa yang membayar.',
    'sponsor.nextWithdrawn': 'Janji ini dibatalkan, jadi tiada wang dijangka untuknya.',
    'sponsor.pledgedOn': 'Dijanjikan pada {date}',
    'sponsor.recordedOn': 'Bayaran direkodkan pada {date}',
    'sponsor.zakat':
      'Sama ada tempat tajaan dikira zakat, sedekah atau bukan kedua-duanya ialah hukum yang diputuskan oleh seorang alim, dan platform ini tidak memutuskannya. Tanyalah seseorang yang anda percayai sebelum memberi.',
    'sponsor.pay': 'Bayar janji ini',
    'sponsor.payLede':
      'Tempat dibuka untuk pelajar sebaik sahaja pembayaran disahkan. Kedua-dua pihak tidak tahu siapa pihak yang satu lagi.',
    'sponsor.payApprove':
      'Luluskan pembayaran pada telefon anda. Tempat dibuka untuk pelajar sebaik sahaja pembayaran disahkan. Ini mungkin mengambil sedikit masa.',
    'sponsor.payNot':
      'Janji ini tidak boleh dibayar di sini: ia telah dibayar atau dibatalkan, atau bukan salah satu janji anda.',
    'sponsor.nextPay':
      'Tiada apa-apa diambil sehingga anda membayar. Tempat dibuka apabila pembayaran disahkan.',
    'sponsor.plEyebrow': 'Tajaan',
    'sponsor.plTitle': 'Bayar kursus untuk orang lain',
    'sponsor.plLede':
      'Pelajar yang tidak mampu membayar sesebuah kursus memohonnya, dan kakitangan memutuskan. Permohonan yang diluluskan muncul di sini sebagai tempat dengan kod dan harga kursus, dan tidak sekali-kali dengan nama. Anda memilih tempat; pelajar mendapat kursus itu.',
    'sponsor.plSeeHeading': 'Apa yang anda lihat, dan apa yang tidak',
    'sponsor.plSeeBody':
      'Kod tempat, kursus, sama ada untuk kanak-kanak atau orang dewasa, dan harga di negara anda. Bukan nama, umur atau keluarga pelajar, dan tidak sepatah pun daripada apa yang ditulisnya. Itu dibaca oleh kakitangan yang memutuskan, dan tidak oleh sesiapa lagi.',
    'sponsor.plPayHeading': 'Apa yang anda bayar, dan bila',
    'sponsor.plPayBody':
      'Harga kursus di negara anda, dikira seperti untuk pembelian. Mengambil tempat ialah satu janji dan tiada wang diambil. Halaman tempat tajaan anda menerangkan cara janji itu dibayar, dan tempat dibuka untuk pelajar apabila pembayaran disahkan.',
    'sponsor.plListHeading': 'Tempat yang menunggu penaja',
    'sponsor.plSignIn': 'Tempat ditunjukkan kepada orang yang sudah log masuk.',
    'sponsor.plUnread':
      'Tempat tidak dapat dibaca. Tiada apa-apa dicaj dan tiada tempat diambil.',
    'sponsor.plOff':
      'Tajaan tempat sedang dimatikan, jadi tiada tempat boleh diambil atau dimohon.',
    'sponsor.plNone':
      'Tiada tempat yang menunggu penaja sekarang. Permohonan muncul di sini selepas diluluskan oleh kakitangan.',
    'sponsor.plForChild': 'Untuk kanak-kanak',
    'sponsor.plForAdult': 'Untuk orang dewasa',
    'sponsor.plPriceNote':
      'Harga kursus ini di negara anda. Yang ditaja ialah tempat itu, bukan kad hadiah.',
    'sponsor.plNoPrice':
      'Kursus ini tiada harga di negara anda, jadi tempat ini tidak boleh diambil dari sini.',
    'sponsor.plPriceUnread':
      'Harga tempat ini tidak dapat dibaca, jadi ia belum boleh diambil sekarang.',
    'sponsor.plNoteLabel': 'Nota untuk kakitangan, jika anda mahu',
    'sponsor.plTake': 'Taja tempat ini',
    'sponsor.plTaken': 'Tempat ini kini milik anda untuk dibayar: {amount}',
    'sponsor.plTakenNext':
      'Tiada apa-apa diambil. Halaman tempat tajaan anda menerangkan cara membayar.',
    'sponsor.plWhyGone':
      'Tempat itu baru sahaja diambil, atau tidak lagi dibuka. Pilih yang lain.',
    'sponsor.plWhyOwn':
      'Itu tempat yang anda sendiri mohon. Anda tidak boleh menaja permohonan anda sendiri.',
    'sponsor.tooLong': 'Itu lebih panjang daripada yang boleh dimuatkan dalam kotak ini.',
    'sponsor.plWhyFailed': 'Itu tidak berjaya. Tiada apa-apa dicaj dan tiada apa-apa berubah.',
    'sponsor.unconfirmed':
      'Kami tidak dapat mengesahkan sama ada ia direkodkan. Lihat tempat tajaan anda sebelum mencuba lagi.',
    'sponsor.plAskHeading': 'Memohon tempat',
    'sponsor.rqLede':
      'Jika sesebuah kursus di luar kemampuan, tulis beberapa ayat tentang keadaannya. Kakitangan membacanya dan menjawab walau apa pun keputusannya, dengan sebab. Memohon adalah percuma dan tidak mewajibkan sesiapa.',
    'sponsor.rqCourse': 'Kursus yang mana?',
    'sponsor.rqChoose': 'Pilih kursus',
    'sponsor.rqReason': 'Bagaimanakah keadaannya?',
    'sponsor.rqReasonNote':
      'Dibaca oleh kakitangan yang memutuskan, dan tidak oleh sesiapa lagi. Tidak ditunjukkan kepada orang yang membayar tempat itu.',
    'sponsor.rqSubmit': 'Mohon tempat ini',
    'sponsor.rqDone':
      'Sudah dimohon. Kakitangan akan membacanya, dan jawapannya, bersama sebabnya, akan ada di halaman tempat tajaan anda.',
    'sponsor.rqNoLearner':
      'Belum ada pelajar dalam akaun ini, jadi tiada sesiapa untuk dimohonkan.',
    'sponsor.rqNoCourse': 'Tiada kursus yang dijual sekarang, jadi tiada apa-apa untuk dimohon.',
    'sponsor.rqPrivacy':
      'Jika permohonan diluluskan, penaja melihat kod tempat, kursus, sama ada untuk kanak-kanak atau orang dewasa, dan harganya. Tidak sekali-kali nama anda, keluarga anda atau apa yang anda tulis di sini.',
    'sponsor.rqWhyReason':
      'Tulis satu ayat tentang keadaannya. Itulah yang dibaca oleh orang yang memutuskan.',
    'sponsor.rqWhyHas':
      'Pelajar itu sudah mempunyai kursus ini, jadi tiada apa-apa untuk dimohon.',
    'sponsor.rqWhyAsked': 'Sudah ada permohonan yang terbuka untuk kursus ini.',
  },
  bn: {
    'sponsor.lede':
      'যেসব কোর্সের খরচ অন্য কেউ দিয়েছেন, এবং যেসব কোর্সের খরচ আপনি অন্য কারও শেখার জন্য দিয়েছেন। কোনো পক্ষই জানতে পারে না অপরজন কে।',
    'sponsor.off':
      'আসনের পৃষ্ঠপোষকতা এই মুহূর্তে বন্ধ আছে, তাই নতুন কোনো আসন চাওয়া বা নতুন কোনো আসনের পৃষ্ঠপোষকতা করা যাবে না। আগে যা চাওয়া বা পৃষ্ঠপোষকতা করা হয়েছে তা এখনো এখানে দেখানো হয়।',
    'sponsor.askedHeading': 'আমি যা চেয়েছি',
    'sponsor.askedUnread':
      'আপনার অনুরোধগুলো এই মুহূর্তে পড়া যায়নি। কিছুই বদলায়নি: এই পাতা শুধু পড়ে।',
    'sponsor.askedNone': 'আপনি পৃষ্ঠপোষকতার কোনো আসন চাননি।',
    'sponsor.askedHow':
      'কোনো কোর্স নাগালের বাইরে হলে আপনি চাইতে পারেন। এতে কোনো খরচ নেই এবং কাউকে কিছুতে বাধ্য করে না।',
    'sponsor.askLink': 'পৃষ্ঠপোষকতার আসন চান',
    'sponsor.aCourse': 'একটি কোর্স',
    'sponsor.forWhom': 'যার জন্য: {name}',
    'sponsor.apSubmitted': 'কেউ পড়বেন, সেই অপেক্ষায়',
    'sponsor.apApproved': 'অনুমোদিত, পৃষ্ঠপোষকের অপেক্ষায়',
    'sponsor.apFunded': 'খরচ মিটেছে: কেউ এই আসনের খরচ দিয়েছেন',
    'sponsor.apDeclined': 'অনুমোদিত হয়নি',
    'sponsor.apWithdrawn': 'অনুরোধ ফিরিয়ে নেওয়া হয়েছে',
    'sponsor.seat': 'আসন: {code}',
    'sponsor.staffNote': 'কর্মীরা নিজেদের ভাষায় যা লিখেছেন:',
    'sponsor.askedOn': 'চাওয়ার তারিখ: {date}',
    'sponsor.decidedOn': 'সিদ্ধান্তের তারিখ: {date}',
    'sponsor.coveredLead': 'আপনার চাওয়া একটি আসনের খরচ মিটেছে।',
    'sponsor.coveredBody':
      'কোর্সটি এখন শিক্ষার্থীর জন্য খোলা। যিনি খরচ দিয়েছেন তাঁর নাম এখানে নেই, এবং তা ইচ্ছাকৃত: কে দিয়েছেন তা দাতা ও আল্লাহর মধ্যকার বিষয়।',
    'sponsor.gaveHeading': 'আমি যার পৃষ্ঠপোষকতা করেছি',
    'sponsor.gaveUnread':
      'আপনার পৃষ্ঠপোষকতাগুলো এই মুহূর্তে পড়া যায়নি। কিছুই বদলায়নি: এই পাতা শুধু পড়ে।',
    'sponsor.gaveNone': 'আপনি কোনো আসনের পৃষ্ঠপোষকতা করেননি।',
    'sponsor.gaveHow': 'অপেক্ষায় থাকা প্রতিটি আসন এমন একটি কোর্স যা কেউ চেয়েছেন।',
    'sponsor.spPledged': 'প্রতিশ্রুত: পেমেন্ট নথিভুক্ত হওয়ার অপেক্ষায়',
    'sponsor.spPaid': 'পরিশোধিত, এবং আসন খোলা',
    'sponsor.spWithdrawn': 'বাতিল হয়েছে',
    'sponsor.amount': 'পরিমাণ: {amount}',
    'sponsor.reference': 'রেফারেন্স: {reference}',
    'sponsor.nextPledged':
      'কিছুই স্বয়ংক্রিয়ভাবে নেওয়া হয় না: এই পাতা কোনো পেমেন্ট সংগ্রহ করে না। পেমেন্ট প্ল্যাটফর্মে পৌঁছালে কর্মীরা তা এখানে নথিভুক্ত করেন, এবং নথিভুক্ত হলে আসন খোলে।',
    'sponsor.nextPaid':
      'নথিভুক্ত হয়েছে। আসনটি শিক্ষার্থীর জন্য খোলা, এবং কে খরচ দিয়েছেন তা শিক্ষার্থীকে জানানো হয়নি।',
    'sponsor.nextWithdrawn': 'এই প্রতিশ্রুতি বাতিল হয়েছে, তাই এর জন্য কোনো টাকা প্রত্যাশিত নয়।',
    'sponsor.pledgedOn': 'প্রতিশ্রুতির তারিখ: {date}',
    'sponsor.recordedOn': 'পেমেন্ট নথিভুক্তির তারিখ: {date}',
    'sponsor.zakat':
      'পৃষ্ঠপোষকতার আসন যাকাত, সদকা, নাকি কোনোটিই নয় বলে গণ্য হবে, তা একজন আলেমের রায়, এবং এই প্ল্যাটফর্ম সেই রায় দেয় না। দেওয়ার আগে আপনার আস্থাভাজন কাউকে জিজ্ঞাসা করুন।',
    'sponsor.pay': 'এই প্রতিশ্রুতির পেমেন্ট করুন',
    'sponsor.payLede':
      'পেমেন্ট নিশ্চিত হওয়ামাত্র আসনটি শিক্ষার্থীর জন্য খুলে যায়। কোনো পক্ষই জানতে পারে না অপরজন কে।',
    'sponsor.payApprove':
      'আপনার ফোনে পেমেন্ট অনুমোদন করুন। পেমেন্ট নিশ্চিত হলেই আসনটি শিক্ষার্থীর জন্য খুলে যাবে। এতে কিছুটা সময় লাগতে পারে।',
    'sponsor.payNot':
      'এই প্রতিশ্রুতির পেমেন্ট এখানে করা যাবে না: এটি পরিশোধ করা হয়েছে বা বাতিল হয়েছে, অথবা এটি আপনার প্রতিশ্রুতি নয়।',
    'sponsor.nextPay':
      'আপনি পেমেন্ট না করা পর্যন্ত কিছুই নেওয়া হয় না। পেমেন্ট নিশ্চিত হলে আসনটি খুলে যায়।',
    'sponsor.plEyebrow': 'পৃষ্ঠপোষকতা',
    'sponsor.plTitle': 'অন্য কারও কোর্সের খরচ দিন',
    'sponsor.plLede':
      'যে শিক্ষার্থী কোনো কোর্সের খরচ দিতে পারেন না তিনি সেটি চান, আর কর্মীরা সিদ্ধান্ত নেন। অনুমোদিত অনুরোধ এখানে একটি আসন হিসেবে আসে, সঙ্গে একটি কোড ও কোর্সের দাম থাকে, কখনোই কোনো নাম থাকে না। আপনি একটি আসন বেছে নেন; কোর্সটি পান শিক্ষার্থী।',
    'sponsor.plSeeHeading': 'আপনি কী দেখেন, আর কী দেখেন না',
    'sponsor.plSeeBody':
      'আসনের কোড, কোর্স, সেটি শিশুর জন্য না প্রাপ্তবয়স্কের জন্য, এবং আপনার দেশে দাম। শিক্ষার্থীর নাম, বয়স বা পরিবার নয়, এবং তিনি যা লিখেছেন তার একটি শব্দও নয়। সেটি শুধু সিদ্ধান্ত নেওয়া কর্মীরা পড়েন, আর কেউ নয়।',
    'sponsor.plPayHeading': 'আপনি কী দেন, এবং কখন',
    'sponsor.plPayBody':
      'আপনার দেশে কোর্সের দাম, কেনার বেলায় যেভাবে হিসাব হয় সেভাবেই। আসন নেওয়া একটি প্রতিশ্রুতি, এতে কোনো টাকা নেওয়া হয় না। আপনার পৃষ্ঠপোষকতার আসনের পাতা বলে প্রতিশ্রুতির পেমেন্ট কীভাবে হবে, আর পেমেন্ট নিশ্চিত হলে আসনটি শিক্ষার্থীর জন্য খুলে যায়।',
    'sponsor.plListHeading': 'পৃষ্ঠপোষকের অপেক্ষায় থাকা আসন',
    'sponsor.plSignIn': 'আসনগুলো তাঁদের দেখানো হয় যাঁরা সাইন ইন করেছেন।',
    'sponsor.plUnread': 'আসনগুলো পড়া যায়নি। কিছুই চার্জ করা হয়নি এবং কোনো আসন নেওয়া হয়নি।',
    'sponsor.plOff':
      'আসনের পৃষ্ঠপোষকতা এখন বন্ধ আছে, তাই কোনো আসন নেওয়া বা চাওয়া যাবে না।',
    'sponsor.plNone':
      'এখন কোনো আসন পৃষ্ঠপোষকের অপেক্ষায় নেই। কর্মীরা অনুমোদন করলে অনুরোধ এখানে আসে।',
    'sponsor.plForChild': 'শিশুর জন্য',
    'sponsor.plForAdult': 'প্রাপ্তবয়স্কের জন্য',
    'sponsor.plPriceNote':
      'আপনার দেশে এই কোর্সের দাম। পৃষ্ঠপোষকতা হয় আসনটির, এটি উপহার কার্ড নয়।',
    'sponsor.plNoPrice':
      'আপনার দেশে এই কোর্সের কোনো দাম নেই, তাই এই আসন এখান থেকে নেওয়া যাবে না।',
    'sponsor.plPriceUnread': 'এই আসনের দাম পড়া যায়নি, তাই এখনই এটি নেওয়া যাবে না।',
    'sponsor.plNoteLabel': 'কর্মীদের জন্য একটি নোট, চাইলে',
    'sponsor.plTake': 'এই আসনের পৃষ্ঠপোষক হোন',
    'sponsor.plTaken': 'এই আসনের পেমেন্ট এখন আপনার করার জন্য: {amount}',
    'sponsor.plTakenNext':
      'কিছুই নেওয়া হয়নি। আপনার পৃষ্ঠপোষকতার আসনের পাতা বলে কীভাবে পেমেন্ট করবেন।',
    'sponsor.plWhyGone': 'আসনটি এইমাত্র নেওয়া হয়েছে, অথবা আর খোলা নেই। অন্য একটি বেছে নিন।',
    'sponsor.plWhyOwn':
      'এটি সেই আসন যা আপনি নিজেই চেয়েছেন। নিজের অনুরোধের পৃষ্ঠপোষক হওয়া যায় না।',
    'sponsor.tooLong': 'এটি এই ঘরে যতটা ধরে তার চেয়ে লম্বা।',
    'sponsor.plWhyFailed': 'এটি হয়নি। কিছুই চার্জ করা হয়নি এবং কিছুই বদলায়নি।',
    'sponsor.unconfirmed':
      'এটি নথিভুক্ত হয়েছে কি না আমরা নিশ্চিত করতে পারিনি। আবার চেষ্টা করার আগে আপনার পৃষ্ঠপোষকতার আসনগুলো দেখুন।',
    'sponsor.plAskHeading': 'আসন চাওয়া',
    'sponsor.rqLede':
      'কোনো কোর্স নাগালের বাইরে হলে পরিস্থিতি নিয়ে কয়েকটি বাক্য লিখুন। কর্মীরা তা পড়েন এবং যা-ই সিদ্ধান্ত হোক, কারণসহ উত্তর দেন। চাইতে কোনো খরচ নেই এবং এতে কেউ বাধ্য হন না।',
    'sponsor.rqCourse': 'কোন কোর্স?',
    'sponsor.rqChoose': 'একটি কোর্স বেছে নিন',
    'sponsor.rqReason': 'পরিস্থিতি কী?',
    'sponsor.rqReasonNote':
      'শুধু সিদ্ধান্ত নেওয়া কর্মীরা পড়েন, আর কেউ নয়। আসনের খরচ যিনি দেন তাঁকে দেখানো হয় না।',
    'sponsor.rqSubmit': 'এই আসন চান',
    'sponsor.rqDone':
      'চাওয়া হয়েছে। কর্মীরা তা পড়বেন, এবং উত্তর, কারণসহ, আপনার পৃষ্ঠপোষকতার আসনের পাতায় থাকবে।',
    'sponsor.rqNoLearner':
      'এই অ্যাকাউন্টে এখনো কোনো শিক্ষার্থী নেই, তাই কারও জন্য চাওয়ার উপায় নেই।',
    'sponsor.rqNoCourse': 'এখন কোনো কোর্স বিক্রিতে নেই, তাই চাওয়ার কিছু নেই।',
    'sponsor.rqPrivacy':
      'অনুরোধ অনুমোদিত হলে পৃষ্ঠপোষক আসনের কোড, কোর্স, সেটি শিশুর জন্য না প্রাপ্তবয়স্কের জন্য, এবং দাম দেখেন। আপনার নাম, আপনার পরিবার বা এখানে আপনি যা লিখেছেন তা কখনোই নয়।',
    'sponsor.rqWhyReason': 'পরিস্থিতি নিয়ে একটি বাক্য লিখুন। সিদ্ধান্ত যিনি নেন তিনি এটিই পড়েন।',
    'sponsor.rqWhyHas': 'সেই শিক্ষার্থীর কাছে এই কোর্স আগে থেকেই আছে, তাই চাওয়ার কিছু নেই।',
    'sponsor.rqWhyAsked': 'এই কোর্সের জন্য আগে থেকেই একটি অনুরোধ খোলা আছে।',
  },
  hi: {
    'sponsor.lede':
      'वे कोर्स जिनका भुगतान किसी और ने किया, और वे कोर्स जिनका भुगतान आपने किसी और के सीखने के लिए किया। कोई भी पक्ष नहीं जानता कि दूसरा कौन है।',
    'sponsor.off':
      'सीट का प्रायोजन फ़िलहाल बंद है, इसलिए न कोई नई सीट माँगी जा सकती है और न किसी नई सीट को प्रायोजित किया जा सकता है। जो पहले माँगा या प्रायोजित किया गया वह अब भी यहाँ दिखता है।',
    'sponsor.askedHeading': 'जो मैंने माँगा',
    'sponsor.askedUnread': 'आपके अनुरोध अभी पढ़े नहीं जा सके। कुछ नहीं बदला: यह पेज केवल पढ़ता है।',
    'sponsor.askedNone': 'आपने कोई प्रायोजित सीट नहीं माँगी है।',
    'sponsor.askedHow':
      'कोई कोर्स आपकी पहुँच से बाहर हो तो आप माँग सकते हैं। इसमें कुछ ख़र्च नहीं होता और यह किसी को बाध्य नहीं करता।',
    'sponsor.askLink': 'प्रायोजित सीट माँगें',
    'sponsor.aCourse': 'एक कोर्स',
    'sponsor.forWhom': 'किसके लिए: {name}',
    'sponsor.apSubmitted': 'किसी के पढ़ने की प्रतीक्षा है',
    'sponsor.apApproved': 'स्वीकृत, और प्रायोजक की प्रतीक्षा है',
    'sponsor.apFunded': 'पूरा हुआ: किसी ने इस सीट का भुगतान कर दिया',
    'sponsor.apDeclined': 'स्वीकृत नहीं हुआ',
    'sponsor.apWithdrawn': 'अनुरोध वापस लिया गया',
    'sponsor.seat': 'सीट: {code}',
    'sponsor.staffNote': 'स्टाफ़ ने अपने शब्दों में जो लिखा:',
    'sponsor.askedOn': 'माँगने की तारीख़: {date}',
    'sponsor.decidedOn': 'निर्णय की तारीख़: {date}',
    'sponsor.coveredLead': 'आपकी माँगी हुई एक सीट का भुगतान हो गया है।',
    'sponsor.coveredBody':
      'कोर्स अब शिक्षार्थी के लिए खुला है। भुगतान करने वाले का नाम यहाँ नहीं है, और यह जान-बूझकर है: किसने दिया, यह देने वाले और अल्लाह के बीच की बात है।',
    'sponsor.gaveHeading': 'जो मैंने प्रायोजित किया',
    'sponsor.gaveUnread':
      'आपके प्रायोजन अभी पढ़े नहीं जा सके। कुछ नहीं बदला: यह पेज केवल पढ़ता है।',
    'sponsor.gaveNone': 'आपने कोई सीट प्रायोजित नहीं की है।',
    'sponsor.gaveHow': 'प्रतीक्षा कर रही हर सीट एक कोर्स है जिसे किसी ने माँगा है।',
    'sponsor.spPledged': 'वचन दिया गया: भुगतान दर्ज होने की प्रतीक्षा है',
    'sponsor.spPaid': 'भुगतान हो गया, और सीट खुली है',
    'sponsor.spWithdrawn': 'रद्द किया गया',
    'sponsor.amount': 'राशि: {amount}',
    'sponsor.reference': 'संदर्भ: {reference}',
    'sponsor.nextPledged':
      'कुछ भी अपने-आप नहीं लिया जाता: यह पेज कोई भुगतान नहीं वसूलता। भुगतान प्लैटफ़ॉर्म तक पहुँचने पर स्टाफ़ उसे यहाँ दर्ज करता है, और दर्ज होते ही सीट खुल जाती है।',
    'sponsor.nextPaid':
      'दर्ज हो गया। सीट शिक्षार्थी के लिए खुली है, और शिक्षार्थी को नहीं बताया गया कि भुगतान किसने किया।',
    'sponsor.nextWithdrawn': 'यह वचन रद्द कर दिया गया, इसलिए इसके लिए किसी धन की अपेक्षा नहीं है।',
    'sponsor.pledgedOn': 'वचन की तारीख़: {date}',
    'sponsor.recordedOn': 'भुगतान दर्ज होने की तारीख़: {date}',
    'sponsor.zakat':
      'प्रायोजित सीट ज़कात मानी जाएगी, सदक़ा, या दोनों में से कुछ नहीं, यह एक आलिम का फ़ैसला है, और यह प्लैटफ़ॉर्म यह फ़ैसला नहीं करता। देने से पहले किसी ऐसे व्यक्ति से पूछें जिस पर आपको भरोसा हो।',
    'sponsor.pay': 'इस वचन का भुगतान करें',
    'sponsor.payLede':
      'भुगतान की पुष्टि होते ही सीट शिक्षार्थी के लिए खुल जाती है। कोई भी पक्ष नहीं जानता कि दूसरा कौन है।',
    'sponsor.payApprove':
      'अपने फ़ोन पर भुगतान स्वीकृत करें। भुगतान की पुष्टि होते ही सीट शिक्षार्थी के लिए खुल जाएगी। इसमें थोड़ा समय लग सकता है।',
    'sponsor.payNot':
      'इस वचन का भुगतान यहाँ नहीं किया जा सकता: इसका भुगतान हो चुका है या इसे रद्द कर दिया गया है, या यह आपके वचनों में से नहीं है।',
    'sponsor.nextPay':
      'जब तक आप भुगतान नहीं करते, कुछ नहीं लिया जाता। भुगतान की पुष्टि होते ही सीट खुल जाती है।',
    'sponsor.plEyebrow': 'प्रायोजन',
    'sponsor.plTitle': 'किसी और के कोर्स का भुगतान करें',
    'sponsor.plLede':
      'जो शिक्षार्थी किसी कोर्स का ख़र्च नहीं उठा सकता, वह उसे माँगता है, और स्टाफ़ निर्णय लेता है। स्वीकृत अनुरोध यहाँ एक सीट के रूप में आता है, जिसके साथ एक कोड और कोर्स की क़ीमत होती है, नाम कभी नहीं। आप एक सीट चुनते हैं; कोर्स शिक्षार्थी को मिलता है।',
    'sponsor.plSeeHeading': 'आप क्या देखते हैं, और क्या नहीं',
    'sponsor.plSeeBody':
      'सीट का कोड, कोर्स, वह बच्चे के लिए है या वयस्क के लिए, और आपके देश में क़ीमत। शिक्षार्थी का नाम, उम्र या परिवार नहीं, और उसके लिखे का एक शब्द भी नहीं। उसे केवल निर्णय लेने वाला स्टाफ़ पढ़ता है, और कोई नहीं।',
    'sponsor.plPayHeading': 'आप क्या चुकाते हैं, और कब',
    'sponsor.plPayBody':
      'आपके देश में कोर्स की क़ीमत, वैसे ही निकाली गई जैसे ख़रीद के लिए। सीट लेना एक वचन है और इससे कोई पैसा नहीं लिया जाता। आपका प्रायोजित सीटों का पेज बताता है कि वचन का भुगतान कैसे होता है, और भुगतान की पुष्टि होते ही सीट शिक्षार्थी के लिए खुल जाती है।',
    'sponsor.plListHeading': 'प्रायोजक की प्रतीक्षा में सीटें',
    'sponsor.plSignIn': 'सीटें उन्हें दिखाई जाती हैं जो साइन इन हैं।',
    'sponsor.plUnread': 'सीटें पढ़ी नहीं जा सकीं। कुछ भी वसूला नहीं गया और कोई सीट नहीं ली गई।',
    'sponsor.plOff':
      'सीट का प्रायोजन अभी बंद है, इसलिए न कोई सीट ली जा सकती है और न माँगी जा सकती है।',
    'sponsor.plNone':
      'अभी कोई सीट प्रायोजक की प्रतीक्षा में नहीं है। स्टाफ़ की स्वीकृति के बाद अनुरोध यहाँ आता है।',
    'sponsor.plForChild': 'बच्चे के लिए',
    'sponsor.plForAdult': 'वयस्क के लिए',
    'sponsor.plPriceNote':
      'आपके देश में इस कोर्स की क़ीमत। प्रायोजित सीट होती है, यह गिफ़्ट कार्ड नहीं है।',
    'sponsor.plNoPrice':
      'आपके देश में इस कोर्स की कोई क़ीमत नहीं है, इसलिए यह सीट यहाँ से नहीं ली जा सकती।',
    'sponsor.plPriceUnread': 'इस सीट की क़ीमत पढ़ी नहीं जा सकी, इसलिए अभी यह नहीं ली जा सकती।',
    'sponsor.plNoteLabel': 'स्टाफ़ के लिए एक नोट, यदि आप चाहें',
    'sponsor.plTake': 'इस सीट को प्रायोजित करें',
    'sponsor.plTaken': 'यह सीट अब आपके भुगतान करने के लिए है: {amount}',
    'sponsor.plTakenNext':
      'कुछ भी नहीं लिया गया। आपका प्रायोजित सीटों का पेज बताता है कि भुगतान कैसे करना है।',
    'sponsor.plWhyGone': 'यह सीट अभी-अभी ले ली गई है, या अब खुली नहीं है। कोई और चुनें।',
    'sponsor.plWhyOwn':
      'यह वही सीट है जो आपने स्वयं माँगी थी। आप अपने ही अनुरोध को प्रायोजित नहीं कर सकते।',
    'sponsor.tooLong': 'यह इस बॉक्स की क्षमता से अधिक लंबा है।',
    'sponsor.plWhyFailed': 'यह नहीं हो सका। न कुछ वसूला गया और न कुछ बदला।',
    'sponsor.unconfirmed':
      'हम पुष्टि नहीं कर सके कि यह दर्ज हुआ या नहीं। दोबारा कोशिश करने से पहले अपनी प्रायोजित सीटें देख लें।',
    'sponsor.plAskHeading': 'सीट माँगना',
    'sponsor.rqLede':
      'कोई कोर्स आपकी पहुँच से बाहर हो तो स्थिति के बारे में कुछ वाक्य लिखें। स्टाफ़ उसे पढ़ता है और दोनों ही स्थितियों में कारण सहित उत्तर देता है। माँगने में कुछ ख़र्च नहीं होता और कोई किसी बात के लिए बाध्य नहीं होता।',
    'sponsor.rqCourse': 'कौन-सा कोर्स?',
    'sponsor.rqChoose': 'एक कोर्स चुनें',
    'sponsor.rqReason': 'स्थिति क्या है?',
    'sponsor.rqReasonNote':
      'केवल निर्णय लेने वाला स्टाफ़ पढ़ता है, और कोई नहीं। सीट का भुगतान करने वाले को नहीं दिखाया जाता।',
    'sponsor.rqSubmit': 'यह सीट माँगें',
    'sponsor.rqDone':
      'माँग लिया गया। स्टाफ़ इसे पढ़ेगा, और उत्तर, अपने कारण सहित, आपके प्रायोजित सीटों के पेज पर होगा।',
    'sponsor.rqNoLearner':
      'इस खाते में अभी कोई शिक्षार्थी नहीं है, इसलिए किसी के लिए माँगा नहीं जा सकता।',
    'sponsor.rqNoCourse': 'अभी कोई कोर्स बिक्री पर नहीं है, इसलिए माँगने को कुछ नहीं है।',
    'sponsor.rqPrivacy':
      'यदि अनुरोध स्वीकृत हो जाए, तो प्रायोजक को सीट का कोड, कोर्स, वह बच्चे के लिए है या वयस्क के लिए, और क़ीमत दिखती है। आपका नाम, आपका परिवार या जो आपने यहाँ लिखा, वह कभी नहीं।',
    'sponsor.rqWhyReason': 'स्थिति के बारे में एक वाक्य लिखें। निर्णय लेने वाला यही पढ़ता है।',
    'sponsor.rqWhyHas':
      'उस शिक्षार्थी के पास यह कोर्स पहले से है, इसलिए माँगने को कुछ नहीं है।',
    'sponsor.rqWhyAsked': 'इस कोर्स के लिए पहले से एक अनुरोध खुला है।',
  },
  fr: {
    'sponsor.lede':
      'Des cours que quelqu’un d’autre a payés, et des cours que vous avez payés pour que quelqu’un d’autre les suive. Aucune des deux parties n’apprend qui est l’autre.',
    'sponsor.off':
      'Le parrainage de places est désactivé pour le moment : aucune nouvelle place ne peut être demandée ni parrainée. Ce qui a été demandé ou parrainé auparavant reste affiché ici.',
    'sponsor.askedHeading': 'Ce que j’ai demandé',
    'sponsor.askedUnread':
      'Vos demandes n’ont pas pu être lues pour l’instant. Rien n’a changé : cette page ne fait que lire.',
    'sponsor.askedNone': 'Vous n’avez pas demandé de place parrainée.',
    'sponsor.askedHow':
      'Si un cours est hors de portée, vous pouvez demander. Cela ne coûte rien et n’oblige personne.',
    'sponsor.askLink': 'Demander une place parrainée',
    'sponsor.aCourse': 'Un cours',
    'sponsor.forWhom': 'Pour : {name}',
    'sponsor.apSubmitted': 'En attente de lecture',
    'sponsor.apApproved': 'Approuvée, en attente d’un parrainage',
    'sponsor.apFunded': 'Financée : quelqu’un a payé cette place',
    'sponsor.apDeclined': 'Non approuvée',
    'sponsor.apWithdrawn': 'Demande retirée',
    'sponsor.seat': 'Place : {code}',
    'sponsor.staffNote': 'Ce que l’équipe a écrit, dans ses propres mots :',
    'sponsor.askedOn': 'Demandée le {date}',
    'sponsor.decidedOn': 'Décision du {date}',
    'sponsor.coveredLead': 'Une place que vous avez demandée a été financée.',
    'sponsor.coveredBody':
      'Le cours est maintenant ouvert à l’apprenant. La personne qui a payé n’est pas nommée ici, et c’est voulu : qui a donné, cela reste entre la personne qui donne et Allah.',
    'sponsor.gaveHeading': 'Ce que j’ai parrainé',
    'sponsor.gaveUnread':
      'Vos parrainages n’ont pas pu être lus pour l’instant. Rien n’a changé : cette page ne fait que lire.',
    'sponsor.gaveNone': 'Vous n’avez parrainé aucune place.',
    'sponsor.gaveHow': 'Chaque place en attente est un cours que quelqu’un a demandé.',
    'sponsor.spPledged': 'Promesse faite : en attente de l’enregistrement du paiement',
    'sponsor.spPaid': 'Payée, et la place est ouverte',
    'sponsor.spWithdrawn': 'Annulée',
    'sponsor.amount': 'Montant : {amount}',
    'sponsor.reference': 'Référence : {reference}',
    'sponsor.nextPledged':
      'Rien n’est prélevé automatiquement : cette page n’encaisse aucun paiement. L’équipe enregistre le paiement ici lorsqu’il parvient à la plateforme, et la place s’ouvre à ce moment-là.',
    'sponsor.nextPaid':
      'Enregistré. La place est ouverte à l’apprenant, à qui l’on n’a pas dit qui a payé.',
    'sponsor.nextWithdrawn':
      'Cette promesse a été annulée ; aucune somme n’est donc attendue pour elle.',
    'sponsor.pledgedOn': 'Promesse du {date}',
    'sponsor.recordedOn': 'Paiement enregistré le {date}',
    'sponsor.zakat':
      'Savoir si une place parrainée compte comme zakat, comme sadaqa ou comme ni l’une ni l’autre relève de l’avis d’un savant, et cette plateforme ne le donne pas. Demandez à une personne de confiance avant de donner.',
    'sponsor.pay': 'Payer cette promesse',
    'sponsor.payLede':
      'La place s’ouvre à l’apprenant dès que le paiement est confirmé. Aucune des deux parties n’apprend qui est l’autre.',
    'sponsor.payApprove':
      'Approuvez le paiement sur votre téléphone. La place s’ouvre à l’apprenant dès que le paiement est confirmé. Cela peut prendre un moment.',
    'sponsor.payNot':
      'Cette promesse ne peut pas être payée ici : elle a été payée ou annulée, ou elle ne fait pas partie des vôtres.',
    'sponsor.nextPay':
      'Rien n’est prélevé tant que vous n’avez pas payé. La place s’ouvre lorsque le paiement est confirmé.',
    'sponsor.plEyebrow': 'Parrainage',
    'sponsor.plTitle': 'Payer le cours de quelqu’un d’autre',
    'sponsor.plLede':
      'Un apprenant qui ne peut pas payer un cours le demande, et l’équipe décide. Une demande approuvée apparaît ici sous la forme d’une place, avec un code et le prix du cours, et jamais un nom. Vous choisissez une place ; l’apprenant reçoit le cours.',
    'sponsor.plSeeHeading': 'Ce que vous voyez, et ce que vous ne voyez pas',
    'sponsor.plSeeBody':
      'Le code de la place, le cours, s’il s’adresse à un enfant ou à un adulte, et le prix dans votre pays. Ni le nom, ni l’âge, ni la famille de l’apprenant, ni un mot de ce qui a été écrit. Cela est lu par les membres de l’équipe qui décident, et par personne d’autre.',
    'sponsor.plPayHeading': 'Ce que vous payez, et quand',
    'sponsor.plPayBody':
      'Le prix du cours dans votre pays, calculé comme pour un achat. Prendre une place est une promesse et ne prélève rien. Votre page des places parrainées indique comment la promesse se paie, et la place s’ouvre à l’apprenant lorsque le paiement est confirmé.',
    'sponsor.plListHeading': 'Places en attente d’un parrainage',
    'sponsor.plSignIn': 'Les places sont montrées aux personnes connectées.',
    'sponsor.plUnread':
      'Les places n’ont pas pu être lues. Rien n’a été débité et aucune place n’a été prise.',
    'sponsor.plOff':
      'Le parrainage de places est désactivé pour le moment ; aucune place ne peut donc être prise ni demandée.',
    'sponsor.plNone':
      'Aucune place n’attend de parrainage pour le moment. Une demande apparaît ici une fois approuvée par l’équipe.',
    'sponsor.plForChild': 'Pour un enfant',
    'sponsor.plForAdult': 'Pour un adulte',
    'sponsor.plPriceNote':
      'Le prix de ce cours dans votre pays. C’est la place qui est parrainée, pas une carte cadeau.',
    'sponsor.plNoPrice':
      'Ce cours n’a pas de prix dans votre pays ; cette place ne peut donc pas être prise d’ici.',
    'sponsor.plPriceUnread':
      'Le prix de cette place n’a pas pu être lu ; elle ne peut donc pas être prise pour l’instant.',
    'sponsor.plNoteLabel': 'Un mot pour l’équipe, si vous le souhaitez',
    'sponsor.plTake': 'Parrainer cette place',
    'sponsor.plTaken': 'Cette place est à vous, à payer : {amount}',
    'sponsor.plTakenNext':
      'Rien n’a été prélevé. Votre page des places parrainées indique comment payer.',
    'sponsor.plWhyGone':
      'Cette place vient d’être prise, ou n’est plus ouverte. Choisissez-en une autre.',
    'sponsor.plWhyOwn':
      'C’est la place que vous avez demandée. Vous ne pouvez pas parrainer votre propre demande.',
    'sponsor.tooLong': 'C’est plus long que ce que cette zone peut contenir.',
    'sponsor.plWhyFailed': 'Cela n’a pas fonctionné. Rien n’a été débité et rien n’a changé.',
    'sponsor.unconfirmed':
      'Nous n’avons pas pu confirmer que cela a été enregistré. Consultez vos places parrainées avant de réessayer.',
    'sponsor.plAskHeading': 'Demander une place',
    'sponsor.rqLede':
      'Si un cours est hors de portée, écrivez quelques phrases sur la situation. L’équipe les lit et répond dans les deux cas, avec un motif. Demander ne coûte rien et n’oblige personne.',
    'sponsor.rqCourse': 'Quel cours ?',
    'sponsor.rqChoose': 'Choisissez un cours',
    'sponsor.rqReason': 'Quelle est la situation ?',
    'sponsor.rqReasonNote':
      'Lu par les membres de l’équipe qui décident, et par personne d’autre. Jamais montré à la personne qui paie la place.',
    'sponsor.rqSubmit': 'Demander cette place',
    'sponsor.rqDone':
      'Demande envoyée. L’équipe la lira, et la réponse, avec son motif, figurera sur votre page des places parrainées.',
    'sponsor.rqNoLearner':
      'Il n’y a pas encore d’apprenant sur ce compte ; il n’y a donc personne pour qui demander.',
    'sponsor.rqNoCourse':
      'Aucun cours n’est en vente pour le moment ; il n’y a donc rien à demander.',
    'sponsor.rqPrivacy':
      'Si la demande est approuvée, la personne qui parraine voit le code de la place, le cours, s’il s’adresse à un enfant ou à un adulte, et le prix. Jamais votre nom, votre famille ni ce que vous avez écrit ici.',
    'sponsor.rqWhyReason':
      'Écrivez une phrase sur la situation. C’est ce que lit la personne qui décide.',
    'sponsor.rqWhyHas': 'Cet apprenant a déjà ce cours ; il n’y a donc rien à demander.',
    'sponsor.rqWhyAsked': 'Une demande est déjà ouverte pour ce cours.',
  },
  es: {
    'sponsor.lede':
      'Cursos que pagó otra persona, y cursos que usted pagó para que otra persona los siga. Ninguna de las dos partes llega a saber quién es la otra.',
    'sponsor.off':
      'El patrocinio de plazas está desactivado en este momento, así que no se puede solicitar ni patrocinar ninguna plaza nueva. Lo que se solicitó o patrocinó antes se sigue mostrando aquí.',
    'sponsor.askedHeading': 'Lo que he solicitado',
    'sponsor.askedUnread':
      'Sus solicitudes no se han podido leer ahora. No ha cambiado nada: esta página solo lee.',
    'sponsor.askedNone': 'No ha solicitado ninguna plaza patrocinada.',
    'sponsor.askedHow':
      'Si un curso está fuera de su alcance, puede solicitarlo. No cuesta nada y no obliga a nadie.',
    'sponsor.askLink': 'Solicitar una plaza patrocinada',
    'sponsor.aCourse': 'Un curso',
    'sponsor.forWhom': 'Para: {name}',
    'sponsor.apSubmitted': 'A la espera de que alguien la lea',
    'sponsor.apApproved': 'Aprobada, a la espera de un patrocinio',
    'sponsor.apFunded': 'Cubierta: alguien pagó esta plaza',
    'sponsor.apDeclined': 'No aprobada',
    'sponsor.apWithdrawn': 'Solicitud retirada',
    'sponsor.seat': 'Plaza: {code}',
    'sponsor.staffNote': 'Lo que escribió el equipo, con sus propias palabras:',
    'sponsor.askedOn': 'Solicitada el {date}',
    'sponsor.decidedOn': 'Decisión del {date}',
    'sponsor.coveredLead': 'Se ha cubierto una plaza que usted solicitó.',
    'sponsor.coveredBody':
      'El curso ya está abierto para el alumno. Quien pagó no aparece nombrado aquí, y es a propósito: quién dio queda entre quien da y Allah.',
    'sponsor.gaveHeading': 'Lo que he patrocinado',
    'sponsor.gaveUnread':
      'Sus patrocinios no se han podido leer ahora. No ha cambiado nada: esta página solo lee.',
    'sponsor.gaveNone': 'No ha patrocinado ninguna plaza.',
    'sponsor.gaveHow': 'Cada plaza en espera es un curso que alguien solicitó.',
    'sponsor.spPledged': 'Comprometido: a la espera de que se registre el pago',
    'sponsor.spPaid': 'Pagado, y la plaza está abierta',
    'sponsor.spWithdrawn': 'Cancelado',
    'sponsor.amount': 'Importe: {amount}',
    'sponsor.reference': 'Referencia: {reference}',
    'sponsor.nextPledged':
      'No se cobra nada automáticamente: esta página no recauda ningún pago. El equipo registra el pago aquí cuando llega a la plataforma, y la plaza se abre al registrarlo.',
    'sponsor.nextPaid':
      'Registrado. La plaza está abierta para el alumno, a quien no se le ha dicho quién pagó.',
    'sponsor.nextWithdrawn': 'Este compromiso se canceló, así que no se espera dinero por él.',
    'sponsor.pledgedOn': 'Comprometido el {date}',
    'sponsor.recordedOn': 'Pago registrado el {date}',
    'sponsor.zakat':
      'Si una plaza patrocinada cuenta como zakat, como sadaqa o como ninguna de las dos es un dictamen que corresponde a un sabio, y esta plataforma no lo emite. Pregunte a alguien de su confianza antes de dar.',
    'sponsor.pay': 'Pagar este compromiso',
    'sponsor.payLede':
      'La plaza se abre para el alumno en cuanto se confirma el pago. Ninguna de las dos partes llega a saber quién es la otra.',
    'sponsor.payApprove':
      'Apruebe el pago en su teléfono. La plaza se abre para el alumno cuando se confirma el pago. Puede tardar un momento.',
    'sponsor.payNot':
      'Este compromiso no se puede pagar aquí: ya se pagó o se canceló, o no es uno de los suyos.',
    'sponsor.nextPay':
      'No se cobra nada hasta que usted pague. La plaza se abre cuando se confirma el pago.',
    'sponsor.plEyebrow': 'Patrocinio',
    'sponsor.plTitle': 'Pagar el curso de otra persona',
    'sponsor.plLede':
      'Un alumno que no puede pagar un curso lo solicita, y el equipo decide. Una solicitud aprobada aparece aquí como una plaza, con un código y el precio del curso, y nunca con un nombre. Usted elige una plaza; el alumno recibe el curso.',
    'sponsor.plSeeHeading': 'Lo que usted ve, y lo que no',
    'sponsor.plSeeBody':
      'El código de la plaza, el curso, si es para un niño o para un adulto, y el precio en su país. No el nombre, la edad ni la familia del alumno, ni una palabra de lo que escribió. Eso lo lee el personal del equipo que decide, y nadie más.',
    'sponsor.plPayHeading': 'Lo que usted paga, y cuándo',
    'sponsor.plPayBody':
      'El precio del curso en su país, calculado igual que en una compra. Tomar una plaza es un compromiso y no cobra nada. Su página de plazas patrocinadas indica cómo se paga el compromiso, y la plaza se abre para el alumno cuando se confirma el pago.',
    'sponsor.plListHeading': 'Plazas a la espera de un patrocinio',
    'sponsor.plSignIn': 'Las plazas se muestran a quienes han iniciado sesión.',
    'sponsor.plUnread':
      'No se pudieron leer las plazas. No se ha cobrado nada y no se ha tomado ninguna plaza.',
    'sponsor.plOff':
      'El patrocinio de plazas está desactivado por ahora, así que no se puede tomar ni solicitar ninguna plaza.',
    'sponsor.plNone':
      'Ahora mismo ninguna plaza espera un patrocinio. Una solicitud aparece aquí cuando el equipo la aprueba.',
    'sponsor.plForChild': 'Para un niño',
    'sponsor.plForAdult': 'Para un adulto',
    'sponsor.plPriceNote':
      'El precio de este curso en su país. Lo que se patrocina es la plaza, no una tarjeta regalo.',
    'sponsor.plNoPrice':
      'Este curso no tiene precio en su país, así que esta plaza no se puede tomar desde aquí.',
    'sponsor.plPriceUnread':
      'No se pudo leer el precio de esta plaza, así que por ahora no se puede tomar.',
    'sponsor.plNoteLabel': 'Una nota para el equipo, si lo desea',
    'sponsor.plTake': 'Patrocinar esta plaza',
    'sponsor.plTaken': 'Esta plaza es suya para pagarla: {amount}',
    'sponsor.plTakenNext':
      'No se ha cobrado nada. Su página de plazas patrocinadas indica cómo pagar.',
    'sponsor.plWhyGone': 'Esa plaza se acaba de tomar, o ya no está abierta. Elija otra.',
    'sponsor.plWhyOwn':
      'Esa es la plaza que usted solicitó. No puede patrocinar su propia solicitud.',
    'sponsor.tooLong': 'Eso es más largo de lo que cabe en este cuadro.',
    'sponsor.plWhyFailed': 'No funcionó. No se ha cobrado nada y no ha cambiado nada.',
    'sponsor.unconfirmed':
      'No pudimos confirmar si eso quedó registrado. Consulte sus plazas patrocinadas antes de volver a intentarlo.',
    'sponsor.plAskHeading': 'Solicitar una plaza',
    'sponsor.rqLede':
      'Si un curso está fuera de su alcance, escriba unas frases sobre la situación. El equipo las lee y responde en ambos casos, con un motivo. Solicitar no cuesta nada y no obliga a nadie.',
    'sponsor.rqCourse': '¿Qué curso?',
    'sponsor.rqChoose': 'Elija un curso',
    'sponsor.rqReason': '¿Cuál es la situación?',
    'sponsor.rqReasonNote':
      'Lo lee el personal del equipo que decide, y nadie más. No se muestra a quien paga la plaza.',
    'sponsor.rqSubmit': 'Solicitar esta plaza',
    'sponsor.rqDone':
      'Solicitud enviada. El equipo la leerá, y la respuesta, con su motivo, estará en su página de plazas patrocinadas.',
    'sponsor.rqNoLearner':
      'Todavía no hay ningún alumno en esta cuenta, así que no hay nadie para quien solicitar.',
    'sponsor.rqNoCourse':
      'Ahora mismo no hay ningún curso a la venta, así que no hay nada que solicitar.',
    'sponsor.rqPrivacy':
      'Si la solicitud se aprueba, quien patrocina ve el código de la plaza, el curso, si es para un niño o para un adulto, y el precio. Nunca su nombre, su familia ni lo que usted escribió aquí.',
    'sponsor.rqWhyReason': 'Escriba una frase sobre la situación. Es lo que lee quien decide.',
    'sponsor.rqWhyHas': 'Ese alumno ya tiene este curso, así que no hay nada que solicitar.',
    'sponsor.rqWhyAsked': 'Ya hay una solicitud abierta para este curso.',
  },
  pt: {
    'sponsor.lede':
      'Cursos que outra pessoa pagou, e cursos que pagou para que outra pessoa os siga. Nenhuma das partes chega a saber quem é a outra.',
    'sponsor.off':
      'O patrocínio de lugares está desligado neste momento, por isso não é possível pedir nem patrocinar nenhum lugar novo. O que foi pedido ou patrocinado antes continua a ser mostrado aqui.',
    'sponsor.askedHeading': 'O que pedi',
    'sponsor.askedUnread':
      'Não foi possível ler os seus pedidos agora. Nada mudou: esta página só lê.',
    'sponsor.askedNone': 'Não pediu nenhum lugar patrocinado.',
    'sponsor.askedHow':
      'Se um curso estiver fora do seu alcance, pode pedir. Não custa nada e não obriga ninguém.',
    'sponsor.askLink': 'Pedir um lugar patrocinado',
    'sponsor.aCourse': 'Um curso',
    'sponsor.forWhom': 'Para: {name}',
    'sponsor.apSubmitted': 'À espera de que alguém o leia',
    'sponsor.apApproved': 'Aprovado, à espera de um patrocínio',
    'sponsor.apFunded': 'Coberto: alguém pagou este lugar',
    'sponsor.apDeclined': 'Não aprovado',
    'sponsor.apWithdrawn': 'Pedido retirado',
    'sponsor.seat': 'Lugar: {code}',
    'sponsor.staffNote': 'O que a equipa escreveu, pelas suas próprias palavras:',
    'sponsor.askedOn': 'Pedido em {date}',
    'sponsor.decidedOn': 'Decisão em {date}',
    'sponsor.coveredLead': 'Um lugar que pediu foi coberto.',
    'sponsor.coveredBody':
      'O curso já está aberto para o aluno. Quem pagou não é nomeado aqui, e isso é de propósito: quem deu fica entre quem dá e Allah.',
    'sponsor.gaveHeading': 'O que patrocinei',
    'sponsor.gaveUnread':
      'Não foi possível ler os seus patrocínios agora. Nada mudou: esta página só lê.',
    'sponsor.gaveNone': 'Não patrocinou nenhum lugar.',
    'sponsor.gaveHow': 'Cada lugar à espera é um curso que alguém pediu.',
    'sponsor.spPledged': 'Prometido: à espera do registo do pagamento',
    'sponsor.spPaid': 'Pago, e o lugar está aberto',
    'sponsor.spWithdrawn': 'Cancelado',
    'sponsor.amount': 'Montante: {amount}',
    'sponsor.reference': 'Referência: {reference}',
    'sponsor.nextPledged':
      'Nada é cobrado automaticamente: esta página não recolhe nenhum pagamento. A equipa regista o pagamento aqui quando ele chega à plataforma, e o lugar abre nesse momento.',
    'sponsor.nextPaid':
      'Registado. O lugar está aberto para o aluno, a quem não foi dito quem pagou.',
    'sponsor.nextWithdrawn':
      'Esta promessa foi cancelada, por isso não se espera dinheiro por ela.',
    'sponsor.pledgedOn': 'Prometido em {date}',
    'sponsor.recordedOn': 'Pagamento registado em {date}',
    'sponsor.zakat':
      'Se um lugar patrocinado conta como zakat, como sadaqa ou como nenhum dos dois é um parecer que cabe a um sábio, e esta plataforma não o emite. Pergunte a alguém em quem confia antes de dar.',
    'sponsor.pay': 'Pagar esta promessa',
    'sponsor.payLede':
      'O lugar abre para o aluno assim que o pagamento for confirmado. Nenhuma das partes chega a saber quem é a outra.',
    'sponsor.payApprove':
      'Aprove o pagamento no seu telemóvel. O lugar abre para o aluno assim que o pagamento for confirmado. Pode demorar um momento.',
    'sponsor.payNot':
      'Esta promessa não pode ser paga aqui: já foi paga ou cancelada, ou não é uma das suas.',
    'sponsor.nextPay':
      'Nada é cobrado até pagar. O lugar abre quando o pagamento for confirmado.',
    'sponsor.plEyebrow': 'Patrocínio',
    'sponsor.plTitle': 'Pagar o curso de outra pessoa',
    'sponsor.plLede':
      'Um aluno que não consegue pagar um curso pede-o, e a equipa decide. Um pedido aprovado aparece aqui como um lugar, com um código e o preço do curso, e nunca com um nome. Escolhe um lugar; o aluno recebe o curso.',
    'sponsor.plSeeHeading': 'O que vê, e o que não vê',
    'sponsor.plSeeBody':
      'O código do lugar, o curso, se é para uma criança ou para um adulto, e o preço no seu país. Não o nome, a idade nem a família do aluno, nem uma palavra do que foi escrito. Isso é lido pelas pessoas da equipa que decidem, e por mais ninguém.',
    'sponsor.plPayHeading': 'O que paga, e quando',
    'sponsor.plPayBody':
      'O preço do curso no seu país, calculado como numa compra. Ficar com um lugar é uma promessa e não cobra nada. A sua página de lugares patrocinados indica como a promessa é paga, e o lugar abre para o aluno quando o pagamento for confirmado.',
    'sponsor.plListHeading': 'Lugares à espera de um patrocínio',
    'sponsor.plSignIn': 'Os lugares são mostrados a quem iniciou sessão.',
    'sponsor.plUnread':
      'Não foi possível ler os lugares. Nada foi cobrado e nenhum lugar foi ocupado.',
    'sponsor.plOff':
      'O patrocínio de lugares está desligado de momento, por isso nenhum lugar pode ser ocupado nem pedido.',
    'sponsor.plNone':
      'De momento nenhum lugar espera um patrocínio. Um pedido aparece aqui depois de a equipa o aprovar.',
    'sponsor.plForChild': 'Para uma criança',
    'sponsor.plForAdult': 'Para um adulto',
    'sponsor.plPriceNote':
      'O preço deste curso no seu país. O que é patrocinado é o lugar, não um cartão de oferta.',
    'sponsor.plNoPrice':
      'Este curso não tem preço no seu país, por isso este lugar não pode ser ocupado a partir daqui.',
    'sponsor.plPriceUnread':
      'Não foi possível ler o preço deste lugar, por isso não pode ser ocupado por agora.',
    'sponsor.plNoteLabel': 'Uma nota para a equipa, se quiser',
    'sponsor.plTake': 'Patrocinar este lugar',
    'sponsor.plTaken': 'Este lugar é seu para pagar: {amount}',
    'sponsor.plTakenNext':
      'Nada foi cobrado. A sua página de lugares patrocinados indica como pagar.',
    'sponsor.plWhyGone':
      'Esse lugar acabou de ser ocupado, ou já não está aberto. Escolha outro.',
    'sponsor.plWhyOwn': 'Esse é o lugar que pediu. Não pode patrocinar o seu próprio pedido.',
    'sponsor.tooLong': 'Isso é mais longo do que esta caixa comporta.',
    'sponsor.plWhyFailed': 'Não resultou. Nada foi cobrado e nada mudou.',
    'sponsor.unconfirmed':
      'Não conseguimos confirmar se isso ficou registado. Veja os seus lugares patrocinados antes de tentar de novo.',
    'sponsor.plAskHeading': 'Pedir um lugar',
    'sponsor.rqLede':
      'Se um curso estiver fora do seu alcance, escreva algumas frases sobre a situação. A equipa lê-as e responde nos dois casos, com um motivo. Pedir não custa nada e não obriga ninguém.',
    'sponsor.rqCourse': 'Que curso?',
    'sponsor.rqChoose': 'Escolha um curso',
    'sponsor.rqReason': 'Qual é a situação?',
    'sponsor.rqReasonNote':
      'Lido pelas pessoas da equipa que decidem, e por mais ninguém. Não é mostrado a quem paga o lugar.',
    'sponsor.rqSubmit': 'Pedir este lugar',
    'sponsor.rqDone':
      'Pedido enviado. A equipa vai lê-lo, e a resposta, com o seu motivo, estará na sua página de lugares patrocinados.',
    'sponsor.rqNoLearner':
      'Ainda não há nenhum aluno nesta conta, por isso não há ninguém para quem pedir.',
    'sponsor.rqNoCourse':
      'De momento não há nenhum curso à venda, por isso não há nada para pedir.',
    'sponsor.rqPrivacy':
      'Se o pedido for aprovado, quem patrocina vê o código do lugar, o curso, se é para uma criança ou para um adulto, e o preço. Nunca o seu nome, a sua família nem o que escreveu aqui.',
    'sponsor.rqWhyReason': 'Escreva uma frase sobre a situação. É o que lê quem decide.',
    'sponsor.rqWhyHas': 'Esse aluno já tem este curso, por isso não há nada para pedir.',
    'sponsor.rqWhyAsked': 'Já existe um pedido aberto para este curso.',
  },
  sw: {
    'sponsor.lede':
      'Kozi ambazo mtu mwingine alizilipia, na kozi ulizolipia ili mtu mwingine azisome. Hakuna upande unaojua upande mwingine ni nani.',
    'sponsor.off':
      'Ufadhili wa nafasi umezimwa kwa sasa, kwa hiyo hakuna nafasi mpya inayoweza kuombwa wala kufadhiliwa. Kilichoombwa au kufadhiliwa awali bado kinaonyeshwa hapa.',
    'sponsor.askedHeading': 'Nilichoomba',
    'sponsor.askedUnread':
      'Maombi yako hayakuweza kusomwa sasa hivi. Hakuna kilichobadilika: ukurasa huu unasoma tu.',
    'sponsor.askedNone': 'Hujaomba nafasi iliyofadhiliwa.',
    'sponsor.askedHow':
      'Ikiwa kozi iko nje ya uwezo wako, unaweza kuomba. Haina gharama na haimlazimishi mtu yeyote.',
    'sponsor.askLink': 'Omba nafasi iliyofadhiliwa',
    'sponsor.aCourse': 'Kozi',
    'sponsor.forWhom': 'Kwa ajili ya: {name}',
    'sponsor.apSubmitted': 'Linasubiri mtu alisome',
    'sponsor.apApproved': 'Limekubaliwa, linasubiri mfadhili',
    'sponsor.apFunded': 'Imelipiwa: mtu amelipia nafasi hii',
    'sponsor.apDeclined': 'Halikukubaliwa',
    'sponsor.apWithdrawn': 'Ombi limeondolewa',
    'sponsor.seat': 'Nafasi: {code}',
    'sponsor.staffNote': 'Walichoandika wafanyakazi, kwa maneno yao wenyewe:',
    'sponsor.askedOn': 'Tarehe ya ombi: {date}',
    'sponsor.decidedOn': 'Tarehe ya uamuzi: {date}',
    'sponsor.coveredLead': 'Nafasi uliyoomba imelipiwa.',
    'sponsor.coveredBody':
      'Kozi sasa iko wazi kwa mwanafunzi. Aliyelipa hatajwi hapa, na hilo ni kwa makusudi: nani alitoa ni jambo kati ya mtoaji na Allah.',
    'sponsor.gaveHeading': 'Nilichofadhili',
    'sponsor.gaveUnread':
      'Ufadhili wako haukuweza kusomwa sasa hivi. Hakuna kilichobadilika: ukurasa huu unasoma tu.',
    'sponsor.gaveNone': 'Hujafadhili nafasi yoyote.',
    'sponsor.gaveHow': 'Kila nafasi inayosubiri ni kozi ambayo mtu aliiomba.',
    'sponsor.spPledged': 'Ahadi imetolewa: inasubiri malipo yarekodiwe',
    'sponsor.spPaid': 'Imelipwa, na nafasi iko wazi',
    'sponsor.spWithdrawn': 'Imesitishwa',
    'sponsor.amount': 'Kiasi: {amount}',
    'sponsor.reference': 'Kumbukumbu: {reference}',
    'sponsor.nextPledged':
      'Hakuna kinachochukuliwa kiotomatiki: ukurasa huu haukusanyi malipo. Wafanyakazi hurekodi malipo hapa yanapofika kwenye jukwaa, na nafasi hufunguliwa yanaporekodiwa.',
    'sponsor.nextPaid':
      'Imerekodiwa. Nafasi iko wazi kwa mwanafunzi, na mwanafunzi hajaambiwa nani alilipa.',
    'sponsor.nextWithdrawn':
      'Ahadi hii ilisitishwa, kwa hiyo hakuna pesa inayotarajiwa kwa ajili yake.',
    'sponsor.pledgedOn': 'Tarehe ya ahadi: {date}',
    'sponsor.recordedOn': 'Tarehe ya kurekodiwa kwa malipo: {date}',
    'sponsor.zakat':
      'Iwapo nafasi iliyofadhiliwa inahesabika kuwa zaka, sadaka au si mojawapo ni hukumu ya mwanazuoni, na jukwaa hili halitoi hukumu hiyo. Muulize mtu unayemwamini kabla ya kutoa.',
    'sponsor.pay': 'Lipa ahadi hii',
    'sponsor.payLede':
      'Nafasi hufunguliwa kwa mwanafunzi mara malipo yanapothibitishwa. Hakuna upande unaojua upande mwingine ni nani.',
    'sponsor.payApprove':
      'Idhinisha malipo kwenye simu yako. Nafasi hufunguliwa kwa mwanafunzi malipo yanapothibitishwa. Hii inaweza kuchukua muda kidogo.',
    'sponsor.payNot':
      'Ahadi hii haiwezi kulipwa hapa: imeshalipwa au imesitishwa, au si mojawapo ya ahadi zako.',
    'sponsor.nextPay':
      'Hakuna kinachochukuliwa hadi ulipe. Nafasi hufunguliwa malipo yanapothibitishwa.',
    'sponsor.plEyebrow': 'Ufadhili',
    'sponsor.plTitle': 'Mlipie mtu mwingine kozi',
    'sponsor.plLede':
      'Mwanafunzi asiyeweza kulipia kozi huiomba, na wafanyakazi huamua. Ombi lililokubaliwa huonekana hapa kama nafasi yenye msimbo na bei ya kozi, na kamwe halina jina. Wewe unachagua nafasi; mwanafunzi anapata kozi.',
    'sponsor.plSeeHeading': 'Unachokiona, na usichokiona',
    'sponsor.plSeeBody':
      'Msimbo wa nafasi, kozi, kama ni ya mtoto au ya mtu mzima, na bei katika nchi yako. Si jina la mwanafunzi, umri wake wala familia yake, wala neno lolote la alichoandika. Hilo husomwa na wafanyakazi wanaoamua, na hakuna mwingine.',
    'sponsor.plPayHeading': 'Unacholipa, na lini',
    'sponsor.plPayBody':
      'Bei ya kozi katika nchi yako, inayokokotolewa kama ya ununuzi. Kuchukua nafasi ni ahadi na hakuchukui pesa. Ukurasa wako wa nafasi zilizofadhiliwa unaeleza jinsi ahadi inavyolipwa, na nafasi hufunguliwa kwa mwanafunzi malipo yanapothibitishwa.',
    'sponsor.plListHeading': 'Nafasi zinazosubiri mfadhili',
    'sponsor.plSignIn': 'Nafasi huonyeshwa kwa watu walioingia.',
    'sponsor.plUnread':
      'Nafasi hazikuweza kusomwa. Hakuna kilichotozwa na hakuna nafasi iliyochukuliwa.',
    'sponsor.plOff':
      'Ufadhili wa nafasi umezimwa kwa sasa, kwa hiyo hakuna nafasi inayoweza kuchukuliwa wala kuombwa.',
    'sponsor.plNone':
      'Hakuna nafasi inayosubiri mfadhili kwa sasa. Ombi huonekana hapa baada ya wafanyakazi kulikubali.',
    'sponsor.plForChild': 'Kwa mtoto',
    'sponsor.plForAdult': 'Kwa mtu mzima',
    'sponsor.plPriceNote':
      'Bei ya kozi hii katika nchi yako. Kinachofadhiliwa ni nafasi, si kadi ya zawadi.',
    'sponsor.plNoPrice':
      'Kozi hii haina bei katika nchi yako, kwa hiyo nafasi hii haiwezi kuchukuliwa kutoka hapa.',
    'sponsor.plPriceUnread':
      'Bei ya nafasi hii haikuweza kusomwa, kwa hiyo haiwezi kuchukuliwa kwa sasa.',
    'sponsor.plNoteLabel': 'Ujumbe kwa wafanyakazi, ukipenda',
    'sponsor.plTake': 'Fadhili nafasi hii',
    'sponsor.plTaken': 'Nafasi hii sasa ni yako kuilipia: {amount}',
    'sponsor.plTakenNext':
      'Hakuna kilichochukuliwa. Ukurasa wako wa nafasi zilizofadhiliwa unaeleza jinsi ya kulipa.',
    'sponsor.plWhyGone':
      'Nafasi hiyo imechukuliwa sasa hivi, au haiko wazi tena. Chagua nyingine.',
    'sponsor.plWhyOwn': 'Hiyo ni nafasi uliyoiomba wewe. Huwezi kufadhili ombi lako mwenyewe.',
    'sponsor.tooLong': 'Hiyo ni ndefu kuliko kisanduku hiki kinavyoweza kubeba.',
    'sponsor.plWhyFailed': 'Haikufanikiwa. Hakuna kilichotozwa na hakuna kilichobadilika.',
    'sponsor.unconfirmed':
      'Hatukuweza kuthibitisha kama hilo lilirekodiwa. Angalia nafasi zako zilizofadhiliwa kabla ya kujaribu tena.',
    'sponsor.plAskHeading': 'Kuomba nafasi',
    'sponsor.rqLede':
      'Ikiwa kozi iko nje ya uwezo wako, andika sentensi chache kuhusu hali ilivyo. Wafanyakazi huzisoma na kujibu kwa vyovyote vile, pamoja na sababu. Kuomba hakuna gharama na hakumlazimishi mtu yeyote.',
    'sponsor.rqCourse': 'Kozi ipi?',
    'sponsor.rqChoose': 'Chagua kozi',
    'sponsor.rqReason': 'Hali ikoje?',
    'sponsor.rqReasonNote':
      'Husomwa na wafanyakazi wanaoamua, na hakuna mwingine. Haionyeshwi kwa anayelipia nafasi.',
    'sponsor.rqSubmit': 'Omba nafasi hii',
    'sponsor.rqDone':
      'Limeombwa. Wafanyakazi watalisoma, na jibu, pamoja na sababu yake, litakuwa kwenye ukurasa wako wa nafasi zilizofadhiliwa.',
    'sponsor.rqNoLearner':
      'Bado hakuna mwanafunzi kwenye akaunti hii, kwa hiyo hakuna wa kumwombea.',
    'sponsor.rqNoCourse': 'Hakuna kozi inayouzwa kwa sasa, kwa hiyo hakuna cha kuomba.',
    'sponsor.rqPrivacy':
      'Ombi likikubaliwa, mfadhili huona msimbo wa nafasi, kozi, kama ni ya mtoto au ya mtu mzima, na bei. Kamwe si jina lako, familia yako wala ulichoandika hapa.',
    'sponsor.rqWhyReason': 'Andika sentensi moja kuhusu hali ilivyo. Ndiyo anayosoma anayeamua.',
    'sponsor.rqWhyHas': 'Mwanafunzi huyo tayari ana kozi hii, kwa hiyo hakuna cha kuomba.',
    'sponsor.rqWhyAsked': 'Tayari kuna ombi lililo wazi la kozi hii.',
  },
  af: {
    'sponsor.lede':
      'Kursusse waarvoor iemand anders betaal het, en kursusse waarvoor jy betaal het sodat iemand anders dit kan volg. Nie een van die twee kante kom agter wie die ander is nie.',
    'sponsor.off':
      'Die borg van plekke is tans afgeskakel, dus kan geen nuwe plek aangevra of geborg word nie. Wat vroeër aangevra of geborg is, word steeds hier gewys.',
    'sponsor.askedHeading': 'Wat ek aangevra het',
    'sponsor.askedUnread':
      'Jou versoeke kon nie nou gelees word nie. Niks het verander nie: hierdie bladsy lees net.',
    'sponsor.askedNone': 'Jy het nie ’n geborgde plek aangevra nie.',
    'sponsor.askedHow':
      'As ’n kursus buite jou bereik is, kan jy vra. Dit kos niks en verplig niemand nie.',
    'sponsor.askLink': 'Vra ’n geborgde plek aan',
    'sponsor.aCourse': '’n Kursus',
    'sponsor.forWhom': 'Vir: {name}',
    'sponsor.apSubmitted': 'Wag dat iemand dit lees',
    'sponsor.apApproved': 'Goedgekeur, en wag vir ’n borg',
    'sponsor.apFunded': 'Gedek: iemand het vir hierdie plek betaal',
    'sponsor.apDeclined': 'Nie goedgekeur nie',
    'sponsor.apWithdrawn': 'Versoek teruggetrek',
    'sponsor.seat': 'Plek: {code}',
    'sponsor.staffNote': 'Wat die personeel geskryf het, in hul eie woorde:',
    'sponsor.askedOn': 'Aangevra op {date}',
    'sponsor.decidedOn': 'Besluit op {date}',
    'sponsor.coveredLead': '’n Plek wat jy aangevra het, is gedek.',
    'sponsor.coveredBody':
      'Die kursus is nou oop vir die leerder. Wie betaal het, word nie hier genoem nie, en dit is met opset: wie gegee het, is tussen die gewer en Allah.',
    'sponsor.gaveHeading': 'Wat ek geborg het',
    'sponsor.gaveUnread':
      'Jou borgskappe kon nie nou gelees word nie. Niks het verander nie: hierdie bladsy lees net.',
    'sponsor.gaveNone': 'Jy het nie ’n plek geborg nie.',
    'sponsor.gaveHow': 'Elke plek wat wag, is ’n kursus wat iemand aangevra het.',
    'sponsor.spPledged': 'Belowe: wag dat die betaling aangeteken word',
    'sponsor.spPaid': 'Betaal, en die plek is oop',
    'sponsor.spWithdrawn': 'Gekanselleer',
    'sponsor.amount': 'Bedrag: {amount}',
    'sponsor.reference': 'Verwysing: {reference}',
    'sponsor.nextPledged':
      'Niks word outomaties geneem nie: hierdie bladsy vorder geen betaling in nie. Die personeel teken die betaling hier aan wanneer dit die platform bereik, en die plek gaan oop wanneer dit aangeteken word.',
    'sponsor.nextPaid':
      'Aangeteken. Die plek is oop vir die leerder, en die leerder is nie vertel wie betaal het nie.',
    'sponsor.nextWithdrawn':
      'Hierdie belofte is gekanselleer, dus word geen geld daarvoor verwag nie.',
    'sponsor.pledgedOn': 'Belowe op {date}',
    'sponsor.recordedOn': 'Betaling aangeteken op {date}',
    'sponsor.zakat':
      'Of ’n geborgde plek as zakat, as sadaqah of as nie een van die twee tel nie, is ’n geleerde se uitspraak, en hierdie platform maak dit nie. Vra iemand wat jy vertrou voordat jy gee.',
    'sponsor.pay': 'Betaal hierdie belofte',
    'sponsor.payLede':
      'Die plek gaan vir die leerder oop sodra die betaling bevestig is. Nie een van die twee kante kom agter wie die ander is nie.',
    'sponsor.payApprove':
      'Keur die betaling op jou foon goed. Die plek gaan vir die leerder oop sodra die betaling bevestig is. Dit kan ’n oomblik neem.',
    'sponsor.payNot':
      'Hierdie belofte kan nie hier betaal word nie: dit is reeds betaal of gekanselleer, of dit is nie een van joune nie.',
    'sponsor.nextPay':
      'Niks word geneem totdat jy betaal nie. Die plek gaan oop wanneer die betaling bevestig is.',
    'sponsor.plEyebrow': 'Borgskap',
    'sponsor.plTitle': 'Betaal vir iemand anders se kursus',
    'sponsor.plLede':
      '’n Leerder wat nie ’n kursus kan bekostig nie, vra daarvoor, en die personeel besluit. ’n Goedgekeurde versoek verskyn hier as ’n plek met ’n kode en die prys van die kursus, en nooit met ’n naam nie. Jy kies ’n plek; die leerder kry die kursus.',
    'sponsor.plSeeHeading': 'Wat jy sien, en wat jy nie sien nie',
    'sponsor.plSeeBody':
      'Die kode van die plek, die kursus, of dit vir ’n kind of ’n volwassene is, en die prys in jou land. Nie die leerder se naam, ouderdom of gesin nie, en nie ’n woord van wat geskryf is nie. Dit word gelees deur die personeel wat besluit, en deur niemand anders nie.',
    'sponsor.plPayHeading': 'Wat jy betaal, en wanneer',
    'sponsor.plPayBody':
      'Die prys van die kursus in jou land, bereken soos vir ’n aankoop. Om ’n plek te neem is ’n belofte en neem geen geld nie. Jou bladsy van geborgde plekke sê hoe die belofte betaal word, en die plek gaan vir die leerder oop wanneer die betaling bevestig is.',
    'sponsor.plListHeading': 'Plekke wat vir ’n borg wag',
    'sponsor.plSignIn': 'Die plekke word gewys aan mense wat aangemeld is.',
    'sponsor.plUnread':
      'Die plekke kon nie gelees word nie. Niks is gehef nie en geen plek is geneem nie.',
    'sponsor.plOff':
      'Borgskap van plekke is tans afgeskakel, dus kan geen plek geneem of aangevra word nie.',
    'sponsor.plNone':
      'Geen plek wag tans vir ’n borg nie. ’n Versoek verskyn hier sodra die personeel dit goedkeur.',
    'sponsor.plForChild': 'Vir ’n kind',
    'sponsor.plForAdult': 'Vir ’n volwassene',
    'sponsor.plPriceNote':
      'Die prys van hierdie kursus in jou land. Dit is die plek wat geborg word, nie ’n geskenkkaart nie.',
    'sponsor.plNoPrice':
      'Hierdie kursus het geen prys in jou land nie, dus kan hierdie plek nie van hier af geneem word nie.',
    'sponsor.plPriceUnread':
      'Die prys van hierdie plek kon nie gelees word nie, dus kan dit nie nou geneem word nie.',
    'sponsor.plNoteLabel': '’n Nota vir die personeel, as jy wil',
    'sponsor.plTake': 'Borg hierdie plek',
    'sponsor.plTaken': 'Hierdie plek is joune om voor te betaal: {amount}',
    'sponsor.plTakenNext':
      'Niks is geneem nie. Jou bladsy van geborgde plekke sê hoe om te betaal.',
    'sponsor.plWhyGone':
      'Daardie plek is pas geneem, of is nie meer oop nie. Kies ’n ander een.',
    'sponsor.plWhyOwn':
      'Dit is die plek wat jy self aangevra het. Jy kan nie jou eie versoek borg nie.',
    'sponsor.tooLong': 'Dit is langer as wat hierdie blokkie kan hou.',
    'sponsor.plWhyFailed': 'Dit het nie gewerk nie. Niks is gehef nie en niks het verander nie.',
    'sponsor.unconfirmed':
      'Ons kon nie bevestig of dit aangeteken is nie. Kyk na jou geborgde plekke voordat jy weer probeer.',
    'sponsor.plAskHeading': 'Om ’n plek aan te vra',
    'sponsor.rqLede':
      'As ’n kursus buite jou bereik is, skryf ’n paar sinne oor die situasie. Die personeel lees dit en antwoord in albei gevalle, met ’n rede. Om te vra kos niks en verplig niemand nie.',
    'sponsor.rqCourse': 'Watter kursus?',
    'sponsor.rqChoose': 'Kies ’n kursus',
    'sponsor.rqReason': 'Wat is die situasie?',
    'sponsor.rqReasonNote':
      'Gelees deur die personeel wat besluit, en deur niemand anders nie. Word nie gewys aan wie vir die plek betaal nie.',
    'sponsor.rqSubmit': 'Vra hierdie plek aan',
    'sponsor.rqDone':
      'Aangevra. Die personeel sal dit lees, en die antwoord, met sy rede, sal op jou bladsy van geborgde plekke wees.',
    'sponsor.rqNoLearner':
      'Daar is nog geen leerder op hierdie rekening nie, dus is daar niemand om voor te vra nie.',
    'sponsor.rqNoCourse': 'Geen kursus is tans te koop nie, dus is daar niks om aan te vra nie.',
    'sponsor.rqPrivacy':
      'As die versoek goedgekeur word, sien ’n borg die kode van die plek, die kursus, of dit vir ’n kind of ’n volwassene is, en die prys. Nooit jou naam, jou gesin of wat jy hier geskryf het nie.',
    'sponsor.rqWhyReason':
      'Skryf ’n sin oor die situasie. Dit is wat die persoon wat besluit, lees.',
    'sponsor.rqWhyHas':
      'Daardie leerder het reeds hierdie kursus, dus is daar niks om aan te vra nie.',
    'sponsor.rqWhyAsked': 'Daar is reeds ’n oop versoek vir hierdie kursus.',
  },
  'zh-hans': {
    'sponsor.lede': '别人付费的课程，以及你为别人学习而付费的课程。双方都不会知道对方是谁。',
    'sponsor.off': '名额资助目前已关闭，因此不能申请新的名额，也不能资助新的名额。以前申请或资助过的仍显示在这里。',
    'sponsor.askedHeading': '我申请过的',
    'sponsor.askedUnread': '目前无法读取你的申请。没有任何更改：本页面只读取。',
    'sponsor.askedNone': '你没有申请过资助名额。',
    'sponsor.askedHow': '如果某门课程负担不起，你可以申请。申请不收费，也不使任何人承担义务。',
    'sponsor.askLink': '申请资助名额',
    'sponsor.aCourse': '一门课程',
    'sponsor.forWhom': '学习者：{name}',
    'sponsor.apSubmitted': '等待有人阅读',
    'sponsor.apApproved': '已批准，等待资助人',
    'sponsor.apFunded': '已获资助：有人为这个名额付了费',
    'sponsor.apDeclined': '未获批准',
    'sponsor.apWithdrawn': '申请已撤回',
    'sponsor.seat': '名额：{code}',
    'sponsor.staffNote': '工作人员写下的原话：',
    'sponsor.askedOn': '申请时间：{date}',
    'sponsor.decidedOn': '决定时间：{date}',
    'sponsor.coveredLead': '你申请的一个名额已获资助。',
    'sponsor.coveredBody': '课程现已向学习者开放。这里不写付费人的名字，这是有意的：是谁给的，是施予者与安拉之间的事。',
    'sponsor.gaveHeading': '我资助过的',
    'sponsor.gaveUnread': '目前无法读取你的资助。没有任何更改：本页面只读取。',
    'sponsor.gaveNone': '你没有资助过名额。',
    'sponsor.gaveHow': '每个等待中的名额，都是有人申请的一门课程。',
    'sponsor.spPledged': '已承诺：等待登记付款',
    'sponsor.spPaid': '已付款，名额已开放',
    'sponsor.spWithdrawn': '已取消',
    'sponsor.amount': '金额：{amount}',
    'sponsor.reference': '参考号：{reference}',
    'sponsor.nextPledged': '不会自动扣取任何款项：本页面不收款。款项到达平台后，由工作人员在这里登记，登记后名额开放。',
    'sponsor.nextPaid': '已登记。名额已向学习者开放，学习者没有被告知是谁付的费。',
    'sponsor.nextWithdrawn': '这项承诺已取消，因此不需要为它付款。',
    'sponsor.pledgedOn': '承诺时间：{date}',
    'sponsor.recordedOn': '付款登记时间：{date}',
    'sponsor.zakat': '资助名额算作天课、施舍，还是两者都不算，应由学者裁定，本平台不作这一裁定。给予之前，请询问你信任的人。',
    'sponsor.pay': '支付这项承诺',
    'sponsor.payLede': '付款一经确认，名额即向学习者开放。双方都不会知道对方是谁。',
    'sponsor.payApprove': '请在你的手机上批准付款。付款确认后，名额即向学习者开放。这可能需要一点时间。',
    'sponsor.payNot': '这项承诺无法在这里支付：它已支付或已取消，或者不是你的承诺。',
    'sponsor.nextPay': '在你付款之前不会扣取任何款项。付款确认后名额开放。',
    'sponsor.plEyebrow': '资助',
    'sponsor.plTitle': '为别人的课程付费',
    'sponsor.plLede':
      '负担不起某门课程的学习者提出申请，由工作人员决定。获批准的申请会在这里显示为一个名额，带有代码和课程价格，绝不带姓名。你选择一个名额；学习者得到课程。',
    'sponsor.plSeeHeading': '你能看到什么，看不到什么',
    'sponsor.plSeeBody':
      '名额代码、课程、面向儿童还是成人，以及你所在国家的价格。没有学习者的姓名、年龄或家庭，也没有他们所写内容的任何一个字。那些内容只由做决定的工作人员阅读，别人都看不到。',
    'sponsor.plPayHeading': '你付多少，何时付',
    'sponsor.plPayBody':
      '课程在你所在国家的价格，计算方式与购买时相同。领取名额是一项承诺，不会扣款。你的资助名额页面会说明如何支付这项承诺，付款确认后名额即向学习者开放。',
    'sponsor.plListHeading': '等待资助人的名额',
    'sponsor.plSignIn': '名额只向已登录的人显示。',
    'sponsor.plUnread': '无法读取名额。没有收取任何费用，也没有领取任何名额。',
    'sponsor.plOff': '名额资助目前已关闭，因此不能领取名额，也不能申请名额。',
    'sponsor.plNone': '目前没有名额在等待资助人。申请经工作人员批准后会显示在这里。',
    'sponsor.plForChild': '面向儿童',
    'sponsor.plForAdult': '面向成人',
    'sponsor.plPriceNote': '这门课程在你所在国家的价格。被资助的是这个名额，不是礼品卡。',
    'sponsor.plNoPrice': '这门课程在你所在国家没有价格，因此无法从这里领取这个名额。',
    'sponsor.plPriceUnread': '无法读取这个名额的价格，因此暂时不能领取。',
    'sponsor.plNoteLabel': '给工作人员的留言（如果你愿意）',
    'sponsor.plTake': '资助这个名额',
    'sponsor.plTaken': '这个名额现在由你付费：{amount}',
    'sponsor.plTakenNext': '没有扣取任何款项。你的资助名额页面会说明如何付款。',
    'sponsor.plWhyGone': '那个名额刚刚被领取，或已不再开放。请另选一个。',
    'sponsor.plWhyOwn': '那是你自己申请的名额。你不能资助自己的申请。',
    'sponsor.tooLong': '这超出了此框能容纳的长度。',
    'sponsor.plWhyFailed': '没有成功。没有收取任何费用，也没有任何变化。',
    'sponsor.unconfirmed': '我们无法确认是否已记录。再次尝试之前，请先查看你的资助名额。',
    'sponsor.plAskHeading': '申请名额',
    'sponsor.rqLede': '如果某门课程负担不起，请写几句话说明情况。工作人员会阅读，无论结果如何都会答复并说明理由。申请不收费，也不使任何人承担义务。',
    'sponsor.rqCourse': '哪一门课程？',
    'sponsor.rqChoose': '请选择课程',
    'sponsor.rqReason': '情况是怎样的？',
    'sponsor.rqReasonNote': '只由做决定的工作人员阅读，别人都看不到。不会向为名额付费的人显示。',
    'sponsor.rqSubmit': '申请这个名额',
    'sponsor.rqDone': '已申请。工作人员会阅读，答复连同理由会显示在你的资助名额页面上。',
    'sponsor.rqNoLearner': '这个账户还没有学习者，因此没有可以为其申请的人。',
    'sponsor.rqNoCourse': '目前没有在售的课程，因此没有可申请的内容。',
    'sponsor.rqPrivacy': '如果申请获批准，资助人会看到名额代码、课程、面向儿童还是成人，以及价格。绝不会看到你的姓名、你的家庭或你在这里写的内容。',
    'sponsor.rqWhyReason': '请写一句话说明情况。做决定的人读的就是它。',
    'sponsor.rqWhyHas': '那位学习者已经拥有这门课程，因此没有可申请的内容。',
    'sponsor.rqWhyAsked': '这门课程已经有一项待处理的申请。',
  },
  'zh-hant': {
    'sponsor.lede': '別人付費的課程，以及你為別人學習而付費的課程。雙方都不會知道對方是誰。',
    'sponsor.off': '名額贊助目前已關閉，因此不能申請新的名額，也不能贊助新的名額。以前申請或贊助過的仍顯示在這裡。',
    'sponsor.askedHeading': '我申請過的',
    'sponsor.askedUnread': '目前無法讀取你的申請。沒有任何更改：本頁面只讀取。',
    'sponsor.askedNone': '你沒有申請過贊助名額。',
    'sponsor.askedHow': '如果某門課程負擔不起，你可以申請。申請不收費，也不使任何人承擔義務。',
    'sponsor.askLink': '申請贊助名額',
    'sponsor.aCourse': '一門課程',
    'sponsor.forWhom': '學習者：{name}',
    'sponsor.apSubmitted': '等待有人閱讀',
    'sponsor.apApproved': '已核准，等待贊助人',
    'sponsor.apFunded': '已獲贊助：有人為這個名額付了費',
    'sponsor.apDeclined': '未獲核准',
    'sponsor.apWithdrawn': '申請已撤回',
    'sponsor.seat': '名額：{code}',
    'sponsor.staffNote': '工作人員寫下的原話：',
    'sponsor.askedOn': '申請時間：{date}',
    'sponsor.decidedOn': '決定時間：{date}',
    'sponsor.coveredLead': '你申請的一個名額已獲贊助。',
    'sponsor.coveredBody': '課程現已向學習者開放。這裡不寫付費人的名字，這是有意的：是誰給的，是施予者與安拉之間的事。',
    'sponsor.gaveHeading': '我贊助過的',
    'sponsor.gaveUnread': '目前無法讀取你的贊助。沒有任何更改：本頁面只讀取。',
    'sponsor.gaveNone': '你沒有贊助過名額。',
    'sponsor.gaveHow': '每個等待中的名額，都是有人申請的一門課程。',
    'sponsor.spPledged': '已承諾：等待登記付款',
    'sponsor.spPaid': '已付款，名額已開放',
    'sponsor.spWithdrawn': '已取消',
    'sponsor.amount': '金額：{amount}',
    'sponsor.reference': '參考編號：{reference}',
    'sponsor.nextPledged': '不會自動扣取任何款項：本頁面不收款。款項到達平台後，由工作人員在這裡登記，登記後名額開放。',
    'sponsor.nextPaid': '已登記。名額已向學習者開放，學習者沒有被告知是誰付的費。',
    'sponsor.nextWithdrawn': '這項承諾已取消，因此不需要為它付款。',
    'sponsor.pledgedOn': '承諾時間：{date}',
    'sponsor.recordedOn': '付款登記時間：{date}',
    'sponsor.zakat': '贊助名額算作天課、施捨，還是兩者都不算，應由學者裁定，本平台不作這一裁定。給予之前，請詢問你信任的人。',
    'sponsor.pay': '支付這項承諾',
    'sponsor.payLede': '付款一經確認，名額即向學習者開放。雙方都不會知道對方是誰。',
    'sponsor.payApprove': '請在你的手機上核准付款。付款確認後，名額即向學習者開放。這可能需要一點時間。',
    'sponsor.payNot': '這項承諾無法在這裡支付：它已支付或已取消，或者不是你的承諾。',
    'sponsor.nextPay': '在你付款之前不會扣取任何款項。付款確認後名額開放。',
    'sponsor.plEyebrow': '贊助',
    'sponsor.plTitle': '為別人的課程付費',
    'sponsor.plLede':
      '負擔不起某門課程的學習者提出申請，由工作人員決定。獲核准的申請會在這裡顯示為一個名額，帶有代碼和課程價格，絕不帶姓名。你選擇一個名額；學習者得到課程。',
    'sponsor.plSeeHeading': '你能看到什麼，看不到什麼',
    'sponsor.plSeeBody':
      '名額代碼、課程、對象是兒童還是成人，以及你所在國家的價格。沒有學習者的姓名、年齡或家庭，也沒有他們所寫內容的任何一個字。那些內容只由做決定的工作人員閱讀，別人都看不到。',
    'sponsor.plPayHeading': '你付多少，何時付',
    'sponsor.plPayBody':
      '課程在你所在國家的價格，計算方式與購買時相同。領取名額是一項承諾，不會扣款。你的贊助名額頁面會說明如何支付這項承諾，付款確認後名額即向學習者開放。',
    'sponsor.plListHeading': '等待贊助人的名額',
    'sponsor.plSignIn': '名額只向已登入的人顯示。',
    'sponsor.plUnread': '無法讀取名額。沒有收取任何費用，也沒有領取任何名額。',
    'sponsor.plOff': '名額贊助目前已關閉，因此不能領取名額，也不能申請名額。',
    'sponsor.plNone': '目前沒有名額在等待贊助人。申請經工作人員核准後會顯示在這裡。',
    'sponsor.plForChild': '對象為兒童',
    'sponsor.plForAdult': '對象為成人',
    'sponsor.plPriceNote': '這門課程在你所在國家的價格。被贊助的是這個名額，不是禮品卡。',
    'sponsor.plNoPrice': '這門課程在你所在國家沒有價格，因此無法從這裡領取這個名額。',
    'sponsor.plPriceUnread': '無法讀取這個名額的價格，因此暫時不能領取。',
    'sponsor.plNoteLabel': '給工作人員的留言（如果你願意）',
    'sponsor.plTake': '贊助這個名額',
    'sponsor.plTaken': '這個名額現在由你付費：{amount}',
    'sponsor.plTakenNext': '沒有扣取任何款項。你的贊助名額頁面會說明如何付款。',
    'sponsor.plWhyGone': '那個名額剛剛被領取，或已不再開放。請另選一個。',
    'sponsor.plWhyOwn': '那是你自己申請的名額。你不能贊助自己的申請。',
    'sponsor.tooLong': '這超出了此框能容納的長度。',
    'sponsor.plWhyFailed': '沒有成功。沒有收取任何費用，也沒有任何變化。',
    'sponsor.unconfirmed': '我們無法確認是否已記錄。再次嘗試之前，請先查看你的贊助名額。',
    'sponsor.plAskHeading': '申請名額',
    'sponsor.rqLede': '如果某門課程負擔不起，請寫幾句話說明情況。工作人員會閱讀，無論結果如何都會答覆並說明理由。申請不收費，也不使任何人承擔義務。',
    'sponsor.rqCourse': '哪一門課程？',
    'sponsor.rqChoose': '請選擇課程',
    'sponsor.rqReason': '情況是怎樣的？',
    'sponsor.rqReasonNote': '只由做決定的工作人員閱讀，別人都看不到。不會向為名額付費的人顯示。',
    'sponsor.rqSubmit': '申請這個名額',
    'sponsor.rqDone': '已申請。工作人員會閱讀，答覆連同理由會顯示在你的贊助名額頁面上。',
    'sponsor.rqNoLearner': '這個帳戶還沒有學習者，因此沒有可以為其申請的人。',
    'sponsor.rqNoCourse': '目前沒有販售中的課程，因此沒有可申請的內容。',
    'sponsor.rqPrivacy': '如果申請獲核准，贊助人會看到名額代碼、課程、對象是兒童還是成人，以及價格。絕不會看到你的姓名、你的家庭或你在這裡寫的內容。',
    'sponsor.rqWhyReason': '請寫一句話說明情況。做決定的人讀的就是它。',
    'sponsor.rqWhyHas': '那位學習者已經擁有這門課程，因此沒有可申請的內容。',
    'sponsor.rqWhyAsked': '這門課程已經有一項待處理的申請。',
  },
  vi: {
    'sponsor.lede':
      'Những khoá học do người khác trả tiền, và những khoá học bạn trả tiền để người khác theo học. Không bên nào biết bên kia là ai.',
    'sponsor.off':
      'Việc tài trợ suất học hiện đang tắt, vì vậy không thể xin hay tài trợ suất mới. Những gì đã xin hoặc đã tài trợ trước đây vẫn được hiển thị ở đây.',
    'sponsor.askedHeading': 'Những gì tôi đã xin',
    'sponsor.askedUnread':
      'Hiện không đọc được các yêu cầu của bạn. Không có gì thay đổi: trang này chỉ đọc.',
    'sponsor.askedNone': 'Bạn chưa xin suất được tài trợ nào.',
    'sponsor.askedHow':
      'Nếu một khoá học ngoài khả năng của bạn, bạn có thể xin. Việc này không tốn gì và không ràng buộc ai.',
    'sponsor.askLink': 'Xin một suất được tài trợ',
    'sponsor.aCourse': 'Một khoá học',
    'sponsor.forWhom': 'Dành cho: {name}',
    'sponsor.apSubmitted': 'Đang chờ có người đọc',
    'sponsor.apApproved': 'Đã được duyệt, đang chờ người tài trợ',
    'sponsor.apFunded': 'Đã được chi trả: có người đã trả tiền cho suất này',
    'sponsor.apDeclined': 'Không được duyệt',
    'sponsor.apWithdrawn': 'Yêu cầu đã được rút lại',
    'sponsor.seat': 'Suất: {code}',
    'sponsor.staffNote': 'Điều nhân viên đã viết, bằng lời của chính họ:',
    'sponsor.askedOn': 'Ngày xin: {date}',
    'sponsor.decidedOn': 'Ngày quyết định: {date}',
    'sponsor.coveredLead': 'Một suất bạn đã xin đã được chi trả.',
    'sponsor.coveredBody':
      'Khoá học hiện đã mở cho học viên. Người trả tiền không được nêu tên ở đây, và đó là có chủ ý: ai đã cho là chuyện giữa người cho và Allah.',
    'sponsor.gaveHeading': 'Những gì tôi đã tài trợ',
    'sponsor.gaveUnread':
      'Hiện không đọc được các khoản tài trợ của bạn. Không có gì thay đổi: trang này chỉ đọc.',
    'sponsor.gaveNone': 'Bạn chưa tài trợ suất nào.',
    'sponsor.gaveHow': 'Mỗi suất đang chờ là một khoá học có người đã xin.',
    'sponsor.spPledged': 'Đã cam kết: đang chờ ghi nhận khoản thanh toán',
    'sponsor.spPaid': 'Đã thanh toán, và suất đã mở',
    'sponsor.spWithdrawn': 'Đã huỷ',
    'sponsor.amount': 'Số tiền: {amount}',
    'sponsor.reference': 'Mã tham chiếu: {reference}',
    'sponsor.nextPledged':
      'Không có gì bị thu tự động: trang này không thu khoản thanh toán nào. Nhân viên ghi nhận khoản thanh toán tại đây khi nó đến nền tảng, và suất được mở khi đã ghi nhận.',
    'sponsor.nextPaid':
      'Đã ghi nhận. Suất đã mở cho học viên, và học viên không được cho biết ai đã trả tiền.',
    'sponsor.nextWithdrawn':
      'Cam kết này đã bị huỷ, vì vậy không có khoản tiền nào được chờ đợi cho nó.',
    'sponsor.pledgedOn': 'Ngày cam kết: {date}',
    'sponsor.recordedOn': 'Ngày ghi nhận thanh toán: {date}',
    'sponsor.zakat':
      'Một suất được tài trợ được tính là zakat, là sadaqah hay không là gì trong hai điều đó là phán quyết của một học giả, và nền tảng này không đưa ra phán quyết ấy. Hãy hỏi một người bạn tin tưởng trước khi cho.',
    'sponsor.pay': 'Thanh toán cam kết này',
    'sponsor.payLede':
      'Suất được mở cho học viên ngay khi khoản thanh toán được xác nhận. Không bên nào biết bên kia là ai.',
    'sponsor.payApprove':
      'Hãy chấp thuận khoản thanh toán trên điện thoại của bạn. Suất sẽ mở cho học viên khi khoản thanh toán được xác nhận. Việc này có thể mất một lúc.',
    'sponsor.payNot':
      'Không thể thanh toán cam kết này tại đây: nó đã được thanh toán hoặc đã bị huỷ, hoặc không phải là cam kết của bạn.',
    'sponsor.nextPay':
      'Không có gì bị thu cho đến khi bạn thanh toán. Suất được mở khi khoản thanh toán được xác nhận.',
    'sponsor.plEyebrow': 'Tài trợ',
    'sponsor.plTitle': 'Trả tiền khoá học cho người khác',
    'sponsor.plLede':
      'Học viên không đủ khả năng trả cho một khoá học sẽ xin khoá đó, và nhân viên quyết định. Yêu cầu được duyệt hiện ở đây thành một suất có mã và giá khoá học, và không bao giờ có tên. Bạn chọn một suất; học viên nhận khoá học.',
    'sponsor.plSeeHeading': 'Bạn thấy gì, và không thấy gì',
    'sponsor.plSeeBody':
      'Mã suất, khoá học, dành cho trẻ em hay người lớn, và giá tại nước bạn. Không có tên, tuổi hay gia đình của học viên, và không một chữ nào trong những gì họ đã viết. Phần đó chỉ do nhân viên quyết định đọc, không ai khác.',
    'sponsor.plPayHeading': 'Bạn trả gì, và khi nào',
    'sponsor.plPayBody':
      'Giá khoá học tại nước bạn, tính như khi mua. Nhận một suất là một cam kết và không thu tiền. Trang các suất được tài trợ của bạn cho biết cam kết được thanh toán thế nào, và suất mở cho học viên khi khoản thanh toán được xác nhận.',
    'sponsor.plListHeading': 'Các suất đang chờ người tài trợ',
    'sponsor.plSignIn': 'Các suất được hiển thị cho người đã đăng nhập.',
    'sponsor.plUnread':
      'Không đọc được các suất. Chưa thu khoản nào và chưa suất nào được nhận.',
    'sponsor.plOff': 'Việc tài trợ suất hiện đang tắt, nên không thể nhận hay xin suất nào.',
    'sponsor.plNone':
      'Hiện không có suất nào đang chờ người tài trợ. Yêu cầu hiện ở đây sau khi nhân viên duyệt.',
    'sponsor.plForChild': 'Dành cho trẻ em',
    'sponsor.plForAdult': 'Dành cho người lớn',
    'sponsor.plPriceNote':
      'Giá khoá học này tại nước bạn. Thứ được tài trợ là suất học, không phải thẻ quà tặng.',
    'sponsor.plNoPrice':
      'Khoá học này không có giá tại nước bạn, nên không thể nhận suất này từ đây.',
    'sponsor.plPriceUnread': 'Không đọc được giá của suất này, nên hiện chưa thể nhận.',
    'sponsor.plNoteLabel': 'Lời nhắn cho nhân viên, nếu bạn muốn',
    'sponsor.plTake': 'Tài trợ suất này',
    'sponsor.plTaken': 'Suất này giờ thuộc về bạn để thanh toán: {amount}',
    'sponsor.plTakenNext':
      'Chưa thu khoản nào. Trang các suất được tài trợ của bạn cho biết cách thanh toán.',
    'sponsor.plWhyGone': 'Suất đó vừa được nhận, hoặc không còn mở. Hãy chọn suất khác.',
    'sponsor.plWhyOwn':
      'Đó là suất chính bạn đã xin. Bạn không thể tài trợ yêu cầu của chính mình.',
    'sponsor.tooLong': 'Nội dung đó dài hơn mức ô này chứa được.',
    'sponsor.plWhyFailed': 'Việc đó không thành công. Chưa thu khoản nào và không có gì thay đổi.',
    'sponsor.unconfirmed':
      'Chúng tôi không xác nhận được việc đó đã được ghi nhận hay chưa. Hãy xem các suất được tài trợ của bạn trước khi thử lại.',
    'sponsor.plAskHeading': 'Xin một suất',
    'sponsor.rqLede':
      'Nếu một khoá học ngoài khả năng của bạn, hãy viết vài câu về hoàn cảnh. Nhân viên sẽ đọc và trả lời dù kết quả thế nào, kèm lý do. Việc xin không tốn gì và không ràng buộc ai.',
    'sponsor.rqCourse': 'Khoá học nào?',
    'sponsor.rqChoose': 'Chọn một khoá học',
    'sponsor.rqReason': 'Hoàn cảnh thế nào?',
    'sponsor.rqReasonNote':
      'Chỉ do nhân viên quyết định đọc, không ai khác. Không hiển thị cho người trả tiền cho suất đó.',
    'sponsor.rqSubmit': 'Xin suất này',
    'sponsor.rqDone':
      'Đã xin. Nhân viên sẽ đọc, và câu trả lời, kèm lý do, sẽ có trên trang các suất được tài trợ của bạn.',
    'sponsor.rqNoLearner': 'Tài khoản này chưa có học viên nào, nên chưa có ai để xin cho.',
    'sponsor.rqNoCourse': 'Hiện không có khoá học nào đang bán, nên không có gì để xin.',
    'sponsor.rqPrivacy':
      'Nếu yêu cầu được duyệt, người tài trợ thấy mã suất, khoá học, dành cho trẻ em hay người lớn, và giá. Không bao giờ thấy tên bạn, gia đình bạn hay những gì bạn viết ở đây.',
    'sponsor.rqWhyReason': 'Hãy viết một câu về hoàn cảnh. Đó là điều người quyết định sẽ đọc.',
    'sponsor.rqWhyHas': 'Học viên đó đã có khoá học này, nên không có gì để xin.',
    'sponsor.rqWhyAsked': 'Đã có một yêu cầu đang mở cho khoá học này.',
  },
  th: {
    'sponsor.lede':
      'หลักสูตรที่ผู้อื่นจ่ายให้ และหลักสูตรที่คุณจ่ายให้ผู้อื่นได้เรียน ทั้งสองฝ่ายจะไม่รู้ว่าอีกฝ่ายเป็นใคร',
    'sponsor.off':
      'การอุปถัมภ์ที่นั่งปิดอยู่ในขณะนี้ จึงขอที่นั่งใหม่หรืออุปถัมภ์ที่นั่งใหม่ไม่ได้ สิ่งที่เคยขอหรือเคยอุปถัมภ์ไว้ก่อนหน้านี้ยังแสดงอยู่ที่นี่',
    'sponsor.askedHeading': 'สิ่งที่ฉันขอไว้',
    'sponsor.askedUnread':
      'ขณะนี้อ่านคำขอของคุณไม่ได้ ไม่มีสิ่งใดเปลี่ยนแปลง: หน้านี้อ่านอย่างเดียว',
    'sponsor.askedNone': 'คุณยังไม่ได้ขอที่นั่งที่มีผู้อุปถัมภ์',
    'sponsor.askedHow': 'หากหลักสูตรใดเกินกำลังของคุณ คุณขอได้ ไม่มีค่าใช้จ่ายและไม่ผูกมัดผู้ใด',
    'sponsor.askLink': 'ขอที่นั่งที่มีผู้อุปถัมภ์',
    'sponsor.aCourse': 'หลักสูตรหนึ่ง',
    'sponsor.forWhom': 'สำหรับ: {name}',
    'sponsor.apSubmitted': 'รอให้มีผู้อ่าน',
    'sponsor.apApproved': 'อนุมัติแล้ว และรอผู้อุปถัมภ์',
    'sponsor.apFunded': 'มีผู้จ่ายแล้ว: มีคนจ่ายค่าที่นั่งนี้',
    'sponsor.apDeclined': 'ไม่ได้รับอนุมัติ',
    'sponsor.apWithdrawn': 'ถอนคำขอแล้ว',
    'sponsor.seat': 'ที่นั่ง: {code}',
    'sponsor.staffNote': 'สิ่งที่เจ้าหน้าที่เขียนไว้ ตามถ้อยคำของเจ้าหน้าที่เอง:',
    'sponsor.askedOn': 'วันที่ขอ: {date}',
    'sponsor.decidedOn': 'วันที่ตัดสิน: {date}',
    'sponsor.coveredLead': 'ที่นั่งที่คุณขอไว้มีผู้จ่ายให้แล้ว',
    'sponsor.coveredBody':
      'หลักสูตรเปิดให้ผู้เรียนแล้วในขณะนี้ ที่นี่ไม่ระบุชื่อผู้จ่าย และเป็นความตั้งใจ: ใครเป็นผู้ให้นั้นเป็นเรื่องระหว่างผู้ให้กับอัลลอฮ์',
    'sponsor.gaveHeading': 'สิ่งที่ฉันอุปถัมภ์ไว้',
    'sponsor.gaveUnread':
      'ขณะนี้อ่านการอุปถัมภ์ของคุณไม่ได้ ไม่มีสิ่งใดเปลี่ยนแปลง: หน้านี้อ่านอย่างเดียว',
    'sponsor.gaveNone': 'คุณยังไม่ได้อุปถัมภ์ที่นั่งใด',
    'sponsor.gaveHow': 'ที่นั่งที่รออยู่แต่ละที่คือหลักสูตรที่มีคนขอไว้',
    'sponsor.spPledged': 'ให้คำมั่นแล้ว: รอการบันทึกการชำระเงิน',
    'sponsor.spPaid': 'ชำระแล้ว และที่นั่งเปิดแล้ว',
    'sponsor.spWithdrawn': 'ยกเลิกแล้ว',
    'sponsor.amount': 'จำนวนเงิน: {amount}',
    'sponsor.reference': 'เลขอ้างอิง: {reference}',
    'sponsor.nextPledged':
      'ไม่มีการหักเงินโดยอัตโนมัติ: หน้านี้ไม่เก็บเงิน เจ้าหน้าที่จะบันทึกการชำระเงินที่นี่เมื่อเงินมาถึงแพลตฟอร์ม และที่นั่งจะเปิดเมื่อบันทึกแล้ว',
    'sponsor.nextPaid':
      'บันทึกแล้ว ที่นั่งเปิดให้ผู้เรียนแล้ว และผู้เรียนไม่ได้รับแจ้งว่าใครเป็นผู้จ่าย',
    'sponsor.nextWithdrawn': 'คำมั่นนี้ถูกยกเลิกแล้ว จึงไม่มีการรอรับเงินสำหรับคำมั่นนี้',
    'sponsor.pledgedOn': 'วันที่ให้คำมั่น: {date}',
    'sponsor.recordedOn': 'วันที่บันทึกการชำระเงิน: {date}',
    'sponsor.zakat':
      'ที่นั่งที่มีผู้อุปถัมภ์จะนับเป็นซะกาต เป็นเศาะดะเกาะฮ์ หรือไม่เป็นทั้งสองอย่างนั้น เป็นคำวินิจฉัยของผู้รู้ศาสนา และแพลตฟอร์มนี้ไม่ได้วินิจฉัยเรื่องนี้ โปรดถามผู้ที่คุณไว้วางใจก่อนจะให้',
    'sponsor.pay': 'ชำระเงินตามคำมั่นนี้',
    'sponsor.payLede':
      'ที่นั่งจะเปิดให้ผู้เรียนทันทีที่ยืนยันการชำระเงินแล้ว ทั้งสองฝ่ายจะไม่รู้ว่าอีกฝ่ายเป็นใคร',
    'sponsor.payApprove':
      'โปรดอนุมัติการชำระเงินบนโทรศัพท์ของคุณ ที่นั่งจะเปิดให้ผู้เรียนเมื่อยืนยันการชำระเงินแล้ว อาจใช้เวลาสักครู่',
    'sponsor.payNot':
      'ไม่สามารถชำระเงินตามคำมั่นนี้ที่นี่ได้: คำมั่นนี้ชำระแล้วหรือถูกยกเลิกแล้ว หรือไม่ใช่คำมั่นของคุณ',
    'sponsor.nextPay':
      'จะไม่มีการหักเงินจนกว่าคุณจะชำระ ที่นั่งจะเปิดเมื่อยืนยันการชำระเงินแล้ว',
    'sponsor.plEyebrow': 'การอุปถัมภ์',
    'sponsor.plTitle': 'จ่ายค่าหลักสูตรให้ผู้อื่น',
    'sponsor.plLede':
      'ผู้เรียนที่ไม่สามารถจ่ายค่าหลักสูตรได้จะขอหลักสูตรนั้น และเจ้าหน้าที่เป็นผู้ตัดสิน คำขอที่อนุมัติแล้วจะปรากฏที่นี่เป็นที่นั่งพร้อมรหัสและราคาหลักสูตร และไม่มีชื่อเลย คุณเลือกที่นั่ง ผู้เรียนได้รับหลักสูตร',
    'sponsor.plSeeHeading': 'สิ่งที่คุณเห็น และสิ่งที่คุณไม่เห็น',
    'sponsor.plSeeBody':
      'รหัสที่นั่ง หลักสูตร สำหรับเด็กหรือผู้ใหญ่ และราคาในประเทศของคุณ ไม่มีชื่อ อายุ หรือครอบครัวของผู้เรียน และไม่มีแม้แต่คำเดียวจากสิ่งที่เขียนไว้ ส่วนนั้นอ่านโดยเจ้าหน้าที่ผู้ตัดสินเท่านั้น ไม่มีผู้อื่น',
    'sponsor.plPayHeading': 'สิ่งที่คุณจ่าย และจ่ายเมื่อใด',
    'sponsor.plPayBody':
      'ราคาหลักสูตรในประเทศของคุณ คำนวณเช่นเดียวกับการซื้อ การรับที่นั่งเป็นคำมั่นและยังไม่มีการหักเงิน หน้าที่นั่งที่มีผู้อุปถัมภ์ของคุณบอกวิธีชำระตามคำมั่น และที่นั่งจะเปิดให้ผู้เรียนเมื่อยืนยันการชำระเงินแล้ว',
    'sponsor.plListHeading': 'ที่นั่งที่รอผู้อุปถัมภ์',
    'sponsor.plSignIn': 'ที่นั่งจะแสดงแก่ผู้ที่ลงชื่อเข้าใช้แล้ว',
    'sponsor.plUnread':
      'อ่านรายการที่นั่งไม่ได้ ยังไม่มีการเรียกเก็บเงินและยังไม่มีการรับที่นั่งใด',
    'sponsor.plOff': 'การอุปถัมภ์ที่นั่งปิดอยู่ในขณะนี้ จึงรับที่นั่งหรือขอที่นั่งไม่ได้',
    'sponsor.plNone':
      'ขณะนี้ไม่มีที่นั่งที่รอผู้อุปถัมภ์ คำขอจะปรากฏที่นี่เมื่อเจ้าหน้าที่อนุมัติแล้ว',
    'sponsor.plForChild': 'สำหรับเด็ก',
    'sponsor.plForAdult': 'สำหรับผู้ใหญ่',
    'sponsor.plPriceNote':
      'ราคาหลักสูตรนี้ในประเทศของคุณ สิ่งที่ได้รับการอุปถัมภ์คือที่นั่ง ไม่ใช่บัตรของขวัญ',
    'sponsor.plNoPrice': 'หลักสูตรนี้ไม่มีราคาในประเทศของคุณ จึงรับที่นั่งนี้จากที่นี่ไม่ได้',
    'sponsor.plPriceUnread': 'อ่านราคาของที่นั่งนี้ไม่ได้ จึงยังรับไม่ได้ในขณะนี้',
    'sponsor.plNoteLabel': 'ข้อความถึงเจ้าหน้าที่ หากคุณต้องการ',
    'sponsor.plTake': 'อุปถัมภ์ที่นั่งนี้',
    'sponsor.plTaken': 'ที่นั่งนี้เป็นของคุณที่จะชำระ: {amount}',
    'sponsor.plTakenNext': 'ยังไม่มีการหักเงิน หน้าที่นั่งที่มีผู้อุปถัมภ์ของคุณบอกวิธีชำระ',
    'sponsor.plWhyGone': 'ที่นั่งนั้นเพิ่งถูกรับไป หรือไม่เปิดแล้ว โปรดเลือกที่นั่งอื่น',
    'sponsor.plWhyOwn': 'นั่นคือที่นั่งที่คุณขอเอง คุณอุปถัมภ์คำขอของตัวเองไม่ได้',
    'sponsor.tooLong': 'ข้อความนั้นยาวเกินกว่าที่ช่องนี้รับได้',
    'sponsor.plWhyFailed': 'ไม่สำเร็จ ไม่มีการเรียกเก็บเงินและไม่มีอะไรเปลี่ยนแปลง',
    'sponsor.unconfirmed':
      'เรายืนยันไม่ได้ว่าบันทึกแล้วหรือไม่ โปรดดูที่นั่งที่มีผู้อุปถัมภ์ของคุณก่อนลองอีกครั้ง',
    'sponsor.plAskHeading': 'การขอที่นั่ง',
    'sponsor.rqLede':
      'หากหลักสูตรใดเกินกำลังของคุณ โปรดเขียนสองสามประโยคเกี่ยวกับสถานการณ์ เจ้าหน้าที่จะอ่านและตอบไม่ว่าผลจะเป็นอย่างไร พร้อมเหตุผล การขอไม่มีค่าใช้จ่ายและไม่ผูกมัดใคร',
    'sponsor.rqCourse': 'หลักสูตรใด',
    'sponsor.rqChoose': 'เลือกหลักสูตร',
    'sponsor.rqReason': 'สถานการณ์เป็นอย่างไร',
    'sponsor.rqReasonNote':
      'อ่านโดยเจ้าหน้าที่ผู้ตัดสินเท่านั้น ไม่มีผู้อื่น ไม่แสดงแก่ผู้ที่จ่ายค่าที่นั่ง',
    'sponsor.rqSubmit': 'ขอที่นั่งนี้',
    'sponsor.rqDone':
      'ขอแล้ว เจ้าหน้าที่จะอ่าน และคำตอบพร้อมเหตุผลจะอยู่ในหน้าที่นั่งที่มีผู้อุปถัมภ์ของคุณ',
    'sponsor.rqNoLearner': 'บัญชีนี้ยังไม่มีผู้เรียน จึงยังไม่มีผู้ที่จะขอให้',
    'sponsor.rqNoCourse': 'ขณะนี้ไม่มีหลักสูตรที่วางขาย จึงไม่มีสิ่งใดให้ขอ',
    'sponsor.rqPrivacy':
      'หากคำขอได้รับอนุมัติ ผู้อุปถัมภ์จะเห็นรหัสที่นั่ง หลักสูตร สำหรับเด็กหรือผู้ใหญ่ และราคา ไม่มีวันเห็นชื่อของคุณ ครอบครัวของคุณ หรือสิ่งที่คุณเขียนไว้ที่นี่',
    'sponsor.rqWhyReason': 'โปรดเขียนหนึ่งประโยคเกี่ยวกับสถานการณ์ นั่นคือสิ่งที่ผู้ตัดสินอ่าน',
    'sponsor.rqWhyHas': 'ผู้เรียนคนนั้นมีหลักสูตรนี้อยู่แล้ว จึงไม่มีสิ่งใดให้ขอ',
    'sponsor.rqWhyAsked': 'มีคำขอที่ยังเปิดอยู่สำหรับหลักสูตรนี้แล้ว',
  },
  fil: {
    'sponsor.lede':
      'Mga kursong binayaran ng ibang tao, at mga kursong binayaran mo para mapag-aralan ng iba. Hindi nalalaman ng alinmang panig kung sino ang isa.',
    'sponsor.off':
      'Nakapatay sa ngayon ang pag-sponsor ng puwesto, kaya walang bagong puwestong mahihiling o mai-sponsor. Ipinapakita pa rin dito ang hiniling o in-sponsor noon.',
    'sponsor.askedHeading': 'Ang mga hiniling ko',
    'sponsor.askedUnread':
      'Hindi mabasa ang iyong mga kahilingan sa ngayon. Walang nabago: nagbabasa lamang ang pahinang ito.',
    'sponsor.askedNone': 'Hindi ka pa humihiling ng puwestong may sponsor.',
    'sponsor.askedHow':
      'Kung hindi mo abot ang isang kurso, maaari kang humiling. Wala itong bayad at wala itong inoobliga.',
    'sponsor.askLink': 'Humiling ng puwestong may sponsor',
    'sponsor.aCourse': 'Isang kurso',
    'sponsor.forWhom': 'Para kay: {name}',
    'sponsor.apSubmitted': 'Naghihintay na may bumasa',
    'sponsor.apApproved': 'Inaprubahan, at naghihintay ng sponsor',
    'sponsor.apFunded': 'Nasagot na: may nagbayad para sa puwestong ito',
    'sponsor.apDeclined': 'Hindi inaprubahan',
    'sponsor.apWithdrawn': 'Binawi ang kahilingan',
    'sponsor.seat': 'Puwesto: {code}',
    'sponsor.staffNote': 'Ang isinulat ng mga kawani, sa sarili nilang mga salita:',
    'sponsor.askedOn': 'Hiniling noong {date}',
    'sponsor.decidedOn': 'Pinagpasyahan noong {date}',
    'sponsor.coveredLead': 'Nasagot na ang isang puwestong hiniling mo.',
    'sponsor.coveredBody':
      'Bukas na ngayon ang kurso para sa mag-aaral. Hindi pinangangalanan dito ang nagbayad, at sinadya iyon: kung sino ang nagbigay ay sa pagitan ng nagbigay at ni Allah.',
    'sponsor.gaveHeading': 'Ang mga in-sponsor ko',
    'sponsor.gaveUnread':
      'Hindi mabasa ang iyong mga sponsorship sa ngayon. Walang nabago: nagbabasa lamang ang pahinang ito.',
    'sponsor.gaveNone': 'Wala ka pang in-sponsor na puwesto.',
    'sponsor.gaveHow': 'Ang bawat puwestong naghihintay ay isang kursong hiniling ng isang tao.',
    'sponsor.spPledged': 'Ipinangako: naghihintay na maitala ang bayad',
    'sponsor.spPaid': 'Bayad na, at bukas ang puwesto',
    'sponsor.spWithdrawn': 'Kinansela',
    'sponsor.amount': 'Halaga: {amount}',
    'sponsor.reference': 'Sanggunian: {reference}',
    'sponsor.nextPledged':
      'Walang kinukuha nang awtomatiko: hindi nangongolekta ng bayad ang pahinang ito. Itinatala rito ng mga kawani ang bayad kapag dumating ito sa plataporma, at nagbubukas ang puwesto kapag naitala na.',
    'sponsor.nextPaid':
      'Naitala na. Bukas ang puwesto para sa mag-aaral, at hindi sinabi sa mag-aaral kung sino ang nagbayad.',
    'sponsor.nextWithdrawn': 'Kinansela ang pangakong ito, kaya walang perang inaasahan para rito.',
    'sponsor.pledgedOn': 'Ipinangako noong {date}',
    'sponsor.recordedOn': 'Naitala ang bayad noong {date}',
    'sponsor.zakat':
      'Kung ang puwestong may sponsor ay ibinibilang na zakat, sadaqah, o wala sa dalawa ay pasya ng isang iskolar, at hindi ito pinagpapasyahan ng platapormang ito. Magtanong sa taong pinagkakatiwalaan mo bago ka magbigay.',
    'sponsor.pay': 'Bayaran ang pangakong ito',
    'sponsor.payLede':
      'Nagbubukas ang puwesto para sa mag-aaral sa sandaling makumpirma ang bayad. Hindi nalalaman ng alinmang panig kung sino ang isa.',
    'sponsor.payApprove':
      'Aprubahan ang bayad sa iyong telepono. Magbubukas ang puwesto para sa mag-aaral kapag nakumpirma ang bayad. Maaaring tumagal ito nang sandali.',
    'sponsor.payNot':
      'Hindi mababayaran dito ang pangakong ito: nabayaran na ito o kinansela, o hindi ito isa sa iyong mga pangako.',
    'sponsor.nextPay':
      'Walang kinukuha hanggang sa magbayad ka. Nagbubukas ang puwesto kapag nakumpirma ang bayad.',
    'sponsor.plEyebrow': 'Pag-sponsor',
    'sponsor.plTitle': 'Bayaran ang kurso ng ibang tao',
    'sponsor.plLede':
      'Ang mag-aaral na hindi kayang bayaran ang isang kurso ay humihiling nito, at ang mga kawani ang nagpapasya. Lumalabas dito ang inaprubahang kahilingan bilang isang puwesto na may code at presyo ng kurso, at hindi kailanman may pangalan. Ikaw ang pumipili ng puwesto; ang mag-aaral ang nakakakuha ng kurso.',
    'sponsor.plSeeHeading': 'Ang nakikita mo, at ang hindi',
    'sponsor.plSeeBody':
      'Ang code ng puwesto, ang kurso, kung para ito sa bata o sa nasa hustong gulang, at ang presyo sa iyong bansa. Hindi ang pangalan, edad o pamilya ng mag-aaral, at wala ni isang salita ng isinulat nila. Binabasa iyon ng mga kawaning nagpapasya, at wala nang iba.',
    'sponsor.plPayHeading': 'Ang binabayaran mo, at kailan',
    'sponsor.plPayBody':
      'Ang presyo ng kurso sa iyong bansa, kinukuwenta gaya ng sa pagbili. Ang pagkuha ng puwesto ay isang pangako at walang kinukuhang pera. Sinasabi ng iyong pahina ng mga puwestong may sponsor kung paano binabayaran ang pangako, at nagbubukas ang puwesto para sa mag-aaral kapag nakumpirma ang bayad.',
    'sponsor.plListHeading': 'Mga puwestong naghihintay ng sponsor',
    'sponsor.plSignIn': 'Ipinapakita ang mga puwesto sa mga naka-sign in.',
    'sponsor.plUnread':
      'Hindi nabasa ang mga puwesto. Walang siningil at walang puwestong nakuha.',
    'sponsor.plOff':
      'Nakapatay sa ngayon ang pag-sponsor ng puwesto, kaya walang puwestong makukuha o mahihiling.',
    'sponsor.plNone':
      'Walang puwestong naghihintay ng sponsor sa ngayon. Lumalabas dito ang kahilingan kapag inaprubahan ng mga kawani.',
    'sponsor.plForChild': 'Para sa bata',
    'sponsor.plForAdult': 'Para sa nasa hustong gulang',
    'sponsor.plPriceNote':
      'Ang presyo ng kursong ito sa iyong bansa. Ang puwesto ang ini-sponsor, hindi isang gift card.',
    'sponsor.plNoPrice':
      'Walang presyo ang kursong ito sa iyong bansa, kaya hindi makukuha ang puwestong ito mula rito.',
    'sponsor.plPriceUnread':
      'Hindi nabasa ang presyo ng puwestong ito, kaya hindi pa ito makukuha ngayon.',
    'sponsor.plNoteLabel': 'Isang tala para sa mga kawani, kung gusto mo',
    'sponsor.plTake': 'I-sponsor ang puwestong ito',
    'sponsor.plTaken': 'Sa iyo na ang puwestong ito para bayaran: {amount}',
    'sponsor.plTakenNext':
      'Walang kinuha. Sinasabi ng iyong pahina ng mga puwestong may sponsor kung paano magbayad.',
    'sponsor.plWhyGone': 'Kakakuha lang ng puwestong iyon, o hindi na ito bukas. Pumili ng iba.',
    'sponsor.plWhyOwn':
      'Iyan ang puwestong ikaw mismo ang humiling. Hindi mo mai-sponsor ang sarili mong kahilingan.',
    'sponsor.tooLong': 'Mas mahaba iyon kaysa sa kayang ilaman ng kahong ito.',
    'sponsor.plWhyFailed': 'Hindi iyon gumana. Walang siningil at walang nagbago.',
    'sponsor.unconfirmed':
      'Hindi namin nakumpirma kung naitala iyon. Tingnan ang iyong mga puwestong may sponsor bago sumubok muli.',
    'sponsor.plAskHeading': 'Paghiling ng puwesto',
    'sponsor.rqLede':
      'Kung hindi mo abot ang isang kurso, sumulat ng ilang pangungusap tungkol sa sitwasyon. Binabasa ito ng mga kawani at sumasagot sila anuman ang pasya, na may dahilan. Walang bayad ang paghiling at wala itong inoobliga.',
    'sponsor.rqCourse': 'Aling kurso?',
    'sponsor.rqChoose': 'Pumili ng kurso',
    'sponsor.rqReason': 'Ano ang sitwasyon?',
    'sponsor.rqReasonNote':
      'Binabasa ng mga kawaning nagpapasya, at wala nang iba. Hindi ipinapakita sa nagbabayad ng puwesto.',
    'sponsor.rqSubmit': 'Hilingin ang puwestong ito',
    'sponsor.rqDone':
      'Nahiling na. Babasahin ito ng mga kawani, at ang sagot, kasama ang dahilan nito, ay nasa iyong pahina ng mga puwestong may sponsor.',
    'sponsor.rqNoLearner': 'Wala pang mag-aaral sa account na ito, kaya wala pang mahihilingan.',
    'sponsor.rqNoCourse': 'Walang kursong ibinebenta sa ngayon, kaya walang mahihiling.',
    'sponsor.rqPrivacy':
      'Kapag inaprubahan ang kahilingan, nakikita ng sponsor ang code ng puwesto, ang kurso, kung para ito sa bata o sa nasa hustong gulang, at ang presyo. Hindi kailanman ang iyong pangalan, ang iyong pamilya o ang isinulat mo rito.',
    'sponsor.rqWhyReason':
      'Sumulat ng isang pangungusap tungkol sa sitwasyon. Iyon ang binabasa ng nagpapasya.',
    'sponsor.rqWhyHas':
      'Mayroon nang kursong ito ang mag-aaral na iyon, kaya walang mahihiling.',
    'sponsor.rqWhyAsked': 'Mayroon nang bukas na kahilingan para sa kursong ito.',
  },
  uz: {
    'sponsor.lede':
      'Boshqa kishi toʻlagan kurslar va boshqa kishi oʻqishi uchun siz toʻlagan kurslar. Ikki tomondan hech biri narigi tomon kimligini bilmaydi.',
    'sponsor.off':
      'Oʻringa homiylik qilish hozircha oʻchirilgan, shuning uchun yangi oʻrin soʻrab ham, yangi oʻringa homiylik qilib ham boʻlmaydi. Avval soʻralgan yoki homiylik qilingan narsalar bu yerda koʻrsatilaveradi.',
    'sponsor.askedHeading': 'Men soʻraganlarim',
    'sponsor.askedUnread':
      'Soʻrovlaringizni hozir oʻqib boʻlmadi. Hech narsa oʻzgarmadi: bu sahifa faqat oʻqiydi.',
    'sponsor.askedNone': 'Siz homiylik oʻrnini soʻramagansiz.',
    'sponsor.askedHow':
      'Agar kursga qurbingiz yetmasa, soʻrashingiz mumkin. Buning hech qanday toʻlovi yoʻq va hech kimni majbur qilmaydi.',
    'sponsor.askLink': 'Homiylik oʻrnini soʻrash',
    'sponsor.aCourse': 'Kurs',
    'sponsor.forWhom': 'Kim uchun: {name}',
    'sponsor.apSubmitted': 'Kimdir oʻqishini kutmoqda',
    'sponsor.apApproved': 'Maʼqullandi, homiy kutilmoqda',
    'sponsor.apFunded': 'Qoplandi: kimdir bu oʻrin uchun toʻladi',
    'sponsor.apDeclined': 'Maʼqullanmadi',
    'sponsor.apWithdrawn': 'Soʻrov qaytarib olindi',
    'sponsor.seat': 'Oʻrin: {code}',
    'sponsor.staffNote': 'Xodimlar oʻz soʻzlari bilan yozgani:',
    'sponsor.askedOn': 'Soʻralgan sana: {date}',
    'sponsor.decidedOn': 'Qaror sanasi: {date}',
    'sponsor.coveredLead': 'Siz soʻragan oʻrin qoplandi.',
    'sponsor.coveredBody':
      'Kurs endi oʻquvchi uchun ochiq. Toʻlagan kishining ismi bu yerda yozilmaydi va bu ataylab qilingan: kim bergani beruvchi bilan Alloh oʻrtasidagi ishdir.',
    'sponsor.gaveHeading': 'Men homiylik qilganlarim',
    'sponsor.gaveUnread':
      'Homiyliklaringizni hozir oʻqib boʻlmadi. Hech narsa oʻzgarmadi: bu sahifa faqat oʻqiydi.',
    'sponsor.gaveNone': 'Siz hech bir oʻringa homiylik qilmagansiz.',
    'sponsor.gaveHow': 'Kutayotgan har bir oʻrin kimdir soʻragan kursdir.',
    'sponsor.spPledged': 'Vaʼda qilingan: toʻlov qayd etilishi kutilmoqda',
    'sponsor.spPaid': 'Toʻlangan, oʻrin ochiq',
    'sponsor.spWithdrawn': 'Bekor qilindi',
    'sponsor.amount': 'Summa: {amount}',
    'sponsor.reference': 'Maʼlumotnoma raqami: {reference}',
    'sponsor.nextPledged':
      'Hech narsa avtomatik olinmaydi: bu sahifa toʻlov yigʻmaydi. Toʻlov platformaga yetib kelganda xodimlar uni shu yerda qayd etadi va qayd etilganda oʻrin ochiladi.',
    'sponsor.nextPaid':
      'Qayd etildi. Oʻrin oʻquvchi uchun ochiq va oʻquvchiga kim toʻlagani aytilmagan.',
    'sponsor.nextWithdrawn': 'Bu vaʼda bekor qilindi, shuning uchun uning uchun pul kutilmaydi.',
    'sponsor.pledgedOn': 'Vaʼda sanasi: {date}',
    'sponsor.recordedOn': 'Toʻlov qayd etilgan sana: {date}',
    'sponsor.zakat':
      'Homiylik oʻrni zakot, sadaqa yoki ikkalasi ham emas deb hisoblanishi olimning hukmidir va bu platforma bunday hukm chiqarmaydi. Berishdan oldin ishongan kishingizdan soʻrang.',
    'sponsor.pay': 'Bu vaʼdani toʻlash',
    'sponsor.payLede':
      'Toʻlov tasdiqlanishi bilanoq oʻrin oʻquvchi uchun ochiladi. Ikki tomondan hech biri narigi tomon kimligini bilmaydi.',
    'sponsor.payApprove':
      'Toʻlovni telefoningizda tasdiqlang. Toʻlov tasdiqlangach oʻrin oʻquvchi uchun ochiladi. Bu biroz vaqt olishi mumkin.',
    'sponsor.payNot':
      'Bu vaʼdani shu yerda toʻlab boʻlmaydi: u toʻlangan yoki bekor qilingan, yoki sizning vaʼdalaringizdan emas.',
    'sponsor.nextPay':
      'Siz toʻlamaguningizcha hech narsa olinmaydi. Toʻlov tasdiqlanganda oʻrin ochiladi.',
    'sponsor.plEyebrow': 'Homiylik',
    'sponsor.plTitle': 'Boshqa kishining kursi uchun toʻlang',
    'sponsor.plLede':
      'Kursga qurbi yetmagan oʻquvchi uni soʻraydi, xodimlar esa qaror qiladi. Maʼqullangan soʻrov bu yerda kodi va kurs narxi bilan oʻrin sifatida koʻrinadi, ism esa hech qachon koʻrsatilmaydi. Siz oʻrinni tanlaysiz; kursni oʻquvchi oladi.',
    'sponsor.plSeeHeading': 'Nimani koʻrasiz va nimani koʻrmaysiz',
    'sponsor.plSeeBody':
      'Oʻrin kodi, kurs, u bola uchunmi yoki katta yoshli uchunmi, va mamlakatingizdagi narx. Oʻquvchining ismi, yoshi yoki oilasi emas, yozganlaridan bir soʻz ham emas. Uni faqat qaror qiladigan xodimlar oʻqiydi, boshqa hech kim emas.',
    'sponsor.plPayHeading': 'Nima toʻlaysiz va qachon',
    'sponsor.plPayBody':
      'Kursning mamlakatingizdagi narxi, xarid uchun qanday hisoblansa, shunday. Oʻrinni olish vaʼdadir va pul olinmaydi. Homiylik oʻrinlari sahifangiz vaʼda qanday toʻlanishini aytadi, toʻlov tasdiqlanganda esa oʻrin oʻquvchi uchun ochiladi.',
    'sponsor.plListHeading': 'Homiy kutayotgan oʻrinlar',
    'sponsor.plSignIn': 'Oʻrinlar tizimga kirgan kishilarga koʻrsatiladi.',
    'sponsor.plUnread':
      'Oʻrinlarni oʻqib boʻlmadi. Hech narsa undirilmadi va hech bir oʻrin olinmadi.',
    'sponsor.plOff':
      'Oʻrin homiyligi hozir oʻchirilgan, shuning uchun oʻrin olib ham, soʻrab ham boʻlmaydi.',
    'sponsor.plNone':
      'Hozir homiy kutayotgan oʻrin yoʻq. Soʻrov xodimlar maʼqullagandan keyin bu yerda koʻrinadi.',
    'sponsor.plForChild': 'Bola uchun',
    'sponsor.plForAdult': 'Katta yoshli uchun',
    'sponsor.plPriceNote':
      'Bu kursning mamlakatingizdagi narxi. Homiylik qilinadigani oʻrin, sovgʻa kartasi emas.',
    'sponsor.plNoPrice':
      'Bu kursning mamlakatingizda narxi yoʻq, shuning uchun bu oʻrinni shu yerdan olib boʻlmaydi.',
    'sponsor.plPriceUnread':
      'Bu oʻrinning narxini oʻqib boʻlmadi, shuning uchun uni hozircha olib boʻlmaydi.',
    'sponsor.plNoteLabel': 'Xodimlar uchun izoh, agar xohlasangiz',
    'sponsor.plTake': 'Bu oʻringa homiylik qilish',
    'sponsor.plTaken': 'Bu oʻrin endi toʻlash uchun sizniki: {amount}',
    'sponsor.plTakenNext':
      'Hech narsa olinmadi. Homiylik oʻrinlari sahifangiz qanday toʻlashni aytadi.',
    'sponsor.plWhyGone': 'Bu oʻrin hozirgina olindi yoki endi ochiq emas. Boshqasini tanlang.',
    'sponsor.plWhyOwn': 'Bu oʻzingiz soʻragan oʻrin. Oʻz soʻrovingizga homiylik qila olmaysiz.',
    'sponsor.tooLong': 'Bu shu maydonga sigʻadiganidan uzunroq.',
    'sponsor.plWhyFailed': 'Bu amalga oshmadi. Hech narsa undirilmadi va hech narsa oʻzgarmadi.',
    'sponsor.unconfirmed':
      'Bu qayd etilgan-etilmaganini tasdiqlay olmadik. Qayta urinishdan oldin homiylik oʻrinlaringizni koʻring.',
    'sponsor.plAskHeading': 'Oʻrin soʻrash',
    'sponsor.rqLede':
      'Agar kursga qurbingiz yetmasa, vaziyat haqida bir necha gap yozing. Xodimlar uni oʻqiydi va har ikki holatda ham sababi bilan javob beradi. Soʻrashning hech qanday toʻlovi yoʻq va hech kimni majbur qilmaydi.',
    'sponsor.rqCourse': 'Qaysi kurs?',
    'sponsor.rqChoose': 'Kursni tanlang',
    'sponsor.rqReason': 'Vaziyat qanday?',
    'sponsor.rqReasonNote':
      'Faqat qaror qiladigan xodimlar oʻqiydi, boshqa hech kim emas. Oʻrin uchun toʻlaydigan kishiga koʻrsatilmaydi.',
    'sponsor.rqSubmit': 'Bu oʻrinni soʻrash',
    'sponsor.rqDone':
      'Soʻraldi. Xodimlar uni oʻqiydi, javob esa sababi bilan homiylik oʻrinlari sahifangizda boʻladi.',
    'sponsor.rqNoLearner':
      'Bu hisobda hali oʻquvchi yoʻq, shuning uchun soʻrab beriladigan kishi yoʻq.',
    'sponsor.rqNoCourse': 'Hozir sotuvda kurs yoʻq, shuning uchun soʻraladigan narsa yoʻq.',
    'sponsor.rqPrivacy':
      'Soʻrov maʼqullansa, homiy oʻrin kodini, kursni, u bola uchunmi yoki katta yoshli uchunmi ekanini va narxni koʻradi. Ismingizni, oilangizni yoki bu yerda yozganingizni hech qachon koʻrmaydi.',
    'sponsor.rqWhyReason':
      'Vaziyat haqida bir gap yozing. Qaror qiladigan kishi aynan shuni oʻqiydi.',
    'sponsor.rqWhyHas':
      'Bu oʻquvchida bu kurs allaqachon bor, shuning uchun soʻraladigan narsa yoʻq.',
    'sponsor.rqWhyAsked': 'Bu kurs uchun allaqachon ochiq soʻrov bor.',
  },
  kk: {
    'sponsor.lede':
      'Ақысын басқа біреу төлеген курстар және басқа біреу оқысын деп ақысын сіз төлеген курстар. Екі тараптың ешқайсысы екіншісінің кім екенін білмейді.',
    'sponsor.off':
      'Орынға демеушілік жасау қазір өшірулі, сондықтан жаңа орын сұрауға да, жаңа орынға демеушілік жасауға да болмайды. Бұрын сұралған немесе демеушілік жасалған нәрселер осында көрсетіле береді.',
    'sponsor.askedHeading': 'Мен сұрағандар',
    'sponsor.askedUnread':
      'Сұрауларыңызды қазір оқу мүмкін болмады. Ештеңе өзгерген жоқ: бұл бет тек оқиды.',
    'sponsor.askedNone': 'Сіз демеушілік орын сұраған жоқсыз.',
    'sponsor.askedHow':
      'Курсқа қолыңыз жетпесе, сұрай аласыз. Оның ешқандай ақысы жоқ және ешкімді міндеттемейді.',
    'sponsor.askLink': 'Демеушілік орын сұрау',
    'sponsor.aCourse': 'Курс',
    'sponsor.forWhom': 'Кім үшін: {name}',
    'sponsor.apSubmitted': 'Біреудің оқуын күтуде',
    'sponsor.apApproved': 'Мақұлданды, демеуші күтілуде',
    'sponsor.apFunded': 'Өтелді: біреу осы орынның ақысын төледі',
    'sponsor.apDeclined': 'Мақұлданбады',
    'sponsor.apWithdrawn': 'Сұрау кері алынды',
    'sponsor.seat': 'Орын: {code}',
    'sponsor.staffNote': 'Қызметкерлердің өз сөзімен жазғаны:',
    'sponsor.askedOn': 'Сұралған күні: {date}',
    'sponsor.decidedOn': 'Шешім күні: {date}',
    'sponsor.coveredLead': 'Сіз сұраған орын өтелді.',
    'sponsor.coveredBody':
      'Курс енді оқушыға ашық. Төлеген адамның аты мұнда жазылмайды және бұл әдейі жасалған: кімнің бергені берушінің және Алланың арасындағы іс.',
    'sponsor.gaveHeading': 'Мен демеушілік жасағандар',
    'sponsor.gaveUnread':
      'Демеушіліктеріңізді қазір оқу мүмкін болмады. Ештеңе өзгерген жоқ: бұл бет тек оқиды.',
    'sponsor.gaveNone': 'Сіз ешбір орынға демеушілік жасаған жоқсыз.',
    'sponsor.gaveHow': 'Күтіп тұрған әр орын біреу сұраған курс.',
    'sponsor.spPledged': 'Уәде берілді: төлемнің тіркелуі күтілуде',
    'sponsor.spPaid': 'Төленді, орын ашық',
    'sponsor.spWithdrawn': 'Тоқтатылды',
    'sponsor.amount': 'Сома: {amount}',
    'sponsor.reference': 'Анықтама нөмірі: {reference}',
    'sponsor.nextPledged':
      'Ештеңе автоматты түрде алынбайды: бұл бет төлем жинамайды. Төлем платформаға жеткенде қызметкерлер оны осында тіркейді, тіркелгенде орын ашылады.',
    'sponsor.nextPaid': 'Тіркелді. Орын оқушыға ашық, ал оқушыға кім төлегені айтылған жоқ.',
    'sponsor.nextWithdrawn': 'Бұл уәде тоқтатылды, сондықтан ол үшін ақша күтілмейді.',
    'sponsor.pledgedOn': 'Уәде берілген күні: {date}',
    'sponsor.recordedOn': 'Төлем тіркелген күні: {date}',
    'sponsor.zakat':
      'Демеушілік орынның зекет, садақа немесе екеуінің ешқайсысы емес болып саналуы ғалымның үкімі, ал бұл платформа ондай үкім шығармайды. Бермес бұрын сенетін адамыңыздан сұраңыз.',
    'sponsor.pay': 'Осы уәдені төлеу',
    'sponsor.payLede':
      'Төлем расталған бойда орын оқушыға ашылады. Екі тараптың ешқайсысы екіншісінің кім екенін білмейді.',
    'sponsor.payApprove':
      'Төлемді телефоныңызда мақұлдаңыз. Төлем расталғаннан кейін орын оқушыға ашылады. Бұл біраз уақыт алуы мүмкін.',
    'sponsor.payNot':
      'Бұл уәдені осы жерде төлеу мүмкін емес: ол төленген немесе күші жойылған, не болмаса сіздің уәделеріңіздің бірі емес.',
    'sponsor.nextPay': 'Сіз төлемейінше ештеңе алынбайды. Төлем расталғанда орын ашылады.',
    'sponsor.plEyebrow': 'Демеушілік',
    'sponsor.plTitle': 'Басқа біреудің курсының ақысын төлеңіз',
    'sponsor.plLede':
      'Курстың ақысын төлей алмайтын оқушы оны сұрайды, ал қызметкерлер шешім қабылдайды. Мақұлданған өтініш мұнда коды мен курстың бағасы бар орын болып көрінеді, аты ешқашан көрсетілмейді. Сіз орынды таңдайсыз; курсты оқушы алады.',
    'sponsor.plSeeHeading': 'Нені көресіз, нені көрмейсіз',
    'sponsor.plSeeBody':
      'Орынның коды, курс, оның балаға немесе ересекке арналғаны және еліңіздегі баға. Оқушының аты, жасы не отбасы емес, жазғанынан бір сөз де емес. Оны тек шешім қабылдайтын қызметкерлер оқиды, басқа ешкім оқымайды.',
    'sponsor.plPayHeading': 'Не төлейсіз және қашан',
    'sponsor.plPayBody':
      'Курстың еліңіздегі бағасы, сатып алғандағыдай есептеледі. Орынды алу — уәде, ақша алынбайды. Демеушілік орындар бетіңіз уәденің қалай төленетінін айтады, төлем расталғанда орын оқушыға ашылады.',
    'sponsor.plListHeading': 'Демеуші күтіп тұрған орындар',
    'sponsor.plSignIn': 'Орындар жүйеге кірген адамдарға көрсетіледі.',
    'sponsor.plUnread':
      'Орындарды оқу мүмкін болмады. Ештеңе алынған жоқ және ешбір орын алынған жоқ.',
    'sponsor.plOff':
      'Орынға демеушілік қазір өшірулі, сондықтан орын алу да, сұрау да мүмкін емес.',
    'sponsor.plNone':
      'Қазір демеуші күтіп тұрған орын жоқ. Өтініш қызметкерлер мақұлдағаннан кейін мұнда көрінеді.',
    'sponsor.plForChild': 'Балаға арналған',
    'sponsor.plForAdult': 'Ересекке арналған',
    'sponsor.plPriceNote':
      'Бұл курстың еліңіздегі бағасы. Демеушілік жасалатын нәрсе — орын, сыйлық картасы емес.',
    'sponsor.plNoPrice':
      'Бұл курстың еліңізде бағасы жоқ, сондықтан бұл орынды осы жерден алу мүмкін емес.',
    'sponsor.plPriceUnread':
      'Бұл орынның бағасын оқу мүмкін болмады, сондықтан оны әзірге алу мүмкін емес.',
    'sponsor.plNoteLabel': 'Қаласаңыз, қызметкерлерге жазба',
    'sponsor.plTake': 'Осы орынға демеуші болу',
    'sponsor.plTaken': 'Бұл орын енді төлеу үшін сіздікі: {amount}',
    'sponsor.plTakenNext':
      'Ештеңе алынған жоқ. Демеушілік орындар бетіңіз қалай төлеу керегін айтады.',
    'sponsor.plWhyGone': 'Бұл орын жаңа ғана алынды немесе енді ашық емес. Басқасын таңдаңыз.',
    'sponsor.plWhyOwn': 'Бұл — өзіңіз сұраған орын. Өз өтінішіңізге демеуші бола алмайсыз.',
    'sponsor.tooLong': 'Бұл осы өріске сыятынынан ұзын.',
    'sponsor.plWhyFailed': 'Бұл орындалмады. Ештеңе алынған жоқ және ештеңе өзгерген жоқ.',
    'sponsor.unconfirmed':
      'Оның тіркелген-тіркелмегенін растай алмадық. Қайта әрекеттенбес бұрын демеушілік орындарыңызды қараңыз.',
    'sponsor.plAskHeading': 'Орын сұрау',
    'sponsor.rqLede':
      'Курсқа қолыңыз жетпесе, жағдай туралы бірнеше сөйлем жазыңыз. Қызметкерлер оны оқып, екі жағдайда да себебімен жауап береді. Сұраудың ешқандай ақысы жоқ және ешкімді міндеттемейді.',
    'sponsor.rqCourse': 'Қай курс?',
    'sponsor.rqChoose': 'Курсты таңдаңыз',
    'sponsor.rqReason': 'Жағдай қандай?',
    'sponsor.rqReasonNote':
      'Тек шешім қабылдайтын қызметкерлер оқиды, басқа ешкім оқымайды. Орынның ақысын төлейтін адамға көрсетілмейді.',
    'sponsor.rqSubmit': 'Осы орынды сұрау',
    'sponsor.rqDone':
      'Сұралды. Қызметкерлер оны оқиды, ал жауап себебімен бірге демеушілік орындар бетіңізде болады.',
    'sponsor.rqNoLearner': 'Бұл тіркелгіде әлі оқушы жоқ, сондықтан кім үшін сұрайтын ешкім жоқ.',
    'sponsor.rqNoCourse': 'Қазір сатылымда курс жоқ, сондықтан сұрайтын ештеңе жоқ.',
    'sponsor.rqPrivacy':
      'Өтініш мақұлданса, демеуші орынның кодын, курсты, оның балаға немесе ересекке арналғанын және бағаны көреді. Атыңызды, отбасыңызды немесе осы жерде жазғаныңызды ешқашан көрмейді.',
    'sponsor.rqWhyReason': 'Жағдай туралы бір сөйлем жазыңыз. Шешім қабылдайтын адам соны оқиды.',
    'sponsor.rqWhyHas': 'Ол оқушыда бұл курс бұрыннан бар, сондықтан сұрайтын ештеңе жоқ.',
    'sponsor.rqWhyAsked': 'Бұл курс бойынша ашық өтініш бұрыннан бар.',
  },
  az: {
    'sponsor.lede':
      'Haqqını başqa birinin ödədiyi kurslar və başqa biri oxusun deyə haqqını sizin ödədiyiniz kurslar. İki tərəfdən heç biri o birinin kim olduğunu bilmir.',
    'sponsor.off':
      'Yerə sponsorluq hazırda söndürülüb, ona görə yeni yer istəmək və ya yeni yerə sponsorluq etmək mümkün deyil. Əvvəl istənilən və ya sponsorluq edilənlər burada göstərilməyə davam edir.',
    'sponsor.askedHeading': 'İstədiklərim',
    'sponsor.askedUnread':
      'İstəkləriniz hazırda oxuna bilmədi. Heç nə dəyişməyib: bu səhifə yalnız oxuyur.',
    'sponsor.askedNone': 'Siz sponsorlu yer istəməmisiniz.',
    'sponsor.askedHow':
      'Kurs imkanınızdan kənardırsa, istəyə bilərsiniz. Bunun heç bir haqqı yoxdur və heç kimi məcbur etmir.',
    'sponsor.askLink': 'Sponsorlu yer istəyin',
    'sponsor.aCourse': 'Kurs',
    'sponsor.forWhom': 'Kimin üçün: {name}',
    'sponsor.apSubmitted': 'Kiminsə oxuması gözlənilir',
    'sponsor.apApproved': 'Təsdiqləndi, sponsor gözlənilir',
    'sponsor.apFunded': 'Qarşılandı: kimsə bu yerin haqqını ödədi',
    'sponsor.apDeclined': 'Təsdiqlənmədi',
    'sponsor.apWithdrawn': 'İstək geri götürüldü',
    'sponsor.seat': 'Yer: {code}',
    'sponsor.staffNote': 'Əməkdaşların öz sözləri ilə yazdığı:',
    'sponsor.askedOn': 'İstək tarixi: {date}',
    'sponsor.decidedOn': 'Qərar tarixi: {date}',
    'sponsor.coveredLead': 'İstədiyiniz bir yer qarşılandı.',
    'sponsor.coveredBody':
      'Kurs indi öyrənən üçün açıqdır. Ödəyən şəxsin adı burada yazılmır və bu qəsdən belədir: kimin verdiyi verənlə Allah arasındadır.',
    'sponsor.gaveHeading': 'Sponsorluq etdiklərim',
    'sponsor.gaveUnread':
      'Sponsorluqlarınız hazırda oxuna bilmədi. Heç nə dəyişməyib: bu səhifə yalnız oxuyur.',
    'sponsor.gaveNone': 'Siz heç bir yerə sponsorluq etməmisiniz.',
    'sponsor.gaveHow': 'Gözləyən hər yer kiminsə istədiyi kursdur.',
    'sponsor.spPledged': 'Söz verilib: ödənişin qeydə alınması gözlənilir',
    'sponsor.spPaid': 'Ödənilib, yer açıqdır',
    'sponsor.spWithdrawn': 'Ləğv edildi',
    'sponsor.amount': 'Məbləğ: {amount}',
    'sponsor.reference': 'İstinad nömrəsi: {reference}',
    'sponsor.nextPledged':
      'Heç nə avtomatik götürülmür: bu səhifə ödəniş yığmır. Ödəniş platformaya çatanda əməkdaşlar onu burada qeydə alır və qeydə alınanda yer açılır.',
    'sponsor.nextPaid':
      'Qeydə alındı. Yer öyrənən üçün açıqdır və öyrənənə kimin ödədiyi deyilməyib.',
    'sponsor.nextWithdrawn': 'Bu söz ləğv edildi, ona görə onun üçün pul gözlənilmir.',
    'sponsor.pledgedOn': 'Söz verilən tarix: {date}',
    'sponsor.recordedOn': 'Ödənişin qeydə alındığı tarix: {date}',
    'sponsor.zakat':
      'Sponsorlu yerin zəkat, sədəqə və ya heç biri sayılması bir alimin hökmüdür və bu platforma həmin hökmü vermir. Verməzdən əvvəl etibar etdiyiniz birindən soruşun.',
    'sponsor.pay': 'Bu sözü ödəyin',
    'sponsor.payLede':
      'Ödəniş təsdiqlənən kimi yer öyrənən üçün açılır. İki tərəfdən heç biri o birinin kim olduğunu bilmir.',
    'sponsor.payApprove':
      'Ödənişi telefonunuzda təsdiqləyin. Ödəniş təsdiqlənən kimi yer öyrənən üçün açılır. Bu, bir az vaxt apara bilər.',
    'sponsor.payNot':
      'Bu söz burada ödənilə bilməz: o ya ödənilib, ya ləğv edilib, ya da sizin sözlərinizdən biri deyil.',
    'sponsor.nextPay': 'Siz ödəyənə qədər heç nə götürülmür. Ödəniş təsdiqlənəndə yer açılır.',
    'sponsor.plEyebrow': 'Sponsorluq',
    'sponsor.plTitle': 'Başqa birinin kursunun haqqını ödəyin',
    'sponsor.plLede':
      'Kursun haqqını ödəyə bilməyən öyrənən onu istəyir, əməkdaşlar isə qərar verir. Təsdiqlənmiş istək burada kodu və kursun qiyməti olan yer kimi görünür, ad isə heç vaxt göstərilmir. Siz yer seçirsiniz; kursu öyrənən alır.',
    'sponsor.plSeeHeading': 'Nəyi görürsünüz, nəyi görmürsünüz',
    'sponsor.plSeeBody':
      'Yerin kodu, kurs, onun uşaq və ya böyük üçün olması və ölkənizdəki qiymət. Öyrənənin adı, yaşı və ya ailəsi deyil, yazdıqlarından bir söz belə deyil. Onu yalnız qərar verən əməkdaşlar oxuyur, başqa heç kim oxumur.',
    'sponsor.plPayHeading': 'Nə ödəyirsiniz və nə vaxt',
    'sponsor.plPayBody':
      'Kursun ölkənizdəki qiyməti, alış üçün hesablandığı kimi. Yeri götürmək sözdür və pul götürülmür. Sponsorlu yerlər səhifəniz sözün necə ödəndiyini deyir, ödəniş təsdiqlənəndə isə yer öyrənən üçün açılır.',
    'sponsor.plListHeading': 'Sponsor gözləyən yerlər',
    'sponsor.plSignIn': 'Yerlər daxil olmuş şəxslərə göstərilir.',
    'sponsor.plUnread':
      'Yerləri oxumaq mümkün olmadı. Heç nə tutulmayıb və heç bir yer götürülməyib.',
    'sponsor.plOff':
      'Yer sponsorluğu hazırda söndürülüb, ona görə nə yer götürmək, nə də istəmək olar.',
    'sponsor.plNone':
      'Hazırda sponsor gözləyən yer yoxdur. İstək əməkdaşlar təsdiqlədikdən sonra burada görünür.',
    'sponsor.plForChild': 'Uşaq üçün',
    'sponsor.plForAdult': 'Böyük üçün',
    'sponsor.plPriceNote':
      'Bu kursun ölkənizdəki qiyməti. Sponsorluq edilən yerdir, hədiyyə kartı deyil.',
    'sponsor.plNoPrice':
      'Bu kursun ölkənizdə qiyməti yoxdur, ona görə bu yeri buradan götürmək olmur.',
    'sponsor.plPriceUnread':
      'Bu yerin qiymətini oxumaq mümkün olmadı, ona görə onu hələlik götürmək olmur.',
    'sponsor.plNoteLabel': 'İstəsəniz, əməkdaşlar üçün qeyd',
    'sponsor.plTake': 'Bu yerə sponsor olun',
    'sponsor.plTaken': 'Bu yer indi ödəmək üçün sizindir: {amount}',
    'sponsor.plTakenNext': 'Heç nə götürülməyib. Sponsorlu yerlər səhifəniz necə ödəməyi deyir.',
    'sponsor.plWhyGone': 'Bu yer indicə götürülüb və ya artıq açıq deyil. Başqasını seçin.',
    'sponsor.plWhyOwn':
      'Bu, özünüzün istədiyiniz yerdir. Öz istəyinizə sponsor ola bilməzsiniz.',
    'sponsor.tooLong': 'Bu, xananın tutduğundan uzundur.',
    'sponsor.plWhyFailed': 'Alınmadı. Heç nə tutulmayıb və heç nə dəyişməyib.',
    'sponsor.unconfirmed':
      'Bunun qeydə alınıb-alınmadığını təsdiqləyə bilmədik. Yenidən cəhd etməzdən əvvəl sponsorlu yerlərinizə baxın.',
    'sponsor.plAskHeading': 'Yer istəmək',
    'sponsor.rqLede':
      'Kurs imkanınızdan kənardırsa, vəziyyət haqqında bir neçə cümlə yazın. Əməkdaşlar onu oxuyur və hər iki halda səbəbi ilə cavab verir. İstəməyin heç bir haqqı yoxdur və heç kimi məcbur etmir.',
    'sponsor.rqCourse': 'Hansı kurs?',
    'sponsor.rqChoose': 'Kurs seçin',
    'sponsor.rqReason': 'Vəziyyət necədir?',
    'sponsor.rqReasonNote':
      'Yalnız qərar verən əməkdaşlar oxuyur, başqa heç kim oxumur. Yerin haqqını ödəyən şəxsə göstərilmir.',
    'sponsor.rqSubmit': 'Bu yeri istəyin',
    'sponsor.rqDone':
      'İstənildi. Əməkdaşlar onu oxuyacaq, cavab isə səbəbi ilə birlikdə sponsorlu yerlər səhifənizdə olacaq.',
    'sponsor.rqNoLearner': 'Bu hesabda hələ öyrənən yoxdur, ona görə kimin üçünsə istəmək olmur.',
    'sponsor.rqNoCourse': 'Hazırda satışda kurs yoxdur, ona görə istəniləcək bir şey yoxdur.',
    'sponsor.rqPrivacy':
      'İstək təsdiqlənərsə, sponsor yerin kodunu, kursu, onun uşaq və ya böyük üçün olmasını və qiyməti görür. Adınızı, ailənizi və ya burada yazdığınızı heç vaxt görmür.',
    'sponsor.rqWhyReason': 'Vəziyyət haqqında bir cümlə yazın. Qərar verən şəxs məhz onu oxuyur.',
    'sponsor.rqWhyHas':
      'Həmin öyrənəndə bu kurs artıq var, ona görə istəniləcək bir şey yoxdur.',
    'sponsor.rqWhyAsked': 'Bu kurs üçün artıq açıq istək var.',
  },
  tg: {
    'sponsor.lede':
      'Курсҳое, ки ҳаққашонро каси дигар пардохтааст, ва курсҳое, ки ҳаққашонро шумо пардохтаед, то каси дигар хонад. Ҳеҷ яке аз ду тараф намедонад, ки тарафи дигар кист.',
    'sponsor.off':
      'Сарпарастии ҷой ҳоло хомӯш аст, бинобар ин на ҷойи нав дархост кардан мумкин аст ва на ба ҷойи нав сарпарастӣ кардан. Он чи пештар дархост ё сарпарастӣ шудааст, ҳанӯз дар ин ҷо нишон дода мешавад.',
    'sponsor.askedHeading': 'Он чи ман дархост кардаам',
    'sponsor.askedUnread':
      'Дархостҳои шуморо ҳоло хондан муяссар нашуд. Ҳеҷ чиз тағйир наёфтааст: ин саҳифа танҳо мехонад.',
    'sponsor.askedNone': 'Шумо ҷойи сарпарастӣ дархост накардаед.',
    'sponsor.askedHow':
      'Агар курс аз имкони шумо берун бошад, дархост карда метавонед. Ин ҳеҷ ҳаққе надорад ва ҳеҷ касро вазифадор намекунад.',
    'sponsor.askLink': 'Дархости ҷойи сарпарастӣ',
    'sponsor.aCourse': 'Курс',
    'sponsor.forWhom': 'Барои: {name}',
    'sponsor.apSubmitted': 'Мунтазири он, ки касе онро хонад',
    'sponsor.apApproved': 'Тасдиқ шуд, мунтазири сарпараст',
    'sponsor.apFunded': 'Пӯшонида шуд: касе ҳаққи ин ҷойро пардохт',
    'sponsor.apDeclined': 'Тасдиқ нашуд',
    'sponsor.apWithdrawn': 'Дархост бозпас гирифта шуд',
    'sponsor.seat': 'Ҷой: {code}',
    'sponsor.staffNote': 'Он чи кормандон бо суханони худ навиштаанд:',
    'sponsor.askedOn': 'Санаи дархост: {date}',
    'sponsor.decidedOn': 'Санаи қарор: {date}',
    'sponsor.coveredLead': 'Ҷойе, ки дархост карда будед, пӯшонида шуд.',
    'sponsor.coveredBody':
      'Курс акнун барои хонанда кушода аст. Номи пардохткунанда дар ин ҷо навишта намешавад ва ин қасдан аст: кӣ додааст, кори байни диҳанда ва Аллоҳ аст.',
    'sponsor.gaveHeading': 'Он чи ман сарпарастӣ кардаам',
    'sponsor.gaveUnread':
      'Сарпарастиҳои шуморо ҳоло хондан муяссар нашуд. Ҳеҷ чиз тағйир наёфтааст: ин саҳифа танҳо мехонад.',
    'sponsor.gaveNone': 'Шумо ба ягон ҷой сарпарастӣ накардаед.',
    'sponsor.gaveHow': 'Ҳар ҷойи мунтазир курсест, ки касе дархост кардааст.',
    'sponsor.spPledged': 'Ваъда дода шуд: мунтазири сабти пардохт',
    'sponsor.spPaid': 'Пардохт шуд, ҷой кушода аст',
    'sponsor.spWithdrawn': 'Бекор карда шуд',
    'sponsor.amount': 'Маблағ: {amount}',
    'sponsor.reference': 'Рақами истинод: {reference}',
    'sponsor.nextPledged':
      'Ҳеҷ чиз ба таври худкор гирифта намешавад: ин саҳифа пардохт ҷамъ намекунад. Вақте ки пардохт ба платформа мерасад, кормандон онро дар ин ҷо сабт мекунанд ва ҳангоми сабт ҷой кушода мешавад.',
    'sponsor.nextPaid':
      'Сабт шуд. Ҷой барои хонанда кушода аст ва ба хонанда гуфта нашудааст, ки кӣ пардохтааст.',
    'sponsor.nextWithdrawn': 'Ин ваъда бекор карда шуд, бинобар ин барои он пул интизор нест.',
    'sponsor.pledgedOn': 'Санаи ваъда: {date}',
    'sponsor.recordedOn': 'Санаи сабти пардохт: {date}',
    'sponsor.zakat':
      'Ҷойи сарпарастӣ закот ҳисоб мешавад, садақа ё ҳеҷ кадоме аз ин ду, ҳукми олим аст ва ин платформа чунин ҳукм намебарорад. Пеш аз додан аз касе, ки ба ӯ боварӣ доред, бипурсед.',
    'sponsor.pay': 'Пардохти ин ваъда',
    'sponsor.payLede':
      'Ҷой баробари тасдиқ шудани пардохт барои хонанда кушода мешавад. Ҳеҷ яке аз ду тараф намедонад, ки тарафи дигар кист.',
    'sponsor.payApprove':
      'Пардохтро дар телефони худ тасдиқ кунед. Ҷой пас аз тасдиқи пардохт барои хонанда кушода мешавад. Ин метавонад каме вақт гирад.',
    'sponsor.payNot':
      'Ин ваъдаро дар ин ҷо пардохтан мумкин нест: он пардохт ё бекор шудааст, ё аз ваъдаҳои шумо нест.',
    'sponsor.nextPay':
      'То шумо пардохт накунед, ҳеҷ чиз гирифта намешавад. Ҷой ҳангоми тасдиқи пардохт кушода мешавад.',
    'sponsor.plEyebrow': 'Сарпарастӣ',
    'sponsor.plTitle': 'Ҳаққи курси каси дигарро пардозед',
    'sponsor.plLede':
      'Хонандае, ки ҳаққи курсро пардохта наметавонад, онро дархост мекунад ва кормандон қарор мекунанд. Дархости тасдиқшуда дар ин ҷо ҳамчун ҷой бо рамз ва нархи курс намоён мешавад ва ҳеҷ гоҳ бо ном нест. Шумо ҷойро интихоб мекунед; курсро хонанда мегирад.',
    'sponsor.plSeeHeading': 'Чиро мебинед ва чиро намебинед',
    'sponsor.plSeeBody':
      'Рамзи ҷой, курс, барои кӯдак ё калонсол буданаш ва нарх дар кишвари шумо. На ном, на син ва на оилаи хонанда, ва на як калима аз навиштааш. Онро танҳо кормандоне, ки қарор мекунанд, мехонанд ва ҳеҷ каси дигар.',
    'sponsor.plPayHeading': 'Чӣ мепардозед ва кай',
    'sponsor.plPayBody':
      'Нархи курс дар кишвари шумо, ҳамон тавре ки барои харид ҳисоб мешавад. Гирифтани ҷой ваъда аст ва пуле гирифта намешавад. Саҳифаи ҷойҳои сарпарастии шумо мегӯяд, ки ваъда чӣ гуна пардохт мешавад, ва ҷой ҳангоми тасдиқи пардохт барои хонанда кушода мешавад.',
    'sponsor.plListHeading': 'Ҷойҳои мунтазири сарпараст',
    'sponsor.plSignIn': 'Ҷойҳо ба шахсоне нишон дода мешаванд, ки ворид шудаанд.',
    'sponsor.plUnread':
      'Ҷойҳоро хондан муяссар нашуд. Ҳеҷ чиз ситонида нашуд ва ҳеҷ ҷой гирифта нашуд.',
    'sponsor.plOff':
      'Сарпарастии ҷой ҳоло хомӯш аст, бинобар ин на ҷой гирифтан мумкин аст ва на дархост кардан.',
    'sponsor.plNone':
      'Ҳоло ҳеҷ ҷой мунтазири сарпараст нест. Дархост пас аз тасдиқи кормандон дар ин ҷо намоён мешавад.',
    'sponsor.plForChild': 'Барои кӯдак',
    'sponsor.plForAdult': 'Барои калонсол',
    'sponsor.plPriceNote':
      'Нархи ин курс дар кишвари шумо. Он чи сарпарастӣ мешавад, ҷой аст, на корти тӯҳфа.',
    'sponsor.plNoPrice':
      'Ин курс дар кишвари шумо нарх надорад, бинобар ин ин ҷойро аз ин ҷо гирифтан мумкин нест.',
    'sponsor.plPriceUnread':
      'Нархи ин ҷойро хондан муяссар нашуд, бинобар ин онро ҳоло гирифтан мумкин нест.',
    'sponsor.plNoteLabel': 'Ёддошт барои кормандон, агар хоҳед',
    'sponsor.plTake': 'Ба ин ҷой сарпарастӣ кунед',
    'sponsor.plTaken': 'Ин ҷой акнун барои пардохт аз они шумост: {amount}',
    'sponsor.plTakenNext':
      'Ҳеҷ чиз гирифта нашудааст. Саҳифаи ҷойҳои сарпарастии шумо мегӯяд, ки чӣ гуна пардохт кунед.',
    'sponsor.plWhyGone': 'Он ҷой ҳозир гирифта шуд ё дигар кушода нест. Дигареро интихоб кунед.',
    'sponsor.plWhyOwn':
      'Ин ҳамон ҷоест, ки худатон дархост кардаед. Ба дархости худ сарпарастӣ карда наметавонед.',
    'sponsor.tooLong': 'Ин аз ғунҷоиши ин майдон дарозтар аст.',
    'sponsor.plWhyFailed': 'Ин нашуд. Ҳеҷ чиз ситонида нашуд ва ҳеҷ чиз тағйир наёфт.',
    'sponsor.unconfirmed':
      'Мо тасдиқ карда натавонистем, ки ин сабт шудааст ё не. Пеш аз кӯшиши дубора ҷойҳои сарпарастии худро бинед.',
    'sponsor.plAskHeading': 'Дархости ҷой',
    'sponsor.rqLede':
      'Агар курс аз имкони шумо берун бошад, дар бораи вазъият чанд ҷумла нависед. Кормандон онро мехонанд ва дар ҳар ду ҳолат бо зикри сабаб ҷавоб медиҳанд. Дархост ҳеҷ ҳаққе надорад ва ҳеҷ касро вазифадор намекунад.',
    'sponsor.rqCourse': 'Кадом курс?',
    'sponsor.rqChoose': 'Курсро интихоб кунед',
    'sponsor.rqReason': 'Вазъият чӣ гуна аст?',
    'sponsor.rqReasonNote':
      'Танҳо кормандоне, ки қарор мекунанд, мехонанд ва ҳеҷ каси дигар. Ба касе, ки ҳаққи ҷойро мепардозад, нишон дода намешавад.',
    'sponsor.rqSubmit': 'Ин ҷойро дархост кунед',
    'sponsor.rqDone':
      'Дархост шуд. Кормандон онро мехонанд ва ҷавоб бо сабабаш дар саҳифаи ҷойҳои сарпарастии шумо хоҳад буд.',
    'sponsor.rqNoLearner':
      'Дар ин ҳисоб ҳоло хонандае нест, бинобар ин касе нест, ки барояш дархост шавад.',
    'sponsor.rqNoCourse': 'Ҳоло ҳеҷ курс дар фурӯш нест, бинобар ин чизе барои дархост нест.',
    'sponsor.rqPrivacy':
      'Агар дархост тасдиқ шавад, сарпараст рамзи ҷой, курс, барои кӯдак ё калонсол буданаш ва нархро мебинад. Номи шумо, оилаи шумо ё он чиро, ки дар ин ҷо навиштаед, ҳеҷ гоҳ намебинад.',
    'sponsor.rqWhyReason':
      'Дар бораи вазъият як ҷумла нависед. Шахси қароркунанда маҳз ҳаминро мехонад.',
    'sponsor.rqWhyHas':
      'Он хонанда аллакай ин курсро дорад, бинобар ин чизе барои дархост нест.',
    'sponsor.rqWhyAsked': 'Барои ин курс аллакай дархости кушода ҳаст.',
  },
  ky: {
    'sponsor.lede':
      'Акысын башка бирөө төлөгөн курстар жана башка бирөө окусун деп акысын сиз төлөгөн курстар. Эки тараптын бири да экинчисинин ким экенин билбейт.',
    'sponsor.off':
      'Орунга демөөрчүлүк кылуу азыр өчүрүлгөн, ошондуктан жаңы орун суроого да, жаңы орунга демөөрчүлүк кылууга да болбойт. Мурда суралган же демөөрчүлүк кылынган нерселер бул жерде көрсөтүлө берет.',
    'sponsor.askedHeading': 'Мен сурагандар',
    'sponsor.askedUnread':
      'Суроолоруңузду азыр окуу мүмкүн болгон жок. Эч нерсе өзгөргөн жок: бул барак окуйт гана.',
    'sponsor.askedNone': 'Сиз демөөрчүлүк орун сураган жоксуз.',
    'sponsor.askedHow':
      'Курс колуңуздан келбесе, сурай аласыз. Анын эч кандай акысы жок жана эч кимди милдеттендирбейт.',
    'sponsor.askLink': 'Демөөрчүлүк орун суроо',
    'sponsor.aCourse': 'Курс',
    'sponsor.forWhom': 'Ким үчүн: {name}',
    'sponsor.apSubmitted': 'Бирөөнүн окушун күтүүдө',
    'sponsor.apApproved': 'Жактырылды, демөөрчү күтүлүүдө',
    'sponsor.apFunded': 'Жабылды: бирөө бул орундун акысын төлөдү',
    'sponsor.apDeclined': 'Жактырылган жок',
    'sponsor.apWithdrawn': 'Суроо кайра алынды',
    'sponsor.seat': 'Орун: {code}',
    'sponsor.staffNote': 'Кызматкерлердин өз сөзү менен жазганы:',
    'sponsor.askedOn': 'Суралган күнү: {date}',
    'sponsor.decidedOn': 'Чечим күнү: {date}',
    'sponsor.coveredLead': 'Сиз сураган орун жабылды.',
    'sponsor.coveredBody':
      'Курс эми окуучуга ачык. Төлөгөн адамдын аты бул жерде жазылбайт жана бул атайылап жасалган: ким бергени берүүчү менен Алланын ортосундагы иш.',
    'sponsor.gaveHeading': 'Мен демөөрчүлүк кылгандар',
    'sponsor.gaveUnread':
      'Демөөрчүлүктөрүңүздү азыр окуу мүмкүн болгон жок. Эч нерсе өзгөргөн жок: бул барак окуйт гана.',
    'sponsor.gaveNone': 'Сиз эч бир орунга демөөрчүлүк кылган жоксуз.',
    'sponsor.gaveHow': 'Күтүп турган ар бир орун бирөө сураган курс.',
    'sponsor.spPledged': 'Убада берилди: төлөмдүн катталышы күтүлүүдө',
    'sponsor.spPaid': 'Төлөндү, орун ачык',
    'sponsor.spWithdrawn': 'Токтотулду',
    'sponsor.amount': 'Сумма: {amount}',
    'sponsor.reference': 'Шилтеме номери: {reference}',
    'sponsor.nextPledged':
      'Эч нерсе автоматтык түрдө алынбайт: бул барак төлөм чогултпайт. Төлөм платформага жеткенде кызматкерлер аны ушул жерде каттайт, катталганда орун ачылат.',
    'sponsor.nextPaid': 'Катталды. Орун окуучуга ачык, ал эми окуучуга ким төлөгөнү айтылган жок.',
    'sponsor.nextWithdrawn': 'Бул убада токтотулду, ошондуктан ал үчүн акча күтүлбөйт.',
    'sponsor.pledgedOn': 'Убада берилген күнү: {date}',
    'sponsor.recordedOn': 'Төлөм катталган күнү: {date}',
    'sponsor.zakat':
      'Демөөрчүлүк орундун зекет, садака же экөөнүн бири да эмес деп эсептелиши аалымдын өкүмү, ал эми бул платформа андай өкүм чыгарбайт. Берерден мурун ишенген адамыңыздан сураңыз.',
    'sponsor.pay': 'Бул убаданы төлөө',
    'sponsor.payLede':
      'Төлөм ырасталары менен орун окуучуга ачылат. Эки тараптын бири да экинчисинин ким экенин билбейт.',
    'sponsor.payApprove':
      'Төлөмдү телефонуңузда жактырыңыз. Төлөм ырасталгандан кийин орун окуучуга ачылат. Бул бир аз убакыт алышы мүмкүн.',
    'sponsor.payNot':
      'Бул убаданы бул жерде төлөөгө болбойт: ал төлөнгөн же жокко чыгарылган, же сиздин убадаларыңыздын бири эмес.',
    'sponsor.nextPay': 'Сиз төлөмөйүнчө эч нерсе алынбайт. Төлөм ырасталганда орун ачылат.',
    'sponsor.plEyebrow': 'Демөөрчүлүк',
    'sponsor.plTitle': 'Башка бирөөнүн курсунун акысын төлөңүз',
    'sponsor.plLede':
      'Курстун акысын төлөй албаган окуучу аны сурайт, ал эми кызматкерлер чечим кабыл алат. Жактырылган өтүнүч бул жерде коду жана курстун баасы бар орун болуп көрүнөт, аты эч качан көрсөтүлбөйт. Сиз орунду тандайсыз; курсту окуучу алат.',
    'sponsor.plSeeHeading': 'Эмнени көрөсүз, эмнени көрбөйсүз',
    'sponsor.plSeeBody':
      'Орундун коду, курс, анын балага же чоң кишиге арналганы жана өлкөңүздөгү баа. Окуучунун аты, жашы же үй-бүлөсү эмес, жазганынан бир сөз да эмес. Аны чечим кабыл алган кызматкерлер гана окуйт, башка эч ким окубайт.',
    'sponsor.plPayHeading': 'Эмне төлөйсүз жана качан',
    'sponsor.plPayBody':
      'Курстун өлкөңүздөгү баасы, сатып алгандагыдай эсептелет. Орунду алуу — убада, акча алынбайт. Демөөрчүлүк орундар барагыңыз убада кантип төлөнөрүн айтат, төлөм ырасталганда орун окуучуга ачылат.',
    'sponsor.plListHeading': 'Демөөрчү күтүп турган орундар',
    'sponsor.plSignIn': 'Орундар системага кирген адамдарга көрсөтүлөт.',
    'sponsor.plUnread':
      'Орундарды окуу мүмкүн болгон жок. Эч нерсе алынган жок жана эч бир орун алынган жок.',
    'sponsor.plOff':
      'Орунга демөөрчүлүк азыр өчүрүлгөн, ошондуктан орун алууга да, суроого да болбойт.',
    'sponsor.plNone':
      'Азыр демөөрчү күтүп турган орун жок. Өтүнүч кызматкерлер жактыргандан кийин бул жерде көрүнөт.',
    'sponsor.plForChild': 'Балага арналган',
    'sponsor.plForAdult': 'Чоң кишиге арналган',
    'sponsor.plPriceNote':
      'Бул курстун өлкөңүздөгү баасы. Демөөрчүлүк кылынган нерсе — орун, белек картасы эмес.',
    'sponsor.plNoPrice':
      'Бул курстун өлкөңүздө баасы жок, ошондуктан бул орунду бул жерден алууга болбойт.',
    'sponsor.plPriceUnread':
      'Бул орундун баасын окуу мүмкүн болгон жок, ошондуктан аны азырынча алууга болбойт.',
    'sponsor.plNoteLabel': 'Кааласаңыз, кызматкерлерге жазуу',
    'sponsor.plTake': 'Ушул орунга демөөрчү болуу',
    'sponsor.plTaken': 'Бул орун эми төлөө үчүн сиздики: {amount}',
    'sponsor.plTakenNext':
      'Эч нерсе алынган жок. Демөөрчүлүк орундар барагыңыз кантип төлөөнү айтат.',
    'sponsor.plWhyGone': 'Ал орун азыр эле алынды же эми ачык эмес. Башкасын тандаңыз.',
    'sponsor.plWhyOwn': 'Бул — өзүңүз сураган орун. Өз өтүнүчүңүзгө демөөрчү боло албайсыз.',
    'sponsor.tooLong': 'Бул ушул талаага батканынан узун.',
    'sponsor.plWhyFailed': 'Бул ишке ашкан жок. Эч нерсе алынган жок жана эч нерсе өзгөргөн жок.',
    'sponsor.unconfirmed':
      'Анын катталган-катталбаганын ырастай алган жокпуз. Кайра аракет кылуудан мурун демөөрчүлүк орундарыңызды караңыз.',
    'sponsor.plAskHeading': 'Орун суроо',
    'sponsor.rqLede':
      'Курс колуңуздан келбесе, абал тууралуу бир нече сүйлөм жазыңыз. Кызматкерлер аны окуп, эки учурда тең себеби менен жооп берет. Суроонун эч кандай акысы жок жана эч кимди милдеттендирбейт.',
    'sponsor.rqCourse': 'Кайсы курс?',
    'sponsor.rqChoose': 'Курсту тандаңыз',
    'sponsor.rqReason': 'Абал кандай?',
    'sponsor.rqReasonNote':
      'Чечим кабыл алган кызматкерлер гана окуйт, башка эч ким окубайт. Орундун акысын төлөгөн адамга көрсөтүлбөйт.',
    'sponsor.rqSubmit': 'Ушул орунду суроо',
    'sponsor.rqDone':
      'Суралды. Кызматкерлер аны окуйт, ал эми жооп себеби менен бирге демөөрчүлүк орундар барагыңызда болот.',
    'sponsor.rqNoLearner':
      'Бул аккаунтта азырынча окуучу жок, ошондуктан ким үчүн сурай турган эч ким жок.',
    'sponsor.rqNoCourse': 'Азыр сатыкта курс жок, ошондуктан сурай турган эч нерсе жок.',
    'sponsor.rqPrivacy':
      'Өтүнүч жактырылса, демөөрчү орундун кодун, курсту, анын балага же чоң кишиге арналганын жана бааны көрөт. Атыңызды, үй-бүлөңүздү же бул жерде жазганыңызды эч качан көрбөйт.',
    'sponsor.rqWhyReason': 'Абал тууралуу бир сүйлөм жазыңыз. Чечим кабыл алган адам ошону окуйт.',
    'sponsor.rqWhyHas':
      'Ал окуучуда бул курс мурунтан эле бар, ошондуктан сурай турган эч нерсе жок.',
    'sponsor.rqWhyAsked': 'Бул курс боюнча ачык өтүнүч мурунтан эле бар.',
  },
  tk: {
    'sponsor.lede':
      'Tölegini başga biriniň tölän kurslary we başga biri okasyn diýip tölegini siziň tölän kurslaryňyz. Iki tarapyň hiç biri beýlekisiniň kimdigini bilmeýär.',
    'sponsor.off':
      'Orna howandarlyk etmek häzir öçürilen, şonuň üçin täze orun sorap hem, täze orna howandarlyk edip hem bolmaýar. Öň soralan ýa-da howandarlyk edilen zatlar şu ýerde görkezilmegini dowam edýär.',
    'sponsor.askedHeading': 'Meniň soranlarym',
    'sponsor.askedUnread':
      'Haýyşlaryňyzy häzir okap bolmady. Hiç zat üýtgemedi: bu sahypa diňe okaýar.',
    'sponsor.askedNone': 'Siz howandarlyk ornuny soramadyňyz.',
    'sponsor.askedHow':
      'Kurs eliňizden gelmeýän bolsa, sorap bilersiniz. Onuň hiç hili tölegi ýok we hiç kimi borçly etmeýär.',
    'sponsor.askLink': 'Howandarlyk ornuny soramak',
    'sponsor.aCourse': 'Kurs',
    'sponsor.forWhom': 'Kim üçin: {name}',
    'sponsor.apSubmitted': 'Biriniň okamagyna garaşylýar',
    'sponsor.apApproved': 'Tassyklandy, howandara garaşylýar',
    'sponsor.apFunded': 'Ýapyldy: biri şu ornuň tölegini töledi',
    'sponsor.apDeclined': 'Tassyklanmady',
    'sponsor.apWithdrawn': 'Haýyş yzyna alyndy',
    'sponsor.seat': 'Orun: {code}',
    'sponsor.staffNote': 'Işgärleriň öz sözleri bilen ýazany:',
    'sponsor.askedOn': 'Soralan senesi: {date}',
    'sponsor.decidedOn': 'Çözgüt senesi: {date}',
    'sponsor.coveredLead': 'Siziň soran ornuňyz ýapyldy.',
    'sponsor.coveredBody':
      'Kurs indi okuwçy üçin açyk. Tölän adamyň ady şu ýerde ýazylmaýar we bu bilgeşleýin edilen: kimiň berendigi berýän bilen Allanyň arasyndaky işdir.',
    'sponsor.gaveHeading': 'Meniň howandarlyk edenlerim',
    'sponsor.gaveUnread':
      'Howandarlyklaryňyzy häzir okap bolmady. Hiç zat üýtgemedi: bu sahypa diňe okaýar.',
    'sponsor.gaveNone': 'Siz hiç bir orna howandarlyk etmediňiz.',
    'sponsor.gaveHow': 'Garaşýan her bir orun biriniň soran kursudyr.',
    'sponsor.spPledged': 'Söz berildi: tölegiň bellige alynmagyna garaşylýar',
    'sponsor.spPaid': 'Tölendi, orun açyk',
    'sponsor.spWithdrawn': 'Ýatyryldy',
    'sponsor.amount': 'Mukdar: {amount}',
    'sponsor.reference': 'Salgylanma belgisi: {reference}',
    'sponsor.nextPledged':
      'Hiç zat awtomatik alynmaýar: bu sahypa töleg ýygnamaýar. Töleg platforma ýetende işgärler ony şu ýerde bellige alýar we bellige alnanda orun açylýar.',
    'sponsor.nextPaid':
      'Bellige alyndy. Orun okuwçy üçin açyk we okuwça kimiň töländigi aýdylmady.',
    'sponsor.nextWithdrawn': 'Bu söz ýatyryldy, şonuň üçin onuň üçin pula garaşylmaýar.',
    'sponsor.pledgedOn': 'Söz berlen senesi: {date}',
    'sponsor.recordedOn': 'Tölegiň bellige alnan senesi: {date}',
    'sponsor.zakat':
      'Howandarlyk ornunyň zekat, sadaka ýa-da ikisiniň hiç biri hasaplanmagy alymyň hökümidir we bu platforma şeýle höküm çykarmaýar. Bermezden öň ynanýan adamyňyzdan soraň.',
    'sponsor.pay': 'Bu sözi töläň',
    'sponsor.payLede':
      'Töleg tassyklanan badyna orun okuwçy üçin açylýar. Iki tarapyň hiç biri beýlekisiniň kimdigini bilmeýär.',
    'sponsor.payApprove':
      'Tölegi telefonyňyzda tassyklaň. Töleg tassyklanandan soň orun okuwçy üçin açylýar. Bu biraz wagt alyp biler.',
    'sponsor.payNot':
      'Bu sözi şu ýerde töläp bolmaýar: ol tölenen ýa-da ýatyrylan, ýa-da siziň sözleriňiziň biri däl.',
    'sponsor.nextPay': 'Siz töleýänçäňiz hiç zat alynmaýar. Töleg tassyklananda orun açylýar.',
    'sponsor.plEyebrow': 'Howandarlyk',
    'sponsor.plTitle': 'Başga biriniň kursunyň tölegini töläň',
    'sponsor.plLede':
      'Kursuň tölegini töläp bilmeýän okuwçy ony soraýar, işgärler bolsa karar berýär. Tassyklanan haýyş şu ýerde kody we kursuň bahasy bolan orun hökmünde görünýär, at bolsa hiç haçan görkezilmeýär. Siz orny saýlaýarsyňyz; kursy okuwçy alýar.',
    'sponsor.plSeeHeading': 'Nämäni görýärsiňiz we nämäni görmeýärsiňiz',
    'sponsor.plSeeBody':
      'Ornuň kody, kurs, onuň çaga ýa-da uly adam üçindigi we ýurduňyzdaky baha. Okuwçynyň ady, ýaşy ýa-da maşgalasy däl, ýazanlaryndan ýeke söz hem däl. Ony diňe karar berýän işgärler okaýar, başga hiç kim okamaýar.',
    'sponsor.plPayHeading': 'Näme töleýärsiňiz we haçan',
    'sponsor.plPayBody':
      'Kursuň ýurduňyzdaky bahasy, satyn almakdaky ýaly hasaplanýar. Orny almak sözdür we pul alynmaýar. Howandarlyk orunlary sahypaňyz sözüň nähili tölenýändigini aýdýar, töleg tassyklananda bolsa orun okuwçy üçin açylýar.',
    'sponsor.plListHeading': 'Howandara garaşýan orunlar',
    'sponsor.plSignIn': 'Orunlar ulgama giren adamlara görkezilýär.',
    'sponsor.plUnread': 'Orunlary okap bolmady. Hiç zat tutulmady we hiç bir orun alynmady.',
    'sponsor.plOff':
      'Orun howandarlygy häzir öçürilen, şonuň üçin orun alyp hem, sorap hem bolmaýar.',
    'sponsor.plNone':
      'Häzir howandara garaşýan orun ýok. Haýyş işgärler tassyklandan soň şu ýerde görünýär.',
    'sponsor.plForChild': 'Çaga üçin',
    'sponsor.plForAdult': 'Uly adam üçin',
    'sponsor.plPriceNote':
      'Bu kursuň ýurduňyzdaky bahasy. Howandarlyk edilýän zat orundyr, sowgat karty däl.',
    'sponsor.plNoPrice':
      'Bu kursuň ýurduňyzda bahasy ýok, şonuň üçin bu orny şu ýerden alyp bolmaýar.',
    'sponsor.plPriceUnread':
      'Bu ornuň bahasyny okap bolmady, şonuň üçin ony häzirlikçe alyp bolmaýar.',
    'sponsor.plNoteLabel': 'Isleseňiz, işgärler üçin bellik',
    'sponsor.plTake': 'Bu orna howandarlyk ediň',
    'sponsor.plTaken': 'Bu orun indi tölemek üçin siziňki: {amount}',
    'sponsor.plTakenNext':
      'Hiç zat alynmady. Howandarlyk orunlary sahypaňyz nähili tölemelidigini aýdýar.',
    'sponsor.plWhyGone': 'Ol orun ýaňy alyndy ýa-da indi açyk däl. Başgasyny saýlaň.',
    'sponsor.plWhyOwn': 'Bu öz soran ornuňyz. Öz haýyşyňyza howandarlyk edip bilmersiňiz.',
    'sponsor.tooLong': 'Bu şu meýdana sygýanyndan uzyn.',
    'sponsor.plWhyFailed': 'Bu başa barmady. Hiç zat tutulmady we hiç zat üýtgemedi.',
    'sponsor.unconfirmed':
      'Munuň bellige alnandygyny ýa-da alynmandygyny tassyklap bilmedik. Gaýtadan synanyşmazdan öň howandarlyk orunlaryňyza serediň.',
    'sponsor.plAskHeading': 'Orun soramak',
    'sponsor.rqLede':
      'Kurs eliňizden gelmeýän bolsa, ýagdaý barada birnäçe sözlem ýazyň. Işgärler ony okaýar we iki ýagdaýda hem sebäbi bilen jogap berýär. Soramagyň hiç hili tölegi ýok we hiç kimi borçly etmeýär.',
    'sponsor.rqCourse': 'Haýsy kurs?',
    'sponsor.rqChoose': 'Kursy saýlaň',
    'sponsor.rqReason': 'Ýagdaý nähili?',
    'sponsor.rqReasonNote':
      'Diňe karar berýän işgärler okaýar, başga hiç kim okamaýar. Ornuň tölegini töleýän adama görkezilmeýär.',
    'sponsor.rqSubmit': 'Bu orny soraň',
    'sponsor.rqDone':
      'Soraldy. Işgärler ony okar, jogap bolsa sebäbi bilen bilelikde howandarlyk orunlary sahypaňyzda bolar.',
    'sponsor.rqNoLearner':
      'Bu hasapda entek okuwçy ýok, şonuň üçin kimdir biri üçin sorap bolmaýar.',
    'sponsor.rqNoCourse': 'Häzir satuwda kurs ýok, şonuň üçin soraljak zat ýok.',
    'sponsor.rqPrivacy':
      'Haýyş tassyklansa, howandar ornuň koduny, kursy, onuň çaga ýa-da uly adam üçindigini we bahany görýär. Adyňyzy, maşgalaňyzy ýa-da şu ýerde ýazanyňyzy hiç haçan görmeýär.',
    'sponsor.rqWhyReason': 'Ýagdaý barada bir sözlem ýazyň. Karar berýän adam hut şony okaýar.',
    'sponsor.rqWhyHas': 'Ol okuwçyda bu kurs eýýäm bar, şonuň üçin soraljak zat ýok.',
    'sponsor.rqWhyAsked': 'Bu kurs üçin eýýäm açyk haýyş bar.',
  },
  ta: {
    'sponsor.lede':
      'வேறொருவர் கட்டணம் செலுத்திய பாடநெறிகள், மற்றும் வேறொருவர் கற்பதற்காக நீங்கள் கட்டணம் செலுத்திய பாடநெறிகள். இரு தரப்பினரும் மற்றவர் யார் என்பதை அறிவதில்லை.',
    'sponsor.off':
      'இடங்களுக்கு நிதியுதவி செய்வது தற்போது நிறுத்தப்பட்டுள்ளது; ஆகவே புதிய இடத்தைக் கேட்கவோ புதிய இடத்திற்கு நிதியுதவி செய்யவோ முடியாது. முன்பு கேட்கப்பட்டவையும் நிதியுதவி செய்யப்பட்டவையும் இங்கே தொடர்ந்து காட்டப்படுகின்றன.',
    'sponsor.askedHeading': 'நான் கேட்டவை',
    'sponsor.askedUnread':
      'உங்கள் கோரிக்கைகளை இப்போது படிக்க முடியவில்லை. எதுவும் மாறவில்லை: இந்தப் பக்கம் படிக்க மட்டுமே செய்கிறது.',
    'sponsor.askedNone': 'நீங்கள் நிதியுதவி பெற்ற இடம் எதையும் கேட்கவில்லை.',
    'sponsor.askedHow':
      'ஒரு பாடநெறி உங்கள் சக்திக்கு மீறியதாக இருந்தால் நீங்கள் கேட்கலாம். இதற்குக் கட்டணம் இல்லை, யாரையும் கட்டாயப்படுத்தாது.',
    'sponsor.askLink': 'நிதியுதவி பெற்ற இடத்தைக் கேளுங்கள்',
    'sponsor.aCourse': 'ஒரு பாடநெறி',
    'sponsor.forWhom': 'யாருக்காக: {name}',
    'sponsor.apSubmitted': 'ஒருவர் படிப்பதற்காகக் காத்திருக்கிறது',
    'sponsor.apApproved': 'அங்கீகரிக்கப்பட்டது, நிதியுதவியாளருக்காகக் காத்திருக்கிறது',
    'sponsor.apFunded': 'கட்டணம் ஈடுசெய்யப்பட்டது: இந்த இடத்திற்கு ஒருவர் கட்டணம் செலுத்தினார்',
    'sponsor.apDeclined': 'அங்கீகரிக்கப்படவில்லை',
    'sponsor.apWithdrawn': 'கோரிக்கை திரும்பப் பெறப்பட்டது',
    'sponsor.seat': 'இடம்: {code}',
    'sponsor.staffNote': 'பணியாளர்கள் தங்கள் சொற்களில் எழுதியது:',
    'sponsor.askedOn': 'கேட்ட நாள்: {date}',
    'sponsor.decidedOn': 'முடிவு செய்த நாள்: {date}',
    'sponsor.coveredLead': 'நீங்கள் கேட்ட ஓர் இடத்திற்குக் கட்டணம் ஈடுசெய்யப்பட்டது.',
    'sponsor.coveredBody':
      'பாடநெறி இப்போது கற்பவருக்குத் திறந்துள்ளது. கட்டணம் செலுத்தியவரின் பெயர் இங்கே குறிப்பிடப்படவில்லை, அது வேண்டுமென்றே: யார் கொடுத்தார் என்பது கொடுத்தவருக்கும் அல்லாஹ்வுக்கும் இடையிலானது.',
    'sponsor.gaveHeading': 'நான் நிதியுதவி செய்தவை',
    'sponsor.gaveUnread':
      'உங்கள் நிதியுதவிகளை இப்போது படிக்க முடியவில்லை. எதுவும் மாறவில்லை: இந்தப் பக்கம் படிக்க மட்டுமே செய்கிறது.',
    'sponsor.gaveNone': 'நீங்கள் எந்த இடத்திற்கும் நிதியுதவி செய்யவில்லை.',
    'sponsor.gaveHow': 'காத்திருக்கும் ஒவ்வோர் இடமும் ஒருவர் கேட்ட பாடநெறி ஆகும்.',
    'sponsor.spPledged': 'உறுதியளிக்கப்பட்டது: கட்டணம் பதிவு செய்யப்படுவதற்காகக் காத்திருக்கிறது',
    'sponsor.spPaid': 'செலுத்தப்பட்டது, இடம் திறந்துள்ளது',
    'sponsor.spWithdrawn': 'ரத்து செய்யப்பட்டது',
    'sponsor.amount': 'தொகை: {amount}',
    'sponsor.reference': 'குறிப்பு எண்: {reference}',
    'sponsor.nextPledged':
      'எதுவும் தானாக எடுக்கப்படுவதில்லை: இந்தப் பக்கம் கட்டணம் எதையும் வசூலிப்பதில்லை. கட்டணம் தளத்தை வந்தடைந்ததும் பணியாளர்கள் அதை இங்கே பதிவு செய்கிறார்கள், பதிவு செய்ததும் இடம் திறக்கும்.',
    'sponsor.nextPaid':
      'பதிவு செய்யப்பட்டது. இடம் கற்பவருக்குத் திறந்துள்ளது, யார் செலுத்தினார் என்று கற்பவருக்குச் சொல்லப்படவில்லை.',
    'sponsor.nextWithdrawn':
      'இந்த உறுதி ரத்து செய்யப்பட்டது; ஆகவே இதற்காகப் பணம் எதிர்பார்க்கப்படவில்லை.',
    'sponsor.pledgedOn': 'உறுதியளித்த நாள்: {date}',
    'sponsor.recordedOn': 'கட்டணம் பதிவு செய்யப்பட்ட நாள்: {date}',
    'sponsor.zakat':
      'நிதியுதவி பெற்ற இடம் ஜகாத்தாக, சதகாவாக அல்லது இரண்டிலும் சேராததாகக் கணக்கிடப்படுமா என்பது ஒரு மார்க்க அறிஞரின் தீர்ப்பு; இந்தத் தளம் அந்தத் தீர்ப்பை வழங்குவதில்லை. கொடுப்பதற்கு முன் நீங்கள் நம்பும் ஒருவரிடம் கேளுங்கள்.',
    'sponsor.pay': 'இந்த உறுதிமொழிக்குக் கட்டணம் செலுத்துங்கள்',
    'sponsor.payLede':
      'கட்டணம் உறுதிப்படுத்தப்பட்டவுடன் இடம் கற்பவருக்குத் திறக்கும். இரு தரப்பினருக்கும் மற்றவர் யார் என்று தெரியாது.',
    'sponsor.payApprove':
      'உங்கள் தொலைபேசியில் கட்டணத்தை அங்கீகரிக்கவும். கட்டணம் உறுதிப்படுத்தப்பட்டதும் இடம் கற்பவருக்குத் திறக்கும். இதற்குச் சிறிது நேரம் ஆகலாம்.',
    'sponsor.payNot':
      'இந்த உறுதிமொழிக்கு இங்கே கட்டணம் செலுத்த முடியாது: அது செலுத்தப்பட்டுவிட்டது அல்லது ரத்து செய்யப்பட்டது, அல்லது அது உங்களுடையது அல்ல.',
    'sponsor.nextPay':
      'நீங்கள் செலுத்தும் வரை எதுவும் எடுக்கப்படுவதில்லை. கட்டணம் உறுதிப்படுத்தப்பட்டதும் இடம் திறக்கும்.',
    'sponsor.plEyebrow': 'நிதியுதவி',
    'sponsor.plTitle': 'வேறொருவரின் பாடநெறிக்குக் கட்டணம் செலுத்துங்கள்',
    'sponsor.plLede':
      'ஒரு பாடநெறிக்குக் கட்டணம் செலுத்த இயலாத கற்பவர் அதைக் கேட்கிறார், பணியாளர்கள் முடிவு செய்கிறார்கள். அங்கீகரிக்கப்பட்ட கோரிக்கை இங்கே ஒரு குறியீடும் பாடநெறியின் விலையும் கொண்ட இடமாகத் தோன்றும், ஒருபோதும் பெயருடன் அல்ல. நீங்கள் ஓர் இடத்தைத் தேர்வு செய்கிறீர்கள்; கற்பவர் பாடநெறியைப் பெறுகிறார்.',
    'sponsor.plSeeHeading': 'நீங்கள் பார்ப்பதும், பார்க்காததும்',
    'sponsor.plSeeBody':
      'இடத்தின் குறியீடு, பாடநெறி, அது குழந்தைக்கா வயது வந்தவருக்கா என்பது, மற்றும் உங்கள் நாட்டில் விலை. கற்பவரின் பெயர், வயது அல்லது குடும்பம் இல்லை, அவர்கள் எழுதியதில் ஒரு சொல்லும் இல்லை. அதை முடிவு செய்யும் பணியாளர்கள் மட்டுமே படிக்கிறார்கள், வேறு யாரும் இல்லை.',
    'sponsor.plPayHeading': 'நீங்கள் என்ன செலுத்துகிறீர்கள், எப்போது',
    'sponsor.plPayBody':
      'உங்கள் நாட்டில் பாடநெறியின் விலை, வாங்கும்போது கணக்கிடப்படுவது போலவே. இடத்தை எடுப்பது ஓர் உறுதிமொழி, அதனால் பணம் எடுக்கப்படுவதில்லை. உறுதிமொழிக்கு எப்படிக் கட்டணம் செலுத்துவது என்பதை உங்கள் நிதியுதவி பெற்ற இடங்கள் பக்கம் சொல்லும், கட்டணம் உறுதிப்படுத்தப்பட்டதும் இடம் கற்பவருக்குத் திறக்கும்.',
    'sponsor.plListHeading': 'நிதியுதவியாளருக்காகக் காத்திருக்கும் இடங்கள்',
    'sponsor.plSignIn': 'உள்நுழைந்தவர்களுக்கு இடங்கள் காட்டப்படும்.',
    'sponsor.plUnread':
      'இடங்களைப் படிக்க முடியவில்லை. எதுவும் வசூலிக்கப்படவில்லை, எந்த இடமும் எடுக்கப்படவில்லை.',
    'sponsor.plOff':
      'இடத்துக்கான நிதியுதவி தற்போது நிறுத்தப்பட்டுள்ளது, எனவே இடத்தை எடுக்கவோ கேட்கவோ முடியாது.',
    'sponsor.plNone':
      'இப்போது எந்த இடமும் நிதியுதவியாளருக்காகக் காத்திருக்கவில்லை. பணியாளர்கள் அங்கீகரித்ததும் கோரிக்கை இங்கே தோன்றும்.',
    'sponsor.plForChild': 'குழந்தைக்கு',
    'sponsor.plForAdult': 'வயது வந்தவருக்கு',
    'sponsor.plPriceNote':
      'உங்கள் நாட்டில் இந்தப் பாடநெறியின் விலை. நிதியுதவி பெறுவது இடம்தான், பரிசு அட்டை அல்ல.',
    'sponsor.plNoPrice':
      'உங்கள் நாட்டில் இந்தப் பாடநெறிக்கு விலை இல்லை, எனவே இந்த இடத்தை இங்கிருந்து எடுக்க முடியாது.',
    'sponsor.plPriceUnread':
      'இந்த இடத்தின் விலையைப் படிக்க முடியவில்லை, எனவே இப்போதைக்கு இதை எடுக்க முடியாது.',
    'sponsor.plNoteLabel': 'பணியாளர்களுக்கு ஒரு குறிப்பு, விரும்பினால்',
    'sponsor.plTake': 'இந்த இடத்துக்கு நிதியுதவி செய்யுங்கள்',
    'sponsor.plTaken': 'இந்த இடம் இப்போது நீங்கள் கட்டணம் செலுத்துவதற்கானது: {amount}',
    'sponsor.plTakenNext':
      'எதுவும் எடுக்கப்படவில்லை. எப்படிச் செலுத்துவது என்பதை உங்கள் நிதியுதவி பெற்ற இடங்கள் பக்கம் சொல்லும்.',
    'sponsor.plWhyGone':
      'அந்த இடம் இப்போதுதான் எடுக்கப்பட்டது, அல்லது இனி திறந்திருக்கவில்லை. வேறொன்றைத் தேர்வு செய்யுங்கள்.',
    'sponsor.plWhyOwn':
      'அது நீங்களே கேட்ட இடம். உங்கள் சொந்தக் கோரிக்கைக்கு நீங்கள் நிதியுதவி செய்ய முடியாது.',
    'sponsor.tooLong': 'இது இந்தப் பெட்டி கொள்ளும் அளவைவிட நீளமானது.',
    'sponsor.plWhyFailed': 'அது நடக்கவில்லை. எதுவும் வசூலிக்கப்படவில்லை, எதுவும் மாறவில்லை.',
    'sponsor.unconfirmed':
      'அது பதிவானதா என்பதை எங்களால் உறுதிப்படுத்த முடியவில்லை. மீண்டும் முயலும் முன் உங்கள் நிதியுதவி பெற்ற இடங்களைப் பாருங்கள்.',
    'sponsor.plAskHeading': 'இடம் கேட்பது',
    'sponsor.rqLede':
      'ஒரு பாடநெறி உங்கள் சக்திக்கு அப்பாற்பட்டதாக இருந்தால், நிலைமையைப் பற்றிச் சில வாக்கியங்கள் எழுதுங்கள். பணியாளர்கள் அதைப் படித்து, எந்த முடிவாக இருந்தாலும் காரணத்துடன் பதிலளிப்பார்கள். கேட்பதற்கு எந்தச் செலவும் இல்லை, அது யாரையும் கட்டுப்படுத்தாது.',
    'sponsor.rqCourse': 'எந்தப் பாடநெறி?',
    'sponsor.rqChoose': 'ஒரு பாடநெறியைத் தேர்வு செய்யுங்கள்',
    'sponsor.rqReason': 'நிலைமை என்ன?',
    'sponsor.rqReasonNote':
      'முடிவு செய்யும் பணியாளர்கள் மட்டுமே படிக்கிறார்கள், வேறு யாரும் இல்லை. இடத்துக்குக் கட்டணம் செலுத்துபவருக்குக் காட்டப்படாது.',
    'sponsor.rqSubmit': 'இந்த இடத்தைக் கேளுங்கள்',
    'sponsor.rqDone':
      'கேட்கப்பட்டது. பணியாளர்கள் அதைப் படிப்பார்கள், பதில் அதன் காரணத்துடன் உங்கள் நிதியுதவி பெற்ற இடங்கள் பக்கத்தில் இருக்கும்.',
    'sponsor.rqNoLearner':
      'இந்தக் கணக்கில் இன்னும் கற்பவர் யாரும் இல்லை, எனவே யாருக்காகவும் கேட்க முடியாது.',
    'sponsor.rqNoCourse':
      'இப்போது எந்தப் பாடநெறியும் விற்பனையில் இல்லை, எனவே கேட்பதற்கு எதுவும் இல்லை.',
    'sponsor.rqPrivacy':
      'கோரிக்கை அங்கீகரிக்கப்பட்டால், நிதியுதவியாளர் இடத்தின் குறியீடு, பாடநெறி, அது குழந்தைக்கா வயது வந்தவருக்கா என்பது, மற்றும் விலையைப் பார்ப்பார். உங்கள் பெயர், உங்கள் குடும்பம் அல்லது நீங்கள் இங்கே எழுதியதை ஒருபோதும் பார்க்கமாட்டார்.',
    'sponsor.rqWhyReason':
      'நிலைமையைப் பற்றி ஒரு வாக்கியம் எழுதுங்கள். முடிவு செய்பவர் படிப்பது அதுதான்.',
    'sponsor.rqWhyHas':
      'அந்தக் கற்பவரிடம் இந்தப் பாடநெறி ஏற்கெனவே உள்ளது, எனவே கேட்பதற்கு எதுவும் இல்லை.',
    'sponsor.rqWhyAsked': 'இந்தப் பாடநெறிக்கு ஏற்கெனவே ஒரு திறந்த கோரிக்கை உள்ளது.',
  },
  ne: {
    'sponsor.lede':
      'अरू कसैले शुल्क तिरेका कोर्सहरू, र अरू कसैले सिकोस् भनेर तपाईंले शुल्क तिरेका कोर्सहरू। कुनै पनि पक्षले अर्को को हो भनेर थाहा पाउँदैन।',
    'sponsor.off':
      'सिटको प्रायोजन अहिले बन्द छ, त्यसैले नयाँ सिट माग्न वा नयाँ सिट प्रायोजन गर्न सकिँदैन। पहिले मागिएका वा प्रायोजन गरिएका कुरा अझै यहाँ देखाइन्छन्।',
    'sponsor.askedHeading': 'मैले मागेका',
    'sponsor.askedUnread':
      'तपाईंका अनुरोधहरू अहिले पढ्न सकिएन। केही परिवर्तन भएको छैन: यो पृष्ठले पढ्ने मात्र गर्छ।',
    'sponsor.askedNone': 'तपाईंले प्रायोजित सिट माग्नुभएको छैन।',
    'sponsor.askedHow':
      'कुनै कोर्स तपाईंको पहुँचबाहिर छ भने तपाईं माग्न सक्नुहुन्छ। यसमा कुनै शुल्क लाग्दैन र कसैलाई बाध्य पार्दैन।',
    'sponsor.askLink': 'प्रायोजित सिट माग्नुहोस्',
    'sponsor.aCourse': 'एउटा कोर्स',
    'sponsor.forWhom': 'कसका लागि: {name}',
    'sponsor.apSubmitted': 'कसैले पढ्ने प्रतीक्षामा',
    'sponsor.apApproved': 'स्वीकृत, प्रायोजकको प्रतीक्षामा',
    'sponsor.apFunded': 'शुल्क बेहोरियो: कसैले यो सिटको शुल्क तिरेको छ',
    'sponsor.apDeclined': 'स्वीकृत भएन',
    'sponsor.apWithdrawn': 'अनुरोध फिर्ता लिइयो',
    'sponsor.seat': 'सिट: {code}',
    'sponsor.staffNote': 'कर्मचारीले आफ्नै शब्दमा लेखेको कुरा:',
    'sponsor.askedOn': 'मागेको मिति: {date}',
    'sponsor.decidedOn': 'निर्णयको मिति: {date}',
    'sponsor.coveredLead': 'तपाईंले मागेको एउटा सिटको शुल्क बेहोरिएको छ।',
    'sponsor.coveredBody':
      'कोर्स अब सिकारुका लागि खुला छ। शुल्क तिर्नेको नाम यहाँ लेखिएको छैन, र त्यो जानीजानी हो: कसले दियो भन्ने कुरा दिने र अल्लाहबीचको कुरा हो।',
    'sponsor.gaveHeading': 'मैले प्रायोजन गरेका',
    'sponsor.gaveUnread':
      'तपाईंका प्रायोजनहरू अहिले पढ्न सकिएन। केही परिवर्तन भएको छैन: यो पृष्ठले पढ्ने मात्र गर्छ।',
    'sponsor.gaveNone': 'तपाईंले कुनै सिट प्रायोजन गर्नुभएको छैन।',
    'sponsor.gaveHow': 'प्रतीक्षामा रहेको हरेक सिट कसैले मागेको कोर्स हो।',
    'sponsor.spPledged': 'वचन दिइयो: भुक्तानी दर्ता हुने प्रतीक्षामा',
    'sponsor.spPaid': 'भुक्तानी भयो, र सिट खुला छ',
    'sponsor.spWithdrawn': 'रद्द गरियो',
    'sponsor.amount': 'रकम: {amount}',
    'sponsor.reference': 'सन्दर्भ नम्बर: {reference}',
    'sponsor.nextPledged':
      'केही पनि स्वतः लिइँदैन: यो पृष्ठले कुनै भुक्तानी उठाउँदैन। भुक्तानी प्लेटफर्ममा आइपुगेपछि कर्मचारीले यहाँ दर्ता गर्छन्, र दर्ता भएपछि सिट खुल्छ।',
    'sponsor.nextPaid':
      'दर्ता भयो। सिट सिकारुका लागि खुला छ, र कसले तिरेको हो भनेर सिकारुलाई भनिएको छैन।',
    'sponsor.nextWithdrawn': 'यो वचन रद्द गरियो, त्यसैले यसका लागि कुनै पैसा अपेक्षा गरिएको छैन।',
    'sponsor.pledgedOn': 'वचन दिएको मिति: {date}',
    'sponsor.recordedOn': 'भुक्तानी दर्ता भएको मिति: {date}',
    'sponsor.zakat':
      'प्रायोजित सिट जकात मानिन्छ, सदका मानिन्छ वा दुवै मानिँदैन भन्ने कुरा एक आलिमको फैसला हो, र यो प्लेटफर्मले त्यो फैसला गर्दैन। दिनुअघि आफूले विश्वास गर्ने कसैलाई सोध्नुहोस्।',
    'sponsor.pay': 'यो वचनको भुक्तानी गर्नुहोस्',
    'sponsor.payLede':
      'भुक्तानी पुष्टि हुनेबित्तिकै सिट सिकारुका लागि खुल्छ। कुनै पनि पक्षले अर्को को हो भनेर थाहा पाउँदैन।',
    'sponsor.payApprove':
      'आफ्नो फोनमा भुक्तानी स्वीकृत गर्नुहोस्। भुक्तानी पुष्टि भएपछि सिट सिकारुका लागि खुल्छ। यसमा केही समय लाग्न सक्छ।',
    'sponsor.payNot':
      'यो वचनको भुक्तानी यहाँ गर्न सकिँदैन: यो तिरिसकिएको छ वा रद्द गरिएको छ, वा यो तपाईंको वचन होइन।',
    'sponsor.nextPay':
      'तपाईंले भुक्तानी नगरेसम्म केही पनि लिइँदैन। भुक्तानी पुष्टि भएपछि सिट खुल्छ।',
    'sponsor.plEyebrow': 'प्रायोजन',
    'sponsor.plTitle': 'अरू कसैको कोर्सको शुल्क तिर्नुहोस्',
    'sponsor.plLede':
      'कोर्सको शुल्क तिर्न नसक्ने सिकारुले त्यो माग्छन्, र कर्मचारीले निर्णय गर्छन्। स्वीकृत अनुरोध यहाँ कोड र कोर्सको मूल्यसहितको सिटका रूपमा देखिन्छ, नाम कहिल्यै देखिँदैन। तपाईं सिट छान्नुहुन्छ; कोर्स सिकारुले पाउँछन्।',
    'sponsor.plSeeHeading': 'तपाईं के देख्नुहुन्छ, र के देख्नुहुन्न',
    'sponsor.plSeeBody':
      'सिटको कोड, कोर्स, त्यो बालबालिकाका लागि हो कि वयस्कका लागि, र तपाईंको देशमा मूल्य। सिकारुको नाम, उमेर वा परिवार होइन, र उनले लेखेको एउटा शब्द पनि होइन। त्यो निर्णय गर्ने कर्मचारीले मात्र पढ्छन्, अरू कसैले होइन।',
    'sponsor.plPayHeading': 'तपाईं के तिर्नुहुन्छ, र कहिले',
    'sponsor.plPayBody':
      'तपाईंको देशमा कोर्सको मूल्य, खरिदका लागि जसरी हिसाब गरिन्छ त्यसरी नै। सिट लिनु एउटा वचन हो र यसबाट पैसा लिइँदैन। तपाईंको प्रायोजित सिटहरूको पृष्ठले वचनको भुक्तानी कसरी हुन्छ भनेर बताउँछ, र भुक्तानी पुष्टि भएपछि सिट सिकारुका लागि खुल्छ।',
    'sponsor.plListHeading': 'प्रायोजकको प्रतीक्षामा रहेका सिटहरू',
    'sponsor.plSignIn': 'सिटहरू साइन इन गरेका व्यक्तिलाई देखाइन्छ।',
    'sponsor.plUnread': 'सिटहरू पढ्न सकिएन। केही पनि शुल्क लिइएको छैन र कुनै सिट लिइएको छैन।',
    'sponsor.plOff': 'सिटको प्रायोजन अहिले बन्द छ, त्यसैले न सिट लिन सकिन्छ न माग्न सकिन्छ।',
    'sponsor.plNone':
      'अहिले कुनै सिट प्रायोजकको प्रतीक्षामा छैन। कर्मचारीले स्वीकृत गरेपछि अनुरोध यहाँ देखिन्छ।',
    'sponsor.plForChild': 'बालबालिकाका लागि',
    'sponsor.plForAdult': 'वयस्कका लागि',
    'sponsor.plPriceNote':
      'तपाईंको देशमा यो कोर्सको मूल्य। प्रायोजन हुने भनेको सिट हो, उपहार कार्ड होइन।',
    'sponsor.plNoPrice':
      'तपाईंको देशमा यो कोर्सको मूल्य छैन, त्यसैले यो सिट यहाँबाट लिन सकिँदैन।',
    'sponsor.plPriceUnread': 'यो सिटको मूल्य पढ्न सकिएन, त्यसैले अहिले यो लिन सकिँदैन।',
    'sponsor.plNoteLabel': 'कर्मचारीका लागि टिप्पणी, चाहनुहुन्छ भने',
    'sponsor.plTake': 'यो सिट प्रायोजन गर्नुहोस्',
    'sponsor.plTaken': 'यो सिट अब तपाईंले भुक्तानी गर्नका लागि हो: {amount}',
    'sponsor.plTakenNext':
      'केही पनि लिइएको छैन। तपाईंको प्रायोजित सिटहरूको पृष्ठले कसरी भुक्तानी गर्ने भनेर बताउँछ।',
    'sponsor.plWhyGone': 'त्यो सिट भर्खरै लिइयो, वा अब खुला छैन। अर्को छान्नुहोस्।',
    'sponsor.plWhyOwn':
      'त्यो तपाईं आफैंले मागेको सिट हो। आफ्नै अनुरोधलाई प्रायोजन गर्न सकिँदैन।',
    'sponsor.tooLong': 'यो यस बाकसमा अट्नेभन्दा लामो छ।',
    'sponsor.plWhyFailed': 'त्यो भएन। केही पनि शुल्क लिइएन र केही पनि बदलिएन।',
    'sponsor.unconfirmed':
      'त्यो दर्ता भयो कि भएन भनेर हामीले पुष्टि गर्न सकेनौं। फेरि प्रयास गर्नुअघि आफ्ना प्रायोजित सिटहरू हेर्नुहोस्।',
    'sponsor.plAskHeading': 'सिट माग्ने',
    'sponsor.rqLede':
      'कुनै कोर्स तपाईंको पहुँचबाहिर छ भने अवस्थाबारे केही वाक्य लेख्नुहोस्। कर्मचारीले त्यो पढ्छन् र जुनसुकै अवस्थामा कारणसहित जवाफ दिन्छन्। माग्न केही खर्च लाग्दैन र यसले कसैलाई बाध्य पार्दैन।',
    'sponsor.rqCourse': 'कुन कोर्स?',
    'sponsor.rqChoose': 'कोर्स छान्नुहोस्',
    'sponsor.rqReason': 'अवस्था के हो?',
    'sponsor.rqReasonNote':
      'निर्णय गर्ने कर्मचारीले मात्र पढ्छन्, अरू कसैले होइन। सिटको शुल्क तिर्ने व्यक्तिलाई देखाइँदैन।',
    'sponsor.rqSubmit': 'यो सिट माग्नुहोस्',
    'sponsor.rqDone':
      'मागियो। कर्मचारीले त्यो पढ्नेछन्, र जवाफ, त्यसको कारणसहित, तपाईंको प्रायोजित सिटहरूको पृष्ठमा हुनेछ।',
    'sponsor.rqNoLearner': 'यो खातामा अझै कुनै सिकारु छैन, त्यसैले कसैका लागि माग्न सकिँदैन।',
    'sponsor.rqNoCourse': 'अहिले कुनै कोर्स बिक्रीमा छैन, त्यसैले माग्ने केही छैन।',
    'sponsor.rqPrivacy':
      'अनुरोध स्वीकृत भयो भने प्रायोजकले सिटको कोड, कोर्स, त्यो बालबालिकाका लागि हो कि वयस्कका लागि, र मूल्य देख्छन्। तपाईंको नाम, तपाईंको परिवार वा तपाईंले यहाँ लेखेको कुरा कहिल्यै देख्दैनन्।',
    'sponsor.rqWhyReason':
      'अवस्थाबारे एउटा वाक्य लेख्नुहोस्। निर्णय गर्ने व्यक्तिले पढ्ने त्यही हो।',
    'sponsor.rqWhyHas': 'त्यो सिकारुसँग यो कोर्स पहिल्यै छ, त्यसैले माग्ने केही छैन।',
    'sponsor.rqWhyAsked': 'यो कोर्सका लागि पहिल्यै एउटा खुला अनुरोध छ।',
  },
};
