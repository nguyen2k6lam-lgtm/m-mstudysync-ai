import { DeadlinePriority, DeadlineType, DeadlineStatus } from '../types';

export function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function formatDate(dateString?: string, lang: 'vi' | 'en' = 'vi'): string {
  if (!dateString) return lang === 'en' ? 'TBD' : 'Chưa xác định';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;
    return new Intl.DateTimeFormat(lang === 'en' ? 'en-US' : 'vi-VN', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(date);
  } catch {
    return dateString;
  }
}

export function formatDateTime(dateString?: string, timeString?: string, lang: 'vi' | 'en' = 'vi'): string {
  const dateFormatted = formatDate(dateString, lang);
  if (!timeString) return dateFormatted;
  return `${timeString} - ${dateFormatted}`;
}

export function getPriorityLabel(priority: DeadlinePriority, lang: 'vi' | 'en' = 'vi'): { label: string; color: string; bg: string } {
  switch (priority) {
    case 'urgent':
      return { label: lang === 'en' ? 'Urgent' : 'Khẩn cấp', color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/40 border-red-200 dark:border-red-800' };
    case 'high':
      return { label: lang === 'en' ? 'High' : 'Ưu tiên cao', color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/40 border-amber-200 dark:border-amber-800' };
    case 'medium':
      return { label: lang === 'en' ? 'Medium' : 'Trung bình', color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/40 border-blue-200 dark:border-blue-800' };
    case 'low':
    default:
      return { label: lang === 'en' ? 'Low' : 'Thấp', color: 'text-slate-600 dark:text-slate-400', bg: 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700' };
  }
}

export function getDeadlineTypeLabel(type: DeadlineType, lang: 'vi' | 'en' = 'vi'): string {
  switch (type) {
    case 'assignment': return lang === 'en' ? 'Assignment' : 'Bài tập';
    case 'exam': return lang === 'en' ? 'Exam / Quiz' : 'Bài kiểm tra / Thi';
    case 'presentation': return lang === 'en' ? 'Presentation' : 'Thuyết trình';
    case 'project': return lang === 'en' ? 'Project' : 'Đồ án / Dự án';
    case 'reading': return lang === 'en' ? 'Reading' : 'Đọc tài liệu';
    case 'other':
    default: return lang === 'en' ? 'Other' : 'Khác';
  }
}

export function getStatusLabel(status: DeadlineStatus, lang: 'vi' | 'en' = 'vi'): { label: string; badgeClass: string } {
  switch (status) {
    case 'completed':
      return { label: lang === 'en' ? 'Completed' : 'Đã hoàn thành', badgeClass: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/50 dark:text-emerald-300' };
    case 'in_progress':
      return { label: lang === 'en' ? 'In Progress' : 'Đang làm', badgeClass: 'bg-sky-100 text-sky-800 dark:bg-sky-950/50 dark:text-sky-300' };
    case 'todo':
    default:
      return { label: lang === 'en' ? 'To Do' : 'Chưa làm', badgeClass: 'bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-300' };
  }
}

export function getDeadlineUrgency(dueDate: string, status: DeadlineStatus): 'overdue' | 'due_soon' | 'normal' | 'completed' {
  if (status === 'completed') return 'completed';
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = new Date(dueDate);
  due.setHours(0, 0, 0, 0);

  const diffTime = due.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays < 0) return 'overdue';
  if (diffDays <= 3) return 'due_soon';
  return 'normal';
}

export function safeConfirm(message: string): boolean {
  try {
    return window.confirm(message);
  } catch {
    return true;
  }
}

/**
 * Strips raw Markdown symbols (asterisks, dollars, horizontal rules, markdown hashes)
 * to ensure AI responses are clean, natural, and formatted clearly in Vietnamese.
 */
export function cleanAiResponse(text: string | undefined | null): string {
  if (!text || typeof text !== 'string') return '';

  let cleaned = text;

  // 1. Remove Markdown horizontal separators (---, ___, ***)
  cleaned = cleaned.replace(/^\s*[-_*]{3,}\s*$/gm, '');

  // 2. Remove $$...$$ and $...$ preserving inner mathematical content
  cleaned = cleaned.replace(/\$\$(.+?)\$\$/gs, '$1');
  cleaned = cleaned.replace(/\$([^\$\n]+?)\$/g, '$1');

  // 3. Remove bold and italic asterisks: ***text***, **text**, *text*
  cleaned = cleaned.replace(/\*{3}(.+?)\*{3}/g, '$1');
  cleaned = cleaned.replace(/\*{2}(.+?)\*{2}/g, '$1');
  cleaned = cleaned.replace(/\*([^\*\n]+?)\*/g, '$1');

  // Also remove double underscores __text__
  cleaned = cleaned.replace(/_{2}(.+?)_{2}/g, '$1');

  // 4. Convert Markdown Headings (# Heading, ## Heading) to clean plain title
  cleaned = cleaned.replace(/^#{1,6}\s+(.+)$/gm, '$1');

  // 5. Convert bullet lines starting with "* " or "- " into clean numbered list
  const lines = cleaned.split('\n');
  let listCounter = 0;
  const processedLines = lines.map((line) => {
    const trimmed = line.trim();
    if (trimmed.startsWith('* ') || trimmed.startsWith('- ')) {
      listCounter++;
      const itemContent = trimmed.slice(2).trim();
      return `${listCounter}. ${itemContent}`;
    } else {
      listCounter = 0;
      // Strip any accidental leading asterisk
      return line.replace(/^\s*\*\s*/, '');
    }
  });
  cleaned = processedLines.join('\n');

  // Remove any remaining stray asterisks or dollars completely
  cleaned = cleaned.replace(/\*/g, '');
  cleaned = cleaned.replace(/\$/g, '');

  // 6. Normalize whitespace: reduce 3+ consecutive newlines to 2, trim lines
  cleaned = cleaned.replace(/[ \t]+/g, ' ');
  cleaned = cleaned.replace(/\n{3,}/g, '\n\n');

  return cleaned.trim();
}

/**
 * Returns the best supported audio MIME type for the user's browser.
 */
export function getSupportedAudioMimeType(): string {
  if (typeof window === 'undefined' || typeof MediaRecorder === 'undefined') {
    return '';
  }
  const candidateTypes = [
    'audio/webm;codecs=opus',
    'audio/webm',
    'audio/mp4',
    'audio/ogg;codecs=opus',
    'audio/wav',
  ];
  for (const t of candidateTypes) {
    if (MediaRecorder.isTypeSupported(t)) {
      return t;
    }
  }
  return '';
}
