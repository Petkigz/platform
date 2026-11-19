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
 * **No sentence says a payment can be made on this page.** A pledge is not a
 * payment; staff record what arrived. `sponsor.nextPledged` says so and does
 * not say how to pay, because nothing in the product does yet.
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
  },
};
