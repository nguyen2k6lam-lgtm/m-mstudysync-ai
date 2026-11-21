import {
  AiAnalysisResult,
  Deadline,
  Flashcard,
  Quiz,
  Subject,
  Lesson,
  DocumentItem,
  User,
  Transaction,
  Subscription,
} from '../types';

export interface SystemStatus {
  hasApiKey: boolean;
  model: string;
  environment: string;
  serverTime: string;
  stripeConfigured?: boolean;
}

export interface SubscriptionInfo {
  userId: string;
  plan: 'free' | 'premium';
  status: 'active' | 'trial' | 'canceled' | 'past_due' | 'incomplete';
  startDate: string;
  endDate: string;
  stripeCustomerId?: string;
  stripeSubscriptionId?: string;
  cancelAtPeriodEnd: boolean;
  hasActivePremiumAccess: boolean;
}

/**
 * Returns auth headers including bearer token for all secure server requests.
 */
export function getAuthHeaders(): Record<string, string> {
  let token = '';
  let userId = '';
  try {
    token = localStorage.getItem('studymind_token') || '';
    const savedUser = localStorage.getItem('studymind_user');
    if (savedUser) {
      const parsed = JSON.parse(savedUser);
      if (parsed && parsed.id) {
        userId = parsed.id;
      }
    }
  } catch {}

  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-auth-token'] = token;
  }
  if (userId) {
    headers['x-user-id'] = userId;
  }
  return headers;
}

export const AI_ERROR_CODE_MESSAGES: Record<string, string> = {
  AI_NOT_CONFIGURED: 'Dịch vụ AI chưa được cấu hình trên máy chủ (thiếu GEMINI_API_KEY).',
  AI_INVALID_API_KEY: 'API key của dịch vụ AI không hợp lệ hoặc đã bị thu hồi.',
  AI_MODEL_NOT_FOUND: 'Model AI hiện không khả dụng hoặc không được hỗ trợ.',
  AI_PERMISSION_DENIED: 'Không có quyền truy cập dịch vụ AI.',
  AI_QUOTA_EXCEEDED: 'Dịch vụ AI đã hết hạn mức sử dụng. Vui lòng thử lại sau.',
  AI_RATE_LIMITED: 'Bạn đang gửi yêu cầu quá nhanh. Vui lòng thử lại sau ít giây.',
  AI_TIMEOUT: 'AI phản hồi quá thời gian cho phép. Vui lòng thử lại.',
  AI_EMPTY_RESPONSE: 'AI chưa tạo được phản hồi hợp lệ. Vui lòng thử lại.',
  AI_INVALID_RESPONSE: 'Dữ liệu phản hồi từ AI không đúng định dạng. Vui lòng thử lại.',
  AI_INPUT_EMPTY: 'Nội dung gửi cho AI đang trống. Vui lòng nhập nội dung hợp lệ.',
  AUDIO_FILE_MISSING: 'Không tìm thấy file âm thanh hợp lệ để chuyển thành văn bản.',
  DOCUMENT_TEXT_EMPTY: 'Tài liệu chưa có nội dung văn bản để phân tích.',
  PREMIUM_REQUIRED: 'Tính năng Sơ đồ tư duy chỉ dành cho tài khoản Premium.',
  UNAUTHORIZED: 'Phiên đăng nhập không hợp lệ hoặc đã hết hạn. Vui lòng đăng nhập lại.',
  FORBIDDEN: 'Bạn không có quyền truy cập dữ liệu hoặc thực hiện thao tác này.',
};

export function createStructuredAiError(data: any, status: number, fallbackMessage: string): Error & {
  errorCode: string;
  code: string;
  httpStatus: number;
  retryAfter?: string;
  canRetry?: boolean;
  isDailyQuota?: boolean;
  data?: any;
} {
  const code =
    data?.error?.code ||
    data?.errorCode ||
    data?.code ||
    (status === 401
      ? 'UNAUTHORIZED'
      : status === 403
      ? 'FORBIDDEN'
      : status === 429
      ? 'AI_QUOTA_EXCEEDED'
      : 'AI_INVALID_RESPONSE');
  const message =
    data?.error?.message ||
    data?.message ||
    AI_ERROR_CODE_MESSAGES[code] ||
    fallbackMessage;
  const err: any = new Error(message);
  err.errorCode = code;
  err.code = code;
  err.httpStatus = status;
  err.retryAfter = data?.retryAfter;
  err.canRetry = data?.canRetry ?? (code !== 'AI_QUOTA_EXCEEDED' && code !== 'PREMIUM_REQUIRED');
  err.isDailyQuota = code === 'AI_QUOTA_EXCEEDED' || status === 429;
  err.fileSaved = data?.fileSaved;
  err.audioUrl = data?.audioUrl;
  err.storagePath = data?.storagePath;
  err.warnings = data?.warnings || [];
  err.data = data;
  return err;
}

export async function getSystemStatus(): Promise<SystemStatus> {
  try {
    const res = await fetch('/api/system-status');
    if (!res.ok) throw new Error('Status request failed');
    return await res.json();
  } catch {
    return {
      hasApiKey: false,
      model: 'gemini-3-flash-preview',
      environment: 'development',
      serverTime: new Date().toISOString(),
      stripeConfigured: false,
    };
  }
}

/**
 * Synchronizes subjects, lessons and documents state to server
 */
export async function syncAppState(subjects: Subject[], lessons: Lesson[], documents?: DocumentItem[]): Promise<boolean> {
  try {
    const res = await fetch('/api/sync/state', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ subjects, lessons, documents }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

// Persistent Audio Upload Response
export interface AudioUploadResponse {
  success: boolean;
  fileId?: string;
  audioUrl: string;
  storagePath: string;
  fileName: string;
  mimeType: string;
  fileSize: number;
  lessonId?: string;
  message?: string;
  errorCode?: string;
}

/**
 * Upload Audio File to Server Storage for persistent playback (PHẦN 1, 2, 3, 4)
 * Uses FormData with browser multipart boundary, NEVER manually sets Content-Type
 */
export async function uploadAudioFile(params: {
  audioFile?: File | null;
  audioBlob?: Blob | null;
  audioData?: string; // fallback base64
  mimeType?: string;
  fileName?: string;
  duration?: number;
  subjectId?: string;
  lessonId?: string;
}): Promise<AudioUploadResponse> {
  const cleanMime = (params.mimeType || 'audio/webm').split(';')[0].trim() || 'audio/webm';

  // Determine file object
  let file: File | null = params.audioFile || null;
  if (!file && params.audioBlob) {
    const ext = cleanMime.includes('wav') ? 'wav' : cleanMime.includes('mp3') ? 'mp3' : 'webm';
    file = new File(
      [params.audioBlob],
      params.fileName || `recording-${Date.now()}.${ext}`,
      { type: cleanMime }
    );
  }

  // Pre-upload validation (PHẦN 2)
  if (!file && !params.audioData) {
    throw new Error('Chưa chọn file âm thanh.');
  }

  if (file) {
    if (!(file instanceof File)) {
      throw new Error('Dữ liệu âm thanh không phải là File hợp lệ.');
    }

    if (file.size === 0) {
      throw new Error('File âm thanh đang rỗng.');
    }

    if (file.size > 100 * 1024 * 1024) {
      throw new Error('File âm thanh vượt quá giới hạn 100MB.');
    }

    // Build FormData (PHẦN 3)
    const formData = new FormData();
    formData.append('file', file, file.name);
    if (params.lessonId) formData.append('lessonId', params.lessonId);
    if (params.subjectId) formData.append('subjectId', params.subjectId);
    if (params.duration) formData.append('duration', String(params.duration));

    // IMPORTANT: Do NOT set Content-Type header so browser sets multipart boundary!
    const headers = getAuthHeaders();

    const response = await fetch('/api/audio/upload', {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.success === false) {
      const err: any = new Error(data?.message || 'Không thể tải file âm thanh lên.');
      err.errorCode = data?.errorCode || 'AUDIO_UPLOAD_FAILED';
      throw err;
    }

    return data;
  }

  // Fallback to base64 payload if strictly provided
  let cleanData = params.audioData || '';
  if (cleanData.includes(';base64,')) {
    const parts = cleanData.split(';base64,');
    cleanData = parts.slice(1).join(';base64,');
  } else if (cleanData.startsWith('data:')) {
    const commaIdx = cleanData.indexOf(',');
    if (commaIdx !== -1) {
      cleanData = cleanData.slice(commaIdx + 1);
    }
  }

  const response = await fetch('/api/audio/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      audioData: cleanData.trim(),
      mimeType: cleanMime,
      fileName: params.fileName,
      duration: params.duration,
      subjectId: params.subjectId,
      lessonId: params.lessonId,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.success === false) {
    const err: any = new Error(data?.message || 'Lỗi khi lưu trữ file ghi âm');
    err.errorCode = data?.errorCode || 'AUDIO_UPLOAD_FAILED';
    throw err;
  }

  return data;
}

export interface AiStatusResponse {
  hasApiKey: boolean;
  model: string;
  maskedKey: string;
  lastQuotaStatus: 'normal' | 'rate_limited' | 'quota_exceeded' | 'auth_error' | 'server_error';
  lastRequestAt: string | null;
  lastError: string | null;
  lastErrorCode: string | null;
  retryAfter: string | null;
  serverTime: string;
}

export async function getAiStatus(): Promise<AiStatusResponse> {
  const res = await fetch('/api/ai/status', {
    headers: getAuthHeaders(),
  });
  if (!res.ok) throw new Error('Không thể lấy thông tin trạng thái AI');
  return res.json();
}

export async function testAiConnection(): Promise<{
  success: boolean;
  message: string;
  model: string;
  status: string;
  responseSample?: string;
  errorCode?: string;
  retryAfter?: string;
}> {
  const res = await fetch('/api/ai/test-connection', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });
  const data = await res.json().catch(() => null);
  if (!res.ok || !data || data.success === false) {
    const err: any = new Error(data?.message || 'Kiểm tra kết nối AI thất bại');
    err.errorCode = data?.errorCode;
    err.retryAfter = data?.retryAfter;
    err.canRetry = data?.canRetry;
    throw err;
  }
  return data;
}

/**
 * Delete a specific audio file from server storage
 */
export async function deleteAudioFile(fileId: string): Promise<{ success: boolean }> {
  try {
    const response = await fetch(`/api/audio/${encodeURIComponent(fileId)}`, {
      method: 'DELETE',
      headers: {
        ...getAuthHeaders(),
      },
    });
    return response.ok ? await response.json() : { success: false };
  } catch {
    return { success: false };
  }
}

/**
 * Delete all audio files associated with a subject
 */
export async function deleteAudioFilesBySubject(subjectId: string): Promise<{ success: boolean; count: number }> {
  try {
    const response = await fetch('/api/audio/delete-by-subject', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({ subjectId }),
    });
    return response.ok ? await response.json() : { success: false, count: 0 };
  } catch {
    return { success: false, count: 0 };
  }
}

export interface AnalyzeAudioResponse {
  success: boolean;
  lessonId?: string;
  audioUrl?: string;
  storagePath?: string;
  fileSaved?: boolean;
  transcript: string;
  summary: string;
  keyPoints: Array<{ title: string; content: string; importance: 'high' | 'medium' | 'low' }>;
  keywords: string[];
  flashcards: Array<{ front: string; back: string; difficulty: 'easy' | 'medium' | 'hard' }>;
  quizQuestions: Array<{ question: string; options: string[]; correctAnswer: number; explanation: string }>;
  exercises: Array<{ question: string; answerGuide: string }>;
  deadlines: Array<{ title: string; dueDate: string; priority: 'high' | 'medium' | 'low' }>;
  warnings?: string[];
  isRealAi?: boolean;
  errorCode?: string;
  message?: string;
  retryAfter?: string;
  canRetry?: boolean;
  isDailyQuota?: boolean;
}

/**
 * Send real audio file to AI for comprehensive analysis (POST /api/ai/analyze-audio)
 * Complies strictly with Sections 1, 2, 3, 5, 6, 7, 11
 */
export async function analyzeAudio(params: {
  audioFile?: File | null;
  lessonId?: string;
  subjectId?: string;
  lessonTitle?: string;
  duration?: number;
}): Promise<AnalyzeAudioResponse> {
  const { audioFile, lessonId, subjectId, lessonTitle, duration } = params;

  // 1. Strict pre-send validation (Section 2)
  if (!audioFile) {
    throw new Error('NO_AUDIO_FILE');
  }

  if (!(audioFile instanceof File)) {
    throw new Error('INVALID_AUDIO_FILE');
  }

  if (audioFile.size === 0) {
    throw new Error('EMPTY_AUDIO_FILE');
  }

  // Safe development log (Section 2 & 11) - never logs API keys or tokens
  console.log({
    name: audioFile.name,
    size: audioFile.size,
    type: audioFile.type,
    lastModified: audioFile.lastModified,
  });

  // 2. Build FormData (Section 3)
  const formData = new FormData();
  formData.append('file', audioFile, audioFile.name);
  if (lessonId) formData.append('lessonId', lessonId);
  if (subjectId) formData.append('subjectId', subjectId);
  if (lessonTitle) formData.append('lessonTitle', lessonTitle);
  if (duration) formData.append('duration', String(duration));

  // Browser automatically sets Content-Type with boundary! Do NOT manually set Content-Type header.
  const headers = getAuthHeaders();

  const response = await fetch('/api/ai/analyze-audio', {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Không thể gửi file âm thanh đến AI để phân tích.');
  }

  return data.data ? { ...data.data, ...data, success: true } : data;
}

/**
 * Re-analyze an audio file already stored on the server (POST /api/ai/analyze-stored-audio)
 * Complies strictly with Section 8
 */
export async function analyzeStoredAudio(params: {
  lessonId: string;
  fileId?: string;
}): Promise<AnalyzeAudioResponse> {
  const headers = {
    'Content-Type': 'application/json',
    ...getAuthHeaders(),
  };

  const response = await fetch('/api/ai/analyze-stored-audio', {
    method: 'POST',
    headers,
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Không thể phân tích file ghi âm đã lưu.');
  }

  return data.data ? { ...data.data, ...data, success: true } : data;
}

/**
 * Transcribe Audio into Vietnamese Text (Strictly complies with Section 3.2 & 3.3)
 * Sends real File via multipart/form-data (field "file" and "lessonId") without manual Content-Type
 */
export async function transcribeAudio(params: {
  audioFile?: File | null;
  audioBlob?: Blob | null;
  audioData?: string;
  fileId?: string;
  mimeType?: string;
  title?: string;
  duration?: number;
  subjectName?: string;
  subjectId?: string;
  lessonId?: string;
}): Promise<{
  success: boolean;
  transcript: string;
  audioUrl?: string;
  fileId?: string;
  lessonId?: string;
  status?: string;
  warnings: string[];
  language?: string;
  isRealAi?: boolean;
  errorCode?: string;
  message?: string;
}> {
  const cleanMime = (params.mimeType || params.audioFile?.type || params.audioBlob?.type || 'audio/webm').split(';')[0].trim() || 'audio/webm';

  // If real File or Blob is provided, send as multipart/form-data with field "file"
  const rawBlob = params.audioFile || params.audioBlob;
  if (rawBlob) {
    const formData = new FormData();
    const audioFile =
      rawBlob instanceof File
        ? rawBlob
        : new File([rawBlob], 'lesson-recording.webm', {
            type: rawBlob.type || cleanMime || 'audio/webm',
          });

    formData.append('file', audioFile, audioFile.name);
    if (params.lessonId) formData.append('lessonId', params.lessonId);
    formData.append('mimeType', cleanMime);
    if (params.title) formData.append('title', params.title);
    if (params.duration) formData.append('duration', String(params.duration));
    if (params.subjectName) formData.append('subjectName', params.subjectName);
    if (params.subjectId) formData.append('subjectId', params.subjectId);
    if (params.fileId) formData.append('fileId', params.fileId);

    // Note: Do NOT set Content-Type header manually so browser adds multipart boundary
    const headers = getAuthHeaders();

    const response = await fetch('/api/ai/transcribe', {
      method: 'POST',
      headers,
      body: formData,
    });

    const data = await response.json().catch(() => null);

    if (!response.ok || !data || data.success === false) {
      throw createStructuredAiError(data, response.status, 'AI không nhận diện được nội dung trong file ghi âm.');
    }

    return data.data ? { ...data.data, ...data, success: true } : data;
  }

  // Base64 or stored lessonId/fileId payload
  let cleanData = params.audioData || '';
  if (cleanData.startsWith('blob:')) {
    const err: any = new Error(AI_ERROR_CODE_MESSAGES.AUDIO_FILE_MISSING);
    err.errorCode = 'AUDIO_FILE_MISSING';
    err.code = 'AUDIO_FILE_MISSING';
    throw err;
  }
  if (cleanData.includes(';base64,')) {
    const parts = cleanData.split(';base64,');
    cleanData = parts.slice(1).join(';base64,');
  } else if (cleanData.startsWith('data:')) {
    const commaIdx = cleanData.indexOf(',');
    if (commaIdx !== -1) {
      cleanData = cleanData.slice(commaIdx + 1);
    }
  }

  const response = await fetch('/api/ai/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({
      audioData: cleanData.trim() || undefined,
      fileId: params.fileId,
      mimeType: cleanMime,
      title: params.title,
      duration: params.duration,
      subjectName: params.subjectName,
      subjectId: params.subjectId,
      lessonId: params.lessonId,
    }),
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'AI không nhận diện được nội dung trong file ghi âm.');
  }

  return data.data ? { ...data.data, ...data, success: true } : data;
}

/**
 * Upload real Document File to server & extract text (PHẦN 5)
 */
export async function uploadDocumentFile(params: {
  file: File;
  subjectId: string;
  lessonId?: string;
}): Promise<{
  success: boolean;
  documentId: string;
  document: any;
  extractedText?: string;
  message?: string;
  errorCode?: string;
}> {
  const formData = new FormData();
  formData.append('file', params.file);
  formData.append('subjectId', params.subjectId);
  if (params.lessonId) formData.append('lessonId', params.lessonId);

  // Note: Do NOT set Content-Type header so browser sets boundary
  const headers = getAuthHeaders();

  const response = await fetch('/api/documents/upload', {
    method: 'POST',
    headers,
    body: formData,
  });

  const data = await response.json().catch(() => null);

  if (!response.ok || !data) {
    const errorMsg = data?.message || 'Lỗi tải lên tài liệu';
    const err = new Error(errorMsg);
    (err as any).errorCode = data?.errorCode || 'UPLOAD_FAILED';
    throw err;
  }

  return data;
}

/**
 * Re-extract text from an existing document (PHẦN 6)
 */
export async function extractDocumentText(documentId: string): Promise<{
  success: boolean;
  extractedText?: string;
  processingStatus: string;
  message?: string;
}> {
  const response = await fetch(`/api/documents/${encodeURIComponent(documentId)}/extract`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw new Error(data?.message || 'Không thể trích xuất văn bản từ tài liệu.');
  }

  return data;
}

/**
 * Get Document list from server
 */
export async function getDocumentList(subjectId?: string): Promise<{ success: boolean; documents: any[] }> {
  try {
    const query = subjectId ? `?subjectId=${encodeURIComponent(subjectId)}` : '';
    const res = await fetch(`/api/documents${query}`, {
      headers: getAuthHeaders(),
    });
    if (!res.ok) return { success: false, documents: [] };
    return await res.json();
  } catch {
    return { success: false, documents: [] };
  }
}

/**
 * Delete a document from server
 */
export async function deleteDocumentFile(documentId: string): Promise<{ success: boolean }> {
  try {
    const res = await fetch(`/api/documents/${encodeURIComponent(documentId)}`, {
      method: 'DELETE',
      headers: getAuthHeaders(),
    });
    return res.ok ? await res.json() : { success: false };
  } catch {
    return { success: false };
  }
}

export interface DocumentSummaryResponse {
  success: boolean;
  summary: string;
  keyTakeaways: string[];
  isRealAi: boolean;
  cached?: boolean;
  summaryCreatedAt?: string;
  summaryModel?: string;
  summaryVersion?: number;
  message?: string;
  errorCode?: string;
  retryAfter?: string;
  canRetry?: boolean;
}

/**
 * Generate Summary from Document (PHẦN 8)
 * Handles structured 429 errors and quota limits
 */
export async function getDocumentSummary(params: {
  documentId?: string;
  text?: string;
  title?: string;
  subjectName?: string;
  forceRegenerate?: boolean;
}): Promise<DocumentSummaryResponse> {
  const response = await fetch('/api/ai/document-summary', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Không thể tạo tóm tắt tài liệu. Vui lòng thử lại sau.');
  }

  return data.data ? { ...data.data, ...data, success: true } : data;
}

export async function analyzeLesson(params: {
  transcript: string;
  title: string;
  subjectName: string;
  initialNotes?: string;
  lessonId?: string;
  subjectId?: string;
  includeFlashcards?: boolean;
  includeQuiz?: boolean;
  includeMindMap?: boolean;
  requirePremiumMindMap?: boolean;
  userId?: string;
}): Promise<{ result: AiAnalysisResult; lesson?: any; lessonId?: string; status?: string; isRealAi: boolean }> {
  const response = await fetch('/api/ai/analyze-lesson', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Lỗi máy chủ khi phân tích bài giảng');
  }

  const payload = data.data || data;
  return {
    result: payload.result || payload,
    lesson: payload.lesson,
    lessonId: payload.lessonId,
    status: payload.status,
    isRealAi: payload.isRealAi ?? true,
  };
}

export async function summarizeText(params: {
  text?: string;
  lessonId?: string;
  documentId?: string;
  title?: string;
  subjectName?: string;
}): Promise<{ summary: string; keyTakeaways: string[]; isRealAi: boolean }> {
  const response = await fetch('/api/ai/summarize', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Lỗi máy chủ khi tạo tóm tắt');
  }

  const payload = data.data || data;
  return {
    summary: payload.summary || '',
    keyTakeaways: payload.keyTakeaways || [],
    isRealAi: payload.isRealAi ?? true,
  };
}

export async function generateFlashcards(params: {
  text?: string;
  lessonId?: string;
  documentId?: string;
  subjectId?: string;
  subjectName?: string;
  count?: number;
}): Promise<{ flashcards: Array<Partial<Flashcard>>; isRealAi: boolean }> {
  const response = await fetch('/api/ai/generate-flashcards', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Không thể tạo flashcard.');
  }

  const payload = data.data || data;
  return {
    flashcards: payload.flashcards || data.flashcards || [],
    isRealAi: payload.isRealAi ?? true,
  };
}

export async function generateQuiz(params: {
  text?: string;
  lessonId?: string;
  documentId?: string;
  subjectId?: string;
  subjectName?: string;
  numQuestions?: number;
}): Promise<{ quiz: Quiz; isRealAi: boolean }> {
  const response = await fetch('/api/ai/generate-quiz', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Không thể tạo bài trắc nghiệm.');
  }

  const payload = data.data || data;
  return {
    quiz: payload.quiz || data.quiz,
    isRealAi: payload.isRealAi ?? true,
  };
}

export async function generateExercises(params: {
  text?: string;
  lessonId?: string;
  documentId?: string;
  subjectId?: string;
  subjectName?: string;
  count?: number;
}): Promise<{ exercises: any[]; isRealAi: boolean }> {
  const response = await fetch('/api/ai/generate-exercises', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Không thể tạo bài tập.');
  }

  const payload = data.data || data;
  return {
    exercises: payload.exercises || data.exercises || [],
    isRealAi: payload.isRealAi ?? true,
  };
}

/**
 * AI Chatbot Request as defined in PHẦN 2 & PHẦN 7
 */
export async function sendChatMessage(params: {
  conversationId?: string | null;
  subjectId?: string | null;
  lessonId?: string | null;
  documentId?: string | null;
  question: string;
  mode: 'lesson' | 'subject' | 'document' | 'general';
  language?: 'vi' | 'en';
  contextText?: string | null;
  contextTitle?: string | null;
}): Promise<{
  success: boolean;
  data: {
    answer: string;
    sources: Array<{ type: string; id: string; title: string }> | string[];
    conversationId: string;
  };
  answer: string;
  reply: string;
  sources: Array<{ type: string; id: string; title: string }> | string[];
  conversationId: string;
}> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 50000);

  let response: Response;
  try {
    response = await fetch('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...getAuthHeaders(),
      },
      body: JSON.stringify({
        conversationId: params.conversationId || null,
        subjectId: params.subjectId || null,
        lessonId: params.lessonId || null,
        documentId: params.documentId || null,
        question: params.question,
        mode: params.mode,
        language: params.language || 'vi',
        contextText: params.contextText || null,
        contextTitle: params.contextTitle || null,
      }),
      signal: controller.signal,
    });
  } catch (fetchErr: any) {
    clearTimeout(timeoutId);
    if (fetchErr?.name === 'AbortError') {
      throw createStructuredAiError({ errorCode: 'AI_TIMEOUT' }, 504, AI_ERROR_CODE_MESSAGES.AI_TIMEOUT);
    }
    throw createStructuredAiError(null, 500, 'Không thể kết nối với AI. Vui lòng kiểm tra kết nối mạng hoặc thử lại.');
  } finally {
    clearTimeout(timeoutId);
  }

  const data = await response.json().catch(() => null);

  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(
      data,
      response.status,
      'Không thể kết nối với AI. Vui lòng kiểm tra cấu hình Gemini API, kết nối mạng hoặc thử lại.'
    );
  }

  const payload = data.data || data;
  const answerText = (payload.answer || data.answer || data.reply || '').trim();
  if (!answerText) {
    throw createStructuredAiError(
      { errorCode: 'AI_EMPTY_RESPONSE', message: AI_ERROR_CODE_MESSAGES.AI_EMPTY_RESPONSE },
      502,
      AI_ERROR_CODE_MESSAGES.AI_EMPTY_RESPONSE
    );
  }

  const sources = payload.sources || data.sources || [];
  const convId = payload.conversationId || data.conversationId || params.conversationId || `conv_${Date.now()}`;

  return {
    success: true,
    data: {
      answer: answerText,
      sources,
      conversationId: convId,
    },
    answer: answerText,
    reply: answerText,
    sources,
    conversationId: convId,
  };
}

export async function extractDeadlines(params: {
  text?: string;
  lessonId?: string;
  documentId?: string;
  subjectName?: string;
}): Promise<{ deadlines: Deadline[]; isRealAi: boolean }> {
  const response = await fetch('/api/ai/extract-deadlines', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Lỗi trích xuất deadline');
  }

  const payload = data.data || data;
  return {
    deadlines: payload.deadlines || data.deadlines || [],
    isRealAi: payload.isRealAi ?? true,
  };
}

export async function uploadDocument(params: {
  fileName: string;
  fileType: string;
  fileSize: number;
  content: string;
}): Promise<{ success: boolean; fileUrl: string; extractedPreview: string }> {
  const response = await fetch('/api/upload', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Lỗi upload tài liệu' }));
    throw new Error(err.message || 'Lỗi upload');
  }

  return response.json();
}

// Billing & Stripe API
export async function getSubscription(userId: string): Promise<SubscriptionInfo> {
  const res = await fetch(`/api/billing/subscription/${userId}`);
  if (!res.ok) throw new Error('Không thể tải thông tin đăng ký');
  return res.json();
}

export async function createCheckoutSession(params: {
  userId: string;
  planType: 'monthly' | 'yearly';
  userEmail?: string;
}): Promise<{
  mode: 'live_stripe' | 'demo';
  checkoutUrl?: string;
  sessionId?: string;
  simulatedCheckout?: boolean;
  message: string;
}> {
  const response = await fetch('/api/billing/create-checkout-session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Lỗi kết nối phiên thanh toán' }));
    throw new Error(err.message || 'Lỗi kết nối');
  }

  return response.json();
}

export async function simulateCheckoutSuccess(params: {
  userId: string;
  planType: 'monthly' | 'yearly';
}): Promise<{ success: boolean; subscription: any; message: string }> {
  const response = await fetch('/api/billing/simulate-checkout-success', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    throw new Error('Lỗi kích hoạt mô phỏng Premium');
  }

  return response.json();
}

export async function cancelSubscription(userId: string): Promise<{
  success: boolean;
  subscription: any;
  message: string;
}> {
  const response = await fetch('/api/billing/cancel-subscription', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ userId }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({ message: 'Lỗi khi hủy gói' }));
    throw new Error(err.message || 'Lỗi hủy gói');
  }

  return response.json();
}

export async function subscribePremium(planType: 'monthly' | 'yearly'): Promise<{
  success: boolean;
  mode: string;
  message: string;
}> {
  const response = await fetch('/api/subscribe', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getAuthHeaders() },
    body: JSON.stringify({ planType }),
  });

  if (!response.ok) {
    throw new Error('Lỗi kết nối máy chủ đăng ký Premium');
  }

  return response.json();
}

// ====================================================================
// Authentication API (PHẦN 1 & 2)
// ====================================================================

export interface AuthResponse {
  success: boolean;
  accountCreated?: boolean;
  verificationEmailSent?: boolean;
  code?: string;
  user?: User;
  token?: string;
  emailSent?: boolean;
  emailAlreadyExists?: boolean;
  emailVerified?: boolean;
  canResendVerification?: boolean;
  emailProvider?: string;
  emailErrorCode?: string;
  errorCode?: string;
  verificationUrl?: string;
  verificationToken?: string;
  emailPreviewUrl?: string;
  message: string;
}

export async function apiRegister(data: {
  fullName: string;
  email: string;
  password: string;
  confirmPassword?: string;
  school?: string;
  major?: string;
  academicYear?: string;
  agreeTerms?: boolean;
  language?: 'vi' | 'en';
}): Promise<AuthResponse> {
  const response = await fetch('/api/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({
    success: false,
    accountCreated: false,
    verificationEmailSent: false,
    message: 'Không thể kết nối đến máy chủ xác thực.',
  }));

  // If account was created (even when verificationEmailSent is false), return result so caller handles both cases
  if (response.ok && (result.success || result.accountCreated === true)) {
    return result;
  }

  const error: any = new Error(result.message || 'Đăng ký không thành công.');
  error.code = result.code || result.errorCode || 'REGISTRATION_FAILED';
  error.errorCode = result.errorCode || result.code || 'REGISTRATION_FAILED';
  error.accountCreated = Boolean(result.accountCreated);
  error.verificationEmailSent = Boolean(result.verificationEmailSent);
  error.emailAlreadyExists = Boolean(result.emailAlreadyExists);
  error.emailVerified = result.emailVerified;
  error.canResendVerification = Boolean(result.canResendVerification);
  throw error;
}

export async function apiLogin(email: string, pass: string): Promise<AuthResponse> {
  const response = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password: pass }),
  });
  const result = await response.json().catch(() => ({
    success: false,
    message: 'Không thể kết nối đến máy chủ xác thực.',
  }));

  if (!response.ok || !result.success) {
    const error: any = new Error(result.message || 'Email hoặc mật khẩu không chính xác.');
    error.errorCode = result.errorCode || 'INVALID_CREDENTIALS';
    throw error;
  }

  return result;
}

export async function apiGetMe(): Promise<{ success: boolean; user: User; subscription: SubscriptionInfo }> {
  const response = await fetch('/api/auth/me', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Phiên đăng nhập không hợp lệ hoặc đã hết hạn.');
  }
  return response.json();
}

export async function apiLogout(): Promise<void> {
  try {
    await fetch('/api/auth/logout', {
      method: 'POST',
      headers: getAuthHeaders(),
    });
  } catch {}
}

export async function apiVerifyEmail(
  token: string,
  language?: 'vi' | 'en'
): Promise<{
  success: boolean;
  token?: string;
  user?: User;
  email?: string;
  alreadyVerified?: boolean;
  message: string;
}> {
  const response = await fetch('/api/auth/verify-email', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token, language }),
  });
  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi xác minh email' }));
  if (!response.ok || !result.success) {
    const error: any = new Error(result.message || 'Xác minh email không thành công.');
    error.errorCode = result.errorCode;
    error.alreadyVerified = result.alreadyVerified;
    error.email = result.email;
    error.token = result.token;
    error.user = result.user;
    throw error;
  }
  return result;
}

export async function apiResendVerification(
  email?: string,
  language?: 'vi' | 'en'
): Promise<{
  success: boolean;
  emailSent: boolean;
  email?: string;
  emailProvider?: string;
  verificationUrl?: string;
  verificationToken?: string;
  emailPreviewUrl?: string;
  cooldownSeconds?: number;
  remainingAttempts?: number;
  message: string;
}> {
  const response = await fetch('/api/auth/resend-verification', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ email, language }),
  });
  const result = await response.json().catch(() => ({ success: false, emailSent: false, message: 'Lỗi gửi lại email' }));
  if (!response.ok || !result.success || result.emailSent === false) {
    const error: any = new Error(result.message || 'Không thể gửi lại email xác nhận.');
    error.errorCode = result.errorCode;
    error.alreadyVerified = result.alreadyVerified;
    error.cooldownSeconds = result.cooldownSeconds;
    error.remainingAttempts = result.remainingAttempts;
    error.verificationUrl = result.verificationUrl;
    error.verificationToken = result.verificationToken;
    throw error;
  }
  return result;
}

export async function apiGetVerificationInfo(email?: string): Promise<{
  success: boolean;
  email?: string;
  fullName?: string;
  emailVerified?: boolean;
  verificationToken?: string;
  verificationUrl?: string;
  emailHtml?: string;
  emailPreviewUrl?: string;
}> {
  const query = email ? `?email=${encodeURIComponent(email.trim())}` : '';
  const response = await fetch(`/api/auth/verification-info${query}`, {
    headers: getAuthHeaders(),
  });
  return response.json().catch(() => ({ success: false }));
}

export async function apiConfigureSmtp(params: {
  host?: string;
  port?: number;
  secure?: boolean;
  user: string;
  pass: string;
  mailFrom?: string;
}): Promise<{
  success: boolean;
  configured?: boolean;
  connected?: boolean;
  provider?: string;
  message: string;
}> {
  const response = await fetch('/api/email/configure-smtp', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });
  const result = await response.json().catch(() => ({
    success: false,
    message: 'Không thể kết nối máy chủ cấu hình SMTP.',
  }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể lưu cấu hình SMTP.');
  }
  return result;
}

export async function apiForgotPassword(email: string): Promise<{ success: boolean; message: string; resetToken?: string }> {
  const response = await fetch('/api/auth/forgot-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email }),
  });
  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi gửi yêu cầu' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể gửi yêu cầu đặt lại mật khẩu.');
  }
  return result;
}

export async function apiResetPassword(params: {
  token: string;
  newPassword: string;
  confirmPassword?: string;
}): Promise<{ success: boolean; message: string }> {
  const response = await fetch('/api/auth/reset-password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
  });
  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi kết nối' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể đặt lại mật khẩu.');
  }
  return result;
}

// ====================================================================
// Profile & Avatar API (PHẦN 6 & 7)
// ====================================================================

export async function apiGetProfile(): Promise<{
  success: boolean;
  user: User;
  subscription: SubscriptionInfo;
  subjectsCount: number;
  lessonsCount: number;
  documentsCount: number;
}> {
  const response = await fetch('/api/profile', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Không thể tải thông tin hồ sơ.');
  }
  return response.json();
}

export async function apiUpdateProfile(data: Partial<User>): Promise<{ success: boolean; user: User; message: string }> {
  const response = await fetch('/api/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });
  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi cập nhật hồ sơ' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Cập nhật hồ sơ thất bại.');
  }
  return result;
}

export async function apiUploadAvatar(file: File): Promise<{ success: boolean; avatarUrl: string; user: User; message: string }> {
  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Kích thước ảnh đại diện không được vượt quá 5MB.');
  }
  const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];
  if (!allowed.includes(file.type.toLowerCase())) {
    throw new Error('Chỉ chấp nhận các định dạng ảnh: JPG, JPEG, PNG, WEBP.');
  }

  const formData = new FormData();
  formData.append('avatar', file, file.name);

  const response = await fetch('/api/profile/avatar', {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi tải ảnh' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Tải ảnh đại diện thất bại.');
  }
  return result;
}

export async function apiDeleteAvatar(): Promise<{ success: boolean; user: User; message: string }> {
  const response = await fetch('/api/profile/avatar', {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi xóa ảnh' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Xóa ảnh đại diện thất bại.');
  }
  return result;
}

// ====================================================================
// Per-User Workspace & Subjects API (PHẦN 3, 4, 8)
// ====================================================================

export async function apiGetUserWorkspace(): Promise<{
  success: boolean;
  subjects: Subject[];
  lessons: Lesson[];
  documents: DocumentItem[];
  deadlines: Deadline[];
  flashcards: Flashcard[];
  quizzes: Quiz[];
}> {
  const response = await fetch('/api/user/workspace', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Không thể tải không gian học tập của người dùng.');
  }
  return response.json();
}

export async function apiGetSubjects(): Promise<{ success: boolean; subjects: Subject[] }> {
  const response = await fetch('/api/subjects', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Không thể tải danh sách môn học.');
  }
  return response.json();
}

export async function apiCreateSubject(data: Partial<Subject>): Promise<{ success: boolean; subject: Subject; message: string }> {
  const response = await fetch('/api/subjects', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi thêm môn học' }));
  if (!response.ok || !result.success) {
    const error: any = new Error(result.message || 'Không thể tạo môn học.');
    error.errorCode = result.errorCode;
    throw error;
  }
  return result;
}

export async function apiUpdateSubject(id: string, data: Partial<Subject>): Promise<{ success: boolean; subject: Subject; message: string }> {
  const response = await fetch(`/api/subjects/${id}`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(data),
  });

  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi cập nhật môn học' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể cập nhật môn học.');
  }
  return result;
}

export async function apiDeleteSubject(id: string): Promise<{ success: boolean; message: string }> {
  const response = await fetch(`/api/subjects/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });

  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi xóa môn học' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể xóa môn học.');
  }
  return result;
}

// ====================================================================
// Transactions & Payment API (PHẦN 9, 10, 11)
// ====================================================================

export async function apiGetTransactions(): Promise<{ success: boolean; transactions: Transaction[] }> {
  const response = await fetch('/api/transactions', {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Không thể tải lịch sử giao dịch.');
  }
  return response.json();
}

export async function apiGetTransaction(id: string): Promise<{ success: boolean; transaction: Transaction }> {
  const response = await fetch(`/api/transactions/${id}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Không thể tải chi tiết giao dịch.');
  }
  return response.json();
}

export async function apiConfirmTestPayment(params: {
  planType: 'monthly' | 'yearly';
  transactionId?: string;
}): Promise<{
  success: boolean;
  subscription: Subscription;
  transaction: Transaction;
  message: string;
}> {
  const response = await fetch('/api/billing/confirm-test-payment', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi xác nhận thanh toán' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Xác nhận thanh toán thất bại.');
  }
  return result;
}

// MoMo Payment API
export async function apiCreateMoMoPayment(params: {
  plan: 'premium_monthly' | 'premium_yearly';
  billingCycle: 'monthly' | 'yearly';
}): Promise<{
  success: boolean;
  orderId: string;
  transactionId: string;
  amount: number;
  plan: string;
  payUrl: string;
  qrCodeUrl?: string;
  mode: string;
  message: string;
}> {
  const response = await fetch('/api/payments/momo/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi kết nối cổng thanh toán MoMo' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể tạo đơn hàng MoMo.');
  }
  return result;
}

export async function apiSimulateMoMoPayment(orderId: string): Promise<{
  success: boolean;
  message: string;
  subscription: Subscription;
  transaction: Transaction;
}> {
  const response = await fetch('/api/payments/momo/simulate-success', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ orderId }),
  });

  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi xác nhận thanh toán thử nghiệm' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Xác nhận thanh toán MoMo thất bại.');
  }
  return result;
}

// ZaloPay Payment API
export async function apiCreateZaloPayPayment(params: {
  plan: 'premium_monthly' | 'premium_yearly';
  billingCycle: 'monthly' | 'yearly';
}): Promise<{
  success: boolean;
  orderId: string;
  transactionId: string;
  amount: number;
  plan: string;
  payUrl: string;
  qrCodeUrl?: string;
  mode: string;
  message: string;
}> {
  const response = await fetch('/api/payments/zalopay/create', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi kết nối cổng thanh toán ZaloPay' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Không thể tạo đơn hàng ZaloPay.');
  }
  return result;
}

export async function apiSimulateZaloPayPayment(orderId: string): Promise<{
  success: boolean;
  message: string;
  subscription: Subscription;
  transaction: Transaction;
}> {
  const response = await fetch('/api/payments/zalopay/simulate-success', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ orderId }),
  });

  const result = await response.json().catch(() => ({ success: false, message: 'Lỗi xác nhận thanh toán thử nghiệm' }));
  if (!response.ok || !result.success) {
    throw new Error(result.message || 'Xác nhận thanh toán ZaloPay thất bại.');
  }
  return result;
}

// Transaction Status Polling API
export async function apiGetTransactionStatus(orderId: string): Promise<{
  success: boolean;
  orderId: string;
  status: 'pending' | 'paid' | 'failed' | 'cancelled';
  plan: string;
  amount: number;
  provider: string;
  paidAt?: string;
  isPremium: boolean;
}> {
  const response = await fetch(`/api/transactions/status/${orderId}`, {
    headers: getAuthHeaders(),
  });
  if (!response.ok) {
    throw new Error('Không thể kiểm tra trạng thái giao dịch.');
  }
  return response.json();
}

// ====================================================================
// Order Management Client APIs (Requirement 2 & 3)
// ====================================================================

// ====================================================================
// Order & Payment Management Client APIs (Requirement 1, 2, 3, 4, 5)
// ====================================================================

export interface ClientOrder {
  id: string;
  orderCode: string;
  userId: string;
  packageId: 'premium_monthly' | 'premium_yearly';
  amount: number;
  currency: 'vnd' | 'usd';
  status: 'PENDING' | 'WAITING_VERIFICATION' | 'PROCESSING' | 'PAID' | 'FAILED' | 'REJECTED' | 'CANCELLED' | 'EXPIRED';
  provider: 'momo' | 'zalopay' | 'stripe' | 'test' | 'bank';
  paymentMethod?: string;
  providerTransactionId?: string;
  payUrl?: string;
  qrCodeUrl?: string;
  receiptUrl?: string;
  customerConfirmedAt?: string;
  verifiedBy?: string;
  rejectionReason?: string;
  createdAt: string;
  expiredAt: string;
  paidAt?: string;
}

export interface BankConfig {
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrImageUrl: string;
  momoQrUrl?: string;
  zalopayQrUrl?: string;
  instructions: string;
}

export async function apiGetBankConfig(): Promise<BankConfig> {
  try {
    const res = await fetch('/api/payments/bank-config');
    if (res.ok) {
      const data = await res.json();
      return data;
    }
  } catch {}
  return {
    bankName: 'TPBank',
    accountNumber: '00000493116',
    accountName: 'DINH THI HUYEN ANH',
    qrImageUrl: '/images/tpbank_qr.png',
    momoQrUrl: '/images/momo_qr.png',
    zalopayQrUrl: '/images/zalopay_qr.png',
    instructions: 'Vui lòng ghi đúng mã đơn hàng trong nội dung chuyển khoản.',
  };
}

export async function apiCreateOrder(params: {
  packageId: 'premium_monthly' | 'premium_yearly';
  provider?: 'momo' | 'zalopay' | 'stripe' | 'test' | 'bank';
}): Promise<{
  success: boolean;
  order: ClientOrder;
  checkoutUrl: string;
  alreadyExists?: boolean;
  message: string;
}> {
  const response = await fetch('/api/orders', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Lỗi tạo đơn hàng.' }));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể tạo đơn hàng.');
  }
  return data;
}

export async function apiGetOrder(orderId: string): Promise<{
  success: boolean;
  order: ClientOrder;
}> {
  const response = await fetch(`/api/orders/${orderId}`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({ success: false, message: 'Lỗi lấy thông tin đơn hàng.' }));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không tìm thấy đơn hàng.');
  }
  return data;
}

export async function apiGetUserOrders(): Promise<{
  success: boolean;
  orders: ClientOrder[];
}> {
  const response = await fetch('/api/orders', {
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({ success: false, orders: [] }));
  return data;
}

export async function apiConfirmOrderPayment(orderId: string): Promise<{
  success: boolean;
  order: ClientOrder;
  message: string;
}> {
  const response = await fetch(`/api/orders/${orderId}/confirm-payment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Lỗi gửi yêu cầu xác nhận.' }));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể gửi yêu cầu xác minh thanh toán.');
  }
  return data;
}

export async function apiUploadOrderReceipt(orderId: string, file: File): Promise<{
  success: boolean;
  receiptUrl: string;
  order: ClientOrder;
  message: string;
}> {
  const formData = new FormData();
  formData.append('receipt', file, file.name);

  const response = await fetch(`/api/orders/${orderId}/receipt`, {
    method: 'POST',
    headers: getAuthHeaders(),
    body: formData,
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Lỗi tải lên biên lai.' }));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể tải lên ảnh biên lai.');
  }
  return data;
}

export async function apiGetAdminOrders(statusFilter?: string): Promise<{
  success: boolean;
  orders: ClientOrder[];
  waitingCount: number;
}> {
  const url = statusFilter ? `/api/admin/orders?status=${statusFilter}` : '/api/admin/orders';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({ success: false, orders: [], waitingCount: 0 }));
  return data;
}

export async function apiAdminApproveOrder(orderId: string): Promise<{
  success: boolean;
  order: ClientOrder;
  message: string;
}> {
  const response = await fetch(`/api/admin/orders/${orderId}/approve`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Lỗi phê duyệt đơn hàng.' }));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể phê duyệt đơn hàng.');
  }
  return data;
}

export async function apiAdminRejectOrder(orderId: string, reason?: string): Promise<{
  success: boolean;
  order: ClientOrder;
  message: string;
}> {
  const response = await fetch(`/api/admin/orders/${orderId}/reject`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ reason }),
  });

  const data = await response.json().catch(() => ({ success: false, message: 'Lỗi từ chối đơn hàng.' }));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể từ chối đơn hàng.');
  }
  return data;
}

export async function apiGetPaymentHistory(): Promise<{
  success: boolean;
  subscription: any;
  transactions: any[];
  orders: ClientOrder[];
}> {
  const response = await fetch('/api/payments/history', {
    headers: getAuthHeaders(),
  });
  return response.json();
}

// ====================================================================
// Mind Map Client APIs (Requirement 4)
// ====================================================================

export async function apiGenerateLessonMindMap(lessonId: string, text?: string): Promise<{
  success: boolean;
  mindMap: any;
  message: string;
}> {
  const response = await fetch(`/api/lessons/${encodeURIComponent(lessonId)}/mindmap`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ text }),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Không thể tạo sơ đồ tư duy.');
  }

  const payload = data.data || data;
  return {
    success: true,
    mindMap: payload.mindMap || data.mindMap,
    message: payload.message || data.message || 'Đã tạo sơ đồ tư duy thành công!',
  };
}

export async function apiGenerateMindMap(params: {
  lessonId?: string;
  documentId?: string;
  text?: string;
  title?: string;
}): Promise<{
  success: boolean;
  mindMap: any;
  message: string;
}> {
  const response = await fetch('/api/ai/mindmap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(params),
  });

  const data = await response.json().catch(() => null);
  if (!response.ok || !data || data.success === false) {
    throw createStructuredAiError(data, response.status, 'Không thể tạo sơ đồ tư duy.');
  }

  const payload = data.data || data;
  return {
    success: true,
    mindMap: payload.mindMap || data.mindMap,
    message: payload.message || data.message || 'Đã tạo sơ đồ tư duy thành công!',
  };
}

export async function apiGetLessonMindMap(lessonId: string): Promise<{
  success: boolean;
  mindMap: any;
  lessonTitle?: string;
}> {
  const response = await fetch(`/api/lessons/${lessonId}/mindmap`, {
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({ success: false }));
  return data;
}

export async function apiDeleteLessonMindMap(lessonId: string): Promise<{
  success: boolean;
  message: string;
}> {
  const response = await fetch(`/api/lessons/${lessonId}/mindmap`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  const data = await response.json().catch(() => ({ success: false, message: 'Lỗi xóa sơ đồ tư duy.' }));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể xóa sơ đồ tư duy.');
  }
  return data;
}


// ====================================================================
// Notification Client APIs (Requirement 7 & 8)
// ====================================================================

export interface ClientNotification {
  id: string;
  userId: string;
  type: 'deadline' | 'premium_promo' | 'premium_expiry' | 'payment' | 'account';
  title: string;
  message: string;
  channel: 'email' | 'in_app' | 'both';
  status: 'pending' | 'sent' | 'read' | 'failed';
  read: boolean;
  relatedEntityId?: string;
  createdAt: string;
}

export interface ClientNotificationSettings {
  accountEmails: boolean;
  deadlineEmails: boolean;
  premiumEmails: boolean;
  marketingEmails: boolean;
  transactionEmails: boolean;
}

export async function apiGetNotifications(filterType?: string): Promise<{
  success: boolean;
  notifications: ClientNotification[];
  unreadCount: number;
}> {
  const url = filterType && filterType !== 'all' ? `/api/notifications?type=${filterType}` : '/api/notifications';
  const response = await fetch(url, {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function apiMarkNotificationRead(id: string): Promise<boolean> {
  const response = await fetch(`/api/notifications/${id}/read`, {
    method: 'PATCH',
    headers: getAuthHeaders(),
  });
  return response.ok;
}

export async function apiMarkAllNotificationsRead(): Promise<boolean> {
  const response = await fetch('/api/notifications/read-all', {
    method: 'POST',
    headers: getAuthHeaders(),
  });
  return response.ok;
}

export async function apiDeleteNotification(id: string): Promise<boolean> {
  const response = await fetch(`/api/notifications/${id}`, {
    method: 'DELETE',
    headers: getAuthHeaders(),
  });
  return response.ok;
}

export async function apiGetNotificationSettings(): Promise<{
  success: boolean;
  settings: ClientNotificationSettings;
}> {
  const response = await fetch('/api/notification-settings', {
    headers: getAuthHeaders(),
  });
  return response.json();
}

export async function apiUpdateNotificationSettings(settings: Partial<ClientNotificationSettings>): Promise<{
  success: boolean;
  settings: ClientNotificationSettings;
  message: string;
}> {
  const response = await fetch('/api/notification-settings', {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify(settings),
  });
  return response.json();
}

export async function apiUpdateLanguage(language: 'vi' | 'en'): Promise<{
  success: boolean;
  user: User;
  language: 'vi' | 'en';
  message: string;
}> {
  const response = await fetch('/api/profile/language', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
    },
    body: JSON.stringify({ language }),
  });
  const data = await response.json().catch(() => ({ success: false, message: 'Lỗi cập nhật ngôn ngữ.' }));
  if (!response.ok || !data.success) {
    throw new Error(data.message || 'Không thể đổi ngôn ngữ.');
  }
  return data;
}

