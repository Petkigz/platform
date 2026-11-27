import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * The second half of the reading settings: the shape of the letters, and a
 * lesson read aloud by the device's own voice.
 *
 * Written on 2026-11-27, in the same twenty-seven languages as the
 * dashboard. **Written by the people who built the site and read by no
 * speaker.**
 *
 * The first ten sentences are said on the reading page
 * (`/account/accessibility`), the last four by the button on a lesson; all
 * are handed to the browser by a page, and none is in a script.
 * "OpenDyslexic" is the font's name and stays as it is written. A "verse"
 * here is a verse of the Qur'an, and each language uses the word its
 * Muslims use for one.
 */
export const EASE: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ar: {
    'ease.lettersLegend': 'الحروف',
    'ease.lettersNormal': 'كما في جهازك',
    'ease.lettersNormalNote': 'الحروف التي تستخدمها بقية المنصة.',
    'ease.lettersDyslexic': 'خط مصمَّم لعسر القراءة',
    'ease.lettersDyslexicNote':
      'خط OpenDyslexic: كل حرف فيه أثقل من أسفله، فيصعب الخلط بينه وبين غيره. يغيّر الحروف اللاتينية والسيريلية فقط؛ أما العربية وسائر الكتابات فتبقى كما هي. يجده بعض القراء أسهل، ولم تثبت الدراسات أنه يفيد الجميع.',
    'ease.lettersElsewhere':
      'ليس في هذا الخط حروف للغة هذه الصفحة. هنا لا يغيّر إلا النص المكتوب بلغة تُكتب بالحروف اللاتينية أو السيريلية، مثل دورة تُدرَّس بالإنجليزية.',
    'ease.speech': 'يمكن قراءة الدرس بصوت مسموع.',
    'ease.speechNote':
      'لوصف الدرس ولنصّه المكتوب زرّ يقرؤهما بصوت جهازك نفسه، إن كان في الجهاز صوت للغة الدرس. لا تُرسَل الكلمات إلى أي مكان. الجملة التي فيها آية مكتوبة بالتشكيل تُترك: فالآية لا تُقرأ بصوت آلة.',
    'ease.untested': 'لم تُختبر بقارئ شاشة.',
    'ease.untestedNote':
      'بُنيت المنصة لتعمل مع قارئ الشاشة، لكن لم يختبرها بعدُ أحد ممن يعتمدون عليه. والقراءة بصوت مسموع لم تُسمع على كل جهاز كذلك.',
    'ease.read': 'اقرأ بصوت مسموع',
    'ease.stop': 'أوقف القراءة',
    'ease.readNote': 'يُقرأ بصوت جهازك نفسه. الجملة التي فيها آية مكتوبة بالتشكيل تُترك.',
    'ease.noVoice': 'ليس في جهازك صوت للغة هذا الدرس.',
  },
  ur: {
    'ease.lettersLegend': 'حروف',
    'ease.lettersNormal': 'جیسے آپ کے ڈیوائس میں ہیں',
    'ease.lettersNormalNote': 'وہی حروف جو باقی پلیٹ فارم استعمال کرتا ہے۔',
    'ease.lettersDyslexic': 'ڈسلیکسیا کے لیے بنایا گیا فونٹ',
    'ease.lettersDyslexicNote':
      'فونٹ OpenDyslexic: اس کا ہر حرف نیچے سے بھاری ہے، اس لیے اسے کسی دوسرے حرف سے ملانا مشکل ہے۔ یہ صرف لاطینی اور سیریلک حروف بدلتا ہے؛ عربی اور باقی تمام رسم الخط ویسے ہی رہتے ہیں۔ کچھ پڑھنے والوں کو یہ آسان لگتا ہے؛ تحقیق سے یہ ثابت نہیں ہوا کہ یہ سب کے لیے مفید ہے۔',
    'ease.lettersElsewhere':
      'اس فونٹ میں اس صفحے کی زبان کے حروف نہیں ہیں۔ یہاں یہ صرف اُس متن کو بدلتا ہے جو لاطینی یا سیریلک حروف میں لکھی جانے والی زبان میں ہو، جیسے انگریزی میں پڑھایا جانے والا کورس۔',
    'ease.speech': 'سبق بلند آواز میں پڑھا جا سکتا ہے۔',
    'ease.speechNote':
      'سبق کے تعارف اور اس کے تحریری متن، دونوں کے ساتھ ایک بٹن ہے جو انہیں آپ کے ڈیوائس کی اپنی آواز میں پڑھتا ہے، اگر ڈیوائس میں سبق کی زبان کی آواز موجود ہو۔ الفاظ کہیں نہیں بھیجے جاتے۔ جس جملے میں اعراب کے ساتھ لکھی ہوئی آیت ہو وہ چھوڑ دیا جاتا ہے: آیت مشین کی آواز کے لیے نہیں۔',
    'ease.untested': 'اسکرین ریڈر کے ساتھ آزمایا نہیں گیا۔',
    'ease.untestedNote':
      'پلیٹ فارم اسکرین ریڈر کے ساتھ کام کرنے کے لیے بنایا گیا ہے، مگر ابھی تک اس پر انحصار کرنے والے کسی شخص نے اسے آزمایا نہیں۔ بلند آواز میں پڑھنا بھی ہر ڈیوائس پر سنا نہیں گیا۔',
    'ease.read': 'بلند آواز میں پڑھیں',
    'ease.stop': 'پڑھنا روکیں',
    'ease.readNote':
      'آپ کے ڈیوائس کی اپنی آواز میں پڑھا جاتا ہے۔ جس جملے میں اعراب کے ساتھ لکھی ہوئی آیت ہو وہ چھوڑ دیا جاتا ہے۔',
    'ease.noVoice': 'آپ کے ڈیوائس میں اس سبق کی زبان کی کوئی آواز نہیں۔',
  },
  fa: {
    'ease.lettersLegend': 'حروف',
    'ease.lettersNormal': 'همان‌گونه که در دستگاه شماست',
    'ease.lettersNormalNote': 'حروفی که بقیهٔ سکو به کار می‌برد.',
    'ease.lettersDyslexic': 'قلمی که برای خوانش‌پریشی ساخته شده',
    'ease.lettersDyslexicNote':
      'قلم OpenDyslexic: هر حرف آن در پایین سنگین‌تر است، پس سخت‌تر با حرف دیگری اشتباه می‌شود. فقط حروف لاتین و سیریلیک را تغییر می‌دهد؛ عربی و هر خط دیگری همان‌گونه می‌ماند. برخی خوانندگان آن را آسان‌تر می‌یابند؛ پژوهش‌ها نشان نداده‌اند که به همه کمک می‌کند.',
    'ease.lettersElsewhere':
      'این قلم برای زبان این صفحه حرفی ندارد. در اینجا فقط متنی را تغییر می‌دهد که به زبانی با حروف لاتین یا سیریلیک نوشته شده باشد، مانند دوره‌ای که به انگلیسی تدریس می‌شود.',
    'ease.speech': 'درس را می‌توان با صدای بلند خواند.',
    'ease.speechNote':
      'توضیح درس و متن نوشتاری آن هر کدام دکمه‌ای دارند که آن را با صدای خود دستگاه شما می‌خواند، اگر دستگاه برای زبان درس صدایی داشته باشد. واژه‌ها به هیچ جا فرستاده نمی‌شوند. جمله‌ای که آیه‌ای با حرکت‌گذاری در آن نوشته شده کنار گذاشته می‌شود: آیه برای صدای ماشین نیست.',
    'ease.untested': 'با صفحه‌خوان آزموده نشده است.',
    'ease.untestedNote':
      'سکو برای کار با صفحه‌خوان ساخته شده است، اما هنوز کسی که به صفحه‌خوان تکیه دارد آن را نیازموده است. خواندن با صدای بلند نیز روی هر دستگاهی شنیده نشده است.',
    'ease.read': 'با صدای بلند بخوان',
    'ease.stop': 'خواندن را متوقف کن',
    'ease.readNote':
      'با صدای خود دستگاه شما خوانده می‌شود. جمله‌ای که آیه‌ای با حرکت‌گذاری در آن نوشته شده کنار گذاشته می‌شود.',
    'ease.noVoice': 'دستگاه شما برای زبان این درس صدایی ندارد.',
  },
  'fa-af': {
    'ease.lettersLegend': 'حروف',
    'ease.lettersNormal': 'همان‌طور که در دستگاه شماست',
    'ease.lettersNormalNote': 'حروفی که بقیهٔ سامانه استفاده می‌کند.',
    'ease.lettersDyslexic': 'قلمی که برای خوانش‌پریشی ساخته شده',
    'ease.lettersDyslexicNote':
      'قلم OpenDyslexic: هر حرف آن در قسمت پایین سنگین‌تر است، بنابراین سخت‌تر با حرف دیگری اشتباه می‌شود. تنها حروف لاتین و سیریلیک را تغییر می‌دهد؛ عربی و هر خط دیگر همان‌طور می‌ماند. بعضی خوانندگان آن را آسان‌تر می‌یابند؛ تحقیقات نشان نداده است که به همه کمک می‌کند.',
    'ease.lettersElsewhere':
      'این قلم برای زبان این صفحه حرفی ندارد. در اینجا تنها متنی را تغییر می‌دهد که به زبانی با حروف لاتین یا سیریلیک نوشته شده باشد، مانند دوره‌ای که به انگلیسی تدریس می‌شود.',
    'ease.speech': 'درس را می‌توان با صدای بلند خواند.',
    'ease.speechNote':
      'توضیح درس و متن نوشتاری آن هر کدام دکمه‌ای دارند که آن را با صدای خود دستگاه شما می‌خواند، اگر دستگاه برای زبان درس صدایی داشته باشد. کلمات به هیچ جا فرستاده نمی‌شوند. جمله‌ای که آیتی با حرکت‌گذاری در آن نوشته شده کنار گذاشته می‌شود: آیت برای صدای ماشین نیست.',
    'ease.untested': 'با صفحه‌خوان آزمایش نشده است.',
    'ease.untestedNote':
      'سامانه برای کار با صفحه‌خوان ساخته شده است، اما هنوز کسی که به صفحه‌خوان تکیه دارد آن را نیازموده است. خواندن با صدای بلند نیز روی هر دستگاه شنیده نشده است.',
    'ease.read': 'با صدای بلند بخوان',
    'ease.stop': 'خواندن را متوقف کن',
    'ease.readNote':
      'با صدای خود دستگاه شما خوانده می‌شود. جمله‌ای که آیتی با حرکت‌گذاری در آن نوشته شده کنار گذاشته می‌شود.',
    'ease.noVoice': 'دستگاه شما برای زبان این درس صدایی ندارد.',
  },
  tr: {
    'ease.lettersLegend': 'Harfler',
    'ease.lettersNormal': 'Cihazınızdaki gibi',
    'ease.lettersNormalNote': 'Platformun geri kalanının kullandığı harfler.',
    'ease.lettersDyslexic': 'Disleksi için yapılmış bir yazı tipi',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: her harfin alt kısmı daha kalındır, böylece bir başkasıyla karıştırılması zorlaşır. Yalnızca Latin ve Kiril harflerini değiştirir; Arapça ve diğer bütün yazılar olduğu gibi kalır. Bazı okurlar onu daha kolay bulur; araştırmalar herkese yardımcı olduğunu göstermemiştir.',
    'ease.lettersElsewhere':
      'Yazı tipinde bu sayfanın dili için harf yok. Burada yalnızca Latin veya Kiril harfleriyle yazılan bir dildeki metni değiştirir; örneğin İngilizce verilen bir kursu.',
    'ease.speech': 'Bir ders sesli okunabilir.',
    'ease.speechNote':
      'Bir dersin açıklamasında ve yazılı metninde, onları cihazınızın kendi sesiyle okuyan birer düğme vardır; cihazda dersin dili için bir ses varsa. Sözcükler hiçbir yere gönderilmez. Harekeleriyle yazılmış bir ayet içeren cümle atlanır: ayet bir makinenin sesi için değildir.',
    'ease.untested': 'Ekran okuyucuyla denenmedi.',
    'ease.untestedNote':
      'Platform ekran okuyucuyla çalışacak biçimde kuruldu, ama ekran okuyucuya bağlı olan hiç kimse onu henüz denemedi. Sesli okuma da her cihazda dinlenmedi.',
    'ease.read': 'Sesli oku',
    'ease.stop': 'Okumayı durdur',
    'ease.readNote':
      'Cihazınızın kendi sesiyle okunur. Harekeleriyle yazılmış bir ayet içeren cümle atlanır.',
    'ease.noVoice': 'Cihazınızda bu dersin dili için bir ses yok.',
  },
  id: {
    'ease.lettersLegend': 'Huruf',
    'ease.lettersNormal': 'Seperti di perangkat Anda',
    'ease.lettersNormalNote': 'Huruf yang dipakai bagian lain platform.',
    'ease.lettersDyslexic': 'Fon yang dibuat untuk disleksia',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: setiap huruf lebih tebal di bagian bawah, sehingga lebih sulit tertukar dengan huruf lain. Fon ini hanya mengubah huruf Latin dan Kiril; huruf Arab dan semua aksara lain tetap seperti semula. Sebagian pembaca merasa lebih mudah; penelitian belum menunjukkan bahwa fon ini membantu semua orang.',
    'ease.lettersElsewhere':
      'Fon ini tidak memiliki huruf untuk bahasa halaman ini. Di sini fon hanya mengubah teks dalam bahasa yang ditulis dengan huruf Latin atau Kiril, misalnya kursus yang diajarkan dalam bahasa Inggris.',
    'ease.speech': 'Pelajaran dapat dibacakan.',
    'ease.speechNote':
      'Deskripsi pelajaran dan transkripnya masing-masing memiliki tombol yang membacakannya dengan suara perangkat Anda sendiri, jika perangkat memiliki suara untuk bahasa pelajaran itu. Kata-katanya tidak dikirim ke mana pun. Kalimat yang memuat ayat yang ditulis dengan harakat dilewati: ayat bukan untuk suara mesin.',
    'ease.untested': 'Belum diuji dengan pembaca layar.',
    'ease.untestedNote':
      'Platform dibuat agar dapat dipakai dengan pembaca layar, tetapi belum ada orang yang bergantung pada pembaca layar yang mengujinya. Pembacaan dengan suara juga belum didengar di setiap perangkat.',
    'ease.read': 'Bacakan',
    'ease.stop': 'Hentikan pembacaan',
    'ease.readNote':
      'Dibacakan dengan suara perangkat Anda sendiri. Kalimat yang memuat ayat yang ditulis dengan harakat dilewati.',
    'ease.noVoice': 'Perangkat Anda tidak memiliki suara untuk bahasa pelajaran ini.',
  },
  ms: {
    'ease.lettersLegend': 'Huruf',
    'ease.lettersNormal': 'Seperti pada peranti anda',
    'ease.lettersNormalNote': 'Huruf yang digunakan oleh bahagian lain platform.',
    'ease.lettersDyslexic': 'Fon yang dibuat untuk disleksia',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: setiap huruf lebih tebal di bahagian bawah, maka lebih sukar dikelirukan dengan huruf lain. Fon ini hanya mengubah huruf Latin dan Cyril; huruf Arab dan semua tulisan lain kekal seperti sedia ada. Sesetengah pembaca mendapatinya lebih mudah; kajian belum menunjukkan bahawa fon ini membantu semua orang.',
    'ease.lettersElsewhere':
      'Fon ini tiada huruf untuk bahasa halaman ini. Di sini fon hanya mengubah teks dalam bahasa yang ditulis dengan huruf Latin atau Cyril, contohnya kursus yang diajar dalam bahasa Inggeris.',
    'ease.speech': 'Pelajaran boleh dibacakan.',
    'ease.speechNote':
      'Huraian pelajaran dan transkripnya masing-masing mempunyai butang yang membacakannya dengan suara peranti anda sendiri, jika peranti mempunyai suara untuk bahasa pelajaran itu. Perkataannya tidak dihantar ke mana-mana. Ayat yang mengandungi ayat al-Quran yang ditulis berbaris dilangkau: ayat al-Quran bukan untuk suara mesin.',
    'ease.untested': 'Belum diuji dengan pembaca skrin.',
    'ease.untestedNote':
      'Platform dibina untuk berfungsi dengan pembaca skrin, tetapi belum ada sesiapa yang bergantung pada pembaca skrin yang mengujinya. Pembacaan dengan suara juga belum didengar pada setiap peranti.',
    'ease.read': 'Bacakan dengan suara',
    'ease.stop': 'Hentikan bacaan',
    'ease.readNote':
      'Dibacakan dengan suara peranti anda sendiri. Ayat yang mengandungi ayat al-Quran yang ditulis berbaris dilangkau.',
    'ease.noVoice': 'Peranti anda tiada suara untuk bahasa pelajaran ini.',
  },
  bn: {
    'ease.lettersLegend': 'অক্ষর',
    'ease.lettersNormal': 'আপনার ডিভাইসে যেমন আছে',
    'ease.lettersNormalNote': 'প্ল্যাটফর্মের বাকি অংশ যে অক্ষর ব্যবহার করে।',
    'ease.lettersDyslexic': 'ডিসলেক্সিয়ার জন্য তৈরি ফন্ট',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: প্রতিটি অক্ষরের নিচের দিক ভারী, তাই একটিকে আরেকটি বলে ভুল করা কঠিন। এটি কেবল লাতিন ও সিরিলিক অক্ষর বদলায়; আরবি ও অন্য সব লিপি যেমন আছে তেমনই থাকে। কিছু পাঠকের কাছে এটি সহজ লাগে; গবেষণায় দেখা যায়নি যে এটি সবার উপকারে আসে।',
    'ease.lettersElsewhere':
      'এই ফন্টে এই পাতার ভাষার অক্ষর নেই। এখানে এটি কেবল সেই লেখা বদলায় যা লাতিন বা সিরিলিক অক্ষরে লেখা হয় এমন ভাষায় আছে, যেমন ইংরেজিতে পড়ানো কোর্স।',
    'ease.speech': 'পাঠ জোরে পড়ে শোনানো যায়।',
    'ease.speechNote':
      'পাঠের বিবরণ ও তার লিখিত প্রতিলিপি, প্রতিটির সঙ্গে একটি বোতাম আছে যা আপনার ডিভাইসের নিজস্ব কণ্ঠে তা পড়ে শোনায়, যদি ডিভাইসে পাঠের ভাষার কণ্ঠ থাকে। শব্দগুলো কোথাও পাঠানো হয় না। যে বাক্যে হরকতসহ লেখা আয়াত আছে তা বাদ দেওয়া হয়: আয়াত যন্ত্রের কণ্ঠের জন্য নয়।',
    'ease.untested': 'স্ক্রিন রিডার দিয়ে পরীক্ষা করা হয়নি।',
    'ease.untestedNote':
      'প্ল্যাটফর্মটি স্ক্রিন রিডারের সঙ্গে কাজ করার জন্য তৈরি, তবে স্ক্রিন রিডারের ওপর নির্ভর করেন এমন কেউ এখনও এটি পরীক্ষা করেননি। জোরে পড়ে শোনানোও প্রতিটি ডিভাইসে শোনা হয়নি।',
    'ease.read': 'জোরে পড়ে শোনান',
    'ease.stop': 'পড়া থামান',
    'ease.readNote':
      'আপনার ডিভাইসের নিজস্ব কণ্ঠে পড়া হয়। যে বাক্যে হরকতসহ লেখা আয়াত আছে তা বাদ দেওয়া হয়।',
    'ease.noVoice': 'আপনার ডিভাইসে এই পাঠের ভাষার কোনো কণ্ঠ নেই।',
  },
  hi: {
    'ease.lettersLegend': 'अक्षर',
    'ease.lettersNormal': 'जैसे आपके डिवाइस में हैं',
    'ease.lettersNormalNote': 'वही अक्षर जो बाक़ी प्लेटफ़ॉर्म इस्तेमाल करता है।',
    'ease.lettersDyslexic': 'डिस्लेक्सिया के लिए बनाया गया फ़ॉन्ट',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: हर अक्षर नीचे से भारी है, इसलिए उसे किसी दूसरे अक्षर से मिला देना कठिन है। यह केवल लैटिन और सिरिलिक अक्षर बदलता है; अरबी और बाक़ी सभी लिपियाँ जैसी हैं वैसी रहती हैं। कुछ पाठकों को यह आसान लगता है; अध्ययनों से यह सिद्ध नहीं हुआ कि यह सबकी मदद करता है।',
    'ease.lettersElsewhere':
      'इस फ़ॉन्ट में इस पन्ने की भाषा के अक्षर नहीं हैं। यहाँ यह केवल उस पाठ को बदलता है जो लैटिन या सिरिलिक अक्षरों में लिखी जाने वाली भाषा में हो, जैसे अंग्रेज़ी में पढ़ाया जाने वाला कोर्स।',
    'ease.speech': 'पाठ ज़ोर से पढ़कर सुनाया जा सकता है।',
    'ease.speechNote':
      'पाठ के विवरण और उसके लिखित पाठ, दोनों के साथ एक बटन है जो उन्हें आपके डिवाइस की अपनी आवाज़ में पढ़ता है, यदि डिवाइस में पाठ की भाषा की आवाज़ हो। शब्द कहीं नहीं भेजे जाते। जिस वाक्य में एराब के साथ लिखी आयत हो, वह छोड़ दिया जाता है: आयत मशीन की आवाज़ के लिए नहीं है।',
    'ease.untested': 'स्क्रीन रीडर के साथ परखा नहीं गया।',
    'ease.untestedNote':
      'प्लेटफ़ॉर्म को स्क्रीन रीडर के साथ काम करने के लिए बनाया गया है, पर स्क्रीन रीडर पर निर्भर किसी व्यक्ति ने अभी तक इसे परखा नहीं है। ज़ोर से पढ़ना भी हर डिवाइस पर सुना नहीं गया है।',
    'ease.read': 'ज़ोर से पढ़ें',
    'ease.stop': 'पढ़ना रोकें',
    'ease.readNote':
      'आपके डिवाइस की अपनी आवाज़ में पढ़ा जाता है। जिस वाक्य में एराब के साथ लिखी आयत हो, वह छोड़ दिया जाता है।',
    'ease.noVoice': 'आपके डिवाइस में इस पाठ की भाषा की कोई आवाज़ नहीं है।',
  },
  fr: {
    'ease.lettersLegend': 'Lettres',
    'ease.lettersNormal': 'Comme sur votre appareil',
    'ease.lettersNormalNote': 'Les lettres qu’utilise le reste de la plateforme.',
    'ease.lettersDyslexic': 'Une police conçue pour la dyslexie',
    'ease.lettersDyslexicNote':
      'OpenDyslexic : chaque lettre est plus épaisse en bas, ce qui la rend plus difficile à confondre avec une autre. Elle ne change que les lettres latines et cyrilliques ; l’arabe et toutes les autres écritures restent tels quels. Certains lecteurs la trouvent plus facile ; les études n’ont pas montré qu’elle aide tout le monde.',
    'ease.lettersElsewhere':
      'La police n’a pas de lettres pour la langue de cette page. Ici, elle ne change que le texte dans une langue écrite en lettres latines ou cyrilliques, par exemple un cours donné en anglais.',
    'ease.speech': 'Une leçon peut être lue à voix haute.',
    'ease.speechNote':
      'La description d’une leçon et sa transcription ont chacune un bouton qui les lit avec la voix de votre appareil, si l’appareil a une voix pour la langue de la leçon. Les mots ne sont envoyés nulle part. Une phrase qui contient un verset écrit avec ses voyelles est laissée de côté : un verset n’est pas fait pour la voix d’une machine.',
    'ease.untested': 'Non testée avec un lecteur d’écran.',
    'ease.untestedNote':
      'La plateforme est construite pour fonctionner avec un lecteur d’écran, mais aucune personne qui en dépend ne l’a encore essayée. La lecture à voix haute n’a pas non plus été écoutée sur tous les appareils.',
    'ease.read': 'Lire à voix haute',
    'ease.stop': 'Arrêter la lecture',
    'ease.readNote':
      'Lu par la voix de votre appareil. Une phrase qui contient un verset écrit avec ses voyelles est laissée de côté.',
    'ease.noVoice': 'Votre appareil n’a pas de voix pour la langue de cette leçon.',
  },
  es: {
    'ease.lettersLegend': 'Letras',
    'ease.lettersNormal': 'Como en tu dispositivo',
    'ease.lettersNormalNote': 'Las letras que usa el resto de la plataforma.',
    'ease.lettersDyslexic': 'Una tipografía hecha para la dislexia',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: cada letra es más gruesa por abajo, de modo que es más difícil confundirla con otra. Solo cambia las letras latinas y cirílicas; el árabe y todas las demás escrituras quedan como están. A algunos lectores les resulta más fácil; los estudios no han demostrado que ayude a todos.',
    'ease.lettersElsewhere':
      'La tipografía no tiene letras para el idioma de esta página. Aquí solo cambia el texto en un idioma que se escribe con letras latinas o cirílicas, por ejemplo un curso impartido en inglés.',
    'ease.speech': 'Una lección puede leerse en voz alta.',
    'ease.speechNote':
      'La descripción de una lección y su transcripción tienen cada una un botón que las lee con la voz de tu propio dispositivo, si el dispositivo tiene una voz para el idioma de la lección. Las palabras no se envían a ninguna parte. Una frase que contiene una aleya escrita con sus vocales se omite: una aleya no es para la voz de una máquina.',
    'ease.untested': 'No se ha probado con un lector de pantalla.',
    'ease.untestedNote':
      'La plataforma está construida para funcionar con un lector de pantalla, pero todavía no la ha probado nadie que dependa de uno. La lectura en voz alta tampoco se ha escuchado en todos los dispositivos.',
    'ease.read': 'Leer en voz alta',
    'ease.stop': 'Detener la lectura',
    'ease.readNote':
      'Leído con la voz de tu propio dispositivo. Una frase que contiene una aleya escrita con sus vocales se omite.',
    'ease.noVoice': 'Tu dispositivo no tiene una voz para el idioma de esta lección.',
  },
  pt: {
    'ease.lettersLegend': 'Letras',
    'ease.lettersNormal': 'Como no seu dispositivo',
    'ease.lettersNormalNote': 'As letras que o resto da plataforma usa.',
    'ease.lettersDyslexic': 'Um tipo de letra feito para a dislexia',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: cada letra é mais grossa em baixo, pelo que é mais difícil confundi-la com outra. Só altera as letras latinas e cirílicas; o árabe e todas as outras escritas ficam como estão. Alguns leitores acham-no mais fácil; os estudos não mostraram que ajude toda a gente.',
    'ease.lettersElsewhere':
      'O tipo de letra não tem letras para a língua desta página. Aqui só altera o texto numa língua escrita com letras latinas ou cirílicas, por exemplo um curso dado em inglês.',
    'ease.speech': 'Uma lição pode ser lida em voz alta.',
    'ease.speechNote':
      'A descrição de uma lição e a sua transcrição têm cada uma um botão que as lê com a voz do seu próprio dispositivo, se o dispositivo tiver uma voz para a língua da lição. As palavras não são enviadas para lado nenhum. Uma frase que contenha um versículo escrito com as suas vogais é deixada de fora: um versículo não é para a voz de uma máquina.',
    'ease.untested': 'Não foi testada com um leitor de ecrã.',
    'ease.untestedNote':
      'A plataforma foi construída para funcionar com um leitor de ecrã, mas ainda ninguém que dependa de um a experimentou. A leitura em voz alta também não foi ouvida em todos os dispositivos.',
    'ease.read': 'Ler em voz alta',
    'ease.stop': 'Parar a leitura',
    'ease.readNote':
      'Lido com a voz do seu próprio dispositivo. Uma frase que contenha um versículo escrito com as suas vogais é deixada de fora.',
    'ease.noVoice': 'O seu dispositivo não tem uma voz para a língua desta lição.',
  },
  sw: {
    'ease.lettersLegend': 'Herufi',
    'ease.lettersNormal': 'Kama zilivyo kwenye kifaa chako',
    'ease.lettersNormalNote': 'Herufi zinazotumiwa na sehemu nyingine za jukwaa.',
    'ease.lettersDyslexic': 'Fonti iliyotengenezwa kwa ajili ya disleksia',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: kila herufi ni nzito zaidi chini, kwa hiyo ni vigumu kuichanganya na nyingine. Inabadilisha herufi za Kilatini na Kisirili pekee; Kiarabu na maandishi mengine yote hubaki kama yalivyo. Baadhi ya wasomaji huiona rahisi zaidi; tafiti hazijaonyesha kwamba inamsaidia kila mtu.',
    'ease.lettersElsewhere':
      'Fonti hii haina herufi za lugha ya ukurasa huu. Hapa inabadilisha tu maandishi yaliyo katika lugha inayoandikwa kwa herufi za Kilatini au Kisirili, kwa mfano kozi inayofundishwa kwa Kiingereza.',
    'ease.speech': 'Somo linaweza kusomwa kwa sauti.',
    'ease.speechNote':
      'Maelezo ya somo na nakala yake ya maandishi kila moja ina kitufe kinachoyasoma kwa sauti ya kifaa chako chenyewe, iwapo kifaa kina sauti ya lugha ya somo. Maneno hayatumwi popote. Sentensi yenye aya iliyoandikwa kwa irabu zake huachwa: aya si ya sauti ya mashine.',
    'ease.untested': 'Halijajaribiwa kwa kisoma skrini.',
    'ease.untestedNote':
      'Jukwaa limejengwa ili kufanya kazi na kisoma skrini, lakini bado hakuna mtu anayekitegemea aliyelijaribu. Kusoma kwa sauti pia hakujasikilizwa kwenye kila kifaa.',
    'ease.read': 'Soma kwa sauti',
    'ease.stop': 'Acha kusoma',
    'ease.readNote':
      'Husomwa kwa sauti ya kifaa chako chenyewe. Sentensi yenye aya iliyoandikwa kwa irabu zake huachwa.',
    'ease.noVoice': 'Kifaa chako hakina sauti ya lugha ya somo hili.',
  },
  af: {
    'ease.lettersLegend': 'Lettervorm',
    'ease.lettersNormal': 'Soos op jou toestel',
    'ease.lettersNormalNote': 'Die letters wat die res van die platform gebruik.',
    'ease.lettersDyslexic': '’n Lettertipe wat vir disleksie gemaak is',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: elke letter is swaarder aan die onderkant, sodat dit moeiliker met ’n ander verwar word. Dit verander slegs Latynse en Cyrilliese letters; Arabies en elke ander skrif bly soos dit is. Party lesers vind dit makliker; studies het nie getoon dat dit almal help nie.',
    'ease.lettersElsewhere':
      'Die lettertipe het geen letters vir hierdie bladsy se taal nie. Hier verander dit net teks in ’n taal wat met Latynse of Cyrilliese letters geskryf word, byvoorbeeld ’n kursus wat in Engels aangebied word.',
    'ease.speech': '’n Les kan hardop gelees word.',
    'ease.speechNote':
      '’n Les se beskrywing en sy transkripsie het elk ’n knoppie wat dit in jou toestel se eie stem lees, waar die toestel ’n stem vir die les se taal het. Die woorde word nêrens heen gestuur nie. ’n Sin wat ’n vers bevat wat met sy vokaaltekens geskryf is, word uitgelaat: ’n vers is nie vir ’n masjien se stem nie.',
    'ease.untested': 'Nie met ’n skermleser getoets nie.',
    'ease.untestedNote':
      'Die platform is gebou om met ’n skermleser te werk, maar niemand wat op een staatmaak, het dit nog getoets nie. Hardop lees is ook nog nie op elke toestel gehoor nie.',
    'ease.read': 'Lees hardop',
    'ease.stop': 'Hou op lees',
    'ease.readNote':
      'Gelees deur jou toestel se eie stem. ’n Sin wat ’n vers bevat wat met sy vokaaltekens geskryf is, word uitgelaat.',
    'ease.noVoice': 'Jou toestel het geen stem vir hierdie les se taal nie.',
  },
  'zh-hans': {
    'ease.lettersLegend': '字形',
    'ease.lettersNormal': '与设备相同',
    'ease.lettersNormalNote': '平台其他部分使用的字形。',
    'ease.lettersDyslexic': '为阅读障碍设计的字体',
    'ease.lettersDyslexicNote':
      'OpenDyslexic：每个字母的底部更粗，因此不容易与别的字母混淆。它只改变拉丁字母和西里尔字母；阿拉伯文和其他所有文字保持原样。有些读者觉得它更容易读；研究并未表明它对所有人都有帮助。',
    'ease.lettersElsewhere': '这种字体没有本页语言的文字。在这里，它只改变用拉丁字母或西里尔字母书写的语言的文本，例如用英语讲授的课程。',
    'ease.speech': '课程可以朗读。',
    'ease.speechNote':
      '课程的简介和文字稿各有一个按钮，用你设备自带的语音朗读，前提是设备有该课程语言的语音。文字不会发送到任何地方。含有带读音符号的经文的句子会被略过：经文不应由机器的声音来读。',
    'ease.untested': '尚未用屏幕阅读器测试。',
    'ease.untestedNote': '平台是按照可配合屏幕阅读器使用来搭建的，但还没有依赖屏幕阅读器的人测试过。朗读功能也没有在每一种设备上听过。',
    'ease.read': '朗读',
    'ease.stop': '停止朗读',
    'ease.readNote': '由你设备自带的语音朗读。含有带读音符号的经文的句子会被略过。',
    'ease.noVoice': '你的设备没有这节课语言的语音。',
  },
  'zh-hant': {
    'ease.lettersLegend': '字形',
    'ease.lettersNormal': '與裝置相同',
    'ease.lettersNormalNote': '平台其他部分使用的字形。',
    'ease.lettersDyslexic': '為閱讀障礙設計的字型',
    'ease.lettersDyslexicNote':
      'OpenDyslexic：每個字母的底部較粗，因此不容易與別的字母混淆。它只改變拉丁字母和西里爾字母；阿拉伯文和其他所有文字維持原樣。有些讀者覺得它比較容易讀；研究並未顯示它對所有人都有幫助。',
    'ease.lettersElsewhere': '這種字型沒有本頁語言的文字。在這裡，它只改變以拉丁字母或西里爾字母書寫的語言的文字，例如以英語講授的課程。',
    'ease.speech': '課程可以朗讀。',
    'ease.speechNote':
      '課程的簡介和文字稿各有一個按鈕，用你裝置內建的語音朗讀，前提是裝置有該課程語言的語音。文字不會傳送到任何地方。含有帶讀音符號的經文的句子會被略過：經文不應由機器的聲音來讀。',
    'ease.untested': '尚未用螢幕閱讀器測試。',
    'ease.untestedNote': '平台是按照可搭配螢幕閱讀器使用來建立的，但還沒有依賴螢幕閱讀器的人測試過。朗讀功能也沒有在每一種裝置上聽過。',
    'ease.read': '朗讀',
    'ease.stop': '停止朗讀',
    'ease.readNote': '由你裝置內建的語音朗讀。含有帶讀音符號的經文的句子會被略過。',
    'ease.noVoice': '你的裝置沒有這堂課語言的語音。',
  },
  vi: {
    'ease.lettersLegend': 'Chữ',
    'ease.lettersNormal': 'Như trên thiết bị của bạn',
    'ease.lettersNormalNote': 'Kiểu chữ mà phần còn lại của nền tảng dùng.',
    'ease.lettersDyslexic': 'Phông chữ làm cho người mắc chứng khó đọc',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: mỗi chữ cái đậm hơn ở phần dưới, nên khó nhầm với chữ khác hơn. Phông này chỉ thay đổi chữ Latinh và chữ Kirin; chữ Ả Rập và mọi hệ chữ khác vẫn giữ nguyên. Một số người đọc thấy dễ hơn; các nghiên cứu chưa cho thấy nó giúp được tất cả mọi người.',
    'ease.lettersElsewhere':
      'Phông chữ này không có chữ cho ngôn ngữ của trang này. Ở đây nó chỉ thay đổi văn bản bằng ngôn ngữ viết bằng chữ Latinh hoặc chữ Kirin, chẳng hạn một khóa học dạy bằng tiếng Anh.',
    'ease.speech': 'Bài học có thể được đọc to.',
    'ease.speechNote':
      'Phần mô tả bài học và bản ghi lời của nó đều có một nút để đọc bằng chính giọng của thiết bị bạn, nếu thiết bị có giọng cho ngôn ngữ của bài học. Lời văn không được gửi đi đâu cả. Câu nào chứa một câu kinh viết kèm dấu nguyên âm thì được bỏ qua: câu kinh không dành cho giọng của máy.',
    'ease.untested': 'Chưa được thử với trình đọc màn hình.',
    'ease.untestedNote':
      'Nền tảng được dựng để hoạt động với trình đọc màn hình, nhưng chưa có ai phụ thuộc vào trình đọc màn hình thử nghiệm nó. Việc đọc to cũng chưa được nghe trên mọi thiết bị.',
    'ease.read': 'Đọc to',
    'ease.stop': 'Dừng đọc',
    'ease.readNote':
      'Được đọc bằng chính giọng của thiết bị bạn. Câu nào chứa một câu kinh viết kèm dấu nguyên âm thì được bỏ qua.',
    'ease.noVoice': 'Thiết bị của bạn không có giọng cho ngôn ngữ của bài học này.',
  },
  th: {
    'ease.lettersLegend': 'ตัวอักษร',
    'ease.lettersNormal': 'ตามอุปกรณ์ของคุณ',
    'ease.lettersNormalNote': 'ตัวอักษรที่ส่วนอื่นของแพลตฟอร์มใช้',
    'ease.lettersDyslexic': 'แบบอักษรที่ออกแบบสำหรับภาวะอ่านลำบาก',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: ตัวอักษรแต่ละตัวหนากว่าที่ส่วนล่าง จึงสับสนกับตัวอื่นได้ยากขึ้น แบบอักษรนี้เปลี่ยนเฉพาะอักษรละตินและอักษรซีริลลิก ส่วนอักษรอาหรับและอักษรอื่นทั้งหมดยังคงเดิม ผู้อ่านบางคนรู้สึกว่าอ่านง่ายขึ้น แต่งานวิจัยยังไม่ได้แสดงว่าช่วยได้ทุกคน',
    'ease.lettersElsewhere':
      'แบบอักษรนี้ไม่มีตัวอักษรสำหรับภาษาของหน้านี้ ในหน้านี้แบบอักษรจะเปลี่ยนเฉพาะข้อความในภาษาที่เขียนด้วยอักษรละตินหรืออักษรซีริลลิก เช่น หลักสูตรที่สอนเป็นภาษาอังกฤษ',
    'ease.speech': 'บทเรียนอ่านออกเสียงได้',
    'ease.speechNote':
      'คำอธิบายบทเรียนและบทถอดความแต่ละส่วนมีปุ่มที่อ่านออกเสียงด้วยเสียงของอุปกรณ์คุณเอง หากอุปกรณ์มีเสียงสำหรับภาษาของบทเรียน ข้อความไม่ถูกส่งไปที่ใด ประโยคที่มีอายะฮ์ซึ่งเขียนพร้อมเครื่องหมายสระจะถูกข้ามไป เพราะอายะฮ์ไม่ใช่สิ่งที่ควรอ่านด้วยเสียงของเครื่อง',
    'ease.untested': 'ยังไม่ได้ทดสอบกับโปรแกรมอ่านหน้าจอ',
    'ease.untestedNote':
      'แพลตฟอร์มสร้างขึ้นให้ทำงานกับโปรแกรมอ่านหน้าจอได้ แต่ยังไม่มีผู้ที่พึ่งพาโปรแกรมอ่านหน้าจอทดสอบ การอ่านออกเสียงก็ยังไม่ได้ฟังบนทุกอุปกรณ์เช่นกัน',
    'ease.read': 'อ่านออกเสียง',
    'ease.stop': 'หยุดอ่าน',
    'ease.readNote': 'อ่านด้วยเสียงของอุปกรณ์คุณเอง ประโยคที่มีอายะฮ์ซึ่งเขียนพร้อมเครื่องหมายสระจะถูกข้ามไป',
    'ease.noVoice': 'อุปกรณ์ของคุณไม่มีเสียงสำหรับภาษาของบทเรียนนี้',
  },
  fil: {
    'ease.lettersLegend': 'Mga titik',
    'ease.lettersNormal': 'Gaya ng nasa device mo',
    'ease.lettersNormalNote': 'Ang mga titik na ginagamit ng iba pang bahagi ng platform.',
    'ease.lettersDyslexic': 'Font na ginawa para sa dyslexia',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: mas mabigat ang ibaba ng bawat titik, kaya mas mahirap itong mapagkamalang iba. Mga titik na Latin at Cyrillic lamang ang binabago nito; ang Arabe at lahat ng iba pang sulat ay nananatiling gaya ng dati. May mga mambabasang nadadalian dito; hindi pa naipapakita ng mga pag-aaral na nakatutulong ito sa lahat.',
    'ease.lettersElsewhere':
      'Walang mga titik ang font na ito para sa wika ng pahinang ito. Dito, binabago lamang nito ang tekstong nasa wikang isinusulat sa mga titik na Latin o Cyrillic, halimbawa isang kursong itinuturo sa Ingles.',
    'ease.speech': 'Maaaring basahin nang malakas ang aralin.',
    'ease.speechNote':
      'Ang paglalarawan ng aralin at ang transcript nito ay may kani-kaniyang button na bumabasa sa mga ito sa sariling boses ng device mo, kung may boses ang device para sa wika ng aralin. Walang pinadadalhan ng mga salita. Nilalaktawan ang pangungusap na may talata ng Quran na isinulat nang may mga tanda ng patinig: ang talata ng Quran ay hindi para sa boses ng makina.',
    'ease.untested': 'Hindi pa nasusubok gamit ang screen reader.',
    'ease.untestedNote':
      'Ginawa ang platform upang gumana sa screen reader, ngunit wala pang taong umaasa sa screen reader ang sumubok dito. Hindi pa rin napakikinggan sa bawat device ang pagbasa nang malakas.',
    'ease.read': 'Basahin nang malakas',
    'ease.stop': 'Ihinto ang pagbasa',
    'ease.readNote':
      'Binabasa ng sariling boses ng device mo. Nilalaktawan ang pangungusap na may talata ng Quran na isinulat nang may mga tanda ng patinig.',
    'ease.noVoice': 'Walang boses ang device mo para sa wika ng araling ito.',
  },
  uz: {
    'ease.lettersLegend': 'Harflar',
    'ease.lettersNormal': 'Qurilmangizdagidek',
    'ease.lettersNormalNote': 'Platformaning qolgan qismi ishlatadigan harflar.',
    'ease.lettersDyslexic': 'Disleksiya uchun yaratilgan shrift',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: har bir harfning pastki qismi ogʻirroq, shuning uchun uni boshqasi bilan adashtirish qiyinroq. U faqat lotin va kirill harflarini oʻzgartiradi; arab yozuvi va boshqa barcha yozuvlar oʻzgarmaydi. Baʼzi oʻquvchilarga u osonroq tuyuladi; tadqiqotlar uning hammaga yordam berishini koʻrsatmagan.',
    'ease.lettersElsewhere':
      'Bu shriftda ushbu sahifa tilining harflari yoʻq. Bu yerda u faqat lotin yoki kirill harflarida yoziladigan tildagi matnni oʻzgartiradi, masalan, ingliz tilida oʻqitiladigan kursni.',
    'ease.speech': 'Darsni ovoz chiqarib oʻqitish mumkin.',
    'ease.speechNote':
      'Dars tavsifi va uning yozma matni yonida ularni qurilmangizning oʻz ovozi bilan oʻqiydigan tugma bor, agar qurilmada dars tili uchun ovoz boʻlsa. Soʻzlar hech qayerga yuborilmaydi. Harakatlari bilan yozilgan oyat bor gap tashlab ketiladi: oyat mashina ovozi uchun emas.',
    'ease.untested': 'Ekran oʻquvchi dastur bilan sinalmagan.',
    'ease.untestedNote':
      'Platforma ekran oʻquvchi dastur bilan ishlaydigan qilib qurilgan, lekin unga tayanadigan hech kim uni hali sinab koʻrmagan. Ovoz chiqarib oʻqish ham har bir qurilmada eshitib koʻrilmagan.',
    'ease.read': 'Ovoz chiqarib oʻqish',
    'ease.stop': 'Oʻqishni toʻxtatish',
    'ease.readNote':
      'Qurilmangizning oʻz ovozi bilan oʻqiladi. Harakatlari bilan yozilgan oyat bor gap tashlab ketiladi.',
    'ease.noVoice': 'Qurilmangizda bu dars tili uchun ovoz yoʻq.',
  },
  kk: {
    'ease.lettersLegend': 'Әріптер',
    'ease.lettersNormal': 'Құрылғыңыздағыдай',
    'ease.lettersNormalNote': 'Платформаның қалған бөлігі қолданатын әріптер.',
    'ease.lettersDyslexic': 'Дислексияға арналған қаріп',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: әр әріптің төменгі жағы ауырлау, сондықтан оны басқасымен шатастыру қиынырақ. Ол тек латын және кирилл әріптерін өзгертеді; араб жазуы мен басқа жазулардың бәрі сол күйінде қалады. Кейбір оқырмандарға ол жеңілірек көрінеді; зерттеулер оның бәріне көмектесетінін көрсеткен жоқ.',
    'ease.lettersElsewhere':
      'Бұл қаріпте осы беттің тілінің әріптері жоқ. Мұнда ол тек латын немесе кирилл әріптерімен жазылатын тілдегі мәтінді өзгертеді, мысалы, ағылшын тілінде оқытылатын курсты.',
    'ease.speech': 'Сабақты дауыстап оқытуға болады.',
    'ease.speechNote':
      'Сабақтың сипаттамасы мен жазбаша мәтінінің әрқайсысында оны құрылғыңыздың өз даусымен оқитын түйме бар, егер құрылғыда сабақ тіліне арналған дауыс болса. Сөздер еш жерге жіберілмейді. Харекеттерімен жазылған аят бар сөйлем қалдырылады: аят машина даусына арналмаған.',
    'ease.untested': 'Экраннан оқу бағдарламасымен сыналмаған.',
    'ease.untestedNote':
      'Платформа экраннан оқу бағдарламасымен жұмыс істейтіндей жасалған, бірақ оған сүйенетін ешкім оны әлі сынап көрген жоқ. Дауыстап оқу да әр құрылғыда тыңдалып көрілген жоқ.',
    'ease.read': 'Дауыстап оқу',
    'ease.stop': 'Оқуды тоқтату',
    'ease.readNote': 'Құрылғыңыздың өз даусымен оқылады. Харекеттерімен жазылған аят бар сөйлем қалдырылады.',
    'ease.noVoice': 'Құрылғыңызда бұл сабақтың тіліне арналған дауыс жоқ.',
  },
  az: {
    'ease.lettersLegend': 'Hərflər',
    'ease.lettersNormal': 'Cihazınızdakı kimi',
    'ease.lettersNormalNote': 'Platformanın qalan hissəsinin istifadə etdiyi hərflər.',
    'ease.lettersDyslexic': 'Disleksiya üçün hazırlanmış şrift',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: hər hərfin aşağı hissəsi daha qalındır, ona görə onu başqası ilə qarışdırmaq çətinləşir. O yalnız latın və kiril hərflərini dəyişir; ərəb yazısı və bütün digər yazılar olduğu kimi qalır. Bəzi oxucular onu daha asan sayır; araşdırmalar onun hamıya kömək etdiyini göstərməyib.',
    'ease.lettersElsewhere':
      'Bu şriftdə bu səhifənin dili üçün hərf yoxdur. Burada o yalnız latın və ya kiril hərfləri ilə yazılan dildəki mətni dəyişir, məsələn, ingilis dilində tədris olunan kursu.',
    'ease.speech': 'Dərs ucadan oxuna bilər.',
    'ease.speechNote':
      'Dərsin təsvirinin və yazılı mətninin hər birində onu cihazınızın öz səsi ilə oxuyan düymə var, əgər cihazda dərsin dili üçün səs varsa. Sözlər heç yerə göndərilmir. Hərəkələri ilə yazılmış ayə olan cümlə buraxılır: ayə maşının səsi üçün deyil.',
    'ease.untested': 'Ekran oxuyucusu ilə sınanmayıb.',
    'ease.untestedNote':
      'Platforma ekran oxuyucusu ilə işləmək üçün qurulub, lakin ondan asılı olan heç kim onu hələ sınamayıb. Ucadan oxuma da hər cihazda dinlənilməyib.',
    'ease.read': 'Ucadan oxu',
    'ease.stop': 'Oxumanı dayandır',
    'ease.readNote': 'Cihazınızın öz səsi ilə oxunur. Hərəkələri ilə yazılmış ayə olan cümlə buraxılır.',
    'ease.noVoice': 'Cihazınızda bu dərsin dili üçün səs yoxdur.',
  },
  tg: {
    'ease.lettersLegend': 'Ҳарфҳо',
    'ease.lettersNormal': 'Чунон ки дар дастгоҳи шумост',
    'ease.lettersNormalNote': 'Ҳарфҳое, ки боқимондаи платформа истифода мебарад.',
    'ease.lettersDyslexic': 'Ҳуруфе, ки барои дислексия сохта шудааст',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: қисми поёни ҳар ҳарф вазнинтар аст, аз ин рӯ онро бо ҳарфи дигар омехтан душвортар аст. Он танҳо ҳарфҳои лотинӣ ва кириллиро тағйир медиҳад; хати арабӣ ва ҳамаи хатҳои дигар чунон ки ҳастанд мемонанд. Ба баъзе хонандагон он осонтар менамояд; таҳқиқот нишон надодааст, ки он ба ҳама кумак мекунад.',
    'ease.lettersElsewhere':
      'Ин ҳуруф барои забони ин саҳифа ҳарф надорад. Дар ин ҷо он танҳо матнеро тағйир медиҳад, ки бо забони бо ҳарфҳои лотинӣ ё кириллӣ навишташаванда бошад, масалан, курсе, ки бо забони англисӣ таълим дода мешавад.',
    'ease.speech': 'Дарсро бо овози баланд хондан мумкин аст.',
    'ease.speechNote':
      'Тавсифи дарс ва матни хаттии он ҳар кадом тугмае доранд, ки онро бо овози худи дастгоҳи шумо мехонад, агар дастгоҳ барои забони дарс овоз дошта бошад. Калимаҳо ба ҳеҷ ҷо фиристода намешаванд. Ҷумлае, ки дар он ояти бо ҳаракатҳо навишташуда ҳаст, партофта мешавад: оят барои овози мошин нест.',
    'ease.untested': 'Бо барномаи хонандаи экран озмуда нашудааст.',
    'ease.untestedNote':
      'Платформа барои кор бо барномаи хонандаи экран сохта шудааст, вале ҳанӯз касе, ки ба чунин барнома такя мекунад, онро наозмудааст. Хондан бо овози баланд низ дар ҳар дастгоҳ шунида нашудааст.',
    'ease.read': 'Бо овози баланд хондан',
    'ease.stop': 'Қатъ кардани хониш',
    'ease.readNote':
      'Бо овози худи дастгоҳи шумо хонда мешавад. Ҷумлае, ки дар он ояти бо ҳаракатҳо навишташуда ҳаст, партофта мешавад.',
    'ease.noVoice': 'Дастгоҳи шумо барои забони ин дарс овоз надорад.',
  },
  ky: {
    'ease.lettersLegend': 'Тамгалар',
    'ease.lettersNormal': 'Түзмөгүңүздөгүдөй',
    'ease.lettersNormalNote': 'Платформанын калган бөлүгү колдонгон тамгалар.',
    'ease.lettersDyslexic': 'Дислексия үчүн жасалган арип',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: ар бир тамганын асты оорураак, ошондуктан аны башкасы менен чаташтыруу кыйыныраак. Ал латын жана кирилл тамгаларын гана өзгөртөт; араб жазуусу жана башка бардык жазуулар ошол бойдон калат. Айрым окурмандарга ал жеңилирээк көрүнөт; изилдөөлөр анын баарына жардам берерин көрсөткөн эмес.',
    'ease.lettersElsewhere':
      'Бул арипте ушул барактын тилинин тамгалары жок. Бул жерде ал латын же кирилл тамгалары менен жазылган тилдеги текстти гана өзгөртөт, мисалы, англис тилинде окутулган курсту.',
    'ease.speech': 'Сабакты үн чыгарып окутса болот.',
    'ease.speechNote':
      'Сабактын сүрөттөмөсүнүн жана жазуу түрүндөгү текстинин ар биринде аны түзмөгүңүздүн өз үнү менен окуган баскыч бар, эгер түзмөктө сабактын тили үчүн үн болсо. Сөздөр эч жакка жөнөтүлбөйт. Харакаттары менен жазылган аят бар сүйлөм калтырылат: аят машинанын үнү үчүн эмес.',
    'ease.untested': 'Экрандан окуу программасы менен сыналган эмес.',
    'ease.untestedNote':
      'Платформа экрандан окуу программасы менен иштей тургандай курулган, бирок ага таянган эч ким аны азырынча сынап көрө элек. Үн чыгарып окуу да ар бир түзмөктө угулуп көрө элек.',
    'ease.read': 'Үн чыгарып окуу',
    'ease.stop': 'Окууну токтотуу',
    'ease.readNote':
      'Түзмөгүңүздүн өз үнү менен окулат. Харакаттары менен жазылган аят бар сүйлөм калтырылат.',
    'ease.noVoice': 'Түзмөгүңүздө бул сабактын тили үчүн үн жок.',
  },
  tk: {
    'ease.lettersLegend': 'Harplar',
    'ease.lettersNormal': 'Enjamyňyzdaky ýaly',
    'ease.lettersNormalNote': 'Platformanyň galan böleginiň ulanýan harplary.',
    'ease.lettersDyslexic': 'Disleksiýa üçin ýasalan şrift',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: her harpyň aşaky bölegi agyrrak, şonuň üçin ony başgasy bilen garyşdyrmak kynrak. Ol diňe latyn we kiril harplaryny üýtgedýär; arap ýazuwy we beýleki ähli ýazuwlar öňküsi ýaly galýar. Käbir okyjylara ol aňsadrak görünýär; barlaglar onuň hemmelere kömek edýändigini görkezmedi.',
    'ease.lettersElsewhere':
      'Bu şriftde şu sahypanyň diliniň harplary ýok. Bu ýerde ol diňe latyn ýa-da kiril harplary bilen ýazylýan dildäki teksti üýtgedýär, mysal üçin, iňlis dilinde okadylýan kursy.',
    'ease.speech': 'Sapagy sesli okadyp bolýar.',
    'ease.speechNote':
      'Sapagyň beýanynyň we ýazuw tekstiniň her birinde ony enjamyňyzyň öz sesi bilen okaýan düwme bar, eger enjamda sapagyň dili üçin ses bar bolsa. Sözler hiç ýere iberilmeýär. Hereketleri bilen ýazylan aýat bar sözlem goýberilýär: aýat maşynyň sesi üçin däl.',
    'ease.untested': 'Ekran okaýjy bilen synalmady.',
    'ease.untestedNote':
      'Platforma ekran okaýjy bilen işlär ýaly guruldy, ýöne oňa bil baglaýan hiç kim ony entek synap görmedi. Sesli okamak hem her enjamda diňlenip görülmedi.',
    'ease.read': 'Sesli oka',
    'ease.stop': 'Okamagy bes et',
    'ease.readNote':
      'Enjamyňyzyň öz sesi bilen okalýar. Hereketleri bilen ýazylan aýat bar sözlem goýberilýär.',
    'ease.noVoice': 'Enjamyňyzda bu sapagyň dili üçin ses ýok.',
  },
  ta: {
    'ease.lettersLegend': 'எழுத்துகள்',
    'ease.lettersNormal': 'உங்கள் சாதனத்தில் உள்ளபடி',
    'ease.lettersNormalNote': 'தளத்தின் மற்ற பகுதிகள் பயன்படுத்தும் எழுத்துகள்.',
    'ease.lettersDyslexic': 'வாசிப்புக் குறைபாட்டுக்காக உருவாக்கப்பட்ட எழுத்துரு',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: ஒவ்வொரு எழுத்தும் அடிப்பகுதியில் கனமாக உள்ளது; அதனால் அதை வேறொன்றாகத் தவறாகக் கருதுவது கடினம். இது லத்தீன் மற்றும் சிரிலிக் எழுத்துகளை மட்டுமே மாற்றுகிறது; அரபியும் மற்ற எல்லா எழுத்துமுறைகளும் அப்படியே இருக்கும். சில வாசகர்களுக்கு இது எளிதாக இருக்கிறது; இது எல்லோருக்கும் உதவுகிறது என்று ஆய்வுகள் காட்டவில்லை.',
    'ease.lettersElsewhere':
      'இந்த எழுத்துருவில் இந்தப் பக்கத்தின் மொழிக்கான எழுத்துகள் இல்லை. இங்கே அது லத்தீன் அல்லது சிரிலிக் எழுத்துகளில் எழுதப்படும் மொழியில் உள்ள உரையை மட்டுமே மாற்றுகிறது; எடுத்துக்காட்டாக, ஆங்கிலத்தில் கற்பிக்கப்படும் பாடநெறி.',
    'ease.speech': 'பாடத்தை உரக்க வாசிக்கச் செய்யலாம்.',
    'ease.speechNote':
      'பாடத்தின் விளக்கத்துக்கும் அதன் எழுத்துப் படிவத்துக்கும் தனித்தனியே ஒரு பொத்தான் உள்ளது; உங்கள் சாதனத்தில் பாடத்தின் மொழிக்கான குரல் இருந்தால், அது உங்கள் சாதனத்தின் சொந்தக் குரலில் அவற்றை வாசிக்கும். சொற்கள் எங்கும் அனுப்பப்படுவதில்லை. உயிர்க்குறிகளுடன் எழுதப்பட்ட வசனம் உள்ள வாக்கியம் விடப்படும்: வசனம் இயந்திரத்தின் குரலுக்கானது அல்ல.',
    'ease.untested': 'திரை வாசிப்பானுடன் சோதிக்கப்படவில்லை.',
    'ease.untestedNote':
      'திரை வாசிப்பானுடன் வேலை செய்யும்படி தளம் கட்டப்பட்டுள்ளது; ஆனால் அதை நம்பியிருக்கும் எவரும் இன்னும் அதைச் சோதிக்கவில்லை. உரக்க வாசிப்பதும் ஒவ்வொரு சாதனத்திலும் கேட்கப்படவில்லை.',
    'ease.read': 'உரக்க வாசி',
    'ease.stop': 'வாசிப்பதை நிறுத்து',
    'ease.readNote':
      'உங்கள் சாதனத்தின் சொந்தக் குரலில் வாசிக்கப்படுகிறது. உயிர்க்குறிகளுடன் எழுதப்பட்ட வசனம் உள்ள வாக்கியம் விடப்படும்.',
    'ease.noVoice': 'உங்கள் சாதனத்தில் இந்தப் பாடத்தின் மொழிக்கான குரல் இல்லை.',
  },
  ne: {
    'ease.lettersLegend': 'अक्षर',
    'ease.lettersNormal': 'तपाईंको यन्त्रमा जस्तै',
    'ease.lettersNormalNote': 'मञ्चको बाँकी भागले प्रयोग गर्ने अक्षर।',
    'ease.lettersDyslexic': 'डिस्लेक्सियाका लागि बनाइएको फन्ट',
    'ease.lettersDyslexicNote':
      'OpenDyslexic: हरेक अक्षर तल्लो भागमा गह्रौँ छ, त्यसैले त्यसलाई अर्कोसँग झुक्किन गाह्रो हुन्छ। यसले ल्याटिन र सिरिलिक अक्षर मात्र बदल्छ; अरबी र अरू सबै लिपि जस्ताको तस्तै रहन्छन्। केही पाठकलाई यो सजिलो लाग्छ; अध्ययनहरूले यसले सबैलाई मद्दत गर्छ भनेर देखाएका छैनन्।',
    'ease.lettersElsewhere':
      'यस फन्टमा यो पृष्ठको भाषाका अक्षर छैनन्। यहाँ यसले ल्याटिन वा सिरिलिक अक्षरमा लेखिने भाषाको पाठ मात्र बदल्छ, जस्तै अङ्ग्रेजीमा पढाइने पाठ्यक्रम।',
    'ease.speech': 'पाठ ठूलो स्वरमा पढेर सुनाउन सकिन्छ।',
    'ease.speechNote':
      'पाठको विवरण र यसको लिखित पाठ दुवैमा एउटा बटन छ, जसले तिनलाई तपाईंको यन्त्रको आफ्नै आवाजमा पढ्छ, यदि यन्त्रमा पाठको भाषाको आवाज छ भने। शब्दहरू कतै पठाइँदैनन्। स्वरचिह्नसहित लेखिएको आयत भएको वाक्य छोडिन्छ: आयत मेसिनको आवाजका लागि होइन।',
    'ease.untested': 'स्क्रिन रिडरसँग जाँचिएको छैन।',
    'ease.untestedNote':
      'मञ्च स्क्रिन रिडरसँग काम गर्ने गरी बनाइएको छ, तर त्यसमा भर पर्ने कसैले अझै यसलाई जाँचेका छैनन्। ठूलो स्वरमा पढ्ने काम पनि हरेक यन्त्रमा सुनिएको छैन।',
    'ease.read': 'ठूलो स्वरमा पढ्नुहोस्',
    'ease.stop': 'पढ्न रोक्नुहोस्',
    'ease.readNote': 'तपाईंको यन्त्रको आफ्नै आवाजमा पढिन्छ। स्वरचिह्नसहित लेखिएको आयत भएको वाक्य छोडिन्छ।',
    'ease.noVoice': 'तपाईंको यन्त्रमा यस पाठको भाषाको आवाज छैन।',
  },
};
