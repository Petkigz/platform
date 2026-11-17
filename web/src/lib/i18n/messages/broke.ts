import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The page for a page that broke (`app/error.tsx`).
 *
 * Same rule as `missing.ts`: written for the twenty-seven languages with
 * nothing held in `held.ts`, and for no other. See `UNWRITTEN_WHILE_HELD`.
 *
 * **Unlike those parts, this one is sent with every page.** The page that
 * shows it is drawn in the browser, after something has already gone wrong,
 * and cannot ask a server for its words. So these ten sentences are in what
 * every page carries, and a reader pays for them without seeing them. That
 * is the price of a broken page that still speaks the reader's language.
 *
 * **Who reads it.** Somebody who did nothing wrong, possibly in the middle
 * of paying or of a lesson. The sentences take the blame, say where the true
 * state of an order is, and say how a recording's place is kept. "About every
 * ten seconds" is what the player does; no sentence promises that nothing was
 * lost.
 *
 * `{code}` is the server's own id for the failure and comes last in every
 * language. `broke.help` is the same words as `missing.help`.
 *
 * **Unreviewed.** No speaker has read any of these.
 */
export const BROKE: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'broke.eyebrow': 'حدث عطل',
    'broke.heading': 'توقفت هذه الصفحة عن العمل',
    'broke.lede': 'هذا خلل من جانبنا وليس خطأ منك. إعادة المحاولة تنجح في كثير من الأحيان.',
    'broke.reference': 'إذا تكرر ذلك فاذكر هذا المرجع عند طلب المساعدة: {code}',
    'broke.retry': 'جرّب هذه الصفحة مرة أخرى',
    'broke.help': 'اطلب المساعدة',
    'broke.payHead': 'تحقّق قبل أن تدفع مرة أخرى.',
    'broke.pay':
      'الطلب الذي لم يكتمل مدرج في صفحة طلباتك بحالته الفعلية. تلك الصفحة هي السجل المعتمد، لا هذه.',
    'broke.orders': 'طلباتك',
    'broke.lesson':
      'إذا كنت تشاهد درسًا فسيُستأنف من آخر موضع حُفظ. يُحفظ موضعك كل عشر ثوانٍ تقريبًا أثناء تشغيل التسجيل.',
  },
  ur: {
    'broke.eyebrow': 'کچھ خرابی ہوئی',
    'broke.heading': 'یہ صفحہ کام کرنا چھوڑ گیا',
    'broke.lede':
      'یہ ہماری طرف کی خرابی ہے، آپ کی غلطی نہیں۔ دوبارہ کوشش کرنا اکثر کام کر جاتا ہے۔',
    'broke.reference': 'اگر ایسا بار بار ہو تو مدد مانگتے وقت یہ حوالہ بتائیں: {code}',
    'broke.retry': 'یہ صفحہ دوبارہ آزمائیں',
    'broke.help': 'مدد مانگیں',
    'broke.payHead': 'دوبارہ ادائیگی سے پہلے جانچ لیں۔',
    'broke.pay':
      'جو آرڈر مکمل نہیں ہوا وہ آپ کے آرڈرز کے صفحے پر اپنی اصل حالت کے ساتھ درج ہے۔ ریکارڈ وہ صفحہ ہے، یہ نہیں۔',
    'broke.orders': 'آپ کے آرڈرز',
    'broke.lesson':
      'اگر آپ کوئی سبق دیکھ رہے تھے تو وہ آخری محفوظ شدہ مقام سے دوبارہ شروع ہوگا۔ ریکارڈنگ چلتے وقت آپ کا مقام تقریباً ہر دس سیکنڈ بعد محفوظ ہوتا ہے۔',
  },
  fa: {
    'broke.eyebrow': 'مشکلی پیش آمد',
    'broke.heading': 'این صفحه از کار افتاد',
    'broke.lede': 'این ایراد از سمت ماست، نه اشتباه شما. تلاش دوباره اغلب جواب می‌دهد.',
    'broke.reference': 'اگر باز هم تکرار شد، هنگام درخواست کمک این کد مرجع را ذکر کنید: {code}',
    'broke.retry': 'این صفحه را دوباره امتحان کنید',
    'broke.help': 'کمک بخواهید',
    'broke.payHead': 'پیش از پرداخت دوباره بررسی کنید.',
    'broke.pay':
      'سفارشی که کامل نشده با وضعیت واقعی‌اش در صفحهٔ سفارش‌های شما فهرست شده است. مرجع همان صفحه است، نه این صفحه.',
    'broke.orders': 'سفارش‌های شما',
    'broke.lesson':
      'اگر در حال تماشای درسی بودید، از آخرین جایی که ذخیره شده ادامه پیدا می‌کند. هنگام پخش، جای شما تقریباً هر ده ثانیه ذخیره می‌شود.',
  },
  'fa-af': {
    'broke.eyebrow': 'مشکلی پیش آمد',
    'broke.heading': 'این صفحه از کار افتاد',
    'broke.lede': 'این مشکل از طرف ماست، نه اشتباه شما. کوشش دوباره اغلب نتیجه می‌دهد.',
    'broke.reference': 'اگر باز هم تکرار شد، هنگام درخواست کمک این کد مرجع را ذکر کنید: {code}',
    'broke.retry': 'این صفحه را دوباره امتحان کنید',
    'broke.help': 'کمک بخواهید',
    'broke.payHead': 'پیش از پرداخت دوباره بررسی کنید.',
    'broke.pay':
      'فرمایشی که تکمیل نشده با وضعیت واقعی‌اش در صفحهٔ فرمایش‌های شما فهرست شده است. مرجع همان صفحه است، نه این صفحه.',
    'broke.orders': 'فرمایش‌های شما',
    'broke.lesson':
      'اگر در حال تماشای درسی بودید، از آخرین جایی که ذخیره شده ادامه پیدا می‌کند. هنگام پخش، جای شما تقریباً هر ده ثانیه ذخیره می‌شود.',
  },
  tr: {
    'broke.eyebrow': 'Bir şey bozuldu',
    'broke.heading': 'Bu sayfa çalışmayı durdurdu',
    'broke.lede':
      'Bu sizin hatanız değil, bizim tarafımızdaki bir arıza. Yeniden denemek çoğu zaman işe yarar.',
    'broke.reference': 'Sürekli oluyorsa yardım isterken şu referansı belirtin: {code}',
    'broke.retry': 'Bu sayfayı yeniden dene',
    'broke.help': 'Yardım isteyin',
    'broke.payHead': 'Yeniden ödeme yapmadan önce kontrol edin.',
    'broke.pay':
      'Tamamlanmayan bir sipariş, gerçek durumuyla siparişleriniz sayfasında listelenir. Kayıt bu sayfa değil, o sayfadır.',
    'broke.orders': 'Siparişleriniz',
    'broke.lesson':
      'Bir ders izliyorduysanız, son kaydedilen yerden devam eder. Kayıt oynarken yeriniz yaklaşık on saniyede bir kaydedilir.',
  },
  id: {
    'broke.eyebrow': 'Ada yang rusak',
    'broke.heading': 'Halaman ini berhenti berfungsi',
    'broke.lede':
      'Ini kesalahan di pihak kami, bukan kesalahan Anda. Mencoba lagi sering kali berhasil.',
    'broke.reference': 'Jika terus terjadi, sebutkan kode rujukan ini saat meminta bantuan: {code}',
    'broke.retry': 'Coba halaman ini lagi',
    'broke.help': 'Minta bantuan',
    'broke.payHead': 'Periksa dulu sebelum membayar lagi.',
    'broke.pay':
      'Pesanan yang belum selesai tercantum di halaman pesanan Anda dengan status sebenarnya. Halaman itulah catatannya, bukan halaman ini.',
    'broke.orders': 'Pesanan Anda',
    'broke.lesson':
      'Jika Anda sedang menonton pelajaran, pelajaran itu dilanjutkan dari posisi terakhir yang tersimpan. Posisi Anda disimpan kira-kira setiap sepuluh detik selama rekaman diputar.',
  },
  ms: {
    'broke.eyebrow': 'Ada sesuatu yang rosak',
    'broke.heading': 'Halaman ini berhenti berfungsi',
    'broke.lede':
      'Ini kerosakan di pihak kami, bukan kesilapan anda. Mencuba semula sering kali berjaya.',
    'broke.reference':
      'Jika ia terus berlaku, nyatakan kod rujukan ini apabila meminta bantuan: {code}',
    'broke.retry': 'Cuba halaman ini semula',
    'broke.help': 'Minta bantuan',
    'broke.payHead': 'Semak dahulu sebelum membayar semula.',
    'broke.pay':
      'Pesanan yang belum selesai disenaraikan di halaman pesanan anda dengan status sebenarnya. Halaman itulah rekodnya, bukan halaman ini.',
    'broke.orders': 'Pesanan anda',
    'broke.lesson':
      'Jika anda sedang menonton pelajaran, ia disambung dari kedudukan terakhir yang disimpan. Kedudukan anda disimpan kira-kira setiap sepuluh saat semasa rakaman dimainkan.',
  },
  bn: {
    'broke.eyebrow': 'কিছু একটা বিগড়ে গেছে',
    'broke.heading': 'এই পৃষ্ঠাটি কাজ করা বন্ধ করেছে',
    'broke.lede': 'এটি আমাদের দিকের ত্রুটি, আপনার ভুল নয়। আবার চেষ্টা করলে প্রায়ই কাজ হয়।',
    'broke.reference': 'বারবার এমন হলে সাহায্য চাওয়ার সময় এই রেফারেন্সটি জানান: {code}',
    'broke.retry': 'এই পৃষ্ঠাটি আবার চেষ্টা করুন',
    'broke.help': 'সাহায্য চান',
    'broke.payHead': 'আবার অর্থ পরিশোধের আগে যাচাই করুন।',
    'broke.pay':
      'যে অর্ডার সম্পূর্ণ হয়নি সেটি আপনার অর্ডারের পৃষ্ঠায় তার প্রকৃত অবস্থাসহ তালিকাভুক্ত আছে। রেকর্ড ওই পৃষ্ঠাটিই, এটি নয়।',
    'broke.orders': 'আপনার অর্ডার',
    'broke.lesson':
      'আপনি কোনো পাঠ দেখছিলেন হলে, সেটি সর্বশেষ সংরক্ষিত জায়গা থেকে আবার শুরু হবে। রেকর্ডিং চলার সময় আপনার জায়গা প্রায় প্রতি দশ সেকেন্ডে সংরক্ষিত হয়।',
  },
  hi: {
    'broke.eyebrow': 'कुछ गड़बड़ हो गई',
    'broke.heading': 'इस पेज ने काम करना बंद कर दिया',
    'broke.lede':
      'यह हमारी ओर की ख़राबी है, आपकी ग़लती नहीं। दोबारा कोशिश करने से अक्सर काम बन जाता है।',
    'broke.reference': 'अगर ऐसा बार-बार हो, तो मदद माँगते समय यह संदर्भ बताएँ: {code}',
    'broke.retry': 'यह पेज फिर आज़माएँ',
    'broke.help': 'मदद माँगें',
    'broke.payHead': 'दोबारा भुगतान करने से पहले जाँच लें।',
    'broke.pay':
      'जो ऑर्डर पूरा नहीं हुआ, वह आपके ऑर्डर वाले पेज पर अपनी असली स्थिति के साथ दर्ज है। रिकॉर्ड वही पेज है, यह नहीं।',
    'broke.orders': 'आपके ऑर्डर',
    'broke.lesson':
      'अगर आप कोई पाठ देख रहे थे, तो वह आख़िरी सहेजी गई जगह से फिर शुरू होगा। रिकॉर्डिंग चलते समय आपकी जगह लगभग हर दस सेकंड में सहेजी जाती है।',
  },
  fr: {
    'broke.eyebrow': 'Une panne s’est produite',
    'broke.heading': 'Cette page a cessé de fonctionner',
    'broke.lede':
      'C’est une défaillance de notre côté, pas une erreur de votre part. Réessayer suffit souvent.',
    'broke.reference':
      'Si cela se reproduit, indiquez cette référence en demandant de l’aide : {code}',
    'broke.retry': 'Réessayer cette page',
    'broke.help': 'Demander de l’aide',
    'broke.payHead': 'Vérifiez avant de payer de nouveau.',
    'broke.pay':
      'Une commande qui n’a pas abouti figure sur la page de vos commandes avec son état réel. C’est cette page-là qui fait foi, pas celle-ci.',
    'broke.orders': 'Vos commandes',
    'broke.lesson':
      'Si vous regardiez une leçon, elle reprendra au dernier point enregistré. Votre position est enregistrée environ toutes les dix secondes pendant la lecture.',
  },
  es: {
    'broke.eyebrow': 'Algo ha fallado',
    'broke.heading': 'Esta página ha dejado de funcionar',
    'broke.lede': 'Es un fallo nuestro, no un error tuyo. Volver a intentarlo suele funcionar.',
    'broke.reference': 'Si sigue ocurriendo, indica esta referencia al pedir ayuda: {code}',
    'broke.retry': 'Probar esta página de nuevo',
    'broke.help': 'Pedir ayuda',
    'broke.payHead': 'Comprueba antes de volver a pagar.',
    'broke.pay':
      'Un pedido que no se completó aparece en la página de tus pedidos con su estado real. Esa página es el registro, no esta.',
    'broke.orders': 'Tus pedidos',
    'broke.lesson':
      'Si estabas viendo una lección, se reanuda desde el último punto guardado. Tu posición se guarda aproximadamente cada diez segundos mientras se reproduce una grabación.',
  },
  pt: {
    'broke.eyebrow': 'Algo falhou',
    'broke.heading': 'Esta página deixou de funcionar',
    'broke.lede': 'É uma falha do nosso lado, não um erro seu. Tentar de novo costuma resultar.',
    'broke.reference': 'Se continuar a acontecer, indique esta referência ao pedir ajuda: {code}',
    'broke.retry': 'Tentar esta página de novo',
    'broke.help': 'Pedir ajuda',
    'broke.payHead': 'Verifique antes de pagar outra vez.',
    'broke.pay':
      'Uma encomenda que não foi concluída aparece na página das suas encomendas com o estado real. Essa página é o registo, não esta.',
    'broke.orders': 'As suas encomendas',
    'broke.lesson':
      'Se estava a ver uma aula, ela retoma a partir do último ponto guardado. A sua posição é guardada cerca de dez em dez segundos enquanto uma gravação é reproduzida.',
  },
  sw: {
    'broke.eyebrow': 'Kuna kitu kimeharibika',
    'broke.heading': 'Ukurasa huu umeacha kufanya kazi',
    'broke.lede': 'Hili ni hitilafu upande wetu, si kosa lako. Kujaribu tena mara nyingi husaidia.',
    'broke.reference': 'Likiendelea kutokea, taja rejeo hili unapoomba msaada: {code}',
    'broke.retry': 'Jaribu ukurasa huu tena',
    'broke.help': 'Omba msaada',
    'broke.payHead': 'Hakikisha kabla ya kulipa tena.',
    'broke.pay':
      'Agizo ambalo halikukamilika limeorodheshwa kwenye ukurasa wa maagizo yako likiwa na hali yake halisi. Ukurasa huo ndio kumbukumbu, si huu.',
    'broke.orders': 'Maagizo yako',
    'broke.lesson':
      'Ikiwa ulikuwa ukitazama kipindi, kitaendelea kutoka mahali palipohifadhiwa mwisho. Mahali pako huhifadhiwa takriban kila sekunde kumi rekodi inapocheza.',
  },
  af: {
    'broke.eyebrow': 'Iets het gebreek',
    'broke.heading': 'Hierdie bladsy het opgehou werk',
    'broke.lede':
      'Dit is ’n fout aan ons kant, nie ’n fout wat jy gemaak het nie. Om weer te probeer werk dikwels.',
    'broke.reference': 'As dit aanhou gebeur, gee hierdie verwysing wanneer jy hulp vra: {code}',
    'broke.retry': 'Probeer hierdie bladsy weer',
    'broke.help': 'Vra hulp',
    'broke.payHead': 'Kontroleer voordat jy weer betaal.',
    'broke.pay':
      '’n Bestelling wat nie klaargemaak het nie, word op jou bestellingsbladsy gelys met sy werklike status. Daardie bladsy is die rekord, nie hierdie een nie.',
    'broke.orders': 'Jou bestellings',
    'broke.lesson':
      'As jy ’n les gekyk het, hervat dit vanaf die plek wat laas gestoor is. Jou plek word omtrent elke tien sekondes gestoor terwyl ’n opname speel.',
  },
  'zh-hans': {
    'broke.eyebrow': '出了点问题',
    'broke.heading': '此页面已停止工作',
    'broke.lede': '这是我们这边的故障，不是您的失误。重试通常会有效。',
    'broke.reference': '如果反复出现，请在求助时提供此参考编号：{code}',
    'broke.retry': '重试此页面',
    'broke.help': '寻求帮助',
    'broke.payHead': '再次付款前请先核对。',
    'broke.pay': '未完成的订单会连同其真实状态列在您的订单页面上。以那个页面为准，而不是本页。',
    'broke.orders': '您的订单',
    'broke.lesson': '如果您当时正在观看课程，它会从上次保存的位置继续。播放录制内容时，您的位置大约每十秒保存一次。',
  },
  'zh-hant': {
    'broke.eyebrow': '出了點問題',
    'broke.heading': '此頁面已停止運作',
    'broke.lede': '這是我們這邊的故障，不是您的失誤。重試通常會有效。',
    'broke.reference': '如果反覆出現，請在求助時提供此參考編號：{code}',
    'broke.retry': '重試此頁面',
    'broke.help': '尋求協助',
    'broke.payHead': '再次付款前請先核對。',
    'broke.pay': '未完成的訂單會連同其真實狀態列在您的訂單頁面上。以那個頁面為準，而不是本頁。',
    'broke.orders': '您的訂單',
    'broke.lesson': '如果您當時正在觀看課程，它會從上次儲存的位置繼續。播放錄製內容時，您的位置大約每十秒儲存一次。',
  },
  vi: {
    'broke.eyebrow': 'Đã có sự cố',
    'broke.heading': 'Trang này đã ngừng hoạt động',
    'broke.lede': 'Đây là lỗi từ phía chúng tôi, không phải do bạn. Thử lại thường sẽ được.',
    'broke.reference': 'Nếu vẫn tiếp diễn, hãy nêu mã tham chiếu này khi yêu cầu trợ giúp: {code}',
    'broke.retry': 'Thử lại trang này',
    'broke.help': 'Yêu cầu trợ giúp',
    'broke.payHead': 'Hãy kiểm tra trước khi thanh toán lại.',
    'broke.pay':
      'Đơn hàng chưa hoàn tất được liệt kê trên trang đơn hàng của bạn cùng trạng thái thực của nó. Trang đó mới là bản ghi chính thức, không phải trang này.',
    'broke.orders': 'Đơn hàng của bạn',
    'broke.lesson':
      'Nếu bạn đang xem một bài học, bài học sẽ tiếp tục từ vị trí được lưu gần nhất. Vị trí của bạn được lưu khoảng mười giây một lần khi bản ghi đang phát.',
  },
  th: {
    'broke.eyebrow': 'มีบางอย่างขัดข้อง',
    'broke.heading': 'หน้านี้หยุดทำงาน',
    'broke.lede': 'นี่เป็นข้อบกพร่องจากฝั่งเรา ไม่ใช่ความผิดพลาดของคุณ การลองอีกครั้งมักได้ผล',
    'broke.reference': 'หากยังเกิดขึ้นอีก โปรดแจ้งรหัสอ้างอิงนี้เมื่อขอความช่วยเหลือ: {code}',
    'broke.retry': 'ลองหน้านี้อีกครั้ง',
    'broke.help': 'ขอความช่วยเหลือ',
    'broke.payHead': 'ตรวจสอบก่อนชำระเงินอีกครั้ง',
    'broke.pay':
      'คำสั่งซื้อที่ยังไม่เสร็จสิ้นจะแสดงในหน้าคำสั่งซื้อของคุณพร้อมสถานะจริง หน้านั้นคือบันทึกที่ถือเป็นหลัก ไม่ใช่หน้านี้',
    'broke.orders': 'คำสั่งซื้อของคุณ',
    'broke.lesson':
      'หากคุณกำลังดูบทเรียนอยู่ บทเรียนจะเล่นต่อจากตำแหน่งที่บันทึกไว้ล่าสุด ตำแหน่งของคุณจะถูกบันทึกประมาณทุกสิบวินาทีขณะเล่นสื่อบันทึก',
  },
  fil: {
    'broke.eyebrow': 'May nasira',
    'broke.heading': 'Huminto sa paggana ang pahinang ito',
    'broke.lede':
      'Sira ito sa panig namin, hindi pagkakamali mo. Madalas gumagana ang pagsubok muli.',
    'broke.reference':
      'Kung paulit-ulit itong mangyari, ibigay ang reference na ito kapag humingi ka ng tulong: {code}',
    'broke.retry': 'Subukang muli ang pahinang ito',
    'broke.help': 'Humingi ng tulong',
    'broke.payHead': 'Suriin muna bago magbayad muli.',
    'broke.pay':
      'Ang order na hindi natapos ay nakalista sa pahina ng iyong mga order kasama ang tunay nitong status. Ang pahinang iyon ang talaan, hindi ito.',
    'broke.orders': 'Ang iyong mga order',
    'broke.lesson':
      'Kung nanonood ka ng aralin, magpapatuloy ito mula sa huling na-save na bahagi. Sine-save ang iyong puwesto humigit-kumulang bawat sampung segundo habang tumutugtog ang recording.',
  },
  uz: {
    'broke.eyebrow': 'Nimadir buzildi',
    'broke.heading': 'Bu sahifa ishlamay qoldi',
    'broke.lede':
      'Bu sizning xatoyingiz emas, biz tomondagi nosozlik. Qayta urinish koʻpincha yordam beradi.',
    'broke.reference': 'Agar takrorlanaversa, yordam soʻraganda shu havola kodini ayting: {code}',
    'broke.retry': 'Bu sahifani qayta sinab koʻrish',
    'broke.help': 'Yordam soʻrash',
    'broke.payHead': 'Qayta toʻlashdan oldin tekshiring.',
    'broke.pay':
      'Yakunlanmagan buyurtma buyurtmalaringiz sahifasida haqiqiy holati bilan koʻrsatilgan. Asosiy qayd shu sahifa emas, oʻsha sahifadir.',
    'broke.orders': 'Buyurtmalaringiz',
    'broke.lesson':
      'Agar dars tomosha qilayotgan boʻlsangiz, u oxirgi saqlangan joydan davom etadi. Yozuv ijro etilayotganda joyingiz taxminan har oʻn soniyada saqlanadi.',
  },
  kk: {
    'broke.eyebrow': 'Бірдеңе бұзылды',
    'broke.heading': 'Бұл бет жұмыс істемей қалды',
    'broke.lede': 'Бұл сіздің қатеңіз емес, біздің тараптағы ақау. Қайталап көру жиі көмектеседі.',
    'broke.reference': 'Егер қайталана берсе, көмек сұрағанда осы анықтама кодын айтыңыз: {code}',
    'broke.retry': 'Бұл бетті қайта байқап көру',
    'broke.help': 'Көмек сұрау',
    'broke.payHead': 'Қайта төлемес бұрын тексеріңіз.',
    'broke.pay':
      'Аяқталмаған тапсырыс тапсырыстарыңыз бетінде нақты күйімен көрсетілген. Негізгі жазба — осы бет емес, сол бет.',
    'broke.orders': 'Тапсырыстарыңыз',
    'broke.lesson':
      'Егер сабақ көріп отырған болсаңыз, ол соңғы сақталған жерден жалғасады. Жазба ойнап тұрғанда орныңыз шамамен әр он секунд сайын сақталады.',
  },
  az: {
    'broke.eyebrow': 'Nəsə xarab oldu',
    'broke.heading': 'Bu səhifə işləməyi dayandırdı',
    'broke.lede':
      'Bu sizin səhviniz deyil, bizim tərəfdəki nasazlıqdır. Yenidən cəhd etmək çox vaxt kömək edir.',
    'broke.reference': 'Təkrarlanarsa, kömək istəyərkən bu istinad kodunu bildirin: {code}',
    'broke.retry': 'Bu səhifəni yenidən sına',
    'broke.help': 'Kömək istəyin',
    'broke.payHead': 'Yenidən ödəməzdən əvvəl yoxlayın.',
    'broke.pay':
      'Tamamlanmamış sifariş sifarişləriniz səhifəsində həqiqi vəziyyəti ilə göstərilir. Əsas qeyd bu səhifə deyil, həmin səhifədir.',
    'broke.orders': 'Sifarişləriniz',
    'broke.lesson':
      'Dərsə baxırdınızsa, o, sonuncu yadda saxlanılan yerdən davam edəcək. Yazı oxunarkən yeriniz təxminən hər on saniyədən bir yadda saxlanılır.',
  },
  tg: {
    'broke.eyebrow': 'Чизе вайрон шуд',
    'broke.heading': 'Ин саҳифа аз кор монд',
    'broke.lede':
      'Ин носозӣ аз ҷониби мост, на хатои шумо. Кӯшиши дубора аксар вақт натиҷа медиҳад.',
    'broke.reference':
      'Агар такрор шавад, ҳангоми дархости кумак ин рамзи истинодро зикр кунед: {code}',
    'broke.retry': 'Ин саҳифаро дубора санҷед',
    'broke.help': 'Кӯмак пурсед',
    'broke.payHead': 'Пеш аз пардохти дубора санҷед.',
    'broke.pay':
      'Фармоише, ки анҷом наёфтааст, дар саҳифаи фармоишҳои шумо бо ҳолати воқеиаш нишон дода шудааст. Сабти асосӣ ҳамон саҳифа аст, на ин саҳифа.',
    'broke.orders': 'Фармоишҳои шумо',
    'broke.lesson':
      'Агар шумо дарсро тамошо мекардед, он аз ҷойи охирини нигоҳдошташуда идома меёбад. Ҳангоми пахши сабт ҷойи шумо тақрибан ҳар даҳ сония нигоҳ дошта мешавад.',
  },
  ky: {
    'broke.eyebrow': 'Бир нерсе бузулду',
    'broke.heading': 'Бул барак иштебей калды',
    'broke.lede':
      'Бул сиздин катаңыз эмес, биз тараптагы бузулуу. Кайра аракет кылуу көп учурда жардам берет.',
    'broke.reference': 'Эгер кайталана берсе, жардам сураганда ушул шилтеме кодун айтыңыз: {code}',
    'broke.retry': 'Бул баракты кайра сынап көрүү',
    'broke.help': 'Жардам суроо',
    'broke.payHead': 'Кайра төлөөдөн мурун текшериңиз.',
    'broke.pay':
      'Аягына чыкпаган буйрутма буйрутмаларыңыз барагында чыныгы абалы менен көрсөтүлгөн. Негизги жазуу бул барак эмес, ошол барак.',
    'broke.orders': 'Буйрутмаларыңыз',
    'broke.lesson':
      'Эгер сабак көрүп жаткан болсоңуз, ал акыркы сакталган жерден улантылат. Жазуу ойноп жатканда ордуңуз болжол менен ар бир он секундда сакталат.',
  },
  tk: {
    'broke.eyebrow': 'Bir zat bozuldy',
    'broke.heading': 'Bu sahypa işlemegini bes etdi',
    'broke.lede':
      'Bu siziň ýalňyşyňyz däl, biziň tarapymyzdaky näsazlyk. Täzeden synanyşmak köplenç kömek edýär.',
    'broke.reference':
      'Eger gaýtalanyp dursa, kömek soranyňyzda şu salgylanma belgisini aýdyň: {code}',
    'broke.retry': 'Bu sahypany täzeden synap gör',
    'broke.help': 'Kömek soraň',
    'broke.payHead': 'Täzeden tölemezden öň barlaň.',
    'broke.pay':
      'Tamamlanmadyk sargyt sargytlaryňyz sahypasynda hakyky ýagdaýy bilen görkezilýär. Esasy ýazgy bu sahypa däl, şol sahypadyr.',
    'broke.orders': 'Sargytlaryňyz',
    'broke.lesson':
      'Eger sapaga tomaşa edýän bolsaňyz, ol soňky saklanan ýerden dowam eder. Ýazgy oýnalýan wagty ýeriňiz takmynan her on sekuntda saklanýar.',
  },
  ta: {
    'broke.eyebrow': 'ஏதோ பழுதாகிவிட்டது',
    'broke.heading': 'இந்தப் பக்கம் செயல்படுவதை நிறுத்திவிட்டது',
    'broke.lede':
      'இது எங்கள் தரப்பில் ஏற்பட்ட பழுது, உங்கள் தவறு அல்ல. மீண்டும் முயன்றால் பெரும்பாலும் சரியாகிவிடும்.',
    'broke.reference':
      'இது தொடர்ந்து நடந்தால், உதவி கேட்கும்போது இந்தக் குறிப்பு எண்ணைக் குறிப்பிடுங்கள்: {code}',
    'broke.retry': 'இந்தப் பக்கத்தை மீண்டும் முயல்க',
    'broke.help': 'உதவி கேளுங்கள்',
    'broke.payHead': 'மீண்டும் பணம் செலுத்தும் முன் சரிபார்க்கவும்.',
    'broke.pay':
      'நிறைவடையாத ஆர்டர், அதன் உண்மையான நிலையுடன் உங்கள் ஆர்டர்கள் பக்கத்தில் பட்டியலிடப்பட்டுள்ளது. அந்தப் பக்கமே பதிவேடு, இந்தப் பக்கம் அல்ல.',
    'broke.orders': 'உங்கள் ஆர்டர்கள்',
    'broke.lesson':
      'நீங்கள் ஒரு பாடத்தைப் பார்த்துக்கொண்டிருந்தால், அது கடைசியாகச் சேமிக்கப்பட்ட இடத்திலிருந்து தொடரும். பதிவு இயங்கும்போது உங்கள் இடம் ஏறத்தாழ ஒவ்வொரு பத்து வினாடிக்கும் சேமிக்கப்படுகிறது.',
  },
  ne: {
    'broke.eyebrow': 'केही बिग्रियो',
    'broke.heading': 'यो पृष्ठले काम गर्न छोड्यो',
    'broke.lede':
      'यो हाम्रो तर्फको गडबडी हो, तपाईंको गल्ती होइन। फेरि प्रयास गर्दा प्रायः काम गर्छ।',
    'broke.reference': 'यो दोहोरिइरह्यो भने सहायता माग्दा यो सन्दर्भ बताउनुहोस्: {code}',
    'broke.retry': 'यो पृष्ठ फेरि प्रयास गर्नुहोस्',
    'broke.help': 'मद्दत माग्नुहोस्',
    'broke.payHead': 'फेरि भुक्तानी गर्नुअघि जाँच्नुहोस्।',
    'broke.pay':
      'पूरा नभएको अर्डर तपाईंका अर्डरहरूको पृष्ठमा यसको वास्तविक स्थितिसहित सूचीबद्ध छ। अभिलेख त्यही पृष्ठ हो, यो होइन।',
    'broke.orders': 'तपाईंका अर्डरहरू',
    'broke.lesson':
      'तपाईंले कुनै पाठ हेर्दै हुनुहुन्थ्यो भने, त्यो पछिल्लो पटक सुरक्षित गरिएको ठाउँबाट फेरि सुरु हुन्छ। रेकर्डिङ चल्दा तपाईंको ठाउँ लगभग हरेक दस सेकेन्डमा सुरक्षित गरिन्छ।',
  },
};
