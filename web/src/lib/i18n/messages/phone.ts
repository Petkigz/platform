import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The phone number card on the account page (`app/account/phone-form.tsx`).
 *
 * Same rule as `learn.ts`, `course.ts`, `lesson.ts`, `assess.ts`, `assign.ts`,
 * `missing.ts`, `broke.ts`, `player.ts`, `account.ts`, `family.ts`, `buy.ts`,
 * `close.ts`, `export.ts`, `reading.ts` and `restore.ts`: written for the
 * twenty-seven languages with nothing held in `held.ts`, and for no other.
 * See `UNWRITTEN_WHILE_HELD`.
 *
 * **Every reason is the card's own sentence.** `set_my_phone()` refuses a
 * number in English. None of that is shown: the reasons are named in
 * `lib/phone-outcome.ts` and said here (`phone.why*`).
 *
 * **What is put in comes after a colon wherever a language would have to
 * inflect it.** A count in the reader's own digits (`{digits}`, `{min}`,
 * `{max}`, `{count}`, `{digit}`), and three things that are always written
 * left to right in Latin digits, each inside its own `<bdi dir="ltr">`: the
 * stored number (`{number}`), how a number begins (`{begins}`) and a
 * country's code (`{dial}`).
 *
 * **It says what is so and no more.** The number is kept; staff are allowed
 * to read it (the table's read policy); nothing is sent to it and no staff
 * screen shows it. No language below says the number is "how we reach you":
 * nothing on this platform reaches anyone by phone.
 *
 * **Served to the server only.** `phone.` is in `SERVER_ONLY_PREFIXES`: the
 * account page is drawn on the server and hands the card its words.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const PHONE: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'phone.heading': 'رقم هاتفك',
    'phone.lede':
      'يُحفظ بصيغة واحدة، رمز البلد ثم الرقم، حتى يصل الاتصال من أي بلد إلى الهاتف نفسه. تراه أنت هنا، ويُسمح لموظفي المنصة بقراءته.',
    'phone.storedAs': 'محفوظ بهذه الصيغة: {number}',
    'phone.country': 'البلد',
    'phone.number': 'رقم الهاتف',
    'phone.help':
      'اكتبه بأي طريقة تشاء: بمسافات أو بأقواس أو بصفر في أوله أو بعلامة الزائد. يُقرأ بالطريقة نفسها.',
    'phone.willStore': 'سيُحفظ بهذه الصيغة: {number}',
    'phone.whyCountry': 'اختر البلد الذي ينتمي إليه هذا الرقم.',
    'phone.whyEmpty': 'اكتب رقم هاتف.',
    'phone.whyLetters': 'لا يمكن أن يحتوي رقم الهاتف على حروف.',
    'phone.whyPunctuation': 'اكتب أرقام الهاتف. لا يوجد حتى الآن سوى علامات.',
    'phone.whyPlus': 'في الرقم علامة زائد واحدة على الأكثر، وفي أوله فقط.',
    'phone.whyOtherCountry':
      'بداية هذا الرقم: {begins}. بداية أرقام البلد المختار: {dial}. اختر البلد الذي ينتمي إليه الرقم.',
    'phone.whyLength':
      'عدد الخانات في رقم من هذا البلد بعد رمز البلد: {digits}. عدد الخانات في هذا الرقم: {count}',
    'phone.whyLengthRange':
      'في هذا البلد حدّان لعدد الخانات بعد رمز البلد. الأقل: {min}. الأكثر: {max}. في هذا الرقم: {count}',
    'phone.whyTrunk': 'هذه الخانة المكتوبة في أول الرقم لا تُحسب: {digit}',
    'phone.whyNoDial': 'لا يوجد هنا رمز مسجّل لذلك البلد، ولذلك لا يمكن حفظ رقم منه بعد.',
    'phone.save': 'احفظ رقمي',
    'phone.update': 'غيّر رقمي',
    'phone.saving': 'جارٍ الحفظ…',
    'phone.remove': 'احذف رقمي',
    'phone.saved': 'تم حفظ رقم هاتفك.',
    'phone.removed': 'تم حذف رقم هاتفك.',
    'phone.signedOut': 'لقد سُجّل خروجك. سجّل الدخول من جديد ثم حاول مرة أخرى. لم يتغيّر شيء.',
    'phone.off': 'لا تُجمع أرقام الهواتف في الوقت الحالي. لم يتغيّر شيء.',
    'phone.refused': 'لم تقبل المنصة هذا الرقم. لم يتغيّر شيء.',
    'phone.unconfirmed':
      'لم يصل أي ردّ، ولذلك لا يُعرف هل تغيّر رقمك. أعد تحميل هذه الصفحة لترى ما هو محفوظ.',
    'phone.paused': 'لا تُجمع أرقام الهواتف في الوقت الحالي. يبقى رقمك محفوظًا إلى أن تحذفه.',
    'phone.foot':
      'لا يُرسل شيء إلى هذا الرقم: لا توجد خدمة مراسلة موصولة بهذه المنصة. ولا تعرضه أي شاشة للموظفين حتى الآن.',
  },
  ur: {
    'phone.heading': 'آپ کا فون نمبر',
    'phone.lede':
      'یہ ایک ہی شکل میں رکھا جاتا ہے، پہلے ملک کا کوڈ پھر نمبر، تاکہ کسی بھی ملک سے کی گئی کال اسی فون تک پہنچے۔ آپ اسے یہاں دیکھتے ہیں، اور پلیٹ فارم کے عملے کو اسے پڑھنے کی اجازت ہے۔',
    'phone.storedAs': 'اس شکل میں محفوظ ہے: {number}',
    'phone.country': 'ملک',
    'phone.number': 'فون نمبر',
    'phone.help':
      'جیسے چاہیں لکھیں: وقفوں کے ساتھ، قوسین کے ساتھ، شروع میں صفر کے ساتھ یا جمع کے نشان کے ساتھ۔ اسے ایک ہی طرح پڑھا جاتا ہے۔',
    'phone.willStore': 'اس شکل میں محفوظ ہوگا: {number}',
    'phone.whyCountry': 'وہ ملک چنیں جس کا یہ نمبر ہے۔',
    'phone.whyEmpty': 'فون نمبر لکھیں۔',
    'phone.whyLetters': 'فون نمبر میں حروف نہیں ہو سکتے۔',
    'phone.whyPunctuation': 'نمبر کے ہندسے لکھیں۔ ابھی تک صرف علامتیں ہیں۔',
    'phone.whyPlus': 'نمبر میں جمع کا نشان زیادہ سے زیادہ ایک ہوتا ہے، اور صرف شروع میں۔',
    'phone.whyOtherCountry':
      'یہ نمبر {begins} سے شروع ہوتا ہے، اور چنے گئے ملک کا نمبر {dial} سے شروع ہوتا ہے۔ وہ ملک چنیں جس کا یہ نمبر ہے۔',
    'phone.whyLength':
      'اس ملک کے نمبر میں ملک کے کوڈ کے بعد ہندسوں کی تعداد: {digits}۔ اس نمبر میں ہندسوں کی تعداد: {count}',
    'phone.whyLengthRange':
      'اس ملک میں ملک کے کوڈ کے بعد ہندسوں کی تعداد کی دو حدیں ہیں۔ کم سے کم: {min}۔ زیادہ سے زیادہ: {max}۔ اس نمبر میں: {count}',
    'phone.whyTrunk': 'نمبر کے شروع میں لکھا جانے والا یہ ہندسہ شمار نہیں ہوتا: {digit}',
    'phone.whyNoDial':
      'اس ملک کا کوئی کوڈ یہاں درج نہیں ہے، اس لیے وہاں کا نمبر ابھی محفوظ نہیں کیا جا سکتا۔',
    'phone.save': 'میرا نمبر محفوظ کریں',
    'phone.update': 'میرا نمبر بدلیں',
    'phone.saving': 'محفوظ ہو رہا ہے…',
    'phone.remove': 'میرا نمبر ہٹائیں',
    'phone.saved': 'آپ کا فون نمبر محفوظ ہو گیا ہے۔',
    'phone.removed': 'آپ کا فون نمبر ہٹا دیا گیا ہے۔',
    'phone.signedOut':
      'آپ سائن آؤٹ ہو چکے ہیں۔ دوبارہ سائن اِن کریں، پھر دوبارہ کوشش کریں۔ کچھ تبدیل نہیں ہوا۔',
    'phone.off': 'اس وقت فون نمبر جمع نہیں کیے جا رہے۔ کچھ تبدیل نہیں ہوا۔',
    'phone.refused': 'پلیٹ فارم نے یہ نمبر قبول نہیں کیا۔ کچھ تبدیل نہیں ہوا۔',
    'phone.unconfirmed':
      'کوئی جواب نہیں آیا، اس لیے معلوم نہیں کہ آپ کا نمبر بدلا یا نہیں۔ جو محفوظ ہے اسے دیکھنے کے لیے یہ صفحہ دوبارہ لوڈ کریں۔',
    'phone.paused':
      'اس وقت فون نمبر جمع نہیں کیے جا رہے۔ آپ کا نمبر تب تک محفوظ رہے گا جب تک آپ اسے ہٹا نہ دیں۔',
    'phone.foot':
      'اس نمبر پر کچھ نہیں بھیجا جاتا: اس پلیٹ فارم سے پیغام رسانی کی کوئی سروس جڑی ہوئی نہیں ہے۔ عملے کی کوئی اسکرین ابھی اسے نہیں دکھاتی۔',
  },
  fa: {
    'phone.heading': 'شمارهٔ تلفن شما',
    'phone.lede':
      'به یک شکل نگه داشته می‌شود، اول کد کشور و بعد شماره، تا تماس از هر کشوری به همان تلفن برسد. شما آن را اینجا می‌بینید و کارکنان سکو اجازهٔ خواندنش را دارند.',
    'phone.storedAs': 'به این شکل نگه داشته شده است: {number}',
    'phone.country': 'کشور',
    'phone.number': 'شمارهٔ تلفن',
    'phone.help':
      'هر طور که می‌خواهید بنویسید: با فاصله، با پرانتز، با صفر در ابتدا یا با علامت بعلاوه. به یک شکل خوانده می‌شود.',
    'phone.willStore': 'به این شکل نگه داشته خواهد شد: {number}',
    'phone.whyCountry': 'کشوری را انتخاب کنید که این شماره متعلق به آن است.',
    'phone.whyEmpty': 'یک شمارهٔ تلفن بنویسید.',
    'phone.whyLetters': 'شمارهٔ تلفن نمی‌تواند حرف داشته باشد.',
    'phone.whyPunctuation': 'رقم‌های شماره را بنویسید. تا اینجا فقط علامت نوشته شده است.',
    'phone.whyPlus': 'شماره حداکثر یک علامت بعلاوه دارد، آن هم فقط در ابتدا.',
    'phone.whyOtherCountry':
      'این شماره با {begins} شروع می‌شود و شمارهٔ کشور انتخاب‌شده با {dial} شروع می‌شود. کشوری را انتخاب کنید که شماره متعلق به آن است.',
    'phone.whyLength':
      'تعداد رقم‌های شمارهٔ این کشور بعد از کد کشور: {digits}. تعداد رقم‌های این شماره: {count}',
    'phone.whyLengthRange':
      'در این کشور تعداد رقم‌ها بعد از کد کشور دو حد دارد. کمترین: {min}. بیشترین: {max}. در این شماره: {count}',
    'phone.whyTrunk': 'این رقم که در ابتدای شماره نوشته می‌شود شمرده نمی‌شود: {digit}',
    'phone.whyNoDial':
      'برای آن کشور کدی در اینجا ثبت نشده است، پس هنوز نمی‌توان شماره‌ای از آنجا را نگه داشت.',
    'phone.save': 'شمارهٔ مرا ذخیره کن',
    'phone.update': 'شمارهٔ مرا تغییر بده',
    'phone.saving': 'در حال ذخیره…',
    'phone.remove': 'شمارهٔ مرا حذف کن',
    'phone.saved': 'شمارهٔ تلفن شما ذخیره شد.',
    'phone.removed': 'شمارهٔ تلفن شما حذف شد.',
    'phone.signedOut':
      'از حساب خارج شده‌اید. دوباره وارد شوید و سپس دوباره تلاش کنید. چیزی تغییر نکرد.',
    'phone.off': 'در حال حاضر شمارهٔ تلفن گردآوری نمی‌شود. چیزی تغییر نکرد.',
    'phone.refused': 'سکو این شماره را نپذیرفت. چیزی تغییر نکرد.',
    'phone.unconfirmed':
      'پاسخی نرسید، پس معلوم نیست شمارهٔ شما تغییر کرده است یا نه. این صفحه را دوباره بار کنید تا ببینید چه چیزی نگه داشته شده است.',
    'phone.paused':
      'در حال حاضر شمارهٔ تلفن گردآوری نمی‌شود. شمارهٔ شما تا وقتی حذفش نکنید نگه داشته می‌شود.',
    'phone.foot':
      'چیزی به این شماره فرستاده نمی‌شود: هیچ سرویس پیام‌رسانی به این سکو وصل نیست. هنوز هیچ صفحه‌ای هم آن را به کارکنان نشان نمی‌دهد.',
  },
  'fa-af': {
    'phone.heading': 'شمارهٔ تلفون شما',
    'phone.lede':
      'به یک شکل نگهداری می‌شود، اول کود کشور و بعد شماره، تا تماس از هر کشوری به همان تلفون برسد. شما آن را اینجا می‌بینید و کارمندان پلتفرم اجازهٔ خواندن آن را دارند.',
    'phone.storedAs': 'به این شکل نگهداری شده است: {number}',
    'phone.country': 'کشور',
    'phone.number': 'شمارهٔ تلفون',
    'phone.help':
      'هر طوری که می‌خواهید بنویسید: با فاصله، با قوس، با صفر در اول یا با علامت جمع. به یک شکل خوانده می‌شود.',
    'phone.willStore': 'به این شکل نگهداری خواهد شد: {number}',
    'phone.whyCountry': 'کشوری را انتخاب کنید که این شماره مربوط آن است.',
    'phone.whyEmpty': 'یک شمارهٔ تلفون بنویسید.',
    'phone.whyLetters': 'شمارهٔ تلفون نمی‌تواند حرف داشته باشد.',
    'phone.whyPunctuation': 'رقم‌های شماره را بنویسید. تا حال تنها علامت نوشته شده است.',
    'phone.whyPlus': 'شماره حداکثر یک علامت جمع دارد، آن هم تنها در اول.',
    'phone.whyOtherCountry':
      'این شماره با {begins} شروع می‌شود و شمارهٔ کشور انتخاب‌شده با {dial} شروع می‌شود. کشوری را انتخاب کنید که شماره مربوط آن است.',
    'phone.whyLength':
      'تعداد رقم‌های شمارهٔ این کشور بعد از کود کشور: {digits}. تعداد رقم‌های این شماره: {count}',
    'phone.whyLengthRange':
      'در این کشور تعداد رقم‌ها بعد از کود کشور دو حد دارد. کمترین: {min}. بیشترین: {max}. در این شماره: {count}',
    'phone.whyTrunk': 'این رقم که در اول شماره نوشته می‌شود شمرده نمی‌شود: {digit}',
    'phone.whyNoDial':
      'برای آن کشور کودی در اینجا ثبت نشده است، پس هنوز نمی‌توان شماره‌ای از آنجا را نگهداری کرد.',
    'phone.save': 'شمارهٔ مرا ذخیره کن',
    'phone.update': 'شمارهٔ مرا تغییر بده',
    'phone.saving': 'در حال ذخیره…',
    'phone.remove': 'شمارهٔ مرا حذف کن',
    'phone.saved': 'شمارهٔ تلفون شما ذخیره شد.',
    'phone.removed': 'شمارهٔ تلفون شما حذف شد.',
    'phone.signedOut':
      'از حساب بیرون شده‌اید. دوباره داخل شوید و بعد دوباره کوشش کنید. چیزی تغییر نکرد.',
    'phone.off': 'فعلاً شمارهٔ تلفون جمع‌آوری نمی‌شود. چیزی تغییر نکرد.',
    'phone.refused': 'پلتفرم این شماره را نپذیرفت. چیزی تغییر نکرد.',
    'phone.unconfirmed':
      'جوابی نرسید، پس معلوم نیست شمارهٔ شما تغییر کرده است یا نه. این صفحه را دوباره باز کنید تا ببینید چه چیزی نگهداری شده است.',
    'phone.paused':
      'فعلاً شمارهٔ تلفون جمع‌آوری نمی‌شود. شمارهٔ شما تا وقتی حذفش نکنید نگهداری می‌شود.',
    'phone.foot':
      'چیزی به این شماره فرستاده نمی‌شود: هیچ خدمت پیام‌رسانی به این پلتفرم وصل نیست. هنوز هیچ صفحه‌ای هم آن را به کارمندان نشان نمی‌دهد.',
  },
  tr: {
    'phone.heading': 'Telefon numaranız',
    'phone.lede':
      'Tek bir biçimde saklanır: önce ülke kodu, sonra numara. Böylece hangi ülkeden aranırsa aransın aynı telefona ulaşılır. Siz onu burada görürsünüz; platform personelinin de onu okumasına izin vardır.',
    'phone.storedAs': 'Şu biçimde saklanıyor: {number}',
    'phone.country': 'Ülke',
    'phone.number': 'Telefon numarası',
    'phone.help':
      'İstediğiniz gibi yazın: boşluklarla, parantezle, başında sıfırla veya artı işaretiyle. Hepsi aynı şekilde okunur.',
    'phone.willStore': 'Şu biçimde saklanacak: {number}',
    'phone.whyCountry': 'Bu numaranın ait olduğu ülkeyi seçin.',
    'phone.whyEmpty': 'Bir telefon numarası yazın.',
    'phone.whyLetters': 'Telefon numarasında harf bulunamaz.',
    'phone.whyPunctuation': 'Numaranın rakamlarını yazın. Şu ana kadar yalnızca işaretler var.',
    'phone.whyPlus': 'Bir numarada en çok bir artı işareti olur, o da yalnızca başında.',
    'phone.whyOtherCountry':
      'Bu numaranın başı: {begins}. Seçilen ülkenin numaralarının başı: {dial}. Numaranın ait olduğu ülkeyi seçin.',
    'phone.whyLength':
      'Bu ülkede bir numaranın ülke kodundan sonraki rakam sayısı: {digits}. Bu numaradaki rakam sayısı: {count}',
    'phone.whyLengthRange':
      'Bu ülkede ülke kodundan sonraki rakam sayısının iki sınırı vardır. En az: {min}. En çok: {max}. Bu numarada: {count}',
    'phone.whyTrunk': 'Numaranın başına yazılan şu rakam sayılmaz: {digit}',
    'phone.whyNoDial':
      'O ülke için burada kayıtlı bir kod yok; bu yüzden oradan bir numara henüz saklanamaz.',
    'phone.save': 'Numaramı kaydet',
    'phone.update': 'Numaramı değiştir',
    'phone.saving': 'Kaydediliyor…',
    'phone.remove': 'Numaramı kaldır',
    'phone.saved': 'Telefon numaranız kaydedildi.',
    'phone.removed': 'Telefon numaranız kaldırıldı.',
    'phone.signedOut':
      'Oturumunuz kapanmış. Yeniden oturum açın, sonra tekrar deneyin. Hiçbir şey değişmedi.',
    'phone.off': 'Şu anda telefon numaraları toplanmıyor. Hiçbir şey değişmedi.',
    'phone.refused': 'Platform bu numarayı kabul etmedi. Hiçbir şey değişmedi.',
    'phone.unconfirmed':
      'Yanıt gelmedi; bu yüzden numaranızın değişip değişmediği bilinmiyor. Neyin saklandığını görmek için bu sayfayı yeniden yükleyin.',
    'phone.paused':
      'Şu anda telefon numaraları toplanmıyor. Numaranız, siz kaldırana kadar saklanır.',
    'phone.foot':
      'Bu numaraya hiçbir şey gönderilmez: bu platforma bağlı bir mesajlaşma hizmeti yok. Henüz hiçbir personel ekranı da onu göstermiyor.',
  },
  id: {
    'phone.heading': 'Nomor telepon Anda',
    'phone.lede':
      'Nomor ini disimpan dalam satu bentuk, kode negara lalu nomornya, supaya panggilan dari negara mana pun sampai ke telepon yang sama. Anda melihatnya di sini, dan staf platform diizinkan membacanya.',
    'phone.storedAs': 'Disimpan sebagai: {number}',
    'phone.country': 'Negara',
    'phone.number': 'Nomor telepon',
    'phone.help':
      'Tulis dengan cara apa pun: dengan spasi, tanda kurung, angka nol di depan, atau tanda tambah. Semuanya dibaca dengan cara yang sama.',
    'phone.willStore': 'Akan disimpan sebagai: {number}',
    'phone.whyCountry': 'Pilih negara asal nomor ini.',
    'phone.whyEmpty': 'Ketik nomor telepon.',
    'phone.whyLetters': 'Nomor telepon tidak boleh berisi huruf.',
    'phone.whyPunctuation': 'Ketik angka-angka nomornya. Sejauh ini hanya ada tanda.',
    'phone.whyPlus': 'Sebuah nomor memiliki paling banyak satu tanda tambah, dan hanya di awal.',
    'phone.whyOtherCountry':
      'Nomor ini diawali {begins}, sedangkan nomor dari negara yang dipilih diawali {dial}. Pilih negara asal nomor ini.',
    'phone.whyLength':
      'Jumlah angka pada nomor dari negara ini setelah kode negara: {digits}. Jumlah angka pada nomor ini: {count}',
    'phone.whyLengthRange':
      'Di negara ini, jumlah angka setelah kode negara memiliki dua batas. Paling sedikit: {min}. Paling banyak: {max}. Pada nomor ini: {count}',
    'phone.whyTrunk': 'Angka {digit} yang ditulis di depan nomor tidak dihitung.',
    'phone.whyNoDial':
      'Belum ada kode yang tercatat di sini untuk negara itu, jadi nomor dari sana belum dapat disimpan.',
    'phone.save': 'Simpan nomor saya',
    'phone.update': 'Ubah nomor saya',
    'phone.saving': 'Menyimpan…',
    'phone.remove': 'Hapus nomor saya',
    'phone.saved': 'Nomor telepon Anda sudah disimpan.',
    'phone.removed': 'Nomor telepon Anda sudah dihapus.',
    'phone.signedOut':
      'Anda sudah keluar. Masuk lagi, lalu coba sekali lagi. Tidak ada yang berubah.',
    'phone.off': 'Nomor telepon sedang tidak dikumpulkan saat ini. Tidak ada yang berubah.',
    'phone.refused': 'Platform tidak menerima nomor ini. Tidak ada yang berubah.',
    'phone.unconfirmed':
      'Tidak ada jawaban yang datang, jadi tidak diketahui apakah nomor Anda berubah. Muat ulang halaman ini untuk melihat apa yang tersimpan.',
    'phone.paused':
      'Nomor telepon sedang tidak dikumpulkan saat ini. Nomor Anda tetap disimpan sampai Anda menghapusnya.',
    'phone.foot':
      'Tidak ada yang dikirim ke nomor ini: tidak ada layanan pesan yang terhubung ke platform ini. Belum ada pula layar staf yang menampilkannya.',
  },
  ms: {
    'phone.heading': 'Nombor telefon anda',
    'phone.lede':
      'Nombor ini disimpan dalam satu bentuk, kod negara kemudian nombornya, supaya panggilan dari mana-mana negara sampai ke telefon yang sama. Anda melihatnya di sini, dan kakitangan platform dibenarkan membacanya.',
    'phone.storedAs': 'Disimpan sebagai: {number}',
    'phone.country': 'Negara',
    'phone.number': 'Nombor telefon',
    'phone.help':
      'Tulis dengan apa-apa cara: dengan ruang, kurungan, sifar di hadapan atau tanda tambah. Semuanya dibaca dengan cara yang sama.',
    'phone.willStore': 'Akan disimpan sebagai: {number}',
    'phone.whyCountry': 'Pilih negara asal nombor ini.',
    'phone.whyEmpty': 'Taip nombor telefon.',
    'phone.whyLetters': 'Nombor telefon tidak boleh mengandungi huruf.',
    'phone.whyPunctuation': 'Taip digit nombor itu. Setakat ini hanya ada tanda.',
    'phone.whyPlus':
      'Sesuatu nombor mempunyai paling banyak satu tanda tambah, dan hanya di permulaan.',
    'phone.whyOtherCountry':
      'Nombor ini bermula dengan {begins}, manakala nombor dari negara yang dipilih bermula dengan {dial}. Pilih negara asal nombor ini.',
    'phone.whyLength':
      'Bilangan digit pada nombor dari negara ini selepas kod negara: {digits}. Bilangan digit pada nombor ini: {count}',
    'phone.whyLengthRange':
      'Di negara ini, bilangan digit selepas kod negara mempunyai dua had. Paling sedikit: {min}. Paling banyak: {max}. Pada nombor ini: {count}',
    'phone.whyTrunk': 'Digit {digit} yang ditulis di hadapan nombor tidak dikira.',
    'phone.whyNoDial':
      'Tiada kod direkodkan di sini untuk negara itu, maka nombor dari sana belum dapat disimpan.',
    'phone.save': 'Simpan nombor saya',
    'phone.update': 'Tukar nombor saya',
    'phone.saving': 'Menyimpan…',
    'phone.remove': 'Buang nombor saya',
    'phone.saved': 'Nombor telefon anda telah disimpan.',
    'phone.removed': 'Nombor telefon anda telah dibuang.',
    'phone.signedOut':
      'Anda telah log keluar. Log masuk semula, kemudian cuba sekali lagi. Tiada apa-apa berubah.',
    'phone.off': 'Nombor telefon tidak dikumpulkan buat masa ini. Tiada apa-apa berubah.',
    'phone.refused': 'Platform tidak menerima nombor ini. Tiada apa-apa berubah.',
    'phone.unconfirmed':
      'Tiada jawapan diterima, maka tidak diketahui sama ada nombor anda berubah. Muat semula halaman ini untuk melihat apa yang disimpan.',
    'phone.paused':
      'Nombor telefon tidak dikumpulkan buat masa ini. Nombor anda disimpan sehingga anda membuangnya.',
    'phone.foot':
      'Tiada apa-apa dihantar ke nombor ini: tiada perkhidmatan mesej disambungkan ke platform ini. Belum ada juga skrin kakitangan yang memaparkannya.',
  },
  bn: {
    'phone.heading': 'আপনার ফোন নম্বর',
    'phone.lede':
      'এটি একটিই রূপে রাখা হয়, প্রথমে দেশের কোড, তারপর নম্বর, যাতে যেকোনো দেশ থেকে করা কল একই ফোনে পৌঁছায়। আপনি এটি এখানে দেখতে পান, আর প্ল্যাটফর্মের কর্মীদের এটি পড়ার অনুমতি আছে।',
    'phone.storedAs': 'এই রূপে রাখা আছে: {number}',
    'phone.country': 'দেশ',
    'phone.number': 'ফোন নম্বর',
    'phone.help':
      'যেভাবে ইচ্ছা লিখুন: ফাঁকা জায়গা দিয়ে, বন্ধনী দিয়ে, শুরুতে শূন্য দিয়ে বা যোগ চিহ্ন দিয়ে। সবই একইভাবে পড়া হয়।',
    'phone.willStore': 'এই রূপে রাখা হবে: {number}',
    'phone.whyCountry': 'এই নম্বরটি যে দেশের, সেই দেশ বেছে নিন।',
    'phone.whyEmpty': 'একটি ফোন নম্বর লিখুন।',
    'phone.whyLetters': 'ফোন নম্বরে অক্ষর থাকতে পারে না।',
    'phone.whyPunctuation': 'নম্বরের অঙ্কগুলো লিখুন। এখন পর্যন্ত শুধু চিহ্ন আছে।',
    'phone.whyPlus': 'একটি নম্বরে যোগ চিহ্ন বড়জোর একটি থাকে, আর তা শুধু শুরুতে।',
    'phone.whyOtherCountry':
      'এই নম্বরটি {begins} দিয়ে শুরু, আর বেছে নেওয়া দেশের নম্বর {dial} দিয়ে শুরু হয়। নম্বরটি যে দেশের, সেই দেশ বেছে নিন।',
    'phone.whyLength':
      'এই দেশের নম্বরে দেশের কোডের পরে অঙ্কের সংখ্যা: {digits}। এই নম্বরে অঙ্কের সংখ্যা: {count}',
    'phone.whyLengthRange':
      'এই দেশে দেশের কোডের পরে অঙ্কের সংখ্যার দুটি সীমা আছে। সবচেয়ে কম: {min}। সবচেয়ে বেশি: {max}। এই নম্বরে: {count}',
    'phone.whyTrunk': 'নম্বরের শুরুতে লেখা এই অঙ্কটি গোনা হয় না: {digit}',
    'phone.whyNoDial':
      'ওই দেশের কোনো কোড এখানে নথিভুক্ত নেই, তাই সেখানকার নম্বর এখনো রাখা যাচ্ছে না।',
    'phone.save': 'আমার নম্বর সংরক্ষণ করুন',
    'phone.update': 'আমার নম্বর বদলান',
    'phone.saving': 'সংরক্ষণ হচ্ছে…',
    'phone.remove': 'আমার নম্বর মুছে ফেলুন',
    'phone.saved': 'আপনার ফোন নম্বর সংরক্ষণ করা হয়েছে।',
    'phone.removed': 'আপনার ফোন নম্বর মুছে ফেলা হয়েছে।',
    'phone.signedOut':
      'আপনি সাইন আউট হয়ে গেছেন। আবার সাইন ইন করুন, তারপর আবার চেষ্টা করুন। কিছুই বদলায়নি।',
    'phone.off': 'এই মুহূর্তে ফোন নম্বর সংগ্রহ করা হচ্ছে না। কিছুই বদলায়নি।',
    'phone.refused': 'প্ল্যাটফর্ম এই নম্বরটি গ্রহণ করেনি। কিছুই বদলায়নি।',
    'phone.unconfirmed':
      'কোনো উত্তর আসেনি, তাই আপনার নম্বর বদলেছে কি না জানা নেই। কী রাখা আছে তা দেখতে এই পৃষ্ঠাটি আবার লোড করুন।',
    'phone.paused':
      'এই মুহূর্তে ফোন নম্বর সংগ্রহ করা হচ্ছে না। আপনি মুছে না ফেলা পর্যন্ত আপনার নম্বর রাখা থাকবে।',
    'phone.foot':
      'এই নম্বরে কিছুই পাঠানো হয় না: এই প্ল্যাটফর্মের সঙ্গে কোনো বার্তা পাঠানোর পরিষেবা যুক্ত নেই। কর্মীদের কোনো পর্দাও এখনো এটি দেখায় না।',
  },
  hi: {
    'phone.heading': 'आपका फ़ोन नंबर',
    'phone.lede':
      'इसे एक ही रूप में रखा जाता है, पहले देश का कोड और फिर नंबर, ताकि किसी भी देश से किया गया कॉल उसी फ़ोन तक पहुँचे। आप इसे यहाँ देखते हैं, और प्लेटफ़ॉर्म के स्टाफ़ को इसे पढ़ने की अनुमति है।',
    'phone.storedAs': 'इस रूप में रखा गया है: {number}',
    'phone.country': 'देश',
    'phone.number': 'फ़ोन नंबर',
    'phone.help':
      'जैसे चाहें लिखें: खाली जगह के साथ, कोष्ठक के साथ, शुरू में शून्य के साथ या जोड़ के चिह्न के साथ। इसे एक ही तरह पढ़ा जाता है।',
    'phone.willStore': 'इस रूप में रखा जाएगा: {number}',
    'phone.whyCountry': 'वह देश चुनें जिसका यह नंबर है।',
    'phone.whyEmpty': 'फ़ोन नंबर लिखें।',
    'phone.whyLetters': 'फ़ोन नंबर में अक्षर नहीं हो सकते।',
    'phone.whyPunctuation': 'नंबर के अंक लिखें। अभी तक केवल चिह्न हैं।',
    'phone.whyPlus': 'नंबर में जोड़ का चिह्न अधिक से अधिक एक होता है, और केवल शुरू में।',
    'phone.whyOtherCountry':
      'यह नंबर {begins} से शुरू होता है, और चुने गए देश का नंबर {dial} से शुरू होता है। वह देश चुनें जिसका यह नंबर है।',
    'phone.whyLength':
      'इस देश के नंबर में देश के कोड के बाद अंकों की संख्या: {digits}। इस नंबर में अंकों की संख्या: {count}',
    'phone.whyLengthRange':
      'इस देश में देश के कोड के बाद अंकों की संख्या की दो सीमाएँ हैं। कम से कम: {min}। अधिक से अधिक: {max}। इस नंबर में: {count}',
    'phone.whyTrunk': 'नंबर के शुरू में लिखा जाने वाला यह अंक नहीं गिना जाता: {digit}',
    'phone.whyNoDial':
      'उस देश का कोई कोड यहाँ दर्ज नहीं है, इसलिए वहाँ का नंबर अभी नहीं रखा जा सकता।',
    'phone.save': 'मेरा नंबर सहेजें',
    'phone.update': 'मेरा नंबर बदलें',
    'phone.saving': 'सहेजा जा रहा है…',
    'phone.remove': 'मेरा नंबर हटाएँ',
    'phone.saved': 'आपका फ़ोन नंबर सहेज लिया गया है।',
    'phone.removed': 'आपका फ़ोन नंबर हटा दिया गया है।',
    'phone.signedOut':
      'आप साइन आउट हो चुके हैं। फिर से साइन इन करें, फिर दोबारा कोशिश करें। कुछ नहीं बदला।',
    'phone.off': 'इस समय फ़ोन नंबर नहीं लिए जा रहे हैं। कुछ नहीं बदला।',
    'phone.refused': 'प्लेटफ़ॉर्म ने यह नंबर स्वीकार नहीं किया। कुछ नहीं बदला।',
    'phone.unconfirmed':
      'कोई जवाब नहीं आया, इसलिए पता नहीं कि आपका नंबर बदला या नहीं। क्या रखा गया है यह देखने के लिए यह पेज फिर से लोड करें।',
    'phone.paused':
      'इस समय फ़ोन नंबर नहीं लिए जा रहे हैं। जब तक आप इसे नहीं हटाते, आपका नंबर रखा रहेगा।',
    'phone.foot':
      'इस नंबर पर कुछ नहीं भेजा जाता: इस प्लेटफ़ॉर्म से कोई संदेश सेवा जुड़ी नहीं है। स्टाफ़ की कोई स्क्रीन भी अभी इसे नहीं दिखाती।',
  },
  fr: {
    'phone.heading': 'Votre numéro de téléphone',
    'phone.lede':
      'Il est conservé sous une seule forme, l’indicatif du pays puis le numéro, afin qu’un appel passé depuis n’importe quel pays arrive au même téléphone. Vous le voyez ici, et le personnel de la plateforme est autorisé à le lire.',
    'phone.storedAs': 'Conservé sous cette forme : {number}',
    'phone.country': 'Pays',
    'phone.number': 'Numéro de téléphone',
    'phone.help':
      'Écrivez-le comme vous voulez : avec des espaces, des parenthèses, un zéro au début ou un signe plus. Il est lu de la même façon.',
    'phone.willStore': 'Il sera conservé sous cette forme : {number}',
    'phone.whyCountry': 'Choisissez le pays auquel appartient ce numéro.',
    'phone.whyEmpty': 'Saisissez un numéro de téléphone.',
    'phone.whyLetters': 'Un numéro de téléphone ne peut pas contenir de lettres.',
    'phone.whyPunctuation':
      'Saisissez les chiffres du numéro. Pour l’instant, il n’y a que des signes.',
    'phone.whyPlus': 'Un numéro comporte au plus un signe plus, et seulement au début.',
    'phone.whyOtherCountry':
      'Ce numéro commence par {begins}, et un numéro du pays choisi commence par {dial}. Choisissez le pays auquel appartient le numéro.',
    'phone.whyLength':
      'Nombre de chiffres d’un numéro de ce pays après l’indicatif : {digits}. Nombre de chiffres de ce numéro : {count}',
    'phone.whyLengthRange':
      'Dans ce pays, le nombre de chiffres après l’indicatif a deux limites. Au moins : {min}. Au plus : {max}. Dans ce numéro : {count}',
    'phone.whyTrunk': 'Le chiffre {digit} écrit au début du numéro n’est pas compté.',
    'phone.whyNoDial':
      'Aucun indicatif n’est enregistré ici pour ce pays ; un numéro de ce pays ne peut donc pas encore être conservé.',
    'phone.save': 'Enregistrer mon numéro',
    'phone.update': 'Modifier mon numéro',
    'phone.saving': 'Enregistrement…',
    'phone.remove': 'Supprimer mon numéro',
    'phone.saved': 'Votre numéro de téléphone a été enregistré.',
    'phone.removed': 'Votre numéro de téléphone a été supprimé.',
    'phone.signedOut':
      'Votre session est fermée. Reconnectez-vous, puis réessayez. Rien n’a été modifié.',
    'phone.off':
      'Les numéros de téléphone ne sont pas recueillis pour le moment. Rien n’a été modifié.',
    'phone.refused': 'La plateforme n’a pas accepté ce numéro. Rien n’a été modifié.',
    'phone.unconfirmed':
      'Aucune réponse n’est arrivée ; on ne sait donc pas si votre numéro a changé. Rechargez cette page pour voir ce qui est conservé.',
    'phone.paused':
      'Les numéros de téléphone ne sont pas recueillis pour le moment. Votre numéro est conservé jusqu’à ce que vous le supprimiez.',
    'phone.foot':
      'Rien n’est envoyé à ce numéro : aucun service de messagerie n’est relié à cette plateforme. Aucun écran du personnel ne l’affiche encore.',
  },
  es: {
    'phone.heading': 'Su número de teléfono',
    'phone.lede':
      'Se guarda de una sola forma, el código del país y después el número, para que una llamada desde cualquier país llegue al mismo teléfono. Usted lo ve aquí, y el personal de la plataforma tiene permiso para leerlo.',
    'phone.storedAs': 'Guardado así: {number}',
    'phone.country': 'País',
    'phone.number': 'Número de teléfono',
    'phone.help':
      'Escríbalo como quiera: con espacios, con paréntesis, con un cero delante o con el signo más. Se lee de la misma manera.',
    'phone.willStore': 'Se guardará así: {number}',
    'phone.whyCountry': 'Elija el país al que pertenece este número.',
    'phone.whyEmpty': 'Escriba un número de teléfono.',
    'phone.whyLetters': 'Un número de teléfono no puede contener letras.',
    'phone.whyPunctuation': 'Escriba las cifras del número. Por ahora solo hay signos.',
    'phone.whyPlus': 'Un número lleva como máximo un signo más, y solo al principio.',
    'phone.whyOtherCountry':
      'Este número empieza por {begins}, y un número del país elegido empieza por {dial}. Elija el país al que pertenece el número.',
    'phone.whyLength':
      'Cifras que tiene un número de este país después del código del país: {digits}. Cifras que tiene este número: {count}',
    'phone.whyLengthRange':
      'En este país, la cantidad de cifras después del código del país tiene dos límites. Como mínimo: {min}. Como máximo: {max}. En este número: {count}',
    'phone.whyTrunk': 'La cifra {digit} escrita delante del número no se cuenta.',
    'phone.whyNoDial':
      'Aquí no hay ningún código registrado para ese país, así que todavía no se puede guardar un número de allí.',
    'phone.save': 'Guardar mi número',
    'phone.update': 'Cambiar mi número',
    'phone.saving': 'Guardando…',
    'phone.remove': 'Quitar mi número',
    'phone.saved': 'Se ha guardado su número de teléfono.',
    'phone.removed': 'Se ha quitado su número de teléfono.',
    'phone.signedOut':
      'Se ha cerrado su sesión. Vuelva a iniciar sesión y luego inténtelo de nuevo. No se cambió nada.',
    'phone.off': 'En este momento no se están recogiendo números de teléfono. No se cambió nada.',
    'phone.refused': 'La plataforma no aceptó este número. No se cambió nada.',
    'phone.unconfirmed':
      'No llegó ninguna respuesta, así que no se sabe si su número cambió. Vuelva a cargar esta página para ver qué está guardado.',
    'phone.paused':
      'En este momento no se están recogiendo números de teléfono. Su número se conserva hasta que usted lo quite.',
    'phone.foot':
      'No se envía nada a este número: no hay ningún servicio de mensajería conectado a esta plataforma. Ninguna pantalla del personal lo muestra todavía.',
  },
  pt: {
    'phone.heading': 'O seu número de telefone',
    'phone.lede':
      'É guardado de uma só forma, o indicativo do país e depois o número, para que uma chamada feita de qualquer país chegue ao mesmo telefone. Vê-o aqui, e o pessoal da plataforma tem permissão para o ler.',
    'phone.storedAs': 'Guardado assim: {number}',
    'phone.country': 'País',
    'phone.number': 'Número de telefone',
    'phone.help':
      'Escreva-o como quiser: com espaços, com parênteses, com um zero à frente ou com o sinal de mais. É lido da mesma maneira.',
    'phone.willStore': 'Será guardado assim: {number}',
    'phone.whyCountry': 'Escolha o país a que este número pertence.',
    'phone.whyEmpty': 'Escreva um número de telefone.',
    'phone.whyLetters': 'Um número de telefone não pode conter letras.',
    'phone.whyPunctuation': 'Escreva os algarismos do número. Por enquanto só há sinais.',
    'phone.whyPlus': 'Um número tem no máximo um sinal de mais, e apenas no início.',
    'phone.whyOtherCountry':
      'Este número começa por {begins}, e um número do país escolhido começa por {dial}. Escolha o país a que o número pertence.',
    'phone.whyLength':
      'Algarismos que um número deste país tem depois do indicativo: {digits}. Algarismos que este número tem: {count}',
    'phone.whyLengthRange':
      'Neste país, a quantidade de algarismos depois do indicativo tem dois limites. No mínimo: {min}. No máximo: {max}. Neste número: {count}',
    'phone.whyTrunk': 'O algarismo {digit} escrito à frente do número não é contado.',
    'phone.whyNoDial':
      'Não há aqui nenhum indicativo registado para esse país, por isso ainda não é possível guardar um número de lá.',
    'phone.save': 'Guardar o meu número',
    'phone.update': 'Alterar o meu número',
    'phone.saving': 'A guardar…',
    'phone.remove': 'Remover o meu número',
    'phone.saved': 'O seu número de telefone foi guardado.',
    'phone.removed': 'O seu número de telefone foi removido.',
    'phone.signedOut':
      'A sua sessão terminou. Inicie sessão novamente e depois tente outra vez. Nada foi alterado.',
    'phone.off': 'De momento, não estão a ser recolhidos números de telefone. Nada foi alterado.',
    'phone.refused': 'A plataforma não aceitou este número. Nada foi alterado.',
    'phone.unconfirmed':
      'Não chegou nenhuma resposta, por isso não se sabe se o seu número mudou. Recarregue esta página para ver o que está guardado.',
    'phone.paused':
      'De momento, não estão a ser recolhidos números de telefone. O seu número fica guardado até o remover.',
    'phone.foot':
      'Nada é enviado para este número: não há nenhum serviço de mensagens ligado a esta plataforma. Nenhum ecrã do pessoal o mostra ainda.',
  },
  sw: {
    'phone.heading': 'Namba yako ya simu',
    'phone.lede':
      'Inahifadhiwa kwa namna moja, msimbo wa nchi kisha namba, ili simu inayopigwa kutoka nchi yoyote ifike kwenye simu ileile. Unaiona hapa, na wafanyakazi wa jukwaa wanaruhusiwa kuisoma.',
    'phone.storedAs': 'Imehifadhiwa hivi: {number}',
    'phone.country': 'Nchi',
    'phone.number': 'Namba ya simu',
    'phone.help':
      'Iandike upendavyo: kwa nafasi, kwa mabano, kwa sifuri mwanzoni au kwa alama ya kujumlisha. Inasomwa kwa namna ileile.',
    'phone.willStore': 'Itahifadhiwa hivi: {number}',
    'phone.whyCountry': 'Chagua nchi ambayo namba hii ni yake.',
    'phone.whyEmpty': 'Andika namba ya simu.',
    'phone.whyLetters': 'Namba ya simu haiwezi kuwa na herufi.',
    'phone.whyPunctuation': 'Andika tarakimu za namba. Hadi sasa kuna alama tu.',
    'phone.whyPlus': 'Namba ina alama ya kujumlisha isiyozidi moja, nayo ni mwanzoni pekee.',
    'phone.whyOtherCountry':
      'Namba hii inaanza na {begins}, na namba ya nchi iliyochaguliwa inaanza na {dial}. Chagua nchi ambayo namba hii ni yake.',
    'phone.whyLength':
      'Idadi ya tarakimu za namba ya nchi hii baada ya msimbo wa nchi: {digits}. Idadi ya tarakimu za namba hii: {count}',
    'phone.whyLengthRange':
      'Katika nchi hii, idadi ya tarakimu baada ya msimbo wa nchi ina mipaka miwili. Chache kabisa: {min}. Nyingi kabisa: {max}. Katika namba hii: {count}',
    'phone.whyTrunk': 'Tarakimu {digit} inayoandikwa mwanzoni mwa namba haihesabiwi.',
    'phone.whyNoDial':
      'Hakuna msimbo uliorekodiwa hapa kwa nchi hiyo, kwa hiyo namba ya huko haiwezi kuhifadhiwa bado.',
    'phone.save': 'Hifadhi namba yangu',
    'phone.update': 'Badilisha namba yangu',
    'phone.saving': 'Inahifadhi…',
    'phone.remove': 'Ondoa namba yangu',
    'phone.saved': 'Namba yako ya simu imehifadhiwa.',
    'phone.removed': 'Namba yako ya simu imeondolewa.',
    'phone.signedOut':
      'Umetoka kwenye akaunti. Ingia tena, kisha ujaribu tena. Hakuna kilichobadilika.',
    'phone.off': 'Namba za simu hazikusanywi kwa sasa. Hakuna kilichobadilika.',
    'phone.refused': 'Jukwaa halikuikubali namba hii. Hakuna kilichobadilika.',
    'phone.unconfirmed':
      'Hakuna jibu lililofika, kwa hiyo haijulikani kama namba yako imebadilika. Pakia upya ukurasa huu ili uone kilichohifadhiwa.',
    'phone.paused':
      'Namba za simu hazikusanywi kwa sasa. Namba yako inabaki imehifadhiwa hadi utakapoiondoa.',
    'phone.foot':
      'Hakuna kinachotumwa kwa namba hii: hakuna huduma ya ujumbe iliyounganishwa na jukwaa hili. Hakuna skrini ya wafanyakazi inayoionyesha bado.',
  },
  af: {
    'phone.heading': 'Jou telefoonnommer',
    'phone.lede':
      'Dit word in een vorm gehou, die landkode en dan die nommer, sodat ’n oproep uit enige land dieselfde foon bereik. Jy sien dit hier, en die platform se personeel mag dit lees.',
    'phone.storedAs': 'Gehou as: {number}',
    'phone.country': 'Land',
    'phone.number': 'Telefoonnommer',
    'phone.help':
      'Skryf dit soos jy wil: met spasies, met hakies, met ’n nul voor of met ’n plusteken. Dit word op dieselfde manier gelees.',
    'phone.willStore': 'Dit sal gehou word as: {number}',
    'phone.whyCountry': 'Kies die land waaraan hierdie nommer behoort.',
    'phone.whyEmpty': 'Tik ’n telefoonnommer.',
    'phone.whyLetters': '’n Telefoonnommer kan nie letters bevat nie.',
    'phone.whyPunctuation': 'Tik die syfers van die nommer. Tot dusver is daar net tekens.',
    'phone.whyPlus': '’n Nommer het hoogstens een plusteken, en net aan die begin.',
    'phone.whyOtherCountry':
      'Hierdie nommer begin met {begins}, en ’n nommer uit die gekose land begin met {dial}. Kies die land waaraan die nommer behoort.',
    'phone.whyLength':
      'Syfers wat ’n nommer uit hierdie land ná die landkode het: {digits}. Syfers wat hierdie nommer het: {count}',
    'phone.whyLengthRange':
      'In hierdie land het die aantal syfers ná die landkode twee perke. Die minste: {min}. Die meeste: {max}. In hierdie nommer: {count}',
    'phone.whyTrunk': 'Die syfer {digit} wat voor die nommer geskryf word, word nie getel nie.',
    'phone.whyNoDial':
      'Daar is geen kode vir daardie land hier aangeteken nie, dus kan ’n nommer van daar nog nie gehou word nie.',
    'phone.save': 'Stoor my nommer',
    'phone.update': 'Verander my nommer',
    'phone.saving': 'Stoor tans…',
    'phone.remove': 'Verwyder my nommer',
    'phone.saved': 'Jou telefoonnommer is gestoor.',
    'phone.removed': 'Jou telefoonnommer is verwyder.',
    'phone.signedOut': 'Jy is afgeteken. Teken weer aan en probeer dan weer. Niks is verander nie.',
    'phone.off': 'Telefoonnommers word tans nie ingesamel nie. Niks is verander nie.',
    'phone.refused': 'Die platform het hierdie nommer nie aanvaar nie. Niks is verander nie.',
    'phone.unconfirmed':
      'Geen antwoord het gekom nie, dus is dit nie bekend of jou nommer verander het nie. Laai hierdie bladsy weer om te sien wat gehou word.',
    'phone.paused':
      'Telefoonnommers word tans nie ingesamel nie. Jou nommer word gehou totdat jy dit verwyder.',
    'phone.foot':
      'Niks word na hierdie nommer gestuur nie: geen boodskapdiens is aan hierdie platform gekoppel nie. Geen personeelskerm wys dit nog nie.',
  },
  'zh-hans': {
    'phone.heading': '你的电话号码',
    'phone.lede': '号码以一种形式保存，先是国家代码，然后是号码，这样从任何国家拨打都能接通同一部电话。你可以在这里看到它，平台工作人员也获准读取它。',
    'phone.storedAs': '保存形式：{number}',
    'phone.country': '国家',
    'phone.number': '电话号码',
    'phone.help': '怎么写都可以：带空格、带括号、开头带零或带加号。读出来的结果都一样。',
    'phone.willStore': '将保存为：{number}',
    'phone.whyCountry': '请选择这个号码所属的国家。',
    'phone.whyEmpty': '请输入电话号码。',
    'phone.whyLetters': '电话号码不能包含字母。',
    'phone.whyPunctuation': '请输入号码的数字。目前只有符号。',
    'phone.whyPlus': '一个号码最多只有一个加号，而且只能在开头。',
    'phone.whyOtherCountry': '这个号码的开头：{begins}。所选国家的号码的开头：{dial}。请选择这个号码所属的国家。',
    'phone.whyLength': '这个国家的号码在国家代码之后的位数：{digits}。这个号码的位数：{count}',
    'phone.whyLengthRange': '在这个国家，国家代码之后的位数有两个界限。最少：{min}。最多：{max}。这个号码：{count}',
    'phone.whyTrunk': '写在号码开头的这个数字不计入位数：{digit}',
    'phone.whyNoDial': '这里没有记录那个国家的代码，所以暂时无法保存那里的号码。',
    'phone.save': '保存我的号码',
    'phone.update': '更改我的号码',
    'phone.saving': '正在保存…',
    'phone.remove': '删除我的号码',
    'phone.saved': '你的电话号码已保存。',
    'phone.removed': '你的电话号码已删除。',
    'phone.signedOut': '你已退出登录。请重新登录后再试一次。没有任何更改。',
    'phone.off': '目前不收集电话号码。没有任何更改。',
    'phone.refused': '平台没有接受这个号码。没有任何更改。',
    'phone.unconfirmed': '没有收到答复，所以不知道你的号码是否已更改。请重新加载本页，查看保存的内容。',
    'phone.paused': '目前不收集电话号码。你的号码会一直保存，直到你将它删除。',
    'phone.foot': '不会向这个号码发送任何内容：本平台没有连接任何消息服务。目前也没有任何工作人员页面显示它。',
  },
  'zh-hant': {
    'phone.heading': '你的電話號碼',
    'phone.lede': '號碼以一種形式保存，先是國家代碼，然後是號碼，這樣從任何國家撥打都能接通同一支電話。你可以在這裡看到它，平台工作人員也獲准讀取它。',
    'phone.storedAs': '保存形式：{number}',
    'phone.country': '國家',
    'phone.number': '電話號碼',
    'phone.help': '怎麼寫都可以：帶空格、帶括號、開頭帶零或帶加號。讀出來的結果都一樣。',
    'phone.willStore': '將保存為：{number}',
    'phone.whyCountry': '請選擇這個號碼所屬的國家。',
    'phone.whyEmpty': '請輸入電話號碼。',
    'phone.whyLetters': '電話號碼不能包含字母。',
    'phone.whyPunctuation': '請輸入號碼的數字。目前只有符號。',
    'phone.whyPlus': '一個號碼最多只有一個加號，而且只能在開頭。',
    'phone.whyOtherCountry': '這個號碼的開頭：{begins}。所選國家的號碼的開頭：{dial}。請選擇這個號碼所屬的國家。',
    'phone.whyLength': '這個國家的號碼在國家代碼之後的位數：{digits}。這個號碼的位數：{count}',
    'phone.whyLengthRange': '在這個國家，國家代碼之後的位數有兩個界限。最少：{min}。最多：{max}。這個號碼：{count}',
    'phone.whyTrunk': '寫在號碼開頭的這個數字不計入位數：{digit}',
    'phone.whyNoDial': '這裡沒有記錄那個國家的代碼，所以暫時無法保存那裡的號碼。',
    'phone.save': '儲存我的號碼',
    'phone.update': '變更我的號碼',
    'phone.saving': '正在儲存…',
    'phone.remove': '刪除我的號碼',
    'phone.saved': '你的電話號碼已儲存。',
    'phone.removed': '你的電話號碼已刪除。',
    'phone.signedOut': '你已登出。請重新登入後再試一次。沒有任何變更。',
    'phone.off': '目前不收集電話號碼。沒有任何變更。',
    'phone.refused': '平台沒有接受這個號碼。沒有任何變更。',
    'phone.unconfirmed': '沒有收到回覆，所以不知道你的號碼是否已變更。請重新載入本頁，查看保存的內容。',
    'phone.paused': '目前不收集電話號碼。你的號碼會一直保存，直到你將它刪除。',
    'phone.foot': '不會向這個號碼傳送任何內容：本平台沒有連接任何訊息服務。目前也沒有任何工作人員頁面顯示它。',
  },
  vi: {
    'phone.heading': 'Số điện thoại của bạn',
    'phone.lede':
      'Số được lưu theo một dạng duy nhất, mã quốc gia rồi đến số, để cuộc gọi từ bất kỳ nước nào cũng đến cùng một máy. Bạn thấy số ở đây, và nhân viên của nền tảng được phép đọc số này.',
    'phone.storedAs': 'Được lưu dưới dạng: {number}',
    'phone.country': 'Quốc gia',
    'phone.number': 'Số điện thoại',
    'phone.help':
      'Viết theo cách nào cũng được: có dấu cách, có dấu ngoặc, có số không ở đầu hoặc có dấu cộng. Số được đọc theo cùng một cách.',
    'phone.willStore': 'Sẽ được lưu dưới dạng: {number}',
    'phone.whyCountry': 'Hãy chọn quốc gia của số này.',
    'phone.whyEmpty': 'Hãy nhập số điện thoại.',
    'phone.whyLetters': 'Số điện thoại không thể có chữ cái.',
    'phone.whyPunctuation': 'Hãy nhập các chữ số của số điện thoại. Hiện mới chỉ có ký hiệu.',
    'phone.whyPlus': 'Một số có nhiều nhất một dấu cộng, và chỉ ở đầu.',
    'phone.whyOtherCountry':
      'Số này bắt đầu bằng {begins}, còn số của quốc gia đã chọn bắt đầu bằng {dial}. Hãy chọn quốc gia của số này.',
    'phone.whyLength':
      'Số chữ số sau mã quốc gia của một số thuộc nước này: {digits}. Số chữ số của số này: {count}',
    'phone.whyLengthRange':
      'Ở nước này, số chữ số sau mã quốc gia có hai giới hạn. Ít nhất: {min}. Nhiều nhất: {max}. Trong số này: {count}',
    'phone.whyTrunk': 'Chữ số {digit} viết ở đầu số không được tính.',
    'phone.whyNoDial':
      'Ở đây chưa ghi nhận mã nào cho quốc gia đó, nên chưa thể lưu số của nước đó.',
    'phone.save': 'Lưu số của tôi',
    'phone.update': 'Đổi số của tôi',
    'phone.saving': 'Đang lưu…',
    'phone.remove': 'Xóa số của tôi',
    'phone.saved': 'Số điện thoại của bạn đã được lưu.',
    'phone.removed': 'Số điện thoại của bạn đã được xóa.',
    'phone.signedOut': 'Bạn đã bị đăng xuất. Hãy đăng nhập lại rồi thử lại. Không có gì thay đổi.',
    'phone.off': 'Hiện tại số điện thoại không được thu thập. Không có gì thay đổi.',
    'phone.refused': 'Nền tảng không chấp nhận số này. Không có gì thay đổi.',
    'phone.unconfirmed':
      'Không có phản hồi nào, nên không biết số của bạn đã thay đổi hay chưa. Hãy tải lại trang này để xem số nào đang được lưu.',
    'phone.paused':
      'Hiện tại số điện thoại không được thu thập. Số của bạn vẫn được lưu cho đến khi bạn xóa.',
    'phone.foot':
      'Không có gì được gửi đến số này: không có dịch vụ nhắn tin nào được kết nối với nền tảng này. Cũng chưa có màn hình nào của nhân viên hiển thị số này.',
  },
  th: {
    'phone.heading': 'หมายเลขโทรศัพท์ของคุณ',
    'phone.lede':
      'หมายเลขนี้ถูกเก็บไว้ในรูปแบบเดียว คือรหัสประเทศแล้วตามด้วยหมายเลข เพื่อให้การโทรจากประเทศใดก็ตามไปถึงโทรศัพท์เครื่องเดียวกัน คุณเห็นหมายเลขนี้ได้ที่นี่ และเจ้าหน้าที่ของแพลตฟอร์มได้รับอนุญาตให้อ่านได้',
    'phone.storedAs': 'เก็บไว้ในรูปแบบ: {number}',
    'phone.country': 'ประเทศ',
    'phone.number': 'หมายเลขโทรศัพท์',
    'phone.help':
      'เขียนแบบใดก็ได้: มีช่องว่าง มีวงเล็บ มีเลขศูนย์นำหน้า หรือมีเครื่องหมายบวก ระบบอ่านได้เหมือนกันทั้งหมด',
    'phone.willStore': 'จะเก็บไว้ในรูปแบบ: {number}',
    'phone.whyCountry': 'โปรดเลือกประเทศของหมายเลขนี้',
    'phone.whyEmpty': 'โปรดพิมพ์หมายเลขโทรศัพท์',
    'phone.whyLetters': 'หมายเลขโทรศัพท์มีตัวอักษรไม่ได้',
    'phone.whyPunctuation': 'โปรดพิมพ์ตัวเลขของหมายเลข ตอนนี้มีแต่เครื่องหมาย',
    'phone.whyPlus': 'หมายเลขหนึ่งมีเครื่องหมายบวกได้ไม่เกินหนึ่งตัว และอยู่ได้เฉพาะตอนต้น',
    'phone.whyOtherCountry':
      'หมายเลขนี้ขึ้นต้นด้วย {begins} ส่วนหมายเลขของประเทศที่เลือกขึ้นต้นด้วย {dial} โปรดเลือกประเทศของหมายเลขนี้',
    'phone.whyLength':
      'จำนวนหลักของหมายเลขในประเทศนี้หลังรหัสประเทศ: {digits} จำนวนหลักของหมายเลขนี้: {count}',
    'phone.whyLengthRange':
      'ในประเทศนี้ จำนวนหลักหลังรหัสประเทศมีขอบเขตสองค่า น้อยที่สุด: {min} มากที่สุด: {max} ในหมายเลขนี้: {count}',
    'phone.whyTrunk': 'เลข {digit} ที่เขียนนำหน้าหมายเลขไม่ถูกนับ',
    'phone.whyNoDial':
      'ที่นี่ยังไม่มีรหัสที่บันทึกไว้สำหรับประเทศนั้น จึงยังเก็บหมายเลขจากประเทศนั้นไม่ได้',
    'phone.save': 'บันทึกหมายเลขของฉัน',
    'phone.update': 'เปลี่ยนหมายเลขของฉัน',
    'phone.saving': 'กำลังบันทึก…',
    'phone.remove': 'ลบหมายเลขของฉัน',
    'phone.saved': 'บันทึกหมายเลขโทรศัพท์ของคุณแล้ว',
    'phone.removed': 'ลบหมายเลขโทรศัพท์ของคุณแล้ว',
    'phone.signedOut': 'คุณออกจากระบบแล้ว เข้าสู่ระบบอีกครั้งแล้วลองใหม่ ไม่มีสิ่งใดเปลี่ยนแปลง',
    'phone.off': 'ขณะนี้ยังไม่มีการเก็บหมายเลขโทรศัพท์ ไม่มีสิ่งใดเปลี่ยนแปลง',
    'phone.refused': 'แพลตฟอร์มไม่รับหมายเลขนี้ ไม่มีสิ่งใดเปลี่ยนแปลง',
    'phone.unconfirmed':
      'ไม่มีคำตอบกลับมา จึงไม่ทราบว่าหมายเลขของคุณเปลี่ยนแล้วหรือไม่ โปรดโหลดหน้านี้ใหม่เพื่อดูสิ่งที่เก็บไว้',
    'phone.paused': 'ขณะนี้ยังไม่มีการเก็บหมายเลขโทรศัพท์ หมายเลขของคุณจะถูกเก็บไว้จนกว่าคุณจะลบ',
    'phone.foot':
      'ไม่มีการส่งสิ่งใดไปยังหมายเลขนี้: ไม่มีบริการส่งข้อความเชื่อมต่อกับแพลตฟอร์มนี้ และยังไม่มีหน้าจอของเจ้าหน้าที่ที่แสดงหมายเลขนี้',
  },
  fil: {
    'phone.heading': 'Ang numero ng iyong telepono',
    'phone.lede':
      'Iniingatan ito sa iisang anyo, ang code ng bansa at saka ang numero, upang ang tawag mula sa alinmang bansa ay makarating sa iisang telepono. Nakikita mo ito rito, at pinapayagan ang mga kawani ng platform na basahin ito.',
    'phone.storedAs': 'Iniingatan bilang: {number}',
    'phone.country': 'Bansa',
    'phone.number': 'Numero ng telepono',
    'phone.help':
      'Isulat ito sa paraang gusto mo: may mga puwang, may mga panaklong, may zero sa unahan o may tandang plus. Pareho ang pagbasa rito.',
    'phone.willStore': 'Iingatan ito bilang: {number}',
    'phone.whyCountry': 'Piliin ang bansang kinabibilangan ng numerong ito.',
    'phone.whyEmpty': 'Mag-type ng numero ng telepono.',
    'phone.whyLetters': 'Hindi maaaring magkaroon ng mga titik ang numero ng telepono.',
    'phone.whyPunctuation':
      'I-type ang mga digit ng numero. Sa ngayon ay mga tanda lamang ang narito.',
    'phone.whyPlus':
      'Hindi hihigit sa isa ang tandang plus sa isang numero, at sa simula lamang ito.',
    'phone.whyOtherCountry':
      'Nagsisimula ang numerong ito sa {begins}, at ang numero mula sa piniling bansa ay nagsisimula sa {dial}. Piliin ang bansang kinabibilangan ng numero.',
    'phone.whyLength':
      'Bilang ng digit ng numero mula sa bansang ito pagkatapos ng code ng bansa: {digits}. Bilang ng digit ng numerong ito: {count}',
    'phone.whyLengthRange':
      'Sa bansang ito, may dalawang hangganan ang bilang ng digit pagkatapos ng code ng bansa. Pinakakaunti: {min}. Pinakamarami: {max}. Sa numerong ito: {count}',
    'phone.whyTrunk':
      'Hindi binibilang ang digit na ito na isinusulat sa unahan ng numero: {digit}',
    'phone.whyNoDial':
      'Walang code na nakatala rito para sa bansang iyon, kaya hindi pa maiingatan ang numero mula roon.',
    'phone.save': 'I-save ang numero ko',
    'phone.update': 'Palitan ang numero ko',
    'phone.saving': 'Sine-save…',
    'phone.remove': 'Alisin ang numero ko',
    'phone.saved': 'Na-save na ang numero ng iyong telepono.',
    'phone.removed': 'Naalis na ang numero ng iyong telepono.',
    'phone.signedOut': 'Naka-sign out ka na. Mag-sign in muli, saka subukan muli. Walang nabago.',
    'phone.off': 'Hindi kinokolekta ang mga numero ng telepono sa ngayon. Walang nabago.',
    'phone.refused': 'Hindi tinanggap ng platform ang numerong ito. Walang nabago.',
    'phone.unconfirmed':
      'Walang dumating na sagot, kaya hindi alam kung nabago ang numero mo. I-reload ang pahinang ito upang makita kung ano ang iniingatan.',
    'phone.paused':
      'Hindi kinokolekta ang mga numero ng telepono sa ngayon. Iniingatan ang numero mo hanggang alisin mo ito.',
    'phone.foot':
      'Walang ipinapadala sa numerong ito: walang serbisyo ng pagmemensahe na nakakonekta sa platform na ito. Wala pa ring screen ng mga kawani na nagpapakita nito.',
  },
  uz: {
    'phone.heading': 'Telefon raqamingiz',
    'phone.lede':
      'U bitta shaklda saqlanadi: avval mamlakat kodi, keyin raqam. Shunda istalgan mamlakatdan qilingan qoʻngʻiroq oʻsha telefonga yetib boradi. Siz uni shu yerda koʻrasiz, platforma xodimlariga esa uni oʻqishga ruxsat berilgan.',
    'phone.storedAs': 'Shu shaklda saqlangan: {number}',
    'phone.country': 'Mamlakat',
    'phone.number': 'Telefon raqami',
    'phone.help':
      'Xohlaganingizdek yozing: boʻsh joylar bilan, qavslar bilan, boshida nol bilan yoki plyus belgisi bilan. Hammasi bir xil oʻqiladi.',
    'phone.willStore': 'Shu shaklda saqlanadi: {number}',
    'phone.whyCountry': 'Bu raqam tegishli boʻlgan mamlakatni tanlang.',
    'phone.whyEmpty': 'Telefon raqamini yozing.',
    'phone.whyLetters': 'Telefon raqamida harf boʻlishi mumkin emas.',
    'phone.whyPunctuation': 'Telefon raqamining sonlarini yozing. Hozircha faqat belgilar bor.',
    'phone.whyPlus': 'Raqamda plyus belgisi koʻpi bilan bitta boʻladi, u ham faqat boshida.',
    'phone.whyOtherCountry':
      'Bu raqamning boshlanishi: {begins}. Tanlangan mamlakat raqamlarining boshlanishi: {dial}. Raqam tegishli boʻlgan mamlakatni tanlang.',
    'phone.whyLength':
      'Bu mamlakat raqamida mamlakat kodidan keyingi xonalar soni: {digits}. Bu raqamdagi xonalar soni: {count}',
    'phone.whyLengthRange':
      'Bu mamlakatda mamlakat kodidan keyingi xonalar sonining ikki chegarasi bor. Eng kami: {min}. Eng koʻpi: {max}. Bu raqamda: {count}',
    'phone.whyTrunk': 'Raqam boshiga yoziladigan ushbu son hisobga olinmaydi: {digit}',
    'phone.whyNoDial':
      'Bu yerda oʻsha mamlakat uchun kod qayd etilmagan, shuning uchun u yerdagi raqamni hozircha saqlab boʻlmaydi.',
    'phone.save': 'Raqamimni saqlash',
    'phone.update': 'Raqamimni oʻzgartirish',
    'phone.saving': 'Saqlanmoqda…',
    'phone.remove': 'Raqamimni olib tashlash',
    'phone.saved': 'Telefon raqamingiz saqlandi.',
    'phone.removed': 'Telefon raqamingiz olib tashlandi.',
    'phone.signedOut':
      'Siz hisobdan chiqqansiz. Qayta kiring, soʻng yana urinib koʻring. Hech narsa oʻzgarmadi.',
    'phone.off': 'Hozircha telefon raqamlari yigʻilmayapti. Hech narsa oʻzgarmadi.',
    'phone.refused': 'Platforma bu raqamni qabul qilmadi. Hech narsa oʻzgarmadi.',
    'phone.unconfirmed':
      'Javob kelmadi, shuning uchun raqamingiz oʻzgargan-oʻzgarmagani nomaʼlum. Nima saqlanganini koʻrish uchun bu sahifani qayta yuklang.',
    'phone.paused':
      'Hozircha telefon raqamlari yigʻilmayapti. Raqamingiz uni olib tashlamaguningizcha saqlanadi.',
    'phone.foot':
      'Bu raqamga hech narsa yuborilmaydi: bu platformaga hech qanday xabar yuborish xizmati ulanmagan. Hozircha xodimlarning hech bir ekrani ham uni koʻrsatmaydi.',
  },
  kk: {
    'phone.heading': 'Телефон нөміріңіз',
    'phone.lede':
      'Ол бір ғана түрде сақталады: алдымен ел коды, содан кейін нөмір. Сонда кез келген елден жасалған қоңырау сол телефонға жетеді. Сіз оны осы жерден көресіз, ал платформа қызметкерлеріне оны оқуға рұқсат берілген.',
    'phone.storedAs': 'Осы түрде сақталған: {number}',
    'phone.country': 'Ел',
    'phone.number': 'Телефон нөмірі',
    'phone.help':
      'Қалағаныңызша жазыңыз: бос орындармен, жақшалармен, басында нөлмен немесе плюс таңбасымен. Бәрі бірдей оқылады.',
    'phone.willStore': 'Осы түрде сақталады: {number}',
    'phone.whyCountry': 'Осы нөмір тиесілі елді таңдаңыз.',
    'phone.whyEmpty': 'Телефон нөмірін жазыңыз.',
    'phone.whyLetters': 'Телефон нөмірінде әріп болмайды.',
    'phone.whyPunctuation': 'Нөмірдің цифрларын жазыңыз. Әзірге тек таңбалар бар.',
    'phone.whyPlus': 'Нөмірде плюс таңбасы ең көп дегенде біреу болады, ол да тек басында.',
    'phone.whyOtherCountry':
      'Бұл нөмірдің басы: {begins}. Таңдалған елдің нөмірлерінің басы: {dial}. Нөмір тиесілі елді таңдаңыз.',
    'phone.whyLength':
      'Бұл елдің нөмірінде ел кодынан кейінгі цифрлар саны: {digits}. Осы нөмірдегі цифрлар саны: {count}',
    'phone.whyLengthRange':
      'Бұл елде ел кодынан кейінгі цифрлар санының екі шегі бар. Ең азы: {min}. Ең көбі: {max}. Осы нөмірде: {count}',
    'phone.whyTrunk': 'Нөмірдің басына жазылатын мына цифр есептелмейді: {digit}',
    'phone.whyNoDial':
      'Ол ел үшін мұнда код тіркелмеген, сондықтан ол жақтың нөмірін әзірге сақтау мүмкін емес.',
    'phone.save': 'Нөмірімді сақтау',
    'phone.update': 'Нөмірімді өзгерту',
    'phone.saving': 'Сақталуда…',
    'phone.remove': 'Нөмірімді жою',
    'phone.saved': 'Телефон нөміріңіз сақталды.',
    'phone.removed': 'Телефон нөміріңіз жойылды.',
    'phone.signedOut':
      'Сіз жүйеден шығып кеткенсіз. Қайта кіріп, содан кейін қайталап көріңіз. Ештеңе өзгерген жоқ.',
    'phone.off': 'Қазір телефон нөмірлері жиналмайды. Ештеңе өзгерген жоқ.',
    'phone.refused': 'Платформа бұл нөмірді қабылдамады. Ештеңе өзгерген жоқ.',
    'phone.unconfirmed':
      'Жауап келмеді, сондықтан нөміріңіздің өзгерген-өзгермегені белгісіз. Не сақталғанын көру үшін осы бетті қайта жүктеңіз.',
    'phone.paused': 'Қазір телефон нөмірлері жиналмайды. Нөміріңіз оны өзіңіз жойғанша сақталады.',
    'phone.foot':
      'Бұл нөмірге ештеңе жіберілмейді: бұл платформаға ешқандай хабар алмасу қызметі қосылмаған. Әзірге қызметкерлердің ешбір экраны да оны көрсетпейді.',
  },
  az: {
    'phone.heading': 'Telefon nömrəniz',
    'phone.lede':
      'O, tək bir şəkildə saxlanılır: əvvəlcə ölkə kodu, sonra nömrə. Beləliklə, istənilən ölkədən edilən zəng eyni telefona çatır. Siz onu burada görürsünüz, platformanın əməkdaşlarına isə onu oxumağa icazə verilib.',
    'phone.storedAs': 'Bu şəkildə saxlanılıb: {number}',
    'phone.country': 'Ölkə',
    'phone.number': 'Telefon nömrəsi',
    'phone.help':
      'İstədiyiniz kimi yazın: boşluqlarla, mötərizələrlə, əvvəlində sıfırla və ya artı işarəsi ilə. Hamısı eyni cür oxunur.',
    'phone.willStore': 'Bu şəkildə saxlanılacaq: {number}',
    'phone.whyCountry': 'Bu nömrənin aid olduğu ölkəni seçin.',
    'phone.whyEmpty': 'Telefon nömrəsi yazın.',
    'phone.whyLetters': 'Telefon nömrəsində hərf ola bilməz.',
    'phone.whyPunctuation': 'Nömrənin rəqəmlərini yazın. Hələlik yalnız işarələr var.',
    'phone.whyPlus': 'Nömrədə ən çoxu bir artı işarəsi olur, o da yalnız əvvəlində.',
    'phone.whyOtherCountry':
      'Bu nömrənin əvvəli: {begins}. Seçilmiş ölkənin nömrələrinin əvvəli: {dial}. Nömrənin aid olduğu ölkəni seçin.',
    'phone.whyLength':
      'Bu ölkənin nömrəsində ölkə kodundan sonrakı rəqəmlərin sayı: {digits}. Bu nömrədəki rəqəmlərin sayı: {count}',
    'phone.whyLengthRange':
      'Bu ölkədə ölkə kodundan sonrakı rəqəmlərin sayının iki həddi var. Ən azı: {min}. Ən çoxu: {max}. Bu nömrədə: {count}',
    'phone.whyTrunk': 'Nömrənin əvvəlinə yazılan bu rəqəm sayılmır: {digit}',
    'phone.whyNoDial':
      'Həmin ölkə üçün burada kod qeydə alınmayıb, ona görə də oradan olan nömrəni hələlik saxlamaq mümkün deyil.',
    'phone.save': 'Nömrəmi yadda saxla',
    'phone.update': 'Nömrəmi dəyiş',
    'phone.saving': 'Yadda saxlanılır…',
    'phone.remove': 'Nömrəmi sil',
    'phone.saved': 'Telefon nömrəniz yadda saxlanıldı.',
    'phone.removed': 'Telefon nömrəniz silindi.',
    'phone.signedOut':
      'Hesabdan çıxmısınız. Yenidən daxil olun, sonra bir daha cəhd edin. Heç nə dəyişmədi.',
    'phone.off': 'Hazırda telefon nömrələri toplanmır. Heç nə dəyişmədi.',
    'phone.refused': 'Platforma bu nömrəni qəbul etmədi. Heç nə dəyişmədi.',
    'phone.unconfirmed':
      'Cavab gəlmədi, ona görə də nömrənizin dəyişib-dəyişmədiyi məlum deyil. Nəyin saxlanıldığını görmək üçün bu səhifəni yenidən yükləyin.',
    'phone.paused':
      'Hazırda telefon nömrələri toplanmır. Nömrəniz siz onu silənə qədər saxlanılır.',
    'phone.foot':
      'Bu nömrəyə heç nə göndərilmir: bu platformaya heç bir mesajlaşma xidməti qoşulmayıb. Hələlik əməkdaşların heç bir ekranı da onu göstərmir.',
  },
  tg: {
    'phone.heading': 'Рақами телефони шумо',
    'phone.lede':
      'Он дар як шакл нигоҳ дошта мешавад: аввал рамзи кишвар, баъд рақам. Ҳамин тавр занг аз ҳар кишвар ба ҳамон телефон мерасад. Шумо онро дар ин ҷо мебинед ва ба кормандони платформа иҷозати хондани он дода шудааст.',
    'phone.storedAs': 'Дар ин шакл нигоҳ дошта шудааст: {number}',
    'phone.country': 'Кишвар',
    'phone.number': 'Рақами телефон',
    'phone.help':
      'Ҳар тавре ки мехоҳед, нависед: бо фосилаҳо, бо қавсҳо, бо сифр дар аввал ё бо аломати ҷамъ. Ҳамааш як хел хонда мешавад.',
    'phone.willStore': 'Дар ин шакл нигоҳ дошта мешавад: {number}',
    'phone.whyCountry': 'Кишвареро интихоб кунед, ки ин рақам ба он тааллуқ дорад.',
    'phone.whyEmpty': 'Рақами телефонро нависед.',
    'phone.whyLetters': 'Дар рақами телефон ҳарф буда наметавонад.',
    'phone.whyPunctuation': 'Ададҳои рақамро нависед. Ҳоло танҳо аломатҳо ҳастанд.',
    'phone.whyPlus': 'Дар рақам аломати ҷамъ ҳадди аксар якто мешавад, он ҳам танҳо дар аввал.',
    'phone.whyOtherCountry':
      'Оғози ин рақам: {begins}. Оғози рақамҳои кишвари интихобшуда: {dial}. Кишвареро интихоб кунед, ки рақам ба он тааллуқ дорад.',
    'phone.whyLength':
      'Шумораи ададҳо дар рақами ин кишвар пас аз рамзи кишвар: {digits}. Шумораи ададҳо дар ин рақам: {count}',
    'phone.whyLengthRange':
      'Дар ин кишвар шумораи ададҳо пас аз рамзи кишвар ду ҳад дорад. Камтарин: {min}. Бештарин: {max}. Дар ин рақам: {count}',
    'phone.whyTrunk':
      'Ин адад, ки дар аввали рақам навишта мешавад, ҳисоб карда намешавад: {digit}',
    'phone.whyNoDial':
      'Барои он кишвар дар ин ҷо рамз сабт нашудааст, бинобар ин рақами он ҷоро ҳоло нигоҳ доштан мумкин нест.',
    'phone.save': 'Рақами маро нигоҳ доред',
    'phone.update': 'Рақами маро иваз кунед',
    'phone.saving': 'Нигоҳ дошта мешавад…',
    'phone.remove': 'Рақами маро нест кунед',
    'phone.saved': 'Рақами телефони шумо нигоҳ дошта шуд.',
    'phone.removed': 'Рақами телефони шумо нест карда шуд.',
    'phone.signedOut':
      'Шумо аз ҳисоб баромадаед. Аз нав ворид шавед, баъд бори дигар кӯшиш кунед. Ҳеҷ чиз тағйир наёфт.',
    'phone.off': 'Ҳоло рақамҳои телефон ҷамъ карда намешаванд. Ҳеҷ чиз тағйир наёфт.',
    'phone.refused': 'Платформа ин рақамро қабул накард. Ҳеҷ чиз тағйир наёфт.',
    'phone.unconfirmed':
      'Ҷавобе нарасид, бинобар ин маълум нест, ки рақами шумо тағйир ёфтааст ё не. Барои дидани он чи нигоҳ дошта шудааст, ин саҳифаро аз нав бор кунед.',
    'phone.paused':
      'Ҳоло рақамҳои телефон ҷамъ карда намешаванд. Рақами шумо то вақте ки онро нест накунед, нигоҳ дошта мешавад.',
    'phone.foot':
      'Ба ин рақам ҳеҷ чиз фиристода намешавад: ба ин платформа ягон хадамоти паёмрасонӣ пайваст нест. Ҳоло ягон экрани кормандон низ онро нишон намедиҳад.',
  },
  ky: {
    'phone.heading': 'Телефон номериңиз',
    'phone.lede':
      'Ал бир гана түрдө сакталат: адегенде өлкөнүн коду, андан кийин номер. Ошондо каалаган өлкөдөн чалынган чалуу ошол эле телефонго жетет. Сиз аны ушул жерден көрөсүз, ал эми платформанын кызматкерлерине аны окууга уруксат берилген.',
    'phone.storedAs': 'Ушул түрдө сакталган: {number}',
    'phone.country': 'Өлкө',
    'phone.number': 'Телефон номери',
    'phone.help':
      'Каалагандай жазыңыз: боштуктар менен, кашаалар менен, башында нөл менен же плюс белгиси менен. Баары бирдей окулат.',
    'phone.willStore': 'Ушул түрдө сакталат: {number}',
    'phone.whyCountry': 'Бул номер таандык болгон өлкөнү тандаңыз.',
    'phone.whyEmpty': 'Телефон номерин жазыңыз.',
    'phone.whyLetters': 'Телефон номеринде тамга болбойт.',
    'phone.whyPunctuation': 'Номердин цифраларын жазыңыз. Азырынча белгилер гана бар.',
    'phone.whyPlus': 'Номерде плюс белгиси эң көп дегенде бирөө болот, ал дагы башында гана.',
    'phone.whyOtherCountry':
      'Бул номердин башы: {begins}. Тандалган өлкөнүн номерлеринин башы: {dial}. Номер таандык болгон өлкөнү тандаңыз.',
    'phone.whyLength':
      'Бул өлкөнүн номеринде өлкөнүн кодунан кийинки цифралардын саны: {digits}. Бул номердеги цифралардын саны: {count}',
    'phone.whyLengthRange':
      'Бул өлкөдө өлкөнүн кодунан кийинки цифралардын санынын эки чеги бар. Эң азы: {min}. Эң көбү: {max}. Бул номерде: {count}',
    'phone.whyTrunk': 'Номердин башына жазылган бул цифра эсептелбейт: {digit}',
    'phone.whyNoDial':
      'Ал өлкө үчүн бул жерде код катталган эмес, ошондуктан ал жактын номерин азырынча сактоо мүмкүн эмес.',
    'phone.save': 'Номеримди сактоо',
    'phone.update': 'Номеримди өзгөртүү',
    'phone.saving': 'Сакталууда…',
    'phone.remove': 'Номеримди өчүрүү',
    'phone.saved': 'Телефон номериңиз сакталды.',
    'phone.removed': 'Телефон номериңиз өчүрүлдү.',
    'phone.signedOut':
      'Сиз аккаунттан чыгып калгансыз. Кайра кирип, анан дагы бир жолу аракет кылыңыз. Эч нерсе өзгөргөн жок.',
    'phone.off': 'Азыр телефон номерлери чогултулбайт. Эч нерсе өзгөргөн жок.',
    'phone.refused': 'Платформа бул номерди кабыл алган жок. Эч нерсе өзгөргөн жок.',
    'phone.unconfirmed':
      'Жооп келген жок, ошондуктан номериңиз өзгөргөнү же өзгөрбөгөнү белгисиз. Эмне сакталганын көрүү үчүн бул баракты кайра жүктөңүз.',
    'phone.paused':
      'Азыр телефон номерлери чогултулбайт. Номериңиз аны өзүңүз өчүргөнгө чейин сакталат.',
    'phone.foot':
      'Бул номерге эч нерсе жөнөтүлбөйт: бул платформага эч кандай билдирүү кызматы туташтырылган эмес. Азырынча кызматкерлердин эч бир экраны да аны көрсөтпөйт.',
  },
  tk: {
    'phone.heading': 'Telefon belgiňiz',
    'phone.lede':
      'Ol ýeke bir görnüşde saklanýar: ilki ýurduň kody, soň belgi. Şonda islendik ýurtdan edilen jaň şol bir telefona barýar. Siz ony şu ýerde görýärsiňiz, platformanyň işgärlerine bolsa ony okamaga rugsat berlen.',
    'phone.storedAs': 'Şu görnüşde saklanýar: {number}',
    'phone.country': 'Ýurt',
    'phone.number': 'Telefon belgisi',
    'phone.help':
      'Isleýşiňiz ýaly ýazyň: boşluklar bilen, ýaýlar bilen, başynda nol bilen ýa-da plýus nyşany bilen. Hemmesi birmeňzeş okalýar.',
    'phone.willStore': 'Şu görnüşde saklanar: {number}',
    'phone.whyCountry': 'Bu belginiň degişli ýurduny saýlaň.',
    'phone.whyEmpty': 'Telefon belgisini ýazyň.',
    'phone.whyLetters': 'Telefon belgisinde harp bolup bilmez.',
    'phone.whyPunctuation': 'Belginiň sanlaryny ýazyň. Häzirlikçe diňe nyşanlar bar.',
    'phone.whyPlus': 'Belgide plýus nyşany iň köp bolanda bir sany bolýar, ol hem diňe başynda.',
    'phone.whyOtherCountry':
      'Bu belginiň başy: {begins}. Saýlanan ýurduň belgileriniň başy: {dial}. Belginiň degişli ýurduny saýlaň.',
    'phone.whyLength':
      'Bu ýurduň belgisinde ýurduň kodundan soňky sanlaryň sany: {digits}. Bu belgidäki sanlaryň sany: {count}',
    'phone.whyLengthRange':
      'Bu ýurtda ýurduň kodundan soňky sanlaryň sanynyň iki çägi bar. Iň azy: {min}. Iň köpi: {max}. Bu belgide: {count}',
    'phone.whyTrunk': 'Belginiň başyna ýazylýan şu san hasaba alynmaýar: {digit}',
    'phone.whyNoDial':
      'Şol ýurt üçin bu ýerde kod bellige alynmandyr, şonuň üçin ol ýeriň belgisini häzirlikçe saklap bolmaýar.',
    'phone.save': 'Belgimi ýatda sakla',
    'phone.update': 'Belgimi üýtget',
    'phone.saving': 'Saklanýar…',
    'phone.remove': 'Belgimi aýyr',
    'phone.saved': 'Telefon belgiňiz ýatda saklandy.',
    'phone.removed': 'Telefon belgiňiz aýryldy.',
    'phone.signedOut':
      'Siz hasapdan çykypsyňyz. Täzeden giriň, soň ýene bir gezek synanyşyň. Hiç zat üýtgemedi.',
    'phone.off': 'Häzir telefon belgileri ýygnalmaýar. Hiç zat üýtgemedi.',
    'phone.refused': 'Platforma bu belgini kabul etmedi. Hiç zat üýtgemedi.',
    'phone.unconfirmed':
      'Jogap gelmedi, şonuň üçin belgiňiziň üýtgändigi ýa-da üýtgemändigi belli däl. Nämäniň saklanýandygyny görmek üçin bu sahypany täzeden ýükläň.',
    'phone.paused':
      'Häzir telefon belgileri ýygnalmaýar. Belgiňiz ony özüňiz aýyrýançaňyz saklanýar.',
    'phone.foot':
      'Bu belgä hiç zat iberilmeýär: bu platforma hiç hili habarlaşma hyzmaty birikdirilmändir. Häzirlikçe işgärleriň hiç bir ekrany hem ony görkezmeýär.',
  },
  ta: {
    'phone.heading': 'உங்கள் தொலைபேசி எண்',
    'phone.lede':
      'இது ஒரே வடிவத்தில் வைக்கப்படுகிறது: முதலில் நாட்டின் குறியீடு, பிறகு எண். இதனால் எந்த நாட்டிலிருந்து அழைத்தாலும் அதே தொலைபேசியை அழைப்பு சென்றடையும். நீங்கள் இதை இங்கே பார்க்கிறீர்கள்; தளத்தின் பணியாளர்களுக்கு இதைப் படிக்க அனுமதி உண்டு.',
    'phone.storedAs': 'இந்த வடிவத்தில் வைக்கப்பட்டுள்ளது: {number}',
    'phone.country': 'நாடு',
    'phone.number': 'தொலைபேசி எண்',
    'phone.help':
      'விரும்பியபடி எழுதுங்கள்: இடைவெளிகளுடன், அடைப்புக்குறிகளுடன், தொடக்கத்தில் பூஜ்யத்துடன் அல்லது கூட்டல் குறியுடன். எல்லாம் ஒரே மாதிரி படிக்கப்படும்.',
    'phone.willStore': 'இந்த வடிவத்தில் வைக்கப்படும்: {number}',
    'phone.whyCountry': 'இந்த எண் எந்த நாட்டைச் சேர்ந்ததோ அந்த நாட்டைத் தேர்ந்தெடுக்கவும்.',
    'phone.whyEmpty': 'தொலைபேசி எண்ணைத் தட்டச்சு செய்யவும்.',
    'phone.whyLetters': 'தொலைபேசி எண்ணில் எழுத்துகள் இருக்க முடியாது.',
    'phone.whyPunctuation':
      'எண்ணின் இலக்கங்களைத் தட்டச்சு செய்யவும். இதுவரை குறிகள் மட்டுமே உள்ளன.',
    'phone.whyPlus':
      'ஓர் எண்ணில் கூட்டல் குறி அதிகபட்சம் ஒன்றுதான் இருக்கும், அதுவும் தொடக்கத்தில் மட்டுமே.',
    'phone.whyOtherCountry':
      'இந்த எண்ணின் தொடக்கம்: {begins}. தேர்ந்தெடுத்த நாட்டின் எண்களின் தொடக்கம்: {dial}. எண் எந்த நாட்டைச் சேர்ந்ததோ அந்த நாட்டைத் தேர்ந்தெடுக்கவும்.',
    'phone.whyLength':
      'இந்த நாட்டின் எண்ணில் நாட்டின் குறியீட்டுக்குப் பிறகு உள்ள இலக்கங்களின் எண்ணிக்கை: {digits}. இந்த எண்ணில் உள்ள இலக்கங்களின் எண்ணிக்கை: {count}',
    'phone.whyLengthRange':
      'இந்த நாட்டில் நாட்டின் குறியீட்டுக்குப் பிறகு உள்ள இலக்கங்களின் எண்ணிக்கைக்கு இரண்டு வரம்புகள் உள்ளன. குறைந்தபட்சம்: {min}. அதிகபட்சம்: {max}. இந்த எண்ணில்: {count}',
    'phone.whyTrunk': 'எண்ணின் தொடக்கத்தில் எழுதப்படும் இந்த இலக்கம் கணக்கில் சேராது: {digit}',
    'phone.whyNoDial':
      'அந்த நாட்டுக்கான குறியீடு இங்கே பதிவில் இல்லை; ஆகவே அங்குள்ள எண்ணை இப்போது வைக்க முடியாது.',
    'phone.save': 'என் எண்ணைச் சேமி',
    'phone.update': 'என் எண்ணை மாற்று',
    'phone.saving': 'சேமிக்கப்படுகிறது…',
    'phone.remove': 'என் எண்ணை நீக்கு',
    'phone.saved': 'உங்கள் தொலைபேசி எண் சேமிக்கப்பட்டது.',
    'phone.removed': 'உங்கள் தொலைபேசி எண் நீக்கப்பட்டது.',
    'phone.signedOut':
      'நீங்கள் வெளியேறிவிட்டீர்கள். மீண்டும் உள்நுழைந்து, பிறகு மறுபடி முயலவும். எதுவும் மாறவில்லை.',
    'phone.off': 'தற்போது தொலைபேசி எண்கள் சேகரிக்கப்படுவதில்லை. எதுவும் மாறவில்லை.',
    'phone.refused': 'தளம் இந்த எண்ணை ஏற்கவில்லை. எதுவும் மாறவில்லை.',
    'phone.unconfirmed':
      'பதில் எதுவும் வரவில்லை; ஆகவே உங்கள் எண் மாறியதா என்பது தெரியவில்லை. எது வைக்கப்பட்டுள்ளது என்பதைப் பார்க்க இந்தப் பக்கத்தை மீண்டும் ஏற்றவும்.',
    'phone.paused':
      'தற்போது தொலைபேசி எண்கள் சேகரிக்கப்படுவதில்லை. நீங்கள் நீக்கும் வரை உங்கள் எண் வைக்கப்பட்டிருக்கும்.',
    'phone.foot':
      'இந்த எண்ணுக்கு எதுவும் அனுப்பப்படுவதில்லை: இந்தத் தளத்துடன் எந்தச் செய்தி அனுப்பும் சேவையும் இணைக்கப்படவில்லை. பணியாளர்களின் எந்தத் திரையும் இதை இன்னும் காட்டுவதில்லை.',
  },
  ne: {
    'phone.heading': 'तपाईंको फोन नम्बर',
    'phone.lede':
      'यो एउटै रूपमा राखिन्छ: पहिले देशको कोड, त्यसपछि नम्बर। यसले गर्दा जुनसुकै देशबाट गरिएको कल उही फोनमा पुग्छ। तपाईं यसलाई यहाँ देख्नुहुन्छ, र प्लेटफर्मका कर्मचारीलाई यो पढ्ने अनुमति छ।',
    'phone.storedAs': 'यस रूपमा राखिएको छ: {number}',
    'phone.country': 'देश',
    'phone.number': 'फोन नम्बर',
    'phone.help':
      'जसरी मन लाग्छ त्यसरी लेख्नुहोस्: खाली ठाउँसहित, कोष्ठकसहित, सुरुमा शून्यसहित वा जोड चिह्नसहित। सबै उही तरिकाले पढिन्छ।',
    'phone.willStore': 'यस रूपमा राखिनेछ: {number}',
    'phone.whyCountry': 'यो नम्बर जुन देशको हो, त्यो देश छान्नुहोस्।',
    'phone.whyEmpty': 'फोन नम्बर लेख्नुहोस्।',
    'phone.whyLetters': 'फोन नम्बरमा अक्षर हुन सक्दैन।',
    'phone.whyPunctuation': 'नम्बरका अङ्कहरू लेख्नुहोस्। अहिलेसम्म चिह्न मात्र छन्।',
    'phone.whyPlus': 'नम्बरमा जोड चिह्न बढीमा एउटा हुन्छ, त्यो पनि सुरुमा मात्र।',
    'phone.whyOtherCountry':
      'यो नम्बरको सुरु: {begins}। छानिएको देशका नम्बरहरूको सुरु: {dial}। नम्बर जुन देशको हो, त्यो देश छान्नुहोस्।',
    'phone.whyLength':
      'यस देशको नम्बरमा देशको कोडपछिका अङ्कहरूको सङ्ख्या: {digits}। यो नम्बरमा भएका अङ्कहरूको सङ्ख्या: {count}',
    'phone.whyLengthRange':
      'यस देशमा देशको कोडपछिका अङ्कहरूको सङ्ख्याका दुई सीमा छन्। कम्तीमा: {min}। बढीमा: {max}। यो नम्बरमा: {count}',
    'phone.whyTrunk': 'नम्बरको सुरुमा लेखिने यो अङ्क गनिँदैन: {digit}',
    'phone.whyNoDial':
      'त्यो देशका लागि यहाँ कुनै कोड दर्ता गरिएको छैन, त्यसैले त्यहाँको नम्बर अहिले राख्न सकिँदैन।',
    'phone.save': 'मेरो नम्बर सुरक्षित गर्नुहोस्',
    'phone.update': 'मेरो नम्बर बदल्नुहोस्',
    'phone.saving': 'सुरक्षित गरिँदै छ…',
    'phone.remove': 'मेरो नम्बर हटाउनुहोस्',
    'phone.saved': 'तपाईंको फोन नम्बर सुरक्षित गरियो।',
    'phone.removed': 'तपाईंको फोन नम्बर हटाइयो।',
    'phone.signedOut':
      'तपाईं साइन आउट हुनुभएको छ। फेरि साइन इन गर्नुहोस्, अनि फेरि प्रयास गर्नुहोस्। केही पनि बदलिएन।',
    'phone.off': 'अहिले फोन नम्बरहरू सङ्कलन गरिँदैनन्। केही पनि बदलिएन।',
    'phone.refused': 'प्लेटफर्मले यो नम्बर स्वीकार गरेन। केही पनि बदलिएन।',
    'phone.unconfirmed':
      'कुनै जवाफ आएन, त्यसैले तपाईंको नम्बर बदलियो कि बदलिएन थाहा छैन। के राखिएको छ भनी हेर्न यो पृष्ठ फेरि लोड गर्नुहोस्।',
    'phone.paused': 'अहिले फोन नम्बरहरू सङ्कलन गरिँदैनन्। तपाईंले नहटाएसम्म तपाईंको नम्बर राखिन्छ।',
    'phone.foot':
      'यो नम्बरमा केही पनि पठाइँदैन: यस प्लेटफर्ममा कुनै सन्देश सेवा जोडिएको छैन। कर्मचारीको कुनै पनि स्क्रिनले अहिलेसम्म यसलाई देखाउँदैन।',
  },
};
