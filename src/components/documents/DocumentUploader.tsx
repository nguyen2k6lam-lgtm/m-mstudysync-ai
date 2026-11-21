import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import {
  uploadDocumentFile,
  extractDocumentText,
  getDocumentSummary,
  generateFlashcards,
  generateQuiz,
  extractDeadlines,
  getDocumentList,
  deleteDocumentFile,
} from '../../services/api';
import { formatFileSize, cleanAiResponse } from '../../utils/formatters';
import { DocumentItem } from '../../types';
import {
  FileUp,
  FileText,
  Sparkles,
  AlertCircle,
  AlertTriangle,
  CheckCircle2,
  Clock,
  ArrowRight,
  BookOpen,
  MessageSquare,
  Trash2,
  RefreshCw,
  FolderOpen,
  Layers,
  HelpCircle,
  CalendarCheck,
  Copy,
  Check,
  X,
  ExternalLink,
} from 'lucide-react';

interface QuotaErrorInfo {
  message: string;
  retryAfter?: string;
  canRetry: boolean;
  isDailyQuota: boolean;
}

export const DocumentUploader: React.FC = () => {
  const {
    currentUser,
    subjects,
    activeSubjectId,
    setActiveSubjectId,
    documents,
    addDocument,
    updateDocument,
    deleteDocument,
    addLesson,
    addFlashcards,
    addQuiz,
    addDeadline,
    incrementAiUsage,
    showToast,
    setActiveLessonId,
    setActiveTab,
    language,
  } = useApp();

  const [selectedSubjectId, setSelectedSubjectId] = useState(
    activeSubjectId || (subjects[0]?.id || '')
  );
  const [docTitle, setDocTitle] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [extractedText, setExtractedText] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [progressStep, setProgressStep] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quotaError, setQuotaError] = useState<QuotaErrorInfo | null>(null);
  const [activeDocTab, setActiveDocTab] = useState<'upload' | 'list'>('upload');
  const [summarizingDocId, setSummarizingDocId] = useState<string | null>(null);
  const [selectedDocForSummary, setSelectedDocForSummary] = useState<DocumentItem | null>(null);
  const [copiedSummary, setCopiedSummary] = useState(false);

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Sync server documents on mount or when subject changes
  useEffect(() => {
    getDocumentList(selectedSubjectId)
      .then((res) => {
        if (res.success && Array.isArray(res.documents)) {
          res.documents.forEach((d) => {
            const existing = documents.find((exist) => exist.id === d.id);
            if (!existing) {
              addDocument({
                id: d.id,
                ownerId: d.ownerId,
                subjectId: d.subjectId,
                lessonId: d.lessonId,
                fileName: d.fileName,
                fileUrl: d.fileUrl,
                fileType: d.fileType,
                fileSize: d.fileSize,
                extractedText: d.extractedText,
                summary: d.summary,
                keyTakeaways: d.keyTakeaways,
                summaryStatus: d.summaryStatus || (d.summary ? 'completed' : 'pending'),
                summaryCreatedAt: d.summaryCreatedAt,
                summaryModel: d.summaryModel,
                summaryError: d.summaryError,
                status:
                  d.processingStatus === 'completed'
                    ? 'ready'
                    : d.processingStatus === 'failed'
                    ? 'error'
                    : 'processing',
                createdAt: d.createdAt,
              });
            } else if (d.summary && !existing.summary) {
              updateDocument(d.id, {
                summary: d.summary,
                keyTakeaways: d.keyTakeaways,
                summaryStatus: 'completed',
                summaryCreatedAt: d.summaryCreatedAt,
              });
            }
          });
        }
      })
      .catch(() => {});
  }, [selectedSubjectId]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = e.target.files?.[0];
    if (!selected) return;

    setErrorMessage(null);
    setQuotaError(null);

    if (selected.size === 0) {
      const msg =
        language === 'vi'
          ? 'File tài liệu rỗng (0 bytes). Vui lòng chọn file hợp lệ.'
          : 'Document file is empty (0 bytes). Please choose a valid file.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    if (selected.size > 25 * 1024 * 1024) {
      const msg =
        language === 'vi'
          ? 'Dung lượng file vượt quá giới hạn 25MB.'
          : 'File size exceeds the 25MB limit.';
      setErrorMessage(msg);
      showToast(msg, 'error');
      return;
    }

    setFile(selected);
    if (!docTitle) {
      setDocTitle(selected.name.replace(/\.[^/.]+$/, ''));
    }
  };

  const handleUploadAndAnalyze = async () => {
    if (isProcessing) return;

    const effectiveSubjectId = selectedSubjectId || subjects[0]?.id || 'sub_web_01';

    if (!file && !extractedText.trim()) {
      showToast(
        language === 'vi'
          ? 'Vui lòng chọn file tài liệu hoặc dán nội dung văn bản!'
          : 'Please select a document file or paste text content!',
        'error'
      );
      return;
    }

    setIsProcessing(true);
    setErrorMessage(null);
    setQuotaError(null);

    const subject = subjects.find((s) => s.id === effectiveSubjectId);
    const title =
      docTitle.trim() ||
      file?.name ||
      (language === 'vi' ? 'Tài liệu môn học' : 'Course Material');
    let finalExtractedText = extractedText.trim();
    let serverDocId = `doc_${Date.now()}`;

    try {
      if (file) {
        setProgressStep(
          language === 'vi' ? 'Đang tải file lên máy chủ...' : 'Uploading file to server...'
        );
        await new Promise((r) => setTimeout(r, 250));

        setProgressStep(
          language === 'vi'
            ? 'Đang lưu file vào hệ thống lưu trữ...'
            : 'Saving file to storage system...'
        );
        const uploadRes = await uploadDocumentFile({
          file,
          subjectId: selectedSubjectId,
        });

        serverDocId = uploadRes.documentId;
        finalExtractedText = uploadRes.extractedText || '';

        setProgressStep(
          language === 'vi'
            ? 'Đang trích xuất nội dung văn bản từ tài liệu...'
            : 'Extracting text content from document...'
        );
        await new Promise((r) => setTimeout(r, 300));

        if (!finalExtractedText || finalExtractedText.trim().length === 0) {
          setIsProcessing(false);
          const failMsg =
            uploadRes.message ||
            (language === 'vi'
              ? 'File đã tải lên nhưng chưa trích xuất được nội dung văn bản.'
              : 'File uploaded, but no text content could be extracted.');
          setErrorMessage(failMsg);
          showToast(failMsg, 'error');

          addDocument({
            id: serverDocId,
            ownerId: currentUser?.id || '',
            subjectId: selectedSubjectId,
            fileName: file.name,
            fileUrl: `/api/documents/${serverDocId}/download`,
            fileType: file.type || 'application/pdf',
            fileSize: file.size,
            extractedText: '',
            status: 'error',
            summaryStatus: 'failed',
            summaryError: failMsg,
            createdAt: new Date().toISOString(),
          });
          return;
        }

        setExtractedText(finalExtractedText);

        addDocument({
          id: serverDocId,
          ownerId: currentUser?.id || '',
          subjectId: selectedSubjectId,
          fileName: file.name,
          fileUrl: `/api/documents/${serverDocId}/download`,
          fileType: file.type || 'application/pdf',
          fileSize: file.size,
          extractedText: finalExtractedText,
          status: 'ready',
          summaryStatus: 'processing',
          createdAt: new Date().toISOString(),
        });
      }

      setProgressStep(
        language === 'vi'
          ? 'Đang phân tích nội dung với Gemini AI...'
          : 'Analyzing content with Gemini AI...'
      );
      await new Promise((r) => setTimeout(r, 300));

      setProgressStep(
        language === 'vi'
          ? 'Đang tạo tóm tắt tài liệu bằng Gemini AI...'
          : 'Generating document summary with Gemini AI...'
      );
      let summaryRes: any = null;
      let summaryErrorOccurred = false;

      try {
        summaryRes = await getDocumentSummary({
          documentId: serverDocId,
          text: finalExtractedText,
          title,
          subjectName: subject?.name || (language === 'vi' ? 'Môn học' : 'Subject'),
        });
      } catch (sumErr: any) {
        summaryErrorOccurred = true;
        console.warn('Error summarizing document:', sumErr);

        const isQuota =
          sumErr.errorCode === 'AI_QUOTA_EXCEEDED' ||
          sumErr.httpStatus === 429 ||
          sumErr.isDailyQuota ||
          (sumErr.message && sumErr.message.toLowerCase().includes('quota'));

        const cleanMsg = isQuota
          ? language === 'vi'
            ? 'Gemini API đã hết hạn mức sử dụng trong ngày. Vui lòng thử lại sau khi quota được cấp lại hoặc kiểm tra gói thanh toán của API.'
            : 'Gemini API daily quota reached. Please try again after the quota resets or check your API billing plan.'
          : sumErr.message ||
            (language === 'vi'
              ? 'Không thể tạo tóm tắt từ tài liệu.'
              : 'Failed to generate document summary.');

        setQuotaError({
          message: cleanMsg,
          retryAfter: sumErr.retryAfter,
          canRetry: sumErr.canRetry ?? !isQuota,
          isDailyQuota: isQuota,
        });

        updateDocument(serverDocId, {
          summaryStatus: isQuota ? 'quota_exceeded' : 'failed',
          summaryError: cleanMsg,
          status: 'ready',
        });

        showToast(cleanMsg, 'error');
      }

      if (summaryErrorOccurred || !summaryRes?.summary) {
        setIsProcessing(false);
        return;
      }

      updateDocument(serverDocId, {
        summary: cleanAiResponse(summaryRes.summary),
        keyTakeaways: (summaryRes.keyTakeaways || []).map((k: string) => cleanAiResponse(k)),
        summaryStatus: 'completed',
        summaryCreatedAt: new Date().toISOString(),
        summaryModel: summaryRes.summaryModel,
        summaryError: undefined,
      });

      setProgressStep(
        language === 'vi'
          ? 'Đang tạo Flashcard & bộ câu hỏi trắc nghiệm...'
          : 'Generating Flashcards & quiz questions...'
      );
      const flashcardsPromise = generateFlashcards({
        documentId: serverDocId,
        text: finalExtractedText,
        subjectName: subject?.name,
        count: 5,
      }).catch(() => null);

      const quizPromise = generateQuiz({
        documentId: serverDocId,
        text: finalExtractedText,
        subjectName: subject?.name,
        numQuestions: 4,
      }).catch(() => null);

      const deadlinesPromise = extractDeadlines({
        documentId: serverDocId,
        text: finalExtractedText,
        subjectName: subject?.name,
      }).catch(() => null);

      const [fcRes, qRes, dlRes] = await Promise.all([flashcardsPromise, quizPromise, deadlinesPromise]);

      const newLessonId = `les_doc_${Date.now()}`;

      addLesson({
        id: newLessonId,
        ownerId: currentUser?.id || '',
        subjectId: selectedSubjectId,
        title,
        lessonDate: new Date().toISOString().split('T')[0],
        classroom: language === 'vi' ? 'Tài liệu môn học' : 'Course Document',
        initialNotes:
          language === 'vi'
            ? `Tài liệu đính kèm: ${file?.name || title}`
            : `Attached document: ${file?.name || title}`,
        transcript: finalExtractedText,
        summary: cleanAiResponse(summaryRes.summary),
        keyPoints: (summaryRes.keyTakeaways || []).map((kt: string, i: number) => ({
          title: language === 'vi' ? `Ý chính ${i + 1}` : `Key Point ${i + 1}`,
          content: kt,
          importance: 'high' as const,
        })),
        keywords: [
          subject?.name || (language === 'vi' ? 'Môn học' : 'Subject'),
          language === 'vi' ? 'Tài liệu' : 'Document',
          language === 'vi' ? 'Ôn tập' : 'Review',
        ],
        analysisStatus: 'completed',
        sourceType: 'document',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      if (fcRes && fcRes.flashcards && fcRes.flashcards.length > 0) {
        addFlashcards(
          fcRes.flashcards.map((fc: any, i: number) => ({
            id: `fc_doc_${Date.now()}_${i}`,
            ownerId: currentUser?.id || '',
            subjectId: selectedSubjectId,
            lessonId: newLessonId,
            front: fc.front,
            back: fc.back,
            example: fc.example,
            difficulty: (fc.difficulty as any) || 'medium',
            topic: fc.topic || title,
            reviewStatus: 'new' as const,
            correctCount: 0,
            incorrectCount: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          }))
        );
      }

      if (qRes && qRes.quiz && qRes.quiz.questions) {
        addQuiz({
          id: `quiz_doc_${Date.now()}`,
          ownerId: currentUser?.id || '',
          subjectId: selectedSubjectId,
          lessonId: newLessonId,
          title: language === 'vi' ? `Trắc nghiệm: ${title}` : `Quiz: ${title}`,
          questions: qRes.quiz.questions,
          difficulty: 'medium',
          createdAt: new Date().toISOString(),
        });
      }

      if (dlRes && dlRes.deadlines && dlRes.deadlines.length > 0) {
        dlRes.deadlines.forEach((dl: any) => {
          addDeadline({
            subjectId: selectedSubjectId,
            title: dl.title,
            dueDate: dl.dueDate || new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
            dueTime: dl.dueTime || '23:59',
            priority: dl.priority || 'medium',
            status: 'todo',
            type: dl.type || 'assignment',
            sourceType: 'ai_document',
            sourceId: newLessonId,
            sourceText: dl.sourceText,
            aiConfidence: dl.confidence || 0.85,
            isAiSuggested: false,
          });
        });
      }

      incrementAiUsage(2);

      setProgressStep(language === 'vi' ? 'Hoàn tất.' : 'Completed.');
      setIsProcessing(false);
      showToast(
        language === 'vi'
          ? 'Đã trích xuất và phân tích tài liệu bằng AI thành công!'
          : 'Document extracted and analyzed with AI successfully!',
        'success'
      );

      setActiveSubjectId(selectedSubjectId);
      setActiveLessonId(newLessonId);
    } catch (err: any) {
      console.error('Error during document analysis:', err);
      setIsProcessing(false);

      const isQuota =
        err.errorCode === 'AI_QUOTA_EXCEEDED' ||
        err.httpStatus === 429 ||
        err.isDailyQuota ||
        (err.message && err.message.toLowerCase().includes('quota'));

      const cleanMsg = isQuota
        ? language === 'vi'
          ? 'Gemini API đã hết hạn mức sử dụng trong ngày. Vui lòng thử lại sau khi quota được cấp lại hoặc kiểm tra gói thanh toán của API.'
          : 'Gemini API daily quota reached. Please try again after the quota resets or check your API billing plan.'
        : err.message || (language === 'vi' ? 'Lỗi khi xử lý tài liệu.' : 'Failed to process document.');

      setQuotaError({
        message: cleanMsg,
        retryAfter: err.retryAfter,
        canRetry: err.canRetry ?? !isQuota,
        isDailyQuota: isQuota,
      });

      setErrorMessage(cleanMsg);
      showToast(cleanMsg, 'error');
    }
  };

  const handleSummarizeDoc = async (doc: DocumentItem, force = false) => {
    if (summarizingDocId === doc.id) return;

    if (!doc.extractedText || doc.extractedText.trim().length === 0) {
      showToast(
        language === 'vi'
          ? 'Tài liệu chưa có văn bản trích xuất. Hãy chọn file khác.'
          : 'Document has no extracted text. Please select another file.',
        'error'
      );
      return;
    }

    setSummarizingDocId(doc.id);
    const sub = subjects.find((s) => s.id === doc.subjectId);

    try {
      const res = await getDocumentSummary({
        documentId: doc.id,
        text: doc.extractedText,
        title: doc.fileName,
        subjectName: sub?.name || (language === 'vi' ? 'Môn học' : 'Subject'),
        forceRegenerate: force,
      });

      if (res && res.summary) {
        const cleanSum = cleanAiResponse(res.summary);
        const cleanTakeaways = (res.keyTakeaways || []).map((k) => cleanAiResponse(k));

        updateDocument(doc.id, {
          summary: cleanSum,
          keyTakeaways: cleanTakeaways,
          summaryStatus: 'completed',
          summaryCreatedAt: res.summaryCreatedAt || new Date().toISOString(),
          summaryError: undefined,
        });

        setSelectedDocForSummary({
          ...doc,
          summary: cleanSum,
          keyTakeaways: cleanTakeaways,
          summaryStatus: 'completed',
        });

        showToast(
          res.cached
            ? language === 'vi'
              ? 'Đã tải bản tóm tắt lưu trữ!'
              : 'Loaded cached summary!'
            : language === 'vi'
            ? 'Đã tạo tóm tắt tài liệu thành công!'
            : 'Document summary generated successfully!',
          'success'
        );
      }
    } catch (err: any) {
      console.warn('Error summarizing library document:', err);

      const isQuota =
        err.errorCode === 'AI_QUOTA_EXCEEDED' ||
        err.httpStatus === 429 ||
        err.isDailyQuota ||
        (err.message && err.message.toLowerCase().includes('quota'));

      const cleanMsg = isQuota
        ? language === 'vi'
          ? 'Gemini API đã hết hạn mức sử dụng trong ngày. Vui lòng thử lại sau khi quota được cấp lại hoặc kiểm tra gói thanh toán của API.'
          : 'Gemini API daily quota reached. Please try again after the quota resets or check your API billing plan.'
        : err.message ||
          (language === 'vi' ? 'Không thể tạo tóm tắt tài liệu.' : 'Failed to generate document summary.');

      updateDocument(doc.id, {
        summaryStatus: isQuota ? 'quota_exceeded' : 'failed',
        summaryError: cleanMsg,
      });

      setQuotaError({
        message: cleanMsg,
        retryAfter: err.retryAfter,
        canRetry: err.canRetry ?? !isQuota,
        isDailyQuota: isQuota,
      });

      showToast(cleanMsg, 'error');
    } finally {
      setSummarizingDocId(null);
    }
  };

  const handleAskAiAboutDoc = (docId: string) => {
    setActiveTab('ai-chat');
  };

  const handleDeleteDoc = async (id: string) => {
    try {
      await deleteDocumentFile(id);
      deleteDocument(id);
      showToast(
        language === 'vi' ? 'Đã xóa tài liệu thành công.' : 'Document deleted successfully.',
        'success'
      );
      if (selectedDocForSummary?.id === id) {
        setSelectedDocForSummary(null);
      }
    } catch {
      showToast(
        language === 'vi' ? 'Lỗi khi xóa tài liệu.' : 'Failed to delete document.',
        'error'
      );
    }
  };

  const handleCopySummary = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
    showToast(
      language === 'vi' ? 'Đã sao chép nội dung tóm tắt!' : 'Copied summary content!',
      'success'
    );
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">
            {language === 'vi'
              ? 'Tài liệu & Giáo trình thông minh'
              : 'Smart Documents & Study Materials'}
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {language === 'vi'
              ? 'Hỗ trợ file PDF, TXT, DOCX hoặc ảnh slide bài giảng. AI trích xuất nội dung thật, giải đáp câu hỏi và tạo flashcard tự động.'
              : 'Supports PDF, TXT, DOCX, or lecture slide images. AI extracts real content, answers questions, and generates flashcards automatically.'}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setActiveDocTab('upload')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeDocTab === 'upload'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {language === 'vi' ? 'Tải lên tài liệu' : 'Upload Document'}
          </button>
          <button
            onClick={() => setActiveDocTab('list')}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
              activeDocTab === 'list'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700'
            }`}
          >
            {language === 'vi' ? `Kho tài liệu (${documents.length})` : `Library (${documents.length})`}
          </button>
        </div>
      </div>

      {/* Global Quota Error Alert Banner if 429 RESOURCE_EXHAUSTED occurs */}
      {quotaError && (
        <div className="p-4 rounded-2xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800/80 text-amber-900 dark:text-amber-200 text-xs shadow-xs space-y-2">
          <div className="flex items-start gap-2.5">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="flex-1 space-y-1">
              <div className="font-bold text-sm text-amber-950 dark:text-amber-100">
                {quotaError.isDailyQuota
                  ? language === 'vi'
                    ? 'Thông báo hạn mức Gemini API'
                    : 'Gemini API Quota Notice'
                  : language === 'vi'
                  ? 'Lỗi kết nối dịch vụ AI'
                  : 'AI Service Connection Error'}
              </div>
              <p className="leading-relaxed">{quotaError.message}</p>
              {quotaError.retryAfter && (
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-100/80 dark:bg-amber-900/40 text-amber-800 dark:text-amber-300 font-semibold text-[11px] mt-1">
                  <Clock className="w-3.5 h-3.5" />
                  <span>
                    {language === 'vi'
                      ? `Thời gian dự kiến có thể thử lại: ${quotaError.retryAfter}`
                      : `Estimated retry time: ${quotaError.retryAfter}`}
                  </span>
                </div>
              )}
            </div>
            <button
              onClick={() => setQuotaError(null)}
              className="text-amber-600 dark:text-amber-400 hover:text-amber-800 p-1"
              title={language === 'vi' ? 'Đóng thông báo' : 'Dismiss'}
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-amber-200/60 dark:border-amber-800/60">
            {quotaError.canRetry && (
              <button
                onClick={() => {
                  setQuotaError(null);
                  handleUploadAndAnalyze();
                }}
                className="px-3 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs flex items-center gap-1.5 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Thử lại' : 'Retry'}</span>
              </button>
            )}
            <button
              onClick={() => {
                setQuotaError(null);
                setActiveDocTab('list');
              }}
              className="px-3 py-1.5 rounded-xl bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 font-bold text-xs hover:bg-slate-50 transition-colors"
            >
              {language === 'vi' ? 'Xem tài liệu đã tải lên' : 'View uploaded documents'}
            </button>
          </div>
        </div>
      )}

      {activeDocTab === 'upload' ? (
        <div className="p-6 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs space-y-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                {language === 'vi' ? 'Chọn môn học liên quan' : 'Select Related Subject'}{' '}
                <span className="text-red-500">*</span>
              </label>
              <select
                value={selectedSubjectId}
                onChange={(e) => setSelectedSubjectId(e.target.value)}
                disabled={isProcessing}
                className="w-full px-3.5 py-2 text-xs font-semibold rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
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
                {language === 'vi' ? 'Tên tài liệu / Tiêu đề' : 'Document Title'}
              </label>
              <input
                type="text"
                value={docTitle}
                onChange={(e) => setDocTitle(e.target.value)}
                disabled={isProcessing}
                placeholder={
                  language === 'vi'
                    ? 'Ví dụ: Slide Chương 4 - Thiết kế CSDL'
                    : 'e.g., Chapter 4 Slides - Database Design'
                }
                className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-50"
              />
            </div>
          </div>

          {/* Drag and Drop Box */}
          <div
            onClick={() => {
              if (!isProcessing) fileInputRef.current?.click();
            }}
            className={`p-8 rounded-2xl border-2 border-dashed ${
              isProcessing
                ? 'border-slate-200 dark:border-slate-800 opacity-60 cursor-not-allowed'
                : 'border-slate-300 dark:border-slate-700 hover:border-indigo-500 cursor-pointer'
            } bg-slate-50/50 dark:bg-slate-800/50 flex flex-col items-center justify-center text-center transition-colors`}
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              disabled={isProcessing}
              accept=".pdf,.docx,.txt,.md,.csv,image/*"
              className="hidden"
            />
            <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center mb-3">
              <FileUp className="w-6 h-6" />
            </div>
            {file ? (
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {file.name}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {formatFileSize(file.size)} •{' '}
                  {language === 'vi' ? 'Nhấn để chọn file khác' : 'Click to choose another file'}
                </div>
              </div>
            ) : (
              <div>
                <div className="text-sm font-bold text-slate-900 dark:text-white">
                  {language === 'vi'
                    ? 'Nhấn để chọn file tài liệu thực tế'
                    : 'Click to select a document file'}
                </div>
                <div className="text-xs text-slate-400 mt-1">
                  {language === 'vi'
                    ? 'Hỗ trợ PDF (kể cả PDF scan), DOCX, TXT hoặc Ảnh bài giảng (Tối đa 25MB)'
                    : 'Supports PDF (including scanned PDFs), DOCX, TXT, or Lecture Images (Max 25MB)'}
                </div>
              </div>
            )}
          </div>

          {/* Extracted text preview or manual input */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300">
                {language === 'vi'
                  ? 'Nội dung văn bản (Trích xuất từ file hoặc dán trực tiếp)'
                  : 'Text Content (Extracted from file or paste directly)'}
              </label>
              {extractedText && (
                <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-bold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>
                    {language === 'vi'
                      ? `Đã có ${extractedText.length} ký tự`
                      : `${extractedText.length} characters`}
                  </span>
                </span>
              )}
            </div>
            <textarea
              rows={5}
              value={extractedText}
              onChange={(e) => setExtractedText(e.target.value)}
              disabled={isProcessing}
              placeholder={
                language === 'vi'
                  ? 'Nội dung trích xuất từ file PDF/DOCX/TXT sẽ xuất hiện tại đây sau khi phân tích, hoặc bạn có thể dán trực tiếp văn bản giáo trình...'
                  : 'Extracted text from PDF/DOCX/TXT will appear here after analysis, or you can paste syllabus/study text directly...'
              }
              className="w-full p-3 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white resize-y font-mono disabled:opacity-50"
            />
          </div>

          {/* Error display */}
          {errorMessage && !quotaError && (
            <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Action Button & Stepped Progress */}
          {isProcessing ? (
            <div className="p-4 rounded-2xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900 text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-xs font-bold text-indigo-700 dark:text-indigo-300">
                <Sparkles className="w-4 h-4 animate-spin text-indigo-600" />
                <span>{progressStep}</span>
              </div>
              <div className="w-full bg-indigo-200 dark:bg-indigo-900 h-1.5 rounded-full overflow-hidden">
                <div className="bg-indigo-600 h-full w-2/3 animate-pulse rounded-full" />
              </div>
              <p className="text-[11px] text-slate-400">
                {language === 'vi'
                  ? 'Vui lòng không đóng trang trong quá trình xử lý tài liệu.'
                  : 'Please do not close this page while processing the document.'}
              </p>
            </div>
          ) : (
            <button
              onClick={handleUploadAndAnalyze}
              disabled={isProcessing}
              className="w-full py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 dark:disabled:bg-slate-700 disabled:cursor-not-allowed text-white font-bold text-xs shadow-md shadow-indigo-600/20 flex items-center justify-center gap-2 transition-all active:scale-95"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {language === 'vi'
                  ? 'Tải lên và Phân tích nội dung bằng AI'
                  : 'Upload & Analyze Content with AI'}
              </span>
            </button>
          )}
        </div>
      ) : (
        /* Document Library List */
        <div className="space-y-4">
          {documents.length === 0 ? (
            <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-center">
              <FolderOpen className="w-10 h-10 text-slate-400 mx-auto mb-2" />
              <p className="text-sm font-bold text-slate-700 dark:text-slate-200">
                {language === 'vi'
                  ? 'Chưa có tài liệu nào trong thư viện'
                  : 'No documents in library yet'}
              </p>
              <p className="text-xs text-slate-400 mt-1">
                {language === 'vi'
                  ? 'Hãy tải lên tài liệu học tập đầu tiên để AI trích xuất nội dung và giải đáp câu hỏi.'
                  : 'Upload your first study document so AI can extract content and answer questions.'}
              </p>
              <button
                onClick={() => setActiveDocTab('upload')}
                className="mt-4 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold"
              >
                {language === 'vi' ? 'Tải lên ngay' : 'Upload Now'}
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-3">
              {documents.map((doc) => {
                const docSubject = subjects.find((s) => s.id === doc.subjectId);
                const hasExtractedText = !!doc.extractedText && doc.extractedText.trim().length > 0;
                const hasSummary = !!doc.summary && doc.summary.trim().length > 0;
                const isSummarizingThis = summarizingDocId === doc.id;
                const isQuotaExceeded = doc.summaryStatus === 'quota_exceeded';

                return (
                  <div
                    key={doc.id}
                    className="p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xs hover:border-indigo-400 transition-colors"
                  >
                    <div className="flex items-start gap-3 flex-1 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2 flex-wrap">
                          <span className="truncate">{doc.fileName}</span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              hasExtractedText
                                ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300'
                                : 'bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300'
                            }`}
                          >
                            {hasExtractedText
                              ? language === 'vi'
                                ? 'Đã trích xuất text'
                                : 'Text Extracted'
                              : language === 'vi'
                              ? 'Chưa có text'
                              : 'No Text'}
                          </span>

                          {hasSummary ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300">
                              {language === 'vi' ? 'Đã có tóm tắt' : 'Summarized'}
                            </span>
                          ) : isQuotaExceeded ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                              {language === 'vi' ? 'Hết hạn mức AI (429)' : 'AI Quota Exceeded (429)'}
                            </span>
                          ) : doc.summaryStatus === 'failed' ? (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300">
                              {language === 'vi' ? 'Lỗi tóm tắt' : 'Summary Error'}
                            </span>
                          ) : null}
                        </h4>

                        <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                          <span>{docSubject?.name || (language === 'vi' ? 'Môn học' : 'Subject')}</span>
                          <span>•</span>
                          <span>{formatFileSize(doc.fileSize)}</span>
                          {doc.extractedText && (
                            <>
                              <span>•</span>
                              <span>
                                {doc.extractedText.length}{' '}
                                {language === 'vi' ? 'ký tự' : 'chars'}
                              </span>
                            </>
                          )}
                        </div>

                        {/* If quota exceeded message exists on document */}
                        {doc.summaryError && (
                          <div className="text-[11px] text-amber-700 dark:text-amber-400 mt-1.5 flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span className="truncate">{doc.summaryError}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {/* View Summary Button */}
                      {hasSummary ? (
                        <button
                          onClick={() => setSelectedDocForSummary(doc)}
                          className="px-3 py-1.5 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 text-indigo-700 dark:text-indigo-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          <BookOpen className="w-3.5 h-3.5" />
                          <span>{language === 'vi' ? 'Xem tóm tắt' : 'View Summary'}</span>
                        </button>
                      ) : (
                        /* Generate Summary Button with loading and disabled state */
                        <button
                          onClick={() => handleSummarizeDoc(doc, false)}
                          disabled={isSummarizingThis || summarizingDocId !== null}
                          className="px-3 py-1.5 rounded-xl bg-purple-50 dark:bg-purple-950/60 hover:bg-purple-100 dark:hover:bg-purple-900/60 disabled:opacity-50 disabled:cursor-not-allowed text-purple-700 dark:text-purple-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        >
                          {isSummarizingThis ? (
                            <>
                              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                              <span>{language === 'vi' ? 'Đang tóm tắt...' : 'Summarizing...'}</span>
                            </>
                          ) : (
                            <>
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>
                                {isQuotaExceeded
                                  ? language === 'vi'
                                    ? 'Thử lại tóm tắt'
                                    : 'Retry Summary'
                                  : language === 'vi'
                                  ? 'Tạo tóm tắt'
                                  : 'Summarize'}
                              </span>
                            </>
                          )}
                        </button>
                      )}

                      {/* Ask AI about this document */}
                      <button
                        onClick={() => handleAskAiAboutDoc(doc.id)}
                        className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-colors"
                        title={
                          language === 'vi'
                            ? 'Hỏi AI về nội dung tài liệu này'
                            : 'Ask AI about this document'
                        }
                      >
                        <MessageSquare className="w-3.5 h-3.5" />
                        <span>{language === 'vi' ? 'Hỏi AI' : 'Ask AI'}</span>
                      </button>

                      <button
                        onClick={() => handleDeleteDoc(doc.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                        title={language === 'vi' ? 'Xóa tài liệu' : 'Delete document'}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Summary Viewer Modal */}
      {selectedDocForSummary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white dark:bg-slate-900 rounded-3xl max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 flex items-center justify-center">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">
                    {language === 'vi' ? 'Tóm tắt: ' : 'Summary: '}
                    {selectedDocForSummary.fileName}
                  </h3>
                  <div className="text-[11px] text-slate-400">
                    {subjects.find((s) => s.id === selectedDocForSummary.subjectId)?.name ||
                      (language === 'vi' ? 'Môn học' : 'Subject')}
                  </div>
                </div>
              </div>

              <button
                onClick={() => setSelectedDocForSummary(null)}
                className="text-slate-400 hover:text-slate-600 dark:hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {/* Summary Text */}
              <div>
                <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                  {language === 'vi' ? 'Tóm tắt tổng quan' : 'Overview Summary'}
                </h4>
                <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs text-slate-800 dark:text-slate-200 leading-relaxed font-sans">
                  {cleanAiResponse(
                    selectedDocForSummary.summary ||
                      (language === 'vi' ? 'Chưa có bản tóm tắt.' : 'No summary available.')
                  )}
                </div>
              </div>

              {/* Key Takeaways */}
              {selectedDocForSummary.keyTakeaways && selectedDocForSummary.keyTakeaways.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">
                    {language === 'vi' ? 'Các ý chính trọng tâm' : 'Key Takeaways'}
                  </h4>
                  <div className="space-y-2">
                    {selectedDocForSummary.keyTakeaways.map((point, idx) => (
                      <div
                        key={idx}
                        className="p-3 rounded-xl bg-indigo-50/50 dark:bg-indigo-950/30 border border-indigo-100/60 dark:border-indigo-900/40 text-xs text-indigo-950 dark:text-indigo-200 flex items-start gap-2.5"
                      >
                        <span className="w-5 h-5 rounded-lg bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                          {idx + 1}
                        </span>
                        <span className="leading-relaxed">{cleanAiResponse(point)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Footer Actions */}
            <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopySummary(selectedDocForSummary.summary || '')}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors"
                >
                  {copiedSummary ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>
                    {copiedSummary
                      ? language === 'vi'
                        ? 'Đã sao chép'
                        : 'Copied'
                      : language === 'vi'
                      ? 'Sao chép'
                      : 'Copy'}
                  </span>
                </button>

                <button
                  onClick={() => {
                    handleSummarizeDoc(selectedDocForSummary, true);
                  }}
                  disabled={summarizingDocId === selectedDocForSummary.id}
                  className="px-3 py-1.5 rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${summarizingDocId === selectedDocForSummary.id ? 'animate-spin' : ''}`} />
                  <span>{language === 'vi' ? 'Tạo lại tóm tắt' : 'Regenerate Summary'}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setSelectedDocForSummary(null);
                    setActiveTab('ai-chat');
                  }}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-xs transition-colors"
                >
                  <MessageSquare className="w-3.5 h-3.5" />
                  <span>{language === 'vi' ? 'Hỏi AI về tài liệu' : 'Ask AI about Document'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
