import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * 简体中文 — Chinese, Simplified.
 *
 * The largest single pool of readers this platform could reach, and the one where
 * "one Chinese file" would have been the wrong answer: Simplified and Traditional
 * are two catalogues here, because 软件 and 軟體 are the same word to a machine
 * and different words to the person reading, and a Taiwanese parent handed
 * Mainland vocabulary reads a translation done for somebody else.
 *
 * **This one is the Mainland row**, `zh-hans`: Simplified characters, and the
 * vocabulary of Beijing — 网络, 视频, 信息, 用户 — rather than Taipei's 網路, 影片,
 * 資訊, 使用者.
 *
 * `matchLocale` reaches it from `zh-Hans`, `zh-Hans-CN` or a bare `zh`, because
 * it now drops one trailing subtag at a time instead of jumping straight from the
 * whole tag to the base. A bare `zh` is a guess, and it is a deliberate one:
 * Simplified is what most of the world's Chinese readers use.
 *
 * A whole catalogue in one file, 191 keys, every placeholder from `en.ts`
 * reproduced verbatim — `{count}`, `{number}`, `{year}`, `{query}`, `{band}`,
 * `{phone}`, `{language}`, `{percent}`, `{page}`, `{pages}`, `{from}`, `{to}`,
 * `{total}`, `{hours}`, `{minutes}`.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`.
 */
export const ASIA_ZH_HANS: Partial<Record<LocaleCode, Partial<Messages>>> = {
  'zh-hans': {
    'skip.toContent': '跳到正文',

    'nav.main': '主导航',
    'nav.catalogue': '课程目录',
    'nav.learn': '我的学习',
    'nav.family': '我的家庭',
    'nav.plans': '方案',
    'nav.subscriptions': '订阅',
    'nav.teach': '授课',
    'nav.review': '审核',
    'nav.certificates': '证书',

    'footer.tagline': '为全世界的儿童与成人提供伊斯兰教育。',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': '关于我们',
    'footer.terms': '条款与隐私',
    'footer.help': '帮助',
    'footer.verify': '查验证书',
    'footer.area': '你所在地区',
    'footer.notifications': '通知',

    'action.signIn': '登录',
    'action.getStarted': '开始使用',
    'action.signOut': '退出登录',
    'action.save': '保存',
    'action.cancel': '取消',

    'region.africa': '非洲',
    'region.middleEast': '中东',
    'region.asia': '亚洲',
    'region.west': '欧洲与美洲',

    'language.title': '语言',
    'language.lede':
      '界面会用你在这里选择的语言显示。浏览器会先使用你设备所请求的语言，直到你选择了别的语言为止。',
    'language.current': '当前显示',
    'language.chosen': '你在这个浏览器上选择了此语言。',
    'language.device': '这是你设备所请求的语言。选择下面的语言即可更改。',
    'language.default': '你的设备请求的语言，本界面还没有，因此显示为英语。',
    'language.pick': '将此界面显示为',
    'language.deviceOption': '我设备的语言',
    'language.change': '更改语言',
    'language.saved': '已保存。界面现在使用{language}。',
    'language.coverage':
      '本界面有 {percent}% 的文字已翻译成{language}。尚未翻译的部分以英语显示。',
    'language.coverageAll': '此语言已全部翻译完成。',
    'language.browser':
      '这个选择只保存在本浏览器上，不保存在你的账户里，所以另一台设备会询问它自己的语言。',

    'catalogue.title': '查找课程',
    'catalogue.lede': '每门课程发布前都会经过审核。你可以按科目浏览，或搜索课程、科目、老师。',
    'catalogue.doorChild': '为孩子学习',
    'catalogue.doorAdult': '为我自己学习',
    'catalogue.searchPlaceholder': '搜索课程、科目、老师…',
    'catalogue.searchPlaceholderLessons': '搜索课程、课时、科目、老师…',
    'catalogue.searchLabel': '搜索课程',
    'catalogue.searchLabelLessons': '搜索课程与课时',
    'catalogue.audience': '适用对象',
    'catalogue.search': '搜索',
    'catalogue.allSubjects': '全部科目',
    'catalogue.anyLanguage': '任何语言',
    'catalogue.languageRow': '课程授课语言',
    'catalogue.pages': '页码',
    'catalogue.previous': '上一页',
    'catalogue.next': '下一页',
    'catalogue.pageOf': '第 {page} 页，共 {pages} 页',
    'catalogue.emptyPage': '这一页没有内容。可能已经超出列表末尾。',
    'catalogue.emptyQuery': '没有匹配“{query}”的结果。可以试试科目、老师的名字，或课时里的某个词。',
    'catalogue.emptyQueryLessons': '没有匹配“{query}”的课程，但下面的课时匹配了。',
    'catalogue.emptyShelf': '目前还没有课程。老师发布之后就会出现在这里——没有通过审核的不会显示。',
    'catalogue.countOne': '{count} 门课程',
    'catalogue.countOther': '{count} 门课程',
    'catalogue.showing': '显示第 {from}–{to} 项，共 {total} 项',

    'audience.child': '少年学习者',
    'audience.adult': '成人',
    'audience.both': '所有年龄',

    'difficulty.beginner': '入门',
    'difficulty.intermediate': '中级',
    'difficulty.advanced': '高级',

    'price.free': '免费',
    'price.included': '已包含在你的权限内',
    'price.notOneOff': '不作为一次性课程出售',
    'price.ambiguous': '价格需要正确的货币',
    'price.notAvailable': '你所在的国家/地区暂未开放',

    'card.sectionsOne': '{count} 个章节',
    'card.sectionsOther': '{count} 个章节',
    'card.lessonsOne': '{count} 节课',
    'card.lessonsOther': '{count} 节课',
    'card.minutes': '{count} 分钟',
    'card.hours': '{count} 小时',
    'card.hoursMinutes': '{hours} 小时 {minutes} 分钟',

    'auth.signInTitle': '登录',
    'auth.signUpTitle': '创建账户',
    'auth.signInLede': '欢迎回来。',
    'auth.email': '电子邮件',
    'auth.password': '密码',
    'auth.mobile': '手机号码',
    'auth.countryCode': '国家代码',
    'auth.otpCode': '短信验证码',
    'auth.tabPassword': '邮箱与密码',
    'auth.tabPhone': '手机验证码',
    'auth.google': '使用 Google 继续',
    'auth.sendCode': '发送验证码',
    'auth.verifyCode': '验证码验证',
    'auth.resendCode': '重新发送验证码',
    'auth.changeNumber': '更改号码',
    'auth.forgot': '忘记密码？',
    'auth.noAccount': '创建账户',
    'auth.haveAccount': '已经有账户了？',
    'auth.working': '处理中…',
    'auth.invalidPhone': '这看起来不是有效的电话号码。请加上国家代码。',
    'auth.somethingWrong': '出了点问题。',
    'auth.orGoogle': '或使用以下方式',
    'auth.orCreate': '或用电子邮件或手机号创建账户',
    'auth.phoneAs': '将保存为 {phone}',
    'auth.international': '已是国际格式。',
    'auth.passwordNote': '我们从不保存密码。密码由 Supabase Auth 保管。',
    'auth.codeSent': '如果 {phone} 有账户，验证码正在发送中。',
    'auth.codeResent': '新验证码已发送至 {phone}。',
    'auth.checkEmail': '账户已创建。请查收邮件确认地址，然后登录。',
    'auth.accountCreated': '已为 {phone} 创建账户。',

    'doors.askAdult': '是在为自己找吗？',
    'doors.askChild': '是在为孩子选吗？',
    'doors.adultsShelf': '成人书架',
    'doors.youngShelf': '少年书架',
    'doors.wholeCatalogue': '全部课程',

    'young.eyebrow': '少年学习者',
    'young.title': '先为孩子。',
    'young.lede':
      '专为儿童教学编写的课程——诵读、《古兰经》字母、他们最先该听到的故事。每一门在出现在这里之前都通过了学术审核。',
    'young.notice':
      '孩子不会自己注册。账户由父母或监护人持有，把孩子添加为学习者，并决定开放哪些内容；老师也可以在自己的账户下为孩子报名。这个页面上没有任何东西是孩子的账户，也没有任何东西是孩子的数据。',
    'young.everyAge': '所有年龄',
    'young.emptyBand': '{band} 岁暂时还没有内容。试试其他年龄，或查看全部课程。',
    'young.empty': '还没有发布面向少年学习者的课程。这里的一切都必须先通过审核。',

    'adults.eyebrow': '成人',
    'adults.title': '认真学。',
    'adults.lede':
      '为成人编写的课程——阿拉伯语语法、教法、经注、诵读学，深入讲解。每一门在出现在这里之前都通过了学术审核，而且你买下的每一门都属于你自己：一次购买，一位学习者。',
    'adults.notice':
      '这是你自己的账户，不是孩子的。如果你家里也有孩子在学习，学习者切换会在你们之间移动，不会把两者混在一起。',
    'adults.empty': '还没有发布面向成人的课程。这里的一切都必须先通过审核。',

    'auth.forgotTitle': '重置密码',
    'auth.forgotLede': '请输入你账户上的电子邮件地址。如果它已注册，我们会发送一个安全链接。',
    'auth.sendLink': '发送重置链接',
    'auth.sending': '正在发送…',
    'auth.resetSent':
      '如果有账户使用该邮箱，密码重置链接正在发送中。请查看收件箱和垃圾邮件文件夹。',
    'auth.resetFailed': '目前无法发送重置链接。请核对地址后稍后再试。',
    'auth.backToSignIn': '返回登录',
    'auth.accountSettings': '账户设置',
    'auth.chooseTitle': '选择新密码',
    'auth.chooseLede': '为此账户设置新密码。重置链接只能使用一次。',
    'auth.newPassword': '新密码',
    'auth.confirmPassword': '确认新密码',
    'auth.noMatch': '两次输入的密码不一致。',
    'auth.enterPassword': '请输入你的新密码。',
    'auth.updatePassword': '更新密码',
    'auth.updating': '正在更新…',
    'auth.offline': '无法连接服务器。请检查网络后重试。',

    'home.eyebrow': '伊斯兰教育，遍及世界',
    'home.title': '按适合你的节奏，学习你的信仰。',
    'home.lede':
      '《古兰经》、阿拉伯语、教法、圣训等等——由合格的老师教授，面向儿童与成人，无论你在哪里。',
    'home.browse': '浏览课程目录',
    'home.createAccount': '免费创建账户',
    'home.continue': '继续学习',
    'home.paths': '探索学习路径',
    'home.note': '浏览不收费。报名时才付费，针对一位具名的学习者，而且从不向孩子索取电子邮箱。',
    'home.meansEyebrow': '这意味着什么',
    'home.meansTitle': '这个平台拒绝做的三件事',
    'home.assure1Title': '上架之前先审核',
    'home.assure1Body':
      '课程来自合格的老师，并由对相关科目有权限的人批准。作者不能批准自己的作品，每一次发布都有记录。',
    'home.assure2Title': '孩子的登录由监护人创建',
    'home.assure2Body':
      '孩子默认在父母的账户下学习，只有父母创建之后才会有自己的登录方式——孩子自己选定的用户名和自己设置的密码，不会向孩子索取电子邮箱。父母也可以随时移除，而不影响任何一节课。',
    'home.assure3Title': '一份仍然可以查验的证书',
    'home.assure3Body': '每一份都带有任何人都能查询的编号，即使课程后来下架，它依然可以查验。',
    'home.studyTitle': '你可以学什么',
    'home.studyCountOne': '{count} 个科目，每一科都由经过该科目审核的老师教授。',
    'home.studyCountOther': '{count} 个科目，每一科都由经过该科目审核的老师教授。',
    'home.studyEmpty': '随着课程加入，科目会显示在这里。完整列表始终在课程目录里。',
    'home.doorChildBody':
      '为少年学习者编写，由父母或监护人的账户持有，只有那位成人为其创建时，才会有自己的登录方式。',
    'home.doorAdultBody': '为你自己学习，按你自己的水平，并附上可以向任何询问者出示的证书。',
    'home.doorOpen': '看看里面有什么',
    'home.doorCatalogue': '在课程目录中查看',
    'home.howTitle': '如何运作',
    'home.step': '第 {number} 步',
    'home.step1Title': '选择谁来学习',
    'home.step1Body':
      '你自己，或你负责的孩子。课程是为一位具名的学习者购买的，所以一起购买的家人仍然知道谁的学习进度是谁的。',
    'home.step2Title': '按你自己的节奏学习',
    'home.step2Body':
      '课时、会核对答案但不评分的练习题，以及一个会记住你在每一节打开过的课上停在哪里的地方。',
    'home.step3Title': '留下一些东西',
    'home.step3Body': '学习进度、一份从不被改写的收据，以及一份多年后编号仍可查验的证书。',
    'home.aboutLink': '课程是怎么来到这里的，孩子的数据会怎么样',
    'home.teachEyebrow': '致老师',
    'home.teachTitle': '把你的学生带来。',
    'home.teachBody1':
      '如果你已经在授课，这个平台就是你本来不该自己动手做的部分：章节与课时、懂这门课的人来审核、与工作人员一同定的价格，以及你的收入按货币分别显示在一页上。',
    'home.teachBody2':
      '老师保留每笔销售的一半。在这里授课需要预约——平台所有者一次添加一位老师——而且目前还没有任何服务商转移资金，所以收入页面说的是应付多少，而不是声称已经寄出。',
    'home.teachArea': '授课区',
    'home.teachReview': '课程如何审核',
    'home.closingTitle': '从课程目录开始。',
    'home.closingSignedOut':
      '每一门已发布的课程都列有内容与授课老师。找到想收藏的课程时再创建账户。',
    'home.closingSignedIn':
      '每一门已发布的课程都列有内容与授课老师。你的报名、进度和证书都在一个地方。',

    'language.reviewed': '已有一位以此语言为母语的人读过这份译文。',
    'language.partial':
      '母语者已阅读本译文的 {total} 个部分中的 {read} 个。',
    'language.unreviewed':
      '目前还没有以此语言为母语的人读过这份译文。它是由搭建这个平台的人写的——如果某个词在你看来不对，那是我们欠你的一个错误。',
    'language.notTranslated':
      '仅界面已翻译。课程标题、课时、老师页面和已发布的政策，以其原本书写的语言显示。',
  },
};
