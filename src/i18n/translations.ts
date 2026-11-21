export type Language = 'vi' | 'en';

export interface Translations {
  // Navigation & Common
  appName: string;
  tagline: string;
  dashboard: string;
  subjects: string;
  recorder: string;
  documents: string;
  flashcards: string;
  quizzes: string;
  deadlines: string;
  studyGroups: string;
  aiTutor: string;
  premium: string;
  notifications: string;
  settings: string;
  profile: string;
  logout: string;
  login: string;
  register: string;
  save: string;
  cancel: string;
  delete: string;
  edit: string;
  close: string;
  back: string;
  confirm: string;
  loading: string;
  search: string;
  download: string;
  retry: string;
  upgrade: string;
  viewAll: string;
  freePlan: string;
  premiumPlan: string;
  active: string;
  expired: string;
  add: string;
  create: string;
  update: string;
  status: string;
  actions: string;
  copy: string;
  copied: string;

  // Language selector & Shortcuts
  languageVi: string;
  languageEn: string;
  selectLanguage: string;
  languageShortcutTooltip: string;
  languageSwitchedVi: string;
  languageSwitchedEn: string;
  currentLanguageName: string;

  // Navbar & System
  demoDataBtn: string;
  demoDataRestored: string;
  demoDataTooltip: string;
  openMenuTooltip: string;
  premiumVipBadge: string;
  upcomingDeadlinesTooltip: string;
  userMenuProfile: string;
  userMenuSettings: string;
  userMenuBilling: string;
  userMenuVip: string;
  userMenuLogout: string;

  // Sidebar & Usage
  menuDashboard: string;
  menuSubjects: string;
  menuRecorder: string;
  menuDebugAudio: string;
  menuDocuments: string;
  menuFlashcards: string;
  menuQuizzes: string;
  menuDeadlines: string;
  menuGroups: string;
  menuAiChat: string;
  menuPremium: string;
  menuSettings: string;
  audioMinutesProgress: string;
  aiCallsProgress: string;
  collapseSidebar: string;
  expandSidebar: string;
  unlimitedCourses: string;
  courseLimitBadge: string;

  // Dashboard
  welcomeGreeting: string;
  dashboardSubtitle: string;
  statsTotalCourses: string;
  statsAudioMinutes: string;
  statsCardsMastered: string;
  statsPendingDeadlines: string;
  quickActionRecord: string;
  quickActionUpload: string;
  quickActionFlashcards: string;
  quickActionAiChat: string;
  recentLecturesTitle: string;
  noLecturesYet: string;
  noLecturesDesc: string;
  startFirstRecordingBtn: string;
  upcomingDeadlinesSection: string;
  noUpcomingDeadlines: string;
  allDeadlinesDone: string;
  aiRecommendationsSection: string;
  aiTipTitle: string;
  aiTipDesc: string;

  // Courses & Lessons
  addCourseBtn: string;
  courseNameLabel: string;
  courseCodeLabel: string;
  lecturerLabel: string;
  courseColorLabel: string;
  courseDescriptionLabel: string;
  scheduleLabel: string;
  searchCoursesPlaceholder: string;
  noCoursesFound: string;
  noCoursesFoundDesc: string;
  courseCreatedSuccess: string;
  courseUpdatedSuccess: string;
  courseDeletedSuccess: string;
  deleteCourseConfirmTitle: string;
  deleteCourseConfirmDesc: string;
  tabLessons: string;
  tabFlashcards: string;
  tabQuizzes: string;
  tabDocuments: string;
  tabMindMap: string;
  tabDeadlines: string;
  lessonNameLabel: string;
  addLessonBtn: string;
  noLessonsFound: string;
  noLessonsFoundDesc: string;

  // Recorder & Audio
  startRecordingBtn: string;
  stopRecordingBtn: string;
  pauseRecordingBtn: string;
  resumeRecordingBtn: string;
  recordingLiveStatus: string;
  uploadAudioFileBtn: string;
  audioFormatHint: string;
  processingAudioWithAi: string;
  transcriptTab: string;
  summaryTab: string;
  keyPointsHeading: string;
  actionItemsHeading: string;
  exportSummaryBtn: string;
  deleteLessonBtn: string;
  deleteLessonConfirm: string;

  // Flashcards
  createFlashcardBtn: string;
  cardFrontLabel: string;
  cardBackLabel: string;
  cardFrontPlaceholder: string;
  cardBackPlaceholder: string;
  flipCardHint: string;
  knownBtn: string;
  dontKnowBtn: string;
  masteredCount: string;
  learningCount: string;
  resetDeckBtn: string;
  shuffleCardsBtn: string;
  noCardsInDeck: string;
  noCardsInDeckDesc: string;

  // AI Quizzes
  generateAiQuizBtn: string;
  questionCountLabel: string;
  difficultyLabel: string;
  difficultyEasy: string;
  difficultyMedium: string;
  difficultyHard: string;
  startQuizBtn: string;
  questionNumber: string;
  ofWord: string;
  submitAnswerBtn: string;
  explanationHeading: string;
  quizCompletedTitle: string;
  yourScoreIs: string;
  retakeQuizBtn: string;
  goodJobMessage: string;
  tryAgainMessage: string;

  // Deadlines
  addDeadlineBtn: string;
  deadlineTitleLabel: string;
  deadlineTitlePlaceholder: string;
  dueDateLabel: string;
  priorityLabel: string;
  priorityHigh: string;
  priorityMedium: string;
  priorityLow: string;
  filterAll: string;
  filterPending: string;
  filterCompleted: string;
  filterOverdue: string;
  markCompletedBtn: string;
  markPendingBtn: string;
  noDeadlinesFound: string;
  noDeadlinesFoundDesc: string;
  deadlineAddedSuccess: string;
  deadlineUpdatedSuccess: string;
  deadlineDeletedSuccess: string;

  // Study Groups
  createGroupBtn: string;
  joinGroupBtn: string;
  groupNameLabel: string;
  groupCodeLabel: string;
  enterGroupCodePlaceholder: string;
  groupMembersHeading: string;
  sharedResourcesHeading: string;
  groupChatHeading: string;
  typeMessagePlaceholder: string;
  sendMessageBtn: string;
  noGroupsFound: string;
  noGroupsFoundDesc: string;

  // AI Tutor
  aiTutorHeading: string;
  aiTutorSubheading: string;
  askAiPlaceholder: string;
  sendAiMessageBtn: string;
  suggestedQuestionsHeading: string;
  clearChatBtn: string;
  aiThinkingMessage: string;

  // Auth & Email Verification
  authModalTitleLogin: string;
  authModalTitleRegister: string;
  authModalTitleForgot: string;
  emailLabel: string;
  emailPlaceholder: string;
  passwordLabel: string;
  passwordPlaceholder: string;
  confirmPasswordLabel: string;
  fullNameLabel: string;
  schoolLabel: string;
  majorLabel: string;
  academicYearLabel: string;
  agreeTermsText: string;
  loginButton: string;
  registerButton: string;
  forgotPasswordLink: string;
  noAccountText: string;
  hasAccountText: string;
  emailNotVerifiedBanner: string;
  resendVerificationBtn: string;
  accountCreatedEmailFailedMsg: string;
  verificationSentMsg: string;
  verificationSuccessMsg: string;
  verificationErrorMsg: string;
  verifyEmailTitle: string;
  verifyEmailSubtitle: string;
  resetPasswordTitle: string;
  resetPasswordSubtitle: string;
  resetPasswordSuccess: string;

  // Premium & Checkout
  premiumTitle: string;
  premiumSubtitle: string;
  monthlyPlan: string;
  yearlyPlan: string;
  monthlyPrice: string;
  yearlyPrice: string;
  save30Percent: string;
  buyNow: string;
  popularChoice: string;
  checkoutTitle: string;
  orderCode: string;
  amountToPay: string;
  paymentMethod: string;
  momoWallet: string;
  zaloPayWallet: string;
  stripeCard: string;
  bankTransfer: string;
  scanQrPrompt: string;
  openWalletPrompt: string;
  paymentProcessing: string;
  paymentSuccess: string;
  paymentFailed: string;
  paymentExpired: string;
  testPaymentSimulation: string;
  confirmTestPayment: string;
  paymentHistory: string;
  backToDashboard: string;
  currentPlanLabel: string;
  planFeatureUnlimitedSubjects: string;
  planFeature3000Audio: string;
  planFeatureMindMaps: string;
  planFeatureEliteAi: string;

  // Mind Map
  mindMapTitle: string;
  mindMapSubtitle: string;
  generateMindMap: string;
  regenerateMindMap: string;
  generatingMindMap: string;
  deleteMindMap: string;
  downloadMindMap: string;
  mindMapEmptyText: string;
  mindMapSuccess: string;
  mindMapError: string;

  // Profile & Avatar
  profileTitle: string;
  avatarTitle: string;
  changeAvatar: string;
  removeAvatar: string;
  uploadingAvatar: string;
  avatarFormatHint: string;
  saveProfileSuccess: string;
  languageSettingTitle: string;
  languageSettingDesc: string;

  // Notifications
  notificationsTitle: string;
  markAllRead: string;
  noNotifications: string;
  unreadFilter: string;
  allFilter: string;
  deadlineFilter: string;
  paymentFilter: string;
  accountFilter: string;
  marketingFilter: string;

  // Settings
  notificationSettingsTitle: string;
  accountEmailSetting: string;
  deadlineEmailSetting: string;
  premiumEmailSetting: string;
  marketingEmailSetting: string;
  transactionEmailSetting: string;
  settingsSaved: string;
  aiDiagnosticsTitle: string;
  testAiConnectionBtn: string;
  aiConnectionSuccess: string;
  aiConnectionFailed: string;
  exportDataBtn: string;
  resetDemoDataBtn: string;
  resetDemoDataConfirm: string;

  // Dialogs & Modals
  confirmDeleteTitle: string;
  confirmDeleteWarning: string;
  themeToggleLight: string;
  themeToggleDark: string;
  themeToggleSystem: string;
}

export const translations: Record<Language, Translations> = {
  vi: {
    appName: 'Mầm Study',
    tagline: 'Trợ lý thông minh cho sinh viên hiện đại',
    dashboard: 'Tổng quan',
    subjects: 'Môn học',
    recorder: 'Ghi âm bài giảng',
    documents: 'Tài liệu học tập',
    flashcards: 'Flashcards',
    quizzes: 'Trắc nghiệm AI',
    deadlines: 'Quản lý Deadline',
    studyGroups: 'Nhóm học tập',
    aiTutor: 'Trợ lý AI',
    premium: 'Gói Premium',
    notifications: 'Thông báo',
    settings: 'Cài đặt',
    profile: 'Hồ sơ cá nhân',
    logout: 'Đăng xuất',
    login: 'Đăng nhập',
    register: 'Đăng ký tài khoản',
    save: 'Lưu thay đổi',
    cancel: 'Hủy bỏ',
    delete: 'Xóa',
    edit: 'Chỉnh sửa',
    close: 'Đóng',
    back: 'Quay lại',
    confirm: 'Xác nhận',
    loading: 'Đang tải...',
    search: 'Tìm kiếm...',
    download: 'Tải xuống',
    retry: 'Thử lại',
    upgrade: 'Nâng cấp Premium',
    viewAll: 'Xem tất cả',
    freePlan: 'Gói Miễn phí',
    premiumPlan: 'Gói Premium VIP',
    active: 'Đang hoạt động',
    expired: 'Đã hết hạn',
    add: 'Thêm mới',
    create: 'Tạo mới',
    update: 'Cập nhật',
    status: 'Trạng thái',
    actions: 'Hành động',
    copy: 'Sao chép',
    copied: 'Đã sao chép!',

    // Language selector & Shortcuts
    languageVi: 'Tiếng Việt',
    languageEn: 'English',
    selectLanguage: 'Chọn ngôn ngữ',
    languageShortcutTooltip: 'Đổi ngôn ngữ (Phím tắt: Ctrl + Shift + L / ⌘ + Shift + L)',
    languageSwitchedVi: 'Đã chuyển ngôn ngữ sang Tiếng Việt (Ctrl + Shift + L)',
    languageSwitchedEn: 'Switched language to English (Ctrl + Shift + L)',
    currentLanguageName: 'Tiếng Việt',

    // Navbar & System
    demoDataBtn: 'Dữ liệu mẫu',
    demoDataRestored: 'Đã khôi phục dữ liệu bài giảng & môn học mẫu ban đầu!',
    demoDataTooltip: 'Khôi phục dữ liệu mẫu ban đầu',
    openMenuTooltip: 'Mở menu',
    premiumVipBadge: 'Premium VIP',
    upcomingDeadlinesTooltip: 'Thông báo deadline',
    userMenuProfile: 'Hồ sơ & Đổi ảnh đại diện',
    userMenuSettings: 'Cài đặt hệ thống & AI',
    userMenuBilling: 'Lịch sử giao dịch & Hóa đơn',
    userMenuVip: 'Quản lý gói cước VIP',
    userMenuLogout: 'Đăng xuất tài khoản',

    // Sidebar & Usage
    menuDashboard: 'Tổng quan',
    menuSubjects: 'Môn học',
    menuRecorder: 'Ghi âm bài giảng',
    menuDebugAudio: 'Kiểm tra Audio (/debug)',
    menuDocuments: 'Tài liệu học tập',
    menuFlashcards: 'Flashcard',
    menuQuizzes: 'Trắc nghiệm AI',
    menuDeadlines: 'Quản lý Deadline',
    menuGroups: 'Nhóm học tập',
    menuAiChat: 'Trợ giảng AI',
    menuPremium: 'Gói Premium VIP',
    menuSettings: 'Cài đặt hệ thống',
    audioMinutesProgress: 'Ghi âm bài giảng',
    aiCallsProgress: 'Lượt gọi AI',
    collapseSidebar: 'Thu gọn sidebar',
    expandSidebar: 'Mở rộng sidebar',
    unlimitedCourses: 'Vô hạn môn',
    courseLimitBadge: 'môn',

    // Dashboard
    welcomeGreeting: 'Chào mừng trở lại',
    dashboardSubtitle: 'Theo dõi tiến độ học tập, ghi âm bài giảng và quản lý hạn chót thông minh với AI.',
    statsTotalCourses: 'Môn học đang theo',
    statsAudioMinutes: 'Phút ghi âm bài giảng',
    statsCardsMastered: 'Thẻ flashcard thành thạo',
    statsPendingDeadlines: 'Deadline sắp tới',
    quickActionRecord: 'Ghi âm bài mới',
    quickActionUpload: 'Tải tài liệu PDF',
    quickActionFlashcards: 'Ôn Flashcard',
    quickActionAiChat: 'Hỏi Trợ giảng AI',
    recentLecturesTitle: 'Bài giảng gần đây',
    noLecturesYet: 'Chưa có bài giảng nào được ghi âm',
    noLecturesDesc: 'Bấm nút "Ghi âm bài mới" để bắt đầu ghi âm trực tiếp hoặc tải tệp âm thanh.',
    startFirstRecordingBtn: 'Ghi âm bài giảng đầu tiên',
    upcomingDeadlinesSection: 'Hạn chót & Bài tập sắp tới',
    noUpcomingDeadlines: 'Không có deadline nào sắp tới',
    allDeadlinesDone: 'Tuyệt vời! Bạn đã hoàn thành toàn bộ bài tập và nhiệm vụ.',
    aiRecommendationsSection: 'Lời khuyên học tập từ AI',
    aiTipTitle: 'Mẹo tối ưu hiệu quả ôn tập hôm nay',
    aiTipDesc: 'Ôn tập lặp lại ngắt quãng (Spaced Repetition) với các thẻ flashcard chưa thuộc để nhớ lâu hơn 300%.',

    // Courses & Lessons
    addCourseBtn: 'Thêm môn học mới',
    courseNameLabel: 'Tên môn học',
    courseCodeLabel: 'Mã môn học',
    lecturerLabel: 'Giảng viên phụ trách',
    courseColorLabel: 'Màu sắc đại diện',
    courseDescriptionLabel: 'Mô tả tóm tắt môn học',
    scheduleLabel: 'Thời khóa biểu học',
    searchCoursesPlaceholder: 'Tìm kiếm môn học theo tên, mã môn...',
    noCoursesFound: 'Không tìm thấy môn học nào',
    noCoursesFoundDesc: 'Bắt đầu bằng việc thêm môn học đầu tiên để lưu bài giảng và tài liệu.',
    courseCreatedSuccess: 'Đã tạo môn học mới thành công!',
    courseUpdatedSuccess: 'Đã cập nhật thông tin môn học!',
    courseDeletedSuccess: 'Đã xóa môn học và dữ liệu liên quan thành công!',
    deleteCourseConfirmTitle: 'Xác nhận xóa môn học',
    deleteCourseConfirmDesc: 'Hành động này sẽ xóa vĩnh viễn môn học cùng tất cả bài giảng, flashcards, câu hỏi trắc nghiệm và tài liệu đính kèm. Bạn có chắc chắn muốn xóa?',
    tabLessons: 'Bài học & Ghi âm',
    tabFlashcards: 'Flashcards',
    tabQuizzes: 'Trắc nghiệm AI',
    tabDocuments: 'Tài liệu',
    tabMindMap: 'Sơ đồ tư duy',
    tabDeadlines: 'Deadlines',
    lessonNameLabel: 'Tên bài học',
    addLessonBtn: 'Thêm bài học mới',
    noLessonsFound: 'Môn học này chưa có bài giảng nào',
    noLessonsFoundDesc: 'Hãy ghi âm bài giảng trên lớp hoặc tải tài liệu lên để AI tóm tắt.',

    // Recorder & Audio
    startRecordingBtn: 'Bắt đầu ghi âm',
    stopRecordingBtn: 'Dừng ghi âm',
    pauseRecordingBtn: 'Tạm dừng',
    resumeRecordingBtn: 'Tiếp tục ghi',
    recordingLiveStatus: 'Đang ghi âm bài giảng trực tiếp...',
    uploadAudioFileBtn: 'Tải tệp âm thanh (MP3, WAV, M4A)',
    audioFormatHint: 'Hỗ trợ tệp MP3, WAV, WebM, M4A dung lượng đến 100MB.',
    processingAudioWithAi: 'AI đang lắng nghe và phiên âm nội dung bài giảng...',
    transcriptTab: 'Bản phiên âm (Transcript)',
    summaryTab: 'Tóm tắt thông minh AI',
    keyPointsHeading: 'Ý chính & Trọng tâm kiến thức',
    actionItemsHeading: 'Bài tập & Việc cần làm',
    exportSummaryBtn: 'Tải tóm tắt (TXT)',
    deleteLessonBtn: 'Xóa bài học này',
    deleteLessonConfirm: 'Bạn có chắc chắn muốn xóa bài học này không?',

    // Flashcards
    createFlashcardBtn: 'Tạo thẻ Flashcard mới',
    cardFrontLabel: 'Mặt trước (Câu hỏi / Thuật ngữ)',
    cardBackLabel: 'Mặt sau (Câu trả lời / Định nghĩa)',
    cardFrontPlaceholder: 'Ví dụ: Nguyên lý Le Chatelier là gì?',
    cardBackPlaceholder: 'Ví dụ: Khi một hệ thống cân bằng bị xáo trộn...',
    flipCardHint: 'Bấm vào thẻ hoặc nhấn phím Cách để lật mặt thẻ',
    knownBtn: 'Đã thuộc (Biết)',
    dontKnowBtn: 'Chưa thuộc (Học lại)',
    masteredCount: 'Đã thành thạo',
    learningCount: 'Cần ôn tập',
    resetDeckBtn: 'Học lại từ đầu',
    shuffleCardsBtn: 'Xáo trộn thẻ',
    noCardsInDeck: 'Chưa có thẻ flashcard nào',
    noCardsInDeckDesc: 'Tự tạo thẻ mới hoặc để AI tự động trích xuất thẻ từ bài giảng.',

    // AI Quizzes
    generateAiQuizBtn: 'Tạo bộ trắc nghiệm mới',
    questionCountLabel: 'Số lượng câu hỏi',
    difficultyLabel: 'Độ khó',
    difficultyEasy: 'Dễ (Nhận biết)',
    difficultyMedium: 'Trung bình (Thông hiểu)',
    difficultyHard: 'Nâng cao (Vận dụng)',
    startQuizBtn: 'Bắt đầu làm bài',
    questionNumber: 'Câu',
    ofWord: 'trên',
    submitAnswerBtn: 'Xác nhận câu trả lời',
    explanationHeading: 'Giải thích chi tiết từ AI',
    quizCompletedTitle: 'Hoàn thành bài kiểm tra trắc nghiệm!',
    yourScoreIs: 'Điểm số của bạn',
    retakeQuizBtn: 'Làm lại bài kiểm tra',
    goodJobMessage: 'Làm tốt lắm! Bạn đã nắm rất vững kiến thức này.',
    tryAgainMessage: 'Hãy xem lại các câu trả lời sai và luyện tập thêm nhé.',

    // Deadlines
    addDeadlineBtn: 'Thêm Deadline mới',
    deadlineTitleLabel: 'Tên bài tập / Dự án',
    deadlineTitlePlaceholder: 'Ví dụ: Nộp đồ án môn Cấu trúc dữ liệu...',
    dueDateLabel: 'Ngày và giờ hạn chót',
    priorityLabel: 'Mức độ ưu tiên',
    priorityHigh: 'Cao (Gấp)',
    priorityMedium: 'Trung bình',
    priorityLow: 'Thấp',
    filterAll: 'Tất cả',
    filterPending: 'Đang thực hiện',
    filterCompleted: 'Đã hoàn thành',
    filterOverdue: 'Quá hạn',
    markCompletedBtn: 'Đánh dấu xong',
    markPendingBtn: 'Đánh dấu chưa xong',
    noDeadlinesFound: 'Không có hạn chót nào trong danh sách',
    noDeadlinesFoundDesc: 'Thêm các bài tập, đồ án hoặc kỳ thi để không bỏ lỡ hạn nộp bài.',
    deadlineAddedSuccess: 'Đã thêm deadline mới thành công!',
    deadlineUpdatedSuccess: 'Đã cập nhật deadline!',
    deadlineDeletedSuccess: 'Đã xóa deadline thành công!',

    // Study Groups
    createGroupBtn: 'Tạo nhóm học tập',
    joinGroupBtn: 'Tham gia bằng mã',
    groupNameLabel: 'Tên nhóm học tập',
    groupCodeLabel: 'Mã tham gia nhóm',
    enterGroupCodePlaceholder: 'Nhập mã 6 ký tự (VD: GRP123)',
    groupMembersHeading: 'Thành viên trong nhóm',
    sharedResourcesHeading: 'Tài liệu chia sẻ chung',
    groupChatHeading: 'Trao đổi thảo luận nhóm',
    typeMessagePlaceholder: 'Nhập tin nhắn thảo luận...',
    sendMessageBtn: 'Gửi',
    noGroupsFound: 'Bạn chưa tham gia nhóm học tập nào',
    noGroupsFoundDesc: 'Tạo nhóm mới hoặc nhập mã để học chung cùng bạn bè.',

    // AI Tutor
    aiTutorHeading: 'Trợ giảng & Gia sư AI cá nhân',
    aiTutorSubheading: 'Hỏi đáp mọi thắc mắc về bài học, giải bài tập, tóm tắt công thức và luyện thi 24/7.',
    askAiPlaceholder: 'Đặt câu hỏi cho Trợ giảng AI (Ví dụ: Giải thích thuật toán Dijkstra bằng ví dụ thực tế)...',
    sendAiMessageBtn: 'Gửi câu hỏi',
    suggestedQuestionsHeading: 'Câu hỏi mẫu thường gặp',
    clearChatBtn: 'Xóa lịch sử trò chuyện',
    aiThinkingMessage: 'Trợ giảng AI đang suy nghĩ câu trả lời...',

    // Auth & Email Verification
    authModalTitleLogin: 'Đăng nhập Mầm Study',
    authModalTitleRegister: 'Tạo tài khoản sinh viên mới',
    authModalTitleForgot: 'Khôi phục mật khẩu tài khoản',
    emailLabel: 'Địa chỉ Email sinh viên',
    emailPlaceholder: 'sv@university.edu.vn',
    passwordLabel: 'Mật khẩu',
    passwordPlaceholder: 'Tối thiểu 8 ký tự (chữ và số)',
    confirmPasswordLabel: 'Xác nhận lại mật khẩu',
    fullNameLabel: 'Họ và tên sinh viên',
    schoolLabel: 'Trường Đại học / Cao đẳng',
    majorLabel: 'Chuyên ngành học',
    academicYearLabel: 'Năm học hiện tại',
    agreeTermsText: 'Tôi đồng ý với Điều khoản sử dụng và Chính sách bảo mật Mầm Study.',
    loginButton: 'Đăng nhập ngay',
    registerButton: 'Đăng ký tài khoản',
    forgotPasswordLink: 'Quên mật khẩu?',
    noAccountText: 'Chưa có tài khoản? Đăng ký ngay',
    hasAccountText: 'Đã có tài khoản? Đăng nhập',
    emailNotVerifiedBanner: 'Tài khoản chưa được xác minh email. Vui lòng kiểm tra hộp thư để kích hoạt đầy đủ tính năng.',
    resendVerificationBtn: 'Gửi lại email xác nhận',
    accountCreatedEmailFailedMsg: 'Tài khoản đã được tạo nhưng email xác nhận chưa gửi được. Vui lòng cấu hình dịch vụ email hoặc thử gửi lại sau.',
    verificationSentMsg: 'Đã gửi lại email xác nhận. Vui lòng kiểm tra hộp thư đến và thư rác.',
    verificationSuccessMsg: 'Xác minh email thành công! Tài khoản của bạn đã được kích hoạt.',
    verificationErrorMsg: 'Liên kết xác minh không hợp lệ hoặc đã hết hạn.',
    verifyEmailTitle: 'Xác minh địa chỉ Email',
    verifyEmailSubtitle: 'Nhập mã gồm 6 số đã được gửi tới email của bạn để kích hoạt tài khoản.',
    resetPasswordTitle: 'Đặt lại mật khẩu mới',
    resetPasswordSubtitle: 'Tạo mật khẩu an toàn mới cho tài khoản của bạn.',
    resetPasswordSuccess: 'Đã đổi mật khẩu thành công! Vui lòng đăng nhập lại.',

    // Premium & Checkout
    premiumTitle: 'Mở khóa toàn diện tiềm năng học tập với Premium VIP',
    premiumSubtitle: 'Không giới hạn môn học, 3000 phút phiên âm âm thanh, sơ đồ tư duy không giới hạn và gia sư AI cao cấp.',
    monthlyPlan: 'Gói 1 Tháng',
    yearlyPlan: 'Gói 1 Năm',
    monthlyPrice: '79.000đ / tháng',
    yearlyPrice: '699.000đ / năm',
    save30Percent: 'Tiết kiệm 30%',
    buyNow: 'Mua ngay',
    popularChoice: 'Lựa chọn phổ biến nhất',
    checkoutTitle: 'Thanh toán đơn hàng Premium',
    orderCode: 'Mã đơn hàng',
    amountToPay: 'Số tiền thanh toán',
    paymentMethod: 'Phương thức thanh toán',
    momoWallet: 'Ví điện tử MoMo',
    zaloPayWallet: 'Ví điện tử ZaloPay',
    stripeCard: 'Thẻ thanh toán Quốc tế (Stripe)',
    bankTransfer: 'Chuyển khoản Ngân hàng (TPBank)',
    scanQrPrompt: 'Quét mã QR bằng ứng dụng để thanh toán',
    openWalletPrompt: 'Mở ứng dụng ví để thanh toán',
    paymentProcessing: 'Đang chờ xác nhận thanh toán...',
    paymentSuccess: 'Thanh toán thành công! Gói Premium đã được kích hoạt.',
    paymentFailed: 'Thanh toán chưa thành công. Vui lòng thử lại.',
    paymentExpired: 'Đơn hàng đã hết hạn thanh toán (quá 15 phút). Vui lòng tạo đơn hàng mới.',
    testPaymentSimulation: 'Chế độ thử nghiệm Sandbox',
    confirmTestPayment: 'Xác nhận thanh toán Test Mode (Sandbox)',
    paymentHistory: 'Lịch sử thanh toán',
    backToDashboard: 'Về trang chủ',
    currentPlanLabel: 'Gói dịch vụ hiện tại',
    planFeatureUnlimitedSubjects: 'Không giới hạn số lượng môn học',
    planFeature3000Audio: '3000 phút ghi âm bài giảng mỗi tháng',
    planFeatureMindMaps: 'Tạo sơ đồ tư duy Mind Map không giới hạn',
    planFeatureEliteAi: 'Gia sư AI cao cấp phản hồi tức thì',

    // Mind Map
    mindMapTitle: 'Sơ đồ tư duy (Mind Map) thông minh',
    mindMapSubtitle: 'Tự động trực quan hóa cấu trúc bài học thành các nhánh logic và phân cấp rõ ràng.',
    generateMindMap: 'Tạo sơ đồ tư duy với AI',
    regenerateMindMap: 'Tạo lại sơ đồ tư duy',
    generatingMindMap: 'AI đang phân tích và dựng sơ đồ tư duy...',
    deleteMindMap: 'Xóa sơ đồ tư duy',
    downloadMindMap: 'Tải xuống sơ đồ (JSON)',
    mindMapEmptyText: 'Chưa có sơ đồ tư duy. Bấm "Tạo sơ đồ tư duy với AI" để bắt đầu.',
    mindMapSuccess: 'Đã tạo sơ đồ tư duy thành công!',
    mindMapError: 'Không thể tạo sơ đồ tư duy. Vui lòng kiểm tra lại nội dung bài học.',

    // Profile & Avatar
    profileTitle: 'Hồ sơ người dùng & Cài đặt cá nhân',
    avatarTitle: 'Ảnh đại diện',
    changeAvatar: 'Đổi ảnh đại diện',
    removeAvatar: 'Xóa ảnh đại diện',
    uploadingAvatar: 'Đang tải ảnh đại diện lên máy chủ...',
    avatarFormatHint: 'Định dạng JPG, PNG, WEBP. Dung lượng tối đa 5MB.',
    saveProfileSuccess: 'Đã cập nhật thông tin hồ sơ thành công!',
    languageSettingTitle: 'Ngôn ngữ hiển thị hệ thống',
    languageSettingDesc: 'Chọn Tiếng Việt hoặc English. Bạn cũng có thể bấm Ctrl + Shift + L (hoặc ⌘ + Shift + L) để đổi nhanh bất kỳ lúc nào.',

    // Notifications
    notificationsTitle: 'Trung tâm thông báo',
    markAllRead: 'Đánh dấu tất cả đã đọc',
    noNotifications: 'Hiện không có thông báo nào.',
    unreadFilter: 'Chưa đọc',
    allFilter: 'Tất cả',
    deadlineFilter: 'Deadline',
    paymentFilter: 'Giao dịch',
    accountFilter: 'Tài khoản',
    marketingFilter: 'Khuyến mãi',

    // Settings
    notificationSettingsTitle: 'Cài đặt nhận thông báo qua Email',
    accountEmailSetting: 'Email bảo mật và tài khoản (Bắt buộc)',
    deadlineEmailSetting: 'Email nhắc nhở Deadline sắp đến và quá hạn (Trước 24h)',
    premiumEmailSetting: 'Email thông báo gói Premium sắp hết hạn (Trước 7 ngày, 3 ngày, 1 ngày)',
    marketingEmailSetting: 'Email chương trình khuyến mãi và ưu đãi học tập (Tùy chọn)',
    transactionEmailSetting: 'Email hóa đơn và xác nhận thanh toán',
    settingsSaved: 'Đã lưu cài đặt thông báo thành công!',
    aiDiagnosticsTitle: 'Kiểm tra chẩn đoán kết nối Gemini AI',
    testAiConnectionBtn: 'Kiểm tra kết nối Gemini API',
    aiConnectionSuccess: 'Kết nối Gemini API thành công!',
    aiConnectionFailed: 'Không thể kết nối đến Gemini API. Vui lòng kiểm tra khóa API.',
    exportDataBtn: 'Xuất dữ liệu dự phòng (JSON)',
    resetDemoDataBtn: 'Khôi phục dữ liệu mẫu',
    resetDemoDataConfirm: 'Bạn có chắc chắn muốn khôi phục về dữ liệu bài giảng và môn học mẫu ban đầu?',

    // Dialogs & Modals
    confirmDeleteTitle: 'Xác nhận xóa',
    confirmDeleteWarning: 'Hành động này không thể hoàn tác.',
    themeToggleLight: 'Giao diện sáng',
    themeToggleDark: 'Giao diện tối',
    themeToggleSystem: 'Theo hệ thống',
  },
  en: {
    appName: 'Mầm Study',
    tagline: 'Smart Assistant for Modern Students',
    dashboard: 'Dashboard',
    subjects: 'Courses',
    recorder: 'Lecture Recorder',
    documents: 'Study Documents',
    flashcards: 'Flashcards',
    quizzes: 'AI Quizzes',
    deadlines: 'Deadlines',
    studyGroups: 'Study Groups',
    aiTutor: 'AI Tutor',
    premium: 'Premium Plan',
    notifications: 'Notifications',
    settings: 'Settings',
    profile: 'My Profile',
    logout: 'Log Out',
    login: 'Log In',
    register: 'Sign Up',
    save: 'Save Changes',
    cancel: 'Cancel',
    delete: 'Delete',
    edit: 'Edit',
    close: 'Close',
    back: 'Back',
    confirm: 'Confirm',
    loading: 'Loading...',
    search: 'Search...',
    download: 'Download',
    retry: 'Retry',
    upgrade: 'Upgrade to Premium',
    viewAll: 'View All',
    freePlan: 'Free Plan',
    premiumPlan: 'Premium VIP Plan',
    active: 'Active',
    expired: 'Expired',
    add: 'Add New',
    create: 'Create',
    update: 'Update',
    status: 'Status',
    actions: 'Actions',
    copy: 'Copy',
    copied: 'Copied!',

    // Language selector & Shortcuts
    languageVi: 'Tiếng Việt',
    languageEn: 'English',
    selectLanguage: 'Select Language',
    languageShortcutTooltip: 'Toggle Language (Shortcut: Ctrl + Shift + L / ⌘ + Shift + L)',
    languageSwitchedVi: 'Switched language to Vietnamese (Ctrl + Shift + L)',
    languageSwitchedEn: 'Switched language to English (Ctrl + Shift + L)',
    currentLanguageName: 'English',

    // Navbar & System
    demoDataBtn: 'Sample Data',
    demoDataRestored: 'Initial sample course & lecture data restored successfully!',
    demoDataTooltip: 'Restore initial demo course and lecture data',
    openMenuTooltip: 'Open navigation menu',
    premiumVipBadge: 'Premium VIP',
    upcomingDeadlinesTooltip: 'Deadline notifications',
    userMenuProfile: 'Profile & Avatar Settings',
    userMenuSettings: 'System Settings & AI Diagnostics',
    userMenuBilling: 'Transactions & Invoices',
    userMenuVip: 'Manage VIP Subscription',
    userMenuLogout: 'Log Out',

    // Sidebar & Usage
    menuDashboard: 'Dashboard',
    menuSubjects: 'Courses',
    menuRecorder: 'Lecture Recorder',
    menuDebugAudio: 'Audio Debugger (/debug)',
    menuDocuments: 'Study Documents',
    menuFlashcards: 'Flashcards',
    menuQuizzes: 'AI Quizzes',
    menuDeadlines: 'Deadlines',
    menuGroups: 'Study Groups',
    menuAiChat: 'AI Tutor',
    menuPremium: 'Premium VIP',
    menuSettings: 'Settings',
    audioMinutesProgress: 'Lecture Recording',
    aiCallsProgress: 'AI Requests',
    collapseSidebar: 'Collapse sidebar',
    expandSidebar: 'Expand sidebar',
    unlimitedCourses: 'Unlimited',
    courseLimitBadge: 'courses',

    // Dashboard
    welcomeGreeting: 'Welcome back',
    dashboardSubtitle: 'Track study progress, record lectures, and organize academic deadlines with AI.',
    statsTotalCourses: 'Enrolled Courses',
    statsAudioMinutes: 'Lecture Audio Minutes',
    statsCardsMastered: 'Mastered Flashcards',
    statsPendingDeadlines: 'Pending Deadlines',
    quickActionRecord: 'Record Lecture',
    quickActionUpload: 'Upload Document',
    quickActionFlashcards: 'Review Cards',
    quickActionAiChat: 'Ask AI Tutor',
    recentLecturesTitle: 'Recent Lectures',
    noLecturesYet: 'No recorded lectures yet',
    noLecturesDesc: 'Click "Record Lecture" to record live audio or upload an audio file.',
    startFirstRecordingBtn: 'Record First Lecture',
    upcomingDeadlinesSection: 'Upcoming Deadlines & Tasks',
    noUpcomingDeadlines: 'No upcoming deadlines',
    allDeadlinesDone: 'Great job! All your assignments and tasks are completed.',
    aiRecommendationsSection: 'AI Study Insights',
    aiTipTitle: 'Study efficiency tip of the day',
    aiTipDesc: 'Practice Spaced Repetition on unmastered flashcards to increase memory retention by 300%.',

    // Courses & Lessons
    addCourseBtn: 'Add New Course',
    courseNameLabel: 'Course Name',
    courseCodeLabel: 'Course Code',
    lecturerLabel: 'Instructor / Professor',
    courseColorLabel: 'Theme Color',
    courseDescriptionLabel: 'Course Description',
    scheduleLabel: 'Class Schedule',
    searchCoursesPlaceholder: 'Search courses by name or code...',
    noCoursesFound: 'No courses found',
    noCoursesFoundDesc: 'Get started by creating your first course to store lectures and notes.',
    courseCreatedSuccess: 'Course created successfully!',
    courseUpdatedSuccess: 'Course details updated!',
    courseDeletedSuccess: 'Course and related data deleted successfully!',
    deleteCourseConfirmTitle: 'Confirm Course Deletion',
    deleteCourseConfirmDesc: 'This will permanently remove the course and all associated lectures, flashcards, quizzes, and files. Are you sure you want to proceed?',
    tabLessons: 'Lessons & Audio',
    tabFlashcards: 'Flashcards',
    tabQuizzes: 'AI Quizzes',
    tabDocuments: 'Documents',
    tabMindMap: 'Mind Map',
    tabDeadlines: 'Deadlines',
    lessonNameLabel: 'Lesson Title',
    addLessonBtn: 'Add New Lesson',
    noLessonsFound: 'No lessons recorded for this course yet',
    noLessonsFoundDesc: 'Record your classroom lecture or upload documents for AI summarization.',

    // Recorder & Audio
    startRecordingBtn: 'Start Recording',
    stopRecordingBtn: 'Stop Recording',
    pauseRecordingBtn: 'Pause',
    resumeRecordingBtn: 'Resume',
    recordingLiveStatus: 'Recording classroom lecture live...',
    uploadAudioFileBtn: 'Upload Audio File (MP3, WAV, M4A)',
    audioFormatHint: 'Supports MP3, WAV, WebM, and M4A up to 100MB.',
    processingAudioWithAi: 'AI is listening and transcribing your lecture content...',
    transcriptTab: 'Transcript',
    summaryTab: 'AI Summary',
    keyPointsHeading: 'Key Insights & Core Concepts',
    actionItemsHeading: 'Action Items & Homework',
    exportSummaryBtn: 'Export Summary (TXT)',
    deleteLessonBtn: 'Delete Lesson',
    deleteLessonConfirm: 'Are you sure you want to delete this lesson?',

    // Flashcards
    createFlashcardBtn: 'Create New Flashcard',
    cardFrontLabel: 'Front (Question / Concept)',
    cardBackLabel: 'Back (Answer / Definition)',
    cardFrontPlaceholder: 'e.g., What is Le Chatelier\'s principle?',
    cardBackPlaceholder: 'e.g., When any system at equilibrium is disturbed...',
    flipCardHint: 'Click on the card or press Spacebar to flip',
    knownBtn: 'Know it (Mastered)',
    dontKnowBtn: 'Don\'t know (Review again)',
    masteredCount: 'Mastered',
    learningCount: 'Reviewing',
    resetDeckBtn: 'Restart Deck',
    shuffleCardsBtn: 'Shuffle Cards',
    noCardsInDeck: 'No flashcards in this deck',
    noCardsInDeckDesc: 'Create new cards manually or let AI generate them directly from your lectures.',

    // AI Quizzes
    generateAiQuizBtn: 'Generate AI Quiz',
    questionCountLabel: 'Number of Questions',
    difficultyLabel: 'Difficulty Level',
    difficultyEasy: 'Easy (Recall)',
    difficultyMedium: 'Medium (Application)',
    difficultyHard: 'Hard (Deep Analysis)',
    startQuizBtn: 'Start Quiz Now',
    questionNumber: 'Question',
    ofWord: 'of',
    submitAnswerBtn: 'Submit Answer',
    explanationHeading: 'Detailed AI Explanation',
    quizCompletedTitle: 'Quiz Completed!',
    yourScoreIs: 'Your Score',
    retakeQuizBtn: 'Retake Quiz',
    goodJobMessage: 'Excellent job! You have mastered this topic.',
    tryAgainMessage: 'Review incorrect answers and practice again to improve your score.',

    // Deadlines
    addDeadlineBtn: 'Add Deadline',
    deadlineTitleLabel: 'Assignment / Task Title',
    deadlineTitlePlaceholder: 'e.g., Submit Data Structures final project...',
    dueDateLabel: 'Due Date & Time',
    priorityLabel: 'Priority Level',
    priorityHigh: 'High (Urgent)',
    priorityMedium: 'Medium',
    priorityLow: 'Low',
    filterAll: 'All',
    filterPending: 'Pending',
    filterCompleted: 'Completed',
    filterOverdue: 'Overdue',
    markCompletedBtn: 'Mark as Completed',
    markPendingBtn: 'Mark as Pending',
    noDeadlinesFound: 'No deadlines on the list',
    noDeadlinesFoundDesc: 'Add assignments, projects, or exam dates so you never miss a submission.',
    deadlineAddedSuccess: 'Deadline added successfully!',
    deadlineUpdatedSuccess: 'Deadline updated!',
    deadlineDeletedSuccess: 'Deadline deleted successfully!',

    // Study Groups
    createGroupBtn: 'Create Study Group',
    joinGroupBtn: 'Join with Code',
    groupNameLabel: 'Group Name',
    groupCodeLabel: 'Group Join Code',
    enterGroupCodePlaceholder: 'Enter 6-character code (e.g. GRP123)',
    groupMembersHeading: 'Group Members',
    sharedResourcesHeading: 'Shared Study Materials',
    groupChatHeading: 'Group Discussion Chat',
    typeMessagePlaceholder: 'Type a message to the group...',
    sendMessageBtn: 'Send',
    noGroupsFound: 'You haven\'t joined any study groups yet',
    noGroupsFoundDesc: 'Create a new group or enter an invite code to study with peers.',

    // AI Tutor
    aiTutorHeading: 'Personal AI Tutor & Study Assistant',
    aiTutorSubheading: 'Ask questions about lectures, solve complex exercises, summarize formulas, and prepare for exams 24/7.',
    askAiPlaceholder: 'Ask your AI Tutor anything (e.g., Explain Dijkstra\'s algorithm with an intuitive example)...',
    sendAiMessageBtn: 'Send Message',
    suggestedQuestionsHeading: 'Suggested Questions',
    clearChatBtn: 'Clear Chat History',
    aiThinkingMessage: 'AI Tutor is preparing your answer...',

    // Auth & Email Verification
    authModalTitleLogin: 'Log in to Mầm Study',
    authModalTitleRegister: 'Create New Student Account',
    authModalTitleForgot: 'Reset Account Password',
    emailLabel: 'Student Email Address',
    emailPlaceholder: 'student@university.edu',
    passwordLabel: 'Password',
    passwordPlaceholder: 'At least 8 characters with letters & numbers',
    confirmPasswordLabel: 'Confirm Password',
    fullNameLabel: 'Full Name',
    schoolLabel: 'University / College',
    majorLabel: 'Major',
    academicYearLabel: 'Academic Year',
    agreeTermsText: 'I agree to the Terms of Service and Privacy Policy of Mầm Study.',
    loginButton: 'Log In Now',
    registerButton: 'Sign Up',
    forgotPasswordLink: 'Forgot password?',
    noAccountText: "Don't have an account? Sign up now",
    hasAccountText: 'Already have an account? Log in',
    emailNotVerifiedBanner: 'Your email address is not verified yet. Please check your inbox to activate all features.',
    resendVerificationBtn: 'Resend Verification Email',
    accountCreatedEmailFailedMsg: 'Your account has been created, but the verification email could not be sent. Please configure the email service or try resending later.',
    verificationSentMsg: 'Verification email has been resent. Please check your inbox and spam folder.',
    verificationSuccessMsg: 'Email verified successfully! Your account is now fully activated.',
    verificationErrorMsg: 'Verification link is invalid or has expired.',
    verifyEmailTitle: 'Verify Your Email Address',
    verifyEmailSubtitle: 'Enter the 6-digit verification code sent to your email to activate your account.',
    resetPasswordTitle: 'Set New Password',
    resetPasswordSubtitle: 'Create a secure new password for your account.',
    resetPasswordSuccess: 'Password changed successfully! Please log in with your new password.',

    // Premium & Checkout
    premiumTitle: 'Unlock Your Full Academic Potential with Premium VIP',
    premiumSubtitle: 'Unlimited courses, 3,000 minutes of lecture audio, unlimited mind maps, and elite AI tutor.',
    monthlyPlan: 'Monthly Plan',
    yearlyPlan: 'Annual Plan',
    monthlyPrice: '$3.99 / month',
    yearlyPrice: '$34.99 / year',
    save30Percent: 'Save 30%',
    buyNow: 'Buy Now',
    popularChoice: 'Most Popular',
    checkoutTitle: 'Complete Your Premium Purchase',
    orderCode: 'Order ID',
    amountToPay: 'Amount Due',
    paymentMethod: 'Payment Method',
    momoWallet: 'MoMo E-Wallet',
    zaloPayWallet: 'ZaloPay E-Wallet',
    stripeCard: 'International Credit Card (Stripe)',
    bankTransfer: 'Bank Transfer (TPBank)',
    scanQrPrompt: 'Scan QR code with your app to pay',
    openWalletPrompt: 'Open wallet app to complete payment',
    paymentProcessing: 'Awaiting payment verification...',
    paymentSuccess: 'Payment confirmed! Premium VIP has been activated.',
    paymentFailed: 'Payment was not successful. Please try again.',
    paymentExpired: 'This order has expired (15-minute window). Please create a new order.',
    testPaymentSimulation: 'Sandbox Test Mode',
    confirmTestPayment: 'Confirm Sandbox Payment (Test Mode)',
    paymentHistory: 'Transaction History',
    backToDashboard: 'Back to Dashboard',
    currentPlanLabel: 'Current Plan',
    planFeatureUnlimitedSubjects: 'Unlimited courses and subjects',
    planFeature3000Audio: '3,000 minutes of lecture recording per month',
    planFeatureMindMaps: 'Unlimited AI Mind Map generation',
    planFeatureEliteAi: 'Priority elite AI Tutor with instant response',

    // Mind Map
    mindMapTitle: 'Interactive AI Mind Map',
    mindMapSubtitle: 'Automatically structure and visualize key lesson topics into hierarchical mind maps.',
    generateMindMap: 'Generate Mind Map with AI',
    regenerateMindMap: 'Regenerate Mind Map',
    generatingMindMap: 'AI is analyzing and generating mind map structure...',
    deleteMindMap: 'Delete Mind Map',
    downloadMindMap: 'Download Mind Map (JSON)',
    mindMapEmptyText: 'No mind map generated yet. Click "Generate Mind Map with AI" to begin.',
    mindMapSuccess: 'Mind map generated successfully!',
    mindMapError: 'Failed to generate mind map. Please check your lesson content.',

    // Profile & Avatar
    profileTitle: 'User Profile & Settings',
    avatarTitle: 'Profile Picture',
    changeAvatar: 'Change Avatar',
    removeAvatar: 'Remove Avatar',
    uploadingAvatar: 'Uploading avatar to server storage...',
    avatarFormatHint: 'JPG, PNG, or WEBP. Max file size: 5MB.',
    saveProfileSuccess: 'Profile updated successfully!',
    languageSettingTitle: 'Display Language',
    languageSettingDesc: 'Select Vietnamese or English. You can also press Ctrl + Shift + L (or ⌘ + Shift + L) to toggle anytime.',

    // Notifications
    notificationsTitle: 'Notification Center',
    markAllRead: 'Mark All as Read',
    noNotifications: 'You have no notifications at this time.',
    unreadFilter: 'Unread',
    allFilter: 'All',
    deadlineFilter: 'Deadlines',
    paymentFilter: 'Payments',
    accountFilter: 'Account',
    marketingFilter: 'Promotions',

    // Settings
    notificationSettingsTitle: 'Email Notification Preferences',
    accountEmailSetting: 'Account security and verification emails (Mandatory)',
    deadlineEmailSetting: 'Upcoming & overdue deadline reminder emails (24h before)',
    premiumEmailSetting: 'Premium expiry notices (7 days, 3 days, 1 day before)',
    marketingEmailSetting: 'Promotional offers and study discounts (Optional)',
    transactionEmailSetting: 'Payment receipts and order confirmations',
    settingsSaved: 'Notification preferences saved successfully!',
    aiDiagnosticsTitle: 'Gemini AI Connection Diagnostics',
    testAiConnectionBtn: 'Test Gemini API Connection',
    aiConnectionSuccess: 'Gemini API connection successful!',
    aiConnectionFailed: 'Failed to connect to Gemini API. Please check your API key.',
    exportDataBtn: 'Export Backup Data (JSON)',
    resetDemoDataBtn: 'Reset Demo Data',
    resetDemoDataConfirm: 'Are you sure you want to reset all courses and lectures back to the initial demo data?',

    // Dialogs & Modals
    confirmDeleteTitle: 'Confirm Deletion',
    confirmDeleteWarning: 'This action cannot be undone.',
    themeToggleLight: 'Light Mode',
    themeToggleDark: 'Dark Mode',
    themeToggleSystem: 'System Theme',
  },
};
