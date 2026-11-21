import React from 'react';
import { useApp } from '../../context/AppContext';
import { LanguageToggle } from '../common/LanguageToggle';
import {
  Mic,
  Brain,
  Layers,
  Bot,
  CalendarCheck,
  CheckCircle2,
  ArrowRight,
  GraduationCap,
  Sparkles,
  Zap,
  BookOpen,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { openAuthModal, setActiveTab, language, formatCurrency } = useApp();

  const faqs =
    language === 'vi'
      ? [
          {
            q: 'Mầm Study hoạt động như thế nào trong lớp học?',
            a: 'Bạn chỉ cần nhấn nút Ghi âm khi thầy cô bắt đầu giảng bài. Sau tiết học, AI sẽ tự động phiên âm (speech-to-text), tóm tắt các ý chính, vẽ sơ đồ tư duy, tạo bộ flashcard và trích xuất hạn nộp bài tập được thầy cô nhắc tới.',
          },
          {
            q: 'Gói Free có bị giới hạn thời gian sử dụng không?',
            a: 'Gói Free được sử dụng vĩnh viễn với tối đa 4 môn học đồng thời, 300 phút ghi âm mỗi tháng và đầy đủ tính năng tạo flashcard, trắc nghiệm và trợ lý AI.',
          },
          {
            q: 'Dữ liệu bài giảng và ghi âm của tôi có được bảo mật không?',
            a: 'Hoàn toàn bảo mật. Dữ liệu bài giảng, âm thanh và ghi chú cá nhân chỉ bạn mới có quyền truy cập, tuân thủ các tiêu chuẩn bảo mật dữ liệu học đường cao nhất.',
          },
          {
            q: 'Tôi có thể tải file audio có sẵn từ điện thoại lên không?',
            a: 'Có! Hệ thống hỗ trợ tải file âm thanh (.mp3, .wav, .webm, .m4a) và các tài liệu slide PDF, DOCX để AI phân tích tự động.',
          },
        ]
      : [
          {
            q: 'How does Mầm Study work in the classroom?',
            a: 'Simply press Record when your instructor begins the lecture. After class, AI automatically transcribes the audio, summarizes key takeaways, generates mind maps, creates flashcard decks, and extracts any mentioned assignment deadlines.',
          },
          {
            q: 'Does the Free plan expire?',
            a: 'No! The Free plan is free forever with up to 4 concurrent courses, 300 recording minutes per month, and full access to flashcards, quizzes, and the AI Tutor.',
          },
          {
            q: 'Are my lecture recordings and study notes private?',
            a: 'Yes, completely private. Your lecture recordings, transcripts, and personal notes are accessible only to you and protected by strict academic data security standards.',
          },
          {
            q: 'Can I upload pre-recorded audio files from my phone?',
            a: 'Yes! The platform supports uploading audio files (.mp3, .wav, .webm, .m4a) as well as PDF, DOCX, and TXT documents for automatic AI analysis.',
          },
        ];

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 selection:bg-indigo-500 selection:text-white">
      {/* Top Navigation */}
      <header className="sticky top-0 z-50 bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border-b border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <img
              src="/assets/aistudio/H_ng____Tr_ng_Ch__C_ch__i_u_C_a_H_ng_M__Ph_m_Logo_f1d06039.png"
              alt="Mầm Study Logo"
              className="h-10 w-auto object-contain rounded-lg shrink-0"
            />
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-xl tracking-tight bg-linear-to-r from-[#4ADE80] to-[#2DD4BF] bg-clip-text text-transparent">
                Mầm Study
              </span>
              <span className="px-1.5 py-0.5 text-[10px] font-black uppercase tracking-wider rounded bg-emerald-500/15 dark:bg-emerald-500/20 text-emerald-600 dark:text-[#4ADE80] border border-emerald-500/30">
                AI
              </span>
            </div>
          </div>

          <div className="hidden md:flex items-center gap-8 text-sm font-semibold text-slate-600 dark:text-slate-300">
            <a href="#features" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {language === 'vi' ? 'Tính năng' : 'Features'}
            </a>
            <a href="#pricing" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {language === 'vi' ? 'Bảng giá' : 'Pricing'}
            </a>
            <a href="#faq" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
              {language === 'vi' ? 'Hỏi đáp' : 'FAQ'}
            </a>
          </div>

          <div className="flex items-center gap-3">
            <LanguageToggle variant="navbar" />
            <button
              onClick={() => openAuthModal('login')}
              className="px-4 py-2 text-sm font-bold text-slate-700 dark:text-slate-200 hover:text-indigo-600 transition-colors"
            >
              {language === 'vi' ? 'Đăng nhập' : 'Sign In'}
            </button>
            <button
              onClick={() => openAuthModal('register')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-bold shadow-lg shadow-indigo-600/25 transition-all active:scale-95"
            >
              {language === 'vi' ? 'Bắt đầu miễn phí' : 'Get Started Free'}
            </button>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative overflow-hidden pt-16 pb-20 md:pt-24 md:pb-28">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.15),rgba(255,255,255,0))] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-20%,rgba(99,102,241,0.25),rgba(0,0,0,0))]" />

        <div className="relative max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-[#4ADE80] text-xs font-bold mb-8">
            <Sparkles className="w-4 h-4 text-emerald-600 dark:text-[#4ADE80]" />
            {language === 'vi'
              ? 'Trợ lý thông minh cho sinh viên hiện đại'
              : 'Smart Assistant for Modern University Students'}
          </div>

          <h1 className="text-4xl sm:text-5xl md:text-6xl font-black tracking-tight text-slate-900 dark:text-white leading-[1.15] mb-6">
            {language === 'vi' ? 'Tập trung học tập,' : 'Focus on learning,'}{' '}
            <br className="hidden sm:block" />
            <span className="bg-linear-to-r from-indigo-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              {language === 'vi' ? 'để AI lo phần ghi chép' : 'let AI handle the note-taking'}
            </span>
          </h1>

          <p className="max-w-2xl mx-auto text-base sm:text-lg text-slate-600 dark:text-slate-400 leading-relaxed mb-10">
            {language === 'vi'
              ? 'Ghi âm bài giảng trên giảng đường, tự động chuyển thành văn bản, tạo tóm tắt thông minh, sơ đồ tư duy, flashcard ôn tập và nhắc deadline trước khi quá hạn.'
              : 'Record lectures in class, automatically transcribe speech to text, generate smart summaries, mind maps, review flashcards, and track deadlines before they are due.'}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button
              onClick={() => openAuthModal('register')}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-8 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-base shadow-xl shadow-indigo-600/30 transition-all transform active:scale-95"
            >
              <span>{language === 'vi' ? 'Dùng thử miễn phí ngay' : 'Try for Free Now'}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <button
              onClick={() => {
                // Enter app with demo data
                setActiveTab('dashboard');
              }}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-4 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 text-slate-800 dark:text-slate-200 font-bold text-base shadow-xs transition-all"
            >
              <Zap className="w-5 h-5 text-amber-500" />
              <span>
                {language === 'vi'
                  ? 'Xem trước Bản Demo (Không cần tạo tài khoản)'
                  : 'Preview Live Demo (No Account Required)'}
              </span>
            </button>
          </div>

          <div className="mt-8 flex items-center justify-center gap-6 text-xs font-semibold text-slate-500 dark:text-slate-400">
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{language === 'vi' ? 'Miễn phí 4 môn học' : 'Free up to 4 courses'}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>
                {language === 'vi' ? '300 phút ghi âm / tháng' : '300 recording mins / month'}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              <span>{language === 'vi' ? 'Không cần thẻ ngân hàng' : 'No credit card required'}</span>
            </div>
          </div>
        </div>
      </section>

      {/* Feature Section */}
      <section id="features" className="py-20 bg-white dark:bg-slate-900 border-y border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">
              {language === 'vi'
                ? 'MỌI THỨ BẠN CẦN ĐỂ ĐẠT ĐIỂM A+'
                : 'EVERYTHING YOU NEED TO GET AN A+'}
            </h2>
            <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'vi'
                ? 'Quy trình học tập khép kín thông minh'
                : 'Smart End-to-End Learning Workflow'}
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Mic className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {language === 'vi'
                  ? '1. Ghi âm & Phiên âm bài giảng'
                  : '1. Record & Transcribe Lectures'}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {language === 'vi'
                  ? 'Ghi âm trực tiếp từ microphone lớp học hoặc tải file audio lên. AI chuyển âm thanh thành văn bản tiếng Việt cực chuẩn, bao gồm cả thuật ngữ chuyên ngành.'
                  : 'Record directly from your classroom microphone or upload audio files. AI accurately transcribes speech to text, including specialized academic terminology.'}
              </p>
            </div>

            {/* Feature 2 */}
            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Brain className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {language === 'vi' ? '2. Tóm tắt & Sơ đồ tư duy' : '2. Summaries & Mind Maps'}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {language === 'vi'
                  ? 'Tự động cô đọng bài giảng 2 tiếng thành bản tóm tắt 5-10 câu súc tích. Trích xuất ý chính, khái niệm cốt lõi và dựng sơ đồ tư duy Mind Map phân cấp trực quan.'
                  : 'Automatically condense a 2-hour lecture into a concise 5–10 sentence summary. Extract key takeaways, core concepts, and build interactive hierarchical Mind Maps.'}
              </p>
            </div>

            {/* Feature 3 */}
            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-pink-500/10 text-pink-600 dark:text-pink-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Layers className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {language === 'vi'
                  ? '3. Flashcard & Trắc nghiệm tự động'
                  : '3. Automated Flashcards & Quizzes'}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {language === 'vi'
                  ? 'Không cần mất công gõ tay từng câu hỏi. Hệ thống tự tạo bộ Flashcard 3D và bài kiểm tra trắc nghiệm 4 lựa chọn kèm lời giải thích chi tiết.'
                  : 'No need to type out questions manually. Automatically generate 3D Flashcard decks and 4-option multiple-choice quizzes with detailed explanations.'}
              </p>
            </div>

            {/* Feature 4 */}
            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-600 dark:text-sky-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <Bot className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {language === 'vi' ? '4. Trợ giảng AI 24/7' : '4. 24/7 AI Tutor'}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {language === 'vi'
                  ? 'Hỏi đáp trực tiếp dựa trên nội dung bài giảng và tài liệu môn học của bạn. AI không bịa thông tin, giải thích dễ hiểu kèm ví dụ thực tế.'
                  : 'Ask questions directly grounded in your lecture transcripts and course materials. Clear explanations with practical real-world examples.'}
              </p>
            </div>

            {/* Feature 5 */}
            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <CalendarCheck className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {language === 'vi'
                  ? '5. Tự động nhận diện Deadline'
                  : '5. Smart Deadline Detection'}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {language === 'vi'
                  ? 'Khi thầy cô nói "Hạn nộp bài là thứ tư tuần sau", AI sẽ bắt ngay mốc thời gian và đề xuất deadline vào lịch, có checklist và nhắc nhở đúng hạn.'
                  : 'When your professor mentions "Assignment due next Wednesday", AI captures the date and suggests a deadline with checklists and timely reminders.'}
              </p>
            </div>

            {/* Feature 6 */}
            <div className="p-7 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 hover:shadow-xl transition-all group">
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mb-5 group-hover:scale-110 transition-transform">
                <BookOpen className="w-6 h-6" />
              </div>
              <h4 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
                {language === 'vi'
                  ? '6. Quản lý môn học & Nhóm'
                  : '6. Course & Study Group Management'}
              </h4>
              <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed">
                {language === 'vi'
                  ? 'Tổ chức theo từng môn học trong kỳ. Lập nhóm học tập, chia sẻ bài học và phân công deadline nhóm rõ ràng, minh bạch.'
                  : 'Organize everything by semester courses. Form study groups, share lessons, and coordinate group deadlines transparently.'}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-3">
            {language === 'vi' ? 'BẢNG GIÁ MINH BẠCH' : 'TRANSPARENT PRICING'}
          </h2>
          <h3 className="text-3xl sm:text-4xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'vi'
              ? 'Chọn gói học tập phù hợp với bạn'
              : 'Choose the right study plan for you'}
          </h3>
          <p className="text-slate-600 dark:text-slate-400 text-sm mt-3">
            {language === 'vi'
              ? 'Bắt đầu miễn phí hoàn toàn, nâng cấp bất cứ lúc nào khi cần quản lý nhiều hơn 4 môn học.'
              : 'Start completely free, upgrade anytime when you need to manage more than 4 courses.'}
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-4xl mx-auto">
          {/* Free Tier */}
          <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm flex flex-col justify-between">
            <div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 mb-4">
                {language === 'vi' ? 'Gói Sinh Viên Miễn Phí' : 'Free Student Plan'}
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-black text-slate-900 dark:text-white">
                  {formatCurrency(0)}
                </span>
                <span className="text-slate-500 text-sm">
                  {language === 'vi' ? '/ vĩnh viễn' : '/ forever'}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {language === 'vi'
                  ? 'Dành cho sinh viên muốn trải nghiệm học tập thông minh với các môn trọng tâm.'
                  : 'For students who want to experience smart learning for their core courses.'}
              </p>

              <div className="space-y-3.5 mb-8 text-sm">
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    {language === 'vi' ? (
                      <>
                        <strong>Tối đa 4 môn học</strong> đồng thời
                      </>
                    ) : (
                      <>
                        <strong>Up to 4 courses</strong> simultaneously
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    {language === 'vi'
                      ? '300 phút ghi âm bài giảng / tháng'
                      : '300 lecture recording mins / month'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    {language === 'vi'
                      ? 'Tự động tóm tắt & lập ý chính'
                      : 'Automated summaries & key takeaways'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    {language === 'vi'
                      ? 'Flashcard & Trắc nghiệm cơ bản'
                      : 'Essential Flashcards & Quizzes'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-700 dark:text-slate-300">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>
                    {language === 'vi'
                      ? 'Quản lý deadline cá nhân & nhóm'
                      : 'Personal & group deadline management'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => openAuthModal('register')}
              className="w-full py-3.5 rounded-xl border-2 border-slate-300 dark:border-slate-700 hover:border-indigo-600 text-slate-800 dark:text-slate-200 font-bold text-sm transition-colors"
            >
              {language === 'vi' ? 'Bắt đầu với gói Free' : 'Start with Free Plan'}
            </button>
          </div>

          {/* Premium Tier */}
          <div className="relative p-8 rounded-3xl bg-linear-to-b from-indigo-50/60 to-purple-50/60 dark:from-indigo-950/40 dark:to-slate-900 border-2 border-indigo-600 shadow-xl flex flex-col justify-between">
            <div className="absolute -top-3.5 right-6 px-3.5 py-1 rounded-full bg-linear-to-r from-indigo-600 to-purple-600 text-white text-xs font-black shadow-md">
              {language === 'vi' ? 'KHUYÊN DÙNG' : 'RECOMMENDED'}
            </div>

            <div>
              <div className="inline-block px-3 py-1 rounded-full text-xs font-bold bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 mb-4">
                Mầm Study VIP Premium
              </div>
              <div className="flex items-baseline gap-2 mb-2">
                <span className="text-4xl font-black text-indigo-600 dark:text-indigo-400">
                  {formatCurrency(79000)}
                </span>
                <span className="text-slate-500 text-sm">
                  {language === 'vi' ? '/ tháng' : '/ month'}
                </span>
              </div>
              <p className="text-sm text-slate-600 dark:text-slate-400 mb-6">
                {language === 'vi'
                  ? 'Chỉ bằng 2 ly trà sữa, mở khóa toàn bộ tiềm năng học tập cho cả học kỳ.'
                  : 'For the price of two coffees, unlock your full academic potential all semester.'}
              </p>

              <div className="space-y-3.5 mb-8 text-sm">
                <div className="flex items-center gap-3 text-slate-900 dark:text-white font-medium">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    {language === 'vi' ? (
                      <>
                        <strong>Không giới hạn môn học</strong> (trên 4 môn)
                      </>
                    ) : (
                      <>
                        <strong>Unlimited courses</strong> (beyond 4 courses)
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-900 dark:text-white font-medium">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    {language === 'vi' ? (
                      <>
                        <strong>3.000 phút ghi âm</strong> bài giảng mỗi tháng
                      </>
                    ) : (
                      <>
                        <strong>3,000 recording mins</strong> per month
                      </>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-900 dark:text-white font-medium">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    {language === 'vi'
                      ? 'Trợ giảng AI không giới hạn câu hỏi'
                      : 'Unlimited AI Tutor questions'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-900 dark:text-white font-medium">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    {language === 'vi'
                      ? 'Sơ đồ tư duy nâng cao & Tải file chất lượng cao'
                      : 'Advanced Mind Maps & High-Res Exports'}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-slate-900 dark:text-white font-medium">
                  <CheckCircle2 className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <span>
                    {language === 'vi'
                      ? 'Tự động nhận diện deadline siêu tốc độ cao'
                      : 'High-speed AI deadline extraction'}
                  </span>
                </div>
              </div>
            </div>

            <button
              onClick={() => openAuthModal('register')}
              className="w-full py-3.5 rounded-xl bg-linear-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-sm shadow-lg shadow-indigo-600/30 transition-all active:scale-95"
            >
              {language === 'vi' ? 'Nâng cấp Premium ngay' : 'Upgrade to Premium Now'}
            </button>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-slate-100/60 dark:bg-slate-900/40 border-t border-slate-200/80 dark:border-slate-800/80">
        <div className="max-w-4xl mx-auto px-4 sm:px-6">
          <div className="text-center mb-12">
            <h2 className="text-xs font-extrabold uppercase tracking-widest text-indigo-600 dark:text-indigo-400 mb-2">
              {language === 'vi' ? 'GIẢI ĐÁP THẮC MẮC' : 'FREQUENTLY ASKED QUESTIONS'}
            </h2>
            <h3 className="text-3xl font-black text-slate-900 dark:text-white">
              {language === 'vi' ? 'Câu hỏi thường gặp' : 'Common Questions'}
            </h3>
          </div>

          <div className="space-y-4">
            {faqs.map((faq, idx) => (
              <div
                key={idx}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800"
              >
                <h4 className="text-base font-bold text-slate-900 dark:text-white mb-2">
                  {faq.q}
                </h4>
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-slate-200 dark:border-slate-800 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <img
              src="/assets/aistudio/H_ng____Tr_ng_Ch__C_ch__i_u_C_a_H_ng_M__Ph_m_Logo_f1d06039.png"
              alt="Mầm Study Logo"
              className="h-8 w-auto object-contain rounded-lg"
            />
            <span className="font-bold bg-linear-to-r from-[#4ADE80] to-[#2DD4BF] bg-clip-text text-transparent">
              Mầm Study
            </span>
            <span>
              {language === 'vi'
                ? '— Trợ lý thông minh cho sinh viên hiện đại'
                : '— Smart Assistant for Modern Students'}
            </span>
          </div>
          <div>
            {language === 'vi'
              ? '© 2026 Mầm Study. Tích hợp Gemini 3.8 Flash & Cloud Storage.'
              : '© 2026 Mầm Study. Powered by Gemini 3.8 Flash & Cloud Storage.'}
          </div>
        </div>
      </footer>
    </div>
  );
};
