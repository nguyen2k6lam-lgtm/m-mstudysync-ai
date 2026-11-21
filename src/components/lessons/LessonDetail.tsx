import React, { useState } from 'react';
import { Lesson, Subject } from '../../types';
import { useApp } from '../../context/AppContext';
import { MindMapViewer } from './MindMapViewer';
import { AudioPlayer } from '../common/AudioPlayer';
import { ConfirmDeleteModal } from '../common/ConfirmDeleteModal';
import { formatDate, formatDuration, formatFileSize, cleanAiResponse } from '../../utils/formatters';
import {
  FileText,
  Sparkles,
  Layers,
  HelpCircle,
  Copy,
  Check,
  Search,
  Edit3,
  Network,
  Share2,
  Bookmark,
  Volume2,
  Calendar,
  AlertTriangle,
  Bot,
  Brain,
  Tag,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { analyzeStoredAudio, analyzeLesson, apiGenerateLessonMindMap, apiDeleteLessonMindMap } from '../../services/api';

interface LessonDetailProps {
  lesson: Lesson;
  subject?: Subject;
}

export const LessonDetail: React.FC<LessonDetailProps> = ({ lesson, subject }) => {
  const {
    currentUser,
    updateLesson,
    deleteLesson,
    showToast,
    setActiveTab,
    setActiveLessonId,
    addFlashcards,
    addQuiz,
    addDeadline,
    setUpgradeModalOpen,
    language,
  } = useApp();

  const [activeTab, setActiveTabLocal] = useState<
    'summary' | 'keypoints' | 'concepts' | 'mindmap' | 'transcript'
  >('summary');

  const [transcriptSearch, setTranscriptSearch] = useState('');
  const [isEditingTranscript, setIsEditingTranscript] = useState(false);
  const [editedTranscript, setEditedTranscript] = useState(lesson.transcript || '');
  const [copied, setCopied] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);

  const [isAnalyzingStored, setIsAnalyzingStored] = useState(false);
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [isGeneratingMindMap, setIsGeneratingMindMap] = useState(false);
  const [mindMapSource, setMindMapSource] = useState<'auto' | 'transcript' | 'summary' | 'custom'>('auto');
  const [customMindMapText, setCustomMindMapText] = useState('');
  const [mindMapError, setMindMapError] = useState<string | null>(null);
  const [mindMapErrorCode, setMindMapErrorCode] = useState<string | null>(null);

  const handleGenerateSummaryFromTranscript = async () => {
    const textToAnalyze = (lesson.transcript || '').trim();
    if (!textToAnalyze) {
      showToast(
        language === 'vi'
          ? 'Bài học này chưa có nội dung phiên âm (transcript) để tạo tóm tắt.'
          : 'This lesson has no transcript to summarize.',
        'warning'
      );
      return;
    }

    setIsGeneratingSummary(true);
    try {
      showToast(
        language === 'vi'
          ? 'AI đang tạo tóm tắt, ý chính, flashcard và câu hỏi ôn tập từ transcript...'
          : 'AI is generating summary, key points, flashcards, and quiz from transcript...',
        'info'
      );
      const res = await analyzeLesson({
        transcript: textToAnalyze,
        title: lesson.title,
        subjectName: subject?.name || 'Môn học',
        initialNotes: lesson.initialNotes,
        lessonId: lesson.id,
        subjectId: lesson.subjectId,
        includeFlashcards: true,
        includeQuiz: true,
        includeMindMap: currentUser?.plan === 'premium',
      });
      const result = res.result;
      updateLesson(lesson.id, {
        summary: cleanAiResponse(result.summary || ''),
        keyPoints: result.keyPoints || [],
        keywords: result.keywords || [],
        concepts: result.concepts || [],
        mindMap: result.mindMap || lesson.mindMap,
        summaryStatus: 'completed',
        analysisStatus: 'completed',
        analyzedAt: new Date().toISOString(),
      });
      if (Array.isArray(result.flashcards) && result.flashcards.length > 0) {
        addFlashcards(
          result.flashcards.map((fc: any, idx: number) => ({
            id: fc.id || `fc_${Date.now()}_${idx}`,
            ownerId: currentUser?.id || '',
            subjectId: lesson.subjectId,
            lessonId: lesson.id,
            front: cleanAiResponse(fc.front),
            back: cleanAiResponse(fc.back),
            example: fc.example ? cleanAiResponse(fc.example) : undefined,
            difficulty: fc.difficulty || 'medium',
            topic: cleanAiResponse(fc.topic || subject?.name || 'Tổng hợp'),
            reviewStatus: 'new' as const,
            correctCount: 0,
            incorrectCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        );
      }
      showToast(
        language === 'vi'
          ? 'Đã tạo tóm tắt và bộ học liệu AI thành công!'
          : 'Generated summary and AI study materials successfully!',
        'success'
      );
    } catch (err: any) {
      showToast(
        err?.message ||
          (language === 'vi'
            ? 'Không thể tạo tóm tắt bài học bằng AI.'
            : 'Could not generate lesson summary with AI.'),
        'error'
      );
    } finally {
      setIsGeneratingSummary(false);
    }
  };

  const handleGenerateMindMap = async () => {
    let textToUse = '';
    if (mindMapSource === 'transcript') {
      textToUse = lesson.transcript || '';
    } else if (mindMapSource === 'summary') {
      textToUse = lesson.summary || '';
    } else if (mindMapSource === 'custom') {
      textToUse = customMindMapText.trim();
    } else {
      textToUse = (lesson.transcript || lesson.summary || customMindMapText).trim();
    }

    if (!textToUse) {
      setMindMapError(
        language === 'vi'
          ? 'Bài học hiện chưa có nội dung văn bản hoặc phiên âm. Vui lòng ghi âm/tải lên nội dung hoặc nhập văn bản bên dưới.'
          : 'This lesson has no text or transcript yet. Please record/upload content or enter text below.'
      );
      showToast(
        language === 'vi'
          ? 'Nội dung bài học rỗng, chưa thể tạo sơ đồ tư duy.'
          : 'Lesson content is empty, cannot generate mind map.',
        'warning'
      );
      return;
    }

    setIsGeneratingMindMap(true);
    setMindMapError(null);
    setMindMapErrorCode(null);
    try {
      showToast(
        language === 'vi'
          ? 'AI đang phân tích kiến thức và trích xuất sơ đồ tư duy...'
          : 'AI is analyzing knowledge and extracting a mind map...',
        'info'
      );
      const res = await apiGenerateLessonMindMap(lesson.id, textToUse);
      if (res.success && res.mindMap) {
        updateLesson(lesson.id, { mindMap: res.mindMap });
        showToast(
          language === 'vi' ? '🎉 Đã tạo sơ đồ tư duy thành công!' : '🎉 Mind map generated successfully!',
          'success'
        );
      }
    } catch (err: any) {
      const code = err?.errorCode || err?.code || null;
      const msg =
        err.message ||
        (language === 'vi' ? 'Lỗi khi tạo sơ đồ tư duy bằng AI.' : 'Failed to generate AI mind map.');
      setMindMapError(msg);
      setMindMapErrorCode(code);
      showToast(msg, 'error');
    } finally {
      setIsGeneratingMindMap(false);
    }
  };

  const handleDeleteMindMap = async () => {
    try {
      await apiDeleteLessonMindMap(lesson.id);
      updateLesson(lesson.id, { mindMap: undefined });
      showToast(
        language === 'vi' ? 'Đã xóa sơ đồ tư duy.' : 'Mind map deleted.',
        'info'
      );
    } catch (err: any) {
      showToast(
        err.message || (language === 'vi' ? 'Lỗi khi xóa sơ đồ tư duy.' : 'Failed to delete mind map.'),
        'error'
      );
    }
  };

  const handleUpdateMindMapNode = (updated: any) => {
    updateLesson(lesson.id, { mindMap: updated });
  };


  const handleAnalyzeStoredAudio = async () => {
    if (isAnalyzingStored) return;
    try {
      setIsAnalyzingStored(true);
      showToast(
        language === 'vi'
          ? 'Đang gửi file âm thanh đã lưu đến AI để phân tích...'
          : 'Sending stored audio file to AI for analysis...',
        'info'
      );
      const res = await analyzeStoredAudio({ lessonId: lesson.id });
      if (res.success) {
        updateLesson(lesson.id, {
          transcript: cleanAiResponse(res.transcript),
          summary: cleanAiResponse(res.summary),
          keyPoints: res.keyPoints,
          keywords: res.keywords,
          exercises: res.exercises,
          transcriptionStatus: 'completed',
          summaryStatus: 'completed',
          analysisStatus: 'completed',
        });

        if (res.flashcards && res.flashcards.length > 0) {
          addFlashcards(
            res.flashcards.map((fc, idx) => ({
              id: `fc_${Date.now()}_${idx}`,
              ownerId: currentUser?.id || lesson.ownerId || '',
              subjectId: lesson.subjectId,
              lessonId: lesson.id,
              front: cleanAiResponse(fc.front),
              back: cleanAiResponse(fc.back),
              difficulty: (fc.difficulty as any) || 'medium',
              topic: cleanAiResponse(subject?.name || (language === 'vi' ? 'Tổng hợp' : 'General')),
              reviewStatus: 'new' as const,
              correctCount: 0,
              incorrectCount: 0,
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
            }))
          );
        }

        if (res.quizQuestions && res.quizQuestions.length > 0) {
          addQuiz({
            id: `quiz_${Date.now()}`,
            ownerId: currentUser?.id || lesson.ownerId || '',
            subjectId: lesson.subjectId,
            lessonId: lesson.id,
            title: cleanAiResponse(
              language === 'vi' ? `Trắc nghiệm: ${lesson.title}` : `Quiz: ${lesson.title}`
            ),
            questions: res.quizQuestions.map((q) => ({
              ...q,
              question: cleanAiResponse(q.question),
              explanation: cleanAiResponse(q.explanation),
              options: (q.options || []).map((o) => cleanAiResponse(o)),
              difficulty: 'medium' as const,
            })),
            difficulty: 'medium',
            createdAt: new Date().toISOString(),
          });
        }

        if (res.deadlines && res.deadlines.length > 0) {
          res.deadlines.forEach((dl) => {
            addDeadline({
              subjectId: lesson.subjectId,
              title: cleanAiResponse(dl.title),
              dueDate: dl.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
              dueTime: '23:59',
              priority: (dl.priority as any) || 'medium',
              status: 'todo',
              type: 'assignment',
              sourceType: 'ai_transcript',
              sourceId: lesson.id,
              sourceText: dl.title,
              aiConfidence: 0.9,
              isAiSuggested: false,
            });
          });
        }

        showToast(
          language === 'vi'
            ? '🎉 Đã phân tích bài giảng thành công!'
            : '🎉 Lecture analyzed successfully!',
          'success'
        );
      }
    } catch (err: any) {
      const isQuota = err?.errorCode === 'AI_QUOTA_EXCEEDED' || err?.isDailyQuota;
      const msg = isQuota
        ? language === 'vi'
          ? 'File đã được lưu thành công. Chỉ bước AI phân tích đang bị tạm dừng do hết hạn mức trong ngày. Bạn có thể thử lại sau khi quota được cấp lại hoặc bật billing.'
          : 'Audio file saved successfully. AI analysis is temporarily paused due to daily quota limits. Please retry after quota resets.'
        : err?.message ||
          (language === 'vi' ? 'Lỗi khi phân tích file ghi âm đã lưu.' : 'Failed to analyze stored audio file.');
      showToast(msg, 'error');
    } finally {
      setIsAnalyzingStored(false);
    }
  };

  const handleCopyTranscript = () => {
    navigator.clipboard.writeText(lesson.transcript || '');
    setCopied(true);
    showToast(
      language === 'vi'
        ? 'Đã sao chép toàn bộ transcript vào clipboard!'
        : 'Copied full transcript to clipboard!',
      'success'
    );
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveTranscript = () => {
    updateLesson(lesson.id, { transcript: editedTranscript });
    setIsEditingTranscript(false);
    showToast(
      language === 'vi' ? 'Đã lưu chỉnh sửa transcript.' : 'Saved transcript edits.',
      'success'
    );
  };

  const handleKeywordClick = (kw: string) => {
    setTranscriptSearch(kw);
    setActiveTabLocal('transcript');
  };

  const handleDeleteLesson = async () => {
    const success = await deleteLesson(lesson.id);
    if (success) {
      setActiveLessonId(null);
    }
  };

  const renderHighlightedTranscript = () => {
    const fullText =
      cleanAiResponse(lesson.transcript) ||
      (language === 'vi'
        ? 'Chưa có nội dung phiên âm cho bài giảng này.'
        : 'No transcript available for this lecture yet.');
    if (!transcriptSearch.trim()) {
      return (
        <p className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-mono">
          {fullText}
        </p>
      );
    }

    const regex = new RegExp(`(${transcriptSearch.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, '\\$&')})`, 'gi');
    const parts = fullText.split(regex);

    return (
      <div className="text-xs text-slate-700 dark:text-slate-300 whitespace-pre-line leading-relaxed font-mono">
        {parts.map((part, i) =>
          regex.test(part) ? (
            <mark key={i} className="bg-amber-200 dark:bg-amber-800 text-slate-900 dark:text-white px-0.5 rounded font-bold">
              {part}
            </mark>
          ) : (
            <span key={i}>{part}</span>
          )
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Lesson Header Card */}
      <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <span
              className="px-2.5 py-1 rounded-lg text-xs font-black text-white"
              style={{ backgroundColor: subject?.color || '#6366F1' }}
            >
              {subject?.code || (language === 'vi' ? 'MÔN HỌC' : 'SUBJECT')}
            </span>
            <span className="text-xs text-slate-400 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              {formatDate(lesson.lessonDate, language)}
            </span>
            {lesson.audioDuration && (
              <span className="text-xs text-slate-400 flex items-center gap-1">
                <Volume2 className="w-3.5 h-3.5 text-indigo-500" />
                {formatDuration(lesson.audioDuration)}
              </span>
            )}
          </div>

          {/* Quick Study Actions & Delete Lesson */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('ai-chat')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-700 dark:text-purple-300 border border-purple-200 dark:border-purple-800 text-xs font-bold hover:bg-purple-100 transition-colors"
            >
              <Bot className="w-3.5 h-3.5 text-purple-600" />
              <span>{language === 'vi' ? 'Hỏi AI về bài này' : 'Ask AI about lesson'}</span>
            </button>
            <button
              onClick={() => setActiveTab('flashcards')}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 text-xs font-bold hover:bg-indigo-100 transition-colors"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>{language === 'vi' ? 'Ôn Flashcard' : 'Review Flashcards'}</span>
            </button>
            <button
              onClick={() => setDeleteModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 border border-rose-200 dark:border-rose-800 text-xs font-bold hover:bg-rose-100 dark:hover:bg-rose-900/40 transition-colors"
              title={language === 'vi' ? 'Xóa bài học này' : 'Delete this lesson'}
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{language === 'vi' ? 'Xóa bài học' : 'Delete Lesson'}</span>
            </button>
          </div>
        </div>

        <h1 className="text-2xl font-black text-slate-900 dark:text-white mb-2 tracking-tight">
          {cleanAiResponse(lesson.title)}
        </h1>
        {lesson.classroom && (
          <div className="text-xs text-slate-500 mb-3">
            {language === 'vi' ? 'Địa điểm: ' : 'Location: '}
            <span className="font-semibold">{lesson.classroom}</span>
          </div>
        )}

        {/* Keywords tags */}
        {lesson.keywords && lesson.keywords.length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap pt-2">
            <Tag className="w-3.5 h-3.5 text-slate-400" />
            {lesson.keywords.map((kw, i) => (
              <button
                key={i}
                onClick={() => handleKeywordClick(kw)}
                className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950/60 hover:text-indigo-600 dark:hover:text-indigo-300 transition-colors"
                title={language === 'vi' ? 'Bấm để tìm trong transcript' : 'Click to search in transcript'}
              >
                #{cleanAiResponse(kw)}
              </button>
            ))}
          </div>
        )}

        {/* Tab Headers */}
        <div className="flex items-center gap-1 mt-6 border-t border-slate-100 dark:border-slate-800 pt-3 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveTabLocal('summary')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'summary'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Tóm tắt thông minh' : 'Smart Summary'}</span>
          </button>

          <button
            onClick={() => setActiveTabLocal('keypoints')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'keypoints'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Bookmark className="w-3.5 h-3.5" />
            <span>
              {language === 'vi' ? 'Ý chính' : 'Key Points'} ({lesson.keyPoints?.length || 0})
            </span>
          </button>

          <button
            onClick={() => setActiveTabLocal('concepts')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'concepts'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Brain className="w-3.5 h-3.5" />
            <span>
              {language === 'vi' ? 'Khái niệm' : 'Concepts'} ({lesson.concepts?.length || 0})
            </span>
          </button>

          <button
            onClick={() => setActiveTabLocal('mindmap')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'mindmap'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <Network className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Sơ đồ tư duy' : 'Mind Map'}</span>
          </button>

          <button
            onClick={() => setActiveTabLocal('transcript')}
            className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
              activeTab === 'transcript'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span>{language === 'vi' ? 'Toàn bộ Transcript' : 'Full Transcript'}</span>
          </button>
        </div>
      </div>

      {/* Persistent Audio Player Section (Plays stored audio or uploaded audio) */}
      {lesson.audioUrl && (
        <div className="p-5 sm:p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-3">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span className="flex items-center gap-2">
              <Volume2 className="w-4 h-4 text-indigo-600" />
              <span>
                {language === 'vi'
                  ? 'Bản ghi âm bài giảng (Lưu trữ máy chủ)'
                  : 'Lecture Recording (Server Storage)'}
              </span>
            </span>
            {lesson.audioDuration && (
              <span className="text-slate-400 font-medium">
                {language === 'vi' ? 'Thời lượng: ' : 'Duration: '}
                {formatDuration(lesson.audioDuration)}
              </span>
            )}
          </div>

          <AudioPlayer
            src={lesson.audioUrl}
            fileName={lesson.title}
            duration={lesson.audioDuration}
            size={lesson.audioSize}
            onDelete={async () => {
              await updateLesson(lesson.id, { audioUrl: undefined, audioFileId: undefined });
              showToast(
                language === 'vi'
                  ? 'Đã xóa file ghi âm khỏi bài học.'
                  : 'Deleted audio file from lesson.',
                'info'
              );
            }}
          />
        </div>
      )}

      {/* AI Quota Notice if transcription or summary was postponed due to 429 */}
      {(lesson.transcriptionStatus === 'quota_exceeded' ||
        lesson.summaryStatus === 'quota_exceeded' ||
        (!lesson.transcript && lesson.audioUrl)) && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs flex items-start gap-3 shadow-xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="flex-1 space-y-1">
            <div className="font-bold text-sm text-amber-950 dark:text-amber-100">
              {language === 'vi' ? 'Trạng thái xử lý AI bài học' : 'Lesson AI Processing Status'}
            </div>
            <p className="leading-relaxed">
              {language === 'vi'
                ? 'File âm thanh đã được lưu thành công trên hệ thống. AI hiện đã hết hạn mức sử dụng trong ngày (HTTP 429 RESOURCE_EXHAUSTED), vì vậy chưa thể chuyển âm thanh thành văn bản hoặc tóm tắt. Bạn vẫn có thể nghe lại audio đầy đủ ở khung phát bên trên và thử lại sau khi quota được cấp lại.'
                : 'Audio file has been saved to the system. AI has reached its daily quota limit (HTTP 429 RESOURCE_EXHAUSTED), so transcription and summary could not be completed yet. You can listen to the full recording above and retry after the quota resets.'}
            </p>
            <div className="pt-1">
              <button
                onClick={handleAnalyzeStoredAudio}
                disabled={isAnalyzingStored}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isAnalyzingStored ? 'animate-spin' : ''}`} />
                <span>
                  {isAnalyzingStored
                    ? language === 'vi'
                      ? 'Đang gửi file đến AI...'
                      : 'Sending file to AI...'
                    : language === 'vi'
                    ? 'Gửi cho AI phân tích lại từ file ghi âm đã lưu'
                    : 'Re-analyze with AI from stored audio file'}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tab 1: Summary */}
      {activeTab === 'summary' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 text-indigo-600 dark:text-indigo-400 font-bold text-xs">
              <Sparkles className="w-4 h-4" />
              <span>
                {language === 'vi'
                  ? 'Bản tóm tắt tự động bởi Mầm Study AI'
                  : 'Automated Summary by Mầm Study AI'}
              </span>
            </div>
            {lesson.transcript && lesson.transcript.trim().length > 0 && (
              <button
                onClick={handleGenerateSummaryFromTranscript}
                disabled={isGeneratingSummary}
                className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingSummary ? 'animate-spin' : ''}`} />
                <span>
                  {isGeneratingSummary
                    ? language === 'vi'
                      ? 'Đang tạo tóm tắt AI...'
                      : 'Generating AI summary...'
                    : lesson.summary
                    ? language === 'vi'
                      ? 'Tóm tắt lại bằng AI'
                      : 'Regenerate AI Summary'
                    : language === 'vi'
                    ? 'Tạo tóm tắt & bài học bằng AI'
                    : 'Generate AI Summary & Lesson'}
                </span>
              </button>
            )}
          </div>

          <p className="text-base text-slate-800 dark:text-slate-200 leading-relaxed whitespace-pre-line font-medium">
            {cleanAiResponse(lesson.summary) ||
              (language === 'vi'
                ? 'Chưa có bản tóm tắt cho bài học này.'
                : 'No summary available for this lesson yet.')}
          </p>

          {/* Initial Notes if present */}
          {lesson.initialNotes && (
            <div className="mt-4 p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/60 text-xs">
              <span className="font-bold text-amber-800 dark:text-amber-300">
                {language === 'vi' ? 'Ghi chú ban đầu: ' : 'Initial notes: '}
              </span>
              <span className="text-amber-900 dark:text-amber-200">{cleanAiResponse(lesson.initialNotes)}</span>
            </div>
          )}
        </div>
      )}

      {/* Tab 2: Key Points */}
      {activeTab === 'keypoints' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {language === 'vi' ? 'Danh sách các ý chính cần ghi nhớ' : 'Key Takeaways to Remember'}
          </h3>

          {!lesson.keyPoints || lesson.keyPoints.length === 0 ? (
            <p className="text-xs text-slate-400">
              {language === 'vi' ? 'Không có ý chính nào được trích xuất.' : 'No key points extracted.'}
            </p>
          ) : (
            <div className="space-y-3">
              {lesson.keyPoints.map((kp, idx) => {
                const isHigh = kp.importance === 'high';
                return (
                  <div
                    key={idx}
                    className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 flex items-start gap-3.5"
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-xs font-black ${
                        isHigh
                          ? 'bg-red-100 text-red-600 dark:bg-red-950/60 dark:text-red-400'
                          : 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/60 dark:text-indigo-400'
                      }`}
                    >
                      {idx + 1}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                          {cleanAiResponse(kp.title)}
                        </h4>
                        {isHigh && (
                          <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase bg-red-100 text-red-700 dark:bg-red-950 dark:text-red-300">
                            {language === 'vi' ? 'Trọng tâm' : 'High Priority'}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 mt-1 leading-relaxed">
                        {cleanAiResponse(kp.content)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Concepts */}
      {activeTab === 'concepts' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <h3 className="text-sm font-bold text-slate-900 dark:text-white">
            {language === 'vi' ? 'Các khái niệm & Định nghĩa chuyên môn' : 'Core Concepts & Definitions'}
          </h3>

          {!lesson.concepts || lesson.concepts.length === 0 ? (
            <p className="text-xs text-slate-400">
              {language === 'vi' ? 'Chưa có khái niệm nào.' : 'No concepts extracted yet.'}
            </p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {lesson.concepts.map((cp, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-extrabold text-sm text-indigo-600 dark:text-indigo-400">
                      {cleanAiResponse(cp.term)}
                    </span>
                    {cp.importance && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-indigo-100 dark:bg-indigo-950/60 text-indigo-700 dark:text-indigo-300">
                        {cp.importance}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
                    {cleanAiResponse(cp.definition)}
                  </p>
                  {cp.example && (
                    <div className="p-2.5 rounded-xl bg-white dark:bg-slate-800 text-[11px] text-slate-600 dark:text-slate-400 font-mono">
                      <strong>{language === 'vi' ? 'Ví dụ: ' : 'Example: '}</strong>
                      {cleanAiResponse(cp.example)}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 4: Mind Map */}
      {activeTab === 'mindmap' && (
        <div className="space-y-4">
          {lesson.mindMap ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'vi'
                    ? 'Sơ đồ tư duy được lưu trữ trong cơ sở dữ liệu của bài học này.'
                    : 'Mind map is stored in the database for this lesson.'}
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleGenerateMindMap}
                    disabled={isGeneratingMindMap}
                    className="px-3 py-1.5 rounded-xl border border-indigo-200 dark:border-indigo-800 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/40 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isGeneratingMindMap ? 'animate-spin' : ''}`} />
                    <span>
                      {isGeneratingMindMap
                        ? language === 'vi'
                          ? 'Đang tạo lại...'
                          : 'Regenerating...'
                        : language === 'vi'
                        ? 'Tạo lại bằng AI'
                        : 'Regenerate with AI'}
                    </span>
                  </button>
                  <button
                    onClick={handleDeleteMindMap}
                    className="px-3 py-1.5 rounded-xl border border-rose-200 dark:border-rose-900/40 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 text-xs font-bold flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>{language === 'vi' ? 'Xóa sơ đồ' : 'Delete Mind Map'}</span>
                  </button>
                </div>
              </div>

              <MindMapViewer
                node={lesson.mindMap}
                onUpdateMindMap={handleUpdateMindMapNode}
                onRegenerate={handleGenerateMindMap}
                isRegenerating={isGeneratingMindMap}
              />
            </div>
          ) : (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-6">
              <div className="max-w-md mx-auto text-center space-y-3">
                <div className="w-14 h-14 mx-auto rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Network className="w-7 h-7" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  {language === 'vi'
                    ? 'Tạo Sơ Đồ Tư Duy (Mind Map) bằng AI'
                    : 'Generate AI Mind Map'}
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {language === 'vi'
                    ? 'AI sẽ tự động đọc nội dung bài học, bóc tách các ý chính, khái niệm và cấu trúc phân cấp logic dạng cây.'
                    : 'AI will automatically read the lesson content, extract key points, concepts, and build a logical hierarchical tree.'}
                </p>
              </div>

              {/* Source Selector */}
              <div className="max-w-xl mx-auto space-y-3">
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                  {language === 'vi' ? 'Chọn nguồn dữ liệu tạo sơ đồ:' : 'Select mind map data source:'}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMindMapSource('auto')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                      mindMapSource === 'auto'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {language === 'vi' ? 'Tự động (Khuyên dùng)' : 'Auto (Recommended)'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMindMapSource('transcript')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                      mindMapSource === 'transcript'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {language === 'vi' ? 'Transcript bài giảng' : 'Lecture Transcript'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setMindMapSource('custom')}
                    className={`p-2.5 rounded-xl border text-center text-xs font-semibold transition-all ${
                      mindMapSource === 'custom'
                        ? 'border-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-300'
                        : 'border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400'
                    }`}
                  >
                    {language === 'vi' ? 'Nhập nội dung riêng' : 'Custom Text'}
                  </button>
                </div>

                {mindMapSource === 'custom' && (
                  <div>
                    <textarea
                      rows={4}
                      value={customMindMapText}
                      onChange={(e) => setCustomMindMapText(e.target.value)}
                      placeholder={
                        language === 'vi'
                          ? 'Dán nội dung bài học, tài liệu hoặc ghi chú của bạn vào đây...'
                          : 'Paste your lesson content, study material, or notes here...'
                      }
                      className="w-full p-3 rounded-xl border border-slate-300 dark:border-slate-700 bg-slate-50 dark:bg-slate-800 text-slate-900 dark:text-white text-xs outline-none focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                )}

                {/* Error Banner */}
                {mindMapError && (
                  <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-xs text-rose-700 dark:text-rose-300 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                      <span>{mindMapError}</span>
                    </div>
                    {mindMapErrorCode === 'PREMIUM_REQUIRED' && (
                      <button
                        type="button"
                        onClick={() => setUpgradeModalOpen(true)}
                        className="px-3.5 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shrink-0 transition-colors"
                      >
                        {language === 'vi' ? 'Nâng cấp Premium' : 'Upgrade to Premium'}
                      </button>
                    )}
                  </div>
                )}

                {/* Action button */}
                <div className="pt-2 text-center">
                  <button
                    onClick={handleGenerateMindMap}
                    disabled={isGeneratingMindMap}
                    className="px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white font-bold text-xs shadow-lg shadow-indigo-600/25 transition-all inline-flex items-center gap-2"
                  >
                    {isGeneratingMindMap ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>
                          {language === 'vi' ? 'AI đang tạo sơ đồ tư duy...' : 'AI is generating mind map...'}
                        </span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4" />
                        <span>{language === 'vi' ? 'Tạo sơ đồ tư duy ngay' : 'Generate Mind Map Now'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Tab 5: Transcript with search & edit */}
      {activeTab === 'transcript' && (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 dark:border-slate-800 pb-3">
            {/* Search Input inside transcript */}
            <div className="relative max-w-xs w-full">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={transcriptSearch}
                onChange={(e) => setTranscriptSearch(e.target.value)}
                placeholder={
                  language === 'vi' ? 'Tìm từ khóa trong transcript...' : 'Search keywords in transcript...'
                }
                className="w-full pl-9 pr-3 py-1.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white"
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopyTranscript}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                <span>
                  {copied
                    ? language === 'vi'
                      ? 'Đã sao chép'
                      : 'Copied'
                    : language === 'vi'
                    ? 'Sao chép văn bản'
                    : 'Copy Text'}
                </span>
              </button>

              <button
                onClick={() => {
                  if (isEditingTranscript) {
                    handleSaveTranscript();
                  } else {
                    setEditedTranscript(lesson.transcript || '');
                    setIsEditingTranscript(true);
                  }
                }}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-100"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>
                  {isEditingTranscript
                    ? language === 'vi'
                      ? 'Lưu chỉnh sửa'
                      : 'Save Changes'
                    : language === 'vi'
                    ? 'Chỉnh sửa'
                    : 'Edit'}
                </span>
              </button>
            </div>
          </div>

          {isEditingTranscript ? (
            <textarea
              rows={12}
              value={editedTranscript}
              onChange={(e) => setEditedTranscript(e.target.value)}
              className="w-full p-4 rounded-xl border border-indigo-300 dark:border-indigo-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-xs font-mono leading-relaxed resize-y focus:outline-hidden"
            />
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800 border border-slate-200/80 dark:border-slate-700 max-h-[500px] overflow-y-auto">
              {renderHighlightedTranscript()}
            </div>
          )}
        </div>
      )}

      {/* Confirm Delete Lesson Modal */}
      <ConfirmDeleteModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDeleteLesson}
        title={language === 'vi' ? 'Xác nhận xóa bài học' : 'Confirm Delete Lesson'}
        message={
          language === 'vi'
            ? 'Bạn có chắc chắn muốn xóa bài học này không? Hành động này không thể hoàn tác.'
            : 'Are you sure you want to delete this lesson? This action cannot be undone.'
        }
        warningNote={
          language === 'vi'
            ? 'Bản ghi âm bài giảng, các thẻ flashcard và câu hỏi trắc nghiệm thuộc bài học này cũng sẽ bị xóa khỏi hệ thống.'
            : 'The lecture recording, flashcards, and quiz questions linked to this lesson will also be removed.'
        }
        itemTitle={lesson.title}
        confirmText={language === 'vi' ? 'Xóa bài học' : 'Delete Lesson'}
        cancelText={language === 'vi' ? 'Hủy' : 'Cancel'}
      />
    </div>
  );
};
