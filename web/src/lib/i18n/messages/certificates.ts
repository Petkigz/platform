import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Certificates: the list at `/certificates` and the words around the sheet
 * at `/certificates/<number>`.
 *
 * Written on 2026-11-25, on the owner's ruling that what is not a
 * declaration is to be in the reader's language.
 *
 * **The sheet itself is not here.** A certificate is a document handed to
 * somebody else, and it is printed in English whoever prints it;
 * `cert.sheetNote` says so to a reader of another language.
 *
 * `cert.revokedWhy` and `cert.reason` end in a colon and are followed by
 * the reason as a member of staff wrote it, which is not translated.
 * `cert.issued` and `cert.revoked` are said of one certificate, on a
 * badge. "Version" is `assign.version`, and the way back is `course.back`.
 */
export const CERTIFICATES: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'cert.lede':
      'تسجّل كلّ شهادة الدورة ونسختها وما كان مطلوبًا منك وقتها. تغيير اسم الدورة بعد ذلك لا يغيّر ما مُنح لك.',
    'cert.none': 'لا شهادات بعد. تصدر الشهادات عن الدورات المكتملة التي فعّلها مؤلّفها.',
    'cert.issued': 'صادرة',
    'cert.revoked': 'ملغاة',
    'cert.issuedOn': 'صدرت في {date}',
    'cert.notIssued': 'لم تصدر بعد',
    'cert.view': 'عرض الشهادة وطباعتها',
    'cert.verify': 'التحقّق من هذه الشهادة',
    'cert.revokedWhy': 'ملغاة:',
    'cert.revokedPlain': 'ملغاة.',
    'cert.mine': 'شهاداتي',
    'cert.print': 'طباعة أو حفظ بصيغة PDF',
    'cert.invalid': 'أُلغيت هذه الشهادة ولا يجوز تقديمها على أنّها سارية.',
    'cert.reason': 'السبب:',
    'cert.sheetNote': 'الشهادة نفسها مكتوبة بالإنجليزية، وهي واحدة لكلّ من يقرؤها.',
  },
  ur: {
    'cert.lede':
      'ہر سند میں کورس، اس کا ورژن اور وہ تقاضے درج ہوتے ہیں جو اس وقت آپ سے تھے۔ بعد میں کورس کا نام بدلنے سے وہ چیز نہیں بدلتی جو آپ کو دی گئی۔',
    'cert.none':
      'ابھی کوئی سند نہیں۔ اسناد ان مکمل کورسوں پر جاری ہوتی ہیں جن کے مصنف نے انہیں فعال کیا ہو۔',
    'cert.issued': 'جاری شدہ',
    'cert.revoked': 'منسوخ',
    'cert.issuedOn': '{date} کو جاری ہوئی',
    'cert.notIssued': 'ابھی جاری نہیں ہوئی',
    'cert.view': 'سند دیکھیں اور پرنٹ کریں',
    'cert.verify': 'اس سند کی تصدیق کریں',
    'cert.revokedWhy': 'منسوخ:',
    'cert.revokedPlain': 'منسوخ۔',
    'cert.mine': 'میری اسناد',
    'cert.print': 'پرنٹ کریں یا PDF میں محفوظ کریں',
    'cert.invalid': 'یہ سند منسوخ ہو چکی ہے اور اسے درست کے طور پر پیش نہیں کیا جانا چاہیے۔',
    'cert.reason': 'وجہ:',
    'cert.sheetNote': 'سند خود انگریزی میں لکھی ہے، جو ہر پڑھنے والے کے لیے ایک جیسی ہے۔',
  },
  fa: {
    'cert.lede':
      'هر گواهی‌نامه دوره، نسخهٔ آن و آنچه را در آن زمان از شما خواسته شده بود ثبت می‌کند. تغییر نام دوره پس از آن، آنچه را به شما داده شده تغییر نمی‌دهد.',
    'cert.none':
      'هنوز گواهی‌نامه‌ای نیست. گواهی‌نامه برای دوره‌های کامل‌شده‌ای صادر می‌شود که نویسنده‌شان آن را فعال کرده باشد.',
    'cert.issued': 'صادرشده',
    'cert.revoked': 'باطل‌شده',
    'cert.issuedOn': 'صادرشده در {date}',
    'cert.notIssued': 'هنوز صادر نشده',
    'cert.view': 'دیدن و چاپ گواهی‌نامه',
    'cert.verify': 'درستی‌سنجی این گواهی‌نامه',
    'cert.revokedWhy': 'باطل‌شده:',
    'cert.revokedPlain': 'باطل‌شده.',
    'cert.mine': 'گواهی‌نامه‌های من',
    'cert.print': 'چاپ یا ذخیره به‌صورت PDF',
    'cert.invalid': 'این گواهی‌نامه باطل شده است و نباید به‌عنوان معتبر ارائه شود.',
    'cert.reason': 'دلیل:',
    'cert.sheetNote': 'خودِ گواهی‌نامه به انگلیسی نوشته شده و برای هر که آن را بخواند یکسان است.',
  },
  'fa-af': {
    'cert.lede':
      'هر سند کورس، نسخهٔ آن و آنچه را در آن وقت از شما خواسته شده بود ثبت می‌کند. تغییر نام کورس بعد از آن، آنچه را به شما داده شده تغییر نمی‌دهد.',
    'cert.none':
      'هنوز سندی نیست. سند برای کورس‌های تکمیل‌شده‌ای صادر می‌شود که نویسندهٔ آن‌ها آن را فعال کرده باشد.',
    'cert.issued': 'صادرشده',
    'cert.revoked': 'باطل‌شده',
    'cert.issuedOn': 'صادرشده به تاریخ {date}',
    'cert.notIssued': 'هنوز صادر نشده',
    'cert.view': 'دیدن و چاپ سند',
    'cert.verify': 'تصدیق این سند',
    'cert.revokedWhy': 'باطل‌شده:',
    'cert.revokedPlain': 'باطل‌شده.',
    'cert.mine': 'اسناد من',
    'cert.print': 'چاپ یا ذخیره به شکل PDF',
    'cert.invalid': 'این سند باطل شده است و نباید به حیث سند معتبر پیش شود.',
    'cert.reason': 'دلیل:',
    'cert.sheetNote': 'خود سند به انگلیسی نوشته شده و برای هر کسی که آن را می‌خواند یکسان است.',
  },
  tr: {
    'cert.lede':
      'Her sertifika kursu, sürümünü ve o sırada sizden ne istendiğini kaydeder. Kursun adının sonradan değiştirilmesi size verileni değiştirmez.',
    'cert.none':
      'Henüz sertifika yok. Sertifikalar, yazarının bu özelliği açtığı tamamlanmış kurslar için verilir.',
    'cert.issued': 'Verildi',
    'cert.revoked': 'İptal edildi',
    'cert.issuedOn': '{date} tarihinde verildi',
    'cert.notIssued': 'Henüz verilmedi',
    'cert.view': 'Sertifikayı görüntüle ve yazdır',
    'cert.verify': 'Bu sertifikayı doğrula',
    'cert.revokedWhy': 'İptal edildi:',
    'cert.revokedPlain': 'İptal edildi.',
    'cert.mine': 'Sertifikalarım',
    'cert.print': 'Yazdır veya PDF olarak kaydet',
    'cert.invalid': 'Bu sertifika iptal edilmiştir ve geçerliymiş gibi sunulmamalıdır.',
    'cert.reason': 'Gerekçe:',
    'cert.sheetNote':
      'Sertifikanın kendisi İngilizce yazılmıştır ve onu okuyan herkes için aynıdır.',
  },
  id: {
    'cert.lede':
      'Setiap sertifikat mencatat kursus, versinya, dan apa yang disyaratkan dari Anda saat itu. Mengganti nama kursus sesudahnya tidak mengubah apa yang telah diberikan kepada Anda.',
    'cert.none':
      'Belum ada sertifikat. Sertifikat diterbitkan untuk kursus yang telah tuntas dan yang penulisnya mengaktifkannya.',
    'cert.issued': 'Diterbitkan',
    'cert.revoked': 'Dicabut',
    'cert.issuedOn': 'Diterbitkan {date}',
    'cert.notIssued': 'Belum diterbitkan',
    'cert.view': 'Lihat dan cetak sertifikat',
    'cert.verify': 'Verifikasi sertifikat ini',
    'cert.revokedWhy': 'Dicabut:',
    'cert.revokedPlain': 'Dicabut.',
    'cert.mine': 'Sertifikat saya',
    'cert.print': 'Cetak atau simpan sebagai PDF',
    'cert.invalid':
      'Sertifikat ini telah dicabut dan tidak boleh ditunjukkan sebagai sertifikat yang sah.',
    'cert.reason': 'Alasan:',
    'cert.sheetNote':
      'Sertifikat itu sendiri ditulis dalam bahasa Inggris, sama bagi siapa pun yang membacanya.',
  },
  ms: {
    'cert.lede':
      'Setiap sijil merekodkan kursus, versinya, dan apa yang dikehendaki daripada anda pada masa itu. Menukar nama kursus selepas itu tidak mengubah apa yang telah dianugerahkan kepada anda.',
    'cert.none':
      'Belum ada sijil. Sijil dikeluarkan untuk kursus yang telah diselesaikan dan yang pengarangnya mengaktifkannya.',
    'cert.issued': 'Dikeluarkan',
    'cert.revoked': 'Dibatalkan',
    'cert.issuedOn': 'Dikeluarkan pada {date}',
    'cert.notIssued': 'Belum dikeluarkan',
    'cert.view': 'Lihat dan cetak sijil',
    'cert.verify': 'Sahkan sijil ini',
    'cert.revokedWhy': 'Dibatalkan:',
    'cert.revokedPlain': 'Dibatalkan.',
    'cert.mine': 'Sijil saya',
    'cert.print': 'Cetak atau simpan sebagai PDF',
    'cert.invalid':
      'Sijil ini telah dibatalkan dan tidak boleh dikemukakan sebagai sijil yang sah.',
    'cert.reason': 'Sebab:',
    'cert.sheetNote':
      'Sijil itu sendiri ditulis dalam bahasa Inggeris, sama bagi sesiapa sahaja yang membacanya.',
  },
  bn: {
    'cert.lede':
      'প্রতিটি সনদে কোর্স, তার সংস্করণ এবং তখন আপনার কাছে কী চাওয়া হয়েছিল তা লেখা থাকে। পরে কোর্সের নাম বদলালে আপনাকে যা দেওয়া হয়েছে তা বদলায় না।',
    'cert.none':
      'এখনও কোনো সনদ নেই। যে সম্পূর্ণ করা কোর্সের লেখক সনদ চালু করেছেন, সেগুলোর জন্য সনদ দেওয়া হয়।',
    'cert.issued': 'প্রদত্ত',
    'cert.revoked': 'বাতিল',
    'cert.issuedOn': '{date} তারিখে প্রদত্ত',
    'cert.notIssued': 'এখনও দেওয়া হয়নি',
    'cert.view': 'সনদ দেখুন ও প্রিন্ট করুন',
    'cert.verify': 'এই সনদ যাচাই করুন',
    'cert.revokedWhy': 'বাতিল:',
    'cert.revokedPlain': 'বাতিল।',
    'cert.mine': 'আমার সনদ',
    'cert.print': 'প্রিন্ট করুন বা PDF হিসেবে সংরক্ষণ করুন',
    'cert.invalid': 'এই সনদ বাতিল করা হয়েছে এবং একে বৈধ হিসেবে দেখানো চলবে না।',
    'cert.reason': 'কারণ:',
    'cert.sheetNote': 'সনদটি নিজে ইংরেজিতে লেখা, যে-ই পড়ুক সবার জন্য একই।',
  },
  hi: {
    'cert.lede':
      'हर प्रमाणपत्र में कोर्स, उसका संस्करण और उस समय आपसे क्या अपेक्षित था, यह दर्ज रहता है। बाद में कोर्स का नाम बदलने से वह नहीं बदलता जो आपको दिया गया।',
    'cert.none':
      'अभी कोई प्रमाणपत्र नहीं है। प्रमाणपत्र उन पूरे किए गए कोर्सों के लिए जारी होते हैं जिनके लेखक ने इन्हें चालू किया हो।',
    'cert.issued': 'जारी',
    'cert.revoked': 'रद्द',
    'cert.issuedOn': '{date} को जारी',
    'cert.notIssued': 'अभी जारी नहीं हुआ',
    'cert.view': 'प्रमाणपत्र देखें और प्रिंट करें',
    'cert.verify': 'इस प्रमाणपत्र की जाँच करें',
    'cert.revokedWhy': 'रद्द:',
    'cert.revokedPlain': 'रद्द।',
    'cert.mine': 'मेरे प्रमाणपत्र',
    'cert.print': 'प्रिंट करें या PDF के रूप में सहेजें',
    'cert.invalid':
      'यह प्रमाणपत्र रद्द किया जा चुका है और इसे मान्य बताकर प्रस्तुत नहीं किया जाना चाहिए।',
    'cert.reason': 'कारण:',
    'cert.sheetNote': 'प्रमाणपत्र स्वयं अंग्रेज़ी में लिखा है, जो हर पढ़ने वाले के लिए एक जैसा है।',
  },
  fr: {
    'cert.lede':
      'Chaque certificat consigne le cours, sa version et ce qui vous était demandé à ce moment-là. Renommer un cours par la suite ne change pas ce qui vous a été décerné.',
    'cert.none':
      'Aucun certificat pour l’instant. Ils sont délivrés pour les cours terminés dont l’auteur les a activés.',
    'cert.issued': 'Délivré',
    'cert.revoked': 'Révoqué',
    'cert.issuedOn': 'Délivré le {date}',
    'cert.notIssued': 'Pas encore délivré',
    'cert.view': 'Voir et imprimer le certificat',
    'cert.verify': 'Vérifier ce certificat',
    'cert.revokedWhy': 'Révoqué :',
    'cert.revokedPlain': 'Révoqué.',
    'cert.mine': 'Mes certificats',
    'cert.print': 'Imprimer ou enregistrer en PDF',
    'cert.invalid': 'Ce certificat a été révoqué et ne doit pas être présenté comme valide.',
    'cert.reason': 'Motif :',
    'cert.sheetNote':
      'Le certificat lui-même est rédigé en anglais, le même pour toute personne qui le lit.',
  },
  es: {
    'cert.lede':
      'Cada certificado deja constancia del curso, de su versión y de lo que se le exigía en ese momento. Cambiar el nombre de un curso después no cambia lo que se le otorgó.',
    'cert.none':
      'Todavía no hay certificados. Se emiten para los cursos completados cuyo autor los ha activado.',
    'cert.issued': 'Emitido',
    'cert.revoked': 'Revocado',
    'cert.issuedOn': 'Emitido el {date}',
    'cert.notIssued': 'Aún no emitido',
    'cert.view': 'Ver e imprimir el certificado',
    'cert.verify': 'Verificar este certificado',
    'cert.revokedWhy': 'Revocado:',
    'cert.revokedPlain': 'Revocado.',
    'cert.mine': 'Mis certificados',
    'cert.print': 'Imprimir o guardar como PDF',
    'cert.invalid': 'Este certificado ha sido revocado y no debe presentarse como válido.',
    'cert.reason': 'Motivo:',
    'cert.sheetNote':
      'El certificado en sí está escrito en inglés, igual para cualquiera que lo lea.',
  },
  pt: {
    'cert.lede':
      'Cada certificado regista o curso, a sua versão e o que lhe era exigido nessa altura. Mudar o nome de um curso depois não altera o que lhe foi atribuído.',
    'cert.none':
      'Ainda não há certificados. São emitidos para os cursos concluídos cujo autor os ativou.',
    'cert.issued': 'Emitido',
    'cert.revoked': 'Revogado',
    'cert.issuedOn': 'Emitido em {date}',
    'cert.notIssued': 'Ainda não emitido',
    'cert.view': 'Ver e imprimir o certificado',
    'cert.verify': 'Verificar este certificado',
    'cert.revokedWhy': 'Revogado:',
    'cert.revokedPlain': 'Revogado.',
    'cert.mine': 'Os meus certificados',
    'cert.print': 'Imprimir ou guardar como PDF',
    'cert.invalid': 'Este certificado foi revogado e não deve ser apresentado como válido.',
    'cert.reason': 'Motivo:',
    'cert.sheetNote':
      'O certificado em si está escrito em inglês, igual para quem quer que o leia.',
  },
  sw: {
    'cert.lede':
      'Kila cheti hurekodi kozi, toleo lake, na kilichotakiwa kwako wakati huo. Kubadilisha jina la kozi baadaye hakubadilishi ulichotunukiwa.',
    'cert.none':
      'Bado hakuna vyeti. Hutolewa kwa kozi zilizokamilishwa ambazo mwandishi wake ameviwezesha.',
    'cert.issued': 'Kimetolewa',
    'cert.revoked': 'Kimebatilishwa',
    'cert.issuedOn': 'Kilitolewa {date}',
    'cert.notIssued': 'Bado hakijatolewa',
    'cert.view': 'Tazama na uchapishe cheti',
    'cert.verify': 'Thibitisha cheti hiki',
    'cert.revokedWhy': 'Kimebatilishwa:',
    'cert.revokedPlain': 'Kimebatilishwa.',
    'cert.mine': 'Vyeti vyangu',
    'cert.print': 'Chapisha au hifadhi kama PDF',
    'cert.invalid': 'Cheti hiki kimebatilishwa na hakipaswi kuwasilishwa kama halali.',
    'cert.reason': 'Sababu:',
    'cert.sheetNote': 'Cheti chenyewe kimeandikwa kwa Kiingereza, sawa kwa kila anayekisoma.',
  },
  af: {
    'cert.lede':
      'Elke sertifikaat teken die kursus, sy weergawe en wat destyds van jou vereis is aan. Om ’n kursus agterna te hernoem, verander nie wat aan jou toegeken is nie.',
    'cert.none':
      'Nog geen sertifikate nie. Hulle word uitgereik vir voltooide kursusse waarvan die outeur dit geaktiveer het.',
    'cert.issued': 'Uitgereik',
    'cert.revoked': 'Herroep',
    'cert.issuedOn': 'Uitgereik op {date}',
    'cert.notIssued': 'Nog nie uitgereik nie',
    'cert.view': 'Bekyk en druk sertifikaat',
    'cert.verify': 'Verifieer hierdie sertifikaat',
    'cert.revokedWhy': 'Herroep:',
    'cert.revokedPlain': 'Herroep.',
    'cert.mine': 'My sertifikate',
    'cert.print': 'Druk of stoor as PDF',
    'cert.invalid': 'Hierdie sertifikaat is herroep en mag nie as geldig voorgelê word nie.',
    'cert.reason': 'Rede:',
    'cert.sheetNote':
      'Die sertifikaat self is in Engels geskryf, dieselfde vir almal wat dit lees.',
  },
  'zh-hans': {
    'cert.lede': '每张证书都记录了课程、课程版本，以及当时对你的要求。课程之后改名，不会改变你已获得的证书。',
    'cert.none': '还没有证书。作者启用了证书的课程，在完成后才会颁发。',
    'cert.issued': '已颁发',
    'cert.revoked': '已撤销',
    'cert.issuedOn': '颁发于 {date}',
    'cert.notIssued': '尚未颁发',
    'cert.view': '查看并打印证书',
    'cert.verify': '验证这张证书',
    'cert.revokedWhy': '已撤销：',
    'cert.revokedPlain': '已撤销。',
    'cert.mine': '我的证书',
    'cert.print': '打印或另存为 PDF',
    'cert.invalid': '这张证书已被撤销，不得作为有效证书出示。',
    'cert.reason': '原因：',
    'cert.sheetNote': '证书本身以英文书写，任何人读到的都是同一份。',
  },
  'zh-hant': {
    'cert.lede': '每張證書都記錄了課程、課程版本，以及當時對你的要求。課程之後改名，不會改變你已獲得的證書。',
    'cert.none': '還沒有證書。作者啟用了證書的課程，在完成後才會頒發。',
    'cert.issued': '已頒發',
    'cert.revoked': '已撤銷',
    'cert.issuedOn': '頒發於 {date}',
    'cert.notIssued': '尚未頒發',
    'cert.view': '檢視並列印證書',
    'cert.verify': '驗證這張證書',
    'cert.revokedWhy': '已撤銷：',
    'cert.revokedPlain': '已撤銷。',
    'cert.mine': '我的證書',
    'cert.print': '列印或另存為 PDF',
    'cert.invalid': '這張證書已被撤銷，不得作為有效證書出示。',
    'cert.reason': '原因：',
    'cert.sheetNote': '證書本身以英文書寫，任何人讀到的都是同一份。',
  },
  vi: {
    'cert.lede':
      'Mỗi chứng chỉ ghi lại khoá học, phiên bản của khoá học và những gì được yêu cầu ở bạn vào thời điểm đó. Việc đổi tên khoá học về sau không làm thay đổi những gì bạn đã được cấp.',
    'cert.none':
      'Chưa có chứng chỉ nào. Chứng chỉ được cấp cho các khoá học đã hoàn thành mà tác giả đã bật tính năng này.',
    'cert.issued': 'Đã cấp',
    'cert.revoked': 'Đã thu hồi',
    'cert.issuedOn': 'Cấp ngày {date}',
    'cert.notIssued': 'Chưa được cấp',
    'cert.view': 'Xem và in chứng chỉ',
    'cert.verify': 'Xác minh chứng chỉ này',
    'cert.revokedWhy': 'Đã thu hồi:',
    'cert.revokedPlain': 'Đã thu hồi.',
    'cert.mine': 'Chứng chỉ của tôi',
    'cert.print': 'In hoặc lưu thành PDF',
    'cert.invalid':
      'Chứng chỉ này đã bị thu hồi và không được xuất trình như một chứng chỉ hợp lệ.',
    'cert.reason': 'Lý do:',
    'cert.sheetNote': 'Bản thân chứng chỉ được viết bằng tiếng Anh, giống nhau với mọi người đọc.',
  },
  th: {
    'cert.lede':
      'ประกาศนียบัตรแต่ละใบบันทึกหลักสูตร ฉบับของหลักสูตร และสิ่งที่กำหนดให้คุณทำในขณะนั้น การเปลี่ยนชื่อหลักสูตรในภายหลังไม่ได้เปลี่ยนสิ่งที่คุณได้รับ',
    'cert.none':
      'ยังไม่มีประกาศนียบัตร ประกาศนียบัตรออกให้สำหรับหลักสูตรที่เรียนจบแล้วและผู้เขียนเปิดใช้ไว้',
    'cert.issued': 'ออกแล้ว',
    'cert.revoked': 'ถูกเพิกถอน',
    'cert.issuedOn': 'ออกเมื่อ {date}',
    'cert.notIssued': 'ยังไม่ได้ออก',
    'cert.view': 'ดูและพิมพ์ประกาศนียบัตร',
    'cert.verify': 'ตรวจสอบประกาศนียบัตรนี้',
    'cert.revokedWhy': 'ถูกเพิกถอน:',
    'cert.revokedPlain': 'ถูกเพิกถอน',
    'cert.mine': 'ประกาศนียบัตรของฉัน',
    'cert.print': 'พิมพ์หรือบันทึกเป็น PDF',
    'cert.invalid': 'ประกาศนียบัตรนี้ถูกเพิกถอนแล้ว และต้องไม่นำไปแสดงว่ายังใช้ได้',
    'cert.reason': 'เหตุผล:',
    'cert.sheetNote': 'ตัวประกาศนียบัตรเขียนเป็นภาษาอังกฤษ เหมือนกันสำหรับทุกคนที่อ่าน',
  },
  fil: {
    'cert.lede':
      'Itinatala ng bawat sertipiko ang kurso, ang bersyon nito, at ang hiniling sa iyo noong panahong iyon. Ang pagpapalit ng pangalan ng kurso pagkatapos ay hindi nagbabago sa iginawad sa iyo.',
    'cert.none':
      'Wala pang sertipiko. Ibinibigay ang mga ito para sa mga natapos na kurso na pinagana ng may-akda.',
    'cert.issued': 'Naibigay',
    'cert.revoked': 'Binawi',
    'cert.issuedOn': 'Ibinigay noong {date}',
    'cert.notIssued': 'Hindi pa naibibigay',
    'cert.view': 'Tingnan at i-print ang sertipiko',
    'cert.verify': 'I-verify ang sertipikong ito',
    'cert.revokedWhy': 'Binawi:',
    'cert.revokedPlain': 'Binawi.',
    'cert.mine': 'Aking mga sertipiko',
    'cert.print': 'I-print o i-save bilang PDF',
    'cert.invalid': 'Binawi na ang sertipikong ito at hindi dapat ipakita bilang may bisa.',
    'cert.reason': 'Dahilan:',
    'cert.sheetNote':
      'Ang sertipiko mismo ay nakasulat sa Ingles, pareho para sa sinumang bumabasa nito.',
  },
  uz: {
    'cert.lede':
      'Har bir sertifikatda kurs, uning versiyasi va oʻsha paytda sizdan nima talab qilingani qayd etiladi. Kurs nomini keyin oʻzgartirish sizga berilgan narsani oʻzgartirmaydi.',
    'cert.none':
      'Hali sertifikat yoʻq. Ular muallifi sertifikatni yoqib qoʻygan, tugatilgan kurslar uchun beriladi.',
    'cert.issued': 'Berilgan',
    'cert.revoked': 'Bekor qilingan',
    'cert.issuedOn': '{date} kuni berilgan',
    'cert.notIssued': 'Hali berilmagan',
    'cert.view': 'Sertifikatni koʻrish va chop etish',
    'cert.verify': 'Bu sertifikatni tekshirish',
    'cert.revokedWhy': 'Bekor qilingan:',
    'cert.revokedPlain': 'Bekor qilingan.',
    'cert.mine': 'Sertifikatlarim',
    'cert.print': 'Chop etish yoki PDF sifatida saqlash',
    'cert.invalid': 'Bu sertifikat bekor qilingan va uni haqiqiy deb koʻrsatish mumkin emas.',
    'cert.reason': 'Sabab:',
    'cert.sheetNote':
      'Sertifikatning oʻzi ingliz tilida yozilgan, uni oʻqigan har kim uchun bir xil.',
  },
  kk: {
    'cert.lede':
      'Әр сертификатта курс, оның нұсқасы және сол кезде сізден не талап етілгені жазылады. Курстың атауын кейін өзгерту сізге берілген нәрсені өзгертпейді.',
    'cert.none':
      'Әзірге сертификат жоқ. Олар авторы сертификатты қосып қойған, аяқталған курстар үшін беріледі.',
    'cert.issued': 'Берілген',
    'cert.revoked': 'Күші жойылған',
    'cert.issuedOn': '{date} күні берілген',
    'cert.notIssued': 'Әлі берілмеген',
    'cert.view': 'Сертификатты көру және басып шығару',
    'cert.verify': 'Осы сертификатты тексеру',
    'cert.revokedWhy': 'Күші жойылған:',
    'cert.revokedPlain': 'Күші жойылған.',
    'cert.mine': 'Менің сертификаттарым',
    'cert.print': 'Басып шығару немесе PDF ретінде сақтау',
    'cert.invalid': 'Бұл сертификаттың күші жойылған және оны жарамды деп көрсетуге болмайды.',
    'cert.reason': 'Себебі:',
    'cert.sheetNote': 'Сертификаттың өзі ағылшын тілінде жазылған, оны оқитын әркім үшін бірдей.',
  },
  az: {
    'cert.lede':
      'Hər sertifikatda kurs, onun versiyası və həmin vaxt sizdən nə tələb olunduğu qeyd edilir. Kursun adının sonradan dəyişdirilməsi sizə verilmiş olanı dəyişmir.',
    'cert.none':
      'Hələ sertifikat yoxdur. Onlar müəllifinin sertifikatı aktiv etdiyi, tamamlanmış kurslar üçün verilir.',
    'cert.issued': 'Verilib',
    'cert.revoked': 'Ləğv edilib',
    'cert.issuedOn': '{date} tarixində verilib',
    'cert.notIssued': 'Hələ verilməyib',
    'cert.view': 'Sertifikata bax və çap et',
    'cert.verify': 'Bu sertifikatı yoxla',
    'cert.revokedWhy': 'Ləğv edilib:',
    'cert.revokedPlain': 'Ləğv edilib.',
    'cert.mine': 'Sertifikatlarım',
    'cert.print': 'Çap et və ya PDF kimi saxla',
    'cert.invalid': 'Bu sertifikat ləğv edilib və etibarlı kimi təqdim edilməməlidir.',
    'cert.reason': 'Səbəb:',
    'cert.sheetNote':
      'Sertifikatın özü ingilis dilində yazılıb və onu oxuyan hər kəs üçün eynidir.',
  },
  tg: {
    'cert.lede':
      'Ҳар шаҳодатнома курс, нусхаи он ва он чиро, ки он вақт аз шумо талаб мешуд, сабт мекунад. Баъдтар иваз кардани номи курс он чиро, ки ба шумо дода шудааст, тағйир намедиҳад.',
    'cert.none':
      'Ҳоло шаҳодатнома нест. Онҳо барои курсҳои анҷомёфтае дода мешаванд, ки муаллифашон шаҳодатномаро фаъол кардааст.',
    'cert.issued': 'Дода шудааст',
    'cert.revoked': 'Бекор шудааст',
    'cert.issuedOn': '{date} дода шудааст',
    'cert.notIssued': 'Ҳанӯз дода нашудааст',
    'cert.view': 'Дидан ва чоп кардани шаҳодатнома',
    'cert.verify': 'Тафтиши ин шаҳодатнома',
    'cert.revokedWhy': 'Бекор шудааст:',
    'cert.revokedPlain': 'Бекор шудааст.',
    'cert.mine': 'Шаҳодатномаҳои ман',
    'cert.print': 'Чоп кардан ё ҳамчун PDF нигоҳ доштан',
    'cert.invalid':
      'Ин шаҳодатнома бекор шудааст ва онро ҳамчун эътиборнок нишон додан мумкин нест.',
    'cert.reason': 'Сабаб:',
    'cert.sheetNote':
      'Худи шаҳодатнома ба забони англисӣ навишта шудааст ва барои ҳар касе, ки онро мехонад, якхела аст.',
  },
  ky: {
    'cert.lede':
      'Ар бир сертификатта курс, анын версиясы жана ошол кезде сизден эмне талап кылынганы жазылат. Курстун атын кийин өзгөртүү сизге берилген нерсени өзгөртпөйт.',
    'cert.none':
      'Азырынча сертификат жок. Алар автору сертификатты иштетип койгон, аяктаган курстар үчүн берилет.',
    'cert.issued': 'Берилген',
    'cert.revoked': 'Жокко чыгарылган',
    'cert.issuedOn': '{date} күнү берилген',
    'cert.notIssued': 'Азырынча бериле элек',
    'cert.view': 'Сертификатты көрүү жана басып чыгаруу',
    'cert.verify': 'Бул сертификатты текшерүү',
    'cert.revokedWhy': 'Жокко чыгарылган:',
    'cert.revokedPlain': 'Жокко чыгарылган.',
    'cert.mine': 'Менин сертификаттарым',
    'cert.print': 'Басып чыгаруу же PDF катары сактоо',
    'cert.invalid': 'Бул сертификат жокко чыгарылган жана аны жарактуу катары көрсөтүүгө болбойт.',
    'cert.reason': 'Себеби:',
    'cert.sheetNote':
      'Сертификаттын өзү англис тилинде жазылган, аны окуган ар бир адам үчүн бирдей.',
  },
  tk: {
    'cert.lede':
      'Her şahadatnamada kurs, onuň wersiýasy we şol wagt sizden näme talap edilendigi ýazylýar. Kursuň adyny soň üýtgetmek size berlen zady üýtgetmeýär.',
    'cert.none':
      'Entek şahadatnama ýok. Olar awtory şahadatnamany işledip goýan, tamamlanan kurslar üçin berilýär.',
    'cert.issued': 'Berlen',
    'cert.revoked': 'Ýatyrylan',
    'cert.issuedOn': '{date} güni berlen',
    'cert.notIssued': 'Entek berilmedik',
    'cert.view': 'Şahadatnamany görmek we çap etmek',
    'cert.verify': 'Bu şahadatnamany barlamak',
    'cert.revokedWhy': 'Ýatyrylan:',
    'cert.revokedPlain': 'Ýatyrylan.',
    'cert.mine': 'Meniň şahadatnamalarym',
    'cert.print': 'Çap etmek ýa-da PDF hökmünde saklamak',
    'cert.invalid': 'Bu şahadatnama ýatyryldy we ony hakyky diýip görkezmek bolmaýar.',
    'cert.reason': 'Sebäbi:',
    'cert.sheetNote':
      'Şahadatnamanyň özi iňlis dilinde ýazylan, ony okaýan her kim üçin birmeňzeş.',
  },
  ta: {
    'cert.lede':
      'ஒவ்வொரு சான்றிதழும் பாடநெறியையும், அதன் பதிப்பையும், அப்போது உங்களிடம் எதிர்பார்க்கப்பட்டதையும் பதிவு செய்கிறது. பின்னர் பாடநெறியின் பெயரை மாற்றுவது உங்களுக்கு வழங்கப்பட்டதை மாற்றாது.',
    'cert.none':
      'இன்னும் சான்றிதழ்கள் இல்லை. ஆசிரியர் சான்றிதழை இயக்கியுள்ள, நிறைவு செய்யப்பட்ட பாடநெறிகளுக்கு அவை வழங்கப்படுகின்றன.',
    'cert.issued': 'வழங்கப்பட்டது',
    'cert.revoked': 'ரத்து செய்யப்பட்டது',
    'cert.issuedOn': '{date} அன்று வழங்கப்பட்டது',
    'cert.notIssued': 'இன்னும் வழங்கப்படவில்லை',
    'cert.view': 'சான்றிதழைப் பார்த்து அச்சிடுக',
    'cert.verify': 'இந்தச் சான்றிதழைச் சரிபார்க்க',
    'cert.revokedWhy': 'ரத்து செய்யப்பட்டது:',
    'cert.revokedPlain': 'ரத்து செய்யப்பட்டது.',
    'cert.mine': 'என் சான்றிதழ்கள்',
    'cert.print': 'அச்சிடுக அல்லது PDF ஆகச் சேமிக்க',
    'cert.invalid':
      'இந்தச் சான்றிதழ் ரத்து செய்யப்பட்டுள்ளது; இதைச் செல்லுபடியானதாகக் காட்டக்கூடாது.',
    'cert.reason': 'காரணம்:',
    'cert.sheetNote':
      'சான்றிதழ் ஆங்கிலத்தில் எழுதப்பட்டுள்ளது; அதைப் படிக்கும் எவருக்கும் அது ஒன்றே.',
  },
  ne: {
    'cert.lede':
      'हरेक प्रमाणपत्रमा पाठ्यक्रम, त्यसको संस्करण र त्यति बेला तपाईंबाट के अपेक्षा गरिएको थियो भन्ने कुरा लेखिएको हुन्छ। पछि पाठ्यक्रमको नाम फेर्दा तपाईंलाई दिइएको कुरा फेरिँदैन।',
    'cert.none':
      'अहिलेसम्म कुनै प्रमाणपत्र छैन। लेखकले प्रमाणपत्र सक्रिय गरेका, पूरा गरिएका पाठ्यक्रमका लागि ती जारी हुन्छन्।',
    'cert.issued': 'जारी',
    'cert.revoked': 'रद्द',
    'cert.issuedOn': '{date} मा जारी',
    'cert.notIssued': 'अझै जारी भएको छैन',
    'cert.view': 'प्रमाणपत्र हेर्नुहोस् र छाप्नुहोस्',
    'cert.verify': 'यो प्रमाणपत्र जाँच्नुहोस्',
    'cert.revokedWhy': 'रद्द:',
    'cert.revokedPlain': 'रद्द।',
    'cert.mine': 'मेरा प्रमाणपत्रहरू',
    'cert.print': 'छाप्नुहोस् वा PDF का रूपमा सुरक्षित गर्नुहोस्',
    'cert.invalid': 'यो प्रमाणपत्र रद्द गरिएको छ र यसलाई मान्य भनेर पेस गर्नु हुँदैन।',
    'cert.reason': 'कारण:',
    'cert.sheetNote': 'प्रमाणपत्र आफैँ अङ्ग्रेजीमा लेखिएको छ, जसले पढे पनि उही।',
  },
};
