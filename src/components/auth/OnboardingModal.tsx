import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Modal } from '../common/Modal';
import { Sparkles, BookOpen, Mic, CheckCircle2, ArrowRight } from 'lucide-react';

export const OnboardingModal: React.FC = () => {
  const {
    currentUser,
    onboardingOpen,
    setOnboardingOpen,
    updateProfile,
    addSubject,
    setActiveTab,
    language,
  } = useApp();

  const [step, setStep] = useState(1);
  const [fullName, setFullName] = useState(currentUser?.fullName || '');
  const [school, setSchool] = useState(currentUser?.school || '');
  const [major, setMajor] = useState(currentUser?.major || '');
  const [subjectName, setSubjectName] = useState('');
  const [subjectCode, setSubjectCode] = useState('');
  const [subjectColor, setSubjectColor] = useState('#3B82F6');

  if (!onboardingOpen) return null;

  const handleNext = () => {
    if (step === 1) {
      updateProfile({ fullName, school, major });
      setStep(2);
    } else if (step === 2) {
      if (subjectName.trim()) {
        addSubject({
          name: subjectName,
          code: subjectCode || 'MH01',
          description:
            language === 'vi'
              ? `Môn học ${subjectName} trong chương trình đào tạo`
              : `Course ${subjectName} in curriculum`,
          color: subjectColor,
        });
      }
      setStep(3);
    } else {
      setOnboardingOpen(false);
      setActiveTab('dashboard');
    }
  };

  const handleSkip = () => {
    setOnboardingOpen(false);
    setActiveTab('dashboard');
  };

  return (
    <Modal isOpen={onboardingOpen} onClose={handleSkip} maxWidth="lg">
      <div className="py-2">
        {/* Step Indicators */}
        <div className="flex items-center justify-center gap-2 mb-6">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                s === step
                  ? 'w-8 bg-indigo-600'
                  : s < step
                  ? 'w-4 bg-emerald-500'
                  : 'w-4 bg-slate-200 dark:bg-slate-700'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <div className="mb-4">
              <img
                src="/assets/aistudio/H_ng____Tr_ng_Ch__C_ch__i_u_C_a_H_ng_M__Ph_m_Logo_f1d06039.png"
                alt="Mầm Study Logo"
                className="h-12 w-auto object-contain rounded-xl"
              />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              {language === 'vi'
                ? 'Chào mừng bạn đến với Mầm Study!'
                : 'Welcome to Mầm Study!'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {language === 'vi'
                ? 'Hãy cho chúng mình biết một chút về thông tin học tập của bạn nhé.'
                : 'Tell us a little bit about your academic background.'}
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'vi' ? 'Họ và tên bạn muốn hiển thị' : 'Display Full Name'}
                </label>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={language === 'vi' ? 'Ví dụ: Hoàng Minh' : 'e.g., Alex Nguyen'}
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'vi' ? 'Trường đại học / Cao đẳng' : 'University / College'}
                </label>
                <input
                  type="text"
                  value={school}
                  onChange={(e) => setSchool(e.target.value)}
                  placeholder={
                    language === 'vi'
                      ? 'Ví dụ: Đại học Bách Khoa'
                      : 'e.g., University of Science and Technology'
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'vi' ? 'Chuyên ngành học' : 'Major'}
                </label>
                <input
                  type="text"
                  value={major}
                  onChange={(e) => setMajor(e.target.value)}
                  placeholder={
                    language === 'vi'
                      ? 'Ví dụ: Công nghệ thông tin, Quản trị kinh doanh...'
                      : 'e.g., Computer Science, Business Administration...'
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 flex items-center justify-center mb-4">
              <BookOpen className="w-6 h-6" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-1">
              {language === 'vi' ? 'Tạo môn học đầu tiên của bạn' : 'Create your first course'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">
              {language === 'vi'
                ? 'Bạn có thể quản lý tối đa 4 môn với gói Miễn phí. Bạn đang học môn gì khó nhất kỳ này?'
                : 'You can manage up to 4 courses on the Free plan. Which course are you taking this semester?'}
            </p>

            <div className="space-y-3 mb-6">
              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  {language === 'vi' ? 'Tên môn học' : 'Course Name'}{' '}
                  <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={subjectName}
                  onChange={(e) => setSubjectName(e.target.value)}
                  placeholder={
                    language === 'vi'
                      ? 'Ví dụ: Cấu trúc dữ liệu và giải thuật'
                      : 'e.g., Data Structures & Algorithms'
                  }
                  className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'vi' ? 'Mã môn (tùy chọn)' : 'Course Code (optional)'}
                  </label>
                  <input
                    type="text"
                    value={subjectCode}
                    onChange={(e) => setSubjectCode(e.target.value)}
                    placeholder="IT101"
                    className="w-full px-3 py-2 text-sm rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                    {language === 'vi' ? 'Màu nhận diện' : 'Color Theme'}
                  </label>
                  <div className="flex items-center gap-2 mt-1">
                    {['#3B82F6', '#8B5CF6', '#10B981', '#F59E0B', '#EF4444'].map((c) => (
                      <button
                        type="button"
                        key={c}
                        onClick={() => setSubjectColor(c)}
                        className={`w-6 h-6 rounded-full border-2 transition-transform ${
                          subjectColor === c ? 'scale-125 border-slate-900 dark:border-white' : 'border-transparent'
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="text-center py-2">
            <div className="w-14 h-14 rounded-2xl bg-emerald-100 text-emerald-600 mx-auto flex items-center justify-center mb-4">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white mb-2">
              {language === 'vi'
                ? 'Bạn đã sẵn sàng bứt phá kỳ học này!'
                : 'You are ready to ace this semester!'}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
              {language === 'vi' ? (
                <>
                  Mẹo nhanh: Bấm vào nút <strong>"Ghi âm bài giảng"</strong> khi vào lớp. AI sẽ tự động phân tích và tạo flashcard sau mỗi buổi học cho bạn.
                </>
              ) : (
                <>
                  Quick tip: Click <strong>"Lecture Recorder"</strong> when class starts. AI will automatically analyze and create flashcards after each lecture.
                </>
              )}
            </p>

            <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-800/60 text-left border border-slate-200 dark:border-slate-700 mb-6 space-y-2 text-xs text-slate-600 dark:text-slate-300">
              <div className="flex items-center gap-2">
                <Mic className="w-4 h-4 text-indigo-600" />
                <span>
                  {language === 'vi'
                    ? 'Ghi âm hoặc tải file âm thanh bài học'
                    : 'Record or upload lecture audio files'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-600" />
                <span>
                  {language === 'vi'
                    ? 'Xem tóm tắt, sơ đồ tư duy & flashcard tức thì'
                    : 'View instant summaries, mind maps & flashcards'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>
                  {language === 'vi'
                    ? 'Không bao giờ bị trễ hạn bài tập nhờ AI Deadline'
                    : 'Never miss an assignment with AI Deadline detection'}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={handleSkip}
            className="text-xs font-semibold text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
          >
            {language === 'vi' ? 'Bỏ qua' : 'Skip'}
          </button>

          <button
            onClick={handleNext}
            className="inline-flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
          >
            <span>
              {step === 3
                ? language === 'vi'
                  ? 'Bắt đầu sử dụng'
                  : 'Get Started'
                : language === 'vi'
                ? 'Tiếp tục'
                : 'Continue'}
            </span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </Modal>
  );
};
