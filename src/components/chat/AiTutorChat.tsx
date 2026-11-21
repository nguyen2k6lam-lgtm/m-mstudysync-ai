import React, { useState, useRef, useEffect } from 'react';
import { useApp } from '../../context/AppContext';
import { sendChatMessage, syncAppState } from '../../services/api';
import { safeConfirm } from '../../utils/formatters';
import { ChatMessage } from '../../types';
import {
  Bot,
  Send,
  Sparkles,
  User,
  Trash2,
  Copy,
  Check,
  RotateCcw,
  AlertCircle,
  FileText,
  BookOpen,
  FolderOpen,
} from 'lucide-react';

interface AiTutorChatProps {
  initialSubjectId?: string;
  initialLessonId?: string;
  initialDocumentId?: string;
  initialScope?: 'lesson' | 'subject' | 'document' | 'general';
}

const DEFAULT_SUGGESTIONS_VI = [
  'Giải thích đơn giản hơn cho mình hiểu',
  'Cho một ví dụ thực tế áp dụng kiến thức này',
  'Tóm tắt câu trả lời trong 3 ý chính',
  'Đặt một câu hỏi trắc nghiệm kiểm tra độ hiểu của mình',
  'So sánh sự khác nhau giữa hai khái niệm trọng tâm',
  'Gợi ý cách ghi nhớ công thức trong tài liệu/bài học này',
];

const DEFAULT_SUGGESTIONS_EN = [
  'Explain this in simpler terms',
  'Give a real-world example of this concept',
  'Summarize the answer in 3 key bullet points',
  'Ask me a multiple-choice question to test my understanding',
  'Compare the differences between the two core concepts',
  'Suggest a memory trick for the formulas in this material',
];

export const AiTutorChat: React.FC<AiTutorChatProps> = ({
  initialSubjectId,
  initialLessonId,
  initialDocumentId,
  initialScope = 'lesson',
}) => {
  const {
    subjects,
    lessons,
    documents,
    activeSubjectId,
    activeLessonId,
    incrementAiUsage,
    showToast,
    language,
  } = useApp();

  const suggestions = language === 'vi' ? DEFAULT_SUGGESTIONS_VI : DEFAULT_SUGGESTIONS_EN;

  // Selected scope & context
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>(
    initialSubjectId || activeSubjectId || (subjects[0]?.id || '')
  );
  const [selectedLessonId, setSelectedLessonId] = useState<string>(
    initialLessonId || activeLessonId || (lessons[0]?.id || '')
  );
  const [selectedDocumentId, setSelectedDocumentId] = useState<string>(
    initialDocumentId || (documents[0]?.id || '')
  );
  const [chatMode, setChatMode] = useState<'lesson' | 'subject' | 'document' | 'general'>(
    initialScope || (subjects.length > 0 ? 'lesson' : 'general')
  );

  // Conversation tracking
  const [conversationId, setConversationId] = useState<string>(() => {
    return `conv_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
  });

  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastFailedQuestion, setLastFailedQuestion] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Storage key for persisting conversation
  const storageKey = `studymind_chat_history_${selectedSubjectId || 'general'}_${chatMode}`;

  // Messages state with localStorage persistence
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
    } catch {}

    return [
      {
        id: 'msg_welcome',
        conversationId: 'conv_init',
        role: 'assistant',
        content:
          language === 'vi'
            ? `Xin chào! Tôi là Trợ giảng AI dành cho sinh viên. Tôi có thể giải đáp thắc mắc, phân tích các định nghĩa, trả lời dựa trên tài liệu tải lên hoặc bài học và tạo câu hỏi tự ôn tập cho bạn. Hãy chọn phạm vi bên trên và đặt câu hỏi nhé!`
            : `Hello! I am your AI Study Tutor. I can answer questions, explain definitions, reference your uploaded documents or lessons, and generate practice questions for you. Select a scope above and ask away!`,
        createdAt: new Date().toISOString(),
      },
    ];
  });

  const messagesEndRef = useRef<HTMLDivElement | null>(null);

  // Sync state to server so backend has the latest subjects, lessons & documents
  useEffect(() => {
    if (subjects.length > 0 || lessons.length > 0) {
      syncAppState(subjects, lessons, documents);
    }
  }, [subjects, lessons, documents]);

  // Save messages to localStorage when updated
  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(messages));
    } catch {}
  }, [messages, storageKey]);

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const subject = subjects.find((s) => s.id === selectedSubjectId);
  const subjectLessons = lessons.filter((l) => l.subjectId === selectedSubjectId);
  const subjectDocuments = documents.filter((d) => !selectedSubjectId || d.subjectId === selectedSubjectId);

  // Auto select subject, lesson, or document if not set or out of sync
  useEffect(() => {
    if (selectedSubjectId && !subjects.some((s) => s.id === selectedSubjectId)) {
      setSelectedSubjectId(subjects[0]?.id || '');
    } else if (!selectedSubjectId && subjects.length > 0) {
      setSelectedSubjectId(subjects[0].id);
    }
  }, [subjects, selectedSubjectId]);

  useEffect(() => {
    if (chatMode === 'document') {
      const validDoc = documents.some((d) => d.id === selectedDocumentId);
      if (!validDoc) {
        if (subjectDocuments.length > 0) {
          setSelectedDocumentId(subjectDocuments[0].id);
        } else if (documents.length > 0) {
          setSelectedDocumentId(documents[0].id);
        } else {
          setSelectedDocumentId('');
        }
      }
    }
  }, [chatMode, selectedDocumentId, subjectDocuments, documents]);

  const handleSendMessage = async (textToSend?: string) => {
    const questionText = (textToSend ?? inputMessage).trim();
    if (!questionText) {
      const emptyMsg =
        language === 'vi'
          ? 'Vui lòng nhập câu hỏi trước khi gửi.'
          : 'Please enter a question before sending.';
      setError(emptyMsg);
      showToast(emptyMsg, 'warning');
      return;
    }
    if (isLoading) return;

    setError(null);
    setLastFailedQuestion(null);

    const userMsg: ChatMessage = {
      id: `msg_u_${Date.now()}`,
      conversationId,
      role: 'user',
      content: questionText,
      createdAt: new Date().toISOString(),
    };

    // Immediately show user message
    setMessages((prev) => [...prev, userMsg]);
    if (!textToSend) {
      setInputMessage('');
    }
    setIsLoading(true);

    try {
      const validSubjectId =
        chatMode !== 'general' && subjects.some((s) => s.id === selectedSubjectId)
          ? selectedSubjectId
          : null;
      const validLessonId =
        chatMode === 'lesson' && lessons.some((l) => l.id === selectedLessonId)
          ? selectedLessonId
          : null;
      const validDocumentId =
        chatMode === 'document' && documents.some((d) => d.id === selectedDocumentId)
          ? selectedDocumentId
          : null;

      const activeLessonObj = validLessonId ? lessons.find((l) => l.id === validLessonId) : null;
      const activeDocObj = validDocumentId ? documents.find((d) => d.id === validDocumentId) : null;
      const activeSubjObj = validSubjectId ? subjects.find((s) => s.id === validSubjectId) : null;

      let contextText: string | null = null;
      let contextTitle: string | null = null;
      if (activeLessonObj) {
        contextTitle = activeLessonObj.title;
        contextText = [
          activeLessonObj.summary ? `Tóm tắt: ${activeLessonObj.summary}` : '',
          activeLessonObj.transcript ? `Transcript: ${activeLessonObj.transcript}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
      } else if (activeDocObj) {
        contextTitle = activeDocObj.fileName;
        contextText = [
          activeDocObj.summary ? `Tóm tắt: ${activeDocObj.summary}` : '',
          activeDocObj.extractedText ? `Nội dung: ${activeDocObj.extractedText}` : '',
        ]
          .filter(Boolean)
          .join('\n\n');
      } else if (activeSubjObj) {
        contextTitle = activeSubjObj.name;
      }

      const res = await sendChatMessage({
        conversationId,
        subjectId: validSubjectId,
        lessonId: validLessonId,
        documentId: validDocumentId,
        question: questionText,
        mode: chatMode,
        language,
        contextText,
        contextTitle,
      });

      const resolvedConvId = res.data?.conversationId || res.conversationId || conversationId;
      if (resolvedConvId) {
        setConversationId(resolvedConvId);
      }

      const rawSources = res.data?.sources || res.sources || [];
      let formattedSources: string[] = [];
      if (Array.isArray(rawSources)) {
        formattedSources = rawSources
          .map((s: any) => {
            if (typeof s === 'string') return s;
            if (s && s.title) {
              const label =
                s.type === 'document'
                  ? language === 'vi'
                    ? 'Tài liệu'
                    : 'Document'
                  : s.type === 'lesson'
                  ? language === 'vi'
                    ? 'Bài học'
                    : 'Lesson'
                  : language === 'vi'
                  ? 'Môn học'
                  : 'Subject';
              return `${label}: ${s.title}`;
            }
            return '';
          })
          .filter(Boolean);
      }

      const answerText = (res.data?.answer || res.answer || res.reply || '').trim();

      const assistantMsg: ChatMessage = {
        id: `msg_a_${Date.now()}`,
        conversationId: resolvedConvId,
        role: 'assistant',
        content: answerText,
        sources: formattedSources.length > 0 ? formattedSources : undefined,
        createdAt: new Date().toISOString(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
      incrementAiUsage(1);
    } catch (err: any) {
      console.warn('Chat request failed:', err?.message || err);
      const friendlyError =
        err?.message ||
        (language === 'vi'
          ? 'Không thể kết nối với AI. Vui lòng kiểm tra cấu hình Gemini API, kết nối mạng hoặc thử lại.'
          : 'Could not connect to AI. Please check your Gemini API setup, network connection, or try again.');
      setError(friendlyError);
      setLastFailedQuestion(questionText);
      showToast(friendlyError, 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetry = () => {
    if (lastFailedQuestion && !isLoading) {
      handleSendMessage(lastFailedQuestion);
    }
  };

  const handleCopy = (content: string, id: string) => {
    navigator.clipboard.writeText(content);
    setCopiedId(id);
    showToast(
      language === 'vi' ? 'Đã sao chép câu trả lời vào clipboard!' : 'Copied answer to clipboard!',
      'success'
    );
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleClearChat = () => {
    if (
      safeConfirm(
        language === 'vi'
          ? 'Bạn có muốn xóa toàn bộ lịch sử hội thoại hiện tại không?'
          : 'Do you want to clear the entire current conversation history?'
      )
    ) {
      const fresh: ChatMessage[] = [
        {
          id: `msg_reset_${Date.now()}`,
          conversationId,
          role: 'assistant',
          content:
            language === 'vi'
              ? 'Lịch sử hội thoại đã được làm mới. Bạn cần hỗ trợ câu hỏi nào tiếp theo?'
              : 'Conversation history has been reset. What question can I help you with next?',
          createdAt: new Date().toISOString(),
        },
      ];
      setMessages(fresh);
      try {
        localStorage.removeItem(storageKey);
      } catch {}
      setError(null);
      setLastFailedQuestion(null);
      showToast(
        language === 'vi' ? 'Đã xóa lịch sử trò chuyện.' : 'Cleared conversation history.',
        'info'
      );
    }
  };

  return (
    <div className="max-w-4xl mx-auto h-[calc(100vh-140px)] flex flex-col rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm overflow-hidden">
      {/* Top Header Bar */}
      <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/90 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
              <span>{language === 'vi' ? 'Trợ giảng AI Mầm Study' : 'Mầm Study AI Tutor'}</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300">
                Gemini AI
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">
              {language === 'vi'
                ? 'Giải thích bài giảng, trả lời dựa trên tài liệu, bám sát nội dung học tập'
                : 'Explain lectures, answer based on uploaded documents, and stay aligned with your curriculum'}
            </p>
          </div>
        </div>

        <button
          onClick={handleClearChat}
          className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-800 transition-colors"
          title={language === 'vi' ? 'Xóa lịch sử hội thoại' : 'Clear conversation history'}
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Scope Controls */}
      <div className="px-4 py-2.5 bg-slate-100/60 dark:bg-slate-800/60 border-b border-slate-200/80 dark:border-slate-700 flex flex-wrap items-center gap-2 text-xs">
        <span className="font-bold text-slate-500">
          {language === 'vi' ? 'Phạm vi hỏi đáp:' : 'Context Scope:'}
        </span>

        <button
          onClick={() => setChatMode('document')}
          className={`px-3 py-1 rounded-lg font-bold transition-all flex items-center gap-1.5 ${
            chatMode === 'document'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          <FolderOpen className="w-3.5 h-3.5" />
          <span>{language === 'vi' ? 'Theo tài liệu' : 'By Document'}</span>
        </button>

        <button
          onClick={() => setChatMode('lesson')}
          className={`px-3 py-1 rounded-lg font-bold transition-all ${
            chatMode === 'lesson'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {language === 'vi' ? 'Trong bài học này' : 'In This Lesson'}
        </button>

        <button
          onClick={() => setChatMode('subject')}
          className={`px-3 py-1 rounded-lg font-bold transition-all ${
            chatMode === 'subject'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {language === 'vi' ? 'Toàn bộ môn học' : 'Entire Subject'}
        </button>

        <button
          onClick={() => setChatMode('general')}
          className={`px-3 py-1 rounded-lg font-bold transition-all ${
            chatMode === 'general'
              ? 'bg-indigo-600 text-white shadow-xs'
              : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300'
          }`}
        >
          {language === 'vi' ? 'Kiến thức mở rộng' : 'General Knowledge'}
        </button>

        {/* Subject dropdown selector */}
        {chatMode !== 'general' && (
          <select
            value={selectedSubjectId}
            onChange={(e) => {
              setSelectedSubjectId(e.target.value);
              const matching = lessons.filter((l) => l.subjectId === e.target.value);
              if (matching.length > 0) setSelectedLessonId(matching[0].id);
            }}
            className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.code})
              </option>
            ))}
          </select>
        )}

        {/* Document dropdown selector */}
        {chatMode === 'document' && (
          <select
            value={selectedDocumentId}
            onChange={(e) => setSelectedDocumentId(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white max-w-[220px] truncate"
          >
            <option value="">{language === 'vi' ? '-- Chọn tài liệu --' : '-- Select document --'}</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>
                {d.fileName}
              </option>
            ))}
          </select>
        )}

        {/* Lesson dropdown selector */}
        {chatMode === 'lesson' && subjectLessons.length > 0 && (
          <select
            value={selectedLessonId}
            onChange={(e) => setSelectedLessonId(e.target.value)}
            className="px-2 py-1 text-xs rounded-lg border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-700 text-slate-800 dark:text-white max-w-[200px] truncate"
          >
            <option value="">{language === 'vi' ? '-- Chọn bài học --' : '-- Select lesson --'}</option>
            {subjectLessons.map((l) => (
              <option key={l.id} value={l.id}>
                {l.title}
              </option>
            ))}
          </select>
        )}
      </div>

      {/* Messages Thread */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        {messages.map((msg) => {
          const isUser = msg.role === 'user';
          const displayContent =
            msg.id === 'msg_welcome'
              ? language === 'vi'
                ? `Xin chào! Tôi là Trợ giảng AI dành cho sinh viên. Tôi có thể giải đáp thắc mắc, phân tích các định nghĩa, trả lời dựa trên tài liệu tải lên hoặc bài học và tạo câu hỏi tự ôn tập cho bạn. Hãy chọn phạm vi bên trên và đặt câu hỏi nhé!`
                : `Hello! I am your AI Study Tutor. I can answer questions, explain definitions, reference your uploaded documents or lessons, and generate practice questions for you. Select a scope above and ask away!`
              : msg.content;
          return (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}
            >
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-white shadow-xs ${
                  isUser ? 'bg-indigo-600' : 'bg-purple-600'
                }`}
              >
                {isUser ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`max-w-[85%] sm:max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                  isUser
                    ? 'bg-indigo-600 text-white font-medium rounded-tr-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-100 rounded-tl-xs border border-slate-200/60 dark:border-slate-700'
                }`}
              >
                <div className="whitespace-pre-line">{displayContent}</div>

                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-slate-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5 flex-wrap">
                    <FileText className="w-3 h-3 text-indigo-500" />
                    <span>
                      {language === 'vi' ? 'Dữ liệu tham chiếu:' : 'Reference sources:'}{' '}
                      <strong>{msg.sources.join(' • ')}</strong>
                    </span>
                  </div>
                )}

                {!isUser && (
                  <div className="mt-2.5 flex items-center justify-end">
                    <button
                      onClick={() => handleCopy(displayContent, msg.id)}
                      className="p-1 rounded text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
                      title={language === 'vi' ? 'Sao chép câu trả lời' : 'Copy answer'}
                    >
                      {copiedId === msg.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Loading state indicator */}
        {isLoading && (
          <div className="flex items-start gap-3">
            <div className="w-8 h-8 rounded-full bg-purple-600 text-white flex items-center justify-center shrink-0">
              <Bot className="w-4 h-4 animate-pulse" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-100 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300 flex items-center gap-2 border border-slate-200/60 dark:border-slate-700">
              <Sparkles className="w-4 h-4 text-purple-600 animate-spin" />
              <span className="font-medium">
                {language === 'vi' ? 'AI đang suy nghĩ...' : 'AI is thinking...'}
              </span>
            </div>
          </div>
        )}

        {/* Error Alert with Retry button */}
        {error && (
          <div className="p-3.5 rounded-2xl bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
            {lastFailedQuestion && (
              <button
                onClick={handleRetry}
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold transition-colors shrink-0"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>{language === 'vi' ? 'Thử lại' : 'Retry'}</span>
              </button>
            )}
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Questions */}
      <div className="px-4 py-2 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {suggestions.map((sug, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(sug)}
            disabled={isLoading}
            className="px-2.5 py-1 rounded-full text-[11px] font-semibold bg-white dark:bg-slate-800 hover:bg-indigo-50 dark:hover:bg-indigo-950 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 whitespace-nowrap transition-colors disabled:opacity-50"
          >
            {sug}
          </button>
        ))}
      </div>

      {/* Input box */}
      <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            disabled={isLoading}
            placeholder={
              chatMode === 'document'
                ? language === 'vi'
                  ? 'Hỏi trợ giảng AI bất kỳ điều gì về tài liệu đã chọn...'
                  : 'Ask AI Tutor anything about the selected document...'
                : chatMode === 'lesson'
                ? language === 'vi'
                  ? 'Hỏi trợ giảng AI về bài học này...'
                  : 'Ask AI Tutor about this lesson...'
                : language === 'vi'
                ? 'Hỏi trợ giảng AI về môn học...'
                : 'Ask AI Tutor about this subject...'
            }
            className="flex-1 px-4 py-2.5 text-xs rounded-xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={!inputMessage.trim() || isLoading}
            className="p-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold disabled:opacity-50 transition-all shadow-md shadow-indigo-600/20 active:scale-95"
            title={language === 'vi' ? 'Gửi câu hỏi' : 'Send question'}
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </div>
    </div>
  );
};
