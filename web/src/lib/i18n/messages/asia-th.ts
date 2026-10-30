import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * ไทย — Thai.
 *
 * Around seventy million speakers, and a Muslim community of some five million in
 * the deep south whose first language is usually Pattani Malay but whose school
 * language, form language and phone language are Thai. A platform that spoke Malay
 * and not Thai could be read by that family in the mosque and not at the school
 * gate.
 *
 * Thai has no spaces between words in running text; they are used here where
 * they would be used in a menu — between phrases, and around numbers — because a
 * button is not a paragraph.
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
export const ASIA_TH: Partial<Record<LocaleCode, Partial<Messages>>> = {
  th: {
    'skip.toContent': 'ข้ามไปยังเนื้อหา',

    'nav.main': 'หลัก',
    'nav.catalogue': 'หลักสูตร',
    'nav.learn': 'การเรียนของฉัน',
    'nav.family': 'ครอบครัวของฉัน',
    'nav.plans': 'แพ็กเกจ',
    'nav.subscriptions': 'การสมัครสมาชิก',
    'nav.teach': 'สอน',
    'nav.review': 'ตรวจประเมิน',
    'nav.certificates': 'ประกาศนียบัตร',

    'footer.tagline': 'การศึกษาอิสลามสำหรับเด็กและผู้ใหญ่ ทั่วโลก',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'เกี่ยวกับเรา',
    'footer.terms': 'ข้อกำหนดและความเป็นส่วนตัว',
    'footer.help': 'ช่วยเหลือ',
    'footer.verify': 'ตรวจสอบประกาศนียบัตร',
    'footer.area': 'พื้นที่ของคุณ',
    'footer.notifications': 'การแจ้งเตือน',

    'action.signIn': 'เข้าสู่ระบบ',
    'action.getStarted': 'เริ่มต้น',
    'action.signOut': 'ออกจากระบบ',
    'action.save': 'บันทึก',
    'action.cancel': 'ยกเลิก',

    'region.africa': 'แอฟริกา',
    'region.middleEast': 'ตะวันออกกลาง',
    'region.asia': 'เอเชีย',
    'region.west': 'ยุโรปและอเมริกา',

    'language.title': 'ภาษา',
    'language.lede':
      'หน้าจอจะแสดงเป็นภาษาที่คุณเลือกไว้ที่นี่ เบราว์เซอร์เริ่มด้วยภาษาที่อุปกรณ์ของคุณขอ และใช้ภาษานั้นต่อไปจนกว่าคุณจะเลือกภาษาอื่น',
    'language.current': 'กำลังแสดง',
    'language.chosen': 'คุณเลือกภาษานี้ในเบราว์เซอร์นี้',
    'language.device': 'นี่คือภาษาที่อุปกรณ์ของคุณขอ เลือกภาษาด้านล่างเพื่อเปลี่ยน',
    'language.default':
      'อุปกรณ์ของคุณขอภาษาที่หน้าจอนี้ยังไม่มี จึงแสดงเป็นภาษาอังกฤษ',
    'language.pick': 'แสดงหน้าจอเป็นภาษา',
    'language.deviceOption': 'ภาษาของอุปกรณ์ฉัน',
    'language.change': 'เปลี่ยนภาษา',
    'language.saved': 'บันทึกแล้ว หน้าจอเป็นภาษา{language}',
    'language.coverage':
      'ข้อความในหน้าจอนี้แปลเป็นภาษา{language}แล้ว {percent}% ส่วนที่ยังไม่ได้แปลจะแสดงเป็นภาษาอังกฤษ',
    'language.coverageAll': 'ภาษานี้แปลครบทั้งหมดแล้ว',
    'language.browser':
      'ตัวเลือกนี้เก็บไว้ในเบราว์เซอร์นี้ ไม่ใช่ในบัญชีของคุณ อุปกรณ์อื่นจึงจะถามภาษาของตัวเอง',

    'catalogue.title': 'ค้นหาหลักสูตร',
    'catalogue.lede':
      'ทุกหลักสูตรได้รับการตรวจประเมินก่อนเผยแพร่ ดูตามวิชา หรือค้นหาหลักสูตร วิชา หรือผู้สอน',
    'catalogue.doorChild': 'การเรียนสำหรับเด็ก',
    'catalogue.doorAdult': 'การเรียนสำหรับฉัน',
    'catalogue.searchPlaceholder': 'หลักสูตร วิชา ผู้สอน…',
    'catalogue.searchPlaceholderLessons': 'หลักสูตร บทเรียน วิชา ผู้สอน…',
    'catalogue.searchLabel': 'ค้นหาหลักสูตร',
    'catalogue.searchLabelLessons': 'ค้นหาหลักสูตรและบทเรียน',
    'catalogue.audience': 'สำหรับใคร',
    'catalogue.search': 'ค้นหา',
    'catalogue.allSubjects': 'ทุกวิชา',
    'catalogue.anyLanguage': 'ทุกภาษา',
    'catalogue.languageRow': 'ภาษาที่ใช้สอนในหลักสูตร',
    'catalogue.pages': 'หน้า',
    'catalogue.previous': 'ก่อนหน้า',
    'catalogue.next': 'ถัดไป',
    'catalogue.pageOf': 'หน้า {page} จาก {pages}',
    'catalogue.emptyPage': 'หน้านี้ไม่มีอะไร อาจอยู่เลยจุดสิ้นสุดของรายการ',
    'catalogue.emptyQuery':
      'ไม่พบสิ่งที่ตรงกับ “{query}” ลองค้นด้วยวิชา ชื่อผู้สอน หรือคำจากบทเรียน',
    'catalogue.emptyQueryLessons': 'ไม่มีหลักสูตรที่ตรงกับ “{query}” แต่บทเรียนด้านล่างตรง',
    'catalogue.emptyShelf':
      'ยังไม่มีหลักสูตร เมื่อผู้สอนเผยแพร่หลักสูตร จะปรากฏที่นี่ — ไม่มีสิ่งใดแสดงจนกว่าจะผ่านการตรวจประเมิน',
    'catalogue.countOne': '{count} หลักสูตร',
    'catalogue.countOther': '{count} หลักสูตร',
    'catalogue.showing': 'แสดง {from}–{to} จาก {total}',

    'audience.child': 'ผู้เรียนวัยเยาว์',
    'audience.adult': 'ผู้ใหญ่',
    'audience.both': 'ทุกวัย',

    'difficulty.beginner': 'เริ่มต้น',
    'difficulty.intermediate': 'ปานกลาง',
    'difficulty.advanced': 'ขั้นสูง',

    'price.free': 'ฟรี',
    'price.included': 'รวมอยู่ในสิทธิ์เข้าถึงของคุณ',
    'price.notOneOff': 'ไม่ขายเป็นหลักสูตรจ่ายครั้งเดียว',
    'price.ambiguous': 'ราคาต้องใช้สกุลเงินที่ถูกต้อง',
    'price.notAvailable': 'ยังไม่เปิดให้ใช้ในประเทศของคุณ',

    'card.sectionsOne': '{count} ส่วน',
    'card.sectionsOther': '{count} ส่วน',
    'card.lessonsOne': '{count} บทเรียน',
    'card.lessonsOther': '{count} บทเรียน',
    'card.minutes': '{count} นาที',
    'card.hours': '{count} ชม.',
    'card.hoursMinutes': '{hours} ชม. {minutes} นาที',

    'auth.signInTitle': 'เข้าสู่ระบบ',
    'auth.signUpTitle': 'สร้างบัญชี',
    'auth.signInLede': 'ยินดีต้อนรับกลับ',
    'auth.email': 'อีเมล',
    'auth.password': 'รหัสผ่าน',
    'auth.mobile': 'หมายเลขโทรศัพท์มือถือ',
    'auth.countryCode': 'รหัสประเทศ',
    'auth.otpCode': 'รหัสจากข้อความ',
    'auth.tabPassword': 'อีเมลและรหัสผ่าน',
    'auth.tabPhone': 'รหัสทางโทรศัพท์',
    'auth.google': 'ดำเนินการต่อด้วย Google',
    'auth.sendCode': 'ส่งรหัส',
    'auth.verifyCode': 'ยืนยันรหัส',
    'auth.resendCode': 'ส่งรหัสอีกครั้ง',
    'auth.changeNumber': 'เปลี่ยนหมายเลข',
    'auth.forgot': 'ลืมรหัสผ่าน?',
    'auth.noAccount': 'สร้างบัญชี',
    'auth.haveAccount': 'มีบัญชีอยู่แล้ว?',
    'auth.working': 'กำลังดำเนินการ…',
    'auth.invalidPhone': 'ดูเหมือนไม่ใช่หมายเลขโทรศัพท์ที่ถูกต้อง กรุณาใส่รหัสประเทศ',
    'auth.somethingWrong': 'เกิดข้อผิดพลาด',
    'auth.orGoogle': 'หรือใช้หนึ่งในนี้',
    'auth.orCreate': 'หรือสร้างบัญชีด้วยอีเมลหรือหมายเลขโทรศัพท์',
    'auth.phoneAs': 'จะบันทึกเป็น {phone}',
    'auth.international': 'อยู่ในรูปแบบสากลแล้ว',
    'auth.passwordNote': 'เราไม่เคยเก็บรหัสผ่าน Supabase Auth เป็นผู้ถือข้อมูลนี้',
    'auth.codeSent': 'หากมีบัญชีสำหรับ {phone} รหัสกำลังเดินทางไป',
    'auth.codeResent': 'ส่งรหัสใหม่ไปยัง {phone} แล้ว',
    'auth.checkEmail': 'สร้างบัญชีแล้ว ตรวจอีเมลเพื่อยืนยันที่อยู่ แล้วเข้าสู่ระบบ',
    'auth.accountCreated': 'สร้างบัญชีสำหรับ {phone} แล้ว',

    'doors.askAdult': 'กำลังหาสำหรับตัวเองหรือ',
    'doors.askChild': 'กำลังเลือกให้เด็กหรือ',
    'doors.adultsShelf': 'ชั้นหนังสือผู้ใหญ่',
    'doors.youngShelf': 'ชั้นหนังสือผู้เรียนวัยเยาว์',
    'doors.wholeCatalogue': 'หลักสูตรทั้งหมด',
    'young.eyebrow': 'ผู้เรียนวัยเยาว์',
    'young.title': 'เด็กก่อน',
    'young.lede':
      'หลักสูตรที่เขียนขึ้นเพื่อสอนเด็ก — การอ่านออกเสียง อักษรอาหรับ เรื่องเล่าที่ควรได้ยินก่อน ทุกหลักสูตรผ่านการตรวจประเมินทางวิชาการก่อนมาอยู่ที่นี่',
    'young.notice':
      'เด็กไม่ได้สมัครด้วยตัวเอง ผู้ปกครองหรือผู้ดูแลเป็นผู้ถือบัญชี เพิ่มเด็กเป็นผู้เรียน และตัดสินใจว่าอะไรจะเปิดได้ ผู้สอนอาจลงทะเบียนเด็กในบัญชีของตนได้ ไม่มีสิ่งใดในหน้านี้เป็นบัญชีของเด็ก และไม่มีสิ่งใดเป็นข้อมูลของเด็ก',
    'young.everyAge': 'ทุกวัย',
    'young.emptyBand':
      'ยังไม่มีรายการสำหรับวัย {band} ลองดูวัยอื่นหรือหลักสูตรทั้งหมด',
    'young.empty':
      'ยังไม่มีหลักสูตรสำหรับผู้เรียนวัยเยาว์ ทุกอย่างที่นี่ต้องผ่านการตรวจประเมินก่อน',
    'adults.eyebrow': 'ผู้ใหญ่',
    'adults.title': 'เรียนให้ลึก',
    'adults.lede':
      'หลักสูตรที่เขียนเพื่อผู้ใหญ่ — ไวยากรณ์อาหรับ ฟิกฮ์ ตัฟซีร ตัจวีด อย่างลึกซึ้ง ทุกหลักสูตรผ่านการตรวจประเมินทางวิชาการก่อนมาอยู่ที่นี่ และสิ่งที่คุณซื้อเป็นของคุณ: ซื้อครั้งเดียว ผู้เรียนหนึ่งคน',
    'adults.notice':
      'นี่คือบัญชีของคุณเอง ไม่ใช่ของเด็ก หากเด็กในครอบครัวของคุณเรียนด้วย ตัวสลับผู้เรียนจะย้ายระหว่างคุณกับเด็กโดยไม่ปนกัน',
    'adults.empty':
      'ยังไม่มีหลักสูตรสำหรับผู้ใหญ่ ทุกอย่างที่นี่ต้องผ่านการตรวจประเมินก่อน',

    'auth.forgotTitle': 'ตั้งรหัสผ่านใหม่',
    'auth.forgotLede':
      'กรอกอีเมลที่ใช้กับบัญชีของคุณ หากอีเมลนี้ลงทะเบียนไว้ เราจะส่งลิงก์ที่ปลอดภัยให้',
    'auth.sendLink': 'ส่งลิงก์ตั้งรหัสใหม่',
    'auth.sending': 'กำลังส่ง…',
    'auth.resetSent':
      'หากมีบัญชีที่ใช้อีเมลนี้ ลิงก์ตั้งรหัสผ่านใหม่กำลังเดินทางไป ตรวจกล่องจดหมายและโฟลเดอร์สแปม',
    'auth.resetFailed': 'ตอนนี้เราส่งลิงก์ไม่ได้ ตรวจที่อยู่อีเมลแล้วลองใหม่ภายหลัง',
    'auth.backToSignIn': 'กลับไปเข้าสู่ระบบ',
    'auth.accountSettings': 'การตั้งค่าบัญชี',
    'auth.chooseTitle': 'เลือกรหัสผ่านใหม่',
    'auth.chooseLede': 'ตั้งรหัสผ่านใหม่สำหรับบัญชีนี้ ลิงก์ตั้งรหัสใช้ได้ครั้งเดียว',
    'auth.newPassword': 'รหัสผ่านใหม่',
    'auth.confirmPassword': 'ยืนยันรหัสผ่านใหม่',
    'auth.noMatch': 'รหัสผ่านไม่ตรงกัน',
    'auth.enterPassword': 'กรอกรหัสผ่านใหม่ของคุณ',
    'auth.updatePassword': 'อัปเดตรหัสผ่าน',
    'auth.updating': 'กำลังอัปเดต…',
    'auth.offline': 'ติดต่อเซิร์ฟเวอร์ไม่ได้ ตรวจการเชื่อมต่อแล้วลองใหม่',

    'home.eyebrow': 'การศึกษาอิสลาม ทั่วโลก',
    'home.title': 'เรียนรู้ดีนของคุณ ในจังหวะที่เหมาะกับคุณ',
    'home.lede':
      'อัลกุรอาน ภาษาอาหรับ ฟิกฮ์ หะดีษ และอื่น ๆ — สอนโดยผู้สอนที่มีคุณสมบัติ สำหรับเด็กและผู้ใหญ่ ทุกที่ที่คุณอยู่',
    'home.browse': 'ดูหลักสูตร',
    'home.createAccount': 'สร้างบัญชีฟรี',
    'home.continue': 'เรียนต่อ',
    'home.paths': 'ดูเส้นทางการเรียน',
    'home.note':
      'การดูไม่มีค่าใช้จ่าย คุณจ่ายเมื่อลงทะเบียน สำหรับผู้เรียนหนึ่งคนที่ระบุชื่อ และไม่เคยถามอีเมลจากเด็ก',
    'home.meansEyebrow': 'นั่นหมายความว่าอะไร',
    'home.meansTitle': 'สามสิ่งที่แพลตฟอร์มนี้ปฏิเสธที่จะทำ',
    'home.assure1Title': 'ตรวจประเมินก่อนขึ้นรายการ',
    'home.assure1Body':
      'หลักสูตรมาจากผู้สอนที่มีคุณสมบัติ และได้รับการอนุมัติจากผู้มีอำนาจในวิชานั้น ผู้เขียนไม่อาจอนุมัติงานของตัวเอง และทุกการเผยแพร่ถูกบันทึกไว้',
    'home.assure2Title': 'การเข้าสู่ระบบของเด็กสร้างโดยผู้ปกครอง',
    'home.assure2Body':
      'เด็กเรียนภายใต้บัญชีของผู้ปกครองโดยปกติ และจะได้การเข้าสู่ระบบของตัวเองก็ต่อเมื่อผู้ปกครองสร้างให้ — ชื่อผู้ใช้ที่พวกเขาเลือกและรหัสผ่านที่พวกเขาตั้ง โดยไม่ถามอีเมลจากเด็ก ผู้ปกครองสามารถนำออกได้โดยไม่แตะบทเรียนใด ๆ',
    'home.assure3Title': 'ประกาศนียบัตรที่ยังตรวจสอบได้',
    'home.assure3Body':
      'แต่ละใบมีหมายเลขที่ใครก็ค้นได้ และยังตรวจสอบได้แม้หลักสูตรจะถูกถอดออกในภายหลัง',
    'home.studyTitle': 'สิ่งที่คุณเรียนได้',
    'home.studyCountOne': '{count} วิชา แต่ละวิชาสอนโดยผู้สอนที่ได้รับการตรวจประเมินสำหรับวิชานั้น',
    'home.studyCountOther': '{count} วิชา แต่ละวิชาสอนโดยผู้สอนที่ได้รับการตรวจประเมินสำหรับวิชานั้น',
    'home.studyEmpty':
      'วิชาจะปรากฏที่นี่เมื่อมีการเพิ่มหลักสูตร รายการที่สมบูรณ์คือหน้าหลักสูตรเสมอ',
    'home.doorChildBody':
      'เขียนขึ้นสำหรับผู้เรียนวัยเยาว์ ถูกถือโดยบัญชีของผู้ปกครองหรือผู้ดูแล และจะได้การเข้าสู่ระบบของตัวเองก็ต่อเมื่อผู้ใหญ่คนนั้นสร้างให้',
    'home.doorAdultBody':
      'เรียนเพื่อตัวเอง ในระดับของคุณ พร้อมประกาศนียบัตรที่แสดงให้ใครก็ได้ที่ถาม',
    'home.doorOpen': 'ดูว่ามีอะไรอยู่ที่นั่น',
    'home.doorCatalogue': 'ดูในหลักสูตร',
    'home.howTitle': 'ทำงานอย่างไร',
    'home.step': 'ขั้นที่ {number}',
    'home.step1Title': 'เลือกว่าใครจะเรียน',
    'home.step1Body':
      'ตัวคุณเอง หรือเด็กที่คุณรับผิดชอบ หลักสูตรซื้อสำหรับผู้เรียนหนึ่งคนที่ระบุชื่อ ครอบครัวที่ซื้อด้วยกันจึงยังรู้ว่าความก้าวหน้าของใครเป็นของใคร',
    'home.step2Title': 'เรียนในจังหวะของคุณ',
    'home.step2Body':
      'บทเรียน แบบฝึกหัดที่ตรวจคำตอบโดยไม่ให้คะแนน และที่ที่จำว่าคุณหยุดตรงไหนในทุกบทเรียนที่เปิด',
    'home.step3Title': 'เหลืออะไรไว้ข้างหลัง',
    'home.step3Body':
      'ความก้าวหน้า ใบเสร็จที่ไม่เคยถูกเขียนใหม่ และประกาศนียบัตรที่หมายเลขยังตรวจสอบได้ในอีกหลายปี',
    'home.aboutLink': 'หลักสูตรมาที่นี่ได้อย่างไร และเกิดอะไรกับข้อมูลของเด็ก',
    'home.teachEyebrow': 'สำหรับผู้สอน',
    'home.teachTitle': 'พานักเรียนของคุณมา',
    'home.teachBody1':
      'หากคุณสอนอยู่แล้ว แพลตฟอร์มคือส่วนที่คุณไม่ควรต้องสร้างเอง: ส่วนและบทเรียน การตรวจประเมินโดยผู้รู้วิชา ราคาที่ตกลงร่วมกับทีมงาน และสิ่งที่คุณได้รับแสดงแยกตามสกุลเงินในหน้าเดียว',
    'home.teachBody2':
      'ผู้สอนเก็บครึ่งหนึ่งของทุกการขาย การสอนที่นี่เป็นแบบนัดหมาย — เจ้าของแพลตฟอร์มเพิ่มผู้สอนทีละคน — และยังไม่มีผู้ให้บริการรายใดโอนเงิน หน้าสรุปรายได้จึงบอกว่าค้างเท่าไร ไม่ใช่บอกว่าส่งแล้ว',
    'home.teachArea': 'พื้นที่สอน',
    'home.teachReview': 'หลักสูตรได้รับการตรวจประเมินอย่างไร',
    'home.closingTitle': 'เริ่มจากหลักสูตร',
    'home.closingSignedOut':
      'ทุกหลักสูตรที่เผยแพร่มีรายการพร้อมเนื้อหาและผู้สอน สร้างบัญชีเมื่อพบหลักสูตรที่อยากเก็บไว้',
    'home.closingSignedIn':
      'ทุกหลักสูตรที่เผยแพร่มีรายการพร้อมเนื้อหาและผู้สอน การลงทะเบียน ความก้าวหน้า และประกาศนียบัตรของคุณอยู่ในที่เดียว',

    'language.reviewed': 'เจ้าของภาษาตรวจอ่านคำแปลนี้แล้ว',
    'language.partial':
      'ผู้พูดภาษาแม่ได้อ่านแล้ว {read} จาก {total} ส่วนของการแปลนี้',
    'language.unreviewed':
      'ยังไม่มีเจ้าของภาษาตรวจอ่านคำแปลนี้ ผู้ที่สร้างแพลตฟอร์มเป็นผู้เขียน — หากคำใดดูไม่ถูกต้อง ข้อผิดพลาดเป็นของเรา',
    'language.notTranslated':
      'แปลเฉพาะหน้าจอเท่านั้น ชื่อหลักสูตร บทเรียน หน้าผู้สอน และนโยบายที่เผยแพร่จะแสดงในภาษาที่เขียนไว้',
  },
};
