import type { LocaleCode } from '../locales.ts';
import type { Messages } from './en.ts';

/**
 * Tiếng Việt — Vietnamese.
 *
 * Around eighty-five million speakers, a Muslim community of about eighty
 * thousand — Cham, and a growing number of converts in the south and in Ho Chi
 * Minh City — and one of the largest diaspora populations of any language here,
 * in California, Texas, Australia, France and Czechia.
 *
 * The diacritics do real work: `ma`, `mà`, `má`, `mả`, `mã`, `mạ` are six
 * different words. They are written in full here, and every tone mark is the one
 * the word needs, because a menu with the marks stripped is a menu that reads
 * like a foreigner sounding it out.
 *
 * A whole catalogue in one file, 191 keys, every placeholder from `en.ts`
 * reproduced verbatim — `{count}`, `{number}`, `{year}`, `{query}`, `{band}`,
 * `{phone}`, `{language}`, `{percent}`, `{page}`, `{pages}`, `{from}`, `{to}`,
 * `{total}`, `{hours}`, `{minutes}`.
 *
 * Not yet read by a first-language speaker — `reviewed: false` in `locales.ts`.
 */
export const ASIA_VI: Partial<Record<LocaleCode, Partial<Messages>>> = {
  vi: {
    'skip.toContent': 'Chuyển đến nội dung',

    'nav.main': 'Chính',
    'nav.catalogue': 'Danh mục khoá học',
    'nav.learn': 'Việc học của tôi',
    'nav.family': 'Gia đình tôi',
    'nav.plans': 'Gói',
    'nav.subscriptions': 'Đăng ký',
    'nav.teach': 'Giảng dạy',
    'nav.review': 'Thẩm định',
    'nav.certificates': 'Chứng chỉ',

    'footer.tagline': 'Giáo dục Hồi giáo cho trẻ em và người lớn, trên toàn thế giới.',
    'footer.rights': '© {year} AyahSpring',
    'footer.about': 'Giới thiệu',
    'footer.terms': 'Điều khoản và quyền riêng tư',
    'footer.help': 'Trợ giúp',
    'footer.verify': 'Tra cứu chứng chỉ',
    'footer.area': 'Khu vực của bạn',
    'footer.notifications': 'Thông báo',

    'action.signIn': 'Đăng nhập',
    'action.getStarted': 'Bắt đầu',
    'action.signOut': 'Đăng xuất',
    'action.save': 'Lưu',
    'action.cancel': 'Huỷ',

    'region.africa': 'Châu Phi',
    'region.middleEast': 'Trung Đông',
    'region.asia': 'Châu Á',
    'region.west': 'Châu Âu và châu Mỹ',

    'language.title': 'Ngôn ngữ',
    'language.lede':
      'Giao diện hiển thị bằng ngôn ngữ bạn chọn ở đây. Trình duyệt bắt đầu bằng ngôn ngữ mà thiết bị của bạn yêu cầu, và giữ nguyên cho đến khi bạn chọn một ngôn ngữ khác.',
    'language.current': 'Đang hiển thị',
    'language.chosen': 'Bạn đã chọn ngôn ngữ này trên trình duyệt này.',
    'language.device': 'Đây là ngôn ngữ thiết bị của bạn yêu cầu. Chọn một ngôn ngữ bên dưới để đổi.',
    'language.default':
      'Thiết bị của bạn yêu cầu một ngôn ngữ mà giao diện này chưa có, nên nó đang hiển thị bằng tiếng Anh.',
    'language.pick': 'Hiển thị giao diện bằng',
    'language.deviceOption': 'Ngôn ngữ trên thiết bị của tôi',
    'language.change': 'Đổi ngôn ngữ',
    'language.saved': 'Đã lưu. Giao diện giờ hiển thị bằng {language}.',
    'language.coverage':
      '{percent}% các câu giao diện này đã được dịch sang {language}. Phần chưa dịch sẽ hiển thị bằng tiếng Anh.',
    'language.coverageAll': 'Ngôn ngữ này đã được dịch đầy đủ.',
    'language.browser':
      'Lựa chọn được lưu trên trình duyệt này, không phải trên tài khoản của bạn, nên thiết bị khác sẽ hỏi ngôn ngữ của chính nó.',

    'catalogue.title': 'Tìm khoá học',
    'catalogue.lede':
      'Mọi khoá học đều được thẩm định trước khi công bố. Duyệt theo môn học, hoặc tìm khoá học, môn học, giảng viên.',
    'catalogue.doorChild': 'Học cho trẻ em',
    'catalogue.doorAdult': 'Học cho chính tôi',
    'catalogue.searchPlaceholder': 'Tìm khoá học, môn học, giảng viên…',
    'catalogue.searchPlaceholderLessons': 'Tìm khoá học, bài học, môn học, giảng viên…',
    'catalogue.searchLabel': 'Tìm khoá học',
    'catalogue.searchLabelLessons': 'Tìm khoá học và bài học',
    'catalogue.audience': 'Dành cho',
    'catalogue.search': 'Tìm',
    'catalogue.allSubjects': 'Tất cả môn học',
    'catalogue.anyLanguage': 'Mọi ngôn ngữ',
    'catalogue.languageRow': 'Ngôn ngữ giảng dạy của khoá học',
    'catalogue.pages': 'Trang',
    'catalogue.previous': 'Trước',
    'catalogue.next': 'Tiếp',
    'catalogue.pageOf': 'Trang {page} trên {pages}',
    'catalogue.emptyPage': 'Trang này không có gì. Có thể đã vượt quá cuối danh sách.',
    'catalogue.emptyQuery':
      'Không có kết quả nào khớp với “{query}”. Hãy thử một môn học, tên giảng viên, hoặc một từ trong bài học.',
    'catalogue.emptyQueryLessons':
      'Không có khoá học nào khớp với “{query}”, nhưng các bài học bên dưới thì có.',
    'catalogue.emptyShelf':
      'Chưa có khoá học nào. Khi giảng viên công bố một khoá, nó sẽ xuất hiện ở đây — không gì được hiển thị trước khi qua thẩm định.',
    'catalogue.countOne': '{count} khoá học',
    'catalogue.countOther': '{count} khoá học',
    'catalogue.showing': 'Hiển thị {from}–{to} trong {total}',

    'audience.child': 'Học viên nhỏ tuổi',
    'audience.adult': 'Người lớn',
    'audience.both': 'Mọi lứa tuổi',

    'difficulty.beginner': 'Nhập môn',
    'difficulty.intermediate': 'Trung cấp',
    'difficulty.advanced': 'Cao cấp',

    'price.free': 'Miễn phí',
    'price.included': 'Đã bao gồm trong quyền truy cập của bạn',
    'price.notOneOff': 'Không bán như một khoá học mua một lần',
    'price.ambiguous': 'Giá cần đúng đơn vị tiền tệ',
    'price.notAvailable': 'Chưa có ở quốc gia của bạn',

    'card.sectionsOne': '{count} phần',
    'card.sectionsOther': '{count} phần',
    'card.lessonsOne': '{count} bài học',
    'card.lessonsOther': '{count} bài học',
    'card.minutes': '{count} phút',
    'card.hours': '{count} giờ',
    'card.hoursMinutes': '{hours} giờ {minutes} phút',

    'auth.signInTitle': 'Đăng nhập',
    'auth.signUpTitle': 'Tạo tài khoản',
    'auth.signInLede': 'Chào mừng trở lại.',
    'auth.email': 'Email',
    'auth.password': 'Mật khẩu',
    'auth.mobile': 'Số điện thoại',
    'auth.countryCode': 'Mã quốc gia',
    'auth.otpCode': 'Mã trong tin nhắn',
    'auth.tabPassword': 'Email và mật khẩu',
    'auth.tabPhone': 'Mã qua điện thoại',
    'auth.google': 'Tiếp tục với Google',
    'auth.sendCode': 'Gửi mã',
    'auth.verifyCode': 'Xác nhận mã',
    'auth.resendCode': 'Gửi lại mã',
    'auth.changeNumber': 'Đổi số',
    'auth.forgot': 'Quên mật khẩu?',
    'auth.noAccount': 'Tạo tài khoản',
    'auth.haveAccount': 'Đã có tài khoản?',
    'auth.working': 'Đang xử lý…',
    'auth.invalidPhone': 'Số này có vẻ không phải số điện thoại hợp lệ. Hãy thêm mã quốc gia.',
    'auth.somethingWrong': 'Đã có lỗi xảy ra.',
    'auth.orGoogle': 'hoặc dùng một trong các cách sau',
    'auth.orCreate': 'hoặc tạo tài khoản bằng email hay số điện thoại',
    'auth.phoneAs': 'Sẽ được lưu là {phone}',
    'auth.international': 'Đã ở định dạng quốc tế.',
    'auth.passwordNote': 'Chúng tôi không bao giờ lưu mật khẩu. Supabase Auth giữ thông tin đăng nhập.',
    'auth.codeSent': 'Nếu có tài khoản với {phone}, mã đang được gửi đi.',
    'auth.codeResent': 'Đã gửi mã mới đến {phone}.',
    'auth.checkEmail': 'Đã tạo tài khoản. Kiểm tra email để xác nhận địa chỉ, rồi đăng nhập.',
    'auth.accountCreated': 'Đã tạo tài khoản cho {phone}.',

    'doors.askAdult': 'Bạn đang tìm cho chính mình?',
    'doors.askChild': 'Bạn đang chọn cho một em nhỏ?',
    'doors.adultsShelf': 'Giá sách người lớn',
    'doors.youngShelf': 'Giá sách học viên nhỏ tuổi',
    'doors.wholeCatalogue': 'Toàn bộ danh mục',

    'young.eyebrow': 'Học viên nhỏ tuổi',
    'young.title': 'Trẻ em trước.',
    'young.lede':
      'Những khoá học viết để dạy trẻ — đọc thuộc, bảng chữ cái Ả Rập, những câu chuyện các em nên nghe trước tiên. Mọi khoá đều đã qua thẩm định học thuật trước khi xuất hiện ở đây.',
    'young.notice':
      'Trẻ em không tự đăng ký. Cha mẹ hoặc người giám hộ giữ tài khoản, thêm trẻ làm học viên và quyết định mở những gì; giảng viên cũng có thể ghi danh trẻ dưới tài khoản của mình. Không gì trên trang này là tài khoản của trẻ, và không gì là dữ liệu của trẻ.',
    'young.everyAge': 'Mọi lứa tuổi',
    'young.emptyBand':
      'Chưa có nội dung cho độ tuổi {band}. Hãy thử độ tuổi khác, hoặc toàn bộ danh mục.',
    'young.empty':
      'Chưa có khoá học nào cho học viên nhỏ tuổi được công bố. Mọi thứ ở đây phải qua thẩm định trước.',

    'adults.eyebrow': 'Người lớn',
    'adults.title': 'Học cho đến nơi.',
    'adults.lede':
      'Những khoá học viết cho người lớn — ngữ pháp Ả Rập, fiqh, tafsir, tajweed ở mức sâu. Mọi khoá đều đã qua thẩm định học thuật trước khi xuất hiện ở đây, và mỗi khoá bạn mua là của riêng bạn: một lần mua, một học viên.',
    'adults.notice':
      'Đây là tài khoản của chính bạn, không phải của trẻ. Nếu trong gia đình bạn cũng có trẻ đang học, nút chuyển học viên sẽ di chuyển giữa hai người mà không trộn lẫn.',
    'adults.empty':
      'Chưa có khoá học nào cho người lớn được công bố. Mọi thứ ở đây phải qua thẩm định trước.',

    'auth.forgotTitle': 'Đặt lại mật khẩu',
    'auth.forgotLede':
      'Nhập địa chỉ email trên tài khoản của bạn. Nếu địa chỉ đã đăng ký, chúng tôi sẽ gửi một liên kết an toàn.',
    'auth.sendLink': 'Gửi liên kết đặt lại',
    'auth.sending': 'Đang gửi…',
    'auth.resetSent':
      'Nếu có tài khoản dùng địa chỉ email đó, liên kết đặt lại mật khẩu đang được gửi đi. Hãy kiểm tra hộp thư đến và thư mục spam.',
    'auth.resetFailed':
      'Hiện chưa gửi được liên kết đặt lại. Hãy kiểm tra địa chỉ và thử lại sau.',
    'auth.backToSignIn': 'Quay lại đăng nhập',
    'auth.accountSettings': 'Cài đặt tài khoản',
    'auth.chooseTitle': 'Chọn mật khẩu mới',
    'auth.chooseLede': 'Đặt mật khẩu mới cho tài khoản này. Liên kết đặt lại chỉ dùng được một lần.',
    'auth.newPassword': 'Mật khẩu mới',
    'auth.confirmPassword': 'Xác nhận mật khẩu mới',
    'auth.noMatch': 'Hai mật khẩu không khớp nhau.',
    'auth.enterPassword': 'Nhập mật khẩu mới của bạn.',
    'auth.updatePassword': 'Cập nhật mật khẩu',
    'auth.updating': 'Đang cập nhật…',
    'auth.offline': 'Không kết nối được tới máy chủ. Kiểm tra kết nối và thử lại.',

    'home.eyebrow': 'Giáo dục Hồi giáo, trên toàn thế giới',
    'home.title': 'Học tôn giáo của mình, theo nhịp phù hợp với bạn.',
    'home.lede':
      'Qur’an, tiếng Ả Rập, Fiqh, Hadith và hơn thế — được giảng dạy bởi những giảng viên đủ tiêu chuẩn, cho trẻ em và người lớn, dù bạn ở đâu.',
    'home.browse': 'Xem danh mục khoá học',
    'home.createAccount': 'Tạo tài khoản miễn phí',
    'home.continue': 'Tiếp tục học',
    'home.paths': 'Khám phá lộ trình học',
    'home.note':
      'Xem không mất phí. Bạn trả tiền khi ghi danh, cho một học viên có tên, và không bao giờ hỏi email của trẻ em.',
    'home.meansEyebrow': 'Điều đó nghĩa là gì',
    'home.meansTitle': 'Ba điều nền tảng này từ chối làm',
    'home.assure1Title': 'Được thẩm định trước khi lên danh mục',
    'home.assure1Body':
      'Khoá học đến từ giảng viên đủ tiêu chuẩn và được phê duyệt bởi người có thẩm quyền về môn đó. Tác giả không thể tự phê duyệt tác phẩm của mình, và mọi lần công bố đều được ghi lại.',
    'home.assure2Title': 'Đăng nhập của trẻ do người giám hộ tạo',
    'home.assure2Body':
      'Trẻ mặc định học dưới tài khoản của cha mẹ, và chỉ có đăng nhập riêng khi cha mẹ tạo cho — một tên đăng nhập do chính em chọn và mật khẩu do em đặt, không hỏi email của trẻ. Cha mẹ có thể gỡ bỏ bất cứ lúc nào mà không đụng đến bài học nào.',
    'home.assure3Title': 'Chứng chỉ vẫn còn tra cứu được',
    'home.assure3Body':
      'Mỗi chứng chỉ mang một mã số ai cũng tra được, và nó vẫn xác thực được kể cả khi khoá học sau đó bị rút xuống.',
    'home.studyTitle': 'Bạn có thể học gì',
    'home.studyCountOne': '{count} môn học, mỗi môn do một giảng viên đã được thẩm định về môn đó dạy.',
    'home.studyCountOther':
      '{count} môn học, mỗi môn do một giảng viên đã được thẩm định về môn đó dạy.',
    'home.studyEmpty':
      'Môn học xuất hiện ở đây khi khoá học được thêm vào. Danh sách đầy đủ luôn nằm ở trang danh mục.',
    'home.doorChildBody':
      'Viết cho học viên nhỏ tuổi, được giữ bởi tài khoản của cha mẹ hoặc người giám hộ, và chỉ có đăng nhập riêng khi người lớn đó tạo cho.',
    'home.doorAdultBody':
      'Học cho chính bạn, ở trình độ của bạn, với chứng chỉ có thể đưa ra cho bất kỳ ai hỏi.',
    'home.doorOpen': 'Xem có gì ở đó',
    'home.doorCatalogue': 'Xem chúng trong danh mục',
    'home.howTitle': 'Cách hoạt động',
    'home.step': 'Bước {number}',
    'home.step1Title': 'Chọn ai sẽ học',
    'home.step1Body':
      'Chính bạn, hoặc một em nhỏ mà bạn chịu trách nhiệm. Khoá học được mua cho một học viên có tên, nên một gia đình mua chung vẫn biết tiến độ của ai là của ai.',
    'home.step2Title': 'Học theo nhịp của bạn',
    'home.step2Body':
      'Bài học, câu hỏi luyện tập kiểm tra đáp án mà không cho điểm, và một nơi nhớ bạn đã dừng ở đâu trong mỗi bài bạn đã mở.',
    'home.step3Title': 'Giữ lại điều gì đó',
    'home.step3Body':
      'Tiến độ, một biên lai không bao giờ bị viết lại, và một chứng chỉ mà mã số vẫn tra được nhiều năm sau.',
    'home.aboutLink': 'Một khoá học đến đây bằng cách nào, và dữ liệu của trẻ thì sao',
    'home.teachEyebrow': 'Dành cho giảng viên',
    'home.teachTitle': 'Mang học trò của bạn theo.',
    'home.teachBody1':
      'Nếu bạn đã đang dạy, nền tảng này là phần bạn không nên phải tự làm: các phần và bài học, thẩm định bởi người hiểu môn học, giá cả đặt cùng nhân viên, và những gì bạn kiếm được hiển thị theo từng loại tiền trên một trang.',
    'home.teachBody2':
      'Giảng viên giữ một nửa mỗi lần bán. Việc giảng dạy ở đây theo lịch hẹn — chủ nền tảng thêm giảng viên từng người một — và chưa có nhà cung cấp nào chuyển tiền, nên trang thu nhập nói còn nợ bao nhiêu chứ không tuyên bố đã gửi.',
    'home.teachArea': 'Khu vực giảng dạy',
    'home.teachReview': 'Khoá học được thẩm định thế nào',
    'home.closingTitle': 'Bắt đầu từ danh mục.',
    'home.closingSignedOut':
      'Mỗi khoá học đã công bố đều được liệt kê cùng nội dung và người dạy. Hãy tạo tài khoản khi bạn tìm thấy một khoá muốn giữ lại.',
    'home.closingSignedIn':
      'Mỗi khoá học đã công bố đều được liệt kê cùng nội dung và người dạy. Việc ghi danh, tiến độ và chứng chỉ của bạn ở cùng một chỗ.',

    'language.reviewed': 'Một người bản ngữ đã đọc bản dịch này.',
    'language.partial':
      'Người bản ngữ đã đọc {read} trong {total} phần của bản dịch này.',
    'language.unreviewed':
      'Chưa có người bản ngữ nào đọc bản dịch này. Nó được viết bởi những người dựng nên nền tảng — nếu một từ có vẻ sai với bạn, đó là lỗi chúng tôi nợ bạn.',
    'language.notTranslated':
      'Chỉ phần giao diện được dịch. Tên khoá học, bài học, trang giảng viên và các chính sách đã công bố hiển thị bằng ngôn ngữ mà chúng được viết.',
  },
};
