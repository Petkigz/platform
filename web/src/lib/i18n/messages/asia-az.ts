import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Azərbaycanca — Azerbaijani.
 *
 * Latin script, as Azerbaijan has written it since 1991 and as its schools teach
 * it. Around thirty million people speak it as a first language, the great
 * majority outside Azerbaijan itself — in Iran, Turkey, Georgia and Russia — so
 * a reader who chooses `az` here may be anywhere, and the interface says nothing
 * about where they are.
 *
 * A whole catalogue in one file: see `asia-uz.ts` for why the newer languages do
 * not imitate the layering of the older ones.
 *
 * Every placeholder from `en.ts` survives — `{count}`, `{number}`, `{year}`,
 * `{query}`, `{band}`, `{phone}`, `{language}`, `{percent}`, `{page}`, `{pages}`,
 * `{from}`, `{to}`, `{total}`, `{hours}`, `{minutes}`.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`.
 */
export const ASIA_AZ: Partial<Record<LocaleCode, Partial<Messages>>> = {
  az: {
    'skip.toContent': 'Məzmuna keç',

    'nav.main': 'Əsas',
    'nav.catalogue': 'Kataloq',
    'nav.learn': 'Təhsilim',
    'nav.family': 'Ailəm',
    'nav.plans': 'Tariflər',
    'nav.subscriptions': 'Abunələr',
    'nav.teach': 'Dərs demək',
    'nav.review': 'Rəy',
    'nav.certificates': 'Sertifikatlar',

    'footer.tagline': 'Uşaqlar və böyüklər üçün İslami təhsil, bütün dünyada.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Haqqımızda',
    'footer.terms': 'Şərtlər və məxfilik',
    'footer.help': 'Kömək',
    'footer.verify': 'Sertifikatı yoxla',
    'footer.area': 'Sizin əraziniz',
    'footer.notifications': 'Bildirişlər',

    'action.signIn': 'Daxil ol',
    'action.getStarted': 'Başla',
    'action.signOut': 'Çıxış',
    'action.save': 'Yadda saxla',
    'action.cancel': 'Ləğv et',

    'region.africa': 'Afrika',
    'region.middleEast': 'Yaxın Şərq',
    'region.asia': 'Asiya',
    'region.west': 'Avropa və Amerika',

    'language.title': 'Dil',
    'language.lede':
      'İnterfeys burada seçdiyiniz dildə göstərilir. Brauzer əvvəlcə cihazınızın istədiyi dillə başlayır və siz seçənə qədər belə qalır.',
    'language.current': 'Hazırda göstərilir',
    'language.chosen': 'Bu dili bu brauzerdə siz seçmisiniz.',
    'language.device': 'Bu, cihazınızın istədiyi dildir. Dəyişmək üçün aşağıdan birini seçin.',
    'language.default':
      'Cihazınız bu interfeysdə hələ olmayan bir dil istədi, ona görə interfeys ingilis dilindədir.',
    'language.pick': 'İnterfeysi bu dildə göstər',
    'language.deviceOption': 'Cihazımın dili',
    'language.change': 'Dili dəyiş',
    'language.saved': 'Yadda saxlanıldı. İnterfeys artıq {language} dilindədir.',
    'language.coverage':
      'Bu interfeys mətnlərinin {percent}%-i {language} dilinə tərcümə olunub. Tərcümə olunmayanlar ingilis dilində göstərilir.',
    'language.coverageAll': 'Bu dil tam tərcümə olunub.',
    'language.browser':
      'Seçim bu brauzerdə saxlanılır, hesabınızda deyil, ona görə başqa cihaz öz dilini özü soruşacaq.',

    'catalogue.title': 'Kurs tap',
    'catalogue.lede':
      'Hər kurs dərc olunmazdan əvvəl yoxlanılır. Fənn üzrə baxın və ya kurs, fənn yaxud müəllim axtarın.',
    'catalogue.doorChild': 'Təhsil uşaq üçün',
    'catalogue.doorAdult': 'Təhsil mənim üçün',
    'catalogue.searchPlaceholder': 'Kurslar, fənlər, müəllimlər…',
    'catalogue.searchPlaceholderLessons': 'Kurslar, dərslər, fənlər, müəllimlər…',
    'catalogue.searchLabel': 'Kursları axtar',
    'catalogue.searchLabelLessons': 'Kursları və dərsləri axtar',
    'catalogue.audience': 'Kim üçün',
    'catalogue.search': 'Axtar',
    'catalogue.allSubjects': 'Bütün fənlər',
    'catalogue.anyLanguage': 'İstənilən dil',
    'catalogue.languageRow': 'Kurs hansı dildə tədris olunur',
    'catalogue.pages': 'Səhifələr',
    'catalogue.previous': 'Əvvəlki',
    'catalogue.next': 'Növbəti',
    'catalogue.pageOf': '{pages} səhifədən {page}-ci',
    'catalogue.emptyPage': 'Bu səhifədə heç nə yoxdur. Siyahının sonundan sonra ola bilər.',
    'catalogue.emptyQuery':
      '“{query}” üzrə heç nə tapılmadı. Fənn, müəllimin adı və ya dərsdən bir söz yoxlayın.',
    'catalogue.emptyQueryLessons': '“{query}” üzrə kurs tapılmadı, amma aşağıdakı dərslər tapıldı.',
    'catalogue.emptyShelf':
      'Hələ kurs yoxdur. Müəllim kurs dərc edəndə burada görünəcək — rəydən keçməyincə heç nə göstərilmir.',
    'catalogue.countOne': '{count} kurs',
    'catalogue.countOther': '{count} kurs',
    'catalogue.showing': '{total} kursdan {from}–{to} göstərilir',

    'audience.child': 'Gənc öyrənənlər',
    'audience.adult': 'Böyüklər',
    'audience.both': 'Bütün yaşlar',

    'difficulty.beginner': 'Başlanğıc',
    'difficulty.intermediate': 'Orta',
    'difficulty.advanced': 'Yüksək',

    'price.free': 'Pulsuz',
    'price.included': 'Girişinizə daxildir',
    'price.notOneOff': 'Birdəfəlik kurs kimi satılmır',
    'price.ambiguous': 'Qiymət üçün düzgün valyuta lazımdır',
    'price.notAvailable': 'Hələ ölkənizdə mövcud deyil',

    'card.sectionsOne': '{count} bölmə',
    'card.sectionsOther': '{count} bölmə',
    'card.lessonsOne': '{count} dərs',
    'card.lessonsOther': '{count} dərs',
    'card.minutes': '{count} dəq',
    'card.hours': '{count} saat',
    'card.hoursMinutes': '{hours} saat {minutes} dəq',

    'auth.signInTitle': 'Daxil ol',
    'auth.signUpTitle': 'Hesab yarat',
    'auth.signInLede': 'Yenidən xoş gəlmisiniz.',
    'auth.email': 'E-poçt',
    'auth.password': 'Şifrə',
    'auth.mobile': 'Mobil nömrə',
    'auth.countryCode': 'Ölkə kodu',
    'auth.otpCode': 'SMS kodu',
    'auth.tabPassword': 'E-poçt və şifrə',
    'auth.tabPhone': 'Telefon kodu',
    'auth.google': 'Google ilə davam et',
    'auth.sendCode': 'Kod göndər',
    'auth.verifyCode': 'Kodu təsdiqlə',
    'auth.resendCode': 'Kodu yenidən göndər',
    'auth.changeNumber': 'Nömrəni dəyiş',
    'auth.forgot': 'Şifrəni unutmusunuz?',
    'auth.noAccount': 'Hesab yarat',
    'auth.haveAccount': 'Hesabınız var?',
    'auth.working': 'İcra olunur…',
    'auth.invalidPhone': 'Bu, düzgün telefon nömrəsinə oxşamır. Ölkə kodunu əlavə edin.',
    'auth.somethingWrong': 'Nəsə səhv getdi.',
    'auth.orGoogle': 'və ya bunlardan birini istifadə edin',
    'auth.orCreate': 'və ya e-poçt yaxud telefon nömrəsi ilə hesab yaradın',
    'auth.phoneAs': 'Bu nömrə {phone} kimi saxlanacaq',
    'auth.international': 'Artıq beynəlxalq formatdadır.',
    'auth.passwordNote': 'Biz onu heç vaxt saxlamırıq. Şifrəni Supabase Auth saxlayır.',
    'auth.codeSent': 'Əgər {phone} üçün hesab varsa, kod yoldadır.',
    'auth.codeResent': '{phone} nömrəsinə yeni kod göndərildi.',
    'auth.checkEmail':
      'Hesab yaradıldı. Ünvanı təsdiqləmək üçün e-poçtunuzu yoxlayın, sonra daxil olun.',
    'auth.accountCreated': '{phone} üçün hesab yaradıldı.',

    'doors.askAdult': 'Özünüz üçün axtarırşınız?',
    'doors.askChild': 'Uşaq üçün seçirsiniz?',
    'doors.adultsShelf': 'Böyüklər rəfi',
    'doors.youngShelf': 'Gənc öyrənənlər rəfi',
    'doors.wholeCatalogue': 'Bütün kataloq',
    'young.eyebrow': 'Gənc öyrənənlər',
    'young.title': 'Əvvəlcə uşaqlar.',
    'young.lede':
      'Uşaqlara tədris üçün yazılmış kurslar — qiraət, ərəb əlifbası, ilk eşitməli olduqları hekayələr. Hər biri burada görünməzdən əvvəl elmi rəydən keçib.',
    'young.notice':
      'Uşaq özü qeydiyyatdan keçmir. Hesabı valideyn və ya qəyyum aparır, uşağı öyrənən kimi əlavə edir və nəyin açılacağına qərar verir; müəllim onu öz hesabına yazdıra bilər. Bu səhifədə heç nə uşağın hesabı deyil və heç biri uşağın məlumatı deyil.',
    'young.everyAge': 'Bütün yaşlar',
    'young.emptyBand':
      '{band} yaş üçün hələ heç nə yoxdur. Başqa yaşı və ya bütün kataloqu yoxlayın.',
    'young.empty':
      'Gənc öyrənənlər üçün hələ kurs dərc olunmayıb. Buradakı hər şey əvvəlcə rəydən keçməlidir.',
    'adults.eyebrow': 'Böyüklər',
    'adults.title': 'Dərindən öyrənin.',
    'adults.lede':
      'Böyüklər üçün yazılmış kurslar — ərəb qrammatikası, fiqh, təfsir, təcvid, dərinlikdə. Hər biri burada görünməzdən əvvəl elmi rəydən keçib və aldığınız sizindir: bir alış, bir öyrənən.',
    'adults.notice':
      'Bu uşağın deyil, sizin hesabınızdır. Ailənizdə uşaq da oxuyursa, öyrənən dəyişdiricisi ikisini qarışdırmadan sizdən ona keçir.',
    'adults.empty':
      'Böyüklər üçün hələ kurs dərc olunmayıb. Buradakı hər şey əvvəlcə rəydən keçməlidir.',

    'auth.forgotTitle': 'Şifrəni bərpa et',
    'auth.forgotLede':
      'Hesabınızdakı e-poçt ünvanını daxil edin. Əgər qeydiyyatdadırsa, təhlükəsiz keçid göndərəcəyik.',
    'auth.sendLink': 'Bərpa keçidini göndər',
    'auth.sending': 'Göndərilir…',
    'auth.resetSent':
      'Əgər bu ünvan hansısa hesabda istifadə olunursa, şifrə bərpası keçidi yoldadır. Gələn qutusunu və spam qovluğunu yoxlayın.',
    'auth.resetFailed':
      'Hazırda bərpa keçidini göndərə bilmədik. Ünvanı yoxlayıb sonra yenidən cəhd edin.',
    'auth.backToSignIn': 'Girişə qayıt',
    'auth.accountSettings': 'Hesab parametrləri',
    'auth.chooseTitle': 'Yeni şifrə seçin',
    'auth.chooseLede': 'Bu hesab üçün yeni şifrə təyin edin. Bərpa keçidi bir dəfəlikdir.',
    'auth.newPassword': 'Yeni şifrə',
    'auth.confirmPassword': 'Yeni şifrəni təsdiqləyin',
    'auth.noMatch': 'Şifrələr uyğun gəlmir.',
    'auth.enterPassword': 'Yeni şifrənizi daxil edin.',
    'auth.updatePassword': 'Şifrəni yenilə',
    'auth.updating': 'Yenilənir…',
    'auth.offline': 'Serverə çatmaq mümkün olmadı. Bağlantını yoxlayıb yenidən cəhd edin.',

    'home.eyebrow': 'İslami təhsil, bütün dünyada',
    'home.title': 'Dinini özünə uyğun templə öyrən.',
    'home.lede':
      'Qurani-Kərim, ərəb dili, fiqh, hədis və başqaları — ixtisaslı müəllimlər tərəfindən uşaqlara və böyüklərə, harada olursunuzsa olun.',
    'home.browse': 'Kataloqa bax',
    'home.createAccount': 'Pulsuz hesab yarat',
    'home.continue': 'Öyrənməyə davam et',
    'home.paths': 'Öyrənmə yollarına bax',
    'home.note':
      'Baxmaq heç nəyə başa gəlmir. Qeydiyyatdan keçəndə ödəyirsiniz, adı göstərilən bir öyrənən üçün, və uşaqdan heç vaxt e-poçt ünvanı soruşulmur.',
    'home.meansEyebrow': 'Bu nə deməkdir',
    'home.meansTitle': 'Platformanın etməkdən imtina etdiyi üç şey',
    'home.assure1Title': 'Siyahıya düşməzdən əvvəl yoxlanılır',
    'home.assure1Body':
      'Kurslar ixtisaslı müəllimlərdən gəlir və həmin fənn üzrə səlahiyyətli şəxs tərəfindən təsdiqlənir. Müəllif öz işini özü təsdiqləyə bilməz və hər dərc qeydə alınır.',
    'home.assure2Title': 'Uşağın girişini qəyyumu yaradır',
    'home.assure2Body':
      'Uşaq adətən valideynin hesabı altında oxuyur və öz girişinə yalnız valideyn yaratdıqda sahib olur — özlərinin seçdiyi istifadəçi adı və özlərinin qoyduğu şifrə, uşaqdan isə e-poçt ünvanı soruşulmur. Valideyn heç bir dərsə toxunmadan onu yenidən silə bilər.',
    'home.assure3Title': 'Hələ də yoxlanıla bilən sertifikat',
    'home.assure3Body':
      'Hər birində istənilən şəxsin axtarıb tapa biləcəyi nömrə var və kurs sonradan götürülsə belə yoxlanıla bilən qalır.',
    'home.studyTitle': 'Nə öyrənə bilərsiniz',
    'home.studyCountOne': '{count} fənn, hər biri həmin fənn üçün yoxlanılmış müəllimlə tədris olunur.',
    'home.studyCountOther': '{count} fənn, hər biri həmin fənn üçün yoxlanılmış müəllimlə tədris olunur.',
    'home.studyEmpty':
      'Kurslar əlavə olunduqca fənlər burada görünür. Tam siyahı həmişə kataloqdur.',
    'home.doorChildBody':
      'Gənc öyrənənlər üçün yazılıb, valideyn və ya qəyyum hesabında saxlanılır və öz girişinə yalnız o böyük şəxs yaratdıqda sahib olur.',
    'home.doorAdultBody':
      'Özünüz üçün, öz səviyyənizdə oxuyun və soruşan hər kəsə göstərə biləcəyiniz sertifikatlarla.',
    'home.doorOpen': 'Orada nə olduğuna bax',
    'home.doorCatalogue': 'Onları kataloqda gör',
    'home.howTitle': 'Necə işləyir',
    'home.step': '{number}-ci addım',
    'home.step1Title': 'Kimin öyrənəcəyini seçin',
    'home.step1Body':
      'Özünüz və ya məsuliyyət daşıdığınız uşaq. Kurs adı göstərilən bir öyrənən üçün alınır, ona görə birlikdə alan ailə kimin irəliləyişinin kimə aid olduğunu bilir.',
    'home.step2Title': 'Öz templərinizlə oxuyun',
    'home.step2Body':
      'Dərslər, cavabı qiymətləndirmədən yoxlayan məşq sualları və açdığınız hər dərsdə harada dayandığınızı xatırlayan yer.',
    'home.step3Title': 'Sonradan bir şey qalsın',
    'home.step3Body':
      'İrəliləyiş, heç vaxt yenidən yazılmayan qəbz və nömrəsi illər sonra da yoxlanıla bilən sertifikat.',
    'home.aboutLink': 'Kurs buraya necə gəlir və uşağın məlumatına nə olur',
    'home.teachEyebrow': 'Müəllimlər üçün',
    'home.teachTitle': 'Şagirdlərinizi gətirin.',
    'home.teachBody1':
      'Əgər artıq dərs deyirsinizsə, platforma özünüzün qurmamalı olduğunuz hissədir: bölmələr və dərslər, fənni bilən şəxsin rəyi, işçilərlə razılaşdırılmış qiymətlər və qazandığınız hər valyutada bir səhifədə.',
    'home.teachBody2':
      'Müəllimlər hər satışın yarısını saxlayır. Burada tədris razılaşma ilədir — platformanın sahibi müəllimləri bir-bir əlavə edir — və hələ heç bir provayder pul köçürmür, ona görə qazanc səhifəsi göndərildiyini iddia etmək əvəzinə nə qədər borc olduğunu deyir.',
    'home.teachArea': 'Tədris sahəsi',
    'home.teachReview': 'Kurslar necə rəy alır',
    'home.closingTitle': 'Kataloqdan başlayın.',
    'home.closingSignedOut':
      'Hər dərc olunmuş kurs içindəkilərlə və kimin tədris etdiyi ilə siyahıdadır. Saxlamaq istədiyinizi tapanda hesab yaradın.',
    'home.closingSignedIn':
      'Hər dərc olunmuş kurs içindəkilərlə və kimin tədris etdiyi ilə siyahıdadır. Qeydiyyatlarınız, irəliləyişiniz və sertifikatlarınız bir yerdədir.',

    'language.reviewed': 'Bu tərcüməni ana dili daşıyıcısı oxuyub.',
    'language.partial':
      'Ana dili danışanlar bu tərcümənin {total} hissəsindən {read} hissəsini oxuyub.',
    'language.unreviewed':
      'Bu tərcüməni hələ ana dili daşıyıcısı oxumayıb. Onu platformanı quranlar yazıb — bir söz sizə səhv görünürsə, səhv bizimdir.',
    'language.notTranslated':
      'Yalnız interfeys tərcümə olunur. Kurs adları, dərslər, müəllim səhifələri və dərc olunmuş qaydalar yazıldıqları dildə görünür.',
  },
};
