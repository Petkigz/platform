import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * नेपाली — Nepali.
 *
 * Devanagari, as Nepal writes it. Around thirty million speakers, and a Muslim
 * population that is small in proportion and large in number — roughly a million
 * and a half people, most of whom meet an English page on every platform built
 * elsewhere.
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
export const ASIA_NE: Partial<Record<LocaleCode, Partial<Messages>>> = {
  ne: {
    'skip.toContent': 'सामग्रीमा जानुहोस्',

    'nav.main': 'मुख्य',
    'nav.catalogue': 'पाठ्यक्रम',
    'nav.learn': 'मेरो सिकाइ',
    'nav.family': 'मेरो परिवार',
    'nav.plans': 'योजनाहरू',
    'nav.subscriptions': 'सदस्यताहरू',
    'nav.teach': 'पढाउनुहोस्',
    'nav.review': 'समीक्षा',
    'nav.certificates': 'प्रमाणपत्रहरू',

    'footer.tagline': 'बालबालिका र वयस्कहरूका लागि इस्लामी शिक्षा, विश्वभरि।',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'हाम्रोबारे',
    'footer.terms': 'सर्त र गोपनीयता',
    'footer.help': 'सहयोग',
    'footer.verify': 'प्रमाणपत्र जाँच्नुहोस्',
    'footer.area': 'तपाईंको क्षेत्र',
    'footer.notifications': 'सूचनाहरू',

    'action.signIn': 'साइन इन',
    'action.getStarted': 'सुरु गर्नुहोस्',
    'action.signOut': 'साइन आउट',
    'action.save': 'सुरक्षित गर्नुहोस्',
    'action.cancel': 'रद्द गर्नुहोस्',

    'region.africa': 'अफ्रिका',
    'region.middleEast': 'मध्य पूर्व',
    'region.asia': 'एशिया',
    'region.west': 'युरोप र अमेरिका',

    'language.title': 'भाषा',
    'language.lede':
      'यहाँ तपाईंले छान्नुभएको भाषामा इन्टरफेस देखाइन्छ। ब्राउजर पहिले तपाईंको यन्त्रले मागेको भाषाबाट सुरु हुन्छ र तपाईंले अर्को नछानेसम्म त्यही रहन्छ।',
    'language.current': 'अहिले देखाइँदै',
    'language.chosen': 'यो भाषा तपाईंले यही ब्राउजरमा छान्नुभयो।',
    'language.device': 'यो तपाईंको यन्त्रले मागेको भाषा हो। बदल्न तलको एउटा छान्नुहोस्।',
    'language.default':
      'तपाईंको यन्त्रले यो इन्टरफेसमा नभएको भाषा माग्यो, त्यसैले यो अंग्रेजीमा छ।',
    'language.pick': 'इन्टरफेस यो भाषामा देखाउनुहोस्',
    'language.deviceOption': 'मेरो यन्त्रको भाषा',
    'language.change': 'भाषा बदल्नुहोस्',
    'language.saved': 'सुरक्षित भयो। इन्टरफेस अब {language} भाषामा छ।',
    'language.coverage':
      'यी इन्टरफेस शब्दहरूमध्ये {percent}% {language} भाषामा अनुवाद भएका छन्। नअनुवाद भएका अंग्रेजीमा देखाइन्छ।',
    'language.coverageAll': 'यो भाषा पूरा अनुवाद भएको छ।',
    'language.browser':
      'छनोट यही ब्राउजरमा राखिन्छ, तपाईंको खातामा होइन, त्यसैले अर्को यन्त्रले आफ्नै भाषा सोध्छ।',

    'catalogue.title': 'कोर्स भेट्नुहोस्',
    'catalogue.lede':
      'हरेक कोर्स प्रकाशनअघि समीक्षा गरिन्छ। विषयअनुसार हेर्नुहोस्, वा कोर्स, विषय वा शिक्षक खोज्नुहोस्।',
    'catalogue.doorChild': 'सिकाइ बालबालिकाका लागि',
    'catalogue.doorAdult': 'सिकाइ मेरो लागि',
    'catalogue.searchPlaceholder': 'कोर्सहरू, विषयहरू, शिक्षकहरू…',
    'catalogue.searchPlaceholderLessons': 'कोर्सहरू, पाठहरू, विषयहरू, शिक्षकहरू…',
    'catalogue.searchLabel': 'कोर्स खोज्नुहोस्',
    'catalogue.searchLabelLessons': 'कोर्स र पाठ खोज्नुहोस्',
    'catalogue.audience': 'कसका लागि',
    'catalogue.search': 'खोज्नुहोस्',
    'catalogue.allSubjects': 'सबै विषय',
    'catalogue.anyLanguage': 'कुनै पनि भाषा',
    'catalogue.languageRow': 'कोर्स कुन भाषामा पढाइन्छ',
    'catalogue.pages': 'पृष्ठहरू',
    'catalogue.previous': 'अघिल्लो',
    'catalogue.next': 'अर्को',
    'catalogue.pageOf': '{pages} मध्ये पृष्ठ {page}',
    'catalogue.emptyPage': 'यो पृष्ठमा केही छैन। यो सूचीको अन्त्यपछि हुन सक्छ।',
    'catalogue.emptyQuery':
      '“{query}” सँग केही मिलेन। विषय, शिक्षकको नाम वा पाठको कुनै शब्द प्रयास गर्नुहोस्।',
    'catalogue.emptyQueryLessons': '“{query}” सँग कुनै कोर्स मिलेन, तर तलका पाठहरू मिले।',
    'catalogue.emptyShelf':
      'अझै कोर्स छैन। शिक्षकले कोर्स प्रकाशित गरेपछि यहाँ देखिनेछ — समीक्षा पार नगरेसम्म केही देखाइँदैन।',
    'catalogue.countOne': '{count} कोर्स',
    'catalogue.countOther': '{count} कोर्स',
    'catalogue.showing': '{total} मध्ये {from}–{to} देखाइँदै',

    'audience.child': 'साना सिकारु',
    'audience.adult': 'वयस्कहरू',
    'audience.both': 'सबै उमेर',

    'difficulty.beginner': 'सुरुवाती',
    'difficulty.intermediate': 'मध्यम',
    'difficulty.advanced': 'उच्च',

    'price.free': 'निःशुल्क',
    'price.included': 'तपाईंको पहुँचमा समावेश',
    'price.notOneOff': 'एकपटकको कोर्सको रूपमा बेचिँदैन',
    'price.ambiguous': 'मूल्यका लागि सही मुद्रा चाहिन्छ',
    'price.notAvailable': 'तपाईंको देशमा अझै उपलब्ध छैन',

    'card.sectionsOne': '{count} खण्ड',
    'card.sectionsOther': '{count} खण्ड',
    'card.lessonsOne': '{count} पाठ',
    'card.lessonsOther': '{count} पाठ',
    'card.minutes': '{count} मिनेट',
    'card.hours': '{count} घण्टा',
    'card.hoursMinutes': '{hours} घण्टा {minutes} मिनेट',

    'auth.signInTitle': 'साइन इन',
    'auth.signUpTitle': 'खाता खोल्नुहोस्',
    'auth.signInLede': 'फेरि स्वागत छ।',
    'auth.email': 'इमेल',
    'auth.password': 'पासवर्ड',
    'auth.mobile': 'मोबाइल नम्बर',
    'auth.countryCode': 'देश कोड',
    'auth.otpCode': 'एसएमएस कोड',
    'auth.tabPassword': 'इमेल र पासवर्ड',
    'auth.tabPhone': 'फोन कोड',
    'auth.google': 'Google मार्फत जारी राख्नुहोस्',
    'auth.sendCode': 'कोड पठाउनुहोस्',
    'auth.verifyCode': 'कोड पुष्टि गर्नुहोस्',
    'auth.resendCode': 'कोड फेरि पठाउनुहोस्',
    'auth.changeNumber': 'नम्बर बदल्नुहोस्',
    'auth.forgot': 'पासवर्ड बिर्सनुभयो?',
    'auth.noAccount': 'खाता खोल्नुहोस्',
    'auth.haveAccount': 'पहिले नै खाता छ?',
    'auth.working': 'काम भइरहेको छ…',
    'auth.invalidPhone': 'यो मान्य फोन नम्बरजस्तो देखिँदैन। देश कोड समावेश गर्नुहोस्।',
    'auth.somethingWrong': 'केही गडबड भयो।',
    'auth.orGoogle': 'वा यीमध्ये एउटा प्रयोग गर्नुहोस्',
    'auth.orCreate': 'वा इमेल वा मोबाइल नम्बरले खाता खोल्नुहोस्',
    'auth.phoneAs': '{phone} को रूपमा सुरक्षित हुनेछ',
    'auth.international': 'पहिले नै अन्तर्राष्ट्रिय ढाँचामा छ।',
    'auth.passwordNote': 'हामी यो कहिल्यै सुरक्षित गर्दैनौं। पासवर्ड Supabase Auth सँग रहन्छ।',
    'auth.codeSent': 'यदि {phone} का लागि खाता छ भने, कोड बाटोमा छ।',
    'auth.codeResent': '{phone} मा नयाँ कोड पठाइयो।',
    'auth.checkEmail': 'खाता खुल्यो। ठेगाना पुष्टि गर्न इमेल हेर्नुहोस्, त्यसपछि साइन इन गर्नुहोस्।',
    'auth.accountCreated': '{phone} का लागि खाता खुल्यो।',

    'doors.askAdult': 'आफ्नै लागि खोज्दै हुनुहुन्छ?',
    'doors.askChild': 'बालबालिकाका लागि छान्दै हुनुहुन्छ?',
    'doors.adultsShelf': 'वयस्कहरूको दराज',
    'doors.youngShelf': 'साना सिकारुको दराज',
    'doors.wholeCatalogue': 'पूरै पाठ्यक्रम',
    'young.eyebrow': 'साना सिकारु',
    'young.title': 'पहिले बालबालिका।',
    'young.lede':
      'बालबालिकालाई पढाउन लेखिएका कोर्सहरू — ओथाहार, अरबी वर्णमाला, पहिले सुन्नुपर्ने कथाहरू। हरेक यहाँ आउनुअघि विद्वानीय समीक्षा पार गरेको छ।',
    'young.notice':
      'बालबालिका आफैं दर्ता हुँदैनन्। खाता अभिभावक वा संरक्षकले राख्छन्, बालबालिकालाई सिकारुका रूपमा थप्छन् र के खोल्ने भन्ने निर्णय गर्छन्; शिक्षकले उनलाई आफ्नै खातामा भर्ना गर्न सक्छन्। यो पृष्ठमा केही पनि बालबालिकाको खाता होइन, र कुनै पनि बालबालिकाको डेटा होइन।',
    'young.everyAge': 'सबै उमेर',
    'young.emptyBand':
      '{band} उमेरका लागि अझै केही सूचीबद्ध छैन। अर्को उमेर वा पूरै पाठ्यक्रम हेर्नुहोस्।',
    'young.empty':
      'साना सिकारुका लागि अझै कोर्स प्रकाशित भएको छैन। यहाँको सबै कुरा पहिले समीक्षा पार गर्नुपर्छ।',
    'adults.eyebrow': 'वयस्कहरू',
    'adults.title': 'ठीकसँग सिक्नुहोस्।',
    'adults.lede':
      'वयस्कहरूका लागि लेखिएका कोर्सहरू — अरबी व्याकरण, फिक्ह, तफ्सीर, तजवीद, गहिराइमा। हरेक यहाँ आउनुअघि विद्वानीय समीक्षा पार गरेको छ, र तपाईंले किनेको तपाईंकै हो: एक खरिद, एक सिकारु।',
    'adults.notice':
      'यो बालबालिकाको होइन, तपाईंको आफ्नै खाता हो। तपाईंको परिवारमा बालबालिकाले पनि सिक्दै गरे, सिकारु परिवर्तक दुवैलाई नमिसाई तपाईंबाट उहाँकहाँ जान्छ।',
    'adults.empty':
      'वयस्कहरूका लागि अझै कोर्स प्रकाशित भएको छैन। यहाँको सबै कुरा पहिले समीक्षा पार गर्नुपर्छ।',

    'auth.forgotTitle': 'पासवर्ड रिसेट गर्नुहोस्',
    'auth.forgotLede':
      'तपाईंको खाताको इमेल ठेगाना लेख्नुहोस्। दर्ता भएको भए सुरक्षित लिङ्क पठाउँछौं।',
    'auth.sendLink': 'रिसेट लिङ्क पठाउनुहोस्',
    'auth.sending': 'पठाइँदै…',
    'auth.resetSent':
      'यो ठेगाना कुनै खाताले प्रयोग गर्छ भने, पासवर्ड रिसेट लिङ्क बाटोमा छ। इनबक्स र स्प्याम फोल्डर हेर्नुहोस्।',
    'auth.resetFailed':
      'अहिले रिसेट लिङ्क पठाउन सकिएन। ठेगाना हेरेर पछि फेरि प्रयास गर्नुहोस्।',
    'auth.backToSignIn': 'साइन इनमा फर्कनुहोस्',
    'auth.accountSettings': 'खाता सेटिङ',
    'auth.chooseTitle': 'नयाँ पासवर्ड छान्नुहोस्',
    'auth.chooseLede': 'यो खाताका लागि नयाँ पासवर्ड राख्नुहोस्। रिसेट लिङ्क एकपटक मात्र चल्छ।',
    'auth.newPassword': 'नयाँ पासवर्ड',
    'auth.confirmPassword': 'नयाँ पासवर्ड पुष्टि गर्नुहोस्',
    'auth.noMatch': 'पासवर्डहरू मिलेनन्।',
    'auth.enterPassword': 'तपाईंको नयाँ पासवर्ड लेख्नुहोस्।',
    'auth.updatePassword': 'पासवर्ड अद्यावधिक गर्नुहोस्',
    'auth.updating': 'अद्यावधिक हुँदै…',
    'auth.offline': 'सर्भरमा पुग्न सकिएन। जडान जाँचेर फेरि प्रयास गर्नुहोस्।',

    'home.eyebrow': 'इस्लामी शिक्षा, विश्वभरि',
    'home.title': 'आफ्नो दीन सिक्नुहोस्, तपाईंलाई मिल्ने गतिमा।',
    'home.lede':
      'कुरआन, अरबी, फिक्ह, हदीस र अरू — योग्य शिक्षकहरूद्वारा बालबालिका र वयस्कहरूलाई, तपाईं जहाँ भए पनि।',
    'home.browse': 'पाठ्यक्रम हेर्नुहोस्',
    'home.createAccount': 'निःशुल्क खाता खोल्नुहोस्',
    'home.continue': 'सिकाइ जारी राख्नुहोस्',
    'home.paths': 'सिकाइ बाटाहरू हेर्नुहोस्',
    'home.note':
      'हेर्न कुनै खर्च लाग्दैन। दर्ता गर्दा तिर्नुहुन्छ, नाम खुलाइएको एक सिकारुका लागि, र बालबालिकासँग कहिल्यै इमेल ठेगाना सोधिँदैन।',
    'home.meansEyebrow': 'यसको अर्थ के हो',
    'home.meansTitle': 'यो मञ्चले गर्न इन्कार गर्ने तीन कुरा',
    'home.assure1Title': 'सूचीबद्ध हुनुअघि समीक्षा गरिन्छ',
    'home.assure1Body':
      'कोर्सहरू योग्य शिक्षकहरूबाट आउँछन् र त्यो विषयमा अधिकार पाएको व्यक्तिले स्वीकृत गर्छ। लेखकले आफ्नै काम स्वीकृत गर्न सक्दैन, र हरेक प्रकाशन अभिलेख गरिन्छ।',
    'home.assure2Title': 'बालबालिकाको लगइन उनका संरक्षकले बनाउँछन्',
    'home.assure2Body':
      'बालबालिका सामान्यतया अभिभावकको खातामुनि सिक्छन्, र अभिभावकले बनाए मात्र आफ्नै लगइन पाउँछन् — उनीहरूले छान्ने प्रयोगकर्ता नाम र राख्ने पासवर्ड, र बालबालिकासँग इमेल ठेगाना सोधिँदैन। अभिभावकले कुनै पाठ छोइकनै त्यो हटाउन सक्छन्।',
    'home.assure3Title': 'अझै जाँच्न सकिने प्रमाणपत्र',
    'home.assure3Body':
      'हरेकमा जो कोहीले खोज्न सक्ने नम्बर हुन्छ, र कोर्स पछि हटाइए पनि त्यो जाँच्न सकिने नै रहन्छ।',
    'home.studyTitle': 'के सिक्न सकिन्छ',
    'home.studyCountOne': '{count} विषय, हरेक त्यसका लागि समीक्षा गरिएका शिक्षकद्वारा पढाइन्छ।',
    'home.studyCountOther': '{count} विषय, हरेक त्यसका लागि समीक्षा गरिएका शिक्षकद्वारा पढाइन्छ।',
    'home.studyEmpty':
      'कोर्स थपिँदै जाँदा विषयहरू यहाँ देखिन्छन्। पूरा सूची सधैं पाठ्यक्रमकै सूची हो।',
    'home.doorChildBody':
      'साना सिकारुका लागि लेखिएको, अभिभावक वा संरक्षकको खातामा राखिने, र ती वयस्कले बनाए मात्र आफ्नै लगइन पाउने।',
    'home.doorAdultBody':
      'आफ्नै लागि, आफ्नै स्तरमा सिक्नुहोस्, र सोध्ने जो कोहीलाई देखाउन सकिने प्रमाणपत्रसँग।',
    'home.doorOpen': 'त्यहाँ के छ हेर्नुहोस्',
    'home.doorCatalogue': 'ती पाठ्यक्रममा हेर्नुहोस्',
    'home.howTitle': 'यो कसरी काम गर्छ',
    'home.step': 'चरण {number}',
    'home.step1Title': 'को सिक्ने छान्नुहोस्',
    'home.step1Body':
      'तपाईं आफैं, वा तपाईंको जिम्मेवारीमा रहेको बालबालिका। कोर्स नाम खुलाइएको एक सिकारुका लागि किनिन्छ, त्यसैले सँगै किन्ने परिवारलाई कसको प्रगति कसको हो भन्ने थाहा हुन्छ।',
    'home.step2Title': 'आफ्नै गतिमा सिक्नुहोस्',
    'home.step2Body':
      'पाठहरू, उत्तर जाँच्ने तर अंक नदिने अभ्यास प्रश्नहरू, र तपाईंले खोलेको हरेक पाठमा कहाँ रोकिनुभयो सम्झने ठाउँ।',
    'home.step3Title': 'पछि केही बाँकी रहोस्',
    'home.step3Body':
      'प्रगति, कहिल्यै फेरि नलेखिने रसिद, र नम्बर वर्षौंपछि पनि जाँच्न सकिने प्रमाणपत्र।',
    'home.aboutLink': 'कोर्स यहाँ कसरी आउँछ, र बालबालिकाको डेटालाई के हुन्छ',
    'home.teachEyebrow': 'शिक्षकहरूका लागि',
    'home.teachTitle': 'आफ्ना विद्यार्थी लिएर आउनुहोस्।',
    'home.teachBody1':
      'तपाईं पहिले नै पढाउनुहुन्छ भने, तपाईंले आफैं बनाउनु नपर्ने भाग यही मञ्च हो: खण्ड र पाठ, विषय जान्ने व्यक्तिको समीक्षा, कर्मचारीसँग मिलेर तय गरिएका मूल्य, र तपाईंले कमाएको हरेक मुद्रामा एउटै पृष्ठमा।',
    'home.teachBody2':
      'शिक्षकहरूले हरेक बिक्रीको आधा राख्छन्। यहाँ पढाउनु सम्झौताअनुसार हुन्छ — मञ्चको मालिकले शिक्षकहरू एक-एक गरी थप्छन् — र अझै कुनै प्रदायकले पैसा पठाउँदैन, त्यसैले आय पृष्ठले पठाइयो भन्नुको सट्टा कति बाँकी छ भन्छ।',
    'home.teachArea': 'पढाउने क्षेत्र',
    'home.teachReview': 'कोर्सहरू कसरी समीक्षा गरिन्छ',
    'home.closingTitle': 'पाठ्यक्रमबाट सुरु गर्नुहोस्।',
    'home.closingSignedOut':
      'हरेक प्रकाशित कोर्स आफ्नो सामग्री र पढाउने शिक्षकसँगै सूचीबद्ध छ। राख्न चाहेको भेट्नुभएपछि खाता खोल्नुहोस्।',
    'home.closingSignedIn':
      'हरेक प्रकाशित कोर्स आफ्नो सामग्री र पढाउने शिक्षकसँगै सूचीबद्ध छ। तपाईंका भर्ना, प्रगति र प्रमाणपत्र एउटै ठाउँमा छन्।',

    'language.reviewed': 'यो अनुवाद मातृभाषीले पढेका छन्।',
    'language.partial':
      'मातृभाषी पाठकहरूले यो अनुवादका {total} भागमध्ये {read} भाग पढिसकेका छन्।',
    'language.unreviewed':
      'यो अनुवाद अझै मातृभाषीले पढेका छैनन्। यो मञ्च बनाउनेहरूले लेखेका हुन् — कुनै शब्द गलत लाग्यो भने गल्ती हाम्रै हो।',
    'language.notTranslated':
      'इन्टरफेस मात्र अनुवाद गरिन्छ। कोर्सका नाम, पाठ, शिक्षकका पृष्ठ र प्रकाशित नीतिहरू लेखिएकै भाषामा देखिन्छन्।',
  },
};
