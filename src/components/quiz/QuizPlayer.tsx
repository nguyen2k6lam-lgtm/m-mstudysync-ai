import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Quiz, QuizQuestion } from '../../types';
import { Modal } from '../common/Modal';
import { generateQuiz } from '../../services/api';
import { safeConfirm } from '../../utils/formatters';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  Sparkles,
  Award,
  ArrowRight,
  Layers,
  BookOpen,
  Plus,
} from 'lucide-react';

interface QuizPlayerProps {
  filterSubjectId?: string;
}

export const QuizPlayer: React.FC<QuizPlayerProps> = ({ filterSubjectId }) => {
  const {
    currentUser,
    quizzes,
    subjects,
    activeSubjectId,
    saveQuizAttempt,
    addQuiz,
    incrementAiUsage,
    setActiveTab,
    showToast,
    language,
  } = useApp();

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(
    filterSubjectId || activeSubjectId || 'all'
  );

  // Available quizzes
  const filteredQuizzes = quizzes.filter(
    (q) => selectedSubjectFilter === 'all' || q.subjectId === selectedSubjectFilter
  );

  const [activeQuizId, setActiveQuizId] = useState<string | null>(
    filteredQuizzes[0]?.id || null
  );

  const activeQuiz = quizzes.find((q) => q.id === activeQuizId) || filteredQuizzes[0] || null;

  // Test state
  const [selectedAnswers, setSelectedAnswers] = useState<Record<number, number>>({});
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  // AI Quiz Generation Modal
  const [createQuizModalOpen, setCreateQuizModalOpen] = useState(false);
  const [quizTextPrompt, setQuizTextPrompt] = useState('');
  const [quizSubjectId, setQuizSubjectId] = useState(subjects[0]?.id || '');
  const [quizQuestionsCount, setQuizQuestionsCount] = useState(4);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleSelectOption = (questionIndex: number, optionIndex: number) => {
    if (isSubmitted) return;
    setSelectedAnswers((prev) => ({
      ...prev,
      [questionIndex]: optionIndex,
    }));
  };

  const handleSubmit = () => {
    if (!activeQuiz) return;
    const unanswered = activeQuiz.questions.some((_, i) => selectedAnswers[i] === undefined);
    if (unanswered) {
      if (
        !safeConfirm(
          language === 'vi'
            ? 'Bạn vẫn còn câu hỏi chưa chọn đáp án. Bạn có muốn nộp bài luôn không?'
            : 'You still have unanswered questions. Submit anyway?'
        )
      ) {
        return;
      }
    }

    let calculatedScore = 0;
    activeQuiz.questions.forEach((q, idx) => {
      if (selectedAnswers[idx] === q.correctAnswer) {
        calculatedScore += 1;
      }
    });

    setScore(calculatedScore);
    setIsSubmitted(true);

    // Save attempt
    saveQuizAttempt({
      quizId: activeQuiz.id,
      score: calculatedScore,
      totalQuestions: activeQuiz.questions.length,
      answers: Object.values(selectedAnswers),
    });
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setIsSubmitted(false);
    setScore(0);
    showToast(
      language === 'vi'
        ? 'Đã làm mới bài kiểm tra. Chúc bạn làm bài tốt!'
        : 'Quiz reset. Good luck!',
      'info'
    );
  };

  const handleGenerateAiQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTextPrompt.trim()) {
      showToast(
        language === 'vi'
          ? 'Vui lòng nhập nội dung hoặc chủ đề bài học để tạo trắc nghiệm!'
          : 'Please enter lesson content or topic to generate a quiz!',
        'error'
      );
      return;
    }

    setIsGenerating(true);
    try {
      const subject = subjects.find((s) => s.id === quizSubjectId);
      const res = await generateQuiz({
        text: quizTextPrompt,
        subjectId: quizSubjectId,
        subjectName: subject?.name || (language === 'vi' ? 'Môn học' : 'Subject'),
        numQuestions: quizQuestionsCount,
      });

      const newQuiz: Quiz = {
        id: res.quiz?.id || `quiz_ai_${Date.now()}`,
        ownerId: currentUser?.id || '',
        subjectId: quizSubjectId,
        title:
          res.quiz?.title ||
          (language === 'vi'
            ? `Trắc nghiệm: ${subject?.name || 'Môn học'}`
            : `Quiz: ${subject?.name || 'Subject'}`),
        questions: res.quiz?.questions || [],
        difficulty: 'medium',
        createdAt: new Date().toISOString(),
      };

      addQuiz(newQuiz);
      setActiveQuizId(newQuiz.id);
      setSelectedSubjectFilter(quizSubjectId);
      setSelectedAnswers({});
      setIsSubmitted(false);
      incrementAiUsage(1);

      setCreateQuizModalOpen(false);
      setQuizTextPrompt('');
      showToast(
        language === 'vi'
          ? `🎉 Tạo thành công bài trắc nghiệm với ${newQuiz.questions.length} câu hỏi!`
          : `🎉 Successfully generated quiz with ${newQuiz.questions.length} questions!`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      showToast(
        (language === 'vi' ? 'Lỗi tạo bài trắc nghiệm: ' : 'Failed to generate quiz: ') +
          (err?.message || (language === 'vi' ? 'Lỗi server' : 'Server error')),
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'vi' ? 'Kiểm tra trắc nghiệm kiến thức' : 'Practice Quizzes & Assessments'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'vi'
              ? 'Các câu hỏi trắc nghiệm được tạo tự động bởi AI dựa trên bài giảng thực tế trên lớp.'
              : 'Multiple-choice questions automatically generated by AI from your class lectures.'}
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setCreateQuizModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>{language === 'vi' ? 'Tạo trắc nghiệm AI' : 'Generate AI Quiz'}</span>
          </button>

          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => {
              setSelectedSubjectFilter(e.target.value);
              setIsSubmitted(false);
              setSelectedAnswers({});
            }}
            className="px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          >
            <option value="all">{language === 'vi' ? 'Tất cả môn học' : 'All Subjects'}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Quiz selector chips */}
      {filteredQuizzes.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
          {filteredQuizzes.map((q) => (
            <button
              key={q.id}
              onClick={() => {
                setActiveQuizId(q.id);
                setIsSubmitted(false);
                setSelectedAnswers({});
              }}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                activeQuiz?.id === q.id
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:bg-slate-100'
              }`}
            >
              {q.title}
            </button>
          ))}
        </div>
      )}

      {!activeQuiz ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <HelpCircle className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">
            {language === 'vi' ? 'Chưa có bài trắc nghiệm nào' : 'No quizzes available yet'}
          </h4>
          <p className="text-xs text-slate-500 mb-4 max-w-sm mx-auto">
            {language === 'vi'
              ? 'Dán nội dung bài học để AI tự động tạo bài trắc nghiệm kiểm tra kiến thức cho bạn ngay!'
              : 'Paste lesson content so AI can automatically generate a practice quiz for you!'}
          </p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => setCreateQuizModalOpen(true)}
              className="px-5 py-2.5 rounded-xl bg-purple-600 text-white font-bold text-xs"
            >
              {language === 'vi' ? 'Tạo bài trắc nghiệm bằng AI' : 'Generate AI Quiz'}
            </button>
            <button
              onClick={() => setActiveTab('recorder')}
              className="px-5 py-2.5 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              {language === 'vi' ? 'Ghi âm bài giảng' : 'Record Lecture'}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Active Quiz Title Card */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="text-[11px] font-black uppercase text-indigo-600 dark:text-indigo-400 mb-1">
                {language === 'vi' ? 'BÀI KIỂM TRA TRẮC NGHIỆM AI' : 'AI PRACTICE QUIZ'}
              </div>
              <h3 className="text-lg font-black text-slate-900 dark:text-white">
                {activeQuiz.title}
              </h3>
              <div className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                {language === 'vi' ? (
                  <>
                    Tổng số: <strong>{activeQuiz.questions.length} câu hỏi</strong> • 4 lựa chọn mỗi câu
                  </>
                ) : (
                  <>
                    Total: <strong>{activeQuiz.questions.length} questions</strong> • 4 options per question
                  </>
                )}
              </div>
            </div>

            {/* Score Result Banner if submitted */}
            {isSubmitted && (
              <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-200 dark:border-indigo-800 text-center sm:text-right">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">
                  {language === 'vi' ? 'Kết quả bài thi' : 'Quiz Score'}
                </div>
                <div className="text-2xl font-black text-indigo-600 dark:text-indigo-400">
                  {score} / {activeQuiz.questions.length}
                </div>
                <div className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400">
                  {Math.round((score / activeQuiz.questions.length) * 100)}%{' '}
                  {language === 'vi' ? 'Chính xác' : 'Accuracy'}
                </div>
              </div>
            )}
          </div>

          {/* Questions List */}
          <div className="space-y-4">
            {activeQuiz.questions.map((q, qIdx) => {
              const selectedOpt = selectedAnswers[qIdx];
              const isCorrect = selectedOpt === q.correctAnswer;

              return (
                <div
                  key={qIdx}
                  className={`p-6 rounded-3xl bg-white dark:bg-slate-900 border transition-all ${
                    isSubmitted
                      ? isCorrect
                        ? 'border-emerald-300 dark:border-emerald-800 bg-emerald-50/20 dark:bg-emerald-950/20'
                        : 'border-rose-300 dark:border-rose-800 bg-rose-50/20 dark:bg-rose-950/20'
                      : 'border-slate-200/80 dark:border-slate-800'
                  }`}
                >
                  <div className="flex items-start gap-3 mb-4">
                    <span className="w-7 h-7 rounded-xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400 text-xs font-black flex items-center justify-center shrink-0">
                      {qIdx + 1}
                    </span>
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white leading-snug">
                      {q.question}
                    </h4>
                  </div>

                  {/* 4 Options */}
                  <div className="space-y-2 pl-10">
                    {q.options.map((opt, optIdx) => {
                      const isSelected = selectedOpt === optIdx;
                      const isOptionCorrect = optIdx === q.correctAnswer;

                      let optClass =
                        'border-slate-200 dark:border-slate-700 bg-slate-50/50 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800';

                      if (isSubmitted) {
                        if (isOptionCorrect) {
                          optClass =
                            'border-emerald-500 bg-emerald-100/70 dark:bg-emerald-950/70 text-emerald-900 dark:text-emerald-200 font-bold';
                        } else if (isSelected && !isOptionCorrect) {
                          optClass =
                            'border-rose-500 bg-rose-100/70 dark:bg-rose-950/70 text-rose-900 dark:text-rose-200 font-bold';
                        }
                      } else if (isSelected) {
                        optClass =
                          'border-indigo-600 bg-indigo-50 dark:bg-indigo-950 text-indigo-900 dark:text-indigo-200 font-bold';
                      }

                      return (
                        <div
                          key={optIdx}
                          onClick={() => handleSelectOption(qIdx, optIdx)}
                          className={`p-3 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-colors ${optClass}`}
                        >
                          <div className="flex items-center gap-3">
                            <span className="font-mono font-bold text-slate-400">
                              {['A', 'B', 'C', 'D'][optIdx]}.
                            </span>
                            <span>{opt}</span>
                          </div>

                          {isSubmitted && isOptionCorrect && (
                            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                          )}
                          {isSubmitted && isSelected && !isOptionCorrect && (
                            <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Detailed Explanation if submitted */}
                  {isSubmitted && (
                    <div className="mt-4 ml-10 p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs">
                      <div className="font-bold text-slate-700 dark:text-slate-300 mb-1 flex items-center gap-1.5">
                        <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
                        <span>
                          {language === 'vi' ? 'Giải thích chi tiết:' : 'Detailed Explanation:'}
                        </span>
                      </div>
                      <p className="text-slate-600 dark:text-slate-400 leading-relaxed">
                        {q.explanation}
                      </p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Submission and Retake Actions */}
          <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
            {isSubmitted ? (
              <>
                <button
                  onClick={handleRetake}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-slate-800 dark:text-slate-200 font-bold text-xs"
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>{language === 'vi' ? 'Làm lại bài kiểm tra' : 'Retake Quiz'}</span>
                </button>

                <button
                  onClick={() => setActiveTab('flashcards')}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20"
                >
                  <Layers className="w-4 h-4" />
                  <span>
                    {language === 'vi'
                      ? 'Ôn tập các câu hỏi qua Flashcard'
                      : 'Review Concepts with Flashcards'}
                  </span>
                </button>
              </>
            ) : (
              <button
                onClick={handleSubmit}
                className="w-full py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-extrabold text-xs shadow-lg shadow-indigo-600/25 transition-transform active:scale-95"
              >
                {language === 'vi'
                  ? 'Nộp bài kiểm tra & Xem đáp án chi tiết'
                  : 'Submit Quiz & View Detailed Answers'}
              </button>
            )}
          </div>
        </div>
      )}

      {/* AI Quiz Creation Modal */}
      <Modal
        isOpen={createQuizModalOpen}
        onClose={() => setCreateQuizModalOpen(false)}
        title={
          language === 'vi'
            ? 'Tạo bài trắc nghiệm tự động bằng AI'
            : 'Generate AI Practice Quiz Automatically'
        }
        maxWidth="md"
      >
        <form onSubmit={handleGenerateAiQuiz} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'vi'
              ? 'Dán nội dung bài học hoặc nhập chủ đề bạn cần kiểm tra. Gemini 3.8 Flash sẽ tự động tạo bộ câu hỏi 4 lựa chọn có đáp án và giải thích chi tiết.'
              : 'Paste lesson notes or enter a topic to test yourself. Gemini 3.8 Flash will generate 4-option multiple-choice questions with answers and detailed explanations.'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Gán vào môn học' : 'Assign to Subject'}
              </label>
              <select
                value={quizSubjectId}
                onChange={(e) => setQuizSubjectId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} ({s.code})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Số lượng câu hỏi' : 'Number of Questions'}
              </label>
              <select
                value={quizQuestionsCount}
                onChange={(e) => setQuizQuestionsCount(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={3}>{language === 'vi' ? '3 câu hỏi ngắn' : '3 quick questions'}</option>
                <option value={4}>
                  {language === 'vi' ? '4 câu hỏi tiêu chuẩn' : '4 standard questions'}
                </option>
                <option value={6}>
                  {language === 'vi' ? '6 câu hỏi mở rộng' : '6 extended questions'}
                </option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi'
                ? 'Nội dung bài học hoặc chủ đề trắc nghiệm'
                : 'Lesson Content or Quiz Topic'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              required
              value={quizTextPrompt}
              onChange={(e) => setQuizTextPrompt(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Dán đoạn tài liệu, ghi chú hoặc nội dung trọng tâm cần ôn tập vào đây...'
                  : 'Paste study material, notes, or key topics to review here...'
              }
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateQuizModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isGenerating || !quizTextPrompt.trim()}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/25 flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating
                  ? language === 'vi'
                    ? 'Gemini AI đang tạo đề thi...'
                    : 'Gemini AI is generating quiz...'
                  : language === 'vi'
                  ? 'Tạo bài trắc nghiệm ngay'
                  : 'Generate Quiz Now'}
              </span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
