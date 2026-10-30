import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * 繁體中文 — Chinese, Traditional.
 *
 * The second Chinese row, and the reason the register now carries a script subtag
 * in a code at all. Taiwan, Hong Kong, Macau and most of the Chinese diaspora read
 * 繁體; a parent in Taipei handed Mainland vocabulary — 软件, 视频, 网络 — reads a
 * translation that was not done for them, in the same way an Afghan reader handed
 * Tehran's Persian does.
 *
 * **This one is the Traditional row**, `zh-hant`: Traditional characters and
 * Taiwan's vocabulary — 軟體, 影片, 網路, 使用者, 資訊.
 *
 * `matchLocale` reaches it from `zh-Hant`, `zh-Hant-TW`, and from the regions that
 * write Traditional when the device sends no script at all — `zh-TW`, `zh-HK`,
 * `zh-MO`. A bare `zh` still lands in Simplified, because that is the majority and
 * because a guess has to go somewhere; `/language` is one tap away either way.
 *
 * A whole catalogue in one file, 191 keys, every placeholder from `en.ts`
 * reproduced verbatim.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`.
 */
export const ASIA_ZH_HANT: Partial<Record<LocaleCode, Partial<Messages>>> = {
  'zh-hant': {
    'skip.toContent': '跳至內容',

    'nav.main': '主要導覽',
    'nav.catalogue': '課程目錄',
    'nav.learn': '我的學習',
    'nav.family': '我的家庭',
    'nav.plans': '方案',
    'nav.subscriptions': '訂閱',
    'nav.teach': '授課',
    'nav.review': '審核',
    'nav.certificates': '證書',

    'footer.tagline': '為全世界的兒童與成人提供伊斯蘭教育。',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': '關於我們',
    'footer.terms': '條款與隱私',
    'footer.help': '說明',
    'footer.verify': '查驗證書',
    'footer.area': '你所在地區',
    'footer.notifications': '通知',

    'action.signIn': '登入',
    'action.getStarted': '開始使用',
    'action.signOut': '登出',
    'action.save': '儲存',
    'action.cancel': '取消',

    'region.africa': '非洲',
    'region.middleEast': '中東',
    'region.asia': '亞洲',
    'region.west': '歐洲與美洲',

    'language.title': '語言',
    'language.lede':
      '介面會以你在這裡選擇的語言顯示。瀏覽器會先採用你裝置所要求的語言，直到你選擇其他語言為止。',
    'language.current': '目前顯示',
    'language.chosen': '你在這個瀏覽器上選擇了此語言。',
    'language.device': '這是你裝置所要求的語言。選擇下方任一語言即可變更。',
    'language.default': '你的裝置要求的語言，本介面目前還沒有，因此以英文顯示。',
    'language.pick': '將此介面顯示為',
    'language.deviceOption': '我裝置的語言',
    'language.change': '變更語言',
    'language.saved': '已儲存。介面目前使用{language}。',
    'language.coverage':
      '本介面有 {percent}% 的文字已翻譯成{language}。尚未翻譯的部分以英文顯示。',
    'language.coverageAll': '此語言已全部翻譯完成。',
    'language.browser':
      '這個選擇只保存在本瀏覽器上，不會存到你的帳號，所以另一台裝置會詢問它自己的語言。',

    'catalogue.title': '尋找課程',
    'catalogue.lede': '每門課程在發布前都會經過審核。你可以依科目瀏覽，或搜尋課程、科目、老師。',
    'catalogue.doorChild': '為孩子學習',
    'catalogue.doorAdult': '為我自己學習',
    'catalogue.searchPlaceholder': '搜尋課程、科目、老師…',
    'catalogue.searchPlaceholderLessons': '搜尋課程、單元、科目、老師…',
    'catalogue.searchLabel': '搜尋課程',
    'catalogue.searchLabelLessons': '搜尋課程與單元',
    'catalogue.audience': '適用對象',
    'catalogue.search': '搜尋',
    'catalogue.allSubjects': '全部科目',
    'catalogue.anyLanguage': '任何語言',
    'catalogue.languageRow': '課程授課語言',
    'catalogue.pages': '頁碼',
    'catalogue.previous': '上一頁',
    'catalogue.next': '下一頁',
    'catalogue.pageOf': '第 {page} 頁，共 {pages} 頁',
    'catalogue.emptyPage': '這一頁沒有內容。可能已經超過列表的尾端。',
    'catalogue.emptyQuery': '沒有符合「{query}」的結果。可以試試科目、老師的名字，或單元裡的某個詞。',
    'catalogue.emptyQueryLessons': '沒有符合「{query}」的課程，但下方的單元符合。',
    'catalogue.emptyShelf': '目前還沒有課程。老師發布之後就會出現在這裡——沒有通過審核的不會顯示。',
    'catalogue.countOne': '{count} 門課程',
    'catalogue.countOther': '{count} 門課程',
    'catalogue.showing': '顯示第 {from}–{to} 項，共 {total} 項',

    'audience.child': '青少年學習者',
    'audience.adult': '成人',
    'audience.both': '所有年齡',

    'difficulty.beginner': '入門',
    'difficulty.intermediate': '中級',
    'difficulty.advanced': '進階',

    'price.free': '免費',
    'price.included': '已包含在你的權限內',
    'price.notOneOff': '不以單次課程出售',
    'price.ambiguous': '價格需要正確的幣別',
    'price.notAvailable': '你所在的國家／地區尚未開放',

    'card.sectionsOne': '{count} 個章節',
    'card.sectionsOther': '{count} 個章節',
    'card.lessonsOne': '{count} 個單元',
    'card.lessonsOther': '{count} 個單元',
    'card.minutes': '{count} 分鐘',
    'card.hours': '{count} 小時',
    'card.hoursMinutes': '{hours} 小時 {minutes} 分鐘',

    'auth.signInTitle': '登入',
    'auth.signUpTitle': '建立帳號',
    'auth.signInLede': '歡迎回來。',
    'auth.email': '電子郵件',
    'auth.password': '密碼',
    'auth.mobile': '手機號碼',
    'auth.countryCode': '國碼',
    'auth.otpCode': '簡訊驗證碼',
    'auth.tabPassword': '電子郵件與密碼',
    'auth.tabPhone': '手機驗證碼',
    'auth.google': '使用 Google 繼續',
    'auth.sendCode': '傳送驗證碼',
    'auth.verifyCode': '驗證驗證碼',
    'auth.resendCode': '重新傳送驗證碼',
    'auth.changeNumber': '變更號碼',
    'auth.forgot': '忘記密碼？',
    'auth.noAccount': '建立帳號',
    'auth.haveAccount': '已經有帳號了？',
    'auth.working': '處理中…',
    'auth.invalidPhone': '這看起來不像有效的電話號碼。請加上國碼。',
    'auth.somethingWrong': '發生了一點問題。',
    'auth.orGoogle': '或使用以下方式',
    'auth.orCreate': '或以電子郵件或手機號碼建立帳號',
    'auth.phoneAs': '將儲存為 {phone}',
    'auth.international': '已是國際格式。',
    'auth.passwordNote': '我們從不儲存密碼。密碼由 Supabase Auth 保管。',
    'auth.codeSent': '如果 {phone} 有帳號，驗證碼正在傳送中。',
    'auth.codeResent': '新驗證碼已傳送至 {phone}。',
    'auth.checkEmail': '帳號已建立。請收信確認地址，然後登入。',
    'auth.accountCreated': '已為 {phone} 建立帳號。',

    'doors.askAdult': '是在為自己找嗎？',
    'doors.askChild': '是在為孩子挑選嗎？',
    'doors.adultsShelf': '成人書架',
    'doors.youngShelf': '青少年書架',
    'doors.wholeCatalogue': '全部課程',

    'young.eyebrow': '青少年學習者',
    'young.title': '先為孩子。',
    'young.lede':
      '專為兒童教學編寫的課程——誦讀、《古蘭經》字母、他們最先該聽到的故事。每一門在出現在這裡之前都通過了學術審核。',
    'young.notice':
      '孩子不會自己註冊。帳號由父母或監護人持有，把孩子加入為學習者，並決定開放哪些內容；老師也可以在自己的帳號下為孩子報名。這個頁面上沒有任何東西是孩子的帳號，也沒有任何東西是孩子的資料。',
    'young.everyAge': '所有年齡',
    'young.emptyBand': '{band} 歲暫時還沒有內容。試試其他年齡，或查看全部課程。',
    'young.empty': '還沒有發布給青少年學習者的課程。這裡的一切都必須先通過審核。',

    'adults.eyebrow': '成人',
    'adults.title': '認真學。',
    'adults.lede':
      '為成人編寫的課程——阿拉伯語語法、教法、經注、誦讀學，深入講解。每一門在出現在這裡之前都通過了學術審核，而且你買下的每一門都屬於你自己：一次購買，一位學習者。',
    'adults.notice':
      '這是你自己的帳號，不是孩子的。如果你家裡也有孩子在學習，學習者切換會在你們之間移動，不會把兩者混在一起。',
    'adults.empty': '還沒有發布給成人的課程。這裡的一切都必須先通過審核。',

    'auth.forgotTitle': '重設密碼',
    'auth.forgotLede': '請輸入你帳號上的電子郵件地址。如果它已註冊，我們會寄送一個安全連結。',
    'auth.sendLink': '傳送重設連結',
    'auth.sending': '正在傳送…',
    'auth.resetSent':
      '如果有帳號使用該電子郵件，密碼重設連結正在傳送中。請查看收件匣與垃圾郵件資料夾。',
    'auth.resetFailed': '目前無法傳送重設連結。請核對地址後稍後再試。',
    'auth.backToSignIn': '返回登入',
    'auth.accountSettings': '帳號設定',
    'auth.chooseTitle': '選擇新密碼',
    'auth.chooseLede': '為此帳號設定新密碼。重設連結只能使用一次。',
    'auth.newPassword': '新密碼',
    'auth.confirmPassword': '確認新密碼',
    'auth.noMatch': '兩次輸入的密碼不一致。',
    'auth.enterPassword': '請輸入你的新密碼。',
    'auth.updatePassword': '更新密碼',
    'auth.updating': '正在更新…',
    'auth.offline': '無法連線到伺服器。請檢查網路後再試一次。',

    'home.eyebrow': '伊斯蘭教育，遍及世界',
    'home.title': '依適合你的步調，學習你的信仰。',
    'home.lede':
      '《古蘭經》、阿拉伯語、教法、聖訓等等——由合格的老師教授，給兒童也給成人，無論你在哪裡。',
    'home.browse': '瀏覽課程目錄',
    'home.createAccount': '免費建立帳號',
    'home.continue': '繼續學習',
    'home.paths': '探索學習路徑',
    'home.note': '瀏覽不收費。報名時才付費，針對一位具名的學習者，而且從不向孩子索取電子郵件。',
    'home.meansEyebrow': '這代表什麼',
    'home.meansTitle': '這個平台拒絕做的三件事',
    'home.assure1Title': '上架之前先審核',
    'home.assure1Body':
      '課程來自合格的老師，並由對該科目有權限的人核准。作者不能核准自己的作品，每一次發布都有紀錄。',
    'home.assure2Title': '孩子的登入由監護人建立',
    'home.assure2Body':
      '孩子預設在父母的帳號下學習，只有父母建立之後才會有自己的登入方式——孩子自己選定的使用者名稱和自己設定的密碼，不會向孩子索取電子郵件。父母也可以隨時移除，而不影響任何一個單元。',
    'home.assure3Title': '一份仍然可以查驗的證書',
    'home.assure3Body': '每一份都帶有任何人都能查詢的編號，即使課程後來下架，它依然可以查驗。',
    'home.studyTitle': '你可以學什麼',
    'home.studyCountOne': '{count} 個科目，每一科都由經過該科目審核的老師教授。',
    'home.studyCountOther': '{count} 個科目，每一科都由經過該科目審核的老師教授。',
    'home.studyEmpty': '隨著課程加入，科目會顯示在這裡。完整清單始終在課程目錄裡。',
    'home.doorChildBody':
      '為青少年學習者編寫，由父母或監護人的帳號持有，只有那位成人為其建立時，才會有自己的登入方式。',
    'home.doorAdultBody': '為你自己學習，依你自己的程度，並附上可以向任何詢問者出示的證書。',
    'home.doorOpen': '看看裡面有什麼',
    'home.doorCatalogue': '在課程目錄中查看',
    'home.howTitle': '如何運作',
    'home.step': '第 {number} 步',
    'home.step1Title': '選擇誰來學習',
    'home.step1Body':
      '你自己，或你負責的孩子。課程是為一位具名的學習者購買的，所以一起購買的家人仍然知道誰的學習進度是誰的。',
    'home.step2Title': '依你自己的步調學習',
    'home.step2Body':
      '單元、會核對答案但不評分的練習題，以及一個會記住你在每個開啟過的單元裡停在哪裡的地方。',
    'home.step3Title': '留下一些東西',
    'home.step3Body': '學習進度、一份從不被改寫的收據，以及一份多年後編號仍可查驗的證書。',
    'home.aboutLink': '課程是怎麼來到這裡的，孩子的資料會怎麼樣',
    'home.teachEyebrow': '給老師',
    'home.teachTitle': '把你的學生帶來。',
    'home.teachBody1':
      '如果你已經在授課，這個平台就是你本來不必自己動手做的部分：章節與單元、懂這門課的人來審核、與工作人員一同定的價格，以及你的收入依幣別分別顯示在一頁上。',
    'home.teachBody2':
      '老師保留每筆銷售的一半。在這裡授課需要預約——平台擁有者一次加入一位老師——而且目前還沒有任何服務商轉移資金，所以收入頁面說的是應付多少，而不是聲稱已經寄出。',
    'home.teachArea': '授課區',
    'home.teachReview': '課程如何審核',
    'home.closingTitle': '從課程目錄開始。',
    'home.closingSignedOut':
      '每一門已發布的課程都列出內容與授課老師。找到想收藏的課程時再建立帳號。',
    'home.closingSignedIn':
      '每一門已發布的課程都列出內容與授課老師。你的報名、進度與證書都在同一個地方。',

    'language.reviewed': '已有一位以此語言為母語的人讀過這份翻譯。',
    'language.unreviewed':
      '目前還沒有以此語言為母語的人讀過這份翻譯。它是由建立這個平台的人寫的——如果某個詞在你看來不對，那是我們欠你的一個錯誤。',
    'language.notTranslated':
      '僅介面已翻譯。課程標題、單元、老師頁面與已發布的政策，以原本書寫的語言顯示。',
  },
};
