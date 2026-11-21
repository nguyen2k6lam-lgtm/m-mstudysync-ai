import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Flashcard } from '../../types';
import { Modal } from '../common/Modal';
import { generateFlashcards } from '../../services/api';
import {
  Layers,
  Check,
  X,
  RotateCw,
  Shuffle,
  Filter,
  Plus,
  Trash2,
  Sparkles,
  BookOpen,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';

interface FlashcardDeckProps {
  filterSubjectId?: string;
}

export const FlashcardDeck: React.FC<FlashcardDeckProps> = ({ filterSubjectId }) => {
  const {
    currentUser,
    flashcards,
    subjects,
    activeSubjectId,
    reviewFlashcard,
    addFlashcards,
    deleteFlashcard,
    incrementAiUsage,
    showToast,
    language,
  } = useApp();

  const [selectedSubjectFilter, setSelectedSubjectFilter] = useState<string>(
    filterSubjectId || activeSubjectId || 'all'
  );
  const [selectedDifficulty, setSelectedDifficulty] = useState<string>('all');
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Manual create modal state
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [frontText, setFrontText] = useState('');
  const [backText, setBackText] = useState('');
  const [exampleText, setExampleText] = useState('');
  const [difficultyVal, setDifficultyVal] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [topicVal, setTopicVal] = useState('');

  // AI Flashcard Generator Modal state
  const [aiModalOpen, setAiModalOpen] = useState(false);
  const [aiTextPrompt, setAiTextPrompt] = useState('');
  const [aiSubjectId, setAiSubjectId] = useState(subjects[0]?.id || '');
  const [aiCount, setAiCount] = useState(5);
  const [isGenerating, setIsGenerating] = useState(false);

  // Filter cards
  let filtered = flashcards.filter((fc) => {
    if (selectedSubjectFilter !== 'all' && fc.subjectId !== selectedSubjectFilter) return false;
    if (selectedDifficulty !== 'all' && fc.difficulty !== selectedDifficulty) return false;
    return true;
  });

  const currentCard = filtered[currentIndex] || null;

  const handleNext = () => {
    setIsFlipped(false);
    if (currentIndex < filtered.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0); // Loop back
    }
  };

  const handleKnown = () => {
    if (!currentCard) return;
    reviewFlashcard(currentCard.id, true);
    showToast(
      language === 'vi'
        ? 'Tuyệt vời! Đã ghi nhận nhớ từ khóa.'
        : 'Awesome! Marked card as remembered.',
      'success'
    );
    handleNext();
  };

  const handleUnknown = () => {
    if (!currentCard) return;
    reviewFlashcard(currentCard.id, false);
    showToast(
      language === 'vi'
        ? 'Đã lưu để ưu tiên ôn tập lại sớm.'
        : 'Saved for priority review soon.',
      'info'
    );
    handleNext();
  };

  const handleShuffle = () => {
    setIsFlipped(false);
    setCurrentIndex(0);
    showToast(
      language === 'vi' ? 'Đã xáo trộn thứ tự các thẻ!' : 'Shuffled flashcard deck!',
      'info'
    );
  };

  // Retention stats
  const totalMastered = filtered.filter((f) => f.reviewStatus === 'mastered').length;
  const memoryRate = filtered.length > 0 ? Math.round((totalMastered / filtered.length) * 100) : 0;

  const handleCreateCard = (e: React.FormEvent) => {
    e.preventDefault();
    if (!frontText.trim() || !backText.trim()) {
      showToast(
        language === 'vi'
          ? 'Mặt trước và mặt sau không được để trống'
          : 'Front and back sides cannot be empty',
        'error'
      );
      return;
    }

    const subId = selectedSubjectFilter !== 'all' ? selectedSubjectFilter : (subjects[0]?.id || 'sub_gen');
    const newCard: Flashcard = {
      id: `fc_manual_${Date.now()}`,
      ownerId: currentUser?.id || '',
      subjectId: subId,
      front: frontText.trim(),
      back: backText.trim(),
      example: exampleText.trim() || undefined,
      difficulty: difficultyVal,
      topic: topicVal.trim() || (language === 'vi' ? 'Tổng hợp' : 'General'),
      reviewStatus: 'new',
      correctCount: 0,
      incorrectCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    addFlashcards([newCard]);
    setCreateModalOpen(false);
    setFrontText('');
    setBackText('');
    setExampleText('');
  };

  const handleGenerateAiFlashcards = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiTextPrompt.trim()) {
      showToast(
        language === 'vi'
          ? 'Vui lòng nhập nội dung tài liệu hoặc chủ đề!'
          : 'Please enter study material content or topic!',
        'error'
      );
      return;
    }

    setIsGenerating(true);
    try {
      const subject = subjects.find((s) => s.id === aiSubjectId);
      const res = await generateFlashcards({
        text: aiTextPrompt,
        subjectId: aiSubjectId,
        subjectName: subject?.name || (language === 'vi' ? 'Môn học' : 'Subject'),
        count: aiCount,
      });

      const cardsToSave: Flashcard[] = (res.flashcards || []).map((c, i) => ({
        id: (c as any).id || `fc_ai_${Date.now()}_${i}`,
        ownerId: currentUser?.id || '',
        subjectId: aiSubjectId,
        front: c.front || (language === 'vi' ? 'Câu hỏi?' : 'Question?'),
        back: c.back || (language === 'vi' ? 'Câu trả lời.' : 'Answer.'),
        example: c.example,
        difficulty: (c.difficulty as any) || 'medium',
        topic: c.topic || subject?.name || (language === 'vi' ? 'Tổng hợp' : 'General'),
        reviewStatus: 'new',
        correctCount: 0,
        incorrectCount: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }));

      addFlashcards(cardsToSave);
      setSelectedSubjectFilter(aiSubjectId);
      setCurrentIndex(0);
      setIsFlipped(false);
      incrementAiUsage(1);
      setAiModalOpen(false);
      setAiTextPrompt('');
      showToast(
        language === 'vi'
          ? `🎉 Đã tạo thành công ${cardsToSave.length} flashcard bằng Gemini AI!`
          : `🎉 Successfully generated ${cardsToSave.length} flashcards with Gemini AI!`,
        'success'
      );
    } catch (err: any) {
      console.error(err);
      showToast(
        (language === 'vi' ? 'Lỗi khi tạo flashcard bằng AI: ' : 'Failed to generate AI flashcards: ') +
          (err?.message || (language === 'vi' ? 'Lỗi server' : 'Server error')),
        'error'
      );
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
              {language === 'vi' ? 'Ôn tập Flashcard' : 'Flashcard Review'}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-black bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              {filtered.length} {language === 'vi' ? 'thẻ' : 'cards'}
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            {language === 'vi'
              ? 'Áp dụng thuật toán lặp lại ngắt quãng (Spaced Repetition) giúp nhớ bài nhanh gấp 3 lần.'
              : 'Uses Spaced Repetition algorithms to help you retain concepts 3x faster.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setAiModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 active:scale-95 transition-all"
          >
            <Sparkles className="w-4 h-4 text-purple-200" />
            <span>{language === 'vi' ? 'Tạo Flashcard bằng AI' : 'Generate AI Flashcards'}</span>
          </button>

          <button
            onClick={() => setCreateModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs shadow-md shadow-indigo-600/20 active:scale-95 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>{language === 'vi' ? 'Thêm thủ công' : 'Add Manually'}</span>
          </button>
        </div>
      </div>

      {/* Filter and stats row */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800">
        <div className="flex items-center gap-2">
          {/* Subject Filter */}
          <select
            value={selectedSubjectFilter}
            onChange={(e) => {
              setSelectedSubjectFilter(e.target.value);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          >
            <option value="all">{language === 'vi' ? 'Tất cả môn học' : 'All Subjects'}</option>
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>

          {/* Difficulty Filter */}
          <select
            value={selectedDifficulty}
            onChange={(e) => {
              setSelectedDifficulty(e.target.value);
              setCurrentIndex(0);
              setIsFlipped(false);
            }}
            className="px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-800 dark:text-white"
          >
            <option value="all">{language === 'vi' ? 'Mọi độ khó' : 'All Difficulties'}</option>
            <option value="easy">{language === 'vi' ? 'Dễ' : 'Easy'}</option>
            <option value="medium">{language === 'vi' ? 'Trung bình' : 'Medium'}</option>
            <option value="hard">{language === 'vi' ? 'Khó' : 'Hard'}</option>
          </select>

          <button
            onClick={handleShuffle}
            className="p-1.5 rounded-xl text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800"
            title={language === 'vi' ? 'Xáo trộn ngẫu nhiên' : 'Shuffle cards'}
          >
            <Shuffle className="w-4 h-4" />
          </button>
        </div>

        {/* Retention Tracker */}
        <div className="flex items-center gap-3 text-xs">
          <span className="text-slate-400">{language === 'vi' ? 'Tỷ lệ nhớ:' : 'Retention:'}</span>
          <span className="font-extrabold text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            {memoryRate}% ({totalMastered}/{filtered.length}{' '}
            {language === 'vi' ? 'đã thuộc' : 'mastered'})
          </span>
        </div>
      </div>

      {/* Main Flashcard Interactive Area */}
      {filtered.length === 0 ? (
        <div className="p-12 text-center rounded-3xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
          <Layers className="w-12 h-12 text-slate-400 mx-auto mb-3" />
          <h4 className="text-base font-bold text-slate-800 dark:text-white mb-1">
            {language === 'vi' ? 'Chưa có Flashcard nào phù hợp' : 'No matching flashcards found'}
          </h4>
          <p className="text-xs text-slate-500 mb-4">
            {language === 'vi'
              ? 'Hãy phân tích bài giảng mới hoặc tạo flashcard thủ công bằng nút bên trên.'
              : 'Analyze a new lecture or create flashcards manually using the buttons above.'}
          </p>
          <button
            onClick={() => setCreateModalOpen(true)}
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold"
          >
            {language === 'vi' ? 'Tạo thẻ thủ công ngay' : 'Create Flashcard Now'}
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {/* Card Counter & Topic */}
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 px-2">
            <span>
              {language === 'vi' ? 'Thẻ' : 'Card'} {currentIndex + 1} / {filtered.length}
            </span>
            <span className="px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
              {currentCard?.topic}
            </span>
          </div>

          {/* 3D Flip Card Container */}
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className="perspective-1000 w-full min-h-[320px] sm:min-h-[360px] cursor-pointer select-none"
          >
            <div
              className={`relative w-full h-full min-h-[320px] sm:min-h-[360px] rounded-3xl transition-transform duration-500 transform-style-3d shadow-xl ${
                isFlipped ? 'rotate-y-180' : ''
              }`}
            >
              {/* FRONT SIDE */}
              <div className="absolute inset-0 backface-hidden p-8 rounded-3xl bg-linear-to-b from-white to-slate-50 dark:from-slate-900 dark:to-slate-950 border-2 border-indigo-200 dark:border-indigo-900/60 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 dark:text-indigo-400">
                    {language === 'vi'
                      ? 'MẶT TRƯỚC (CÂU HỎI / THUẬT NGỮ)'
                      : 'FRONT (QUESTION / TERM)'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 capitalize">
                    {currentCard?.difficulty === 'easy'
                      ? language === 'vi'
                        ? 'Dễ'
                        : 'Easy'
                      : currentCard?.difficulty === 'hard'
                      ? language === 'vi'
                        ? 'Khó'
                        : 'Hard'
                      : language === 'vi'
                      ? 'Trung bình'
                      : 'Medium'}
                  </span>
                </div>

                <div className="text-center py-6">
                  <h3 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white leading-snug">
                    {currentCard?.front}
                  </h3>
                </div>

                <div className="text-center text-xs font-bold text-indigo-600 dark:text-indigo-400 flex items-center justify-center gap-1.5 opacity-80">
                  <RotateCw className="w-3.5 h-3.5 animate-spin" />
                  <span>
                    {language === 'vi'
                      ? 'Nhấn vào thẻ để xem đáp án'
                      : 'Click card to flip for answer'}
                  </span>
                </div>
              </div>

              {/* BACK SIDE */}
              <div className="absolute inset-0 backface-hidden rotate-y-180 p-8 rounded-3xl bg-linear-to-b from-indigo-900 via-indigo-950 to-slate-950 text-white border-2 border-indigo-500 flex flex-col justify-between">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-black uppercase tracking-wider text-indigo-300">
                    {language === 'vi'
                      ? 'MẶT SAU (ĐÁP ÁN & ĐỊNH NGHĨA)'
                      : 'BACK (ANSWER & DEFINITION)'}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-white/10 text-white">
                    {language === 'vi'
                      ? `Đã nhớ đúng ${currentCard?.correctCount || 0} lần`
                      : `Recalled ${currentCard?.correctCount || 0} times`}
                  </span>
                </div>

                <div className="text-center py-4 space-y-3">
                  <p className="text-base sm:text-lg font-bold leading-relaxed text-indigo-50">
                    {currentCard?.back}
                  </p>
                  {currentCard?.example && (
                    <div className="p-3 rounded-xl bg-white/10 text-xs font-mono text-indigo-200 max-w-lg mx-auto">
                      <strong>{language === 'vi' ? 'Ví dụ: ' : 'Example: '}</strong>
                      {currentCard.example}
                    </div>
                  )}
                </div>

                <div className="text-center text-xs text-indigo-300 font-semibold">
                  {language === 'vi'
                    ? 'Nhấn lần nữa để lật lại mặt trước'
                    : 'Click again to flip back'}
                </div>
              </div>
            </div>
          </div>

          {/* Action Control Buttons */}
          <div className="flex items-center justify-center gap-4">
            <button
              onClick={handleUnknown}
              className="inline-flex items-center gap-2 px-5 py-3 rounded-2xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 font-bold text-xs hover:bg-rose-100 transition-transform active:scale-95"
            >
              <X className="w-4 h-4" />
              <span>{language === 'vi' ? 'Chưa nhớ (Ôn lại)' : 'Need Review'}</span>
            </button>

            <button
              onClick={handleNext}
              className="px-4 py-3 rounded-2xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-bold text-xs hover:bg-slate-200"
            >
              {language === 'vi' ? 'Bỏ qua' : 'Skip'}
            </button>

            <button
              onClick={handleKnown}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-lg shadow-emerald-600/25 transition-transform active:scale-95"
            >
              <Check className="w-4 h-4" />
              <span>{language === 'vi' ? 'Biết rồi (Thuộc)' : 'Got It (Mastered)'}</span>
            </button>
          </div>
        </div>
      )}

      {/* Create Manual Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title={language === 'vi' ? 'Thêm Flashcard thủ công' : 'Create Flashcard Manually'}
        maxWidth="md"
      >
        <form onSubmit={handleCreateCard} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi'
                ? 'Mặt trước (Câu hỏi hoặc Thuật ngữ)'
                : 'Front Side (Question or Term)'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={frontText}
              onChange={(e) => setFrontText(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Ví dụ: Referential Equality là gì?'
                  : 'e.g., What is Referential Equality?'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi'
                ? 'Mặt sau (Câu trả lời hoặc Định nghĩa)'
                : 'Back Side (Answer or Definition)'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={3}
              required
              value={backText}
              onChange={(e) => setBackText(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Giải thích chi tiết ngắn gọn...'
                  : 'Concise explanation or definition...'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi' ? 'Ví dụ thực tế (tùy chọn)' : 'Practical Example (optional)'}
            </label>
            <input
              type="text"
              value={exampleText}
              onChange={(e) => setExampleText(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Ví dụ minh họa cách dùng...'
                  : 'Illustrative example of usage...'
              }
              className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Độ khó' : 'Difficulty'}
              </label>
              <select
                value={difficultyVal}
                onChange={(e) => setDifficultyVal(e.target.value as any)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value="easy">{language === 'vi' ? 'Dễ' : 'Easy'}</option>
                <option value="medium">{language === 'vi' ? 'Trung bình' : 'Medium'}</option>
                <option value="hard">{language === 'vi' ? 'Khó' : 'Hard'}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Chủ đề' : 'Topic'}
              </label>
              <input
                type="text"
                value={topicVal}
                onChange={(e) => setTopicVal(e.target.value)}
                placeholder={language === 'vi' ? 'Ví dụ: React Hooks' : 'e.g., React Hooks'}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold text-xs"
            >
              {language === 'vi' ? 'Lưu thẻ mới' : 'Save Card'}
            </button>
          </div>
        </form>
      </Modal>

      {/* AI Flashcard Generation Modal */}
      <Modal
        isOpen={aiModalOpen}
        onClose={() => setAiModalOpen(false)}
        title={
          language === 'vi'
            ? 'Tạo bộ Flashcard tự động bằng AI'
            : 'Generate AI Flashcards Automatically'
        }
        maxWidth="md"
      >
        <form onSubmit={handleGenerateAiFlashcards} className="space-y-4">
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {language === 'vi'
              ? 'Dán nội dung giáo trình, bài giảng hoặc thuật ngữ. Gemini AI sẽ tự động phân tích và tạo bộ câu hỏi & đáp án kèm ví dụ.'
              : 'Paste your syllabus, lecture notes, or terms. Gemini AI will analyze the text and generate Q&A flashcards with examples.'}
          </p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Gán vào môn học' : 'Assign to Subject'}
              </label>
              <select
                value={aiSubjectId}
                onChange={(e) => setAiSubjectId(e.target.value)}
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
                {language === 'vi' ? 'Số lượng thẻ cần tạo' : 'Number of Cards'}
              </label>
              <select
                value={aiCount}
                onChange={(e) => setAiCount(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              >
                <option value={3}>{language === 'vi' ? '3 thẻ tóm tắt' : '3 summary cards'}</option>
                <option value={5}>{language === 'vi' ? '5 thẻ tiêu chuẩn' : '5 standard cards'}</option>
                <option value={8}>{language === 'vi' ? '8 thẻ chuyên sâu' : '8 in-depth cards'}</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              {language === 'vi'
                ? 'Nội dung tài liệu hoặc chủ đề'
                : 'Study Content or Topic'}{' '}
              <span className="text-red-500">*</span>
            </label>
            <textarea
              rows={5}
              required
              value={aiTextPrompt}
              onChange={(e) => setAiTextPrompt(e.target.value)}
              placeholder={
                language === 'vi'
                  ? 'Dán các định nghĩa, đoạn bài giảng hoặc ghi chú cần học thuộc vào đây...'
                  : 'Paste definitions, lecture excerpts, or notes to memorize here...'
              }
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y font-mono"
            />
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            <button
              type="button"
              onClick={() => setAiModalOpen(false)}
              className="px-4 py-2 text-xs font-bold text-slate-500 rounded-xl"
            >
              {language === 'vi' ? 'Hủy' : 'Cancel'}
            </button>
            <button
              type="submit"
              disabled={isGenerating || !aiTextPrompt.trim()}
              className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs shadow-md shadow-purple-600/20 flex items-center gap-2 disabled:opacity-50"
            >
              <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
              <span>
                {isGenerating
                  ? language === 'vi'
                    ? 'AI đang tạo Flashcard...'
                    : 'AI is generating flashcards...'
                  : language === 'vi'
                  ? 'Tạo Flashcard ngay'
                  : 'Generate Flashcards Now'}
              </span>
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
